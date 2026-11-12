import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as ts from 'typescript';
import { announcedRecoveries, announcedRecoveryEntries, recoveryDraftIdentity, recoveryEntryTag } from './saved-input-notice';
import * as documentRecovery from './alpha-ui-recovery-document';
import type { AlphaUiDraft } from './alpha-ui-recovery';

// Every keystroke captures the editor's input to the tab (kept as before). R8a counted that capture,
// so ordinary typing showed "보관한 입력 1개" from the first key until the save cleared it.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/AlphaWorkspace.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('AlphaWorkspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function declaration(name: string) {
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === name) found.push(node.initializer!.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1, name);
  return found[0];
}
function functionText(name: string) {
  const found: string[] = [];
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.getText(tree) === name) found.push(node.getText(tree)); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1, name);
  return found[0];
}
function evaluate<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}
const typed = { documentId: 'doc', title: '작성 중 문서', raw: '첫 줄\n쓰는 중' };
// The shell's count with one stored draft, as captureInput leaves it while the editor saves. Core3 P1 (11/8): the
// four kinds are each the announced entries (kept by identity for the one-time toast); the total is their sum.
function count(state: { parked: typeof typed[]; active: typeof typed[]; atRisk: boolean }) {
  const scope = {
    recoveries: { drafts: [typed] }, structuralRecoveries: null, creatorRecoveries: null, socialRecoveries: null,
    ...documentRecovery, recoveryDocuments: { current: { loaded: [], parked: state.parked, active: state.active } },
    parkedStructural: { current: [] }, activeStructural: { current: [] },
    parkedCreator: { current: [] }, activeCreator: { current: null }, parkedSocial: { current: [] }, activeSocial: { current: [] },
    inputAtRisk: state.atRisk, announcedRecoveryEntries, recoveryDraftIdentity,
  };
  const kinds = Object.fromEntries(['announcedDrafts', 'announcedStructural', 'announcedCreator', 'announcedSocial'].map(name => [name, evaluate<unknown[]>(declaration(name), scope)]));
  return evaluate<number>(declaration('savedTotal'), kinds);
}

test('typing that is being saved normally announces no saved input', () => {
  assert.equal(count({ parked: [], active: [typed], atRisk: false }), 0);
});

test('saved input left behind, or input at risk, is announced as before', () => {
  assert.equal(count({ parked: [typed], active: [], atRisk: false }), 1, 'parked on a context change or found on opening');
  assert.equal(count({ parked: [typed], active: [typed], atRisk: false }), 1, 'parked and still open');
  assert.equal(count({ parked: [], active: [typed], atRisk: true }), 1, 'protection, a refused or unknown save, an ended session');
  assert.equal(count({ parked: [], active: [], atRisk: false }), 1, 'stored before this page captured anything');
});

test('the count rule for each kind of saved input', () => {
  const a = { id: 'a' }, b = { id: 'b' };
  assert.equal(announcedRecoveries([a, b], [], [a, b], false), 0);
  assert.equal(announcedRecoveries([a, b], [b], [a, b], false), 1);
  assert.equal(announcedRecoveries([a, b], [], [a], false), 1);
  assert.equal(announcedRecoveries([a, b], [], [a, b], true), 2);
  assert.equal(announcedRecoveries(undefined, [], [], true), 0);
});

test('the shell counts all four kinds this way and marks input at risk from protection, failure and session state', () => {
  const total = ['announcedDrafts', 'announcedStructural', 'announcedCreator', 'announcedSocial'].map(declaration).join('\n');
  for (const kind of ['recoveries?.drafts, parkedAlphaUiRecoveryDocuments(recoveryDocuments.current), recoveryDocuments.current.active', 'structuralRecoveries?.entries, parkedStructural.current, activeStructural.current',
    'creatorRecoveries?.entries, parkedCreator.current, activeCreator.current ? [activeCreator.current] : []', 'socialRecoveries?.entries, parkedSocial.current, activeSocial.current'])
    assert(total.includes(`announcedRecoveryEntries(${kind}, inputAtRisk`), kind);
  assert.equal(declaration('savedTotal'), 'announcedDrafts.length + announcedStructural.length + announcedCreator.length + announcedSocial.length');
  const risk = declaration('inputAtRisk');
  for (const part of ['needsInputProtection', 'unavailable', 'saveFailed', "'signed-out'", "'recovery-required'", "'checking-result'"]) assert(risk.includes(part), part);
  // A failed mutation marks it until the next one succeeds; storage of the input itself is unchanged.
  assert.match(source, /if \(!outcome\.ok\) \{\s+if \(outcome\.reason !== 'busy'\) setSaveFailed\(true\);/);
  assert.match(source, /else \{\s+setSaveFailed\(false\);/);
  assert.match(source, /onInput=\{event => \{ queueMicrotask\(captureInput\);/);
});

// Codex review F2: the 복구함 is not the notice. It lists and counts everything stored, while only the
// notice and badges leave out input that is being saved normally, under a label of their own.
test('the 복구함 lists and counts every stored entry even while the notice counts none', () => {
  const scope = { recoveries: { drafts: [typed] }, structuralRecoveries: null, creatorRecoveries: { entries: [{ id: 'c' }] }, socialRecoveries: null };
  assert.equal(evaluate<number>(declaration('storedTotal'), scope), 2);
  assert.equal(count({ parked: [], active: [typed], atRisk: false }), 0);
  // UX B3 (11/7): 복구함 is a sheet; its title and every button that opens it carry the same count.
  assert(source.includes('<h2 id="alpha-recovery-heading">복구함{storedTotal ? ` (${storedTotal})` : \'\'}</h2>'));
  assert(source.includes("onClick={event => openRecoveryBox(event.currentTarget)}>복구함{storedTotal ? ` (${storedTotal})` : ''}</button>"));
  // N9: an empty 복구함 also points to the archived documents (보관함), when there are any.
  assert(source.includes('{storedTotal ? <>{savedInputPanel}{structuralRecoveryPanel}{creatorRecoveryPanel}{socialRecoveryPanel}</> : <><p>보관한 입력이 없습니다.</p>'));
  // It never opens by itself (a conflict while typing must not take the focus); the notice, the menu and 나 open it.
  assert(!source.includes('open={!!storedTotal'));
  // The badge names use their own label, so two different numbers never share "보관한 입력"; the toast counts the new ones.
  assert(source.includes("aria-label={`나${savedTotal ? ` · 확인이 필요한 입력 ${savedTotal}개` : ''}`}"));
  assert(source.includes('<p>{programRecoveryToastText(recoveryToastCount)}</p>'));
  assert(!/보관한 입력 \$?\{savedTotal\}/.test(source));
});

test('only current held draft toast tags go quiet; an already shown other-document toast stays visible', () => {
  const held = { ...typed, raw: '합성 보류 줄' }, other = { ...typed, documentId: 'other-document', raw: '합성 다른 문서 입력' };
  const recoveryDocuments = { current: documentRecovery.captureAlphaUiRecoveryDocuments(documentRecovery.createAlphaUiRecoveryDocuments(), [held, other]) };
  const toastDrafts = evaluate<AlphaUiDraft[]>(declaration('toastDrafts'), { ...documentRecovery, recoveryDocuments,
    announcedDrafts: [held, other], allEditors: () => [{ captureHeldDrafts: () => [held] }] });
  assert.deepEqual(toastDrafts, [other]);
  const tags = evaluate<(atRisk: boolean) => string[]>(declaration('recoveryTags'), { toastDrafts,
    recoveries: { drafts: [held, other] }, structuralRecoveries: null, creatorRecoveries: null, socialRecoveries: null,
    announcedStructural: [], announcedCreator: [], announcedSocial: [], recoveryEntryTag, recoveryDraftIdentity, canonicalJson: JSON.stringify });
  const recoveryToast = { count: 2, at: 0, tags: tags(true) };
  assert.equal(tags(true).length, 2, 'stored recovery identities are still retained for acknowledgement bookkeeping');
  assert.equal(evaluate<number>(declaration('recoveryToastCount'), { recoveryToast, announcedTags: tags(false) }), 1);
  assert.equal(evaluate<number>(declaration('recoveryToastCount'), { recoveryToast, announcedTags: [] }), 0);
  assert.equal(recoveryDocuments.current.active.length, 2, 'presentation never removes or protects less input');
});

// Codex review F1: an editor can refuse input locally and keep it without any mutation, so saveFailed
// never turns on. That refusal must reach the shell's risk test.
test('a local refusal in a document editor counts the kept input as at risk', async () => {
  const { createProgramTextDraft } = await import('./program-text-draft');
  const { textWorkspaceModel: M } = await import('./text-workspace');
  let workspace = M.addDocument({ version: 11, documents: [], folders: [{ id: 'folder-unfiled', title: '미분류', parentId: null }], flows: [], bindings: [], taskScopes: {}, itemScopes: {}, progressRecords: [] } as never, { title: '거절 확인' });
  const docId = M.getDocument(workspace, workspace.documents[0].id)!.id;
  workspace = M.editText(workspace, docId, '- /회의\n  - [ ] 안건', { folderText: true });
  const draft = createProgramTextDraft(workspace, docId, async () => true, () => {});
  // Clearing a folder name leaves "- /": the model refuses it and the draft keeps the raw.
  assert.equal(draft.updateRaw('- /\n  - [ ] 안건'), false);
  const state = draft.getState();
  const editor = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  const failed = editor.match(/const inputFailed = ([^;]+);/)![1];
  assert.equal(evaluate<boolean>(failed, { draft: state }), true, 'the editor reports this state as failed');
  assert.match(editor, /useEffect\(\(\) => \{ propsRef\.current\.onInputFailureChange\?\.\(inputFailed\); \}, \[inputFailed\]\);/);
  assert.match(editor, /useEffect\(\(\) => \(\) => propsRef\.current\.onInputFailureChange\?\.\(false\), \[\]\);/);
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  assert(space.includes('onInputFailureChange={failed => inputFailureChanged(id, failed)}'));
  assert(space.includes('props.onInputFailureChange?.(Object.values(inputFailures.current).some(Boolean));'));
  assert(source.includes('onInputFailureChange={setEditorInputFailed}'));
  const risk = declaration('inputAtRisk');
  const atRisk = evaluate<boolean>(risk, { needsInputProtection: false, unavailable: false, saveFailed: false, editorInputFailed: true, snapshot: { status: 'ready' } });
  assert.equal(atRisk, true);
  assert.equal(count({ parked: [], active: [typed], atRisk }), 1, 'the kept input is announced');
  // Once the input saves or is reverted the editor reports false and normal typing is quiet again.
  assert.equal(evaluate<boolean>(failed, { draft: { invalid: false, error: '' } }), false);
});

// Codex re-review P2: '제작 작업본으로 복구' rebuilt the editors while a document still held input it had
// refused. The old editor's unmount cleared the refusal, and its input stayed only as a stale live capture,
// so the notice dropped it and the next capture of any other input dropped it from the 복구함 too.
test('input an editor refused stays stored and announced after the editors are replaced', () => {
  const refused = { documentId: 'doc', title: '작성 중 문서', raw: '- /\n  - [ ] 안건' };
  const other = { documentId: 'doc-2', title: '다른 문서', raw: '새 글' };
  const mergeStructuralRecoveryEntries = (parked: unknown[], active: unknown[]) => [...parked, ...active];
  const refs = { recoveryDocuments: { current: documentRecovery.captureAlphaUiRecoveryDocuments(documentRecovery.createAlphaUiRecoveryDocuments(), [refused]) },
    parkedStructural: { current: [] }, activeStructural: { current: [] },
    parkedCreator: { current: [] }, activeCreator: { current: null }, parkedSocial: { current: [] }, activeSocial: { current: [] } };
  const notice = (active: typeof typed[], atRisk: boolean) => announcedRecoveries<AlphaUiDraft>([refused], documentRecovery.parkedAlphaUiRecoveryDocuments(refs.recoveryDocuments.current), active, atRisk, recoveryDraftIdentity);
  assert.equal(notice([refused], true), 1, 'announced while the editor reports the refusal');
  assert.equal(notice([refused], false), 0, 'before: once the editor is gone the stale capture looks like normal saving');

  const calls: string[] = [];
  const parkEditorInput = evaluate<() => void>(functionText('parkEditorInput'), { ...refs, ...documentRecovery, mergeStructuralRecoveryEntries, canonicalJson: JSON.stringify });
  const replaceEditors = evaluate<() => boolean>(functionText('replaceEditors'), {
    captureInput: () => { calls.push('capture'); return true; }, canReleaseInput: () => { calls.push('release'); return true; },
    parkEditorInput: () => { calls.push('park'); parkEditorInput(); }, setPresentation: () => { calls.push('remount'); } });
  assert.equal(replaceEditors(), true);
  assert.deepEqual(calls, ['capture', 'release', 'park', 'remount'], 'captured from the old editors, parked, then rebuilt');
  assert.equal(notice([refused], false), 1, 'still announced after the unmount clears the refusal');
  assert.equal(notice([other], false), 1, 'and after the new editors capture other input');
  const next = documentRecovery.captureAlphaUiRecoveryDocuments(refs.recoveryDocuments.current, [other]);
  assert.deepEqual(documentRecovery.alphaUiRecoveryDocumentDrafts(next), [refused, other], 'the next capture keeps it in the 복구함');

  // Every rebuild of the presentation-keyed editors parks first: replaceEditors, or openLatest's own hand-off.
  assert.equal(source.match(/setPresentation\(/g)?.length, 2);
  for (const name of ['restoreCreator', 'restoreStructuralDraft']) assert(functionText(name).includes('replaceEditors()'), name);
  assert(source.includes('await controller.current?.refresh(); if (!replaceEditors())'), 'after a preservation save');
  const openLatest = functionText('openLatest');
  assert(openLatest.indexOf('parkEditorInput();') > 0 && openLatest.indexOf('parkEditorInput();') < openLatest.indexOf('setPresentation('));
  // A5: each exact confirmed document/raw leaves individually; another document's input stays.
  // 총괄 11/12: clearDrafts discards through discardDrafts (after '최신 내용 열기' when a refused command is held).
  assert.match(functionText('discardDrafts'), /recoveryDocuments\.current = createAlphaUiRecoveryDocuments\(\)/);
  assert(source.includes('if (confirmed) clearConfirmedDocumentInput(confirmed.space.text);'));
  refs.recoveryDocuments.current = next;
  let stored = { drafts: [refused, other] };
  const clear = evaluate<(text: Record<string, typeof refused>) => void>(functionText('clearConfirmedDocumentInput'), {
    ...refs, ...documentRecovery,
    uiRecovery: { current: { read: () => ({ ok: true, value: stored }), save: (drafts: typeof typed[]) => { stored = { drafts }; return { ok: true }; } } },
    M: { getDocument: (text: Record<string, typeof refused>, id: string) => text[id], raw: (doc: typeof refused) => doc.raw },
    setStorageError: () => assert.fail('confirmed partial cleanup must persist'), setRecoveries: () => {},
  });
  clear({ doc: refused });
  assert.deepEqual(stored.drafts, [other]);
  assert.deepEqual(documentRecovery.alphaUiRecoveryDocumentDrafts(refs.recoveryDocuments.current), [other]);
});

// Codex re-review of 4a6d8e54 (P1): the swap ignored a failed last capture. With 100,001 characters typed
// while a restore was in flight, the tab's recovery refused the input and the rebuild still replaced the
// editor, so the new input was neither on screen nor stored. A failed hand-off now keeps the editors.
test('a failed last capture keeps the editors, on every rebuild path, and says what the server already did', async () => {
  for (const failing of ['capture', 'release']) {
    const calls: string[] = [];
    const replaceEditors = evaluate<() => boolean>(functionText('replaceEditors'), {
      captureInput: () => { calls.push('capture'); return failing !== 'capture'; },
      canReleaseInput: () => { calls.push('release'); return failing !== 'release'; },
      parkEditorInput: () => { calls.push('park'); }, setPresentation: () => { calls.push('remount'); } });
    assert.equal(replaceEditors(), false, failing);
    assert(!calls.includes('park') && !calls.includes('remount'), `${failing}: nothing parked, editors not rebuilt`);
  }
  const keptEditorsNotice = evaluate<(done: string) => string>(declaration('keptEditorsNotice'), {});
  const run = async (name: string, swapped: boolean, scope: Record<string, unknown>, ...args: unknown[]) => {
    const seen: { message: string[]; destination: unknown[]; other: string[] } = { message: [], destination: [], other: [] };
    const restore = evaluate<(...args: unknown[]) => Promise<void>>(functionText(name), { ...scope, keptEditorsNotice, replaceEditors: () => swapped,
      setMessage: (m: string) => seen.message.push(m), setDestination: (d: unknown) => seen.destination.push(d),
      setCreatorSeen: () => seen.other.push('seen'), setCreatorSelection: () => seen.other.push('selection'), detached: structuredClone });
    await restore(...args);
    return seen;
  };
  // 제작 작업본 복구: the server step succeeds, the hand-off fails.
  const creator = { creatorRecoveries: { entries: [{ working: { draftId: 'creator-draft-a' }, auxiliaries: [] }] }, session: { userId: 'u' },
    setProgramCreatorWorking: () => ({}), mutate: async () => ({ ok: true }) };
  let seen = await run('restoreCreator', false, creator, 0);
  assert.deepEqual(seen.destination, [], 'stays on the current screen');
  assert.deepEqual(seen.other, []);
  assert.equal(seen.message.at(-1), keptEditorsNotice('제작 작업본은 서버에 복구했습니다.'));
  seen = await run('restoreCreator', true, creator, 0);
  assert.deepEqual(seen.destination, [{ view: 'creator', id: 'creator-draft-a' }]);
  // 보관한 복사 작업 복구: the same rule.
  const live = { ownerId: 'u', busy: false, pending: null, draft: null, status: 'ready', envelope: { data: { activeActorId: 'u' } },
    account: { ownerId: 'u', revision: 3, source: { actorId: 'u' }, space: { text: {} } } };
  const store = { snapshot: () => live }, ref = <T,>(current: T) => ({ current });
  const structural = { structuralRecoveries: { ownerId: 'u', entries: [{ documentId: 'doc', baseRevision: 3 }] }, session: { userId: 'u' },
    controller: ref(store), sessionEpochRef: ref(1), disposed: ref(false), currentOwnerRef: ref('u'), storageErrorRef: ref(false),
    externalRef: ref(false), preservationRef: ref(false), modalRef: ref(false), hasInput: () => false, clearConfirmedStructuralInput: () => {},
    resolveAlphaStructuralRecovery: () => ({ status: 'ready', workspace: {} }), mutate: async () => ({ ok: true, result: 'doc' }) };
  seen = await run('restoreStructuralDraft', false, structural, 0);
  assert.deepEqual(seen.destination, []);
  assert.equal(seen.message.at(-1), keptEditorsNotice('보관한 문서·폴더와 행은 서버에 복구했습니다.'));
  seen = await run('restoreStructuralDraft', true, structural, 0);
  assert.deepEqual(seen.destination, [{ view: 'space', id: 'doc' }]);
  // After a preservation save: the screen stays and the notice says the server step is done.
  assert(source.includes("await controller.current?.refresh(); if (!replaceEditors()) setMessage(keptEditorsNotice('서버 자료는 반영했습니다.'));"));
  assert.match(keptEditorsNotice('X.'), /^X\. 지금 입력을 이 탭에 안전하게 보관하지 못해 화면은 그대로 두었습니다/);
});

// N7 review (11/2): a folder name refused because another document uses the folder was put back on its line and
// left only in the notice; closed, it was gone. The editor hands it to the shell, which parks it at once.
test('N7: input an editor refused and put back is parked at once, stored, announced, and kept until cleared', () => {
  const refusedName = { title: '‘Original’ 폴더 줄에 쓴 이름', raw: '- /NewTitle' };
  const stored: unknown[] = [], shown: unknown[] = []; let storageError = false;
  const refs = { recoveryDocuments: { current: documentRecovery.captureAlphaUiRecoveryDocuments(documentRecovery.createAlphaUiRecoveryDocuments(), [typed]) } };
  const keep = (ok: boolean) => evaluate<(draft: typeof refusedName) => boolean>(functionText('keepRefusedInput'), { ...refs, ...documentRecovery,
    uiRecovery: { current: { save: (drafts: unknown[]) => { stored.push(drafts); return ok ? { ok: true, value: { drafts } } : { ok: false }; } } },
    setStorageError: () => { storageError = true; }, setRecoveries: (value: unknown) => shown.push(value) });
  assert.equal(keep(true)(refusedName as typeof typed), true);
  assert.deepEqual(documentRecovery.parkedAlphaUiRecoveryDocuments(refs.recoveryDocuments.current), [refusedName]);
  assert.deepEqual(stored.at(-1), [refusedName, typed], 'stored with the live capture');
  assert.equal(shown.length, 1); assert.equal(storageError, false);
  const announced = announcedRecoveries<AlphaUiDraft>([refusedName, typed], documentRecovery.parkedAlphaUiRecoveryDocuments(refs.recoveryDocuments.current), [typed], false, recoveryDraftIdentity);
  assert.equal(announced, 1, 'announced although nothing else is at risk');
  assert.deepEqual(documentRecovery.alphaUiRecoveryDocumentDrafts(documentRecovery.captureAlphaUiRecoveryDocuments(refs.recoveryDocuments.current, [typed])), [refusedName, typed], 'the next capture keeps it');
  // N7 review 4: storage that fails says so, parks nothing, and tells the editor (which then keeps the line as typed).
  refs.recoveryDocuments.current = documentRecovery.captureAlphaUiRecoveryDocuments(documentRecovery.createAlphaUiRecoveryDocuments(), [typed]);
  const before = refs.recoveryDocuments.current;
  assert.equal(keep(false)(refusedName as typeof typed), false); assert.equal(storageError, true);
  assert.equal(refs.recoveryDocuments.current, before, 'failed storage does not adopt proposed refs');
  assert.deepEqual(documentRecovery.parkedAlphaUiRecoveryDocuments(refs.recoveryDocuments.current), []);
  assert(source.includes('onInputFailureChange={setEditorInputFailed} onKeepRefusedInput={keepRefusedInput}'));
  const space = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  assert(space.includes('onInputFailureChange={failed => inputFailureChanged(id, failed)} onKeepRefusedInput={props.onKeepRefusedInput}'));
});
