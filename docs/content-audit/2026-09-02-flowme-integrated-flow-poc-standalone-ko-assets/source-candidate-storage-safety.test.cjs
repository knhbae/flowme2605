'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const M = require('./model.js');
const RT = require('./source-update-runtime.cjs').loadCommonJs();
const KEY = M.SOURCE_CANDIDATE_STORAGE_KEY;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const modelFile = path.join(__dirname, 'model.js');
function writerSource() {
  const source = fs.readFileSync(modelFile, 'utf8'), ast = ts.createSourceFile(modelFile, source, ts.ScriptTarget.Latest, true);
  const found = [];
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'writeSourceCandidateStore') found.push(node); ts.forEachChild(node, visit); }
  visit(ast); assert.equal(found.length, 1); return found[0].getText(ast);
}
const modelHash = hash(fs.readFileSync(modelFile, 'utf8')), writerHash = hash(writerSource());
const NOW = '2026-09-04T00:00:00.000Z', LATER = '2026-09-04T00:04:00.000Z';
const SENTINEL = 'flow:source-storage-safety:standalone-fixture', SENTINEL_RAW = '  isolated fixture\r\n🌿 ';
// Actual M authoring handoff -> shared candidate transition -> actual M writer.
// No product app, browser, native storage event or user profile is involved.
function fixture(id = 'main') {
  const rawText = '# 주말 준비\n## 준비\n- [ ] 장보기';
  const handoff = M.makeHandoff(rawText, { draftId: `storage-${id}`, handoffId: `storage-handoff-${id}`, sourceConfirmed: true, folderId: null });
  const committed = M.apply(M.seedState(), { type: 'commit-authoring', handoff, now: NOW });
  assert.equal(committed.changed, true, committed.error);
  const flow = committed.state.flows.find(entry => entry.handoffId === handoff.handoffId);
  const authored = M.standaloneAuthoredFlowForSourceUpdate(committed.state, flow.id);
  const envelope = RT.createPersonalWorkspacePocLocalFixtureEnvelope(authored, {
    incomingRawText: rawText.replace('장보기', '새 장보기'), incomingRevisionId: `incoming-${id}`, candidateId: `candidate-${id}`, createdAt: NOW,
  });
  assert.equal(envelope.ok, true, envelope.reason);
  let resolved = RT.stagePersonalWorkspacePocSourceCandidate(RT.createPersonalWorkspacePocSourceCandidateStore(NOW), envelope.envelope, envelope.current, NOW).store;
  for (const change of envelope.envelope.changes) resolved = RT.resolvePersonalWorkspacePocSourceCandidateChange(resolved, {
    candidateId: envelope.envelope.candidateId, changeId: change.changeId, resolution: 'use-incoming', now: NOW,
  }).store;
  const applied = RT.applyPersonalWorkspacePocSourceCandidate(resolved, { candidateId: envelope.envelope.candidateId, current: envelope.current, now: NOW });
  assert.equal(applied.code, 'applied');
  const undone = RT.undoPersonalWorkspacePocSourceCandidate(applied.store, LATER); assert.equal(undone.code, 'undone');
  return { resolved, applied: applied.store, undone: undone.store };
}
function storageFixture(before, foreign, mode) {
  const data = new Map([[KEY, before], [SENTINEL, SENTINEL_RAW]]), calls = [], injections = [];
  let armed = false, fired = false;
  return {
    data, calls, injections,
    storage: {
      getItem(key) {
        if (key === KEY && armed && !fired && foreign && mode) {
          fired = true; data.set(KEY, foreign); injections.push({ mode, foreignHash: hash(foreign) });
          if (mode === 'read-error') throw Error('test-only: readback failed after foreign X');
        }
        return data.get(key) ?? null;
      },
      setItem(key, value) { assert.equal(key, KEY); calls.push({ method: 'setItem', key, beforeHash: data.has(key) ? hash(data.get(key)) : null, afterHash: hash(value) }); data.set(key, value); armed = true; },
      removeItem(key) { assert.equal(key, KEY); calls.push({ method: 'removeItem', key }); data.delete(key); },
    },
  };
}
test('C2-SW00 normal control: standalone actual apply and Undo each save and reload exactly', () => {
  const f = fixture();
  for (const operation of ['apply', 'undo']) {
    const before = JSON.stringify(operation === 'apply' ? f.resolved : f.applied), after = operation === 'apply' ? f.applied : f.undone;
    const s = storageFixture(before), result = M.writeSourceCandidateStore(s.storage, after, before);
    assert.equal(result, JSON.stringify(after)); assert.equal(s.data.get(KEY), result);
    assert.equal(M.loadSourceCandidateStore(s.storage).status, 'restored'); assert.equal(s.calls.length, 1);
    assert.equal(s.data.get(SENTINEL), SENTINEL_RAW); assert.deepEqual(s.injections, []);
    console.log(JSON.stringify({ id: 'C2-SW00', operation, modelHash, writerHash, productApis: s.calls, externalInjections: 0, sentinelEqual: true }));
  }
});
for (const operation of ['apply', 'undo']) for (const mode of ['mismatch', 'read-error']) {
  test(`C2-SW-${operation}-${mode}: standalone preserves foreign X at failed readback`, () => {
    const f = fixture(), foreign = JSON.stringify(fixture('foreign-X').applied);
    assert.equal(RT.isPersonalWorkspacePocSourceCandidateStore(JSON.parse(foreign)), true);
    const before = JSON.stringify(operation === 'apply' ? f.resolved : f.applied), after = operation === 'apply' ? f.applied : f.undone;
    const s = storageFixture(before, foreign, mode); let caught;
    try { M.writeSourceCandidateStore(s.storage, after, before); } catch (error) { caught = error; }
    console.log(JSON.stringify({ id: `C2-SW-${operation}-${mode}`, modelHash, writerHash, error: caught?.message,
      rollback: caught?.rollback, rollbackError: caught?.rollbackError?.message, foreignPreserved: s.data.get(KEY) === foreign,
      restoredBefore: s.data.get(KEY) === before, beforeHash: hash(before), foreignHash: hash(foreign), finalHash: hash(s.data.get(KEY)),
      productApis: s.calls, externalInjections: s.injections, sentinelEqual: s.data.get(SENTINEL) === SENTINEL_RAW }));
    assert.ok(caught); assert.equal(s.injections.length, 1); assert.equal(s.data.get(SENTINEL), SENTINEL_RAW);
    assert.equal(s.data.get(KEY) === foreign, true, 'Foreign X is never an owned rollback target');
    assert.equal(s.calls.length, 1); assert.equal(caught.rollback, 'recovery-required'); assert.ok(caught.rollbackError);
  });
}
test.after(() => { assert.equal(hash(writerSource()), writerHash, 'Root may edit other model functions; this writer must stay frozen during its run'); });
