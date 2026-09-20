import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePersonalWorkspacePocSourceCandidateStore } from '../../../lib/flow/personal-workspace-poc-source-candidate-storage';
import { PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY as KEY } from '../../../lib/flow/personal-workspace-poc-source-candidates';
import { setup, verifySourcePins } from './PersonalWorkspacePocSourcePractice.test-support';

// B454 normal lock0 and two ended-owner RED are preserved in the exact before snapshot.
// Only approved lock1 expectation changes; actual apply/Undo writer1 and ended0 stay unchanged.

test('C2-O00 normal control: actual apply and Undo callbacks each reach the real source writer', async () => {
  for (const operation of ['apply', 'undo'] as const) {
    const f = setup(operation); await f.finish(f.start()); const facts = f.facts();
    console.log(JSON.stringify({ id: 'C2-O00', ...facts }));
    assert.equal(facts.writerCalls, 1); assert.equal(facts.productApis.length, 1); assert.equal(facts.lockCalls, 1);
    assert.equal(facts.stateEqual, true); assert.equal(facts.sentinelEqual, true);
    assert.notEqual(f.storage.getItem(KEY), f.initialRaw); assert.equal(parsePersonalWorkspacePocSourceCandidateStore(f.storage.getItem(KEY)!).ok, true);
    assert.equal(f.sourceCandidateRawRef.current, f.storage.getItem(KEY));
    assert.equal(f.publications.filter(p => p.name === 'status' && (p.value as { kind?: string })?.kind === 'success').length, 1);
    assert.equal(f.pending.current, false); f.cleanup();
  }
});

for (const operation of ['apply', 'undo'] as const) {
  test(`C2-O-${operation}: ending the actual mounted owner before RAF prevents late source writes/publication`, async () => {
    const f = setup(operation), promise = f.start(), beforeEnd = f.publications.length;
    f.cleanup(); await f.finish(promise); const facts = f.facts();
    console.log(JSON.stringify({ id: `C2-O-${operation}`, ...facts, publicationsAfterOwnerEnd: f.publications.slice(beforeEnd).map(p => p.name) }));
    assert.equal(facts.ownerEnded, true); assert.equal(facts.stateEqual, true); assert.equal(facts.sentinelEqual, true);
    assert.equal(facts.writerCalls, 0, 'An ended mounted route must not run a previously unexecuted source writer');
    assert.deepEqual(facts.productApis, []); assert.equal(f.storage.getItem(KEY), f.initialRaw);
    assert.equal(f.sourceCandidateStoreRef.current, f.store); assert.equal(f.sourceCandidateRawRef.current, f.initialRaw);
    assert.deepEqual(f.publications.slice(beforeEnd), [], 'An ended owner must not publish a new success');
    assert.equal(f.pending.current, false);
  });
}

test.after(verifySourcePins);
