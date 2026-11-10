/** Input v2 stage 1 (11/7): where the writing bar's 날짜 and 폴더 write, in today's grammar. RAW only, no model:
 *  the editor's own insertion path (insertNative) checks and applies the one native edit, so one press is one ↶. */

/** One native insertion: `text` at `offset`, the caret at `caret` afterwards (offsets in the new raw). */
export type ProgramBarInsertion = { offset: number; text: string; caret: number };

const DATE_HEADER = /^\[(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\]$/;
/** A section head the model reads (sectionDate): `[2026-11-06]`, `[미정]` or another `[2026…]` form, from the line's
 *  start. Only a dated one has a day to order by. */
function header(line: string): { date: string | null } | null {
  if (/^\s/.test(line) || !/^\[(\d{4}(?:[-/.].*)?|미정)\]$/.test(line.trim())) return null;
  const dated = DATE_HEADER.exec(line.trim());
  return { date: dated ? `${dated[1]}-${dated[2].padStart(2, '0')}-${dated[3].padStart(2, '0')}` : null };
}
/** R1 (11/11 dateslot, shared with moves): the line a new `[date]` head goes before, in the document's date order
 *  (newest first unless its first two dated heads go up): right before the first dated head that comes after it in
 *  that order, else before the head that follows the last dated one (`[미정]`), else at the end (lines.length). Never
 *  between a head and its lines, so no line under a head moves to another one. */
export function programDateHeadIndex(lines: readonly string[], date: string): number {
  const heads = lines.flatMap((line, index) => { const head = header(line); return head ? [{ index, date: head.date }] : []; });
  const dated = heads.filter(head => head.date), ascending = dated.length >= 2 && dated[0].date! < dated[1].date!;
  const before = dated.find(head => ascending ? head.date! > date : head.date! < date);
  const last = dated.at(-1), after = last ? heads.find(head => head.index > last.index) : heads[0];
  return before?.index ?? after?.index ?? lines.length;
}
const lineAt = (raw: string, caret: number) => raw.slice(0, Math.max(0, Math.min(caret, raw.length))).split('\n').length - 1;
const lineStart = (lines: readonly string[], index: number) => lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0);

/** 날짜 칩 on a line that is not a task (Q1, R1). The day's head line exists: a new empty line at the end of its block
 *  (or nothing, when the caret is already on an empty line of that block). It does not: `[YYYY-MM-DD]` and an empty
 *  line for the caret, in the document's date order (newest first unless its first two dated heads go up), always
 *  right before another head line or at the end, so no line that was under a head moves to another one and no task
 *  changes its date. A blank line keeps the new block apart from its neighbours. */
export function programDateHeaderPlan(raw: string, caret: number, date: string): ProgramBarInsertion | null {
  if (!DATE_HEADER.test(`[${date}]`)) return null;
  const lines = raw.split('\n'), at = lineAt(raw, caret);
  const heads = lines.flatMap((line, index) => { const head = header(line); return head ? [{ index, date: head.date }] : []; });
  const own = heads.find(head => head.date === date);
  if (own) {
    const next = heads.find(head => head.index > own.index)?.index ?? lines.length;
    if (at > own.index && at < next && !lines[at].trim()) return null;
    let end = next - 1;
    while (end > own.index && !lines[end].trim()) end -= 1;
    const offset = lineStart(lines, end) + lines[end].length;
    return { offset, text: '\n', caret: offset + 1 };
  }
  const index = programDateHeadIndex(lines, date);
  const head = `[${date}]`;
  if (index < lines.length) {
    const gap = index > 0 && !!lines[index - 1].trim(), offset = lineStart(lines, index);
    const text = `${gap ? '\n' : ''}${head}\n\n\n`;
    return { offset, text, caret: offset + (gap ? 1 : 0) + head.length + 1 };
  }
  if (!raw) return { offset: 0, text: `${head}\n`, caret: head.length + 1 };
  const gap = !!lines[lines.length - 1].trim(), text = `${gap ? '\n\n' : ''}${head}\n`;
  return { offset: raw.length, text, caret: raw.length + text.length };
}

/** 폴더 (stage 1): the `- /` line the folder suggestions answer to, written once; the suggestions then write the
 *  whole name. An empty caret line takes it when nothing deeper follows it (a deeper line would become the new
 *  folder's); otherwise it goes on a new line after the caret's top-level block (the line at the start of the
 *  line, with every deeper line under it), so no task changes its folder or its date. */
export function programFolderSeedPlan(raw: string, caret: number): ProgramBarInsertion {
  const lines = raw.split('\n'), at = lineAt(raw, caret), indent = (line: string) => /^[ \t]*/.exec(line)![0].length;
  const blank = (line: string) => !line.trim();
  if (lines[at] === '') {
    const next = lines.findIndex((line, index) => index > at && !blank(line));
    if (next < 0 || indent(lines[next]) === 0) { const offset = lineStart(lines, at); return { offset, text: '- /', caret: offset + 3 }; }
  }
  let top = at;
  while (top > 0 && (blank(lines[top]) || indent(lines[top]) > 0)) top -= 1;
  let end = top + 1;
  while (end < lines.length && (blank(lines[end]) || indent(lines[end]) > 0)) end += 1;
  end -= 1;
  while (end > top && blank(lines[end])) end -= 1;
  const offset = lineStart(lines, end) + lines[end].length;
  return { offset, text: '\n- /', caret: offset + 4 };
}

/** The day a line's tasks count under: the nearest head line above it (`null` before any, or under `[미정]`). Test
 *  and check use: a date head insertion must leave every old line's day as it was. */
export function programLineDays(raw: string): (string | null)[] {
  let day: string | null = null;
  return raw.split('\n').map(line => { const head = header(line); if (head) day = head.date; return day; });
}

/** Input v2 stage 2 (11/7): a `[` line of its own read as a day for the date chips' first chip. `[d` or `[dd`: that
 *  day this month (next month when it is past; none when this month has no such day). `[m/d` (`-` or `.` too): this
 *  year, next year when it is more than 60 days past. `[yyyy-m-d`: that day. Anything else (`[`, `[2026`, `[11/`): none. */
export function programBracketDate(text: string, today: string): string | null {
  const [year, month] = today.split('-').map(Number);
  const day = /^\[(\d{1,2})$/.exec(text);
  if (day) {
    const here = isoDate(year, month, Number(day[1]));
    if (!here || here >= today) return here;
    return isoDate(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, Number(day[1]));
  }
  const monthDay = /^\[(\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (monthDay) {
    const here = isoDate(year, Number(monthDay[1]), Number(monthDay[2]));
    if (!here) return null;
    return here < shiftDays(today, -60) ? isoDate(year + 1, Number(monthDay[1]), Number(monthDay[2])) : here;
  }
  const full = /^\[(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  return full ? isoDate(Number(full[1]), Number(full[2]), Number(full[3])) : null;
}
function isoDate(year: number, month: number, day: number): string | null {
  const at = new Date(Date.UTC(year, month - 1, day));
  if (at.getUTCFullYear() !== year || at.getUTCMonth() !== month - 1 || at.getUTCDate() !== day) return null;
  return at.toISOString().slice(0, 10);
}
const shiftDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** One native edit replacing `raw[start, end)` with `text`; the caret at `caret` (in the new raw). */
export type ProgramBarReplacement = { start: number; end: number; text: string; caret: number; nextRaw: string };
/** A date chip pressed on a `[…` line (stage 2): the `[…` line goes (its text and one line break) and the day's head
 *  line goes where the stage 1 chip puts it (programDateHeaderPlan) in what is left, as one change: the two are made
 *  into one range by their common start and end, so one ↶ brings back the `[…` line. The `[…` line is no head line
 *  (no `]`), so no other line's day changes. Already on an empty line of that day's block: only the `[…` text goes. */
export function programBracketDatePlan(raw: string, start: number, end: number, date: string): ProgramBarReplacement | null {
  if (start < 0 || end < start || end > raw.length || (start > 0 && raw[start - 1] !== '\n') || (end < raw.length && raw[end] !== '\n')) return null;
  const last = end === raw.length, from = last && start > 0 ? start - 1 : start, to = last ? end : end + 1;
  const rest = raw.slice(0, from) + raw.slice(to), plan = programDateHeaderPlan(rest, from, date);
  let nextRaw: string, caret: number;
  if (plan) { nextRaw = rest.slice(0, plan.offset) + plan.text + rest.slice(plan.offset); caret = plan.caret; }
  else { nextRaw = raw.slice(0, start) + raw.slice(end); caret = start; }
  let head = 0;
  while (head < raw.length && head < nextRaw.length && raw[head] === nextRaw[head]) head += 1;
  let tail = 0;
  while (tail < raw.length - head && tail < nextRaw.length - head && raw[raw.length - 1 - tail] === nextRaw[nextRaw.length - 1 - tail]) tail += 1;
  return { start: head, end: raw.length - tail, text: nextRaw.slice(head, nextRaw.length - tail), caret, nextRaw };
}
/** 오늘 시작 줄 (stage 2): today's head line from above the body, offered only where the date chip would put it at the
 *  top (a newest-first document, or an empty one) and only while the document has no head line for today. */
export function programTodayStartPlan(raw: string, today: string): ProgramBarInsertion | null {
  const lines = raw.split('\n'), heads = lines.flatMap((line, index) => { const head = header(line); return head ? [{ index, date: head.date }] : []; });
  if (heads.some(head => head.date === today)) return null;
  const plan = programDateHeaderPlan(raw, 0, today);
  if (!plan) return null;
  if (!raw) return plan;
  const first = heads[0];
  return first && plan.offset <= lineStart(lines, first.index) ? plan : null;
}