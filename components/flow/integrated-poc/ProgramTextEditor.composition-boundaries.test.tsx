import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programFolderAfterDocumentOpen } from '../../../lib/flow/integrated-poc/folder-document-regions';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';

// The shipped React component, deterministic timers and a native port double.
// This does not claim to drive an Android keyboard or a real server.
const url = new URL('./ProgramTextEditor.tsx', import.meta.url), require = createRequire(url);
const root = resolve(dirname(fileURLToPath(url)), '../../..');
const compiled = ts.transpileModule(readFileSync(process.env.FLOW_COMPOSITION_SOURCE ?? url, 'utf8'), { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;

function fixture(seed?: { workspace: TextWorkspaceState; docId: string }) {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '가상 조합 시험' });
  const docId = seed?.docId ?? workspace.documents[0].id;
  workspace = M.editText(workspace, docId, '- [ ] 가상 업무\n보존 메모', { progressDate: '2026-10-14' });
  if (seed) workspace = seed.workspace;
  const initialRaw = M.raw(M.getDocument(workspace, docId)), initialIds = M.getDocument(workspace, docId)!.lines.map(line => line.id);
  const refs: any[] = [], states: any[] = [], effects: (() => any)[] = [];
  const hostEvents = new Map<string, (event?: any) => void>(), areaEvents = new Map<string, (event?: any) => void>();
  const timers = new Map<number, { at: number; fn: () => void }>(), microtasks: (() => void)[] = [];
  const commits: TextWorkspaceState[] = [], dirty: boolean[] = [];
  let ri = 0, si = 0, now = 0, tid = 0, config: any, registeredSave: (() => Promise<boolean>) | null = null;
  let confirm: ((before: TextWorkspaceState, next: TextWorkspaceState) => boolean) | null = null;
  let lock: ((locked: boolean) => void) | null = null;
  let status: (() => { composing: boolean; saving: boolean; failed: boolean }) | null = null, accept = true, destroyed = false;
  const textarea = { value: initialRaw, selectionStart: initialRaw.length, selectionEnd: initialRaw.length, selectionDirection: 'none', scrollTop: 0, scrollLeft: 0, readOnly: false,
    setSelectionRange(start: number, end: number, direction = 'none') { this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; },
    addEventListener: (name: string, fn: (event?: any) => void) => areaEvents.set(name, fn), removeEventListener() {} };
  const host = { querySelector: () => textarea, addEventListener: (name: string, fn: (event?: any) => void) => hostEvents.set(name, fn), removeEventListener: (name: string) => hostEvents.delete(name) };
  const native = { create: (_host: unknown, options: any) => { config = options; return {
    refresh() {}, refreshViewport() {}, setMoveState() {}, setMode() {}, destroy() { destroyed = true; },
    getValue: () => textarea.value, setValue(value: string) { textarea.value = value; return true; },
  }; } };
  const mockedReact = { ...React, useId: () => 'composition-test',
    useRef: (value: unknown) => refs[ri++] ?? (refs[ri - 1] = { current: value }),
    useState: (value: any) => { const i = si++; if (!(i in states)) states[i] = typeof value === 'function' ? value() : value; return [states[i], (next: any) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useEffect: (effect: () => any) => effects.push(effect) };
  const mod = { exports: {} as { ProgramTextEditor: (props: any) => any } };
  vm.runInThisContext(`(function(module,exports,require,window,setTimeout,clearTimeout,queueMicrotask){${compiled}\n})`)(mod, mod.exports, (id: string) => {
    if (id === 'react') return mockedReact;
    if (id.endsWith('text-editor.cjs')) return native;
    if (id.endsWith('.css')) return {};
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, { addEventListener() {}, removeEventListener() {} }, (fn: () => void, ms: number) => { timers.set(++tid, { at: now + ms, fn }); return tid; }, (id: number) => timers.delete(id), (fn: () => void) => microtasks.push(fn));
  const props: any = { workspace, docId, onDirtyChange: (value: boolean) => dirty.push(value),
    onRegisterConfirmedSave: (callback: typeof confirm) => { confirm = callback; },
    onRegisterInputLock: (callback: typeof lock) => { lock = callback; },
    onRegisterSave: (save: typeof registeredSave, readStatus: typeof status) => { registeredSave = save; status = readStatus; },
    onCommit: async (next: TextWorkspaceState) => { commits.push(structuredClone(next)); return accept; } };
  const render = () => { si = 0; ri = 0; effects.length = 0; return mod.exports.ProgramTextEditor(props); };
  render(); refs[1].current = host;
  const unregister = effects[0](), unmountEditor = effects[1]();
  async function settle() { for (let i = 0; i < 12; i++) { while (microtasks.length) microtasks.shift()!(); await Promise.resolve(); } }
  async function advance(ms: number) { const end = now + ms; for (;;) { const next = [...timers.entries()].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); await settle(); } now = end; await settle(); }
  const nodes = (value: any): any[] => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
  return { workspace, initialRaw, initialIds, docId, textarea, dirty, commits, props, render, nodes,
    confirmedPort: () => confirm!, lock: (locked: boolean) => lock?.(locked),
    status: () => status!(), draft: () => refs[3].current.getState(), save: () => registeredSave!(),
    event: (name: string) => hostEvents.get(name)?.({ target: textarea }),
    blur: () => areaEvents.get('blur')?.(), settle, advance,
    input: (raw: string) => { textarea.value = raw; textarea.setSelectionRange(raw.length, raw.length); config.onChange(raw, { inputType: 'insertText' }); },
    reject: () => { accept = false; }, allow: () => { accept = true; },
    unmount: () => { unregister(); unmountEditor(); }, destroyed: () => destroyed,
  };
}

function pendingCommit(f: ReturnType<typeof fixture>) {
  const finishes: ((accepted: boolean) => void)[] = [];
  f.props.onCommit = (next: TextWorkspaceState) => {
    f.commits.push(structuredClone(next));
    return new Promise<boolean>(resolve => finishes.push(resolve));
  };
  return (accepted: boolean) => { assert(finishes.length); finishes.shift()!(accepted); };
}

// Execute the shipped route effect/guard with this mounted editor's real save port.
// This is a synthetic component/contract test, not an account or browser claim.
function route(f: ReturnType<typeof fixture>, workspace: TextWorkspaceState) {
  const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
  const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let helper = '', effect = '';
  function visit(n: ts.Node) {
    if (ts.isFunctionDeclaration(n) && n.name?.text === 'prepareDocumentScopeChange') helper = n.getText(ast);
    if (ts.isCallExpression(n) && n.expression.getText(ast) === 'useEffect' && n.arguments[0]?.getText(ast).includes('const id = props.selectedDocumentId')) effect = n.arguments[0].getText(ast);
    ts.forEachChild(n, visit);
  }
  visit(ast); assert(helper && effect);
  const compile = (s: string) => ts.transpileModule(s, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const data = createProgramData(), actorId = data.activeActorId;
  data.spaces[actorId].text = workspace;
  const dataRef = { current: data }, selectedRef = { current: f.docId };
  const presentation = { current: { folderId: 'unmatched', period: 'documents' } };
  const inputLockCount = { current: 0 }, documentRouteOpening = { current: Promise.resolve() };
  const context = { dataRef, actorId, selectedRef, presentation, inputLockCount, documentRouteOpening, programFolderAfterDocumentOpen,
    lockInput: () => { inputLockCount.current++; f.lock(true); return () => { inputLockCount.current--; f.lock(false); }; },
    flushAllEditors: f.save, setMessage: () => {}, setFolderId: (id: string) => { presentation.current.folderId = id; },
    setSelected: (id: string) => { selectedRef.current = id; }, setOpened: () => {}, setPeriod: () => {},
  };
  const prepare = new Function(...Object.keys(context), `${compile(helper)};return prepareDocumentScopeChange;`)(...Object.values(context));
  return {
    selected: () => selectedRef.current,
    request(id: string) {
      const ctx = { ...context, prepareDocumentScopeChange: prepare, props: { selectedDocumentId: id } };
      return new Function(...Object.keys(ctx), `${compile(`const effect=${effect};`)};return effect();`)(...Object.values(ctx)) as () => void;
    },
    settled: () => documentRouteOpening.current,
  };
}

test('changed final composition raw during pending rejection never automatically retries and explicit retry keeps latest input', async () => {
  const f = fixture(); try {
    const finish = pendingCommit(f), first = f.initialRaw + ' 제출', latest = first + ' 최종';
    f.input(first); await f.advance(450); assert.equal(f.commits.length, 1);
    f.event('compositionstart'); f.event('compositionend'); f.input(latest); await f.settle();
    finish(false); await f.settle(); const error = f.draft().error; assert(error);
    await f.advance(900);
    assert.equal(f.commits.length, 1, 'a queued changed-raw timer must not retry a failed request');
    assert.equal(f.draft().error, error); assert.equal(f.draft().raw, latest); assert.equal(f.dirty.at(-1), true);
    assert.equal(f.textarea.value, latest); assert.equal(f.textarea.selectionStart, latest.length);
    const retry = f.save(); assert.equal(f.commits.length, 2); finish(true); assert.equal(await retry, true);
    assert.equal(M.raw(M.getDocument(f.commits[1], f.docId)), latest);
    assert.deepEqual(M.getDocument(f.commits[1], f.docId)!.lines.map(line => line.id), f.initialIds);
  } finally { f.unmount(); }
});

test('changed final composition raw is drained once after successful pending save without a duplicate timed save', async () => {
  const f = fixture(); try {
    const finish = pendingCommit(f), first = f.initialRaw + ' 제출', latest = first + ' 최종';
    f.input(first); await f.advance(450);
    f.event('compositionstart'); f.event('compositionend'); f.input(latest); await f.settle();
    finish(true); await f.settle(); assert.equal(f.commits.length, 2);
    finish(true); await f.settle(); await f.advance(900);
    assert.equal(f.commits.length, 2); assert.equal(f.draft().dirty, false);
    assert.equal(f.textarea.value, latest); assert.equal(f.textarea.selectionStart, latest.length);
    assert.equal(M.raw(M.getDocument(f.commits[1], f.docId)), latest);
  } finally { f.unmount(); }
});

test('new input after a failed pending composition save still schedules the normal current-raw save', async () => {
  const f = fixture(); try {
    const finish = pendingCommit(f), first = f.initialRaw + ' 제출', latest = first + ' 최종';
    f.input(first); await f.advance(450);
    f.event('compositionstart'); f.event('compositionend'); f.input(latest); await f.settle();
    finish(false); await f.settle(); await f.advance(900);
    assert.equal(f.commits.length, 1); assert(f.draft().error);
    const edited = latest + ' 추가'; f.input(edited); await f.advance(450);
    assert.equal(f.commits.length, 2); finish(true); await f.settle();
    assert.equal(f.draft().dirty, false); assert.equal(f.draft().error, '');
    assert.equal(M.raw(M.getDocument(f.commits[1], f.docId)), edited); assert.equal(f.textarea.value, edited);
  } finally { f.unmount(); }
});

test('composition-end plus failed document flush rejects stale ACK, then explicit latest retry permits document switch', async () => {
  const seed = fixture(), workspace = M.addDocument(seed.workspace, { title: '다음 문서' });
  const otherId = workspace.documents.find(doc => doc.id !== seed.docId)!.id;
  const f = fixture({ workspace, docId: seed.docId }); seed.unmount();
  let other: ReturnType<typeof fixture> | undefined;
  try {
    const finish = pendingCommit(f), navigation = route(f, workspace), before = f.workspace;
    const first = f.initialRaw + ' 제출', latest = first + ' 최종';
    f.input(first); await f.advance(450); const submitted = f.commits[0], oldConfirm = f.confirmedPort();
    f.event('compositionstart');
    navigation.request(otherId); await f.settle(); await navigation.settled();
    assert.equal(navigation.selected(), f.docId); assert.equal(oldConfirm(before, submitted), false);
    f.event('compositionend'); f.input(latest); await f.settle();
    navigation.request(otherId); await f.settle(); finish(false); await f.settle(); await navigation.settled();
    assert.equal(navigation.selected(), f.docId); assert.equal(oldConfirm(before, submitted), false);
    await f.advance(900); assert.equal(f.commits.length, 1); assert.equal(f.draft().raw, latest);
    const retry = f.save(); finish(true); assert(await retry); await f.settle();
    navigation.request(otherId); await f.settle(); await navigation.settled();
    assert.equal(navigation.selected(), otherId);
    const accepted = f.draft().committed; f.unmount();
    other = fixture({ workspace: accepted, docId: otherId });
    const otherRaw = other.textarea.value;
    assert.equal(oldConfirm(before, submitted), false); await other.settle(); await other.advance(900);
    assert.equal(other.textarea.value, otherRaw); assert.equal(other.commits.length, 0); assert.equal(other.draft().dirty, false);
  } finally { if (!f.destroyed()) f.unmount(); other?.unmount(); }
});

test('exact late confirmation after cancelled composition authorizes only the saved source before document switch', async () => {
  const seed = fixture(), workspace = M.addDocument(seed.workspace, { title: '다음 문서' });
  const otherId = workspace.documents.find(doc => doc.id !== seed.docId)!.id;
  const f = fixture({ workspace, docId: seed.docId }); seed.unmount();
  try {
    f.reject(); const raw = f.initialRaw + ' 확정 입력'; f.input(raw); await f.advance(450);
    const navigation = route(f, workspace), confirm = f.confirmedPort(), submitted = f.commits[0];
    f.event('compositionstart'); navigation.request(otherId); await f.settle(); await navigation.settled();
    assert.equal(navigation.selected(), f.docId); assert.equal(confirm(workspace, submitted), false);
    f.event('compositionend'); await f.settle();
    assert.equal(confirm(workspace, submitted), true); assert.equal(f.textarea.value, raw);
    assert.equal(f.textarea.selectionStart, raw.length);
    navigation.request(otherId); await f.settle(); await navigation.settled(); await f.advance(900);
    assert.equal(navigation.selected(), otherId); assert.equal(f.commits.length, 1); assert.equal(f.draft().dirty, false);
    f.unmount(); assert.equal(confirm(workspace, submitted), false);
  } finally { if (!f.destroyed()) f.unmount(); }
});
