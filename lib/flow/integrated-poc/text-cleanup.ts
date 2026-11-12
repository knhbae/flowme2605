import { programClone, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { transitionProgramPrivateSpace, type ProgramPrivateMutationBase } from './private-space';
import { snapshotProgramDocumentRevisions } from './document-revisions';
import { programProgressTextPlan, type ProgramProgressTextChange } from './progress-text';
import { applyProgramDateLineChoices, programDateLineAccountPlan, programDateLinesKeepLines, type ProgramDateLineChoices, type ProgramDateLinePlan } from './date-property-migration';
import { programStateHash, programTaskRepeatMembers } from './task-date-move';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** Redesign 1 + 3 (W-TXT-01·03, 총괄 11/12): the account's writing is brought to the new rules once, as one list asked
 *  when the app opens: a box line's progress (latest record 1-99) into its text as [n%], and the '- 날짜:' lines
 *  (date-property-migration.ts). [바꾸기] takes a snapshot of every document it changes (a saved revision each, in the
 *  same save), applies all of it in one save, and 되돌리기 puts the whole writing back in one save. */
export type ProgramTextCleanupPlan = {
  progress: { documentId: string; title: string; changes: ProgramProgressTextChange[] }[];
  dates: ProgramDateLinePlan[];
  progressLines: number; dateLines: number;
};

/** The account's list; null when nothing is left to bring over. */
export function programTextCleanupPlan(space: ProgramPrivateSpace): ProgramTextCleanupPlan | null {
  const repeats = programTaskRepeatMembers(space);
  const progress = space.text.documents.flatMap(doc => {
    const changes = programProgressTextPlan(space, doc.id, repeats);
    return changes.length ? [{ documentId: doc.id, title: doc.title || '새 문서', changes }] : [];
  });
  const dates = programDateLineAccountPlan(space);
  if (!progress.length && !dates.length) return null;
  return { progress, dates, progressLines: progress.reduce((sum, doc) => sum + doc.changes.length, 0), dateLines: dates.reduce((sum, doc) => sum + doc.lines, 0) };
}

/** The documents a plan changes, in document order. */
export const programTextCleanupDocuments = (plan: ProgramTextCleanupPlan) => [...new Set([...plan.progress.map(doc => doc.documentId), ...plan.dates.map(doc => doc.documentId)])];

/** The plan, with these date choices, on the text (no snapshot): progress tokens first, then the date lines. Null when
 *  anything would change that should not (W-TXT-03's line check included). */
export function applyProgramTextCleanupText(text: TextWorkspaceState, plan: ProgramTextCleanupPlan, choices: ProgramDateLineChoices): TextWorkspaceState | null {
  let next = text;
  for (const doc of plan.progress) {
    const after = new Map(doc.changes.map(change => [change.lineId, change])), current = M.getDocument(next, doc.documentId);
    if (!current || doc.changes.some(change => current.lines.find(line => line.id === change.lineId)?.text !== change.before)) return null;
    next = { ...next, documents: next.documents.map(item => item.id === doc.documentId ? { ...item, lines: item.lines.map(line => after.has(line.id) ? { id: line.id, text: after.get(line.id)!.after } : line) } : item) };
  }
  if (!M.validate(next) || !programSame(text.progressRecords, next.progressRecords)) return null;
  const progressed = next;
  for (const doc of plan.dates) {
    const changed = applyProgramDateLineChoices(next, doc, choices);
    if (!changed) return null;
    next = changed;
  }
  return programDateLinesKeepLines(progressed, next) && M.validate(next) ? next : null;
}

/** [바꾸기]: only while the account reads the same list; the snapshot and the change are one save. */
export function applyProgramTextCleanup(data: ProgramData, input: ProgramPrivateMutationBase & { plan: ProgramTextCleanupPlan; choices: ProgramDateLineChoices; now: string }): ProgramTransition<string> {
  const fields = {
    progress: input.plan.progress.map(doc => ({ documentId: doc.documentId, changes: doc.changes.map(change => ({ lineId: change.lineId, before: change.before, after: change.after })) })),
    dates: input.plan.dates.map(doc => ({ documentId: doc.documentId, items: doc.items.map(item => ({ ownerId: item.ownerId, lineIds: item.lineIds, value: item.value, kind: item.kind })) })),
    choices: input.choices, now: input.now,
  };
  return transitionProgramPrivateSpace(data, input, 'private-text-cleanup', fields, space => {
    const plan = programTextCleanupPlan(space);
    if (!plan || !programSame(plan, input.plan)) return { result: '', reason: 'conflict' };
    const documents = programTextCleanupDocuments(plan);
    const next = applyProgramTextCleanupText(space.text, plan, input.choices);
    if (!next) return { result: documents[0], reason: 'unresolved' };
    if (!snapshotProgramDocumentRevisions(space, documents, input.now)) return { result: documents[0], reason: 'limit' };
    space.text = next;
    return { result: documents[0] };
  });
}

const sorted = (_: string, value: unknown) => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : value;
/** The writing's proof, independent of key order (a save read back from the server may order keys differently). */
export const programTextCleanupProof = (text: TextWorkspaceState) => programStateHash(JSON.stringify(text, sorted));

/** 되돌리기: the whole writing exactly as before the cleanup, only while it is exactly as the cleanup left it. The saved
 *  revisions (the snapshot) stay. */
export function restoreProgramTextCleanup(data: ProgramData, input: ProgramPrivateMutationBase & { before: TextWorkspaceState; after: string }): ProgramTransition<string> {
  return transitionProgramPrivateSpace(data, input, 'private-text-cleanup-undo', { after: input.after, before: programTextCleanupProof(input.before) }, space => {
    if (programTextCleanupProof(space.text) !== input.after) return { result: input.after, reason: 'conflict' };
    if (!M.validate(input.before)) return { result: input.after, reason: 'invalid' };
    space.text = programClone(input.before);
    return { result: input.after };
  });
}
