import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as ts from 'typescript';
import { createPendingProgramSourceNavigation, programSourceNavigationReady } from './pending-source-navigation';
import { createProgramData, validateProgramData } from './program-data';
import { programCheckpointForWritingTarget } from './writing-navigation';
import { programSame } from './controller';
import { textWorkspaceModel as M } from './text-workspace';

// Helper contracts only: React event wiring, native focus and IME need UI evidence.
const documentId = 'qa-return-source', taskId = 'qa-return-today';
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture() {
  const data = createProgramData(), text = data.spaces[data.activeActorId].text;
  const doc = { id: documentId, title: '원문 복귀', folder: '미분류', folderId: 'folder-unfiled', lines: [
    { id: 'source-context', text: '앞선 한글 설명' },
    { id: taskId, text: '- [ ] 오늘 자료 확인' },
    { id: 'source-tail', text: '뒤의 내용은 유지' },
  ] };
  text.documents.push(doc);
  text.taskScopes[taskId] = 'folder-unfiled';
  text.itemScopes[taskId] = 'folder-unfiled';
  assert(validateProgramData(data));
  return { data, doc };
}

test('the captured successful operation permits one return to the same ID at its current source offset', async () => {
  const { data, doc } = fixture(), owner = createPendingProgramSourceNavigation();
  const operation = deferred<{ ok: boolean }>(), intent = owner.begin(() => true);
  let settled = false, returns = 0;
  const result = intent.wait(() => programSourceNavigationReady(operation.promise, intent.isCurrent, () => settled))
    .then(ready => {
      if (!ready) return null;
      const checkpoint = programCheckpointForWritingTarget(data, { view: 'space', id: documentId }, taskId, null);
      if (checkpoint) returns++;
      return checkpoint;
    });
  assert.equal(returns, 0);
  // The owned save may change an earlier line; do not retain an old numeric offset.
  doc.lines[0].text += ' · 저장 확인';
  settled = true; operation.resolve({ ok: true });
  const checkpoint = await result;
  assert(checkpoint);
  assert.equal(checkpoint.focus, `program-text-${documentId}`);
  assert.deepEqual(checkpoint.writing?.[documentId], { start: doc.lines[0].text.length + 1,
    end: doc.lines[0].text.length + 1, scrollTop: 0 });
  assert.equal(doc.lines[1].id, taskId);
  assert.equal(returns, 1);
});

test('duplicate waits share the existing wait and invoke the readiness port once', async () => {
  const owner = createPendingProgramSourceNavigation(), intent = owner.begin(() => true);
  const operation = deferred<{ ok: boolean }>(); let readyCalls = 0;
  const ready = () => { readyCalls++; return programSourceNavigationReady(operation.promise, intent.isCurrent, () => true); };
  const first = intent.wait(ready), second = intent.wait(ready);
  assert.strictEqual(first, second);
  assert.equal(readyCalls, 1);
  operation.resolve({ ok: true });
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.strictEqual(intent.wait(ready), first);
  assert.equal(readyCalls, 1);
});

test('a newer source intent or explicit cancellation retires the held return', async () => {
  for (const change of ['new-source', 'cancel'] as const) {
    const owner = createPendingProgramSourceNavigation(), operation = deferred<{ ok: boolean }>();
    const old = owner.begin(() => true); let returns = 0;
    const waiting = old.wait(() => programSourceNavigationReady(operation.promise, old.isCurrent, () => true))
      .then(ready => { if (ready) returns++; return ready; });
    if (change === 'new-source') assert(owner.begin(() => true).isCurrent());
    else owner.cancel();
    operation.resolve({ ok: true });
    assert.equal(await waiting, false, change);
    assert.equal(old.isCurrent(), false, change);
    assert.equal(returns, 0, change);
  }
});

test('changed view, session owner or focus owner invalidates the callback before a held operation settles', async () => {
  for (const changed of ['view', 'session', 'focus'] as const) {
    const owner = createPendingProgramSourceNavigation(), operation = deferred<{ ok: boolean }>();
    const captured = { view: {}, session: {}, focus: {} }, live = { ...captured };
    const intent = owner.begin(() => live.view === captured.view && live.session === captured.session
      && live.focus === captured.focus);
    let readinessChecks = 0;
    const waiting = intent.wait(() => programSourceNavigationReady(operation.promise, intent.isCurrent,
      () => { readinessChecks++; return true; }));
    live[changed] = {};
    operation.resolve({ ok: true });
    assert.equal(await waiting, false, changed);
    assert.equal(readinessChecks, 0, changed);
  }
});

test('input followed by reverting to equal text cannot revive an intent cancelled at the input boundary', async () => {
  const owner = createPendingProgramSourceNavigation(), operation = deferred<{ ok: boolean }>();
  const initialRaw = '입력 전'; let raw = initialRaw;
  const intent = owner.begin(() => raw === initialRaw);
  const waiting = intent.wait(() => programSourceNavigationReady(operation.promise, intent.isCurrent, () => true));
  raw += ' 한글'; owner.cancel(); // The caller cancels on input/composition/child/occurrence intent.
  raw = initialRaw;
  operation.resolve({ ok: true });
  assert.equal(await waiting, false);
  assert.equal(intent.isCurrent(), false);
});

test('a deleted task or source document cannot produce a writing target after the wait', async () => {
  for (const deleted of ['task', 'document'] as const) {
    const { data, doc } = fixture(), operation = deferred<{ ok: boolean }>();
    const owner = createPendingProgramSourceNavigation(), intent = owner.begin(() => true);
    let returns = 0;
    const waiting = intent.wait(() => programSourceNavigationReady(operation.promise, intent.isCurrent, () => true))
      .then(ready => {
        const checkpoint = ready ? programCheckpointForWritingTarget(data, { view: 'space', id: documentId }, taskId, null) : null;
        if (checkpoint) returns++;
        return checkpoint;
      });
    const text = data.spaces[data.activeActorId].text;
    if (deleted === 'task') doc.lines = doc.lines.filter(line => line.id !== taskId);
    else text.documents = [];
    delete text.taskScopes[taskId]; delete text.itemScopes[taskId];
    operation.resolve({ ok: true });
    assert.equal(await waiting, null, deleted);
    assert.equal(returns, 0, deleted);
  }
});

test('failed or rejected operations and unresolved or busy readiness never authorize return', async () => {
  for (const blocked of ['failed', 'rejected', 'unresolved', 'busy'] as const) {
    const owner = createPendingProgramSourceNavigation(), intent = owner.begin(() => true);
    const operation = deferred<{ ok: boolean }>(); let returns = 0;
    const waiting = intent.wait(() => programSourceNavigationReady(operation.promise, intent.isCurrent,
      () => blocked !== 'unresolved' && blocked !== 'busy'))
      .then(ready => { if (ready) returns++; return ready; });
    if (blocked === 'rejected') operation.reject(new Error('operation rejected'));
    else operation.resolve({ ok: blocked !== 'failed' });
    assert.equal(await waiting, false, blocked);
    assert.equal(returns, 0, blocked);
  }
  let checks = 0;
  assert.equal(await programSourceNavigationReady(null, () => false, () => { checks++; return true; }), false);
  assert.equal(checks, 0);
});

test('replacing the captured operation does not let its old settlement authorize or extend the wait', async () => {
  const first = deferred<{ ok: boolean }>(), replacement = deferred<{ ok: boolean }>();
  let liveOperation = first.promise, checks = 0;
  const captured = liveOperation;
  const waiting = programSourceNavigationReady(captured, () => liveOperation === captured,
    () => { checks++; return true; });
  liveOperation = replacement.promise;
  first.resolve({ ok: true });
  // Replacement is still unresolved: the old request must already settle false.
  assert.equal(await waiting, false);
  assert.equal(checks, 0);
  replacement.resolve({ ok: true });
  assert.equal(await waiting, false);
  assert.equal(checks, 0);
});

// Run the actual JSX callback, target setup, complete RAF block and cancellation
// callback. These controlled ports do not establish browser/React event ordering.
function sourceFocusExpressions() {
  const source = readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('ProgramSpace.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const opens: ts.FunctionDeclaration[] = [], reports: ts.Expression[] = [], cancels: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'openDocument') opens.push(node);
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'onPosition') {
      const tag = node.parent.parent;
      if ((ts.isJsxSelfClosingElement(tag) || ts.isJsxOpeningElement(tag)) && tag.tagName.getText(tree) === 'TextEditor') {
        const value = node.initializer;
        assert(value && ts.isJsxExpression(value) && value.expression && ts.isArrowFunction(value.expression));
        reports.push(value.expression);
      }
    }
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'cancel' && node.initializer
      && ts.isArrowFunction(node.initializer) && node.initializer.getText(tree).includes('sourceNavigation.cancel()')
      && node.initializer.getText(tree).includes('pendingSourceFocus.current = null')) cancels.push(node.initializer);
    ts.forEachChild(node, visit);
  };
  visit(tree);
  assert.equal(opens.length, 1); assert.equal(reports.length, 1); assert.equal(cancels.length, 1);
  const statements = opens[0].body!.statements;
  const target = statements.filter((node): node is ts.IfStatement => ts.isIfStatement(node) && node.expression.getText(tree) === 'targetPosition');
  const raf = statements.filter((node): node is ts.IfStatement => ts.isIfStatement(node)
    && node.expression.getText(tree) === 'targetPosition && !props.onRegisterNavigation');
  assert.equal(target.length, 1); assert.equal(raf.length, 1);
  return { report: reports[0].getText(tree), cancel: cancels[0].getText(tree),
    setup: '() => {\n' + target[0].getText(tree) + '\n' + raf[0].getText(tree) + '\n}' };
}
function evaluateSpaceExpression<T>(expression: string, scope: Record<string, unknown>): T {
  const code = ts.transpileModule('const extracted = (' + expression + ');', {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  return new Function(...Object.keys(scope), code + '\nreturn extracted;')(...Object.values(scope)) as T;
}
type ReportedPosition = { start: number; end: number; scrollTop: number };
type StoredPosition = ReportedPosition & { documentId: string; lineId: string | null };
type ControlledSourceFocus = { documentId: string; taskId: string; attempt: () => void; isCurrent?: () => boolean };
function sourceFocusHarness(expressions: ReturnType<typeof sourceFocusExpressions>) {
  const { data, doc } = fixture(), text = data.spaces[data.activeActorId].text;
  doc.lines[0].text = '설'.repeat(59);
  doc.lines[1].text = '- [ ] ' + '제목'.repeat(40);
  text.documents.push({ id: 'other-document', title: '다른 글', folder: '미분류', folderId: 'folder-unfiled',
    lines: [{ id: 'other-line', text: '다른 글의 내용' }] });
  assert(validateProgramData(data));
  const checkpoint = programCheckpointForWritingTarget(data, { view: 'space', id: documentId }, taskId, null);
  assert(checkpoint?.writing?.[documentId]);
  const targetPosition: StoredPosition = { ...checkpoint.writing[documentId], documentId, lineId: taskId };
  assert.equal(targetPosition.start, 60);
  const positions = { current: {} as Record<string, StoredPosition> };
  const pendingSourceFocus = { current: null as ControlledSourceFocus | null }, frames: (() => void)[] = [];
  const sourceNavigation = createPendingProgramSourceNavigation(); let ownerCurrent = true, focusCalls = 0;
  const intent = sourceNavigation.begin(() => ownerCurrent);
  const sourceFocusOwner = { isConnected: true }, body = {};
  const nativeDocument = { activeElement: sourceFocusOwner as unknown, body,
    getElementById: (id: string) => id === `program-text-${documentId}` ? area : null };
  const area = { value: M.raw(doc), readOnly: false, selectionStart: 118, selectionEnd: 118, scrollTop: 0, clientHeight: 200,
    getClientRects: () => [{}], setSelectionRange: (start: number, end: number) => { area.selectionStart = start; area.selectionEnd = end; },
    closest: () => ({ querySelectorAll: () => doc.lines.map((_, index) => ({ offsetTop: index * 26 })) }), scrollIntoView: () => {} };
  const scope: Record<string, unknown> = { id: documentId, taskId, targetPosition, positions, pendingSourceFocus, intent,
    sourceNavigation, sourceFocusOwner, props: {}, setFolderId: () => {}, inputLockCount: { current: 0 }, writingBlocked: () => false,
    selectedRef: { current: documentId }, presentation: { current: { period: 'documents' } }, actorId: data.activeActorId,
    dataRef: { current: data }, documentsRef: { current: text.documents }, document: nativeDocument, M, programSame,
    // 11/5 쓰기 '최근만 쓰기': this document is short, so its editor shows it whole.
    recentViewRef: { current: () => null }, shownDocument: (id: string) => text.documents.find(entry => entry.id === id),
    recentPosition: () => { throw Error('no recent view'); },
    // F10 W-ORDER-02 (11/11): a line asked for marks its document as opened, so opening at today does not take over.
    PROGRAM_TODAY_SHOWN: new Set<string>(), todayKey: (id: string) => `${data.activeActorId}:${id}`,
    root: { current: { contains: (value: unknown) => value === area } }, libraryDialog: { current: null },
    sourceFocusPorts: { current: { [documentId]: (target: { documentId: string; lineId: string; raw: string }) => {
      assert.deepEqual(target, { documentId, lineId: taskId, raw: M.raw(doc) });
      focusCalls++; nativeDocument.activeElement = area; return true;
    } } }, requestAnimationFrame: (callback: () => void) => { frames.push(callback); return frames.length; } };
  evaluateSpaceExpression<() => void>(expressions.setup, scope)();
  const assigned = pendingSourceFocus.current;
  assert(assigned); assert.equal(frames.length, 1);
  const report = (id: string, start: number, lineId: string) => evaluateSpaceExpression<(position: ReportedPosition, lineId: string) => void>(
    expressions.report, { ...scope, id })({ start, end: start, scrollTop: 0 }, lineId);
  return { positions, pendingSourceFocus, assigned, intent, area, report,
    cancel: evaluateSpaceExpression<() => void>(expressions.cancel, scope), invalidateOwner: () => { ownerCurrent = false; },
    runFrame: () => { assert.equal(frames.length, 1); frames.shift()!(); }, get focusCalls() { return focusCalls; } };
}

test('actual source target setup survives passive report 118 and the actual RAF focuses row start 60 exactly once', () => {
  const h = sourceFocusHarness(sourceFocusExpressions());
  assert.equal(h.positions.current[documentId].start, 60);
  h.report(documentId, 118, taskId);
  h.runFrame();
  // Keep this behavioral assertion before checking the new request property so
  // the old source fails on overwritten target/focus0, not a missing property.
  assert.deepEqual({ target: h.positions.current[documentId].start, focusCalls: h.focusCalls,
    start: h.area.selectionStart, end: h.area.selectionEnd }, { target: 60, focusCalls: 1, start: 60, end: 60 });
  assert.strictEqual(h.assigned.isCurrent, h.intent.isCurrent);
  assert.equal(h.pendingSourceFocus.current, null);
  h.assigned.attempt();
  assert.equal(h.focusCalls, 1);
});

test('actual cancellation, stale owner, other document and completed requests preserve ordinary position reporting', () => {
  const expressions = sourceFocusExpressions();
  for (const boundary of ['cancel', 'stale-owner', 'other-document', 'completed'] as const) {
    const h = sourceFocusHarness(expressions);
    if (boundary === 'cancel') h.cancel();
    if (boundary === 'stale-owner') h.invalidateOwner();
    if (boundary === 'completed') {
      h.runFrame(); assert.equal(h.pendingSourceFocus.current, null); assert.equal(h.focusCalls, 1);
    }
    const reportedDocument = boundary === 'other-document' ? 'other-document' : documentId;
    const reportedLine = boundary === 'other-document' ? 'other-line' : taskId;
    h.report(reportedDocument, 118, reportedLine);
    assert.deepEqual(h.positions.current[reportedDocument], { documentId: reportedDocument, lineId: reportedLine,
      start: 118, end: 118, scrollTop: 0 }, boundary);
    if (boundary !== 'completed') h.runFrame();
    if (boundary === 'cancel' || boundary === 'stale-owner') assert.equal(h.focusCalls, 0, boundary);
    else assert.equal(h.focusCalls, 1, boundary);
    if (boundary === 'cancel') { assert.equal(h.pendingSourceFocus.current, null); assert.equal(h.intent.isCurrent(), false); }
    if (boundary === 'other-document') assert.equal(h.positions.current[documentId].start, 60);
    h.assigned.attempt();
    assert.equal(h.focusCalls, boundary === 'cancel' || boundary === 'stale-owner' ? 0 : 1, boundary);
  }
});
