import type { ProgramPrivateSpace } from './contract';
import { programExecutionTasks, programTaskProgress } from './execution';
import { programDueLabel, type ProgramDueLabel } from './due-date';
import { programDate } from './program-data';
import type { TextTask } from './text-workspace';

export type ProgramDueSoonTask = { task: TextTask; deadline: ProgramDueLabel };

/** W-TXT-11: a read-only extra view. Source day/folder/order and progress stay untouched. */
export function programDueSoonTasks(space: ProgramPrivateSpace, today: string): ProgramDueSoonTask[] {
  if (!programDate(today)) return [];
  const retained = new Set(Object.values(space.retentionDocuments ?? {}));
  const progress = programTaskProgress(space.text), seen = new Set<string>();
  return programExecutionTasks(space).flatMap(task => {
    const deadline = programDueLabel(task.due, today), key = JSON.stringify([task.docId, task.id]);
    if (!deadline || deadline.days > 3 || task.done || progress(task.id).current === 100
      || space.documentTrash?.[task.docId] || retained.has(task.docId) || seen.has(key)) return [];
    seen.add(key);
    return [{ task, deadline }];
  }).sort((a, b) => a.deadline.days - b.deadline.days);
}
