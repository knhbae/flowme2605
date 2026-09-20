import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { programRecurrenceFocusId } from '../../../lib/flow/integrated-poc/recurrence-plan-focus';

// Runs the actual Space effect with deterministic frame/DOM doubles. Browser
// focus, scrolling and storage evidence are collected separately in the app.
const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback: ts.ArrowFunction | undefined;
function visit(node: ts.Node) {
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0] && ts.isArrowFunction(node.arguments[0])
    && node.arguments[0].body.getText(ast).includes('resolveProgramRecurrencePlanFocus(data, planFocus.request)')) callback = node.arguments[0];
  ts.forEachChild(node, visit);
}
visit(ast); assert(callback);
const compiled = ts.transpileModule(`(${callback.getText(ast)})()`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
function harness(options: { visible?: boolean; rootVisible?: boolean; valid?: boolean; period?: string; date?: string; selected?: string } = {}) {
  const request = { actorId: 'local-user', ownerId: 'exact-plan', date: '2026-10-13', operationCount: 1, operationAt: '2026-09-13T00:00:00.000Z' };
  const planFocus = { request, documentId: 'same-document' }, calls: unknown[][] = [], frames = new Map<number, () => void>();
  const button = { disabled: false, getClientRects: () => options.visible === false ? [] : [{}], focus: (value: unknown) => calls.push(['focus', value]), scrollIntoView: (value: unknown) => calls.push(['scroll', value]) };
  const root = { getClientRects: () => options.rootVisible === false ? [] : [{}], contains: (value: unknown) => value === button };
  const context = { data: {}, planFocus, planFocusRef: { current: planFocus }, selected: options.selected ?? 'same-document', period: options.period ?? 'documents', date: options.date ?? '2026-09-13', root: { current: root },
    resolveProgramRecurrencePlanFocus: () => options.valid === false ? null : { key: 'exact-private-key', date: request.date }, programRecurrenceFocusId,
    document: { getElementById: (id: string) => { assert.equal(id, programRecurrenceFocusId('exact-private-key')); return options.visible === false ? null : button; } },
    setPlanFocus: (value: unknown) => calls.push(['intent', value]), setPeriod: (value: string) => calls.push(['period', value]), setDate: (value: string) => calls.push(['date', value]),
    requestAnimationFrame: (fn: () => void) => { frames.set(1, fn); return 1; }, cancelAnimationFrame: (id: number) => { frames.delete(id); calls.push(['cancel', id]); } };
  const cleanup = vm.runInNewContext(compiled, context) as (() => void) | undefined;
  return { calls, context, cleanup, run: () => { const frame = frames.get(1); frames.delete(1); frame?.(); } };
}
test('visible exact private occurrence receives focus and scroll without changing document or period', () => {
  const h = harness(); h.run();
  assert.deepEqual(h.calls.map(call => call[0]), ['focus', 'scroll', 'intent']);
  assert.equal((h.calls[0][1] as { preventScroll: boolean }).preventScroll, true);
  assert.equal((h.calls[1][1] as { block: string }).block, 'center');
  assert.equal(h.calls[2][1], null);
});
test('out-of-view exact result reveals its week then focuses the same key on the next render', () => {
  const hidden = harness({ visible: false }); hidden.run(); assert.deepEqual(hidden.calls, [['period', 'week'], ['date', '2026-10-13']]);
  const shown = harness({ period: 'week', date: '2026-10-13' }); shown.run(); assert.equal(shown.calls[0][0], 'focus');
  const missing = harness({ visible: false, period: 'week', date: '2026-10-13' }); missing.run(); assert.deepEqual(missing.calls, [['intent', null]]);
});
test('actor/version rejection or a changed document never moves focus to an arbitrary row', () => {
  for (const options of [{ valid: false }, { selected: 'another-document' }, { rootVisible: false }]) {
    const h = harness(options); h.run(); assert.deepEqual(h.calls, [['intent', null]]);
  }
});
test('cleanup cancels the frame and a superseded intent does not steal focus', () => {
  const h = harness(); h.cleanup?.(); h.run(); assert.deepEqual(h.calls, [['cancel', 1]]);
  const stale = harness(); stale.context.planFocusRef.current = { ...stale.context.planFocus }; stale.run(); assert.deepEqual(stale.calls, []);
});
