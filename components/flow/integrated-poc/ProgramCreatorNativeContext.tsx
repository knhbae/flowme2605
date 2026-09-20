'use client';

import React,{useEffect,useRef,useState} from 'react';
import type {NativeCreatorDocumentOwner,NativeCreatorDocumentSource,AuthoringCorrectionOperation} from '../../../lib/flow/integrated-poc/native-creator-document-contract';
import {isNativeCreatorRecoverySource} from '../../../lib/flow/integrated-poc/native-creator-document-contract';
import {applyNativeCreatorDocumentOperation,restoreNativeCreatorDocument,readNativeCreatorSourceDocument,readNativeCreatorDocument,validateNativeCreatorDocumentOwner} from '../../../lib/flow/integrated-poc/native-creator-document';
import {buildProgramNativeCreatorRawSyncOperation} from '../../../lib/flow/integrated-poc/creator-native-workspace';
import type {AuthoringArtifactKind,AuthoringRecurrencePreviewSummary} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/artifact-projection';
import {safeProgramUrl} from '../../../lib/flow/integrated-poc/program-data';
import {stableAuthoringJson} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/identity';
import {authoringDocumentNeedsReview} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/review-policy';
import type {CanonicalAuthoringItem,AuthoringWorkingTextItemPatch} from '../../../lib/flow/integrated-poc/native-creator-vendor/text-authoring/types';
import {nativeInspectorPatch,nativeInspectorLabels,nativeInspectorUnsafeReason,nativeSplitBoundaries,nativeCalendarAlignment,nativeIssueViews,nativeIssueOutcomeLabels} from './creator-native-context-model';
import {createNativeCreatorSourceFocusTarget,type NativeCreatorSourceFocusTarget} from '../../../lib/flow/integrated-poc/creator-native-source-focus';
import type {ProgramEditorFlush} from '../../../lib/flow/integrated-poc/document-action';
import {programErrorMessage} from '../../../lib/flow/integrated-poc/ui-contract';
import styles from './ProgramCreatorNativeContext.module.css';
import { programTemplateResultPolicy } from '../../../lib/flow/integrated-poc/creator-template-result';
import type { ProgramCreatorStructureSidecar } from '../../../lib/flow/integrated-poc/creator-structure-sidecar';

export type ProgramCreatorNativeOperationRequest={expectedOwner:NativeCreatorDocumentOwner;requestId:string;operation:AuthoringCorrectionOperation;now:string};
export type ProgramCreatorNativeRestoreRequest={expectedOwner:NativeCreatorDocumentOwner;requestId:string;source:NativeCreatorDocumentSource;now:string};
type SaveResult={ok:true}|{ok:false;reason:string};
export type ProgramCreatorNativeContextProps={owner:NativeCreatorDocumentOwner;onOperation:(request:ProgramCreatorNativeOperationRequest)=>Promise<SaveResult>;onRestore?:(request:ProgramCreatorNativeRestoreRequest)=>Promise<SaveResult>;readOnly?:boolean;onRegisterEditors?:(api:ProgramEditorFlush|null)=>void;
 selectedItemId?:string|null;onSelectionChange?:(ownerId:string,itemId:string|null)=>void;onOpenSource?:(target:NativeCreatorSourceFocusTarget)=>void|Promise<void>;pendingRawText?:string;prepareRawSyncOperation?:(owner:NativeCreatorDocumentOwner,rawText:string)=>{ok:true;operation:AuthoringCorrectionOperation}|{ok:false;reason:string}};
type Preview={kind:'operation';request:ProgramCreatorNativeOperationRequest;after:NativeCreatorDocumentOwner}|{kind:'restore';request:ProgramCreatorNativeRestoreRequest;after:NativeCreatorDocumentOwner};
function issuePreviewCapture(preview:Preview|null){if(preview?.kind!=='operation'||preview.request.operation.type!=='classify_issue')return '';const operation=preview.request.operation,row=nativeIssueViews(preview.request.expectedOwner.document).find(r=>r.issue.issueId===operation.issueId);return `원문 판단 ID: ${operation.issueId}\n${row?.raw??'원문 연결 확인 필요'}\n선택: ${nativeIssueOutcomeLabels[operation.outcome]}`;}
const roles:Record<CanonicalAuthoringItem['role'],string>={item:'할 일',resource:'자료',guide:'안내',caution:'주의',completion:'완료 기준'};
const gates:Record<string,string>={required:'검토 필요',evidence_recorded:'근거 기록됨',personal_only:'개인 사용만'};
const same=(a:unknown,b:unknown)=>stableAuthoringJson(a)===stableAuthoringJson(b);
const itemSummary=(item:CanonicalAuthoringItem|undefined)=>item?[item.title,`${roles[item.role]} · ${item.included?'결과에 포함':'결과에서 제외'} · 순서 ${item.order+1} · 들여쓰기 ${item.nestingLevel}`,`${item.schedule?.raw??'날짜 미정'}${item.schedule?.time?` · ${item.schedule.time}`:''}`,item.detail??'',item.completion?.doneWhen??'',...item.properties.map(p=>`${p.label}: ${p.value}`),...item.resources.map(r=>`자료: ${r.label} ${r.url}`),...item.sources.map(r=>`출처: ${r.label} ${r.url}`),...item.guides.map(v=>`안내: ${v}`),...item.cautions.map(v=>`주의: ${v}`),...(item.subchecks??[]).map(v=>`하위 항목: ${v.title}`)].filter(Boolean).join('\n'):'해당 항목 없음';
function errorMessage(reason:string){return ({'unsupported-operation':'현재 원문 구조에 이 변경을 적용할 수 없습니다. 입력은 유지했습니다.','history-capacity':'이 작업의 변경 이력 한도에 도달했습니다. 입력을 따로 보관해 주세요.','unsupported-codec':'이 저장본의 구조를 안전하게 읽지 못했습니다. 원본은 그대로 남아 있습니다.'} as Record<string,string>)[reason]??programErrorMessage(reason);}

export function ProgramCreatorNativeComparison({before,after}:{before:NativeCreatorDocumentOwner;after:NativeCreatorDocumentOwner}){
 const beforeItems=new Map(before.document.parseResult.canonical.items.map(item=>[item.itemId,item])),afterItems=new Map(after.document.parseResult.canonical.items.map(item=>[item.itemId,item]));
 const itemIds=[...new Set([...beforeItems.keys(),...afterItems.keys()])].filter(id=>!same(beforeItems.get(id),afterItems.get(id)));
 const beforeGates=before.document.reviewGates??[],afterGates=after.document.reviewGates??[];
 const beforeIssues=nativeIssueViews(before.document),afterIssues=nativeIssueViews(after.document),changedIssues=afterIssues.filter(next=>!same(beforeIssues.find(prior=>prior.issue.issueId===next.issue.issueId)?.issue,next.issue));
 return <section className={styles.comparison} aria-label="구조 변경 미리보기"><h3>적용 전 비교</h3>
  {itemIds.map(id=><div key={id} className={styles.compareRow}><div><h4>현재 작업</h4><pre>{itemSummary(beforeItems.get(id))}</pre></div><div><h4>변경 후</h4><pre>{itemSummary(afterItems.get(id))}</pre></div></div>)}
  {changedIssues.map(next=>{const prior=beforeIssues.find(row=>row.issue.issueId===next.issue.issueId);return <section key={next.issue.issueId} aria-label="원문 판단 비교"><h4>{next.label}</h4><pre>{next.raw}</pre><div className={styles.compareRow}><div><h4>현재 판단</h4><p>{prior?.issue.decision?nativeIssueOutcomeLabels[prior.issue.decision.outcome]:'아직 정하지 않음'}</p></div><div><h4>변경 후 판단</h4><p>{next.issue.decision?nativeIssueOutcomeLabels[next.issue.decision.outcome]:'아직 정하지 않음'}</p><p>{next.issue.decision?.outcome==='convert_to_item'?'원문에 연결된 할 일 한 개를 만듭니다. 날짜를 새로 추정하지 않습니다.':next.issue.decision?.outcome==='hold'?'원문과 확인 필요 상태를 유지합니다.':'원문은 유지하고 실행 항목은 만들지 않습니다.'}</p></div></div><small>원문 판단 ID: {next.issue.issueId}</small></section>;})}
  {!same(beforeGates,afterGates)&&<div className={styles.compareRow}><div><h4>현재 검토</h4>{beforeGates.map(g=><p key={g.gateId}>{g.kind==='safety'?'안전':'권리'} · {gates[g.status]}<br/>{g.evidenceNote}</p>)}</div><div><h4>변경 후 검토</h4>{afterGates.map(g=><p key={g.gateId}>{g.kind==='safety'?'안전':'권리'} · {gates[g.status]}<br/>{g.evidenceNote}</p>)}</div></div>}
  {before.document.rawText!==after.document.rawText&&<div className={styles.compareRow}><div><h4>현재 원문</h4><pre>{before.document.rawText}</pre></div><div><h4>변경 후 원문</h4><pre>{after.document.rawText}</pre></div></div>}
  <p>이 제작 작업만 바꿉니다. 기존 원본 저장소·개인 실행 기록·공개 판본에는 자동으로 반영하지 않습니다.</p>
 </section>;
}

export function ProgramCreatorNativeContext({owner,onOperation,onRestore,onOpenSource,readOnly=false,onRegisterEditors,selectedItemId:requestedItemId,onSelectionChange,pendingRawText,prepareRawSyncOperation=buildProgramNativeCreatorRawSyncOperation}:ProgramCreatorNativeContextProps){
 const valid=validateNativeCreatorDocumentOwner(owner);
 const [selected,setSelected]=useState(requestedItemId===undefined?owner.recordUi.selectedItemId??'':requestedItemId??''),[title,setTitle]=useState(''),[evidence,setEvidence]=useState(''),[gateId,setGateId]=useState('');
 const [preview,setPreview]=useState<Preview|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false);
 const [patch,setPatch]=useState<AuthoringWorkingTextItemPatch|null>(null),[splitAt,setSplitAt]=useState('');
 const state=useRef({dirty:false,dirtyKind:null as 'title'|'evidence'|'inspector'|'split'|null,composing:false,pending:false,locks:0,owner,base:owner,title:'',evidence:'',patch:null as AuthoringWorkingTextItemPatch|null,splitAt:'',pendingRawText,preview:null as Preview|null});state.current.owner=owner;state.current.pendingRawText=pendingRawText;
 const controls=useRef<HTMLDivElement>(null),validRef=useRef(valid);validRef.current=valid;
 const itemButtons=useRef(new Map<string,HTMLButtonElement>()),handledSelection=useRef<string|null>(null);
 const focusResultItem=useRef<{ownerId:string;itemId:string}|null>(null);
 const inspectorCompare=useRef<HTMLButtonElement>(null),inspectorFocus=useRef(false);
 useEffect(()=>{if(inspectorFocus.current&&!busy&&!locked&&!readOnly){inspectorFocus.current=false;inspectorCompare.current?.focus();}},[busy,locked,readOnly,owner.revision]);
 useEffect(()=>{
  const target=focusResultItem.current;if(!target)return;
  if(target.ownerId!==owner.id){focusResultItem.current=null;return;}
  if(busy||locked||readOnly||!valid||pendingRawText!==undefined&&pendingRawText!==owner.document.rawText)return;
  const button=itemButtons.current.get(target.itemId);
  if(button){button.focus();focusResultItem.current=null;}
 },[busy,locked,readOnly,valid,owner.id,owner.revision,selected,pendingRawText]);
 const items=valid?[...owner.document.parseResult.canonical.items].sort((a,b)=>a.order-b.order):[],item=items.find(i=>i.itemId===selected),reviewGates=valid?owner.document.reviewGates??[]:[];
 useEffect(()=>{if(valid)onSelectionChange?.(owner.id,item?.itemId??null);},[onSelectionChange,valid,owner.id,owner.revision,item?.itemId]);
 const rawChanged=pendingRawText!==undefined&&pendingRawText!==owner.document.rawText;
 const disabled=readOnly||busy||locked||rawChanged,hasPending=()=>state.current.dirty||state.current.composing||state.current.pending||!!state.current.preview;
 const capture=()=>[{title:owner.document.title||'제작 구조 입력',raw:`선택한 항목: ${selected}\n제목: ${state.current.title}\n검토 근거: ${state.current.evidence}\n${state.current.patch?Object.entries(state.current.patch).map(([key,value])=>`${nativeInspectorLabels[key as keyof AuthoringWorkingTextItemPatch]}: ${value}`).join('\n'):''}\n나눌 위치: ${state.current.splitAt}\n${issuePreviewCapture(state.current.preview)}\n${state.current.preview?`확인 중인 변경: ${state.current.preview.kind==='operation'?state.current.preview.request.operation.type:'전체 저장본 복구'}\n${state.current.preview.kind==='operation'&&state.current.preview.request.operation.type==='sync_working_text_from_input'?state.current.preview.request.operation.rawText:itemSummary(state.current.preview.after.document.parseResult.canonical.items.find(i=>i.itemId===selected))}`:''}`}];
 function compositionStart(){if(!state.current.dirty)state.current.base=owner;state.current.composing=true;state.current.dirty=true;}
 function beforeInput(event:React.FormEvent){if(readOnly||state.current.pending||state.current.locks||rawChanged)event.preventDefault();}
 useEffect(()=>{onRegisterEditors?.({flushAll:async()=>{if(hasPending()){setMessage('구조 변경을 적용하거나 입력 버리기를 선택해 주세요.');return false;}return true;},hasPendingInput:hasPending,pendingDocumentIds:()=>[],captureDrafts:()=>hasPending()?capture():[],blocksExternalSnapshot:(before,next)=>hasPending()&&!same(before.spaces[before.activeActorId]?.creatorWorkspace?.working,next.spaces[before.activeActorId]?.creatorWorkspace?.working),lockInput:()=>{state.current.locks++;setLocked(true);let released=false;return()=>{if(released)return;released=true;state.current.locks=Math.max(0,state.current.locks-1);setLocked(state.current.locks>0);};}});return()=>onRegisterEditors?.(null);},[onRegisterEditors,owner.id,selected]);
 const guarded=()=>readOnly||state.current.pending||state.current.locks>0||state.current.composing||!validRef.current;
 function choose(id:string){if(guarded())return false;if(hasPending()){setMessage('현재 입력을 먼저 적용하거나 버려 주세요.');return false;}const selected=items.find(i=>i.itemId===id);if(!selected){setMessage('요청한 원본 항목 ID가 현재 구조에 없습니다. 다른 항목으로 대신 연결하지 않았습니다.');return false;}setSelected(id);setTitle(selected.title);setPatch(null);state.current.patch=null;state.current.splitAt='';setSplitAt('');state.current.title=selected.title;state.current.base=owner;setMessage('');return true;}
 useEffect(()=>{
  if(requestedItemId===undefined){handledSelection.current=null;return;}
  const identity=`${owner.id}:${requestedItemId}`;
  if(handledSelection.current===identity)return;
  if(guarded()||hasPending()){setMessage('현재 입력을 먼저 적용하거나 버린 뒤 요청한 항목을 열어 주세요.');return;}
  if(requestedItemId===null){setSelected('');setTitle('');state.current.title='';handledSelection.current=identity;return;}
  if(choose(requestedItemId)){handledSelection.current=identity;itemButtons.current.get(requestedItemId)?.focus();}
  else handledSelection.current=identity;
 },[requestedItemId,owner.id,owner.revision,selected,title,evidence,patch,splitAt,preview,busy,locked,readOnly]);
 function change(kind:'title'|'evidence',value:string){if(readOnly||rawChanged||state.current.pending||state.current.locks||state.current.dirtyKind&&state.current.dirtyKind!==kind)return;if(!state.current.dirty)state.current.base=owner;state.current.dirty=true;state.current.dirtyKind=kind;state.current[kind]=value;state.current.preview=null;setPreview(null);if(kind==='title')setTitle(value);else setEvidence(value);setMessage('');}
 function stage(operation:AuthoringCorrectionOperation){if(guarded()||rawChanged&&operation.type!=='sync_working_text_from_input')return;if(state.current.dirtyKind==='title'&&operation.type!=='rename'||state.current.dirtyKind==='evidence'&&operation.type!=='record_review_decision'||state.current.dirtyKind==='inspector'&&operation.type!=='sync_item_to_working_text'||state.current.dirtyKind==='split'&&operation.type!=='split'){setMessage('현재 입력을 먼저 적용하거나 버려 주세요.');return;}const expectedOwner=state.current.dirty?state.current.base:owner;if(!same(expectedOwner,owner)){setMessage('다른 변경이 먼저 저장됐습니다. 내 입력을 보관한 뒤 현재 구조를 다시 확인해 주세요.');return;}
  if(operation.type==='rename'&&expectedOwner.document.parseResult.canonical.items.find(i=>i.itemId===operation.itemId)?.title===operation.title){setMessage('현재 값과 같아 변경하지 않았습니다.');return;}
  const now=new Date().toISOString(),request={expectedOwner,requestId:`native-ui-${crypto.randomUUID()}`,operation,now},result=applyNativeCreatorDocumentOperation(expectedOwner,request,now);
  if(!result.ok){setMessage(errorMessage(result.reason));return;}if(!result.changed){setMessage(operation.type==='classify_issue'?'이미 결정했거나 이 원문에는 허용되지 않는 선택입니다. 원문과 판단은 바꾸지 않았습니다.':operation.type==='merge'?'날짜·완료 기준·속성이 다르거나 연결 위치가 모호해 합치지 않았습니다.':operation.type==='split'?'선택한 위치에서는 항목을 나눌 수 없습니다.':operation.type==='align_source_order'?'원문 블록을 안전하게 구분할 수 없어 순서를 바꾸지 않았습니다.':'현재 값과 같아 변경하지 않았습니다.');return;}
  const next:Preview={kind:'operation',request,after:result.owner};state.current.preview=next;setPreview(next);setMessage('');
 }
 function restore(){if(guarded()||rawChanged||!onRestore||isNativeCreatorRecoverySource(owner.source))return;if(state.current.dirty){setMessage('입력 중인 변경을 먼저 적용하거나 버려 주세요.');return;}const now=new Date().toISOString(),request={expectedOwner:owner,requestId:`native-restore-ui-${crypto.randomUUID()}`,source:owner.source,now};const result=restoreNativeCreatorDocument(owner,request,now);if(!result.ok){setMessage(errorMessage(result.reason));return;}if(!result.changed){setMessage('처음 가져온 저장본과 같습니다.');return;}const next:Preview={kind:'restore',request,after:result.owner};state.current.preview=next;setPreview(next);}
 function stageRaw(){if(guarded()||state.current.dirty||!rawChanged||pendingRawText===undefined)return;if(!prepareRawSyncOperation){setMessage('원문 변경과 검토 조건을 함께 비교할 연결을 기다리고 있습니다. 입력은 유지했습니다.');return;}const result=prepareRawSyncOperation(owner,pendingRawText);if(!result.ok){setMessage(errorMessage(result.reason));return;}if(result.operation.type!=='sync_working_text_from_input'||result.operation.rawText!==pendingRawText){setMessage('원문 변경의 연결 값이 일치하지 않습니다. 입력은 유지했습니다.');return;}stage(result.operation);}
 function discard(){if(state.current.pending||state.current.locks||state.current.composing)return;state.current.dirty=false;state.current.dirtyKind=null;state.current.preview=null;state.current.base=owner;state.current.title=item?.title??'';state.current.evidence='';state.current.patch=null;state.current.splitAt='';setPatch(null);setSplitAt('');setTitle(item?.title??'');setEvidence('');setPreview(null);setMessage('');}
 function changePatch(key:keyof AuthoringWorkingTextItemPatch,value:string){if(!item||readOnly||rawChanged||state.current.pending||state.current.locks||state.current.dirtyKind&&state.current.dirtyKind!=='inspector')return;if(!state.current.dirty)state.current.base=owner;const next={...(state.current.patch??nativeInspectorPatch(owner.document,item)),[key]:value};state.current.patch=next;state.current.dirty=true;state.current.dirtyKind='inspector';state.current.preview=null;setPatch(next);setPreview(null);setMessage('');}
 function comparePatch(){if(!item||guarded()||rawChanged)return;const value=state.current.patch??nativeInspectorPatch(owner.document,item),reason=nativeInspectorUnsafeReason(owner.document,item,value);if(reason){setMessage(reason);return;}stage({type:'sync_item_to_working_text',itemId:item.itemId,patch:value});}
 function selectSplit(value:string){if(guarded()||rawChanged||state.current.dirtyKind&&state.current.dirtyKind!=='split')return;if(!state.current.dirty)state.current.base=owner;state.current.dirty=true;state.current.dirtyKind='split';state.current.splitAt=value;state.current.preview=null;setPreview(null);setSplitAt(value);setMessage('');}
 function mergeNext(){if(!item||guarded()||rawChanged)return;const step=owner.document.parseResult.canonical.steps.find(s=>s.stepId===item.stepId),index=step?.itemIds.indexOf(item.itemId)??-1,nextId=index>=0?step?.itemIds[index+1]:undefined;if(!nextId){setMessage('같은 단계 안에서 합칠 다음 항목이 없습니다.');return;}stage({type:'merge',itemIds:[item.itemId,nextId]});}
 async function openSource(){if(!item||guarded()||rawChanged||hasPending()||!onOpenSource){setMessage('현재 입력을 적용하거나 명시적으로 버린 뒤 원문을 열어 주세요.');return;}const target=createNativeCreatorSourceFocusTarget(owner,item.itemId);if(!target){setMessage('현재 원문에서 이 항목의 정확한 위치를 찾지 못했습니다. 다른 위치를 대신 열지 않았습니다.');return;}try{await onOpenSource(target);}catch{setMessage('원문 위치를 열지 못했습니다. 현재 입력과 선택은 유지했습니다.');}}
 async function apply(){const captured=state.current.preview;if(readOnly||state.current.pending||state.current.locks||state.current.composing||!captured)return;if(captured.kind==='operation'&&captured.request.operation.type==='sync_working_text_from_input'?captured.request.operation.rawText!==state.current.pendingRawText:state.current.pendingRawText!==undefined&&state.current.pendingRawText!==state.current.owner.document.rawText){setMessage('원문 입력이 바뀌었습니다. 변경된 원문으로 다시 비교해 주세요.');return;}if(!same(captured.request.expectedOwner,state.current.owner)){setMessage('다른 변경이 먼저 저장됐습니다. 비교와 입력은 유지했습니다.');return;}
  state.current.pending=true;setBusy(true);setMessage('');
  try{
   const result=captured.kind==='operation'?await onOperation(captured.request):onRestore?await onRestore(captured.request):{ok:false as const,reason:'missing'};
   if(!result.ok){setMessage(errorMessage(result.reason));return;}
   inspectorFocus.current=captured.kind==='operation'&&captured.request.operation.type==='sync_item_to_working_text';
   state.current.dirty=false;state.current.dirtyKind=null;state.current.preview=null;state.current.evidence='';state.current.patch=null;state.current.splitAt='';
   let nextSelected=selected;
   if(captured.kind==='operation'){
    const operation=captured.request.operation;
    let resultItemId:string|undefined;
    if(operation.type==='merge')resultItemId=operation.itemIds[0];
    else if(operation.type==='split')resultItemId=operation.itemId;
    else if(operation.type==='classify_issue'&&operation.outcome==='convert_to_item'){
     const decision=captured.after.document.parseResult.issues.find(i=>i.issueId===operation.issueId)?.decision;
     if(decision?.outcome==='convert_to_item')resultItemId=decision.targetDraftId;
    }
    if(resultItemId&&captured.after.document.parseResult.canonical.items.some(i=>i.itemId===resultItemId)){
     nextSelected=resultItemId;setSelected(nextSelected);
     focusResultItem.current={ownerId:captured.after.id,itemId:nextSelected};
    }
   }
   state.current.title=captured.after.document.parseResult.canonical.items.find(i=>i.itemId===nextSelected)?.title??'';
   setTitle(state.current.title);setPatch(null);setSplitAt('');setEvidence('');setPreview(null);setMessage('제작 구조를 저장했습니다.');
  }catch{setMessage('변경을 저장하지 못했습니다. 비교와 입력을 유지했습니다.');}
  finally{state.current.pending=false;setBusy(false);}
 }
 const alignment=valid?nativeCalendarAlignment(owner):null,inspector=item?(patch??nativeInspectorPatch(owner.document,item)):null,boundaries=item?nativeSplitBoundaries(item.title):[];
 const source=valid?readNativeCreatorSourceDocument(owner.source):null;
 return <section className={styles.context} aria-label="복구한 제작 구조"><h2>복구한 제작 구조</h2><p>원문 외에 저장된 역할·포함·순서·검토 상태를 유지합니다. 실행·공개 반영은 별도 확인이 필요합니다.</p>
  {message&&<p role="status" className={styles.message}>{message}</p>}
  {!valid?<p role="alert">저장된 구조를 안전하게 읽을 수 없습니다. 현재 자료를 덮어쓰지 않았습니다.</p>:<>
   {rawChanged&&<section className={styles.notice} aria-label="입력 원문 반영"><p>아직 구조에 반영하지 않은 원문 입력이 있습니다. 아래 구조 편집보다 먼저 비교해 주세요.</p><button disabled={readOnly||busy||locked||state.current.dirty} onClick={stageRaw}>원문 변경을 구조에 반영하기 전 비교</button><p>검토 조건은 새 원문에서 다시 확인합니다. 이전 근거와 저장본은 이력에 남습니다.</p></section>}
   {authoringDocumentNeedsReview(owner.document)&&<p className={styles.notice}>해결하지 않은 검토가 있습니다. 구조 편집만으로 검토가 끝나지는 않습니다.</p>}
   <div className={styles.layout}><nav aria-label="저장된 구조 항목"><ol className={styles.itemList}>{items.map(row=><li key={row.itemId}><button ref={element=>{if(element)itemButtons.current.set(row.itemId,element);else itemButtons.current.delete(row.itemId);}} type="button" disabled={disabled} aria-current={selected===row.itemId?'true':undefined} onClick={()=>choose(row.itemId)}><span>{row.title}</span><small>{roles[row.role]} · {row.included?'포함':'제외'}{row.nestingLevel>0?` · 들여쓰기 ${row.nestingLevel}`:''}</small></button></li>)}</ol>{!items.length&&<p>저장된 항목이 없습니다. 원문과 검토 자료는 아래에서 볼 수 있습니다.</p>}</nav>
   <div ref={controls} className={styles.editor} onBeforeInput={beforeInput} onCompositionStart={compositionStart} onCompositionEnd={()=>{state.current.composing=false;}}>
    {item?<><h3>{item.title}</h3><label>작업 항목 제목<input disabled={disabled} value={state.current.dirty?title:item.title} onChange={event=>change('title',event.target.value)}/></label><button disabled={disabled||!title.trim()} onClick={()=>stage({type:'rename',itemId:item.itemId,title})}>제목 변경 비교</button>
     <div className={styles.actions}><button disabled={disabled||state.current.dirty} onClick={()=>stage({type:item.included?'exclude':'include',itemId:item.itemId})}>{item.included?'결과에서 제외 비교':'결과에 포함 비교'}</button><label>항목 역할<select value={item.role} disabled={disabled||state.current.dirty} onChange={event=>stage({type:'change_role',itemId:item.itemId,role:event.target.value as CanonicalAuthoringItem['role']})}>{Object.entries(roles).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
     <div className={styles.actions}><button disabled={disabled||state.current.dirty||items.indexOf(item)===0} onClick={()=>stage({type:'reorder',itemId:item.itemId,toIndex:Math.max(0,items.indexOf(item)-1)})}>위로 이동 비교</button><button disabled={disabled||state.current.dirty||items.indexOf(item)===items.length-1} onClick={()=>stage({type:'reorder',itemId:item.itemId,toIndex:items.indexOf(item)+1})}>아래로 이동 비교</button><button disabled={disabled||state.current.dirty} onClick={()=>stage({type:'indent',itemId:item.itemId})}>들여쓰기 비교</button><button disabled={disabled||state.current.dirty||item.nestingLevel===0} onClick={()=>stage({type:'outdent',itemId:item.itemId})}>내어쓰기 비교</button></div>
     <details><summary>항목 합치기·나누기</summary><button disabled={disabled||state.current.dirty} onClick={mergeNext}>같은 단계의 다음 항목과 합치기 비교</button><p>서로 다른 날짜·완료 기준·속성은 자동으로 합치지 않습니다. 연결된 원문은 보존합니다.</p>
      {boundaries.length?<><label>제목을 나눌 위치<select value={splitAt} disabled={disabled||!!state.current.dirtyKind&&state.current.dirtyKind!=='split'} onChange={event=>selectSplit(event.target.value)}><option value="">위치 선택</option>{boundaries.map(b=><option key={b.at} value={String(b.at)}>{b.left} / {b.right}</option>)}</select></label><button disabled={disabled||!splitAt} onClick={()=>{if(boundaries.some(b=>b.at===Number(splitAt)))stage({type:'split',itemId:item.itemId,at:Number(splitAt)});}}>선택한 위치에서 나누기 비교</button><p>상세·날짜·자료는 두 항목에 함께 이어집니다. 적용 전 두 결과를 확인하세요.</p></>:<p>제목에 나눌 수 있는 띄어쓰기가 없습니다.</p>}
     </details>
     <details><summary>상세 내용과 작업 원문 함께 수정</summary><p>비어 있는 설명·일정 등도 추가할 수 있습니다. 자료·출처·안내·주의 추가와 표·중복 속성 편집은 연결된 원문에서 해 주세요.</p>
      <div className={styles.propertyGrid}>{inspector&&(Object.keys(nativeInspectorLabels) as (keyof AuthoringWorkingTextItemPatch)[]).map(key=><label key={key}>{nativeInspectorLabels[key]}<textarea rows={key==='detail'?3:1} disabled={disabled||!!state.current.dirtyKind&&state.current.dirtyKind!=='inspector'} value={inspector[key]} onChange={event=>changePatch(key,event.target.value)}/></label>)}</div>
      <button ref={inspectorCompare} disabled={disabled||!!state.current.dirtyKind&&state.current.dirtyKind!=='inspector'} onClick={comparePatch}>상세 내용과 원문 변경 비교</button>
     </details>
     <dl><dt>저장된 일정</dt><dd>{item.schedule?.raw??'날짜 미정'}{item.schedule?.time?` · ${item.schedule.time}`:''}{item.recurrence?` · ${item.recurrence.raw}`:''}</dd><dt>완료 기준</dt><dd>{item.completion?.doneWhen??'별도 기준 없음'}</dd></dl>
     <details><summary>연결된 원문·처음 저장된 설정</summary><pre>{item.sourceRowIds.map(id=>owner.document.parseResult.canonical.sourceRows.find(r=>r.sourceRowId===id)?.rawText??`원문 행 없음: ${id}`).join('\n')}</pre><p>{itemSummary(source?.parseResult.canonical.items.find(i=>i.itemId===item.itemId))}</p><small>항목 ID: {item.itemId}</small></details>
     {onOpenSource&&<button disabled={disabled||hasPending()} onClick={()=>void openSource()}>이 항목의 원문 위치 열기</button>}
    </>:<p>편집할 항목을 선택하세요.</p>}
   </div></div>
   <details className={styles.review}><summary>문장과 미해석 원문 확인{owner.document.parseResult.issues.length?` · ${owner.document.parseResult.issues.length}곳`:''}</summary><p>문장은 원문으로 남겨도 됩니다. 할 일로 만들기는 직접 선택한 원문에만 적용합니다. 보류는 안전·권리·날짜 검토를 해제하지 않습니다.</p>
    {nativeIssueViews(owner.document).map(row=><section key={row.issue.issueId} aria-label={`${row.label} · ${row.issue.issueId}`}><h3>{row.label}</h3><pre>{row.raw}</pre><p>{row.issue.sourceRange.startLine}행{row.issue.sourceRange.endLine!==row.issue.sourceRange.startLine?`~${row.issue.sourceRange.endLine}행`:''} · {row.state==='resolved'?'결정됨':row.state==='held'?'보류 중':'아직 정하지 않음'}{row.issue.blocking?' · 확인 필요':''}</p>{row.issue.inputValue&&<p>확인할 값: {row.issue.inputValue}</p>}{row.issue.expectedFormat&&<p>입력 형식: {row.issue.expectedFormat}</p>}{row.issue.decision&&<p>저장한 판단: {nativeIssueOutcomeLabels[row.issue.decision.outcome]}</p>}
     <div className={styles.actions}>{row.outcomes.map(outcome=><button key={outcome} disabled={disabled||hasPending()} onClick={()=>stage({type:'classify_issue',issueId:row.issue.issueId,outcome})}>{nativeIssueOutcomeLabels[outcome]} 비교</button>)}</div>{!row.outcomes.length&&<p>이 판단에는 추가 선택을 자동으로 만들지 않습니다. 이전 상태는 작업 되돌리기로 복구할 수 있습니다.</p>}
    </section>)}{!owner.document.parseResult.issues.length&&<p>별도로 판단할 미해석 원문이 없습니다.</p>}
   </details>
   <details><summary>Calendar 결과순으로 작업 원문 맞추기</summary><p>실제 Calendar의 첫 회차 순서를 같은 단계 안에서 사용합니다. Calendar에 없는 항목은 상대 순서를 유지하며 뒤에 둡니다.</p>{alignment?.differs?<><div className={styles.compareRow}><div><h4>현재 순서</h4><ol>{alignment.beforeTitles.map((value,index)=><li key={index}>{value}</li>)}</ol></div><div><h4>Calendar 순서</h4><ol>{alignment.afterTitles.map((value,index)=><li key={index}>{value}</li>)}</ol></div></div><button disabled={disabled||hasPending()} onClick={()=>stage({type:'align_source_order',orderedItemIds:alignment.orderedItemIds})}>Calendar 순서로 원문 변경 비교</button></>:<p>현재 표시할 Calendar 순서 변경이 없습니다.</p>}<p>나눈 항목이 같은 원문 블록을 공유하는 등 위치가 모호하면 적용하지 않습니다.</p></details>
   <details className={styles.review}>
    <summary>원본 검토 상태{reviewGates.length?` · ${reviewGates.length}개`:''}</summary>
    {reviewGates.length?<>
     <label>검토 항목<select value={gateId} disabled={disabled||hasPending()} onChange={event=>{setGateId(event.target.value);setEvidence('');state.current.evidence='';}}><option value="">검토 선택</option>{reviewGates.map(g=><option key={g.gateId} value={g.gateId}>{g.kind==='safety'?'안전':'권리'} · {gates[g.status]}</option>)}</select></label>
     {reviewGates.filter(g=>g.gateId===gateId).map(g=><section key={g.gateId}>
      <p>{g.reasonKey} · {gates[g.status]}</p>{g.evidenceNote&&<p>저장된 근거: {g.evidenceNote}</p>}
      <pre>{g.sourceRowIds.map(id=>owner.document.parseResult.canonical.sourceRows.find(r=>r.sourceRowId===id)?.rawText??`원문 행 없음: ${id}`).join('\n')}</pre>
      <label>검토 근거<textarea value={evidence} disabled={disabled||state.current.dirtyKind==='title'} onBeforeInput={beforeInput} onCompositionStart={compositionStart} onCompositionEnd={()=>{state.current.composing=false;}} onChange={event=>change('evidence',event.target.value)}/></label>
      <div className={styles.actions}>
       <button disabled={disabled||!evidence.trim()||state.current.dirtyKind==='title'} onClick={()=>stage({type:'record_review_decision',gateId:g.gateId,status:'evidence_recorded',evidenceNote:evidence})}>근거 기록 비교</button>
       <button disabled={disabled||state.current.dirtyKind==='title'} onClick={()=>stage({type:'record_review_decision',gateId:g.gateId,status:'personal_only',...(evidence.trim()?{evidenceNote:evidence}:{})})}>개인 사용만 비교</button>
       {g.status!=='required'&&<button disabled={disabled||state.current.dirty} onClick={()=>stage({type:'reopen_review',gateId:g.gateId})}>다시 검토 필요로 비교</button>}
      </div>
      <p>근거 기록은 원래 검토 규칙을 따릅니다. 의료·법률 검증이나 공개 승인 사실을 새로 만들지 않습니다.</p>
     </section>)}
    </>:<p>이 저장본에 별도 검토 항목은 없습니다.</p>}
   </details>
   <details><summary>원문과 저장 출처</summary><p>{isNativeCreatorRecoverySource(owner.source)?<>기존 임시복구본 {owner.source.recoveryId}</>:<>기존 저장본 {owner.source.versionId}</>} · 원래 문서 {owner.document.documentId}</p><pre>{owner.document.rawText}</pre>{owner.document.sourceState&&<p>원본 비교 상태: {owner.document.sourceState.status==='current'?'현재 원본':owner.document.sourceState.status}</p>}{onRestore&&!isNativeCreatorRecoverySource(owner.source)&&<button disabled={disabled||state.current.dirty} onClick={restore}>처음 가져온 전체 저장본으로 복구 비교</button>}</details>
   {preview&&<><ProgramCreatorNativeComparison before={preview.request.expectedOwner} after={preview.after}/><div className={styles.actions}><button className={styles.primary} disabled={readOnly||busy} onClick={()=>void apply()}>비교한 구조 적용</button><button disabled={busy} onClick={()=>{state.current.preview=null;setPreview(null);}}>비교 닫고 계속 편집</button></div></>}
   {hasPending()&&<button disabled={busy||locked} onClick={discard}>미확정 구조 입력 버리기</button>}
  </>}
 </section>;
}

export function programNativeResultExpansion(summaries:AuthoringRecurrencePreviewSummary[],finiteLimit:number,weeks:number){
 const finite=summaries.some(s=>s.hasMore&&s.mode!=='open_ended'&&finiteLimit<Math.min(10000,s.totalCount??10000));
 const openEnded=summaries.some(s=>s.hasMore&&s.mode==='open_ended'&&weeks<520);
 const limited=summaries.some(s=>s.hasMore&&(s.mode==='open_ended'?weeks>=520:finiteLimit>=10000));
 return{finite,openEnded,canExpand:finite||openEnded,limited};
}

/** Read-only original D2 artifact projection. Never falls back to reparsed raw. */
export function ProgramCreatorNativeResult({owner,onOpenItem,structure,draftId}:{owner:NativeCreatorDocumentOwner;today?:string;onOpenItem?:(itemId:string)=>void;structure?:ProgramCreatorStructureSidecar;draftId?:string}){
 const [chosen,setChosen]=useState<AuthoringArtifactKind|null>(null),[finiteLimit,setFiniteLimit]=useState(30),[weeks,setWeeks]=useState(4);
 const read=readNativeCreatorDocument(owner,{finiteOccurrenceLimit:finiteLimit,openEndedOccurrenceWeeks:weeks});
 if(!read.ok)return <section className={styles.context} aria-label="복구한 제작 결과"><h2>복구한 제작 결과</h2><p role="alert">저장된 구조의 결과를 읽지 못했습니다. 원문을 다시 해석한 결과로 대신 표시하지 않습니다.</p></section>;
 const projection=read.projection,policy=draftId?programTemplateResultPolicy(structure,draftId,read.document,projection):null;
 const offered=policy?.artifacts??(['calendar','todo','sheet','memo'] as const);
 const kind=chosen&&offered.includes(chosen)?chosen:policy?.primary??projection.primaryArtifact,view=projection.artifacts[kind],labels:Record<AuthoringArtifactKind,string>={calendar:'캘린더',todo:'할 일',sheet:'시트',memo:'메모'};
 const expansion=programNativeResultExpansion(view.recurrenceSummaries,finiteLimit,weeks);
 const link=(entry:{label?:string;url:string},index:number)=>safeProgramUrl(entry.url)?<a key={`${entry.url}-${index}`} href={entry.url} target="_blank" rel="noreferrer noopener">{entry.label||entry.url}</a>:<span key={`${entry.url}-${index}`}>{entry.label} · {entry.url} (링크 열기 불가)</span>;
 return <section className={styles.context} aria-label="복구한 제작 결과"><h2>{projection.title}</h2><p>저장된 포함·역할·순서를 적용한 제작 결과입니다. 체크 표시는 원문 내용이며 개인 완료 기록이 아닙니다.</p>
  <nav className={styles.actions} aria-label="제작 결과 종류">{offered.map(key=><button key={key} aria-pressed={kind===key} onClick={()=>setChosen(key)}>{labels[key]} · {projection.artifacts[key].count}</button>)}</nav>
  <p>포함 {projection.counts.included}개 · 제외 {projection.counts.excluded}개{view.dateRange?` · ${view.dateRange.start} — ${view.dateRange.end}`:''}</p>
  {authoringDocumentNeedsReview(read.document)&&<p className={styles.notice}>원본 검토가 남아 있습니다. 결과 미리보기가 공개·외부 출력 승인을 뜻하지 않습니다.</p>}
  {!view.eligible&&<p>이 구조는 {labels[kind]}에 바로 옮길 수 없습니다. 아래 원문과 제외 사유를 확인하세요.</p>}
  {kind==='sheet'&&view.rows.length?<div className={styles.tableScroll} tabIndex={0} role="region" aria-label="저장된 시트 결과"><table><thead><tr>{(view.sheetColumns??[{key:'title',label:'항목'}]).map(column=><th key={column.key} scope="col">{column.label}</th>)}</tr></thead><tbody>{view.rows.map(row=><tr key={row.rowId}>{(view.sheetColumns??[{key:'title',label:'항목'}]).map(column=><td key={column.key}>{column.key==='title'&&onOpenItem?<button onClick={()=>onOpenItem(row.itemId)}>{row.title}</button>:row.sheetCells?.[column.key]??(column.key==='title'?row.title:'')}</td>)}</tr>)}</tbody></table></div>:<ol className={styles.resultRows}>{view.rows.map(row=><li key={row.rowId}><header>{onOpenItem?<button onClick={()=>onOpenItem(row.itemId)}>{row.title}</button>:<h3>{row.title}</h3>}{row.occurrenceIndex!==undefined&&<small>회차 {row.occurrenceIndex}</small>}</header>
   <p>{row.date??'날짜 미정'}{row.time?` · ${row.time}`:''}{row.timezone?` · ${row.timezone}`:''}{row.sourceExpression?` · 원문 ${row.sourceExpression}`:''}</p>
   {row.sourceChecked!==undefined&&<p>원문 체크: {row.sourceChecked?'체크됨':'체크 안 됨'}</p>}{row.description&&<p>{row.description}</p>}{row.completion&&<p>완료 기준: {row.completion}</p>}{row.condition&&<p>실행 조건: {row.condition}</p>}{row.caution&&<p>주의: {row.caution}</p>}{row.place&&<p>장소: {row.place}</p>}{row.durationMinutes!==undefined&&<p>소요 시간: {row.durationMinutes}분</p>}{row.repeat&&<p>반복: {row.repeat}</p>}
   {row.subchecks.length>0&&<ul>{row.subchecks.map(sub=><li key={sub.subcheckId}>{sub.sourceChecked?'☑':'☐'} {sub.title}</li>)}</ul>}
   {(row.resources.length>0||!!row.sources?.length)&&<div className={styles.links}>{row.resources.length>0&&<div>자료: {row.resources.map(link)}</div>}{!!row.sources?.length&&<div>출처: {row.sources.map(link)}</div>}</div>}
   {row.validations.map((issue,i)=><p key={i} className={styles.notice}>{issue.message}</p>)}
  </li>)}</ol>}
  {view.textBlocks.map(block=><pre key={block.blockId}>{block.rawText}</pre>)}
  {view.longDocumentTables?.map(table=><details key={table.tableId}><summary>원문 표 · {table.logicalCellCount}칸 · {table.state}</summary><p>원래 표 자료이며 실행 항목으로 바꾸지 않았습니다.</p><pre>{table.rawText}</pre>{table.issues.map((issue,index)=><p key={index}>{issue}</p>)}</details>)}
  {view.recurrenceSummaries.length>0&&<section aria-label="반복 미리보기 범위">{view.recurrenceSummaries.map(summary=><p key={summary.itemId}>{summary.label} · {summary.visibleCount}회 표시{summary.totalCount!==undefined?` / 전체 ${summary.totalCount}회`:` / ${summary.visibleWeeks}주 범위`}{summary.hasMore?' · 이후 회차 있음':''}</p>)}{expansion.canExpand&&<button onClick={()=>{if(expansion.finite)setFiniteLimit(limit=>Math.min(10000,limit+30));if(expansion.openEnded)setWeeks(value=>Math.min(520,value+4));}}>다음 반복 범위 더 보기</button>}{expansion.limited&&<p>일부 반복은 PoC 미리보기 한도에 도달했습니다. 전체 반복이 끝났다는 뜻은 아닙니다. 유한 반복은 최대 10,000회, 종료일 없는 반복은 최대 520주까지 표시합니다.</p>}</section>}
  {view.losses.length>0&&<details><summary>이 결과에서 빠진 원문·조건 · {view.losses.length}개</summary>{view.losses.map(loss=><p key={loss.lossId}>{loss.message}{loss.itemId?` · ${owner.document.parseResult.canonical.items.find(item=>item.itemId===loss.itemId)?.title??loss.itemId}`:''}</p>)}</details>}
  {!view.rows.length&&!view.textBlocks.length&&<p>이 보기에 표시할 항목이 없습니다. 다른 결과 종류와 저장된 원문을 확인하세요.</p>}
  <details><summary>보존된 전체 원문</summary><pre>{read.document.rawText}</pre></details>
  <p>제작 설정으로 계산한 미리보기입니다. 개인 실행 기록과 공개 판본은 바뀌지 않습니다.</p>
 </section>;
}
