'use client';

import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createProgramCreatorStructure, prepareProgramCreatorStructure, programCreatorStructureConnection, programCreatorStructureTemplates, reduceProgramCreatorStructure, switchProgramCreatorStructure,
  type ProgramCreatorStructurePrepared, type ProgramCreatorStructurePreparation, type ProgramCreatorStructureSidecar } from '../../../lib/flow/integrated-poc/creator-structure-sidecar';
import type { StructureDraftAction } from '../../../lib/flow/personal-workspace-poc-structure-template/draft';
import type { GroupInstance, StructureTemplateFieldDefinition as Field, StructureTemplateGroupDefinition as Group, StructureTemplateValue as Value } from '../../../lib/flow/personal-workspace-poc-structure-template/types';
import { stableAuthoringJson } from '../../../lib/flow/personal-workspace-poc-structure-template/runtime-adapter';
import styles from './ProgramCreatorStructureForm.module.css';
import { programCreatorStructureCalculations, programCreatorStructureExample, programCreatorStructureFieldLabels, programCreatorStructureFieldVisibility } from '../../../lib/flow/integrated-poc/creator-structure-presentation';

export type ProgramCreatorStructureFormProps = {
  draftId: string; rawText: string; sidecar: ProgramCreatorStructureSidecar | null; disabled?: boolean;
  onChange(next: ProgramCreatorStructureSidecar | null): void;
  onMaterialize(prepared: ProgramCreatorStructurePrepared): Promise<void> | void;
  onCompositionChange?(composing: boolean): void;
  onReturnToSource?(): void;
};
type StructurePanelHandle = { finish(): void };
type StructurePanelProps = { title:string; composing:boolean; disabled:boolean; onReturnToSource?():void; children:React.ReactNode };

/** One mounted form: inline on desktop, user-opened native modal on mobile. */
export const ProgramCreatorStructurePanel = React.forwardRef<StructurePanelHandle,StructurePanelProps>(function StructurePanel({title,composing,disabled,onReturnToSource,children},ref){
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const composition=useRef(composing);composition.current=composing;
  const mode=useRef<boolean|null>(null),updateViewport=useRef<(()=>void)|null>(null);
  const [mobile,setMobile]=useState(false),[fallback,setFallback]=useState(false);
  useEffect(()=>{
    const query=window.matchMedia('(max-width:600px)');
    const resize=()=>{
      if(composition.current||mode.current===query.matches)return;
      const focused=dialog.current?.contains(document.activeElement);
      const hasModal=typeof dialog.current?.showModal==='function';
      if(query.matches&&hasModal||dialog.current?.matches(':modal'))dialog.current?.close?.();
      mode.current=query.matches;setMobile(query.matches);setFallback(!hasModal);
      if(query.matches&&hasModal&&focused)trigger.current?.focus();
    };
    updateViewport.current=resize;resize();query.addEventListener('change',resize);return()=>{query.removeEventListener('change',resize);updateViewport.current=null;};
  },[]);
  useEffect(()=>{if(!composing)updateViewport.current?.();},[composing]);
  const close=(source=false)=>{if(!mobile||fallback||!dialog.current?.open||composing)return;dialog.current.close();if(source)onReturnToSource?.();else trigger.current?.focus();};
  useImperativeHandle(ref,()=>({finish:()=>close(true)}),[mobile,fallback,composing,onReturnToSource]);
  return <><button ref={trigger} type="button" className={styles.mobileTrigger} hidden={fallback} disabled={disabled||composing} aria-haspopup="dialog" onClick={()=>{
    if(!mobile||fallback||disabled||composing||!dialog.current)return;
    dialog.current.showModal();const details=dialog.current.querySelector('details');if(details)details.open=true;
    (dialog.current.querySelector('select')??dialog.current.querySelector('button'))?.focus();
  }}>{title}</button>
    <dialog ref={dialog} open={!mobile||fallback} role={mobile&&!fallback?'dialog':'presentation'} aria-label={mobile&&!fallback?'작성 틀 입력':undefined} className={`${styles.drawer} ${fallback?styles.inlineFallback:''}`} onCancel={event=>{event.preventDefault();close();}}>
      <header className={styles.drawerHeader}><strong>작성 틀 입력</strong><button type="button" disabled={composing} onClick={()=>close()}>작성 틀 닫기</button></header>
      <div className={styles.drawerBody}>{children}</div>
    </dialog>
  </>;
});
const labels: Record<string, string> = { until: '종료일', count: '횟수', anchor_offset: '기준일에서 며칠 전·후', departure_offset: '출발일에서 며칠 전·후', absolute: '날짜 지정', unscheduled: '날짜 미정' };
const weekdays = [['MO','월'],['TU','화'],['WE','수'],['TH','목'],['FR','금'],['SA','토'],['SU','일']] as const;
const same = (a:unknown,b:unknown) => stableAuthoringJson(a) === stableAuthoringJson(b);
const messages: Record<string, string> = { 'nonempty-source': '구조 템플릿은 빈 제작 원문에서 시작합니다. 지금 원문은 그대로 두고 새 제작 초안을 열어 주세요.', 'stale-source': '원문이 바뀌었습니다. 입력한 폼은 보존했습니다. 원문을 되돌리거나 작성 틀 연결을 해제해 주세요.', 'invalid-sidecar': '작성 틀을 읽지 못했습니다. 원문은 바꾸지 않았습니다.', 'already-materialized': '이미 원문에 반영한 작성 틀입니다. 원문을 직접 편집하거나 연결을 해제해 주세요.', composing: '글자 입력을 마친 뒤 다시 눌러 주세요.' };

/** Controlled draft only. Host owns pending input protection, persistence and native Undo. */
export function ProgramCreatorStructureForm({ draftId, rawText, sidecar, disabled = false, onChange, onMaterialize, onCompositionChange, onReturnToSource }: ProgramCreatorStructureFormProps) {
  const templates = programCreatorStructureTemplates();
  const definition = templates.find(t => t.templateId === sidecar?.draft.templateId && t.version === sidecar.draft.templateVersion);
  const example = definition ? programCreatorStructureExample(definition) : null;
  const [composing, setComposing] = useState(false), [preview, setPreview] = useState<ProgramCreatorStructurePrepared | null>(null);
  const [issues, setIssues] = useState<Extract<ProgramCreatorStructurePreparation, {ok:false}>['issues']>([]);
  const [message, setMessage] = useState(''), [pendingTemplate, setPendingTemplate] = useState<string | null>(null);
  const [switchUndo, setSwitchUndo] = useState<{before:ProgramCreatorStructureSidecar;after:ProgramCreatorStructureSidecar} | null>(null);
  const previewTrigger=useRef<HTMLButtonElement>(null), templatePicker=useRef<HTMLSelectElement>(null);
  const panel=useRef<StructurePanelHandle>(null);
  const fieldTargets = useRef(new Map<string, HTMLElement>()), focusedIssues = useRef<typeof issues>(undefined);
  const fieldLabels = definition && sidecar ? programCreatorStructureFieldLabels(definition, sidecar.draft) : new Map<string,string>();
  const locked = disabled && !composing;
  const connection = sidecar ? programCreatorStructureConnection(sidecar, rawText) : null;
  const changed = (next: ProgramCreatorStructureSidecar | null) => { setPreview(null); setIssues([]); setMessage(''); onChange(next); };
  const dispatch = (action: Exclude<StructureDraftAction, {type:'mark_materialized'}>) => {
    if (!sidecar || locked || connection !== 'unmaterialized') return;
    const result = reduceProgramCreatorStructure(sidecar, action, new Date().toISOString());
    if (result.ok) { setSwitchUndo(null); changed(result.value); } else setMessage(messages[result.reason] ?? '입력을 반영하지 못했습니다. 기존 작성 틀은 유지했습니다.');
  };
  function choose(templateId: string, confirmed = false) {
    if (!templateId || locked || composing) return;
    const input = { draftId, templateId, rawText, now: new Date().toISOString(), confirmed };
    const result = sidecar ? switchProgramCreatorStructure(sidecar, input) : createProgramCreatorStructure(input);
    if (result.ok) { setSwitchUndo(sidecar ? {before:sidecar,after:result.value} : null); setPendingTemplate(null); changed(result.value); }
    else if (result.reason === 'confirmation-required') setPendingTemplate(templateId);
    else setMessage(messages[result.reason] ?? '작성 틀을 열지 못했습니다.');
  }
  const field = (f: Field, scope: string, values: Readonly<Record<string, Value>>) => {
    const id = `structure-${draftId}-${scope}-${f.slotId}`, v = values[f.slotId], problems = issues?.filter(p => p.scopeInstanceId === scope && p.slotId === f.slotId) ?? [];
    const visibility = sidecar ? programCreatorStructureFieldVisibility(f,sidecar.draft,values,problems.length>0) : {visible:true,retained:false};
    if (!visibility.visible) return null;
    const targetKey = `${scope}.${f.slotId}`;
    const targetRef = (node: HTMLElement | null) => { if(node)fieldTargets.current.set(targetKey,node);else fieldTargets.current.delete(targetKey); };
    const dismissed = sidecar?.draft.dismissedSlots.some(s => s.scopeInstanceId === scope && s.slotId === f.slotId);
    if (dismissed) return <button ref={targetRef} type="button" key={f.slotId} disabled={locked} onClick={() => dispatch({type:'restore_slot',scopeInstanceId:scope,slotId:f.slotId})}>{f.label} 다시 표시</button>;
    const update = (value: Value) => dispatch({type:'set_value',scopeInstanceId:scope,slotId:f.slotId,value});
    const description = [problems.length ? `${id}-errors` : '',visibility.retained ? `${id}-retained` : ''].filter(Boolean).join(' ') || undefined;
    const common = {id, ref:targetRef, disabled:locked, 'aria-invalid': problems.length > 0 || undefined, 'aria-describedby':description};
    let control: React.ReactNode;
    if (f.type === 'weekday_set') control = <div id={id} ref={targetRef} tabIndex={-1} className={styles.weekdays} role="group" aria-labelledby={`${id}-label`} aria-invalid={common['aria-invalid']} aria-describedby={description}>{weekdays.map(([code,label]) => <label key={code}><input type="checkbox" disabled={locked} checked={Array.isArray(v) && v.includes(code)} onChange={e => update(e.target.checked ? [...(Array.isArray(v) ? v : []),code] : (Array.isArray(v) ? v : []).filter(x => x !== code))}/>{label}</label>)}</div>;
    else if (f.type === 'enum') control = <select {...common} value={typeof v === 'string' ? v : ''} onChange={e => update(e.target.value)}><option value="">선택</option>{f.options?.map(x => <option key={x} value={x}>{labels[x] ?? x}</option>)}</select>;
    else if (f.type === 'long_text' || f.type === 'check_rows') control = <textarea {...common} rows={3} value={f.type === 'check_rows' ? Array.isArray(v) ? v.join('\n') : '' : typeof v === 'string' ? v : ''} onChange={e => update(f.type === 'check_rows' ? e.target.value.split('\n') : e.target.value)}/>;
    else { const numeric = f.type === 'positive_integer' || f.type === 'relative_day_offset';
      control = <input {...common} type={numeric ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : f.type === 'url' ? 'url' : 'text'} step={numeric ? 1 : undefined}
        value={typeof v === 'string' || typeof v === 'number' ? v : ''} onChange={e => update(numeric ? e.target.value === '' ? null : Number(e.target.value) : e.target.value)} />; }
    return <div className={styles.field} key={f.slotId}><label id={`${id}-label`} htmlFor={f.type === 'weekday_set' ? undefined : id}>{f.label}{f.unit ? ` (${f.unit})` : ''}</label>{control}
      {visibility.retained && <small id={`${id}-retained`}>다른 날짜 방식에서 입력한 값입니다. 값을 비우거나 날짜 방식을 다시 선택해 주세요.</small>}
      {f.type === 'check_rows' && <small>한 줄에 하나씩 씁니다.</small>}
      {f.type === 'timezone' && <small>지역 이름으로 씁니다. 예: Asia/Seoul</small>}
      {problems.length > 0 && <ul id={`${id}-errors`} className={styles.errors}>{problems.map((p,i) => <li key={i}>{p.message}</li>)}</ul>}
      {f.requiredAt === 'never' && <button type="button" className={styles.subtle} disabled={locked} onClick={() => dispatch({type:'dismiss_slot',scopeInstanceId:scope,slotId:f.slotId})}>{f.label} 접기</button>}
    </div>;
  };
  const groups = (instances: readonly GroupInstance[], definitions: readonly Group[], parent: string): React.ReactNode => <>{instances.map(g => { const def = definitions.find(x => x.groupId === g.groupId); if (!def) return null;
    return <fieldset key={g.instanceId} className={styles.group}><legend>{def.label} {instances.filter(x => x.groupId === g.groupId).findIndex(x => x.instanceId === g.instanceId) + 1}</legend>
      <div className={styles.fields}>{def.fields.map(f => field(f,g.instanceId,g.values))}</div>{groups(g.children,def.childGroups ?? [],g.instanceId)}
      {def.repeatable && <button type="button" disabled={locked} onClick={() => dispatch({type:'remove_group_instance',instanceId:g.instanceId})}>{def.label} 삭제</button>}</fieldset>;
    })}{definitions.filter(def => def.repeatable || !instances.some(g => g.groupId === def.groupId)).map(def => <button type="button" key={def.groupId} disabled={locked} onClick={() => dispatch({type:'add_group_instance',parentScopeInstanceId:parent,groupId:def.groupId})}>{def.label} 추가</button>)}</>;
  function inspect() {
    if (!sidecar || locked) return;
    const result = prepareProgramCreatorStructure(sidecar,{draftId,rawText,now:new Date().toISOString(),composing});
    if (result.ok) {setPreview(result.value);setIssues([]);setMessage('');}
    else {setPreview(null);setIssues(result.issues ?? []);setMessage(messages[result.reason] ?? '아래 입력을 확인해 주세요. 아직 원문은 바뀌지 않았습니다.');}
  }
  function cancelPreview(){setPreview(null);previewTrigger.current?.focus();}
  return <section className={styles.root} aria-label="구조 템플릿 작성" onCompositionStart={() => {setComposing(true);onCompositionChange?.(true);}} onCompositionEnd={() => {setComposing(false);onCompositionChange?.(false);}}
    onKeyDown={event=>{if(event.key!=='Escape'||event.nativeEvent.isComposing||composing)return;
      if(preview){event.preventDefault();event.stopPropagation();cancelPreview();}
      else if(pendingTemplate){event.preventDefault();event.stopPropagation();setPendingTemplate(null);templatePicker.current?.focus();}}}>
    <ProgramCreatorStructurePanel ref={panel} composing={composing} disabled={locked} onReturnToSource={onReturnToSource} title={sidecar?'작성 틀 열기':'구조 템플릿으로 시작'}>
    <details open={connection==='unmaterialized'||connection==='stale' ? true : undefined}><summary>{connection==='materialized'?'원문에 반영한 작성 틀':'구조 템플릿으로 시작'}</summary>
      {!sidecar || connection === 'unmaterialized' ? <><label className={styles.picker}>작성 틀<select ref={templatePicker} disabled={locked || composing} value={sidecar?.draft.templateId ?? ''} onChange={e => choose(e.target.value)}><option value="">선택</option>{[...new Set(templates.map(t => t.categoryLabel))].map(category => <optgroup key={category} label={category}>{templates.filter(t => t.categoryLabel === category).map(t => <option key={t.templateId} value={t.templateId}>{t.label}</option>)}</optgroup>)}</select></label>
        {pendingTemplate && <div role="alert"><p>작성 틀을 바꾸면 입력한 폼을 교체합니다. 원문은 바뀌지 않습니다.</p><button type="button" disabled={locked} onClick={() => choose(pendingTemplate,true)}>작성 틀 바꾸기</button><button type="button" onClick={() => {setPendingTemplate(null);templatePicker.current?.focus();}}>취소</button></div>}
        {switchUndo && same(sidecar,switchUndo.after) && <button type="button" disabled={locked} onClick={() => {changed(switchUndo.before);setSwitchUndo(null);}}>작성 틀 바꾸기 되돌리기</button>}
        {sidecar && definition && <><h3>{definition.label}</h3>
          {!!issues?.length && <div className={styles.errorSummary} role="alert" tabIndex={-1} aria-label="작성 틀 입력 확인" ref={node=>{if(node&&focusedIssues.current!==issues){focusedIssues.current=issues;node.focus();}}}>
            <p>입력을 확인해 주세요. 원문은 바뀌지 않았습니다.</p><ul>{issues.map((issue,index)=>{
              const key=issue.slotId?`${issue.scopeInstanceId}.${issue.slotId}`:null,label=key?fieldLabels.get(key):null;
              return <li key={index}>{label&&key?<button type="button" onClick={()=>fieldTargets.current.get(key)?.focus()}>{label}: {issue.message}</button>:issue.message}</li>;
            })}</ul>
          </div>}
          {example && <details key={`${sidecar.draft.draftId}:${definition.templateId}:${definition.version}`} className={styles.example} onKeyDown={event=>{
            if(event.key!=='Escape'||event.nativeEvent.isComposing||composing||!event.currentTarget.open)return;
            event.preventDefault();event.stopPropagation();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();
          }}><summary>예시 보기</summary><p>입력 방법을 보여 주는 가상 예시입니다. 내 입력과 원문에는 들어가지 않습니다.</p>
            <strong>{example.title}</strong><p>{example.summary}</p><dl>{example.fields.map((item,index)=><div key={index}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
            <p>원문 예시 일부</p><pre tabIndex={0} aria-label="읽기 전용 원문 예시">{example.source}</pre>
          </details>}
          <div className={styles.fields}>{definition.setupFields.map(f => field(f,'root',sidecar.draft.values))}</div>{groups(sidecar.draft.groups,definition.groups,'root')}
          <div className={styles.actions}><button ref={previewTrigger} type="button" disabled={locked || composing} onClick={inspect}>입력한 내용으로 글 만들기</button></div></>}
      </> : <p>{connection === 'materialized' ? '원문에 반영했습니다. 이어서 원문을 편집할 수 있습니다.' : messages['stale-source']}</p>}
      {message && !issues?.length && <p role="status">{message}</p>}
      {preview && connection==='unmaterialized' && same(sidecar,preview.before) && <section className={styles.preview} aria-label="만들 원문 미리보기"><h3>만들 원문</h3><p>입력한 내용으로 항목 {preview.plan.itemCount}개를 만듭니다. 적용 전까지 원문은 유지됩니다.</p><pre tabIndex={0} aria-label="적용 전 원문">{preview.command.nextRawText}</pre>
        {definition && preview.plan.derivedValues.length>0 && <section aria-label="계산한 일정과 근거" className={styles.calculations}><h4>입력값으로 계산한 일정</h4><ul>{programCreatorStructureCalculations(definition,preview.before.draft,preview.plan.derivedValues).map((value,index)=><li key={index}><strong>{value.label}: {value.value}</strong><ul>{value.sources.map((input,i)=><li key={i}>{input}</li>)}</ul></li>)}</ul></section>}
        <div className={styles.actions}><button type="button" disabled={locked || composing} onClick={async () => {
          // The native editor must be focusable before its browser-owned Undo
          // transaction. An open modal makes that same source editor inert.
          panel.current?.finish();await onMaterialize(preview);
        }}>이 내용으로 원문에 적용</button><button type="button" onClick={cancelPreview}>미리보기 취소</button></div></section>}
      {sidecar && <details><summary>작성 틀 연결</summary><p>연결을 해제해도 원문과 이미 만든 항목은 남습니다.</p><button type="button" disabled={locked || composing} onClick={() => {setSwitchUndo(null);changed(null);}}>작성 틀 연결 해제</button>
        <details><summary>입력·판본 정보</summary><pre>{JSON.stringify(sidecar,null,2)}</pre></details></details>}
    </details>
    </ProgramCreatorStructurePanel>
  </section>;
}
