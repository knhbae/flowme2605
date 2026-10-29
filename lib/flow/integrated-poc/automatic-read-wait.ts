// Which clicks may wait for the host's own automatic read (the 20-second poll,
// focus or online refresh) instead of being refused as busy, and what a source
// return should wait for. Kept free of React so the rules can be tested.

export type AutomaticRead<S> = { store: S; ownerId: string; epoch: object; promise: Promise<boolean>; eligible: boolean };
export type ReadScope<S> = { store: S | null; ownerId: string | null; epoch: object; busy: boolean };
export type WaitOptions = { groupId?: string; awaitAutomaticRead?: boolean; alphaCreator?: unknown; alphaSocial?: unknown; alphaWriting?: unknown };

/**
 * The read a mutation may wait for, or null to keep today's busy refusal.
 * Text saves already waited here. A tap opts in only with awaitAutomaticRead and
 * never for creator, social or writing saves: those rebuild their target from
 * the data that arrives after the read, which is not what the user pressed.
 */
export function automaticReadToAwait<S>(read: AutomaticRead<S> | null, scope: ReadScope<S>, options?: WaitOptions): AutomaticRead<S> | null {
  if (!options || options.alphaCreator || options.alphaSocial) return null;
  const textSave = !!options.groupId?.startsWith('text:');
  const tap = !!options.awaitAutomaticRead && !options.alphaWriting;
  if (!textSave && !tap) return null;
  if (!read?.eligible || !scope.busy || read.store !== scope.store || read.ownerId !== scope.ownerId || read.epoch !== scope.epoch) return null;
  return read;
}

export type SourceReturnOperation<S> = { store: S; owner: string | null; epoch: object; promise: Promise<{ ok: boolean }>; settled: boolean };

/**
 * What a source return waits for before it checks readiness. An unsettled
 * operation the user started (a completion that may itself be waiting for the
 * read) comes first; otherwise our own automatic read. Waiting on neither while
 * busy is what used to end the return silently.
 */
export function sourceReturnWait<S>(captured: SourceReturnOperation<S> | null, read: AutomaticRead<S> | null,
  scope: ReadScope<S>): Promise<{ ok: boolean }> | null {
  if (!scope.busy) return null;
  if (captured && !captured.settled && captured.store === scope.store && captured.owner === scope.ownerId && captured.epoch === scope.epoch) return captured.promise;
  if (read?.eligible && read.store === scope.store && read.ownerId === scope.ownerId && read.epoch === scope.epoch) return read.promise.then(ok => ({ ok }));
  return null;
}

/** Taps waiting for the automatic read, counted per session. */
export type QueuedTaps = { epoch: object; count: number };

/** Count a waiting tap. A new session starts from zero, because an old
 *  session's tap can no longer run once its read ends. */
export function queueTap(ref: { current: QueuedTaps }, epoch: object): QueuedTaps {
  if (ref.current.epoch !== epoch) ref.current = { epoch, count: 0 };
  ref.current.count++;
  return ref.current;
}

/** Whether the shared "will continue" notice should clear: only when the last
 *  waiting tap of the current session stops waiting. */
export function unqueueTap(ref: { current: QueuedTaps }, queued: QueuedTaps): boolean {
  return --queued.count === 0 && ref.current === queued;
}

/** Tasks whose completion tap is still waiting or saving, kept per session. */
export type CompletingTasks = { epoch: object | undefined; ids: Set<string> };

/** The current session's set; a new session starts with no locks. */
export function completingInSession(ref: { current: CompletingTasks }, epoch: object | undefined): Set<string> {
  if (ref.current.epoch !== epoch) ref.current = { epoch, ids: new Set() };
  return ref.current.ids;
}

/** Release a tap's lock in the set it was taken in. True when that set is
 *  still the current one, so the waiting rows need redrawing. */
export function finishCompleting(ref: { current: CompletingTasks }, ids: Set<string>, taskId: string): boolean {
  return ids.delete(taskId) && ref.current.ids === ids;
}
