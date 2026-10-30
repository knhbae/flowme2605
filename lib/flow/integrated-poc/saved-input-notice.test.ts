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
