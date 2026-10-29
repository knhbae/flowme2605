'use client';

import React,{useEffect,useRef,useState} from 'react';
import {TextSelection} from 'prosemirror-state';
import {CodecEditor} from '@/lib/flow/integrated-poc/rea-pm/src/editor/bridge';
import {createProgramPmOwner} from '@/lib/flow/integrated-poc/rea-pm/owner';
import {canonical} from '@/lib/flow/integrated-poc/rea-pm/codec.cjs';
import {ProgressPanelOwner,ProgressNoticeOwner,createProgressEditorPorts,progressPanelMessage,type ProgressPanelView} from '@/lib/flow/integrated-poc/rea-pm/src/editor/progress-controls';
import {textWorkspaceModel as M} from '@/lib/flow/integrated-poc/text-workspace';
import {trapProgramDialogTab,type ProgramTextEditorProps} from './ProgramTextEditor';
import {ProgramProgressForm} from './ProgramProgressForm';
import styles from './ProgramPmTextEditor.module.css';
import writingStyles from './ProgramTextEditor.module.css';

/** Existing v11 PM integration. Only an explicit app/fixture hostContext selects
 * this editor; it does not convert the stored model or broaden row support. */
export function ProgramPmTextEditor(props:ProgramTextEditorProps){
  const latest=useRef(props);latest.current=props;
  const place=useRef<HTMLDivElement>(null),editor=useRef<CodecEditor|null>(null);
  const owner=useRef<ReturnType<typeof createProgramPmOwner>|null>(null);
  const progress=useRef<ProgressPanelOwner|null>(null),dialog=useRef<HTMLDialogElement>(null),savePort=useRef<(()=>Promise<boolean>)|null>(null);
  const progressInputs=useRef<HTMLFieldSetElement>(null);
  const [panel,setPanel]=useState<ProgressPanelView|null>(null);
  const hostLocked=useRef(false),externalHold=useRef(false);
  const ownerEpoch=useRef(props.hostContext?.epoch);
  const retryInitialConnection=useRef<(()=>void)|null>(null);
  const [status,setStatus]=useState('준비 중');
  const notice=useRef(new ProgressNoticeOwner());
  const publishStatus=(message:string,token:object|null=null)=>{notice.current.replace(token);setStatus(message);};
  useEffect(()=>{
    let disposed=false,terminal=false;
    const initialContext=props.hostContext&&{ownerId:props.hostContext.ownerId,epoch:props.hostContext.epoch},documentId=props.docId;
    const notify=(message?:string)=>{if(disposed)return;if(message!==undefined)publishStatus(message);const o=owner.current;if(!o)return;editor.current?.refreshMetadata();setPanel(progress.current?.view()??null);latest.current.onDirtyChange?.(o.hasPendingInput()||!!progress.current?.hasPendingInput());
      const view=editor.current?.view;if(view){let rawStart=0,start=0,end=0,lineId:string|null=null;const raw=o.raw().split('\n');
        view.state.doc.forEach((node,offset,index)=>{const frame=node.attrs.mode==='task-title'?/^( *-\s+\[[^\]\r\n]*\](?:\s+|$))/.exec(raw[index]??''):null,prefix=frame?.[1].length??0;
          const translate=(position:number)=>rawStart+prefix+Math.max(0,Math.min(node.content.size,position-offset-1));
          if(view.state.selection.from>=offset+1&&view.state.selection.from<=offset+node.nodeSize-1){start=translate(view.state.selection.from);lineId=node.attrs.id;}
          if(view.state.selection.to>=offset+1&&view.state.selection.to<=offset+node.nodeSize-1)end=translate(view.state.selection.to);
          rawStart+=(raw[index]?.length??0)+1;});
        latest.current.onPosition?.({start,end,scrollTop:view.dom.scrollTop},lineId);
      }
    };
    // No input owner exists yet. Refuse saves/captures without inventing a dirty
    // draft merely because a normal account read is still in flight.
    props.onRegisterCaptureComplete?.(()=>false);
    props.onRegisterSave?.(async()=>false,()=>({composing:false,saving:false,failed:false}));
    const connect=()=>{
      if(disposed||terminal||owner.current||editor.current||progress.current||savePort.current||externalHold.current)return;
      const current=latest.current,c=current.hostContext;
      if(!initialContext||!c||current.docId!==documentId||c.ownerId!==initialContext.ownerId||c.epoch!==initialContext.epoch||c.epoch!==ownerEpoch.current)return;
      try{
        const s=c.snapshot();
        if(!s||s.ownerId!==c.ownerId||s.account?.ownerId!==c.ownerId||s.account.source.actorId!==c.ownerId
          ||s.envelope?.data.activeActorId!==c.ownerId||s.busy||s.pending||s.draft
          ||canonical(s.account.space.text)!==canonical(current.workspace)){
          publishStatus('서버의 같은 문서를 확인한 뒤 편집기를 연결합니다.');return;
        }
      }catch{publishStatus('서버의 같은 문서를 확인한 뒤 편집기를 연결합니다.');return;}
    try{
      const o=createProgramPmOwner({documentId,workspace:current.workspace,context:()=>latest.current.hostContext,commit:(...args)=>latest.current.onCommit(...args)});owner.current=o;
      const p=new ProgressPanelOwner(o.session,M.parseProgressToken,()=>{const now=new Date();return`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;},lineId=>{
        if(hostLocked.current||externalHold.current||latest.current.readOnly||latest.current.active===false)return'EDITOR_LOCKED';
        if(editor.current&&!editor.current.ready())return'INPUT_NOT_SETTLED';return latest.current.taskAccess?.(lineId)?.reason??undefined;
      });progress.current=p;const ports=createProgressEditorPorts(o,p,initialContext.ownerId,()=>latest.current.hostContext?.epoch===ownerEpoch.current&&latest.current.hostContext?.ownerId===initialContext.ownerId);
      const view=new CodecEditor(place.current!,o.session,notify,lineId=>{const result=p.open(lineId);notify(result.ok?'':progressPanelMessage(result.reason));});editor.current=view;
      // Restore a source position once at mount, without moving browser focus or replacing composition DOM.
      const initial=current.initialPosition;
      if(initial){let offset=0,anchor=1,head=1;const source=o.raw().split('\n');view.view.state.doc.forEach((node,start,index)=>{const raw=source[index]??'',prefix=node.attrs.mode==='task-title'?/^( *-\s+\[[^\]\r\n]*\](?:\s+|$))/.exec(raw)?.[1].length??0:0;
        if(initial.start>=offset&&initial.start<=offset+raw.length)anchor=start+1+Math.max(0,Math.min(node.content.size,initial.start-offset-prefix));
        if(initial.end>=offset&&initial.end<=offset+raw.length)head=start+1+Math.max(0,Math.min(node.content.size,initial.end-offset-prefix));offset+=raw.length+1;});
        view.view.dispatch(view.view.state.tr.setSelection(TextSelection.create(view.view.state.doc,anchor,head)));view.view.dom.scrollTop=initial.scrollTop;
      }
      const save=async()=>{if(!view.ready())return false;if(p.hasPendingInput()){notify('진행 패널의 입력을 적용하거나 닫은 뒤 저장해 주세요.');return false;}const ok=await ports.flush();notify(o.session.summary().status);return ok;};savePort.current=save;
      props.onRegisterInputCheckpoint?.(ports.checkpoint);props.onRegisterSave?.(save,o.status);props.onRegisterDraft?.(o.raw);
      props.onRegisterStructuralDraft?.(()=>null);props.onRegisterCaptureComplete?.(ports.captureComplete);
      props.onRegisterConfirmedSave?.((before,next)=>{if(disposed||progress.current!==p||editor.current!==view||owner.current!==o)return false;const token=p.pendingNoticeToken(),result=ports.confirmed(before,next);if(result.accepted)notify(notice.current.resolve(token)?(result.notify?'해당 날짜의 누적 진행을 저장했습니다.':''):undefined);return result.accepted;});
      props.onRegisterExternalGuard?.(ports.blocksExternalSnapshot);
      props.onRegisterInputLock?.(locked=>{hostLocked.current=locked;const disabled=locked||externalHold.current||!!latest.current.readOnly||latest.current.active===false;if(progressInputs.current)progressInputs.current.disabled=disabled;view.setLocked(disabled);});
      // Source navigation is not silently translated to another task. Retain existing selection.
      props.onRegisterSourceFocus?.(()=>false);view.setLocked(hostLocked.current||externalHold.current||!!current.readOnly||current.active===false);notify('메모·제목 편집 준비됨');
    }catch(error){
      if(!owner.current&&!editor.current&&!progress.current&&(error as Error).message==='PM_HOST_BASELINE_HOLD'){
        publishStatus('서버의 같은 문서를 확인한 뒤 편집기를 연결합니다.');return;
      }
      terminal=true;publishStatus('편집 연결 보류: '+(error as Error).message);props.onDirtyChange?.(true);props.onRegisterCaptureComplete?.(()=>false);props.onRegisterSave?.(async()=>false,()=>({composing:false,saving:false,failed:true}));
    }
    };
    retryInitialConnection.current=connect;connect();
    return()=>{disposed=true;if(retryInitialConnection.current===connect)retryInitialConnection.current=null;editor.current?.destroy();editor.current=null;owner.current=null;progress.current=null;savePort.current=null;
      props.onRegisterInputCheckpoint?.(null);props.onRegisterSave?.(null,null);props.onRegisterDraft?.(null);props.onRegisterStructuralDraft?.(null);props.onRegisterConfirmedSave?.(null);props.onRegisterInputLock?.(null);props.onRegisterSourceFocus?.(null);props.onRegisterCaptureComplete?.(null);props.onRegisterExternalGuard?.(null);};
    // Workspace ACK props never recreate the input owner. The confirmed port advances only its baseline.
  },[props.docId]);
  // Readiness is observed on normal React commits, never by a timer or save.
  // Once an owner exists this is a no-op; ACKs must not replace input/history.
  useEffect(()=>{retryInitialConnection.current?.();});
  useEffect(()=>{if(props.hostContext?.epoch!==ownerEpoch.current){externalHold.current=true;if(progressInputs.current)progressInputs.current.disabled=true;editor.current?.setLocked(true);publishStatus('계정 세대가 바뀌어 기존 입력을 보존 중입니다. 새 세대의 저장 결과를 적용하지 않습니다.');}},[props.hostContext?.epoch]);
  useEffect(()=>{const disabled=hostLocked.current||externalHold.current||!!props.readOnly||props.active===false;if(progressInputs.current)progressInputs.current.disabled=disabled;editor.current?.setLocked(disabled);},[props.readOnly,props.active]);
  useEffect(()=>{const o=owner.current,e=editor.current;if(!o||!e||o.host.hasSubmission())return;
    if(canonical(props.workspace)!==canonical(o.host.current())){
      if(e.ready()&&o.reconcileUnchangedDocument(props.workspace)){publishStatus('현재 문서 입력·선택을 유지하고 다른 문서의 저장 상태를 반영했습니다.');return;}
      externalHold.current=true;if(progressInputs.current)progressInputs.current.disabled=true;e.setLocked(true);publishStatus('다른 문서 상태가 도착해 편집 연결을 보류했습니다. 현재 입력 owner는 유지합니다.');
    }
  },[props.workspace]);
  useEffect(()=>{if(panel&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[panel?.visit]);
  const updatePanel=(change:(p:ProgressPanelOwner)=>void)=>{const p=progress.current;if(!p)return;change(p);setPanel(p.view());latest.current.onDirtyChange?.(!!owner.current?.hasPendingInput()||p.hasPendingInput());};
  const closeProgress=()=>{dialog.current?.close();updatePanel(p=>p.close());};
  async function submitProgress(){const p=progress.current,e=editor.current,o=owner.current;if(!p||!e||!o)return;
    const pending=p.submit();setPanel(p.view());latest.current.onDirtyChange?.(o.hasPendingInput()||p.hasPendingInput());
    const result=await pending;if(progress.current!==p||editor.current!==e)return;e.refreshMetadata();setPanel(p.view());latest.current.onDirtyChange?.(o.hasPendingInput()||p.hasPendingInput());
    if(result.notify)publishStatus(result.ok?'해당 날짜의 누적 진행을 저장했습니다.':progressPanelMessage(result.reason??null),result.noticeToken??null);
  }
  return <section className={styles.editor} aria-label="개인 문서 편집" data-rea-app-editor>
    <div data-editor-tools>{props.noteStatus}{props.noteActions}<button type="button" disabled={props.readOnly} onClick={()=>{void savePort.current?.();}}>저장</button></div>
    <div ref={place}/><p role="status">{status}</p>
    {panel&&<dialog ref={dialog} className={writingStyles.dialog} aria-label="누적 진행률" onKeyDown={event=>{trapProgramDialogTab(event.currentTarget,event);}} onCancel={event=>{event.preventDefault();closeProgress();}}>
      <header><h3>누적 진행률</h3><button type="button" aria-label="닫기" onClick={closeProgress}>×</button></header>
      {panel.reason&&<p role="alert" className={writingStyles.message}>{progressPanelMessage(panel.reason)}</p>}
      <ProgramProgressForm title={panel.title} date={panel.date} percent={panel.percent} history={panel.history}
        inputsRef={progressInputs} locked={!!props.readOnly||hostLocked.current||externalHold.current||props.active===false}
        disabled={!!props.readOnly||panel.phase!=='editing'||hostLocked.current||externalHold.current}
        onDate={value=>updatePanel(p=>p.setDate(value))} onPercent={value=>updatePanel(p=>p.setPercent(value))} onHistory={date=>updatePanel(p=>p.chooseHistory(date))} onSubmit={()=>{void submitProgress();}}/>
    </dialog>}
  </section>;
}


