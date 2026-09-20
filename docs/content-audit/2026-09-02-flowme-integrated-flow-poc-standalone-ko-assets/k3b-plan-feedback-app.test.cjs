'use strict';
// Independent VM integration: actual app functions and M/P/C/E2/PD/S.
// DOM painting, history/focus and timers are controlled effects, not browser evidence.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const M = require('./model.js');
const P = require('./personal-plan-context.js');
const C = require('./workspace-checkpoint.js');
const PD = require('./personal-plan-display.js');
const S = require('./workspace-storage.js');
const E0 = require('./plan-item-session.js');
const E = E0.createForWorkspace('checkpoint-v2');
const NOW = '2026-09-06T02:00:00.000Z';
const SOURCE = M.SOURCE_CANDIDATE_STORAGE_KEY;
const SENTINEL = 'flow:operating:b3-feedback';
const SENTINEL_RAW = ' \r\n원래 자료 🙂\t ';
const copy = value => JSON.parse(JSON.stringify(value));
const raw = value => JSON.stringify(value);
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const appFile = process.env.FLOWME_B3_APP_SOURCE || path.join(__dirname, 'app.js');
const appSource = fs.readFileSync(appFile, 'utf8');
const appSha = crypto.createHash('sha256').update(appSource).digest('hex');
const productFiles = ['model.js', 'personal-plan-context.js', 'workspace-checkpoint.js', 'plan-item-session.js', 'personal-plan-display.js', 'workspace-storage.js'];
const startHashes = Object.fromEntries(productFiles.map(name => [name, sha(path.join(__dirname, name))]));
const ast = ts.createSourceFile(appFile, appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function actualFunctions(names) {
  const found = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) found.set(node.name.text, node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return names.map(name => { assert.ok(found.has(name), 'actual app function missing: ' + name); return found.get(name); }).join('\n');
}
let sequence = 0;
const audits = [];
function fixture({ count = 3, sourceUndo = false } = {}) {
  const text = '# 원문 Plan\n## 원래 구간\n' + Array.from({ length: count }, (_, i) => '- [ ] 할 일 ' + (i + 1)).join('\n');
  const handoff = M.makeHandoff(text, { draftId: 'feedback-draft', handoffId: 'feedback-handoff', sourceConfirmed: true, folderId: null });
  const made = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(made.changed, true, made.error);
  const flow = made.state.flows.find(entry => entry.handoffId === handoff.handoffId);
  let store = M.initialSourceCandidateStore(NOW);
  if (sourceUndo) {
    const proposed = M.prepareLocalSourceCandidateReview(store, made.state, flow.id, { now: NOW, createdAt: NOW, incomingRawText: text.replace('원문 Plan', '확인된 새 원문 Plan') });
    assert.equal(proposed.ok, true, proposed.reason); store = proposed.store;
    for (const change of proposed.candidate.changes) {
      const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: proposed.candidate.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW });
      assert.equal(resolved.changed, true, resolved.code); store = resolved.store;
    }
    const applied = M.applyLocalSourceCandidate(store, made.state, flow.id, proposed.candidate.candidateId, NOW);
    assert.equal(applied.changed, true, applied.code); store = applied.store;
    assert.equal(store.undo.flowRef, flow.ref);
  }
  const converted = C.fromLegacy(' \r\n' + raw({ version: 1, state: made.state, undo: null }) + '\n ');
  assert.equal(converted.ok, true, converted.reason);
  return { checkpoint: converted.checkpoint, flow, sourceRaw: raw(store) };
}
function memory(f, hooks = {}) {
  const map = new Map([[S.STORAGE_KEY, raw(f.checkpoint)], [M.STORAGE_KEY, f.checkpoint.legacyBaseRaw], [SOURCE, f.sourceRaw], [SENTINEL, SENTINEL_RAW]]);
  const calls = [], reads = [];
  const db = { map, calls, reads, hooks,
    getItem(key) { reads.push(key); if (hooks.read) hooks.read(key, db); return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { assert.ok([S.STORAGE_KEY, S.RECOVERY_KEY].includes(key), 'PoC pair only'); calls.push({ method: 'setItem', key }); if (hooks.set) hooks.set(key, value, db); map.set(key, value); if (hooks.afterSet) hooks.afterSet(key, value, db); },
    removeItem(key) { assert.equal(key, S.RECOVERY_KEY); calls.push({ method: 'removeItem', key }); if (hooks.remove) hooks.remove(key, db); map.delete(key); },
    clear() { assert.fail('clear forbidden'); },
  };
  audits.push({ db, f }); return db;
}
function fakeNode() {
  return { dataset: {}, attributes: {}, hidden: false, innerHTML: '', textContent: '',
    setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; },
    focus() { this.focused = true; }, remove() { this.removed = true; }, querySelector() { return null; }, querySelectorAll() { return []; } };
}
const functionNames = ['activeEditorSession', 'isPersonalEditor', 'isSourceEditor', 'isStructureEditor', 'readPersonalSourceEpoch',
  'readCurrentPersonalSource', 'editorChangeSummary', 'planChangePage', 'planChangeList', 'setPlanSummaryFacts', 'escapeHtml',
  'bindPlanAttempt', 'planResultSourceCurrent', 'planResultCurrent', 'planResultUncovered', 'issuePlanSaveResult', 'dismissPlanSaveResult',
  'handlePlanResultAction', 'silencePlanGlobalFeedback', 'resultScreenKey', 'writerStorage', 'adoptWorkspace', 'storageActionsLocked',
  'workspaceWritable', 'preflightPersonalDisplay', 'commitWorkspacePrepared', 'writeCandidate', 'sourceEditorOptions',
  'replaceEditorSession', 'editorLocked', 'saveEditor', 'finishEditorClose', 'clearEditorConfirmed', 'editorRecoveryOptions', 'validLegacyEditorEnvelope'];
function setup(options = {}) {
  const f = options.f || fixture(options), db = options.db || memory(f, options.hooks || {});
  const callbacks = [], statuses = [], toasts = [];
  const returnPoint = { screen: { type: 'workspace', view: 'folder:unfiled', selectedFlowId: f.flow.id } };
  const box = { M, P, C, PD, S, storage: db, planItemSessions: E, legacyPlanItemSessions: E0,
    personalPlanSourceEpoch: 7, sourceCandidateRaw: f.sourceRaw, workspaceEpoch: 0,
    envelope: f.checkpoint, workspacePacket: S.loadWorkspace(db), screen: copy(returnPoint.screen),
    planSession: null, itemSession: null, planDraft: null, itemDraft: null, itemEditorReturn: null,
    planEditorPresentation: null, editorSummaryCache: new WeakMap(), planAttemptSummaries: new WeakMap(),
    durablePlanAttempts: new WeakSet(), consumedPlanAttempts: new WeakSet(), planSaveResult: null, planResultSequence: 0,
    PLAN_CHANGE_PAGE_SIZE: 10, planSummaryPage: 0, itemSummaryPage: 0,
    editorExpectedRaw: db.map.get(S.STORAGE_KEY), editorSaveSequence: 0, editorRecoveryJournalRaw: null,
    editorRecoveryAdapter: E, editorRecoveryForeign: false, editorCommitUncertain: false, editorCommitCounted: false,
    editorFeedback: null, editorFeedbackBySession: new Map(), editorLastInputPoint: null,
    workspaceTransactionPending: false, workspaceRecoveryGate: null, editorRecoveryGate: null,
    editorHistoryConsuming: false, sourceUpdateSession: null, personalDisplayBlocked: false, pendingRetry: null,
    // These Plan-save/Undo journeys do not open the separate entry read host.
    personalEntry: { active: () => false },
    successfulMutations: 0, lastUndoLane: null, workspaceOperationSequence: 0, forceWriteError: false,
    elements: { content: fakeNode(), toast: fakeNode(), saveStatus: fakeNode(), dialog: { open: false } },
    document: { querySelector: () => fakeNode() },
    window: { setTimeout(callback) { callbacks.push(callback); }, clearTimeout() {} },
    // The following stubs only substitute DOM/history/focus/other-feature UI effects.
    render() {}, renderPlanSaveResult() {}, syncEditorUI() {}, updateEditorDraft() {}, consumeEditorHistory() {},
    restoreEditorPoint(point) { if (point && point.screen) box.screen = copy(point.screen); },
    interruptContextualResult(reason) { box.contextualInterrupt = reason; },
    creatorDraftBlocked: () => false, sourceCandidateBlocked: () => false, movePanelOpen: () => false,
    authoringPropertyIsRecovering: () => false, normalizeScreen() {}, settleContextualChange() {}, focusAfterRender() {},
    setSaveStatus(message, status) { statuses.push({ message, status }); },
    showToast(message, canUndo) { toasts.push({ message, canUndo }); }, successfulStorageStatus: () => '격리 저장 확인',
    showPersonalEditorError(reason) { box.editorFeedback = { state: 'invalid', reason }; },
    enterWorkspaceGate(packet, details) { box.workspaceRecoveryGate = { packet, ...details }; },
    checkEditorStorage() { box.checkedRecovery = true; },
  };
  vm.createContext(box); vm.runInContext(actualFunctions(functionNames), box);
  const opened = E.createSourceBoundPersonalPlanStructureSession(db, { checkpoint: f.checkpoint, flowRef: f.flow.ref,
    sessionId: 'feedback-session-' + (++sequence), readSourceEpoch: () => box.personalPlanSourceEpoch, returnPoint });
  const presentation = C.inspectSourceBoundPersonalPlanStructureContext(f.checkpoint, { flowRef: f.flow.ref, sourceRead: { ok: true, raw: f.sourceRaw }, sourceEpoch: 7 });
  assert.equal(presentation.ok, true, presentation.reason);
  box.planSession = opened; box.planEditorPresentation = presentation; box.planDraft = copy(opened.draft);
  box.screen = { type: 'plan-editor', view: 'folder:unfiled', selectedFlowId: f.flow.id };
  function run(code) { return vm.runInContext(code, box); }
  function edit(change = draft => { draft.title = { mode: 'override', value: '내가 정한 Plan' }; }) {
    const draft = copy(box.planSession.draft); change(draft);
    const changed = E.updateDraft(box.planSession, draft); assert.equal(changed.ok, true, changed.error);
    box.planSession = changed.session; box.planDraft = copy(draft); return changed.session;
  }
  function save() { run('saveEditor(false)'); assert.ok(callbacks.length, raw(box.editorFeedback)); return callbacks.shift(); }
  return { f, db, box, run, edit, save, callbacks, statuses, toasts, returnPoint };
}
function prepared(x) {
  const out = E.beginSourceBoundPersonalPlanStructureSave(x.db, x.box.planSession, { checkpoint: x.box.workspacePacket.checkpoint,
    readSourceEpoch: () => x.box.personalPlanSourceEpoch, expectedRaw: x.box.editorExpectedRaw, attemptId: 'feedback-attempt-' + (++sequence), now: NOW });
  assert.equal(out.ok, true, out.error || out.reason); return out;
}
function saveSuccess(x) {
  x.edit(); const callback = x.save(); callback();
  assert.equal(x.box.successfulMutations, 1); assert.ok(x.box.planSaveResult, raw(x.box.editorFeedback));
  assert.equal(x.box.planSaveResult.state, 'saved'); assert.equal(x.db.calls.length, 4);
  return callback;
}
function control(x, action, rest = {}) { return { dataset: { receiptId: x.box.planSaveResult.id, action, ...rest } }; }
function boundary(x, source = x.f.sourceRaw) {
  assert.equal(x.db.map.get(SENTINEL), SENTINEL_RAW); assert.equal(x.db.map.get(M.STORAGE_KEY), x.f.checkpoint.legacyBaseRaw);
  assert.equal(x.db.map.get(SOURCE), source);
}

test('FB01 actual parent and genuine child summaries compare one child against the staged parent without session metadata', () => {
  const x = setup(); x.edit(draft => { draft.title = { mode: 'override', value: '부모 변경' }; draft.orderedItemRefs.reverse(); });
  const parent = x.box.planSession, parentSummary = x.run('editorChangeSummary()');
  assert.equal(parentSummary.ok, true, parentSummary.reason); assert.equal(parentSummary.changedFieldCount, 2);
  const ref = parent.draft.orderedItemRefs[0];
  const child = E.createSourceBoundPersonalPlanStructureChild(x.db, parent, { checkpoint: x.f.checkpoint,
    readSourceEpoch: () => 7, itemRef: ref, sessionId: 'feedback-child' });
  const draft = copy(child.draft); draft.memo = { mode: 'override', value: '이 Item에만 남길 메모' }; draft.schedule = { mode: 'fixed_date', date: '2026-09-11' };
  x.box.itemSession = E.updateDraft(child, draft).session;
  const summary = x.run('editorChangeSummary()'); assert.equal(summary.ok, true, summary.reason);
  assert.equal(summary.changedFieldCount, 2); assert.equal(summary.flowCount, 0); assert.equal(summary.itemCount, 1);
  assert.ok(summary.changes.every(change => change.field.includes(ref)));
  assert.equal(raw(parent.draft), raw(x.box.planSession.draft)); assert.equal(x.db.calls.length, 0); boundary(x);
});

test('FB02 genuine 120-item summary retains full counts, bounded pages and escaped values without storage', () => {
  const x = setup({ count: 120 }); x.edit(draft => {
    for (const item of Object.values(draft.items)) item.memo = { mode: 'override', value: '<img src=x onerror="bad()"> & 내용' };
  });
  const summary = x.run('editorChangeSummary()'); assert.equal(summary.ok, true, summary.reason);
  assert.equal(summary.changedFieldCount, 120); assert.equal(summary.itemCount, 120); assert.equal(summary.affectedRefs.length, 120);
  x.box.summary = summary;
  const first = x.run('planChangeList(summary, 0, "plan-summary-page", "data-session-id=fixture")');
  const last = x.run('planChangeList(summary, 999, "plan-summary-page", "data-session-id=fixture")');
  assert.equal((first.match(/<li /g) || []).length, 10); assert.equal((last.match(/<li /g) || []).length, 10);
  assert.match(last, /start="111"/); assert.match(last, /12 \/ 12/); assert.match(first, /120개 변경/);
  assert.doesNotMatch(first, /<img/); assert.match(first, /&lt;img/); assert.match(first, /&amp;/);
  const node = fakeNode(); x.box.node = node; x.run('setPlanSummaryFacts(node, summary, 999)');
  assert.equal(node.dataset.changedFieldCount, '120'); assert.equal(node.dataset.pageIndex, '11');
  assert.equal(x.db.calls.length, 0); boundary(x);
});

test('FB03 actual binding checks genuine source observation and exact attempt while a summary grants no writer authority', () => {
  const x = setup(); x.edit(); const before = x.box.planSession, attempt = prepared(x); x.box.prepared = attempt;
  assert.equal(x.run('bindPlanAttempt(planSession, prepared)'), true);
  const bound = x.box.planAttemptSummaries.get(attempt.attempt);
  assert.equal(bound.expectedRaw, x.db.map.get(S.STORAGE_KEY)); assert.ok(Object.isFrozen(bound.summary));
  assert.equal(x.run('bindPlanAttempt(planSession, prepared)'), true); assert.equal(x.box.planAttemptSummaries.get(attempt.attempt), bound);
  x.box.personalPlanSourceEpoch += 2; assert.equal(x.run('bindPlanAttempt(planSession, prepared)'), false);
  x.box.personalPlanSourceEpoch = 7; x.db.map.set(SOURCE, ' ' + x.f.sourceRaw);
  assert.equal(x.run('bindPlanAttempt(planSession, prepared)'), false); x.db.map.set(SOURCE, x.f.sourceRaw);
  x.box.prepared = { ...attempt, attempt: { ...attempt.attempt, revision: before.revision + 1 } };
  assert.equal(x.run('bindPlanAttempt(planSession, prepared)'), false);
  const denied = E.writeDurableAttempt(x.db, copy(attempt.session), copy(attempt.attempt), { readSourceEpoch: () => 7 });
  assert.notEqual(denied.status, 'committed'); assert.equal(x.db.calls.length, 0); boundary(x);
});

test('FB04 actual save callback issues one same-attempt receipt after verified cleanup; duplicate callback and no-op do not write', () => {
  const x = setup(), callback = saveSuccess(x), result = x.box.planSaveResult;
  callback(); assert.equal(x.db.calls.length, 4); assert.equal(x.box.successfulMutations, 1); assert.equal(x.box.planSaveResult, result);
  assert.equal(x.box.elements.saveStatus.attributes['aria-live'], 'off'); assert.equal(x.box.elements.toast.hidden, true);
  assert.equal(x.run('planResultCurrent(planSaveResult)'), true); boundary(x);
  const noop = setup(); noop.run('saveEditor(false)'); assert.equal(noop.callbacks.length, 0); assert.equal(noop.db.calls.length, 0);
  assert.equal(noop.box.planSaveResult, null); assert.equal(noop.box.successfulMutations, 0);
});

test('FB05 actual failed save keeps one attempt and summary for retry; detached late callback writes nothing', () => {
  const x = setup(); x.edit(); x.box.forceWriteError = true; x.save()();
  assert.equal(x.box.planSession.status, 'recoverable-error'); assert.equal(x.box.planSaveResult, null);
  const attempt = x.box.planSession.attempt, summary = x.box.planAttemptSummaries.get(attempt).summary;
  assert.equal(x.db.calls.length, 0); x.box.forceWriteError = false; x.run('saveEditor(true)'); x.callbacks.shift()();
  assert.equal(x.db.calls.length, 4); assert.equal(x.box.planSaveResult.summary, summary); assert.equal(x.box.successfulMutations, 1);
  const stale = setup(); stale.edit(); const callback = stale.save(); stale.box.planSession = null; callback();
  assert.equal(stale.db.calls.length, 0); assert.equal(stale.box.planSaveResult, null); boundary(x); boundary(stale);
});

test('FB06 confirmed cleanup is not a detailed receipt until explicit cleanup; reload has no in-memory attempt to invent one', () => {
  for (const reload of [false, true]) {
    let fail = true;
    const x = setup({ hooks: { remove() { if (fail) throw Error('cleanup fixture'); } } }); x.edit(); x.save()();
    assert.equal(x.box.successfulMutations, 1); assert.equal(x.box.planSaveResult, null); assert.equal(x.box.editorFeedback.state, 'confirmed');
    assert.equal(JSON.parse(x.db.map.get(S.RECOVERY_KEY)).phase, 'confirmed');
    if (reload) { x.box.planSession = null; x.box.planEditorPresentation = null; x.box.planAttemptSummaries = new WeakMap(); x.box.durablePlanAttempts = new WeakSet(); x.box.successfulMutations = 0; }
    fail = false; x.run('clearEditorConfirmed()');
    assert.equal(x.db.map.has(S.RECOVERY_KEY), false); assert.equal(x.db.calls.filter(call => call.key === S.STORAGE_KEY).length, 1);
    assert.equal(Boolean(x.box.planSaveResult), !reload); assert.equal(x.box.successfulMutations, reload ? 0 : 1); boundary(x);
  }
});

test('FB07 issue requires accepted durable attempt and exact adopted raw, not a prepared summary or reloaded bytes alone', () => {
  const x = setup(); x.edit(); const session = x.box.planSession, begun = prepared(x); x.box.prepared = begun;
  assert.equal(x.run('bindPlanAttempt(planSession, prepared)'), true); x.box.session = session; x.box.attempt = begun.attempt;
  x.box.planSession = null; assert.equal(x.run('issuePlanSaveResult(session, attempt)'), false);
  const committed = E.writeDurableAttempt(x.db, begun.session, begun.attempt, { readSourceEpoch: () => 7 });
  assert.equal(committed.status, 'committed'); assert.equal(E.clearConfirmedRecovery(x.db, { expectedJournalRaw: committed.journalRaw }).ok, true);
  x.box.workspacePacket = S.loadWorkspace(x.db); x.box.envelope = x.box.workspacePacket.checkpoint;
  assert.equal(x.run('issuePlanSaveResult(session, attempt)'), false, 'disk success without accepted app completion does not fabricate a receipt');
  assert.equal(x.box.planSaveResult, null); boundary(x);
});

test('FB08 current result requires source bytes/observed epoch, target bytes, workspace lane, screen and visible owner', () => {
  const x = setup(); saveSuccess(x); const result = x.box.planSaveResult;
  const checks = [
    () => { x.box.lastUndoLane = 'source-update'; return () => { x.box.lastUndoLane = 'workspace'; }; },
    () => { x.box.workspaceEpoch++; return () => { x.box.workspaceEpoch--; }; },
    () => { x.box.personalPlanSourceEpoch += 2; return () => { x.box.personalPlanSourceEpoch -= 2; }; },
    () => { x.box.screen.view = 'today'; return () => { x.box.screen.view = 'folder:unfiled'; }; },
    () => { x.db.map.set(SOURCE, ' ' + x.f.sourceRaw); return () => x.db.map.set(SOURCE, x.f.sourceRaw); },
    () => { x.db.map.set(S.STORAGE_KEY, ' ' + result.exactRaw); return () => x.db.map.set(S.STORAGE_KEY, result.exactRaw); },
  ];
  for (const mutate of checks) { const restore = mutate(); assert.equal(x.run('planResultCurrent(planSaveResult)'), false); restore(); assert.equal(x.run('planResultCurrent(planSaveResult)'), true); }
  for (const key of ['editorRecoveryGate', 'workspaceRecoveryGate', 'sourceUpdateSession']) { x.box[key] = {}; assert.equal(x.run('planResultUncovered()'), false); x.box[key] = null; }
  x.box.elements.dialog.open = true; assert.equal(x.run('planResultUncovered()'), false); x.box.elements.dialog.open = false;
  x.box.control = control(x, 'plan-result-dismiss'); x.run('handlePlanResultAction(control)'); assert.equal(x.box.planSaveResult, null);
  x.run('handlePlanResultAction(control)'); assert.equal(x.db.calls.length, 4); boundary(x);
});

test('FB09 Plan result Undo uses actual C/S workspace transaction even when the selected Flow has source Undo', () => {
  const x = setup({ sourceUndo: true }); saveSuccess(x); const saved = x.box.planSaveResult;
  const expected = C.undoCheckpoint(x.box.workspacePacket.checkpoint); assert.equal(expected.changed, true);
  x.box.undo = () => assert.fail('generic/source Undo forbidden'); x.box.control = control(x, 'plan-result-undo');
  x.run('handlePlanResultAction(control)');
  assert.equal(x.box.planSaveResult, saved); assert.equal(saved.state, 'undone'); assert.equal(x.db.map.get(S.STORAGE_KEY), raw(expected.checkpoint));
  assert.equal(x.db.calls.length, 8); assert.equal(x.box.successfulMutations, 2); assert.equal(x.run('planResultCurrent(planSaveResult)'), true);
  x.run('handlePlanResultAction(control)'); assert.equal(x.db.calls.length, 8); boundary(x);
});

test('FB10 source competition or exact-target drift before Plan Undo writes zero additional mutations', () => {
  for (const kind of ['source', 'target', 'precommit-source']) {
    const x = setup({ sourceUndo: true }); saveSuccess(x); const target = x.db.map.get(S.STORAGE_KEY), source = x.db.map.get(SOURCE);
    x.box.control = control(x, 'plan-result-undo');
    if (kind === 'source') x.db.map.set(SOURCE, ' ' + source);
    if (kind === 'target') x.db.map.set(S.STORAGE_KEY, ' ' + target);
    if (kind === 'precommit-source') {
      let sourceReads = 0;
      x.db.hooks.read = key => { if (key === SOURCE && ++sourceReads === 4) x.db.map.set(SOURCE, ' ' + source); };
    }
    x.run('handlePlanResultAction(control)');
    assert.equal(x.db.calls.length, 4, kind + ' must not add a storage call');
    assert.notEqual(x.box.planSaveResult && x.box.planSaveResult.state, 'undone');
    assert.equal(x.db.map.get(S.STORAGE_KEY), kind === 'target' ? ' ' + target : target);
    boundary(x, kind === 'source' || kind === 'precommit-source' ? ' ' + source : source);
  }
});

test('FB11 actual Undo failure retains saved values and never claims undone; uncertain and confirmed remain separate gates', () => {
  for (const mode of ['read-before-once', 'write-before-once', 'confirmed-cleanup']) {
    const x = setup(); saveSuccess(x); const savedRaw = x.db.map.get(S.STORAGE_KEY);
    if (mode === 'confirmed-cleanup') x.db.hooks.remove = () => { throw Error('Undo cleanup fixture'); };
    else if (mode === 'write-before-once') {
      let fired = false;
      x.db.hooks.set = key => { if (key === S.RECOVERY_KEY && !fired) { fired = true; throw Error('Undo one-shot prepared write fixture'); } };
    } else {
      let reads = 0;
      x.db.hooks.read = key => { if (key === SOURCE && ++reads === 2) throw Error('Undo one-shot source read fixture'); };
    }
    x.box.control = control(x, 'plan-result-undo'); x.run('handlePlanResultAction(control)');
    assert.notEqual(x.box.planSaveResult.state, 'undone');
    if (mode === 'confirmed-cleanup') { assert.equal(x.box.workspaceRecoveryGate.status, 'confirmed'); assert.equal(JSON.parse(x.db.map.get(S.RECOVERY_KEY)).phase, 'confirmed'); }
    else if (mode === 'write-before-once') {
      // S explicitly conserves its prepared record after any unverifiable write;
      // a one-shot exception is recovery, not a normal retry-result assertion.
      assert.equal(x.box.workspaceRecoveryGate.status, 'prepared'); assert.equal(x.box.planSaveResult.state, 'saved');
      assert.equal(x.db.map.get(S.STORAGE_KEY), savedRaw); assert.equal(x.db.calls.length, 5);
    } else {
      assert.equal(x.box.workspaceRecoveryGate, null); assert.equal(x.box.planSaveResult.state, 'failure');
      assert.equal(x.db.map.get(S.STORAGE_KEY), savedRaw); assert.equal(x.db.calls.length, 4);
    }
    boundary(x);
  }
});

test('FB12 after durable save a changed source can prevent a detailed result but must not expose generic source Undo', () => {
  const x = setup(), incoming = fixture({ sourceUndo: true }).sourceRaw;
  assert.equal(M.loadSourceCandidateStore({ getItem: () => incoming }).status, 'restored');
  // Observation injected at the history side effect after actual cleanup and before
  // actual issuePlanSaveResult. This is not a browser event/paint assertion.
  x.box.consumeEditorHistory = () => { x.db.map.set(SOURCE, incoming); x.box.personalPlanSourceEpoch++; };
  x.edit(); x.save()();
  assert.equal(x.box.successfulMutations, 1); assert.equal(x.db.calls.length, 4);
  assert.equal(x.box.planSaveResult, null); assert.equal(x.db.map.has(S.RECOVERY_KEY), false);
  assert.ok(x.toasts.some(value => value.message.includes('저장')));
  assert.equal(x.toasts.some(value => value.canUndo === true), false, 'source-bound fallback must not offer generic Undo');
  boundary(x, incoming);
});

test('FB13 actual action recovery consumes confirmed same-owner Undo once; stale source/screen and prepared restoration never publish undone', () => {
  for (const mode of ['confirmed', 'confirmed-source-stale', 'confirmed-screen-stale', 'prepared']) {
    const x = setup();
    let visibleResult = null;
    // Small structural DOM double: real renderPlanSaveResult runs, but this does
    // not parse HTML, paint, emulate layout, or establish browser focus behavior.
    x.box.document.createElement = () => {
      const node = fakeNode(), live = fakeNode(), body = fakeNode(), heading = fakeNode();
      node.querySelector = selector => selector === '[data-testid="plan-result-live"]' ? live
        : selector === '[data-plan-result-body]' ? body : selector === 'h2' ? heading : null;
      node.remove = () => { if (visibleResult === node) visibleResult = null; };
      return node;
    };
    x.box.elements.content.querySelector = selector => selector === '[data-testid="plan-save-result"]' ? visibleResult : null;
    x.box.elements.content.querySelectorAll = selector => selector === '[data-testid="plan-save-result"]' && visibleResult ? [visibleResult] : [];
    x.box.elements.content.prepend = node => { visibleResult = node; };
    x.box.sourceCandidateStoreStatus = 'restored'; x.box.personalDisplayCache = null;
    x.box.workspaceSuspendedDialog = null; x.box.dialogSubmit = null;
    x.box.cancelActiveMoveInteraction = () => {}; x.box.closeMovePanel = () => {};
    x.box.render = () => x.run('renderPlanSaveResult()');
    x.run(actualFunctions(['renderPlanSaveResult', 'invalidateWorkspaceCallbacks', 'suspendWorkspaceDialog', 'enterWorkspaceGate',
      'recoverWorkspaceStorage', 'resumeSuspendedDialog', 'reloadFeatureStores', 'sourcePacketFromLoaded', 'personalDisplayPacket',
      'state', 'anyFlowById', 'anyTaskById', 'flowById', 'taskById', 'normalizeScreen']));
    saveSuccess(x);
    const owner = x.box.planSaveResult, savedRaw = x.db.map.get(S.STORAGE_KEY);
    const undoRaw = raw(C.undoCheckpoint(x.box.workspacePacket.checkpoint).checkpoint);
    let fail = true, targetReadBlocked = false;
    if (mode === 'prepared') {
      x.db.hooks.afterSet = key => { if (key === S.STORAGE_KEY && fail) { fail = false; targetReadBlocked = true; throw Error('target throw-after fixture'); } };
      x.db.hooks.read = key => { if (key === S.STORAGE_KEY && targetReadBlocked) throw Error('target readback temporarily unavailable'); };
    }
    else x.db.hooks.remove = () => { if (fail) throw Error('delayed cleanup fixture'); };
    x.box.control = control(x, 'plan-result-undo'); x.run('handlePlanResultAction(control)');
    assert.equal(x.box.workspaceRecoveryGate.status, mode === 'prepared' ? 'prepared' : 'confirmed');
    assert.equal(visibleResult, null, 'actual result renderer hides gated controls');
    assert.notEqual(owner.state, 'undone');
    const gate = x.box.workspaceRecoveryGate;
    assert.equal(typeof gate.onSuccess, 'function'); // Never invoke it from the test.
    let expectedSource = x.f.sourceRaw;
    if (mode === 'confirmed-source-stale') {
      expectedSource = fixture({ sourceUndo: true }).sourceRaw;
      x.db.map.set(SOURCE, expectedSource); // External fixture write, not the product writer.
    }
    if (mode === 'confirmed-screen-stale') x.box.screen.view = 'today';
    fail = false; targetReadBlocked = false; x.run('recoverWorkspaceStorage()');
    assert.equal(x.box.workspaceRecoveryGate, null); assert.equal(x.db.map.has(S.RECOVERY_KEY), false);
    assert.equal(x.db.map.get(S.STORAGE_KEY), mode === 'prepared' ? savedRaw : undoRaw);
    if (mode === 'confirmed') {
      assert.equal(gate.onSuccess, null); assert.equal(owner.state, 'undone'); assert.equal(x.box.planSaveResult, owner);
      assert.equal(visibleResult.dataset.resultState, 'undone'); assert.equal(x.run('planResultCurrent(planSaveResult)'), true);
    } else {
      assert.notEqual(owner.state, 'undone'); assert.equal(x.box.planSaveResult, null); assert.equal(visibleResult, null);
      if (mode !== 'prepared') assert.equal(gate.onSuccess, null);
    }
    const count = x.db.calls.length; x.run('recoverWorkspaceStorage()'); assert.equal(x.db.calls.length, count, 'repeated recovery does not consume old callback');
    boundary(x, expectedSource);
  }
});

test.after(() => {
  const endHashes = Object.fromEntries(productFiles.map(name => [name, sha(path.join(__dirname, name))]));
  const calls = audits.flatMap(entry => entry.db.calls);
  const totals = { fixtures: audits.length, storageApi: calls.length, target: calls.filter(call => call.key === S.STORAGE_KEY).length,
    journal: calls.filter(call => call.key === S.RECOVERY_KEY).length, forbidden: 0, browser: 'NOT_RUN', observedUsers: 0 };
  for (const { db, f } of audits) { assert.equal(db.map.get(SENTINEL), SENTINEL_RAW); assert.equal(db.map.get(M.STORAGE_KEY), f.checkpoint.legacyBaseRaw); }
  console.log('B3_FEEDBACK_VM_EVIDENCE ' + raw({ appFile, appSha, appEndSha: sha(appFile), startHashes, endHashes, totals }));
  assert.deepEqual(endHashes, startHashes, 'dependency bytes must remain fixed during a registered run');
  assert.equal(sha(appFile), appSha, 'app WIP changed during run; rerun after freeze');
});
