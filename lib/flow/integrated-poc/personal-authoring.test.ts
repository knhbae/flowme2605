import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERSONAL_AUTHORING_LIMITS, calculatePersonalRounds, previewPersonalRounds, resolvePersonalTaskDate, validatePersonalAuthoring, preservesPersonalAuthoringHistory,
  planPersonalExecutionAnchorChange,
  type PersonalAuthoringV1, type PersonalFlowVersion, type PersonalMaterializedRound, type PersonalRepeatRule,
  type PersonalSeriesOwner, type PersonalTaskReference, type PersonalActionSnapshot, type PersonalStandaloneExecution,
} from './personal-authoring';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const relative = (taskId: string, offsetDays = 0, parentTaskId: string | null = null): PersonalTaskReference =>
  ({ taskId, parentTaskId, date: { kind: 'relative', offsetDays } });
const action = (ref: PersonalTaskReference): PersonalActionSnapshot => ({
  id: `node-${ref.taskId}`, parentId: ref.parentTaskId ? `node-${ref.parentTaskId}` : null, kind: 'action', taskId: ref.taskId,
  title: `고정 제목 ${ref.taskId}`, memo: `고정 메모 ${ref.taskId}\n두 번째 줄`, time: null, scopeId: 'folder-unfiled',
  subchecks: ref.taskId === 'child' ? [{ id: 'snapshot-simple', parentId: null, title: '체크 원문', memo: '체크 메모',
    time: null, scopeId: 'folder-unfiled', date: { kind: 'inherit' } }] : [],
});
const versionOf = (taskRefs: PersonalTaskReference[], id = 'flow-version-1'): PersonalFlowVersion => ({ id, taskRefs, nodes: taskRefs.map(action) });
const version = (): PersonalFlowVersion => versionOf([
  relative('parent', -7), relative('child', 1, 'parent'),
  { taskId: 'fixed', parentTaskId: null, date: { kind: 'fixed', date: '2026-11-05' } },
]);
const daily = (count = 4, startDate = '2026-11-10'): PersonalRepeatRule => ({ kind: 'daily', startDate, end: { kind: 'count', count } });
function nativeFixture(): TextWorkspaceState {
  const native = createEmptyTextWorkspace();
  native.documents.push({ id: 'source', title: '원본', folder: '미분류', folderId: 'folder-unfiled', lines: [
    { id: 'parent', text: '- [0%] 부모 현재0' },
    { id: 'parent-note', text: '  - 메모: 부모 메모' },
    { id: 'child', text: '  - [25%] 독립 자식' },
    { id: 'simple', text: '    - [ ] 기존 간단 체크' },
    { id: 'fixed', text: '- [ ] 고정 항목' },
    { id: 'single', text: '- [ ] 단독 항목' },
  ] });
  for (const taskId of ['parent', 'child', 'fixed', 'single']) {
    native.taskScopes[taskId] = 'folder-unfiled'; native.itemScopes[taskId] = 'folder-unfiled';
  }
  native.itemScopes.simple = 'folder-unfiled';
  native.progressRecords.push({ taskId: 'parent', date: '2026-10-20', percent: 25 });
  native.flows.push({ id: 'flow', title: '개인 Flow', folder: '미분류', folderId: 'folder-unfiled',
    private: true, sourceVersion: 'flow-version-1', lines: [] });
  assert.equal(M.validate(native), true);
  return native;
}
function owner(): PersonalAuthoringV1 {
  return { version: 1, flows: [{ flowId: 'flow', currentVersionId: 'flow-version-1', versions: [version()] }], series: [] };
}
function flowSeries(): PersonalSeriesOwner {
  return { id: 'series-flow', source: { kind: 'flow', flowId: 'flow', versionId: 'flow-version-1' },
    currentRuleVersionId: 'rule-1', ruleVersions: [{ id: 'rule-1', rule: daily() }], stopped: false, rounds: [] };
}
function taskSeries(taskId = 'single'): PersonalSeriesOwner {
  return { id: `series-${taskId}`, source: { kind: 'task', taskId, version: versionOf([relative(taskId)], `version-${taskId}`) },
    currentRuleVersionId: `rule-${taskId}`, ruleVersions: [{ id: `rule-${taskId}`, rule: daily() }], stopped: false, rounds: [] };
}
/** Test-only native materialization. The production module never allocates these IDs or writes native data. */
function withRound(native: TextWorkspaceState, series: PersonalSeriesOwner, index = 1, anchorDate = '2026-11-10'): PersonalMaterializedRound {
  const config = series.source.kind === 'flow' ? version() : series.source.version;
  const calculated = calculatePersonalRounds(config, { rule: daily(index), targetKind: series.source.kind });
  assert.equal(calculated.ok, true);
  if (!calculated.ok) throw Error('calculation rejected');
  const items = calculated.value.rounds[index - 1].items;
  const docId = `execution-${series.id}-${index}`, mapping: Record<string, string> = {};
  for (const item of items) mapping[item.taskId] = `${docId}-${item.taskId}`;
  native.documents.push({ id: docId, title: '새 실행', folder: '미분류', folderId: 'folder-unfiled', lines: items.map(item => ({
    id: mapping[item.taskId], text: `${item.parentTaskId ? '  ' : ''}- [ ] 새 ${item.taskId}`,
  })) });
  for (const taskId of Object.values(mapping)) {
    native.taskScopes[taskId] = 'folder-unfiled'; native.itemScopes[taskId] = 'folder-unfiled';
  }
  assert.equal(M.validate(native), true);
  const result = { id: `round-${series.id}-${index}`, index, anchorDate, ruleVersionId: series.currentRuleVersionId,
    executionDocumentId: docId, taskIds: mapping };
  series.rounds.push(result);
  return result;
}
function freeze<T>(v: T): T {
  if (v && typeof v === 'object') { for (const child of Object.values(v)) freeze(child); Object.freeze(v); }
  return v;
}
/** Integration-style fixture builder only; production ID allocation/body editing remain outside the pure module. */
function withExecution(native: TextWorkspaceState, data: PersonalAuthoringV1, executionId = 'standalone-1', anchorDate = '2026-11-10'): PersonalStandaloneExecution {
  const flow = data.flows[0], version = flow.versions.find(v => v.id === flow.currentVersionId)!;
  const docId = `document-${executionId}`, taskIds = Object.fromEntries(version.taskRefs.map(ref => [ref.taskId, `${executionId}-${ref.taskId}`]));
  const lines: { id: string; text: string }[] = [], depths = new Map<string, number>();
  const property = (lineId: string, depth: number, name: string, value: string) => {
    for (const [index, part] of value.split('\n').entries()) lines.push({ id: `${lineId}-${name}-${index}`, text: `${'  '.repeat(depth)}- ${name}: ${part}` });
  };
  for (const ref of version.taskRefs) {
    const node = version.nodes.find(n => n.kind === 'action' && n.taskId === ref.taskId) as PersonalActionSnapshot;
    const taskId = taskIds[ref.taskId], depth = ref.parentTaskId === null ? 0 : depths.get(ref.parentTaskId)! + 1;
    depths.set(ref.taskId, depth);
    lines.push({ id: taskId, text: `${'  '.repeat(depth)}- [ ] ${node.title}` });
    native.taskScopes[taskId] = node.scopeId; native.itemScopes[taskId] = node.scopeId;
    if (node.memo) property(taskId, depth + 1, '메모', node.memo);
    if (node.time) property(taskId, depth + 1, '시간', node.time);
    const date = resolvePersonalTaskDate(ref.date, anchorDate); assert.equal(date.ok, true);
    if (!date.ok) throw Error('invalid fixture date');
    property(taskId, depth + 1, '날짜', date.value ?? '미정');
    const checkDepths = new Map<string, number>();
    for (const check of node.subchecks) {
      const checkId = `${executionId}-${check.id}`, checkDepth = check.parentId === null ? depth + 1 : checkDepths.get(check.parentId)! + 1;
      checkDepths.set(check.id, checkDepth); native.itemScopes[checkId] = check.scopeId;
      lines.push({ id: checkId, text: `${'  '.repeat(checkDepth)}- [ ] ${check.title}` });
      if (check.memo) property(checkId, checkDepth + 1, '메모', check.memo);
      if (check.time) property(checkId, checkDepth + 1, '시간', check.time);
      if (check.date.kind !== 'inherit') {
        const date = resolvePersonalTaskDate(check.date, anchorDate); assert.equal(date.ok, true);
        if (!date.ok) throw Error('invalid fixture date');
        property(checkId, checkDepth + 1, '날짜', date.value ?? '미정');
      }
    }
  }
  native.documents.push({ id: docId, title: '독립 실행', folder: '미분류', folderId: 'folder-unfiled', lines });
  assert.equal(M.validate(native), true);
  const execution = { id: executionId, flowId: flow.flowId, versionId: version.id, anchorDate, executionDocumentId: docId, taskIds };
  data.executions = [...data.executions ?? [], execution];
  return execution;
}

test('optional owner is explicit; validated JSON round-trips without modifying current0 / past25 or subchecks', () => {
  const native = nativeFixture(), data = owner(), before = clone(native);
  assert.equal(validatePersonalAuthoring(undefined, native), false);
  assert.equal(validatePersonalAuthoring({ version: 1, flows: [], series: [] }, native), true);
  assert.equal(validatePersonalAuthoring(data, native), true);
  assert.equal(validatePersonalAuthoring(JSON.parse(JSON.stringify(data)), native), true);
  assert.equal(M.currentProgress(native, 'parent'), 0);
  assert.deepEqual(M.progressHistory(native, 'parent'), [{ date: '2026-10-20', percent: 25 }]);
  assert.deepEqual(native, before);
});

test('relative calendar days cross month/leap/year boundaries without time-zone arithmetic', () => {
  assert.deepEqual(resolvePersonalTaskDate({ kind: 'relative', offsetDays: -7 }, '2026-11-10'), { ok: true, value: '2026-11-03' });
  assert.deepEqual(resolvePersonalTaskDate({ kind: 'relative', offsetDays: 1 }, '2024-02-28'), { ok: true, value: '2024-02-29' });
  assert.deepEqual(resolvePersonalTaskDate({ kind: 'relative', offsetDays: 1 }, '2023-02-28'), { ok: true, value: '2023-03-01' });
  assert.deepEqual(resolvePersonalTaskDate({ kind: 'relative', offsetDays: 1 }, '0099-12-31'), { ok: true, value: '0100-01-01' });
  assert.deepEqual(resolvePersonalTaskDate({ kind: 'relative', offsetDays: 1 }, '2026-03-08'), { ok: true, value: '2026-03-09' });
  assert.deepEqual(resolvePersonalTaskDate({ kind: 'fixed', date: '2026-11-05' }, '2026-11-17'), { ok: true, value: '2026-11-05' });
  assert.deepEqual(resolvePersonalTaskDate({ kind: 'undated' }, '2026-11-10'), { ok: true, value: null });
});

for (const [name, date, anchor] of [
  ['invalid leap day', { kind: 'fixed', date: '2026-02-29' }, '2026-11-10'],
  ['year zero', { kind: 'undated' }, '0000-01-01'],
  ['noncanonical date', { kind: 'undated' }, '2026-1-01'],
  ['fractional offset', { kind: 'relative', offsetDays: 0.5 }, '2026-11-10'],
  ['invalid offset', { kind: 'relative', offsetDays: Number.NaN }, '2026-11-10'],
  ['negative zero', { kind: 'relative', offsetDays: -0 }, '2026-11-10'],
  ['underflow', { kind: 'relative', offsetDays: -1 }, '0001-01-01'],
  ['overflow', { kind: 'relative', offsetDays: 1 }, '9999-12-31'],
] as const) test(`date rejection: ${name}`, () => {
  assert.equal(resolvePersonalTaskDate(date as Parameters<typeof resolvePersonalTaskDate>[0], anchor).ok, false);
});

test('daily input defaults to four; preview is exactly the first three virtual rounds, not three saved rounds', t => {
  const config = freeze(version()), options = freeze({ rule: { kind: 'daily' as const, startDate: '2026-11-10' } });
  const before = JSON.stringify({ config, options });
  t.mock.method(globalThis.crypto, 'randomUUID', () => { throw Error('must not issue IDs'); });
  t.mock.method(globalThis.crypto, 'getRandomValues', () => { throw Error('must not issue IDs'); });
  t.mock.method(Math, 'random', () => { throw Error('must not issue IDs'); });
  t.mock.method(M, 'addTask', () => { throw Error('must not write native tasks'); });
  t.mock.method(M, 'addDocument', () => { throw Error('must not write native documents'); });
  const full = calculatePersonalRounds(config, options), preview = previewPersonalRounds(config, options);
  assert.equal(full.ok, true); assert.equal(preview.ok, true);
  if (!full.ok || !preview.ok) return;
  assert.equal(full.value.totalRounds, PERSONAL_AUTHORING_LIMITS.defaultRounds);
  assert.deepEqual(full.value.rounds.map(r => r.anchorDate), ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
  assert.deepEqual(preview.value.rounds, full.value.rounds.slice(0, 3));
  assert.deepEqual(previewPersonalRounds(config, options), preview);
  assert.equal(JSON.stringify({ config, options }), before);
  assert.equal(preview.value.rounds.some(r => 'id' in r || 'taskIds' in r || 'executionDocumentId' in r), false);
});

test('selected weekdays use Sunday=0, include matching start, and end date is inclusive', () => {
  const r = calculatePersonalRounds(version(), { rule: { kind: 'weekdays', startDate: '2026-11-01', weekdays: [0, 2], end: { kind: 'until', date: '2026-11-10' } } });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual(r.value.rounds.map(x => x.anchorDate), ['2026-11-01', '2026-11-03', '2026-11-08', '2026-11-10']);
});

test('fixed items appear only in first Flow round; relative/undated items keep their own dates', () => {
  const config = version(), extra: PersonalTaskReference = { taskId: 'single', parentTaskId: null, date: { kind: 'undated' } };
  config.taskRefs.push(extra); config.nodes.push(action(extra));
  const result = calculatePersonalRounds(config, { rule: daily(2) });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.rounds[0].items.map(x => x.date), ['2026-11-03', '2026-11-11', '2026-11-05', null]);
  assert.deepEqual(result.value.rounds[1].items.map(x => x.taskId), ['parent', 'child', 'single']);
  assert.equal(result.value.rounds[1].items[0].date, '2026-11-04');
  // An independently started copy is a separate call beginning at index one.
  const independent = calculatePersonalRounds(config, { rule: daily(1, '2026-11-17') });
  assert.equal(independent.ok, true);
  if (independent.ok) assert.equal(independent.value.rounds[0].items.find(x => x.taskId === 'fixed')?.date, '2026-11-05');
});

test('a fixed parent and its subtree are excluded together; no orphan or empty execution is proposed', () => {
  const config = version(); config.taskRefs[0].date = { kind: 'fixed', date: '2026-11-05' };
  config.taskRefs[2].date = { kind: 'undated' };
  const result = calculatePersonalRounds(config, { rule: daily(2) });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.rounds[1].items.map(x => x.taskId), ['fixed']);
  assert.equal(calculatePersonalRounds(versionOf([config.taskRefs[0]], 'fixed-only'), { rule: daily(2) }).ok, false);
});

test('single Task repeat uses the rule anchor for new tasks and does not reinterpret the source date', () => {
  const config = versionOf([{ taskId: 'single', parentTaskId: null, date: { kind: 'fixed', date: '2020-01-01' } }], 'single-version');
  const result = calculatePersonalRounds(config, { rule: daily(2), targetKind: 'task' });
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value.rounds.map(x => x.items[0].date), ['2026-11-10', '2026-11-11']);
  assert.equal(config.taskRefs[0].date.kind === 'fixed' && config.taskRefs[0].date.date, '2020-01-01');
});

test('materialized dates are reused across rule versions; new count includes old rounds and cannot backfill', () => {
  const materialized = freeze([{ index: 1, anchorDate: '2026-11-10' }]);
  const result = calculatePersonalRounds(version(), { rule: daily(), materialized });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.totalRounds, 4);
    assert.deepEqual(result.value.rounds.map(x => [x.index, x.anchorDate]), [[2, '2026-11-11'], [3, '2026-11-12'], [4, '2026-11-13']]);
    assert.equal(result.value.rounds.some(x => x.items.some(item => item.taskId === 'fixed')), false);
  }
  assert.equal(calculatePersonalRounds(version(), { rule: daily(12), materialized }).ok, true);
  assert.equal(calculatePersonalRounds(version(), { rule: daily(12, '2026-11-11'), materialized }).ok, false);
  assert.equal(calculatePersonalRounds(version(), { rule: daily(4, '2026-11-09'), materialized }).ok, false);
});

for (const [name, rule] of [
  ['zero count', daily(0)], ['thirteen', daily(13)], ['fractional', daily(2.5)],
  ['reverse until', { kind: 'daily', startDate: '2026-11-10', end: { kind: 'until', date: '2026-11-09' } }],
  ['until exceeds cap', { kind: 'daily', startDate: '2026-11-10', end: { kind: 'until', date: '9999-12-31' } }],
  ['empty weekdays', { kind: 'weekdays', startDate: '2026-11-10', weekdays: [] }],
  ['duplicate weekdays', { kind: 'weekdays', startDate: '2026-11-10', weekdays: [1, 1] }],
  ['bad weekday', { kind: 'weekdays', startDate: '2026-11-10', weekdays: [7] }],
  ['no matching day', { kind: 'weekdays', startDate: '2026-11-10', weekdays: [1], end: { kind: 'until', date: '2026-11-11' } }],
  ['empty end', { kind: 'daily', startDate: '2026-11-10', end: {} }],
  ['undefined end', { kind: 'daily', startDate: '2026-11-10', end: undefined }],
  ['unbounded', { kind: 'daily', startDate: '2026-11-10', end: { kind: 'never' } }],
  ['monthly', { kind: 'monthly', startDate: '2026-11-10' }],
] as const) test(`rule rejection: ${name}`, () => {
  assert.equal(calculatePersonalRounds(version(), { rule: rule as Parameters<typeof calculatePersonalRounds>[1]['rule'] }).ok, false);
});

test('calendar upper bound and exactly twelve rounds are checked before preview truncation', () => {
  assert.equal(calculatePersonalRounds(version(), { rule: daily(12) }).ok, true);
  assert.equal(previewPersonalRounds(version(), { rule: { kind: 'daily', startDate: '2026-11-01', end: { kind: 'until', date: '2026-11-13' } } }).ok, false);
  assert.equal(calculatePersonalRounds(version(), { rule: daily(2, '9999-12-31') }).ok, false);
});

test('Flow round mappings persist fresh native IDs and original records; later native exceptions stay native', () => {
  const native = nativeFixture(), data = owner(), series = flowSeries(); data.series.push(series);
  const originalRecords = clone(native.progressRecords), round = withRound(native, series);
  assert.equal(validatePersonalAuthoring(data, native), true);
  assert.deepEqual(native.progressRecords, originalRecords);
  native.progressRecords.push({ taskId: round.taskIds.child, date: '2026-11-10', percent: 40 });
  const updated = M.updateTask(native, round.taskIds.child, { date: '2026-12-01', note: '이번 회차 예외' });
  assert.equal(validatePersonalAuthoring(data, updated), true);
  assert.deepEqual(native.progressRecords.filter(r => r.taskId === 'parent'), originalRecords);
  assert.equal('percent' in round || 'records' in round, false);
  const before = JSON.stringify(data);
  assert.equal(validatePersonalAuthoring(JSON.parse(before), updated), true);
  assert.equal(JSON.stringify(data), before);
});

test('new rule version and stopping preserve materialized round IDs / original rule and task records', () => {
  const native = nativeFixture(), data = owner(), series = flowSeries(); data.series.push(series);
  const round = withRound(native, series), before = clone(round);
  series.ruleVersions.push({ id: 'rule-2', rule: daily(2, '2026-11-15') }); series.currentRuleVersionId = 'rule-2';
  assert.equal(validatePersonalAuthoring(data, native), true);
  series.stopped = true;
  assert.equal(validatePersonalAuthoring(data, native), true);
  assert.deepEqual(series.rounds[0], before);
  assert.equal(series.rounds[0].ruleVersionId, 'rule-1');
});

test('same Task cannot have two active repeats or a Flow repeat and a Task repeat', () => {
  const native = nativeFixture(), data = owner(); data.series = [flowSeries(), taskSeries('child')];
  assert.equal(validatePersonalAuthoring(data, native), false);
  data.series[0].stopped = true;
  assert.equal(validatePersonalAuthoring(data, native), true);
  const duplicate = taskSeries('child'); duplicate.id = 'series-second';
  if (duplicate.source.kind === 'task') duplicate.source.version.id = 'version-second';
  duplicate.ruleVersions = [{ id: 'rule-second', rule: daily() }]; duplicate.currentRuleVersionId = 'rule-second';
  data.series.push(duplicate);
  assert.equal(validatePersonalAuthoring(data, native), false);
});

test('a parent with independent child Tasks cannot repeat alone; simple subchecks do not become Tasks', () => {
  const native = nativeFixture(), data = owner(); data.series = [taskSeries('parent')];
  assert.equal(validatePersonalAuthoring(data, native), false);
  data.series = [taskSeries('child')];
  assert.equal(validatePersonalAuthoring(data, native), true);
  data.series = [taskSeries('simple')];
  assert.equal(validatePersonalAuthoring(data, native), false);
});

for (const [name, edit] of [
  ['unknown Task', (d: PersonalAuthoringV1) => { d.flows[0].versions[0].taskRefs[0].taskId = 'missing'; }],
  ['duplicate Task', (d: PersonalAuthoringV1) => { d.flows[0].versions[0].taskRefs.push(relative('fixed')); }],
  ['orphan', (d: PersonalAuthoringV1) => { d.flows[0].versions[0].taskRefs[1].parentTaskId = 'missing'; }],
  ['self cycle', (d: PersonalAuthoringV1) => { d.flows[0].versions[0].taskRefs[0].parentTaskId = 'parent'; }],
  ['two-node cycle', (d: PersonalAuthoringV1) => { d.flows[0].versions[0].taskRefs[0].parentTaskId = 'child'; }],
  ['false native parent', (d: PersonalAuthoringV1) => { d.flows[0].versions[0].taskRefs[1].parentTaskId = null; }],
  ['duplicate version', (d: PersonalAuthoringV1) => { d.flows[0].versions.push(clone(d.flows[0].versions[0])); }],
  ['unknown current version', (d: PersonalAuthoringV1) => { d.flows[0].currentVersionId = 'missing'; }],
  ['duplicate Flow', (d: PersonalAuthoringV1) => { d.flows.push(clone(d.flows[0])); }],
  ['unknown Flow', (d: PersonalAuthoringV1) => { d.flows[0].flowId = 'missing'; }],
] as const) test(`owner rejection: ${name}`, () => {
  const native = nativeFixture(), data = owner(), before = clone(native); edit(data);
  assert.equal(validatePersonalAuthoring(data, native), false);
  assert.deepEqual(native, before);
});

test('native reference placements cannot masquerade as canonical task IDs', () => {
  let native = nativeFixture();
  native.documents.push({ id: 'linked-doc', title: '연결', folderId: 'folder-unfiled', folder: '미분류', lines: [] });
  native = M.linkTask(native, 'linked-doc', 0, 'single');
  const data = owner(), linkedId = M.getDocument(native, 'linked-doc')!.lines[0].id;
  data.flows[0].versions[0] = versionOf([relative(linkedId)]);
  assert.equal(validatePersonalAuthoring(data, native), false);
  data.flows[0].versions[0] = versionOf([relative('single')]);
  assert.equal(validatePersonalAuthoring(data, native), true);
});

test('mappings reject reused source ID, missing/foreign task, lost parent, duplicate round and wrong rule', () => {
  const native = nativeFixture(), data = owner(), series = flowSeries(); data.series.push(series);
  const round = withRound(native, series);
  for (const mutate of [
    (r: PersonalMaterializedRound) => { r.taskIds.parent = 'parent'; },
    (r: PersonalMaterializedRound) => { r.taskIds.parent = 'missing'; },
    (r: PersonalMaterializedRound) => { r.taskIds.child = r.taskIds.parent; },
    (r: PersonalMaterializedRound) => { delete r.taskIds.child; },
    (r: PersonalMaterializedRound) => { r.ruleVersionId = 'missing'; },
    (r: PersonalMaterializedRound) => { r.anchorDate = '2026-12-01'; },
  ]) {
    const changed = clone(data); mutate(changed.series[0].rounds[0]);
    assert.equal(validatePersonalAuthoring(changed, native), false);
  }
  const doubled = clone(data); doubled.series[0].rounds.push({ ...clone(round), id: 'another', index: 2 });
  assert.equal(validatePersonalAuthoring(doubled, native), false);
  const detached = clone(native), doc = M.getDocument(detached, round.executionDocumentId)!;
  doc.lines.find(l => l.id === round.taskIds.child)!.text = '- [ ] 자식 분리';
  assert.equal(M.validate(detached), true);
  assert.equal(validatePersonalAuthoring(data, detached), false);
});

test('strict JSON rejects unknown progress mirrors, accessors, cycles, sparse arrays and missing persisted end', () => {
  const native = nativeFixture(), data = owner();
  assert.equal(validatePersonalAuthoring({ ...data, progress: 25 }, native), false);
  const getter = Object.defineProperty({}, 'version', { enumerable: true, get() { throw Error('must not invoke getter'); } });
  assert.equal(validatePersonalAuthoring(getter, native), false);
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  assert.equal(validatePersonalAuthoring(cyclic, native), false);
  assert.equal(validatePersonalAuthoring({ ...data, series: new Array(1) }, native), false);
  const series = flowSeries(); data.series.push(series);
  delete (series.ruleVersions[0].rule as Partial<PersonalRepeatRule>).end;
  assert.equal(validatePersonalAuthoring(data, native), false);
  const broken = nativeFixture(); broken.taskScopes.parent = 'unknown-scope';
  assert.equal(validatePersonalAuthoring(owner(), broken), false);
});

test('frozen version reproduces steps, descriptions, action text/memo and subchecks after live native text changes', () => {
  const native = nativeFixture(), data = owner(), config = data.flows[0].versions[0];
  const actions = config.nodes as PersonalActionSnapshot[];
  actions[0].parentId = 'step'; actions[2].parentId = 'step';
  actions[1].subchecks.push({ id: 'nested-check', parentId: 'snapshot-simple', title: '하위 체크 원문', memo: '두 줄\n메모',
    time: '09:30', scopeId: 'folder-unfiled', date: { kind: 'relative', offsetDays: 1 } });
  config.nodes = [
    { id: 'step', parentId: null, kind: 'step', text: '준비 단계' },
    { id: 'description', parentId: 'step', kind: 'description', text: '설명 첫 줄\n\n설명 끝' },
    ...actions,
    { id: 'fixed-description', parentId: 'node-fixed', kind: 'description', text: '최초 고정 항목 설명' },
    { id: 'last-description', parentId: 'step', kind: 'description', text: '' },
  ];
  const snapshot = clone(config), current = M.updateTask(native, 'parent', { title: '나중 제목', note: '나중 메모', time: '22:00' });
  assert.equal(validatePersonalAuthoring(data, current), true);
  assert.equal(M.tasks(current).find(t => t.id === 'parent')!.title, '나중 제목');
  const result = calculatePersonalRounds(config, { rule: daily(2) });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.rounds[0].nodes, snapshot.nodes);
  assert.equal(result.value.rounds[1].nodes.some(n => n.id === 'node-fixed' || n.id === 'fixed-description'), false);
  const child = result.value.rounds[1].nodes.find(n => n.kind === 'action' && n.taskId === 'child') as PersonalActionSnapshot;
  assert.deepEqual(child.subchecks, actions[1].subchecks);
  assert.equal(result.value.rounds[0].nodes.find(n => n.id === 'node-parent')!.kind, 'action');
  (result.value.rounds[0].nodes.find(n => n.id === 'node-parent') as PersonalActionSnapshot).memo = '외부 결과 수정';
  child.subchecks[0].memo = '외부 결과 수정';
  assert.deepEqual(config, snapshot);
  assert.equal(JSON.stringify(result.value).includes('나중 제목'), false);
});

test('content snapshot requires exact action references, stable tree order and no progress/completion/records mirrors', () => {
  const native = nativeFixture();
  const edits: ((v: PersonalFlowVersion) => void)[] = [
    v => { v.nodes[0].parentId = 'node-child'; },
    v => { v.nodes[1].id = v.nodes[0].id; },
    v => { v.nodes.pop(); },
    v => { (v.nodes[0] as PersonalActionSnapshot).taskId = 'single'; },
    v => { Object.assign(v.nodes[0], { done: true }); },
    v => { Object.assign((v.nodes[1] as PersonalActionSnapshot).subchecks[0], { percent: 25 }); },
    v => { Object.assign(v.nodes[0], { records: [] }); },
    v => { (v.nodes[0] as PersonalActionSnapshot).scopeId = 'unknown-scope'; },
    v => { (v.nodes[1] as PersonalActionSnapshot).subchecks[0].parentId = 'snapshot-simple'; },
    v => { (v.nodes[1] as PersonalActionSnapshot).subchecks[0].id = v.nodes[0].id; },
  ];
  for (const edit of edits) {
    const data = owner(); edit(data.flows[0].versions[0]);
    assert.equal(validatePersonalAuthoring(data, native), false);
  }
});

test('history guard accepts a new immutable content version, rule version and stop, but rejects old snapshot rewrite/removal', () => {
  const native = nativeFixture(), before = owner(), series = flowSeries(); before.series.push(series); withRound(native, series);
  const next = clone(before), revision = clone(next.flows[0].versions[0]); revision.id = 'flow-version-2';
  (revision.nodes[0] as PersonalActionSnapshot).memo = '새 판본 메모';
  next.flows[0].versions.push(revision); next.flows[0].currentVersionId = revision.id;
  const nextNative = clone(native); nextNative.flows[0].sourceVersion = revision.id;
  next.series[0].ruleVersions.push({ id: 'rule-2', rule: daily(2, '2026-11-15') });
  next.series[0].currentRuleVersionId = 'rule-2'; next.series[0].stopped = true;
  assert.equal(validatePersonalAuthoring(next, nextNative), true);
  assert.equal(preservesPersonalAuthoringHistory(before, next), true);
  assert.equal(preservesPersonalAuthoringHistory(undefined, next), true);
  assert.equal(preservesPersonalAuthoringHistory(undefined, undefined), true);
  assert.equal(preservesPersonalAuthoringHistory(before, undefined), false);
  for (const edit of [
    (d: PersonalAuthoringV1) => { (d.flows[0].versions[0].nodes[0] as PersonalActionSnapshot).memo = '구판 덮어쓰기'; },
    (d: PersonalAuthoringV1) => { d.flows[0].versions.shift(); },
    (d: PersonalAuthoringV1) => { d.flows = []; },
    (d: PersonalAuthoringV1) => { d.series = []; },
    (d: PersonalAuthoringV1) => { d.series[0].rounds = []; },
    (d: PersonalAuthoringV1) => { d.series[0].rounds[0].taskIds.parent = '다른-ID'; },
    (d: PersonalAuthoringV1) => { d.series[0].ruleVersions[0].rule.end = { kind: 'count', count: 1 }; },
    (d: PersonalAuthoringV1) => { if (d.series[0].source.kind === 'flow') d.series[0].source.versionId = revision.id; },
  ]) {
    const changed = clone(next); edit(changed);
    assert.equal(preservesPersonalAuthoringHistory(before, changed), false);
  }
  assert.deepEqual(before.series[0].rounds[0].ruleVersionId, 'rule-1');
});

test('frozen source versions can keep old parent placement while a later version reflects native reparenting', () => {
  const native = nativeFixture(), data = owner();
  const old = clone(data.flows[0].versions[0]); old.id = 'old-version';
  old.taskRefs[1].parentTaskId = null; old.nodes[1].parentId = null;
  data.flows[0].versions.unshift(old);
  assert.equal(validatePersonalAuthoring(data, native), true);
  assert.equal(preservesPersonalAuthoringHistory(clone(data), JSON.parse(JSON.stringify(data))), true);
});

test('round anchors reject duplicates, gaps and reverse chronological materialized input without modifying it', () => {
  for (const materialized of [
    [{ index: 2, anchorDate: '2026-11-10' }],
    [{ index: 1, anchorDate: '2026-11-10' }, { index: 2, anchorDate: '2026-11-10' }],
    [{ index: 1, anchorDate: '2026-11-11' }, { index: 2, anchorDate: '2026-11-10' }],
  ]) {
    const before = clone(materialized);
    assert.equal(calculatePersonalRounds(version(), { rule: daily(), materialized }).ok, false);
    assert.deepEqual(materialized, before);
  }
});

test('subcheck snapshot distinguishes inherited, explicit undated, relative and fixed native date properties', () => {
  const native = nativeFixture(), data = owner(), child = data.flows[0].versions[0].nodes[1] as PersonalActionSnapshot;
  child.subchecks.push(
    { id: 'undated-check', parentId: null, title: '명시 미정', memo: '', time: null, scopeId: 'folder-unfiled', date: { kind: 'undated' } },
    { id: 'relative-check', parentId: null, title: '상대일', memo: '', time: null, scopeId: 'folder-unfiled', date: { kind: 'relative', offsetDays: 1 } },
    { id: 'fixed-check', parentId: null, title: '고정일', memo: '', time: null, scopeId: 'folder-unfiled', date: { kind: 'fixed', date: '2026-11-05' } },
  );
  assert.equal(validatePersonalAuthoring(data, native), true);
  const result = calculatePersonalRounds(data.flows[0].versions[0], { rule: daily(2) });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const second = result.value.rounds[1].nodes.find(n => n.kind === 'action' && n.taskId === 'child') as PersonalActionSnapshot;
  assert.deepEqual(second.subchecks.map(c => c.date.kind), ['inherit', 'undated', 'relative', 'fixed']);
  assert.deepEqual(second.subchecks, child.subchecks);
});

test('preview rejects a subcheck relative-date overflow before native IDs or bodies are created', () => {
  const config = version(), child = config.nodes[1] as PersonalActionSnapshot;
  child.subchecks[0].date = { kind: 'relative', offsetDays: 3_652_058 };
  const before = clone(config);
  assert.deepEqual(previewPersonalRounds(config, { rule: daily() }), { ok: false, reason: 'date-out-of-range' });
  assert.deepEqual(config, before);
});

test('standalone execution has its own owner with no synthetic series; initial absent executions equals empty', () => {
  const native = nativeFixture(), data = owner(), baseline = clone(native), previous = clone(data);
  assert.equal(validatePersonalAuthoring({ ...data, executions: [] }, native), true);
  assert.equal(preservesPersonalAuthoringHistory(data, { ...data, executions: [] }), true);
  assert.equal(preservesPersonalAuthoringHistory({ ...data, executions: [] }, data), true);
  assert.equal(validatePersonalAuthoring({ ...data, executions: null }, native), false);
  assert.equal(validatePersonalAuthoring({ ...data, executions: undefined }, native), false);
  const execution = withExecution(native, data);
  assert.equal(data.series.length, 0);
  assert.equal(validatePersonalAuthoring(data, native), true);
  assert.equal(preservesPersonalAuthoringHistory(previous, data), false); // Native creation evidence is mandatory.
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: native }), true);
  assert.equal(execution.versionId, 'flow-version-1');
  assert.deepEqual(native.progressRecords, baseline.progressRecords);
  assert.equal(M.currentProgress(native, execution.taskIds.parent), 0);
  assert.deepEqual(M.progressHistory(native, execution.taskIds.parent), []);
  assert.equal(M.tasks(native).find(t => t.id === execution.taskIds.fixed)!.date, '2026-11-05');
  assert.equal(validatePersonalAuthoring(JSON.parse(JSON.stringify(data)), native), true);
});

test('independent starts at the same anchor keep distinct documents and all Task IDs; frozen content beats live edits', () => {
  let native = nativeFixture(); const data = owner();
  native = M.updateTask(native, 'parent', { title: 'live 변경', note: 'live 메모 변경' });
  const baseline = clone(native), previous = clone(data), a = withExecution(native, data), b = withExecution(native, data, 'standalone-2');
  assert.equal(validatePersonalAuthoring(data, native), true);
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: native }), true);
  assert.notEqual(a.executionDocumentId, b.executionDocumentId);
  assert.equal(Object.values(a.taskIds).some(id => Object.values(b.taskIds).includes(id)), false);
  assert.equal(M.tasks(native).find(t => t.id === a.taskIds.parent)!.title, '고정 제목 parent');
  assert.equal(M.tasks(native).find(t => t.id === 'parent')!.title, 'live 변경');
});

for (const [name, edit] of [
  ['missing source Flow', (e: PersonalStandaloneExecution) => { e.flowId = 'missing'; }],
  ['missing source version', (e: PersonalStandaloneExecution) => { e.versionId = 'missing'; }],
  ['source Task reuse', (e: PersonalStandaloneExecution) => { e.taskIds.parent = 'parent'; }],
  ['missing Task', (e: PersonalStandaloneExecution) => { e.taskIds.parent = 'missing'; }],
  ['duplicate target Task', (e: PersonalStandaloneExecution) => { e.taskIds.child = e.taskIds.parent; }],
  ['missing mapping', (e: PersonalStandaloneExecution) => { delete e.taskIds.child; }],
  ['invalid anchor', (e: PersonalStandaloneExecution) => { e.anchorDate = '2026-02-29'; }],
  ['progress mirror', (e: PersonalStandaloneExecution) => { Object.assign(e, { progress: 25 }); }],
  ['history mirror', (e: PersonalStandaloneExecution) => { Object.assign(e, { records: [] }); }],
] as const) test(`standalone admission rejects ${name}`, () => {
  const native = nativeFixture(), data = owner(), execution = withExecution(native, data); edit(execution);
  assert.equal(validatePersonalAuthoring(data, native), false);
});

test('standalone document/Task/owner identities cannot duplicate another standalone or a materialized round', () => {
  const native = nativeFixture(), data = owner(), execution = withExecution(native, data);
  const duplicated = clone(data); duplicated.executions!.push(clone(execution));
  assert.equal(validatePersonalAuthoring(duplicated, native), false);
  duplicated.executions![1].id = 'second-owner';
  assert.equal(validatePersonalAuthoring(duplicated, native), false);
  const series = flowSeries(); data.series.push(series); const round = withRound(native, series);
  data.executions![0] = { ...execution, id: 'round-alias', executionDocumentId: round.executionDocumentId, taskIds: round.taskIds };
  assert.equal(validatePersonalAuthoring(data, native), false);
});

test('creation proof rejects existing-document adoption, changed originals, copied progress/history and non-snapshot text', () => {
  const native = nativeFixture(), data = owner(), baseline = clone(native), previous = clone(data), execution = withExecution(native, data);
  // A pre-existing native document cannot be retroactively claimed as a fresh start.
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: native, next: native }), false);
  const alteredOriginal = M.updateTask(native, 'parent', { title: '원본 훼손' });
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: alteredOriginal }), false);
  const copiedLive = M.updateTask(native, execution.taskIds.parent, { title: 'live 제목을 잘못 복사' });
  assert.equal(validatePersonalAuthoring(data, copiedLive), true); // Admission also supports later legitimate edits.
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: copiedLive }), false);
  const withHistory = clone(native); withHistory.progressRecords.push({ taskId: execution.taskIds.parent, date: '2026-11-10', percent: 0 });
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: withHistory }), false);
  const withProgress = clone(native), doc = M.getDocument(withProgress, execution.executionDocumentId)!;
  doc.lines.find(l => l.id === execution.taskIds.parent)!.text = '- [25%] 고정 제목 parent';
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: withProgress }), false);
});

test('standalone identity/source/Task mapping are immutable, while later native progress and notes remain editable', () => {
  const native = nativeFixture(), before = owner(), execution = withExecution(native, before);
  for (const edit of [
    (d: PersonalAuthoringV1) => { delete d.executions; },
    (d: PersonalAuthoringV1) => { d.executions = []; },
    (d: PersonalAuthoringV1) => { d.executions![0].versionId = 'other-version'; },
    (d: PersonalAuthoringV1) => { d.executions![0].flowId = 'other-flow'; },
    (d: PersonalAuthoringV1) => { d.executions![0].executionDocumentId = 'other-document'; },
    (d: PersonalAuthoringV1) => { d.executions![0].taskIds.parent = 'other-task'; },
  ]) {
    const next = clone(before); edit(next);
    assert.equal(preservesPersonalAuthoringHistory(before, next, { before: native, next: native }), false);
  }
  const updated = M.updateTask(native, execution.taskIds.parent, { note: '나중 편집 메모' });
  const withProgress = clone(updated); withProgress.progressRecords.push({ taskId: execution.taskIds.parent, date: '2026-11-10', percent: 40 });
  assert.equal(validatePersonalAuthoring(before, withProgress), true);
  assert.equal(preservesPersonalAuthoringHistory(before, clone(before), { before: native, next: withProgress }), true);
});

test('anchor plan changes only unstarted relative Tasks; fixed date, source records and stable IDs survive', () => {
  const native = nativeFixture(), before = owner(), execution = withExecution(native, before), saved = clone(native);
  const result = planPersonalExecutionAnchorChange(before, execution.id, '2026-11-17', freeze(clone(native)));
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.value.changes.map(c => [c.taskId, c.beforeDate, c.afterDate]), [
    [execution.taskIds.parent, '2026-11-03', '2026-11-10'], [execution.taskIds.child, '2026-11-11', '2026-11-18'],
  ]);
  assert.deepEqual(result.value.execution.taskIds, execution.taskIds);
  const nextOwner = clone(before); nextOwner.executions![0] = result.value.execution;
  let nextNative = native;
  for (const change of result.value.changes) nextNative = M.updateTask(nextNative, change.taskId, { date: change.afterDate });
  assert.equal(validatePersonalAuthoring(nextOwner, nextNative), true);
  assert.equal(preservesPersonalAuthoringHistory(before, nextOwner), false);
  assert.equal(preservesPersonalAuthoringHistory(before, nextOwner, { before: native, next: nextNative }), true);
  assert.equal(M.tasks(nextNative).find(t => t.id === execution.taskIds.fixed)!.date, '2026-11-05');
  assert.deepEqual(nextNative.progressRecords, saved.progressRecords);
  assert.deepEqual(native, saved);
});

test('current0 with past25, explicit zero history, progress and per-execution date overrides are protected from anchor changes', () => {
  for (const mode of ['history25', 'history0', 'progress', 'date-exception'] as const) {
    let native = nativeFixture(); const data = owner(), execution = withExecution(native, data), taskId = execution.taskIds.child;
    if (mode.startsWith('history')) {
      native.progressRecords.push({ taskId, date: '2026-11-01', percent: mode === 'history25' ? 25 : 0 });
      M.getDocument(native, execution.executionDocumentId)!.lines.find(l => l.id === taskId)!.text = '  - [0%] 고정 제목 child';
      assert.equal(M.currentProgress(native, taskId), 0);
    } else if (mode === 'progress') M.getDocument(native, execution.executionDocumentId)!.lines.find(l => l.id === taskId)!.text = '  - [30%] 고정 제목 child';
    else native = M.updateTask(native, taskId, { date: '2027-01-01' });
    const result = planPersonalExecutionAnchorChange(data, execution.id, '2026-11-17', native);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.changes.some(c => c.taskId === taskId), false);
      assert.equal(result.value.changes.some(c => c.taskId === execution.taskIds.parent), true);
    }
  }
});

test('a started date-inheriting subcheck protects its containing relative Task without changing parent Task progress', () => {
  const native = nativeFixture(), data = owner(), execution = withExecution(native, data);
  const checkId = 'standalone-1-snapshot-simple';
  M.getDocument(native, execution.executionDocumentId)!.lines.find(l => l.id === checkId)!.text = '    - [x] 체크 원문';
  assert.equal(M.currentProgress(native, execution.taskIds.child), 0);
  const result = planPersonalExecutionAnchorChange(data, execution.id, '2026-11-17', native);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.value.changes.some(c => c.taskId === execution.taskIds.child), false);
});

test('anchor preservation rejects tampered fixed/started dates, changed originals and metadata-only anchor changes', () => {
  const native = nativeFixture(), before = owner(), execution = withExecution(native, before);
  native.progressRecords.push({ taskId: execution.taskIds.child, date: '2026-11-01', percent: 25 });
  const result = planPersonalExecutionAnchorChange(before, execution.id, '2026-11-17', native);
  assert.equal(result.ok, true); if (!result.ok) return;
  const next = clone(before); next.executions![0] = result.value.execution;
  let changed = native; for (const c of result.value.changes) changed = M.updateTask(changed, c.taskId, { date: c.afterDate });
  assert.equal(preservesPersonalAuthoringHistory(before, next, { before: native, next: changed }), true);
  assert.equal(preservesPersonalAuthoringHistory(before, next, { before: native, next: native }), false);
  for (const taskId of [execution.taskIds.fixed, execution.taskIds.child, 'parent']) {
    const tampered = M.updateTask(changed, taskId, { date: '2028-01-01' });
    assert.equal(preservesPersonalAuthoringHistory(before, next, { before: native, next: tampered }), false);
  }
});

test('anchor planner rejects unknown executions / bad dates / overflow, and an unchanged anchor has zero changes', () => {
  const native = nativeFixture(), data = owner(), execution = withExecution(native, data);
  assert.equal(planPersonalExecutionAnchorChange(data, 'missing', '2026-11-17', native).ok, false);
  assert.equal(planPersonalExecutionAnchorChange(data, execution.id, '2026-02-29', native).ok, false);
  assert.equal(planPersonalExecutionAnchorChange(data, execution.id, '9999-12-31', native).ok, false);
  const result = planPersonalExecutionAnchorChange(data, execution.id, execution.anchorDate, native);
  assert.equal(result.ok, true); if (result.ok) assert.deepEqual(result.value.changes, []);
});

test('creation replays frozen time, multiline memo and nested inherited/relative/fixed subchecks without old records', () => {
  const native = nativeFixture(), data = owner(), child = data.flows[0].versions[0].nodes[1] as PersonalActionSnapshot;
  child.time = '09:30'; child.subchecks[0].memo = '하위 메모\n두 번째 줄';
  child.subchecks.push(
    { id: 'nested-snapshot', parentId: 'snapshot-simple', title: '중첩 체크', memo: '보존할 내용', time: '10:00',
      scopeId: 'folder-unfiled', date: { kind: 'relative', offsetDays: 1 } },
    { id: 'fixed-snapshot', parentId: null, title: '고정 날짜 체크', memo: '', time: null,
      scopeId: 'folder-unfiled', date: { kind: 'fixed', date: '2026-11-05' } },
  );
  const baseline = clone(native), previous = clone(data), execution = withExecution(native, data);
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: native }), true);
  assert.equal(M.tasks(native).find(t => t.id === execution.taskIds.child)!.time, '09:30');
  const tampered = M.updateTask(native, execution.taskIds.child, { time: '11:00' });
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: tampered }), false);
  const lostMemo = clone(native), doc = M.getDocument(lostMemo, execution.executionDocumentId)!;
  doc.lines.find(l => l.id === 'standalone-1-snapshot-simple-메모-0')!.text = '      - 메모: 잘못 복사한 메모';
  assert.equal(preservesPersonalAuthoringHistory(previous, data, { before: baseline, next: lostMemo }), false);
});

test('anchor change can add a fresh date property while retaining the existing date section and every older line ID', () => {
  let native = nativeFixture(); const data = owner(), execution = withExecution(native, data);
  native = M.restoreTaskDate(native, execution.taskIds.parent);
  M.getDocument(native, execution.executionDocumentId)!.lines.unshift({ id: 'execution-date-section', text: '[2026-11-03]' });
  assert.equal(M.validate(native), true);
  const beforeIds = M.getDocument(native, execution.executionDocumentId)!.lines.map(l => l.id);
  const result = planPersonalExecutionAnchorChange(data, execution.id, '2026-11-17', native);
  assert.equal(result.ok, true); if (!result.ok) return;
  let updated = native; for (const c of result.value.changes) updated = M.updateTask(updated, c.taskId, { date: c.afterDate });
  const next = clone(data); next.executions![0] = result.value.execution;
  assert.equal(preservesPersonalAuthoringHistory(data, next, { before: native, next: updated }), true);
  assert.equal(M.getDocument(updated, execution.executionDocumentId)!.lines[0].text, '[2026-11-03]');
  assert.equal(beforeIds.every(id => M.getDocument(updated, execution.executionDocumentId)!.lines.some(l => l.id === id)), true);
});
