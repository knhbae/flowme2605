'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
const { NOW, clone, sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const RT = require('./source-update-runtime.cjs').loadCommonJs();
const file = path.join(__dirname, 'model.js');
const source = fs.readFileSync(file, 'utf8');
const raw = JSON.stringify;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const names = ['readLocalSourcePracticeContext', 'resumeLocalSourceCandidateReview', 'mergeLocalSourcePracticeStore',
  'prepareLocalSourceCandidateReview', 'applyLocalSourceCandidate'];
function slices(text) {
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const found = {};
  function visit(node) { if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) found[node.name.text] = sha(node.getText(ast)); ts.forEachChild(node, visit); }
  visit(ast); assert.equal(Object.keys(found).length, names.length); return found;
}
const before = { wholeSha: sha(source), slices: slices(source) };
test.after(() => {
  const text = fs.readFileSync(file, 'utf8'), after = { wholeSha: sha(text), slices: slices(text) };
  assert.deepEqual(after.slices, before.slices, 'target function changed during execution');
  console.log('C2_MODEL_SOURCE ' + raw({ before, after, wholeFileMayIncludeOtherAgentWriterChanges: true, browser: 'NOT_RUN' }));
});
function harness() {
  const counts = { generator: 0, stage: 0 };
  const tracked = { ...RT,
    createPersonalWorkspacePocLocalFixtureEnvelope(...args) { counts.generator++; return RT.createPersonalWorkspacePocLocalFixtureEnvelope(...args); },
    stagePersonalWorkspacePocSourceCandidate(...args) { counts.stage++; return RT.stagePersonalWorkspacePocSourceCandidate(...args); } };
  const box = { module: { exports: {} }, require(name) {
    return name === './source-update-runtime.cjs' ? { loadCommonJs: () => tracked } : require(path.join(__dirname, name));
  } };
  vm.runInNewContext(source, box, { filename: file });
  const M = box.module.exports;
  for (const name of names) assert.equal(typeof M[name], 'function', 'actual API ' + name);
  const f = sourceUpdateFixture();
  const state = clone(f.state), flow = state.flows.find(row => row.id === f.flow.id);
  const stateBefore = raw(state);
  return { M, f, state, flow, counts, empty: M.initialSourceCandidateStore(NOW),
    reset() { counts.generator = 0; counts.stage = 0; },
    check(t, values) { assert.equal(raw(state), stateBefore); t.diagnostic(raw({ counts, stateBytesExact: true, storageDependencySupplied: false, ...values })); } };
}
function candidate(h, id, store = h.empty, flowId = h.flow.id) {
  const authored = h.M.standaloneAuthoredFlowForSourceUpdate(h.state, flowId);
  const made = RT.createPersonalWorkspacePocLocalFixtureEnvelope(authored, {
    candidateId: id, incomingRawText: authored.authoring.rawText.replace('원문 제목', '새 원문 ' + id).replace('접수', '새 접수'),
    createdAt: NOW, incomingRevisionId: 'revision-' + id,
  });
  assert.equal(made.ok, true, made.reason);
  const staged = RT.stagePersonalWorkspacePocSourceCandidate(store, made.envelope, made.current, NOW);
  assert.equal(staged.code, 'staged');
  return { ...made, store: staged.store };
}
function choose(store, candidateId, changeId, resolution = 'keep-mine') {
  const result = RT.resolvePersonalWorkspacePocSourceCandidateChange(store, { candidateId, changeId, resolution, now: NOW });
  assert.equal(result.code, 'resolved'); return result.store;
}
function applied(store, envelope, current, choice = 'use-incoming') {
  let resolved = store;
  for (const change of envelope.changes) resolved = choose(resolved, envelope.candidateId, change.changeId, typeof choice === 'function' ? choice(change) : choice);
  const result = RT.applyPersonalWorkspacePocSourceCandidate(resolved, { candidateId: envelope.candidateId, current, now: NOW });
  assert.equal(result.code, 'applied'); return result.store;
}

test('C2M01 empty source-only context excludes personal title/memo/date and generates nothing', t => {
  const h = harness(), result = h.M.readLocalSourcePracticeContext(h.empty, h.state, h.flow.id);
  assert.equal(result.ok, true, result.reason);
  const item = result.current.projectedFlow.items[0], personal = h.state.tasks.find(row => row.flowId === h.flow.id);
  assert.notEqual(item.title, personal.title); assert.equal(item.title, personal.sourceTitle);
  assert.notEqual(item.description, personal.memo); assert.notEqual(item.sourceDate, personal.planDate);
  assert.deepEqual(Array.from(result.catalog.candidates), []);
  assert.deepEqual(h.counts, { generator: 0, stage: 0 }); h.check(t);
});

test('C2M02 keep-mine effective projection is the source-only current and next comparison mine', t => {
  for (const mode of ['keep-all', 'keep-flow-use-item']) {
  const h = harness(), p = candidate(h, 'keep-source-owner');
  const store = applied(p.store, p.envelope, p.current, change => mode === 'keep-all' || change.scope === 'flow' ? 'keep-mine' : 'use-incoming');
  const effective = store.effectiveVersions[h.flow.ref];
  assert.notEqual(effective.projectedFlow.title, effective.sourceRevision.projectedFlow.title, 'genuine mixed ownership positive control');
  const beforeStore = raw(store), context = h.M.readLocalSourcePracticeContext(store, h.state, h.flow.id);
  assert.equal(context.ok, true, context.reason);
  t.diagnostic(raw({ actual: context.current.projectedFlow.title, expected: effective.projectedFlow.title,
    incoming: effective.sourceRevision.projectedFlow.title, counts: h.counts, mode }));
  assert.equal(raw(context.current.projectedFlow), raw(effective.projectedFlow), 'current must use the resolved source projection, not unaccepted incoming values');
  assert.equal(context.current.rawText, effective.sourceRevision.rawText);
  const next = h.M.prepareLocalSourceCandidateReview(store, h.state, h.flow.id);
  assert.equal(next.ok, true, next.reason);
  assert.equal(raw(next.candidate.mine.projectedFlow), raw(effective.projectedFlow));
  assert.equal(raw(store), beforeStore); assert.deepEqual(h.counts, { generator: 1, stage: 1 }); h.check(t, { mode });
  }
});

test('C2M03 arbitrary IDs and multiple records are scoped to the exact copy; resume does not generate', t => {
  const h = harness(), a = candidate(h, 'arbitrary-z'), b = candidate(h, 'arbitrary-a', a.store);
  const other = h.M.makeHandoff('# 다른 사본\n- [ ] 보존', { draftId: 'other-draft', handoffId: 'other-handoff', sourceConfirmed: true, folderId: null });
  const added = h.M.apply(h.state, { type: 'commit-authoring', handoff: other, now: NOW });
  assert.equal(added.changed, true);
  const otherFlow = added.state.flows.find(row => row.handoffId === other.handoffId);
  const made = RT.createPersonalWorkspacePocLocalFixtureEnvelope(h.M.standaloneAuthoredFlowForSourceUpdate(added.state, otherFlow.id), { candidateId: 'other-private-ID', createdAt: NOW });
  assert.equal(made.ok, true);
  const mixed = RT.stagePersonalWorkspacePocSourceCandidate(b.store, made.envelope, made.current, NOW).store;
  const context = h.M.readLocalSourcePracticeContext(mixed, added.state, h.flow.id);
  assert.deepEqual(Array.from(context.catalog.candidates, row => row.candidateId), ['arbitrary-z', 'arbitrary-a']);
  const resumed = h.M.resumeLocalSourceCandidateReview(mixed, added.state, h.flow.id, 'arbitrary-a', NOW);
  assert.equal(resumed.ok, true); assert.equal(resumed.candidate.candidateId, 'arbitrary-a');
  assert.equal(h.M.resumeLocalSourceCandidateReview(mixed, added.state, h.flow.id, 'other-private-ID', NOW).ok, false);
  assert.equal(h.counts.generator, 0); h.check(t);
});

test('C2M04 unreviewed record is read unchanged and only exact explicit resume stages it', t => {
  const h = harness(), a = candidate(h, 'unreviewed');
  const store = { ...h.empty, envelopes: { unreviewed: a.envelope } }, beforeStore = raw(store);
  assert.equal(h.M.readLocalSourcePracticeContext(store, h.state, h.flow.id).catalog.candidates[0].status, 'unreviewed');
  assert.equal(raw(store), beforeStore); assert.deepEqual(h.counts, { generator: 0, stage: 0 });
  const result = h.M.resumeLocalSourceCandidateReview(store, h.state, h.flow.id, 'unreviewed', NOW);
  assert.equal(result.code, 'staged'); assert.equal(result.store.reviews.unreviewed.status, 'pending');
  assert.equal(raw(store), beforeStore); assert.deepEqual(h.counts, { generator: 0, stage: 1 }); h.check(t);
});

test('C2M05 deferred decisions and another candidate remain exact through resume and same choice', t => {
  const h = harness(), a = candidate(h, 'A'), b = candidate(h, 'B', a.store);
  const resolved = choose(b.store, 'A', a.envelope.changes[0].changeId);
  const deferred = RT.deferPersonalWorkspacePocSourceCandidate(resolved, { candidateId: 'A', now: NOW }).store;
  const beforeB = raw(deferred.envelopes.B), beforeReviewB = raw(deferred.reviews.B);
  const result = h.M.resumeLocalSourceCandidateReview(deferred, h.state, h.flow.id, 'A', NOW);
  assert.equal(result.code, 'resumed'); assert.equal(raw(result.store.reviews.A.resolutions), raw(deferred.reviews.A.resolutions));
  assert.equal(raw(result.store.envelopes.B), beforeB); assert.equal(raw(result.store.reviews.B), beforeReviewB);
  const repeated = h.M.resolveLocalSourceCandidateChange(result.store, { candidateId: 'A', changeId: a.envelope.changes[0].changeId, resolution: 'keep-mine', now: NOW });
  assert.equal(repeated.changed, false); assert.equal(h.counts.generator, 0); h.check(t);
});

test('C2M06 three-way merge retains durable-only review changes instead of old local snapshots', t => {
  const h = harness(), a = candidate(h, 'A'), base = a.store;
  const durable = choose(base, 'A', a.envelope.changes[0].changeId, 'use-incoming');
  const snapshots = [raw(durable), raw(base)];
  const result = h.M.mergeLocalSourcePracticeStore(durable, base, base);
  assert.equal(result.ok, true, result.reason); assert.equal(raw(result.store), raw(durable));
  assert.deepEqual([raw(durable), raw(base)], snapshots); assert.deepEqual(h.counts, { generator: 0, stage: 0 }); h.check(t);
});

test('C2M07 merge combines local decision delta with another durable applied owner without losing Undo', t => {
  const h = harness(), a = candidate(h, 'A'), b = candidate(h, 'B', a.store), base = b.store;
  const local = choose(base, 'A', a.envelope.changes[0].changeId);
  const durable = applied(base, b.envelope, b.current);
  const beforeStores = raw([base, local, durable]);
  const result = h.M.mergeLocalSourcePracticeStore(durable, local, base);
  assert.equal(result.ok, true, result.reason);
  assert.equal(raw(result.store.reviews.A), raw(local.reviews.A));
  assert.equal(raw(result.store.reviews.B), raw(durable.reviews.B));
  assert.equal(raw(result.store.effectiveVersions), raw(durable.effectiveVersions));
  assert.equal(raw(result.store.undo), raw(durable.undo));
  assert.equal(raw([base, local, durable]), beforeStores); h.check(t);
});

test('C2M08 conflicting same-record decisions and local deletion are blocked without modifying any branch', t => {
  const h = harness(), a = candidate(h, 'A'), base = a.store;
  const local = choose(base, 'A', a.envelope.changes[0].changeId);
  const durable = choose(base, 'A', a.envelope.changes[0].changeId, 'use-incoming');
  const beforeStores = raw([base, local, durable]);
  const result = h.M.mergeLocalSourcePracticeStore(durable, local, base);
  assert.equal(result.ok, false); assert.equal(result.reason, 'conflicting-source-practice-record');
  assert.equal(raw([base, local, durable]), beforeStores);
  const removed = clone(base); delete removed.reviews.A;
  const deletion = h.M.mergeLocalSourcePracticeStore(base, removed, base);
  assert.equal(deletion.ok, false); assert.equal(deletion.reason, 'removed-source-practice-record'); h.check(t);
});

test('C2M09 invalid store, legacy origins and unknown target never synthesize a practice candidate', t => {
  const h = harness();
  for (const flow of h.M.seedState().flows) {
    const result = h.M.readLocalSourcePracticeContext(h.empty, h.M.seedState(), flow.id);
    assert.equal(result.ok, false); assert.equal(result.reason, 'unsupported-origin');
  }
  for (const store of [null, { ...h.empty, version: 999 }]) assert.equal(h.M.readLocalSourcePracticeContext(store, h.state, h.flow.id).ok, false);
  assert.equal(h.M.readLocalSourcePracticeContext(h.empty, h.state, 'missing').ok, false);
  const converted = h.M.apply(h.state, { type: 'convert-quick-item-to-flow', quickItemId: 'call',
    expectedRevision: h.state.revision, flowTitle: '빠른 항목의 실제 사본', now: NOW });
  assert.equal(converted.changed, true);
  const receipt = h.M.quickConversionReceipts(converted.state)[0]; assert.ok(receipt);
  const blocked = h.M.readLocalSourcePracticeContext(h.empty, converted.state, receipt.flowId);
  assert.equal(blocked.ok, false); assert.equal(blocked.reason, 'unsupported-origin');
  assert.deepEqual(h.counts, { generator: 0, stage: 0 }); h.check(t);
});
