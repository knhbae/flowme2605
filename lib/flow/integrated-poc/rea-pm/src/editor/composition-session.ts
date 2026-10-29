import {canonical} from '../../codec.cjs';
export interface LogicalSelection {occurrenceId:string;anchor:number;head:number;direction:'none'|'forward'|'backward'}
export interface WritingKernel {getState():{session:{docId:string;ownerId:string;generation:number;compositionOwner:CompositionBinding|null}};dispatch(action:any):{status:string}}
const equal=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
export interface CompositionBinding {docId:string;ownerId:string;generation:number;occurrenceId:string}
export interface PublishedComposition {binding:CompositionBinding;text:string;selection:LogicalSelection}
export interface CompositionPorts {
 target():string|null;
 initialSelection?():LogicalSelection|null;
 composing():boolean;
 published(binding:CompositionBinding):PublishedComposition|null;
 requestFrame(callback:()=>void):number;
 cancelFrame(id:number):void;
 notice(status:string):void;
}
const key=(s:{docId:string;ownerId:string;generation:number})=>JSON.stringify([s.docId,s.ownerId,s.generation]);

/** PM owns all native composition events. The kernel receives only a published, DOM-matched final. */
export function createCompositionSession(kernel:WritingKernel,ports:CompositionPorts){
 let epoch=0,active:{epoch:number;binding:CompositionBinding;ended:boolean}|null=null,frame:number|null=null,destroyed=false;
 const events:{event:string;epoch:number;status:string;pmComposing:boolean}[]=[];
 const record=(event:string,status:string)=>{events.push({event,epoch,status,pmComposing:ports.composing()});if(events.length>32)events.shift();};
 const cancelFrame=()=>{if(frame!==null){ports.cancelFrame(frame);frame=null;}};
 function finish(ticket=active){
  if(destroyed||!ticket||active!==ticket||!ticket.ended||ports.composing())return;
  const s=kernel.getState().session,b=s.compositionOwner;
  if(!b||key(s)!==key(ticket.binding)||!equal(b,ticket.binding)){record('final','STALE_COMPOSITION_OWNER');return;}
  const published=ports.published(ticket.binding);
  if(!published||!equal(published.binding,ticket.binding)){record('final','PM_DOM_NOT_YET_MATCHED');return;}
  const ended=kernel.dispatch({action:'compositionEndWithoutFinalInput',target:b.docId+'/'+b.occurrenceId});
  if(ended.status!=='OBSERVED'){record('final',ended.status);ports.notice(ended.status);return;}
  const r=kernel.dispatch({action:'finalInput',target:b.docId+'/'+b.occurrenceId,ownerId:b.ownerId,generation:b.generation,text:published.text,selection:published.selection});
  record('final',r.status);if(['ACCEPTED','DRAFT_RETAINED'].includes(r.status)){active=null;cancelFrame();}ports.notice(r.status);
 }
 const wake=()=>{if(destroyed||!active?.ended||frame!==null)return;const ticket=active;frame=ports.requestFrame(()=>{frame=null;finish(ticket);});};
 return{
  start():false{
   if(destroyed)return false;
   // A prior end may have no trailing input and no new transaction. Reconcile only if its current DOM already matches PM.
   if(active?.ended)finish(active);cancelFrame();epoch++;
   const s=kernel.getState().session,id=ports.target(),b=s.compositionOwner;
   if(!id){record('start','SELECTION_UNMAPPABLE');ports.notice('SELECTION_UNMAPPABLE');return false;}
   if(b){
    if(key(b)!==key(s)||b.occurrenceId!==id){record('start','COMPOSITION_TARGET_PENDING');ports.notice('COMPOSITION_TARGET_PENDING');return false;}
    active={epoch,binding:{...b},ended:false};record('start','COMPOSITION_CONTINUED');ports.notice('COMPOSITION_CONTINUED');return false;
   }
   const r=kernel.dispatch({action:'beginComposition',target:s.docId+'/'+id});record('start',r.status);
   if(r.status==='OBSERVED'){const selected=ports.initialSelection?.();if(selected?.occurrenceId===id)kernel.dispatch({action:'setSelection',...selected});active={epoch,binding:{...kernel.getState().session.compositionOwner!},ended:false};}ports.notice(r.status);
   return false;
  },
  end():false{if(!destroyed&&active){active.ended=true;record('end','WAITING_FOR_PM_PUBLICATION');wake();}return false;},
  published(){if(active)record('pm-publication',active.ended?'ENDED':'PREEDIT');wake();},
  nativeInput(inputType:string,isComposing:boolean){if(active)record('input:'+inputType,isComposing?'COMPOSING_INPUT':'NONCOMPOSING_INPUT');wake();},
  trace:()=>events.map(e=>({...e})),
  destroy(){destroyed=true;active=null;cancelFrame();}
 };
}

