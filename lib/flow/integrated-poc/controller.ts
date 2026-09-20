import { programClone, type ProgramData, type ProgramEnvelope, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { createProgramEnvelope, validateProgramData, validateProgramEnvelope } from './program-data';
import { commitProgramEnvelope, loadProgramStore, loadProgramStoreIfChanged, makeProgramEnvelope, planProgramUndo, type ProgramStorage } from './program-store';
import type { ProgramMutationResult } from './ui-contract';

export type ProgramExclusive = <T>(work: () => T | Promise<T>) => Promise<T>;
export type ProgramControllerSnapshot = { envelope: ProgramEnvelope; raw: string | null };
export type ProgramControllerOptions = {
  storage: ProgramStorage;
  initialData: ProgramData;
  exclusive: ProgramExclusive;
  onChange?: (snapshot: ProgramControllerSnapshot, context?: { external: boolean }) => void;
  onPresentationError?: () => void;
};
/** Structural comparison is insensitive to the store's canonical key order. */
export function programSame(a: unknown, b: unknown): boolean {
  const normalize = (value: unknown): unknown => Array.isArray(value) ? value.map(normalize)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([x], [y]) => x.localeCompare(y)).map(([key, part]) => [key, normalize(part)])) : value;
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

/** One owner for every new program write; the exclusive port covers cross-tab writers. */
export function createProgramController(options: ProgramControllerOptions) {
  const loaded = loadProgramStore(options.storage, validateProgramEnvelope);
  if (loaded.kind === 'corrupt' || loaded.kind === 'unavailable') return { ok: false as const, reason: loaded.kind };
  if (!validateProgramData(options.initialData)) return { ok: false as const, reason: 'invalid' };
  let snapshot: ProgramControllerSnapshot = loaded.kind === 'ready'
    ? { raw: loaded.raw, envelope: loaded.envelope }
    : { raw: null, envelope: createProgramEnvelope(programClone(options.initialData)) };
  let queue = Promise.resolve();
  let redo: { actorId: string; expected: ProgramPrivateSpace; workspace: ProgramPrivateSpace } | null = null;
  let pendingPresentation: { external: boolean } | null = null;
  const emit = (external = false): boolean => {
    try {
      options.onChange?.(programClone(snapshot), { external });
      pendingPresentation = null;
      return true;
    } catch {
      // Readback has already confirmed the committed state. An observer failure
      // must not turn that success into a failed-write receipt or permit retry.
      pendingPresentation = { external };
      try { options.onPresentationError?.(); } catch { /* Notification only. */ }
      return false;
    }
  };
  function adoptDisk(): string | null {
    const fresh = loadProgramStoreIfChanged(options.storage, snapshot.raw, validateProgramEnvelope);
    if (fresh.kind === 'unchanged') return null;
    if (fresh.kind === 'corrupt') return 'invalid';
    if (fresh.kind === 'unavailable') return 'storage-unavailable';
    if (fresh.raw !== snapshot.raw) {
      if (fresh.kind === 'empty') return 'recovery-required';
      snapshot = { raw: fresh.raw, envelope: fresh.envelope };
      redo = null; emit(true); return 'conflict';
    }
    return null;
  }
  function enqueue(work: () => ProgramMutationResult | Promise<ProgramMutationResult>): Promise<ProgramMutationResult> {
    const flight = queue.then(() => options.exclusive(work)).catch(() => ({ ok: false as const, reason: 'storage-unavailable' }));
    queue = flight.then(() => undefined);
    return flight;
  }
  function persist(next: ProgramEnvelope, result: string): ProgramMutationResult {
    if (next === snapshot.envelope) return { ok: true, result, changed: false };
    const committed = commitProgramEnvelope(options.storage, { expectedRaw: snapshot.raw, next, validate: validateProgramEnvelope });
    if (!committed.ok) return committed;
    snapshot = { raw: committed.raw, envelope: committed.envelope };
    const presented = emit();
    return { ok: true, result, changed: committed.changed, ...(!presented ? { presentationPending: true as const } : {}) };
  }
  return {
    ok: true as const,
    snapshot: () => programClone(snapshot),
    mutate(label: string, build: (current: ProgramData) => ProgramTransition<string>, input: { actorId: string; groupId?: string; history?: boolean }): Promise<ProgramMutationResult> {
      return enqueue(() => {
        if (pendingPresentation) return { ok: false, reason: 'presentation-pending' };
        const changed = adoptDisk();
        if (changed) return { ok: false, reason: changed };
        if (snapshot.envelope.data.activeActorId !== input.actorId) return { ok: false, reason: 'conflict' };
        const before = snapshot.envelope;
        let transition: ProgramTransition<string>;
        try { transition = build(programClone(before.data)); } catch { return { ok: false, reason: 'invalid' }; }
        if (!transition.ok) return { ok: false, reason: transition.reason };
        if (!validateProgramData(transition.data)) return { ok: false, reason: 'invalid' };
        if (Object.keys(before.data.spaces).some(actor => actor !== input.actorId && !programSame(before.data.spaces[actor], transition.data.spaces[actor]))) return { ok: false, reason: 'forbidden' };
        const next = makeProgramEnvelope(before, transition.data, { actorId: input.actorId,
          historyLabel: input.history === false ? undefined : label, groupId: input.groupId });
        const result = persist(next, transition.result);
        if (result.ok && result.changed && !programSame(before.data.spaces[input.actorId], next.data.spaces[input.actorId]) && input.history !== false) redo = null;
        return result;
      });
    },
    undo(actorId: string): Promise<ProgramMutationResult> {
      return enqueue(() => {
        if (pendingPresentation) return { ok: false, reason: 'presentation-pending' };
        const changed = adoptDisk(); if (changed) return { ok: false, reason: changed };
        const before = snapshot.envelope;
        if (before.data.activeActorId !== actorId) return { ok: false, reason: 'conflict' };
        const next = planProgramUndo(before, actorId), result = persist(next, actorId);
        if (result.ok && result.changed) redo = { actorId, expected: programClone(next.data.spaces[actorId]), workspace: programClone(before.data.spaces[actorId]) };
        return result;
      });
    },
    redo(actorId: string): Promise<ProgramMutationResult> {
      return enqueue(() => {
        if (pendingPresentation) return { ok: false, reason: 'presentation-pending' };
        const changed = adoptDisk(); if (changed) return { ok: false, reason: changed };
        const before = snapshot.envelope;
        if (before.data.activeActorId !== actorId) return { ok: false, reason: 'conflict' };
        if (!redo || redo.actorId !== actorId) return { ok: true, result: actorId, changed: false };
        if (!programSame(before.data.spaces[actorId], redo.expected)) return { ok: false, reason: 'conflict' };
        const nextData = programClone(before.data); nextData.spaces[actorId] = programClone(redo.workspace);
        const result = persist(makeProgramEnvelope(before, nextData, { actorId, historyLabel: '다시 실행' }), actorId);
        if (result.ok) redo = null;
        return result;
      });
    },
    refresh: () => enqueue(() => {
      const reason = adoptDisk();
      if (reason && reason !== 'conflict') return { ok: false, reason };
      if (pendingPresentation) emit(pendingPresentation.external);
      return { ok: true, result: snapshot.envelope.data.activeActorId, changed: reason === 'conflict', ...(pendingPresentation ? { presentationPending: true as const } : {}) };
    }),
    flush: () => queue,
  };
}

export type ProgramController = Extract<ReturnType<typeof createProgramController>, { ok: true }>;
