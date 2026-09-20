import type { ProgramData } from './contract';

export type ProgramDocumentCreatorLink =
  | { status: 'unavailable' } | { status: 'unlinked' } | { status: 'ambiguous' }
  | { status: 'active' | 'archived' | 'missing'; draftId: string; documentId: string;
      handoffRevision: number; handoffTitle: string; handoffRaw: string;
      currentRevision: number | null; currentTitle: string | null; originalDraftId: string | null };

/** Actor-scoped, read-only navigation provenance. Never searches other private spaces. */
export function readProgramDocumentCreatorLink(data: ProgramData, documentId: string): ProgramDocumentCreatorLink {
  const actorId = data.activeActorId;
  const space = data.actors.some(actor => actor.id === actorId) && Object.hasOwn(data.spaces, actorId) ? data.spaces[actorId] : undefined;
  if (!space || ![...space.text.documents, ...space.text.flows].some(doc => doc.id === documentId)) return { status: 'unavailable' };
  const workspace = space.creatorWorkspace;
  const links = Object.entries(workspace?.handoffs ?? {}).filter(([, link]) => link.documentId === documentId);
  if (!links.length) return { status: 'unlinked' };
  if (links.length !== 1) return { status: 'ambiguous' };
  const [draftId, handoff] = links[0];
  const record = workspace && Object.hasOwn(workspace.library.records, draftId) ? workspace.library.records[draftId] : undefined;
  const origin = workspace && Object.hasOwn(workspace.origins, draftId) ? workspace.origins[draftId] : undefined;
  return {
    status: !record || record.draftId !== draftId ? 'missing' : record.status === 'archived' ? 'archived' : 'active',
    draftId, documentId, handoffRevision: handoff.recordRevision, handoffTitle: handoff.title, handoffRaw: handoff.raw,
    currentRevision: record?.draftId === draftId ? record.recordRevision : null,
    currentTitle: record?.draftId === draftId ? record.title : null, originalDraftId: origin?.creatorDraftId ?? null,
  };
}

/** Opening a source never creates a draft or applies a new handoff. */
export function programDocumentCreatorDestination(link: ProgramDocumentCreatorLink): { view: 'creator'; id: string } | null {
  return link.status === 'active' || link.status === 'archived' ? { view: 'creator', id: link.draftId } : null;
}
