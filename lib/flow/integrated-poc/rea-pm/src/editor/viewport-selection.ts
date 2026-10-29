import type {EditorView} from 'prosemirror-view';

export interface VerticalRect {top:number;bottom:number}
export interface RevealPorts {
 owner():string;
 gate():'READY'|'DEFER'|'CANCEL';
 viewport():VerticalRect;
 caret():VerticalRect|null;
 scrollBy(delta:number):void;
 reveal?():void;
 requestFrame(callback:()=>void):number;
 cancelFrame(id:number):void;
 subscribe(resize:()=>void,cancel:()=>void):()=>void;
}

/** Nearest vertical edge, with a small reading gap. No centering or horizontal pan. */
export function verticalRevealDelta(caret:VerticalRect|null,viewport:VerticalRect,gap=8):number {
 if(!caret||![caret.top,caret.bottom,viewport.top,viewport.bottom,gap].every(Number.isFinite)||caret.bottom<caret.top||viewport.bottom<=viewport.top)return 0;
 const inset=Math.max(0,Math.min(gap,(viewport.bottom-viewport.top)/4));
 const top=viewport.top+inset,bottom=viewport.bottom-inset;
 if(caret.bottom-caret.top>bottom-top)return caret.top-top;
 if(caret.top>=top&&caret.bottom<=bottom)return 0;
 return caret.top<top?caret.top-top:caret.bottom-bottom;
}

/** Resize work only. Deferred IME work wakes on the host's existing settled-state notice. */
export function createViewportSelectionReveal(ports:RevealPorts){
 let pendingOwner:string|null=null,frame:number|null=null,destroyed=false;
 const cancel=()=>{pendingOwner=null;if(frame!==null){ports.cancelFrame(frame);frame=null;}};
 const flush=()=>{
  frame=null;if(destroyed||pendingOwner===null)return;
  if(pendingOwner!==ports.owner()||ports.gate()==='CANCEL'){cancel();return;}
  if(ports.gate()==='DEFER')return;
  pendingOwner=null;if(ports.reveal){ports.reveal();return;}
  const delta=verticalRevealDelta(ports.caret(),ports.viewport());
  if(delta)ports.scrollBy(delta);
 };
 const resume=()=>{
  if(destroyed||pendingOwner===null||frame!==null)return;
  if(pendingOwner!==ports.owner()||ports.gate()==='CANCEL'){cancel();return;}
  if(ports.gate()==='READY')frame=ports.requestFrame(flush);
 };
 const resize=()=>{if(destroyed)return;if(ports.gate()==='CANCEL'){cancel();return;}pendingOwner=ports.owner();resume();};
 const unsubscribe=ports.subscribe(resize,cancel);
 return{resume,destroy(){if(destroyed)return;destroyed=true;cancel();unsubscribe();}};
}

/** Reveal inside the PM scroll box first, then move only the remaining page distance. */
export function installViewportSelectionReveal(view:EditorView,ownerState:()=>{owner:string;settled:boolean;held:boolean}){
 const doc=view.dom.ownerDocument,win=doc.defaultView!;
 const viewport=()=>{const visual=win.visualViewport;return{top:Math.max(0,visual?.offsetTop??0),bottom:Math.min(win.innerHeight,visual?visual.offsetTop+visual.height:win.innerHeight)};};
 const caret=()=>{try{return view.coordsAtPos(view.state.selection.head,1);}catch{return null;}};
 return createViewportSelectionReveal({
  owner:()=>ownerState().owner,
  gate:()=>{
   if(view.isDestroyed||!view.dom.isConnected||doc.visibilityState==='hidden'||!view.hasFocus()||!view.state.selection.empty)return'CANCEL';
   const state=ownerState();if(state.held)return'CANCEL';
   return view.composing||!state.settled?'DEFER':'READY';
  },
  viewport,caret,
  scrollBy:top=>win.scrollBy({top,left:0,behavior:'instant'}),
  reveal:()=>{
   let current=caret();if(!current)return;
   const visible=viewport();if(![visible.top,visible.bottom].every(Number.isFinite)||visible.bottom<=visible.top)return;
   const host=view.dom;
   if(host.clientHeight>0&&host.scrollHeight>host.clientHeight&&/^(auto|scroll|overlay)$/.test(win.getComputedStyle(host).overflowY)){
    const top=host.getBoundingClientRect().top+host.clientTop,box={top,bottom:top+host.clientHeight};
    const overlap={top:Math.max(box.top,visible.top),bottom:Math.min(box.bottom,visible.bottom)};
    const delta=verticalRevealDelta(current,overlap.bottom>overlap.top?overlap:box);
    if(delta){
     host.scrollBy({top:delta,left:0,behavior:'instant'});
     // Browser limits may consume less than requested. Read the actual caret again.
     current=caret();if(!current)return;
    }
   }
   const remaining=verticalRevealDelta(current,viewport());
   if(remaining)win.scrollBy({top:remaining,left:0,behavior:'instant'});
  },
  requestFrame:callback=>win.requestAnimationFrame(callback),cancelFrame:id=>win.cancelAnimationFrame(id),
  subscribe:(resize,cancel)=>{
   const visual=win.visualViewport,navigate=(event:KeyboardEvent)=>{if(!event.isComposing&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Tab','Escape'].includes(event.key))cancel();};
   win.addEventListener('resize',resize);visual?.addEventListener('resize',resize);
   win.addEventListener('wheel',cancel,{passive:true,capture:true});win.addEventListener('touchmove',cancel,{passive:true,capture:true});win.addEventListener('pointerdown',cancel,true);win.addEventListener('keydown',navigate,true);win.addEventListener('blur',cancel);
   return()=>{win.removeEventListener('resize',resize);visual?.removeEventListener('resize',resize);win.removeEventListener('wheel',cancel,true);win.removeEventListener('touchmove',cancel,true);win.removeEventListener('pointerdown',cancel,true);win.removeEventListener('keydown',navigate,true);win.removeEventListener('blur',cancel);};
  }
 });
}
