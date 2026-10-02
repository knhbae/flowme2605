import type { AlphaAccount, AlphaCommand, AlphaError, AlphaReceipt, AlphaRecovery, AlphaRecoveryPort, AlphaRepository, AlphaReferenceContext } from './contract';
import { canonicalJson, detached } from './json';
import { validateAlphaCommand } from './fake-server';
import { isAlphaWireCommand, isAlphaWireReceipt } from '../alpha-sync/wire';
import { createAlphaMemoryRecovery, validateAlphaRecovery } from './local-recovery';
import { programShape } from '../program-data';

const nativeHandoff = (command: AlphaCommand | null | undefined) => command?.kind === 'creator' && command.intent.type === 'native-handoff';
const nativeRetryBody = (command: AlphaCommand) => {
  const { requestId: _requestId, ...body } = command;
  return canonicalJson(body);
};
type NativeHandoffRejection = { requestId: string; body: string; confirmed: string; references: string };
const nativeRejectionReasons: AlphaError[] = ['invalid', 'unauthenticated', 'not-found', 'revision-conflict', 'idempotency-conflict', 'undo-conflict', 'unavailable', 'no-change', 'rate-limited', 'limit'];
function knownNativeResponse(value: unknown): boolean {
  try {
    canonicalJson(value);
    return programShape(value, ['ok', 'reason']) && value.ok === false && nativeRejectionReasons.includes(value.reason as AlphaError)
      || programShape(value, ['ok', 'value']) && value.ok === true && isAlphaWireReceipt(value.value);
  } catch { return false; }
}

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
  // Only this session's definitive execute rejection permits replacing its draft.
  // A read error or a reloaded draft is not evidence that an earlier write failed.
  let rejectedDraftRequestId: string | null = null;
  // Not a general creator retry: exact native selection after a definitive limit,
  // bound to this session and pre-rejection bytes. Never persisted or recovered.
  let rejectedNativeHandoff: NativeHandoffRejection | null = null;
  const retryableRejectedDraft = () => !!repository && !busy && !blocked && !state?.pending
    && state?.draft?.kind === 'change-private' && !!state.confirmed
    && state.draft.expectedRevision === state.confirmed.revision
    && state.draft.requestId === rejectedDraftRequestId
    && (lastError === 'invalid' || lastError === 'limit');
  const matchesNativeRejection = (proof: NativeHandoffRejection) => {
    try {
      return !!repository && !blocked && !state?.pending && nativeHandoff(state?.draft) && !!state?.confirmed
        && state.draft!.requestId === proof.requestId && state.draft!.expectedRevision === state.confirmed.revision
        && nativeRetryBody(state.draft!) === proof.body && canonicalJson(state.confirmed) === proof.confirmed
        && canonicalJson(state.references ?? null) === proof.references
        && (!repository.references || canonicalJson(repository.references()) === proof.references);
    } catch { return false; }
  };
  const retryableNativeHandoff = () => {
    if (!rejectedNativeHandoff || busy) return false;
    if (lastError !== 'limit' || !matchesNativeRejection(rejectedNativeHandoff)) {
      rejectedNativeHandoff = null; return false;
    }
    return true;
  };
  const canRetryNativeHandoff = (command: AlphaCommand) => {
    try {
      return retryableNativeHandoff() && nativeHandoff(command) && isAlphaWireCommand(command)
        && command.requestId !== rejectedNativeHandoff!.requestId && nativeRetryBody(command) === rejectedNativeHandoff!.body;
    } catch { return false; }
  };
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
      const nativeBaseline = !replay && nativeHandoff(command) && state!.confirmed
        && command.expectedRevision === state!.confirmed.revision ? { requestId: command.requestId, body: nativeRetryBody(command),
          confirmed: canonicalJson(state!.confirmed), references: canonicalJson(state!.references ?? null) } : null;
      const result = await port.execute(detached(command));
      if (!current(epoch)) return false;
      if (nativeHandoff(command) && !knownNativeResponse(result)) { status = 'checking-result'; return false; }
      if (!result.ok) {
        // A retry rejection cannot settle a previous ambiguous attempt. Auth or
        // availability failure also cannot establish the original commit outcome.
        if (!replay && result.reason !== 'unauthenticated' && result.reason !== 'unavailable') state!.pending = null;
        if (!persist()) return false;
        fail(result.reason);
        if (!replay && command.kind === 'change-private' && (result.reason === 'invalid' || result.reason === 'limit')) rejectedDraftRequestId = command.requestId;
        if (nativeBaseline && result.reason === 'limit' && matchesNativeRejection(nativeBaseline)) rejectedNativeHandoff = nativeBaseline;
        return false;
      }
      return await acceptReceipt(result.value, command, epoch, port);
    } catch { if (current(epoch)) status = 'checking-result'; return false; }
  }
  return {
    bindSession(nextOwner: string | null, port: AlphaRepository | null) {
      generation++; ownerId = nextOwner; repository = port; state = null; busy = false; blocked = false; lastReceipt = null;
      lastError = null; rejectedDraftRequestId = null; rejectedNativeHandoff = null;
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
    snapshot: () => ({ ownerId, status, state: detached(state), lastReceipt: detached(lastReceipt), lastError,
      retryableRejectedDraft: retryableRejectedDraft(), retryableNativeHandoff: retryableNativeHandoff() }),
    async refresh() {
      if (!repository || !state || busy || blocked) return false;
      const rejected = retryableRejectedDraft() ? { requestId: rejectedDraftRequestId, error: lastError,
        confirmed: canonicalJson(state.confirmed), references: canonicalJson(state.references ?? null) } : null;
      const nativeRejected = retryableNativeHandoff() ? rejectedNativeHandoff : null;
      lastError = null; rejectedDraftRequestId = null; rejectedNativeHandoff = null;
      const epoch = generation, port = repository; busy = true;
      try {
        const ok = await readCurrent(epoch, port);
        if (ok && current(epoch)) {
          // Polling may confirm the exact pre-rejection baseline. Preserve only
          // the live rejection proof, never infer it from a recovered draft.
          if (rejected && !state!.pending && state!.draft?.kind === 'change-private'
            && state!.draft.requestId === rejected.requestId && state!.draft.expectedRevision === state!.confirmed?.revision
            && canonicalJson(state!.confirmed) === rejected.confirmed
            && canonicalJson(state!.references ?? null) === rejected.references) {
            lastError = rejected.error; rejectedDraftRequestId = rejected.requestId; status = 'recovery-required';
          } else if (nativeRejected && matchesNativeRejection(nativeRejected)) {
            lastError = 'limit'; rejectedNativeHandoff = nativeRejected; status = 'recovery-required';
          } else status = state!.pending ? 'checking-result' : state!.draft ? 'conflict' : 'ready';
        }
        return ok;
      } finally { if (current(epoch)) busy = false; }
    },
    async execute(command: AlphaCommand, options: { cancelled?: boolean; retryRejectedDraft?: boolean; retryNativeHandoff?: boolean } = {}) {
      if (!repository || !state || busy || blocked || state.pending) return false;
      if (options.retryNativeHandoff && (options.retryRejectedDraft || !canRetryNativeHandoff(command))) return false;
      if (nativeHandoff(state.draft) && !options.retryNativeHandoff) return false;
      if (options.retryRejectedDraft && (!retryableRejectedDraft() || command.kind !== 'change-private'
        || command.expectedRevision !== state.confirmed?.revision || command.requestId === state.draft?.requestId)) return false;
      lastError = null; rejectedDraftRequestId = null; rejectedNativeHandoff = null;
      if (options.cancelled) { status = 'cancelled'; return false; }
      if (!validateAlphaCommand(command) && !isAlphaWireCommand(command)) { status = 'recovery-required'; return false; }
      if (command.kind === 'change-private' && (command.changes.length === 0 || state.confirmed && command.expectedRevision === state.confirmed.revision
        && command.changes.every(change => Object.hasOwn(state!.confirmed!.space, change.field) === change.present
          && (!change.present || canonicalJson(state!.confirmed!.space[change.field]) === canonicalJson(change.value))))) {
        if (options.retryRejectedDraft) {
          const previous = state; state = { ...state, draft: null };
          if (!persist()) { state = previous; return false; }
        }
        status = 'same-location'; return false;
      }
      const epoch = generation, port = repository; busy = true;
      try {
        const previous = options.retryRejectedDraft || options.retryNativeHandoff ? detached(state) : null;
        state.pending = detached(command); state.draft = detached(command);
        if (!persist()) { if (previous) state = previous; return false; }
        status = 'saving'; return await send(command, epoch, port);
      } finally { if (current(epoch)) busy = false; }
    },
    async resolvePending(retrySameRequest = false) {
      if (!repository || !state?.pending || busy || blocked) return false;
      lastError = null; rejectedDraftRequestId = null; rejectedNativeHandoff = null;
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
