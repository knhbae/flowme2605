import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {buildProgramCatalog} from '../../../lib/flow/integrated-poc/catalog';
import {createProgramData} from '../../../lib/flow/integrated-poc/program-data';
import {makeProgramOutput} from '../../../lib/flow/integrated-poc/output';
import {parseProgramLocation} from '../../../lib/flow/integrated-poc/navigation';
import type * as Discovery from './ProgramDiscovery';
const base='http://127.0.0.1:3641/my?personalWorkspacePoc=v1',url=new URL('./ProgramDiscovery.tsx',import.meta.url),require=createRequire(url),root=resolve(dirname(fileURLToPath(url)),'../../..');
function harness(origin=base){
 // Hook-level browser-base seam only; execute the actual component/handlers. No store fixture writes.
 const slots:unknown[]=[];let cursor=0;const mock={...React,useEffect:()=>{},useId:()=>':return-test:',useRef:(value:unknown)=>{const at=cursor++;return slots[at]??(slots[at]={current:value});},useState:(initial:unknown)=>{const at=cursor++;if(!(at in slots))slots[at]=initial===null?origin:typeof initial==='function'?initial():initial;return [slots[at],(value:unknown)=>{slots[at]=typeof value==='function'?value(slots[at]):value;}];}};
 const module={exports:{} as typeof Discovery},code=ts.transpileModule(readFileSync(url,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 vm.runInThisContext(`(function(module,exports,require){${code}\n})`)(module,module.exports,(id:string)=>id==='react'?mock:id.endsWith('.module.css')?{__esModule:true,default:new Proxy({},{get:(_,key)=>String(key)})}:require(id.startsWith('@/')?resolve(root,id.slice(2)):id));
 return {api:module.exports,render:(props:Discovery.ProgramDiscoveryProps)=>{cursor=0;return module.exports.ProgramDiscovery(props);}};
}
function setup(){const data=createProgramData(),catalog=buildProgramCatalog(data.activeActorId);data.public.flows=catalog.flows;data.public.versions=catalog.versions;const version=data.public.versions[0],item=version.items[0];
 const output=makeProgramOutput(version,{selectedItemIds:[item.id],anchor:'2026-10-12',format:'txt',returnContext:{baseUrl:base}},'2026-09-20T00:00:00Z');assert(output.ok);
 const link=output.payload.match(/http:\/\/127[^\s]+/)![0],d=parseProgramLocation(new URL(link).hash);
 const props:Discovery.ProgramDiscoveryProps={data,today:'2026-09-20',mutate:async()=>assert.fail('unexpected write'),navigate:()=>assert.fail('unexpected navigation'),onUseVersion:async()=>assert.fail('copy write'),onStartText:async()=>assert.fail('document write'),selectedFlowId:version.flowId,selectedVersionId:version.id,selectedItemId:item.id,selectedOutputReturn:d.publicOutputReturn};return{props,version,item,link};}
test('actual discovery renders file-return exact selection and original anchor, preserving all private data',()=>{
 const {props,version,item}=setup(),h=harness(),before=JSON.stringify(props.data),state=h.api.createProgramDiscoveryNavigationState();state.details[version.id]={selectedItemIds:[],anchor:'2027-01-01',format:'csv'};
 const tree=h.render({...props,navigationState:state}),html=renderToStaticMarkup(tree);assert(html.includes('출력한 공개 판본의 같은 항목'));assert(html.includes('value="2026-10-12"'));assert(html.includes('TXT 파일 받기'));assert(html.includes('이 기기의 같은 공개판본'));assert.equal(JSON.stringify(props.data),before);
 const walk=(node:any):any[]=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(walk)];
 const checkbox=walk(tree).find(n=>n.type==='input'&&n.props.type==='checkbox'&&n.props.checked);assert(checkbox);assert(version.items.some(row=>row.id===item.id));
});
test('actual discovery rejects other origin and missing item before exposing import/output actions',()=>{
 for(const mode of ['origin','missing'] as const){const {props}=setup(),h=harness(mode==='origin'?base.replace('3641','3642'):base);if(mode==='missing')props.data.public.versions.find(v=>v.id===props.selectedVersionId)!.items=[];
 const before=JSON.stringify(props.data),html=renderToStaticMarkup(h.render(props));assert(html.includes('출력한 공개 항목을 확인할 수 없습니다'));assert(!html.includes('파일 받기'));assert(!html.includes('내 문서에 가져오기'));assert.equal(JSON.stringify(props.data),before);}
});
test('explicit output edits remain editable; reopening original file token restores its exact choices',()=>{
 const {props}=setup(),h=harness();const walk=(node:any):any[]=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(walk)];
 const tree=h.render(props),date=walk(tree).find(n=>n.type==='input'&&n.props.type==='date'&&n.props.value==='2026-10-12');assert(date);
 date.props.onChange({target:{value:'2026-11-01'}});assert(renderToStaticMarkup(h.render(props)).includes('value="2026-11-01"'));
 h.render({...props,selectedOutputReturn:undefined});assert(renderToStaticMarkup(h.render(props)).includes('value="2026-10-12"'));
});
