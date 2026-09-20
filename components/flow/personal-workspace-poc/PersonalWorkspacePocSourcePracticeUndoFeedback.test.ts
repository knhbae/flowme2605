import assert from 'node:assert/strict';
import test from 'node:test';
import { setup, verifySourcePins } from './PersonalWorkspacePocSourcePractice.test-support';
import { PERSONAL_WORKSPACE_POC_SOURCE_CANDIDATE_KEY as KEY, createPersonalWorkspacePocSourceCandidateStore } from '../../../lib/flow/personal-workspace-poc-source-candidates';

// Actual observer/Undo callback, real applied store. Event delivery and React
// setters are controlled here; this is not a browser StorageEvent/AT test.
test('C2-U18 an observed ABA after closing an applied comparison blocks Undo with an explicit reason', async () => {
  const f = setup('undo');
  f.actual.deferSourceUpdateReview();
  assert.equal(f.values.sourcePracticeOwner.current, undefined);
  const foreign = JSON.stringify(createPersonalWorkspacePocSourceCandidateStore('2026-09-06T00:00:00.000Z'));
  for (const raw of [foreign, f.initialRaw]) {
    const previous = f.storage.getItem(KEY);
    f.data.set(KEY, raw); // Test-only external source mutation, not product API.
    f.listeners.get('storage')!({ key: KEY, storageArea: f.storage, oldValue: previous, newValue: raw });
  }
  f.publications.length = 0;
  await f.actual.undoSourceUpdate(f.envelope.envelope.candidateId);
  assert.deepEqual(f.calls, []); assert.equal(f.storage.getItem(KEY), f.initialRaw);
  const feedback = f.publications.filter(p => p.name === 'status');
  assert.equal(feedback.length, 1, 'Visible recorded Undo must explain why the action was refused');
  assert.equal((feedback[0].value as any).kind, 'failure');
  assert.match((feedback[0].value as any).message, /저장 상태|다시 비교|새로고침/u);
  assert.equal(f.publications.some(p => p.name === 'status' && (p.value as any).kind === 'success'), false);
  f.cleanup();
});
test.after(verifySourcePins);
