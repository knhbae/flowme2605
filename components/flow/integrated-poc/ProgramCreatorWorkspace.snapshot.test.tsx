import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
import {programSame} from '../../../lib/flow/integrated-poc/controller';
const source=readFileSync(new URL('./ProgramCreatorWorkspace.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('Workspace.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let fn:ts.FunctionDeclaration|undefined;function visit(node:ts.Node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='synchronizeCreatorWorking')fn=node;ts.forEachChild(node,visit);}visit(ast);assert(fn);
const compiled=ts.transpileModule(`const synchronize=${fn.getText(ast)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const old={draftId:'draft',title:'복구한 제작',rawText:'예전 원문',baseRecordRevision:3,nativeDocument:{revision:2}},restored={draftId:'draft',title:'되돌린 제작',rawText:'원래 원문',baseRecordRevision:2};
function harness(incoming:unknown=restored){let shown:unknown=old,mount=0,cleared=0,message='';const baseline={current:old as any},bufferRef={current:old as any};
  const context:any={programSame,pending:{current:false},saving:{current:null},lockCount:{current:0},composing:{current:false},editor:{current:{readSnapshot:()=>({composing:false})}},nativeContextPort:{current:null},sourceUpdatePort:{current:null},dataRef:{current:{spaces:{actor:{creatorWorkspace:{working:incoming}}}}},actorId:'actor',baseline,bufferRef,nativeBuffer:()=>old,
    setBuffer:(value:unknown)=>{shown=value;},setMount:(update:(n:number)=>number)=>{mount=update(mount);},report:(_ok:boolean,text:string)=>{message=text;},structureHistory:{current:{}},orderHistory:{current:{}},historyRequest:{current:{}},nativeSelection:{current:null},nativeHandoffRef:{current:null},nativeHandoffRequest:{current:{}},nativeLineageRef:{current:null},lineageRequest:{current:null}};
  for(const name of ['setOrderPreview','setHistoryPreview','setHistoryEntry','setComparison','setUpdateReview','setReplacement','setChoice','setNativeItem','setPropertyLine','setOrderStep','setNativeHandoff','setNativeHandoffChoices','setNativeLineage','setLineageMapping'])context[name]=()=>{cleared++;};
  const run=()=>new Function(...Object.keys(context),compiled+'return synchronize();')(...Object.values(context));
  return{run,context,get shown(){return shown;},get mount(){return mount;},get cleared(){return cleared;},get message(){return message;}};
}
test('actual creator snapshot reconciliation follows successful global Undo and clears stale previews without saving',()=>{
  const h=harness(),before=JSON.stringify(h.context.dataRef.current);assert.equal(h.run(),true);assert.deepEqual(h.shown,restored);assert.deepEqual(h.context.baseline.current,restored);assert.equal(h.mount,1);assert.equal(h.cleared,14);assert.equal(h.context.nativeHandoffRef.current,null);assert.equal(h.context.nativeHandoffRequest.current,null);assert.equal(JSON.stringify(h.context.dataRef.current),before);
  h.context.nativeBuffer=()=>restored;assert.equal(h.run(),false);assert.equal(h.mount,1);
});
test('actual reconciliation does not overwrite dirty raw, IME, child input or in-flight writes',()=>{
  for(const mode of ['raw','composition','native-composition','child','source-child','pending','saving','lock']){
    const h=harness();if(mode==='raw')h.context.nativeBuffer=()=>({...old,rawText:'아직 저장하지 않은 입력'});
    if(mode==='composition')h.context.composing.current=true;if(mode==='native-composition')h.context.editor.current.readSnapshot=()=>({composing:true});
    if(mode==='child')h.context.nativeContextPort.current={hasPendingInput:()=>true};if(mode==='pending')h.context.pending.current=true;
    if(mode==='source-child')h.context.sourceUpdatePort.current={hasPendingInput:()=>true};
    if(mode==='saving')h.context.saving.current=Promise.resolve(true);if(mode==='lock')h.context.lockCount.current=1;
    assert.equal(h.run(),false,mode);assert.equal(h.mount,0);assert.deepEqual(h.context.baseline.current,old);assert.equal(h.cleared,0);
  }
});
test('clean close and different draft replacement use actual persisted identity, not the mounted stale record',()=>{
  for(const incoming of [null,{...restored,draftId:'other-draft'}]){const h=harness(incoming);assert(h.run());assert.deepEqual(h.shown,incoming);assert.deepEqual(h.context.bufferRef.current,incoming);}
});
test('external creator snapshot cannot erase a pending native handoff comparison',()=>{
  const h=harness(),preview={id:'open-comparison',rows:[{itemId:'actual-item'}]};h.context.nativeHandoffRef.current=preview;
  assert.equal(h.run(),false);assert.equal(h.mount,0);assert.equal(h.cleared,0);assert.deepEqual(h.context.baseline.current,old);assert.equal(h.context.nativeHandoffRef.current,preview);assert.match(h.message,/비교 선택은 유지/);
  h.context.nativeHandoffRef.current=null;assert.equal(h.run(),true);assert.deepEqual(h.shown,restored);
});
test('actual effect is keyed to the stored working snapshot and lock release, not every local text keystroke',()=>{
  let effect:ts.CallExpression|undefined;function scan(node:ts.Node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('synchronizeCreatorWorking()'))effect=node;ts.forEachChild(node,scan);}scan(ast);assert(effect);assert.equal(effect.arguments[1].getText(ast),'[workspace?.working,locked,busy]');
});
