import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDraftToken,
  createIdempotencyKey,
  createPersonalCopyKey,
  createPublicSaveLifecycleState,
  createSourceKey,
  reducePublicSaveLifecycle,
  type ExistingPersonalCopy,
  type SaveIntent,
} from './public-save-lifecycle';

const sourceKey = createSourceKey('public-flow:moving-d30');
const draftToken = createDraftToken('draft:moving-d30:session-1');

function intent(personalCopyKey = createPersonalCopyKey('my-flow:moving-d30:copy-1')): SaveIntent {
  return {
    sourceKey,
    personalCopyKey,
    idempotencyKey: createIdempotencyKey('save:moving-d30:session-1'),
    draftToken,
  };
}

function existing(personalCopyKey: string): ExistingPersonalCopy {
  return {
    sourceKey,
    personalCopyKey: createPersonalCopyKey(personalCopyKey),
  };
}

test('a first save enters saving directly and succeeds with one caller-supplied identity', () => {
  const saveIntent = intent();
  const saving = reducePublicSaveLifecycle(
    createPublicSaveLifecycleState(draftToken),
    { type: 'request', intent: saveIntent, existingCopies: [] },
  );

  assert.equal(saving.status, 'saving');
  if (saving.status !== 'saving') return;
  assert.deepEqual(saving.choice, {
    kind: 'create',
    personalCopyKey: saveIntent.personalCopyKey,
  });
  assert.equal(saving.attempt, 1);

  const saved = reducePublicSaveLifecycle(saving, { type: 'succeed' });
  assert.equal(saved.status, 'saved');
  if (saved.status !== 'saved') return;
  assert.equal(saved.intent.sourceKey, sourceKey);
  assert.equal(saved.intent.idempotencyKey, saveIntent.idempotencyKey);
  assert.equal(saved.choice.personalCopyKey, saveIntent.personalCopyKey);
});

test('existing copies require an explicit overwrite identity before saving', () => {
  const first = existing('my-flow:moving-d30:existing-1');
  const second = existing('my-flow:moving-d30:existing-2');
  const choice = reducePublicSaveLifecycle(
    createPublicSaveLifecycleState(draftToken),
    { type: 'request', intent: intent(), existingCopies: [first, second] },
  );

  assert.equal(choice.status, 'choice_required');
  if (choice.status !== 'choice_required') return;
  assert.equal('choice' in choice, false);
  assert.deepEqual(choice.existingCopies, [first, second]);

  const saving = reducePublicSaveLifecycle(choice, {
    type: 'choose_overwrite',
    personalCopyKey: second.personalCopyKey,
  });
  assert.equal(saving.status, 'saving');
  if (saving.status !== 'saving') return;
  assert.deepEqual(saving.choice, {
    kind: 'overwrite',
    personalCopyKey: second.personalCopyKey,
  });
});

test('copy choice creates exactly the new personal identity reserved by the caller', () => {
  const first = existing('my-flow:moving-d30:existing-1');
  const newCopyKey = createPersonalCopyKey('my-flow:moving-d30:new-copy-42');
  const choice = reducePublicSaveLifecycle(
    createPublicSaveLifecycleState(draftToken),
    { type: 'request', intent: intent(newCopyKey), existingCopies: [first] },
  );
  const saving = reducePublicSaveLifecycle(choice, { type: 'choose_copy' });

  assert.equal(saving.status, 'saving');
  if (saving.status !== 'saving') return;
  assert.deepEqual(saving.choice, {
    kind: 'copy',
    personalCopyKey: newCopyKey,
  });
  assert.equal(saving.choice.personalCopyKey, newCopyKey);
});

test('cancel returns to editing without replacing the draft token', () => {
  const choice = reducePublicSaveLifecycle(
    createPublicSaveLifecycleState(draftToken),
    { type: 'request', intent: intent(), existingCopies: [existing('my-flow:moving-d30:existing-1')] },
  );
  const editing = reducePublicSaveLifecycle(choice, { type: 'cancel' });

  assert.deepEqual(editing, {
    status: 'editing',
    draftToken,
  });
});

test('duplicate requests are ignored while saving and after save success', () => {
  const firstRequest = { type: 'request' as const, intent: intent(), existingCopies: [] };
  const saving = reducePublicSaveLifecycle(
    createPublicSaveLifecycleState(draftToken),
    firstRequest,
  );
  const duplicateWhileSaving = reducePublicSaveLifecycle(saving, firstRequest);

  assert.equal(duplicateWhileSaving, saving);
  const saved = reducePublicSaveLifecycle(saving, { type: 'succeed' });
  const duplicateAfterSuccess = reducePublicSaveLifecycle(saved, firstRequest);
  assert.equal(duplicateAfterSuccess, saved);
});

test('recoverable failure keeps intent and choice, then retry resumes the same save', () => {
  const saveIntent = intent();
  const saving = reducePublicSaveLifecycle(
    createPublicSaveLifecycleState(draftToken),
    { type: 'request', intent: saveIntent, existingCopies: [] },
  );
  const failed = reducePublicSaveLifecycle(saving, {
    type: 'fail',
    error: { code: 'quota_exceeded', message: 'Local storage is full.' },
  });

  assert.equal(failed.status, 'recoverable_error');
  if (failed.status !== 'recoverable_error') return;
  assert.equal(failed.intent, saveIntent);
  assert.deepEqual(failed.choice, {
    kind: 'create',
    personalCopyKey: saveIntent.personalCopyKey,
  });
  assert.equal(failed.attempt, 1);

  const retried = reducePublicSaveLifecycle(failed, { type: 'retry' });
  assert.equal(retried.status, 'saving');
  if (retried.status !== 'saving') return;
  assert.equal(retried.intent, saveIntent);
  assert.deepEqual(retried.choice, failed.choice);
  assert.equal(retried.attempt, 2);
});

test('incomplete rollback cannot be cancelled or retried until storage recovery succeeds', () => {
  const saveIntent = intent();
  const saving = reducePublicSaveLifecycle(
    createPublicSaveLifecycleState(draftToken),
    { type: 'request', intent: saveIntent, existingCopies: [] },
  );
  const recoveryRequired = reducePublicSaveLifecycle(saving, {
    type: 'fail',
    error: { code: 'rollback_incomplete', message: 'Restore the original bytes first.' },
  });

  assert.equal(recoveryRequired.status, 'recovery_required');
  if (recoveryRequired.status !== 'recovery_required') return;
  assert.equal(
    reducePublicSaveLifecycle(recoveryRequired, { type: 'cancel' }),
    recoveryRequired,
  );
  assert.equal(
    reducePublicSaveLifecycle(recoveryRequired, { type: 'retry' }),
    recoveryRequired,
  );

  const stillRequired = reducePublicSaveLifecycle(recoveryRequired, {
    type: 'recovery_failed',
    error: { code: 'rollback_incomplete', message: 'Storage is still unavailable.' },
  });
  assert.equal(stillRequired.status, 'recovery_required');
  assert.equal(stillRequired.error.message, 'Storage is still unavailable.');

  const recovered = reducePublicSaveLifecycle(stillRequired, {
    type: 'recovery_succeeded',
    error: { code: 'storage_write_failed', message: 'Original bytes restored.' },
  });
  assert.equal(recovered.status, 'recoverable_error');
  if (recovered.status !== 'recoverable_error') return;
  assert.equal(recovered.choice, recoveryRequired.choice);
  assert.equal(recovered.intent, saveIntent);

  const retried = reducePublicSaveLifecycle(recovered, { type: 'retry' });
  assert.equal(retried.status, 'saving');
  if (retried.status !== 'saving') return;
  assert.equal(retried.choice, recoveryRequired.choice);
  assert.equal(retried.attempt, 2);
});

test('an overwrite identity outside the offered existing copies is rejected', () => {
  const choice = reducePublicSaveLifecycle(
    createPublicSaveLifecycleState(draftToken),
    { type: 'request', intent: intent(), existingCopies: [existing('my-flow:moving-d30:existing-1')] },
  );
  const invalidSelection = reducePublicSaveLifecycle(choice, {
    type: 'choose_overwrite',
    personalCopyKey: createPersonalCopyKey('my-flow:moving-d30:not-offered'),
  });

  assert.equal(invalidSelection, choice);
  assert.equal(invalidSelection.status, 'choice_required');
});
