import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildArtifactPreflight,
  buildAuthoringArtifactProjection,
} from './artifact-projection';
import { applyAuthoringOperation } from './operations';
import { createTextAuthoringDocument } from './parser';
import { createExportReceipt, createSaveReceipt } from './receipt';
import { evaluateAuthoringWritePolicy } from './review-policy';
import {
  createAuthoringSourceUpdateCandidate,
} from './source-update';
import {
  createMemoryTextAuthoringStorage,
  createTextAuthoringDraftRepository,
} from './storage';
import type {
  AuthoringSourceItemMatch,
  TextAuthoringDocument,
} from './types';
import { validateTextAuthoringDocument } from './validation';

const NOW = '2026-07-29T01:00:00.000Z';

function incomingCandidate(
  active: TextAuthoringDocument,
  rawText: string,
  matches: AuthoringSourceItemMatch[] = [],
) {
  const incoming = createTextAuthoringDocument(rawText, {
    documentId: active.documentId,
    ownership: active.ownership,
    sourceTitle: active.sourceTitle,
    sourceUrl: active.sourceUrl,
    now: '2026-07-29T01:10:00.000Z',
  });
  return createAuthoringSourceUpdateCandidate(incoming, {
    matches,
    capturedAt: '2026-07-29T01:10:00.000Z',
  });
}

test('same source fingerprint is a no-op and staging never changes active content', () => {
  const raw = ['# Source update', '- [ ] Keep', '  detail: old'].join('\n');
  const initial = createTextAuthoringDocument(raw, {
    documentId: 'source-no-op',
    now: NOW,
  });
  const same = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: incomingCandidate(initial, raw),
  });
  assert.equal(same, initial);

  const staged = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: incomingCandidate(
      initial,
      ['# Source update', '- [ ] Keep', '  detail: incoming'].join('\n'),
    ),
  }, {
    now: '2026-07-29T01:11:00.000Z',
  });
  assert.equal(staged.rawText, raw);
  assert.equal(staged.parseResult.canonical.items[0].sourceDetail, 'old');
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  assert.equal(staged.sourceState.status, 'source_updated');
  assert.equal(
    staged.sourceState.active.contentFingerprint,
    initial.sourceState?.active.contentFingerprint,
  );
  assert.notEqual(
    staged.sourceState.incoming.snapshot.contentFingerprint,
    initial.sourceState?.active.contentFingerprint,
  );
});

test('changed source keeps old, incoming, and lane value until keep/use is explicit', () => {
  const oldRaw = ['# Source update', '- [ ] Keep', '  detail: old'].join('\n');
  const incomingRaw = [
    '# Source update',
    '- [ ] Keep',
    '  detail: incoming',
  ].join('\n');
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-conflict',
    ownership: 'creator',
    now: NOW,
  });
  const corrected = applyAuthoringOperation(initial, {
    type: 'set_property',
    itemId: initial.parseResult.canonical.items[0].itemId,
    key: 'detail',
    value: 'creator detail',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:01:00.000Z',
  });
  const staged = applyAuthoringOperation(corrected, {
    type: 'stage_source_update',
    candidate: incomingCandidate(corrected, incomingRaw),
  }, {
    now: '2026-07-29T01:11:00.000Z',
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  assert.equal(staged.sourceState.status, 'conflict_source_vs_user');
  const detailChange = staged.sourceState.changes.find(
    (change) => change.kind === 'changed' && change.field === 'detail',
  );
  assert.ok(detailChange?.kind === 'changed');
  assert.equal(detailChange.oldSourceValue, 'old');
  assert.equal(detailChange.incomingSourceValue, 'incoming');
  assert.equal(detailChange.userValue, 'creator detail');
  assert.equal(
    evaluateAuthoringWritePolicy(staged, 'export_file').allowed,
    false,
  );

  const keepResolved = applyAuthoringOperation(staged, {
    type: 'resolve_source_conflict',
    changeId: detailChange.changeId,
    resolution: 'keep_user',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:12:00.000Z',
  });
  const kept = applyAuthoringOperation(keepResolved, {
    type: 'apply_source_update',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:13:00.000Z',
  });
  assert.equal(kept.rawText, incomingRaw);
  assert.equal(kept.parseResult.canonical.items[0].sourceDetail, 'incoming');
  assert.equal(kept.parseResult.canonical.items[0].detail, 'creator detail');
  assert.equal(kept.sourceState?.status, 'current');
  assert.equal(validateTextAuthoringDocument(kept).valid, true);

  const useResolved = applyAuthoringOperation(staged, {
    type: 'resolve_source_conflict',
    changeId: detailChange.changeId,
    resolution: 'use_incoming',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:14:00.000Z',
  });
  const used = applyAuthoringOperation(useResolved, {
    type: 'apply_source_update',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:15:00.000Z',
  });
  assert.equal(used.parseResult.canonical.items[0].detail, 'incoming');
  assert.equal(
    used.parseResult.canonical.items[0].detailOverrides?.creator,
    undefined,
  );
  assert.equal(validateTextAuthoringDocument(used).valid, true);
});

test('a stable matched Item transfers every lane override and resolves in the active lane', () => {
  const oldRaw = ['# Lanes', '- [ ] Keep', '  detail: old'].join('\n');
  const nextRaw = ['# Lanes', '- [ ] Keep', '  detail: incoming'].join('\n');
  let document = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-lanes',
    ownership: 'personal',
    now: NOW,
  });
  const itemId = document.parseResult.canonical.items[0].itemId;
  for (const [actorLane, value] of [
    ['personal', 'personal detail'],
    ['creator', 'creator detail'],
    ['suggestion', 'suggestion detail'],
  ] as const) {
    document = applyAuthoringOperation(document, {
      type: 'set_property',
      itemId,
      key: 'detail',
      value,
    }, {
      actorLane,
      now: `2026-07-29T01:0${document.revisionHistory.length}:00.000Z`,
    });
  }
  const staged = applyAuthoringOperation(document, {
    type: 'stage_source_update',
    candidate: incomingCandidate(document, nextRaw),
  });
  assert.notEqual(staged.sourceState?.status, 'current');
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  const change = staged.sourceState.changes.find(
    (entry) => entry.kind === 'changed' && entry.field === 'detail',
  );
  assert.ok(change?.kind === 'changed');
  assert.equal(change.userOwner, 'personal');
  assert.equal(change.userValue, 'personal detail');
  const resolved = applyAuthoringOperation(staged, {
    type: 'resolve_source_conflict',
    changeId: change.changeId,
    resolution: 'keep_user',
  }, {
    actorLane: 'personal',
  });
  const applied = applyAuthoringOperation(resolved, {
    type: 'apply_source_update',
  }, {
    actorLane: 'personal',
  });
  const item = applied.parseResult.canonical.items[0];
  assert.deepEqual(item.detailOverrides, {
    personal: 'personal detail',
    creator: 'creator detail',
    suggestion: 'suggestion detail',
  });
  assert.equal(item.detail, 'personal detail');
});

test('support-only caution and URL changes stay as explicit old/incoming diffs', () => {
  const oldRaw = [
    '# Support changes',
    '- [ ] Verify',
    '  resource: Guide | https://example.com/old',
    '  source: Official | https://example.org/old',
    '  guide: Read old note',
    '  caution: Avoid old risk',
  ].join('\n');
  const nextRaw = [
    '# Support changes',
    '- [ ] Verify',
    '  resource: Guide | https://example.com/new',
    '  source: Official | https://example.org/new',
    '  guide: Read new note',
    '  caution: Avoid new risk',
  ].join('\n');
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-support-diff',
    now: NOW,
  });
  const staged = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: incomingCandidate(initial, nextRaw),
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  const changed = staged.sourceState.changes.filter(
    (change) => change.kind === 'changed',
  );
  assert.deepEqual(
    changed.map((change) => change.field).sort(),
    ['cautions', 'guides', 'resources', 'sources'],
  );
  changed.forEach((change) => {
    assert.notDeepEqual(change.oldSourceValue, change.incomingSourceValue);
    assert.equal(change.userValue, undefined);
    assert.equal(change.state, 'open');
  });
  assert.equal(
    evaluateAuthoringWritePolicy(staged, 'export_file').allowed,
    false,
  );
  assert.throws(
    () => applyAuthoringOperation(staged, { type: 'apply_source_update' }),
    /explicit decision/u,
  );

  let resolved = staged;
  changed.forEach((change, index) => {
    resolved = applyAuthoringOperation(resolved, {
      type: 'resolve_source_conflict',
      changeId: change.changeId,
      resolution: 'use_incoming',
    }, {
      now: `2026-07-29T01:${20 + index}:00.000Z`,
    });
  });
  const applied = applyAuthoringOperation(resolved, {
    type: 'apply_source_update',
  });
  const item = applied.parseResult.canonical.items[0];
  assert.equal(item.resources[0]?.url, 'https://example.com/new');
  assert.equal(item.sources[0]?.url, 'https://example.org/new');
  assert.deepEqual(item.guides, ['Read new note']);
  assert.deepEqual(item.cautions, ['Avoid new risk']);
  assert.equal(validateTextAuthoringDocument(applied).valid, true);
});

test('source apply preserves explicitly kept role, exclusion, nesting, order, and Step item order', () => {
  const oldRaw = [
    '# Structural state',
    '## Stage',
    '- [ ] Alpha',
    '  date: 2026-08-01',
    '  caution: old caution',
    '- [ ] Beta',
  ].join('\n');
  const nextRaw = [
    '# Structural state',
    '## Stage',
    '- [ ] Alpha',
    '  date: 2026-08-02',
    '  caution: new caution',
    '- [ ] Beta',
  ].join('\n');
  let corrected = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-structural-state',
    ownership: 'creator',
    now: NOW,
  });
  const alphaId = corrected.parseResult.canonical.items[0].itemId;
  for (const operation of [
    { type: 'change_role', itemId: alphaId, role: 'caution' },
    { type: 'exclude', itemId: alphaId },
    { type: 'indent', itemId: alphaId },
    { type: 'reorder', itemId: alphaId, toIndex: 1 },
  ] as const) {
    corrected = applyAuthoringOperation(corrected, operation, {
      actorLane: 'creator',
    });
  }
  const staged = applyAuthoringOperation(corrected, {
    type: 'stage_source_update',
    candidate: incomingCandidate(corrected, nextRaw),
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  assert.equal(staged.sourceState.status, 'conflict_source_vs_user');
  const changes = staged.sourceState.changes.filter(
    (change) => change.kind === 'changed',
  );
  const byField = new Map(changes.map((change) => [change.field, change]));
  assert.deepEqual(
    ['role', 'included', 'nesting', 'order'].map(
      (field) => byField.get(field as typeof changes[number]['field'])?.userValue,
    ),
    ['caution', false, 1, 1],
  );
  assert.deepEqual(
    [
      byField.get('role')?.oldSourceValue,
      byField.get('role')?.incomingSourceValue,
      byField.get('order')?.oldSourceValue,
      byField.get('order')?.incomingSourceValue,
    ],
    ['item', 'item', 0, 0],
  );
  assert.equal(
    evaluateAuthoringWritePolicy(staged, 'export_file').allowed,
    false,
  );
  assert.throws(
    () => applyAuthoringOperation(staged, { type: 'apply_source_update' }),
    /explicit decision/u,
  );

  let keepResolved = staged;
  changes.forEach((change) => {
    const keepStructural = [
      'role',
      'included',
      'nesting',
      'order',
      'step_mapping',
    ].includes(change.field);
    keepResolved = applyAuthoringOperation(keepResolved, {
      type: 'resolve_source_conflict',
      changeId: change.changeId,
      resolution: keepStructural ? 'keep_user' : 'use_incoming',
    }, {
      actorLane: 'creator',
    });
  });
  const kept = applyAuthoringOperation(keepResolved, {
    type: 'apply_source_update',
  }, {
    actorLane: 'creator',
  });
  const keptAlpha = kept.parseResult.canonical.items.find(
    (item) => item.sourceTitle === 'Alpha',
  )!;
  assert.equal(keptAlpha.role, 'caution');
  assert.equal(keptAlpha.included, false);
  assert.equal(keptAlpha.nestingLevel, 1);
  assert.equal(keptAlpha.order, 1);
  assert.equal(keptAlpha.schedule?.kind, 'absolute');
  assert.equal(
    keptAlpha.schedule?.kind === 'absolute'
      ? keptAlpha.schedule.date
      : undefined,
    '2026-08-02',
  );
  assert.deepEqual(keptAlpha.cautions, ['new caution']);
  assert.deepEqual(
    kept.parseResult.canonical.items.map((item) => item.sourceTitle),
    ['Beta', 'Alpha'],
  );
  assert.deepEqual(
    kept.parseResult.canonical.steps[0].itemIds,
    kept.parseResult.canonical.items.map((item) => item.itemId),
  );
  assert.equal(
    kept.parseResult.mappings.some((mapping) => (
      mapping.targetDraftId === keptAlpha.itemId
      && mapping.userCorrected
    )),
    true,
  );
  assert.equal(validateTextAuthoringDocument(kept).valid, true);

  let incomingResolved = staged;
  changes.forEach((change) => {
    incomingResolved = applyAuthoringOperation(incomingResolved, {
      type: 'resolve_source_conflict',
      changeId: change.changeId,
      resolution: 'use_incoming',
    }, {
      actorLane: 'creator',
    });
  });
  const used = applyAuthoringOperation(incomingResolved, {
    type: 'apply_source_update',
  }, {
    actorLane: 'creator',
  });
  const usedAlpha = used.parseResult.canonical.items.find(
    (item) => item.sourceTitle === 'Alpha',
  )!;
  assert.equal(usedAlpha.role, 'item');
  assert.equal(usedAlpha.included, true);
  assert.equal(usedAlpha.nestingLevel, 0);
  assert.equal(usedAlpha.order, 0);
  assert.deepEqual(
    used.parseResult.canonical.items.map((item) => item.sourceTitle),
    ['Alpha', 'Beta'],
  );
  assert.deepEqual(
    used.parseResult.canonical.steps[0].itemIds,
    used.parseResult.canonical.items.map((item) => item.itemId),
  );
  assert.equal(validateTextAuthoringDocument(used).valid, true);
});

test('Step mapping keeps the user placement or returns to the incoming source placement', () => {
  const oldRaw = [
    '# Step mapping',
    '## First',
    '- [ ] Alpha',
    '  date: 2026-08-01',
    '## Second',
    '- [ ] Beta',
  ].join('\n');
  const nextRaw = [
    '# Step mapping',
    '## First',
    '- [ ] Alpha',
    '  date: 2026-08-02',
    '## Second',
    '- [ ] Beta',
  ].join('\n');
  const corrected = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-step-mapping',
    ownership: 'creator',
    now: NOW,
  });
  const alpha = corrected.parseResult.canonical.items[0];
  const [firstStep, secondStep] = corrected.parseResult.canonical.steps;
  firstStep.itemIds = firstStep.itemIds.filter(
    (itemId) => itemId !== alpha.itemId,
  );
  secondStep.itemIds.unshift(alpha.itemId);
  alpha.stepId = secondStep.stepId;
  corrected.parseResult.mappings.forEach((mapping) => {
    if (mapping.targetDraftId === alpha.itemId) mapping.userCorrected = true;
  });

  const staged = applyAuthoringOperation(corrected, {
    type: 'stage_source_update',
    candidate: incomingCandidate(corrected, nextRaw),
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  const stepChange = staged.sourceState.changes.find(
    (change) => change.kind === 'changed' && change.field === 'step_mapping',
  );
  assert.ok(stepChange?.kind === 'changed');
  assert.deepEqual(stepChange.oldSourceValue, {
    stepId: firstStep.stepId,
    title: 'First',
    order: 0,
  });
  assert.deepEqual(stepChange.incomingSourceValue, stepChange.oldSourceValue);
  assert.deepEqual(stepChange.userValue, {
    stepId: secondStep.stepId,
    title: 'Second',
    order: 1,
  });

  let keptResolved = staged;
  staged.sourceState.changes.forEach((change) => {
    keptResolved = applyAuthoringOperation(keptResolved, {
      type: 'resolve_source_conflict',
      changeId: change.changeId,
      resolution: change === stepChange ? 'keep_user' : 'use_incoming',
    }, {
      actorLane: 'creator',
    });
  });
  const kept = applyAuthoringOperation(keptResolved, {
    type: 'apply_source_update',
  }, {
    actorLane: 'creator',
  });
  const keptAlpha = kept.parseResult.canonical.items.find(
    (item) => item.sourceTitle === 'Alpha',
  )!;
  const keptSecond = kept.parseResult.canonical.steps.find(
    (step) => step.title === 'Second',
  )!;
  assert.equal(keptAlpha.stepId, keptSecond.stepId);
  assert.equal(keptSecond.itemIds.includes(keptAlpha.itemId), true);
  assert.equal(validateTextAuthoringDocument(kept).valid, true);

  let incomingResolved = staged;
  staged.sourceState.changes.forEach((change) => {
    incomingResolved = applyAuthoringOperation(incomingResolved, {
      type: 'resolve_source_conflict',
      changeId: change.changeId,
      resolution: 'use_incoming',
    }, {
      actorLane: 'creator',
    });
  });
  const used = applyAuthoringOperation(incomingResolved, {
    type: 'apply_source_update',
  }, {
    actorLane: 'creator',
  });
  const usedAlpha = used.parseResult.canonical.items.find(
    (item) => item.sourceTitle === 'Alpha',
  )!;
  const usedFirst = used.parseResult.canonical.steps.find(
    (step) => step.title === 'First',
  )!;
  assert.equal(usedAlpha.stepId, usedFirst.stepId);
  assert.equal(usedFirst.itemIds.includes(usedAlpha.itemId), true);
  assert.equal(validateTextAuthoringDocument(used).valid, true);
});

test('unmatched additions and removals stay pending and keep_previous creates a tombstone', () => {
  const oldRaw = [
    '# Source rows',
    '- [ ] Keep',
    '- [ ] Remove',
  ].join('\n');
  const nextRaw = [
    '# Source rows',
    '- [ ] Keep',
    '- [ ] Add',
  ].join('\n');
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-added-removed',
    ownership: 'creator',
    now: NOW,
  });
  const removedId = initial.parseResult.canonical.items[1].itemId;
  const corrected = applyAuthoringOperation(initial, {
    type: 'rename',
    itemId: removedId,
    title: 'Creator kept copy',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:01:00.000Z',
  });
  const staged = applyAuthoringOperation(corrected, {
    type: 'stage_source_update',
    candidate: incomingCandidate(corrected, nextRaw),
  }, {
    now: '2026-07-29T01:11:00.000Z',
  });
  assert.notEqual(staged.sourceState?.status, 'current');
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  assert.equal(staged.sourceState.incoming.matches.length, 1);
  const added = staged.sourceState.changes.find(
    (change) => change.kind === 'added',
  );
  const removed = staged.sourceState.changes.find(
    (change) => change.kind === 'removed',
  );
  assert.ok(added?.kind === 'added');
  assert.ok(removed?.kind === 'removed');
  assert.equal(removed.hasOwnedState, true);
  assert.equal(staged.sourceState.status, 'conflict_source_vs_user');
  assert.throws(
    () => applyAuthoringOperation(staged, { type: 'apply_source_update' }),
    /explicit decision/u,
  );

  let resolved = applyAuthoringOperation(staged, {
    type: 'resolve_source_conflict',
    changeId: added.changeId,
    resolution: 'exclude_added',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:12:00.000Z',
  });
  resolved = applyAuthoringOperation(resolved, {
    type: 'resolve_source_conflict',
    changeId: removed.changeId,
    resolution: 'keep_previous',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:13:00.000Z',
  });
  assert.equal(
    evaluateAuthoringWritePolicy(resolved, 'export_file').allowed,
    false,
  );
  const applied = applyAuthoringOperation(resolved, {
    type: 'apply_source_update',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T01:14:00.000Z',
  });
  const addedItem = applied.parseResult.canonical.items.find(
    (item) => item.sourceTitle === 'Add',
  );
  const previousItem = applied.parseResult.canonical.items.find(
    (item) => item.itemId === removedId,
  );
  assert.equal(addedItem?.included, false);
  assert.equal(previousItem?.included, false);
  assert.equal(previousItem?.sourceDisposition, 'previous_source');
  assert.equal(previousItem?.title, 'Creator kept copy');
  assert.equal(previousItem?.titleOverrides?.creator, 'Creator kept copy');
  assert.ok(previousItem?.sourceRowIds.some((sourceRowId) => (
    applied.parseResult.canonical.sourceRows.some((row) => (
      row.sourceRowId === sourceRowId
      && row.state === 'tombstone'
      && row.sourceSnapshotId === initial.sourceState?.active.snapshotId
    ))
  )));
  assert.equal(validateTextAuthoringDocument(applied).valid, true);
});

test('staged decisions survive storage, reject/undo restores staged state, and receipt records evidence', () => {
  const oldRaw = ['# Source update', '- [ ] Keep', '  detail: old'].join('\n');
  const incomingRaw = [
    '# Source update',
    '- [ ] Keep',
    '  detail: incoming',
  ].join('\n');
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-storage',
    now: NOW,
  });
  const staged = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: incomingCandidate(initial, incomingRaw),
  }, {
    now: '2026-07-29T01:11:00.000Z',
  });
  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    { now: () => '2026-07-29T01:12:00.000Z' },
  );
  const saved = repository.save(staged);
  assert.equal(saved.status, 'needs_review');
  const loaded = repository.load(staged.documentId)!.document;
  assert.deepEqual(loaded.sourceState, staged.sourceState);

  const projection = buildAuthoringArtifactProjection(loaded);
  const preflight = buildArtifactPreflight(projection, {
    artifact: projection.primaryArtifact,
  });
  const saveReceipt = createSaveReceipt(loaded, projection);
  assert.equal(saveReceipt.sourceState.status, 'source_updated');
  assert.ok(saveReceipt.sourceState.openChangeCount > 0);
  assert.throws(
    () => createExportReceipt(preflight, {
      format: preflight.formats[0],
      document: loaded,
    }),
    /source_update_pending/u,
  );

  const rejected = applyAuthoringOperation(loaded, {
    type: 'reject_source_update',
  }, {
    now: '2026-07-29T01:13:00.000Z',
  });
  assert.equal(rejected.sourceState?.status, 'current');
  assert.equal(rejected.rawText, oldRaw);
  const undone = applyAuthoringOperation(rejected, { type: 'undo' }, {
    now: '2026-07-29T01:14:00.000Z',
  });
  assert.equal(undone.sourceState?.status, 'source_updated');
  assert.equal(undone.rawText, oldRaw);
  assert.equal(validateTextAuthoringDocument(undone).valid, true);
});

test('title similarity never auto-matches; only caller-provided identity creates a changed value', () => {
  const oldRaw = ['# Match', '- [ ] Prepare report'].join('\n');
  const nextRaw = ['# Match', '- [ ] Prepare final report'].join('\n');
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-explicit-match',
    now: NOW,
  });
  const nextDocument = createTextAuthoringDocument(nextRaw, {
    documentId: initial.documentId,
    now: '2026-07-29T01:10:00.000Z',
  });
  const withoutMatch = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: createAuthoringSourceUpdateCandidate(nextDocument),
  });
  assert.notEqual(withoutMatch.sourceState?.status, 'current');
  if (!withoutMatch.sourceState || withoutMatch.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  assert.deepEqual(
    withoutMatch.sourceState.changes.map((change) => change.kind).sort(),
    ['added', 'removed'],
  );

  const oldItemId = initial.parseResult.canonical.items[0].itemId;
  const nextItemId = nextDocument.parseResult.canonical.items[0].itemId;
  const withMatch = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: createAuthoringSourceUpdateCandidate(nextDocument, {
      matches: [{
        activeItemId: oldItemId,
        incomingItemId: nextItemId,
        basis: 'explicit',
      }],
    }),
  });
  assert.notEqual(withMatch.sourceState?.status, 'current');
  if (!withMatch.sourceState || withMatch.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  assert.deepEqual(
    withMatch.sourceState.changes.map((change) => change.kind),
    ['changed'],
  );
  const change = withMatch.sourceState.changes[0];
  assert.ok(change.kind === 'changed');
  assert.equal(change.field, 'title');
  assert.equal(change.oldSourceValue, 'Prepare report');
  assert.equal(change.incomingSourceValue, 'Prepare final report');
});

test('an explicitly matched source checkbox change is reviewed and applied as source state only', () => {
  const oldRaw = ['# Checkbox update', '- [ ] Keep'].join('\n');
  const nextRaw = ['# Checkbox update', '- [x] Keep'].join('\n');
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-checkbox-update',
    now: NOW,
  });
  const candidate = incomingCandidate(initial, nextRaw);
  candidate.matches = [{
    activeItemId: initial.parseResult.canonical.items[0].itemId,
    incomingItemId: candidate.parseResult.canonical.items[0].itemId,
    basis: 'explicit',
  }];

  const staged = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate,
  }, {
    now: '2026-07-29T01:11:00.000Z',
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged checkbox source update');
  }
  assert.deepEqual(
    staged.sourceState.changes.map((change) => change.kind),
    ['changed'],
  );
  const change = staged.sourceState.changes[0];
  assert.ok(change.kind === 'changed');
  assert.equal(change.field, 'source_checked');
  assert.equal(change.oldSourceValue, false);
  assert.equal(change.incomingSourceValue, true);
  assert.equal(change.userValue, undefined);

  const resolved = applyAuthoringOperation(staged, {
    type: 'resolve_source_conflict',
    changeId: change.changeId,
    resolution: 'use_incoming',
  }, {
    now: '2026-07-29T01:12:00.000Z',
  });
  const applied = applyAuthoringOperation(resolved, {
    type: 'apply_source_update',
  }, {
    now: '2026-07-29T01:13:00.000Z',
  });

  assert.equal(applied.rawText, nextRaw);
  assert.equal(applied.parseResult.canonical.items[0].sourceChecked, true);
  assert.equal(applied.sourceState?.status, 'current');
  assert.equal(applied.sourceState?.active.rawText, nextRaw);
  assert.equal(validateTextAuthoringDocument(applied).valid, true);
});

test('place, condition, and arbitrary table properties fail closed instead of applying silently', () => {
  const cases = [
    {
      label: 'place',
      oldRaw: ['# Properties', '- [ ] Keep', '  place: Seoul'].join('\n'),
      nextRaw: ['# Properties', '- [ ] Keep', '  place: Busan'].join('\n'),
    },
    {
      label: 'condition',
      oldRaw: ['# Properties', '- [ ] Keep', '  condition: Before lunch'].join('\n'),
      nextRaw: ['# Properties', '- [ ] Keep', '  condition: After lunch'].join('\n'),
    },
    {
      label: 'arbitrary table column',
      oldRaw: [
        '# Properties',
        '| task | priority |',
        '| --- | --- |',
        '| Keep | low |',
      ].join('\n'),
      nextRaw: [
        '# Properties',
        '| task | priority |',
        '| --- | --- |',
        '| Keep | high |',
      ].join('\n'),
    },
  ];

  cases.forEach(({ label, oldRaw, nextRaw }, index) => {
    const initial = createTextAuthoringDocument(oldRaw, {
      documentId: `source-property-${index}`,
      now: NOW,
    });
    const candidate = incomingCandidate(initial, nextRaw);
    candidate.matches = [{
      activeItemId: initial.parseResult.canonical.items[0].itemId,
      incomingItemId: candidate.parseResult.canonical.items[0].itemId,
      basis: initial.parseResult.canonical.items[0].itemId
        === candidate.parseResult.canonical.items[0].itemId
        ? 'stable_entity_id'
        : 'explicit',
    }];
    assert.throws(
      () => applyAuthoringOperation(initial, {
        type: 'stage_source_update',
        candidate,
      }),
      /unsupported semantic changes: item:/u,
      label,
    );
    assert.equal(initial.sourceState?.status, 'current', label);
  });

  const legacy = createTextAuthoringDocument(cases[0].oldRaw, {
    documentId: 'source-property-legacy',
    now: NOW,
  });
  const legacyCandidate = incomingCandidate(legacy, cases[0].nextRaw);
  legacyCandidate.matches = [];
  if (!legacy.sourceState) throw new Error('Expected active source state');
  legacy.sourceState = {
    status: 'source_updated',
    active: legacy.sourceState.active,
    incoming: legacyCandidate,
    changes: [],
    stagedAt: '2026-07-29T01:11:00.000Z',
  };
  assert.throws(
    () => applyAuthoringOperation(legacy, { type: 'apply_source_update' }),
    /unsupported semantic changes: item:/u,
  );
  assert.equal(
    legacy.parseResult.canonical.items[0].properties.find(
      (property) => property.key === 'place',
    )?.value,
    'Seoul',
  );
});

test('legacy apply rejects a missing supported source diff instead of replacing active content', () => {
  const oldRaw = ['# Legacy diff', '- [ ] Keep', '  detail: Old detail'].join('\n');
  const nextRaw = ['# Legacy diff', '- [ ] Keep', '  detail: New detail'].join('\n');
  const legacy = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-supported-diff-legacy',
    now: NOW,
  });
  const legacyCandidate = incomingCandidate(legacy, nextRaw);
  legacyCandidate.matches = [];
  if (!legacy.sourceState) throw new Error('Expected active source state');
  legacy.sourceState = {
    status: 'source_updated',
    active: legacy.sourceState.active,
    incoming: legacyCandidate,
    changes: [],
    stagedAt: '2026-07-29T01:12:00.000Z',
  };
  const revisionId = legacy.revision.revisionId;
  const revisionCount = legacy.revisionHistory.length;

  assert.throws(
    () => applyAuthoringOperation(legacy, { type: 'apply_source_update' }),
    /source update diff is incomplete or inconsistent/u,
  );
  assert.equal(legacy.rawText, oldRaw);
  assert.equal(
    legacy.parseResult.canonical.items[0].detail,
    'Old detail',
  );
  assert.equal(legacy.revision.revisionId, revisionId);
  assert.equal(legacy.revisionHistory.length, revisionCount);
});

test('apply rejects inconsistent resolved decisions and preserves the active document and revision', () => {
  const oldRaw = ['# Decision integrity', '- [ ] Keep', '  detail: Old'].join('\n');
  const nextRaw = ['# Decision integrity', '- [ ] Keep', '  detail: New'].join('\n');
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-decision-integrity',
    now: NOW,
  });
  const staged = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: incomingCandidate(initial, nextRaw),
  }, {
    actorLane: 'system',
    now: '2026-07-29T01:12:00.000Z',
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }

  const cases: Array<{
    label: string;
    mutate: (change: Record<string, unknown>) => void;
  }> = [
    {
      label: 'missing resolution',
      mutate(change) {
        change.state = 'resolved';
        change.actorLane = 'personal';
        change.decidedAt = '2026-07-29T01:13:00.000Z';
        delete change.resolution;
      },
    },
    {
      label: 'missing actor metadata',
      mutate(change) {
        change.state = 'resolved';
        change.resolution = 'use_incoming';
        change.decidedAt = '2026-07-29T01:13:00.000Z';
        delete change.actorLane;
      },
    },
    {
      label: 'resolution does not apply to the change kind',
      mutate(change) {
        change.state = 'resolved';
        change.resolution = 'include_added';
        change.actorLane = 'personal';
        change.decidedAt = '2026-07-29T01:13:00.000Z';
      },
    },
  ];

  cases.forEach(({ label, mutate }) => {
    const inconsistent = structuredClone(staged);
    if (
      !inconsistent.sourceState
      || inconsistent.sourceState.status === 'current'
    ) {
      throw new Error('Expected staged source state');
    }
    inconsistent.sourceState.incoming.matches = [];
    const change = inconsistent.sourceState.changes[0] as unknown as Record<
      string,
      unknown
    >;
    mutate(change);
    const before = structuredClone(inconsistent);

    assert.throws(
      () => applyAuthoringOperation(
        inconsistent,
        { type: 'apply_source_update' },
        { now: '2026-07-29T01:14:00.000Z' },
      ),
      /decision state is incomplete or inconsistent/u,
      label,
    );
    assert.deepEqual(inconsistent, before, label);
    assert.equal(inconsistent.rawText, oldRaw, label);
    assert.deepEqual(inconsistent.revision, before.revision, label);
    assert.deepEqual(
      inconsistent.revisionHistory,
      before.revisionHistory,
      label,
    );
  });
});

test('legacy empty matches are rebuilt when every staged decision is complete', () => {
  const oldRaw = ['# Legacy decisions', '- [ ] Keep', '  detail: Old'].join('\n');
  const nextRaw = ['# Legacy decisions', '- [ ] Keep', '  detail: New'].join('\n');
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-legacy-empty-matches',
    now: NOW,
  });
  const staged = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: incomingCandidate(initial, nextRaw),
  }, {
    actorLane: 'system',
    now: '2026-07-29T01:12:00.000Z',
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  const detailChange = staged.sourceState.changes.find(
    (change) => change.kind === 'changed' && change.field === 'detail',
  );
  assert.ok(detailChange);
  const resolved = applyAuthoringOperation(staged, {
    type: 'resolve_source_conflict',
    changeId: detailChange.changeId,
    resolution: 'use_incoming',
  }, {
    actorLane: 'personal',
    now: '2026-07-29T01:13:00.000Z',
  });
  if (!resolved.sourceState || resolved.sourceState.status === 'current') {
    throw new Error('Expected resolved source state');
  }
  resolved.sourceState.incoming.matches = [];

  const applied = applyAuthoringOperation(
    resolved,
    { type: 'apply_source_update' },
    { actorLane: 'personal', now: '2026-07-29T01:14:00.000Z' },
  );
  assert.equal(applied.rawText, nextRaw);
  assert.equal(applied.parseResult.canonical.items[0].detail, 'New');
  assert.equal(applied.sourceState?.status, 'current');
});

test('memo semantic residue fails closed during both stage and apply', () => {
  const oldRaw = ['# Memo integrity', '- [ ] Keep', '  detail: Old'].join('\n');
  const nextRaw = `${oldRaw}\n`;
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-memo-integrity',
    now: NOW,
  });
  const tamperedCandidate = incomingCandidate(initial, nextRaw);
  assert.equal(tamperedCandidate.parseResult.canonical.memos[0]?.text, 'Old');
  tamperedCandidate.parseResult.canonical.memos[0].text = 'Injected memo';
  const initialBefore = structuredClone(initial);

  assert.throws(
    () => applyAuthoringOperation(initial, {
      type: 'stage_source_update',
      candidate: tamperedCandidate,
    }, {
      actorLane: 'system',
      now: '2026-07-29T01:12:00.000Z',
    }),
    /unsupported semantic changes: memos/u,
  );
  assert.deepEqual(initial, initialBefore);

  const staged = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: incomingCandidate(initial, nextRaw),
  }, {
    actorLane: 'system',
    now: '2026-07-29T01:13:00.000Z',
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  assert.equal(staged.sourceState.changes.length, 0);
  staged.sourceState.incoming.parseResult.canonical.memos[0].text =
    'Injected memo';
  const stagedBefore = structuredClone(staged);

  assert.throws(
    () => applyAuthoringOperation(
      staged,
      { type: 'apply_source_update' },
      { now: '2026-07-29T01:14:00.000Z' },
    ),
    /unsupported semantic changes: memos/u,
  );
  assert.deepEqual(staged, stagedBefore);
  assert.equal(staged.rawText, oldRaw);
  assert.deepEqual(staged.revision, stagedBefore.revision);
  assert.deepEqual(staged.revisionHistory, stagedBefore.revisionHistory);
});

test('memo residue guard keeps parser-backed non-URL resource memos supported', () => {
  const oldRaw = ['# Resource memo', '- [ ] Keep', '  자료: 안내문'].join('\n');
  const nextRaw = `${oldRaw}\n`;
  const initial = createTextAuthoringDocument(oldRaw, {
    documentId: 'source-resource-memo',
    now: NOW,
  });
  const staged = applyAuthoringOperation(initial, {
    type: 'stage_source_update',
    candidate: incomingCandidate(initial, nextRaw),
  }, {
    actorLane: 'system',
    now: '2026-07-29T01:12:00.000Z',
  });
  if (!staged.sourceState || staged.sourceState.status === 'current') {
    throw new Error('Expected staged source state');
  }
  assert.equal(staged.sourceState.changes.length, 0);

  const applied = applyAuthoringOperation(
    staged,
    { type: 'apply_source_update' },
    { now: '2026-07-29T01:13:00.000Z' },
  );
  assert.equal(applied.rawText, nextRaw);
  assert.equal(applied.parseResult.canonical.memos[0]?.text, '안내문');
  assert.equal(applied.sourceState?.status, 'current');
});

test('Flow and uncovered Step semantics fail closed while Step title uses an explicit mapping decision', () => {
  const unsupportedFlowCases = [
    {
      label: 'Flow title',
      oldRaw: ['# Old title', '- [ ] Keep'].join('\n'),
      nextRaw: ['# New title', '- [ ] Keep'].join('\n'),
    },
    {
      label: 'Flow summary',
      oldRaw: ['# Summary', 'detail: Old summary', '- [ ] Keep'].join('\n'),
      nextRaw: ['# Summary', 'detail: New summary', '- [ ] Keep'].join('\n'),
    },
  ];
  unsupportedFlowCases.forEach(({ label, oldRaw, nextRaw }, index) => {
    const initial = createTextAuthoringDocument(oldRaw, {
      documentId: `source-flow-semantics-${index}`,
      now: NOW,
    });
    assert.throws(
      () => applyAuthoringOperation(initial, {
        type: 'stage_source_update',
        candidate: incomingCandidate(initial, nextRaw),
      }),
      /unsupported semantic changes: flow/u,
      label,
    );
  });

  const legacyFlow = createTextAuthoringDocument(
    unsupportedFlowCases[1].oldRaw,
    {
      documentId: 'source-flow-semantics-legacy',
      now: NOW,
    },
  );
  const legacyFlowCandidate = incomingCandidate(
    legacyFlow,
    unsupportedFlowCases[1].nextRaw,
  );
  legacyFlowCandidate.matches = [{
    activeItemId: legacyFlow.parseResult.canonical.items[0].itemId,
    incomingItemId: legacyFlowCandidate.parseResult.canonical.items[0].itemId,
    basis: 'stable_entity_id',
  }];
  if (!legacyFlow.sourceState) throw new Error('Expected active source state');
  legacyFlow.sourceState = {
    status: 'source_updated',
    active: legacyFlow.sourceState.active,
    incoming: legacyFlowCandidate,
    changes: [],
    stagedAt: '2026-07-29T01:11:00.000Z',
  };
  assert.throws(
    () => applyAuthoringOperation(legacyFlow, { type: 'apply_source_update' }),
    /unsupported semantic changes: flow/u,
  );
  assert.equal(legacyFlow.parseResult.canonical.flow.summary, 'Old summary');

  const stepDescription = createTextAuthoringDocument(
    ['# Steps', '## First', '- [ ] Keep', '  detail: old'].join('\n'),
    {
      documentId: 'source-step-description',
      now: NOW,
    },
  );
  const stepDescriptionCandidate = incomingCandidate(
    stepDescription,
    ['# Steps', '## First', '- [ ] Keep', '  detail: incoming'].join('\n'),
  );
  stepDescriptionCandidate.parseResult.canonical.steps[0].description =
    'New uncovered description';
  assert.throws(
    () => applyAuthoringOperation(stepDescription, {
      type: 'stage_source_update',
      candidate: stepDescriptionCandidate,
    }),
    /unsupported semantic changes: steps/u,
  );

  const oldStepRaw = ['# Steps', '## First', '- [ ] Keep'].join('\n');
  const nextStepRaw = ['# Steps', '## Renamed', '- [ ] Keep'].join('\n');
  const stepTitle = createTextAuthoringDocument(oldStepRaw, {
    documentId: 'source-step-title',
    now: NOW,
  });
  const stepTitleCandidate = incomingCandidate(stepTitle, nextStepRaw);
  stepTitleCandidate.matches = [{
    activeItemId: stepTitle.parseResult.canonical.items[0].itemId,
    incomingItemId: stepTitleCandidate.parseResult.canonical.items[0].itemId,
    basis: 'explicit',
  }];
  const stagedStepTitle = applyAuthoringOperation(stepTitle, {
    type: 'stage_source_update',
    candidate: stepTitleCandidate,
  });
  if (
    !stagedStepTitle.sourceState
    || stagedStepTitle.sourceState.status === 'current'
  ) {
    throw new Error('Expected staged Step title update');
  }
  const stepMappingChange = stagedStepTitle.sourceState.changes.find(
    (change) => change.kind === 'changed' && change.field === 'step_mapping',
  );
  assert.ok(stepMappingChange?.kind === 'changed');
  assert.throws(
    () => applyAuthoringOperation(
      stagedStepTitle,
      { type: 'apply_source_update' },
    ),
    /explicit decision/u,
  );
  const resolvedStepTitle = applyAuthoringOperation(stagedStepTitle, {
    type: 'resolve_source_conflict',
    changeId: stepMappingChange.changeId,
    resolution: 'use_incoming',
  });
  const appliedStepTitle = applyAuthoringOperation(resolvedStepTitle, {
    type: 'apply_source_update',
  });
  assert.equal(
    appliedStepTitle.parseResult.canonical.steps[0].title,
    'Renamed',
  );
});
