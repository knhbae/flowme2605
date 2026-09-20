import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPersonalWorkspacePocFlowFieldOwnership,
  getPersonalWorkspacePocFlowItemFieldOwnership,
  toPersonalWorkspacePocMapGroupRef,
  type PersonalWorkspacePocFlow,
} from './personal-workspace-poc-contract';
import { buildPersonalWorkspacePocReadModel } from './personal-workspace-poc-read-model';
import type { FlowBundle } from './types';

const SAVED_AT = '2026-09-01T00:00:00.000Z';

class ReadStorage {
  writes = 0;
  constructor(private readonly values: Record<string, string>) {}
  get length() { return Object.keys(this.values).length; }
  key(index: number) { return Object.keys(this.values)[index] ?? null; }
  getItem(key: string) { return this.values[key] ?? null; }
  setItem() { this.writes += 1; throw new Error('read model must not write'); }
  removeItem() { this.writes += 1; throw new Error('read model must not remove'); }
  clear() { this.writes += 1; throw new Error('read model must not clear'); }
}

function bundle(slug: string, id: string, status: 'draft' | 'published' = 'published'): FlowBundle {
  return {
    flow: {
      id,
      slug,
      title: `${slug} 제목`,
      category: '테스트',
      structure_type: 'timeline',
      anchor_type: 'start_date',
      status,
      created_at: SAVED_AT,
      updated_at: SAVED_AT,
    },
    sections: [{ id: `${id}-section`, flow_id: id, title: '준비', order: 0 }],
    items: [{
      id: 'shared-item',
      flow_id: id,
      section_id: `${id}-section`,
      title: `${slug} 실행`,
      type: 'calendar',
      day_offset: 0,
      order: 0,
    }],
  };
}

function legacyRecord(slug: string, personalTitle?: string) {
  return {
    slug,
    savedAt: SAVED_AT,
    selectedArtifactMode: 'calendar',
    dateIntent: 'custom',
    anchor: '2026-09-01',
    ...(personalTitle ? { personalTitle } : {}),
  };
}

function canonicalRecord(copySlug: string, sourceSlug = 'canonical-source') {
  return {
    schemaVersion: 2,
    slug: copySlug,
    savedAt: SAVED_AT,
    personalCopyKey: copySlug,
    sourceFlowKey: `flow:${sourceSlug}`,
    sourceFlowSlug: sourceSlug,
    sourceVersion: 'source-v1',
    lastSaveRequestId: `request:${copySlug}`,
    savedItemCount: 1,
    selectedArtifactMode: 'calendar',
    dateIntent: 'custom',
    anchor: '2026-09-01',
  };
}

function personalCopy(flowSlug: string, itemId: string) {
  return {
    source: 'personal_edit',
    includedStepIdsByFlow: { [flowSlug]: [itemId] },
    excludedStepIdsByFlow: { [flowSlug]: [] },
    stepOverridesByFlow: {
      [flowSlug]: {
        [itemId]: {
          title: '내 저장 단계',
          schedule: { mode: 'fixed_date', date: '2026-09-20' },
          userMemo: '내 메모',
        },
      },
    },
  } as const;
}

function mapSnapshot(flowSlug = 'map-child', itemId = 'saved-step') {
  return {
    mapId: 'map-one',
    title: '지도',
    version: 'v1',
    savedAt: SAVED_AT,
    anchor: '2026-09-01',
    flowSlugs: [flowSlug],
    stepCountsByFlow: { [flowSlug]: 1 },
    personalCopy: personalCopy(flowSlug, itemId),
  };
}

function mapPersistence(flowSlug = 'map-child', flowId = 'flow:map-child', itemId = 'saved-step') {
  const copy = personalCopy(flowSlug, itemId);
  return {
    schemaVersion: 1,
    recordType: 'saved_source_backed_flow_map',
    bridgeStorageKey: 'flow:map:saved:map-one',
    map: {
      id: 'map-one',
      title: '지도',
      userLabel: '내 지도',
      version: 'v1',
      updatedAt: SAVED_AT,
      updatePolicy: 'review_before_apply',
      sourceTitle: '정본',
      sourceUrl: 'https://example.com/source',
    },
    saved: {
      savedAt: SAVED_AT,
      sourceSurface: 'public_save',
      anchor: '2026-09-01',
    },
    readiness: { content: 'ready_for_my_flow', update: 'up_to_date', reasons: [] },
    childFlows: [{
      slug: flowSlug,
      flowId,
      title: '저장한 Flow',
      category: '테스트',
      structureType: 'timeline',
      anchorType: 'start_date',
      primaryDestination: 'calendar',
      stepCount: 1,
      itemFallbackCount: 0,
      stepIds: [itemId],
      steps: [{
        stepId: itemId,
        title: '저장 당시 단계',
        destination: 'calendar',
        calendar: { mode: 'anchor_offset', anchorType: 'start_date', dayOffset: 0, allDay: true },
        textFallback: { title: '저장 당시 단계', description: '저장 당시 설명' },
      }],
    }],
    updateAssessment: {
      status: 'up_to_date',
      userAction: 'none',
      canApplyAutomatically: false,
      savedVersion: 'v1',
      reasons: [],
      affectedFlows: [],
    },
    personalCopy: copy,
  };
}

function structuralDraftBundle(): FlowBundle {
  const value = bundle('url-draft-note', 'flow:draft', 'draft');
  return {
    ...value,
    flow: {
      ...value.flow,
      source_title: '내 메모',
      tags: ['내 초안'],
    },
    items: [
      { ...value.items[0], id: 'source-a', title: '원본 A', order: 0 },
      { ...value.items[0], id: 'source-b', title: '원본 B', order: 1 },
    ],
  };
}

test('P3-J preserves source criteria for four origins alongside imported personal memos without writes', () => {
  const sources = [
    bundle('map-child', 'flow:map-child'),
    structuralDraftBundle(),
    bundle('canonical-source', 'flow:canonical-source'),
    bundle('legacy-plan', 'flow:legacy'),
  ].map((value) => ({
    ...value,
    items: value.items.map((item) => ({ ...item, description: `원문 설명:${item.id}` })),
    itemDetails: value.items.map((item) => ({
      item_id: item.id,
      completion_criteria: `원문 완료 기준:${item.id}`,
      how: `실행 방법:${item.id}`,
    })),
  }));
  const values = {
    'flow:map:saved:map-one': JSON.stringify({
      mapId: 'map-one', title: '지도', version: 'v1', savedAt: SAVED_AT,
      anchor: '2026-09-01', flowSlugs: ['map-child'],
    }),
    'flow:saved:map-child': JSON.stringify(legacyRecord('map-child')),
    'flow:saved:url-draft-note': JSON.stringify(legacyRecord('url-draft-note')),
    'flow:saved:copy:one': JSON.stringify(canonicalRecord('copy:one')),
    'flow:saved:legacy-plan': JSON.stringify(legacyRecord('legacy-plan')),
    'flow:my-flow:item-drafts': JSON.stringify({
      'legacy-plan::shared-item::2026-09-01': { memo: '사용자가 적은 메모' },
    }),
  };
  const before = JSON.stringify({ values, sources });
  const storage = new ReadStorage(values);
  const projected = buildPersonalWorkspacePocReadModel(storage, sources);
  assert.equal(projected.ok, true);
  if (!projected.ok) return;
  assert.equal(projected.model.flows.length, 4);
  for (const flow of projected.model.flows) {
    for (const item of flow.items) {
      assert.equal(item.completionCriterion, `원문 완료 기준:${item.itemId}`);
      assert.equal(item.fieldOwnership?.description.source.value,
        `원문 설명:${item.itemId}\n\n실행 방법:${item.itemId}`);
    }
  }
  assert.equal(projected.model.flows.find((flow) => flow.sourceSlug === 'legacy-plan')
    ?.items[0].fieldOwnership?.description.effective.value, '사용자가 적은 메모');
  assert.equal(storage.writes, 0);
  assert.equal(JSON.stringify({ values, sources }), before);
});

test('P3-J saved Map uses its retained doneWhen instead of live source criteria', () => {
  const persistence = mapPersistence();
  Object.assign(persistence.childFlows[0].steps[0].textFallback, { doneWhen: '저장 당시 완료 기준' });
  const source = bundle('map-child', 'flow:map-child');
  source.itemDetails = [{ item_id: 'shared-item', completion_criteria: '최신 원문의 다른 기준' }];
  const storage = new ReadStorage({
    'flow:map:saved:map-one': JSON.stringify(mapSnapshot()),
    'flow:map:persistence:map-one': JSON.stringify(persistence),
  });
  const projected = buildPersonalWorkspacePocReadModel(storage, [source]);
  assert.equal(projected.ok, true);
  if (!projected.ok) return;
  assert.equal(projected.model.flows[0].items[0].completionCriterion, '저장 당시 완료 기준');
  assert.equal(projected.model.flows[0].items[0].fieldOwnership?.description.source.value, '저장 당시 설명');
  assert.equal(projected.model.flows[0].items[0].fieldOwnership?.description.effective.value, '내 메모');
  assert.equal(storage.writes, 0);
});

test('P3-J meal slots join source instructions and criteria by slot identity', () => {
  const source = bundle('legacy-plan', 'flow:legacy');
  source.flow.content_type = 'meal_plan';
  source.mealSlots = [{
    id: 'meal-slot', flow_id: source.flow.id, day_offset: 0, order: 0,
    recipe_id: 'recipe-prep', duration_days: 1, menu_title: '저녁 준비', new_ingredients: ['당근', '두부'],
  }];
  source.itemDetails = [
    { item_id: 'meal-slot', how: '채소를 먼저 손질한다', completion_criteria: '재료 손질을 끝냈다' },
    { item_id: 'shared-item', completion_criteria: '다른 항목의 기준' },
  ];
  const before = JSON.stringify(source);
  const storage = new ReadStorage({ 'flow:saved:legacy-plan': JSON.stringify(legacyRecord('legacy-plan')) });
  const result = buildPersonalWorkspacePocReadModel(storage, [source]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const item = result.model.flows[0].items[0];
  assert.equal(item.itemId, 'meal-slot');
  assert.equal(item.completionCriterion, '재료 손질을 끝냈다');
  assert.equal(item.fieldOwnership?.description.source.value, '당근, 두부\n\n채소를 먼저 손질한다');
  assert.equal(JSON.stringify(source), before);
  assert.equal(storage.writes, 0);
});

test('P3-J absent, invalid, or ambiguous source criteria are not invented or partly projected', () => {
  const source = bundle('legacy-plan', 'flow:legacy');
  const storage = new ReadStorage({ 'flow:saved:legacy-plan': JSON.stringify(legacyRecord('legacy-plan')) });
  const absent = buildPersonalWorkspacePocReadModel(storage, [source]);
  assert.equal(absent.ok, true);
  if (absent.ok) assert.equal(absent.model.flows[0].items[0].completionCriterion, undefined);
  for (const itemDetails of [
    [{ item_id: 'shared-item', completion_criteria: { unexpected: 'object' } }],
    [{ item_id: 'shared-item', completion_criteria: 'one' }, { item_id: 'shared-item', completion_criteria: 'two' }],
  ]) {
    const invalid = buildPersonalWorkspacePocReadModel(storage, [{ ...source, itemDetails } as unknown as FlowBundle]);
    assert.equal(invalid.ok, false);
  }
  assert.equal(storage.writes, 0);
});

test('projects all four saved-plan origins once into unfiled read-model flows', () => {
  const bundles = [
    bundle('map-child', 'flow:map-child'),
    bundle('url-draft-note', 'flow:draft', 'draft'),
    bundle('canonical-source', 'flow:canonical-source'),
    bundle('legacy-plan', 'flow:legacy'),
  ];
  const storage = new ReadStorage({
    'flow:map:saved:map-one': JSON.stringify({
      mapId: 'map-one',
      title: '지도',
      version: 'v1',
      savedAt: SAVED_AT,
      anchor: '2026-09-01',
      flowSlugs: ['map-child'],
    }),
    'flow:saved:map-child': JSON.stringify(legacyRecord('map-child')),
    'flow:saved:url-draft-note': JSON.stringify(legacyRecord('url-draft-note')),
    'flow:saved:copy:one': JSON.stringify(canonicalRecord('copy:one')),
    'flow:saved:legacy-plan': JSON.stringify(legacyRecord('legacy-plan', '내 레거시 계획')),
  });

  const result = buildPersonalWorkspacePocReadModel(storage, bundles);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.model.flows.length, 4);
  assert.deepEqual(
    new Set(result.model.flows.map((flow) => flow.origin)),
    new Set([
      'source-backed-map',
      'personal-draft',
      'canonical-personal-copy',
      'legacy-saved-plan',
    ]),
  );
  assert.equal(new Set(result.model.flows.map((flow) => flow.ref)).size, 4);
  assert.equal(new Set(result.model.flows.flatMap((flow) => flow.items.map((item) => item.ref))).size, 4);
  assert.equal(result.model.flows.every((flow) => !('folderId' in flow)), true);
  assert.equal(result.model.flows.every((flow) => flow.items[0]?.sourceDate === '2026-09-01'), true);
  result.model.flows.forEach((flow) => {
    assert.ok(flow.fieldOwnership);
    assert.equal(flow.fieldOwnership.title.source.owner, 'source');
    assert.equal(flow.fieldOwnership.title.source.provenance, 'flow-bundle');
    assert.equal(flow.fieldOwnership.anchorDate.existingPersonal.value, '2026-09-01');
    assert.equal(flow.fieldOwnership.anchorDate.existingPersonal.owner, 'existing-personal');
    const item = flow.items[0];
    assert.ok(item?.fieldOwnership);
    assert.equal(item.fieldOwnership.title.source.owner, 'source');
    assert.equal(item.fieldOwnership.title.effective.value, item.title);
    assert.equal(item.fieldOwnership.order.source.value, 0);
    assert.equal(item.fieldOwnership.order.effective.value, item.sourceOrder);
    assert.equal(item.fieldOwnership.date.source.value, undefined);
    assert.equal(item.fieldOwnership.date.source.owner, 'source');
    assert.equal(item.fieldOwnership.date.effective.value, item.sourceDate);
    assert.equal(item.fieldOwnership.date.effective.owner, 'derived');
    assert.equal(item.fieldOwnership.date.effective.provenance, 'derived-anchor-offset');
    assert.deepEqual(item.fieldOwnership.dateDerivation.sourceSchedule, {
      mode: 'day-offset',
      dayOffset: 0,
      owner: 'source',
      provenance: 'flow-bundle',
    });
    assert.deepEqual(item.fieldOwnership.dateDerivation.anchorInput, {
      value: '2026-09-01',
      owner: 'existing-personal',
      provenance: flow.origin === 'source-backed-map'
        ? 'saved-map-snapshot'
        : 'saved-record',
    });
    assert.equal(item.fieldOwnership.dateDerivation.strategy, 'source-day-offset');
  });
  const legacy = result.model.flows.find((flow) => flow.origin === 'legacy-saved-plan');
  assert.equal(legacy?.fieldOwnership?.title.source.value, 'legacy-plan 제목');
  assert.deepEqual(legacy?.fieldOwnership?.title.existingPersonal, {
    value: '내 레거시 계획',
    owner: 'existing-personal',
    provenance: 'saved-record',
  });
  assert.equal(legacy?.fieldOwnership?.title.effective.value, '내 레거시 계획');
});

test('savedCopyId keeps two copies of the same source Flow and Item collision-free', () => {
  const source = bundle('canonical-source', 'flow:canonical-source');
  const storage = new ReadStorage({
    'flow:saved:copy:alpha': JSON.stringify(canonicalRecord('copy:alpha')),
    'flow:saved:copy:beta': JSON.stringify(canonicalRecord('copy:beta')),
  });
  const result = buildPersonalWorkspacePocReadModel(storage, [source]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.model.flows.length, 2);
  assert.notEqual(result.model.flows[0].ref, result.model.flows[1].ref);
  assert.notEqual(result.model.flows[0].items[0].ref, result.model.flows[1].items[0].ref);
  assert.match(result.model.flows[0].items[0].ref, /copy%3A/u);
});

test('all four origins separate source offsets, personal anchors, and winning item dates', () => {
  const storage = new ReadStorage({
    'flow:map:saved:map-one': JSON.stringify(mapSnapshot()),
    'flow:map:persistence:map-one': JSON.stringify(mapPersistence()),
    'flow:saved:url-draft-note': JSON.stringify(legacyRecord('url-draft-note')),
    'flow:saved:copy:one': JSON.stringify(canonicalRecord('copy:one')),
    'flow:saved:legacy-plan': JSON.stringify(legacyRecord('legacy-plan')),
    'flow:my-flow:item-drafts': JSON.stringify({
      'url-draft-note::shared-item::draft-overlay': { date: '2026-09-12' },
      'copy:one::shared-item::draft-overlay': { date: '2026-09-13' },
    }),
    'flow:my-flow:date-overrides': JSON.stringify({
      'legacy-plan::shared-item::2026-09-01': '2026-09-14',
    }),
  });
  const result = buildPersonalWorkspacePocReadModel(storage, [
    bundle('map-child', 'flow:map-child'),
    bundle('url-draft-note', 'flow:draft', 'draft'),
    bundle('canonical-source', 'flow:canonical-source'),
    bundle('legacy-plan', 'flow:legacy'),
  ]);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const expected = new Map([
    ['source-backed-map', ['2026-09-20', 'existing-personal-schedule', 'map-personal-copy']],
    ['personal-draft', ['2026-09-12', 'existing-personal-override', 'my-flow-item-draft']],
    ['canonical-personal-copy', ['2026-09-13', 'existing-personal-override', 'my-flow-item-draft']],
    ['legacy-saved-plan', ['2026-09-14', 'existing-personal-override', 'my-flow-date-override']],
  ] as const);
  result.model.flows.forEach((flow) => {
    assert.notEqual(flow.origin, 'authoring-handoff');
    if (flow.origin === 'authoring-handoff') return;
    const [effectiveDate, strategy, provenance] = expected.get(flow.origin) ?? [];
    assert.ok(effectiveDate, `unexpected origin: ${flow.origin}`);
    assert.equal(flow.fieldOwnership?.anchorDate.existingPersonal.value, '2026-09-01');
    assert.equal(flow.fieldOwnership?.anchorDate.existingPersonal.owner, 'existing-personal');
    const date = flow.items[0].fieldOwnership;
    assert.deepEqual(date?.dateDerivation.sourceSchedule, {
      mode: 'day-offset',
      dayOffset: 0,
      owner: 'source',
      provenance: flow.origin === 'source-backed-map'
        ? 'saved-map-persistence'
        : 'flow-bundle',
    });
    assert.equal(date?.date.source.value, undefined);
    assert.equal(date?.date.source.owner, 'source');
    assert.equal(date?.dateDerivation.anchorInput.owner, 'none');
    assert.equal(date?.dateDerivation.strategy, strategy);
    assert.equal(date?.dateDerivation.effectiveDate.value, effectiveDate);
    assert.equal(date?.dateDerivation.effectiveDate.owner, 'existing-personal');
    assert.equal(date?.dateDerivation.effectiveDate.provenance, provenance);
  });
  assert.equal(storage.writes, 0);
});

test('projects stable section identities and limits title shadow capability to personal drafts', () => {
  const draft = structuralDraftBundle();
  const legacy = bundle('legacy-plan', 'flow:legacy');
  const storage = new ReadStorage({
    'flow:saved:url-draft-note': JSON.stringify(legacyRecord('url-draft-note')),
    'flow:saved:legacy-plan': JSON.stringify(legacyRecord('legacy-plan')),
  });
  const result = buildPersonalWorkspacePocReadModel(storage, [draft, legacy]);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const personal = result.model.flows.find((flow) => flow.origin === 'personal-draft');
  const sourceOwned = result.model.flows.find((flow) => flow.origin === 'legacy-saved-plan');
  assert.deepEqual(personal?.sections, [{
    sectionId: 'flow:draft-section',
    title: '준비',
    sourceOrder: 0,
    titleOwner: 'existing-personal',
    editCapability: 'poc-shadow',
  }]);
  assert.equal(personal?.items[0].sectionId, 'flow:draft-section');
  assert.equal(personal?.items[0].sectionTitle, '준비');
  assert.equal(sourceOwned?.sections?.[0].editCapability, 'read-only');
  assert.equal(sourceOwned?.sections?.[0].titleOwner, 'source');
  assert.equal(storage.writes, 0);
});

test('section projection fails closed on duplicate IDs and foreign Item membership', () => {
  const duplicate = structuralDraftBundle();
  duplicate.sections = [...duplicate.sections, { ...duplicate.sections[0], order: 1 }];
  const duplicateResult = buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:saved:url-draft-note': JSON.stringify(legacyRecord('url-draft-note')),
  }), [duplicate]);
  assert.equal(duplicateResult.ok, false);

  const foreign = structuralDraftBundle();
  foreign.items = foreign.items.map((item, index) => (
    index === 0 ? { ...item, section_id: 'foreign-section' } : item
  ));
  const foreignResult = buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:saved:url-draft-note': JSON.stringify(legacyRecord('url-draft-note')),
  }), [foreign]);
  assert.deepEqual(foreignResult, { ok: false, reason: 'unknown-flow-section-reference' });
});

test('fails closed on raw key/schema mismatches, duplicate map ownership, and unsupported origin', () => {
  const legacy = bundle('legacy-plan', 'flow:legacy');
  const keyMismatch = buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:saved:wrong-key': JSON.stringify(legacyRecord('legacy-plan')),
  }), [legacy]);
  assert.deepEqual(keyMismatch, { ok: false, reason: 'malformed-saved-record' });

  const duplicateMapOwner = buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:map:saved:first': JSON.stringify({
      mapId: 'first', title: '첫 지도', version: 'v1', savedAt: SAVED_AT, flowSlugs: ['legacy-plan'],
    }),
    'flow:map:saved:second': JSON.stringify({
      mapId: 'second', title: '둘째 지도', version: 'v1', savedAt: SAVED_AT, flowSlugs: ['legacy-plan'],
    }),
  }), [legacy]);
  assert.deepEqual(duplicateMapOwner, { ok: false, reason: 'duplicate-map-flow-owner' });

  const publishedDraftSlug = bundle('url-draft-invalid', 'flow:bad-draft', 'published');
  const unsupported = buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:saved:url-draft-invalid': JSON.stringify(legacyRecord('url-draft-invalid')),
  }), [publishedDraftSlug]);
  assert.deepEqual(unsupported, {
    ok: false,
    reason: 'unsupported-saved-plan-origin:personal-draft-status-mismatch',
  });
});

test('malformed payloads are never silently omitted', () => {
  const result = buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:saved:broken': '{not-json',
  }), []);
  assert.deepEqual(result, { ok: false, reason: 'malformed-saved-record' });
});

test('preserves raw saved-record schema for the classifier and rejects future versions', () => {
  const result = buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:saved:legacy-plan': JSON.stringify({
      ...legacyRecord('legacy-plan'),
      schemaVersion: 3,
    }),
  }), [bundle('legacy-plan', 'flow:legacy')]);
  assert.deepEqual(result, {
    ok: false,
    reason: 'unsupported-saved-plan-origin:unsupported-saved-record-schema',
  });
});

test('strict Map persistence restores saved steps and applies inclusion, title, memo, and fixed date', () => {
  const storage = new ReadStorage({
    'flow:map:saved:map-one': JSON.stringify(mapSnapshot()),
    'flow:map:persistence:map-one': JSON.stringify(mapPersistence()),
  });
  const result = buildPersonalWorkspacePocReadModel(
    storage,
    [bundle('map-child', 'flow:map-child')],
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.model.flows.length, 1);
  assert.equal(result.model.flows[0].origin, 'source-backed-map');
  assert.deepEqual(result.model.flows[0].items.map((item) => ({
    itemId: item.itemId,
    title: item.title,
    description: item.description,
    sourceDate: item.sourceDate,
  })), [{
    itemId: 'saved-step',
    title: '내 저장 단계',
    description: '내 메모',
    sourceDate: '2026-09-20',
  }]);
  const flow = result.model.flows[0];
  const item = flow.items[0];
  assert.deepEqual(flow.presentation, {
    discovery: {
      sourceTitle: '정본',
      sourceUrls: ['https://example.com/source'],
    },
    mapGroup: {
      groupRef: toPersonalWorkspacePocMapGroupRef('map-one'),
      ownerId: 'map-one',
      title: '지도',
      childOrder: 0,
      childCount: 1,
      executionState: 'executable',
      reviewReasons: [],
    },
  });
  assert.equal(flow.fieldOwnership?.anchorDate.existingPersonal.provenance, 'saved-map-snapshot');
  assert.deepEqual(item.fieldOwnership?.title, {
    source: {
      value: '저장 당시 단계',
      owner: 'source',
      provenance: 'saved-map-persistence',
    },
    existingPersonal: {
      value: '내 저장 단계',
      owner: 'existing-personal',
      provenance: 'map-personal-copy',
    },
    effective: {
      value: '내 저장 단계',
      owner: 'existing-personal',
      provenance: 'map-personal-copy',
    },
  });
  assert.equal(item.fieldOwnership?.description.source.value, '저장 당시 설명');
  assert.equal(item.fieldOwnership?.description.existingPersonal.value, '내 메모');
  assert.equal(item.fieldOwnership?.date.source.value, undefined);
  assert.equal(item.fieldOwnership?.date.existingPersonal.value, '2026-09-20');
  assert.equal(item.fieldOwnership?.date.effective.provenance, 'map-personal-copy');
  assert.deepEqual(item.fieldOwnership?.dateDerivation.sourceSchedule, {
    mode: 'day-offset',
    dayOffset: 0,
    owner: 'source',
    provenance: 'saved-map-persistence',
  });
  assert.deepEqual(item.fieldOwnership?.dateDerivation.existingPersonalSchedule, {
    mode: 'absolute',
    date: '2026-09-20',
    owner: 'existing-personal',
    provenance: 'map-personal-copy',
  });
  assert.deepEqual(item.fieldOwnership?.dateDerivation.anchorInput, {
    owner: 'none',
    provenance: 'none',
  });
  assert.equal(item.fieldOwnership?.dateDerivation.strategy, 'existing-personal-schedule');
  assert.equal(storage.writes, 0);
});

test('Map readiness is preserved as presentation-only review hold metadata', () => {
  const persistence = mapPersistence();
  const storage = new ReadStorage({
    'flow:map:saved:map-one': JSON.stringify(mapSnapshot()),
    'flow:map:persistence:map-one': JSON.stringify({
      ...persistence,
      readiness: {
        content: 'needs_creator_review',
        update: 'up_to_date',
        reasons: ['원문 검토가 필요합니다.'],
      },
    }),
  });
  const result = buildPersonalWorkspacePocReadModel(
    storage,
    [bundle('map-child', 'flow:map-child')],
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.model.flows[0].presentation?.mapGroup, {
    groupRef: toPersonalWorkspacePocMapGroupRef('map-one'),
    ownerId: 'map-one',
    title: '지도',
    childOrder: 0,
    childCount: 1,
    executionState: 'review-hold',
    reviewReasons: ['원문 검토가 필요합니다.'],
  });
  assert.equal(storage.writes, 0);
});

test('strict structural overlay projects user order and tombstones through effectiveRows', () => {
  const draft = structuralDraftBundle();
  const storage = new ReadStorage({
    'flow:saved:url-draft-note': JSON.stringify(legacyRecord('url-draft-note')),
    'flow:my-flow:structural-overlay:url-draft-note': JSON.stringify({
      schemaVersion: 1,
      savedCopyId: 'url-draft-note',
      flowId: 'flow:draft',
      userItems: [{
        itemId: 'user-task',
        provenance: 'user_created',
        title: '내가 추가한 항목',
        personalMemo: '개인 메모',
        schedule: { mode: 'fixed_date', date: '2026-09-03' },
        createdAt: SAVED_AT,
        orderKey: -1,
      }],
      itemTombstones: [{
        itemId: 'source-b',
        ownership: 'source',
        deletedAt: SAVED_AT,
      }],
      orderOverride: ['user-task', 'source-a', 'source-b'],
      selection: {
        mode: 'all_except_excluded',
        includedItemIds: [],
        excludedItemIds: [],
      },
      updatedAt: SAVED_AT,
    }),
    'flow:my-flow:item-drafts': JSON.stringify({
      'url-draft-note::source-a::draft-overlay': { title: '개인 제목 A' },
    }),
  });
  const result = buildPersonalWorkspacePocReadModel(storage, [draft]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.model.flows[0].items.map((item) => ({
    itemId: item.itemId,
    title: item.title,
    sourceOrder: item.sourceOrder,
    sourceDate: item.sourceDate,
  })), [
    {
      itemId: 'user-task',
      title: '내가 추가한 항목',
      sourceOrder: 0,
      sourceDate: '2026-09-03',
    },
    {
      itemId: 'source-a',
      title: '개인 제목 A',
      sourceOrder: 1,
      sourceDate: '2026-09-01',
    },
  ]);
  const [userItem, sourceItem] = result.model.flows[0].items;
  assert.deepEqual(userItem.fieldOwnership?.title.source, {
    owner: 'none',
    provenance: 'none',
  });
  assert.equal(
    userItem.fieldOwnership?.title.existingPersonal.provenance,
    'personal-structural-overlay',
  );
  assert.equal(
    userItem.fieldOwnership?.date.effective.provenance,
    'personal-structural-overlay',
  );
  assert.deepEqual(userItem.fieldOwnership?.dateDerivation.sourceSchedule, {
    mode: 'none',
    owner: 'none',
    provenance: 'none',
  });
  assert.equal(
    userItem.fieldOwnership?.dateDerivation.existingPersonalSchedule.mode,
    'absolute',
  );
  assert.equal(
    userItem.fieldOwnership?.dateDerivation.strategy,
    'existing-personal-schedule',
  );
  assert.equal(sourceItem.fieldOwnership?.title.source.value, '원본 A');
  assert.equal(sourceItem.fieldOwnership?.title.existingPersonal.value, '개인 제목 A');
  assert.equal(
    sourceItem.fieldOwnership?.title.existingPersonal.provenance,
    'my-flow-item-draft',
  );
  assert.equal(sourceItem.fieldOwnership?.order.source.value, 0);
  assert.equal(sourceItem.fieldOwnership?.order.existingPersonal.value, 1);
  assert.deepEqual(sourceItem.fieldOwnership?.dateDerivation.sourceSchedule, {
    mode: 'day-offset',
    dayOffset: 0,
    owner: 'source',
    provenance: 'flow-bundle',
  });
  assert.equal(sourceItem.fieldOwnership?.date.source.value, undefined);
  assert.equal(sourceItem.fieldOwnership?.date.effective.owner, 'derived');
  assert.equal(storage.writes, 0);
});

test('read-only legacy aliases project title and date removal without mutating storage', () => {
  const storage = new ReadStorage({
    'flow:saved:legacy-plan': JSON.stringify(legacyRecord('legacy-plan')),
    'flow:my-flow:item-drafts': JSON.stringify({
      'legacy-plan::shared-item::2026-09-01': { title: '별칭으로 고친 제목' },
    }),
    'flow:my-flow:date-overrides': JSON.stringify({
      'legacy-plan::shared-item::2026-09-01': '__flowme_unscheduled__',
    }),
  });
  const result = buildPersonalWorkspacePocReadModel(
    storage,
    [bundle('legacy-plan', 'flow:legacy')],
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.model.flows[0].items[0].title, '별칭으로 고친 제목');
  assert.equal(result.model.flows[0].items[0].sourceDate, undefined);
  const ownership = result.model.flows[0].items[0].fieldOwnership;
  assert.equal(ownership?.title.source.value, 'legacy-plan 실행');
  assert.equal(ownership?.title.existingPersonal.provenance, 'my-flow-item-draft');
  assert.equal(ownership?.date.source.value, undefined);
  assert.deepEqual(ownership?.date.existingPersonal, {
    owner: 'existing-personal',
    provenance: 'my-flow-date-override',
  });
  assert.deepEqual(ownership?.date.effective, {
    owner: 'existing-personal',
    provenance: 'my-flow-date-override',
  });
  assert.deepEqual(ownership?.dateDerivation.sourceSchedule, {
    mode: 'day-offset',
    dayOffset: 0,
    owner: 'source',
    provenance: 'flow-bundle',
  });
  assert.deepEqual(ownership?.dateDerivation.anchorInput, {
    owner: 'none',
    provenance: 'none',
  });
  assert.equal(ownership?.dateDerivation.strategy, 'existing-personal-override');
  assert.equal(storage.writes, 0);
});

test('old authoring-handoff v1 payloads expose authoring ownership without migration', () => {
  const flow: PersonalWorkspacePocFlow = {
    ref: 'saved-flow:authoring%3Ahandoff:flow%3Aauthoring',
    savedCopyId: 'authoring:handoff',
    flowId: 'flow:authoring',
    sourceSlug: 'authoring-handoff-handoff',
    title: '내가 쓴 준비 계획',
    origin: 'authoring-handoff',
    anchorDate: '2026-10-10',
    items: [{
      ref: 'flow-item:authoring%3Ahandoff:flow%3Aauthoring:item-1',
      savedCopyId: 'authoring:handoff',
      flowId: 'flow:authoring',
      itemId: 'item-1',
      title: '첫 번째 할 일',
      description: '원문에서 확정한 설명',
      sourceOrder: 0,
      sourceDate: '2026-10-11',
      sourceTimingLabel: 'D+1 · 09:00',
    }, {
      ref: 'flow-item:authoring%3Ahandoff:flow%3Aauthoring:item-2',
      savedCopyId: 'authoring:handoff',
      flowId: 'flow:authoring',
      itemId: 'item-2',
      title: '날짜를 직접 쓴 일',
      sourceOrder: 1,
      sourceDate: '2026-10-15',
    }, {
      ref: 'flow-item:authoring%3Ahandoff:flow%3Aauthoring:item-3',
      savedCopyId: 'authoring:handoff',
      flowId: 'flow:authoring',
      itemId: 'item-3',
      title: '날짜 미정 일',
      sourceOrder: 2,
    }],
  };

  const flowOwnership = getPersonalWorkspacePocFlowFieldOwnership(flow);
  const itemOwnership = getPersonalWorkspacePocFlowItemFieldOwnership(
    flow.items[0],
    flow.origin,
    flow,
  );
  assert.deepEqual(flowOwnership.title.source, {
    value: flow.title,
    owner: 'authoring',
    provenance: 'authoring-handoff',
  });
  assert.deepEqual(flowOwnership.anchorDate.effective, {
    value: flow.anchorDate,
    owner: 'authoring',
    provenance: 'authoring-handoff',
  });
  assert.deepEqual(itemOwnership.description.source, {
    value: flow.items[0].description,
    owner: 'authoring',
    provenance: 'authoring-handoff',
  });
  assert.deepEqual(itemOwnership.date.effective, {
    value: flow.items[0].sourceDate,
    owner: 'derived',
    provenance: 'derived-anchor-offset',
  });
  assert.deepEqual(itemOwnership.dateDerivation.sourceSchedule, {
    mode: 'day-offset',
    dayOffset: 1,
    owner: 'authoring',
    provenance: 'authoring-handoff',
  });
  assert.deepEqual(itemOwnership.dateDerivation.anchorInput, {
    value: flow.anchorDate,
    owner: 'authoring',
    provenance: 'authoring-handoff',
  });
  assert.deepEqual(itemOwnership.title.existingPersonal, {
    owner: 'none',
    provenance: 'none',
  });
  const absoluteOwnership = getPersonalWorkspacePocFlowItemFieldOwnership(
    flow.items[1],
    flow.origin,
    flow,
  );
  assert.deepEqual(absoluteOwnership.dateDerivation.sourceSchedule, {
    mode: 'absolute',
    date: '2026-10-15',
    owner: 'authoring',
    provenance: 'authoring-handoff',
  });
  assert.equal(absoluteOwnership.dateDerivation.strategy, 'source-absolute');
  assert.equal(absoluteOwnership.date.source.value, '2026-10-15');
  assert.equal(absoluteOwnership.date.effective.owner, 'authoring');
  const undatedOwnership = getPersonalWorkspacePocFlowItemFieldOwnership(
    flow.items[2],
    flow.origin,
    flow,
  );
  assert.deepEqual(undatedOwnership.dateDerivation.sourceSchedule, {
    mode: 'none',
    owner: 'authoring',
    provenance: 'authoring-handoff',
  });
  assert.equal(undatedOwnership.dateDerivation.strategy, 'undated');
  assert.equal(undatedOwnership.date.effective.owner, 'none');
});

test('fails closed on malformed Map owners, persistence, structural overlays, and bundle registries', () => {
  const malformedMap = mapSnapshot() as Record<string, unknown>;
  malformedMap.personalCopy = {
    source: 'personal_edit',
    includedStepIdsByFlow: { 'map-child': 'not-an-array' },
    excludedStepIdsByFlow: {},
  };
  assert.deepEqual(buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:map:saved:map-one': JSON.stringify(malformedMap),
  }), [bundle('map-child', 'flow:map-child')]), {
    ok: false,
    reason: 'malformed-saved-map',
  });

  assert.deepEqual(buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:map:saved:map-one': JSON.stringify(mapSnapshot()),
    'flow:map:persistence:map-one': JSON.stringify({
      ...mapPersistence(),
      recordType: 'future-map-record',
    }),
  }), [bundle('map-child', 'flow:map-child')]), {
    ok: false,
    reason: 'malformed-map-persistence',
  });

  const draft = structuralDraftBundle();
  assert.deepEqual(buildPersonalWorkspacePocReadModel(new ReadStorage({
    'flow:saved:url-draft-note': JSON.stringify(legacyRecord('url-draft-note')),
    'flow:my-flow:structural-overlay:url-draft-note': JSON.stringify({
      schemaVersion: 1,
      savedCopyId: 'url-draft-note',
      flowId: 'flow:draft',
      userItems: [
        {
          itemId: 'same-user', provenance: 'user_created', title: '하나',
          createdAt: SAVED_AT, orderKey: 0,
        },
        {
          itemId: 'same-user', provenance: 'user_created', title: '둘',
          createdAt: SAVED_AT, orderKey: 1,
        },
      ],
      itemTombstones: [],
      orderOverride: [],
      selection: { mode: 'all_except_excluded', includedItemIds: [], excludedItemIds: [] },
      updatedAt: SAVED_AT,
    }),
  }), [draft]), {
    ok: false,
    reason: 'malformed-structural-overlay',
  });

  assert.deepEqual(buildPersonalWorkspacePocReadModel(new ReadStorage({
    flow_builder_mvp_bundles_v11: '{not-json',
  }), []), {
    ok: false,
    reason: 'malformed-active-bundle-registry',
  });
  assert.deepEqual(buildPersonalWorkspacePocReadModel(new ReadStorage({
    flow_builder_mvp_bundles_v10: JSON.stringify([{ flow: { id: 'broken' } }]),
  }), []), {
    ok: false,
    reason: 'malformed-legacy-bundle-registry',
  });
});
