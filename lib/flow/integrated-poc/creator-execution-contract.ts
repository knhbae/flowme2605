import type { PersonalWorkspacePocAuthoredFlow } from '../personal-workspace-poc-contract';
import type { TextLine } from './text-workspace';

/** Program identities are not rewritten materializer/legacy identities. */
export type ProgramCreatorExecutionRow = {
  rowId: string; sourceLineId: string; sourceLine: number; itemRef: string;
  documentLineId: string; kind: 'ordinary' | 'series';
};
export type ProgramCreatorExecutionRevision = {
  id: string; recordRevision: number; committedAt: string; raw: string;
  sourceLines: TextLine[]; flow: PersonalWorkspacePocAuthoredFlow;
  rows: ProgramCreatorExecutionRow[];
  protectedLineIds: string[];
};
export type ProgramCreatorExecutionSource = {
  id: string; draftId: string; documentId: string; currentRevisionId: string;
  revisions: ProgramCreatorExecutionRevision[];
  /** Exact accepted source pointers; immutable revisions remain complete, never mixed raw. */
  adoption?: { version: 1; selections: Record<string, { revisionId: string; disposition: 'active' | 'retained' | 'ignored' }> };
};
export type ProgramCreatorExecutionSources = Record<string, ProgramCreatorExecutionSource>;
export const creatorExecutionItemRef = (ownerId: string, rowId: string) => `program-creator-item:${encodeURIComponent(ownerId)}:${encodeURIComponent(rowId)}`;
