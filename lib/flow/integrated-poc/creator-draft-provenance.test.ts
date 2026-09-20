import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validateProgramCreatorDraftImports } from './creator-draft-provenance';
import { createProgramData } from './program-data';
import { textWorkspaceModel as M } from './text-workspace';
import { fingerprintPersonalWorkspacePocAuthoringSource } from '../personal-workspace-poc-authoring';
import type { ProgramCreatorDraftImport } from './contract';

function fixture() {
  const space = createProgramData().spaces['local-user']; space.text = M.addDocument(space.text, { title: '문서' });
  const current = { draftId: 'creator-one', owner: 'creator' as const, title: '현재', rawText: '현재 원문', sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource('현재 원문'),
    status: 'active' as const, recordRevision: 2, createdAt: '2026-09-12T00:00:00.000Z', updatedAt: '2026-09-12T00:02:00.000Z' };
  const previous = { ...current, title: '이전', rawText: '이전\r\n원문', sourceFingerprint: fingerprintPersonalWorkspacePocAuthoringSource('이전\r\n원문'), recordRevision: 1, updatedAt: '2026-09-12T00:01:00.000Z' };
  const imported: ProgramCreatorDraftImport = { creatorDraftId: current.draftId, documentId: space.text.documents[0].id, importedAt: '2026-09-12T00:03:00.000Z', undoRevisionId: 'actual-undo',
    source: { libraryRevision: 2, libraryUpdatedAt: current.updatedAt, current, undo: { label: '저장', libraryRevision: 1, libraryUpdatedAt: previous.updatedAt, record: previous } } };
  space.draftRevisions.push({ id: 'actual-undo', documentId: imported.documentId, title: previous.title, raw: '이전\n원문', createdAt: previous.updatedAt, identity: null });
  return { space, imported };
}
test('P01 current/source/actual raw-only Undo links validate and reject corrupt references or fictional identity', () => {
  const { space, imported } = fixture(); assert.equal(validateProgramCreatorDraftImports([imported], space), true);
  for (const bad of [{ ...imported, creatorDraftId: 'foreign' }, { ...imported, documentId: 'missing' }, { ...imported, undoRevisionId: 'fake-revision' },
    { ...imported, source: { ...imported.source, current: { ...imported.source.current, rawText: '변조' } } }]) assert.equal(validateProgramCreatorDraftImports([bad], space), false);
  assert.equal(validateProgramCreatorDraftImports([imported, imported], space), false);
  space.draftRevisions[0].identity = { lines: [], bindings: [], taskScopes: {}, itemScopes: {} };
  assert.equal(validateProgramCreatorDraftImports([imported], space), false);
});
test('P02 no-Undo records cannot reference fabricated history and accessors do not run', () => {
  const { space, imported } = fixture(), noUndo = { ...imported, source: { ...imported.source, undo: null }, undoRevisionId: null };
  assert.equal(validateProgramCreatorDraftImports([noUndo], space), true);
  assert.equal(validateProgramCreatorDraftImports([{ ...noUndo, undoRevisionId: 'actual-undo' }], space), false);
  let reads = 0; Object.defineProperty(noUndo, 'source', { enumerable: true, get() { reads++; return imported.source; } });
  assert.equal(validateProgramCreatorDraftImports([noUndo], space), false); assert.equal(reads, 0);
});
test('P03 provenance validator has type-only Program contracts and no program-data/bridge dependency', () => {
  const source = readFileSync(new URL('./creator-draft-provenance.ts', import.meta.url), 'utf8');
  assert.match(source, /import type .*from '.\/contract'/u); assert.doesNotMatch(source, /from ['"].*(?:program-data|creator-draft-bridge|controller)['"]/u);
});
