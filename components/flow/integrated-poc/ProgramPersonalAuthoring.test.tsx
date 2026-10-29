import './test-css-modules';
import test from 'node:test';import assert from 'node:assert/strict';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {PersonalRepeatForm,ProgramPersonalAuthoring} from './ProgramPersonalAuthoring';
import {createProgramData,validateProgramData} from '@/lib/flow/integrated-poc/program-data';
import {createPersonalFlow,setPersonalRepeat} from '@/lib/flow/integrated-poc/personal-authoring-commands';
import {programClone,type ProgramData,type ProgramTransition} from '@/lib/flow/integrated-poc/contract';

function fixture(){const initial=createProgramData();initial.spaces[initial.activeActorId].text={version:11,folders:[{id:'f',title:'합성',parentId:null}],documents:[{id:'doc',title:'합성',folder:'합성',folderId:'f',lines:[{id:'p',text:'- [ ] 원래 할 일'}]}],flows:[],bindings:[],taskScopes:{p:'f'},itemScopes:{p:'f'},progressRecords:[]};const result=createPersonalFlow(initial,{documentId:'doc',title:'새 반복',taskIds:['p']});assert(result.ok);return{data:result.data,flowId:result.result,version:result.data.spaces[initial.activeActorId].personalAuthoring!.flows[0].versions[0]};}
function nodes(node:React.ReactNode):React.ReactElement<any>[]{return React.isValidElement(node)?[node,...React.Children.toArray((node.props as any).children).flatMap(nodes)]:[];}
function renderWithHooks(component:typeof PersonalRepeatForm){const state:unknown[]=[];let cursor=0;return(props:Parameters<typeof PersonalRepeatForm>[0])=>{cursor=0;const original=React.useState;(React as any).useState=(initial:any)=>{const index=cursor++;if(!(index in state))state[index]=typeof initial==='function'?initial():initial;return[state[index],(next:any)=>{state[index]=typeof next==='function'?next(state[index]):next;}];};try{return component(props);}finally{React.useState=original;}};}

test('actual new-series form defaults to four, previews three and enables explicit save without IDs or mutation',()=>{
 const{data,flowId,version}=fixture(),before=JSON.stringify(data);let saves=0,ids=0;const original=crypto.randomUUID;crypto.randomUUID=(()=>{ids++;return original();}) as typeof crypto.randomUUID;
 try{const html=renderToStaticMarkup(<PersonalRepeatForm today="2026-10-28" target="flow" flowId={flowId} version={version} versionId={version.id} disabled={false} onCommand={async()=>{saves++;}}/>);assert(/aria-label="반복 횟수"[^>]*value="4"/.test(html));for(const date of['2026-10-28','2026-10-29','2026-10-30'])assert(html.includes(date+' (1개)'));assert(!html.includes('2026-10-31 (1개)'));assert(!html.match(/<button[^>]*>반복 설정 저장<\/button>/)![0].includes('disabled'));assert.equal(saves,0);assert.equal(ids,0);assert.equal(JSON.stringify(data),before);}finally{crypto.randomUUID=original;}
});

test('actual new-series save command survives serialization and reopens its saved four-round rule',()=>{
 let{data,flowId,version}=fixture();const native=programClone(data.spaces[data.activeActorId].text);let saves=0;
 const props={today:'2026-10-28',target:'flow',flowId,version,versionId:version.id,disabled:false,onCommand:async(_label:string,build:(data:ProgramData)=>ProgramTransition<string>)=>{saves++;const result=build(data);assert(result.ok);data=programClone(result.data);}};
 const tree=renderWithHooks(PersonalRepeatForm)(props);nodes(tree).find(node=>node.type==='button'&&node.props.children==='반복 설정 저장')!.props.onClick();assert.equal(saves,1);assert(validateProgramData(data));const series=data.spaces[data.activeActorId].personalAuthoring!.series[0];assert.deepEqual(series.ruleVersions[0].rule,{kind:'daily',startDate:'2026-10-28',end:{kind:'count',count:4}});assert.deepEqual(series.rounds,[]);assert.deepEqual(data.spaces[data.activeActorId].text,native);
 const html=renderToStaticMarkup(<PersonalRepeatForm {...props} series={series}/>);assert(/aria-label="반복 횟수"[^>]*value="4"/.test(html));assert(html.includes('2026-10-30 (1개)'));assert(!html.match(/<button[^>]*>미생성 회차 규칙 변경<\/button>/)![0].includes('disabled'));
});

test('actual first-series form still rejects invalid dates and more than twelve rounds',()=>{
 const{flowId,version}=fixture(),props={today:'2026-10-28',target:'flow',flowId,version,versionId:version.id,disabled:false,onCommand:async()=>{throw Error('Must not save');}},render=renderWithHooks(PersonalRepeatForm);let tree=render(props);
 nodes(tree).find(node=>node.props['aria-label']==='반복 횟수')!.props.onChange({target:{value:'13'}});tree=render(props);assert.equal(nodes(tree).find(node=>node.type==='button'&&node.props.children==='반복 설정 저장')!.props.disabled,true);
 nodes(tree).find(node=>node.props['aria-label']==='반복 횟수')!.props.onChange({target:{value:'4'}});nodes(tree).find(node=>node.props['aria-label']==='반복 시작일')!.props.onChange({target:{value:'2026-02-30'}});tree=render(props);assert.equal(nodes(tree).find(node=>node.type==='button'&&node.props.children==='반복 설정 저장')!.props.disabled,true);
});

function reopen(data:ProgramData,documentId='doc'){return renderToStaticMarkup(<ProgramPersonalAuthoring data={data} documentId={documentId} today="2026-10-29" disabled={false} onOpenSource={()=>{}} onCommand={async()=>true}/>);}
function withRepeat(data:ProgramData,input:Parameters<typeof setPersonalRepeat>[1]){const result=setPersonalRepeat(data,input);assert(result.ok);return result.data;}

test('reopening a document with a task rule shows that saved rule before any default',()=>{
 const{data}=fixture(),saved=withRepeat(data,{taskId:'p',rule:{kind:'weekdays',weekdays:[6],startDate:'2026-10-31',end:{kind:'count',count:2}}});
 const html=reopen(saved);
 assert(html.includes('<summary>Flow 구성 · 실행과 반복 · 반복 1개</summary>'));
 assert(html.includes('반복 중 · 원래 할 일 · 토요일 · 2회 (10/31, 11/07)'));
 assert(html.includes('<legend>저장된 규칙</legend>'));assert(!html.includes('새 반복 · 기본값'));
 assert(/<option value="p" selected="">/.test(html));
 assert(/aria-label="반복 횟수"[^>]*value="2"/.test(html));
});

test('a document without rules asks for a target and keeps save disabled until one is chosen',()=>{
 const html=reopen(fixture().data);
 assert(html.includes('<option value="" selected="">반복할 대상 선택</option>'));
 assert(html.includes('<legend>새 반복 · 기본값 매일 4회</legend>'));assert(html.includes('아직 반복이 없습니다.'));
 assert(/<button type="button" disabled="">반복 설정 저장<\/button>/.test(html));
 assert(!/<option value="flow"[^>]*selected/.test(html));
});

test("another document's Flow rule never reads as this document's rule",()=>{
 const{data,flowId}=fixture(),saved=withRepeat(data,{flowId,rule:{kind:'daily',startDate:'2026-10-29',end:{kind:'count',count:2}}});
 const html=reopen(saved);
 assert(html.includes('<summary>Flow 구성 · 실행과 반복</summary>'));assert(!html.includes('반복 중 ·'));
 assert(html.includes('<legend>새 반복 · 기본값 매일 4회</legend>'));assert(!html.includes('<legend>저장된 규칙</legend>'));
 const own=reopen(saved,flowId);
 assert(own.includes('반복 1개</summary>'));assert(own.includes('반복 중 · Flow 전체 · 새 반복 · 매일 · 2회'));assert(own.includes('<legend>저장된 규칙</legend>'));
});
