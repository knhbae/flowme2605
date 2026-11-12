import type { ProgramData, ProgramPrivateSpace, ProgramTransition } from './contract';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { programDocumentContentLock, programReferenceExecutionAccess } from './reference-execution-guard';
import { programTaskRepeatMember } from './task-date-move';
import { textWorkspaceModel as M } from './text-workspace';

/** Redesign 1 (총괄 11/12, REDESIGN-TECH-1 §1): progress lives in the text. A box line (`[ ]`, `[x]`) whose latest progress
 *  record says otherwise takes that value into its text, as a progress entry now writes it: 1-99 as `[n%]`, 100 as `[x]`,
 *  0 as `[ ]`. The records stay as they are (they are the history). A numeric line already is the source; a reference
 *  line follows its task; a repeat line, a task not active here and a locked document are left alone. */
export type ProgramProgressTextChange = { lineId: string; title: string; before: string; after: string; percent: number; date: string };

const TASK = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/;

/** The box lines of one document whose text the latest record would change, in line order. */
export function programProgressTextPlan(space: ProgramPrivateSpace, documentId: string): ProgramProgressTextChange[] {
  const doc = M.getDocument(space.text, documentId);
  if (!doc || programDocumentContentLock(space, documentId) !== 'active') return [];
  const latest = new Map<string, { date: string; percent: number }>();
  for (const record of space.text.progressRecords) {
    const was = latest.get(record.taskId);
    if (!was || record.date > was.date) latest.set(record.taskId, record);
  }
  const targets = new Set(M.rowMeta(space.text, documentId).filter(row => row.progressTargetId === row.id).map(row => row.id));
  const out: ProgramProgressTextChange[] = [];
  for (const line of doc.lines) {
    const record = latest.get(line.id), parts = TASK.exec(line.text);
    if (!record || !parts || !/^[ xX]$/.test(parts[2]) || !targets.has(line.id)) continue;
    if (programReferenceExecutionAccess(space, line.id).kind !== 'active' || programTaskRepeatMember(space, line.id)) continue;
    const mark = record.percent > 0 && record.percent < 100 ? `${record.percent}%`
      : /^[xX]$/.test(parts[2]) === (record.percent === 100) ? parts[2] : record.percent === 100 ? 'x' : ' ';
    const after = parts[1] + mark + parts[3] + parts[4] + parts[5];
    if (after !== line.text) out.push({ lineId: line.id, title: parts[4], before: line.text, after, percent: record.percent, date: record.date });
  }
  return out;
}

/** The plan, written into one document in one save: only while the plan reads the same now (each line as it was shown,
 *  nothing more to change); the progress records are not touched. */
export function applyProgramProgressText(data: ProgramData, input: ProgramPrivateMutationBase & { documentId: string; changes: ProgramProgressTextChange[] }): ProgramTransition<string> {
  const fields = { documentId: input.documentId, changes: input.changes.map(change => ({ lineId: change.lineId, before: change.before, after: change.after })) };
  return transitionProgramPrivateSpace(data, input, 'private-progress-text', fields, space => {
    if (!input.changes.length) return { result: input.documentId, reason: 'invalid' };
    const doc = M.getDocument(space.text, input.documentId);
    if (!doc) return { result: input.documentId, reason: 'missing' };
    if (programDocumentContentLock(space, input.documentId) !== 'active') return { result: input.documentId, reason: 'unresolved' };
    const now = programProgressTextPlan(space, input.documentId);
    const same = now.length === input.changes.length && now.every((change, index) => change.lineId === input.changes[index].lineId
      && change.before === input.changes[index].before && change.after === input.changes[index].after);
    if (!same) return { result: input.documentId, reason: 'conflict' };
    const after = new Map(now.map(change => [change.lineId, change.after]));
    const lines = doc.lines.map(line => after.has(line.id) ? { id: line.id, text: after.get(line.id)! } : line);
    const next = { ...space.text, documents: space.text.documents.map(item => item.id === doc.id ? { ...item, lines } : item),
      flows: space.text.flows.map(item => item.id === doc.id ? { ...item, lines } : item) };
    if (!M.validate(next)) return { result: input.documentId, reason: 'invalid' };
    space.text = next;
    return { result: input.documentId };
  });
}
