import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import postcss from 'postcss';
import ts from 'typescript';
import { programLocation } from '../../../lib/flow/integrated-poc/navigation';
import type { ProgramDestination } from '../../../lib/flow/integrated-poc/ui-contract';

// Execute the real shell JSX and navigation function with local presentation
// doubles. This is not a browser, account, persistence or device-IME check.
const source = readFileSync(new URL('./AlphaWorkspace.tsx', import.meta.url), 'utf8');
const tree = ts.createSourceFile('AlphaWorkspace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const require = createRequire(import.meta.url);
function find(predicate: (node: ts.Node) => boolean): ts.Node {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (result) return;
    if (predicate(node)) result = node;
    else ts.forEachChild(node, visit);
  }
  visit(tree);
  assert(result);
  return result;
}
function evaluate(expression: string, context: Record<string, unknown>) {
  const code = ts.transpileModule(`const value = ${expression};`, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  return new Function('require', 'exports', ...Object.keys(context), `${code}; return value;`)(require, {}, ...Object.values(context));
}
const declaration = (name: string) => (find(node => ts.isFunctionDeclaration(node) && node.name?.text === name) as ts.FunctionDeclaration).getText(tree);
const initializer = (name: string) => (find(node => ts.isVariableDeclaration(node) && node.name.getText(tree) === name) as ts.VariableDeclaration).initializer!.getText(tree);
const jsx = (tag: string, className: string) => find(node => ts.isJsxElement(node)
  && node.openingElement.tagName.getText(tree) === tag
  && node.openingElement.attributes.properties.some(attribute => ts.isJsxAttribute(attribute)
    && attribute.name.getText(tree) === 'className' && attribute.initializer?.getText(tree) === `{styles.${className}}`)).getText(tree);
const summary = find(node => ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === 'summary'
  && node.openingElement.attributes.properties.some(attribute => ts.isJsxAttribute(attribute)
    && attribute.name.getText(tree) === 'aria-label' && attribute.initializer?.getText(tree).includes('보조 메뉴'))).getText(tree);
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
function context(view: ProgramDestination['view'] = 'space', bindings = false): Record<string, any> {
  return {
    styles: new Proxy({}, { get: (_, key) => String(key) }), destination: { view }, unavailable: false,
    data: { spaces: { 'synthetic-owner': { savedBindings: bindings ? [{}] : [] } } }, session: { userId: 'synthetic-owner' },
    collectionsMode: false, collectionsSwitching: false, collectionsSaving: false, pending: false,
    external: false, snapshot: { busy: false, draft: null, canRedo: false }, storageError: false,
    browse: ['discover', 'flow', 'community'].includes(view), navigate: () => {}, switchCollectionsMode: () => {},
  };
}
function primary(ctx: Record<string, any>) {
  return nodes(evaluate(jsx('header', 'header'), ctx)).find(node => node.type === 'nav' && node.props['aria-label'] === '주요 메뉴');
}
function auxiliary(ctx: Record<string, any>) {
  return nodes(evaluate(initializer('workspaceTools'), ctx)).filter(node => node.type === 'button');
}
const destinations = [['내 작업', 'space'], ['Flow', 'discover'], ['이야기', 'community']] as const;

test('global personal work, Flow and stories are direct named entries outside account management', () => {
  const ctx = context(), calls: ProgramDestination[] = [];
  ctx.navigate = (next: ProgramDestination) => calls.push(next);
  const navigation = primary(ctx)!;
  const buttons = nodes(navigation).filter(node => node.type === 'button');
  assert.deepEqual(buttons.map(button => text(button.props.children)), destinations.map(([label]) => label));
  for (const button of buttons) {
    assert.equal(button.props.type, 'button');
    button.props.onClick();
  }
  assert.deepEqual(calls, destinations.map(([, view]) => ({ view })));
  assert(!nodes(navigation).some(node => node.type === 'details'));
  assert(!text(navigation).includes('쓰기'));
  assert(!text(navigation).includes('오늘'));
  assert(!text(navigation).includes('분류'));
});

test('selected public detail, creator, activity and legacy destinations remain identifiable', () => {
  const cases: [ProgramDestination['view'], string | undefined, string | undefined][] = [
    ['space', '내 작업', undefined], ['discover', 'Flow', undefined], ['flow', 'Flow', undefined],
    ['creator', 'Flow', undefined], ['community', '이야기', undefined],
    ['activity', undefined, '내 활동'], ['legacy', '내 작업', '개인 Flow 상세'],
  ];
  for (const [view, activePrimary, activeAuxiliary] of cases) {
    const ctx = context(view, true);
    const active = nodes(primary(ctx)).filter(node => node.type === 'button' && node.props['aria-current'] === 'page');
    assert.deepEqual(active.map(node => text(node.props.children)), activePrimary ? [activePrimary] : [], view);
    const secondary = auxiliary(ctx).filter(node => node.props['aria-current'] === 'page');
    assert.deepEqual(secondary.map(node => text(node.props.children)), activeAuxiliary ? [activeAuxiliary] : [], view);
    const currentSummary = evaluate(summary, ctx) as Element;
    assert.equal(currentSummary.props['aria-current'], activeAuxiliary ? 'page' : undefined, view);
    if (activeAuxiliary) assert(currentSummary.props['aria-label'].includes(`현재 위치: ${activeAuxiliary}`), view);
  }
});

test('auxiliary activity and existing Flow detail retain their names and existing data condition', () => {
  for (const bindings of [false, true]) {
    const ctx = context('space', bindings), calls: ProgramDestination[] = [];
    ctx.navigate = (next: ProgramDestination) => calls.push(next);
    const buttons = auxiliary(ctx).filter(node => ['내 활동', '개인 Flow 상세'].includes(text(node.props.children)));
    assert.deepEqual(buttons.map(node => text(node.props.children)), bindings ? ['내 활동', '개인 Flow 상세'] : ['내 활동']);
    for (const button of buttons) button.props.onClick();
    assert.deepEqual(calls, bindings ? [{ view: 'activity' }, { view: 'legacy' }] : [{ view: 'activity' }]);
  }
  const actions = nodes(evaluate(jsx('div', 'managementActions'), context())).filter(node => node.type === 'button');
  assert.deepEqual(actions.map(node => text(node.props.children)), [
    '로그아웃 · 계정 바꾸기', '서버에서 다시 확인', '다시 실행', '백업 · 복원 · 가져오기',
  ]);
  assert.equal(primary({ ...context(), unavailable: true }), undefined);
  assert.deepEqual(auxiliary({ ...context(), unavailable: true }), []);
});

function guardedContext() {
  const ctx = context(), visits: ProgramDestination[] = [], routes: string[] = [], events: string[] = [];
  ctx.externalRef = { current: false };
  ctx.controller = { current: { snapshot: () => ({ pending: false }) } };
  ctx.destinationRef = { current: ctx.destination };
  ctx.disposed = { current: false };
  ctx.captureInput = () => { events.push('capture'); return true; };
  ctx.allEditors = () => [{
    lockInput: () => { events.push('lock'); return () => events.push('release'); },
    flushAll: async () => { events.push('flush'); return true; },
  }];
  ctx.creatorEntryReturn = { current: null };
  ctx.setCatalogDetailOpen = () => {};
  ctx.setCreatorEntryChoices = () => {};
  ctx.setCreatorSeen = () => {};
  ctx.setCreatorSelection = () => {};
  ctx.setDiscoverySelection = () => {};
  ctx.setCommunityView = () => {};
  ctx.setCommunitySelection = () => {};
  ctx.setSeen = () => {};
  ctx.setPublisher = () => {};
  ctx.setMessage = () => {};
  ctx.setOutput = () => {};
  ctx.setDestination = (next: ProgramDestination) => visits.push(next);
  ctx.programLocation = programLocation;
  ctx.window = { location: { hash: '#flowme/space' }, history: { pushState: (_state: unknown, _title: string, route: string) => routes.push(route) } };
  const navigate = evaluate(`(${declaration('navigate')})`, ctx);
  ctx.navigate = (next: ProgramDestination) => { ctx.flight = navigate(next); };
  return { ctx, visits, routes, events };
}

test('all global entries retain pending, external, input-capture and failed-flush barriers', async () => {
  for (const [label] of destinations) for (const blocker of ['pending', 'external', 'capture', 'flush']) {
    const { ctx, visits, routes } = guardedContext();
    if (blocker === 'pending') ctx.controller.current.snapshot = () => ({ pending: true });
    if (blocker === 'external') ctx.externalRef.current = true;
    if (blocker === 'capture') ctx.captureInput = () => false;
    if (blocker === 'flush') ctx.allEditors = () => [{ lockInput: () => () => {}, flushAll: async () => false }];
    const navigate = evaluate(`(${declaration('navigate')})`, ctx);
    ctx.navigate = (next: ProgramDestination) => { ctx.flight = navigate(next); };
    nodes(primary(ctx)).find(node => node.type === 'button' && text(node.props.children) === label)!.props.onClick();
    await ctx.flight;
    assert.deepEqual(visits, [], `${label}/${blocker}`);
    assert.deepEqual(routes, [], `${label}/${blocker}`);
    assert.equal(ctx.destinationRef.current.view, 'space', `${label}/${blocker}`);
  }
});

test('settling an old flush cannot navigate after disposal or a newer route visit', async () => {
  for (const newer of ['disposed', 'visit']) {
    const { ctx, visits, routes } = guardedContext();
    let settle!: (value: boolean) => void;
    ctx.allEditors = () => [{ lockInput: () => () => {}, flushAll: () => new Promise<boolean>(resolve => { settle = resolve; }) }];
    const navigate = evaluate(`(${declaration('navigate')})`, ctx);
    ctx.navigate = (next: ProgramDestination) => { ctx.flight = navigate(next); };
    nodes(primary(ctx)).find(node => node.type === 'button' && text(node.props.children) === 'Flow')!.props.onClick();
    if (newer === 'disposed') ctx.disposed.current = true;
    else ctx.destinationRef.current = { view: 'community' };
    settle(true);
    await ctx.flight;
    assert.deepEqual(visits, [], newer);
    assert.deepEqual(routes, [], newer);
  }
});

test('successful global navigation captures, locks and flushes before the existing route transition', async () => {
  const { ctx, visits, routes, events } = guardedContext();
  nodes(primary(ctx)).find(node => node.type === 'button' && text(node.props.children) === '이야기')!.props.onClick();
  await ctx.flight;
  assert.deepEqual(events, ['capture', 'lock', 'flush', 'release']);
  assert.deepEqual(visits, [{ view: 'community' }]);
  assert.deepEqual(routes, [programLocation({ view: 'community' })]);
});

test('shell defines one compact top navigation and a 216px rail only from 1200px', () => {
  const css = postcss.parse(readFileSync(new URL('./AlphaWorkspace.module.css', import.meta.url), 'utf8'));
  const desktop = css.nodes.find(node => node.type === 'atrule' && node.name === 'media' && node.params === '(min-width: 1200px)') as postcss.AtRule;
  assert(desktop);
  const declarations = new Map<string, string>();
  desktop.walkRules(rule => { rule.walkDecls(declaration => { declarations.set(`${rule.selector}:${declaration.prop}`, declaration.value); }); });
  assert.equal(declarations.get('.page:grid-template-columns'), '216px minmax(0, 1fr) auto');
  assert.equal(declarations.get('.globalNavigation:flex-direction'), 'column');
  assert.equal(declarations.get('.page > .header:grid-column'), '1');
  assert.equal(declarations.get('.sync > .management:grid-column'), '3');
  const defaults = new Map<string, string>();
  css.walkRules(rule => {
    if (rule.parent?.type !== 'root') return;
    rule.walkDecls(declaration => { defaults.set(`${rule.selector}:${declaration.prop}`, declaration.value); });
  });
  assert.equal(defaults.get('.page > .header:flex-wrap'), 'nowrap');
  assert.equal(defaults.get('.globalNavigation:display'), 'flex');
  assert.equal(defaults.get('.globalNavigation:position'), undefined);
  assert.equal(defaults.get('.page button:min-height'), '48px');
  assert.equal(defaults.get('.management > summary:min-width'), '48px');
  assert.equal(defaults.get('.managementBody:position'), 'absolute');
  assert.equal(defaults.get('.managementBody:overflow'), 'auto');
});
