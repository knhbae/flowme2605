import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createAlphaSyntheticFixtures } from './alpha-persistence/synthetic-fixtures';
import { programTaskProgress } from './execution';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

// Every id the list can show, plus subchecks and an unknown id that take the direct path.
function sameAsModel(text: TextWorkspaceState, label: string) {
  const read = programTaskProgress(text);
  const ids = new Set([...M.tasks(text).map(task => task.id), 'missing-id']);
  for (const doc of text.documents) for (const item of M.parseDocument(doc, text).items) ids.add(item.id);
  for (const id of ids) assert.deepEqual(read(id), { latest: M.latestProgress(text, id), current: M.currentProgress(text, id) }, `${label}: ${id}`);
  return ids.size;
}

test('the progress table gives the same latest record and current percent as asking the model per row', () => {
  let checked = 0;
  for (const fixture of createAlphaSyntheticFixtures())
    for (const [actorId, space] of Object.entries(fixture.envelope.data.spaces)) checked += sameAsModel(space.text, `${fixture.name}/${actorId}`);
  assert.ok(checked > 10, `checked ${checked} ids`);
});

test('checkbox history, a numeric token, a reopened task and a broken text all match', () => {
  let state = { version: 11, folders: [{ id: 'f', title: '합성', parentId: null }], documents: [{ id: 'd', title: '합성', folder: '합성', folderId: 'f', lines: [] }],
    flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as unknown as TextWorkspaceState;
  state = M.editText(state, 'd', '[2026-10-01]\n- [ ] 기록 있는 할 일\n- [ ] 다시 연 할 일\n- [30%] 숫자로 쓴 할 일\n- [ ] 기록 없는 할 일\n  - [ ] 하위 확인');
  const id = (title: string) => M.tasks(state).find(task => task.title === title)!.id;
  state = M.recordProgress(state, id('기록 있는 할 일'), '2026-10-02', 40);
  state = M.recordProgress(state, id('기록 있는 할 일'), '2026-10-01', 10);
  state = M.recordProgress(state, id('다시 연 할 일'), '2026-10-01', 100);
  state = M.recordProgress(state, id('다시 연 할 일'), '2026-10-03', 20);
  state = M.recordProgress(state, id('숫자로 쓴 할 일'), '2026-10-02', 60);
  assert.equal(state.progressRecords.length, 5);
  assert.deepEqual(programTaskProgress(state)(id('기록 있는 할 일')), { latest: { date: '2026-10-02', percent: 40 }, current: 40 });
  sameAsModel(state, 'written');
  const broken = { ...state, version: 10 } as unknown as TextWorkspaceState;
  assert.deepEqual(programTaskProgress(broken)(id('기록 있는 할 일')), { latest: null, current: null });
  sameAsModel(broken, 'broken');
});

test('today and classification rows read the table, not the model once per row', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('executionList.map(item =>'), end = source.indexOf('className={styles.task} data-task-id', start);
  assert.ok(start > 0 && end > start);
  const rows = source.slice(start, end);
  assert.match(rows, /taskProgress\(task\.id\)/);
  assert.doesNotMatch(rows, /M\.(latestProgress|currentProgress|progressHistory)\(/);
  assert.match(source, /useMemo\(\(\) => programTaskProgress\(space\.text\), \[space\.text\]\)/);
});
