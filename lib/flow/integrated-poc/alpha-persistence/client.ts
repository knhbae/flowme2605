import type { AlphaAccount, AlphaCommand, AlphaError, AlphaReceipt, AlphaRecovery, AlphaRecoveryPort, AlphaRepository, AlphaReferenceContext } from './contract';
import { canonicalJson, detached } from './json';
import { validateAlphaCommand } from './fake-server';
import { isAlphaWireCommand } from '../alpha-sync/wire';
import { createAlphaMemoryRecovery, validateAlphaRecovery } from './local-recovery';

export type AlphaClientStatus = 'signed-out' | 'ready' | 'saving' | 'saved' | 'same-location' | 'cancelled' | 'conflict' | 'session-expired' | 'checking-result' | 'recovery-required';
export const ALPHA_STATUS_COPY: Record<AlphaClientStatus, string> = {
  'signed-out': '로그인이 필요합니다', ready: '저장 준비', saving: '서버 저장 대기', saved: '저장 확인',
  'same-location': '같은 위치입니다', cancelled: '취소했습니다', conflict: '다른 기기 변경',
  'session-expired': '로그인 만료', 'checking-result': '결과 확인 중', 'recovery-required': '복구 필요',
};
export function createAlphaClient(validate: (value: unknown, ownerId: string, references?: AlphaReferenceContext) => value is AlphaAccount,
  recovery: AlphaRecoveryPort = createAlphaMemoryRecovery()) {
  let generation = 0, ownerId: string | null = null, repository: AlphaRepository | null = null;
  let state: AlphaRecovery | null = null, status: AlphaClientStatus = 'signed-out', busy = false, blocked = false;
  let lastReceipt: AlphaReceipt | null = null;
  // Transient diagnostic only: never stored in recovery or used to settle a pending request.
  let lastError: AlphaError | null = null;
  const current = (epoch: number) => generation === epoch && !!repository && !!state;
  const persist = () => {
    try { if (state && recovery.save(detached(state))) return true; } catch { /* Preserve the last durable copy. */ }
    status = 'recovery-required'; blocked = true; return false;
  };
  const fail = (reason: AlphaError) => {
    lastError = reason;
    status = reason === 'unauthenticated' ? 'session-expired' : reason === 'revision-conflict' || reason === 'undo-conflict' ? 'conflict'
      : reason === 'no-change' ? 'same-location' : 'recovery-required';
  };
  async function readCurrent(epoch: number, port: AlphaRepository, minimum = 0): Promise<boolean> {
    try {
      const result = await port.read();
      if (!current(epoch)) return false;
      if (!result.ok) { fail(result.reason); return false; }
      const references = port.references?.() ?? undefined;
      if (!validate(result.value, ownerId!, references) || result.value.revision < Math.max(minimum, state!.confirmed?.revision ?? 0)
        || (result.value.revision === state!.confirmed?.revision && canonicalJson(result.value) !== canonicalJson(state!.confirmed))
        || (state!.references?.social && (!references?.social || references.social.revision < state!.references.social.revision
          || references.social.revision === state!.references.social.revision && canonicalJson(references.public) !== canonicalJson(state!.references.public)))) {
        status = 'recovery-required'; return false;
      }
      state!.confirmed = detached(result.value);
      if (references) state!.references = detached(references); else delete state!.references;
      return persist();
    } catch { if (current(epoch)) status = state!.pending ? 'checking-result' : 'recovery-required'; return false; }
  }
  async function acceptReceipt(receipt: AlphaReceipt, command: AlphaCommand, epoch: number, port: AlphaRepository): Promise<boolean> {
    if (!current(epoch)) return false;
    if (receipt.requestId !== command.requestId || receipt.kind !== command.kind || !Number.isSafeInteger(receipt.revision)
      || receipt.revision !== command.expectedRevision + (receipt.changed ? 1 : 0) || typeof receipt.changed !== 'boolean'
      || ((command.kind === 'social' || command.kind === 'undo-social') && (!Number.isSafeInteger(receipt.publicRevision)
        || receipt.publicRevision! < command.expectedPublicRevision || receipt.publicRevision! > command.expectedPublicRevision + 1))) {
      status = 'recovery-required'; return false;
    }
    if (!await readCurrent(epoch, port, receipt.revision)) return false;
    if (!current(epoch)) return false;
    if (receipt.publicRevision !== undefined && (state!.references?.social?.revision ?? -1) < receipt.publicRevision) { status = 'recovery-required'; return false; }
    state!.pending = null; state!.draft = null;
    if (!persist()) return false;
    lastReceipt = detached(receipt);
    lastError = null;
    status = receipt.changed ? 'saved' : 'same-location'; return true;
  }
  async function send(command: AlphaCommand, epoch: number, port: AlphaRepository, replay = false): Promise<boolean> {
    try {
      const result = await port.execute(detached(command));
      if (!current(epoch)) return false;
      if (!result.ok) {
        // A retry rejection cannot settle a previous ambiguous attempt. Auth or
        // availability failure also cannot establish the original commit outcome.
        if (!replay && result.reason !== 'unauthenticated' && result.reason !== 'unavailable') state!.pending = null;
        if (!persist()) return false;
        fail(result.reason); return false;
      }
      return await acceptReceipt(result.value, command, epoch, port);
    } catch { if (current(epoch)) status = 'checking-result'; return false; }
  }
  return {
    bindSession(nextOwner: string | null, port: AlphaRepository | null) {
      generation++; ownerId = nextOwner; repository = port; state = null; busy = false; blocked = false; lastReceipt = null;
      lastError = null;
      status = 'signed-out';
      if (nextOwner === null || port === null) { repository = null; ownerId = null; return; }
      try {
        const loaded = recovery.load(nextOwner);
        if (!loaded.ok || loaded.value !== null && !validateAlphaRecovery(loaded.value, nextOwner, validate)) {
          status = 'recovery-required'; blocked = true; return;
        }
        state = detached(loaded.value ?? { schema: 'flowme-alpha-recovery/1', ownerId: nextOwner, confirmed: null, pending: null, draft: null });
        status = state.pending ? 'checking-result' : state.draft ? 'recovery-required' : 'ready';
      } catch { status = 'recovery-required'; blocked = true; }
    },
    snapshot: () => ({ ownerId, status, state: detached(state), lastReceipt: detached(lastReceipt), lastError }),
    async refresh() {
      if (!repository || !state || busy || blocked) return false;
      lastError = null;
      const epoch = generation, port = repository; busy = true;
      try {
        const ok = await readCurrent(epoch, port);
        if (ok && current(epoch)) status = state!.pending ? 'checking-result' : state!.draft ? 'conflict' : 'ready';
        return ok;
      } finally { if (current(epoch)) busy = false; }
    },
    async execute(command: AlphaCommand, options: { cancelled?: boolean } = {}) {
      if (!repository || !state || busy || blocked || state.pending) return false;
      lastError = null;
      if (options.cancelled) { status = 'cancelled'; return false; }
      if (!validateAlphaCommand(command) && !isAlphaWireCommand(command)) { status = 'recovery-required'; return false; }
      if (command.kind === 'change-private' && command.changes.length === 0) { status = 'same-location'; return false; }
      if (command.kind === 'change-private' && state.confirmed && command.expectedRevision === state.confirmed.revision
        && command.changes.every(change => Object.hasOwn(state!.confirmed!.space, change.field) === change.present
          && (!change.present || canonicalJson(state!.confirmed!.space[change.field]) === canonicalJson(change.value)))) {
        status = 'same-location'; return false;
      }
      const epoch = generation, port = repository; busy = true;
      try {
        state.pending = detached(command); state.draft = detached(command);
        if (!persist()) return false;
        status = 'saving'; return await send(command, epoch, port);
      } finally { if (current(epoch)) busy = false; }
    },
    async resolvePending(retrySameRequest = false) {
      if (!repository || !state?.pending || busy || blocked) return false;
      lastError = null;
      const epoch = generation, port = repository, command = detached(state.pending); busy = true;
      try {
        status = 'checking-result';
        const result = await port.lookup(command.requestId);
        if (!current(epoch)) return false;
        if (!result.ok) { fail(result.reason); return false; }
        if (result.value !== null) return await acceptReceipt(result.value, command, epoch, port);
        // Absence may mean an earlier request is still in flight. Only retry the identical ID/body.
        return retrySameRequest ? await send(command, epoch, port, true) : false;
      } catch { if (current(epoch)) status = 'checking-result'; return false; }
      finally { if (current(epoch)) busy = false; }
    },
  };
}
