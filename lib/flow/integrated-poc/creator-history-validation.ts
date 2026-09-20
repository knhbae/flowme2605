import { isProgramCreatorDraftJson } from './creator-draft-provenance';
import { isPersonalWorkspacePocCreatorDraftRecord, isPersonalWorkspacePocCreatorDraftId, type PersonalWorkspacePocCreatorDraftRecord } from '../personal-workspace-poc-creator-drafts';
import { validCreatorSourceIdentity } from './creator-source-order';
import { validNativeCreatorHistoryRevision } from './creator-history-codec';
import { PROGRAM_CREATOR_HISTORY_LIMIT, NATIVE_CREATOR_HISTORY_LIMIT, type ProgramCreatorSavedHistory, type ProgramCreatorSavedRevision, type ProgramCreatorSavedContext } from './creator-history-contract';
import { validateProgramCreatorStructureSidecar } from './creator-structure-validation';
import { validateProgramCreatorNativeContext } from './creator-native-context';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validateProgramCreatorSavedContext(value:unknown,draftId:string,recordRevision:number):value is ProgramCreatorSavedContext {
  if(!obj(value)||!['version','recordRevision','contextRevision','savedAt'].every(k=>Object.hasOwn(value,k))||!Object.keys(value).every(k=>['version','recordRevision','contextRevision','savedAt','structure','copiedFromDraftId','nativeDocument','nativeSelection'].includes(k))
    ||value.version!==1||value.recordRevision!==recordRevision||!Number.isSafeInteger(value.contextRevision)||Number(value.contextRevision)<1||typeof value.savedAt!=='string'||!Number.isFinite(Date.parse(value.savedAt))||new Date(value.savedAt).toISOString()!==value.savedAt)return false;
  if(value.structure!==undefined&&!validateProgramCreatorStructureSidecar(value.structure,draftId))return false;
  if(!validateProgramCreatorNativeContext(value.nativeDocument,value.nativeSelection,draftId))return false;
  if(value.copiedFromDraftId!==undefined&&(!isPersonalWorkspacePocCreatorDraftId(value.copiedFromDraftId)||value.copiedFromDraftId===draftId))return false;
  return true;
}
export function validateProgramCreatorSavedHistory(value:unknown,records:Record<string,PersonalWorkspacePocCreatorDraftRecord>,contexts?:Record<string,ProgramCreatorSavedContext>):value is ProgramCreatorSavedHistory {
  try {
    if(!isProgramCreatorDraftJson(value)||!obj(value)||Object.keys(value).sort().join(',')!=='drafts,version'||value.version!==1||!obj(value.drafts))return false;
    const ids=new Set<string>();
    return Object.entries(value.drafts).every(([draftId,entries])=>!!records[draftId]&&Array.isArray(entries)&&entries.length<=PROGRAM_CREATOR_HISTORY_LIMIT+NATIVE_CREATOR_HISTORY_LIMIT
      &&entries.filter(e=>e.kind==='program').length<=PROGRAM_CREATOR_HISTORY_LIMIT&&entries.filter(e=>e.kind==='text-authoring-v1').length<=NATIVE_CREATOR_HISTORY_LIMIT&&entries.every((entry:ProgramCreatorSavedRevision)=>{
      if(!obj(entry)||typeof entry.id!=='string'||!entry.id.trim()||entry.id.length>3000||ids.has(entry.id)||typeof entry.savedAt!=='string'
        ||!Number.isFinite(Date.parse(entry.savedAt))||new Date(entry.savedAt).toISOString()!==entry.savedAt||typeof entry.rawText!=='string'||entry.rawText.length>100000
        ||typeof entry.title!=='string'||!entry.title.trim()||entry.title.length>200||/[\r\n]/u.test(entry.title))return false;
      ids.add(entry.id);
      if(entry.kind==='program')return Object.keys(entry).every(k=>['id','kind','savedAt','rawText','title','record','sourceIdentity','context'].includes(k))&&isPersonalWorkspacePocCreatorDraftRecord(entry.record)
        &&entry.record.draftId===draftId&&entry.record.rawText===entry.rawText&&entry.record.title===entry.title&&(entry.context===undefined?entry.record.updatedAt===entry.savedAt:validateProgramCreatorSavedContext(entry.context,draftId,entry.record.recordRevision)&&entry.context.savedAt===entry.savedAt
          &&!!contexts?.[draftId]&&entry.context.contextRevision<=contexts[draftId].contextRevision&&entry.id===`program:${draftId}:${entry.record.recordRevision}:context:${entry.context.contextRevision}`
          &&(entry.context.nativeDocument===undefined||entry.context.nativeDocument.document.rawText===entry.rawText))
        &&entry.record.recordRevision<=records[draftId].recordRevision&&(entry.sourceIdentity===undefined||validCreatorSourceIdentity(entry.sourceIdentity,entry.rawText));
      return entry.kind==='text-authoring-v1'&&Object.keys(entry).sort().join(',')==='id,kind,origin,rawText,savedAt,title'&&validNativeCreatorHistoryRevision(entry);
    }));
  }catch{return false;}
}
