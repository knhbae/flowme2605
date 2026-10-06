import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { programClone, programFailure, programId, programResult, type ProgramData, type ProgramTransition, type ProgramWritingPosition } from '../../../lib/flow/integrated-poc/contract';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import { normalizeProgramWritingPosition } from '../../../lib/flow/integrated-poc/writing-position';
import { readProgramFolderRegions } from '../../../lib/flow/integrated-poc/folder-document-regions';
import { createProgramRegionDraft } from './ProgramFolderRegionEditor';
import { createProgramDocument, createProgramFolder } from '../../../lib/flow/integrated-poc/private-space';
import { mergeProgramTextWorkspace } from '../../../lib/flow/integrated-poc/text-merge';
import { programSame } from '../../../lib/flow/integrated-poc/controller';
import { programDocumentContentLock, programPreservesLockedDocumentContent } from '../../../lib/flow/integrated-poc/reference-execution-guard';
import { programPreservesSeriesMetadata } from '../../../lib/flow/integrated-poc/recurrence-target';
import { programPreservesLegacyQualityHold } from '../../../lib/flow/integrated-poc/legacy-map-review';
import { programPreservesLegacyPlanExcluded } from '../../../lib/flow/integrated-poc/program-legacy-plan-target';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let declaration: ts.FunctionDeclaration | undefined;
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'openDocument') declaration = node;
  ts.forEachChild(node, visit);
}
visit(ast); assert(declaration);
const compiled = ts.transpileModule(`const action = (${declaration.getText(ast)});`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function periodHarness(composing: boolean) {
  const data = createProgramData(), space = data.spaces[data.activeActorId];
  let state = M.addDocument(space.text, { title: '부분 작성' });
  state = { ...state, folders: [...state.folders, { id: 'period-work', title: '업무', parentId: null }] };
  const documentId = state.documents[0].id;
  state = M.editText(state, documentId, '- 업무\n  - 메모\n외부 메모');
  state = { ...state, bindings: [{ kind: 'scope', docId: documentId, lineId: state.documents[0].lines[0].id, scopeId: 'period-work' }] };
  const view = readProgramFolderRegions(state, documentId, 'period-work')!, region = view.regions[0];
  const input = composing ? '  - 조합 중 메모' : '- 경계 밖 입력';
  let writes = 0, lockCount = 0, flushCount = 0;
  const draft = createProgramRegionDraft({ workspace: () => state, readonly: () => false, notify() {},
    accept: () => { writes++; return true; }, persist: async () => { writes++; return true; } });
  draft.update(view, region.key, input); draft.compose(composing);
  const presentation = { period: 'documents', documentId, date: '2026-10-01' }, messages: string[] = [], calls: string[] = [];
  let fn: ts.FunctionDeclaration | undefined;
  const scan = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'changePeriod') fn = node; ts.forEachChild(node, scan); };
  scan(ast); assert(fn);
  const code = ts.transpileModule(`const change = (${fn.getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { inputLockCount: { current: 0 }, today: '2026-10-02', collectionMode: undefined,
    setTaskNotice: (value: unknown) => assert.equal(value, null),
    lockInput: () => { lockCount++; calls.push('lock'); return () => { lockCount--; calls.push('release'); }; },
    flushAllEditors: async () => { flushCount++; calls.push('flush'); return draft.flush(); },
    setMessage: (value: string) => messages.push(value), setPeriod: (value: string) => { presentation.period = value; }, setDate: (value: string) => { presentation.date = value; } };
  const change = new Function(...Object.keys(context), `${code}; return change;`)(...Object.values(context)) as (period: string) => Promise<boolean>;
  return { presentation, messages, calls, draft, input, documentId, change, writes: () => writes, locks: () => lockCount, flushes: () => flushCount };
}

test('period navigation cannot hide a composing folder region or change its document and date', async () => {
  const h = periodHarness(true);
  assert.equal(await h.change('today'), false);
  assert.deepEqual(h.presentation, { period: 'documents', documentId: h.documentId, date: '2026-10-01' });
  assert.equal(h.draft.getState().pending?.raw, h.input); assert(h.draft.isComposing()); assert.equal(h.writes(), 0);
  assert.deepEqual(h.calls, ['lock', 'flush', 'release']); assert.equal(h.locks(), 0); assert.equal(h.flushes(), 1);
  assert.match(h.messages.at(-1)!, /한글 입력을 마친 뒤/);
  assert.match(source, /onClick=\{\(\) => \{ void changePeriod\(key\); \}\}/);
});

test('period navigation cannot hide rejected folder input and shares the folder-task transition', async () => {
  const h = periodHarness(false);
  assert.equal(await h.change('week'), false);
  assert.deepEqual(h.presentation, { period: 'documents', documentId: h.documentId, date: '2026-10-01' });
  assert.equal(h.draft.getState().pending?.raw, h.input); assert(h.draft.hasPending()); assert.equal(h.writes(), 0);
  assert.deepEqual(h.calls, ['lock', 'flush', 'release']); assert.equal(h.locks(), 0); assert.match(h.messages.at(-1)!, /저장되지 않은 입력/);
  assert.match(source, /async function showFolderTasks\(\) \{\s*return changePeriod\('all'\);/);
  h.draft.discard(); assert.equal(await h.change('today'), true); assert.equal(h.presentation.period, 'today'); assert.equal(h.presentation.date, '2026-10-02');
});

function libraryHarness(options: { mobile?: boolean; period?: string; pending?: 'composition' | 'rejected'; locked?: boolean; authority?: boolean; missing?: boolean; readonlyRegion?: boolean; lockedDocument?: boolean } = {}) {
  const data = createProgramData(), space = data.spaces[data.activeActorId];
  space.text = M.addDocument(space.text, { title: '모바일 작성 문서' });
  space.text = { ...space.text, folders: [...space.text.folders,
    { id: 'library-work', title: '업무', parentId: null }, { id: 'library-empty', title: '빈 폴더', parentId: null }] };
  const id = space.text.documents[0].id;
  space.text = M.editText(space.text, id, options.readonlyRegion ? '- 업무\n  - [ ] 할 일\n다른 원문' : '- 업무\n  - 메모\n  - [ ] 할 일\n다른 원문');
  space.text = { ...space.text, bindings: [{ kind: 'scope', docId: id, lineId: space.text.documents[0].lines[0].id, scopeId: 'library-work' }] };
  if (options.readonlyRegion) {
    const taskId = M.tasks(space.text)[0].id;
    space.text = { ...space.text, itemScopes: { ...space.text.itemScopes, [taskId]: 'library-empty' }, taskScopes: { ...space.text.taskScopes, [taskId]: 'library-empty' } };
  }
  if (options.lockedDocument) space.archivedDocumentIds.push(id);
  const view = readProgramFolderRegions(space.text, id, 'library-work')!, region = view.regions[0];
  const before = JSON.stringify(data), calls: string[] = [], messages: string[] = [];
  const draft = createProgramRegionDraft({ workspace: () => space.text, readonly: () => false, notify() {},
    accept: () => { calls.push('write'); return true; }, persist: async () => { calls.push('write'); return true; } });
  if (options.pending) draft.update(view, region.key, options.pending === 'composition' ? '  - 조합 중 메모' : '- 경계 밖 입력');
  if (options.pending === 'composition') draft.compose(true);
  const inputLockCount = { current: options.locked ? 1 : 0 }, dirty = { current: {} as Record<string, boolean> };
  const recurrencePorts = { current: {} as Record<string, { hasPendingInput: () => boolean }> };
  const selectedRef = { current: id }, presentation = { current: { period: options.period ?? 'documents', folderId: 'library-work', query: '메모' } };
  let opened = true, mobile = options.mobile !== false, authority = options.authority !== false, duringFlush: (() => void) | undefined;
  const frames = new Map<number, () => void>(), libraryReveal = { current: { epoch: 0, frame: null as number | null, request: null as unknown, committedRequest: null as unknown } };
  let libraryHandoff: unknown = null;
  let frameId = 0;
  const area = { value: region.raw, selectionStart: 4, selectionEnd: 9, scrollTop: 113, readOnly: false,
    getClientRects: () => [{}], getBoundingClientRect: () => ({ top: 1200, bottom: 1500 }), focus: () => calls.push('textarea-focus') };
  const editor = { getClientRects: () => [{}], querySelectorAll: () => [area], scrollIntoView: (value: unknown) => { calls.push('reveal'); assert.deepEqual(value, { block: 'nearest', inline: 'nearest' }); } };
  const button = { getClientRects: () => [{}], focus: (value: unknown) => { calls.push('disclosure-focus'); assert.deepEqual(value, { preventScroll: true }); } };
  const documentHost = { dataset: { programDocument: id }, querySelector: () => editor };
  const focus = { body: {}, activeElement: {} as object | null };
  const context = { document: focus, readProgramFolderRegions, programDocumentContentLock, space, libraryReveal, selectedRef, presentation, dirty, recurrencePorts, inputLockCount,
    setTaskNotice: (value: unknown) => assert.equal(value, null),
    workspaceRef: { current: space.text }, documentsRef: { current: options.missing ? [] : space.text.documents },
    libraryToggle: { current: button }, root: { current: { getClientRects: () => [{}], querySelectorAll: () => [documentHost] } },
    props: { canContinueWholeDocument: () => authority }, window: { matchMedia: () => ({ matches: mobile }), innerHeight: 844 },
    requestAnimationFrame: (frame: () => void) => { frames.set(++frameId, frame); return frameId; }, cancelAnimationFrame: (id: number) => frames.delete(id),
    lockInput: () => { inputLockCount.current++; calls.push('lock'); return () => { inputLockCount.current--; calls.push('release'); }; },
    flushAllEditors: async () => { calls.push('flush'); duringFlush?.(); return draft.hasPending() ? draft.flush() : true; },
    setMessage: (message: string) => messages.push(message), setFolderId: (value: string) => { presentation.current.folderId = value; },
    setLibraryHandoff: (request: unknown) => { libraryHandoff = request; },
    setLibraryOpen: (value: boolean | ((old: boolean) => boolean)) => { opened = typeof value === 'function' ? value(opened) : value; } };
  const declarations: Record<string, ts.FunctionDeclaration> = {};
  let revealEffect: ts.Expression | undefined;
  const scan = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && ['changeFolder', 'cancelLibraryReveal'].includes(node.name?.text ?? '')) declarations[node.name!.text] = node;
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('const request = libraryHandoff')) revealEffect = node.arguments[0];
    ts.forEachChild(node, scan);
  };
  scan(ast); assert(declarations.changeFolder && declarations.cancelLibraryReveal && revealEffect);
  const code = ts.transpileModule(Object.values(declarations).map(node => node.getText(ast)).join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const actual = new Function(...Object.keys(context), `${code}; return { changeFolder, cancelLibraryReveal };`)(...Object.values(context)) as {
    changeFolder: (folder: string, options?: { fromLibrary?: boolean }) => Promise<void>; cancelLibraryReveal: () => void;
  };
  const effectCode = ts.transpileModule(`const effect = (${revealEffect.getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const runEffect = new Function(...Object.keys(context), 'libraryHandoff', 'libraryOpen', 'folderId', 'selected', 'period', `${effectCode}; return effect();`);
  let cleanup: (() => void) | undefined;
  const cleanupEffect = () => { cleanup?.(); cleanup = undefined; };
  const commit = (view: Partial<{ libraryOpen: boolean; folderId: string; selected: string; period: string }> = {}) => {
    cleanupEffect();
    cleanup = runEffect(...Object.values(context), libraryHandoff, view.libraryOpen ?? opened,
      view.folderId ?? presentation.current.folderId, view.selected ?? selectedRef.current, view.period ?? presentation.current.period);
  };
  return { ...actual, data, before, draft, id, calls, messages, frames, area, focus, inputLockCount, dirty, recurrencePorts, selectedRef, presentation, editor, libraryReveal, commit, cleanupEffect,
    open: () => opened, setMobile: (value: boolean) => { mobile = value; }, setAuthority: (value: boolean) => { authority = value; },
    duringFlush: (callback: () => void) => { duringFlush = callback; }, reopen: () => { actual.cancelLibraryReveal(); context.setLibraryOpen(true); },
    flushFrame: () => { if (!frames.size) commit(); const pending = [...frames.values()]; frames.clear(); pending.forEach(frame => frame()); } };
}

test('explicit mobile library selection closes onto a real writing region without moving native input or writing data', async () => {
  const h = libraryHarness(), input = { ...h.area };
  await h.changeFolder('library-work', { fromLibrary: true });
  assert.equal(h.open(), false); assert.equal(h.frames.size, 0); h.commit(); assert.equal(h.frames.size, 1); h.flushFrame();
  assert.deepEqual(h.calls, ['lock', 'flush', 'release', 'disclosure-focus', 'reveal']);
  for (const key of ['value', 'selectionStart', 'selectionEnd', 'scrollTop'] as const) assert.equal(h.area[key], input[key]);
  assert.equal(JSON.stringify(h.data), h.before); assert.equal(h.presentation.current.query, '메모');
  h.reopen(); assert.equal(h.open(), true); assert.equal(h.presentation.current.folderId, 'library-work');
  await h.changeFolder('', { fromLibrary: true }); assert.equal(h.open(), false); h.flushFrame();
  assert.equal(JSON.stringify(h.data), h.before); assert.equal(h.presentation.current.folderId, '');
  assert.match(source, /changeFolder\(event\.target\.value, \{ fromLibrary: true \}\)/);
});

test('desktop, period, empty result, missing document and non-library changes keep the library presentation', async () => {
  for (const condition of ['desktop', 'period', 'empty', 'missing', 'non-library', 'held-authority', 'readonly-region', 'locked-document']) {
    const h = libraryHarness({ mobile: condition !== 'desktop', period: condition === 'period' ? 'week' : 'documents',
      missing: condition === 'missing', authority: condition !== 'held-authority', readonlyRegion: condition === 'readonly-region', lockedDocument: condition === 'locked-document' });
    await h.changeFolder(condition === 'empty' ? 'library-empty' : 'library-work', { fromLibrary: condition !== 'non-library' });
    h.flushFrame(); assert.equal(h.open(), true, condition); assert.equal(h.frames.size, 0); assert(!h.calls.includes('disclosure-focus'), condition);
    assert.equal(JSON.stringify(h.data), h.before, condition);
  }
});

test('composition, rejected draft and input lock preserve mobile folder scope, library and input', async () => {
  for (const condition of ['composition', 'rejected', 'locked'] as const) {
    const h = libraryHarness({ pending: condition === 'locked' ? undefined : condition, locked: condition === 'locked' });
    const pending = h.draft.getState().pending;
    await h.changeFolder('', { fromLibrary: true }); h.flushFrame();
    assert.equal(h.presentation.current.folderId, 'library-work'); assert.equal(h.open(), true); assert.equal(h.frames.size, 0);
    assert.equal(h.draft.getState().pending, pending); assert(!h.calls.includes('write')); assert(!h.calls.includes('disclosure-focus'));
    assert.equal(JSON.stringify(h.data), h.before);
    if (condition !== 'locked') assert.match(h.messages.at(-1)!, /한글 입력을 마친 뒤/);
  }
});

test('deferred mobile reveal rejects later input, authority, view, viewport and detached writing targets', async () => {
  for (const condition of ['dirty', 'occurrence', 'lock', 'authority', 'period', 'folder', 'selected', 'desktop', 'readonly', 'hidden', 'new-focus']) {
    const h = libraryHarness(); await h.changeFolder('library-work', { fromLibrary: true });
    if (condition === 'dirty') h.dirty.current[h.id] = true;
    if (condition === 'occurrence') h.recurrencePorts.current.other = { hasPendingInput: () => true };
    if (condition === 'lock') h.inputLockCount.current++;
    if (condition === 'authority') h.setAuthority(false);
    if (condition === 'period') h.presentation.current.period = 'week';
    if (condition === 'folder') h.presentation.current.folderId = 'library-empty';
    if (condition === 'selected') h.selectedRef.current = 'other-document';
    if (condition === 'desktop') h.setMobile(false);
    if (condition === 'readonly') h.area.readOnly = true;
    if (condition === 'hidden') h.editor.getClientRects = () => [];
    if (condition === 'new-focus') h.focus.activeElement = h.area;
    h.flushFrame(); assert(!h.calls.includes('disclosure-focus'), condition); assert(!h.calls.includes('reveal'), condition);
    assert.equal(h.area.selectionStart, 4); assert.equal(h.area.selectionEnd, 9); assert.equal(h.area.scrollTop, 113);
    assert.equal(JSON.stringify(h.data), h.before);
  }
});

test('reopening or a newer folder selection invalidates an already queued reveal even if its frame still arrives', async () => {
  for (const condition of ['reopen', 'new-choice']) {
    const h = libraryHarness(); await h.changeFolder('library-work', { fromLibrary: true });
    h.commit();
    const oldFrame = [...h.frames.values()][0]; assert(oldFrame);
    if (condition === 'reopen') h.reopen(); else await h.changeFolder('library-empty', { fromLibrary: true });
    oldFrame(); h.flushFrame(); assert(!h.calls.includes('disclosure-focus')); assert(!h.calls.includes('reveal'));
    assert.equal(h.open(), condition === 'reopen'); assert.equal(JSON.stringify(h.data), h.before);
  }
});

test('a newer selection during the flush cancels the earlier mobile handoff and releases its input lock', async () => {
  const h = libraryHarness(); h.duringFlush(() => h.cancelLibraryReveal());
  await h.changeFolder('library-work', { fromLibrary: true }); h.flushFrame();
  assert.equal(h.open(), true); assert.equal(h.inputLockCount.current, 0); assert.equal(h.frames.size, 0);
  assert.deepEqual(h.calls, ['lock', 'flush', 'release']); assert.equal(JSON.stringify(h.data), h.before);
});

test('mobile handoff waits for committed presentation and mounted native regions instead of racing the folder render', async () => {
  const h = libraryHarness(), visible = h.editor.getClientRects;
  h.editor.getClientRects = () => [];
  await h.changeFolder('library-work', { fromLibrary: true });
  assert.equal(h.frames.size, 0); assert(!h.calls.includes('disclosure-focus'));
  // The enqueue has completed, but the old rendered library/folder still owns
  // the DOM. This phase must not consume the handoff or create a frame.
  h.commit({ libraryOpen: true, folderId: '' });
  assert.equal(h.frames.size, 0); assert(h.libraryReveal.current.request);
  h.editor.getClientRects = visible; h.commit();
  assert.equal(h.frames.size, 1); h.flushFrame();
  assert.deepEqual(h.calls, ['lock', 'flush', 'release', 'disclosure-focus', 'reveal']);
  assert.equal(h.libraryReveal.current.request, null); assert.equal(JSON.stringify(h.data), h.before);
});

test('effect cleanup and replay retain the handoff while a canceled old frame cannot consume or focus the fresh frame', async () => {
  const h = libraryHarness(); await h.changeFolder('library-work', { fromLibrary: true }); h.commit();
  const oldFrame = [...h.frames.values()][0], request = h.libraryReveal.current.request;
  assert.equal(typeof oldFrame, 'function'); assert(request); h.cleanupEffect(); assert.equal(h.frames.size, 0);
  assert.equal(h.libraryReveal.current.request, request); h.commit();
  const freshFrameId = h.libraryReveal.current.frame;
  oldFrame(); assert(!h.calls.includes('disclosure-focus')); assert.equal(h.libraryReveal.current.request, request);
  assert.equal(h.libraryReveal.current.frame, freshFrameId); assert.equal(h.frames.size, 1);
  h.flushFrame(); assert(h.calls.includes('disclosure-focus')); assert.equal(h.libraryReveal.current.request, null);
});

test('a committed view change consumes the old handoff so returning to the source cannot replay its focus', async () => {
  const h = libraryHarness(); await h.changeFolder('library-work', { fromLibrary: true }); h.commit();
  h.presentation.current.period = 'week'; h.commit(); assert.equal(h.libraryReveal.current.request, null);
  h.presentation.current.period = 'documents'; h.commit(); h.flushFrame();
  assert.equal(h.frames.size, 0); assert(!h.calls.includes('disclosure-focus')); assert(!h.calls.includes('reveal'));
  assert.equal(JSON.stringify(h.data), h.before);
});

function newDocumentHarness(options: { reject?: 'storage' | 'cas' | 'permission'; flush?: () => Promise<boolean>; locked?: boolean;
  flushSaves?: number; foreign?: 'before' | 'between' | 'after'; actorSwitch?: 'before' | 'after'; failSave?: boolean; preparing?: boolean; concurrentMove?: boolean; collections?: boolean } = {}) {
  const initial = createProgramData(), actorId = initial.activeActorId;
  const folder = createProgramFolder(initial, { actorId, requestId: 'new-document-folder-fixture', expectedSpace: initial.spaces[actorId], title: '선택한 보관 폴더' });
  assert(folder.ok);
  let data = folder.data;
  for (let index = 0; index < (options.flushSaves ?? 0); index++) {
    const doc = createProgramDocument(data, { actorId, requestId: `existing-flush-doc-${index}`, expectedSpace: data.spaces[actorId], title: `기존 문서 ${index}`, raw: `기존 메모 ${index}` });
    assert(doc.ok); data = doc.data;
  }
  const before = JSON.stringify(data), folderId = folder.result, expectedSpace = structuredClone(data.spaces[actorId]);
  if (options.reject === 'cas') expectedSpace.position.start++;
  const space = data.spaces[actorId], preparing = { current: !!options.preparing }, moveFlush = { current: null as { actorId: string; expected: typeof space; conflict: boolean } | null };
  const presentation = { folderId, selected: 'old-document', period: 'week', libraryOpen: true, opened: ['old-document'] };
  const calls: string[] = [], messages: string[] = [], inputLockCount = { current: options.locked ? 1 : 0 };
  let title = '새 빈 문서', writes = 0, localWrites = 0;
  let commit: (docId: string, next: typeof space.text, label: string, options: { expectedWorkspace: typeof space.text }) => Promise<boolean>;
  let move: () => Promise<{ ok: boolean }>;
  let fn: ts.FunctionDeclaration | undefined;
  const scan = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'newDocument') fn = node; ts.forEachChild(node, scan); };
  scan(ast); assert(fn);
  const code = ts.transpileModule(`const create = (${fn.getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const context = { createProgramDocument, folderId, collectionMode: options.collections ? {} : undefined, inputLockCount, preparing, moveFlush, formExpected: { current: expectedSpace }, space,
    actorId: options.reject === 'permission' ? 'missing-actor' : actorId, programId, programFailure, programClone, programResult, programSame, M,
    mergeProgramTextWorkspace, programPreservesLockedDocumentContent, programPreservesSeriesMetadata, programPreservesLegacyQualityHold, programPreservesLegacyPlanExcluded,
    positions: { current: {} }, setPreparingDocumentAction() {},
    FormData: class { get() { return title; } },
    lockInput: () => { inputLockCount.current++; calls.push('lock'); return () => { inputLockCount.current--; calls.push('release'); }; },
    flushAllEditors: async () => {
      calls.push('flush'); if (options.flush) return options.flush();
      if (options.concurrentMove) { const authority = moveFlush.current; assert.equal((await move()).ok, false); assert.equal(moveFlush.current, authority); }
      if (options.actorSwitch === 'before') data = { ...data, activeActorId: 'changed-actor' };
      for (let index = 0; index < (options.flushSaves ?? 0); index++) {
        if (options.foreign === 'before' && index === 0 || options.foreign === 'between' && index === 1) { data = programClone(data); data.spaces[actorId].position.scrollTop++; }
        const text = data.spaces[actorId].text, doc = text.documents[index];
        if (!await commit(doc.id, M.editText(text, doc.id, `${M.raw(doc)} 저장`), '문서 편집', { expectedWorkspace: text })) return false;
      }
      if (options.foreign === 'after') { data = programClone(data); data.spaces[actorId].position.scrollTop++; }
      if (options.actorSwitch === 'after') data = { ...data, activeActorId: 'changed-actor' };
      return true;
    },
    mutate: async (_label: string, build: (current: ProgramData) => ProgramTransition<string>) => {
      const result = build(data);
      if (options.failSave) return programFailure(data, 'conflict');
      if (result.ok) { data = result.data; localWrites++; } return result;
    },
    base: () => ({ actorId: options.reject === 'permission' ? 'missing-actor' : actorId, requestId: 'new-document-create-fixture', expectedSpace }),
    run: async (_label: string, build: (current: ProgramData) => ProgramTransition<string>) => {
      calls.push('run'); const result = options.reject === 'storage' ? programFailure(data, 'conflict') : build(data);
      if (result.ok) { data = result.data; writes++; } return result;
    },
    setMessage: (value: string) => messages.push(value),
    setLibraryOpen: (value: boolean) => { presentation.libraryOpen = value; },
    setSelected: (value: string) => { presentation.selected = value; },
    setOpened: (update: (value: string[]) => string[]) => { presentation.opened = update(presentation.opened); },
    setFolderId: (value: string) => { presentation.folderId = value; },
    setPeriod: (value: string) => { presentation.period = value; },
    props: { navigate: () => calls.push('navigate') },
  };
  function loadFunction(name: string) {
    let declaration: ts.FunctionDeclaration | undefined;
    const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node; ts.forEachChild(node, visit); };
    visit(ast); assert(declaration);
    const compiled = ts.transpileModule(`const action = (${declaration.getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    return new Function(...Object.keys(context), `${compiled}; return action;`)(...Object.values(context));
  }
  commit = loadFunction('editorCommit');
  move = loadFunction('moveTaskDocument');
  const create = new Function(...Object.keys(context), `${code}; return create;`)(...Object.values(context)) as (event: unknown) => Promise<void>;
  return { before, folderId, actorId, presentation, calls, messages, inputLockCount, preparing, moveFlush, data: () => data, writes: () => writes, localWrites: () => localWrites, title: () => title,
    create: () => create({ preventDefault: () => calls.push('prevent'), currentTarget: { reset: () => { title = ''; calls.push('reset'); } } }) };
}

test('creating a blank document preserves its selected storage folder and clears only the successful view filter', async () => {
  const h = newDocumentHarness(); await h.create();
  const doc = M.getDocument(h.data().spaces[h.actorId].text, h.presentation.selected)!;
  assert.equal(doc.folderId, h.folderId); assert.equal(doc.title, '새 빈 문서'); assert.equal(M.raw(doc), '');
  assert.equal(h.presentation.folderId, ''); assert.equal(h.presentation.period, 'documents'); assert.equal(h.presentation.libraryOpen, false);
  assert.deepEqual(h.presentation.opened, ['old-document', doc.id]); assert.equal(h.writes(), 1); assert.equal(h.inputLockCount.current, 0);
  assert.deepEqual(h.calls, ['prevent', 'lock', 'flush', 'run', 'reset', 'navigate', 'release']);
});

test('explicit collection mode creates an unfiled document without inheriting the selected legacy location', async () => {
  const h = newDocumentHarness({ collections: true }); await h.create();
  const doc = M.getDocument(h.data().spaces[h.actorId].text, h.presentation.selected)!;
  assert.equal(doc.folderId, 'folder-unfiled'); assert.equal(doc.title, '새 빈 문서'); assert.equal(M.raw(doc), '');
  assert.equal(h.writes(), 1); assert.equal(h.data().spaces[h.actorId].text.taskScopes[doc.id], undefined);
});

test('failed document creation retains folder view, selection and form through storage, CAS and authority rejection', async () => {
  for (const reject of ['storage', 'cas', 'permission'] as const) {
    const h = newDocumentHarness({ reject }), beforeView = structuredClone(h.presentation); await h.create();
    assert.deepEqual(h.presentation, beforeView, reject); assert.equal(JSON.stringify(h.data()), h.before, reject);
    assert.equal(h.title(), '새 빈 문서'); assert.equal(h.writes(), 0); assert.equal(h.inputLockCount.current, 0);
    assert.deepEqual(h.calls, ['prevent', 'lock', 'flush', 'run', 'release']);
  }
});

test('new document waits for existing composing or rejected region draft and never clears a failed flush', async () => {
  for (const composing of [true, false]) {
    const region = periodHarness(composing), h = newDocumentHarness({ flush: () => region.draft.flush() });
    const beforeView = structuredClone(h.presentation); await h.create();
    assert.deepEqual(h.presentation, beforeView); assert.equal(JSON.stringify(h.data()), h.before); assert.equal(h.writes(), 0);
    assert.equal(region.draft.getState().pending?.raw, region.input); assert(region.draft.hasPending());
    assert.equal(h.inputLockCount.current, 0); assert.deepEqual(h.calls, ['prevent', 'lock', 'flush', 'release']);
    assert.match(h.messages.at(-1)!, /작성 중인 입력을 저장하거나 취소/);
  }
});

test('new document respects the existing input lock without a create request or view transition', async () => {
  const h = newDocumentHarness({ locked: true }), beforeView = structuredClone(h.presentation); await h.create();
  assert.deepEqual(h.presentation, beforeView); assert.equal(h.writes(), 0); assert.equal(h.inputLockCount.current, 1);
  assert.deepEqual(h.calls, ['prevent']); assert.equal(h.title(), '새 빈 문서');
});

test('new document advances captured authority through one successful actual editor commit', async () => {
  const h = newDocumentHarness({ flushSaves: 1 }); await h.create();
  assert.equal(h.localWrites(), 1); assert.equal(h.writes(), 1);
  const docs = h.data().spaces[h.actorId].text.documents;
  assert.equal(docs.length, 2); assert.equal(M.raw(docs[0]), '기존 메모 0 저장');
  assert.equal(docs[1].folderId, h.folderId); assert.equal(h.presentation.folderId, '');
  assert.equal(h.moveFlush.current, null); assert.equal(h.preparing.current, false); assert.equal(h.inputLockCount.current, 0);
});

test('two own editor receipts advance in order and concurrent move cannot replace create authority', async () => {
  const h = newDocumentHarness({ flushSaves: 2, concurrentMove: true }); await h.create();
  assert.equal(h.localWrites(), 2); assert.equal(h.writes(), 1);
  const docs = h.data().spaces[h.actorId].text.documents;
  assert.equal(docs.length, 3); assert.equal(M.raw(docs[0]), '기존 메모 0 저장'); assert.equal(M.raw(docs[1]), '기존 메모 1 저장');
  assert.equal(h.presentation.selected, docs[2].id); assert.equal(h.moveFlush.current, null);
});

test('foreign private revisions before, between or after own flush receipts never authorize document creation', async () => {
  for (const foreign of ['before', 'between', 'after'] as const) {
    const h = newDocumentHarness({ flushSaves: 2, foreign }), beforeView = structuredClone(h.presentation); await h.create();
    assert.equal(h.writes(), 0, foreign); assert.deepEqual(h.presentation, beforeView, foreign); assert.equal(h.title(), '새 빈 문서');
    assert.equal(h.data().spaces[h.actorId].text.documents.length, 2); assert.equal(h.data().spaces[h.actorId].position.scrollTop, 1);
    assert.equal(h.moveFlush.current, null); assert.equal(h.preparing.current, false); assert.equal(h.inputLockCount.current, 0);
  }
});

test('actor switches before or after a local flush cannot create or clear the selected folder', async () => {
  for (const actorSwitch of ['before', 'after'] as const) {
    const h = newDocumentHarness({ flushSaves: 1, actorSwitch }), beforeView = structuredClone(h.presentation); await h.create();
    assert.equal(h.writes(), 0); assert.deepEqual(h.presentation, beforeView); assert.equal(h.title(), '새 빈 문서');
    assert.equal(h.localWrites(), actorSwitch === 'before' ? 0 : 1); assert.equal(h.moveFlush.current, null); assert.equal(h.preparing.current, false);
  }
});

test('a failed editor save cannot lend its proposed receipt authority to document creation', async () => {
  const h = newDocumentHarness({ flushSaves: 1, failSave: true }), beforeView = structuredClone(h.presentation); await h.create();
  assert.equal(h.localWrites(), 0); assert.equal(h.writes(), 0); assert.deepEqual(h.presentation, beforeView); assert.equal(JSON.stringify(h.data()), h.before);
  assert.equal(h.moveFlush.current, null); assert.equal(h.inputLockCount.current, 0); assert(!h.calls.includes('run'));
});

test('stale captured form intent is not upgraded by a later own editor save', async () => {
  const h = newDocumentHarness({ flushSaves: 1, reject: 'cas' }), beforeView = structuredClone(h.presentation); await h.create();
  assert.equal(h.localWrites(), 1); assert.equal(h.writes(), 0); assert.deepEqual(h.presentation, beforeView);
  assert.equal(h.data().spaces[h.actorId].text.documents.length, 1); assert(!h.calls.includes('run'));
});

test('already preparing move retains its authority when new document is requested', async () => {
  const h = newDocumentHarness({ preparing: true });
  const authority = { actorId: h.actorId, expected: h.data().spaces[h.actorId], conflict: false }; h.moveFlush.current = authority;
  await h.create(); assert.equal(h.moveFlush.current, authority); assert.equal(h.preparing.current, true); assert.equal(h.writes(), 0);
  assert.deepEqual(h.calls, ['prevent']);
});

function harness() {
  const data = createProgramData(), actorId = data.activeActorId, space = data.spaces[actorId];
  space.text = M.addDocument(space.text, { title: '원문 문서' });
  const id = space.text.documents[0].id;
  space.text = M.editText(space.text, id, '원래 메모\n- [ ] 같은 제목\n  - 메모: 지킬 내용');
  const taskId = M.tasks(space.text)[0].id;
  space.text = M.addDocument(space.text, { title: '다른 원문' });
  const otherId = space.text.documents[1].id;
  space.text = M.editText(space.text, otherId, '- [ ] 같은 제목');
  const before = JSON.stringify(data), calls: string[] = [], frames: (() => void)[] = [];
  const dirty = { current: {} as Record<string, boolean> }, inputLockCount = { current: 0 };
  const recurrencePorts = { current: {} as Record<string, { hasPendingInput: () => boolean }> };
  const positions = { current: {} as Record<string, ProgramWritingPosition> };
  const selectedRef = { current: id }, presentation = { current: { period: 'week', folderId: 'chosen-folder', query: '같은 제목' } };
  const documentsRef = { current: [...space.text.documents, ...space.text.flows] };
  const renderedLine = { offsetTop: 44, offsetHeight: 44 };
  const textarea = { value: M.raw(M.getDocument(space.text, id)), selectionStart: 0, selectionEnd: 0, scrollTop: 35, clientHeight: 390,
    readOnly: false,
    closest: () => ({ querySelectorAll: () => [null, renderedLine] }),
    getClientRects: () => [{}], focus: () => calls.push('focus'), scrollIntoView: () => calls.push('reveal'),
    setSelectionRange: (start: number, end: number) => { textarea.selectionStart = start; textarea.selectionEnd = end; } };
  const sourceFocusPorts = { current: { [id]: (target: { documentId: string; lineId: string; raw: string }) => {
    assert.deepEqual(target, { documentId: id, lineId: taskId, raw: textarea.value });
    textarea.focus(); return true;
  } } as Record<string, ((target: { documentId: string; lineId: string; raw: string }) => boolean) | null> };
  let reject = false, duringRun: (() => void) | undefined, contained = true;
  const context = { M, programFailure, programResult, normalizeProgramWritingPosition, actorId, selected: id,
    setTaskNotice: (value: unknown) => assert.equal(value, null),
    dirty, inputLockCount, recurrencePorts, positions, selectedRef, presentation, documentsRef, sourceFocusPorts,
    root: { current: { contains: (node: unknown) => contained && node === textarea } },
    document: { getElementById: (target: string) => target === `program-text-${encodeURIComponent(id)}` ? textarea : null },
    requestAnimationFrame: (frame: () => void) => frames.push(frame),
    setMessage: () => calls.push('message'),
    setFolderId: (value: string) => { presentation.current.folderId = value; },
    setSelected: (value: string) => { selectedRef.current = value; calls.push('select'); },
    setLibraryOpen: () => calls.push('library'), setOpened: () => calls.push('opened'),
    setPeriod: (value: string) => { presentation.current.period = value; calls.push('period'); },
    props: { navigate: () => calls.push('navigate') },
    run: async (_label: string, build: (current: ProgramData) => ProgramTransition<string>, history: boolean) => {
      calls.push('run'); assert.equal(history, false);
      const outcome = reject ? programFailure(data, 'conflict') : build(data);
      if (outcome.ok) assert.equal(outcome.data, data, 'view transition keeps the exact data object');
      duringRun?.(); return outcome;
    },
  };
  const open = new Function(...Object.keys(context), `${compiled}; return action;`)(...Object.values(context)) as (id: string, taskId?: string) => Promise<void>;
  return { data, id, taskId, otherId, before, calls, frames, dirty, inputLockCount, recurrencePorts, positions,
    selectedRef, presentation, textarea, renderedLine, sourceFocusPorts, open, reject: () => { reject = true; },
    duringRun: (callback: () => void) => { duringRun = callback; }, detach: () => { contained = false; },
    flush: () => { frames.splice(0).forEach(frame => frame()); } };
}

test('already-mounted editor clears folder scope before returning to the exact Item row and preserves data and query', async () => {
  const h = harness(); await h.open(h.id, h.taskId);
  assert.equal(h.textarea.selectionStart, 0); h.flush();
  assert.equal(h.textarea.selectionStart, '원래 메모\n'.length);
  assert.equal(h.textarea.selectionEnd, h.textarea.selectionStart);
  assert.deepEqual(h.calls.slice(-2), ['focus', 'reveal']);
  assert.equal(JSON.stringify(h.data), h.before);
  assert.equal(h.presentation.current.folderId, ''); assert.equal(h.presentation.current.query, '같은 제목');
});

test('missing row, wrong document and rejected authority never navigate or apply a selection', async () => {
  for (const reason of ['missing', 'wrong-document', 'rejected']) {
    const h = harness(); if (reason === 'rejected') h.reject();
    await h.open(reason === 'wrong-document' ? h.otherId : h.id, reason === 'missing' ? 'missing-row' : h.taskId);
    h.flush(); assert(!h.calls.includes('navigate')); assert(!h.calls.includes('focus'));
    assert.equal(JSON.stringify(h.data), h.before);
  }
});

test('dirty or composing editor, input lock and occurrence draft block source navigation before mutation', async () => {
  for (const reason of ['dirty-or-ime', 'locked', 'occurrence']) {
    const h = harness();
    if (reason === 'dirty-or-ime') h.dirty.current[h.id] = true;
    if (reason === 'locked') h.inputLockCount.current = 1;
    if (reason === 'occurrence') h.recurrencePorts.current.row = { hasPendingInput: () => true };
    await h.open(h.id, h.taskId); h.flush();
    assert.deepEqual(h.calls, ['message']); assert.equal(JSON.stringify(h.data), h.before);
  }
});

test('typing during the awaited authority check does not switch the current period or document', async () => {
  const h = harness(); h.duringRun(() => { h.dirty.current[h.id] = true; });
  await h.open(h.id, h.taskId); h.flush(); assert.deepEqual(h.calls, ['run']);
  assert.equal(h.presentation.current.period, 'week'); assert.equal(JSON.stringify(h.data), h.before);
});

test('deferred restore never steals newer input or a different selection, document or period', async () => {
  for (const reason of ['dirty', 'raw', 'selected', 'period', 'position', 'detached', 'readonly', 'missing-port', 'rejected-port']) {
    const h = harness(); await h.open(h.id, h.taskId);
    if (reason === 'dirty') h.dirty.current[h.id] = true;
    if (reason === 'raw') h.textarea.value += '\n새 입력';
    if (reason === 'selected') h.selectedRef.current = h.otherId;
    if (reason === 'period') h.presentation.current.period = 'month';
    if (reason === 'position') h.positions.current[h.id] = { ...h.positions.current[h.id], start: 0 };
    if (reason === 'detached') h.detach();
    if (reason === 'readonly') h.textarea.readOnly = true;
    if (reason === 'missing-port') h.sourceFocusPorts.current[h.id] = null;
    if (reason === 'rejected-port') h.sourceFocusPorts.current[h.id] = () => false;
    h.flush(); assert(!h.calls.includes('focus'), reason); assert.equal(h.textarea.selectionStart, 0);
    assert.equal(JSON.stringify(h.data), h.before);
  }
});

test('ordinary document opening keeps its existing path without forcing a row selection', async () => {
  const h = harness(); await h.open(h.id); h.flush();
  assert(h.calls.includes('navigate')); assert.equal(h.frames.length, 0); assert(!h.calls.includes('focus'));
  assert.equal(JSON.stringify(h.data), h.before);
});

test('source return uses spare viewport height for preceding context without losing the exact target', async () => {
  const h = harness(); h.renderedLine.offsetTop = 1200;
  await h.open(h.id, h.taskId); h.flush();
  assert.equal(h.textarea.scrollTop, 898); assert.equal(JSON.stringify(h.data), h.before);
});

test('a target taller than the viewport starts at the exact row and keeps its original caret', async () => {
  const h = harness(); h.renderedLine.offsetTop = 1200; h.renderedLine.offsetHeight = 500;
  await h.open(h.id, h.taskId); h.flush();
  assert.equal(h.textarea.scrollTop, 1200); assert.equal(h.textarea.selectionStart, '원래 메모\n'.length);
  assert.equal(JSON.stringify(h.data), h.before);
});
