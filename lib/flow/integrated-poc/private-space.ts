import {
  PROGRAM_LIMITS, PROGRAM_COPY_SCHEDULE_RETENTION, PROGRAM_COPY_KIND_HANDOFF, PROGRAM_COPY_CHECK_RESOLUTION, programClone, programFailure, programId, programResult,
  type ProgramCopy, type ProgramCopyField, type ProgramCopyKindSlot, type ProgramCopyCheckChoice, type ProgramData, type ProgramFailure, type ProgramPrivateSpace,
  type ProgramPublicItem, type ProgramPublicVersion, type ProgramTransition,
} from './contract';
import { programDate, programIdentifier, programRecord, programString, validateProgramData } from './program-data';
import { programSame } from './controller';
import { textWorkspaceModel as M, type TextDocument, type TextLine, type TextWorkspaceState } from './text-workspace';
import { programLegacyTaskQualityHold } from './legacy-map-review';
import { programLegacyPlanTaskExcluded } from './program-legacy-plan-target';
import { programDocumentContentLock, programReferenceExecutionAccess } from './reference-execution-guard';
import { programRecurringScheduleLabel, programRecurringScheduleStart } from './public-recurrence-contract';
import { programPublicCopyItemStart } from './public-copy-recurrence';
import { programOrdinaryScheduleLabel } from './public-ordinary-time';

/** Compare the selected actor's entire private baseline before any mutation. */
export type ProgramPrivateMutationBase = { actorId: string; requestId: string; expectedSpace: ProgramPrivateSpace };
type Mutation = (space: ProgramPrivateSpace) => { result: string; reason?: ProgramFailure };
const same = programSame;
const singleLine = (value: unknown, max = 240): value is string => programString(value, max, true) && !/[\r\n]/.test(value);
const documents = (text: TextWorkspaceState) => [...text.documents, ...text.flows];
function sameFingerprint(serialized: string, fields: unknown): boolean {
  try { return same(JSON.parse(serialized), fields); } catch { return false; }
}

function mutate(data: ProgramData, base: ProgramPrivateMutationBase, kind: string, fields: unknown, run: Mutation): ProgramTransition<string> {
  if (!validateProgramData(data) || !programIdentifier(base.requestId)) return programFailure(data, 'invalid');
  if (!Object.hasOwn(data.spaces, base.actorId)) return programFailure(data, 'forbidden');
  const fingerprint = JSON.stringify(fields);
  const receipt = data.receipts.find(row => row.actorId === base.actorId && row.id === base.requestId);
  if (receipt) return receipt.kind === kind && sameFingerprint(receipt.fingerprint, JSON.parse(fingerprint))
    ? { ok: true, data, changed: false, result: receipt.resultId } : programFailure(data, 'duplicate-request');
  if (!same(base.expectedSpace, data.spaces[base.actorId])) return programFailure(data, 'conflict');
  const next = programClone(data), space = next.spaces[base.actorId];
  const outcome = run(space);
  if (outcome.reason) return programFailure(data, outcome.reason);
  if (same(space, data.spaces[base.actorId])) return { ok: true, data, changed: false, result: outcome.result };
  if (data.receipts.length >= PROGRAM_LIMITS.entries) return programFailure(data, 'limit');
  next.receipts.push({ id: base.requestId, actorId: base.actorId, kind, fingerprint, resultId: outcome.result });
  return validateProgramData(next) ? programResult(data, next, outcome.result) : programFailure(data, 'invalid');
}

/** Shared Program-only private transaction; storage/CAS/history remain in the controller. */
export { mutate as transitionProgramPrivateSpace };

export function createProgramDocument(data: ProgramData, input: ProgramPrivateMutationBase & { title: string; folderId?: string; raw?: string }): ProgramTransition<string> {
  return mutate(data, input, 'private-document-create', { title: input.title, folderId: input.folderId ?? 'folder-unfiled', raw: input.raw ?? '' }, space => {
    if (!singleLine(input.title) || input.raw !== undefined && !programString(input.raw, 100000)) return { result: '', reason: 'invalid' };
    if (space.text.documents.length >= 100) return { result: '', reason: 'limit' };
    let next = M.addDocument(space.text, { title: input.title, folderId: input.folderId ?? 'folder-unfiled' });
    if (next === space.text) return { result: '', reason: 'missing' };
    const documentId = next.documents.at(-1)!.id;
    if (input.raw) {
      next = M.editText(next, documentId, input.raw);
      if (M.raw(M.getDocument(next, documentId)) !== input.raw.replace(/\r\n?/g, '\n')) return { result: '', reason: 'unresolved' };
    }
    space.text = next; return { result: documentId };
  });
}

export function renameProgramDocument(data: ProgramData, input: ProgramPrivateMutationBase & { documentId: string; title: string }): ProgramTransition<string> {
  return mutate(data, input, 'private-document-rename', { documentId: input.documentId, title: input.title }, space => {
    const doc = M.getDocument(space.text, input.documentId);
    if (!doc) return { result: input.documentId, reason: 'missing' };
    if (!singleLine(input.title)) return { result: input.documentId, reason: 'invalid' };
    doc.title = input.title.trim();
    if (space.text.flows.some(flow => flow.id === doc.id)) for (const owner of documents(space.text)) for (const line of owner.lines) {
      if (space.text.bindings.some(binding => binding.kind === 'scope' && binding.docId === owner.id && binding.lineId === line.id && binding.scopeId === doc.id)) line.text = `${/^ */.exec(line.text)![0]}- ${doc.title}`;
    }
    return { result: doc.id };
  });
}

export function archiveProgramDocument(data: ProgramData, input: ProgramPrivateMutationBase & { documentId: string; archived?: boolean }): ProgramTransition<string> {
  return mutate(data, input, 'private-document-archive', { documentId: input.documentId, archived: input.archived ?? true }, space => {
    if (!M.getDocument(space.text, input.documentId)) return { result: input.documentId, reason: 'missing' };
    if (space.documentTrash?.[input.documentId]) return { result: input.documentId, reason: 'unresolved' };
    if (input.archived !== undefined && typeof input.archived !== 'boolean') return { result: input.documentId, reason: 'invalid' };
    if (input.archived !== false) {
      if (!space.archivedDocumentIds.includes(input.documentId)) space.archivedDocumentIds.push(input.documentId);
    } else space.archivedDocumentIds = space.archivedDocumentIds.filter(id => id !== input.documentId);
    return { result: input.documentId };
  });
}

export function createProgramFolder(data: ProgramData, input: ProgramPrivateMutationBase & { title: string; parentId?: string | null }): ProgramTransition<string> {
  return mutate(data, input, 'private-folder-create', { title: input.title, parentId: input.parentId ?? null }, space => {
    const parentId = input.parentId ?? null;
    if (!singleLine(input.title, 100)) return { result: '', reason: 'invalid' };
    if (parentId && !space.text.folders.some(folder => folder.id === parentId)) return { result: '', reason: 'missing' };
    if (space.text.folders.some(folder => folder.parentId === parentId && folder.title === input.title.trim())) return { result: '', reason: 'conflict' };
    if (space.text.folders.length >= 100) return { result: '', reason: 'limit' };
    const id = programId('folder'); space.text.folders.push({ id, title: input.title.trim(), parentId });
    if (!M.validate(space.text)) return { result: id, reason: 'limit' };
    return { result: id };
  });
}

export function renameProgramFolder(data: ProgramData, input: ProgramPrivateMutationBase & { folderId: string; title: string }): ProgramTransition<string> {
  return mutate(data, input, 'private-folder-rename', { folderId: input.folderId, title: input.title }, space => {
    const folder = space.text.folders.find(row => row.id === input.folderId);
    if (!folder) return { result: input.folderId, reason: 'missing' };
    if (folder.id === 'folder-unfiled') return { result: folder.id, reason: 'forbidden' };
    if (!singleLine(input.title, 100)) return { result: folder.id, reason: 'invalid' };
    if (space.text.folders.some(row => row.id !== folder.id && row.parentId === folder.parentId && row.title === input.title.trim())) return { result: folder.id, reason: 'conflict' };
    space.text = M.renameScope(space.text, folder.id, input.title); return { result: folder.id };
  });
}

export function moveProgramFolder(data: ProgramData, input: ProgramPrivateMutationBase & { folderId: string; parentId: string | null }): ProgramTransition<string> {
  return mutate(data, input, 'private-folder-move', { folderId: input.folderId, parentId: input.parentId }, space => {
    const folder = space.text.folders.find(row => row.id === input.folderId);
    if (!folder || input.parentId && !space.text.folders.some(row => row.id === input.parentId)) return { result: input.folderId, reason: 'missing' };
    if (folder.id === 'folder-unfiled') return { result: folder.id, reason: 'forbidden' };
    let parent = input.parentId;
    while (parent) {
      if (parent === folder.id) return { result: folder.id, reason: 'invalid' };
      parent = space.text.folders.find(row => row.id === parent)?.parentId ?? null;
    }
    if (space.text.folders.some(row => row.id !== folder.id && row.parentId === input.parentId && row.title === folder.title)) return { result: folder.id, reason: 'conflict' };
    folder.parentId = input.parentId;
    return { result: folder.id, reason: M.validate(space.text) ? undefined : 'limit' };
  });
}

/** Delete only the folder: keep documents/items, promote child folders to root. */
export function deleteProgramFolder(data: ProgramData, input: ProgramPrivateMutationBase & { folderId: string }): ProgramTransition<string> {
  return mutate(data, input, 'private-folder-delete', { folderId: input.folderId }, space => {
    if (input.folderId === 'folder-unfiled') return { result: input.folderId, reason: 'forbidden' };
    if (!space.text.folders.some(folder => folder.id === input.folderId)) return { result: input.folderId, reason: 'missing' };
    const unfiled = space.text.folders.find(folder => folder.id === 'folder-unfiled');
    if (!unfiled) return { result: input.folderId, reason: 'invalid' };
    // Keep source outline rows and their IDs. A deleted folder link becomes an
    // ordinary text label; actual ownership moves to unfiled independently.
    space.text.bindings = space.text.bindings.filter(binding => binding.kind !== 'scope' || binding.scopeId !== input.folderId);
    for (const doc of documents(space.text)) if (doc.folderId === input.folderId) { doc.folderId = unfiled.id; doc.folder = unfiled.title; }
    for (const owners of [space.text.taskScopes, space.text.itemScopes]) for (const id of Object.keys(owners)) if (owners[id] === input.folderId) owners[id] = unfiled.id;
    for (const folder of space.text.folders) if (folder.parentId === input.folderId) folder.parentId = null;
    space.text.folders = space.text.folders.filter(folder => folder.id !== input.folderId);
    return { result: input.folderId };
  });
}

export function setProgramDocumentFolder(data: ProgramData, input: ProgramPrivateMutationBase & { documentId: string; folderId: string }): ProgramTransition<string> {
  return mutate(data, input, 'private-document-folder', { documentId: input.documentId, folderId: input.folderId }, space => {
    const doc = M.getDocument(space.text, input.documentId), folder = space.text.folders.find(row => row.id === input.folderId);
    if (!doc || !folder) return { result: input.documentId, reason: 'missing' };
    doc.folderId = folder.id; doc.folder = folder.title;
    // v11 stores creation-time item ownership independently of document filing.
    // Refiling a document cannot silently change those explicit stable owners.
    return { result: doc.id };
  });
}

export function updateProgramTask(data: ProgramData, input: ProgramPrivateMutationBase & { taskId: string; patch: { title?: string; date?: string | null; note?: string; time?: string } }): ProgramTransition<string> {
  return mutate(data, input, 'private-task-update', { taskId: input.taskId, patch: input.patch }, space => {
    if (programReferenceExecutionAccess(space, input.taskId).kind !== 'active') return { result: input.taskId, reason: 'unresolved' };
    if (programLegacyTaskQualityHold(space, input.taskId) || programLegacyPlanTaskExcluded(space, input.taskId)) return { result: input.taskId, reason: 'unresolved' };
    const before = documents(space.text).flatMap(doc => M.parseDocument(doc, space.text).items).find(task => task.id === input.taskId);
    if (!before) return { result: input.taskId, reason: 'missing' };
    if (!programRecord(input.patch) || !Object.keys(input.patch).length || Object.keys(input.patch).some(key => !['title', 'date', 'note', 'time'].includes(key))) return { result: input.taskId, reason: 'invalid' };
    const unchanged = Object.entries(input.patch).every(([key, value]) => key === 'date' ? before.date === value
      : typeof value === 'string' && (key === 'time' ? before.time ?? '' : before[key as 'title' | 'note']) === value.trim());
    if (unchanged) return { result: input.taskId };
    const next = M.updateTask(space.text, input.taskId, input.patch);
    if (next === space.text && Object.entries(input.patch).some(([key, value]) => before[key as keyof typeof before] !== value)) return { result: input.taskId, reason: 'invalid' };
    space.text = next;
    const copy = space.copies.find(copy => Object.values(copy.itemLines).includes(input.taskId));
    if (copy) {
      const itemId = Object.keys(copy.itemLines).find(id => copy.itemLines[id] === input.taskId)!;
      const override = copy.itemOverrides[itemId] ?? {};
      if (input.patch.title !== undefined) override.title = input.patch.title.trim();
      if (input.patch.date !== undefined) override.date = input.patch.date;
      if (Object.keys(override).length) copy.itemOverrides[itemId] = override;
    }
    return { result: input.taskId };
  });
}

export function recordProgramTaskProgress(data: ProgramData, input: ProgramPrivateMutationBase & { taskId: string; date: string; percent: number }): ProgramTransition<string> {
  return mutate(data, input, 'private-task-progress', { taskId: input.taskId, date: input.date, percent: input.percent }, space => {
    if (programReferenceExecutionAccess(space, input.taskId).kind !== 'active') return { result: input.taskId, reason: 'unresolved' };
    if (programLegacyTaskQualityHold(space, input.taskId) || programLegacyPlanTaskExcluded(space, input.taskId)) return { result: input.taskId, reason: 'unresolved' };
    if (!programDate(input.date) || !Number.isInteger(input.percent) || input.percent < 0 || input.percent > 100) return { result: input.taskId, reason: 'invalid' };
    const exists = documents(space.text).some(doc => M.rowMeta(space.text, doc.id).some(row => row.id === input.taskId && row.progressTargetId === input.taskId));
    if (!exists) return { result: input.taskId, reason: 'missing' };
    const next = M.recordProgress(space.text, input.taskId, input.date, input.percent);
    if (next === space.text && !M.progressHistory(next, input.taskId).some(record => record.date === input.date && record.percent === input.percent)) return { result: input.taskId, reason: 'limit' };
    space.text = next;
    return { result: input.taskId };
  });
}

export function completeProgramTask(data: ProgramData, input: ProgramPrivateMutationBase & { taskId: string; date: string; done: boolean }): ProgramTransition<string> {
  if (typeof input.done !== 'boolean') return programFailure(data, 'invalid');
  return recordProgramTaskProgress(data, { ...input, percent: input.done ? 100 : 0 });
}

export function addProgramQuickTask(data: ProgramData, input: ProgramPrivateMutationBase & { documentId: string; title: string; date?: string | null; scopeId?: string }): ProgramTransition<string> {
  return mutate(data, input, 'private-task-add', { documentId: input.documentId, title: input.title, date: input.date ?? null, scopeId: input.scopeId ?? null }, space => {
    if (!M.getDocument(space.text, input.documentId)) return { result: '', reason: 'missing' };
    if (programDocumentContentLock(space, input.documentId) !== 'active') return { result: input.documentId, reason: 'unresolved' };
    const beforeIds = new Set(M.tasks(space.text).map(task => task.id));
    const next = M.addTask(space.text, { docId: input.documentId, title: input.title, date: input.date, ...(input.scopeId === undefined ? {} : { scopeId: input.scopeId }) });
    const added = M.tasks(next).find(task => !beforeIds.has(task.id));
    if (!added) return { result: '', reason: 'invalid' };
    space.text = next; return { result: added.id };
  });
}

export function linkProgramTask(data: ProgramData, input: ProgramPrivateMutationBase & { documentId: string; taskId: string; lineId?: string | null }): ProgramTransition<string> {
  return mutate(data, input, 'private-task-link', { documentId: input.documentId, taskId: input.taskId, lineId: input.lineId ?? null }, space => {
    const doc = M.getDocument(space.text, input.documentId);
    if (!doc) return { result: '', reason: 'missing' };
    if (programDocumentContentLock(space, doc.id) !== 'active') return { result: doc.id, reason: 'unresolved' };
    const existing = space.text.bindings.find(binding => binding.kind === 'task' && binding.docId === doc.id && binding.taskId === input.taskId);
    if (existing) return { result: existing.lineId };
    const index = input.lineId ? doc.lines.findIndex(line => line.id === input.lineId) : doc.lines.length;
    if (index < 0) return { result: '', reason: 'missing' };
    if (index < doc.lines.length && !/^ *-?\s*$/.test(doc.lines[index].text)) return { result: '', reason: 'conflict' };
    const next = M.linkTask(space.text, doc.id, index, input.taskId);
    if (next === space.text) return { result: '', reason: 'invalid' };
    space.text = next; return { result: M.getDocument(next, doc.id)!.lines[index].id };
  });
}

const COPY_FIELDS: ProgramCopyField[] = ['title', 'description', 'completionCriteria', 'sourceUrl', 'schedule', 'subchecks'];
const normalizedLines = (value: string) => value.replace(/\r\n?/g, '\n').split('\n');
const fieldPrefix: Record<Exclude<ProgramCopyField, 'subchecks'>, string> = {
  title: '원문 제목: ', description: '설명: ', completionCriteria: '완료 기준: ', sourceUrl: '출처: ', schedule: '원문 일정: ',
};
function scheduleLabel(item: ProgramPublicItem): string {
  const schedule = item.schedule;
  return schedule.kind === 'recurring' ? programRecurringScheduleLabel(schedule)
    : programOrdinaryScheduleLabel(schedule);
}
function fieldText(item: ProgramPublicItem, field: Exclude<ProgramCopyField, 'subchecks'>): string[] {
  const value = field === 'schedule' ? scheduleLabel(item) : field === 'sourceUrl' ? item.sourceUrl ?? '' : item[field];
  return normalizedLines(value).map(line => `${fieldPrefix[field]}${line}`);
}
function sourceFieldLines(item: ProgramPublicItem, lineId: string, field: Exclude<ProgramCopyField, 'subchecks'>, depth = 1): TextLine[] {
  return fieldText(item, field).map((text, index) => ({ id: `${lineId}:${field}:${index}`, text: `${'  '.repeat(depth)}${text}` }));
}
export function resolveProgramItemDate(item: ProgramPublicItem, anchor: string | null): string | null {
  if (item.schedule.kind === 'recurring') return programRecurringScheduleStart(item.schedule, anchor);
  if (item.schedule.kind === 'undated') return null;
  if (item.schedule.kind === 'fixed') return item.schedule.date;
  if (!anchor || !programDate(anchor)) return null;
  const date = new Date(`${anchor}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + item.schedule.days);
  const result = date.toISOString().slice(0, 10);
  return programDate(result) ? result : null;
}
function supportedItem(item: ProgramPublicItem): boolean {
  return singleLine(item.title, 500) && item.subchecks.every(child => singleLine(child.title, 500));
}
function itemLines(item: ProgramPublicItem, lineId: string, anchor: string | null, childLines: Record<string, string>): TextLine[] {
  if (item.schedule.kind === 'recurring') return [{ id: lineId, text: `반복: ${item.title}` },
    ...COPY_FIELDS.filter((field): field is Exclude<ProgramCopyField, 'subchecks'> => field !== 'subchecks').flatMap(field => sourceFieldLines(item, lineId, field)),
    ...item.subchecks.map(child => ({ id: childLines[child.id], text: `  반복 확인: ${child.title}` }))];
  return [{ id: lineId, text: `- [ ] ${item.title}` },
    { id: `${lineId}:date`, text: `  - 날짜: ${resolveProgramItemDate(item, anchor) ?? '미정'}` },
    ...(item.schedule.timing?.time ? [{ id: `${lineId}:time`, text: `  - 시간: ${item.schedule.timing.time}` }] : []),
    ...COPY_FIELDS.filter((field): field is Exclude<ProgramCopyField, 'subchecks'> => field !== 'subchecks').flatMap(field => sourceFieldLines(item, lineId, field)),
    ...item.subchecks.map(child => ({ id: childLines[child.id], text: `  - [ ] ${child.title}` }))];
}
function registerItems(text: TextWorkspaceState, doc: TextDocument, scopeId: string) {
  const parsed = M.parseDocument(doc, text);
  for (const item of parsed.items) {
    if (!text.itemScopes[item.id]) text.itemScopes[item.id] = scopeId;
    if (item.isCanonical && !text.taskScopes[item.id]) text.taskScopes[item.id] = scopeId;
  }
}
function appendSourceItem(space: ProgramPrivateSpace, copy: ProgramCopy, item: ProgramPublicItem): boolean {
  const doc = M.getDocument(space.text, copy.documentId);
  if (!doc || !supportedItem(item)) return false;
  const lineId = programId('source-item');
  const childLines = Object.fromEntries(item.subchecks.map(child => [child.id, programId('source-child')]));
  doc.lines.push(...itemLines(item, lineId, copy.anchor, childLines));
  copy.itemLines[item.id] = lineId;
  copy.subcheckLines[item.id] = childLines;
  copy.inheritedDates[item.id] = resolveProgramItemDate(item, copy.anchor);
  if (item.schedule.kind === 'recurring') {
    copy.recurrence ??= { version: 1, itemIds: [] };
    if (!copy.recurrence.itemIds.includes(item.id)) copy.recurrence.itemIds.push(item.id);
  }
  if (!copy.includedItemIds.includes(item.id)) copy.includedItemIds.push(item.id);
  registerItems(space.text, doc, doc.id);
  return M.validate(space.text);
}

export type ImportProgramPublicVersionInput = ProgramPrivateMutationBase & {
  versionId: string; itemIds: string[]; anchor: string | null; targetDocumentId?: string;
  /** Only explicitly chosen starts for public start-undated series. */
  recurrenceStarts?: Record<string, string | null>;
};
export function importProgramPublicVersion(data: ProgramData, input: ImportProgramPublicVersionInput): ProgramTransition<string> {
  return mutate(data, input, 'private-public-import', { versionId: input.versionId, itemIds: input.itemIds, anchor: input.anchor, targetDocumentId: input.targetDocumentId ?? null,
    ...(input.recurrenceStarts !== undefined ? { recurrenceStarts: input.recurrenceStarts } : {}) }, space => {
    const version = data.public.versions.find(version => version.id === input.versionId);
    if (!version || !data.public.flows.some(flow => flow.id === version.flowId && !flow.archived)) return { result: '', reason: 'missing' };
    if (!Array.isArray(input.itemIds) || !input.itemIds.length || new Set(input.itemIds).size !== input.itemIds.length
      || input.itemIds.some(id => !version.items.some(item => item.id === id)) || input.anchor !== null && !programDate(input.anchor)) return { result: '', reason: 'invalid' };
    const selected = version.items.filter(item => input.itemIds.includes(item.id));
    if (selected.some(item => !supportedItem(item))) return { result: '', reason: 'unresolved' };
    if (input.recurrenceStarts !== undefined && (!programRecord(input.recurrenceStarts) || Object.entries(input.recurrenceStarts).some(([itemId, start]) =>
      !selected.some(item => item.id === itemId && item.schedule.kind === 'recurring' && item.schedule.start.kind === 'undated') || start !== null && !programDate(start)))) return { result: '', reason: 'invalid' };
    let copy = space.copies.find(copy => copy.flowId === version.flowId);
    if (copy && (copy.baseVersionId !== version.id || copy.anchor !== input.anchor)) return { result: copy.id, reason: 'conflict' };
    if (!copy) {
      if (space.text.flows.length >= 100) return { result: '', reason: 'limit' };
      const folder = space.text.folders.find(folder => folder.id === 'folder-unfiled');
      if (!folder) return { result: '', reason: 'invalid' };
      const documentId = programId('copy-document');
      space.text.flows.push({ id: documentId, title: version.title, folderId: folder.id, folder: folder.title,
        lines: normalizedLines(version.summary).map((text, i) => ({ id: `${documentId}:summary:${i}`, text: `원문 소개: ${text}` })),
        private: true, sourceVersion: version.id });
      copy = { id: programId('copy'), flowId: version.flowId, baseVersionId: version.id, documentId,
        itemLines: {}, includedItemIds: [], anchor: input.anchor, itemOverrides: {}, appliedFields: {}, subcheckLines: {}, inheritedDates: {} };
      space.copies.push(copy);
    }
    space.archivedDocumentIds = space.archivedDocumentIds.filter(id => id !== copy!.documentId);
    for (const item of selected) {
      if (!copy.itemLines[item.id] && !appendSourceItem(space, copy, item)) return { result: copy.id, reason: 'limit' };
      if (Object.hasOwn(input.recurrenceStarts ?? {}, item.id)) {
        const start = input.recurrenceStarts![item.id];
        if (copy.recurrence?.starts && Object.hasOwn(copy.recurrence.starts, item.id) && copy.recurrence.starts[item.id] !== start) return { result: copy.id, reason: 'conflict' };
        if (!copy.recurrence) return { result: copy.id, reason: 'invalid' };
        (copy.recurrence.starts ??= {})[item.id] = start;
      }
      if (!copy.includedItemIds.includes(item.id)) copy.includedItemIds.push(item.id);
      if (copy.itemOverrides[item.id]?.included === false) copy.itemOverrides[item.id].included = true;
    }
    if (input.targetDocumentId) {
      if (input.targetDocumentId === copy.documentId || !M.getDocument(space.text, input.targetDocumentId)) return { result: copy.id, reason: 'missing' };
      if (programDocumentContentLock(space, input.targetDocumentId) !== 'active') return { result: copy.id, reason: 'unresolved' };
      for (const item of selected) {
        if (item.schedule.kind === 'recurring') {
          if (!appendProgramCopySeriesReference(space, copy, item.id, input.targetDocumentId)) return { result: copy.id, reason: 'unresolved' };
          continue;
        }
        if (space.text.bindings.some(binding => binding.kind === 'task' && binding.docId === input.targetDocumentId && binding.taskId === copy!.itemLines[item.id])) continue;
        const doc = M.getDocument(space.text, input.targetDocumentId)!;
        const next = M.linkTask(space.text, doc.id, doc.lines.length, copy.itemLines[item.id]);
        if (next === space.text) return { result: copy.id, reason: 'unresolved' };
        space.text = next;
      }
    }
    return { result: copy.id };
  });
}

function appendProgramCopySeriesReference(space: ProgramPrivateSpace, copy: ProgramCopy, itemId: string, documentId: string): boolean {
  const doc = M.getDocument(space.text, documentId), lineId = copy.itemLines[itemId];
  if (!doc || !lineId || !copy.recurrence?.itemIds.includes(itemId) || programDocumentContentLock(space, documentId) !== 'active'
    || programDocumentContentLock(space, copy.documentId) !== 'active') return false;
  if (copy.recurrence.references?.some(ref => ref.documentId === documentId && ref.itemId === itemId)) return true;
  const source = documents(space.text).flatMap(d => d.lines).find(line => line.id === lineId);
  if (!source) return false;
  const referenceId = programId('series-reference');
  doc.lines.push({ id: referenceId, text: `반복 참조: ${source.text.replace(/^반복: /, '')}` });
  (copy.recurrence.references ??= []).push({ itemId, documentId, lineId: referenceId });
  return M.validate(space.text);
}

export function linkProgramCopySeries(data: ProgramData, input: ProgramPrivateMutationBase & { copyId: string; itemId: string; documentId: string }): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  return mutate(data, input, 'private-series-reference', { copyId: input.copyId, itemId: input.itemId, documentId: input.documentId }, space => {
    const copy = space.copies.find(copy => copy.id === input.copyId);
    if (!copy || input.documentId === copy.documentId) return { result: input.documentId, reason: 'missing' };
    return appendProgramCopySeriesReference(space, copy, input.itemId, input.documentId) ? { result: input.documentId } : { result: input.documentId, reason: 'unresolved' };
  });
}

export function unlinkProgramCopySeries(data: ProgramData, input: ProgramPrivateMutationBase & { copyId: string; documentId: string; lineId: string }): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  return mutate(data, input, 'private-series-unlink', { copyId: input.copyId, documentId: input.documentId, lineId: input.lineId }, space => {
    const copy = space.copies.find(copy => copy.id === input.copyId), doc = M.getDocument(space.text, input.documentId);
    const ref = copy?.recurrence?.references?.find(ref => ref.documentId === input.documentId && ref.lineId === input.lineId);
    if (!ref || !doc || programDocumentContentLock(space, doc.id) !== 'active') return { result: input.lineId, reason: 'missing' };
    doc.lines = doc.lines.filter(line => line.id !== input.lineId);
    copy!.recurrence!.references = copy!.recurrence!.references!.filter(row => row !== ref);
    return { result: input.lineId };
  });
}

/** An acknowledged plan of a different immutable schedule stays historical.
 * Plans of the accepted schedule still need the plan-scoped change decision;
 * a missing or unrelated acknowledgement cannot silently release that guard. */
function copyPlanBlocksStart(space: ProgramPrivateSpace, copy: ProgramCopy, itemId: string): boolean {
  const versionId = copy.appliedFields[itemId]?.schedule ?? copy.baseVersionId;
  return Object.values(space.recurrencePlans?.owners ?? {}).some(owner => {
    if (owner.source.publicOwner?.copyId !== copy.id || owner.source.itemId !== itemId) return false;
    return owner.source.publicOwner.scheduleVersionId === versionId
      || ![...(copy.recurrence?.retainedChoices?.entries ?? []), ...(copy.kindHandoffs?.entries ?? [])].some(choice => choice.itemId === itemId
        && choice.toVersionId === versionId && choice.personalPlanOwnerIds.includes(owner.ownerId));
  });
}

export function setProgramCopySeriesStart(data: ProgramData, input: ProgramPrivateMutationBase & { copyId: string; itemId: string; start: string | null }): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  return mutate(data, input, 'private-series-start', { copyId: input.copyId, itemId: input.itemId, start: input.start }, space => {
    const copy = space.copies.find(copy => copy.id === input.copyId), item = copy && copySourceItem(data, copy, input.itemId);
    if (!copy?.recurrence?.itemIds.includes(input.itemId) || item?.schedule.kind !== 'recurring' || item.schedule.start.kind !== 'undated') return { result: input.itemId, reason: 'unresolved' };
    if (programDocumentContentLock(space, copy.documentId) !== 'active' || input.start !== null && !programDate(input.start)) return { result: input.itemId, reason: 'invalid' };
    if (programPublicCopyItemStart(copy, item) === input.start) return { result: input.itemId };
    if (copyPlanBlocksStart(space, copy, input.itemId)) return { result: input.itemId, reason: 'unresolved' };
    (copy.recurrence.starts ??= {})[input.itemId] = input.start;
    return { result: input.itemId };
  });
}

export type ProgramCopyAnchorPreview = {
  copyId: string; anchor: string | null;
  items: { itemId: string; title: string; sourceSchedule: string; beforeDate: string | null;
    afterDate: string | null; privateOverride: boolean; inferredOverride: boolean; recurring?: boolean }[];
};

function copySourceItem(data: ProgramData, copy: ProgramCopy, itemId: string, field: ProgramCopyField = 'schedule') {
  const versionId = copy.appliedFields[itemId]?.[field] ?? copy.baseVersionId;
  return data.public.versions.find(version => version.id === versionId && version.flowId === copy.flowId)?.items.find(item => item.id === itemId);
}

/** Last inherited dates detect raw-editor changes that have no explicit sidecar. */
export function previewProgramCopyAnchor(data: ProgramData, input: { actorId: string; copyId: string; anchor: string | null }): ProgramTransition<ProgramCopyAnchorPreview> {
  if (!validateProgramData(data) || input.anchor !== null && !programDate(input.anchor)) return programFailure(data, 'invalid');
  const space = Object.hasOwn(data.spaces, input.actorId) ? data.spaces[input.actorId] : undefined;
  if (!space) return programFailure(data, 'forbidden');
  const copy = space.copies.find(copy => copy.id === input.copyId);
  if (!copy) return programFailure(data, 'missing');
  const allItems = documents(space.text).flatMap(doc => M.parseDocument(doc, space.text).items);
  const items: ProgramCopyAnchorPreview['items'] = [];
  for (const [itemId, lineId] of Object.entries(copy.itemLines)) {
    const source = copySourceItem(data, copy, itemId), current = allItems.find(item => item.id === lineId);
    if (source?.schedule.kind === 'recurring' && copy.recurrence?.itemIds.includes(itemId)) {
      items.push({ itemId, title: source.title, sourceSchedule: scheduleLabel(source), beforeDate: programPublicCopyItemStart(copy, source),
        afterDate: programPublicCopyItemStart({ ...copy, anchor: input.anchor }, source), privateOverride: source.schedule.start.kind !== 'relative', inferredOverride: false, recurring: true });
      continue;
    }
    if (!source || !current) return programFailure(data, 'unresolved');
    const explicit = Object.hasOwn(copy.itemOverrides[itemId] ?? {}, 'date');
    // Missing provenance is ambiguous: preserve rather than infer from a newer source schedule.
    const inferredOverride = !explicit && (!Object.hasOwn(copy.inheritedDates, itemId) || current.date !== copy.inheritedDates[itemId]);
    const privateOverride = explicit || inferredOverride;
    items.push({ itemId, title: current.title, sourceSchedule: scheduleLabel(source), beforeDate: current.date,
      afterDate: privateOverride ? current.date : resolveProgramItemDate(source, input.anchor), privateOverride, inferredOverride });
  }
  return { ok: true, data, changed: false, result: { copyId: copy.id, anchor: input.anchor, items } };
}

export function setProgramCopyAnchor(data: ProgramData, input: ProgramPrivateMutationBase & { copyId: string; anchor: string | null }): ProgramTransition<string> {
  return mutate(data, input, 'private-copy-anchor', { copyId: input.copyId, anchor: input.anchor }, space => {
    const preview = previewProgramCopyAnchor(data, input);
    if (!preview.ok) return { result: input.copyId, reason: preview.reason };
    const copy = space.copies.find(copy => copy.id === input.copyId)!;
    for (const row of preview.result.items) {
      if (row.recurring) {
        if (row.beforeDate !== row.afterDate && copyPlanBlocksStart(space, copy, row.itemId)) return { result: copy.id, reason: 'unresolved' };
        continue;
      }
      if (row.inferredOverride) (copy.itemOverrides[row.itemId] ?? (copy.itemOverrides[row.itemId] = {})).date = row.beforeDate;
      if (row.privateOverride) continue;
      if (row.beforeDate !== row.afterDate) {
        space.text = M.updateTask(space.text, copy.itemLines[row.itemId], { date: row.afterDate });
        const actual = documents(space.text).flatMap(doc => M.parseDocument(doc, space.text).items).find(item => item.id === copy.itemLines[row.itemId]);
        if (!actual || actual.date !== row.afterDate) return { result: copy.id, reason: 'conflict' };
      }
      copy.inheritedDates[row.itemId] = row.afterDate;
    }
    copy.anchor = input.anchor;
    return { result: copy.id };
  });
}

/** Exclusion changes execution inclusion only; source rows and records never disappear. */
export function setProgramCopyInclusion(data: ProgramData, input: ProgramPrivateMutationBase & { copyId: string; itemId: string; included: boolean }): ProgramTransition<string> {
  return mutate(data, input, 'private-copy-inclusion', { copyId: input.copyId, itemId: input.itemId, included: input.included }, space => {
    const copy = space.copies.find(copy => copy.id === input.copyId);
    if (!copy) return { result: input.copyId, reason: 'missing' };
    if (typeof input.included !== 'boolean') return { result: copy.id, reason: 'invalid' };
    const item = copySourceItem(data, copy, input.itemId);
    if (!item) return { result: copy.id, reason: 'missing' };
    if (!copy.itemLines[input.itemId]) {
      if (!input.included) return { result: copy.id };
      if (!supportedItem(item)) return { result: copy.id, reason: 'unresolved' };
      if (!appendSourceItem(space, copy, item)) return { result: copy.id, reason: 'limit' };
    }
    if (input.included) {
      if (!copy.includedItemIds.includes(input.itemId)) copy.includedItemIds.push(input.itemId);
    } else copy.includedItemIds = copy.includedItemIds.filter(id => id !== input.itemId);
    (copy.itemOverrides[input.itemId] ?? (copy.itemOverrides[input.itemId] = {})).included = input.included;
    return { result: copy.id };
  });
}

export type ProgramCopyFieldComparison = {
  field: ProgramCopyField;
  baseVersionId: string;
  sourceChanged: boolean;
  privateChanged: boolean;
  alreadyApplied: boolean;
  canApply: boolean;
  blockedReason?: 'series-kind-change' | 'series-private-start' | 'series-personal-plan' | 'retired-check-review';
  before: ProgramPublicItem[ProgramCopyField] | null;
  incoming: ProgramPublicItem[ProgramCopyField] | null;
  currentText: string;
};
export type ProgramCopyItemComparison = {
  itemId: string; title: string; state: 'added' | 'removed' | 'changed' | 'unchanged';
  fields: ProgramCopyFieldComparison[];
};
export type ProgramCopyComparison = {
  copyId: string; baseVersionId: string; targetVersionId: string;
  items: ProgramCopyItemComparison[];
  preservesPrivateDates: true; preservesPrivateNotes: true; preservesLocalOrder: true;
};

function ownedFieldLines(doc: TextDocument, lineId: string, field: Exclude<ProgramCopyField, 'subchecks'>): TextLine[] {
  return doc.lines.filter(line => line.id.startsWith(`${lineId}:${field}:`));
}
function normalizedChecks(checks: ProgramPublicItem['subchecks']) {
  return checks.map(child => ({ id: child.id, title: child.title.trim() })).sort((a, b) => a.id.localeCompare(b.id));
}
function expectedField(item: ProgramPublicItem, field: ProgramCopyField): unknown {
  if (field === 'subchecks') return normalizedChecks(item.subchecks);
  const lines = fieldText(item, field);
  return field === 'title' ? { title: item.title.trim(), source: lines } : lines;
}
/** The exact imported series row remains metadata, even when it is not a v11 task. */
function copySeriesPosition(space: ProgramPrivateSpace, copy: ProgramCopy, itemId: string) {
  if (!copy.recurrence?.itemIds.includes(itemId)) return null;
  const lineId = copy.itemLines[itemId];
  const matches = documents(space.text).flatMap(doc => doc.lines.filter(line => line.id === lineId).map(line => ({ doc, line })));
  if (matches.length !== 1) return null;
  const position = matches[0], row = M.rowMeta(space.text, position.doc.id).find(row => row.id === lineId);
  return row ? { ...position, row } : null;
}
function seriesMetadataTitle(line: TextLine | undefined, prefix: string): string | null {
  const value = line?.text.trimStart();
  return value?.startsWith(prefix) ? value.slice(prefix.length).trim() : null;
}
function currentField(space: ProgramPrivateSpace, copy: ProgramCopy, itemId: string, field: ProgramCopyField): unknown {
  const series = !!copy.recurrence?.itemIds.includes(itemId);
  const doc = series ? copySeriesPosition(space, copy, itemId)?.doc : M.getDocument(space.text, copy.documentId), lineId = copy.itemLines[itemId];
  if (!doc || !lineId) return null;
  const rows = M.parseDocument(doc, space.text).items;
  if (field === 'subchecks') {
    const children = copy.subcheckLines[itemId] ?? {};
    const values: ProgramPublicItem['subchecks'] = [];
    for (const [id, childId] of Object.entries(children)) {
      if (doc.lines.some(line => line.id === `${childId}:source-removed`)) continue;
      const title = series ? seriesMetadataTitle(doc.lines.find(line => line.id === childId), '반복 확인: ') : rows.find(row => row.id === childId)?.title;
      if (title == null) return null;
      values.push({ id, title });
    }
    return normalizedChecks(values);
  }
  const lines = ownedFieldLines(doc, lineId, field).map(line => line.text.trimStart());
  return field === 'title' ? { title: series ? seriesMetadataTitle(doc.lines.find(line => line.id === lineId), '반복: ') : rows.find(row => row.id === lineId)?.title ?? null, source: lines } : lines;
}
function fieldCurrentLabel(value: unknown): string {
  if (Array.isArray(value)) return value.every(part => typeof part === 'string') ? value.join('\n') : value.map(part => (part as { title: string }).title).join('\n');
  return value && typeof value === 'object' && 'title' in value ? String(value.title ?? '') : '';
}
function retiredCheckDifferences(space: ProgramPrivateSpace, copy: ProgramCopy, incoming: ProgramPublicItem) {
  const series = !!copy.recurrence?.itemIds.includes(incoming.id), doc = series ? copySeriesPosition(space, copy, incoming.id)?.doc : M.getDocument(space.text, copy.documentId);
  if (!doc) return [];
  const rows = M.parseDocument(doc, space.text).items;
  return incoming.subchecks.flatMap(child => {
    const lineId = copy.subcheckLines[incoming.id]?.[child.id];
    if (!lineId || !doc.lines.some(line => line.id === `${lineId}:source-removed`)) return [];
    const previousTitle = series ? seriesMetadataTitle(doc.lines.find(line => line.id === lineId), '반복 확인: ') : rows.find(row => row.id === lineId)?.title ?? null;
    return previousTitle === child.title.trim() ? [] : [{ childId: child.id, lineId, previousTitle, incomingTitle: child.title.trim() }];
  });
}
function sourceFieldBlock(space: ProgramPrivateSpace, copy: ProgramCopy, incoming: ProgramPublicItem | undefined, field: ProgramCopyField, targetVersionId: string): ProgramCopyFieldComparison['blockedReason'] {
  if (!incoming || !copy.itemLines[incoming.id]) return undefined;
  const series = !!copy.recurrence?.itemIds.includes(incoming.id);
  if (field === 'schedule') {
    if (series !== (incoming.schedule.kind === 'recurring')) return 'series-kind-change';
    if (series && incoming.schedule.kind === 'recurring') {
      if (copy.recurrence?.starts?.[incoming.id] && incoming.schedule.start.kind !== 'undated') return 'series-private-start';
      if ((copy.appliedFields[incoming.id]?.schedule ?? copy.baseVersionId) !== targetVersionId
        && Object.values(space.recurrencePlans?.owners ?? {}).some(owner => owner.source.publicOwner?.copyId === copy.id && owner.source.itemId === incoming.id)) return 'series-personal-plan';
    }
  }
  if (field === 'subchecks' && retiredCheckDifferences(space, copy, incoming).length) return 'retired-check-review';
  return undefined;
}

/** Comparison is read-only; removed source rows remain available with all history. */
export function compareProgramCopyVersion(data: ProgramData, input: { actorId: string; copyId: string; versionId: string }): ProgramTransition<ProgramCopyComparison> {
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  const space = Object.hasOwn(data.spaces, input.actorId) ? data.spaces[input.actorId] : undefined;
  if (!space) return programFailure(data, 'forbidden');
  const copy = space.copies.find(copy => copy.id === input.copyId), target = data.public.versions.find(version => version.id === input.versionId);
  if (!copy || !target || copy.flowId !== target.flowId) return programFailure(data, 'missing');
  const itemIds = [...new Set([...Object.keys(copy.itemLines), ...target.items.map(item => item.id)])];
  const items: ProgramCopyItemComparison[] = itemIds.map(itemId => {
    const incoming = target.items.find(item => item.id === itemId);
    const original = data.public.versions.find(version => version.id === copy.baseVersionId)?.items.find(item => item.id === itemId);
    const fields = COPY_FIELDS.map(field => {
      const baseVersionId = copy.appliedFields[itemId]?.[field] ?? copy.baseVersionId;
      const baseline = data.public.versions.find(version => version.id === baseVersionId)?.items.find(item => item.id === itemId);
      const local = currentField(space, copy, itemId, field);
      const sourceChanged = !same(baseline?.[field] ?? null, incoming?.[field] ?? null);
      const alreadyApplied = !!incoming && same(local, expectedField(incoming, field));
      const privateChanged = !!copy.itemLines[itemId] && !!baseline && !same(local, expectedField(baseline, field)) && !alreadyApplied;
      const blockedReason = sourceFieldBlock(space, copy, incoming, field, target.id);
      return { field, baseVersionId, sourceChanged, privateChanged, alreadyApplied,
        canApply: !!incoming && supportedItem(incoming) && !privateChanged && !blockedReason,
        ...(blockedReason ? { blockedReason } : {}),
        before: baseline?.[field] ?? null, incoming: incoming?.[field] ?? null, currentText: fieldCurrentLabel(local) };
    });
    return { itemId, title: incoming?.title ?? original?.title ?? itemId,
      state: !copy.itemLines[itemId] ? 'added' : !incoming ? 'removed' : fields.some(field => field.sourceChanged) ? 'changed' : 'unchanged', fields };
  });
  return { ok: true, data, changed: false, result: { copyId: copy.id, baseVersionId: copy.baseVersionId, targetVersionId: target.id,
    items, preservesPrivateDates: true, preservesPrivateNotes: true, preservesLocalOrder: true } };
}

function replaceSourceField(space: ProgramPrivateSpace, copy: ProgramCopy, item: ProgramPublicItem, field: Exclude<ProgramCopyField, 'subchecks'>): boolean {
  const lineId = copy.itemLines[item.id];
  const series = copySeriesPosition(space, copy, item.id);
  if (field === 'title' && series) {
    const previousTitle = seriesMetadataTitle(series.line, '반복: ');
    if (previousTitle === null) return false;
    series.line.text = `${'  '.repeat(series.row.depth)}반복: ${item.title.trim()}`;
    // Only generated, untouched reference captions follow the accepted title.
    for (const ref of copy.recurrence?.references ?? []) if (ref.itemId === item.id) {
      const line = M.getDocument(space.text, ref.documentId)?.lines.find(line => line.id === ref.lineId);
      if (line && seriesMetadataTitle(line, '반복 참조: ') === previousTitle) line.text = `${/^ */.exec(line.text)![0]}반복 참조: ${item.title.trim()}`;
    }
  } else if (field === 'title') {
    const next = M.updateTask(space.text, lineId, { title: item.title });
    space.text = next;
  }
  const doc = series?.doc ?? M.getDocument(space.text, copy.documentId);
  const owner = series ? { sourceIndex: series.row.index, depth: series.row.depth } : doc && M.parseDocument(doc, space.text).items.find(row => row.id === lineId);
  if (!doc || !owner) return false;
  const existing = ownedFieldLines(doc, lineId, field), ids = new Set(existing.map(line => line.id));
  const at = existing.length ? doc.lines.findIndex(line => line.id === existing[0].id) : owner.sourceIndex + 1;
  const preceding = doc.lines.slice(0, at).filter(line => !ids.has(line.id)).length;
  doc.lines = doc.lines.filter(line => !ids.has(line.id));
  doc.lines.splice(preceding, 0, ...sourceFieldLines(item, lineId, field, owner.depth + 1));
  return M.validate(space.text);
}

function applySourceChecks(space: ProgramPrivateSpace, copy: ProgramCopy, item: ProgramPublicItem): boolean {
  const lineId = copy.itemLines[item.id], mapped = copy.subcheckLines[item.id] ?? (copy.subcheckLines[item.id] = {});
  const series = !!copy.recurrence?.itemIds.includes(item.id);
  const documentId = series ? copySeriesPosition(space, copy, item.id)?.doc.id : copy.documentId;
  if (!documentId) return false;
  for (const child of item.subchecks) {
    let doc = M.getDocument(space.text, documentId);
    if (!doc) return false;
    if (mapped[child.id]) {
      if (series) {
        const line = doc.lines.find(line => line.id === mapped[child.id]);
        if (!line || seriesMetadataTitle(line, '반복 확인: ') === null) return false;
        line.text = `${/^ */.exec(line.text)![0]}반복 확인: ${child.title.trim()}`;
      } else space.text = M.updateTask(space.text, mapped[child.id], { title: child.title });
      doc = M.getDocument(space.text, documentId)!;
      doc.lines = doc.lines.filter(line => line.id !== `${mapped[child.id]}:source-removed`);
    } else {
      const owner = M.rowMeta(space.text, documentId).find(row => row.id === lineId);
      if (!owner) return false;
      const childId = programId('source-child');
      doc.lines.splice(owner.subtreeEndIndex, 0, { id: childId, text: `${'  '.repeat(owner.depth + 1)}${series ? '반복 확인: ' : '- [ ] '}${child.title}` });
      mapped[child.id] = childId;
      if (!series) registerItems(space.text, doc, copy.documentId);
    }
    if (!M.validate(space.text)) return false;
  }
  const doc = M.getDocument(space.text, documentId)!;
  for (const [childId, sourceLineId] of Object.entries(mapped)) {
    if (item.subchecks.some(child => child.id === childId) || doc.lines.some(line => line.id === `${sourceLineId}:source-removed`)) continue;
    const child = M.rowMeta(space.text, doc.id).find(row => row.id === sourceLineId);
    if (!child) return false;
    doc.lines.splice(child.index + 1, 0, { id: `${sourceLineId}:source-removed`, text: `${'  '.repeat(child.depth + 1)}원문에서 제외된 체크 · 개인 기록 유지` });
  }
  // Explicitly accepting this ordered field also accepts source check order.
  // Permute whole stable-ID subtrees in the existing source-check slots;
  // unrelated private rows and retained removed checks keep their positions.
  const rows = M.rowMeta(space.text, documentId), owner = rows.find(row => row.id === lineId);
  const active = item.subchecks.map(child => rows.find(row => row.id === mapped[child.id]));
  if (!owner || active.some(row => !row || row.depth !== owner.depth + 1 || row.index <= owner.index || row.subtreeEndIndex > owner.subtreeEndIndex)) return false;
  const blocks = active.map(row => doc.lines.slice(row!.index, row!.subtreeEndIndex));
  const slots = [...active].sort((a, b) => a!.index - b!.index);
  if (slots.some((row, index) => index > 0 && slots[index - 1]!.subtreeEndIndex > row!.index)) return false;
  const replacements = new Map(slots.map((row, index) => [row!.index, { end: row!.subtreeEndIndex, lines: blocks[index] }]));
  const reordered: TextLine[] = [];
  for (let index = 0; index < doc.lines.length;) {
    const replacement = replacements.get(index);
    if (replacement) { reordered.push(...replacement.lines); index = replacement.end; }
    else reordered.push(doc.lines[index++]);
  }
  doc.lines = reordered;
  return M.validate(space.text);
}

export type ProgramCopyResolvableField = 'title' | 'description' | 'completionCriteria' | 'sourceUrl';
const COPY_RESOLVABLE_FIELDS: readonly ProgramCopyResolvableField[] = ['title', 'description', 'completionCriteria', 'sourceUrl'];
export type ProgramCopyFieldResolutionPreview = {
  version: 1; copyId: string; itemId: string; field: ProgramCopyResolvableField; fromVersionId: string; toVersionId: string;
  before: string | null; incoming: string | null; currentText: string;
  target: { documentId: string; lineId: string; ownerLine: TextLine; fieldLines: TextLine[] };
  source: { flowId: string; ownerId: string; baseVersionId: string; fromVersionToken: string; toVersionToken: string };
};
/** One explicitly chosen text field, never a schedule/check or automatic merge.
 * The detached preview is evidence, not authority: apply recreates it freshly. */
export function previewProgramCopyFieldResolution(data: ProgramData, input: {
  actorId: string; copyId: string; itemId: string; versionId: string; field: ProgramCopyResolvableField;
}): ProgramTransition<ProgramCopyFieldResolutionPreview> {
  if (!COPY_RESOLVABLE_FIELDS.includes(input.field)) return programFailure(data, 'invalid');
  const compared = compareProgramCopyVersion(data, input);
  if (!compared.ok) return compared;
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  const field = compared.result.items.find(row => row.itemId === input.itemId)?.fields.find(field => field.field === input.field);
  if (!field || !field.sourceChanged || !field.privateChanged || field.alreadyApplied || field.blockedReason) return programFailure(data, 'conflict');
  const space = data.spaces[input.actorId], copy = space.copies.find(copy => copy.id === input.copyId)!;
  const from = data.public.versions.find(version => version.id === field.baseVersionId), to = data.public.versions.find(version => version.id === input.versionId);
  const flow = data.public.flows.find(flow => flow.id === copy.flowId), incoming = to?.items.find(item => item.id === input.itemId);
  if (!flow || !from || !to || from.flowId !== copy.flowId || to.flowId !== copy.flowId || !incoming || !supportedItem(incoming)) return programFailure(data, 'missing');
  const lineId = copy.itemLines[input.itemId], positions = documents(space.text).flatMap(doc => doc.lines.filter(line => line.id === lineId).map(line => ({ doc, line })));
  if (positions.length !== 1) return programFailure(data, 'unresolved');
  const { doc, line } = positions[0], series = copySeriesPosition(space, copy, input.itemId);
  if (programDocumentContentLock(space, doc.id) !== 'active' || programDocumentContentLock(space, copy.documentId) !== 'active'
    || (copy.recurrence?.itemIds.includes(input.itemId) ? !series : doc.id !== copy.documentId || !M.tasks(space.text).some(task => task.id === lineId && task.isCanonical))) return programFailure(data, 'unresolved');
  const fieldLines = ownedFieldLines(doc, lineId, input.field);
  // An edited source metadata line that became a task/reference is not a text
  // field replacement: its execution/structure needs its own explicit contract.
  const metadataIds = new Set(fieldLines.map(line => line.id));
  if (M.parseDocument(doc, space.text).items.some(item => metadataIds.has(item.id))
    || space.text.bindings.some(binding => binding.docId === doc.id && metadataIds.has(binding.lineId))) return programFailure(data, 'unresolved');
  return { ok: true, data, changed: false, result: programClone({ version: 1, copyId: copy.id, itemId: input.itemId, field: input.field,
    fromVersionId: from.id, toVersionId: to.id, before: field.before as string | null, incoming: field.incoming as string | null, currentText: field.currentText,
    target: { documentId: doc.id, lineId, ownerLine: line, fieldLines },
    source: { flowId: flow.id, ownerId: flow.ownerId, baseVersionId: copy.baseVersionId, fromVersionToken: JSON.stringify(from), toVersionToken: JSON.stringify(to) } }) };
}

export type ProgramCopyScheduleResolution = {
  version: 1; copyId: string; itemId: string; fromVersionId: string; toVersionId: string;
  before: Extract<ProgramPublicItem['schedule'], { kind: 'recurring' }>;
  incoming: Extract<ProgramPublicItem['schedule'], { kind: 'recurring' }>;
  previousStart: { present: boolean; date: string | null }; beforeStartDate: string | null; nextStartDate: string | null;
  personalPlans: { ownerId: string; sourceVersionId: string; continuesAfter: boolean;
    changes: { scope: 'whole_series' | 'future_series'; from: string; to: string }[]; executionRecords: number }[];
};
/** Read-only, exact schedule decision. A kind change or a private metadata edit
 * cannot be authorized by this acknowledgement. The commit recreates this preview. */
export function previewProgramCopyScheduleResolution(data: ProgramData, input: { actorId: string; copyId: string; itemId: string; versionId: string }): ProgramTransition<ProgramCopyScheduleResolution> {
  const compared = compareProgramCopyVersion(data, input);
  if (!compared.ok) return compared;
  const field = compared.result.items.find(row => row.itemId === input.itemId)?.fields.find(field => field.field === 'schedule');
  if (!field || !field.sourceChanged || field.privateChanged || !['series-private-start', 'series-personal-plan'].includes(field.blockedReason ?? '')) return programFailure(data, 'conflict');
  const before = field.before as ProgramPublicItem['schedule'] | null, incoming = field.incoming as ProgramPublicItem['schedule'] | null;
  if (before?.kind !== 'recurring' || incoming?.kind !== 'recurring') return programFailure(data, 'conflict');
  const space = data.spaces[input.actorId], copy = space.copies.find(copy => copy.id === input.copyId)!;
  const present = Object.hasOwn(copy.recurrence?.starts ?? {}, input.itemId), privateStart = copy.recurrence?.starts?.[input.itemId] ?? null;
  const nextStartDate = incoming.start.kind === 'undated' ? privateStart : programRecurringScheduleStart(incoming, copy.anchor);
  const personalPlans = Object.values(space.recurrencePlans?.owners ?? {}).filter(owner => owner.source.publicOwner?.copyId === copy.id && owner.source.itemId === input.itemId)
    .sort((a, b) => a.ownerId.localeCompare(b.ownerId)).map(owner => ({ ownerId: owner.ownerId, sourceVersionId: owner.source.publicOwner!.scheduleVersionId,
      continuesAfter: owner.source.publicOwner!.scheduleVersionId === input.versionId && same(owner.source.publicOwner!.schedule, incoming) && owner.source.sourceRule.startDate === nextStartDate,
      changes: owner.operations.map(operation => ({ scope: operation.scope, from: operation.target.originalDate, to: operation.targetDate })),
      executionRecords: new Set((owner.executionEvents ?? []).map(event => event.next.occurrenceId)).size }));
  return { ok: true, data, changed: false, result: programClone({ version: 1, copyId: copy.id, itemId: input.itemId, fromVersionId: field.baseVersionId,
    toVersionId: input.versionId, before, incoming, previousStart: { present, date: privateStart },
    beforeStartDate: before.start.kind === 'undated' ? privateStart : programRecurringScheduleStart(before, copy.anchor), nextStartDate, personalPlans }) };
}

export type ProgramCopyKindChangePreview = {
  version: 1; copyId: string; itemId: string; fromVersionId: string; toVersionId: string;
  before: ProgramPublicItem['schedule']; incoming: ProgramPublicItem['schedule'];
  direction: 'ordinary-to-recurring' | 'recurring-to-ordinary'; restoresOrdinary: boolean;
  ordinary: { lineId: string | null; title: string; date: string | null; completed: boolean; childTasks: number; progressRecords: number; references: number };
  recurrenceRecords: number; personalPlanOwnerIds: string[]; recurringReferences: number;
};
function copyKindBlock(space: ProgramPrivateSpace, lineId: string) {
  const positions = documents(space.text).filter(doc => doc.lines.some(line => line.id === lineId));
  if (positions.length !== 1) return null;
  const doc = positions[0], row = M.rowMeta(space.text, doc.id).find(row => row.id === lineId);
  if (!row || row.subtreeEndIndex <= row.index) return null;
  return { doc, index: row.index, lines: programClone(doc.lines.slice(row.index, row.subtreeEndIndex)) };
}
function copyAcceptedItem(data: ProgramData, copy: ProgramCopy, itemId: string, versions = copy.appliedFields[itemId]) {
  const item = { id: itemId } as ProgramPublicItem;
  for (const field of COPY_FIELDS) {
    const original = data.public.versions.find(version => version.id === (versions?.[field] ?? copy.baseVersionId))?.items.find(item => item.id === itemId);
    if (!original) return null;
    Object.assign(item, { [field]: programClone(original[field]) });
  }
  return item;
}
function copyKindSlot(copy: ProgramCopy, itemId: string): ProgramCopyKindSlot {
  const recurring = !!copy.recurrence?.itemIds.includes(itemId);
  return { lineId: copy.itemLines[itemId], subcheckLines: programClone(copy.subcheckLines[itemId] ?? {}),
    fieldVersions: Object.fromEntries(COPY_FIELDS.map(field => [field, copy.appliedFields[itemId]?.[field] ?? copy.baseVersionId])) as Record<ProgramCopyField, string>,
    inheritedDate: copy.inheritedDates[itemId] ?? null,
    dateChoice: { present: !recurring && Object.hasOwn(copy.itemOverrides[itemId] ?? {}, 'date'), value: !recurring ? copy.itemOverrides[itemId]?.date ?? null : null },
    startChoice: { present: recurring && Object.hasOwn(copy.recurrence?.starts ?? {}, itemId), value: recurring ? copy.recurrence?.starts?.[itemId] ?? null : null } };
}

/** Read-only exact-owner decision, not permission to merge unrelated source fields. */
export function previewProgramCopyKindChange(data: ProgramData, input: { actorId: string; copyId: string; itemId: string; versionId: string }): ProgramTransition<ProgramCopyKindChangePreview> {
  const compared = compareProgramCopyVersion(data, input);
  if (!compared.ok) return compared;
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  const field = compared.result.items.find(row => row.itemId === input.itemId)?.fields.find(field => field.field === 'schedule');
  if (!field || field.blockedReason !== 'series-kind-change' || field.privateChanged || !field.before || !field.incoming) return programFailure(data, 'conflict');
  const space = data.spaces[input.actorId], copy = space.copies.find(copy => copy.id === input.copyId)!;
  const active = copyKindBlock(space, copy.itemLines[input.itemId]);
  if (!active || active.doc.id !== copy.documentId || programDocumentContentLock(space, copy.documentId) !== 'active') return programFailure(data, 'unresolved');
  const before = field.before as ProgramPublicItem['schedule'], incoming = field.incoming as ProgramPublicItem['schedule'];
  const ordinaryId = before.kind === 'recurring' ? copy.kindHandoffs?.items[input.itemId]?.ordinary.lineId ?? null : copy.itemLines[input.itemId];
  const ordinaryBlock = ordinaryId ? copyKindBlock(space, ordinaryId) : null;
  const ordinary = ordinaryBlock && M.parseDocument(ordinaryBlock.doc, space.text).items.find(item => item.id === ordinaryId && item.isCanonical);
  if (ordinaryId && !ordinary) return programFailure(data, 'unresolved');
  const ids = new Set(ordinaryBlock?.lines.map(line => line.id) ?? []);
  const personalPlanOwnerIds = Object.values(space.recurrencePlans?.owners ?? {}).filter(owner => owner.source.publicOwner?.copyId === copy.id && owner.source.itemId === input.itemId).map(owner => owner.ownerId).sort();
  return { ok: true, data, changed: false, result: programClone({ version: 1, copyId: copy.id, itemId: input.itemId, fromVersionId: field.baseVersionId, toVersionId: input.versionId,
    before, incoming, direction: before.kind === 'recurring' ? 'recurring-to-ordinary' : 'ordinary-to-recurring', restoresOrdinary: before.kind === 'recurring' && !!ordinary,
    ordinary: { lineId: ordinaryId, title: ordinary?.title ?? '', date: ordinary?.date ?? null, completed: ordinary?.done ?? false,
      childTasks: ordinaryBlock ? M.parseDocument(ordinaryBlock.doc, space.text).items.filter(item => ids.has(item.id) && item.id !== ordinaryId).length : 0,
      progressRecords: space.text.progressRecords.filter(record => ids.has(record.taskId)).length,
      references: space.text.bindings.filter(binding => binding.kind === 'task' && ids.has(binding.taskId)).length },
    recurrenceRecords: Object.values(space.recurrenceExecution?.entries ?? {}).filter(entry => entry.publicOwner?.copyId === copy.id && entry.itemId === input.itemId).length,
    personalPlanOwnerIds, recurringReferences: (copy.recurrence?.references ?? []).filter(ref => ref.itemId === input.itemId).length }) };
}

export function applyProgramCopyKindChange(data: ProgramData, input: ProgramPrivateMutationBase & { confirmed: true; at: string; preview: ProgramCopyKindChangePreview }): ProgramTransition<string> {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  return mutate(data, input, 'private-copy-kind-change', { confirmed: input.confirmed, at: input.at, preview: input.preview }, space => {
    if (input.confirmed !== true || typeof input.at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input.at)
      || !Number.isFinite(Date.parse(input.at)) || new Date(input.at).toISOString() !== input.at || !programRecord(input.preview)) return { result: '', reason: 'invalid' };
    const p = input.preview, fresh = previewProgramCopyKindChange(data, { actorId: input.actorId, copyId: p.copyId, itemId: p.itemId, versionId: p.toVersionId });
    if (!fresh.ok || !same(fresh.result, p)) return { result: p.copyId, reason: 'conflict' };
    const copy = space.copies.find(copy => copy.id === p.copyId)!;
    if ((copy.kindHandoffs?.entries.length ?? 0) >= PROGRAM_COPY_KIND_HANDOFF.entries) return { result: copy.id, reason: 'limit' };
    const priorItems = documents(space.text).flatMap(doc => M.parseDocument(doc, space.text).items), priorProgress = programClone(space.text.progressRecords);
    const beforeKind = p.before.kind === 'recurring' ? 'recurring' : 'ordinary', nextKind = p.incoming.kind === 'recurring' ? 'recurring' : 'ordinary';
    const outgoing = copyKindBlock(space, copy.itemLines[p.itemId])!, outgoingSlot = copyKindSlot(copy, p.itemId);
    const accepted = copyAcceptedItem(data, copy, p.itemId); if (!accepted) return { result: copy.id, reason: 'missing' };
    accepted.schedule = programClone(p.incoming);
    const retainedId = space.retentionDocuments?.[copy.documentId] ?? `${copy.documentId}-retained`;
    let retained = M.getDocument(space.text, retainedId);
    if (retained && space.retentionDocuments?.[copy.documentId] !== retainedId) return { result: copy.id, reason: 'conflict' };
    if (!retained) {
      if (space.text.documents.length >= 100) return { result: copy.id, reason: 'limit' };
      retained = { id: retainedId, title: `${outgoing.doc.title} · 이전 실행 형태`, folderId: outgoing.doc.folderId, folder: outgoing.doc.folder, lines: [] };
      space.text.documents.push(retained); (space.retentionDocuments ??= {})[copy.documentId] = retainedId; space.archivedDocumentIds.push(retainedId);
    }
    const oldPair = copy.kindHandoffs?.items[p.itemId], restoreSlot = oldPair?.[nextKind];
    const restored = restoreSlot ? copyKindBlock(space, restoreSlot.lineId) : null;
    if (restoreSlot && (!restored || restored.doc.id !== retainedId)) return { result: copy.id, reason: 'conflict' };
    const newLineId = restoreSlot?.lineId ?? programId('source-item');
    const newChecks = programClone(restoreSlot?.subcheckLines ?? Object.fromEntries(accepted.subchecks.map(child => [child.id, programId('source-child')])));
    const newLines = restored?.lines ?? itemLines(accepted, newLineId, copy.anchor, newChecks);
    if (restored) retained.lines.splice(restored.index, restored.lines.length);
    outgoing.doc.lines.splice(outgoing.index, outgoing.lines.length, ...newLines);
    retained.lines.push(...outgoing.lines);
    copy.itemLines[p.itemId] = newLineId; copy.subcheckLines[p.itemId] = newChecks;
    copy.recurrence ??= { version: 1, itemIds: [] };
    copy.recurrence.itemIds = copy.recurrence.itemIds.filter(id => id !== p.itemId);
    if (nextKind === 'recurring') copy.recurrence.itemIds.push(p.itemId);
    const override = copy.itemOverrides[p.itemId]; if (override) delete override.date;
    if (nextKind === 'ordinary' && restoreSlot?.dateChoice.present) (copy.itemOverrides[p.itemId] ??= {}).date = restoreSlot.dateChoice.value;
    if (copy.recurrence.starts) delete copy.recurrence.starts[p.itemId];
    if (accepted.schedule.kind === 'recurring' && accepted.schedule.start.kind === 'undated' && restoreSlot?.startChoice.present) (copy.recurrence.starts ??= {})[p.itemId] = restoreSlot.startChoice.value;
    copy.inheritedDates[p.itemId] = restoreSlot ? restoreSlot.inheritedDate : resolveProgramItemDate(accepted, copy.anchor);
    registerItems(space.text, outgoing.doc, copy.documentId);
    if (restoreSlot) {
      const archivedSource = copyAcceptedItem(data, copy, p.itemId, restoreSlot.fieldVersions);
      if (!archivedSource) return { result: copy.id, reason: 'invalid' };
      for (const field of COPY_FIELDS.filter(field => field !== 'schedule')) {
        // Only source-owned values still equal to their old accepted baseline follow
        // common fields already accepted in the other form. Private edits stay private.
        if (!same(currentField(space, copy, p.itemId, field), expectedField(archivedSource, field))) continue;
        if (field === 'subchecks' ? !applySourceChecks(space, copy, accepted) : !replaceSourceField(space, copy, accepted, field)) return { result: copy.id, reason: 'invalid' };
      }
    }
    if (!replaceSourceField(space, copy, accepted, 'schedule')) return { result: copy.id, reason: 'invalid' };
    (copy.appliedFields[p.itemId] ??= {}).schedule = p.toVersionId;
    const nextSlot = copyKindSlot(copy, p.itemId);
    copy.kindHandoffs ??= { version: 1, items: {}, entries: [] };
    copy.kindHandoffs.items[p.itemId] = { [beforeKind]: outgoingSlot, [nextKind]: nextSlot } as { ordinary: ProgramCopyKindSlot; recurring: ProgramCopyKindSlot };
    copy.kindHandoffs.entries.push({ id: input.requestId, itemId: p.itemId, fromVersionId: p.fromVersionId, toVersionId: p.toVersionId, at: input.at, personalPlanOwnerIds: [...p.personalPlanOwnerIds] });
    const after = new Map(documents(space.text).flatMap(doc => M.parseDocument(doc, space.text).items).map(item => [item.id, item]));
    if (!same(priorProgress, space.text.progressRecords) || priorItems.some(before => {
      const current = after.get(before.id);
      return !current || ['date', 'done', 'note', 'time'].some(key => !same(before[key as keyof typeof before], current[key as keyof typeof current]));
    })) return { result: copy.id, reason: 'conflict' };
    return { result: copy.id };
  });
}

export type ProgramCopyCheckResolutionPreview = {
  version: 1; copyId: string; itemId: string; fromVersionId: string; toVersionId: string;
  before: ProgramPublicItem['subchecks']; incoming: ProgramPublicItem['subchecks'];
  checks: { childId: string; lineId: string; previousTitle: string; incomingTitle: string; progressRecords: number; descendantRows: number }[];
};
export function previewProgramCopyCheckResolution(data: ProgramData, input: { actorId: string; copyId: string; itemId: string; versionId: string }): ProgramTransition<ProgramCopyCheckResolutionPreview> {
  const compared = compareProgramCopyVersion(data, input);
  if (!compared.ok) return compared;
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  const field = compared.result.items.find(row => row.itemId === input.itemId)?.fields.find(field => field.field === 'subchecks');
  if (!field || field.blockedReason !== 'retired-check-review' || field.privateChanged || !field.before || !field.incoming) return programFailure(data, 'conflict');
  const space = data.spaces[input.actorId], copy = space.copies.find(copy => copy.id === input.copyId)!;
  if (programDocumentContentLock(space, copy.documentId) !== 'active') return programFailure(data, 'unresolved');
  const source = data.public.versions.find(v => v.id === input.versionId)!.items.find(item => item.id === input.itemId)!;
  const differences = retiredCheckDifferences(space, copy, source), doc = M.getDocument(space.text, copy.documentId)!;
  if (!differences.length || differences.some(row => !singleLine(row.previousTitle, 500))) return programFailure(data, 'unresolved');
  const checks = differences.map(row => {
    const owner = M.rowMeta(space.text, doc.id).find(meta => meta.id === row.lineId)!;
    const ids = new Set(doc.lines.slice(owner.index, owner.subtreeEndIndex).map(line => line.id));
    return { ...row, previousTitle: row.previousTitle!, progressRecords: space.text.progressRecords.filter(record => ids.has(record.taskId)).length,
      descendantRows: Math.max(0, ids.size - 2) };
  });
  return { ok: true, data, changed: false, result: programClone({ version: 1, copyId: copy.id, itemId: input.itemId, fromVersionId: field.baseVersionId, toVersionId: input.versionId,
    before: field.before as ProgramPublicItem['subchecks'], incoming: source.subchecks, checks }) };
}

export type ApplyProgramCopyVersionInput = ProgramPrivateMutationBase & {
  copyId: string; versionId: string; expectedBaseVersionId: string;
  itemIds: string[]; fields: ProgramCopyField[];
  scheduleResolution?: { confirmed: true; at: string; preview: ProgramCopyScheduleResolution };
  checkResolution?: { confirmed: true; at: string; preview: ProgramCopyCheckResolutionPreview; choices: Record<string, ProgramCopyCheckChoice> };
  fieldResolution?: { confirmed: true; at: string; preview: ProgramCopyFieldResolutionPreview };
};
export function applyProgramCopyVersion(data: ProgramData, input: ApplyProgramCopyVersionInput): ProgramTransition<string> {
  return mutate(data, input, 'private-copy-update', { copyId: input.copyId, versionId: input.versionId, expectedBaseVersionId: input.expectedBaseVersionId, itemIds: input.itemIds, fields: input.fields,
    ...(input.scheduleResolution !== undefined ? { scheduleResolution: input.scheduleResolution } : {}),
    ...(input.checkResolution !== undefined ? { checkResolution: input.checkResolution } : {}),
    ...(input.fieldResolution !== undefined ? { fieldResolution: input.fieldResolution } : {}) }, space => {
    const copy = space.copies.find(copy => copy.id === input.copyId), target = data.public.versions.find(version => version.id === input.versionId);
    if (!copy || !target || copy.flowId !== target.flowId) return { result: input.copyId, reason: 'missing' };
    if (copy.baseVersionId !== input.expectedBaseVersionId) return { result: copy.id, reason: 'conflict' };
    if (!Array.isArray(input.itemIds) || !input.itemIds.length || new Set(input.itemIds).size !== input.itemIds.length
      || !Array.isArray(input.fields) || !input.fields.length || new Set(input.fields).size !== input.fields.length || input.fields.some(field => !COPY_FIELDS.includes(field))) return { result: copy.id, reason: 'invalid' };
    const comparison = compareProgramCopyVersion(data, { actorId: input.actorId, copyId: input.copyId, versionId: input.versionId });
    if (!comparison.ok) return { result: copy.id, reason: comparison.reason };
    const resolution = input.scheduleResolution;
    const checkResolution = input.checkResolution;
    const fieldResolution = input.fieldResolution;
    if (fieldResolution !== undefined) {
      if (resolution !== undefined || checkResolution !== undefined || !programRecord(fieldResolution)
        || Object.keys(fieldResolution).sort().join(',') !== 'at,confirmed,preview' || fieldResolution.confirmed !== true
        || !programRecord(fieldResolution.preview) || input.itemIds.length !== 1 || input.fields.length !== 1
        || !COPY_RESOLVABLE_FIELDS.includes(input.fields[0] as ProgramCopyResolvableField)
        || typeof fieldResolution.at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(fieldResolution.at)
        || !Number.isFinite(Date.parse(fieldResolution.at)) || new Date(fieldResolution.at).toISOString() !== fieldResolution.at) return { result: copy.id, reason: 'invalid' };
      const fresh = previewProgramCopyFieldResolution(data, { actorId: input.actorId, copyId: copy.id, itemId: input.itemIds[0], versionId: target.id, field: input.fields[0] as ProgramCopyResolvableField });
      if (!fresh.ok || !same(fresh.result, fieldResolution.preview)) return { result: copy.id, reason: 'conflict' };
    }
    if (checkResolution !== undefined) {
      if (resolution !== undefined || !programRecord(checkResolution) || Object.keys(checkResolution).sort().join(',') !== 'at,choices,confirmed,preview'
        || checkResolution.confirmed !== true || input.itemIds.length !== 1 || !same(input.fields, ['subchecks'])
        || !programRecord(checkResolution.choices) || typeof checkResolution.at !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(checkResolution.at)
        || !Number.isFinite(Date.parse(checkResolution.at)) || new Date(checkResolution.at).toISOString() !== checkResolution.at) return { result: copy.id, reason: 'invalid' };
      const fresh = previewProgramCopyCheckResolution(data, { actorId: input.actorId, copyId: copy.id, itemId: input.itemIds[0], versionId: target.id });
      if (!fresh.ok || !same(fresh.result, checkResolution.preview)) return { result: copy.id, reason: 'conflict' };
      if (!same(Object.keys(checkResolution.choices).sort(), fresh.result.checks.map(check => check.childId).sort())
        || Object.values(checkResolution.choices).some(choice => !['keep-private', 'accept-source'].includes(choice))) return { result: copy.id, reason: 'invalid' };
      if ((copy.checkResolutions?.entries.length ?? 0) >= PROGRAM_COPY_CHECK_RESOLUTION.entries) return { result: copy.id, reason: 'limit' };
    }
    if (resolution !== undefined) {
      if (!programRecord(resolution) || Object.keys(resolution).sort().join(',') !== 'at,confirmed,preview' || resolution.confirmed !== true
        || input.itemIds.length !== 1 || !same(input.fields, ['schedule']) || typeof resolution.at !== 'string'
        || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(resolution.at) || !Number.isFinite(Date.parse(resolution.at))
        || new Date(resolution.at).toISOString() !== resolution.at) return { result: copy.id, reason: 'invalid' };
      const fresh = previewProgramCopyScheduleResolution(data, { actorId: input.actorId, copyId: copy.id, itemId: input.itemIds[0], versionId: target.id });
      if (!fresh.ok || !same(fresh.result, resolution.preview)) return { result: copy.id, reason: 'conflict' };
      if ((copy.recurrence?.retainedChoices?.entries.length ?? 0) >= PROGRAM_COPY_SCHEDULE_RETENTION.entries) return { result: copy.id, reason: 'limit' };
    }
    for (const itemId of input.itemIds) {
      const row = comparison.result.items.find(item => item.itemId === itemId);
      if (!row || row.state === 'removed') return { result: copy.id, reason: 'missing' };
      if (row.fields.some(field => input.fields.includes(field.field) && !field.canApply && !(resolution && field.field === 'schedule') && !(checkResolution && field.field === 'subchecks')
        && !(fieldResolution && field.field === fieldResolution.preview.field))) return { result: copy.id, reason: 'conflict' };
    }
    const priorItems = documents(space.text).flatMap(doc => M.parseDocument(doc, space.text).items);
    const priorProgress = programClone(space.text.progressRecords);
    if (resolution) {
      const preview = resolution.preview;
      const history = copy.recurrence!.retainedChoices ?? (copy.recurrence!.retainedChoices = { version: 1, entries: [] });
      history.entries.push({ id: input.requestId, itemId: preview.itemId, fromVersionId: preview.fromVersionId, toVersionId: preview.toVersionId,
        previousStart: programClone(preview.previousStart), personalPlanOwnerIds: preview.personalPlans.map(plan => plan.ownerId), at: resolution.at });
      if (preview.incoming.start.kind !== 'undated' && copy.recurrence?.starts) delete copy.recurrence.starts[preview.itemId];
    }
    for (const itemId of input.itemIds) {
      const item = target.items.find(item => item.id === itemId)!;
      if (!copy.itemLines[itemId]) {
        if (!appendSourceItem(space, copy, item)) return { result: copy.id, reason: 'limit' };
        copy.appliedFields[itemId] = Object.fromEntries(COPY_FIELDS.map(field => [field, target.id]));
        continue;
      }
      for (const field of input.fields) {
        if ((copy.appliedFields[itemId]?.[field] ?? copy.baseVersionId) === target.id && same(currentField(space, copy, itemId, field), expectedField(item, field))) continue;
        if (field === 'subchecks' ? !applySourceChecks(space, copy, item) : !replaceSourceField(space, copy, item, field)) return { result: copy.id, reason: 'invalid' };
        (copy.appliedFields[itemId] ?? (copy.appliedFields[itemId] = {}))[field] = target.id;
        if (field === 'schedule' && item.schedule.kind === 'recurring' && item.schedule.start.kind !== 'undated'
          && copy.recurrence?.starts && copy.recurrence.starts[itemId] === null) delete copy.recurrence.starts[itemId];
      }
    }
    if (checkResolution) {
      const preview = checkResolution.preview, doc = M.getDocument(space.text, copy.documentId)!;
      for (const check of preview.checks) if (checkResolution.choices[check.childId] === 'keep-private') {
        if (copy.recurrence?.itemIds.includes(preview.itemId)) {
          const line = doc.lines.find(line => line.id === check.lineId); if (!line) return { result: copy.id, reason: 'conflict' };
          line.text = `${/^ */.exec(line.text)![0]}반복 확인: ${check.previousTitle}`;
        } else space.text = M.updateTask(space.text, check.lineId, { title: check.previousTitle });
      }
      (copy.checkResolutions ??= { version: 1, entries: [] }).entries.push({ id: input.requestId, itemId: preview.itemId, fromVersionId: preview.fromVersionId,
        toVersionId: preview.toVersionId, at: checkResolution.at, decisions: preview.checks.map(check => ({ childId: check.childId, lineId: check.lineId,
          previousTitle: check.previousTitle, incomingTitle: check.incomingTitle, choice: checkResolution.choices[check.childId] })) });
    }
    // An editor may have persisted its caret on the retirement marker. When
    // that exact marker disappears, return to its own check, not another row
    // or an invented null document. This is presentation state, not progress.
    const position = space.position, positionDoc = M.getDocument(space.text, position.documentId ?? '');
    if (positionDoc && position.lineId && !positionDoc.lines.some(line => line.id === position.lineId)) {
      const restoredId = input.itemIds.flatMap(id => Object.values(copy.subcheckLines[id] ?? {}))
        .find(id => position.lineId === `${id}:source-removed` && positionDoc.lines.some(line => line.id === id));
      if (restoredId) {
        const index = positionDoc.lines.findIndex(line => line.id === restoredId);
        const start = positionDoc.lines.slice(0, index).reduce((offset, line) => offset + line.text.length + 1, 0);
        space.position = { ...position, lineId: restoredId, start, end: start };
      }
    }
    // A source update is never an execution-history or private-detail rewrite.
    const after = new Map(documents(space.text).flatMap(doc => M.parseDocument(doc, space.text).items).map(item => [item.id, item]));
    if (!same(priorProgress, space.text.progressRecords) || priorItems.some(before => {
      const current = after.get(before.id);
      return !current || ['date', 'done', 'note', 'time'].some(key => !same(before[key as keyof typeof before], current[key as keyof typeof current]));
    })) return { result: copy.id, reason: 'conflict' };
    return { result: copy.id };
  });
}
