'use strict';
// Independent v11 free reparenting / depth QA. No argument writes a not-run plan; freeze permits --run --final.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const KEY='flowme:ux-review:text-workspace-v11:20260908',URL=process.env.FLOWME_V11_URL||'http://127.0.0.1:8771/index.html';
const TRACKED='flow-move-d30-line-3',DAY7='2026-09-07',DAY8='2026-09-08';
const ONLY=(process.argv.find(x=>x.startsWith('--only='))||'').slice(7);
const RESULT=path.join(__dirname,ONLY?'browser-freedom-results-'+ONLY.toLowerCase()+'.json':'browser-freedom-results.json');
const IMAGE_DIR=path.resolve(__dirname,'../../../output/playwright/flowme-text-v11');
const SOURCES=['app.js','model.js','editor.js','index.html','styles.css','editor.css'];
const hashes=dir=>Object.fromEntries(SOURCES.map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,n))).digest('hex')]));
const optionalHashes=dir=>SOURCES.every(n=>fs.existsSync(path.join(dir,n)))?hashes(dir):null;
const PLAN=[
  {
    "id": "F01",
    "name": "큰 박스 확인 다른 부모로 이동",
    "input": "keyboard",
    "expectation": "같은 하위ID/기록/날짜 유지·실제 parent 변경"
  },
  {
    "id": "F02",
    "name": "하위→최상위→재하위",
    "input": "keyboard",
    "expectation": "동일ID 승격·canonical/기간 노출 유지·새 하위 과노출0"
  },
  {
    "id": "F03",
    "name": "진행/메모/시간/참조 Task를 하위로",
    "input": "keyboard",
    "expectation": "canonical/이력/날짜/소속/참조 보존"
  },
  {
    "id": "F04",
    "name": "부모와 후손 함께 재부모",
    "input": "keyboard",
    "expectation": "상대깊이·하위 독립기록·원문ID 보존"
  },
  {
    "id": "F05",
    "name": "폴더 scope 재배치",
    "input": "keyboard",
    "expectation": "문서 부모만 변경·실제 folder catalog 부모 불변"
  },
  {
    "id": "F06",
    "name": "Flow 연결과 참조 묶음 재배치",
    "input": "keyboard",
    "expectation": "개인 Flow 원문/binding/canonical 보존"
  },
  {
    "id": "F07",
    "name": "자기 후손/구조 불가 대상",
    "input": "keyboard",
    "expectation": "UI 미제공·pure API atomic거부·원문/기록0"
  },
  {
    "id": "F08",
    "name": "가로 드래그 깊이 미리보기",
    "input": "cdp-touch",
    "expectation": "같은 boundary에서 표시depth와 실제parent 일치"
  },
  {
    "id": "F09",
    "name": "inline 깊이 버튼은 미리보기만",
    "input": "keyboard",
    "expectation": "depth 전환 자체는 기록/Undo0·Enter확정"
  },
  {
    "id": "F10",
    "name": "좌우/상하 키보드 이동",
    "input": "keyboard",
    "expectation": "depth/boundary 구분·선택 유지·같은 targetKey 확정"
  },
  {
    "id": "F11",
    "name": "CDP 탭으로 깊이 선택·이동",
    "input": "cdp-touch",
    "expectation": "깊이 버튼→목적지 탭·이동1회·기존Undo"
  },
  {
    "id": "F12",
    "name": "재부모 Undo/Redo/reload",
    "input": "keyboard",
    "expectation": "원문/ID/기록/기간현재값 복구"
  },
  {
    "id": "F13",
    "name": "이동 저장 실패·retry",
    "input": "keyboard",
    "expectation": "저장본 원위치·화면에 완전한초안·재시도 원자저장"
  },
  {
    "id": "F14",
    "name": "다중 탭 충돌 중 이동 차단",
    "input": "keyboard",
    "expectation": "외부저장 불변·기존입력 보존·선택 취소"
  },
  {
    "id": "F15",
    "name": "4단계보다 깊은 구조·IME guard",
    "input": "synthetic-ime",
    "expectation": "기존 고정depth4제한 없음·조합중 이동0"
  },
  {
    "id": "F16",
    "name": "4뷰포트 자유 이동 geometry",
    "input": "cdp-touch",
    "expectation": "375/390/1194가로/834세로·깊이표식/줄높이/넘침"
  }
];
const runners=new Map(),pause=ms=>new Promise(r=>setTimeout(r,ms));
const raw=p=>p.locator('.tle-textarea'),tab=(p,name)=>p.getByRole('tab',{name,exact:true});
async function frames(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function saved(p){await p.waitForFunction(()=>['이 기기에 저장됨','예시 · 변경 시 자동저장'].includes(document.querySelector('#save-status').textContent));}
async function data(p){return p.evaluate(()=>{const m=TextWorkspaceModel,s=m.read(localStorage).state;return {state:s,tasks:m.tasks(s),records:s.progressRecords};});}
function history(d,id=TRACKED){return d.records.filter(r=>r.taskId===id).map(({date,percent})=>({date,percent})).sort((a,b)=>a.date.localeCompare(b.date));}
function latest(d,id=TRACKED){return history(d,id).at(-1)||null;}
function task(d,id=TRACKED){return d.tasks.find(t=>t.id===id);}
function stableItems(before,after){assert.deepEqual(after.tasks.map(t=>t.id).sort(),before.tasks.map(t=>t.id).sort());assert.deepEqual(after.state.bindings,before.state.bindings);assert.deepEqual(after.state.folders,before.state.folders);}
async function all(p){if(await p.locator('#dialog').evaluate(e=>e.open))await p.keyboard.press('Escape');await tab(p,'전체').click();await p.locator('#folder-filter').selectOption('');await frames(p);}
async function more(p){await p.locator('#quick-progress-form').waitFor();await frames(p);await p.locator('[data-action="progress-more"]').click();await p.locator('#progress-form').waitFor();await frames(p);}
async function openProgress(p,id=TRACKED,date){
  await all(p);const row=p.locator('[data-task-row="'+id+'"]');assert.equal(await row.count(),1);
  const direct=row.locator('[data-action="progress-open"]');
  if(await direct.count())await direct.click();else{await row.locator('[data-action="task-menu"]').click();await p.locator('#dialog [data-action="progress-open"]').click();}
  await more(p);if(date)await p.locator('#progress-date').fill(date);
}
async function record(p,id,date,percent){await openProgress(p,id,date);await p.locator('#progress-percent').fill(String(percent));await p.locator('#progress-form button[type="submit"]').click();await saved(p);await frames(p);}
async function current(p,id=TRACKED){await all(p);const row=p.locator('[data-task-row="'+id+'"]');assert.equal(await row.count(),1);return row.locator('[data-action="progress-open"]').textContent();}
async function period(p,name,date){await tab(p,name).click();await p.locator('#anchor-date').fill(date);await p.locator('#anchor-date').press('Tab');await frames(p);}
async function snapshots(p,id=TRACKED){return p.locator('[data-task-row="'+id+'"][data-record-percent]').evaluateAll(es=>es.map(e=>({date:e.dataset.entryDate,percent:Number(e.dataset.recordPercent)})).sort((a,b)=>a.date.localeCompare(b.date)));}
async function document(p,id){
  if(await p.locator('#dialog').evaluate(e=>e.open))await p.keyboard.press('Escape');
  if(await p.evaluate(id=>{const h=new URLSearchParams(location.hash.slice(1));return h.get('view')==='document'&&h.get('doc')===id;},id)){await raw(p).waitFor();await frames(p);return;}
  const entry=p.locator('#navigation [data-action="document"][data-id="'+id+'"]');
  if(!await entry.isVisible())await p.getByRole('button',{name:'탐색',exact:true}).click();await entry.click();await raw(p).waitFor();await frames(p);
}
async function caret(p,index){await raw(p).focus();await p.keyboard.press('Control+Home');for(let i=0;i<index;i++)await p.keyboard.press('ArrowDown');await p.keyboard.press('End');await frames(p);}
async function emptyDocument(p){
  if(await p.locator('#dialog').evaluate(e=>e.open))await p.keyboard.press('Escape');
  if(!await p.locator('#navigation [data-action="new-document"]').isVisible())await p.getByRole('button',{name:'탐색',exact:true}).click();
  await p.getByRole('button',{name:'새 문서',exact:true}).click();await p.locator('#new-title').fill('진행 검사');await p.locator('#new-folder').selectOption('folder-unfiled');await p.locator('#new-document-form button[type=submit]').click();
  await saved(p);return await p.evaluate(()=>new URLSearchParams(location.hash.slice(1)).get('doc'));
}
async function fixture(p,title='검사 항목',duplicate=false){
  const id=await emptyDocument(p);await raw(p).fill('['+DAY7+']\n- [ ] '+title+(duplicate?'\n- [ ] '+title:''));await saved(p);const d=await data(p);
  return {data:d,id,tasks:d.tasks.filter(t=>t.docId===id)};
}
async function capture(p,name){fs.mkdirSync(IMAGE_DIR,{recursive:true});const file=path.join(IMAGE_DIR,name+'.png');await p.screenshot({path:file});return file;}
async function downloaded(p,action){const pending=p.waitForEvent('download');await action();const file=await pending,stream=await file.createReadStream(),chunks=[];for await(const part of stream)chunks.push(part);return {name:file.suggestedFilename(),text:Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/,'')};}
async function dimensions(p){return p.evaluate(()=>{const r=document.querySelector('#dialog').getBoundingClientRect();return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,dialog:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},fonts:document.fonts.status};});}
function visible(g){assert.equal(g.width,g.scrollWidth);assert.equal(g.fonts,'loaded');assert(g.dialog.x>=-1&&g.dialog.right<=g.width+1&&g.dialog.y>=-1&&g.dialog.bottom<=g.height+1,JSON.stringify(g));}
async function touchDriver(ctx,p){const c=await ctx.newCDPSession(p);const send=(type,pt)=>c.send('Input.dispatchTouchEvent',{type,touchPoints:pt?[{x:pt.x,y:pt.y,id:1,radiusX:2,radiusY:2,force:1}]:[]});return {tap:async locator=>{await locator.scrollIntoViewIfNeeded();await frames(p);const b=await locator.boundingBox();assert(b);await send('touchStart',{x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)});await pause(70);await send('touchEnd');},start:p=>send('touchStart',p),move:p=>send('touchMove',p),end:()=>send('touchEnd'),cancel:()=>send('touchCancel'),detach:()=>c.detach()};}


async function quick(p,id=TRACKED){await all(p);await p.locator('[data-task-row="'+id+'"] [data-action=progress-open]').click();await p.locator('#quick-progress-form').waitFor();await frames(p);}
async function calls(p){return p.evaluate(()=>window.__qaProgressCalls.length);}
async function quickNumber(p,id,value,date){await quick(p,id);if(date)await p.locator('#quick-date').fill(date);await p.locator('#quick-percent').fill(String(value));await p.locator('#quick-apply').click();await saved(p);await frames(p);}
async function rawFixture(p,text){const id=await emptyDocument(p);await raw(p).fill(text);await saved(p);const d=await data(p);return {id,data:d,tasks:d.tasks.filter(t=>t.docId===id),source:await raw(p).inputValue()};}
async function itemSource(p,docId){return p.evaluate(id=>{const m=TextWorkspaceModel;return m.raw(m.getDocument(m.read(localStorage).state,id));},docId);}
async function rangePoint(p,fraction){const b=await p.locator('#quick-range').boundingBox();assert(b);return {x:Math.round(b.x+10+(b.width-20)*fraction),y:Math.round(b.y+b.height/2)};}
async function chooseMove(p,beforeLineId){await p.locator('[data-action=move-choose]').click();await frames(p);const b=p.locator('[data-move-target="'+(beforeLineId===null?'__end':beforeLineId)+'"]');await b.focus();await frames(p);const keepDepth=await p.locator('.tle-move-selected').first().evaluate(e=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,id=new URLSearchParams(location.hash.slice(1)).get('doc');return m.rowMeta(s,id)[Number(e.dataset.lineIndex)].depth;});for(let i=0;i<65&&Number(await b.getAttribute('data-depth'))!==keepDepth;i++){await b.press(Number(await b.getAttribute('data-depth'))>keepDepth?'ArrowLeft':'ArrowRight');await frames(p);}assert.equal(Number(await b.getAttribute('data-depth')),keepDepth);assert.equal(await b.evaluate(e=>document.activeElement===e),true);await p.keyboard.press('Enter');await saved(p);}
async function childFixture(p){const f=await rawFixture(p,'['+DAY7+']\n- [ ] 부모\n  - [ ] 하위 A\n  - [ ] 하위 B\n- [ ] 다음 부모');const parent=f.tasks.find(t=>t.title==='부모');return {...f,parentId:parent.id,childId:parent.subchecks[0].id,secondChildId:parent.subchecks[1].id};}
function child(d,id){return d.tasks.flatMap(t=>t.subchecks.map(c=>({...c,parentId:t.id}))).find(c=>c.id===id);}
async function childQuick(p,f,id=f.childId){await document(p,f.id);await p.locator('#document-title').click();await frames(p);const index=await p.evaluate(({docId,id})=>{const m=TextWorkspaceModel;return m.rowMeta(m.read(localStorage).state,docId).find(r=>r.id===id).index;},{docId:f.id,id});const b=p.locator('.tle-progress-hit[data-line-index="'+index+'"]');await b.scrollIntoViewIfNeeded();await b.click();await p.locator('#quick-progress-form').waitFor();await frames(p);assert.equal(await p.locator('#quick-progress-form').getAttribute('data-id'),id);}
async function childRecord(p,f,value,date=DAY7,id=f.childId){await childQuick(p,f,id);await p.locator('#quick-date').fill(date);await p.locator('#quick-percent').fill(String(value));await p.locator('#quick-apply').click();await saved(p);await frames(p);}
function parentUnchanged(before,after,id){const pick=d=>{const t=task(d,id);return {done:t.done,title:t.title,date:t.date,scopeId:t.scopeId,history:history(d,id)};};assert.deepEqual(pick(after),pick(before));assert.deepEqual(after.tasks.map(t=>t.id),before.tasks.map(t=>t.id));}
const selected=p=>p.locator('.tle-root.tle-has-move-selection');
async function moveInfo(p,docId,lineId){return p.evaluate(({docId,lineId})=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,d=m.getDocument(s,docId);return {lines:d.lines,rows:m.rowMeta(s,docId),selection:m.selectionForMove(s,docId,lineId),targets:m.moveTargets(s,docId,lineId)};},{docId,lineId});}
async function sourceHandle(p,info,lineId){const row=info.rows.find(r=>r.id===lineId);assert(row);await p.locator('#document-title').click();await frames(p);const h=p.locator((row.kind==='scope'?'.tle-scope-open':'.tle-progress-hit')+'[data-line-index="'+row.index+'"]');await h.scrollIntoViewIfNeeded();await frames(p);return h;}
async function center(h){const b=await h.boundingBox();assert(b);return {x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};}
async function hold(p,touch,h,release=true){const pt=await center(h);await touch.start(pt);await pause(600);await selected(p).waitFor();if(release){await touch.end();await frames(p);}return pt;}
async function targetPoint(p,index){const line=p.locator('.tle-line[data-line-index="'+index+'"]');const b=await line.boundingBox();assert(b);return {x:Math.round(b.x+90),y:Math.round(b.y+2)};}
function movedState(before,after,info,targetId){assert.deepEqual(after.records,before.records);assert.deepEqual(after.state.folders,before.state.folders);assert.deepEqual(after.state.bindings,before.state.bindings);const flatten=d=>d.tasks.flatMap(t=>[{id:t.id,title:t.title,date:t.date,done:t.done,scopeId:t.scopeId},...t.subchecks.map(c=>({...c,parentId:t.id}))]).sort((a,b)=>a.id.localeCompare(b.id));assert.deepEqual(flatten(after),flatten(before));const original=info.lines.map(l=>l.id),ids=original.filter(id=>!info.selection.lineIds.includes(id));ids.splice(targetId===null?ids.length:ids.indexOf(targetId),0,...info.selection.lineIds);const doc=after.state.documents.find(d=>d.id===info.rows[0]?.docId)||after.state.documents.find(d=>d.lines.some(l=>l.id===info.selection.lineId));assert(doc);assert.deepEqual(doc.lines.map(l=>l.id).filter(id=>original.includes(id)),ids);}
async function drag(p,touch,f,lineId,target){const before=await data(p),info=await moveInfo(p,f.id,lineId);const origin=await hold(p,touch,await sourceHandle(p,info,lineId),false);const end=await targetPoint(p,target.index);end.x=origin.x;await touch.move(end);await p.locator('.tle-move-drop:not([hidden])').waitFor();assert.equal(await p.locator('.tle-move-drop').getAttribute('data-before-line-id'),target.beforeLineId||'');await touch.end();await saved(p);await frames(p);const after=await data(p);movedState(before,after,info,target.beforeLineId);return {before,after,info};}
async function inlineMove(p,targetId){const t=p.locator('.tle-move-target-button[data-move-target="'+(targetId===null?'__end':targetId)+'"]');await t.evaluate(e=>{const rows=document.querySelectorAll('.tle-line'),row=rows[Number(e.dataset.lineIndex)],last=rows[rows.length-1];document.querySelector('.tle-textarea').scrollTop=Math.max(0,(row?row.offsetTop:last.offsetTop+last.offsetHeight)-80);});await frames(p);await t.scrollIntoViewIfNeeded();await t.focus();await frames(p);const keepDepth=await p.locator('.tle-move-selected').first().evaluate(e=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,id=new URLSearchParams(location.hash.slice(1)).get('doc');return m.rowMeta(s,id)[Number(e.dataset.lineIndex)].depth;});for(let i=0;i<65&&Number(await t.getAttribute('data-depth'))!==keepDepth;i++){await t.press(Number(await t.getAttribute('data-depth'))>keepDepth?'ArrowLeft':'ArrowRight');await frames(p);}assert.equal(Number(await t.getAttribute('data-depth')),keepDepth);await p.keyboard.press('Enter');await saved(p);await frames(p);}
async function noExtraMoveUI(p){assert.equal(await p.locator('#move-bar,[data-action=move-choose]').count(),0);assert.equal(await p.locator('#dialog').evaluate(e=>e.open),false);assert.equal(await p.locator('#undo-button').count(),1);const undo=await p.getByRole('button').evaluateAll(es=>es.filter(e=>/되돌리기|Undo/i.test((e.getAttribute('aria-label')||'')+' '+e.textContent)).map(e=>e.id));assert.deepEqual(undo,['undo-button']);}

async function sourceDoc(p,id){return p.evaluate(id=>{const m=TextWorkspaceModel,state=m.read(localStorage).state,d=m.getDocument(state,id);return {id,state,lines:d.lines,raw:m.raw(d),rows:m.rowMeta(state,id),tasks:m.tasks(state),records:state.progressRecords};},id);}
function rowBy(d,text){const r=d.rows.find(r=>(r.progressTitle||r.title||r.text).includes(text));assert(r,'Missing row '+text);return r;}
function keepMeaning(before,after){assert.deepEqual(after.records,before.records);assert.deepEqual(after.state.bindings,before.state.bindings);assert.deepEqual(after.state.folders,before.state.folders);for(const old of before.lines){const now=after.lines.find(l=>l.id===old.id);assert(now,'Lost line '+old.id);assert.equal(now.text.trimStart(),old.text.trimStart());}const keys=['progressTargetId','progressTitle','date','note','time','scopeId'];for(const old of before.rows.filter(r=>r.progressTargetId)){const now=after.rows.find(r=>r.id===old.id);for(const key of keys)assert.deepEqual(now[key],old[key],old.id+' changed '+key);}for(const task of before.tasks){assert(after.tasks.some(t=>t.id===task.id),'Existing canonical disappeared');}}
async function sourceCaret(p,index){await raw(p).evaluate((e,i)=>{const pos=e.value.split('\n').slice(0,i+1).join('\n').length;e.focus();e.setSelectionRange(pos,pos);e.dispatchEvent(new Event('select',{bubbles:true}));},index);await frames(p);}
async function begin(p,docId,lineId){await document(p,docId);const d=await sourceDoc(p,docId),info=await moveInfo(p,docId,lineId);await sourceCaret(p,d.rows.find(r=>r.id===lineId).index);await p.keyboard.press('Alt+Shift+m');await selected(p).waitFor();await frames(p);return info;}
async function prepareTarget(p,target){const b=p.locator('.tle-move-target-button[data-move-target="'+(target.beforeLineId===null?'__end':target.beforeLineId)+'"]');await b.evaluate(e=>{const rows=document.querySelectorAll('.tle-line'),row=rows[Number(e.dataset.lineIndex)],last=rows[rows.length-1];document.querySelector('.tle-textarea').scrollTop=Math.max(0,(row?row.offsetTop:last.offsetTop+last.offsetHeight)-80);});await frames(p);await b.scrollIntoViewIfNeeded();await b.focus();await frames(p);for(let i=0;i<66&&Number(await b.getAttribute('data-depth'))!==target.depth;i++){await b.press(Number(await b.getAttribute('data-depth'))>target.depth?'ArrowLeft':'ArrowRight');await frames(p);}assert.equal(Number(await b.getAttribute('data-depth')),target.depth);assert.equal(await b.getAttribute('data-target-key'),target.targetKey);return b;}
async function freeMove(p,docId,lineId,target){const before=await sourceDoc(p,docId);await begin(p,docId,lineId);const b=await prepareTarget(p,target);await b.press('Enter');await saved(p);await frames(p);const after=await sourceDoc(p,docId),row=after.rows.find(r=>r.id===lineId);assert.equal(row.depth,target.depth);assert.equal(row.parentLineId,target.parentLineId);keepMeaning(before,after);return {before,after,row};}
async function targetFor(p,docId,lineId,parentLineId,depth){const info=await moveInfo(p,docId,lineId),target=info.targets.find(t=>t.parentLineId===parentLineId&&(depth===undefined||t.depth===depth));assert(target,'Missing allowed parent/depth '+parentLineId+'/'+depth);return target;}
async function setRowProgress(p,docId,lineId,value,date){await document(p,docId);const d=await sourceDoc(p,docId),r=d.rows.find(r=>r.id===lineId);await p.locator('#document-title').click();await frames(p);const b=p.locator('.tle-progress-hit[data-line-index="'+r.index+'"]');await b.scrollIntoViewIfNeeded();await b.click();await p.locator('#quick-progress-form').waitFor();await frames(p);if(date)await p.locator('#quick-date').fill(date);await p.locator('#quick-percent').fill(String(value));await p.locator('#quick-apply').click();await saved(p);}
runners.set('F01',async({page:p})=>{const initial=await sourceDoc(p,'d-move'),child=rowBy(initial,'큰 박스 확인'),parent=rowBy(initial,'관리실에 전화');await setRowProgress(p,'d-move',child.id,35,DAY7);const target=await targetFor(p,'d-move',child.id,parent.id),m=await freeMove(p,'d-move',child.id,target);assert.equal(m.row.progressTargetId,child.id);assert.equal(latest(m.after,child.id).percent,35);assert.equal(m.row.parentLineId,parent.id);return {id:child.id,fromParent:child.parentLineId,toParent:parent.id,target,progress:35};});
runners.set('F02',async({page:p})=>{const initial=await sourceDoc(p,'d-move'),child=rowBy(initial,'큰 박스 확인'),parent=rowBy(initial,'관리실에 전화'),count=initial.tasks.length;await setRowProgress(p,'d-move',child.id,20,DAY7);const top=await targetFor(p,'d-move',child.id,null,0);await freeMove(p,'d-move',child.id,top);let d=await sourceDoc(p,'d-move');assert(d.tasks.some(t=>t.id===child.id));assert.equal(d.tasks.length,count+1);const nested=await targetFor(p,'d-move',child.id,parent.id);await freeMove(p,'d-move',child.id,nested);d=await sourceDoc(p,'d-move');assert.equal(d.tasks.length,count+1);assert(d.rows.find(r=>r.id===child.id).isCanonical);await all(p);assert.equal(await p.locator('[data-task-row="'+child.id+'"]').count(),1);await document(p,'d-move');const rawBefore=await raw(p).inputValue();await raw(p).fill(rawBefore+'\n- [ ] 새 부모\n  - [ ] 새 하위');await saved(p);const after=await sourceDoc(p,'d-move'),fresh=rowBy(after,'새 하위');assert(!after.tasks.some(t=>t.id===fresh.id));await all(p);assert.equal(await p.locator('[data-task-row="'+fresh.id+'"]').count(),0);return {promotedId:child.id,countBefore:count,countAfterPromotion:count+1,reNestedStillCanonical:true,newChildIndependentRows:0};});
runners.set('F03',async({page:p})=>{await document(p,'flow-move-d30');const old=await raw(p).inputValue(),line=(await sourceDoc(p,'flow-move-d30')).lines.find(l=>l.id===TRACKED);assert(line);await raw(p).fill(old.replace(line.text,line.text+'\n  - 메모: 원문 세부 메모\n  - 시간: 10:00'));await saved(p);const before=await sourceDoc(p,'flow-move-d30'),parent=before.tasks.find(t=>t.docId==='flow-move-d30'&&t.id!==TRACKED);assert(parent);const target=await targetFor(p,'flow-move-d30',TRACKED,parent.id),m=await freeMove(p,'flow-move-d30',TRACKED,target),a=task(m.after),b=task(before);for(const k of ['title','done','date','note','time','scopeId'])assert.deepEqual(a[k],b[k]);assert.match(a.note,/원문 세부 메모/);assert.equal(a.time,'10:00');assert.deepEqual(m.after.state.documents,before.state.documents);await all(p);assert.equal(await p.locator('[data-task-row="'+TRACKED+'"]').count(),1);return {canonicalId:TRACKED,target,parentId:parent.id,history:history(m.after),note:a.note,time:a.time,referenceDocsUnchanged:true};});
runners.set('F04',async({page:p})=>{const f=await rawFixture(p,'['+DAY7+']\n- [20] 부모 A\n  - 메모: 부모 메모\n  - 시간: 10:00\n  - [10] 하위 A\n    - 메모: 하위 메모\n- [ ] 부모 B\n  - 날짜: '+DAY8),before=await sourceDoc(p,f.id),a=rowBy(before,'부모 A'),b=rowBy(before,'부모 B'),target=await targetFor(p,f.id,a.id,b.id),selection=(await moveInfo(p,f.id,a.id)).selection,m=await freeMove(p,f.id,a.id,target),delta=target.depth-a.depth;for(const id of selection.lineIds){const old=before.rows.find(r=>r.id===id),now=m.after.rows.find(r=>r.id===id);assert.equal(now.depth,old.depth+delta);}assert.equal(m.row.parentLineId,b.id);return {parentId:a.id,newParent:b.id,movedIds:selection.lineIds,relativeDepthDelta:delta,records:m.after.records.filter(r=>selection.lineIds.includes(r.taskId))};});
runners.set('F05',async({page:p})=>{const before=await sourceDoc(p,'d-move'),scope=before.rows.find(r=>r.kind==='scope'&&r.scopeId==='folder-box'),parent=rowBy(before,'오늘 할 일 정리');assert(scope);const target=await targetFor(p,'d-move',scope.id,parent.id),m=await freeMove(p,'d-move',scope.id,target);assert.deepEqual(m.after.state.folders,before.state.folders);assert.deepEqual(m.after.state.flows,before.state.flows);return {scopeId:scope.scopeId,lineId:scope.id,newOutlineParent:parent.id,catalogParentChanged:false};});
async function pickerUnderTask(p){const f=await rawFixture(p,'['+DAY7+']\n- [ ] 연결 부모\n  - [ ] 연결 자리\n- [20] 기존 대상\n  - 날짜: '+DAY8),before=await sourceDoc(p,f.id),parent=rowBy(before,'연결 부모'),slot=rowBy(before,'연결 자리'),target=rowBy(before,'기존 대상');const open=async()=>{await sourceCaret(p,slot.index);await p.locator('.tle-plus').click();await p.locator('#dialog [data-action=picker-task]').click();await p.locator('#picker-search').waitFor();await frames(p);};await open();assert.equal(await p.locator('#link-date-mode').inputValue(),'keep');await p.locator('[data-pick-task="'+target.id+'"]').click();await saved(p);const after=await sourceDoc(p,f.id),ref=after.rows.find(r=>r.isReference&&r.taskId===target.id);assert(ref);assert.equal(ref.parentLineId,parent.id);assert.equal(ref.date,DAY8);assert.deepEqual(after.records,before.records);assert.equal(after.tasks.length,before.tasks.length);assert.deepEqual(after.state.flows,before.state.flows);await open();await p.locator('[data-pick-task="'+parent.id+'"]').click();await frames(p);assert.deepEqual(await sourceDoc(p,f.id),after);assert.equal(await raw(p).inputValue(),after.raw);assert.equal(await p.locator('#dialog').evaluate(e=>e.open),true);await p.keyboard.press('Escape');return {existingID:target.id,parentID:parent.id,keepDate:ref.date,newCanonicalItems:0,selfReferenceRejected:true};}
runners.set('F06',async({page:p})=>{const before=await sourceDoc(p,'d-move'),flow=before.rows.find(r=>r.kind==='scope'&&r.scopeId==='flow-move-d30'),parent=rowBy(before,'관리실에 전화');assert(flow);const target=await targetFor(p,'d-move',flow.id,parent.id),m=await freeMove(p,'d-move',flow.id,target);assert.deepEqual(m.after.state.flows,before.state.flows);assert.deepEqual(m.after.state.bindings,before.state.bindings);assert.equal(m.after.tasks.length,before.tasks.length);const child=rowBy(m.after,'큰 박스 확인'),reference=m.after.rows.find(r=>r.isReference&&r.taskId===TRACKED);const localTarget=await targetFor(p,'d-move',child.id,reference.id),local=await freeMove(p,'d-move',child.id,localTarget);assert.deepEqual(local.after.state.flows,before.state.flows);assert.equal(local.row.parentLineId,reference.id);assert.equal(local.after.tasks.length,before.tasks.length);await p.locator('[data-action=document-menu]').click();const exported=await downloaded(p,()=>p.locator('#dialog [data-action=download]').click());assert.match(exported.name,/\.txt$/);const exportChecks=[];for(const ref of local.after.rows.filter(r=>r.isReference)){const original=local.after.lines.find(l=>l.id===ref.id),canonical=local.after.tasks.find(t=>t.id===ref.taskId),indent='  '.repeat(ref.depth+1),at=exported.text.split('\n').indexOf(original.text),out=exported.text.split('\n');assert(at>=0);assert.equal(out[at+1],indent+'- 날짜: '+(canonical.date||'미정'));assert.equal(out[at+2],indent+'- 원문: '+canonical.folder+' / '+canonical.docTitle);if(canonical.note)assert.equal(out[at+3],indent+'- 메모: '+canonical.note.split('\n')[0]);exportChecks.push({id:ref.id,depth:ref.depth,supplementDepth:ref.depth+1});}assert(exportChecks.length>0);const pickerCheck=await pickerUnderTask(p);return {pickerCheck,exportChecks,downloadedTXTContentRead:true,flowId:flow.scopeId,newOutlineParent:parent.id,flowSourceUnchanged:true,canonicalCount:before.tasks.length,localChildUnderReference:child.id,referenceLineId:reference.id};});
runners.set('F07',async({page:p})=>{const f=await childFixture(p),before=await sourceDoc(p,f.id),info=await begin(p,f.id,f.parentId);assert(info.targets.every(t=>!info.selection.lineIds.includes(t.parentLineId)));const rejected=await p.evaluate(({docId,id,childId})=>{const m=TextWorkspaceModel,s=m.read(localStorage).state,r=m.rowMeta(s,docId).find(r=>r.id===childId);return m.moveSubtree(s,docId,id,childId,r.depth+1)===s;},{docId:f.id,id:f.parentId,childId:f.childId});assert(rejected);assert.deepEqual(await sourceDoc(p,f.id),before);await p.keyboard.press('Escape');return {ownDescendantTargets:0,invalidDirectAPIReturnsSameState:true,rawAndHistoryUnchanged:true};});

async function demo(p){const f=await rawFixture(p,'['+DAY7+']\n- [20] 항목 A\n  - [10] 하위 A\n- [ ] 항목 B\n  - [ ] 하위 B\n- [ ] 항목 C'),d=await sourceDoc(p,f.id);return {...f,a:rowBy(d,'항목 A'),b:rowBy(d,'항목 B'),c:rowBy(d,'항목 C'),source:d};}
async function nestedTarget(p,f){const info=await moveInfo(p,f.id,f.a.id),target=info.targets.find(t=>t.beforeLineId===f.c.id&&t.parentLineId===f.b.id&&t.depth===1);assert(target,'B child boundary before C must be available');return target;}
runners.set('F08',async({page:p,touch})=>{const f=await demo(p),target=await nestedTarget(p,f),info=await moveInfo(p,f.id,f.a.id),h=await sourceHandle(p,info,f.a.id),step=await p.evaluate(()=>{const c=document.createElement('canvas').getContext('2d');c.font=getComputedStyle(document.querySelector('.tle-textarea')).font;return c.measureText('0').width*2;});const start=await hold(p,touch,h,false),end=await targetPoint(p,target.index);end.x=Math.round(start.x+step*(target.depth-f.a.depth));await touch.move(end);await frames(p);const drop=p.locator('.tle-move-drop:not([hidden])');await drop.waitFor();assert.equal(Number(await drop.getAttribute('data-depth')),1);assert.equal(await drop.getAttribute('data-target-key'),target.targetKey);await touch.end();await saved(p);const after=await sourceDoc(p,f.id),row=after.rows.find(r=>r.id===f.a.id);assert.equal(row.parentLineId,f.b.id);assert.equal(row.depth,1);keepMeaning(f.source,after);return {sourceDepth:0,previewDepth:1,finalDepth:row.depth,step2ch:step,targetKey:target.targetKey,actualCDPTouch:true};});
runners.set('F09',async({page:p})=>{const f=await demo(p),info=await begin(p,f.id,f.a.id),target=await nestedTarget(p,f),b=await prepareTarget(p,target),before=await sourceDoc(p,f.id),depthButton=p.locator('.tle-move-depth-button[data-move-target="'+target.beforeLineId+'"]');await depthButton.click();await frames(p);const depth=Number(await b.getAttribute('data-depth')),chosen=info.targets.find(t=>t.beforeLineId===target.beforeLineId&&t.depth===depth);assert(chosen);assert.notEqual(depth,target.depth);assert.deepEqual(await sourceDoc(p,f.id),before);await b.press('Enter');await saved(p);const after=await sourceDoc(p,f.id);assert.equal(after.rows.find(r=>r.id===f.a.id).depth,depth);keepMeaning(before,after);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await sourceDoc(p,f.id),before);return {depthButtonPreviewOnly:true,fromDepth:target.depth,toDepth:depth,oneUndo:true};});
runners.set('F10',async({page:p})=>{const f=await demo(p),target=await nestedTarget(p,f);await begin(p,f.id,f.a.id);const b=await prepareTarget(p,target);await b.press('ArrowLeft');await frames(p);assert.equal(Number(await b.getAttribute('data-depth')),0);await b.press('ArrowRight');await frames(p);assert.equal(Number(await b.getAttribute('data-depth')),1);await b.press('ArrowUp');await frames(p);const up=await p.evaluate(()=>document.activeElement.dataset.moveTarget);assert.notEqual(up,target.beforeLineId);await p.keyboard.press('ArrowDown');await frames(p);const down=await p.evaluate(()=>({boundary:document.activeElement.dataset.moveTarget,depth:Number(document.activeElement.dataset.depth)}));assert.equal(down.boundary,target.beforeLineId);await prepareTarget(p,target);await p.keyboard.press('Enter');await saved(p);const after=await sourceDoc(p,f.id);assert.equal(after.rows.find(r=>r.id===f.a.id).parentLineId,f.b.id);keepMeaning(f.source,after);return {leftRightDepth:true,upDownBoundary:true,targetKey:target.targetKey};});
runners.set('F11',async({page:p,touch})=>{const f=await demo(p),info=await begin(p,f.id,f.a.id),target=await nestedTarget(p,f),b=await prepareTarget(p,target),depthButton=p.locator('.tle-move-depth-button[data-move-target="'+target.beforeLineId+'"]');await touch.tap(depthButton);await frames(p);const depth=Number(await b.getAttribute('data-depth')),actual=info.targets.find(t=>t.beforeLineId===target.beforeLineId&&t.depth===depth);assert(actual);assert.deepEqual(await sourceDoc(p,f.id),f.source);await touch.tap(b);await saved(p);const after=await sourceDoc(p,f.id);assert.equal(after.rows.find(r=>r.id===f.a.id).parentLineId,actual.parentLineId);keepMeaning(f.source,after);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await sourceDoc(p,f.id),f.source);return {cdpDepthTap:true,cdpDestinationTap:true,targetKey:actual.targetKey,oneUndo:true};});
runners.set('F12',async({page:p})=>{const f=await demo(p),target=await nestedTarget(p,f),m=await freeMove(p,f.id,f.a.id,target);await p.locator('#undo-button').click();await saved(p);assert.deepEqual(await sourceDoc(p,f.id),m.before);await p.keyboard.press('Control+Shift+z');await saved(p);assert.deepEqual(await sourceDoc(p,f.id),m.after);await p.reload();await raw(p).waitFor();assert.deepEqual(await sourceDoc(p,f.id),m.after);await all(p);assert.equal(await p.locator('[data-task-row="'+f.a.id+'"]').count(),1);assert.equal(latest(await data(p),f.a.id).percent,20);return {undoRedoReload:true,canonicalId:f.a.id,current:20,uniqueRow:1};});
runners.set('F13',async({page:p})=>{const f=await demo(p),target=await nestedTarget(p,f);await begin(p,f.id,f.a.id);const b=await prepareTarget(p,target);await p.evaluate(()=>{window.__qaFailure=true;});await b.press('Enter');await p.waitForFunction(()=>document.querySelector('#save-status').textContent==='저장하지 못함');assert.deepEqual(await sourceDoc(p,f.id),f.source);const pending=await raw(p).inputValue();assert.notEqual(pending,f.source.raw);assert(pending.split('\n').some(l=>l.startsWith('  - [20] 항목 A')));const backup=await downloaded(p,()=>p.locator('#save-error [data-action=download-all]').click()),payload=JSON.parse(backup.text);assert.equal(backup.name,'flowme-ux-v11-recovery.json');assert.equal(payload.format,'flowme-ux-v11-recovery');assert.equal(payload.state.version,11);assert.equal(payload.state.documents.find(d=>d.id===f.id).lines.map(l=>l.text).join('\n'),pending);assert.deepEqual(payload.state.progressRecords,f.source.records);await p.evaluate(()=>{window.__qaFailure=false;});await p.locator('#save-error [data-action=retry]').click();await saved(p);const after=await sourceDoc(p,f.id);assert.equal(after.raw,pending);assert.equal(after.rows.find(r=>r.id===f.a.id).parentLineId,f.b.id);keepMeaning(f.source,after);return {backupFormat:payload.format,backupPendingStateRead:true,storedRollbackDuringFailure:true,completeDraftRetained:true,retryAtomic:true};});
runners.set('F14',async({page:p,context,url})=>{const f=await demo(p);await begin(p,f.id,f.a.id);const other=await context.newPage();await other.goto(url);await raw(other).waitFor();await document(other,f.id);await raw(other).fill(f.source.raw+'\n다른 탭 입력');await saved(other);await p.waitForFunction(()=>document.querySelector('.tle-textarea').readOnly);const external=await sourceDoc(p,f.id);assert.equal(await raw(p).inputValue(),f.source.raw);assert.equal(await selected(p).count(),0);assert.equal(await p.locator('.tle-move-target-button').count(),0);await p.keyboard.press('Alt+Shift+m');assert.equal(await selected(p).count(),0);assert.deepEqual(await sourceDoc(p,f.id),external);return {externalRaw:external.raw,localSourcePreserved:true,moveBlocked:true};});
runners.set('F15',async({page:p})=>{const text='['+DAY7+']\n'+Array.from({length:7},(_,i)=>'  '.repeat(i)+'- [ ] 깊이 '+i).join('\n')+'\n- [ ] 새 부모',f=await rawFixture(p,text),before=await sourceDoc(p,f.id),deep=rowBy(before,'깊이 6'),parent=rowBy(before,'새 부모');assert.equal(deep.depth,6);await sourceCaret(p,deep.index);await raw(p).dispatchEvent('compositionstart',{data:'ㅎ'});await p.keyboard.press('Alt+Shift+m');assert.equal(await selected(p).count(),0);assert.equal(await raw(p).inputValue(),text);await raw(p).dispatchEvent('compositionend',{data:''});await frames(p);assert.equal(await raw(p).evaluate(e=>document.activeElement===e),true);await p.keyboard.press('Shift+Tab');await saved(p);assert.equal((await sourceDoc(p,f.id)).rows.find(r=>r.id===deep.id).depth,5);await p.keyboard.press('Tab');await saved(p);assert.equal((await sourceDoc(p,f.id)).rows.find(r=>r.id===deep.id).depth,6);keepMeaning(before,await sourceDoc(p,f.id));const target=await targetFor(p,f.id,deep.id,parent.id);await freeMove(p,f.id,deep.id,target);const guard=await rawFixture(p,'['+DAY7+']\n- [ ] 속성 보호\n  - 메모: memo\n  - 날짜: '+DAY8),safe=await sourceDoc(p,guard.id);await sourceCaret(p,3);await p.keyboard.press('Tab');await frames(p);assert.equal(await raw(p).inputValue(),safe.raw);assert.deepEqual(await sourceDoc(p,guard.id),safe);assert.equal(rowBy(safe,'속성 보호').date,DAY8);assert.equal(rowBy(safe,'속성 보호').note,'memo');return {propertyOrphanTabRejected:true,rawAndAttributesPreserved:true,acceptedDepth:6,oldDepth4Limit:false,nativeTabShiftTab:true,syntheticCompositionGuard:true,physicalIME:false};});
runners.set('F16',async({page:p,touch})=>{const checks=[],screenshots=[];for(const [width,height] of [[375,844],[390,844],[1194,834],[834,1194]]){await p.setViewportSize({width,height});const f=await demo(p),target=await nestedTarget(p,f);await begin(p,f.id,f.a.id);const b=await prepareTarget(p,target);const g=await p.evaluate(()=>{const e=document.querySelector('.tle-move-target-button:focus'),r=e.getBoundingClientRect(),a=document.querySelector('.tle-textarea'),m=document.querySelector('.tle-presentation');return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,target:{x:r.x,y:r.y,right:r.right,bottom:r.bottom},textarea:a.scrollHeight,mirror:m.scrollHeight,fonts:document.fonts.status};});assert.equal(g.width,g.scrollWidth);assert.equal(g.fonts,'loaded');assert(Math.abs(g.textarea-g.mirror)<=2,JSON.stringify(g));assert(g.target.x>=0&&g.target.right<=width+1&&g.target.y>=0&&g.target.bottom<=height+1);screenshots.push(await capture(p,'freedom-depth-'+width+'x'+height));await touch.tap(b);await saved(p);const after=await sourceDoc(p,f.id);assert.equal(after.rows.find(r=>r.id===f.a.id).parentLineId,f.b.id);keepMeaning(f.source,after);screenshots.push(await capture(p,'freedom-nested-'+width+'x'+height));checks.push(g);}return {checks,screenshots,realDevices:0};});

async function main(){
 const report={schema:'flowme-v11-freedom-qa',mode:'planned',url:URL,storageKey:KEY,createdAt:new Date().toISOString(),realDevices:0,observedUsers:0,productionIntegration:0,summary:{planned:PLAN.length,executed:0,passed:null,failed:null,notRun:PLAN.length},cases:PLAN.map(c=>({...c,status:'not_run',console:[],pageErrors:[]}))};
 if(!process.argv.includes('--run')){if(fs.existsSync(RESULT)&&JSON.parse(fs.readFileSync(RESULT)).mode==='executed'){console.log('기존 실행 결과 보존');return;}fs.writeFileSync(RESULT,JSON.stringify(report,null,2)+'\n');console.log('새 v11 QA 16개 계획 · 실행0');return;}
 report.phase=process.argv.includes('--final')?'final':'preliminary';if(ONLY){assert.equal(report.phase,'preliminary');report.only=ONLY;}
 report.sourceHashesBefore=hashes(__dirname);const previous=path.join(__dirname,'../2026-09-08-flowme-text-workspace-ux-v10');report.v10HashesBefore=optionalHashes(previous);
 const m=require('./model.js');assert.equal(m.KEY,KEY);assert.equal(m.createState().version,11);for(const key of ['recordProgress','progressHistory','latestProgress'])assert.equal(typeof m[key],'function');
 if(fs.existsSync(RESULT)){const old=JSON.parse(fs.readFileSync(RESULT));if(old.mode==='executed'&&JSON.stringify(old.sourceHashesAfter)!==JSON.stringify(report.sourceHashesBefore)){const file=path.join(__dirname,'browser-freedom-results-previous-runtime.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(old,null,2)+'\n');}if(old.mode==='executed'&&old.summary.failed){const file=path.join(__dirname,old.phase==='final'?'browser-freedom-results-final-initial.json':'browser-freedom-results-initial.json');if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(old,null,2)+'\n');}}
 const {chromium}=require('playwright'),browser=await chromium.launch({headless:true});report.mode='executed';report.browser=browser.version();report.startedAt=new Date().toISOString();
 try{for(const c of report.cases){if(ONLY&&c.id!==ONLY)continue;const isTouch=c.input==='cdp-touch',context=await browser.newContext({viewport:{width:isTouch?390:1194,height:isTouch?844:834},hasTouch:true,isMobile:isTouch});
 await context.addInitScript(key=>{window.__qaStorage=[];window.__qaEvents=[];for(const method of ['getItem','setItem','removeItem']){const original=Storage.prototype[method];Storage.prototype[method]=function(name,value){window.__qaStorage.push({method,key:String(name)});if(method==='setItem'&&name===key&&window.__qaFailure)throw new DOMException('Independent QA quota failure','QuotaExceededError');return method==='setItem'?original.call(this,name,value):original.call(this,name);};}for(const type of ['pointerdown','pointerup','pointercancel','click'])document.addEventListener(type,e=>{window.__qaEvents.push({type,trusted:e.isTrusted,pointerType:e.pointerType||'',target:e.target.className?.baseVal??e.target.className});},true);},KEY);
 const page=await context.newPage();page.setDefaultTimeout(8000);const touch=await touchDriver(context,page);page.on('console',msg=>{if(['error','warning'].includes(msg.type()))c.console.push({type:msg.type(),text:msg.text()});});page.on('pageerror',e=>c.pageErrors.push(e.message));const start=Date.now();
 try{await page.goto(URL);await raw(page).waitFor();await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>{window.__qaProgressCalls=[];const m=TextWorkspaceModel,original=m.recordProgress;m.recordProgress=function(...args){window.__qaProgressCalls.push({id:args[1],date:args[2],percent:args[3]});return original.apply(this,args);};});assert.equal(typeof runners.get(c.id),'function','Runtime QA implementation not ready for '+c.id);c.evidence=await runners.get(c.id)({page,context,touch,url:URL});assert.deepEqual(c.pageErrors,[]);c.progressCalls=await page.evaluate(()=>window.__qaProgressCalls||[]);c.events=[...(c.evidence.eventsBeforeReload||[]),...await page.evaluate(()=>window.__qaEvents)];if(isTouch)assert(c.events.some(e=>e.trusted&&e.pointerType==='touch'&&e.type==='pointerdown'));c.status='passed';}
 catch(e){c.status='failed';c.error=e.stack||String(e);c.diagnostic=await page.evaluate(()=>({url:location.href,save:document.querySelector('#save-status')?.textContent,error:document.querySelector('#dialog-error')?.textContent,form:document.querySelector('#quick-progress-form,#progress-form')?.outerHTML,quickDate:document.querySelector('#quick-date')?.value,quickPercent:document.querySelector('#quick-percent')?.value,raw:document.querySelector('.tle-textarea')?.value})).catch(()=>null);}
 finally{c.elapsedMs=Date.now()-start;await touch.detach().catch(()=>{});await context.close();}console.log(c.id+' '+c.status+' ('+c.elapsedMs+'ms)'+(c.error?'\n'+c.error:''));}}
 finally{await browser.close();}
 report.finishedAt=new Date().toISOString();report.sourceHashesAfter=hashes(__dirname);report.v10HashesAfter=optionalHashes(previous);report.sourcesUnchangedDuringRun=JSON.stringify(report.sourceHashesBefore)===JSON.stringify(report.sourceHashesAfter);report.v10UnchangedDuringRun=report.v10HashesBefore===null?null:JSON.stringify(report.v10HashesBefore)===JSON.stringify(report.v10HashesAfter);
 const passed=report.cases.filter(c=>c.status==='passed').length,failed=report.cases.filter(c=>c.status==='failed').length;report.summary={planned:PLAN.length,executed:passed+failed,passed,failed,notRun:PLAN.length-passed-failed};fs.writeFileSync(RESULT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(failed||(!ONLY&&report.summary.notRun)||!report.sourcesUnchangedDuringRun||report.v10UnchangedDuringRun===false)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
