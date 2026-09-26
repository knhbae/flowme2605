import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { programErrorMessage } from '../../../lib/flow/integrated-poc/ui-contract';

const source = readFileSync(new URL('./ProgramSpace.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let runSource = '';
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'run') runSource = node.initializer!.getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast); assert(runSource);
const compiled = ts.transpileModule(`const run = ${runSource}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;

for (const reason of ['busy', 'unresolved', 'conflict', 'checking-result']) {
  test(`personal-space run preserves input and handles ${reason} without a stale busy notice`, async () => {
    const original = { raw: 'unsaved\r\n input' }, formExpected = { current: original }, detailExpected = { current: original };
    let message = 'earlier failure', builds = 0;
    const run = new Function('mutate', 'actorId', 'formExpected', 'detailExpected', 'setMessage', 'programErrorMessage',
      `${compiled}; return run;`)(async () => ({ ok: false, reason }), 'owner', formExpected, detailExpected,
      (value: string) => { message = value; }, programErrorMessage);
    assert.deepEqual(await run('click', () => { builds++; throw Error('must not build'); }), { ok: false, reason });
    assert.equal(builds, 0); assert.equal(formExpected.current, original); assert.equal(detailExpected.current, original);
    assert.equal(message, reason === 'busy' ? 'earlier failure' : programErrorMessage(reason));
  });
}

test('personal-space successful mutation still clears prior failure and updates its form baseline', async () => {
  const formExpected = { current: {} }, detailExpected = { current: {} }, committed = { raw: 'saved' };
  let message = 'prior failure';
  const run = new Function('mutate', 'actorId', 'formExpected', 'detailExpected', 'setMessage', 'programErrorMessage',
    `${compiled}; return run;`)(async (_label: string, build: Function) => { build({}); return { ok: true, result: 'saved' }; },
    'owner', formExpected, detailExpected, (value: string) => { message = value; }, programErrorMessage);
  await run('click', () => ({ ok: true, data: { spaces: { owner: committed } } }));
  assert.equal(message, ''); assert.equal(formExpected.current, null); assert.equal(detailExpected.current, committed);
});
