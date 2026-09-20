import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { loadProgramPlanUi } from './ProgramLegacyPlan.test-support';
import { createProgramData, validateProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { importProgramPublicVersion, compareProgramCopyVersion } from '../../../lib/flow/integrated-poc/private-space';
import { programClone } from '../../../lib/flow/integrated-poc/contract';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type { ProgramEditorFlush } from '../../../lib/flow/integrated-poc/document-action';
import type * as Component from './ProgramCopyInspector';

function fixture() {
  const initial=createProgramData(),actorId=initial.activeActorId;
  initial.public.flows.push({id:'field-flow',ownerId:'creator-minji',currentVersionId:'field-v1',category:'생활',situations:[],derivedFrom:null,archived:false});
  initial.public.versions.push({id:'field-v1',flowId:'field-flow',number:1,parentVersionId:null,title:'원문',summary:'소개',items:[{id:'field-item',title:'기준 제목',description:'기준 설명',completionCriteria:'기준 완료',sourceUrl:null,schedule:{kind:'relative',days:0},subchecks:[]}],source:{kind:'simulated-example',label:'QA',url:null,checkedAt:null},createdBy:'creator-minji',createdAt:'2026-09-14T00:00:00.000Z'});
  const imported=importProgramPublicVersion(initial,{actorId,requestId:'field-import',expectedSpace:initial.spaces[actorId],versionId:'field-v1',itemIds:['field-item'],anchor:'2026-09-14'});assert(imported.ok);
  const data=imported.data,copy=data.spaces[actorId].copies.find(c=>c.id===imported.result)!;
  const next=programClone(data.public.versions.at(-1)!);next.id='field-v2';next.number=2;next.parentVersionId='field-v1';next.items[0].title='새 공개 제목';data.public.versions.push(next);data.public.flows.at(-1)!.currentVersionId=next.id;
  const space=data.spaces[actorId],taskId=copy.itemLines['field-item'];space.text=M.updateTask(space.text,taskId,{title:'내가 바꾼 제목',date:'2026-09-20',note:'개인 메모'});space.text=M.recordProgress(space.text,taskId,'2026-09-14',35);
  assert(validateProgramData(data));return {data,copyId:copy.id,taskId,actorId};
}
function nodesOf(tree:any):any[]{const nodes:any[]=[];const visit=(n:any)=>{if(Array.isArray(n))n.forEach(visit);else if(n?.props){nodes.push(n);visit(n.props.children);}};visit(tree);return nodes;}
function harness(t: any) {
  const f=fixture();let data=f.data,cursor=0,writes=0,calls=0,fail=false,port:ProgramEditorFlush|null=null,focus=0;
  const slots:any[]=[],effects:(()=>void)[]=[];
  const hooks={...React,useCallback:(fn:any)=>fn,
    useState:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    useRef:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
    useEffect:(fn:()=>void,deps:any[])=>{const i=cursor++;if(!(i in slots)||deps.some((value,index)=>!Object.is(value,slots[i][index]))){slots[i]=deps;effects.push(fn);}}};
  const oldWindow=(globalThis as any).window;(globalThis as any).window={addEventListener(){},removeEventListener(){}};t.after(()=>{(globalThis as any).window=oldWindow;});
  const component=loadProgramPlanUi(fileURLToPath(new URL('./ProgramCopyInspector.tsx',import.meta.url)),hooks) as typeof Component;
  const opener={isConnected:true,disabled:false,focus:()=>{focus++;}} as HTMLButtonElement;
  const render=()=>{cursor=0;const tree=component.ProgramCopyInspector({data,copyId:f.copyId,today:'2026-09-14',navigate(){},onClose(){},onRegisterEditors:p=>{port=p;},mutate:async(_label,build)=>{calls++;if(fail)return{ok:false,reason:'storage-unavailable'};const r=build(data);if(!r.ok)return{ok:false,reason:r.reason};if(r.changed)writes++;data=r.data;return{ok:true,result:r.result,changed:r.changed};}});while(effects.length)effects.shift()!();return{tree,nodes:nodesOf(tree)};};
  const select=()=>{const view=render(),select=view.nodes.find(n=>n.type==='select'&&nodesOf(n).some(o=>o.type==='option'&&o.props.children==='항목 선택'));assert(select);select.props.onChange({target:{value:'field-item'}});};
  const choices=()=>render().nodes.find(n=>n.type===component.ProgramCopyFieldChoices);
  const review=()=>render().nodes.find(n=>n.type===component.ProgramCopyFieldReview);
  const open=()=>{const node=choices();assert(node);node.props.onReview('title',opener);};
  return{...f,render,select,open,choices,review,component,opener,get data(){return data;},replace:(next:typeof data)=>{data=next;},get writes(){return writes;},get calls(){return calls;},get port(){return port!;},get focus(){return focus;},fail:(v:boolean)=>{fail=v;}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('actual conflict entry leaves the protected checkbox disabled; local keep/selection/cancel/Escape write zero',async t=>{
  const h=harness(t);h.select();const before=JSON.stringify(h.data),choice=h.choices();
  const markup=renderToStaticMarkup(h.component.ProgramCopyFieldChoices(choice.props));assert.match(markup,/disabled=""/);assert.match(markup,/내 내용\/새 내용 비교/);
  h.open();let review=h.review();assert(review);assert.equal(review.props.confirmed,false);assert.equal(h.port.hasPendingInput?.(),true);assert.equal(await h.port.flushAll(),false);
  const html=renderToStaticMarkup(h.component.ProgramCopyFieldReview(review.props));for(const text of ['기준 제목','내가 바꾼 제목','새 공개 제목'])assert(html.includes(text));assert.match(html,/disabled="">새 내용 적용/);
  review.props.onApply();assert.equal(h.calls,0);review.props.onConfirm(true);assert.equal(h.calls,0);assert(h.port.captureDrafts?.()[0].raw.includes('내가 바꾼 제목'));
  h.review().props.onCancel();h.render();assert.equal(h.port.hasPendingInput?.(),false);assert.equal(h.focus,1);
  h.open();h.review().props.onConfirm(true);h.render().tree.props.onKeyDown({key:'Escape',preventDefault(){},stopPropagation(){}});h.render();assert.equal(h.focus,2);assert.equal(h.calls,0);assert.equal(JSON.stringify(h.data),before);
});
test('locked apply and quota failure retain selection; exact retry commits only the selected field once',async t=>{
  const h=harness(t);h.select();h.open();h.review().props.onConfirm(true);const before=programClone(h.data);
  const release=h.port.lockInput();h.review().props.onApply();await settle();assert.equal(h.calls,0);release();
  h.fail(true);h.review().props.onApply();await settle();assert.equal(h.writes,0);assert.equal(h.review().props.confirmed,true);assert.equal(JSON.stringify(h.data),JSON.stringify(before));
  h.fail(false);h.review().props.onApply();await settle();assert.equal(h.writes,1);assert.equal(h.review(),undefined);assert.equal(h.port.hasPendingInput?.(),false);
  const task=M.tasks(h.data.spaces[h.actorId].text).find(task=>task.id===h.taskId)!;assert.equal(task.title,'새 공개 제목');assert.equal(task.date,'2026-09-20');assert.equal(task.note,'개인 메모');
  assert.deepEqual(h.data.spaces[h.actorId].text.progressRecords,before.spaces[h.actorId].text.progressRecords);assert.deepEqual(h.data.public,before.public);assert(validateProgramData(h.data));
});
test('stale personal snapshot rejects apply and preserves local choice, while a second review cannot replace it',async t=>{
  const h=harness(t);h.select();h.open();h.review().props.onConfirm(true);const captured=h.review().props.preview;
  h.choices().props.onReview('description',h.opener);assert.equal(h.review().props.preview,captured);
  const changed=programClone(h.data);changed.spaces[h.actorId].text=M.updateTask(changed.spaces[h.actorId].text,h.taskId,{note:'다른 편집'});h.replace(changed);
  h.review().props.onApply();await settle();assert.equal(h.writes,0);assert.equal(h.review().props.confirmed,true);assert.equal(M.tasks(h.data.spaces[h.actorId].text).find(task=>task.id===h.taskId)!.note,'다른 편집');
});
test('proposal input blocks opening; an open field review blocks ordinary apply and keeps proposal disabled',async t=>{
  const h=harness(t);h.select();let proposal=h.render().nodes.find(n=>n.type?.name==='ProgramCopyProposal');assert(proposal);
  proposal.props.onPendingChange(true);h.open();assert.equal(h.review(),undefined);
  proposal.props.onPendingChange(false);h.open();assert(h.review());proposal=h.render().nodes.find(n=>n.type?.name==='ProgramCopyProposal');assert.equal(proposal.props.disabled,true);
  const normalApply=h.render().nodes.find(n=>n.type==='button'&&n.props.children==='선택한 변경 반영');await normalApply.props.onClick();assert.equal(h.calls,0);
});
test('changed public source rejects captured preview, and repeated apply clicks commit once',async t=>{
  const h=harness(t);h.select();h.open();h.review().props.onConfirm(true);
  const changed=programClone(h.data);changed.public.versions.find(v=>v.id==='field-v2')!.items[0].title='더 새로 바뀐 공개 제목';h.replace(changed);
  h.review().props.onApply();await settle();assert.equal(h.writes,0);assert.equal(h.review().props.confirmed,true);
  h.review().props.onCancel();h.render();h.open();h.review().props.onConfirm(true);const apply=h.review().props.onApply;apply();apply();await settle();assert.equal(h.writes,1);assert.equal(h.calls,2);
});
test('equal current/source or unsupported schedule never exposes a general-field conflict entry',t=>{
  const h=harness(t),r=compareProgramCopyVersion(h.data,{actorId:h.actorId,copyId:h.copyId,versionId:'field-v2'});assert(r.ok);
  const props={comparisons:r.result.items[0].fields.map(field=>({...field,privateChanged:false,alreadyApplied:true})),selected:[],busy:false,versionNumber:2,onToggle(){},onReview(){}};
  assert.doesNotMatch(renderToStaticMarkup(h.component.ProgramCopyFieldChoices(props)),/내 내용\/새 내용 비교/);
  const schedule=r.result.items[0].fields.find(f=>f.field==='schedule')!;
  assert.doesNotMatch(renderToStaticMarkup(h.component.ProgramCopyFieldChoices({...props,comparisons:[{...schedule,sourceChanged:true,privateChanged:true,alreadyApplied:false}]})),/내 내용\/새 내용 비교/);assert.equal(h.calls,0);
});
