/** Sheet '추가' (11/10, a real-use report: "팝업에서 항목을 추가할 때마다 빈 줄이 계속 추가"): an option of the line menu
 *  writes its line's start ('- [ ] ', '- 메모: ', '- ') with the caret after it. Left as it was written when the caret
 *  goes to another line, that start is taken away again, so nothing piles up; one ↶ brings it back. */
// int5 QA P3-INT5-2: the menu's 소제목 ('## ') and 일반 글 (an empty line) starts too. Only the line the menu wrote, untouched,
// is ever taken away, so an empty line elsewhere is never one of these.
export const PROGRAM_SCAFFOLD_LINE = /^ *- (?:\[ \] |메모: )?$|^#{1,6} $|^$/;

/** The range that removes line `index` of `raw` (with one line break: its own, or the one before it at the end), and
 *  the selection moved with the text; null when there is no such line or it is not a bare start. */
export function programScaffoldRemoval(raw: string, index: number, selection: { start: number; end: number }) {
  const lines = raw.split('\n');
  if (!Number.isInteger(index) || index < 0 || index >= lines.length || !PROGRAM_SCAFFOLD_LINE.test(lines[index])) return null;
  const start = lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0), last = index === lines.length - 1;
  if (last && index === 0) return null;
  const from = last ? start - 1 : start, to = last ? start + lines[index].length : start + lines[index].length + 1, removed = to - from;
  const move = (offset: number) => offset <= from ? offset : offset >= to ? offset - removed : from;
  return { from, to, nextRaw: raw.slice(0, from) + raw.slice(to), selection: { start: move(selection.start), end: move(selection.end), direction: 'none' as const } };
}
