'use strict';
// Actual function bodies + genuine M/C/S/PD/entry packets in a VM. DOM/history
// effects are deterministic doubles: these are not browser/native-Undo tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const M = require('./model.js'), C = require('./workspace-checkpoint.js'), S = require('./workspace-storage.js');
const PD = require('./personal-plan-display.js'), Read = require('./personal-entry-read.js');
const appFile = process.env.FLOWME_DETAIL_VISIT_APP_SOURCE || path.join(__dirname, 'app.js');
const uiFile = process.env.FLOWME_DETAIL_VISIT_UI_SOURCE || path.join(__dirname, 'personal-entry-ui.js');
const source = fs.readFileSync(appFile, 'utf8'), uiSource = fs.readFileSync(uiFile, 'utf8');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const audits = [];
function functions(text, names) {
  const ast = ts.createSourceFile('actual.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const found = new Map();
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) { assert.equal(found.has(node.name.text), false); found.set(node.name.text, node.getText(ast)); }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return names.map(name => { assert.ok(found.has(name), 'required implemented API: ' + name); return found.get(name); }).join('\n');
}
class Node {
  constructor(name) { this.name = name; this.isConnected = true; this.hidden = false; this.inert = false; this.children = []; this.parent = null; this.dataset = {}; this.attrs = {}; this.scrollLeft = 0; this.scrollTop = 0; this.value = ''; this.htmlWrites = 0; }
  append(child) { this.children.push(child); child.parent = this; }
  contains(node) { return node === this || this.children.some(child => child.contains(node)); }
  closest(selector) {
    if (selector === '[hidden], [inert]') return this.hidden || this.inert ? this : this.parent?.closest(selector) || null;
    return null;
  }
  matches(selector) { return selector.split(',').map(x => x.trim()).includes(this.name); }
  querySelectorAll(selector) { return this.children.flatMap(child => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  focus() { this.focused = (this.focused || 0) + 1; }
  setAttribute(k, v) { this.attrs[k] = v; }
  removeAttribute(k) { delete this.attrs[k]; }
  replaceChildren() { this.children = []; this.htmlWrites++; }
}
const appNames = ['beginPersonalEntryVisit', 'endPersonalEntryVisit', 'beforePersonalEntryVisitReturn', 'personalEntryVisitOwnsTarget',
  'resumeRetainedAuthoringObservation', 'visibleContentNodes', 'focusAfterRender', 'readPersonalEntry', 'readCurrentPersonalSource', 'storageActionsLocked', 'handleEditorHistory'];
function setup() {
  const checkpoint = C.fromLegacy(null); assert.equal(checkpoint.ok, true);
  const map = new Map([['flow:operating:entry-visit', ' \r\n운영 원문 🙂\t']]);
  const mutations = [], reads = [];
  const storage = { getItem(key) { reads.push(key); return map.get(key) ?? null; }, setItem(key, value) { mutations.push(['setItem', key]); map.set(key, value); }, removeItem(key) { mutations.push(['removeItem', key]); map.delete(key); }, clear() { assert.fail('clear forbidden'); } };
  const original = new Node('#content'), editor = new Node('#flow-editor'), frame = new Node('#flow-editor-frame');
  original.append(frame); frame.append(editor); original.hidden = true; original.inert = true; editor.value = '  A\n그대로  '; editor.selectionStart = 3; editor.selectionEnd = 6;
  const current = new Node('visit'), heading = new Node('.detail-header h1'); current.append(heading);
  const root = new Node('document'); root.append(original); root.append(current);
  const dialog = new Node('#dialog'); dialog.open = false;
  const elements = { content: original, dialog, sidebar: new Node('sidebar'), movePanel: new Node('move'), undo: new Node('undo'), compactUndo: new Node('compact'), toast: new Node('toast') };
  const events = [], pending = [];
  const box = { M, C, S, PD, storage, envelope: checkpoint.checkpoint, workspacePacket: S.loadWorkspace(storage), workspaceEpoch: 0, personalPlanSourceEpoch: 0,
    workspaceTransactionPending: false, workspaceRecoveryGate: null, editorRecoveryGate: null, editorHistoryConsuming: false,
    editorHistoryRestore: null, EDITOR_HISTORY_KEY: 'editor-key', personalEntryVisit: null, personalDisplayBlocked: false,
    screen: { type: 'authoring' }, resultView: 'calendar', resultOccurrencePage: 3, resultCalendarBaseDate: '2026-10-01', resultCalendarSelectedDate: '2026-10-13',
    authoringEditorResizeObserver: { disconnect() { events.push('disconnect'); } }, activeSession: null, sourceUpdateSession: null,
    dragged: null, pointerOrigin: null, longPressTimer: null, moveOpen: false, elements, HTMLElement: Node,
    history: { state: {}, pushState(value) { this.state = value; } },
    document: { querySelectorAll: selector => root.querySelectorAll(selector) },
    window: { FlowPocPersonalEntryRead: Read, setTimeout(cb) { pending.push(cb); }, clearTimeout() {} },
    interruptContextualResult() {}, dismissPlanSaveResult() {}, pendingRetry: null, showToast: { timer: null },
    ResizeObserver: class { constructor(cb) { this.cb = cb; } observe(node) { events.push(['observe', node]); } },
    positionAuthoringContextAnchor() {}, copyScreen: clone, activeEditorSession: () => box.activeSession,
    authoringPropertyIsRecovering: () => false, movePanelOpen: () => box.moveOpen, recoveredDraftDiscardDialogOpen: () => false,
    render() { events.push(['render', box.elements.content]); }, renderSidebar() { events.push('sidebar'); }, syncWorkspaceSaveStatus() {},
    scheduleFocusedControlVisibility(node) { events.push(['scroll', node]); },
    requestEditorClose(reason, fromHistory) { events.push(['editor-close', reason, fromHistory]); },
    closeDialog() { events.push('dialog-close'); box.elements.dialog.open = false; }, closeSourceUpdateReview() { events.push('source-close'); box.sourceUpdateSession = null; },
    cancelActiveMoveInteraction() { events.push('move-cancel'); box.dragged = null; box.pointerOrigin = null; box.longPressTimer = null; },
    closeMovePanel() { events.push('move-close'); box.moveOpen = false; }, closeItemDetail() { events.push('item-close'); box.screen.type = 'workspace'; },
    syncEditorUI() { events.push('sync-editor'); }, renderPlanSaveResult() { events.push('result'); }, pushEditorHistory(s) { events.push('editor-history'); box.history.state = { 'editor-key': { sessionId: s.sessionId } }; },
    personalEntry: { active: () => true, visitActive: () => Boolean(box.personalEntryVisit), readHostActive: () => !box.personalEntryVisit },
  };
  vm.createContext(box); vm.runInContext(functions(source, appNames), box);
  const read = box.readPersonalEntry(); assert.equal(read.ok, true);
  const picked = read.catalog.copies[0], token = Object.freeze({});
  const begin = (copy = picked, binding = read.binding) => box.beginPersonalEntryVisit(copy, current, token, binding);
  audits.push({ map, mutations, reads, original, editor });
  return { box, events, pending, begin, read, picked, token, current, original, frame, editor, heading, map, mutations };
}
test('DVU01 genuine four-origin exact copy opens real renderer host without replacing A or writing', () => {
  const x = setup(); assert.equal(new Set(x.read.catalog.copies.map(c => c.origin)).size, 4);
  for (const copy of x.read.catalog.copies) {
    assert.equal(x.begin(copy), true); assert.equal(x.box.screen.selectedFlowId, copy.localFlowId);
    assert.equal(x.box.elements.content, x.current); assert.equal(x.events.find(e => Array.isArray(e) && e[0] === 'render')[1], x.current);
    assert.equal(x.box.endPersonalEntryVisit(x.token), true); assert.equal(x.box.elements.content, x.original);
  }
  assert.equal(x.original.htmlWrites, 0); assert.equal(x.editor.isConnected, true); assert.equal(x.editor.value, '  A\n그대로  '); assert.deepEqual(x.mutations, []);
});
test('DVU02 cross-copy local ID, tuple, foreign ref and stale binding never become a visit', () => {
  const x = setup(), other = x.read.catalog.copies[1];
  for (const patch of [{ localFlowId: other.localFlowId }, { savedCopyId: other.savedCopyId + '-foreign' }, { flowId: 'foreign' }, { flowRef: other.flowRef }]) assert.equal(x.begin({ ...x.picked, ...patch }), false);
  assert.equal(x.begin(x.picked, 'foreign-binding'), false); assert.equal(x.box.personalEntryVisit, null); assert.equal(x.box.elements.content, x.original);
});
test('DVU03 current target read failure or external change between selection and visit is not freshly rebased', () => {
  const x = setup(); x.map.set(S.STORAGE_KEY, '{}'); assert.equal(x.begin(), false);
  x.map.delete(S.STORAGE_KEY); x.box.workspaceEpoch++; assert.equal(x.begin(), false); assert.deepEqual(x.mutations, []);
});
test('DVU04 readonly session stays active; only actual visit releases entry lock and existing writer gates remain', () => {
  const x = setup(); assert.equal(x.box.storageActionsLocked(), true); assert.equal(x.begin(), true); assert.equal(x.box.personalEntry.active(), true); assert.equal(x.box.storageActionsLocked(), false);
  for (const key of ['workspaceTransactionPending', 'workspaceRecoveryGate', 'editorRecoveryGate', 'editorHistoryConsuming', 'personalDisplayBlocked']) { x.box[key] = true; assert.equal(x.box.storageActionsLocked(), true, key); x.box[key] = false; }
  x.box.activeSession = { status: 'dirty' }; assert.equal(x.box.storageActionsLocked(), true);
});
test('DVU05 end requires same opaque owner and preserves A, screen and exact result presentation without render', () => {
  const x = setup(); const before = JSON.stringify([x.box.screen,x.box.resultView,x.box.resultOccurrencePage,x.box.resultCalendarBaseDate,x.box.resultCalendarSelectedDate]);
  x.begin(); assert.equal(x.box.endPersonalEntryVisit({}), false); const n = x.events.length;
  assert.equal(x.box.endPersonalEntryVisit(x.token), true); assert.equal(x.box.endPersonalEntryVisit(x.token), false);
  assert.equal(JSON.stringify([x.box.screen,x.box.resultView,x.box.resultOccurrencePage,x.box.resultCalendarBaseDate,x.box.resultCalendarSelectedDate]), before);
  assert.equal(x.events.slice(n).some(e => Array.isArray(e) && e[0] === 'render'), false); assert.equal(x.editor.selectionStart, 3); assert.equal(x.editor.selectionEnd, 6);
});
test('DVU06 pending/recovery/history lock outranks dirty close, dialog, move and visit return', () => {
  const x = setup(); x.begin(); x.box.activeSession = { status: 'dirty' }; x.box.elements.dialog.open = true; x.box.moveOpen = true;
  for (const key of ['workspaceTransactionPending','workspaceRecoveryGate','editorRecoveryGate','editorHistoryConsuming']) {
    x.box[key] = true; const n=x.events.length; assert.equal(x.box.beforePersonalEntryVisitReturn('button',false),false); assert.equal(x.events.length,n); assert.equal(x.box.endPersonalEntryVisit(x.token),false); x.box[key]=false;
  }
  assert.equal(x.box.beforePersonalEntryVisitReturn('button',false),false); assert.deepEqual(x.events.at(-1),['editor-close','cancel',false]);
  x.box.activeSession=null; assert.equal(x.box.beforePersonalEntryVisitReturn('button',false),false); assert.equal(x.events.at(-1),'dialog-close');
  x.box.sourceUpdateSession={}; assert.equal(x.box.beforePersonalEntryVisitReturn('escape',false),false); assert.equal(x.events.at(-1),'source-close');
  assert.equal(x.box.beforePersonalEntryVisitReturn('escape',false),false); assert.equal(x.events.at(-1),'move-close');
  assert.equal(x.box.beforePersonalEntryVisitReturn('button',false),true);
});
test('DVU07 one editor Back is consumed before visit even when clean close removes the editor', () => {
  const x=setup(); x.begin(); x.box.activeSession={sessionId:'child',status:'clean'};
  x.box.requestEditorClose=(reason,fromHistory)=>{ x.events.push([reason,fromHistory]); x.box.activeSession=null; };
  assert.equal(x.box.handleEditorHistory(),true); assert.deepEqual(x.events.at(-1),['browser-back',true]); assert.ok(x.box.personalEntryVisit);
  assert.equal(x.box.handleEditorHistory(),false); x.box.editorHistoryConsuming=true; assert.equal(x.box.handleEditorHistory(),true); assert.equal(x.box.editorHistoryConsuming,false);
});
test('DVU08 visible selector and delayed focus cannot select retained hidden A or a superseded visit', () => {
  const x=setup(); x.begin(); const duplicate=new Node('.detail-header h1'); x.original.append(duplicate);
  assert.equal(x.box.visibleContentNodes('.detail-header h1')[0],x.heading); assert.equal(x.box.visibleContentNodes('#content')[0],x.current);
  x.box.endPersonalEntryVisit(x.token); x.pending.splice(0).forEach(cb=>cb()); assert.equal(x.heading.focused,undefined); assert.equal(duplicate.focused,undefined);
});
test('DVU09 reobserve the same retained frame after unhide; do not mount or reset the textarea', () => {
  const x=setup(); x.begin(); x.box.endPersonalEntryVisit(x.token); x.box.resumeRetainedAuthoringObservation();
  assert.equal(x.events.some(e=>Array.isArray(e)&&e[0]==='observe'),false);
  x.original.hidden=false; x.original.inert=false; x.box.resumeRetainedAuthoringObservation(); x.box.resumeRetainedAuthoringObservation();
  const observed=x.events.filter(e=>Array.isArray(e)&&e[0]==='observe'); assert.equal(observed.length,1); assert.equal(observed[0][1],x.frame); assert.equal(x.original.htmlWrites,0);
});
test('DVU10 only connected visible visit/dialog/move targets reach existing actions', () => {
  const x=setup(); x.begin(); const button=new Node('button'); x.current.append(button);
  assert.equal(x.box.personalEntryVisitOwnsTarget(button),true); assert.equal(x.box.personalEntryVisitOwnsTarget(x.editor),false);
  button.hidden=true; assert.equal(x.box.personalEntryVisitOwnsTarget(button),false); button.hidden=false; button.isConnected=false; assert.equal(x.box.personalEntryVisitOwnsTarget(button),false);
  const dialogButton=new Node('button'); x.box.elements.dialog.append(dialogButton); assert.equal(x.box.personalEntryVisitOwnsTarget(dialogButton),false); x.box.elements.dialog.open=true; assert.equal(x.box.personalEntryVisitOwnsTarget(dialogButton),true);
});

function controller() {
  const renders=[], scopes=[], histories=[];
  const host=new Node('read'), visitHost=new Node('visit'), visitContent=new Node('content'), original=new Node('A'); visitHost.append(visitContent);
  const initial={binding:'A',catalog:{copies:[{flowRef:'saved-flow:copy:source',localFlowId:'local'}]}};
  const token=Object.freeze({}); const visit={id:17,token,returning:false,marked:true,destination:'preview'};
  const session={read:initial,selectedRef:initial.catalog.copies[0].flowRef,openItemId:'item',owner:'source',view:'calendar',stage:'preview',previewReturn:{x:3,y:14},visit,
    retained:{topbar:new Node('topbar'),feedback:new Node('feedback')},authorAttempt:null,invalid:null};
  const box={session,host,visitHost,visitContent,intent:0,generation:0,historySequence:17,HISTORY_KEY:'entry',VISIT_HISTORY_KEY:'visit',
    deps:{content:original,sidebar:new Node('sidebar'),read:()=>({ok:true,binding:'A'}),endVisit:t=>{scopes.push(t);return t===token;},beforeVisitReturn:()=>true,visitOwnsTarget:()=>false},
    document:{getElementById:()=>({dataset:{}})},location:{href:'http://fixture.local/'},
    history:{state:{entry:{id:1},visit:{id:17}},back(){histories.push('back');},pushState(value){histories.push(clone(value));this.state=value;}},
    render(){renders.push('render');},focus(){},close(){renders.push('close');},
  };
  vm.createContext(box); vm.runInContext(functions(uiSource,['invalidate','assertCurrent','finishVisitReturn','requestVisitReturn','markVisitHistory','visitEventAllowed']),box);
  return {box,visit,initial,renders,scopes,histories,host,visitHost,original};
}
test('DVU11 observed drift retires preview only: never paint over live editor/recovery',()=>{
  const x=controller(); x.box.invalidate('changed'); assert.equal(x.box.session.read,null); assert.equal(x.box.session.selectedRef,null); assert.equal(x.box.session.visit,x.visit); assert.deepEqual(x.renders,[]);
  x.box.deps.read=()=>({ok:true,binding:'A'}); assert.equal(x.box.assertCurrent(),false); assert.equal(x.box.session.read,null);
});
test('DVU12 changed/current-read-failed return has no old packet; same binding preserves exact presentation',()=>{
  for(const status of ['same','changed','read-error']){
    const x=controller(); x.box.deps.read=()=>status==='read-error'?{ok:false}:{ok:true,binding:status==='same'?'A':'B'};
    assert.equal(x.box.finishVisitReturn(x.visit),true); assert.equal(x.scopes[0],x.visit.token); assert.equal(x.box.session.visit,null);
    if(status==='same'){assert.equal(x.box.session.read,x.initial);assert.equal(x.box.session.owner,'source');assert.equal(x.box.session.view,'calendar');assert.equal(x.box.session.openItemId,'item');}
    else {assert.equal(x.box.session.read,null);assert.equal(x.box.session.selectedRef,null);assert.ok(x.box.session.invalid);}
  }
});
test('DVU13 explicit return consumes only own visit marker then defers host swap to actual popstate',()=>{
  const x=controller(); assert.equal(x.box.requestVisitReturn('button',false),false);assert.equal(x.visit.returning,true);assert.deepEqual(x.histories,['back']);assert.deepEqual(x.scopes,[]);
  assert.equal(x.box.requestVisitReturn('button',false),false);assert.equal(x.histories.length,1);
});
test('DVU14 blocked Back preserves visit without replacing editor history or ending host',()=>{
  const x=controller();x.box.deps.beforeVisitReturn=()=>false;x.box.history.state={entry:{id:1}};
  assert.equal(x.box.requestVisitReturn('browser-back',true),false);assert.equal(x.histories.length,1);assert.equal(x.histories[0].visit.id,17);assert.deepEqual(x.histories[0].entry,{id:1});assert.equal(x.scopes.length,0);
  x.box.history.state={entry:{id:1},visit:{id:17},editor:{id:'own-child'}};
  x.box.requestVisitReturn('browser-back',true);assert.equal(x.histories.length,1);
});
test('DVU15 stale hidden entry/A and pending-return synthetic events do not reach real writers',()=>{
  const x=controller(), visible=new Node('button'), old=new Node('button'); x.visitHost.append(visible);x.original.append(old);
  assert.equal(x.box.visitEventAllowed({target:visible}),true);assert.equal(x.box.visitEventAllowed({target:old}),false);
  visible.hidden=true;assert.equal(x.box.visitEventAllowed({target:visible}),false);visible.hidden=false;x.visit.returning=true;assert.equal(x.box.visitEventAllowed({target:visible}),false);
});
test('DVU16 actual storage observer retires return and still reaches source editor and both Undo owners during visit',()=>{
  const ast=ts.createSourceFile('app.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);let listener;
  function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='window.addEventListener'&&node.arguments[0]?.text==='storage')listener=node.arguments[1].getText(ast);ts.forEachChild(node,visit);}visit(ast);assert.ok(listener);
  const events=[],storage={},box={storage,M,S,workspaceEpoch:0,personalPlanSourceEpoch:0,personalEntry:{active:()=>true,visitActive:()=>true,invalidate:()=>events.push('retire')},
    isSourceEditor:()=>true,activeEditorSession:()=>({}),editorRecoveryGate:null,workspaceRecoveryGate:null,personalEditorMessage:x=>x,syncEditorUI:()=>events.push('editor'),interruptContextualResult:()=>events.push('contextual'),dismissPlanSaveResult:()=>events.push('plan')};
  vm.createContext(box);const run=vm.runInContext('('+listener+')',box);
  run({storageArea:storage,key:M.SOURCE_CANDIDATE_STORAGE_KEY});assert.deepEqual(events,['retire','editor']);events.length=0;
  run({storageArea:storage,key:S.STORAGE_KEY});assert.deepEqual(events,['retire','contextual','plan']);assert.equal(box.workspaceEpoch,2);
  events.length=0;run({storageArea:storage,key:null});assert.deepEqual(events,['retire','editor','contextual','plan']);
});
test('DVU17 Escape closes only a genuine recovered-draft discard confirmation before recovery guards',()=>{
  const x=setup(); x.begin();
  vm.runInContext(functions(source,['recoveredDraftDiscardDialogOpen']),x.box);
  const visit=x.box.personalEntryVisit, recovery={status:'source-reopen'}, recovered={localFlowId:x.picked.localFlowId};
  x.box.editorRecoveryGate=recovery; x.box.recoveredSourceEditor=recovered;
  x.box.elements.dialog.append(new Node('[data-action="editor-discard-recovered-confirm"]'));
  for(const locked of [null,'workspaceTransactionPending','workspaceRecoveryGate','editorHistoryConsuming']){
    x.box.elements.dialog.open=true; if(locked)x.box[locked]=true;
    assert.equal(x.box.recoveredDraftDiscardDialogOpen(),true);
    const n=x.events.length;
    assert.equal(x.box.beforePersonalEntryVisitReturn('escape',false),false);
    assert.deepEqual(x.events.slice(n),['dialog-close']);
    assert.equal(x.box.elements.dialog.open,false);
    assert.equal(x.box.personalEntryVisit,visit); assert.equal(x.box.elements.content,x.current);
    assert.equal(x.box.editorRecoveryGate,recovery); assert.equal(x.box.recoveredSourceEditor,recovered);
    assert.equal(x.box.endPersonalEntryVisit(x.token),false);
    if(locked)x.box[locked]=false;
  }
  x.box.elements.dialog.open=true;
  const n=x.events.length;
  assert.equal(x.box.beforePersonalEntryVisitReturn('button',false),false);
  assert.equal(x.box.beforePersonalEntryVisitReturn('browser-back',true),false);
  assert.equal(x.box.elements.dialog.open,true); assert.equal(x.events.length,n);
  x.box.elements.dialog.children=[];
  assert.equal(x.box.recoveredDraftDiscardDialogOpen(),false);
  assert.equal(x.box.beforePersonalEntryVisitReturn('escape',false),false);
  assert.equal(x.box.elements.dialog.open,true); assert.equal(x.events.length,n);
  x.box.personalEntryVisit=null;
  assert.equal(x.box.beforePersonalEntryVisitReturn('escape',false),false); assert.equal(x.events.length,n);
  assert.deepEqual(x.mutations,[]);
});
test.after(()=>{
  for(const x of audits){assert.equal(x.map.get('flow:operating:entry-visit'),' \r\n운영 원문 🙂\t');assert.deepEqual(x.mutations,[]);assert.equal(x.editor.value,'  A\n그대로  ');assert.equal(x.original.htmlWrites,0);}
  assert.equal(fs.readFileSync(appFile,'utf8'),source);assert.equal(fs.readFileSync(uiFile,'utf8'),uiSource);
  console.log('DETAIL_VISIT_VM_BOUNDARY '+JSON.stringify({appSha:sha(source),uiSha:sha(uiSource),genuineReadFixtures:audits.length,mutationAPI:0,operatingMismatch:0,clear:0,scope:'actual functions with deterministic DOM/history effects; not browser/native Undo'}));
});
