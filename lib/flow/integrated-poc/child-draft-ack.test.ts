import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { childDraftRecoveryEntries, type ProgramChildDraft } from './child-draft-recovery';
import { programInputBoundaryCurrent, readProgramInputBoundary, type ProgramEditorFlush } from './document-action';
import { createEmptyTextWorkspace, textWorkspaceModel as M } from './text-workspace';
import { createProgramDocumentInput } from './program-document-input';
import { createProgramTextDraft, type ProgramTextDraftState } from './program-text-draft';

// Run the actual expressions from the components against controlled ports. They do not
// replay the sync controller or React; they pin the inputs each decision reads.
function expression(file: string, find: (node: ts.Node, tree: ts.SourceFile) => ts.Expression | undefined): string {
  const source = readFileSync(new URL(`../../../components/flow/integrated-poc/${file}`, import.meta.url), 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: ts.Expression[] = [];
  const visit = (node: ts.Node) => { const hit = find(node, tree); if (hit) found.push(hit); ts.forEachChild(node, visit); };
  visit(tree);
  assert.equal(found.length, 1, file);
  return ts.transpileModule(`(${found[0].getText(tree)})`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}
function evaluate<T>(code: string, scope: Record<string, unknown>): T {
  return new Function(...Object.keys(scope), `return ${code}`)(...Object.values(scope)) as T;
}
const variable = (name: string, inside?: string) => (node: ts.Node, tree: ts.SourceFile) =>
  ts.isVariableDeclaration(node) && node.name.getText(tree) === name && node.initializer
    && (!inside || ts.findAncestor(node, a => ts.isFunctionDeclaration(a) && a.name?.text === inside)) ? node.initializer : undefined;
const property = (name: string) => (node: ts.Node, tree: ts.SourceFile) => {
  if (!ts.isPropertyAssignment(node) || node.name.getText(tree) !== name) return undefined;
  const call = ts.findAncestor(node, ts.isCallExpression);
  return call?.expression.getText(tree) === 'props.onRegisterEditors' ? node.initializer : undefined;
};

/** ProgramSpace's registered draft readers for one dirty document and one closed child panel draft. */
function spacePort(options: { recurrenceDraft?: boolean; bodyPending?: boolean } = {}): Pick<ProgramEditorFlush, 'captureDrafts' | 'captureRecoveryDrafts'> {
  const child: ProgramChildDraft = { kind: 'task', parentTitle: '주말 장보기', text: '우유 사기' };
  const scope = {
    dirty: { current: { doc: true } },
    documentsRef: { current: [{ id: 'doc', title: '장보기 문서' }] },
    draftReaders: { current: { doc: () => '- [ ] A\n- [ ] B' } },
    recurrencePorts: { current: options.recurrenceDraft ? { r: { captureDrafts: () => [{ title: '회차 날짜 변경 초안', raw: '{}' }] } } : {} },
    childDraftReaders: { current: { doc: () => [child] } },
    bodyPendingReaders: { current: options.bodyPending === undefined ? {} : { doc: () => options.bodyPending } },
    childDraftRecoveryEntries,
  };
  return {
    captureDrafts: evaluate(expression('ProgramSpace.tsx', property('captureDrafts')), scope),
    captureRecoveryDrafts: evaluate(expression('ProgramSpace.tsx', property('captureRecoveryDrafts')), scope),
  };
}
function claimedDocument(port: ProgramEditorFlush, others: ProgramEditorFlush[] = []): string | null {
  const editors = { current: port };
  const claim = evaluate<() => string | null>(expression('AlphaWorkspace.tsx', variable('pendingPrivateDocument')), {
    privateTextPort: port, editors, currentData: { current: {} }, next: { envelope: { data: {} } },
    discoveryStateRef: { current: {} }, programDiscoveryHasUnstoredInput: () => false, allEditors: () => [port, ...others],
  });
  return claim();
}
const pendingDoc = (drafts: Pick<ProgramEditorFlush, 'captureDrafts' | 'captureRecoveryDrafts'>): ProgramEditorFlush => ({
  flushAll: async () => true, lockInput: () => () => {}, hasPendingInput: () => true, pendingDocumentIds: () => ['doc'],
  blocksExternalSnapshot: () => false, ...drafts,
});

test('a closed child draft does not stop a lone document save from being claimed as the own save', () => {
  // Review P2 step 4: one pending document (body B after save A) plus a closed child panel draft.
  const drafts = spacePort();
  assert.deepEqual(drafts.captureDrafts!().map(d => d.documentId), ['doc']);
  assert.equal(claimedDocument(pendingDoc(drafts)), 'doc');

  // The regressed shape: recovery text inside captureDrafts made the single-draft check fail.
  const mixed = pendingDoc({ captureDrafts: () => [...drafts.captureDrafts!(), ...drafts.captureRecoveryDrafts!()] });
  assert.equal(claimedDocument(mixed), null);
});

test('own-save claims stay blocked by other pending input', () => {
  assert.equal(claimedDocument(pendingDoc(spacePort({ recurrenceDraft: true }))), null);
  const other: ProgramEditorFlush = { flushAll: async () => true, lockInput: () => () => {}, hasPendingInput: () => true };
  assert.equal(claimedDocument(pendingDoc(spacePort()), [other]), null);
  assert.equal(claimedDocument({ ...pendingDoc(spacePort()), blocksExternalSnapshot: () => true }), null);
});

test('tab recovery still stores the child draft next to the document draft', () => {
  const port = pendingDoc(spacePort());
  const drafts = evaluate<{ title: string; raw: string; documentId?: string }[]>(expression('AlphaWorkspace.tsx', variable('drafts', 'captureInput')),
    { editors: { current: port }, legacyEditors: { current: null } });
  assert.deepEqual(drafts.map(d => [d.title, d.documentId]), [['장보기 문서', 'doc'], ['‘주말 장보기’ 아래 하위 할 일 초안', undefined]]);
});

test('input boundaries ignore recovery-only drafts but still see document drafts', () => {
  let child = '첫 글자', body = 'A';
  const port: ProgramEditorFlush = { flushAll: async () => true, lockInput: () => () => {},
    captureDrafts: () => [{ documentId: 'doc', title: '문서', raw: body }],
    captureRecoveryDrafts: () => [{ title: '초안', raw: child }] };
  const before = readProgramInputBoundary([port])!;
  child = '첫 글자를 더 씀';
  assert.equal(programInputBoundaryCurrent(before, [port]), true);
  body = 'AB';
  assert.equal(programInputBoundaryCurrent(before, [port]), false);
});
test('11/10 21:04 (실사용): a child panel open over an unchanged body keeps the document pending, but no document draft is kept', () => {
  // The panel alone: still pending (hasPendingInput, pendingDocumentIds keep their protection), no '이 문서에 복구할 입력'.
  const scope = { dirty: { current: { doc: true } }, recurrencePorts: { current: {} } };
  assert.equal(evaluate<() => boolean>(expression('ProgramSpace.tsx', property('hasPendingInput')), scope)(), true);
  assert.deepEqual(evaluate<() => string[]>(expression('ProgramSpace.tsx', property('pendingDocumentIds')), scope)(), ['doc']);
  const panelOnly = spacePort({ bodyPending: false });
  assert.deepEqual(panelOnly.captureDrafts!(), []);
  const kept = evaluate<{ title: string; raw: string; documentId?: string }[]>(expression('AlphaWorkspace.tsx', variable('drafts', 'captureInput')),
    { editors: { current: pendingDoc(panelOnly) }, legacyEditors: { current: null } });
  assert.deepEqual(kept.map(d => [d.title, d.documentId]), [['‘주말 장보기’ 아래 하위 할 일 초안', undefined]], 'the panel text alone, as a recovery draft');
  // Body input with the panel open, or an editor that does not say: the body is kept as before.
  assert.deepEqual(spacePort({ bodyPending: true }).captureDrafts!().map(d => [d.documentId, d.raw]), [['doc', '- [ ] A\n- [ ] B']]);
  assert.deepEqual(spacePort().captureDrafts!().map(d => d.documentId), ['doc']);
});

test('the editor says body input from its own state: a panel over a saved body is none; typing, refusal, saving, composing are', () => {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: ts.FunctionDeclaration | undefined;
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'bodyInputPending') found = node; ts.forEachChild(node, visit); };
  visit(tree); assert(found);
  const code = ts.transpileModule(found.getText(tree) + ';return bodyInputPending;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const pending = (state: Record<string, unknown> | null, more: { native?: string; composing?: boolean; check?: string | null; region?: boolean } = {}) =>
    (new Function('draftRef', 'checkPendingRef', 'regionPortRef', 'programTextInputPending', 'textArea', 'composingRef', 'regionPendingRef', code)(
      { current: state && { getState: () => state } }, { current: more.check ?? null }, { current: { hasPending: () => !!more.region } },
      (s: { dirty: boolean; invalid: boolean; raw: string }, native: string | undefined, composing: boolean, region: boolean, checking: boolean) =>
        s.dirty || s.invalid || composing || region || checking || (native !== undefined && native !== s.raw),
      () => ({ value: more.native ?? 'A' }), { current: !!more.composing }, { current: !!more.region }) as () => boolean)();
  const saved = { dirty: false, invalid: false, saving: false, raw: 'A' };
  assert.equal(pending(saved), false, 'a panel over a saved body');
  assert.equal(pending({ ...saved, dirty: true }), true);
  assert.equal(pending({ ...saved, invalid: true }), true);
  assert.equal(pending({ ...saved, saving: true }), true);
  assert.equal(pending(saved, { native: 'AB' }), true, 'typed, not read yet');
  assert.equal(pending(saved, { composing: true }), true);
  assert.equal(pending(saved, { check: 'request' }), true);
  assert.equal(pending(saved, { region: true }), true);
  assert.equal(pending(null), true, 'no draft yet: kept');
  // The host reads it per document and the editor clears it when it goes.
  assert(source.includes('propsRef.current.onRegisterBodyPending?.(bodyInputPending);') && source.includes('propsRef.current.onRegisterBodyPending?.(null);'));
  assert(readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8').includes('onRegisterBodyPending={read => { bodyPendingReaders.current[id] = read; }}'));
});

/** Exercise both actual editor predicates, then the actual registered host capture expression. */
function componentBodyPending(read: () => ProgramTextDraftState): () => boolean {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const functions = new Map<string, string>();
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name && ['bodyInputPending', 'programTextInputPending'].includes(node.name.text))
      functions.set(node.name.text, node.getText(tree).replace(/^export\s+/, ''));
    ts.forEachChild(node, visit);
  };
  visit(tree); assert.equal(functions.size, 2);
  const code = ts.transpileModule([...functions.values()].join('\n') + ';return bodyInputPending;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function('draftRef', 'checkPendingRef', 'regionPortRef', 'textArea', 'composingRef', 'regionPendingRef', code)(
    { current: { getState: read } }, { current: null }, { current: { hasPending: () => false } },
    () => ({ value: read().raw }), { current: false }, { current: false });
}
function bodyCaptureFixture() {
  let workspace = M.addDocument(createEmptyTextWorkspace(), { title: '합성 본문' });
  const id = workspace.documents.at(-1)!.id, raw = '[2026-11-10]\n- /합성\n  - [ ] 부모\n  - [ ] 다음';
  const edited = M.editTextResult(workspace, id, raw, { folderText: true });
  assert.equal(edited.reason, null); workspace = edited.state;
  const owner = createProgramDocumentInput(workspace, id), sent: string[] = [];
  const draft = createProgramTextDraft(owner.initial, id, async next => { sent.push(M.raw(M.getDocument(next, id)!)); return true; }, () => {}, () => true, owner, true);
  const scope = {
    dirty: { current: { [id]: true } }, documentsRef: { current: [{ id, title: '합성 본문' }] },
    draftReaders: { current: { [id]: () => draft.getState().raw } },
    bodyPendingReaders: { current: { [id]: componentBodyPending(() => draft.getState()) } },
    recurrencePorts: { current: {} }, externalReaders: { current: { [id]: () => true } },
  };
  return { id, raw, draft, sent, scope,
    capture: evaluate<() => { documentId: string; title: string; raw: string }[]>(expression('ProgramSpace.tsx', property('captureDrafts')), scope) };
}
test('W-SAVE-03/11: held-only screen RAW is captured even when its accepted working model equals committed', async () => {
  const h = bodyCaptureFixture(), heldRaw = h.raw.replace('  - [ ] 부모', '  - [ ] 부모\n - [ ] 보류 원문');
  h.draft.updateRaw(heldRaw, '', { inputType: 'insertFromPaste' });
  const state = h.draft.getState();
  assert.equal(state.raw, heldRaw); assert.notEqual(state.raw, M.raw(M.getDocument(state.committed, h.id)!));
  assert.deepEqual(state.working, state.committed); assert.equal(state.invalid, true); assert(state.held?.lines.length);
  assert.equal(await h.draft.save(), false); assert.equal(h.sent.length, 0, 'no accepted model change to send');
  assert.equal(h.scope.bodyPendingReaders.current[h.id](), true);
  assert.deepEqual(h.capture(), [{ documentId: h.id, title: '합성 본문', raw: heldRaw }]);
  const hostDrafts = evaluate<{ documentId?: string; raw: string }[]>(expression('AlphaWorkspace.tsx', variable('drafts', 'captureInput')),
    { editors: { current: pendingDoc({ captureDrafts: h.capture, captureRecoveryDrafts: () => [] }) }, legacyEditors: { current: null } });
  assert.deepEqual(hostDrafts, [{ documentId: h.id, title: '합성 본문', raw: heldRaw }], 'the full screen RAW reaches recovery unchanged');
});
test('W-SAVE-11: child-only dirty stays protected without capturing the unchanged document body', () => {
  const h = bodyCaptureFixture();
  assert.equal(h.scope.bodyPendingReaders.current[h.id](), false); assert.deepEqual(h.capture(), []);
  assert.equal(evaluate<() => boolean>(expression('ProgramSpace.tsx', property('hasPendingInput')), h.scope)(), true);
  assert.deepEqual(evaluate<() => string[]>(expression('ProgramSpace.tsx', property('pendingDocumentIds')), h.scope)(), [h.id]);
  assert.equal(evaluate<(before: unknown, next: unknown) => boolean>(expression('ProgramSpace.tsx', property('blocksExternalSnapshot')), h.scope)({}, {}), true);
  const child = { title: '합성 하위 칸 초안', raw: '아직 확정하지 않은 글' };
  const hostDrafts = evaluate<{ documentId?: string; raw: string }[]>(expression('AlphaWorkspace.tsx', variable('drafts', 'captureInput')),
    { editors: { current: pendingDoc({ captureDrafts: h.capture, captureRecoveryDrafts: () => [child] }) }, legacyEditors: { current: null } });
  assert.deepEqual(hostDrafts, [child], 'child text remains recoverable without a false document copy');
});
