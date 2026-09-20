import { programClone,type ProgramData } from './contract';
import { programSame } from './controller';
import { validateProgramData } from './program-data';
import type { ProgramOccurrenceIdentity } from './recurrence-state-contract';
import type { ProgramPersonalOccurrenceIdentity,ProgramRecurrencePlanOwner } from './program-recurrence-plan-contract';
import { prepareProgramRecurrencePlan,applyProgramRecurrencePlanTransition } from './program-recurrence-plan-state';
import { applyProgramRecurrencePlan,previewProgramRecurrencePlan,resolveProgramRecurrencePlanTarget,type ProgramRecurrencePlanPreview } from './program-recurrence-plan';

/** Transient explicit intent. It is not persisted into the legacy source or planDates. */
export type ProgramLegacySeriesChoice={ownerId:string;expectedOwner:ProgramRecurrencePlanOwner|null;sourceIdentity:ProgramOccurrenceIdentity;
 personalIdentity?:ProgramPersonalOccurrenceIdentity;originalDate:string;scope:'whole_series'|'future_series';targetDate:string;at:string};
export type ProgramLegacySeriesPreview={itemRef:string;status:'changed'|'unchanged'|'excluded-preserved'|'fixed-preserved';
 ownerId?:string;owner?:ProgramRecurrencePlanOwner;expectedOwner?:ProgramRecurrencePlanOwner|null;preview?:ProgramRecurrencePlanPreview};
const fail=(reason:string)=>({ok:false as const,reason});
/** Shared preview/apply boundary: two Items must never replace the same personal owner. */
export function programLegacySeriesOwnerConflict(previews:ProgramLegacySeriesPreview[]):string|null{
 const seen=new Set<string>();for(const p of previews){if(!p.ownerId)continue;if(seen.has(p.ownerId))return'duplicate-series-owner';seen.add(p.ownerId);}return null;
}
/** Every intent is checked against the same original Program snapshot. No sequential commits or relaxed guards. */
export function previewProgramLegacySeriesPlan(data:ProgramData,input:{actorId:string;flowRef:string;itemRef:string;localToday:string;choice:ProgramLegacySeriesChoice}){
 const c=input.choice;
 if(!c||typeof c!=='object'||Array.isArray(c)||Object.keys(c).some(k=>!['ownerId','expectedOwner','sourceIdentity','personalIdentity','originalDate','scope','targetDate','at'].includes(k))
   ||!c.sourceIdentity||c.sourceIdentity.sourceFlowRef!==input.flowRef||c.sourceIdentity.sourceItemRef!==input.itemRef
   ||!['whole_series','future_series'].includes(c.scope))return fail('invalid-series-choice');
 const prepared=prepareProgramRecurrencePlan(data,{actorId:input.actorId,flowRef:input.flowRef,sourceIdentity:c.sourceIdentity,ownerId:c.ownerId,localToday:input.localToday,now:c.at});
 if(!prepared.ok)return prepared;
 const p=prepared.value;
 if(p.owner.ownerId!==c.ownerId||!programSame(p.expectedOwner,c.expectedOwner))return fail('series-owner-conflict');
 const target=resolveProgramRecurrencePlanTarget(p.owner,{originalDate:c.originalDate,personalIdentity:c.personalIdentity});if(!target.ok)return target;
 if(!p.owner.operations.length&&c.originalDate!==c.sourceIdentity.originalDate)return fail('source-cutover-required');
 const preview=previewProgramRecurrencePlan(p.owner,{actorId:input.actorId,expected:p.owner,currentSource:p.owner.source,
  operation:{scope:c.scope,target:target.value,targetDate:c.targetDate,sourceCutover:p.owner.operations.length?null:c.sourceIdentity,at:c.at}});
 if(!preview.ok){if(preview.reason==='unchanged-date')return{ok:true as const,value:{itemRef:input.itemRef,status:'unchanged' as const,ownerId:c.ownerId,owner:p.owner,expectedOwner:p.expectedOwner}};return preview;}
 // This transition is evaluated in memory on the original snapshot only. Its validated owner is the only field merged later.
 const verified=applyProgramRecurrencePlanTransition(data,{actorId:input.actorId,expectedSpace:p.expectedSpace,expectedOwner:p.expectedOwner,preview:preview.value,localToday:input.localToday});
 if(!verified.ok)return fail(`series-${verified.reason}`);
 return{ok:true as const,value:{itemRef:input.itemRef,status:'changed' as const,ownerId:c.ownerId,owner:p.owner,expectedOwner:p.expectedOwner,preview:preview.value}};
}
/** Reconcile first, then add exactly the independently verified owners, and validate the whole resulting private state. */
export function mergeProgramLegacySeriesPlans(before:ProgramData,reconciled:ProgramData,actorId:string,previews:ProgramLegacySeriesPreview[]){
 const conflict=programLegacySeriesOwnerConflict(previews),changed=previews.filter(p=>p.status==='changed');
 if(conflict)return fail(conflict);
 if(!changed.length)return{ok:true as const,data:reconciled};
 const next=programClone(reconciled),space=next.spaces[actorId];
 if(!programSame(space.recurrencePlans??null,before.spaces[actorId].recurrencePlans??null))return fail('series-owner-conflict');
 space.recurrencePlans={version:1,owners:{...space.recurrencePlans?.owners}};
 for(const p of changed){if(!p.preview||!p.owner||!p.ownerId||p.preview.after.ownerId!==p.ownerId||p.owner.source.sourceItemRef!==p.itemRef
    ||!programSame(p.owner,p.preview.before)||!applyProgramRecurrencePlan(p.owner,p.preview).ok
    ||!programSame(before.spaces[actorId].recurrencePlans?.owners[p.ownerId]??null,p.expectedOwner))return fail('series-owner-conflict');
  space.recurrencePlans.owners[p.ownerId]=programClone(p.preview.after);
 }
 return validateProgramData(next)?{ok:true as const,data:next}:fail('invalid-series-plan');
}
