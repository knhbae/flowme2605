import type { TextEditorRowMeta, TextWorkspaceState } from './text-workspace';

/** Writing model A keyboard bar / toolbar buttons, in bar order (☐ ← → ↵ ＋). */
export type WritingBarAction = 'task' | 'outdent' | 'indent' | 'enter' | 'menu';
/** `markerLock`: why ☐ cannot act on this line. `structureLock`: why ← or → is off beyond the usual
 *  first-item and depth rules (a folder view keeps saved lines' structure). */
export type WritingBarLine = { canOutdent: boolean; canIndent: boolean; isTask: boolean; markerLock: string | null; structureLock?: string | null };

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
 * when input settles. Pressing again while held never queues a second run. The held press keeps
 * the target it was aimed at, so it can be checked before it runs. */
export function createWritingBarHold<T = WritingBarTarget>() {
  let held: { action: WritingBarAction; target: T | null } | null = null;
  return {
    press(action: WritingBarAction, busy: boolean, target: T | null = null): WritingBarAction | null {
      if (busy) { held = { action, target }; return null; }
      held = null; return action;
    },
    release(busy: boolean): WritingBarAction | null {
      if (busy || !held) return null;
      const action = held.action; held = null; return action;
    },
    cancel() { held = null; },
    held: () => held?.action ?? null,
    target: () => held?.target ?? null,
  };
}

/** Where a held press was aimed: the editor surface, the caret's line, and everything above that line. */
export type WritingBarTarget = { surface: object; lineIndex: number; before: string };
export function writingBarTarget(surface: object, value: string, caret: number): WritingBarTarget {
  const lineStart = value.lastIndexOf('\n', Math.max(0, caret) - 1) + 1, before = value.slice(0, lineStart);
  return { surface, lineIndex: before.split('\n').length - 1, before };
}

/** Whether a held press may run now. It runs only on the surface and line it was aimed at, with the
 * text above that line unchanged and focus still there (or on the bar). Composition inside that line
 * is fine. It waits while the surface is not editable yet (a folder region right after its save),
 * and is dropped, never moved, when the caret, the surface or focus went elsewhere. */
export function heldTargetVerdict(target: WritingBarTarget | null, now: { surface: object | null; value: string; caret: number;
  editable: boolean; connected: boolean; focusHere: boolean }): 'run' | 'wait' | 'cancel' {
  if (!target || !now.connected || !now.focusHere) return 'cancel';
  if (!now.surface || !now.editable) return 'wait';
  if (now.surface !== target.surface) return 'cancel';
  const current = writingBarTarget(now.surface, now.value, now.caret);
  return current.lineIndex === target.lineIndex && current.before === target.before ? 'run' : 'cancel';
}

/** Region-safe bar line: in a folder view only what the region's own check would accept stays on. */
export function folderBarLine(base: WritingBarLine, raw: string, caret: number, accepts: (next: string) => boolean, reason: string): WritingBarLine {
  const lines = raw.split('\n'), index = raw.slice(0, Math.max(0, caret)).split('\n').length - 1, text = lines[index] ?? '';
  const withLine = (next: string) => [...lines.slice(0, index), next, ...lines.slice(index + 1)].join('\n');
  const toggle = toggleTaskLine(raw, caret), toggled = raw.slice(0, toggle.start) + toggle.text + raw.slice(toggle.end);
  const canIndent = base.canIndent && accepts(withLine(`  ${text}`));
  const canOutdent = base.canOutdent && accepts(withLine(text.replace(/^( {1,2}|\t)/, '')));
  return { ...base, canIndent, canOutdent, markerLock: base.markerLock ?? (accepts(toggled) ? null : reason),
    structureLock: base.canIndent && !canIndent || base.canOutdent && !canOutdent ? reason : null };
}
