import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import type { createProgramTextDraft as DraftFactory, ProgramTextEditor as Component, ProgramTextEditorProps } from './ProgramTextEditor';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';
import { programClone, programResult } from '../../../lib/flow/integrated-poc/contract';
import { createProgramController, programSame } from '../../../lib/flow/integrated-poc/controller';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';

const componentUrl = new URL('./ProgramTextEditor.tsx', import.meta.url);
const require = createRequire(componentUrl), root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const compiled = ts.transpileModule(readFileSync(componentUrl, 'utf8'), { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} });
const block = '- [ ] 준비\n  - 시간: 09:30\n  - 메모: 첫 줄\n  - 메모: 둘째 줄';

// Execute the real component, draft, model and transaction owner. The native
// adapter only supplies callbacks/selection; actual browser clipboard/history
// behavior belongs to the separate browser verification, not this harness.
function harness() {
  let source = M.addDocument(createEmptyTextWorkspace(), { title: '부분 선택 회귀' });
  const docId = source.documents[0].id, raw = `[2026-10-05]\n${block}\n[2026-10-08]\n- [ ] 예약`;
  source = M.editText(source, docId, raw);
  const taskId = M.tasks(source)[0].id;
  source = M.recordProgress(source, taskId, '2026-10-01', 25);
  source = M.recordProgress(source, taskId, '2026-10-02', 50);
  assert(M.validate(source));
  const data = createProgramData(), actorId = data.activeActorId; data.spaces[actorId].text = source;
  const values = new Map<string, string>(); let storageWrites = 0;
  const owner = createProgramController({ initialData: data, exclusive: async work => work(), storage: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => { storageWrites++; values.set(key, value); }, removeItem: key => { values.delete(key); },
  } });
  assert(owner.ok);
  const states: any[] = [], refs: any[] = [], effects: (() => unknown)[] = [];
  const areaEvents: Record<string, (event?: any) => void> = {};
  let si = 0, ri = 0, config: any, savePort: (() => Promise<boolean>) | null = null;
  let commitAttempts = 0, accept = true, nativeUndos = 0, globalUndos = 0, globalRedos = 0;
  let historyFlight: Promise<void> = Promise.resolve();
  const localHistory: { raw: string; start: number; end: number; direction: string; scrollTop: number }[] = [];
  const textarea = {
    value: raw, selectionStart: 0, selectionEnd: 0, selectionDirection: 'none', scrollTop: 0, readOnly: false,
    addEventListener(name: string, callback: (event?: any) => void) { areaEvents[name] = callback; }, removeEventListener() {},
    setSelectionRange(start: number, end: number, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; },
  };
  const host = { querySelector: () => textarea, addEventListener() {}, removeEventListener() {}, getClientRects: () => [{}] };
  const native = { create: (_host: unknown, options: any) => {
    config = options;
    return { refresh() {}, focus() {}, focusControl() {}, setMode() {}, setMoveState() {}, destroy() {},
      getValue: () => textarea.value,
      setValue(value: string) { textarea.value = value; return true; },
      undo() {
        nativeUndos++; const snapshot = localHistory.pop(); if (!snapshot) return false;
        textarea.value = snapshot.raw; textarea.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction); textarea.scrollTop = snapshot.scrollTop;
        areaEvents.input?.({ inputType: 'historyUndo' }); config.onChange(snapshot.raw); return true;
      },
    };
  } };
  const mockedReact = { ...React, useId: () => 'partial-paste-test', useRef: (value: unknown) => refs[ri++] ?? (refs[ri - 1] = { current: value }),
    useState: (value: any) => { const i = si++; if (!(i in states)) states[i] = typeof value === 'function' ? value() : value;
      return [states[i], (next: any) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useEffect: (effect: () => unknown) => { effects.push(effect); },
  };
  const mod = { exports: {} as { ProgramTextEditor: typeof Component; createProgramTextDraft: typeof DraftFactory } };
  vm.runInThisContext(`(function(module,exports,require,window){${compiled.outputText}\n})`)(mod, mod.exports, (id: string) => {
    if (id === 'react') return mockedReact;
    if (id.endsWith('text-editor.cjs')) return native;
    if (id.endsWith('.css')) return {};
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, { addEventListener() {}, removeEventListener() {} });
  const props: ProgramTextEditorProps = { workspace: source, docId,
    onRegisterSave: port => { savePort = port; },
    onCommit: async (next, label, options) => {
      commitAttempts++;
      const current = owner.snapshot().envelope.data.spaces[actorId].text;
      if (!accept || options?.expectedWorkspace && !programSame(options.expectedWorkspace, current)) return false;
      const result = await owner.mutate(label, before => {
        const data = programClone(before); data.spaces[actorId].text = next; return programResult(before, data, docId);
      }, { actorId, groupId: options?.groupId });
      if (result.ok) props.workspace = owner.snapshot().envelope.data.spaces[actorId].text;
      return result.ok;
    },
    onUndo: () => { globalUndos++; historyFlight = (async () => {
      assert((await owner.undo(actorId)).ok); props.workspace = owner.snapshot().envelope.data.spaces[actorId].text; synchronize();
    })(); return historyFlight; },
    onRedo: () => { globalRedos++; historyFlight = (async () => {
      assert((await owner.redo(actorId)).ok); props.workspace = owner.snapshot().envelope.data.spaces[actorId].text; synchronize();
    })(); return historyFlight; },
  };
  const render = () => { si = 0; ri = 0; effects.length = 0; return mod.exports.ProgramTextEditor(props); };
  const synchronize = () => { render(); effects[2](); };
  render(); refs[1].current = host;
  const unregister = effects[0]() as () => void, destroy = effects[1]() as () => void;
  const nodes = (tree: any): any[] => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const button = (label: string) => {
    const found = nodes(render()).find(node => node.type === 'button' && node.props['aria-label'] === label);
    assert(found, `missing ${label}`); return found;
  };
  const draft = () => refs[3].current as ReturnType<typeof DraftFactory>;
  const snapshot = () => owner.snapshot().envelope.data.spaces[actorId].text;
  function select(selected: string) {
    const start = textarea.value.indexOf(selected); assert(start >= 0);
    textarea.setSelectionRange(start, start + selected.length, 'forward'); areaEvents.select?.();
  }
  function paste(pasted: string, inputType = 'insertFromPaste') {
    const old = { raw: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection, scrollTop: textarea.scrollTop };
    const next = old.raw.slice(0, old.start) + pasted + old.raw.slice(old.end);
    if (next !== old.raw) localHistory.push(old);
    textarea.value = next; textarea.setSelectionRange(old.start + pasted.length, old.start + pasted.length);
    areaEvents.input?.({ inputType }); config.onChange(next);
  }
  return { source, raw, docId, taskId, props, textarea, draft, snapshot, render, select, paste, synchronize,
    flush: async () => { assert(savePort); const saved = await savePort(); synchronize(); return saved; },
    clickHistory: async (label: string) => { const control = button(label); assert.equal(control.props.disabled, false);
      control.props.onClick({ currentTarget: { closest: () => null } }); await historyFlight; },
    escape: () => render().props.onKeyDownCapture({ key: 'Escape', nativeEvent: { isComposing: false }, preventDefault() {}, stopPropagation() {} }),
    action: (type: string, lineIndex: number) => config.onAction({ type, lineIndex }),
    reject: () => { accept = false; }, accept: () => { accept = true; },
    external: async () => {
      const current = snapshot(), next = M.updateTask(current, M.tasks(current)[1].id, { title: '외부 예약 변경' });
      const result = await owner.mutate('외부 변경', before => { const data = programClone(before); data.spaces[actorId].text = next; return programResult(before, data, docId); }, { actorId });
      assert(result.ok); props.workspace = snapshot(); synchronize();
    },
    counts: () => ({ commitAttempts, storageWrites, nativeUndos, globalUndos, globalRedos }),
    unmount: () => { unregister(); destroy(); },
  };
}

test('MD09 actual component partial title paste saves and toolbar global Undo/Redo restore the exact workspace', async () => {
  const h = harness(); try {
    h.select('준비'); h.paste('준비 확인'); assert.equal(h.draft().getState().dirty, true);
    assert(await h.flush()); const saved = structuredClone(h.snapshot());
    assert.equal(M.tasks(saved).find(task => task.id === h.taskId)!.title, '준비 확인');
    assert.deepEqual(saved.progressRecords, h.source.progressRecords);
    await h.clickHistory('입력 되돌리기'); assert.deepEqual(h.snapshot(), h.source); assert.equal(h.textarea.value, h.raw);
    await h.clickHistory('다시 실행'); assert.deepEqual(h.snapshot(), saved); assert.equal(h.textarea.value, M.raw(M.getDocument(saved, h.docId)));
    assert.deepEqual(h.counts(), { commitAttempts: 1, storageWrites: 3, nativeUndos: 0, globalUndos: 1, globalRedos: 1 });
  } finally { h.unmount(); }
});

test('MD09 saved partial subtree paste keeps copied identities after actual toolbar Undo/Redo', async () => {
  const h = harness(); try {
    h.textarea.setSelectionRange(h.raw.length, h.raw.length); h.paste(`\n${block}`); assert(await h.flush());
    const saved = structuredClone(h.snapshot()), tasks = M.tasks(saved).filter(task => task.title === '준비');
    assert.equal(tasks.length, 2); assert.notEqual(tasks[0].id, tasks[1].id);
    await h.clickHistory('입력 되돌리기'); assert.deepEqual(h.snapshot(), h.source);
    await h.clickHistory('다시 실행'); assert.deepEqual(h.snapshot(), saved);
    assert.deepEqual(M.progressHistory(h.snapshot(), tasks[1].id), []); assert.deepEqual(h.snapshot().progressRecords, h.source.progressRecords);
    assert.equal(h.counts().nativeUndos, 0);
  } finally { h.unmount(); }
});

test('MD09 rejected partial paste preserves exact draft and selection; dirty Undo uses the native callback, not committed history', async () => {
  const h = harness(); try {
    h.select('첫 줄'); h.paste('첫 줄 입력'); h.reject();
    h.textarea.setSelectionRange(7, 19, 'backward'); h.textarea.scrollTop = 28;
    const raw = h.textarea.value, working = structuredClone(h.draft().getState().working);
    assert.equal(await h.flush(), false); h.synchronize();
    assert.equal(h.textarea.value, raw); assert.equal(h.draft().getState().raw, raw);
    assert.deepEqual(h.draft().getState().working, working); assert.deepEqual(h.snapshot(), h.source);
    assert.deepEqual([h.textarea.selectionStart, h.textarea.selectionEnd, h.textarea.selectionDirection, h.textarea.scrollTop], [7, 19, 'backward', 28]);
    assert(h.draft().getState().dirty); assert.match(h.draft().getState().error, /입력은 남아/);
    await h.clickHistory('입력 되돌리기'); assert.equal(h.draft().getState().dirty, false); assert.deepEqual(h.draft().getState().working, h.source);
    assert.deepEqual(h.counts(), { commitAttempts: 1, storageWrites: 0, nativeUndos: 1, globalUndos: 0, globalRedos: 0 });
  } finally { h.unmount(); }
});

test('MD09 stale partial save preserves the local raw/selection and the external saved workspace', async () => {
  const h = harness(); try {
    h.select('첫 줄'); h.paste('저장 전 부분 입력'); h.textarea.setSelectionRange(4, 14, 'forward'); h.textarea.scrollTop = 42;
    const raw = h.textarea.value, working = structuredClone(h.draft().getState().working);
    await h.external(); const external = structuredClone(h.snapshot());
    assert.equal(await h.flush(), false); assert.deepEqual(h.snapshot(), external); assert.deepEqual(h.draft().getState().committed, h.source);
    assert.equal(h.draft().getState().raw, raw); assert.equal(h.textarea.value, raw); assert.deepEqual(h.draft().getState().working, working);
    assert.deepEqual([h.textarea.selectionStart, h.textarea.selectionEnd, h.textarea.scrollTop], [4, 14, 42]);
    assert.deepEqual(h.counts(), { commitAttempts: 1, storageWrites: 1, nativeUndos: 0, globalUndos: 0, globalRedos: 0 });
  } finally { h.unmount(); }
});

test('MD09 a pending rejected save cannot consume newer partial paste or move its selection', async () => {
  const h = harness(); try {
    const commit = h.props.onCommit; let release!: (accepted: boolean) => void, calls = 0;
    h.props.onCommit = (_next, _label, options) => {
      calls++; assert(programSame(options?.expectedWorkspace, h.source));
      return new Promise<boolean>(resolve => { release = resolve; });
    };
    h.select('첫 줄'); h.paste('첫 제출'); const saving = h.flush(); assert(h.draft().getState().saving);
    h.select('첫 제출'); h.paste('그 뒤에 붙인 입력'); h.textarea.setSelectionRange(9, 20, 'backward'); h.textarea.scrollTop = 54;
    const raw = h.textarea.value, working = structuredClone(h.draft().getState().working);
    release(false); assert.equal(await saving, false); assert.equal(calls, 1);
    assert.equal(h.draft().getState().raw, raw); assert.equal(h.textarea.value, raw); assert.deepEqual(h.draft().getState().working, working);
    assert.deepEqual([h.textarea.selectionStart, h.textarea.selectionEnd, h.textarea.selectionDirection, h.textarea.scrollTop], [9, 20, 'backward', 54]);
    assert(h.draft().getState().dirty); assert.deepEqual(h.snapshot(), h.source); assert.equal(h.counts().storageWrites, 0);
    h.props.onCommit = commit; assert(await h.flush()); assert.deepEqual(h.snapshot(), working);
    assert.deepEqual(h.snapshot().progressRecords, h.source.progressRecords); assert.equal(h.counts().storageWrites, 1);
  } finally { h.unmount(); }
});

test('MD09 Escape cancels move selection and the row panel without consuming a partial draft or writing', () => {
  const h = harness(); try {
    h.select('첫 줄'); h.paste('첫 줄 추가'); h.textarea.setSelectionRange(3, 12, 'backward'); h.textarea.scrollTop = 36;
    const raw = h.textarea.value, working = structuredClone(h.draft().getState().working);
    h.action('move-select', 1); h.escape(); h.action('row-menu', 1); h.escape();
    assert.equal(h.textarea.value, raw); assert.equal(h.draft().getState().raw, raw); assert.deepEqual(h.draft().getState().working, working);
    assert.deepEqual([h.textarea.selectionStart, h.textarea.selectionEnd, h.textarea.scrollTop], [3, 12, 36]);
    assert.deepEqual(h.snapshot(), h.source); assert.deepEqual(h.counts(), { commitAttempts: 0, storageWrites: 0, nativeUndos: 0, globalUndos: 0, globalRedos: 0 });
  } finally { h.unmount(); }
});

test('MD09 the component ignores same-selection paste without dirty state, writes or new source identities', async () => {
  const h = harness(); try {
    h.select('첫 줄'); h.paste('첫 줄'); assert.equal(h.draft().getState().dirty, false); assert(await h.flush());
    assert.deepEqual(h.draft().getState().working, h.source); assert.deepEqual(h.snapshot(), h.source);
    assert.deepEqual(h.counts(), { commitAttempts: 0, storageWrites: 0, nativeUndos: 0, globalUndos: 0, globalRedos: 0 });
  } finally { h.unmount(); }
});

test('MD09 recorded cut rejection retains invalid raw until explicit native restoration and never writes it', async () => {
  const h = harness(); try {
    h.select(`${block}\n`); h.paste('', 'deleteByCut'); const cutRaw = h.textarea.value;
    assert.equal(h.draft().getState().invalid, true); assert.equal(h.draft().getState().raw, cutRaw);
    assert.deepEqual(h.draft().getState().working, h.source); assert.equal(await h.flush(), false);
    await h.clickHistory('입력 되돌리기'); assert.equal(h.draft().getState().raw, h.raw); assert.equal(h.draft().getState().invalid, false);
    assert.deepEqual(h.draft().getState().working, h.source); assert.equal(h.counts().commitAttempts, 0); assert.equal(h.counts().storageWrites, 0);
  } finally { h.unmount(); }
});
