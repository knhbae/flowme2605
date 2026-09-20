import {deriveAuthoringArtifactEligibility} from './native-creator-vendor/text-authoring/parser';
import {stableAuthoringId,stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import type {NativeCreatorDocumentOwner,NativeCreatorEffectiveAbsences as Absences,NativeCreatorActionPayload,TextAuthoringDocument} from './native-creator-document-contract';
import type {AuthoringCompletion,AuthoringSchedule} from './native-creator-vendor/text-authoring/types';
const copy=<T,>(v:T):T=>structuredClone(v);
const scheduleKeys=new Set(['date','relative_date','time','timezone','duration','repeat','repeat_end']);
const snapshot=(d:TextAuthoringDocument)=>d.sourceState?.active.snapshotId;
function compact(entries:Absences['entries']):Absences|undefined {
 const unique=new Map(entries.map(e=>[`${e.itemId}:${e.field}`,e]));const result=[...unique.values()].sort((a,b)=>a.itemId.localeCompare(b.itemId)||a.field.localeCompare(b.field));return result.length?{version:1,entries:result}:undefined;
}
/** Canonical source facts remain untouched; only creator effective values and
 * their working properties are suppressed. No typed source fallback permitted. */
export function applyNativeCreatorAbsences(document:TextAuthoringDocument,absences:Absences|undefined,projection=false):TextAuthoringDocument {
 const next=copy(document);for(const entry of absences?.entries??[]){const item=next.parseResult.canonical.items.find(i=>i.itemId===entry.itemId);if(!item||entry.sourceSnapshotId!==snapshot(next))throw Error('invalid-absence');
  if(entry.field==='schedule'){delete item.schedule;item.properties=item.properties.filter(p=>!scheduleKeys.has(p.key));if(projection)delete item.recurrence;}
  else {delete item.completion;if(projection)item.properties=item.properties.filter(p=>p.key!=='completion');}
 }
 if(absences){next.parseResult.artifactEligibility=deriveAuthoringArtifactEligibility(next.parseResult.canonical);next.parseResult.parseResultId=stableAuthoringId('parse-result',next.documentId,next.parseResult.parserVersion,next.parseResult.fixtureVersion,stableAuthoringJson(next.parseResult.canonical),next.revision.revisionId);}
 return JSON.parse(JSON.stringify(next));
}
/** This exact intent is derived from authenticated owner action replay, never
 * accepted as an independent caller-supplied mutation or guessed row mapping. */
export function nextNativeCreatorAbsences(before:TextAuthoringDocument,after:TextAuthoringDocument,prior:Absences|undefined,payload:NativeCreatorActionPayload,undo:Absences|undefined):Absences|undefined {
 if(payload.kind==='restore')return undefined;
 if(payload.kind==='operation'&&payload.operation.type==='undo')return copy(undo);
 const sid=snapshot(after);if(!sid)return undefined;
 if(payload.kind==='source-apply'){
  if(payload.applyVersion===1)return undefined;
  const state=before.sourceState;if(!state||state.status==='current')throw Error('invalid-absence-source');const entries:Absences['entries']=[];
  for(const item of before.parseResult.canonical.items){const match=state.incoming.matches.find(m=>m.activeItemId===item.itemId),target=match?.incomingItemId??item.itemId;if(!after.parseResult.canonical.items.some(i=>i.itemId===target))continue;
   for(const field of ['completion','schedule'] as const){const change=state.changes.find(c=>c.kind==='changed'&&c.activeItemId===item.itemId&&c.field===field);const wasAbsent=prior?.entries.some(e=>e.itemId===item.itemId&&e.field===field);
    if(change?.kind==='changed'&&change.resolution==='use_incoming')continue;
    if(wasAbsent||change?.kind==='changed'&&change.resolution==='keep_user'&&item[field]===undefined)entries.push({itemId:target,field,sourceSnapshotId:sid});
   }
  }
  return compact(entries);
 }
 let entries=(prior?.entries??[]).filter(e=>after.parseResult.canonical.items.some(i=>i.itemId===e.itemId)).map(e=>({...e,sourceSnapshotId:sid}));
 if(payload.kind!=='operation')return compact(entries);
 const operation=payload.operation;
 if(operation.type==='sync_working_text_from_input')return undefined; // explicit new working source, original parser owns its context
 if(operation.type==='set_property')entries=entries.filter(e=>e.itemId!==operation.itemId||!(e.field==='completion'&&operation.key==='completion'||e.field==='schedule'&&scheduleKeys.has(operation.key)));
 if(operation.type==='sync_item_to_working_text')entries=entries.filter(e=>e.itemId!==operation.itemId||!(e.field==='completion'&&Object.hasOwn(operation.patch,'completion')||e.field==='schedule'&&Object.keys(operation.patch).some(k=>scheduleKeys.has(k))));
 if(operation.type==='split'){
  const oldIds=new Set(before.parseResult.canonical.items.map(i=>i.itemId)),added=after.parseResult.canonical.items.filter(i=>!oldIds.has(i.itemId));
  if(added.length===1)for(const e of prior?.entries.filter(e=>e.itemId===operation.itemId)??[])entries.push({...e,itemId:added[0].itemId,sourceSnapshotId:sid});
 }
 if(operation.type==='merge'){
  const survivors=after.parseResult.canonical.items.filter(i=>operation.itemIds.includes(i.itemId));
  if(survivors.length===1){const target=survivors[0];entries=entries.filter(e=>!operation.itemIds.includes(e.itemId));for(const field of ['completion','schedule'] as const){const selected=before.parseResult.canonical.items.filter(i=>operation.itemIds.includes(i.itemId));if(selected.every(i=>i[field]===undefined)&&selected.some(i=>prior?.entries.some(e=>e.itemId===i.itemId&&e.field===field)))entries.push({itemId:target.itemId,field,sourceSnapshotId:sid});}}
 }
 return compact(entries);
}
/** Read-only guard for a persisted v1 repair which removed a source typed fact.
 * Its original candidate still exists; upgrading must be explicit, not staging
 * an inferred or automatically migrated new baseline. */
export function requiresNativeCreatorAbsenceUpgrade(owner:NativeCreatorDocumentOwner):boolean {
 if(!owner.actions.some(a=>a.kind==='source-apply'&&a.applyVersion===1))return false;
 return nativeCreatorAbsenceLosses(owner.document).length>0;
}
export type NativeCreatorAbsenceRecoveryField={itemId:string;field:'completion'|'schedule';sourceSnapshotId:string;sourceValue:AuthoringCompletion|AuthoringSchedule;workingValue:null};
/** Historical data is inspected, not reparsed. These candidates are trusted only
 * after the enclosing Program owner journal has been validated. */
export function nativeCreatorAbsenceLosses(current:TextAuthoringDocument,exactRaw=false):NativeCreatorAbsenceRecoveryField[]{
 const fields=new Map<string,NativeCreatorAbsenceRecoveryField>();
 for(const revision of current.revisionHistory){const state=revision.before?.sourceState;if(!revision.operations.some(o=>o.type==='apply_source_update')||!state||state.status==='current'||state.incoming.snapshot.snapshotId!==snapshot(current))continue;
  for(const change of state.changes){if(change.kind!=='changed'||change.resolution!=='keep_user'||!['completion','schedule'].includes(change.field))continue;const field=change.field as 'completion'|'schedule',sourceField=field==='schedule'?'sourceSchedule':'sourceCompletion',incoming=state.incoming.parseResult.canonical.items.find(i=>i.itemId===change.incomingItemId),working=current.parseResult.canonical.items.find(i=>i.itemId===change.incomingItemId),previous=revision.before?.parseResult.canonical.items.find(i=>i.itemId===change.activeItemId);const incomingSource=incoming?.[sourceField]??(field==='schedule'&&!incoming?.scheduleOverrides?incoming?.schedule:field==='completion'&&incoming?.completion?.owner==='source'?incoming.completion:undefined);
   if(incomingSource===undefined||!working||working[sourceField]!==undefined||working[field]!==undefined)continue;
   if(exactRaw&&(current.rawText!==state.incoming.rawText||!previous||previous[field]!==undefined||change.userOwner!=='creator'||change.actorLane!=='creator'||stableAuthoringJson(change.userValue)!==stableAuthoringJson(change.oldSourceValue??null)))throw Error('unverifiable-absence-upgrade');
   const entry:NativeCreatorAbsenceRecoveryField={itemId:working.itemId,field,sourceSnapshotId:state.incoming.snapshot.snapshotId,sourceValue:copy(incomingSource),workingValue:null},key=`${working.itemId}:${field}`,existing=fields.get(key);
   if(existing&&stableAuthoringJson(existing)!==stableAuthoringJson(entry))throw Error('conflicting-absence-evidence');fields.set(key,entry);
  }
 }
 return [...fields.values()].sort((a,b)=>a.itemId.localeCompare(b.itemId)||a.field.localeCompare(b.field));
}
export function replayNativeCreatorAbsenceUpgrade(document:TextAuthoringDocument,prior:Absences|undefined):{document:TextAuthoringDocument;effectiveAbsences?:Absences}{
 const fields=nativeCreatorAbsenceLosses(document,true),next=copy(document);if(!fields.length)return{document,...(prior?{effectiveAbsences:prior}:{})};
 for(const field of fields){const item=next.parseResult.canonical.items.find(i=>i.itemId===field.itemId)!;if(field.field==='schedule')item.sourceSchedule=copy(field.sourceValue as AuthoringSchedule);else item.sourceCompletion=copy(field.sourceValue as AuthoringCompletion);}
 const effectiveAbsences=compact([...(prior?.entries??[]),...fields.map(({itemId,field,sourceSnapshotId})=>({itemId,field,sourceSnapshotId}))]);
 return{document:applyNativeCreatorAbsences(next,effectiveAbsences),...(effectiveAbsences?{effectiveAbsences}:{})};
}
