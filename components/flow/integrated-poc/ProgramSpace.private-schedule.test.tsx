import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { createProgramData, createProgramEnvelope, validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programClone, type ProgramData, type ProgramTransition } from '../../../lib/flow/integrated-poc/contract';
import { importProgramPublicVersion, recordProgramTaskProgress, updateProgramTask } from '../../../lib/flow/integrated-poc/private-space';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { captureAlphaAccount, commandFromProgramTransition } from '../../../lib/flow/integrated-poc/alpha-persistence/program-adapter';
import { executeAlphaSocialIntent } from '../../../lib/flow/integrated-poc/alpha-social/dispatch';
import type { AlphaSocialIntent } from '../../../lib/flow/integrated-poc/alpha-social/contract';
import { applyProgramCreatorAction, setProgramCreatorWorking } from '../../../lib/flow/integrated-poc/creator-workspace';
import { createTextAuthoringDocument } from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/parser';
import { createNativeCreatorDocumentOwner } from '../../../lib/flow/integrated-poc/native-creator-document';
import { applyProgramNativeCreatorHandoff, inspectProgramNativeCreatorHandoff } from '../../../lib/flow/integrated-poc/creator-native-execution-adapter';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../../../lib/flow/personal-workspace-poc-authoring';
import { parseAuthoringRecurrenceRule } from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/recurrence';
import { programPublicRecurrenceFromAuthoring } from '../../../lib/flow/integrated-poc/public-recurrence-contract';
import type { ProgramSpaceProps } from './ProgramSpace';
import type { ProgramTextEditorProps, createProgramTextDraft as DraftFactory } from './ProgramTextEditor';
import type { ProgramMutate } from '../../../lib/flow/integrated-poc/ui-contract';

const TODAY = '2026-10-01', NOW = '2026-10-01T08:00:00.000Z';
function accepted<T>(transition: ProgramTransition<T>) {
  if (!transition.ok) assert.fail(transition.reason);
  assert(validateProgramData(transition.data)); return transition;
}
function publicFixture(secondItem = false) {
  let data = createProgramData(); const actorId = data.activeActorId;
  data.public.flows.push({ id: 'schedule-source', ownerId: 'creator-minji', currentVersionId: 'schedule-v1', category: '준비',
    situations: [], derivedFrom: null, archived: false });
  data.public.versions.push({ id: 'schedule-v1', flowId: 'schedule-source', number: 1, parentVersionId: null,
    title: '준비 계획', summary: '', createdBy: 'creator-minji', createdAt: NOW,
    source: { kind: 'simulated-example', label: '합성 검증 예시', url: null, checkedAt: null }, items: [{ id: 'schedule-item',
      title: '같은 할 일', description: '원래 설명', completionCriteria: '원래 완료 기준', sourceUrl: null,
      schedule: { kind: 'fixed', date: '2026-10-02', timing: { version: 1, time: '09:10', timeZone: 'Asia/Seoul' } },
      subchecks: [{ id: 'schedule-child', title: '하위 확인' }] }] });
  if (secondItem) data.public.versions[0].items.push({ ...programClone(data.public.versions[0].items[0]),
    id: 'schedule-item-two', title: '같은 사본의 두 번째 항목', subchecks: [] });
  data = accepted(importProgramPublicVersion(data, { actorId, requestId: 'schedule-import', expectedSpace: data.spaces[actorId],
    versionId: 'schedule-v1', itemIds: secondItem ? ['schedule-item', 'schedule-item-two'] : ['schedule-item'], anchor: null })).data;
  const copy = data.spaces[actorId].copies[0], taskId = copy.itemLines['schedule-item'];
  data = accepted(updateProgramTask(data, { actorId, requestId: 'schedule-private-note', expectedSpace: data.spaces[actorId],
    taskId, patch: { note: '개인 메모' } })).data;
  data = accepted(recordProgramTaskProgress(data, { actorId, requestId: 'schedule-progress', expectedSpace: data.spaces[actorId],
    taskId, date: TODAY, percent: 30 })).data;
  return { data, actorId, taskId, documentId: copy.documentId, copyId: copy.id };
}
function independentFixture() {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  space.text = M.addDocument(space.text, { title: '개인 문서' }); const documentId = space.text.documents[0].id;
  space.text = M.editText(space.text, documentId, '- [ ] 같은 할 일\n  - 날짜: 2026-10-02\n  - 시간: 09:10\n  - 메모: 개인 메모');
  assert(validateProgramData(data)); return { data, actorId, documentId, taskId: M.tasks(space.text)[0].id };
}
function nativeFixture() {
  let data = createProgramData(); const actorId = data.activeActorId, draftId = 'schedule-native-draft';
  const rawText = '# 개인 준비\n- [ ] 같은 할 일\n  - 날짜: 2026-10-02\n  - 시간: 09:10';
  const document = createTextAuthoringDocument(rawText, { documentId: 'schedule-native-source', ownership: 'creator', now: NOW });
  const source = { storageKey: 'flow:text-authoring:drafts:v1' as const, draftId: 'schedule-original-draft', versionId: 'schedule-original-version',
    revisionId: document.revision.revisionId, documentJson: JSON.stringify(document) };
  const native = createNativeCreatorDocumentOwner({ id: draftId, source }, NOW); assert(native.ok);
  const working = { draftId, title: '개인 준비', rawText, baseRecordRevision: null, nativeDocument: native.owner, nativeSelection: source };
  data = accepted(setProgramCreatorWorking(data, { actorId, expectedWorking: null, working }, NOW)).data;
  data = accepted(applyProgramCreatorAction(data, { actorId, requestId: 'schedule-native-save', expectedStructure: null,
    expectedNativeDocument: native.owner, expectedNativeSelection: source, action: { type: 'save', draftId, title: working.title,
      rawText, sourceFingerprint: fingerprint(rawText), expectedLibraryRevision: data.spaces[actorId].creatorWorkspace!.library.revision, now: NOW } }, NOW)).data;
  const review = inspectProgramNativeCreatorHandoff(data, { actorId, draftId }, NOW); assert(review.ok);
  const choices = Object.fromEntries(review.preview.rows.map(row => [row.itemId,
    { source: 'incoming' as const, date: 'keep' as const, time: 'keep' as const, children: 'keep' as const }]));
  const handoff = accepted(applyProgramNativeCreatorHandoff(data, { actorId, requestId: 'schedule-native-handoff', preview: review.preview, choices }, NOW));
  data = handoff.data;
  const task = M.tasks(data.spaces[actorId].text).find(row => row.docId === handoff.result)!;
  assert(task); return { data, actorId, documentId: task.docId, taskId: task.id };
}
const label = (value: any): string => Array.isArray(value) ? value.map(label).join('') : typeof value === 'string' || typeof value === 'number'
  ? String(value) : value?.props ? label(value.props.children) : '';
const settle = () => new Promise<void>(done => setImmediate(done));

// Render the whole production ProgramSpace and invoke its actual forms and task
// menu. Hooks/DOM and the host are deterministic doubles; browser input handling,
// Auth/API and persistence are verified in their separate integration gates.
function harness(seed: ProgramData, documentId: string, host: 'local' | 'account' = 'account',
  serverIds?: 'before-settlement' | 'after-settlement' | 'unrendered') {
  let data = seed, at = 0, successful = 0, failure: string | null = null, focused = 0, reconcile: (() => void) | undefined,
    mount: (() => () => void) | undefined, cleanup: (() => void) | undefined;
  const slots: any[] = [], requests: { kind: 'social' | 'private'; intent?: AlphaSocialIntent; fields?: string[] }[] = [];
  const calls: { label: string; options: Parameters<ProgramMutate>[2]; transition: ProgramTransition<string> }[] = [];
  const hooks = { ...React,
    useState: (initial: any) => { const index = at++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (value: any) => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef: (initial: any) => { const index = at++; if (!(index in slots)) slots[index] = { current: initial }; return slots[index]; },
    useMemo: (build: any) => { at++; return build(); }, useEffect: (effect: () => any) => { at++; if (String(effect).includes('reconcileScheduleAcknowledgment()')) reconcile = effect;
      else if (!mount && String(effect).includes('scheduleMounted.current = true')) { mount = effect; cleanup = effect(); } },
  };
  const url = new URL('./ProgramSpace.tsx', import.meta.url), require = createRequire(url), root = resolve(dirname(fileURLToPath(url)), '../../..');
  const loaded = { exports: {} as { ProgramSpace: (props: ProgramSpaceProps) => React.ReactNode } };
  const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const documentMock: { activeElement: any } = { activeElement: null };
  documentMock.activeElement = { tagName: 'BUTTON', parentElement: null, isConnected: true, ownerDocument: documentMock,
    getClientRects: () => [{}], closest: () => null, matches: () => false,
    focus() { focused++; documentMock.activeElement = this; } };
  vm.runInThisContext(`(function(module,exports,require,document){${compiled}\n})`)(loaded, loaded.exports, (id: string) => {
    if (id === 'react') return hooks;
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id.startsWith('./Program')) return new Proxy({}, { get: (_, name) => Object.assign(() => null, { displayName: String(name) }) });
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, documentMock);
  const mutate: ProgramMutate = async (name, build, options) => {
    const transition = build(data); calls.push({ label: name, options, transition });
    if (!transition.ok) return { ok: false, reason: transition.reason };
    if (!transition.changed) return { ok: true, result: transition.result, changed: false };
    let authoritative = transition;
    if (host === 'account') {
      if (options?.alphaSocial) {
        const intent = typeof options.alphaSocial === 'function' ? options.alphaSocial() : options.alphaSocial;
        const server = executeAlphaSocialIntent(data, data.activeActorId, intent, `schedule-wire-${requests.length}`, NOW);
        if (!server.ok) return { ok: false, reason: server.reason };
        const comparable = programClone(server.data.spaces[data.activeActorId]);
        const originalIds = new Set([...data.spaces[data.activeActorId].text.documents, ...data.spaces[data.activeActorId].text.flows]
          .flatMap(doc => doc.lines.map(line => line.id)));
        for (const doc of [...comparable.text.documents, ...comparable.text.flows]) {
          const proposed = M.getDocument(transition.data.spaces[data.activeActorId].text, doc.id)!;
          doc.lines.forEach((line, index) => { if (!originalIds.has(line.id)) line.id = proposed.lines[index].id; });
        }
        assert.deepEqual(comparable, transition.data.spaces[data.activeActorId], 'wire reuses the existing private task transition and preserves original row identities');
        assert.deepEqual(server.data.public, data.public);
        requests.push({ kind: 'social', intent });
        authoritative = server;
      } else {
        const envelope = createProgramEnvelope(data), captured = captureAlphaAccount(envelope, data.activeActorId, 'schedule-owner');
        const command = commandFromProgramTransition(captured.account, captured.references, `schedule-wire-${requests.length}`, build);
        assert.equal(command.kind, 'change-private');
        if (command.kind === 'change-private') requests.push({ kind: 'private', fields: command.changes.map(change => change.field) });
      }
    }
    if (failure) return { ok: false, reason: failure };
    successful++; data = authoritative.data;
    if (!serverIds || serverIds === 'before-settlement') render();
    return { ok: true, result: transition.result, changed: transition.changed };
  };
  function render() {
    at = 0;
    const tree = loaded.exports.ProgramSpace({ data, mutate, navigate: () => {}, selectedDocumentId: documentId,
      today: TODAY, onUndo: async () => {}, onRedo: async () => {} });
    const nodes: any[] = [];
    function walk(value: any) { if (Array.isArray(value)) value.forEach(walk); else if (value?.props) { nodes.push(value); walk(value.props.children); } }
    walk(tree);
    const dialog = nodes.find(node => node.type === 'dialog' && node.props['aria-labelledby'] === 'program-detail-title');
    dialog.props.ref.current = { close() {}, showModal() {}, open: true };
    reconcile?.();
    return { nodes, dialog, button: (text: string) => nodes.find(node => node.type === 'button' && label(node.props.children) === text),
      taskMenu: (title: string) => nodes.find(node => node.type === 'button' && node.props['aria-label'] === `${title} 작업`),
      editor: nodes.find(node => node.props.docId === documentId && node.props.onCommit),
      schedule: nodes.find(node => node.type === 'form' && label(node.props.children).includes('날짜·시간 적용')) };
  }
  async function open(taskId: string) {
    await click('분류');
    const task = M.tasks(data.spaces[data.activeActorId].text).find(row => row.id === taskId)!;
    const menu = render().taskMenu(task.title); assert(menu); menu.props.onClick({ detail: 0 }); return render();
  }
  async function click(text: string) { const button = render().button(text); assert(button, text); button.props.onClick(); await settle(); return render(); }
  function draft(date: string, time: string) {
    let form = render().schedule; assert(form);
    const inputs: any[] = [];
    const walk = (value: any) => { if (Array.isArray(value)) value.forEach(walk); else if (value?.props) { if (value.type === 'input') inputs.push(value); walk(value.props.children); } };
    walk(form);
    inputs.find(input => input.props.type === 'date').props.onChange({ target: { value: date } });
    inputs.find(input => input.props.type === 'time').props.onChange({ target: { value: time } }); render();
  }
  async function submit() { const form = render().schedule; assert(form); form.props.onSubmit({ preventDefault() {} }); await settle(); return render(); }
  return { render, open, click, draft, submit, calls, requests, get data() { return data; }, get successful() { return successful; }, get focused() { return focused; },
    reject(reason: string | null) { failure = reason; }, replace(next: ProgramData) { data = next; render(); }, unmount() { assert(cleanup); cleanup(); },
    remountEffect() { assert(mount); cleanup = mount(); } };
}
function task(data: ProgramData, taskId: string) { return M.tasks(data.spaces[data.activeActorId].text).find(row => row.id === taskId)!; }

function textEditorHarness(initial: ProgramTextEditorProps) {
  let inputLock: ((locked: boolean) => void) | null = null, viewportRefreshes = 0;
  let props = { ...initial, onRegisterInputLock: (port: typeof inputLock) => { inputLock = port; initial.onRegisterInputLock?.(port); } }, si = 0, ri = 0, config: any;
  const states: any[] = [], refs: any[] = [], effects: (() => unknown)[] = [], events: Record<string, () => void> = {};
  const selectionEvents: { type: string; bubbles: boolean; start: number; end: number }[] = [];
  const textarea = { value: M.raw(M.getDocument(props.workspace, props.docId)), selectionStart: 0, selectionEnd: 0, scrollTop: 0,
    readOnly: false, addEventListener() {}, removeEventListener() {}, setSelectionRange(start: number, end: number) { this.selectionStart = start; this.selectionEnd = end; },
    // The production textarea notifies its native selection/viewport listeners.
    // This DOM double records the event; it does not synthesize input or a save.
    dispatchEvent(event: Event) {
      assert.equal(event.type, 'select'); assert.equal(event.bubbles, true);
      selectionEvents.push({ type: event.type, bubbles: event.bubbles, start: this.selectionStart, end: this.selectionEnd });
      return true;
    } };
  const host = { querySelector: () => textarea, addEventListener: (name: string, callback: () => void) => { events[name] = callback; }, removeEventListener() {} };
  const native = { create: (_host: unknown, options: unknown) => { config = options; return { refresh() {}, refreshViewport() { viewportRefreshes++; }, focus() {}, setMoveState() {}, destroy() {}, setMode() {},
    getValue: () => textarea.value, setValue: (value: string) => { textarea.value = value; return true; } }; } };
  const hooks = { ...React, useId: () => 'schedule-editor', useRef: (initial: unknown) => refs[ri++] ?? (refs[ri - 1] = { current: initial }),
    useState: (initial: any) => { const index = si++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (value: any) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
    useEffect: (effect: () => unknown) => { effects.push(effect); } };
  const url = new URL('./ProgramTextEditor.tsx', import.meta.url), require = createRequire(url), root = resolve(dirname(fileURLToPath(url)), '../../..');
  const loaded = { exports: {} as { ProgramTextEditor: (props: ProgramTextEditorProps) => React.ReactNode; createProgramTextDraft: typeof DraftFactory } };
  const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInThisContext(`(function(module,exports,require,window){${compiled}\n})`)(loaded, loaded.exports, (id: string) => {
    if (id === 'react') return hooks;
    if (id.endsWith('text-editor.cjs')) return native;
    if (id.endsWith('.css')) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, { addEventListener() {}, removeEventListener() {} });
  function render() {
    si = 0; ri = 0; effects.length = 0;
    const tree = loaded.exports.ProgramTextEditor(props), nodes: any[] = [];
    const walk = (value: any) => { if (Array.isArray(value)) value.forEach(walk); else if (value?.props) { nodes.push(value); walk(value.props.children); } }; walk(tree);
    const dialog = nodes.find(node => node.type === 'dialog'); if (dialog) dialog.props.ref.current = { close() {}, showModal() {}, open: true };
    return { nodes, dialog, form: nodes.find(node => node.type === 'form' && label(node.props.children).includes('날짜·시간 적용')) };
  }
  render(); refs[1].current = host;
  const unregister = effects[0]() as () => void, destroy = effects[1]() as () => void;
  function open(taskId: string) {
    const index = M.getDocument(props.workspace, props.docId)!.lines.findIndex(line => line.id === taskId);
    config.onAction({ type: 'task-date', lineIndex: index }); return render();
  }
  function draft(date: string, time: string) {
    const inputs = render().nodes.filter(node => node.type === 'input');
    inputs.find(input => input.props.type === 'date').props.onChange({ target: { value: date } });
    inputs.find(input => input.props.type === 'time').props.onChange({ target: { value: time } }); render();
  }
  async function submit() { const form = render().form; assert(form); form.props.onSubmit({ preventDefault() {} }); await settle(); return render(); }
  return { render, open, draft, submit, events, textarea, selectionEvents, get viewportRefreshes() { return viewportRefreshes; }, get controller() { return refs[3].current as ReturnType<typeof DraftFactory>; },
    get committed() { return props.workspace; }, lock(locked: boolean) { inputLock?.(locked); }, synchronize() { effects[2](); },
    input(raw: string) { textarea.value = raw; config.onChange(raw); },
    replace(next: ProgramTextEditorProps) { props = { ...next, onRegisterInputLock: props.onRegisterInputLock }; render(); }, unmount() { unregister(); destroy(); } };
}

test('PS01 actual account schedule form selects the exact public-copy intent and preserves task and source owners', async () => {
  const f = publicFixture(), before = programClone(f.data), h = harness(f.data, f.documentId), old = task(before, f.taskId);
  await h.open(f.taskId); h.draft('2026-10-05', '17:45'); await h.submit();
  assert.equal(h.successful, 1); assert.deepEqual(h.requests, [{ kind: 'social', intent: { type: 'private-task-schedule',
    copyId: f.copyId, itemId: 'schedule-item', taskId: f.taskId, date: '2026-10-05', time: '17:45' } }]);
  assert.equal(h.calls.at(-1)!.options?.history, true); assert(validateProgramData(h.data));
  const next = task(h.data, f.taskId); assert.equal(next.date, '2026-10-05'); assert.equal(next.time, '17:45');
  for (const key of ['id', 'docId', 'folderId', 'scopeId', 'title', 'note', 'done'] as const) assert.equal(next[key], old[key], key);
  assert.deepEqual(next.subchecks, old.subchecks); assert.deepEqual(h.data.spaces[f.actorId].text.progressRecords, before.spaces[f.actorId].text.progressRecords);
  assert.deepEqual(h.data.spaces[f.actorId].text.bindings, before.spaces[f.actorId].text.bindings);
  assert.deepEqual(h.data.public, before.public); assert.deepEqual(h.data.spaces['creator-minji'], before.spaces['creator-minji']);
  assert.deepEqual(h.data.spaces[f.actorId].copies[0].itemOverrides['schedule-item'], { date: '2026-10-05' });
  assert.deepEqual(f.data, before);
});

test('PS02 local PoC uses the same existing transition and exact task identity', async () => {
  const f = publicFixture(), h = harness(f.data, f.documentId, 'local'); await h.open(f.taskId);
  h.draft('2026-10-05', '17:45'); await h.submit();
  assert.equal(h.successful, 1); assert.equal(h.requests.length, 0);
  assert.equal(task(h.data, f.taskId).date, '2026-10-05'); assert.equal(task(h.data, f.taskId).time, '17:45');
  assert.equal((h.calls.at(-1)!.options?.alphaSocial as AlphaSocialIntent).type, 'private-task-schedule');
  assert.deepEqual(h.data.public, f.data.public);
});

test('PS03 existing today, tomorrow and undated controls keep saved time and use the same schedule intent', async () => {
  for (const [button, date] of [['오늘로 이동', TODAY], ['내일로 이어하기', '2026-10-02'], ['날짜 미정으로 이동', null]] as const) {
    const f = publicFixture(), h = harness(f.data, f.documentId); await h.open(f.taskId);
    h.draft('2026-11-20', '22:40'); await h.click(button);
    assert.equal(task(h.data, f.taskId).date, date); assert.equal(task(h.data, f.taskId).time, '09:10');
    assert.equal(h.requests.length, date === '2026-10-02' ? 0 : 1);
    const intent = h.calls.at(-1)!.options?.alphaSocial as AlphaSocialIntent;
    assert.deepEqual(intent, { type: 'private-task-schedule', copyId: f.copyId, itemId: 'schedule-item', taskId: f.taskId, date, time: '09:10' });
  }
});

test('PS04 clearing both date and time keeps the private explicit-null date sidecar', async () => {
  const f = publicFixture(), h = harness(f.data, f.documentId); await h.open(f.taskId); h.draft('', ''); await h.submit();
  assert.equal(task(h.data, f.taskId).date, null); assert.equal(task(h.data, f.taskId).time, null);
  assert.deepEqual(h.data.spaces[f.actorId].copies[0].itemOverrides['schedule-item'], { date: null });
  assert.equal(h.requests.length, 1); assert.deepEqual(h.data.public, f.data.public);
});

test('PS05 unchanged submission and menu values create zero wire requests and successful mutations', async () => {
  const f = publicFixture(), h = harness(f.data, f.documentId), before = JSON.stringify(f.data);
  await h.open(f.taskId); await h.submit(); await h.click('내일로 이어하기');
  assert.equal(h.requests.length, 0); assert.equal(h.successful, 0); assert.equal(JSON.stringify(h.data), before);
});

test('PS06 close and Escape cancellation discard only schedule drafts and return focus with zero mutations', async () => {
  for (const cancel of ['close', 'escape'] as const) {
    const f = publicFixture(), h = harness(f.data, f.documentId), before = JSON.stringify(f.data); await h.open(f.taskId); h.draft('2026-12-25', '23:59');
    if (cancel === 'close') {
      const close = h.render().dialog.props.children;
      const controls: any[] = [];
      function walk(value: any) { if (Array.isArray(value)) value.forEach(walk); else if (value?.props) { controls.push(value); walk(value.props.children); } }
      walk(close);
      const button = controls.find(node => node.type === 'button' && node.props['aria-label'] === '닫기'); assert(button);
      button.props.onClick(); h.render();
    } else { h.render().dialog.props.onCancel({ preventDefault() {} }); h.render(); }
    assert.equal(h.render().schedule, undefined); assert.equal(h.calls.length, 0); assert.equal(h.requests.length, 0);
    assert.equal(h.successful, 0); assert.equal(JSON.stringify(h.data), before); assert.equal(h.focused, 1);
    await h.open(f.taskId); const form = h.render().schedule; assert.match(label(form.props.children), /날짜·시간 적용/);
    await h.submit(); assert.equal(h.requests.length, 0);
  }
});

test('PS07 invalid date and time preserve the existing validation and never reach a wire request', async () => {
  for (const [date, time] of [['2026-02-30', '09:10'], ['invalid', '09:10'], ['2026-10-05', '24:00'],
    ['2026-10-05', '09:60'], ['2026-10-05', '9:15'], ['2026-10-05', '09:15:30'], ['2026-10-05', ' 09:15 ']]) {
    const f = publicFixture(), h = harness(f.data, f.documentId), before = JSON.stringify(f.data); await h.open(f.taskId); h.draft(date, time); await h.submit();
    assert.equal(h.requests.length, 0, `${date} ${time}`); assert.equal(h.successful, 0); assert.equal(JSON.stringify(h.data), before);
    assert(h.render().nodes.some(node => node.props.role === 'alert'));
  }
});

test('PS08 independent and actual native personal documents retain the M3 path and immutable creator data', async () => {
  for (const f of [independentFixture(), nativeFixture()]) {
    const h = harness(f.data, f.documentId), creator = structuredClone(f.data.spaces[f.actorId].creatorWorkspace);
    await h.open(f.taskId); h.draft('2026-10-05', '17:45'); await h.submit();
    assert.equal(h.successful, 1); assert.deepEqual(h.requests, [{ kind: 'private', fields: ['text'] }]);
    assert.equal(h.calls.at(-1)!.options?.alphaSocial, undefined); assert.equal(task(h.data, f.taskId).date, '2026-10-05');
    assert.equal(task(h.data, f.taskId).time, '17:45'); assert.deepEqual(h.data.spaces[f.actorId].creatorWorkspace, creator);
  }
});

test('PS09 actual document title and note edits never select private-task-schedule', async () => {
  for (const patch of [{ title: '개인 제목' }, { note: '수정한 개인 메모' }]) {
    const f = publicFixture(), h = harness(f.data, f.documentId), workspace = f.data.spaces[f.actorId].text;
    const next = M.updateTask(workspace, f.taskId, patch);
    assert(await h.render().editor.props.onCommit(next, '개인 본문 수정', { expectedWorkspace: workspace })); h.render();
    assert.equal(h.calls.at(-1)!.options?.alphaSocial, undefined); assert.deepEqual(h.requests, [{ kind: 'private', fields: ['text'] }]);
    assert.deepEqual(h.data.spaces[f.actorId].copies, f.data.spaces[f.actorId].copies);
    assert.deepEqual(h.data.public, f.data.public);
  }
});

test('PS10 an unjoined task, recurring source and damaged public-copy relations never select the narrow intent', async () => {
  for (const change of ['unjoined', 'recurring-source', 'wrong-document', 'duplicate-owner', 'missing-version'] as const) {
    const f = publicFixture(), space = f.data.spaces[f.actorId]; let taskId = f.taskId;
    if (change === 'unjoined') {
      space.text = M.addTask(space.text, { docId: f.documentId, title: '개인 추가 할 일', date: '2026-10-02' });
      taskId = M.tasks(space.text).find(row => row.title === '개인 추가 할 일')!.id;
    }
    if (change === 'wrong-document') space.copies[0].documentId = 'missing-document';
    if (change === 'duplicate-owner') space.copies.push({ ...programClone(space.copies[0]), id: 'competing-copy' });
    if (change === 'missing-version') space.copies[0].appliedFields['schedule-item'] = { schedule: 'missing-version' };
    if (change === 'recurring-source') {
      const parsed = parseAuthoringRecurrenceRule({ raw: '매일', repeatEnd: '3회', sourceRowIds: [], executionCondition: '' }); assert(parsed.ok);
      const rule = programPublicRecurrenceFromAuthoring(parsed.rule); assert(rule);
      f.data.public.versions[0].items[0].schedule = { kind: 'recurring', version: 1, rule, start: { kind: 'fixed', date: '2026-10-02' }, time: null, timeZone: null };
    }
    const h = harness(f.data, f.documentId, 'local'); await h.open(taskId); h.draft('2026-10-05', '17:45'); await h.submit();
    assert.equal(h.calls.at(-1)!.options?.alphaSocial, undefined, change);
  }
});

test('PS11 public subchecks keep their source identity and receive no ordinary task schedule menu', () => {
  const f = publicFixture(), h = harness(f.data, f.documentId), childId = f.data.spaces[f.actorId].copies[0].subcheckLines['schedule-item']['schedule-child'];
  assert(childId); assert.equal(h.render().taskMenu('하위 확인'), undefined);
  assert(!h.render().nodes.some(node => node.props['data-task-id'] === childId)); assert.equal(h.calls.length, 0);
});

test('PS12 a rejected schedule preserves input and resubmits the same intent when the component host permits it', async () => {
  const f = publicFixture(), h = harness(f.data, f.documentId), before = JSON.stringify(f.data); await h.open(f.taskId);
  h.draft('2026-10-05', '17:45'); h.reject('limit'); await h.submit();
  assert.equal(h.successful, 0); assert.equal(JSON.stringify(h.data), before); assert.equal(h.requests.length, 1); assert(h.render().schedule);
  h.reject(null); await h.submit(); assert.equal(h.successful, 1); assert.equal(h.requests.length, 2);
  assert.equal(task(h.data, f.taskId).date, '2026-10-05'); assert.equal(task(h.data, f.taskId).time, '17:45');
});

test('PS13 actual native text date form reaches the exact public-copy schedule intent through the existing draft save', async () => {
  for (const date of ['2026-10-05', null]) {
    const f = publicFixture(), h = harness(f.data, f.documentId), editor = textEditorHarness(h.render().editor.props);
    try {
      editor.open(f.taskId); editor.draft(date ?? '', '17:45'); await editor.submit();
      assert.equal(h.successful, 1); assert.deepEqual(h.requests, [{ kind: 'social', intent: { type: 'private-task-schedule',
        copyId: f.copyId, itemId: 'schedule-item', taskId: f.taskId, date, time: '17:45' } }]);
      assert.equal(editor.controller.getState().dirty, false); assert.equal(task(h.data, f.taskId).date, date);
      assert.deepEqual(editor.selectionEvents, [{ type: 'select', bubbles: true, start: 0, end: 0 }]);
      assert.equal(editor.viewportRefreshes, 1);
      assert.deepEqual(h.data.spaces[f.actorId].copies[0].itemOverrides['schedule-item'], { date }); assert.deepEqual(h.data.public, f.data.public);
    } finally { editor.unmount(); }
  }
});

test('PS14 explicit text schedule refuses unrelated workspace edits, a foreign task, stale input and damaged copy ownership', async () => {
  for (const change of ['title', 'other-document', 'same-document-date', 'same-document-id', 'foreign-task', 'stale-workspace', 'damaged-copy'] as const) {
    const f = publicFixture(true), space = f.data.spaces[f.actorId];
    space.text = M.addDocument(space.text, { title: '다른 문서' }); const otherId = space.text.documents.at(-1)!.id;
    space.text = M.editText(space.text, otherId, '- [ ] 다른 작업');
    const h = harness(f.data, f.documentId), props = h.render().editor.props, before = props.workspace;
    const schedule = { taskId: f.taskId, date: '2026-10-05', time: '17:45' };
    let next = M.updateTask(before, f.taskId, { date: schedule.date, time: schedule.time });
    if (change === 'title') next = M.updateTask(next, f.taskId, { title: '동시에 바꾼 제목' });
    if (change === 'other-document') next = M.editText(next, otherId, '- [ ] 동시에 바꾼 다른 문서');
    if (change === 'same-document-date') next = M.updateTask(next, M.tasks(before).find(row => row.title === '같은 사본의 두 번째 항목')!.id, { date: '2026-12-31' });
    if (change === 'same-document-id') { next = programClone(next); const other = M.tasks(next).find(row => row.title === '같은 사본의 두 번째 항목')!;
      M.getDocument(next, f.documentId)!.lines.find(line => line.id === other.id)!.id = 'tampered-second-item-id';
      next.taskScopes['tampered-second-item-id'] = next.taskScopes[other.id]; delete next.taskScopes[other.id];
      next.itemScopes['tampered-second-item-id'] = next.itemScopes[other.id]; delete next.itemScopes[other.id]; }
    if (change === 'foreign-task') schedule.taskId = M.tasks(before).find(row => row.docId === otherId)!.id;
    const expected = change === 'stale-workspace' ? M.editText(before, otherId, '- [ ] 다른 탭 입력') : before;
    if (change === 'damaged-copy') space.copies[0].documentId = 'missing-document';
    if (change === 'same-document-date' || change === 'same-document-id') {
      assert(validateProgramData(f.data), 'the same-copy two-Item baseline is a valid aggregate');
      assert(M.validate(next), 'the unrelated date/ID proposal is syntactically valid but outside the exact target delta');
    }
    const baseline = JSON.stringify(h.data);
    assert.equal(await props.onCommit(next, '항목 날짜·시간', { expectedWorkspace: expected, privateTaskSchedule: schedule }), false, change);
    assert.equal(h.calls.length, 0, change); assert.equal(h.requests.length, 0); assert.equal(h.successful, 0); assert.equal(JSON.stringify(h.data), baseline);
  }
});

test('PS15 text date form stays read-only during composition and input lock and cancels unchanged input without saving', async () => {
  for (const guard of ['same', 'escape', 'composition', 'locked'] as const) {
    const f = publicFixture(), h = harness(f.data, f.documentId), editor = textEditorHarness(h.render().editor.props), baseline = JSON.stringify(f.data);
    try {
      editor.open(f.taskId); if (guard !== 'same') editor.draft('2026-10-05', '17:45');
      if (guard === 'escape') editor.render().dialog.props.onCancel({ preventDefault() {} });
      else if (guard === 'locked') { const oldForm = editor.render().form; editor.lock(true); oldForm.props.onSubmit({ preventDefault() {} }); await settle(); }
      else { if (guard === 'composition') editor.events.compositionstart(); await editor.submit(); }
      assert.equal(h.calls.length, 0, guard); assert.equal(h.requests.length, 0); assert.equal(h.successful, 0); assert.equal(JSON.stringify(h.data), baseline);
    } finally { editor.unmount(); }
  }
});

test('PS16 native and independent text date forms retain generic M3 and direct raw date editing never creates an intent', async () => {
  for (const f of [independentFixture(), nativeFixture()]) {
    const h = harness(f.data, f.documentId), editor = textEditorHarness(h.render().editor.props);
    try {
      editor.open(f.taskId); editor.draft('2026-10-05', '17:45'); await editor.submit();
      assert.deepEqual(h.requests, [{ kind: 'private', fields: ['text'] }]); assert.equal(h.calls.at(-1)!.options?.alphaSocial, undefined);
    } finally { editor.unmount(); }
  }
  const f = publicFixture(), h = harness(f.data, f.documentId), editor = textEditorHarness(h.render().editor.props);
  try {
    const raw = M.raw(M.getDocument(f.data.spaces[f.actorId].text, f.documentId)).replace('날짜: 2026-10-02', '날짜: 2026-10-05');
    assert(editor.controller.updateRaw(raw, TODAY)); assert(await editor.controller.save());
    assert.deepEqual(h.requests, [{ kind: 'private', fields: ['text'] }]); assert.equal(h.calls.at(-1)!.options?.alphaSocial, undefined);
    assert.deepEqual(h.data.spaces[f.actorId].copies, f.data.spaces[f.actorId].copies);
  } finally { editor.unmount(); }
});

test('PS17 text draft retains failed schedule metadata for host-permitted resubmission and raw authoring clears it', async () => {
  const f = publicFixture(), h = harness(f.data, f.documentId), editor = textEditorHarness(h.render().editor.props), baseline = JSON.stringify(f.data);
  try {
    h.reject('limit'); editor.open(f.taskId); editor.draft('2026-10-05', '17:45'); await editor.submit();
    assert.equal(h.successful, 0); assert.equal(h.requests.length, 1); assert.equal(JSON.stringify(h.data), baseline);
    assert(editor.controller.getState().dirty); h.reject(null); assert(await editor.controller.save());
    assert.equal(h.requests.length, 2); assert.equal(h.successful, 1);
  } finally { editor.unmount(); }
  const raw = publicFixture(), rawHost = harness(raw.data, raw.documentId), rawEditor = textEditorHarness(rawHost.render().editor.props);
  try {
    rawHost.reject('limit'); rawEditor.open(raw.taskId); rawEditor.draft('2026-10-05', '17:45'); await rawEditor.submit();
    const draft = rawEditor.controller.getState().raw + '\n작성 중 새 메모';
    assert(rawEditor.controller.updateRaw(draft, TODAY)); rawHost.reject(null); assert(await rawEditor.controller.save());
    assert.equal(rawHost.calls.at(-1)!.options?.alphaSocial, undefined); assert.equal(rawHost.requests.at(-1)!.kind, 'private');
  } finally { rawEditor.unmount(); }
});

test('PS18 explicit text date form can insert fresh date and time properties without changing the Task identity', async () => {
  const f = publicFixture();
  f.data = accepted(updateProgramTask(f.data, { actorId: f.actorId, requestId: 'schedule-clear', expectedSpace: f.data.spaces[f.actorId],
    taskId: f.taskId, patch: { date: null, time: '' } })).data;
  const h = harness(f.data, f.documentId), editor = textEditorHarness(h.render().editor.props);
  try {
    editor.open(f.taskId); editor.draft('2026-10-05', '17:45'); await editor.submit();
    assert.equal(h.successful, 1); assert.equal(h.requests[0].kind, 'social');
    assert.equal(task(h.data, f.taskId).id, f.taskId); assert.equal(task(h.data, f.taskId).date, '2026-10-05'); assert.equal(task(h.data, f.taskId).time, '17:45');
    assert.deepEqual(h.data.public, f.data.public);
  } finally { editor.unmount(); }
});

test('PS19 an account response arriving during text save synchronizes its committed property identities after settlement', async () => {
  const f = publicFixture();
  f.data = accepted(updateProgramTask(f.data, { actorId: f.actorId, requestId: 'schedule-clear-for-ack', expectedSpace: f.data.spaces[f.actorId],
    taskId: f.taskId, patch: { date: null, time: '' } })).data;
  const h = harness(f.data, f.documentId), props = h.render().editor.props;
  let editor: ReturnType<typeof textEditorHarness>;
  editor = textEditorHarness({ ...props, onCommit: async (...args) => {
    const saved = await props.onCommit(...args);
    const authoritative = programClone(h.data.spaces[f.actorId].text);
    const oldIds = new Set([...f.data.spaces[f.actorId].text.documents, ...f.data.spaces[f.actorId].text.flows].flatMap(doc => doc.lines.map(line => line.id)));
    for (const doc of [...authoritative.documents, ...authoritative.flows]) for (const line of doc.lines) if (!oldIds.has(line.id)) line.id = `server-${line.id}`;
    editor.replace({ ...h.render().editor.props, workspace: authoritative }); editor.synchronize();
    assert.notDeepEqual(editor.controller.getState().committed, authoritative, 'the response cannot replace a saving draft');
    return saved;
  } });
  try {
    editor.open(f.taskId); editor.draft('2026-10-05', '17:45'); await editor.submit();
    assert.equal(h.successful, 1); assert.equal(editor.controller.getState().dirty, false);
    assert.deepEqual(editor.controller.getState().committed, editor.committed);
    assert.equal(editor.textarea.value, M.raw(M.getDocument(editor.committed, f.documentId)));
    assert.equal(M.tasks(editor.committed).find(row => row.id === f.taskId)!.id, f.taskId);
  } finally { editor.unmount(); }
});

test('PS20 exact linked rows keep the existing canonical task route for public copies, independent and native documents', async () => {
  for (const f of [publicFixture(), independentFixture(), nativeFixture()]) {
    const space = f.data.spaces[f.actorId];
    space.text = M.addDocument(space.text, { title: '연결 문서' }); const documentId = space.text.documents.at(-1)!.id;
    space.text = M.linkTask(space.text, documentId, 0, f.taskId);
    const h = harness(f.data, documentId), editor = textEditorHarness(h.render().editor.props);
    try {
      const row = M.rowMeta(space.text, documentId).find(row => row.progressTargetId === f.taskId)!; assert(row);
      editor.open(row.id); editor.draft('2026-10-05', '17:45'); await editor.submit();
      assert.equal(h.successful, 1); assert.equal(task(h.data, f.taskId).date, '2026-10-05'); assert.equal(task(h.data, f.taskId).docId, f.documentId);
      assert.equal(h.requests[0].kind, 'copyId' in f ? 'social' : 'private'); assert.deepEqual(h.data.public, f.data.public);
    } finally { editor.unmount(); }
  }
});

test('PS21 consecutive detail date/time changes adopt only the acknowledged server property IDs', async () => {
  for (const order of ['before-settlement', 'after-settlement'] as const) {
    const f = publicFixture();
    f.data = accepted(updateProgramTask(f.data, { actorId: f.actorId, requestId: `schedule-clear-${order}`, expectedSpace: f.data.spaces[f.actorId],
      taskId: f.taskId, patch: { date: null, time: '' } })).data;
    const h = harness(f.data, f.documentId, 'account', order); await h.open(f.taskId);
    h.draft('2026-10-05', '17:45'); await h.submit();
    assert.equal(h.successful, 1); const preview = h.calls[0].transition; assert(preview.ok);
    assert.notDeepEqual(h.data.spaces[f.actorId].text, preview.data.spaces[f.actorId].text, 'the host really returns different new property IDs');
    h.draft('2026-10-06', '18:10'); await h.submit(); await h.click('날짜 미정으로 이동');
    h.draft('2026-10-07', ''); await h.submit(); h.draft('2026-10-08', '19:20'); await h.submit();
    assert.equal(h.successful, 5, order); assert.equal(h.requests.length, 5);
    assert.equal(task(h.data, f.taskId).date, '2026-10-08'); assert.equal(task(h.data, f.taskId).time, '19:20');
    assert.deepEqual(h.data.public, f.data.public);
  }
});

test('PS22 unrelated authoritative edits never gain the successful schedule preview as a CAS baseline', async () => {
  const f = publicFixture(), h = harness(f.data, f.documentId, 'account', 'after-settlement'); await h.open(f.taskId);
  h.draft('2026-10-05', '17:45'); await h.submit();
  const external = programClone(h.data); external.spaces[f.actorId].text = M.updateTask(external.spaces[f.actorId].text, f.taskId, { note: '다른 탭의 메모' });
  h.replace(external); h.draft('2026-10-06', '18:10'); await h.submit();
  assert.equal(h.successful, 1); assert.equal(h.requests.length, 1); assert.deepEqual(h.data, external);
  assert.equal(task(h.data, f.taskId).note, '다른 탭의 메모');
});

test('PS23 successful first/re-added property ACKs rebase only their IDs before saving newer native raw input', async () => {
  for (const origin of ['first-both', 'first-time', 'remove-readd'] as const) for (const order of ['before-settlement', 'after-settlement'] as const) {
    const f = publicFixture();
    if (origin !== 'remove-readd') f.data = accepted(updateProgramTask(f.data, { actorId: f.actorId, requestId: `schedule-${origin}`,
      expectedSpace: f.data.spaces[f.actorId], taskId: f.taskId, patch: { date: origin === 'first-both' ? null : '2026-10-02', time: '' } })).data;
    if (origin === 'first-both') f.data.spaces[f.actorId].text = M.restoreTaskDate(f.data.spaces[f.actorId].text, f.taskId);
    assert(validateProgramData(f.data));
    if (origin === 'first-both') assert(!M.getDocument(f.data.spaces[f.actorId].text, f.documentId)!.lines.some(line => /^\s+- (날짜|시간):/.test(line.text)));
    const h = harness(f.data, f.documentId, 'account', order), baseline = programClone(f.data);
    let editor: ReturnType<typeof textEditorHarness>, newerRaw = '', acknowledged: typeof f.data.spaces[string]['text'] | undefined;
    const outcomes: boolean[] = [], optionsSeen: Parameters<ProgramTextEditorProps['onCommit']>[2][] = [];
    const onCommit: ProgramTextEditorProps['onCommit'] = async (...args) => {
      optionsSeen.push(args[2]); const saved = await h.render().editor.props.onCommit(...args); outcomes.push(saved);
      if (saved && args[2]?.privateTaskSchedule?.date === '2026-10-05') {
        acknowledged = programClone(h.data.spaces[f.actorId].text);
        const preview = h.calls.at(-1)!.transition; assert(preview.ok);
        assert.notDeepEqual(preview.data.spaces[f.actorId].text, acknowledged, 'the authoritative host regenerates newly inserted property IDs');
        const continueTyping = () => {
          newerRaw = editor.controller.getState().raw + '\n응답 중 이어 쓴 개인 메모';
          editor.input(newerRaw); editor.textarea.selectionStart = 5; editor.textarea.selectionEnd = 11; editor.textarea.scrollTop = 73;
          assert(editor.controller.getState().dirty); assert(editor.controller.getState().saving);
          h.render(); editor.replace({ ...h.render().editor.props, onCommit }); editor.synchronize();
          assert.equal(editor.controller.getState().raw, newerRaw, 'render cannot overwrite the newer raw draft');
        };
        // In the late-render case, input arrives after receipt success while the draft awaits its authoritative props.
        if (order === 'after-settlement') setImmediate(continueTyping); else continueTyping();
      } else if (saved) { editor.replace({ ...h.render().editor.props, onCommit }); editor.synchronize(); }
      return saved;
    };
    editor = textEditorHarness({ ...h.render().editor.props, onCommit });
    try {
      if (origin === 'remove-readd') {
        editor.open(f.taskId); editor.draft('', ''); await editor.submit(); assert(await editor.controller.save());
        const withoutDate = editor.controller.getState().raw.split('\n').filter(line => !/^\s+- 날짜:/.test(line)).join('\n');
        editor.input(withoutDate); assert(await editor.controller.save());
        assert(!M.getDocument(h.data.spaces[f.actorId].text, f.documentId)!.lines.some(line => /^\s+- (날짜|시간):/.test(line.text)));
      }
      const preceding = h.successful, firstRequest = h.requests.length;
      editor.open(f.taskId); editor.draft('2026-10-05', '17:45'); await editor.submit(); assert(await editor.controller.save());
      assert.equal(h.successful, preceding + 2, `${origin}/${order}`); assert(outcomes.every(Boolean));
      assert.deepEqual(h.requests.slice(firstRequest).map(request => request.kind), ['social', 'private']);
      assert(h.requests.at(-1)!.fields!.includes('text')); assert(!h.requests.at(-1)!.fields!.includes('copies'));
      assert.equal(h.calls.at(-1)!.options?.alphaSocial, undefined);
      assert.equal(optionsSeen.at(-1)!.privateTaskSchedule, undefined, 'new native raw input removes semantic schedule metadata');
      assert.equal(optionsSeen.at(-1)!.onPrivateTaskScheduleAcknowledged, undefined);
      assert.deepEqual(optionsSeen.at(-1)!.expectedWorkspace, acknowledged, 'the next raw writer uses the verified authoritative property identities');
      assert.equal(editor.controller.getState().dirty, false); assert.equal(editor.controller.getState().saving, false);
      assert.equal(editor.controller.getState().raw, newerRaw); assert.equal(editor.textarea.value, newerRaw);
      assert.equal(M.raw(M.getDocument(h.data.spaces[f.actorId].text, f.documentId)), newerRaw);
      assert.equal(editor.textarea.selectionStart, 5); assert.equal(editor.textarea.selectionEnd, 11); assert.equal(editor.textarea.scrollTop, 73);
      const priorIds = new Set([...baseline.spaces[f.actorId].text.documents, ...baseline.spaces[f.actorId].text.flows].flatMap(doc => doc.lines.map(line => line.id)));
      const currentIds = new Set([...h.data.spaces[f.actorId].text.documents, ...h.data.spaces[f.actorId].text.flows].flatMap(doc => doc.lines.map(line => line.id)));
      for (const id of priorIds) {
        const text = M.getDocument(baseline.spaces[f.actorId].text, f.documentId)!.lines.find(line => line.id === id)?.text ?? '';
        if (origin !== 'remove-readd' || !/^\s+- (날짜|시간):/.test(text)) assert(currentIds.has(id), id);
      }
      assert.equal(task(h.data, f.taskId).id, f.taskId); assert.deepEqual(h.data.public, baseline.public);
      assert.deepEqual(h.data.spaces['creator-minji'], baseline.spaces['creator-minji']);
    } finally { editor.unmount(); }
  }
});

test('PS24 existing date/time properties keep the original continuous raw-save path without an acknowledgment barrier', async () => {
  const f = publicFixture(), h = harness(f.data, f.documentId, 'account', 'after-settlement');
  let editor: ReturnType<typeof textEditorHarness>, newerRaw = '';
  const seen: Parameters<ProgramTextEditorProps['onCommit']>[2][] = [];
  const onCommit: ProgramTextEditorProps['onCommit'] = async (...args) => {
    seen.push(args[2]); const saved = await h.render().editor.props.onCommit(...args);
    if (saved && args[2]?.privateTaskSchedule) { newerRaw = editor.controller.getState().raw + '\n기존 속성에서 이어 쓴 메모'; editor.input(newerRaw); }
    editor.replace({ ...h.render().editor.props, onCommit }); editor.synchronize(); return saved;
  };
  editor = textEditorHarness({ ...h.render().editor.props, onCommit });
  try {
    editor.open(f.taskId); editor.draft('2026-10-05', '17:45'); await editor.submit(); assert(await editor.controller.save());
    assert.equal(h.successful, 2); assert.deepEqual(h.requests.map(request => request.kind), ['social', 'private']);
    assert.equal(seen[0]!.onPrivateTaskScheduleAcknowledged, undefined); assert.equal(seen[1]!.privateTaskSchedule, undefined);
    assert.equal(editor.controller.getState().dirty, false); assert.equal(editor.textarea.value, newerRaw);
    assert.equal(M.raw(M.getDocument(h.data.spaces[f.actorId].text, f.documentId)), newerRaw);
  } finally { editor.unmount(); }
});

test('PS25 foreign workspace/owner changes, unknown ACKs, unmount and an unseen response never rebase or consume newer raw', async () => {
  for (const change of ['same-document', 'other-document', 'private-metadata', 'public', 'actor', 'unknown-ack', 'unmount', 'unseen-response'] as const) {
    const f = publicFixture();
    f.data = accepted(updateProgramTask(f.data, { actorId: f.actorId, requestId: `schedule-missing-${change}`, expectedSpace: f.data.spaces[f.actorId],
      taskId: f.taskId, patch: { date: null, time: '' } })).data;
    f.data.spaces[f.actorId].text = M.addDocument(f.data.spaces[f.actorId].text, { title: '다른 문서' });
    const otherId = f.data.spaces[f.actorId].text.documents.at(-1)!.id;
    const h = harness(f.data, f.documentId, 'account', 'unrendered'), initial = programClone(f.data.spaces[f.actorId].text);
    if (change === 'unknown-ack') h.reject('checking-result');
    let editor: ReturnType<typeof textEditorHarness>, newerRaw = '', submittedIds: string[] = [];
    const onCommit: ProgramTextEditorProps['onCommit'] = async (...args) => {
      const saved = await h.render().editor.props.onCommit(...args);
      newerRaw = editor.controller.getState().raw + '\n보존해야 할 새 원문'; editor.input(newerRaw);
      submittedIds = M.getDocument(editor.controller.getState().working, f.documentId)!.lines.map(line => line.id);
      if (change === 'unmount') h.unmount();
      else if (change !== 'unseen-response' && change !== 'unknown-ack') {
        const external = programClone(h.data);
        if (change === 'same-document') external.spaces[f.actorId].text = M.updateTask(external.spaces[f.actorId].text, f.taskId, { note: '다른 탭의 메모' });
        if (change === 'other-document') external.spaces[f.actorId].text = M.editText(external.spaces[f.actorId].text, otherId, '다른 문서의 외부 입력');
        if (change === 'private-metadata') external.spaces[f.actorId].position.start = 7;
        if (change === 'public') external.public.versions[0].summary = '다른 공개 변경';
        if (change === 'actor') external.activeActorId = 'creator-minji';
        assert(validateProgramData(external)); h.replace(external);
      }
      return saved;
    };
    editor = textEditorHarness({ ...h.render().editor.props, onCommit });
    try {
      editor.open(f.taskId); editor.draft('2026-10-05', '17:45'); await editor.submit();
      if (editor.controller.getState().saving) assert.equal(await editor.controller.save(), false, change);
      assert.equal(h.calls.length, 1, change); assert.equal(h.requests.length, 1); assert.equal(h.successful, change === 'unknown-ack' ? 0 : 1);
      assert.equal(editor.controller.getState().saving, false); assert.equal(editor.controller.getState().dirty, true);
      assert.equal(editor.controller.getState().raw, newerRaw); assert.equal(editor.textarea.value, newerRaw);
      assert.deepEqual(editor.controller.getState().committed, initial, 'an unverified ACK cannot replace the prior committed workspace');
      assert.deepEqual(M.getDocument(editor.controller.getState().working, f.documentId)!.lines.map(line => line.id), submittedIds);
      assert(!M.raw(M.getDocument(h.data.spaces[f.actorId].text, f.documentId)).includes('보존해야 할 새 원문'));
    } finally { editor.unmount(); }
  }
});

test('PS26 unmount before schedule success blocks the old closure and StrictMode effect setup restores only a mounted owner', async () => {
  for (const lifetime of ['unmount-before-success', 'strict-mode-setup'] as const) {
    const f = publicFixture();
    f.data = accepted(updateProgramTask(f.data, { actorId: f.actorId, requestId: `schedule-lifetime-${lifetime}`,
      expectedSpace: f.data.spaces[f.actorId], taskId: f.taskId, patch: { date: null, time: '' } })).data;
    const h = harness(f.data, f.documentId, 'account', 'before-settlement'), props = h.render().editor.props;
    if (lifetime === 'strict-mode-setup') { h.unmount(); h.remountEffect(); }
    let editor: ReturnType<typeof textEditorHarness>, newerRaw = '';
    const onCommit: ProgramTextEditorProps['onCommit'] = async (...args) => {
      const pending = props.onCommit(...args);
      if (args[2]?.privateTaskSchedule) {
        // The mutation has started, but run's awaited success continuation has not registered an ACK yet.
        if (lifetime === 'unmount-before-success') h.unmount();
        newerRaw = editor.controller.getState().raw + '\n종료 경계에서 이어 쓴 원문'; editor.input(newerRaw);
      }
      const saved = await pending;
      if (saved && lifetime === 'strict-mode-setup') { editor.replace({ ...h.render().editor.props, onCommit }); editor.synchronize(); }
      return saved;
    };
    editor = textEditorHarness({ ...props, onCommit });
    try {
      editor.open(f.taskId); editor.draft('2026-10-05', '17:45'); await editor.submit();
      if (editor.controller.getState().saving) await editor.controller.save();
      assert.equal(editor.controller.getState().saving, false); assert.equal(editor.controller.getState().raw, newerRaw);
      assert.equal(editor.textarea.value, newerRaw);
      if (lifetime === 'unmount-before-success') {
        assert.equal(h.calls.length, 1); assert.equal(h.successful, 1); assert.equal(h.requests.length, 1);
        assert.equal(editor.controller.getState().dirty, true);
        assert.deepEqual(editor.controller.getState().committed, f.data.spaces[f.actorId].text);
        assert(!M.raw(M.getDocument(h.data.spaces[f.actorId].text, f.documentId)).includes('종료 경계'));
      } else {
        assert.equal(h.successful, 2); assert.equal(editor.controller.getState().dirty, false);
        assert.deepEqual(h.requests.map(request => request.kind), ['social', 'private']);
        assert.equal(h.calls.at(-1)!.options?.alphaSocial, undefined);
        assert.equal(M.raw(M.getDocument(h.data.spaces[f.actorId].text, f.documentId)), newerRaw);
      }
    } finally { editor.unmount(); }
  }
});
