import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as ts from 'typescript';
import { announcedRecoveries, recoveryDraftIdentity } from './saved-input-notice';

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
// The shell's count with one stored draft, as captureInput leaves it while the editor saves.
function count(state: { parked: typeof typed[]; active: typeof typed[]; atRisk: boolean }) {
  return evaluate<number>(declaration('savedTotal'), {
    recoveries: { drafts: [typed] }, structuralRecoveries: null, creatorRecoveries: null, socialRecoveries: null,
    parkedDrafts: { current: state.parked }, activeDrafts: { current: state.active }, parkedStructural: { current: [] }, activeStructural: { current: [] },
    parkedCreator: { current: [] }, activeCreator: { current: null }, parkedSocial: { current: [] }, activeSocial: { current: [] },
    inputAtRisk: state.atRisk, announcedRecoveries, recoveryDraftIdentity,
  });
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
  const total = declaration('savedTotal');
  for (const kind of ['recoveries?.drafts, parkedDrafts.current, activeDrafts.current', 'structuralRecoveries?.entries, parkedStructural.current, activeStructural.current',
    'creatorRecoveries?.entries, parkedCreator.current, activeCreator.current ? [activeCreator.current] : []', 'socialRecoveries?.entries, parkedSocial.current, activeSocial.current'])
    assert(total.includes(`announcedRecoveries(${kind}, inputAtRisk`), kind);
  const risk = declaration('inputAtRisk');
  for (const part of ['needsInputProtection', 'unavailable', 'saveFailed', "'signed-out'", "'recovery-required'", "'checking-result'"]) assert(risk.includes(part), part);
  // A failed mutation marks it until the next one succeeds; storage of the input itself is unchanged.
  assert.match(source, /if \(!outcome\.ok\) \{\s+if \(outcome\.reason !== 'busy'\) setSaveFailed\(true\);/);
  assert.match(source, /else \{\s+setSaveFailed\(false\);/);
  assert.match(source, /onInput=\{\(\) => \{ queueMicrotask\(captureInput\); \}\}/);
});

// Codex review F2: the 복구함 is not the notice. It lists and counts everything stored, while only the
// notice and badges leave out input that is being saved normally, under a label of their own.
test('the 복구함 lists and counts every stored entry even while the notice counts none', () => {
  const scope = { recoveries: { drafts: [typed] }, structuralRecoveries: null, creatorRecoveries: { entries: [{ id: 'c' }] }, socialRecoveries: null };
  assert.equal(evaluate<number>(declaration('storedTotal'), scope), 2);
  assert.equal(count({ parked: [], active: [typed], atRisk: false }), 0);
  assert(source.includes("<summary>복구함{storedTotal ? ` (${storedTotal})` : ''}</summary>"));
  assert(source.includes('{storedTotal ? <>{savedInputPanel}{structuralRecoveryPanel}{creatorRecoveryPanel}{socialRecoveryPanel}</> : <p>보관한 입력이 없습니다.</p>}'));
  assert(source.includes('open={!!storedTotal && (unavailable || external'));
  // The notice and the 더보기 badge name use their own label, so two different numbers never share "보관한 입력".
  assert(source.includes('<span>확인이 필요한 입력 {savedTotal}개</span>'));
  assert(!/보관한 입력 \$?\{savedTotal\}/.test(source));
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
  const mergeRecoveryDrafts = evaluate<(parked: typeof typed[], active: typeof typed[]) => typeof typed[]>(functionText('mergeRecoveryDrafts'), {});
  const mergeStructuralRecoveryEntries = (parked: unknown[], active: unknown[]) => [...parked, ...active];
  const refs = { parkedDrafts: { current: [] as typeof typed[] }, activeDrafts: { current: [refused] }, parkedStructural: { current: [] }, activeStructural: { current: [] },
    parkedCreator: { current: [] }, activeCreator: { current: null }, parkedSocial: { current: [] }, activeSocial: { current: [] } };
  const notice = (active: typeof typed[], atRisk: boolean) => announcedRecoveries([refused], refs.parkedDrafts.current, active, atRisk, recoveryDraftIdentity);
  assert.equal(notice([refused], true), 1, 'announced while the editor reports the refusal');
  assert.equal(notice([refused], false), 0, 'before: once the editor is gone the stale capture looks like normal saving');

  const calls: string[] = [];
  const parkEditorInput = evaluate<() => void>(functionText('parkEditorInput'), { ...refs, mergeRecoveryDrafts, mergeStructuralRecoveryEntries, canonicalJson: JSON.stringify });
  const replaceEditors = evaluate<() => void>(functionText('replaceEditors'), {
    captureInput: () => { calls.push('capture'); return true; }, parkEditorInput: () => { calls.push('park'); parkEditorInput(); },
    setPresentation: () => { calls.push('remount'); } });
  replaceEditors();
  assert.deepEqual(calls, ['capture', 'park', 'remount'], 'captured from the old editors, parked, then rebuilt');
  assert.equal(notice([refused], false), 1, 'still announced after the unmount clears the refusal');
  assert.equal(notice([other], false), 1, 'and after the new editors capture other input');
  assert.deepEqual(mergeRecoveryDrafts(refs.parkedDrafts.current, [other]), [refused, other], 'the next capture keeps it in the 복구함');

  // Every rebuild of the presentation-keyed editors parks first: replaceEditors, or openLatest's own hand-off.
  assert.equal(source.match(/setPresentation\(/g)?.length, 2);
  for (const name of ['restoreCreator', 'restoreStructuralDraft']) assert(functionText(name).includes('replaceEditors();'), name);
  assert(source.includes('await controller.current?.refresh(); replaceEditors();'), 'after a preservation save');
  const openLatest = functionText('openLatest');
  assert(openLatest.indexOf('parkEditorInput();') > 0 && openLatest.indexOf('parkEditorInput();') < openLatest.indexOf('setPresentation('));
  // It leaves only when it is resolved: a save whose confirmed text matches every stored draft, or the user clears.
  assert.match(functionText('clearDrafts'), /parkedDrafts\.current = \[\]/);
  assert.match(source, /saved\.value\.drafts\.every\(draft => draft\.documentId\s+&& !!M\.getDocument\(confirmed\.space\.text, draft\.documentId\)\s+&& M\.raw\(M\.getDocument\(confirmed\.space\.text, draft\.documentId\)\) === draft\.raw\)\) \{\s+const cleared = uiRecovery\.current\?\.clear\(saved\.value\);\s+if \(cleared\?\.ok\) \{ parkedDrafts\.current = \[\]; activeDrafts\.current = \[\]; setRecoveries\(null\); \}/);
});
