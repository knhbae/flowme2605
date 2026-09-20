import { PROGRAM_LIMITS, programClone, programFailure, programId, programResult, type ProgramCreatorDraftImport, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programIdentifier, validateProgramData } from './program-data';
import { programSame } from './controller';
import { textWorkspaceModel as M } from './text-workspace';
import { isProgramCreatorDraftJson } from './creator-draft-provenance';
import { isPersonalWorkspacePocCreatorDraftLibrary, type PersonalWorkspacePocCreatorDraftLibrary } from '../personal-workspace-poc-creator-drafts';
import { loadPersonalWorkspacePocCreatorDraftLibrary, type PersonalWorkspacePocCreatorDraftLibraryLoadResult } from '../personal-workspace-poc-creator-draft-storage';
import { PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY } from '../personal-workspace-poc-creator-draft-storage-transaction';

/** Existing reader only; never save, recover or migrate the CreatorDraft store. */
export function readProgramCreatorDraftLibrary(storage: Pick<Storage, 'getItem'>): PersonalWorkspacePocCreatorDraftLibraryLoadResult {
  try {
    if (storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) !== null) return { kind: 'corrupt', raw: null, reason: 'recovery-required' };
    const loaded = loadPersonalWorkspacePocCreatorDraftLibrary({ getItem(key) {
    const raw = storage.getItem(key);
    if (raw !== null && new TextEncoder().encode(raw).length > 10_000_000) throw new Error('creator-library-limit');
    return raw;
    } });
    return storage.getItem(PERSONAL_WORKSPACE_POC_CREATOR_DRAFT_STORAGE_RECOVERY_KEY) === null ? loaded : { kind: 'corrupt', raw: loaded.raw, reason: 'recovery-required' };
  } catch { return { kind: 'corrupt', raw: null, reason: 'storage-read-failed' }; }
}

export type ProgramCreatorDraftImportInput = {
  actorId: string; requestId: string; creatorDraftId: string;
  expectedLibraryRevision: number; expectedRecordRevision: number; expectedSourceFingerprint: string;
  expectedSpace: ProgramPrivateSpace; folderId?: string;
};

/** Explicit one-time private copy. CreatorDraft has no stable Item/line IDs;
 * newly generated lines belong to the new personal document. Only the actual
 * selected record's one-Undo source is retained, as raw-only identity:null. */
export function importProgramCreatorDraft(data: ProgramData, library: PersonalWorkspacePocCreatorDraftLibrary,
  input: ProgramCreatorDraftImportInput, now: string): ProgramTransition<string> {
  if (!validateProgramData(data) || !programIdentifier(input.requestId) || !programIdentifier(input.creatorDraftId)
    || !isProgramCreatorDraftJson(library) || !isPersonalWorkspacePocCreatorDraftLibrary(library)
    || !Number.isFinite(Date.parse(now)) || new Date(now).toISOString() !== now || now < library.updatedAt) return programFailure(data, 'invalid');
  // The old library is device-local, not an authenticated foreign creator account.
  if (input.actorId !== 'local-user' || !data.spaces[input.actorId]) return programFailure(data, 'forbidden');
  const folderId = input.folderId ?? 'folder-unfiled';
  const fields = { creatorDraftId: input.creatorDraftId, expectedLibraryRevision: input.expectedLibraryRevision,
    expectedRecordRevision: input.expectedRecordRevision, expectedSourceFingerprint: input.expectedSourceFingerprint, folderId };
  const fingerprint = JSON.stringify(fields), priorReceipt = data.receipts.find(receipt => receipt.actorId === input.actorId && receipt.id === input.requestId);
  if (priorReceipt) {
    let same = false; try { same = priorReceipt.kind === 'creator-draft-import' && programSame(JSON.parse(priorReceipt.fingerprint), fields); } catch { /* fail closed */ }
    if (!same) return programFailure(data, 'duplicate-request');
    const retained = data.spaces[input.actorId].creatorDraftImports?.some(entry => entry.documentId === priorReceipt.resultId && entry.creatorDraftId === input.creatorDraftId);
    return retained ? programResult(data, data, priorReceipt.resultId) : programFailure(data, 'conflict');
  }
  const current = library.records[input.creatorDraftId];
  if (!current) return programFailure(data, 'missing');
  if (library.revision !== input.expectedLibraryRevision || current.recordRevision !== input.expectedRecordRevision
    || current.sourceFingerprint !== input.expectedSourceFingerprint) return programFailure(data, 'conflict');
  const space = data.spaces[input.actorId], existing = space.creatorDraftImports?.find(entry => entry.creatorDraftId === current.draftId);
  if (existing) return programSame(existing.source.current, current) ? programResult(data, data, existing.documentId) : programFailure(data, 'conflict');
  if (!programSame(space, input.expectedSpace)) return programFailure(data, 'conflict');
  if (!space.text.folders.some(folder => folder.id === folderId)) return programFailure(data, 'missing');
  if (space.text.documents.length >= 100 || data.receipts.length >= PROGRAM_LIMITS.entries || current.rawText.length > 100000) return programFailure(data, 'limit');
  if (/[\r\n]/u.test(current.title)) return programFailure(data, 'unresolved');
  const oldRecord = library.undo?.snapshot.records[current.draftId];
  const undo = oldRecord && !programSame(oldRecord, current) ? { label: library.undo!.label, libraryRevision: library.undo!.snapshot.revision,
    libraryUpdatedAt: library.undo!.snapshot.updatedAt, record: programClone(oldRecord) } : null;
  const needsRevision = !!undo && (undo.record.rawText !== current.rawText || undo.record.title !== current.title);
  if (needsRevision && (undo!.record.rawText.length > 100000 || space.draftRevisions.length >= 1000)) return programFailure(data, 'limit');
  const next = programClone(data), target = next.spaces[input.actorId];
  let text = M.addDocument(target.text, { title: current.title, folderId });
  if (text === target.text) return programFailure(data, 'unresolved');
  const documentId = text.documents.at(-1)!.id;
  text = M.editText(text, documentId, current.rawText);
  if (M.raw(M.getDocument(text, documentId)) !== current.rawText.replace(/\r\n?/gu, '\n')
    || !programSame(text.progressRecords, target.text.progressRecords)) return programFailure(data, 'unresolved');
  target.text = text;
  const undoRevisionId = needsRevision ? programId('creator-undo') : null;
  if (undoRevisionId) target.draftRevisions.push({ id: undoRevisionId, documentId, title: undo!.record.title,
    raw: undo!.record.rawText.replace(/\r\n?/gu, '\n'), createdAt: undo!.record.updatedAt, identity: null });
  const imported: ProgramCreatorDraftImport = { creatorDraftId: current.draftId, documentId, importedAt: now, undoRevisionId,
    source: { libraryRevision: library.revision, libraryUpdatedAt: library.updatedAt, current: programClone(current), undo } };
  target.creatorDraftImports = [...(target.creatorDraftImports ?? []), imported];
  next.receipts.push({ actorId: input.actorId, id: input.requestId, kind: 'creator-draft-import', fingerprint, resultId: documentId });
  return validateProgramData(next) ? programResult(data, next, documentId) : programFailure(data, 'invalid');
}
