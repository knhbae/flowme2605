'use strict';
// Actual app function bodies + actual M/shared transitions. Only DOM/render/focus
// and outer workspace lock state are environment doubles; this is not a browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const { C, NOW, clone, sourceUpdateFixture, memoryStore } = require('./k3b-plan-lossless-gate.fixture.cjs');
const RT = require('./source-update-runtime.cjs').loadCommonJs();
const raw = JSON.stringify;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const appFile = path.join(__dirname, 'app.js'), modelFile = path.join(__dirname, 'model.js');
const app = fs.readFileSync(appFile, 'utf8'), model = fs.readFileSync(modelFile, 'utf8');
const names = ['escapeHtml', 'readCurrentPersonalSource', 'adoptPersonalDisplaySource', 'refreshPersonalDisplaySource',
  'readPersonalSourceEpoch', 'resultScreenKey', 'sourceCandidateBlocked', 'sourceCandidatePreview', 'rebaseSourcePracticeMemory',
  'startLocalSourcePractice', 'openSourceUpdateReview', 'closeSourceUpdateReview',
  'checkSourceUpdateObservation', 'refreshSourceUpdateReview', 'renderSourceUpdateBanner', 'openGuide'];
function extract(text) {
  const ast = ts.createSourceFile(appFile, text, ts.ScriptTarget.Latest, true);
  const found = {}, choices = [];
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) found[node.name.text] = node.getText(ast);
    if (ts.isIfStatement(node) && node.expression.getText(ast) === "event.target.matches('[data-source-update-choice]') && sourceUpdateSession") choices.push(node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(Object.keys(found).length, names.length); assert.equal(choices.length, 1);
  found.actualChoice = 'function actualChoice(event) {' + choices[0] + '}';
  return found;
}
const bodies = extract(app), before = { appWholeSha: sha(app), modelWholeSha: sha(model),
  appSlices: Object.fromEntries(Object.entries(bodies).map(([name, body]) => [name, sha(body)])) };
test.after(() => {
  const current = extract(fs.readFileSync(appFile, 'utf8'));
  const after = { appWholeSha: sha(fs.readFileSync(appFile)), modelWholeSha: sha(fs.readFileSync(modelFile)),
    appSlices: Object.fromEntries(Object.entries(current).map(([name, body]) => [name, sha(body)])) };
  assert.deepEqual(after.appSlices, before.appSlices, 'tested app bodies changed during run');
  console.log('C2_APP_SOURCE ' + raw({ before, after, browser: 'NOT_RUN', nativeDOM: 'NOT_RUN',
    observationABA: 'injected already-observed epoch, not browser StorageEvent delivery' }));
});
function harness(options = {}) {
  const counts = { generator: 0, stage: 0, render: 0, focus: 0, externalFixtureWrites: 0 };
  const tracked = { ...RT,
    createPersonalWorkspacePocLocalFixtureEnvelope(...args) { counts.generator++; return RT.createPersonalWorkspacePocLocalFixtureEnvelope(...args); },
    stagePersonalWorkspacePocSourceCandidate(...args) { counts.stage++; return RT.stagePersonalWorkspacePocSourceCandidate(...args); } };
  const box = { module: { exports: {} }, require(name) {
    return name === './source-update-runtime.cjs' ? { loadCommonJs: () => tracked } : require(path.join(__dirname, name));
  } };
  vm.runInNewContext(model, box, { filename: modelFile });
  const M = box.module.exports, f = sourceUpdateFixture();
  const state = clone(f.state), flow = state.flows.find(row => row.id === f.flow.id);
  const checkpoint = C.fromLegacy(raw({ version: 1, state, undo: null }));
  assert.equal(checkpoint.ok, true, checkpoint.reason);
  const storage = memoryStore(checkpoint.checkpoint), empty = M.initialSourceCandidateStore(NOW);
  const store = options.store || empty;
  storage.map.set(M.SOURCE_CANDIDATE_STORAGE_KEY, raw(store));
  storage.map.set(M.DRAFT_STORAGE_KEY, '  retained authoring raw A\r\n ');
  storage.map.set(M.CREATOR_DRAFT_STORAGE_KEY, 'retained creator library exact bytes');
  const expected = new Map(storage.map), stateBefore = raw(state), calls = [];
  const env = { M, storage, envelope: checkpoint.checkpoint, sourceCandidateStore: store,
    sourceCandidateRaw: raw(store), sourceCandidateStoreStatus: 'restored', loadedSourceCandidates: null,
    sourcePracticeMemory: null, sourceUpdateSession: null, sourceUpdateReturnFocus: null,
    sourceUpdateValueView: 'mine', personalPlanSourceEpoch: 0, deferredSourceUpdateFlowIds: new Set(),
    moveTarget: null, writable: true, editor: null, screen: { type: 'workspace', selectedFlowId: flow.id },
    forceWriteError: false, elements: { dialog: { open: false } },
    workspaceWritable: () => env.writable, activeEditorSession: () => env.editor,
    render() { counts.render++; }, focusAfterRender() { counts.focus++; },
    setSaveStatus(...args) { calls.push(['status', ...args]); }, showToast(...args) { calls.push(['toast', ...args]); },
    openDialog(title, html) { env.elements.dialog.open = true; calls.push(['dialog', title, html]); },
    closeDialog() { env.elements.dialog.open = false; calls.push(['dialog-close']); },
    document: { activeElement: null, querySelector: () => null }, window: { setTimeout: callback => callback() } };
  vm.createContext(env); vm.runInContext(Object.values(bodies).join('\n'), env, { filename: appFile });
  return { M, f, state, flow, storage, empty, store, env, counts, calls,
    external(value) { storage.map.set(M.SOURCE_CANDIDATE_STORAGE_KEY, value); expected.set(M.SOURCE_CANDIDATE_STORAGE_KEY, value); counts.externalFixtureWrites++; },
    choose(changeId, value = 'keep-mine') { env.actualChoice({ target: { matches: selector => selector === '[data-source-update-choice]', value, dataset: { changeId } } }); },
    check(t) {
      assert.equal(raw(state), stateBefore); assert.equal(raw([...storage.map]), raw([...expected]));
      assert.deepEqual(storage.calls.filter(([method]) => method !== 'getItem'), []);
      assert.ok(storage.calls.every(([method, key]) => method === 'getItem' && key === M.SOURCE_CANDIDATE_STORAGE_KEY));
      t.diagnostic(raw({ counts, storageAPI: storage.calls.length, productMutationAPI: 0,
        outsidePrefixAPI: 0, operatingAndUnrelatedBytesExact: true, nativeDOM: 'NOT_RUN' }));
    } };
}
function fixtureStore(ids) {
  const f = sourceUpdateFixture(), h = harness(), authored = h.M.standaloneAuthoredFlowForSourceUpdate(f.state, f.flow.id);
  let store = h.empty;
  for (const id of ids) {
    const made = RT.createPersonalWorkspacePocLocalFixtureEnvelope(authored, { candidateId: id, createdAt: NOW, incomingRevisionId: id,
      incomingRawText: authored.authoring.rawText.replace('원문 제목', '새 원문 ' + id) });
    assert.equal(made.ok, true, made.reason);
    const staged = RT.stagePersonalWorkspacePocSourceCandidate(store, made.envelope, made.current, NOW);
    assert.equal(staged.code, 'staged'); store = staged.store;
  }
  return store;
}

test('C2A01 empty flow preview/banner and guide rendering never generate or stage', t => {
  const h = harness();
  for (let index = 0; index < 3; index++) {
    const preview = h.env.sourceCandidatePreview(h.flow);
    assert.equal(preview.ok, true); assert.equal(preview.catalog.candidates.length, 0);
    assert.equal(h.env.renderSourceUpdateBanner(h.flow), '');
    h.env.openGuide(); h.env.closeDialog();
  }
  assert.equal(h.counts.generator, 0); assert.equal(h.counts.stage, 0);
  assert.ok(h.calls.some(row => row[0] === 'dialog' && row[2].includes('로컬 비교 연습 시작'))); h.check(t);
});

test('C2A02 explicit start alone generates once; duplicate while open does not create another attempt', t => {
  const h = harness(); h.env.openGuide();
  assert.equal(h.env.startLocalSourcePractice(h.flow, null), true);
  assert.ok(h.env.sourceUpdateSession); assert.equal(h.env.elements.dialog.open, false);
  assert.equal(h.counts.generator, 1); const first = h.env.sourceUpdateSession.candidateId;
  assert.equal(h.env.startLocalSourcePractice(h.flow, null), false);
  assert.equal(h.env.sourceUpdateSession.candidateId, first); assert.equal(h.counts.generator, 1); h.check(t);
});

test('C2A03 actual choice, close/defer and exact reopen retain decisions without another generator', t => {
  const h = harness(); h.env.startLocalSourcePractice(h.flow, null);
  const id = h.env.sourceUpdateSession.candidateId, change = h.env.sourceUpdateSession.candidate.changes[0];
  h.choose(change.changeId);
  const decisions = raw(h.env.sourceUpdateSession.workingStore.reviews[id].resolutions);
  assert.equal(h.env.sourceUpdateSession.workingStore.reviews[id].resolutions[change.changeId], 'keep-mine');
  h.env.closeSourceUpdateReview({ restoreFocus: false });
  assert.equal(h.env.sourcePracticeMemory.store.reviews[id].status, 'deferred');
  h.env.openSourceUpdateReview(h.flow, null, id);
  assert.equal(h.env.sourceUpdateSession.candidateId, id);
  assert.equal(raw(h.env.sourceUpdateSession.workingStore.reviews[id].resolutions), decisions);
  h.choose(change.changeId); assert.equal(raw(h.env.sourceUpdateSession.workingStore.reviews[id].resolutions), decisions);
  assert.equal(h.counts.generator, 1); h.check(t);
});

test('C2A04 multiple stored IDs require explicit selection and keep each candidate decision on roundtrip', t => {
  const store = fixtureStore(['stored-A', 'stored-B']), h = harness({ store });
  const banner = h.env.renderSourceUpdateBanner(h.flow);
  assert.ok(banner.includes('data-candidate-id="stored-A"')); assert.ok(banner.includes('data-candidate-id="stored-B"'));
  h.env.openSourceUpdateReview(h.flow, null); assert.equal(h.env.sourceUpdateSession, null);
  h.env.openSourceUpdateReview(h.flow, null, 'stored-A');
  const a = h.env.sourceUpdateSession.candidate.changes[0].changeId; h.choose(a);
  h.env.closeSourceUpdateReview({ restoreFocus: false });
  h.env.openSourceUpdateReview(h.flow, null, 'stored-B');
  const b = h.env.sourceUpdateSession.candidate.changes[0].changeId; h.choose(b, 'use-incoming');
  h.env.closeSourceUpdateReview({ restoreFocus: false });
  h.env.openSourceUpdateReview(h.flow, null, 'stored-A');
  assert.equal(h.env.sourceUpdateSession.workingStore.reviews['stored-A'].resolutions[a], 'keep-mine');
  assert.equal(h.env.sourceUpdateSession.workingStore.reviews['stored-B'].resolutions[b], 'use-incoming');
  assert.equal(h.counts.generator, 0); h.check(t);
});

test('C2A05 observed source ABA remains stale on ordinary reopen; only explicit refresh renews the observation', t => {
  const h = harness(); h.env.startLocalSourcePractice(h.flow, null);
  const first = h.env.sourceUpdateSession, id = first.candidateId, change = first.candidate.changes[0].changeId;
  h.choose(change); const decisions = raw(first.workingStore.reviews[id].resolutions);
  const previousRaw = h.env.sourceCandidateRaw;
  h.external(raw({ ...h.empty, revision: 1 })); h.env.personalPlanSourceEpoch++;
  h.external(previousRaw); h.env.personalPlanSourceEpoch++;
  assert.equal(h.env.checkSourceUpdateObservation(first).ok, false);
  h.env.closeSourceUpdateReview({ restoreFocus: false });
  h.env.openSourceUpdateReview(h.flow, null, id);
  assert.equal(h.env.sourceUpdateSession.status, 'stale'); assert.equal(h.env.sourceUpdateSession.sourceObservationStale, true);
  assert.equal(h.env.sourceUpdateSession.openingSourceEpoch, 0);
  h.choose(change, 'use-incoming'); assert.equal(raw(h.env.sourceUpdateSession.workingStore.reviews[id].resolutions), decisions);
  assert.equal(h.counts.generator, 1);
  h.env.refreshSourceUpdateReview();
  assert.equal(h.counts.generator, 2); assert.equal(h.env.sourceUpdateSession.status, 'comparing');
  assert.equal(h.env.sourceUpdateSession.openingSourceEpoch, 2);
  assert.equal(raw(h.env.sourceUpdateSession.workingStore.reviews[id].resolutions), decisions); h.check(t);
});

test('C2A06 conflicting durable/local decisions block explicit refresh while preserving both stores and old candidate', t => {
  const store = fixtureStore(['stored-A']), h = harness({ store });
  h.env.openSourceUpdateReview(h.flow, null, 'stored-A');
  const session = h.env.sourceUpdateSession, changeId = session.candidate.changes[0].changeId;
  h.choose(changeId); const working = raw(session.workingStore), memory = h.env.sourcePracticeMemory;
  const peer = RT.resolvePersonalWorkspacePocSourceCandidateChange(store, { candidateId: 'stored-A', changeId, resolution: 'use-incoming', now: NOW });
  assert.equal(peer.code, 'resolved'); h.external(raw(peer.store)); h.env.personalPlanSourceEpoch++;
  h.env.refreshSourceUpdateReview();
  assert.equal(h.env.sourceUpdateSession, session); assert.equal(session.status, 'stale');
  assert.equal(session.error, 'conflicting-source-practice-record');
  assert.equal(h.env.sourcePracticeMemory, memory); assert.equal(raw(session.workingStore), working);
  assert.equal(h.counts.generator, 0); h.check(t);
});

test('C2A07 unsupported/absent targets and outer editor/move/recovery locks cannot start a practice', t => {
  const h = harness();
  for (const flow of h.state.flows.filter(row => row.origin !== 'authoring-handoff')) {
    h.env.screen.selectedFlowId = flow.id; h.env.openGuide();
    const html = h.calls.filter(row => row[0] === 'dialog').at(-1)[2];
    assert.match(html, /data-action="start-source-practice"[^>]* disabled/);
    assert.equal(h.env.startLocalSourcePractice(flow, null), false);
  }
  h.env.screen.selectedFlowId = null; h.env.openGuide();
  assert.ok(h.calls.filter(row => row[0] === 'dialog').at(-1)[2].includes('연습할 Flow를 먼저 열어 주세요.'));
  for (const lock of ['editor', 'moveTarget', 'writable']) {
    const previous = h.env[lock]; h.env[lock] = lock === 'writable' ? false : {};
    const beforeDialogs = h.calls.filter(row => row[0] === 'dialog').length;
    h.env.openGuide(); assert.equal(h.env.startLocalSourcePractice(h.flow, null), false);
    assert.equal(h.calls.filter(row => row[0] === 'dialog').length, beforeDialogs); h.env[lock] = previous;
  }
  h.env.sourceCandidateStoreStatus = 'read-error';
  assert.equal(h.env.sourceCandidatePreview(h.flow), null);
  assert.equal(h.env.startLocalSourcePractice(h.flow, null), false);
  assert.ok(h.env.renderSourceUpdateBanner(h.flow).includes('standalone-source-update-unavailable'));
  assert.equal(h.env.sourceUpdateSession, null); assert.equal(h.counts.generator, 0); h.check(t);
});
