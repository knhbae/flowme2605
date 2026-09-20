import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {programInputBlocksSnapshot} from '../../../lib/flow/integrated-poc/document-action';
import {createProgramData,createProgramEnvelope} from '../../../lib/flow/integrated-poc/program-data';

// Execute production JSX and callbacks. Browser top-layer geometry remains a
// separate check; here the actual recovery controls must be dialog descendants.
const source=readFileSync(new URL('./ProgramApp.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('ProgramApp.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const require=createRequire(import.meta.url);
function find(predicate:(node:ts.Node)=>boolean){let found:ts.Node|undefined;function visit(node:ts.Node){if(predicate(node)){found=node;return;}if(!found)ts.forEachChild(node,visit);}visit(ast);assert(found);return found;}
function evaluate(expression:string,context:Record<string,unknown>){const js=ts.transpileModule(`const value=${expression};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;return new Function('require','exports',...Object.keys(context),`${js};return value;`)(require,{},...Object.values(context));}
const recovery=(find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='externalRecovery') as ts.VariableDeclaration).initializer!;
const pagePlacement=find(n=>ts.isJsxExpression(n)&&n.expression?.getText(ast)==='!inspector && !publisher && externalRecovery') as ts.JsxExpression;
const publisherPlacement=find(n=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText(ast)==='ProgramPublisher') as ts.JsxSelfClosingElement;
const dialog=find(n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(ast)==='dialog'&&n.openingElement.attributes.getText(ast).includes('inspectorDialog')) as ts.JsxElement;
const functionText=(name:string)=>(find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name) as ts.FunctionDeclaration).getText(ast);
type Element={type:unknown;props:Record<string,any>};
function nodes(value:any):Element[]{if(!value)return[];if(Array.isArray(value))return value.flatMap(nodes);if(typeof value!=='object')return[];return[value,...nodes(value.props?.children)];}
const text=(value:any):string=>typeof value==='string'?value:Array.isArray(value)?value.map(text).join(''):value&&typeof value==='object'?text(value.props?.children):'';
function harness(){
 const old=createProgramEnvelope(createProgramData()),fresh=structuredClone(old);fresh.revision=1;
 let confirm=false,notice='다른 탭 변경',inspector:string|null='copy-a',downloads=0,refresh=0,locked=0,released=0,epoch=0,status='',fatal=false,snapshot=old;
 const closed:string[]=[],redirects:string[]=[],pending={value:true};
 const context:Record<string,any>={styles:{inputRecovery:'recovery',inspectorDialog:'inspector'},current:{current:{envelope:old,raw:'old'}},deferredSnapshot:{current:{envelope:fresh,raw:'new'}},acceptingExternal:{current:false},changingContext:{current:false},
  programInputBlocksSnapshot,editors:{current:null},legacyEditors:{current:null},communityEditors:{current:null},creatorEditors:{current:null},publisherEditors:{current:null},inspectorEditors:{current:{hasPendingInput:()=>pending.value,blocksExternalSnapshot:()=>true}},
  setExternalNotice:(value:string)=>{notice=value;},setConfirmExternal:(value:boolean)=>{confirm=value;},setSnapshot:(value:any)=>{snapshot=value.envelope;},
  lockEditors:()=>{locked++;return()=>{released++;};},setPresentationEpoch:(update:(value:number)=>number)=>{epoch=update(epoch);},setPublisher:()=>closed.push('publisher'),setInspector:(value:string|null)=>{inspector=value;closed.push('inspector');},setRevisionDocument:()=>closed.push('revision'),setCreatorLibraryOpen:()=>closed.push('library'),setOutputDocument:()=>closed.push('output'),setFailed:()=>{},setFatal:(value:boolean)=>{fatal=value;},setStatus:(value:string)=>{status=value;},window:{location:{replace:(value:string)=>redirects.push(value)}},
  controller:{current:{refresh:async()=>{refresh++;return{ok:true};},snapshot:()=>({envelope:fresh,raw:'new'})}},downloadPendingInput:()=>{downloads++;},inspectorDialog:{current:null},data:old.data,scopedMutate:()=>{throw Error('Recovery must not mutate');},navigate:()=>{},today:'2026-09-20',ProgramCopyInspector:'inspector-child'};
 const changed=(find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='changed') as ts.VariableDeclaration).initializer as ts.CallExpression;
 context.changed=evaluate(changed.arguments[0].getText(ast),context);
 context.acceptExternalDiscard=evaluate(`(${functionText('acceptExternalDiscard')})`,context);
 function render(publisher:string|null=null){const props={...context,externalNotice:notice,confirmExternal:confirm,inspector,publisher};const externalRecovery=evaluate(recovery.getText(ast),props);return{page:evaluate(pagePlacement.expression!.getText(ast),{inspector,publisher,externalRecovery}),dialog:inspector?evaluate(dialog.getText(ast),{...props,externalRecovery}):null,publisher:publisher?evaluate(publisherPlacement.getText(ast),{...props,externalRecovery,ProgramPublisher:'publisher-child'}):null};}
 function button(name:string){const rendered=render(),found=nodes([rendered.page,rendered.dialog]).filter(n=>n.type==='button'&&text(n.props.children)===name);assert.equal(found.length,1);return found[0];}
 return{context,old,fresh,pending,render,button,get confirm(){return confirm;},get inspector(){return inspector;},get downloads(){return downloads;},get refresh(){return refresh;},get locked(){return locked;},get released(){return released;},get epoch(){return epoch;},get status(){return status;},get snapshot(){return snapshot;},get fatal(){return fatal;},closed,redirects,setInspector:(value:string|null)=>{inspector=value;},setNotice:(value:string)=>{notice=value;}};
}

test('ER01 production recovery is rendered once inside active inspector, outside only without it',()=>{
 const h=harness();for(const inspector of ['copy-a',null])for(const notice of ['changed','']){h.setInspector(inspector);h.setNotice(notice);const tree=h.render(),all=nodes([tree.page,tree.dialog]).filter(n=>n.props['aria-label']==='다른 탭 변경과 입력 보호');assert.equal(all.length,notice?1:0);if(notice){assert.equal(nodes(inspector?tree.dialog:tree.page).includes(all[0]),true);assert.equal(nodes(inspector?tree.page:tree.dialog).includes(all[0]),false);assert.equal(nodes(all[0]).filter(n=>n.props.id!==undefined).length,0);}}
});
test('ER02 inspector input download/confirm/cancel use existing handlers without discard or store writes',()=>{
 const h=harness();h.button('작성 중 입력 TXT 받기').props.onClick();assert.equal(h.downloads,1);h.button('입력 버리고 최신 상태 보기').props.onClick();assert(h.confirm);h.button('입력 유지').props.onClick();assert(!h.confirm);assert.equal(h.refresh,0);assert.equal(h.inspector,'copy-a');assert(h.pending.value);assert.equal(h.snapshot,h.old);
});
test('ER03 explicit confirm refreshes once, presents latest snapshot, remounts editors and closes modal without mutate',async()=>{
 const h=harness();h.button('입력 버리고 최신 상태 보기').props.onClick();h.button('버리고 불러오기').props.onClick();await Promise.resolve();await Promise.resolve();assert.equal(h.refresh,1);assert.equal(h.locked,1);assert.equal(h.released,1);assert.equal(h.epoch,1);assert.equal(h.snapshot,h.fresh);assert.equal(h.inspector,null);assert(!h.confirm);assert.equal(h.context.deferredSnapshot.current,null);assert.equal(h.context.acceptingExternal.current,false);assert.equal(h.context.changingContext.current,false);assert.match(h.status,/최신 저장 상태/);assert.equal(nodes(h.render().page).length,0);
});
test('ER04 actual external changed callback keeps dirty inspector inputs until explicit decision',()=>{
 const h=harness();h.context.changed({envelope:h.fresh,raw:'new'},{external:true});assert.equal(h.snapshot,h.old);assert.equal(h.context.current.current.envelope,h.old);assert.equal(h.context.deferredSnapshot.current.raw,'new');assert(h.pending.value);assert.equal(h.refresh,0);assert.equal(h.button('입력 버리고 최신 상태 보기').type,'button');const event={prevented:false,preventDefault(){this.prevented=true;}};h.render().dialog.props.onCancel(event);assert(event.prevented);assert.equal(h.inspector,'copy-a');assert(h.pending.value);
});
test('ER05 presentation failure retains recoverable dialog and releases input lock',async()=>{
 const h=harness();h.context.controller.current.refresh=async()=>({ok:true,presentationPending:true});await h.context.acceptExternalDiscard();assert.equal(h.inspector,'copy-a');assert.equal(h.snapshot,h.old);assert.equal(h.epoch,0);assert.equal(h.locked,h.released);assert.equal(h.context.acceptingExternal.current,false);assert.equal(h.context.changingContext.current,false);assert.match(h.status,/화면 갱신 필요/);assert(h.button('입력 버리고 최신 상태 보기'));
});

test('ER06 production parent passes its single recovery node to publisher and removes the page copy',()=>{
 const h=harness();h.setInspector(null);const tree=h.render('document-a');assert.equal(nodes(tree.page).length,0);assert.equal(tree.dialog,null);assert.equal(tree.publisher.type,'publisher-child');const panel=tree.publisher.props.externalRecovery;assert.equal(panel.props['aria-label'],'다른 탭 변경과 입력 보호');assert.equal(nodes(panel).filter(n=>n.props.id!==undefined).length,0);
 const button=(name:string)=>{const found=nodes(h.render('document-a').publisher.props.externalRecovery).filter(n=>n.type==='button'&&text(n.props.children)===name);assert.equal(found.length,1);return found[0];};
 button('작성 중 입력 TXT 받기').props.onClick();assert.equal(h.downloads,1);button('입력 버리고 최신 상태 보기').props.onClick();assert(h.confirm);button('입력 유지').props.onClick();assert(!h.confirm);assert.equal(h.refresh,0);assert.equal(h.snapshot,h.old);
});

test('ER07 production publisher places recovery directly inside its modal before its guarded close controls',()=>{
 const publisherSource=readFileSync(new URL('./ProgramPublisher.tsx',import.meta.url),'utf8'),publisherAst=ts.createSourceFile('ProgramPublisher.tsx',publisherSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let modal:ts.JsxElement|undefined;function visit(node:ts.Node){if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(publisherAst)==='dialog')modal=node;ts.forEachChild(node,visit);}visit(publisherAst);assert(modal);
 const expressions=modal.children.filter(ts.isJsxExpression).filter(n=>n.expression?.getText(publisherAst)==='externalRecovery');assert.equal(expressions.length,1);const marker={type:'section',props:{'aria-label':'recovery-marker'}};assert.equal(evaluate(expressions[0].expression!.getText(publisherAst),{externalRecovery:marker}),marker);assert(modal.children.indexOf(expressions[0])<modal.children.findIndex(n=>ts.isJsxElement(n)&&n.openingElement.tagName.getText(publisherAst)==='header'));
});

test('ER08 actual discovery JSX passes output-return context only for a flow destination',()=>{
 const discovery=find(n=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText(ast)==='ProgramDiscovery') as ts.JsxSelfClosingElement;
 const prop=discovery.attributes.properties.find(n=>ts.isJsxAttribute(n)&&n.name.getText(ast)==='selectedOutputReturn');assert(prop&&ts.isJsxAttribute(prop)&&prop.initializer&&ts.isJsxExpression(prop.initializer)&&prop.initializer.expression);
 const expression=prop.initializer.expression.getText(ast);assert.equal(evaluate(expression,{destination:{view:'flow',publicOutputReturn:'publication-a'}}),'publication-a');assert.equal(evaluate(expression,{destination:{view:'discover',publicOutputReturn:'publication-a'}}),undefined);assert.equal(evaluate(expression,{destination:{view:'flow'}}),undefined);
});
