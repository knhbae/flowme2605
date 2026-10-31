import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';

// S-a: a general publication never records a source check date, so its intro and detail said
// "출처 확인 기록: 없음" right under a source note that may name a check date. Without a date the line
// is not drawn; with one it reads as before. Storage formats are unchanged.
const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramDiscovery.tsx', import.meta.url), 'utf8');
type Node = { tag: string; props: Record<string, unknown> | null; children: unknown[] };
const h = (tag: string, props: Record<string, unknown> | null, ...children: unknown[]): Node => ({ tag, props, children });
const text = (value: unknown): string => Array.isArray(value) ? value.map(text).join('') : value && typeof value === 'object' ? text((value as Node).children) : value == null || value === false ? '' : String(value);

// FC2 folded the intro into the one detail screen, so the line is drawn once (FC0 regression).
test('the source-check line is drawn only with a check date, on the one detail screen', () => {
  const tree = ts.createSourceFile('ProgramDiscovery.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxExpression(node) && node.expression && node.getText(tree).includes('출처 확인 기록')) lines.push(node.expression.getText(tree));
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(lines.length, 1);
  assert(!source.includes("checkedAt ?? '없음'"));
  for (const expression of lines) {
    const code = ts.transpileModule(`const out = (${expression});`, { compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: 'h', target: ts.ScriptTarget.ES2022 } }).outputText;
    const render = (checkedAt: string | null) => new Function('h', 'version', 'styles', code + '\nreturn out;')(h, { source: { checkedAt } }, { muted: 'muted' });
    // No date: nothing is drawn.
    assert.equal(text(render(null)), '');
    assert(!render(null));
    // A date: the line as before.
    const line = render('2026-09-23') as Node;
    assert.equal(line.tag, 'p');
    assert.deepEqual(line.props, { className: 'muted' });
    assert.equal(text(line), '출처 확인 기록: 2026-09-23 · 지금 원문을 다시 확인한 결과는 아닙니다.');
  }
});
