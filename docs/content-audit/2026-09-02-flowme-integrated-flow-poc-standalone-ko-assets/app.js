(function () {
  'use strict';

  const M = window.FlowMeIntegratedPoc;
  if (!M) throw new Error('FlowMeIntegratedPoc model is required');

  const elements = {
    app: document.getElementById('app'),
    sidebar: document.getElementById('sidebar'),
    content: document.getElementById('content'),
    dialog: document.getElementById('dialog'),
    dialogTitle: document.getElementById('dialog-title'),
    dialogBody: document.getElementById('dialog-body'),
    movePanel: document.getElementById('move-panel'),
    movePanelTitle: document.getElementById('move-panel-title'),
    movePanelStatus: document.getElementById('move-panel-status'),
    movePanelBody: document.getElementById('move-panel-body'),
    movePanelClose: document.getElementById('move-panel-close'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message'),
    toastRetry: document.getElementById('toast-retry'),
    saveStatus: document.getElementById('save-status'),
    undo: document.getElementById('undo-button'),
    compactUndo: document.getElementById('compact-undo-button'),
    mutationCount: document.getElementById('mutation-count'),
    storageModeNote: document.getElementById('storage-mode-note'),
    footerStorageNote: document.getElementById('footer-storage-note')
  };

  const LONG_PRESS_DELAY_MS = 350;
  const LONG_PRESS_CANCEL_DISTANCE_PX = 8;
  const SYNTHETIC_CLICK_SUPPRESSION_MS = 700;

  const selectedStorage = acquireStorage();
  let storage = selectedStorage.storage;
  let storageMode = selectedStorage.mode;
  let loaded = M.loadEnvelope(storage);
  if (loaded.status === 'read-error' && storageMode === 'persistent') {
    storage = M.createMemoryStorage();
    storageMode = 'volatile';
    loaded = M.loadEnvelope(storage);
  }
  let loadedDraft = M.loadAuthoringDraft(storage);
  if (loadedDraft.status === 'read-error' && storageMode === 'persistent') {
    storage = M.createMemoryStorage();
    storageMode = 'volatile';
    loaded = M.loadEnvelope(storage);
    loadedDraft = M.loadAuthoringDraft(storage);
  }
  let envelope = loaded.envelope;
  let authoring = loadedDraft.status === 'restored' ? loadedDraft.authoring : freshAuthoring();
  let authoringDraftStored = loadedDraft.status === 'restored';
  let screen = loadedDraft.status === 'restored' && authoring.rawText.length > 0
    ? { type: 'authoring' }
    : { type: 'workspace', view: 'today', selectedFlowId: null };
  let successfulMutations = 0;
  let forceWriteError = false;
  let dialogSubmit = null;
  let dialogReturnFocus = null;
  let moveTarget = null;
  let moveReturnFocus = null;
  let dragged = null;
  let longPressTimer = null;
  let pointerOrigin = null;
  let suppressedHandleClick = null;
  let dragAutoScrollFrame = null;
  let dragAutoScrollSpeed = 0;
  let showEmptyMonthDates = false;
  let planDraft = null;
  let itemDraft = null;
  let itemReturn = null;
  let itemEditorReturn = null;
  let pendingRetry = null;
  let resultView = 'txt';
  let authoringResultView = 'txt';
  let resultCalendarBaseDate = M.TODAY;
  let resultCalendarSelectedDate = M.TODAY;
  let authoringCalendarBaseDate = M.TODAY;
  let authoringCalendarSelectedDate = M.TODAY;
  let resultOccurrencePage = 1;
  let authoringOccurrencePage = 1;
  let authoringPropertyTarget = null;
  let authoringSourceMutationCount = 0;
  let dismissedNearMisses = new Set();
  let authoringStep = 'input';
  let authoringReviewOpen = false;
  let authoringReceipt = null;
  let authoringTemplatePreviewId = authoring.templateId || M.TEMPLATE_CATALOG[0].id;
  let authoringGhostVisible = true;
  let nativeTemplateInsertPending = false;
  let nativeTemplateInputEventCount = 0;
  let nativeSourcePlanPending = false;
  let nativeSourcePlanInputEventCount = 0;

  function acquireStorage() {
    try {
      const candidate = window.localStorage;
      candidate.getItem(M.STORAGE_KEY);
      candidate.getItem(M.DRAFT_STORAGE_KEY);
      return { storage: candidate, mode: 'persistent' };
    } catch (error) {
      return { storage: M.createMemoryStorage(), mode: 'volatile', error };
    }
  }

  function successfulStorageStatus(prefix) {
    if (storageMode === 'volatile') return (prefix || '이 화면에 저장됨') + ' · 새로고침 복원 안 됨';
    return (prefix || '저장됨') + ' · 새로고침 복원';
  }

  function freshAuthoring() {
    return {
      draftId: 'draft-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 46656).toString(36),
      rawText: '',
      templateId: null,
      templatePickerOpen: false,
      sourceConfirmed: false,
      folderId: null
    };
  }

  function escapeHtml(value) {
    return String(value === null || value === undefined ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function state() { return envelope.state; }
  function anyTaskById(id) { return state().tasks.find(task => task.id === id) || null; }
  function anyFlowById(id) { return state().flows.find(flow => flow.id === id) || null; }
  function taskById(id) { const task = anyTaskById(id); return task && !M.isTrashedTask(state(), task) ? task : null; }
  function flowById(id) { const flow = anyFlowById(id); return flow && !M.isTrashedFlow(state(), flow.id) ? flow : null; }
  function folderById(id) { return state().folders.find(folder => folder.id === id) || null; }
  function folderTitle(id) { const folder = folderById(id); return folder ? folder.title : '미분류'; }
  function sourceTitle(entry) { return entry && entry.sourceTitle ? entry.sourceTitle : (entry ? entry.title : ''); }
  function sourceMemo(entry) { return entry && entry.sourceMemo ? entry.sourceMemo : ''; }
  function flowDisplayTitle(flow) { return M.flowDisplayTitle(state(), flow); }
  function planDate(task) { return Object.prototype.hasOwnProperty.call(task, 'planDate') ? task.planDate : (task.sourceDate === undefined ? task.date : task.sourceDate); }
  function flowFolder(task) { return task.flowId ? (flowById(task.flowId) || {}).folderId || null : task.folderId; }
  function contextLabel(context) {
    if (context === 'today') return '오늘';
    if (context === 'week') return '주간';
    if (context === 'month') return '월간';
    if (context === 'undated') return '날짜 미정';
    if (context === 'trash') return '휴지통';
    if (context.indexOf('folder:') === 0) return folderTitle(context.slice(7) === 'unfiled' ? null : context.slice(7));
    if (context.indexOf('flow:') === 0) {
      const flow = flowById(context.slice(5));
      return flow ? flowDisplayTitle(flow) : 'Flow';
    }
    return '';
  }

  function dateLabel(date) {
    if (!date) return '날짜 미정';
    if (date === M.TODAY) return '오늘 · ' + date;
    if (date === M.addDays(M.TODAY, 1)) return '내일 · ' + date;
    return date;
  }

  function resultProjectionOptions() {
    return {
      baseDate: resultCalendarBaseDate,
      selectedDate: resultCalendarSelectedDate,
      finiteOccurrenceLimit: M.FINITE_RECURRENCE_PAGE_SIZE * resultOccurrencePage,
      openEndedOccurrenceWeeks: M.OPEN_ENDED_RECURRENCE_WEEKS * resultOccurrencePage
    };
  }

  function authoringProjectionOptions() {
    return {
      baseDate: authoringCalendarBaseDate,
      selectedDate: authoringCalendarSelectedDate,
      finiteOccurrenceLimit: M.FINITE_RECURRENCE_PAGE_SIZE * authoringOccurrencePage,
      openEndedOccurrenceWeeks: M.OPEN_ENDED_RECURRENCE_WEEKS * authoringOccurrencePage
    };
  }

  function copyScreen(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function focusAfterRender(selector, fallback) {
    window.setTimeout(() => {
      const target = selector ? document.querySelector(selector) : null;
      const destination = target || (fallback ? document.querySelector(fallback) : null);
      if (destination) destination.focus({ preventScroll: true });
    }, 0);
  }

  function returnFocusSelector(control) {
    return control && control.dataset.returnFocus
      ? '[data-return-focus="' + String(control.dataset.returnFocus).replace(/"/g, '\\"') + '"]'
      : '';
  }

  function periodDateHeading(date) {
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const value = new Date(date + 'T12:00:00Z');
    return Number(date.slice(5, 7)) + '월 ' + Number(date.slice(8, 10)) + '일 · ' + weekdays[value.getUTCDay()] + '요일';
  }

  function folderOptions(selected, allowNested) {
    const root = state().folders.filter(folder => folder.parentId === null);
    let html = '<option value=""' + (selected === null ? ' selected' : '') + '>미분류</option>';
    root.forEach(folder => {
      html += '<option value="' + escapeHtml(folder.id) + '"' + (selected === folder.id ? ' selected' : '') + '>' + escapeHtml(folder.title) + '</option>';
      if (allowNested !== false) state().folders.filter(child => child.parentId === folder.id).forEach(child => {
        html += '<option value="' + escapeHtml(child.id) + '"' + (selected === child.id ? ' selected' : '') + '>└ ' + escapeHtml(child.title) + '</option>';
      });
    });
    return html;
  }

  function showToast(message, canUndo, retry, mode) {
    pendingRetry = typeof retry === 'function' ? retry : null;
    elements.toastMessage.textContent = message;
    const undo = elements.toast.querySelector('[data-action="undo"]');
    undo.hidden = !canUndo;
    elements.toastRetry.hidden = !pendingRetry;
    elements.toast.setAttribute('role', mode === 'error' ? 'alert' : 'status');
    elements.toast.setAttribute('aria-live', mode === 'error' ? 'assertive' : 'polite');
    elements.toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { elements.toast.hidden = true; pendingRetry = null; }, 5200);
  }

  function setSaveStatus(text, mode) {
    elements.saveStatus.textContent = text;
    elements.saveStatus.dataset.mode = mode || '';
    elements.saveStatus.setAttribute('role', mode === 'error' ? 'alert' : 'status');
    elements.saveStatus.setAttribute('aria-live', mode === 'error' ? 'assertive' : 'polite');
    elements.saveStatus.hidden = !text;
    elements.app.dataset.saveState = mode || 'ready';
  }

  function copyTextResult(value) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      setSaveStatus('이 브라우저에서는 자동 복사를 사용할 수 없어요.', 'error');
      showToast('TXT 영역을 길게 눌러 직접 복사해 주세요.', false, null, 'error');
      return;
    }
    navigator.clipboard.writeText(value).then(() => {
      setSaveStatus('TXT를 복사했어요. 데이터는 바뀌지 않았어요.', 'noop');
      showToast('TXT를 복사했어요.', false);
    }).catch(() => {
      setSaveStatus('TXT를 복사하지 못했어요.', 'error');
      showToast('TXT 영역에서 직접 복사해 주세요.', false, null, 'error');
    });
  }

  function downloadLocalResult(file) {
    try {
      const objectUrl = URL.createObjectURL(new Blob([file.payload], { type: file.mediaType }));
      const anchor = document.createElement('a');
      anchor.download = file.filename;
      anchor.href = objectUrl;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      try { anchor.click(); }
      finally {
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
      }
      setSaveStatus(file.filename + ' 파일을 만들었어요. 데이터는 바뀌지 않았어요.', 'noop');
      showToast(file.filename + ' 다운로드를 요청했어요.', false);
    } catch (error) {
      setSaveStatus('파일을 만들지 못했어요.', 'error');
      showToast('이 브라우저에서는 로컬 파일을 만들 수 없어요.', false, null, 'error');
    }
  }

  function shiftResultMonth(date, delta) {
    const parts = String(date).split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
    const targetFirst = new Date(Date.UTC(parts[0], parts[1] - 1 + delta, 1));
    const year = targetFirst.getUTCFullYear();
    const month = targetFirst.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return String(year).padStart(4, '0') + '-' + String(month).padStart(2, '0') + '-' + String(Math.min(parts[2], lastDay)).padStart(2, '0');
  }

  function taskOrderHelpId(context) {
    return 'task-order-help-' + String(context).replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  function writeCandidate(candidate, message, onSuccess) {
    setSaveStatus('저장 중…', 'saving');
    try {
      if (forceWriteError) throw new Error('simulated-write-error');
      M.writeEnvelope(storage, candidate);
    } catch (error) {
      setSaveStatus('저장하지 못했어요.', 'error');
      showToast('저장하지 못했어요. 이전 내용은 그대로예요.', false, () => writeCandidate(candidate, message, onSuccess), 'error');
      return false;
    }
    envelope = candidate;
    successfulMutations += 1;
    if (typeof onSuccess === 'function') onSuccess();
    setSaveStatus(successfulStorageStatus(), 'saved');
    showToast(message, envelope.undo !== null);
    normalizeScreen();
    render();
    return true;
  }

  function persistAuthoringDraft() {
    setSaveStatus('작성 초안 저장 중…', 'saving');
    try {
      if (forceWriteError) throw new Error('simulated-write-error');
      M.writeAuthoringDraft(storage, authoring);
    } catch (error) {
      setSaveStatus('작성 초안을 저장하지 못했어요.', 'error');
      showToast('작성 초안을 저장하지 못했어요. 이전 초안은 그대로예요.', false, persistAuthoringDraft, 'error');
      return false;
    }
    authoringDraftStored = true;
    setSaveStatus(successfulStorageStatus('작성 초안 저장됨'), 'saved');
    return true;
  }

  function discardAuthoringDraft() {
    if (!authoringDraftStored) return true;
    try {
      M.clearAuthoringDraft(storage);
      authoringDraftStored = false;
      return true;
    } catch (error) {
      setSaveStatus('작성 초안을 지우지 못했어요.', 'error');
      showToast('작성 초안을 지우지 못했어요. 현재 내용은 그대로예요.', false, discardAuthoringDraft, 'error');
      return false;
    }
  }

  function transition(action) {
    const result = M.transitionEnvelope(envelope, action);
    if (!result.changed) {
      setSaveStatus(result.error ? '변경하지 못했어요.' : '이미 같은 상태예요.', result.error ? 'error' : 'noop');
      showToast(result.message, false, null, result.error ? 'error' : 'status');
      return false;
    }
    return writeCandidate(result.envelope, result.message);
  }

  function undo() {
    const result = M.undoEnvelope(envelope);
    if (!result.changed) { showToast(result.message, false); return; }
    writeCandidate(result.envelope, result.message);
  }

  function normalizeScreen() {
    if (screen.selectedFlowId && !flowById(screen.selectedFlowId)) screen = { type: 'workspace', view: 'today', selectedFlowId: null };
    if (screen.selectedItemId && !taskById(screen.selectedItemId)) screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: null };
    if (screen.type === 'receipt') {
      const receipt = state().lastReceipt;
      if (!receipt || !flowById(receipt.flowId)) screen = { type: 'workspace', view: 'today', selectedFlowId: null };
    }
  }

  function folderCount(folderId) {
    const activeFlows = state().flows.filter(flow => !M.isTrashedFlow(state(), flow.id));
    const flowIds = new Set(activeFlows.filter(flow => flow.folderId === folderId).map(flow => flow.id));
    return activeFlows.filter(flow => flow.folderId === folderId).length + state().tasks.filter(task => !M.isTrashedTask(state(), task) && task.flowId === null && task.folderId === folderId).length + state().tasks.filter(task => !M.isTrashedTask(state(), task) && task.flowId && flowIds.has(task.flowId)).length;
  }

  function renderSidebar() {
    const hideSidebar = screen.type === 'authoring' || screen.type === 'receipt';
    elements.app.classList.toggle('app-shell-wide', hideSidebar);
    if (hideSidebar) {
      elements.sidebar.hidden = true;
      return;
    }
    elements.sidebar.hidden = false;
    const folders = state().folders.filter(folder => folder.parentId === null);
    const currentView = screen.selectedFlowId ? '' : screen.view;
    const period = [
      ['today', '오늘'], ['week', '주간'], ['month', '월간'], ['undated', '날짜 미정']
    ].map(([id, label]) => '<button class="side-link" type="button" data-action="set-view" data-view="' + id + '"' + (currentView === id ? ' aria-current="page"' : '') + '><span class="side-title">' + label + '</span><span class="count">' + M.viewTaskIds(state(), id).length + '</span></button>').join('');
    let folderRows = '<button class="side-link" type="button" data-action="set-view" data-view="folder:unfiled"' + (currentView === 'folder:unfiled' ? ' aria-current="page"' : '') + '><span class="side-title">미분류</span><span class="count">' + folderCount(null) + '</span></button>';
    folders.forEach(folder => {
      const view = 'folder:' + folder.id;
      folderRows += '<button class="side-link" type="button" data-action="set-view" data-view="' + escapeHtml(view) + '"' + (currentView === view ? ' aria-current="page"' : '') + '><span class="side-title">' + escapeHtml(folder.title) + '</span><span class="count">' + folderCount(folder.id) + '</span></button>';
      state().folders.filter(child => child.parentId === folder.id).forEach(child => {
        const childView = 'folder:' + child.id;
        folderRows += '<button class="side-link child" type="button" data-action="set-view" data-view="' + escapeHtml(childView) + '"' + (currentView === childView ? ' aria-current="page"' : '') + '><span class="side-title">' + escapeHtml(child.title) + '</span><span class="count">' + folderCount(child.id) + '</span></button>';
      });
    });
    const trashCount = M.trashManifest(state()).length;
    const trash = '<button class="side-link" type="button" data-action="set-view" data-view="trash"' + (currentView === 'trash' ? ' aria-current="page"' : '') + '><span class="side-title">휴지통</span><span class="count">' + trashCount + '</span></button>';
    elements.sidebar.innerHTML = '<section class="side-section"><div class="side-head"><strong>기간</strong></div><div class="side-list">' + period + '</div></section>' +
      '<section class="side-section"><div class="side-head"><strong>폴더</strong><button type="button" data-action="add-folder">+ 추가</button></div><div class="side-list">' + folderRows + '</div></section>' +
      '<section class="side-section"><div class="side-head"><strong>관리</strong></div><div class="side-list">' + trash + '</div></section>';
  }

  function renderTask(task, context, index, total, hideDate, describedById) {
    const parentFlow = task.flowId ? flowById(task.flowId) : null;
    const folder = folderTitle(flowFolder(task));
    const doneLabel = task.done ? '다시 열기' : '완료';
    const orderHelpId = describedById || taskOrderHelpId(context);
    const dateMeta = hideDate ? '' : '<span>' + escapeHtml(dateLabel(task.date)) + (task.time ? ' · ' + escapeHtml(task.time) : '') + '</span>';
    const timeMeta = hideDate && task.time ? '<span>' + escapeHtml(task.time) + '</span>' : '';
    const moveExpanded = Boolean(moveTarget && moveTarget.kind === 'task' && moveTarget.id === task.id);
    return '<article class="task-row' + (task.done ? ' done' : '') + '" tabindex="0" data-task-id="' + escapeHtml(task.id) + '" data-task-date="' + escapeHtml(task.date || '') + '" data-context="' + escapeHtml(context) + '">' +
      '<button class="check" type="button" aria-pressed="' + task.done + '" data-action="toggle-complete" data-id="' + escapeHtml(task.id) + '" aria-label="' + escapeHtml(task.title + ' ' + doneLabel) + '">' + (task.done ? '✓' : '') + '</button>' +
      '<div class="task-copy"><button class="task-title task-title-button" type="button" data-action="open-item-detail" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '" data-return-focus="item-' + escapeHtml(task.id) + '">' + escapeHtml(task.title) + '</button><div class="task-meta">' + dateMeta + timeMeta + '<span>' + escapeHtml(parentFlow ? flowDisplayTitle(parentFlow) : '빠른 할 일') + '</span><span>' + escapeHtml(folder) + '</span></div></div>' +
      '<button class="drag-handle" type="button" draggable="true" data-move-kind="task" data-move-source="handle" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '" aria-label="' + escapeHtml(task.title + ' 이동할 곳 열기 또는 끌어서 이동') + '" aria-describedby="' + escapeHtml(orderHelpId) + '" aria-controls="move-panel" aria-expanded="' + moveExpanded + '" title="짧게 누르기 · 350ms 길게 누르기 · 끌어서 이동"><span aria-hidden="true">⠿</span></button>' +
      '<div class="row-actions"><button type="button" data-action="move-up" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '"' + (index === 0 ? ' disabled' : '') + ' aria-label="위로 이동">↑</button><button type="button" data-action="move-down" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '"' + (index === total - 1 ? ' disabled' : '') + ' aria-label="아래로 이동">↓</button><button type="button" data-action="task-menu" data-move-kind="task" data-move-source="more" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '" aria-controls="move-panel" aria-expanded="' + moveExpanded + '" aria-label="' + escapeHtml(task.title + ' 이동할 곳 열기') + '">•••</button></div>' +
      '</article>';
  }

  function taskOrderHelp(orderHelpId) {
    return '<p id="' + escapeHtml(orderHelpId) + '" class="visually-hidden">손잡이를 짧게 누르거나 Enter 또는 Space를 누르면 왼쪽 이동할 곳 패널이 열립니다. 350밀리초 길게 누르거나 마우스로 끌어도 같은 이동 대상을 사용합니다. 날짜와 폴더는 왼쪽 패널에서 선택하고 목록 순서는 오른쪽 손잡이 통로에서 바꿉니다. 8픽셀 전에 움직이거나 목록 밖에 놓거나 Escape, pointer cancel, 창 이탈, 화면 크기 변경이 생기면 저장하지 않고 취소합니다.</p>';
  }

  function renderTaskList(ids, context, hideDate, sharedHelpId) {
    if (!ids.length) return '<div class="empty"><strong>이 목록은 비어 있어요.</strong><span>빠른 할 일을 만들거나 다른 날짜에서 옮겨 보세요.</span></div>';
    const orderHelpId = sharedHelpId || taskOrderHelpId(context);
    return '<div class="task-list" data-context="' + escapeHtml(context) + '">' + (sharedHelpId ? '' : taskOrderHelp(orderHelpId)) + ids.map((id, index) => renderTask(taskById(id), context, index, ids.length, hideDate, orderHelpId)).join('') + '</div>';
  }

  function renderMonthTaskGroups(ids) {
    const activeDates = Array.from(new Set(ids.map(id => (taskById(id) || {}).date).filter(Boolean))).sort();
    const monthStart = M.TODAY.slice(0, 8) + '01';
    const year = Number(monthStart.slice(0, 4));
    const month = Number(monthStart.slice(5, 7));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const allDates = Array.from({ length: daysInMonth }, (_, index) => M.addDays(monthStart, index));
    const dates = showEmptyMonthDates ? allDates : activeDates;
    const emptyDateCount = allDates.length - activeDates.length;
    const monthOrderHelpId = taskOrderHelpId('month');
    const timeline = dates.length ? dates.map(date => {
      const dateIds = ids.filter(id => (taskById(id) || {}).date === date);
      const headingId = 'period-date-' + date.replace(/-/g, '');
      const body = dateIds.length ? renderTaskList(dateIds, 'month', true, monthOrderHelpId) : '<div class="period-day-empty">할 일 없음</div>';
      return '<section class="period-day" data-period-date="' + escapeHtml(date) + '" aria-labelledby="' + headingId + '"><div class="period-date-head"><h2 id="' + headingId + '">' + escapeHtml(periodDateHeading(date)) + '</h2><button class="month-date-add" type="button" data-action="add-quick" data-date="' + escapeHtml(date) + '" aria-label="' + escapeHtml(date + '에 빠른 할 일 추가') + '"><span aria-hidden="true">+</span><span>할 일 추가</span></button></div>' + body + '</section>';
    }).join('') : '<div class="empty"><strong>이번 달 목록은 비어 있어요.</strong><span>빈 날짜를 펼쳐 날짜별로 빠른 할 일을 만들 수 있어요.</span></div>';
    const toggle = emptyDateCount > 0 ? '<button class="month-empty-toggle" type="button" data-action="toggle-empty-month" aria-expanded="' + showEmptyMonthDates + '">' + (showEmptyMonthDates ? '빈 날짜 접기' : '할 일 없는 날짜 ' + emptyDateCount + '일 보기') + '</button>' : '';
    return '<div class="period-timeline">' + taskOrderHelp(monthOrderHelpId) + timeline + '</div>' + toggle;
  }

  function renderFlowRow(flow, context) {
    const displayTitle = flowDisplayTitle(flow);
    const itemCount = flow.steps.reduce((sum, step) => sum + step.itemIds.length, 0);
    const doneCount = flow.steps.reduce((sum, step) => sum + step.itemIds.filter(id => (taskById(id) || {}).done).length, 0);
    const moveExpanded = Boolean(moveTarget && moveTarget.kind === 'flow' && moveTarget.id === flow.id);
    return '<article class="flow-row" data-flow-id="' + escapeHtml(flow.id) + '" data-context="' + escapeHtml(context) + '"><div class="flow-main"><button type="button" data-action="open-flow" data-id="' + escapeHtml(flow.id) + '">' + escapeHtml(displayTitle) + '</button><div class="meta"><span class="origin">' + escapeHtml(flow.originLabel) + '</span><span>' + itemCount + '개 중 ' + doneCount + '개 완료</span><span>' + escapeHtml(folderTitle(flow.folderId)) + '</span></div></div><button class="drag-handle" type="button" draggable="true" data-move-kind="flow" data-move-source="handle" data-id="' + escapeHtml(flow.id) + '" data-context="' + escapeHtml(context) + '" aria-label="' + escapeHtml(displayTitle + ' 폴더 이동할 곳 열기 또는 끌어서 이동') + '" aria-describedby="flow-move-help" aria-controls="move-panel" aria-expanded="' + moveExpanded + '" title="짧게 누르기 · 350ms 길게 누르기 · 끌어서 폴더 이동"><span aria-hidden="true">⠿</span></button><div class="row-actions"><button type="button" data-action="open-flow" data-id="' + escapeHtml(flow.id) + '">열기</button><button type="button" data-action="flow-menu" data-move-kind="flow" data-move-source="more" data-id="' + escapeHtml(flow.id) + '" data-context="' + escapeHtml(context) + '" aria-controls="move-panel" aria-expanded="' + moveExpanded + '" aria-label="' + escapeHtml(displayTitle + ' 폴더 이동할 곳 열기') + '">•••</button></div></article>';
  }

  function renderFolderView(view) {
    const folderId = view.slice(7) === 'unfiled' ? null : view.slice(7);
    const flows = state().flows.filter(flow => flow.folderId === folderId && !M.isTrashedFlow(state(), flow.id));
    const taskIds = M.viewTaskIds(state(), view);
    const itemCount = flows.reduce((sum, flow) => sum + flow.steps.reduce((subtotal, step) => subtotal + step.itemIds.length, 0), 0) + taskIds.length;
    return '<div class="page-head"><div><h1>' + escapeHtml(folderTitle(folderId)) + '</h1><p>Flow와 빠른 할 일을 함께 봅니다. Flow Item은 부모 Flow의 폴더를 그대로 따라갑니다.</p></div><div class="page-actions"><button class="button" type="button" data-action="add-quick" data-folder-id="' + escapeHtml(folderId || '') + '">빠른 할 일</button>' + (folderId ? '<button class="button danger" type="button" data-action="delete-folder" data-id="' + escapeHtml(folderId) + '">폴더 삭제</button>' : '') + '</div></div>' +
      '<div class="summary-strip"><div class="summary-cell"><strong>' + flows.length + '</strong><span>Flow</span></div><div class="summary-cell"><strong>' + taskIds.length + '</strong><span>빠른 할 일</span></div><div class="summary-cell"><strong>' + itemCount + '</strong><span>전체 실행 항목</span></div></div>' +
      '<h2 class="section-title">Flow</h2><p id="flow-move-help" class="visually-hidden">Flow 손잡이는 폴더만 이동합니다. Flow 안의 Item은 새 폴더를 상속하고 원본 일정과 개인 실행 날짜는 유지됩니다.</p>' + (flows.length ? '<div class="flow-list">' + flows.map(flow => renderFlowRow(flow, view)).join('') + '</div>' : '<div class="empty"><strong>이 폴더에 Flow가 없어요.</strong><span>미분류 Flow를 이곳으로 옮겨 보세요.</span></div>') +
      '<h2 class="section-title">빠른 할 일</h2>' + renderTaskList(taskIds, view);
  }

  function renderPeriodView(view) {
    const labels = {
      today: ['오늘', '오늘 실행할 항목을 시간과 개인 순서대로 봅니다.'],
      week: ['주간', '오늘부터 7일 동안의 실행 항목입니다.'],
      month: ['월간', '이번 달에 날짜가 잡힌 실행 항목입니다.'],
      undated: ['날짜 미정', '아직 실행 날짜를 정하지 않은 항목입니다.']
    };
    const ids = M.viewTaskIds(state(), view);
    const done = ids.filter(id => taskById(id).done).length;
    const flowItems = ids.filter(id => taskById(id).flowId !== null).length;
    const quickAction = view === 'month' ? '' : '<button class="button primary" type="button" data-action="add-quick" data-date="' + (view === 'today' ? M.TODAY : '') + '">빠른 할 일</button>';
    return '<div class="page-head"><div><h1>' + labels[view][0] + '</h1><p>' + labels[view][1] + ' 원본 일정은 그대로 두고 내 실행 날짜만 조정할 수 있어요.</p></div><div class="page-actions">' + quickAction + '</div></div>' +
      '<div class="summary-strip"><div class="summary-cell"><strong>' + ids.length + '</strong><span>실행 항목</span></div><div class="summary-cell"><strong>' + flowItems + '</strong><span>Flow Item</span></div><div class="summary-cell"><strong>' + done + '</strong><span>완료</span></div></div>' +
      '<h2 class="section-title">' + labels[view][0] + ' 목록</h2>' + (view === 'month' ? renderMonthTaskGroups(ids) : renderTaskList(ids, view));
  }

  function renderTrashView() {
    const entries = M.trashManifest(state());
    const rows = entries.map(entry => '<article class="trash-row" data-trash-kind="' + escapeHtml(entry.kind) + '" data-trash-id="' + escapeHtml(entry.id) + '"><div><span class="origin">' + (entry.kind === 'flow' ? 'Flow' : '빠른 할 일') + '</span><strong>' + escapeHtml(entry.title) + '</strong><small>' + entry.itemCount + '개 항목 · ' + escapeHtml(entry.deletedAt.slice(0, 10)) + '</small></div><div class="trash-actions"><button class="button" type="button" data-action="restore-trash" data-kind="' + escapeHtml(entry.kind) + '" data-id="' + escapeHtml(entry.id) + '">복원</button><button class="button danger" type="button" data-action="permanent-delete" data-kind="' + escapeHtml(entry.kind) + '" data-id="' + escapeHtml(entry.id) + '">영구 삭제</button></div></article>').join('');
    return '<div class="page-head"><div><h1>휴지통</h1><p>Flow와 빠른 할 일을 복원할 수 있습니다. 영구 삭제 뒤에는 Undo하거나 복구할 수 없어요.</p></div></div><div class="summary-strip"><div class="summary-cell"><strong>' + entries.length + '</strong><span>삭제 대기</span></div><div class="summary-cell"><strong>' + entries.filter(entry => entry.kind === 'flow').length + '</strong><span>Flow</span></div><div class="summary-cell"><strong>' + entries.filter(entry => entry.kind === 'quick').length + '</strong><span>빠른 할 일</span></div></div><h2 class="section-title">삭제 대기 항목</h2>' + (rows ? '<div class="trash-list">' + rows + '</div>' : '<div class="empty"><strong>휴지통이 비어 있어요.</strong><span>삭제한 Flow와 빠른 할 일이 여기에 모입니다.</span></div>');
  }

  function newPlanDraft(flow) {
    const itemIds = flow.steps.reduce((ids, step) => ids.concat(step.itemIds), []);
    return {
      flowId: flow.id,
      title: flow.title,
      items: itemIds.map(id => {
        const task = taskById(id);
        return { id, title: task.title, memo: task.memo, planDate: planDate(task) || null };
      })
    };
  }

  function resultItemIdentityAttributes(item) {
    return ' data-item-ref="' + escapeHtml(item.rowId) + '" data-source-item-ref="' + escapeHtml(item.sourceItemRef) + '" data-row-id="' + escapeHtml(item.rowId) + '" data-occurrence-id="' + escapeHtml(item.occurrenceId || '') + '" data-original-date="' + escapeHtml(item.originalDate || 'undated') + '" data-effective-date="' + escapeHtml(item.executionDate || 'undated') + '" data-completed="' + String(item.completed) + '"';
  }

  function resultItemSummary(item) {
    const original = item.originalDate || item.date || '날짜 미정';
    const occurrence = item.occurrenceIndex ? item.occurrenceIndex + '회차 · ' : '';
    return occurrence + '계획 ' + original + (item.executionDate !== item.originalDate ? ' · 실행 ' + (item.executionDate || '미정') : '') + ' · ' + (item.completed ? '완료' : '진행 중');
  }

  function renderOccurrenceFacts(item) {
    const properties = item.sourceProperties || {};
    const facts = [
      ['시간', item.time],
      ['시간대', properties['시간대']],
      ['장소', properties['장소']],
      ['반복', item.recurrenceSummary || properties['반복']],
      ['설명', properties['설명']],
      ['자료', properties['자료']]
    ].filter(entry => entry[1]);
    const factHtml = facts.length ? '<dl class="result-occurrence-facts">' + facts.map(entry => '<div><dt>' + escapeHtml(entry[0]) + '</dt><dd>' + escapeHtml(entry[1]) + '</dd></div>').join('') + '</dl>' : '';
    const subchecks = Array.isArray(item.subchecks) && item.subchecks.length
      ? '<ul class="result-occurrence-subchecks" aria-label="하위 체크">' + item.subchecks.map(entry => '<li>' + (entry.sourceChecked ? '☑ ' : '☐ ') + escapeHtml(entry.title) + '</li>').join('') + '</ul>'
      : '';
    return factHtml + subchecks;
  }

  function renderResultItem(item, view, flowId) {
    const identity = resultItemIdentityAttributes(item);
    const focusToken = 'result-' + view + '-' + item.rowId;
    const sourceButton = '<button class="result-item" type="button" data-action="result-open-item" data-id="' + escapeHtml(item.id) + '"' + identity + ' data-return-focus="' + escapeHtml(focusToken) + '" aria-label="' + escapeHtml(item.title + (item.occurrenceIndex ? ' ' + item.occurrenceIndex + '회차, 원본 Item 열기' : ' 상세 열기')) + '"><span aria-hidden="true">' + (item.completed ? '✓' : '○') + '</span><span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(resultItemSummary(item)) + '</small></span></button>';
    if (!item.occurrenceId) return sourceButton;
    const actionData = ' data-flow-id="' + escapeHtml(flowId) + '" data-source-item-ref="' + escapeHtml(item.sourceItemRef) + '" data-occurrence-id="' + escapeHtml(item.occurrenceId) + '" data-original-date="' + escapeHtml(item.originalDate) + '"';
    const facts = view === 'calendar' ? renderOccurrenceFacts(item) : '';
    return '<article class="result-occurrence"' + identity + '>' + sourceButton + facts + '<div class="result-occurrence-actions"><button class="button quiet" type="button" data-action="move-result-occurrence-date"' + actionData + '>이 회차 날짜 이동</button><button class="button quiet" type="button" data-action="toggle-result-occurrence-complete" data-completed="' + String(item.completed) + '"' + actionData + '>' + (item.completed ? '이 회차 다시 열기' : '이 회차 완료') + '</button></div></article>';
  }

  function renderStaticResultItem(item, includeFacts) {
    return '<div class="result-occurrence static"' + resultItemIdentityAttributes(item) + '><div class="result-item"><span aria-hidden="true">' + (item.completed ? '✓' : '○') + '</span><span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(resultItemSummary(item)) + '</small></span></div>' + (includeFacts ? renderOccurrenceFacts(item) : '') + '</div>';
  }

  function renderResultCalendar(projection, scope, flowId) {
    const calendar = projection.calendar;
    const shiftAction = scope === 'authoring' ? 'authoring-calendar-shift' : 'result-calendar-shift';
    const selectAction = scope === 'authoring' ? 'authoring-calendar-select' : 'result-calendar-select';
    const itemRenderer = scope === 'authoring'
      ? item => renderStaticResultItem(item, true)
      : item => renderResultItem(item, 'calendar', flowId);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'].map(day => '<span>' + day + '</span>').join('');
    const cells = calendar.cells.map(cell => cell.date
      ? '<button type="button" class="result-calendar-cell' + (cell.selected ? ' selected' : '') + '" data-action="' + selectAction + '" data-date="' + escapeHtml(cell.date) + '" data-item-refs="' + escapeHtml(JSON.stringify(cell.itemRefs)) + '" data-occurrence-ids="' + escapeHtml(JSON.stringify(cell.occurrenceIds)) + '" data-completed-count="' + cell.completedCount + '" aria-pressed="' + String(cell.selected) + '" aria-label="' + escapeHtml(cell.date + ', 항목 ' + cell.itemRefs.length + '개, 완료 ' + cell.completedCount + '개') + '"><span>' + cell.day + '</span>' + (cell.itemRefs.length ? '<i aria-hidden="true"></i>' : '') + '</button>'
      : '<span class="result-calendar-cell empty" aria-hidden="true"></span>').join('');
    const selected = calendar.selectedItems.length
      ? calendar.selectedItems.map(itemRenderer).join('')
      : '<p class="result-calendar-empty">이 날짜에 실행할 항목이 없습니다.</p>';
    const undated = calendar.undatedItems.length
      ? calendar.undatedItems.map(itemRenderer).join('')
      : '<p class="result-calendar-empty">날짜 미정 항목이 없습니다.</p>';
    return '<div class="result-calendar-month" data-calendar-date-policy="' + escapeHtml(calendar.datePolicy) + '" data-calendar-week-start="' + escapeHtml(calendar.weekStartsOn) + '" data-calendar-week-count="' + calendar.weekCount + '" data-undated-item-refs="' + escapeHtml(JSON.stringify(calendar.undatedItemRefs)) + '" data-undated-occurrence-ids="' + escapeHtml(JSON.stringify(calendar.undatedOccurrenceIds)) + '"><section><div class="result-calendar-nav"><button class="button" type="button" data-action="' + shiftAction + '" data-delta="-1" aria-label="이전 달">‹</button><h3>' + escapeHtml(calendar.month.replace('-', '년 ') + '월') + '</h3><button class="button" type="button" data-action="' + shiftAction + '" data-delta="1" aria-label="다음 달">›</button></div><div class="result-calendar-weekdays" aria-hidden="true">' + weekdays + '</div><div class="result-calendar-grid" aria-label="' + escapeHtml(calendar.month + ' 날짜 선택') + '">' + cells + '</div></section><section class="result-calendar-list"><h3>' + escapeHtml(calendar.selectedDate) + '<span>' + calendar.selectedItems.length + '개</span></h3>' + selected + '</section><section class="result-calendar-list"><h3>날짜 미정<span>' + calendar.undatedItems.length + '개</span></h3>' + undated + '</section></div>';
  }

  function renderResultPanel(flow) {
    const projection = M.resultProjection(state(), flow.id, resultProjectionOptions());
    if (!projection) return '';
    const tabs = [['txt', 'TXT'], ['todo', '할 일'], ['calendar', '캘린더'], ['sheet', '표']].map(entry => '<button id="standalone-result-tab-' + entry[0] + '" type="button" role="tab" data-action="result-tab" data-view="' + entry[0] + '" aria-selected="' + String(resultView === entry[0]) + '" aria-controls="standalone-result-panel" tabindex="' + (resultView === entry[0] ? '0' : '-1') + '">' + entry[1] + '</button>').join('');
    const horizonAtLimit = resultOccurrencePage >= 130;
    const horizon = projection.occurrenceManifest.hasMore
      ? '<div class="result-horizon" data-occurrence-page="' + resultOccurrencePage + '"><span>유한 반복 ' + (M.FINITE_RECURRENCE_PAGE_SIZE * resultOccurrencePage) + '회 · 종료 없는 반복 ' + (M.OPEN_ENDED_RECURRENCE_WEEKS * resultOccurrencePage) + '주까지 네 결과에 함께 표시</span><button class="button" type="button" data-action="result-more-occurrences"' + (horizonAtLimit ? ' disabled' : '') + '>' + (horizonAtLimit ? '최대 범위' : '회차 더 보기') + '</button></div>'
      : '';
    let body = '';
    if (resultView === 'txt') {
      body = '<div class="copy-result-head"><span>복사용 TXT · 화면·복사·다운로드가 같은 바이트</span><span class="result-file-actions"><button class="button" type="button" data-action="copy-result-txt" data-flow-id="' + escapeHtml(flow.id) + '">TXT 복사</button><button class="button" type="button" data-action="download-result-txt" data-flow-id="' + escapeHtml(flow.id) + '">TXT 다운로드</button></span></div><pre class="result-txt" data-copy-only="true" data-result-manifest="' + escapeHtml(JSON.stringify(projection.itemRefs)) + '" data-occurrence-manifest="' + escapeHtml(JSON.stringify(projection.occurrenceIds)) + '">' + escapeHtml(projection.txt) + '</pre>';
    } else if (resultView === 'todo') {
      body = '<div class="result-list">' + projection.items.map(item => renderResultItem(item, 'todo', flow.id)).join('') + '</div>';
    } else if (resultView === 'calendar') {
      body = renderResultCalendar(projection, 'flow', flow.id);
    } else {
      body = '<div class="result-sheet-head"><span>원본 Item과 실행 회차를 분리한 읽기 전용 표입니다.</span><button class="button" type="button" data-action="download-result-csv" data-flow-id="' + escapeHtml(flow.id) + '">CSV 다운로드</button></div><div class="result-sheet-scroll"><table class="result-sheet"><caption class="visually-hidden">실행 회차 표 보기</caption><thead><tr><th>순서</th><th>회차</th><th>할 일</th><th>원 발생일</th><th>실행 날짜</th><th>상태</th></tr></thead><tbody>' + projection.sheet.map(row => '<tr data-item-ref="' + escapeHtml(row.itemRef) + '" data-source-item-ref="' + escapeHtml(row.sourceItemRef) + '" data-occurrence-id="' + escapeHtml(row.occurrenceId || '') + '"><td>' + row.order + '</td><td>' + escapeHtml(row.occurrenceIndex ? row.occurrenceIndex + '회차' : '—') + '</td><td>' + escapeHtml(row.title) + '</td><td>' + escapeHtml(row.originalDate || '미정') + '</td><td>' + escapeHtml(row.executionDate || '미정') + '</td><td>' + escapeHtml(row.status) + '</td></tr>').join('') + '</tbody></table></div>';
    }
    return '<section class="result-panel" data-testid="standalone-result-surface" data-flow-ref="' + escapeHtml(projection.flowRef) + '" data-result-view="' + escapeHtml(resultView) + '" data-result-item-refs="' + escapeHtml(JSON.stringify(projection.itemRefs)) + '" data-result-source-item-refs="' + escapeHtml(JSON.stringify(projection.sourceItemRefs)) + '" data-result-row-ids="' + escapeHtml(JSON.stringify(projection.rowIds)) + '" data-result-occurrence-ids="' + escapeHtml(JSON.stringify(projection.occurrenceIds)) + '"><div class="result-head"><div><p class="eyebrow">Flow 결과</p><h2>원본 Item과 실행 회차, 네 결과</h2><p>TXT, 할 일, 캘린더, 표가 같은 회차 식별자·순서·날짜·완료 상태를 사용합니다.</p></div><button class="button" type="button" data-action="open-plan-editor" data-id="' + escapeHtml(flow.id) + '">Plan 편집</button></div><details class="working-source" data-working-source-kind="' + escapeHtml(projection.workingSource.kind) + '"><summary>WorkingSource 확인</summary><p>결과 TXT와 분리된 읽기 전용 원문입니다. 저장한 개인 shadow 변경은 이 원문에 역반영되지 않습니다.</p><pre>' + escapeHtml(projection.workingSource.rawText) + '</pre></details>' + horizon + '<div class="result-tabs" role="tablist" aria-label="네 가지 결과 보기">' + tabs + '</div><div id="standalone-result-panel" class="result-body" role="tabpanel" aria-labelledby="standalone-result-tab-' + escapeHtml(resultView) + '" tabindex="0" data-result-manifest="' + escapeHtml(JSON.stringify(projection.itemRefs)) + '" data-occurrence-manifest="' + escapeHtml(JSON.stringify(projection.occurrenceIds)) + '">' + body + '</div></section>';
  }

  function renderPlanEditor(flow) {
    if (!planDraft || planDraft.flowId !== flow.id) planDraft = newPlanDraft(flow);
    const source = '<section class="source-read-only" data-editor-field-group="source-read-only"><p class="eyebrow">원본 정보</p><strong>' + escapeHtml(sourceTitle(flow)) + '</strong><span>' + escapeHtml(flow.originLabel) + '</span>' + (flow.rawText !== null ? '<pre>' + escapeHtml(flow.rawText) + '</pre>' : '') + '</section>';
    const rows = planDraft.items.map(draft => {
      const task = taskById(draft.id);
      return '<article class="plan-edit-item" data-item-id="' + escapeHtml(draft.id) + '" data-item-ref="' + escapeHtml(task.ref || '') + '"><div class="plan-item-summary"><div><small>Item</small><strong>' + escapeHtml(draft.title) + '</strong><span>' + escapeHtml(draft.planDate ? dateLabel(draft.planDate) : '날짜 미정') + (draft.memo ? ' · 메모 있음' : '') + '</span></div><button class="button" type="button" data-action="open-plan-item-editor" data-id="' + escapeHtml(draft.id) + '" data-return-focus="plan-item-' + escapeHtml(draft.id) + '">수정</button></div><div class="source-item"><small>원본 정보</small><strong>' + escapeHtml(sourceTitle(task)) + '</strong><span>처음 계획한 날짜 · ' + escapeHtml(task.sourceDate || '미정') + '</span>' + (sourceMemo(task) ? '<span>' + escapeHtml(sourceMemo(task)) + '</span>' : '') + '</div></article>';
    }).join('');
    return '<button class="detail-back" type="button" data-action="close-plan-editor">← Flow로</button><section class="plan-editor" data-product-plan-item-grammar="v1" data-testid="standalone-plan-editor" data-editor-schema-fields="source-read-only,personal-title,personal-item-title,personal-memo,plan-schedule" data-editor-persistence-scope="poc-shadow-only"><header><p class="eyebrow">Plan 편집</p><h1>' + escapeHtml(flowDisplayTitle(flow)) + '</h1><p>Flow 제목과 Item을 검토한 뒤 마지막에 한 번 저장하세요. 개인 shadow에만 저장되며 원문으로 돌아가지 않습니다.</p></header>' + source + '<label class="field plan-title"><span>Flow 제목</span><input data-plan-field="flow-title" value="' + escapeHtml(planDraft.title) + '" maxlength="120"></label><section class="plan-edit-list"><h2>Item</h2>' + rows + '</section><div class="detail-toolbar plan-save-bar"><button class="button" type="button" data-action="close-plan-editor">취소</button><button class="button primary" type="button" data-action="commit-plan-editor">Plan 전체 저장</button></div></section>';
  }

  function openItemDetail(id, opener) {
    const task = taskById(id);
    if (!task) return;
    itemReturn = { screen: copyScreen(screen), focusSelector: returnFocusSelector(opener) };
    itemDraft = null;
    screen = {
      type: 'item-detail',
      view: screen.view || 'today',
      selectedFlowId: task.flowId,
      selectedItemId: task.id,
      itemContext: opener && opener.dataset.context ? opener.dataset.context : (screen.view || 'today')
    };
    render();
    focusAfterRender('[data-item-detail-heading]', '[data-action="close-item-detail"]');
  }

  function closeItemDetail() {
    const destination = itemReturn ? itemReturn.screen : { type: 'workspace', view: screen.view || 'today', selectedFlowId: null };
    const focusSelector = itemReturn ? itemReturn.focusSelector : '';
    itemReturn = null;
    itemDraft = null;
    screen = destination;
    render();
    focusAfterRender(focusSelector, '#main');
  }

  function openItemEditor(task, opener) {
    if (!task) return;
    itemEditorReturn = { screen: copyScreen(screen), focusSelector: returnFocusSelector(opener) };
    if (task.flowId) {
      const flow = flowById(task.flowId);
      if (!flow) return;
      if (!planDraft || planDraft.flowId !== flow.id) planDraft = newPlanDraft(flow);
      const staged = planDraft.items.find(entry => entry.id === task.id);
      if (!staged) return;
      itemDraft = { mode: 'plan', id: task.id, flowId: task.flowId, title: staged.title, memo: staged.memo, planDate: staged.planDate };
    } else {
      itemDraft = { mode: 'quick', id: task.id, flowId: null, title: task.title, memo: task.memo || '', date: task.date, folderId: task.folderId };
    }
    screen = { type: 'item-editor', view: screen.view || 'today', selectedFlowId: task.flowId, selectedItemId: task.id, itemContext: screen.itemContext || screen.view || 'today' };
    render();
    focusAfterRender('[data-item-field="title"]', '[data-action="close-item-editor"]');
  }

  function closeItemEditor(message) {
    const destination = itemEditorReturn ? itemEditorReturn.screen : { type: 'item-detail', view: screen.view || 'today', selectedFlowId: screen.selectedFlowId, selectedItemId: screen.selectedItemId };
    const focusSelector = itemEditorReturn ? itemEditorReturn.focusSelector : '';
    itemDraft = null;
    itemEditorReturn = null;
    screen = destination;
    setSaveStatus(message || '수정을 취소했어요.', 'noop');
    render();
    focusAfterRender(focusSelector, '[data-action="edit-item"]');
  }

  function renderItemDetail(task) {
    const flow = task.flowId ? flowById(task.flowId) : null;
    const title = task.title;
    const context = screen.itemContext || screen.view || 'today';
    const backLabel = itemReturn && itemReturn.screen.selectedFlowId ? 'Flow로' : contextLabel(screen.view || 'today') + '으로';
    const source = flow
      ? '<section class="item-source" data-source-snapshot="true"><p class="eyebrow">원본 정보</p><strong>' + escapeHtml(sourceTitle(task)) + '</strong><span>처음 계획한 날짜 · ' + escapeHtml(task.sourceDate || '미정') + '</span>' + (sourceMemo(task) ? '<p>' + escapeHtml(sourceMemo(task)) + '</p>' : '') + '<p>여기서 바꾸는 실행 날짜는 원래 계획을 바꾸지 않아요.</p></section>'
      : '';
    return '<button class="detail-back" type="button" data-action="close-item-detail">← ' + escapeHtml(backLabel) + '</button><article class="item-detail" data-product-plan-item-grammar="v1" data-testid="standalone-item-detail" data-item-id="' + escapeHtml(task.id) + '" data-item-ref="' + escapeHtml(task.ref || '') + '"><header><div class="meta"><span class="origin">' + escapeHtml(flow ? 'Flow Item' : '빠른 할 일') + '</span><span>' + escapeHtml(flow ? flowDisplayTitle(flow) : folderTitle(task.folderId)) + '</span></div><h1 tabindex="-1" data-item-detail-heading>' + escapeHtml(title) + '</h1><p>' + (task.done ? '완료한 항목입니다.' : '진행 중인 항목입니다.') + '</p></header><section class="item-facts" aria-label="Item 정보"><div><span>실행 날짜</span><strong>' + escapeHtml(dateLabel(task.date)) + '</strong></div><div><span>메모</span><strong>' + escapeHtml(task.memo || '메모 없음') + '</strong></div><div><span>폴더</span><strong>' + escapeHtml(folderTitle(flow ? flow.folderId : task.folderId)) + '</strong></div></section>' + source + '<div class="detail-toolbar item-actions"><button class="button primary" type="button" data-action="edit-item" data-id="' + escapeHtml(task.id) + '" data-return-focus="item-edit-' + escapeHtml(task.id) + '">' + (flow ? 'Plan에서 수정' : '수정') + '</button><button class="button" type="button" data-action="task-menu" data-move-kind="task" data-move-source="detail" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '" aria-controls="move-panel" aria-expanded="' + Boolean(moveTarget && moveTarget.kind === 'task' && moveTarget.id === task.id) + '">날짜·위치 이동</button><button class="button" type="button" data-action="toggle-complete" data-id="' + escapeHtml(task.id) + '">' + (task.done ? '다시 열기' : '완료') + '</button>' + (flow ? '' : '<button class="button danger" type="button" data-action="move-to-trash" data-kind="quick" data-id="' + escapeHtml(task.id) + '">휴지통으로</button>') + '</div></article>';
  }

  function renderItemEditor(task) {
    if (!itemDraft || itemDraft.id !== task.id) return renderItemDetail(task);
    const flow = task.flowId ? flowById(task.flowId) : null;
    const source = flow
      ? '<section class="item-source" data-source-snapshot="true"><p class="eyebrow">원본 정보</p><strong>' + escapeHtml(sourceTitle(task)) + '</strong><span>처음 계획한 날짜 · ' + escapeHtml(task.sourceDate || '미정') + '</span></section>'
      : '';
    const dateValue = itemDraft.mode === 'plan' ? itemDraft.planDate : itemDraft.date;
    const folder = itemDraft.mode === 'quick'
      ? '<label class="field"><span>폴더</span><select data-item-field="folder">' + folderOptions(itemDraft.folderId, true) + '</select></label>'
      : '<div class="inherited-folder"><span>폴더</span><strong>' + escapeHtml(folderTitle(flow ? flow.folderId : null)) + '</strong><small>Flow의 폴더를 함께 사용합니다.</small></div>';
    const guidance = itemDraft.mode === 'plan'
      ? '<p class="editor-guidance">이 Item을 Plan에 반영한 뒤, Plan 전체 저장을 눌러 확정하세요.</p>'
      : '<p class="editor-guidance">저장하면 이 빠른 할 일만 바뀌고 되돌릴 수 있어요.</p>';
    return '<button class="detail-back" type="button" data-action="close-item-editor">← 취소</button><section class="item-editor" data-product-plan-item-grammar="v1" data-testid="standalone-item-editor" data-editor-mode="' + escapeHtml(itemDraft.mode) + '"><header><p class="eyebrow">Item 편집</p><h1>' + escapeHtml(task.title) + '</h1></header>' + source + '<label class="field"><span>Item 제목</span><input data-item-field="title" value="' + escapeHtml(itemDraft.title) + '" maxlength="120"></label><label class="field"><span>메모</span><textarea data-item-field="memo" rows="4">' + escapeHtml(itemDraft.memo) + '</textarea></label><label class="field"><span>계획 날짜</span><input type="date" data-item-field="date" value="' + escapeHtml(dateValue || '') + '"></label>' + folder + guidance + '<div class="detail-toolbar item-save-bar"><button class="button" type="button" data-action="close-item-editor">취소</button><button class="button primary" type="button" data-action="save-item-editor">' + (itemDraft.mode === 'plan' ? 'Plan에 반영' : '저장') + '</button></div></section>';
  }

  function renderFlowDetail(flow) {
    const total = flow.steps.reduce((sum, step) => sum + step.itemIds.length, 0);
    const done = flow.steps.reduce((sum, step) => sum + step.itemIds.filter(id => taskById(id).done).length, 0);
    let steps = '';
    flow.steps.forEach(step => {
      const context = 'flow:' + flow.id + ':' + step.id;
      const ids = M.viewTaskIds(state(), context).filter(id => step.itemIds.includes(id));
      steps += '<section class="step-block"><h2>' + escapeHtml(step.title) + '</h2>' + renderTaskList(ids, context) + '</section>';
    });
    const raw = flow.rawText === null ? '' : '<details class="raw-source"><summary>저장한 원문 보기</summary><pre>' + escapeHtml(flow.rawText) + '</pre></details>';
    if (screen.type === 'plan-editor') return renderPlanEditor(flow);
    return '<button class="detail-back" type="button" data-action="close-flow">← ' + escapeHtml(contextLabel(screen.view || 'today')) + '으로</button><section class="detail-header"><div class="meta"><span class="origin">' + escapeHtml(flow.originLabel) + '</span><span>' + escapeHtml(folderTitle(flow.folderId)) + '</span></div><h1>' + escapeHtml(flowDisplayTitle(flow)) + '</h1><p>' + total + '개 중 ' + done + '개 완료 · 이 화면의 완료와 날짜 이동은 기간 보기에도 같은 상태로 보입니다.</p><div class="detail-toolbar"><button class="button" type="button" data-action="open-plan-editor" data-id="' + escapeHtml(flow.id) + '">개인 편집</button><button class="button" type="button" data-action="flow-menu" data-move-kind="flow" data-move-source="more" data-id="' + escapeHtml(flow.id) + '" data-context="' + escapeHtml(screen.view || 'today') + '" aria-controls="move-panel" aria-expanded="' + Boolean(moveTarget && moveTarget.kind === 'flow' && moveTarget.id === flow.id) + '">폴더 이동</button>' + (flow.rawText !== null ? '<button class="button" type="button" data-action="go-authoring">새 작성본 만들기</button>' : '') + '<button class="button danger" type="button" data-action="move-to-trash" data-kind="flow" data-id="' + escapeHtml(flow.id) + '">휴지통으로</button></div></section>' + steps + raw + renderResultPanel(flow);
  }

  function renderLosslessSourceAdapter(analysis, parsed) {
    if (!analysis.rawText) return '';
    if (analysis.status === 'safe-table') {
      const header = analysis.projection.headers.map(value => '<th>' + escapeHtml(value) + '</th>').join('');
      const rows = analysis.projection.rows.map(row => '<tr data-source-row-id="' + escapeHtml(row.sourceRowId) + '">' + row.cells.map(cell => '<td>' + escapeHtml(cell.value || '—') + '</td>').join('') + '</tr>').join('');
      return '<section class="lossless-source-adapter" data-testid="standalone-lossless-table" data-lossless-version="' + analysis.version + '" data-source-mutation-count="0"><div class="lossless-source-head"><div><p class="eyebrow">원문 표 · 무손실 보기</p><h3>행과 셀을 원문 위치 그대로 읽었습니다</h3><span>표 행을 할 일이나 일정으로 임의 변환하지 않습니다.</span></div><button class="button" type="button" data-action="copy-lossless-raw">원문 복사</button></div><div class="result-sheet-scroll" tabindex="0" aria-label="원문 표, 가로로 스크롤 가능"><table class="result-sheet"><thead><tr>' + header + '</tr></thead><tbody>' + rows + '</tbody></table></div><p>' + analysis.projection.rows.length + '개 SourceRow · 표 행은 자료로만 유지됩니다.</p></section>';
    }
    if (analysis.status === 'raw-fallback' || parsed.itemCount === 0) {
      return '<section class="lossless-source-adapter raw" data-testid="standalone-lossless-raw" data-lossless-status="' + escapeHtml(analysis.status) + '" data-source-mutation-count="0"><div><strong>이 내용은 구조를 추측하지 않고 원문으로 유지합니다.</strong><span>' + analysis.budget.physicalLines + '줄 · ' + analysis.budget.utf8Bytes + '바이트 · 원문은 그대로 유지됩니다.</span></div><button class="button" type="button" data-action="copy-lossless-raw">원문 그대로 복사</button></section>';
    }
    return '';
  }

  function renderAuthoringPreview() {
    const target = document.getElementById('authoring-artifact-result');
    if (!target) return;
    const parsed = M.parseSource(authoring.rawText);
    const lossless = M.analyzeLosslessAuthoring(authoring.rawText);
    const projection = M.authoringResultProjection(authoring.rawText, authoringProjectionOptions());
    const tabs = [['txt', 'TXT'], ['todo', '할 일'], ['calendar', '캘린더'], ['sheet', '표']].map(entry => '<button id="authoring-result-tab-' + entry[0] + '" type="button" role="tab" data-action="authoring-result-tab" data-view="' + entry[0] + '" aria-selected="' + String(authoringResultView === entry[0]) + '" aria-controls="authoring-result-panel" tabindex="' + (authoringResultView === entry[0] ? '0' : '-1') + '">' + entry[1] + '</button>').join('');
    let resultBody = '';
    if (!projection.items.length) {
      resultBody = '<div class="empty"><strong>실행할 Item을 입력해 주세요.</strong><span># Flow 이름, ## 단계, - [ ] 할 일을 구조로 읽습니다.</span></div>';
    } else if (authoringResultView === 'txt') {
      resultBody = '<div class="copy-result-head"><span>복사용 결과 · 화면·복사·다운로드가 같은 바이트</span><span class="result-file-actions"><button class="button" type="button" data-action="copy-authoring-txt">TXT 복사</button><button class="button" type="button" data-action="download-authoring-txt">TXT 다운로드</button></span></div><pre class="result-txt" data-copy-only="true" data-result-manifest="' + escapeHtml(JSON.stringify(projection.itemRefs)) + '" data-occurrence-manifest="' + escapeHtml(JSON.stringify(projection.occurrenceIds)) + '">' + escapeHtml(projection.txt) + '</pre>';
    } else if (authoringResultView === 'todo') {
      resultBody = '<div class="result-list">' + projection.items.map(item => renderStaticResultItem(item, false)).join('') + '</div>';
    } else if (authoringResultView === 'calendar') {
      resultBody = renderResultCalendar(projection, 'authoring', null);
    } else {
      resultBody = '<div class="result-sheet-head"><span>WorkingSource를 바꾸지 않는 회차별 읽기 전용 표입니다.</span><button class="button" type="button" data-action="download-authoring-csv">CSV 다운로드</button></div><div class="result-sheet-scroll"><table class="result-sheet"><caption class="visually-hidden">작성 결과 회차 표</caption><thead><tr><th>순서</th><th>회차</th><th>할 일</th><th>원 발생일</th><th>상태</th></tr></thead><tbody>' + projection.sheet.map(row => '<tr data-item-ref="' + escapeHtml(row.itemRef) + '" data-source-item-ref="' + escapeHtml(row.sourceItemRef) + '" data-occurrence-id="' + escapeHtml(row.occurrenceId || '') + '"><td>' + row.order + '</td><td>' + escapeHtml(row.occurrenceIndex ? row.occurrenceIndex + '회차' : '—') + '</td><td>' + escapeHtml(row.title) + '</td><td>' + escapeHtml(row.originalDate || '미정') + '</td><td>' + escapeHtml(row.status) + '</td></tr>').join('') + '</tbody></table></div>';
    }
    const horizonAtLimit = authoringOccurrencePage >= 130;
    const horizon = projection.occurrenceManifest.hasMore
      ? '<div class="result-horizon" data-occurrence-page="' + authoringOccurrencePage + '"><span>유한 반복 ' + (M.FINITE_RECURRENCE_PAGE_SIZE * authoringOccurrencePage) + '회 · 종료 없는 반복 ' + (M.OPEN_ENDED_RECURRENCE_WEEKS * authoringOccurrencePage) + '주까지 네 결과에 함께 표시</span><button class="button" type="button" data-action="authoring-more-occurrences"' + (horizonAtLimit ? ' disabled' : '') + '>' + (horizonAtLimit ? '최대 범위' : '회차 더 보기') + '</button></div>'
      : '';
    let body = '<div class="authoring-working-source" data-working-source="true"><strong>WorkingSource → 결과</strong><span>원문 편집은 아래 결과에 즉시 반영됩니다. 개인 Flow 저장 뒤 shadow 수정은 원문으로 돌아오지 않습니다.</span></div>' + renderLosslessSourceAdapter(lossless, parsed) + horizon + '<div class="result-tabs authoring-result-tabs" role="tablist" aria-label="작성 결과 보기">' + tabs + '</div><div id="authoring-result-panel" class="result-body" role="tabpanel" aria-labelledby="authoring-result-tab-' + escapeHtml(authoringResultView) + '" data-result-manifest="' + escapeHtml(JSON.stringify(projection.itemRefs)) + '" data-source-item-manifest="' + escapeHtml(JSON.stringify(projection.sourceItemRefs)) + '" data-occurrence-manifest="' + escapeHtml(JSON.stringify(projection.occurrenceIds)) + '">' + resultBody + '</div>';
    if (parsed.issues.length) body += '<ul class="issue-list">' + parsed.issues.map(issue => '<li>' + escapeHtml(issue.message) + (issue.line ? ' (' + issue.line + '행)' : '') + '</li>').join('') + '</ul>';
    if (parsed.ignoredLineCount) body += '<p class="ignored-note">일반 문장 ' + parsed.ignoredLineCount + '줄은 원문에 보존하고 실행 항목으로 자동 변환하지 않았어요.</p>';
    target.innerHTML = body;
    const review = document.getElementById('authoring-review');
    const reviewBody = document.getElementById('authoring-review-body');
    const reviewOpener = document.getElementById('authoring-review-opener');
    if (review) review.hidden = !authoringReviewOpen;
    if (reviewOpener) {
      const nearMissCount = M.listAuthoringNearMissTargets(authoring.rawText).filter(entry => !dismissedNearMisses.has(entry.targetId)).length;
      reviewOpener.disabled = parsed.itemCount === 0 && nearMissCount === 0;
      reviewOpener.setAttribute('aria-expanded', String(authoringReviewOpen));
      reviewOpener.textContent = '항목 검토 ' + (parsed.itemCount + nearMissCount);
    }
    if (reviewBody) {
      const items = parsed.steps.filter(step => step.items.length).map(step => '<section><h3>' + escapeHtml(step.title) + '</h3><ol>' + step.items.map(renderAuthoringReviewItem).join('') + '</ol></section>').join('');
      const nearMisses = M.listAuthoringNearMissTargets(authoring.rawText).filter(entry => !dismissedNearMisses.has(entry.targetId));
      const nearMiss = nearMisses.length ? '<section class="near-miss-list"><h3>할 일처럼 보이는 줄</h3><p>자동으로 고치지 않습니다. 원하는 줄만 확인해서 바꿔 주세요.</p>' + nearMisses.map(entry => '<article data-near-miss-id="' + escapeHtml(entry.targetId) + '"><strong>' + escapeHtml(entry.title) + '</strong><span>' + entry.sourceLine + '행</span><div><button class="button" type="button" data-action="repair-near-miss" data-target-id="' + escapeHtml(entry.targetId) + '">할 일로 고치기</button><button class="button" type="button" data-action="dismiss-near-miss" data-target-id="' + escapeHtml(entry.targetId) + '">그대로 두기</button></div></article>').join('') + '</section>' : '';
      reviewBody.innerHTML = items || nearMiss ? items + nearMiss : '<p>검토할 항목이 아직 없어요.</p>';
    }
    const count = document.getElementById('source-count');
    if (count) count.textContent = authoring.rawText.length + '자 · Item ' + parsed.itemCount + '개';
    const save = document.getElementById('commit-authoring');
    if (save) save.disabled = parsed.issues.length > 0 || parsed.itemCount === 0;
  }

  function syncAuthoringGhostScroll() {
    const editor = document.getElementById('flow-editor');
    const scroll = document.getElementById('authoring-ghost-scroll');
    if (!editor || !scroll) return;
    scroll.style.transform = 'translate(' + (-editor.scrollLeft) + 'px, ' + (-editor.scrollTop) + 'px)';
  }

  function renderAuthoringGhosts() {
    const editor = document.getElementById('flow-editor');
    const overlay = document.getElementById('authoring-ghost-overlay');
    const scroll = document.getElementById('authoring-ghost-scroll');
    const toggle = document.getElementById('authoring-ghost-toggle');
    if (!editor || !overlay || !scroll || !toggle) return;
    toggle.setAttribute('aria-pressed', String(authoringGhostVisible));
    overlay.hidden = !authoringGhostVisible;
    scroll.replaceChildren();
    if (!authoringGhostVisible) return;

    const fragment = document.createDocumentFragment();
    M.authoringGhostLines(editor.value).forEach(line => {
      const row = document.createElement('span');
      row.className = 'authoring-ghost-line';
      row.dataset.line = String(line.line);
      const sourceGeometry = document.createElement('span');
      sourceGeometry.className = 'authoring-ghost-source';
      sourceGeometry.textContent = line.rawLine || '\u00a0';
      row.appendChild(sourceGeometry);
      if (line.ghost) {
        const ghost = document.createElement('span');
        ghost.className = 'authoring-ghost';
        ghost.dataset.ghostHint = line.ghost.hintId;
        ghost.style.left = line.ghost.offset + 'ch';
        ghost.textContent = line.ghost.text;
        row.appendChild(ghost);
      }
      fragment.appendChild(row);
    });
    scroll.appendChild(fragment);
    syncAuthoringGhostScroll();
  }

  function mountAuthoringGhostEditor() {
    const editor = document.getElementById('flow-editor');
    if (!editor || document.getElementById('flow-editor-frame')) return;
    editor.insertAdjacentHTML('beforebegin', '<div class="flow-editor-tools"><span>빈칸에 표시되는 장식 예시</span><button id="authoring-ghost-toggle" class="authoring-ghost-toggle" type="button" data-action="toggle-authoring-ghost" aria-pressed="' + String(authoringGhostVisible) + '" aria-controls="authoring-ghost-overlay">입력 예시</button></div>');
    const frame = document.createElement('div');
    frame.id = 'flow-editor-frame';
    frame.className = 'flow-editor-frame';
    editor.parentNode.insertBefore(frame, editor);
    frame.appendChild(editor);
    frame.insertAdjacentHTML('afterbegin', '<div id="authoring-ghost-overlay" class="authoring-ghost-overlay" aria-hidden="true"><div id="authoring-ghost-scroll" class="authoring-ghost-scroll"></div></div>');
    renderAuthoringGhosts();
  }

  function prepareTemplatePreviewAccessibility() {
    const examplePreview = document.getElementById('template-example-preview');
    const exampleLabel = document.getElementById('template-example-label');
    if (examplePreview) examplePreview.removeAttribute('aria-live');
    if (exampleLabel) exampleLabel.setAttribute('aria-live', 'polite');
  }

  function applyNativeTemplateScaffold(editor, template) {
    const before = {
      value: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
      selectionDirection: editor.selectionDirection,
      scrollTop: editor.scrollTop,
      scrollLeft: editor.scrollLeft
    };
    if (before.value !== '' || typeof document.execCommand !== 'function') return false;

    editor.focus({ preventScroll: true });
    editor.setSelectionRange(0, 0, 'none');
    editor.scrollTop = before.scrollTop;
    editor.scrollLeft = before.scrollLeft;
    nativeTemplateInsertPending = true;
    nativeTemplateInputEventCount = 0;
    let commandAccepted = false;
    try {
      commandAccepted = document.execCommand('insertText', false, template.scaffold);
    } catch (error) {
      commandAccepted = false;
    }
    const exactCommit = commandAccepted === true && editor.value === template.scaffold && nativeTemplateInputEventCount > 0;
    if (!exactCommit && editor.value !== before.value) {
      try { document.execCommand('undo'); } catch (error) { /* The exact check below still fails closed. */ }
    }
    nativeTemplateInsertPending = false;

    if (!exactCommit) {
      if (editor.value === before.value) {
        authoring.rawText = before.value;
        editor.setSelectionRange(before.selectionStart, before.selectionEnd, before.selectionDirection);
        editor.scrollTop = before.scrollTop;
        editor.scrollLeft = before.scrollLeft;
        renderAuthoringPreview();
        renderAuthoringGhosts();
        return false;
      }
      authoring.rawText = editor.value;
      renderAuthoringPreview();
      renderAuthoringGhosts();
      setSaveStatus('작성 틀 삽입 오류 · 원문을 확인해 주세요.', 'error');
      showToast('브라우저 편집 결과가 예상과 달라 저장하지 않았어요. 원문을 확인해 주세요.', false);
      return false;
    }

    authoring.rawText = editor.value;
    authoring.templateId = template.id;
    authoring.templatePickerOpen = false;
    setTemplatePickerOpen(false, false);
    renderAuthoringPreview();
    renderAuthoringGhosts();
    const firstHeadingCaret = template.scaffold.indexOf('# ') + 2;
    editor.setSelectionRange(firstHeadingCaret, firstHeadingCaret);
    syncAuthoringGhostScroll();
    return persistAuthoringDraft();
  }

  function renderAuthoring() {
    const templates = M.TEMPLATE_CATALOG.map(template => {
      const presentation = template;
      return '<article class="template-option"><button class="template-choice" type="button" data-action="select-template" data-template-id="' + escapeHtml(template.id) + '" data-template-preview-id="' + escapeHtml(template.id) + '" data-preview-active="' + String(authoringTemplatePreviewId === template.id) + '" aria-controls="template-example-preview"><strong>' + escapeHtml(presentation.label) + '</strong><span>' + escapeHtml(presentation.description) + '</span><small>예: ' + escapeHtml(presentation.exampleLabel) + '</small></button></article>';
    }).join('');
    const previewTemplate = M.templateById(authoringTemplatePreviewId) || M.TEMPLATE_CATALOG[0];
    const pickerHidden = authoring.templatePickerOpen ? '' : ' hidden';
    const inputActive = authoringStep === 'input' ? ' active' : '';
    const resultActive = authoringStep === 'result' ? ' active' : '';
    elements.content.innerHTML = '<section class="authoring-shell" data-product-plan-item-grammar="v1"><header class="authoring-head"><div><p class="eyebrow">내 원문으로 시작</p><h1>새 Flow 만들기</h1><p>메모하듯 쓰고 결과를 확인한 뒤 개인공간에 저장하세요.</p></div></header><nav class="authoring-mobile-tabs" aria-label="작성 화면"><button id="authoring-tab-input" type="button" data-action="authoring-step" data-step="input" aria-current="' + (authoringStep === 'input' ? 'page' : 'false') + '">입력</button><button id="authoring-tab-result" type="button" data-action="authoring-step" data-step="result" aria-current="' + (authoringStep === 'result' ? 'page' : 'false') + '">결과</button></nav><div class="authoring-grid"><section class="editor-panel authoring-pane' + inputActive + '" data-authoring-pane="input"><div class="panel-head"><h2>메모하듯 작성하세요</h2><span id="source-count"></span></div><div class="template-launch"><div><strong>작성 틀</strong><span>빈 원문에 골격만 넣습니다.</span></div><button class="button" id="template-picker-opener" type="button" data-action="toggle-template-picker" aria-expanded="' + String(authoring.templatePickerOpen) + '" aria-controls="template-picker-panel">작성 틀 보기</button></div><section id="template-picker-panel" class="template-picker-panel" aria-label="작성 틀 선택"' + pickerHidden + '><div class="template-picker-head"><div><strong>어떤 구조로 쓸까요?</strong><span>예시를 확인하고 빈 골격을 선택하세요.</span></div><button class="icon-button" type="button" data-action="cancel-template-picker" aria-label="작성 틀 닫기">×</button></div><div class="template-grid">' + templates + '</div><aside id="template-example-preview" class="template-example" role="region" aria-live="polite" aria-labelledby="template-example-label"><strong id="template-example-label">입력 예시 · ' + escapeHtml(previewTemplate.exampleLabel) + '</strong><pre id="template-example-source">' + escapeHtml(previewTemplate.exampleSource) + '</pre><p>예시는 원문에 들어가지 않고, 선택하면 빈칸 가이드만 표시됩니다.</p></aside><p class="template-contract">틀 이름·설명·예시는 원문에 들어가지 않습니다. 빈 원문에 골격만 한 번 넣습니다.</p></section><textarea id="flow-editor" class="flow-editor" spellcheck="false" aria-label="Flow 원문" placeholder="# Flow 이름\n\n## 첫 단계\n- [ ] 할 일">' + escapeHtml(authoring.rawText) + '</textarea><div class="authoring-input-actions"><button class="button" type="button" data-action="cancel-authoring">취소</button><button class="button primary" type="button" data-action="authoring-step" data-step="result">결과 보기</button></div></section><aside class="preview-panel authoring-pane' + resultActive + '" data-authoring-pane="result"><div class="panel-head"><div><h2>개인공간에 들어갈 내용</h2><span>작성 원문 → 결과</span></div><button id="authoring-review-opener" class="button subtle" type="button" data-action="toggle-authoring-review" aria-controls="authoring-review" aria-expanded="' + String(authoringReviewOpen) + '">항목 검토</button></div><p class="authoring-result-note">현재 원문을 실행할 Item으로 정리한 결과입니다.</p><div id="authoring-artifact-result" class="preview-body"></div><section id="authoring-review" class="authoring-review" aria-label="항목 검토" hidden><div class="authoring-review-head"><h2>항목 검토</h2><button class="icon-button" type="button" data-action="close-authoring-review" aria-label="항목 검토 닫기">×</button></div><div id="authoring-review-body"></div></section><div class="preview-body save-panel"><label class="field"><span>저장할 폴더</span><select id="authoring-folder">' + folderOptions(authoring.folderId, true) + '</select></label><div class="authoring-actions"><button class="button" type="button" data-action="authoring-step" data-step="input">원문 수정</button><button id="commit-authoring" class="button primary authoring-save-action" type="button" data-action="commit-authoring">개인 Flow로 저장</button></div></div></aside></div></section>';
    mountAuthoringGhostEditor();
    prepareTemplatePreviewAccessibility();
    renderAuthoringPreview();
  }

  function setAuthoringTemplatePreview(templateId) {
    const template = M.templateById(templateId);
    if (!template) return;
    authoringTemplatePreviewId = template.id;
    document.querySelectorAll('.template-choice[data-template-preview-id]').forEach(choice => {
      choice.dataset.previewActive = String(choice.dataset.templatePreviewId === template.id);
    });
    const label = document.getElementById('template-example-label');
    const source = document.getElementById('template-example-source');
    if (label) label.textContent = '입력 예시 · ' + template.exampleLabel;
    if (source) source.textContent = template.exampleSource;
  }

  function setAuthoringReviewOpen(open, returnFocus) {
    authoringReviewOpen = open;
    if (!open) authoringPropertyTarget = null;
    const review = document.getElementById('authoring-review');
    const opener = document.getElementById('authoring-review-opener');
    if (review) review.hidden = !open;
    if (opener) opener.setAttribute('aria-expanded', String(open));
    if (open && review) {
      const close = review.querySelector('[data-action="close-authoring-review"]');
      if (close) close.focus();
    } else if (returnFocus && opener) opener.focus();
  }

  function authoringPropertyInstances(item, entry) {
    if (!item || !entry) return [];
    return M.listAuthoringPropertyInstances({
      rawText: authoring.rawText,
      expectedSourceFingerprint: M.fingerprint(authoring.rawText),
      itemSourceLine: item.sourceLine,
      key: entry.key
    });
  }

  function authoringPropertyValue(item, entry) {
    if (!item || !entry || entry.key === 'subcheck' || entry.key === 'guide' || entry.key === 'caution') return '';
    const instances = authoringPropertyInstances(item, entry);
    return instances.length === 1 ? instances[0].rawValue : '';
  }

  function propertyInputType(entry) {
    if (entry.editor === 'native-date') return 'date';
    if (entry.editor === 'native-time') return 'time';
    return 'text';
  }

  function propertyInputPlaceholder(entry) {
    if (entry.key === 'relativeDate') return '예: D-7';
    if (entry.key === 'timezone') return '예: Asia/Seoul';
    if (entry.key === 'duration') return '예: 30분 또는 2시간';
    if (entry.key === 'repeat') return '예: 매주 월, 수';
    if (entry.key === 'repeatEnd') return '예: 10회 또는 2026-10-30';
    if (entry.valueKind === 'url') return 'https://… 또는 [이름](https://…)';
    if (entry.key === 'subcheck') return '예: 예약번호 확인';
    return '';
  }

  function dependentPropertyKind(key) {
    if (key === 'relativeDate') return 'relativeDate';
    if (key === 'timezone') return 'timezone';
    if (key === 'repeat' || key === 'repeatEnd') return 'repeat';
    return null;
  }

  function renderAuthoringPropertyInstances(item, entry, instances) {
    if (!instances.length) return '<span class="property-empty">입력 전</span>';
    return '<div class="property-existing-list" aria-label="현재 ' + escapeHtml(entry.label) + ' 값">' + instances.map(instance => {
      const checked = entry.key === 'subcheck' && instance.sourceChecked ? '완료 · ' : '';
      return '<button class="property-existing" type="button" data-action="locate-authoring-property" data-key="' + escapeHtml(entry.key) + '" data-property-source-line="' + instance.sourceLine + '"><span>' + escapeHtml(checked + instance.rawValue) + '</span><small>원문 ' + instance.sourceLine + '행 · 값 선택</small></button>';
    }).join('') + '</div>';
  }

  function renderAuthoringInlinePropertyForm(item, entry) {
    if (!authoringPropertyTarget || authoringPropertyTarget.editorKey !== entry.key) return '';
    const value = authoringPropertyValue(item, entry);
    const inputId = 'authoring-inline-property-' + item.sourceLine + '-' + entry.key;
    const label = entry.key === 'subcheck'
      ? '추가할 하위 체크'
      : entry.key === 'guide' || entry.key === 'caution'
        ? '새 ' + entry.label + ' 한 줄'
        : entry.label;
    return '<form class="property-inline-form" data-authoring-inline-form="true" data-line="' + item.sourceLine + '" data-key="' + escapeHtml(entry.key) + '"><label for="' + escapeHtml(inputId) + '"><span>' + escapeHtml(label) + '</span><input id="' + escapeHtml(inputId) + '" name="value" type="' + propertyInputType(entry) + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(propertyInputPlaceholder(entry)) + '" autocomplete="off" autofocus></label><p>' + (entry.key === 'guide' || entry.key === 'caution' || entry.key === 'subcheck' ? '같은 문장은 추가하지 않습니다.' : '적용할 때 원문 한 곳만 한 번 바꿉니다.') + '</p><div class="property-inline-actions"><button class="button" type="button" data-action="cancel-authoring-property" data-line="' + item.sourceLine + '">취소</button><button class="button primary" type="submit">' + (entry.key === 'subcheck' || entry.key === 'guide' || entry.key === 'caution' ? '추가' : '적용') + '</button></div></form>';
  }

  function renderAuthoringPropertyTray(item) {
    if (!authoringPropertyTarget || authoringPropertyTarget.line !== item.sourceLine || authoringPropertyTarget.sourceFingerprint !== M.fingerprint(authoring.rawText)) return '';
    const activeGroup = M.AUTHORING_PROPERTY_GROUPS.some(group => group.key === authoringPropertyTarget.group) ? authoringPropertyTarget.group : 'schedule';
    const groups = M.AUTHORING_PROPERTY_GROUPS.map(group => '<button class="property-group-choice" type="button" data-action="choose-authoring-property-group" data-line="' + item.sourceLine + '" data-group="' + escapeHtml(group.key) + '" aria-pressed="' + String(group.key === activeGroup) + '"><strong>' + escapeHtml(group.label) + '</strong><span>' + escapeHtml(group.description) + '</span></button>').join('');
    const entries = M.AUTHORING_PROPERTY_CATALOG.filter(entry => entry.group === activeGroup).map(entry => {
      const instances = authoringPropertyInstances(item, entry);
      const active = authoringPropertyTarget.editorKey === entry.key;
      const dependent = dependentPropertyKind(entry.key);
      const actionKey = dependent || entry.key;
      const actionLabel = dependent
        ? entry.key === 'repeatEnd' ? '반복과 함께 설정' : '함께 설정'
        : entry.key === 'subcheck' || entry.key === 'guide' || entry.key === 'caution' ? '추가' : instances.length ? '바꾸기' : '입력';
      return '<article class="property-card" data-property-key="' + escapeHtml(entry.key) + '" data-write-support="' + escapeHtml(entry.writeSupport) + '"><div class="property-card-head"><div><strong>' + escapeHtml(entry.label) + '</strong><small>원문 표기 · ' + escapeHtml(entry.sourceLabel) + '</small></div><button class="button quiet" type="button" data-action="edit-authoring-property" data-line="' + item.sourceLine + '" data-key="' + escapeHtml(actionKey) + '" aria-expanded="' + String(active) + '">' + escapeHtml(actionLabel) + '</button></div>' + renderAuthoringPropertyInstances(item, entry, instances) + renderAuthoringInlinePropertyForm(item, entry) + '</article>';
    }).join('');
    return '<section id="authoring-property-tray-' + item.sourceLine + '" class="property-inline-tray" data-authoring-property-tray="true" data-owner-line="' + item.sourceLine + '" aria-labelledby="authoring-property-tray-heading-' + item.sourceLine + '"><header><div><p>현재 할 일 안에서 편집</p><h4 id="authoring-property-tray-heading-' + item.sourceLine + '" tabindex="-1">추가할 정보 선택</h4></div><button class="button" type="button" data-action="close-authoring-properties" data-line="' + item.sourceLine + '">접기</button></header><p class="property-boundary-copy">여기서 바꾸면 WorkingSource와 결과가 함께 갱신됩니다. 개인 Flow로 저장한 뒤의 shadow 수정은 이 원문으로 돌아오지 않습니다.</p><div class="property-group-chooser" role="group" aria-label="정보 범주">' + groups + '</div><div class="property-card-list" data-property-group="' + escapeHtml(activeGroup) + '">' + entries + '</div></section>';
  }

  function renderAuthoringReviewItem(item) {
    const open = Boolean(authoringPropertyTarget && authoringPropertyTarget.line === item.sourceLine && authoringPropertyTarget.sourceFingerprint === M.fingerprint(authoring.rawText));
    return '<li class="authoring-review-item" data-authoring-item-line="' + item.sourceLine + '"><div class="authoring-review-summary"><span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.date ? dateLabel(item.date) : '날짜 미정') + '</small></span><button class="button quiet" type="button" data-action="open-authoring-properties" data-line="' + item.sourceLine + '" aria-expanded="' + String(open) + '" aria-controls="authoring-property-tray-' + item.sourceLine + '">' + (open ? '속성 접기' : '속성 편집') + '</button></div>' + (open ? renderAuthoringPropertyTray(item) : '') + '</li>';
  }

  function applyAuthoringSourcePlan(plan, successMessage) {
    if (elements.dialog.open) {
      elements.dialog.close();
      dialogSubmit = null;
      dialogReturnFocus = null;
    }
    if (authoringStep !== 'input') {
      authoringStep = 'input';
      authoringReviewOpen = false;
      renderAuthoring();
    }
    const editor = document.getElementById('flow-editor');
    const change = plan && plan.transaction && plan.transaction.change;
    if (!editor || !change || editor.value !== authoring.rawText || plan.transaction.beforeFingerprint !== M.fingerprint(authoring.rawText)) {
      setSaveStatus('원문이 달라 변경하지 않았어요.', 'error');
      showToast('편집을 시작한 뒤 원문이 달라졌어요. 현재 원문은 그대로예요.', false, null, 'error');
      return false;
    }
    const expected = editor.value.slice(0, change.from) + change.insert + editor.value.slice(change.to);
    if (expected !== plan.nextRawText) {
      setSaveStatus('안전 검사를 통과하지 못했어요.', 'error');
      showToast('원문 변경 범위를 확인할 수 없어 적용하지 않았어요.', false, null, 'error');
      return false;
    }
    if (typeof document.execCommand !== 'function') {
      setSaveStatus('이 브라우저에서는 안전한 원문 편집을 지원하지 않아요.', 'error');
      showToast('원문을 바꾸지 않았어요. 다른 최신 브라우저에서 다시 시도해 주세요.', false, null, 'error');
      return false;
    }
    const before = {
      value: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
      selectionDirection: editor.selectionDirection,
      scrollTop: editor.scrollTop,
      scrollLeft: editor.scrollLeft
    };
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(change.from, change.to);
    nativeSourcePlanPending = true;
    nativeSourcePlanInputEventCount = 0;
    let commandAccepted = false;
    try {
      commandAccepted = document.execCommand('insertText', false, change.insert);
    } catch (error) {
      commandAccepted = false;
    }
    const exactCommit = commandAccepted === true && editor.value === plan.nextRawText && nativeSourcePlanInputEventCount > 0;
    if (!exactCommit && editor.value !== before.value) {
      try { document.execCommand('undo'); } catch (error) { /* The exact check below reports any divergence. */ }
    }
    nativeSourcePlanPending = false;
    if (!exactCommit) {
      authoring.rawText = editor.value;
      renderAuthoringPreview();
      renderAuthoringGhosts();
      if (editor.value === before.value) {
        editor.setSelectionRange(before.selectionStart, before.selectionEnd, before.selectionDirection);
        editor.scrollTop = before.scrollTop;
        editor.scrollLeft = before.scrollLeft;
        setSaveStatus('안전한 원문 편집을 적용하지 못했어요.', 'error');
        showToast('원문을 바꾸지 않았어요. 다시 시도해 주세요.', false, null, 'error');
      } else {
        persistAuthoringDraft();
        setSaveStatus('브라우저 편집 결과를 확인해 주세요.', 'error');
        showToast('편집 결과가 예상과 달라요. 현재 원문을 확인해 주세요.', false, null, 'error');
      }
      return false;
    }
    authoring.rawText = editor.value;
    authoring.sourceConfirmed = false;
    authoringSourceMutationCount += 1;
    elements.app.dataset.authoringSourceMutations = String(authoringSourceMutationCount);
    if (authoringPropertyTarget) {
      authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, {
        sourceFingerprint: M.fingerprint(authoring.rawText),
        editorKey: null
      });
    }
    renderAuthoringPreview();
    renderAuthoringGhosts();
    const selection = plan.selection || { start: change.from, end: change.from + change.insert.length };
    editor.setSelectionRange(selection.start, selection.end);
    persistAuthoringDraft();
    setSaveStatus(successMessage + ' · 정확한 값 선택', 'saved');
    showToast(successMessage, false);
    return true;
  }

  function authoringPropertyResultMessage(result) {
    const messages = {
      'missing-dependency': '함께 필요한 값을 모두 입력해 주세요.',
      'conflicting-schedule': '날짜와 상대 날짜를 동시에 둘 수 없어요.',
      'invalid-value': '값 형식을 확인해 주세요.',
      'invalid-batch': '함께 설정할 값을 다시 확인해 주세요.',
      'duplicate-property': '같은 속성이 여러 개라 자동으로 고치지 않았어요.',
      'stale-source': '원문이 달라 변경하지 않았어요.',
      'unsafe-source-shape': '안전하게 바꿀 원문 범위를 찾지 못했어요.',
      'no-op': '이미 같은 값이에요. 원문은 바뀌지 않았습니다.'
    };
    return messages[result.reason || result.status] || '속성을 적용하지 않았어요.';
  }

  function applyAuthoringPropertyResult(result, successMessage) {
    if (result.status === 'applied') return applyAuthoringSourcePlan(result, successMessage);
    const message = authoringPropertyResultMessage(result);
    setSaveStatus(message, result.status === 'no-op' ? 'noop' : 'error');
    showToast(message, false, null, result.status === 'no-op' ? 'status' : 'error');
    return false;
  }

  function openAuthoringProperties(line) {
    const parsed = M.parseSource(authoring.rawText);
    const item = parsed.steps.flatMap(step => step.items).find(entry => entry.sourceLine === line);
    if (!item) {
      setSaveStatus('편집할 Item을 찾지 못했어요.', 'error');
      return;
    }
    const alreadyOpen = authoringPropertyTarget && authoringPropertyTarget.line === line && authoringPropertyTarget.sourceFingerprint === parsed.sourceFingerprint;
    authoringPropertyTarget = alreadyOpen ? null : { line, sourceFingerprint: parsed.sourceFingerprint, group: 'schedule', editorKey: null };
    renderAuthoringPreview();
    focusAfterRender(alreadyOpen ? '[data-action="open-authoring-properties"][data-line="' + line + '"]' : '#authoring-property-tray-heading-' + line, '#authoring-review-opener');
  }

  function chooseAuthoringPropertyGroup(line, group) {
    if (!authoringPropertyTarget || authoringPropertyTarget.line !== line || !M.AUTHORING_PROPERTY_GROUPS.some(entry => entry.key === group)) return;
    authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { group, editorKey: null });
    renderAuthoringPreview();
    focusAfterRender('[data-action="choose-authoring-property-group"][data-line="' + line + '"][data-group="' + group + '"]');
  }

  function closeAuthoringProperties(line) {
    if (!authoringPropertyTarget || authoringPropertyTarget.line !== line) return;
    authoringPropertyTarget = null;
    renderAuthoringPreview();
    focusAfterRender('[data-action="open-authoring-properties"][data-line="' + line + '"]', '#authoring-review-opener');
    setSaveStatus('속성 편집을 닫았어요. 원문은 그대로입니다.', 'noop');
  }

  function editAuthoringProperty(line, key) {
    const entry = M.authoringPropertyByKey(key);
    if (!entry || !authoringPropertyTarget || authoringPropertyTarget.line !== line) return;
    const dependent = dependentPropertyKind(key);
    if (dependent) {
      openAuthoringDependentPropertyDialog(line, dependent);
      return;
    }
    authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { sourceFingerprint: M.fingerprint(authoring.rawText), editorKey: key });
    renderAuthoringPreview();
    focusAfterRender('#authoring-inline-property-' + line + '-' + key, '#authoring-property-tray-heading-' + line);
  }

  function openAuthoringDependentPropertyDialog(line, kind) {
    const parsed = M.parseSource(authoring.rawText);
    const item = parsed.steps.flatMap(step => step.items).find(entry => entry.sourceLine === line);
    if (!item || !['relativeDate', 'timezone', 'repeat'].includes(kind)) {
      setSaveStatus('함께 설정할 값을 찾지 못했어요.', 'error');
      return;
    }
    authoringPropertyTarget = Object.assign({}, authoringPropertyTarget || {}, { line, sourceFingerprint: parsed.sourceFingerprint, editorKey: null });
    let body;
    if (kind === 'relativeDate') {
      const entry = M.authoringPropertyByKey('relativeDate');
      body = '<label class="field"><span>기준일 기준 날짜</span><input name="relativeDate" type="text" value="' + escapeHtml(authoringPropertyValue(item, entry)) + '" placeholder="D-7" autocomplete="off" autofocus></label><p class="editor-guidance">기준일이 없으면 원문에는 보존되지만 실제 날짜로 추정하지 않습니다.</p>';
    } else if (kind === 'timezone') {
      body = '<label class="field"><span>시간</span><input name="time" type="time" value="' + escapeHtml(authoringPropertyValue(item, M.authoringPropertyByKey('time'))) + '" required autofocus></label><label class="field"><span>시간대</span><input name="timezone" type="text" value="' + escapeHtml(authoringPropertyValue(item, M.authoringPropertyByKey('timezone')) || 'Asia/Seoul') + '" placeholder="Asia/Seoul" autocomplete="off" required></label><p class="editor-guidance">시간과 시간대를 한 번에 적용하고 Undo 한 번으로 되돌립니다.</p>';
    } else {
      body = '<label class="field"><span>반복</span><input name="repeat" type="text" value="' + escapeHtml(authoringPropertyValue(item, M.authoringPropertyByKey('repeat'))) + '" placeholder="매주 월, 수" autocomplete="off" required autofocus></label><label class="field"><span>반복 종료 <small>선택</small></span><input name="repeatEnd" type="text" value="' + escapeHtml(authoringPropertyValue(item, M.authoringPropertyByKey('repeatEnd'))) + '" placeholder="10회 또는 2026-10-30" autocomplete="off"></label><p class="editor-guidance">종료를 입력하면 반복과 한 번에 적용합니다. 실행 회차 정책을 새로 확정하지 않습니다.</p>';
    }
    openDialog(kind === 'relativeDate' ? '기준일 기준 날짜' : kind === 'timezone' ? '시간과 시간대' : '반복과 종료', '<form class="property-dependent-form" data-dialog-form="authoring-dependent-property" data-dependent-kind="' + escapeHtml(kind) + '" data-owner-line="' + line + '"><p class="property-dependent-owner"><strong>' + escapeHtml(item.title) + '</strong> · 원문 ' + line + '행</p>' + body + '<div class="dialog-actions"><button class="button" type="button" data-action="close-dialog">취소</button><button class="button primary" type="submit">함께 적용</button></div></form>', form => {
      const data = new FormData(form);
      let result;
      let label;
      if (kind === 'relativeDate') {
        result = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: authoring.rawText, expectedSourceFingerprint: authoringPropertyTarget.sourceFingerprint, itemSourceLine: line, key: 'relativeDate', value: String(data.get('relativeDate') || '') });
        label = '기준일 기준 날짜';
      } else {
        const repeatEndValue = String(data.get('repeatEnd') || '').trim();
        const updates = kind === 'timezone'
          ? [{ key: 'time', value: String(data.get('time') || '') }, { key: 'timezone', value: String(data.get('timezone') || '') }]
          : [{ key: 'repeat', value: String(data.get('repeat') || '') }, { key: 'repeatEnd', value: repeatEndValue }];
        result = kind === 'repeat' && !repeatEndValue
          ? M.planAuthoringPropertyEdit({ intent: 'apply', rawText: authoring.rawText, expectedSourceFingerprint: authoringPropertyTarget.sourceFingerprint, itemSourceLine: line, key: 'repeat', value: String(data.get('repeat') || '') })
          : M.planAuthoringPropertyBatchEdit({ intent: 'apply', rawText: authoring.rawText, expectedSourceFingerprint: authoringPropertyTarget.sourceFingerprint, itemSourceLine: line, updates });
        label = kind === 'timezone' ? '시간과 시간대' : '반복과 종료';
      }
      applyAuthoringPropertyResult(result, label + '를 원문에 한 번에 반영했어요.');
    });
  }

  function locateAuthoringProperty(key, propertySourceLine) {
    if (!authoringPropertyTarget) return;
    const result = M.locateAuthoringPropertyValue({ rawText: authoring.rawText, expectedSourceFingerprint: authoringPropertyTarget.sourceFingerprint, itemSourceLine: authoringPropertyTarget.line, key, propertySourceLine });
    if (result.status !== 'located') {
      setSaveStatus('선택할 기존 값이 없어요.', 'noop');
      showToast('아직 원문에 없는 속성입니다.', false);
      return;
    }
    authoringStep = 'input';
    authoringReviewOpen = false;
    dialogReturnFocus = null;
    if (elements.dialog.open) elements.dialog.close();
    dialogSubmit = null;
    renderAuthoring();
    window.setTimeout(() => {
      const editor = document.getElementById('flow-editor');
      if (!editor) return;
      editor.focus({ preventScroll: true });
      editor.setSelectionRange(result.selection.start, result.selection.end);
    }, 0);
    setSaveStatus('원문의 정확한 값을 선택했어요.', 'noop');
  }

  function setTemplatePickerOpen(open, returnFocus) {
    authoring.templatePickerOpen = open;
    const panel = document.getElementById('template-picker-panel');
    const opener = document.getElementById('template-picker-opener');
    if (!panel || !opener) return;
    panel.hidden = !open;
    opener.setAttribute('aria-expanded', String(open));
    if (open) {
      const first = panel.querySelector('.template-choice');
      if (first) first.focus();
    } else if (returnFocus) opener.focus();
  }

  function renderReceipt() {
    const receipt = authoringReceipt || state().lastReceipt;
    if (!receipt) { screen = { type: 'workspace', view: 'today', selectedFlowId: null }; render(); return; }
    elements.content.innerHTML = '<section class="receipt"><div class="receipt-mark" aria-hidden="true">✓</div><h1>개인 Flow로 저장했어요</h1><p>원문과 현재 해석을 한 번에 넘겼어요. 개인공간에서 폴더와 실행 날짜를 바꿀 수 있어요.</p><div class="receipt-info"><div><span>Flow</span><strong>' + escapeHtml(receipt.title) + '</strong></div><div><span>Item</span><strong>' + receipt.itemCount + '개</strong></div><div><span>저장 결과</span><strong>TXT · 할 일 · 캘린더 · 표</strong></div></div><div class="receipt-actions"><button class="button primary" type="button" data-action="open-receipt-flow" data-id="' + escapeHtml(receipt.flowId) + '">개인공간에서 열기</button></div></section>';
  }

  function render() {
    document.querySelectorAll('.product-nav button').forEach(button => {
      const active = screen.type === 'authoring' ? button.dataset.action === 'go-authoring' : button.dataset.action === 'go-workspace';
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    [elements.undo, elements.compactUndo].forEach(control => { control.disabled = envelope.undo === null; });
    elements.app.dataset.productPlanItemGrammar = 'v1';
    elements.app.dataset.successfulMutations = String(successfulMutations);
    elements.app.dataset.authoringSourceMutations = String(authoringSourceMutationCount);
    elements.app.dataset.storageMode = storageMode;
    elements.mutationCount.textContent = String(successfulMutations);
    elements.mutationCount.dataset.successfulMutations = String(successfulMutations);
    if (elements.storageModeNote) elements.storageModeNote.dataset.storageMode = storageMode;
    if (elements.footerStorageNote) elements.footerStorageNote.dataset.storageKey = M.STORAGE_KEY;
    renderSidebar();
    if (screen.type === 'authoring') renderAuthoring();
    else if (screen.type === 'receipt') renderReceipt();
    else if (screen.type === 'item-detail') {
      const task = taskById(screen.selectedItemId);
      elements.content.innerHTML = task ? renderItemDetail(task) : '';
    }
    else if (screen.type === 'item-editor') {
      const task = taskById(screen.selectedItemId);
      elements.content.innerHTML = task ? renderItemEditor(task) : '';
    }
    else if (screen.selectedFlowId) {
      const flow = flowById(screen.selectedFlowId);
      elements.content.innerHTML = flow ? renderFlowDetail(flow) : '';
    } else if (screen.view === 'trash') elements.content.innerHTML = renderTrashView();
    else if (screen.view.indexOf('folder:') === 0) elements.content.innerHTML = renderFolderView(screen.view);
    else elements.content.innerHTML = renderPeriodView(screen.view);
  }

  function openDialog(title, body, submitHandler) {
    if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false });
    dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    elements.dialogTitle.textContent = title;
    elements.dialogBody.innerHTML = body;
    dialogSubmit = submitHandler || null;
    elements.dialog.showModal();
    focusAfterRender('[autofocus]', '#dialog [data-action="close-dialog"]');
  }

  function closeDialog() {
    const returnFocus = dialogReturnFocus;
    dialogSubmit = null;
    if (elements.dialog.open) elements.dialog.close();
    dialogReturnFocus = null;
    window.setTimeout(() => {
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      else if (document.getElementById('main')) document.getElementById('main').focus({ preventScroll: true });
    }, 0);
  }

  function movePanelOpen() {
    return Boolean(moveTarget && elements.movePanel && !elements.movePanel.hidden);
  }

  function setMovePanelStatus(message, mode) {
    if (!elements.movePanelStatus) return;
    elements.movePanelStatus.textContent = message;
    elements.movePanelStatus.dataset.mode = mode || 'ready';
  }

  function syncMoveTriggerState() {
    document.querySelectorAll('[data-move-kind][data-id][aria-controls="move-panel"]').forEach(control => {
      const expanded = Boolean(moveTarget && control.dataset.moveKind === moveTarget.kind && control.dataset.id === moveTarget.id);
      control.setAttribute('aria-expanded', String(expanded));
    });
  }

  function findMoveReturnControl(info) {
    if (!info) return null;
    if (info.element && info.element.isConnected) return info.element;
    return Array.from(document.querySelectorAll('[data-move-kind][data-id][aria-controls="move-panel"]')).find(control =>
      control.dataset.moveKind === info.kind &&
      control.dataset.id === info.id &&
      control.dataset.moveSource === info.source
    ) || null;
  }

  function restoreMoveFocus(info) {
    window.requestAnimationFrame(() => {
      const control = findMoveReturnControl(info);
      if (control) {
        control.focus();
        return;
      }
      const heading = document.querySelector('.page-head h1, .detail-header h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus();
      }
    });
  }

  function closeMovePanel(options) {
    const settings = Object.assign({ restoreFocus: true, announce: true, message: '이동을 취소했어요.' }, options || {});
    const returnInfo = moveReturnFocus;
    moveTarget = null;
    moveReturnFocus = null;
    clearMoveDestinationHighlights();
    if (elements.movePanel) elements.movePanel.hidden = true;
    if (elements.movePanelBody) elements.movePanelBody.innerHTML = '';
    syncMoveTriggerState();
    if (settings.announce) setSaveStatus(settings.message, 'noop');
    if (settings.restoreFocus) restoreMoveFocus(returnInfo);
  }

  function folderDestinationRows(currentFolderId) {
    const rows = [{ id: null, title: '미분류', depth: 0 }];
    state().folders.filter(folder => folder.parentId === null).forEach(folder => {
      rows.push({ id: folder.id, title: folder.title, depth: 0 });
      state().folders.filter(child => child.parentId === folder.id).forEach(child => {
        rows.push({ id: child.id, title: child.title, depth: 1 });
      });
    });
    return rows.map(folder => {
      const current = folder.id === currentFolderId;
      return '<button class="move-destination" type="button" data-action="move-folder-target" data-move-destination="folder" data-folder-id="' + escapeHtml(folder.id || '') + '" data-current="' + current + '" aria-current="' + current + '"><span class="move-destination-label" data-depth="' + folder.depth + '">' + escapeHtml(folder.title) + '</span>' + (current ? '<span class="move-current">현재 위치</span>' : '') + '</button>';
    }).join('');
  }

  function dateDestinationRows(task) {
    const destinations = [
      { date: M.TODAY, label: '오늘' },
      { date: M.addDays(M.TODAY, 1), label: '내일' },
      { date: M.addDays(M.TODAY, 7), label: '일주일 뒤' },
      { date: null, label: '날짜 미정' }
    ];
    return destinations.map(destination => {
      const current = (task.date || null) === destination.date;
      return '<button class="move-destination" type="button" data-action="move-date-target" data-move-destination="date" data-date="' + escapeHtml(destination.date || '') + '" data-current="' + current + '" aria-current="' + current + '"><span>' + escapeHtml(destination.label) + '</span>' + (current ? '<span class="move-current">현재 위치</span>' : '') + '</button>';
    }).join('');
  }

  function renderMovePanelBody(target) {
    if (target.kind === 'flow') {
      const flow = flowById(target.id);
      if (!flow) return '';
      return '<div class="move-target-summary"><strong>' + escapeHtml(flowDisplayTitle(flow)) + '</strong><span>' + escapeHtml(folderTitle(flow.folderId)) + '</span></div><p class="move-note">Flow를 옮기면 Item도 새 폴더를 상속합니다. 원본 일정과 개인 실행 날짜는 유지됩니다.</p><section class="move-section" aria-labelledby="move-folder-heading"><h3 id="move-folder-heading">폴더</h3><div class="move-destination-list">' + folderDestinationRows(flow.folderId) + '</div></section>';
    }
    const task = taskById(target.id);
    if (!task) return '';
    const orderIds = reorderPeerIds(task.id, target.context);
    const orderIndex = orderIds.indexOf(task.id);
    const folderSection = task.flowId === null
      ? '<section class="move-section" aria-labelledby="move-folder-heading"><h3 id="move-folder-heading">폴더</h3><div class="move-destination-list">' + folderDestinationRows(task.folderId) + '</div></section>'
      : '<section class="move-section"><h3>폴더</h3><p class="move-note">Flow Item의 폴더는 부모 Flow <strong>' + escapeHtml(flowDisplayTitle(flowById(task.flowId))) + '</strong>를 따릅니다.</p></section>';
    const orderSection = orderIds.length > 1
      ? '<section class="move-section" aria-labelledby="move-order-heading"><h3 id="move-order-heading">이 목록의 순서</h3><div class="move-order-grid"><button class="button" type="button" data-action="move-top" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(target.context) + '"' + (orderIndex <= 0 ? ' disabled' : '') + '>맨 위</button><button class="button" type="button" data-action="move-up" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(target.context) + '"' + (orderIndex <= 0 ? ' disabled' : '') + '>위로</button><button class="button" type="button" data-action="move-down" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(target.context) + '"' + (orderIndex < 0 || orderIndex === orderIds.length - 1 ? ' disabled' : '') + '>아래로</button><button class="button" type="button" data-action="move-bottom" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(target.context) + '"' + (orderIndex < 0 || orderIndex === orderIds.length - 1 ? ' disabled' : '') + '>맨 아래</button></div></section>'
      : '';
    return '<div class="move-target-summary"><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(dateLabel(task.date)) + ' · ' + escapeHtml(folderTitle(flowFolder(task))) + '</span></div><section class="move-section" aria-labelledby="move-date-heading"><h3 id="move-date-heading">실행 날짜</h3><div class="move-destination-list">' + dateDestinationRows(task) + '</div><form class="move-date-form" data-move-form="task-date"><label class="field"><span>다른 날짜</span><input name="date" type="date" value="' + escapeHtml(task.date || '') + '" required></label><button class="button" type="submit">날짜 적용</button></form></section>' + folderSection + orderSection;
  }

  function openMovePanel(kind, id, context, opener, focusPanel) {
    const entry = kind === 'flow' ? flowById(id) : taskById(id);
    if (!entry || (kind !== 'flow' && kind !== 'task')) return;
    if (elements.dialog.open) closeDialog();
    moveTarget = { kind, id, context: context || screen.view || (kind === 'flow' ? 'folder:unfiled' : 'today') };
    moveReturnFocus = {
      element: opener || null,
      kind,
      id,
      source: opener && opener.dataset.moveSource ? opener.dataset.moveSource : 'more'
    };
    elements.movePanelTitle.textContent = entry.title;
    elements.movePanelBody.innerHTML = renderMovePanelBody(moveTarget);
    elements.movePanel.hidden = false;
    setMovePanelStatus('이동할 위치를 선택해 주세요.', 'ready');
    syncMoveTriggerState();
    setSaveStatus('', 'ready');
    if (focusPanel) window.requestAnimationFrame(() => elements.movePanelClose.focus());
  }

  function openTaskMenu(id, context, opener, focusPanel) {
    openMovePanel('task', id, context, opener, focusPanel !== false);
  }

  function openFlowMenu(id, context, opener, focusPanel) {
    openMovePanel('flow', id, context, opener, focusPanel !== false);
  }

  function finishMoveTransition(changed) {
    if (changed) {
      closeMovePanel({ restoreFocus: true, announce: false });
      return true;
    }
    const failed = elements.saveStatus.dataset.mode === 'error';
    setMovePanelStatus(failed ? '저장하지 못했습니다. 이전 위치를 유지합니다.' : '이미 같은 위치입니다.', failed ? 'error' : 'neutral');
    return false;
  }

  function applyMoveDestination(control) {
    if (!moveTarget || !control) return false;
    const destination = control.dataset.moveDestination;
    if (destination === 'folder') {
      if (moveTarget.kind === 'task') {
        const task = taskById(moveTarget.id);
        if (!task || task.flowId !== null) {
          setMovePanelStatus('Flow Item의 폴더는 부모 Flow와 함께 이동합니다.', 'neutral');
          setSaveStatus('이곳으로는 옮길 수 없어요.', 'noop');
          return false;
        }
      }
      const folderId = control.dataset.folderId || null;
      const changed = transition({ type: 'move-folder', kind: moveTarget.kind, id: moveTarget.id, folderId });
      return finishMoveTransition(changed);
    }
    if (destination === 'date') {
      if (moveTarget.kind !== 'task') {
        setMovePanelStatus('Flow는 폴더로만 이동할 수 있습니다.', 'neutral');
        setSaveStatus('이곳으로는 옮길 수 없어요.', 'noop');
        return false;
      }
      const changed = transition({ type: 'schedule', id: moveTarget.id, date: control.dataset.date || null });
      return finishMoveTransition(changed);
    }
    setMovePanelStatus('이동할 수 없는 대상입니다.', 'error');
    setSaveStatus('이곳으로는 옮길 수 없어요.', 'noop');
    return false;
  }

  function occurrenceFromControl(control) {
    if (!control) return null;
    const flow = flowById(control.dataset.flowId);
    if (!flow) return null;
    const projection = M.resultProjection(state(), flow.id, resultProjectionOptions());
    if (!projection) return null;
    const item = projection.items.find(entry => entry.occurrenceId === control.dataset.occurrenceId
      && entry.sourceItemRef === control.dataset.sourceItemRef
      && entry.originalDate === control.dataset.originalDate);
    return item ? { flow, item } : null;
  }

  function openOccurrenceDateDialog(control) {
    const selected = occurrenceFromControl(control);
    if (!selected) {
      setSaveStatus('회차를 확인할 수 없어 변경하지 않았어요.', 'error');
      showToast('회차 정보가 달라 저장하지 않았어요.', false, null, 'error');
      return;
    }
    const item = selected.item;
    openDialog('이 회차 날짜 이동', '<form class="dialog-form" data-dialog-form="occurrence-date"><div class="occurrence-dialog-summary"><strong>' + escapeHtml(item.title + ' · ' + item.occurrenceIndex + '회차') + '</strong><span>원 발생일 ' + escapeHtml(item.originalDate) + ' · 원본 Item은 바뀌지 않습니다.</span></div><label class="field"><span>실행 날짜</span><input name="date" type="date" value="' + escapeHtml(item.executionDate || '') + '" autofocus></label><p class="editor-guidance">날짜를 비우면 이 회차만 날짜 미정으로 이동합니다.</p><div class="dialog-actions"><button class="button" type="button" data-action="close-dialog">취소</button><button class="button primary" type="submit">이 회차 이동</button></div></form>', form => {
      const data = new FormData(form);
      const changed = transition({
        type: 'move-occurrence-date',
        sourceItemRef: item.sourceItemRef,
        occurrenceId: item.occurrenceId,
        originalDate: item.originalDate,
        date: data.get('date') || null
      });
      if (changed) closeDialog();
    });
  }

  function openQuickDialog(defaultFolderId, defaultDate) {
    openDialog('빠른 할 일 만들기', '<form class="dialog-form" data-dialog-form="quick"><label class="field"><span>할 일 이름</span><input name="title" autocomplete="off" required maxlength="120" autofocus></label><label class="field"><span>날짜</span><input name="date" type="date" value="' + escapeHtml(defaultDate || '') + '"></label><label class="field"><span>폴더</span><select name="folderId">' + folderOptions(defaultFolderId || null, true) + '</select></label><div class="dialog-actions"><button class="button" type="button" data-action="close-dialog">취소</button><button class="button primary" type="submit">만들기</button></div></form>', form => {
      const data = new FormData(form);
      const changed = transition({ type: 'add-quick', title: data.get('title'), date: data.get('date') || null, folderId: data.get('folderId') || null });
      if (changed) closeDialog();
    });
  }

  function openFolderDialog() {
    openDialog('폴더 만들기', '<form class="dialog-form" data-dialog-form="folder"><label class="field"><span>폴더 이름</span><input name="title" autocomplete="off" required maxlength="50" autofocus></label><label class="field"><span>상위 폴더 · 최대 2단계</span><select name="parentId">' + folderOptions(null, false) + '</select></label><div class="dialog-actions"><button class="button" type="button" data-action="close-dialog">취소</button><button class="button primary" type="submit">만들기</button></div></form>', form => {
      const data = new FormData(form);
      const changed = transition({ type: 'add-folder', title: data.get('title'), parentId: data.get('parentId') || null });
      if (changed) closeDialog();
    });
  }

  function openGuide() {
    openDialog('사용 안내', '<ol class="guide-list"><li><strong>새 Flow</strong>에서 원문을 쓰고 결과를 확인한 뒤 개인공간에 저장합니다.</li><li>기간 목록의 Item 제목을 누르면 같은 상세 화면에서 메모, 날짜, 완료 상태를 확인할 수 있습니다.</li><li>이동 손잡이, 더보기 메뉴, 키보드로 날짜·폴더·순서를 바꿀 수 있습니다.</li><li>Flow Item 수정은 Plan에 모았다가 전체 저장하고, 빠른 할 일 수정은 바로 저장합니다.</li><li>저장된 내용은 새로고침 뒤에도 이어집니다.</li></ol><details class="test-tools"><summary>테스트 도구</summary><label class="test-toggle"><input id="force-write-error" type="checkbox"' + (forceWriteError ? ' checked' : '') + '> 다음 저장을 실패로 확인</label><button class="button danger" type="button" data-action="reset-poc">연습 데이터 초기화</button></details><div class="dialog-actions"><button class="button primary" type="button" data-action="close-dialog">확인</button></div>');
  }

  function retryAuthoringCommit() {
    const control = document.querySelector('[data-action="commit-authoring"]');
    if (control) control.click();
  }

  function reorderPeerIds(id, context) {
    const ids = M.viewTaskIds(state(), context);
    const source = taskById(id);
    if (context !== 'month' || !source || !source.date) return ids;
    return ids.filter(candidateId => (taskById(candidateId) || {}).date === source.date);
  }

  function commitPeerOrder(context, peerIds, reorderedPeers) {
    const peerSet = new Set(peerIds);
    let nextPeerIndex = 0;
    const reordered = M.viewTaskIds(state(), context).map(id => peerSet.has(id) ? reorderedPeers[nextPeerIndex++] : id);
    return transition({ type: 'reorder', context, ids: reordered });
  }

  function moveOrder(id, context, direction) {
    const ids = reorderPeerIds(id, context);
    const index = ids.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ids.length) {
      setSaveStatus('이미 같은 순서예요.', 'noop');
      showToast('더 옮길 수 없는 위치예요.', false);
      return false;
    }
    const reordered = ids.slice();
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    return commitPeerOrder(context, ids, reordered);
  }

  function moveOrderToEdge(id, context, edge) {
    const ids = reorderPeerIds(id, context);
    const index = ids.indexOf(id);
    const target = edge === 'top' ? 0 : ids.length - 1;
    if (index < 0 || index === target) {
      setSaveStatus('이미 같은 순서예요.', 'noop');
      showToast('이미 같은 위치예요.', false);
      return false;
    }
    const reordered = ids.slice();
    reordered.splice(index, 1);
    reordered.splice(target, 0, id);
    return commitPeerOrder(context, ids, reordered);
  }

  function reorderAtPosition(sourceId, targetId, context, position) {
    if (sourceId === targetId) {
      setSaveStatus('이미 같은 순서예요.', 'noop');
      showToast('이미 같은 위치예요.', false);
      return false;
    }
    const ids = reorderPeerIds(sourceId, context);
    if (!ids.includes(sourceId) || !ids.includes(targetId)) {
      setSaveStatus('이동을 취소했어요.', 'noop');
      showToast(context === 'month' ? '같은 날짜 안에서만 순서를 바꿀 수 있어요.' : '다른 목록으로 끌기는 취소했어요.', false);
      return false;
    }
    const reordered = ids.filter(id => id !== sourceId);
    const targetIndex = reordered.indexOf(targetId);
    reordered.splice(position === 'after' ? targetIndex + 1 : targetIndex, 0, sourceId);
    return commitPeerOrder(context, ids, reordered);
  }

  function reorderBefore(sourceId, targetId, context) {
    return reorderAtPosition(sourceId, targetId, context, 'before');
  }

  function clearMoveDestinationHighlights() {
    document.querySelectorAll('.move-destination[data-drag-state]').forEach(target => {
      target.removeAttribute('data-drag-state');
    });
  }

  function moveDestinationState(control, source) {
    if (!control || !source) return 'invalid';
    const destination = control.dataset.moveDestination;
    if (destination === 'folder') {
      const folderId = control.dataset.folderId || null;
      if (source.kind === 'flow') {
        const flow = flowById(source.id);
        if (!flow) return 'invalid';
        return flow.folderId === folderId ? 'current' : 'valid';
      }
      const task = taskById(source.id);
      if (!task || task.flowId !== null) return 'invalid';
      return task.folderId === folderId ? 'current' : 'valid';
    }
    if (destination === 'date') {
      if (source.kind !== 'task') return 'invalid';
      const task = taskById(source.id);
      if (!task) return 'invalid';
      return (task.date || null) === (control.dataset.date || null) ? 'current' : 'valid';
    }
    return 'invalid';
  }

  function showMoveDestination(control, source) {
    clearMoveDestinationHighlights();
    clearDropHighlights();
    const result = moveDestinationState(control, source);
    control.dataset.dragState = result;
    if (result === 'valid') setMovePanelStatus('여기에 놓으면 이동합니다. 아직 저장하지 않았습니다.', 'ready');
    else if (result === 'current') setMovePanelStatus('이미 같은 위치입니다. 놓아도 저장하지 않습니다.', 'neutral');
    else setMovePanelStatus(source.kind === 'flow' ? 'Flow는 폴더로만 이동할 수 있습니다.' : '이 항목에는 사용할 수 없는 대상입니다.', 'error');
    return result;
  }

  function clearDropHighlights() {
    document.querySelectorAll('.drop-target,.drop-before,.drop-after').forEach(target => {
      target.classList.remove('drop-target', 'drop-before', 'drop-after');
      target.removeAttribute('data-drop-position');
    });
  }

  function stopDragAutoScroll() {
    dragAutoScrollSpeed = 0;
    if (dragAutoScrollFrame !== null) window.cancelAnimationFrame(dragAutoScrollFrame);
    dragAutoScrollFrame = null;
  }

  function runDragAutoScroll() {
    if (!dragged || dragAutoScrollSpeed === 0) {
      dragAutoScrollFrame = null;
      return;
    }
    window.scrollBy(0, dragAutoScrollSpeed);
    dragAutoScrollFrame = window.requestAnimationFrame(runDragAutoScroll);
  }

  function updateDragAutoScroll(clientY) {
    const edge = Math.min(72, Math.max(36, window.innerHeight / 5));
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const maxSpeed = reducedMotion ? 8 : 18;
    if (clientY < edge) dragAutoScrollSpeed = -Math.max(4, Math.round((edge - clientY) / edge * maxSpeed));
    else if (clientY > window.innerHeight - edge) dragAutoScrollSpeed = Math.max(4, Math.round((clientY - (window.innerHeight - edge)) / edge * maxSpeed));
    else dragAutoScrollSpeed = 0;
    if (dragAutoScrollSpeed === 0) stopDragAutoScroll();
    else if (dragAutoScrollFrame === null) dragAutoScrollFrame = window.requestAnimationFrame(runDragAutoScroll);
  }

  function finishDrag() {
    stopDragAutoScroll();
    document.querySelectorAll('.dragging,.drop-target,.drop-before,.drop-after,.reorder-corridor').forEach(target => target.classList.remove('dragging', 'drop-target', 'drop-before', 'drop-after', 'reorder-corridor'));
    document.querySelectorAll('[data-drop-position]').forEach(target => target.removeAttribute('data-drop-position'));
    clearMoveDestinationHighlights();
    dragged = null;
  }

  function dropPosition(row, clientY) {
    const bounds = row.getBoundingClientRect();
    return clientY >= bounds.top + bounds.height / 2 ? 'after' : 'before';
  }

  function showDropPosition(row, position) {
    clearDropHighlights();
    row.classList.add('drop-target', position === 'after' ? 'drop-after' : 'drop-before');
    row.dataset.dropPosition = position;
    const task = taskById(row.dataset.taskId);
    setSaveStatus((task ? task.title : '대상 항목') + (position === 'after' ? ' 뒤' : ' 앞') + '에 놓기 · 아직 저장 안 됨', 'noop');
  }

  function clearLongPressTimer() {
    window.clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  function suppressNextHandleClick(handle) {
    suppressedHandleClick = {
      handle,
      expiresAt: Date.now() + SYNTHETIC_CLICK_SUPPRESSION_MS
    };
  }

  function consumeSuppressedHandleClick(handle) {
    if (!suppressedHandleClick) return false;
    if (Date.now() > suppressedHandleClick.expiresAt) {
      suppressedHandleClick = null;
      return false;
    }
    if (suppressedHandleClick.handle !== handle) return false;
    suppressedHandleClick = null;
    return true;
  }

  function cancelHandlePress(message, suppressClick) {
    if (!pointerOrigin && !longPressTimer) return;
    const gesture = pointerOrigin;
    const handle = gesture ? gesture.handle : null;
    clearLongPressTimer();
    pointerOrigin = null;
    if (gesture) {
      try { gesture.handle.releasePointerCapture(gesture.pointerId); } catch (error) { /* Capture may not exist. */ }
    }
    if (suppressClick && handle) suppressNextHandleClick(handle);
    if (message) setSaveStatus(message, 'noop');
  }

  document.addEventListener('click', event => {
    const handle = event.target.closest('.drag-handle');
    if (handle) {
      if (consumeSuppressedHandleClick(handle)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      openMovePanel(handle.dataset.moveKind, handle.dataset.id, handle.dataset.context, handle, true);
      return;
    }
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    if (action === 'go-workspace') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); planDraft = null; screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: null }; render(); }
    else if (action === 'go-authoring') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); authoringStep = 'input'; authoringResultView = 'txt'; authoringOccurrencePage = 1; authoringReviewOpen = false; authoringReceipt = null; screen = { type: 'authoring' }; render(); }
    else if (action === 'set-view') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); if (control.dataset.view !== 'month') showEmptyMonthDates = false; screen = { type: 'workspace', view: control.dataset.view, selectedFlowId: null }; render(); }
    else if (action === 'open-flow') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); planDraft = null; resultView = 'txt'; resultOccurrencePage = 1; resultCalendarBaseDate = M.TODAY; resultCalendarSelectedDate = M.TODAY; screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: control.dataset.id }; render(); }
    else if (action === 'close-flow') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); planDraft = null; screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: null }; render(); }
    else if (action === 'open-receipt-flow') { resultView = 'txt'; resultOccurrencePage = 1; resultCalendarBaseDate = M.TODAY; resultCalendarSelectedDate = M.TODAY; screen = { type: 'workspace', view: 'folder:' + ((flowById(control.dataset.id) || {}).folderId || 'unfiled'), selectedFlowId: control.dataset.id }; render(); }
    else if (action === 'open-item-detail') openItemDetail(control.dataset.id, control);
    else if (action === 'close-item-detail') closeItemDetail();
    else if (action === 'edit-item' || action === 'open-plan-item-editor') openItemEditor(taskById(control.dataset.id), control);
    else if (action === 'close-item-editor') closeItemEditor();
    else if (action === 'save-item-editor') {
      if (!itemDraft) return;
      if (!itemDraft.title.trim()) {
        setSaveStatus('Item 제목을 입력해 주세요.', 'error');
        showToast('Item 제목을 입력해 주세요.', false, null, 'error');
        focusAfterRender('[data-item-field="title"]');
        return;
      }
      if (itemDraft.mode === 'plan') {
        const staged = planDraft && planDraft.items.find(entry => entry.id === itemDraft.id);
        if (!staged) return;
        staged.title = itemDraft.title.trim();
        staged.memo = itemDraft.memo;
        staged.planDate = itemDraft.planDate;
        const stagedId = itemDraft.id;
        const flowId = itemDraft.flowId;
        itemDraft = null;
        itemEditorReturn = null;
        screen = { type: 'plan-editor', view: screen.view || 'today', selectedFlowId: flowId };
        setSaveStatus('Item을 Plan에 반영했어요. Plan 전체 저장 전입니다.', 'pending');
        render();
        focusAfterRender('[data-item-id="' + stagedId + '"] [data-action="open-plan-item-editor"]', '[data-action="commit-plan-editor"]');
      } else {
        const quickDraft = Object.assign({}, itemDraft);
        const result = M.transitionEnvelope(envelope, { type: 'update-quick', id: quickDraft.id, title: quickDraft.title, memo: quickDraft.memo, date: quickDraft.date, folderId: quickDraft.folderId });
        if (!result.changed) {
          setSaveStatus(result.error ? '빠른 할 일을 저장하지 못했어요.' : '이미 같은 내용이에요.', result.error ? 'error' : 'noop');
          showToast(result.message, false, null, result.error ? 'error' : 'status');
          return;
        }
        writeCandidate(result.envelope, result.message, () => {
          itemDraft = null;
          itemEditorReturn = null;
          screen = { type: 'item-detail', view: screen.view || 'today', selectedFlowId: null, selectedItemId: quickDraft.id, itemContext: screen.itemContext || screen.view || 'today' };
        });
        focusAfterRender('[data-item-detail-heading]', '[data-action="close-item-detail"]');
      }
    }
    else if (action === 'add-quick') openQuickDialog(control.dataset.folderId || null, control.dataset.date || null);
    else if (action === 'add-folder') openFolderDialog();
    else if (action === 'task-menu') openTaskMenu(control.dataset.id, control.dataset.context, control, true);
    else if (action === 'flow-menu') openFlowMenu(control.dataset.id, control.dataset.context || screen.view, control, true);
    else if (action === 'open-plan-editor') { const flow = flowById(control.dataset.id); if (flow) { planDraft = newPlanDraft(flow); screen = { type: 'plan-editor', view: screen.view || 'today', selectedFlowId: flow.id }; setSaveStatus('', 'ready'); render(); focusAfterRender('[data-plan-field="flow-title"]', '[data-action="close-plan-editor"]'); } }
    else if (action === 'close-plan-editor') { planDraft = null; screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: screen.selectedFlowId }; setSaveStatus('수정을 취소했어요.', 'noop'); render(); focusAfterRender('[data-action="open-plan-editor"]', '[data-action="close-flow"]'); }
    else if (action === 'commit-plan-editor') {
      if (!planDraft) return;
      const changed = transition({ type: 'commit-personal-plan', flowId: planDraft.flowId, title: planDraft.title, items: planDraft.items });
      if (changed) { const flowId = planDraft.flowId; planDraft = null; resultView = 'txt'; screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: flowId }; render(); focusAfterRender('[data-action="open-plan-editor"]', '[data-action="close-flow"]'); }
    }
    else if (action === 'result-tab') { resultView = control.dataset.view; render(); focusAfterRender('#standalone-result-tab-' + resultView); }
    else if (action === 'authoring-result-tab') { authoringResultView = control.dataset.view; renderAuthoringPreview(); focusAfterRender('#authoring-result-tab-' + authoringResultView); }
    else if (action === 'result-more-occurrences') { if (resultOccurrencePage < 130) { resultOccurrencePage += 1; render(); setSaveStatus('네 결과의 회차 범위를 함께 늘렸어요.', 'noop'); } }
    else if (action === 'authoring-more-occurrences') { if (authoringOccurrencePage < 130) { authoringOccurrencePage += 1; renderAuthoringPreview(); setSaveStatus('네 결과의 회차 범위를 함께 늘렸어요.', 'noop'); } }
    else if (action === 'copy-result-txt') { const projection = M.resultProjection(state(), control.dataset.flowId, resultProjectionOptions()); if (projection) copyTextResult(projection.txt); }
    else if (action === 'copy-authoring-txt') copyTextResult(M.authoringResultProjection(authoring.rawText, authoringProjectionOptions()).txt);
    else if (action === 'copy-lossless-raw') copyTextResult(M.analyzeLosslessAuthoring(authoring.rawText).rawText);
    else if (action === 'download-result-txt' || action === 'download-result-csv') {
      const projection = M.resultProjection(state(), control.dataset.flowId, resultProjectionOptions());
      if (projection) downloadLocalResult(action === 'download-result-txt' ? projection.downloads.txt : projection.downloads.csv);
    }
    else if (action === 'download-authoring-txt' || action === 'download-authoring-csv') {
      const projection = M.authoringResultProjection(authoring.rawText, authoringProjectionOptions());
      downloadLocalResult(action === 'download-authoring-txt' ? projection.downloads.txt : projection.downloads.csv);
    }
    else if (action === 'result-calendar-shift') {
      const next = shiftResultMonth(resultCalendarBaseDate, Number(control.dataset.delta));
      if (next) { resultCalendarBaseDate = next; resultCalendarSelectedDate = next; render(); }
    }
    else if (action === 'result-calendar-select') {
      if (control.dataset.date !== resultCalendarSelectedDate) { resultCalendarSelectedDate = control.dataset.date; render(); }
    }
    else if (action === 'authoring-calendar-shift') {
      const next = shiftResultMonth(authoringCalendarBaseDate, Number(control.dataset.delta));
      if (next) { authoringCalendarBaseDate = next; authoringCalendarSelectedDate = next; renderAuthoringPreview(); }
    }
    else if (action === 'authoring-calendar-select') {
      if (control.dataset.date !== authoringCalendarSelectedDate) { authoringCalendarSelectedDate = control.dataset.date; renderAuthoringPreview(); }
    }
    else if (action === 'open-authoring-properties') openAuthoringProperties(Number(control.dataset.line));
    else if (action === 'close-authoring-properties') closeAuthoringProperties(Number(control.dataset.line));
    else if (action === 'choose-authoring-property-group') chooseAuthoringPropertyGroup(Number(control.dataset.line), control.dataset.group);
    else if (action === 'edit-authoring-property') editAuthoringProperty(Number(control.dataset.line), control.dataset.key);
    else if (action === 'cancel-authoring-property') {
      const line = Number(control.dataset.line);
      if (authoringPropertyTarget && authoringPropertyTarget.line === line) authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { editorKey: null });
      renderAuthoringPreview();
      focusAfterRender('[data-action="edit-authoring-property"][data-line="' + line + '"]', '#authoring-property-tray-heading-' + line);
      setSaveStatus('취소했어요. 원문은 바뀌지 않았습니다.', 'noop');
    }
    else if (action === 'locate-authoring-property') locateAuthoringProperty(control.dataset.key, control.dataset.propertySourceLine ? Number(control.dataset.propertySourceLine) : undefined);
    else if (action === 'repair-near-miss') {
      const targetId = control.dataset.targetId;
      const result = M.planAuthoringNearMissRepair({ intent: 'apply', rawText: authoring.rawText, expectedSourceFingerprint: M.fingerprint(authoring.rawText), targetId });
      if (result.status === 'repaired') applyAuthoringSourcePlan(result, '선택한 줄만 할 일로 고쳤어요.');
      else { setSaveStatus('고칠 줄을 다시 확인해 주세요.', 'error'); showToast('원문이 달라 변경하지 않았어요.', false, null, 'error'); }
    }
    else if (action === 'dismiss-near-miss') {
      const before = authoring.rawText;
      M.planAuthoringNearMissRepair({ intent: 'cancel', rawText: before, expectedSourceFingerprint: M.fingerprint(before), targetId: control.dataset.targetId });
      dismissedNearMisses.add(control.dataset.targetId);
      renderAuthoringPreview();
      setSaveStatus('그대로 두었어요 · 원문은 그대로예요', 'noop');
    }
    else if (action === 'move-result-occurrence-date') openOccurrenceDateDialog(control);
    else if (action === 'toggle-result-occurrence-complete') {
      const selected = occurrenceFromControl(control);
      if (!selected) {
        setSaveStatus('회차를 확인할 수 없어 변경하지 않았어요.', 'error');
        showToast('회차 정보가 달라 저장하지 않았어요.', false, null, 'error');
      } else transition({ type: 'complete-occurrence', sourceItemRef: selected.item.sourceItemRef, occurrenceId: selected.item.occurrenceId, originalDate: selected.item.originalDate, done: !selected.item.completed });
    }
    else if (action === 'result-open-item') openItemDetail(control.dataset.id, control);
    else if (action === 'toggle-complete') { const task = taskById(control.dataset.id); if (task) transition({ type: 'complete', id: task.id, done: !task.done }); }
    else if (action === 'move-to-trash') {
      const kind = control.dataset.kind;
      const id = control.dataset.id;
      if (transition({ type: 'move-to-trash', kind, id })) {
        itemReturn = null; itemDraft = null; planDraft = null;
        screen = { type: 'workspace', view: 'trash', selectedFlowId: null };
        render();
      }
    }
    else if (action === 'restore-trash') {
      if (transition({ type: 'restore-from-trash', kind: control.dataset.kind, id: control.dataset.id })) {
        screen = { type: 'workspace', view: 'trash', selectedFlowId: null };
        render();
      }
    }
    else if (action === 'permanent-delete') {
      const manifest = M.trashManifest(state()).find(entry => entry.kind === control.dataset.kind && entry.id === control.dataset.id);
      if (!manifest || !window.confirm('“' + manifest.title + '”을 영구 삭제할까요? 삭제 뒤에는 Undo하거나 복구할 수 없습니다.')) {
        setSaveStatus('영구 삭제를 취소했어요 · 삭제하지 않았어요', 'noop');
        return;
      }
      if (transition({ type: 'permanently-delete-from-trash', kind: manifest.kind, id: manifest.id, confirmed: true })) {
        screen = { type: 'workspace', view: 'trash', selectedFlowId: null };
        render();
      }
    }
    else if (action === 'move-top') { const changed = moveOrderToEdge(control.dataset.id, control.dataset.context, 'top'); if (moveTarget && moveTarget.id === control.dataset.id) finishMoveTransition(changed); else if (changed && elements.dialog.open) closeDialog(); }
    else if (action === 'move-up') { const changed = moveOrder(control.dataset.id, control.dataset.context, -1); if (moveTarget && moveTarget.id === control.dataset.id) finishMoveTransition(changed); else if (changed && elements.dialog.open) closeDialog(); }
    else if (action === 'move-down') { const changed = moveOrder(control.dataset.id, control.dataset.context, 1); if (moveTarget && moveTarget.id === control.dataset.id) finishMoveTransition(changed); else if (changed && elements.dialog.open) closeDialog(); }
    else if (action === 'move-bottom') { const changed = moveOrderToEdge(control.dataset.id, control.dataset.context, 'bottom'); if (moveTarget && moveTarget.id === control.dataset.id) finishMoveTransition(changed); else if (changed && elements.dialog.open) closeDialog(); }
    else if (action === 'move-folder-target' || action === 'move-date-target') applyMoveDestination(control);
    else if (action === 'schedule-task') { const changed = transition({ type: 'schedule', id: control.dataset.id, date: control.dataset.date || null }); if (changed) closeDialog(); }
    else if (action === 'undo') undo();
    else if (action === 'toggle-empty-month') { showEmptyMonthDates = !showEmptyMonthDates; render(); setSaveStatus(showEmptyMonthDates ? '빈 날짜를 펼쳤어요.' : '빈 날짜를 접었어요.', 'noop'); }
    else if (action === 'dismiss-toast') { elements.toast.hidden = true; pendingRetry = null; }
    else if (action === 'retry') { const retry = pendingRetry; pendingRetry = null; if (retry) retry(); }
    else if (action === 'open-guide') openGuide();
    else if (action === 'close-dialog') {
      const authoringPropertyCanceled = Boolean(elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]'));
      closeDialog();
      if (authoringPropertyCanceled) setSaveStatus('취소했어요. 원문은 바뀌지 않았습니다.', 'noop');
    }
    else if (action === 'close-move-panel') closeMovePanel({ restoreFocus: true, announce: true, message: '이동을 취소했어요.' });
    else if (action === 'authoring-step') {
      if (control.dataset.step !== 'input' && control.dataset.step !== 'result') return;
      authoringStep = control.dataset.step;
      if (authoringStep === 'input') authoringReviewOpen = false;
      renderAuthoring();
      const destination = document.querySelector('[data-authoring-pane="' + authoringStep + '"]');
      if (destination) destination.scrollIntoView({ block: 'start' });
      setSaveStatus('', 'ready');
    }
    else if (action === 'toggle-authoring-review') {
      setAuthoringReviewOpen(!authoringReviewOpen, false);
      setSaveStatus('', 'ready');
    }
    else if (action === 'close-authoring-review') {
      setAuthoringReviewOpen(false, true);
      setSaveStatus('', 'ready');
    }
    else if (action === 'toggle-authoring-ghost') {
      authoringGhostVisible = !authoringGhostVisible;
      renderAuthoringGhosts();
      setSaveStatus(authoringGhostVisible ? '입력 예시를 표시했어요.' : '입력 예시를 숨겼어요.', 'noop');
    }
    else if (action === 'toggle-template-picker') {
      if (!authoring.templatePickerOpen && authoring.rawText.length > 0) {
        setSaveStatus('원문 있음 · 틀 삽입 0건', 'noop');
        showToast('작성 틀은 빈 원문에서만 열 수 있어요. 현재 내용은 그대로 두었어요.', false);
        return;
      }
      setTemplatePickerOpen(!authoring.templatePickerOpen, false);
      setSaveStatus('', 'ready');
    }
    else if (action === 'cancel-template-picker') {
      setTemplatePickerOpen(false, true);
      setSaveStatus('작성 틀을 닫았어요.', 'noop');
    }
    else if (action === 'select-template') {
      const template = M.templateById(control.dataset.templateId);
      if (!template) return;
      const editor = document.getElementById('flow-editor');
      if (!editor || editor.value !== authoring.rawText || authoring.rawText.length > 0) {
        setSaveStatus('원문 있음 · 틀 삽입 0건', 'noop');
        showToast('작성 틀은 빈 원문에만 넣을 수 있어요. 현재 내용은 그대로 두었습니다.', false);
        return;
      }
      if (applyNativeTemplateScaffold(editor, template)) {
        showToast('골격만 넣고 작성 초안을 저장했습니다. 이름·설명·예시는 원문에 들어가지 않았어요.', false);
      } else if (editor.value === authoring.rawText && editor.value.length === 0) {
        setSaveStatus('작성 틀을 넣지 못했어요.', 'error');
        showToast('이 브라우저에서는 작성 틀을 안전하게 넣지 못했어요. 원문은 바뀌지 않았습니다.', false);
      }
    }
    else if (action === 'cancel-authoring') {
      if (!authoring.rawText.trim() || window.confirm('작성 중인 원문을 닫고 자동 저장된 작성 초안도 지울까요?')) {
        const hadStoredDraft = authoringDraftStored;
        if (!discardAuthoringDraft()) return;
        authoring = freshAuthoring();
        authoringStep = 'input';
        authoringReviewOpen = false;
        authoringReceipt = null;
        screen = { type: 'workspace', view: 'today', selectedFlowId: null };
        setSaveStatus(hadStoredDraft ? '작성 초안을 정리했어요.' : '작성을 취소했어요.', 'noop');
        render();
      }
    }
    else if (action === 'commit-authoring') {
      const parsed = M.parseSource(authoring.rawText);
      const handoff = M.makeHandoff(authoring.rawText, Object.assign({}, authoring, { sourceConfirmed: parsed.issues.length === 0 && parsed.itemCount > 0 }));
      const result = M.transitionEnvelope(envelope, { type: 'commit-authoring', handoff });
      if (!result.changed) {
        if (result.error) {
          setSaveStatus('저장하지 못했어요.', 'error');
          showToast(result.message, false);
          return;
        }
        const existing = state().flows.find(flow => flow.handoffId === handoff.handoffId);
        if (existing) {
          setSaveStatus('기존 Flow 확인 중…', 'saving');
          try {
            if (forceWriteError) throw new Error('simulated-write-error');
            M.writeAuthoringCommit(storage, envelope);
          } catch (error) {
            setSaveStatus('저장 실패 · 변경 없음', 'error');
            showToast('작성 초안을 정리하지 못했어요. Flow 상태와 초안은 이전 그대로예요.', false, retryAuthoringCommit, 'error');
            return;
          }
          authoringDraftStored = false;
          authoringReceipt = { flowId: existing.id, title: existing.title, itemCount: existing.steps.reduce((sum, step) => sum + step.itemIds.length, 0) };
          authoring = freshAuthoring();
          authoringStep = 'input';
          authoringReviewOpen = false;
          screen = { type: 'receipt' };
          setSaveStatus('이미 같은 Flow가 있어요.', 'noop');
          render();
        } else {
          setSaveStatus('이미 같은 상태예요.', 'noop');
          showToast(result.message, false);
        }
        return;
      }
      setSaveStatus('저장 중…', 'saving');
      try {
        if (forceWriteError) throw new Error('simulated-write-error');
        M.writeAuthoringCommit(storage, result.envelope);
      } catch (error) {
        setSaveStatus('저장 실패 · 변경 없음', 'error');
        showToast('저장하지 못했어요. Flow 상태와 작성 초안은 이전 그대로예요.', false, retryAuthoringCommit, 'error');
        return;
      }
      envelope = result.envelope;
      authoringDraftStored = false;
      authoringReceipt = state().lastReceipt;
      successfulMutations += 1;
      authoring = freshAuthoring();
      authoringStep = 'input';
      authoringReviewOpen = false;
      screen = { type: 'receipt' };
      setSaveStatus(successfulStorageStatus(), 'saved');
      showToast(result.message, true);
      render();
    }
    else if (action === 'delete-folder') {
      const folder = folderById(control.dataset.id);
      if (folder && window.confirm('“' + folder.title + '” 폴더만 삭제할까요? 안의 내용은 미분류로 옮깁니다.')) {
        if (transition({ type: 'delete-folder', id: folder.id })) { screen = { type: 'workspace', view: 'folder:unfiled', selectedFlowId: null }; render(); }
      }
    }
    else if (action === 'reset-poc') {
      if (window.confirm('이 연습 화면에서 바꾼 내용과 작성 초안만 초기화할까요?')) {
        try {
          M.resetPoc(storage);
          envelope = M.initialEnvelope(); successfulMutations += 1; authoring = freshAuthoring(); authoringDraftStored = false; authoringStep = 'input'; authoringResultView = 'txt'; resultOccurrencePage = 1; authoringOccurrencePage = 1; authoringReviewOpen = false; authoringReceipt = null; authoringSourceMutationCount = 0; dismissedNearMisses = new Set(); screen = { type: 'workspace', view: 'today', selectedFlowId: null };
          closeDialog();
          setSaveStatus('연습 데이터와 작성 초안을 초기화했어요.', 'saved'); showToast('이 화면에서 바꾼 내용만 초기화했어요.', false); render();
        } catch (error) { setSaveStatus('초기화 실패 · 변경 없음', 'error'); showToast('초기화하지 못했어요.', false); }
      }
    }
  });

  document.addEventListener('submit', event => {
    if (event.target.matches('[data-authoring-inline-form]')) {
      event.preventDefault();
      const form = event.target;
      const line = Number(form.dataset.line);
      const key = form.dataset.key;
      if (!authoringPropertyTarget || authoringPropertyTarget.line !== line || authoringPropertyTarget.sourceFingerprint !== M.fingerprint(authoring.rawText)) {
        setSaveStatus('원문이 달라 변경하지 않았어요.', 'error');
        showToast('편집을 시작한 뒤 원문이 달라졌어요.', false, null, 'error');
        return;
      }
      const data = new FormData(form);
      const result = M.planAuthoringPropertyEdit({ intent: 'apply', rawText: authoring.rawText, expectedSourceFingerprint: authoringPropertyTarget.sourceFingerprint, itemSourceLine: line, key, value: String(data.get('value') || '') });
      const entry = M.authoringPropertyByKey(key);
      applyAuthoringPropertyResult(result, (entry ? entry.label : '속성') + (key === 'subcheck' || key === 'guide' || key === 'caution' ? '을 원문에 추가했어요.' : ' 값을 원문에 반영했어요.'));
      return;
    }
    if (event.target.matches('[data-move-form="task-date"]')) {
      event.preventDefault();
      if (!moveTarget || moveTarget.kind !== 'task') return;
      const data = new FormData(event.target);
      const changed = transition({ type: 'schedule', id: moveTarget.id, date: data.get('date') || null });
      finishMoveTransition(changed);
      return;
    }
    if (!event.target.matches('[data-dialog-form]')) return;
    event.preventDefault();
    if (dialogSubmit) dialogSubmit(event.target);
  });

  document.addEventListener('pointermove', event => {
    const choice = event.target.closest('.template-choice[data-template-preview-id]');
    if (choice) setAuthoringTemplatePreview(choice.dataset.templatePreviewId);
  });

  document.addEventListener('focusin', event => {
    const choice = event.target.closest('.template-choice[data-template-preview-id]');
    if (choice) setAuthoringTemplatePreview(choice.dataset.templatePreviewId);
  });

  document.addEventListener('input', event => {
    if (event.target.id === 'flow-editor') {
      if (nativeTemplateInsertPending) nativeTemplateInputEventCount += 1;
      authoring.rawText = event.target.value;
      authoringOccurrencePage = 1;
      if (nativeSourcePlanPending) {
        nativeSourcePlanInputEventCount += 1;
      } else {
        if (!nativeTemplateInsertPending && authoring.templatePickerOpen) setTemplatePickerOpen(false, false);
        authoringReviewOpen = false;
        authoringPropertyTarget = null;
        renderAuthoringPreview();
        renderAuthoringGhosts();
        if (!nativeTemplateInsertPending) persistAuthoringDraft();
      }
    }
    if (event.target.id === 'force-write-error') forceWriteError = event.target.checked;
    if (itemDraft && event.target.dataset.itemField) {
      if (event.target.dataset.itemField === 'title') itemDraft.title = event.target.value;
      if (event.target.dataset.itemField === 'memo') itemDraft.memo = event.target.value;
      if (event.target.dataset.itemField === 'date') {
        if (itemDraft.mode === 'plan') itemDraft.planDate = event.target.value || null;
        else itemDraft.date = event.target.value || null;
      }
    }
    if (planDraft && event.target.dataset.planField) {
      const item = planDraft.items.find(entry => entry.id === event.target.dataset.id);
      if (event.target.dataset.planField === 'flow-title') planDraft.title = event.target.value;
      if (item && event.target.dataset.planField === 'item-title') item.title = event.target.value;
      if (item && event.target.dataset.planField === 'item-memo') item.memo = event.target.value;
      if (item && event.target.dataset.planField === 'item-date') item.planDate = event.target.value || null;
    }
  });

  document.addEventListener('change', event => {
    if (event.target.id === 'authoring-folder') { authoring.folderId = event.target.value || null; persistAuthoringDraft(); }
    if (itemDraft && event.target.dataset.itemField === 'folder') itemDraft.folderId = event.target.value || null;
  });

  document.addEventListener('keydown', event => {
    const authoringResultTab = event.target.closest('[role="tab"][data-action="authoring-result-tab"]');
    if (authoringResultTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      const views = ['txt', 'todo', 'calendar', 'sheet'];
      const current = views.indexOf(authoringResultTab.dataset.view);
      if (current >= 0) {
        event.preventDefault();
        let next = current;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = views.length - 1;
        else if (event.key === 'ArrowLeft') next = (current - 1 + views.length) % views.length;
        else next = (current + 1) % views.length;
        authoringResultView = views[next];
        renderAuthoringPreview();
        focusAfterRender('#authoring-result-tab-' + authoringResultView);
      }
      return;
    }
    const resultTab = event.target.closest('[role="tab"][data-action="result-tab"]');
    if (resultTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      const views = ['txt', 'todo', 'calendar', 'sheet'];
      const current = views.indexOf(resultTab.dataset.view);
      if (current >= 0) {
        event.preventDefault();
        let next = current;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = views.length - 1;
        else if (event.key === 'ArrowLeft') next = (current - 1 + views.length) % views.length;
        else next = (current + 1) % views.length;
        resultView = views[next];
        render();
        focusAfterRender('#standalone-result-tab-' + resultView);
      }
      return;
    }
    const templateChoice = event.target.closest('.template-choice[data-template-preview-id]');
    if (templateChoice && ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
      const choices = Array.from(document.querySelectorAll('.template-choice[data-template-preview-id]'));
      const current = choices.indexOf(templateChoice);
      if (current >= 0) {
        event.preventDefault();
        let next = current;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = choices.length - 1;
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + choices.length) % choices.length;
        else next = (current + 1) % choices.length;
        choices[next].focus();
      }
      return;
    }
    const moveHandle = event.target.closest('.drag-handle');
    if (moveHandle && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openMovePanel(moveHandle.dataset.moveKind, moveHandle.dataset.id, moveHandle.dataset.context, moveHandle, true);
      return;
    }
    const row = event.target.closest('.task-row');
    if (row && event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      moveOrder(row.dataset.taskId, row.dataset.context, event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.key === 'Escape' && screen.type === 'item-editor') {
      event.preventDefault();
      closeItemEditor('수정을 취소했어요.');
      return;
    }
    if (event.key === 'Escape' && screen.type === 'item-detail') {
      event.preventDefault();
      closeItemDetail();
      return;
    }
    if (event.key === 'Escape' && screen.type === 'plan-editor') {
      event.preventDefault();
      planDraft = null;
      screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: screen.selectedFlowId };
      setSaveStatus('수정을 취소했어요.', 'noop');
      render();
      focusAfterRender('[data-action="open-plan-editor"]', '[data-action="close-flow"]');
      return;
    }
    if (event.key === 'Escape' && screen.type === 'authoring' && authoringReviewOpen && authoringPropertyTarget && !elements.dialog.open) {
      event.preventDefault();
      const line = authoringPropertyTarget.line;
      if (authoringPropertyTarget.editorKey) {
        authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { editorKey: null });
        renderAuthoringPreview();
        focusAfterRender('[data-action="edit-authoring-property"][data-line="' + line + '"]', '#authoring-property-tray-heading-' + line);
        setSaveStatus('입력을 취소했어요. 원문은 그대로입니다.', 'noop');
      } else {
        authoringPropertyTarget = null;
        renderAuthoringPreview();
        focusAfterRender('[data-action="open-authoring-properties"][data-line="' + line + '"]', '#authoring-review-opener');
        setSaveStatus('속성 편집을 닫았어요. 원문은 그대로입니다.', 'noop');
      }
      return;
    }
    if (event.key === 'Escape' && screen.type === 'authoring' && authoringReviewOpen && !elements.dialog.open) {
      event.preventDefault();
      setAuthoringReviewOpen(false, true);
      setSaveStatus('항목 검토를 닫았어요.', 'noop');
      return;
    }
    if (event.key === 'Escape' && screen.type === 'authoring' && authoring.templatePickerOpen && !elements.dialog.open) {
      event.preventDefault();
      setTemplatePickerOpen(false, true);
      setSaveStatus('작성 틀을 닫았어요.', 'noop');
      return;
    }
    if (event.key === 'Escape' && dragged) {
      event.preventDefault();
      setSaveStatus('이동을 취소했어요.', 'noop');
      finishDrag();
      if (movePanelOpen()) closeMovePanel({ restoreFocus: true, announce: false });
      return;
    }
    if (event.key === 'Escape' && movePanelOpen()) {
      event.preventDefault();
      cancelHandlePress('', true);
      closeMovePanel({ restoreFocus: true, announce: true, message: '이동을 취소했어요.' });
      return;
    }
    if (event.key === 'Escape' && elements.dialog.open) {
      event.preventDefault();
      const authoringPropertyCanceled = Boolean(elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]'));
      closeDialog();
      setSaveStatus(authoringPropertyCanceled ? '취소했어요. 원문은 바뀌지 않았습니다.' : '취소했어요.', 'noop');
    }
  });

  document.addEventListener('dragstart', event => {
    const handle = event.target.closest('.drag-handle[draggable="true"]');
    if (!handle) return;
    const kind = handle.dataset.moveKind;
    const row = handle.closest(kind === 'flow' ? '.flow-row' : '.task-row');
    if (!row) return;
    const id = kind === 'flow' ? row.dataset.flowId : row.dataset.taskId;
    dragged = { kind, id, context: row.dataset.context, list: kind === 'task' ? row.closest('.task-list') : null };
    openMovePanel(kind, id, row.dataset.context, handle, false);
    row.classList.add('dragging');
    if (dragged.list) dragged.list.classList.add('reorder-corridor');
    setSaveStatus('놓을 위치를 골라 주세요.', 'noop');
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', dragged.id); }
  });
  document.addEventListener('dragover', event => {
    if (dragged) updateDragAutoScroll(event.clientY);
    const destination = event.target.closest('.move-destination[data-move-destination]');
    if (destination && dragged) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = moveDestinationState(destination, dragged) === 'invalid' ? 'none' : 'move';
      showMoveDestination(destination, dragged);
      return;
    }
    const row = event.target.closest('.task-row');
    if (!row || !dragged || dragged.kind !== 'task' || row.dataset.context !== dragged.context || !reorderPeerIds(dragged.id, dragged.context).includes(row.dataset.taskId)) {
      clearDropHighlights();
      clearMoveDestinationHighlights();
      if (dragged && !event.target.closest('.move-panel')) setSaveStatus(dragged.context === 'month' && row ? '다른 날짜 · 놓으면 취소' : '다른 목록 또는 대상 밖 · 놓으면 취소', 'noop');
      return;
    }
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    showDropPosition(row, dropPosition(row, event.clientY));
  });
  document.addEventListener('drop', event => {
    const destination = event.target.closest('.move-destination[data-move-destination]');
    const row = event.target.closest('.task-row');
    if (!dragged) return;
    event.preventDefault();
    try {
      if (destination) {
        const result = moveDestinationState(destination, dragged);
        if (result === 'invalid') {
          setMovePanelStatus(dragged.kind === 'flow' ? 'Flow는 폴더로만 이동할 수 있습니다.' : '이 항목에는 사용할 수 없는 대상입니다.', 'error');
          setSaveStatus('이곳으로는 옮길 수 없어요.', 'noop');
          return;
        }
        applyMoveDestination(destination);
        return;
      }
      if (dragged.kind !== 'task' || !row || row.dataset.context !== dragged.context) {
        setSaveStatus('이동을 취소했어요.', 'noop');
        closeMovePanel({ restoreFocus: true, announce: false });
        return;
      }
      reorderAtPosition(dragged.id, row.dataset.taskId, row.dataset.context, row.dataset.dropPosition === 'after' ? 'after' : 'before');
    } finally {
      finishDrag();
    }
  });
  document.addEventListener('dragend', () => {
    if (dragged) {
      setSaveStatus('이동을 취소했어요.', 'noop');
      if (movePanelOpen()) closeMovePanel({ restoreFocus: true, announce: false });
    }
    finishDrag();
  });
  window.addEventListener('blur', () => {
    cancelHandlePress('창을 벗어나 누르기 취소', true);
    if (dragged) {
      setSaveStatus('이동을 취소했어요.', 'noop');
      finishDrag();
      if (movePanelOpen()) closeMovePanel({ restoreFocus: false, announce: false });
    } else if (movePanelOpen()) {
      closeMovePanel({ restoreFocus: false, announce: true, message: '이동을 취소했어요.' });
    }
  });
  window.addEventListener('resize', () => {
    cancelHandlePress('화면 크기가 바뀌어 누르기 취소', true);
    if (dragged) {
      setSaveStatus('화면 크기가 바뀌어 이동을 취소했어요.', 'noop');
      finishDrag();
      if (movePanelOpen()) closeMovePanel({ restoreFocus: true, announce: false });
    } else if (movePanelOpen()) {
      closeMovePanel({ restoreFocus: true, announce: true, message: '화면 크기가 바뀌어 이동을 취소했어요.' });
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    cancelHandlePress('화면을 벗어나 누르기 취소', true);
    if (dragged) {
      setSaveStatus('이동을 취소했어요.', 'noop');
      finishDrag();
      if (movePanelOpen()) closeMovePanel({ restoreFocus: false, announce: false });
    } else if (movePanelOpen()) {
      closeMovePanel({ restoreFocus: false, announce: true, message: '이동을 취소했어요.' });
    }
  });

  document.addEventListener('pointerdown', event => {
    if (event.target.closest('#authoring-ghost-toggle')) {
      event.preventDefault();
      return;
    }
    const handle = event.target.closest('.drag-handle');
    if (!handle || event.pointerType === 'mouse' || event.button !== 0) return;
    cancelHandlePress('', false);
    pointerOrigin = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, handle, kind: handle.dataset.moveKind, id: handle.dataset.id, context: handle.dataset.context, phase: 'armed', moved: false };
    longPressTimer = window.setTimeout(() => {
      if (!pointerOrigin) return;
      const gesture = pointerOrigin;
      clearLongPressTimer();
      gesture.phase = 'active';
      suppressNextHandleClick(gesture.handle);
      try { gesture.handle.setPointerCapture(gesture.pointerId); } catch (error) { /* Synthetic pointers may not support capture. */ }
      openMovePanel(gesture.kind, gesture.id, gesture.context, gesture.handle, false);
    }, LONG_PRESS_DELAY_MS);
  });
  document.addEventListener('pointermove', event => {
    if (!pointerOrigin || event.pointerId !== pointerOrigin.pointerId) return;
    const distance = Math.hypot(event.clientX - pointerOrigin.x, event.clientY - pointerOrigin.y);
    if (pointerOrigin.phase === 'armed' && distance >= LONG_PRESS_CANCEL_DISTANCE_PX) {
      cancelHandlePress('손잡이 누르기 취소', true);
      return;
    }
    if (pointerOrigin.phase !== 'active' || distance < LONG_PRESS_CANCEL_DISTANCE_PX) return;
    event.preventDefault();
    pointerOrigin.moved = true;
    const point = document.elementFromPoint(event.clientX, event.clientY);
    const destination = point && point.closest('.move-destination[data-move-destination]');
    if (destination) {
      showMoveDestination(destination, pointerOrigin);
      return;
    }
    const row = point && point.closest('.task-row');
    if (pointerOrigin.kind === 'task' && row && row.dataset.context === pointerOrigin.context && reorderPeerIds(pointerOrigin.id, pointerOrigin.context).includes(row.dataset.taskId)) {
      clearMoveDestinationHighlights();
      showDropPosition(row, dropPosition(row, event.clientY));
      return;
    }
    clearDropHighlights();
    clearMoveDestinationHighlights();
    setMovePanelStatus('대상 밖에 놓으면 저장하지 않고 취소합니다.', 'neutral');
  });
  document.addEventListener('pointerup', event => {
    if (!pointerOrigin || event.pointerId !== pointerOrigin.pointerId) return;
    const gesture = pointerOrigin;
    clearLongPressTimer();
    pointerOrigin = null;
    if (gesture.phase !== 'active') return;
    suppressNextHandleClick(gesture.handle);
    try { gesture.handle.releasePointerCapture(gesture.pointerId); } catch (error) { /* Capture may already be gone. */ }
    if (!gesture.moved) return;
    const point = document.elementFromPoint(event.clientX, event.clientY);
    const destination = point && point.closest('.move-destination[data-move-destination]');
    if (destination) {
      const result = moveDestinationState(destination, gesture);
      if (result === 'invalid') {
        setMovePanelStatus(gesture.kind === 'flow' ? 'Flow는 폴더로만 이동할 수 있습니다.' : '이 항목에는 사용할 수 없는 대상입니다.', 'error');
        setSaveStatus('이곳으로는 옮길 수 없어요.', 'noop');
      } else applyMoveDestination(destination);
      clearDropHighlights();
      clearMoveDestinationHighlights();
      return;
    }
    const row = point && point.closest('.task-row');
    if (gesture.kind === 'task' && row && row.dataset.context === gesture.context) {
      const changed = reorderAtPosition(gesture.id, row.dataset.taskId, row.dataset.context, row.dataset.dropPosition === 'after' ? 'after' : 'before');
      finishMoveTransition(changed);
    } else {
      closeMovePanel({ restoreFocus: true, announce: true, message: '이동을 취소했어요.' });
    }
    clearDropHighlights();
    clearMoveDestinationHighlights();
  });
  document.addEventListener('pointercancel', event => {
    const activePointerMove = Boolean(pointerOrigin && pointerOrigin.phase === 'active' && event.pointerId === pointerOrigin.pointerId);
    if (pointerOrigin && event.pointerId === pointerOrigin.pointerId) cancelHandlePress('손잡이 누르기 취소', true);
    if (activePointerMove && movePanelOpen()) closeMovePanel({ restoreFocus: true, announce: true, message: '이동을 취소했어요.' });
    if (!dragged || (event.pointerType === 'mouse' && event.isTrusted)) return;
    const handle = event.target.closest('.drag-handle');
    if (handle) suppressNextHandleClick(handle);
    setSaveStatus('이동을 취소했어요.', 'noop');
    finishDrag();
  });
  document.addEventListener('scroll', event => {
    if (event.target && event.target.id === 'flow-editor') syncAuthoringGhostScroll();
    if (pointerOrigin) {
      const activePointerMove = pointerOrigin.phase === 'active';
      cancelHandlePress('스크롤로 누르기 취소', true);
      if (activePointerMove && movePanelOpen()) closeMovePanel({ restoreFocus: true, announce: true, message: '스크롤로 이동을 취소했어요.' });
    }
  }, true);

  elements.dialog.addEventListener('cancel', event => {
    event.preventDefault();
    const authoringPropertyCanceled = Boolean(elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]'));
    closeDialog();
    setSaveStatus(authoringPropertyCanceled ? '취소했어요. 원문은 바뀌지 않았습니다.' : '취소했어요.', 'noop');
  });

  if (storageMode === 'volatile') setSaveStatus('임시 모드 · 새로고침하면 초기화', 'error');
  else if (loadedDraft.status === 'restored') setSaveStatus('작성 중 초안 복원 · 저장 확인 전', 'saved');
  else if (loadedDraft.status === 'corrupt') setSaveStatus('손상된 작성 초안 차단 · 빈 작성 화면', 'error');
  else if (loadedDraft.status === 'read-error') setSaveStatus('작성 초안 읽기 실패 · 빈 작성 화면', 'error');
  else if (loaded.status === 'restored') setSaveStatus('마지막 성공 상태 복원', 'saved');
  else if (loaded.status === 'corrupt') setSaveStatus('손상된 저장 데이터를 열지 않고 기본 상태로 시작했어요.', 'error');
  else if (loaded.status === 'read-error') setSaveStatus('저장소 읽기 실패 · 기본 상태', 'error');
  render();
})();
