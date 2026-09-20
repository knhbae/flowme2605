'use strict';
// Independent actual-model/app review. Fake DOM effects only; no browser or disk storage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const M = require('./model.js');
const C = require('./workspace-checkpoint.js');
const P = require('./personal-plan-context.js');
const PD = require('./personal-plan-display.js');
const S = require('./workspace-storage.js');
const E0 = require('./plan-item-session.js');
const E = E0.createForWorkspace('checkpoint-v2');
const NOW = '2026-09-05T14:20:00.000Z';
const SOURCE = M.SOURCE_CANDIDATE_STORAGE_KEY;
const META = P.METADATA_KEY;
const SENTINEL = 'flow:operating:structure-review';
const SENTINEL_BYTES = ' \r\n원래 자료 🙂\t ';
const copy = value => JSON.parse(JSON.stringify(value));
const raw = value => JSON.stringify(value);
const appFile = path.join(__dirname, 'app.js');
const appSource = fs.readFileSync(appFile, 'utf8');
const appSha = crypto.createHash('sha256').update(appSource).digest('hex');
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
function initialFixture() {
  const handoff = M.makeHandoff('# 감사 A\n## 원래 구간\n- [ ] A1\n- [ ] A2', {
    draftId: 'structure-review-a', handoffId: 'structure-review-handoff-a', sourceConfirmed: true, folderId: null });
  const made = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(made.changed, true, made.error);
  const checkpoint = C.fromLegacy(raw({ version: 1, state: made.state, undo: null }));
  assert.equal(checkpoint.ok, true, checkpoint.reason);
  return { checkpoint: checkpoint.checkpoint, flow: made.state.flows.find(flow => flow.handoffId === handoff.handoffId),
    sourceRead: { ok: true, raw: raw(M.initialSourceCandidateStore(NOW)) }, sourceEpoch: 7 };
}
function inspect(f) {
  const result = C.inspectSourceBoundPersonalPlanStructureContext(f.checkpoint, {
    flowRef: f.flow.ref, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(result.ok, true, result.reason); return result;
}
function structureChange(f, callback) {
  const opened = inspect(f), draft = copy(opened.draft); callback(draft, opened);
  const changed = C.transitionCheckpoint(f.checkpoint, { type: 'commit-source-bound-personal-plan-structure-context',
    context: opened.context, draft, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, now: NOW });
  assert.equal(changed.ok, true, changed.reason); assert.equal(changed.changed, true);
  return { ...f, checkpoint: changed.checkpoint };
}
function undoOnlySourceFixture() {
  const base = initialFixture();
  const edited = structureChange(base, draft => { draft.sectionTitles['step-1'] = { mode: 'override', value: '보관된 개인 구간' }; });
  const reset = structureChange(edited, draft => { draft.sectionTitles['step-1'] = { mode: 'inherit' }; });
  assert.equal(Object.hasOwn(reset.checkpoint.state, META), false);
  const handoff = M.makeHandoff('# 나중 Flow B\n## 준비\n- [ ] B1', {
    draftId: 'structure-review-b', handoffId: 'structure-review-handoff-b', sourceConfirmed: true, folderId: null });
  const added = C.transitionCheckpoint(reset.checkpoint, { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(added.ok, true, added.reason); assert.equal(added.changed, true);
  // A valid persisted current/Undo pair, not a claim of the normal UI's immediate history.
  // Both states come from real C transitions; preserve the older genuine P state.
  const checkpoint = { ...added.checkpoint, undo: copy(edited.checkpoint.state) };
  assert.equal(C.validateCheckpoint(checkpoint).ok, true);
  assert.equal(Object.hasOwn(checkpoint.state, META), false);
  assert.equal(Object.hasOwn(checkpoint.undo, META), true);
  const other = checkpoint.state.flows.find(flow => flow.handoffId === handoff.handoffId);
  assert.equal(checkpoint.undo.flows.some(flow => flow.ref === other.ref), false);
  const proposed = M.prepareLocalSourceCandidateReview(M.initialSourceCandidateStore(NOW), checkpoint.state, other.id,
    { now: NOW, createdAt: NOW, incomingRawText: handoff.rawText.replace('나중 Flow B', '검증된 새 B 이름') });
  assert.equal(proposed.ok, true, proposed.reason);
  let store = proposed.store;
  for (const change of proposed.candidate.changes) {
    const resolved = M.resolveLocalSourceCandidateChange(store, { candidateId: proposed.candidate.candidateId,
      changeId: change.changeId, resolution: 'use-incoming', now: NOW });
    assert.equal(resolved.changed, true, resolved.code); store = resolved.store;
  }
  const applied = M.applyLocalSourceCandidate(store, checkpoint.state, other.id, proposed.candidate.candidateId, NOW);
  assert.equal(applied.changed, true, applied.code);
  const f = { ...base, checkpoint, sourceRead: { ok: true, raw: raw(applied.store) } };
  assert.equal(M.loadSourceCandidateStore({ getItem: () => f.sourceRead.raw }).status, 'restored');
  inspect(f); // Current editor is actually valid; no invented successful inspector.
  assert.equal(PD.projectPersonalPlanDisplay({ checkpoint, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch }).ok, true);
  const gate = PD.projectPersonalPlanStructureDisplay({ checkpoint, sourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch, flowRef: f.flow.ref });
  assert.equal(gate.ok, false); assert.equal(gate.reason, 'source-target-missing');
  const pair = PD.inspectPersonalPlanDisplayCandidate({ checkpoint, candidateCheckpoint: checkpoint,
    sourceRead: f.sourceRead, candidateSourceRead: f.sourceRead, sourceEpoch: f.sourceEpoch });
  assert.equal(pair.ok, false); assert.equal(pair.pair, 'current'); assert.equal(pair.snapshot, 'undo');
  return f;
}
function memory(f) {
  const map = new Map([[S.STORAGE_KEY, raw(f.checkpoint)], [M.STORAGE_KEY, f.checkpoint.legacyBaseRaw],
    [SOURCE, f.sourceRead.raw], [SENTINEL, SENTINEL_BYTES]]);
  const writes = [];
  const storage = { getItem: key => map.has(key) ? map.get(key) : null,
    setItem(key, bytes) { assert.ok([S.STORAGE_KEY, S.RECOVERY_KEY].includes(key)); writes.push(['setItem', key]); map.set(key, bytes); },
    removeItem(key) { assert.equal(key, S.RECOVERY_KEY); writes.push(['removeItem', key]); map.delete(key); },
    clear() { assert.fail('clear forbidden'); } };
  return { map, writes, storage };
}
function sourceGlobals(f, db) {
  const loaded = M.loadSourceCandidateStore(db.storage);
  return { M, C, P, PD, S, storage: db.storage, planItemSessions: E, legacyPlanItemSessions: E0,
    envelope: f.checkpoint, workspacePacket: S.loadWorkspace(db.storage), workspaceEpoch: 0,
    sourceCandidateRaw: loaded.raw, sourceCandidateStoreStatus: loaded.status, sourceCandidateStore: loaded.store,
    loadedSourceCandidates: loaded, personalPlanSourceEpoch: f.sourceEpoch, personalDisplayCache: null,
    personalDisplayBlocked: false, planSession: null, itemSession: null, planDraft: null, itemDraft: null,
    planEditorPresentation: null, recoveredSourceEditor: null, editorRecoveryGate: null };
}
const sourceFunctions = ['sourcePacketFromLoaded', 'readCurrentPersonalSource', 'adoptPersonalDisplaySource',
  'refreshPersonalDisplaySource', 'personalDisplayPacket', 'personalExecutionOnly', 'personalStructurePacket',
  'activeEditorSession', 'replaceEditorSession', 'readPersonalSourceEpoch', 'isPersonalEditor', 'isSourceEditor', 'isStructureEditor'];

test('SA01 genuine v4 prepared recovery retains its one-use draft until current and reachable Undo display are both safe', t => {
  // Positive control: ordinary compatible v4 recovery still resumes once.
  const normal = initialFixture(), normalDb = memory(normal);
  const normalOptions = { checkpoint: normal.checkpoint, flowRef: normal.flow.ref, readSourceEpoch: () => 7, sessionId: 'sa-normal' };
  const normalOpen = E.createSourceBoundPersonalPlanStructureSession(normalDb.storage, normalOptions);
  const normalDraft = copy(normalOpen.draft); normalDraft.title = { mode: 'override', value: '정상 재개 입력' };
  const normalChanged = E.updateDraft(normalOpen, normalDraft).session;
  const normalBegin = E.beginSourceBoundPersonalPlanStructureSave(normalDb.storage, normalChanged, { ...normalOptions,
    expectedRaw: normalDb.map.get(S.STORAGE_KEY), attemptId: 'sa-normal-attempt', now: NOW });
  assert.equal(normalBegin.ok, true, normalBegin.error);
  const normalSaved = E.writeDurableAttempt(normalDb.storage, normalBegin.session, normalBegin.attempt, { readSourceEpoch: normalOptions.readSourceEpoch });
  assert.equal(normalSaved.status, 'committed', normalSaved.error);
  const normalJournal = JSON.parse(normalSaved.journalRaw); normalJournal.phase = 'prepared';
  normalDb.map.set(S.RECOVERY_KEY, raw(normalJournal));
  const normalRecovery = E.recoverDurableAttempt(normalDb.storage, { expectedJournalRaw: raw(normalJournal) });
  assert.equal(normalRecovery.ok, true, normalRecovery.error);
  const normalResumed = E.resumeRecoveredSourceBoundPersonalPlanStructureSession(normalDb.storage, normalRecovery,
    { sessionId: 'sa-normal-resumed', readSourceEpoch: normalOptions.readSourceEpoch });
  assert.equal(normalResumed.ok, true, normalResumed.reason); assert.equal(raw(normalResumed.session.draft), raw(normalDraft));
  assert.equal(E.resumeRecoveredSourceBoundPersonalPlanStructureSession(normalDb.storage, normalRecovery,
    { sessionId: 'sa-normal-again', readSourceEpoch: normalOptions.readSourceEpoch }).ok, false);
  const f = undoOnlySourceFixture(), db = memory(f), options = { checkpoint: f.checkpoint, flowRef: f.flow.ref, readSourceEpoch: () => 7, sessionId: 'sa-v4' };
  const opened = E.createSourceBoundPersonalPlanStructureSession(db.storage, options);
  const draft = copy(opened.draft); draft.title = { mode: 'override', value: '복구 뒤 보존할 전체 입력' };
  const session = E.updateDraft(opened, draft).session;
  const begun = E.beginSourceBoundPersonalPlanStructureSave(db.storage, session, { ...options,
    expectedRaw: db.map.get(S.STORAGE_KEY), attemptId: 'sa-v4-attempt', now: NOW });
  assert.equal(begun.ok, true, begun.error);
  const committed = E.writeDurableAttempt(db.storage, begun.session, begun.attempt, { readSourceEpoch: options.readSourceEpoch });
  assert.equal(committed.status, 'committed', committed.error);
  const journal = JSON.parse(committed.journalRaw); assert.equal(journal.version, 4);
  journal.phase = 'prepared'; db.map.set(S.RECOVERY_KEY, raw(journal)); // isolated interrupted-phase fixture
  const recovery = E.loadRecovery(db.storage); assert.equal(recovery.status, 'prepared');
  const ui = { open: false, close() { this.open = false; } };
  const sandbox = { ...sourceGlobals(f, db), editorRecoveryAdapter: E, editorRecoveryGate: recovery,
    editorRecoveryJournalRaw: recovery.journalRaw, editorRecoveryForeign: false, editorSequence: 0,
    editorCommitCounted: false, editorFeedback: null, editorExpectedRaw: null,
    workspaceRecoveryGate: null, workspaceTransactionPending: false,
    screen: { type: 'workspace', view: 'today', selectedFlowId: f.flow.id },
    history: { state: null }, EDITOR_HISTORY_KEY: 'independent-sa-history',
    editorPoint: () => ({ screen: { type: 'workspace', view: 'today', selectedFlowId: f.flow.id }, scroll: [] }),
    elements: { dialog: ui }, pushEditorHistory() {}, setSaveStatus() {}, focusAfterRender() {},
    checkEditorStorage() { assert.fail('normal actual recovery must not be replaced by a generic failed check'); },
    render() {}, /* Rendering effects are not evidence of a browser paint. */
  };
  vm.createContext(sandbox);
  vm.runInContext(actualFunctions(sourceFunctions.concat(['copyScreen', 'adoptWorkspace', 'inspectEditorPresentation',
    'personalEditorMessage', 'editorRecoveryOptions', 'resumeEditorRecovery'])), sandbox);
  const beforeSource = db.map.get(SOURCE), beforeLegacy = db.map.get(M.STORAGE_KEY);
  vm.runInContext('resumeEditorRecovery()', sandbox);
  assert.equal(db.map.get(S.STORAGE_KEY), journal.beforeRaw);
  assert.equal(db.map.has(S.RECOVERY_KEY), false);
  assert.equal(db.map.get(SOURCE), beforeSource); assert.equal(db.map.get(M.STORAGE_KEY), beforeLegacy);
  assert.equal(db.map.get(SENTINEL), SENTINEL_BYTES);
  t.diagnostic(raw({ appSha, journalVersion: journal.version, currentValid: true, undoDisplayReason: 'source-target-missing',
    resumed: Boolean(sandbox.planSession), recoveryStatus: sandbox.editorRecoveryGate && sandbox.editorRecoveryGate.status }));
  assert.equal(Boolean(sandbox.planSession || sandbox.itemSession), false, 'PD Undo gate must precede one-use v4 resume');
  assert.equal(sandbox.editorRecoveryGate.status, 'source-reopen');
  assert.equal(raw(sandbox.recoveredSourceEditor.recovery.journal.draft), raw(draft));
  const count = db.writes.length;
  vm.runInContext('resumeEditorRecovery()', sandbox);
  assert.equal(db.writes.length, count, 'explicit recheck is not another recovery write');
  assert.equal(Boolean(sandbox.planSession || sandbox.itemSession), false);
});

function itemHtml(f, db) {
  const sandbox = { ...sourceGlobals(f, db), screen: { view: 'today', itemContext: 'today' }, itemReturn: null, moveTarget: null,
    dateLabel: date => date || '날짜 미정', contextLabel: () => '오늘', folderTitle: () => '미분류' };
  vm.createContext(sandbox);
  vm.runInContext(actualFunctions(sourceFunctions.concat(['state', 'anyTaskById', 'anyFlowById', 'taskById', 'flowById',
    'sourceTitle', 'flowDisplayTitle', 'escapeHtml', 'personalItemSection', 'renderItemSourceDetails', 'renderItemDetail'])), sandbox);
  sandbox.task = f.checkpoint.state.tasks.find(task => task.flowId === f.flow.id);
  return vm.runInContext('renderItemDetail(task)', sandbox);
}
test('SA02 actual Item detail must expose structure-read failure rather than silently omit its section and offer Plan editing', t => {
  const normal = structureChange(initialFixture(), draft => { draft.sectionTitles['step-1'] = { mode: 'override', value: '개인 구간 확인' }; });
  const normalDb = memory(normal), shown = itemHtml(normal, normalDb);
  assert.match(shown, /data-item-effective-section/); assert.match(shown, /개인 구간 확인/);
  assert.match(shown, /data-action="edit-item"/); assert.equal(normalDb.writes.length, 0);
  const failed = undoOnlySourceFixture(), db = memory(failed), html = itemHtml(failed, db);
  t.diagnostic(raw({ appSha, failedStructureReason: 'source-target-missing', hasPlanEdit: html.includes('data-action="edit-item"'),
    hasSection: html.includes('data-item-effective-section'), storageWrites: db.writes.length }));
  assert.equal(db.writes.length, 0); assert.equal(db.map.get(SENTINEL), SENTINEL_BYTES);
  assert.doesNotMatch(html, /data-action="edit-item"/, 'a failed structure read must not silently fall through to ordinary Plan editing');
  assert.match(html, /구간|계획/); assert.match(html, /확인.*못|사용.*없/);
  assert.match(html, /data-action="close-item-detail"/, 'failure retains a nonmutating exit');
});

test('SA03 section mode Escape and continue editing retain that exact active control rather than its removed value field', () => {
  const f = initialFixture(), db = memory(f);
  const opened = E.createSourceBoundPersonalPlanStructureSession(db.storage, {
    checkpoint: f.checkpoint, flowRef: f.flow.ref, sessionId: 'sa-focus', readSourceEpoch: () => 7 });
  const draft = copy(opened.draft); draft.title = { mode: 'override', value: '계속 편집할 제목' };
  const active = E.updateDraft(opened, draft).session;
  const sectionSelect = { id: 'plan-section-0-mode', matches: selector => selector.includes('[data-section-mode]') };
  const currentPoint = { selector: '#plan-section-0-mode', marker: 'active-section-mode' };
  const oldPoint = { selector: '#plan-section-0-value', marker: 'removed-value-field' };
  let restored;
  const sandbox = { planItemSessions: E, planSession: active, itemSession: null, editorHistoryConsuming: false,
    editorLastInputPoint: oldPoint, document: { activeElement: sectionSelect },
    editorPoint: node => { assert.equal(node, sectionSelect); return currentPoint; },
    openDialog() {}, setSaveStatus() {}, dialogSubmit: null, dialogReturnFocus: null,
    elements: { dialog: { open: true, close() { this.open = false; } } },
    restoreEditorPoint: point => { restored = point; }, syncEditorUI() {},
  };
  vm.createContext(sandbox);
  vm.runInContext(actualFunctions(['activeEditorSession', 'replaceEditorSession', 'requestEditorClose', 'continueEditor']), sandbox);
  vm.runInContext('requestEditorClose("escape", false); continueEditor()', sandbox);
  assert.equal(restored, currentPoint, 'new section controls own their existing cancel/continue focus point');
  assert.equal(raw(sandbox.planSession.draft), raw(draft)); assert.equal(db.writes.length, 0);
});

test('SA04 an order return point follows its full ref and direction after DOM replacement instead of its old list index', () => {
  class Element {
    constructor(ref, direction) { this.dataset = { action: 'plan-order-move', itemRef: ref, direction }; this.id = ''; this.isConnected = true; this.scrollTop = 0; this.scrollLeft = 0; }
    focus() { focused = this; }
  }
  let focused;
  const ref = 'flow-item:poc-copy-a:authoring-draft-a:item-1';
  const old = new Element(ref, '-1'), neighbor = new Element('flow-item:poc-copy-b:authoring-draft-b:item-1', '-1');
  let nodes = [neighbor, old];
  const query = selector => selector.startsWith('[data-action="plan-order-move"]')
    ? nodes.filter(node => (!selector.includes('[data-item-ref=') || selector.includes('[data-item-ref="' + node.dataset.itemRef + '"]'))
      && (!selector.includes('[data-direction=') || selector.includes('[data-direction="' + node.dataset.direction + '"]'))) : [];
  const sandbox = { HTMLElement: Element, CSS: { escape: value => value }, personalEntryVisit: null,
    document: { activeElement: old, querySelectorAll: query, querySelector: () => null },
    window: { scrollX: 0, scrollY: 120, scrollTo() {} }, screen: { type: 'plan-editor', selectedFlowId: 'a' },
    resultView: 'txt', resultCalendarBaseDate: null, resultCalendarSelectedDate: null, resultOccurrencePage: 1,
    returnFocusSelector: () => null, activeEditorSession: () => null, editorHistoryConsuming: false, old };
  vm.createContext(sandbox);
  vm.runInContext(actualFunctions(['copyScreen', 'visibleContentNodes', 'editorPoint', 'restoreEditorPoint']), sandbox);
  sandbox.point = vm.runInContext('editorPoint(old)', sandbox);
  assert.match(sandbox.point.selector, /data-item-ref/); assert.match(sandbox.point.selector, /data-direction/);
  old.isConnected = false;
  const replacement = new Element(ref, '-1'); nodes = [replacement, neighbor];
  vm.runInContext('restoreEditorPoint(point, false)', sandbox);
  assert.equal(focused, replacement, 'identity survives replacement and a changed physical index');
});
