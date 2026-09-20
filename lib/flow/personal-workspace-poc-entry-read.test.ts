import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getPersonalWorkspacePocFlowFieldOwnership, getPersonalWorkspacePocFlowItemFieldOwnership,
  toPersonalWorkspacePocFlowRef, toPersonalWorkspacePocFlowItemRef,
  type PersonalWorkspacePocFlow, type PersonalWorkspacePocReadModel, type PersonalWorkspacePocOrigin,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import { composePersonalWorkspacePocReadModel } from './personal-workspace-poc-composition';
import { resolvePersonalWorkspacePocEntry } from './personal-workspace-poc-entry';
import { buildPersonalWorkspacePocResultProjection } from './personal-workspace-poc-result-projection';
import { buildPersonalWorkspacePocSourceReadIndex } from './personal-workspace-poc-source-attributes';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { createPersonalWorkspacePocSourceCandidateStore, createPersonalWorkspacePocLocalFixtureEnvelope,
  stagePersonalWorkspacePocSourceCandidate, resolvePersonalWorkspacePocSourceCandidateChange,
  applyPersonalWorkspacePocSourceCandidate,
} from './personal-workspace-poc-source-candidates';
import {
  buildPersonalWorkspacePocEntryReadPacket, readPersonalWorkspacePocEntryPreview,
  resolvePersonalWorkspacePocEntryRead, type PersonalWorkspacePocEntryReadPacket,
  type PersonalWorkspacePocEntryReadInput,
} from './personal-workspace-poc-entry-read';

const NOW = '2026-09-05T00:00:00.000Z', TODAY = '2026-09-05';
const ORIGINS = ['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan'] as const;
function flow(index = 1, origin: PersonalWorkspacePocOrigin = 'legacy-saved-plan', count = 4): PersonalWorkspacePocFlow {
  const savedCopyId = `entry-copy-${index}`, flowId = 'same-flow';
  const value: PersonalWorkspacePocFlow = {
    ref: toPersonalWorkspacePocFlowRef(savedCopyId, flowId), savedCopyId, flowId, origin,
    sourceSlug: `entry-source-${index}`, title: '같은 준비',
    presentation: { discovery: { sourceTitle: `실제 출처 ${index}`, sourceUrls: [`https://www.example.com/${index}/?b=2&utm_source=x#part`] },
      ...(origin === 'source-backed-map' ? { mapGroup: { groupRef: `flow-group:map-${index}`, ownerId: `map-${index}`, title: '묶음',
        childOrder: 0, childCount: 1, executionState: 'executable' as const, reviewReasons: [] } } : {}) },
    sections: [{ sectionId: 's1', title: '원래 준비', sourceOrder: 0, titleOwner: 'source', editCapability: origin === 'personal-draft' ? 'poc-shadow' : 'read-only' }],
    items: Array.from({ length: count }, (_, n) => ({
      ref: toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, `i${n}`), savedCopyId, flowId, itemId: `i${n}`,
      title: n < 2 ? '같은 할 일' : `할 일 ${n}`, sourceOrder: n,
      description: `원문 설명 ${n}\r\n`, completionCriterion: `기준 ${n}`,
      sectionId: 's1', sectionTitle: '원래 준비', ...(n === 0 ? { sourceDate: TODAY, sourceTimingLabel: 'D+3' } : {}),
    })),
  };
  return { ...value, fieldOwnership: getPersonalWorkspacePocFlowFieldOwnership(value),
    items: value.items.map(item => ({ ...item, fieldOwnership: getPersonalWorkspacePocFlowItemFieldOwnership(item, origin, value) })) };
}
function input(flows: readonly PersonalWorkspacePocFlow[] = [flow()], state = createPersonalWorkspacePocState(NOW)): PersonalWorkspacePocEntryReadInput {
  return { baseModel: { version: 1, flows }, state, sourceRead: { ok: true, raw: null } };
}
function packet(value = input()) {
  const result = buildPersonalWorkspacePocEntryReadPacket(value); assert.ok(result.ok, result.ok ? '' : result.reason); return result.packet;
}
function preview(value: PersonalWorkspacePocEntryReadInput, selected = value.baseModel.flows[0].ref) {
  const result = readPersonalWorkspacePocEntryPreview(packet(value), { flowRef: selected, localToday: TODAY });
  assert.ok(result.ok, result.ok ? '' : result.reason); return result.preview;
}
function overlay(value: PersonalWorkspacePocEntryReadInput, memo: string) {
  const f = value.baseModel.flows[0], item = f.items[0];
  value.state.personalPlanOverlays = { [f.ref]: { flowRef: f.ref, savedCopyId: f.savedCopyId, flowId: f.flowId,
    items: { [item.ref]: { itemRef: item.ref, memo } } } };
}

test('ER01 four origins retain exact identities, original resolver results and their own source cards', () => {
  const value = input(ORIGINS.map((origin, index) => flow(index, origin))), before = JSON.stringify(value);
  const read = resolvePersonalWorkspacePocEntryRead(packet(value), ' 같은 준비 '); assert.ok(read.ok);
  const legacy = resolvePersonalWorkspacePocEntry(' 같은 준비 ', value.baseModel); assert.ok(legacy.ok);
  assert.deepEqual(read.resolution, legacy.resolution); assert.equal(read.cards.length, 4);
  for (const card of read.cards) {
    const f = value.baseModel.flows.find(f => f.ref === card.flowRef)!;
    assert.equal(card.sourceTitle, f.presentation!.discovery!.sourceTitle);
    assert.equal(card.sourceLinks[0].href, f.presentation!.discovery!.sourceUrls[0]);
    assert.equal(preview(value, f.ref).sourceView.items.length, 4);
  }
  assert.equal(JSON.stringify(value), before);
});

test('ER02 raw URL is retained while canonical lookup remains only the existing resolver comparison', () => {
  const value = input(), held = packet(value), raw = ' http://www.example.com/1?b=2&utm_medium=other ';
  const read = resolvePersonalWorkspacePocEntryRead(held, raw); assert.ok(read.ok);
  assert.equal(read.resolution.kind, 'url'); assert.equal(read.resolution.rawInput, raw);
  assert.equal(read.cards[0].sourceLinks[0].href, value.baseModel.flows[0].presentation!.discovery!.sourceUrls[0]);
  assert.notEqual(read.cards[0].sourceLinks[0].href, read.resolution.kind === 'url' ? read.resolution.canonicalUrl : '');
});

test('ER03 source-only description and criterion are separate from unavailable personal memo', () => {
  const value = input(), shown = preview(value), first = value.baseModel.flows[0].items[0];
  assert.deepEqual(shown.sourceView.items[0].description, { availability: 'present', value: first.description,
    owner: 'source', provenance: 'legacy-v1-fallback' });
  assert.equal(shown.sourceView.items[0].completionCriterion, first.completionCriterion);
  assert.deepEqual(shown.personalDetails[0].memo, { availability: 'unavailable' });
  assert.equal(Object.hasOwn(shown.sourceView.items[0], 'memo'), false);
  assert.equal(Object.hasOwn(shown.sourceView, 'personalDetails'), false);
  // Existing Result behavior is returned unchanged, not silently patched by this adapter.
  const expected = buildPersonalWorkspacePocResultProjection({ model: value.baseModel, state: value.state, flowRef: shown.flowRef, localToday: TODAY, purpose: 'personal-execution' });
  assert.ok(expected.ok); assert.deepEqual(shown.personalResult, expected.projection);
});

test('ER04 imported and PoC memo presence preserves empty, spaces and CRLF independently from source', () => {
  for (const memo of ['', '  \t ', '내 메모\r\n다음 줄\r\n', '원문 설명 0\r\n']) {
    const original = flow(), first = original.items[0], owned = first.fieldOwnership!;
    const personal = { value: memo, owner: 'existing-personal' as const, provenance: 'my-flow-item-draft' as const };
    const f = { ...original, items: [{ ...first, description: memo, fieldOwnership: { ...owned,
      description: { ...owned.description, existingPersonal: personal, effective: personal } } }, ...original.items.slice(1)] };
    for (const usePoc of [false, true]) {
      const value = input([f]); if (usePoc) overlay(value, memo);
      const shown = preview(value), field = shown.personalDetails[0].memo;
      assert.equal(field.availability, 'present'); if (field.availability !== 'present') return;
      assert.equal(field.value, memo); assert.equal(field.owner, usePoc ? 'poc-personal' : 'existing-personal');
      assert.equal(shown.sourceView.items[0].description.availability === 'present' && shown.sourceView.items[0].description.value, first.description);
    }
  }
});

test('ER05 personal title section global order date placement time and completion exactly match existing Result', () => {
  const f = flow(1, 'personal-draft'), value = input([f]), first = f.items[0];
  value.state.personalPlanOverlays = { [f.ref]: { flowRef: f.ref, savedCopyId: f.savedCopyId, flowId: f.flowId,
    title: '내 제목', sectionTitles: { s1: '내 구간' }, orderedItemRefs: [...f.items].reverse().map(i => i.ref),
    items: { [first.ref]: { itemRef: first.ref, title: '내 할 일', memo: '개인', schedule: { mode: 'fixed_date', date: '2026-09-06' } } } } };
  value.state.placements[first.ref] = { itemRef: first.ref, scheduleMode: 'fixed_date', date: '2026-09-07', time: '11:45', timelinePolicy: 'auto' };
  value.state.completions[first.ref] = { status: 'completed', completedAt: NOW };
  const shown = preview(value), index = buildPersonalWorkspacePocSourceReadIndex({ baseModel: value.baseModel }); assert.ok(index.ok);
  const expected = buildPersonalWorkspacePocResultProjection({ model: value.baseModel, state: value.state, sourceIndex: index.index,
    flowRef: f.ref, localToday: TODAY, purpose: 'personal-execution' }); assert.ok(expected.ok);
  assert.deepEqual(shown.personalResult, expected.projection);
  assert.equal(shown.personalResult.title, '내 제목'); assert.deepEqual(shown.personalResult.sourceItemRefs, [...f.items].reverse().map(i => i.ref));
  const resultItem = shown.personalResult.items.find(i => i.ref === first.ref)!;
  assert.equal(resultItem.planDate, '2026-09-06'); assert.equal(resultItem.effectiveDate, '2026-09-07'); assert.equal(resultItem.completed, true); assert.equal(resultItem.time, '11:45');
  assert.deepEqual(shown.sourceView.items.map(i => i.itemRef), f.items.map(i => i.ref));
  assert.equal(shown.sourceView.sections[0].title.availability === 'present' && shown.sourceView.sections[0].title.value, '원래 준비');
  assert.equal(shown.sourceView.title.availability === 'present' && shown.sourceView.title.value, '같은 준비');
});

test('ER06 personal-only source layers and sections remain unavailable instead of being reconstructed', () => {
  const f = flow(), absent = { owner: 'none' as const, provenance: 'none' as const };
  const personalOnly = { ...f, fieldOwnership: { ...f.fieldOwnership!, title: { ...f.fieldOwnership!.title, source: absent } },
    sections: f.sections!.map(section => ({ ...section, titleOwner: 'existing-personal' as const })),
    items: f.items.map(item => ({ ...item, fieldOwnership: { ...item.fieldOwnership!,
      title: { ...item.fieldOwnership!.title, source: absent }, description: { ...item.fieldOwnership!.description, source: absent },
      order: { ...item.fieldOwnership!.order, source: absent }, date: { ...item.fieldOwnership!.date, source: absent } } })) };
  const shown = preview(input([personalOnly]));
  assert.deepEqual(shown.sourceView.title, { availability: 'unavailable' });
  assert.equal(shown.sourceView.orderAvailability, 'unavailable');
  for (const item of shown.sourceView.items) for (const field of [item.title, item.description, item.order, item.date]) assert.deepEqual(field, { availability: 'unavailable' });
  assert.deepEqual(shown.sourceView.sections[0].title, { availability: 'unavailable' });
  assert.deepEqual(shown.sourceView.sections[0].order, { availability: 'unavailable' });
  assert.equal(shown.sourceView.completeness, 'partial'); assert.equal(Object.hasOwn(shown.sourceView.wholeText, 'rawText'), false);
});

test('ER07 missing full source never fabricates raw text, clock time, source link, or criteria', () => {
  const f = flow(), plain = { ...f, presentation: undefined, items: f.items.map(item => ({ ...item, completionCriterion: undefined })) };
  const shown = preview(input([plain]));
  assert.deepEqual(shown.sourceView.wholeText, { availability: 'unavailable', reason: 'saved-plan-has-no-full-source' });
  assert.equal(shown.sourceView.items[0].time, undefined, 'D+3 is not a time');
  assert.equal(shown.sourceView.items[0].sourceLink, undefined); assert.equal(shown.sourceView.items[0].completionCriterion, undefined);
  const read = resolvePersonalWorkspacePocEntryRead(packet(input([plain])), '준비'); assert.ok(read.ok); assert.deepEqual(read.cards[0].sourceLinks, []);
});

test('ER08 source read failure, missing packet raw, corrupted bytes and unknown versions issue no packet', () => {
  for (const sourceRead of [{ ok: false, reason: 'storage-read-failed' }, { ok: true }, { ok: true, raw: '{' },
    { ok: true, raw: JSON.stringify({ ...createPersonalWorkspacePocSourceCandidateStore(NOW), version: 77 }) },
    { ok: false, reason: 'bad', raw: null }, { ok: true, raw: null, ready: true }]) {
    const result = buildPersonalWorkspacePocEntryReadPacket({ ...input(), sourceRead } as PersonalWorkspacePocEntryReadInput);
    assert.equal(result.ok, false); assert.equal(Object.hasOwn(result, 'packet'), false);
  }
  assert.ok(buildPersonalWorkspacePocEntryReadPacket({ ...input(), sourceRead: { ok: true, raw: JSON.stringify(createPersonalWorkspacePocSourceCandidateStore(NOW)) } }).ok);
});

test('ER09 forged serialized and proxy packet handles cannot read any source or preview', () => {
  const original = packet(); let probes = 0;
  const proxy = new Proxy(original, { get() { probes++; throw new Error('no property inspection'); } });
  for (const forged of [{ ...original }, JSON.parse(JSON.stringify(original)), proxy, null, 'packet']) {
    const handle = forged as PersonalWorkspacePocEntryReadPacket;
    assert.deepEqual(resolvePersonalWorkspacePocEntryRead(handle, '준비'), { ok: false, reason: 'invalid-entry-read-packet' });
    assert.deepEqual(readPersonalWorkspacePocEntryPreview(handle, { flowRef: flow().ref, localToday: TODAY }), { ok: false, reason: 'invalid-entry-read-packet' });
  }
  assert.equal(probes, 0); assert.deepEqual(Object.keys(original).sort(), ['contract', 'version']);
});

test('ER10 unknown origins duplicate or foreign identities and invalid state fail before partial output', () => {
  const f = flow(), second = flow(2);
  for (const flows of [[f, f], [{ ...f, items: [f.items[0], f.items[0]] }], [f, { ...second, items: [f.items[0]] }],
    [{ ...f, origin: 'future' as PersonalWorkspacePocOrigin }]]) assert.equal(buildPersonalWorkspacePocEntryReadPacket(input(flows)).ok, false);
  const value = input(); assert.equal(buildPersonalWorkspacePocEntryReadPacket({ ...value, state: { ...value.state, version: 9 as 1 } }).ok, false);
  assert.equal(readPersonalWorkspacePocEntryPreview(packet(value), { flowRef: second.ref, localToday: TODAY }).ok, false);
});

test('ER11 unsafe persisted Flow URLs retain the existing whole-entry fail-closed gate', () => {
  for (const raw of ['javascript:alert(1)', 'data:text/plain,bad', '/relative', 'https://', 'ftp://example.com/']) {
    const f = flow(), result = buildPersonalWorkspacePocEntryReadPacket(input([{ ...f, presentation: { discovery: { sourceUrls: [raw] } } }]));
    assert.deepEqual(result, { ok: false, reason: 'malformed-source-url' });
  }
});

test('ER12 Map child source cards never adopt a sibling representative URL and held children remain ineligible', () => {
  const first = flow(1, 'source-backed-map'), second = flow(2, 'source-backed-map');
  const values = [first, second].map((f, index) => ({ ...f, presentation: { ...f.presentation,
    mapGroup: { ...f.presentation!.mapGroup!, groupRef: 'flow-group:shared', ownerId: 'shared', childOrder: index, childCount: 2 } } }));
  const read = resolvePersonalWorkspacePocEntryRead(packet(input(values)), '준비'); assert.ok(read.ok);
  assert.equal(read.cards[0].sourceLinks.length, 1); assert.equal(read.cards[1].sourceLinks.length, 1);
  assert.notEqual(read.cards[0].sourceLinks[0].href, read.cards[1].sourceLinks[0].href);
  const held = { ...first, presentation: { ...first.presentation, mapGroup: { ...first.presentation!.mapGroup!, executionState: 'review-hold' as const } } };
  const heldPacket = packet(input([held])), result = resolvePersonalWorkspacePocEntryRead(heldPacket, '준비'); assert.ok(result.ok); assert.deepEqual(result.cards, []);
  assert.equal(readPersonalWorkspacePocEntryPreview(heldPacket, { flowRef: held.ref, localToday: TODAY }).ok, false);
});

test('ER13 authored handoffs and effective source updates validate but never expand the four-origin entry', () => {
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: 'entry-authored', documentId: 'entry-doc', revisionId: 'entry-rev',
    rawText: '# 작성 원문\r\n- [x] 작성할 일\r\n  - 날짜: 2026-09-05\r\n  - 시간: 09:30\r\n', committedAt: NOW }); assert.ok(made.ok);
  const state = createPersonalWorkspacePocState(NOW); state.authoredFlows = [made.flow];
  state.authoringReceipts = [{ handoffId: made.flow.authoring.handoffId, flowRef: made.flow.ref, committedAt: NOW }];
  const update = createPersonalWorkspacePocLocalFixtureEnvelope(made.flow, { candidateId: 'entry-candidate', incomingRevisionId: 'new',
    incomingRawText: made.flow.authoring.rawText.replace('작성 원문', '새 작성 원문'), createdAt: NOW }); assert.ok(update.ok);
  let store = stagePersonalWorkspacePocSourceCandidate(createPersonalWorkspacePocSourceCandidateStore(NOW), update.envelope, update.current, NOW).store;
  for (const change of update.envelope.changes) store = resolvePersonalWorkspacePocSourceCandidateChange(store, {
    candidateId: update.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW }).store;
  const applied = applyPersonalWorkspacePocSourceCandidate(store, { candidateId: update.envelope.candidateId, current: update.current, now: NOW }); assert.equal(applied.code, 'applied');
  const value = { ...input([flow()], state), sourceRead: { ok: true as const, raw: JSON.stringify(applied.store) } }, before = JSON.stringify(value);
  const held = packet(value), read = resolvePersonalWorkspacePocEntryRead(held, '작성 원문'); assert.ok(read.ok); assert.deepEqual(read.resolution.matches, []);
  assert.deepEqual(readPersonalWorkspacePocEntryPreview(held, { flowRef: made.flow.ref, localToday: TODAY }), { ok: false, reason: 'entry-flow-not-eligible' });
  assert.ok(readPersonalWorkspacePocEntryPreview(held, { flowRef: flow().ref, localToday: TODAY }).ok); assert.equal(JSON.stringify(value), before);
});

test('ER14 caller changes cannot mutate a captured packet and a new packet is required to observe them', () => {
  const value = input(), before = JSON.stringify(value), held = packet(value);
  assert.equal(JSON.stringify(value), before); overlay(value, '이후 개인 메모');
  const old = readPersonalWorkspacePocEntryPreview(held, { flowRef: flow().ref, localToday: TODAY }); assert.ok(old.ok);
  assert.equal(old.preview.personalDetails[0].memo.availability, 'unavailable');
  assert.equal(preview(value).personalDetails[0].memo.availability, 'present');
  assert.equal(Object.isFrozen(old.preview.personalResult.items), true);
  assert.equal(Reflect.set(old.preview.sourceView.items[0].title, 'value', '오염'), false);
  assert.equal(Reflect.set(old.preview.personalResult.items[0], 'title', '오염'), false);
  assert.equal(Object.isFrozen(value.state), false, 'caller state was not frozen');
});

test('ER15 101 items are preserved across source and every existing result slot with exact same-copy refs', () => {
  const f = flow(1, 'canonical-personal-copy', 101), shown = preview(input([f, flow(2, 'canonical-personal-copy', 101)]));
  const refs = f.items.map(i => i.ref);
  assert.deepEqual(shown.sourceView.items.map(i => i.itemRef), refs); assert.deepEqual(shown.personalResult.itemRefs, refs);
  assert.equal(shown.personalDetails.length, 101); assert.equal(shown.personalResult.todo.rowCount, 101);
  assert.deepEqual(new Set(shown.personalResult.text.itemRefs), new Set(refs));
  assert.deepEqual(new Set(shown.personalResult.sheet.itemRefs), new Set(refs));
  assert.equal(shown.personalResult.calendar.undatedItemRefs.length, 100);
});

test('ER16 invalid preview dates and foreign overlay never become a usable raw-source fallback', () => {
  const value = input(), held = packet(value);
  for (const options of [{ localToday: '2026-02-30' }, { localToday: TODAY, baseDate: 'bad' }, { localToday: TODAY, selectedDate: 'bad' }])
    assert.equal(readPersonalWorkspacePocEntryPreview(held, { flowRef: flow().ref, ...options }).ok, false);
  overlay(value, '메모'); value.state.personalPlanOverlays![flow().ref].items[flow(2).items[0].ref] = { itemRef: flow(2).items[0].ref, memo: '이웃' };
  assert.equal(buildPersonalWorkspacePocEntryReadPacket(value).ok, false);
});

test('ER17 descriptor getters, toJSON, cycles and prototype objects are rejected without invoking them', () => {
  let calls = 0;
  const getter = Object.defineProperty({}, 'baseModel', { enumerable: true, get() { calls++; return input().baseModel; } });
  const json = { ...input(), toJSON() { calls++; return input(); } };
  const cycle: Record<string, unknown> = { ...input() }; cycle.self = cycle;
  const inherited = Object.create({ get baseModel() { calls++; return input().baseModel; } });
  for (const value of [getter, json, cycle, inherited, { ...input(), currentAuthority: true }]) {
    const result = buildPersonalWorkspacePocEntryReadPacket(value as PersonalWorkspacePocEntryReadInput);
    assert.equal(result.ok, false); assert.equal(Object.hasOwn(result, 'packet'), false);
  }
  assert.equal(calls, 0);
});

test('ER18 exact empty, query hit/miss, valid URL miss, invalid URL and memo behavior reuse the resolver unchanged', () => {
  const value = input(), held = packet(value), composed = composePersonalWorkspacePocReadModel(value.baseModel, value.state); assert.ok(composed.ok);
  for (const raw of [' \r\n\t ', '준비', '없는 검색어', 'https://example.net/miss', 'https//example.com', '다음 주에 책 읽기\r\n']) {
    const actual = resolvePersonalWorkspacePocEntryRead(held, raw), expected = resolvePersonalWorkspacePocEntry(raw, composed.model);
    assert.ok(actual.ok); assert.ok(expected.ok); assert.deepEqual(actual.resolution, expected.resolution);
  }
});

test('ER19 source read and personal result calculation invoke no clock, storage, network or mutation port', () => {
  const value = input(), before = JSON.stringify(value), originalFetch = globalThis.fetch;
  let fetches = 0, storageCalls = 0;
  const existingStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const poison = new Proxy({}, { get() { storageCalls++; throw new Error('read packet has no storage port'); } });
  globalThis.fetch = (() => { fetches++; throw new Error('no fetch'); }) as typeof fetch;
  Object.defineProperty(globalThis, 'localStorage', { value: poison, configurable: true });
  try {
    const held = packet(value); assert.ok(resolvePersonalWorkspacePocEntryRead(held, '준비').ok);
    assert.ok(readPersonalWorkspacePocEntryPreview(held, { flowRef: flow().ref, localToday: TODAY }).ok);
    assert.equal(JSON.stringify(value), before); assert.equal(fetches, 0); assert.equal(storageCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (existingStorage) Object.defineProperty(globalThis, 'localStorage', existingStorage); else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('ER20 source-owned offsets stay offsets and orphan execution refs cannot issue a packet', () => {
  const value = input(), first = value.baseModel.flows[0].items[0];
  const withOffset = { ...first, fieldOwnership: { ...first.fieldOwnership!, dateDerivation: {
    ...first.fieldOwnership!.dateDerivation, sourceSchedule: { mode: 'day-offset' as const, dayOffset: 3,
      owner: 'source' as const, provenance: 'legacy-v1-fallback' as const } } } };
  const offsetInput = input([{ ...value.baseModel.flows[0], items: [withOffset, ...value.baseModel.flows[0].items.slice(1)] }]);
  assert.deepEqual(preview(offsetInput).sourceView.items[0].sourceSchedule, withOffset.fieldOwnership.dateDerivation.sourceSchedule);
  value.state.completions[flow(2).items[0].ref] = { status: 'completed', completedAt: NOW };
  assert.equal(buildPersonalWorkspacePocEntryReadPacket(value).ok, false);
});

test('ER21 shared personal Result labels retained source description as source, never as a personal memo', () => {
  const value = input(), original = value.baseModel.flows[0].items[0];
  const result = buildPersonalWorkspacePocResultProjection({ model: value.baseModel, state: value.state, flowRef: value.baseModel.flows[0].ref,
    localToday: TODAY, purpose: 'personal-execution' });
  assert.ok(result.ok);
  assert.equal(result.projection.items[0].memo, undefined);
  assert.equal(result.projection.items[0].sourceAttributes?.description, original.description);
  assert.equal(result.projection.items[0].sourceAttributes?.completionCriteria, original.completionCriterion);
});
