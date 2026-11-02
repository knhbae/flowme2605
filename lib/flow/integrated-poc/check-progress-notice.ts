import type { ProgramReferenceAccess } from './reference-execution-guard';
import type { ProgramNoticeTone } from './program-notice';
import { textWorkspaceModel as M, type TextDocument, type TextEditorRowMeta, type TextWorkspaceState } from './text-workspace';

/** C2 (11/2): a check tap still completes at once, and its notice offers [되돌리기] and [진행률로]; 진행률로 turns the
 *  row into percent chips, one of which saves today's cumulative progress for that task (the same record the progress
 *  form makes; the same day's record is overwritten). A task already between 1% and 99% gets the chips on its tap,
 *  led by [완료]. [직접] opens the full progress form. The same rules serve the document editor and 오늘. */
export const PROGRAM_CHECK_CHIPS = [25, 50, 75] as const;
/** Longer than an info notice's 6s: the chips are a second step. Held while pressed or focused, or waiting. */
export const PROGRAM_CHECK_NOTICE_MS = 10000;

export interface ProgramCheckNotice {
  /** done: a tap (or [완료]) just completed it; chips: a percent to choose; saved: a chip's value is saved;
   *  failed: the value a step asked for is not what the task has (refused, or changed since). */
  stage: 'done' | 'chips' | 'saved' | 'failed';
  /** The task the buttons act on, by ID, so they still point at it once it has moved in the list. */
  targetId: string; title: string;
  /** Its progress before this began (what 되돌리기 puts back) and what the last step left. */
  before: number; after: number;
  shownAt: number; key: number;
  /** Review P2: a step on its way, held for a save in flight or saving; its notice says so only once the saved
   *  record has the value. quiet: a tap's own completion, whose buttons stay usable while it saves. */
  saving?: { percent: number; undo: boolean; quiet: boolean };
  /** failed: the value asked for, what the task has instead (null: no saved record), and why. */
  asked?: number; kept?: number | null; why?: 'save' | 'changed';
}
export type ProgramCheckStep = { kind: 'undo' } | { kind: 'chips' } | { kind: 'direct' } | { kind: 'percent'; percent: number };
export interface ProgramCheckButton { label: string; step: ProgramCheckStep; current?: boolean }

/** What the notice says and offers at each stage. */
export function programCheckNoticeView(notice: ProgramCheckNotice): { tone: ProgramNoticeTone; text: string; actions: ProgramCheckButton[]; chips: ProgramCheckButton[] } {
  const undo: ProgramCheckButton = { label: '되돌리기', step: { kind: 'undo' } };
  if (notice.saving && !notice.saving.quiet) return { tone: 'info', text: `${notice.saving.undo ? '되돌리는 중…' : `진행률 ${notice.saving.percent}% 저장 중…`} · ${notice.title}`, actions: [], chips: [] };
  if (notice.stage === 'failed') {
    const asked = notice.asked === 100 ? '완료' : `진행률 ${notice.asked}%`;
    const kept = notice.kept === null || notice.kept === undefined ? '저장된 기록이 없습니다' : `${notice.why === 'save' ? '저장된' : '지금'} 값은 ${notice.kept}%입니다`;
    return { tone: 'warn', text: `${asked}${notice.why === 'save' ? '를 저장하지 못했습니다' : '로 바뀌지 않았습니다'}. ${kept} · ${notice.title}`, actions: [], chips: [] };
  }
  // Re-review: the check shows at once, but the words wait for the save ("완료 저장 중…", then "완료했습니다").
  if (notice.stage === 'done') return { tone: 'choose', text: `${notice.saving?.quiet ? '완료 저장 중…' : '완료했습니다'} · ${notice.title}`, actions: [undo, { label: '진행률로', step: { kind: 'chips' } }], chips: [] };
  if (notice.stage === 'saved') return { tone: 'info', text: `진행률 ${notice.after}%로 기록했습니다 · ${notice.title}`, actions: [undo], chips: [] };
  const partial = notice.after > 0 && notice.after < 100;
  const chips: ProgramCheckButton[] = [
    ...(partial ? [{ label: '완료', step: { kind: 'percent', percent: 100 } as ProgramCheckStep }] : []),
    ...PROGRAM_CHECK_CHIPS.map(percent => ({ label: `${percent}%`, step: { kind: 'percent', percent } as ProgramCheckStep, current: percent === notice.after })),
    { label: '직접', step: { kind: 'direct' } },
  ];
  return { tone: 'choose', text: partial ? `진행률 ${notice.after}% · ${notice.title}` : `진행률을 고르세요 · ${notice.title}`, actions: [], chips };
}

/** When the notice ends (on the clock its shownAt was read from), or null while it stays: held, waiting, a step on its
 *  way (review P2: a choice held for a save is never dropped by the clock; a tap's own quiet save keeps the clock), or
 *  a failure, which stays until closed. */
export function programCheckNoticeEndsAt(notice: Pick<ProgramCheckNotice, 'shownAt'> & Partial<Pick<ProgramCheckNotice, 'stage' | 'saving'>>, held: boolean, waiting = false): number | null {
  return held || waiting || notice.saving && !notice.saving.quiet || notice.stage === 'failed' ? null : notice.shownAt + PROGRAM_CHECK_NOTICE_MS;
}

/** The notice after a step saved `percent`: completing offers 되돌리기·진행률로 again; another value says what it saved. */
export function programCheckNoticeAfter(notice: ProgramCheckNotice, percent: number, shownAt: number, key: number): ProgramCheckNotice {
  return { ...notice, stage: percent === 100 ? 'done' : 'saved', after: percent, saving: undefined, shownAt, key };
}

/** The notice when the value a step asked for is not what the task has: the save was refused, or it changed since. */
export function programCheckNoticeFailed(notice: ProgramCheckNotice, asked: number, kept: number | null, why: 'save' | 'changed', shownAt: number, key: number): ProgramCheckNotice {
  return { ...notice, stage: 'failed', asked, kept, why, saving: undefined, shownAt, key };
}

/** How a step's save went, read off the saved record and the draft: saved (the record has the value), refused (the
 *  save failed and stopped), changed (everything is saved, but with another value), or null while it is on its way. */
export function programCheckSaveOutcome(saved: number | null, asked: number, draft: { saving: boolean; dirty: boolean; invalid: boolean; error: string }): 'saved' | 'refused' | 'changed' | null {
  if (saved === asked) return 'saved';
  if (draft.saving) return null;
  if (draft.error || draft.invalid) return 'refused';
  return draft.dirty ? null : 'changed';
}

/** 되돌리기 puts `before` back only while the task still has what this notice left; anything since keeps it. */
export function programCheckUndoable(notice: ProgramCheckNotice, current: number | null): boolean {
  return current === notice.after;
}

/** A tap on a task between 1% and 99% shows the chips instead of the full form when the tap could have toggled it:
 *  the task is active here, a plain or canonical row, with no record dated after today. Everything else keeps the form. */
export function programCheckChipsFit(meta: Pick<TextEditorRowMeta, 'kind' | 'isCanonical' | 'progressTargetId' | 'progressPercent' | 'progressDate'>, access: ProgramReferenceAccess | undefined, date: string): boolean {
  if (!meta.progressTargetId || !access || access.kind !== 'active' || access.reason || access.lineId !== meta.progressTargetId || !access.documentId) return false;
  if (meta.kind === 'subcheck' ? !meta.isCanonical : !['task', 'reference'].includes(meta.kind)) return false;
  const percent = meta.progressPercent;
  return percent !== undefined && percent > 0 && percent < 100 && (meta.progressDate ?? '') <= date;
}

const CHECK_MARK = /^( *-\s+\[)([^\]\r\n]*)(\])/;
/** C2 re-review (총괄, 11/2): the check shows at once, but a refused save puts it back to what is saved. The task's
 *  progress records and the mark on its source line come from the committed state; every other unsaved edit, its
 *  title included, stays. Null when the line or its mark is gone, or the result does not hold. */
export function programCheckRevert(working: TextWorkspaceState, committed: TextWorkspaceState, targetId: string, validate: (state: TextWorkspaceState) => boolean): TextWorkspaceState | null {
  const savedLine = [...committed.documents, ...committed.flows].flatMap(doc => doc.lines).find(line => line.id === targetId);
  const savedMark = savedLine ? CHECK_MARK.exec(savedLine.text) : null;
  if (!savedMark) return null;
  let found = false;
  const put = <T extends TextDocument>(doc: T): T => !doc.lines.some(line => line.id === targetId) ? doc : { ...doc, lines: doc.lines.map(line => {
    const mark = line.id === targetId ? CHECK_MARK.exec(line.text) : null;
    if (!mark) return line;
    found = true;
    return { ...line, text: mark[1] + savedMark[2] + mark[3] + line.text.slice(mark[0].length) };
  }) };
  const documents = working.documents.map(put), flows = working.flows.map(put);
  if (!found) return null;
  const progressRecords = [...working.progressRecords.filter(record => record.taskId !== targetId), ...committed.progressRecords.filter(record => record.taskId === targetId)];
  const next = { ...working, documents, flows, progressRecords };
  return validate(next) ? next : null;
}

/** C2 final review: every refused task goes back at once, in one change. One at a time, the first revert started a
 *  save that skipped the rest, so a refused B was saved at 100% while its notice said 0%. A task whose saved value
 *  already agrees with the screen (a later save stored it after all) needs nothing and is listed in `agreed`. */
export function programCheckRevertAll(working: TextWorkspaceState, committed: TextWorkspaceState, targetIds: string[], validate: (state: TextWorkspaceState) => boolean): { next: TextWorkspaceState; agreed: string[] } {
  let next = working;
  const agreed: string[] = [];
  for (const targetId of targetIds) {
    if (M.currentProgress(committed, targetId) === M.currentProgress(next, targetId)) { agreed.push(targetId); continue; }
    next = programCheckRevert(next, committed, targetId, validate) ?? next;
  }
  return { next, agreed };
}
