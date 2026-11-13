import type { ProgramPrivateSpace } from './contract';
import { programSameTaskKey } from './continue-band';
import { programFolderPath } from './continuation';
import { programDaysBetween } from './date-label';
import { programDate } from './program-data';
import { programExecutionDocument } from './private-space';
import { programTaskRepeatMembers } from './task-date-move';
import { readProgramRepeatMarker } from './repeat-line';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';

/** W-TXT-12~16. A saved-snapshot title index; never built in a native key handler. No persistent keys or requests. */
export type ProgramRecallCandidate = Readonly<{
  documentId: string; lineId: string; title: string; parentTitle: string | null; key: string; match: string;
  done: boolean; percent: number; day: string | null; due: string | null; folder: string;
  /** Admission rechecks these values against the current source, not a title guess. */
  proof: string;
}>;
export const programRecallMatch = (title: string) => title.normalize('NFC').toLocaleLowerCase('ko-KR').trim().replace(/\s+/gu, ' ');
export function programRecallQueryReady(query: string): boolean {
  const chars = [...programRecallMatch(query).replace(/\s/gu, '')];
  if (!chars.length || chars.some(char => /[ㄱ-ㅣ\u1100-\u11ff]/u.test(char))) return false;
  const letters = chars.filter(char => /[가-힣a-z0-9]/iu.test(char));
  return letters.filter(char => /[가-힣]/u.test(char)).length >= 2 || letters.length >= 3;
}
const usable = (space: ProgramPrivateSpace, id: string) => id !== 'doc-flowme-trash'
  && !space.archivedDocumentIds.includes(id) && !space.documentTrash?.[id]
  && !space.copies.some(copy => copy.documentId === id) && !space.savedBindings.some(binding => binding.documentId === id)
  && !space.creatorDraftImports?.some(binding => binding.documentId === id)
  && !Object.values(space.creatorWorkspace?.executionSources ?? {}).some(source => source.documentId === id)
  && !Object.values(space.creatorWorkspace?.nativeExecutionSources ?? {}).some(source => source.documentId === id)
  && !Object.values(space.creatorWorkspace?.handoffs ?? {}).some(binding => binding.documentId === id)
  && !programExecutionDocument(space, id);

/** Includes a child's own block/records and its parent's identity, without admitting referenced/Flow-owned lines. */
export function programRecallProof(text: TextWorkspaceState, docId: string, lineId: string): string | null {
  const doc = M.getDocument(text, docId), rows = doc && M.parseDocumentCached(doc, text).rows;
  const row = rows?.find(item => item.id === lineId);
  if (!doc || !row || !['task', 'subcheck'].includes(row.kind) || !M.parseDocumentCached(doc, text).items.some(item => item.id === lineId)
    || text.bindings.some(binding => binding.kind === 'task' && binding.lineId === lineId)) return null;
  const lines = doc.lines.slice(row.index, row.subtreeEndIndex), ids = new Set(lines.map(line => line.id));
  return JSON.stringify({ lines, parent: row.parentLineId, day: row.groupDate, date: row.date, folder: programFolderPath(text, text.itemScopes[row.id]),
    records: text.progressRecords.filter(record => ids.has(record.taskId)),
    bindings: text.bindings.filter(binding => ids.has(binding.lineId) || binding.kind === 'task' && ids.has(binding.taskId)),
    scopes: lines.map(line => [line.id, text.taskScopes[line.id] ?? null, text.itemScopes[line.id] ?? null]) });
}

export function createProgramRecallIndex(space: ProgramPrivateSpace, today: string): readonly ProgramRecallCandidate[] {
  if (!programDate(today)) return [];
  const text = space.text, repeats = programTaskRepeatMembers(space), linked = new Set(text.bindings.flatMap(binding => binding.kind === 'task' ? [binding.lineId, binding.taskId] : []));
  const progress = new Map<string, { date: string; percent: number }>();
  for (const record of text.progressRecords) if (!progress.has(record.taskId) || progress.get(record.taskId)!.date < record.date) progress.set(record.taskId, record);
  const entries: ProgramRecallCandidate[] = [];
  for (const doc of text.documents) {
    if (!usable(space, doc.id)) continue;
    const parsed = M.parseDocumentCached(doc, text), byId = new Map(parsed.rows.map(row => [row.id, row]));
    // A repeat's children, even when already done, belong to its recurrence too.
    const repeatRoots = new Set(parsed.items.filter(item => readProgramRepeatMarker(item.title) || repeats.has(item.id)).map(item => item.id));
    for (const task of parsed.items) {
      const row = byId.get(task.id), key = programSameTaskKey(task.title.normalize('NFC'));
      const scope = text.itemScopes[task.id];
      if (!row || linked.has(task.id) || !text.folders.some(folder => folder.id === scope) || !key || repeats.has(task.id) || repeatRoots.has(task.id)) continue;
      if (row.ancestorScopeKind === 'flow' || (row.ancestorScopeId ?? doc.folderId) !== scope) continue;
      let parent = row.parentLineId, excluded = false;
      for (let guard = 0; parent && guard < 40; guard++) { if (repeatRoots.has(parent)) { excluded = true; break; } parent = byId.get(parent)?.parentLineId ?? null; }
      if (excluded || /^(?: *-\s+\[>\])/u.test(row.text) || task.groupDate && task.groupDate > today) continue;
      const completed = progress.get(task.id)?.percent === 100 ? progress.get(task.id)!.date : task.groupDate;
      const elapsed = completed ? programDaysBetween(completed, today) : null;
      if (task.done && (elapsed === null || elapsed < 0 || elapsed > 60)) continue;
      const proof = programRecallProof(text, doc.id, task.id);
      if (!proof) continue;
      const parentRow = row.parentLineId ? byId.get(row.parentLineId) : null, parentTask = parentRow && ['task', 'subcheck'].includes(parentRow.kind) ? parentRow : null;
      entries.push(Object.freeze({ documentId: doc.id, lineId: task.id, title: task.title, parentTitle: parentTask?.title ?? null, key,
        match: programRecallMatch(task.title), done: task.done, percent: task.inputPercent ?? progress.get(task.id)?.percent ?? (task.done ? 100 : 0),
        day: task.groupDate, due: task.due ?? null, folder: programFolderPath(text, scope), proof }));
    }
  }
  return Object.freeze(entries);
}

/** Prefix matches first; then open, typed folder, recent day. Dedup chooses the most recent eligible line first. */
export function programRecallChoices(index: readonly ProgramRecallCandidate[], input: { query: string; lineId: string; folder: string; limit: 3 | 5 }): ProgramRecallCandidate[] {
  const query = programRecallMatch(input.query);
  if (!programRecallQueryReady(query)) return [];
  const recent = new Map<string, ProgramRecallCandidate>();
  for (const row of index) if (row.lineId !== input.lineId && row.match.includes(query)) {
    const old = recent.get(row.key);
    if (!old || (row.day ?? '') > (old.day ?? '')) recent.set(row.key, row);
  }
  return [...recent.values()].sort((a, b) => Number(b.match.startsWith(query)) - Number(a.match.startsWith(query))
    || Number(a.done) - Number(b.done) || Number(b.folder === input.folder) - Number(a.folder === input.folder)
    || (b.day ?? '').localeCompare(a.day ?? '')).slice(0, input.limit);
}

export type ProgramRecallLine = { lineId: string; index: number; start: number; end: number; text: string; query: string; folder: string; today: string };
/** Idle-time admission only. The model must already describe the native RAW and the caret must be in the title. */
export function readProgramRecallLine(text: TextWorkspaceState, docId: string, raw: string, start: number, end: number, today: string): ProgramRecallLine | null {
  if (start !== end || start < 0 || end > raw.length || !programDate(today)) return null;
  const doc = M.getDocument(text, docId);
  if (!doc || M.raw(doc) !== raw) return null;
  const from = raw.lastIndexOf('\n', Math.max(0, start - 1)) + 1, after = raw.indexOf('\n', start), to = after < 0 ? raw.length : after;
  const source = raw.slice(from, to), match = /^( *-\s+\[ \]\s+)(.*)$/u.exec(source);
  if (!match || start <= from + match[1].length || !programRecallQueryReady(match[2]) || readProgramRepeatMarker(match[2])) return null;
  const index = raw.slice(0, from).split('\n').length - 1, row = M.parseDocumentCached(doc, text).rows[index];
  if (!row || !['task', 'subcheck'].includes(row.kind) || row.groupDate !== today || !text.folders.some(folder => folder.id === text.itemScopes[row.id])
    || row.ancestorScopeKind === 'flow' || (row.ancestorScopeId ?? doc.folderId) !== text.itemScopes[row.id]
    || M.parseDocumentCached(doc, text).rows.slice(index + 1, row.subtreeEndIndex).some(entry => entry.kind !== 'blank')
    || text.progressRecords.some(record => record.taskId === row.id)
    || text.bindings.some(binding => binding.kind === 'task' && (binding.lineId === row.id || binding.taskId === row.id))) return null;
  return { lineId: row.id, index, start: from, end: to, text: source, query: match[2], folder: programFolderPath(text, text.itemScopes[row.id]), today };
}

/** Navigation has no default choice. Native Enter/Tab/space and IME Enter pass unchanged. */
export function programRecallKey(key: string, navigation: number, length: number, composing: boolean, modified = false): { kind: 'pass' | 'dismiss' } | { kind: 'highlight' | 'select'; index: number } {
  if (composing || modified) return { kind: 'pass' };
  if (key === 'Escape') return { kind: 'dismiss' };
  if (key === 'ArrowDown' && length) return { kind: 'highlight', index: (navigation + 1) % length };
  if (key === 'ArrowUp' && navigation >= 0) return { kind: 'highlight', index: (navigation + length - 1) % length };
  if (key === 'Enter' && navigation >= 0 && navigation < length) return { kind: 'select', index: navigation };
  return { kind: 'pass' };
}
