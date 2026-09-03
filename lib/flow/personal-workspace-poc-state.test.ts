import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  toPersonalWorkspacePocQuickItemRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocTransitionResult,
} from './personal-workspace-poc-contract';
import {
  applyPersonalWorkspacePocTimelineOrder,
  applyPersonalWorkspacePocTransition,
  createPersonalWorkspacePocState,
  getPersonalWorkspacePocEffectiveDate,
  getPersonalWorkspacePocFolderId,
  isPersonalWorkspacePocCompleted,
  isPersonalWorkspacePocState,
  validatePersonalWorkspacePocStateReferences,
} from './personal-workspace-poc-state';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';
import { expandPersonalWorkspacePocOccurrences } from './personal-workspace-poc-occurrence';

const T0 = '2026-09-01T00:00:00.000Z';
const T1 = '2026-09-01T00:01:00.000Z';
const T2 = '2026-09-01T00:02:00.000Z';
const T3 = '2026-09-01T00:03:00.000Z';

function legacyFidelityHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

function authoredFlow(handoffId = 'handoff-1'): PersonalWorkspacePocAuthoredFlow {
  const result = materializePersonalWorkspacePocAuthoring({
    handoffId,
    documentId: `document-${handoffId}`,
    revisionId: `revision-${handoffId}`,
    rawText: '# 내가 만든 Flow\n- [ ] 첫 할 일\n  - 날짜: 2026-09-03',
    committedAt: T2,
  });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('authored Flow fixture must materialize');
  return result.flow;
}

test('quick item date and folder changes are atomic and the last change can be undone', () => {
  let state = createPersonalWorkspacePocState(T0);
  let result = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'work', title: '업무', now: T1,
  });
  assert.equal(result.changed, true);
  state = result.state;
  result = applyPersonalWorkspacePocTransition(state, {
    type: 'create-quick-item', quickItemId: 'quick-1', title: '메일 보내기', date: '2026-09-01', now: T2,
  });
  assert.equal(result.changed, true);
  state = result.state;
  const quickRef = toPersonalWorkspacePocQuickItemRef('quick-1');
  result = applyPersonalWorkspacePocTransition(state, {
    type: 'move-folder', member: 'quick_item', memberRef: quickRef, folderId: 'work', now: T3,
  });
  assert.equal(result.changed, true);
  assert.equal(getPersonalWorkspacePocFolderId(result.state, quickRef), 'work');
  assert.equal(getPersonalWorkspacePocEffectiveDate(result.state, quickRef), '2026-09-01');

  const undone = applyPersonalWorkspacePocTransition(result.state, { type: 'undo', now: '2026-09-01T00:04:00.000Z' });
  assert.equal(undone.changed, true);
  assert.equal(getPersonalWorkspacePocFolderId(undone.state, quickRef), undefined);
  assert.equal(getPersonalWorkspacePocEffectiveDate(undone.state, quickRef), '2026-09-01');
  assert.equal(undone.state.quickItems.length, 1);
});

test('QuickItem root edit updates only personal title and memo with stale and no-op guards', () => {
  const created = applyPersonalWorkspacePocTransition(createPersonalWorkspacePocState(T0), {
    type: 'create-quick-item',
    quickItemId: 'quick-root',
    title: '초기 제목',
    memo: '초기 메모',
    date: '2026-09-03',
    now: T1,
  });
  assert.equal(created.changed, true);
  const ref = toPersonalWorkspacePocQuickItemRef('quick-root');
  const placementBefore = structuredClone(created.state.placements[ref]);

  const updated = applyPersonalWorkspacePocTransition(created.state, {
    type: 'update-quick-item',
    quickItemId: 'quick-root',
    expectedRevision: created.state.revision,
    title: '  바뀐 제목  ',
    memo: '바뀐 메모\n둘째 줄',
    date: '2026-09-07',
    now: T2,
  });
  assert.equal(updated.changed, true);
  assert.deepEqual(updated.state.quickItems[0], {
    quickItemId: 'quick-root',
    title: '바뀐 제목',
    memo: '바뀐 메모\n둘째 줄',
    status: 'open',
    createdAt: T1,
  });
  assert.deepEqual(updated.state.placements[ref], {
    ...placementBefore,
    date: '2026-09-07',
  });
  assert.deepEqual(updated.state.completions, created.state.completions);

  const noOp = applyPersonalWorkspacePocTransition(updated.state, {
    type: 'update-quick-item',
    quickItemId: 'quick-root',
    expectedRevision: updated.state.revision,
    title: '바뀐 제목',
    memo: '바뀐 메모\n둘째 줄',
    date: '2026-09-07',
    now: T3,
  });
  assert.equal(noOp.changed, false);
  assert.strictEqual(noOp.state, updated.state);

  const stale = applyPersonalWorkspacePocTransition(updated.state, {
    type: 'update-quick-item',
    quickItemId: 'quick-root',
    expectedRevision: created.state.revision,
    title: '오래된 변경',
    memo: '',
    date: '2026-09-08',
    now: T3,
  });
  assert.equal(stale.changed, false);
  assert.equal(stale.error, 'stale-state-revision');
  assert.strictEqual(stale.state, updated.state);

  const undone = applyPersonalWorkspacePocTransition(updated.state, { type: 'undo', now: T3 });
  assert.equal(undone.changed, true);
  assert.equal(undone.state.quickItems[0].title, '초기 제목');
  assert.equal(undone.state.quickItems[0].memo, '초기 메모');
  assert.deepEqual(undone.state.placements[ref], placementBefore);
});

test('Flow Item date moves never create direct folder membership or alter its Flow folder', () => {
  const flowRef = toPersonalWorkspacePocFlowRef('copy:one', 'flow:one');
  const itemRef = toPersonalWorkspacePocFlowItemRef('copy:one', 'flow:one', 'item:one');
  let state = createPersonalWorkspacePocState(T0);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'project', title: '프로젝트', now: T1,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-folder', member: 'saved_flow', memberRef: flowRef, folderId: 'project', now: T2,
  }).state;
  const moved = applyPersonalWorkspacePocTransition(state, {
    type: 'move-date', itemRef, currentDate: '2026-09-01', date: '2026-09-03', now: T3,
  });
  assert.equal(moved.changed, true);
  assert.equal(getPersonalWorkspacePocFolderId(moved.state, flowRef), 'project');
  assert.equal(moved.state.memberships.some((entry) => entry.memberRef === itemRef), false);
  assert.equal(getPersonalWorkspacePocEffectiveDate(moved.state, itemRef, '2026-09-01'), '2026-09-03');
});

test('explicit execution-date restore removes only the runtime schedule override', () => {
  const itemRef = toPersonalWorkspacePocFlowItemRef('copy', 'flow', 'item');
  const base = createPersonalWorkspacePocState(T0);
  base.placements[itemRef] = {
    itemRef,
    scheduleMode: 'fixed_date',
    date: '2026-09-10',
    timelinePolicy: 'auto',
  };
  const restored = applyPersonalWorkspacePocTransition(base, {
    type: 'restore-execution-date', itemRef, now: T1,
  });
  assert.equal(restored.changed, true);
  assert.equal(restored.state.placements[itemRef], undefined);
  assert.equal(getPersonalWorkspacePocEffectiveDate(restored.state, itemRef, '2026-09-03'), '2026-09-03');

  const repeated = applyPersonalWorkspacePocTransition(restored.state, {
    type: 'restore-execution-date', itemRef, now: T2,
  });
  assert.equal(repeated.changed, false);
  assert.strictEqual(repeated.state, restored.state);

  const hidden = createPersonalWorkspacePocState(T0);
  hidden.placements[itemRef] = {
    itemRef,
    scheduleMode: 'unscheduled',
    timelinePolicy: 'excluded',
  };
  const hiddenRestored = applyPersonalWorkspacePocTransition(hidden, {
    type: 'restore-execution-date', itemRef, now: T1,
  });
  assert.deepEqual(hiddenRestored.state.placements[itemRef], {
    itemRef,
    scheduleMode: 'inherit',
    timelinePolicy: 'excluded',
  });

  const quickRejected = applyPersonalWorkspacePocTransition(base, {
    type: 'restore-execution-date', itemRef: toPersonalWorkspacePocQuickItemRef('quick'), now: T1,
  });
  assert.equal(quickRejected.changed, false);
  assert.equal(quickRejected.error, 'invalid-item-ref');
});

test('completion and reopening share one shadow state for Flow and quick items', () => {
  const flowItemRef = toPersonalWorkspacePocFlowItemRef('copy', 'flow', 'item');
  let state = createPersonalWorkspacePocState(T0);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-quick-item', quickItemId: 'quick', title: '짧은 일', now: T1,
  }).state;
  const quickRef = toPersonalWorkspacePocQuickItemRef('quick');
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'complete', itemRef: quickRef, completed: true, now: T2,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'complete', itemRef: flowItemRef, completed: true, now: T2,
  }).state;
  assert.equal(isPersonalWorkspacePocCompleted(state, quickRef), true);
  assert.equal(isPersonalWorkspacePocCompleted(state, flowItemRef), true);

  const reopened = applyPersonalWorkspacePocTransition(state, {
    type: 'complete', itemRef: flowItemRef, completed: false, now: T3,
  });
  assert.equal(isPersonalWorkspacePocCompleted(reopened.state, flowItemRef), false);
  assert.equal(isPersonalWorkspacePocCompleted(reopened.state, quickRef), true);
});

test('drag/menu/keyboard-equivalent order actions converge and no-op paths mutate nothing', () => {
  const base = createPersonalWorkspacePocState(T0);
  const action = {
    type: 'reorder' as const,
    context: 'date' as const,
    contextKey: '2026-09-01',
    currentOrderedRefKeys: ['a', 'b', 'c'],
    orderedRefKeys: ['b', 'a', 'c'],
    now: T1,
  };
  const drag = applyPersonalWorkspacePocTransition(base, action);
  const menu = applyPersonalWorkspacePocTransition(base, action);
  const keyboard = applyPersonalWorkspacePocTransition(base, action);
  assert.deepEqual(drag.state, menu.state);
  assert.deepEqual(menu.state, keyboard.state);
  assert.deepEqual(
    applyPersonalWorkspacePocTimelineOrder(drag.state, 'date', '2026-09-01', ['a', 'b', 'c']),
    ['b', 'a', 'c'],
  );

  const same = applyPersonalWorkspacePocTransition(base, {
    ...action,
    orderedRefKeys: ['a', 'b', 'c'],
  });
  const canceled = applyPersonalWorkspacePocTransition(base, { type: 'cancel', reason: '취소했어요.' });
  const dated = applyPersonalWorkspacePocTransition(base, {
    type: 'move-date', itemRef: 'item', date: '2026-09-01', now: T1,
  });
  const sameDate = applyPersonalWorkspacePocTransition(dated.state, {
    type: 'move-date', itemRef: 'item', currentDate: 'caller-value-is-not-trusted', date: '2026-09-01', now: T2,
  });
  assert.equal(same.changed, false);
  assert.equal(canceled.changed, false);
  assert.equal(sameDate.changed, false);
  assert.strictEqual(same.state, base);
  assert.strictEqual(canceled.state, base);
  assert.strictEqual(sameDate.state, dated.state);
});

test('Flow folder drag/menu/keyboard-equivalent actions converge, keep execution state, and Undo cleanly', () => {
  const flowRef = toPersonalWorkspacePocFlowRef('copy:move', 'flow:move');
  const base = applyPersonalWorkspacePocTransition(createPersonalWorkspacePocState(T0), {
    type: 'create-folder', folderId: 'project', title: '프로젝트', now: T1,
  }).state;
  const action = {
    type: 'move-folder' as const,
    member: 'saved_flow' as const,
    memberRef: flowRef,
    folderId: 'project',
    now: T2,
  };

  const drag = applyPersonalWorkspacePocTransition(base, action);
  const menu = applyPersonalWorkspacePocTransition(base, action);
  const keyboard = applyPersonalWorkspacePocTransition(base, action);
  assert.equal(drag.changed, true);
  assert.deepEqual(drag.state, menu.state);
  assert.deepEqual(menu.state, keyboard.state);
  assert.equal(getPersonalWorkspacePocFolderId(drag.state, flowRef), 'project');
  assert.deepEqual(drag.state.placements, base.placements);
  assert.deepEqual(drag.state.timelineOrders, base.timelineOrders);
  assert.deepEqual(drag.state.completions, base.completions);

  const same = applyPersonalWorkspacePocTransition(drag.state, { ...action, now: T3 });
  const canceled = applyPersonalWorkspacePocTransition(drag.state, {
    type: 'cancel', reason: 'Flow 폴더 이동을 취소했어요.',
  });
  assert.equal(same.changed, false);
  assert.equal(canceled.changed, false);
  assert.strictEqual(same.state, drag.state);
  assert.strictEqual(canceled.state, drag.state);

  const undone = applyPersonalWorkspacePocTransition(drag.state, { type: 'undo', now: T3 });
  assert.equal(undone.changed, true);
  assert.equal(getPersonalWorkspacePocFolderId(undone.state, flowRef), undefined);
  assert.deepEqual(undone.state.placements, base.placements);
  assert.deepEqual(undone.state.timelineOrders, base.timelineOrders);
  assert.deepEqual(undone.state.completions, base.completions);
});

test('move-date no-op is derived from persisted placement, never caller currentDate', () => {
  const base = createPersonalWorkspacePocState(T0);
  const callerOnly = applyPersonalWorkspacePocTransition(base, {
    type: 'move-date',
    itemRef: 'item',
    currentDate: '2026-09-03',
    date: '2026-09-03',
    now: T1,
  });
  assert.equal(callerOnly.changed, true);
  assert.equal(callerOnly.state.placements.item?.scheduleMode, 'fixed_date');
  assert.equal(callerOnly.state.placements.item?.date, '2026-09-03');

  const undated = applyPersonalWorkspacePocTransition(base, {
    type: 'move-date',
    itemRef: 'item',
    currentDate: undefined,
    date: undefined,
    now: T1,
  });
  assert.equal(undated.changed, true);
  const sameUndated = applyPersonalWorkspacePocTransition(undated.state, {
    type: 'move-date',
    itemRef: 'item',
    currentDate: 'wrong-caller-value',
    date: undefined,
    now: T2,
  });
  assert.equal(sameUndated.changed, false);
  assert.strictEqual(sameUndated.state, undated.state);
});

test('deleting a parent folder removes its subtree but preserves content in unfiled', () => {
  const flowRef = toPersonalWorkspacePocFlowRef('copy', 'flow');
  let state = createPersonalWorkspacePocState(T0);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'parent', title: '상위', now: T1,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'child', title: '하위', parentFolderId: 'parent', now: T2,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-folder', member: 'saved_flow', memberRef: flowRef, folderId: 'child', now: T3,
  }).state;
  const deleted = applyPersonalWorkspacePocTransition(state, {
    type: 'delete-folder', folderId: 'parent', now: '2026-09-01T00:04:00.000Z',
  });
  assert.equal(deleted.changed, true);
  assert.deepEqual(deleted.state.folders, []);
  assert.equal(getPersonalWorkspacePocFolderId(deleted.state, flowRef), undefined);
  assert.equal(deleted.state.memberships.some((entry) => entry.memberRef === flowRef), true);
});

test('folder depth, invalid dates, same completion, and corrupt state fail without mutation', () => {
  let state = createPersonalWorkspacePocState(T0);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'one', title: '1', now: T1,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'two', title: '2', parentFolderId: 'one', now: T2,
  }).state;
  const depth = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'three', title: '3', parentFolderId: 'two', now: T3,
  });
  const badDate = applyPersonalWorkspacePocTransition(state, {
    type: 'move-date', itemRef: 'item', date: '2026-02-31', currentDate: '2026-09-01', now: T3,
  });
  const reopenOpen = applyPersonalWorkspacePocTransition(state, {
    type: 'complete', itemRef: 'flow-item:test', completed: false, now: T3,
  });
  assert.equal(depth.changed, false);
  assert.equal(badDate.changed, false);
  assert.equal(reopenOpen.changed, false);
  assert.equal(isPersonalWorkspacePocState({ ...state, version: 99 }), false);
});

test('timeline visibility is an independent, undoable placement property', () => {
  const itemRef = toPersonalWorkspacePocFlowItemRef('copy', 'flow', 'item');
  const state = createPersonalWorkspacePocState(T0);
  const hidden = applyPersonalWorkspacePocTransition(state, {
    type: 'set-timeline-policy', itemRef, policy: 'excluded', now: T1,
  });
  assert.equal(hidden.changed, true);
  assert.equal(hidden.state.placements[itemRef].scheduleMode, 'inherit');
  assert.equal(hidden.state.placements[itemRef].timelinePolicy, 'excluded');
  const undone = applyPersonalWorkspacePocTransition(hidden.state, { type: 'undo', now: T2 });
  assert.equal(undone.state.placements[itemRef], undefined);
});

test('one personal Plan apply persists staged Item edits once and leaves execution state untouched', () => {
  const savedCopyId = 'plan-copy';
  const flowId = 'plan-flow';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const firstRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'first');
  const secondRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'second');
  const base = createPersonalWorkspacePocState(T0);
  base.placements[firstRef] = {
    itemRef: firstRef,
    scheduleMode: 'fixed_date',
    date: '2026-09-10',
    timelinePolicy: 'excluded',
  };
  const overlay = {
    flowRef,
    savedCopyId,
    flowId,
    title: '내 계획 제목',
    orderedItemRefs: [secondRef, firstRef],
    items: {
      [firstRef]: {
        itemRef: firstRef,
        memo: '',
        schedule: { mode: 'unscheduled' as const },
      },
    },
  };
  const result = applyPersonalWorkspacePocTransition(base, {
    type: 'apply-personal-plan',
    expectedRevision: 0,
    flowRef,
    savedCopyId,
    flowId,
    origin: 'legacy-saved-plan',
    knownItemRefs: [firstRef, secondRef],
    overlay,
    now: T1,
  });
  assert.equal(result.changed, true);
  assert.equal(result.state.revision, 1);
  assert.deepEqual(result.state.personalPlanOverlays?.[flowRef], overlay);
  assert.deepEqual(result.state.placements, base.placements);
  assert.equal(result.state.undo?.snapshot.revision, 0);

  const stale = applyPersonalWorkspacePocTransition(result.state, {
    type: 'apply-personal-plan',
    expectedRevision: 0,
    flowRef,
    savedCopyId,
    flowId,
    origin: 'legacy-saved-plan',
    knownItemRefs: [firstRef, secondRef],
    overlay,
    now: T2,
  });
  assert.equal(stale.changed, false);
  assert.equal(stale.error, 'stale-state-revision');
  assert.strictEqual(stale.state, result.state);

  const undone = applyPersonalWorkspacePocTransition(result.state, { type: 'undo', now: T2 });
  assert.equal(undone.changed, true);
  assert.deepEqual(undone.state.personalPlanOverlays, {});
  assert.deepEqual(undone.state.placements, base.placements);
});

test('section title shadow uses the Plan transition and rejects blank, foreign, duplicate, and read-only IDs', () => {
  const savedCopyId = 'section-copy';
  const flowId = 'section-flow';
  const flowRef = toPersonalWorkspacePocFlowRef(savedCopyId, flowId);
  const itemRef = toPersonalWorkspacePocFlowItemRef(savedCopyId, flowId, 'item');
  const base = createPersonalWorkspacePocState(T0);
  const overlay = {
    flowRef,
    savedCopyId,
    flowId,
    sectionTitles: { personal: '내 실행 구간' },
    items: {},
  };
  const applied = applyPersonalWorkspacePocTransition(base, {
    type: 'apply-personal-plan',
    expectedRevision: 0,
    flowRef,
    savedCopyId,
    flowId,
    origin: 'personal-draft',
    knownItemRefs: [itemRef],
    knownSectionIds: ['personal', 'source'],
    editableSectionIds: ['personal'],
    overlay,
    now: T1,
  });
  assert.equal(applied.changed, true);
  assert.deepEqual(applied.state.personalPlanOverlays?.[flowRef]?.sectionTitles, {
    personal: '내 실행 구간',
  });
  assert.equal(isPersonalWorkspacePocState(JSON.parse(JSON.stringify(applied.state))), true);
  const undone = applyPersonalWorkspacePocTransition(applied.state, { type: 'undo', now: T2 });
  assert.equal(undone.changed, true);
  assert.deepEqual(undone.state.personalPlanOverlays, {});

  const attempt = (
    origin: 'personal-draft' | 'legacy-saved-plan',
    sectionTitles: Record<string, string>,
    knownSectionIds: string[] = ['personal'],
    editableSectionIds: string[] = ['personal'],
  ) => applyPersonalWorkspacePocTransition(base, {
    type: 'apply-personal-plan',
    expectedRevision: 0,
    flowRef,
    savedCopyId,
    flowId,
    origin,
    knownItemRefs: [itemRef],
    knownSectionIds,
    editableSectionIds,
    overlay: { ...overlay, sectionTitles },
    now: T1,
  });
  const blank = attempt('personal-draft', { personal: ' ' });
  const foreign = attempt('personal-draft', { foreign: '다른 구간' });
  const duplicate = attempt('personal-draft', { personal: '내 구간' }, ['personal', 'personal']);
  const readOnly = attempt('legacy-saved-plan', { personal: '바꾸면 안 됨' });
  for (const result of [blank, foreign, duplicate, readOnly]) {
    assert.equal(result.changed, false);
    assert.strictEqual(result.state, base);
  }
  assert.equal(blank.error, 'invalid-personal-plan');
  assert.equal(foreign.error, 'foreign-section-ref');
  assert.equal(duplicate.error, 'invalid-personal-plan-sections');
  assert.equal(readOnly.error, 'read-only-section-title');
});

test('loaded state references must belong to the current read model and each undo snapshot', () => {
  const flowRef = toPersonalWorkspacePocFlowRef('copy', 'flow');
  const itemRef = toPersonalWorkspacePocFlowItemRef('copy', 'flow', 'item');
  const model: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [{
      ref: flowRef,
      savedCopyId: 'copy',
      flowId: 'flow',
      sourceSlug: 'source',
      title: 'Flow',
      origin: 'legacy-saved-plan',
      items: [{
        ref: itemRef,
        savedCopyId: 'copy',
        flowId: 'flow',
        itemId: 'item',
        title: '할 일',
        sourceOrder: 0,
      }],
    }],
  };
  let state = createPersonalWorkspacePocState(T0);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'folder', title: '폴더', now: T1,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-quick-item', quickItemId: 'quick', title: '빠른 일', date: '2026-09-01', now: T2,
  }).state;
  const quickRef = toPersonalWorkspacePocQuickItemRef('quick');
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-folder', member: 'saved_flow', memberRef: flowRef, folderId: 'folder', now: T3,
  }).state;
  assert.deepEqual(validatePersonalWorkspacePocStateReferences(state, model), { ok: true });

  const corruptions = [
    {
      ...structuredClone(state),
      memberships: [{ member: 'saved_flow' as const, memberRef: itemRef, orderKey: 0 }],
    },
    {
      ...structuredClone(state),
      placements: { ...state.placements, 'flow-item:missing': {
        itemRef: 'flow-item:missing', scheduleMode: 'inherit' as const, timelinePolicy: 'auto' as const,
      } },
    },
    {
      ...structuredClone(state),
      placements: {},
    },
    {
      ...structuredClone(state),
      completions: { [quickRef]: { status: 'completed' as const, completedAt: T3 } },
    },
    {
      ...structuredClone(state),
      timelineOrders: [{
        context: 'undated' as const,
        contextKey: '2026-09-01',
        orderedRefKeys: [quickRef],
        revision: 1,
      }],
    },
  ];
  corruptions.forEach((candidate) => {
    assert.equal(validatePersonalWorkspacePocStateReferences(candidate, model).ok, false);
  });

  const staleUndo = structuredClone(state);
  assert.ok(staleUndo.undo);
  staleUndo.undo.snapshot.placements[quickRef] = {
    itemRef: quickRef,
    scheduleMode: 'fixed_date',
    date: '2026-09-01',
    timelinePolicy: 'auto',
  };
  staleUndo.undo.snapshot.quickItems = [];
  assert.equal(validatePersonalWorkspacePocStateReferences(staleUndo, model).ok, false);
});

test('authoring handoff commits Flow, source lineage, receipt, and folder in one undoable state', () => {
  let state = createPersonalWorkspacePocState(T0);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'plans', title: '내 계획', now: T1,
  }).state;
  const flow = authoredFlow();
  const committed = applyPersonalWorkspacePocTransition(state, {
    type: 'commit-authoring-handoff',
    flow,
    folderId: 'plans',
    sourceConfirmed: true,
    confirmedSourceFingerprint: flow.authoring.sourceFingerprint,
    blockingIssues: [],
    lossFields: [],
    lossAccepted: false,
    existingFlowRefs: [],
    undoAuthoringDraftRawValue: '{ "version": 1, "rawText": "# 내가 만든 Flow\\n- [ ] 첫 할 일" }',
    now: T2,
  });

  assert.equal(committed.changed, true);
  assert.deepEqual(committed.state.authoredFlows, [flow]);
  assert.deepEqual(committed.state.authoringReceipts, [{
    handoffId: 'handoff-1', flowRef: flow.ref, committedAt: T2,
  }]);
  assert.equal(getPersonalWorkspacePocFolderId(committed.state, flow.ref), 'plans');
  assert.equal(committed.state.authoredFlows?.[0].authoring.rawText, flow.authoring.rawText);

  const undone = applyPersonalWorkspacePocTransition(committed.state, { type: 'undo', now: T3 });
  assert.equal(undone.changed, true);
  assert.equal(undone.state.authoredFlows?.length, 0);
  assert.equal(undone.state.authoringReceipts?.length, 0);
  assert.equal(undone.state.memberships.some((entry) => entry.memberRef === flow.ref), false);
  assert.deepEqual(undone.storageCompanion, {
    kind: 'authoring-draft',
    rawValue: '{ "version": 1, "rawText": "# 내가 만든 Flow\\n- [ ] 첫 할 일" }',
  });
});

test('new authoring commits persist exact parser lineage and reject a stale fidelity manifest', () => {
  const rawText = '# 새 Flow\r\n- [ ] 준비\r\n  - 날짜: 2026-09-03\r\n';
  const materialized = materializePersonalWorkspacePocAuthoring({
    handoffId: 'handoff-current',
    documentId: 'document-current',
    revisionId: 'revision-current',
    rawText,
    committedAt: T2,
  });
  assert.equal(materialized.ok, true);
  if (!materialized.ok) return;
  const draftRaw = JSON.stringify({ version: 1, rawText });
  const result = applyPersonalWorkspacePocTransition(createPersonalWorkspacePocState(T0), {
    type: 'commit-authoring-handoff',
    flow: materialized.flow,
    sourceConfirmed: true,
    confirmedSourceFingerprint: materialized.sourceFingerprint,
    blockingIssues: [],
    lossFields: [],
    lossAccepted: false,
    existingFlowRefs: [],
    undoAuthoringDraftRawValue: draftRaw,
    now: T2,
  });
  assert.equal(result.changed, true);
  assert.equal(isPersonalWorkspacePocState(result.state), true);
  assert.equal(result.state.authoredFlows?.[0].authoring.source, 'text-authoring-poc-v1');
  assert.deepEqual(
    result.state.authoredFlows?.[0].authoring.parsedItems,
    materialized.parseResult.items,
  );
  assert.deepEqual(
    result.state.authoredFlows?.[0].authoring.sourceLineItemIdentityMap,
    materialized.lineage.sourceLineItemIdentityMap,
  );

  const persistedFlow = result.state.authoredFlows?.[0];
  const manifest = persistedFlow?.authoring.fidelityManifest;
  const sourceLineItemIdentityMap = persistedFlow?.authoring.sourceLineItemIdentityMap;
  assert.ok(persistedFlow);
  assert.ok(manifest);
  assert.ok(sourceLineItemIdentityMap);
  const corrupt = {
    ...result.state,
    authoredFlows: [{
      ...persistedFlow,
      authoring: {
        ...persistedFlow.authoring,
        fidelityManifest: {
          ...manifest,
          sourceLength: manifest.sourceLength + 1,
        },
      },
    }],
  };
  assert.equal(isPersonalWorkspacePocState(corrupt), false);
  const firstSourceLine = Object.keys(sourceLineItemIdentityMap)[0];
  const corruptIdentityMap = {
    ...result.state,
    authoredFlows: [{
      ...persistedFlow,
      authoring: {
        ...persistedFlow.authoring,
        sourceLineItemIdentityMap: {
          ...sourceLineItemIdentityMap,
          [firstSourceLine]: {
            ...sourceLineItemIdentityMap[firstSourceLine],
            itemRef: 'flow-item:foreign',
          },
        },
      },
    }],
  };
  assert.equal(isPersonalWorkspacePocState(corruptIdentityMap), false);
  const changedSource = {
    ...result.state,
    authoredFlows: [{
      ...persistedFlow,
      items: persistedFlow.items.map((item, index) => index === 0
        ? { ...item, title: '원문과 다른 제목' }
        : item),
    }],
  };
  assert.equal(isPersonalWorkspacePocState(changedSource), false);
});

test('legacy additive authoring payloads remain readable but cannot be newly committed', () => {
  const current = authoredFlow('handoff-legacy-additive');
  const currentManifest = current.authoring.fidelityManifest;
  assert.ok(currentManifest);
  const { sourceLines: _sourceLines, ...manifestWithoutLines } = currentManifest;
  const legacyManifest = {
    ...manifestWithoutLines,
    manifestId: `fidelity-manifest-${legacyFidelityHash([
      current.authoring.sourceFingerprint,
      ...currentManifest.entries.map((entry) => entry.entryId),
    ].join('\u001f'))}`,
  };
  const {
    sourceLineItemIdentityMap: _sourceLineItemIdentityMap,
    ...lineageWithoutIdentityMap
  } = current.authoring;
  const legacyFlow: PersonalWorkspacePocAuthoredFlow = {
    ...current,
    authoring: {
      ...lineageWithoutIdentityMap,
      fidelityManifest: legacyManifest as typeof currentManifest,
    },
  };
  const loaded = createPersonalWorkspacePocState(T0);
  loaded.authoredFlows = [legacyFlow];
  loaded.authoringReceipts = [{
    handoffId: legacyFlow.authoring.handoffId,
    flowRef: legacyFlow.ref,
    committedAt: legacyFlow.authoring.committedAt,
  }];
  assert.equal(isPersonalWorkspacePocState(loaded), true);

  const attempted = applyPersonalWorkspacePocTransition(
    createPersonalWorkspacePocState(T0),
    {
      type: 'commit-authoring-handoff',
      flow: legacyFlow,
      sourceConfirmed: true,
      confirmedSourceFingerprint: legacyFlow.authoring.sourceFingerprint,
      blockingIssues: [],
      lossFields: [],
      lossAccepted: false,
      existingFlowRefs: [],
      undoAuthoringDraftRawValue: null,
      now: T2,
    },
  );
  assert.equal(attempted.changed, false);
  assert.equal(attempted.error, 'incomplete-authoring-lineage');
});

test('blocked, unconfirmed, unaccepted-loss, collision, and identical retry paths mutate zero state', () => {
  const base = createPersonalWorkspacePocState(T0);
  const flow = authoredFlow();
  const common = {
    type: 'commit-authoring-handoff' as const,
    flow,
    sourceConfirmed: true,
    confirmedSourceFingerprint: flow.authoring.sourceFingerprint,
    blockingIssues: [] as string[],
    lossFields: [] as string[],
    lossAccepted: false,
    existingFlowRefs: [] as string[],
    undoAuthoringDraftRawValue: null,
    now: T2,
  };
  const rejected = [
    applyPersonalWorkspacePocTransition(base, { ...common, sourceConfirmed: false }),
    applyPersonalWorkspacePocTransition(base, { ...common, confirmedSourceFingerprint: 'stale' }),
    applyPersonalWorkspacePocTransition(base, { ...common, blockingIssues: ['invalid-date'] }),
    applyPersonalWorkspacePocTransition(base, { ...common, lossFields: ['recurrence'] }),
    applyPersonalWorkspacePocTransition(base, { ...common, existingFlowRefs: [flow.ref] }),
  ];
  rejected.forEach((result) => {
    assert.equal(result.changed, false);
    assert.strictEqual(result.state, base);
  });

  const committed = applyPersonalWorkspacePocTransition(base, common);
  const retry = applyPersonalWorkspacePocTransition(committed.state, {
    ...common,
    flow: {
      ...flow,
      authoring: { ...flow.authoring, committedAt: T3 },
    },
    now: T3,
  });
  assert.equal(retry.changed, false);
  assert.strictEqual(retry.state, committed.state);
  assert.equal(retry.message, '이미 저장된 Flow를 열 수 있어요.');
});

test('fixed-seed 5,000-step simulation preserves state, references, source bytes, and undo invariants', () => {
  const flowRef = toPersonalWorkspacePocFlowRef('simulation-copy', 'simulation-flow');
  const flowItemRefs = ['one', 'two'].map((itemId) => (
    toPersonalWorkspacePocFlowItemRef('simulation-copy', 'simulation-flow', itemId)
  ));
  const model: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [{
      ref: flowRef,
      savedCopyId: 'simulation-copy',
      flowId: 'simulation-flow',
      sourceSlug: 'simulation-source',
      title: '시뮬레이션 Flow',
      origin: 'legacy-saved-plan',
      items: flowItemRefs.map((ref, index) => ({
        ref,
        savedCopyId: 'simulation-copy',
        flowId: 'simulation-flow',
        itemId: index === 0 ? 'one' : 'two',
        title: `원본 할 일 ${index + 1}`,
        sourceOrder: index,
        sourceDate: '2026-09-01',
      })),
    }],
  };
  const sourceBytes = JSON.stringify(model);
  let seed = 0x41c0ffee;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x1_0000_0000;
  };
  const pick = <T>(values: readonly T[]): T => values[Math.floor(random() * values.length)];
  let state = createPersonalWorkspacePocState(T0);
  let folderCounter = 0;
  let quickCounter = 0;

  for (let index = 0; index < 5_000; index += 1) {
    const now = new Date(Date.parse(T0) + ((index + 1) * 1_000)).toISOString();
    const folderIds = state.folders.map((folder) => folder.folderId);
    const quickRefs = state.quickItems.map((item) => (
      toPersonalWorkspacePocQuickItemRef(item.quickItemId)
    ));
    const taskRefs = [...flowItemRefs, ...quickRefs];
    const roll = Math.floor(random() * 12);
    let result: PersonalWorkspacePocTransitionResult;

    if (roll === 0 && folderIds.length < 24) {
      folderCounter += 1;
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'create-folder',
        folderId: `folder-${folderCounter}`,
        title: `폴더 ${folderCounter}`,
        now,
      });
    } else if (roll === 1 && folderIds.length > 0) {
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'delete-folder',
        folderId: pick(folderIds),
        now,
      });
    } else if (roll === 2 && quickCounter < 32) {
      quickCounter += 1;
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'create-quick-item',
        quickItemId: `quick-${quickCounter}`,
        title: `빠른 할 일 ${quickCounter}`,
        date: pick(['2026-09-01', '2026-09-02', '2026-09-03']),
        ...(folderIds.length && random() > 0.5 ? { folderId: pick(folderIds) } : {}),
        now,
      });
    } else if (roll === 3) {
      const quickRef = quickRefs.length ? pick(quickRefs) : undefined;
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'move-folder',
        member: quickRef ? 'quick_item' : 'saved_flow',
        memberRef: quickRef ?? flowRef,
        ...(folderIds.length && random() > 0.25 ? { folderId: pick(folderIds) } : {}),
        now,
      });
    } else if (roll === 4) {
      const itemRef = pick(taskRefs);
      const sourceDate = flowItemRefs.includes(itemRef) ? '2026-09-01' : undefined;
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'move-date',
        itemRef,
        ...(sourceDate ? { currentDate: getPersonalWorkspacePocEffectiveDate(state, itemRef, sourceDate) } : {}),
        ...(random() > 0.2 ? { date: pick(['2026-09-01', '2026-09-02', '2026-09-03']) } : {}),
        now,
      });
    } else if (roll === 5) {
      const itemRef = pick(taskRefs);
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'complete',
        itemRef,
        completed: !isPersonalWorkspacePocCompleted(state, itemRef),
        now,
      });
    } else if (roll === 6) {
      const itemRef = pick(taskRefs);
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'set-timeline-policy',
        itemRef,
        policy: pick(['auto', 'included', 'excluded'] as const),
        now,
      });
    } else if (roll === 7) {
      const orderedRefKeys = [...taskRefs];
      const left = Math.floor(random() * orderedRefKeys.length);
      const right = Math.floor(random() * orderedRefKeys.length);
      [orderedRefKeys[left], orderedRefKeys[right]] = [orderedRefKeys[right], orderedRefKeys[left]];
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'reorder',
        context: 'date',
        contextKey: '2026-09-01',
        orderedRefKeys,
        now,
      });
    } else if (roll === 8) {
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'reset-order',
        context: 'date',
        contextKey: '2026-09-01',
        now,
      });
    } else if (roll === 9) {
      result = applyPersonalWorkspacePocTransition(state, { type: 'undo', now });
    } else if (roll === 10) {
      result = applyPersonalWorkspacePocTransition(state, { type: 'cancel', reason: 'simulation-cancel' });
    } else {
      const itemRef = pick(taskRefs);
      const currentDate = getPersonalWorkspacePocEffectiveDate(
        state,
        itemRef,
        flowItemRefs.includes(itemRef) ? '2026-09-01' : undefined,
      );
      result = applyPersonalWorkspacePocTransition(state, {
        type: 'move-date',
        itemRef,
        ...(currentDate ? { currentDate, date: currentDate } : {}),
        now,
      });
    }

    if (!result.changed) assert.strictEqual(result.state, state);
    state = result.state;
    assert.equal(isPersonalWorkspacePocState(state), true, `shape failed at step ${index}`);
    assert.deepEqual(
      validatePersonalWorkspacePocStateReferences(state, model),
      { ok: true },
      `reference failed at step ${index}`,
    );
    if (state.undo) assert.equal(state.undo.snapshot.revision, state.revision - 1);
    assert.equal(
      state.memberships.some((membership) => flowItemRefs.includes(membership.memberRef)),
      false,
      `Flow Item folder inheritance failed at step ${index}`,
    );
    assert.equal(JSON.stringify(model), sourceBytes, `source model changed at step ${index}`);
  }
});

test('Flow and QuickItem trash lifecycle is shadow-only, undoable, reload-safe, and restores folders', () => {
  const flowRef = toPersonalWorkspacePocFlowRef('trash-copy', 'trash-flow');
  const itemRef = toPersonalWorkspacePocFlowItemRef('trash-copy', 'trash-flow', 'trash-item');
  const model: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [{
      ref: flowRef,
      savedCopyId: 'trash-copy',
      flowId: 'trash-flow',
      sourceSlug: 'trash-source',
      title: '휴지통 검증 Flow',
      origin: 'legacy-saved-plan',
      items: [{
        ref: itemRef,
        savedCopyId: 'trash-copy',
        flowId: 'trash-flow',
        itemId: 'trash-item',
        title: '원본 할 일',
        sourceOrder: 0,
      }],
    }],
  };
  const sourceBytes = JSON.stringify(model);
  let state = applyPersonalWorkspacePocTransition(createPersonalWorkspacePocState(T0), {
    type: 'create-folder', folderId: 'trash-folder', title: '보관 전 폴더', now: T1,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-folder', member: 'saved_flow', memberRef: flowRef,
    folderId: 'trash-folder', now: T2,
  }).state;

  const trashed = applyPersonalWorkspacePocTransition(state, {
    type: 'move-to-trash', member: 'saved_flow', memberRef: flowRef, now: T3,
  });
  assert.equal(trashed.changed, true);
  assert.equal(trashed.state.trashEntries?.length, 1);
  assert.equal(trashed.state.memberships.some((entry) => entry.memberRef === flowRef), false);
  assert.deepEqual(validatePersonalWorkspacePocStateReferences(trashed.state, model), { ok: true });
  assert.equal(JSON.stringify(model), sourceBytes);

  const repeated = applyPersonalWorkspacePocTransition(trashed.state, {
    type: 'move-to-trash', member: 'saved_flow', memberRef: flowRef, now: T3,
  });
  const canceled = applyPersonalWorkspacePocTransition(trashed.state, {
    type: 'cancel', reason: '휴지통 이동을 취소했어요.',
  });
  assert.equal(repeated.changed, false);
  assert.equal(canceled.changed, false);
  assert.strictEqual(repeated.state, trashed.state);
  assert.strictEqual(canceled.state, trashed.state);

  const undone = applyPersonalWorkspacePocTransition(trashed.state, { type: 'undo', now: T3 });
  assert.equal(undone.changed, true);
  assert.equal(undone.state.trashEntries?.length, 0);
  assert.equal(getPersonalWorkspacePocFolderId(undone.state, flowRef), 'trash-folder');

  const restored = applyPersonalWorkspacePocTransition(trashed.state, {
    type: 'restore-from-trash', member: 'saved_flow', memberRef: flowRef, now: T3,
  });
  assert.equal(restored.changed, true);
  assert.equal(restored.state.trashEntries?.length, 0);
  assert.equal(getPersonalWorkspacePocFolderId(restored.state, flowRef), 'trash-folder');
  const reloaded = JSON.parse(JSON.stringify(restored.state)) as unknown;
  assert.equal(isPersonalWorkspacePocState(reloaded), true);
  assert.deepEqual(
    validatePersonalWorkspacePocStateReferences(reloaded as PersonalWorkspacePocTransitionResult['state'], model),
    { ok: true },
  );
});

test('permanent delete is allowed only from trash, clears PoC execution data, and cannot be undone', () => {
  const flowRef = toPersonalWorkspacePocFlowRef('delete-copy', 'delete-flow');
  const itemRef = toPersonalWorkspacePocFlowItemRef('delete-copy', 'delete-flow', 'delete-item');
  const model: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [{
      ref: flowRef,
      savedCopyId: 'delete-copy',
      flowId: 'delete-flow',
      sourceSlug: 'delete-source',
      title: '삭제 검증 Flow',
      origin: 'canonical-personal-copy',
      items: [{
        ref: itemRef,
        savedCopyId: 'delete-copy',
        flowId: 'delete-flow',
        itemId: 'delete-item',
        title: '삭제 검증 할 일',
        sourceOrder: 0,
      }],
    }],
  };
  const sourceBytes = JSON.stringify(model);
  let state = createPersonalWorkspacePocState(T0);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-date', itemRef, date: '2026-09-09', now: T1,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'complete', itemRef, completed: true, now: T2,
  }).state;

  const outsideTrash = applyPersonalWorkspacePocTransition(state, {
    type: 'permanently-delete-from-trash', member: 'saved_flow', memberRef: flowRef,
    itemRefs: [itemRef], now: T3,
  });
  assert.equal(outsideTrash.changed, false);
  assert.equal(outsideTrash.error, 'unknown-trash-member');
  assert.strictEqual(outsideTrash.state, state);

  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-to-trash', member: 'saved_flow', memberRef: flowRef, now: T3,
  }).state;
  const wrongScope = applyPersonalWorkspacePocTransition(state, {
    type: 'permanently-delete-from-trash', member: 'saved_flow', memberRef: flowRef,
    itemRefs: ['flow-item:foreign:flow:item'], now: T3,
  });
  assert.equal(wrongScope.changed, false);
  assert.equal(wrongScope.error, 'invalid-delete-scope');
  assert.strictEqual(wrongScope.state, state);

  const removed = applyPersonalWorkspacePocTransition(state, {
    type: 'permanently-delete-from-trash', member: 'saved_flow', memberRef: flowRef,
    itemRefs: [itemRef], now: T3,
  });
  assert.equal(removed.changed, true);
  assert.equal(removed.state.trashEntries?.length, 0);
  assert.deepEqual(removed.state.deletedMembers, [{
    member: 'saved_flow', memberRef: flowRef, deletedAt: T3,
  }]);
  assert.equal(removed.state.placements[itemRef], undefined);
  assert.equal(removed.state.completions[itemRef], undefined);
  assert.equal(removed.state.undo, undefined);
  assert.deepEqual(validatePersonalWorkspacePocStateReferences(removed.state, model), { ok: true });
  assert.equal(JSON.stringify(model), sourceBytes);
  const cannotUndo = applyPersonalWorkspacePocTransition(removed.state, { type: 'undo', now: T3 });
  assert.equal(cannotUndo.changed, false);
  assert.strictEqual(cannotUndo.state, removed.state);
});

test('QuickItem permanent delete removes its content, placement, and manual order after confirmation intent', () => {
  let state = applyPersonalWorkspacePocTransition(createPersonalWorkspacePocState(T0), {
    type: 'create-quick-item', quickItemId: 'trash-quick', title: '지울 빠른 할 일',
    date: '2026-09-03', now: T1,
  }).state;
  const quickRef = toPersonalWorkspacePocQuickItemRef('trash-quick');
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'reorder', context: 'date', contextKey: '2026-09-03',
    orderedRefKeys: [quickRef], now: T2,
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-to-trash', member: 'quick_item', memberRef: quickRef, now: T3,
  }).state;
  const removed = applyPersonalWorkspacePocTransition(state, {
    type: 'permanently-delete-from-trash', member: 'quick_item', memberRef: quickRef, now: T3,
  });
  assert.equal(removed.changed, true);
  assert.equal(removed.state.quickItems.length, 0);
  assert.equal(removed.state.placements[quickRef], undefined);
  assert.equal(removed.state.timelineOrders.length, 0);
  assert.equal(removed.state.undo, undefined);
  assert.equal(isPersonalWorkspacePocState(JSON.parse(JSON.stringify(removed.state))), true);
});

test('one recurrence occurrence moves, completes, reopens, undoes, and reloads without mutating its source Item', () => {
  const materialized = materializePersonalWorkspacePocAuthoring({
    handoffId: 'repeat-state-handoff',
    documentId: 'repeat-state-document',
    revisionId: 'repeat-state-revision',
    rawText: '# 반복 Flow\n- [ ] 아침 스트레칭\n  - 날짜: 2026-09-03\n  - 반복: 매일\n  - 반복 종료: 3회',
    committedAt: T0,
  });
  assert.equal(materialized.ok, true);
  if (!materialized.ok) return;
  const flowRef = materialized.flow.ref;
  const sourceItemRef = materialized.flow.items[0].ref;
  const originalDate = '2026-09-03';
  const expanded = expandPersonalWorkspacePocOccurrences({
    sourceItemRef,
    startDate: originalDate,
    recurrence: '매일',
    recurrenceEnd: '3회',
  });
  assert.equal(expanded.ok, true);
  if (!expanded.ok) return;
  const occurrenceId = expanded.manifest.rows[0].occurrenceId;
  const model: PersonalWorkspacePocReadModel = {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    flows: [materialized.flow],
  };
  const sourceBytes = JSON.stringify(model);
  const initial = createPersonalWorkspacePocState(T0);

  const moved = applyPersonalWorkspacePocTransition(initial, {
    type: 'move-occurrence-date', occurrenceId, sourceItemRef, originalDate,
    date: '2026-09-05', now: T1,
  });
  assert.equal(moved.changed, true);
  assert.equal(moved.state.occurrencePlacements?.[occurrenceId]?.date, '2026-09-05');
  const same = applyPersonalWorkspacePocTransition(moved.state, {
    type: 'move-occurrence-date', occurrenceId, sourceItemRef, originalDate,
    date: '2026-09-05', now: T2,
  });
  assert.equal(same.changed, false);
  assert.strictEqual(same.state, moved.state);

  const completed = applyPersonalWorkspacePocTransition(moved.state, {
    type: 'complete-occurrence', occurrenceId, sourceItemRef, originalDate,
    completed: true, now: T2,
  });
  assert.equal(completed.changed, true);
  assert.equal(completed.state.occurrenceCompletions?.[occurrenceId]?.status, 'completed');
  const undone = applyPersonalWorkspacePocTransition(completed.state, { type: 'undo', now: T3 });
  assert.equal(undone.changed, true);
  assert.equal(undone.state.occurrenceCompletions?.[occurrenceId], undefined);
  assert.equal(undone.state.occurrencePlacements?.[occurrenceId]?.date, '2026-09-05');

  const reopened = applyPersonalWorkspacePocTransition(completed.state, {
    type: 'complete-occurrence', occurrenceId, sourceItemRef, originalDate,
    completed: false, now: T3,
  });
  assert.equal(reopened.changed, true);
  assert.equal(reopened.state.occurrenceCompletions?.[occurrenceId]?.status, 'open');
  assert.equal(isPersonalWorkspacePocState(JSON.parse(JSON.stringify(reopened.state))), true);
  assert.deepEqual(validatePersonalWorkspacePocStateReferences(reopened.state, model), { ok: true });
  assert.equal(JSON.stringify(model), sourceBytes);

  const malformed = applyPersonalWorkspacePocTransition(initial, {
    type: 'move-occurrence-date', occurrenceId: 'foreign', sourceItemRef, originalDate,
    date: '2026-09-05', now: T1,
  });
  assert.equal(malformed.changed, false);
  assert.equal(malformed.error, 'invalid-occurrence-identity');
  assert.strictEqual(malformed.state, initial);

  const corruptReload = structuredClone(moved.state) as typeof moved.state;
  const persisted = corruptReload.occurrencePlacements?.[occurrenceId];
  assert.ok(persisted);
  corruptReload.occurrencePlacements = { foreign: { ...persisted, occurrenceId: 'foreign' } };
  assert.equal(isPersonalWorkspacePocState(corruptReload), false);
});
