import type { ProgramPublicRepository } from '../contract';
import type { AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import { detached, canonicalJson } from '../alpha-persistence/json';
import { validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { programShape, validateProgramPublicRepository, PROGRAM_ALPHA_PROJECTION_ACTOR_LIMIT } from '../program-data';

export const ALPHA_SOCIAL_CONTEXT_SCHEMA = 'flowme-alpha-social-context/1' as const;
export type AlphaSocialContext = { schema: typeof ALPHA_SOCIAL_CONTEXT_SCHEMA; revision: number; ownActorId: string;
  actors: { id: string; name: string }[]; public: ProgramPublicRepository };
export type AlphaSocialRead = { account: AlphaAccount; context: AlphaSocialContext };
export const emptyAlphaReferences = (owner: string): AlphaReferenceContext => ({ actorIds: [owner], public: { flows: [], versions: [], posts: [], replies: [], reactions: [], proposals: [] } });
const alias = (id: unknown): id is string => typeof id === 'string' && /^member-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id);

/** Only identity slots are mapped. User text and all opaque content IDs are exact. */
export function mapAlphaPublicActor(repository: ProgramPublicRepository, from: string, to: string): ProgramPublicRepository {
  const next = detached(repository), map = (id: string) => id === from ? to : id;
  next.flows.forEach(flow => { flow.ownerId = map(flow.ownerId); });
  next.versions.forEach(version => { version.createdBy = map(version.createdBy); });
  next.posts.forEach(post => { post.authorId = map(post.authorId); });
  next.replies.forEach(reply => { reply.authorId = map(reply.authorId); });
  next.reactions.forEach(reaction => { reaction.actorId = map(reaction.actorId); });
  next.proposals.forEach(proposal => { proposal.authorId = map(proposal.authorId); if (proposal.reviewedBy) proposal.reviewedBy = map(proposal.reviewedBy); });
  return next;
}
export function isAlphaSocialContext(value: unknown, options: { server?: boolean } = {}): value is AlphaSocialContext {
  try {
    canonicalJson(value);
    if (!programShape(value, ['schema', 'revision', 'ownActorId', 'actors', 'public']) || value.schema !== ALPHA_SOCIAL_CONTEXT_SCHEMA
      || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0 || !alias(value.ownActorId)
      || !Array.isArray(value.actors) || !value.actors.length || value.actors.length > PROGRAM_ALPHA_PROJECTION_ACTOR_LIMIT
      || value.actors.some(row => !programShape(row, ['id', 'name']) || !alias(row.id) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 80)) return false;
    const ids = value.actors.map(row => row.id);
    if (new Set(ids).size !== ids.length || !ids.includes(value.ownActorId) || !validateProgramPublicRepository(value.public, ids)) return false;
    const repository = value.public;
    return !!options.server || repository.proposals.every(proposal => proposal.authorId === value.ownActorId
      || repository.flows.some(flow => flow.id === proposal.flowId && flow.ownerId === value.ownActorId));
  } catch { return false; }
}
export function alphaSocialReferences(context: AlphaSocialContext, ownerId: string): AlphaReferenceContext {
  const mappedId = (id: string) => id === context.ownActorId ? ownerId : id;
  return { actorIds: context.actors.map(row => mappedId(row.id)), public: mapAlphaPublicActor(context.public, context.ownActorId, ownerId),
    social: { schema: 'flowme-alpha-social-projection/1', revision: context.revision, ownActorId: context.ownActorId,
      actorNames: Object.fromEntries(context.actors.map(row => [mappedId(row.id), row.name])) } };
}
export function readAlphaSocialResponse(value: unknown, ownerId: string, options: { server?: boolean } = {}): AlphaSocialRead | null {
  if (!programShape(value, ['ok', 'value']) || value.ok !== true || !programShape(value.value, ['account', 'context'])
    || !isAlphaSocialContext(value.value.context, options)) return null;
  const context = value.value.context;
  return validateAlphaAccount(value.value.account, alphaSocialReferences(context, ownerId), ownerId)
    ? detached({ account: value.value.account, context }) : null;
}
