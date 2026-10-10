import assert from 'node:assert/strict';
import test from 'node:test';
import { createProgramPrivateSpace } from '../program-data';
import { buildCatalogLibrarySnapshot } from '../catalog-library-source';
import { createProgramCreatorWorkspace } from '../creator-workspace';
import { transitionPersonalWorkspacePocCreatorDraftLibrary } from '../../personal-workspace-poc-creator-drafts';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../creator-workspace';
import { isPreservationContentSummary, summarizePreservationContent } from './content-summary';

const NOW = '2026-09-23T12:00:00.000Z';
const empty = { documents: 0, flowDocuments: 0, savedFlows: 0, creatorDrafts: 0, creatorWorkingCopies: 0,
  catalogFlows: 0, catalogItems: 0, catalogSections: 0, catalogMaps: 0, catalogVariants: 0 };

test('legacy empty space reports explicit zero counts without adding optional fields', () => {
  const space = createProgramPrivateSpace(), before = structuredClone(space);
  assert.deepEqual(summarizePreservationContent(space), empty);
  assert.deepEqual(space, before);
});

test('frozen catalog remains distinct from execution copies and exposes only exact counts', () => {
  const space = createProgramPrivateSpace(); space.catalogLibrary = buildCatalogLibrarySnapshot(NOW);
  const before = structuredClone(space), summary = summarizePreservationContent(space);
  assert.deepEqual(summary, { ...empty, catalogFlows: 177, catalogItems: 957, catalogSections: 371, catalogMaps: 26, catalogVariants: 2 });
  assert(isPreservationContentSummary(summary)); assert.deepEqual(space, before);
  assert(Object.values(summary).every(value => typeof value === 'number'));
});

test('creator saved drafts and a working copy are separate counts, never a combined content total', () => {
  const space = createProgramPrivateSpace(); space.creatorWorkspace = createProgramCreatorWorkspace(NOW);
  const rawText = 'PRIVATE-SUMMARY-TEST';
  space.creatorWorkspace.library = transitionPersonalWorkspacePocCreatorDraftLibrary(space.creatorWorkspace.library,
    { type: 'save', draftId: 'draft-one', rawText, sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource(rawText), expectedLibraryRevision: 0, now: NOW }).library;
  space.creatorWorkspace.working = { draftId: 'draft-one', title: 'PRIVATE-TITLE', rawText, baseRecordRevision: 1 };
  const before = structuredClone(space), summary = summarizePreservationContent(space);
  assert.deepEqual(summary, { ...empty, creatorDrafts: 1, creatorWorkingCopies: 1 });
  assert(!JSON.stringify(summary).includes('PRIVATE')); assert.deepEqual(space, before);
  space.creatorWorkspace.working = null;
  assert.equal(summarizePreservationContent(space).creatorWorkingCopies, 0);
});

test('summary guard rejects missing, extra, non-integer and unsafe values instead of guessing zero', () => {
  assert(isPreservationContentSummary(empty));
  const { catalogFlows: _count, ...missing } = empty;
  for (const value of [null, undefined, [], missing, { ...empty, extra: 0 }, { ...empty, [Symbol('extra')]: 0 },
    ...[-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0', null, undefined].map(catalogFlows => ({ ...empty, catalogFlows }))]) {
    assert.equal(isPreservationContentSummary(value), false);
  }
  assert(isPreservationContentSummary({ ...empty, documents: Number.MAX_SAFE_INTEGER }));
});
