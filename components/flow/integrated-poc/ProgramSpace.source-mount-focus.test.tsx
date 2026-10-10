import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(predicate: (n: ts.Node) => boolean) { let result: ts.Node | undefined; function visit(n: ts.Node) { if (predicate(n)) result ??= n; ts.forEachChild(n, visit); } visit(ast); assert(result); return result; }
function execute(code: string, context: Record<string, unknown>) {
  const compiled = ts.transpileModule(`const work = (${code});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(context), `${compiled};return work;`)(...Object.values(context));
}
function harness() {
  const frames: (() => void)[] = [], id = 'original', requested = {}, sourceFocusOwner = {}, summary = {}, body = {};
  const document = { body, activeElement: body, getElementById: () => area };
  let area: any = null, portCalls = 0, portReady = false;
  const pendingSourceFocus: { current: { documentId: string; taskId: string; attempt: () => void; managedReturnFocus?: object } | null } = { current: null };
  const sourceFocusPorts: { current: Record<string, any> } = { current: {} };
  const selectedRef = { current: id }, presentation = { current: { period: 'documents' } }, dataRef = { current: { activeActorId: 'actor' } };
  const positions = { current: { [id]: requested } }, doc = { id, lines: [{ id: 'memo', text: '메모' }, { id: 'item', text: '- [ ] 할 일' }] };
  const inputLockCount = { current: 0 };
  const context = { pendingSourceFocus, sourceFocusPorts, id, taskId: 'item', requested, sourceFocusOwner, document, actorId: 'actor', dataRef,
    selectedRef, presentation, positions, inputLockCount, writingBlocked: () => inputLockCount.current > 0, viewMenu: { current: { querySelector: () => summary } },
    documentsRef: { current: [doc] }, root: { current: { contains: () => true } }, M: { raw: () => '메모\n- [ ] 할 일' },
    programSame: (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b),
    requestAnimationFrame: (work: () => void) => { frames.push(work); return 1; } };
  const node = find(n => ts.isVariableDeclaration(n) && n.name.getText(ast) === 'attempt' && n.getText(ast).includes('pendingSourceFocus.current?.attempt')) as ts.VariableDeclaration;
  // The production callback compares its own identity; bind that same closure.
  const attemptCode = ts.transpileModule(`const attempt = ${node.initializer!.getText(ast)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const actual = new Function(...Object.keys(context), `${attemptCode};return attempt;`)(...Object.values(context));
  pendingSourceFocus.current = { documentId: id, taskId: 'item', attempt: actual };
  const register = execute(find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'registerSourceFocus').getText(ast), context);
  const port = () => { portCalls++; document.activeElement = area; return portReady; };
  return { actual, register, frames, pendingSourceFocus, document, summary, selectedRef, presentation, dataRef, positions, inputLockCount,
    portCalls: () => portCalls,
    ready: () => { portReady = true; area = { readOnly: false, value: '메모\n- [ ] 할 일', getClientRects: () => [{}], setSelectionRange() {}, scrollIntoView() {}, closest: () => null }; register(id, port); },
    changeRaw: () => { area.value += '추가 입력'; } };
}
test('cold source request waits for native readiness, restores once and ignores duplicate ready frames', () => {
  const h = harness(); h.actual(); assert(h.pendingSourceFocus.current); assert.equal(h.portCalls(), 0);
  h.ready(); assert.equal(h.frames.length, 1); h.frames[0](); assert.equal(h.portCalls(), 1); assert.equal(h.pendingSourceFocus.current, null);
  h.actual(); assert.equal(h.portCalls(), 1);
});
test('cold source readiness never steals later focus or accepts changed actor, view, target or raw', () => {
  for (const change of ['focus', 'unowned-summary', 'actor', 'view', 'target', 'raw', 'position', 'replacement']) {
    const h = harness(); h.actual(); h.ready();
    if (change === 'focus') h.document.activeElement = {};
    if (change === 'unowned-summary') h.document.activeElement = h.summary;
    if (change === 'actor') h.dataRef.current.activeActorId = 'other';
    if (change === 'view') h.presentation.current.period = 'week';
    if (change === 'target') h.selectedRef.current = 'other';
    if (change === 'raw') h.changeRaw();
    if (change === 'position') h.positions.current.original = { start: 1 };
    if (change === 'replacement') h.pendingSourceFocus.current = { documentId: 'other', taskId: 'other', attempt() {} };
    h.frames[0](); assert.equal(h.portCalls(), 0, change);
  }
});
test('equivalent selection observation after cold native mount keeps the same source request', () => {
  const h = harness(); h.actual(); h.ready(); h.positions.current.original = {};
  h.frames[0](); assert.equal(h.portCalls(), 1);
});
test('managed task-dialog return to the current view control remains an allowed focus owner', () => {
  const h = harness(); h.actual(); h.ready(); h.document.activeElement = h.summary; h.pendingSourceFocus.current!.managedReturnFocus = h.summary;
  h.frames[0](); assert.equal(h.portCalls(), 1);
});

test('a source RAF waits while find owns the native top layer, then uses the same request after close', () => {
  const h = harness(); h.actual(); h.ready();
  const request = h.pendingSourceFocus.current as any; request.findPanel = { open: true };
  h.frames[0](); assert.equal(h.portCalls(), 0); assert.equal(h.pendingSourceFocus.current, request);
  request.findPanel.open = false; h.frames[0](); assert.equal(h.portCalls(), 1); assert.equal(h.pendingSourceFocus.current, null);
});

test('a source RAF does not consume the request during the existing host route flush lock', () => {
  const h = harness(); h.ready(); const request = h.pendingSourceFocus.current;
  h.inputLockCount.current = 1; h.actual();
  assert.equal(h.portCalls(), 0); assert.equal(h.pendingSourceFocus.current, request);
  h.inputLockCount.current = 0; h.actual(); assert.equal(h.portCalls(), 1); assert.equal(h.pendingSourceFocus.current, null);
});
