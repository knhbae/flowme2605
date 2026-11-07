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
  const dated = heads.filter(head => head.date), ascending = dated.length >= 2 && dated[0].date! < dated[1].date!;
  const before = dated.find(head => ascending ? head.date! > date : head.date! < date);
  const last = dated.at(-1), after = last ? heads.find(head => head.index > last.index) : heads[0];
  const index = before?.index ?? after?.index ?? lines.length;
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
