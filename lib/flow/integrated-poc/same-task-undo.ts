import type { ProgramData, ProgramTransition } from './contract';
import { programDate } from './program-data';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** F8 W-CARRY-10 (int8b, QA-int8 0-8): what a '같은 일 n줄' check left on one line: the line's text and its record of
 *  that day (null: none). */
export type ProgramSameTaskMark = { line: string; percent: number | null };
export type ProgramSameTaskProof = { day: string; tasks: Record<string, { before: ProgramSameTaskMark; after: ProgramSameTaskMark }> };

function sameTaskMark(text: TextWorkspaceState, taskId: string, day: string): ProgramSameTaskMark | null {
  for (const doc of text.documents) {
    const line = doc.lines.find(entry => entry.id === taskId);
    if (line) return { line: line.text, percent: text.progressRecords.find(record => record.taskId === taskId && record.date === day)?.percent ?? null };
  }
  return null;
}

/** The proof of one check: each line before and after it (the check writes one record of `day` per line). */
export function programSameTaskProof(before: TextWorkspaceState, after: TextWorkspaceState, ids: readonly string[], day: string): ProgramSameTaskProof | null {
  const tasks: ProgramSameTaskProof['tasks'] = {};
  for (const id of ids) {
    const was = sameTaskMark(before, id, day), now = sameTaskMark(after, id, day);
    if (!was || !now) return null;
    tasks[id] = { before: was, after: now };
  }
  return ids.length ? { day, tasks } : null;
}

/** One 되돌리기 for the whole check: each line and its record of that day go back to what they were (a record the check
 *  added goes; one it changed gets its value back; other days' records are not touched), in one save. Only while every
 *  line is still as the check left it; any change since is a conflict and nothing changes. */
export function undoProgramSameTasks(data: ProgramData, input: ProgramPrivateMutationBase & { proof: ProgramSameTaskProof }): ProgramTransition<string> {
  const { proof } = input, ids = Object.keys(proof.tasks);
  return transitionProgramPrivateSpace(data, input, 'private-same-task-undo', proof, space => {
    if (!ids.length || !programDate(proof.day)) return { result: '', reason: 'invalid' };
    const records = space.text.progressRecords.slice();
    const documents = space.text.documents.map(doc => ({ ...doc, lines: doc.lines.slice() }));
    for (const id of ids) {
      const { before, after } = proof.tasks[id], now = sameTaskMark(space.text, id, proof.day);
      if (!now || now.line !== after.line || now.percent !== after.percent) return { result: id, reason: 'conflict' };
      const at = records.findIndex(record => record.taskId === id && record.date === proof.day);
      if (before.percent === null) { if (at >= 0) records.splice(at, 1); }
      else if (at >= 0) records[at] = { ...records[at], percent: before.percent };
      else return { result: id, reason: 'conflict' };
      for (const doc of documents) {
        const index = doc.lines.findIndex(line => line.id === id);
        if (index >= 0) doc.lines[index] = { ...doc.lines[index], text: before.line };
      }
    }
    const next: TextWorkspaceState = { ...space.text, documents, progressRecords: records };
    if (!M.validate(next)) return { result: ids[0], reason: 'invalid' };
    space.text = next;
    return { result: ids[0] };
  });
}
