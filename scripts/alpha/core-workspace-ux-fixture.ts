/** Isolated production-component UX fixture. No Next build, env files, credentials or upstream requests.
 * Build: node --import tsx scripts/alpha/core-workspace-ux-fixture.ts --build
 * Serve existing artifacts: node --import tsx scripts/alpha/core-workspace-ux-fixture.ts --serve
 * URLs: http://localhost:3104/alpha?fixture=empty|representative&run=<isolated-case-id>
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const output = resolve('output/playwright/alpha-core-workspace-ux/fixture');
const origin = 'http://localhost:3104';
const entry = String.raw`
import React from 'react';
import {createRoot} from 'react-dom/client';
import {AlphaWorkspace} from './components/flow/integrated-poc/AlphaWorkspace';
import {createProgramPrivateSpace} from './lib/flow/integrated-poc/program-data';
import {createAlphaFakeServer} from './lib/flow/integrated-poc/alpha-persistence/fake-server';
import {emptyAlphaReferences} from './lib/flow/integrated-poc/alpha-social/projection';
import {textWorkspaceModel as M} from './lib/flow/integrated-poc/text-workspace';
import {readAlphaAuthConfig} from './lib/flow/integrated-poc/alpha-auth/config';

if(location.origin!=='http://localhost:3104')throw Error('fixture-origin-rejected');
const prefix='flow:poc:personal-workspace:v1:',owner='11111111-1111-4111-8111-111111111111';
const alias='member-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const params=new URLSearchParams(location.search),mode=params.get('fixture')||'empty',run=params.get('run')||'default';
if(!['empty','representative'].includes(mode)||!/^[a-zA-Z0-9_-]{1,80}$/.test(run))throw Error('fixture-mode-rejected');
const storageKey=prefix+'qa-core-workspace:'+mode+':'+run;
const audit={calls:[],writes:[],storageforbidden:[],errors:[],blocked:[],injected:[],remoteWrites:0,realAccounts:0,mode,run};
let failWrite=null,delayWrite=0,delayLookup=0;
const originalGet=Storage.prototype.getItem,originalSet=Storage.prototype.setItem,originalRemove=Storage.prototype.removeItem;
// The product's fixed owner and tab recovery keys must be isolated along with the fake account.
// Prefix mapping applies equally to localStorage and sessionStorage and never touches old runs.
const storageNamespace=prefix+'qa-core-scope:'+mode+':'+run+':';
const physicalKey=key=>String(key).startsWith(prefix)?storageNamespace+String(key).slice(prefix.length):String(key);
const sentinels={'flow:saved-plans':'[{"sentinel":"untouched"}]\r\n','flow:completion:v1':'{"opaque":true}','other-app:key':'also untouched'};
for(const[key,value]of Object.entries(sentinels)){
 if(localStorage.getItem(key)===null)originalSet.call(localStorage,key,value);
}
const auditBefore=Object.fromEntries(Object.keys(sentinels).map(key=>[key,localStorage.getItem(key)]));
Storage.prototype.getItem=function(key){return originalGet.call(this,physicalKey(key));};
Storage.prototype.setItem=function(key,value){
 audit.writes.push({method:'setItem',key,physicalKey:physicalKey(key),storage:this===localStorage?'local':'session'});
 if(!String(key).startsWith(prefix)){audit.storageforbidden.push('setItem:'+key);throw Error('outside-prefix-write');}
 return originalSet.call(this,physicalKey(key),value);
};
Storage.prototype.removeItem=function(key){
 audit.writes.push({method:'removeItem',key,physicalKey:physicalKey(key),storage:this===localStorage?'local':'session'});
 if(!String(key).startsWith(prefix)){audit.storageforbidden.push('removeItem:'+key);throw Error('outside-prefix-remove');}
 return originalRemove.call(this,physicalKey(key));
};
Storage.prototype.clear=function(){audit.storageforbidden.push('clear');throw Error('storage-clear-forbidden');};
addEventListener('error',event=>audit.errors.push(String(event.error||event.message)));
addEventListener('unhandledrejection',event=>audit.errors.push(String(event.reason)));
addEventListener('securitypolicyviolation',event=>audit.blocked.push('csp:'+event.blockedURI));

function seed(){
 const account={schema:'flowme-alpha-account/1',ownerId:owner,revision:0,
  source:{schema:'flowme-integrated-product-poc/1',actorId:owner,revision:0},space:createProgramPrivateSpace(),legacyUndo:[],legacyReceipts:[]};
 if(mode==='representative'){
  account.space.text.folders.push({id:'qa-folder-work',title:'업무',parentId:null},{id:'qa-folder-review',title:'검토',parentId:'qa-folder-work'});
  for(const[title,folderId,raw]of[
   ['회의 준비','qa-folder-review','회의에서 확인할 메모\n- [ ] 자료 검토\n  - [ ] 참고 파일 확인\n- [ ] 주간 정리\n- [ ] 다음 달 준비\n- [ ] 날짜 없는 아이디어'],
   ['개인 메모','folder-unfiled','여기는 합성 검증용 자유 메모입니다.\n- [ ] 같은 제목']]){
   account.space.text=M.addDocument(account.space.text,{title,folderId});
   const doc=account.space.text.documents.at(-1);account.space.text=M.editText(account.space.text,doc.id,raw);
  }
  for(const task of M.tasks(account.space.text)){
   const date={'자료 검토':'2026-09-30','주간 정리':'2026-10-02','다음 달 준비':'2026-10-15','같은 제목':'2026-09-30'}[task.title];
   if(date)account.space.text=M.updateTask(account.space.text,task.id,{date,...(task.title==='자료 검토'?{time:'09:30'}:{})});
  }
  account.space.position.documentId=account.space.text.documents[0].id;
 }
 return {account,references:emptyAlphaReferences(owner),operations:[]};
}
const stored=localStorage.getItem(storageKey);
const fake=createAlphaFakeServer([stored?JSON.parse(stored):seed()]);
const repository=fake.connect(fake.issueSession(owner));
const snapshot=()=>fake.exportForBackup(owner);
const save=()=>localStorage.setItem(storageKey,JSON.stringify(snapshot()));
if(!stored)save();
const state=()=>({...audit,diagnostics:fake.diagnostics(),auditBefore,
 operationalUnchanged:Object.entries(auditBefore).every(([key,value])=>localStorage.getItem(key)===value),
 accountRevision:snapshot().account.revision});
window.__uxQa={...audit,snapshot,state,storageKey,storageNamespace,
 failNextWrite:()=>{failWrite='unavailable';},
 failNextWriteAfterCommit:()=>{failWrite='unavailable-after-commit';},
 rejectNextWrite:(reason='invalid')=>{if(!['invalid','revision-conflict'].includes(reason))throw Error('fixture-rejection-invalid');failWrite=reason;},
 delayNextWrite:ms=>{if(!Number.isSafeInteger(ms)||ms<0||ms>30000)throw Error('fixture-delay-out-of-range');delayWrite=ms;},
 delayNextLookup:ms=>{if(!Number.isSafeInteger(ms)||ms<0||ms>30000)throw Error('fixture-delay-out-of-range');delayLookup=ms;}};
const token='synthetic-core-ux-token-no-network';
const remote='https://wkmzcxpnojobxrgebapw.supabase.co';
const blocked=(kind,value)=>{audit.blocked.push(kind+':'+String(value));throw Error('fixture-network-rejected:'+kind);};
window.fetch=async(input,init={})=>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin);
 const method=String(init.method||(input instanceof Request?input.method:'GET')).toUpperCase();
 const headers=new Headers(init.headers||(input instanceof Request?input.headers:undefined));
 audit.calls.push({method,path:url.origin+url.pathname});
 if(headers.get('Authorization')!=='Bearer '+token)return blocked('authorization',url.pathname);
 if(url.search||url.hash)return blocked('query',url.pathname);
 if(url.origin===remote&&url.pathname==='/auth/v1/user'&&method==='GET')return Response.json({id:owner,email:'synthetic-core@example.invalid',is_anonymous:false});
 if(url.origin===remote&&method==='POST'&&['/rest/v1/rpc/flowme_alpha_social_open_v1','/rest/v1/rpc/flowme_alpha_social_read_v1'].includes(url.pathname)){
  if(init.body!=='{}')return blocked('social-body',url.pathname);
  if(url.pathname.endsWith('_open_v1'))return Response.json({ok:true,value:{ownActorId:alias}});
  return Response.json({ok:true,value:{account:snapshot().account,context:{schema:'flowme-alpha-social-context/1',revision:0,ownActorId:alias,
   actors:[{id:alias,name:'합성 검증 사용자'}],public:emptyAlphaReferences(owner).public}}});
 }
 if(url.origin===location.origin&&url.pathname==='/api/alpha/account'&&method==='POST'){
  const body=JSON.parse(String(init.body));
  if(!body||!['execute','lookup'].includes(body.kind))return blocked('private-command',url.pathname);
  if(body.kind==='execute'){
   const fail=failWrite,delay=delayWrite;failWrite=null;delayWrite=0;
   if(delay){audit.injected.push({kind:'delay',requestId:body.command?.requestId,ms:delay});await new Promise(resolve=>setTimeout(resolve,delay));}
   if(fail&&fail!=='unavailable-after-commit'){audit.injected.push({kind:'failure',reason:fail,ambiguousOutcome:fail==='unavailable',requestId:body.command?.requestId});return Response.json({ok:false,reason:fail});}
   const result=await repository.execute(body.command);
   if(result.ok){
    save();
    if(fail==='unavailable-after-commit'){
     audit.injected.push({kind:'failure-after-commit',reason:'unavailable',ambiguousOutcome:true,requestId:body.command?.requestId,revision:result.value.revision});
     return Response.json({ok:false,reason:'unavailable'});
    }
   }
   return Response.json(result);
  }
  const delay=delayLookup;delayLookup=0;
  if(delay){audit.injected.push({kind:'lookup-delay',requestId:body.requestId,ms:delay});await new Promise(resolve=>setTimeout(resolve,delay));}
  return Response.json(await repository.lookup(body.requestId));
 }
 return blocked('fetch',url.origin+url.pathname);
};
// No native transport fallback exists. CSP also blocks remote subresources.
XMLHttpRequest.prototype.open=function(method,url){return blocked('xhr',url);};
window.WebSocket=function(url){return blocked('websocket',url);};
window.EventSource=function(url){return blocked('eventsource',url);};
navigator.sendBeacon=(url)=>blocked('beacon',url);
const config=readAlphaAuthConfig({FLOWME_ALPHA_ENABLED:'development-only',FLOWME_ALPHA_STAGE:'test',FLOWME_ALPHA_PROJECT_REF:'wkmzcxpnojobxrgebapw',
 FLOWME_ALPHA_SUPABASE_URL:remote,FLOWME_ALPHA_PUBLISHABLE_KEY:'sb_publishable_core_ux_fixture',FLOWME_ALPHA_REDIRECT_URL:'http://localhost:3104/auth/callback'});
if(!config)throw Error('synthetic-config-invalid');
createRoot(document.getElementById('root')).render(<AlphaWorkspace config={config} session={{userId:owner,accessToken:token}}
 email="synthetic-core@example.invalid" onSignOut={async()=>blocked('signout','outside-core-ux')}/>);
`;

async function buildFixture() {
  await mkdir(output, { recursive: true });
  const result = await build({ stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, platform: 'browser', format: 'iife', write: false, metafile: true,
    outfile: resolve(output, 'fixture.js'), loader: { '.css': 'css' },
    plugins: [{ name: 'fixture-css-modules-only', setup(builder) {
      builder.onLoad({ filter: /\.module\.css$/ }, async args => ({ contents: await readFile(args.path, 'utf8'), loader: 'local-css' }));
    } }],
    define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'warning' });
  const sources = Object.keys(result.metafile!.inputs).filter(path => path !== '<stdin>' && !path.startsWith('node_modules/'));
  assert(sources.every(path => !/(^|[/\\])(?:\.tmp|\.env|\.next)(?:[/\\.]|$)/.test(path)), 'forbidden build input');
  const globals = await readFile('app/globals.css', 'utf8');
  const globalCss = await postcss([tailwindcss({ content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] }), autoprefixer]).process(globals, { from: 'app/globals.css' });
  for (const file of result.outputFiles) {
    assert(['fixture.js', 'fixture.css'].includes(relative(output, file.path)), 'unexpected output path');
    await writeFile(file.path, file.path.endsWith('.css') ? globalCss.css + '\n' + file.text : file.text);
  }
  const html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FlowMe 개인공간 격리 QA</title><link rel="icon" href="data:,"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>';
  await writeFile(resolve(output, 'index.html'), html);
  const hashes = await Promise.all([...sources, 'app/globals.css'].map(async path => ({ path, sha256: createHash('sha256').update(await readFile(path)).digest('hex') })));
  await writeFile(resolve(output, 'manifest.json'), JSON.stringify({ kind: 'production components; synthetic auth and in-memory command server; isolated browser QA', builtAt: new Date().toISOString(),
    origin, modes: ['empty', 'representative'], sourceHashes: hashes, upstreamCalls: 0, realAccounts: 0, nextBuild: false }, null, 2));
  console.log(JSON.stringify({ built: true, output, sources: sources.length, bytes: result.outputFiles.reduce((sum, file) => sum + file.contents.length, 0) }));
}

async function serveFixture() {
  // Explicit known assets only; no directory serving, personal files or proxy.
  const assets = new Map([['/fixture.js', 'fixture.js', 'text/javascript'], ['/fixture.css', 'fixture.css', 'text/css'], ['/alpha', 'index.html', 'text/html']]
    .map(([url, file, type]) => [url, { file: resolve(output, file), type }] as const));
  const reviewFiles = [
    ['docs/content-audit/2026-09-30-flowme-alpha-core-workspace-ux-ko.html', 'text/html'],
    ...['spec', 'requirements', 'qa'].map(name => [`docs/specs/2026-09-30-alpha-core-workspace-ux/${name}.md`, 'text/plain']),
    ['docs/specs/2026-09-12-flowme-integrated-product-poc-program/alpha-follow-up-register-20260930.md', 'text/plain'],
    ...['document-390x844', 'today-375x812'].map(name => [`output/playwright/alpha-core-workspace-ux/${name}.png`, 'image/png']),
  ];
  for (const [file, type] of reviewFiles) {
    const exact = resolve(process.cwd(), file);
    assert(relative(process.cwd(), exact) === file.replaceAll('/', sep), 'review-file-scope');
    try { await readFile(exact); assets.set('/' + file, { file: exact, type }); }
    catch { /* The app fixture also works before its review report exists. */ }
  }
  // Fail startup for absent artifacts, then read only these exact paths per request so a rebuilt fixture can reload.
  await Promise.all([...assets.values()].map(asset => readFile(asset.file)));
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', origin);
    const asset = assets.get(url.pathname);
    if (request.headers.host !== 'localhost:3104' || request.method !== 'GET' || !asset) { response.writeHead(403); response.end('fixture-route-rejected'); return; }
    let body: Buffer;
    try { body = await readFile(asset.file); } catch { response.writeHead(503); response.end('fixture-asset-unavailable'); return; }
    response.writeHead(200, { 'Content-Type': `${asset.type}; charset=utf-8`, 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data: blob:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff' });
    response.end(body);
  });
  server.on('error', error => { console.error(String(error)); process.exitCode = 1; });
  server.listen(3104, '127.0.0.1', () => console.log(JSON.stringify({ serving: origin + '/alpha?fixture=empty', pid: process.pid, upstreamCalls: 0 })));
}

async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 1 && ['--build', '--serve'].includes(args[0]), 'Use --build or --serve; these are intentionally separate');
  if (args[0] === '--build') await buildFixture(); else await serveFixture();
}
main().catch(error => { console.error(error); process.exitCode = 1; });
