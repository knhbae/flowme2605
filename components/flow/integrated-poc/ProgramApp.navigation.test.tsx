import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as navigation from '../../../lib/flow/integrated-poc/navigation';
import {nextProgramMutationFeedback,programMutationFeedbackAfterNavigation,type ProgramMutationFeedback} from '../../../lib/flow/integrated-poc/mutation-feedback';

// Execute the current production effect/callback bodies, not a parallel model of
// them. Child rendering and real browser layout remain a separate integration gate.
const source=readFileSync(new URL('./ProgramApp.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('ProgramApp.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find(predicate:(node:ts.Node)=>boolean):ts.Node {let found:ts.Node|undefined;function visit(node:ts.Node){if(predicate(node)){found=node;return;}if(!found)ts.forEachChild(node,visit);}visit(ast);assert(found);return found;}
const callback=(name:string)=>(find(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name) as ts.VariableDeclaration).initializer as ts.CallExpression;
const effect=find(node=>ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]?.getText(ast).includes('const checkpoint = readProgramNavigationCheckpoint')) as ts.CallExpression;
function evaluate(expression:string,context:Record<string,unknown>){const code=ts.transpileModule(`const value=${expression};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;return new Function(...Object.keys(context),`${code};return value;`)(...Object.values(context));}
const discoverySource=ts.createSourceFile('ProgramDiscovery.tsx',readFileSync(new URL('./ProgramDiscovery.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const helperNames=['createProgramDiscoveryNavigationState','captureProgramDiscoveryPresentation','restoreProgramDiscoveryPresentation'];
const helpers:Record<string,any>={readProgramDiscoveryPresentation:navigation.readProgramDiscoveryPresentation};
for(const name of helperNames){const fn=discoverySource.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name)!;helpers[name]=evaluate(`(${fn.getText(discoverySource).replace(/^export /u,'')})`,helpers);}
const presentation={query:'입주 준비',category:'생활',situation:'첫 입주',lastFlowId:'flow-a',scrollTop:122,versionByFlow:{'flow-a':'version-2'},details:{'version-2':{selectedItemIds:['item-1'],anchor:'2026-10-03',format:'ics' as const}}};
test('actual App passes exact legacy route identity and does not use a different surface ID',()=>{
 const node=find(node=>ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='ProgramLegacyWorkspace') as ts.JsxSelfClosingElement;
 const attr=node.attributes.properties.find(value=>ts.isJsxAttribute(value)&&value.name.getText(ast)==='selectedFlowId') as ts.JsxAttribute;
 assert(attr?.initializer&&ts.isJsxExpression(attr.initializer)&&attr.initializer.expression);
 for(const destination of [{view:'legacy',id:'saved-flow:exact:second'},{view:'legacy'},{view:'space',id:'unrelated-document'}]){
  assert.equal(evaluate(attr.initializer.expression.getText(ast),{destination}),destination.view==='legacy'?destination.id:undefined);
 }
});
test('actual presentation recovery retries notification only and keeps the notice on continued failure',async()=>{
  const fn=find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='retryPresentation') as ts.FunctionDeclaration;
  for(const presentationPending of [true,false]) {
    let calls=0,shown=true,status='',failed=true;
    const changingContext={current:false};
    const retry=evaluate(`(${fn.getText(ast)})`,{controller:{current:{refresh:async()=>{calls++;return {ok:true,result:'local-user',changed:false,...(presentationPending?{presentationPending:true}:{})};}}},changingContext,deferredSnapshot:{current:null},
      setPresentationPending:(value:boolean)=>{shown=value;},setStatus:(value:string)=>{status=value;},setFailed:(value:boolean)=>{failed=value;},programErrorMessage:()=>{throw Error('no storage failure');}});
    await retry(); assert.equal(calls,1);assert.equal(shown,presentationPending);assert.equal(changingContext.current,false);
    if(!presentationPending){assert.equal(failed,false);assert.equal(status,'저장된 화면을 다시 확인했습니다.');}
    else assert.equal(status,'');
  }
});
function harness(checkpoint:unknown){
  const actorId='local-user',states={current:{} as Record<string,any>},restoring={current:false},frames=new Map<number,()=>void>();let frame=0,replaces=0,spaceRestores=0;
  const window={location:{hash:'#flowme/space',href:'http://local/my?personalWorkspacePoc=v1#flowme/space'},scrollY:0,scrollTo(){},history:{state:{flowmeProgram:checkpoint},replaceState(next:any){this.state=next;replaces++;},pushState(next:any,_unused:string,url:string){this.state=next;window.location.hash=url;window.location.href=`http://local/my?personalWorkspacePoc=v1${url}`;}}};
  const context:Record<string,any>={...navigation,...helpers,window,document:{activeElement:null,getElementById:()=>null},HTMLElement:class{},current:{current:{envelope:{data:{activeActorId:actorId}}}},snapshot:{envelope:{data:{activeActorId:actorId}}},destination:{view:'space'},destinationRef:{current:{view:'space'}},restoringNavigation:restoring,discoveryStatesRef:states,discoveryNavigation:{current:null},spaceNavigation:{current:{actorId,capture:()=>({}),restore:()=>{spaceRestores++;}}},positions:{current:new Map()},main:{current:null},setDiscoveryStates(value:any){states.current=value;},requestAnimationFrame(fn:()=>void){frames.set(++frame,fn);return frame;},cancelAnimationFrame(id:number){frames.delete(id);}};
  context.communityStatesRef={current:{}};context.setCommunityStates=(value:any)=>{context.communityStatesRef.current=value;};
  context.communityInputRevision={current:0};
  context.discoveryInputRevision={current:0};
  context.pendingNavigation={current:null};
  context.rememberNavigation=evaluate(callback('rememberNavigation').arguments[0].getText(ast),context);
  Object.assign(context,{settings:{current:null},setDestination(next:any){context.destination=next;},setSeen(){}});
  Object.assign(context,{editors:{current:null},setFailed(){},setStatus(){}});
  context.current.current.envelope.data.spaces={'local-user':{copies:[]}};
  context.feedback={status:'',failed:false};context.setFeedback=(update:any)=>{context.feedback=update(context.feedback);};
  context.programMutationFeedbackAfterNavigation=programMutationFeedbackAfterNavigation;
  context.scopeFeedbackToDestination=evaluate(callback('scopeFeedbackToDestination').arguments[0].getText(ast),context);
  context.allowOutputReturnNavigation=evaluate(callback('allowOutputReturnNavigation').arguments[0].getText(ast),context);
  context.navigate=evaluate(callback('navigate').arguments[0].getText(ast),context);
  const drain=()=>{while(frames.size){const [id,fn]=frames.entries().next().value!;frames.delete(id);fn();}};
  return {context,window,states,drain,beginRestore(){evaluate(effect.arguments[0].getText(ast),context)();},get replaces(){return replaces;},get spaceRestores(){return spaceRestores;},restore(){evaluate(effect.arguments[0].getText(ast),context)();drain();},remember(){context.rememberNavigation();},navigate(next:any){context.navigate(next);}};
}
const checkpoint=()=>({schema:'flowme-navigation/1',actorId:'local-user',location:'#flowme/space',scroll:0,focus:null,discovery:structuredClone(presentation)});

test('actual App restoration cannot steal explicit public item or reply focus with an older main checkpoint',()=>{
 for(const destination of [{view:'flow' as const,id:'flow-a',versionId:'version-2',itemId:'item-1'},{view:'community' as const,id:'post-a',replyId:'reply-a'}]){
  const location=navigation.programLocation(destination),h=harness({...checkpoint(),location,focus:'program-main'}),calls:string[]=[];
  const targetId=destination.view==='flow'?'program-public-item-version-2-item-1':'reply-reply-a';
  const target={id:targetId,focus(){calls.push(targetId);}},main={id:'program-main',focus(){calls.push('program-main');h.context.document.activeElement=main;}};
  h.context.destination=destination;h.context.destinationRef.current=destination;h.window.location.hash=location;
  h.context.document={activeElement:target,getElementById:(id:string)=>id===targetId?target:id==='program-main'?main:null};h.context.main.current=main;
  h.restore();assert.equal(h.context.document.activeElement,target);assert.deepEqual(calls,[]);assert.equal(h.context.restoringNavigation.current,false);
 }
});
test('actual App restoration retains normal document Back focus and scroll',()=>{
 const destination={view:'space' as const,id:'doc-a'},location=navigation.programLocation(destination),h=harness({...checkpoint(),location,focus:'doc-toolbar',scroll:321});
 const calls:string[]=[],scrolls:unknown[]=[];const target={focus(){calls.push('doc-toolbar');}};
 h.context.destination=destination;h.context.destinationRef.current=destination;h.window.location.hash=location;h.context.document.getElementById=(id:string)=>id==='doc-toolbar'?target:null;h.window.scrollTo=(value?:unknown)=>{scrolls.push(value);};
 h.restore();assert.deepEqual(calls,['doc-toolbar']);assert.deepEqual(scrolls,[{top:321,behavior:'instant'}]);
});
test('missing explicit item does not suppress an available checkpoint focus or substitute another item',()=>{
 const destination={view:'flow' as const,id:'flow-a',versionId:'version-2',itemId:'missing'},location=navigation.programLocation(destination),h=harness({...checkpoint(),location,focus:'program-main'}),calls:string[]=[];
 h.context.destination=destination;h.context.destinationRef.current=destination;h.window.location.hash=location;h.context.document.getElementById=(id:string)=>id==='program-main'?{focus(){calls.push(id);}}:null;
 h.restore();assert.deepEqual(calls,['program-main']);
});

function actualDiscoveryChange(h:ReturnType<typeof harness>){
 const node=find(node=>ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='ProgramDiscovery') as ts.JsxSelfClosingElement;
 const attr=node.attributes.properties.find(value=>ts.isJsxAttribute(value)&&value.name.getText(ast)==='onNavigationStateChange') as ts.JsxAttribute;
 assert(attr.initializer&&ts.isJsxExpression(attr.initializer)&&attr.initializer.expression);
 if(source.includes('const changeDiscoveryPresentation =')) h.context.changeDiscoveryPresentation=evaluate(callback('changeDiscoveryPresentation').arguments[0].getText(ast),h.context);
 h.context.data={activeActorId:'local-user'};
 return evaluate(attr.initializer.expression.getText(ast),h.context);
}
test('actual discovery callback checkpoints immediately and rejects foreign actor or invalid presentation without exposing raw input',()=>{
 const h=harness(checkpoint());h.restore();const change=actualDiscoveryChange(h);
 const state={...helpers.createProgramDiscoveryNavigationState(),...structuredClone(presentation),category:'여행',pastedText:'SECRET input'};
 change(state);
 assert.equal((h.window.history.state.flowmeProgram as navigation.ProgramNavigationCheckpoint).discovery?.category,'여행');
 assert.equal(JSON.stringify(h.window.history.state).includes('SECRET'),false);
 const before=JSON.stringify(h.window.history.state),revision=h.context.discoveryInputRevision.current,count=h.replaces;
 h.context.data.activeActorId='other';change({...state,query:'foreign'});
 h.context.data.activeActorId='local-user';change({...state,query:'x'.repeat(3001)});
 assert.equal(h.context.discoveryInputRevision.current,revision);assert.equal(h.replaces,count);assert.equal(JSON.stringify(h.window.history.state),before);
 assert.equal(h.states.current['local-user'],state);assert.equal(h.states.current.other,undefined);
});
test('actual discovery select callback survives pending and queued restoration and persists only whitelisted presentation',()=>{
 for(const timing of ['before-effect','queued-frame'])for(const mounted of [false,true]){
  const h=harness(checkpoint());h.restore();
  if(mounted)h.context.discoveryNavigation.current={actorId:'local-user',capture:()=>({discovery:helpers.captureProgramDiscoveryPresentation(h.states.current['local-user'])}),restore:(value:any)=>{h.states.current['local-user']=helpers.restoreProgramDiscoveryPresentation(h.states.current['local-user'],value,'local-user');}};
  h.navigate({view:'discover'});const pending=h.context.pendingNavigation.current;assert(pending);
  if(timing==='queued-frame')h.beginRestore();
  const change=actualDiscoveryChange(h),expected={...structuredClone(presentation),query:'치앙마이',category:'여행/장기체류',situation:'치앙마이'};
  change({...helpers.createProgramDiscoveryNavigationState(),...expected,url:'https://private.invalid/SECRET',pastedText:'SECRET raw',pastedTitle:'SECRET title',transient:{raw:'SECRET draft'},transientSource:{text:'SECRET source'}});
  assert.equal(h.context.pendingNavigation.current,pending,'input must not replace the navigation identity');
  const immediateCheckpoint=structuredClone(h.window.history.state.flowmeProgram);
  if(timing==='before-effect')h.beginRestore();h.drain();
  assert.deepEqual(helpers.captureProgramDiscoveryPresentation(h.states.current['local-user']),expected,'late restoration must not overwrite real select callback input');
  assert.deepEqual((immediateCheckpoint as navigation.ProgramNavigationCheckpoint).discovery,expected,'native select change must checkpoint before frames or another click');
  assert.equal(h.states.current['local-user'].pastedText,'SECRET raw');
  assert.equal(JSON.stringify(h.window.history.state).includes('SECRET'),false);
  assert.equal(h.context.pendingNavigation.current,null);
  h.navigate({view:'flow',id:'flow-a'});h.restore();h.navigate({view:'space'});h.restore();h.navigate({view:'discover'});h.restore();
  assert.deepEqual(helpers.captureProgramDiscoveryPresentation(h.states.current['local-user']),expected,'detail/private/catalog roundtrip retains selected filters');
  const reloaded=harness(structuredClone(h.window.history.state.flowmeProgram));reloaded.context.destination={view:'discover'};reloaded.context.destinationRef.current={view:'discover'};reloaded.window.location.hash='#flowme/discover';reloaded.restore();
  assert.deepEqual(helpers.captureProgramDiscoveryPresentation(reloaded.states.current['local-user']),expected);
  assert.equal(reloaded.states.current['local-user'].pastedText,'');
 }
});

test('actual output-return navigation preserves unapplied input on menu, same-target and cancel paths without invoking a writer',()=>{
 const h=harness(null), from={view:'space' as const,id:'doc',returnActorId:'local-user',executionKey:JSON.stringify(['text-task','doc','line'])};
 h.context.destination=from;h.context.destinationRef.current=from;
 h.window.location.hash=navigation.programLocation(from);
 let pending=true;
 h.context.editors.current={hasPendingInput:()=>pending};
 const before=h.window.location.hash;
 h.navigate({view:'discover'});
 assert.equal(h.window.location.hash,before);assert.equal(h.context.destination,from);
 assert.equal(h.context.allowOutputReturnNavigation(from),true,'same target does not lose or save input');
 pending=false;h.navigate({view:'discover'});
 assert.equal(h.window.location.hash,'#flowme/discover');
});

test('actual popstate/hashchange handler rejects unmounting a return draft and only restores its presentation URL',()=>{
 const route=(find(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)==='route') as ts.VariableDeclaration).initializer!;
 const from={view:'space' as const,id:'doc',returnActorId:'local-user',executionKey:JSON.stringify(['text-task','doc','line'])};
 for(const hash of ['#flowme/discover','#flowme/space/other?actor=other&execution='+encodeURIComponent(JSON.stringify(['text-task','other','line']))]) {
  const h=harness(null);h.context.destination=from;h.context.destinationRef.current=from;h.window.location.hash=hash;
  let pending=true,restored='';h.context.editors.current={hasPendingInput:()=>pending};
  h.window.history.replaceState=(_state:any,_unused?:string,url?:string)=>{restored=url??'';};
  const handler=evaluate(route.getText(ast),h.context);handler();
  assert.equal(h.context.destination,from);assert.equal(restored,navigation.programLocation(from));
  pending=false;handler();assert.deepEqual(h.context.destination,navigation.parseProgramLocation(hash));
 }
});

test('actual output-link guard withholds Space for a different actor without changing actor or destination',()=>{
 const declaration=(name:string)=>(find(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)===name) as ts.VariableDeclaration).initializer!;
 const destination={view:'space',id:'private-doc',returnActorId:'participant-jihun',executionKey:JSON.stringify(['text-task','private-doc','private-line'])};
 const before=JSON.stringify(destination);
 for(const activeActorId of ['local-user','participant-jihun']){
  const outputReturn=evaluate(declaration('outputReturn').getText(ast),{destination});
  const mismatch=evaluate(declaration('outputActorMismatch').getText(ast),{outputReturn,data:{activeActorId}});
  assert.equal(mismatch,activeActorId!=='participant-jihun');
 }
 assert.equal(JSON.stringify(destination),before);
 const renderBranch=find(node=>ts.isConditionalExpression(node)&&node.condition.getText(ast)==='outputActorMismatch') as ts.ConditionalExpression;
 assert(!renderBranch.whenTrue.getText(ast).includes('ProgramSpace'));
 assert(renderBranch.whenFalse.getText(ast).includes('outputReturn={outputReturn}'));
});

test('actual explicit actor selection resumes only the matching output target and preserves failed pending input',async()=>{
 const fn=find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='switchActor') as ts.FunctionDeclaration;
 for(const nextId of ['participant-jihun','participant-other'])for(const flush of [true,false]){
  const destination={view:'space',id:'doc',returnActorId:'participant-jihun',executionKey:JSON.stringify(['text-task','doc','line'])};
  let mutations=0,releases=0;const routes:unknown[]=[];
  const change=evaluate(`(${fn.getText(ast)})`,{changingContext:{current:false},rememberNavigation(){},lockEditors:()=>()=>{releases++;},
   current:{current:{envelope:{data:{activeActorId:'local-user'}}}},destinationRef:{current:destination},flushEditors:async()=>flush,
   setFailed(){},setStatus(){},setPublisher(){},setInspector(){},setRevisionDocument(){},setCreatorLibraryOpen(){},setOutputDocument(){},
   mutate:async(_label:string,build:(data:any)=>any)=>{mutations++;return build({activeActorId:'local-user',actors:[{id:nextId}]});},
   programFailure:(data:unknown,reason:string)=>({ok:false,data,reason}),programClone:structuredClone,programResult:(_before:unknown,data:unknown,result:string)=>({ok:true,data,result}),navigate:(value:unknown)=>routes.push(value)});
  await change(nextId);assert.equal(releases,1);assert.equal(mutations,flush?1:0);
  assert.deepEqual(routes,flush?[nextId==='participant-jihun'?destination:{view:'space'}]:[]);
 }
});

test('actual community change callback captures before any animation frame or pagehide and fresh reload restores it',()=>{
 const h=harness(checkpoint());h.restore();
 const change=evaluate(callback('changeCommunityPresentation').arguments[0].getText(ast),h.context);
 const value={version:1,query:'즉시 검색',kind:'experience'};
 change('local-user',value);
 assert.deepEqual((h.window.history.state.flowmeProgram as navigation.ProgramNavigationCheckpoint).community,value);
 const immediate=harness(structuredClone(h.window.history.state.flowmeProgram));immediate.restore();
 assert.deepEqual(immediate.context.communityStatesRef.current['local-user'],value);
 h.remember(); // actual pagehide callback, without a frame or React render
 const afterHide=harness(structuredClone(h.window.history.state.flowmeProgram));afterHide.restore();
 assert.deepEqual(afterHide.context.communityStatesRef.current['local-user'],value);
 const before=JSON.stringify(h.window.history.state),count=h.replaces;
 change('other',{...value,query:'다른 사람'});change('local-user',{...value,raw:'PRIVATE DRAFT'});
 assert.equal(JSON.stringify(h.window.history.state),before);assert.equal(h.replaces,count);
 assert.equal(JSON.stringify(h.window.history.state).includes('PRIVATE'),false);
 h.context.restoringNavigation.current=true;
 change('local-user',{...value,query:'복구 도중 입력'});
 assert.equal((h.window.history.state.flowmeProgram as navigation.ProgramNavigationCheckpoint).community?.query,'복구 도중 입력');
});

test('community input during actual queued restore survives late frames and a fresh restore without forced guard changes',()=>{
 const h=harness({...checkpoint(),community:{version:1,query:'이전',kind:'all'}});
 h.beginRestore();
 const change=evaluate(callback('changeCommunityPresentation').arguments[0].getText(ast),h.context);
 const value={version:1,query:'프레임 전 새 입력',kind:'knowledge'};
 change('local-user',value);
 assert.deepEqual((h.window.history.state.flowmeProgram as navigation.ProgramNavigationCheckpoint).community,value);
 h.drain();
 assert.deepEqual(h.context.communityStatesRef.current['local-user'],value);
 const reloaded=harness(structuredClone(h.window.history.state.flowmeProgram));reloaded.restore();
 assert.deepEqual(reloaded.context.communityStatesRef.current['local-user'],value);
});

test('community input between explicit navigation and its restore effect survives without replacing pending navigation identity',()=>{
 const h=harness({...checkpoint(),community:{version:1,query:'이전 검색',kind:'all'}});h.restore();
 h.navigate({view:'community'});const pending=h.context.pendingNavigation.current;assert(pending);
 const change=evaluate(callback('changeCommunityPresentation').arguments[0].getText(ast),h.context);
 const value={version:1,query:'이동 직후 새 검색',kind:'question'};change('local-user',value);
 assert.equal(h.context.pendingNavigation.current,pending);
 h.restore();assert.deepEqual(h.context.communityStatesRef.current['local-user'],value);
 assert.equal(h.context.pendingNavigation.current,null);
 const reloaded=harness(structuredClone(h.window.history.state.flowmeProgram));
 reloaded.context.destination={view:'community'};reloaded.context.destinationRef.current={view:'community'};reloaded.window.location.hash='#flowme/community';reloaded.restore();
 assert.deepEqual(reloaded.context.communityStatesRef.current['local-user'],value);
});
test('community search survives actual unmounted reload effect and capture without content writes',()=>{
 const community={version:1 as const,query:'부분 경험',kind:'experience' as const};
 const h=harness({...checkpoint(),community});h.restore();
 assert.deepEqual(h.context.communityStatesRef.current['local-user'],community);
 assert.deepEqual((h.window.history.state.flowmeProgram as navigation.ProgramNavigationCheckpoint).community,community);
 h.context.communityStatesRef.current['other']={version:1,query:'다른 사람',kind:'all'};h.remember();
 assert.deepEqual((h.window.history.state.flowmeProgram as navigation.ProgramNavigationCheckpoint).community,community);
 const old=harness(checkpoint());old.restore();assert.deepEqual(old.context.communityStatesRef.current['local-user'],navigation.emptyProgramCommunityPresentation());
});
test('browser entry restore replays its own community filters; foreign actor and corrupt presentation cannot restore',()=>{
 const early={version:1 as const,query:'처음',kind:'question' as const},later={version:1 as const,query:'나중',kind:'knowledge' as const};
 const h=harness({...checkpoint(),community:early});h.restore();h.context.communityStatesRef.current['local-user']=later;h.remember();
 h.window.history.state.flowmeProgram={...checkpoint(),community:early};h.restore();assert.deepEqual(h.context.communityStatesRef.current['local-user'],early);
 for(const value of [{...checkpoint(),actorId:'other',community:later},{...checkpoint(),community:{...later,body:'PRIVATE DRAFT'}}]){
  const bad=harness(value);bad.restore();assert.equal(bad.context.communityStatesRef.current['local-user'],undefined);assert.equal(JSON.stringify(bad.window.history.state).includes('PRIVATE'),false);
 }
});
test('space reload with unmounted discovery restores parent presentation before remember replaces history',()=>{
  const h=harness(checkpoint());h.restore();assert.equal(h.spaceRestores,1);assert.equal(h.replaces,1);assert.deepEqual((h.window.history.state.flowmeProgram as navigation.ProgramNavigationCheckpoint).discovery,presentation);
  assert.deepEqual(helpers.captureProgramDiscoveryPresentation(h.states.current['local-user']),presentation);
  let late:any=helpers.createProgramDiscoveryNavigationState();h.context.discoveryNavigation.current={actorId:'local-user',capture:()=>({discovery:helpers.captureProgramDiscoveryPresentation(late)}),restore:(value:any)=>{late=helpers.restoreProgramDiscoveryPresentation(late,value,'local-user');}};
  h.restore();assert.equal(late.query,'입주 준비');assert.equal(late.versionByFlow['flow-a'],'version-2');assert.equal(late.details['version-2'].anchor,'2026-10-03');
});
test('actor mismatch and malformed history never restore discovery or source input',()=>{
  for(const value of [{...checkpoint(),actorId:'other'},{...checkpoint(),discovery:{...presentation,pastedText:'SECRET'}},{...checkpoint(),discovery:{...presentation,details:{x:{selectedItemIds:[],anchor:'2026-02-30',format:'txt'}}}}]){
    const h=harness(value);h.restore();assert.equal(h.states.current['local-user'],undefined);assert.equal(h.spaceRestores,0);assert.equal(JSON.stringify(h.window.history.state).includes('SECRET'),false);
  }
});
test('unmounted fallback whitelists parent state; transient raw stays in memory only',()=>{
  const h=harness(checkpoint());h.restore();h.states.current['local-user']={...h.states.current['local-user'],pastedText:'PRIVATE RAW',pastedTitle:'PRIVATE TITLE',url:'https://private.invalid/token',transient:{raw:'PRIVATE TRANSIENT'},transientSource:{text:'PRIVATE SOURCE'}};
  h.remember();assert.deepEqual((h.window.history.state.flowmeProgram as navigation.ProgramNavigationCheckpoint).discovery,presentation);assert.equal(JSON.stringify(h.window.history.state).includes('PRIVATE'),false);assert.equal(h.states.current['local-user'].pastedText,'PRIVATE RAW');
});
test('actual mutate callback clears quiet retry failure for changed and no-op success',async()=>{
  for(const changed of [false,true]){let feedback={failed:true,status:'quota failure'},pending=0;const context={controller:{current:{mutate:async()=>({ok:true,changed,result:'saved'})}},current:{current:{envelope:{data:{activeActorId:'local-user'}}}},deferredSnapshot:{current:null},setPending:(update:any)=>{pending=update(pending);},setFeedback:(update:any)=>{feedback=update(feedback);},nextProgramMutationFeedback};
    const mutate=evaluate(callback('mutate').arguments[0].getText(ast),{...context,destinationRef:{current:{view:'space'}},programLocation:navigation.programLocation,scopeFeedbackToDestination:()=>{}});await mutate('입력 보관',()=>{}, {history:false});assert.equal(feedback.failed,false);assert.notEqual(feedback.status,'quota failure');assert.equal(pending,0);
  }
});

test('actual navigate callback and restore effect preserve newer detail choices through an older space entry',()=>{
  const old={...checkpoint(),discovery:{...presentation,details:{},lastFlowId:null}};
  const h=harness(old);h.context.positions.current.set('local-user:#flowme/space',structuredClone(old));
  h.context.destination={view:'flow',id:'flow-a'};h.context.destinationRef.current=h.context.destination;
  h.window.location.hash='#flowme/flow/flow-a';h.window.location.href='http://local/my?personalWorkspacePoc=v1#flowme/flow/flow-a';
  h.states.current['local-user']={...helpers.createProgramDiscoveryNavigationState(),...structuredClone(presentation),pastedText:'PRIVATE source'};
  h.context.discoveryNavigation.current={actorId:'local-user',capture:()=>({discovery:helpers.captureProgramDiscoveryPresentation(h.states.current['local-user'])}),
    restore:(value:any)=>{h.states.current['local-user']=helpers.restoreProgramDiscoveryPresentation(h.states.current['local-user'],value,'local-user');}};
  h.navigate({view:'space'});h.restore();
  const restored=navigation.readProgramNavigationCheckpoint(h.window.history.state.flowmeProgram,'local-user','#flowme/space');
  assert.ok(restored);assert.deepEqual(restored.discovery,presentation);
  assert.equal(h.states.current['local-user'].details['version-2'].anchor,'2026-10-03');
  assert.equal(h.states.current['local-user'].pastedText,'PRIVATE source');
  assert.equal(JSON.stringify(h.window.history.state).includes('PRIVATE'),false);
  assert.deepEqual(old.discovery.details,{},'prior browser history was not rewritten');
});

function completedFeedback(result='post-a'):ProgramMutationFeedback {return nextProgramMutationFeedback({status:'',failed:false},'글 삭제',{ok:true,result,changed:true},false,{actorId:'local-user',location:'#flowme/community/post-a'});}
test('actual navigate clears only completed success when a different post is committed, not a rejected navigation',()=>{
  const h=harness(checkpoint());h.context.feedback=completedFeedback();h.navigate({view:'community',id:'post-b'});assert.equal(h.context.feedback.status,'');
  const same=harness(checkpoint());same.context.feedback=completedFeedback();same.navigate({view:'community',id:'post-a'});assert.equal(same.context.feedback.status,'글 삭제 · 저장됨');
  const rejected=harness(checkpoint());rejected.context.feedback=completedFeedback();rejected.context.destinationRef.current={view:'space',executionKey:'exact'};rejected.context.editors.current={hasPendingInput:()=>true};rejected.navigate({view:'community',id:'post-b'});assert.equal(rejected.context.feedback.status,'글 삭제 · 저장됨');assert.equal(rejected.context.destination.view,'space');
});
test('actual hash and back route scope success identically, preserving failure and recovery notices',()=>{
  const route=(find(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)==='route') as ts.VariableDeclaration).initializer!;
  for(const feedback of [completedFeedback(),{status:'저장 실패',failed:true},{status:'저장됨 · 화면 갱신 필요',failed:false},{status:'다른 탭 입력 보호',failed:false}]) {
    const h=harness(checkpoint());h.context.feedback=feedback;h.window.location.hash='#flowme/community/post-b';evaluate(route.getText(ast),h.context)();
    assert.equal(h.context.feedback.status,'completion' in feedback?'':feedback.status);
    assert.equal(h.context.destination.id,'post-b');
  }
});
test('exact newly created post, reply, document and copy destination retains success',()=>{
  for(const [result,next] of [['post-new',{view:'community',id:'post-new'}],['reply-new',{view:'community',id:'post-a',replyId:'reply-new'}],['doc-new',{view:'space',id:'doc-new'}],['copy-new',{view:'space',id:'doc-copy'}]] as const) {
    const h=harness(checkpoint());h.context.feedback=completedFeedback(result);h.context.current.current.envelope.data.spaces['local-user'].copies=[{id:'copy-new',documentId:'doc-copy'}];h.navigate(next);assert.equal(h.context.feedback.status,'글 삭제 · 저장됨');
    h.navigate({view:'activity'});assert.equal(h.context.feedback.status,'');
  }
});
test('actual async mutation finishing after navigation cannot announce old success on a new post; failure remains',async()=>{
  for(const ok of [true,false]) {
    const h=harness(checkpoint());let resolve!:(result:any)=>void,pending=0;
    Object.assign(h.context,{controller:{current:{mutate:()=>new Promise(done=>{resolve=done;})}},deferredSnapshot:{current:null},setPending:(update:any)=>{pending=update(pending);},nextProgramMutationFeedback});
    const mutate=evaluate(callback('mutate').arguments[0].getText(ast),h.context),work=mutate('글 삭제',()=>{});
    h.navigate({view:'community',id:'post-b'});assert.equal(pending,1);
    resolve(ok?{ok:true,result:'post-a',changed:true}:{ok:false,reason:'storage-unavailable'});await work;
    assert.equal(pending,0);if(ok)assert.equal(h.context.feedback.status,'');else assert.equal(h.context.feedback.failed,true);
  }
});
test('actual warning setter removes completion classification before later navigation',()=>{
  const h=harness(checkpoint());h.context.feedback=completedFeedback();evaluate(callback('setStatus').arguments[0].getText(ast),h.context)('작성 중 입력 보호');h.navigate({view:'activity'});assert.equal(h.context.feedback.status,'작성 중 입력 보호');assert.equal(h.context.feedback.completion,undefined);
});
