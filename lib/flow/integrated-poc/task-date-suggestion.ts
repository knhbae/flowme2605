import { suggestTaskLineDate, type NaturalTaskDateCandidate } from './natural-task-date';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

export const TASK_DATE_SUGGESTION_KEY = 'flowme:task-date-suggestion';
export const TASK_DATE_SUGGESTION_EVENT = 'flowme:task-date-suggestion-change';

/** Device preference only; no task, account or document metadata is added. */
export function taskDateSuggestionsEnabled(storage?: Pick<Storage, 'getItem'> | null): boolean {
  try {
    const target = storage === undefined ? typeof window === 'undefined' ? null : window.localStorage : storage;
    return target?.getItem(TASK_DATE_SUGGESTION_KEY) !== 'off';
  } catch { return true; }
}

export type TaskDateSuggestion = NaturalTaskDateCandidate & { docId: string; lineId: string; source: string };

/** Only a canonical, unfinished writing task outside another day's section is eligible. */
export function readTaskDateSuggestion(state: TextWorkspaceState, docId: string, lineId: string, today: string): TaskDateSuggestion | null {
  const doc = M.getDocument(state, docId), source = doc?.lines.find(line => line.id === lineId)?.text;
  if (source === undefined || !state.documents.some(item => item.id === docId)) return null;
  // Most finished lines have no date words: do not parse the document for those.
  const candidate = suggestTaskLineDate(source, { today });
  if (!candidate) return null;
  const row = M.rowMeta(state, docId).find(line => line.id === lineId);
  if (!row || row.kind !== 'task' || !row.isCanonical || row.isReference || row.scopeKind === 'flow'
    || row.ancestorScopeKind === 'flow' || row.dateLineId && row.groupDate !== today) return null;
  const task = row.task ?? M.tasks(state).find(item => item.id === row.progressTargetId);
  if (!task || task.explicitDate || task.date === candidate.date) return null;
  return { ...candidate, docId, lineId, source };
}

/** A later edit may move the property under another task: then its original notice has no authority over it. */
export function undoTaskDateSuggestion(state: TextWorkspaceState, docId: string, taskId: string, property: { id: string; text: string }, date: string): TextWorkspaceState | null {
  const doc = M.getDocument(state, docId), rows = M.rowMeta(state, docId), row = rows.find(line => line.id === property.id);
  const task = M.tasks(state).find(item => item.id === taskId);
  if (!doc || !task || task.docId !== docId || task.date !== date || !task.isCanonical || row?.kind !== 'property'
    || row.parentLineId !== taskId || doc.lines.find(line => line.id === property.id)?.text !== property.text) return null;
  // Remove only this source line; do not reinterpret unrelated, still-being-written folder commands.
  const next = { ...state, documents: state.documents.map(item => item.id === docId
    ? { ...item, lines: item.lines.filter(line => line.id !== property.id) } : item) };
  return M.validate(next) ? next : null;
}

/** Whole-frame undo is owned only while that exact frame is current. N9 may
 * acknowledge the one new date property's ID; no other identity or value is relaxed. */
export function taskDateSuggestionUndoFrameMatches(current: TextWorkspaceState, docId: string,
  before: TextWorkspaceState, after: TextWorkspaceState, redo: boolean): boolean {
  const expected = redo ? before : after;
  if (JSON.stringify(current) === JSON.stringify(expected)) return true;
  if (redo || ![current, before, after].every(M.validate)) return false;
  const oldIds = new Set([...before.documents, ...before.flows].flatMap(doc => doc.lines.map(line => line.id)));
  const doc = M.getDocument(after, docId), actual = M.getDocument(current, docId);
  const added = doc?.lines.filter(line => !oldIds.has(line.id)) ?? [];
  if (!doc || !actual || added.length !== 1 || !/^ *- 날짜:/.test(added[0].text)) return false;
  const index = doc.lines.findIndex(line => line.id === added[0].id), acknowledged = actual.lines[index];
  if (!acknowledged || acknowledged.text !== added[0].text || oldIds.has(acknowledged.id)) return false;
  const normalized = { ...after, documents: after.documents.map(item => item.id === docId
    ? { ...item, lines: item.lines.map((line, at) => at === index ? { ...line, id: acknowledged.id } : line) } : item) };
  return JSON.stringify(current) === JSON.stringify(normalized);
}

/** Use KST even when a browser's own time zone is elsewhere. */
export function taskDateSuggestionToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(value => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function taskDateSuggestionLabel(date: string, today: string): string {
  const [year, month, day] = date.split('-').map(Number), weekday = '일월화수목금토'[new Date(`${date}T00:00:00Z`).getUTCDay()];
  return `${date.slice(0, 4) !== today.slice(0, 4) ? `${year}년 ` : ''}${month}월 ${day}일(${weekday})로`;
}
