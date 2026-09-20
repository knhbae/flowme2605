import {validateTextAuthoringDocument} from './native-creator-vendor/text-authoring/validation';
import {normalizeAuthoringText,stableAuthoringHash,stableAuthoringId} from './native-creator-vendor/text-authoring/identity';
import type {TextAuthoringDocument} from './native-creator-vendor/text-authoring/types';

/** Read-only, replaceable PoC boundary. These limits do not revise original D2 storage. */
export const LEGACY_CREATOR_RECOVERY_CONTRACT = {version:1,wire:10_000_000,document:2_000_000,raw:100_000,entries:200,depth:100,nodes:200_000} as const;
export const LEGACY_CREATOR_RECOVERY_KEY='flow:text-authoring:drafts:v1' as const;
type ObjectValue=Record<string,unknown>;
const object=(v:unknown):v is ObjectValue=>!!v&&typeof v==='object'&&!Array.isArray(v);
const shape=(v:unknown,required:string[],optional:string[]=[]):v is ObjectValue=>object(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const id=(v:unknown):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=1200&&!['__proto__','prototype','constructor'].includes(v);
const instant=(v:unknown):v is string=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const rawText=(v:unknown):v is string=>typeof v==='string'&&v.length<=LEGACY_CREATOR_RECOVERY_CONTRACT.raw;

/** Reject ambiguous duplicate JSON names before JSON.parse discards one version.
 * This scanner only establishes structure/key safety; JSON.parse checks syntax. */
function unambiguousJson(raw:string):boolean {
 let offset=0,nodes=0;
 const white=()=>{while(/\s/u.test(raw[offset]??'')&&offset<raw.length)offset++;};
 const string=()=>{const start=offset++;while(offset<raw.length){const char=raw[offset++];if(char==='\\')offset++;else if(char==='"')return JSON.parse(raw.slice(start,offset)) as string;}throw Error('string');};
 const value=(depth:number):void=>{
  if(depth>LEGACY_CREATOR_RECOVERY_CONTRACT.depth||++nodes>LEGACY_CREATOR_RECOVERY_CONTRACT.nodes)throw Error('limit');
  white();const char=raw[offset];
  if(char==='"'){string();return;}
  if(char==='{'||char==='['){offset++;white();const end=char==='{'?'}':']',seen=new Set<string>();if(raw[offset]===end){offset++;return;}
   while(offset<raw.length){if(char==='{'){white();if(raw[offset]!=='"')throw Error('key');const key=string();if(seen.has(key)||['__proto__','prototype','constructor'].includes(key))throw Error('key');seen.add(key);white();if(raw[offset++]!==':')throw Error('colon');}value(depth+1);white();if(raw[offset]===end){offset++;return;}if(raw[offset++]!==',')throw Error('comma');}throw Error('end');
  }
  const start=offset;while(offset<raw.length&&!/[\s,}\]]/u.test(raw[offset]))offset++;if(start===offset)throw Error('value');
 };
 try{value(0);white();return offset===raw.length;}catch{return false;}
}

function finiteJson(value:unknown):boolean {
 const pending=[value];while(pending.length){const next=pending.pop();if(typeof next==='number'&&!Number.isFinite(next))return false;if(next&&typeof next==='object')for(const child of Object.values(next))pending.push(child);}return true;
}

/** Same supported native document boundary, without importing the cyclic owner/controller graph. */
export function isLegacyRecoveryNativeDocument(value:unknown):value is TextAuthoringDocument {
 try {
  if(!shape(value,['schemaVersion','documentId','ownership','title','rawText','inputKinds','primaryInputKind','parseResult','revision','revisionHistory','lifecycleStatus','createdAt','updatedAt'],['sourceTitle','sourceUrl','reviewGates','sourceState','forkedFrom','features','uiState'])
   ||!['flowme-text-authoring-v1','flowme-text-authoring-v2'].includes(value.schemaVersion as string)||value.ownership!=='creator'||!id(value.documentId)||typeof value.title!=='string'||!rawText(value.rawText)
   ||!Array.isArray(value.inputKinds)||!Array.isArray(value.revisionHistory)||!instant(value.createdAt)||!instant(value.updatedAt)||!object(value.revision)||!id(value.revision.revisionId)
   ||!['draft','needs_review','previewed','archived'].includes(value.lifecycleStatus as string)||JSON.stringify(value).length>LEGACY_CREATOR_RECOVERY_CONTRACT.document)return false;
  const doc=value as TextAuthoringDocument;
  return Array.isArray(doc.parseResult.canonical.items)&&Array.isArray(doc.parseResult.canonical.sourceRows)&&validateTextAuthoringDocument(doc).valid;
 }catch{return false;}
}

export type LegacyCreatorRecoveryCandidate={
 contractVersion:1;storageKey:typeof LEGACY_CREATOR_RECOVERY_KEY;draftId:string;recoveryId:string;documentId:string;revisionId:string;recoveredAt:string;
 timestampSource:'recoveredAt'|'savedAt-alias';title:string;canonicalRawText:string;workingRawText:string;documentJson:string;recoveryJson:string;
 durableRecordJson:string|null;lastSavedAt:string|null;eligibility:'first-save-before'|'newer-than-saved'|'not-newer-than-saved';eligible:boolean;
 activeStage:'input'|'structure'|'result';focusTarget?:string;selectedItemId?:string;primaryArtifact?:string;selectionAvailable:boolean;
};
export type LegacyCreatorRecoveryIssue={draftId:string;reason:'invalid-entry'|'unsupported-entry'|'non-creator'};
export type LegacyCreatorRecoveryRead={kind:'ready';raw:string;candidates:LegacyCreatorRecoveryCandidate[];issues:LegacyCreatorRecoveryIssue[]}
 |{kind:'empty';raw:null}|{kind:'corrupt'|'unsupported'|'unavailable';raw:string|null};

function validService(value:unknown,entry:ObjectValue,doc:TextAuthoringDocument,recoveredAt:string):value is ObjectValue {
 if(!shape(value,['owner','recoveryId','draftId','recoveredAt','sourceSnapshot','workingSource'],['currentRevisionPair'])||value.owner!=='local_recovery'
  ||value.recoveryId!==entry.recoveryId||value.draftId!==entry.draftId||value.recoveredAt!==recoveredAt)return false;
 return validSourceWorking(value.sourceSnapshot,value.workingSource,value.currentRevisionPair,doc,entry.revisionId,recoveredAt);
}
function validSourceWorking(source:unknown,working:unknown,pair:unknown,doc:TextAuthoringDocument,revisionId:unknown,recoveredAt:string):boolean {
 if(!shape(source,['owner','snapshotId','rawText','contentFingerprint','capturedAt'],['sourceTitle','sourceUrl'])||source.owner!=='source_provenance'||!id(source.snapshotId)||!rawText(source.rawText)||!id(source.contentFingerprint)||!instant(source.capturedAt)||source.capturedAt>recoveredAt
  ||['sourceTitle','sourceUrl'].some(key=>source[key]!==undefined&&typeof source[key]!=='string')
  ||!shape(working,['owner','sourceSnapshotId','revisionId','revisionNumber','rawText','updatedAt'])||working.owner!=='creator_draft'||working.sourceSnapshotId!==source.snapshotId||!id(working.revisionId)||working.revisionId!==revisionId
  ||!Number.isSafeInteger(working.revisionNumber)||(working.revisionNumber as number)<1||!rawText(working.rawText)||!instant(working.updatedAt)||working.updatedAt>recoveredAt)return false;
 // The original may retain an immutable active-source fingerprint whose algorithm
 // is not the plain input hash. Only accept that exact native provenance tuple.
 const active=doc.sourceState?.active;
 const activeMatch=active&&active.snapshotId===source.snapshotId&&active.rawText===source.rawText&&active.contentFingerprint===source.contentFingerprint&&active.capturedAt===source.capturedAt;
 if(!activeMatch&&(source.contentFingerprint!==stableAuthoringHash(normalizeAuthoringText(source.rawText))||source.snapshotId!==stableAuthoringId('source-snapshot',doc.documentId,normalizeAuthoringText(source.rawText))))return false;
 if(pair!==undefined){
  if(!shape(pair,['workingSourceRevisionId','canonicalRevisionId','parserResultRevisionId','projectionRevisionId'])||!Object.values(pair).every(id)||working.rawText!==doc.rawText
   ||pair.workingSourceRevisionId!==working.revisionId||pair.parserResultRevisionId!==doc.parseResult.parseResultId)return false;
  const canonical=stableAuthoringId('canonical-revision',doc.documentId,working.revisionId,doc.parseResult.parseResultId);
  if(pair.canonicalRevisionId!==canonical||pair.projectionRevisionId!==stableAuthoringId('projection-revision',doc.documentId,working.revisionId,canonical))return false;
 }
 return true;
}

function validDurable(value:unknown,draftId:string,doc:TextAuthoringDocument):value is ObjectValue&{lastSavedAt:string} {
 if(!shape(value,['draftId','title','ownership','status','document','revisionId','createdAt','updatedAt','lastSavedAt','history'],['archivedAt','activeStage','focusTarget','selectedItemId','primaryArtifact','coherentRevisionPair','sourceSnapshot','workingSource','explicitSaveReceipt','readyReceipt'])
  ||value.draftId!==draftId||value.ownership!=='creator'||typeof value.title!=='string'||!['draft','needs_review','previewed','ready','archived'].includes(value.status as string)
  ||!instant(value.createdAt)||!instant(value.updatedAt)||!instant(value.lastSavedAt)||!isLegacyRecoveryNativeDocument(value.document)||value.document.documentId!==doc.documentId||value.revisionId!==value.document.revision.revisionId||!Array.isArray(value.history)||value.history.length>5)return false;
 if(value.archivedAt!==undefined&&!instant(value.archivedAt)||value.activeStage!==undefined&&!['input','structure','result'].includes(value.activeStage as string)
  ||['focusTarget','selectedItemId','primaryArtifact'].some(key=>value[key]!==undefined&&!id(value[key])))return false;
 const coherentFields=['coherentRevisionPair','sourceSnapshot','workingSource','explicitSaveReceipt'];
 if(coherentFields.some(key=>value[key]!==undefined)){
  const pair=value.coherentRevisionPair,working=value.workingSource,receipt=value.explicitSaveReceipt;
  if(!object(working)||!object(pair)||!validSourceWorking(value.sourceSnapshot,working,pair,value.document,working.revisionId,value.lastSavedAt)
   ||!shape(receipt,['owner','receiptId','draftId','savedAt','revisionPair'])||receipt.owner!=='creator_draft_persistence'||!id(receipt.receiptId)||receipt.draftId!==draftId||receipt.savedAt!==value.lastSavedAt
   ||!samePair(pair,receipt.revisionPair))return false;
 }
 if(value.readyReceipt!==undefined){
  const ready=value.readyReceipt,receipt=value.explicitSaveReceipt;
  if(!object(receipt)||!shape(ready,['owner','receiptId','draftId','markedAt','explicitSaveReceiptId','revisionPair','sideEffects'])||ready.owner!=='creator_workflow_seam'||!id(ready.receiptId)||ready.draftId!==draftId||!instant(ready.markedAt)
   ||ready.explicitSaveReceiptId!==receipt.receiptId||!samePair(ready.revisionPair,value.coherentRevisionPair)||!shape(ready.sideEffects,['publish','network','p35'])||Object.values(ready.sideEffects).some(count=>count!==0))return false;
 }
 const seen=new Set<string>();
 return value.history.every(entry=>{
  if(!shape(entry,['versionId','kind','savedAt','revisionId','document'])||!id(entry.versionId)||seen.has(entry.versionId)||!['saved','duplicated','archived','restored'].includes(entry.kind as string)||!instant(entry.savedAt)
   ||!isLegacyRecoveryNativeDocument(entry.document)||entry.document.documentId!==doc.documentId||entry.revisionId!==entry.document.revision.revisionId)return false;
  seen.add(entry.versionId);return true;
 });
}
function samePair(a:unknown,b:unknown):boolean {
 const keys=['workingSourceRevisionId','canonicalRevisionId','parserResultRevisionId','projectionRevisionId'];
 return shape(a,keys)&&shape(b,keys)&&keys.every(key=>a[key]===b[key]);
}

/** Original wire is retained exactly. JSON fields are losslessly serialized, not
 * claimed to retain original whitespace spelling (the full wire supplies that). */
export function decodeLegacyCreatorRecoveries(raw:string|null):LegacyCreatorRecoveryRead {
 if(raw===null)return{kind:'empty',raw};
 try {
  if(raw.length>LEGACY_CREATOR_RECOVERY_CONTRACT.wire)return{kind:'unsupported',raw};
  if(!unambiguousJson(raw))return{kind:'corrupt',raw};
  const root:unknown=JSON.parse(raw);
  if(!finiteJson(root))return{kind:'corrupt',raw};
  if(!object(root)||root.schemaVersion!==1)return{kind:'unsupported',raw};
  if(!shape(root,['schemaVersion','drafts','recoveries'])||!object(root.drafts)||!object(root.recoveries))return{kind:'corrupt',raw};
  if(Object.keys(root.drafts).length>LEGACY_CREATOR_RECOVERY_CONTRACT.entries||Object.keys(root.recoveries).length>LEGACY_CREATOR_RECOVERY_CONTRACT.entries)return{kind:'unsupported',raw};
  const candidates:LegacyCreatorRecoveryCandidate[]=[],issues:LegacyCreatorRecoveryIssue[]=[],identities=new Set<string>(),documents=new Set<string>();
  for(const [draftId,durable] of Object.entries(root.drafts)){
   if(!id(draftId)||!object(durable)||durable.draftId!==draftId||!object(durable.document)||!id(durable.document.documentId))return{kind:'corrupt',raw};
  }
  // Relationship ambiguity is global; don't select one of two conflicting owners.
  for(const [draftId,entry] of Object.entries(root.recoveries)){
   if(!id(draftId))return{kind:'corrupt',raw};
   if(object(entry)&&id(entry.recoveryId)){if(identities.has(entry.recoveryId)||entry.draftId!==draftId)return{kind:'corrupt',raw};identities.add(entry.recoveryId);}
   if(object(entry)&&object(entry.document)&&id(entry.document.documentId)){if(documents.has(entry.document.documentId))return{kind:'corrupt',raw};documents.add(entry.document.documentId);}
  }
  for(const [draftId,entry] of Object.entries(root.recoveries)){
   const invalid=(reason:LegacyCreatorRecoveryIssue['reason']='invalid-entry')=>issues.push({draftId,reason});
   if(!shape(entry,['recoveryId','draftId','document','revisionId','activeStage'],['recoveredAt','savedAt','serviceRecovery','focusTarget','selectedItemId','primaryArtifact'])||!id(entry.recoveryId)||entry.draftId!==draftId||!id(entry.revisionId)||!object(entry.document)){invalid();continue;}
   if(entry.document.ownership!=='creator'){invalid(['personal','suggestion'].includes(entry.document.ownership as string)?'non-creator':'invalid-entry');continue;}
   if(!['flowme-text-authoring-v1','flowme-text-authoring-v2'].includes(entry.document.schemaVersion as string)){invalid('unsupported-entry');continue;}
   const recoveredAt=entry.recoveredAt===undefined?entry.savedAt:entry.recoveredAt;
   if(!instant(recoveredAt)||(entry.savedAt!==undefined&&entry.savedAt!==recoveredAt)||!isLegacyRecoveryNativeDocument(entry.document)||entry.document.updatedAt>recoveredAt
    ||!['input','structure','result'].includes(entry.activeStage as string)||['focusTarget','selectedItemId','primaryArtifact'].some(key=>entry[key]!==undefined&&!id(entry[key]))){invalid();continue;}
   const doc=entry.document;
   if(entry.serviceRecovery!==undefined?!validService(entry.serviceRecovery,entry,doc,recoveredAt):entry.revisionId!==doc.revision.revisionId){invalid();continue;}
   const durable=root.drafts[draftId];
   if(durable!==undefined&&!validDurable(durable,draftId,doc))return{kind:'corrupt',raw};
   const lastSavedAt=durable===undefined?null:(durable as ObjectValue).lastSavedAt as string;
   const eligibility=lastSavedAt===null?'first-save-before':recoveredAt>lastSavedAt?'newer-than-saved':'not-newer-than-saved';
   const working=entry.serviceRecovery===undefined?doc.rawText:((entry.serviceRecovery as ObjectValue).workingSource as ObjectValue).rawText as string;
   candidates.push({contractVersion:1,storageKey:LEGACY_CREATOR_RECOVERY_KEY,draftId,recoveryId:entry.recoveryId,documentId:doc.documentId,revisionId:entry.revisionId,recoveredAt,timestampSource:entry.recoveredAt===undefined?'savedAt-alias':'recoveredAt',title:doc.title,
    canonicalRawText:doc.rawText,workingRawText:working,documentJson:JSON.stringify(doc),recoveryJson:JSON.stringify(entry),durableRecordJson:durable===undefined?null:JSON.stringify(durable),lastSavedAt,eligibility,eligible:eligibility!=='not-newer-than-saved',activeStage:entry.activeStage as LegacyCreatorRecoveryCandidate['activeStage'],
    ...(entry.focusTarget===undefined?{}:{focusTarget:entry.focusTarget as string}),...(entry.selectedItemId===undefined?{}:{selectedItemId:entry.selectedItemId as string}),...(entry.primaryArtifact===undefined?{}:{primaryArtifact:entry.primaryArtifact as string}),selectionAvailable:entry.selectedItemId!==undefined&&doc.parseResult.canonical.items.some(item=>item.itemId===entry.selectedItemId)});
  }
  candidates.sort((a,b)=>b.recoveredAt.localeCompare(a.recoveredAt)||a.draftId.localeCompare(b.draftId)||a.recoveryId.localeCompare(b.recoveryId));
  return{kind:'ready',raw,candidates,issues};
 }catch{return{kind:'corrupt',raw};}
}
export function readLegacyCreatorRecoveries(storage:Pick<Storage,'getItem'>):LegacyCreatorRecoveryRead {
 try{return decodeLegacyCreatorRecoveries(storage.getItem(LEGACY_CREATOR_RECOVERY_KEY));}catch{return{kind:'unavailable',raw:null};}
}
