import {resolveAuthoringSourceUpdateChange} from './native-creator-vendor/text-authoring/source-update';
import type {TextAuthoringDocument,AuthoringSourceUpdateResolution} from './native-creator-vendor/text-authoring/types';
import type {NativeCreatorSourceDecision} from './native-creator-document-contract';

/** Faithful D2 source-update-service.ts:459-519 adaptation.
 * Original SHA256 472B2E39FF416BAF8CEFEBCF92A62B3F1918FEB84EAA7EAA611FD18D87C87754.
 * No caller supplied replacement value: the explicit keep marker derives only
 * from this exact staged change's old source value. No source writer/import. */
export function replayNativeSourceDecision(document:TextAuthoringDocument,input:NativeCreatorSourceDecision,at:string):TextAuthoringDocument|null{
 if(input.decisionVersion!==1||!['keep_working','use_incoming'].includes(input.decision)||!input.changeId)return null;
 const next=structuredClone(document),state=next.sourceState;if(!state||state.status==='current')return null;
 const change=state.changes.find(row=>row.changeId===input.changeId);if(!change)return null;
 if(change.kind==='changed'&&input.decision==='keep_working'&&change.userValue===undefined){change.userValue=change.oldSourceValue===undefined?null:structuredClone(change.oldSourceValue);change.userOwner='creator';}
 const resolution:AuthoringSourceUpdateResolution=change.kind==='changed'?(input.decision==='keep_working'?'keep_user':'use_incoming'):change.kind==='added'?(input.decision==='keep_working'?'exclude_added':'include_added'):(input.decision==='keep_working'?'keep_previous':'remove_removed');
 try{resolveAuthoringSourceUpdateChange(next,input.changeId,resolution,'creator',at);return JSON.parse(JSON.stringify(next));}catch{return null;}
}
