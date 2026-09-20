import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {createProgramCreatorStructure,programCreatorStructureTemplates,type ProgramCreatorStructureSidecar} from '../../../lib/flow/integrated-poc/creator-structure-sidecar';
import {listPersonalWorkspacePocStructureTemplatePreviews} from '../../../lib/flow/personal-workspace-poc-structure-template/preview-adapter';
import type {ProgramCreatorStructureFormProps} from './ProgramCreatorStructureForm';
const url=new URL('./ProgramCreatorStructureForm.tsx',import.meta.url),require=createRequire(url),source=readFileSync(url,'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
function load(react=React,browser?:{window:unknown;document:unknown}){const m={exports:{}};vm.runInThisContext(`(function(module,exports,require,window,document){${compiled}\n})`)(m,m.exports,(id:string)=>id==='react'?react:id.endsWith('.css')?{__esModule:true,default:new Proxy({},{get:(_t,k)=>String(k)})}:require(id),browser?.window,browser?.document);return m.exports as typeof import('./ProgramCreatorStructureForm');}
const {ProgramCreatorStructureForm}=load();
test('six actual empty template forms expose typed fields and explicit materialization, not fixture raw',()=>{
  for(const t of programCreatorStructureTemplates()){
    const r=createProgramCreatorStructure({draftId:'form',templateId:t.templateId,rawText:'',now:'2026-09-12T18:20:00Z'});assert(r.ok);
    let writes=0;const html=renderToStaticMarkup(<ProgramCreatorStructureForm draftId="form" rawText="" sidecar={r.value} onChange={()=>writes++} onMaterialize={()=>{writes++;}}/>);
    assert.match(html,/입력한 내용으로 글 만들기/);assert.match(html,/작성 틀 연결 해제/);assert.match(html,/&quot;values&quot;: \{\}/);assert.equal(writes,0);
    for(const f of t.setupFields){
      const controlId=`id="structure-form-root-${f.slotId}"`;
      assert.equal(html.includes(controlId),!['when_end_mode_until','when_end_mode_count'].includes(f.requiredAt),`${t.templateId}.${f.slotId}`);
    }
    assert(!html.includes('확인한 구조 예시로 시작'));
  }
});
type Element=React.ReactElement<Record<string,any>>;
function nodes(node:React.ReactNode):Element[]{if(!React.isValidElement(node))return Array.isArray(node)?node.flatMap(nodes):[];const e=node as Element;return [e,...nodes(e.props.children)];}
function text(node:React.ReactNode):string {if(node===null||node===undefined||typeof node==='boolean')return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join('');return React.isValidElement(node)?text((node as Element).props.children):'';}

// Invoke the real panel hooks/handlers with a DOM-shaped adapter. Native focus
// containment, hit testing and viewport layout are checked in the browser too.
function panelHarness(initialMobile:boolean,supported=true){
  let cursor=0,composing=false,disabled=false,previousOpen:boolean|undefined,returned=0,closed=0,shown=0;
  const slots:any[]=[],effects:Array<()=>void>=[],cleanups:Array<()=>void>=[];
  const document={activeElement:null as any},picker={focus:()=>{document.activeElement=picker;}},trigger={focus:()=>{document.activeElement=trigger;}},details={open:false};
  const dialog={open:false,modal:false,contains:(target:any)=>target===picker,close:()=>{closed++;dialog.open=false;dialog.modal=false;},matches:()=>dialog.modal,
    showModal:supported?()=>{shown++;dialog.open=true;dialog.modal=true;}:undefined,querySelector:(selector:string)=>selector==='details'?details:picker};
  const listeners=new Set<()=>void>(),query={matches:initialMobile,addEventListener:(_name:string,fn:()=>void)=>listeners.add(fn),removeEventListener:(_name:string,fn:()=>void)=>listeners.delete(fn)};
  const hooks={...React,useState:(v:any)=>{const i=cursor++;if(!(i in slots))slots[i]=v;return[slots[i],(next:any)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
    useRef:(v:any)=>{const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i];},
    useEffect:(fn:()=>void|(()=>void),deps:unknown[])=>{const i=cursor++,previous=slots[i];if(!previous||deps.some((v,index)=>v!==previous[index])){slots[i]=deps;effects.push(()=>{const cleanup=fn();if(cleanup)cleanups.push(cleanup);});}},
    useImperativeHandle:(ref:any,fn:()=>any)=>{cursor++;ref.current=fn();}};
  const Panel=(load(hooks as typeof React,{window:{matchMedia:()=>query},document}).ProgramCreatorStructurePanel as any).render;
  const ref={current:null as any},child=<input defaultValue="이미 입력한 값"/>;
  function render(){cursor=0;const tree=nodes(Panel({title:'작성 틀 열기',composing,disabled,onReturnToSource:()=>returned++,children:child},ref));
    const modal=tree.find(n=>n.type==='dialog')!,openButton=tree.find(n=>n.props['aria-haspopup']==='dialog')!;
    modal.props.ref.current=dialog;openButton.props.ref.current=trigger;
    if(previousOpen!==modal.props.open){dialog.open=modal.props.open;previousOpen=modal.props.open;}
    return{tree,modal,openButton,closeButton:tree.find(n=>n.type==='button'&&text(n)==='작성 틀 닫기')!};
  }
  function settle(){render();while(effects.length){effects.shift()!();render();}return render();}
  settle();
  return{render,settle,dialog,document,picker,trigger,child,ref,counts:()=>({returned,closed,shown}),listeners,
    resize(value:boolean){query.matches=value;listeners.forEach(fn=>fn());return settle();},compose(value:boolean){composing=value;return settle();},disable(value:boolean){disabled=value;return settle();},unmount(){cleanups.forEach(fn=>fn());}};
}

test('SC-D01 desktop mount stays inline; mobile opens the same child only on request and cancel returns focus',()=>{
  const desktop=panelHarness(false);assert(desktop.dialog.open);assert.equal(desktop.render().modal.props.role,'presentation');assert.equal(desktop.counts().closed,0);
  const h=panelHarness(true);assert(!h.dialog.open);assert(h.render().tree.includes(h.child));
  h.render().openButton.props.onClick();assert(h.dialog.modal);assert.equal(h.document.activeElement,h.picker);
  let prevented=0;h.render().modal.props.onCancel({preventDefault(){prevented++;}});
  assert.equal(prevented,1);assert(!h.dialog.open);assert.equal(h.document.activeElement,h.trigger);assert.equal(h.counts().returned,0);
  h.render().openButton.props.onClick();h.ref.current.finish();assert.equal(h.counts().returned,1);assert(!h.dialog.open);assert(h.render().tree.includes(h.child));
});

test('SC-D02 resize retains the same form; IME defers mode changes and cannot dismiss the modal',()=>{
  const h=panelHarness(true);h.render().openButton.props.onClick();h.compose(true);const before=h.counts();
  h.render().modal.props.onCancel({preventDefault(){}});h.ref.current.finish();assert.deepEqual(h.counts(),before);assert(h.dialog.modal);
  h.resize(false);assert.equal(h.render().modal.props.role,'dialog');assert(h.dialog.modal);
  h.compose(false);assert(h.dialog.open);assert(!h.dialog.modal);assert.equal(h.render().modal.props.role,'presentation');assert(h.render().tree.includes(h.child));
  h.resize(true);assert(!h.dialog.open);assert.equal(h.document.activeElement,h.trigger);h.unmount();assert.equal(h.listeners.size,0);
});

test('SC-D03 locked trigger cannot open; missing native modal support leaves an inline form',()=>{
  const h=panelHarness(true);h.disable(true);h.render().openButton.props.onClick();assert(!h.dialog.open);assert.equal(h.counts().shown,0);
  const fallback=panelHarness(true,false);assert(fallback.dialog.open);assert(fallback.render().openButton.props.hidden);assert.equal(fallback.render().modal.props.role,'presentation');
  fallback.render().openButton.props.onClick();assert.equal(fallback.counts().shown,0);assert(fallback.render().tree.includes(fallback.child));
});
test('controlled handlers retain form fields, preview cancel is raw-zero and deserialized sidecar does not dismiss preview',async()=>{
  const state:any[]=[];let cursor=0;const hooks={...React,useState:(initial:unknown)=>{const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],(v:unknown)=>{state[i]=typeof v==='function'?v(state[i]):v;}];},useRef:(value:unknown)=>{const i=cursor++;if(!(i in state))state[i]={current:value};return state[i];}};
  const Component=load(hooks as typeof React).ProgramCreatorStructureForm;
  let sidecar:ProgramCreatorStructureSidecar|null=null,applies=0,changes=0;
  const props:ProgramCreatorStructureFormProps={draftId:'form',rawText:'',sidecar,onChange:next=>{sidecar=next;changes++;},onMaterialize:()=>{applies++;}};
  const render=()=>{cursor=0;return nodes(Component({...props,sidecar}));};
  render().find(e=>e.type==='select')!.props.onChange({target:{value:'moving-dday-v1'}});assert(sidecar);
  const change=(suffix:string,value:string)=>{const e=render().find(e=>typeof e.props.id==='string'&&e.props.id.endsWith(suffix)&&['input','select'].includes(String(e.type)));assert(e,suffix);e.props.onChange({target:{value}});};
  change('-flow_title','나의 이사');change('-anchor_date','2026-10-01');change('-step_title','주소 이전');change('-item_title','전입 준비');change('-schedule_mode','unscheduled');
  const button=(label:string)=>{const e=render().find(e=>e.type==='button'&&text(e.props.children)===label);assert(e,label);return e;};
  button('입력한 내용으로 글 만들기').props.onClick();assert(render().some(e=>e.props['aria-label']==='만들 원문 미리보기'));assert.equal(applies,0);assert.equal(props.rawText,'');
  sidecar=JSON.parse(JSON.stringify(sidecar));assert(render().some(e=>e.props['aria-label']==='만들 원문 미리보기'));
  button('미리보기 취소').props.onClick();assert(!render().some(e=>e.props['aria-label']==='만들 원문 미리보기'));assert.equal(applies,0);
  button('입력한 내용으로 글 만들기').props.onClick();const escape=render().find(e=>e.props['aria-label']==='구조 템플릿 작성')!;let focused=0;button('입력한 내용으로 글 만들기').props.ref.current={focus:()=>focused++};
  escape.props.onKeyDown({key:'Escape',nativeEvent:{isComposing:true},preventDefault(){},stopPropagation(){}});assert(render().some(e=>e.props['aria-label']==='만들 원문 미리보기'));
  escape.props.onKeyDown({key:'Escape',nativeEvent:{isComposing:false},preventDefault(){},stopPropagation(){}});assert(!render().some(e=>e.props['aria-label']==='만들 원문 미리보기'));assert.equal(applies,0);assert.equal(focused,1);
  button('입력한 내용으로 글 만들기').props.onClick();props.rawText='원문 변경';assert(!render().some(e=>e.props['aria-label']==='만들 원문 미리보기'));props.rawText='';
  const applyOrder:string[]=[];props.onMaterialize=()=>{applyOrder.push('native source command');applies++;};
  button('입력한 내용으로 글 만들기').props.onClick();
  render().find(e=>e.props.title==='작성 틀 열기')!.props.ref.current={finish:()=>applyOrder.push('release inert and focus source')};
  await button('이 내용으로 원문에 적용').props.onClick();assert.deepEqual(applyOrder,['release inert and focus source','native source command']);assert.equal(applies,1);assert.equal(props.rawText,'');assert(changes>=6);
});
test('composition and persisted source mismatch retain form and prevent source command; no storage writer',()=>{
  const entry=listPersonalWorkspacePocStructureTemplatePreviews()[0];const sidecar={catalogVersion:entry.catalogVersion,draft:entry.inputDraft};
  const html=renderToStaticMarkup(<ProgramCreatorStructureForm draftId={sidecar.draft.draftId} rawText="수정한 원문" sidecar={sidecar} onChange={()=>assert.fail('write')} onMaterialize={()=>assert.fail('apply')}/>);
  assert.match(html,/원문이 바뀌었습니다/);assert.doesNotMatch(html,/입력한 내용으로 글 만들기/);assert.match(html,/작성 틀 연결 해제/);
  assert.match(source,/onCompositionStart/);assert.match(source,/disabled && !composing/);assert.doesNotMatch(source,/localStorage|setItem|applyNativeReplacement|previewFixture/);
  const css=readFileSync(new URL('./ProgramCreatorStructureForm.module.css',import.meta.url),'utf8');assert.match(css,/min-height:44px/);assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
});

test('six examples start collapsed and Escape closes only the example without editing the controlled form',()=>{
  for(const t of programCreatorStructureTemplates()){
    const created=createProgramCreatorStructure({draftId:'empty-guidance',templateId:t.templateId,rawText:'',now:'2026-09-13T12:00:00Z'});assert(created.ok);
    const state:any[]=[];let cursor=0,changes=0,applies=0;
    const hooks={...React,useState:(v:any)=>{const i=cursor++;if(!(i in state))state[i]=v;return[state[i],(next:any)=>{state[i]=next;}];},useRef:(v:any)=>{const i=cursor++;if(!(i in state))state[i]={current:v};return state[i];}};
    const Component=load(hooks as typeof React).ProgramCreatorStructureForm;
    const props={draftId:'empty-guidance',rawText:'',sidecar:created.value,onChange:()=>changes++,onMaterialize:()=>{applies++;}};
    const before=JSON.stringify(props.sidecar),tree=nodes(Component(props));
    const details=tree.find(e=>e.type==='details'&&e.props.className==='example');assert(details);
    assert.equal(details.props.open,undefined);assert.equal(details.props.onToggle,undefined);
    assert.match(text(details.props.children),/내 입력과 원문에는 들어가지 않습니다/);
    assert(!nodes(details.props.children).some(e=>['input','textarea','select','button'].includes(String(e.type))));
    let focused=0,stopped=0;const element={open:true,querySelector:()=>({focus:()=>focused++})};
    const event={key:'Escape',nativeEvent:{isComposing:true},currentTarget:element,preventDefault(){stopped++;},stopPropagation(){stopped++;}};
    details.props.onKeyDown(event);assert.equal(element.open,true);assert.equal(focused,0);
    details.props.onKeyDown({...event,nativeEvent:{isComposing:false}});assert.equal(element.open,false);assert.equal(focused,1);assert.equal(stopped,2);
    assert.equal(changes,0);assert.equal(applies,0);assert.equal(JSON.stringify(props.sidecar),before);assert.equal(props.rawText,'');
    assert.equal(details.key,`empty-guidance:${t.templateId}:${t.version}`);
  }
});

test('preview renders exact calculated dates and scoped user inputs, not synthetic field values',()=>{
  const entry=listPersonalWorkspacePocStructureTemplatePreviews().find(t=>t.templateId==='moving-dday-v1')!;
  const sidecar={catalogVersion:entry.catalogVersion,draft:structuredClone(entry.inputDraft)};
  (sidecar.draft.values as Record<string,unknown>).anchor_date='2026-12-21';
  const state:any[]=[];let cursor=0,changes=0;
  const hooks={...React,useState:(v:any)=>{const i=cursor++;if(!(i in state))state[i]=v;return[state[i],(next:any)=>{state[i]=next;}];},useRef:(v:any)=>{const i=cursor++;if(!(i in state))state[i]={current:v};return state[i];}};
  const Component=load(hooks as typeof React).ProgramCreatorStructureForm;
  const props={draftId:sidecar.draft.draftId,rawText:'',sidecar,onChange:()=>changes++,onMaterialize:()=>{changes++;}};
  const render=()=>{cursor=0;return nodes(Component(props));};
  render().find(e=>e.type==='button'&&text(e.props.children)==='입력한 내용으로 글 만들기')!.props.onClick();
  const evidence=render().find(e=>e.props['aria-label']==='계산한 일정과 근거');assert(evidence);
  assert.match(text(evidence),/2026-11-21/);assert.match(text(evidence),/2026-12-21/);assert.match(text(evidence),/-30/);
  assert.doesNotMatch(text(evidence),/2026-11-01|moving-task-company|anchor_date/);assert.equal(changes,0);
});

function controlledForm(initial:ProgramCreatorStructureSidecar){
  const state:any[]=[];let cursor=0,sidecar:ProgramCreatorStructureSidecar|null=initial,changes=0,applies=0;
  const hooks={...React,useState:(v:any)=>{const i=cursor++;if(!(i in state))state[i]=v;return[state[i],(next:any)=>{state[i]=next;}];},useRef:(v:any)=>{const i=cursor++;if(!(i in state))state[i]={current:v};return state[i];}};
  const Component=load(hooks as typeof React).ProgramCreatorStructureForm;
  const render=()=>{cursor=0;return nodes(Component({draftId:initial.draft.draftId,rawText:'',sidecar,onChange:next=>{sidecar=next;changes++;},onMaterialize:()=>{applies++;}}));};
  const button=(name:string)=>{const el=render().find(e=>e.type==='button'&&text(e.props.children)===name);assert(el,name);return el;};
  return{render,button,counts:()=>({changes,applies}),getSidecar:()=>sidecar};
}

test('failed form focuses one summary and its links focus the exact repeated weekday group with inline errors',()=>{
  const entry=listPersonalWorkspacePocStructureTemplatePreviews().find(t=>t.templateId==='exercise-phased-4w-v1')!,draft=structuredClone(entry.inputDraft);
  draft.groups.forEach(g=>(g.children[0].values as Record<string,unknown>).weekdays=[]);
  const h=controlledForm({catalogVersion:entry.catalogVersion,draft}),before=JSON.stringify(h.getSidecar());
  h.button('입력한 내용으로 글 만들기').props.onClick();const tree=h.render(),summary=tree.find(e=>e.props['aria-label']==='작성 틀 입력 확인');assert(summary);
  let summaryFocus=0;const target={focus:()=>summaryFocus++};summary.props.ref(target);summary.props.ref(target);assert.equal(summaryFocus,1);
  for(const g of draft.groups){
    const group=tree.find(e=>e.props.id===`structure-${draft.draftId}-${g.children[0].instanceId}-weekdays`);assert(group);
    assert.equal(group.props['aria-invalid'],true);assert(group.props['aria-describedby'].endsWith('-errors'));assert.equal(group.props.tabIndex,-1);
    let focused=0;group.props.ref({focus:()=>focused++});
    const ordinal=draft.groups.indexOf(g)+1,link=nodes(summary).find(e=>e.type==='button'&&text(e).includes(`단계 ${ordinal}`)&&text(e).includes('요일'));assert(link);
    link.props.onClick();assert.equal(focused,1);
  }
  assert.deepEqual(h.counts(),{changes:0,applies:0});assert.equal(JSON.stringify(h.getSidecar()),before);
  assert(!tree.some(e=>e.props['aria-label']==='만들 원문 미리보기'));
});

test('switching repeat mode retains incompatible input visibly until user clears it; template cancel and one Undo preserve typed state',()=>{
  const entry=listPersonalWorkspacePocStructureTemplatePreviews().find(t=>t.templateId==='exercise-weekly-repeat-v1')!,draft=structuredClone(entry.inputDraft);
  (draft as {values:Record<string,unknown>}).values={...draft.values,end_mode:'until',until_date:'2026-12-21',repeat_count:null};
  const h=controlledForm({catalogVersion:entry.catalogVersion,draft});
  const input=(suffix:string)=>h.render().find(e=>typeof e.props.id==='string'&&e.props.id.endsWith(suffix)&&['input','select'].includes(String(e.type)));
  input('-end_mode')!.props.onChange({target:{value:'count'}});
  assert(input('-until_date'));assert(h.render().some(e=>String(e.props.id).endsWith('-until_date-retained')));
  input('-until_date')!.props.onChange({target:{value:''}});assert(!input('-until_date'));assert(input('-repeat_count'));
  const typed=JSON.stringify(h.getSidecar());
  const picker=()=>h.render().find(e=>e.type==='select'&&!e.props.id)!;
  picker().props.onChange({target:{value:'travel-itinerary-prep-v1'}});assert.equal(JSON.stringify(h.getSidecar()),typed);
  let focused=0;picker().props.ref.current={focus:()=>focused++};h.button('취소').props.onClick();assert.equal(focused,1);assert.equal(JSON.stringify(h.getSidecar()),typed);
  picker().props.onChange({target:{value:'travel-itinerary-prep-v1'}});h.button('작성 틀 바꾸기').props.onClick();
  assert.equal(h.getSidecar()!.draft.templateId,'travel-itinerary-prep-v1');h.button('작성 틀 바꾸기 되돌리기').props.onClick();assert.equal(JSON.stringify(h.getSidecar()),typed);
  assert(!h.render().some(e=>e.type==='button'&&text(e)==='작성 틀 바꾸기 되돌리기'));assert.equal(h.counts().applies,0);
});
