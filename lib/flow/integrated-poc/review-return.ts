import type { ProgramData, ProgramParticipationDraft } from './contract';
import type { ProgramNavigationCheckpoint } from './navigation';
import { newProgramParticipationDraft } from './participation-editor';
import { textWorkspaceModel as M } from './text-workspace';

/** Tab memory only. Never append this object to a draft, post, URL, or storage. */
export type ProgramReviewOrigin = {
  actorId: string;
  documentId: string;
  raw: string;
  editor: HTMLTextAreaElement;
  checkpoint: ProgramNavigationCheckpoint;
};
export type ProgramReviewSpacePort = {
  capture: (documentId: string) => ProgramReviewOrigin | null;
  restore: (origin: ProgramReviewOrigin, currentVisit: () => boolean, focusOwner: Element | null) => Promise<boolean>;
};
export type ProgramReviewEntry = {
  draft: ProgramParticipationDraft;
  isCurrent: () => boolean;
  onOpened: (opened: boolean) => void;
};

export function newProgramReviewDraft(): ProgramParticipationDraft {
  // Public relations start empty. The author selects and previews them explicitly.
  return newProgramParticipationDraft('experience');
}

export function programReviewOriginReason(data: ProgramData, origin: Pick<ProgramReviewOrigin, 'actorId' | 'documentId' | 'raw'>):
  'actor' | 'missing' | 'unavailable' | 'changed' | null {
  if (data.activeActorId !== origin.actorId) return 'actor';
  const space = data.spaces[origin.actorId];
  const doc = space?.text.documents.find(entry => entry.id === origin.documentId);
  if (!doc) return 'missing';
  if (space.archivedDocumentIds.includes(doc.id) || space.documentTrash?.[doc.id]
    || Object.values(space.retentionDocuments ?? {}).includes(doc.id)) return 'unavailable';
  return M.raw(doc) === origin.raw ? null : 'changed';
}

/** No inferred latest version or first matching Item. Validate only the selected tuple. */
export function programReviewPublicRelationValid(data: ProgramData, draft: ProgramParticipationDraft): boolean {
  if (!draft.flowId) return draft.versionId === null && draft.itemId === null;
  const flow = data.public.flows.find(entry => entry.id === draft.flowId && !entry.archived);
  const version = data.public.versions.find(entry => entry.id === draft.versionId && entry.flowId === draft.flowId);
  return !!flow && !!version && (draft.itemId === null || version.items.some(item => item.id === draft.itemId));
}

