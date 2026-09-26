import type { ProgramPublicationDraft, ProgramParticipationDraft, ProgramItemPatch, ProgramCopyField, ProgramCopyCheckChoice } from '../contract';
import type { ProgramProposalReviewDraft } from '../review-drafts';
import { PROGRAM_PUBLICATION_SOURCE_FIELDS, type ProgramPublicationSourceField } from '../publication-ordinary-source';
import { programIdentifier, programDate, programRecord, programShape, programString, validateProgramSchedule, validateProgramProposalChecks, validateProgramMedia } from '../program-data';
import { validateProgramPublicationRecurrenceDraft } from '../public-recurrence-contract';
import { validateProgramOrdinaryTimingDraft } from '../public-ordinary-time';
import { isProgramCreatorDraftJson } from '../creator-draft-provenance';

export const ALPHA_SOCIAL_COMMAND_SCHEMA = 'flowme-alpha-social-command/1' as const;
export type AlphaSocialIntent =
 | { type:'publication-save'; draft:ProgramPublicationDraft; expected:ProgramPublicationDraft|null }
 | { type:'publication-discard'; draftId:string; expected:ProgramPublicationDraft }
 | { type:'publication-submit'; draft:ProgramPublicationDraft }
 | { type:'publication-resolve'; draft:ProgramPublicationDraft; choices:Record<string,'draft'|'latest'>; expectedVersionId:string }
 | { type:'publication-private-resolve'; draft:ProgramPublicationDraft; expected:ProgramPublicationDraft|null; choice:'mine'|'stored' }
 | { type:'publication-source'; draft:ProgramPublicationDraft; expected:ProgramPublicationDraft|null; itemId:string; fields:ProgramPublicationSourceField[] }
 | { type:'publication-archive'; documentId:string; flowId:string; expectedVersionId:string }
 | { type:'copy-import'; versionId:string; itemIds:string[]; anchor:string|null; targetDocumentId?:string; recurrenceStarts?:Record<string,string|null> }
 | { type:'copy-anchor'; copyId:string; anchor:string|null }
 | { type:'copy-inclusion'; copyId:string; itemId:string; included:boolean }
 | { type:'copy-series-start'; copyId:string; itemId:string; start:string|null }
 | { type:'copy-series-link'; copyId:string; itemId:string; documentId:string }
 | { type:'copy-series-unlink'; copyId:string; documentId:string; lineId:string }
 | { type:'copy-update'; copyId:string; versionId:string; expectedBaseVersionId:string; itemIds:string[]; fields:ProgramCopyField[] }
 | { type:'copy-resolve'; copyId:string; versionId:string; expectedBaseVersionId:string; itemId:string; resolution:'schedule'|'subchecks'|'title'|'description'|'completionCriteria'|'sourceUrl'; choices?:Record<string,ProgramCopyCheckChoice> }
 | { type:'copy-kind'; copyId:string; versionId:string; itemId:string }
 | { type:'proposal-create'; copyId:string; flowId:string; baseVersionId:string; itemId:string; reason:string; patch:ProgramItemPatch }
 | { type:'review-save'; proposalId:string; draft:ProgramProposalReviewDraft; expected:ProgramProposalReviewDraft|null }
 | { type:'review-discard'; proposalId:string; expected:ProgramProposalReviewDraft|null }
 | { type:'review-submit'; proposalId:string; draft:ProgramProposalReviewDraft; decision:'hold'|'reject'|'accept'; expectedVersionId:string }
 | { type:'participation-save'; draft:ProgramParticipationDraft; expected:ProgramParticipationDraft|null }
 | { type:'participation-discard'; draftId:string; expected:ProgramParticipationDraft|null }
 | { type:'participation-submit'; draft:ProgramParticipationDraft; expected:ProgramParticipationDraft|null }
 | { type:'post-delete'; postId:string }
 | { type:'reply-delete'; replyId:string }
 | { type:'reaction-set'; targetKind:'post'|'reply'; targetId:string; desired:boolean };
export type AlphaSocialCommand = { schema:typeof ALPHA_SOCIAL_COMMAND_SCHEMA; kind:'social'; requestId:string; expectedRevision:number; expectedPublicRevision:number; intent:AlphaSocialIntent };
const ids=(v:unknown)=>Array.isArray(v)&&v.length<=1200&&v.every(programIdentifier)&&new Set(v).size===v.length;
const date=(v:unknown)=>v===null||programDate(v);
const choices=(v:unknown,values:string[])=>programRecord(v)&&Object.keys(v).length<=2000&&Object.entries(v).every(([k,x])=>k.length>0&&k.length<=1000&&values.includes(x as string));
const review=(v:unknown)=>programShape(v,['note','expectedProposalToken'])&&programString(v.note,10000)&&programString(v.expectedProposalToken,120000,true);
const publicationKeys=['id','documentId','requestId','flowId','expectedVersionId','sourceDocumentFingerprint','title','summary','category','situationsText','sourceKind','sourceLabel','sourceUrl','derivedFrom','rows','updatedAt'];
const participationKeys=['id','kind','title','body','topic','postId','flowId','versionId','itemId','media','parentReplyId','editTargetId','expectedUpdatedAt','expectedContent','requestId','evidencePostIds','cursor'];
const nullableId=(v:unknown)=>v===null||programIdentifier(v);
const stamp=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
// The wire validates complete JSON structure; dispatch additionally validates references.
function publication(v:unknown):boolean {
 if(!programShape(v,publicationKeys)||!programIdentifier(v.id)||!programIdentifier(v.documentId)||!programIdentifier(v.requestId)||!nullableId(v.flowId)||!nullableId(v.expectedVersionId)
 ||!programString(v.sourceDocumentFingerprint,1_000_000)||!programString(v.title,240)||!programString(v.summary)||!programString(v.category,120)||!programString(v.situationsText,3000)||!['user-text','simulated-example'].includes(v.sourceKind as string)||!programString(v.sourceLabel,500)||!programString(v.sourceUrl,3000)||!stamp(v.updatedAt)
 ||!(v.derivedFrom===null||programShape(v.derivedFrom,['flowId','versionId'])&&programIdentifier(v.derivedFrom.flowId)&&programIdentifier(v.derivedFrom.versionId))||!Array.isArray(v.rows)||v.rows.length>1200)return false;
 return v.rows.every(x=>programRecord(x)&&programShape(x,['rowId','origin','itemId','selected','title','description','completionCriteria','sourceUrl','scheduleKind','scheduleValue','subchecks',...['recurrence','timing','seriesSource'].filter(k=>Object.hasOwn(x,k))])
 &&nullableId(x.rowId)&&['task','note','previous-public','series'].includes(x.origin as string)&&programIdentifier(x.itemId)&&typeof x.selected==='boolean'&&programString(x.title,500)&&programString(x.description)&&programString(x.completionCriteria)&&programString(x.sourceUrl,3000)&&['undated','fixed','relative','recurring'].includes(x.scheduleKind as string)&&programString(x.scheduleValue,100)
 &&(x.scheduleKind!=='recurring'||Object.hasOwn(x,'recurrence'))&&(!Object.hasOwn(x,'recurrence')||validateProgramPublicationRecurrenceDraft(x.recurrence))&&(!Object.hasOwn(x,'timing')||validateProgramOrdinaryTimingDraft(x.timing))
 &&(x.origin!=='series'||Object.hasOwn(x,'seriesSource'))&&(!Object.hasOwn(x,'seriesSource')||programShape(x.seriesSource,['version','key','revisionId','fingerprint'])&&x.seriesSource.version===1&&programString(x.seriesSource.key,4000,true)&&programIdentifier(x.seriesSource.revisionId)&&programString(x.seriesSource.fingerprint,1_000_000,true))
 &&Array.isArray(x.subchecks)&&x.subchecks.length<=500&&x.subchecks.every(c=>programShape(c,['id','title'])&&programIdentifier(c.id)&&programString(c.title,500)));
}
function participation(v:unknown):boolean {return programShape(v,participationKeys)&&programIdentifier(v.id)&&programIdentifier(v.requestId)&&['experience','question','knowledge','reply'].includes(v.kind as string)&&programString(v.title,240)&&programString(v.body)&&programString(v.topic,120)&&['postId','flowId','versionId','itemId','parentReplyId','editTargetId'].every(k=>nullableId(v[k]))&&(v.expectedUpdatedAt===null||stamp(v.expectedUpdatedAt))&&(v.expectedContent===null||programString(v.expectedContent,12_000_000))&&Array.isArray(v.evidencePostIds)&&v.evidencePostIds.length<=50&&v.evidencePostIds.every(programIdentifier)&&new Set(v.evidencePostIds).size===v.evidencePostIds.length&&programShape(v.cursor,['start','end'])&&Number.isSafeInteger(v.cursor.start)&&Number.isSafeInteger(v.cursor.end)&&Number(v.cursor.start)>=0&&Number(v.cursor.end)>=Number(v.cursor.start)&&Array.isArray(v.media)&&v.media.length<=4&&v.media.every(validateProgramMedia);}
function patch(v:unknown):boolean { return programRecord(v)&&Object.keys(v).length>0&&Object.entries(v).every(([k,x])=>k==='schedule'?validateProgramSchedule(x):k==='subchecks'?validateProgramProposalChecks(x):['title','description','completionCriteria'].includes(k)&&programString(x,k==='title'?500:30000,k==='title')); }
export function isAlphaSocialIntent(v:unknown):v is AlphaSocialIntent {
 try {
  if(!isProgramCreatorDraftJson(v)||!programRecord(v))return false;
  const shape=(keys:string[],optional:string[]=[])=>['type',...keys].every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>['type',...keys,...optional].includes(k));
  const named=(...keys:string[])=>keys.every(k=>programIdentifier(v[k]));
  switch(v.type){
   case 'publication-save':return shape(['draft','expected'])&&publication(v.draft)&&(v.expected===null||publication(v.expected));
   case 'publication-submit':return shape(['draft'])&&publication(v.draft);
   case 'publication-discard':return shape(['draftId','expected'])&&named('draftId')&&publication(v.expected);
   case 'publication-resolve':return shape(['draft','choices','expectedVersionId'])&&publication(v.draft)&&choices(v.choices,['draft','latest'])&&named('expectedVersionId');
   case 'publication-private-resolve':return shape(['draft','expected','choice'])&&publication(v.draft)&&(v.expected===null||publication(v.expected))&&['mine','stored'].includes(v.choice as string);
   case 'publication-source':return shape(['draft','expected','itemId','fields'])&&publication(v.draft)&&(v.expected===null||publication(v.expected))&&named('itemId')&&Array.isArray(v.fields)&&v.fields.length>0&&new Set(v.fields).size===v.fields.length&&v.fields.every(f=>(PROGRAM_PUBLICATION_SOURCE_FIELDS as readonly unknown[]).includes(f));
   case 'publication-archive':return shape(['documentId','flowId','expectedVersionId'])&&named('documentId','flowId','expectedVersionId');
   case 'copy-import':return shape(['versionId','itemIds','anchor'],['targetDocumentId','recurrenceStarts'])&&named('versionId')&&ids(v.itemIds)&&date(v.anchor)&&(v.targetDocumentId===undefined||named('targetDocumentId'))&&(v.recurrenceStarts===undefined||programRecord(v.recurrenceStarts)&&Object.entries(v.recurrenceStarts).every(([k,x])=>programIdentifier(k)&&date(x)));
   case 'copy-anchor':return shape(['copyId','anchor'])&&named('copyId')&&date(v.anchor);
   case 'copy-inclusion':return shape(['copyId','itemId','included'])&&named('copyId','itemId')&&typeof v.included==='boolean';
   case 'copy-series-start':return shape(['copyId','itemId','start'])&&named('copyId','itemId')&&date(v.start);
   case 'copy-series-link':return shape(['copyId','itemId','documentId'])&&named('copyId','itemId','documentId');
   case 'copy-series-unlink':return shape(['copyId','documentId','lineId'])&&named('copyId','documentId','lineId');
   case 'copy-update':return shape(['copyId','versionId','expectedBaseVersionId','itemIds','fields'])&&named('copyId','versionId','expectedBaseVersionId')&&ids(v.itemIds)&&Array.isArray(v.fields)&&v.fields.length>0&&new Set(v.fields).size===v.fields.length&&v.fields.every(x=>['title','description','completionCriteria','sourceUrl','schedule','subchecks'].includes(x));
   case 'copy-resolve':return shape(['copyId','versionId','expectedBaseVersionId','itemId','resolution'],['choices'])&&named('copyId','versionId','expectedBaseVersionId','itemId')&&['schedule','subchecks','title','description','completionCriteria','sourceUrl'].includes(v.resolution as string)&&(v.resolution==='subchecks'?choices(v.choices,['keep-private','accept-source']):v.choices===undefined);
   case 'copy-kind':return shape(['copyId','versionId','itemId'])&&named('copyId','versionId','itemId');
   case 'proposal-create':return shape(['copyId','flowId','baseVersionId','itemId','reason','patch'])&&named('copyId','flowId','baseVersionId','itemId')&&programString(v.reason,10000,true)&&patch(v.patch);
   case 'review-save':return shape(['proposalId','draft','expected'])&&named('proposalId')&&review(v.draft)&&(v.expected===null||review(v.expected));
   case 'review-discard':return shape(['proposalId','expected'])&&named('proposalId')&&(v.expected===null||review(v.expected));
   case 'review-submit':return shape(['proposalId','draft','decision','expectedVersionId'])&&named('proposalId','expectedVersionId')&&review(v.draft)&&['hold','reject','accept'].includes(v.decision as string);
   case 'participation-save':case 'participation-submit':return shape(['draft','expected'])&&participation(v.draft)&&(v.expected===null||participation(v.expected));
   case 'participation-discard':return shape(['draftId','expected'])&&named('draftId')&&(v.expected===null||participation(v.expected));
   case 'post-delete':return shape(['postId'])&&named('postId');
   case 'reply-delete':return shape(['replyId'])&&named('replyId');
   case 'reaction-set':return shape(['targetKind','targetId','desired'])&&named('targetId')&&['post','reply'].includes(v.targetKind as string)&&typeof v.desired==='boolean';
   default:return false;
  }
 }catch{return false;}
}
export function isAlphaSocialCommand(v:unknown):v is AlphaSocialCommand {return programShape(v,['schema','kind','requestId','expectedRevision','expectedPublicRevision','intent'])&&v.schema===ALPHA_SOCIAL_COMMAND_SCHEMA&&v.kind==='social'&&programIdentifier(v.requestId)&&v.requestId.length<=160&&Number.isSafeInteger(v.expectedRevision)&&Number(v.expectedRevision)>=0&&Number.isSafeInteger(v.expectedPublicRevision)&&Number(v.expectedPublicRevision)>=0&&isAlphaSocialIntent(v.intent);}
