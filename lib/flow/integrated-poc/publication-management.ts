import type { ProgramData } from './contract';
import { programFlowReviews } from './flow-loop';
import { readProgramPublishingActivity } from './publishing-activity';
import { documentFingerprint, publicationDraftAt, sameFingerprint } from './publication-editor';

export type ProgramPublicationEditMode = 'new-version' | 'resume' | 'republish';

/** Document-menu handoff only; the protected writing hosts decide when to flush and navigate. */
export function programPublicationDocumentEntry(data: ProgramData, documentId: string) {
  const actorId = data.activeActorId, space = data.spaces[actorId];
  if (!space || space.archivedDocumentIds.includes(documentId) || space.documentTrash?.[documentId]
    || ![...space.text.documents, ...space.text.flows].some(row => row.id === documentId)) return null;
  const draft = publicationDraftAt(data, actorId, documentId);
  if (draft) return { kind: 'resume' as const, label: '공개 이어서', documentId, initialStep: 'refine' as const, flowId: draft.flowId };
  const linked = space.publications.flatMap(link => link.documentId === documentId
    ? data.public.flows.filter(flow => flow.id === link.flowId && flow.ownerId === actorId) : []);
  const flow = linked.find(row => !row.archived) ?? linked.at(-1);
  const version = flow && data.public.versions.find(row => row.id === flow.currentVersionId && row.flowId === flow.id);
  if (flow && version) return { kind: 'manage' as const, label: `공개 관리 · 버전 ${version.number}`, documentId, initialStep: 'pick' as const, flowId: flow.id };
  return { kind: 'publish' as const, label: '공개하기', documentId, initialStep: 'pick' as const, flowId: null };
}

/** Private management metadata for the active owner. No source snapshot means unknown, not unchanged. */
export function readProgramPublicationManagement(data: ProgramData, actorId: string, flowId: string) {
  const flow = data.public.flows.find(row => row.id === flowId && row.ownerId === actorId);
  if (data.activeActorId !== actorId || !data.spaces[actorId] || !flow) return null;
  const version = data.public.versions.find(row => row.id === flow.currentVersionId && row.flowId === flowId);
  const activity = readProgramPublishingActivity(data, actorId).flows.find(row => row.id === flowId);
  if (!version || !activity) return null;
  const space = data.spaces[actorId];
  const documents = activity.documents.map(document => {
    const draft = publicationDraftAt(data, actorId, document.id);
    const fingerprint = documentFingerprint(data, actorId, document.id);
    const trashed = !!space.documentTrash?.[document.id];
    return { ...document, canEditPublication: document.canEditPublication && !trashed,
      sourceChanged: draft?.flowId === flowId && fingerprint !== null && !trashed
        ? !sameFingerprint(fingerprint, draft.sourceDocumentFingerprint) : null };
  });
  const reviews = programFlowReviews(data, actorId).posts.filter(post => post.flowId === flowId);
  // Reactions received by this owner on their posts/replies linked to this exact Flow.
  const posts = data.public.posts.filter(post => !post.deleted && post.flowId === flowId
    && data.public.versions.some(row => row.id === post.versionId && row.flowId === flowId));
  const ownPosts = new Set(posts.filter(post => post.authorId === actorId).map(post => post.id));
  const ownReplies = data.public.replies.filter(reply => !reply.deleted && reply.authorId === actorId
    && posts.some(post => post.id === reply.postId));
  const reactions = data.public.reactions.filter(reaction => reaction.actorId !== actorId
    && (reaction.targetKind === 'post' ? ownPosts.has(reaction.targetId) : ownReplies.some(reply => reply.id === reaction.targetId)))
    .flatMap(reaction => {
      const reply = reaction.targetKind === 'reply' ? ownReplies.find(row => row.id === reaction.targetId) : undefined;
      const post = posts.find(row => row.id === (reply?.postId ?? reaction.targetId));
      return post ? [{ reaction, post, replyId: reply?.id }] : [];
    });
  return { flow, version, documents, reviews, reactions,
    archiveDocumentId: space.publications.find(link => link.flowId === flowId && link.documentId)?.documentId ?? null };
}
