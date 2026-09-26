import {
  PROGRAM_LIMITS, programClone, programFailure, programId, programResult,
  type ProgramData, type ProgramMedia, type ProgramPost, type ProgramReaction,
  type ProgramReply, type ProgramTransition, type ProgramProposal,
} from './contract';
import { programIdentifier, validateProgramData, validateProgramMedia } from './program-data';
import { isProgramStoredMedia } from './community-media';

type PostContent = { title: string; body: string; topic: string; media?: ProgramMedia[] };
type EditExpectation = { expectedUpdatedAt?: string; expectedContent?: string };
export function programPostEditToken(post: ProgramPost): string {
  return JSON.stringify([post.updatedAt, post.title, post.body, post.topic, post.media, post.evidencePostIds]);
}
export function programReplyEditToken(reply: ProgramReply): string { return JSON.stringify([reply.updatedAt, reply.body]); }
export type CreateProgramPostInput = PostContent & {
  actorId: string; requestId: string; kind: ProgramPost['kind'];
  flowId?: string | null; versionId?: string | null; itemId?: string | null;
  evidencePostIds?: string[];
};
export type CreateProgramReplyInput = {
  actorId: string; requestId: string; postId: string; parentReplyId?: string | null; body: string;
};

const knownActor = (data: ProgramData, id: string) => data.actors.some(actor => actor.id === id);
const text = (value: unknown, max: number, required = true): value is string =>
  typeof value === 'string' && value.length <= max && (!required || value.trim().length > 0);
const validTime = (value: string) => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const validRequest = programIdentifier;
function validatedResult(data: ProgramData, next: ProgramData, id: string): ProgramTransition<string> {
  return validateProgramData(next) ? programResult(data, next, id) : programFailure(data, 'invalid');
}

/** Only explicit image payload fields may cross the private/public boundary. */
function publicMedia(input: ProgramMedia[] | undefined): ProgramMedia[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 4) return null;
  const ids = new Set<string>();
  const result: ProgramMedia[] = [];
  for (const media of input) {
    if (!media || !programIdentifier(media.id) || ids.has(media.id) || !text(media.alt, 500)
      || typeof media.synthetic !== 'boolean' || typeof media.dataUrl !== 'string') return null;
    if (isProgramStoredMedia(media)) {
      const selected = { id: media.id, dataUrl: media.dataUrl, alt: media.alt, synthetic: media.synthetic };
      if (!validateProgramMedia(selected)) return null;
      ids.add(media.id); result.push(selected); continue;
    }
    const match = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(media.dataUrl);
    if (!match || match[2].length % 4 !== 0) return null;
    const bytes = match[2].length / 4 * 3 - (match[2].endsWith('==') ? 2 : match[2].endsWith('=') ? 1 : 0);
    if (bytes <= 0 || bytes > PROGRAM_LIMITS.mediaBytes) return null;
    let decoded: string;
    try { decoded = atob(match[2]); } catch { return null; }
    const signature = match[1] === 'png' ? decoded.startsWith('\x89PNG\r\n\x1a\n')
      : match[1] === 'jpeg' ? decoded.startsWith('\xff\xd8\xff')
        : match[1] === 'gif' ? /^GIF8[79]a/.test(decoded)
          : decoded.startsWith('RIFF') && decoded.slice(8, 12) === 'WEBP';
    if (!signature) return null;
    ids.add(media.id);
    const selected = { id: media.id, dataUrl: media.dataUrl, alt: media.alt, synthetic: media.synthetic };
    if (!validateProgramMedia(selected)) return null;
    result.push(selected);
  }
  return result;
}

function content(input: PostContent): Pick<ProgramPost, 'title' | 'body' | 'topic' | 'media'> | null {
  if (!text(input.title, PROGRAM_LIMITS.titleChars) || !text(input.body, PROGRAM_LIMITS.bodyChars)
    || !text(input.topic, 120, false)) return null;
  const media = publicMedia(input.media);
  return media && { title: input.title.trim(), body: input.body, topic: input.topic.trim(), media };
}

function replay(data: ProgramData, actorId: string, requestId: string, kind: string, fingerprint: string): ProgramTransition<string> | null {
  const prior = data.receipts.find(receipt => receipt.actorId === actorId && receipt.id === requestId);
  if (!prior) return null;
  return prior.kind === kind && prior.fingerprint === fingerprint
    ? { ok: true, data, changed: false, result: prior.resultId }
    : programFailure(data, 'duplicate-request');
}

function postReference(data: ProgramData, flowId: string | null, versionId: string | null, itemId: string | null): boolean {
  if (!flowId) return !versionId && !itemId;
  const flow = data.public.flows.find(entry => entry.id === flowId && !entry.archived);
  if (!flow || !versionId) return false;
  const version = data.public.versions.find(entry => entry.id === versionId && entry.flowId === flowId);
  return Boolean(version && (!itemId || version.items.some(item => item.id === itemId)));
}

export function createProgramPost(data: ProgramData, input: CreateProgramPostInput, now: string): ProgramTransition<string> {
  if (!knownActor(data, input.actorId)) return programFailure(data, 'forbidden');
  const fields = content(input);
  if (!fields || !validTime(now) || !validRequest(input.requestId)
    || !['experience', 'question', 'knowledge'].includes(input.kind)) return programFailure(data, 'invalid');
  const flowId = input.flowId ?? null, versionId = input.versionId ?? null, itemId = input.itemId ?? null;
  const evidence = input.evidencePostIds ?? [];
  if (!Array.isArray(evidence) || evidence.length > 50 || evidence.some(id => !programIdentifier(id))) return programFailure(data, 'invalid');
  const evidencePostIds = [...new Set(evidence)];
  const fingerprint = JSON.stringify({ kind: input.kind, ...fields, flowId, versionId, itemId, evidencePostIds });
  const previous = replay(data, input.actorId, input.requestId, 'community-post', fingerprint);
  if (previous) return previous;
  if (!postReference(data, flowId, versionId, itemId)
    || evidencePostIds.some(id => !data.public.posts.some(post => post.id === id && !post.deleted))) return programFailure(data, 'missing');
  if (data.public.posts.length >= PROGRAM_LIMITS.entries || data.receipts.length >= PROGRAM_LIMITS.entries) return programFailure(data, 'limit');
  const next = programClone(data), id = programId('post');
  next.public.posts.push({ id, authorId: input.actorId, kind: input.kind, ...fields, flowId, versionId, itemId,
    evidencePostIds, createdAt: now, updatedAt: now, deleted: false });
  next.receipts.push({ id: input.requestId, actorId: input.actorId, kind: 'community-post', fingerprint, resultId: id });
  return validatedResult(data, next, id);
}

export function editProgramPost(data: ProgramData, input: PostContent & EditExpectation & { actorId: string; postId: string; evidencePostIds?: string[] }, now: string): ProgramTransition<string> {
  if (!knownActor(data, input.actorId)) return programFailure(data, 'forbidden');
  const post = data.public.posts.find(entry => entry.id === input.postId);
  if (!post || post.deleted) return programFailure(data, 'missing');
  if (post.authorId !== input.actorId) return programFailure(data, 'forbidden');
  const fields = content({ title: input.title, body: input.body, topic: input.topic, media: input.media ?? post.media });
  if (!fields || !validTime(now)) return programFailure(data, 'invalid');
  const evidencePostIds = input.evidencePostIds ?? post.evidencePostIds;
  if (!Array.isArray(evidencePostIds) || evidencePostIds.length > 50 || evidencePostIds.some(id => !programIdentifier(id))
    || new Set(evidencePostIds).size !== evidencePostIds.length) return programFailure(data, 'invalid');
  if (evidencePostIds.some(id => id === post.id || !data.public.posts.some(entry => entry.id === id)
    || !post.evidencePostIds.includes(id) && data.public.posts.find(entry => entry.id === id)!.deleted)) return programFailure(data, 'missing');
  if (post.title === fields.title && post.body === fields.body && post.topic === fields.topic
    && JSON.stringify(post.media) === JSON.stringify(fields.media) && JSON.stringify(post.evidencePostIds) === JSON.stringify(evidencePostIds)) return { ok: true, data, changed: false, result: post.id };
  if (input.expectedUpdatedAt !== undefined && post.updatedAt !== input.expectedUpdatedAt
    || input.expectedContent !== undefined && programPostEditToken(post) !== input.expectedContent) return programFailure(data, 'conflict');
  const next = programClone(data), target = next.public.posts.find(entry => entry.id === post.id)!;
  Object.assign(target, fields, { evidencePostIds: [...evidencePostIds], updatedAt: now });
  return validatedResult(data, next, post.id);
}

export function deleteProgramPost(data: ProgramData, actorId: string, postId: string, now: string): ProgramTransition<string> {
  if (!knownActor(data, actorId)) return programFailure(data, 'forbidden');
  const post = data.public.posts.find(entry => entry.id === postId);
  if (!post) return programFailure(data, 'missing');
  if (post.authorId !== actorId) return programFailure(data, 'forbidden');
  if (!validTime(now)) return programFailure(data, 'invalid');
  if (post.deleted) return { ok: true, data, changed: false, result: postId };
  const next = programClone(data), target = next.public.posts.find(entry => entry.id === postId)!;
  target.title = '삭제된 글'; target.body = ''; target.topic = ''; target.media = [];
  target.evidencePostIds = []; target.deleted = true; target.updatedAt = now;
  next.public.reactions = next.public.reactions.filter(reaction => !(reaction.targetKind === 'post' && reaction.targetId === postId));
  return validatedResult(data, next, postId);
}

export function createProgramReply(data: ProgramData, input: CreateProgramReplyInput, now: string): ProgramTransition<string> {
  if (!knownActor(data, input.actorId)) return programFailure(data, 'forbidden');
  if (!validRequest(input.requestId) || !text(input.body, PROGRAM_LIMITS.bodyChars) || !validTime(now)) return programFailure(data, 'invalid');
  const parentReplyId = input.parentReplyId ?? null;
  const fingerprint = JSON.stringify({ postId: input.postId, parentReplyId, body: input.body });
  const previous = replay(data, input.actorId, input.requestId, 'community-reply', fingerprint);
  if (previous) return previous;
  if (!data.public.posts.some(post => post.id === input.postId && !post.deleted)) return programFailure(data, 'missing');
  if (parentReplyId && !data.public.replies.some(reply => reply.id === parentReplyId && reply.postId === input.postId && !reply.deleted)) return programFailure(data, 'missing');
  if (data.public.replies.length >= PROGRAM_LIMITS.entries || data.receipts.length >= PROGRAM_LIMITS.entries) return programFailure(data, 'limit');
  const next = programClone(data), id = programId('reply');
  next.public.replies.push({ id, postId: input.postId, parentReplyId, authorId: input.actorId, body: input.body,
    createdAt: now, updatedAt: now, deleted: false });
  next.receipts.push({ id: input.requestId, actorId: input.actorId, kind: 'community-reply', fingerprint, resultId: id });
  return validatedResult(data, next, id);
}

export function editProgramReply(data: ProgramData, input: EditExpectation & { actorId: string; replyId: string; body: string }, now: string): ProgramTransition<string> {
  if (!knownActor(data, input.actorId)) return programFailure(data, 'forbidden');
  const reply = data.public.replies.find(entry => entry.id === input.replyId);
  if (!reply || reply.deleted || !data.public.posts.some(post => post.id === reply.postId && !post.deleted)) return programFailure(data, 'missing');
  if (reply.authorId !== input.actorId) return programFailure(data, 'forbidden');
  if (!text(input.body, PROGRAM_LIMITS.bodyChars) || !validTime(now)) return programFailure(data, 'invalid');
  if (reply.body === input.body) return { ok: true, data, changed: false, result: reply.id };
  if (input.expectedUpdatedAt !== undefined && reply.updatedAt !== input.expectedUpdatedAt
    || input.expectedContent !== undefined && programReplyEditToken(reply) !== input.expectedContent) return programFailure(data, 'conflict');
  const next = programClone(data), target = next.public.replies.find(entry => entry.id === reply.id)!;
  target.body = input.body; target.updatedAt = now;
  return validatedResult(data, next, reply.id);
}

export function deleteProgramReply(data: ProgramData, actorId: string, replyId: string, now: string): ProgramTransition<string> {
  if (!knownActor(data, actorId)) return programFailure(data, 'forbidden');
  const reply = data.public.replies.find(entry => entry.id === replyId);
  if (!reply) return programFailure(data, 'missing');
  if (reply.authorId !== actorId) return programFailure(data, 'forbidden');
  if (!validTime(now)) return programFailure(data, 'invalid');
  if (reply.deleted) return { ok: true, data, changed: false, result: replyId };
  const next = programClone(data), target = next.public.replies.find(entry => entry.id === replyId)!;
  target.body = ''; target.deleted = true; target.updatedAt = now;
  next.public.reactions = next.public.reactions.filter(reaction => !(reaction.targetKind === 'reply' && reaction.targetId === replyId));
  return validatedResult(data, next, replyId);
}

export function toggleProgramReaction(data: ProgramData, actorId: string, targetKind: ProgramReaction['targetKind'], targetId: string): ProgramTransition<string> {
  if (!knownActor(data, actorId)) return programFailure(data, 'forbidden');
  if (targetKind !== 'post' && targetKind !== 'reply') return programFailure(data, 'invalid');
  const reply = targetKind === 'reply' ? data.public.replies.find(entry => entry.id === targetId && !entry.deleted) : null;
  const postId = targetKind === 'post' ? targetId : reply?.postId;
  if (!postId || !data.public.posts.some(post => post.id === postId && !post.deleted)) return programFailure(data, 'missing');
  const index = data.public.reactions.findIndex(reaction => reaction.actorId === actorId && reaction.targetKind === targetKind && reaction.targetId === targetId);
  if (index < 0 && data.public.reactions.length >= PROGRAM_LIMITS.entries) return programFailure(data, 'limit');
  const next = programClone(data);
  if (index >= 0) next.public.reactions.splice(index, 1);
  else next.public.reactions.push({ actorId, targetKind, targetId });
  return validatedResult(data, next, targetId);
}

export type ProgramActivity = {
  posts: ProgramPost[]; replies: ProgramReply[]; reactions: ProgramReaction[];
  receivedReplies: ProgramReply[]; proposals: ProgramProposal[]; incomingProposals: ProgramProposal[];
};
export function listProgramActivity(data: ProgramData, actorId: string): ProgramActivity {
  if (!knownActor(data, actorId)) return { posts: [], replies: [], reactions: [], receivedReplies: [], proposals: [], incomingProposals: [] };
  const ownedPosts = new Set(data.public.posts.filter(post => post.authorId === actorId).map(post => post.id));
  const ownedReplies = new Set(data.public.replies.filter(reply => reply.authorId === actorId).map(reply => reply.id));
  const ownedFlows = new Set(data.public.flows.filter(flow => flow.ownerId === actorId).map(flow => flow.id));
  return programClone({
    posts: data.public.posts.filter(post => post.authorId === actorId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    replies: data.public.replies.filter(reply => reply.authorId === actorId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    reactions: data.public.reactions.filter(reaction => reaction.actorId === actorId),
    receivedReplies: data.public.replies.filter(reply => reply.authorId !== actorId && (ownedPosts.has(reply.postId) || reply.parentReplyId !== null && ownedReplies.has(reply.parentReplyId)))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    proposals: data.public.proposals.filter(proposal => proposal.authorId === actorId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    incomingProposals: data.public.proposals.filter(proposal => ownedFlows.has(proposal.flowId)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  });
}
