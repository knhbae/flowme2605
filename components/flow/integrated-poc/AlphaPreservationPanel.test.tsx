import test from 'node:test';
import { encodeBackupFile, decodeBackupFile } from '../../../lib/flow/integrated-poc/alpha-preservation/file-codec';
import { createAccountBackup } from '../../../lib/flow/integrated-poc/alpha-preservation/backup';
import { readBackupDownload, BACKUP_DOWNLOAD_FORMAT, BACKUP_DOWNLOAD_SCHEMA } from '../../../lib/flow/integrated-poc/alpha-preservation/backup-download';
import { preparePreservationWireRequest } from '../../../lib/flow/integrated-poc/alpha-preservation/transport';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {canonicalJson,detached,parseAlphaJson} from '../../../lib/flow/integrated-poc/alpha-persistence/json';
import {createProgramPrivateSpace} from '../../../lib/flow/integrated-poc/program-data';
import {createAlphaSyntheticFixtures} from '../../../lib/flow/integrated-poc/alpha-persistence/synthetic-fixtures';
import {prepareLocalImport,inspectLocalImportActors} from '../../../lib/flow/integrated-poc/alpha-preservation/import';
import {PRESERVATION_PROTOCOL,SEALED_BACKUP_SCHEMA,isPreservationCommand} from '../../../lib/flow/integrated-poc/alpha-preservation/contract';
import {isPreservationContentSummary,summarizePreservationContent} from '../../../lib/flow/integrated-poc/alpha-preservation/content-summary';
const source=readFileSync(new URL('./AlphaPreservationPanel.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('AlphaPreservationPanel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const require=createRequire(import.meta.url);
function find(predicate:(node:ts.Node)=>boolean,root:ts.Node=ast):ts.Node {let found:ts.Node|undefined;const visit=(node:ts.Node)=>{if(predicate(node)){found=node;return;}if(!found)ts.forEachChild(node,visit);};visit(root);assert(found);return found;}
const declaration=(name:string)=>(find(n=>ts.isFunctionDeclaration(n)&&n.name?.text===name) as ts.FunctionDeclaration).getText(ast);
function evaluate(expression:string,context:Record<string,unknown>){const code=ts.transpileModule(`const value=${expression};`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;return new Function('require','exports',...Object.keys(context),`${code};return value;`)(require,{},...Object.values(context));}
const shell=find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='AlphaPreservationPanel') as ts.FunctionDeclaration;
const renderExpression=shell.body!.statements.filter(ts.isReturnStatement).at(-1)!.expression!.getText(ast);
const nodes=(value:any):any[]=>!value?[]:Array.isArray(value)?value.flatMap(nodes):typeof value==='object'&&'props'in value?[value,...nodes(value.props.children)]:[];
const text=(value:any):string=>typeof value==='string'?value:Array.isArray(value)?value.map(text).join(''):value&&typeof value==='object'?text(value.props?.children):'';
const owner='11111111-1111-4111-8111-111111111111';
function harness(){
  const calls:string[]=[],payloads:any[]=[],values=new Map<string,string>();let respond:(payload:any)=>Promise<any>=async()=>({ok:true,value:{}});
  class Element{}const opener=new Element();
  const context:Record<string,any>={account:{schema:'flowme-alpha-account/1',ownerId:owner,revision:0,source:{schema:'flowme-integrated-product-poc/1',actorId:owner,revision:0},space:createProgramPrivateSpace(),legacyUndo:[],legacyReceipts:[]},
    references:{actorIds:[owner],public:{flows:[],versions:[],posts:[],replies:[],reactions:[],proposals:[]}},email:'a@example.invalid',accessToken:'secret-fixture-token',
    dialog:{current:{showModal:()=>calls.push('modal-open'),close:()=>calls.push('modal-close')}},alive:{current:true},selectionGeneration:{current:0},busy:false,recoveryReady:true,status:'',raw:'',actors:[],actorId:'',selection:null,preview:null,confirmed:false,pending:null,download:null,
    recoveryKey:`flow:poc:personal-workspace:v1:alpha-m6:pending:${owner}`,messages:evaluate((find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='messages') as ts.VariableDeclaration).initializer!.getText(ast),{}),canonicalJson,detached,parseAlphaJson,createProgramPrivateSpace,prepareLocalImport,inspectLocalImportActors,PRESERVATION_PROTOCOL,SEALED_BACKUP_SCHEMA,isPreservationCommand,
    sessionStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{calls.push('persist');values.set(key,value);},removeItem:(key:string)=>{calls.push('remove-pending');values.delete(key);}},
    crypto:{randomUUID:()=>{calls.push('new-id');return 'fixed-preservation-request';}},
    onClose:()=>calls.push('close'),onSaved:async()=>{calls.push('saved');},HTMLElement:Element,document:{activeElement:opener},restoreProgramDialogFocus:(value:unknown)=>{assert.equal(value,opener);calls.push('focus');},
    encodeBackupFile,decodeBackupFile,readBackupDownload,BACKUP_DOWNLOAD_FORMAT,preparePreservationWireRequest,styles:new Proxy({},{get:(_,key)=>String(key)}),URL:{createObjectURL:()=>{calls.push('blob');return 'blob:fixture';},revokeObjectURL:()=>calls.push('revoke')},Blob,
    fetch:async(_url:string,init:RequestInit)=>{calls.push('fetch');assert.equal(new Headers(init.headers).get('authorization'),'Bearer secret-fixture-token');const body=JSON.parse(String(init.body));payloads.push(body);return {json:()=>respond(body)};},
  };
  context.browserPreservationPendingStore=()=>({
    load:async()=>{const raw=context.sessionStorage.getItem(context.recoveryKey);return raw?JSON.parse(raw):null;},
    save:async(_owner:string,value:unknown)=>context.sessionStorage.setItem(context.recoveryKey,JSON.stringify(value)),
    remove:async(_owner:string,id:string)=>{const raw=context.sessionStorage.getItem(context.recoveryKey);if(raw&&JSON.parse(raw).command.requestId===id)context.sessionStorage.removeItem(context.recoveryKey);},
  });
  context.isPreservationContentSummary=isPreservationContentSummary;
  context.hasContentSummary=evaluate(`(${declaration('hasContentSummary')})`,context);
  context.contentLabels=evaluate((find(n=>ts.isVariableDeclaration(n)&&n.name.getText(ast)==='contentLabels') as ts.VariableDeclaration).initializer!.getText(ast),{});
  for(const field of ['busy','status','raw','actors','actorId','selection','preview','confirmed','pending','download','recoveryReady'])context[`set${field[0].toUpperCase()+field.slice(1)}`]=(value:unknown)=>{calls.push(`set:${field}`);context[field]=value;};
  const run=(name:string,...args:any[])=>evaluate(`(${declaration(name)})`,context)(...args);
  for(const name of ['request','finish','commit','resolve','selectRaw','selectFile','inspect','backup','loadPending'])context[name]=(...args:any[])=>run(name,...args);
  const render=()=>evaluate(renderExpression,context);
  const button=(name:string)=>{const found=nodes(render()).find(node=>node.type==='button'&&text(node.props.children)===name);assert(found);return found;};
  const mount=()=>{const node=find(n=>ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0].getText(ast).includes('alive.current = true')) as ts.CallExpression;return evaluate(node.arguments[0].getText(ast),context)();};
  return {context,calls,payloads,values,run,render,button,mount,respond:(value:typeof respond)=>{respond=value;}};
}
async function selected(h:ReturnType<typeof harness>){const fixture=createAlphaSyntheticFixtures()[0];await h.run('selectRaw',canonicalJson(fixture.envelope));h.context.actorId=fixture.actorId;const current=summarizePreservationContent(h.context.account.space);h.respond(async()=>({ok:true,value:{ownerId:owner,mode:'import',sourceSha256:'a'.repeat(64),expectedRevision:0,expectedPublicRevision:0,canApply:true,same:false,documents:3,savedFlows:0,warnings:[],details:[],createdAt:null,content:{current,next:{...current,documents:3}}}}));await h.run('inspect');}

test('preview separates current catalog content from selected replacement and warns about private records',async()=>{
  const h=harness();await selected(h);h.context.preview.mode='restore';
  Object.assign(h.context.preview.content.current,{catalogFlows:177,catalogItems:957,catalogSections:371,catalogMaps:26,catalogVariants:2,creatorDrafts:2});
  const rows=nodes(h.render()).filter(node=>node.type==='tr');
  const row=(label:string)=>rows.find(node=>text(node.props.children[0])===label);
  assert(row('자료실 Flow'));assert.deepEqual(row('자료실 Flow').props.children.slice(1).map((node:any)=>node.props.children),[[177,'개'],[0,'개']]);
  assert.deepEqual(row('자료실 Map').props.children.slice(1).map((node:any)=>node.props.children),[[26,'개'],[0,'개']]);
  assert.match(text(h.render()),/개수가 같아도 내용은 다를/);assert.match(text(h.render()),/완료·날짜·폴더/);
  assert(h.button('이 백업으로 개인공간 복원').props.disabled);assert(!h.calls.includes('persist'));
});

test('catalog-only backup is visible despite zero text documents and execution copies',async()=>{
  const h=harness();await selected(h);Object.assign(h.context.preview.content.next,{documents:0,savedFlows:0,catalogFlows:177,catalogMaps:26});
  const row=nodes(h.render()).find(node=>node.type==='tr'&&text(node.props.children[0])==='자료실 Flow');
  assert.deepEqual(row.props.children[2].props.children,[177,'개']);assert.equal(h.context.preview.content.next.documents,0);
  assert.match(text(h.render()),/가져온 후/);assert(!h.calls.includes('persist'));
});

for(const variant of ['missing','partial','negative','wrong-type'] as const)test(`incomplete ${variant} server summary never becomes an empty scope or permits a new commit`,async()=>{
  const h=harness();await selected(h);h.context.confirmed=true;
  if(variant==='missing')delete h.context.preview.content;
  if(variant==='partial')delete h.context.preview.content.next.catalogFlows;
  if(variant==='negative')h.context.preview.content.current.catalogFlows=-1;
  if(variant==='wrong-type')h.context.preview.content.current.catalogFlows='177';
  assert.equal(nodes(h.render()).filter(node=>node.type==='table').length,0);
  assert.equal(nodes(h.render()).filter(node=>node.type==='button'&&text(node.props.children)==='선택 자료 가져오기').length,0);
  assert.match(text(h.render()),/자료 개수 비교를 받지 못해/);
  const count=h.payloads.length;await h.run('commit');assert.equal(h.payloads.length,count);assert(!h.calls.includes('persist'));
  h.button('취소').props.onClick();assert.equal(h.context.preview,null);
});

test('compressed selection expands exact sealed JSON locally before existing preview, without upload',async()=>{
  const h=harness(),raw=canonicalJson({schema:SEALED_BACKUP_SCHEMA,backup:{fixture:'exact'},proof:'a'.repeat(64)});
  await h.run('selectRaw',await encodeBackupFile(raw));assert.equal(h.context.selection.raw,raw);assert.equal(h.context.selection.mode,'restore');assert.equal(h.payloads.length,0);
});
async function validBackup(h:ReturnType<typeof harness>){
  return {schema:SEALED_BACKUP_SCHEMA,proof:'a'.repeat(64),backup:await createAccountBackup({account:h.context.account,
    references:h.context.references,operations:[],importArchives:[],createdAt:'2026-09-20T01:02:03.004Z'},async()=>{throw Error('unexpected-media');})};
}
test('legacy backup download uses a validated lossless packed file and its recorded date without committing',async()=>{
  const h=harness(),sealed=await validBackup(h);let blob:Blob|undefined;
  h.context.URL.createObjectURL=(value:Blob)=>{blob=value;return 'blob:packed';};h.respond(async()=>({ok:true,value:sealed}));
  await h.run('backup');assert(blob);assert.equal(await decodeBackupFile(await blob.text()),canonicalJson(sealed));
  assert.deepEqual(h.payloads,[{kind:'backup',format:BACKUP_DOWNLOAD_FORMAT,client:1}]);assert(h.context.download);
  assert.equal(h.context.download.name,'flowme-account-2026-09-20.json');assert(!h.calls.includes('persist'));assert(!h.calls.includes('saved'));
});
test('checked-file backup download preserves server file bytes without recompression',async()=>{
  const h=harness(),sealed=await validBackup(h),file=JSON.stringify(JSON.parse(await encodeBackupFile(canonicalJson(sealed))),null,2);let blob:Blob|undefined;
  h.context.URL.createObjectURL=(value:Blob)=>{blob=value;return 'blob:exact-checked';};
  h.respond(async()=>({ok:true,value:{schema:BACKUP_DOWNLOAD_SCHEMA,file}}));
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'CompressionStream')!;
  Object.defineProperty(globalThis,'CompressionStream',{configurable:true,value:undefined});
  try{await h.run('backup');}finally{Object.defineProperty(globalThis,'CompressionStream',descriptor);}
  assert(blob);assert.equal(await blob.text(),file);assert.equal(h.context.download.name,'flowme-account-2026-09-20.json');
  assert.deepEqual(h.payloads,[{kind:'backup',format:BACKUP_DOWNLOAD_FORMAT,client:1}]);assert(!h.calls.includes('persist'));assert(!h.calls.includes('saved'));
});
test('invalid or foreign backup download produces no Blob, download entry, or commit',async()=>{
  for(const variant of ['damaged','foreign','bad-wrapper','empty-date']){
    const h=harness(),sealed=await validBackup(h);let value:any=sealed;
    if(variant==='damaged')sealed.backup.integrity.payloadSha256='0'.repeat(64);
    if(variant==='foreign')sealed.backup.account.ownerId='22222222-2222-4222-8222-222222222222';
    if(variant==='empty-date')sealed.backup.createdAt='';
    if(variant==='bad-wrapper')value={schema:BACKUP_DOWNLOAD_SCHEMA,file:'{}'};
    let blobs=0;h.context.URL.createObjectURL=()=>{blobs++;return 'blob:forbidden';};h.respond(async()=>({ok:true,value}));
    await h.run('backup');assert.equal(blobs,0);assert.equal(h.context.download,null);assert.equal(h.context.busy,false);
    assert.deepEqual(h.payloads.map(row=>row.kind),['backup']);assert(!h.calls.includes('persist'));assert(!h.calls.includes('saved'));
  }
});
test('unmount during validated backup decoding does not create a late Blob or update the download',async()=>{
  const h=harness(),sealed=await validBackup(h),valid=await readBackupDownload(sealed,owner);
  let release:(value:any)=>void=()=>{},started:()=>void=()=>{};
  const decoding=new Promise<void>(resolve=>{started=resolve;});
  h.respond(async()=>({ok:true,value:sealed}));
  h.context.readBackupDownload=()=>new Promise(resolve=>{release=resolve;started();});
  const work=h.run('backup');await decoding;h.context.alive.current=false;const calls=h.calls.length;
  release(valid);await work;assert.equal(h.calls.length,calls);assert(!h.calls.includes('blob'));assert.equal(h.context.download,null);
  assert.deepEqual(h.payloads.map(row=>row.kind),['backup']);
});

test('large restore preview uses compressed transport and cancellation never commits',async()=>{
  const h=harness(),raw=canonicalJson({schema:SEALED_BACKUP_SCHEMA,backup:{text:'"'.repeat(8_000_000)},proof:'a'.repeat(64)});
  await h.run('selectRaw',await encodeBackupFile(raw));assert.equal(h.payloads.length,0);
  h.respond(async()=>({ok:true,value:{ownerId:owner,mode:'restore',canApply:true,same:false,warnings:[],details:[]}}));
  await h.run('inspect');assert.equal(h.payloads.length,1);assert(!('sourceRaw' in h.payloads[0]));
  assert.equal(await decodeBackupFile(h.payloads[0].sourceFile),raw);assert.equal(h.context.selection.raw,raw);
  h.button('취소').props.onClick();assert.equal(h.context.preview,null);assert(!h.payloads.some(row=>row.kind==='commit'));
});

test('unmount during transport preparation does not send the late request',async()=>{
  const h=harness();let release:(value:any)=>void=()=>{};
  h.context.preparePreservationWireRequest=()=>new Promise(resolve=>{release=resolve;});
  const request=h.run('request',{kind:'backup'});h.context.alive.current=false;release({kind:'backup',client:1});
  await assert.rejects(request,/disposed/);assert.equal(h.payloads.length,0);
});

test('pre-network preparation failure clears only a new pending operation, not an uncertain retry',async()=>{
  const h=harness();await selected(h);const count=h.payloads.length;
  h.context.preparePreservationWireRequest=async()=>{throw Error('preservation-request-limit');};await h.run('commit');
  assert.equal(h.payloads.length,count);assert.equal(h.context.pending,null);assert.equal(h.values.size,0);assert.match(h.context.status,/전송하지 않았습니다/);
  const retry=harness();await selected(retry);retry.respond(async()=>{throw Error('lost');});await retry.run('commit');
  const previous=retry.values.get(retry.context.recoveryKey),pending=retry.context.pending,priorCount=retry.payloads.length;
  retry.context.preparePreservationWireRequest=async()=>{throw Error('backup-codec-unavailable');};await retry.run('commit',pending);
  assert.equal(retry.payloads.length,priorCount);assert.equal(retry.values.get(retry.context.recoveryKey),previous);
  assert.equal(retry.context.pending,pending);assert.match(retry.context.status,/이전 요청은 유지/);
});

test('preservation selection sanitizes the selected actor before owner-bound preview, without committing',async()=>{
  const h=harness();await selected(h);assert.equal(h.payloads.length,1);const payload=h.payloads[0];assert.equal(payload.kind,'preview');assert.equal(payload.client,1);
  const source=JSON.parse(payload.sourceRaw);for(const [actor,space] of Object.entries(source.data.spaces))if(actor!==payload.actorId)assert.deepEqual(space,createProgramPrivateSpace());assert.equal(h.context.preview.ownerId,owner);assert(!h.calls.includes('persist'));assert(!h.calls.includes('saved'));
  h.button('취소').props.onClick();assert.equal(h.context.preview,null);assert.equal(h.payloads.length,1);
});

test('preservation refuses preview for a different owner and does not expose apply controls',async()=>{
  const h=harness();await selected(h);h.respond(async()=>({ok:true,value:{...h.context.preview,ownerId:'foreign'}}));await h.run('inspect');assert.equal(h.context.preview,null);assert(!h.calls.includes('persist'));
});

test('preservation unresolved local source blocks network and never uploads the unselected raw graph',async()=>{
  const h=harness();h.context.raw='PRIVATE_UNSELECTED_SOURCE';h.context.actors=[{id:'local-user',name:'Local'}];h.context.actorId='local-user';
  h.context.prepareLocalImport=async()=>({ok:false,reason:'unmapped-reference',details:['Unresolved source relationship']});
  await h.run('inspect');assert.equal(h.payloads.length,0);assert.equal(h.values.size,0);assert.equal(h.context.preview,null);assert.equal(h.context.status,'Unresolved source relationship');
});

test('workspace preservation entry waits for capture and every editor flush and is account-keyed',()=>{
  const workspace=readFileSync(new URL('./AlphaWorkspace.tsx',import.meta.url),'utf8');
  assert.match(workspace,/if \(!captureInput\(\)\) return; for \(const port of allEditors\(\)\) if \(port && !await port.flushAll\(\)\) return; if \(disposed.current \|\| controller.current !== openingController\) return; preservationRef.current = true; setPreservation\(true\)/);
  assert.match(workspace,/<AlphaPreservationPanel key=\{session.userId\} account=\{snapshot.account\}/);
  assert.match(workspace,/disabled=\{unavailable \|\| pending \|\| external \|\| !!snapshot\?\.busy \|\| !!snapshot\?\.draft \|\| storageError\}/);
});

test('preservation persists exact nonsecret request before network and retains it after response loss',async()=>{
  const h=harness();await selected(h);h.calls.length=0;h.respond(async()=>{throw Error('lost-reply');});await h.run('commit');
  assert(h.calls.indexOf('persist')<h.calls.indexOf('fetch'));const stored=h.values.get(h.context.recoveryKey)!;assert(stored);assert(!stored.includes('secret-fixture-token'));assert(!stored.includes('authorization'));assert(!stored.includes('a@example.invalid'));
  const value=JSON.parse(stored);assert.equal(value.command.requestId,'fixed-preservation-request');assert.equal(h.payloads.at(-1).sourceRaw,value.raw);assert.deepEqual(h.payloads.at(-1).command,value.command);
  assert.equal(h.values.size,1);assert(h.context.pending);assert(h.button('적용 전 미리보기').props.disabled);assert(h.button('사진 포함 백업 만들기').props.disabled);
});

test('preservation a receipt for another request never clears pending or reports saved',async()=>{
  const h=harness();await selected(h);h.respond(async()=>({ok:true,value:{requestId:'another-request',revision:2,kind:'preservation',changed:true}}));
  await h.run('commit');assert.equal(h.context.pending.command.requestId,'fixed-preservation-request');assert(h.values.has(h.context.recoveryKey));
  assert(!h.calls.includes('remove-pending'));assert(!h.calls.includes('saved'));assert.match(h.context.status,/응답을 확인하지 못했습니다/);
});

test('preservation reload looks up the same persisted ID and retries that exact operation only',async()=>{
  const h=harness();await selected(h);h.respond(async()=>{throw Error('lost');});await h.run('commit');const stored=h.values.get(h.context.recoveryKey)!;
  const next=harness();next.values.set(next.context.recoveryKey,stored);next.mount();await next.run('loadPending');next.respond(async payload=>payload.kind==='lookup'?{ok:true,value:null}:{ok:true,value:{requestId:payload.command.requestId,revision:1,kind:'preservation',changed:true,publicRevision:0}});
  await next.run('resolve');assert.deepEqual(next.payloads.map(p=>p.kind),['lookup','commit']);assert.equal(next.payloads[0].requestId,JSON.parse(stored).command.requestId);
  assert.deepEqual(next.payloads[1].command,JSON.parse(stored).command);assert(!next.calls.includes('new-id'));assert.equal(next.values.size,0);assert(next.calls.includes('saved'));
});

test('preservation storage failure prevents any commit fetch',async()=>{
  const h=harness();await selected(h);h.context.sessionStorage.setItem=()=>{throw Error('quota');};const count=h.payloads.length;await h.run('commit');assert.equal(h.payloads.length,count);assert(!h.calls.includes('saved'));
  assert.equal(h.context.pending,null);assert.equal(h.values.size,0);assert.equal(h.context.busy,false);
  assert.match(h.context.status,/서버에 적용 요청을 보내지 않았습니다/);assert.match(h.context.status,/저장 공간/);
  assert.equal(h.button('사진 포함 백업 만들기').props.disabled,false);
});

for(const reason of ['limit','rate-limited'])test(`preservation definite ${reason} refusal clears pending and allows another source`,async()=>{
  const h=harness();await selected(h);h.context.confirmed=true;h.respond(async()=>({ok:false,reason}));await h.run('commit');
  assert.equal(h.payloads.at(-1).kind,'commit');assert.equal(h.context.pending,null);assert.equal(h.values.size,0);
  assert.equal(h.context.preview,null);assert.equal(h.context.confirmed,false);assert.equal(h.context.busy,false);
  assert.match(h.context.status,/한도/);assert.match(h.context.status,/적용하지 않았습니다/);
  assert.equal(h.button('사진 포함 백업 만들기').props.disabled,false);assert.equal(h.button('이 브라우저의 이전 자료 읽기').props.disabled,false);
  const next=harness();for(const [key,value] of h.values)next.values.set(key,value);next.mount();assert.equal(next.context.pending,null);
});

test('preservation retry storage failure keeps the prior uncertain request and does not resend',async()=>{
  const h=harness();await selected(h);h.respond(async()=>{throw Error('lost');});await h.run('commit');
  const before=h.values.get(h.context.recoveryKey),pending=h.context.pending,count=h.payloads.length;
  h.context.sessionStorage.setItem=()=>{throw Error('quota');};h.respond(async()=>({ok:true,value:null}));await h.run('resolve');
  assert.equal(h.payloads.length,count+1);assert.equal(h.payloads.at(-1).kind,'lookup');assert.equal(h.values.get(h.context.recoveryKey),before);
  assert.equal(h.context.pending,pending);assert.match(h.context.status,/이번 요청은 보내지 않았습니다/);assert.match(h.context.status,/이전 요청은 유지/);
  assert.equal(h.button('적용 결과 확인 · 같은 요청 재시도').props.disabled,false);
});

test('preservation unmount ignores late successful commit and preserves uncertain pending recovery',async()=>{
  const h=harness();await selected(h);const cleanup=h.mount();let deliver:(value:any)=>void=()=>{},started:()=>void=()=>{};
  const sent=new Promise<void>(resolve=>{started=resolve;});h.respond(()=>new Promise(resolve=>{deliver=resolve;started();}));
  const commit=h.run('commit');await sent;cleanup();deliver({ok:true,value:{requestId:'fixed-preservation-request',revision:1}});await commit;
  assert(!h.calls.includes('saved'));assert(!h.calls.includes('remove-pending'));assert(h.values.has(h.context.recoveryKey));
});

test('preservation native dialog supports Escape, protects busy work and restores opener focus',async()=>{
  const h=harness(),cleanup=h.mount();await h.run('loadPending');assert(h.calls.includes('modal-open'));let prevented=0;
  let dialog=h.render();assert.equal(dialog.type,'dialog');assert.equal(dialog.props['aria-labelledby'],'alpha-data-title');dialog.props.onCancel({preventDefault:()=>prevented++});assert(h.calls.includes('close'));
  h.context.busy=true;dialog=h.render();const closes=h.calls.filter(v=>v==='close').length;dialog.props.onCancel({preventDefault:()=>prevented++});assert.equal(prevented,1);assert.equal(h.calls.filter(v=>v==='close').length,closes);
  cleanup();assert.deepEqual(h.calls.slice(-2),['modal-close','focus']);assert.equal(h.context.alive.current,false);
});

test('preservation unreadable durable pending blocks new work and offers a read retry',async()=>{
  const h=harness();h.context.recoveryReady=false;h.context.browserPreservationPendingStore=()=>({load:async()=>{throw Error('unavailable');}});
  await h.run('loadPending');assert.equal(h.payloads.length,0);assert.equal(h.context.recoveryReady,false);
  assert(h.button('사진 포함 백업 만들기').props.disabled);assert(h.button('이 브라우저의 이전 자료 읽기').props.disabled);
  assert.equal(h.button('보관 요청 다시 확인').props.disabled,false);
});

test('preservation destructive apply requires the explicit scope checkbox and never starts on file selection',async()=>{
  const h=harness();await selected(h);assert(h.button('선택 자료 가져오기').props.disabled);h.context.confirmed=true;assert.equal(h.button('선택 자료 가져오기').props.disabled,false);
  h.context.pending={};assert(h.button('선택 자료 가져오기').props.disabled);assert(h.button('이 브라우저의 이전 자료 읽기').props.disabled);assert(h.button('취소').props.disabled);
  assert(!h.payloads.some(p=>p.kind==='commit'));
});

test('preservation a slow earlier file never replaces the most recently selected file',async()=>{
  const h=harness();let release:(value:string)=>void=()=>{};
  const first=h.run('selectFile',{size:10,text:()=>new Promise<string>(resolve=>{release=resolve;})});
  const newest=canonicalJson({schema:SEALED_BACKUP_SCHEMA,label:'newest'});
  await h.run('selectFile',{size:10,text:async()=>newest});
  release(canonicalJson({schema:SEALED_BACKUP_SCHEMA,label:'older'}));await first;
  assert.equal(h.context.selection.raw,newest);assert.equal(h.payloads.length,0);
});

test('preservation unreadable and oversized file selections clear the previous apply target',async()=>{
  const h=harness();await selected(h);
  await h.run('selectFile',{size:10,text:async()=>{throw Error('read-failed');}});
  assert.equal(h.context.selection,null);assert.equal(h.context.preview,null);assert.match(h.context.status,/읽지 못했습니다/);
  await h.run('selectFile',{size:PRESERVATION_PROTOCOL.bytes+1,text:async()=>{throw Error('must-not-read');}});
  assert.match(h.context.status,/30MB/);assert.equal(h.context.selection,null);
});
