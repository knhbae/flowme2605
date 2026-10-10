import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createProgramData} from '../../../lib/flow/integrated-poc/program-data';
import {textWorkspaceModel as M} from '../../../lib/flow/integrated-poc/text-workspace';
import {programFolderAfterDocumentOpen} from '../../../lib/flow/integrated-poc/folder-document-regions';
const source=readFileSync(new URL('./ProgramSpace.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let helper='',effect='';
function find(n:ts.Node){
  if(ts.isFunctionDeclaration(n)&&n.name?.text==='prepareDocumentScopeChange')helper=n.getText(ast);
  if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes('const id = props.selectedDocumentId'))effect=n.arguments[0].getText(ast);
  ts.forEachChild(n,find);
}find(ast);assert(helper&&effect);
const compile=(s:string)=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
function harness(){
  const data=createProgramData(),actorId=data.activeActorId;
  let ws=data.spaces[actorId].text;
  for(const title of ['original','first-target','latest-target'])ws=M.addDocument(ws,{title});
  data.spaces[actorId].text=ws;
  const [a,b,c]=ws.documents.map(d=>d.id),selectedRef={current:a},presentation={current:{folderId:'unmatched',period:'documents'}};
  const dataRef={current:data},documentRouteOpening={current:Promise.resolve()},inputLockCount={current:0},calls:string[]=[],messages:string[]=[];
  let finish:((ok:boolean)=>void)|undefined;
  const context={dataRef,actorId,selectedRef,presentation,documentRouteOpening,inputLockCount,programFolderAfterDocumentOpen,
    lockInput:()=>{inputLockCount.current++;calls.push('lock');return()=>{inputLockCount.current--;calls.push('release');};},
    flushAllEditors:()=>{calls.push('flush');return new Promise<boolean>(r=>{finish=r;});},
    setMessage:(s:string)=>messages.push(s),setFolderId:(s:string)=>{presentation.current.folderId=s;},
    setSelected:(s:string)=>{selectedRef.current=s;calls.push(s);},setOpened:()=>{},setPeriod:(s:string)=>{presentation.current.period=s;},
  };
  const prepare=new Function(...Object.keys(context),`${compile(helper)};return prepareDocumentScopeChange;`)(...Object.values(context));
  function request(id:string){const ctx={...context,prepareDocumentScopeChange:prepare,props:{selectedDocumentId:id}};
    return new Function(...Object.keys(ctx),`${compile(`const effect=${effect};`)};return effect();`)(...Object.values(ctx)) as ()=>void;
  }
  return {a,b,c,request,finish:(ok:boolean)=>{assert(finish);finish(ok);},selectedRef,presentation,inputLockCount,calls,messages,documentRouteOpening};
}
test('a newer route waits for the canceled route flush, then opens the latest target only',async()=>{
  const h=harness(),cancel=h.request(h.b);await new Promise(r=>setImmediate(r));assert.equal(h.inputLockCount.current,1);
  cancel();h.request(h.c);h.finish(true);await Promise.resolve();await Promise.resolve();await Promise.resolve();
  // The canceled owner releases its lock; the latest request needs its own successful flush.
  await new Promise(r=>setImmediate(r));assert.equal(h.inputLockCount.current,1);h.finish(true);await h.documentRouteOpening.current;
  assert.equal(h.selectedRef.current,h.c);assert(!h.calls.includes(h.b));assert.equal(h.presentation.current.folderId,'');assert.equal(h.inputLockCount.current,0);
});
test('a failed route flush preserves the current document and scope instead of showing the requested route',async()=>{
  const h=harness();h.request(h.b);await new Promise(r=>setImmediate(r));h.finish(false);await h.documentRouteOpening.current;
  assert.equal(h.selectedRef.current,h.a);assert.equal(h.presentation.current.folderId,'unmatched');assert.equal(h.inputLockCount.current,0);assert(h.messages[0].includes('입력은 유지'));
});
test('a canceled route with no successor does not apply selection after a successful flush',async()=>{
  const h=harness(),cancel=h.request(h.b);await new Promise(r=>setImmediate(r));cancel();h.finish(true);await h.documentRouteOpening.current;
  assert.equal(h.selectedRef.current,h.a);assert.equal(h.presentation.current.folderId,'unmatched');assert.equal(h.inputLockCount.current,0);
});
