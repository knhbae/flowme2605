import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

// Execute the actual local popstate handler with deterministic controller spies.
// These are closure tests, not a mounted React/browser or native Back claim.
const file = path.join(process.cwd(), 'components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx');
const ast = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const initializers: ts.Expression[] = [];
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)
    && node.name.text === 'handleEditorPopState' && node.initializer) initializers.push(node.initializer);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(initializers.length, 1, 'Reinspect a changed local handler; never substitute a test implementation');
const body = ts.transpileModule(`const handler = ${initializers[0].getText(ast)};`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function setup(kind: 'plan' | 'quick', pendingClose: boolean, consuming = false) {
  const calls: string[] = [];
  const consume = { current: consuming };
  const editor = (name: 'plan' | 'quick') => ({ active: name === kind ? { pendingClose: pendingClose ? { event: 'browser-back' } : undefined } : undefined,
    requestClose: (reason: string) => calls.push(`${name}:request:${reason}`) });
  const handler = new Function('editorHistoryPopstateConsume', 'planEditor', 'quickEditor', 'planEditorRearm', 'quickEditorRearm',
    body + '\nreturn handler;')(consume, editor('plan'), editor('quick'),
      { current: () => calls.push('plan:rearm') }, { current: () => calls.push('quick:rearm') });
  return { handler: handler as () => void, calls, consume };
}

for (const kind of ['plan', 'quick'] as const) {
  test(`pending ${kind} discard confirmation rearms only its local history boundary`, () => {
    const fixture = setup(kind, true);
    fixture.handler(); fixture.handler();
    assert.deepEqual(fixture.calls, [`${kind}:rearm`, `${kind}:rearm`]);
  });
}
test('first dirty close still uses the existing controller request', () => {
  for (const kind of ['plan', 'quick'] as const) {
    const fixture = setup(kind, false);
    fixture.handler();
    assert.deepEqual(fixture.calls, [`${kind}:request:browser-back`]);
  }
});
test('an already consumed editor popstate never closes or rearms a visit', () => {
  const fixture = setup('plan', true, true);
  fixture.handler();
  assert.deepEqual(fixture.calls, []);
  assert.equal(fixture.consume.current, false);
});
