import type { ProgramEnvelope, ProgramHistory, ProgramPrivateSpace, ProgramPublicRepository, ProgramRequestReceipt } from '../contract';
import type { AlphaCreatorCommand } from '../alpha-creator/contract';
import type { AlphaSocialCommand } from '../alpha-social/contract';

/** M1 compatibility contract, not a deployed API or an authentication provider. */
export const ALPHA_SCHEMA = 'flowme-alpha-account/1' as const;
export const ALPHA_COMMAND_SCHEMA = 'flowme-alpha-command/1' as const;
export const ALPHA_BACKUP_SCHEMA = 'flowme-alpha-backup/1' as const;
export const ALPHA_LOCAL_PREFIX = 'flow:poc:personal-workspace:v1:alpha-m1:';
export const ALPHA_LIMITS = Object.freeze({ bytes: 30_000_000, depth: 120, requestIdChars: 160 });

export type AlphaAccount = {
  schema: typeof ALPHA_SCHEMA;
  ownerId: string;
  revision: number;
  source: { schema: ProgramEnvelope['schema']; actorId: string; revision: number };
  space: ProgramPrivateSpace;
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
} & ({ kind: 'change-private'; changes: AlphaChange[] } | { kind: 'undo-private'; operationId: string });
export type AlphaCreatorUndoCommand = { schema: 'flowme-alpha-creator-command/1'; kind: 'undo-creator'; requestId: string; expectedRevision: number; operationId: string };
export type AlphaSocialUndoCommand = { schema: 'flowme-alpha-social-command/1'; kind: 'undo-social'; requestId: string; expectedRevision: number; expectedPublicRevision: number; operationId: string };
export type AlphaCommand = AlphaPrivateCommand | AlphaCreatorCommand | AlphaCreatorUndoCommand | AlphaSocialCommand | AlphaSocialUndoCommand;
export type AlphaReceipt = { requestId: string; revision: number; changed: boolean; kind: AlphaCommand['kind']; resultId?: string; publicRevision?: number };
/** Server/offline backup only; never part of read()/lookup() responses. */
export type AlphaOperation = { fingerprint: string; receipt: AlphaReceipt; inverse: AlphaChange[]; undone: boolean };
export type AlphaError = 'invalid' | 'unauthenticated' | 'not-found' | 'revision-conflict' | 'idempotency-conflict' | 'undo-conflict' | 'unavailable' | 'no-change' | 'rate-limited' | 'limit';
export type AlphaResult<T> = { ok: true; value: T } | { ok: false; reason: AlphaError };
/** Auth identity is bound by the adapter; no owner/actor parameter on any method. */
export interface AlphaRepository {
  references?(): AlphaReferenceContext | null;
  read(): Promise<AlphaResult<AlphaAccount>>;
  execute(command: AlphaCommand): Promise<AlphaResult<AlphaReceipt>>;
  lookup(requestId: string): Promise<AlphaResult<AlphaReceipt | null>>;
}
export type AlphaRecovery = { schema: 'flowme-alpha-recovery/1'; ownerId: string; confirmed: AlphaAccount | null; pending: AlphaCommand | null; draft: AlphaCommand | null; references?: AlphaReferenceContext };
export interface AlphaRecoveryPort {
  load(ownerId: string): { ok: true; value: AlphaRecovery | null } | { ok: false };
  save(value: AlphaRecovery): boolean;
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
