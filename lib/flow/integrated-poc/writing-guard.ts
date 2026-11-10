import inputPlans from './text-input-plan.cjs';
import type { TextWorkspaceState, textWorkspaceModel } from './text-workspace';

/** 저장 재설계 B '오류 없는 쓰기' (PRD 16절, UX inbox/ux-save-b-20261110-1704.md, 11/10): an edit never leaves a line's
 *  structure half broken. One planner for the editor's beforeinput and the save fuzz:
 *  - a deletion that cuts a mark (○ '- [ ] ', '[40%]', '- 메모: ') takes the whole mark (K1: ⌫ at a title's start leaves
 *    its title as plain text);
 *  - a line joined to the one above loses its own mark and indent, its words go on (줄 합침);
 *  - leading spaces change only by ⇥ ⇤: Space and Tab there indent the line, ⌫ there outdents it, by the 2-space step and
 *    with the lines under it, exactly as the bar does (and refused when the bar's would be); a deletion or paste that
 *    starts in them keeps them;
 *  - a deletion that would break a date or folder head asks first (K2: [합치기] takes the whole head away, a folder's
 *    lines move out one step with it);
 *  - pasted lines take the indent where they land (under the line when it has lines under it); pasted at a structured
 *    line's start they go above it as lines of their own;
 *  - typing inside a mark goes to the title's start; inside a date head only what keeps it a date head.
 *  Composition is never planned here: nothing is read while composing. */
type Model = typeof textWorkspaceModel;
export type WritingSplice = { start: number; end: number; text: string };
export type WritingWhy = 'mark' | 'join' | 'indent' | 'outdent' | 'title-start' | 'date-head' | 'folder-indent' | 'folder-mark' | 'line-start' | 'indent-refused' | 'paste-indent';
export type WritingHead = { index: number; kind: 'date' | 'scope'; text: string };
export type WritingPlan =
  | { kind: 'apply'; splice: WritingSplice; inputType: string; changed: boolean; why?: WritingWhy;
      /** Whole lines change (⇥ ⇤): the model matches them by their words, so no splice goes with it. */
      structural?: 'indent' | 'outdent'; selectionAfter?: { start: number; end: number } }
  | { kind: 'keep'; why: WritingWhy }
  | { kind: 'ask'; why: 'merge-section'; heads: WritingHead[]; range: { start: number; end: number };
      merge: { splice: WritingSplice; structural: boolean } };

type Line = { index: number; start: number; end: number; text: string; kind: string; indent: number; mark: [number, number] | null; head: 'date' | 'scope' | null };
type Row = { kind: string; subtreeEndIndex?: number };
type Context = { model: Model; state: TextWorkspaceState; docId: string; raw: string; lines: Line[]; rows: readonly Row[] };
type IndentPlan = { start: number; end: number; text: string; nextRaw: string; selectionAfter: { start: number; end: number } };
const plans = inputPlans as unknown as { planIndent: (raw: string, selection: { start: number; end: number }, rows: unknown, outdent: boolean, fenced: boolean[]) => IndentPlan | null };

const TASK_MARK = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))/;
const PROPERTY_MARK = /^ *-\s+(?:날짜|메모|시간):\s*/;
const FOLDER_MARK = /^ *- \//;
const DATE_HEAD = /^\[(\d{4}(?:[-/.].*)?|미정)\]$/;
const lead = (text: string) => /^ */.exec(text)![0].length;

/** The lines of raw with what the model reads them as (rows of a valid document; notes otherwise). */
export function programWritingLines(raw: string, rows: readonly { kind: string }[]): Line[] {
  const lines: Line[] = []; let start = 0;
  raw.split('\n').forEach((text, index) => {
    const kind = rows[index]?.kind ?? 'note', indent = lead(text), end = start + text.length;
    let mark: [number, number] | null = null, head: Line['head'] = null;
    if (kind === 'task' || kind === 'subcheck') { const m = TASK_MARK.exec(text); if (m) mark = [start + indent, start + m[0].length]; }
    else if (kind === 'property') { const m = PROPERTY_MARK.exec(text); if (m) mark = [start + indent, start + m[0].length]; }
    else if (kind === 'scope') { const m = FOLDER_MARK.exec(text); head = 'scope'; if (m) mark = [start + indent, start + m[0].length]; }
    else if (kind === 'date') { head = 'date'; mark = [start, end]; }
    lines.push({ index, start, end, text, kind, indent, mark, head });
    start = end + 1;
  });
  return lines;
}

const lineAt = (lines: Line[], offset: number) => lines.find(line => offset >= line.start && offset <= line.end) ?? lines[lines.length - 1];
const lineEndAt = (raw: string, offset: number) => raw.indexOf('\n', offset) < 0 ? raw.length : raw.indexOf('\n', offset);

/** Whether deleting [start,end) changes this head line: its words, words of the line above joining it (the break before
 *  it goes with words left before the deletion) or words of the line below joining it (the break after it goes with words
 *  left after the deletion). An empty line taken away next to a head leaves the head as it was. */
function headTouched(raw: string, line: Line, start: number, end: number) {
  if (!line.head) return false;
  if (start < line.end && end > line.start) return true;
  const before = raw.slice(raw.lastIndexOf('\n', start - 1) + 1, start), after = raw.slice(end, lineEndAt(raw, end));
  if (line.index > 0 && start <= line.start - 1 && end > line.start - 1 && before.length) return true;
  return line.end < raw.length && start <= line.end && end > line.end && after.length > 0;
}

/** The leading-space, mark and join rules for deleting [from,to); then the 2-space step for the line it ends in. */
function widenDeletion(raw: string, lines: Line[], from: number, to: number) {
  let start = from, end = to;
  const first = lineAt(lines, start);
  // From a line's very start, whole lines go: a later line the deletion only reaches into the indent or mark of moves up
  // whole (nothing joins it), so it keeps them.
  if (start === first.start) {
    const last = lineAt(lines, end);
    if (last.index > first.index && end > last.start && end <= (last.mark && !last.head ? last.mark[1] : last.start + last.indent)) end = last.start;
    if (end === last.start && last.index > first.index) return { start, end };
  }
  if (start >= first.start && start < first.start + first.indent && end > first.start + first.indent) start = first.start + first.indent;
  for (let pass = 0; pass < 4; pass++) {
    const before = [start, end];
    for (const line of lines) {
      if (line.mark && !line.head) {
        const [ms, me] = line.mark;
        // A mark cut partly goes whole.
        if (start < me && end > ms && !(start <= ms && end >= me)) { start = Math.min(start, ms); end = Math.max(end, me); }
      }
      // A line joined to the one above loses its indent and mark; its words go on.
      const words = line.mark && !line.head ? line.mark[1] : line.start + line.indent;
      if (line.index > 0 && start <= line.start - 1 && end > line.start - 1 && end < words) end = words;
    }
    if (before[0] === start && before[1] === end) break;
  }
  const at = lineAt(lines, start);
  if (start <= at.start + at.indent) {
    const joined = raw.slice(at.start, start) + raw.slice(end, lineEndAt(raw, end));
    if (lead(joined) % 2 === 1 && joined.trim()) {
      if (raw[end] === ' ') end += 1;
      else if (start > at.start && raw[start - 1] === ' ') start -= 1;
    }
  }
  return { start, end };
}

/** The bar's ⇥ ⇤ for a line (with the lines under it), when the model takes it; kept (refused) otherwise. */
function shift(context: Context, line: Line, outdent: boolean, inputType: string, typed: WritingSplice): WritingPlan {
  if (line.head === 'scope') return { kind: 'keep', why: 'folder-indent' };
  if (line.head === 'date') return { kind: 'keep', why: 'date-head' };
  const caret = line.start + line.indent, fenced = context.rows.map(row => row.kind === 'fence');
  const plan = plans.planIndent(context.raw, { start: caret, end: caret }, context.rows, outdent, fenced);
  if (!plan) return { kind: 'keep', why: 'indent-refused' };
  const check = context.model.editTextResult(context.state, context.docId, plan.nextRaw, { folderText: true });
  if (check.reason !== null || context.model.raw(context.model.getDocument(check.state, context.docId)) !== plan.nextRaw) return { kind: 'keep', why: 'indent-refused' };
  return { kind: 'apply', splice: { start: plan.start, end: plan.end, text: plan.text }, inputType, why: outdent ? 'outdent' : 'indent',
    changed: plan.start !== typed.start || plan.end !== typed.end || plan.text !== typed.text, structural: outdent ? 'outdent' : 'indent', selectionAfter: plan.selectionAfter };
}

/** K2 [합치기]: only the touched head lines go, each whole with its line break; the lines under a folder head move out
 *  one step with it, so they stay where they were in the outline. The rest of a selection (or a paste over it) is
 *  not applied: the question was about the heads, and the words around them stay as they were. */
function mergePlan(context: Context, heads: Line[]) {
  const { raw, lines, rows } = context;
  const gone = new Set(heads.map(line => line.index)), moved = new Set<number>();
  for (const head of heads) if (head.head === 'scope') {
    for (let index = head.index + 1; index < (rows[head.index]?.subtreeEndIndex ?? head.index + 1); index++) if (!gone.has(index) && lines[index].indent >= 2) moved.add(index);
  }
  const first = Math.min(...gone), last = Math.max(...gone, ...moved);
  const kept = lines.slice(first, last + 1).filter(line => !gone.has(line.index)).map(line => moved.has(line.index) ? line.text.slice(2) : line.text);
  // The block from the first head to the last changed line becomes the kept lines; at the document's end the break
  // before the block goes instead of the one after it.
  if (kept.length) return { splice: { start: lines[first].start, end: lines[last].end, text: kept.join('\n') }, structural: moved.size > 0 || gone.size > 1 };
  if (last + 1 < lines.length) return { splice: { start: lines[first].start, end: lines[last + 1].start, text: '' }, structural: false };
  return { splice: { start: first > 0 ? lines[first].start - 1 : 0, end: raw.length, text: '' }, structural: false };
}

/** Plans one input on the document's accepted text. splice is what the browser would do; inputType its kind. */
export function planProgramWritingInput(model: Model, state: TextWorkspaceState, docId: string, splice: WritingSplice, inputType: string): WritingPlan {
  const doc = model.getDocument(state, docId);
  const as = (next: WritingSplice, why?: WritingWhy): WritingPlan => ({ kind: 'apply', splice: next, inputType, why,
    changed: next.start !== splice.start || next.end !== splice.end || next.text !== splice.text });
  if (!doc || inputType === 'insertCompositionText' || inputType.startsWith('history')) return as(splice);
  const raw = model.raw(doc), rows = model.rowMeta(state, docId) as readonly Row[], lines = programWritingLines(raw, rows);
  if (!lines.length || !rows.length) return as(splice);
  const context: Context = { model, state, docId, raw, lines, rows };
  const { start, end, text } = splice;
  if (end > start) {
    const touched = lines.filter(line => headTouched(raw, line, start, end));
    // Inside one head's own words (not its line breaks): a date head stays a date head or the key is kept (dates are
    // chosen, not half typed); a folder name is edited (it changes only when the line is finished with Enter).
    const own = touched.length === 1 && start >= touched[0].start && end <= touched[0].end ? touched[0] : null;
    if (own?.head === 'date') {
      const next = raw.slice(own.start, start) + text + raw.slice(end, own.end);
      return DATE_HEAD.test(next.trim()) && !/^ /.test(next) && !next.includes('\n') ? as(splice) : { kind: 'keep', why: 'date-head' };
    }
    if (own?.head === 'scope' && own.mark && start >= own.mark[1] && (raw.slice(own.mark[1], start) + text + raw.slice(end, own.end)).trim()) return as(splice);
    // A date head among them is the question (구획 합치기): only date heads go, a folder head beside one stays as it was.
    const heads = touched.some(line => line.head === 'date') ? touched.filter(line => line.head === 'date') : touched;
    if (heads.length) return { kind: 'ask', why: 'merge-section', heads: heads.map(line => ({ index: line.index, kind: line.head!, text: line.text })),
      range: { start, end }, merge: mergePlan(context, heads) };
    const line = lineAt(lines, start);
    // A paste whose selection starts inside a line (not at its very start) leaves the line's leading spaces and mark: it
    // goes in from the line's words on, as typing there does.
    if (text && start > line.start && end <= line.end) {
      const words = line.mark && !line.head ? line.mark[1] : line.start + line.indent;
      if (start < words) return planInsertion(context, { start: words, end: Math.max(words, end), text }, inputType, 'title-start', splice);
    }
    // ⌫ or Delete inside a line's leading spaces (nothing else) is ⇤.
    if (!text && start >= line.start && end <= line.start + line.indent && line.text.trim()) return shift(context, line, true, inputType, splice);
    const widened = widenDeletion(raw, lines, start, end);
    const next = { start: widened.start, end: widened.end, text };
    const why: WritingWhy | undefined = widened.start === start && widened.end === end ? undefined
      : lines.some(entry => entry.index > 0 && start <= entry.start - 1 && end > entry.start - 1) ? 'join'
        : lines.some(entry => entry.mark && !entry.head && widened.start <= entry.mark[0] && widened.end >= entry.mark[1] && !(start <= entry.mark[0] && end >= entry.mark[1])) ? 'mark' : 'indent';
    if (!text) return as(next, why);
    return planInsertion(context, next, inputType, why, splice);
  }
  return planInsertion(context, splice, inputType, undefined, splice);
}

/** Pasted (or typed) lines after the first take the indent where they land; a line with lines under it keeps them. */
function rebase(context: Context, line: Line, splice: WritingSplice): WritingSplice {
  const { raw, rows } = context, parts = splice.text.split('\n');
  if (parts.length < 2) return splice;
  const children = (rows[line.index]?.subtreeEndIndex ?? line.index + 1) > line.index + 1 && splice.end <= line.end;
  const base = ' '.repeat(line.indent + (line.mark && !line.head && children ? 2 : 0));
  const rest = parts.slice(1), common = Math.min(...rest.filter(part => part.trim()).map(lead), 64);
  const lastEnd = lineEndAt(raw, splice.end), tail = raw.slice(splice.end, lastEnd);
  let end = splice.end;
  const rebased = rest.map((part, index) => {
    const last = index === rest.length - 1;
    if (!part.trim() && !(last && tail.trim())) return '';
    if (last && tail.trim() && !part.trim()) { end += lead(tail); return base; }
    return base + part.slice(Math.min(common, lead(part)));
  });
  const first = splice.start === line.start + line.indent ? parts[0].trimStart() : parts[0];
  return { start: splice.start, end, text: [first, ...rebased].join('\n') };
}

function planInsertion(context: Context, splice: WritingSplice, inputType: string, why: WritingWhy | undefined, typed: WritingSplice): WritingPlan {
  const { raw, lines } = context;
  const as = (next: WritingSplice, reason?: WritingWhy): WritingPlan => ({ kind: 'apply', splice: next, inputType, why: reason ?? why,
    changed: next.start !== typed.start || next.end !== typed.end || next.text !== typed.text });
  const { start, end, text } = splice, line = lineAt(lines, start);
  if (!text) return as(splice);
  const space = text === ' ' || text === '\t', inLead = end === start && start >= line.start && start <= line.start + line.indent;
  // Space or Tab in a line's leading spaces is ⇥ (a blank line just takes two spaces).
  if (space && inLead) {
    if (!line.text.trim()) return line.kind === 'fence' ? as(splice) : as({ start, end, text: '  ' }, text === '\t' ? 'indent' : undefined);
    return shift(context, line, false, inputType, typed);
  }
  if (line.head === 'date' && end === start) {
    if (text === '\n') return as(start === line.start ? splice : { start: line.end, end: line.end, text }, start === line.start ? undefined : 'date-head');
    if (start === line.start && text.endsWith('\n')) return as(splice);
    const next = raw.slice(line.start, start) + text + raw.slice(start, line.end);
    if (!next.includes('\n') && DATE_HEAD.test(next.trim()) && !/^ /.test(next)) return as(splice);
    return { kind: 'keep', why: 'date-head' };
  }
  if (line.head === 'scope' && line.mark && end === start && start < line.mark[1]) {
    if (start === line.start && text.includes('\n')) return as({ start, end, text: text.endsWith('\n') ? text : text + '\n' }, 'line-start');
    if (text === '\n') return start <= line.start ? as(splice) : as({ start: line.end, end: line.end, text }, 'folder-mark');
    return as({ start: line.mark[1], end: line.mark[1], text: text.replace(/\n[\s\S]*$/, '') || text }, 'folder-mark');
  }
  if (line.mark && !line.head && end === start && start >= line.start && start < line.mark[1]) {
    // Lines pasted (or Enter) at a structured line's start go above it as lines of their own, at its indent.
    if (text.includes('\n') && start === line.start) {
      const body = text.endsWith('\n') ? text.slice(0, -1) : text, parts = body.split('\n'), common = Math.min(...parts.filter(part => part.trim()).map(lead), 64);
      const rebased = parts.map(part => part.trim() ? ' '.repeat(line.indent) + part.slice(Math.min(common, lead(part))) : '').join('\n');
      return as({ start, end, text: rebased + '\n' }, text === '\n' ? undefined : 'line-start');
    }
    if (text.startsWith('\n')) return as({ start: line.start, end: line.start, text: '\n' }, 'line-start');
    // Typing (or pasting) into a mark or the indent before it goes to the title's start.
    return as(rebase(context, line, { start: line.mark[1], end: line.mark[1], text: text.includes('\n') ? text : text }), 'title-start');
  }
  if (text.includes('\n') && text !== '\n') {
    const next = rebase(context, line, splice);
    return as(next, next.text !== splice.text || next.end !== splice.end ? 'paste-indent' : undefined);
  }
  // A paste at a line's words keeps the line's indent: its own leading spaces go.
  if (text.length > 1 && start === line.start + line.indent && lead(text) && line.text.trim()) return as({ start, end, text: text.trimStart() }, 'paste-indent');
  return as(splice);
}
