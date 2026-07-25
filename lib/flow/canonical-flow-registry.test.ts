import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AJD_MOVING_CANONICAL_FLOW_ID,
  AJD_MOVING_CANONICAL_SOURCE_ID,
  AJD_MOVING_CANONICAL_VARIANT_ID,
  AJD_MOVING_LEGACY_CANONICAL_FLOW_ID,
  AJD_MOVING_PRE_RESOLUTION_CANDIDATES,
  AJD_MOVING_PRE_RESOLUTION_DIAGNOSTIC,
  AJD_MOVING_USER_JOB_ID,
  buildCrossEntryInvariantDiagnostic,
  createCanonicalFlowId,
  getCanonicalFlowEntry,
  isCanonicalWriteAllowedForDiagnostic,
  resolveCanonicalFlowAlias,
  resolveCanonicalFlowId,
  resolveCanonicalFlowRoute,
} from './canonical-flow-registry';

test('P33-CANONICAL-REGISTRY resolves every AJD moving entry to one canonical route', () => {
  assert.equal(resolveCanonicalFlowRoute('public_slug', 'moving-d30-basic'), '/f/moving-d30-basic');
  assert.equal(resolveCanonicalFlowRoute('flow_map_id', 'moving-d30'), '/f/moving-d30-basic');
  assert.equal(resolveCanonicalFlowRoute('flow_map_id', 'curated-ajd-moving-d30'), '/f/moving-d30-basic');
  assert.equal(resolveCanonicalFlowRoute('public_slug', 'source-backed-moving-d30'), '/f/moving-d30-basic');
  assert.equal(resolveCanonicalFlowRoute('public_slug', 'curated-ajd-moving-d30'), '/f/moving-d30-basic');

  const entry = getCanonicalFlowEntry(AJD_MOVING_CANONICAL_FLOW_ID);
  assert.equal(entry?.canonicalPublicSlug, 'moving-d30-basic');
  assert.equal(entry?.canonicalItemCount, 24);
  assert.deepEqual(entry?.legacySavedSlugs, ['source-backed-moving-d30', 'curated-ajd-moving-d30']);
});

test('P33-CROSS-ENTRY-INVARIANT reports the historical 24/5 split instead of silently passing', () => {
  assert.equal(AJD_MOVING_PRE_RESOLUTION_DIAGNOSTIC.status, 'requires_editorial_resolution');
  assert.equal(AJD_MOVING_PRE_RESOLUTION_DIAGNOSTIC.entries.length, 4);
  assert.deepEqual(
    AJD_MOVING_PRE_RESOLUTION_DIAGNOSTIC.entries.map((entry) => entry.itemCount),
    [24, 5, 5, 5],
  );
  assert.ok(AJD_MOVING_PRE_RESOLUTION_DIAGNOSTIC.differences.some((difference) => difference.field === 'itemCount'));
  assert.ok(AJD_MOVING_PRE_RESOLUTION_DIAGNOSTIC.differences.some((difference) => difference.field === 'saveIdentity'));
});

test('P33-UNRESOLVED-VARIANT-GATE blocks canonical writes while a candidate group is unresolved', () => {
  assert.equal(isCanonicalWriteAllowedForDiagnostic(AJD_MOVING_PRE_RESOLUTION_DIAGNOSTIC), false);
});

test('canonical identity includes source, user job, and editorial variant rather than source URL alone', () => {
  const base = {
    canonicalSourceId: AJD_MOVING_CANONICAL_SOURCE_ID,
    editorialVariantId: 'variant:test',
  };
  const moving = createCanonicalFlowId({ ...base, userJobId: AJD_MOVING_USER_JOB_ID });
  const storage = createCanonicalFlowId({ ...base, userJobId: 'job:store-household-goods' });

  assert.notEqual(moving, storage);
  assert.throws(
    () => createCanonicalFlowId({ canonicalSourceId: '', userJobId: AJD_MOVING_USER_JOB_ID, editorialVariantId: 'variant:test' }),
    /requires source, user job, and editorial variant/i,
  );
});

test('P33-CANONICAL-ID-FACTORY-ONLY derives the registry identity from the shared factory', () => {
  assert.equal(
    createCanonicalFlowId({
      canonicalSourceId: AJD_MOVING_CANONICAL_SOURCE_ID,
      userJobId: AJD_MOVING_USER_JOB_ID,
      editorialVariantId: AJD_MOVING_CANONICAL_VARIANT_ID,
    }),
    AJD_MOVING_CANONICAL_FLOW_ID,
  );
  assert.equal(
    getCanonicalFlowEntry(AJD_MOVING_CANONICAL_FLOW_ID)?.identity.canonicalFlowId,
    AJD_MOVING_CANONICAL_FLOW_ID,
  );
});

test('P33-CANONICAL-ID-COMPAT-READ resolves the preview-only legacy ID without making it canonical', () => {
  assert.equal(resolveCanonicalFlowId(AJD_MOVING_LEGACY_CANONICAL_FLOW_ID), AJD_MOVING_CANONICAL_FLOW_ID);
  assert.equal(
    getCanonicalFlowEntry(AJD_MOVING_LEGACY_CANONICAL_FLOW_ID)?.identity.canonicalFlowId,
    AJD_MOVING_CANONICAL_FLOW_ID,
  );
  assert.notEqual(AJD_MOVING_LEGACY_CANONICAL_FLOW_ID, AJD_MOVING_CANONICAL_FLOW_ID);
});

test('same source with different user jobs is not diagnosed as a duplicate candidate group', () => {
  const secondJob = {
    ...AJD_MOVING_PRE_RESOLUTION_CANDIDATES[0],
    entryId: 'storage_job',
    route: '/f/moving-storage',
    userJobId: 'job:store-household-goods',
    title: '이삿짐 보관 준비',
    itemCount: 8,
    contentFingerprint: 'moving-storage-8-v1',
    saveIdentity: 'flow:saved:moving-storage',
  };
  const diagnostics = buildCrossEntryInvariantDiagnostic([
    AJD_MOVING_PRE_RESOLUTION_CANDIDATES[0],
    secondJob,
  ]);

  assert.equal(diagnostics.length, 2);
  assert.ok(diagnostics.every((diagnostic) => diagnostic.status === 'consistent'));
});

test('legacy saved aliases are diagnostic identities, not a destructive storage rewrite', () => {
  const alias = resolveCanonicalFlowAlias('saved_slug', 'source-backed-moving-d30');
  assert.equal(alias?.alias.role, 'legacy_saved_copy');
  assert.equal(alias?.entry.identity.canonicalFlowId, AJD_MOVING_CANONICAL_FLOW_ID);
});
