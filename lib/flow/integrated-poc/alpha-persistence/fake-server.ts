import {preservesPersonalAuthoring} from '../personal-authoring-boundary';
import type { ProgramPrivateSpace } from '../contract';
import { programIdentifier, programShape } from '../program-data';
import { ALPHA_COMMAND_SCHEMA, ALPHA_LIMITS, type AlphaAccount, type AlphaChange, type AlphaPrivateCommand as AlphaCommand, type AlphaReceipt, type AlphaReferenceContext, type AlphaRepository, type AlphaResult, type AlphaOperation, type AlphaSpace } from './contract';
import { canonicalJson, detached, parseAlphaJson } from './json';
import { privateChanges, validateAlphaAccount } from './program-adapter';

const fields: (keyof ProgramPrivateSpace)[] = ['personalAuthoring', 'text', 'archivedDocumentIds', 'documentTrash', 'copies', 'savedBindings', 'draftRevisions',
  'participationDrafts', 'publicationDrafts', 'publications', 'position', 'timelineOrders', 'executionTimelineOrders', 'legacySnapshot',
  'legacyQuickItemLines', 'legacyTimelinePolicies', 'retentionDocuments', 'creatorDraftImports', 'creatorWorkspace', 'proposalReviewDrafts',
  'recurrenceExecution', 'recurrencePlans'];
export function validateAlphaCommand(value: unknown): value is AlphaCommand {
  try {
    const command = detached(value);
    if (!programShape(command, ['schema', 'requestId', 'expectedRevision', 'kind', ...(command&&typeof command==='object'&&Object.hasOwn(command,'authoringVersion')?['authoringVersion']:[]), ...(command && typeof command === 'object' && 'kind' in command && command.kind === 'undo-private' ? ['operationId'] : ['changes'])])
      || command.schema !== ALPHA_COMMAND_SCHEMA || !programIdentifier(command.requestId) || command.requestId.length > ALPHA_LIMITS.requestIdChars
      || !Number.isSafeInteger(command.expectedRevision) || (command.expectedRevision as number) < 0) return false;
    if(Object.hasOwn(command,'authoringVersion')&&command.authoringVersion!==1)return false;
    if (command.kind === 'undo-private') return programIdentifier(command.operationId) && command.operationId !== command.requestId;
    return command.kind === 'change-private' && Array.isArray(command.changes) && command.changes.length <= fields.length
      && command.changes.every(change => programShape(change, ['field', 'present', ...(change?.present === true ? ['value'] : [])])
        && fields.includes(change.field as keyof ProgramPrivateSpace) && typeof change.present === 'boolean')
      && new Set(command.changes.map(change => change.field)).size === command.changes.length;
  } catch { return false; }
}
function applyChanges(space: AlphaSpace, changes: AlphaChange[]): unknown {
  const next = detached(space) as unknown as Record<string, unknown>;
  for (const change of changes) {
    if (change.present) next[change.field] = detached(change.value);
    else delete next[change.field];
  }
  return next;
}
type Stored<Space extends AlphaSpace> = { account: AlphaAccount<Space>; references: AlphaReferenceContext; operations: Map<string, AlphaOperation> };
type Seed<Space extends AlphaSpace> = { account: AlphaAccount<Space>; references: AlphaReferenceContext; operations?: AlphaOperation[] };
type AccountValidator<Space extends AlphaSpace> = (value:unknown,references:AlphaReferenceContext,ownerId?:string)=>value is AlphaAccount<Space>;

/** Validate operation continuity and replay inverses without mutating a live account. */
export function validateAlphaOperations(account: AlphaAccount, references: AlphaReferenceContext, value: unknown): value is AlphaOperation[] {
  try {
    const operations = detached(value);
    if (!Array.isArray(operations) || operations.length !== account.revision) return false;
    const byId = new Map<string, AlphaOperation>(), undone = new Set<string>();
    for (const [index, operation] of operations.entries()) {
      if (!programShape(operation, ['fingerprint', 'receipt', 'inverse', 'undone']) || typeof operation.fingerprint !== 'string'
        || typeof operation.undone !== 'boolean' || !programShape(operation.receipt, ['requestId', 'revision', 'changed', 'kind'])) return false;
      const receipt = operation.receipt, command = parseAlphaJson(operation.fingerprint);
      if (!validateAlphaCommand(command) || canonicalJson(command) !== operation.fingerprint || command.requestId !== receipt.requestId
        || receipt.changed !== true || receipt.revision !== index + 1 || command.expectedRevision !== index || receipt.kind !== command.kind
        || byId.has(command.requestId) || !validateAlphaCommand({ schema: ALPHA_COMMAND_SCHEMA, requestId: 'inverse-check', expectedRevision: 0, kind: 'change-private', changes: operation.inverse })) return false;
      if (command.kind === 'undo-private') {
        const original = byId.get(command.operationId);
        if (!original || original.receipt.kind !== 'change-private' || original.receipt.revision !== index || undone.has(command.operationId)) return false;
        undone.add(command.operationId);
      }
      byId.set(command.requestId, operation as unknown as AlphaOperation);
    }
    if ([...byId.values()].some(operation => operation.undone !== undone.has(operation.receipt.requestId))) return false;
    let cursor = detached(account);
    for (const operation of [...byId.values()].reverse()) {
      const before = {...detached(cursor),revision:cursor.revision-1,space:applyChanges(cursor.space,operation.inverse)};
      if (!validateAlphaAccount(before, references) || canonicalJson(before.space) === canonicalJson(cursor.space)) return false;
      const command = parseAlphaJson(operation.fingerprint) as AlphaCommand;
      const forward = command.kind === 'change-private' ? command.changes : byId.get(command.operationId)!.inverse;
      if (canonicalJson(applyChanges(before.space, forward)) !== canonicalJson(cursor.space)) return false;
      cursor = before;
    }
    return true;
  } catch { return false; }
}

/** Test server. Tokens, atomic queue and fault controls are simulation only, not Auth/RLS. */
export function createAlphaFakeServer(seeds: { account: AlphaAccount; references: AlphaReferenceContext; operations?: AlphaOperation[] }[]) {
  for(const seed of seeds)if(!validateAlphaAccount(seed.account,seed.references)||!validateAlphaOperations(seed.account,seed.references,seed.operations??[]))throw Error('alpha-invalid-seed');
  return createAlphaMemoryCore(seeds,validateAlphaAccount,()=>true);
}
/** Explicit memory-test profile only. No HTTP/RPC route calls or registers this factory.
 * Initial revision0/no history; only the existing text field may change. */
export function createAlphaTypedMemoryTestServer<Space extends AlphaSpace>(seeds:Seed<Space>[],profile:{scope:'local-typed-memory-test/1';validateAccount:AccountValidator<Space>}){
  if(profile.scope!=='local-typed-memory-test/1'||seeds.some(seed=>seed.account.revision!==0||(seed.operations?.length??0)!==0))throw Error('alpha-unsupported-test-seed');
  return createAlphaMemoryCore(seeds,profile.validateAccount,command=>command.kind==='change-private'&&command.changes.length===1&&command.changes[0].field==='text'&&command.changes[0].present);
}
/** Shared owner-bound atomic/CAS/idempotency/apply engine; defaults are chosen by wrappers. */
function createAlphaMemoryCore<Space extends AlphaSpace>(seeds:Seed<Space>[],validate:AccountValidator<Space>,allows:(command:AlphaCommand)=>boolean){
  const accounts = new Map<string, Stored<Space>>();
  for (const seed of seeds) {
    if (accounts.has(seed.account.ownerId) || !validate(seed.account, seed.references)) throw Error('alpha-invalid-seed');
    accounts.set(seed.account.ownerId, { ...detached(seed), operations: new Map(detached(seed.operations ?? []).map(op => [op.receipt.requestId, op])) });
  }
  const sessions = new Map<string, string>();
  let queue: Promise<unknown> = Promise.resolve(), mutations = 0, failCommit = false;
  function atomic<T>(work: () => T): Promise<T> {
    const result = queue.then(work); queue = result.then(() => undefined, () => undefined); return result;
  }
  function owner(token: string): Stored<Space> | null { const id = sessions.get(token); return id ? accounts.get(id) ?? null : null; }
  return {
    issueSession(ownerId: string): string {
      if (!accounts.has(ownerId)) throw Error('alpha-unknown-owner');
      const token = globalThis.crypto.randomUUID(); sessions.set(token, ownerId); return token;
    },
    revokeSession(token: string) { sessions.delete(token); },
    failNextCommit() { failCommit = true; },
    diagnostics: () => ({ mutations, operations: [...accounts.values()].reduce((n, entry) => n + entry.operations.size, 0) }),
    /** Test administrator/offline backup port; never expose as a client endpoint. */
    exportForBackup(ownerId: string) {
      const stored = accounts.get(ownerId);
      if (!stored) throw Error('alpha-unknown-owner');
      return detached({ account: stored.account, references: stored.references, operations: [...stored.operations.values()] });
    },
    connect(token: string): AlphaRepository<Space> {
      return {
        async read() {
          const stored = owner(token);
          return stored ? { ok: true, value: detached(stored.account) } : { ok: false, reason: 'unauthenticated' };
        },
        async lookup(requestId) {
          const stored = owner(token);
          if (!stored) return { ok: false, reason: 'unauthenticated' };
          if (!programIdentifier(requestId) || requestId.length > ALPHA_LIMITS.requestIdChars) return { ok: false, reason: 'invalid' };
          return { ok: true, value: detached(stored.operations.get(requestId)?.receipt ?? null) };
        },
        execute(input): Promise<AlphaResult<AlphaReceipt>> {
          // Copy before queueing: caller mutation cannot alter an in-flight request.
          let command: unknown;
          try { command = detached(input); } catch { return Promise.resolve({ ok: false, reason: 'invalid' }); }
          return atomic(() => {
            const stored = owner(token);
            if (!stored) return { ok: false as const, reason: 'unauthenticated' as const };
            if (!validateAlphaCommand(command) || !allows(command)) return { ok: false as const, reason: 'invalid' as const };
            const fingerprint = canonicalJson(command), old = stored.operations.get(command.requestId);
            if (old) return old.fingerprint === fingerprint ? { ok: true as const, value: detached(old.receipt) }
              : { ok: false as const, reason: 'idempotency-conflict' as const };
            if (command.expectedRevision !== stored.account.revision) return { ok: false as const, reason: 'revision-conflict' as const };
            const original = command.kind === 'undo-private' ? stored.operations.get(command.operationId) : undefined;
            if (command.kind === 'undo-private' && (!original || original.undone || !original.receipt.changed
              || original.receipt.kind !== 'change-private' || original.receipt.revision !== stored.account.revision))
              return { ok: false as const, reason: 'undo-conflict' as const };
            const next = {...detached(stored.account),space:applyChanges(stored.account.space,command.kind === 'change-private' ? command.changes : original!.inverse)};
            if (!validate(next, stored.references, stored.account.ownerId)||!preservesPersonalAuthoring(stored.account.space,next.space,command)) return { ok: false as const, reason: 'invalid' as const };
            const changed = canonicalJson(stored.account.space) !== canonicalJson(next.space);
            if (changed) next.revision++;
            if (!Number.isSafeInteger(next.revision)) return { ok: false as const, reason: 'invalid' as const };
            const receipt: AlphaReceipt = { requestId: command.requestId, revision: next.revision, changed, kind: command.kind };
            // No-op is a read result, with no mutation or operation-ledger write.
            if (!changed) return { ok: false as const, reason: 'no-change' as const };
            if (failCommit) { failCommit = false; return { ok: false as const, reason: 'unavailable' as const }; }
            const operation = { fingerprint, receipt, inverse: privateChanges(next.space, stored.account.space), undone: false };
            stored.operations.set(command.requestId, operation);
            if (original) original.undone = true;
            stored.account = next; mutations++;
            return { ok: true as const, value: detached(receipt) };
          });
        },
      };
    },
  };
}
