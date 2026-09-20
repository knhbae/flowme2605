import {applyAuthoringOperation} from './native-creator-vendor/text-authoring/operations';
import {deriveAuthoringArtifactEligibility} from './native-creator-vendor/text-authoring/parser';
import {parseAuthoringRecurrenceRule} from './native-creator-vendor/text-authoring/recurrence';
import {stableAuthoringId,stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import type {AuthoringSourceUpdateCandidate,AuthoringSourceItemMatch,CanonicalAuthoringItem,AuthoringRecurrenceRule} from './native-creator-vendor/text-authoring/types';
import type {TextAuthoringDocument,NativeCreatorSourceRecurrences,NativeCreatorRecurrenceChange,NativeCreatorSourceDecision,NativeCreatorActionPayload} from './native-creator-document-contract';
const copy=<T,>(value:T):T=>structuredClone(value);
const same=(a:unknown,b:unknown)=>stableAuthoringJson(a)===stableAuthoringJson(b);
const keys=new Set(['repeat','repeat_end','condition']);
function rule(item:CanonicalAuthoringItem){return item.recurrence??null;}
const workingFingerprint=(item:CanonicalAuthoringItem)=>stableAuthoringJson({rule:rule(item),properties:item.properties.filter(p=>keys.has(p.key))});
function assertExactRules(document:Pick<TextAuthoringDocument,'parseResult'>){
 const rows=new Set(document.parseResult.canonical.sourceRows.map(row=>row.sourceRowId));
 for(const item of document.parseResult.canonical.items){const value=item.recurrence;if(!value)continue;
  if(!Array.isArray(value.sourceRowIds)||!value.sourceRowIds.length||new Set(value.sourceRowIds).size!==value.sourceRowIds.length||value.sourceRowIds.some(id=>!rows.has(id)||!item.sourceRowIds.includes(id)))throw Error('invalid-recurrence-source-rows');
  const parsed=parseAuthoringRecurrenceRule({raw:value.raw,repeatEnd:value.end?.raw,executionCondition:value.executionCondition,sourceRowIds:value.sourceRowIds});
  if(!parsed.ok||!same(parsed.rule,value))throw Error('invalid-typed-recurrence');
 }
}
/** Exactly the pinned match rules. Original stage validates them again. */
function matches(document:TextAuthoringDocument,candidate:AuthoringSourceUpdateCandidate):AuthoringSourceItemMatch[]{
 const incoming=new Set(candidate.parseResult.canonical.items.map(i=>i.itemId)),all=[...candidate.matches,...document.parseResult.canonical.items.filter(i=>incoming.has(i.itemId)).map(i=>({activeItemId:i.itemId,incomingItemId:i.itemId,basis:'stable_entity_id' as const}))];
 const unique=[...new Map(all.map(m=>[m.activeItemId+'|'+m.incomingItemId,m])).values()];const active=new Set<string>(),next=new Set<string>();
 for(const m of unique){if(active.has(m.activeItemId)||next.has(m.incomingItemId)||!document.parseResult.canonical.items.some(i=>i.itemId===m.activeItemId)||!incoming.has(m.incomingItemId)||!['explicit','stable_entity_id'].includes(m.basis)||m.basis==='stable_entity_id'&&m.activeItemId!==m.incomingItemId)throw Error('invalid-recurrence-match');active.add(m.activeItemId);next.add(m.incomingItemId);}return unique;
}
export function needsNativeSourceRecurrenceStage(document:TextAuthoringDocument,candidate:AuthoringSourceUpdateCandidate,prior?:NativeCreatorSourceRecurrences):boolean {
 if(prior)return true;
 return matches(document,candidate).some(m=>!same(rule(document.parseResult.canonical.items.find(i=>i.itemId===m.activeItemId)!),rule(candidate.parseResult.canonical.items.find(i=>i.itemId===m.incomingItemId)!)));
}
/** The candidate is never edited. Only the working validation clone has the
 * separately reviewed recurrence residue aligned; all other vendor guards run. */
export function normalizeNativeSourceRecurrenceProbe(document:TextAuthoringDocument,candidate:AuthoringSourceUpdateCandidate):TextAuthoringDocument {
 assertExactRules(document);assertExactRules(candidate);
 const next=copy(document);
 for(const m of matches(document,candidate)){const active=next.parseResult.canonical.items.find(i=>i.itemId===m.activeItemId)!,incoming=candidate.parseResult.canonical.items.find(i=>i.itemId===m.incomingItemId)!;
  if(incoming.recurrence)active.recurrence=copy(incoming.recurrence);else delete active.recurrence;
  // repeat is already a vendor schedule field. End and recurrence condition
  // are reviewed by the Program rule diff, never by a fabricated schedule.
  const extra=(item:CanonicalAuthoringItem,key:string)=>key==='repeat_end'||key==='condition'&&!!item.recurrence;
  active.properties=[...active.properties.filter(p=>!extra(document.parseResult.canonical.items.find(i=>i.itemId===m.activeItemId)!,p.key)),...incoming.properties.filter(p=>extra(incoming,p.key)).map(copy)];
 }
 return next;
}
export function refreshNativeRecurrenceDerived(document:TextAuthoringDocument){
 document.parseResult.artifactEligibility=deriveAuthoringArtifactEligibility(document.parseResult.canonical);
 document.parseResult.parseResultId=stableAuthoringId('parse-result',document.documentId,document.parseResult.parserVersion,document.parseResult.fixtureVersion,stableAuthoringJson(document.parseResult.canonical),document.revision.revisionId);
 return document;
}
function sourceRules(document:TextAuthoringDocument,original:TextAuthoringDocument,prior?:NativeCreatorSourceRecurrences):NativeCreatorSourceRecurrences['sourceRules']{
 if(prior)return copy(prior.sourceRules);
 const sid=document.sourceState?.active.snapshotId;
 const captured=[...document.revisionHistory].reverse().find(r=>r.before?.sourceState&&r.before.sourceState.status!=='current'&&r.before.sourceState.incoming.snapshot.snapshotId===sid&&r.operations.some(o=>o.type==='apply_source_update'))?.before?.sourceState;
 const source=captured&&captured.status!=='current'?captured.incoming.parseResult:original.parseResult;
 if(!sid)throw Error('missing-source-snapshot');
 return source.canonical.items.map(i=>({itemId:i.itemId,sourceSnapshotId:sid,rule:copy(rule(i))}));
}
export function stageNativeSourceRecurrences(document:TextAuthoringDocument,candidate:AuthoringSourceUpdateCandidate,at:string,original:TextAuthoringDocument,prior?:NativeCreatorSourceRecurrences){
 const normalized=normalizeNativeSourceRecurrenceProbe(document,candidate);
 const result=applyAuthoringOperation(normalized,{type:'stage_source_update',candidate},{actorLane:'creator',now:at});
 const staged=result.sourceState;if(!staged||staged.status==='current')return null;
 const rules=sourceRules(result,original,prior),changes:NativeCreatorRecurrenceChange[]=[];
 for(const match of staged.incoming.matches){const old=rules.find(r=>r.itemId===match.activeItemId),working=document.parseResult.canonical.items.find(i=>i.itemId===match.activeItemId)!,incoming=staged.incoming.parseResult.canonical.items.find(i=>i.itemId===match.incomingItemId)!;
  if(!old)throw Error('missing-exact-source-rule');
  const oldRule=old.rule,workingRule=rule(working),incomingRule=rule(incoming);
  if(same(oldRule,incomingRule)&&same(workingRule,incomingRule))continue;
  changes.push({kind:'changed',field:'recurrence',changeId:stableAuthoringId('program-source-recurrence',staged.active.snapshotId,staged.incoming.snapshot.snapshotId,match.activeItemId,match.incomingItemId),activeItemId:match.activeItemId,incomingItemId:match.incomingItemId,oldSourceValue:copy(oldRule),userValue:copy(workingRule),incomingSourceValue:copy(incomingRule),workingFingerprint:workingFingerprint(working),userOwner:'creator',state:'open'});
 }
 // Restore the actual pre-stage working context and the actual Undo before image.
 result.parseResult=copy(document.parseResult);if(result.revision.before)result.revision.before.parseResult=copy(document.parseResult);
 result.revisionHistory[result.revisionHistory.length-1]=copy(result.revision);refreshNativeRecurrenceDerived(result);
 return{document:JSON.parse(JSON.stringify(result)) as TextAuthoringDocument,sourceRecurrences:{version:1,sourceRules:rules,pending:{candidateSnapshotId:staged.incoming.snapshot.snapshotId,changes}} as NativeCreatorSourceRecurrences};
}
export function decideNativeSourceRecurrence(prior:NativeCreatorSourceRecurrences,input:NativeCreatorSourceDecision,at:string):NativeCreatorSourceRecurrences|null {
 const next=copy(prior),change=next.pending?.changes.find(c=>c.changeId===input.changeId);if(!change)return null;
 if(input.decisionVersion!==1||!['keep_working','use_incoming'].includes(input.decision))throw Error('invalid-recurrence-decision');
 change.state='resolved';change.resolution=input.decision==='keep_working'?'keep_user':'use_incoming';change.actorLane='creator';change.decidedAt=at;return next;
}
export function applyNativeSourceRecurrenceResult(before:TextAuthoringDocument,result:TextAuthoringDocument,prior:NativeCreatorSourceRecurrences){
 const staged=before.sourceState,pending=prior.pending;if(!staged||staged.status==='current'||!pending||pending.candidateSnapshotId!==staged.incoming.snapshot.snapshotId||pending.changes.some(c=>c.state!=='resolved'||!c.resolution||c.actorLane!=='creator'||!c.decidedAt))throw Error('unresolved-recurrence');
 for(const change of pending.changes){const working=before.parseResult.canonical.items.find(i=>i.itemId===change.activeItemId),incoming=staged.incoming.parseResult.canonical.items.find(i=>i.itemId===change.incomingItemId),old=prior.sourceRules.find(r=>r.itemId===change.activeItemId);if(!working||!incoming||!old||!same(rule(working),change.userValue)||workingFingerprint(working)!==change.workingFingerprint||!same(rule(incoming),change.incomingSourceValue)||!same(old.rule,change.oldSourceValue))throw Error('stale-recurrence-comparison');}
 const next=copy(result),rules:NativeCreatorSourceRecurrences['sourceRules']=[];
 for(const item of next.parseResult.canonical.items){const incoming=staged.incoming.parseResult.canonical.items.find(i=>i.itemId===item.itemId),match=staged.incoming.matches.find(m=>m.incomingItemId===item.itemId),old=match?prior.sourceRules.find(r=>r.itemId===match.activeItemId):prior.sourceRules.find(r=>r.itemId===item.itemId),change=pending.changes.find(c=>c.incomingItemId===item.itemId);
  if(!incoming){if(!old)throw Error('missing-retained-rule');rules.push(copy(old));continue;}
  const entry:NativeCreatorSourceRecurrences['sourceRules'][number]={itemId:item.itemId,sourceSnapshotId:staged.incoming.snapshot.snapshotId,rule:copy(rule(incoming))};
  if(change?.resolution==='keep_user')entry.workingRule=copy(change.userValue);
  else if(!change&&old&&Object.hasOwn(old,'workingRule'))entry.workingRule=copy(old.workingRule!);
  if(Object.hasOwn(entry,'workingRule')){const working=before.parseResult.canonical.items.find(i=>i.itemId===(match?.activeItemId??item.itemId));if(!working)throw Error('missing-working-rule');if(entry.workingRule)item.recurrence=copy(entry.workingRule);else delete item.recurrence;item.properties=[...item.properties.filter(p=>!keys.has(p.key)),...working.properties.filter(p=>keys.has(p.key)).map(copy)];
   item.sourceRowIds=[...new Set([...item.sourceRowIds,...(entry.workingRule?.sourceRowIds??[]),...working.properties.filter(p=>keys.has(p.key)).flatMap(p=>p.sourceRowIds)])];
   const ids=new Set(next.parseResult.canonical.sourceRows.map(r=>r.sourceRowId));for(const row of before.parseResult.canonical.sourceRows)if(!ids.has(row.sourceRowId)){next.parseResult.canonical.sourceRows.push({...copy(row),state:'tombstone',sourceSnapshotId:row.sourceSnapshotId??staged.active.snapshotId});ids.add(row.sourceRowId);}}
  rules.push(entry);
 }
 if(next.revision.before){next.revision.before.parseResult=copy(before.parseResult);next.revision.before.sourceState=copy(before.sourceState);}next.revisionHistory[next.revisionHistory.length-1]=copy(next.revision);
 return{document:refreshNativeRecurrenceDerived(next),sourceRecurrences:{version:1,sourceRules:rules} as NativeCreatorSourceRecurrences};
}
export function updateNativeSourceRecurrences(before:TextAuthoringDocument,after:TextAuthoringDocument,prior:NativeCreatorSourceRecurrences|undefined,payload:NativeCreatorActionPayload,undo?:NativeCreatorSourceRecurrences):NativeCreatorSourceRecurrences|undefined {
 if(payload.kind==='restore')return undefined;
 if(payload.kind==='operation'&&payload.operation.type==='undo')return copy(undo);
 if(!prior)return undefined;const next=copy(prior);
 if(payload.kind==='operation'){
  const op=payload.operation;if(op.type==='reject_source_update')delete next.pending;
  if(op.type==='sync_working_text_from_input')for(const entry of next.sourceRules)delete entry.workingRule;
  if(op.type==='set_property'&&op.key==='repeat'||op.type==='sync_item_to_working_text'&&['repeat','repeat_end','condition'].some(k=>Object.hasOwn(op.patch,k))){const entry=next.sourceRules.find(r=>r.itemId===op.itemId);if(entry)delete entry.workingRule;}
 }
 return next;
}
/** Read projection cannot resurrect a deliberately absent recurrence from the
 * preserved native source schedule/property. Source facts remain in the owner. */
export function projectNativeSourceRecurrences(document:TextAuthoringDocument,prior?:NativeCreatorSourceRecurrences):TextAuthoringDocument {
 const next=copy(document);for(const entry of prior?.sourceRules??[]){if(!Object.hasOwn(entry,'workingRule'))continue;const item=next.parseResult.canonical.items.find(i=>i.itemId===entry.itemId);if(!item)continue;if(entry.workingRule===null){delete item.recurrence;item.properties=item.properties.filter(p=>!keys.has(p.key));if(item.schedule)delete item.schedule.repeat;}else if(item.schedule)item.schedule.repeat=entry.workingRule!.raw;}
 return refreshNativeRecurrenceDerived(next);
}
