import type {AlphaSyncSnapshot} from '../alpha-sync/controller';
import type {ProgramPrivateMutationObservation} from '../ui-contract';
import type {ProgramTextCommit} from '../program-text-draft';
import type {TextWorkspaceState} from '../text-workspace';
import {canonical,type Codec,type Proposal} from './codec.cjs';
import type {Host,HostCommitResult,HostRead} from './src/pm-codec-session';

export type ProgramPmHostContext={ownerId:string;epoch:object;snapshot:()=>AlphaSyncSnapshot|null};
type Prepared=Extract<ProgramPrivateMutationObservation,{phase:'prepared'}>;
type Submission={proposal:Proposal;version:number;prepared:Prepared|null;publicBytes:string;invalid:boolean};
const copy=<T>(v:T):T=>structuredClone(v);
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
const unknown=():HostCommitResult=>({ok:false,reason:'UNVERIFIED_HOST_OUTCOME'});

/** Uses ProgramSpace's existing guarded builder/controller. No repository/fetch here.
 * baselineVersion is a local text checkpoint, never an Alpha account revision. */
export function createProgramPmHost(options:{codec:Codec;documentId:string;workspace:TextWorkspaceState;context:()=>ProgramPmHostContext|undefined;commit:ProgramTextCommit}) {
  const context=options.context();if(!context)throw Error('PM_HOST_REQUIRED');
  const owner=context.ownerId,epoch=context.epoch;
  let baseline=copy(options.workspace),version=1,submission:Submission|null=null;
  function live(){const c=options.context();if(!c||c.epoch!==epoch||c.ownerId!==owner)return null;const s=c.snapshot();return s?.ownerId===owner&&s.account?.ownerId===owner&&s.account.source.actorId===owner&&s.envelope?.data.activeActorId===owner?s:null;}
  function proof(item:Submission,s:AlphaSyncSnapshot):Extract<HostCommitResult,{ok:true}>|null {
    const p=item.prepared,c=p?.command,a=s.account;
    if(item.invalid||!p||!c||c.kind!=='change-private'||!a||!live()||s.ownerId!==owner||a.ownerId!==owner||a.source.actorId!==owner
      ||s.envelope?.data.activeActorId!==owner||s.busy||s.pending||s.draft||!['saved','same-location'].includes(s.status)
      ||canonical(s.envelope.data.public)!==item.publicBytes)return null;
    const expected=copy(p.before.space) as unknown as Record<string,unknown>;
    for(const change of c.changes){if(!['text','position','timelineOrders'].includes(change.field))return null;if(change.present)expected[change.field]=copy(change.value);else delete expected[change.field];}
    if(!same(expected.text,item.proposal.snapshot)||!same(a.space,expected))return null;
    const changed=!same(expected,p.before.space);
    if(a.revision!==c.expectedRevision+(changed?1:0)||!same(a.source,p.before.source)||!same(a.legacyUndo,p.before.legacyUndo)||!same(a.legacyReceipts,p.before.legacyReceipts))return null;
    if(changed){const r=s.lastReceipt;if(s.status!=='saved'||!r||r.requestId!==c.requestId||r.kind!==c.kind||r.changed!==true||r.revision!==a.revision)return null;}
    else if(s.status!=='same-location')return null; // Never borrow an earlier receipt for a no-op.
    return{ok:true,status:item.proposal.changed?'APPLIED':'NO_CHANGE',baselineVersion:item.version+(item.proposal.changed?1:0),snapshot:copy(item.proposal.snapshot)};
  }
  function accept(item:Submission,result:Extract<HostCommitResult,{ok:true}>){baseline=copy(result.snapshot as TextWorkspaceState);version=result.baselineVersion;if(submission===item)submission=null;return result;}
  const host:Host={
    read(){const s=live();if(!s||s.busy||s.pending||s.draft||!same(s.account!.space.text,baseline))throw Error('PM_HOST_BASELINE_HOLD');return{baselineVersion:version,snapshot:copy(baseline)};},
    async commit(proposal,expectedVersion){
      if(submission)return unknown();
      const s=live(),inspection=options.codec.inspectProposal(proposal) as {expectedSnapshot:unknown;proposedSnapshot:unknown;operation?:{kind:string;lineId?:string;date?:string;percent?:number;correctionAsOfDate?:string}}|null;
      if(!s||s.busy||s.pending||s.draft&&!s.retryableRejectedDraft||expectedVersion!==version||!inspection||!same(inspection.expectedSnapshot,baseline)||!same(inspection.proposedSnapshot,proposal.snapshot)||!same(s.account!.space.text,baseline))return{ok:false,reason:'STALE_OR_UNKNOWN_PROPOSAL'};
      const item:Submission={proposal,version,prepared:null,publicBytes:canonical(s.envelope!.data.public),invalid:false};submission=item;
      let settled:Extract<ProgramPrivateMutationObservation,{phase:'settled'}>|null=null;
      const observe=(e:ProgramPrivateMutationObservation)=>{
        if(submission!==item||!live()||e.before.ownerId!==owner||e.before.source.actorId!==owner||!same(e.before,s.account)||e.command.kind!=='change-private'||e.command.expectedRevision!==s.account!.revision){item.invalid=true;return;}
        if(e.phase==='prepared'){if(item.prepared||settled){item.invalid=true;return;}item.prepared=copy(e);}
        else{if(!item.prepared||settled||e.generation!==item.prepared.generation||!same(e.command,item.prepared.command)){item.invalid=true;return;}settled=copy(e);}
      };
      try{
        // The boolean is intentionally ignored. Only the exact observation can confirm.
        const operation=inspection.operation;
        const privateTaskProgress=operation?.kind==='recordProgress'?{taskId:operation.lineId!,date:operation.date!,percent:operation.percent!,...(operation.correctionAsOfDate===undefined?{}:{correctionAsOfDate:operation.correctionAsOfDate})}:undefined;
        await options.commit(copy(proposal.snapshot as TextWorkspaceState),privateTaskProgress?'PM 날짜별 누적 진행':'PM 메모·제목 저장',{expectedWorkspace:copy(baseline),groupId:'text:pm:'+options.documentId,onPrivateMutation:observe,...(privateTaskProgress?{privateTaskProgress}:{})});
      }catch{return unknown();}
      const outcome=settled as Extract<ProgramPrivateMutationObservation,{phase:'settled'}>|null;
      if(!outcome)return unknown();
      if(!outcome.result.ok){
        const current=outcome.snapshot,p=item.prepared;
        // The existing client sets this transient capability only after its live,
        // definitive invalid/limit execute rejection. Pending/lookup/read errors do not grant it.
        if(!item.invalid&&p&&live()&&current.retryableRejectedDraft&&!current.busy&&!current.pending
          &&same(current.draft,p.command)&&same(current.account,p.before)){
          submission=null;return{ok:false,reason:'HOST_REJECTED_NOT_APPLIED'};
        }
        return unknown();
      }
      const result=proof(item,outcome.snapshot);return result?accept(item,result):unknown();
    }
  };
  return{host,
    /** Existing controller lookup/same-request retry owns reconciliation. No blind new submission. */
    confirmed(before:TextWorkspaceState,next:TextWorkspaceState){const item=submission,s=live();if(!item||!item.prepared||!s||!same(item.prepared.before.space.text,before)||!same(item.proposal.snapshot,next))return null;
      const p=item.prepared;if(p.snapshot.pending&&!same(p.snapshot.pending,p.command))return null;
      return proof(item,s);},
    acceptConfirmation(result:Extract<HostCommitResult,{ok:true}>){const item=submission;if(!item||result.baselineVersion!==item.version+(item.proposal.changed?1:0)||!same(result.snapshot,item.proposal.snapshot))return false;accept(item,result);return true;},
    hasSubmission:()=>submission!==null,
    hasUnresolvedDraft:()=>{const s=live();return !!s&&(!!s.pending||!!s.draft);},
    unchangedDocumentRead(){const s=live();if(!s||submission||s.busy||s.pending||s.draft||!['ready','saved','same-location','cancelled'].includes(s.status))return null;return{baselineVersion:version+1,snapshot:copy(s.account!.space.text)};},
    acceptUnchangedDocumentRead(read:HostRead){const s=live();if(!s||submission||s.busy||s.pending||s.draft||read.baselineVersion!==version+1||!same(read.snapshot,s.account!.space.text))return false;baseline=copy(read.snapshot as TextWorkspaceState);version=read.baselineVersion;return true;},
    current:()=>copy(baseline),
  };
}
