/* Isolated standalone UI. Writes are restricted to one PoC-only localStorage key. */
(() => {
  'use strict';
  const M = window.FlowMeV41, TODAY = M.TODAY;
  const STORAGE_KEY = 'flow:poc:personal-workspace:v1:standalone-demo', STORAGE_VERSION = 1;
  let bootNotice = '';
  function loadSession() {
    try {
      const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return null;
      const payload=JSON.parse(raw);
      if(payload?.version!==STORAGE_VERSION||M.validate(payload.state).length||payload.undo&&M.validate(payload.undo).length)throw new Error('invalid-payload');
      return {state:payload.state,history:payload.undo?[{state:payload.undo,message:'새로고침 전 변경'}]:[]};
    } catch {
      bootNotice='저장된 PoC 데이터가 손상되어 안전한 예시 상태로 열었습니다. 운영 데이터에는 접근하지 않았습니다.';
      return null;
    }
  }
  const restored=loadSession();
  let state = restored?.state || M.seed(), history = restored?.history || [], view = {type:'folder',id:'unfiled'}, period = 'today', anchor = TODAY;
  let collapsed = new Set(), dialogKind = '', dialogData = null, initialForm = '', returnFocus = null, showEmptyDates = false;
  let drag = null, dragHold = 0, autoScrollFrame = 0, autoScrollSpeed = 0, autoScrollTarget = null, cancelledTouch = null, simulation = null, drafts = new Map(), renderedDraftKey = '';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths = {
    folder:'M3 7V5h6l2 2h10v13H3z', calendar:'M4 5h16v16H4z M4 9h16 M8 3v4 M16 3v4',
    check:'M4 12l5 5L20 6', flow:'M7 12l10-7 M7 12l10 7 M7 12a2 2 0 1 0-4 0a2 2 0 1 0 4 0 M21 5a2 2 0 1 0-4 0a2 2 0 1 0 4 0 M21 19a2 2 0 1 0-4 0a2 2 0 1 0 4 0',
    chevron:'M9 5l7 7-7 7', down:'M5 9l7 7 7-7', plus:'M12 4v16 M4 12h16', more:'M5 12h.01 M12 12h.01 M19 12h.01',
    grip:'M8 5h.01 M16 5h.01 M8 12h.01 M16 12h.01 M8 19h.01 M16 19h.01', undo:'M9 4L4 9l5 5 M4 9h9a6 6 0 0 1 0 12'
  };
  const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.folder}"${['grip','more'].includes(name)?' stroke-width="3"':''}/></svg>`;
  const task = id => state.tasks.find(t => t.id === id), flow = id => state.flows.find(f => f.id === id);
  const folderName = id => state.folders.find(f => f.id === id)?.title || '미분류';
  const dateAdd = (d,n) => {const x = new Date(`${d}T12:00:00Z`);x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
  const dateLabel = d => !d?'날짜 미정':d===TODAY?'오늘':d===dateAdd(TODAY,1)?'내일':`${Number(d.slice(5,7))}.${Number(d.slice(8,10))}`;
  const longDate = d => `${Number(d.slice(5,7))}월 ${Number(d.slice(8,10))}일 (${['일','월','화','수','목','금','토'][new Date(d+'T12:00:00Z').getUTCDay()]})`;
  const folderContext = id => `folder:${id || 'unfiled'}`;
  const folderPath = id => {const p=[];let f=state.folders.find(x=>x.id===id);while(f){p.unshift(f);f=state.folders.find(x=>x.id===f.parentId);}return p;};
  function focusToken(el) {
    if (!el || el===document.body || el===document.documentElement) return null;
    if (el.id) return {id:el.id};
    return {action:el.dataset.action,idData:el.dataset.id,context:el.dataset.context,label:el.getAttribute('aria-label')};
  }
  function restoreFocus(token) {
    let el=token?.id?document.getElementById(token.id):null;
    if(!el&&token)el=$$('button,input,a').find(x=>x.dataset.action===token.action&&x.dataset.id===token.idData&&x.dataset.context===token.context&&x.getAttribute('aria-label')===token.label);
    if(!el&&token?.action)el=$$('button,input,a').find(x=>x.dataset.action===token.action&&x.dataset.id===token.idData&&x.dataset.context===token.context);
    (el || $('#main')).focus({preventScroll:true});
  }
  function notify(message, canUndo=true) {
    $('#notice').textContent=message;$('#toast').hidden=false;
    $('#toast [data-action="undo"]').hidden=!canUndo||!history.length;
  }
  function setSaveStatus(message,kind='ready') {
    const node=$('#save-status');if(!node)return;node.textContent=message;node.dataset.kind=kind;
  }
  function persistSession(nextState,nextHistory) {
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify({version:STORAGE_VERSION,state:nextState,undo:nextHistory.length?nextHistory[nextHistory.length-1].state:null,savedAt:new Date().toISOString()}));
      setSaveStatus('저장됨 · 새로고침 복원','saved');return true;
    } catch {
      setSaveStatus('저장 실패 · 변경 안 됨','failed');return false;
    }
  }
  function commit(action, message) {
    const focus=focusToken(document.activeElement);
    const r=M.apply(state,action);
    if(r.error){notify(r.message || r.error,false);return false;}
    if(r.changed){
      const nextHistory=[{state,message:message || r.message}];
      if(!simulation&&!persistSession(r.state,nextHistory)){notify('PoC 저장 영역에 저장하지 못해 변경하지 않았습니다.',false);return false;}
      history=nextHistory;state=r.state;render();restoreFocus(focus);
    }
    notify(r.changed?(message || r.message):r.message, r.changed);return r.changed;
  }
  function undo() {
    if(!history.length)return;
    const nextHistory=history.slice(0,-1),nextState=history[history.length-1].state;
    if(!simulation&&!persistSession(nextState,nextHistory)){notify('PoC 저장 영역에 저장하지 못해 되돌리지 않았습니다.',false);return;}
    history=nextHistory;state=nextState;render();notify('직전 변경을 되돌렸습니다.',!!history.length);
  }
  function resetDemo() {
    try {localStorage.removeItem(STORAGE_KEY);}
    catch {setSaveStatus('초기화 실패 · 변경 안 됨','failed');notify('PoC 저장 영역을 초기화하지 못했습니다.',false);return;}
    state=M.seed();history=[];view={type:'folder',id:'unfiled'};period='today';anchor=TODAY;drafts=new Map();collapsed=new Set();showEmptyDates=false;renderedDraftKey='';render();setSaveStatus('초기 상태 · 아직 저장 안 됨','ready');notify('독립 데모만 초기화했습니다. 다른 저장 데이터는 건드리지 않았습니다.',false);
  }
  function navRow(title,action,id,ic,selected,extra='') {
    return `<button class="nav-row" data-action="${action}" data-id="${esc(id || '')}" ${selected?'aria-current="page"':''} ${extra}>${ic?icon(ic):''}<span>${esc(title)}</span></button>`;
  }
  function folderTree(parentId=null,depth=0) {
    return state.folders.filter(f=>f.parentId===parentId).map(f=>{
      const child=state.folders.some(x=>x.parentId===f.id);
      return `<div class="folder-row" style="--depth:${depth}">${child?`<button class="expand" data-action="collapse" data-id="${f.id}" aria-label="${esc(f.title)} ${collapsed.has(f.id)?'펼치기':'접기'}" aria-expanded="${!collapsed.has(f.id)}">${icon(collapsed.has(f.id)?'chevron':'down')}</button>`:'<span class="expand-space" aria-hidden="true"></span>'}${navRow(f.title,'folder',f.id,'folder',view.type==='folder'&&view.id===f.id,`data-drop="folder" data-folder="${f.id}"`)}</div>${!collapsed.has(f.id)?folderTree(f.id,depth+1):''}`;
    }).join('');
  }
  function sidebarHTML() {
    return `<div class="side-inner"><div class="brand">FlowMe</div>${navRow('할 일','todo','today','check',view.type==='todo')}
    <div class="sub">${navRow('오늘','todo','today','',view.type==='todo'&&period==='today',`data-drop="date" data-date="${TODAY}"`)}${navRow('이번 주','todo','week','',view.type==='todo'&&period==='week','data-drop="period"')}${navRow('날짜 미정','todo','undated','',view.type==='todo'&&period==='undated','data-drop="undated"')}</div>
    ${navRow('캘린더','calendar','','calendar',view.type==='calendar','data-drop="period"')}
    <div class="folder-heading"><span>폴더</span><button class="icon-btn" data-action="add-folder" aria-label="폴더 만들기">${icon('plus')}</button></div>${folderTree()}${navRow('미분류','folder','unfiled','folder',view.type==='folder'&&view.id==='unfiled','data-drop="folder" data-folder="unfiled"')}</div>`;
  }
  function dragDestinationsHTML(kind,id) {
    const x=kind==='flow'?flow(id):task(id);if(!x)return '';
    const currentFolder=kind==='flow'?x.folderId:M.effectiveFolder(state,x);
    const dateSection=kind==='task'?`<section class="drag-destination-section"><h2>실행 날짜</h2><div class="drag-target-grid dates">
      <div class="drag-target ${x.date===TODAY?'current':''}" data-drop="date" data-date="${TODAY}"><span>오늘</span>${x.date===TODAY?'<small>현재</small>':''}</div>
      <div class="drag-target ${x.date===dateAdd(TODAY,1)?'current':''}" data-drop="date" data-date="${dateAdd(TODAY,1)}"><span>내일</span>${x.date===dateAdd(TODAY,1)?'<small>현재</small>':''}</div>
      <div class="drag-target" data-drop="period"><span>다른 날짜</span><small>놓은 뒤 선택</small></div>
      <div class="drag-target ${!x.date?'current':''}" data-drop="undated"><span>날짜 미정</span>${!x.date?'<small>현재</small>':''}</div>
    </div></section>`:'';
    const folderTargets=[...state.folders.map(f=>({id:f.id,label:folderPath(f.id).map(part=>part.title).join(' / ')})),{id:'unfiled',label:'미분류'}];
    const folderSection=kind==='task'&&x.flowId
      ?`<section class="drag-destination-section"><h2>정리 폴더</h2><p class="drag-folder-note">이 할 일은 ‘${esc(flow(x.flowId).title)}’ Flow에 속해 있어 폴더를 따로 옮길 수 없습니다. Flow 전체를 옮겨 주세요.</p></section>`
      :`<section class="drag-destination-section"><h2>정리 폴더</h2><div class="drag-target-grid folders">${folderTargets.map(target=>{const targetId=target.id==='unfiled'?null:target.id;return `<div class="drag-target ${currentFolder===targetId?'current':''}" data-drop="folder" data-folder="${target.id}">${icon('folder')}<span>${esc(target.label)}</span>${currentFolder===targetId?'<small>현재</small>':''}</div>`;}).join('')}</div></section>`;
    return `${dateSection}${folderSection}`;
  }
  function openDragDestinations() {
    if(!drag?.active||!drag.touch||drag.panelOpen)return;
    const x=drag.kind==='flow'?flow(drag.id):task(drag.id),panel=$('#drag-destinations');if(!x)return;
    const status=drag.kind==='flow'?'폴더에 놓으세요 · 밖에 놓으면 취소':x.flowId?'실행 날짜에 놓으세요 · 폴더는 Flow와 함께 이동':'왼쪽은 날짜·폴더, 오른쪽은 순서 · 밖에 놓으면 취소';
    $('#drag-item-title').textContent=x.title;$('#drag-destinations-status').textContent=status;$('#drag-destinations-body').innerHTML=dragDestinationsHTML(drag.kind,drag.id);
    panel.hidden=false;panel.setAttribute('aria-hidden','true');drag.panelOpen=true;document.body.classList.add('drag-destinations-open');
  }
  function closeDragDestinations() {
    const panel=$('#drag-destinations');panel.hidden=true;$('#drag-destinations-body').innerHTML='';document.body.classList.remove('drag-destinations-open');if(drag)drag.panelOpen=false;
  }
  function quickHTML() {
    return `<form class="quick" id="quick-form"><label for="quick-title">빠른 할 일</label><div class="input-row"><input id="quick-title" name="title" placeholder="할 일을 적어 주세요" value="${esc(drafts.get(draftKey())||'')}" required maxlength="160" autocomplete="off"><button class="primary" type="submit">추가</button></div></form>`;
  }
  const draftKey=()=>`${view.type}:${view.id||''}:${view.type==='todo'?period+':'+anchor:''}`;
  function captureDraft(){if(renderedDraftKey&&$('#quick-title'))drafts.set(renderedDraftKey,$('#quick-title').value);}
  function sourceLabel(t) {return t.flowId?`${folderName(M.effectiveFolder(state,t))} / ${flow(t.flowId).title}`:folderName(t.folderId);}
  function timeMeta(t) {
    if(!t.time)return '';
    const [hour,minute]=t.time.split(':'), short=`${Number(hour)}:${minute}`;
    const korean=minute==='00'?`${Number(hour)}시`:`${Number(hour)}시 ${Number(minute)}분`, compact=korean.replace(' ','');
    return [t.time,short,korean,compact].some(label=>t.title.includes(label))?'':` · ${t.time}`;
  }
  function taskRow(id,context,showSource=false,showDate=true) {
    const t=task(id);if(!t)return '';
    return `<div class="row ${t.done?'done':''}" data-task="${t.id}" data-context="${esc(context)}" data-drop="row">
      <button class="handle desktop-handle" data-action="move" data-kind="task" data-id="${t.id}" data-context="${esc(context)}" data-drag="task" aria-label="${esc(t.title)} 끌어서 이동 또는 이동 메뉴">${icon('grip')}</button>
      <label class="check"><input type="checkbox" data-action="complete" data-id="${t.id}" aria-label="${esc(t.title)} 완료" ${t.done?'checked':''}></label>
      <button class="row-title" data-action="edit" data-id="${t.id}"><span class="task-title">${esc(t.title)}</span>${showSource?`<small>${esc(sourceLabel(t))}${esc(timeMeta(t))}</small>`:''}</button>
      ${showDate?`<button class="date" data-action="move" data-kind="task" data-id="${t.id}" data-context="${esc(context)}" aria-label="${esc(t.title)} 날짜 변경">${dateLabel(t.date)}</button>`:''}
      <button class="icon-btn more desktop-more" data-action="move" data-kind="task" data-id="${t.id}" data-context="${esc(context)}" aria-label="${esc(t.title)} 이동 메뉴">${icon('more')}</button>
      <button class="touch-handle" data-action="move" data-kind="task" data-id="${t.id}" data-context="${esc(context)}" data-drag="task" aria-label="${esc(t.title)} 이동" aria-describedby="touch-drag-help">${icon('grip')}</button>
    </div>`;
  }
  function taskList(context,showSource=false,showDate=true,showEmpty=true) {return M.taskIds(state,context).map(id=>taskRow(id,context,showSource,showDate)).join('') || (showEmpty?'<p class="empty">아직 할 일이 없습니다.</p>':'');}
  function flowRow(f) {
    return `<div class="row flow-row"><button class="handle" data-action="move" data-kind="flow" data-id="${f.id}" data-drag="flow" aria-label="${esc(f.title)} 끌어서 폴더 이동">${icon('grip')}</button><span class="flow-icon">${icon('flow')}</span><button class="row-title" data-action="flow" data-id="${f.id}">${esc(f.title)}<small class="flow-origin">${esc(f.originLabel || '저장된 Flow')}</small></button><button class="icon-btn more" data-action="move" data-kind="flow" data-id="${f.id}" aria-label="${esc(f.title)} 폴더 이동">${icon('more')}</button><span class="chevron">${icon('chevron')}</span></div>`;
  }
  function crumb(id) {const p=folderPath(id);return p.length>1?`<nav class="crumb" aria-label="현재 폴더 경로">${p.map((f,i)=>`${i?icon('chevron'):''}<button data-action="folder" data-id="${f.id}">${esc(f.title)}</button>`).join('')}</nav>`:'';}
  function folderHTML() {
    const id=view.id==='unfiled'?null:view.id, children=state.folders.filter(f=>f.parentId===id&&id!==null), flows=state.flows.filter(f=>f.folderId===id);
    return `${crumb(id)}<div class="heading"><h1>${esc(folderName(id))}</h1></div>${quickHTML()}<section class="section"><h2>할 일</h2>${taskList(folderContext(id))}</section>
      <section class="section"><h2>Flow</h2>${flows.map(flowRow).join('')||'<p class="empty">이 폴더에는 Flow가 없습니다.</p>'}</section>
      ${children.length?`<section class="section"><h2>하위 폴더</h2>${children.map(f=>`<button class="folder-link" data-action="folder" data-id="${f.id}" data-drop="folder" data-folder="${f.id}">${icon('folder')}${esc(f.title)}</button>`).join('')}</section>`:''}`;
  }
  function flowHTML() {
    const f=flow(view.id);if(!f)return '';
    return `<nav class="crumb" aria-label="Flow 위치"><button data-action="folder" data-id="${f.folderId||'unfiled'}">${esc(folderName(f.folderId))}</button>${icon('chevron')}<span>Flow</span></nav><div class="heading"><div><h1>${esc(f.title)}</h1><p class="flow-origin">${esc(f.originLabel || '저장된 Flow')} · 원본은 읽기 전용</p></div><button class="secondary" data-action="move" data-kind="flow" data-id="${f.id}">폴더 이동</button></div>${f.steps.map(s=>`<section class="section"><h2>${esc(s.title)}</h2>${taskList(`flow:${f.id}:${s.id}`)}</section>`).join('')}`;
  }
  function periodDates() {
    if(period==='today')return [TODAY];
    if(period==='date')return [anchor];
    if(period==='week'){const dow=new Date(anchor+'T12:00:00Z').getUTCDay();const start=dateAdd(anchor,-((dow+6)%7));return Array.from({length:7},(_,i)=>dateAdd(start,i));}
    const start=anchor.slice(0,8)+'01', days=new Date(Number(anchor.slice(0,4)),Number(anchor.slice(5,7)),0).getDate();
    return Array.from({length:days},(_,i)=>dateAdd(start,i));
  }
  function dateSection(d) {
    const context=`date:${d}`, ids=M.taskIds(state,context), manual=Object.prototype.hasOwnProperty.call(state.orders,context);
    const emptyCopy=period==='today';
    return `<section class="section day-target" data-drop="date" data-date="${d}"><div class="date-heading"><h2>${longDate(d)}${d===TODAY&&period!=='today'?' · 오늘':''}</h2><div class="date-actions">${ids.length>1?`<span class="sort-mode">${manual?'직접 정렬':'시간순'}</span>`:''}<button class="text-link" data-action="new-on-date" data-id="${d}" aria-label="${longDate(d)}에 할 일 추가">${icon('plus')}</button></div></div>${taskList(context,true,false,emptyCopy)}</section>`;
  }
  function todoHTML() {
    const dates=period==='undated'?[]:periodDates();
    const activeDates=dates.filter(d=>M.taskIds(state,`date:${d}`).length||d===TODAY), emptyCount=dates.length-activeDates.length;
    const visibleDates=period==='month'&&!showEmptyDates?activeDates:dates;
    return `<div class="heading"><h1>할 일</h1>${['week','month','date'].includes(period)?`<div class="toolbar"><button data-action="period-prev" aria-label="이전 기간">${icon('chevron').replace('<svg ','<svg style="transform:rotate(180deg)" ')}</button><span class="muted">${anchor.slice(0,7).replace('-','. ')}</span><button data-action="period-next" aria-label="다음 기간">${icon('chevron')}</button></div>`:''}</div>
      <nav class="periods" aria-label="기간 선택">${[['today','오늘'],['week','주간'],['month','월간'],['undated','날짜 미정']].map(([p,n])=>`<button data-action="todo" data-id="${p}" aria-pressed="${period===p}" ${p==='today'?`data-drop="date" data-date="${TODAY}"`:p==='undated'?'data-drop="undated"':'data-drop="period"'}>${n}</button>`).join('')}</nav>${['today','undated'].includes(period)?quickHTML():''}
      ${period==='undated'?`<section class="section"><h2>날짜 미정</h2>${taskList('undated',true)}</section>`:`${period==='today'&&M.taskIds(state,'overdue').length?`<section class="section"><h2>지난 미완료</h2>${taskList('overdue',true)}</section>`:''}${visibleDates.map(dateSection).join('')}${period==='month'&&emptyCount?`<button class="empty-dates-toggle" data-action="toggle-empty" aria-expanded="${showEmptyDates}">${showEmptyDates?'빈 날짜 접기':`할 일 없는 날짜 ${emptyCount}일 보기`}</button>`:''}`}`;
  }
  function calendarHTML() {
    const start=anchor.slice(0,8)+'01', first=dateAdd(start,-new Date(start+'T12:00:00Z').getUTCDay());
    const days=new Date(Number(anchor.slice(0,4)),Number(anchor.slice(5,7)),0).getDate();
    const cellCount=Math.ceil((new Date(start+'T12:00:00Z').getUTCDay()+days)/7)*7;
    return `<div class="heading"><h1>캘린더</h1><div class="month-nav"><button data-action="month-prev" aria-label="이전 달">${icon('chevron').replace('<svg ','<svg style="transform:rotate(180deg)" ')}</button><strong>${Number(anchor.slice(0,4))}년 ${Number(anchor.slice(5,7))}월</strong><button data-action="month-next" aria-label="다음 달">${icon('chevron')}</button></div></div>
    <div class="calendar">${['일','월','화','수','목','금','토'].map(d=>`<div class="day-name">${d}</div>`).join('')}${Array.from({length:cellCount},(_,i)=>{const d=dateAdd(first,i),ids=M.taskIds(state,`date:${d}`);return `<div class="cell ${d.slice(0,7)!==anchor.slice(0,7)?'outside':''} ${d===TODAY?'today':''}" data-drop="date" data-date="${d}"><button class="day-number" data-action="day" data-id="${d}" aria-label="${d} 할 일 보기">${Number(d.slice(8))}</button>${ids.length?`<button class="day-count" data-action="day" data-id="${d}" aria-label="${d} 할 일 ${ids.length}개 보기">${ids.length}개</button>`:''}${ids.slice(0,2).map(id=>`<button class="event ${task(id).done?'done':''}" data-action="edit" data-id="${id}" aria-label="${esc(task(id).title)}${task(id).done?' 완료됨':''}">${esc(task(id).title)}</button>`).join('')}${ids.length>2?`<button class="event" data-action="day" data-id="${d}">+${ids.length-2}개 더</button>`:''}</div>`;}).join('')}</div><div class="calendar-detail">${dateSection(anchor)}</div>`;
  }
  function render() {
    const active=focusToken(document.activeElement);
    captureDraft();
    if(view.type==='folder'&&view.id!=='unfiled'&&!state.folders.some(f=>f.id===view.id))view={type:'folder',id:'move'};
    $('#sidebar').innerHTML=sidebarHTML();
    $('#content').innerHTML=view.type==='folder'?folderHTML():view.type==='flow'?flowHTML():view.type==='calendar'?calendarHTML():todoHTML();
    renderedDraftKey=draftKey();
    $('#undo').disabled=!history.length;
    renderScenario();
    if(document.activeElement===document.body&&active)restoreFocus(active);
  }
  function openDialog(title,html,kind='',data=null,cls='') {
    returnFocus=focusToken(document.activeElement);dialogKind=kind;dialogData=data;
    $('#dialog-title').textContent=title;$('#dialog-body').innerHTML=html;$('#dialog').className=cls;
    initialForm=$('#edit-form')?new URLSearchParams(new FormData($('#edit-form'))).toString():'';
    if(!$('#dialog').open)$('#dialog').showModal();
    const focus=$('#dialog-body button:not([disabled]),#dialog-body input:not([disabled]),#dialog-body select:not([disabled]),#dialog-body textarea:not([disabled]),#dialog-body a[href]');if(focus)focus.focus();
  }
  function closeDialog(force=false) {
    if(!force&&dialogKind==='edit'&&new URLSearchParams(new FormData($('#edit-form'))).toString()!==initialForm){
      if(!$('#discard-warning'))$('#dialog-body').insertAdjacentHTML('beforeend','<div id="discard-warning" class="error" role="alert">저장하지 않은 변경이 있습니다. <button class="secondary" data-action="discard">변경 버리고 닫기</button></div>');
      return false;
    }
    $('#dialog').close();dialogKind='';dialogData=null;restoreFocus(returnFocus);return true;
  }
  function folderOptions(selected) {return `<option value="unfiled" ${!selected?'selected':''}>미분류</option>${state.folders.map(f=>`<option value="${f.id}" ${selected===f.id?'selected':''}>${esc(folderPath(f.id).map(x=>x.title).join(' / '))}</option>`).join('')}`;}
  function openMove(kind,id,context='') {
    const x=kind==='flow'?flow(id):task(id);if(!x)return;
    const ids=kind==='task'&&context?M.taskIds(state,context):[], index=ids.indexOf(id), manual=Object.prototype.hasOwnProperty.call(state.orders,context);
    const orderSection=ids.length>1?`<section class="move-section"><h3>이 목록의 순서</h3><div class="toolbar move-order"><button class="secondary" data-action="reorder" data-id="${id}" data-position="top" ${index<=0?'disabled':''}>맨 위</button><button class="secondary" data-action="reorder" data-id="${id}" data-direction="-1" ${index<=0?'disabled':''}>위로</button><button class="secondary" data-action="reorder" data-id="${id}" data-direction="1" ${index<0||index===ids.length-1?'disabled':''}>아래로</button><button class="secondary" data-action="reorder" data-id="${id}" data-position="bottom" ${index<0||index===ids.length-1?'disabled':''}>맨 아래</button></div>${manual&&context.startsWith('date:')?`<button class="text-link reset-order" data-action="reset-order" data-context="${esc(context)}">시간순으로 되돌리기</button>`:''}<p class="dialog-note">${context.startsWith('flow:')?'이 보기만 바뀌고 Flow 단계의 원본 순서는 유지됩니다.':'표시 순서만 바뀌고 날짜와 시간은 유지됩니다.'}</p></section>`:'';
    const dateSection=kind==='task'?`<section class="move-section"><h3>실행 날짜</h3><form id="schedule-form"><label for="move-date" class="muted">날짜</label><div class="input-row"><input id="move-date" type="date" name="date" value="${x.date||''}" required><button class="primary" type="submit">배치</button></div></form><div class="toolbar"><button class="secondary" data-action="schedule-now" data-id="${id}" data-date="${TODAY}">오늘</button><button class="secondary" data-action="schedule-now" data-id="${id}" data-date="${dateAdd(TODAY,1)}">내일</button><button class="text-link" data-action="schedule-now" data-id="${id}" data-date="">날짜 지우기</button></div></section>`:'';
    const folderSection=`<section class="move-section"><h3>정리 폴더</h3>${kind==='task'&&x.flowId?`<p class="dialog-note">이 할 일은 ${esc(flow(x.flowId).title)} 안에 있습니다. Flow 소속을 유지하기 위해 따로 폴더로 옮길 수 없습니다.</p><button class="source-link" data-action="source" data-id="${x.flowId}">Flow에서 보기</button>`:`<form id="folder-move-form"><label class="muted" for="move-folder">폴더</label><div class="input-row"><select id="move-folder" name="folderId">${folderOptions(x.folderId)}</select><button class="primary" type="submit">이동</button></div></form>`}</section>`;
    openDialog(`${x.title} 이동`,`${orderSection}${dateSection}${folderSection}`,'move',{kind,id,context},'move-sheet');
  }
  function openEdit(id) {
    const t=task(id);if(!t)return;
    openDialog('할 일 편집',`<form id="edit-form"><div class="field"><label for="edit-title">할 일</label><input id="edit-title" name="title" value="${esc(t.title)}" required maxlength="160"></div><div class="field"><label for="edit-memo">메모</label><textarea id="edit-memo" name="memo" maxlength="4000">${esc(t.memo)}</textarea></div><div class="field"><label for="edit-time">시간</label><input id="edit-time" name="time" type="time" value="${esc(t.time)}"></div><p class="dialog-note">${esc(sourceLabel(t))} · ${dateLabel(t.date)}${t.done?' · 완료':''}</p><div class="dialog-actions"><button type="button" data-action="close">취소</button><button class="primary" type="submit">저장</button></div></form>`,'edit',{id},'editor');
  }
  function openReview() {
    openDialog('사용 안내',`<section class="review-block"><h3>직접 확인할 흐름</h3><p>미분류의 네 Flow 확인 → 폴더 이동 → Item을 오늘에 배치 → 순서 조정 → 완료 → 되돌리기 → 새로고침</p><button class="primary" data-action="simulation">시나리오 따라보기</button><p class="dialog-note">따라보기는 저장되지 않는 별도 예시입니다. 종료하면 지금 작업으로 돌아옵니다.</p></section>
      <section class="review-block"><h3>네 저장 출처</h3><div class="flow-map">Flow Map 저장본 · 이사 준비 저장본<br>개인 초안 · 메모에서 만든 개인 Flow<br>개인 사본 · 우리집 세탁기 관리<br>기존 저장본 · 입주 사전점검</div><p>네 Flow는 처음에 미분류에 나타납니다. Flow Item은 부모 Flow의 폴더를 상속하며, 날짜 이동은 개인 실행 위치만 바꿉니다.</p></section>
      <section class="review-block"><h3>시험 중인 구성</h3><ul><li>날짜 목록은 기본 시간순, 이동 후에는 직접 정렬</li><li>월간의 빈 날짜는 접어서 본문 길이 축소</li><li>폴더·날짜·표시 순서는 서로 다른 변경</li></ul></section>
      <section class="review-block"><h3>조작 범위</h3><p>데스크톱은 손잡이를 끌고, 모바일은 오른쪽 손잡이를 길게 누릅니다. 손잡이를 짧게 누르거나 … 메뉴를 열면 같은 이동을 버튼으로 할 수 있습니다. Escape와 대상 밖 놓기는 취소됩니다.</p><p>이 파일은 실제 앱과 분리된 합성 데이터 시뮬레이션입니다. 변경은 <code>${STORAGE_KEY}</code> 하나에만 저장되며, 새로고침하면 마지막 성공 상태와 1단계 Undo가 복원됩니다.</p></section>
      <section class="review-block danger-zone"><h3>독립 데모 초기화</h3><p>이 데모의 전용 저장값 하나만 지웁니다. 다른 <code>flow:*</code> 데이터는 삭제하지 않습니다.</p><button class="secondary" data-action="reset-demo">데모 상태 초기화</button></section>`,'review',null,'wide');
  }
  function changeView(next) {view=next;render();$('#main').focus({preventScroll:true});window.scrollTo({top:0});}
  function shiftMonth(delta) {const d=new Date(anchor+'T12:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+delta);anchor=d.toISOString().slice(0,10);showEmptyDates=false;render();}
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b||b.disabled)return;
    if(drag?.active){e.preventDefault();return;}
    const a=b.dataset.action,id=b.dataset.id;
    if(a==='close'){closeDialog();return;}if(a==='discard'){closeDialog(true);return;}
    if(a==='undo'){undo();return;}if(a==='dismiss'){$('#toast').hidden=true;return;}
    if(a==='edit'){openEdit(id);return;}if(a==='move'){openMove(b.dataset.kind,id,b.dataset.context);return;}
    if(a==='review'){openReview();return;}
    if(a==='reset-demo'){if(window.confirm('독립 데모의 저장 상태만 초기화할까요?')){closeDialog(true);resetDemo();}return;}
    if(a==='nav'){openDialog('탐색',sidebarHTML(),'nav');return;}
    if(a==='collapse'){collapsed.has(id)?collapsed.delete(id):collapsed.add(id);render();if(dialogKind==='nav')$('#dialog-body').innerHTML=sidebarHTML();return;}
    if(a==='folder'||a==='flow'||a==='source'||a==='todo'||a==='calendar'){
      if($('#dialog').open&&!closeDialog())return;
      if(a==='todo'){period=id;anchor=TODAY;showEmptyDates=false;changeView({type:'todo'});}
      else if(a==='calendar'){anchor=TODAY;changeView({type:'calendar'});}
      else changeView({type:a==='source'?'flow':a,id});return;
    }
    if(a==='complete'){const token=focusToken(b);commit({type:'complete',id,done:b.checked},b.checked?'완료로 표시했습니다.':'완료를 해제했습니다.');restoreFocus(token);return;}
    if(a==='schedule-now'){const d=b.dataset.date||null;closeDialog(true);commit({type:'schedule',id,date:d},d?`${dateLabel(d)}에 배치했습니다.`:'날짜를 지웠습니다.');return;}
    if(a==='reorder'){
      const {context}=dialogData, ids=M.taskIds(state,context),i=ids.indexOf(id);
      const j=b.dataset.position==='top'?0:b.dataset.position==='bottom'?ids.length-1:i+Number(b.dataset.direction);
      if(i<0||j<0||j>=ids.length||i===j)return;ids.splice(i,1);ids.splice(j,0,id);closeDialog(true);commit({type:'reorder',context,ids},'이 목록의 순서를 바꿨습니다.');return;
    }
    if(a==='reset-order'){const context=b.dataset.context;closeDialog(true);commit({type:'reset-order',context},'시간순으로 되돌렸습니다.');return;}
    if(a==='toggle-empty'){showEmptyDates=!showEmptyDates;render();restoreFocus({action:'toggle-empty'});return;}
    if(a==='add-folder'){
      openDialog('폴더 만들기',`<form id="add-folder-form"><div class="field"><label for="folder-title">폴더 이름</label><input id="folder-title" name="title" required maxlength="80"></div><div class="field"><label for="folder-parent">상위 폴더</label><select id="folder-parent" name="parentId"><option value="">상위 없음</option>${state.folders.map(f=>`<option value="${f.id}">${esc(folderPath(f.id).map(x=>x.title).join(' / '))}</option>`).join('')}</select></div><div class="dialog-actions"><button type="button" data-action="close">취소</button><button class="primary">만들기</button></div></form>`,'add-folder');return;
    }
    if(a==='new-on-date'){
      openDialog(`${longDate(id)}에 추가`,`<form id="date-add-form"><div class="field"><label for="date-title">할 일</label><input id="date-title" name="title" required maxlength="160"></div><div class="dialog-actions"><button type="button" data-action="close">취소</button><button class="primary">추가</button></div></form>`,'date-add',{date:id});return;
    }
    if(a==='day'){anchor=id;render();$('.calendar-detail').scrollIntoView({block:'start'});return;}
    if(a==='month-prev'||a==='month-next'){shiftMonth(a==='month-prev'?-1:1);return;}
    if(a==='period-prev'||a==='period-next'){const delta=a==='period-prev'?-1:1;showEmptyDates=false;if(period==='month')shiftMonth(delta);else {anchor=dateAdd(anchor,delta*(period==='week'?7:1));render();}return;}
    if(a==='simulation'){closeDialog(true);startSimulation();return;}
    if(a==='sim-next'){simulation.index++;runSimulation();return;}
    if(a==='sim-end'){endSimulation();return;}
  });
  document.addEventListener('submit',e=>{
    e.preventDefault();const f=e.target, data=Object.fromEntries(new FormData(f));
    if(f.id==='quick-form'){
      const title=data.title.trim();if(!title)return;
      if(commit({type:'add-task',title,folderId:view.type==='folder'&&view.id!=='unfiled'?view.id:null,date:view.type==='todo'&&period==='today'?TODAY:null},'할 일을 추가했습니다.')){drafts.delete(draftKey());$('#quick-title').value='';}$('#quick-title').focus();
    }else if(f.id==='edit-form'){
      const r=M.apply(state,{type:'edit',id:dialogData.id,...data});if(r.error){notify(r.message||r.error,false);return;}
      const id=dialogData.id;closeDialog(true);commit({type:'edit',id,...data},'메모와 내용을 저장했습니다.');
    }else if(f.id==='schedule-form'){
      const id=dialogData.id;closeDialog(true);commit({type:'schedule',id,date:data.date},`${dateLabel(data.date)}에 배치했습니다.`);
    }else if(f.id==='folder-move-form'){
      const {id,kind}=dialogData, folderId=data.folderId==='unfiled'?null:data.folderId;closeDialog(true);commit({type:'move-folder',kind,id,folderId},`${folderName(folderId)} 폴더로 이동했습니다.`);
    }else if(f.id==='add-folder-form'){
      const title=data.title.trim();if(!title)return;closeDialog(true);commit({type:'add-folder',title,parentId:data.parentId||null},'폴더를 만들었습니다.');
    }else if(f.id==='date-add-form'){
      const title=data.title.trim();if(!title)return;const date=dialogData.date;closeDialog(true);commit({type:'add-task',title,folderId:null,date},`${dateLabel(date)}에 할 일을 추가했습니다.`);
    }
  });
  $('#dialog').addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if(drag){cancelDrag(true);e.preventDefault();}else if($('#dialog').open){e.preventDefault();closeDialog();}}
    // Preserve one activation even when the embedded browser supplies key events
    // without synthesizing a button click. Prevent the native duplicate click.
    const button=e.target.closest('button');
    if(button&&!button.disabled&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(!e.repeat)button.click();}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!$('#dialog').open&&!/INPUT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();undo();}
  });
  function clearDrop() {$$('.drop-ok,.drop-no,.drop-current,.drop-before,.drop-after').forEach(el=>el.classList.remove('drop-ok','drop-no','drop-current','drop-before','drop-after'));}
  function resolveDrop(el,y) {
    if(!el)return {ok:false,message:'폴더, 특정 날짜 또는 같은 목록의 행에 놓으세요.'};
    const kind=drag.kind,id=drag.id,t=kind==='task'?task(id):null;
    if(el.dataset.drop==='folder'){
      if(t?.flowId)return {ok:false,message:'Flow 안의 할 일입니다. 폴더를 옮기려면 Flow를 이동하세요.'};
      const folderId=el.dataset.folder==='unfiled'?null:el.dataset.folder,current=kind==='flow'?flow(id)?.folderId:t?.folderId;
      if(current===folderId)return {ok:false,current:true,message:'현재 폴더입니다.'};
      return {ok:true,message:`${folderName(el.dataset.folder)} 폴더로 이동 · 날짜는 그대로`,action:{type:'move-folder',kind,id,folderId}};
    }
    if(kind==='flow')return {ok:false,message:'Flow 전체 일정은 바꾸지 않습니다. 안의 할 일을 골라 주세요.'};
    if(el.dataset.drop==='period')return {ok:true,picker:true,message:'놓은 뒤 정확한 날짜 선택'};
    if(el.dataset.drop==='undated')return !t.date?{ok:false,current:true,message:'현재 날짜 미정입니다.'}:{ok:true,message:'날짜를 지우고 날짜 미정에 표시',action:{type:'schedule',id,date:null}};
    if(el.dataset.drop==='date')return t.date===el.dataset.date?{ok:false,current:true,message:'현재 날짜입니다.'}:{ok:true,message:`${longDate(el.dataset.date)}에 배치 · 폴더와 Flow 유지`,action:{type:'schedule',id,date:el.dataset.date}};
    if(el.dataset.drop==='row'){
      const ctx=el.dataset.context,targetId=el.dataset.task;
      if(ctx===drag.context){
        const ids=M.taskIds(state,ctx),after=y>el.getBoundingClientRect().top+el.getBoundingClientRect().height/2;
        if(id===targetId)return {ok:false,current:true,message:'같은 위치입니다.'};
        const next=ids.filter(x=>x!==id),at=next.indexOf(targetId)+(after?1:0);next.splice(at,0,id);
        return {ok:true,message:'이 목록의 표시 순서 변경 · 날짜와 원본 순서 유지',position:after?'after':'before',action:{type:'reorder',context:ctx,ids:next}};
      }
      if(ctx.startsWith('date:'))return {ok:true,message:`${longDate(ctx.slice(5))}에 배치 · 폴더와 Flow 유지`,action:{type:'schedule',id,date:ctx.slice(5)}};
      return {ok:false,message:'다른 목록으로 합치지 않습니다. 폴더나 특정 날짜에 놓으세요.'};
    }
    return {ok:false,message:'이곳에는 놓을 수 없습니다.'};
  }
  function cancelDrag(suppressClick=false) {
    if(suppressClick&&drag?.touch)cancelledTouch={pointerId:drag.pointerId,handle:drag.handle};
    if(dragHold){clearTimeout(dragHold);dragHold=0;}
    if(autoScrollFrame){cancelAnimationFrame(autoScrollFrame);autoScrollFrame=0;}autoScrollSpeed=0;autoScrollTarget=null;
    if(drag?.handle&&drag.pointerId!==undefined&&drag.handle.hasPointerCapture?.(drag.pointerId))drag.handle.releasePointerCapture(drag.pointerId);
    drag?.sourceRow?.classList.remove('drag-source');clearDrop();closeDragDestinations();$('#drag-ghost').hidden=true;$('#drop-hint').hidden=true;document.body.classList.remove('dragging');drag=null;
  }
  function runAutoScroll() {
    if(!drag?.active||!autoScrollSpeed){autoScrollFrame=0;return;}
    (autoScrollTarget||window).scrollBy(0,autoScrollSpeed);updateDrag(drag.lastX,drag.lastY,false);autoScrollFrame=requestAnimationFrame(runAutoScroll);
  }
  function setAutoScroll(y,target=null) {
    const bounds=target?target.getBoundingClientRect():{top:0,bottom:window.innerHeight},edge=Math.min(72,Math.max(36,(bounds.bottom-bounds.top)/3));
    autoScrollTarget=target;
    autoScrollSpeed=y<bounds.top+edge?-Math.max(4,Math.round((bounds.top+edge-y)/edge*18)):y>bounds.bottom-edge?Math.max(4,Math.round((y-(bounds.bottom-edge))/edge*18)):0;
    if(!autoScrollSpeed&&autoScrollFrame){cancelAnimationFrame(autoScrollFrame);autoScrollFrame=0;}
    if(autoScrollSpeed&&!autoScrollFrame)autoScrollFrame=requestAnimationFrame(runAutoScroll);
  }
  function updateDrag(x,y,manageScroll=true) {
    if(!drag?.active)return;
    const ghost=$('#drag-ghost');ghost.hidden=false;ghost.textContent=(drag.kind==='flow'?flow(drag.id):task(drag.id)).title;
    ghost.style.left=`${Math.min(x+16,window.innerWidth-290)}px`;ghost.style.top=`${Math.min(y+16,window.innerHeight-60)}px`;
    clearDrop();const point=document.elementFromPoint(x,y),el=point?.closest('[data-drop]');
    if(drag.touch&&!drag.moved){drag.target=null;drag.result=null;$('#drop-hint').hidden=false;$('#drop-hint').textContent='왼쪽 이동할 곳으로 끌거나 오른쪽 목록에서 세로로 움직이세요.';if(manageScroll)setAutoScroll(window.innerHeight/2);return;}
    const r=resolveDrop(el,y);drag.target=el;drag.result=r;
    if(el)el.classList.add(r.current?'drop-current':r.ok?(r.position?`drop-${r.position}`:'drop-ok'):'drop-no');
    $('#drop-hint').hidden=false;$('#drop-hint').textContent=r.message;if(drag.panelOpen)$('#drag-destinations-status').textContent=r.message;
    if(manageScroll){const panelBody=point?.closest('#drag-destinations-body');setAutoScroll(panelBody?y:point?.closest('#drag-destinations')?window.innerHeight/2:y,panelBody||null);}
  }
  function activateDrag() {
    if(!drag||drag.active)return;
    if(dragHold){clearTimeout(dragHold);dragHold=0;}drag.active=true;
    if(drag.touch){try{drag.handle.setPointerCapture?.(drag.pointerId);}catch{cancelDrag(true);return;}}
    drag.sourceRow?.classList.add('drag-source');document.body.classList.add('dragging');$('#toast').hidden=true;if(drag.touch)openDragDestinations();updateDrag(drag.lastX,drag.lastY);
  }
  document.addEventListener('pointerdown',e=>{
    const h=e.target.closest('[data-drag]');if(!h||e.button!==0||$('#dialog').open)return;
    if(!drag&&cancelledTouch)cancelledTouch=null;
    if(e.isPrimary===false){if(drag?.touch)cancelDrag(true);return;}if(drag)cancelDrag(true);
    const touch=e.pointerType==='touch';
    drag={kind:h.dataset.drag,id:h.dataset.id,context:h.dataset.context||'',x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,active:false,touch,moved:false,panelOpen:false,pointerId:e.pointerId,handle:h,sourceRow:h.closest('.row'),target:null,result:null};
    if(touch)dragHold=setTimeout(()=>activateDrag(),350);
  });
  document.addEventListener('pointermove',e=>{
    if(!drag||e.pointerId!==drag.pointerId)return;drag.lastX=e.clientX;drag.lastY=e.clientY;
    const distance=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);
    if(!drag.active&&drag.touch){if(distance>8)cancelDrag(true);return;}
    if(!drag.active&&distance<6)return;if(!drag.active)activateDrag();
    if(distance>8)drag.moved=true;
    e.preventDefault();updateDrag(e.clientX,e.clientY);
  },{passive:false});
  document.addEventListener('pointerup',e=>{
    if(!drag){if(cancelledTouch?.pointerId===e.pointerId){e.preventDefault();const id=e.pointerId;setTimeout(()=>{if(cancelledTouch?.pointerId===id)cancelledTouch=null;},350);}return;}
    if(e.pointerId!==drag.pointerId)return;const d=drag;if(!d.active){if(dragHold){clearTimeout(dragHold);dragHold=0;}drag=null;return;}e.preventDefault();
    const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop]'),r=resolveDrop(el,e.clientY);
    cancelDrag();
    // Capture and consume the click produced by pointer release, not the next real click.
    const suppress=ev=>{ev.preventDefault();ev.stopPropagation();};document.addEventListener('click',suppress,{capture:true,once:true});setTimeout(()=>document.removeEventListener('click',suppress,true),0);
    if(d.touch&&!d.moved){d.handle?.focus({preventScroll:true});openMove(d.kind,d.id,d.context);return;}
    if(r.current)return;
    if(!r.ok){notify(r.message,false);return;}if(r.picker){d.handle?.focus({preventScroll:true});openMove(d.kind,d.id,d.context);return;}
    if(r.action)commit(r.action,r.message);else notify(r.message,false);
  });
  document.addEventListener('click',e=>{if(cancelledTouch&&e.target.closest('[data-drag]')===cancelledTouch.handle){e.preventDefault();e.stopImmediatePropagation();cancelledTouch=null;}},true);
  document.addEventListener('pointercancel',()=>cancelDrag(false));
  document.addEventListener('contextmenu',e=>{if(drag?.touch&&e.target.closest('[data-drag]'))e.preventDefault();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&drag)cancelDrag(true);});
  window.addEventListener('blur',()=>cancelDrag(true));window.addEventListener('resize',()=>{if(drag)cancelDrag(true);});
  const simSteps=[
    '1 / 6 · 이사 준비의 “관리실에 전화”를 일상 폴더로 옮겨봅니다.',
    '2 / 6 · 일상 폴더로 이동했습니다. 메모와 할 일은 그대로입니다.',
    '3 / 6 · 오늘에 배치했습니다. 일상 폴더에도 같은 할 일이 남아 있습니다.',
    '4 / 6 · 오늘 목록 맨 위로 옮겼습니다. 시간 값은 바뀌지 않았습니다.',
    '5 / 6 · 오늘에서 완료했습니다. 원래 폴더에서도 완료 상태를 확인합니다.',
    '6 / 6 · 폴더에도 완료가 반영됐습니다. 제목을 눌러 기존 메모를 확인할 수 있습니다.'
  ];
  function startSimulation() {
    if(simulation)return;
    captureDraft();simulation={state,history,view:{...view},period,anchor,drafts,collapsed,showEmptyDates,index:0};state=M.seed();history=[];drafts=new Map();collapsed=new Set();showEmptyDates=false;renderedDraftKey='';view={type:'folder',id:'move'};render();
  }
  function runSimulation() {
    const i=simulation.index;
    let next=M.seed();
    const actions=[{type:'move-folder',kind:'task',id:'call',folderId:'life'},{type:'schedule',id:'call',date:TODAY}];
    for(const action of actions.slice(0,Math.min(i,2))){const r=M.apply(next,action);if(r.error){simulation.index--;notify('예시를 불러오지 못했습니다.',false);return;}next=r.state;}
    if(i>=3){const context=`date:${TODAY}`,ids=M.taskIds(next,context),r=M.apply(next,{type:'reorder',context,ids:['call',...ids.filter(x=>x!=='call')]});if(r.error){simulation.index--;notify('예시 순서를 확인해 주세요.',false);return;}next=r.state;}
    if(i>=4)next=M.apply(next,{type:'complete',id:'call',done:true}).state;
    state=next;history=[];view=i>=2&&i<5?{type:'todo'}:{type:'folder',id:i?'life':'move'};period='today';
    render();
  }
  function renderScenario() {
    $('#scenario').hidden=!simulation;if(!simulation)return;
    $('#scenario').innerHTML=`<span>${simSteps[simulation.index]}</span><div>${simulation.index<5?'<button class="primary" data-action="sim-next">다음 단계</button>':''}<button class="secondary" data-action="sim-end">내 작업으로 돌아가기</button></div>`;
  }
  function endSimulation() {
    if(!simulation)return;({state,history,view,period,anchor,drafts,collapsed,showEmptyDates}=simulation);simulation=null;renderedDraftKey='';render();notify('따라보기 전 작업으로 돌아왔습니다.',false);
  }
  render();
  setSaveStatus(restored?'마지막 저장 상태 복원':'초기 상태 · 아직 저장 안 됨',restored?'saved':'ready');
  if(bootNotice)notify(bootNotice,false);
  window.FlowMeStandaloneDemo=Object.freeze({storageKey:STORAGE_KEY,snapshot:()=>JSON.parse(JSON.stringify(state)),hasUndo:()=>history.length>0});
})();
