import type {ProgramData} from './contract';
import {programFailure} from './contract';
import type {ProgramMutate,ProgramMutationResult} from './ui-contract';
import {handoffLegacyCreatorRecovery,type LegacyCreatorRecoveryHandoffRequest} from './legacy-creator-recovery-handoff';

/** Parent-side port keeps UI/controller authority separate from read-only codec.
 * Do not flush: successful autosave does not authorize replacing unsaved work. */
export async function commitLegacyCreatorRecoveryHandoff(request:LegacyCreatorRecoveryHandoffRequest,ports:{
 current:()=>ProgramData|null;blocked:()=>boolean;lockInput:()=>()=>void;mutate:ProgramMutate;readSource:()=>string|null;
}):Promise<ProgramMutationResult>{
 if(ports.blocked())return{ok:false,reason:'pending-input'};
 const current=ports.current();if(!current||current.activeActorId!==request.actorId)return{ok:false,reason:'conflict'};
 const release=ports.lockInput();
 try{
  if(ports.blocked())return{ok:false,reason:'pending-input'};
  return await ports.mutate('개발2 임시 작업 이어가기',data=>{
   if(ports.blocked()||ports.current()?.activeActorId!==request.actorId)return programFailure(data,'conflict');
   let raw:string|null;try{raw=ports.readSource();}catch{return programFailure(data,'conflict');}
   return handoffLegacyCreatorRecovery(data,request,raw);
  });
 }catch{return{ok:false,reason:'storage-unavailable'};}
 finally{try{release();}catch{/* Releasing a UI lock must not relabel a confirmed store success as failure. */}}
}
