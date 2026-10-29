import {createV11Codec,canonical} from './codec.cjs';
import {PmCodecSession} from './src/pm-codec-session';
import {createProgramPmHost,type ProgramPmHostContext} from './app-host';
import {textWorkspaceModel as M,type TextWorkspaceState} from '../text-workspace';
import type {ProgramTextCommit} from '../program-text-draft';
import type {ProgramData} from '../contract';

/** One PM state owns editable input. This small facade is shared by React registration and headless tests. */
export function createProgramPmOwner(input:{documentId:string;workspace:TextWorkspaceState;context:()=>ProgramPmHostContext|undefined;commit:ProgramTextCommit}) {
  const codec=createV11Codec(M),host=createProgramPmHost({...input,codec}),opened=PmCodecSession.open(codec,host.host,input.documentId);
  if(!opened.ok)throw Error(opened.reason);
  const session=opened.session;
  const pending=()=>{const s=session.summary();return s.dirty||s.held||s.busy||!!s.pendingCommit||!s.inputSettled||host.hasUnresolvedDraft();};
  return{session,host,
    hasPendingInput:pending,
    raw:()=>session.inputCapture().raw,
    // No typed recovery schema exists. RAW backup must never authorize losing a pending owner.
    captureComplete:()=>!pending(),
    status:()=>{const s=session.summary();return{composing:!s.inputSettled,saving:s.busy,failed:s.held||!!s.pendingCommit||s.status==='TITLE_UNSUPPORTED'};},
    async flush(){if(!pending())return true;const saved=await session.save();return saved.ok&&!pending();},
    confirmed(before:TextWorkspaceState,next:TextWorkspaceState){const result=host.confirmed(before,next);if(!result||!session.acceptHostConfirmation(result))return false;host.acceptConfirmation(result);return true;},
    reconcileUnchangedDocument(next:TextWorkspaceState){if(pending())return false;const read=host.unchangedDocumentRead();if(!read||canonical(read.snapshot)!==canonical(next)||!session.acceptUnchangedDocumentBaseline(read))return false;return host.acceptUnchangedDocumentRead(read);},
    blocksExternalSnapshot(before:ProgramData,next:ProgramData){if(!pending())return false;const owner=input.context()?.ownerId;if(!owner)return true;
      if(!before.spaces[owner]||!next.spaces[owner])return true;
      if(canonical(next.spaces[owner].text)===canonical(host.current()))return false;
      return !host.confirmed(before.spaces[owner]?.text,next.spaces[owner]?.text);},
  };
}
