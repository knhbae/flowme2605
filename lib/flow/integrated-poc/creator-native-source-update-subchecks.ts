import {applyAuthoringOperation} from './native-creator-vendor/text-authoring/operations';
import {stableAuthoringId,stableAuthoringJson} from './native-creator-vendor/text-authoring/identity';
import {needsNativeSourceRecurrenceStage,stageNativeSourceRecurrences,refreshNativeRecurrenceDerived} from './creator-native-source-update-recurrence';
import type {AuthoringSourceUpdateCandidate,AuthoringSourceItemMatch,CanonicalAuthoringItem} from './native-creator-vendor/text-authoring/types';
import type {TextAuthoringDocument,NativeCreatorSourceSubchecks,NativeCreatorSubcheckChange,NativeCreatorSourceRecurrences,NativeCreatorSourceDecision,NativeCreatorActionPayload} from './native-creator-document-contract';

const copy=<T,>(value:T):T=>structuredClone(value);
const same=(a:unknown,b:unknown)=>stableAuthoringJson(a)===stableAuthoringJson(b);
const checks=(item:CanonicalAuthoringItem)=>item.subchecks??null;
const fingerprint=(item:CanonicalAuthoringItem)=>stableAuthoringJson(checks(item));

/** Match only explicit parent tuples or an already identical parent ID. */
function matches(document:TextAuthoringDocument,candidate:AuthoringSourceUpdateCandidate):AuthoringSourceItemMatch[]{
 const incoming=new Set(candidate.parseResult.canonical.items.map(i=>i.itemId));
 const all=[...candidate.matches,...document.parseResult.canonical.items.filter(i=>incoming.has(i.itemId)).map(i=>({activeItemId:i.itemId,incomingItemId:i.itemId,basis:'stable_entity_id' as const}))];
 const unique=[...new Map(all.map(m=>[m.activeItemId+'|'+m.incomingItemId,m])).values()],active=new Set<string>(),next=new Set<string>();
 for(const m of unique){
  if(active.has(m.activeItemId)||next.has(m.incomingItemId)||!document.parseResult.canonical.items.some(i=>i.itemId===m.activeItemId)||!incoming.has(m.incomingItemId)||!['explicit','stable_entity_id'].includes(m.basis)||m.basis==='stable_entity_id'&&m.activeItemId!==m.incomingItemId)throw Error('invalid-subcheck-match');
  active.add(m.activeItemId);next.add(m.incomingItemId);
 }
 return unique;
}

/** A retained check must still point to genuine source rows, not invented rows. */
function assertExactChecks(document:Pick<TextAuthoringDocument,'parseResult'>){
 const rows=new Set(document.parseResult.canonical.sourceRows.map(r=>r.sourceRowId)),ids=new Set<string>();
 for(const item of document.parseResult.canonical.items){
  if(item.subchecks===undefined)continue;
  if(!Array.isArray(item.subchecks))throw Error('invalid-source-subchecks');
  const orders=new Set<number>();
  for(const check of item.subchecks){
   if(!check||Object.keys(check).some(k=>!['subcheckId','title','sourceChecked','order','sourceRowIds','owner'].includes(k))||typeof check.subcheckId!=='string'||!check.subcheckId||ids.has(check.subcheckId)||typeof check.title!=='string'||!check.title.trim()||typeof check.sourceChecked!=='boolean'||!Number.isSafeInteger(check.order)||check.order<0||orders.has(check.order)||!['source','creator','personal','suggestion'].includes(check.owner)||!Array.isArray(check.sourceRowIds)||!check.sourceRowIds.length||new Set(check.sourceRowIds).size!==check.sourceRowIds.length||check.sourceRowIds.some(id=>!rows.has(id)||!item.sourceRowIds.includes(id)))throw Error('invalid-source-subcheck-provenance');
   ids.add(check.subcheckId);orders.add(check.order);
  }
 }
}

/** Same native parser source-unit/subcheck identity contract, checked against
 * the untouched candidate text. This is validation, not candidate rewriting. */
function assertCandidateCheckFacts(documentId:string,candidate:AuthoringSourceUpdateCandidate){
 const rows=new Map(candidate.parseResult.canonical.sourceRows.map(row=>[row.sourceRowId,row]));
 for(const item of candidate.parseResult.canonical.items)for(const [index,check] of (item.subchecks??[]).entries()){
  if(check.owner!=='source'||check.order!==index||check.sourceRowIds.length!==1)throw Error('invalid-candidate-subcheck-source');
  const row=rows.get(check.sourceRowIds[0]);if(!row||row.documentId!==documentId||row.state==='tombstone'||row.rowType!=='check')throw Error('invalid-candidate-subcheck-row');
  const range=row.sourceRange,parsed=/^\s+[-*+]\s+\[([ xX])\]\s+(.+)$/u.exec(row.rawText);
  if(!parsed||parsed[2].trim()!==check.title||(parsed[1].toLowerCase()==='x')!==check.sourceChecked||candidate.rawText.slice(range.startOffset,range.endOffset)!==row.rawText||row.sourceRowId!==stableAuthoringId('source-row',documentId,candidate.parseResult.fixtureVersion,candidate.parseResult.parserVersion,range.startOffset,range.endOffset,row.rawText)||check.subcheckId!==stableAuthoringId('authoring-subcheck',documentId,item.itemId,row.sourceRowId))throw Error('candidate-subcheck-facts-mismatch');
 }
}

export function needsNativeSourceSubcheckStage(document:TextAuthoringDocument,candidate:AuthoringSourceUpdateCandidate,prior?:NativeCreatorSourceSubchecks):boolean {
 return !!prior||matches(document,candidate).some(m=>!same(checks(document.parseResult.canonical.items.find(i=>i.itemId===m.activeItemId)!),checks(candidate.parseResult.canonical.items.find(i=>i.itemId===m.incomingItemId)!)));
}

/** Program stage v2 only. Align the separately reviewed field on a throwaway
 * guard probe; never edit the candidate, actual working state or old journal. */
export function normalizeNativeSourceSubcheckProbe(document:TextAuthoringDocument,candidate:AuthoringSourceUpdateCandidate):TextAuthoringDocument {
 assertExactChecks(document);assertExactChecks(candidate);assertCandidateCheckFacts(document.documentId,candidate);
 const next=copy(document);
 for(const m of matches(document,candidate)){
  const active=next.parseResult.canonical.items.find(i=>i.itemId===m.activeItemId)!,incoming=candidate.parseResult.canonical.items.find(i=>i.itemId===m.incomingItemId)!;
  if(incoming.subchecks)active.subchecks=copy(incoming.subchecks);else delete active.subchecks;
 }
 return next;
}

function sourceLists(document:TextAuthoringDocument,original:TextAuthoringDocument,prior?:NativeCreatorSourceSubchecks):NativeCreatorSourceSubchecks['sourceLists']{
 if(prior)return copy(prior.sourceLists);
 const sid=document.sourceState?.active.snapshotId;if(!sid)throw Error('missing-subcheck-source-snapshot');
 const captured=[...document.revisionHistory].reverse().find(r=>r.before?.sourceState&&r.before.sourceState.status!=='current'&&r.before.sourceState.incoming.snapshot.snapshotId===sid&&r.operations.some(o=>o.type==='apply_source_update'))?.before?.sourceState;
 const source=captured&&captured.status!=='current'?captured.incoming.parseResult:original.sourceState?.active.snapshotId===sid?original.parseResult:null;
 if(!source)throw Error('missing-exact-subcheck-source');
 assertExactChecks({parseResult:source});
 return source.canonical.items.map(i=>({itemId:i.itemId,sourceSnapshotId:sid,checks:copy(checks(i))}));
}

export function stageNativeSourceSubchecks(document:TextAuthoringDocument,candidate:AuthoringSourceUpdateCandidate,at:string,original:TextAuthoringDocument,prior?:NativeCreatorSourceSubchecks,recurrences?:NativeCreatorSourceRecurrences){
 const normalized=normalizeNativeSourceSubcheckProbe(document,candidate);
 const recurring=needsNativeSourceRecurrenceStage(document,candidate,recurrences)?stageNativeSourceRecurrences(normalized,candidate,at,original,recurrences):null;
 const result=recurring?.document??applyAuthoringOperation(normalized,{type:'stage_source_update',candidate},{actorLane:'creator',now:at});
 const staged=result.sourceState;if(!staged||staged.status==='current')return null;
 const lists=sourceLists(document,original,prior),changes:NativeCreatorSubcheckChange[]=[];
 for(const m of staged.incoming.matches){
  const old=lists.find(row=>row.itemId===m.activeItemId),working=document.parseResult.canonical.items.find(i=>i.itemId===m.activeItemId)!,incoming=staged.incoming.parseResult.canonical.items.find(i=>i.itemId===m.incomingItemId)!;
  if(!old)throw Error('missing-exact-subcheck-list');
  const workingValue=checks(working),incomingValue=checks(incoming);
  if(same(old.checks,incomingValue)&&same(workingValue,incomingValue))continue;
  changes.push({kind:'changed',field:'subchecks',changeId:stableAuthoringId('program-source-subchecks',staged.active.snapshotId,staged.incoming.snapshot.snapshotId,m.activeItemId,m.incomingItemId),activeItemId:m.activeItemId,incomingItemId:m.incomingItemId,oldSourceValue:copy(old.checks),userValue:copy(workingValue),incomingSourceValue:copy(incomingValue),workingFingerprint:fingerprint(working),userOwner:'creator',state:'open'});
 }
 result.parseResult=copy(document.parseResult);if(result.revision.before)result.revision.before.parseResult=copy(document.parseResult);
 result.revisionHistory[result.revisionHistory.length-1]=copy(result.revision);refreshNativeRecurrenceDerived(result);
 return{document:JSON.parse(JSON.stringify(result)) as TextAuthoringDocument,sourceSubchecks:{version:1,sourceLists:lists,pending:{candidateSnapshotId:staged.incoming.snapshot.snapshotId,changes}} as NativeCreatorSourceSubchecks,...(recurring?{sourceRecurrences:recurring.sourceRecurrences}:recurrences?{sourceRecurrences:copy(recurrences)}:{})};
}

export function decideNativeSourceSubchecks(prior:NativeCreatorSourceSubchecks,input:NativeCreatorSourceDecision,at:string):NativeCreatorSourceSubchecks|null {
 const next=copy(prior),change=next.pending?.changes.find(c=>c.changeId===input.changeId);if(!change)return null;
 if(input.decisionVersion!==1||!['keep_working','use_incoming'].includes(input.decision))throw Error('invalid-subcheck-decision');
 change.state='resolved';change.resolution=input.decision==='keep_working'?'keep_user':'use_incoming';change.actorLane='creator';change.decidedAt=at;return next;
}

/** The pinned apply clears a schedule override but leaves its same-lane
 * property rows. For v2's validated explicit incoming decision, clear only
 * those old working schedule properties. A separate recurrence choice is
 * applied afterwards and may deliberately restore its genuine rule rows. */
export function clearAcceptedSubcheckSessionScheduleProperties(before:TextAuthoringDocument,result:TextAuthoringDocument):TextAuthoringDocument {
 const state=before.sourceState;if(!state||state.status==='current')throw Error('missing-staged-subcheck-session');
 const next=copy(result),keys=new Set(['date','relative_date','time','timezone','duration','repeat']);
 for(const c of state.changes){if(c.kind!=='changed'||c.field!=='schedule'||c.resolution!=='use_incoming'||!c.userOwner)continue;
  const item=next.parseResult.canonical.items.find(i=>i.itemId===c.incomingItemId);if(!item)throw Error('missing-accepted-schedule');
  item.properties=item.properties.filter(p=>p.owner!==c.userOwner||!keys.has(p.key));
 }
 return next;
}

export function applyNativeSourceSubcheckResult(before:TextAuthoringDocument,result:TextAuthoringDocument,prior:NativeCreatorSourceSubchecks){
 const staged=before.sourceState,pending=prior.pending;
 if(!staged||staged.status==='current'||!pending||pending.candidateSnapshotId!==staged.incoming.snapshot.snapshotId||pending.changes.some(c=>c.state!=='resolved'||!c.resolution||c.actorLane!=='creator'||!c.decidedAt))throw Error('unresolved-subchecks');
 assertExactChecks(before);assertExactChecks(staged.incoming);
 for(const c of pending.changes){
  const working=before.parseResult.canonical.items.find(i=>i.itemId===c.activeItemId),incoming=staged.incoming.parseResult.canonical.items.find(i=>i.itemId===c.incomingItemId),old=prior.sourceLists.find(row=>row.itemId===c.activeItemId);
  if(!working||!incoming||!old||fingerprint(working)!==c.workingFingerprint||!same(checks(working),c.userValue)||!same(checks(incoming),c.incomingSourceValue)||!same(old.checks,c.oldSourceValue))throw Error('stale-subcheck-comparison');
 }
 const next=copy(result),lists:NativeCreatorSourceSubchecks['sourceLists']=[],rows=new Set(next.parseResult.canonical.sourceRows.map(r=>r.sourceRowId));
 for(const item of next.parseResult.canonical.items){
  const incoming=staged.incoming.parseResult.canonical.items.find(i=>i.itemId===item.itemId),match=staged.incoming.matches.find(m=>m.incomingItemId===item.itemId),old=prior.sourceLists.find(row=>row.itemId===(match?.activeItemId??item.itemId)),change=pending.changes.find(c=>c.incomingItemId===item.itemId);
  if(!incoming){if(!old)throw Error('missing-retained-subcheck-list');lists.push(copy(old));continue;}
  lists.push({itemId:item.itemId,sourceSnapshotId:staged.incoming.snapshot.snapshotId,checks:copy(checks(incoming))});
  if(change?.resolution==='keep_user'){
   const working=before.parseResult.canonical.items.find(i=>i.itemId===change.activeItemId);if(!working)throw Error('missing-working-subchecks');
   if(working.subchecks)item.subchecks=copy(working.subchecks);else delete item.subchecks;
   const retained=new Set((working.subchecks??[]).flatMap(c=>c.sourceRowIds));item.sourceRowIds=[...new Set([...item.sourceRowIds,...retained])];
   for(const row of before.parseResult.canonical.sourceRows)if(retained.has(row.sourceRowId)&&!rows.has(row.sourceRowId)){next.parseResult.canonical.sourceRows.push({...copy(row),state:'tombstone',sourceSnapshotId:row.sourceSnapshotId??staged.active.snapshotId});rows.add(row.sourceRowId);}
  }
 }
 // Other explicitly retained native fields can also reference previous rows.
 // Carry their exact evidence, never create a substitute row from current text.
 const previousRows=new Map(before.parseResult.canonical.sourceRows.map(row=>[row.sourceRowId,row])),previousSnapshotId=staged.active.snapshotId;
 function retainReferences(value:unknown){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){for(const entry of value)retainReferences(entry);return;}
  for(const [key,child] of Object.entries(value)){
   if(key==='sourceRows')continue;
   if(key==='sourceRowIds'&&Array.isArray(child))for(const id of child){if(typeof id!=='string')throw Error('invalid-retained-source-reference');if(rows.has(id))continue;const source=previousRows.get(id);if(!source)throw Error('missing-retained-source-row');next.parseResult.canonical.sourceRows.push({...copy(source),state:'tombstone',sourceSnapshotId:source.sourceSnapshotId??previousSnapshotId});rows.add(id);}
   else retainReferences(child);
  }
 }
 retainReferences(next.parseResult.canonical);assertExactChecks(next);
 if(next.revision.before){next.revision.before.parseResult=copy(before.parseResult);next.revision.before.sourceState=copy(before.sourceState);}next.revisionHistory[next.revisionHistory.length-1]=copy(next.revision);
 return{document:refreshNativeRecurrenceDerived(next),sourceSubchecks:{version:1,sourceLists:lists} as NativeCreatorSourceSubchecks};
}

export function updateNativeSourceSubchecks(prior:NativeCreatorSourceSubchecks|undefined,payload:NativeCreatorActionPayload,undo?:NativeCreatorSourceSubchecks):NativeCreatorSourceSubchecks|undefined {
 if(payload.kind==='restore')return undefined;
 if(payload.kind==='operation'&&payload.operation.type==='undo')return copy(undo);
 if(!prior)return undefined;const next=copy(prior);
 if(payload.kind==='operation'&&payload.operation.type==='reject_source_update')delete next.pending;
 return next;
}
