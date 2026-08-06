import assert from 'node:assert/strict';
import test from 'node:test';
import { toAuthoringItemView } from '../../../components/flow/text-authoring/view-model';
import { buildAuthoringArtifactProjection } from './artifact-projection';
import { stableAuthoringId } from './identity';
import {
  allowedAuthoringIssueOutcomes,
  authoringIssueBlocksDraft,
  authoringIssueState,
  isAuthoringIssueOutstanding,
} from './issue-state';
import { applyAuthoringOperation } from './operations';
import { createTextAuthoringDocument } from './parser';
import { validateTextAuthoringDocument } from './validation';

const NOW = '2026-07-29T00:00:00.000Z';
const RAW =
  '제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약';

test('rename, nesting, role, visibility, reorder, and restore are revision-only edits', () => {
  const initial = createTextAuthoringDocument(RAW, {
    fixtureVersion: 'operations-legacy-v1',
    now: NOW,
  });
  const initialRows = structuredClone(initial.parseResult.canonical.sourceRows);
  const [first, second] = initial.parseResult.canonical.items;
  let document = applyAuthoringOperation(
    initial,
    { type: 'rename', itemId: first.itemId, title: '항공권 일정 확인' },
    { now: '2026-07-29T00:01:00.000Z' },
  );
  assert.equal(document.parseResult.canonical.items[0].title, '항공권 일정 확인');
  assert.equal(document.parseResult.canonical.items[0].sourceTitle, '항공권 확인');
  assert.equal(initial.parseResult.canonical.items[0].title, '항공권 확인');

  document = applyAuthoringOperation(document, {
    type: 'indent',
    itemId: first.itemId,
  });
  assert.equal(document.parseResult.canonical.items[0].nestingLevel, 1);
  document = applyAuthoringOperation(document, {
    type: 'outdent',
    itemId: first.itemId,
  });
  assert.equal(document.parseResult.canonical.items[0].nestingLevel, 0);
  document = applyAuthoringOperation(document, {
    type: 'change_role',
    itemId: first.itemId,
    role: 'guide',
  });
  assert.equal(document.parseResult.canonical.items[0].role, 'guide');
  document = applyAuthoringOperation(document, {
    type: 'exclude',
    itemId: first.itemId,
  });
  assert.equal(document.parseResult.canonical.items[0].included, false);
  document = applyAuthoringOperation(document, {
    type: 'include',
    itemId: first.itemId,
  });
  assert.equal(document.parseResult.canonical.items[0].included, true);
  document = applyAuthoringOperation(document, {
    type: 'exclude',
    itemId: first.itemId,
  });
  document = applyAuthoringOperation(document, { type: 'restore' });
  assert.ok(document.parseResult.canonical.items.every((item) => item.included));
  document = applyAuthoringOperation(document, {
    type: 'reorder',
    itemId: second.itemId,
    toIndex: 0,
  });
  assert.equal(document.parseResult.canonical.items[0].itemId, second.itemId);

  assert.deepEqual(document.parseResult.canonical.sourceRows, initialRows);
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('item restore returns one corrected Item to its parser mapping and is itself undoable', () => {
  const initial = createTextAuthoringDocument(RAW, {
    fixtureVersion: 'operations-legacy-v1',
    now: NOW,
  });
  const sourceRows = structuredClone(initial.parseResult.canonical.sourceRows);
  const [first, second] = initial.parseResult.canonical.items;
  let document = applyAuthoringOperation(initial, {
    type: 'rename',
    itemId: first.itemId,
    title: '항공권 최종 확인하기',
  });
  document = applyAuthoringOperation(document, {
    type: 'change_role',
    itemId: first.itemId,
    role: 'guide',
  });
  document = applyAuthoringOperation(document, {
    type: 'exclude',
    itemId: first.itemId,
  });
  document = applyAuthoringOperation(document, {
    type: 'reorder',
    itemId: first.itemId,
    toIndex: 2,
  });
  document = applyAuthoringOperation(document, {
    type: 'rename',
    itemId: second.itemId,
    title: '숙소 번호 다시 정리',
  });
  const beforeRestore = structuredClone(document.parseResult);

  const restored = applyAuthoringOperation(document, {
    type: 'restore',
    itemId: first.itemId,
  });
  const restoredFirst = restored.parseResult.canonical.items.find(
    (item) => item.itemId === first.itemId,
  );
  const untouchedSecond = restored.parseResult.canonical.items.find(
    (item) => item.itemId === second.itemId,
  );
  assert.equal(restored.parseResult.canonical.items[0].itemId, first.itemId);
  assert.equal(restoredFirst?.title, '항공권 확인');
  assert.equal(restoredFirst?.role, 'item');
  assert.equal(restoredFirst?.included, true);
  assert.equal(restoredFirst?.nestingLevel, 0);
  assert.deepEqual(restoredFirst?.titleOverrides, undefined);
  assert.equal(untouchedSecond?.title, '숙소 번호 다시 정리');
  assert.deepEqual(restored.parseResult.canonical.sourceRows, sourceRows);
  assert.equal(validateTextAuthoringDocument(restored).valid, true);

  const undone = applyAuthoringOperation(restored, { type: 'undo' });
  assert.deepEqual(undone.parseResult.canonical, beforeRestore.canonical);
  assert.deepEqual(undone.parseResult.mappings, beforeRestore.mappings);
  assert.deepEqual(undone.parseResult.issues, beforeRestore.issues);
  assert.deepEqual(undone.parseResult.blocks, beforeRestore.blocks);
  assert.equal(validateTextAuthoringDocument(undone).valid, true);
});

test('classify_issue keeps source-only without creating canonical content', () => {
  const initial = createTextAuthoringDocument(
    '제주 여행은 여름에 사람이 많습니다.',
    { now: NOW, ownership: 'creator' },
  );
  const issue = initial.parseResult.issues[0];
  const mapping = initial.parseResult.mappings[0];
  const sourceRows = structuredClone(initial.parseResult.canonical.sourceRows);
  const blocks = structuredClone(initial.parseResult.blocks);
  const canonical = structuredClone(initial.parseResult.canonical);
  const eligibility = structuredClone(initial.parseResult.artifactEligibility);

  assert.deepEqual(allowedAuthoringIssueOutcomes(issue), [
    'keep_source_only',
    'convert_to_item',
    'hold',
  ]);
  const kept = applyAuthoringOperation(
    initial,
    {
      type: 'classify_issue',
      issueId: issue.issueId,
      outcome: 'keep_source_only',
    },
    {
      actorLane: 'suggestion',
      now: '2026-07-29T01:00:00.000Z',
    },
  );
  const keptIssue = kept.parseResult.issues[0];
  const keptMapping = kept.parseResult.mappings[0];

  assert.deepEqual(keptIssue.decision, {
    outcome: 'keep_source_only',
    state: 'resolved',
    targetKind: 'source',
    actorLane: 'suggestion',
    decidedAt: '2026-07-29T01:00:00.000Z',
  });
  assert.equal(authoringIssueState(keptIssue), 'resolved');
  assert.equal(isAuthoringIssueOutstanding(keptIssue), false);
  assert.equal(authoringIssueBlocksDraft(keptIssue), false);
  assert.equal(keptMapping.mappingId, mapping.mappingId);
  assert.equal(keptMapping.targetKind, 'unresolved');
  assert.equal(keptMapping.targetDraftId, issue.issueId);
  assert.equal(keptMapping.userCorrected, true);
  assert.equal(kept.rawText, initial.rawText);
  assert.deepEqual(kept.parseResult.blocks, blocks);
  assert.deepEqual(kept.parseResult.canonical.sourceRows, sourceRows);
  assert.deepEqual(kept.parseResult.canonical, canonical);
  assert.deepEqual(kept.parseResult.artifactEligibility, eligibility);
  assert.equal(kept.revision.actorLane, 'suggestion');

  const repeated = applyAuthoringOperation(kept, {
    type: 'classify_issue',
    issueId: issue.issueId,
    outcome: 'keep_source_only',
  });
  assert.equal(repeated, kept);
  const reclassified = applyAuthoringOperation(kept, {
    type: 'classify_issue',
    issueId: issue.issueId,
    outcome: 'convert_to_item',
  });
  assert.equal(reclassified, kept);

  const undone = applyAuthoringOperation(
    kept,
    { type: 'undo' },
    { now: '2026-07-29T01:01:00.000Z' },
  );
  assert.equal(undone.parseResult.issues[0].decision, undefined);
  assert.equal(undone.parseResult.mappings[0].userCorrected, false);
  assert.deepEqual(undone.parseResult.canonical, canonical);
});

test('classify_issue keeps held blocking issues outstanding', () => {
  const initial = createTextAuthoringDocument(
    'https://example.com/source',
    { now: NOW, ownership: 'creator' },
  );
  const issue = initial.parseResult.issues[0];
  const canonical = structuredClone(initial.parseResult.canonical);
  const blocks = structuredClone(initial.parseResult.blocks);
  const sourceRows = structuredClone(initial.parseResult.canonical.sourceRows);

  assert.equal(issue.type, 'source_import_required');
  assert.deepEqual(allowedAuthoringIssueOutcomes(issue), ['hold']);
  const held = applyAuthoringOperation(
    initial,
    {
      type: 'classify_issue',
      issueId: issue.issueId,
      outcome: 'hold',
    },
    { now: '2026-07-29T02:00:00.000Z' },
  );
  const heldIssue = held.parseResult.issues[0];

  assert.deepEqual(heldIssue.decision, {
    outcome: 'hold',
    state: 'held',
    targetKind: 'unresolved',
    actorLane: 'creator',
    decidedAt: '2026-07-29T02:00:00.000Z',
  });
  assert.equal(authoringIssueState(heldIssue), 'held');
  assert.equal(isAuthoringIssueOutstanding(heldIssue), true);
  assert.equal(authoringIssueBlocksDraft(heldIssue), true);
  assert.equal(held.lifecycleStatus, 'needs_review');
  assert.deepEqual(held.parseResult.canonical, canonical);
  assert.deepEqual(held.parseResult.blocks, blocks);
  assert.deepEqual(held.parseResult.canonical.sourceRows, sourceRows);
  assert.equal(
    applyAuthoringOperation(held, {
      type: 'classify_issue',
      issueId: issue.issueId,
      outcome: 'hold',
    }),
    held,
  );

  const legacy = structuredClone(issue);
  legacy.resolution = {
    targetKind: 'source',
    resolvedAt: '2026-07-28T00:00:00.000Z',
  };
  assert.equal(authoringIssueState(legacy), 'resolved');
  assert.equal(isAuthoringIssueOutstanding(legacy), false);
});

test('classify_issue converts source lineage into one stable undated Item', () => {
  const raw = '제주 여행은 여름에 사람이 많습니다.';
  const initial = createTextAuthoringDocument(raw, { now: NOW });
  const issue = initial.parseResult.issues[0];
  const mapping = structuredClone(initial.parseResult.mappings[0]);
  const sourceRows = structuredClone(initial.parseResult.canonical.sourceRows);
  const blocks = structuredClone(initial.parseResult.blocks);
  const expectedItemId = stableAuthoringId(
    'item',
    initial.documentId,
    ...issue.sourceRowIds,
  );

  const converted = applyAuthoringOperation(
    initial,
    {
      type: 'classify_issue',
      issueId: issue.issueId,
      outcome: 'convert_to_item',
      titleOverride: '여름 혼잡 확인',
    },
    {
      actorLane: 'personal',
      now: '2026-07-29T03:00:00.000Z',
    },
  );
  const item = converted.parseResult.canonical.items[0];
  const convertedMapping = converted.parseResult.mappings[0];
  const convertedIssue = converted.parseResult.issues[0];

  assert.equal(item.itemId, expectedItemId);
  assert.equal(item.sourceTitle, raw);
  assert.equal(item.title, '여름 혼잡 확인');
  assert.deepEqual(item.titleOverrides, { personal: '여름 혼잡 확인' });
  assert.deepEqual(item.sourceRowIds, issue.sourceRowIds);
  assert.equal(item.schedule, undefined);
  assert.equal(item.completion, undefined);
  assert.deepEqual(item.properties, []);
  assert.deepEqual(item.resources, []);
  assert.equal(converted.parseResult.canonical.steps.length, 1);
  assert.equal(converted.parseResult.canonical.steps[0].generated, true);
  assert.deepEqual(
    converted.parseResult.canonical.steps[0].itemIds,
    [expectedItemId],
  );
  assert.deepEqual(convertedIssue.decision, {
    outcome: 'convert_to_item',
    state: 'resolved',
    targetKind: 'item',
    targetDraftId: expectedItemId,
    actorLane: 'personal',
    decidedAt: '2026-07-29T03:00:00.000Z',
  });
  assert.equal(convertedMapping.mappingId, mapping.mappingId);
  assert.equal(convertedMapping.targetKind, 'item');
  assert.equal(convertedMapping.targetDraftId, expectedItemId);
  assert.deepEqual(convertedMapping.sourceLineage, mapping.sourceLineage);
  assert.equal(convertedMapping.userCorrected, true);
  assert.ok(converted.parseResult.canonical.sourceRefs.some((sourceRef) => (
    sourceRef.entityType === 'item'
    && sourceRef.entityId === expectedItemId
    && sourceRef.supportLevel === 'direct'
    && sourceRef.relation === 'derived_from'
    && sourceRef.sourceRowIds.join('|') === issue.sourceRowIds.join('|')
  )));
  assert.equal(converted.parseResult.artifactEligibility.counts.calendar, 0);
  assert.equal(converted.parseResult.artifactEligibility.counts.todo, 1);
  assert.equal(converted.rawText, initial.rawText);
  assert.deepEqual(converted.parseResult.blocks, blocks);
  assert.deepEqual(converted.parseResult.canonical.sourceRows, sourceRows);
  assert.equal(validateTextAuthoringDocument(converted).valid, true);

  const repeated = applyAuthoringOperation(converted, {
    type: 'classify_issue',
    issueId: issue.issueId,
    outcome: 'convert_to_item',
  });
  assert.equal(repeated, converted);
  const undone = applyAuthoringOperation(
    converted,
    { type: 'undo' },
    { now: '2026-07-29T03:01:00.000Z' },
  );
  assert.equal(undone.parseResult.canonical.items.length, 0);
  assert.equal(undone.parseResult.canonical.steps.length, 0);
  assert.equal(undone.parseResult.canonical.sourceRefs.length, 0);
  assert.equal(undone.parseResult.issues[0].decision, undefined);
  assert.equal(undone.parseResult.mappings[0].mappingId, mapping.mappingId);
  assert.equal(undone.parseResult.mappings[0].targetKind, 'unresolved');
  assert.equal(undone.parseResult.mappings[0].targetDraftId, issue.issueId);
  const convertedAgain = applyAuthoringOperation(undone, {
    type: 'classify_issue',
    issueId: issue.issueId,
    outcome: 'convert_to_item',
  });
  assert.equal(convertedAgain.parseResult.canonical.items[0].itemId, expectedItemId);
});

test('classify_issue uses source context for Step and preserves existing order', () => {
  const raw = [
    '# 여행',
    '## 준비',
    '- [ ] 항공권 확인',
    '<aside>메모</aside>',
  ].join('\n');
  const initial = createTextAuthoringDocument(raw, { now: NOW });
  const issue = initial.parseResult.issues[0];
  const step = initial.parseResult.canonical.steps[0];
  const existingItemId = initial.parseResult.canonical.items[0].itemId;
  const converted = applyAuthoringOperation(initial, {
    type: 'classify_issue',
    issueId: issue.issueId,
    outcome: 'convert_to_item',
    titleOverride: '메모 확인',
  });
  const createdItem = converted.parseResult.canonical.items[1];

  assert.equal(createdItem.stepId, step.stepId);
  assert.equal(createdItem.sourceTitle, '<aside>메모</aside>');
  assert.deepEqual(converted.parseResult.canonical.steps[0].itemIds, [
    existingItemId,
    createdItem.itemId,
  ]);
  assert.deepEqual(
    converted.parseResult.canonical.items.map((item) => item.itemId),
    [existingItemId, createdItem.itemId],
  );

  const invalidStep = applyAuthoringOperation(initial, {
    type: 'classify_issue',
    issueId: issue.issueId,
    outcome: 'convert_to_item',
    targetStepId: 'missing-step',
  });
  assert.equal(invalidStep, initial);
  const invalidTitle = applyAuthoringOperation(initial, {
    type: 'classify_issue',
    issueId: issue.issueId,
    outcome: 'convert_to_item',
    titleOverride: '   ',
  });
  assert.equal(invalidTitle, initial);
  const missingIssue = applyAuthoringOperation(initial, {
    type: 'classify_issue',
    issueId: 'missing-issue',
    outcome: 'hold',
  });
  assert.equal(missingIssue, initial);
});

test('classify_issue rejects unsupported outcomes and broken lineage', () => {
  const urlDocument = createTextAuthoringDocument(
    'https://example.com/source',
    { now: NOW },
  );
  const urlIssue = urlDocument.parseResult.issues[0];
  assert.equal(
    applyAuthoringOperation(urlDocument, {
      type: 'classify_issue',
      issueId: urlIssue.issueId,
      outcome: 'convert_to_item',
    }),
    urlDocument,
  );

  const broken = createTextAuthoringDocument(
    '제주 여행은 여름에 사람이 많습니다.',
    { now: NOW },
  );
  const brokenIssue = broken.parseResult.issues[0];
  broken.parseResult.mappings[0].sourceLineage = [];
  const revisionCount = broken.revisionHistory.length;
  assert.equal(
    applyAuthoringOperation(broken, {
      type: 'classify_issue',
      issueId: brokenIssue.issueId,
      outcome: 'convert_to_item',
    }),
    broken,
  );
  assert.equal(broken.parseResult.canonical.items.length, 0);
  assert.equal(broken.revisionHistory.length, revisionCount);
});

test('set_property creates creator overrides without rewriting source values', () => {
  const initial = createTextAuthoringDocument(
    ['# 준비', '- [ ] 항공권 확인', '  자세히: 원문 상세'].join('\n'),
    { now: NOW, ownership: 'creator' },
  );
  const itemId = initial.parseResult.canonical.items[0].itemId;
  let document = initial;
  const operations = [
    ['title', '항공권 시간 확인'],
    ['detail', '내가 덧붙인 상세'],
    ['completion', '시간을 메모했다'],
    ['date', '2026-08-03'],
    ['time', '09:30'],
    ['timezone', 'Asia/Seoul'],
    ['place', '제주공항'],
    ['duration', '90분'],
    ['repeat', '반복 없음'],
    ['condition', '출발 전'],
    ['resource', '항공사 https://example.com/tool'],
    ['source', '원문 https://example.com/source'],
  ] as const;
  operations.forEach(([key, value], index) => {
    document = applyAuthoringOperation(
      document,
      { type: 'set_property', itemId, key, value },
      { now: `2026-07-29T00:${String(index + 1).padStart(2, '0')}:00.000Z` },
    );
  });
  const item = document.parseResult.canonical.items[0];

  assert.equal(item.sourceTitle, '항공권 확인');
  assert.equal(item.sourceDetail, '원문 상세');
  assert.equal(item.creatorTitle, '항공권 시간 확인');
  assert.equal(item.creatorDetail, '내가 덧붙인 상세');
  assert.equal(item.titleOverrides?.creator, '항공권 시간 확인');
  assert.equal(item.detailOverrides?.creator, '내가 덧붙인 상세');
  assert.equal(item.completion?.owner, 'creator');
  assert.deepEqual(item.schedule, {
    kind: 'absolute',
    raw: '2026-08-03',
    date: '2026-08-03',
    time: '09:30',
    timezone: 'Asia/Seoul',
    durationMinutes: 90,
    repeat: '반복 없음',
  });
  document = applyAuthoringOperation(
    document,
    {
      type: 'set_property',
      itemId,
      key: 'date',
      value: '2026-08-04',
    },
    { now: '2026-07-29T00:20:00.000Z' },
  );
  assert.deepEqual(document.parseResult.canonical.items[0].schedule, {
    kind: 'absolute',
    raw: '2026-08-04',
    date: '2026-08-04',
    time: '09:30',
    timezone: 'Asia/Seoul',
    durationMinutes: 90,
    repeat: '반복 없음',
  });
  const calendarRow = buildAuthoringArtifactProjection(document)
    .artifacts.calendar.rows[0];
  assert.deepEqual(
    {
      date: calendarRow?.date,
      time: calendarRow?.time,
      timezone: calendarRow?.timezone,
      durationMinutes: calendarRow?.durationMinutes,
    },
    {
      date: '2026-08-04',
      time: '09:30',
      timezone: 'Asia/Seoul',
      durationMinutes: 90,
    },
  );
  assert.ok(item.properties.some((property) => (
    property.owner === 'creator'
    && property.key === 'place'
    && property.value === '제주공항'
  )));
  assert.equal(item.resources.at(-1)?.url, 'https://example.com/tool');
  assert.equal(item.sources.at(-1)?.url, 'https://example.com/source');
  assert.deepEqual(
    document.parseResult.canonical.sourceRows,
    initial.parseResult.canonical.sourceRows,
  );
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('personal, creator, and suggestion edits keep separate owners and one effective view', () => {
  const initial = createTextAuthoringDocument(
    [
      '# 준비',
      '- [ ] 항공권 확인',
      '  자세히: 원문 상세',
      '  완료 기준: 예약번호를 확인한다',
      '  날짜: 2026-08-01',
    ].join('\n'),
    { now: NOW, ownership: 'personal' },
  );
  const initialSourceRows = structuredClone(initial.parseResult.canonical.sourceRows);
  const initialItem = structuredClone(initial.parseResult.canonical.items[0]);
  const itemId = initialItem.itemId;
  let document = initial;
  const laneValues = [
    {
      lane: 'personal',
      title: '내 항공권 확인',
      detail: '내 예약번호까지 확인',
      completion: '내 예약번호를 기록한다',
      date: '2026-08-02',
      place: '제주공항',
      resource: '예약 도구 https://example.com/booking',
    },
    {
      lane: 'creator',
      title: '제작자 항공권 확인',
      detail: '제작자 검수 상세',
      completion: '제작자가 검수한다',
      date: '2026-08-03',
      place: '김포공항',
      resource: '예약 도구 https://example.com/booking',
    },
    {
      lane: 'suggestion',
      title: '제안 항공권 확인',
      detail: '검토할 수정 제안',
      completion: '제안을 검토한다',
      date: '2026-08-04',
      place: '인천공항',
      resource: '예약 도구 https://example.com/booking',
    },
  ] as const;

  laneValues.forEach((entry, laneIndex) => {
    const values = [
      ['title', entry.title],
      ['detail', entry.detail],
      ['completion', entry.completion],
      ['date', entry.date],
      ['place', entry.place],
      ['resource', entry.resource],
    ] as const;
    values.forEach(([key, value], valueIndex) => {
      document = applyAuthoringOperation(
        document,
        { type: 'set_property', itemId, key, value },
        {
          actorLane: entry.lane,
          now: `2026-07-29T0${laneIndex + 1}:${String(valueIndex).padStart(2, '0')}:00.000Z`,
        },
      );
    });
  });

  const item = document.parseResult.canonical.items[0];
  assert.equal(item.sourceTitle, initialItem.sourceTitle);
  assert.equal(item.sourceDetail, initialItem.sourceDetail);
  assert.deepEqual(item.sourceCompletion, initialItem.completion);
  assert.deepEqual(item.sourceSchedule, initialItem.schedule);
  assert.deepEqual(
    document.parseResult.canonical.sourceRows,
    initialSourceRows,
  );

  assert.deepEqual(item.titleOverrides, {
    personal: '내 항공권 확인',
    creator: '제작자 항공권 확인',
    suggestion: '제안 항공권 확인',
  });
  assert.deepEqual(item.detailOverrides, {
    personal: '내 예약번호까지 확인',
    creator: '제작자 검수 상세',
    suggestion: '검토할 수정 제안',
  });
  assert.equal(item.creatorTitle, '제작자 항공권 확인');
  assert.equal(item.creatorDetail, '제작자 검수 상세');
  const personalCompletion = item.completionOverrides?.personal;
  const creatorCompletion = item.completionOverrides?.creator;
  const suggestionCompletion = item.completionOverrides?.suggestion;
  assert.ok(personalCompletion);
  assert.ok(creatorCompletion);
  assert.ok(suggestionCompletion);
  assert.equal(personalCompletion.owner, 'personal');
  assert.equal(creatorCompletion.owner, 'creator');
  assert.equal(suggestionCompletion.owner, 'suggestion');
  const personalSchedule = item.scheduleOverrides?.personal;
  const creatorSchedule = item.scheduleOverrides?.creator;
  const suggestionSchedule = item.scheduleOverrides?.suggestion;
  assert.equal(
    personalSchedule?.kind === 'absolute' ? personalSchedule.date : undefined,
    '2026-08-02',
  );
  assert.equal(
    creatorSchedule?.kind === 'absolute' ? creatorSchedule.date : undefined,
    '2026-08-03',
  );
  assert.equal(
    suggestionSchedule?.kind === 'absolute' ? suggestionSchedule.date : undefined,
    '2026-08-04',
  );
  assert.deepEqual(
    item.properties
      .filter((property) => property.key === 'place')
      .map((property) => [property.owner, property.value]),
    [
      ['personal', '제주공항'],
      ['creator', '김포공항'],
      ['suggestion', '인천공항'],
    ],
  );
  assert.deepEqual(
    item.resources
      .filter((resource) => resource.url === 'https://example.com/booking')
      .map((resource) => resource.owner),
    ['personal', 'creator', 'suggestion'],
  );

  assert.equal(item.title, '제안 항공권 확인');
  assert.equal(item.detail, '검토할 수정 제안');
  assert.equal(item.completion?.doneWhen, '제안을 검토한다');
  assert.equal(item.completion?.owner, 'suggestion');
  assert.equal(item.schedule?.kind, 'absolute');
  assert.equal(
    item.schedule?.kind === 'absolute' ? item.schedule.date : undefined,
    '2026-08-04',
  );
  const view = toAuthoringItemView(document, item);
  assert.equal(view.title, '제안 항공권 확인');
  assert.equal(view.detail, '검토할 수정 제안');
  assert.equal(view.completion, '제안을 검토한다');
  assert.equal(view.date, '2026-08-04');
  assert.equal(view.place, '인천공항');
  assert.equal(view.userCorrected, true);
  assert.equal(document.revision.actorLane, 'suggestion');
  assert.equal(validateTextAuthoringDocument(document).valid, true);
});

test('split preserves source lineage and undo restores the exact prior parse result', () => {
  const initial = createTextAuthoringDocument(RAW, {
    fixtureVersion: 'operations-legacy-v1',
    now: NOW,
  });
  const originalParseResult = structuredClone(initial.parseResult);
  const item = initial.parseResult.canonical.items[0];
  const split = applyAuthoringOperation(
    initial,
    { type: 'split', itemId: item.itemId, at: 3 },
    { now: '2026-07-29T00:01:00.000Z' },
  );

  assert.equal(split.parseResult.canonical.items.length, 4);
  assert.deepEqual(
    split.parseResult.canonical.items.slice(0, 2).map((entry) => entry.sourceTitle),
    ['항공권 확인', '항공권 확인'],
  );
  assert.deepEqual(
    split.parseResult.canonical.items[0].sourceRowIds,
    split.parseResult.canonical.items[1].sourceRowIds,
  );
  assert.equal(validateTextAuthoringDocument(split).valid, true);

  const undone = applyAuthoringOperation(
    split,
    { type: 'undo' },
    { now: '2026-07-29T00:02:00.000Z' },
  );
  assert.deepEqual(undone.parseResult.canonical, originalParseResult.canonical);
  assert.deepEqual(undone.parseResult.blocks, originalParseResult.blocks);
  assert.equal(validateTextAuthoringDocument(undone).valid, true);
});

test('merge keeps the first stable Item ID and unions every source lineage', () => {
  const initial = createTextAuthoringDocument(RAW, {
    fixtureVersion: 'operations-legacy-v1',
    now: NOW,
  });
  const [first, second] = initial.parseResult.canonical.items;
  const expectedRows = new Set([...first.sourceRowIds, ...second.sourceRowIds]);
  const merged = applyAuthoringOperation(initial, {
    type: 'merge',
    itemIds: [first.itemId, second.itemId],
  });
  const result = merged.parseResult.canonical.items[0];

  assert.equal(merged.parseResult.canonical.items.length, 2);
  assert.equal(result.itemId, first.itemId);
  assert.equal(result.sourceTitle, first.sourceTitle);
  assert.deepEqual(new Set(result.sourceRowIds), expectedRows);
  assert.ok(
    merged.parseResult.mappings
      .filter((mapping) => mapping.targetDraftId === first.itemId)
      .every((mapping) => mapping.userCorrected),
  );
  assert.equal(validateTextAuthoringDocument(merged).valid, true);
});

test('merge rejects cross-Step A2 and B1 without changing the document or revision', () => {
  const initial = createTextAuthoringDocument([
    '# Plan',
    '## Step A',
    '- [ ] A1',
    '- [ ] A2',
    '- [ ] A3',
    '## Step B',
    '- [ ] B1',
    '- [ ] B2',
  ].join('\n'), { now: NOW });
  const before = structuredClone(initial);
  const [stepA, stepB] = initial.parseResult.canonical.steps;

  assert.equal(validateTextAuthoringDocument(initial).valid, true);
  const rejected = applyAuthoringOperation(initial, {
    type: 'merge',
    itemIds: [stepA.itemIds[1], stepB.itemIds[0]],
  });

  assert.equal(rejected, initial);
  assert.deepEqual(rejected, before);
  assert.deepEqual(rejected.revision, before.revision);
  assert.deepEqual(rejected.revisionHistory, before.revisionHistory);
  assert.equal(validateTextAuthoringDocument(rejected).valid, true);
});

test('merge rejects non-adjacent Items in one Step without changing the revision', () => {
  const initial = createTextAuthoringDocument([
    '# Plan',
    '## Step A',
    '- [ ] A1',
    '- [ ] A2',
    '- [ ] A3',
  ].join('\n'), { now: NOW });
  const before = structuredClone(initial);
  const [step] = initial.parseResult.canonical.steps;

  assert.equal(validateTextAuthoringDocument(initial).valid, true);
  const rejected = applyAuthoringOperation(initial, {
    type: 'merge',
    itemIds: [step.itemIds[0], step.itemIds[2]],
  });

  assert.equal(rejected, initial);
  assert.deepEqual(rejected, before);
  assert.deepEqual(rejected.revision, before.revision);
  assert.deepEqual(rejected.revisionHistory, before.revisionHistory);
  assert.equal(validateTextAuthoringDocument(rejected).valid, true);
});

test('merge rejects a missing Item without changing the document or revision', () => {
  const initial = createTextAuthoringDocument(RAW, {
    fixtureVersion: 'operations-legacy-v1',
    now: NOW,
  });
  const before = structuredClone(initial);
  const [first, second] = initial.parseResult.canonical.items;

  const rejected = applyAuthoringOperation(initial, {
    type: 'merge',
    itemIds: [first.itemId, second.itemId, 'missing-item'],
  });

  assert.equal(rejected, initial);
  assert.deepEqual(rejected, before);
  assert.deepEqual(rejected.revision, before.revision);
  assert.deepEqual(rejected.revisionHistory, before.revisionHistory);
  assert.equal(validateTextAuthoringDocument(rejected).valid, true);
});

test('repeated undo walks back effective correction revisions', () => {
  const initial = createTextAuthoringDocument(RAW, {
    fixtureVersion: 'operations-legacy-v1',
    now: NOW,
  });
  const itemId = initial.parseResult.canonical.items[0].itemId;
  const renamed = applyAuthoringOperation(initial, {
    type: 'rename',
    itemId,
    title: '첫 번째 이름',
  });
  const renamedAgain = applyAuthoringOperation(renamed, {
    type: 'rename',
    itemId,
    title: '두 번째 이름',
  });
  const once = applyAuthoringOperation(renamedAgain, { type: 'undo' });
  const twice = applyAuthoringOperation(once, { type: 'undo' });

  assert.equal(once.parseResult.canonical.items[0].title, '첫 번째 이름');
  assert.equal(twice.parseResult.canonical.items[0].title, '항공권 확인');
});

test('align_source_order moves complete Item blocks inside each Step and undo restores raw source', () => {
  const raw = [
    '# 역순 일정',
    '## 첫 단계',
    '- [ ] 늦은 일',
    '  - 설명: 늦은 일 설명',
    '  - 날짜: 2026-08-10',
    '- [ ] 이른 일',
    '  - 설명: 이른 일 설명',
    '  - 날짜: 2026-08-03',
    '## 둘째 단계',
    '- [ ] 둘째 단계 늦은 일',
    '  - 날짜: 2026-08-20',
    '- [ ] 둘째 단계 이른 일',
    '  - 날짜: 2026-08-12',
  ].join('\n');
  const initial = createTextAuthoringDocument(raw, { now: NOW });
  assert.equal(initial.sourceState?.active.rawText, raw);
  const initialIds = initial.parseResult.canonical.items.map((item) => item.itemId);
  const initialLineage = new Map(initial.parseResult.canonical.items.map((item) => (
    [item.itemId, [...item.sourceRowIds]]
  )));
  const byTitle = new Map(initial.parseResult.canonical.items.map((item) => (
    [item.title, item.itemId]
  )));

  const aligned = applyAuthoringOperation(initial, {
    type: 'align_source_order',
    orderedItemIds: [
      byTitle.get('이른 일') as string,
      byTitle.get('늦은 일') as string,
      byTitle.get('둘째 단계 이른 일') as string,
      byTitle.get('둘째 단계 늦은 일') as string,
    ],
  });

  assert.ok(aligned.rawText.indexOf('- [ ] 이른 일') < aligned.rawText.indexOf('- [ ] 늦은 일'));
  assert.ok(
    aligned.rawText.indexOf('  - 설명: 이른 일 설명')
      < aligned.rawText.indexOf('- [ ] 늦은 일'),
  );
  assert.ok(
    aligned.rawText.indexOf('## 둘째 단계')
      < aligned.rawText.indexOf('- [ ] 둘째 단계 이른 일'),
  );
  assert.deepEqual(
    new Set(aligned.parseResult.canonical.items.map((item) => item.itemId)),
    new Set(initialIds),
  );
  aligned.parseResult.canonical.items.forEach((item) => {
    assert.deepEqual(item.sourceRowIds, initialLineage.get(item.itemId));
  });
  assert.equal(aligned.revision.operations[0].type, 'align_source_order');
  assert.equal(aligned.sourceState?.active.rawText, raw);
  assert.equal(validateTextAuthoringDocument(aligned).valid, true);
  const reparsed = createTextAuthoringDocument(aligned.rawText, {
    documentId: aligned.documentId,
    now: '2026-07-29T00:03:00.000Z',
  });
  assert.deepEqual(
    reparsed.parseResult.canonical.items.map((item) => ({
      title: item.title,
      schedule: item.schedule,
      detail: item.detail,
    })),
    aligned.parseResult.canonical.items.map((item) => ({
      title: item.title,
      schedule: item.schedule,
      detail: item.detail,
    })),
  );

  const undone = applyAuthoringOperation(aligned, { type: 'undo' });
  assert.equal(undone.rawText, raw);
  assert.deepEqual(undone.parseResult.canonical, initial.parseResult.canonical);
  assert.deepEqual(undone.parseResult.blocks, initial.parseResult.blocks);
  assert.deepEqual(undone.parseResult.mappings, initial.parseResult.mappings);
  assert.deepEqual(undone.parseResult.issues, initial.parseResult.issues);
  assert.equal(undone.sourceState?.active.rawText, raw);
  assert.equal(validateTextAuthoringDocument(undone).valid, true);
});

test('merge fails closed when completion, schedule, checkbox, or property values conflict', () => {
  const cases = [
    {
      label: 'completion',
      properties: ['  - 완료 기준: 첫 완료', '  - 완료 기준: 둘 완료'],
    },
    {
      label: 'schedule',
      properties: ['  - 날짜: 2026-08-01', '  - 날짜: 2026-08-02'],
    },
    {
      label: 'property',
      properties: ['  - 장소: 서울', '  - 장소: 부산'],
    },
  ];

  cases.forEach(({ label, properties }) => {
    const document = createTextAuthoringDocument([
      `# ${label}`,
      '## 실행',
      '- [ ] 첫째',
      properties[0],
      '- [ ] 둘째',
      properties[1],
    ].join('\n'), { now: NOW });
    const before = structuredClone(document);
    const rejected = applyAuthoringOperation(document, {
      type: 'merge',
      itemIds: document.parseResult.canonical.items.map((item) => item.itemId),
    });

    assert.equal(rejected, document, label);
    assert.deepEqual(rejected, before, label);
  });

  const checked = createTextAuthoringDocument([
    '# checkbox',
    '## 실행',
    '- [x] 첫째',
    '- [ ] 둘째',
  ].join('\n'), { now: NOW });
  const checkedBefore = structuredClone(checked);
  const checkedRejected = applyAuthoringOperation(checked, {
    type: 'merge',
    itemIds: checked.parseResult.canonical.items.map((item) => item.itemId),
  });
  assert.equal(checkedRejected, checked);
  assert.deepEqual(checkedRejected, checkedBefore);
});

test('merge adopts a single non-conflicting completion and schedule without losing lineage', () => {
  const document = createTextAuthoringDocument([
    '# 병합',
    '## 실행',
    '- [ ] 첫째',
    '- [ ] 둘째',
    '  - 완료 기준: 둘을 확인함',
    '  - 날짜: 2026-08-02',
    '  - 장소: 부산',
  ].join('\n'), { now: NOW });
  const second = document.parseResult.canonical.items[1];
  const merged = applyAuthoringOperation(document, {
    type: 'merge',
    itemIds: document.parseResult.canonical.items.map((item) => item.itemId),
  });
  const item = merged.parseResult.canonical.items[0];

  assert.equal(item.completion?.doneWhen, '둘을 확인함');
  assert.equal(
    item.schedule?.kind === 'absolute' ? item.schedule.date : undefined,
    '2026-08-02',
  );
  assert.ok(
    second.completion?.sourceRowIds.every((sourceRowId) => (
      item.completion?.sourceRowIds.includes(sourceRowId)
    )),
  );
  assert.equal(validateTextAuthoringDocument(merged).valid, true);
});

test('align_source_order fails closed after split duplicates one source Item block', () => {
  const document = createTextAuthoringDocument([
    '# 분리 후 정렬',
    '## 실행',
    '- [ ] 늦은 일과 이른 일',
    '  - 날짜: 2026-08-10',
    '- [ ] 중간 일',
    '  - 날짜: 2026-08-05',
  ].join('\n'), { now: NOW });
  const firstId = document.parseResult.canonical.items[0].itemId;
  const split = applyAuthoringOperation(document, {
    type: 'split',
    itemId: firstId,
    at: 5,
  });
  const before = structuredClone(split);
  const rejected = applyAuthoringOperation(split, {
    type: 'align_source_order',
    orderedItemIds: split.parseResult.canonical.items
      .map((item) => item.itemId)
      .reverse(),
  });

  assert.equal(rejected, split);
  assert.deepEqual(rejected, before);
  assert.equal(validateTextAuthoringDocument(rejected).valid, true);
});
