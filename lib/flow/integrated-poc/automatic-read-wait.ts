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
