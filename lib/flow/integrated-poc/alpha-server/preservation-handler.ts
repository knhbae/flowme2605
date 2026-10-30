import { timingSafeEqual } from 'node:crypto';
import { readAlphaAuthConfig } from '../alpha-auth/config';
import { alphaInternalMediaRequest, alphaRequestOrigin } from './request-origin';
import { createAccountBackup, validateAccountBackup, type AccountBackup } from '../alpha-preservation/backup';
import { prepareLocalImport } from '../alpha-preservation/import';
import { PRESERVATION_PROTOCOL, SEALED_BACKUP_SCHEMA, isPreservationCommand, type PreservationPreview } from '../alpha-preservation/contract';
import { BACKUP_FILE_SCHEMA, decodeBackupFile } from '../alpha-preservation/file-codec';
import { accountBackupRestoreTransportBytes } from '../alpha-preservation/transport';
import { alphaSocialReferences, readAlphaSocialResponse } from '../alpha-social/projection';
import { canonicalJson, hashJson, parseAlphaJson, sha256, detached } from '../alpha-persistence/json';
import { validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { programIdentifier, programShape } from '../program-data';
import { createAlphaMediaHandler } from './media-handler';
import { signAlphaCommand } from './command-handler';
import { privateMediaIds } from '../alpha-preservation/private-media';
import { summarizePreservationContent } from '../alpha-preservation/content-summary';
import type { AccountBackupFile } from '../alpha-preservation/backup';
import { BACKUP_DOWNLOAD_FORMAT, BACKUP_DOWNLOAD_SCHEMA, readBackupDownload } from '../alpha-preservation/backup-download';
import { encodeBackupFile } from '../alpha-preservation/file-codec';
import { alphaCapacityMode } from './capacity-adapter';
import { readCapacityM3Response } from './capacity-m3';

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Authorization' };
const result = (value: unknown) => Response.json(value, { headers });
const failure = (reason: string, status = 200) => Response.json({ ok: false, reason }, { status, headers });
async function body(request: Request): Promise<unknown> {
  const reader = request.body?.getReader(); if (!reader) throw Error('invalid');
  const chunks: Uint8Array[] = []; let bytes = 0;
  try { for (;;) { const next = await reader.read(); if (next.done) break;
    bytes += next.value.length; if (bytes > PRESERVATION_PROTOCOL.bytes) { await reader.cancel(); throw Error('limit'); } chunks.push(next.value);
  } } finally { reader.releaseLock(); }
  return parseAlphaJson(Buffer.concat(chunks).toString('utf8'));
}
const rawHash = (raw: string) => sha256(new TextEncoder().encode(raw));
const sealText = (ownerId: string, digest: string) => canonicalJson({ schema: SEALED_BACKUP_SCHEMA, ownerId, digest });
const validProof = (actual: unknown, expected: string) => typeof actual === 'string' && /^[a-f0-9]{64}$/.test(actual)
  && timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));

/** Separate writer: restores private data at CURRENT revision, never old server journals/public data. */
export function createAlphaPreservationHandler(env: Record<string, string | undefined>, fetcher: typeof fetch = fetch) {
  const config = readAlphaAuthConfig(env), key = env.FLOWME_ALPHA_M3_SIGNING_KEY, capacityMode = alphaCapacityMode(env);
  return async (request: Request): Promise<Response> => {
    if (!config || !key || !/^[a-f0-9]{64}$/.test(key) || capacityMode === null) return failure('unavailable', 503);
    const url = new URL(request.url), publicOrigin = alphaRequestOrigin(config, request);
    if (request.method !== 'POST' || !publicOrigin
      || url.search || !request.headers.get('content-type')?.startsWith('application/json')) return failure('invalid', 400);
    const authorization = request.headers.get('authorization');
    if (!authorization || !/^Bearer [A-Za-z0-9_.-]{20,8192}$/.test(authorization)) return failure('unauthenticated', 401);
    let input: Record<string, unknown>; try {
      const decoded = await body(request); if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return failure('invalid', 400);
      input = decoded as Record<string, unknown>;
    } catch { return failure('invalid', 400); }
    if (input.client !== PRESERVATION_PROTOCOL.client) return failure('unsupported-client', 409);
    const fileRequest = programShape(input, ['kind', 'client', 'format']) && input.kind === 'backup' && input.format === BACKUP_DOWNLOAD_FORMAT;
    const backupRequest = fileRequest || programShape(input, ['kind', 'client']) && input.kind === 'backup';
    const lookupRequest = programShape(input, ['kind', 'client', 'requestId']) && input.kind === 'lookup'
      && programIdentifier(input.requestId) && input.requestId.length <= 160;
    const packed = Object.hasOwn(input, 'sourceFile'), sourceKey = packed ? 'sourceFile' : 'sourceRaw';
    const previewRequest = programShape(input, ['kind', 'client', 'mode', sourceKey, 'actorId']) && input.kind === 'preview'
      && (!packed || input.mode === 'restore');
    const commitRequest = programShape(input, ['kind', 'client', 'command', sourceKey, 'actorId']) && input.kind === 'commit' && isPreservationCommand(input.command)
      && (!packed || input.command.mode === 'restore');
    if (!backupRequest && !lookupRequest && !previewRequest && !commitRequest) return failure('invalid', 400);
    const call = async (path: string, payload?: unknown) => {
      const response = await fetcher(`${config.url}${path}`, { method: payload === undefined ? 'GET' : 'POST',
        headers: { apikey: config.publishableKey, Authorization: authorization, 'Content-Type': 'application/json' },
        ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw Error(response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable');
      const reader = response.body?.getReader(); if (!reader) throw Error('unavailable');
      const chunks: Uint8Array[] = []; let bytes = 0;
      try { for (;;) { const next = await reader.read(); if (next.done) break;
        bytes += next.value.length; if (bytes > PRESERVATION_PROTOCOL.bytes) { await reader.cancel(); throw Error('limit'); } chunks.push(next.value);
      } } finally { reader.releaseLock(); }
      return parseAlphaJson(Buffer.concat(chunks).toString('utf8'));
    };
    const rpc = async (path: string, payload: unknown) => {
      const response: unknown = await call(path, payload);
      if (programShape(response, ['ok', 'reason']) && response.ok === false) throw Error(String(response.reason));
      if (!programShape(response, ['ok', 'value']) || response.ok !== true) throw Error('unavailable');
      return response.value;
    };
    try {
      const user = await call('/auth/v1/user');
      if (!user || typeof user !== 'object' || !('id' in user) || typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/.test(user.id) || 'is_anonymous' in user && user.is_anonymous) throw Error('unauthenticated');
      const owner = user.id as string;
      if (fileRequest && capacityMode === 'checkpoint-v1') {
        // One signed DB read checks the entire current snapshot and checkpoint
        // under the same locks. Do not split its freshness check across RPCs.
        const readText = canonicalJson({ schema: 'flowme-alpha-capacity-checkpoint-read/1' });
        const checkpointResponse = await fetcher(`${config.url}/rest/v1/rpc/flowme_alpha_capacity_checkpoint_read_v1`, {
          method: 'POST', headers: { apikey: config.publishableKey, Authorization: authorization, 'Content-Type': 'application/json' },
          body: JSON.stringify({ read_text: readText, proof: signAlphaCommand(owner, readText, key) }),
          cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(30_000),
        });
        if (!checkpointResponse.ok) throw Error(checkpointResponse.status === 401 || checkpointResponse.status === 403 ? 'unauthenticated' : 'unavailable');
        // The 30 MB file is JSON-string escaped; use its separate wire bound.
        const checkpoint = await readCapacityM3Response(checkpointResponse);
        if (!programShape(checkpoint, ['ok', 'value']) || checkpoint.ok !== true) throw Error('unavailable');
        if (checkpoint.value !== null) {
          const checked = await readBackupDownload(checkpoint.value, owner);
          if (!validProof(checked.proof, signAlphaCommand(owner, sealText(owner, checked.backup.integrity.payloadSha256), key))) throw Error('invalid-backup');
          return result({ ok: true, value: { schema: BACKUP_DOWNLOAD_SCHEMA, file: checked.file } });
        }
        // Only authoritative absence/staleness permits a fresh backup. A lost,
        // malformed, corrupt or missing checkpoint RPC never silently falls back.
      }
      // Authenticate before bounded decompression. Only restore accepts this
      // transport; original bytes still pass every owner/integrity/seal check.
      if (packed) {
        try {
          if (typeof input.sourceFile !== 'string') return failure('invalid-backup');
          const wrapper = parseAlphaJson(input.sourceFile);
          if (!wrapper || typeof wrapper !== 'object' || !('schema' in wrapper) || wrapper.schema !== BACKUP_FILE_SCHEMA) return failure('invalid-backup');
          const sourceRaw = await decodeBackupFile(input.sourceFile);
          const { sourceFile: _sourceFile, ...rest } = input; input = { ...rest, sourceRaw };
        } catch { return failure('invalid-backup'); }
      }
      if (lookupRequest) return result(await call('/rest/v1/rpc/flowme_alpha_lookup_v1', { request_id: (input as { requestId: string }).requestId }));
      const readText = canonicalJson({ schema: 'flowme-alpha-preservation-read/1' });
      const read = async () => {
        const value = await rpc('/rest/v1/rpc/flowme_alpha_preservation_read_v1', { read_text: readText, proof: signAlphaCommand(owner, readText, key) });
        if (!programShape(value, ['account', 'context', 'operations', 'importArchives']) || !Array.isArray(value.operations) || !Array.isArray(value.importArchives)) throw Error('invalid');
        const parsed = readAlphaSocialResponse({ ok: true, value: { account: value.account, context: value.context } }, owner);
        if (!parsed) throw Error('invalid');
        return { ...parsed, operations: value.operations, importArchives: value.importArchives };
      };
      const current = await read(), references = alphaSocialReferences(current.context, owner);
      const mediaHandler = createAlphaMediaHandler(env, fetcher);
      const media = async (id: string) => {
        const response = await mediaHandler(alphaInternalMediaRequest(publicOrigin, id, authorization, !!config.hosting));
        if (!response.ok) throw Error(response.status === 404 || response.status === 400 ? 'missing-file' : response.status === 401 || response.status === 403 ? 'unauthenticated' : 'unavailable');
        return { mime: response.headers.get('content-type') ?? '', bytes: new Uint8Array(await response.arrayBuffer()) };
      };
      if (backupRequest) {
        const backup = await createAccountBackup({ account: current.account, references, operations: current.operations,
          importArchives: current.importArchives, createdAt: new Date().toISOString() }, media);
        // Account/public/archive/journal changes while bytes are read invalidate the whole download.
        const fresh = await read();
        if (await hashJson(fresh) !== await hashJson(current)) return failure('revision-conflict');
        const sealed = { schema: SEALED_BACKUP_SCHEMA, backup,
          proof: signAlphaCommand(owner, sealText(owner, backup.integrity.payloadSha256), key) };
        // Request-local bytes only; never cache across owners or snapshots.
        const sealedRaw = canonicalJson(sealed);
        if ((await accountBackupRestoreTransportBytes(sealedRaw)).bytes > PRESERVATION_PROTOCOL.bytes) return failure('limit');
        if (fileRequest) return result({ ok: true, value: { schema: BACKUP_DOWNLOAD_SCHEMA, file: await encodeBackupFile(sealedRaw) } });
        return result({ ok: true, value: sealed });
      }
      const source = input as { sourceRaw: unknown; actorId: unknown; mode?: unknown; command?: unknown };
      if (typeof source.sourceRaw !== 'string' || typeof source.actorId !== 'string') return failure('invalid', 400);
      const mode = commitRequest ? (source.command as { mode: string }).mode : source.mode;
      if (mode !== 'import' && mode !== 'restore') return failure('invalid', 400);
      let next = detached(current.account), archive: { sourceRaw: string; actorId: string } | null = null;
      let sourceSha256 = await rawHash(source.sourceRaw), createdAt: string | null = null, warnings: string[] = [], details: string[] = [];
      let restored: AccountBackup | null = null;
      if (mode === 'import') {
        const prior = current.importArchives.find((value): value is { owner_id: string; source_sha256: string; source_raw: string; source_actor_id: string } =>
          !!value && typeof value === 'object' && 'owner_id' in value && value.owner_id === owner && 'source_sha256' in value && value.source_sha256 === sourceSha256
          && 'source_raw' in value && value.source_raw === source.sourceRaw && 'source_actor_id' in value && value.source_actor_id === source.actorId);
        if (prior) {
          archive = { sourceRaw: prior.source_raw, actorId: prior.source_actor_id };
          if (commitRequest && isPreservationCommand(source.command) && source.command.sourceSha256 === sourceSha256) {
            const commitText = canonicalJson({ schema: 'flowme-alpha-preservation-commit/1', command: source.command, space: current.account.space, archive });
            return result(await call('/rest/v1/rpc/flowme_alpha_preservation_execute_v1', { commit_text: commitText, proof: signAlphaCommand(owner, commitText, key) }));
          }
          warnings = ['already-applied'];
        } else {
        const prepared = await prepareLocalImport(source.sourceRaw, source.actorId, current.account, references);
        if (prepared.ok) {
          next = prepared.account; archive = { sourceRaw: prepared.archive.sourceRaw, actorId: prepared.archive.actorId };
          sourceSha256 = prepared.sourceSha256; warnings = prepared.warnings;
          // Client must send only the selected, sanitized private source; never other actors' private spaces.
          if (source.sourceRaw !== archive.sourceRaw) return failure('selection-required');
        } else details = prepared.details.length ? prepared.details : [prepared.reason];
        }
      } else {
        const sealed = parseAlphaJson(source.sourceRaw);
        if (!programShape(sealed, ['schema', 'backup', 'proof']) || sealed.schema !== SEALED_BACKUP_SCHEMA) return failure('invalid-backup');
        const checked = await validateAccountBackup(canonicalJson(sealed.backup), owner);
        if (!checked.ok || !validProof(sealed.proof, signAlphaCommand(owner, sealText(owner, checked.value.integrity.payloadSha256), key))) return failure('invalid-backup');
        restored = checked.value; createdAt = restored.createdAt;
        next.space = detached(restored.account.space);
        if (!validateAlphaAccount(next, references, owner)) details.push('현재 서버에서 확인할 수 없는 공개 관계가 있습니다. 원본 백업을 보관해 주세요.');
        warnings = ['현재 개인공간을 선택한 백업 시점으로 복원합니다. 현재 내용을 먼저 백업해 주세요.',
          '공개 게시물·공개 판본·타인의 자료와 과거 서버 이력은 되돌리지 않습니다.'];
      }
      // A completed request remains queryable even when files later disappear.
      if (commitRequest && isPreservationCommand(source.command) && source.command.sourceSha256 === sourceSha256) {
        const existing = await rpc('/rest/v1/rpc/flowme_alpha_lookup_v1', { request_id: source.command.requestId });
        if (existing !== null) {
          const commitText = canonicalJson({ schema: 'flowme-alpha-preservation-commit/1', command: source.command, space: current.account.space, archive });
          return result(await call('/rest/v1/rpc/flowme_alpha_preservation_execute_v1', { commit_text: commitText, proof: signAlphaCommand(owner, commitText, key) }));
        }
      }
      const files: AccountBackupFile[] = [];
      if (restored && details.length === 0) {
        const privateIds = privateMediaIds(next.space);
        for (const file of restored.files.filter(file => privateIds.has(file.id))) {
          try {
            const actual = await media(file.id);
            if (actual.mime !== file.mime || actual.bytes.length !== file.bytes || await sha256(actual.bytes) !== file.sha256) return failure('missing-file');
          } catch (error) {
            if (!(error instanceof Error) || error.message !== 'missing-file') throw error;
            files.push(file);
          }
        }
        if (files.length) {
          const checkText = canonicalJson({ schema: 'flowme-alpha-private-media-check/1', files });
          await rpc('/rest/v1/rpc/flowme_alpha_preserved_media_check_v1', { check_text: checkText, proof: signAlphaCommand(owner, checkText, key) });
          warnings.push('백업에 포함된 본인 사진을 개인공간에 함께 복원합니다. 공개 게시에 쓰려면 사진을 다시 첨부해 주세요.');
        }
      }
      const same = canonicalJson(next.space) === canonicalJson(current.account.space) && files.length === 0;
      const preview: PreservationPreview = { ownerId: owner, mode, sourceSha256, expectedRevision: current.account.revision,
        expectedPublicRevision: current.context.revision, canApply: details.length === 0 && !same, same: details.length === 0 && same, createdAt,
        documents: Array.isArray(next.space.text.documents) ? next.space.text.documents.length : Object.keys(next.space.text.documents).length,
        savedFlows: next.space.savedBindings.length, warnings, details,
        content: { current: summarizePreservationContent(current.account.space), next: summarizePreservationContent(next.space) } };
      if (previewRequest) return result({ ok: true, value: preview });
      if (!isPreservationCommand(source.command) || source.command.sourceSha256 !== sourceSha256) return failure('invalid');
      const command = source.command;
      // Receipt lookup precedes recomputation conflicts. It never replays stale patches.
      if (command.expectedRevision !== current.account.revision || command.expectedPublicRevision !== current.context.revision) return failure('revision-conflict');
      if (details.length) return failure('unresolved');
      if (same) return failure('no-change');
      const commitText = canonicalJson({ schema: files.length ? 'flowme-alpha-preservation-commit/2' : 'flowme-alpha-preservation-commit/1',
        command, space: next.space, archive, ...(files.length ? { files } : {}) });
      return result(await call(`/rest/v1/rpc/flowme_alpha_preservation_execute_v${files.length ? 2 : 1}`, { commit_text: commitText, proof: signAlphaCommand(owner, commitText, key) }));
    } catch (error) {
      const reason = error instanceof Error ? ['alpha-too-large', 'backup-file-limit', 'preservation-request-limit'].includes(error.message) ? 'limit' : error.message : '';
      return failure(['invalid', 'unauthenticated', 'not-found', 'revision-conflict', 'idempotency-conflict', 'no-change', 'missing-file', 'limit'].includes(reason) ? reason : 'unavailable');
    }
  };
}
