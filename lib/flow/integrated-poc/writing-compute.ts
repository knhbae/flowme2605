import type {TextWorkspaceState,TextRow,TextEditorRowMeta} from './text-workspace';
import type {AlphaAccount,AlphaReferenceContext,AlphaPrivateCommand,AlphaReceipt,AlphaRecovery} from './alpha-persistence/contract';
import type {ProgramWritingPosition} from './contract';
export type WritingIdentity={ownerId:string;docId:string;workingGeneration:number;baseRevision:number;requestId:string};
export type WritingPayload={kind:'save';account:AlphaAccount;references:AlphaReferenceContext;expected:TextWorkspaceState;next:TextWorkspaceState;position?:ProgramWritingPosition}|{kind:'check';workspace:TextWorkspaceState;lineId:string;date:string}|{kind:'account';accountJson:string;referencesJson:string}|{kind:'recovery';valueJson:string;compact:boolean}|{kind:'receipt';before:AlphaAccount;command:AlphaPrivateCommand;candidate:AlphaAccount;receipt:AlphaReceipt};
export type WritingReply={identity:WritingIdentity;ok:boolean;reason?:string;command?:AlphaPrivateCommand;result?:string;workspace?:TextWorkspaceState;rows?:TextRow[];paint?:TextEditorRowMeta[];panel?:string;account?:AlphaAccount;references?:AlphaReferenceContext;recoveryValue?:AlphaRecovery;recoveryRaw?:string;ackEligible?:boolean;metrics:{computeMs:number;postMs?:number;roundTripMs?:number}};
export type PreparedWriting=Readonly<{identity:WritingIdentity;command:AlphaPrivateCommand;recoveryValue:AlphaRecovery;recoveryRaw:string;ackEligible:boolean}>;
type WorkerPort=Pick<Worker,'postMessage'|'terminate'|'addEventListener'>;
export function createWritingCompute(factory:()=>WorkerPort=()=>new Worker(new URL('./writing-compute.worker.ts',import.meta.url),{type:'module'})){
 const observations:{phase:string;ms:number}[]=[];
 const receipts=new WeakMap<object,number>(),prepared=new WeakMap<object,number>();
 const seal=<T,>(v:T):T=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(seal);Object.freeze(v);}return v;};
 const note=(phase:string,ms:number)=>{observations.push({phase,ms});if(observations.length>32)observations.shift();try{const name='flowme-writing:'+phase;performance.clearMeasures(name);performance.measure(name,{start:Math.max(0,performance.now()-ms),duration:ms});}catch{}};
 let worker:WorkerPort|null=null,closed=false,epoch=0;const jobs=new Map<string,{kind:WritingPayload['kind'];identity:WritingIdentity;resolve:(r:WritingReply)=>void;sent:number;postMs:number;epoch:number;timer:ReturnType<typeof setTimeout>}>();
 const failure=(identity:WritingIdentity,reason:string):WritingReply=>({identity,ok:false,reason,metrics:{computeMs:0}});
 function stop(reason:string){epoch++;worker?.terminate();worker=null;for(const j of jobs.values()){clearTimeout(j.timer);j.resolve(failure(j.identity,reason));}jobs.clear();}
 function start(){if(worker)return worker;const own=factory();worker=own;const ownEpoch=epoch;
 own.addEventListener('message',(event:MessageEvent<WritingReply>)=>{if(ownEpoch!==epoch||worker!==own)return;const r=event.data,j=jobs.get(r?.identity?.requestId);if(!j||j.epoch!==epoch)return;clearTimeout(j.timer);if(JSON.stringify(j.identity)!==JSON.stringify(r.identity)){jobs.delete(j.identity.requestId);j.resolve(failure(j.identity,'worker-identity'));return;}jobs.delete(j.identity.requestId);if(typeof r.ok!=='boolean'||!r.metrics||!Number.isFinite(r.metrics.computeMs)||r.metrics.computeMs<0){j.resolve(failure(j.identity,'worker-message'));return;}note('compute-'+j.kind,r.metrics.computeMs);note('postMessage-'+j.kind,j.postMs);note('roundTrip-'+j.kind,performance.now()-j.sent);const reply={...r,metrics:{...r.metrics,postMs:j.postMs,roundTripMs:performance.now()-j.sent}};if(j.kind==='save'&&reply.ok){const t=performance.now();seal(reply);receipts.set(reply,epoch);note('seal',performance.now()-t);}j.resolve(reply);});
 own.addEventListener('error',()=>{if(worker===own)stop('worker-error');});own.addEventListener('messageerror',()=>{if(worker===own)stop('worker-message');});return own;}
 return {note,observations:()=>observations.slice(),
 consumeSave(reply:WritingReply,identity:WritingIdentity):PreparedWriting|null{
  if(receipts.get(reply)!==epoch||JSON.stringify(reply.identity)!==JSON.stringify(identity)||!reply.ok||!reply.command||!reply.recoveryValue||typeof reply.recoveryRaw!=='string')return null;
  receipts.delete(reply);const proof=seal({identity:reply.identity,command:reply.command,recoveryValue:reply.recoveryValue,recoveryRaw:reply.recoveryRaw,ackEligible:reply.ackEligible===true});prepared.set(proof,epoch);return proof;
 },takeRecovery(proof:PreparedWriting){if(prepared.get(proof)!==epoch)return null;prepared.delete(proof);return{ownerId:proof.identity.ownerId,raw:proof.recoveryRaw};},
 run(identity:WritingIdentity,payload:WritingPayload):Promise<WritingReply>{
  if(closed)return Promise.resolve(failure(identity,'worker-closed'));if(jobs.size>=2||jobs.has(identity.requestId))return Promise.resolve(failure(identity,'worker-busy'));
  return new Promise(resolve=>{try{const own=start(),sent=performance.now(),job={kind:payload.kind,identity:{...identity},resolve,sent,postMs:0,epoch,timer:setTimeout(()=>{if(jobs.has(identity.requestId))stop('worker-timeout');},15000)};jobs.set(identity.requestId,job);own.postMessage({identity,payload});job.postMs=performance.now()-sent;}catch{jobs.delete(identity.requestId);resolve(failure(identity,'worker-unavailable'));}});
 },cancel:()=>stop('worker-cancelled'),dispose(){closed=true;stop('worker-closed');},pending:()=>jobs.size};
}
export type WritingCompute=ReturnType<typeof createWritingCompute>;
