import {
  PERSONAL_WORKSPACE_POC_AUTHORING_DRAFT_KEY as DRAFT_KEY,
  loadPersonalWorkspacePocAuthoringDraft,
  restorePersonalWorkspacePocAuthoringDraftBytes,
  savePersonalWorkspacePocAuthoringDraft,
  type PersonalWorkspacePocAuthoringDraft,
} from './personal-workspace-poc-storage';

/**
 * Replaceable React-only PoC contract. No persistent schema/key is introduced.
 *
 * create({storage, read}) -> prepare(input) / cancel(ticket) / commit(ticket).
 * `read` is a trusted CURRENT I/O boundary, not a caller permission flag. Its
 * exact own-data packet is {ok:true, scopeBinding, documentId, draftRaw}.
 * scopeBinding MUST bind all non-draft source/target/model/library bytes AND a
 * monotonic external-observation generation. An own candidate draft write does
 * not change that scopeBinding; observed foreign ABA/document changes do.
 * UI must preserve this ownership across RAF/unmount and recheck before adopt.
 *
 * prepare receives the editor's previously KNOWN OWN bytes separately from the
 * fresh read. It must never rebase A onto an externally discovered draft X.
 * Only successful commit exposes B. B contains version/rawText only (React has
 * no standalone draftId). Exact same bytes are success changed:false/write:0.
 *
 * Actual shared save/guarded restore run behind one-key, phase-aware storage.
 * Its blind internal rollback cannot overwrite an OBSERVED foreign value. This
 * is not atomic localStorage CAS; arbitrary inter-process read/set races cannot
 * be made linearizable here. Unknown post-write ownership locks this factory.
 * No reset/unlock/blank-clear API; authoritative recovery belongs to the caller.
 * apiCalls count underlying invocations including throws, not successful byte
 * changes. readCalls count boundary callbacks; their I/O is caller-instrumented.
 */
export const PERSONAL_WORKSPACE_POC_ENTRY_AUTHORING_TRANSITION_VERSION = 1 as const;
export const PERSONAL_WORKSPACE_POC_ENTRY_AUTHORING_TRANSITION_CONTRACT = 'flowme-react-entry-authoring-transition-v1' as const;

export type PersonalWorkspacePocEntryAuthoringRead = Readonly<{
  ok: true;
  scopeBinding: string;
  documentId: string;
  draftRaw: string | null;
}>;
export type PersonalWorkspacePocEntryAuthoringPrepare = Readonly<{
  rawText: string;
  expectedOwnedDraftRaw: string | null;
  expectedScopeBinding: string;
  expectedDocumentId: string;
}>;
export type PersonalWorkspacePocEntryAuthoringTicket = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_ENTRY_AUTHORING_TRANSITION_VERSION;
  contract: typeof PERSONAL_WORKSPACE_POC_ENTRY_AUTHORING_TRANSITION_CONTRACT;
}>;
export type PersonalWorkspacePocEntryAuthoringCounts = Readonly<{
  getItem: number;
  setItem: number;
  removeItem: number;
  candidateSetCalls: number;
  rollbackSetCalls: number;
  rollbackRemoveCalls: number;
  rollbackDenied: number;
  readCalls: number;
}>;
type FailureStatus = 'failed' | 'stale' | 'recovery-required';
type Failure = Readonly<{
  status: FailureStatus;
  reason: string;
  rollback: 'not-needed' | 'complete' | 'recovery-required';
  apiCalls: PersonalWorkspacePocEntryAuthoringCounts;
}>;
export type PersonalWorkspacePocEntryAuthoringResult = Failure | Readonly<{
  status: 'ready'; ticket: PersonalWorkspacePocEntryAuthoringTicket; replacesDraft: boolean;
}> | Readonly<{ status: 'canceled' }> | Readonly<{
  status: 'success';
  draft: PersonalWorkspacePocAuthoringDraft;
  serialized: string;
  previous: string | null;
  changed: boolean;
  targetWriteCount: 0 | 1;
  apiCalls: PersonalWorkspacePocEntryAuthoringCounts;
}>;
export type PersonalWorkspacePocEntryAuthoringTransition = Readonly<{
  prepare: (input: PersonalWorkspacePocEntryAuthoringPrepare) => PersonalWorkspacePocEntryAuthoringResult;
  cancel: (ticket: PersonalWorkspacePocEntryAuthoringTicket) => PersonalWorkspacePocEntryAuthoringResult;
  commit: (ticket: PersonalWorkspacePocEntryAuthoringTicket) => PersonalWorkspacePocEntryAuthoringResult;
}>;
type Config = Readonly<{
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  read: () => unknown;
}>;
type Data = Record<string, unknown>;
type Captured = Readonly<{
  packet: PersonalWorkspacePocEntryAuthoringRead;
  candidate: PersonalWorkspacePocAuthoringDraft;
  serialized: string;
}>;
const own = (value: object, key: PropertyKey) => Object.prototype.hasOwnProperty.call(value, key);
const nonblank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const nullable = (value: unknown): value is string | null => value === null || typeof value === 'string';
const counts = () => ({ getItem: 0, setItem: 0, removeItem: 0, candidateSetCalls: 0,
  rollbackSetCalls: 0, rollbackRemoveCalls: 0, rollbackDenied: 0, readCalls: 0 });
// Storage exceptions can contain private source/value bytes. Never expose their
// arbitrary message via a failed transition's public reason.
const saveReason = (error: string) => ['invalid-authoring-draft', 'storage-read-failed',
  'stale-authoring-draft', 'storage-verification-failed'].includes(error) ? error : 'entry-draft-save-failed';

/** Descriptor-only plain/native cross-realm Object check; getters never run. */
function fields(value: unknown, names: readonly string[]): Data | undefined {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const proto = Object.getPrototypeOf(value);
    if (proto !== null) {
      const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor');
      if (Object.getPrototypeOf(proto) !== null || !ctor || !own(ctor, 'value') || typeof ctor.value !== 'function'
        || Function.prototype.toString.call(ctor.value) !== 'function Object() { [native code] }'
        || Object.getOwnPropertyDescriptor(ctor.value, 'prototype')?.value !== proto) return;
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length !== names.length || keys.some(key => typeof key !== 'string' || !names.includes(key))) return;
    const out: Data = {};
    for (const key of names) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !own(descriptor, 'value') || !descriptor.enumerable) return;
      out[key] = descriptor.value;
    }
    return out;
  } catch { return; }
}

function method(object: unknown, name: string): ((...args: unknown[]) => unknown) | undefined {
  if (!object || typeof object !== 'object') return;
  try {
    let cursor: object | null = object;
    const seen = new Set<object>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const descriptor = Object.getOwnPropertyDescriptor(cursor, name);
      if (descriptor) return own(descriptor, 'value') && typeof descriptor.value === 'function'
        ? (...args) => Reflect.apply(descriptor.value, object, args) : undefined;
      cursor = Object.getPrototypeOf(cursor);
    }
  } catch { /* Invalid dependency is unavailable, not permission to access it. */ }
}

export function createPersonalWorkspacePocEntryAuthoringTransition(config: Config): PersonalWorkspacePocEntryAuthoringTransition {
  const shape = fields(config, ['storage', 'read']);
  const get = method(shape?.storage, 'getItem');
  const set = method(shape?.storage, 'setItem');
  const remove = method(shape?.storage, 'removeItem');
  const read = shape?.read;
  const valid = Boolean(get && set && remove && typeof read === 'function');
  const tickets = new WeakMap<object, Captured>();
  let inFlight = false;
  let recoveryRequired = false;

  function failure(status: FailureStatus, reason: string, metric = counts(),
    rollback: Failure['rollback'] = status === 'recovery-required' ? 'recovery-required' : 'not-needed'): Failure {
    return Object.freeze({ status, reason, rollback, apiCalls: Object.freeze({ ...metric }) });
  }
  function current(metric: ReturnType<typeof counts>): PersonalWorkspacePocEntryAuthoringRead | undefined {
    metric.readCalls += 1;
    try {
      const packet = fields(typeof read === 'function' ? read() : undefined, ['ok', 'scopeBinding', 'documentId', 'draftRaw']);
      if (!packet || packet.ok !== true || !nonblank(packet.scopeBinding) || !nonblank(packet.documentId) || !nullable(packet.draftRaw)) return;
      return Object.freeze({ ok: true, scopeBinding: packet.scopeBinding, documentId: packet.documentId, draftRaw: packet.draftRaw });
    } catch { return; }
  }
  const sameScope = (a: PersonalWorkspacePocEntryAuthoringRead, b: PersonalWorkspacePocEntryAuthoringRead) =>
    a.scopeBinding === b.scopeBinding && a.documentId === b.documentId;
  const recordOf = (ticket: unknown) => ticket && typeof ticket === 'object' ? tickets.get(ticket) : undefined;

  function prepare(input: PersonalWorkspacePocEntryAuthoringPrepare): PersonalWorkspacePocEntryAuthoringResult {
    if (!valid) return failure('failed', 'entry-transition-unavailable');
    if (recoveryRequired) return failure('recovery-required', 'entry-recovery-required');
    if (inFlight) return failure('failed', 'entry-attempt-pending');
    const parsed = fields(input, ['rawText', 'expectedOwnedDraftRaw', 'expectedScopeBinding', 'expectedDocumentId']);
    if (!parsed || !nonblank(parsed.rawText) || !nullable(parsed.expectedOwnedDraftRaw)
      || !nonblank(parsed.expectedScopeBinding) || !nonblank(parsed.expectedDocumentId)) return failure('failed', 'invalid-entry-input');
    const metric = counts();
    inFlight = true;
    try {
      const packet = current(metric);
      if (!packet) return failure('failed', 'entry-read-failed', metric);
      if (packet.scopeBinding !== parsed.expectedScopeBinding || packet.documentId !== parsed.expectedDocumentId
        || packet.draftRaw !== parsed.expectedOwnedDraftRaw) return failure('stale', 'entry-owned-binding-changed', metric);
      const existing = loadPersonalWorkspacePocAuthoringDraft({ getItem: () => packet.draftRaw });
      if (existing.kind === 'corrupt') return failure('failed', 'invalid-existing-draft', metric);
      const candidate = Object.freeze({ version: 1 as const, rawText: parsed.rawText });
      const serialized = JSON.stringify(candidate);
      const ticket = Object.freeze({ version: PERSONAL_WORKSPACE_POC_ENTRY_AUTHORING_TRANSITION_VERSION,
        contract: PERSONAL_WORKSPACE_POC_ENTRY_AUTHORING_TRANSITION_CONTRACT });
      tickets.set(ticket, Object.freeze({ packet, candidate, serialized }));
      return Object.freeze({ status: 'ready', ticket, replacesDraft: packet.draftRaw !== null });
    } finally { inFlight = false; }
  }

  function cancel(ticket: PersonalWorkspacePocEntryAuthoringTicket): PersonalWorkspacePocEntryAuthoringResult {
    if (!recordOf(ticket)) return failure('failed', 'invalid-entry-ticket');
    tickets.delete(ticket);
    return Object.freeze({ status: 'canceled' });
  }

  function commit(ticket: PersonalWorkspacePocEntryAuthoringTicket): PersonalWorkspacePocEntryAuthoringResult {
    const record = recordOf(ticket);
    if (!record) return failure('failed', 'invalid-entry-ticket');
    tickets.delete(ticket); // Every genuine commit attempt is consumed, even when pending.
    if (inFlight) return failure('failed', 'entry-attempt-pending');
    if (recoveryRequired) return failure('recovery-required', 'entry-recovery-required');
    inFlight = true;
    const metric = counts();
    let rollbackMode = false;
    let primaryAttempted = false;
    let observedUnsafeRollback = false;
    let preWriteReason: string | undefined;

    function getActual(): string | null {
      metric.getItem += 1;
      const raw = get!(DRAFT_KEY);
      if (!nullable(raw)) throw new Error('invalid-draft-read');
      return raw;
    }
    function checkKey(key: string) {
      if (key !== DRAFT_KEY) throw new Error('entry-draft-key-only');
    }
    function canRestore(): boolean {
      // If no underlying candidate set was invoked, never let the old shared
      // writer's catch cause this adapter's first mutation to be a rollback.
      if (metric.candidateSetCalls === 0) { metric.rollbackDenied += 1; throw new Error('entry-no-owned-candidate'); }
      let raw: string | null;
      try { raw = getActual(); }
      catch { observedUnsafeRollback = true; metric.rollbackDenied += 1; throw new Error('entry-rollback-read-failed'); }
      if (raw === record!.packet.draftRaw) return false;
      if (raw !== record!.serialized) {
        observedUnsafeRollback = true; metric.rollbackDenied += 1;
        throw new Error('entry-rollback-owner-changed');
      }
      return true;
    }
    const facade = Object.freeze({
      getItem(key: string) { checkKey(key); return getActual(); },
      setItem(key: string, raw: string) {
        checkKey(key);
        if (!rollbackMode && !primaryAttempted) {
          primaryAttempted = true;
          if (raw !== record!.serialized) throw new Error('entry-candidate-mismatch');
          const packet = current(metric);
          if (!packet || !sameScope(packet, record!.packet) || packet.draftRaw !== record!.packet.draftRaw) {
            preWriteReason = packet ? 'entry-binding-changed' : 'entry-read-failed';
            throw new Error(preWriteReason);
          }
          if (getActual() !== record!.packet.draftRaw) {
            preWriteReason = 'entry-draft-changed'; throw new Error(preWriteReason);
          }
          metric.setItem += 1; metric.candidateSetCalls += 1;
          set!(DRAFT_KEY, raw);
          return;
        }
        if (raw !== record!.packet.draftRaw) throw new Error('entry-unexpected-rollback-value');
        if (!canRestore()) return;
        metric.setItem += 1; metric.rollbackSetCalls += 1;
        set!(DRAFT_KEY, raw);
      },
      removeItem(key: string) {
        checkKey(key);
        if (record!.packet.draftRaw !== null) throw new Error('entry-unexpected-remove');
        if (!canRestore()) return;
        metric.removeItem += 1; metric.rollbackRemoveCalls += 1;
        remove!(DRAFT_KEY);
      },
    });
    function recover(status: 'failed' | 'stale', reason: string): Failure {
      rollbackMode = true;
      const restored = restorePersonalWorkspacePocAuthoringDraftBytes(facade, {
        expectedSerialized: record!.serialized, previous: record!.packet.draftRaw,
      });
      if (!restored.ok || observedUnsafeRollback) {
        recoveryRequired = true;
        return failure('recovery-required', reason, metric);
      }
      return failure(status, reason, metric, restored.rollback);
    }

    try {
      const packet = current(metric);
      if (!packet) return failure('failed', 'entry-read-failed', metric);
      if (!sameScope(packet, record.packet) || packet.draftRaw !== record.packet.draftRaw) return failure('stale', 'entry-binding-changed', metric);
      const saved = savePersonalWorkspacePocAuthoringDraft(facade, record.candidate, record.packet.draftRaw);
      if (!saved.ok) {
        if (metric.candidateSetCalls === 0) return failure(saved.error === 'stale-authoring-draft'
          || preWriteReason?.includes('changed') ? 'stale' : 'failed', preWriteReason ?? saveReason(saved.error), metric);
        if (saved.rollback === 'recovery-required' || observedUnsafeRollback) {
          recoveryRequired = true;
          return failure('recovery-required', saveReason(saved.error), metric);
        }
        const after = current(metric);
        if (!after || after.draftRaw !== record.packet.draftRaw || getActual() !== record.packet.draftRaw) {
          recoveryRequired = true;
          return failure('recovery-required', 'entry-failed-draft-unverified', metric);
        }
        return failure(sameScope(after, record.packet) ? 'failed' : 'stale', saveReason(saved.error), metric, saved.rollback);
      }
      const after = current(metric);
      if (!after) return recover('failed', 'entry-post-read-failed');
      if (!sameScope(after, record.packet)) return recover('stale', 'entry-scope-changed');
      if (after.draftRaw !== record.serialized) return recover('stale', 'entry-draft-changed');
      if (getActual() !== record.serialized) return recover('stale', 'entry-draft-changed');
      return Object.freeze({ status: 'success', draft: record.candidate, serialized: record.serialized,
        previous: saved.previous, changed: saved.changed, targetWriteCount: saved.changed ? 1 : 0,
        apiCalls: Object.freeze({ ...metric }) });
    } catch {
      if (metric.candidateSetCalls > 0) return recover('failed', 'entry-commit-read-failed');
      return failure('failed', 'entry-commit-read-failed', metric);
    } finally { inFlight = false; }
  }

  return Object.freeze({ prepare, cancel, commit });
}
