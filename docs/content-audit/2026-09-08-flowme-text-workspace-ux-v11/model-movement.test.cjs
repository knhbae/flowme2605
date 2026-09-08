'use strict';
const assert = require('node:assert/strict');
const M = require('./model.js');
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
const clone = v => JSON.parse(JSON.stringify(v));
function fixture(text) {
  const doc = { id:'d', title:'전이 검사', folder:'일상', folderId:'f', lines:text.split('\n').map((text,i)=>({id:'l'+i,text})) };
  const s={version:11,documents:[doc],flows:[],folders:[{id:'f',title:'일상',parentId:null},{id:'other',title:'다른 폴더',parentId:null}],bindings:[],taskScopes:{},itemScopes:{},progressRecords:[]};
  const p=M.parseDocument(doc,s);p.items.forEach(t=>s.itemScopes[t.id]='f');p.tasks.forEach(t=>s.taskScopes[t.id]='f');assert(M.validate(s));return s;
}
const meta=(s,id,doc='d')=>M.rowMeta(s,doc).find(r=>r.id===id);
const allItems=s=>s.documents.concat(s.flows).flatMap(d=>M.parseDocument(d,s).items).filter(t=>!s.bindings.some(b=>b.kind==='task'&&b.lineId===t.id));
function preserve(s,n) {
  assert.notEqual(n,s);assert(M.validate(n));
  const values=state=>allItems(state).map(t=>({id:t.id,title:t.title,done:t.done,date:t.date,note:t.note,time:t.time,docId:t.docId})).sort((a,b)=>a.id.localeCompare(b.id));
  assert.deepEqual(values(n),values(s));assert.deepEqual(n.progressRecords,s.progressRecords);assert.deepEqual(n.itemScopes,s.itemScopes);
  for(const id of Object.keys(s.taskScopes))assert.equal(n.taskScopes[id],s.taskScopes[id]);
  assert.deepEqual(n.folders,s.folders);assert.deepEqual(n.bindings,s.bindings);
  for(const d of s.documents.concat(s.flows))for(const line of d.lines){const next=M.getDocument(n,d.id).lines.find(l=>l.id===line.id);assert(next);assert.equal(next.text.trimStart(),line.text.trimStart());}
}
function move(s,id,before,depth,doc='d') {
  assert(M.moveTargets(s,doc,id).some(t=>t.beforeLineId===before&&t.depth===depth),`${id} -> ${before}:${depth} is advertised`);
  const n=M.moveSubtree(s,doc,id,before,depth);preserve(s,n);return n;
}
function memory(initial={}) {const data=new Map(Object.entries(initial));return {data,getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,v)};}

test('v11 schema and storage are isolated from every v10 byte',()=>{
  assert.equal(M.KEY,'flowme:ux-review:text-workspace-v11:20260908');assert.equal(M.MAX_DEPTH,32);
  const oldKey='flowme:ux-review:text-workspace-v10:20260908',store=memory({[oldKey]:'unchanged'}),s=M.read(store).state;
  assert.equal(s.version,11);assert(M.write(store,s,null).ok);assert.equal(store.data.get(oldKey),'unchanged');
  const bad=clone(s);bad.version=10;assert.equal(M.read(memory({[M.KEY]:JSON.stringify(bad)})).ok,false);
});
test('stable item ownership registry rejects missing unknown and divergent canonical owners',()=>{
  const s=fixture('- [ ] A\n  - [ ] child');
  for(const change of [n=>delete n.itemScopes,n=>delete n.itemScopes.l1,n=>n.itemScopes.l1='missing',n=>n.itemScopes.extra='f',n=>n.itemScopes.l0='other']) {const n=clone(s);change(n);assert.equal(M.validate(n),false);}
});
test('ordinary child initially has a progress identity but no planning membership',()=>{
  const s=fixture('- [ ] A\n  - [ ] child');assert.equal(M.tasks(s).length,1);assert.equal(meta(s,'l1').progressTargetId,'l1');assert.equal(meta(s,'l1').taskId,'l0');assert.equal(meta(s,'l1').isCanonical,false);assert.equal(s.itemScopes.l1,'f');
});
test('child reparenting at the same depth changes the parent not the item',()=>{
  const s=fixture('- [ ] A\n  - [ ] child\n- [ ] B\n  - [ ] B child'),n=move(s,'l1','l3',1);
  assert.equal(meta(n,'l1').parentLineId,'l2');assert.equal(M.tasks(n).length,2);assert(!n.taskScopes.l1);
});
test('child reparenting to a different child parent preserves unplanned identity',()=>{
  const s=fixture('- [ ] A\n  - [ ] one\n    - [ ] moving\n  - [ ] two\n    - [ ] sibling'),n=move(s,'l2','l4',2);
  assert.equal(meta(n,'l2').parentLineId,'l3');assert.equal(meta(n,'l2').taskId,'l0');assert.equal(M.tasks(n).length,1);
});
test('child reparenting across parent dates pins the original inherited date',()=>{
  const s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] moving\n[2026-09-10]\n- [ ] B\n  - [ ] sibling'),n=move(s,'l2','l5',1);
  assert.equal(meta(n,'l2').date,'2026-09-07');assert(M.raw(M.getDocument(n,'d')).includes('    - 날짜: 2026-09-07'));
  assert.equal(meta(n,'l4').date,'2026-09-10');
});
test('an explicitly undated child remains undated below a dated parent',()=>{
  const s=fixture('[미정]\n- [ ] A\n  - [ ] moving\n[2026-09-10]\n- [ ] B'),n=move(s,'l2',null,1);
  assert.equal(meta(n,'l2').date,null);assert(M.raw(n.documents[0]).includes('    - 날짜: 미정'));
});
test('child own dates multiple notes and time travel together to another parent',()=>{
  const s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] moving\n    - 날짜: 2026-09-12\n    - 메모: 첫째\n    - 메모: 둘째\n    - 시간: 09:30\n- [ ] B'),n=move(s,'l2',null,1);
  assert.equal(meta(n,'l2').note,'첫째\n둘째');assert.equal(meta(n,'l2').time,'09:30');assert.equal(meta(n,'l2').date,'2026-09-12');
});
test('nested child histories and current completion do not aggregate during reparenting',()=>{
  let s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] child\n    - [ ] grandchild\n- [ ] B');s=M.recordProgress(s,'l2','2026-09-07',20);s=M.recordProgress(s,'l3','2026-09-07',100);
  const n=move(s,'l2',null,1);assert.equal(meta(n,'l2').done,false);assert.equal(meta(n,'l3').done,true);assert.equal(meta(n,'l4').done,false);
});
test('child promotion adds planning membership once while retaining its source ID',()=>{
  const s=fixture('- [ ] A\n  - [ ] child\n- [ ] B'),n=move(s,'l1',null,0);
  assert.equal(M.tasks(n).length,M.tasks(s).length+1);assert.equal(n.taskScopes.l1,'f');assert.equal(meta(n,'l1').kind,'task');
});
test('promoted child stays planned when subsequently nested again',()=>{
  const s=fixture('- [ ] A\n  - [ ] child\n- [ ] B'),p=move(s,'l1',null,0),n=move(p,'l1','l2',1);
  assert.equal(M.tasks(n).length,3);assert.equal(meta(n,'l1').kind,'subcheck');assert.equal(meta(n,'l1').isCanonical,true);assert.equal(meta(n,'l1').taskId,'l1');assert.equal(meta(n,'l1').parentTaskId,'l0');
});
test('existing canonical Task can be nested below an ordinary child without disappearing',()=>{
  const s=fixture('- [ ] A\n  - [ ] child\n- [ ] B'),n=move(s,'l2',null,2);
  assert.equal(meta(n,'l2').parentLineId,'l1');assert.equal(meta(n,'l2').taskId,'l2');assert.equal(meta(n,'l2').isCanonical,true);assert.equal(M.tasks(n).length,2);
});
test('canonical own metadata is editable after nesting and never edits the new parent',()=>{
  const s=fixture('- [ ] A\n- [ ] B'),n=move(s,'l1',null,1),changed=M.updateTask(n,'l1',{date:'2026-09-10',note:'own',time:'08:20'});
  assert.notEqual(changed,n);assert.equal(meta(changed,'l1').note,'own');assert.equal(meta(changed,'l1').time,'08:20');assert.equal(meta(changed,'l0').note,'');assert.equal(M.tasks(changed).length,2);
});
test('same-title children move by ID without merging dated records',()=>{
  let s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] same\n  - [ ] same\n- [ ] B');s=M.recordProgress(s,'l2','2026-09-07',20);s=M.recordProgress(s,'l3','2026-09-07',70);
  const n=move(s,'l2',null,1);assert.equal(M.latestProgress(n,'l2').percent,20);assert.equal(M.latestProgress(n,'l3').percent,70);
});
test('raw indentation of duplicate-title Tasks preserves positional stable IDs',()=>{
  const s=fixture('- [ ] A\n- [ ] same\n- [ ] same'),n=M.editText(s,'d','- [ ] A\n  - [ ] same\n  - [ ] same');
  preserve(s,n);assert.deepEqual(n.documents[0].lines.map(l=>l.id),['l0','l1','l2']);assert.equal(M.tasks(n).length,3);
});
test('raw child promotion and numeric renaming do not replay old snapshots',()=>{
  let s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] child');s=M.editText(s,'d','[2026-09-07]\n- [ ] A\n  - [20] child');
  const n=M.editText(s,'d','[2026-09-07]\n- [ ] A\n- [20] child',{progressDate:'2026-10-01'});preserve(s,n);assert.equal(n.progressRecords.length,1);
});
test('child planning owner is preserved through promotion under a foreign folder link',()=>{
  let s=fixture('- [ ] A\n  - [ ] child\n- ');s=M.attachScope(s,'d',2,'other');
  const n=move(s,'l1',null,1);assert.equal(n.taskScopes.l1,'f');assert.equal(meta(n,'l1').ancestorScopeId,'other');assert.equal(meta(n,'l1').scopeMismatch,true);
});
test('private Flow source Task nesting preserves all external references and source identity',()=>{
  const s=M.createState(),id='flow-move-d30-line-3',n=move(s,id,null,1,'flow-move-d30');
  assert.deepEqual(n.documents,s.documents);assert.equal(M.tasks(n).length,M.tasks(s).length);assert.equal(meta(n,id,'flow-move-d30').kind,'subcheck');assert.equal(n.taskScopes[id],'flow-move-d30');
});
test('renaming a nested canonical source still synchronizes every existing reference',()=>{
  const s=M.createState(),n=move(s,'flow-move-d30-line-3',null,1,'flow-move-d30'),changed=M.updateTask(n,'flow-move-d30-line-3',{title:'새 견적 이름'});
  assert(M.raw(changed.documents[0]).includes('새 견적 이름'));assert.deepEqual(changed.progressRecords,n.progressRecords);
});
test('reference placement below another Task only moves its local line',()=>{
  const s=M.createState(),n=move(s,'d-move-line-9','d-move-line-3',1,'d-move');assert.deepEqual(n.flows,s.flows);
  assert.equal(meta(n,'d-move-line-9','d-move').progressTargetId,'flow-move-d30-line-3');assert.equal(meta(n,'d-move-line-9','d-move').isReference,true);
});
test('local children under references own independent metadata and dated progress',()=>{
  const s=M.createState(),raw=M.raw(s.documents[0]).replace('    - [ ] 이사업체 견적 비교','    - [ ] 이사업체 견적 비교\n      - [20] 로컬 하위\n        - 메모: 개인 메모\n        - 시간: 10:00'),n=M.editText(s,'d-move',raw);
  assert.notEqual(n,s);assert.deepEqual(n.flows,s.flows);const child=M.rowMeta(n,'d-move').find(r=>r.title==='로컬 하위');assert.equal(child.note,'개인 메모');assert.equal(child.time,'10:00');assert.equal(M.latestProgress(n,child.id).percent,20);assert.equal(M.tasks(n).length,M.tasks(s).length);
});
test('unlinking a reference unwraps its local child and preserves its previous date and progress',()=>{
  const s=M.createState(),raw=M.raw(s.documents[0]).replace('    - [ ] 이사업체 견적 비교','    - [ ] 이사업체 견적 비교\n      - [20] 로컬 하위'),n=M.editText(s,'d-move',raw),child=M.rowMeta(n,'d-move').find(r=>r.title==='로컬 하위'),u=M.unlink(n,'d-move','d-move-line-9');
  assert.notEqual(u,n);assert(M.validate(u));assert.deepEqual(u.flows,s.flows);assert.deepEqual(u.progressRecords,n.progressRecords);assert.equal(meta(u,child.id,'d-move').date,child.date);assert.equal(u.itemScopes[child.id],n.itemScopes[child.id]);
});
test('reference direct properties remain rejected separately from local child properties',()=>{
  const s=M.createState(),raw=M.raw(s.documents[0]);for(const attribute of ['메모: local','날짜: 2026-09-12','시간: 09:30'])assert.equal(M.editText(s,'d-move',raw.replace('    - [ ] 이사업체 견적 비교','    - [ ] 이사업체 견적 비교\n      - '+attribute)),s);
});
test('private Flow import works below a Task-mounted scope without copying source items',()=>{
  let s=M.addDocument(M.createState(),{title:'import'}),id=s.documents.at(-1).id;s=M.editText(s,id,'- [ ] Parent\n  - ');s=M.attachScope(s,id,1,'flow-move-d30');
  const line=M.getDocument(s,id).lines[1],n=M.importFlowTasks(s,id,line.id);assert.notEqual(n,s);assert(M.validate(n));assert.deepEqual(n.flows,s.flows);assert.equal(M.tasks(n).length,M.tasks(s).length);assert.equal(M.importFlowTasks(n,id,line.id),n);
});
test('folder links below a private Flow preserve actual catalog parent IDs',()=>{
  let s=M.createState();s=M.editText(s,'d-life',M.raw(M.getDocument(s,'d-life'))+'\n- \n  - ');const d=M.getDocument(s,'d-life');s=M.attachScope(s,'d-life',d.lines.length-2,'flow-move-d30');const n=M.attachScope(s,'d-life',d.lines.length-1,'folder-box');assert.notEqual(n,s);assert.deepEqual(n.folders,s.folders);
});
test('a repeated scope inside its own descendants is rejected even through a Task',()=>{
  let s=fixture('- ');s=M.attachScope(s,'d',0,'other');s=M.editText(s,'d',M.raw(s.documents[0])+'\n  - [ ] A\n    - ');assert.notEqual(s.bindings.length,0);assert.equal(M.attachScope(s,'d',2,'other'),s);
});
test('the same scope can be mounted repeatedly as siblings without a cycle',()=>{
  let s=fixture('- \n- ');s=M.attachScope(s,'d',0,'other');const n=M.attachScope(s,'d',1,'other');assert.notEqual(n,s);assert(M.validate(n));assert.equal(n.bindings.length,2);
});
test('a private Flow cannot be mounted inside its own source document',()=>{
  let s=M.createState();s=M.editText(s,'flow-move-d30',M.raw(s.flows[0])+'\n- ');assert.equal(M.attachScope(s,'flow-move-d30',M.getDocument(s,'flow-move-d30').lines.length-1,'flow-move-d30'),s);
});
test('linking a Task reference below its own canonical source is rejected',()=>{
  const s=fixture('- [ ] A\n  - ');assert.equal(M.linkTask(s,'d',1,'l0'),s);
});
test('moving a Task reference below its own canonical source is rejected',()=>{
  let s=fixture('- [ ] A\n- \n- [ ] B');s=M.linkTask(s,'d',1,'l0');assert.equal(M.moveSubtree(s,'d','l1','l2',1),s);assert(!M.moveTargets(s,'d','l1').some(t=>t.beforeLineId==='l2'&&t.depth===1));
});
test('moving a canonical source below a reference to itself is rejected',()=>{
  let s=fixture('- [ ] A\n- \n- [ ] B');s=M.linkTask(s,'d',1,'l0');assert.equal(M.moveSubtree(s,'d','l0','l2',1),s);assert(!M.moveTargets(s,'d','l0').some(t=>t.beforeLineId==='l2'&&t.depth===1));
});
test('mutual canonical-reference cycles are rejected rather than hidden by line-tree acyclicity',()=>{
  let s=fixture('- [ ] A\n  - \n- [ ] B\n  - ');s=M.linkTask(s,'d',1,'l2');assert.notEqual(s.bindings.length,0);assert.equal(M.linkTask(s,'d',3,'l0'),s);
  const bad=clone(s);bad.documents[0].lines[3].text='  - [ ] A';bad.bindings.push({kind:'task',docId:'d',lineId:'l3',taskId:'l0',dateMode:'keep'});assert.equal(M.validate(bad),false);
});
test('canonical cycles through an ordinary child are rejected',()=>{
  let s=fixture('- [ ] A\n  - [ ] child\n    - \n- [ ] B\n  - ');s=M.linkTask(s,'d',2,'l3');assert.notEqual(s.bindings.length,0);assert.equal(M.linkTask(s,'d',4,'l0'),s);
});
test('pure local hierarchy movement cannot target a selected descendant line',()=>{
  const s=fixture('- [ ] A\n  - [ ] child\n    - [ ] grandchild\n- [ ] B');for(const id of ['l0','l1','l2'])for(const depth of [0,1,2,3])assert.equal(M.moveSubtree(s,'d','l0',id,depth),s);
});
test('invalid destination depths and foreign document lines fail closed',()=>{
  const s=fixture('- [ ] A\n- [ ] B');for(const depth of [-1,33,1.5,'1',null,NaN,Infinity])assert.equal(M.moveSubtree(s,'d','l0',null,depth),s);assert.equal(M.moveSubtree(s,'d','l0','foreign',0),s);
});
test('depth omission preserves the old level and does not silently select a reparenting target',()=>{
  const s=fixture('- [ ] A\n- [ ] B');assert.equal(M.moveSubtree(s,'d','l1',null),s);assert.notEqual(M.moveSubtree(s,'d','l1',null,1),s);
});
test('target labels prioritize the actual new parent instead of duplicating a depth number',()=>{
  const s=fixture('- [ ] A\n- [ ] B\n- [ ] C'),t=M.moveTargets(s,'d','l0').find(t=>t.beforeLineId==='l2'&&t.depth===1);assert(t.label.startsWith('B 아래'));assert(!t.label.includes('깊이'));assert(M.moveTargets(s,'d','l0').some(t=>t.depth===0&&t.label.startsWith('최상위')));
});
test('fenced code content bytes survive whole-subtree indentation changes',()=>{
  const s=fixture('- [ ] A\n  ~~~js\nconst x = 1;\n  - [ ] code\n  ~~~\n- [ ] B'),n=move(s,'l0',null,1);
  for(const id of ['l2','l3'])assert.equal(M.getDocument(n,'d').lines.find(l=>l.id===id).text,M.getDocument(s,'d').lines.find(l=>l.id===id).text);assert.equal(M.tasks(n).length,2);
});
test('code rows and destinations inside an open fence remain protected',()=>{
  const s=fixture('- [ ] A\n~~~\n- [ ] not a task');assert.equal(M.selectionForMove(s,'d','l2'),null);assert.equal(M.moveSubtree(s,'d','l0',null,0),s);
});
test('all 32 structural levels are valid and a direct property can occupy level 33',()=>{
  const s=fixture(Array.from({length:33},(_,i)=>'  '.repeat(i)+'- [ ] item '+i).join('\n')),n=M.updateTask(s,'l32',{date:'2026-09-12',note:'deep',time:'12:30'});
  assert.notEqual(n,s);assert(M.validate(n));assert.equal(meta(n,'l32').date,'2026-09-12');assert.equal(meta(n,'l32').note,'deep');assert(M.rowMeta(n,'d').some(r=>r.kind==='property'&&r.depth===33));
});
test('the resource cap rejects structural level 33 but permits promoting a deep subtree',()=>{
  const s=fixture(Array.from({length:33},(_,i)=>'  '.repeat(i)+'- [ ] item '+i).join('\n'));
  assert.equal(M.editText(s,'d',M.raw(s.documents[0])+'\n'+'  '.repeat(33)+'- [ ] over'),s);const n=move(s,'l31',null,0);assert.equal(meta(n,'l31').depth,0);assert.equal(meta(n,'l32').depth,1);
});
for(const [name,line,expected] of [['date','날짜: 2026-09-10','2026-09-10'],['time','시간: 09:30','09:30'],['memo','메모: 보존할 메모','첫 메모\n보존할 메모']])test('property-only Tab cannot orphan an existing '+name,()=>{
  const s=fixture('[2026-09-07]\n- [ ] A\n  - 메모: 첫 메모\n  - '+line),n=M.editText(s,'d',M.raw(s.documents[0]).replace('  - '+line,'    - '+line));assert.equal(n,s);
  assert.equal(M.tasks(s)[0][name==='memo'?'note':name],expected);
});
test('property-only outdent cannot turn an owned value into an unowned ordinary note',()=>{
  const s=fixture('- [ ] A\n  - 메모: keep');assert.equal(M.editText(s,'d','- [ ] A\n- 메모: keep'),s);
});
test('explicit property content edits and deletion remain supported after the indent guard',()=>{
  const s=fixture('- [ ] A\n  - 메모: keep'),n=M.editText(s,'d','- [ ] A\n  - 메모: changed');assert.notEqual(n,s);assert.equal(M.tasks(n)[0].note,'changed');assert.notEqual(M.editText(n,'d','- [ ] A'),n);
});
test('an entire Task with owned properties may indent as one atomic transaction',()=>{
  const s=fixture('- [ ] A\n- [ ] B\n  - 날짜: 2026-09-12\n  - 메모: keep\n  - 시간: 10:00'),n=M.editText(s,'d','- [ ] A\n  - [ ] B\n    - 날짜: 2026-09-12\n    - 메모: keep\n    - 시간: 10:00');preserve(s,n);
});
test('recorded promoted items retain deletion and completion-conflict guards',()=>{
  let s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] child');s=M.recordProgress(s,'l2','2026-09-07',20);s=move(s,'l2',null,0);
  assert.equal(M.removeTask(s,'l2'),s);assert.equal(M.updateTask(s,'l2',{done:true}),s);assert.equal(M.editText(s,'d',M.raw(s.documents[0]).replace('- [ ] child','- [x] child')),s);
});
test('new progress after reparenting uses the item own pinned date and no parent aggregation',()=>{
  const s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] child\n[2026-09-12]\n- [ ] B'),n=move(s,'l2',null,1),r=M.editText(n,'d',M.raw(n.documents[0]).replace('- [ ] child','- [20] child'),{progressDate:'2026-10-01'});
  assert.notEqual(r,n);assert.deepEqual(M.progressHistory(r,'l2'),[{date:'2026-09-07',percent:20}]);assert.equal(meta(r,'l4').done,false);
});
test('Undo Redo and a storage roundtrip preserve both hierarchy and planning registries exactly',()=>{
  let s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] child\n- [ ] B');s=M.recordProgress(s,'l2','2026-09-07',20);const p=move(s,'l2',null,0),n=move(p,'l2','l3',1),store=memory({'flow:operating':'sentinel'});
  for(const value of [s,p,n,p,s]){const restored=clone(value);assert(M.validate(restored));const expected=store.getItem(M.KEY),saved=M.write(store,restored,expected);assert(saved.ok);assert.deepEqual(M.read(store).state,restored);}assert.equal(store.data.get('flow:operating'),'sentinel');
});
test('quota conflict and lost write errors do not mutate a structural transaction snapshot',()=>{
  const s=fixture('- [ ] A\n  - [ ] child\n- [ ] B'),n=move(s,'l1',null,0),snapshot=clone(n),store=memory({[M.KEY]:'newer'});
  assert.equal(M.write(store,n,null).reason,'conflict');assert.equal(store.getItem(M.KEY),'newer');assert.equal(M.write({getItem:()=>null,setItem(){throw Error('quota')}},n,null).ok,false);assert.deepEqual(n,snapshot);
});
for(const [label,text] of [
  ['mixed dates','[2026-09-07]\n- [ ] A\n  - [ ] a\n    - [ ] aa\n  - 메모: keep\n[2026-09-10]\n- [ ] B\n  - 시간: 10:00\n  - [ ] b'],
  ['duplicate titles','- [ ] same\n  - [ ] same\n  - [ ] same\n- [ ] same'],
  ['notes and code','- [ ] A\n  ordinary\n    child note\n  ~~~\ncode\n  ~~~\n- [ ] B'],
  ['own child dates','[2026-09-07]\n- [ ] A\n  - [ ] a\n    - 날짜: 미정\n    - 메모: keep\n[2026-09-12]\n- [ ] B']
])test('every advertised boundary-depth destination commits and preserves values: '+label,()=>{
  const s=fixture(text);let advertised=0;for(const row of M.rowMeta(s,'d'))for(const t of M.moveTargets(s,'d',row.id)){const n=M.moveSubtree(s,'d',row.id,t.beforeLineId,t.depth);preserve(s,n);advertised++;}assert(advertised>5);
});
test('every advertised seed scope reference canonical and child destination commits',()=>{
  const s=M.createState();let total=0;for(const d of s.documents.concat(s.flows))for(const row of M.rowMeta(s,d.id))for(const t of M.moveTargets(s,d.id,row.id)){preserve(s,M.moveSubtree(s,d.id,row.id,t.beforeLineId,t.depth));total++;}assert(total>=176);console.log('  verified '+total+' seed destinations');
});
test('an empty subcheck scaffold accepts an existing canonical reference with keep-date semantics',()=>{
  let s=fixture('[2026-09-07]\n- [ ] parent\n  - [ ] existing child\n  - [ ] \n- [ ] target\n  - 날짜: 2026-09-08');
  s=M.editText(s,'d',M.raw(s.documents[0]).replace('- [ ] target','- [20] target'));
  const records=clone(s.progressRecords),n=M.linkTask(s,'d',3,'l4',{dateMode:'keep',date:'2026-09-07'});
  assert.notEqual(n,s);assert(M.validate(n));assert.equal(M.tasks(n).length,M.tasks(s).length);assert.equal(meta(n,'l3').progressTargetId,'l4');assert.equal(meta(n,'l3').date,'2026-09-08');assert.equal(meta(n,'l3').isReference,true);assert.deepEqual(n.progressRecords,records);
});
test('an existing titled subcheck is never overwritten by the empty-scaffold link capability',()=>{
  const s=fixture('- [ ] parent\n  - [ ] keep this child\n- [ ] target');assert.equal(M.linkTask(s,'d',1,'l2'),s);
});
test('temporarily clearing a nested canonical title retains planning identity across reload and retyping',()=>{
  const s=fixture('- [ ] A\n- [ ] B'),nested=move(s,'l1',null,1),empty=M.editText(nested,'d','- [ ] A\n  - [ ] ');
  assert.notEqual(empty,nested);assert(M.validate(empty));assert.equal(empty.taskScopes.l1,'f');assert.equal(empty.itemScopes.l1,'f');assert.equal(M.tasks(empty).length,1);
  const restored=M.editText(clone(empty),'d','- [ ] A\n  - [ ] renamed');assert(M.validate(restored));assert.equal(M.tasks(restored).length,2);assert.equal(meta(restored,'l1').isCanonical,true);assert.equal(meta(restored,'l1').taskId,'l1');
});
test('an unplanned child retains its original owner during an empty-title edit after reparenting',()=>{
  let s=fixture('- [ ] A\n  - [ ] child\n- [ ] B');s.taskScopes.l2='other';s.itemScopes.l2='other';assert(M.validate(s));const n=move(s,'l1',null,1);
  const empty=M.editText(n,'d',M.raw(n.documents[0]).replace('- [ ] child','- [ ] '));assert.notEqual(empty,n);assert.equal(empty.itemScopes.l1,'f');assert(!empty.taskScopes.l1);
  const restored=M.editText(empty,'d',M.raw(empty.documents[0]).replace('  - [ ] ','  - [ ] renamed'));assert.notEqual(restored,empty);assert.equal(restored.itemScopes.l1,'f');assert(!restored.taskScopes.l1);
});
for(const fence of ['~~~','```'])test('wrapping existing checkbox identities in '+fence+' cannot silently declassify them',()=>{
  const s=fixture('- [ ] A\n  - [ ] child');assert.equal(M.editText(s,'d',fence+'\n'+M.raw(s.documents[0])+'\n'+fence),s);
  const fresh=fixture(''),code=M.editText(fresh,'d',fence+'\n- [ ] literal code\n'+fence);assert.notEqual(code,fresh);assert.equal(M.tasks(code).length,0);
});
test('dormant identity support does not allow a recorded item to lose its title or history',()=>{
  let s=fixture('[2026-09-07]\n- [ ] A\n  - [ ] child');s=M.recordProgress(s,'l2','2026-09-07',20);
  assert.equal(M.editText(s,'d',M.raw(s.documents[0]).replace('- [ ] child','- [ ] ')),s);assert.deepEqual(M.progressHistory(s,'l2'),[{date:'2026-09-07',percent:20}]);
});
test('dormant registry owners and role pairs remain strictly validated',()=>{
  const s=fixture('- [ ] A\n- [ ] B'),nested=move(s,'l1',null,1),empty=M.editText(nested,'d','- [ ] A\n  - [ ] ');
  for(const mutate of [n=>n.itemScopes.l1='missing',n=>n.taskScopes.l1='other',n=>delete n.itemScopes.l1]) {const n=clone(empty);mutate(n);assert.equal(M.validate(n),false);assert.equal(M.read(memory({[M.KEY]:JSON.stringify(n)})).ok,false);}
});
console.log('\n'+count+'/'+count+' v11 movement checks passed.');
