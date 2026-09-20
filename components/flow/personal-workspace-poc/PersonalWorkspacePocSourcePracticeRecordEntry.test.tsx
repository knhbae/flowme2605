import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PersonalWorkspacePocSourceUpdateReview, type PersonalWorkspacePocSourceUpdateReviewProps as Props } from './PersonalWorkspacePocSourceUpdateReview';
import { setup, verifySourcePins } from './PersonalWorkspacePocSourcePractice.test-support';

// C3 only: actual JSX/closures + genuine C2 model fixture; SSR, not mounted/browser.
const DIR = 'components/flow/personal-workspace-poc/';
const beforeReview = readPocSourceBaseline('c3-review');
const beforeSurface = readPocSourceBaseline('c3-surface');
const review = fs.readFileSync(DIR + 'PersonalWorkspacePocSourceUpdateReview.tsx', 'utf8');
const surface = fs.readFileSync(DIR + 'PersonalWorkspacePocSurface.tsx', 'utf8');
const hash = (raw: string) => createHash('sha256').update(raw).digest('hex').toUpperCase();
assert.equal(hash(beforeReview), '4520F9FDCABF14B8A9DB6B5D87B494D762FBDCCE68475CB7437D7BCA586897AA');
assert.equal(hash(beforeSurface), '025C750D593175C7E439EB4F6DC7F726895FA482385A580495D6D2925EFE72B6');
const statuses = ['pending', 'applying', 'applied', 'undoing', 'failed', 'stale'] as const;
type Practice = NonNullable<Props['practice']> & { recordEntryOnly?: boolean };
type Input = Omit<Partial<Props>, 'practice'> & { practice?: Practice };
const props: Props = {
  candidate: { changeCount: 1, sourceLabel: '로컬 fixture', detectedAtLabel: '원문 비동기화' },
  changes: [{ changeId: 'title', kind: 'changed', label: '제목', baseValue: 'A', workingValue: 'A', incomingValue: '<B>' }],
  resolutions: { title: 'keep-working' }, selectedChangeId: 'title', status: 'pending', open: false,
  onOpen() {}, onDefer() {}, onSelectChange() {}, onResolve() {}, onApply() {}, onRetry() {}, onRefreshCandidate() {}, onUndo() {},
};
const render = (extra: Input = {}) => renderToStaticMarkup(<PersonalWorkspacePocSourceUpdateReview {...props} {...extra} />);
const bannerTag = (html: string) => {
  const found = html.match(/<section\b[^>]*data-testid="personal-workspace-source-update-banner"[^>]*>/);
  assert.ok(found); return found[0];
};
function historical() {
  const code = ts.transpileModule(beforeReview, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const module = { exports: {} as { PersonalWorkspacePocSourceUpdateReview: React.ComponentType<Props> } };
  new Function('require', 'module', 'exports', code)((name: string) => { assert.equal(name, 'react'); return React; }, module, module.exports);
  return module.exports.PersonalWorkspacePocSourceUpdateReview;
}

test('C3-RE01 default twelve variants and practice opt-out preserve exact C2 HTML', () => {
  const Before = historical();
  for (const status of statuses) for (const open of [false, true]) {
    assert.equal(render({ status, open }), renderToStaticMarkup(<Before {...props} status={status} open={open} />));
    const practice = { locked: false, canUndo: false };
    assert.equal(render({ status, open, practice: { ...practice, recordEntryOnly: false } }),
      renderToStaticMarkup(<Before {...props} status={status} open={open} practice={practice} />));
  }
});

test('C3-RE02 only normal closed pending/applied banners hide and remain inert without callbacks', () => {
  let calls = 0;
  for (const status of ['pending', 'applied'] as const) {
    const input: Input = { status, practice: { locked: false, canUndo: false, recordEntryOnly: true },
      onOpen: () => calls++, onUndo: () => calls++, onDefer: () => calls++ };
    const before = JSON.stringify(input), html = render(input), tag = bannerTag(html);
    assert.match(tag, /\shidden=""/); assert.match(tag, /\sinert=""/); assert.match(tag, /aria-hidden="true"/);
    assert.match(tag, /class="hidden /, 'flex cannot override native hidden display');
    assert.doesNotMatch(html, /data-testid="personal-workspace-source-update-dialog"/);
    assert.equal(JSON.stringify(input), before);
  }
  assert.equal(calls, 0);
});

test('C3-RE03 failed/stale/busy/recovery/retained errors never disappear behind record-only mode', () => {
  const Before = historical();
  const cases: Input[] = [
    ...(['failed', 'stale', 'applying', 'undoing'] as const).map(status => ({ status })),
    { status: 'pending', practice: { locked: true, canUndo: false, recordEntryOnly: true } },
    { status: 'applied', practice: { locked: true, canUndo: false, recordEntryOnly: true } },
    { status: 'pending', errorMessage: '보존된 오류' },
    { status: 'applied', errorMessage: '저장 사실 재확인 필요' },
  ];
  for (const extra of cases) {
    const html = render({ practice: { locked: false, canUndo: false, recordEntryOnly: true }, ...extra });
    assert.doesNotMatch(bannerTag(html), /\shidden=""/);
    assert.match(bannerTag(html), /class="flex /);
    const { recordEntryOnly: _presentation, ...practice } = extra.practice ?? { locked: false, canUndo: false };
    assert.equal(html, renderToStaticMarkup(<Before {...props} {...extra} practice={practice} />),
      'preserve existing status/error presentation, not invent pending/applied error copy');
  }
});

test('C3-RE04 open comparisons preserve exact six-state dialog, selected radio and failure focus markup', () => {
  const Before = historical();
  for (const status of statuses) {
    const practice = { locked: status === 'failed', canUndo: false, returnFocusSelector: '#heading' };
    const html = render({ open: true, status, practice: { ...practice, recordEntryOnly: true } });
    assert.equal(html, renderToStaticMarkup(<Before {...props} open status={status} practice={practice} />));
    assert.match(html, /data-testid="personal-workspace-source-update-dialog"/);
    assert.match(html, /data-testid="personal-workspace-source-update-choice-keep-working"[^>]*checked/);
  }
});

function actualEntry(f: ReturnType<typeof setup>) {
  const ast = ts.createSourceFile('surface.tsx', surface, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const wanted = ['selectedSourceCandidateId', 'sourceUpdateEnvelope', 'sourceUpdateReview', 'sourceUpdateChanges', 'sourceUpdateResolutions', 'effectiveSourceUpdateStatus'];
  const declarations = new Map<string, string>(), helpers: string[] = [], expressions: ts.JsxExpression[] = [];
  const walk = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && wanted.includes(node.name.text) && node.initializer) {
      assert.equal(declarations.has(node.name.text), false); declarations.set(node.name.text, `const ${node.name.text}=${node.initializer.getText(ast)};`);
    }
    if (ts.isFunctionDeclaration(node) && ['personalWorkspacePocSourceUpdateItemValue', 'buildPersonalWorkspacePocSourceUpdateChanges'].includes(node.name?.text ?? '')) {
      helpers.push(node.getText(ast).replace(/^export\s+/, ''));
    }
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some(a => ts.isJsxAttribute(a)
      && a.name.getText(ast) === 'data-testid' && a.initializer?.getText(ast) === '"personal-workspace-flow-detail"')) {
      expressions.push(...node.children.filter((child): child is ts.JsxExpression => ts.isJsxExpression(child)).slice(0, 2));
    }
    ts.forEachChild(node, walk);
  };
  walk(ast); assert.equal(declarations.size, wanted.length); assert.equal(helpers.length, 2); assert.equal(expressions.length, 2);
  assert.match(expressions[0].getText(ast), /personal-workspace-source-practice-records/);
  assert.match(expressions[1].getText(ast), /PersonalWorkspacePocSourceUpdateReview/);
  const code = ts.transpileModule([...helpers, ...wanted.map(name => declarations.get(name)),
    'const tree=<>' + expressions.map(e => e.getText(ast)).join('') + '</>;'].join('\n'), {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const env = { ...f.values, React, PersonalWorkspacePocSourceUpdateReview, useMemo: (fn: () => unknown) => fn(),
    flow: f.materialized.flow, selectedFlowRef: f.materialized.flow.ref,
    sourceCandidateStore: f.sourceCandidateStoreRef.current,
    sourcePracticeRead: f.actual.inspectSourcePractice(f.sourceCandidateStoreRef.current, f.materialized.flow.ref),
    sourcePracticeSelections: f.values.sourcePracticeSelections, sourceUpdateLaterChangeIds: {}, sourceUpdateStatus: 'pending',
    sourceUpdateOpen: false, sourceUpdateError: undefined, planEditor: { active: undefined }, quickEditor: { active: undefined },
    planDisplay: undefined, receipt: undefined, SECONDARY_CLASS: 'test-secondary',
    sourceUpdateSelectedChangeId: f.envelope.envelope.changes[0].changeId, ...f.actual,
  };
  return (overrides: Record<string, unknown> = {}) => new Function('env', 'with(env){' + code + ';return tree;}')({ ...env, ...overrides }) as React.ReactElement;
}
function allElements(node: React.ReactNode): React.ReactElement<Record<string, any>>[] {
  if (Array.isArray(node)) return node.flatMap(allElements);
  if (!React.isValidElement<Record<string, any>>(node)) return [];
  return [node, ...allElements(node.props.children)];
}

test('C3-RE05 actual selected-record JSX retains exact reopen/defer decisions; missing/foreign selection cannot hide sole entry', () => {
  const f = setup();
  const id = f.envelope.envelope.candidateId;
  f.actual.deferSourceUpdateReview();
  const before = JSON.stringify(f.sourceCandidateStoreRef.current);
  const renderEntry = actualEntry(f), tree = renderEntry();
  const nodes = allElements(tree);
  const selected = nodes.find(n => n.type === PersonalWorkspacePocSourceUpdateReview);
  assert.ok(selected, 'actual selected candidate gate passes');
  assert.equal(selected.props.practice.recordEntryOnly, true);
  const record = nodes.find(n => n.props['data-testid'] === 'personal-workspace-source-practice-record' && n.props['data-candidate-id'] === id);
  assert.ok(record); assert.equal(record.props.disabled, false);
  const html = renderToStaticMarkup(tree);
  assert.match(bannerTag(html), /\shidden=""/);
  assert.match(html, /personal-workspace-source-practice-record/);
  assert.equal(JSON.stringify(f.sourceCandidateStoreRef.current), before); assert.deepEqual(f.calls, []);
  record.props.onClick(); assert.equal(f.values.sourcePracticeOwner.current.candidateId, id);
  const decisions = JSON.stringify(f.sourceCandidateStoreRef.current.reviews[id].resolutions);
  selected.props.onDefer('button');
  assert.equal(JSON.stringify(f.sourceCandidateStoreRef.current.reviews[id].resolutions), decisions);
  assert.deepEqual(f.calls, []);
  for (const override of [ { sourcePracticeSelections: {} }, { sourcePracticeSelections: { [f.materialized.flow.ref]: 'foreign-candidate' } }, { sourcePracticeRead: undefined } ]) {
    assert.equal(allElements(renderEntry(override)).filter(n => n.type === PersonalWorkspacePocSourceUpdateReview).length, 0);
  }
  assert.equal(f.facts().writerCalls, 0); assert.equal(f.facts().sentinelEqual, true); f.cleanup();
});

test('C3-RE06 source owner/effect bodies remain exact; actual applied record remains the single Undo entry', () => {
  const collect = (raw: string) => {
    const ast = ts.createSourceFile('actual.tsx', raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const found: string[] = [];
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ['useEffect', 'useLayoutEffect'].includes(n.expression.text)) found.push(n.getText(ast));
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && /^(?:runSourcePracticeWrite|applySourceUpdate|undoSourceUpdate|sourcePracticeOwnerCurrent|deferSourceUpdateReview|openSourceUpdateReview)$/.test(n.name.text)) found.push(n.getText(ast));
      ts.forEachChild(n, visit);
    }; visit(ast); assert.ok(found.length >= 2); return found;
  };
  assert.deepEqual(collect(surface), collect(beforeSurface));
  assert.deepEqual(collect(review), collect(beforeReview));
  const f = setup('undo'), tree = actualEntry(f)();
  const nodes = allElements(tree), presenter = nodes.find(n => n.type === PersonalWorkspacePocSourceUpdateReview);
  assert.ok(presenter); assert.equal(presenter.props.status, 'applied');
  assert.equal(presenter.props.practice.canUndo, false);
  const undo = nodes.filter(n => n.props['data-testid'] === 'personal-workspace-source-practice-undo');
  assert.equal(undo.length, 1); assert.equal(undo[0].props['data-candidate-id'], f.envelope.envelope.candidateId);
  assert.match(bannerTag(renderToStaticMarkup(tree)), /\shidden=""/);
  assert.deepEqual(f.calls, []); f.cleanup();
});

test.after(() => {
  verifySourcePins();
  assert.equal(fs.readFileSync(DIR + 'PersonalWorkspacePocSourceUpdateReview.tsx', 'utf8'), review);
});
import { readPocSourceBaseline } from '../../../tests/fixtures/poc-source-baselines/read';
