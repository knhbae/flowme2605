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
/** R6 (11/6, '남김'): a public Flow, version, post, reply, reaction or proposal outlives its author's account. Once that
 *  author's public identity is gone the rows still name the alias, and the graph check (every author in `actors`)
 *  refused the whole read, for everyone. Each such well-formed alias is read as one more actor, shown as every author
 *  is ('FlowMe 참여자'). Nothing else changes: the viewer's own alias must still be there, and a malformed id still
 *  fails. Read only; the server writes the public rows, never these actors. */
export const ALPHA_DEPARTED_ACTOR_NAME = 'FlowMe 참여자';
export function withDepartedAlphaActors(value: unknown): unknown {
  try {
    if (!programShape(value, ['schema', 'revision', 'ownActorId', 'actors', 'public']) || !Array.isArray(value.actors)
      || !programShape(value.public, ['flows', 'versions', 'posts', 'replies', 'reactions', 'proposals'])) return value;
    const known = new Set(value.actors.map(row => (row as { id?: unknown } | null)?.id)), departed = new Set<string>();
    const named = (rows: unknown, keys: string[]) => { if (Array.isArray(rows)) for (const row of rows) for (const key of keys) {
      const id = (row as Record<string, unknown> | null)?.[key];
      if (alias(id) && !known.has(id) && id !== value.ownActorId) departed.add(id);
    } };
    const { flows, versions, posts, replies, reactions, proposals } = value.public;
    named(flows, ['ownerId']); named(versions, ['createdBy']); named(posts, ['authorId']); named(replies, ['authorId']);
    named(reactions, ['actorId']); named(proposals, ['authorId', 'reviewedBy']);
    return departed.size ? { ...value, actors: [...value.actors, ...[...departed].sort().map(id => ({ id, name: ALPHA_DEPARTED_ACTOR_NAME }))] } : value;
  } catch { return value; }
}
export function readAlphaSocialResponse(value: unknown, ownerId: string, options: { server?: boolean } = {}): AlphaSocialRead | null {
  if (!programShape(value, ['ok', 'value']) || value.ok !== true || !programShape(value.value, ['account', 'context'])) return null;
  const context = withDepartedAlphaActors(value.value.context);
  if (!isAlphaSocialContext(context, options)) return null;
  return validateAlphaAccount(value.value.account, alphaSocialReferences(context, ownerId), ownerId)
    ? detached({ account: value.value.account, context }) : null;
}
