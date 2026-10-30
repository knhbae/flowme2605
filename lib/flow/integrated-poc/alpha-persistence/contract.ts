import type { ProgramEnvelope, ProgramHistory, ProgramPrivateSpace, ProgramPublicRepository, ProgramRequestReceipt } from '../contract';
import type { AlphaCreatorCommand } from '../alpha-creator/contract';
import type { AlphaSocialCommand } from '../alpha-social/contract';

/** M1 compatibility contract, not a deployed API or an authentication provider. */
export const ALPHA_SCHEMA = 'flowme-alpha-account/1' as const;
export const ALPHA_COMMAND_SCHEMA = 'flowme-alpha-command/1' as const;
export const ALPHA_BACKUP_SCHEMA = 'flowme-alpha-backup/1' as const;
export const ALPHA_LOCAL_PREFIX = 'flow:poc:personal-workspace:v1:alpha-m1:';
export const ALPHA_LIMITS = Object.freeze({ bytes: 30_000_000, depth: 120, requestIdChars: 160 });

/** Transport framing is reusable; the default account remains the existing v11 space. */
export type AlphaSpace = Omit<ProgramPrivateSpace, 'text'> & { text: unknown };
export type AlphaAccount<Space extends AlphaSpace = ProgramPrivateSpace> = {
  schema: typeof ALPHA_SCHEMA;
  ownerId: string;
  revision: number;
  source: { schema: ProgramEnvelope['schema']; actorId: string; revision: number };
  space: Space;
  legacyUndo: ProgramHistory[];
  legacyReceipts: ProgramRequestReceipt[];
};
/** M1 offline references, or M5 owner-filtered public context. Never foreign private spaces. */
export type AlphaReferenceContext = { actorIds: string[]; public: ProgramPublicRepository;
  social?: { schema: 'flowme-alpha-social-projection/1'; revision: number; ownActorId: string; actorNames: Record<string, string> } };
export type AlphaPrivateField = keyof ProgramPrivateSpace;
export type AlphaChange = { field: AlphaPrivateField; present: false } | { field: AlphaPrivateField; present: true; value: unknown };
export type AlphaPrivateCommand = {
  schema: typeof ALPHA_COMMAND_SCHEMA;
  requestId: string;
  expectedRevision: number;
  /** Signed compatible-writer witness. Absent for untouched legacy accounts. */
  authoringVersion?:1;
} & ({ kind: 'change-private'; changes: AlphaChange[] } | { kind: 'undo-private'; operationId: string });
export type AlphaCreatorUndoCommand = { schema: 'flowme-alpha-creator-command/1'; kind: 'undo-creator'; requestId: string; expectedRevision: number; operationId: string };
export type AlphaSocialUndoCommand = { schema: 'flowme-alpha-social-command/1'; kind: 'undo-social'; requestId: string; expectedRevision: number; expectedPublicRevision: number; operationId: string };
export type AlphaCommand = AlphaPrivateCommand | AlphaCreatorCommand | AlphaCreatorUndoCommand | AlphaSocialCommand | AlphaSocialUndoCommand;
export type AlphaReceipt = { requestId: string; revision: number; changed: boolean; kind: AlphaCommand['kind']; resultId?: string; publicRevision?: number };
/** Server/offline backup only; never part of read()/lookup() responses. */
export type AlphaOperation = { fingerprint: string; receipt: AlphaReceipt; inverse: AlphaChange[]; undone: boolean };
export type AlphaError = 'invalid' | 'unauthenticated' | 'not-found' | 'revision-conflict' | 'idempotency-conflict' | 'undo-conflict' | 'unavailable' | 'no-change' | 'rate-limited' | 'limit';
export type AlphaResult<T> = { ok: true; value: T } | { ok: false; reason: AlphaError };
/** Opaque server digests of the full read: the whole account, and the context this user may see.
 *  Compared only for string equality; never parsed, never a revision or a write precondition. */
export type AlphaReadTokens = { privateToken: string; publicToken: string };
/** A probe answers tokens only. 'unsupported' means the probe RPC itself does not exist yet. */
export type AlphaReadProbe = { kind: 'tokens'; tokens: AlphaReadTokens } | { kind: 'unsupported' } | { kind: 'failed'; reason: AlphaError };
/** Auth identity is bound by the adapter; no owner/actor parameter on any method. */
export interface AlphaRepository<Space extends AlphaSpace = ProgramPrivateSpace> {
  references?(): AlphaReferenceContext | null;
  read(): Promise<AlphaResult<AlphaAccount<Space>>>;
  execute(command: AlphaCommand): Promise<AlphaResult<AlphaReceipt>>;
  lookup(requestId: string): Promise<AlphaResult<AlphaReceipt | null>>;
  /** Tokens that came with the last successful read(), from the same server snapshot; null without. */
  readTokens?(): AlphaReadTokens | null;
  probe?(): Promise<AlphaReadProbe>;
}
export type AlphaRecovery<Space extends AlphaSpace = ProgramPrivateSpace> = { schema: 'flowme-alpha-recovery/1'; ownerId: string; confirmed: AlphaAccount<Space> | null; pending: AlphaCommand | null; draft: AlphaCommand | null; references?: AlphaReferenceContext };
export interface AlphaRecoveryPort<Space extends AlphaSpace = ProgramPrivateSpace> {
  load(ownerId: string): { ok: true; value: AlphaRecovery<Space> | null } | { ok: false };
  save(value: AlphaRecovery<Space>): boolean;
  /** Pure validation/encoding may finish elsewhere; the returned one-use commit
   * still owns the original storage preimage CAS and immediate readback. */
  prepare?(value:AlphaRecovery<Space>,identity?:import('../writing-compute').WritingIdentity):Promise<(()=>boolean)|null>;
  checkpoint?(ownerId:string):()=>boolean;
  savePrepared?(proof:import('../writing-compute').PreparedWriting):boolean;
}
export type AlphaBackup = {
  schema: typeof ALPHA_BACKUP_SCHEMA;
  account: AlphaAccount;
  references: AlphaReferenceContext;
  operations: AlphaOperation[];
  manifest: {
    ownerId: string;
    payloadSha256: string;
    files: { path: string; mediaId: string; mime: string; bytes: number; sha256: string }[];
  };
};
