import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';

// QA P2(a): after a completion, a source open from the today row reached the writing screen but its row
// restore came after the QA's 5 s click limit. Measured on the QA fixture, the open spent 1.27 s (2.65 s at a
// 2x slower CPU) in a no-op write, "작성 위치 기억", that re-validated the whole workspace; the restore itself ran.
// The open is presentation-only, so it reads the shown data directly and never waits on, or is refused by, the writer.
const source = (name: string) => readFileSync(new URL(`../../../components/flow/integrated-poc/${name}`, import.meta.url), 'utf8');
function functionNamed(file: string, name: string) {
  const tree = ts.createSourceFile(file, source(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found: ts.FunctionDeclaration | undefined;
  const visit = (node: ts.Node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node; ts.forEachChild(node, visit); };
  visit(tree);
  assert(found?.body, name);
  const calls: string[] = [];
  const collect = (node: ts.Node) => { if (ts.isCallExpression(node)) calls.push(node.expression.getText(tree)); ts.forEachChild(node, collect); };
  collect(found.body);
  return { text: found.getText(tree), calls };
}

test('the source open reads the shown data and never goes through the writer', () => {
  const open = functionNamed('ProgramSpace.tsx', 'openDocument'), text = open.text.replace(/\r\n/g, '\n');
  for (const writer of ['run', 'mutate', 'props.mutate']) assert(!open.calls.includes(writer), writer);
  assert(!text.includes('작성 위치 기억'));
  // The target row and the previous document's position come from the same data the list shows.
  assert(text.includes('const current = dataRef.current, currentSpace = current.spaces[actorId];'));
  assert(open.calls.includes('programCheckpointForWritingTarget') && open.calls.includes('normalizeProgramWritingPosition'));
  // Ownership is still checked first, and a vanished row still says so.
  assert(text.includes('if (!ownsSource()) return false;\n    // Reading/navigation is presentation-only'));
  assert(text.includes("setMessage(programErrorMessage('missing')); return false;"));
  // No busy refusal is left for the detail panel's open either.
  assert(!source('ProgramSpace.tsx').includes('onBusy'));
  assert(!source('AlphaWorkspace.tsx').includes('작성 위치 기억'));
});
