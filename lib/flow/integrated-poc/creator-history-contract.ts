import type { PersonalWorkspacePocCreatorDraftRecord } from '../personal-workspace-poc-creator-drafts';
import type { ProgramCreatorSourceIdentity } from './creator-source-order';
import type { ProgramCreatorStructureSidecar } from './creator-structure-sidecar';
import type { NativeCreatorDocumentOwner, NativeCreatorDocumentProvenance } from './native-creator-document-contract';

/** A real Program-only context save. It does not increment the original Creator record. */
export type ProgramCreatorSavedContext = {
  version: 1; recordRevision: number; contextRevision: number; savedAt: string;
  structure?: ProgramCreatorStructureSidecar;
  nativeDocument?: NativeCreatorDocumentOwner;
  nativeSelection?: NativeCreatorDocumentProvenance;
  /** Copied context provenance, never a native materialize/Undo transaction claim. */
  copiedFromDraftId?: string;
};

/** Replaceable Program v1 retention limit, not an operating product policy. */
export const PROGRAM_CREATOR_HISTORY_LIMIT = 5;
export const NATIVE_CREATOR_HISTORY_LIMIT = 5;
export const PROGRAM_CREATOR_HISTORY_DOCUMENT_LIMIT = 2_000_000;
export const TEXT_AUTHORING_HISTORY_KEY = 'flow:text-authoring:drafts:v1';
export type ProgramCreatorSavedRevision = { id: string; savedAt: string; rawText: string; title: string } & (
  { kind: 'program'; record: PersonalWorkspacePocCreatorDraftRecord; sourceIdentity?: ProgramCreatorSourceIdentity; context?: ProgramCreatorSavedContext }
  | { kind: 'text-authoring-v1'; origin: { storageKey: typeof TEXT_AUTHORING_HISTORY_KEY; draftId: string; versionId: string; revisionId: string; documentJson: string } }
);
export type ProgramCreatorSavedHistory = { version: 1; drafts: Record<string, ProgramCreatorSavedRevision[]> };
