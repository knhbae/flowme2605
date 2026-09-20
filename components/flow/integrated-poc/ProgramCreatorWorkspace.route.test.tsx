import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {programLocation} from '../../../lib/flow/integrated-poc/navigation';

const source=readFileSync(new URL('./ProgramCreatorWorkspace.tsx',import.meta.url),'utf8');
const app=readFileSync(new URL('./ProgramApp.tsx',import.meta.url),'utf8');
function expression(text:string,name:string){const ast=ts.createSourceFile('test.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let result='';function visit(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)result=n.getText(ast);if(ts.isVariableDeclaration(n)&&n.name.getText(ast)===name)result=n.initializer!.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert(result,name);return result;}
function run(text:string,context:any){const js=ts.transpileModule(`const value=(${text});`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;return new Function('context',`with(context){${js};return value;}`)(context);}
const old={draftId:'old',rawText:'old text',title:'old',baseRecordRevision:1},fresh={draftId:'new',rawText:'',title:'',baseRecordRevision:null};
function harness(){
  const calls:any[]=[],ref=(current:any)=>({current});let writes=0,fail=false,dirty=false,saveOK=true;
  const c:any={actorId:'local-user',props:{active:true},selectedDraftId:'old',current:ref({envelope:{data:{activeActorId:'local-user'}}}),destinationRef:ref({view:'creator',id:'old'}),
    baseline:ref(old),bufferRef:ref(old),pending:ref(false),lockCount:ref(0),composing:ref(false),saving:ref(null),editor:ref({readSnapshot:()=>({composing:false})}),
    dataRef:ref({spaces:{'local-user':{creatorWorkspace:{}}}}),nativeContextPort:ref(null),sourceUpdatePort:ref(null),choiceRoute:ref(null),choice:null,
    setProgramCreatorWorking:(_data:any,input:any)=>input,programCreatorNeedsSave:()=>dirty,creatorWorkingFromRecord:(_own:any,id:string)=>({old,fresh,new:fresh} as any)[id],
    programErrorMessage:(reason:string)=>reason,report:()=>{},nativeBuffer:()=>c.bufferRef.current,programSame:(a:any,b:any)=>JSON.stringify(a)===JSON.stringify(b),
    mutate:async(_label:string,build:any)=>{if(fail)return{ok:false,reason:'quota'};writes++;build({});return{ok:true};},
    saveExplicit:async()=>saveOK,
    navigate:(next:any,options:any)=>{calls.push({next,options});c.destinationRef.current=next;c.selectedDraftId=next.id;},
    setChoice:(next:any)=>{c.choice=next;},setBuffer:()=>{},setBusy:()=>{}};
  for(const name of ['blankSourceFocus','historyRequest','structureHistory','orderHistory','nativeHandoffRef','nativeHandoffRequest','nativeLineageRef','lineageRequest'])c[name]=ref(null);
  for(const name of ['setMount','setNativeItem','setComparison','setReplacement','setHistoryPreview','setHistoryEntry','setNativeHandoff','setNativeHandoffChoices','setTab','setMessage','setNativeLineage','setLineageMapping'])c[name]=()=>{};
  c.captureCreatorRoute=run(expression(app,'captureCreatorRoute'),c);c.props.captureRoute=c.captureCreatorRoute;
  for(const name of ['captureSelectionRoute','restoreSelectionRoute','cancelChoice','saveChoice','switchWorking','choose'])c[name]=run(expression(source,name),c);
  const ast=ts.createSourceFile('w.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let effect='';function visit(n:ts.Node){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes("if(props.active===false"))effect=n.arguments[0].getText(ast);ts.forEachChild(n,visit);}visit(ast);c.effect=run(effect,c);
  return{c,calls,writes:()=>writes,fail:(v=true)=>{fail=v;},dirty:()=>{dirty=true;},saveFail:()=>{saveOK=false;}};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('actual selection success synchronizes blank and existing IDs; clean same-ID reentry is no write',async()=>{
  const h=harness();h.c.choose(fresh);await tick();assert.equal(h.c.bufferRef.current,fresh);assert.deepEqual(h.calls,[{next:{view:'creator',id:'new'},options:{replace:false}}]);
  // A save changes record metadata, not its selected route; reentry must not select old.
  h.c.bufferRef.current={...fresh,baseRecordRevision:1};const writes=h.writes();h.c.effect();await tick();assert.equal(h.writes(),writes);assert.equal(h.c.selectedDraftId,'new');
  h.c.choose(old);await tick();assert.equal(h.calls.at(-1)!.next.id,'old');assert.equal(h.calls.at(-1)!.options.replace,false);
});
test('actual Back/Forward route selection replaces but never pushes; close synchronizes bare creator',async()=>{
  const h=harness();h.c.destinationRef.current={view:'creator',id:'new'};h.c.selectedDraftId='new';h.c.effect();await tick();assert.equal(h.c.bufferRef.current,fresh);assert(h.calls.every(x=>x.options.replace));
  h.c.destinationRef.current={view:'creator',id:'old'};h.c.selectedDraftId='old';h.c.effect();await tick();assert.equal(h.c.bufferRef.current,old);assert(h.calls.every(x=>x.options.replace));
  h.c.choose('close');await tick();assert.equal(h.c.bufferRef.current,null);assert.deepEqual(h.calls.at(-1).next,{view:'creator'});
});
test('route dirty cancel restores current URL with zero writes; discard accepts selected target',async()=>{
  const h=harness();h.dirty();h.c.destinationRef.current={view:'creator',id:'new'};h.c.selectedDraftId='new';h.c.effect();assert.equal(h.c.choice,fresh);assert.equal(h.writes(),0);
  h.c.cancelChoice();assert.equal(h.c.selectedDraftId,'old');assert.equal(h.calls.at(-1).options.replace,true);assert.equal(h.writes(),0);
  h.c.choose(fresh);await h.c.switchWorking(fresh);assert.equal(h.c.selectedDraftId,'new');assert.equal(h.writes(),1);
});
test('failed route switch and failed save preserve input and restore URL; retry can succeed',async()=>{
  const h=harness();h.fail();h.c.destinationRef.current={view:'creator',id:'new'};h.c.selectedDraftId='new';h.c.effect();await tick();assert.equal(h.c.bufferRef.current,old);assert.equal(h.c.selectedDraftId,'old');assert.equal(h.writes(),0);
  h.fail(false);h.c.choose(fresh);await tick();assert.equal(h.c.selectedDraftId,'new');
  const d=harness();d.dirty();d.saveFail();d.c.destinationRef.current={view:'creator',id:'new'};d.c.selectedDraftId='new';d.c.effect();await d.c.saveChoice();assert.equal(d.c.selectedDraftId,'old');assert.equal(d.c.choice,fresh);assert.equal(d.writes(),0);
});
test('IME/lock and hidden surface never change working; missing route rolls back',async()=>{
  for(const mode of ['ime','lock','hidden']){const h=harness();if(mode==='ime')h.c.composing.current=true;if(mode==='lock')h.c.lockCount.current=1;if(mode==='hidden')h.c.props.active=false;h.c.selectedDraftId='new';h.c.destinationRef.current={view:'creator',id:'new'};h.c.effect();await tick();assert.equal(h.writes(),0);assert.equal(h.c.bufferRef.current,old);}
  const h=harness();h.c.selectedDraftId='missing';h.c.destinationRef.current={view:'creator',id:'missing'};h.c.effect();assert.equal(h.c.selectedDraftId,'old');assert.equal(h.writes(),0);
});
test('async route tickets cannot steal another surface, actor or a later visit to the same route',async()=>{
  for(const destination of [{view:'space'},{view:'creator',id:'old'},{view:'creator',id:'third'}]){const h=harness();let resolve:any;h.c.mutate=()=>new Promise(done=>{resolve=done;});const work=h.c.switchWorking(fresh);h.c.destinationRef.current=destination;resolve({ok:true});await work;assert.equal(h.calls.length,0);}
  const h=harness(),commit=h.c.captureCreatorRoute();h.c.current.current.envelope.data.activeActorId='other';assert.equal(commit('new',false),false);assert.equal(h.calls.length,0);
});
test('App navigate explicit replace preserves existing navigation guards and does not push',()=>{
  const init=expression(app,'navigate');const calls:any[]=[];const c:any={useCallback:(fn:any)=>fn,rememberNavigation:()=>{},allowOutputReturnNavigation:()=>true,scopeFeedbackToDestination:()=>{},settings:{current:null},current:{current:null},positions:{current:new Map()},destinationRef:{current:{view:'creator',id:'old'}},pendingNavigation:{current:null},programLocation,window:{location:{hash:'#flowme/creator/new'},history:{replaceState:(...x:any[])=>calls.push(['replace',...x]),pushState:(...x:any[])=>calls.push(['push',...x])}},setDestination:()=>{},setSeen:()=>{}};
  const navigate=run(init,c);navigate({view:'creator',id:'old'},{replace:true});assert.equal(calls.length,1);assert.equal(calls[0][0],'replace');
});
