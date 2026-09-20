import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import ts from 'typescript';
import {createProgramData,validateProgramData} from './program-data';
import {programClone,programFailure,programResult,type ProgramWritingPosition} from './contract';
import {programSame} from './controller';
import {textWorkspaceModel as M} from './text-workspace';
import {moveProgramPersonalTaskText} from './task-document-move';
import {normalizeProgramWritingPosition} from './writing-position';
import {programCheckpointForWritingTarget} from './writing-navigation';
function fixture(){const data=createProgramData(),actorId=data.activeActorId,s=data.spaces[actorId];s.text=M.addDocument(s.text,{title:'출발'});const from=s.text.documents.at(-1)!.id;s.text=M.editText(s.text,from,'자유 메모\n- [ ] 이동할 일\n  - 메모: 개인\n  - [ ] 하위');const task=M.tasks(s.text)[0];s.text=M.recordProgress(s.text,task.id,'2026-09-12',20);s.text=M.addDocument(s.text,{title:'도착'});const to=s.text.documents.at(-1)!.id;s.text=moveProgramPersonalTaskText(s.text,task.id,to)!;return{data,actorId,from,to,task};}
test('moved/deleted anchors normalize only presentation without following foreign documents',()=>{
  const{data,actorId,from,task}=fixture(),text=data.spaces[actorId].text,before=programClone(text);
  const cached={documentId:from,lineId:task.id,start:6,end:10,scrollTop:99};const oldWriter=programClone(data);oldWriter.spaces[actorId].position=cached;assert.equal(validateProgramData(oldWriter),false);assert.deepEqual(normalizeProgramWritingPosition(text,cached),{documentId:from,lineId:null,start:0,end:0,scrollTop:0});
  assert.deepEqual(normalizeProgramWritingPosition(text,{...cached,documentId:'deleted'}),{documentId:null,lineId:null,start:0,end:0,scrollTop:0});assert.deepEqual(text,before);
});
const source=readFileSync(new URL('../../../components/flow/integrated-poc/ProgramSpace.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('Space.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let handler:ts.FunctionDeclaration|undefined;function visit(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='openDocument')handler=node;ts.forEachChild(node,visit);}visit(ast);assert(handler);
const code=ts.transpileModule(`const value=${handler.getText(ast)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
test('actual openDocument handler normalizes moved cache without mutation and hands exact focus to App history',async()=>{
  const{data,actorId,from,to,task}=fixture();let live=data,focused:number[]|null=null,navigated:any=null;const records=programClone(data.spaces[actorId].text.progressRecords),positions={current:{[from]:{documentId:from,lineId:task.id,start:6,end:10,scrollTop:40}} as Record<string,ProgramWritingPosition>};
  const context={actorId,selected:from,positions,programClone,programFailure,programResult,programSame,normalizeProgramWritingPosition,M,
    run:async(_label:string,build:any)=>{const result=build(live);if(result.ok){assert(validateProgramData(result.data));assert.equal(result.changed,false);assert.equal(result.data,live);live=result.data;}return result;},setSelected:()=>{},setLibraryOpen:()=>{},setOpened:()=>{},setPeriod:()=>{},props:{navigate:(value:any,options:any)=>{navigated=value;const checkpoint=programCheckpointForWritingTarget(live,value,options.writingLineId,null);assert(checkpoint);assert.equal(checkpoint.focus,`program-text-${encodeURIComponent(value.id)}`);const position=checkpoint.writing![value.id];focused=[position.start,position.end];}},requestAnimationFrame:()=>{throw Error('Space must not race App focus');}};
  const open=new Function(...Object.keys(context),`${code};return value;`)(...Object.values(context));await open(to,task.id);assert.equal(navigated.id,to);assert.equal(live.spaces[actorId].position.lineId,null);assert.deepEqual(live.spaces[actorId].text.progressRecords,records);assert.deepEqual(live.spaces[actorId].text,data.spaces[actorId].text);
  const doc=M.getDocument(live.spaces[actorId].text,to)!,index=doc.lines.findIndex(line=>line.id===task.id),offset=doc.lines.slice(0,index).reduce((sum,line)=>sum+line.text.length+1,0);assert.deepEqual(focused,[offset,offset]);
  assert.equal(live,data);assert.equal(positions.current[from].lineId,null);
  navigated=null;focused=null;const beforeMissing=programClone(live);await open(from,task.id);assert.equal(navigated,null);assert.equal(focused,null);assert.deepEqual(live,beforeMissing);
  await open(to,'deleted-line');assert.equal(navigated,null);assert.equal(focused,null);assert.deepEqual(live,beforeMissing);
  navigated=null;live=programClone(live);live.activeActorId='creator-minji';await open(to,task.id);assert.equal(navigated,null);
});
