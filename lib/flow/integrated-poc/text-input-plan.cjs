/* Pure, transient input plans shared by the current native text editor.
 * These plans contain no persisted syntax, workspace identity or write authority. */
'use strict';

const PROPERTY = /^(?: {2,}|\t+)-\s+(?:날짜|메모|시간):/;
const MAX_DEPTH = 32;
const indentation = line => {
  const prefix = /^[ \t]*/.exec(line)[0];
  return { prefix, columns: prefix.replace(/\t/g, '  ').length };
};
const lineAt = (raw, offset) => raw.slice(0, Math.max(0, offset)).split('\n').length - 1;
function rangeOfLine(lines, index) {
  let start = 0;
  for (let i = 0; i < index; i++) start += lines[i].length + 1;
  return { start, end: start + lines[index].length };
}
function validSelection(raw, selection) {
  return selection && Number.isInteger(selection.start) && Number.isInteger(selection.end) &&
    selection.start >= 0 && selection.end >= selection.start && selection.end <= raw.length;
}
const sameSelection = (a, b) => a.start === b.start && a.end === b.end && (a.direction || 'none') === (b.direction || 'none');

/** Repeat the existing memo property spelling; the parser joins these lines. */
function planMemoEnter(raw, selection, meta) {
  if (typeof raw !== 'string' || !validSelection(raw, selection) || selection.start !== selection.end || !meta || meta.kind !== 'property') return null;
  const lines = raw.split('\n'), range = rangeOfLine(lines, lineAt(raw, selection.start));
  const match = /^( {2,})-\s+메모:/.exec(lines[lineAt(raw, selection.start)]);
  if (!match || match[1].length % 2 || selection.start !== range.end) return null;
  const text = `\n${match[1]}- 메모: `, caret = selection.start + text.length;
  return { start: selection.start, end: selection.end, text, nextRaw: raw.slice(0, selection.start) + text + raw.slice(selection.end),
    selectionAfter: { start: caret, end: caret, direction: 'none' } };
}

/** memo-enter (11/10): Enter on an empty memo line leaves the memo. The empty line goes and the owner's next
 * sibling task opens after the owner's block, as Enter at a titled task's end does (Shift+Enter still continues the
 * memo). Only that exact shape: an indented '- 메모:' with nothing after it, the caret at its end, no selection, and a
 * titled task or subcheck one level up owning it; anything else is null and the other rules apply. */
function planMemoExit(raw, selection, meta) {
  if (typeof raw !== 'string' || !validSelection(raw, selection) || selection.start !== selection.end || !meta || meta.kind !== 'property') return null;
  const lines = raw.split('\n'), index = lineAt(raw, selection.start), range = rangeOfLine(lines, index);
  const memo = /^( {2,})-\s+메모:\s*$/.exec(lines[index]);
  if (!memo || memo[1].length % 2 || selection.start !== range.end) return null;
  const owner = memo[1].slice(2), deeper = line => line.trim() !== '' && /^ */.exec(line)[0].length > owner.length;
  let top = index - 1;
  while (top >= 0 && deeper(lines[top])) top -= 1;
  if (top < 0 || !new RegExp(`^${owner}-\\s+\\[(?:[ xX]|\\d+(?:\\.\\d+)?%?)\\]\\s+\\S`).test(lines[top])) return null;
  let end = index + 1;
  while (end < lines.length && deeper(lines[end])) end += 1;
  const last = rangeOfLine(lines, end - 1), text = [...lines.slice(index + 1, end), `${owner}- [ ] `].join('\n'), caret = range.start + text.length;
  return { start: range.start, end: last.end, text, nextRaw: raw.slice(0, range.start) + text + raw.slice(last.end),
    selectionAfter: { start: caret, end: caret, direction: 'none' } };
}

/** enter1 (11/10, 사용자 '권장대로'): Enter at the end of a date or time property opens the owner's next task — after the
 * owner's block, as Enter at the end of the owner's title does — instead of a '- ' line. Null when it is not that. */
function planPropertyEnter(raw, selection) {
  if (typeof raw !== 'string' || !validSelection(raw, selection) || selection.start !== selection.end) return null;
  const lines = raw.split('\n'), index = lineAt(raw, selection.start), range = rangeOfLine(lines, index);
  const property = /^( {2,})-\s+(?:날짜|시간):/.exec(lines[index]);
  if (!property || property[1].length % 2 || selection.start !== range.end) return null;
  const owner = property[1].slice(2), deeper = line => line.trim() !== '' && /^ */.exec(line)[0].length > owner.length;
  let top = index - 1;
  while (top >= 0 && deeper(lines[top])) top -= 1;
  if (top < 0 || !new RegExp(`^${owner}-\\s+\\[(?:[ xX]|\\d+(?:\\.\\d+)?%?)\\]\\s+\\S`).test(lines[top])) return null;
  let end = index + 1;
  while (end < lines.length && deeper(lines[end])) end += 1;
  const at = rangeOfLine(lines, end - 1).end, text = `\n${owner}- [ ] `, caret = at + text.length;
  return { start: at, end: at, text, nextRaw: raw.slice(0, at) + text + raw.slice(at), selectionAfter: { start: caret, end: caret, direction: 'none' } };
}

/** Shift+Enter at the end of a titled task opens a memo line for that task, after its direct
 * properties, so an existing memo continues instead of being split. */
function planTaskMemoEnter(raw, selection, meta) {
  if (typeof raw !== 'string' || !validSelection(raw, selection) || selection.start !== selection.end || !meta || meta.kind !== 'task') return null;
  const lines = raw.split('\n'), index = lineAt(raw, selection.start), range = rangeOfLine(lines, index);
  const task = /^( *)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](\s+)(.*)$/.exec(lines[index]);
  if (!task || !task[4].trim() || task[1].length % 2 || selection.start !== range.end) return null;
  const property = new RegExp(`^${task[1]}  -\\s+(?:날짜|메모|시간):`);
  let last = index;
  while (last + 1 < lines.length && property.test(lines[last + 1])) last += 1;
  const at = rangeOfLine(lines, last).end, text = `\n${task[1]}  - 메모: `, caret = at + text.length;
  return { start: at, end: at, text, nextRaw: raw.slice(0, at) + text + raw.slice(at),
    selectionAfter: { start: caret, end: caret, direction: 'none' } };
}

/** A sibling task belongs after the existing Item's properties and children. */
function planTaskEnter(raw, selection, meta) {
  if (typeof raw !== 'string' || !validSelection(raw, selection) || selection.start !== selection.end ||
    meta && meta.kind && !['task', 'subcheck', 'reference'].includes(meta.kind)) return null;
  const lines = raw.split('\n'), index = lineAt(raw, selection.start), range = rangeOfLine(lines, index);
  const task = /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](\s+)(.*)$/.exec(lines[index]);
  if (!task || !task[4].trim() || selection.start !== range.end) return null;
  let endIndex = meta && Number.isInteger(meta.subtreeEndIndex) ? meta.subtreeEndIndex : index + 1;
  if (endIndex <= index || endIndex > lines.length) return null;
  // Match the model's same-level insertion boundary without removing separators.
  while (endIndex > index + 1 && !lines[endIndex - 1].trim()) endIndex -= 1;
  const end = rangeOfLine(lines, endIndex - 1).end, text = `\n${task[1]}- [ ] `, caret = end + text.length;
  return { start: end, end, text, nextRaw: raw.slice(0, end) + text + raw.slice(end),
    selectionAfter: { start: caret, end: caret, direction: 'none' } };
}

/** Middle Enter keeps a strict direct-property block under its original task. */
function planTaskPropertySplit(raw, selection, meta) {
  if (typeof raw !== 'string' || !validSelection(raw, selection) || selection.start !== selection.end ||
      !meta || meta.kind !== 'task' || meta.isCanonical !== true || meta.depth !== 0 || meta.scopeMismatch) return null;
  const lines = raw.split('\n'), index = lineAt(raw, selection.start), range = rangeOfLine(lines, index);
  const task = /^- \[ \] (.*)$/.exec(lines[index]), cut = selection.start - range.start;
  if (!task || cut <= 6 || cut >= lines[index].length || !lines[index].slice(6, cut).trim() || !lines[index].slice(cut).trim()) return null;
  const endIndex = meta.subtreeEndIndex;
  if (!Number.isInteger(endIndex) || endIndex <= index + 1 || endIndex > lines.length ||
      lines.slice(index + 1, endIndex).some(line => !/^ {2}-\s+(?:날짜|메모|시간):/.test(line))) return null;
  const endPlan = planTaskEnter(raw, { start: range.end, end: range.end, direction: 'none' }, meta);
  if (!endPlan) return null;
  const properties = raw.slice(range.end, endPlan.start), text = properties + endPlan.text + lines[index].slice(cut);
  const caret = selection.start + properties.length + endPlan.text.length;
  return { start: selection.start, end: endPlan.start, text,
    nextRaw: raw.slice(0, selection.start) + text + raw.slice(endPlan.start),
    selectionAfter: { start: caret, end: caret, direction: 'none' } };
}

/** A lease is valid only for the exact result, caret and mutation epoch.
 * An immediate inverse reuses its original row span instead of absorbing a
 * formerly following sibling that now appears structurally nested. */
function planIndent(raw, selection, metadata, outdent, fenced, lease, epoch) {
  if (typeof raw !== 'string' || !validSelection(raw, selection)) return null;
  const lines = raw.split('\n'), rows = metadata || {}, fences = fenced || [];
  const inverse = lease && lease.raw === raw && lease.epoch === epoch && lease.outdent !== Boolean(outdent) && sameSelection(lease.selection, selection);
  let startLine = inverse ? lease.startLine : lineAt(raw, selection.start);
  let endLine = inverse ? lease.endLine : lineAt(raw, selection.end > selection.start ? selection.end - 1 : selection.end);
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 0 || endLine < startLine || endLine >= lines.length) return null;
  if (!inverse) {
    const nonempty = lines.slice(startLine, endLine + 1).filter(line => line.trim());
    const baseColumns = nonempty.length ? Math.min(...nonempty.map(line => indentation(line).columns)) : Infinity;
    for (let index = startLine; index <= endLine; index++) {
      const meta = rows[index];
      if (meta && Number.isInteger(meta.subtreeEndIndex) && meta.subtreeEndIndex > index && meta.subtreeEndIndex <= lines.length) endLine = Math.max(endLine, meta.subtreeEndIndex - 1);
    }
    for (let index = endLine + 1; index < lines.length; index++) {
      if (!lines[index].trim()) continue;
      if (indentation(lines[index]).columns <= baseColumns) break;
      endLine = index;
    }
  }
  const first = rangeOfLine(lines, startLine), last = rangeOfLine(lines, endLine), edits = [];
  let offset = first.start;
  const changed = lines.slice(startLine, endLine + 1).map((line, relative) => {
    const prefix = indentation(line), index = startLine + relative;
    const limit = rows[index] && rows[index].kind === 'property' || PROPERTY.test(line) ? MAX_DEPTH + 1 : MAX_DEPTH;
    if (!line.trim() && endLine > startLine) { offset += line.length + 1; return line; }
    if (fences[index] || prefix.prefix.includes('\t') || prefix.columns % 2 || (outdent ? prefix.columns < 2 : prefix.columns / 2 >= limit)) return null;
    edits.push({ offset, removed: outdent ? 2 : 0, inserted: outdent ? 0 : 2 });
    offset += line.length + 1;
    return outdent ? line.slice(2) : `  ${line}`;
  });
  if (changed.includes(null)) return null;
  const text = changed.join('\n'), nextRaw = raw.slice(0, first.start) + text + raw.slice(last.end);
  const translate = position => position + edits.reduce((delta, edit) => position < edit.offset ? delta : delta + edit.inserted - Math.min(edit.removed, position - edit.offset), 0);
  const selectionAfter = { start: translate(selection.start), end: translate(selection.end), direction: selection.direction || 'none' };
  return { start: first.start, end: last.end, text, nextRaw, selectionAfter, startLine, endLine, outdent: Boolean(outdent) };
}
function indentLease(plan, epoch) {
  return { raw: plan.nextRaw, selection: { ...plan.selectionAfter }, startLine: plan.startLine, endLine: plan.endLine, outdent: plan.outdent, epoch };
}

module.exports = Object.freeze({ planMemoEnter, planMemoExit, planPropertyEnter, planTaskMemoEnter, planTaskEnter, planTaskPropertySplit, planIndent, indentLease });
