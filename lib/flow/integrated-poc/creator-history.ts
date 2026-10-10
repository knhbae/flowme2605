import { programClone, programFailure, programId, programResult, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from './contract';
import { programSame } from './controller';
import { validateProgramData, programIdentifier } from './program-data';
import { createProgramCreatorWorkspace, creatorWorkingFromRecord, setProgramCreatorWorking, applyProgramCreatorAction } from './creator-workspace';
import { decodeNativeCreatorHistory } from './creator-history-codec';
import type { ProgramCreatorSavedRevision } from './creator-history-contract';
import { transitionPersonalWorkspacePocCreatorDraftLibrary } from '../personal-workspace-poc-creator-drafts';
import { fingerprintPersonalWorkspacePocAuthoringSource as fingerprint } from '../personal-workspace-poc-authoring';
import { captureProgramCreatorSavedRevision } from './creator-history-snapshot';
import { createNativeCreatorDocumentOwner, restoreNativeCreatorDocument, readNativeCreatorSavedDocument } from './native-creator-document';
import type { NativeCreatorDocumentOwner } from './native-creator-document-contract';

const stamp=(s:string)=>Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;
const dirty=(data:ProgramData,actorId:string)=>{const w=data.spaces[actorId]?.creatorWorkspace;return !!w?.working&&!programSame(w.working,creatorWorkingFromRecord(w,w.working.draftId));};
const fingerprintRequest=(v:unknown)=>fingerprint(JSON.stringify(v));

export function importNativeCreatorSavedHistory(data:ProgramData,input:{actorId:string;requestId:string;draftId:string;expectedSpace:ProgramPrivateSpace;expectedRaw:string},actualRaw:string|null,now:string):ProgramTransition<string>{
  if(!validateProgramData(data)||!stamp(now)||!programIdentifier(input.requestId))return programFailure(data,'invalid');
  if(input.actorId!=='local-user'||data.activeActorId!==input.actorId)return programFailure(data,'forbidden');
  const decoded=decodeNativeCreatorHistory(actualRaw);
  if(decoded.kind!=='ready'||actualRaw!==input.expectedRaw)return programFailure(data,'conflict');
  const source=decoded.records.find(r=>r.draftId===input.draftId);
  if(!source)return programFailure(data,'missing');
  const fp=fingerprintRequest({draftId:input.draftId,raw:input.expectedRaw}),prior=data.receipts.find(r=>r.actorId===input.actorId&&r.id===input.requestId);
  if(prior)return prior.kind==='creator-history-import'&&prior.fingerprint===fp&&data.spaces[input.actorId].creatorWorkspace?.library.records[prior.resultId]
    ?programResult(data,data,prior.resultId):programFailure(data,'duplicate-request');
  if(!programSame(data.spaces[input.actorId],input.expectedSpace)||dirty(data,input.actorId))return programFailure(data,'conflict');
  if(!source.currentRaw.trim())return programFailure(data,'unresolved');
  const old=data.spaces[input.actorId].creatorWorkspace;
  const existing=Object.entries(old?.savedHistory?.drafts??{}).find(([,rows])=>rows.some(r=>r.kind==='text-authoring-v1'&&r.origin.draftId===source.draftId));
  if(existing)return programSame(existing[1].filter(r=>r.kind==='text-authoring-v1'),source.history)?programResult(data,data,existing[0]):programFailure(data,'conflict');
  if(data.receipts.length>=2000)return programFailure(data,'limit');
  const next=programClone(data),space=next.spaces[input.actorId];space.creatorWorkspace??=createProgramCreatorWorkspace(now);
  const own=space.creatorWorkspace,draftId=programId('creator');
  const transition=transitionPersonalWorkspacePocCreatorDraftLibrary(own.library,{type:'save',draftId,title:source.title,rawText:source.currentRaw,sourceFingerprint:fingerprint(source.currentRaw),expectedLibraryRevision:own.library.revision,now});
  if(!transition.changed)return programFailure(data,'invalid');
  own.library=transition.library;own.savedHistory??={version:1,drafts:{}};own.savedHistory.drafts[draftId]=programClone(source.history);
  captureProgramCreatorSavedRevision(own,own.library.records[draftId]);own.working=creatorWorkingFromRecord(own,draftId);
  next.receipts.push({actorId:input.actorId,id:input.requestId,kind:'creator-history-import',fingerprint:fp,resultId:draftId});
  return validateProgramData(next)?programResult(data,next,draftId):programFailure(data,'invalid');
}

export type CreatorHistoryPreview={mode:'raw-only'|'full-document';draftId:string;entry:ProgramCreatorSavedRevision;expectedSpace:ProgramPrivateSpace;expectedRaw:string|null;currentTitle:string;currentRaw:string};
export function previewProgramCreatorSavedRestore(data:ProgramData,actorId:string,draftId:string,revisionId:string,nativeRaw:string|null):{ok:true;value:CreatorHistoryPreview}|{ok:false;reason:string}{
  if(!validateProgramData(data)||data.activeActorId!==actorId)return{ok:false,reason:'invalid'};
  const space=data.spaces[actorId],own=space?.creatorWorkspace,record=own?.library.records[draftId],entry=own?.savedHistory?.drafts[draftId]?.find(r=>r.id===revisionId);
  if(!record||!entry)return{ok:false,reason:'missing'};
  if(dirty(data,actorId))return{ok:false,reason:'unsaved-working'};
  if(record.status!=='active')return{ok:false,reason:'archived'};
  if(!entry.rawText.trim())return{ok:false,reason:'empty-source'};
  if(entry.kind==='text-authoring-v1'){
    const read=decodeNativeCreatorHistory(nativeRaw);
    const exact=read.kind==='ready'?read.records.find(r=>r.draftId===entry.origin.draftId)?.history.find(r=>r.id===entry.id):undefined;
    if(!exact||!programSame(exact,entry))return{ok:false,reason:'source-history-changed'};
    if(!readNativeCreatorSavedDocument(entry.origin))return{ok:false,reason:'unsupported-native-document-codec'};
  }
  return{ok:true,value:{mode:entry.kind==='text-authoring-v1'||entry.context?.nativeDocument?'full-document':'raw-only',draftId,entry:programClone(entry),expectedSpace:programClone(space),expectedRaw:entry.kind==='text-authoring-v1'?nativeRaw:null,currentTitle:record.title,currentRaw:record.rawText}};
}
export function restoreProgramCreatorSavedRevision(data:ProgramData,input:{actorId:string;requestId:string;preview:CreatorHistoryPreview},actualRaw:string|null,now:string):ProgramTransition<string>{
  if(!validateProgramData(data)||!stamp(now)||!programIdentifier(input.requestId)||data.activeActorId!==input.actorId)return programFailure(data,'invalid');
  const p=input.preview,fp=fingerprintRequest({draftId:p.draftId,entry:p.entry}),prior=data.receipts.find(r=>r.actorId===input.actorId&&r.id===input.requestId);
  if(prior)return prior.kind==='creator-history-restore'&&prior.fingerprint===fp&&!!data.spaces[input.actorId].creatorWorkspace?.library.records[prior.resultId]?programResult(data,data,prior.resultId):programFailure(data,'duplicate-request');
  if(!programSame(data.spaces[input.actorId],p.expectedSpace)||p.expectedRaw!==actualRaw)return programFailure(data,'conflict');
  const checked=previewProgramCreatorSavedRestore(data,input.actorId,p.draftId,p.entry.id,actualRaw);
  if(!checked.ok||!programSame(checked.value,p))return programFailure(data,'conflict');
  const own=data.spaces[input.actorId].creatorWorkspace!,record=own.library.records[p.draftId];
  const structure=p.entry.kind==='program'?p.entry.context?.structure:undefined;
  const sourceIdentity=p.entry.kind==='program'?p.entry.sourceIdentity:undefined;
  let nativeDocument:NativeCreatorDocumentOwner|undefined=p.entry.kind==='program'?p.entry.context?.nativeDocument:undefined;
  const nativeSelection=p.entry.kind==='program'?p.entry.context?.nativeSelection:p.entry.origin;
  if(p.entry.kind==='text-authoring-v1'){
    const current=own.working?.nativeDocument;
    const restored=current?restoreNativeCreatorDocument(current,{expectedOwner:current,requestId:`${input.requestId}:native`,source:p.entry.origin},now)
      :createNativeCreatorDocumentOwner({id:p.draftId,source:p.entry.origin},now);
    if(!restored.ok)return programFailure(data,restored.reason==='history-capacity'||restored.reason==='document-capacity'?'limit':'unresolved');
    nativeDocument=restored.owner;
  }
  if(record.rawText===p.entry.rawText&&record.title===p.entry.title&&programSame(own.structureDrafts?.[p.draftId]?.structure??null,structure??null)
    &&programSame(own.sourceIdentities?.[p.draftId]?.identity??null,sourceIdentity??null)
    &&programSame(own.structureDrafts?.[p.draftId]?.nativeDocument??null,nativeDocument??null)
    &&programSame(own.structureDrafts?.[p.draftId]?.nativeSelection??null,nativeSelection??null))return programResult(data,data,p.draftId);
  if(data.receipts.length>=1999)return programFailure(data,'limit');
  const working={draftId:p.draftId,title:p.entry.title,rawText:p.entry.rawText,baseRecordRevision:record.recordRevision,
    ...(p.entry.kind==='program'&&p.entry.record.templateId?{templateId:p.entry.record.templateId}:{}),
    ...(structure?{structure:programClone(structure)}:{}),
    ...(nativeDocument?{nativeDocument:programClone(nativeDocument)}:{}),...(nativeSelection?{nativeSelection:programClone(nativeSelection)}:{}),
    ...(p.entry.kind==='program'&&p.entry.sourceIdentity?{sourceIdentity:programClone(p.entry.sourceIdentity)}:{})};
  const changed=setProgramCreatorWorking(data,{actorId:input.actorId,expectedWorking:own.working,working},now);
  if(!changed.ok)return changed;
  const saved=applyProgramCreatorAction(changed.data,{actorId:input.actorId,requestId:`${input.requestId}:save`,expectedStructure:working.structure??null,expectedNativeDocument:working.nativeDocument??null,expectedNativeSelection:working.nativeSelection??null,action:{type:'save',draftId:p.draftId,title:working.title,rawText:working.rawText,
    sourceFingerprint:fingerprint(working.rawText),expectedLibraryRevision:own.library.revision,expectedRecordRevision:record.recordRevision,...(working.templateId?{templateId:working.templateId}:{}),now}},now);
  if(!saved.ok)return programFailure(data,saved.reason);
  const next=programClone(saved.data);next.receipts.push({actorId:input.actorId,id:input.requestId,kind:'creator-history-restore',fingerprint:fp,resultId:p.draftId});
  return validateProgramData(next)?programResult(data,next,p.draftId):programFailure(data,'invalid');
}
