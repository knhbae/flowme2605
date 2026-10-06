import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createEmptyTextWorkspace, textWorkspaceModel as M, type TextWorkspaceState } from '../../../lib/flow/integrated-poc/text-workspace';
import { planProgramDateBlockOrder } from '../../../lib/flow/integrated-poc/date-block-order';
import { applyProgramLinePermutation, createProgramPermutationHistory } from '../../../lib/flow/integrated-poc/line-permutation';
import type { createProgramTextDraft as DraftFactory, ProgramTextEditor as Component, ProgramReferencePanel as ReferencePanel, programTextProtectionMessage as ProtectionMessage, trapProgramDialogTab as TrapDialogTab, ProgramTextDraftState } from './ProgramTextEditor';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programPreservesLockedDocumentContent, programReferenceExecutionAccess } from '../../../lib/flow/integrated-poc/reference-execution-guard';
import { readProgramFolderRegions, planProgramRegionEdit } from '../../../lib/flow/integrated-poc/folder-document-regions';
import type { ProgramFolderRegionSnapshot } from './ProgramFolderRegionEditor';
import type { stageProgramRegionInput as StageRegionInput } from './ProgramTextEditor';

const componentUrl = new URL('./ProgramTextEditor.tsx', import.meta.url);
const source = readFileSync(componentUrl, 'utf8');
const require = createRequire(componentUrl);
const root = resolve(dirname(fileURLToPath(componentUrl)), '../../..');
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} });
const loaded = { exports: {} as { createProgramTextDraft: typeof DraftFactory; ProgramTextEditor: typeof Component; ProgramReferencePanel: typeof ReferencePanel; programTextProtectionMessage: typeof ProtectionMessage; stageProgramRegionInput: typeof StageRegionInput; trapProgramDialogTab: typeof TrapDialogTab } };
vm.runInThisContext(`(function(module, exports, require) { ${compiled.outputText}\n})`, { filename: 'ProgramTextEditor.compiled.cjs' })(loaded, loaded.exports, (id: string) => {
  if (id.endsWith('.css')) return id.endsWith('.module.css') ? { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) } : {};
  return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
});
const { createProgramTextDraft, ProgramTextEditor, ProgramReferencePanel } = loaded.exports;

function regionHandoffFixture() {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '전체 인계' });
  workspace = { ...workspace, folders: [...workspace.folders, { id: 'work', title: '업무', parentId: null }] };
  const docId = workspace.documents[0].id;
  workspace = M.editText(workspace, docId, '숨은 앞  \n- 업무\n숨은 뒤  ');
  workspace = M.attachScope(workspace, docId, 1, 'work');
  const scoped = M.raw(M.getDocument(workspace, docId)).split('\n');
  scoped.splice(2, 0, '  - [ ] 작성', '    - 메모: 설명');
  workspace = M.editText(workspace, docId, scoped.join('\n'));
  const view = readProgramFolderRegions(workspace, docId, 'work')!, region = view.regions[0];
  function capture(regionRaw: string): ProgramFolderRegionSnapshot {
    const lines = view.fullRaw.split('\n');
    lines.splice(region.startIndex, region.endIndex - region.startIndex, ...regionRaw.split('\n'));
    const raw = lines.join('\n'), start = raw.indexOf(regionRaw);
    return { view, raw, regionRaw, regionKey: region.key, start, end: start, lineId: region.lineIds[0] };
  }
  return { workspace, docId, view, region, capture };
}

test('partial-to-whole local handoff stages rejected structure at the exact raw without a writer', () => {
  const f = regionHandoffFixture(), before = JSON.stringify(f.workspace); let writes = 0;
  const controller = createProgramTextDraft(f.workspace, f.docId, async () => { writes++; return true; }, () => {});
  const capture = f.capture(f.region.raw.replace('  - [ ] 작성', '    - [ ] 작성'));
  assert.equal(planProgramRegionEdit(f.workspace, f.view, f.region.key, capture.regionRaw!).ok, false);
  assert.equal(loaded.exports.stageProgramRegionInput(controller, f.docId, capture), true);
  assert.equal(controller.getState().raw, capture.raw); assert(controller.getState().dirty);
  assert.equal(writes, 0); assert.equal(JSON.stringify(f.workspace), before);
  assert.match(controller.getState().raw, /^숨은 앞  \n/); assert.match(controller.getState().raw, /\n숨은 뒤  $/);
});

test('whole handoff preserves invalid raw while normal whole save guard still refuses it', async () => {
  const f = regionHandoffFixture(); let writes = 0;
  const controller = createProgramTextDraft(f.workspace, f.docId, async () => { writes++; return true; }, () => {}, () => false);
  const capture = f.capture(f.region.raw + '\n  - 개인 입력');
  assert(loaded.exports.stageProgramRegionInput(controller, f.docId, capture));
  assert.equal(controller.getState().raw, capture.raw); assert(controller.getState().invalid);
  assert.equal(await controller.save(), false); assert.equal(writes, 0);
});

test('whole handoff cannot consume a stale or fabricated region capability', () => {
  const f = regionHandoffFixture(), capture = f.capture(f.region.raw + '\n  - 입력');
  const newer = M.editText(f.workspace, f.docId, f.view.fullRaw + '\n외부 변경');
  for (const [workspace, candidate] of [[newer, capture], [f.workspace, { ...capture, view: structuredClone(f.view) }]] as const) {
    const controller = createProgramTextDraft(workspace, f.docId, async () => { throw Error('writer must not run'); }, () => {});
    const before = controller.getState();
    assert.equal(loaded.exports.stageProgramRegionInput(controller, f.docId, candidate), false);
    assert.equal(controller.getState(), before);
  }
});

test('whole handoff refuses composition, input lock, read-only, another document and hidden text injection', () => {
  const f = regionHandoffFixture(), capture = f.capture(f.region.raw + '\n  - 입력');
  for (const guard of [{ composing: true }, { locked: true }, { readOnly: true }]) {
    const controller = createProgramTextDraft(f.workspace, f.docId, async () => { throw Error('writer must not run'); }, () => {});
    assert.equal(loaded.exports.stageProgramRegionInput(controller, f.docId, capture, guard), false);
    assert.equal(controller.getState().raw, f.view.fullRaw);
  }
  for (const candidate of [{ ...capture, raw: capture.raw.replace('숨은 앞', '감춘 변경') }, { ...capture, end: capture.raw.length + 1 }, { ...capture, regionKey: 'fabricated' }]) {
    const controller = createProgramTextDraft(f.workspace, f.docId, async () => { throw Error('writer must not run'); }, () => {});
    assert.equal(loaded.exports.stageProgramRegionInput(controller, f.docId, candidate), false);
  }
  const controller = createProgramTextDraft(f.workspace, f.docId, async () => true, () => {});
  assert.equal(loaded.exports.stageProgramRegionInput(controller, 'other-document', capture), false);
});

test('a clean whole handoff is no-op and a saving draft cannot be replaced', async () => {
  const f = regionHandoffFixture(); let release!: (accepted: boolean) => void, writes = 0;
  const controller = createProgramTextDraft(f.workspace, f.docId, () => { writes++; return new Promise(resolve => { release = resolve; }); }, () => {});
  assert(loaded.exports.stageProgramRegionInput(controller, f.docId, f.capture(f.region.raw)));
  assert.equal(controller.getState().dirty, false); assert.equal(writes, 0);
  controller.updateRaw(f.view.fullRaw + '\n새 원문', '2026-10-01');
  const saving = controller.save(), currentRaw = controller.getState().raw;
  assert.equal(loaded.exports.stageProgramRegionInput(controller, f.docId, f.capture(f.region.raw + '\n  - 새 입력')), false);
  assert.equal(controller.getState().raw, currentRaw); release(false); assert.equal(await saving, false);
});

test('refused destination installation cannot stage or consume partial input', () => {
  const f = regionHandoffFixture(), capture = f.capture(f.region.raw + '\n  개인 입력');
  const controller = createProgramTextDraft(f.workspace, f.docId, async () => { throw Error('writer must not run'); }, () => {});
  const before = controller.getState(); let installations = 0;
  assert.equal(loaded.exports.stageProgramRegionInput(controller, f.docId, capture,
    { install: raw => { assert.equal(raw, capture.raw); installations++; return false; } }), false);
  assert.equal(installations, 1); assert.equal(controller.getState(), before);
  // The same capability remains current and can be retried after the destination recovers.
  assert(loaded.exports.stageProgramRegionInput(controller, f.docId, capture, { install: () => true }));
  assert.equal(controller.getState().raw, capture.raw);
});

test('shared folder presentation stages only after checking all other mounted editor drafts', () => {
  const spaceSource = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
  const callback = spaceSource.slice(spaceSource.indexOf('onContinueWholeDocument={stage =>'), spaceSource.indexOf('onContinueWholeDocument={stage =>') + 1100);
  assert.match(callback, /otherId !== id && pending/); assert.match(callback, /hasPendingInput/);
  assert(callback.indexOf('inputLockCount.current') < callback.indexOf('if (!stage())'));
  assert(callback.indexOf('if (!stage())') < callback.indexOf("setFolderId('')"));
  assert.doesNotMatch(callback.slice(0, callback.indexOf("setFolderId('')") + 18), /flushAllEditors|onCommit|saveNow/);
});

// Run the component's native action and React callbacks without a browser or store.
function referenceMenuHarness(raw?: string, region?: { workspace: TextWorkspaceState; docId: string }) {
  const f = fixture(), space = createProgramData().spaces['local-user'];
  space.text = region?.workspace ?? (raw === undefined ? M.addDocument(f.workspace, { title: '한 줄 참조' }) : M.editText(f.workspace, f.docId, raw));
  const docId = region?.docId ?? (raw === undefined ? space.text.documents.at(-1)!.id : f.docId), taskId = M.tasks(space.text)[0]?.id;
  if (raw === undefined && !region) space.text = M.linkTask(space.text, docId, 0, taskId!);
  const states: any[] = [], refs: any[] = [], effects: (() => unknown)[] = [];
  let si = 0, ri = 0, writes = 0, focus = 0, accept = true, install = true, config: any;
  let confirmedSave: ((before: TextWorkspaceState, next: TextWorkspaceState) => boolean) | null = null;
  let inputLock: ((locked: boolean) => void) | null = null;
  const origins: unknown[] = [], events: Record<string, () => void> = {};
  const commits: TextWorkspaceState[] = [];
  const textareaEvents: Record<string, (event?: unknown) => void> = {};
  const textarea = { value: M.raw(M.getDocument(space.text, docId)), selectionStart: 0, selectionEnd: 0, scrollTop: 0,
    addEventListener(name: string, fn: (event?: unknown) => void) { textareaEvents[name] = fn; }, removeEventListener() {} };
  const host = { querySelector: () => textarea, addEventListener: (name: string, fn: () => void) => { events[name] = fn; }, removeEventListener() {} };
  const native = { create: (_host: unknown, options: unknown) => { config = options; return { refresh() {}, focus() { focus++; }, setMoveState() {}, destroy() {}, setMode() {}, getValue() { return textarea.value; }, setValue(value: string) { if (!install) return false; textarea.value = value; return true; } }; } };
  const mockedReact = { ...React, useId: () => 'reference-test', useRef: (value: unknown) => refs[ri++] ?? (refs[ri - 1] = { current: value }),
    useState: (value: any) => { const i = si++; if (!(i in states)) states[i] = typeof value === 'function' ? value() : value; return [states[i], (next: any) => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useEffect: (effect: () => unknown) => { effects.push(effect); } };
  const mod = { exports: {} as typeof loaded.exports };
  vm.runInThisContext(`(function(module,exports,require,window){${compiled.outputText}\n})`)(mod, mod.exports, (id: string) => {
    if (id === 'react') return mockedReact;
    if (id.endsWith('text-editor.cjs')) return native;
    if (id.endsWith('.css')) return {};
    return require(id.startsWith('@/') ? resolve(root, id.slice(2)) : id);
  }, { addEventListener() {}, removeEventListener() {} });
  const props: any = { workspace: space.text, docId, onRegisterInputLock: (port: typeof inputLock) => { inputLock = port; },
    onRegisterConfirmedSave: (port: typeof confirmedSave) => { confirmedSave = port; }, onCommit: async (next: TextWorkspaceState) => { writes++; commits.push(next); return accept; }, taskAccess: (id: string) => programReferenceExecutionAccess(space, id), onOpenTaskOrigin: (...args: unknown[]) => origins.push(args) };
  const render = () => { si = 0; ri = 0; effects.length = 0; return mod.exports.ProgramTextEditor(props); };
  render(); refs[1].current = host;
  // Only the editor-mount effect is needed; no timers or DOM are installed globally.
  const unregister = effects[0]() as () => void, destroy = effects[1]() as () => void;
  const unmount = () => { unregister(); destroy(); };
  const nodes = (tree: any): any[] => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const nodeText = (node: any): string => typeof node === 'string' || typeof node === 'number' ? String(node)
    : Array.isArray(node) ? node.map(nodeText).join('') : node && typeof node === 'object' ? nodeText(node.props?.children) : '';
  const button = (label: string) => nodes(render()).find(n => n.type === 'button' && (nodeText(n.props.children) === label || n.props['aria-label'] === label));
  return { props, space, docId, taskId, refs, events, render, nodes, button, origins, commits, textarea, textareaEvents, unmount,
    confirmSave: (before: TextWorkspaceState, next: TextWorkspaceState) => confirmedSave?.(before, next),
    lock: (locked: boolean) => inputLock?.(locked),
    action: (type: string, lineIndex = 0) => config.onAction({ type, lineIndex }),
    input: (raw: string, inputType = 'insertText', caret = raw.length) => {
      textarea.value = raw; textarea.selectionStart = textarea.selectionEnd = caret;
      textareaEvents.input?.({ inputType }); config.onChange(raw);
    },
    caret: (start: number, end = start) => { textarea.selectionStart = start; textarea.selectionEnd = end; textareaEvents.select?.(); },
    menu: () => { config.onAction({ type: 'row-menu', lineIndex: 0 }); },
    panel: () => nodes(render()).find(n => n.type === mod.exports.ProgramReferencePanel),
    draft: () => refs[3].current as ReturnType<typeof createProgramTextDraft>,
    writes: () => writes, focus: () => focus, reject: () => { accept = false; }, accept: () => { accept = true; },
    rejectInstall: () => { install = false; }, acceptInstall: () => { install = true; } };
}

function dialogTabFixture(specs: { name: string; tabIndex?: number; disabled?: boolean; hiddenParent?: boolean; inertParent?: boolean; rendered?: boolean; visibility?: string; tagName?: string; type?: string }[]) {
  const document = { activeElement: null as unknown, defaultView: { getComputedStyle: (node: any) => ({ visibility: node.visibility }) } };
  let prevented = 0, stopped = 0;
  const controls = specs.map(spec => ({ ...spec, tabIndex: spec.tabIndex ?? 0, tagName: spec.tagName ?? 'BUTTON', type: spec.type ?? 'button',
    visibility: spec.visibility ?? 'visible', value: `unchanged:${spec.name}`, focuses: 0,
    matches: (selector: string) => { assert.equal(selector, ':disabled'); return !!spec.disabled; },
    closest: (selector: string) => { assert.equal(selector, '[hidden], [inert]'); return spec.hiddenParent || spec.inertParent ? {} : null; },
    getClientRects: () => spec.rendered === false ? [] : [{}],
    focus() { this.focuses++; document.activeElement = this; },
    click() { throw Error('Tab must not activate an action'); },
  }));
  const dialog = { open: true, ownerDocument: document, contains: (node: unknown) => controls.includes(node as typeof controls[number]),
    querySelectorAll: (selector: string) => { assert.equal(selector, 'button, input, select, textarea, a[href], summary, [tabindex]'); return controls; } };
  const event = (patch: Record<string, unknown> = {}) => ({ key: 'Tab', shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
    nativeEvent: { isComposing: false }, preventDefault() { prevented++; }, stopPropagation() { stopped++; }, ...patch }) as Parameters<typeof TrapDialogTab>[1];
  const run = (patch?: Record<string, unknown>) => loaded.exports.trapProgramDialogTab(dialog as unknown as HTMLDialogElement, event(patch));
  return { dialog, document, controls, event, run, counts: () => ({ prevented, stopped }) };
}

test('dialog Tab wraps both endpoints without activation or input changes', () => {
  const f = dialogTabFixture([{ name: 'close' }, { name: 'date', tagName: 'INPUT', type: 'date' }, { name: 'apply' }]);
  f.document.activeElement = f.controls[2]; assert.equal(f.run(), true); assert.equal(f.document.activeElement, f.controls[0]);
  assert.equal(f.run({ shiftKey: true }), true); assert.equal(f.document.activeElement, f.controls[2]);
  assert.deepEqual(f.counts(), { prevented: 2, stopped: 2 });
  assert.deepEqual(f.controls.map(node => node.value), ['unchanged:close', 'unchanged:date', 'unchanged:apply']);
});

test('dialog Tab leaves intermediate form controls and their internal fields native', () => {
  const f = dialogTabFixture([{ name: 'close' }, { name: 'date', tagName: 'INPUT', type: 'date' },
    { name: 'time', tagName: 'INPUT', type: 'time' }, { name: 'choice', tagName: 'SELECT' },
    { name: 'raw', tagName: 'TEXTAREA' }, { name: 'more', tagName: 'SUMMARY' }, { name: 'apply' }]);
  for (const control of f.controls.slice(1, -1)) for (const shiftKey of [false, true]) {
    f.document.activeElement = control; assert.equal(f.run({ shiftKey }), false); assert.equal(f.document.activeElement, control);
  }
  assert.deepEqual(f.counts(), { prevented: 0, stopped: 0 }); assert(f.controls.every(node => node.focuses === 0));
});

test('dialog Tab excludes disabled, hidden, inert and non-rendered endpoint candidates', () => {
  const excluded = [{ name: 'disabled fieldset child', disabled: true }, { name: 'negative', tabIndex: -1 },
    { name: 'hidden ancestor', hiddenParent: true }, { name: 'inert ancestor', inertParent: true },
    { name: 'closed details child', rendered: false }, { name: 'visibility hidden', visibility: 'hidden' },
    { name: 'visibility collapsed', visibility: 'collapse' }, { name: 'hidden input', tagName: 'INPUT', type: 'hidden' }];
  const f = dialogTabFixture([...excluded, { name: 'close' }, { name: 'apply' }, ...excluded]);
  const first = f.controls[excluded.length], last = f.controls[excluded.length + 1];
  f.document.activeElement = last; assert.equal(f.run(), true); assert.equal(f.document.activeElement, first);
  assert.equal(f.run({ shiftKey: true }), true); assert.equal(f.document.activeElement, last);
  assert(f.controls.filter(node => node !== first && node !== last).every(node => node.focuses === 0));
});

test('dialog Tab does not intercept closed dialogs, outside focus, composition or modified keys', () => {
  const f = dialogTabFixture([{ name: 'close' }, { name: 'apply' }]);
  f.document.activeElement = f.controls[1]; f.dialog.open = false; assert.equal(f.run(), false); f.dialog.open = true;
  f.document.activeElement = {}; assert.equal(f.run(), false); f.document.activeElement = f.controls[1];
  for (const patch of [{ key: 'Enter' }, { key: 'Escape' }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { nativeEvent: { isComposing: true } }]) assert.equal(f.run(patch), false);
  assert.deepEqual(f.counts(), { prevented: 0, stopped: 0 }); assert(f.controls.every(node => node.focuses === 0));
  const empty = dialogTabFixture([]); assert.equal(empty.run(), false); assert.deepEqual(empty.counts(), { prevented: 0, stopped: 0 });
});

test('dialog Tab retains the only eligible control in either direction', () => {
  const f = dialogTabFixture([{ name: 'close' }]); f.document.activeElement = f.controls[0];
  assert.equal(f.run(), true); assert.equal(f.run({ shiftKey: true }), true);
  assert.equal(f.document.activeElement, f.controls[0]); assert.deepEqual(f.counts(), { prevented: 2, stopped: 2 });
});

test('dialog Tab callback preserves the draft and existing Escape return with zero writes', () => {
  const h = referenceMenuHarness('- [ ] 합성 할 일\n일반 메모'), before = JSON.stringify(h.draft().getState().working), raw = h.draft().getState().raw;
  h.menu(); const dialog = h.nodes(h.render()).find(node => node.type === 'dialog');
  const f = dialogTabFixture([{ name: 'close' }, { name: 'apply' }]); f.document.activeElement = f.controls[1];
  dialog.props.onKeyDown({ ...f.event(), currentTarget: f.dialog }); assert.equal(f.document.activeElement, f.controls[0]);
  dialog.props.onKeyDown({ ...f.event({ shiftKey: true }), currentTarget: f.dialog }); assert.equal(f.document.activeElement, f.controls[1]);
  assert.equal(h.draft().getState().raw, raw); assert.equal(JSON.stringify(h.draft().getState().working), before); assert.equal(h.writes(), 0);
  const focusBefore = h.focus(); h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert(!h.nodes(h.render()).some(node => node.type === 'dialog')); assert.equal(h.focus(), focusBefore + 1);
  assert.equal(h.draft().getState().raw, raw); assert.equal(JSON.stringify(h.draft().getState().working), before); assert.equal(h.writes(), 0); h.unmount();
});

const subcheckRegistrationNote = '이 하위 항목은 별도 할 일로 등록돼 있습니다. 들여쓰기를 바꿔도 등록과 진행 기록은 유지됩니다.';
function subcheckMenuFixture(registered: boolean) {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '합성 하위 항목 상태' });
  const docId = workspace.documents[0].id;
  const raw = '[2026-10-16]\n- [ ] 부모 항목\n  - [ ] 하위 항목\n- [ ] 독립 항목\n끝 메모';
  workspace = M.editText(workspace, docId, raw);
  const initial = workspace;
  if (registered) {
    workspace = M.editText(workspace, docId, raw.replace('  - [ ] 하위 항목', '루트 메모\n\n  - [ ] 하위 항목'));
    workspace = M.editText(workspace, docId, raw);
    const child = M.tasks(workspace).find(task => task.title === '하위 항목')!;
    workspace = M.recordProgress(workspace, child.id, '2026-10-02', 40);
  }
  return { workspace, docId, initial };
}
function registrationNotes(h: ReturnType<typeof referenceMenuHarness>) {
  return h.nodes(h.render()).filter(node => node.type === 'small' && node.props.children === subcheckRegistrationNote);
}

test('CJ-N menu identifies the selected registered subcheck and places progress before additions without a write', () => {
  const f = subcheckMenuFixture(true), h = referenceMenuHarness(undefined, f), before = JSON.stringify(f.workspace);
  h.action('row-menu', 2);
  const nodes = h.nodes(h.render()), target = nodes.find(node => node.type === 'p' && node.props.children === '하위 항목');
  assert.equal(target.props.children, '하위 항목');
  const sections = nodes.filter(node => node.type === 'section' && ['선택 항목 진행·날짜', '추가·연결', '선택 항목 문서 구조'].includes(node.props['aria-label']));
  assert.deepEqual(sections.map(node => node.props['aria-label']), ['선택 항목 진행·날짜', '추가·연결', '선택 항목 문서 구조']);
  assert(h.nodes(sections[0]).some(node => node.type === 'button' && node.props.children === '진행 기록'));
  assert(h.nodes(sections[0]).some(node => node.type === 'button' && node.props.children === '날짜 바꾸기'));
  assert.equal(registrationNotes(h).length, 1);
  assert.equal(h.writes(), 0); assert.equal(JSON.stringify(h.draft().getState().working), before); h.unmount();
});

test('CJ-N free memo menu does not suggest progress or register the memo through grouping', () => {
  const h = referenceMenuHarness('- [ ] 준비\n자유 메모'), before = JSON.stringify(h.draft().getState().working);
  h.action('row-menu', 1);
  const nodes = h.nodes(h.render());
  assert(nodes.some(node => node.type === 'p' && node.props.children === '자유 메모'));
  assert(!nodes.some(node => node.props['aria-label'] === '선택 항목 진행·날짜'));
  h.button('닫기').props.onClick();
  assert.equal(h.writes(), 0); assert.equal(JSON.stringify(h.draft().getState().working), before); h.unmount();
});

test('registered structural subcheck reveals its retained state only in its row menu without writing', () => {
  const f = subcheckMenuFixture(true), h = referenceMenuHarness(undefined, f);
  const row = M.rowMeta(f.workspace, f.docId)[2];
  assert.equal(row.kind, 'subcheck'); assert.equal(row.isCanonical, true); assert.equal(row.isReference, false);
  const before = JSON.stringify(h.draft().getState().working), raw = h.draft().getState().raw;
  assert.equal(registrationNotes(h).length, 0);
  h.action('row-menu', 2);
  assert.equal(registrationNotes(h).length, 1);
  assert(!subcheckRegistrationNote.includes('기간 목록'));
  assert.equal(h.draft().getState().raw, raw); assert.equal(JSON.stringify(h.draft().getState().working), before);
  assert.equal(h.writes(), 0); h.unmount();
});

test('fresh subcheck, top-level task, memo, empty input and reference never receive the registration note', () => {
  const f = subcheckMenuFixture(false);
  assert.equal(M.rowMeta(f.workspace, f.docId)[2].isCanonical, false);
  for (const index of [1, 2, 4]) {
    const h = referenceMenuHarness(undefined, f), before = JSON.stringify(h.draft().getState().working);
    h.action('row-menu', index); assert.equal(registrationNotes(h).length, 0);
    assert.equal(JSON.stringify(h.draft().getState().working), before); assert.equal(h.writes(), 0); h.unmount();
  }
  for (const raw of ['', undefined]) {
    const h = referenceMenuHarness(raw), before = JSON.stringify(h.draft().getState().working);
    if (raw === undefined) assert.equal(M.rowMeta(h.space.text, h.docId)[0].isReference, true);
    h.menu(); assert.equal(registrationNotes(h).length, 0);
    assert.equal(JSON.stringify(h.draft().getState().working), before); assert.equal(h.writes(), 0); h.unmount();
  }
});

test('closing the registration note by button, Escape or dialog cancel preserves IDs, raw and progress', () => {
  for (const close of ['button', 'escape', 'cancel']) {
    const f = subcheckMenuFixture(true), h = referenceMenuHarness(undefined, f);
    const before = JSON.stringify(h.draft().getState().working), raw = h.draft().getState().raw;
    h.action('row-menu', 2); assert.equal(registrationNotes(h).length, 1);
    if (close === 'button') h.button('닫기').props.onClick();
    else if (close === 'escape') h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    else h.nodes(h.render()).find(node => node.type === 'dialog').props.onCancel({ preventDefault() {} });
    assert.equal(registrationNotes(h).length, 0); assert.equal(h.draft().getState().raw, raw);
    assert.equal(JSON.stringify(h.draft().getState().working), before); assert.equal(h.writes(), 0); h.unmount();
  }
});

test('registration note reads the current workspace and does not bypass read-only action guards', () => {
  const f = subcheckMenuFixture(true), h = referenceMenuHarness(undefined, f);
  h.action('row-menu', 2); assert.equal(registrationNotes(h).length, 1);
  h.props.workspace = f.initial; assert(h.draft().discard(f.initial));
  assert.equal(registrationNotes(h).length, 0); assert.equal(h.writes(), 0); h.unmount();
  const locked = referenceMenuHarness(undefined, f); locked.props.readOnly = true;
  locked.action('row-menu', 2); assert.equal(registrationNotes(locked).length, 0);
  assert(!locked.nodes(locked.render()).some(node => node.type === 'dialog')); assert.equal(locked.writes(), 0); locked.unmount();
});

test('native typing and paste already offer an exact existing folder at the current row', () => {
  for (const inputType of ['insertText', 'insertFromPaste']) {
    const h = referenceMenuHarness('');
    h.input('- 미분류', inputType);
    assert(h.button('미분류 연결'), inputType);
    assert.equal(h.writes(), 0);
    assert.equal(h.draft().getState().working.bindings.length, 0);
    h.unmount();
  }
});

test('typed and pasted unknown names only open a prefilled folder panel until explicit confirmation', async () => {
  for (const inputType of ['insertText', 'insertFromPaste']) {
    const h = referenceMenuHarness('');
    h.input('- 새 프로젝트', inputType);
    const lineId = h.draft().getState().working.documents[0].lines[0].id;
    const before = JSON.stringify(h.draft().getState().working);
    h.button('새 폴더로 연결…').props.onClick();
    assert.equal(h.writes(), 0); assert.equal(JSON.stringify(h.draft().getState().working), before);
    const field = h.nodes(h.render()).find(node => node.type === 'input' && node.props.maxLength === 100)!;
    assert.equal(field.props.value, '새 프로젝트');
    assert.equal(h.button('새 폴더로 연결…'), undefined);
    submitEditorPanel(h); await settleEditor();
    const saved = h.draft().getState().committed;
    assert.equal(h.writes(), 1); assert.equal(saved.documents[0].lines.length, 1);
    assert.equal(saved.documents[0].lines[0].id, lineId);
    assert.equal(saved.bindings[0].lineId, lineId);
    const binding = saved.bindings[0]; assert.equal(binding.kind, 'scope');
    assert.equal(saved.folders.find(folder => folder.id === (binding.kind === 'scope' ? binding.scopeId : null))?.title, '새 프로젝트');
    h.unmount();
  }
});

test('suggestion dismissal and Escape preserve the same line with zero commands', () => {
  for (const raw of ['- 미분류', '- 새 프로젝트']) for (const dismiss of ['button', 'escape', 'panel-close', 'panel-escape']) {
    if (raw === '- 미분류' && dismiss.startsWith('panel')) continue;
    const h = referenceMenuHarness(raw), before = JSON.stringify(h.draft().getState().working);
    h.caret(raw.length);
    if (dismiss === 'button') h.button('제안 닫기').props.onClick();
    else if (dismiss === 'escape') h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    else {
      h.button('새 폴더로 연결…').props.onClick();
      if (dismiss === 'panel-close') h.button('닫기').props.onClick();
      else h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    }
    assert.equal(h.writes(), 0); assert.equal(JSON.stringify(h.draft().getState().working), before);
    assert.equal(h.draft().getState().dirty, false);
    if (!dismiss.startsWith('panel')) assert.equal(h.button('제안 닫기'), undefined);
    h.unmount();
  }
});

test('proposal follows only the current collapsed caret and resets after a name change', () => {
  const h = referenceMenuHarness('- 새 프로젝트\n그냥 메모');
  h.caret(4); assert(h.button('새 폴더로 연결…'));
  h.button('제안 닫기').props.onClick(); assert.equal(h.button('새 폴더로 연결…'), undefined);
  h.input('- 다른 프로젝트\n그냥 메모', 'insertText', 6); assert(h.button('새 폴더로 연결…'));
  h.caret(h.textarea.value.length); assert.equal(h.button('새 폴더로 연결…'), undefined);
  h.caret(2, 4); assert.equal(h.button('새 폴더로 연결…'), undefined);
  h.caret(6); assert(h.button('새 폴더로 연결…'));
  assert.equal(h.writes(), 0); assert.equal(h.draft().getState().working.folders.length, 1);
  h.unmount();
});

test('composition start and read-only rerenders hide the proposal and stale handlers cannot write', async () => {
  for (const mode of ['composition', 'readonly', 'locked', 'folder']) {
    const h = referenceMenuHarness('- 새 프로젝트'); h.caret(h.textarea.value.length);
    const create = h.button('새 폴더로 연결…'); assert(create);
    if (mode === 'composition') h.events.compositionstart();
    if (mode === 'readonly') h.props.readOnly = true;
    if (mode === 'locked') h.lock(true);
    if (mode === 'folder') h.props.folderId = 'folder-unfiled';
    assert.equal(h.button('새 폴더로 연결…'), undefined, mode);
    create.props.onClick(); await settleEditor();
    assert.equal(h.writes(), 0); assert(!h.nodes(h.render()).some(node => node.type === 'dialog'));
    if (mode === 'composition') { h.events.compositionend(); assert(h.button('새 폴더로 연결…')); }
    h.unmount();
  }
});

test('stale title, caret and authority cannot apply a previously offered existing folder', async () => {
  for (const mode of ['title', 'caret', 'authority']) {
    const h = referenceMenuHarness('- 미분류\n메모'); h.caret(3);
    const choice = h.button('미분류 연결'); assert(choice);
    if (mode === 'title') h.input('- 다른 폴더\n메모', 'insertText', 3);
    if (mode === 'caret') h.caret(h.textarea.value.length);
    if (mode === 'authority') h.props.workspace = M.addDocument(h.props.workspace, { title: '외부 문서' });
    choice.props.onClick(); await settleEditor();
    assert.equal(h.writes(), 0, mode); assert.equal(h.draft().getState().working.bindings.length, 0);
    h.unmount();
  }
});

test('unknown-name panel refuses a changed row or authority and preserves the source', async () => {
  for (const mode of ['title', 'authority', 'native', 'folder']) {
    const h = referenceMenuHarness('- 새 프로젝트'); h.caret(4); h.button('새 폴더로 연결…').props.onClick();
    if (mode === 'title') { h.draft().updateRaw('- 바뀐 제목', '2026-10-01'); h.textarea.value = h.draft().getState().raw; }
    if (mode === 'authority') h.props.workspace = M.addDocument(h.props.workspace, { title: '외부 문서' });
    if (mode === 'native') h.textarea.value = '- 아직 반영되지 않은 입력';
    if (mode === 'folder') h.props.folderId = 'folder-unfiled';
    const before = JSON.stringify(h.draft().getState().working);
    submitEditorPanel(h); await settleEditor();
    assert.equal(h.writes(), 0); assert.equal(JSON.stringify(h.draft().getState().working), before);
    assert(h.nodes(h.render()).some(node => node.type === 'dialog'));
    h.unmount();
  }
});

test('explicit existing choice preserves its ID and same-line identity after a typed draft save', async () => {
  const h = referenceMenuHarness(''); h.input('- 미분류');
  const lineId = h.draft().getState().working.documents[0].lines[0].id;
  h.button('미분류 연결').props.onClick(); await settleEditor();
  const saved = h.draft().getState().committed;
  assert.equal(h.writes(), 2); assert.equal(saved.documents[0].lines[0].id, lineId);
  const binding = saved.bindings[0]; assert.equal(binding.kind, 'scope');
  assert.equal(binding.kind === 'scope' ? binding.scopeId : null, 'folder-unfiled'); assert.equal(saved.folders.length, 1);
  assert.equal(h.button('미분류 연결'), undefined); h.unmount();
});

test('homonym proposals and the folder panel use full paths while choosing the exact existing ID', async () => {
  const f = regionHandoffFixture();
  f.workspace = { ...f.workspace, folders: [...f.workspace.folders,
    { id: 'company', title: '회사', parentId: null }, { id: 'personal', title: '개인', parentId: null },
    { id: 'company-work', title: '업무', parentId: 'company' }, { id: 'personal-work', title: '업무', parentId: 'personal' }] };
  f.workspace = M.editText(f.workspace, f.docId, '- 업무');
  // Replace the old region scope fixture with an eligible, unbound source row.
  f.workspace = { ...f.workspace, bindings: [] };
  const h = referenceMenuHarness(undefined, f), lineId = h.draft().getState().working.documents[0].lines[0].id;
  h.caret(4);
  assert(h.button('회사 / 업무 연결')); assert(h.button('개인 / 업무 연결'));
  h.button('개인 / 업무 연결').props.onClick(); await settleEditor();
  const saved = h.draft().getState().committed, binding = saved.bindings[0];
  assert.equal(h.writes(), 1); assert.equal(binding.kind, 'scope');
  assert.equal(binding.kind === 'scope' ? binding.scopeId : null, 'personal-work');
  assert.equal(saved.documents[0].lines[0].id, lineId);
  h.action('scope-picker'); assert(h.button('회사 / 업무')); assert(h.button('개인 / 업무'));
  assert.equal(h.writes(), 1); h.unmount();
});

test('ordinary memo, task, property and child-bearing current rows never show folder proposals', () => {
  for (const [raw, caret] of [['그냥 메모', 4], ['- [ ] 새 프로젝트', 6], ['- 새 프로젝트\n  - 자식', 5],
    ['- [ ] 할 일\n  - 메모: 새 프로젝트', 23], ['- [ ] 할 일\n  - 시간: 09:30', 22]] as const) {
    const h = referenceMenuHarness(raw); h.caret(Math.min(caret, raw.length));
    assert.equal(h.button('새 폴더로 연결…'), undefined, raw); assert.equal(h.button('제안 닫기'), undefined, raw);
    assert.equal(h.writes(), 0); h.unmount();
  }
});

test('a nested note cannot offer folder creation but can explicitly connect an existing folder', async () => {
  const h = referenceMenuHarness('- 부모 메모\n  - 새 프로젝트'); h.caret(h.textarea.value.length);
  assert.equal(h.button('새 폴더로 연결…'), undefined); assert.equal(h.writes(), 0);
  h.input('- 부모 메모\n  - 미분류'); assert(h.button('미분류 연결'));
  const lineId = h.draft().getState().working.documents[0].lines[1].id;
  h.button('미분류 연결').props.onClick(); await settleEditor();
  assert.equal(h.writes(), 2); assert.equal(h.draft().getState().committed.bindings[0].lineId, lineId);
  h.unmount();
});

test('folder confirmation shows top-level or the actual parent path before any write', () => {
  const rootFolder = referenceMenuHarness('- 새 프로젝트'); rootFolder.caret(rootFolder.textarea.value.length);
  rootFolder.button('새 폴더로 연결…').props.onClick();
  assert.match(renderToStaticMarkup(rootFolder.render()), /생성 위치: 최상위/);
  assert.equal(rootFolder.writes(), 0); rootFolder.unmount();
  const f = regionHandoffFixture();
  f.workspace = { ...f.workspace, folders: [...f.workspace.folders, { id: 'company', title: '회사', parentId: null }] };
  f.workspace = { ...f.workspace, folders: f.workspace.folders.map(folder => folder.id === 'work' ? { ...folder, parentId: 'company' } : folder) };
  f.workspace = M.editText(f.workspace, f.docId, '숨은 앞  \n- 업무\n  - 새 프로젝트\n숨은 뒤  ');
  const child = referenceMenuHarness(undefined, f); child.caret(child.textarea.value.indexOf('새 프로젝트') + '새 프로젝트'.length);
  child.button('새 폴더로 연결…').props.onClick();
  assert.match(renderToStaticMarkup(child.render()), /생성 위치: 회사 \/ 업무/);
  assert.equal(child.writes(), 0);
  const field = child.nodes(child.render()).find(node => node.type === 'input' && node.props.maxLength === 100)!;
  field.props.onChange({ target: { value: '편집한 이름' } });
  assert.match(renderToStaticMarkup(child.render()), /생성 위치: 회사 \/ 업무/);
  assert.equal(child.writes(), 0); child.unmount();
});

function folderProposalReferenceFixture(owner: 'document' | 'flow', title: string, uppercase: boolean) {
  const f = regionHandoffFixture();
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '기존 항목' });
  const sourceDocId = workspace.documents[0].id;
  workspace = M.addTask(workspace, { docId: sourceDocId, title: '원문 항목' });
  const taskId = M.tasks(workspace)[0].id;
  workspace = M.recordProgress(workspace, taskId, '2026-10-01', 100);
  workspace = M.addDocument(workspace, { title: '별도 참조' });
  const referenceDocId = workspace.documents.at(-1)!.id;
  workspace = M.linkTask(workspace, referenceDocId, 0, taskId);
  workspace = M.addDocument(workspace, { title: '제안 문서' });
  const docId = workspace.documents.at(-1)!.id;
  workspace = M.editText(workspace, docId, `앞 메모  \n- ${title}\n뒤 메모  `);
  const reference = workspace.documents.find(doc => doc.id === referenceDocId)!;
  const referenceLines = reference.lines.map(line => uppercase ? { ...line, text: line.text.replace('[x]', '[X]') } : line);
  workspace = owner === 'flow'
    ? { ...workspace, documents: workspace.documents.filter(doc => doc.id !== referenceDocId),
      flows: [{ ...reference, lines: referenceLines, private: true, sourceVersion: 'v1' }] }
    : { ...workspace, documents: workspace.documents.map(doc => doc.id === referenceDocId ? { ...doc, lines: referenceLines } : doc) };
  assert(M.validate(workspace));
  return { ...f, workspace, docId };
}

test('typed and pasted noncanonical folder lines keep their exact input without a proposal', () => {
  for (const inputType of ['insertText', 'insertFromPaste']) for (const raw of ['-  미분류', '- 미분류 ', '-  새 폴더', '- 새 폴더 ']) {
    const h = referenceMenuHarness(''); h.input(raw, inputType);
    assert.equal(h.button('제안 닫기'), undefined); assert.equal(h.button('새 폴더로 연결…'), undefined);
    assert.equal(h.button('미분류 연결'), undefined); assert.equal(h.draft().getState().raw, raw);
    assert.equal(h.textarea.value, raw); assert.equal(h.writes(), 0); h.unmount();
  }
});

test('folder proposals reject normalization of another document or Flow before apply or commit', async () => {
  for (const owner of ['document', 'flow'] as const) for (const title of ['미분류', '새 폴더']) {
    const f = folderProposalReferenceFixture(owner, title, true), h = referenceMenuHarness(undefined, f);
    h.caret(h.textarea.value.indexOf(title) + title.length);
    const before = h.draft().getState(), raw = h.textarea.value;
    if (title === '미분류') h.button('미분류 연결').props.onClick();
    else { h.button('새 폴더로 연결…').props.onClick(); submitEditorPanel(h); }
    await settleEditor();
    assert.equal(h.writes(), 0); assert.deepEqual(h.commits, []); assert.equal(h.draft().getState(), before);
    assert.equal(h.textarea.value, raw); assert.equal(JSON.stringify(h.draft().getState().working), JSON.stringify(f.workspace));
    assert.match(renderToStaticMarkup(h.render()), /원문을 바꾸는 연결은 적용하지 않았습니다.*현재 입력을 유지했습니다/);
    if (title === '새 폴더') assert(h.nodes(h.render()).some(node => node.type === 'dialog'));
    h.unmount();
  }
});

test('folder proposals with stable document and Flow raw still commit one same-line connection', async () => {
  for (const owner of ['document', 'flow'] as const) for (const title of ['미분류', '새 폴더']) {
    const f = folderProposalReferenceFixture(owner, title, false), h = referenceMenuHarness(undefined, f);
    h.caret(h.textarea.value.indexOf(title) + title.length);
    const lineId = M.getDocument(f.workspace, f.docId)!.lines[1].id;
    if (title === '미분류') h.button('미분류 연결').props.onClick();
    else { h.button('새 폴더로 연결…').props.onClick(); submitEditorPanel(h); }
    await settleEditor();
    const saved = h.draft().getState().committed;
    assert.equal(h.writes(), 1); assert.deepEqual(saved.documents, f.workspace.documents); assert.deepEqual(saved.flows, f.workspace.flows);
    assert.deepEqual(saved.taskScopes, f.workspace.taskScopes); assert.deepEqual(saved.itemScopes, f.workspace.itemScopes);
    assert.deepEqual(saved.progressRecords, f.workspace.progressRecords); assert(saved.bindings.some(binding => binding.lineId === lineId));
    assert.equal(h.draft().getState().dirty, false); h.unmount();
  }
});

test('editing a proposed creation name cannot rewrite the source, while the direct folder menu keeps its serializer', async () => {
  const proposed = referenceMenuHarness('- 새 폴더'); proposed.caret(proposed.textarea.value.length);
  proposed.button('새 폴더로 연결…').props.onClick();
  proposed.nodes(proposed.render()).find(node => node.type === 'input' && node.props.maxLength === 100)!.props.onChange({ target: { value: '다른 이름' } });
  const original = proposed.draft().getState(); submitEditorPanel(proposed); await settleEditor();
  assert.equal(proposed.writes(), 0); assert.equal(proposed.draft().getState(), original);
  assert.equal(proposed.textarea.value, '- 새 폴더'); assert.match(renderToStaticMarkup(proposed.render()), /현재 입력을 유지했습니다/);
  proposed.unmount();
  for (const target of ['existing', 'create']) {
    const f = folderProposalReferenceFixture('flow', '새 폴더', true), h = referenceMenuHarness(undefined, f);
    h.action('scope-picker', 1);
    if (target === 'existing') h.button('미분류').props.onClick();
    else {
      h.nodes(h.render()).find(node => node.type === 'input' && node.props.maxLength === 100)!.props.onChange({ target: { value: '다른 이름' } });
      submitEditorPanel(h);
    }
    await settleEditor();
    const saved = h.draft().getState().committed;
    assert.equal(h.writes(), 1); assert.equal(M.getDocument(saved, f.docId)!.lines[1].text, target === 'existing' ? '- 미분류' : '- 다른 이름');
    assert.match(M.raw(saved.flows[0]), /\[x\]/); assert(M.validate(saved)); h.unmount();
  }
});

test('actual component only discards a fragment and changes presentation after native destination confirmation', () => {
  const f = regionHandoffFixture(), capture = f.capture(f.region.raw + '\n  개인 입력'), h = referenceMenuHarness(undefined, f);
  let switched = false, discarded = 0;
  h.props.folderId = 'work'; h.props.onContinueWholeDocument = (stage: () => boolean) => { switched = stage(); return switched; };
  const partial = h.nodes(h.render()).find(node => node.props?.view?.folderId === 'work' && node.props.onRegister);
  assert(partial, 'region component must expose the actual continuation callback');
  partial.props.onRegister({ takeSnapshot: () => capture, discard: () => { discarded++; } });
  const before = h.draft().getState(); h.rejectInstall(); partial.props.onContinueWholeDocument();
  assert.equal(switched, false); assert.equal(discarded, 0); assert.equal(h.draft().getState(), before);
  assert.equal(h.textarea.value, f.view.fullRaw); assert.equal(h.writes(), 0);
  h.acceptInstall(); partial.props.onContinueWholeDocument();
  assert.equal(switched, true); assert.equal(discarded, 1); assert.equal(h.textarea.value, capture.raw);
  assert.equal(h.draft().getState().raw, capture.raw); assert.equal(h.writes(), 0);
});

test('ordinary folder-clear cannot overwrite an Item source-focus request; explicit handoff restores its caret once', () => {
  const ast = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect: ts.ArrowFunction | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('const previous = previousFolderRef.current')) effect = node.arguments[0] as ts.ArrowFunction;
    ts.forEachChild(node, visit);
  }; visit(ast); assert(effect);
  const code = ts.transpileModule(`const callback = ${effect.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const previousFolderRef = { current: 'work' }, wholeContinuationRef: { current: { start: number; end: number; raw: string } | null } = { current: null };
  const area = { value: '전체 원문', start: 6, end: 6, setSelectionRange(start: number, end: number) { this.start = start; this.end = end; } };
  let focus = 0, remembered = 0;
  const context = { previousFolderRef, wholeContinuationRef, props: { folderId: '' }, textArea: () => area,
    hostRef: { current: { getClientRects: () => [1] } }, composingRef: { current: false }, editorRef: { current: { focus() { focus++; } } },
    rememberPosition() { remembered++; } };
  const callback = new Function(...Object.keys(context), `${code};return callback;`)(...Object.values(context));
  callback(); assert.equal(area.start, 6); assert.equal(remembered, 0); assert.equal(focus, 0);
  previousFolderRef.current = 'work'; wholeContinuationRef.current = { start: 3, end: 3, raw: area.value };
  callback(); assert.equal(area.start, 3); assert.equal(remembered, 1); assert.equal(focus, 1); assert.equal(wholeContinuationRef.current, null);
  previousFolderRef.current = 'work'; callback(); assert.equal(remembered, 1);
  previousFolderRef.current = 'work'; wholeContinuationRef.current = { start: 1, end: 1, raw: '이전 판본' };
  callback(); assert.equal(area.start, 3); assert.equal(remembered, 1); assert.equal(wholeContinuationRef.current, null);
});

const settleEditor = () => new Promise(resolve => setImmediate(resolve));
test('same-request acknowledgment clears only exact submitted input without replacing textarea or selection', async () => {
  const h = referenceMenuHarness('원래 메모'); h.reject();
  const draft = h.draft(), before = draft.getState().committed;
  draft.updateRaw('저장할 메모', '2026-09-30'); h.textarea.value = draft.getState().raw;
  const next = draft.getState().working;
  assert.equal(await draft.save(), false); assert(draft.getState().dirty);
  h.textarea.selectionStart = 2; h.textarea.selectionEnd = 5; h.textarea.scrollTop = 24;
  assert.equal(h.confirmSave(before, structuredClone(next)), true);
  assert.equal(draft.getState().dirty, false); assert.equal(draft.getState().error, '');
  assert.equal(h.textarea.value, '저장할 메모');
  assert.deepEqual([h.textarea.selectionStart, h.textarea.selectionEnd, h.textarea.scrollTop], [2, 5, 24]);
  assert.equal(h.writes(), 1); assert.equal(h.confirmSave(before, next), false);
  h.accept(); draft.updateRaw('다음 입력', '2026-09-30'); assert(await draft.save());
  assert.equal(h.writes(), 2); assert.equal(draft.getState().raw, '다음 입력');
});

test('newer typing including a return to the submitted raw never gains acknowledgment authority', async () => {
  for (const returnToSubmitted of [false, true]) {
    const h = referenceMenuHarness('원래 메모'); h.reject(); const draft = h.draft(), before = draft.getState().committed;
    draft.updateRaw('제출한 메모', '2026-09-30'); const next = draft.getState().working; await draft.save();
    draft.updateRaw('새 입력', '2026-09-30');
    if (returnToSubmitted) draft.updateRaw('제출한 메모', '2026-09-30');
    h.textarea.value = draft.getState().raw;
    assert.equal(h.confirmSave(before, next), false); assert(draft.getState().dirty); assert.equal(h.writes(), 1);
  }
});

test('acknowledgment refuses composition, native-only input, invalid input and changed line identity', async () => {
  for (const mode of ['composition', 'native', 'invalid', 'identity', 'baseline']) {
    const h = referenceMenuHarness('원래 메모'); h.reject(); const draft = h.draft(), before = draft.getState().committed;
    draft.updateRaw('제출한 메모', '2026-09-30'); h.textarea.value = draft.getState().raw;
    const next = structuredClone(draft.getState().working); await draft.save();
    let expected = before;
    if (mode === 'composition') h.events.compositionstart();
    if (mode === 'native') h.textarea.value += '조합 입력';
    if (mode === 'invalid') draft.rejectRaw('잘못된 입력');
    if (mode === 'identity') next.documents[0].lines[0].id = 'different-line';
    if (mode === 'baseline') { expected = structuredClone(before); expected.documents[0].title = '다른 문서'; }
    assert.equal(h.confirmSave(expected, next), false, mode); assert(draft.getState().dirty, mode); assert.equal(h.writes(), 1);
  }
});

test('in-flight, unsubmitted and discarded input cannot accept a recovered confirmation', async () => {
  const h = referenceMenuHarness('원래 메모'), draft = h.draft(), before = draft.getState().committed;
  draft.updateRaw('새 메모', '2026-09-30'); h.textarea.value = draft.getState().raw;
  const next = draft.getState().working; assert.equal(h.confirmSave(before, next), false);
  let finish: (value: boolean) => void = () => {}; h.props.onCommit = () => new Promise<boolean>(resolve => { finish = resolve; });
  const flight = draft.save(); assert(draft.getState().saving); assert.equal(h.confirmSave(before, next), false);
  finish(false); await flight; assert(draft.discard(before)); assert.equal(h.confirmSave(before, next), false);
});

function editorField(h: ReturnType<typeof referenceMenuHarness>, type: string) {
  const field = h.nodes(h.render()).find(node => node.type === 'input' && node.props.type === type);
  assert(field, `missing ${type} field`); return field;
}
function submitEditorPanel(h: ReturnType<typeof referenceMenuHarness>) {
  const form = h.nodes(h.render()).find(node => node.type === 'form'); assert(form);
  form.props.onSubmit({ preventDefault() {} });
}

test('native date action loads time and commits date/time to the same task while retaining its memo', async () => {
  const h = referenceMenuHarness('- [ ] 준비\n  - 날짜: 2026-09-30\n  - 시간: 09:30\n  - 메모: 남길 메모');
  const before = h.space.text.documents[0], note = before.lines.find(line => line.text.includes('메모:'))!;
  h.action('task-date');
  assert.equal(editorField(h, 'time').props.value, '09:30');
  assert.equal(editorField(h, 'date').props.value, '2026-09-30');
  editorField(h, 'time').props.onChange({ target: { value: '11:45' } });
  editorField(h, 'date').props.onChange({ target: { value: '2026-10-02' } });
  submitEditorPanel(h); await settleEditor();
  assert.equal(h.writes(), 1);
  const saved = h.draft().getState().committed, task = M.tasks(saved)[0];
  assert.equal(task.id, h.taskId); assert.equal(task.date, '2026-10-02'); assert.equal(task.time, '11:45'); assert.equal(task.note, '남길 메모');
  assert.equal(saved.documents[0].lines[0].id, before.lines[0].id);
  assert.deepEqual(saved.documents[0].lines.find(line => line.id === note.id), note);
  h.action('task-date'); editorField(h, 'time').props.onChange({ target: { value: '' } });
  submitEditorPanel(h); await settleEditor();
  const cleared = M.tasks(h.draft().getState().committed)[0];
  assert.equal(h.writes(), 2); assert.equal(cleared.id, h.taskId); assert.equal(cleared.time, null);
  assert.equal(cleared.date, '2026-10-02'); assert.equal(cleared.note, '남길 메모');
  assert(!h.draft().getState().raw.includes('시간:'));
});

test('date/time cancel and Escape keep original source with zero writes', () => {
  for (const cancel of ['close', 'escape', 'native-cancel']) {
    const h = referenceMenuHarness('- [ ] 준비\n  - 시간: 09:30'), original = h.draft().getState().raw;
    h.action('task-date'); editorField(h, 'time').props.onChange({ target: { value: '12:00' } });
    if (cancel === 'close') h.button('닫기').props.onClick();
    else if (cancel === 'escape') h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    else h.nodes(h.render()).find(node => node.type === 'dialog').props.onCancel({ preventDefault() {} });
    assert.equal(h.writes(), 0); assert.equal(h.draft().getState().raw, original);
    assert(!h.nodes(h.render()).some(node => node.type === 'dialog'));
  }
});

test('named-line folder action prefills the title and replaces exactly that line with one scope', async () => {
  const h = referenceMenuHarness('- 새 폴더'), line = h.space.text.documents[0].lines[0];
  h.action('scope-picker');
  const field = h.nodes(h.render()).find(node => node.type === 'input' && node.props.maxLength === 100)!;
  assert.equal(field.props.value, '새 폴더');
  submitEditorPanel(h); await settleEditor();
  const saved = h.draft().getState().committed;
  assert.equal(h.writes(), 1); assert.equal(saved.documents[0].lines.length, 1);
  assert.deepEqual(saved.documents[0].lines[0], line);
  assert.equal(saved.bindings.length, 1); assert.equal(saved.bindings[0].lineId, line.id); assert.equal(saved.bindings[0].kind, 'scope');
  assert.equal(M.rowMeta(saved, h.docId)[0].kind, 'scope');
});

test('folder cancel, invalid duplicate title and composition cannot write or consume the original line', async () => {
  for (const mode of ['cancel', 'duplicate', 'composition']) {
    const h = referenceMenuHarness('- 새 폴더'), original = JSON.stringify(h.space.text);
    h.action('scope-picker');
    if (mode === 'cancel') h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    else {
      if (mode === 'duplicate') h.nodes(h.render()).find(node => node.type === 'input' && node.props.maxLength === 100).props.onChange({ target: { value: '미분류' } });
      else h.events.compositionstart();
      submitEditorPanel(h); await settleEditor();
      assert(h.nodes(h.render()).some(node => node.type === 'dialog'));
    }
    assert.equal(h.writes(), 0); assert.equal(JSON.stringify(h.draft().getState().committed), original);
    assert.equal(h.draft().getState().raw, '- 새 폴더');
  }
});

test('folder save failure preserves the committed source and exact same-line draft for retry', async () => {
  const h = referenceMenuHarness('- 새 폴더'), original = JSON.stringify(h.space.text), lineId = h.space.text.documents[0].lines[0].id;
  h.reject(); h.action('scope-picker'); submitEditorPanel(h); await settleEditor();
  const rejected = h.draft().getState();
  assert.equal(h.writes(), 1); assert.equal(JSON.stringify(rejected.committed), original);
  assert(rejected.dirty); assert(rejected.error.includes('저장하지 못했습니다'));
  assert.equal(rejected.working.documents[0].lines.length, 1); assert.equal(rejected.working.bindings[0].lineId, lineId);
  assert.equal(h.textarea.value, '- 새 폴더');
  h.accept(); assert(await h.draft().save());
  assert.equal(h.writes(), 2); assert.equal(h.draft().getState().dirty, false);
  assert.deepEqual(h.commits[1], h.commits[0]); assert.equal(h.draft().getState().committed.bindings[0].lineId, lineId);
});

test('one-row reference native menu opens existing exact-origin panel; close and Escape do not write', async () => {
  for (const cancel of ['close', 'escape', 'native-cancel']) {
    const h = referenceMenuHarness(); h.menu();
    assert(h.button('진행 기록')); assert(h.button('날짜 바꾸기'));
    h.button('연결된 항목 보기').props.onClick();
    assert.equal(h.panel().props.access.documentId, h.space.text.documents[0].id);
    assert.equal(h.panel().props.access.lineId, h.taskId);
    if (cancel === 'close') h.button('닫기').props.onClick();
    else if (cancel === 'escape') h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    else h.nodes(h.render()).find(n => n.type === 'dialog').props.onCancel({ preventDefault() {} });
    assert.equal(h.panel(), undefined); assert.equal(h.writes(), 0); assert(h.focus() > 0);
  }
  const h = referenceMenuHarness(); h.menu(); h.button('연결된 항목 보기').props.onClick();
  h.panel().props.onOrigin(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.origins, [[h.space.text.documents[0].id, h.taskId]]); assert.equal(h.writes(), 0);
});

test('reference menu preserves dirty-save failure, IME, readonly and input-lock boundaries', async () => {
  const h = referenceMenuHarness(); h.reject();
  h.draft().updateRaw(M.raw(M.getDocument(h.space.text, h.docId)) + '\n개인 입력 유지', '2026-09-14');
  h.menu(); h.button('연결된 항목 보기').props.onClick(); h.panel().props.onOrigin();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.writes(), 1); assert.deepEqual(h.origins, []); assert.match(h.draft().getState().raw, /개인 입력 유지/); assert(h.draft().getState().dirty);
  for (const mode of ['composition', 'readonly', 'locked']) {
    const g = referenceMenuHarness(); g.menu(); const entry = g.button('연결된 항목 보기');
    if (mode === 'composition') g.events.compositionstart();
    if (mode === 'readonly') g.props.readOnly = true;
    if (mode === 'locked') g.refs[7].current = true;
    entry.props.onClick(); assert.equal(g.panel(), undefined); assert.equal(g.writes(), 0);
  }
});

test('ordinary tasks and unresolved access do not gain reference action; protected reference keeps its existing route', () => {
  const h = referenceMenuHarness(); h.props.docId = h.space.text.documents[0].id; h.menu(); assert.equal(h.button('연결된 항목 보기'), undefined);
  const missing = referenceMenuHarness(); missing.props.taskAccess = () => undefined; missing.menu(); assert.equal(missing.button('연결된 항목 보기'), undefined);
  const wrong = referenceMenuHarness(); wrong.props.taskAccess = () => ({ kind: 'active', reason: null, documentId: 'another-owner-document', lineId: 'another-task' }); wrong.menu(); assert.equal(wrong.button('연결된 항목 보기'), undefined);
  const blocked = referenceMenuHarness(); blocked.space.archivedDocumentIds = [blocked.space.text.documents[0].id]; blocked.menu();
  assert.equal(blocked.button('연결된 항목 보기'), undefined); assert.equal(blocked.button('진행 기록'), undefined);
  blocked.button('기록·원래 항목 보기').props.onClick(); assert.equal(blocked.panel().props.access.kind, 'archived'); assert.equal(blocked.writes(), 0);
});

test('beforeinput rejection reports actual archived/trash/retention reason rather than asserting recurrence',()=>{
 const {programTextProtectionMessage:message}=loaded.exports;
 for(const [kind,reason]of [['archived','원래 문서가 보관되어 있습니다.'],['trash','원래 문서가 휴지통에 있습니다.'],['retention','판본 복구 중 보관된 내용입니다.']] as const){assert.equal(message({kind,reason,documentId:'actual-document',lineId:'actual-task'}),reason);assert.doesNotMatch(message({kind,reason,documentId:'actual-document',lineId:'actual-task'}),/원문 반복 규칙/);}
 assert.match(message(),/직접 수정할 수 없는 원문 표시/);assert.match(source,/setMessage\(programTextProtectionMessage\(accessFor/);assert.doesNotMatch(source,/이 줄은 원문 반복 규칙 표시입니다/);
});

test('locked reference exposes reason, immutable history and exact canonical origin without date/progress writers',()=>{
 const f=fixture(),space=createProgramData().spaces['local-user'];space.text=f.workspace;space.archivedDocumentIds=[f.docId];const taskId=M.tasks(space.text)[0].id,access=programReferenceExecutionAccess(space,taskId);let calls=0;
 const props={access,title:'준비',date:'2026-10-12',history:[{date:'2026-09-12',percent:35}],onOrigin:()=>{calls++;},onUnlink:()=>{calls++;},onProgress:()=>{calls++;},onDate:()=>{calls++;}};
 const html=renderToStaticMarkup(<ProgramReferencePanel {...props}/>);assert.match(html,/원래 문서가 보관되어/);assert.match(html,/날짜별 기록 읽기/);assert.match(html,/2026-09-12.*35%/);assert.match(html,/원래 문서의 항목 열기/);assert.match(html,/이 연결만 해제/);assert.doesNotMatch(html,/>진행 기록<|>날짜 바꾸기<|<input/);assert.equal(calls,0);
 const active=renderToStaticMarkup(<ProgramReferencePanel {...props} access={{...access,kind:'active',reason:null}}/>);assert.match(active,/>진행 기록</);assert.match(active,/>날짜 바꾸기</);
 const missing=renderToStaticMarkup(<ProgramReferencePanel {...props} access={programReferenceExecutionAccess(space,'missing')}/>);assert.match(missing,/원래 항목을 찾을 수 없습니다/);assert.doesNotMatch(missing,/원래 문서의 항목 열기/);
});
test('actual raw draft guard blocks reference completion while keeping rejected input and unrelated note edits',async()=>{
 const f=fixture(),space=createProgramData().spaces['local-user'];space.text=M.addDocument(f.workspace,{title:'활성 참조'});const refId=space.text.documents.at(-1)!.id,taskId=M.tasks(space.text)[0].id;space.text=M.linkTask(space.text,refId,0,taskId);space.archivedDocumentIds=[f.docId];let writes=0;
 const draft=createProgramTextDraft(space.text,refId,async()=>{writes++;return true;},()=>{},next=>programPreservesLockedDocumentContent(space,next));const original=M.raw(M.getDocument(space.text,refId)),changed=original.replace('[ ]','[100]');assert.notEqual(changed,original);assert.equal(draft.updateRaw(changed,'2026-09-12'),false);assert.equal(await draft.save(),false);assert.equal(writes,0);assert.equal(draft.getState().raw,changed);
 assert(draft.updateRaw(original+'\n자유 메모','2026-09-12'));assert(await draft.save());assert.equal(writes,1);
 const spaceSource=readFileSync(new URL('./ProgramSpace.tsx',import.meta.url),'utf8');assert.match(spaceSource,/programPreservesLockedDocumentContent\(before, merged\)/);assert.match(spaceSource,/onOpenTaskOrigin=\{\(documentId, lineId\) => \{ void openDocument\(documentId, lineId\)/);assert.match(source,/protectedExecutionPanel/);assert.doesNotMatch(source,/const scopeId = row.scopeId!/);
});

test('actual draft boundary accepts date-section plus numeric/memo bulk input once without normalizing away typed raw', async () => {
  let workspace=M.addDocument(createEmptyTextWorkspace(),{title:'제작 인계 입력'});const docId=workspace.documents[0].id;
  const original='# 브라우저 현재 초안\n- [ ] 현재 준비\n  - 설명: 함께 확인할 공개 설명\n- [ ] 비공개 선택 제외\n  - 메모: PRIVATE_CREATOR_UNSELECTED_1127\n비공개 자유 메모 PRIVATE_CREATOR_FREE_1127';
  workspace=M.editText(workspace,docId,original);const ids=M.tasks(workspace).map(task=>task.id);let writes=0;
  const input=original.replace('- [ ] 현재 준비','[2026-09-13]\n- [20%] 현재 준비\n  - 메모: PRIVATE_CREATOR_EXECUTION_1134');
  const draft=createProgramTextDraft(workspace,docId,async(next,_label,options)=>{writes++;assert.equal(options?.expectedWorkspace,workspace);assert.equal(M.raw(M.getDocument(next,docId)),input);assert.deepEqual(M.tasks(next).map(task=>task.id),ids);return true;},()=>{});
  assert(draft.updateRaw(input,'2026-09-12'));assert.equal(draft.getState().invalid,false);assert(await draft.save());assert.equal(writes,1);assert.equal(draft.getState().raw,input);assert.equal(draft.getState().dirty,false);
  assert.deepEqual(M.latestProgress(draft.getState().committed,ids[0]),{date:'2026-09-13',percent:20});
  const invalid=input.replace('[20%]','[101%]');assert.equal(draft.updateRaw(invalid,'2026-09-12'),false);assert.equal(await draft.save(),false);assert.equal(writes,1);assert.equal(draft.getState().raw,invalid);
});

test('line-specific metadata guard preserves ordinary/free typing and retains rejected IME/raw without a write', async () => {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '혼합 문서' }); const id = workspace.documents[0].id;
  workspace = M.editText(workspace, id, '반복 규칙: 보존\n- [ ] 일반 할 일\n자유 메모');
  const protectedId = workspace.documents[0].lines[0].id; let writes = 0;
  const validate = (next: TextWorkspaceState) => M.getDocument(next, id)?.lines.some(line => line.id === protectedId && line.text === '반복 규칙: 보존') === true;
  const draft = createProgramTextDraft(workspace, id, async () => { writes++; return true; }, () => {}, validate);
  assert(draft.updateRaw('반복 규칙: 보존\n- [ ] 일반 수정\n자유 메모를 계속 작성', '2026-09-12'));
  assert(await draft.save()); assert.equal(writes, 1);
  const raw = '반복 규칙: 한글 조합 원문\n- [ ] 일반 수정\n자유 메모를 계속 작성';
  assert.equal(draft.updateRaw(raw, '2026-09-12'), false); assert.equal(await draft.save(), false);
  assert.equal(writes, 1); assert.equal(draft.getState().raw, raw); assert(draft.getState().error.includes('원문 표시'));
  assert(source.includes('!event.defaultPrevented && !composingRef.current'));
});

function fixture() {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '메모' });
  const docId = workspace.documents[0].id;
  workspace = M.editText(workspace, docId, '- [ ] 준비');
  return { workspace, docId };
}

test('failed save preserves exact draft and committed source until a successful retry', async () => {
  const { workspace, docId } = fixture();
  let accept = false, calls = 0;
  const states: ProgramTextDraftState[] = [];
  const draft = createProgramTextDraft(workspace, docId, async (_next, _label, options) => { calls++; assert.equal(options?.expectedWorkspace, workspace); return accept; }, state => states.push(state));
  const raw = '- [20] 준비';
  assert(draft.updateRaw(raw, '2026-09-12'));
  assert.equal(await draft.save(), false);
  assert.equal(draft.getState().committed, workspace);
  assert.equal(draft.getState().raw, raw); assert.equal(draft.getState().dirty, true);
  assert.equal(M.raw(workspace.documents[0]), '- [ ] 준비');
  accept = true;
  assert.equal(await draft.save(), true);
  assert.equal(calls, 2); assert.equal(draft.getState().dirty, false);
  assert.equal(M.raw(draft.getState().committed.documents[0]), raw);
  assert(states.some(state => state.saving));
});

test('invalid text remains visible without calling storage and can recover through typing', async () => {
  const { workspace, docId } = fixture(); let writes = 0;
  const draft = createProgramTextDraft(workspace, docId, async () => { writes++; return true; }, () => {});
  assert.equal(draft.updateRaw('- [.1] 준비', '2026-09-12'), false);
  assert.equal(await draft.save(), false); assert.equal(writes, 0);
  assert.equal(draft.getState().raw, '- [.1] 준비'); assert.equal(draft.getState().working, workspace);
  assert(draft.updateRaw('- [0.1] 준비', '2026-09-12'));
  assert(await draft.save()); assert.equal(writes, 1);
});

test('M7-2 ambiguous parent rename plus child outdent keeps input and identities, then accepts split edits', async () => {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '격리 편집 시험' });
  const docId = workspace.documents[0].id;
  const initial = '검증용 메모\n- [ ] 부모 @2026-09-24\n  - [ ] 자식';
  workspace = M.editText(workspace, docId, initial);
  const before = JSON.stringify(workspace), ids = workspace.documents[0].lines.map(line => line.id);
  const combined = '검증용 메모\n- [ ] 부모\n- [ ] 자식';
  const result = M.editTextResult(workspace, docId, combined, { progressDate: '2026-09-24' });
  assert.equal(result.reason, 'identity-ambiguous'); assert.equal(result.state, workspace);
  assert.equal(M.editText(workspace, docId, combined), workspace);
  let writes = 0;
  const draft = createProgramTextDraft(workspace, docId, async () => { writes++; return true; }, () => {});
  assert.equal(draft.updateRaw(combined, '2026-09-24'), false); assert.equal(await draft.save(), false);
  assert.equal(writes, 0); assert.equal(draft.getState().raw, combined);
  assert.equal(draft.getState().working, workspace); assert.equal(JSON.stringify(workspace), before);
  assert.match(draft.getState().error, /기존 항목과 연결하지 못해/);
  assert.match(draft.getState().error, /제목 수정과 줄 이동은 나누고/);
  assert.doesNotMatch(draft.getState().error, /날짜·진행률/);
  assert(draft.updateRaw(initial.replace(' @2026-09-24', ''), '2026-09-24'));
  assert(await draft.save()); assert.equal(draft.getState().error, '');
  assert(draft.updateRaw(combined, '2026-09-24')); assert(await draft.save());
  assert.equal(writes, 2); assert.equal(draft.getState().dirty, false);
  assert.deepEqual(draft.getState().committed.documents[0].lines.map(line => line.id), ids);
  assert.equal(draft.getState().raw, combined);
});

test('M7-2 diagnostic distinguishes format, unchanged and generic blocked edits without persisting reasons', async () => {
  const { workspace, docId } = fixture(); let writes = 0;
  const initial = M.raw(workspace.documents[0]);
  assert.deepEqual(M.editTextResult(workspace, docId, initial), { state: workspace, reason: null });
  assert.deepEqual(M.editTextResult(workspace, 'missing', initial), { state: workspace, reason: 'blocked' });
  assert.deepEqual(M.editTextResult(workspace, docId, 'x'.repeat(100001)), { state: workspace, reason: 'blocked' });
  const draft = createProgramTextDraft(workspace, docId, async () => { writes++; return true; }, () => {});
  for (const input of ['- [101%] 준비', '- [ ] 준비\n  [2026-09-24]', ' - [ ] 준비']) {
    assert.equal(M.editTextResult(workspace, docId, input).reason, 'invalid-format');
    assert.equal(draft.updateRaw(input, '2026-09-24'), false); assert.equal(await draft.save(), false);
    assert.match(draft.getState().error, /날짜·진행률·들여쓰기 형식/);
    assert.doesNotMatch(draft.getState().error, /기존 항목과 연결/);
    assert.equal(draft.getState().raw, input); assert.equal(writes, 0);
  }
  assert.equal(draft.updateRaw('x'.repeat(100001), '2026-09-24'), false);
  assert.match(draft.getState().error, /안전하게 반영하지 못했습니다/);
  assert.doesNotMatch(draft.getState().error, /날짜·진행률|기존 항목과 연결/);
  assert(draft.updateRaw(initial, '2026-09-24')); assert.equal(draft.getState().error, '');
  const accepted = M.editTextResult(workspace, docId, '- [ ] 정상 수정');
  assert.equal(accepted.reason, null); assert(M.validate(accepted.state));
  // An invalid date value was already a nonblocking source warning; do not tighten that policy.
  const warning = M.editTextResult(workspace, docId, '[2026-02-30]\n- [ ] 준비');
  assert.equal(warning.reason, null);
  assert(M.parseDocument(warning.state.documents[0], warning.state).issues.some(issue => issue.code === 'invalid-date' && !issue.blocking));
  assert.equal('reason' in accepted.state, false); assert.equal('reason' in workspace, false);
  assert.equal(writes, 0);
});

test('typing while a commit is pending is serialized and neither draft nor ID is lost', async () => {
  const { workspace, docId } = fixture();
  const writes: TextWorkspaceState[] = [];
  let release!: (value: boolean) => void;
  const draft = createProgramTextDraft(workspace, docId, next => {
    writes.push(next);
    return writes.length === 1 ? new Promise<boolean>(resolve => { release = resolve; }) : Promise.resolve(true);
  }, () => {});
  draft.updateRaw('- [10] 준비', '2026-09-12');
  const save = draft.save();
  const firstId = M.tasks(draft.getState().working)[0].id;
  draft.updateRaw('- [20] 준비 마무리', '2026-09-12');
  assert.equal(draft.save(), save);
  release(true); assert(await save);
  assert.equal(writes.length, 2);
  assert.equal(M.tasks(draft.getState().committed)[0].id, firstId);
  assert.equal(draft.getState().raw, '- [20] 준비 마무리');
  assert.equal(M.latestProgress(draft.getState().committed, firstId)?.percent, 20);
});

test('a pending failure keeps typing that arrived after the submitted snapshot', async () => {
  const { workspace, docId } = fixture();
  let release!: (value: boolean) => void;
  const draft = createProgramTextDraft(workspace, docId, () => new Promise<boolean>(resolve => { release = resolve; }), () => {});
  draft.updateRaw('- [ ] 첫 편집', '2026-09-12'); const save = draft.save();
  draft.updateRaw('- [ ] 두 번째 편집', '2026-09-12'); release(false);
  assert.equal(await save, false);
  assert.equal(draft.getState().raw, '- [ ] 두 번째 편집');
  assert.equal(draft.getState().committed, workspace); assert.equal(draft.getState().dirty, true);
});

test('external rerenders cannot replace an unsaved or invalid local draft', () => {
  const { workspace, docId } = fixture();
  const draft = createProgramTextDraft(workspace, docId, async () => true, () => {});
  draft.updateRaw('- [invalid', '2026-09-12');
  const external = M.updateTask(workspace, M.tasks(workspace)[0].id, { title: '외부 변경' });
  assert.equal(draft.synchronize(external), false);
  assert.equal(draft.getState().raw, '- [invalid');
  assert(draft.discard(external)); assert.equal(draft.getState().raw, '- [ ] 외부 변경');
});

test('move transaction preserves descendants, source IDs, progress and exact undo snapshot', async () => {
  const { workspace, docId } = fixture();
  const withChildren = M.editText(workspace, docId, '- [ ] 준비\n  - [ ] 물품\n- [ ] 예약');
  const source = M.editText(withChildren, docId, '- [10] 준비\n  - [ ] 물품\n- [ ] 예약', { progressDate: '2026-09-12' });
  const taskId = M.tasks(source)[0].id;
  const draft = createProgramTextDraft(source, docId, async () => true, () => {});
  const next = M.moveSubtree(source, docId, taskId, null, 0);
  assert.notEqual(next, source); assert(draft.apply(next, '하위 묶음 이동')); assert(await draft.save());
  assert.deepEqual(draft.getState().committed.progressRecords, source.progressRecords);
  assert(M.getDocument(draft.getState().committed, docId)?.lines.some(line => line.id === taskId));
  assert(draft.apply(source, '이동 되돌리기')); assert(await draft.save());
  assert.deepEqual(draft.getState().committed, source);
});

test('server rendering exposes one native editor mount and clear read-only controls', () => {
  const { workspace, docId } = fixture();
  const html = renderToStaticMarkup(<ProgramTextEditor workspace={workspace} docId={docId} onCommit={async () => true} readOnly disabledReason="저장소 확인 중" />);
  assert.equal((html.match(/data-native-editor="v11-core"/g) ?? []).length, 1);
  assert.match(html, /저장소 확인 중/); assert.match(html, /aria-label="개인 문서 편집"/);
  assert.match(html, /disabled=""[^>]*>＋ 추가/);
  assert.doesNotMatch(html, /iframe|srcDoc|ux-review:text-workspace/);
});

test('component keeps mount lifetime on document identity and restores source position', () => {
  assert.match(source, /\}, \[props\.docId\]\);/);
  assert.match(source, /textarea\.setSelectionRange\(Math\.min\(position\.start/);
  assert.match(source, /textarea\.scrollTop = position\.scrollTop/);
  assert.match(source, /if \(!regionPendingRef\.current && draftRef\.current\?\.synchronize\(props\.workspace\)\)/);
  assert.doesNotMatch(source, /localStorage|localStorage\.clear|flowme-text-workspace-v11\.html/);
});

test('explicit date order, failed save, retry and genuine history bridge retain exact identities', async () => {
  const f = fixture();
  const workspace = M.editText(M.editText(f.workspace, f.docId, ''), f.docId, '## 준비\n- [ ] 같은 제목\n  - 날짜: 2026-09-23\n- [ ] 같은 제목\n  - 날짜: 2026-09-20');
  const plan = planProgramDateBlockOrder(workspace, f.docId, workspace.documents[0].lines[0].id);
  assert.equal(plan.status, 'ready'); if (plan.status !== 'ready') return;
  const next = applyProgramLinePermutation(workspace, f.docId, plan.afterLineIds)!;
  let accepted = false, calls = 0;
  const draft = createProgramTextDraft(workspace, f.docId, async () => { calls++; return accepted; }, () => {});
  assert.equal(calls, 0); // preview/cancel/no-op do not use the commit port
  assert(draft.apply(next, '같은 구간 날짜순 정렬'));
  assert.equal(await draft.save(), false);
  assert.equal(draft.getState().raw, plan.afterRaw); assert.equal(draft.getState().committed, workspace);
  accepted = true; assert(await draft.save());
  assert.equal(draft.synchronize(structuredClone(next)), false, 'own commit echo must not reset native history');
  const history = createProgramPermutationHistory(f.docId); assert(history.record(workspace, next));
  const undo = history.resolve(draft.getState().working, plan.beforeRaw, 'historyUndo')!;
  assert(draft.apply(undo, '날짜순 정렬 입력 취소')); assert(await draft.save());
  assert.deepEqual(draft.getState().working, workspace);
  const redo = history.resolve(draft.getState().working, plan.afterRaw, 'historyRedo')!;
  assert(draft.apply(redo, '날짜순 정렬 다시 실행')); assert(await draft.save());
  assert.deepEqual(draft.getState().working, next); assert.equal(calls, 4);
});

test('date order UI uses one native replacement and explicitly guards composition and stale preview', () => {
  assert.match(source, /pendingOrderRef\.current = \{ before: capture\.before, next, raw: plan\.afterRaw \}/);
  assert.match(source, /replaceRange\(plan\.replacement\.start, plan\.replacement\.end, plan\.replacement\.text/);
  assert.match(source, /capture\.epoch !== orderEpochRef\.current/);
  assert.match(source, /composingRef\.current/);
  assert.match(source, /historyType === 'historyUndo'/);
  const { workspace, docId } = fixture();
  const html = renderToStaticMarkup(<ProgramTextEditor workspace={workspace} docId={docId} onCommit={async () => true} readOnly />);
  assert.match(html, /disabled=""[^>]*>날짜순 정렬/);
});

function progressConflictHarness() {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: 'Synthetic progress recovery' });
  const docId = workspace.documents[0].id;
  workspace = M.editText(workspace, docId, '- [ ] Exact item\n  - 메모: original memo\n- [ ] Peer item');
  const taskId = M.tasks(workspace)[0].id;
  workspace = M.recordProgress(workspace, taskId, '2026-10-06', 100);
  const h = referenceMenuHarness(undefined, { workspace, docId });
  const raw = M.raw(workspace.documents[0]).replace('[x]', '[ ]').replace('original memo', 'changed memo');
  h.input(raw);
  return { h, raw, taskId };
}

test('progress conflict viewing and all close paths preserve checkbox plus memo without a writer or history change', () => {
  for (const cancel of ['close', 'escape', 'native-cancel']) {
    const { h, raw, taskId } = progressConflictHarness();
    const before = h.draft().getState(), textarea = h.textarea, history = JSON.stringify(before.working.progressRecords);
    assert(before.invalid); assert.equal(before.raw, raw); assert.match(raw, /changed memo/);
    assert.deepEqual(before.progressConflict, { lineId: taskId, targetId: taskId });
    const view = h.button('진행 조절 보기'); assert(view);
    view.props.onClick();
    const dialog = h.nodes(h.render()).find(n => n.type === 'dialog'); assert(dialog);
    assert.equal(dialog.props['aria-label'], '누적 진행률');
    assert(h.nodes(dialog).some(n => n.type === 'p' && n.props.children === 'Exact item'));
    assert.equal(h.button('진행 저장').props.disabled, true);
    if (cancel === 'close') h.button('닫기').props.onClick();
    else if (cancel === 'escape') h.render().props.onKeyDownCapture({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    else dialog.props.onCancel({ preventDefault() {} });
    assert.equal(h.nodes(h.render()).find(n => n.type === 'dialog'), undefined);
    assert.equal(h.draft().getState(), before); assert.equal(h.textarea, textarea); assert.equal(h.textarea.value, raw);
    assert.equal(JSON.stringify(h.draft().getState().working.progressRecords), history); assert.equal(h.writes(), 0);
    h.unmount();
  }
});

test('progress conflict view rechecks exact Item, access, input and IME boundaries before opening', () => {
  for (const block of ['wrong-line', 'wrong-target', 'wrong-origin', 'missing-access', 'protected', 'readonly', 'locked', 'composition', 'changed-input', 'format']) {
    const { h, raw } = progressConflictHarness(), view = h.button('진행 조절 보기'); assert(view);
    const diagnostic = h.draft().getState().progressConflict!;
    if (block === 'wrong-line') diagnostic.lineId = 'missing-line';
    if (block === 'wrong-target') diagnostic.targetId = M.tasks(h.space.text)[1].id;
    if (block === 'wrong-origin') h.props.taskAccess = () => ({ kind: 'active', reason: null, documentId: 'wrong-document', lineId: diagnostic.targetId });
    if (block === 'missing-access') h.props.taskAccess = () => undefined;
    if (block === 'protected') h.space.archivedDocumentIds = [h.docId];
    if (block === 'readonly') h.props.readOnly = true;
    if (block === 'locked') h.lock(true);
    if (block === 'composition') h.events.compositionstart();
    if (block === 'changed-input') h.textarea.value = raw + '\nnewer input';
    if (block === 'format') h.input(raw.replace('[ ]', '[101%]'));
    view.props.onClick();
    assert.equal(h.button('진행 조절 보기'), undefined);
    assert.equal(h.nodes(h.render()).find(n => n.type === 'dialog'), undefined); assert.equal(h.writes(), 0);
    assert.deepEqual(h.draft().getState().working.progressRecords, h.space.text.progressRecords);
    h.unmount();
  }
});

test('marker-only recovery keeps typed memo and allows the existing progress-zero save path', async () => {
  const { h, raw, taskId } = progressConflictHarness();
  h.input(raw.replace('[ ]', '[x]')); assert.equal(h.draft().getState().invalid, false);
  assert.equal(h.draft().getState().progressConflict, undefined); assert.equal(h.button('진행 조절 보기'), undefined);
  assert(await h.draft().save()); assert.equal(h.writes(), 1);
  h.action('progress-open', 0); assert.equal(h.button('진행 저장').props.disabled, false);
  h.button('0%').props.onClick();
  h.nodes(h.render()).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  await new Promise(resolve => setImmediate(resolve));
  const next = h.draft().getState().committed;
  assert.equal(h.writes(), 2); assert.equal(M.tasks(next)[0].id, taskId);
  assert.equal(M.tasks(next)[0].done, false); assert.equal(M.tasks(next)[0].note, 'changed memo');
  assert.equal(M.latestProgress(next, taskId)?.percent, 0);
  assert.deepEqual(M.tasks(next)[1], M.tasks(h.space.text)[1]);
  h.unmount();
});
