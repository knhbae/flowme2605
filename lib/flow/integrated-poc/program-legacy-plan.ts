import { programClone, programFailure, programResult, type ProgramData } from './contract';
import { programSame } from './controller';
import { inspectProgramLegacySnapshotPayload } from './legacy-snapshot';
import { prepareProgramLegacyView } from './legacy-transaction';
import { reconcileProgramLegacy } from './legacy-reconcile';
import { getPersonalWorkspacePocFlowItemFieldOwnership, type PersonalWorkspacePocFlowItem } from '../personal-workspace-poc-contract';
import { programStructuredRecurrence } from './legacy-source-context';
import { programLegacyPlanDate, programLegacyPlanSourceToken, programLegacyPlanExecutionDate, type ProgramLegacyPlanSelection } from './program-legacy-plan-contract';
import { previewProgramLegacySeriesPlan,mergeProgramLegacySeriesPlans,programLegacySeriesOwnerConflict,type ProgramLegacySeriesChoice,type ProgramLegacySeriesPreview } from './program-legacy-series-plan';

export type ProgramLegacyPlanDraft = { personalAnchor?: string; includedItemRefs: string[]; reviewSourceToken?: string; newItemChoices?: Record<string,boolean>; seriesChoices?:Record<string,ProgramLegacySeriesChoice> };
export function readProgramLegacyPlan(data: ProgramData, actorId: string, flowRef: string, now: string) {
  const view = prepareProgramLegacyView(data, { actorId, now, onlyFlowRef: flowRef });
  if (!view.ok) return { ok: false as const, reason: view.reason };
  const checked = inspectProgramLegacySnapshotPayload(view.payload);
  if (!checked.ok) return { ok: false as const, reason: 'invalid-source' };
  const flow = checked.model.flows.find(row => row.ref === flowRef);
  const source = checked.mapSourceFlows.find(row => row.ref === flowRef);
  if (!flow || !source) return { ok: false as const, reason: 'missing-source' };
  const contexts = checked.sourceContextByFlow.get(flowRef), saved = view.payload.planSelections?.flows[flowRef];
  const token = programLegacyPlanSourceToken(source, contexts);
  const stale = !!saved && saved.sourceToken !== token;
  const rows = flow.items.map(item => ({ itemRef: item.ref, title: item.title, section: item.sectionTitle ?? '',
    sourceDate: getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow).date.source.value ?? null,
    planDate: saved && Object.hasOwn(saved.planDates, item.ref) ? saved.planDates[item.ref] : item.sourceDate ?? null,
    executionDate: programLegacyPlanExecutionDate(saved,view.payload.state,item.ref,item.sourceDate ?? null),
    included: saved ? saved.includedItemRefs.includes(item.ref) : true,
    pending: !!saved && !saved.catalogItemRefs.includes(item.ref),
    recurrence: contexts?.get(item.ref)?.attributes.recurrence ?? null }));
  return { ok: true as const, view, flow, source, contexts, token, stale, saved, rows,
    sourceAnchor: source.fieldOwnership?.anchorDate.source.value ?? ('authoring' in source ? source.anchorDate ?? null : null),
    personalAnchor: saved?.personalAnchor ?? flow.fieldOwnership?.anchorDate.existingPersonal.value ?? flow.anchorDate ?? null };
}
/** Shared UI/model classification on the authenticated read model. A structured
 * Map's saved start-date basis is not an authored D+0 line or an absolute date. */
export function programLegacySeriesAnchorBasis(read: Extract<ReturnType<typeof readProgramLegacyPlan>, { ok: true }>, item: PersonalWorkspacePocFlowItem) {
  const context = read.contexts?.get(item.ref), attrs = context?.attributes;
  if (!attrs?.recurrence) return null;
  const structured = programStructuredRecurrence(context);
  if (structured) return structured.dateBasis === 'saved-flow-anchor' && structured.flowRef === read.flow.ref
    && structured.itemRef === item.ref && structured.savedCopyId === item.savedCopyId && structured.flowId === item.flowId && structured.itemId === item.itemId
    && structured.sourceCalendar.mode === 'routine' && structured.sourceCalendar.anchorType === 'start_date'
    ? 'flow-anchor' : 'unsupported';
  const schedule = getPersonalWorkspacePocFlowItemFieldOwnership(item, read.flow.origin, read.flow).dateDerivation.sourceSchedule;
  if (!attrs.relativeDate && schedule.mode === 'absolute' && programLegacyPlanDate(schedule.date) && schedule.provenance !== 'legacy-v1-fallback') return 'fixed-source';
  if (attrs.relativeDate) return /^D([+-]\d+|0)$/.test(attrs.relativeDate) ? 'flow-anchor' : 'unsupported';
  return schedule.mode === 'day-offset' && schedule.provenance !== 'legacy-v1-fallback' ? 'flow-anchor' : 'unsupported';
}
export function previewProgramLegacyPlan(data: ProgramData, input: { actorId: string; flowRef: string; now: string; draft: ProgramLegacyPlanDraft; mapGroupRef?:string }) {
  const read = readProgramLegacyPlan(data, input.actorId, input.flowRef, input.now);
  if (!read.ok) return read;
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (read.stale && input.draft.reviewSourceToken !== read.token) return fail('source-review-required');
  const refs = read.flow.items.map(row => row.ref), selected = input.draft.includedItemRefs;
  if (!Array.isArray(selected) || !selected.length) return fail('empty-plan-policy-not-decided');
  if (new Set(selected).size !== selected.length || selected.some(ref => !refs.includes(ref))) return fail('invalid-catalog-selection');
  if (read.stale && read.rows.some(row => row.pending && (typeof input.draft.newItemChoices?.[row.itemRef] !== 'boolean' || input.draft.newItemChoices[row.itemRef] !== selected.includes(row.itemRef)))) return fail('new-items-need-explicit-choice');
  if (input.draft.personalAnchor !== undefined && !programLegacyPlanDate(input.draft.personalAnchor)) return fail('invalid-anchor');
  if (read.flow.presentation?.mapGroup && read.flow.presentation.mapGroup.groupRef!==input.mapGroupRef) return fail('map-plan-owner-required');
  const planDates: Record<string,string|null> = {};
  const seriesPreviews:ProgramLegacySeriesPreview[]=[],usedChoices=new Set<string>();
  const rows = [];
  for (const item of read.flow.items) {
    const attrs = read.contexts?.get(item.ref)?.attributes;
    const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, read.flow.origin, read.flow).dateDerivation;
    let date = item.sourceDate ?? null, reason = 'preserved';
    if (input.draft.personalAnchor !== undefined) {
      if (attrs?.recurrence) {
        // An authenticated absolute source series does not depend on the plan
        // anchor. Do not create a series date override or rewrite its owner.
        const existing = read.rows.find(row => row.itemRef === item.ref)!;
        const choice=input.draft.seriesChoices?.[item.ref];
        const basis = programLegacySeriesAnchorBasis(read, item);
        const fixed = basis === 'fixed-source';
        let status:ProgramLegacySeriesPreview['status']='fixed-preserved';
        if(!fixed){
          if (basis !== 'flow-anchor') return fail('typed-source-schedule-required');
          if(!selected.includes(item.ref)){if(choice)return fail('excluded-series-choice');status='excluded-preserved';}
          else if(!choice&&input.draft.personalAnchor===read.personalAnchor){status='unchanged';}
          else{
            if(!existing.included)return fail('excluded-series-reinclude-review-required');
            if(!choice)return fail('relative-series-anchor-owner-required');
            usedChoices.add(item.ref);
            const planned=previewProgramLegacySeriesPlan(data,{actorId:input.actorId,flowRef:input.flowRef,itemRef:item.ref,localToday:input.now.slice(0,10),choice});
            if(!planned.ok)return planned;seriesPreviews.push(planned.value);status=planned.value.status;
          }
        }
        if(!usedChoices.has(item.ref))seriesPreviews.push({itemRef:item.ref,status});
        if (read.saved && Object.hasOwn(read.saved.planDates, item.ref)) planDates[item.ref] = read.saved.planDates[item.ref];
        rows.push({ ...existing, afterDate: existing.planDate, reason: status==='fixed-preserved'?'fixed-series-preserved':`series-${status}` });
        continue;
      }
      if (['poc-personal-schedule','existing-personal-override','existing-personal-schedule'].includes(ownership.strategy)) {
        // A same-value pin and an explicit undated value remain intentional.
        date = ownership.effectiveDate.value ?? null;
      } else {
        const rawOffset = attrs?.relativeDate?.match(/^D([+-]\d+|0)$/);
        const schedule = ownership.sourceSchedule;
        const offset = rawOffset ? Number(rawOffset[1]) : schedule.mode === 'day-offset' && schedule.provenance !== 'legacy-v1-fallback' ? schedule.dayOffset : null;
        if (attrs?.relativeDate && !rawOffset || schedule.mode === 'unsupported') return fail('typed-source-schedule-required');
        if (offset !== null) {
          if (!Number.isSafeInteger(offset)) return fail('invalid-offset');
          const shifted = new Date(`${input.draft.personalAnchor}T00:00:00Z`); shifted.setUTCDate(shifted.getUTCDate() + offset);
          const result = Number.isFinite(shifted.getTime()) ? shifted.toISOString().slice(0,10) : '';
          if (!programLegacyPlanDate(result)) return fail('date-out-of-range');
          date = result; reason = 'relative-recalculated';
        } else if (!attrs && schedule.provenance === 'legacy-v1-fallback') return fail('typed-source-schedule-required');
      }
      planDates[item.ref] = date;
    }
    rows.push({ ...read.rows.find(row => row.itemRef === item.ref)!, afterDate: input.draft.personalAnchor === undefined ? read.rows.find(row => row.itemRef === item.ref)!.planDate : date, reason });
  }
  if(input.draft.seriesChoices&&(!input.draft.seriesChoices||typeof input.draft.seriesChoices!=='object'||Array.isArray(input.draft.seriesChoices)||Object.keys(input.draft.seriesChoices).some(ref=>!usedChoices.has(ref))))return fail('unexpected-series-choice');
  const seriesConflict=programLegacySeriesOwnerConflict(seriesPreviews);if(seriesConflict)return fail(seriesConflict);
  const retained = read.saved?.catalogItemRefs.filter(ref=>!refs.includes(ref)) ?? [];
  const candidate: ProgramLegacyPlanSelection = { savedCopyId: read.flow.savedCopyId, flowId: read.flow.flowId, sourceToken: read.token,
    catalogItemRefs: [...refs,...retained], includedItemRefs: [...refs.filter(ref => selected.includes(ref)),...retained.filter(ref=>read.saved!.includedItemRefs.includes(ref))],
    ...(input.draft.personalAnchor === undefined ? read.saved?.personalAnchor ? { personalAnchor: read.saved.personalAnchor } : {} : { personalAnchor: input.draft.personalAnchor }),
    planDates: input.draft.personalAnchor === undefined ? read.saved?.planDates ?? {} : {...Object.fromEntries(retained.filter(ref=>Object.hasOwn(read.saved!.planDates,ref)).map(ref=>[ref,read.saved!.planDates[ref]])),...planDates} };
  const compared = rows.map(row=>({...row,afterExecutionDate:programLegacyPlanExecutionDate(candidate,read.view.payload.state,row.itemRef,row.afterDate),afterIncluded: selected.includes(row.itemRef)}));
  return { ok: true as const, read, rows:compared, candidate,seriesPreviews,
    counts:{planDateChanges:compared.filter(row=>row.planDate!==row.afterDate).length,executionDateChanges:compared.filter(row=>row.executionDate!==row.afterExecutionDate).length,
      excluded:compared.filter(row=>row.included&&!row.afterIncluded).length,restored:compared.filter(row=>!row.included&&row.afterIncluded).length},
    expectedSpace: programClone(data.spaces[input.actorId]) };
}
export function applyProgramLegacyPlan(data: ProgramData, input: { actorId: string; flowRef: string; now: string; draft: ProgramLegacyPlanDraft; expectedSpace: ProgramData['spaces'][string] }) {
  if (data.activeActorId !== input.actorId) return programFailure(data, 'forbidden');
  if (!programSame(data.spaces[input.actorId], input.expectedSpace)) return programFailure(data, 'conflict');
  const preview = previewProgramLegacyPlan(data, input);
  if (!preview.ok) return programFailure(data, 'unresolved');
  if (!preview.read.saved && input.draft.personalAnchor === undefined && preview.candidate.includedItemRefs.length === preview.candidate.catalogItemRefs.length) return programResult(data,data,input.flowRef);
  if (programSame(preview.candidate, preview.read.saved)&&!preview.seriesPreviews.some(p=>p.status==='changed')) return programResult(data, data, input.flowRef);
  const rebased = programClone(data), space = rebased.spaces[input.actorId];
  space.legacySnapshot = { ...space.legacySnapshot!, raw: JSON.stringify(preview.read.view.payload), revision: preview.read.view.payload.state.revision };
  const payload = { ...preview.read.view.payload, planSelections: { version: 1 as const,
    ...(preview.read.view.payload.planSelections?.groups?{groups:preview.read.view.payload.planSelections.groups}:{}),
    flows: { ...preview.read.view.payload.planSelections?.flows, [input.flowRef]: preview.candidate } } };
  const merged = reconcileProgramLegacy(rebased, payload, { actorId: input.actorId, expectedSnapshotRaw: space.legacySnapshot.raw, canonicalFolders: true, onlyFlowRef: input.flowRef });
  if(!merged.ok)return programFailure(data,merged.reason);
  const combined=mergeProgramLegacySeriesPlans(data,merged.data,input.actorId,preview.seriesPreviews);
  return combined.ok?programResult(data,combined.data,input.flowRef):programFailure(data,'unresolved');
}
