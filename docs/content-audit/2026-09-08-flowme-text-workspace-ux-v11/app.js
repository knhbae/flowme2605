(function () {
  'use strict';
  const M = window.TextWorkspaceModel, $ = s => document.querySelector(s);
  const copy = value => JSON.parse(JSON.stringify(value));
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const TODAY = '2026-09-07';
  let storage;
  try { storage = localStorage; } catch (_) { storage = null; }
  const loaded = M.read(storage);
  let state = loaded.ok ? loaded.state : M.createState(), expected = loaded.serialized;
  let blocked = !loaded.ok, failure = loaded.ok ? '' : '저장된 자료를 읽지 못했습니다. 기존 저장본을 덮어쓰지 않습니다.';
  let dirty = false, invalidDraft = false, timer, failNext = false, toastTimer, editor, textMode = false, dialogReturn;
  let view = 'document', currentId = state.documents[0].id, anchor = TODAY, folder = '';
  let past = [], future = [], lastChange = '', lastChangeAt = 0, helperLine = 0;
  let composerDate = null, composerOpen = false, composerDoc = 'd-life';
  let composerDrafts = {}, picker = null, search = '', hideCompleted = false, inlinePicker = false;
  let moveSelection=null,quickProgress=null,dialogSequence=0;
  const historyMoveFocus=new WeakMap();
  function draftKey(){return composerDoc+'|'+(composerDate||'undated');}
  const icon = name => '<svg viewBox="0 0 24 24" aria-hidden="true">' + ({folder:'<path d="M3 6h7l2 3h9v12H3zM3 6V3h7l2 3"/>',check:'<path d="m4 12 5 5L20 6"/>',flow:'<circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="m7 11 10-5M7 13l10 5"/>',link:'<path d="m10 14 4-4m-6 7-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1"/>',doc:'<path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/>'}[name]||'') + '</svg>';
  function documents() { return state.documents.concat(state.flows || []); }
  function doc() { return M.getDocument(state,currentId) || state.documents[0]; }
  function scope(id) { return M.scopes(state).find(s=>s.id===id); }
  function folderLabel(id) { const s=scope(id);return s?s.title:(id||'모든 폴더'); }
  function rowMeta() { return M.rowMeta(state,currentId); }
  function editorMeta() {
    const result={}; rowMeta().forEach(r=>{
      const t=r.taskId?task(r.taskId):null,s=r.scopeId?scope(r.scopeId):null;
      const base={id:r.id,kind:r.kind,isCanonical:!!r.isCanonical,depth:r.depth||0,guideLevels:r.guideLevels||[],subtreeEndIndex:r.subtreeEndIndex,label:r.kind==='subcheck'?r.title:(t?t.title:r.text),scopeMismatch:(r.kind==='task'||r.isCanonical)&&r.scopeMismatch&&t?scopePath(scope(t.scopeId)):''};
      const progressId=r.progressTargetId||(r.kind==='subcheck'?r.id:t&&t.id),progress=progressId?progressOf(progressId):null;
      if(t&&['task','subcheck','reference'].includes(r.kind))Object.assign(base,{progressTargetId:progressId,progressPercent:progress?progress.percent:((r.kind==='subcheck'?r.done:t.done)?100:0),progressDate:progress?progress.date:null,progressTracked:!!progress});
      if(r.kind==='scope')Object.assign(base,{label:s?s.title:r.text.trim().slice(2),scopeKind:s?s.kind:'folder',subtitle:s&&s.kind==='flow'?'개인 Flow · 예시':'폴더'});
      if(r.isReference||r.kind==='reference')Object.assign(base,{kind:'reference',label:t?t.title:r.text,subtitle:t?dateLabel(t.date,false):'연결된 할 일',dateMismatch:t&&t.date!==M.contextAt(state,currentId,r.index).date?(t.date?t.date.slice(5).replace('-','.'):'미정'):''});
      else if((r.kind==='task'||r.isCanonical)&&t&&t.date!==t.groupDate)base.dateMismatch=t.date?t.date.slice(5).replace('-','.'):'미정';
      result[r.index]=base;
    });return result;
  }
  function allTasks() { return M.tasks(state); }
  function task(id) { return allTasks().find(t => t.id === id); }
  function progressTarget(id){
    const primary=task(id);if(primary)return Object.assign({},primary,{kind:'task',isCanonical:true});
    for(const owner of documents()){
      const row=M.rowMeta(state,owner.id).find(r=>r.kind==='subcheck'&&r.id===id&&r.title);
      if(row)return {id:row.id,title:row.title,done:row.done,docId:owner.id,docTitle:owner.title,date:row.progressDate||row.date,sourceIndex:row.index,scopeId:row.scopeId,kind:'subcheck',parentTaskId:row.taskId};
    }
    return null;
  }
  function dateLabel(date, full) {
    if (!date) return '날짜 미정';
    const d = new Date(date + 'T12:00:00Z');
    if (!Number.isFinite(d.getTime())) return date;
    return (d.getUTCMonth() + 1) + '월 ' + d.getUTCDate() + '일' + (full ? ' (' + '일월화수목금토'[d.getUTCDay()] + ')' : '');
  }
  function shift(date, days) { const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10); }
  function validDate(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(new Date(date+'T12:00:00Z').getTime()) && new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date; }
  function range() {
    if (view === 'day') return [anchor,anchor];
    if (view === 'week') { const d = new Date(anchor+'T12:00:00Z'), first = shift(anchor,-((d.getUTCDay()+6)%7)); return [first,shift(first,6)]; }
    if (view === 'month') { const first=anchor.slice(0,7)+'-01', d=new Date(first+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);return [first,d.toISOString().slice(0,10)]; }
    return [null,null];
  }
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},3600); }
  function clearMove(announce){
    const previous=moveSelection;moveSelection=null;
    if(editor&&editor.setMoveState)editor.setMoveState(null);
    document.body.classList.remove('move-active');
    if(announce)$('#move-status').textContent='이동 선택을 취소했습니다. 원문은 그대로입니다.';
    return previous;
  }
  function focusMoveControl(selection){
    if(!selection||selection.docId!==currentId||view!=='document')return;
    const index=doc().lines.findIndex(line=>line.id===selection.lineId);
    if(editor&&editor.focusControl&&editor.focusControl(index))return;
    const control=$('.tle-check-hit[data-line-index="'+index+'"],.tle-row-open[data-action="scope-open"][data-line-index="'+index+'"]');
    if(control&&!control.hidden)control.focus({preventScroll:true});
    else $('#main').focus({preventScroll:true});
  }
  function beginMove(index,focusTargets){
    if(view!=='document'||blocked||invalidDraft||failure){toast('현재 입력과 저장 상태를 먼저 확인해 주세요.');return false;}
    const line=doc().lines[index],selected=line&&M.selectionForMove(state,currentId,line.id);
    if(!selected){toast('할 일이나 연결된 폴더·Flow에서 이동을 시작해 주세요.');return false;}
    if(!save())return false;
    closeDialog(false);
    if(editor&&editor.prepareMove&&!editor.prepareMove(index)){toast('한글 조합을 마친 뒤 순서를 바꿔 주세요.');return false;}
    const targets=M.moveTargets(state,currentId,line.id);
    if(!targets.length){clearMove(false);toast('현재 구조에서 옮길 수 있는 다른 위치가 없습니다.');return false;}
    clearTimeout(toastTimer);$('#toast').hidden=true;
    moveSelection=Object.assign({},selected,{docId:currentId,targets});
    helperLine=selected.startIndex;
    document.body.classList.add('move-active');
    $('#move-status').textContent=(selected.label||'항목')+' 잡힘. '+(selected.descendantCount?'하위 '+selected.descendantCount+'줄 포함. ':'')+'원하는 선으로 끌거나 본문 옆의 이동 위치를 누르세요. Escape로 취소합니다.';
    if(editor&&editor.setMoveState)editor.setMoveState(moveSelection);
    if(focusTargets)requestAnimationFrame(()=>{if(moveSelection&&editor&&editor.focusMoveTarget)editor.focusMoveTarget();});
    return true;
  }
  function applyMove(beforeLineId,depth){
    if(!moveSelection||moveSelection.docId!==currentId||view!=='document'||blocked||invalidDraft||failure){clearMove(false);toast('이동하지 않았습니다. 현재 입력과 저장 상태를 확인해 주세요.');return false;}
    const selected=moveSelection,next=M.moveSubtree(state,currentId,selected.lineId,beforeLineId,depth);
    if(next===state){toast('이 위치로는 옮기지 않았습니다. 원래 위치를 유지합니다.');return false;}
    closeDialog();clearMove(false);
    if(!change(next,'move-subtree',{moveFocus:selected})){toast('옮기지 못했습니다. 원문을 유지했습니다.');return false;}
    helperLine=doc().lines.findIndex(line=>line.id===selected.lineId);
    focusMoveControl(selected);
    $('#move-status').textContent='선택한 묶음을 옮겼습니다. 날짜와 소속은 그대로입니다. 되돌리기로 복원할 수 있습니다.';
    toast('묶음을 옮겼습니다. 되돌리기로 복원할 수 있습니다.');return true;
  }
  function showStatus() {
    if((blocked||invalidDraft||failure)&&moveSelection)clearMove(false);
    const saving=dirty&&!failure;
    $('#save-status').textContent=failure?'저장하지 못함':saving?'저장 중…':expected===null?'예시 · 변경 시 자동저장':'이 기기에 저장됨';
    $('#save-status').dataset.error=Boolean(failure);
    $('#save-error').hidden=!failure||$('#dialog').open;
    $('#save-error-text').textContent=failure;
    $('#dialog-error').hidden=!failure||!$('#dialog').open;
    $('#dialog-error').textContent=failure;
    $('#undo-button').disabled=!past.length||blocked||invalidDraft;
    document.querySelectorAll('.tle-textarea,#document-title,[data-task-title]').forEach(e=>{e.readOnly=blocked;});
    document.querySelectorAll('[data-check],.progress-value,.tle-check-hit,.tle-plus,.tle-row-menu,.tle-fold-toggle,#quick-range,#quick-percent,#quick-date,#quick-apply').forEach(e=>{e.disabled=blocked||invalidDraft;});
  }
  function save() {
    clearTimeout(timer);
    if (blocked||invalidDraft) { showStatus();return false; }
    if (!dirty) return !failure;
    let result;
    if (failNext) { failNext=false;result={ok:false,reason:'simulated'}; }
    else result=M.write(storage,state,expected);
    if (!result.ok) {
      if (result.reason==='conflict'||result.reason==='readback-failed') blocked=true;
      failure=blocked?'다른 저장본과 달라 덮어쓰지 않았습니다. 현재 문서를 텍스트로 보관한 뒤 다시 열어 주세요.':'저장하지 못했습니다. 변경 내용은 화면에 남아 있습니다. 다시 저장해 주세요.';
      showStatus();return false;
    }
    expected=result.serialized;dirty=false;failure='';showStatus();return true;
  }
  function remember(before, kind, moveFocus) {
    const now=Date.now(), grouped=kind.startsWith('text:')&&lastChange===kind&&now-lastChangeAt<900;
    if(!grouped){const snapshot=copy(before);if(moveFocus)historyMoveFocus.set(snapshot,{docId:moveFocus.docId,lineId:moveFocus.lineId});past.push(snapshot);if(past.length>80)past.shift();}
    future=[];lastChange=kind;lastChangeAt=now;
  }
  function change(next, kind, options) {
    if(invalidDraft){toast('반영하지 못한 편집을 되돌리거나 텍스트로 보관해 주세요.');showStatus();return false;}
    if(blocked){toast('저장 충돌을 먼저 해결해 주세요.');showStatus();return false;}
    if(!next||next===state||!M.validate(next))return false;
    if(JSON.stringify(next)===JSON.stringify(state))return true;
    clearMove(false);remember(state,kind||'action',options&&options.moveFocus);state=next;dirty=true;
    clearTimeout(timer);timer=setTimeout(save,500);
    if(!(options&&options.quiet))render();
    else {renderNav();renderDocMeta();}
    showStatus();return true;
  }
  function undo(redo) {
    if(invalidDraft){toast('반영하지 못한 편집을 되돌리거나 텍스트로 보관해 주세요.');return;}
    if(blocked){toast('충돌 상태에서는 되돌리기를 적용하지 않습니다.');return;}
    const source=redo?future:past,target=redo?past:future;
    if(!source.length){toast(redo?'다시 실행할 변경이 없습니다.':'되돌릴 변경이 없습니다.');return;}
    clearMove(false);const restored=source.pop(),moveFocus=historyMoveFocus.get(restored),snapshot=copy(state);
    if(moveFocus)historyMoveFocus.set(snapshot,moveFocus);target.push(snapshot);state=restored;lastChange='';dirty=true;
    if(!M.getDocument(state,currentId))currentId=state.documents[0].id;
    closeDialog();render();clearTimeout(timer);timer=setTimeout(save,500);
    if(moveFocus)focusMoveControl(moveFocus);
    toast(redo?'변경을 다시 실행했습니다.':'마지막 변경을 되돌렸습니다.');showStatus();
  }
  function hash(replace) {
    const params=new URLSearchParams({view:view,doc:currentId,date:anchor,folder:folder});
    const value='#'+params.toString();if(location.hash!==value)history[replace?'replaceState':'pushState'](null,'',value);
  }
  function readHash() {
    const p=new URLSearchParams(location.hash.slice(1));
    if(['document','day','week','month','all'].includes(p.get('view')))view=p.get('view');
    if(M.getDocument(state,p.get('doc')))currentId=p.get('doc');
    if(validDate(p.get('date')||''))anchor=p.get('date');
    folder=p.get('folder')||'';
  }
  function navigate(nextView,id,nextFolder) {
    if(!save()){toast('저장을 확인하지 못해 이동하지 않았습니다.');return false;}
    clearMove(false);lastChange='';composerOpen=false;closeDialog();
    if(id&&M.getDocument(state,id))currentId=id;
    if(nextFolder!==undefined)folder=nextFolder;
    view=nextView;render();hash();return true;
  }
  function navHTML() {
    const folders=M.scopes(state).filter(s=>s.kind==='folder');
    function branch(parentId,depth){return folders.filter(f=>f.parentId===parentId).map(f=>
      '<button class="nav-item nav-folder '+(view!=='document'&&folder===f.id?'active':'')+'" style="--nav-depth:'+depth+'" data-action="folder" data-folder="'+esc(f.id)+'" title="'+esc(scopePath(f))+'">'+icon('folder')+'<span>'+esc(f.title)+'</span></button>'+
      documents().filter(d=>d.folderId===f.id).map(d=>'<button class="nav-item nav-doc '+(view==='document'&&d.id===currentId?'active':'')+'" style="--nav-depth:'+(depth+1)+'" data-action="document" data-id="'+esc(d.id)+'" title="'+esc(d.title)+'">'+icon((state.flows||[]).some(flow=>flow.id===d.id)?'flow':'doc')+'<span>'+esc(d.title||'새 문서')+'</span></button>').join('')+branch(f.id,depth+1)).join('');}
    return '<div class="nav-head">내 기록</div><button class="nav-item" data-action="new-document">'+icon('doc')+'<span>새 문서</span></button><button class="nav-item '+(view!=='document'&&!folder?'active':'')+'" data-action="all-tasks">'+icon('check')+'<span>할 일</span></button><div class="nav-divider"></div>'+
      branch(null,0);
  }
  function renderNav(){ $('#navigation').innerHTML=navHTML(); }
  function renderDocMeta(){
    const current=doc(), parsed=M.parseDocument(current,state);
    const rows=rowMeta(),refs=rows.filter(r=>r.isReference||r.kind==='reference').length;
    $('#document-count').textContent=rows.filter(r=>r.isCanonical||r.kind==='task'||r.isReference).length+'개 할 일'+(refs?' · 연결 '+refs:'');
    const serious=parsed.issues.filter(i=>i.code!=='empty-task');
    $('#source-issues').hidden=!serious.length;
    $('#source-issues').textContent=serious.length?serious.map(i=>(i.index+1)+'행').join(', ')+'의 들여쓰기·날짜·속성을 확인해 주세요. 날짜 구획은 맨 앞, 들여쓰기는 두 칸씩 사용합니다.':'';
  }
  function render(){
    const current=doc();currentId=current.id;renderNav();
    $('#breadcrumb').textContent=view==='document'?current.folder+' / '+(current.title||'새 문서'):folderLabel(folder);
    $('#document-title').hidden=view!=='document';$('#period-title').hidden=view==='document';
    $('#document-title').value=current.title;
    $('#document-view').hidden=view!=='document';$('#period-view').hidden=view==='document';
    $('#text-mode').hidden=view!=='document';$('#folder-filter-label').hidden=view==='document';
    $('#period-tools').hidden=view==='document';
    $('#period-summary').hidden=view==='document';
    $('#range-actions').hidden=view==='document'||view==='all';$('#anchor-date').value=anchor;
    document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-selected',button.dataset.view===view?'true':'false'));
    if(view==='document'){
      $('#flow-source').hidden=!(state.flows||[]).some(f=>f.id===currentId);
      $('#flow-source').textContent='개인 Flow · 예시 콘텐츠 · 공개 원본에는 반영되지 않음';
      if(!editor)editor=window.TextLiveEditor.create($('#live-editor'),{value:M.raw(current),label:'문서 내용',getRowMeta:editorMeta,isActionDisabled:()=>blocked||invalidDraft,canApplyIndent:raw=>{
        if(blocked||invalidDraft)return false;
        const next=M.editText(state,currentId,raw,{progressDate:anchor}),ok=next!==state||raw===M.raw(doc());
        if(!ok)toast('이 구조로는 반영할 수 없습니다. 연결·날짜·들여쓰기를 확인해 주세요. 원문은 유지했습니다.');
        return ok&&M.validate(next);
      },onChange:raw=>{
        if(moveSelection)clearMove(false);
        if(inlinePicker&&picker){const currentLine=raw.split('\n')[picker.index]||'';if(!/^ *- ?$/.test(currentLine)&&!/^ *- \[ \] ?$/.test(currentLine))closeDialog();}
        const next=M.editText(state,currentId,raw,{progressDate:anchor});
        if(next===state&&raw!==M.raw(doc())){clearTimeout(timer);invalidDraft=true;failure='입력을 아직 반영하지 못했습니다. 진행률은 [20], [0.2], [1.0]처럼 쓰며 날짜·들여쓰기·연결도 확인해 주세요. 입력은 화면에 남아 있습니다.';showStatus();return;}
        if(invalidDraft){invalidDraft=false;failure='';showStatus();if(dirty){clearTimeout(timer);timer=setTimeout(save,500);}}
        change(next,'text:'+currentId,{quiet:true});
        if(editor&&M.raw(doc())!==raw)editor.setValue(M.raw(doc()),{preserveSelection:true});
        if(editor&&editor.refresh)editor.refresh();
      },onAction:handleEditorAction});
      else editor.setValue(M.raw(current),{preserveSelection:true});
      editor.setMode(textMode?'text':'live');renderDocMeta();
    }else renderPeriods();
    showStatus();
  }
  function progressOf(id){return M.latestProgress?M.latestProgress(state,id):null;}
  function progressRecords(id){return M.progressHistory?M.progressHistory(state,id):[];}
  function taskHTML(t,entry){
    const latest=progressOf(t.id),record=entry&&entry.record;
    const current=view==='all',percent=record?record.percent:latest?latest.percent:(t.done?100:0);
    const entryDate=entry?entry.date:t.date,tracked=!!latest;
    const label=percent===0?'<span class="progress-box" aria-hidden="true"></span>':percent===100?'<span class="progress-box checked" aria-hidden="true">✓</span>':'['+percent+'%]';
    const left='<button class="progress-value '+(percent===0||percent===100?'progress-extreme':'')+'" data-action="progress-open" data-id="'+esc(t.id)+'" data-progress-percent="'+percent+'" data-date="'+esc(record?record.date:current&&latest?latest.date:entryDate||anchor)+'" aria-label="'+esc(t.title)+' '+(record?dateLabel(record.date,false)+' 누적':'현재')+' '+percent+'% 진행 조절">'+label+'</button>';
    const rowDone=record?record.percent===100:t.done;
    const annotation=record?'이날까지 누적':tracked&&current?'현재 누적':tracked?'예정 · 이날 기록 없음':'';
    return '<div class="task-row '+(rowDone?'done':'')+'" data-task-row="'+esc(t.id)+'" data-entry-date="'+esc(entryDate||'')+'" '+(record?'data-record-percent="'+record.percent+'"':'')+'>'+left+'<div class="task-content"><input class="task-title" value="'+esc(t.title)+'" aria-label="할 일 제목: '+esc(t.title)+'" data-task-title="'+esc(t.id)+'" maxlength="500">'+(t.note?'<p class="task-note">'+esc(t.note)+'</p>':'')+'<div class="task-origin"><button data-action="source" data-id="'+esc(t.id)+'" aria-label="'+esc(t.title)+' 원문 열기">'+esc(t.folder)+' / '+esc(t.docTitle)+'</button>'+(annotation?'<span class="progress-caption">'+annotation+'</span>':'')+(t.time?'<span>· '+esc(t.time)+'</span>':'')+'</div></div><div class="task-actions">'+(!record?'<button class="quiet date-button" data-action="task-date" data-id="'+esc(t.id)+'" aria-label="'+esc(t.title)+' 날짜 변경">'+esc(t.date?t.date.slice(5).replace('-','.'):'미정')+'</button>':'')+'<button class="icon-button" data-action="task-menu" data-id="'+esc(t.id)+'" data-date="'+esc(record?record.date:current&&latest?latest.date:entryDate||anchor)+'" aria-label="'+esc(t.title)+' 더 보기">···</button></div></div>';
  }
  function composerHTML(date){
    const selectedScope=scope(folder);
    let available=selectedScope&&selectedScope.kind==='flow'?state.flows.filter(d=>d.id===folder):selectedScope?state.documents.filter(d=>d.folderId===folder):documents();
    if(!available.length)available=state.documents.slice();
    if(!available.some(d=>d.id===composerDoc))composerDoc=available[0]?available[0].id:currentId;
    return '<form class="composer" id="task-composer"><div class="composer-top"><label for="composer-document">추가할 문서</label><select id="composer-document">'+available.map(d=>'<option value="'+esc(d.id)+'" '+(d.id===composerDoc?'selected':'')+'>'+esc(d.folder+' / '+d.title)+'</option>').join('')+'</select></div><div class="composer-entry"><input id="composer-title" aria-label="새 할 일" placeholder="할 일 적고 Enter" autocomplete="off" maxlength="500" value="'+esc(composerDrafts[draftKey()]||'')+'"><button class="quiet" type="submit">추가</button><button class="icon-button" type="button" data-action="close-composer" aria-label="할 일 입력 닫기">×</button></div><p class="composer-hint">'+(selectedScope?'소속: '+esc(scopePath(selectedScope))+' · ':'')+dateLabel(date,true)+' · Enter로 추가 · 입력 중인 줄은 추가 전까지 저장되지 않음</p></form>';
  }
  function renderPeriods(){
    const folders=M.scopes(state);
    $('#folder-filter').innerHTML='<option value="">모든 폴더</option>'+folders.map(f=>'<option value="'+esc(f.id)+'" '+(folder===f.id?'selected':'')+'>'+esc(scopePath(f))+'</option>').join('');
    const bounds=range(),selected=folder?M.scopeTasks(state,folder):allTasks();
    const items=selected.filter(t=>!search||(t.title+' '+t.note+' '+t.folder+' '+t.docTitle).toLowerCase().includes(search.toLowerCase()));
    const entries=[];
    items.forEach(t=>{
      const records=progressRecords(t.id);
      if(view==='all'){if(!hideCompleted||!t.done)entries.push({task:t,date:t.date,record:null});return;}
      records.forEach(record=>{if(record.date>=bounds[0]&&record.date<=bounds[1]&&(!hideCompleted||record.percent<100))entries.push({task:t,date:record.date,record});});
      if(t.date&&t.date>=bounds[0]&&t.date<=bounds[1]&&!records.some(record=>record.date===t.date)&&(!hideCompleted||!t.done))entries.push({task:t,date:t.date,record:null});
    });
    const labels={day:dateLabel(anchor,true),week:dateLabel(bounds[0],false)+' — '+dateLabel(bounds[1],false),month:anchor.slice(0,4)+'년 '+Number(anchor.slice(5,7))+'월',all:folder?folderLabel(folder)+' 할 일':'전체 할 일'};
    $('#period-title').textContent=labels[view];
    const unique=new Set(entries.map(entry=>entry.task.id)),recordCount=entries.filter(entry=>entry.record).length;
    $('#period-summary').textContent=unique.size+'개 할 일'+(recordCount?' · 진행 기록 '+recordCount+'건':'')+(view==='all'?' · 현재 상태':'');
    let dates=[...new Set(entries.map(entry=>entry.date))].sort((a,b)=>a===null?1:b===null?-1:a.localeCompare(b));
    if(view==='day'&&!dates.length)dates=[anchor];
    if(view==='week')dates=Array.from({length:7},(_,i)=>shift(bounds[0],i));
    if(view==='month'&&!dates.length)dates=[anchor];
    if(view==='all'&&!dates.length)dates=[null];
    if(composerOpen&&!dates.includes(composerDate))dates.push(composerDate);
    $('#period-view').innerHTML=(!entries.length&&search?'<p class="empty">검색한 할 일이 없습니다.</p>':'')+dates.map(date=>'<section class="period-group"><div class="period-heading"><h2>'+dateLabel(date,true)+(date===TODAY?' <span class="today-label">오늘</span>':'')+'</h2><button class="icon-button quiet" data-action="compose" data-date="'+(date||'undated')+'" aria-label="'+dateLabel(date,false)+' 할 일 추가">＋</button></div>'+entries.filter(entry=>entry.date===date).map(entry=>taskHTML(entry.task,entry)).join('')+(composerOpen&&composerDate===date?composerHTML(date):'')+'</section>').join('')+(view==='month'?'<button class="outline" data-action="choose-compose-date">＋ 다른 날짜에 추가</button>':'');
  }
  function openDialog(title,html,options){
    if(moveSelection)clearMove(false);
    if(moveSelection&&!(options&&options.move))clearMove(false);
    if(!(options&&options.quick))quickProgress=null;
    $('#dialog').classList.toggle('progress-quick',!!(options&&options.quick));
    const sequence=++dialogSequence;
    const inline=!!(options&&options.inline);
    const writingTarget=inline?document.activeElement:null;
    const writingSelection=writingTarget&&writingTarget.matches('textarea,input:not([type])')?[writingTarget.selectionStart,writingTarget.selectionEnd]:null;
    if($('#dialog').open&&inlinePicker!==inline)$('#dialog').close();
    if(!$('#dialog').open){dialogReturn=document.activeElement;if(!inline&&dialogReturn&&dialogReturn.matches('input,textarea,[contenteditable="true"]'))dialogReturn.blur();}
    inlinePicker=inline;$('#dialog').classList.toggle('inline-picker',inline);
    $('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;
    if(!$('#dialog').open){if(inline)$('#dialog').show();else $('#dialog').showModal();}
    if(inline&&writingTarget&&writingTarget.isConnected){
      writingTarget.focus({preventScroll:true});
      if(writingSelection)writingTarget.setSelectionRange(writingSelection[0],writingSelection[1]);
    }
    showStatus();if(!inline)requestAnimationFrame(()=>{if(sequence!==dialogSequence||!$('#dialog').open)return;const focus=options&&options.focusSelector?$(options.focusSelector):$('#dialog-body').querySelector('input:not([type=hidden]),select,textarea,button');(focus||$('#dialog [data-action="close-dialog"]')).focus({preventScroll:true});if(quickProgress)positionQuickDialog();});
  }
  function closeDialog(restore){
    if(!$('#dialog').open)return;const writing=inlinePicker,quick=quickProgress;quickProgress=null;++dialogSequence;$('#dialog').close();inlinePicker=false;$('#dialog').classList.remove('inline-picker','progress-quick');showStatus();
    if(restore===false){const active=document.activeElement;if(active&&active.matches('input,textarea,[contenteditable="true"]'))active.blur();return;}
    if(dialogReturn&&dialogReturn.isConnected){
      if(!writing&&dialogReturn.matches('input,textarea,[contenteditable="true"]')){
        if(editor&&editor.focusControl&&view==='document'&&editor.focusControl(helperLine))return;
        $('#main').focus({preventScroll:true});
      }else dialogReturn.focus({preventScroll:true});
    }else if(quick){const selector='[data-action="progress-open"][data-id="'+CSS.escape(quick.id)+'"]',returnDate=quick.trigger&&quick.trigger.dataset.date||quick.date;const restored=document.querySelector(selector+'[data-date="'+CSS.escape(returnDate)+'"]')||document.querySelector(selector);if(restored){restored.focus({preventScroll:true});restored.scrollIntoView({block:'nearest',inline:'nearest'});}else if(editor&&view==='document'&&editor.focusControl&&editor.focusControl(helperLine))return;else $('#main').focus({preventScroll:true});}
  }
  function handleEditorAction(action){
    const type=action.type||action.kind;
    if(type==='move-cancel'){clearMove(true);return;}
    if(blocked||invalidDraft){showStatus();return false;}
    if(type==='move-select')return beginMove(action.lineIndex,false);
    if(type==='move-drop')return applyMove(action.beforeLineId,action.depth);
    helperLine=action.lineIndex;
    if(type==='scope-picker'){openPicker('scope',action.lineIndex,true,true);return;}
    if(type==='task-picker'){openPicker('task',action.lineIndex,true,true);return;}
    if(type==='row-menu'){rowMenu(action.lineIndex);return;}
    if(type==='progress-open'){const row=rowMeta()[action.lineIndex],id=row&&(row.progressTargetId||(row.kind==='subcheck'?row.id:row.taskId));if(id){const latest=progressOf(id);return quickProgressDialog(id,latest?latest.date:row.kind==='subcheck'&&row.progressDate?row.progressDate:anchor);}return;}
    if(type==='scope-open'){const r=rowMeta()[action.lineIndex],s=r&&scope(r.scopeId);if(s)return navigate(s.kind==='flow'?'document':'all',s.kind==='flow'?s.id:null,s.kind==='flow'?undefined:s.id);return;}
    if(type==='reference-open'){referenceMenu(action.lineIndex);return;}
    if(type==='task-origin'){referenceMenu(action.lineIndex);return;}
    if(type==='task-date'){const r=rowMeta()[action.lineIndex];if(r&&r.taskId)dateDialog(r.taskId);return;}
    if(type==='toggle'){
      const row=rowMeta()[action.lineIndex],found=row&&row.taskId?task(row.taskId):null;
      if(row&&row.kind==='subcheck'&&!row.isCanonical){
        change(M.updateSubcheck(state,currentId,row.id,!row.done),'toggle-subcheck');return;
      }
      if(found)change(M.updateTask(state,found.id,{done:!found.done}),'toggle');
      return;
    }
    addMenu(action.lineIndex);
  }
  function commandIcon(name){
    if(['folder','flow','link'].includes(name))return icon(name);
    if(name==='progress')return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 6"/></svg>';
    const paths={task:'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/>',subcheck:'<path d="M4 3v9h5"/><rect x="10" y="9" width="10" height="11" rx="1"/>',note:'<path d="M5 5h14M5 10h14M5 15h9M5 20h6"/>',move:'<path d="M8 20V4m-4 4 4-4 4 4M17 4v16m-4-4 4 4 4-4"/>',indent:'<path d="m3 8 4 4-4 4M11 5h10M11 12h10M11 19h10"/>',outdent:'<path d="m7 8-4 4 4 4M11 5h10M11 12h10M11 19h10"/>',date:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18"/>',edit:'<path d="m4 16 12-12 4 4L8 20H4zM13 7l4 4"/>',fold:'<path d="m6 9 6 6 6-6"/>',open:'<path d="M13 4h7v7m-1-6L9 15M9 5H4v15h15v-5"/>',unlink:'<path d="m3 3 18 18M9 7l2-2a5 5 0 0 1 7 7l-1 1M7 9l-2 2a5 5 0 0 0 7 7l1-1"/>'};
    return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(paths[name]||paths.note)+'</svg>';
  }
  function commandButton(action,label,mark,relation,syntax,attributes){
    return '<button class="command-row" data-action="'+action+'" '+(attributes||'')+'><span class="command-icon">'+commandIcon(mark)+'</span><span class="command-text"><strong>'+esc(label)+'</strong>'+(relation?'<small>'+esc(relation)+'</small>':'')+'</span>'+(syntax?'<code aria-hidden="true">'+esc(syntax)+'</code>':'')+'</button>';
  }
  function lineLabel(row){
    if(!row)return '현재 줄';const s=row.scopeId&&scope(row.scopeId),t=row.taskId&&task(row.taskId);
    return (row.kind==='scope'&&s?s.title:row.kind==='subcheck'?row.title:t?t.title:row.text.trim())||'빈 줄';
  }
  function addMenu(index){
    helperLine=index;
    if(editor&&editor.prepareAction&&!editor.prepareAction(index))return;
    const row=rowMeta()[index];if(!row)return;
    const options=M.insertionOptions(state,currentId,row.id),p=insertionPoint(),ctx=M.insertionContext(state,currentId,p.index,p.depth);
    const supportsLink=options.length>0&&ctx.valid&&p.depth<=(M.MAX_DEPTH||32);
    const supportsScope=supportsLink;
    const choices=options.map(option=>commandButton('insert-plan',option.label,option.kind,option.relation,option.syntax,'data-kind="'+option.kind+'" data-line-id="'+esc(row.id)+'"')).join('');
    const selectedScope=row.scopeId&&scope(row.scopeId);
    const links=(row.kind==='scope'&&selectedScope&&selectedScope.kind==='flow'?commandButton('import-flow-items','Flow의 할 일 불러오기','flow','이미 불러온 항목은 제외','','data-line="'+index+'"'):'')+(supportsLink?commandButton('picker-task','기존 할 일','link','원래 항목과 연결',''): '')+(supportsScope?commandButton('picker-scope','폴더 · Flow','folder','기존에서 고르거나 새 폴더 만들기','- 이름'): '');
    openDialog('추가','<p class="command-context">'+esc(lineLabel(row))+'</p><div class="command-list">'+(choices||'<p class="note">작성 중인 줄을 마친 뒤 추가할 수 있습니다.</p>')+'</div>'+(links?'<h3 class="command-group">불러오기</h3><div class="command-list">'+links+'</div>':''));
  }
  function rowMenu(index){
    helperLine=index;
    if(editor&&editor.prepareAction&&!editor.prepareAction(index))return;
    const row=rowMeta()[index];if(!row)return;
    if(row.kind==='scope')return scopeMenu(index);
    const selected=M.selectionForMove(state,currentId,row.id),t=row.taskId&&task(row.taskId);
    let commands=selected?commandButton('move-row','문서 안에서 이동','move',selected.descendantCount?'하위 '+selected.descendantCount+'줄도 함께':'부모·높이 변경 · 기록 유지','','data-line="'+index+'"'):'';
    if(row.kind!=='date'&&!['code','fence'].includes(row.kind))commands+='<div class="indent-actions">'+commandButton('outdent-row','내어쓰기','outdent','','','')+commandButton('indent-row','들여쓰기','indent','','','')+'</div>';
    if(t&&(row.kind!=='subcheck'||row.isCanonical))commands+=commandButton('task-date','날짜','date',dateLabel(t.date,false),'','data-id="'+esc(t.id)+'"')+commandButton('task-detail','메모 · 시간','note','','','data-id="'+esc(t.id)+'"');
    if(t){const progressId=row.progressTargetId||(row.kind==='subcheck'&&!row.isReference?row.id:t.id);commands+=commandButton('progress-open','진행 기록','progress',progressOf(progressId)?'현재 '+progressOf(progressId).percent+'%':'날짜별 누적 진행률','','data-id="'+esc(progressId)+'"');}
    if(row.isReference)commands+=commandButton('source','원문 열기','open','','','data-id="'+esc(t.id)+'"')+'<div class="command-secondary">'+commandButton('unlink','이 문서에서 연결 해제','unlink','원래 할 일은 남습니다','','data-line="'+index+'"')+'</div>';
    openDialog('줄 작업','<p class="command-context">'+esc(lineLabel(row))+'</p><div class="command-list">'+(commands||'<p class="note">이 줄은 글로 편집합니다.</p>')+'</div>');
  }
  function insertPlanned(lineId,kind){
    if(blocked||invalidDraft||failure){toast('현재 입력과 저장 상태를 먼저 확인해 주세요.');return;}
    const option=M.insertionOptions(state,currentId,lineId).find(entry=>entry.kind===kind);
    if(!option){toast('현재 구조에서 추가할 위치를 다시 골라 주세요.');return;}
    closeDialog(false);lastChange='';
    if(!editor.replaceRange(option.offset,option.offset,option.text,{selectionAfter:{start:option.caretOffset,end:option.caretOffset,direction:'none'}}))toast('추가하지 못했습니다. 원문은 그대로입니다.');
  }
  function scopePath(s){
    if(!s)return '';
    const names=[s.title],seen=new Set([s.id]);let parent=s.parentId?scope(s.parentId):null;
    while(parent&&!seen.has(parent.id)){names.unshift(parent.title);seen.add(parent.id);parent=parent.parentId?scope(parent.parentId):null;}return names.join(' / ');
  }
  function insertionPoint(){
    const rows=rowMeta(),r=rows[helperLine];
    if(!r)return {index:doc().lines.length,depth:0};
    if(r.kind==='scope')return {index:r.index+1,depth:(r.depth||0)+1};
    if(r.kind==='property'){
      const owner=rows.find(x=>x.id===r.taskId);if(owner)return {index:owner.subtreeEndIndex??(owner.index+1),depth:owner.depth||0};
    }
    return {index:r.subtreeEndIndex??(r.index+1),depth:r.kind==='date'?0:(r.depth||0)};
  }
  function openPicker(kind,index,replace,inline,selectedDepth){
    const depth=selectedDepth??(replace?Math.floor(((doc().lines[index]?.text||'').match(/^ */)[0].length)/2):0);
    const ctx=M.insertionContext(state,currentId,index,depth);
    picker={kind,docId:currentId,index,replace:!!replace,depth,scopeId:ctx.scopeId||'',ancestorScopeIds:ctx.ancestorScopeIds||[],date:ctx.date||null};
    const selected=scope(picker.scopeId);
    openDialog(kind==='scope'?'폴더 · Flow 연결':'기존 할 일 연결',
      '<div class="picker-context">'+(selected?icon(selected.kind)+esc(scopePath(selected))+(kind==='scope'?' 아래':''):'문서 최상위')+'</div>'+
      '<label class="search-field"><span class="sr-only">'+(kind==='scope'?'폴더 또는 Flow 검색':'기존 할 일 검색')+'</span><input id="picker-search" type="search" placeholder="'+(kind==='scope'?'이름으로 찾기':'할 일 또는 #태그 찾기')+'" autocomplete="off"></label>'+
      (kind==='task'?'<div class="picker-options"><label>날짜 <select id="link-date-mode"><option value="keep">기존 날짜 유지</option>'+(ctx.date?'<option value="apply">'+dateLabel(ctx.date,false)+'로 변경</option>':'')+'</select></label>'+(selected?'<button class="quiet" data-action="picker-all">전체에서 찾기</button>':'')+'</div>':'<p class="picker-hint">선택한 묶음만 연결합니다. 안의 할 일과 날짜는 그대로입니다.</p>')+
      '<div id="picker-results" class="picker-results"></div><div class="picker-footer">'+(kind==='task'?'<button class="quiet" data-action="picker-new">새 할 일 직접 쓰기</button>':(depth<=2&&(!selected||selected.kind==='folder')?'<button class="quiet" data-action="create-folder-dialog">'+(selected?'새 하위 폴더 만들기':'새 폴더 만들기')+'</button>':''))+'<button class="quiet" data-action="close-dialog">'+(kind==='scope'?'연결 없이 계속 쓰기':'취소')+'</button></div>',{inline});
    renderPicker('');
  }
  function renderPicker(query){
    if(!picker||!$('#picker-results'))return;
    const needle=query.trim().toLowerCase();
    const choices=picker.kind==='scope'?M.scopes(state).filter(s=>picker.depth<=(M.MAX_DEPTH||32)&&!picker.ancestorScopeIds.includes(s.id)):(picker.scopeId?M.scopeTasks(state,picker.scopeId):allTasks());
    const filtered=choices.filter(t=>(picker.kind==='scope'?scopePath(t):t.title+' '+t.note+' '+t.docTitle).toLowerCase().includes(needle));
    $('#picker-results').innerHTML=filtered.slice(0,40).map(item=>picker.kind==='scope'?'<button class="picker-row" data-pick-scope="'+esc(item.id)+'">'+icon(item.kind)+'<span><strong>'+esc(item.title)+'</strong><small>'+esc(item.kind==='flow'?'개인 Flow · '+(item.sourceVersion||'예시'):(item.parentId?scopePath(item):'폴더'))+'</small></span><span class="pick-arrow">→</span></button>':'<button class="picker-row" data-pick-task="'+esc(item.id)+'">'+icon('check')+'<span><strong>'+esc(item.title)+'</strong><small>'+esc(item.folder+' / '+item.docTitle)+'</small></span><span class="pick-date">'+dateLabel(item.date,false)+(item.done?' · 완료':'')+'</span></button>').join('')||'<p class="empty">'+(picker.kind==='scope'?'일치하는 폴더·Flow가 없습니다.':'연결할 할 일이 없습니다. 새로 작성할 수 있습니다.')+'</p>';
  }
  function stagePickerLine(text){
    if(!picker||picker.docId!==currentId)return null;
    const lines=M.raw(doc()).split('\n');let index=Math.max(0,Math.min(picker.index,lines.length));
    const indented='  '.repeat(picker.depth)+text;
    if(picker.replace&&index<lines.length)lines[index]=indented;else lines.splice(index,0,indented);
    const next=M.editText(state,currentId,lines.join('\n'),{progressDate:anchor});
    if(next===state&&lines.join('\n')!==M.raw(doc()))return null;
    return {next,index};
  }
  function selectScope(id){
    let staged;
    const existing=picker&&picker.replace&&rowMeta()[picker.index];
    if(existing&&existing.kind==='scope')staged={next:state,index:picker.index};else staged=stagePickerLine('- ');
    if(!staged)return toast('연결할 위치를 확인해 주세요.');
    let next=M.attachScope(staged.next,currentId,staged.index,id);
    if(next===staged.next)return toast('연결하지 못했습니다. 기존 글은 유지했습니다.');
    const index=staged.index;
    if(index===M.getDocument(next,currentId).lines.length-1)next=M.editText(next,currentId,M.raw(M.getDocument(next,currentId))+'\n'+'  '.repeat(Math.min(4,picker.depth+1)),{progressDate:anchor});
    if(change(next,'attach-scope')){closeDialog();editor.focus(index+1);toast('묶음을 연결했습니다. 안의 할 일과 날짜는 그대로입니다.');}
  }
  function selectTask(id){
    if(!picker)return;
    const mode=$('#link-date-mode')?$('#link-date-mode').value:'keep',date=picker.date;
    const staged=stagePickerLine('- [ ] ');if(!staged)return toast('연결할 위치를 확인해 주세요.');
    const next=M.linkTask(staged.next,currentId,staged.index,id,{dateMode:mode,date});
    if(next===staged.next)return toast('이 위치에는 연결할 수 없습니다. 원본은 그대로입니다.');
    if(change(next,'link-task')){closeDialog();editor.focus(staged.index);toast(mode==='apply'?'같은 할 일을 연결하고 실행 날짜를 바꿨습니다.':'같은 할 일을 연결했습니다. 기존 날짜는 유지했습니다.');}
  }
  function referenceMenu(index){
    const row=rowMeta()[index],t=row&&row.taskId?task(row.taskId):null;if(!t)return;
    helperLine=index;
    openDialog(t.title,'<p class="note">원래 소속: '+esc(scopePath(scope(t.scopeId)))+' · '+dateLabel(t.date,false)+'</p><div class="menu"><button data-action="task-detail" data-id="'+esc(t.id)+'">메모 · 시간</button><button data-action="task-date" data-id="'+esc(t.id)+'">이 할 일 날짜 변경</button><button data-action="source" data-id="'+esc(t.id)+'">원문 열기</button>'+(row.isReference?'<button data-action="unlink" data-line="'+index+'">이 문서에서 연결 해제</button>':'')+'</div><p class="consequence">문서 위치를 바꿔도 원래 소속은 유지합니다. 연결 해제는 원본 삭제가 아닙니다.</p>');
  }
  function scopeMenu(index){
    const row=rowMeta()[index],s=row&&scope(row.scopeId);if(!s)return;
    helperLine=index;
    const folded=editor&&editor.isFolded&&editor.isFolded(index);
    const commands=commandButton('move-row','문서 안에서 이동','move','하위 내용도 함께 · 실제 소속 유지','','data-line="'+index+'"')+
      (row.subtreeEndIndex>index+1?commandButton('fold-row',folded?'하위 내용 펼치기':'하위 내용 접기','fold','','','data-line="'+index+'"'):'')+
      commandButton(s.kind==='flow'?'document':'scope-view',s.kind==='flow'?'Flow 원문 열기':'폴더 내용 열기','open','','','data-id="'+esc(s.id)+'"')+
      commandButton('rename-scope','이름 바꾸기','edit','','','data-id="'+esc(s.id)+'"');
    openDialog(s.title,'<div class="command-list">'+commands+'</div><details class="command-secondary"><summary>연결 관리</summary>'+commandButton('unlink','이 문서에서 연결 해제','unlink','하위 글과 원래 '+(s.kind==='flow'?'Flow':'폴더')+'는 남습니다','','data-line="'+index+'"')+'</details>');
  }
  function unlinkLine(index){
    const row=rowMeta()[index];if(!row)return;
    if(change(M.unlink(state,currentId,row.id),'unlink')){closeDialog();toast('이 문서의 연결을 풀었습니다. 하위 글과 원본은 남아 있습니다.');}
    else toast('하위 구조를 안전하게 풀 수 없어 원문을 유지했습니다.');
  }
  function insertAfterLine(text){
    if(blocked){closeDialog();showStatus();return;}
    const raw=editor.getValue(),lines=raw.split('\n'),point=insertionPoint();
    const index=Math.max(0,Math.min(point.index,lines.length)),offset=lines.slice(0,index).join('\n').length+(index<lines.length&&index>0?1:0);
    const fragment='  '.repeat(point.depth)+text;
    closeDialog();editor.replaceRange(offset,offset,(index===lines.length&&raw?'\n':'')+fragment+(index<lines.length?'\n':''));editor.focus(index);
  }
  function dateDialog(id){
    const t=task(id);if(!t)return;
    openDialog('할 일 날짜','<p class="note">'+esc(t.title)+'<br>'+esc(t.folder+' / '+t.docTitle)+'</p><form id="date-form" data-id="'+esc(id)+'"><label class="field"><span>실행 날짜</span><input type="date" id="task-date" value="'+(t.date||anchor)+'"></label><p class="note">이 할 일만 변경합니다. 원문 배치와 다른 항목의 날짜는 유지합니다.</p><button class="quiet" type="button" data-action="restore-date" data-id="'+esc(id)+'">원래 날짜 따르기 · '+dateLabel(t.groupDate,false)+'</button><div class="dialog-actions"><button type="button" data-action="undate" data-id="'+esc(id)+'">날짜 미정</button><button class="primary" type="submit">날짜 변경</button></div></form>');
  }
  function detailDialog(id){
    const t=task(id);if(!t)return;
    openDialog('할 일 메모','<form id="detail-form" data-id="'+esc(id)+'"><label class="field"><span>할 일</span><input id="detail-title" maxlength="500" value="'+esc(t.title)+'" required></label><label class="field"><span>메모</span><textarea id="detail-note">'+esc(t.note)+'</textarea></label><label class="field"><span>시간</span><input type="time" id="detail-time" value="'+esc(t.time||'')+'"></label><div class="dialog-actions"><button type="button" data-action="close-dialog">취소</button><button class="primary" type="submit">반영</button></div></form>');
  }
  function positionQuickDialog(){
    if(!quickProgress||!$('#dialog').open)return;
    const viewport=window.visualViewport,top=viewport?viewport.offsetTop:0,left=viewport?viewport.offsetLeft:0;
    const height=viewport?viewport.height:innerHeight,width=viewport?viewport.width:innerWidth,dialog=$('#dialog');
    const box=quickProgress.trigger&&quickProgress.trigger.isConnected?quickProgress.trigger.getBoundingClientRect():quickProgress.triggerBox;
    const w=Math.max(1,Math.min(360,width-24));dialog.style.setProperty('--quick-width',w+'px');
    const h=Math.min(dialog.scrollHeight+2,height-24);
    const x=Math.max(left+12,Math.min(box?box.left:left+(width-w)/2,left+width-w-12));
    let y=box?box.bottom+8:top+(height-h)/2;
    if(y+h>top+height-12)y=box&&box.top-h-8>=top+12?box.top-h-8:top+(height-h)/2;
    dialog.style.setProperty('--quick-left',x+'px');dialog.style.setProperty('--quick-top',Math.max(top+12,y)+'px');
  }
  function quickValueFor(id,date){const entry=progressRecords(id).find(record=>record.date===date),latest=progressOf(id);return entry?entry.percent:latest?latest.percent:100;}
  function paintQuick(){
    const q=quickProgress;if(!q||!$('#quick-range'))return;
    const valid=Number.isInteger(q.value)&&q.value>=0&&q.value<=100;
    if(valid){$('#quick-range').value=q.value;$('#quick-range').style.setProperty('--range-fill',q.value+'%');$('#quick-range').setAttribute('aria-valuetext',q.value+'% 누적 진행');$('#quick-preview').value=q.value+'%';}
    $('#quick-apply').textContent=q.dirty?'반영':'100% 완료';
    $('#quick-feedback').textContent=q.dirty?'미리보기 · 아직 반영 전':progressRecords(q.id).some(r=>r.date===q.date)?'':'아직 반영 전';
  }
  function quickProgressDialog(id,date){
    const t=progressTarget(id);if(!t||blocked||invalidDraft)return;
    const selected=validDate(date)?date:t.kind==='subcheck'&&validDate(t.date)?t.date:anchor,trigger=document.activeElement;
    quickProgress={id,date:selected,value:quickValueFor(id,selected),initial:quickValueFor(id,selected),dirty:false,pointerActive:false,cancelled:false,keyboard:false,trigger,triggerBox:trigger&&trigger.getBoundingClientRect?trigger.getBoundingClientRect():null};
    openDialog('진행 조절','<p class="quick-task">'+esc(t.title)+'</p><form id="quick-progress-form" data-id="'+esc(id)+'"><div class="quick-context"><label for="quick-date">기록 날짜</label><input id="quick-date" type="date" value="'+selected+'" required></div><label class="quick-range-label" for="quick-range">누적 진행 <output id="quick-preview" for="quick-range">'+quickProgress.value+'%</output></label><input id="quick-range" type="range" min="0" max="100" step="1" value="'+quickProgress.value+'" aria-valuetext="'+quickProgress.value+'% 누적 진행"><div class="quick-scale" aria-hidden="true"><span>0</span><span>100</span></div><div class="quick-entry"><label for="quick-percent" class="sr-only">누적 진행률 직접 입력 (%)</label><span class="quick-number"><input id="quick-percent" type="number" min="0" max="100" step="1" inputmode="numeric" value="'+quickProgress.value+'" required><span aria-hidden="true">%</span></span><button id="quick-apply" class="primary" type="submit">완료</button></div><p id="quick-feedback" class="muted"></p><p id="quick-error" class="error" role="alert" hidden></p></form><div class="quick-footer"><button class="quiet" data-action="progress-more" data-id="'+esc(id)+'">기록 더 보기</button><button class="quiet" data-action="close-dialog">닫기</button></div>',{quick:true,focusSelector:'#quick-range'});
    paintQuick();positionQuickDialog();
  }
  function commitQuick(percent){
    const q=quickProgress;if(!q||q.cancelled)return;
    const date=$('#quick-date').value;
    if(blocked||invalidDraft||failure){$('#quick-error').hidden=false;$('#quick-error').textContent='저장 상태를 먼저 확인해 주세요. 입력은 그대로 남아 있습니다.';return;}
    if(!validDate(date)||!Number.isInteger(percent)||percent<0||percent>100){$('#quick-error').hidden=false;$('#quick-error').textContent='날짜와 0~100 사이의 정수를 입력해 주세요.';return;}
    const next=M.recordProgress(state,q.id,date,percent),same=progressRecords(q.id).some(r=>r.date===date&&r.percent===percent);
    if(next===state&&!same){$('#quick-error').hidden=false;$('#quick-error').textContent='반영하지 못했습니다. 입력과 할 일의 연결을 확인해 주세요.';return;}
    if(next!==state&&!change(next,'progress-quick'))return;
    closeDialog();toast(same?'같은 값이 이미 기록되어 있습니다.':dateLabel(date,false)+' 누적 '+percent+'%를 반영했습니다.');
  }
  function progressDialog(id,date){
    const t=progressTarget(id);if(!t)return;
    const records=progressRecords(id),latest=progressOf(id),selected=validDate(date)?date:anchor;
    const entry=records.find(record=>record.date===selected);
    openDialog('진행 기록','<p class="command-context">'+esc(t.title)+'</p><p class="progress-current" data-current-progress="'+esc(id)+'">'+(latest?'현재 누적 <strong>'+latest.percent+'%</strong> <small>'+dateLabel(latest.date,false)+' 기록 기준</small>':'아직 진행 기록이 없습니다.')+'</p><form id="progress-form" data-id="'+esc(id)+'"><div class="progress-fields"><label class="field"><span>기록 날짜</span><input id="progress-date" type="date" value="'+selected+'" required></label><label class="field"><span>이날까지 누적 진행률 (%)</span><input id="progress-percent" type="number" inputmode="numeric" min="0" max="100" step="1" value="'+(entry?entry.percent:'')+'" placeholder="0~100" required aria-describedby="progress-help"></label></div><p id="progress-help" class="note">같은 할 일에 기록합니다. 다른 날짜의 기록은 그대로 남습니다.</p><p id="progress-form-error" class="error" role="alert" hidden></p><div class="dialog-actions"><button type="button" data-action="close-dialog">취소</button><button class="primary" type="submit">기록 반영</button></div></form>'+(records.length?'<details class="progress-history" open><summary>날짜별 기록 · '+records.length+'건</summary><div class="progress-history-list">'+records.map(record=>'<button data-action="progress-history-date" data-id="'+esc(id)+'" data-date="'+record.date+'" data-history-date="'+record.date+'" data-history-percent="'+record.percent+'" aria-label="'+dateLabel(record.date,false)+' '+record.percent+'% 기록 수정"><span>'+dateLabel(record.date,true)+'</span><strong>['+record.percent+'%]</strong></button>').join('')+'</div></details>':'')+(t.kind==='subcheck'?'<div class="progress-links"><button class="quiet" data-action="source" data-id="'+esc(id)+'">원문에서 보기</button></div>':'<div class="progress-links"><button class="quiet" data-action="progress-day" data-id="'+esc(id)+'">이 날짜의 할 일 보기</button><button class="quiet" data-action="'+(scope(t.scopeId)&&scope(t.scopeId).kind==='flow'?'document':'scope-view')+'" data-id="'+esc(scope(t.scopeId)&&scope(t.scopeId).kind==='flow'?t.docId:t.scopeId)+'">'+(scope(t.scopeId)&&scope(t.scopeId).kind==='flow'?'Flow':'폴더')+'에서 보기</button></div>'));
  }
  function source(id){
    const t=progressTarget(id);if(!t)return;
    if(navigate('document',t.docId)){editor.focus(t.sourceIndex);toast('같은 할 일의 원문으로 이동했습니다.');}
  }
  function download(){
    const sourceRaw=view==='document'&&editor?editor.getValue():M.raw(doc());
    const meta=rowMeta();
    const raw=invalidDraft?sourceRaw:sourceRaw.split('\n').map((line,index)=>{const r=meta[index],t=r&&r.isReference?task(r.taskId):null,indent='  '.repeat((r?.depth||0)+1);return t?line+'\n'+indent+'- 날짜: '+(t.date||'미정')+'\n'+indent+'- 원문: '+t.folder+' / '+t.docTitle+(t.note?'\n'+indent+'- 메모: '+t.note.replace(/\n/g,'\n'+indent+'- 메모: '):''):line;}).join('\n');
    const link=document.createElement('a'),url=URL.createObjectURL(new Blob(['\ufeff'+raw],{type:'text/plain;charset=utf-8'}));
    link.href=url;link.download=(doc().title||'문서')+'.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('TXT에는 입력한 표기가 남습니다. 날짜별 전체 진행 기록과 연결 ID는 전체 보관 JSON에만 포함됩니다.');
  }
  function downloadAll(){
    const url=URL.createObjectURL(new Blob([JSON.stringify({format:'flowme-ux-v11-recovery',state,pendingText:invalidDraft&&editor?{docId:currentId,text:editor.getValue()}:null,composerDrafts},null,2)],{type:'application/json;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download='flowme-ux-v11-recovery.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('문서·Flow·진행 기록을 보관했습니다. 자동 가져오기는 아직 지원하지 않습니다.');
  }
  function review(){
    openDialog('v11 · 자유롭게 옮기기','<ol class="review-steps"><li><strong>잡고, 원하는 높이로 놓기</strong><p>체크칸·왼쪽 아이콘을 길게 눌러 끌어 놓으세요. 좌우로 움직여 들여쓰기와 새 부모를 고릅니다. 삽입선과 목적지 이름을 확인하세요. 부모를 잡으면 딸린 항목도 함께 움직입니다.</p></li><li><strong>창 없이 위치 선택</strong><p>드래그 대신 본문 옆의 ↔ 버튼으로 깊이를 고르고 ‘여기’를 눌러도 됩니다. 키보드는 위·아래로 위치, 좌·우로 깊이, Enter로 이동합니다. 바깥에 놓거나 Esc로 취소하고, 상단 ↶로 되돌립니다.</p></li><li><strong>위치가 바뀌어도 같은 할 일</strong><p>하위로 넣거나 밖으로 꺼내도 진행 기록과 연결은 유지합니다. 기존 할 일은 하위에 있어도 기간 목록에 남습니다. 새 하위 체크는 자동으로 기간 목록에 늘리지 않고, 최상위·폴더 아래로 꺼낼 때 같은 ID의 할 일로 등록합니다.</p></li></ol><details><summary>날짜·진행률</summary><p>짧게 누르면 진행 조절창이 열립니다. 미기록 초기값은 100%이며 반영 전에는 기록하지 않습니다. 0%는 빈칸, 중간값은 숫자, 100%는 체크입니다. 부모와 자식 진행률을 자동 합산하지 않습니다.</p><p>[20%] · [20] · [0.2]는 20%, [1]은 1%, [1.0]은 100%입니다. 이동은 과거 기록 날짜를 바꾸거나 새 진행 기록을 만들지 않습니다. 문서 배치만 바꿀 때 기존 일정·메모·시간·소속은 유지합니다.</p></details><details><summary>구조 보호와 범위</summary><p>자기 자신·자신의 하위에 넣는 순환과 잘못된 연결은 막습니다. 한 번의 이동은 전부 적용하거나 그대로 유지하며 기존 Undo로 복원합니다.</p><p>이번 자유 이동은 문서 본문 안에서 동작합니다. 본문에 연결한 폴더·개인 Flow의 배치는 실제 폴더 트리나 원본 Flow 구성을 몰래 바꾸지 않습니다. 다른 문서로 직접 드래그·공유 원본 편집·제품 서비스 통합은 포함하지 않습니다.</p><p>독립 v11 저장 공간이며 이전 시안의 데이터를 자동으로 옮기지 않습니다. 깊이는 32단계까지 지원하고 기존 문서 용량 제한은 유지합니다. 아주 깊은 원문은 작은 화면에서 줄바꿈이 많을 수 있습니다. 실제 휴대전화 키보드·스크린리더와 긴 문서 성능은 별도 검증입니다.</p></details><details><summary>검토용 도구</summary><div class="actions"><button data-action="fail-next">다음 저장 실패시키기</button><button data-action="reload">새로고침</button><button data-action="reset-dialog">시안 초기화</button></div></details>');
  }
  $('#document-title').addEventListener('input',()=>{
    const value=$('#document-title').value;
    if((state.flows||[]).some(f=>f.id===currentId)){if(value.trim())change(M.renameScope(state,currentId,value),'text:title-'+currentId,{quiet:true});return;}
    const next=copy(state);next.documents.find(d=>d.id===currentId).title=value;
    change(next,'text:title-'+currentId,{quiet:true});
  });
  $('#anchor-date').addEventListener('change',event=>{if(validDate(event.target.value)&&save()){anchor=event.target.value;composerOpen=false;render();hash();}});
  $('#folder-filter').addEventListener('change',event=>{if(save()){folder=event.target.value;composerOpen=false;render();hash();}});
  document.addEventListener('input',event=>{
    if(quickProgress&&event.target.id==='quick-range'){
      if(quickProgress.cancelled){event.target.value=quickProgress.initial;return;}
      quickProgress.value=event.target.valueAsNumber;quickProgress.dirty=true;$('#quick-percent').value=event.target.value;paintQuick();return;
    }
    if(quickProgress&&event.target.id==='quick-percent'){
      quickProgress.value=event.target.valueAsNumber;quickProgress.dirty=true;quickProgress.cancelled=false;paintQuick();return;
    }
    if(event.target.id==='picker-search')renderPicker(event.target.value);
    if(event.target.id==='task-search'){search=event.target.value;renderPeriods();}
    if(event.target.id==='composer-title')composerDrafts[draftKey()]=event.target.value;
    if(event.target.matches('[data-task-title]')){
      const title=event.target.value;if(!title.trim())return;
      change(M.updateTask(state,event.target.dataset.taskTitle,{title:title}),'text:task-'+event.target.dataset.taskTitle,{quiet:true});
    }
  });
  document.addEventListener('change',event=>{
    if(quickProgress&&event.target.id==='quick-date'){
      quickProgress.date=event.target.value;quickProgress.value=quickValueFor(quickProgress.id,event.target.value);quickProgress.initial=quickProgress.value;quickProgress.dirty=false;quickProgress.cancelled=false;quickProgress.keyboard=false;
      $('#quick-percent').value=quickProgress.value;paintQuick();return;
    }
    if(quickProgress&&event.target.id==='quick-range'){
      if(!quickProgress.cancelled&&!quickProgress.pointerActive&&!quickProgress.keyboard&&quickProgress.dirty)commitQuick(quickProgress.value);return;
    }
    if(event.target.id==='progress-date'){
      const id=$('#progress-form').dataset.id,entry=progressRecords(id).find(record=>record.date===event.target.value);
      $('#progress-percent').value=entry?entry.percent:'';return;
    }
    if(event.target.id==='hide-completed'){hideCompleted=event.target.checked;renderPeriods();}
    if(event.target.matches('[data-check]'))change(M.updateTask(state,event.target.dataset.check,{done:event.target.checked}),'toggle');
    if(event.target.id==='composer-document'){composerDoc=event.target.value;renderPeriods();}
  });
  document.addEventListener('focusout',event=>{
    if(event.target.id==='document-title'&&(state.flows||[]).some(f=>f.id===currentId)&&!event.target.value.trim()){
      event.target.value=doc().title;toast('Flow 이름은 비워 둘 수 없어 기존 이름을 유지했습니다.');
    }
    if(event.target.matches('[data-task-title]')&&!event.target.value.trim()){
      const t=task(event.target.dataset.taskTitle);if(t)event.target.value=t.title;
      toast('빈 제목은 반영하지 않았습니다. 삭제는 더 보기에서 할 수 있습니다.');
    }
  });
  document.addEventListener('keydown',event=>{
    if(quickProgress&&event.target.id==='quick-range'){
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].includes(event.key)){quickProgress.keyboard=true;quickProgress.cancelled=false;}
      if(event.key==='Enter'){event.preventDefault();quickProgress.cancelled=false;commitQuick(quickProgress.dirty?quickProgress.value:100);return;}
    }
    if(event.key==='Escape'&&moveSelection&&!$('#dialog').open){event.preventDefault();const selected=clearMove(true);focusMoveControl(selected);return;}
    if(event.altKey&&event.shiftKey&&event.key.toLowerCase()==='m'&&view==='document'&&!event.isComposing){
      const field=event.target.closest('.tle-textarea'),control=event.target.closest('[data-line-index]');
      if(field||control){event.preventDefault();const index=field?field.value.slice(0,field.selectionStart).split('\n').length-1:Number(control.dataset.lineIndex);beginMove(index,true);return;}
    }
    if(event.key==='Escape'&&inlinePicker){if(!event.target.matches('.tle-textarea'))event.preventDefault();closeDialog();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){
      if($('#dialog').open&&event.target.matches('input,textarea'))return;
      if(invalidDraft&&event.target.matches('.tle-textarea'))return;
      if(event.isComposing)return;event.preventDefault();event.stopPropagation();undo(event.shiftKey);
    }
    if(event.target.matches('[data-task-title]')&&event.key==='Enter'&&!event.isComposing){
      event.preventDefault();const t=task(event.target.dataset.taskTitle);if(t){composerOpen=true;composerDate=t.date;composerDoc=t.docId;renderPeriods();$('#composer-title').focus();}
    }
  },true);
  document.addEventListener('submit',event=>{
    event.preventDefault();const form=event.target;
    if(form.id==='quick-progress-form'){if(quickProgress)quickProgress.cancelled=false;commitQuick(quickProgress&&quickProgress.dirty?$('#quick-percent').valueAsNumber:100);return;}
    if(form.id==='progress-form'){
      const date=$('#progress-date').value,percent=$('#progress-percent').valueAsNumber;
      if(!validDate(date)||!Number.isInteger(percent)||percent<0||percent>100){$('#progress-form-error').hidden=false;$('#progress-form-error').textContent='날짜와 0~100 사이의 정수를 입력해 주세요.';return;}
      if(blocked||invalidDraft||failure){$('#progress-form-error').hidden=false;$('#progress-form-error').textContent='현재 입력과 저장 상태를 먼저 확인해 주세요.';return;}
      const id=form.dataset.id,next=M.recordProgress(state,id,date,percent);
      if(next===state){const entry=progressRecords(id).find(record=>record.date===date);if(entry&&entry.percent===percent){closeDialog();toast('이미 같은 값이 기록되어 있습니다.');return;}$('#progress-form-error').hidden=false;$('#progress-form-error').textContent='기록하지 못했습니다. 원래 할 일과 입력값을 확인해 주세요.';return;}
      if(change(next,'progress')){closeDialog();toast(dateLabel(date,false)+' 누적 '+percent+'%를 반영했습니다. 다른 날짜 기록은 그대로입니다.');}return;
    }
    if(form.id==='task-composer'){
      const input=$('#composer-title'),title=input.value.trim();if(!title)return;
      composerDoc=$('#composer-document').value;
      const pending=input.value;composerDrafts[draftKey()]='';
      const targetDoc=M.getDocument(state,composerDoc),scopeId=folder&&scope(folder)?folder:((state.flows||[]).some(f=>f.id===composerDoc)?composerDoc:targetDoc.folderId);
      if(scope(folder)&&scope(folder).kind==='folder'&&(state.flows||[]).some(f=>f.id===composerDoc)){composerDrafts[draftKey()]=pending;toast('일반 폴더의 할 일은 개인 문서에 작성해 주세요.');return;}
      if(change(M.addTask(state,{docId:composerDoc,title:title,date:composerDate,scopeId}),'add-task')){
        $('#composer-title').focus();toast('표시한 문서에 추가했습니다. Enter로 계속 적을 수 있습니다.');
      }else {composerDrafts[draftKey()]=pending;toast('추가하지 못했습니다. 대상 문서의 날짜·코드 구획을 확인해 주세요.');}
    }
    if(form.id==='date-form'){
      const date=$('#task-date').value;if(!validDate(date))return;
      if(change(M.updateTask(state,form.dataset.id,{date:date}),'date')){closeDialog();toast('날짜를 바꿨습니다. 원문 배치는 그대로입니다.');}
    }
    if(form.id==='detail-form'){
      const patch={title:$('#detail-title').value,note:$('#detail-note').value,time:$('#detail-time').value};
      if(change(M.updateTask(state,form.dataset.id,patch),'detail')){closeDialog();toast('같은 할 일의 원문에 반영했습니다.');}
    }
    if(form.id==='new-document-form'){
      const next=M.addDocument(state,{title:$('#new-title').value,folderId:$('#new-folder').value});
      if(change(next,'new-document')){currentId=next.documents[next.documents.length-1].id;view='document';folder='';closeDialog();render();hash();editor.focus(0);}
    }
    if(form.id==='section-form'){
      const date=$('#section-date').value;if(!validDate(date))return;
      if(form.dataset.mode==='compose'){composerOpen=true;composerDate=date;closeDialog();renderPeriods();$('#composer-title').focus();return;}
      closeDialog();const raw=editor.getValue();editor.replaceRange(raw.length,raw.length,(raw?'\n\n':'')+'['+date+']\n');editor.focus(editor.getValue().split('\n').length-1);
    }
    if(form.id==='rename-scope-form'){
      const next=M.renameScope(state,form.dataset.id,$('#scope-title').value.trim());
      if(change(next,'rename-scope')){closeDialog();toast('이름을 바꿨습니다. 기존 연결은 유지됩니다.');}
    }
    if(form.id==='create-folder-form'){
      const title=$('#new-scope-title').value.trim(),staged=stagePickerLine('- ');if(!staged||!title)return;
      const next=M.createFolderAt(staged.next,currentId,staged.index,title);
      if(next===staged.next){$('#folder-create-error').textContent='같은 이름의 하위 폴더가 있거나, 이 위치에는 만들 수 없습니다.';return;}
      if(change(next,'create-folder')){closeDialog();editor.focus(staged.index);toast('새 폴더를 만들고 이 문서에 연결했습니다.');}
    }
  });
  document.addEventListener('click',event=>{
    const b=event.target.closest('button');if(!b||b.disabled)return;
    if(b.dataset.pickScope)return selectScope(b.dataset.pickScope);
    if(b.dataset.pickTask)return selectTask(b.dataset.pickTask);
    if(b.dataset.view){navigate(b.dataset.view);return;}
    const a=b.dataset.action,id=b.dataset.id;if(!a)return;
    if(a==='progress-open'&&id){const latest=progressOf(id);return quickProgressDialog(id,b.dataset.date||(latest?latest.date:undefined));}
    if(a==='progress-more'&&quickProgress)return progressDialog(quickProgress.id,$('#quick-date').value);
    if(a==='progress-history-date')return progressDialog(id,b.dataset.date);
    if(a==='progress-day'){
      const selected=$('#progress-date').value;if(!validDate(selected))return;
      if(!save())return;anchor=selected;navigate('day',null,'');return;
    }
    if(a==='move-cancel'){closeDialog();const selected=clearMove(true);focusMoveControl(selected);return;}
    if(a==='move-row'){const index=Number(b.dataset.line);closeDialog(false);return beginMove(index,true);}
    if(a==='insert-plan')return insertPlanned(b.dataset.lineId,b.dataset.kind);
    if(a==='fold-row'){if(blocked||invalidDraft||failure)return;const index=Number(b.dataset.line);closeDialog(false);if(editor&&editor.toggleFold)editor.toggleFold(index);return;}
    if(a==='close-dialog')return closeDialog();
    if(a==='picker-scope'){const p=insertionPoint();return openPicker('scope',p.index,false,false,p.depth);}
    if(a==='picker-task'){const p=insertionPoint();return openPicker('task',p.index,false,false,p.depth);}
    if(a==='connect-at-end')return openPicker('scope',doc().lines.length,false);
    if(a==='child-scope'){const r=rowMeta()[Number(b.dataset.line)];return openPicker('scope',r.index+1,false,false,(r.depth||0)+1);}
    if(a==='indent-row'||a==='outdent-row'){
      const line=helperLine;closeDialog();editor.focus(line);if(!editor.indent(a==='outdent-row'))toast('이 위치는 더 옮길 수 없습니다. 기존 구조를 유지했습니다.');return;
    }
    if(a==='import-flow-items'){
      const row=rowMeta()[Number(b.dataset.line)],next=row&&M.importFlowTasks(state,currentId,row.id);
      if(!row){toast('Flow 연결을 다시 열어 주세요.');return;}
      if(next===state){
        const descendants=new Set(doc().lines.slice(row.index+1,row.subtreeEndIndex).map(line=>line.id));
        const existing=new Set(state.bindings.filter(binding=>binding.kind==='task'&&binding.docId===currentId&&descendants.has(binding.lineId)).map(binding=>binding.taskId));
        const originals=allTasks().filter(item=>item.docId===row.scopeId),missing=originals.filter(item=>!existing.has(item.id));
        toast(missing.length?'불러오지 못했습니다. 문서 크기와 연결 깊이를 확인해 주세요. 원문은 그대로입니다.':originals.length?'이미 불러온 항목은 다시 추가하지 않습니다.':'이 Flow 원문에는 불러올 할 일이 없습니다.');return;
      }
      if(change(next,'import-flow')){closeDialog();toast('Flow의 할 일을 연결했습니다. 기존 날짜와 완료 상태는 유지합니다.');}return;
    }
    if(a==='create-folder-dialog'){
      const parent=scope(picker&&picker.scopeId),suggested=$('#picker-search').value;
      return openDialog(parent?'새 하위 폴더':'새 폴더','<form id="create-folder-form"><p class="note">'+(parent?esc(scopePath(parent))+' 아래에 만듭니다.':'최상위 폴더를 만듭니다.')+'</p><label class="field"><span>폴더 이름</span><input id="new-scope-title" value="'+esc(suggested)+'" required maxlength="100"></label><p id="folder-create-error" role="alert"></p><div class="dialog-actions"><button type="button" data-action="close-dialog">취소</button><button class="primary" type="submit">만들고 연결</button></div></form>');
    }
    if(a==='scope-menu')return scopeMenu(Number(b.dataset.line));
    if(a==='scope-pick-task'){const r=rowMeta()[Number(b.dataset.line)];return openPicker('task',r.index+1,false,false,(r.depth||0)+1);}
    if(a==='scope-view')return navigate('all',null,id);
    if(a==='picker-all'){picker.scopeId='';renderPicker($('#picker-search').value);$('.picker-context').textContent='내 공간 전체';b.hidden=true;return;}
    if(a==='picker-new'){
      const text=$('#picker-search').value.trim(),staged=stagePickerLine('- [ ] '+text);
      if(!staged)return;
      if(staged.next===state||change(staged.next,'new-task')){closeDialog();editor.focus(staged.index);}return;
    }
    if(a==='unlink')return unlinkLine(Number(b.dataset.line));
    if(a==='rename-scope'){const s=scope(id);if(s)openDialog('이름 바꾸기','<form id="rename-scope-form" data-id="'+esc(id)+'"><label class="field"><span>이름</span><input id="scope-title" value="'+esc(s.title)+'" required maxlength="100"></label><p class="note">이름이 바뀌어도 문서의 연결은 유지됩니다.</p><div class="dialog-actions"><button type="button" data-action="close-dialog">취소</button><button class="primary" type="submit">이름 변경</button></div></form>');return;}
    if(a==='review')return review();
    if(a==='explore')return openDialog('탐색',navHTML());
    if(a==='document')return navigate('document',id);
    if(a==='all-tasks')return navigate('week',null,'');
    if(a==='folder')return navigate('all',null,b.dataset.folder);
    if(a==='source')return source(id);
    if(a==='undo')return undo(false);
    if(a==='redo')return undo(true);
    if(a==='retry'){if(save())toast('변경 내용을 다시 저장했습니다.');return;}
    if(a==='download')return download();
    if(a==='download-all')return downloadAll();
    if(a==='text-mode'){clearMove(false);textMode=!textMode;editor.setMode(textMode?'text':'live');$('#text-mode').setAttribute('aria-pressed',String(textMode));$('#text-mode').textContent=textMode?'서식 보기':'텍스트 보기';return;}
    if(a==='previous'||a==='next'){
      if(!save())return;const sign=a==='next'?1:-1;
      if(view==='month'){const d=new Date(anchor.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+sign);anchor=d.toISOString().slice(0,10);}else anchor=shift(anchor,sign*(view==='week'?7:1));
      composerOpen=false;render();hash();return;
    }
    if(a==='compose'){composerDate=b.dataset.date==='undated'?null:b.dataset.date;composerOpen=true;renderPeriods();$('#composer-title').focus();return;}
    if(a==='close-composer'){composerOpen=false;renderPeriods();return;}
    if(a==='task-date')return dateDialog(id);
    if(a==='restore-date'){if(change(M.restoreTaskDate(state,id),'date-restore')){closeDialog();toast('원래 날짜를 따릅니다.');}else{closeDialog();toast('이미 원래 날짜를 따르고 있습니다.');}return;}
    if(a==='undate'){if(change(M.updateTask(state,id,{date:null}),'date')){closeDialog();toast('날짜 미정으로 바꿨습니다.');}return;}
    if(a==='task-detail')return detailDialog(id);
    if(a==='task-menu'){const t=task(id);if(t)openDialog(t.title,'<div class="menu"><button data-action="progress-open" data-id="'+esc(id)+'" data-date="'+esc(b.dataset.date||anchor)+'">진행 기록</button><button data-action="task-detail" data-id="'+esc(id)+'">메모 · 시간</button><button data-action="task-date" data-id="'+esc(id)+'">날짜 변경</button><button data-action="source" data-id="'+esc(id)+'">원문 열기</button><button data-action="delete-confirm" data-id="'+esc(id)+'">할 일 삭제…</button></div>');return;}
    if(a==='delete-confirm'){const t=task(id);if(t&&progressOf(id)){openDialog('진행 기록을 유지합니다.','<p class="note">이 할 일에는 날짜별 진행 기록이 있습니다. 이 시안에서는 기록이 있는 할 일을 삭제하지 않습니다.</p><button data-action="close-dialog">닫기</button>');return;}if(t)openDialog('할 일을 삭제할까요?','<p>'+esc(t.title)+'</p><p class="note">원문의 이 체크 줄과 바로 붙은 날짜·시간·메모 속성도 삭제됩니다. 다른 일반 문장은 남습니다. 되돌리기로 복원할 수 있습니다.</p><div class="dialog-actions"><button data-action="close-dialog">취소</button><button data-action="delete-task" data-id="'+esc(id)+'">할 일 삭제</button></div>');return;}
    if(a==='delete-task'){if(change(M.removeTask(state,id),'delete')){closeDialog();toast('할 일을 삭제했습니다. 되돌리기로 복원할 수 있습니다.');}else{openDialog('원본을 유지했습니다.','<p class="note">다른 문서에서 연결한 할 일은 바로 삭제하지 않습니다. 해당 문서의 연결을 먼저 해제해 주세요.</p><button class="primary" data-action="close-dialog">확인</button>');}return;}
    if(a==='insert-task')return insertAfterLine('- [ ] ');
    if(a==='insert-note')return insertAfterLine('');
    if(a==='date-section'||a==='choose-compose-date'){openDialog(a==='date-section'?'날짜 구획 추가':'할 일을 추가할 날짜','<form id="section-form" data-mode="'+(a==='date-section'?'document':'compose')+'"><label class="field"><span>날짜</span><input id="section-date" type="date" value="'+anchor+'" required></label><p class="note">'+(a==='date-section'?'문서 끝에 날짜 구획을 넣습니다. 아래에서는 Enter로 할 일을 계속 쓸 수 있습니다.':'이 날짜 아래에서 할 일을 계속 추가할 수 있습니다.')+'</p><div class="dialog-actions"><button type="button" data-action="close-dialog">취소</button><button class="primary" type="submit">'+(a==='date-section'?'구획 넣기':'입력 시작')+'</button></div></form>');return;}
    if(a==='new-document')return openDialog('새 문서','<form id="new-document-form"><label class="field"><span>문서 제목</span><input id="new-title" placeholder="새 문서" maxlength="100"></label><label class="field"><span>보관할 폴더</span><select id="new-folder">'+M.scopes(state).filter(s=>s.kind==='folder').map(s=>'<option value="'+esc(s.id)+'" '+(s.id===(folder||doc().folderId)?'selected':'')+'>'+esc(scopePath(s))+'</option>').join('')+'</select></label><div class="dialog-actions"><button type="button" data-action="close-dialog">취소</button><button class="primary" type="submit">문서 열기</button></div></form>');
    if(a==='document-menu')return openDialog('문서와 변경','<div class="menu"><button data-action="download">현재 문서 텍스트 받기</button><button data-action="undo" '+(!past.length?'disabled':'')+'>되돌리기</button><button data-action="redo" '+(!future.length?'disabled':'')+'>다시 실행</button><button data-action="new-document">새 문서</button></div>');
    if(a==='fail-next'){failNext=true;closeDialog();toast('다음 저장을 한 번 실패시킵니다. 내용을 바꿔 보세요.');return;}
    if(a==='reload'){if(save())location.reload();return;}
    if(a==='reset-dialog')return openDialog('이 시안만 초기화할까요?','<p class="note">이 시안에서 작성한 문서와 할 일만 초기 예시로 돌아갑니다. 기존 FlowMe 및 이전 시안의 자료는 건드리지 않습니다.</p><div class="dialog-actions"><button data-action="close-dialog">취소</button><button data-action="reset-confirm">시안 초기화</button></div>');
    if(a==='reset-confirm'){
      try{storage.removeItem(M.KEY);}catch(_){toast('초기화하지 못했습니다.');return;}
      clearMove(false);clearTimeout(timer);state=M.createState();expected=null;blocked=false;invalidDraft=false;failure='';dirty=false;past=[];future=[];composerDrafts={};lastChange='';failNext=false;currentId=state.documents[0].id;view='document';folder='';anchor=TODAY;closeDialog();render();hash(true);toast('이 시안만 초기 예시로 되돌렸습니다.');
    }
  });
  document.addEventListener('pointerdown',event=>{
    if(moveSelection&&!event.target.closest('.tle-move-handle,.tle-move-target-button,.tle-move-depth-button'))clearMove(false);
  },true);
  $('#dialog').addEventListener('pointerdown',event=>{
    if(!quickProgress)return;
    if(event.target.id==='quick-range'){quickProgress.pointerActive=true;quickProgress.keyboard=false;quickProgress.cancelled=false;quickProgress.pointerId=event.pointerId;return;}
    if(event.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}
  });
  document.addEventListener('pointerup',event=>{
    const q=quickProgress;if(!q||!q.pointerActive||event.pointerId!==q.pointerId)return;
    q.pointerActive=false;setTimeout(()=>{if(quickProgress===q&&!q.cancelled&&q.dirty)commitQuick(q.value);},0);
  });
  document.addEventListener('pointercancel',event=>{
    const q=quickProgress;if(!q||!q.pointerActive||event.pointerId!==q.pointerId)return;
    q.pointerActive=false;q.cancelled=true;q.dirty=false;q.value=q.initial;$('#quick-percent').value=q.value;paintQuick();
  });
  $('#dialog').addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
  $('#dialog').addEventListener('keydown',event=>{
    if(event.key!=='Tab'||inlinePicker)return;
    const list=[...$('#dialog').querySelectorAll('button:not(:disabled),input,select,textarea,a[href],summary')].filter(e=>e.getClientRects().length);
    if(!list.length)return;
    if(event.shiftKey&&document.activeElement===list[0]){event.preventDefault();list[list.length-1].focus();}
    else if(!event.shiftKey&&document.activeElement===list[list.length-1]){event.preventDefault();list[0].focus();}
  });
  window.addEventListener('beforeunload',event=>{if((dirty&&!save())||failure){event.preventDefault();event.returnValue='';}});
  window.addEventListener('storage',event=>{if(event.key===M.KEY&&event.newValue!==expected){blocked=true;failure='다른 탭의 저장본이 바뀌었습니다. 현재 입력은 남아 있고 덮어쓰지 않습니다. 문서를 텍스트로 보관한 뒤 다시 열어 주세요.';showStatus();}});
  window.addEventListener('popstate',()=>{if(!save()){hash(true);return;}clearMove(false);readHash();composerOpen=false;lastChange='';render();});
  // Native keyboards can resize only the visual viewport, not the document layout.
  let viewportFrame=0;
  function syncViewport(){
    viewportFrame=0;
    const viewport=window.visualViewport,root=document.documentElement;
    const height=viewport?viewport.height:window.innerHeight,top=viewport?viewport.offsetTop:0;
    root.style.setProperty('--vv-height',Math.max(1,height)+'px');
    root.style.setProperty('--vv-top',Math.max(0,top)+'px');
    root.style.setProperty('--vv-bottom',Math.max(0,window.innerHeight-height-top)+'px');
    if(quickProgress)positionQuickDialog();
  }
  function scheduleViewport(){if(!viewportFrame)viewportFrame=requestAnimationFrame(syncViewport);}
  window.addEventListener('resize',scheduleViewport);
  if(window.visualViewport){window.visualViewport.addEventListener('resize',scheduleViewport);window.visualViewport.addEventListener('scroll',scheduleViewport);}
  readHash();render();hash(true);syncViewport();
})();
