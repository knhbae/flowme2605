// FC head review P1: the account controller keeps one server undo and one redo for the whole account, so 되돌리기 in
// 둘러보기 could take back a writing change. The host remembers which screen started the change at each end of that
// history, by the revision it produced; 둘러보기 may step only over a change made there (an import, a community
// draft). 쓰기·오늘·분류 keep stepping as before.

export type ProgramHistoryEnd = { revision: number; browse: boolean };
export type ProgramHistoryOrigin = { undo: ProgramHistoryEnd | null; redo: ProgramHistoryEnd | null };
export const PROGRAM_BROWSE_VIEWS: readonly string[] = ['discover', 'flow', 'community'];
export const programEmptyHistoryOrigin = (): ProgramHistoryOrigin => ({ undo: null, redo: null });

/** A saved change is the new undo end; a new change drops the redo end, as the controller does. */
export function programHistoryAfterChange(origin: ProgramHistoryOrigin, revision: number | undefined, browse: boolean): ProgramHistoryOrigin {
  return typeof revision === 'number' ? { undo: { revision, browse }, redo: null } : origin;
}
/** An undo moves its change to the redo end; a redo moves it back. The controller keeps one step each way. The origin
 *  moves only when it was recorded for the revision the step started from: after a recovered save or any skipped
 *  revision the stepped change is not the recorded one, so its origin is dropped and 둘러보기 stays off for it. */
export function programHistoryAfterStep(origin: ProgramHistoryOrigin, kind: 'undo' | 'redo', before: number | undefined, after: number | undefined): ProgramHistoryOrigin {
  const moved = kind === 'undo' ? origin.undo : origin.redo;
  const end = moved && typeof before === 'number' && moved.revision === before && typeof after === 'number' ? { revision: after, browse: moved.browse } : null;
  return kind === 'undo' ? { undo: null, redo: end } : { undo: end, redo: null };
}
/** 둘러보기 steps only when that end of the history was made there and still matches the account revision. */
export function programBrowseHistoryAllowed(origin: ProgramHistoryOrigin, kind: 'undo' | 'redo', revision: number | undefined): boolean {
  const end = kind === 'undo' ? origin.undo : origin.redo;
  return !!end && end.browse && end.revision === revision;
}
