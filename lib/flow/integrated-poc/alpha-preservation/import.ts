import type { AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import { ALPHA_BACKUP_SCHEMA } from '../alpha-persistence/contract';
import { canonicalJson, detached, parseAlphaJson, sha256 } from '../alpha-persistence/json';
import { captureAlphaAccount, materializeAccount, validateAlphaAccount } from '../alpha-persistence/program-adapter';
import { restoreAlphaBackup } from '../alpha-persistence/backup';
import { createProgramPrivateSpace, validateProgramEnvelope } from '../program-data';
import { loadProgramStore } from '../program-store';
import type { ProgramPrivateSpace } from '../contract';
import { textWorkspaceModel as M } from '../text-workspace';
import { mapCreatorNativeSourceOwner } from '../creator-native-source-update';

export type LocalImportArchive = { schema: 'flowme-alpha-import-archive/1'; sourceRaw: string; actorId: string };
export type LocalImportResult = { ok: true; sourceSha256: string; account: AlphaAccount; archive: LocalImportArchive;
  summary: { documents: number; tasks: number; savedFlows: number; creatorDrafts: number }; warnings: string[] }
  | { ok: false; reason: string; details: string[] };
const fail = (reason: string, ...details: string[]): LocalImportResult => ({ ok: false, reason, details });
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);

/** Browser-only source selection preview; returns names/IDs, never another actor's content. */
export async function inspectLocalImportActors(raw: string): Promise<{ ok: true; actors: { id: string; name: string }[] } | { ok: false; reason: string }> {
  try {
    const value = parseAlphaJson(raw);
    if (value && typeof value === 'object' && 'schema' in value && value.schema === ALPHA_BACKUP_SCHEMA) {
      const owner = (value as { account?: { ownerId?: unknown } }).account?.ownerId;
      if (typeof owner !== 'string') return { ok: false, reason: 'invalid-source' };
      const restored = await restoreAlphaBackup(raw, owner);
      return restored.ok ? { ok: true, actors: [{ id: restored.account.source.actorId, name: restored.account.source.actorId }] } : { ok: false, reason: 'invalid-source' };
    }
    const loaded = loadProgramStore({ getItem: () => raw }, validateProgramEnvelope);
    return loaded.kind === 'ready' ? { ok: true, actors: loaded.envelope.data.actors.map(({ id, name }) => ({ id, name })) } : { ok: false, reason: 'invalid-source' };
  } catch { return { ok: false, reason: 'invalid-source' }; }
}

/** Only explicitly owned identity slots change. Original text/native provenance is never rewritten. */
function mapOwner(space: ProgramPrivateSpace, selectedActorId: string, actorId: string): ProgramPrivateSpace {
  const next = detached(space);
  for (const entry of Object.values(next.creatorWorkspace?.sourceUpdateSessions ?? {})) {
    const mapped = mapCreatorNativeSourceOwner(entry.session, selectedActorId, actorId);
    if (!mapped.ok) throw Error('source-session-owner-mapping-required');
    entry.session = mapped.value;
  }
  for (const owner of Object.values(next.recurrencePlans?.owners ?? {})) owner.actorId = actorId;
  return next;
}

/** Pure preview: no browser reads, writes, publication, or owner inference. */
export async function prepareLocalImport(raw: string, actorId: string, target: AlphaAccount, references: AlphaReferenceContext): Promise<LocalImportResult> {
  try {
    if (!validateAlphaAccount(target, references)) return fail('invalid-target', '현재 계정 자료를 검증하지 못했습니다.');
    const value = parseAlphaJson(raw);
    let selected: ReturnType<typeof captureAlphaAccount>;
    let selectedBackupRaw: string | null = null;
    if (value && typeof value === 'object' && 'schema' in value && value.schema === ALPHA_BACKUP_SCHEMA) {
      const owner = (value as { account?: { ownerId?: unknown } }).account?.ownerId;
      if (typeof owner !== 'string') return fail('invalid-source', '백업 소유 식별자가 없습니다.');
      const restored = await restoreAlphaBackup(raw, owner);
      if (!restored.ok || restored.account.source.actorId !== actorId) return fail('invalid-source', '백업 또는 선택한 원본 사용자를 검증하지 못했습니다.');
      selected = { account: restored.account, references: restored.references };
      // M1 backup is already one-account scoped; retain its operation journal and exact bytes too.
      selectedBackupRaw = raw;
    } else {
      // Also expands the existing program-store shared Undo representation.
      const loaded = loadProgramStore({ getItem: () => raw }, validateProgramEnvelope);
      if (loaded.kind !== 'ready') return fail('invalid-source', '지원하지 않거나 손상된 통합 PoC 자료입니다.');
      selected = captureAlphaAccount(loaded.envelope, actorId, actorId);
    }
    // Foreign spaces and their Undo/receipts never cross the account boundary.
    const sourceRaw = selectedBackupRaw ?? canonicalJson(materializeAccount(selected.account, selected.references));
    const archive: LocalImportArchive = { schema: 'flowme-alpha-import-archive/1', sourceRaw, actorId };
    const account = detached(target);
    account.space = mapOwner(selected.account.space, actorId, target.source.actorId);
    // Historical source Undo/receipts remain evidence in the archive, never live commands.
    // Validate the full graph against authoritative service references, never import local public rows.
    if (!validateAlphaAccount(account, references, target.ownerId)) return fail('unmapped-reference',
      '선택 자료의 공개 판본·사본·제안 또는 소유 연결을 현재 서비스에 그대로 연결할 수 없습니다.',
      '원본을 수정하거나 공개하지 않았습니다. 연결이 해결되기 전에는 전체 적용을 하지 않습니다.');
    const unchanged = same(account.space, target.space);
    if (!unchanged && !same(target.space, createProgramPrivateSpace())) {
      return fail('destination-not-empty', '현재 계정에 자료가 있어 자동으로 합치거나 덮어쓰지 않습니다.', '빈 개인공간에 적용하거나 명시 병합 계약이 필요합니다.');
    }
    return { ok: true, account, archive, sourceSha256: await sha256(new TextEncoder().encode(sourceRaw)),
      summary: { documents: account.space.text.documents.length + account.space.text.flows.length, tasks: M.tasks(account.space.text).length,
        savedFlows: account.space.savedBindings.length, creatorDrafts: Object.keys(account.space.creatorWorkspace?.library.records ?? {}).length },
      warnings: unchanged ? ['already-applied'] : ['local-public-evidence-not-published',
        ...(Object.keys(account.space.creatorWorkspace?.importedWorkingCandidates?.candidates??{}).length
          ? [`미저장·복구 원문 ${Object.keys(account.space.creatorWorkspace!.importedWorkingCandidates!.candidates).length}개를 별도로 보관합니다. 가져온 뒤 제작 초안 목록에서 선택할 수 있습니다. 이전 앱은 이 자료를 지원하지 않습니다.`] : []),
        ...(Object.values(account.space.creatorWorkspace?.sourceUpdateSessions??{}).some(entry=>entry.session.version===2)
          ? ['원본 비교 이력의 식별자와 결정은 보존하고, 선택한 원본 사용자의 작업 권한을 이 계정에 연결합니다. 이 자료는 이전 앱에서 열 수 없습니다.'] : [])] };
  } catch (error) {
    if (error instanceof Error && error.message === 'source-session-owner-mapping-required') return fail('owner-mapping-required', '이미 결정하거나 적용한 native 원본 비교 이력은 소유권 매핑 검토가 필요합니다. 원본을 변경하지 않았습니다.');
    return fail('invalid-source', '자료 형식·크기·선택 사용자 또는 원본 식별자를 검증하지 못했습니다.');
  }
}
