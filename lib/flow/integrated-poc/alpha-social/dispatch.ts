import { programClone, programFailure, programResult, type ProgramData, type ProgramPrivateSpace, type ProgramPublicRepository, type ProgramTransition } from '../contract';
import { programIdentifier, validateProgramData } from '../program-data';
import { programSame } from '../controller';
import * as P from '../private-space';
import { saveProgramPublicationDraft, publishProgramDocument, compareProgramPublication, resolveProgramPublicationComparison, resolveProgramPrivatePublicationDraft, archiveProgramPublication } from '../publication-editor';
import { inspectProgramPublicationSource, applyProgramPublicationSource } from '../publication-ordinary-source';
import { saveProgramParticipationDraft, discardProgramParticipationDraft, submitProgramParticipation } from '../participation-editor';
import { saveProgramProposalReviewDraft, discardProgramProposalReviewDraft, submitProgramProposalReviewDraft } from '../review-drafts';
import { submitProgramCopyProposal } from '../copy-proposal';
import { deleteProgramPost, deleteProgramReply, toggleProgramReaction } from '../community';
import { isAlphaSocialIntent, type AlphaSocialIntent } from './contract';

export function alphaSocialAllowedFields(intent:AlphaSocialIntent):{private:readonly (keyof ProgramPrivateSpace)[];public:readonly (keyof ProgramPublicRepository)[]} {
 switch(intent.type){
  case 'publication-save':case 'publication-discard':case 'publication-resolve':case 'publication-source':case 'publication-private-resolve':return {private:['publicationDrafts'],public:[]};
  case 'publication-submit':return {private:['publicationDrafts','publications'],public:['flows','versions']};
  case 'publication-archive':return {private:[],public:['flows']};
  case 'participation-save':case 'participation-discard':return {private:['participationDrafts'],public:[]};
  case 'participation-submit':return {private:['participationDrafts'],public:[intent.draft.kind==='reply'?'replies':'posts']};
  case 'review-save':case 'review-discard':return {private:['proposalReviewDrafts'],public:[]};
  case 'review-submit':return {private:['proposalReviewDrafts'],public:intent.decision==='accept'?['proposals','flows','versions']:['proposals']};
  case 'proposal-create':return {private:[],public:['proposals']};
  case 'post-delete':return {private:[],public:['posts','reactions']};
  case 'reply-delete':return {private:[],public:['replies','reactions']};
  case 'reaction-set':return {private:[],public:['reactions']};
  case 'copy-import':return {private:['text','copies','archivedDocumentIds'],public:[]};
  case 'copy-kind':return {private:['text','copies','retentionDocuments','archivedDocumentIds'],public:[]};
  case 'copy-update':case 'copy-resolve':return {private:['text','copies','position'],public:[]};
  case 'copy-anchor':case 'copy-inclusion':case 'copy-series-link':case 'copy-series-unlink':return {private:['text','copies'],public:[]};
  case 'copy-series-start':return {private:['copies'],public:[]};
 }
}
/** The server supplies actor/request identity and current state. No client callback,
 * aggregate replacement, timestamp authority, or public snapshot Undo is accepted. */
export function executeAlphaSocialIntent(data:ProgramData,actorId:string,intent:AlphaSocialIntent,requestId:string,now=new Date().toISOString()):ProgramTransition<string>{
 if(!isAlphaSocialIntent(intent)||!programIdentifier(requestId)||!validateProgramData(data))return programFailure(data,'invalid');
 if(data.activeActorId!==actorId||!Object.hasOwn(data.spaces,actorId))return programFailure(data,'forbidden');
 const base={actorId,requestId,expectedSpace:data.spaces[actorId]};
 const run=():ProgramTransition<string>=>{
  switch(intent.type){
   case 'publication-save':return saveProgramPublicationDraft(data,actorId,intent.draft,intent.expected);
   case 'publication-submit':return publishProgramDocument(data,actorId,intent.draft,now);
   case 'publication-discard':{
    const stored=data.spaces[actorId].publicationDrafts.find(x=>x.id===intent.draftId);
    if(!programSame(stored??null,intent.expected))return programFailure(data,'conflict');
    const next=programClone(data);next.spaces[actorId].publicationDrafts=next.spaces[actorId].publicationDrafts.filter(x=>x.id!==intent.draftId);return programResult(data,next,intent.draftId);
   }
   case 'publication-resolve':{const comparison=compareProgramPublication(data,actorId,intent.draft);return comparison&&comparison.latestVersionId===intent.expectedVersionId?resolveProgramPublicationComparison(data,actorId,intent.draft,comparison,intent.choices,now):programFailure(data,'conflict');}
   case 'publication-private-resolve':return resolveProgramPrivatePublicationDraft(data,actorId,intent.draft,intent.expected,intent.choice);
   case 'publication-source':{const inspected=inspectProgramPublicationSource(data,actorId,intent.draft,intent.itemId);if(!inspected.ok)return programFailure(data,inspected.reason);const applied=applyProgramPublicationSource(data,actorId,intent.draft,inspected.review,intent.fields,now);return applied.ok?saveProgramPublicationDraft(data,actorId,applied.draft,intent.expected):programFailure(data,applied.reason);}
   case 'publication-archive':return archiveProgramPublication(data,actorId,intent.documentId,intent.flowId,intent.expectedVersionId);
   case 'copy-import':return P.importProgramPublicVersion(data,{...intent,...base});
   case 'copy-anchor':return P.setProgramCopyAnchor(data,{...intent,...base});
   case 'copy-inclusion':return P.setProgramCopyInclusion(data,{...intent,...base});
   case 'copy-series-start':return P.setProgramCopySeriesStart(data,{...intent,...base});
   case 'copy-series-link':return P.linkProgramCopySeries(data,{...intent,...base});
   case 'copy-series-unlink':return P.unlinkProgramCopySeries(data,{...intent,...base});
   case 'copy-update':return P.applyProgramCopyVersion(data,{...intent,...base});
   case 'copy-kind':{const preview=P.previewProgramCopyKindChange(data,{...intent,actorId});return preview.ok?P.applyProgramCopyKindChange(data,{...base,confirmed:true,at:now,preview:preview.result}):programFailure(data,preview.reason);}
   case 'copy-resolve':{
    const common={...base,copyId:intent.copyId,versionId:intent.versionId,expectedBaseVersionId:intent.expectedBaseVersionId,itemIds:[intent.itemId]};
    if(intent.resolution==='schedule'){const p=P.previewProgramCopyScheduleResolution(data,{...intent,actorId});return p.ok?P.applyProgramCopyVersion(data,{...common,fields:['schedule'],scheduleResolution:{confirmed:true,at:now,preview:p.result}}):programFailure(data,p.reason);}
    if(intent.resolution==='subchecks'){const p=P.previewProgramCopyCheckResolution(data,{...intent,actorId});return p.ok?P.applyProgramCopyVersion(data,{...common,fields:['subchecks'],checkResolution:{confirmed:true,at:now,preview:p.result,choices:intent.choices!}}):programFailure(data,p.reason);}
    const p=P.previewProgramCopyFieldResolution(data,{...intent,actorId,field:intent.resolution});return p.ok?P.applyProgramCopyVersion(data,{...common,fields:[intent.resolution],fieldResolution:{confirmed:true,at:now,preview:p.result}}):programFailure(data,p.reason);
   }
   case 'proposal-create':{
    const item=data.public.versions.find(v=>v.id===intent.baseVersionId&&v.flowId===intent.flowId)?.items.find(x=>x.id===intent.itemId);
    return item?submitProgramCopyProposal(data,{requestId,reason:intent.reason,patch:intent.patch,context:{actorId,copyId:intent.copyId,flowId:intent.flowId,baseVersionId:intent.baseVersionId,item}},now):programFailure(data,'missing');
   }
   case 'review-save':return saveProgramProposalReviewDraft(data,{...intent,actorId});
   case 'review-discard':return discardProgramProposalReviewDraft(data,{...intent,actorId});
   case 'review-submit':return submitProgramProposalReviewDraft(data,{...intent,actorId},now);
   case 'participation-save':return saveProgramParticipationDraft(data,actorId,intent.draft,{expected:intent.expected});
   case 'participation-discard':return discardProgramParticipationDraft(data,actorId,intent.draftId,{expected:intent.expected});
   case 'participation-submit':return submitProgramParticipation(data,actorId,intent.draft,now,{expected:intent.expected});
   case 'post-delete':return deleteProgramPost(data,actorId,intent.postId,now);
   case 'reply-delete':return deleteProgramReply(data,actorId,intent.replyId,now);
   case 'reaction-set':{
    const postId=intent.targetKind==='post'?intent.targetId:data.public.replies.find(r=>r.id===intent.targetId&&!r.deleted)?.postId;
    if(!postId||!data.public.posts.some(p=>p.id===postId&&!p.deleted))return programFailure(data,'missing');
    const current=data.public.reactions.some(r=>r.actorId===actorId&&r.targetKind===intent.targetKind&&r.targetId===intent.targetId);
    if(current===intent.desired)return {ok:true,data,changed:false,result:intent.targetId};
    return toggleProgramReaction(data,actorId,intent.targetKind,intent.targetId);
   }
  }
 };
 try{
  const result=run();if(!result.ok)return result;
  if(!validateProgramData(result.data))return programFailure(data,'invalid');
  const allowed=alphaSocialAllowedFields(intent),guard=programClone(result.data);
  for(const field of allowed.private){if(Object.hasOwn(data.spaces[actorId],field))Object.assign(guard.spaces[actorId],{[field]:data.spaces[actorId][field]});else delete guard.spaces[actorId][field];}
  for(const field of allowed.public)guard.public[field]=data.public[field] as never;
  if(!programSame(result.data.receipts.slice(0,data.receipts.length),data.receipts)||result.data.receipts.slice(data.receipts.length).some(r=>r.actorId!==actorId))return programFailure(data,'forbidden');
  guard.receipts=data.receipts;
  if(!programSame(guard,data))return programFailure(data,'forbidden');
  // Account wire/recovery canonicalizes property order. A draft with identical
  // meaning must not become a write merely because its keys were inserted anew.
  if(programSame(result.data,data))return {ok:true,data,changed:false,result:result.result};
  return result;
 }catch{return programFailure(data,'invalid');}
}
