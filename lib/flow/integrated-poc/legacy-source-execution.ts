import { programClone, type ProgramPrivateSpace } from './contract';
import { textWorkspaceModel as M, type TextDocument, type TextLine } from './text-workspace';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import type { ProgramLegacySourceAction } from './legacy-source-lifecycle';

const documents = (space: ProgramPrivateSpace) => [...space.text.documents, ...space.text.flows];
const document = (space: ProgramPrivateSpace, id: string) => M.getDocument(space.text, id);
const binding = (space: ProgramPrivateSpace, flowRef: string) => space.savedBindings.find(row => row.flowRef === flowRef);
/** Only the selected Item subtree, never the following personal sibling. */
function block(space: ProgramPrivateSpace, doc: TextDocument, id: string): TextLine[] | null {
  const at = doc.lines.findIndex(line => line.id === id), row = M.parseDocument(doc, space.text).rows.find(row => row.id === id);
  if (at < 0 || !row) return null;
  return programClone(doc.lines.slice(at, Math.max(at + 1, row.subtreeEndIndex)));
}
function sourceBlock(space: ProgramPrivateSpace, flowRef: string, ref: string): TextLine[] | null {
  const b = binding(space, flowRef), doc = b && document(space, b.documentId), id = b?.itemLines[ref];
  if (!b || !doc || !id) return null;
  if (/^\s*- \[[ xX]\]/u.test(doc.lines.find(line => line.id === id)?.text ?? '')) return block(space, doc, id);
  const at = doc.lines.findIndex(line => line.id === id);
  if (at < 0) return null;
  // Plain series source metadata is generated as exactly these two lines.
  const end = doc.lines[at + 1]?.text.startsWith('원문 속성: ') ? at + 2 : at + 1;
  return programClone(doc.lines.slice(at, end));
}
function replace(space: ProgramPrivateSpace, flowRef: string, ref: string, lines: TextLine[]) {
  const b = binding(space, flowRef)!, doc = document(space, b.documentId)!, old = sourceBlock(space, flowRef, ref);
  if (!old) return false;
  const at = doc.lines.findIndex(line => line.id === old[0].id);
  doc.lines.splice(at, old.length, ...programClone(lines)); b.itemLines[ref] = lines[0].id;
  return true;
}
function copyOwners(target: ProgramPrivateSpace, source: ProgramPrivateSpace, lines: readonly TextLine[]) {
  const ids = new Set(lines.map(line => line.id));
  for (const field of ['taskScopes', 'itemScopes'] as const) for (const id of ids) {
    if (source.text[field][id]) target.text[field][id] = source.text[field][id]; else delete target.text[field][id];
  }
  for (const id of ids) if (source.legacyTimelinePolicies[id]) target.legacyTimelinePolicies[id] = source.legacyTimelinePolicies[id];
  target.text.progressRecords = [...target.text.progressRecords.filter(row => !ids.has(row.taskId)), ...programClone(source.text.progressRecords.filter(row => ids.has(row.taskId)))];
}

/** Canonical retained blocks are private data, not projected back into source.
 * This read adapter copies only an explicitly registered retention document. */
export function alignProgramLegacySourceRetention(projected: ProgramPrivateSpace, current: ProgramPrivateSpace) {
  const next = programClone(projected);
  const payload = projected.legacySnapshot && inspectProgramLegacySnapshotPayload(JSON.parse(projected.legacySnapshot.raw));
  if (!payload?.ok) return null;
  for (const b of projected.savedBindings) {
    if (!payload.payload.sourceLifecycle?.owners[b.flowRef]?.executionHandoffs) continue;
    const retainedId = current.retentionDocuments?.[b.documentId];
    if (!retainedId) continue;
    const saved = current.text.documents.find(doc => doc.id === retainedId);
    if (!saved || !current.archivedDocumentIds.includes(retainedId)) return null;
    if (documents(next).some(doc => doc.id === retainedId)) return null;
    const existing = new Set(documents(next).flatMap(doc => doc.lines.map(line => line.id)));
    // A source-kind transaction will relocate overlapping canonical blocks;
    // ordinary reads cannot silently duplicate or hide them.
    const overlapping = saved.lines.some(line => existing.has(line.id));
    if (overlapping) continue;
    next.text.folders = programClone(current.text.folders);
    next.text.documents.push(programClone(saved));
    next.retentionDocuments ??= {}; next.retentionDocuments[b.documentId] = retainedId;
    next.archivedDocumentIds.push(retainedId);
    copyOwners(next, current, saved.lines);
  }
  return next;
}

/** Normalize ONLY an authenticated same-tuple ordinary/series source change.
 * All three merge inputs receive identical relocation; unrelated fields still
 * pass the existing three-way conflict checks. No occurrence entry is rewritten. */
export function prepareProgramLegacySourceKindMerge(base: ProgramPrivateSpace, remote: ProgramPrivateSpace, current: ProgramPrivateSpace, action?: ProgramLegacySourceAction) {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!action || !['apply', 'undo', 'activate-map-recurrence'].includes(action.type)) return { ok: true as const, base, remote, current };
  const before = base.legacySnapshot && inspectProgramLegacySnapshotPayload(JSON.parse(base.legacySnapshot.raw));
  const after = remote.legacySnapshot && inspectProgramLegacySnapshotPayload(JSON.parse(remote.legacySnapshot.raw));
  if (!before?.ok || !after?.ok) return fail('invalid-kind-source');
  const a = before.sourceContextByFlow.get(action.flowRef), z = after.sourceContextByFlow.get(action.flowRef);
  const beforeFlow = before.model.flows.find(flow => flow.ref === action.flowRef), afterFlow = after.model.flows.find(flow => flow.ref === action.flowRef);
  const refs = (beforeFlow?.items ?? []).filter(item => afterFlow?.items.some(row => row.ref === item.ref)
    && !!a?.get(item.ref)?.attributes.recurrence !== !!z?.get(item.ref)?.attributes.recurrence).map(item => item.ref);
  if (!refs.length) return { ok: true as const, base, remote, current };
  const b = programClone(base), r = programClone(remote), c = programClone(current);
  const owner = after.payload.sourceLifecycle?.owners[action.flowRef];
  const bound = binding(c, action.flowRef); if (!bound || refs.some(ref => !owner?.executionHandoffs?.itemRefs.includes(ref))) return fail('unconfirmed-kind-change');
  const originalDoc = document(c, bound.documentId)!;
  const retainedId = c.retentionDocuments?.[bound.documentId] ?? `${bound.documentId}-retained`;
  let retained = c.text.documents.find(doc => doc.id === retainedId);
  if (retained && c.retentionDocuments?.[bound.documentId] !== retainedId) return fail('retention-identity-collision');
  if (!retained) {
    if (documents(c).some(doc => doc.id === retainedId)) return fail('retention-identity-collision');
    retained = { id: retainedId, title: `${originalDoc.title} · 이전 일반 항목`, folderId: originalDoc.folderId, folder: originalDoc.folder, lines: [] };
    c.text.documents.push(retained);
  }
  c.retentionDocuments ??= {}; c.retentionDocuments[bound.documentId] = retainedId;
  if (!c.archivedDocumentIds.includes(retainedId)) c.archivedDocumentIds.push(retainedId);
  for (const ref of refs) {
    const incoming = sourceBlock(r, action.flowRef, ref); if (!incoming) return fail('missing-kind-target');
    if (z?.get(ref)?.attributes.recurrence) {
      const old = sourceBlock(c, action.flowRef, ref), oldId = bound.itemLines[ref];
      if (!old) return fail('ordinary-kind-record-missing');
      const hasOrdinaryRecord = M.tasks(c.text).some(task => task.id === oldId && task.isCanonical);
      // A formerly unsupported Map may have only a read-only metadata block.
      // Do not fabricate a completed task/history merely to perform its handoff.
      if (!hasOrdinaryRecord && action.type !== 'activate-map-recurrence') return fail('ordinary-kind-record-missing');
      if (retained.lines.some(line => old.some(row => row.id === line.id))) return fail('retention-identity-collision');
      if (!replace(c, action.flowRef, ref, incoming) || !replace(b, action.flowRef, ref, incoming)) return fail('kind-replacement-failed');
      if (hasOrdinaryRecord) retained.lines.push(...old);
    } else {
      const ordinaryId = incoming[0].id, saved = retained.lines.some(line => line.id === ordinaryId) ? block(c, retained, ordinaryId) : null;
      const restore = saved ?? incoming;
      if (saved) retained.lines.splice(retained.lines.findIndex(line => line.id === ordinaryId), saved.length);
      if (!replace(c, action.flowRef, ref, restore) || !replace(b, action.flowRef, ref, restore) || !replace(r, action.flowRef, ref, restore)) return fail('kind-replacement-failed');
      if (!saved) copyOwners(c, r, restore);
    }
  }
  // The archive is the same exact private snapshot in every merge input. This
  // avoids interpreting the move as source deletion or migrating history.
  for (const target of [b, r]) {
    target.text.folders = programClone(c.text.folders);
    target.text.documents = target.text.documents.filter(doc => doc.id !== retainedId);
    target.text.documents.push(programClone(retained));
    target.retentionDocuments ??= {}; target.retentionDocuments[bound.documentId] = retainedId;
    if (!target.archivedDocumentIds.includes(retainedId)) target.archivedDocumentIds.push(retainedId);
    const touched = [...retained.lines, ...refs.flatMap(ref => sourceBlock(c, action.flowRef, ref) ?? [])];
    copyOwners(target, c, touched);
    // Remove stale owners only when their line disappeared in this exact handoff.
    const present = new Set(documents(target).flatMap(doc => doc.lines.map(line => line.id)));
    for (const field of ['taskScopes', 'itemScopes'] as const) for (const id of Object.keys(target.text[field])) if (!present.has(id)) delete target.text[field][id];
  }
  if (![b, r, c].every(space => M.validate(space.text))) return fail('invalid-kind-retention');
  return { ok: true as const, base: b, remote: r, current: c };
}
