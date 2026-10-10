import { programIdentifier, programShape } from '../program-data';
import type { PreservationContentSummary } from './content-summary';

/** Replaceable DEV protocol; neither a retention promise nor an operational SLA. */
export const PRESERVATION_PROTOCOL = Object.freeze({ schema: 'flowme-alpha-preservation-command/1', client: 1, bytes: 30_000_000 });
export const SEALED_BACKUP_SCHEMA = 'flowme-alpha-sealed-account-backup/1' as const;
/** The 30 MB cap applies to the encoded request, not just the selected file.
 * Reserve a complete restore command, including the largest supported request
 * ID and revisions plus the standard client's empty/UUID actor ID. Request IDs
 * allow arbitrary UTF-16: each code unit can require six JSON escape bytes.
 * JSON escaping is measured exactly; no smaller arbitrary file cap is imposed.
 */
export function accountBackupRestoreRequestBytes(sourceRaw: string): number {
  return new TextEncoder().encode(JSON.stringify({kind:'commit',client:PRESERVATION_PROTOCOL.client,
    command:{schema:PRESERVATION_PROTOCOL.schema,kind:'preservation',requestId:'\u0000'.repeat(160),
      expectedRevision:Number.MAX_SAFE_INTEGER,expectedPublicRevision:Number.MAX_SAFE_INTEGER,
      mode:'restore',sourceSha256:'a'.repeat(64)},sourceRaw,actorId:'a'.repeat(36)})).byteLength;
}
export type PreservationCommand = { schema: typeof PRESERVATION_PROTOCOL.schema; kind: 'preservation'; requestId: string;
  expectedRevision: number; expectedPublicRevision: number; mode: 'import' | 'restore'; sourceSha256: string };
export type PreservationPreview = { ownerId: string; mode: 'import' | 'restore'; sourceSha256: string;
  expectedRevision: number; expectedPublicRevision: number; canApply: boolean; same: boolean; createdAt: string | null;
  documents: number; savedFlows: number; warnings: string[]; details: string[];
  content?: { current: PreservationContentSummary; next: PreservationContentSummary } };
export function isPreservationCommand(value: unknown): value is PreservationCommand {
  return programShape(value, ['schema', 'kind', 'requestId', 'expectedRevision', 'expectedPublicRevision', 'mode', 'sourceSha256'])
    && value.schema === PRESERVATION_PROTOCOL.schema && value.kind === 'preservation'
    && programIdentifier(value.requestId) && value.requestId.length <= 160
    && Number.isSafeInteger(value.expectedRevision) && (value.expectedRevision as number) >= 0
    && Number.isSafeInteger(value.expectedPublicRevision) && (value.expectedPublicRevision as number) >= 0
    && ['import', 'restore'].includes(String(value.mode)) && typeof value.sourceSha256 === 'string' && /^[a-f0-9]{64}$/.test(value.sourceSha256);
}
