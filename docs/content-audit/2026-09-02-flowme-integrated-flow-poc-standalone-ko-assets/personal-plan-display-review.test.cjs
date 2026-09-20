'use strict';
// Independent pure/runtime review. No browser, generated HTML or real storage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { M, C, E, NOW, clone, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const P = require('./personal-plan-context.js');
const PD = require('./personal-plan-display.js');
const S = require('./workspace-storage.js');
const raw = value => JSON.stringify(value);
const SOURCE = M.SOURCE_CANDIDATE_STORAGE_KEY;
const SENTINEL = 'flow:operating:display-review';
const BYTES = ' \r\n유지 🙂\t ';
const appFile = path.join(__dirname, 'app.js');
const appSource = fs.readFileSync(appFile, 'utf8');
const parsed = ts.createSourceFile(appFile, appSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
function actualFunctions(names) {
  const found = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) found.set(node.name.text, node.getText(parsed));
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return names.map(name => { assert.ok(found.has(name), 'actual app function ' + name); return found.get(name); }).join('\n');
}
function actualClickHandler() {
  let handler;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(parsed) === 'document.addEventListener'
      && node.arguments[0] && node.arguments[0].text === 'click' && node.arguments[1]
      && node.arguments[1].getText(parsed).includes("clickedAction === 'personal-display-recheck'")) handler = node.arguments[1].getText(parsed);
    ts.forEachChild(node, visit);
  }
  visit(parsed); assert.ok(handler, 'actual app click/recovery guard'); return handler;
}
function fixture() {
  const f = sourceUpdateFixture();
  const made = C.fromLegacy(raw({ version: 1, state: f.state, undo: null }));
  assert.equal(made.ok, true, made.reason);
  return { ...f, checkpoint: made.checkpoint, sourceRead: { ok: true, raw: raw(f.store) }, sourceEpoch: 7 };
}
function withOverlay(f) {
  const opened = C.inspectSourceBoundPersonalPlanContext(f.checkpoint, { flowRef: f.flow.ref, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(opened.ok, true, opened.reason);
  const draft = clone(opened.draft); draft.title = { mode: 'override', value: '보존할 개인 제목' };
  const next = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-context', context: opened.context, draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(next.ok, true, next.reason); assert.equal(next.changed, true);
  return { ...f, checkpoint: next.checkpoint };
}
function display(f) { return PD.projectPersonalPlanDisplay({ checkpoint: f.checkpoint, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }); }
function memory(f) {
  const map = new Map([[S.STORAGE_KEY, raw(f.checkpoint)], [SOURCE, f.sourceRead.raw], [SENTINEL, BYTES]]);
  if (f.checkpoint.legacyBaseRaw !== null) map.set(M.STORAGE_KEY, f.checkpoint.legacyBaseRaw);
  const writes = [];
  const db = { getItem: key => map.has(key) ? map.get(key) : null,
    setItem(key, value) { assert.ok([S.STORAGE_KEY, S.RECOVERY_KEY, SOURCE].includes(key)); writes.push(['setItem', key]); map.set(key, value); },
    removeItem(key) { assert.ok([S.STORAGE_KEY, S.RECOVERY_KEY].includes(key)); writes.push(['removeItem', key]); map.delete(key); },
    clear() { assert.fail('clear forbidden'); } };
  return { map, writes, db };
}
function settleReviewChoices(sandbox) {
  assert.ok(sandbox.sourceUpdateSession, 'the actual app opener creates the review owner');
  for (const change of sandbox.sourceUpdateSession.candidate.changes) {
    const next = M.resolveLocalSourceCandidateChange(sandbox.sourceUpdateSession.workingStore, {
      candidateId: sandbox.sourceUpdateSession.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    assert.equal(next.changed, true, next.code); sandbox.sourceUpdateSession.workingStore = next.store;
  }
}
function runSourceApply(f, externalRaw, options = {}) {
  const initial = M.initialSourceCandidateStore(NOW), db = memory({ ...f, sourceRead: { ok: true, raw: raw(initial) } });
  const sandbox = { M, PD, storage: db.db, envelope: f.checkpoint, workspacePacket: { checkpoint: f.checkpoint },
    sourceUpdateSession: null, sourceUpdateReturnFocus: null, sourceCandidateStore: initial,
    sourceCandidateRaw: raw(initial), sourceCandidateStoreStatus: 'restored', personalPlanSourceEpoch: 0,
    loadedSourceCandidates: { status: 'restored', raw: raw(initial), store: initial },
    sourceUpdateValueView: 'mine', deferredSourceUpdateFlowIds: new Set(),
    successfulMutations: 0, lastUndoLane: null, forceWriteError: false,
    activeEditorSession: () => null, workspaceWritable: () => true, sourceCandidateBlocked: () => false,
    featureWritable: () => true, setSaveStatus() {}, focusAfterRender() {}, showToast() {}, successfulStorageStatus: () => 'saved', flow: f.flow };
  vm.createContext(sandbox);
  vm.runInContext(actualFunctions(['readCurrentPersonalSource', 'adoptPersonalDisplaySource', 'refreshPersonalDisplaySource', 'preflightPersonalDisplay', 'sourceCandidatePreview', 'openSourceUpdateReview', 'refreshSourceUpdateReview', 'checkSourceUpdateObservation', 'rejectSourceUpdateObservation', 'applySourceUpdate'])
    + '\nfunction readPersonalSourceEpoch(){return personalPlanSourceEpoch;}\nfunction render(){refreshPersonalDisplaySource();}', sandbox);
  vm.runInContext('openSourceUpdateReview(flow, {});', sandbox);
  settleReviewChoices(sandbox);
  if (externalRaw !== null) db.map.set(SOURCE, externalRaw); // external fixture event, not a product write
  if (options.beforeApply) options.beforeApply(db, sandbox);
  const before = db.db.getItem(SOURCE), checkpointBefore = db.db.getItem(S.STORAGE_KEY);
  const applied = vm.runInContext('applySourceUpdate()', sandbox);
  assert.equal(db.db.getItem(S.STORAGE_KEY), checkpointBefore); assert.equal(db.map.get(SENTINEL), BYTES);
  return { ...db, before, applied, sandbox };
}

test('PDR01 an open source review cannot adopt newer observed bytes as authority for its older working store', t => {
  const f = fixture();
  const normal = runSourceApply(f, null);
  assert.equal(normal.applied, true); assert.equal(normal.writes.length, 1, 'positive control exercises actual source writer');
  const drifted = runSourceApply(f, f.sourceRead.raw);
  t.diagnostic(JSON.stringify({ appSha256: crypto.createHash('sha256').update(appSource).digest('hex'),
    normalWrites: normal.writes.length, staleReviewWrites: drifted.writes.length,
    staleReviewChangedSource: drifted.db.getItem(SOURCE) !== drifted.before,
    reportedSuccessfulMutations: drifted.sandbox.successfulMutations }));
  assert.equal(drifted.applied, false, 'review A must not overwrite source B refreshed during render');
  assert.equal(drifted.writes.length, 0); assert.equal(drifted.db.getItem(SOURCE), drifted.before);
});

function durableFixture() {
  const f = withOverlay(fixture()), db = memory(f);
  const opts = { checkpoint: f.checkpoint, flowRef: f.flow.ref, readSourceEpoch: () => 7, sessionId: 'display-recovery' };
  const session = E.createSourceBoundPersonalPlanSession(db.db, opts);
  const draft = clone(session.draft); draft.title = { mode: 'override', value: '다음 개인 제목' };
  const changed = E.updateDraft(session, draft).session;
  const begun = E.beginSourceBoundPersonalPlanSave(db.db, changed, { ...opts, expectedRaw: db.map.get(S.STORAGE_KEY), attemptId: 'display-attempt', now: NOW });
  assert.equal(begun.ok, true, begun.error);
  const saved = E.writeDurableAttempt(db.db, begun.session, begun.attempt, { readSourceEpoch: opts.readSourceEpoch });
  assert.equal(saved.status, 'committed', saved.error);
  return { f, ...db, saved };
}
test('PDR02 a blocked P display does not invalidate legitimate prepared restoration or silently reopen its source draft', () => {
  const d = durableFixture(), journal = JSON.parse(d.saved.journalRaw); journal.phase = 'prepared';
  const preparedRaw = raw(journal); d.map.set(S.RECOVERY_KEY, preparedRaw); d.map.set(SOURCE, '{broken');
  assert.equal(display({ ...d.f, checkpoint: JSON.parse(d.map.get(S.STORAGE_KEY)), sourceRead: { ok: true, raw: '{broken' } }).ok, false);
  const recovered = E.recoverDurableAttempt(d.db, { expectedJournalRaw: preparedRaw });
  assert.equal(recovered.ok, true, recovered.error); assert.equal(recovered.requiresSourceReopen, true);
  assert.equal(d.map.get(S.STORAGE_KEY), journal.beforeRaw); assert.equal(d.map.get(SOURCE), '{broken');
  assert.equal(S.loadWorkspace(d.db).ok, true);
  const reopened = E.resumeRecoveredSourceBoundPersonalPlanSession(d.db, recovered, { sessionId: 'display-reopen', readSourceEpoch: () => 7 });
  assert.equal(reopened.ok, false); assert.equal(reopened.requiresSourceReopen, true);
  assert.equal(display({ ...d.f, sourceRead: { ok: true, raw: '{broken' } }).ok, false); assert.equal(d.map.get(SENTINEL), BYTES);
});
test('PDR03 confirmed cleanup succeeds under failed display without target rollback or source restoration', () => {
  const d = durableFixture(), target = d.map.get(S.STORAGE_KEY), before = d.writes.length;
  d.map.set(SOURCE, '{broken');
  const checked = E.loadRecovery(d.db); assert.equal(checked.status, 'confirmed');
  assert.equal(display({ ...d.f, checkpoint: JSON.parse(target), sourceRead: { ok: true, raw: '{broken' } }).ok, false);
  const cleaned = E.clearConfirmedRecovery(d.db, { expectedJournalRaw: d.saved.journalRaw });
  assert.equal(cleaned.ok, true, cleaned.error); assert.equal(d.map.has(S.RECOVERY_KEY), false);
  assert.deepEqual(d.writes.slice(before), [['removeItem', S.RECOVERY_KEY]]);
  assert.equal(d.map.get(S.STORAGE_KEY), target); assert.equal(d.map.get(SOURCE), '{broken');
  assert.equal(S.loadWorkspace(d.db).ok, true); assert.equal(d.map.get(SENTINEL), BYTES);
});
test('PDR04 execution-only data reaches no actual app source-details or result renderer', () => {
  const f = fixture(), read = display({ ...f, sourceRead: { ok: false, reason: 'read-error' } });
  assert.equal(read.mode, 'personal-execution-only');
  const sandbox = { personalExecutionOnly: () => true, M, state: () => read.state,
    taskById: id => read.state.tasks.find(task => task.id === id), flowDisplayTitle: flow => '마지막 저장 이름 · ' + flow.title,
    escapeHtml: value => String(value).replace(/[&<>"']/g, '_'), renderTaskList: ids => '<div>개인 실행 ' + ids.length + '</div>' };
  vm.createContext(sandbox);
  vm.runInContext(actualFunctions(['renderItemSourceDetails', 'renderFlowDetail', 'renderResultPanel']), sandbox);
  sandbox.flow = read.state.flows.find(flow => flow.id === f.flow.id); sandbox.task = read.state.tasks.find(task => task.id === f.task.id);
  const html = vm.runInContext('[renderItemSourceDetails(task),renderFlowDetail(flow),renderResultPanel(flow)].join("\\n")', sandbox);
  assert.doesNotMatch(html, /원문 설명<|새 원문 제목|새 접수|2026-09-10|data-item-completion-criterion|data-source-update|result-tabs/);
  assert.match(html, /마지막 저장 이름/); assert.match(html, /표시하지 않습니다/);
});
test('PDR05 display success and its copied fields cannot authorize C editing or S preparation', () => {
  const f = withOverlay(fixture()), view = display(f); assert.equal(view.ok, true);
  const certificate = PD.inspectPersonalPlanDisplayCandidate({ checkpoint: f.checkpoint, candidateCheckpoint: f.checkpoint,
    sourceRead: f.sourceRead, candidateSourceRead: f.sourceRead, sourceEpoch: 7 });
  assert.equal(certificate.ok, true);
  for (const context of [view, certificate, clone(certificate)]) {
    const opened = C.inspectSourceBoundPersonalPlanContext(f.checkpoint, { flowRef: f.flow.ref, sourceRead: f.sourceRead, sourceEpoch: 7 });
    const draft = clone(opened.draft); draft.title = { mode: 'override', value: '허가되지 않은 제목' };
    const result = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-context', context, draft, sourceRead: f.sourceRead, sourceEpoch: 7, now: NOW });
    assert.equal(result.ok, false); assert.equal(result.changed, false);
    assert.equal(S.prepareWrite(context, f.checkpoint, { operation: 'workspace', operationId: 'display-only' }).ok, false);
  }
});
test('PDR06 reachable Undo remains a strict prerequisite even when a proposed candidate deletes that Undo and source recovers later', () => {
  const base = fixture(), edited = withOverlay(base);
  const opened = C.inspectSourceBoundPersonalPlanContext(edited.checkpoint, { flowRef: edited.flow.ref, sourceRead: edited.sourceRead, sourceEpoch: 7 });
  const draft = clone(opened.draft); draft.title = { mode: 'inherit' };
  const reverted = C.transitionCheckpoint(edited.checkpoint, { type: 'commit-source-bound-personal-plan-context', context: opened.context, draft, sourceRead: edited.sourceRead, sourceEpoch: 7, now: NOW });
  assert.equal(reverted.ok, true); assert.equal(Object.hasOwn(reverted.checkpoint.state, P.METADATA_KEY), false);
  assert.equal(Object.hasOwn(reverted.checkpoint.undo, P.METADATA_KEY), true);
  const next = C.transitionCheckpoint(reverted.checkpoint, { type: 'add-quick', title: '다음 항목', date: null, folderId: null, now: NOW });
  assert.equal(next.ok, true); assert.equal(Object.hasOwn(next.checkpoint.undo, P.METADATA_KEY), false);
  const before = raw(reverted.checkpoint);
  const blocked = PD.inspectPersonalPlanDisplayCandidate({ checkpoint: reverted.checkpoint, candidateCheckpoint: next.checkpoint,
    sourceRead: { ok: false, reason: 'read-error' }, candidateSourceRead: base.sourceRead, sourceEpoch: 7 });
  assert.equal(blocked.ok, false); assert.equal(blocked.pair, 'current'); assert.equal(blocked.snapshot, 'undo');
  assert.equal(raw(reverted.checkpoint), before);
});

function recoveredApp({ kind = 'plan', hasPersonal = true, failure = 'corrupt' } = {}) {
  const f = hasPersonal ? withOverlay(fixture()) : fixture(), db = memory(f);
  let opened, draft, changed, begun;
  if (kind === 'plan') {
    opened = E.createPersonalPlanSession({ checkpoint: f.checkpoint, flowRef: f.flow.ref, sessionId: 'display-v2-recovery' });
    draft = clone(opened.draft); draft.title = { mode: 'override', value: '복구 후에도 보존할 v2 입력' };
    changed = E.updateDraft(opened, draft).session;
    begun = E.beginPersonalPlanSave(changed, { checkpoint: f.checkpoint, expectedRaw: db.map.get(S.STORAGE_KEY), attemptId: 'display-v2-attempt', now: NOW });
  } else {
    const quick = f.checkpoint.state.tasks.find(task => task.id === 'meeting' && task.flowId === null); assert.ok(quick);
    const baseline = { mode: 'quick', id: quick.id, flowId: null, title: quick.title, memo: quick.memo || '', date: quick.date, folderId: quick.folderId };
    opened = E.createSession({ sessionId: 'display-quick-recovery', kind: 'quick', scopeId: quick.id, draft: baseline });
    draft = { ...baseline, title: '복구 후에도 보존할 Quick 입력' }; changed = E.updateDraft(opened, draft).session;
    const candidate = C.transitionCheckpoint(f.checkpoint, { type: 'update-quick', id: quick.id, title: draft.title, memo: draft.memo, date: draft.date, folderId: draft.folderId, now: NOW });
    assert.equal(candidate.ok, true, candidate.reason);
    begun = E.beginSave(changed, { expectedRaw: db.map.get(S.STORAGE_KEY), candidate: candidate.checkpoint, attemptId: 'display-quick-attempt' });
  }
  assert.equal(begun.ok, true, begun.error);
  const saved = E.writeDurableAttempt(db.db, begun.session, begun.attempt); assert.equal(saved.status, 'committed', saved.error);
  const journal = JSON.parse(saved.journalRaw); journal.phase = 'prepared';
  db.map.set(S.RECOVERY_KEY, raw(journal));
  let failRead = failure === 'read-error';
  const realRead = db.db.getItem;
  db.db.getItem = key => { if (key === SOURCE && failRead) throw new Error('display-source-read-error'); return realRead(key); };
  if (!failRead) db.map.set(SOURCE, '{broken');
  const recovery = E.loadRecovery(db.db); assert.equal(recovery.status, 'prepared');
  const loaded = M.loadSourceCandidateStore(db.db);
  const ui = () => ({ dataset: {}, hidden: false, disabled: false, innerHTML: '', textContent: '', insertAdjacentHTML(_, text) { this.innerHTML = text + this.innerHTML; } });
  const elements = { app: ui(), sidebar: ui(), content: ui(), undo: ui(), compactUndo: ui(), mutationCount: ui(), footerStorageNote: ui(),
    dialog: { open: false, close() { this.open = false; }, querySelector: () => null } };
  let checkCalls = 0;
  const sandbox = { M, C, P, PD, S, storage: db.db, planItemSessions: E, legacyPlanItemSessions: require('./plan-item-session.js'),
    editorRecoveryAdapter: E, editorRecoveryGate: recovery, editorRecoveryJournalRaw: recovery.journalRaw,
    editorRecoveryForeign: false, recoveredSourceEditor: null, workspacePacket: S.loadWorkspace(db.db), envelope: null,
    workspaceRecoveryGate: null, workspaceTransactionPending: false, workspaceEpoch: 0,
    // This recovery harness never opens the separate memory-only entry host.
    personalEntry: { active: () => false },
    personalEntryVisit: null,
    planSession: null, itemSession: null, planDraft: null, itemDraft: null, planEditorPresentation: null, planSaveResult: null,
    editorSequence: 0, editorHistoryConsuming: false, editorCommitCounted: false, editorFeedback: null,
    personalPlanSourceEpoch: 0, personalDisplayCache: null, personalDisplayBlocked: false,
    sourceCandidateRaw: loaded.raw, sourceCandidateStore: loaded.store, sourceCandidateStoreStatus: loaded.status,
    loadedSourceCandidates: loaded, authoringEditorResizeObserver: null, authoringChooser: null, authoringPropertyTarget: null, authoringContextTarget: null,
    successfulMutations: 0, authoringSourceMutationCount: 0, storageMode: 'review-memory',
    creatorDraftLibrary: { undo: null }, creatorDraftLibraryStatus: 'empty', dialogSubmit: null, dialogReturnFocus: null,
    screen: { type: 'workspace', view: 'today', selectedFlowId: null },
    history: { state: null }, EDITOR_HISTORY_KEY: 'review-test-editor-history', elements,
    document: { querySelectorAll: () => [] },
    editorPoint: () => ({ screen: clone(sandbox.screen), scroll: [] }),
    pushEditorHistory() {}, setSaveStatus() {}, focusAfterRender() {}, syncWorkspaceSaveStatus() {},
    checkEditorStorage() { checkCalls += 1; },
    renderWorkspaceStorageGate: () => 'workspace gate',
    renderSidebar() {}, syncEditorUI() {}, renderContextualResult() {}, syncWorkspaceToast() {}, creatorDraftBlocked: () => false,
    renderFlowDetail: () => 'normal Plan editor', renderItemEditor: () => 'normal Quick editor', renderItemDetail: () => 'returned Quick detail',
    flowById: id => sandbox.envelope.state.flows.find(flow => flow.id === id), taskById: id => sandbox.envelope.state.tasks.find(task => task.id === id),
    openDialog() { elements.dialog.open = true; }, consumeEditorHistory() {} };
  vm.createContext(sandbox);
  vm.runInContext(actualFunctions(['copyScreen', 'activeEditorSession', 'replaceEditorSession', 'isPersonalEditor', 'isSourceEditor',
    'sourcePacketFromLoaded', 'readCurrentPersonalSource', 'readPersonalSourceEpoch', 'adoptPersonalDisplaySource', 'refreshPersonalDisplaySource', 'personalDisplayPacket', 'adoptWorkspace',
    'escapeHtml', 'personalEditorMessage', 'recoveryActions', 'renderEditorRecoveryGate', 'editorHasPendingRecovery', 'editorLocked',
    'sourceCandidateBlocked', 'reloadFeatureStores', 'discardRecoveredSourceDraft', 'recoveredDraftDiscardDialogOpen',
    'inspectEditorPresentation', 'editorRecoveryOptions', 'resumeEditorRecovery', 'renderPlanSaveResult', 'render'])
    + '\nvar reviewedClick = (' + actualClickHandler() + ');', sandbox);
  vm.runInContext('resumeEditorRecovery()', sandbox);
  assert.equal(checkCalls, 0, 'actual prepared restoration reached its normal app continuation');
  assert.equal(db.map.get(S.STORAGE_KEY), journal.beforeRaw);
  assert.equal(db.map.get(SENTINEL), BYTES);
  function click(action) {
    sandbox.reviewClickEvent = { target: { closest: selector => selector === '[data-action]' ? { dataset: { action } } : null }, preventDefault() {} };
    vm.runInContext('reviewedClick(reviewClickEvent)', sandbox);
  }
  return { ...db, f, journal, draft, sandbox, elements, click, checks: () => checkCalls,
    fixSource() { failRead = false; db.map.set(SOURCE, f.sourceRead.raw); } };
}

function verifyRawResume(d) {
  const { sandbox, journal } = d;
  assert.equal(sandbox.editorRecoveryGate.status, 'source-reopen');
  assert.equal(Boolean(sandbox.planSession || sandbox.itemSession), false);
  const retained = sandbox.recoveredSourceEditor.recovery;
  assert.equal(raw(retained.journal.draft), raw(d.draft));
  assert.match(d.elements.content.innerHTML, /data-testid="source-recovered-draft"/);
  const count = d.writes.length;
  d.click('editor-reopen-source');
  assert.equal(d.writes.length, count); assert.equal(sandbox.recoveredSourceEditor.recovery, retained);
  assert.equal(Boolean(sandbox.planSession || sandbox.itemSession), false);
  d.fixSource();
  d.click('editor-reopen-source');
  const session = sandbox.planSession || sandbox.itemSession;
  assert.ok(session, 'verified source allows explicit raw session continuation');
  assert.equal(raw(session.draft), raw(d.draft)); assert.equal(sandbox.recoveredSourceEditor, null);
  assert.equal(sandbox.editorRecoveryGate, null);
  assert.equal(sandbox.personalDisplayBlocked, false, 'the resumed editor must actually remain visible');
  assert.notEqual(d.elements.app.dataset.personalDisplayMode, 'personal-execution-only', 'fresh source must reach the renderer as well as the recovery preflight');
  assert.equal(d.writes.length, count); assert.equal(d.map.get(S.STORAGE_KEY), journal.beforeRaw);
  assert.throws(() => E.resumeRecoveredSession(retained, { storage: d.db, sessionId: 'double-consumption' }), /invalid-recovered-session/);
  d.click('editor-reopen-source');
  assert.equal(sandbox.planSession || sandbox.itemSession, session); assert.equal(d.writes.length, count);
  assert.equal(d.map.get(SENTINEL), BYTES);
}

test('PDR07 actual v2 prepared recovery never strands a resumed editor behind an unanswerable display gate', t => {
  const d = recoveredApp(), sandbox = d.sandbox;
  const hasResumedEditor = Boolean(sandbox.planSession || sandbox.itemSession);
  const trapped = hasResumedEditor && sandbox.personalDisplayBlocked && !sandbox.editorRecoveryGate;
  let recheckReturnedWithoutChange = false;
  if (trapped) {
    const writesBefore = d.writes.length;
    d.fixSource(); d.click('personal-display-recheck');
    recheckReturnedWithoutChange = sandbox.personalDisplayBlocked;
    assert.equal(d.writes.length, writesBefore, 'recheck is not a save');
  }
  t.diagnostic(JSON.stringify({ appSha256: crypto.createHash('sha256').update(appSource).digest('hex'),
    hasResumedEditor, displayBlocked: sandbox.personalDisplayBlocked, hasRecoveryGate: Boolean(sandbox.editorRecoveryGate), recheckReturnedWithoutChange }));
  assert.equal(trapped, false, 'restored v2 draft needs an explicit recovery/recheck/close route, not an orphaned active editor');
  verifyRawResume(d);
});

test('PDR08 observed source ABA invalidates an old review and explicit refresh alone reopens an applicable owner', t => {
  const f = fixture();
  const attempt = runSourceApply(f, null, { beforeApply(db, sandbox) {
    const openingRaw = db.map.get(SOURCE);
    db.map.set(SOURCE, f.sourceRead.raw); vm.runInContext('refreshPersonalDisplaySource()', sandbox);
    db.map.set(SOURCE, openingRaw); vm.runInContext('refreshPersonalDisplaySource()', sandbox);
    assert.equal(sandbox.personalPlanSourceEpoch, 2, 'both external changes are observed by the actual cache reader');
  } });
  t.diagnostic(JSON.stringify({ sourceEpoch: attempt.sandbox.personalPlanSourceEpoch, staleWrites: attempt.writes.length, applied: attempt.applied }));
  assert.equal(attempt.applied, false); assert.equal(attempt.writes.length, 0); assert.equal(attempt.db.getItem(SOURCE), attempt.before);
  vm.runInContext('refreshSourceUpdateReview()', attempt.sandbox);
  settleReviewChoices(attempt.sandbox);
  assert.equal(vm.runInContext('applySourceUpdate()', attempt.sandbox), true, 'explicitly refreshed review gets a new applicable owner');
  assert.equal(attempt.writes.length, 1); assert.equal(attempt.map.get(SENTINEL), BYTES);
});

test('PDR09 raw Plan with no P and unavailable source preserves its recovery input until explicit verified resume', () => {
  verifyRawResume(recoveredApp({ hasPersonal: false, failure: 'read-error' }));
});
test('PDR10 recovered Quick behind a P display failure retains exact input and resumes only once after source verification', () => {
  verifyRawResume(recoveredApp({ kind: 'quick', hasPersonal: true, failure: 'read-error' }));
});
test('PDR11 explicitly discarding held Quick recovery returns its captured item screen without touching restored bytes', () => {
  const d = recoveredApp({ kind: 'quick', hasPersonal: true }), sandbox = d.sandbox;
  assert.equal(sandbox.editorRecoveryGate.status, 'source-reopen');
  const point = clone(sandbox.recoveredSourceEditor.point.screen), count = d.writes.length;
  assert.equal(point.type, 'item-detail'); assert.equal(point.selectedItemId, 'meeting');
  d.click('editor-discard-recovered'); assert.equal(d.elements.dialog.open, true);
  assert.ok(sandbox.recoveredSourceEditor); assert.equal(d.writes.length, count);
  d.click('editor-discard-recovered-confirm');
  assert.equal(raw(sandbox.screen), raw(point)); assert.equal(sandbox.recoveredSourceEditor, null);
  assert.equal(sandbox.planSession, null); assert.equal(sandbox.itemSession, null);
  assert.equal(d.map.get(S.STORAGE_KEY), d.journal.beforeRaw); assert.equal(d.writes.length, count);
  assert.equal(d.map.get(SOURCE), '{broken'); assert.equal(d.map.get(SENTINEL), BYTES);
});
