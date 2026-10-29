import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { childDraftRecoveryEntries, type ProgramChildDraft } from './child-draft-recovery';
import { programInputBoundaryCurrent, readProgramInputBoundary, type ProgramEditorFlush } from './document-action';

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
function spacePort(options: { recurrenceDraft?: boolean } = {}): Pick<ProgramEditorFlush, 'captureDrafts' | 'captureRecoveryDrafts'> {
  const child: ProgramChildDraft = { kind: 'task', parentTitle: '주말 장보기', text: '우유 사기' };
  const scope = {
    dirty: { current: { doc: true } },
    documentsRef: { current: [{ id: 'doc', title: '장보기 문서' }] },
    draftReaders: { current: { doc: () => '- [ ] A\n- [ ] B' } },
    recurrencePorts: { current: options.recurrenceDraft ? { r: { captureDrafts: () => [{ title: '회차 날짜 변경 초안', raw: '{}' }] } } : {} },
    childDraftReaders: { current: { doc: () => [child] } },
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
