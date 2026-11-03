import { PROGRAM_SCHEMA, type ProgramEnvelope, type ProgramPrivateSpace, type ProgramTransition } from '../contract';
import { createProgramPrivateSpace, programIdentifier, programShape, validateProgramEnvelope } from '../program-data';
import { ALPHA_SCHEMA, ALPHA_COMMAND_SCHEMA, type AlphaAccount, type AlphaReferenceContext, type AlphaPrivateCommand as AlphaCommand, type AlphaChange } from './contract';
import { canonicalJson, detached } from './json';

export function materializeAccount(account: AlphaAccount, references: AlphaReferenceContext): ProgramEnvelope {
  const actorId = account.source.actorId;
  return { schema: PROGRAM_SCHEMA, revision: account.source.revision,
    data: { ...(references.social ? { projection: 'alpha-social-v1' as const } : {}), actors: references.actorIds.map(id => ({ id, name: references.social?.actorNames[id] ?? 'M1 reference', simulated: true })), activeActorId: actorId,
      spaces: Object.fromEntries(references.actorIds.map(id => [id, id === actorId ? account.space : createProgramPrivateSpace()])),
      public: references.public, receipts: account.legacyReceipts },
    undo: Object.fromEntries(references.actorIds.map(id => [id, id === actorId ? account.legacyUndo : []])) };
}
export function validateAlphaAccount(value: unknown, references: AlphaReferenceContext, ownerId?: string): value is AlphaAccount {
  try {
    const copy = detached(value);
    if (!programShape(copy, ['schema', 'ownerId', 'revision', 'source', 'space', 'legacyUndo', 'legacyReceipts'])
      || copy.schema !== ALPHA_SCHEMA || !programIdentifier(copy.ownerId) || (ownerId !== undefined && copy.ownerId !== ownerId)
      || !Number.isSafeInteger(copy.revision) || (copy.revision as number) < 0
      || !programShape(copy.source, ['schema', 'actorId', 'revision']) || copy.source.schema !== PROGRAM_SCHEMA
      || !programIdentifier(copy.source.actorId) || !Number.isSafeInteger(copy.source.revision) || (copy.source.revision as number) < 0
      || !programShape(references, ['actorIds', 'public', ...(Object.hasOwn(references, 'social') ? ['social'] : [])]) || !Array.isArray(references.actorIds)
      || !references.actorIds.every(programIdentifier) || !references.actorIds.includes(copy.source.actorId)
      || !Array.isArray(copy.legacyReceipts)) return false;
    if (references.social && (!programShape(references.social, ['schema', 'revision', 'ownActorId', 'actorNames'])
      || references.social.schema !== 'flowme-alpha-social-projection/1' || !Number.isSafeInteger(references.social.revision) || references.social.revision < 0
      || !/^member-[0-9a-f-]{36}$/.test(references.social.ownActorId) || !programShape(references.social.actorNames, references.actorIds)
      || Object.values(references.social.actorNames).some(name => typeof name !== 'string' || !name.trim() || name.length > 80))) return false;
    const actorId = copy.source.actorId;
    if (copy.legacyReceipts.some(row => !row || row.actorId !== actorId)) return false;
    return validateProgramEnvelope(materializeAccount(copy as unknown as AlphaAccount, detached(references)), { allowAlphaProjection: !!references.social });
  } catch { return false; }
}
/** Explicit local conversion preview: reads no browser keys and performs no writes. */
export function captureAlphaAccount(envelope: ProgramEnvelope, actorId: string, ownerId: string): { account: AlphaAccount; references: AlphaReferenceContext } {
  const source = detached(envelope);
  if (!validateProgramEnvelope(source) || !programIdentifier(ownerId) || !Object.hasOwn(source.data.spaces, actorId)) throw Error('alpha-invalid-source');
  const account: AlphaAccount = { schema: ALPHA_SCHEMA, ownerId, revision: 0,
    source: { schema: source.schema, actorId, revision: source.revision }, space: source.data.spaces[actorId],
    legacyUndo: source.undo[actorId], legacyReceipts: source.data.receipts.filter(receipt => receipt.actorId === actorId) };
  const references = { actorIds: source.data.actors.map(actor => actor.id), public: source.data.public };
  if (!validateAlphaAccount(account, references, ownerId)) throw Error('alpha-invalid-account');
  return { account, references };
}

export function privateChanges(before: ProgramPrivateSpace, after: ProgramPrivateSpace): AlphaChange[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().flatMap(key => {
    const field = key as keyof ProgramPrivateSpace, present = Object.hasOwn(after, field);
    if (Object.hasOwn(before, field) === present && (!present || canonicalJson(before[field]) === canonicalJson(after[field]))) return [];
    return [present ? { field, present: true as const, value: detached(after[field]) } : { field, present: false as const }];
  });
}
/** Reuses current pure transitions, rejecting publication, actor switching or foreign-space changes. */
export function commandFromProgramTransition(account: AlphaAccount, references: AlphaReferenceContext, requestId: string,
  build: (current: ProgramEnvelope['data']) => ProgramTransition<string>): AlphaCommand {
  if (!validateAlphaAccount(account, references)) throw Error('alpha-invalid-account');
  const baseline = materializeAccount(detached(account), detached(references));
  const transition = build(detached(baseline.data));
  if (!transition.ok) throw Error(`alpha-domain-${transition.reason}`);
  const next = detached(transition.data);
  const actorId = account.source.actorId;
  const guarded = detached(next); guarded.spaces[actorId] = baseline.data.spaces[actorId];
  // Existing private transitions append local idempotency receipts. The server's
  // owner+requestId ledger replaces only these newly appended compatibility receipts.
  if (canonicalJson(next.receipts.slice(0, baseline.data.receipts.length)) !== canonicalJson(baseline.data.receipts)
    || next.receipts.slice(baseline.data.receipts.length).some(receipt => receipt.actorId !== actorId)) throw Error('alpha-foreign-receipt');
  guarded.receipts = baseline.data.receipts;
  if (canonicalJson(guarded) !== canonicalJson(baseline.data)
      || !validateProgramEnvelope({ ...baseline, data: next }, { allowAlphaProjection: !!references.social })) throw Error('alpha-non-private-transition');
  return { schema: ALPHA_COMMAND_SCHEMA, requestId, expectedRevision: account.revision,
    kind: 'change-private', changes: privateChanges(account.space, next.spaces[actorId]) };
}
