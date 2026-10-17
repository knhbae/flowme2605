import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import postcss from 'postcss';
import ts from 'typescript';

// Synthetic source/JSX contracts only. Actual viewport geometry is a browser
// check; this suite does not claim real-device or observed-user validation.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const shell = ts.createSourceFile('AlphaWorkspace.tsx', read('./AlphaWorkspace.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const editor = ts.createSourceFile('ProgramTextEditor.tsx', read('./ProgramTextEditor.tsx'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function find(tree: ts.SourceFile, predicate: (node: ts.Node) => boolean): ts.Node {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) found ??= node; ts.forEachChild(node, visit); }
  visit(tree); assert(found); return found;
}
const initializer = (tree: ts.SourceFile, name: string) => (find(tree, node => ts.isVariableDeclaration(node) && node.name.getText(tree) === name) as ts.VariableDeclaration).initializer!.getText(tree);
function classElement(tree: ts.SourceFile, name: string): ts.JsxElement {
  return find(tree, node => ts.isJsxElement(node) && node.openingElement.attributes.properties.some(attribute => ts.isJsxAttribute(attribute)
    && attribute.name.getText(tree) === 'className' && attribute.initializer?.getText(tree) === `{styles.${name}}`)) as ts.JsxElement;
}
function evaluator(expression: string, context: Record<string, any>) {
  const keys = Object.keys(context);
  const code = ts.transpileModule(`const value = ${expression};`, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
  const run = new Function('React', ...keys, `${code}; return value;`);
  return (value: Record<string, any> = context) => run(React, ...keys.map(key => value[key]));
}
const evaluate = (expression: string, context: Record<string, any>) => evaluator(expression, context)();
type Element = { type: any; props: Record<string, any> };
const nodes = (value: any): Element[] => Array.isArray(value) ? value.flatMap(nodes) : !value || typeof value !== 'object' || !value.props ? [] : [value, ...nodes(value.props.children)];
const text = (value: any): string => Array.isArray(value) ? value.map(text).join('') : value == null || typeof value === 'boolean' ? '' : typeof value === 'object' ? text(value.props?.children) : String(value);
const button = (value: any, label: string) => { const result = nodes(value).find(node => node.type === 'button' && text(node) === label); assert(result); return result; };
const styles = new Proxy({}, { get: (_, key) => String(key) });
function shellContext() {
  return { styles, storageError: false, localParticipationRecovery: null as any, pending: false, external: false,
    snapshot: { status: 'ready', busy: false, draft: null, retryableRejectedDraft: false, retryableNativeHandoff: false, retryableRejectedSocialDraft: false } as any,
    destination: { view: 'space' }, unavailable: false, recoveries: null as any, reviewOwnsAnnouncement: false,
    labels: evaluate(initializer(shell, 'labels'), {}), message: '', participationMessage: false,
    needsInputProtection: false, inputProtection: null as any, personalRecovery: null as any,
    controller: { current: { resolvePending: async (_retry: boolean) => false } },
    setMessage(_value: string) {}, resolvePendingResult: async () => {}, openLatest() {}, restoreDraft(_index: number) {}, clearDrafts() {}, history(_direction: string) {},
    navigator: { clipboard: { writeText: async (_raw: string) => {} } }, AlphaConflictReview: 'conflict-review' };
}
function shellStatusContext(context: Record<string, any>) {
  return { ...context, usesNoteChrome: evaluate(initializer(shell, 'usesNoteChrome'), context),
    serverUndo: evaluate(initializer(shell, 'serverUndo'), context) };
}
function statusEvaluator(context: Record<string, any>) {
  return (value = context) => evaluate(classElement(shell, 'statusRow').getText(shell), shellStatusContext(value));
}
function editorContext() {
  return { styles, draft: { error: 'Synthetic save result requires confirmation', invalid: false, saving: false, dirty: true },
    props: { readOnly: false, disabledReason: '', folderId: '' }, inputLocked: false, regionPending: false,
    composingRef: { current: false }, progressConflict: null as any, showProgressConflict() {}, saveNow: async () => false, downloadDraft() {},
    draftRef: { current: { discard: (_workspace: unknown) => false, getState: () => ({ raw: 'exact raw' }) } },
    propsRef: { current: { workspace: {} } }, orderHistoryRef: { current: { clear() {} } }, orderPositionsRef: { current: [] as unknown[] },
    orderEpochRef: { current: 0 }, editorRef: { current: { setValue(_raw: string, _options: unknown) {} } } };
}
function declarations(path: string, selector: string) {
  const result = new Map<string, string>();
  postcss.parse(read(path)).walkRules(rule => { if (rule.selector === selector) rule.walkDecls(decl => { result.set(decl.prop, decl.value); }); });
  return result;
}

test('44px reserved Alpha row and bounded recovery overlays do not introduce an in-flow notice body', () => {
  const row = declarations('./AlphaWorkspace.module.css', '.sync > .statusRow');
  assert.equal(row.get('min-height'), '44px'); assert.equal(row.get('position'), 'relative');
  assert.equal(row.get('flex-wrap'), 'nowrap'); assert.equal(row.get('align-items'), 'center');
  const status = declarations('./AlphaWorkspace.module.css', '.statusRow > p[data-save-state]');
  assert.equal(status.get('white-space'), 'nowrap'); assert.equal(status.get('margin'), '0');
  assert.equal(status.get('text-overflow'), 'ellipsis');
  const noteStatus = declarations('./AlphaWorkspace.module.css', '.page[data-note-layout="true"] .statusRow > p[data-save-state]');
  assert.equal(noteStatus.get('min-height'), '20px'); assert.equal(noteStatus.get('line-height'), '20px');
  assert.equal(declarations('./AlphaWorkspace.module.css', '.page[data-note-layout="true"] .statusRow').get('flex-wrap'), 'wrap');
  assert.equal(declarations('./AlphaWorkspace.module.css', '.page .inputRecovery > summary').get('min-height'), '44px');
  for (const [path, selector] of [['./AlphaWorkspace.module.css', '.inputRecoveryBody'], ['./ProgramTextEditor.module.css', '.saveFeedback > .error']]) {
    const body = declarations(path, selector);
    assert.equal(body.get('position'), 'absolute'); assert.equal(body.get('top'), 'calc(100% + 4px)');
    assert.equal(body.get('left'), '0'); assert.equal(body.get('right'), '0');
    assert.equal(body.get('max-height'), 'min(52dvh, 420px)'); assert.equal(body.get('overflow'), 'auto');
    assert.equal(body.get('overscroll-behavior'), 'contain'); assert(Number(body.get('z-index')) > 0);
    assert.notEqual(body.get('display'), 'none'); assert.notEqual(body.get('visibility'), 'hidden');
  }
  assert.equal(declarations('./ProgramTextEditor.module.css', '.toolbar').get('position'), 'relative');
  assert.equal(declarations('./AlphaWorkspace.module.css', '.inputRecoveryBody textarea').get('font-size'), '16px');
  const message = declarations('./AlphaWorkspace.module.css', '.statusRow > .feedbackMessage');
  assert.equal(message.get('position'), undefined); assert.equal(message.get('flex'), '1 1 0');
  assert.equal(message.get('min-width'), '44px'); assert.equal(message.get('overflow'), undefined);
  const messageSummary = declarations('./AlphaWorkspace.module.css', '.page .feedbackMessage > summary');
  assert.equal(messageSummary.get('min-height'), '44px'); assert.equal(messageSummary.get('font-size'), '12px');
  assert.equal(messageSummary.get('line-height'), '20px');
  const messagePreview = declarations('./AlphaWorkspace.module.css', '.feedbackMessage > summary > span');
  assert.equal(messagePreview.get('min-width'), '0'); assert.equal(messagePreview.get('white-space'), 'nowrap');
  assert.equal(messagePreview.get('overflow'), 'hidden'); assert.equal(messagePreview.get('text-overflow'), 'ellipsis');
  const messageBody = declarations('./AlphaWorkspace.module.css', '.inputRecoveryBody > .feedbackMessageText');
  assert.equal(messageBody.get('font-size'), '14px'); assert.equal(messageBody.get('line-height'), '1.6');
  assert.equal(messageBody.get('overflow-wrap'), 'anywhere'); assert.equal(messageBody.get('overflow'), undefined);
  assert.equal(messageBody.get('white-space'), undefined);
});

test('narrow editor feedback yields to fixed toolbar controls and fits two readable lines inside its 48px trigger', () => {
  const disclosure = declarations('./ProgramTextEditor.module.css', '.saveFeedback');
  assert.equal(disclosure.get('flex'), '1 1 0'); assert.equal(disclosure.get('min-width'), '0');
  assert.equal(disclosure.get('max-width'), '120px'); assert.equal(disclosure.get('margin-left'), 'auto');
  const summary = declarations('./ProgramTextEditor.module.css', '.editor .saveFeedback > summary');
  assert.equal(summary.get('min-height'), '48px'); assert.equal(summary.get('box-sizing'), 'border-box');
  assert.equal(summary.get('padding'), '6px'); assert.equal(summary.get('font-size'), '12px');
  assert.equal(summary.get('line-height'), '18px');
  assert.equal(summary.get('white-space'), 'normal'); assert.equal(summary.get('word-break'), 'keep-all');
  assert.notEqual(summary.get('display'), 'none'); assert.notEqual(summary.get('overflow'), 'hidden');
  assert.notEqual(summary.get('text-overflow'), 'ellipsis');
  assert.equal(2 * 18 + 2 * 6, 48, 'two lines plus padding preserve the reserved trigger height');
  assert.equal(declarations('./ProgramTextEditor.module.css', '.editorTools').get('flex'), '0 0 auto');
  assert.equal(declarations('./ProgramTextEditor.module.css', '.saveFeedback > .error').get('position'), 'absolute');
});

test('saved Undo retains its handler, guards and 48px target in note management or the non-note status row', () => {
  for (const view of ['space', 'legacy']) {
    const context = shellContext(), calls: string[] = [];
    context.destination.view = view; context.history = direction => { calls.push(direction); };
    const render = () => {
      const scoped = shellStatusContext(context);
      return [evaluate(classElement(shell, 'statusRow').getText(shell), scoped),
        evaluate(classElement(shell, 'managementActions').getText(shell), scoped)];
    };
    for (const canUndo of [false, true]) for (const external of [false, true]) {
      context.snapshot.canUndo = canUndo; context.external = external;
      const [row, management] = render(), list = nodes([row, management]);
      const undos = list.filter(node => node.type === 'button' && text(node) === '되돌리기');
      assert.equal(undos.length, 1, `${view}:${canUndo}:${external}`);
      assert.equal(nodes(row).includes(undos[0]), view !== 'space');
      assert.equal(nodes(management).includes(undos[0]), view === 'space');
      assert.equal(undos[0].props.disabled, !canUndo || external);
      if (canUndo && !external) undos[0].props.onClick();
    }
    assert.deepEqual(calls, ['undo']);
  }
  assert.equal(declarations('./AlphaWorkspace.module.css', '.page button').get('min-height'), '48px');
  assert.equal(declarations('./AlphaWorkspace.module.css', '.page button').get('min-width'), '48px');
  assert.equal(declarations('./AlphaWorkspace.module.css', '.sync > .statusRow').get('grid-column'), '2 / -1');
  const style = declarations('./AlphaWorkspace.module.css', '.statusRow > button');
  assert.equal(style.get('flex'), '0 0 auto'); assert.equal(style.get('min-height'), '48px');
  const recovery = declarations('./AlphaWorkspace.module.css', '.inputRecovery');
  assert.equal(recovery.get('flex'), '0 1 auto'); assert.equal(recovery.get('min-width'), '44px');
  const summary = declarations('./AlphaWorkspace.module.css', '.page .inputRecovery > summary');
  assert.equal(summary.get('overflow'), 'hidden'); assert.equal(summary.get('text-overflow'), 'ellipsis');
});

test('protection trigger exactly matches existing visible protection, including normal saving with pending input', () => {
  const context = shellContext(), needs = evaluator(initializer(shell, 'needsInputProtection'), context), protection = evaluator(initializer(shell, 'inputProtection'), context);
  let combinations = 0;
  for (const status of ['ready', 'saving', 'checking-result', 'conflict']) for (let flags = 0; flags < 256; flags++) {
    context.snapshot = { status, busy: status === 'saving', draft: flags & 1 ? {} : null, retryableRejectedDraft: !!(flags & 2),
      retryableNativeHandoff: !!(flags & 4), retryableRejectedSocialDraft: !!(flags & 8) };
    context.pending = !!(flags & 16); context.external = !!(flags & 32); context.storageError = !!(flags & 64);
    context.localParticipationRecovery = flags & 128 ? {} : null;
    const visible = nodes(protection(context)).some(node => node.props.className === 'problem');
    assert.equal(!!needs(context), visible, `${status}:${flags}`); combinations++;
  }
  assert.equal(combinations, 1024);
  Object.assign(context, { storageError: false, localParticipationRecovery: null, pending: true, external: false,
    snapshot: { status: 'saving', busy: true, draft: {}, retryableRejectedDraft: false, retryableNativeHandoff: false, retryableRejectedSocialDraft: false } });
  assert.equal(!!needs(context), false); assert.equal(nodes(protection(context)).filter(node => node.props.className === 'problem').length, 0);
});

test('Alpha status retains unknown versus confirmed-rejected meaning and exposes recovery without hiding the alert', () => {
  const context = shellContext(), row = statusEvaluator(context);
  const needs = evaluator(initializer(shell, 'needsInputProtection'), context);
  for (const state of [
    { status: 'ready', pending: false, rejected: false, warning: null },
    { status: 'saving', pending: true, rejected: false, warning: null },
    { status: 'checking-result', pending: true, rejected: false, warning: '저장 결과 확인' },
    { status: 'ready', pending: false, rejected: true, warning: '저장되지 않음 · 확인' },
    { status: 'conflict', pending: false, rejected: false, warning: '입력 보호 · 확인' },
  ]) {
    context.pending = state.pending; context.snapshot = { status: state.status, retryableRejectedDraft: state.rejected };
    context.needsInputProtection = !!needs(context);
    const tree = row(context), list = nodes(tree), alert = list.find(node => node.props.role === 'alert');
    assert.equal(alert ? text(alert) : null, state.warning);
    const status = list.find(node => node.props['data-save-state']); assert(status);
    assert.equal(status.props.role, 'status'); assert.equal(status.props['aria-live'], 'polite');
    if (state.pending && state.status !== 'saving') assert.doesNotMatch(text(status), /저장되지 않|저장 거절/);
    if (alert) {
      const disclosure = list.find(node => node.type === 'details')!;
      assert.equal(disclosure.props.open, undefined); assert.equal(disclosure.props.hidden, undefined);
      assert.equal(disclosure.props.name, 'program-input-feedback');
      assert(list.some(node => node.props.className === 'inputRecoveryBody'));
    }
  }
  context.storageError = true; context.needsInputProtection = true;
  assert.equal(text(nodes(row(context)).find(node => node.props.role === 'alert')), '입력 보관 실패 · 확인');
  for (const exactMessage of [
    'Synthetic message-only guard: continue writing after completing the pending action, then retry without losing the exact input.',
    '작성 중인 내용을 먼저 저장하거나 보관해 주세요.',
  ]) {
    context.message = exactMessage;
    const message = nodes(row(context)).find(node => node.props.className === 'feedbackMessage')!;
    assert.equal(message.type, 'details'); assert.equal(message.props.name, 'program-input-feedback');
    assert.equal(message.props.open, undefined); assert.equal(message.props.hidden, undefined);
    const summary = nodes(message).find(node => node.type === 'summary')!;
    assert.equal(text(summary), `안내 · ${exactMessage}`); assert.equal(summary.props.title, exactMessage);
    assert.equal(nodes(summary).find(node => node.type === 'span')!.props.role, 'status');
    assert(nodes(message).some(node => node.props.className === 'inputRecoveryBody'));
    assert.equal(text(nodes(message).find(node => node.props.className === 'feedbackMessageText')), exactMessage);
  }
  context.participationMessage = true;
  assert(!nodes(row(context)).some(node => node.props.className === 'feedbackMessage'));
  context.participationMessage = false;
  context.destination.view = 'discover'; assert.equal(nodes(row(context)).filter(node => node.type === 'details').length, 0);
});

test('non-note status keeps exact save meaning while recovery remains in the existing separate protection section', () => {
  for (const view of ['legacy', 'discover']) for (const state of [
    { status: 'ready', pending: false, rejected: false, label: '서버와 연결됨', protection: null },
    { status: 'saving', pending: true, rejected: false, label: '서버에 저장 중…', protection: null },
    { status: 'checking-result', pending: true, rejected: false, label: '저장 결과 확인이 필요합니다', protection: '저장 결과 복구' },
    { status: 'ready', pending: false, rejected: true, label: '저장 거절 · 입력 보존됨', protection: '거절된 저장과 입력 보호' },
    { status: 'conflict', pending: false, rejected: false, label: '다른 변경이 먼저 저장되었습니다', protection: '다른 기기 변경과 입력 보호' },
  ]) {
    const context = shellContext(); context.destination.view = view; context.pending = state.pending;
    context.snapshot = { status: state.status, busy: false, retryableRejectedDraft: state.rejected };
    const row = statusEvaluator(context)(), status = nodes(row).find(node => node.props['data-save-state'])!;
    assert.equal(text(status), state.label, `${view}:${state.status}:${state.rejected}`);
    assert.equal(status.props.role, 'status'); assert.equal(status.props['aria-live'], 'polite');
    assert.equal(nodes(row).filter(node => node.type === 'details').length, 0);
    const protection = nodes(evaluate(initializer(shell, 'inputProtection'), context));
    const section = protection.find(node => node.props.className === 'problem');
    assert.equal(section?.props['aria-label'] ?? null, state.protection);
    if (state.protection === '저장 결과 복구') {
      assert(text(section).includes('서버에 저장됐을 수 있습니다'));
      assert.equal(button(section, '저장 결과 확인 · 같은 요청 재시도').props.disabled, false);
    }
    if (state.protection === '거절된 저장과 입력 보호') assert(text(section).includes('저장되지 않았습니다'));
    if (state.pending && state.status !== 'saving') assert.doesNotMatch(text(status), /저장되지 않|저장 거절/);
  }
});

test('editor error summary stays visible and does not falsely claim that an unknown commit was not saved', () => {
  const feedback = classElement(editor, 'saveFeedback');
  assert(ts.isConditionalExpression(feedback.parent));
  const context = editorContext(), render = evaluator(feedback.parent.getText(editor), context);
  for (const state of [
    { readOnly: false, locked: false, label: '저장 확인 필요 · 복구' },
    { readOnly: true, locked: false, label: '읽기 전용 · 복구' },
    { readOnly: false, locked: true, label: '입력 보호 · 복구' },
  ]) {
    context.props.readOnly = state.readOnly; context.inputLocked = state.locked;
    const tree = render(context), list = nodes(tree), summary = list.find(node => node.type === 'summary')!;
    assert.equal(text(summary), state.label); assert.doesNotMatch(text(summary), /저장되지 않음/);
    assert.equal(summary.props.title, state.readOnly ? '읽기 전용' : context.draft.error);
    assert.equal(tree.props.open, undefined); assert.equal(tree.props.hidden, undefined);
    assert.equal(tree.props.name, 'program-input-feedback');
    assert(list.some(node => node.props.role === 'alert'));
    assert.equal(text(list.find(node => node.type === 'p')), context.draft.error);
  }
  context.props.readOnly = false; context.inputLocked = false; context.draft.error = '';
  context.draft.saving = true; assert.equal(text(render(context)), '저장 중…');
  context.draft.saving = false; assert.equal(text(render(context)), '편집 중');
  context.draft.dirty = false; assert.equal(text(render(context)), '저장됨');
});

test('recovery Escape ignores composing, other keys and closed menus; closing focuses summary without scrolling', () => {
  const shellCtx = shellContext(); shellCtx.needsInputProtection = true;
  shellCtx.message = 'Synthetic message-only input guard with a full readable reason';
  shellCtx.recoveries = { drafts: [{ title: 'Synthetic', raw: 'exact\nraw  ' }] };
  const alpha = nodes(statusEvaluator(shellCtx)()).find(node => node.type === 'details')!;
  const message = nodes(statusEvaluator(shellCtx)()).find(node => node.props.className === 'feedbackMessage')!;
  const personal = evaluate(initializer(shell, 'personalRecovery'), shellCtx);
  const editorCtx = editorContext(), feedback = evaluate(classElement(editor, 'saveFeedback').getText(editor), editorCtx);
  for (const disclosure of [alpha, personal, feedback, message]) {
    for (const [key, composing, open] of [['Enter', false, true], ['Escape', true, true], ['Escape', false, false], ['Escape', false, true]] as const) {
      const calls: unknown[] = [], target = { open, querySelector: (selector: string) => { assert.equal(selector, 'summary'); return { focus: (options: unknown) => calls.push(options) }; } };
      disclosure.props.onKeyDown({ key, nativeEvent: { isComposing: composing }, currentTarget: target,
        preventDefault: () => calls.push('prevent'), stopPropagation: () => calls.push('stop') });
      if (key === 'Escape' && !composing && open) { assert.equal(target.open, false); assert.deepEqual(calls, ['prevent', 'stop', { preventScroll: true }]); }
      else { assert.equal(target.open, open); assert.deepEqual(calls, []); }
    }
  }
  editorCtx.composingRef.current = true; const target = { open: true };
  feedback.props.onKeyDown({ key: 'Escape', nativeEvent: { isComposing: false }, currentTarget: target,
    preventDefault: () => assert.fail('ongoing composition must not be cancelled'), stopPropagation: () => assert.fail() });
  assert.equal(target.open, true);
});

test('personal recovery keeps exact raw, count, scope, actions and all existing restore guards', async () => {
  const context = shellContext(), calls: unknown[] = [], raw = 'Synthetic\n- [ ] exact  \n';
  context.recoveries = { drafts: [{ title: 'Synthetic input', raw }] };
  context.navigator.clipboard.writeText = async value => { calls.push(['copy', value]); };
  context.restoreDraft = index => { calls.push(['restore', index]); }; context.clearDrafts = () => { calls.push('clear'); };
  const render = evaluator(initializer(shell, 'personalRecovery'), context);
  const tree = render(context), list = nodes(tree);
  assert.equal(tree.props.className, 'inputRecovery'); assert.equal(tree.props.open, false);
  assert.equal(tree.props.name, 'program-input-feedback');
  assert.equal(text(list.find(node => node.type === 'summary')), '보관한 입력 1개');
  assert(list.some(node => node.props.className === 'inputRecoveryBody'));
  const area = list.find(node => node.type === 'textarea')!; assert.equal(area.props.value, raw); assert.equal(area.props.readOnly, true);
  for (const guard of ['unavailable', 'pending', 'external', 'draft']) {
    if (guard === 'draft') context.snapshot.draft = {}; else (context as Record<string, any>)[guard] = true;
    assert.equal(button(render(context), '새 문서로 복구').props.disabled, true);
    if (guard === 'draft') context.snapshot.draft = null; else (context as Record<string, any>)[guard] = false;
  }
  assert.equal(button(render(context), '새 문서로 복구').props.disabled, false);
  button(tree, '원문 복사').props.onClick(); await Promise.resolve();
  button(tree, '새 문서로 복구').props.onClick(); button(tree, '보관 입력 버리기').props.onClick();
  assert.deepEqual(calls, [['copy', raw], ['restore', 0], 'clear']);
  context.destination.view = 'discover'; const other = render(context);
  assert.equal(other.props.className, 'recovery'); assert(!nodes(other).some(node => node.props.className === 'inputRecoveryBody'));
  assert.equal(other.props.name, undefined);
});

test('editor recovery retains retry, download, progress and discard callbacks plus existing disabled guards', () => {
  const context = editorContext(), calls: unknown[] = [];
  context.saveNow = async () => { calls.push('save'); return false; }; context.downloadDraft = () => { calls.push('download'); };
  context.showProgressConflict = () => { calls.push('progress'); }; context.progressConflict = {};
  context.draftRef.current.discard = value => { calls.push(['discard', value]); return true; };
  context.orderHistoryRef.current.clear = () => { calls.push('history-clear'); };
  context.editorRef.current.setValue = (raw, options) => { calls.push(['set-value', raw, options]); };
  context.orderPositionsRef.current = ['old'];
  const render = evaluator(classElement(editor, 'saveFeedback').getText(editor), context), tree = render(context);
  for (const guard of ['readOnly', 'invalid', 'saving']) {
    if (guard === 'readOnly') context.props.readOnly = true; else context.draft[guard as 'invalid' | 'saving'] = true;
    assert.equal(button(render(context), '다시 저장').props.disabled, true);
    if (guard === 'readOnly') context.props.readOnly = false; else context.draft[guard as 'invalid' | 'saving'] = false;
  }
  for (const guard of ['inputLocked', 'saving']) {
    if (guard === 'inputLocked') context.inputLocked = true; else context.draft.saving = true;
    assert.equal(button(render(context), '저장본으로 되돌리기').props.disabled, true);
    context.inputLocked = false; context.draft.saving = false;
  }
  button(tree, '다시 저장').props.onClick(); button(tree, '입력한 원문 받기').props.onClick();
  button(tree, '진행 조절 보기').props.onClick(); button(tree, '저장본으로 되돌리기').props.onClick();
  assert.deepEqual(calls, ['save', 'download', 'progress', ['discard', context.propsRef.current.workspace], 'history-clear', ['set-value', 'exact raw', { preserveSelection: true }]]);
  assert.deepEqual(context.orderPositionsRef.current, []); assert.equal(context.orderEpochRef.current, 1);
  context.progressConflict = null; assert(!nodes(render(context)).some(node => node.type === 'button' && text(node) === '진행 조절 보기'));
});

test('presentation wrappers retain current recovery callbacks, disabled guards and review ownership', async () => {
  // Keep the wrapper contracts exact, and execute the current recovery helper
  // so delegating from JSX cannot drop its success and review-visit guards.
  const contracts: [ts.SourceFile, string][] = [
    [shell, '<button type="button" disabled={snapshot?.busy} onClick={() => void resolvePendingResult()}>저장 결과 확인 · 같은 요청 재시도</button>'],
    [shell, '<button type="button" disabled={snapshot?.busy} onClick={() => void openLatest()}>입력 보관 후 최신 내용 열기</button>'],
    [shell, '<button type="button" disabled={unavailable || pending || external || !!snapshot?.draft} onClick={() => void restoreDraft(index)}>새 문서로 복구</button>'],
    [shell, '<button type="button" onClick={clearDrafts}>보관 입력 버리기</button>'],
    [editor, '<button type="button" onClick={showProgressConflict}>진행 조절 보기</button>'],
    [editor, '<button type="button" disabled={!!props.readOnly || draft.invalid || draft.saving} onClick={() => { void saveNow(); }}>다시 저장</button>'],
    [editor, '<button type="button" onClick={downloadDraft}>입력한 원문 받기</button>'],
    [editor, '<button type="button" disabled={inputLocked || draft.saving} onClick={() => { if (draftRef.current?.discard(propsRef.current.workspace)) { orderHistoryRef.current.clear(); orderPositionsRef.current = []; orderEpochRef.current++; editorRef.current?.setValue(draftRef.current.getState().raw, { preserveSelection: true }); } }}>저장본으로 되돌리기</button>'],
  ];
  for (const [tree, contract] of contracts) {
    const normalized = contract.replace(/\s+/g, ' ');
    assert(find(tree, node => ts.isJsxElement(node) && node.openingElement.tagName.getText(tree) === 'button'
      && node.getText(tree).replace(/\s+/g, ' ') === normalized));
  }
  const resolveSource = find(shell, node => ts.isFunctionDeclaration(node) && node.name?.text === 'resolvePendingResult').getText(shell);
  for (const mode of ['ordinary', 'review', 'rejected', 'stale-visit', 'missing-visit', 'changed-context', 'published'] as const) {
    const context: { draftId: string; postId?: string } = { draftId: 'synthetic-review' };
    const reviewContext = { current: context };
    const calls: unknown[] = [], messages: string[] = [];
    const resolvePendingResult = evaluate(`(${resolveSource})`, {
      controller: { current: {
        snapshot: () => ({ pending: mode === 'ordinary' ? null : {
          kind: 'social', intent: { type: 'participation-submit', draft: { id: context.draftId } },
        } }),
        resolvePending: async (retry: boolean) => {
          calls.push(retry);
          if (mode === 'changed-context') reviewContext.current = { ...context };
          if (mode === 'published') context.postId = 'synthetic-post';
          return mode !== 'rejected';
        },
      } },
      reviewContext,
      captureReviewVisit: () => mode === 'missing-visit' ? null : () => mode !== 'stale-visit',
      setMessage: (message: string) => messages.push(message),
    });
    await resolvePendingResult();
    assert.deepEqual(calls, [true], mode);
    assert.deepEqual(messages, mode === 'ordinary' || mode === 'review' ? ['저장 결과를 확인했습니다.'] : [], mode);
  }
});
