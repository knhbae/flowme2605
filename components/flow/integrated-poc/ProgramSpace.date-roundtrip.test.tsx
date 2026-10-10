import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import { createProgramData, validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { createProgramController } from '../../../lib/flow/integrated-poc/controller';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { programClone, type ProgramData } from '../../../lib/flow/integrated-poc/contract';
import { updateProgramTask } from '../../../lib/flow/integrated-poc/private-space';
import type { ProgramSpaceProps } from './ProgramSpace';
import type { ProgramMutate, ProgramMutationResult, ProgramNavigate } from '../../../lib/flow/integrated-poc/ui-contract';

const TODAY = '2026-10-04';
const settle = () => new Promise<void>(done => setImmediate(done));
function label(value: any): string {
  return Array.isArray(value) ? value.map(label).join('') : typeof value === 'string' || typeof value === 'number'
    ? String(value) : value?.props ? label(value.props.children) : '';
}
function nodes(value: any): any[] {
  const result: any[] = [];
  function walk(part: any) {
    if (Array.isArray(part)) part.forEach(walk);
    else if (part?.props) { result.push(part); walk(part.props.children); }
  }
  walk(value); return result;
}
function fixture() {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  space.text = M.addDocument(space.text, { title: '날짜 왕복 회귀' });
  const documentId = space.text.documents[0].id;
  space.text = M.editText(space.text, documentId,
    '앞의 자유 메모\n[2026-10-05]\n- [ ] 같은 제목\n  - 시간: 09:10\n  - 메모: 첫 항목 메모\n[2026-10-12]\n- [ ] 같은 제목\n  - 메모: 둘째 항목 메모\n뒤의 자유 메모');
  const tasks = M.tasks(space.text);
  space.text = M.recordProgress(space.text, tasks[0].id, TODAY, 30);
  assert(validateProgramData(data));
  return { data, actorId, documentId, taskIds: tasks.map(task => task.id) };
}

// Run the whole production parent with its real serialized local controller.
// React hooks and DOM are deterministic doubles. Native date-input keyboard,
// browser focus/geometry and account API behavior remain separate checks.
function harness(seed: ProgramData, documentId: string) {
  let data = seed, slot = 0, renderCount = 0;
  const slots: any[] = [], storageValues = new Map<string, string>();
  const navigation: Parameters<ProgramNavigate>[] = [], results: ProgramMutationResult[] = [];
  let reconcile: (() => void) | undefined, mountCleanup: (() => void) | undefined;
  let nextGate: { wait: Promise<void>; start: () => void } | null = null;
  const hooks = {
    ...React,
    useState(initial: any) {
      const index = slot++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value: any) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial: any) { const index = slot++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useMemo(build: () => any) { slot++; return build(); },
    useEffect(effect: () => any) {
      slot++;
      if (String(effect).includes('reconcileScheduleAcknowledgment()')) reconcile = effect;
      else if (!mountCleanup && String(effect).includes('scheduleMounted.current = true')) mountCleanup = effect();
    },
  };
  const url = new URL('./ProgramSpace.tsx', import.meta.url), require = createRequire(url);
  const root = resolve(dirname(fileURLToPath(url)), '../../..');
  const loaded = { exports: {} as { ProgramSpace: (props: ProgramSpaceProps) => React.ReactNode } };
  const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const documentMock: { activeElement: any } = { activeElement: null };
  documentMock.activeElement = { tagName: 'BUTTON', parentElement: null, isConnected: true, ownerDocument: documentMock,
    getClientRects: () => [{}], closest: () => null, matches: () => false,
    focus() { documentMock.activeElement = this; } };
  vm.runInThisContext(`(function(module,exports,require,document){${compiled}\n})`)(loaded, loaded.exports, (id: string) => {
    if (id === 'react') return hooks;
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id.startsWith('./Program')) return new Proxy({}, { get: (_, name) => Object.assign(() => null, { displayName: String(name) }) });
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, documentMock);
  const controller = createProgramController({ initialData: seed,
    storage: { getItem: key => storageValues.get(key) ?? null, setItem: (key, value) => { storageValues.set(key, value); }, removeItem() { throw Error('unexpected remove'); } },
    exclusive: async work => { const gate = nextGate; nextGate = null; if (gate) { gate.start(); await gate.wait; } return work(); },
    onChange: snapshot => { data = snapshot.envelope.data; render(); },
  });
  assert(controller.ok);
  const mutate: ProgramMutate = async (name, build, options) => {
    const result = await controller.mutate(name, build, { actorId: data.activeActorId, ...options });
    results.push(result); return result;
  };
  function render() {
    slot = 0; renderCount++;
    const tree = loaded.exports.ProgramSpace({ data, mutate, navigate: (...args) => navigation.push(args), today: TODAY,
      selectedDocumentId: documentId, onUndo: async () => { await controller.undo!(data.activeActorId); },
      onRedo: async () => { await controller.redo!(data.activeActorId); }, onRegisterNavigation() {} });
    const all = nodes(tree), dialog = all.find(node => node.type === 'dialog' && node.props['aria-labelledby'] === 'program-detail-title');
    dialog.props.ref.current = { close() {}, showModal() {}, open: true };
    reconcile?.();
    return { all, dialog, rows: all.filter(node => node.type === 'li' && node.props['data-task-id']),
      schedule: all.find(node => node.type === 'form' && label(node.props.children).includes('날짜·시간 적용')),
      button: (text: string) => all.find(node => node.type === 'button' && label(node.props.children) === text) };
  }
  async function click(text: string) { const button = render().button(text); assert(button, text); button.props.onClick(); await settle(); return render(); }
  async function open(taskId: string) {
    await click('분류'); const row = render().rows.find(node => node.props['data-task-id'] === taskId); assert(row);
    const button = nodes(row).find(node => node.type === 'button' && node.props['aria-label']?.endsWith(' 작업'));
    assert(button); button.props.onClick({ detail: 0 }); return render();
  }
  function draft(date: string, time?: string) {
    const form = render().schedule; assert(form);
    const inputs = nodes(form).filter(node => node.type === 'input');
    inputs.find(node => node.props.type === 'date').props.onChange({ target: { value: date } });
    if (time !== undefined) inputs.find(node => node.props.type === 'time').props.onChange({ target: { value: time } });
    return render();
  }
  function draftDate() {
    const form = render().schedule; assert(form); return nodes(form).find(node => node.type === 'input' && node.props.type === 'date').props.value;
  }
  function draftTime() {
    const form = render().schedule; assert(form); return nodes(form).find(node => node.type === 'input' && node.props.type === 'time').props.value;
  }
  async function flush() { await controller.flush!(); await settle(); return render(); }
  async function submit() { const form = render().schedule; assert(form); form.props.onSubmit({ preventDefault() {} }); return flush(); }
  return { render, open, click, draft, draftDate, draftTime, submit, flush, navigation, results, controller,
    get data() { return data; }, get renderCount() { return renderCount; },
    get task() { return (taskId: string) => M.tasks(data.spaces[data.activeActorId].text).find(task => task.id === taskId)!; },
    blockNext() {
      let release!: () => void, start!: () => void;
      const wait = new Promise<void>(done => { release = done; }), started = new Promise<void>(done => { start = done; });
      nextGate = { wait, start }; return { release, started };
    },
    close() { const button = nodes(render().dialog).find(node => node.type === 'button' && node.props['aria-label'] === '닫기'); assert(button); button.props.onClick(); render(); },
    queryDate(date: string) { const input = render().all.find(node => node.type === 'input' && node.props.id === 'program-query-date'); assert(input); input.props.onChange({ target: { value: date } }); return render(); },
    async period(value: string) { const select = render().all.find(node => node.type === 'select' && node.props['aria-label'] === '기간 보기'); assert(select); select.props.onChange({ target: { value } }); await settle(); return render(); },
    destroy() { mountCleanup?.(); },
  };
}

test('DR01 consecutive actual detail edits 10/05→10/08 persist twice without reverting identity, context or history', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    await h.open(f.taskIds[0]);
    for (const date of ['2026-10-08', '2026-10-05', '2026-10-08']) {
      h.draft(date, '17:45'); await h.submit();
      assert(h.results.at(-1)?.ok); assert.equal(h.task(f.taskIds[0]).date, date);
      assert.equal(h.draftDate(), date); assert.equal(h.task(f.taskIds[0]).time, '17:45');
    }
    const current = h.data.spaces[f.actorId].text, old = before.spaces[f.actorId].text;
    assert.deepEqual(M.tasks(current).map(task => task.id), f.taskIds);
    assert.deepEqual(current.progressRecords, old.progressRecords);
    assert.equal(h.task(f.taskIds[0]).note, '첫 항목 메모'); assert.equal(h.task(f.taskIds[1]).date, '2026-10-12');
    assert.match(M.raw(M.getDocument(current, f.documentId)), /^앞의 자유 메모\n/);
    assert.match(M.raw(M.getDocument(current, f.documentId)), /\n뒤의 자유 메모$/);
    assert.deepEqual(h.data.public, before.public); assert(validateProgramData(h.data));
  } finally { h.destroy(); }
});

test('DR02 changed date moves the exact same-title item between period buckets and returns to its original line ID', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); h.draft('2026-10-08', '17:45'); await h.submit(); h.close();
    await h.click('오늘'); await h.period('week'); h.queryDate('2026-10-05');
    assert.deepEqual(h.render().rows.map(row => row.props['data-task-id']), [f.taskIds[0]]);
    h.queryDate('2026-10-12'); assert.deepEqual(h.render().rows.map(row => row.props['data-task-id']), [f.taskIds[1]]);
    await h.period('month'); assert.deepEqual(h.render().rows.map(row => row.props['data-task-id']), f.taskIds);
    await h.click('오늘'); h.queryDate('2026-10-05'); assert.equal(h.render().rows.length, 0);
    h.queryDate('2026-10-08'); assert.deepEqual(h.render().rows.map(row => row.props['data-task-id']), [f.taskIds[0]]);
    const beforeReturn = programClone(h.data), row = h.render().rows[0];
    const title = nodes(row).find(node => node.type === 'button' && node.props.className === 'taskTitle'); assert(title);
    title.props.onClick(); await h.flush();
    assert.deepEqual(h.navigation.at(-1), [{ view: 'space', id: f.documentId }, { writingLineId: f.taskIds[0] }]);
    assert.deepEqual(h.data, beforeReturn, 'period-to-source navigation performs no data write');
    const editor = h.render().all.find(node => node.props.docId === f.documentId && node.props.onCommit); assert(editor);
    assert.equal(editor.props.initialPosition.lineId, f.taskIds[0]);
    const doc = M.getDocument(h.data.spaces[f.actorId].text, f.documentId)!;
    const index = doc.lines.findIndex(line => line.id === f.taskIds[0]);
    assert.equal(editor.props.initialPosition.start, doc.lines.slice(0, index).reduce((offset, line) => offset + line.text.length + 1, 0));
  } finally { h.destroy(); }
});

test('DR03 a delayed date-only move preserves newer input typed in the same detail form', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); const gate = h.blockNext(); await h.click('오늘로 이동'); await gate.started;
    h.draft('2026-10-08', '18:20'); gate.release(); await h.flush();
    assert.equal(h.task(f.taskIds[0]).date, TODAY, 'only the submitted date-only transition persisted');
    assert.equal(h.draftDate(), '2026-10-08', 'the late callback must not replace newer unsaved input');
    assert.equal(h.results.filter(result => result.ok && result.changed).length, 1);
    await h.submit(); assert(h.results.at(-1)?.ok);
    assert.equal(h.task(f.taskIds[0]).date, '2026-10-08'); assert.equal(h.task(f.taskIds[0]).time, '18:20');
  } finally { h.destroy(); }
});

test('DR04 a delayed date-only move cannot replace another task dialog opened before settlement', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); const gate = h.blockNext(); await h.click('오늘로 이동'); await gate.started;
    h.close(); await h.open(f.taskIds[1]); assert.equal(h.draftDate(), '2026-10-12');
    gate.release(); await h.flush();
    assert.equal(h.task(f.taskIds[0]).date, TODAY); assert.equal(h.task(f.taskIds[1]).date, '2026-10-12');
    assert.equal(h.draftDate(), '2026-10-12', 'settling the first task must preserve the second task draft');
  } finally { h.destroy(); }
});

test('DR05 a stale detail schedule never overwrites an intervening persisted memo and keeps its date draft', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); h.draft('2026-10-08', '17:45');
    const result = await h.controller.mutate('별도 메모 수정', current => updateProgramTask(current, {
      actorId: f.actorId, requestId: 'date-roundtrip-new-note', expectedSpace: current.spaces[f.actorId],
      taskId: f.taskIds[0], patch: { note: '먼저 저장된 메모' },
    }), { actorId: f.actorId }); assert(result.ok);
    await h.submit(); assert.deepEqual(h.results.at(-1), { ok: false, reason: 'conflict' });
    assert.equal(h.task(f.taskIds[0]).date, '2026-10-05'); assert.equal(h.task(f.taskIds[0]).note, '먼저 저장된 메모');
    assert.equal(h.draftDate(), '2026-10-08');
  } finally { h.destroy(); }
});

test('DR06 real controller Undo/Redo restores date/time while keeping task IDs, memo and prior progress', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), baseline = programClone(f.data.spaces[f.actorId].text);
  try {
    await h.open(f.taskIds[0]); h.draft('2026-10-08', '17:45'); await h.submit(); h.close();
    assert((await h.controller.undo(f.actorId)).ok); await h.open(f.taskIds[0]); assert.equal(h.draftDate(), '2026-10-05');
    assert.deepEqual(h.data.spaces[f.actorId].text, baseline); h.close();
    assert((await h.controller.redo(f.actorId)).ok); await h.open(f.taskIds[0]); assert.equal(h.draftDate(), '2026-10-08');
    assert.equal(h.task(f.taskIds[0]).time, '17:45'); assert.equal(h.task(f.taskIds[0]).note, '첫 항목 메모');
    assert.deepEqual(h.data.spaces[f.actorId].text.progressRecords, baseline.progressRecords);
    assert.deepEqual(M.tasks(h.data.spaces[f.actorId].text).map(task => task.id), f.taskIds);
  } finally { h.destroy(); }
});

test('DR07 ordinary shortcut success and canonical no-op still update their originating draft without changing saved time', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]);
    for (const [button, date] of [['오늘로 이동', TODAY], ['내일로 이어하기', '2026-10-05'], ['날짜 미정으로 이동', null]] as const) {
      h.draft('2026-11-20', '22:40'); await h.click(button); await h.flush();
      assert(h.results.at(-1)?.ok); assert.equal(h.task(f.taskIds[0]).date, date);
      assert.equal(h.draftDate(), date ?? ''); assert.equal(h.task(f.taskIds[0]).time, '09:10');
      assert.equal(h.draftTime(), '22:40', 'a date-only shortcut retains the unsaved time draft');
    }
    h.draft('2026-10-08'); await h.click('날짜 미정으로 이동'); await h.flush();
    const result = h.results.at(-1); assert(result?.ok); assert.equal(result.changed, false);
    assert.equal(h.draftDate(), ''); assert.equal(h.task(f.taskIds[0]).date, null);
    assert.equal(h.results.filter(entry => entry.ok && entry.changed).length, 3);
  } finally { h.destroy(); }
});

test('DR08 closing and reopening the same task creates a fresh dialog that cannot receive the prior date-only ACK', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); const gate = h.blockNext(); await h.click('오늘로 이동'); await gate.started;
    h.close(); await h.open(f.taskIds[0]); assert.equal(h.draftDate(), '2026-10-05');
    gate.release(); await h.flush();
    assert.equal(h.task(f.taskIds[0]).date, TODAY);
    assert.equal(h.draftDate(), '2026-10-05', 'the reopened same-task dialog owns its input independently');
    h.close(); await h.open(f.taskIds[0]); assert.equal(h.draftDate(), TODAY, 'a later fresh open reads the committed date');
  } finally { h.destroy(); }
});

test('DR09 newer time input keeps the whole detail schedule draft while a submitted date-only move settles', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); const gate = h.blockNext(); await h.click('오늘로 이동'); await gate.started;
    const time = nodes(h.render().schedule).find(node => node.type === 'input' && node.props.type === 'time'); assert(time);
    time.props.onChange({ target: { value: '18:20' } }); h.render(); gate.release(); await h.flush();
    assert.equal(h.task(f.taskIds[0]).date, TODAY); assert.equal(h.task(f.taskIds[0]).time, '09:10');
    assert.equal(h.draftDate(), '2026-10-05'); assert.equal(h.draftTime(), '18:20');
  } finally { h.destroy(); }
});

test('DR10 a rejected date-only shortcut retains input and still shows the existing conflict alert', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); h.draft('2026-10-08', '18:20');
    assert((await h.controller.mutate('별도 메모 수정', current => updateProgramTask(current, {
      actorId: f.actorId, requestId: 'date-roundtrip-shortcut-conflict', expectedSpace: current.spaces[f.actorId],
      taskId: f.taskIds[0], patch: { note: '외부 수정 메모' },
    }), { actorId: f.actorId })).ok);
    await h.click('오늘로 이동'); await h.flush();
    assert.deepEqual(h.results.at(-1), { ok: false, reason: 'conflict' });
    assert.equal(h.draftDate(), '2026-10-08'); assert.equal(h.draftTime(), '18:20');
    assert.equal(h.task(f.taskIds[0]).date, '2026-10-05'); assert.equal(h.task(f.taskIds[0]).note, '외부 수정 메모');
    const alert = nodes(h.render().dialog).find(node => node.props.role === 'alert'); assert(alert);
    assert.match(label(alert.props.children), /다른 변경이 먼저 저장/);
  } finally { h.destroy(); }
});
