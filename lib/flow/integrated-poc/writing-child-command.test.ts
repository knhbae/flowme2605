import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import * as ts from 'typescript';
import {createProgramTextDraft,type ProgramTextDraftState} from './program-text-draft';
import {prepareWritingChild} from './writing-child-command';import {textWorkspaceModel as M,type TextWorkspaceState} from './text-workspace';
function fixture():TextWorkspaceState{const s:TextWorkspaceState={version:11,documents:[{id:'d',title:'합성',folder:'분류',folderId:'f',lines:[{id:'date',text:'[2026-10-28]'},{id:'p',text:'- [0] 부모'},{id:'pm',text:'  - 메모: 기존 메모'},{id:'simple',text:'  - [ ] 기존 간단 체크'},{id:'other',text:'- [ ] 다른 일'}]}],folders:[{id:'f',title:'분류',parentId:null}],flows:[],bindings:[],taskScopes:{p:'f',other:'f'},itemScopes:{p:'f',simple:'f',other:'f'},progressRecords:[{taskId:'p',date:'2026-10-27',percent:25}]};assert(M.validate(s));return s;}
test('independent child uses its own registered ID/date/progress with real parent; old simple check and all old records remain',()=>{const before=fixture(),doc=M.getDocument(before,'d')!,r=prepareWritingChild(before,{docId:'d',parentId:'p',kind:'task',text:'새 하위\n하위 메모',expectedRaw:M.raw(doc)},()=> 'new-child');assert(r.ok,r.ok?'':r.reason);const child=M.tasks(r.workspace).find(t=>t.id==='new-child')!;assert.equal(child.parentTaskId,'p');assert.equal(child.date,'2026-10-28');assert.equal(r.workspace.taskScopes[child.id],'f');assert.equal(M.currentProgress(r.workspace,child.id),0);assert.deepEqual(r.workspace.progressRecords,before.progressRecords);assert.equal(r.workspace.taskScopes.simple,undefined);assert.equal(M.getDocument(r.workspace,'d')!.lines.find(l=>l.id==='simple')!.text,'  - [ ] 기존 간단 체크');const progress=M.recordProgress(r.workspace,child.id,'2026-10-28',40);assert.equal(M.currentProgress(progress,'p'),0);assert.equal(M.currentProgress(progress,child.id),40);});
test('parent memo edits its owner in place, preserves old line and child/check identity; stale/empty requests allocate0',()=>{const before=fixture(),raw=M.raw(before.documents[0]);const r=prepareWritingChild(before,{docId:'d',parentId:'p',kind:'memo',text:'새 메모\n다음 줄',expectedRaw:raw});assert(r.ok,r.ok?'':r.reason);assert(M.getDocument(r.workspace,'d')!.lines.some(l=>l.id==='pm'));assert.equal(M.tasks(r.workspace).find(t=>t.id==='p')!.note,'새 메모\n다음 줄');assert.deepEqual(r.workspace.progressRecords,before.progressRecords);let ids=0;for(const text of['','   '])assert(!prepareWritingChild(before,{docId:'d',parentId:'p',kind:'task',text,expectedRaw:raw},()=>{ids++;return'x';}).ok);assert(!prepareWritingChild(before,{docId:'d',parentId:'p',kind:'task',text:'항목',expectedRaw:raw+'stale'},()=>{ids++;return'x';}).ok);assert.equal(ids,0);});

const {resolve:resolveAddSettings}=createRequire(import.meta.url)('./text-add-settings.cjs') as {resolve:(config:Record<string,unknown>)=>{lineBreakEnter():boolean;typingPickers():boolean;plusOpensAuthoring():boolean}};
test('actual native key handler inserts one LF for Enter/Shift+Enter when lineBreakEnter is on; composing or consumed IME Enter allocates nothing',()=>{
 const source=readFileSync(new URL('./vendor/text-editor.cjs',import.meta.url),'utf8'),start=source.indexOf('    function onKeydown(event) {'),end=source.indexOf("\n    listen(textarea, 'input'",start);assert(start>0&&end>start);
 // The new setting and the older explicitAddOnly alias must reach the same line-break branch.
 for(const config of[{lineBreakEnter:()=>true},{explicitAddOnly:()=>true}])
 for(const shiftKey of[false,true])for(const composing of[false,true])for(const consumed of[false,true]){
  const inserted:string[]=[],area={value:'- [ ] 기존',readOnly:false},handler=new Function('imeEnterCycle','composing','config','addSettings','textarea','remember','insert','let inputRejected=false,nextTabLeaves=false,indentLease=null;'+source.slice(start,end)+';return onKeydown;')({keydown:()=>consumed},composing,config,resolveAddSettings(config),area,()=>{},(text:string)=>{inserted.push(text);area.value+=text;});let prevented=0;
  handler({key:'Enter',code:'Enter',keyCode:13,shiftKey,ctrlKey:false,metaKey:false,altKey:false,defaultPrevented:false,isComposing:composing,preventDefault:()=>{prevented++;}});
  assert.deepEqual(inserted,!composing&&!consumed?['\n']:[]);assert.equal(prevented,consumed||!composing?1:0);
 }
});

// Execute the current component's expressions, without mounting React or replacing
// its pending calculation with a test implementation. Browser/IME wiring is separate.
function actualSynchronizationSource(){
 const source=readFileSync(new URL('../../../components/flow/integrated-poc/ProgramTextEditor.tsx',import.meta.url),'utf8');
 const tree=ts.createSourceFile('ProgramTextEditor.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const pending:ts.FunctionDeclaration[]=[],notifies:ts.Expression[]=[],effects:ts.Expression[]=[];
 const visit=(node:ts.Node)=>{
  if(ts.isFunctionDeclaration(node)&&node.name?.text==='programTextInputPending')pending.push(node);
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)){
   if(node.expression.text==='createProgramTextDraft'){
    const notify=node.arguments[3];assert(notify&&ts.isArrowFunction(notify),'actual draft fourth argument must remain the notify callback');notifies.push(notify);
   }
   if(node.expression.text==='useEffect'){
    const deps=node.arguments[1];
    if(deps&&ts.isArrayLiteralExpression(deps)&&deps.elements.length===2
     &&deps.elements[0].getText(tree)==='props.workspace'&&deps.elements[1].getText(tree)==='regionPending'){
     const effect=node.arguments[0];assert(effect&&ts.isArrowFunction(effect),'actual workspace effect must remain a callback');effects.push(effect);
    }
   }
  }
  ts.forEachChild(node,visit);
 };
 visit(tree);assert.equal(pending.length,1);assert.equal(notifies.length,1);assert.equal(effects.length,1);
 return{pending:pending[0].getText(tree).replace(/^export\s+/,''),notify:notifies[0].getText(tree),effect:effects[0].getText(tree)};
}
function executeSourceExpression<T>(expression:string,scope:Record<string,unknown>):T{
 const code=ts.transpileModule('const extracted = ('+expression+');',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
 return new Function(...Object.keys(scope),code+'\nreturn extracted;')(...Object.values(scope)) as T;
}
type SyncProtection='installation-failed'|'installation-failed-equal-raw'|'editor-missing-equal-raw'|'ime'|'region'|'child'|'check'|'dirty'|'invalid'|'saving';
function synchronizationHarness(source:ReturnType<typeof actualSynchronizationSource>,protection?:SyncProtection){
 const before=fixture(),beforeRaw=M.raw(before.documents[0]);
 const equalRaw=protection==='installation-failed-equal-raw'||protection==='editor-missing-equal-raw';
 const next=equalRaw?structuredClone(before):M.updateTask(before,'p',{date:'2026-10-29'});
 if(equalRaw)next.documents[0].title+=' · 새 이름';
 assert(M.validate(next));assert.notDeepEqual(next,before);
 assert.equal(M.raw(next.documents[0])===beforeRaw,equalRaw);
 const area={value:beforeRaw},composingRef={current:protection==='ime'},regionPendingRef={current:protection==='region'},checkPendingRef={current:protection==='check'?'check-request':null};
 const notices:boolean[]=[],microtasks:(()=>void)[]=[];let parentPending=false,installations=0;
 let releaseCommit!:(accepted:boolean)=>void;
 const commit=new Promise<boolean>(resolve=>{releaseCommit=resolve;});
 const pending=executeSourceExpression<(state:ProgramTextDraftState,nativeRaw:string|undefined,composing:boolean,region:boolean,checking:boolean)=>boolean>(source.pending,{});
 const scope:Record<string,unknown>={alive:true,setDraft:()=>{},propsRef:{current:{docId:'d',onDirtyChange:(value:boolean)=>{parentPending=value;notices.push(value);}}},
  currentChild:()=>protection==='child'?{parentId:'p'}:null,programTextInputPending:pending,
  textArea:()=>protection==='editor-missing-equal-raw'?null:area,composingRef,regionPendingRef,checkPendingRef,
  queueMicrotask:(work:()=>void)=>microtasks.push(work),orderEpochRef:{current:0},orderHistoryRef:{current:{clear:()=>{}}},orderPositionsRef:{current:[]},props:{workspace:next}};
 const native={setValue:(raw:string)=>{installations++;if(protection?.startsWith('installation-failed')||composingRef.current)return false;area.value=raw;return true;},refresh:()=>{}};
 scope.editorRef={current:protection==='editor-missing-equal-raw'?null:native};
 const notify=executeSourceExpression<(state:ProgramTextDraftState)=>void>(source.notify,scope);
 const controller=createProgramTextDraft(before,'d',()=>commit,notify);
 scope.draftRef={current:controller};
 notify(controller.getState());
 let flight:Promise<boolean>|null=null;
 if(protection==='dirty'||protection==='saving'){
  assert(controller.updateRaw(beforeRaw.replace(' 부모',' 부모 수정'),'',{inputType:'insertText'}));
  if(protection==='saving')flight=controller.save();
 }
 if(protection==='invalid')controller.rejectRaw(beforeRaw+'\n유지할 미반영 입력');
 const effect=executeSourceExpression<()=>void>(source.effect,scope);
 notices.length=0;
 return{before,next,area,controller,notices,get parentPending(){return parentPending;},get installations(){return installations;},
  effect:()=>{effect();while(microtasks.length)microtasks.shift()!();},
  settle:async()=>{if(flight){releaseCommit(false);assert.equal(await flight,false);}}};
}

test('actual external synchronize installs changed source RAW and republishes clean parent pending after the native handoff',()=>{
 const h=synchronizationHarness(actualSynchronizationSource());
 assert.equal(h.controller.getState().dirty,false);assert.equal(h.parentPending,false);
 h.effect();
 assert.equal(h.installations,1);assert.equal(h.area.value,M.raw(h.next.documents[0]));
 assert.equal(h.controller.getState().raw,h.area.value);assert.equal(h.controller.getState().dirty,false);
 assert.deepEqual(h.controller.getState().committed,h.next);
 assert.deepEqual(h.notices,[true,false],'the early raw mismatch must be followed by the installed native pending state');
 assert.equal(h.parentPending,false,'a clean external date update must not leave the parent dirty latch set');
 assert.deepEqual(h.next.progressRecords,h.before.progressRecords);
});

test('actual synchronize keeps protection for failed or missing installation and every live input owner; blocked drafts are not overwritten',async()=>{
 const source=actualSynchronizationSource();
 for(const protection of['installation-failed','installation-failed-equal-raw','editor-missing-equal-raw','ime','region','child','check','dirty','invalid','saving'] as const){
  const h=synchronizationHarness(source,protection),state=h.controller.getState(),nativeBefore=h.area.value;
  if(protection==='saving')assert.equal(state.saving,true);
  h.effect();
  assert.equal(h.parentPending,true,protection+' must not release the parent input guard');
  if(['region','dirty','invalid','saving'].includes(protection)){
   assert.strictEqual(h.controller.getState(),state,protection+' must refuse external synchronize');
   assert.equal(h.installations,0,protection);assert.equal(h.area.value,nativeBefore,protection);
  }
  if(protection.startsWith('installation-failed')||protection==='editor-missing-equal-raw'||protection==='ime')assert.equal(h.area.value,nativeBefore,protection);
  if(protection.endsWith('equal-raw'))assert.equal(h.area.value,h.controller.getState().raw,'equal raw alone cannot certify installation: '+protection);
  await h.settle();
 }
});
