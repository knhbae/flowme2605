'use strict';
// C2 baseline: actual adapter bodies and actual shared validators. NOT mounted
// React, browser reload, full app render, or actual C1 UI coverage.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../../..');
const { C, NOW, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const P = require('./personal-plan-context.js');
const runtime = require('./source-update-runtime.cjs');
const RT = runtime.loadCommonJs();
const appFile = path.join(__dirname, 'app.js');
const surfaceFile = path.join(root, 'components/flow/personal-workspace-poc/PersonalWorkspacePocSurface.tsx');
const reviewFile = path.join(root, 'components/flow/personal-workspace-poc/PersonalWorkspacePocSourceUpdateReview.tsx');
const modelFile = path.join(__dirname, 'model.js');
const app = fs.readFileSync(appFile, 'utf8'), surface = fs.readFileSync(surfaceFile, 'utf8');
const model = fs.readFileSync(modelFile, 'utf8');
const raw = value => JSON.stringify(value);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const protectedFiles = [__filename, appFile, modelFile, surfaceFile, reviewFile, runtime.canonicalEntry,
  path.join(__dirname, 'source-update-runtime.cjs'), path.join(__dirname, 'personal-entry-read.js'),
  path.join(__dirname, 'personal-plan-display.js'), path.join(__dirname, 'k3b-plan-lossless-gate.fixture.cjs'),
  path.join(__dirname, '../2026-09-02-flowme-integrated-flow-poc-standalone-ko.html'),
  path.join(__dirname, '../2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html')];
const hashes = () => Object.fromEntries(protectedFiles.map(file => [path.relative(root, file), sha(fs.readFileSync(file))]));
const before = hashes(), bundleSha256 = sha(runtime.buildBrowserText());
assert.equal(sha(app), 'd7a3c8ebe91476fe7b92f65860afd6c9142bb2763ef96deadc664f3c9f1180f4');
assert.equal(sha(model), 'c21eda9a5690214cc0c8202fe4915a6df7091e76a53eba1df63a5c5303df4d36');
assert.equal(sha(surface), 'b4546c85e1feeb31bef9008f620e10309b6aacd6f815b0b1d30113c9d6f05ba9');
test.after(() => {
  const after = hashes();
  assert.deepEqual(after, before); assert.equal(sha(runtime.buildBrowserText()), bundleSha256);
  console.log('C2_BASELINE_SOURCE ' + raw({ before, after, exact: true, bundleSha256,
    browser: 'NOT_RUN', mountedReact: 'NOT_RUN', reload: 'actual M.load roundtrip only',
    uiBindings: 'setters/render/focus are environment recorders; no future query API or fake candidate', actualDevice: 'NOT_RUN' }));
});
const appAst = ts.createSourceFile(appFile, app, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const surfaceAst = ts.createSourceFile(surfaceFile, surface, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodes(ast, predicate) {
  const out = []; function visit(node) { if (predicate(node)) out.push(node); ts.forEachChild(node, visit); } visit(ast); return out;
}
function functions(ast, names) {
  return names.map(name => {
    const found = nodes(ast, n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(found.length, 1, 'one actual function ' + name);
    return found[0].getText(ast).replace(/^export\s+/u, '');
  }).join('\n');
}
function reactDeclarations(names) {
  return names.map(name => {
    const found = nodes(surfaceAst, n => ts.isVariableDeclaration(n) && n.name.getText(surfaceAst) === name);
    assert.equal(found.length, 1, 'one actual React closure ' + name);
    return 'const ' + found[0].getText(surfaceAst) + ';';
  }).join('\n');
}
function js(source) { return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText; }
function instrumentation() {
  const counts = { generator: 0, stage: 0, prepare: 0 };
  const tracked = { ...RT,
    createPersonalWorkspacePocLocalFixtureEnvelope(...args) { counts.generator++; return RT.createPersonalWorkspacePocLocalFixtureEnvelope(...args); },
    stagePersonalWorkspacePocSourceCandidate(...args) { counts.stage++; return RT.stagePersonalWorkspacePocSourceCandidate(...args); } };
  const sandbox = { module: { exports: {} }, require(name) {
    return name === './source-update-runtime.cjs' ? { loadCommonJs: () => tracked } : require(path.join(__dirname, name));
  } };
  vm.runInNewContext(model, sandbox, { filename: modelFile });
  const actualM = sandbox.module.exports;
  const M = { ...actualM, prepareLocalSourceCandidateReview(...args) { counts.prepare++; return actualM.prepareLocalSourceCandidateReview(...args); } };
  return { M, tracked, counts, reset() { counts.generator = counts.stage = counts.prepare = 0; } };
}
function fixture(i) {
  // The source-update fixture uses a genuine authored handoff and current model.
  // Its applied store is deliberately NOT used: baseline starts with no candidate.
  const f = sourceUpdateFixture();
  const cp = C.fromLegacy(raw({ version: 1, state: f.state, undo: null })); assert.equal(cp.ok, true, cp.reason);
  const store = i.M.initialSourceCandidateStore(NOW);
  assert.equal(RT.isPersonalWorkspacePocSourceCandidateStore(store), true);
  assert.deepEqual(Object.keys(store.reviews), []);
  const map = new Map([[i.M.SOURCE_CANDIDATE_STORAGE_KEY, raw(store)], [i.M.STORAGE_KEY, cp.checkpoint.legacyBaseRaw],
    [C.STORAGE_KEY, raw(cp.checkpoint)], [i.M.DRAFT_STORAGE_KEY, 'retained draft bytes'], ['flow:operating:c2-sentinel', '  原文\r\n🙂  ']]);
  const writes = [], initial = raw([...map]);
  const storage = { getItem: key => map.has(key) ? map.get(key) : null,
    setItem(key, value) { writes.push(['setItem', key]); map.set(key, value); },
    removeItem(key) { writes.push(['removeItem', key]); map.delete(key); }, clear() { writes.push(['clear']); assert.fail('clear forbidden'); } };
  const prepared = i.M.prepareLocalSourceCandidateReview(store, f.state, f.flow.id);
  assert.equal(prepared.ok, true, prepared.reason); assert.ok(prepared.candidate.changes.length > 0);
  assert.deepEqual(i.counts, { generator: 1, stage: 1, prepare: 1 }, 'instrumentation positive control invokes actual generator/stage');
  i.reset();
  return { ...f, checkpoint: cp.checkpoint, store, storage, map, writes,
    unchanged() { assert.equal(raw([...map]), initial); assert.deepEqual(writes, []); } };
}
function standalone(i, f) {
  const loaded = i.M.loadSourceCandidateStore(f.storage); assert.equal(loaded.status, 'restored');
  const env = { M: i.M, storage: f.storage, envelope: f.checkpoint, sourceCandidateStore: loaded.store,
    sourceCandidateRaw: loaded.raw, sourceCandidateStoreStatus: loaded.status, loadedSourceCandidates: loaded,
    sourceUpdateSession: null, sourceUpdateReturnFocus: null, sourceUpdateValueView: 'mine',
    personalPlanSourceEpoch: 0, deferredSourceUpdateFlowIds: new Set(),
    // Environment only: active writable workspace and focus/render plumbing.
    activeEditorSession: () => null, workspaceWritable: () => true, render() {}, setSaveStatus() {}, showToast() {}, focusAfterRender() {},
    escapeHtml: value => String(value).replace(/[&<>"']/g, '_'),
    document: { activeElement: null, querySelector: () => null }, window: { setTimeout: fn => fn() } };
  vm.createContext(env);
  vm.runInContext(functions(appAst, ['sourceCandidateBlocked', 'sourceCandidatePreview', 'readPersonalSourceEpoch',
    'adoptPersonalDisplaySource', 'refreshPersonalDisplaySource', 'openSourceUpdateReview', 'closeSourceUpdateReview', 'renderSourceUpdateBanner']), env);
  const branch = nodes(appAst, n => ts.isIfStatement(n) && n.expression.getText(appAst) === "event.target.matches('[data-source-update-choice]') && sourceUpdateSession");
  assert.equal(branch.length, 1);
  vm.runInContext('function actualChoice(event) {' + branch[0].getText(appAst) + '}', env);
  return env;
}
function c1Read(i, f) {
  const scope = { FlowMeIntegratedPoc: i.M, FlowPocWorkspaceCheckpoint: C, FlowPocPersonalPlanContext: P };
  vm.createContext(scope);
  for (const file of ['personal-plan-display.js', 'personal-entry-read.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), scope);
  const capture = scope.FlowPocPersonalEntryRead.createPersonalEntryReadPacket({ checkpoint: f.checkpoint,
    sourceRead: { ok: true, raw: f.storage.getItem(i.M.SOURCE_CANDIDATE_STORAGE_KEY) }, sourceEpoch: 0 });
  assert.equal(capture.ok, true, capture.reason);
  const read = scope.FlowPocPersonalEntryRead.readPersonalEntryCatalog(capture.packet); assert.equal(read.ok, true, read.reason);
  assert.equal(read.catalog.copies.length, 4);
  assert.equal(read.catalog.excluded.some(row => row.flowRef === f.flow.ref), true);
}
test('C2-R01-S standalone ordinary banner/read-decoder reentry generates no candidate; C1 actual read subcheck', t => {
  const i = instrumentation(), f = fixture(i), first = standalone(i, f), observed = [];
  c1Read(i, f); assert.deepEqual(i.counts, { generator: 0, stage: 0, prepare: 0 }); f.unchanged();
  for (const label of ['first-flow-render', 'repeat-render', 'fresh-decoder-reentry']) {
    const env = label === 'fresh-decoder-reentry' ? standalone(i, f) : first;
    const html = env.renderSourceUpdateBanner(f.flow);
    observed.push({ label, banner: html.includes('data-testid="standalone-source-update-banner"'), counts: { ...i.counts } });
  }
  f.unchanged(); t.diagnostic(raw({ observed, C1ReadGenerator: 0, writes: f.writes.length, browserReload: 'NOT_RUN' }));
  assert.deepEqual(i.counts, { generator: 0, stage: 0, prepare: 0 }, 'ordinary render must not generate or stage a local practice candidate');
  assert.ok(observed.every(row => !row.banner), 'no automatic practice banner');
});
test('C2-R05-S standalone actual choice, close/defer and reopen preserve the same in-memory candidate decisions', t => {
  const i = instrumentation(), f = fixture(i), env = standalone(i, f);
  env.openSourceUpdateReview(f.flow, null); assert.ok(env.sourceUpdateSession);
  const id = env.sourceUpdateSession.candidateId, change = env.sourceUpdateSession.candidate.changes[0];
  env.actualChoice({ target: { matches: value => value === '[data-source-update-choice]', value: 'keep-mine', dataset: { changeId: change.changeId } } });
  const decided = raw(env.sourceUpdateSession.workingStore.reviews[id].resolutions);
  assert.equal(env.sourceUpdateSession.workingStore.reviews[id].resolutions[change.changeId], 'keep-mine');
  env.closeSourceUpdateReview({ restoreFocus: false, announce: false }); assert.equal(env.sourceUpdateSession, null); f.unchanged();
  env.openSourceUpdateReview(f.flow, null); assert.ok(env.sourceUpdateSession);
  const reopened = env.sourceUpdateSession.workingStore.reviews[id];
  f.unchanged(); t.diagnostic(raw({ candidateExact: env.sourceUpdateSession.candidateId === id, expectedResolutions: decided,
    reopenedResolutions: reopened.resolutions, durableReviews: Object.keys(i.M.loadSourceCandidateStore(f.storage).store.reviews), writes: f.writes.length }));
  assert.equal(env.sourceUpdateSession.candidateId, id);
  assert.equal(raw(reopened.resolutions), decided, 'defer must preserve the same-execution decisions instead of discarding its returned store');
});
function react(i, f) {
  const local = { sourceUpdateOpen: false, sourceUpdateStatus: 'pending', sourceUpdateLaterChangeIds: {}, errors: [] };
  const env = { ...i.tracked, sourceUpdateAuthoredFlow: i.M.standaloneAuthoredFlowForSourceUpdate(f.state, f.flow.id),
    sourceCandidateStore: f.store, sourceCandidateStoreRef: { current: f.store },
    useMemo: callback => callback(), useCallback: callback => callback,
    setSourceCandidateStore(value) { env.sourceCandidateStore = value; },
    setStatus(value) { local.status = value; }, setSourceUpdateOpen(value) { local.sourceUpdateOpen = value; },
    setSourceUpdateSelectedChangeId(value) { local.selected = value; },
    setSourceUpdateStatus(value) { local.sourceUpdateStatus = value; }, setSourceUpdateError(value) { local.error = value; },
    setSourceUpdateLaterChangeIds(value) { local.sourceUpdateLaterChangeIds = typeof value === 'function' ? value(local.sourceUpdateLaterChangeIds) : value; } };
  assert.ok(env.sourceUpdateAuthoredFlow);
  vm.createContext(env);
  vm.runInContext(js(functions(surfaceAst, ['buildPersonalWorkspacePocSourceUpdateFixtureRaw'])
    + '\n' + reactDeclarations(['sourceUpdateEnvelopeResult', 'stageSourceUpdateInMemory', 'openSourceUpdateReview', 'deferSourceUpdateReview', 'resolveSourceUpdateChange'])
    + '\nglobalThis.actual = { sourceUpdateEnvelopeResult, stageSourceUpdateInMemory, openSourceUpdateReview, deferSourceUpdateReview, resolveSourceUpdateChange };'), env);
  assert.equal(env.actual.sourceUpdateEnvelopeResult.ok, true, 'actual generated envelope validates');
  return { env, local, actual: env.actual };
}
test('C2-R01-R React actual render-time memo callbacks generate no candidate before explicit practice', t => {
  const i = instrumentation(), f = fixture(i);
  for (let step = 0; step < 2; step++) react(i, f); // Two fresh callback captures, not mounted React/reload.
  f.unchanged(); t.diagnostic(raw({ counts: i.counts, writes: f.writes.length, mounted: false, captures: 2 }));
  assert.equal(i.counts.generator, 0, 'render-time useMemo must not manufacture an incoming fixture');
  assert.equal(i.counts.stage, 0);
});
test('C2-R05-R React actual callbacks preserve decisions through defer and reopen without durable writes', t => {
  const i = instrumentation(), f = fixture(i), h = react(i, f);
  h.actual.openSourceUpdateReview(); assert.equal(h.local.sourceUpdateOpen, true);
  const id = h.actual.sourceUpdateEnvelopeResult.envelope.candidateId, change = h.actual.sourceUpdateEnvelopeResult.envelope.changes[0];
  h.actual.resolveSourceUpdateChange(change.changeId, 'keep-working');
  const decided = raw(h.env.sourceCandidateStoreRef.current.reviews[id].resolutions);
  assert.equal(h.env.sourceCandidateStoreRef.current.reviews[id].resolutions[change.changeId], 'keep-mine');
  h.actual.deferSourceUpdateReview(); assert.equal(h.local.sourceUpdateOpen, false);
  assert.equal(h.env.sourceCandidateStoreRef.current.reviews[id].status, 'deferred');
  h.actual.openSourceUpdateReview(); assert.equal(h.local.sourceUpdateOpen, true);
  assert.equal(raw(h.env.sourceCandidateStoreRef.current.reviews[id].resolutions), decided);
  h.actual.resolveSourceUpdateChange(change.changeId, 'keep-working');
  assert.equal(raw(h.env.sourceCandidateStoreRef.current.reviews[id].resolutions), decided);
  f.unchanged(); assert.deepEqual(Object.keys(i.M.loadSourceCandidateStore(f.storage).store.reviews), []);
  t.diagnostic(raw({ candidateExact: true, resolutionsExact: true, writes: f.writes.length, durableReviews: 0, mounted: false }));
});
