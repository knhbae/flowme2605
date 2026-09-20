'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const M = require('./model.js');
const { sourceUpdateFixture } = require('./k3b-plan-lossless-gate.fixture.cjs');
const RT = require('./source-update-runtime.cjs').loadCommonJs();

// Two registrations, two isolated ownership branches in each (four fixtures).
// The real M writer and a real applied candidate store are used. The storage
// adapter throws only after it has stored the candidate. An optional foreign X
// is injected separately into the Map, not counted as a product storage API.
// These are adapter faults, NOT observed native browser storage exceptions.
const KEY = M.SOURCE_CANDIDATE_STORAGE_KEY, SENTINEL = 'flow:source-thrown-value:operating-fixture';
const SENTINEL_RAW = '  exact isolated sentinel\r\n🌿 ';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const modelFile = path.join(__dirname, 'model.js');
function writerText() {
  const text = fs.readFileSync(modelFile, 'utf8'), ast = ts.createSourceFile(modelFile, text, ts.ScriptTarget.Latest, true);
  const found = [];
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === 'writeSourceCandidateStore') found.push(node); ts.forEachChild(node, visit); }
  visit(ast); assert.equal(found.length, 1); return found[0].getText(ast);
}
const beforeWriterHash = hash(writerText()), beforeModelHash = hash(fs.readFileSync(modelFile));
if (process.env.FLOWME_EXPECT_STANDALONE_SOURCE_WRITER_SHA) assert.equal(beforeWriterHash, process.env.FLOWME_EXPECT_STANDALONE_SOURCE_WRITER_SHA.toLowerCase());

function runFault(kind, ownership, thrownValue) {
  const beforeRaw = JSON.stringify(M.initialSourceCandidateStore('2026-09-04T00:00:00.000Z'));
  const candidate = sourceUpdateFixture().store, candidateRaw = JSON.stringify(candidate);
  const foreignRaw = JSON.stringify(M.initialSourceCandidateStore('2026-09-04T00:05:00.000Z'));
  for (const raw of [beforeRaw, candidateRaw, foreignRaw]) assert.equal(RT.isPersonalWorkspacePocSourceCandidateStore(JSON.parse(raw)), true);
  assert.notEqual(beforeRaw, candidateRaw); assert.notEqual(foreignRaw, candidateRaw); assert.notEqual(foreignRaw, beforeRaw);
  const thrown = arguments.length === 3 ? thrownValue
    : kind === 'frozen-error' ? Object.freeze(new Error('fixture-frozen-after-write')) : 'fixture-primitive-after-write';
  const data = new Map([[KEY, beforeRaw], [SENTINEL, SENTINEL_RAW]]), calls = [], injections = [];
  let reads = 0;
  const storage = {
    getItem(key) { reads += 1; return data.get(key) ?? null; },
    setItem(key, value) {
      assert.equal(key, KEY);
      calls.push({ method: 'setItem', key, beforeHash: data.has(key) ? hash(data.get(key)) : null, afterHash: hash(value), throwsAfter: calls.length === 0 });
      data.set(key, value);
      if (calls.length === 1) {
        if (ownership === 'foreign-X') { data.set(KEY, foreignRaw); injections.push({ kind: 'test-foreign-X', hash: hash(foreignRaw) }); }
        throw thrown;
      }
    },
    removeItem(key) { assert.equal(key, KEY); calls.push({ method: 'removeItem', key }); data.delete(key); },
  };
  let caught, returned;
  try { returned = M.writeSourceCandidateStore(storage, candidate, beforeRaw); } catch (error) { caught = error; }
  const record = {
    id: `C2-TV-${kind}`, ownership, modelHash: beforeModelHash, writerHash: beforeWriterHash,
    returned: returned !== undefined, thrownKind: typeof thrown, thrownFrozen: typeof thrown === 'object' && Object.isFrozen(thrown),
    caughtKind: typeof caught, caughtName: caught?.name, caughtMessage: caught?.message ?? String(caught),
    caughtRollback: caught?.rollback, caughtRollbackError: caught?.rollbackError?.message, exactCause: caught?.cause === thrown,
    originalThrownUnmodified: typeof thrown === 'string' || !Object.hasOwn(thrown, 'rollback'),
    beforeHash: hash(beforeRaw), candidateHash: hash(candidateRaw), foreignHash: hash(foreignRaw), finalHash: hash(data.get(KEY)),
    beforeRestored: data.get(KEY) === beforeRaw, candidateRetained: data.get(KEY) === candidateRaw, foreignPreserved: data.get(KEY) === foreignRaw,
    reads, productApis: calls, externalInjections: injections, forbiddenApis: calls.filter(call => call.key !== KEY).length,
    sentinelEqual: data.get(SENTINEL) === SENTINEL_RAW,
  };
  console.log(JSON.stringify(record));
  return { record, caught };
}

for (const kind of ['frozen-error', 'primitive']) {
  test(`C2-TV-${kind}: throw-after retains ownership verification and exposes the correct failure state`, () => {
    // Run both branches BEFORE asserting, so an owned rollback RED does not
    // leave the foreign-X branch unexecuted or exaggerate its coverage.
    const results = ['owned-candidate', 'foreign-X'].map(ownership => runFault(kind, ownership));
    for (const { record } of results) {
      assert.equal(record.returned, false); assert.equal(record.originalThrownUnmodified, true);
      assert.equal(record.forbiddenApis, 0); assert.equal(record.sentinelEqual, true);
    }
    const owned = results[0], foreign = results[1];
    assert.equal(owned.record.beforeRestored, true, 'A frozen or primitive exception must not skip restoring the still-owned candidate');
    assert.equal(owned.record.exactCause, true); assert.equal(foreign.record.exactCause, true);
    assert.equal(owned.record.productApis.length, 2); assert.equal(owned.caught.rollback, 'complete');
    assert.equal(foreign.record.foreignPreserved, true); assert.equal(foreign.record.productApis.length, 1);
    assert.equal(foreign.caught.rollback, 'recovery-required'); assert.ok(foreign.caught.rollbackError);
    assert.match(owned.caught.message, kind === 'frozen-error' ? /fixture-frozen-after-write/u : /fixture-primitive-after-write/u);
  });
}
test('C2-TV-message-accessor: caught message getter and object coercion are never invoked', () => {
  let getterCalls = 0, coercionCalls = 0;
  const thrown = {
    get message() { getterCalls += 1; throw Error('must not invoke message getter'); },
    toString() { coercionCalls += 1; throw Error('must not stringify an arbitrary object'); },
    [Symbol.toPrimitive]() { coercionCalls += 1; throw Error('must not coerce an arbitrary object'); },
  };
  for (const ownership of ['owned-candidate', 'foreign-X']) {
    const { record, caught } = runFault('message-accessor', ownership, thrown);
    assert.equal(getterCalls, 0); assert.equal(coercionCalls, 0);
    assert.equal(caught.message, 'source-candidate-write-failed'); assert.equal(caught.cause, thrown);
    assert.equal(record.originalThrownUnmodified, true); assert.equal(record.sentinelEqual, true); assert.equal(record.forbiddenApis, 0);
    assert.equal(record.productApis.length, ownership === 'owned-candidate' ? 2 : 1);
    assert.equal(caught.rollback, ownership === 'owned-candidate' ? 'complete' : 'recovery-required');
    assert.equal(ownership === 'owned-candidate' ? record.beforeRestored : record.foreignPreserved, true);
  }
  console.log(JSON.stringify({ id: 'C2-TV-message-accessor-counts', getterCalls, coercionCalls, fixtures: 2 }));
});
test.after(() => {
  const afterWriterHash = hash(writerText()); assert.equal(afterWriterHash, beforeWriterHash);
  console.log(JSON.stringify({ id: 'C2-TV-manifest', beforeWriterHash, afterWriterHash, beforeModelHash,
    afterModelHash: hash(fs.readFileSync(modelFile)), registrations: 3, originalRedRegistrations: 2, addedDescriptorRegistrations: 1,
    fixtures: 6, browser: 'NOT_RUN', nativeStorageFault: 'NOT_RUN', observedUsers: 0 }));
});
