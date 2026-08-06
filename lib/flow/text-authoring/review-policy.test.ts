import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildArtifactPreflight,
  buildAuthoringArtifactProjection,
} from './artifact-projection';
import { applyAuthoringOperation } from './operations';
import { createTextAuthoringDocument } from './parser';
import {
  createExportReceipt,
  createSaveReceipt,
} from './receipt';
import {
  evaluateAuthoringWritePolicy,
  forkAuthoringDocumentToPersonal,
} from './review-policy';
import {
  createMemoryTextAuthoringStorage,
  createTextAuthoringDraftRepository,
} from './storage';
import { validateTextAuthoringDocument } from './validation';

const NOW = '2026-07-29T00:00:00.000Z';
const RAW = [
  '# Review policy',
  '- [ ] Prepare source',
  '  detail: rights and safety words are ordinary source text',
].join('\n');

test('review gates come only from explicit requirements, never source wording', () => {
  const ordinary = createTextAuthoringDocument(RAW, { now: NOW });
  assert.deepEqual(ordinary.reviewGates, []);
  assert.equal(ordinary.lifecycleStatus, 'draft');

  const governed = createTextAuthoringDocument(RAW, {
    now: NOW,
    reviewRequirements: [
      { kind: 'rights', reasonKey: 'rights.owner_unknown' },
      { kind: 'safety', reasonKey: 'safety.procedure_check' },
    ],
  });
  assert.deepEqual(
    governed.reviewGates?.map((gate) => gate.kind),
    ['rights', 'safety'],
  );
  assert.ok(governed.reviewGates?.every((gate) => gate.status === 'required'));
  assert.equal(governed.lifecycleStatus, 'needs_review');
  assert.equal(validateTextAuthoringDocument(governed).valid, true);
});

test('review evidence, reopen, undo, and storage round-trip retain the gate lifecycle', () => {
  const initial = createTextAuthoringDocument(RAW, {
    ownership: 'creator',
    now: NOW,
    reviewRequirements: [{ kind: 'rights' }],
  });
  const gateId = initial.reviewGates![0].gateId;
  assert.throws(
    () => applyAuthoringOperation(initial, {
      type: 'record_review_decision',
      gateId,
      status: 'evidence_recorded',
      evidenceNote: '   ',
    }),
    /non-empty note/u,
  );

  const recorded = applyAuthoringOperation(initial, {
    type: 'record_review_decision',
    gateId,
    status: 'evidence_recorded',
    evidenceNote: 'Source owner response recorded in the case note.',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T00:01:00.000Z',
  });
  assert.equal(recorded.reviewGates![0].status, 'evidence_recorded');
  assert.equal(recorded.lifecycleStatus, 'draft');

  const reopened = applyAuthoringOperation(recorded, {
    type: 'reopen_review',
    gateId,
  }, {
    actorLane: 'creator',
    now: '2026-07-29T00:02:00.000Z',
  });
  assert.equal(reopened.reviewGates![0].status, 'required');
  assert.equal(reopened.lifecycleStatus, 'needs_review');

  const undone = applyAuthoringOperation(reopened, { type: 'undo' }, {
    actorLane: 'creator',
    now: '2026-07-29T00:03:00.000Z',
  });
  assert.equal(undone.reviewGates![0].status, 'evidence_recorded');
  assert.match(undone.reviewGates![0].evidenceNote ?? '', /case note/u);

  const repository = createTextAuthoringDraftRepository(
    createMemoryTextAuthoringStorage(),
    { now: () => '2026-07-29T00:04:00.000Z' },
  );
  repository.save(undone);
  const loaded = repository.load(undone.documentId)!.document;
  assert.deepEqual(loaded.reviewGates, undone.reviewGates);
  assert.deepEqual(loaded.sourceState, undone.sourceState);
  assert.equal(validateTextAuthoringDocument(loaded).valid, true);
});

test('personal_only is a restriction in every outward action and local save stays allowed', () => {
  const initial = createTextAuthoringDocument(RAW, {
    ownership: 'creator',
    now: NOW,
    reviewRequirements: [{ kind: 'rights' }],
  });
  const restricted = applyAuthoringOperation(initial, {
    type: 'record_review_decision',
    gateId: initial.reviewGates![0].gateId,
    status: 'personal_only',
    evidenceNote: 'No outward-use basis was recorded.',
  }, {
    actorLane: 'creator',
    now: '2026-07-29T00:01:00.000Z',
  });

  const local = evaluateAuthoringWritePolicy(restricted, 'save_local_draft');
  assert.equal(local.allowed, true);
  assert.equal(local.needsReview, true);
  for (const action of [
    'export_file',
    'request_creator_review',
    'submit_suggestion',
  ] as const) {
    const policy = evaluateAuthoringWritePolicy(restricted, action);
    assert.equal(policy.allowed, false);
    assert.ok(policy.blockers.some(
      (blocker) => blocker.code === 'review_gate_personal_only',
    ));
  }

  const projection = buildAuthoringArtifactProjection(restricted);
  const preflight = buildArtifactPreflight(projection, {
    artifact: projection.primaryArtifact,
  });
  assert.throws(
    () => createExportReceipt(preflight, {
      format: preflight.formats[0],
      document: restricted,
    }),
    /review_gate_personal_only/u,
  );
  const receipt = createSaveReceipt(restricted, projection, {
    savedAt: '2026-07-29T00:02:00.000Z',
  });
  assert.deepEqual(
    receipt.reviewState.personalOnlyGateIds,
    [restricted.reviewGates![0].gateId],
  );
  assert.equal(receipt.sourceState.status, 'current');
});

test('personal fork is immutable, gets a new lane and revision, and keeps safety explicit', () => {
  const creator = createTextAuthoringDocument(RAW, {
    ownership: 'creator',
    now: NOW,
    reviewRequirements: [
      { kind: 'rights' },
      { kind: 'safety' },
    ],
  });
  const before = JSON.stringify(creator);
  const fork = forkAuthoringDocumentToPersonal(creator, {
    documentId: 'personal-review-fork',
    now: '2026-07-29T00:05:00.000Z',
  });

  assert.equal(JSON.stringify(creator), before);
  assert.equal(fork.documentId, 'personal-review-fork');
  assert.equal(fork.ownership, 'personal');
  assert.deepEqual(fork.forkedFrom, {
    documentId: creator.documentId,
    revisionId: creator.revision.revisionId,
  });
  assert.equal(fork.revision.kind, 'personal_fork');
  assert.equal(fork.revision.parentRevisionId, creator.revision.revisionId);
  assert.equal(
    fork.reviewGates?.find((gate) => gate.kind === 'rights')?.status,
    'personal_only',
  );
  assert.equal(
    fork.reviewGates?.find((gate) => gate.kind === 'safety')?.status,
    'required',
  );
  assert.equal(
    evaluateAuthoringWritePolicy(fork, 'export_file').allowed,
    false,
  );
  assert.equal(validateTextAuthoringDocument(fork).valid, true);
});
