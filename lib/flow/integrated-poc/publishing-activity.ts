import type { ProgramData, ProgramPost } from './contract';
import type { ProgramDestination } from './ui-contract';

/** Keep the exact cited source, not the reader's last selected or latest version. */
export function programPostFlowDestination(data: ProgramData, post: ProgramPost): ProgramDestination | null {
  const version = data.public.versions.find(row => row.id === post.versionId && row.flowId === post.flowId);
  if (!post.flowId || !version || post.itemId && !version.items.some(item => item.id === post.itemId)) return null;
  return { view: 'flow', id: post.flowId, versionId: version.id, ...(post.itemId ? { itemId: post.itemId } : {}) };
}

export function programReplyDestination(data: ProgramData, postId: string, replyId: string): ProgramDestination | null {
  if (!data.public.posts.some(post => post.id === postId)
    || !data.public.replies.some(reply => reply.id === replyId && reply.postId === postId)) return null;
  return { view: 'community', id: postId, replyId };
}

type DocumentLink = { id: string; title: string; archived: boolean };
export type ProgramPublishingActivity = {
  flows: { id: string; title: string; versionId: string; number: number; archived: boolean; documents: (DocumentLink & { canEditPublication: boolean })[] }[];
  drafts: { id: string; title: string; updatedAt: string; flowId: string | null; flowArchived: boolean; document: DocumentLink | null }[];
};

/** Whitelisted private navigation metadata for the active actor only; never copy draft bodies. */
export function readProgramPublishingActivity(data: ProgramData, actorId: string): ProgramPublishingActivity {
  const empty: ProgramPublishingActivity = { flows: [], drafts: [] };
  if (data.activeActorId !== actorId || !Object.hasOwn(data.spaces, actorId)) return empty;
  const space = data.spaces[actorId];
  const document = (id: string | null): DocumentLink | null => {
    const doc = [...space.text.documents, ...space.text.flows].find(row => row.id === id);
    return doc ? { id: doc.id, title: doc.title, archived: space.archivedDocumentIds.includes(doc.id) } : null;
  };
  const editableFlow = (documentId: string): string | null => {
    const draft = space.publicationDrafts.find(row => row.documentId === documentId);
    if (draft) return draft.flowId;
    // Match the existing document-based publisher entry; never open a different
    // linked Flow while the activity row names this one.
    const linked = space.publications.flatMap(link => data.public.flows.filter(flow => link.documentId === documentId
      && link.flowId === flow.id && flow.ownerId === actorId));
    return (linked.find(flow => !flow.archived) ?? linked[0])?.id ?? null;
  };
  return {
    flows: data.public.flows.filter(flow => flow.ownerId === actorId).flatMap(flow => {
      const version = data.public.versions.find(row => row.id === flow.currentVersionId && row.flowId === flow.id);
      if (!version) return [];
      const ids = [...new Set(space.publications.filter(link => link.flowId === flow.id).map(link => link.documentId))];
      return [{ id: flow.id, title: version.title, versionId: version.id, number: version.number, archived: flow.archived,
        documents: ids.flatMap(id => { const linked = document(id); return linked ? [{ ...linked, canEditPublication: editableFlow(linked.id) === flow.id }] : []; }) }];
    }),
    drafts: space.publicationDrafts.map(draft => ({ id: draft.id, title: draft.title, updatedAt: draft.updatedAt,
      flowId: draft.flowId, flowArchived: !!data.public.flows.find(flow => flow.id === draft.flowId)?.archived,
      document: document(draft.documentId) })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  };
}
