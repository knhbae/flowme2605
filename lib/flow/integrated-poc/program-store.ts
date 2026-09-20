import {
  PROGRAM_LIMITS, PROGRAM_SCHEMA, PROGRAM_STATE_KEY,
  type ProgramData, type ProgramEnvelope,
} from './contract';
import { expandProgramUndo, shareProgramUndo } from './program-undo-codec';

export type ProgramStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};
export type ProgramValidator = (value: unknown) => boolean;
export type ProgramStoreLoad =
  | { kind: 'empty'; raw: null }
  | { kind: 'ready'; raw: string; envelope: ProgramEnvelope }
  | { kind: 'corrupt'; raw: string }
  | { kind: 'unavailable'; raw: null };
export type ProgramCommitResult =
  | { ok: true; changed: boolean; raw: string; envelope: ProgramEnvelope }
  | { ok: false; reason: 'invalid' | 'conflict' | 'storage-unavailable' | 'readback-failed' | 'recovery-required'; raw?: string | null };

// A failed observation must not become authority for another write. A fresh
// application boot can use a new port after explicitly recovering its state.
const blockedPorts = new WeakSet<object>();

/** Reject values that JSON would silently drop/coerce, without invoking getters. */
function jsonSnapshot(value: unknown, ancestors = new Set<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || ancestors.has(value)) throw new Error('non-json');
  const proto = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && proto !== Object.prototype && proto !== null) throw new Error('non-plain');
  if (Object.getOwnPropertySymbols(value).length) throw new Error('symbol');
  ancestors.add(value);
  try {
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Array.isArray(value)) {
      const keys = Object.keys(descriptors).filter(key => key !== 'length');
      if (keys.length !== value.length || keys.some((key, i) => key !== String(i))) throw new Error('sparse-array');
      return keys.map(key => {
        const entry = descriptors[key];
        if (!entry.enumerable || !('value' in entry)) throw new Error('accessor');
        return jsonSnapshot(entry.value, ancestors);
      });
    }
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(descriptors).sort()) {
      const entry = descriptors[key];
      if (!entry.enumerable || !('value' in entry)) throw new Error('accessor');
      result[key] = jsonSnapshot(entry.value, ancestors);
    }
    return result;
  } finally { ancestors.delete(value); }
}

function encode(value: unknown): string {
  const raw = JSON.stringify(jsonSnapshot(value));
  if (new TextEncoder().encode(raw).byteLength > PROGRAM_LIMITS.rawBytes) throw new Error('too-large');
  return raw;
}

function encodeEnvelope(value: ProgramEnvelope): string {
  // Keep strict lossless JSON checks and the logical size limit before sharing.
  const snapshot = JSON.parse(encode(value)) as ProgramEnvelope;
  snapshot.undo = shareProgramUndo(snapshot.undo) as ProgramEnvelope['undo'];
  return encode(snapshot);
}

type DecodedEnvelope = { envelope: ProgramEnvelope; logicalRaw: string };

function decode(raw: string, validate: ProgramValidator): DecodedEnvelope | undefined {
  try {
    if (new TextEncoder().encode(raw).byteLength > PROGRAM_LIMITS.rawBytes) return undefined;
    const value = JSON.parse(raw) as ProgramEnvelope;
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).sort().join(',') !== 'data,revision,schema,undo'
      || value.schema !== PROGRAM_SCHEMA || !Number.isSafeInteger(value.revision) || value.revision < 0
      || !value.data || !value.undo) return undefined;
    value.undo = expandProgramUndo(value.undo, PROGRAM_LIMITS.rawBytes) as ProgramEnvelope['undo'];
    const logicalRaw = encode(value);
    if (!validate(value)) return undefined;
    // Validators are predicates, not migration or normalization hooks.
    return encode(value) === logicalRaw ? { envelope: value, logicalRaw } : undefined;
  } catch { return undefined; }
}

function observeStoredRaw(storage: Pick<ProgramStorage, 'getItem'>):
  | { kind: 'observed'; raw: string | null }
  | { kind: 'unavailable'; raw: null } {
  try { return { kind: 'observed', raw: storage.getItem(PROGRAM_STATE_KEY) }; }
  catch { blockedPorts.add(storage); return { kind: 'unavailable', raw: null }; }
}

function loadObservedRaw(raw: string | null, validate: ProgramValidator): ProgramStoreLoad {
  if (raw === null) return { kind: 'empty', raw };
  const decoded = decode(raw, validate);
  return decoded ? { kind: 'ready', raw, envelope: decoded.envelope } : { kind: 'corrupt', raw };
}

export function loadProgramStore(storage: Pick<ProgramStorage, 'getItem'>, validate: ProgramValidator): ProgramStoreLoad {
  const observed = observeStoredRaw(storage);
  return observed.kind === 'unavailable' ? observed : loadObservedRaw(observed.raw, validate);
}

/** Exact byte observation only: `unchanged` is not a payload validation result.
 * The controller alone retains the already validated, detached snapshot behind
 * expectedRaw. Changed bytes always decode and validate fully. No cross-call
 * validator cache, storage migration, or weakening of the commit CAS/readback.
 */
export function loadProgramStoreIfChanged(storage: Pick<ProgramStorage, 'getItem'>,
  expectedRaw: string | null, validate: ProgramValidator,
): ProgramStoreLoad | { kind: 'unchanged'; raw: string | null } {
  const observed = observeStoredRaw(storage);
  if (observed.kind === 'unavailable') return observed;
  return observed.raw === expectedRaw ? { kind: 'unchanged', raw: observed.raw } : loadObservedRaw(observed.raw, validate);
}

export function makeProgramEnvelope(
  before: ProgramEnvelope, nextData: ProgramData,
  options: { actorId: string; historyLabel?: string; groupId?: string },
): ProgramEnvelope {
  if (encode(before.data) === encode(nextData)) return before;
  if (!Number.isSafeInteger(before.revision + 1) || before.schema !== PROGRAM_SCHEMA) throw new Error('invalid-envelope');
  const actor = options.actorId;
  if (!Object.hasOwn(before.data.spaces, actor) || !Object.hasOwn(nextData.spaces, actor)) throw new Error('missing-actor');
  const next = JSON.parse(encode(before)) as ProgramEnvelope;
  next.data = JSON.parse(encode(nextData)) as ProgramData;
  next.revision += 1;
  if (options.historyLabel && encode(before.data.spaces[actor]) !== encode(nextData.spaces[actor])) {
    const history = Object.hasOwn(next.undo, actor) ? next.undo[actor] : [];
    const grouped = options.groupId !== undefined && history.at(-1)?.groupId === options.groupId;
    if (!grouped) {
      history.push({ label: options.historyLabel, groupId: options.groupId ?? null,
        workspace: JSON.parse(encode(before.data.spaces[actor])) });
      Object.defineProperty(next.undo, actor, { value: history.slice(-PROGRAM_LIMITS.history), enumerable: true, writable: true, configurable: true });
    }
  }
  return next;
}

export function planProgramUndo(before: ProgramEnvelope, actorId: string): ProgramEnvelope {
  const history = Object.hasOwn(before.undo, actorId) ? before.undo[actorId] : undefined;
  if (!history?.length || !Object.hasOwn(before.data.spaces, actorId)) return before;
  if (!Number.isSafeInteger(before.revision + 1)) throw new Error('revision-overflow');
  const next = JSON.parse(encode(before)) as ProgramEnvelope;
  const previous = next.undo[actorId].pop()!;
  next.data.spaces[actorId] = previous.workspace;
  next.revision += 1;
  return next;
}

/**
 * One localStorage value is atomic. The surrounding compare/readback is NOT a
 * cross-tab atomic CAS; callers needing that guarantee must serialize all
 * cooperating writers (e.g. Web Locks) around this complete operation.
 */
export function commitProgramEnvelope(storage: ProgramStorage, input: {
  expectedRaw: string | null; next: ProgramEnvelope; validate: ProgramValidator;
}): ProgramCommitResult {
  if (blockedPorts.has(storage)) return { ok: false, reason: 'recovery-required' };
  let raw: string;
  let decodedNext: DecodedEnvelope | undefined;
  try { raw = encodeEnvelope(input.next); decodedNext = decode(raw, input.validate); }
  catch { return { ok: false, reason: 'invalid' }; }
  const before = input.expectedRaw === null ? undefined : decode(input.expectedRaw, input.validate);
  if (!decodedNext || (input.expectedRaw !== null && !before)) return { ok: false, reason: 'invalid' };
  const next = decodedNext.envelope;
  // Both strings were produced by strict encode and checked again AFTER their
  // validator. Reuse them for equality instead of serializing both trees again.
  const noOp = before !== undefined && before.logicalRaw === decodedNext.logicalRaw;
  if (!noOp && (before ? next.revision !== before.envelope.revision + 1 : next.revision !== 0 && next.revision !== 1)) {
    return { ok: false, reason: 'invalid' };
  }
  let current: string | null;
  try { current = storage.getItem(PROGRAM_STATE_KEY); }
  catch { blockedPorts.add(storage); return { ok: false, reason: 'storage-unavailable' }; }
  if (current !== input.expectedRaw) return { ok: false, reason: 'conflict', raw: current };
  if (noOp) return { ok: true, changed: false, raw: current!, envelope: next };

  let writeThrew = false;
  try { storage.setItem(PROGRAM_STATE_KEY, raw); }
  catch { writeThrew = true; }
  let observed: string | null;
  try { observed = storage.getItem(PROGRAM_STATE_KEY); }
  catch { blockedPorts.add(storage); return { ok: false, reason: 'recovery-required' }; }
  if (!writeThrew && observed === raw) return { ok: true, changed: true, raw, envelope: next };
  if (observed === input.expectedRaw) {
    return { ok: false, reason: writeThrew ? 'storage-unavailable' : 'readback-failed', raw: observed };
  }
  if (observed !== raw) {
    blockedPorts.add(storage);
    return { ok: false, reason: 'readback-failed', raw: observed };
  }
  // A write that threw AFTER storing is rolled back only while its exact bytes
  // still belong to this attempt. Never restore over a foreign value.
  try {
    if (storage.getItem(PROGRAM_STATE_KEY) !== raw) {
      blockedPorts.add(storage); return { ok: false, reason: 'recovery-required' };
    }
    try {
      if (input.expectedRaw === null) storage.removeItem(PROGRAM_STATE_KEY);
      else storage.setItem(PROGRAM_STATE_KEY, input.expectedRaw);
    } catch { /* A port can throw after restoring; verify the actual outcome. */ }
    const restored = storage.getItem(PROGRAM_STATE_KEY);
    if (restored === input.expectedRaw) return { ok: false, reason: 'storage-unavailable', raw: restored };
  } catch { /* Unknown ownership stays locked; no further writes. */ }
  blockedPorts.add(storage);
  return { ok: false, reason: 'recovery-required' };
}
