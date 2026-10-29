'use client';
import {taggedLogical} from '@/lib/flow/integrated-poc/rea-pm/src/tagged-pm-schema';
import styles from './AlphaLocalWritingWorkspace.module.css';


import React from 'react';
import {createRoot} from 'react-dom/client';
import {ProgramProgressForm} from './ProgramProgressForm';
import {textWorkspaceModel as M} from '@/lib/flow/integrated-poc/text-workspace';
import {ALPHA_LOCAL_WRITING_SUPPORT,type AlphaLocalWritingSelector} from '@/lib/flow/integrated-poc/alpha-sync/writing-selector';
import {TaggedEnterEditor,createTaggedInputActions,taggedNativeSelectionMatches} from '@/lib/flow/integrated-poc/rea-pm/src/editor/tagged-bridge';
import {installViewportSelectionReveal} from '@/lib/flow/integrated-poc/rea-pm/src/editor/viewport-selection';

type Host=NonNullable<ReturnType<AlphaLocalWritingSelector['currentHost']>>;
type Outcome={ok:boolean;latestCovered?:boolean;reason?:string};
type Action='save'|'retry-rejected'|'check'|'retry-same';
export function alphaLocalWritingOutcome(value:Outcome){
  if(value.ok)return value.latestCovered===false?'앞선 모의 저장을 확인했습니다. 이후 입력은 아직 저장되지 않았습니다.':'현재 입력의 모의 저장을 확인했습니다.';
  if(value.reason==='EXACT_CONFIRMATION_REQUIRED')return'모의 저장 결과를 확인해야 합니다. 현재 입력은 유지됩니다.';
  if(value.reason==='UNSUPPORTED_TYPED_EDIT_PRESERVED')return'이 변경은 현재 저장 경로에서 지원하지 않습니다. 현재 입력은 유지됩니다.';
  if(value.reason==='UNSERIALIZABLE_INPUT_PRESERVED')return'처리하지 못한 입력을 보존 중입니다. 저장하지 않았습니다.';
  return'작업을 완료하지 못했습니다. 현재 입력은 유지됩니다.';
}

/** Scalar presentation only. Receipt/CAS/recovery decisions stay in the host.
 * In particular checking an older pending attempt does not preflight the latest
 * unsupported edit. No account/model inspection on ordinary input callbacks. */
export function createAlphaLocalSaveStatus(host:Host,options:{reentry?:boolean;isCurrent?:()=>boolean;serverTransport?:boolean}={}){
  let busy=false,phase='idle',message='작성한 내용은 아직 모의 저장되지 않았습니다.',pendingRequestId:string|null=null,checkpointDue=false;
  let retryRejectedAvailable=false;
  const isCurrent=()=>options.isCurrent?.()!==false;
  const projectRejectedRetry=(state:ReturnType<Host['inspect']>)=>{
    retryRejectedAvailable=state.attempt?.stage==='REJECTED'&&state.client.retryableRejectedDraft===true;
  };
  const readConfirmedState=()=>{
    const initial=host.inspect();
    projectRejectedRetry(initial);
    pendingRequestId=initial.attempt?.stage!=='REJECTED'?initial.attempt?.command.requestId??null:null;
    if(pendingRequestId){phase='unverified';message='저장 결과 확인 필요 · 입력은 남아 있습니다.';}
    else if(initial.attempt?.stage==='REJECTED'){phase='blocked';message='저장 실패 · 입력은 남아 있습니다.';}
    else if(host.currentSession()?.rejectedIntent()){phase='blocked';message='처리하지 못한 입력을 보존 중입니다. 저장하지 않았습니다.';}
    else if(initial.latestCovered){phase='confirmed';message=options.serverTransport?'저장됨':'확인된 모의 저장본을 열었습니다.';}
    else{phase='newer-input';message=options.reentry?'복구한 최신 입력을 보존했습니다. 아직 저장되지 않은 내용이 있습니다.':'편집 중';}
  };
  readConfirmedState();
  let observed=host.currentSession()?.submissionStamp();
  let observedIntent=host.currentSession()?.rejectedIntent();
  const sameStamp=(a:typeof observed,b:typeof observed)=>!!a&&!!b&&a.inputOwnerId===b.inputOwnerId&&a.docId===b.docId&&a.inputRevision===b.inputRevision&&a.semanticRevision===b.semanticRevision&&a.compositionEpoch===b.compositionEpoch;
  const listeners=new Set<()=>void>();
  const emit=()=>{for(const listener of listeners)listener();};
  async function run(action:Action):Promise<Outcome>{
    if(!isCurrent())return{ok:false,reason:'LOCAL_INPUT_OWNER_RETIRED'};
    if(busy)return{ok:false,reason:'LOCAL_ACTION_BUSY'};
    const owned=host.currentSession();
    busy=true;retryRejectedAvailable=false;message=action==='check'||action==='retry-same'?'앞선 모의 저장 결과를 확인 중입니다.':'모의 저장 중';emit();
    if(!isCurrent()||host.currentSession()!==owned){busy=false;return{ok:false,reason:'LOCAL_INPUT_OWNER_RETIRED'};}
    let result:Outcome;
    try{result=await(action==='save'?host.save():action==='retry-rejected'?host.retryRejected():host.confirmPending(action==='retry-same'));}
    catch{result={ok:false,reason:'EXACT_CONFIRMATION_REQUIRED'};}
    if(!isCurrent()||host.currentSession()!==owned){busy=false;return{ok:false,reason:'LOCAL_INPUT_OWNER_RETIRED'};}
    const state=host.inspect();
    projectRejectedRetry(state);
    pendingRequestId=state.attempt?.stage!=='REJECTED'?state.attempt?.command.requestId??null:null;
    phase=pendingRequestId?'unverified':result.ok?result.latestCovered===false?'newer-input':'confirmed':'blocked';
    message=pendingRequestId?'저장 결과 확인 필요 · 입력은 남아 있습니다.':state.attempt?.stage==='REJECTED'?'저장 실패 · 입력은 남아 있습니다.':result.ok?result.latestCovered===false?'편집 중':'저장됨':alphaLocalWritingOutcome(result);busy=false;emit();return result;
  }
  return{
    save:()=>run('save'),retryRejected:()=>run('retry-rejected'),check:()=>run('check'),retrySame:()=>run('retry-same'),
    changed(_event='INPUT_APPLIED'){
      if(!isCurrent())return;
      const current=host.currentSession(),next=current?.submissionStamp(),intent=current?.rejectedIntent();
      const changed=!sameStamp(observed,next)||intent!==observedIntent;observed=next;observedIntent=intent;
      if(changed&&options.reentry)checkpointDue=true;
      if(!changed&&!checkpointDue)return; // A settled callback can drain deferred input without a new stamp.
      if(intent){phase='blocked';message='처리하지 못한 입력을 보존 중입니다. 저장하지 않았습니다.';}
      else if(busy){phase='newer-input';message='편집 중 · 앞선 내용 저장 중';}
      else if(phase==='confirmed'){phase='newer-input';message='편집 중';}
      if(checkpointDue){
        // Preedit and unapplied panel input are not a failed durable write. Keep
        // their live owner and retry only when its normal settled notice arrives.
        if(current?.diagnostics().composing||intent||host.inspect().panelPending){if(changed)emit();return;}
        const checkpoint=host.checkpointInput();if(!isCurrent())return;
        if(checkpoint.ok)checkpointDue=false;
        else{phase='blocked';message='현재 입력은 유지됩니다. 재진입용 체크포인트를 확인하지 못했습니다.';}
      }
      emit();
    },
    refreshed(){observed=host.currentSession()?.submissionStamp();observedIntent=host.currentSession()?.rejectedIntent();readConfirmedState();emit();},
    view:()=>({busy,phase,message:options.serverTransport?message.replaceAll('모의 ',''):message,pendingRequestId,checkpointDeferred:checkpointDue,retryRejectedAvailable}),
    subscribe(listener:()=>void){listeners.add(listener);listener();return()=>{listeners.delete(listener);};},
  };
}

const mounted=new WeakMap<HTMLElement,object>();
/** The title field is an unsubmitted UI draft, not a second task or checkpoint.
 * Keep it on every refusal and block local replacement until the user submits
 * or explicitly clears it. Never invent a title to bypass the stored profile. */
export function createAlphaLocalTaskInput(field:{value:string},ports:{owner():object|null;append(text:string):{ok:boolean;published?:boolean;reason?:string}}){
  let composing=false;
  return{
    composing(value:boolean){composing=value;},
    pending:()=>composing||field.value.length>0,
    submit(){
      const owner=ports.owner();if(!owner)return{ok:false,reason:'LOCAL_INPUT_OWNER_RETIRED'};
      if(composing)return{ok:false,reason:'TASK_TITLE_COMPOSING'};
      const text=field.value;if(!text.trim()||/[\r\n]/.test(text))return{ok:false,reason:'TASK_TITLE_REQUIRED'};
      const result=ports.append(text);
      if(result.ok&&result.published===true&&ports.owner()===owner&&!composing&&field.value===text)field.value='';
      return result;
    },
  };
}
/** Local product integration entry. A supplied selector/transport is mandatory;
 * importing this module does not start Auth, fetch, a server or an EditorView. */
export async function mountAlphaLocalWritingWorkspace(place:HTMLElement,selector:AlphaLocalWritingSelector,today:string){
  if(mounted.has(place)||place.childNodes.length)throw Error('LOCAL_SURFACE_ALREADY_OCCUPIED');
  const lease={};mounted.set(place,lease);
  const resources:Array<()=>void>=[];
  const release=()=>{for(const dispose of [...resources].reverse())dispose();if(mounted.get(place)===lease)mounted.delete(place);};
  try{
  let selected:Awaited<ReturnType<AlphaLocalWritingSelector['open']>>;
  try{selected=await selector.open();}catch{selected={ok:false,reason:'LOCAL_OPEN_UNAVAILABLE'};}
  if(mounted.get(place)!==lease||place.childNodes.length)throw Error('LOCAL_SURFACE_CHANGED_DURING_OPEN');
  const doc=place.ownerDocument,region=doc.createElement('section'),heading=doc.createElement('h2'),support=doc.createElement('p'),limitations=doc.createElement('p'),scope=doc.createElement('p'),notice=doc.createElement('p');
  const capability=selected.ok&&selected.kind==='typed'?selected.support:ALPHA_LOCAL_WRITING_SUPPORT;
  const progressEnabled=selected.ok&&selected.kind==='typed'&&selected.capabilities.progress;
  const serverTransport=selected.ok&&selected.kind==='typed'&&selected.capabilities.serverTransport;
  const display=(text:string)=>serverTransport?text.replaceAll('모의 ',''):text;
  region.className=styles.surface;region.dataset.testid='alpha-local-writing';heading.textContent=serverTransport?'문서 편집':capability.heading;support.textContent=serverTransport&&selected.ok&&selected.kind==='typed'&&selected.capabilities.newItems?'선택한 메모 문단 뒤에 항목을 추가하고 새 일정의 날짜를 함께 저장합니다.':capability.description;limitations.textContent=capability.limitation;scope.textContent=serverTransport?'저장하기 전 새로고침하면 현재 입력이 사라질 수 있습니다.':capability.scope;scope.hidden=serverTransport;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');notice.dataset.testid='local-writing-status';region.append(heading,notice,support);if(!serverTransport)region.append(limitations);region.append(scope);place.append(region);
  resources.push(()=>region.remove());
  if(!selected.ok||selected.kind==='v11-readonly'){
    const kind=selected.ok?'v11-readonly' as const:'blocked' as const;
    heading.textContent=selected.ok?'기존 v11 문서 · 읽기 전용':'문서를 열지 못했습니다';
    support.textContent=selected.ok?'이 REA 확인 경로는 기존 형식을 읽기만 합니다. 원문을 변환하거나 새 계정을 만들지 않습니다.':'입력 문서를 확인하지 못해 편집기를 만들지 않았습니다.';
    limitations.hidden=true;notice.textContent=selected.ok?'기존 Alpha의 v11 경로는 그대로 유지됩니다.':'연결과 문서 소유자를 확인해 주세요.';
    return{kind,save:async()=>({ok:false as const,reason:'NO_TYPED_INPUT_OWNER'}),inspect:()=>({kind,selection:selector.snapshot(),editorViews:0,actualAppWriteAllowed:false}),destroy(){const result=selector.close();if(result.ok)release();return result;}};
  }
  const host=selected.host,toolbar=doc.createElement('div'),editorPlace=doc.createElement('div'),panelNotice=doc.createElement('p'),panelPlace=doc.createElement('div');
  toolbar.className='qa-toolbar';editorPlace.dataset.testid='alpha-editor';editorPlace.dataset.reaAppEditor='local-selector';panelPlace.dataset.editorTools='';panelNotice.dataset.testid='progress-draft-notice';panelNotice.setAttribute('role','status');panelNotice.hidden=true;region.append(toolbar,editorPlace,panelNotice,panelPlace);
  const panelRoot=createRoot(panelPlace);
  resources.push(()=>panelRoot.unmount());
  let disposed=false,mounts=0,destroys=0,sequence=0,draft:{occurrenceId:string;date:string;percent:string;revision:number}|null=null;
  let commandPanel:HTMLDivElement|undefined,menuTarget:string|null=null,menuToken='',dismissedSlash='';
  let taskInput:ReturnType<typeof createAlphaLocalTaskInput>|undefined;
  let editor:TaggedEnterEditor,viewport:ReturnType<typeof installViewportSelectionReveal>|undefined;
  const ownerCurrent=()=>!disposed&&selector.currentHost()===host&&selector.snapshot().mode==='typed'&&!selector.snapshot().closed;
  const status=createAlphaLocalSaveStatus(host,{reentry:selected.capabilities.reentry,isCurrent:ownerCurrent,serverTransport});
  const run=(action:()=>unknown)=>()=>{try{void Promise.resolve(action()).catch(()=>{notice.textContent='작업을 완료하지 못했습니다. 현재 입력은 유지됩니다.';});}catch{notice.textContent='작업을 완료하지 못했습니다. 현재 입력은 유지됩니다.';}};
  const button=(label:string,id:string,action:()=>unknown)=>{const b=doc.createElement('button');b.type='button';b.textContent=display(label);b.dataset.testid=id;b.addEventListener('click',run(action));toolbar.append(b);return b;};
  const titleHold=()=>{notice.textContent='작성 중인 할 일 제목을 먼저 추가하거나 직접 지워 주세요. 현재 입력은 유지됩니다.';return{ok:false as const,reason:'UNSUBMITTED_TASK_TITLE_HOLD'};};
  const saveCurrent=()=>taskInput?.pending()?Promise.resolve(titleHold()):status.save();
  const retryCurrent=()=>taskInput?.pending()?Promise.resolve(titleHold()):status.retryRejected();
  const save=button('모의 저장','save',saveCurrent),retry=button('거부된 모의 저장 다시 시도','retry',retryCurrent),check=button('앞선 모의 저장 결과 확인','confirm',status.check),same=button('같은 요청 다시 확인','retry-same',status.retrySame);
  retry.hidden=true;
  same.hidden=selected.capabilities.reentry;
  const paintStatus=()=>{const state=status.view();notice.textContent=display(taskInput?.pending()?`${state.phase==='confirmed'?'본문의 모의 저장을 확인했습니다.':state.message} 작성 중인 할 일 제목은 아직 추가·저장되지 않았습니다.`:state.message);notice.dataset.saveState=state.busy?'saving':state.phase;if(serverTransport)scope.hidden=state.phase==='confirmed'&&!state.busy&&!taskInput?.pending();for(const b of [save,retry,check,same])b.disabled=state.busy;retry.hidden=!state.retryRejectedAvailable;retry.disabled=state.busy||!state.retryRejectedAvailable;check.hidden=!state.pendingRequestId;same.hidden=selected.capabilities.reentry||!state.pendingRequestId;};
  const unsubscribe=status.subscribe(paintStatus);
  resources.push(unsubscribe);
  function syncPanelAfterHistory(direction:'undo'|'redo'){
    const shown=draft,target=shown?host.currentSession()?.progressTarget(shown.occurrenceId):null;
    if(!shown||!target)return;
    const record=target.records.find(r=>r.recordDate===shown.date);
    // Unapplied user input owns its raw text/date and keeps the existing save HOLD.
    if(host.inspect().panelPending){
      const action=direction==='undo'?'실행 취소':'다시 실행';
      panelNotice.textContent=record?`${action} 후 이 날짜의 값은 ${record.percent}%입니다. 입력 중인 값은 유지했습니다.`:`${action} 후 이 날짜에는 기록이 없습니다. 입력 중인 값은 유지했습니다.`;
      panelNotice.hidden=false;return;
    }
    panelNotice.hidden=true;
    // A missing selected-date record is empty, never another date's current value.
    const percent=record?String(record.percent):'';
    if(shown.percent===percent)return;
    const value={occurrenceId:shown.occurrenceId,date:shown.date,percent};
    draft={...value,revision:host.setPanelInput(value,false)};
  }
  function renderPanel(){
    const shown=draft,target=shown?host.currentSession()?.progressTarget(shown.occurrenceId):null;
    if(!shown||!target){panelRoot.render(null);return;}
    const patch=(update:Partial<Pick<typeof shown,'date'|'percent'>>)=>{
      if(!draft||draft.occurrenceId!==shown.occurrenceId)return;
      panelNotice.hidden=true;
      const next={...draft,...update},parsed=M.parseProgressToken(next.percent.trim());
      draft={...next,revision:host.setPanelInput(next,true,parsed.ok&&parsed.percent!==null?{occurrenceId:next.occurrenceId,recordDate:next.date,percent:parsed.percent}:undefined)};renderPanel();
    };
    panelRoot.render(<ProgramProgressForm title={display(progressEnabled?'진행 입력 · 모의 저장':'진행 입력 · 현재 저장 경로에서 미지원')} date={shown.date} percent={shown.percent} history={target.records.map(r=>({date:r.recordDate,percent:r.percent}))} disabled={!target.enabled} onDate={date=>patch({date})} onPercent={percent=>patch({percent})} onHistory={date=>{const record=target.records.find(r=>r.recordDate===date);if(record)patch({date,percent:String(record.percent)});}} onSubmit={()=>{
      const parsed=M.parseProgressToken(shown.percent.trim());if(!parsed.ok||parsed.percent===null){notice.textContent='진행 입력을 확인해 주세요. 입력은 유지됩니다.';return;}
      const result=host.recordProgress(`local-selector-progress-${++sequence}`,shown.occurrenceId,shown.date,parsed.percent,shown.revision);
      if(result.ok){panelNotice.hidden=true;draft={...shown,revision:host.inspect().panelRevision};editor.refreshProgress();status.changed();notice.textContent=display(progressEnabled?'진행 변경을 편집 상태에 보존했습니다. 모의 저장으로 확인할 수 있습니다.':'진행 변경을 편집 상태에 보존했습니다. 이 경로로는 저장되지 않습니다.');}else notice.textContent=display(alphaLocalWritingOutcome(result));
      renderPanel();
    }}/>);
  }
  function construct(){
    const session=host.currentSession();if(!session)throw Error('NO_TYPED_INPUT_OWNER');mounts++;
    const view=new TaggedEnterEditor(editorPlace,session,inputStatus=>{status.changed(inputStatus);renderWriting(inputStatus==='INPUT_APPLIED');if(inputStatus==='LOCAL_UNDO_APPLIED'||inputStatus==='LOCAL_REDO_APPLIED')syncPanelAfterHistory(inputStatus==='LOCAL_UNDO_APPLIED'?'undo':'redo');renderPanel();viewport?.resume();},target=>{
      if(host.inspect().panelPending&&draft?.occurrenceId!==target.occurrenceId){notice.textContent='진행 패널의 입력을 먼저 확인해 주세요.';return;}
      if(draft?.occurrenceId!==target.occurrenceId){panelNotice.hidden=true;const value={occurrenceId:target.occurrenceId,date:today,percent:String(target.percent)};draft={...value,revision:host.setPanelInput(value,false)};}renderPanel();
    },(target,pointer)=>{
      if(!progressEnabled||host.inspect().panelPending){notice.textContent='진행 입력을 먼저 확인해 주세요.';return;}
      const current=host.currentSession();if(!current||current.diagnostics().composing||editor.view.composing||!taggedNativeSelectionMatches(editor.view)){notice.textContent='입력을 마친 뒤 다시 체크해 주세요.';return;}
      const selection=current.state.selection.toJSON(),scroll=doc.defaultView!.scrollY;
      const result=host.recordProgress('writing-check-'+(++sequence),target.occurrenceId,today,target.percent===100?0:100);
      if(result.ok){editor.refreshProgress();status.changed();if(pointer){editor.view.focus();doc.defaultView!.scrollTo({top:scroll,behavior:'instant'});}if(JSON.stringify(current.state.selection.toJSON())!==JSON.stringify(selection))notice.textContent='선택 위치 확인이 필요합니다.';}else notice.textContent=alphaLocalWritingOutcome(result);
    });
    try{view.view.dom.setAttribute('aria-label',display('본문·제목 편집 · 모의 저장'));
    viewport=installViewportSelectionReveal(view.view,()=>({owner:session.inputOwnerId,settled:!session.diagnostics().composing,held:session.diagnostics().closed||!!session.rejectedIntent()}));return view;}
    catch(error){view.destroy();throw error;}
  }
  editor=construct();
  resources.push(()=>{viewport?.destroy();editor.destroy();destroys++;});
  const actions=createTaggedInputActions({
    currentSession:()=>ownerCurrent()?host.currentSession():null,
    currentView:()=>ownerCurrent()?editor.view:null,
    held:()=>!ownerCurrent()||host.inspect().panelPending,
    selectionReady:view=>taggedNativeSelectionMatches(view as typeof editor.view),
    focusAllowed:()=>ownerCurrent()&&(editor.view.hasFocus()||!!doc.activeElement&&toolbar.contains(doc.activeElement)),
    changed:event=>{editor.refreshProgress();status.changed(event);if(event==='LOCAL_UNDO_APPLIED'||event==='LOCAL_REDO_APPLIED')syncPanelAfterHistory(event==='LOCAL_UNDO_APPLIED'?'undo':'redo');renderPanel();renderWriting();viewport?.resume();},
  });
  function append(kind:'memo'|'task',text:string,afterOccurrenceId?:string){
    const current=host.currentSession();if(!current||!ownerCurrent())return{ok:false,reason:'LOCAL_INPUT_OWNER_RETIRED'};
    const token=`local-append-${current.inputOwnerId}-${++sequence}`;
    const prepared=actions.prepareAppend({requestId:token,occurrenceId:token+'-row',kind,text,...(afterOccurrenceId?{afterOccurrenceId}:{})});
    const result=prepared.ok?actions.append(prepared.ticket):prepared;
    if(!result.ok)notice.textContent='항목을 추가하지 못했습니다. 현재 입력을 유지했습니다.';
    return result;
  }

  commandPanel=doc.createElement('div');commandPanel.dataset.testid='writing-commands';region.insertBefore(commandPanel,editorPlace);
  function commandResult(value:{ok:boolean;reason?:string}){if(!value.ok)notice.textContent='변경을 적용하지 못했습니다. 입력을 마친 뒤 다시 시도해 주세요.';renderWriting();return value;}
  function openMenu(){
    const current=host.currentSession(),selection=current&&taggedLogical(current.state.doc,current.state.selection),body=current?.pendingBody(),block=selection&&body?.blocks[selection.occurrenceId];
    if(!current||!selection||!block||block.kind!=='memo'||block.draft||selection.anchor!==selection.head&&(Math.min(selection.anchor,selection.head)!==0||Math.max(selection.anchor,selection.head)!==block.text.length)){notice.textContent='메모 문단 하나에 커서를 놓은 뒤 추가해 주세요.';return;}
    if(block.text.length){const inserted=append('memo','',selection.occurrenceId);if(!inserted.ok)return;const next=taggedLogical(current.state.doc,current.state.selection);if(!next)return;menuTarget=next.occurrenceId;menuToken='';renderWriting();return;}
    menuTarget=selection.occurrenceId;menuToken=/^\/[^\s/]{0,63}$/.test(block.text)?block.text:'';renderWriting();
  }
  function renderWriting(allowSlash=false){
    if(!commandPanel||!editor)return;const current=host.currentSession();if(!current)return;const body=current.pendingBody(),selection=taggedLogical(current.state.doc,current.state.selection),selectedBlock=selection&&body.blocks[selection.occurrenceId];
    if(menuTarget&&(!selection||selection.occurrenceId!==menuTarget||menuToken==='/'&&body.blocks[menuTarget]?.text!=='/'))menuTarget=null;
    if(allowSlash&&!current.diagnostics().composing&&!editor.view.composing&&selection&&selectedBlock?.kind==='memo'&&!selectedBlock.draft&&selectedBlock.text==='/'&&dismissedSlash!==selection.occurrenceId+':'+selectedBlock.text){menuTarget=selection.occurrenceId;menuToken='/';}
    commandPanel.replaceChildren();
    const addControl=(parent:HTMLElement,label:string,id:string,action:()=>void)=>{const b=doc.createElement('button');b.type='button';b.textContent=label;b.dataset.testid=id;b.addEventListener('mousedown',e=>e.preventDefault());b.addEventListener('click',action);parent.append(b);return b;};
    if(menuTarget){const target=menuTarget,block=body.blocks[target];if(block?.kind!=='memo'||block.draft){menuTarget=null;}else{
      const menu=doc.createElement('div');menu.setAttribute('role','group');menu.setAttribute('aria-label','문단 종류');menu.dataset.testid='kind-menu';commandPanel.append(menu);
      for(const kind of ['task','schedule'] as const)addControl(menu,kind==='task'?'할 일':'일정','choose-'+kind,()=>{
        const latest=current.pendingBody().blocks[target];if(!latest)return;const text=latest.text.slice(menuToken.length),title=text.split('\n',1)[0].trim(),token=menuToken;
        const result=kind==='task'&&title?actions.confirm(target,kind,{plannedDate:null,commandToken:token},'writing-confirm-'+(++sequence)):actions.draft(target,{kind,plannedDate:null,commandToken:token},'writing-draft-'+(++sequence));
        if(result.ok)menuTarget=null;commandResult(result);
      });
      addControl(menu,'닫기','close-kind-menu',()=>{dismissedSlash=target+':'+block.text;menuTarget=null;renderWriting();});
    }}
    for(const id of body.order){const block=body.blocks[id],value=block.draft;if(!value)continue;const panel=doc.createElement('div');panel.dataset.testid='kind-draft';panel.dataset.oid=id;const label=doc.createElement('span');label.textContent=value.kind==='task'?'할 일 초안 · 본문에 제목을 입력하세요':'일정 초안 · 본문 제목과 날짜를 입력하세요';panel.append(label);
      if(value.kind==='schedule'){const date=doc.createElement('input');date.type='date';date.setAttribute('aria-label','일정 날짜');date.value=value.plannedDate??'';date.addEventListener('change',()=>{commandResult(actions.draft(id,{...value,plannedDate:date.value||null},'writing-date-'+(++sequence)));});panel.append(date);}
      const title=block.text.startsWith(value.commandToken)?block.text.slice(value.commandToken.length).split('\n',1)[0].trim():'';
      const make=addControl(panel,'만들기','make-item',()=>commandResult(actions.confirm(id,value.kind,{plannedDate:value.plannedDate,commandToken:value.commandToken},'writing-make-'+(++sequence))));make.disabled=!title||value.kind==='schedule'&&!value.plannedDate;
      addControl(panel,'취소','cancel-draft',()=>{dismissedSlash=id+':'+block.text;commandResult(actions.draft(id,null,'writing-cancel-'+(++sequence)));});commandPanel.append(panel);
    }
  }
  if(selected.capabilities.newItems){const add=button('추가','add-kind',openMenu);add.addEventListener('mousedown',e=>e.preventDefault());const convert=button('문단 바꾸기','convert-kind',()=>{const current=host.currentSession(),selection=current&&taggedLogical(current.state.doc,current.state.selection),block=selection&&current?.pendingBody().blocks[selection.occurrenceId];if(!selection||!block||block.kind!=='memo'||block.draft||selection.anchor!==selection.head&&(Math.min(selection.anchor,selection.head)!==0||Math.max(selection.anchor,selection.head)!==block.text.length)){notice.textContent='메모 문단 하나를 선택해 주세요.';return;}menuTarget=selection.occurrenceId;menuToken='';renderWriting();});convert.addEventListener('mousedown',e=>e.preventDefault());}
  renderWriting();
  for(const direction of ['undo','redo'] as const)button(direction==='undo'?'실행 취소':'다시 실행',direction,()=>{
    const result=actions.history(direction);if(!result.ok)notice.textContent='실행 취소 상태를 확인해 주세요. 입력은 유지됩니다.';
  });
  async function reopen(){
    if(taskInput?.pending())return titleHold();
    const result=await host.reopen();
    if(result.ok&&!disposed&&selector.currentHost()===host){viewport?.destroy();editor.destroy();destroys++;editorPlace.replaceChildren();draft=null;panelNotice.hidden=true;host.setPanelInput(null,false);editor=construct();renderPanel();renderWriting();status.refreshed();}
    else if(!result.ok)notice.textContent=display(alphaLocalWritingOutcome(result));
    return result;
  }
  button('확인된 모의 저장본 다시 열기','reopen',reopen);
  return{
    kind:'typed' as const,save:saveCurrent,retryRejected:retryCurrent,confirmPending:(retrySame=false)=>retrySame?status.retrySame():status.check(),reopen,
    currentEditor:()=>editor,
    inspect:()=>({kind:'typed',selection:selector.snapshot(),host:host.inspect(),editor:editor.snapshot(),status:status.view(),pendingTaskTitle:taskInput?.pending()??false,mounts,destroys,actualAppWriteAllowed:serverTransport}),
    destroy(){if(disposed)return{ok:true as const};if(taskInput?.pending())return titleHold();const result=selector.close();if(!result.ok){notice.textContent=display(alphaLocalWritingOutcome(result));return result;}disposed=true;release();return result;},
  };
  }catch(error){
    // Never remove a live draft on a failed close. Clean initialization failures
    // release only this mount's resources and lease; foreign DOM stays intact.
    if(selector.close().ok){for(const dispose of [...resources].reverse()){try{dispose();}catch{}}if(mounted.get(place)===lease)mounted.delete(place);}
    throw error;
  }
}
