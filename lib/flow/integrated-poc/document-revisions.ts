import { PROGRAM_LIMITS, programClone, programFailure, programId, programResult, type ProgramData, type ProgramDraftRevision, type ProgramFailure, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programIdentifier, validateProgramData } from './program-data';
import { programSame } from './controller';
import { createProgramDocument, type ProgramPrivateMutationBase } from './private-space';
import { textWorkspaceModel as M, type TextBinding, type TextDocument, type TextLine, type TextWorkspaceState } from './text-workspace';

type RevisionIdentity = NonNullable<ProgramDraftRevision['identity']>;
export type ProgramRevisionInput = ProgramPrivateMutationBase & { documentId: string; revisionId: string };
export type ProgramRevisionPreview = {
  documentId: string; revisionId: string; mode: 'same-document' | 'new-document';
  title: string; beforeRaw: string; savedRaw: string; effectiveRaw: string;
  retainedItemIds: string[]; reactivatedItemIds: string[]; completionAdjustedIds: string[];
  restoresDatesAndNotes: true; preservesProgressHistory: true;
};
const allDocs = (text: TextWorkspaceState) => [...text.documents, ...text.flows];
const isRetention = (space: ProgramPrivateSpace, id: string) => Object.values(space.retentionDocuments ?? {}).includes(id);
const instant = (value: string) => /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value));
function capture(space: ProgramPrivateSpace, doc: TextDocument): RevisionIdentity {
  const ids = new Set(doc.lines.map(line => line.id));
  return programClone({ lines: doc.lines, bindings: space.text.bindings.filter(binding => binding.docId === doc.id),
    taskScopes: Object.fromEntries(Object.entries(space.text.taskScopes).filter(([id]) => ids.has(id))),
    itemScopes: Object.fromEntries(Object.entries(space.text.itemScopes).filter(([id]) => ids.has(id))) });
}
function check(data: ProgramData, input: ProgramPrivateMutationBase, kind: string, fields: unknown): ProgramTransition<string> | null {
  if (!validateProgramData(data) || !programIdentifier(input.requestId)) return programFailure(data, 'invalid');
  if (!Object.hasOwn(data.spaces, input.actorId)) return programFailure(data, 'forbidden');
  const receipt = data.receipts.find(row => row.actorId === input.actorId && row.id === input.requestId);
  if (receipt) {
    try { if (receipt.kind === kind && programSame(JSON.parse(receipt.fingerprint), fields)) return { ok: true, data, changed: false, result: receipt.resultId }; } catch { /* Reject malformed receipt. */ }
    return programFailure(data, 'duplicate-request');
  }
  return programSame(data.spaces[input.actorId], input.expectedSpace) ? null : programFailure(data, 'conflict');
}
function finish(data: ProgramData, next: ProgramData, input: ProgramPrivateMutationBase, kind: string, fields: unknown, result: string): ProgramTransition<string> {
  if (programSame(data, next)) return { ok: true, data, changed: false, result };
  if (data.receipts.length >= PROGRAM_LIMITS.entries) return programFailure(data, 'limit');
  next.receipts.push({ id: input.requestId, actorId: input.actorId, kind, fingerprint: JSON.stringify(fields), resultId: result });
  return validateProgramData(next) ? programResult(data, next, result) : programFailure(data, 'invalid');
}

/** Explicit checkpoints, never autosave history masquerading as user-saved versions. */
export function saveProgramDocumentRevision(data: ProgramData, input: ProgramPrivateMutationBase & { documentId: string }, now: string): ProgramTransition<string> {
  const fields = { documentId: input.documentId, now }, early = check(data, input, 'document-revision-save', fields);
  if (early) return early;
  if (!instant(now)) return programFailure(data, 'invalid');
  const space = data.spaces[input.actorId], doc = M.getDocument(space.text, input.documentId);
  if (!doc) return programFailure(data, 'missing');
  if (isRetention(space, doc.id)) return programFailure(data, 'forbidden');
  const identity = capture(space, doc), previous = space.draftRevisions.filter(revision => revision.documentId === doc.id).at(-1);
  if (previous?.title === doc.title && programSame(previous.identity, identity)) return { ok: true, data, changed: false, result: previous.id };
  if (space.draftRevisions.length >= 1000) return programFailure(data, 'limit');
  const next = programClone(data), id = programId('document-revision');
  next.spaces[input.actorId].draftRevisions.push({ id, documentId: doc.id, title: doc.title, raw: M.raw(doc), createdAt: now, identity });
  return finish(data, next, input, 'document-revision-save', fields, id);
}

function rewriteCheck(line: TextLine, done: boolean, title?: string): TextLine {
  const parts = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/.exec(line.text);
  if (!parts) return line;
  const token = M.parseProgressToken(parts[2]).ok ? parts[2] : done ? 'x' : ' ';
  return { id: line.id, text: `${parts[1]}${token}${parts[3]}${title ?? parts[4]}${parts[5]}` };
}

/** Keep the forest of omitted rows valid without duplicating any surviving ancestor ID. */
function retainedForest(doc: TextDocument, text: TextWorkspaceState, retained: Set<string>): TextLine[] {
  const rows = M.parseDocument(doc, text).rows, byId = new Map(rows.map(row => [row.id, row]));
  return doc.lines.filter(line => retained.has(line.id)).map(line => {
    const row = byId.get(line.id)!;
    let depth = 0, parent = row.parentLineId;
    while (parent) { if (retained.has(parent)) depth++; parent = byId.get(parent)?.parentLineId ?? null; }
    const propertyLostOwner = row.kind === 'property' && row.taskId && !retained.has(row.taskId);
    const removedIndent = Math.min(/^ */.exec(line.text)![0].length, Math.max(0, row.depth - depth) * 2);
    return { id: line.id, text: propertyLostOwner ? `${'  '.repeat(depth)}보관한 속성: ${line.text.trimStart()}` : line.text.slice(removedIndent) };
  });
}

function rebuildOwners(text: TextWorkspaceState, fallback: RevisionIdentity): void {
  const priorTasks = { ...fallback.taskScopes, ...text.taskScopes }, priorItems = { ...fallback.itemScopes, ...text.itemScopes };
  text.taskScopes = priorTasks; text.itemScopes = priorItems;
  const tasks: Record<string, string> = {}, items: Record<string, string> = {};
  for (const doc of allDocs(text)) {
    const refs = new Set(text.bindings.filter(binding => binding.docId === doc.id && binding.kind === 'task').map(binding => binding.lineId));
    for (const row of M.parseDocument(doc, text).rows) {
      if (!['task', 'subcheck'].includes(row.kind) || refs.has(row.id)) continue;
      const owner = priorItems[row.id] ?? priorTasks[row.id] ?? (text.flows.some(flow => flow.id === doc.id) ? doc.id : doc.folderId);
      items[row.id] = owner;
      if (row.kind === 'task') tasks[row.id] = owner;
    }
  }
  text.taskScopes = tasks; text.itemScopes = items;
}

function syncCompletionAndReferences(text: TextWorkspaceState, current: TextWorkspaceState): string[] {
  const adjusted: string[] = [];
  // The intermediate source token may disagree with current history, so the
  // public validated progress query is intentionally not used until after repair.
  const latest = new Map<string, { date: string; percent: number }>();
  for (const record of text.progressRecords) if (!latest.has(record.taskId) || latest.get(record.taskId)!.date < record.date) latest.set(record.taskId, record);
  const existingDone = new Map(allDocs(current).flatMap(doc => M.parseDocument(doc, current).items).map(item => [item.id, item.done]));
  for (const doc of allDocs(text)) {
    const referenceIds = new Set(text.bindings.filter(binding => binding.kind === 'task' && binding.docId === doc.id).map(binding => binding.lineId));
    doc.lines = doc.lines.map(line => {
      if (referenceIds.has(line.id)) return line;
      const progress = latest.get(line.id);
      if (!progress && !existingDone.has(line.id)) return line;
      const next = rewriteCheck(line, progress ? progress.percent === 100 : existingDone.get(line.id)!);
      if (next.text !== line.text) adjusted.push(line.id);
      return next;
    });
  }
  const canonical = new Map(allDocs(text).flatMap(doc => M.parseDocument(doc, text).tasks)
    .filter(task => !text.bindings.some(binding => binding.kind === 'task' && binding.lineId === task.id)).map(task => [task.id, task]));
  for (const binding of text.bindings) if (binding.kind === 'task') {
    const task = canonical.get(binding.taskId), doc = M.getDocument(text, binding.docId);
    if (!task || !doc) continue;
    doc.lines = doc.lines.map(line => line.id === binding.lineId ? rewriteCheck(line, task.done, task.title) : line);
  }
  return adjusted;
}

type RestorePlan = { ok: true; space: ProgramPrivateSpace; retainedItemIds: string[]; reactivatedItemIds: string[]; completionAdjustedIds: string[] } | { ok: false; reason: ProgramFailure };
function planRestore(current: ProgramPrivateSpace, revision: ProgramDraftRevision): RestorePlan {
  if (!revision.identity) return { ok: false, reason: 'unresolved' };
  const space = programClone(current), text = space.text, doc = M.getDocument(text, revision.documentId);
  if (!doc || isRetention(space, revision.documentId)) return { ok: false, reason: 'missing' };
  const identity = revision.identity, scopeIds = new Set(M.scopes(text).map(scope => scope.id));
  if ([...Object.values(identity.taskScopes), ...Object.values(identity.itemScopes)].some(id => !scopeIds.has(id))
    || identity.bindings.some(binding => binding.kind === 'scope' && !scopeIds.has(binding.scopeId))) return { ok: false, reason: 'unresolved' };
  const wanted = new Set(identity.lines.map(line => line.id)), priorDoc = programClone(doc);
  const beforeItems = M.parseDocument(priorDoc, text).items;
  const permittedItemIds = new Set(allDocs(current.text).flatMap(owner => M.parseDocument(owner, current.text).items).map(item => item.id));
  for (const item of M.parseDocument({ ...priorDoc, lines: identity.lines }, { ...current.text,
    bindings: [...current.text.bindings.filter(binding => binding.docId !== doc.id), ...identity.bindings] }).items) permittedItemIds.add(item.id);
  const removed = new Set(doc.lines.filter(line => !wanted.has(line.id)).map(line => line.id));
  const archiveId = space.retentionDocuments?.[doc.id], existingArchive = archiveId ? M.getDocument(text, archiveId) : null;
  const allowed = new Set([doc.id, ...(archiveId ? [archiveId] : [])]);
  if (allDocs(text).some(other => !allowed.has(other.id) && other.lines.some(line => wanted.has(line.id)))) return { ok: false, reason: 'conflict' };
  const reactivatedItemIds = existingArchive ? M.parseDocument(existingArchive, text).items.filter(item => wanted.has(item.id)).map(item => item.id) : [];
  const reactivatedIds = new Set(existingArchive?.lines.filter(line => wanted.has(line.id)).map(line => line.id) ?? []);
  const remainingArchiveIds = new Set(existingArchive?.lines.filter(line => !wanted.has(line.id)).map(line => line.id) ?? []);
  if (existingArchive) existingArchive.lines = retainedForest(existingArchive, text, remainingArchiveIds);
  let archive = existingArchive;
  if (removed.size) {
    if (!archive) {
      if (text.documents.length >= 100) return { ok: false, reason: 'limit' };
      archive = { id: programId('document-retention'), title: `${doc.title} · 복구 보관`, folder: doc.folder, folderId: doc.folderId, lines: [] };
      text.documents.push(archive);
      (space.retentionDocuments ?? (space.retentionDocuments = {}))[doc.id] = archive.id;
    }
    archive.lines.push(...retainedForest(priorDoc, text, removed));
  }
  const retainedBindings: TextBinding[] = text.bindings.flatMap(binding => {
    if (binding.docId === doc.id) return removed.has(binding.lineId) && archive ? [{ ...binding, docId: archive.id }] : [];
    if (archive && binding.docId === archive.id && wanted.has(binding.lineId)) return [];
    return [binding];
  });
  text.bindings = [...retainedBindings, ...programClone(identity.bindings)];
  doc.lines = programClone(identity.lines); doc.title = revision.title;
  for (const id of reactivatedIds) if (!Object.hasOwn(identity.taskScopes, id)
    && !text.bindings.some(binding => binding.kind === 'task' && binding.taskId === id)) delete text.taskScopes[id];
  for (const binding of text.bindings) if (binding.kind === 'scope' && binding.scopeId === doc.id) {
    const owner = M.getDocument(text, binding.docId);
    if (owner) owner.lines = owner.lines.map(line => line.id === binding.lineId ? { id: line.id, text: `${/^ */.exec(line.text)![0]}- ${doc.title}` } : line);
  }
  if (archive && !space.archivedDocumentIds.includes(archive.id)) space.archivedDocumentIds.push(archive.id);
  rebuildOwners(text, identity);
  const completionAdjustedIds = syncCompletionAndReferences(text, current.text);
  if (!M.validate(text)) return { ok: false, reason: 'unresolved' };
  // A partial removed code fence must not silently reinterpret its example as a
  // real task. Ambiguous retention stays a read-only, unresolved preview.
  if (allDocs(text).some(owner => M.parseDocument(owner, text).items.some(item => !permittedItemIds.has(item.id)))) return { ok: false, reason: 'unresolved' };
  const retainedItems = beforeItems.filter(item => removed.has(item.id));
  // A retired item may lose an inherited date/property when its parent is restored.
  // Pin its existing execution details inside the archive, never on the restored body.
  for (const before of retainedItems) {
    if (current.text.bindings.some(binding => binding.kind === 'task' && binding.lineId === before.id)) continue;
    const actual = allDocs(space.text).flatMap(owner => M.parseDocument(owner, space.text).items).find(item => item.id === before.id);
    if (!actual) return { ok: false, reason: 'unresolved' };
    const patch: { date?: string | null; note?: string; time?: string } = {};
    if (actual.date !== before.date) patch.date = before.date;
    if (actual.note !== before.note) patch.note = before.note;
    if (actual.time !== before.time) patch.time = before.time ?? '';
    if (Object.keys(patch).length) space.text = M.updateTask(space.text, before.id, patch);
    const pinned = allDocs(space.text).flatMap(owner => M.parseDocument(owner, space.text).items).find(item => item.id === before.id);
    if (!pinned || pinned.date !== before.date || pinned.note !== before.note || pinned.time !== before.time) return { ok: false, reason: 'unresolved' };
  }
  const restored = M.getDocument(space.text, doc.id)!;
  if (space.position.documentId === doc.id || archive && space.position.documentId === archive.id) {
    space.position = { documentId: doc.id, lineId: restored.lines[0]?.id ?? null, start: 0, end: 0, scrollTop: 0 };
  }
  for (const copy of space.copies.filter(copy => copy.documentId === doc.id)) {
    const parsed = M.parseDocument(restored, space.text).items;
    for (const [itemId, lineId] of Object.entries(copy.itemLines)) {
      const task = parsed.find(item => item.id === lineId);
      if (task) (copy.itemOverrides[itemId] ?? (copy.itemOverrides[itemId] = {})).date = task.date;
    }
  }
  if (!programSame(current.text.progressRecords, space.text.progressRecords)) return { ok: false, reason: 'conflict' };
  return { ok: true, space, retainedItemIds: retainedItems.map(item => item.id), reactivatedItemIds, completionAdjustedIds };
}

export function previewProgramDocumentRevisionRestore(data: ProgramData, input: { actorId: string; documentId: string; revisionId: string }): ProgramTransition<ProgramRevisionPreview> {
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  const space = Object.hasOwn(data.spaces, input.actorId) ? data.spaces[input.actorId] : undefined;
  if (!space) return programFailure(data, 'forbidden');
  const revision = space.draftRevisions.find(revision => revision.id === input.revisionId && revision.documentId === input.documentId), doc = M.getDocument(space.text, input.documentId);
  if (!revision || !doc || isRetention(space, doc.id)) return programFailure(data, 'missing');
  if (!revision.identity) return { ok: true, data, changed: false, result: { documentId: doc.id, revisionId: revision.id, mode: 'new-document', title: revision.title,
    beforeRaw: M.raw(doc), savedRaw: revision.raw, effectiveRaw: revision.raw, retainedItemIds: [], reactivatedItemIds: [], completionAdjustedIds: [], restoresDatesAndNotes: true, preservesProgressHistory: true } };
  const planned = planRestore(space, revision);
  if (!planned.ok) return programFailure(data, planned.reason);
  const candidate = programClone(data); candidate.spaces[input.actorId] = planned.space;
  if (!validateProgramData(candidate)) return programFailure(data, 'unresolved');
  return { ok: true, data, changed: false, result: { documentId: doc.id, revisionId: revision.id, mode: 'same-document', title: revision.title,
    beforeRaw: M.raw(doc), savedRaw: revision.raw, effectiveRaw: M.raw(M.getDocument(planned.space.text, doc.id)),
    retainedItemIds: planned.retainedItemIds, reactivatedItemIds: planned.reactivatedItemIds, completionAdjustedIds: planned.completionAdjustedIds,
    restoresDatesAndNotes: true, preservesProgressHistory: true } };
}

/** Restore content/date/note, not execution history or the actor's whole workspace. */
export function restoreProgramDocumentRevision(data: ProgramData, input: ProgramRevisionInput): ProgramTransition<string> {
  const fields = { documentId: input.documentId, revisionId: input.revisionId }, early = check(data, input, 'document-revision-restore', fields);
  if (early) return early;
  const space = data.spaces[input.actorId], revision = space.draftRevisions.find(revision => revision.id === input.revisionId && revision.documentId === input.documentId);
  if (!revision) return programFailure(data, 'missing');
  if (!revision.identity) return programFailure(data, 'unresolved');
  const planned = planRestore(space, revision);
  if (!planned.ok) return programFailure(data, planned.reason);
  const next = programClone(data); next.spaces[input.actorId] = planned.space;
  return finish(data, next, input, 'document-revision-restore', fields, input.documentId);
}

/** Raw-only legacy checkpoints have no proven line identity: recover into a new document. */
export function restoreProgramRawRevisionAsDocument(data: ProgramData, input: ProgramRevisionInput): ProgramTransition<string> {
  const fields = { documentId: input.documentId, revisionId: input.revisionId }, early = check(data, input, 'document-revision-copy', fields);
  if (early) return early;
  const space = data.spaces[input.actorId], revision = space.draftRevisions.find(revision => revision.id === input.revisionId && revision.documentId === input.documentId);
  if (!revision) return programFailure(data, 'missing');
  const created = createProgramDocument(data, { ...input, requestId: `${input.requestId}:materialize`, title: `${revision.title.slice(0, 230)} · 복구`, raw: revision.raw });
  if (!created.ok) return created;
  const next = programClone(created.data);
  next.receipts = next.receipts.filter(receipt => !(receipt.actorId === input.actorId && receipt.id === `${input.requestId}:materialize`));
  return finish(data, next, input, 'document-revision-copy', fields, created.result);
}
