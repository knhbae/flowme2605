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
import { programClone, type ProgramData } from '../../../lib/flow/integrated-poc/contract';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type { ProgramSpaceProps } from './ProgramSpace';
import type { ProgramMutate, ProgramMutationResult, ProgramNavigate } from '../../../lib/flow/integrated-poc/ui-contract';

const TODAY = '2026-10-04';
const settle = () => new Promise<void>(done => setImmediate(done));

test('DX15 task-detail scrolling reserves the bounded sticky title without doubling the global focus margin', () => {
  const css = readFileSync(new URL('./ProgramSpace.module.css', import.meta.url), 'utf8');
  assert.match(css, /\.dialog\[data-task-detail\]\s*\{[^}]*scroll-padding-block-start:\s*116\.5px/);
  assert.match(css, /\.dialog\[data-task-detail\]\s*:is\(button, input, select, summary\)\s*\{[^}]*scroll-margin-block:\s*0/);
  assert.match(css, /\.dialogHeading h2\s*\{[^}]*max-height:\s*4\.5em/);
  // At the current 17px title size, 76.5px text + 28px padding + 1px border
  // fits the reserved area. Native focus/scroll and short screens need browser QA.
  assert(17 * 4.5 + 28 + 1 < 116.5);
});
function label(value: any): string {
  return Array.isArray(value) ? value.map(label).join('') : typeof value === 'string' || typeof value === 'number'
    ? String(value) : value?.props ? label(value.props.children) : '';
}
function nodes(value: any): any[] {
  const result: any[] = [];
  function visit(part: any) {
    if (Array.isArray(part)) part.forEach(visit);
    else if (part?.props) { result.push(part); visit(part.props.children); }
  }
  visit(value); return result;
}
function fixture() {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  space.text = M.addDocument(space.text, { title: '같은 항목 상세 문맥' });
  const documentId = space.text.documents[0].id;
  space.text = M.editText(space.text, documentId,
    '앞의 자유 메모\n[2026-10-05]\n- [ ] 같은 제목\n  - 시간: 09:10\n  - 메모: 첫 항목 메모\n[2026-10-12]\n- [ ] 같은 제목\n  - 메모: 둘째 항목 메모\n뒤의 자유 메모');
  const tasks = M.tasks(space.text);
  space.text = M.recordProgress(space.text, tasks[0].id, TODAY, 30);
  assert(validateProgramData(data));
  return { data, actorId, documentId, taskIds: tasks.map(task => task.id) };
}

// Run the production parent and its real serialized controller. These doubles
// inspect mounted JSX/callbacks; native details geometry, Tab and focus are a
// separate browser check, not simulated by asserting HTML strings.
function harness(seed: ProgramData, documentId: string, automaticStateRender = false) {
  let data = seed, slot = 0, failure: string | null = null;
  const slots: any[] = [], storage = new Map<string, string>();
  const navigation: Parameters<ProgramNavigate>[] = [], results: ProgramMutationResult[] = [];
  let reconcile: (() => void) | undefined, mountCleanup: (() => void) | undefined;
  let nextGate: { wait: Promise<void>; start: () => void } | null = null;
  let committedView: ReturnType<typeof render> | undefined, stateRenderCount = 0, scheduledStateRender = false;
  const stateBeforeBatch = new Map<number, any>();
  const focused = { opener: 0, period: 0 };
  const dom: { activeElement: any } = { activeElement: null };
  const opener = { tagName: 'BUTTON', parentElement: null, isConnected: true, tabIndex: 0,
    ownerDocument: dom, getClientRects: () => [{}], closest: () => null, matches: () => false,
    focus() { focused.opener++; dom.activeElement = this; } };
  const periodButton = { ...opener, focus() { focused.period++; dom.activeElement = this; } };
  dom.activeElement = opener;
  const hooks = {
    ...React,
    useState(initial: any) {
      const index = slot++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value: any) => {
        const next = typeof value === 'function' ? value(slots[index]) : value;
        if (automaticStateRender && !Object.is(next, slots[index]) && !stateBeforeBatch.has(index)) stateBeforeBatch.set(index, slots[index]);
        slots[index] = next;
        if (automaticStateRender && stateBeforeBatch.size && !scheduledStateRender) {
          scheduledStateRender = true;
          // React batches state writes from the completed async submit. Returning
          // a message to its previous value alone must not create a render.
          setImmediate(() => {
            scheduledStateRender = false;
            const changed = [...stateBeforeBatch].some(([at, before]) => !Object.is(slots[at], before));
            stateBeforeBatch.clear();
            if (changed) { stateRenderCount++; committedView = render(); }
          });
        }
      }];
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
  vm.runInThisContext(`(function(module,exports,require,document){${compiled}\n})`)(loaded, loaded.exports, (id: string) => {
    if (id === 'react') return hooks;
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id.startsWith('./Program')) return new Proxy({}, { get: (_, name) => Object.assign(() => null, { displayName: String(name) }) });
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, dom);
  const controller = createProgramController({ initialData: seed,
    storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem() { throw Error('unexpected remove'); } },
    exclusive: async work => { const gate = nextGate; nextGate = null; if (gate) { gate.start(); await gate.wait; } return work(); },
    onChange: snapshot => { data = snapshot.envelope.data; committedView = render(); },
  });
  assert(controller.ok);
  const mutate: ProgramMutate = async (name, build, options) => {
    const result: ProgramMutationResult = failure ? { ok: false, reason: failure }
      : await controller.mutate(name, build, { actorId: data.activeActorId, ...options });
    results.push(result); return result;
  };
  function render() {
    slot = 0;
    const tree = loaded.exports.ProgramSpace({ data, mutate, navigate: (...args) => navigation.push(args), today: TODAY,
      selectedDocumentId: documentId, onUndo: async () => { await controller.undo!(data.activeActorId); },
      onRedo: async () => { await controller.redo!(data.activeActorId); }, onRegisterNavigation() {} });
    const all = nodes(tree), dialog = all.find(node => node.type === 'dialog'); assert(dialog);
    dialog.props.ref.current = { close() {}, showModal() {}, open: true };
    const section = all.find(node => node.type === 'section' && node.props['aria-label'] === '내 공간'); assert(section);
    section.props.ref.current = { contains: () => true, getClientRects: () => [{}],
      querySelector: (selector: string) => selector.includes('data-program-period') ? periodButton : null };
    const views = all.find(node => node.type === 'nav' && node.props['aria-label'] === '기본 이동');
    assert(views); views.props.ref.current = { querySelector: (selector: string) => selector.includes('data-program-period') ? periodButton : null };
    reconcile?.();
    const detailNodes = nodes(dialog);
    const schedule = detailNodes.find(node => node.type === 'form' && label(node.props.children).includes('날짜·시간 적용'));
    const progress = detailNodes.find(node => node.type === 'form' && label(node.props.children).includes('누적 진행'));
    const groups = detailNodes.filter(node => node.type === 'details');
    return { all, dialog, schedule, progress, groups,
      button: (text: string) => all.find(node => node.type === 'button' && label(node.props.children) === text),
      origin: detailNodes.find(node => node.type === 'button' && label(node.props.children) === '원문 열기'),
      rows: all.filter(node => node.type === 'li' && node.props['data-task-id']),
    };
  }
  async function click(text: string) { const button = render().button(text); assert(button, text); button.props.onClick(); await settle(); return render(); }
  async function open(taskId: string) {
    opener.isConnected = true; dom.activeElement = opener;
    await click('분류'); const row = render().rows.find(node => node.props['data-task-id'] === taskId); assert(row);
    const button = nodes(row).find(node => node.type === 'button' && node.props['aria-label'] === '같은 제목 작업'); assert(button);
    dom.activeElement = opener; // Native button activation focuses the row after the view summary return.
    button.props.onClick({ detail: 0 }); return render();
  }
  function draftSchedule(date: string, time?: string) {
    const form = render().schedule; assert(form);
    const inputs = nodes(form).filter(node => node.type === 'input');
    inputs.find(node => node.props.type === 'date').props.onChange({ target: { value: date } });
    if (time !== undefined) inputs.find(node => node.props.type === 'time').props.onChange({ target: { value: time } });
    return render();
  }
  function draftProgress(date: string, percent: string) {
    const form = render().progress; assert(form);
    nodes(form).find(node => node.type === 'input' && node.props.type === 'date').props.onChange({ target: { value: date } });
    nodes(form).find(node => node.type === 'input' && node.props.type === 'number').props.onChange({ target: { value: percent } });
    return render();
  }
  function input(form: any, type: string) { const found = nodes(form).find(node => node.type === 'input' && node.props.type === type); assert(found); return found.props.value; }
  async function flush() { await controller.flush!(); await settle(); return render(); }
  async function submit(kind: 'schedule' | 'progress') { const form = render()[kind]; assert(form); form.props.onSubmit({ preventDefault() {} }); return flush(); }
  function close(cancel = false) {
    const view = render();
    if (cancel) view.dialog.props.onCancel({ preventDefault() {} });
    else { const button = nodes(view.dialog).find(node => node.type === 'button' && node.props['aria-label'] === '닫기'); assert(button); button.props.onClick(); }
    return render();
  }
  function generation() {
    const tree = render().dialog;
    const paths: string[] = [];
    function visit(value: any, parents: string[]) {
      if (Array.isArray(value)) { value.forEach(part => visit(part, parents)); return; }
      if (!value?.props) return;
      const keys = value.key === null ? parents : [...parents, String(value.key)];
      if (value.type === 'details') paths.push(keys.join('/'));
      visit(value.props.children, keys);
    }
    visit(tree, []); assert(paths.length > 0); return paths;
  }
  return { render, open, click, draftSchedule, draftProgress, input, flush, submit, close, generation, navigation, results, focused, opener, controller,
    reject(reason: string | null) { failure = reason; },
    task: (taskId: string) => { const task = M.tasks(data.spaces[data.activeActorId].text).find(task => task.id === taskId); assert(task); return task; },
    get data() { return data; },
    get committedView() { assert(committedView); return committedView; },
    get stateRenderCount() { return stateRenderCount; },
    blockNext() { let release!: () => void, start!: () => void;
      const wait = new Promise<void>(done => { release = done; }), started = new Promise<void>(done => { start = done; });
      nextGate = { wait, start }; return { release, started }; },
    destroy() { mountCleanup?.(); },
  };
}

test('DX01 schedule stays outside the two closed native groups while progress and document controls remain mounted', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    const view = await h.open(f.taskIds[0]); assert(view.schedule); assert(view.progress); assert(view.origin);
    assert.equal(view.origin.props.disabled, false, 'opening a saved progress value must start clean');
    assert.equal(view.dialog.props['data-task-detail'], true);
    const title = nodes(view.dialog).find(node => node.type === 'h2'); assert(title);
    assert.equal(view.dialog.props['aria-labelledby'], title.props.id); assert(title.props.id);
    assert.deepEqual(view.groups.map(group => label(nodes(group).find(node => node.type === 'summary')?.props.children)), ['진행 기록', '연결·이동·순서']);
    for (const group of view.groups) { assert.notEqual(group.props.open, true); assert(!nodes(group).includes(view.schedule)); }
    assert(nodes(view.groups[0]).includes(view.progress));
    assert.match(label(view.groups[1]), /다른 문서에 연결/); assert.match(label(view.groups[1]), /같은 날짜에서 위로/);
    assert.equal(h.input(view.schedule, 'date'), '2026-10-05'); assert.equal(h.input(view.schedule, 'time'), '09:10');
    assert.match(label(view.dialog), /구획 날짜 · 2026-10-05/);
    assert.equal(h.results.length, 0); assert.deepEqual(h.data, before);
  } finally { h.destroy(); }
});

test('DX02 changing only time explains individual date assignment and protects the exact original Item before apply', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    await h.open(f.taskIds[0]); const generation = h.generation();
    const view = h.draftSchedule('2026-10-05', '17:45');
    assert.match(label(view.schedule), /시간을 바꾸면 실행 날짜도 2026-10-05으로 개별 지정/);
    assert.equal(view.origin.props.disabled, true); view.origin.props.onClick(); await h.flush();
    assert.equal(h.navigation.length, 0); assert.equal(h.results.length, 0); assert.deepEqual(h.data, before);
    assert.deepEqual(h.generation(), generation, 'editing must not replace the disclosure owner');
    await h.submit('schedule'); assert.equal(h.render().origin.props.disabled, false);
    assert.equal(h.task(f.taskIds[0]).time, '17:45'); assert.equal(h.task(f.taskIds[0]).note, '첫 항목 메모');
    assert.deepEqual(h.data.spaces[f.actorId].text.progressRecords, before.spaces[f.actorId].text.progressRecords);
    assert.equal(h.task(f.taskIds[1]).date, '2026-10-12'); assert.deepEqual(h.data.public, before.public);
  } finally { h.destroy(); }
});

test('DX03 mounted progress and schedule values survive disclosure rerenders and retain pending origin protection', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); const generation = h.generation();
    h.draftProgress('2026-10-03', '65'); h.draftSchedule('2026-10-08', '18:20');
    for (let index = 0; index < 3; index++) {
      const view = h.render(); assert.equal(view.groups.length, 2); assert(view.progress); assert(view.schedule);
      assert.equal(h.input(view.progress, 'date'), '2026-10-03'); assert.equal(h.input(view.progress, 'number'), '65');
      assert.equal(h.input(view.schedule, 'date'), '2026-10-08'); assert.equal(h.input(view.schedule, 'time'), '18:20');
      assert.deepEqual(h.generation(), generation); assert.equal(view.origin.props.disabled, true);
    }
    assert.equal(h.results.length, 0);
  } finally { h.destroy(); }
});

test('DX04 progress alone blocks origin until applied; returning its date and percent to the opening values is clean', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]);
    h.draftProgress('2026-10-03', '30'); assert.equal(h.render().origin.props.disabled, true);
    h.draftProgress(TODAY, '65'); const pending = h.render(); assert.equal(pending.origin.props.disabled, true);
    assert.match(label(pending.dialog), /입력을 적용하거나.*닫아 취소/);
    pending.origin.props.onClick(); await h.flush(); assert.equal(h.navigation.length, 0); assert.equal(h.results.length, 0);
    h.draftProgress(TODAY, '30'); assert.equal(h.render().origin.props.disabled, false);
    h.draftProgress('2026-10-03', '65'); await h.submit('progress');
    assert.equal(h.render().origin.props.disabled, false);
    assert.deepEqual(M.progressHistory(h.data.spaces[f.actorId].text, f.taskIds[0]).map(record => [record.date, record.percent]), [['2026-10-03', 65], [TODAY, 30]]);
    assert.equal(h.task(f.taskIds[0]).date, '2026-10-05');
  } finally { h.destroy(); }
});

test('DX05 accepted progress rebases only its submitted values and preserves newer input during delayed storage', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); h.draftProgress(TODAY, '50');
    const gate = h.blockNext(), form = h.render().progress; form.props.onSubmit({ preventDefault() {} }); await gate.started;
    h.draftProgress('2026-10-03', '65'); gate.release(); await h.flush();
    const view = h.render(); assert.equal(h.input(view.progress, 'date'), '2026-10-03'); assert.equal(h.input(view.progress, 'number'), '65');
    assert.equal(view.origin.props.disabled, true); assert.equal(M.latestProgress(h.data.spaces[f.actorId].text, f.taskIds[0])?.percent, 50);
    h.draftProgress(TODAY, '50'); assert.equal(h.render().origin.props.disabled, false);
  } finally { h.destroy(); }
});

test('DX06 rejected schedule and progress keep drafts mounted and origin blocked without changing committed bytes', async () => {
  for (const kind of ['schedule', 'progress'] as const) {
    const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
    try {
      await h.open(f.taskIds[0]); const generation = h.generation(); h.reject('limit');
      if (kind === 'schedule') h.draftSchedule('2026-10-08', '18:20'); else h.draftProgress('2026-10-03', '65');
      await h.submit(kind); assert.deepEqual(h.results.at(-1), { ok: false, reason: 'limit' });
      const view = h.render(); assert.equal(view.origin.props.disabled, true); assert.deepEqual(h.generation(), generation);
      assert.match(label(view.dialog), /보관 한도/); assert.deepEqual(h.data, before);
      if (kind === 'schedule') { assert.equal(h.input(view.schedule, 'date'), '2026-10-08'); assert.equal(h.input(view.schedule, 'time'), '18:20'); }
      else { assert.equal(h.input(view.progress, 'date'), '2026-10-03'); assert.equal(h.input(view.progress, 'number'), '65'); }
      h.reject(null); await h.submit(kind); assert(h.results.at(-1)?.ok); assert.equal(h.render().origin.props.disabled, false);
    } finally { h.destroy(); }
  }
});

test('DX07 a delayed date shortcut retains newer schedule input and the same disclosure owner', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); const generation = h.generation(), gate = h.blockNext();
    await h.click('오늘로 이동'); await gate.started; h.draftSchedule('2026-10-08', '18:20'); gate.release(); await h.flush();
    const view = h.render(); assert.equal(h.task(f.taskIds[0]).date, TODAY); assert.equal(h.task(f.taskIds[0]).time, '09:10');
    assert.equal(h.input(view.schedule, 'date'), '2026-10-08'); assert.equal(h.input(view.schedule, 'time'), '18:20');
    assert.equal(view.origin.props.disabled, true); assert.deepEqual(h.generation(), generation);
    await h.submit('schedule'); assert.equal(h.render().origin.props.disabled, false);
  } finally { h.destroy(); }
});

test('DX08 clean origin opens the exact same-title Item row and performs no product write', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[1]); const before = programClone(h.data), view = h.render(); assert.equal(view.origin.props.disabled, false);
    view.origin.props.onClick(); await h.flush();
    assert.deepEqual(h.navigation, [[{ view: 'space', id: f.documentId }, { writingLineId: f.taskIds[1] }]]);
    assert.deepEqual(h.data, before); assert.equal(h.results.filter(result => result.ok && result.changed).length, 0);
    const editor = h.render().all.find(node => node.props.docId === f.documentId && node.props.onCommit); assert(editor);
    assert.equal(editor.props.initialPosition.lineId, f.taskIds[1]);
    const doc = M.getDocument(h.data.spaces[f.actorId].text, f.documentId)!;
    const index = doc.lines.findIndex(line => line.id === f.taskIds[1]);
    assert.equal(editor.props.initialPosition.start, doc.lines.slice(0, index).reduce((offset, line) => offset + line.text.length + 1, 0));
    assert.equal(h.render().schedule, undefined, 'origin navigation deliberately closes only the clean detail');
  } finally { h.destroy(); }
});

test('PWC04 linked memo opens its exact reference line, protects pending inputs and makes no copy', async () => {
  const f = fixture(), space = f.data.spaces[f.actorId];
  space.text = M.addDocument(space.text, { title: '연결 비교 메모' });
  const memo = space.text.documents.at(-1)!;
  space.text = M.editText(space.text, memo.id, '비교 내용과 자료');
  space.text = M.linkTask(space.text, memo.id, M.getDocument(space.text, memo.id)!.lines.length, f.taskIds[0]);
  const binding = space.text.bindings.find(row => row.kind === 'task' && row.docId === memo.id)!;
  assert(binding); const h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); const before = programClone(h.data);
    const target = () => h.render().button('연결 비교 메모 열기'); assert(target());
    h.draftSchedule('2026-10-09'); assert.equal(target().props.disabled, true);
    h.close(); await h.open(f.taskIds[0]); assert.equal(target().props.disabled, false);
    target().props.onClick(); await h.flush();
    assert.deepEqual(h.navigation, [[{ view: 'space', id: memo.id }, { writingLineId: binding.lineId }]]);
    assert.deepEqual(h.data, before); assert.equal(h.results.filter(row => row.ok && row.changed).length, 0);
  } finally { h.destroy(); }
});

test('RX01 a busy source return keeps the same panel and explicitly retries the exact Item without writes', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    await h.open(f.taskIds[1]); const generation = h.generation(); h.reject('busy');
    await h.render().origin.props.onClick(); await h.flush();
    assert(h.render().origin, 'a rejected return must keep its retry button');
    assert.deepEqual(h.generation(), generation); assert.match(label(h.render().dialog), /다시 눌러/);
    assert.equal(h.navigation.length, 0); assert.deepEqual(h.data, before);
    h.reject(null); await h.render().origin.props.onClick(); await h.flush();
    assert.deepEqual(h.navigation, [[{ view: 'space', id: f.documentId }, { writingLineId: f.taskIds[1] }]]);
    assert.equal(h.render().schedule, undefined); assert.deepEqual(h.data, before);
  } finally { h.destroy(); }
});

test('RX02 missing or conflict source returns retain their panel and existing failure reason', async () => {
  for (const reason of ['missing', 'conflict']) {
    const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
    try {
      await h.open(f.taskIds[0]); const generation = h.generation(); h.reject(reason);
      await h.render().origin.props.onClick(); await h.flush();
      assert(h.render().origin, reason); assert.deepEqual(h.generation(), generation);
      assert(nodes(h.render().dialog).some(node => node.props.role === 'alert'));
      assert.equal(h.navigation.length, 0); assert.deepEqual(h.data, before);
    } finally { h.destroy(); }
  }
});

test('RX03 an old source response after close cannot navigate or close a different task panel', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    await h.open(f.taskIds[0]); const gate = h.blockNext();
    const pending = h.render().origin.props.onClick(); await gate.started;
    h.close(); await h.open(f.taskIds[1]); const generation = h.generation();
    gate.release(); await pending; await h.flush();
    assert.deepEqual(h.generation(), generation); assert(h.render().origin);
    assert.equal(h.input(h.render().schedule, 'date'), '2026-10-12');
    assert.equal(h.navigation.length, 0); assert.deepEqual(h.data, before);
  } finally { h.destroy(); }
});

test('RX04 a date draft typed while the source return waits remains in its panel without navigation', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    await h.open(f.taskIds[0]); const gate = h.blockNext();
    const pending = h.render().origin.props.onClick(); await gate.started;
    h.draftSchedule('2026-10-08', '18:20'); gate.release(); await pending; await h.flush();
    assert.equal(h.input(h.render().schedule, 'date'), '2026-10-08');
    assert.equal(h.input(h.render().schedule, 'time'), '18:20');
    assert.equal(h.render().origin.props.disabled, true);
    assert.equal(h.navigation.length, 0); assert.deepEqual(h.data, before);
  } finally { h.destroy(); }
});

test('RX05 a progress draft typed while the source return waits remains unchanged without navigation', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    await h.open(f.taskIds[0]); const gate = h.blockNext();
    const pending = h.render().origin.props.onClick(); await gate.started;
    h.draftProgress('2026-10-03', '65'); gate.release(); await pending; await h.flush();
    assert.equal(h.input(h.render().progress, 'date'), '2026-10-03');
    assert.equal(h.input(h.render().progress, 'number'), '65');
    assert.equal(h.render().origin.props.disabled, true);
    assert.equal(h.navigation.length, 0); assert.deepEqual(h.data, before);
  } finally { h.destroy(); }
});

test('DX09 close and Escape discard only unsubmitted detail values with zero writes and new disclosure generations', async () => {
  for (const cancel of [false, true]) {
    const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
    try {
      await h.open(f.taskIds[0]); const generation = h.generation();
      h.draftSchedule('2026-10-08', '18:20'); h.draftProgress('2026-10-03', '65'); h.close(cancel);
      assert.equal(h.render().schedule, undefined); assert.equal(h.render().progress, undefined);
      assert.equal(h.results.length, 0); assert.deepEqual(h.data, before); assert.equal(h.focused.opener, 1);
      const view = await h.open(f.taskIds[0]); assert.notDeepEqual(h.generation(), generation);
      for (const group of view.groups) assert.notEqual(group.props.open, true);
      assert.equal(h.input(view.schedule, 'date'), '2026-10-05'); assert.equal(h.input(view.schedule, 'time'), '09:10');
      assert.equal(h.input(view.progress, 'date'), TODAY); assert.equal(h.input(view.progress, 'number'), '30');
      assert.equal(view.origin.props.disabled, false); assert.equal(h.results.length, 0);
    } finally { h.destroy(); }
  }
});

test('DX10 closing after an opener disappears requests the visible period fallback without writing', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); const before = programClone(h.data), priorPeriodFocus = h.focused.period; h.opener.isConnected = false; h.close();
    assert.equal(h.focused.opener, 0); assert.equal(h.focused.period, priorPeriodFocus + 1); assert.deepEqual(h.data, before); assert.equal(h.results.length, 0);
  } finally { h.destroy(); }
});

test('DX11 unchanged date/time stays zero-write and an explicit undated apply preserves the same Item context', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    await h.open(f.taskIds[0]); const generation = h.generation(); await h.submit('schedule');
    assert.equal(h.results.filter(result => result.ok && result.changed).length, 0); assert.deepEqual(h.data, before);
    const view = h.draftSchedule('', '09:10'); assert.match(label(view.schedule), /실행 날짜를 미정으로 개별 지정/);
    assert.equal(view.origin.props.disabled, true); await h.submit('schedule');
    assert.equal(h.task(f.taskIds[0]).date, null); assert.equal(h.task(f.taskIds[0]).time, '09:10');
    assert.equal(h.task(f.taskIds[0]).id, f.taskIds[0]); assert.equal(h.task(f.taskIds[0]).note, '첫 항목 메모');
    assert.deepEqual(h.data.spaces[f.actorId].text.progressRecords, before.spaces[f.actorId].text.progressRecords);
    assert.deepEqual(h.generation(), generation); assert.equal(h.render().origin.props.disabled, false);
  } finally { h.destroy(); }
});

test('DX12 opening another same-title task discards only cancelled drafts and starts from that exact task progress', async () => {
  const f = fixture(), h = harness(f.data, f.documentId), before = programClone(f.data);
  try {
    await h.open(f.taskIds[0]); h.draftProgress('2026-10-03', '65'); h.close();
    const view = await h.open(f.taskIds[1]);
    assert.equal(h.input(view.progress, 'date'), TODAY); assert.equal(h.input(view.progress, 'number'), '0');
    assert.equal(view.origin.props.disabled, false); assert.equal(h.input(view.schedule, 'date'), '2026-10-12');
    assert.deepEqual(h.data, before); assert.equal(h.results.length, 0);
  } finally { h.destroy(); }
});

test('DX13 an old progress success cannot rebase the pending values or clean baseline of a newly opened task dialog', async () => {
  const f = fixture(), h = harness(f.data, f.documentId);
  try {
    await h.open(f.taskIds[0]); h.draftProgress(TODAY, '50');
    const gate = h.blockNext(), form = h.render().progress; form.props.onSubmit({ preventDefault() {} }); await gate.started;
    h.close(); await h.open(f.taskIds[1]); h.draftProgress('2026-10-03', '65');
    gate.release(); await h.flush();
    const view = h.render(); assert.equal(h.input(view.progress, 'date'), '2026-10-03'); assert.equal(h.input(view.progress, 'number'), '65');
    assert.equal(view.origin.props.disabled, true); assert.equal(M.latestProgress(h.data.spaces[f.actorId].text, f.taskIds[0])?.percent, 50);
    assert.equal(M.progressHistory(h.data.spaces[f.actorId].text, f.taskIds[1]).length, 0);
    h.draftProgress(TODAY, '0'); assert.equal(h.render().origin.props.disabled, false);
  } finally { h.destroy(); }
});

test('DX14 consecutive progress ACKs and a past-record no-op clear origin in the automatically committed render', async () => {
  const f = fixture(), h = harness(f.data, f.documentId, true);
  try {
    await h.open(f.taskIds[0]); await settle();
    h.draftProgress('2026-10-03', '20'); await h.submit('progress'); await settle();
    assert.equal(h.committedView.origin.props.disabled, false, 'first ACK must commit its baseline');
    h.draftProgress(TODAY, '45'); await h.submit('progress'); await settle();
    assert.equal(h.committedView.origin.props.disabled, false, 'repeated success text must not suppress the next ACK render');
    await h.click('2026-10-03 · 20%'); await settle();
    assert.equal(h.committedView.origin.props.disabled, true);
    const before = programClone(h.data), rendersBefore = h.stateRenderCount;
    const form = h.render().progress;
    await form.props.onSubmit({ preventDefault() {} }); await settle();
    const result = h.results.at(-1); assert(result?.ok); assert.equal(result.changed, false);
    assert.deepEqual(h.data, before, 'same record must not create a data mutation');
    assert(h.stateRenderCount > rendersBefore, 'accepted no-op needs its own state-baseline render');
    assert.equal(h.committedView.origin.props.disabled, false, 'assert the ACK-created tree without manually rendering it again');
    assert.deepEqual(M.progressHistory(h.data.spaces[f.actorId].text, f.taskIds[0]).map(record => [record.date, record.percent]), [['2026-10-03', 20], [TODAY, 45]]);
  } finally { h.destroy(); }
});
