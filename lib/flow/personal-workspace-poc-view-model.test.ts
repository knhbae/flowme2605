import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  toPersonalWorkspacePocQuickItemRef,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { applyPersonalWorkspacePocTransition, createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import {
  buildPersonalWorkspacePocTaskGroups,
  buildPersonalWorkspacePocTasks,
  getPersonalWorkspacePocFolderPath,
} from './personal-workspace-poc-view-model';

const NOW = '2026-09-01T00:00:00.000Z';
const flowRef = toPersonalWorkspacePocFlowRef('copy', 'flow');
const firstRef = toPersonalWorkspacePocFlowItemRef('copy', 'flow', 'first');
const secondRef = toPersonalWorkspacePocFlowItemRef('copy', 'flow', 'second');
const model: PersonalWorkspacePocReadModel = {
  version: PERSONAL_WORKSPACE_POC_VERSION,
  flows: [{
    ref: flowRef,
    savedCopyId: 'copy',
    flowId: 'flow',
    sourceSlug: 'source',
    title: '테스트 Flow',
    origin: 'canonical-personal-copy',
    items: [
      {
        ref: firstRef,
        savedCopyId: 'copy',
        flowId: 'flow',
        itemId: 'first',
        title: '첫 일',
        description: '장소: 시민회관\n자료: https://example.com/guide\n완료 기준: 접수를 마쳤다',
        sourceTimingLabel: 'D-1 · 10:00 · Asia/Seoul',
        sourceOrder: 0,
        sourceDate: '2026-09-01',
      },
      { ref: secondRef, savedCopyId: 'copy', flowId: 'flow', itemId: 'second', title: '둘째 일', sourceOrder: 1, sourceDate: '2026-08-31' },
    ],
  }],
};

test('Flow Items inherit the parent Flow folder and source dates remain projections', () => {
  let state = createPersonalWorkspacePocState(NOW);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'root', title: '루트', now: '2026-09-01T00:01:00.000Z',
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-folder', folderId: 'child', title: '하위', parentFolderId: 'root', now: '2026-09-01T00:02:00.000Z',
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-folder', member: 'saved_flow', memberRef: flowRef, folderId: 'child', now: '2026-09-01T00:03:00.000Z',
  }).state;
  const tasks = buildPersonalWorkspacePocTasks(model, state);
  assert.equal(tasks.every((task) => task.folderId === 'child'), true);
  assert.equal(tasks.find((task) => task.ref === firstRef)?.date, '2026-09-01');
  assert.equal(getPersonalWorkspacePocFolderPath(state, 'child'), '루트 / 하위');
});

test('Flow Item descriptions and source timing survive the task projection', () => {
  const task = buildPersonalWorkspacePocTasks(
    model,
    createPersonalWorkspacePocState(NOW),
  ).find((candidate) => candidate.ref === firstRef);

  assert.equal(
    task?.description,
    '장소: 시민회관\n자료: https://example.com/guide\n완료 기준: 접수를 마쳤다',
  );
  assert.equal(task?.sourceTimingLabel, 'D-1 · 10:00 · Asia/Seoul');
});

test('Today includes today plus open overdue, while week/month/undated remain distinct projections', () => {
  let state = createPersonalWorkspacePocState(NOW);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-quick-item', quickItemId: 'undated', title: '날짜 없는 일', now: '2026-09-01T00:01:00.000Z',
  }).state;
  const tasks = buildPersonalWorkspacePocTasks(model, state);
  const today = buildPersonalWorkspacePocTaskGroups(tasks, state, 'today', '2026-09-01');
  assert.deepEqual(today.map((group) => group.label), ['지난 미완료', '오늘']);
  assert.equal(buildPersonalWorkspacePocTaskGroups(tasks, state, 'week', '2026-09-01').length, 2);
  assert.equal(buildPersonalWorkspacePocTaskGroups(tasks, state, 'month', '2026-09-01').length, 1);
  assert.equal(buildPersonalWorkspacePocTaskGroups(tasks, state, 'undated', '2026-09-01')[0].tasks.length, 1);
});

test('manual order projects onto one context and reset leaves other contexts untouched', () => {
  let state = createPersonalWorkspacePocState(NOW);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-date', itemRef: secondRef, currentDate: '2026-08-31', date: '2026-09-01', now: '2026-09-01T00:01:00.000Z',
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'reorder',
    context: 'date',
    contextKey: '2026-09-01',
    currentOrderedRefKeys: [firstRef, secondRef],
    orderedRefKeys: [secondRef, firstRef],
    now: '2026-09-01T00:02:00.000Z',
  }).state;
  const group = buildPersonalWorkspacePocTaskGroups(
    buildPersonalWorkspacePocTasks(model, state),
    state,
    'today',
    '2026-09-01',
  ).find((candidate) => candidate.context === 'date');
  assert.deepEqual(group?.tasks.map((task) => task.ref), [secondRef, firstRef]);
  assert.equal(group?.manualOrder, true);
});

test('trash and permanent-deletion lifecycle entries are absent from every active task projection', () => {
  let state = createPersonalWorkspacePocState(NOW);
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'create-quick-item', quickItemId: 'trash-view', title: '숨길 빠른 일',
    date: '2026-09-01', now: '2026-09-01T00:01:00.000Z',
  }).state;
  const quickRef = toPersonalWorkspacePocQuickItemRef('trash-view');
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-to-trash', member: 'saved_flow', memberRef: flowRef,
    now: '2026-09-01T00:02:00.000Z',
  }).state;
  state = applyPersonalWorkspacePocTransition(state, {
    type: 'move-to-trash', member: 'quick_item', memberRef: quickRef,
    now: '2026-09-01T00:03:00.000Z',
  }).state;

  assert.deepEqual(buildPersonalWorkspacePocTasks(model, state), []);
  assert.deepEqual(
    buildPersonalWorkspacePocTaskGroups([], state, 'today', '2026-09-01'),
    [],
  );
});
