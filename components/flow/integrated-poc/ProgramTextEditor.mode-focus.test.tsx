import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./ProgramTextEditor.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('ProgramTextEditor.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let node: ts.FunctionDeclaration | undefined;
function visit(value: ts.Node) { if (ts.isFunctionDeclaration(value) && value.name?.text === 'returnToDocumentMode') node = value; ts.forEachChild(value, visit); }
visit(ast); assert(node);
const code = ts.transpileModule(`const callback = (${node.getText(ast)});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
for (const context of ['whole', 'region', 'empty', 'readonly'] as const) test(`raw return focuses visible ${context} input or control, never a hidden whole editor`, () => {
  const calls: string[] = [], frame: (() => void)[] = [];
  const area = (name: string, visible: boolean) => ({ readOnly: false, getClientRects: () => visible ? [{}] : [], focus: () => calls.push(name) });
  const whole = area('whole', context === 'whole' || context === 'readonly'), region = area('region', context === 'region');
  whole.readOnly = context === 'readonly';
  const control = { disabled: context === 'readonly', getClientRects: () => [{}], focus: () => calls.push('control') };
  const summary = { getClientRects: () => [{}], focus: () => calls.push('summary') };
  const callback = new Function('setMode', 'requestAnimationFrame', `${code};return callback;`)((mode: string) => calls.push(mode), (work: () => void) => frame.push(work));
  callback({ closest: () => ({ querySelectorAll: (selector: string) => selector === 'textarea' ? [whole, region] : selector === 'summary' ? [summary] : [control] }) });
  assert.deepEqual(calls, ['live']); frame[0](); assert.deepEqual(calls, ['live', context === 'empty' ? 'control' : context === 'readonly' ? 'summary' : context]);
});
