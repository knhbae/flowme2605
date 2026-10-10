import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { createProgramWritingEntry } from '../../../lib/flow/integrated-poc/writing-entry';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (node: ts.Node) => boolean) { let found: ts.Node | undefined; function visit(node: ts.Node) { if (predicate(node)) found ??= node; ts.forEachChild(node, visit); } visit(ast); assert(found); return found; }
function execute(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const callback = (${expression});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(context), `${code};return callback;`)(...Object.values(context));
}
test('explicit writing captures the invoker before awaiting storage, not a later Tab destination', async () => {
  const initial = createProgramData(), actorId = initial.activeActorId, space = initial.spaces[actorId], original = {}, later = {}, document = { activeElement: original };
  let releaseFlush!: (value: boolean) => void, focusRequest: any;
  const context = { document, actorId, space, preparing: { current: false }, inputLockCount: { current: 0 },
    lockInput: () => () => {}, setPreparingDocumentAction() {}, moveFlush: { current: null },
    flushAllEditors: () => new Promise<boolean>(done => { releaseFlush = done; }), setMessage() {},
    writingRequest: { current: null }, programId: () => 'focus-writing-request', selectedRef: { current: '' }, createProgramWritingEntry,
    run: async (_label: string, make: any) => make(initial), setWritingFocus: (value: any) => { focusRequest = value; },
    setSelected() {}, setOpened() {}, setFolderId() {}, setPeriod() {}, setLibraryOpen() {}, props: { navigate() {} } };
  const start = execute(find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'beginWriting').getText(ast), context);
  const flight = start(); document.activeElement = later; releaseFlush(true); await flight;
  assert.equal(focusRequest.focusOwner, original); assert.notEqual(focusRequest.focusOwner, document.activeElement);
});
test('focus effect runs for a new request with the same ID and does not steal a later control focus', () => {
  const effect = find(node => ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('current === writingFocus')) as ts.CallExpression;
  for (const laterFocus of [false, true]) {
    let focused = 0, callback!: () => void;
    const owner = {}, later = {}, body = {}, writingFocus = { id: 'same-blank', actorId: 'local-user', focusOwner: owner };
    const area = { readOnly: false, getClientRects: () => [{}], focus: () => focused++ };
    execute(effect.arguments[0].getText(ast), { writingFocus, selected: 'same-blank', actorId: 'local-user', period: 'documents',
      requestAnimationFrame: (work: () => void) => { callback = work; return 1; }, cancelAnimationFrame() {},
      root: { current: { querySelector: () => area } }, dataRef: { current: { activeActorId: 'local-user' } },
      document: { body, activeElement: laterFocus ? later : owner }, setWritingFocus() {} })();
    callback(); assert.equal(focused, laterFocus ? 0 : 1);
  }
});
