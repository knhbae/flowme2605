import type { ProgramReferenceAccess } from './reference-execution-guard';
import type { ProgramNoticeTone } from './program-notice';
import type { TextEditorRowMeta } from './text-workspace';

/** C2 (11/2): a check tap still completes at once, and its notice offers [되돌리기] and [진행률로]; 진행률로 turns the
 *  row into percent chips, one of which saves today's cumulative progress for that task (the same record the progress
 *  form makes; the same day's record is overwritten). A task already between 1% and 99% gets the chips on its tap,
 *  led by [완료]. [직접] opens the full progress form. The same rules serve the document editor and 오늘. */
export const PROGRAM_CHECK_CHIPS = [25, 50, 75] as const;
/** Longer than an info notice's 6s: the chips are a second step. Held while pressed or focused, or waiting. */
export const PROGRAM_CHECK_NOTICE_MS = 10000;

export interface ProgramCheckNotice {
  /** done: a tap (or [완료]) just completed it; chips: a percent to choose; saved: a chip just saved one. */
  stage: 'done' | 'chips' | 'saved';
  /** The task the buttons act on, by ID, so they still point at it once it has moved in the list. */
  targetId: string; title: string;
  /** Its progress before this began (what 되돌리기 puts back) and what the last step left. */
  before: number; after: number;
  shownAt: number; key: number;
}
export type ProgramCheckStep = { kind: 'undo' } | { kind: 'chips' } | { kind: 'direct' } | { kind: 'percent'; percent: number };
export interface ProgramCheckButton { label: string; step: ProgramCheckStep; current?: boolean }

/** What the notice says and offers at each stage. */
export function programCheckNoticeView(notice: ProgramCheckNotice): { tone: ProgramNoticeTone; text: string; actions: ProgramCheckButton[]; chips: ProgramCheckButton[] } {
  const undo: ProgramCheckButton = { label: '되돌리기', step: { kind: 'undo' } };
  if (notice.stage === 'done') return { tone: 'choose', text: `완료했습니다 · ${notice.title}`, actions: [undo, { label: '진행률로', step: { kind: 'chips' } }], chips: [] };
  if (notice.stage === 'saved') return { tone: 'info', text: `진행률 ${notice.after}%로 기록했습니다 · ${notice.title}`, actions: [undo], chips: [] };
  const partial = notice.after > 0 && notice.after < 100;
  const chips: ProgramCheckButton[] = [
    ...(partial ? [{ label: '완료', step: { kind: 'percent', percent: 100 } as ProgramCheckStep }] : []),
    ...PROGRAM_CHECK_CHIPS.map(percent => ({ label: `${percent}%`, step: { kind: 'percent', percent } as ProgramCheckStep, current: percent === notice.after })),
    { label: '직접', step: { kind: 'direct' } },
  ];
  return { tone: 'choose', text: partial ? `진행률 ${notice.after}% · ${notice.title}` : `진행률을 고르세요 · ${notice.title}`, actions: [], chips };
}

/** When the notice ends (on the clock its shownAt was read from), or null while it stays. */
export function programCheckNoticeEndsAt(notice: Pick<ProgramCheckNotice, 'shownAt'>, held: boolean, waiting = false): number | null {
  return held || waiting ? null : notice.shownAt + PROGRAM_CHECK_NOTICE_MS;
}

/** The notice after a step saved `percent`: completing offers 되돌리기·진행률로 again; another value says what it saved. */
export function programCheckNoticeAfter(notice: ProgramCheckNotice, percent: number, shownAt: number, key: number): ProgramCheckNotice {
  return { ...notice, stage: percent === 100 ? 'done' : 'saved', after: percent, shownAt, key };
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
