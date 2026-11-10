import type { ProgramHeldReason } from './writing-hold';

/** 저장 재설계 B (UX inbox/ux-save-b-20261110-1704.md, 11/10): the words and the one-press fixes for the writing rules and
 *  held lines. Pure: the editor applies a fix as one edit, so one ↶ takes it back. */
export const PROGRAM_TEXT_LIMIT = { chars: 100_000, lines: 1_200 } as const;

export type ProgramHeldFix = { label: string; start: number; end: number; text: string };

const lineRange = (raw: string, index: number) => {
  const lines = raw.split('\n'); let start = 0;
  for (let i = 0; i < index; i++) start += lines[i].length + 1;
  return { start, end: start + (lines[index] ?? '').length, text: lines[index] ?? '', lines };
};
const lead = (text: string) => /^[ \t]*/.exec(text)![0];
/** The nearest line above that has words, and its depth by its leading spaces (two to a step). */
function depthAbove(lines: string[], index: number) {
  for (let i = index - 1; i >= 0; i--) if (lines[i].trim()) return Math.floor(lead(lines[i]).replace(/\t/g, '  ').length / 2);
  return -1;
}

/** The one line that says why a held line is not saved (L2·L3·L4 words). */
export function programHeldReasonText(reason: ProgramHeldReason, message?: string): string {
  switch (reason) {
    case 'indent': return '들여쓰기가 한 칸 어긋났습니다';
    case 'parent': return '들여쓰기가 위 줄보다 깊습니다';
    case 'date-indent': return '날짜 머리가 들여써져 날짜로 읽지 못했습니다';
    case 'mark': return '할 일 표식이 덜 쓰였습니다';
    case 'progress': return '진행률 표식을 읽지 못했습니다 · 0~100%로 씁니다';
    case 'depth': return '더 깊게 들여 쓸 수 없습니다';
    case 'records': return '진행 기록이 있는 할 일을 지워서 저장하지 않았습니다';
    default: return (message ?? '이 줄을 저장하지 못했습니다').split(/(?<=[.다])\s/)[0].replace(/\.$/, '');
  }
}

/** The fix for a held line: [맞추기] the leading spaces (one step under the line above at most), [맨 앞으로] a date head,
 *  [할 일로] a broken mark made an open task. Null when the line has no fix of its own. */
export function programHeldFix(raw: string, index: number, reason: ProgramHeldReason, restore?: { from: number; to: number; text: string }): ProgramHeldFix | null {
  const { start, text, lines } = lineRange(raw, index), prefix = lead(text), above = depthAbove(lines, index);
  // [되돌리기]: the lines taken away (a checked task, its records kept) go back where they were, as one edit.
  if (reason === 'records') {
    if (!restore) return null;
    if (restore.from >= lines.length) return { label: '되돌리기', start: raw.length, end: raw.length, text: '\n' + restore.text };
    const from = lineRange(raw, restore.from).start;
    if (restore.to <= restore.from) return { label: '되돌리기', start: from, end: from, text: restore.text + '\n' };
    return { label: '되돌리기', start: from, end: lineRange(raw, restore.to - 1).end, text: restore.text };
  }
  if (reason === 'indent' || reason === 'parent' || reason === 'depth') {
    const columns = prefix.replace(/\t/g, '  ').length, ceil = Math.ceil(columns / 2), depth = Math.max(0, Math.min(ceil, above + 1));
    const next = '  '.repeat(depth);
    return next === prefix ? null : { label: '맞추기', start, end: start + prefix.length, text: next };
  }
  if (reason === 'date-indent') return prefix ? { label: '맨 앞으로', start, end: start + prefix.length, text: '' } : null;
  if (reason === 'mark' || reason === 'progress') {
    const mark = brokenMark(text);
    if (!mark) return null;
    return { label: '할 일로', start: start + mark[1].length, end: start + mark[0].length, text: '- [ ] ' };
  }
  return null;
}
/** A broken mark: '- [999%] ' closed, or '- [ ' left open (then only the bracket and the spaces after it; the words stay). */
const brokenMark = (text: string) => /^( *)-\s+\[[^\]\n]*\]\s*/.exec(text) ?? /^( *)-\s+\[\s*/.exec(text);

/** [글로 두기] for a broken mark: the mark goes, the words stay as plain text (a line the model reads and saves). */
export function programHeldPlain(raw: string, index: number, reason: ProgramHeldReason): ProgramHeldFix | null {
  if (reason !== 'mark' && reason !== 'progress') return null;
  const { start, text } = lineRange(raw, index), mark = brokenMark(text);
  return mark ? { label: '글로 두기', start: start + mark[1].length, end: start + mark[0].length, text: '' } : null;
}

/** P2: the share of the limit a text takes (the larger of characters and lines). */
export function programTextLimitShare(raw: string) {
  return Math.max(raw.length / PROGRAM_TEXT_LIMIT.chars, raw.split('\n').length / PROGRAM_TEXT_LIMIT.lines);
}
/** "남은 약 2만 자 · 240줄". */
export function programTextRoom(raw: string) {
  const chars = Math.max(0, PROGRAM_TEXT_LIMIT.chars - raw.length), lines = Math.max(0, PROGRAM_TEXT_LIMIT.lines - raw.split('\n').length);
  return `약 ${programAbout(chars)} · ${lines.toLocaleString('ko-KR')}줄`;
}
export function programAbout(chars: number) {
  return chars >= 10_000 ? `${Math.floor(chars / 10_000)}만 자` : `${chars.toLocaleString('ko-KR')}자`;
}
/** P3: whether a paste would take the text past the limit. */
export function programPasteOverLimit(raw: string, start: number, end: number, text: string) {
  const next = raw.length - (end - start) + text.length, lines = raw.split('\n').length + (text.split('\n').length - 1) - (raw.slice(start, end).split('\n').length - 1);
  return next > PROGRAM_TEXT_LIMIT.chars || lines > PROGRAM_TEXT_LIMIT.lines;
}
/** The longest start of a paste that still fits (by characters and lines). */
export function programPasteFit(raw: string, start: number, end: number, text: string) {
  const roomChars = PROGRAM_TEXT_LIMIT.chars - (raw.length - (end - start));
  const roomLines = PROGRAM_TEXT_LIMIT.lines - (raw.split('\n').length - (raw.slice(start, end).split('\n').length - 1));
  let cut = Math.max(0, Math.min(text.length, roomChars));
  const lines = text.slice(0, cut).split('\n');
  if (lines.length > roomLines) cut = lines.slice(0, Math.max(1, roomLines)).join('\n').length;
  return text.slice(0, cut);
}
