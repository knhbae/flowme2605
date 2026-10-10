import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {createProgramData} from '../../../lib/flow/integrated-poc/program-data';
import {applyProgramCreatorAction,setProgramCreatorWorking,creatorWorkingFromRecord,fingerprintPersonalWorkspacePocAuthoringSource as fp} from '../../../lib/flow/integrated-poc/creator-workspace';
const source=readFileSync(new URL('./ProgramCreatorWorkspace.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('source.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fn='';function visit(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==='openCopiedDraft')fn=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(fn);
function actual(c:any){return new Function('c',`with(c){${ts.transpileModule(fn,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText};return openCopiedDraft;}`)(c);}
function fixture(){
 const now='2026-10-09T00:00:00.000Z';let data=createProgramData();const actorId=data.activeActorId;
 const working={draftId:'creator-original',title:'가상 원본',rawText:'# 가상 원본\n## 준비\n- [ ] 확인하기',baseRecordRevision:null};
 const opened=setProgramCreatorWorking(data,{actorId,expectedWorking:null,working},now);assert(opened.ok);data=opened.data;
 let own=data.spaces[actorId].creatorWorkspace!;
 const saved=applyProgramCreatorAction(data,{actorId,requestId:'save-test',action:{type:'save',draftId:working.draftId,title:working.title,rawText:working.rawText,sourceFingerprint:fp(working.rawText),expectedLibraryRevision:own.library.revision,now}},now);assert(saved.ok);data=saved.data;own=data.spaces[actorId].creatorWorkspace!;
 const duplicated=applyProgramCreatorAction(data,{actorId,requestId:'copy-test',action:{type:'duplicate',sourceDraftId:working.draftId,newDraftId:'creator-copy',expectedLibraryRevision:own.library.revision,expectedSourceRecordRevision:own.library.records[working.draftId].recordRevision,now}},now);assert(duplicated.ok);
 return {data:duplicated.data,actorId};
}
test('copy opening uses the exact saved copy and existing guarded choice, never infers title or rewrites source',()=>{
 const f=fixture(),before=JSON.stringify(f.data),choices:any[]=[];
 actual({copiedDraft:{actorId:f.actorId,draftId:'creator-copy',sourceDraftId:'creator-original'},dataRef:{current:f.data},creatorWorkingFromRecord,choose:(w:any)=>choices.push(w),report(){throw Error('unexpected report');}})();
 assert.equal(choices.length,1);assert.equal(choices[0].draftId,'creator-copy');
 assert.equal(f.data.spaces[f.actorId].creatorWorkspace!.working!.draftId,'creator-original');
 assert.equal(JSON.stringify(f.data),before);
});
test('copy opening refuses a missing copy or another actor without changing working input',()=>{
 const f=fixture(),before=JSON.stringify(f.data);let reportCount=0;
 for(const copy of [{actorId:'other',draftId:'creator-copy'},{actorId:f.actorId,draftId:'missing'}])actual({copiedDraft:copy,dataRef:{current:f.data},creatorWorkingFromRecord,choose(){throw Error('must not choose');},report:()=>reportCount++})();
 assert.equal(reportCount,1);assert.equal(JSON.stringify(f.data),before);
});
