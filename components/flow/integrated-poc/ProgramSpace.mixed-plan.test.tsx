import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { createProgramData } from '../../../lib/flow/integrated-poc/program-data';
import { createProgramController } from '../../../lib/flow/integrated-poc/controller';
import { createProgramDocument, createProgramFolder, importProgramPublicVersion, addProgramQuickTask, updateProgramTask, completeProgramTask } from '../../../lib/flow/integrated-poc/private-space';
import { programExecutionTasks } from '../../../lib/flow/integrated-poc/execution';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import type { ProgramData, ProgramPublicVersion, ProgramTransition } from '../../../lib/flow/integrated-poc/contract';
const source=readFileSync(new URL('./ProgramSpace.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('ProgramSpace.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find(predicate:(node:ts.Node)=>boolean){let found:ts.Node|undefined;const walk=(node:ts.Node)=>{if(!found&&predicate(node))found=node;if(!found)ts.forEachChild(node,walk);};walk(ast);assert(found);return found;}
function evaluate(expression:string,context:Record<string,unknown>){const code=ts.transpileModule(`const value=${expression};`,{fileName:'fragment.tsx',compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;return new Function('React',...Object.keys(context),`${code};return value;`)(React,...Object.values(context));}
const styles=new Proxy({}, {get:(_,key)=>String(key)});
let sequence=0;
const base=(data:ProgramData)=>({actorId:data.activeActorId,expectedSpace:data.spaces[data.activeActorId],requestId:`mixed-${++sequence}`});
function accept(result:ProgramTransition<string>){assert(result.ok,result.ok?'':result.reason);return result;}

test('MX01 actual quick-task callback keeps an existing document but puts new Item in the selected folder',async()=>{
  let data=createProgramData();
  const a=accept(createProgramFolder(data,{...base(data),title:'업무A',parentId:null}));data=a.data;
  const b=accept(createProgramFolder(data,{...base(data),title:'생활B',parentId:null}));data=b.data;
  const doc=accept(createProgramDocument(data,{...base(data),title:'빠른 할 일',folderId:a.result}));data=doc.data;
  const before=M.raw(M.getDocument(data.spaces[data.activeActorId].text,doc.result)!);
  const node=find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='quickTask');let reset=0;
  const callback=evaluate(`(${node.getText(ast)})`,{FormData:class {get(key:string){return key==='title'?'생활 할 일':'2026-10-06';}},
    actorId:data.activeActorId,folderId:b.result,base,createProgramDocument,addProgramQuickTask,
    run:async(_label:string,build:(current:ProgramData)=>ProgramTransition<string>)=>{const result=accept(build(data));data=result.data;return{ok:true,result:result.result};}});
  await callback({preventDefault(){},currentTarget:{reset(){reset++;}}});
  const rows=programExecutionTasks(data.spaces[data.activeActorId],{period:'today',date:'2026-10-06',folderId:b.result});
  assert.equal(rows.length,1);assert.equal(rows[0].title,'생활 할 일');assert.equal(rows[0].docId,doc.result);
  assert.equal(rows[0].folderId,b.result);assert.equal(reset,1);assert(M.raw(M.getDocument(data.spaces[data.activeActorId].text,doc.result)!).startsWith(before));
});

test('MX02 changed-item recovery follows ordinary view flush, same ID focus, and no source/model write',async()=>{
  const callbackNode=find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='findChangedTask');
  for(const condition of ['ready','pending-date','pending-progress','missing','flush-rejected'] as const){
    let closed=0,changed=0,focused=0,scrolled=0,writes=0,message='';
    const callback=evaluate(`(${callbackNode.getText(ast)})`,{taskNotice:{taskId:'same-item'},detailSchedulePending:condition==='pending-date',detailProgressPending:condition==='pending-progress',
      dataRef:{current:{spaces:{actor:{}}}},actorId:'actor',programExecutionTasks:()=>condition==='missing'?[]:[{id:'same-item'}],
      setMessage:(text:string)=>{message=text;},detail:{kind:'task',id:'same-item'},close:()=>{closed++;},
      changePeriod:async(value:string)=>{assert.equal(value,'all');changed++;return condition!=='flush-rejected';},
      requestAnimationFrame:(work:()=>void)=>{work();},presentation:{current:{period:'all'}},styles,
      root:{current:{querySelectorAll:()=>[{dataset:{taskId:'wrong-item'}},{dataset:{taskId:'same-item'},querySelector:()=>({focus(){focused++;}}),scrollIntoView(){scrolled++;}}]}},mutate:()=>{writes++;}});
    await callback();assert.equal(writes,0);assert.equal(focused,condition==='ready'?1:0);assert.equal(scrolled,focused);
    assert.equal(changed,['ready','flush-rejected'].includes(condition)?1:0);assert.equal(closed,changed);assert.equal(!!message,condition==='missing');
  }
});

test('MX03 recovery copy appears only for an acknowledged off-view Item, retaining normal pending-input protection',()=>{
  const node=find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='taskNoticeContent') as ts.VariableDeclaration;
  for(const outsideView of [false,true])for(const pending of [false,true]){
    const html=renderToStaticMarkup(evaluate(node.initializer!.getText(ast),{styles,taskNotice:{title:'합성 할 일',text:'날짜 미정으로 저장했습니다.'},taskNoticeOutsideView:outsideView,detailSchedulePending:pending,detailProgressPending:false,findChangedTask(){}}));
    assert.match(html,/role="status"/);assert.equal(html.includes('전체 할 일에서 같은 항목 찾기'),outsideView);
    assert.equal(html.includes('disabled=""'),outsideView&&pending);assert.equal(html.includes('항목과 기록은 그대로'),outsideView);
  }
});

test('MX04 portable synthetic four + directly authored three survive postponement/completion/memo and controller reload',async()=>{
  const initial=createProgramData();
  // The canonical WEB1 packet is verified in the private UI ledger, not published
  // with this test. Keep the same four-Item/source-link shape portable in CI.
  const version:ProgramPublicVersion={id:'mx-web1-v1',flowId:'mx-web1',number:1,parentVersionId:null,createdBy:initial.activeActorId,
    title:'합성 4항목 계획',summary:'',source:{kind:'simulated-example',label:'합성 테스트 자료',url:'https://example.org/mixed-plan/',checkedAt:null},createdAt:'2026-10-06T00:00:00Z',
    items:[1,2,3,4].map(index=>({id:`mx-source-${index}`,title:`합성 항목 ${index}`,description:`합성 설명 ${index}`,completionCriteria:'개인 체크',sourceUrl:`https://example.org/mixed-plan/${index}`,subchecks:[],schedule:{kind:'undated'}}))};
  initial.public.flows=[{id:version.flowId,ownerId:initial.activeActorId,category:'학습',situations:[],currentVersionId:version.id,archived:false,derivedFrom:null}];initial.public.versions=[version];
  const values=new Map<string,string>();const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)};
  const exclusive=async<T,>(work:()=>T|Promise<T>)=>work();const controller=createProgramController({initialData:initial,storage,exclusive});assert(controller.ok);
  const actorId=initial.activeActorId,publicBefore=structuredClone(initial.public),peersBefore=structuredClone(Object.fromEntries(Object.entries(initial.spaces).filter(([id])=>id!==actorId)));
  const commit=async(build:(data:ProgramData)=>ProgramTransition<string>)=>{const result=await controller.mutate('혼합 계획 시험',build,{actorId});assert(result.ok,result.ok?'':result.reason);return result.result!;};
  await commit(current=>importProgramPublicVersion(current,{...base(current),versionId:version.id,itemIds:version.items.map(item=>item.id),anchor:null}));
  let data=controller.snapshot().envelope.data;const copy=data.spaces[actorId].copies[0];
  for(const [index,date]of ['2026-10-06','2026-10-05','2026-10-08',null].entries())await commit(current=>updateProgramTask(current,{...base(current),taskId:copy.itemLines[version.items[index].id],patch:{date}}));
  const personalDoc=await commit(current=>createProgramDocument(current,{...base(current),title:'업무·생활',folderId:'folder-unfiled'}));
  const personalIds:string[]=[];
  for(const [title,date]of [['견적 메일 보내기','2026-10-06'],['세탁물 정리','2026-10-08'],['장보기 목록 적기',null]])personalIds.push(await commit(current=>addProgramQuickTask(current,{...base(current),documentId:personalDoc,title:title!,date})));
  const flowId=copy.itemLines[version.items[0].id],pastId=copy.itemLines[version.items[1].id];
  await commit(current=>updateProgramTask(current,{...base(current),taskId:flowId,patch:{date:'2026-10-07',note:'합성 메모: 같은 위치에서 이어보기'}}));
  await commit(current=>completeProgramTask(current,{...base(current),taskId:pastId,date:'2026-10-06',done:true}));
  await commit(current=>completeProgramTask(current,{...base(current),taskId:personalIds[0],date:'2026-10-06',done:true}));
  const snapshot=controller.snapshot(),space=snapshot.envelope.data.spaces[actorId],ids=[...Object.values(copy.itemLines),...personalIds];
  assert.equal(programExecutionTasks(space).length,7);assert.deepEqual(new Set(M.tasks(space.text).map(task=>task.id)),new Set(ids));
  const todayRows=programExecutionTasks(space,{period:'today',date:'2026-10-06'});assert(todayRows.some(task=>task.id===personalIds[0]&&task.done));assert(!todayRows.some(task=>task.id===flowId||task.id===pastId));
  assert.equal(programExecutionTasks(space,{period:'undated',date:'2026-10-06'}).length,2);
  assert.deepEqual(snapshot.envelope.data.public,publicBefore);assert.deepEqual(Object.fromEntries(Object.entries(snapshot.envelope.data.spaces).filter(([id])=>id!==actorId)),peersBefore);
  const reloaded=createProgramController({initialData:initial,storage,exclusive});assert(reloaded.ok);assert.deepEqual(reloaded.snapshot(),snapshot);
  const again=programExecutionTasks(reloaded.snapshot().envelope.data.spaces[actorId]);assert.equal(again.find(task=>task.id===flowId)?.note,'합성 메모: 같은 위치에서 이어보기');
  assert.deepEqual(reloaded.snapshot().envelope.data.spaces[actorId].copies[0].itemLines,copy.itemLines);assert.equal(reloaded.snapshot().envelope.data.spaces[actorId].copies.length,1);
  assert.deepEqual(reloaded.snapshot().envelope.data.public.versions[0].items.map(item=>item.sourceUrl),version.items.map(item=>item.sourceUrl));
});

test('MX05 delayed ACK cannot label a different dialog/input/actor/view as saved',()=>{
  const node=find(n=>ts.isIfStatement(n)&&n.expression.getText(ast).includes('noticeOwner.dialog')&&n.expression.getText(ast).includes('committedSpace')) as ts.IfStatement;
  const origin={dialog:1,input:0,taskId:'item-a'},view={period:'today',date:'2026-10-06',folderId:'',query:''};
  for(const changed of ['none','dialog','input','task','actor','period','date','folder','query']){
    const owner={...origin},currentView={...view};let currentActor='actor';
    if(changed==='dialog')owner.dialog++;if(changed==='input')owner.input++;if(changed==='task')owner.taskId='item-b';if(changed==='actor')currentActor='other';
    if(changed==='period')currentView.period='undated';if(changed==='date')currentView.date='2026-10-07';if(changed==='folder')currentView.folderId='other';if(changed==='query')currentView.query='new';
    const allowed=evaluate(node.expression.getText(ast),{committedSpace:{},dataRef:{current:{activeActorId:currentActor}},actorId:'actor',noticeOwner:origin,
      executionDraftOwner:{current:owner},noticeView:view,presentation:{current:currentView},schedule:{taskId:'item-a'},label:'実行日期変更'});
    assert.equal(!!allowed,changed==='none',changed);
  }
});

test('MX06 changing the query or folder clears an unrelated recovery notice, without model writes',async()=>{
  const input=find(n=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText(ast)==='input'&&n.attributes.getText(ast).includes('id="program-private-search"')) as ts.JsxSelfClosingElement;
  const onChange=input.attributes.properties.find(n=>ts.isJsxAttribute(n)&&n.name.getText(ast)==='onChange') as ts.JsxAttribute;
  const queryFn=evaluate((onChange.initializer as ts.JsxExpression).expression!.getText(ast),{setQuery:(value:string)=>assert.equal(value,'other'),setTaskNotice:(value:unknown)=>assert.equal(value,null)});
  queryFn({target:{value:'other'}});
  const folder=find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='changeFolder');
  for(const blocked of [false,true]){
    let changed=0,cleared=0;
    const folderFn=evaluate(`(${folder.getText(ast)})`,{cancelLibraryReveal(){},libraryReveal:{current:{epoch:0}},selectedRef:{current:'doc'},inputLockCount:{current:0},lockInput:()=>()=>{},
      flushAllEditors:async()=>!blocked,setMessage(){},setFolderId:(value:string)=>{assert.equal(value,'folder-b');changed++;},setTaskNotice:(value:unknown)=>{assert.equal(value,null);cleared++;}});
    await folderFn('folder-b');assert.equal(changed,blocked?0:1);assert.equal(cleared,changed);
  }
});
