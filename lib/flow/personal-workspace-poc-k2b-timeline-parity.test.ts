import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import type { PersonalWorkspacePocTimelineOrder } from './personal-workspace-poc-contract';
import { createPersonalWorkspacePocState } from './personal-workspace-poc-state';
import { buildPersonalWorkspacePocTaskGroups, type PersonalWorkspacePocTask, type PersonalWorkspacePocView } from './personal-workspace-poc-view-model';

type Group = { context: string; contextKey: string; label: string; ids: string[]; manualOrder: boolean };
const T = createRequire(import.meta.url)('../../docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-context.js') as {
  addPlainDays(date: string, amount: number): string;
  selectTimelineGroups(input: unknown): { ok: boolean; groups: Group[] };
};
const views: PersonalWorkspacePocView[] = ['today', 'week', 'month', 'undated'];
const NOW = '2026-09-05T00:00:00.000Z';
const task = (ref: string, date: string | undefined, sourceOrder: number, extra: Partial<PersonalWorkspacePocTask> = {}): PersonalWorkspacePocTask => ({
  ref, kind: 'flow_item', title: '같은 제목', date, sourceOrder, completed: false, timelinePolicy: 'auto', ...extra,
});

function compare(tasks: PersonalWorkspacePocTask[], today: string, orders: PersonalWorkspacePocTimelineOrder[] = []) {
  const state = { ...createPersonalWorkspacePocState(NOW), timelineOrders: orders };
  const before = JSON.stringify({ tasks, state });
  for (const view of views) {
    const react = buildPersonalWorkspacePocTaskGroups(tasks, state, view, today).map(group => ({
      context: group.context, contextKey: group.contextKey, label: group.label,
      ids: group.tasks.map(row => row.ref), manualOrder: group.manualOrder,
    }));
    const standalone = T.selectTimelineGroups({
      tasks: tasks.map(row => ({ id: row.ref, date: row.date ?? null, time: row.time, done: row.completed, sourceOrder: row.sourceOrder, excluded: row.timelinePolicy === 'excluded' })),
      localToday: today, view, timelineOrders: orders,
    });
    assert.equal(standalone.ok, true);
    assert.deepEqual(standalone.groups.map(({ context, contextKey, label, ids, manualOrder }) => ({ context, contextKey, label, ids, manualOrder })), react, `${today} ${view}`);
  }
  assert.equal(JSON.stringify({ tasks, state }), before);
}

for (const today of ['2026-09-01', '2026-09-06', '2026-09-07', '2026-09-30', '2026-12-31', '2027-01-01', '2024-02-29']) {
  test(`K2B-R common clock ${today}: four view memberships, date groups and default orders match current React`, () => {
    const tasks = Array.from({ length: 19 }, (_, index) => task(`flow-item:copy:flow:item-${index}`, T.addPlainDays(today, index - 9), index, {
      time: index % 2 ? '09:00' : '15:00', completed: index % 3 === 0, timelinePolicy: index % 5 === 0 ? 'excluded' : 'auto',
    }));
    tasks.push(task('quick-item:local-device-poc-v1:undated', undefined, 100_000, { kind: 'quick_item' }));
    tasks.push(task('quick-item:local-device-poc-v1:undated-done', undefined, 100_001, { kind: 'quick_item', completed: true }));
    compare(tasks, today);
  });
}

test('K2B-R a date order is identical across three date views with duplicate titles and different copies', () => {
  const ids = ['flow-item:copy-a:flow:item', 'flow-item:copy-b:flow:item', 'quick-item:local-device-poc-v1:item'];
  const tasks = ids.map((id, index) => task(id, '2026-09-05', index, { time: ['08:00', '10:00', undefined][index], kind: index === 2 ? 'quick_item' : 'flow_item' }));
  compare(tasks, '2026-09-05', [{ context: 'date', contextKey: '2026-09-05', orderedRefKeys: ids.slice().reverse(), revision: 1 }]);
});

test('K2B-R overdue and actual-date records stay independent in the existing React and new selector', () => {
  const tasks = [task('a', '2026-09-03', 0), task('b', '2026-09-04', 1), task('c', '2026-09-04', 2), task('u', undefined, 3)];
  compare(tasks, '2026-09-05', [
    { context: 'overdue', contextKey: '2026-09-05', orderedRefKeys: ['c', 'a', 'b'], revision: 1 },
    { context: 'date', contextKey: '2026-09-04', orderedRefKeys: ['b', 'c'], revision: 2 },
    { context: 'undated', contextKey: 'undated', orderedRefKeys: ['u'], revision: 3 },
  ]);
});

test('K2B-R removed refs are filtered only in read output and new refs append in both selectors', () => {
  compare([task('a', '2026-09-05', 0), task('b', '2026-09-05', 1), task('new', '2026-09-05', 2, { time: '07:00' })], '2026-09-05', [
    { context: 'date', contextKey: '2026-09-05', orderedRefKeys: ['removed', 'b', 'a'], revision: 1 },
  ]);
});

test('K2B-R clock advance, personal completion and reopening agree without source/date mutation', () => {
  const tasks = [task('a', '2026-09-05', 0), task('b', '2026-09-05', 1, { completed: true })];
  compare(tasks, '2026-09-05');
  compare(tasks, '2026-09-06');
  compare(tasks.map(row => ({ ...row, completed: false })), '2026-09-06');
});

test('K2B-R invalid display date produces no groups; new selector exposes a separate explicit failure', () => {
  const state = createPersonalWorkspacePocState(NOW);
  for (const today of ['invalid', '2026-02-30']) {
    assert.deepEqual(buildPersonalWorkspacePocTaskGroups([], state, 'today', today), []);
    const result = T.selectTimelineGroups({ tasks: [], localToday: today, view: 'today' });
    assert.equal(result.ok, false);
    assert.deepEqual(result.groups, []);
  }
});
