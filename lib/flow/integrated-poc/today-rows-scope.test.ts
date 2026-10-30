import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';

const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find<T extends ts.Node>(match: (node: ts.Node) => node is T): T[] {
  const found: T[] = [];
  const visit = (node: ts.Node) => { if (match(node)) found.push(node); ts.forEachChild(node, visit); };
  visit(tree);
  return found;
}
const attribute = (element: ts.JsxOpeningLikeElement, name: string) => element.attributes.properties
  .find((entry): entry is ts.JsxAttribute => ts.isJsxAttribute(entry) && entry.name.getText(tree) === name)?.initializer?.getText(tree) ?? '';
const buttons = find((node): node is ts.JsxOpeningLikeElement => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(tree) === 'button');

test('R4 waits stay as they were and become visible: the check keeps its busy guard, the row says what it waits for', () => {
  const check = buttons.filter(button => attribute(button, 'className').includes('styles.check'));
  assert.equal(check.length, 1);
  assert.equal(attribute(check[0], 'aria-busy'), '{completingTaskIds.has(task.id) || undefined}');
  assert.match(attribute(check[0], 'onClick'), /const ids = completingInSession\(completingTasks, sourceSession\.current\);\s*if \(ids\.has\(task\.id\)\) return;/);
  assert.match(attribute(check[0], 'aria-label'), /완료 대기 중/);
  const title = buttons.filter(button => attribute(button, 'className') === '{styles.taskTitle}');
  assert.equal(title.length, 1);
  assert.equal(attribute(title[0], 'aria-busy'), '{sourceWaitingTask === task.id || undefined}');
  assert.match(attribute(title[0], 'onClick'), /openFromList\(task, event\.currentTarget\)/);
  const row = title[0].parent.getText(tree);
  assert.match(row, /sourceWaitingTask === task\.id \? <span className=\{styles\.rowBusy\}>원문 여는 중…<\/span>/);
  // The row's words are not a live region; the title's aria-busy and the host notice announce.
  assert.doesNotMatch(row, /aria-live|role="status"/);
});

test('"← 오늘" and the same tab return through the tab-change guard; the remembered origin dies with that source', () => {
  const nav = buttons.filter(button => attribute(button, 'data-program-period') === '{key}');
  assert.equal(nav.length, 1);
  // R8b: the space's own tabs and the host's bottom tabs share one chooser, which keeps the R7 return.
  assert.match(attribute(nav[0], 'onClick'), /chooseMainTab\(key as ProgramMainTab\)/);
  const chooser = find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'chooseMainTab')[0].getText(tree);
  assert.match(chooser, /sourceOriginOpen && sourceOriginTab\(sourceOrigin!\) === key \? returnToSourceOrigin\(\)\.then\(\(\) => true\) : changePeriod\(key, true\)/);
  assert.match(source, /props\.onRegisterMainTabs\?\.\(\{ choose: tab => chooseMainTabRef\.current\(tab\) \}\);/);
  const back = buttons.filter(button => attribute(button, 'className') === '{styles.sourceReturn}');
  assert.equal(back.length, 1);
  assert.equal(attribute(back[0], 'onClick'), '{() => void returnToSourceOrigin()}');
  const ret = find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === 'returnToSourceOrigin')[0].getText(tree);
  assert.match(ret, /if \(!await flushAllEditors\(\)\) \{ showViewChangeBlocked\(\); return; \}/);
  assert.match(ret, /const release = lockInput\(\);/);
  assert.match(source, /origin\.actorId !== actorId \|\| period !== 'documents' \|\| selected !== origin\.documentId\) \? null : origin\);\s*\}, \[actorId, period, selected\]\);/);
});

test('coming back puts the row at its old height and focuses its title; a vanished row restores the page scroll', () => {
  const effect = find((node): node is ts.CallExpression => ts.isCallExpression(node) && node.expression.getText(tree) === 'useEffect'
    && node.arguments[0].getText(tree).includes('const origin = sourceRestore'));
  assert.equal(effect.length, 1);
  const code = ts.transpileModule('const extracted = (' + effect[0].arguments[0].getText(tree) + ');', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = (rowTop: number | null) => {
    const calls: string[] = [];
    const title = { focus: () => calls.push('focus') };
    const row = { dataset: { taskId: 't' }, getClientRects: () => [{}], getBoundingClientRect: () => ({ top: rowTop }), parentElement: null,
      querySelector: () => title };
    const scope = {
      sourceRestore: { taskId: 't', top: 300, scrollY: 1200, view: { period: 'today' } }, period: 'today', setSourceRestore: () => {},
      requestAnimationFrame: (callback: () => void) => { callback(); return 1; }, cancelAnimationFrame: () => {},
      root: { current: { querySelectorAll: () => rowTop === null ? [] : [row] } }, styles: { taskTitle: 'taskTitle' },
      getComputedStyle: () => ({ overflowY: 'visible' }), document: { activeElement: { getClientRects: () => [] }, body: {} },
      window: { scrollBy: ({ top }: { top: number }) => calls.push(`scrollBy ${top}`), scrollTo: ({ top }: { top: number }) => calls.push(`scrollTo ${top}`) },
    };
    (new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as () => void)();
    return calls;
  };
  assert.deepEqual(run(500), ['scrollBy 200', 'focus']);
  assert.deepEqual(run(null), ['scrollTo 1200']);
});
