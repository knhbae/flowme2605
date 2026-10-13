import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import ts from 'typescript';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';

// The shipped React component, deterministic timers and a native port double.
// This does not claim to drive an Android keyboard or a real server.
const url = new URL('./ProgramTextEditor.tsx', import.meta.url), require = createRequire(url);
const root = resolve(dirname(fileURLToPath(url)), '../../..');
const compiled = ts.transpileModule(readFileSync(url, 'utf8'), { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;

function fixture() {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '가상 조합 시험' });
  const docId = workspace.documents[0].id;
  workspace = M.editText(workspace, docId, '- [ ] 가상 업무\n보존 메모', { progressDate: '2026-10-14' });
  const initialRaw = M.raw(M.getDocument(workspace, docId)), initialIds = M.getDocument(workspace, docId)!.lines.map(line => line.id);
  const refs: any[] = [], states: any[] = [], effects: (() => any)[] = [];
  const hostEvents = new Map<string, (event?: any) => void>(), areaEvents = new Map<string, (event?: any) => void>();
  const timers = new Map<number, { at: number; fn: () => void }>(), microtasks: (() => void)[] = [];
  const commits: TextWorkspaceState[] = [], dirty: boolean[] = [];
  let ri = 0, si = 0, now = 0, tid = 0, config: any, registeredSave: (() => Promise<boolean>) | null = null;
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
    onRegisterSave: (save: typeof registeredSave, readStatus: typeof status) => { registeredSave = save; status = readStatus; },
    onCommit: async (next: TextWorkspaceState) => { commits.push(structuredClone(next)); return accept; } };
  const render = () => { si = 0; ri = 0; effects.length = 0; return mod.exports.ProgramTextEditor(props); };
  render(); refs[1].current = host;
  const unregister = effects[0](), unmountEditor = effects[1]();
  async function settle() { for (let i = 0; i < 12; i++) { while (microtasks.length) microtasks.shift()!(); await Promise.resolve(); } }
  async function advance(ms: number) { const end = now + ms; for (;;) { const next = [...timers.entries()].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at)[0]; if (!next) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); await settle(); } now = end; await settle(); }
  const nodes = (value: any): any[] => !value || typeof value !== 'object' ? [] : Array.isArray(value) ? value.flatMap(nodes) : [value, ...nodes(value.props?.children)];
  return { workspace, initialRaw, initialIds, docId, textarea, dirty, commits, props, render, nodes,
    status: () => status!(), draft: () => refs[3].current.getState(), save: () => registeredSave!(),
    event: (name: string) => hostEvents.get(name)?.({ target: textarea }),
    blur: () => areaEvents.get('blur')?.(), settle, advance,
    input: (raw: string) => { textarea.value = raw; textarea.setSelectionRange(raw.length, raw.length); config.onChange(raw, { inputType: 'insertText' }); },
    reject: () => { accept = false; }, allow: () => { accept = true; },
    unmount: () => { unregister(); unmountEditor(); }, destroyed: () => destroyed,
  };
}

test('composition end with identical raw rearms an autosave consumed during composition', async () => {
  const f = fixture(); try {
    const raw = f.initialRaw + ' 입력'; f.input(raw); f.event('compositionstart');
    await f.advance(450); assert.equal(f.commits.length, 0); assert(f.status().composing);
    f.event('compositionend'); await f.settle(); await f.advance(450);
    assert.equal(f.commits.length, 1); assert.equal(M.raw(M.getDocument(f.commits[0], f.docId)), raw);
    assert.equal(f.draft().dirty, false); assert.equal(f.dirty.at(-1), false);
    assert.equal(f.textarea.selectionStart, raw.length); assert.equal(f.textarea.value, raw);
    assert.deepEqual(M.getDocument(f.commits[0], f.docId)!.lines.map(line => line.id), f.initialIds);
  } finally { f.unmount(); }
});

test('cancelled clean composition releases parent protection without a write or buffer replacement', async () => {
  const f = fixture(); try {
    f.textarea.setSelectionRange(6, 8, 'backward'); f.event('compositionstart'); assert.equal(f.dirty.at(-1), true);
    f.event('compositionend'); await f.settle(); await f.advance(900);
    assert.equal(f.dirty.at(-1), false); assert.equal(f.commits.length, 0);
    assert.equal(f.textarea.value, f.initialRaw); assert.equal(f.textarea.selectionStart, 6); assert.equal(f.textarea.selectionEnd, 8);
  } finally { f.unmount(); }
});

test('blur does not clear active composition; the eventual end resumes the same pending write', async () => {
  const f = fixture(); try {
    f.input(f.initialRaw + ' 변경'); f.event('compositionstart'); f.blur();
    await f.advance(900); assert.equal(f.commits.length, 0); assert(f.status().composing); assert.equal(await f.save(), false);
    f.event('compositionend'); await f.settle(); await f.advance(450); assert.equal(f.commits.length, 1); assert.equal(f.draft().dirty, false);
  } finally { f.unmount(); }
});

test('native changed-raw callback after capture compositionend saves once at the settled boundary', async () => {
  const f = fixture(); try {
    f.event('compositionstart'); f.event('compositionend'); f.input(f.initialRaw + ' 한글');
    await f.settle(); await f.advance(449); assert.equal(f.commits.length, 0);
    await f.advance(1); assert.equal(f.commits.length, 1); assert.equal(f.draft().dirty, false);
  } finally { f.unmount(); }
});

test('a fresh composition before the end microtask keeps protection and blocks saving', async () => {
  const f = fixture(); try {
    f.input(f.initialRaw + ' 변경'); f.event('compositionstart'); await f.advance(450);
    f.event('compositionend'); f.event('compositionstart'); await f.settle(); await f.advance(900);
    assert(f.status().composing); assert.equal(f.dirty.at(-1), true); assert.equal(f.commits.length, 0);
    f.event('compositionend'); await f.settle(); await f.advance(450); assert.equal(f.commits.length, 1);
  } finally { f.unmount(); }
});

test('rearmed save rejection preserves latest raw and explicit retry uses the same document', async () => {
  const f = fixture(); try {
    f.reject(); const raw = f.initialRaw + ' 실패 보존'; f.input(raw); f.event('compositionstart'); await f.advance(450);
    f.event('compositionend'); await f.settle(); await f.advance(450);
    assert.equal(f.commits.length, 1); assert.equal(f.draft().dirty, true); assert(f.draft().error); assert.equal(f.textarea.value, raw);
    f.allow(); assert.equal(await f.save(), true); await f.settle(); assert.equal(f.commits.length, 2);
    assert.equal(f.draft().dirty, false); assert.equal(f.draft().error, ''); assert.equal(f.textarea.value, raw);
  } finally { f.unmount(); }
});

test('unmount before the composition-end microtask cannot schedule a stale save', async () => {
  const f = fixture(); f.input(f.initialRaw + ' 변경'); f.event('compositionstart'); await f.advance(450);
  f.event('compositionend'); f.unmount(); await f.settle(); await f.advance(900);
  assert(f.destroyed()); assert.equal(f.commits.length, 0);
});
