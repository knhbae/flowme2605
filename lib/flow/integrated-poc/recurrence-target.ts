import type { ProgramData, ProgramPrivateSpace } from './contract';
import { partitionProgramLegacyCapabilities } from './legacy-capabilities';
import { programSame } from './controller';
import { textWorkspaceModel as M, type TextWorkspaceState } from './text-workspace';
import type { ProgramOccurrenceIdentity } from './recurrence-state-contract';
import { programDateRange, programShiftDate, type ProgramPeriod } from './execution';
import { readProgramExecutionOccurrences, readProgramOccurrencePeriod, type ProgramExecutionOccurrenceRow } from './recurrence-state';
import { effectiveCreatorExecutionRevision as currentCreatorExecutionRevision } from './creator-adoption';
import type { ProgramLegacyCapabilityItem } from './legacy-capabilities';
import {programNativeSelectedRows} from './creator-native-execution-validation';
import {programNativeExecutionRef,programNativeItemRef} from './creator-native-execution-contract';
import { programLegacyIdentity } from './legacy-projection';
import { programLegacySourceExecutionHandoff, projectProgramLegacySource } from './legacy-source-lifecycle-contract';
import { programPublicCopyExecutionRef, programPublicCopyItemRef, programPublicCopyMetadataLineIds } from './public-copy-recurrence';

export type ProgramExecutionTarget = { kind: 'text-task'; taskId: string; documentId: string }
  | { kind: 'occurrence'; identity: ProgramOccurrenceIdentity };

export function programSeriesMetadata(space: ProgramPrivateSpace):Array<Omit<ProgramLegacyCapabilityItem,'savedCopyId'|'flowId'> & {savedCopyId?:string;flowId?:string;documentId:string;lineId:string;nativeOwnerId?:string;publicCopyId?:string}> {
  const publicCopies = space.copies.flatMap(copy => (copy.recurrence?.itemIds ?? []).flatMap(itemId => {
    const lineId = copy.itemLines[itemId], docs = [...space.text.documents, ...space.text.flows].filter(doc => doc.lines.some(line => line.id === lineId));
    return docs.length === 1 ? [{ flowRef: programPublicCopyExecutionRef(copy.id), flowId: copy.flowId, itemId,
      itemRef: programPublicCopyItemRef(copy.id, copy.flowId, itemId), seriesId: null, capability: 'series' as const, reason: null,
      documentId: docs[0].id, lineId, publicCopyId: copy.id }] : [];
  }));
  const creator: (ProgramLegacyCapabilityItem & { documentId: string; lineId: string })[] = Object.values(space.creatorWorkspace?.executionSources ?? {}).flatMap(owner => {
    const revision = currentCreatorExecutionRevision(owner);
    return revision.rows.filter(row => row.kind === 'series').map(row => {
      const item = revision.flow.items.find(i => i.ref === row.itemRef)!;
      return { flowRef: revision.flow.ref, savedCopyId: item.savedCopyId, flowId: item.flowId, itemId: item.itemId, itemRef: item.ref, seriesId: null,
        capability: 'series' as const, reason: null, documentId: owner.documentId, lineId: row.documentLineId };
    });
  });
  const native=Object.values(space.creatorWorkspace?.nativeExecutionSources??{}).flatMap(owner=>programNativeSelectedRows(owner).filter(s=>s.disposition==='active'&&s.row.kind==='series').map(s=>({flowRef:programNativeExecutionRef(owner.id),itemId:s.row.itemId,itemRef:programNativeItemRef(owner.id,s.row.itemId),seriesId:null,capability:'series' as const,reason:null,documentId:[...space.text.documents,...space.text.flows].find(d=>d.lines.some(l=>l.id===s.row.lineId))?.id??owner.documentId,lineId:s.row.lineId,nativeOwnerId:owner.id})));
  if (!space.legacySnapshot) return [...creator,...native,...publicCopies];
  try {
    const partition = partitionProgramLegacyCapabilities(JSON.parse(space.legacySnapshot.raw));
    if (!partition.ok) return [...creator,...native,...publicCopies];
    return [...creator,...native,...publicCopies, ...partition.items.filter(item => item.capability !== 'ordinary').flatMap(item => {
      const binding = space.savedBindings.find(entry => entry.flowRef === item.flowRef), lineId = binding?.itemLines[item.itemRef];
      return binding && lineId ? [{ ...item, documentId: binding.documentId, lineId }] : [];
    })];
  } catch { return [...creator,...native,...publicCopies]; }
}
/** Only canonical metadata is locked. Ordinary tasks, free notes and their line
 * positions remain independently editable, including in the same document. */
export function programPreservesSeriesMetadata(space: ProgramPrivateSpace, next: TextWorkspaceState): boolean {
  for (const copy of space.copies.filter(copy => copy.recurrence)) {
    const ids = programPublicCopyMetadataLineIds(space, copy);
    const facts = (text: TextWorkspaceState) => ({
      lines: [...text.documents, ...text.flows].flatMap(doc => doc.lines.filter(line => ids.has(line.id)).map(line => ({ documentId: doc.id, ...line }))).sort((a, b) => a.id.localeCompare(b.id)),
      bindings: text.bindings.filter(binding => ids.has(binding.lineId) || binding.kind === 'task' && ids.has(binding.taskId)),
      records: text.progressRecords.filter(record => ids.has(record.taskId)),
    });
    if (!programSame(facts(space.text), facts(next))) return false;
  }
  // Source Undo can restore a genuine older private checkbox while the current
  // source stays unsupported. Its confirmed ordinary identity is not the active
  // series metadata identity. Preserve source guards and permit only this exact
  // authenticated restored task, never an arbitrary checkbox-shaped source row.
  const restoredPrivateIds = new Set<string>();
  if (space.legacySnapshot) try {
    const payload = JSON.parse(space.legacySnapshot.raw), partition = partitionProgramLegacyCapabilities(payload);
    if (!partition.ok) return false;
    const tasks = M.tasks(space.text);
    for (const item of partition.items.filter(item => item.capability === 'unsupported' && item.reason === 'unsupported-item')) {
      const owner = payload.sourceLifecycle?.owners[item.flowRef], binding = space.savedBindings.find(row => row.flowRef === item.flowRef);
      if (!owner?.structured || !binding || binding.savedCopyId !== item.savedCopyId || binding.flowId !== item.flowId
        || owner.effective.flowRevisionId !== owner.baseRevisionId || owner.effective.itemRevisions[item.itemRef] !== owner.baseRevisionId
        || !owner.mapExecution?.items[item.itemRef] || !programLegacySourceExecutionHandoff(owner, item.itemRef)
        || projectProgramLegacySource(owner)?.contexts.get(item.itemRef)?.attributes.recurrence) continue;
      const documentId = programLegacyIdentity('flow', payload.state.workspaceId, item.savedCopyId, item.flowId, item.flowRef);
      const lineId = programLegacyIdentity('item', payload.state.workspaceId, item.savedCopyId, item.flowId, item.itemId, item.itemRef);
      const retainedId = space.retentionDocuments?.[documentId], retained = space.text.documents.find(doc => doc.id === retainedId);
      if (binding.documentId !== documentId || binding.itemLines[item.itemRef] !== lineId || !retainedId || !retained
        || !space.archivedDocumentIds.includes(retainedId) || retained.lines.some(line => line.id === lineId)) continue;
      if (tasks.some(task => task.id === lineId && task.isCanonical && task.docId === documentId && task.scopeId === documentId)) restoredPrivateIds.add(lineId);
    }
  } catch { return false; }
  for(const owner of Object.values(space.creatorWorkspace?.nativeExecutionSources??{}))for(const selected of programNativeSelectedRows(owner).filter(s=>s.disposition==='active'&&s.row.kind==='series')){
    const ids=new Set(selected.row.lines.map(l=>l.id)),before=[...space.text.documents,...space.text.flows].flatMap(d=>d.lines.filter(l=>ids.has(l.id))),after=[...next.documents,...next.flows].flatMap(d=>d.lines.filter(l=>ids.has(l.id)));if(!programSame(before,after))return false;
  }
  for (const metadata of programSeriesMetadata(space)) {
    const beforeDoc = M.getDocument(space.text, metadata.documentId), nextDoc = M.getDocument(next, metadata.documentId);
    if (!beforeDoc || !nextDoc) return false;
    const protectedLines = beforeDoc.lines.filter(line => line.id === metadata.lineId && !restoredPrivateIds.has(line.id) || line.id.startsWith('legacy-source-metadata-'));
    const ids = new Set(protectedLines.map(line => line.id));
    if (!programSame(protectedLines, nextDoc.lines.filter(line => ids.has(line.id)))) return false;
    // Previously persisted held checkboxes/records remain visible, but cannot
    // become new execution writes. Do not block unrelated memo edits merely
    // because the old workspace already contains these retained rows.
    const execution = (text: TextWorkspaceState) => ({
      taskIds: M.tasks(text).filter(task => ids.has(task.id)).map(task => task.id),
      bindings: text.bindings.filter(binding => ids.has(binding.lineId) || binding.kind === 'task' && ids.has(binding.taskId)),
      records: text.progressRecords.filter(record => ids.has(record.taskId)),
    });
    if (!programSame(execution(space.text), execution(next))) return false;
  }
  // Preserve every line of an authored series block, not only its heading.
  for (const owner of Object.values(space.creatorWorkspace?.executionSources ?? {})) {
    const revision = currentCreatorExecutionRevision(owner), before = M.getDocument(space.text, owner.documentId), after = M.getDocument(next, owner.documentId);
    if (!before || !after) return false;
    const ids = new Set(revision.protectedLineIds), block = before.lines.filter(line => ids.has(line.id));
    if (!programSame(block, after.lines.filter(line => ids.has(line.id)))) return false;
  }
  return true;
}

/** Document references affect where a series is shown, never its canonical folder
 * or the global period union. Duplicate references cannot create extra occurrences. */
export function programSeriesVisibleInDocument(space: ProgramPrivateSpace, item: { documentId: string; publicCopyId?: string; itemId: string }, documentId: string): boolean {
  return item.documentId === documentId || !!item.publicCopyId && !!space.copies.find(copy => copy.id === item.publicCopyId)?.recurrence?.references?.some(ref => ref.itemId === item.itemId && ref.documentId === documentId);
}

export function programRecurrencePeriodRows(data: ProgramData, input: { period: ProgramPeriod; date: string; today: string; folderId?: string; query?: string; includeHeld?: boolean; includeExcluded?: boolean; page?: number }) {
  const actorId = data.activeActorId, space = data.spaces[actorId], metadata = programSeriesMetadata(space);
  const folderIds = new Set(input.folderId ? [input.folderId] : []);
  if (input.folderId) for (let pass = 0; pass < space.text.folders.length; pass++) for (const folder of space.text.folders) if (folder.parentId && folderIds.has(folder.parentId)) folderIds.add(folder.id);
  const visible = metadata.filter(item => !space.archivedDocumentIds.includes(item.documentId) && (!input.folderId || folderIds.has(M.getDocument(space.text, item.documentId)?.folderId ?? '')));
  const rows: ProgramExecutionOccurrenceRow[] = [], issues: string[] = []; let hasMore = false;
  const pendingStarts: NonNullable<Extract<ReturnType<typeof readProgramExecutionOccurrences>, { ok: true }>['pendingStarts']> = [];
  for (const flowRef of new Set(visible.map(item => item.flowRef))) {
    const common = { actorId, flowRef, localToday: input.today }, page = Math.max(0, Math.min(128, input.page ?? 0));
    const range = input.period === 'today' ? { from: programShiftDate(input.date, -28 * (page + 1)) ?? input.date, to: input.date } : programDateRange(input.period, input.date);
    const result = input.period === 'all' ? readProgramExecutionOccurrences(data, { ...common, window: { finiteOffset: page * 30, finiteLimit: 30, windowOffsetWeeks: page * 4, windowWeeks: 4 } })
      : readProgramOccurrencePeriod(data, { ...common, ...range, includeExcluded: input.includeExcluded, includeHeld: input.includeHeld });
    if (!result.ok) { issues.push(result.reason); continue; }
    pendingStarts.push(...(result.pendingStarts ?? []).filter(entry => visible.some(item => item.itemRef === entry.itemRef)
      && (!input.query || entry.title.toLocaleLowerCase().includes(input.query.toLocaleLowerCase()))));
    if (result.sourceConflictKeys.length) issues.push('source-conflict');
    if ('truncated' in result && result.truncated) issues.push('query-window-limit');
    hasMore ||= input.period === 'today' ? result.series.some(series => series.startDate < range.from!) : result.series.some(series => series.manifest.hasMore);
    if('personalHasMore' in result)hasMore ||= result.personalHasMore;
    if('personalTruncated' in result&&result.personalTruncated)issues.push('query-window-limit');
    rows.push(...result.rows.filter(row => visible.some(item => item.itemRef === row.sourceItemRef) && !row.planSuperseded && !row.sourceConflict && !row.flowInactive && !row.planExcluded
      && (input.includeHeld || !row.mapReviewHold && row.participation !== 'held') && (input.includeExcluded || row.participation !== 'excluded')
      && (input.period !== 'today' || row.executionDate === input.date || row.completion !== 'completed')
      && (!input.query || `${row.title}\n${row.memo}`.toLocaleLowerCase().includes(input.query.toLocaleLowerCase()))));
  }
  return { rows, issues, hasMore, pendingStarts };
}
