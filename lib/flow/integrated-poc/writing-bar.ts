import type { TextEditorRowMeta, TextWorkspaceState } from './text-workspace';

/** Writing model A keyboard bar / toolbar buttons, in bar order (☐ ← → ↵ ＋). */
export type WritingBarAction = 'task' | 'outdent' | 'indent' | 'enter' | 'menu';
export type WritingBarLine = { canOutdent: boolean; canIndent: boolean; isTask: boolean; markerLock: string | null };

const TASK_LINE = /^([ \t]*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](?:\s+(.*))?$/;
const MAX_DEPTH = 32;
const leading = (line: string) => /^[ \t]*/.exec(line)![0];
const columns = (prefix: string) => prefix.replace(/\t/g, '  ').length;

/** Why ☐ must not take the task mark off this line, or null. Removing it would orphan the
 * task's progress records or the other documents that point at it. */
export function taskMarkerLock(meta: TextEditorRowMeta | undefined, workspace: Pick<TextWorkspaceState, 'progressRecords' | 'bindings'>, docId: string): string | null {
  if (!meta) return null;
  if (meta.kind === 'reference') return '다른 문서의 할 일을 가리키는 줄이라 할 일 표시를 지울 수 없습니다.';
  const id = meta.progressTargetId;
  if (!id) return null;
  if (workspace.progressRecords.some(record => record.taskId === id)) return '진행 기록이 있는 할 일이라 할 일 표시를 지울 수 없습니다.';
  if (workspace.bindings.some(binding => binding.kind === 'task' && binding.taskId === id && binding.docId !== docId)) return '다른 문서에서 연결한 할 일이라 할 일 표시를 지울 수 없습니다.';
  return null;
}

/** Bar state for the caret's line: ← needs some indentation, → needs a previous non-blank
 * line at least as deep (the first item cannot be indented). The editor still checks each edit. */
export function writingBarLine(raw: string, caret: number, lock: (isTask: boolean) => string | null): WritingBarLine {
  const lines = raw.split('\n'), index = raw.slice(0, Math.max(0, caret)).split('\n').length - 1, text = lines[index] ?? '';
  const own = columns(leading(text));
  let previous = index - 1;
  while (previous >= 0 && !lines[previous].trim()) previous -= 1;
  const isTask = TASK_LINE.test(text);
  return {
    canOutdent: own >= 2,
    canIndent: previous >= 0 && own / 2 < MAX_DEPTH && columns(leading(lines[previous])) >= own,
    isTask, markerLock: lock(isTask),
  };
}

/** ☐: the caret's line becomes a task ("- [ ] " like typing it), or a task line becomes plain text.
 * The caret keeps its place in the line's own text. */
export function toggleTaskLine(raw: string, caret: number): { start: number; end: number; text: string; caret: number } {
  const lines = raw.split('\n'), index = raw.slice(0, Math.max(0, caret)).split('\n').length - 1, text = lines[index] ?? '';
  const start = lines.slice(0, index).reduce((sum, line) => sum + line.length + 1, 0), inLine = caret - start;
  const task = TASK_LINE.exec(text);
  const indent = task ? task[1] : leading(text);
  const bullet = !task && /^-\s+/.exec(text.slice(indent.length));
  const oldBody = task ? text.length - (task[3] ?? '').length : indent.length + (bullet ? bullet[0].length : 0);
  const next = task ? indent + (task[3] ?? '') : `${indent}- [ ] ${text.slice(oldBody)}`;
  const newBody = task ? indent.length : indent.length + 6;
  return { start, end: start + text.length, text: next, caret: start + Math.min(next.length, newBody + Math.max(0, inLine - oldBody)) };
}

/** A press while input is busy (IME composition or a save) is held, shown pressed, and runs once
 * when input settles. Pressing again while held never queues a second run. */
export function createWritingBarHold() {
  let held: WritingBarAction | null = null;
  return {
    press(action: WritingBarAction, busy: boolean): WritingBarAction | null {
      if (busy) { held = action; return null; }
      held = null; return action;
    },
    release(busy: boolean): WritingBarAction | null {
      if (busy || !held) return null;
      const action = held; held = null; return action;
    },
    cancel() { held = null; },
    held: () => held,
  };
}
