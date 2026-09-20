import type { ProgramPrivateSpace, ProgramPublicRepository } from './contract';
import { programPublicCopyExecutionRef, programPublicCopyItemRef, readProgramPublicCopyRecurrenceSource } from './public-copy-recurrence';
import { programPublicRecurrenceToAuthoring, programRecurringScheduleStart } from './public-recurrence-contract';
import type { PersonalWorkspacePocResultSourceAttributes } from '../personal-workspace-poc-source-attributes-contract';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import { getPersonalWorkspacePocEffectiveSourceFlow } from '../personal-workspace-poc-canonical-ownership';
import { projectProgramLegacySource, programLegacyExecutionContexts } from './legacy-source-lifecycle-contract';
import { buildPersonalWorkspacePocSourceReadIndex, readPersonalWorkspacePocTaskSourceContext } from '../personal-workspace-poc-source-attributes';
import { currentCreatorExecutionRevision, validateProgramCreatorExecutionSources } from './creator-execution-source';
import type { ProgramCreatorExecutionSource } from './creator-execution-contract';
import { creatorAdoptedRows, effectiveCreatorExecutionRevision } from './creator-adoption';
import { materializePersonalWorkspacePocAuthoring, type PersonalWorkspacePocAuthoringTemplateId } from '../personal-workspace-poc-authoring';
import {resolveProgramNativeExecutionSource,resolveNativeOwner} from './creator-native-execution-source';
import {programNativeSelectedRows,validateProgramNativeExecutionSources} from './creator-native-execution-validation';
import {programNativeItemRef} from './creator-native-execution-contract';

function canonical(value: unknown): unknown { return Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => [k,canonical(v)])) : value; }
/** Caller must first validate the complete creator source collection. */
function resolveValidatedCreatorSource(space: ProgramPrivateSpace, owner: ProgramCreatorExecutionSource) {
  const revision = effectiveCreatorExecutionRevision(owner), flow = revision.flow;
  // Program canonical storage reorders object keys. Rebuild genuine parser lineage
  // only after strict structural validation; never relax the protected old validator.
  const fresh=(saved:typeof revision)=>materializePersonalWorkspacePocAuthoring({handoffId:`creator-handoff:${owner.draftId}`,documentId:owner.draftId,revisionId:`creator-revision:${saved.recordRevision}`,rawText:saved.raw,committedAt:saved.committedAt,
    ...(saved.flow.authoring.templateId?{templateId:saved.flow.authoring.templateId as PersonalWorkspacePocAuthoringTemplateId}:{})});
  const made=fresh(currentCreatorExecutionRevision(owner));if(!made.ok)return{ok:false as const,reason:'invalid-creator-source'};
  const index = buildPersonalWorkspacePocSourceReadIndex({ baseModel: { version: 1, flows: [made.flow] } });
  if (!index.ok) return { ok: false as const, reason: index.reason };
  const context = readPersonalWorkspacePocTaskSourceContext(index.index, made.flow);
  if (!context.ok) return { ok: false as const, reason: context.reason };
  const contexts = new Map(context.itemContextByRef);
  if(owner.adoption){
    contexts.clear();
    const cache=new Map<string,typeof context>();
    for(const selected of creatorAdoptedRows(owner).filter(r=>r.disposition==='active')){
      let read=cache.get(selected.revision.id);
      if(!read){const built=fresh(selected.revision);if(!built.ok)return{ok:false as const,reason:'invalid-selected-source'};const idx=buildPersonalWorkspacePocSourceReadIndex({baseModel:{version:1,flows:[built.flow]}});if(!idx.ok)return{ok:false as const,reason:idx.reason};const result=readPersonalWorkspacePocTaskSourceContext(idx.index,built.flow);if(!result.ok)return{ok:false as const,reason:result.reason};read=result;cache.set(selected.revision.id,read);}
      const item=read.itemContextByRef.get(selected.row.itemRef),target=revision.rows.find(row=>row.rowId===selected.row.rowId);if(!item||!target)return{ok:false as const,reason:'missing-selected-source'};
      contexts.set(target.itemRef,item);
    }
  }
  return { ok: true as const, kind: 'creator' as const, workspaceId: owner.id, owner, revision, flow, contexts, inactive: space.archivedDocumentIds.includes(owner.documentId),
    sourceRevisionToken: JSON.stringify(canonical({ ownerId: owner.id, revisionId: revision.id, flow, contexts: Object.fromEntries(contexts) })),
    originalExceptions: [] as { sourceItemRef: string; originalDate: string }[] };
}
/** Source facts only. Private execution overrides are merged by recurrence-state. */
export function resolveProgramExecutionSource(space: ProgramPrivateSpace, flowRef: string, repository?: ProgramPublicRepository) {
  if (flowRef.startsWith('["public-copy/1",')) {
    if (!repository) return { ok: false as const, reason: 'missing-public-repository' };
    const copy = space.copies.find(c => programPublicCopyExecutionRef(c.id) === flowRef);
    if (!copy) return { ok: false as const, reason: 'missing-public-copy' };
    const read = readProgramPublicCopyRecurrenceSource(space, repository, copy.id); if (!read.ok) return read;
    const source = read.source, contexts = new Map<string, { attributes: PersonalWorkspacePocResultSourceAttributes }>();
    for (const entry of source.items) {
      const s = entry.item.schedule, rule = programPublicRecurrenceToAuthoring(s.rule)!, fixed = s.start.kind === 'fixed' ? s.start.date : null;
      contexts.set(programPublicCopyItemRef(copy.id, copy.flowId, entry.item.id), { attributes: {
        description: entry.item.description, completionCriteria: entry.item.completionCriteria, recurrence: rule.raw,
        ...(rule.end ? { recurrenceEnd: rule.end.raw } : {}), ...(fixed ? { date: fixed } : {}),
        ...(s.start.kind === 'relative' ? { relativeDate: `${s.start.days >= 0 ? '+' : ''}${s.start.days}` } : {}),
        ...(s.time ? { time: s.time } : {}), ...(s.timeZone ? { timeZone: s.timeZone } : {}), ...(entry.item.sourceUrl ? { sourceUrl: entry.item.sourceUrl } : {}),
        subchecks: entry.item.subchecks.map(c => ({ subcheckId: c.id, title: c.title, sourceChecked: false })) } });
    }
    return { ok: true as const, kind: 'public-copy' as const, workspaceId: copy.id, source, copy, contexts,
      flow: { ref: flowRef, items: source.items.map(entry => ({ ref: programPublicCopyItemRef(copy.id, copy.flowId, entry.item.id),
        sourceDate: entry.item.schedule.start.kind === 'fixed' ? programRecurringScheduleStart(entry.item.schedule, null) : null })) },
      inactive: source.inactive, sourceRevisionToken: source.sourceRevisionToken, originalExceptions: [] as { sourceItemRef: string; originalDate: string }[] };
  }
  const native=resolveProgramNativeExecutionSource(space,flowRef);if(native)return native;
  const sources = space.creatorWorkspace?.executionSources;
  if (sources) {
    if (!validateProgramCreatorExecutionSources(sources, space, space.creatorWorkspace!.library.records)) return { ok: false as const, reason: 'invalid-creator-source' };
    const owners = Object.values(sources).filter(s => currentCreatorExecutionRevision(s).flow.ref === flowRef);
    if (owners.length > 1) return { ok: false as const, reason: 'ambiguous-source' };
    if (owners.length) return resolveValidatedCreatorSource(space, owners[0]);
  }
  if (!space.legacySnapshot) return { ok: false as const, reason: 'missing-source' };
  let raw: unknown; try { raw = JSON.parse(space.legacySnapshot.raw); } catch { return { ok: false as const, reason: 'invalid-source' }; }
  const checked = inspectProgramLegacySnapshotPayload(raw);
  if (!checked.ok) return { ok: false as const, reason: 'invalid-source' };
  const flow = checked.model.flows.find(row => row.ref === flowRef), base = [...checked.payload.model.flows, ...(checked.payload.state.authoredFlows ?? [])].find(row => row.ref === flowRef);
  if (!flow || !base) return { ok: false as const, reason: 'missing-flow' };
  const effective = checked.payload.sourceCandidateStore ? getPersonalWorkspacePocEffectiveSourceFlow(base, checked.payload.sourceCandidateStore) : { ok: true as const, flow: base };
  if (!effective.ok) return { ok: false as const, reason: 'invalid-source' };
  const lifecycle = checked.payload.sourceLifecycle?.owners[flowRef], selected = lifecycle ? projectProgramLegacySource(lifecycle) : null;
  if (lifecycle && !selected) return { ok: false as const, reason: 'invalid-source' };
  const fallback = readPersonalWorkspacePocTaskSourceContext(checked.sourceIndex, effective.flow);
  const contexts = programLegacyExecutionContexts(lifecycle, selected?.contexts ?? (fallback.ok ? fallback.itemContextByRef : new Map())), tokenFlow = selected?.flow ?? effective.flow;
  return { ok: true as const, kind: 'legacy' as const, workspaceId: space.legacySnapshot.workspaceId, payload: checked.payload, checked, flow, contexts,
    sourceRevisionToken: JSON.stringify(canonical({ flow: { ...tokenFlow, sections: tokenFlow.sections ?? [] }, contexts: Object.fromEntries(contexts) })),
    originalExceptions: [...Object.values(checked.payload.state.occurrencePlacements ?? {}), ...Object.values(checked.payload.state.occurrenceCompletions ?? {})] };
}
export type ProgramResolvedExecutionSource = Extract<ReturnType<typeof resolveProgramExecutionSource>, { ok: true }>;
export type ProgramCreatorTaskSourceFacts = { ownerId: string; sourceRevisionId: string; rowId: string; sourceItemRef: string;
  sourceDate: string | null; wallTime: string | null; timeZone: string | null; sourceUrl: string | null; resourceUrl: string | null };
/** One immutable space snapshot / one caller operation. Do not retain this reader
 * across transactions. All caches are closure-local; every new reader validates
 * every retained revision before returning any source facts. */
export function createProgramCreatorTaskSourceFactsReader(space: ProgramPrivateSpace, repository?: ProgramPublicRepository): (documentId: string, lineId: string) => ProgramCreatorTaskSourceFacts | null {
  const raw=createRawCreatorTaskSourceFactsReader(space);
  // Public source metadata is read from each field's accepted immutable version.
  // The caller validates the full Program snapshot. Never infer source time from private prose.
  const publicFacts=(documentId:string,lineId:string):ProgramCreatorTaskSourceFacts|null=>{
    if(!repository||![...space.text.documents,...space.text.flows].some(d=>d.id===documentId&&d.lines.some(l=>l.id===lineId)))return null;
    const matches=space.copies.flatMap(copy=>Object.entries(copy.itemLines).filter(([,id])=>id===lineId).map(([itemId])=>({copy,itemId})));
    if(matches.length!==1)return null;
    const{copy,itemId}=matches[0],versionId=copy.appliedFields[itemId]?.schedule??copy.baseVersionId;
    const versions=repository.versions.filter(v=>v.id===versionId&&v.flowId===copy.flowId),items=versions.length===1?versions[0].items.filter(i=>i.id===itemId):[];
    if(items.length!==1||items[0].schedule.kind==='recurring')return null;
    const item=items[0],schedule=item.schedule;
    if(schedule.kind==='recurring')return null;
    const urlVersion=copy.appliedFields[itemId]?.sourceUrl??copy.baseVersionId;
    const sourceUrl=repository.versions.find(v=>v.id===urlVersion&&v.flowId===copy.flowId)?.items.find(i=>i.id===itemId)?.sourceUrl??null;
    return{ownerId:copy.id,sourceRevisionId:versionId,rowId:lineId,sourceItemRef:programPublicCopyItemRef(copy.id,copy.flowId,itemId),
      sourceDate:schedule.kind==='fixed'?schedule.date:null,wallTime:schedule.timing?.time??null,timeZone:schedule.timing?.timeZone??null,sourceUrl,resourceUrl:null};
  };
  const legacy=(documentId:string,lineId:string)=>raw(documentId,lineId)??publicFacts(documentId,lineId),native=space.creatorWorkspace?.nativeExecutionSources;
  if(!native)return legacy;
  if(!validateProgramNativeExecutionSources(native,space,space.creatorWorkspace!.library.records))return()=>null;
  const cache=new Map<string,ReturnType<typeof resolveNativeOwner>>(),targets=new Map(Object.values(native).flatMap(owner=>programNativeSelectedRows(owner).filter(s=>s.disposition==='active').map(selected=>[selected.row.lineId,{owner,selected}] as const)));
  return(documentId,lineId)=>{const target=targets.get(lineId);if(!target)return legacy(documentId,lineId);if(![...space.text.documents,...space.text.flows].some(d=>d.id===documentId&&d.lines.some(l=>l.id===lineId)))return null;
    let source=cache.get(target.owner.id);if(!source){source=resolveNativeOwner(space,target.owner);cache.set(target.owner.id,source);}if(!source.ok)return null;
    const ref=programNativeItemRef(target.owner.id,target.selected.row.itemId),attrs=source.contexts.get(ref)?.attributes;if(!attrs)return null;
    return{ownerId:target.owner.id,sourceRevisionId:target.selected.revision.id,rowId:target.selected.row.rowId,sourceItemRef:ref,sourceDate:attrs.resolvedDate,wallTime:attrs.time,timeZone:attrs.timeZone,sourceUrl:attrs.sourceUrl,resourceUrl:attrs.resourceUrl};
  };
}
function createRawCreatorTaskSourceFactsReader(space: ProgramPrivateSpace): (documentId: string, lineId: string) => ProgramCreatorTaskSourceFacts | null {
  const sources = space.creatorWorkspace?.executionSources;
  if (!sources || !validateProgramCreatorExecutionSources(sources, space, space.creatorWorkspace!.library.records)) return () => null;
  const documentLines = new Map([...space.text.documents,...space.text.flows].map(doc => [doc.id, new Set(doc.lines.map(line => line.id))]));
  const owners = Object.values(sources), flowCounts = new Map<string, number>();
  const rowOwners = new Map<string, { owner: ProgramCreatorExecutionSource; row: ProgramCreatorExecutionSource['revisions'][number]['rows'][number] }>();
  for (const owner of owners) {
    const revision = effectiveCreatorExecutionRevision(owner);
    flowCounts.set(revision.flow.ref, (flowCounts.get(revision.flow.ref) ?? 0) + 1);
    for (const row of revision.rows) rowOwners.set(row.documentLineId, { owner, row });
  }
  const resolved = new Map<string, ReturnType<typeof resolveValidatedCreatorSource>>();
  return (documentId, lineId) => {
    if (!documentLines.get(documentId)?.has(lineId)) return null;
    const target = rowOwners.get(lineId); if (!target) return null;
    const { owner, row } = target, revision = effectiveCreatorExecutionRevision(owner);
    if (flowCounts.get(revision.flow.ref) !== 1) return null;
    let source = resolved.get(owner.id);
    if (!source) { source = resolveValidatedCreatorSource(space, owner); resolved.set(owner.id, source); }
    if (!source.ok) return null;
    const attrs = source.contexts.get(row.itemRef)?.attributes, item = source.flow.items.find(i => i.ref === row.itemRef);
    const selectedRevision=creatorAdoptedRows(owner).find(selected=>selected.row.rowId===row.rowId&&selected.disposition==='active')?.revision;
    return { ownerId: owner.id, sourceRevisionId: selectedRevision?.id??revision.id, rowId: row.rowId, sourceItemRef: row.itemRef,
      sourceDate: attrs?.resolvedDate ?? attrs?.date ?? item?.sourceDate ?? null, wallTime: attrs?.time ?? null, timeZone: attrs?.timeZone ?? null,
      sourceUrl: attrs?.sourceUrl ?? null, resourceUrl: attrs?.resourceUrl ?? null };
  };
}
export function programCreatorTaskSourceFacts(space: ProgramPrivateSpace, documentId: string, lineId: string) {
  return createProgramCreatorTaskSourceFactsReader(space)(documentId, lineId);
}
