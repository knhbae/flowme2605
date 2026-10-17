import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';
import postcss from 'postcss';

const read = (file: string) => readFileSync(new URL(file, import.meta.url), 'utf8');
const spaceSource = read('./ProgramSpace.tsx');
const shellSource = read('./AlphaWorkspace.tsx');
const spaceTree = ts.createSourceFile('ProgramSpace.tsx', spaceSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const shellTree = ts.createSourceFile('AlphaWorkspace.tsx', shellSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(tree: ts.SourceFile, predicate: (node: ts.Node) => boolean): ts.Node {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) found ??= node; ts.forEachChild(node, visit); }
  visit(tree); assert(found); return found;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const value = ${expression};`, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React,
  } }).outputText;
  return new Function('React', ...Object.keys(context), `${code}; return value;`)(React, ...Object.values(context));
}
const classElement = (tree: ts.SourceFile, className: string) => find(tree, node => ts.isJsxElement(node)
  && node.openingElement.attributes.properties.some(attribute => ts.isJsxAttribute(attribute)
    && attribute.name.getText(tree) === 'className' && attribute.initializer?.getText(tree) === `{styles.${className}}`)).getText(tree);
type Element = { type: string; props: Record<string, any> };
function nodes(value: any): Element[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== 'object') return [];
  return [...(typeof value.type === 'string' ? [value] : []), ...nodes(value.props?.children)];
}
function text(value: any): string {
  if (Array.isArray(value)) return value.map(text).join('');
  if (!value || typeof value === 'boolean') return '';
  return typeof value === 'object' ? text(value.props?.children) : String(value);
}
const styles = new Proxy({}, { get: (_, key) => String(key) });

test('all writing states share one title/action heading and one finder; other views keep their entry', () => {
  const finder = React.createElement('button', { 'data-test-finder': true }, '글 찾기');
  const writingStates = [
    { selected: '', selectedDoc: null, title: '필요한 내용을 먼저 적으세요' },
    { selected: 'missing-doc', selectedDoc: null, title: '문서를 찾을 수 없습니다' },
    { selected: 'synthetic-doc', selectedDoc: { id: 'synthetic-doc', title: '긴 가상 문서 제목' }, title: '긴 가상 문서 제목' },
  ];
  for (const period of ['documents', 'today', 'all']) for (const state of writingStates) {
    const context = { styles, props: {}, period, ...state, findActions: finder, selectedDocumentTools: null,
      viewMenu: { current: null }, mainPeriods: [['documents', '쓰기'], ['today', '오늘'], ['all', '분류']], collectionMode: undefined, changePeriod() {} };
    const outer = nodes(evaluate(classElement(spaceTree, 'contextActions'), context)).filter(node => node.props['data-test-finder']);
    const headingNodes = nodes(evaluate(classElement(spaceTree, 'docHeading'), context));
    const headingFinder = headingNodes.filter(node => node.props['data-test-finder']);
    assert.equal(outer.length + headingFinder.length, 1, `${period}:${state.selected}`);
    assert.equal(headingFinder.length, period === 'documents' ? 1 : 0);
    assert.equal(text(headingNodes.find(node => node.type === 'h1')), state.title);
    assert(headingNodes.findIndex(node => node.type === 'h1') < headingNodes.findIndex(node => node.props.className === 'writingActions'));
  }
  assert.match(spaceSource, /<div hidden=\{period !== 'documents'\}>/);
  const writingButtons: ts.Node[] = [];
  function collect(node: ts.Node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(spaceTree) === 'button'
      && node.openingElement.getText(spaceTree).includes('beginWriting()')) writingButtons.push(node);
    ts.forEachChild(node, collect);
  }
  collect(spaceTree);
  assert.equal(writingButtons.length, 1, 'new writing is not duplicated in the empty state');
});

test('note writing moves only the selected editor actions to its toolbar; empty and period views retain one finder', () => {
  const finder = React.createElement('button', { 'data-test-finder': true }, '글 찾기');
  const tools = React.createElement('details', { 'data-test-tools': true }, '문서 관리');
  const noteActions = find(spaceTree, node => ts.isJsxAttribute(node) && node.name.getText(spaceTree) === 'noteActions') as ts.JsxAttribute;
  const actionsExpression = (noteActions.initializer as ts.JsxExpression).expression!.getText(spaceTree);
  for (const period of ['documents', 'today', 'all']) for (const selected of ['', 'missing-doc', 'synthetic-doc']) {
    const selectedDoc = selected === 'synthetic-doc' ? { id: selected, title: '긴 가상 문서 제목' } : null;
    const context = { styles, props: { noteHeader: React.createElement('details'), noteStatus: React.createElement('p', { role: 'status' }, '서버와 연결됨') },
      period, selected, selectedDoc, id: selected, compactNoteToday: period === 'today', findActions: finder, selectedDocumentTools: tools,
      selectedDocumentExample: null,
      viewMenu: { current: null }, mainPeriods: [['documents', '쓰기'], ['today', '오늘'], ['all', '분류']], collectionMode: undefined, changePeriod() {},
      noteFindMenu: { current: null }, noteFindMenuSummary: { current: null } };
    const outer = nodes(evaluate(classElement(spaceTree, 'contextActions'), context));
    const heading = nodes(evaluate(classElement(spaceTree, 'docHeading'), context));
    const toolbar = selectedDoc ? nodes(evaluate(actionsExpression, context)) : [];
    const periodFinder = period === 'today' ? nodes(evaluate(classElement(spaceTree, 'notePeriodTools'), context))
      : period === 'all' ? nodes(evaluate(classElement(spaceTree, 'periodStatus'), context)) : [];
    const visible = [...outer, ...(period === 'documents' ? [...heading, ...toolbar] : periodFinder)];
    assert.equal(visible.filter(node => node.props['data-test-finder']).length, 1, `${period}:${selected}`);
    assert.equal(heading.filter(node => node.props['data-test-finder']).length, period === 'documents' && !selectedDoc ? 1 : 0);
    assert.equal(text(heading.find(node => node.type === 'h1')), selectedDoc?.title ?? (selected ? '문서를 찾을 수 없습니다' : '필요한 내용을 먼저 적으세요'));
    if (selectedDoc) {
      assert.equal(toolbar.filter(node => node.props['data-test-tools']).length, 1);
      assert.deepEqual(nodes(evaluate(actionsExpression, { ...context, id: 'retained-hidden-doc' })), []);
    }
  }
});

test('finder preserves its one ref, composition gate and caret capture without nested disclosure', () => {
  const declaration = find(spaceTree, node => ts.isVariableDeclaration(node) && node.name.getText(spaceTree) === 'findActions') as ts.VariableDeclaration;
  const source = declaration.getText(spaceTree);
  assert.equal((spaceSource.match(/ref=\{libraryToggle\}/g) ?? []).length, 1);
  assert.match(source, /aria-expanded=\{libraryOpen\}/);
  assert.match(source, /aria-controls="program-library"/);
  assert.match(source, /libraryComposing\.current.*event\.preventDefault\(\).*event\.stopPropagation\(\).*return/);
  assert.match(source, /rememberFindFocus\(\); if \(libraryReturn\.current\?\.area\) event\.preventDefault\(\)/);
  assert.match(source, /onClick=\{openFindPanel\}>글 찾기/);
  assert.doesNotMatch(source, /<details|<summary/);
  const events: string[] = [];
  const buttons = nodes(evaluate(declaration.initializer!.getText(spaceTree), { styles, period: 'documents', preparingDocumentAction: false,
    beginWriting: () => events.push('new'), libraryToggle: { current: null }, libraryOpen: false,
    libraryComposing: { current: false }, libraryReturn: { current: { area: {} } }, rememberFindFocus: () => events.push('remember'),
    openFindPanel: () => events.push('find') }));
  const search = buttons.find(node => node.props['aria-controls'] === 'program-library')!;
  search.props.onPointerDown({ preventDefault: () => events.push('prevent'), stopPropagation: () => events.push('stop') });
  search.props.onClick();
  buttons.find(node => text(node) === '새 글')!.props.onClick();
  assert.deepEqual(events, ['remember', 'prevent', 'find', 'new']);
});


test('mobile note and non-note titles use the approved layout while all action targets remain 48px and errors stay exposed', () => {
  const spaceCss = postcss.parse(read('./ProgramSpace.module.css'));
  const declarations = new Map<string, string>();
  // Apply all base/mobile source declarations in order, not just the last media block.
  spaceCss.walkRules(rule => {
    let parent: postcss.Rule['parent'] | postcss.Document = rule.parent;
    while (parent) {
      if (parent.type === 'atrule' && parent.name === 'media' && !/^\(max-width:\s*760px\)$/.test(parent.params)) return;
      parent = parent.parent;
    }
    for (const selector of rule.selectors) rule.walkDecls(decl => { declarations.set(`${selector}:${decl.prop}`, decl.value); });
  });
  assert.equal(declarations.get('.docHeading:display'), 'grid');
  // Literal selectors keep the retained legacy layout separate from Note A.
  assert.equal(declarations.get('.docHeading:grid-template-columns'), 'minmax(0, 1fr)');
  assert.equal(declarations.get('.docHeading h1:width'), '100%');
  assert.equal(declarations.get('.docHeading h1:font-size'), '24px');
  assert.equal(declarations.get('.docHeading h1:line-height'), '32px');
  assert.equal(declarations.get('.docHeading h1:overflow-wrap'), 'anywhere');
  assert.equal(declarations.get('.writingActions :is(button, summary):min-height'), '48px');
  assert.equal(declarations.get('.writingActions :is(button, summary):min-width'), '48px');
  assert.equal(declarations.get('.writingActions:width'), '100%');
  assert.equal(declarations.get('.writingActions > details:margin-left'), 'auto');
  const scoped = ':where(.space[data-note-layout="true"])';
  assert.equal(declarations.get(`${scoped} .docHeading:grid-template-columns`), 'minmax(0, 1fr) auto');
  assert.equal(declarations.get(`${scoped} .docHeading h1:width`), 'auto');
  assert.equal(declarations.get(`${scoped} .docHeading h1:font-size`), '16px');
  assert.equal(declarations.get(`${scoped} .docHeading h1:line-height`), '24px');
  assert.equal(declarations.get(`${scoped} .writingActions:width`), 'auto');
  assert.equal(declarations.get(`${scoped} .writingActions > details:margin-left`), '0');
  assert.equal(declarations.get('.writingActions .documentToolsMarker:display'), 'none');
  assert.equal(declarations.get('.writingActions .documentToolsLabel:display'), undefined);
  assert.equal(declarations.get('.space:has([data-program-period="documents"][aria-current="page"]):has(.docHeading) > .contextActions:display'), 'contents');
  assert.equal(declarations.get('.space[data-note-layout="true"] .docHeading:display'), 'block');
  const noteTitle = '.space[data-note-layout="true"] .docHeading h1';
  for (const [property, value] of [['width', 'auto'], ['font-size', '26px'], ['line-height', '36px'], ['overflow', 'visible'], ['clip-path', 'none'], ['white-space', 'normal']]) {
    assert.equal(declarations.get(`${noteTitle}:${property}`), value);
  }
  assert.equal(declarations.get('.space[data-note-layout="true"] .notePeriodTools > summary:min-width'), '48px');
  assert.equal(declarations.get('.space[data-note-layout="true"] .notePeriodTools > summary:min-height'), '48px');
  const shellCss = postcss.parse(read('./AlphaWorkspace.module.css'));
  const compact = shellCss.nodes.filter(node => node.type === 'atrule' && node.name === 'media' && node.params === '(max-width: 760px)').at(-1) as postcss.AtRule;
  const compactText = compact.toString();
  assert.match(compactText, /data-program-period="documents"/);
  for (const healthy of ['ready', 'saved', 'same-location']) assert(compactText.includes(`data-save-state="${healthy}"`));
  assert.doesNotMatch(compactText, /\.problem|\.recovery|display:\s*none/);
  assert.match(spaceSource, /aria-label="기본 이동"/);
  const navigation = classElement(shellTree, 'globalNavigation');
  const targets = ['space', 'community', 'activity'];
  for (const [view, active] of [['space', 0], ['legacy', 0], ['community', 1], ['discover', 1], ['flow', 1], ['activity', 2], ['creator', 2]] as const) {
    const calls: string[] = [];
    const tree = evaluate(navigation, { styles, destination: { view }, navigate: (next: { view: string }) => calls.push(next.view) });
    assert.equal(tree.props['aria-label'], '주요 메뉴');
    const buttons = nodes(tree).filter(node => node.type === 'button');
    assert.deepEqual(buttons.map(text), ['내 공간', '둘러보기', '내 활동']);
    buttons.forEach((button, index) => {
      assert.equal(button.props.type, 'button');
      assert.equal(button.props['aria-current'], index === active ? 'page' : undefined);
      button.props.onClick();
    });
    assert.deepEqual(calls, targets);
  }
});
