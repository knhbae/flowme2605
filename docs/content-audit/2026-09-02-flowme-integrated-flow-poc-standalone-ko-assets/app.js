(function () {
  'use strict';

  const M = window.FlowMeIntegratedPoc;
  if (!M) throw new Error('FlowMeIntegratedPoc model is required');
  const C = window.FlowPocWorkspaceCheckpoint;
  const S = window.FlowPocWorkspaceStorage;
  const F = window.FlowMePersonalWorkspaceContextualResult;
  const A = window.FlowMePersonalWorkspaceAuthoringUI;
  const P = window.FlowPocPersonalPlanContext;
  const PC = window.FlowPocPersonalPlanEditorControls;
  const PD = window.FlowPocPersonalPlanDisplay;
  const legacyPlanItemSessions = window.FlowPocPlanItemSession;
  if (!C || !S || !F || !A || !P || !PC || !PD || !legacyPlanItemSessions) throw new Error('PoC checkpoint storage runtime is required');

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
  const VIRTUAL_KEYBOARD_MIN_INSET_PX = 80;
  const FOCUSED_CONTROL_VIEWPORT_MARGIN_PX = 16;
  // Presentation paging is not a persisted Plan size limit.
  const PLAN_CHANGE_PAGE_SIZE = 10;

  const selectedStorage = acquireStorage();
  let storage = selectedStorage.storage;
  let storageMode = selectedStorage.mode;
  let workspacePacket = S.loadWorkspace(storage);
  let workspaceRecoveryGate = null;
  let workspaceTransactionPending = false;
  let workspaceOperationSequence = 0;
  let workspaceEpoch = 0;
  let workspaceSuspendedDialog = null;
  let loadedDraft = M.loadAuthoringDraft(storage);
  let loadedCreatorDrafts = M.loadCreatorDraftLibrary(storage);
  let loadedSourceCandidates = M.loadSourceCandidateStore(storage);
  let envelope = workspacePacket.ok ? workspacePacket.checkpoint : null;
  let creatorDraftLibrary = loadedCreatorDrafts.library;
  let creatorDraftLibraryStatus = loadedCreatorDrafts.status;
  let sourceCandidateStore = loadedSourceCandidates.store;
  let sourceCandidateRaw = loadedSourceCandidates.raw;
  let sourceCandidateStoreStatus = loadedSourceCandidates.status;
  let personalPlanSourceEpoch = 0;
  let planEditorPresentation = null;
  let recoveredSourceEditor = null;
  let personalDisplayCache = null;
  let personalDisplayBlocked = false;
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
  let visualViewportFrame = null;
  let focusedControlFrame = null;
  let viewportBaselineWidth = Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1);
  let viewportBaselineHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
  let lastLayoutViewport = { width: viewportBaselineWidth, height: viewportBaselineHeight };
  let showEmptyMonthDates = false;
  let localToday = readLocalToday();
  let timelineCacheCheckpoint = null;
  let timelineCacheDate = null;
  let timelineProjectionCache = new Map();
  let timelineOpeningTickets = new Map();
  let timelineClockTimer = null;
  let resultRankCheckpoint = null;
  let resultRankReader = null;
  let contextualOwner = F.createResultOwnerSession('standalone-result-' + Date.now().toString(36));
  let contextualAnchor = null;
  let contextualReveal = false;
  let contextualInput = 'pointer';
  let workspaceToastAnchor = null;
  const toastHome = elements.toast.parentElement;
  const saveFeedback = elements.saveStatus.parentElement;
  const saveFeedbackHome = saveFeedback.parentElement;
  const saveFeedbackHomeNext = saveFeedback.nextSibling;
  let planDraft = null;
  let itemDraft = null;
  let itemReturn = null;
  let itemEditorReturn = null;
  const planItemSessions = legacyPlanItemSessions.createForWorkspace('checkpoint-v2');
  let editorRecoveryAdapter = planItemSessions;
  const EDITOR_HISTORY_KEY = '__flowPocPlanItemV1';
  let planSession = null;
  let itemSession = null;
  let editorExpectedRaw = null;
  let editorReadFailed = false;
  let editorSequence = 0;
  let editorSaveSequence = 0;
  let editorHistoryConsuming = false;
  let editorHistoryRestore = null;
  let editorFeedback = null;
  let editorFeedbackBySession = new Map();
  let editorLastInputPoint = null;
  let editorRecoveryGate = null;
  let editorRecoveryJournalRaw = null;
  let editorCommitCounted = false;
  let editorRecoveryForeign = false;
  let editorCommitUncertain = false;
  let planSummaryPage = 0;
  let itemSummaryPage = 0;
  const editorSummaryCache = new WeakMap();
  const planAttemptSummaries = new WeakMap();
  const consumedPlanAttempts = new WeakSet();
  const durablePlanAttempts = new WeakSet();
  let planSaveResult = null;
  let planResultSequence = 0;
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
  let authoringPropertyReselection = null;
  let authoringPropertyRecovery = null;
  let authoringSourceEpoch = 0;
  let authoringPropertyApplying = false;
  let authoringPropertyComposing = false;
  let authoringPropertyCompositionEnter = false;
  let authoringRejectedNativeRedo = null;
  let authoringSourceMutationCount = 0;
  let dismissedNearMisses = new Set();
  let authoringStep = 'input';
  let creatorDraftQuery = '';
  let creatorDraftFilter = 'active';
  let creatorDraftMenuId = null;
  let creatorDraftRenameId = null;
  let creatorDraftReturnFocusId = null;
  let lastUndoLane = null;
  let authoringReviewOpen = false;
  let authoringReceipt = null;
  let authoringTemplatePreviewId = authoring.templateId || M.TEMPLATE_CATALOG[0].id;
  let authoringGhostVisible = true;
  // Ephemeral view choices never become source bytes or durable preferences.
  let authoringFlowViewVisible = true;
  let authoringEditorComposing = false;
  let authoringEditorResizeObserver = null;
  let authoringContextTarget = null;
  let authoringChooser = null;
  let authoringChooserEntry = 'review';
  let authoringChooserOpener = null;
  let authoringHelperSequence = 0;
  let nativeTemplateInsertPending = false;
  let nativeTemplateInputEventCount = 0;
  let nativeSourcePlanPending = false;
  let nativeSourcePlanInputEventCount = 0;
  let validationExampleExplorerOpen = false;
  let validationExampleQuery = '';
  let validationExampleGroupId = 'all';
  let validationExampleSelectedId = null;
  let validationExampleExpectedSourceFingerprint = null;
  let validationExampleReturnFocus = null;
  let validationExamplePersistenceRollback = false;
  let structureTemplatePersistenceRollback = false;
  let sourceUpdateSession = null;
  // Working comparison decisions live for this execution only. Durable source
  // bytes remain separate and are changed only by explicit apply/Undo.
  let sourcePracticeMemory = null;
  let sourceUpdateReturnFocus = null;
  let sourceUpdateValueView = 'mine';
  let deferredSourceUpdateFlowIds = new Set();
  // A normal later source refresh cannot silently clear a return-time draft conflict.
  const personalEntryReturnConflicts = { draft: null, creator: null };
  let personalEntryVisit = null;
  const personalEntryAuthoring = window.FlowPocPersonalEntryAuthoring.create({
    model: M,
    storage: {
      getItem: key => storage.getItem(key),
      setItem: (key, value) => { if (forceWriteError) throw new Error('poc-forced-draft-write-error'); storage.setItem(key, value); },
      removeItem: key => storage.removeItem(key)
    },
    makeDraftId: () => freshAuthoring().draftId,
    read: () => {
      const read = readPersonalEntry();
      if (!read.ok || draftUnavailable() || creatorDraftBlocked() || authoringPropertyIsRecovering()) return { ok: false };
      const library = M.loadCreatorDraftLibrary({ getItem: key => {
        if (key !== M.CREATOR_DRAFT_STORAGE_KEY) throw new Error('unexpected-entry-library-key');
        return read.libraryRaw;
      } });
      if (!['empty', 'restored'].includes(library.status)) return { ok: false };
      return { ok: true, binding: read.binding, scopeBinding: read.scopeBinding, draftRaw: read.draftRaw, libraryRaw: read.libraryRaw };
    }
  });
  const personalEntry = window.FlowPocPersonalEntryUI.create({
    content: elements.content, sidebar: elements.sidebar, canOpen: canOpenPersonalEntry, read: readPersonalEntry,
    query: (raw, packet) => window.FlowPocPersonalEntryQuery.resolvePersonalEntry(raw, packet),
    isAuthoring: () => screen.type === 'authoring', today: readLocalToday, shiftMonth: shiftResultMonth, folderTitle,
    preview: personalEntryPreview, onReturn: returnFromPersonalEntry,
    beginVisit: beginPersonalEntryVisit, endVisit: endPersonalEntryVisit,
    beforeVisitReturn: beforePersonalEntryVisitReturn, consumeVisitEditorHistory: handleEditorHistory,
    visitOwnsTarget: personalEntryVisitOwnsTarget,
    onOpen: () => { elements.toast.hidden = true; window.clearTimeout(showToast.timer); },
    authoringTransition: personalEntryAuthoring, onAuthoring: adoptPersonalEntryAuthoring,
    onAuthoringBlocked: (result, read) => {
      if (!['stale', 'recovery-required'].includes(result.status)) return;
      if (result.status === 'stale') {
        try { if (storage.getItem(M.DRAFT_STORAGE_KEY) === read.draftRaw) return; } catch (_) { /* uncertain stays locked */ }
      }
      loadedDraft = { status: 'drift', authoring: null };
      personalEntryReturnConflicts.draft = { expectedRaw: read.draftRaw, recoveryRequired: result.status === 'recovery-required' };
    },
    announce: message => setSaveStatus(message, 'error')
  });

  function canOpenPersonalEntry() {
    if (storageActionsLocked() || elements.dialog.open || moveTarget || dragged || pointerOrigin || sourceUpdateSession
      || validationExampleExplorerOpen || authoringPropertyApplying || nativeTemplateInsertPending || nativeSourcePlanPending
      || authoringEditorComposing || authoringPropertyComposing || authoringChooser || authoringPropertyTarget && authoringPropertyTarget.state !== 'success'
      || screen.type === 'authoring' && (authoring.templatePickerOpen || authoringReviewOpen || authoringStep === 'drafts')) return false;
    if (screen.type !== 'authoring' && screen.type !== 'workspace') return false;
    if (screen.type === 'authoring') {
      const draft = M.loadAuthoringDraft(storage);
      if (!['empty', 'restored'].includes(draft.status)
        || draft.status === 'restored' && (draft.authoring.draftId !== authoring.draftId || draft.authoring.rawText !== authoring.rawText)
        || authoring.rawText.length && draft.status !== 'restored') {
        setSaveStatus('현재 원문이 저장되었는지 먼저 확인해 주세요. 검색으로 입력을 닫지 않았습니다.', 'error'); return false;
      }
    }
    return true;
  }
  function readPersonalEntry() {
    try {
      if (!workspacePacket.ok || !envelope || workspaceTransactionPending || workspaceRecoveryGate || editorRecoveryGate
        || activeEditorSession() || editorHistoryConsuming || !S.sameAuthority(storage, workspacePacket).ok) return { ok: false };
      const input = { checkpoint: envelope, sourceRead: readCurrentPersonalSource(), sourceEpoch: personalPlanSourceEpoch };
      const reader = window.FlowPocPersonalEntryRead, captured = reader.createPersonalEntryReadPacket(input);
      if (!captured.ok) return captured;
      const catalog = reader.readPersonalEntryCatalog(captured.packet), display = PD.projectPersonalPlanDisplay(input);
      if (!catalog.ok || !display.ok || display.mode === 'personal-execution-only') return { ok: false };
      const draftRaw = storage.getItem(M.DRAFT_STORAGE_KEY), libraryRaw = storage.getItem(M.CREATOR_DRAFT_STORAGE_KEY);
      const scopeBinding = JSON.stringify([workspaceEpoch, personalPlanSourceEpoch, envelope, input.sourceRead, libraryRaw]);
      const binding = JSON.stringify([scopeBinding, draftRaw]);
      return { ok: true, binding, scopeBinding, input, state: display.state, packet: captured.packet, catalog: catalog.catalog, draftRaw, libraryRaw };
    } catch (_) { return { ok: false }; }
  }
  function adoptPersonalEntryAuthoring(result) {
    // The private entry adapter has verified draft readback. No handoff, workspace
    // commit, old draft deletion, or creator-library writer belongs to this step.
    authoring = Object.assign({}, result.authoring, { templatePickerOpen: false, sourceConfirmed: false });
    loadedDraft = { status: 'restored', authoring }; authoringDraftStored = true;
    authoringSourceEpoch += 1; authoringHelperSequence += 1;
    authoringStep = 'input'; authoringResultView = 'txt'; authoringOccurrencePage = 1;
    authoringCalendarBaseDate = M.TODAY; authoringCalendarSelectedDate = M.TODAY;
    authoringReviewOpen = false; authoringReceipt = null;
    authoringPropertyTarget = null; authoringPropertyReselection = null; authoringPropertyRecovery = null;
    authoringContextTarget = null; authoringChooser = null; authoringChooserOpener = null;
    authoringRejectedNativeRedo = null; authoringSourceMutationCount = 0;
    dismissedNearMisses = new Set(); creatorDraftMenuId = null; creatorDraftRenameId = null;
    authoringTemplatePreviewId = M.TEMPLATE_CATALOG[0].id;
    authoringEditorComposing = false; authoringPropertyComposing = false; authoringPropertyCompositionEnter = false;
    delete elements.app.dataset.authoringPropertyState;
    elements.app.dataset.authoringSourceMutations = '0';
    screen = { type: 'authoring' }; render();
    setSaveStatus(successfulStorageStatus('새 작성 초안 저장됨'), 'saved');
    focusAfterRender('#flow-editor', '.authoring-head h1');
  }
  function returnFromPersonalEntry(invalidated, fromAuthoring, captured) {
    if (fromAuthoring) resumeRetainedAuthoringObservation();
    const recoveryRequired = Boolean(personalEntryReturnConflicts.draft && personalEntryReturnConflicts.draft.recoveryRequired);
    if (!invalidated && !recoveryRequired) return;
    let draftDrift = true, libraryDrift = true;
    try { draftDrift = storage.getItem(M.DRAFT_STORAGE_KEY) !== captured.draftRaw;
      libraryDrift = storage.getItem(M.CREATOR_DRAFT_STORAGE_KEY) !== captured.libraryRaw; } catch (_) { /* read failure stays locked */ }
    if (draftDrift) { loadedDraft = { status: 'drift', authoring: null }; personalEntryReturnConflicts.draft = { expectedRaw: captured.draftRaw, recoveryRequired }; }
    if (libraryDrift) { creatorDraftLibraryStatus = 'drift'; personalEntryReturnConflicts.creator = { expectedRaw: captured.libraryRaw }; }
    const packet = S.loadWorkspace(storage);
    if (packet.ok) adoptWorkspace(packet); else workspacePacket = packet;
    refreshPersonalDisplaySource();
    personalDisplayBlocked = !personalDisplayPacket().ok;
    // Returning must not remount the textarea or reset its browser editing history.
    if (fromAuthoring) {
      setSaveStatus('다른 화면의 저장 변경을 확인했습니다. 작성 중 원문은 그대로 유지했습니다.', 'noop');
      if (!packet.ok || personalDisplayBlocked) setSaveStatus('저장 상태 확인 필요 · 작성 중 입력은 보존했으며 추가 저장은 차단했습니다.', 'error');
      if (draftDrift || libraryDrift || recoveryRequired) {
        setSaveStatus('다른 화면에서 초안이 바뀌어 덮어쓰기를 막았습니다. 이 화면의 입력과 다른 저장본을 모두 유지했습니다.', 'error');
        const notice = document.createElement('section'); notice.className = 'plan-item-save-feedback'; notice.setAttribute('role', 'alert');
        notice.dataset.testid = 'personal-entry-return-drift';
        notice.innerHTML = '<p>' + (recoveryRequired
          ? '새 작성의 저장·복구 결과를 확인하지 못했습니다. 현재 원문을 복사해 둔 뒤 새로고침해 저장본을 확인해 주세요. 이 화면에서는 추가 쓰기를 막았습니다.'
          : '다른 화면에서 초안이 바뀌었습니다. 현재 입력은 유지하고 초안 저장을 막았습니다. 필요한 입력은 복사해 두세요.') + '</p>'
          + (draftDrift && !recoveryRequired ? '<button class="button" type="button" data-action="feature-check-storage" data-feature="draft">작성 초안 다시 확인</button>' : '')
          + (libraryDrift ? '<button class="button" type="button" data-action="feature-check-storage" data-feature="creator">내 초안 다시 확인</button>' : '');
        elements.content.prepend(notice);
      }
    } else render();
  }
  function personalEntryProjection(read, copy, presentation) {
    const structure = PD.projectPersonalPlanStructureDisplay(Object.assign({}, read.input, { flowRef: copy.flowRef }));
    const hasP = Object.prototype.hasOwnProperty.call(read.input.checkpoint.state, P.METADATA_KEY)
      || read.input.checkpoint.undo && Object.prototype.hasOwnProperty.call(read.input.checkpoint.undo, P.METADATA_KEY);
    if (!structure.ok && hasP) return null;
    const rank = window.FlowPocTimelineResultRank.createResolver(read.input.checkpoint);
    const options = { baseDate: presentation.baseDate, selectedDate: presentation.selectedDate,
      finiteOccurrenceLimit: M.FINITE_RECURRENCE_PAGE_SIZE * presentation.page,
      openEndedOccurrenceWeeks: M.OPEN_ENDED_RECURRENCE_WEEKS * presentation.page,
      timelineRankResolver: rank && rank.ok ? rank.resolve : null };
    if (structure.ok && structure.structure) options.personalPlanStructureView = structure.structure;
    return M.resultProjection(read.state, copy.localFlowId, options);
  }
  function personalEntryItemFacts(read, copy, id, sourceOnly) {
    const member = copy.items.find(item => item.localTaskId === id);
    if (!member) return null;
    const task = read.state.tasks.find(item => item.id === id && item.ref === member.itemRef);
    const details = task && M.itemDetails(read.state, id);
    if (!details) return null;
    const title = sourceOnly ? (typeof task.sourceTitle === 'string' ? task.sourceTitle : '원문 제목 정보 없음') : task.title;
    return '<article data-testid="personal-entry-item-detail" data-item-ref="' + escapeHtml(member.itemRef) + '"><h3 tabindex="-1">'
      + escapeHtml(title) + '</h3><dl class="item-source-details"><div data-item-source-description><dt>원문 설명</dt><dd>'
      + escapeHtml(details.sourceDescription || '원문에 설명이 없어요.') + '</dd></div><div data-item-completion-criterion><dt>완료 기준</dt><dd>'
      + escapeHtml(details.completionCriterion || '원문에 완료 기준이 없어요.') + '</dd></div>'
      + (sourceOnly ? '' : '<div data-item-personal-memo><dt>내 메모</dt><dd>' + escapeHtml(details.personalMemo || '내 메모가 없어요.') + '</dd></div>')
      + '</dl><button class="button" type="button" data-action="entry-close-item">상세 닫기</button></article>';
  }
  function personalEntryPreview(read, copy, presentation) {
    const projection = personalEntryProjection(read, copy, presentation);
    if (!projection) return { ok: false };
    let html;
    if (presentation.owner === 'source') {
      const flow = read.state.flows.find(entry => entry.id === copy.localFlowId);
      const preserved = projection.workingSource.kind === 'preserved-raw-source';
      html = '<section data-testid="personal-entry-source"><h3>저장된 원문 정보</h3><p>외부 출처명·URL 정보 없음'
        + (copy.origin === 'source-backed-map' ? ' · 그룹 정보 없음' : '') + '</p><p>원문 제목: '
        + escapeHtml(typeof flow.sourceTitle === 'string' ? flow.sourceTitle : '정보 없음') + '</p>'
        + (preserved ? '<pre class="result-txt" data-working-source-kind="preserved-raw-source">' + escapeHtml(projection.workingSource.rawText) + '</pre>'
          : '<p>저장된 원문 전체가 없어요.</p><p>개인 제목·메모를 합쳐 원문으로 만들지 않습니다. 원래 구조를 확인할 수 없어 원문 기준 네 결과는 표시하지 않습니다.</p>')
        + copy.items.map(item => {
          const task = read.state.tasks.find(task => task.ref === item.itemRef);
          return '<button class="personal-entry-copy" type="button" data-action="entry-open-item" data-id="' + escapeHtml(item.localTaskId)
            + '">' + escapeHtml(typeof task.sourceTitle === 'string' ? task.sourceTitle : '원문 제목 정보 없음') + '</button>';
        }).join('') + '</section>';
    } else html = renderResultPanel({ id: copy.localFlowId }, { readOnly: true, projection, view: presentation.view, page: presentation.page });
    if (presentation.openItemId) {
      const facts = personalEntryItemFacts(read, copy, presentation.openItemId, presentation.owner === 'source');
      if (!facts) return { ok: false };
      html += facts;
    }
    return { ok: true, html };
  }
  function beginPersonalEntryVisit(copy, content, token, expectedBinding) {
    if (personalEntryVisit || !content || !content.isConnected || !token) return false;
    const read = readPersonalEntry();
    if (!read.ok || read.binding !== expectedBinding) return false;
    const selected = read.catalog.copies.find(entry => entry.flowRef === copy.flowRef);
    const flow = selected && read.state.flows.find(entry => entry.id === selected.localFlowId && entry.ref === selected.flowRef
      && entry.savedCopyId === selected.savedCopyId && entry.sourceFlowId === selected.flowId);
    if (!flow || copy.localFlowId !== flow.id || copy.savedCopyId !== flow.savedCopyId || copy.flowId !== flow.sourceFlowId) return false;
    personalEntryVisit = { token, content: elements.content, screen: copyScreen(screen), resultView,
      resultOccurrencePage, resultCalendarBaseDate, resultCalendarSelectedDate };
    elements.content = content;
    if (authoringEditorResizeObserver) { authoringEditorResizeObserver.disconnect(); authoringEditorResizeObserver = null; }
    screen = { type: 'workspace', view: 'folder:' + (flow.folderId || 'unfiled'), selectedFlowId: flow.id };
    resultView = 'txt'; resultOccurrencePage = 1; resultCalendarBaseDate = M.TODAY; resultCalendarSelectedDate = M.TODAY;
    render();
    focusAfterRender('.detail-header h1', '[data-action="close-flow"]');
    return true;
  }

  function personalEntryVisitOwnsTarget(target) {
    if (!personalEntryVisit || !(target instanceof HTMLElement) || !target.isConnected || target.closest('[hidden], [inert]')) return false;
    return elements.content.contains(target) || (elements.dialog.open && elements.dialog.contains(target))
      || (movePanelOpen() && elements.movePanel.contains(target)) || elements.sidebar.contains(target)
      || elements.undo.contains(target) || elements.compactUndo.contains(target) || elements.toast.contains(target)
      || Boolean(target.closest('.topbar') && target.closest('[data-action="go-workspace"], [data-action="go-authoring"]'));
  }

  function beforePersonalEntryVisitReturn(reason, fromHistory) {
    if (!personalEntryVisit) return false;
    if (reason === 'escape' && recoveredDraftDiscardDialogOpen()) { closeDialog(); return false; }
    if (workspaceTransactionPending || workspaceRecoveryGate || editorRecoveryGate
      || !workspacePacket.ok || editorHistoryConsuming) return false;
    if (activeEditorSession()) { requestEditorClose(reason === 'browser-back' ? reason : 'cancel', Boolean(fromHistory)); return false; }
    if (elements.dialog.open) { closeDialog(); return false; }
    if (sourceUpdateSession) { closeSourceUpdateReview(); return false; }
    if (dragged || pointerOrigin || longPressTimer !== null || movePanelOpen()) {
      cancelActiveMoveInteraction('이동을 취소했어요.', { restoreFocus: true });
      if (movePanelOpen()) closeMovePanel({ restoreFocus: true, announce: true });
      return false;
    }
    if (screen.type === 'item-detail') { closeItemDetail(); return false; }
    return true;
  }

  function endPersonalEntryVisit(token) {
    const visit = personalEntryVisit;
    if (!visit || visit.token !== token || workspaceTransactionPending || workspaceRecoveryGate || editorRecoveryGate
      || activeEditorSession() || editorHistoryConsuming || elements.dialog.open || sourceUpdateSession
      || dragged || pointerOrigin || longPressTimer !== null || movePanelOpen()) return false;
    interruptContextualResult('entry-visit-return');
    dismissPlanSaveResult();
    pendingRetry = null; elements.toast.hidden = true; window.clearTimeout(showToast.timer);
    elements.content = visit.content;
    screen = copyScreen(visit.screen);
    resultView = visit.resultView; resultOccurrencePage = visit.resultOccurrencePage;
    resultCalendarBaseDate = visit.resultCalendarBaseDate; resultCalendarSelectedDate = visit.resultCalendarSelectedDate;
    personalEntryVisit = null;
    // Restore the owner, never rerender the retained author's connected subtree.
    renderSidebar();
    document.querySelectorAll('.product-nav button').forEach(button => {
      const active = screen.type === 'authoring' ? button.dataset.action === 'go-authoring' : button.dataset.action === 'go-workspace';
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    syncWorkspaceSaveStatus();
    return true;
  }

  function resumeRetainedAuthoringObservation() {
    if (screen.type !== 'authoring' || authoringEditorResizeObserver) return;
    const frame = elements.content.querySelector('#flow-editor-frame');
    if (!frame || !frame.isConnected || frame.closest('[hidden], [inert]')) return;
    authoringEditorResizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(positionAuthoringContextAnchor) : null;
    if (authoringEditorResizeObserver) authoringEditorResizeObserver.observe(frame);
  }

  function visibleContentNodes(selector) {
    if (!personalEntryVisit) return Array.from(document.querySelectorAll(selector));
    if (selector === '#content') return [elements.content];
    return [elements.content, elements.dialog, elements.movePanel, elements.sidebar].flatMap(root => root
      ? [root, ...root.querySelectorAll(selector)].filter(node => node.matches(selector) && node.isConnected && !node.closest('[hidden], [inert]')) : []);
  }

  function acquireStorage() {
    try {
      const candidate = window.localStorage;
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
      folderId: null,
      creatorDraftId: null,
      creatorDraftRevision: null
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

  function sourcePacketFromLoaded(loaded) {
    return loaded.status === 'read-error' || loaded.status === 'unavailable'
      ? { ok: false, reason: loaded.status } : { ok: true, raw: loaded.raw };
  }
  function readCurrentPersonalSource() {
    try { return { ok: true, raw: storage.getItem(M.SOURCE_CANDIDATE_STORAGE_KEY) }; }
    catch (_) { return { ok: false, reason: 'read-error' }; }
  }
  function adoptPersonalDisplaySource(loaded) {
    if (loaded.raw !== sourceCandidateRaw || loaded.status !== sourceCandidateStoreStatus) personalPlanSourceEpoch += 1;
    loadedSourceCandidates = loaded;
    sourceCandidateStore = loaded.store; sourceCandidateRaw = loaded.raw; sourceCandidateStoreStatus = loaded.status;
  }
  function refreshPersonalDisplaySource() {
    if (activeEditorSession()) return;
    adoptPersonalDisplaySource(M.loadSourceCandidateStore(storage));
  }
  function personalDisplayPacket() {
    if (!envelope) return { ok: false, reason: 'workspace-authority-unavailable' };
    const previous = personalDisplayCache;
    if (previous && previous.checkpoint === envelope && previous.workspaceEpoch === workspaceEpoch && previous.raw === sourceCandidateRaw
      && previous.status === sourceCandidateStoreStatus && previous.sourceEpoch === personalPlanSourceEpoch) return previous.packet;
    const packet = PD.projectPersonalPlanDisplay({ checkpoint: envelope,
      sourceRead: sourcePacketFromLoaded({ status: sourceCandidateStoreStatus, raw: sourceCandidateRaw }), sourceEpoch: personalPlanSourceEpoch });
    personalDisplayCache = { checkpoint: envelope, workspaceEpoch, raw: sourceCandidateRaw, status: sourceCandidateStoreStatus, sourceEpoch: personalPlanSourceEpoch, packet };
    return packet;
  }
  function personalExecutionOnly() { return personalDisplayPacket().mode === 'personal-execution-only'; }
  function personalStructurePacket(flowId) {
    const display = personalDisplayPacket();
    if (!display.ok || display.mode === 'personal-execution-only') return { ok: false, reason: 'personal-structure-display-unavailable' };
    const flow = display.state.flows.find(entry => entry.id === flowId);
    if (!flow) return { ok: false, reason: 'unknown-plan' };
    const packet = PD.projectPersonalPlanStructureDisplay({ checkpoint: envelope, flowRef: flow.ref,
      sourceRead: sourcePacketFromLoaded({ status: sourceCandidateStoreStatus, raw: sourceCandidateRaw }), sourceEpoch: personalPlanSourceEpoch });
    if (packet.ok) return packet;
    // The old no-P composer supports some source shapes beyond the editor's
    // capability. Preserve that existing reader, never a P/Undo failure fallback.
    if (!Object.prototype.hasOwnProperty.call(envelope.state, P.METADATA_KEY)
      && !(envelope.undo && Object.prototype.hasOwnProperty.call(envelope.undo, P.METADATA_KEY))) return { ok: true, scope: 'legacy-structure-display', structure: null };
    return packet;
  }
  function personalResultProjection(flowId) {
    const read = personalStructurePacket(flowId);
    if (!read.ok) return null;
    const options = resultProjectionOptions();
    if (read.structure) options.personalPlanStructureView = read.structure;
    return M.resultProjection(state(), flowId, options);
  }
  function personalItemSection(task) {
    if (!task.flowId || personalExecutionOnly()) return null;
    const read = personalStructurePacket(task.flowId);
    if (!read.ok) return { ok: false, reason: read.reason };
    if (read.structure) return read.structure.sections.find(section => section.itemRefs.includes(task.ref)) || null;
    const flow = flowById(task.flowId);
    return flow && flow.steps.find(step => step.itemIds.includes(task.id)) || null;
  }
  function state() {
    const read = personalDisplayPacket();
    if (!read.ok) throw new Error('personal-display-unavailable');
    return read.state;
  }
  function preflightPersonalDisplay(candidateCheckpoint, candidateSourceRaw) {
    const sourceEpoch = readPersonalSourceEpoch(), sourceRead = readCurrentPersonalSource();
    const sourceChange = arguments.length > 1;
    if (sourceEpoch !== readPersonalSourceEpoch() || sourceChange && (!sourceRead.ok || sourceRead.raw !== sourceCandidateRaw)) return { ok: false, reason: 'stale-source-plan' };
    const checked = PD.inspectPersonalPlanDisplayCandidate({ checkpoint: workspacePacket.checkpoint, candidateCheckpoint,
      sourceRead, candidateSourceRead: sourceChange ? { ok: true, raw: candidateSourceRaw } : sourceRead, sourceEpoch });
    if (!checked.ok) setSaveStatus('원문과 개인 계획을 함께 표시할 수 없어 변경하지 않았어요. 현재 입력과 Undo를 유지했습니다.', 'error');
    return checked;
  }
  function anyTaskById(id) { return state().tasks.find(task => task.id === id) || null; }
  function anyFlowById(id) { return state().flows.find(flow => flow.id === id) || null; }
  function taskById(id) { const task = anyTaskById(id); return task && !M.isTrashedTask(state(), task) ? task : null; }
  function flowById(id) { const flow = anyFlowById(id); return flow && !M.isTrashedFlow(state(), flow.id) ? flow : null; }
  function quickConversionReceipt(id) { return M.quickConversionReceipts(state()).find(receipt => receipt.sourceQuickItemId === id) || null; }
  function folderById(id) { return state().folders.find(folder => folder.id === id) || null; }
  function folderTitle(id) { const folder = folderById(id); return folder ? folder.title : '미분류'; }
  function sourceTitle(entry) { return entry && entry.sourceTitle ? entry.sourceTitle : (entry ? entry.title : ''); }
  function renderItemSourceDetails(task) {
    if (personalExecutionOnly()) return '<p role="status">원문 상태를 확인하지 못해 원문 설명과 완료 기준은 표시하지 않습니다.</p>';
    const details = M.itemDetails(state(), task.id);
    if (!details) return '<p role="status">원문 정보를 안전하게 확인할 수 없어요.</p>';
    return '<dl class="item-source-details"><div data-item-source-description><dt>원문 설명</dt><dd>' + escapeHtml(details.sourceDescription || '원문에 설명이 없어요.') + '</dd></div><div data-item-completion-criterion><dt>완료 기준</dt><dd>' + escapeHtml(details.completionCriterion || '원문에 완료 기준이 없어요.') + '</dd></div></dl>';
  }
  function flowDisplayTitle(flow) { return (personalExecutionOnly() ? '마지막 저장 이름 · ' : '') + M.flowDisplayTitle(state(), flow); }
  function planDate(task) { return Object.prototype.hasOwnProperty.call(task, 'planDate') ? task.planDate : (task.sourceDate === undefined ? task.date : task.sourceDate); }
  function flowFolder(task) { return task.flowId ? (flowById(task.flowId) || {}).folderId || null : task.folderId; }
  function contextLabel(context) {
    if (context === 'today') return '오늘';
    if (context === 'week') return '주간';
    if (context === 'month') return '월간';
    if (context === 'undated') return '날짜 미정';
    if (context === 'trash') return '휴지통';
    if (context.indexOf('date:') === 0) return periodDateHeading(context.slice(5));
    if (context.indexOf('overdue:') === 0) return '지난 미완료';
    if (context === 'undated:undated') return '날짜 미정';
    if (context.indexOf('folder:') === 0) return folderTitle(context.slice(7) === 'unfiled' ? null : context.slice(7));
    if (context.indexOf('flow:') === 0) {
      const flow = flowById(context.slice(5));
      return flow ? flowDisplayTitle(flow) : 'Flow';
    }
    return '';
  }

  function dateLabel(date) {
    if (!date) return '날짜 미정';
    if (date === localToday) return '오늘 · ' + date;
    if (date === window.FlowPocTimelineContext.addPlainDays(localToday, 1)) return '내일 · ' + date;
    return date;
  }

  function readLocalToday() {
    const now = new Date();
    return String(now.getFullYear()).padStart(4, '0') + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  }

  function timelineProjection(view, anchor) {
    if (!workspacePacket.ok) return { ok: false, reason: 'workspace-unverified', groups: [] };
    if (timelineCacheCheckpoint !== workspacePacket.checkpoint || timelineCacheDate !== localToday) {
      timelineCacheCheckpoint = workspacePacket.checkpoint;
      timelineCacheDate = localToday;
      timelineProjectionCache = new Map();
      timelineOpeningTickets = new Map();
    }
    const date = anchor || localToday;
    const key = view + ':' + date;
    if (!timelineProjectionCache.has(key)) timelineProjectionCache.set(key, C.projectGroups(workspacePacket.checkpoint, view, date));
    return timelineProjectionCache.get(key);
  }

  function isTimelineContext(context) {
    return ['today', 'week', 'month', 'undated', 'undated:undated'].includes(context) || /^(date|overdue):/.test(context || '');
  }

  function timelineGroup(context, taskId) {
    let projection;
    if (String(context).indexOf('date:') === 0) projection = timelineProjection('month', context.slice(5));
    else if (String(context).indexOf('overdue:') === 0) {
      if (context !== 'overdue:' + localToday) return null;
      projection = timelineProjection('today');
    } else if (context === 'undated:undated') projection = timelineProjection('undated');
    else if (['today', 'week', 'month', 'undated'].includes(context)) projection = timelineProjection(context);
    else return null;
    if (!projection.ok) return null;
    return projection.groups.find(group => (group.context + ':' + group.contextKey === context || ['today', 'week', 'month', 'undated'].includes(context))
      && (!taskId || group.ids.includes(taskId))) || null;
  }

  function rememberTimelineTicket(group) {
    const context = group.context + ':' + group.contextKey;
    const ticket = Object.freeze({ context: group.context, contextKey: group.contextKey, localToday,
      expectedRevision: workspacePacket.checkpoint.state.revision, currentOrderedRefKeys: Object.freeze(group.ids.slice()),
      checkpoint: workspacePacket.checkpoint, packet: workspacePacket, blocked: group.blocked });
    timelineOpeningTickets.set(context, ticket);
    return ticket;
  }

  function openingTimelineTicket(id, context) {
    if (!isTimelineContext(context)) return null;
    const group = timelineGroup(context, id);
    if (!group) return null;
    return timelineOpeningTickets.get(group.context + ':' + group.contextKey) || rememberTimelineTicket(group);
  }

  function refreshTimelineClock() {
    const next = readLocalToday();
    if (next === localToday) return false;
    interruptContextualResult('date-rollover');
    localToday = next;
    timelineProjectionCache = new Map();
    timelineOpeningTickets = new Map();
    cancelActiveMoveInteraction('날짜가 바뀌어 이동을 취소했어요.', { restoreFocus: false });
    if (movePanelOpen()) closeMovePanel({ restoreFocus: false, announce: false });
    // Date rollover is a read refresh. Do not remount an authoring/native Undo
    // editor or replace a dirty Plan/Quick draft to update a period heading.
    if (workspacePacket.ok && !storageActionsLocked()) {
      if (screen.type === 'workspace' && !screen.selectedFlowId && !activeEditorSession()) render();
      else renderSidebar();
    }
    scheduleTimelineClock();
    return true;
  }

  function scheduleTimelineClock() {
    window.clearTimeout(timelineClockTimer);
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const delay = Math.max(1000, Math.min(2147483647, midnight.getTime() - now.getTime() + 30));
    timelineClockTimer = window.setTimeout(() => { refreshTimelineClock(); scheduleTimelineClock(); }, delay);
  }

  function resultProjectionOptions() {
    if (resultRankCheckpoint !== envelope) {
      resultRankCheckpoint = envelope;
      resultRankReader = envelope && window.FlowPocTimelineResultRank.createResolver(envelope);
    }
    return {
      baseDate: resultCalendarBaseDate,
      selectedDate: resultCalendarSelectedDate,
      finiteOccurrenceLimit: M.FINITE_RECURRENCE_PAGE_SIZE * resultOccurrencePage,
      openEndedOccurrenceWeeks: M.OPEN_ENDED_RECURRENCE_WEEKS * resultOccurrencePage,
      timelineRankResolver: resultRankReader && resultRankReader.ok ? resultRankReader.resolve : null
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

  function isTextEntryControl(control) {
    if (!(control instanceof HTMLElement)) return false;
    if (control.matches('textarea, select')) return true;
    if (!control.matches('input')) return false;
    return !['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'].includes((control.type || 'text').toLowerCase());
  }

  function readVisualViewportMetrics() {
    const viewport = window.visualViewport;
    const width = Math.max(1, Math.round(viewport ? viewport.width : (window.innerWidth || document.documentElement.clientWidth || 1)));
    const height = Math.max(1, Math.round(viewport ? viewport.height : (window.innerHeight || document.documentElement.clientHeight || 1)));
    const offsetTop = Math.max(0, Math.round(viewport ? viewport.offsetTop : 0));
    const offsetLeft = Math.max(0, Math.round(viewport ? viewport.offsetLeft : 0));
    const layoutWidth = Math.max(1, Math.round(window.innerWidth || document.documentElement.clientWidth || width));
    const layoutHeight = Math.max(1, Math.round(window.innerHeight || document.documentElement.clientHeight || height));
    if (Math.abs(layoutWidth - viewportBaselineWidth) > 48) {
      viewportBaselineWidth = layoutWidth;
      viewportBaselineHeight = Math.max(layoutHeight, height + offsetTop);
    } else {
      viewportBaselineHeight = Math.max(viewportBaselineHeight, layoutHeight, height + offsetTop);
    }
    const rawKeyboardInset = Math.max(0, viewportBaselineHeight - height - offsetTop);
    const visualViewportInset = Math.max(0, layoutHeight - height - offsetTop);
    const keyboardInset = rawKeyboardInset >= VIRTUAL_KEYBOARD_MIN_INSET_PX
      && (isTextEntryControl(document.activeElement) || visualViewportInset >= VIRTUAL_KEYBOARD_MIN_INSET_PX)
      ? rawKeyboardInset
      : 0;
    return {
      width,
      height,
      offsetTop,
      offsetLeft,
      keyboardInset,
      keyboardOpen: keyboardInset > 0,
      mode: viewport ? 'visual-viewport' : 'layout-viewport'
    };
  }

  function ensureControlVisibleInVisualViewport(control) {
    if (!(control instanceof HTMLElement) || !control.isConnected || typeof control.getBoundingClientRect !== 'function') return;
    const metrics = readVisualViewportMetrics();
    const bounds = control.getBoundingClientRect();
    const visibleTop = metrics.offsetTop + FOCUSED_CONTROL_VIEWPORT_MARGIN_PX;
    const visibleBottom = metrics.offsetTop + metrics.height - FOCUSED_CONTROL_VIEWPORT_MARGIN_PX;
    if (bounds.top >= visibleTop && bounds.bottom <= visibleBottom) return;
    control.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
  }

  function scheduleFocusedControlVisibility(control) {
    if (focusedControlFrame !== null) window.cancelAnimationFrame(focusedControlFrame);
    focusedControlFrame = window.requestAnimationFrame(() => {
      focusedControlFrame = null;
      ensureControlVisibleInVisualViewport(control || document.activeElement);
    });
  }

  function syncVisualViewport() {
    visualViewportFrame = null;
    const metrics = readVisualViewportMetrics();
    const root = document.documentElement;
    root.style.setProperty('--standalone-visual-viewport-width', metrics.width + 'px');
    root.style.setProperty('--standalone-visual-viewport-height', metrics.height + 'px');
    root.style.setProperty('--standalone-visual-viewport-top', metrics.offsetTop + 'px');
    root.style.setProperty('--standalone-visual-viewport-left', metrics.offsetLeft + 'px');
    root.style.setProperty('--standalone-keyboard-inset', metrics.keyboardInset + 'px');
    document.body.dataset.visualViewport = metrics.mode;
    document.body.dataset.virtualKeyboard = metrics.keyboardOpen ? 'open' : 'closed';
    elements.app.dataset.visualViewportHeight = String(metrics.height);
    elements.app.dataset.virtualKeyboard = metrics.keyboardOpen ? 'open' : 'closed';
    if (metrics.keyboardOpen && document.activeElement instanceof HTMLElement) {
      scheduleFocusedControlVisibility(document.activeElement);
    } else if (isTextEntryControl(document.activeElement)) {
      scheduleFocusedControlVisibility(document.activeElement);
    }
  }

  function scheduleVisualViewportSync() {
    if (visualViewportFrame !== null) return;
    visualViewportFrame = window.requestAnimationFrame(syncVisualViewport);
  }

  let sourceUpdateFocusEpoch = 0;
  function focusAfterRender(selector, fallback, sourceFocus) {
    const visit = personalEntryVisit, targetScreen = JSON.stringify(screen);
    const focusOwner = sourceFocus ? document.activeElement : null;
    const sourceOwner = sourceFocus ? sourceUpdateSession : null;
    const changeId = sourceOwner && sourceOwner.selectedChangeId;
    const epoch = sourceFocus ? ++sourceUpdateFocusEpoch : 0;
    window.setTimeout(() => {
      if (personalEntryVisit !== visit || visit && targetScreen !== JSON.stringify(screen)) return;
      // A delayed comparison focus belongs to its original screen and change.
      // Respect an explicit focus move made while this callback was queued.
      if (sourceFocus && (epoch !== sourceUpdateFocusEpoch
        || targetScreen !== JSON.stringify(screen) || sourceUpdateSession !== sourceOwner
        || sourceOwner && sourceOwner.selectedChangeId !== changeId
        || document.activeElement !== focusOwner)) return;
      const target = selector ? visibleContentNodes(selector)[0] : null;
      const destination = target || (fallback ? visibleContentNodes(fallback)[0] : null);
      if (destination) {
        if (!destination.isConnected || destination.closest('[hidden], [inert]')) return;
        if (visit && !destination.matches('button, input, select, textarea, a[href], [tabindex]')) destination.tabIndex = -1;
        destination.focus({ preventScroll: true });
        scheduleFocusedControlVisibility(destination);
      }
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

  function resultScreenKey() {
    return JSON.stringify([screen.type, screen.view || '', screen.selectedFlowId || '', screen.selectedItemId || '']);
  }

  function interruptContextualResult(reason) {
    contextualOwner = F.interruptOwner(contextualOwner, reason);
    contextualReveal = false;
    const current = elements.content.querySelector('[data-testid="workspace-contextual-result"]');
    if (current && reason === 'move-preview' && (dragged || pointerOrigin && pointerOrigin.phase === 'active')) {
      // Keep the exact occupied box until the gesture ends. Removing it inside
      // native dragstart can clamp scrollY and make Chromium end the drag.
      current.removeAttribute('data-testid');
      current.dataset.contextualGestureSpacer = 'true';
      current.setAttribute('aria-hidden', 'true');
      current.inert = true;
      current.style.visibility = 'hidden';
      current.querySelectorAll('[aria-live]').forEach(node => node.setAttribute('aria-live', 'off'));
      return;
    }
    if (current) current.remove();
    elements.content.querySelectorAll('[data-contextual-placeholder]').forEach(node => node.remove());
  }

  function clearContextualGestureSpacer() {
    if (dragged || pointerOrigin && pointerOrigin.phase === 'active') return;
    elements.content.querySelectorAll('[data-contextual-gesture-spacer]').forEach(node => {
      const placeholder = node.closest('[data-contextual-placeholder]');
      if (placeholder) placeholder.remove(); else node.remove();
    });
  }

  function contextualFacts() {
    const checked = S.sameAuthority(storage, workspacePacket);
    if (!checked.ok && contextualOwner.lastSuccess) interruptContextualResult('external-drift');
    return { lane: lastUndoLane, exactTargetRaw: workspacePacket.expectedCheckpointRaw || null,
      hasUndo: Boolean(envelope && envelope.undo), authorityReady: checked.ok,
      pending: workspaceTransactionPending, editorOwner: Boolean(activeEditorSession()),
      recoveryOwner: Boolean(workspaceRecoveryGate || editorRecoveryGate),
      receiptOwnerId: screen.type === 'receipt' ? 'authoring-receipt' : planSaveResult ? planSaveResult.id : null };
  }

  function contextualRows() {
    return Array.from(elements.content.querySelectorAll('.task-row,.flow-row'));
  }

  function rowKey(row) { return row && (row.dataset.taskId ? 'task:' + row.dataset.taskId : 'flow:' + row.dataset.flowId); }

  function captureResultAnchor(id, kind, context) {
    const rows = contextualRows();
    const row = rows.find(entry => kind === 'flow' ? entry.dataset.flowId === id : entry.dataset.taskId === id)
      || (document.activeElement instanceof HTMLElement ? document.activeElement.closest('.task-row,.flow-row') : null);
    const token = context || (row && row.dataset.context) || (moveTarget && moveTarget.context) || '';
    const group = row && row.closest('[data-timeline-context]')
      || Array.from(elements.content.querySelectorAll('[data-timeline-context]')).find(entry => entry.dataset.timelineContext === token);
    const peers = row ? Array.from(row.parentElement.children).filter(entry => entry.matches('.task-row,.flow-row')) : [];
    const index = row ? peers.indexOf(row) : -1;
    const sections = Array.from(elements.content.querySelectorAll('[data-timeline-context]'));
    return { screenKey: resultScreenKey(), id: id || (row && (row.dataset.taskId || row.dataset.flowId)) || null,
      kind: kind || (row && row.dataset.flowId ? 'flow' : 'task'), context: token,
      previous: index > 0 ? rowKey(peers[index - 1]) : null, next: index >= 0 ? rowKey(peers[index + 1]) : null,
      groupIndex: group ? sections.indexOf(group) : -1, groupTitle: group && group.querySelector('h2') ? group.querySelector('h2').textContent : '',
      scrollY: window.scrollY, input: contextualInput, focusAction: document.activeElement instanceof HTMLElement ? document.activeElement.dataset.action || null : null };
  }

  function insertResultAtAnchor(node, anchor) {
    if (!anchor || anchor.screenKey !== resultScreenKey()) return false;
    const rows = contextualRows();
    const next = rows.find(row => rowKey(row) === anchor.next);
    const previous = rows.find(row => rowKey(row) === anchor.previous);
    const original = rows.find(row => rowKey(row) === anchor.kind + ':' + anchor.id);
    const groups = Array.from(elements.content.querySelectorAll('[data-timeline-context]'));
    const group = groups.find(entry => entry.dataset.timelineContext === anchor.context);
    if (next) next.before(node);
    else if (original) original.after(node);
    else if (previous) previous.after(node);
    else if (group) group.append(node);
    else if (anchor.groupIndex >= 0 && elements.content.querySelector('.period-timeline')) {
      const placeholder = document.createElement('section');
      placeholder.className = 'period-day contextual-empty-group';
      placeholder.dataset.contextualPlaceholder = 'true';
      const heading = document.createElement('h2'); heading.textContent = anchor.groupTitle;
      placeholder.append(heading, node);
      const target = groups[anchor.groupIndex];
      if (target) target.before(placeholder); else elements.content.querySelector('.period-timeline').append(placeholder);
    } else {
      const list = elements.content.querySelector(anchor.kind === 'flow' ? '.flow-list' : '.task-list');
      if (list) list.append(node);
      else elements.content.append(node);
    }
    return true;
  }

  function contextualIntent(action, before, candidate, message) {
    const supported = ['schedule', 'move-folder', 'reorder', 'timeline-reorder', 'timeline-reset', 'complete', 'move-occurrence-date', 'complete-occurrence'];
    if (!supported.includes(action.type)) return null;
    let id = action.id || (moveTarget && moveTarget.id) || (dragged && dragged.id);
    if (!id && action.currentOrderedRefKeys) id = action.currentOrderedRefKeys.find((key, index) => action.orderedRefKeys && key !== action.orderedRefKeys[index]) || action.currentOrderedRefKeys[0];
    if (!id && action.ids) id = action.ids.find((key, index) => M.viewTaskIds(before, action.context)[index] !== key) || action.ids[0];
    const flow = action.kind === 'flow' ? before.flows.find(entry => entry.id === id) : null;
    const task = before.tasks.find(entry => entry.id === id || action.sourceItemRef && entry.ref === action.sourceItemRef);
    const taskResultRef = entry => entry.flowId ? entry.ref : 'quick-item:standalone-integrated:' + encodeURIComponent(entry.id);
    const changedTask = task && candidate.tasks.find(entry => entry.id === task.id);
    const changedFlow = flow && candidate.flows.find(entry => entry.ref === flow.ref);
    const refs = action.occurrenceId ? [action.occurrenceId] : flow ? [flow.ref] : task ? [taskResultRef(task)] : (action.currentOrderedRefKeys || []).map(key => before.tasks.find(entry => entry.id === key)).filter(Boolean).map(taskResultRef);
    if (!refs.length || refs.some(ref => !ref)) return null;
    const context = action.contextKey ? { kind: action.context, key: action.contextKey } : null;
    const token = context ? context.kind + ':' + context.key : (moveTarget && moveTarget.context) || action.context || '';
    const anchor = captureResultAnchor(flow ? flow.id : task && task.id, flow ? 'flow' : 'task', token);
    const operation = action.type === 'schedule' || action.type === 'move-occurrence-date' ? 'move-date'
      : action.type === 'move-folder' ? 'move-folder' : action.type.indexOf('complete') === 0 ? (action.done ? 'complete' : 'reopen') : 'move-order';
    let summary = (flow ? flowDisplayTitle(flow) : task ? task.title : contextLabel(token)) + ' · ' + message;
    const changes = [];
    if (operation === 'move-date' && changedTask && !action.occurrenceId) changes.push({ label: '실행 날짜', before: task.date, after: changedTask.date });
    if (operation === 'move-folder') {
      const from = flow ? flow.folderId : task.folderId;
      const to = changedFlow ? changedFlow.folderId : changedTask.folderId;
      changes.push({ label: '폴더', before: folderTitle(from), after: folderTitle(to) });
      summary = (flow ? flowDisplayTitle(flow) : task.title) + ' · ' + folderTitle(to) + '로 옮겼어요.';
    }
    return { anchor, intent: { operation, refs, summary, changes,
      ...(context ? { context } : {}), returnPointKey: anchor.screenKey } };
  }

  function settleContextualChange(feedback, succeeded) {
    if (!feedback) return;
    const facts = contextualFacts();
    const outcome = succeeded && facts.authorityReady && typeof facts.exactTargetRaw === 'string'
      ? { kind: 'success', exactTargetRaw: facts.exactTargetRaw, hasUndo: facts.hasUndo, authorityReady: true }
      : { kind: workspaceRecoveryGate || editorRecoveryGate ? 'recovery-required' : 'failed' };
    const settled = feedback.undo ? F.settleUndo(contextualOwner, feedback.ticket, outcome) : F.settleAttempt(contextualOwner, feedback.ticket, outcome);
    contextualOwner = settled.state;
    if (settled.accepted && outcome.kind === 'success') { contextualAnchor = feedback.anchor; contextualReveal = true; }
  }

  function renderContextualResult() {
    elements.content.querySelectorAll('[data-testid="workspace-contextual-result"], [data-contextual-placeholder]').forEach(node => node.remove());
    if (contextualAnchor && contextualAnchor.screenKey !== resultScreenKey()) interruptContextualResult('screen-change');
    if (!contextualOwner.lastSuccess || !['success', 'undone'].includes(contextualOwner.presentation)) return;
    const selection = F.selectResult(contextualOwner, contextualFacts());
    if (selection.reason === 'stale-result') interruptContextualResult('lane-or-state-change');
    if (!selection.result || !contextualAnchor) return;
    const result = selection.result;
    const node = document.createElement('section');
    node.className = 'workspace-contextual-result'; node.dataset.testid = 'workspace-contextual-result';
    node.dataset.ownerId = result.ownerId; node.dataset.status = result.status; node.tabIndex = -1;
    node.setAttribute('aria-label', '개인공간 변경 결과');
    const announcement = document.createElement('p'); announcement.setAttribute('role', 'status'); announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = result.summary; node.append(announcement);
    const actions = document.createElement('div'); actions.className = 'contextual-result-actions';
    if (selection.canUndo) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'button';
      button.dataset.action = 'contextual-undo'; button.dataset.ownerId = result.ownerId; button.textContent = '되돌리기'; actions.append(button);
    }
    const close = document.createElement('button'); close.type = 'button'; close.className = 'button';
    close.dataset.action = 'contextual-dismiss'; close.dataset.ownerId = result.ownerId; close.textContent = '닫기'; close.setAttribute('aria-label', '변경 결과 닫기'); actions.append(close);
    node.append(actions);
    if (!insertResultAtAnchor(node, contextualAnchor)) return;
    elements.saveStatus.setAttribute('aria-live', 'off'); elements.saveStatus.removeAttribute('role'); elements.saveStatus.hidden = true;
    if (contextualReveal) {
      contextualReveal = false;
      window.requestAnimationFrame(() => {
        if (!node.isConnected) return;
        const source = contextualRows().find(row => rowKey(row) === contextualAnchor.kind + ':' + contextualAnchor.id);
        if (result.status === 'undone' && source) {
          window.scrollTo({ top: contextualAnchor.scrollY, behavior: 'instant' });
          if (contextualAnchor.input === 'keyboard') {
            const target = Array.from(source.querySelectorAll('[data-action]')).find(control => control.dataset.action === contextualAnchor.focusAction) || source;
            target.focus({ preventScroll: true });
          }
        } else node.scrollIntoView({ block: 'nearest' });
        if (contextualAnchor.input === 'keyboard' && !source) node.focus({ preventScroll: true });
      });
    }
  }

  function syncWorkspaceToast() {
    if (elements.toast.hidden) return;
    const workspace = screen.type === 'workspace' || screen.type === 'item-detail';
    elements.toast.classList.toggle('workspace-inline-toast', workspace);
    if (workspace) {
      if (!workspaceToastAnchor || workspaceToastAnchor.screenKey !== resultScreenKey()) workspaceToastAnchor = captureResultAnchor();
      insertResultAtAnchor(elements.toast, workspaceToastAnchor);
    } else if (elements.toast.parentElement !== toastHome) toastHome.append(elements.toast);
  }

  function undoContextualResult(ownerId) {
    if (!workspaceWritable()) return false;
    const begun = F.beginContextualUndo(contextualOwner, ownerId, contextualFacts());
    if (!begun.ok) { interruptContextualResult('stale-undo'); renderContextualResult(); return false; }
    contextualOwner = begun.state;
    const feedback = { ticket: begun.ticket, anchor: contextualAnchor, undo: true };
    const result = C.undoCheckpoint(workspacePacket.checkpoint);
    const changed = result.changed && writeCandidate(result.checkpoint, result.message, null, 'undo', undefined, feedback);
    if (!changed) { settleContextualChange(feedback, false); renderContextualResult(); }
    return Boolean(changed);
  }

  function showToast(message, canUndo, retry, mode) {
    dismissPlanSaveResult();
    interruptContextualResult('new-feedback');
    workspaceToastAnchor = captureResultAnchor();
    pendingRetry = typeof retry === 'function' ? retry : null;
    elements.toastMessage.textContent = message;
    const undo = elements.toast.querySelector('[data-action="undo"]');
    undo.hidden = !canUndo;
    elements.toastRetry.hidden = !pendingRetry;
    elements.toast.setAttribute('role', mode === 'error' ? 'alert' : 'status');
    elements.toast.setAttribute('aria-live', mode === 'error' ? 'assertive' : 'polite');
    elements.toast.hidden = false;
    syncWorkspaceToast();
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => { elements.toast.hidden = true; pendingRetry = null; }, 5200);
  }

  function setSaveStatus(text, mode) {
    elements.saveStatus.textContent = text;
    elements.saveStatus.dataset.mode = mode || '';
    elements.saveStatus.setAttribute('role', mode === 'error' ? 'alert' : 'status');
    elements.saveStatus.setAttribute('aria-live', mode === 'error' ? 'assertive' : 'polite');
    elements.saveStatus.hidden = !text;
    if (isSourceEditor(activeEditorSession()) && editorFeedback || elements.content.querySelector('[data-testid="plan-save-result"]')) silencePlanGlobalFeedback();
    elements.app.dataset.saveState = mode || 'ready';
    syncWorkspaceSaveStatus();
  }

  function syncWorkspaceSaveStatus() {
    // Reuse the live node. Read feedback owns document space, not a title-covering
    // overlay. Editors and recovery retain their existing presentation owner.
    const workspace = (screen.type === 'workspace' || screen.type === 'item-detail')
      && !activeEditorSession() && !workspaceRecoveryGate && !editorRecoveryGate && workspacePacket.ok;
    saveFeedback.classList.toggle('workspace-inline-feedback', workspace);
    if (workspace) {
      const main = elements.content.parentElement;
      if (saveFeedback.parentElement !== main || saveFeedback.nextElementSibling !== elements.content) main.insertBefore(saveFeedback, elements.content);
    } else if (saveFeedback.parentElement !== saveFeedbackHome) {
      saveFeedbackHome.insertBefore(saveFeedback, saveFeedbackHomeNext);
    }
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

  function writerStorage() {
    return forceWriteError ? { getItem: key => storage.getItem(key),
      setItem: () => { throw new Error('simulated-write-error'); },
      removeItem: () => { throw new Error('simulated-write-error'); } } : storage;
  }

  function storageActionsLocked() {
    return personalEntry.active() && (!personalEntry.visitActive?.() || personalEntry.readHostActive())
      || personalDisplayBlocked || workspaceTransactionPending || Boolean(workspaceRecoveryGate || editorRecoveryGate)
      || !workspacePacket.ok || editorHistoryConsuming || Boolean(activeEditorSession()) || authoringPropertyIsRecovering();
  }

  function invalidateWorkspaceCallbacks() {
    interruptContextualResult('workspace-gate');
    workspaceEpoch += 1;
    pendingRetry = null;
    elements.toast.hidden = true;
    window.clearTimeout(showToast.timer);
    cancelActiveMoveInteraction('', { restoreFocus: false });
    if (movePanelOpen()) closeMovePanel({ restoreFocus: false, announce: false });
  }

  function suspendWorkspaceDialog() {
    if (!elements.dialog.open) return;
    workspaceSuspendedDialog = { submit: dialogSubmit, focus: document.activeElement };
    elements.dialog.close();
  }

  function adoptWorkspace(packet) {
    if (!packet || !packet.ok) return false;
    workspacePacket = packet;
    envelope = packet.checkpoint;
    workspaceEpoch += 1;
    return true;
  }

  function enterWorkspaceGate(packet, details) {
    invalidateWorkspaceCallbacks();
    suspendWorkspaceDialog();
    workspaceRecoveryGate = Object.assign({ packet, status: 'blocked', reason: packet.reason || 'authority-stale',
      family: packet.journals ? packet.journals.currentFamily : 'unknown', expectedJournalRaw: null,
      message: '저장된 내용을 확인하지 못했습니다. 기존 값과 현재 입력은 보존했어요.' }, details || {});
    setSaveStatus(workspaceRecoveryGate.status === 'confirmed' ? '저장 완료 · 정리 확인 필요' : '저장 상태 확인 필요 · 변경 차단', 'error');
    render();
    focusAfterRender('[data-testid="workspace-storage-gate"] h1', '#main');
  }

  function workspaceWritable() {
    if (storageActionsLocked()) return false;
    if (personalDisplayBlocked) return false;
    const checked = S.sameAuthority(storage, workspacePacket);
    if (checked.ok) return true;
    enterWorkspaceGate(S.loadWorkspace(storage), { reason: checked.reason });
    return false;
  }

  function draftUnavailable() { return Boolean(personalEntryReturnConflicts.draft) || !['empty', 'restored'].includes(loadedDraft.status); }

  function featureWritable(kind, needsDraft) {
    if (!workspaceWritable()) return false;
    if (kind === 'draft' || needsDraft) {
      // A library-only change observed during lookup also invalidates the
      // retained author's storage ownership. Keep the promised return lock
      // across typing, helpers, draft deletion and creator-bound writes.
      if (personalEntryReturnConflicts.creator) {
        setSaveStatus('내 초안 보관함이 다른 화면에서 바뀌어 작성 초안 저장을 막았습니다. 현재 입력은 유지했어요.', 'error');
        return false;
      }
      const checked = M.loadAuthoringDraft(storage);
      if (!['empty', 'restored'].includes(checked.status)) loadedDraft = checked;
      if (draftUnavailable()) {
        setSaveStatus('작성 초안 보관 상태를 확인하지 못해 변경을 막았습니다. 현재 입력은 유지했어요.', 'error');
        return false;
      }
    }
    if (kind === 'creator') {
      const checked = M.loadCreatorDraftLibrary(storage);
      if (!['empty', 'restored'].includes(checked.status)) creatorDraftLibraryStatus = checked.status;
      if (creatorDraftBlocked()) { setSaveStatus('내 초안 보관함을 확인하지 못해 변경을 막았습니다.', 'error'); return false; }
    }
    if (kind === 'source') {
      const checked = M.loadSourceCandidateStore(storage);
      if (!['empty', 'restored'].includes(checked.status)) sourceCandidateStoreStatus = checked.status;
      if (sourceCandidateBlocked()) { setSaveStatus('원문 비교 저장소를 확인하지 못해 변경을 막았습니다.', 'error'); return false; }
    }
    return true;
  }

  function reloadFeatureStores(restoreDraft) {
    loadedDraft = M.loadAuthoringDraft(storage);
    loadedCreatorDrafts = M.loadCreatorDraftLibrary(storage);
    creatorDraftLibrary = loadedCreatorDrafts.library;
    creatorDraftLibraryStatus = loadedCreatorDrafts.status;
    loadedSourceCandidates = M.loadSourceCandidateStore(storage);
    if (loadedSourceCandidates.raw !== sourceCandidateRaw || loadedSourceCandidates.status !== sourceCandidateStoreStatus) personalPlanSourceEpoch += 1;
    sourceCandidateStore = loadedSourceCandidates.store;
    sourceCandidateRaw = loadedSourceCandidates.raw;
    sourceCandidateStoreStatus = loadedSourceCandidates.status;
    if (restoreDraft && !draftUnavailable()) {
      authoring = loadedDraft.status === 'restored' ? loadedDraft.authoring : freshAuthoring();
      authoringDraftStored = loadedDraft.status === 'restored';
      authoringSourceEpoch += 1;
    }
  }

  function checkFeatureStorage(kind) {
    if (!workspaceWritable()) return;
    if (kind === 'draft') {
      if (personalEntryReturnConflicts.draft) {
        if (personalEntryReturnConflicts.draft.recoveryRequired) {
          setSaveStatus('복구 결과를 확인하지 못했습니다. 현재 원문을 복사한 뒤 새로고침해 저장본을 확인해 주세요.', 'error'); return;
        }
        let same = false;
        try { same = storage.getItem(M.DRAFT_STORAGE_KEY) === personalEntryReturnConflicts.draft.expectedRaw; } catch (_) { /* keep conflict */ }
        if (!same) { setSaveStatus('보관된 초안과 현재 입력이 다릅니다. 두 내용을 보존하고 덮어쓰기를 계속 막습니다.', 'error'); return; }
        personalEntryReturnConflicts.draft = null;
      }
      const checked = M.loadAuthoringDraft(storage);
      if (checked.status === 'restored' && authoring.rawText && (checked.authoring.draftId !== authoring.draftId || checked.authoring.rawText !== authoring.rawText)) {
        loadedDraft = { status: 'drift', authoring: null };
        setSaveStatus('보관된 초안과 현재 입력이 달라 자동으로 바꾸지 않았어요. 현재 입력을 보존했습니다.', 'error');
      } else {
        loadedDraft = checked;
        if (!draftUnavailable()) {
          if (checked.status === 'restored') authoring = checked.authoring;
          authoringDraftStored = checked.status === 'restored';
          authoringSourceEpoch += 1;
          setSaveStatus('작성 초안 상태를 다시 읽었습니다. 저장소는 변경하지 않았어요.', 'noop');
        } else setSaveStatus('작성 초안 저장소를 아직 확인하지 못했습니다.', 'error');
      }
    } else if (kind === 'creator') {
      const checked = M.loadCreatorDraftLibrary(storage);
      if (['empty', 'restored'].includes(checked.status)) personalEntryReturnConflicts.creator = null;
      creatorDraftLibraryStatus = checked.status;
      if (!creatorDraftBlocked()) creatorDraftLibrary = checked.library;
    } else if (kind === 'source') {
      const checked = M.loadSourceCandidateStore(storage);
      if (checked.raw !== sourceCandidateRaw || checked.status !== sourceCandidateStoreStatus) personalPlanSourceEpoch += 1;
      sourceCandidateStoreStatus = checked.status;
      if (['empty', 'restored'].includes(checked.status)) { sourceCandidateStore = checked.store; sourceCandidateRaw = checked.raw; }
    } else return;
    render();
  }

  function resetRuntimeAfterStorage() {
    reloadFeatureStores(true);
    invalidateWorkspaceCallbacks();
    workspaceSuspendedDialog = null;
    planSession = null; itemSession = null; planDraft = null; itemDraft = null;
    planEditorPresentation = null; recoveredSourceEditor = null; personalDisplayCache = null; personalDisplayBlocked = false;
    itemReturn = null; itemEditorReturn = null; editorFeedback = null; editorFeedbackBySession = new Map();
    editorRecoveryJournalRaw = null; editorExpectedRaw = null; editorCommitCounted = false;
    sourceUpdateSession = null; sourceUpdateReturnFocus = null; sourcePracticeMemory = null; deferredSourceUpdateFlowIds = new Set();
    lastUndoLane = null; authoringStep = 'input'; creatorDraftQuery = ''; creatorDraftFilter = 'active';
    creatorDraftMenuId = null; creatorDraftRenameId = null; authoringResultView = 'txt';
    resultOccurrencePage = 1; authoringOccurrencePage = 1; authoringReviewOpen = false; authoringReceipt = null;
    authoringPropertyTarget = null; authoringPropertyReselection = null; authoringPropertyRecovery = null;
    authoringRejectedNativeRedo = null; authoringSourceMutationCount = 0; dismissedNearMisses = new Set();
    screen = { type: 'workspace', view: 'today', selectedFlowId: null };
    closeDialog();
  }

  function renderWorkspaceStorageGate() {
    const gate = workspaceRecoveryGate;
    const confirmed = gate.status === 'confirmed';
    const editableRecovery = gate.family === 'action' && ['prepared', 'confirmed'].includes(gate.status) && gate.expectedJournalRaw && !gate.foreign;
    const canOpen = gate.packet && gate.packet.ok && !gate.expectedJournalRaw && !activeEditorSession();
    return '<section class="plan-item-recovery-gate" data-testid="workspace-storage-gate" data-workspace-status="' + escapeHtml(gate.status) + '" data-recovery-family="' + escapeHtml(gate.family) + '"><h1 tabindex="-1">' + (confirmed ? '저장은 완료 · 정리 확인 필요' : '저장 상태를 먼저 확인해 주세요') + '</h1><p role="alert">' + escapeHtml(gate.message) + '</p><p>확인 전에는 기존 값과 현재 입력을 보존하고 다른 변경을 막습니다. 열기만으로 저장소를 바꾸지 않습니다.</p><div class="dialog-actions"><button class="button" type="button" data-action="workspace-check-storage">저장 상태 다시 확인</button>'
      + (editableRecovery ? '<button class="button primary" type="button" data-action="workspace-recover-storage">' + (confirmed ? '저장 완료 확인 · 정리' : '이전 상태 복구') + '</button>' : '')
      + (canOpen ? '<button class="button primary" type="button" data-action="workspace-open-verified">저장된 내용 확인해 열기</button>' : '') + '</div></section>';
  }

  function sameJournalAttempt(leftRaw, rightRaw) {
    if (leftRaw === rightRaw) return true;
    const left = S.decodeJournal(leftRaw);
    const right = S.decodeJournal(rightRaw);
    return Boolean(left && right && JSON.stringify(Object.assign({}, left, { phase: right.phase })) === rightRaw);
  }

  function checkWorkspaceStorage() {
    const previous = workspaceRecoveryGate;
    const packet = S.loadWorkspace(storage);
    if (!previous) { if (!packet.ok) routeWorkspaceRecovery(packet); return; }
    const actualRaw = packet.journals && packet.journals.currentRaw;
    const expectedRaw = previous.expectedJournalRaw;
    if (expectedRaw) {
      if (actualRaw && !sameJournalAttempt(expectedRaw, actualRaw)) {
        enterWorkspaceGate(packet, Object.assign({}, previous, { packet, status: 'blocked', foreign: true,
          message: '다른 복구 기록으로 바뀌어 처리를 막았습니다. 원래 복구 대상과 현재 입력을 보존했어요.' }));
        return;
      }
      const knownRaw = actualRaw || expectedRaw;
      const journal = S.decodeJournal(knownRaw);
      const inspected = actualRaw ? S.loadActionRecovery(storage) : null;
      enterWorkspaceGate(packet, Object.assign({}, previous, { packet, expectedJournalRaw: knownRaw,
        status: inspected && !inspected.ok ? 'blocked' : journal ? journal.phase : 'blocked',
        foreign: Boolean(inspected && !inspected.ok),
        message: inspected && !inspected.ok ? '복구 기록과 저장 값의 일치를 확인하지 못했습니다. 기존 값은 변경하지 않았어요.' : '상태를 다시 읽었습니다. 해당 복구 또는 정리 버튼을 눌러야 변경합니다.' }));
      return;
    }
    if (!packet.ok) routeWorkspaceRecovery(packet);
    else enterWorkspaceGate(packet, { message: '현재 저장 상태를 읽었습니다. 저장된 내용 확인해 열기를 누르면 검증한 상태로 열어요.' });
  }

  function routeWorkspaceRecovery(packet) {
    const journals = packet.journals;
    if (packet.reason === 'legacy-recovery-required' || (packet.reason === 'checkpoint-recovery-required' && journals.currentFamily === 'editor')) {
      editorRecoveryAdapter = packet.reason === 'legacy-recovery-required' ? legacyPlanItemSessions : planItemSessions;
      const recovered = editorRecoveryAdapter.loadRecovery(storage, editorRecoveryAdapter === legacyPlanItemSessions ? validLegacyEditorEnvelope : undefined);
      invalidateWorkspaceCallbacks();
      suspendWorkspaceDialog();
      workspaceRecoveryGate = null;
      editorRecoveryGate = recovered;
      editorRecoveryJournalRaw = recovered.journalRaw || null;
      setSaveStatus(recovered.status === 'confirmed' ? '이전 저장 완료 · 정리 확인 필요' : '미확정 저장 · 복구 확인 필요', 'error');
      render();
      return;
    }
    if (packet.reason === 'checkpoint-recovery-required' && journals.currentFamily === 'action') {
      const recovered = S.loadActionRecovery(storage);
      enterWorkspaceGate(packet, { family: 'action', status: recovered.status, foreign: !recovered.ok,
        expectedJournalRaw: recovered.journalRaw || journals.currentRaw,
        message: recovered.status === 'confirmed' ? '이전 변경 저장을 확인했습니다. 복구 기록 정리 전에는 다른 내용을 바꾸지 않습니다.' : '이전 변경이 끝났는지 확인하지 못했습니다. 먼저 이전 상태를 명시적으로 복구해 주세요.' });
      return;
    }
    enterWorkspaceGate(packet);
  }

  function resumeSuspendedDialog() {
    const suspended = workspaceSuspendedDialog;
    workspaceSuspendedDialog = null;
    if (!suspended || !suspended.submit || dialogSubmit !== suspended.submit || storageActionsLocked()) return false;
    elements.dialog.showModal();
    if (suspended.focus && suspended.focus.isConnected) suspended.focus.focus({ preventScroll: true });
    return true;
  }

  function recoverWorkspaceStorage() {
    const gate = workspaceRecoveryGate;
    if (!gate || gate.family !== 'action' || gate.foreign || !gate.expectedJournalRaw || workspaceTransactionPending) return;
    const journal = S.decodeJournal(gate.expectedJournalRaw);
    if (!journal) return;
    workspaceTransactionPending = true;
    const recovered = S.recoverAction(storage, { expectedJournalRaw: gate.expectedJournalRaw });
    workspaceTransactionPending = false;
    const packet = S.loadWorkspace(storage);
    if (!recovered.ok || !recovered.canResume || !packet.ok
      || (journal.operation === 'permanent-delete' && journal.phase === 'confirmed' && !recovered.deletionComplete)) {
      gate.message = '복구 또는 정리를 끝까지 확인하지 못했습니다. 기존 값과 입력을 보존하고 변경을 계속 막습니다.';
      checkWorkspaceStorage();
      return;
    }
    adoptWorkspace(packet);
    workspaceRecoveryGate = null;
    if (journal.phase === 'confirmed' && gate.deletionCountPending && recovered.deletionComplete) {
      successfulMutations += 1;
      gate.deletionCountPending = false;
    }
    reloadFeatureStores(journal.phase === 'confirmed' && ['reset', 'authoring-handoff'].includes(journal.operation));
    if (journal.phase === 'confirmed' && typeof gate.onSuccess === 'function') { const callback = gate.onSuccess; gate.onSuccess = null; callback(); }
    else if (journal.phase === 'confirmed' && journal.operation === 'reset') resetRuntimeAfterStorage();
    normalizeScreen();
    render();
    setSaveStatus(journal.phase === 'confirmed' ? '저장 완료 · 복구 기록 정리 확인' : '이전 상태를 복구했습니다. 입력은 유지했고 다시 저장하지 않았어요.', journal.phase === 'confirmed' ? 'saved' : 'noop');
    const resumedDialog = journal.phase === 'prepared' && resumeSuspendedDialog();
    if (journal.phase !== 'prepared') workspaceSuspendedDialog = null;
    if (!resumedDialog) focusAfterRender('#main');
  }

  function openVerifiedWorkspace() {
    const gate = workspaceRecoveryGate;
    if (!gate || gate.expectedJournalRaw || activeEditorSession()) return;
    const packet = S.loadWorkspace(storage);
    if (!packet.ok) { routeWorkspaceRecovery(packet); return; }
    adoptWorkspace(packet);
    workspaceRecoveryGate = null;
    workspaceSuspendedDialog = null;
    reloadFeatureStores(false);
    normalizeScreen();
    render();
    setSaveStatus('저장된 내용을 확인해 열었습니다. 저장소는 변경하지 않았어요.', 'noop');
  }

  function commitWorkspacePrepared(preparation, message, onSuccess, feedback, presentation) {
    if (!preparation.ok || !preparation.changed) {
      setSaveStatus(preparation.ok ? '이미 같은 상태예요.' : '변경을 준비하지 못했어요.', preparation.ok ? 'noop' : 'error');
      return false;
    }
    const entries = preparation.prepared.journal.entries;
    const afterRaw = entries.find(entry => entry.key === S.STORAGE_KEY).afterRaw;
    const finalCheckpoint = afterRaw === null ? C.fromLegacy(null).checkpoint : JSON.parse(afterRaw);
    const finalSource = entries.find(entry => entry.key === M.SOURCE_CANDIDATE_STORAGE_KEY);
    const displayCheck = finalSource ? preflightPersonalDisplay(finalCheckpoint, finalSource.afterRaw) : preflightPersonalDisplay(finalCheckpoint);
    if (!displayCheck.ok) return false;
    // A Plan result owns only its workspace Undo. Display validity does not
    // establish that the source observation still belongs to that result.
    if (presentation && presentation.kind === 'plan-result' && !presentation.isCurrent()) return false;
    workspaceTransactionPending = true;
    pendingRetry = null;
    setSaveStatus('저장 중…', 'saving');
    const outcome = S.commitPrepared(writerStorage(), preparation.prepared);
    workspaceTransactionPending = false;
    if (outcome.status === 'committed') {
      if (!outcome.requiresDeletionCleanup) successfulMutations += 1;
      lastUndoLane = preparation.prepared.journal.operation === 'reset' ? null : 'workspace';
      const cleaned = S.cleanupCommitted(storage, outcome.receipt);
      const packet = S.loadWorkspace(storage);
      if (cleaned.ok && cleaned.canResume && outcome.canResume && packet.ok
        && (!outcome.requiresDeletionCleanup || cleaned.deletionComplete)) {
        adoptWorkspace(packet);
        if (outcome.requiresDeletionCleanup) successfulMutations += 1;
        if (typeof onSuccess === 'function') onSuccess();
        settleContextualChange(feedback, true);
        setSaveStatus(successfulStorageStatus(), 'saved');
        if (!feedback && !(presentation && presentation.kind === 'plan-result')) showToast(message, envelope.undo !== null);
        normalizeScreen();
        render();
        return true;
      }
      enterWorkspaceGate(packet, { family: 'action', status: 'confirmed', expectedJournalRaw: outcome.journalRaw, onSuccess,
        deletionCountPending: Boolean(outcome.requiresDeletionCleanup),
        message: outcome.requiresDeletionCleanup ? '저장 단계는 확인했습니다. 삭제 전 정보가 복구 기록에 남을 수 있어 정리 확인 전에는 영구 삭제 완료로 처리하지 않습니다.' : '변경 저장은 확인했습니다. 정리와 저장 권위를 확인할 때까지 다른 변경을 막습니다.' });
      return false;
    }
    if (outcome.journalRaw || outcome.status === 'recovery-required' || outcome.status === 'commit-uncertain') {
      enterWorkspaceGate(S.loadWorkspace(storage), { family: 'action', status: outcome.status === 'commit-uncertain' ? 'blocked' : 'prepared',
        expectedJournalRaw: outcome.journalRaw || preparation.prepared.raw, onSuccess,
        message: '저장 상태를 확인하지 못했습니다. 현재 입력을 보존했습니다. 복구 확인 전에는 성공으로 처리하지 않습니다.' });
    } else {
      const checked = S.sameAuthority(storage, workspacePacket);
      if (!checked.ok) enterWorkspaceGate(S.loadWorkspace(storage), { reason: checked.reason });
      else {
        setSaveStatus('쓰기를 시작하지 못했습니다. 현재 입력은 유지했어요.', 'error');
        if (!(presentation && presentation.kind === 'plan-result')) showToast('저장 전 확인에 실패했습니다. 입력을 확인한 뒤 다시 저장해 주세요.', false, null, 'error');
      }
    }
    return false;
  }

  function writeCandidate(candidate, message, onSuccess, operation, expectedDraftRaw, feedback, presentation) {
    if (!workspaceWritable()) return false;
    if (!preflightPersonalDisplay(candidate).ok) return false;
    const options = { operation: operation || 'workspace', operationId: 'workspace-' + Date.now().toString(36) + '-' + (++workspaceOperationSequence) };
    if (options.operation === 'authoring-handoff') options.expectedDraftRaw = expectedDraftRaw;
    return commitWorkspacePrepared(S.prepareWrite(workspacePacket, candidate, options), message, onSuccess, feedback, presentation);
  }

  function persistAuthoringDraft() {
    if (!featureWritable('draft')) return false;
    const retryDraftId = authoring.draftId;
    const retrySourceEpoch = authoringSourceEpoch;
    const retryWorkspaceEpoch = workspaceEpoch;
    setSaveStatus('작성 초안 저장 중…', 'saving');
    try {
      if (forceWriteError) throw new Error('simulated-write-error');
      M.writeAuthoringDraft(storage, authoring);
    } catch (error) {
      setSaveStatus('작성 초안을 저장하지 못했어요.', 'error');
      showToast('작성 초안을 저장하지 못했어요. 현재 입력은 유지했습니다.', false, () => {
        if (authoring.draftId === retryDraftId && authoringSourceEpoch === retrySourceEpoch && workspaceEpoch === retryWorkspaceEpoch) persistAuthoringDraft();
      }, 'error');
      return false;
    }
    authoringDraftStored = true;
    loadedDraft = { status: 'restored', authoring };
    setSaveStatus(successfulStorageStatus('작성 초안 저장됨'), 'saved');
    return true;
  }

  function discardAuthoringDraft() {
    if (!featureWritable('draft')) return false;
    const retryDraftId = authoring.draftId;
    const retrySourceEpoch = authoringSourceEpoch;
    if (!authoringDraftStored) return true;
    try {
      M.clearAuthoringDraft(storage);
      authoringDraftStored = false;
      loadedDraft = { status: 'empty', authoring: null };
      return true;
    } catch (error) {
      setSaveStatus('작성 초안을 지우지 못했어요.', 'error');
      showToast('작성 초안을 지우지 못했어요. 현재 입력은 유지했습니다.', false, () => {
        if (authoring.draftId === retryDraftId && authoringSourceEpoch === retrySourceEpoch) discardAuthoringDraft();
      }, 'error');
      return false;
    }
  }

  function newCreatorDraftId() {
    return 'creator-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1679616).toString(36);
  }

  function creatorDraftBlocked() {
    return Boolean(personalEntryReturnConflicts.creator) || creatorDraftLibraryStatus === 'corrupt' || creatorDraftLibraryStatus === 'read-error' || creatorDraftLibraryStatus === 'drift';
  }

  function currentCreatorDraft() {
    return authoring.creatorDraftId ? M.creatorDraftById(creatorDraftLibrary, authoring.creatorDraftId) : null;
  }

  function creatorDraftTime(value) {
    const text = String(value || '');
    return text.length >= 16 ? text.slice(0, 10) + ' ' + text.slice(11, 16) : text;
  }

  function creatorDraftAuthoringFor(candidate, affectedId) {
    if (!affectedId || authoring.creatorDraftId !== affectedId) return null;
    const next = copyScreen(authoring);
    const record = M.creatorDraftById(candidate, affectedId);
    if (!record || record.status !== 'active') {
      next.creatorDraftId = null;
      next.creatorDraftRevision = null;
    } else {
      next.creatorDraftRevision = record.recordRevision;
    }
    return next;
  }

  function writeCreatorDraftCandidate(result, options) {
    const settings = options || {};
    const nextAuthoring = settings.authoring || creatorDraftAuthoringFor(result.library, result.draftId);
    if (!featureWritable('creator', Boolean(nextAuthoring))) return false;
    const retryEpoch = workspaceEpoch;
    const retryDraftId = authoring.draftId;
    const retrySourceEpoch = authoringSourceEpoch;
    const retryLibrary = creatorDraftLibrary;
    setSaveStatus('초안 저장 중…', 'saving');
    try {
      if (forceWriteError) throw new Error('simulated-write-error');
      if (nextAuthoring) M.writeCreatorDraftCommit(storage, result.library, nextAuthoring);
      else M.writeCreatorDraftLibrary(storage, result.library);
    } catch (error) {
      setSaveStatus('초안을 저장하지 못했어요.', 'error');
      showToast('초안을 저장하지 못했어요. 현재 입력은 유지했습니다.', false, () => {
        if (workspaceEpoch !== retryEpoch || authoring.draftId !== retryDraftId || authoringSourceEpoch !== retrySourceEpoch || creatorDraftLibrary !== retryLibrary) return;
        writeCreatorDraftCandidate(result, settings);
      }, 'error');
      return false;
    }
    creatorDraftLibrary = result.library;
    creatorDraftLibraryStatus = 'restored';
    if (nextAuthoring) {
      authoring = nextAuthoring;
      authoringDraftStored = true;
      loadedDraft = { status: 'restored', authoring };
    }
    successfulMutations += 1;
    lastUndoLane = 'creator-drafts';
    creatorDraftMenuId = null;
    creatorDraftRenameId = null;
    setSaveStatus(successfulStorageStatus('초안 저장됨'), 'saved');
    showToast(result.message, creatorDraftLibrary.undo !== null);
    render();
    if (settings.focusSelector) focusAfterRender(settings.focusSelector, '#creator-drafts-heading');
    return true;
  }

  function transitionCreatorDraft(action, options) {
    if (!workspaceWritable()) return false;
    if (creatorDraftBlocked()) {
      setSaveStatus('초안 보관함 손상 · 변경 없음', 'error');
      showToast('손상된 초안 보관함을 덮어쓰지 않았어요.', false, null, 'error');
      return false;
    }
    const result = M.transitionCreatorDraftLibrary(creatorDraftLibrary, action);
    if (!result.changed) {
      setSaveStatus(result.error ? '초안을 변경하지 못했어요.' : '이미 같은 상태예요.', result.error ? 'error' : 'noop');
      showToast(result.message, false, null, result.error ? 'error' : 'status');
      return false;
    }
    return writeCreatorDraftCandidate(result, options);
  }

  function saveCreatorDraft() {
    if (!featureWritable('creator', true)) return false;
    if (creatorDraftBlocked()) return transitionCreatorDraft({ type: 'save' });
    const existing = currentCreatorDraft();
    const draftId = existing ? existing.draftId : newCreatorDraftId();
    const result = M.transitionCreatorDraftLibrary(creatorDraftLibrary, {
      type: 'save',
      draftId,
      expectedRevision: existing ? authoring.creatorDraftRevision : null,
      rawText: authoring.rawText,
      templateId: authoring.templateId,
      now: new Date().toISOString()
    });
    if (!result.changed) {
      setSaveStatus(result.error ? '초안을 저장하지 못했어요.' : '이미 같은 초안이에요.', result.error ? 'error' : 'noop');
      showToast(result.message, false, null, result.error ? 'error' : 'status');
      return false;
    }
    const saved = M.creatorDraftById(result.library, result.draftId);
    const nextAuthoring = Object.assign({}, authoring, { creatorDraftId: saved.draftId, creatorDraftRevision: saved.recordRevision });
    return writeCreatorDraftCandidate(result, { authoring: nextAuthoring, focusSelector: '#save-creator-draft' });
  }

  function openCreatorDraft(id) {
    if (!featureWritable('creator', true)) return;
    if (creatorDraftBlocked()) return;
    const draft = M.creatorDraftById(creatorDraftLibrary, id);
    if (!draft || draft.status !== 'active') {
      setSaveStatus('초안을 열지 못했어요.', 'error');
      showToast('작성 중 목록에서 초안을 다시 확인해 주세요.', false, null, 'error');
      return;
    }
    const replacing = authoring.rawText.trim() && (authoring.creatorDraftId !== id || authoring.rawText !== draft.rawText);
    if (replacing && !window.confirm('현재 작성 중 초안을 내 초안의 내용으로 바꿀까요?')) {
      setSaveStatus('초안 열기를 취소했어요 · 변경 없음', 'noop');
      return;
    }
    const before = authoring;
    const beforeSourceEpoch = authoringSourceEpoch;
    const next = {
      draftId: 'working-' + draft.draftId,
      rawText: draft.rawText,
      templateId: draft.templateId,
      templatePickerOpen: false,
      sourceConfirmed: false,
      folderId: authoring.folderId || null,
      creatorDraftId: draft.draftId,
      creatorDraftRevision: draft.recordRevision
    };
    try {
      if (forceWriteError) throw new Error('simulated-write-error');
      M.writeAuthoringDraft(storage, next);
    } catch (error) {
      authoring = before;
      setSaveStatus('초안을 열지 못했어요.', 'error');
      showToast('초안을 열지 못했어요. 현재 작성 내용은 유지했습니다.', false, () => {
        if (authoring === before && authoringSourceEpoch === beforeSourceEpoch) openCreatorDraft(id);
      }, 'error');
      return;
    }
    authoring = next;
    authoringDraftStored = true;
    loadedDraft = { status: 'restored', authoring };
    authoringStep = 'input';
    authoringResultView = 'txt';
    authoringOccurrencePage = 1;
    authoringReviewOpen = false;
    authoringPropertyTarget = null;
    dismissedNearMisses = new Set();
    creatorDraftMenuId = null;
    creatorDraftRenameId = null;
    setSaveStatus(successfulStorageStatus('초안을 열었어요'), 'saved');
    render();
    focusAfterRender('#flow-editor', '.authoring-head h1');
  }

  function transition(action, options) {
    if (!workspaceWritable()) return false;
    const result = C.transitionCheckpoint(workspacePacket.checkpoint, action, options);
    if (!result.changed) {
      setSaveStatus(!result.ok ? '변경하지 못했어요.' : '이미 같은 상태예요.', !result.ok ? 'error' : 'noop');
      showToast(result.message || (!result.ok ? '변경 조건을 확인하지 못해 저장하지 않았어요.' : '이미 같은 상태예요.'), false, null, !result.ok ? 'error' : 'status');
      return false;
    }
    const contextual = contextualIntent(action, workspacePacket.checkpoint.state, result.checkpoint.state, result.message);
    let feedback = null;
    if (contextual) {
      const facts = contextualFacts();
      if (!facts.authorityReady) {
        enterWorkspaceGate(S.loadWorkspace(storage), { reason: 'storage-unverified' });
        return false;
      }
      const begun = F.beginAttempt(contextualOwner, contextual.intent, facts);
      if (begun.ok) {
        contextualOwner = begun.state;
        elements.toast.hidden = true; window.clearTimeout(showToast.timer); pendingRetry = null;
        feedback = { ticket: begun.ticket, anchor: contextual.anchor, undo: false };
      }
    } else interruptContextualResult('other-workspace-change');
    const changed = writeCandidate(result.checkpoint, result.message, null, undefined, undefined, feedback);
    if (!changed && feedback) settleContextualChange(feedback, false);
    return changed;
  }

  function sourceCandidateBlocked() {
    return !M.sourceUpdateRuntimeReady()
      || !sourceCandidateStore
      || sourceCandidateStoreStatus === 'corrupt'
      || sourceCandidateStoreStatus === 'read-error'
      || sourceCandidateStoreStatus === 'unavailable';
  }

  function sourceCandidatePreview(flow) {
    if (!flow || flow.origin !== 'authoring-handoff' || sourceCandidateBlocked()) return null;
    const working = sourcePracticeMemory ? sourcePracticeMemory.store : sourceCandidateStore;
    const context = M.readLocalSourcePracticeContext(working, envelope.state, flow.id);
    if (!context.ok) return null;
    return Object.assign({}, context, { store: working, observationStale: Boolean(sourcePracticeMemory
      && (sourcePracticeMemory.baseRaw !== sourceCandidateRaw || sourcePracticeMemory.baseEpoch !== readPersonalSourceEpoch())) });
  }

  function rebaseSourcePracticeMemory() {
    const merged = sourcePracticeMemory
      ? M.mergeLocalSourcePracticeStore(sourceCandidateStore, sourcePracticeMemory.store, sourcePracticeMemory.baseStore)
      : { ok: true, store: sourceCandidateStore };
    if (!merged.ok) return merged;
    sourcePracticeMemory = { store: merged.store, baseStore: sourceCandidateStore, baseRaw: sourceCandidateRaw, baseEpoch: readPersonalSourceEpoch() };
    return merged;
  }

  function startLocalSourcePractice(flow, opener, refreshing) {
    if (!flow || !workspaceWritable() || activeEditorSession() || moveTarget || sourceCandidateBlocked()) return false;
    if (sourceUpdateSession && !refreshing) return false;
    refreshPersonalDisplaySource();
    if (sourceCandidateBlocked()) return false;
    const previousMemory = sourcePracticeMemory;
    const rebased = rebaseSourcePracticeMemory();
    const prepared = rebased.ok ? M.prepareLocalSourceCandidateReview(rebased.store, envelope.state, flow.id) : rebased;
    if (!prepared.ok) {
      sourcePracticeMemory = previousMemory;
      setSaveStatus('현재 비교와 선택을 유지했습니다. 새 연습을 시작하지 못했어요.', 'error');
      if (sourceUpdateSession) { sourceUpdateSession.status = 'stale'; sourceUpdateSession.error = prepared.reason; render(); }
      return false;
    }
    sourcePracticeMemory.store = prepared.store;
    if (elements.dialog.open) closeDialog({ restoreFocus: false });
    sourceUpdateSession = null;
    openSourceUpdateReview(flow, opener, prepared.candidate.candidateId);
    return true;
  }

  function openSourceUpdateReview(flow, opener, candidateId) {
    if (!workspaceWritable() || sourceCandidateBlocked() || activeEditorSession() || moveTarget) return;
    refreshPersonalDisplaySource();
    if (sourceCandidateBlocked()) return;
    const preview = sourceCandidatePreview(flow);
    const id = candidateId || (preview && preview.catalog.candidates.length === 1 ? preview.catalog.candidates[0].candidateId : null);
    const record = preview && preview.catalog.candidates.find(entry => entry.candidateId === id);
    if (!record) {
      setSaveStatus('원문 비교를 열지 못했어요 · 변경 없음', 'error');
      showToast('이어갈 비교 기록을 먼저 선택해 주세요.', false, null, 'error');
      return;
    }
    if (!sourcePracticeMemory) rebaseSourcePracticeMemory();
    const prepared = preview.observationStale
      ? { ok: true, code: 'stale-source', store: preview.store, candidate: preview.store.envelopes[id], current: preview.current }
      : M.resumeLocalSourceCandidateReview(preview.store, envelope.state, flow.id, id, new Date().toISOString());
    if (!prepared.ok) { setSaveStatus('비교 기록을 안전하게 열지 못했어요. 현재 선택은 유지했습니다.', 'error'); return; }
    sourcePracticeMemory.store = prepared.store;
    const openingSourceRaw = sourcePracticeMemory.baseRaw, openingSourceEpoch = sourcePracticeMemory.baseEpoch;
    const review = prepared.store.reviews[prepared.candidate.candidateId];
    if (review && review.status === 'applied') {
      setSaveStatus('이미 적용한 원문이에요.', 'noop');
      return;
    }
    const unresolved = prepared.candidate.changes.find(change => !review || review.resolutions[change.changeId] === undefined);
    sourceUpdateSession = {
      flowId: flow.id,
      candidateId: prepared.candidate.candidateId,
      candidate: prepared.candidate,
      current: prepared.current,
      workingStore: prepared.store,
      openingSourceRaw,
      openingSourceEpoch,
      sourceObservationStale: Boolean(preview.observationStale),
      selectedChangeId: (unresolved || prepared.candidate.changes[0]).changeId,
      status: prepared.code === 'stale-source' ? 'stale' : 'comparing',
      error: null
    };
    sourceUpdateReturnFocus = opener || document.activeElement;
    sourceUpdateValueView = 'mine';
    deferredSourceUpdateFlowIds.delete(flow.id);
    setSaveStatus('로컬 비교 연습 · 적용 전 선택은 이 실행 중에만 유지됩니다.', 'noop');
    render();
    focusAfterRender('[data-source-update-choice="later"]', '[data-action="close-source-update-review"]', true);
  }

  function closeSourceUpdateReview(options) {
    const settings = Object.assign({ deferred: true, restoreFocus: true, announce: true }, options || {});
    const session = sourceUpdateSession;
    const returnFocus = sourceUpdateReturnFocus;
    if (session && settings.deferred) {
      const deferred = M.deferLocalSourceCandidate(session.workingStore, session.candidateId, new Date().toISOString());
      if (sourcePracticeMemory) sourcePracticeMemory.store = deferred.store;
      deferredSourceUpdateFlowIds.add(session.flowId);
    }
    sourceUpdateSession = null;
    sourceUpdateReturnFocus = null;
    sourceUpdateValueView = 'mine';
    if (settings.announce) setSaveStatus('나중에 확인할게요 · 저장된 내용은 그대로예요', 'noop');
    render();
    const returnScreenKey = resultScreenKey();
    if (settings.restoreFocus) window.setTimeout(() => {
      if (sourceUpdateSession || activeEditorSession() || returnScreenKey !== resultScreenKey()) return;
      if (returnFocus && returnFocus.isConnected && returnFocus.getClientRects().length) returnFocus.focus({ preventScroll: true });
      else {
        const opener = Array.from(document.querySelectorAll('[data-action="open-source-update-review"]')).find(control => session
          && control.dataset.flowId === session.flowId && control.dataset.candidateId === session.candidateId)
          || Array.from(document.querySelectorAll('[data-action="open-guide"]')).find(control => control.getClientRects().length);
        if (opener) opener.focus({ preventScroll: true });
      }
    }, 0);
  }

  function checkSourceUpdateObservation(session) {
    const epoch = readPersonalSourceEpoch(), current = readCurrentPersonalSource();
    if (session.sourceObservationStale || epoch !== session.openingSourceEpoch || epoch !== readPersonalSourceEpoch()
      || current.ok && current.raw !== session.openingSourceRaw) {
      session.sourceObservationStale = true;
      return { ok: false, reason: 'stale-source' };
    }
    return current.ok ? { ok: true } : { ok: false, reason: 'source-read-error' };
  }
  function rejectSourceUpdateObservation(session, reason) {
    session.status = reason === 'stale-source' ? 'stale' : 'failed'; session.error = reason;
    setSaveStatus(reason === 'stale-source' ? '비교를 시작한 뒤 원문 저장 상태가 달라졌어요 · 변경 없음' : '원문 저장 상태를 읽지 못했어요 · 변경 없음', 'error');
    render(); focusAfterRender(reason === 'stale-source' ? '[data-action="refresh-source-update-review"]' : '[data-action="source-update-apply"]');
    return false;
  }
  function applySourceUpdate() {
    if (!sourceUpdateSession || !featureWritable('source')) return false;
    let observation = checkSourceUpdateObservation(sourceUpdateSession);
    if (!observation.ok) return rejectSourceUpdateObservation(sourceUpdateSession, observation.reason);
    sourceUpdateSession.status = 'applying';
    sourceUpdateSession.error = null;
    setSaveStatus('새 원문 적용 중…', 'saving');
    render();
    observation = checkSourceUpdateObservation(sourceUpdateSession);
    if (!observation.ok) return rejectSourceUpdateObservation(sourceUpdateSession, observation.reason);
    const result = M.applyLocalSourceCandidate(
      sourceUpdateSession.workingStore,
      envelope.state,
      sourceUpdateSession.flowId,
      sourceUpdateSession.candidateId,
      new Date().toISOString()
    );
    if (!result.changed) {
      sourceUpdateSession.status = result.code === 'stale-source' ? 'stale' : 'failed';
      sourceUpdateSession.error = result.code;
      setSaveStatus(result.code === 'stale-source' ? '현재 원문이 달라졌어요 · 변경 없음' : '적용할 수 없어요 · 변경 없음', 'error');
      render();
      focusAfterRender('[data-action="refresh-source-update-review"]', '[data-action="source-update-apply"]');
      return false;
    }
    if (!preflightPersonalDisplay(workspacePacket.checkpoint, JSON.stringify(result.store)).ok) {
      sourceUpdateSession.status = 'failed'; sourceUpdateSession.error = 'personal-plan-display-unavailable';
      render(); focusAfterRender('[data-action="source-update-apply"]'); return false;
    }
    observation = checkSourceUpdateObservation(sourceUpdateSession);
    if (!observation.ok) return rejectSourceUpdateObservation(sourceUpdateSession, observation.reason);
    try {
      if (forceWriteError) throw new Error('simulated-write-error');
      const bytes = M.writeSourceCandidateStore(storage, result.store, sourceUpdateSession.openingSourceRaw);
      sourceCandidateStore = result.store;
      sourceCandidateRaw = bytes;
      sourceCandidateStoreStatus = 'restored';
      personalPlanSourceEpoch += 1;
      sourcePracticeMemory = { store: result.store, baseStore: result.store, baseRaw: bytes, baseEpoch: readPersonalSourceEpoch() };
    } catch (error) {
      sourceUpdateSession.status = error && error.code === 'source-candidate-stale-write' ? 'stale' : 'failed';
      sourceUpdateSession.error = error && error.code ? error.code : 'save-error';
      setSaveStatus(sourceUpdateSession.status === 'stale' ? '저장 상태가 달라졌어요 · 변경 없음' : '새 원문 저장 실패 · 변경 없음', 'error');
      render();
      focusAfterRender(sourceUpdateSession.status === 'stale' ? '[data-action="refresh-source-update-review"]' : '[data-action="source-update-apply"]');
      return false;
    }
    const flowId = sourceUpdateSession.flowId;
    sourceUpdateSession = null;
    sourceUpdateReturnFocus = null;
    successfulMutations += 1;
    lastUndoLane = 'source-update';
    setSaveStatus(successfulStorageStatus('연습용 원문 변경을 이 사본에 적용했어요'), 'saved');
    showToast('로컬 비교에서 선택한 변경을 적용했어요.', true);
    render();
    focusAfterRender('[data-action="source-update-undo"][data-flow-id="' + flowId.replace(/"/g, '\\"') + '"]', '[data-action="open-plan-editor"]');
    return true;
  }

  function undoSourceUpdate() {
    if (!featureWritable('source')) return false;
    const beforeStore = sourceCandidateStore;
    const beforeRaw = sourceCandidateRaw;
    if (sourceCandidateBlocked() || !sourceCandidateStore.undo) {
      showToast('되돌릴 원문 변경이 없어요.', false);
      return false;
    }
    const result = M.undoLocalSourceCandidate(sourceCandidateStore, new Date().toISOString());
    if (!result.changed) {
      setSaveStatus('원문 변경을 되돌리지 못했어요.', 'error');
      showToast('원문 변경을 되돌리지 못했어요. 현재 내용은 그대로예요.', false, null, 'error');
      return false;
    }
    if (!preflightPersonalDisplay(workspacePacket.checkpoint, JSON.stringify(result.store)).ok) return false;
    setSaveStatus('원문 변경 되돌리는 중…', 'saving');
    try {
      if (forceWriteError) throw new Error('simulated-write-error');
      const bytes = M.writeSourceCandidateStore(storage, result.store, sourceCandidateRaw);
      sourceCandidateStore = result.store;
      sourceCandidateRaw = bytes;
      sourceCandidateStoreStatus = 'restored';
      personalPlanSourceEpoch += 1;
      rebaseSourcePracticeMemory();
    } catch (error) {
      setSaveStatus('원문 Undo 실패 · 변경 없음', 'error');
      showToast('원문 변경을 되돌리지 못했어요.', false, () => {
        if (sourceCandidateStore === beforeStore && sourceCandidateRaw === beforeRaw) undoSourceUpdate();
      }, 'error');
      return false;
    }
    successfulMutations += 1;
    lastUndoLane = null;
    setSaveStatus(successfulStorageStatus('이전 원문으로 되돌렸어요'), 'saved');
    showToast('적용 전 원문으로 되돌렸어요.', false);
    render();
    focusAfterRender('[data-action="open-source-update-review"]', '[data-action="open-plan-editor"]');
    return true;
  }

  function refreshSourceUpdateReview() {
    if (!sourceUpdateSession || !workspaceWritable()) return;
    const flowId = sourceUpdateSession.flowId;
    const opener = sourceUpdateReturnFocus;
    const loadedCandidates = M.loadSourceCandidateStore(storage);
    if (loadedCandidates.raw !== sourceCandidateRaw || loadedCandidates.status !== sourceCandidateStoreStatus) personalPlanSourceEpoch += 1;
    sourceCandidateStore = loadedCandidates.store;
    sourceCandidateRaw = loadedCandidates.raw;
    sourceCandidateStoreStatus = loadedCandidates.status;
    const flow = envelope.state.flows.find(entry => entry.id === flowId);
    if (!flow || sourceCandidateBlocked()) {
      setSaveStatus('현재 원문 비교를 다시 만들지 못했어요.', 'error');
      render();
      return;
    }
    startLocalSourcePractice(flow, opener, true);
  }

  function undo() {
    if (!workspaceWritable()) return;
    const sourceUndoAvailable = !sourceCandidateBlocked() && Boolean(sourceCandidateStore.undo);
    const selectedFlow = screen.selectedFlowId ? envelope.state.flows.find(flow => flow.id === screen.selectedFlowId) : null;
    const preferSource = sourceUndoAvailable && (lastUndoLane === 'source-update' || (!envelope.undo && !creatorDraftLibrary.undo) || (selectedFlow && sourceCandidateStore.undo.flowRef === selectedFlow.ref));
    if (preferSource) {
      undoSourceUpdate();
      return;
    }
    const preferCreator = !creatorDraftBlocked() && creatorDraftLibrary.undo !== null && (lastUndoLane === 'creator-drafts' || (screen.type === 'authoring' && (authoringStep === 'drafts' || Boolean(authoring.creatorDraftId))));
    if (preferCreator) {
      const result = M.transitionCreatorDraftLibrary(creatorDraftLibrary, { type: 'undo' });
      if (!result.changed) { showToast(result.message, false); return; }
      const nextAuthoring = authoring.creatorDraftId ? creatorDraftAuthoringFor(result.library, authoring.creatorDraftId) : null;
      writeCreatorDraftCandidate(result, { authoring: nextAuthoring, focusSelector: authoringStep === 'drafts' ? '#creator-drafts-heading' : '#save-creator-draft' });
      return;
    }
    const selectedResult = F.selectResult(contextualOwner, contextualFacts());
    if (selectedResult.canUndo && selectedResult.result) { undoContextualResult(selectedResult.result.ownerId); return; }
    const result = C.undoCheckpoint(workspacePacket.checkpoint);
    if (!result.changed) { showToast(result.message, false); return; }
    writeCandidate(result.checkpoint, result.message, null, 'undo');
  }

  function normalizeScreen() {
    if (!personalDisplayPacket().ok) return;
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
    ].map(([id, label]) => {
      const projection = timelineProjection(id);
      const count = projection.ok ? projection.groups.reduce((total, group) => total + group.ids.length, 0) : '—';
      return '<button class="side-link" type="button" data-action="set-view" data-view="' + id + '"' + (currentView === id ? ' aria-current="page"' : '') + '><span class="side-title">' + label + '</span><span class="count">' + count + '</span></button>';
    }).join('');
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
      '<section class="side-section"><div class="side-head"><strong>관리</strong></div><div class="side-list">' + trash + '<button class="side-link source-practice-guide-entry" type="button" data-action="open-guide"><span class="side-title">사용 안내</span></button></div></section>';
  }

  function renderTask(task, context, index, total, hideDate, describedById) {
    const parentFlow = task.flowId ? flowById(task.flowId) : null;
    const folder = folderTitle(flowFolder(task));
    const doneLabel = task.done ? '다시 열기' : '완료';
    const orderHelpId = describedById || taskOrderHelpId(context);
    const dateMeta = hideDate ? '' : '<span>' + escapeHtml(dateLabel(task.date)) + (task.time ? ' · ' + escapeHtml(task.time) : '') + '</span>';
    const timeMeta = hideDate && task.time ? '<span>' + escapeHtml(task.time) + '</span>' : '';
    const moveExpanded = Boolean(moveTarget && moveTarget.kind === 'task' && moveTarget.id === task.id);
    const orderGroup = isTimelineContext(context) ? timelineGroup(context, task.id) : null;
    const orderBlocked = isTimelineContext(context) && (!orderGroup || orderGroup.blocked);
    return '<article class="task-row' + (task.done ? ' done' : '') + '" tabindex="0" data-task-id="' + escapeHtml(task.id) + '" data-task-date="' + escapeHtml(task.date || '') + '" data-context="' + escapeHtml(context) + '">' +
      '<button class="check" type="button" aria-pressed="' + task.done + '" data-action="toggle-complete" data-id="' + escapeHtml(task.id) + '" aria-label="' + escapeHtml(task.title + ' ' + doneLabel) + '">' + (task.done ? '✓' : '') + '</button>' +
      '<div class="task-copy"><button class="task-title task-title-button" type="button" data-action="open-item-detail" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '" data-return-focus="item-' + escapeHtml(task.id) + '">' + escapeHtml(task.title) + '</button><div class="task-meta">' + dateMeta + timeMeta + '<span>' + escapeHtml(parentFlow ? flowDisplayTitle(parentFlow) : '빠른 할 일') + '</span><span>' + escapeHtml(folder) + '</span></div></div>' +
      '<button class="drag-handle" type="button" draggable="true" data-move-kind="task" data-move-source="handle" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '" aria-label="' + escapeHtml(task.title + ' 이동할 곳 열기 또는 끌어서 이동') + '" aria-describedby="' + escapeHtml(orderHelpId) + '" aria-controls="move-panel" aria-expanded="' + moveExpanded + '" title="짧게 누르기 · 350ms 길게 누르기 · 끌어서 이동"><span aria-hidden="true">⠿</span></button>' +
      '<div class="row-actions"><button type="button" data-action="move-up" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '"' + (index === 0 || orderBlocked ? ' disabled' : '') + ' aria-label="위로 이동">↑</button><button type="button" data-action="move-down" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '"' + (index === total - 1 || orderBlocked ? ' disabled' : '') + ' aria-label="아래로 이동">↓</button><button type="button" data-action="task-menu" data-move-kind="task" data-move-source="more" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '" aria-controls="move-panel" aria-expanded="' + moveExpanded + '" aria-label="' + escapeHtml(task.title + ' 이동할 곳 열기') + '">•••</button></div>' +
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

  function emptyTimelineGroup(date) {
    return { context: 'date', contextKey: date, ids: [], defaultIds: [], manualOrder: false, orderMode: 'default-time', blocked: false };
  }

  function renderTimelineGroup(group, allowAdd) {
    const token = group.context + ':' + group.contextKey;
    rememberTimelineTicket(group);
    const headingId = 'period-group-' + token.replace(/[^a-zA-Z0-9_-]/g, '-');
    const heading = group.context === 'date' ? periodDateHeading(group.contextKey) : group.label || contextLabel(token);
    const mode = group.blocked ? '이전 순서 확인 필요' : group.manualOrder ? '직접 정렬' : '시간순';
    const reset = group.manualOrder && !group.blocked
      ? '<button class="button timeline-order-reset" type="button" data-action="timeline-reset" data-context="' + escapeHtml(token) + '">시간순으로 되돌리기</button>' : '';
    const add = allowAdd && group.context === 'date'
      ? '<button class="month-date-add" type="button" data-action="add-quick" data-date="' + escapeHtml(group.contextKey) + '" aria-label="' + escapeHtml(group.contextKey + '에 빠른 할 일 추가') + '"><span aria-hidden="true">+</span><span>할 일 추가</span></button>' : '';
    const warning = group.blocked ? '<p class="timeline-order-warning" role="status">이전 화면에 저장된 순서가 서로 달라 시간순으로 임시 표시합니다. 기존 기록은 보존했고, 이 목록의 순서 변경은 잠겨 있어요.</p>' : '';
    return '<section class="period-day" data-period-date="' + escapeHtml(group.context === 'date' ? group.contextKey : '') + '" data-timeline-context="' + escapeHtml(token) + '" data-order-mode="' + escapeHtml(group.orderMode) + '" data-order-blocked="' + group.blocked + '" aria-labelledby="' + headingId + '"><div class="period-date-head"><h2 id="' + headingId + '">' + escapeHtml(heading) + '</h2><div class="timeline-group-actions"><span class="timeline-order-label">' + mode + '</span>' + reset + add + '</div></div>' + warning + (group.ids.length ? renderTaskList(group.ids, token, group.context === 'date') : '<div class="period-day-empty">할 일 없음</div>') + '</section>';
  }

  function renderMonthTaskGroups(projection) {
    const byDate = new Map(projection.groups.map(group => [group.contextKey, group]));
    const dates = showEmptyMonthDates ? projection.range.dates : projection.groups.map(group => group.contextKey);
    const emptyDateCount = projection.range.dates.length - byDate.size;
    const body = dates.length ? dates.map(date => renderTimelineGroup(byDate.get(date) || emptyTimelineGroup(date), true)).join('')
      : '<div class="empty"><strong>이번 달 목록은 비어 있어요.</strong><span>빈 날짜를 펼쳐 날짜별로 빠른 할 일을 만들 수 있어요.</span></div>';
    const toggle = emptyDateCount > 0 ? '<button class="month-empty-toggle" type="button" data-action="toggle-empty-month" aria-expanded="' + showEmptyMonthDates + '">' + (showEmptyMonthDates ? '빈 날짜 접기' : '할 일 없는 날짜 ' + emptyDateCount + '일 보기') + '</button>' : '';
    return '<div class="period-timeline">' + body + '</div>' + toggle;
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
    const projection = timelineProjection(view);
    if (!projection.ok) return '<section class="empty" role="alert" data-testid="timeline-projection-error"><h1>기간을 확인하지 못했어요.</h1><p>날짜나 저장된 순서를 확인할 수 없어 목록을 열지 않았습니다. 기존 값은 바꾸지 않았어요.</p></section>';
    const labels = {
      today: ['오늘', '오늘 실행할 항목을 시간과 개인 순서대로 봅니다.'],
      week: ['주간', '월요일부터 일요일까지 날짜별 실행 항목입니다.'],
      month: ['월간', '이번 달에 날짜가 잡힌 실행 항목입니다.'],
      undated: ['날짜 미정', '아직 실행 날짜를 정하지 않은 항목입니다.']
    };
    const ids = projection.groups.flatMap(group => group.ids);
    const done = ids.filter(id => taskById(id).done).length;
    const flowItems = ids.filter(id => taskById(id).flowId !== null).length;
    const quickAction = view === 'month' ? '' : '<button class="button primary" type="button" data-action="add-quick" data-date="' + (view === 'today' ? localToday : '') + '">빠른 할 일</button>';
    let groups = projection.groups;
    if (view === 'today' && !groups.some(group => group.context === 'date')) groups = groups.concat(emptyTimelineGroup(localToday));
    if (view === 'week') groups = projection.range.dates.map(date => groups.find(group => group.contextKey === date) || emptyTimelineGroup(date));
    const timeline = view === 'month' ? renderMonthTaskGroups(projection) : groups.length
      ? '<div class="period-timeline">' + groups.map(group => renderTimelineGroup(group, view === 'week')).join('') + '</div>'
      : '<div class="empty"><strong>이 목록은 비어 있어요.</strong><span>빠른 할 일을 만들거나 다른 날짜에서 옮겨 보세요.</span></div>';
    const dateRange = view === 'undated' ? '' : '<p class="timeline-date-range">' + escapeHtml(projection.range.start) + (projection.range.start === projection.range.end ? '' : ' – ' + escapeHtml(projection.range.end)) + '</p>';
    return '<div data-testid="timeline-period" data-timeline-view="' + escapeHtml(view) + '" data-local-today="' + escapeHtml(localToday) + '"><div class="page-head"><div><h1>' + labels[view][0] + '</h1>' + dateRange + '<p>' + labels[view][1] + ' 원본 일정은 그대로 두고 내 실행 날짜만 조정할 수 있어요.</p></div><div class="page-actions">' + quickAction + '</div></div>' +
      '<div class="summary-strip"><div class="summary-cell"><strong>' + ids.length + '</strong><span>실행 항목</span></div><div class="summary-cell"><strong>' + flowItems + '</strong><span>Flow Item</span></div><div class="summary-cell"><strong>' + done + '</strong><span>완료</span></div></div>' +
      timeline + '</div>';
  }

  function renderTrashView() {
    const entries = M.trashManifest(state());
    const rows = entries.map(entry => '<article class="trash-row" data-trash-kind="' + escapeHtml(entry.kind) + '" data-trash-id="' + escapeHtml(entry.id) + '"><div><span class="origin">' + (entry.kind === 'flow' ? 'Flow' : '빠른 할 일') + '</span><strong>' + escapeHtml(entry.title) + '</strong><small>' + entry.itemCount + '개 항목 · ' + escapeHtml(entry.deletedAt.slice(0, 10)) + '</small></div><div class="trash-actions"><button class="button" type="button" data-action="restore-trash" data-kind="' + escapeHtml(entry.kind) + '" data-id="' + escapeHtml(entry.id) + '">복원</button><button class="button danger" type="button" data-action="permanent-delete" data-kind="' + escapeHtml(entry.kind) + '" data-id="' + escapeHtml(entry.id) + '">영구 삭제</button></div></article>').join('');
    return '<div class="page-head"><div><h1>휴지통</h1><p>Flow와 빠른 할 일을 복원할 수 있습니다. 영구 삭제 뒤에는 Undo하거나 복구할 수 없어요.</p></div></div><div class="summary-strip"><div class="summary-cell"><strong>' + entries.length + '</strong><span>삭제 대기</span></div><div class="summary-cell"><strong>' + entries.filter(entry => entry.kind === 'flow').length + '</strong><span>Flow</span></div><div class="summary-cell"><strong>' + entries.filter(entry => entry.kind === 'quick').length + '</strong><span>빠른 할 일</span></div></div><h2 class="section-title">삭제 대기 항목</h2>' + (rows ? '<div class="trash-list">' + rows + '</div>' : '<div class="empty"><strong>휴지통이 비어 있어요.</strong><span>삭제한 Flow와 빠른 할 일이 여기에 모입니다.</span></div>');
  }

  function activeEditorSession() { return itemSession || planSession; }

  function isPersonalEditor(session) {
    return Boolean(session && [planItemSessions.PERSONAL_PLAN_DRAFT_CONTRACT, planItemSessions.SOURCE_PLAN_DRAFT_CONTRACT, planItemSessions.STRUCTURE_PLAN_DRAFT_CONTRACT].includes(session.draftContract));
  }
  function isStructureEditor(session) { return Boolean(session && session.draftContract === planItemSessions.STRUCTURE_PLAN_DRAFT_CONTRACT); }
  function isSourceEditor(session) { return Boolean(session && [planItemSessions.SOURCE_PLAN_DRAFT_CONTRACT, planItemSessions.STRUCTURE_PLAN_DRAFT_CONTRACT].includes(session.draftContract)); }
  function readPersonalSourceEpoch() { return personalPlanSourceEpoch; }
  function editorChangeSummary() {
    const session = activeEditorSession();
    if (!session || !isSourceEditor(planSession) || !planEditorPresentation || !planEditorPresentation.ok) return null;
    const cached = editorSummaryCache.get(session);
    if (cached && cached.parent === planSession && cached.context === planEditorPresentation.context) return cached.summary;
    const child = itemSession && { itemRef: itemSession.scopeId, title: itemSession.draft.title,
      memo: itemSession.draft.memo, schedule: itemSession.draft.schedule };
    const draft = itemSession ? { ...planSession.draft, items: { ...planSession.draft.items, [itemSession.scopeId]: child } } : planSession.draft;
    const summary = P.summarizeCapturedPersonalPlanChanges({ context: planEditorPresentation.context, draft,
      ...(itemSession ? { compareDraft: planSession.draft } : {}) });
    editorSummaryCache.set(session, { parent: planSession, context: planEditorPresentation.context, summary });
    return summary;
  }

  function planChangePage(summary, page) {
    const count = summary && summary.ok ? summary.changes.length : 0;
    const pages = Math.max(1, Math.ceil(count / PLAN_CHANGE_PAGE_SIZE));
    return { index: Math.max(0, Math.min(pages - 1, Number.isInteger(page) ? page : 0)), count: pages };
  }

  function planChangeList(summary, page, action, ownerAttributes) {
    if (!summary || !summary.ok) return '<p>입력 조건을 확인하면 변경 내용을 볼 수 있어요. 입력은 그대로 유지했습니다.</p>';
    if (!summary.changed) return '<p>바뀐 내용이 없습니다.</p>';
    const position = planChangePage(summary, page);
    const rows = summary.changes.slice(position.index * PLAN_CHANGE_PAGE_SIZE, (position.index + 1) * PLAN_CHANGE_PAGE_SIZE);
    const pager = position.count > 1 ? '<nav class="plan-change-pages" aria-label="변경 내용 페이지"><button class="button" type="button" data-action="' + action + '" ' + ownerAttributes + ' data-direction="previous" data-plan-summary-boundary="' + (position.index === 0) + '"' + (position.index === 0 ? ' disabled' : '') + '>이전</button><span>' + (position.index + 1) + ' / ' + position.count + '</span><button class="button" type="button" data-action="' + action + '" ' + ownerAttributes + ' data-direction="next" data-plan-summary-boundary="' + (position.index === position.count - 1) + '"' + (position.index === position.count - 1 ? ' disabled' : '') + '>다음</button></nav>' : '';
    return '<p class="plan-change-count">' + summary.changedFieldCount + '개 변경 · Flow ' + summary.flowCount + '개 · 할 일 ' + summary.itemCount + '개</p><ol class="plan-change-list" start="' + (position.index * PLAN_CHANGE_PAGE_SIZE + 1) + '">' + rows.map(change => '<li data-summary-change="' + escapeHtml(change.field) + '"><strong>' + escapeHtml(change.label) + '</strong><dl><div><dt>변경 전</dt><dd>' + escapeHtml(change.before) + '</dd></div><div><dt>변경 후</dt><dd>' + escapeHtml(change.after) + '</dd></div></dl></li>').join('') + '</ol>' + pager;
  }

  function setPlanSummaryFacts(node, summary, page) {
    const position = planChangePage(summary, page);
    node.dataset.changedFieldCount = String(summary && summary.ok ? summary.changedFieldCount : 0);
    node.dataset.flowCount = String(summary && summary.ok ? summary.flowCount : 0);
    node.dataset.itemCount = String(summary && summary.ok ? summary.itemCount : 0);
    node.dataset.pageIndex = String(position.index); node.dataset.pageCount = String(position.count);
    node.dataset.summaryValid = String(Boolean(summary && summary.ok));
  }

  function syncPlanChangeSummary(surface, session) {
    const summary = editorChangeSummary();
    if (!summary) return;
    let node = surface.querySelector('[data-testid="plan-change-summary"]');
    if (!node) {
      node = document.createElement('section'); node.dataset.testid = 'plan-change-summary'; node.className = 'plan-change-summary';
      const toolbar = surface.querySelector('.detail-toolbar');
      if (toolbar) toolbar.before(node); else surface.append(node);
    }
    const scope = itemSession ? 'item' : 'plan';
    const page = planChangePage(summary, itemSession ? itemSummaryPage : planSummaryPage).index;
    if (itemSession) itemSummaryPage = page; else planSummaryPage = page;
    node.dataset.summaryScope = scope;
    setPlanSummaryFacts(node, summary, page);
    node.innerHTML = '<h2 tabindex="-1">' + (itemSession ? '계획에 반영할 내용' : '반영 전 확인') + '</h2>'
      + planChangeList(summary, page, 'plan-summary-page', 'data-session-id="' + escapeHtml(session.sessionId) + '"');
  }

  function changePlanSummaryPage(control) {
    const session = activeEditorSession();
    if (!session || session.sessionId !== control.dataset.sessionId || editorLocked() || session.pendingClose) return;
    const summary = editorChangeSummary(), current = itemSession ? itemSummaryPage : planSummaryPage;
    const delta = control.dataset.direction === 'next' ? 1 : control.dataset.direction === 'previous' ? -1 : 0;
    if (!delta || planChangePage(summary, current + delta).index !== current + delta) return;
    if (itemSession) itemSummaryPage += delta; else planSummaryPage += delta;
    syncEditorUI();
    const node = document.querySelector('[data-testid="plan-change-summary"]');
    const target = node && (node.querySelector('[data-direction="' + control.dataset.direction + '"]:not([disabled])') || node.querySelector('h2'));
    if (target) target.focus();
  }

  function silencePlanGlobalFeedback() {
    elements.saveStatus.setAttribute('aria-live', 'off'); elements.saveStatus.removeAttribute('role'); elements.saveStatus.hidden = true;
    elements.toast.hidden = true; elements.toast.setAttribute('aria-live', 'off'); elements.toast.removeAttribute('role');
    window.clearTimeout(showToast.timer); pendingRetry = null;
  }

  function bindPlanAttempt(session, prepared) {
    if (!isSourceEditor(session)) return true;
    const attempt = prepared.attempt;
    if (!attempt || !planEditorPresentation || !planEditorPresentation.ok) return false;
    const source = readCurrentPersonalSource(), epoch = readPersonalSourceEpoch();
    const fresh = P.checkPersonalPlanSourceContext(planEditorPresentation.sourceContext, { rawState: workspacePacket.checkpoint.state, sourceRead: source, sourceEpoch: epoch });
    if (!fresh.ok || attempt.expectedRaw !== workspacePacket.expectedCheckpointRaw || attempt.sessionId !== session.sessionId
      || attempt.revision !== session.revision || attempt.candidateRaw !== attempt.serialized) return false;
    const existing = planAttemptSummaries.get(attempt);
    if (existing) return existing.sourceRaw === source.raw && existing.sourceEpoch === epoch && existing.sessionId === session.sessionId;
    const summary = editorChangeSummary();
    if (!summary || !summary.ok || !summary.changed) return false;
    planAttemptSummaries.set(attempt, Object.freeze({ summary, sessionId: session.sessionId, revision: session.revision, scopeId: session.scopeId,
      attemptId: attempt.attemptId, expectedRaw: attempt.expectedRaw, candidateRaw: attempt.serialized,
      sourceRaw: source.raw, sourceEpoch: epoch, returnPoint: session.returnPoint }));
    return true;
  }

  function planResultSourceCurrent(result) {
    const source = readCurrentPersonalSource();
    return source.ok && source.raw === result.sourceRaw && readPersonalSourceEpoch() === result.sourceEpoch;
  }

  function dismissPlanSaveResult() {
    planSaveResult = null;
    elements.content.querySelectorAll('[data-testid="plan-save-result"]').forEach(node => node.remove());
  }

  function planResultCurrent(result) {
    return Boolean(result && result === planSaveResult && result.screenKey === resultScreenKey()
      && lastUndoLane === 'workspace' && result.workspaceEpoch === workspaceEpoch
      && result.exactRaw === workspacePacket.expectedCheckpointRaw && S.sameAuthority(storage, workspacePacket).ok
      && planResultSourceCurrent(result));
  }

  function planResultUncovered() {
    return !activeEditorSession() && !workspaceRecoveryGate && !editorRecoveryGate && !workspaceTransactionPending
      && !sourceUpdateSession && !personalDisplayBlocked && !creatorDraftBlocked() && !sourceCandidateBlocked()
      && !elements.dialog.open && !movePanelOpen() && !editorHistoryConsuming;
  }

  function issuePlanSaveResult(session, attempt) {
    const binding = attempt && planAttemptSummaries.get(attempt);
    if (!binding || !durablePlanAttempts.has(attempt) || consumedPlanAttempts.has(attempt)
      || binding.sessionId !== session.sessionId || binding.revision !== session.revision
      || binding.candidateRaw !== workspacePacket.expectedCheckpointRaw || !S.sameAuthority(storage, workspacePacket).ok
      || !planResultSourceCurrent(binding) || activeEditorSession() || workspaceRecoveryGate || editorRecoveryGate) return false;
    consumedPlanAttempts.add(attempt); planAttemptSummaries.delete(attempt);
    interruptContextualResult('plan-result-owner');
    planSaveResult = { id: 'plan-result-' + (++planResultSequence), summary: binding.summary,
      sourceRaw: binding.sourceRaw, sourceEpoch: binding.sourceEpoch, scopeId: binding.scopeId,
      screenKey: resultScreenKey(), exactRaw: binding.candidateRaw, workspaceEpoch,
      returnPoint: binding.returnPoint, state: 'saved', page: 0, announced: null };
    silencePlanGlobalFeedback(); renderPlanSaveResult();
    return true;
  }

  function renderPlanSaveResult() {
    if (!planSaveResult) return;
    const result = planSaveResult;
    // History consumption is transient after the genuine close. Recovery from
    // this result's own Undo may also retain its callback, but not active UI.
    if (workspaceRecoveryGate || editorRecoveryGate || workspaceTransactionPending || editorHistoryConsuming) {
      elements.content.querySelectorAll('[data-testid="plan-save-result"]').forEach(node => node.remove()); return;
    }
    if (!planResultUncovered() || !planResultCurrent(result)) { dismissPlanSaveResult(); return; }
    let node = elements.content.querySelector('[data-testid="plan-save-result"]');
    if (!node) {
      node = document.createElement('section'); node.className = 'plan-save-result'; node.dataset.testid = 'plan-save-result';
      node.setAttribute('aria-label', '개인 계획 변경 결과'); node.tabIndex = -1;
      node.innerHTML = '<h2 tabindex="-1">개인 계획 변경 결과</h2><p data-testid="plan-result-live" role="status" aria-live="polite" aria-atomic="true"></p><div data-plan-result-body></div>';
      const anchor = elements.content.querySelector('.item-detail > header, .detail-header, .page-head');
      if (anchor) anchor.after(node); else elements.content.prepend(node);
    }
    node.dataset.receiptId = result.id; node.dataset.resultState = result.state;
    setPlanSummaryFacts(node, result.summary, result.page);
    const message = result.state === 'undone' ? '이 개인 계획 변경을 되돌렸어요.' : result.state === 'failure'
      ? '되돌리지 못했어요. 저장된 변경은 유지했습니다. 다시 시도할 수 있어요.'
      : '개인 계획 변경 ' + result.summary.changedFieldCount + '건을 저장했어요.';
    const live = node.querySelector('[data-testid="plan-result-live"]');
    if (result.announced !== result.state) { live.textContent = message; result.announced = result.state; }
    const owner = 'data-receipt-id="' + escapeHtml(result.id) + '"';
    node.querySelector('[data-plan-result-body]').innerHTML = '<p class="plan-result-state">' + escapeHtml(message) + '</p>'
      + planChangeList(result.summary, result.page, 'plan-result-page', owner)
      + '<div class="plan-result-actions">' + (result.state !== 'undone' && envelope.undo ? '<button class="button" type="button" data-action="plan-result-undo" ' + owner + '>이 변경 되돌리기</button>' : '')
      + '<button class="button" type="button" data-action="plan-result-dismiss" ' + owner + '>결과 닫기</button></div>';
    silencePlanGlobalFeedback();
  }

  function handlePlanResultAction(control) {
    const result = planSaveResult;
    if (!result || control.dataset.receiptId !== result.id) return;
    if (!planResultUncovered() || !planResultCurrent(result)) { dismissPlanSaveResult(); return; }
    if (control.dataset.action === 'plan-result-dismiss') {
      const point = result.returnPoint; dismissPlanSaveResult(); interruptContextualResult('plan-result-dismiss'); restoreEditorPoint(point, false); return;
    }
    if (control.dataset.action === 'plan-result-page') {
      const delta = control.dataset.direction === 'next' ? 1 : control.dataset.direction === 'previous' ? -1 : 0;
      if (!delta || planChangePage(result.summary, result.page + delta).index !== result.page + delta) return;
      result.page += delta; renderPlanSaveResult();
      const node = elements.content.querySelector('[data-testid="plan-save-result"]');
      const target = node && (node.querySelector('[data-direction="' + control.dataset.direction + '"]:not([disabled])') || node.querySelector('h2'));
      if (target) target.focus(); return;
    }
    if (control.dataset.action !== 'plan-result-undo' || result.state === 'undone' || !envelope.undo || !workspaceWritable()) return;
    const undone = C.undoCheckpoint(workspacePacket.checkpoint);
    if (!undone.changed) return;
    const expectedUndoRaw = JSON.stringify(undone.checkpoint);
    const settled = () => {
      if (planSaveResult !== result || result.screenKey !== resultScreenKey() || !planResultSourceCurrent(result)
        || activeEditorSession() || workspaceRecoveryGate || editorRecoveryGate || lastUndoLane !== 'workspace'
        || workspacePacket.expectedCheckpointRaw !== expectedUndoRaw || !S.sameAuthority(storage, workspacePacket).ok) return;
      result.state = 'undone'; result.exactRaw = expectedUndoRaw; result.workspaceEpoch = workspaceEpoch;
    };
    const changed = writeCandidate(undone.checkpoint, '개인 계획 변경을 되돌렸어요.', settled, 'undo', undefined, null,
      { kind: 'plan-result', isCurrent: () => planResultUncovered() && planResultCurrent(result) });
    if (!changed && !workspaceRecoveryGate && !editorRecoveryGate && planResultCurrent(result)) result.state = 'failure';
    renderPlanSaveResult();
  }
  function sourceEditorOptions() { return { checkpoint: workspacePacket.checkpoint, readSourceEpoch: readPersonalSourceEpoch }; }
  function inspectEditorPresentation(flowRef, sourceBound, structure) {
    if (!sourceBound) return C.inspectPersonalPlanContext(workspacePacket.checkpoint, flowRef);
    const epoch = readPersonalSourceEpoch();
    let raw;
    try { raw = storage.getItem(M.SOURCE_CANDIDATE_STORAGE_KEY); }
    catch (_) { return { ok: false, reason: 'source-read-error' }; }
    if (epoch !== readPersonalSourceEpoch()) return { ok: false, reason: 'source-observation-drift' };
    const inspect = structure ? C.inspectSourceBoundPersonalPlanStructureContext : C.inspectSourceBoundPersonalPlanContext;
    return inspect(workspacePacket.checkpoint, { flowRef, sourceRead: { ok: true, raw }, sourceEpoch: epoch });
  }
  function personalEditorMessage(reason) {
    if (/stale|drift/.test(reason || '')) return '열어 둔 뒤 원문이나 저장된 내용이 달라졌어요. 입력은 유지했습니다. 편집을 닫고 최신 내용을 다시 확인해 주세요.';
    if (/read|observation|runtime/.test(reason || '')) return '원문과 저장 상태를 확인하지 못해 변경하지 않았어요. 입력을 유지했으니 다시 확인해 주세요.';
    if (/effective-plan/.test(reason || '')) return '이 항목의 반복 조건과 계획 날짜를 함께 확인해 주세요. 입력은 유지했으며 저장하지 않았습니다.';
    return '이 계획의 편집 조건을 확인하지 못했어요. 제목·날짜와 원문 상태를 확인해 주세요. 입력과 저장된 내용은 유지했습니다.';
  }
  function showPersonalEditorError(reason) {
    // Captured validation explains an invalid draft; it grants no save authority
    // and does not replace E2's live source/checkpoint checks.
    if (reason === 'invalid-editor-draft' && isSourceEditor(planSession) && planEditorPresentation && planEditorPresentation.ok) {
      const validate = isStructureEditor(planSession) ? P.validateCapturedPersonalPlanStructureDraft : P.validateCapturedPersonalPlanSourceDraft;
      const diagnosis = validate({ context: planEditorPresentation.context, draft: planSession.draft });
      if (!diagnosis.ok && diagnosis.reason) reason = diagnosis.reason;
    }
    editorFeedback = { state: 'invalid', message: personalEditorMessage(reason) };
    syncEditorUI();
    const target = document.querySelector('[data-testid="standalone-item-editor"] [aria-invalid="true"], [data-testid="standalone-plan-editor"] [aria-invalid="true"], [data-testid="plan-item-save-feedback"]');
    if (target) target.focus();
  }
  function syncPersonalControlErrors(surface) {
    if (!isPersonalEditor(activeEditorSession())) return;
    surface.querySelectorAll('[data-plan-field="flow-title"], [data-item-field="title"], [data-item-field="date"]').forEach(control => {
      const isDate = control.dataset.itemField === 'date';
      const invalid = isDate ? !window.FlowPocTimelineContext.isPlainDate(control.value) : !control.value.trim();
      const errorId = control.id.replace(/-value$/, '-error');
      let error = document.getElementById(errorId);
      if (invalid) {
        control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', errorId);
        if (!error) { error = document.createElement('p'); error.id = errorId; error.className = 'field-error'; control.after(error); }
        error.textContent = isDate ? '날짜를 선택해 주세요.' : '제목을 입력해 주세요.';
      } else { control.removeAttribute('aria-invalid'); control.removeAttribute('aria-describedby'); if (error) error.remove(); }
    });
    surface.querySelectorAll('[data-section-field]').forEach(control => {
      const invalid = !control.value.trim() || control.value.trim() !== control.value;
      const errorId = control.id.replace(/-value$/, '-error');
      let error = document.getElementById(errorId);
      if (invalid) {
        control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', errorId);
        if (!error) { error = document.createElement('p'); error.id = errorId; error.className = 'field-error'; control.after(error); }
        error.textContent = control.value.trim() ? '이름 앞뒤의 공백을 지워 주세요.' : '구간 이름을 입력해 주세요.';
      } else { control.removeAttribute('aria-invalid'); control.removeAttribute('aria-describedby'); if (error) error.remove(); }
    });
  }

  function editorHasPendingRecovery() {
    const session = activeEditorSession();
    return Boolean(session && (session.status === 'recovery-required' || (session.status === 'submitting' && (editorCommitCounted || editorRecoveryJournalRaw !== null))));
  }

  function replaceEditorSession(session) {
    if (session.kind === 'plan') planSession = session;
    else itemSession = session;
  }

  function editorLocked() {
    const session = activeEditorSession();
    return workspaceTransactionPending || Boolean(workspaceRecoveryGate || editorRecoveryGate) || editorHistoryConsuming || Boolean(session && ['submitting', 'recovery-required'].includes(session.status));
  }

  function editorPoint(control) {
    const node = control instanceof HTMLElement ? control : document.activeElement;
    let selector = returnFocusSelector(node);
    if (!selector && node instanceof HTMLElement) {
      if (node.id) selector = '#' + CSS.escape(node.id);
      else if (node.dataset.itemField) selector = '[data-item-field="' + node.dataset.itemField + '"]';
      else if (node.dataset.planField) selector = '[data-plan-field="' + node.dataset.planField + '"]';
      else if (node.dataset.action === 'plan-order-move') selector = '[data-action="plan-order-move"][data-item-ref="' + CSS.escape(node.dataset.itemRef) + '"][data-direction="' + CSS.escape(node.dataset.direction) + '"]';
      else if (node.dataset.action) selector = '[data-action="' + node.dataset.action + '"]' + (node.dataset.id ? '[data-id="' + CSS.escape(node.dataset.id) + '"]' : '');
    }
    return {
      node, selector, index: selector ? Math.max(0, visibleContentNodes(selector).indexOf(node)) : 0,
      selection: node && typeof node.selectionStart === 'number' ? [node.selectionStart, node.selectionEnd, node.selectionDirection] : null,
      screen: copyScreen(screen), x: window.scrollX, y: window.scrollY, controlScroll: node ? { x: node.scrollLeft, y: node.scrollTop } : null,
      scroll: ['#main', '#content', '.result-body', '.result-sheet-scroll', '.plan-edit-list'].flatMap(query => visibleContentNodes(query).map((element, index) => ({ query, index, x: element.scrollLeft, y: element.scrollTop }))),
      resultView, resultCalendarBaseDate, resultCalendarSelectedDate, resultOccurrencePage
    };
  }

  function restoreEditorPoint(point, restoreScreen) {
    if (!point) return;
    const visit = personalEntryVisit;
    if (restoreScreen) {
      screen = copyScreen(point.screen);
      resultView = point.resultView;
      resultCalendarBaseDate = point.resultCalendarBaseDate;
      resultCalendarSelectedDate = point.resultCalendarSelectedDate;
      resultOccurrencePage = point.resultOccurrencePage;
      render();
    }
    const returnSessionId = activeEditorSession() && activeEditorSession().sessionId;
    const returnScreen = JSON.stringify(screen);
    const restore = () => {
      if (personalEntryVisit !== visit) return;
      if ((activeEditorSession() && activeEditorSession().sessionId) !== returnSessionId || JSON.stringify(screen) !== returnScreen) return;
      if (editorHistoryConsuming) { editorHistoryRestore = restore; return; }
      const target = point.node && point.node.isConnected && !point.node.closest('[hidden], [inert]') ? point.node : (point.selector ? visibleContentNodes(point.selector)[point.index] : null);
      const fallback = visibleContentNodes('[data-plan-field="flow-title"], [data-item-field="title"], #main')[0] || (visit ? elements.content : null);
      if (target || fallback) (target || fallback).focus({ preventScroll: true });
      if (target && point.selection && typeof target.setSelectionRange === 'function') {
        try { target.setSelectionRange(...point.selection); } catch (_) { /* A date input has no text selection. */ }
      }
      if (target && point.controlScroll) { target.scrollLeft = point.controlScroll.x; target.scrollTop = point.controlScroll.y; }
      point.scroll.forEach(entry => { const element = visibleContentNodes(entry.query)[entry.index]; if (element) { element.scrollLeft = entry.x; element.scrollTop = entry.y; } });
      window.scrollTo(point.x, point.y);
    };
    if (restoreScreen) window.requestAnimationFrame(restore);
    else restore();
  }

  function pushEditorHistory(session) {
    const previous = history.state;
    const next = previous && typeof previous === 'object' && !Array.isArray(previous) ? Object.assign({}, previous) : { previousState: previous };
    next[EDITOR_HISTORY_KEY] = { sessionId: session.sessionId, version: 1 };
    history.pushState(next, '', location.href);
  }

  function consumeEditorHistory(session) {
    const marker = history.state && history.state[EDITOR_HISTORY_KEY];
    if (!marker || marker.sessionId !== session.sessionId) return;
    editorHistoryConsuming = true;
    history.back();
  }

  function beginEditorRoot(kind, scopeId, draft, point) {
    interruptContextualResult('editor-owner');
    if (!planItemSessions || activeEditorSession() || editorHistoryConsuming) return false;
    if (!workspaceWritable()) return false;
    dismissPlanSaveResult();
    refreshPersonalDisplaySource();
    editorExpectedRaw = workspacePacket.expectedCheckpointRaw;
    editorRecoveryAdapter = planItemSessions;
    editorReadFailed = false;
    elements.toast.hidden = true;
    window.clearTimeout(showToast.timer);
    pendingRetry = null;
    editorFeedback = null;
    editorFeedbackBySession = new Map();
    editorRecoveryJournalRaw = null;
    editorCommitCounted = false;
    editorRecoveryForeign = false;
    editorCommitUncertain = false;
    editorLastInputPoint = null;
    planSummaryPage = 0; itemSummaryPage = 0;
    const sessionId = 'editor-' + Date.now().toString(36) + '-' + (++editorSequence);
    let session;
    try {
      if (kind === 'plan') {
        const presentation = inspectEditorPresentation(scopeId, true, true);
        if (!presentation.ok) throw new Error(presentation.reason);
        session = planItemSessions.createSourceBoundPersonalPlanStructureSession(storage, { ...sourceEditorOptions(), sessionId, flowRef: scopeId, returnPoint: point });
        // Presentation and writer contexts must have observed the same source.
        const fresh = P.checkPersonalPlanSourceContext(presentation.sourceContext, { rawState: workspacePacket.checkpoint.state,
          sourceRead: { ok: true, raw: storage.getItem(M.SOURCE_CANDIDATE_STORAGE_KEY) }, sourceEpoch: readPersonalSourceEpoch() });
        if (!fresh.ok || !planItemSessions.checkSourceBoundPersonalPlanStructureSession(storage, session, sourceEditorOptions()).ok) throw new Error(fresh.reason || 'source-observation-drift');
        planEditorPresentation = presentation;
      } else session = planItemSessions.createSession({ sessionId, kind, scopeId, draft, returnPoint: point });
    } catch (error) {
      planEditorPresentation = null;
      setSaveStatus(personalEditorMessage(error.message), 'error');
      return false;
    }
    replaceEditorSession(session);
    pushEditorHistory(session);
    return true;
  }

  function updateEditorDraft() {
    const session = activeEditorSession();
    if (!session || editorLocked() || session.pendingClose) return;
    const draft = itemSession ? itemDraft : planDraft;
    const updated = isPersonalEditor(session) ? planItemSessions.updateDraft(session, draft)
      : planItemSessions.updateDraft(session, draft, { valid: Boolean(draft.title.trim()) });
    replaceEditorSession(updated.session);
    if (updated.session.revision !== session.revision) editorFeedback = null;
    syncEditorUI();
  }

  function syncEditorUI() {
    const session = activeEditorSession();
    const surface = document.querySelector('[data-testid="standalone-item-editor"], [data-testid="standalone-plan-editor"]');
    document.querySelectorAll('.product-nav button, #sidebar button').forEach(control => { control.disabled = Boolean(session || editorRecoveryGate || workspaceRecoveryGate) || !workspacePacket.ok; });
    [elements.undo, elements.compactUndo, ...elements.toast.querySelectorAll('[data-action="undo"]')].forEach(control => {
      control.disabled = Boolean(session || editorRecoveryGate || workspaceRecoveryGate) || !envelope || editorHistoryConsuming || (envelope.undo === null && creatorDraftLibrary.undo === null && (!sourceCandidateStore || !sourceCandidateStore.undo));
    });
    if (!surface || !session) return;
    syncPersonalControlErrors(surface);
    syncPlanChangeSummary(surface, session);
    surface.dataset.editorSessionId = session.sessionId;
    surface.dataset.editorState = session.status;
    surface.querySelectorAll('input, textarea, select, button').forEach(control => { control.disabled = editorLocked() || control.dataset.planOrderBoundary === 'true' || control.dataset.planSummaryBoundary === 'true'; });
    document.querySelectorAll('.detail-back[data-action="close-plan-editor"], .detail-back[data-action="close-item-editor"]').forEach(control => { control.disabled = editorLocked(); });
    let feedback = surface.querySelector('[data-testid="plan-item-save-feedback"]');
    if (!feedback) {
      feedback = document.createElement('section');
      feedback.dataset.testid = 'plan-item-save-feedback';
      feedback.className = 'plan-item-save-feedback';
      feedback.tabIndex = -1;
      surface.querySelector('header').after(feedback);
    }
    feedback.hidden = !editorFeedback;
    if (editorFeedback) {
      if (isSourceEditor(session)) silencePlanGlobalFeedback();
      editorFeedbackBySession.set(session.sessionId, editorFeedback);
      feedback.dataset.state = editorFeedback.state;
      feedback.setAttribute('role', editorFeedback.state === 'saving' ? 'status' : 'alert');
      feedback.setAttribute('aria-atomic', 'true');
      feedback.innerHTML = '<p>' + escapeHtml(editorFeedback.message) + '</p>' + (session.status === 'recoverable-error' && session.attempt && session.error !== 'stale-expected-raw' ? '<button class="button" type="button" data-action="editor-retry">다시 시도</button>' : '') + (editorHasPendingRecovery() ? recoveryActions() : '');
    }
  }

  function finishEditorClose(session, message, fromHistory) {
    if (!session || !activeEditorSession() || activeEditorSession().sessionId !== session.sessionId) return;
    const point = session.returnPoint;
    if (session.kind === 'item') { itemSession = null; itemDraft = null; itemEditorReturn = null; }
    else { itemSession = null; planSession = null; itemDraft = null; planDraft = null; itemEditorReturn = null; planEditorPresentation = null; }
    editorFeedback = planSession && planSession.status === 'recoverable-error' ? editorFeedbackBySession.get(planSession.sessionId) || null : null;
    editorLastInputPoint = null;
    if (!fromHistory) consumeEditorHistory(session);
    restoreEditorPoint(point, true);
    setSaveStatus(message || '편집을 닫았어요. 저장된 내용은 그대로입니다.', 'noop');
    if (!S.sameAuthority(storage, workspacePacket).ok) enterWorkspaceGate(S.loadWorkspace(storage), { message: '편집을 닫았습니다. 저장된 상태가 달라 최신 내용을 확인한 뒤 다시 열어 주세요.' });
  }

  function continueEditor() {
    const session = activeEditorSession();
    if (!session || !session.pendingClose) return;
    const result = planItemSessions.continueEditing(session);
    replaceEditorSession(result.session);
    dialogSubmit = null;
    dialogReturnFocus = null;
    if (elements.dialog.open) elements.dialog.close();
    restoreEditorPoint(result.editingPoint || editorLastInputPoint, false);
    syncEditorUI();
  }

  function requestEditorClose(reason, fromHistory) {
    if (editorHistoryConsuming) return;
    const session = activeEditorSession();
    if (!session) return;
    if (session.pendingClose) { continueEditor(); return; }
    const focusedField = document.activeElement && document.activeElement.matches('[data-item-field], [data-plan-field], [data-item-mode], [data-plan-mode], [data-section-field], [data-section-mode], [data-action="plan-order-move"], [data-action="plan-order-reset"]');
    const editingPoint = focusedField ? editorPoint(document.activeElement) : (editorLastInputPoint || editorPoint(document.activeElement));
    const result = planItemSessions.requestClose(session, { reason, editingPoint });
    if (result.effect === 'close') { finishEditorClose(session, null, fromHistory); return; }
    replaceEditorSession(result.session);
    if (result.effect !== 'confirm') {
      setSaveStatus('저장 또는 복구를 확인하는 동안에는 편집을 닫을 수 없어요.', 'error');
      return;
    }
    const scope = session.kind === 'plan' ? 'Plan에 반영한 Item 변경과 Plan 변경을 모두 버립니다.' : session.kind === 'item' ? '지금 편집 중인 Item 변경만 버립니다. 앞서 Plan에 반영한 변경은 유지합니다.' : '지금 편집 중인 빠른 할 일의 변경만 버립니다.';
    openDialog('저장하지 않은 변경을 버릴까요?', '<section data-testid="plan-item-discard-confirm"><p>' + scope + '</p><div class="dialog-actions"><button class="button primary" autofocus type="button" data-action="editor-continue">계속 편집</button><button class="button danger" type="button" data-action="editor-discard">변경 내용 버리기</button></div></section>');
  }

  function discardEditor() {
    const session = activeEditorSession();
    if (!session || !session.pendingClose || editorLocked()) return;
    const result = planItemSessions.discardChanges(session);
    if (result.effect !== 'close') return;
    dialogSubmit = null;
    dialogReturnFocus = null;
    if (elements.dialog.open) elements.dialog.close();
    finishEditorClose(session, session.kind === 'item' ? '이 Item의 편집만 버렸어요. 부모 Plan 초안은 유지했습니다.' : '저장하지 않은 편집을 버렸어요. 저장된 내용은 그대로입니다.', false);
  }

  function openPlanEditor(flow, opener) {
    if (!flow) return;
    if (flow.origin === 'authoring-handoff' && sourceCandidateBlocked()) {
      setSaveStatus('원문 비교 저장소를 확인하지 못해 이 Flow의 Plan 편집을 열지 않았어요.', 'error');
      return;
    }
    if (!beginEditorRoot('plan', flow.ref, null, editorPoint(opener))) return;
    planDraft = copyScreen(planSession.draft);
    screen = { type: 'plan-editor', view: screen.view || 'today', selectedFlowId: flow.id };
    setSaveStatus('', 'ready');
    render();
    focusAfterRender('[data-plan-mode="flow-title"]', '[data-plan-field="flow-title"]');
  }

  function saveEditor(retry) {
    let session = activeEditorSession();
    if (!session || editorLocked() || session.pendingClose || session.kind === 'item') return;
    if (!retry && session.status === 'recoverable-error' && session.attempt) retry = true;
    let prepared;
    if (retry) prepared = isSourceEditor(session)
      ? (isStructureEditor(session) ? planItemSessions.retrySourceBoundPersonalPlanStructureSave : planItemSessions.retrySourceBoundPersonalPlanSave)(storage, session, { ...sourceEditorOptions(), attemptId: session.attempt && session.attempt.attemptId })
      : planItemSessions.retrySave(session, session.attempt && session.attempt.attemptId);
    else {
      updateEditorDraft();
      session = activeEditorSession();
      if (isPersonalEditor(session)) {
        const options = { ...sourceEditorOptions(), expectedRaw: editorExpectedRaw, attemptId: 'save-' + (++editorSaveSequence), now: new Date().toISOString() };
        prepared = isSourceEditor(session) ? (isStructureEditor(session) ? planItemSessions.beginSourceBoundPersonalPlanStructureSave : planItemSessions.beginSourceBoundPersonalPlanSave)(storage, session, options)
          : planItemSessions.beginPersonalPlanSave(session, options);
        if (prepared.ok && prepared.changed === false) { finishEditorClose(session, '같은 내용이라 저장하지 않았습니다.', false); return; }
      } else {
      const action = session.kind === 'plan'
        ? { type: 'commit-personal-plan', flowId: planDraft.flowId, title: planDraft.title, items: planDraft.items }
        : { type: 'update-quick', id: itemDraft.id, title: itemDraft.title, memo: itemDraft.memo, date: itemDraft.date, folderId: itemDraft.folderId };
      const result = C.transitionCheckpoint(workspacePacket.checkpoint, action);
      if (!result.changed) {
        editorFeedback = { state: !result.ok ? 'invalid' : 'noop', message: !result.ok ? result.message || '편집 조건을 확인하지 못해 저장하지 않았습니다.' : '같은 내용이라 저장하지 않았습니다.' };
        syncEditorUI();
        if (!result.ok) document.querySelector('[data-testid="plan-item-save-feedback"]').focus();
        else finishEditorClose(session, editorFeedback.message, false);
        return;
      }
      prepared = planItemSessions.beginSave(session, { attemptId: 'save-' + (++editorSaveSequence), expectedRaw: editorExpectedRaw, candidate: result.checkpoint });
      }
    }
    if (!prepared.ok) { showPersonalEditorError(prepared.error || prepared.reason); return; }
    if (prepared.attempt && !preflightPersonalDisplay(prepared.attempt.candidate).ok) { showPersonalEditorError('personal-display-preflight-failed'); return; }
    if (!bindPlanAttempt(session, prepared)) { showPersonalEditorError('summary-source-observation-drift'); return; }
    replaceEditorSession(prepared.session);
    editorFeedback = { state: 'saving', message: '변경을 저장하고 확인하는 중입니다.' };
    syncEditorUI();
    setSaveStatus('저장 중…', 'saving');
    window.setTimeout(() => {
      const current = activeEditorSession();
      if (!current || current !== prepared.session || current.attempt !== prepared.attempt || workspaceRecoveryGate || editorRecoveryGate || workspaceTransactionPending) return;
      const outcome = planItemSessions.writeDurableAttempt(writerStorage(), current, prepared.attempt, { readSourceEpoch: readPersonalSourceEpoch });
      editorRecoveryJournalRaw = outcome.journalRaw || null;
      editorCommitUncertain = Boolean(outcome.commitUncertain);
      const finished = planItemSessions.finishSave(current, prepared.attempt, outcome);
      if (outcome.status === 'committed' && finished.outcome === outcome && planAttemptSummaries.has(prepared.attempt)) durablePlanAttempts.add(prepared.attempt);
      if (outcome.status === 'committed' && !editorCommitCounted) {
        successfulMutations += 1;
        editorCommitCounted = true;
        lastUndoLane = 'workspace';
      }
      if (finished.effect === 'close') {
        if (outcome.journalRaw) {
          const cleanup = planItemSessions.clearConfirmedRecovery(storage, { expectedJournalRaw: outcome.journalRaw });
          const packet = S.loadWorkspace(storage);
          if (!cleanup.ok || !cleanup.canResume || !packet.ok) {
            editorFeedback = { state: 'confirmed', message: '변경 저장은 확인했습니다. 복구 기록 정리를 확인할 때까지 추가 변경을 막습니다.' };
            setSaveStatus('저장 완료 · 정리 확인 필요', 'error');
            syncEditorUI();
            document.querySelector('[data-testid="plan-item-save-feedback"]').focus();
            return;
          }
          adoptWorkspace(packet);
        }
        editorRecoveryJournalRaw = null;
        finishEditorClose(current, finished.changed ? '변경을 저장했어요.' : '같은 내용이라 저장하지 않았습니다.', false);
        setSaveStatus(finished.changed ? successfulStorageStatus() : '같은 내용이라 저장하지 않았습니다.', finished.changed ? 'saved' : 'noop');
        // If a source observation changed after commit, report that commit
        // without offering the generic Undo (which may select the source lane).
        if (!finished.changed || !issuePlanSaveResult(current, prepared.attempt)) showToast(finished.changed ? '개인 계획 변경을 저장했어요.' : '같은 내용이라 저장하지 않았습니다.', finished.changed && !isSourceEditor(current) && envelope.undo !== null);
      } else {
        replaceEditorSession(finished.session);
        const recovery = finished.session.status === 'recovery-required';
        let message = '저장하지 못했어요. 편집 입력은 유지했습니다. 다시 시도하거나 편집을 계속할 수 있어요.';
        if (finished.session.error === 'initial-read-failed') message = '저장소를 읽지 못해 쓰기를 시작하지 않았어요. 입력을 유지했습니다. 다시 시도할 수 있어요.';
        if (finished.session.error === 'stale-expected-raw') message = '다른 화면에서 저장된 내용이 달라 쓰지 않았어요. 이 입력은 유지했습니다. 현재 편집을 닫고 최신 내용을 다시 확인해 주세요.';
        if (recovery) message = outcome.status === 'committed' ? '변경 저장은 확인했습니다. 이전 저장본의 일치를 확인하지 못해 추가 변경과 닫기를 막았습니다.' : '저장 상태를 확인하지 못해 추가 변경과 닫기를 막았습니다. 현재 입력은 이 화면에 유지했습니다. 복구 확인 전에는 저장 성공으로 처리하지 않습니다.';
        editorFeedback = { state: outcome.status === 'committed' ? 'confirmed' : recovery ? 'recovery-required' : 'failure', message };
        setSaveStatus(outcome.status === 'committed' ? '저장 완료 · 권위 확인 필요' : recovery ? '저장 상태 확인 필요 · 추가 변경 차단' : '저장 실패 · 입력 유지', 'error');
        syncEditorUI();
        document.querySelector('[data-testid="plan-item-save-feedback"]').focus();
      }
    }, 32);
  }

  function validLegacyEditorEnvelope(candidate) {
    return M.loadEnvelope({ getItem: () => JSON.stringify(candidate) }).status === 'restored';
  }

  function editorRecoveryOptions(expectedJournalRaw) {
    return editorRecoveryAdapter === legacyPlanItemSessions ? { expectedJournalRaw, validateEnvelope: validLegacyEditorEnvelope } : { expectedJournalRaw };
  }

  function recoveryActions() {
    const state = editorRecoveryGate;
    if (state && state.status === 'source-reopen') return '<div class="dialog-actions"><button type="button" class="button primary" data-action="editor-reopen-source">원문 다시 확인 · 편집 재개</button><button type="button" class="button" data-action="editor-discard-recovered">보관된 편집 버리고 현재 내용 열기</button></div>';
    let phase = state && state.status;
    if (!phase && editorRecoveryJournalRaw) {
      try { phase = JSON.parse(editorRecoveryJournalRaw).phase; } catch (_) { phase = 'blocked'; }
    }
    return '<div class="dialog-actions"><button type="button" class="button" data-action="editor-check-storage">저장 상태 다시 확인</button>'
      + (phase === 'none' && !editorRecoveryJournalRaw ? '<button type="button" class="button primary" data-action="editor-open-verified">저장된 내용 확인해 열기</button>' : '')
      + (phase === 'prepared' && !editorRecoveryForeign ? '<button type="button" class="button primary" data-action="editor-recover-storage">이전 상태 복구 · 편집 계속</button>' : '')
      + (phase === 'confirmed' && !editorRecoveryForeign ? '<button type="button" class="button primary" data-action="editor-clear-confirmed">저장 완료 확인 · 정리</button>' : '') + '</div>';
  }

  function renderEditorRecoveryGate() {
    const recovery = editorRecoveryGate;
    const journal = recovery.journal;
    if (recovery.status === 'source-reopen') return '<section class="plan-item-recovery-gate" data-testid="plan-item-recovery-gate" data-recovery-state="source-reopen"><h1 tabindex="-1">원문 확인 전까지 편집 입력을 보관합니다</h1><p>미확정 저장은 이전 상태로 복구했습니다. 현재 원문이 다르거나 읽을 수 없어 보관된 입력을 자동으로 옮기거나 저장하지 않았습니다.</p><details open data-testid="source-recovered-draft"><summary>보관된 입력 · 읽기 전용</summary><pre>' + escapeHtml(JSON.stringify(journal.draft, null, 2)) + '</pre></details>' + recoveryActions() + '<p role="status">' + escapeHtml(recovery.message || '같은 원문을 확인하면 새 편집 세션으로 재개합니다.') + '</p></section>';
    const confirmed = recovery.status === 'confirmed';
    const message = confirmed ? '이전 변경은 저장되었습니다. 복구 기록을 정리하기 전에는 다른 내용을 바꾸지 않습니다.' : '이전 저장을 안전하게 확인하지 못했습니다. 미확정 내용을 성공한 저장으로 열지 않고, 다른 변경도 막았습니다.';
    return '<section class="plan-item-recovery-gate" data-testid="plan-item-recovery-gate" data-recovery-state="' + escapeHtml(recovery.status) + '"><h1 tabindex="-1">' + (confirmed ? '저장은 완료 · 정리 확인 필요' : '저장 상태를 먼저 확인해 주세요') + '</h1><p>' + message + '</p>'
      + (journal ? '<h2>' + escapeHtml(journal.kind === 'quick' ? '빠른 할 일 편집' : 'Plan 편집') + '</h2><p>' + escapeHtml(typeof journal.draft.title === 'string' ? journal.draft.title : journal.draft.title.mode === 'override' ? journal.draft.title.value : '기존 제목 유지') + '</p><details><summary>보관된 편집 내용 확인</summary><pre>' + escapeHtml(JSON.stringify(journal.draft, null, 2)) + '</pre></details>' : '<p>복구 기록을 읽거나 검증할 수 없습니다. 기존 저장 값은 변경하지 않았습니다.</p>')
      + recoveryActions() + '<p data-recovery-message role="status">' + escapeHtml(recovery.message || '열기만으로 저장소를 변경하지 않습니다.') + '</p></section>';
  }

  function checkEditorStorage() {
    const core = S.loadWorkspace(storage);
    if (core.reason === 'multiple-authorities') {
      editorRecoveryForeign = true;
      if (editorRecoveryGate) { editorRecoveryGate.message = '서로 다른 저장 권위가 함께 있어 복구를 막았습니다. 모든 기록을 보존했어요.'; render(); }
      else { editorFeedback = { state: 'recovery-required', message: '서로 다른 저장 권위가 함께 있어 복구를 막았습니다.' }; syncEditorUI(); }
      return;
    }
    const checked = editorRecoveryAdapter.loadRecovery(storage, editorRecoveryAdapter === legacyPlanItemSessions ? validLegacyEditorEnvelope : undefined);
    const expected = (editorRecoveryGate && editorRecoveryGate.journalRaw) || editorRecoveryJournalRaw;
    let sameOwner = true;
    if (checked.journalRaw && expected && checked.journalRaw !== expected) {
      sameOwner = false;
      try {
        const previous = JSON.parse(expected);
        const next = checked.journal;
        const phaseChangeAllowed = next && (previous.phase === 'prepared' && next.phase === 'confirmed' || editorCommitUncertain && !editorCommitCounted && previous.phase === 'confirmed' && next.phase === 'prepared');
        sameOwner = Boolean(phaseChangeAllowed && JSON.stringify(Object.assign({}, previous, { phase: next.phase })) === checked.journalRaw);
      } catch (_) { /* An unknown record cannot replace the current recovery owner. */ }
    }
    const current = activeEditorSession();
    if (current && checked.journal && (checked.journal.sessionId !== current.sessionId || !current.attempt || checked.journal.attemptId !== current.attempt.attemptId || checked.journal.revision !== current.revision)) sameOwner = false;
    if (!sameOwner) {
      editorRecoveryForeign = true;
      const message = '다른 편집의 복구 기록으로 바뀌어 처리를 막았습니다. 현재 입력과 원래 복구 대상을 유지했으며 새 기록은 변경하지 않았습니다.';
      if (editorRecoveryGate) { editorRecoveryGate = Object.assign({}, editorRecoveryGate, { status: 'blocked', message }); render(); }
      else { editorFeedback = { state: 'recovery-required', message }; syncEditorUI(); }
      return;
    }
    editorRecoveryForeign = false;
    // A read-only check never discards an unresolved transaction or silently reopens writers.
    if (editorRecoveryGate) {
      editorRecoveryGate = Object.assign({}, checked, { message: checked.status === 'none' ? '기록 부재를 확인했습니다. 이전 복구 작업의 정리 확인이 필요합니다.' : '저장 상태를 다시 읽었습니다. 변경하려면 해당 복구 또는 정리 버튼을 눌러 주세요.' });
      if (checked.status === 'none' && expected) {
        try { const journal = JSON.parse(expected); editorRecoveryGate = Object.assign({}, editorRecoveryGate, { status: journal.phase, journalRaw: expected, journal }); } catch (_) { editorRecoveryGate.status = 'blocked'; }
      }
      render();
    } else {
      if (checked.journalRaw) editorRecoveryJournalRaw = checked.journalRaw;
      editorFeedback = { state: checked.status === 'confirmed' ? 'confirmed' : 'recovery-required', message: checked.status === 'confirmed' ? '변경 저장은 확인했습니다. 정리 버튼으로 복구 기록만 정리할 수 있습니다.' : '저장 상태를 다시 읽었습니다. 이전 상태와 복구 기록이 일치할 때만 복구할 수 있습니다.' };
      syncEditorUI();
    }
  }

  function resumeEditorRecovery() {
    if (editorRecoveryForeign) return;
    if (S.loadWorkspace(storage).reason === 'multiple-authorities') { checkEditorStorage(); return; }
    const expected = (editorRecoveryGate && editorRecoveryGate.journalRaw) || editorRecoveryJournalRaw;
    const recovery = recoveredSourceEditor ? recoveredSourceEditor.recovery : editorRecoveryAdapter.recoverDurableAttempt(storage, editorRecoveryOptions(expected));
    if (!recovery.ok) { checkEditorStorage(); return; }
    const packet = S.loadWorkspace(storage);
    if (!packet.ok || (editorRecoveryAdapter === planItemSessions && !recovery.canResume)) { checkEditorStorage(); return; }
    const previous = activeEditorSession();
    adoptWorkspace(packet);
    // Recovery may retain a prior editor. Refresh only its display observation
    // before creating/consuming the resumed session, never its captured draft.
    adoptPersonalDisplaySource(M.loadSourceCandidateStore(storage));
    const journal = recovery.journal;
    const localFlowId = journal.kind === 'plan' && journal.draftContract
      ? (packet.checkpoint.state.flows.find(flow => flow.ref === journal.scopeId) || {}).id : journal.scopeId;
    if (journal.kind === 'plan' && !localFlowId) { checkEditorStorage(); return; }
    let point = recoveredSourceEditor ? recoveredSourceEditor.point : previous && previous.returnPoint;
    if (!point) {
      screen = journal.kind === 'plan' ? { type: 'workspace', view: 'folder:unfiled', selectedFlowId: localFlowId } : { type: 'item-detail', view: 'today', selectedFlowId: null, selectedItemId: journal.scopeId, itemContext: 'today' };
      point = editorPoint(null);
      point.node = null;
      point.selector = journal.kind === 'plan' ? '[data-action="open-plan-editor"]' : '[data-action="edit-item"]';
      point.index = 0;
    }
    const options = { storage, sessionId: 'editor-recovered-' + Date.now().toString(36) + '-' + (++editorSequence), returnPoint: point };
    // Restoring owned bytes is independent of displaying them. Keep the genuine
    // recovery token unconsumed until its editor can be shown with an exit path.
    if (![planItemSessions.SOURCE_PLAN_RECOVERY_VERSION, planItemSessions.STRUCTURE_PLAN_RECOVERY_VERSION].includes(journal.version)) {
      const display = PD.projectPersonalPlanDisplay({ checkpoint: packet.checkpoint, sourceRead: readCurrentPersonalSource(), sourceEpoch: readPersonalSourceEpoch() });
      if (!display.ok || journal.kind === 'plan' && display.mode === 'personal-execution-only') {
        recoveredSourceEditor = { recovery, point, localFlowId };
        editorRecoveryGate = { status: 'source-reopen', journal, message: '이전 저장 상태는 복구했지만 원문을 확인하지 못해 편집을 아직 열지 않았습니다. 복구한 입력은 그대로 보관합니다.' };
        editorRecoveryJournalRaw = null;
        render(); focusAfterRender('[data-testid="plan-item-recovery-gate"] h1');
        return;
      }
    }
    let session;
    try {
      if (editorRecoveryAdapter === legacyPlanItemSessions) {
        const baseline = planItemSessions.createSession({ sessionId: options.sessionId, kind: journal.kind, scopeId: journal.scopeId, draft: journal.baseline, returnPoint: point });
        const updated = planItemSessions.updateDraft(baseline, journal.draft);
        if (!updated.ok || !S.sameAuthority(storage, packet).ok) throw new Error('recovered-workspace-drift');
        session = updated.session;
      } else if ([planItemSessions.SOURCE_PLAN_RECOVERY_VERSION, planItemSessions.STRUCTURE_PLAN_RECOVERY_VERSION].includes(journal.version)) {
        const structure = journal.version === planItemSessions.STRUCTURE_PLAN_RECOVERY_VERSION;
        // A valid historical recovery and a current C editor can coexist with
        // an unreadable personal Undo. Keep the one-use token until both actual
        // display snapshots can be shown; never strand a resumed editor.
        const sourceEpoch = readPersonalSourceEpoch(), sourceRead = readCurrentPersonalSource();
        const display = PD.inspectPersonalPlanDisplayCandidate({ checkpoint: packet.checkpoint, candidateCheckpoint: packet.checkpoint,
          sourceRead, candidateSourceRead: sourceRead, sourceEpoch });
        const presentation = display.ok ? inspectEditorPresentation(journal.scopeId, true, structure) : { ok: false, reason: display.reason };
        const resume = structure ? planItemSessions.resumeRecoveredSourceBoundPersonalPlanStructureSession : planItemSessions.resumeRecoveredSourceBoundPersonalPlanSession;
        const reopened = presentation.ok ? resume(storage, recovery, { sessionId: options.sessionId, returnPoint: point, readSourceEpoch: readPersonalSourceEpoch }) : { ok: false, reason: presentation.reason };
        if (!reopened.ok) {
          recoveredSourceEditor = { recovery, point, localFlowId };
          editorRecoveryGate = { status: 'source-reopen', journal, message: personalEditorMessage(reopened.reason) };
          editorRecoveryJournalRaw = null;
          render(); focusAfterRender('[data-testid="plan-item-recovery-gate"] h1');
          return;
        }
        session = reopened.session; planEditorPresentation = presentation; recoveredSourceEditor = null;
      } else {
        if (journal.draftContract) {
          planEditorPresentation = inspectEditorPresentation(journal.scopeId, false);
          if (!planEditorPresentation.ok) throw new Error('recovered-plan-presentation-invalid');
        }
        session = planItemSessions.resumeRecoveredSession(recovery, options);
      }
    } catch (_) { checkEditorStorage(); return; }
    recoveredSourceEditor = null;
    editorRecoveryAdapter = planItemSessions;
    planSession = null;
    itemSession = null;
    replaceEditorSession(session);
    const marker = history.state && history.state[EDITOR_HISTORY_KEY];
    if (previous && marker && marker.sessionId === previous.sessionId) history.replaceState(Object.assign({}, history.state, { [EDITOR_HISTORY_KEY]: { version: 1, sessionId: session.sessionId } }), '', location.href);
    else pushEditorHistory(session);
    planDraft = session.kind === 'plan' ? copyScreen(session.draft) : null;
    itemDraft = session.kind === 'quick' ? copyScreen(session.draft) : null;
    editorExpectedRaw = packet.expectedCheckpointRaw;
    editorRecoveryGate = null;
    editorRecoveryJournalRaw = null;
    editorCommitCounted = false;
    editorFeedback = { state: 'noop', message: '이전 저장 상태를 복구했습니다. 편집 입력은 유지했으며 아직 다시 저장하지 않았습니다.' };
    screen = session.kind === 'plan' ? { type: 'plan-editor', view: point.screen.view || 'today', selectedFlowId: localFlowId } : { type: 'item-editor', view: point.screen.view || 'today', selectedFlowId: null, selectedItemId: session.scopeId };
    render();
    setSaveStatus('이전 상태 복구 · 편집 입력 유지', 'noop');
    focusAfterRender(session.kind === 'plan' ? isPersonalEditor(session) ? '[data-plan-mode="flow-title"]' : '[data-plan-field="flow-title"]' : '[data-item-field="title"]');
  }

  function discardRecoveredSourceDraft(confirmed) {
    if (!recoveredSourceEditor || !editorRecoveryGate || editorRecoveryGate.status !== 'source-reopen') return;
    if (!confirmed) {
      openDialog('보관된 편집을 버릴까요?', '<p>복구해 둔 입력만 버립니다. 저장된 개인 계획과 원문은 바꾸지 않습니다.</p><div class="dialog-actions"><button type="button" class="button primary" data-action="editor-keep-recovered">계속 보관</button><button type="button" class="button danger" data-action="editor-discard-recovered-confirm">편집 버리기</button></div>');
      return;
    }
    const packet = S.loadWorkspace(storage);
    if (!packet.ok) { editorRecoveryGate.message = '현재 저장 상태를 확인하지 못해 입력을 계속 보관합니다.'; if (elements.dialog.open) elements.dialog.close(); render(); return; }
    const previous = activeEditorSession(), flowId = recoveredSourceEditor.localFlowId;
    const destination = recoveredSourceEditor.recovery.journal.kind === 'plan'
      ? { type: 'workspace', view: 'folder:unfiled', selectedFlowId: flowId } : copyScreen(recoveredSourceEditor.point.screen);
    if (elements.dialog.open) elements.dialog.close();
    dialogSubmit = null; dialogReturnFocus = null;
    if (previous) consumeEditorHistory(previous);
    planSession = null; itemSession = null; planDraft = null; itemDraft = null; planEditorPresentation = null;
    recoveredSourceEditor = null; editorRecoveryGate = null; editorRecoveryJournalRaw = null; editorFeedback = null;
    adoptWorkspace(packet); reloadFeatureStores(false);
    screen = destination;
    render(); setSaveStatus('보관된 편집만 버렸어요. 저장된 내용은 그대로입니다.', 'noop');
    focusAfterRender('[data-action="open-plan-editor"]', '#main');
  }

  function recoveredDraftDiscardDialogOpen() {
    return Boolean(recoveredSourceEditor && editorRecoveryGate && editorRecoveryGate.status === 'source-reopen'
      && elements.dialog.open && elements.dialog.querySelector('[data-action="editor-discard-recovered-confirm"]'));
  }

  function openVerifiedEditorState() {
    if (!editorRecoveryGate || editorRecoveryGate.status !== 'none' || editorRecoveryGate.journalRaw || editorRecoveryJournalRaw || activeEditorSession()) return;
    try {
      const checked = S.loadWorkspace(storage);
      if (!checked.ok) throw new Error('unverified-workspace');
      adoptWorkspace(checked);
      editorRecoveryGate = null;
      normalizeScreen();
      render();
      setSaveStatus('현재 저장 상태를 확인해 열었어요. 저장소를 변경하지 않았습니다.', 'noop');
      focusAfterRender('#main');
    } catch (_) {
      editorRecoveryGate.message = '현재 저장 상태를 확인하지 못했습니다. 기존 값은 변경하지 않았습니다.';
      render();
    }
  }

  function clearEditorConfirmed() {
    if (editorRecoveryForeign) return;
    if (S.loadWorkspace(storage).reason === 'multiple-authorities') { checkEditorStorage(); return; }
    const expected = (editorRecoveryGate && editorRecoveryGate.journalRaw) || editorRecoveryJournalRaw;
    const result = editorRecoveryAdapter.clearConfirmedRecovery(storage, editorRecoveryOptions(expected));
    if (!result.ok) { checkEditorStorage(); return; }
    const packet = S.loadWorkspace(storage);
    if (!packet.ok || (editorRecoveryAdapter === planItemSessions && !result.canResume)) { checkEditorStorage(); return; }
    const journal = JSON.parse(expected);
    adoptWorkspace(packet);
    const session = activeEditorSession();
    editorRecoveryGate = null;
    if (session) {
      if (!editorCommitCounted) { successfulMutations += 1; lastUndoLane = 'workspace'; editorCommitCounted = true; }
      finishEditorClose(session, '저장 완료와 정리를 확인했습니다.', false);
      issuePlanSaveResult(session, session.attempt);
    } else {
      const flowId = journal.kind === 'plan' && journal.draftContract ? (packet.checkpoint.state.flows.find(flow => flow.ref === journal.scopeId) || {}).id : journal.scopeId;
      screen = journal.kind === 'plan' ? { type: 'workspace', view: 'folder:unfiled', selectedFlowId: flowId || null } : { type: 'item-detail', view: 'today', selectedFlowId: null, selectedItemId: journal.scopeId };
      render();
      focusAfterRender(journal.kind === 'plan' ? '[data-action="open-plan-editor"]' : '[data-action="edit-item"]', '#main');
    }
    editorRecoveryJournalRaw = null;
    setSaveStatus('저장 완료 · 복구 기록 정리 확인', 'saved');
  }

  function handleEditorHistory() {
    if (editorHistoryConsuming) {
      editorHistoryConsuming = false;
      syncEditorUI();
      renderPlanSaveResult();
      const restore = editorHistoryRestore;
      editorHistoryRestore = null;
      if (restore) restore();
      return true;
    }
    const session = activeEditorSession();
    if (!session) return false;
    const marker = history.state && history.state[EDITOR_HISTORY_KEY];
    if (marker && marker.sessionId === session.sessionId) return true;
    if (session.status !== 'clean' || session.pendingClose) pushEditorHistory(session);
    requestEditorClose('browser-back', session.status === 'clean');
    return true;
  }
  window.addEventListener('popstate', () => { if (!personalEntry.visitActive?.()) handleEditorHistory(); });

  function newPlanDraft(flow) {
    const itemIds = flow.steps.reduce((ids, step) => ids.concat(step.itemIds), []);
    return {
      flowId: flow.id,
      title: flow.title,
      items: itemIds.map(id => {
        const task = taskById(id);
        return { id, title: task.title, memo: typeof task.memo === 'string' ? task.memo : '', planDate: planDate(task) || null };
      })
    };
  }

  function resultItemIdentityAttributes(item) {
    return ' data-item-ref="' + escapeHtml(item.rowId) + '" data-source-item-ref="' + escapeHtml(item.sourceItemRef) + '" data-row-id="' + escapeHtml(item.rowId) + '" data-occurrence-id="' + escapeHtml(item.occurrenceId || '') + '" data-original-date="' + escapeHtml(item.originalDate || 'undated') + '" data-effective-date="' + escapeHtml(item.executionDate || 'undated') + '" data-completed="' + String(item.completed) + '"';
  }

  function resultItemSummary(item) {
    const original = item.originalDate || item.date || '날짜 미정';
    const occurrence = item.occurrenceIndex ? item.occurrenceIndex + '회차 · ' : '';
    return (item.sectionTitle ? item.sectionTitle + ' · ' : '') + occurrence + '계획 ' + original + (item.executionDate !== item.originalDate ? ' · 실행 ' + (item.executionDate || '미정') : '') + (item.time ? ' · 시간 ' + item.time : '') + ' · ' + (item.completed ? '완료' : '진행 중');
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

  function renderResultItem(item, view, flowId, readOnly) {
    const identity = resultItemIdentityAttributes(item);
    if (readOnly) return '<article class="result-occurrence"' + identity + '><button class="result-item" type="button" data-action="entry-open-item" data-id="'
      + escapeHtml(item.id) + '" aria-label="' + escapeHtml(item.title + ' 상세 열기') + '"><span aria-hidden="true">' + (item.completed ? '✓' : '○')
      + '</span><span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(resultItemSummary(item))
      + '</small></span></button>' + (view === 'calendar' ? renderOccurrenceFacts(item) : '') + '</article>';
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
    const shiftAction = scope === 'entry' ? 'entry-calendar-shift' : scope === 'authoring' ? 'authoring-calendar-shift' : 'result-calendar-shift';
    const selectAction = scope === 'entry' ? 'entry-calendar-select' : scope === 'authoring' ? 'authoring-calendar-select' : 'result-calendar-select';
    const itemRenderer = scope === 'authoring'
      ? item => renderStaticResultItem(item, true)
      : item => renderResultItem(item, 'calendar', flowId, scope === 'entry');
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

  function renderPersonalEntryResult(flow, presentation) {
    const projection = presentation.projection, view = presentation.view;
    const tabs = [['txt', 'Text'], ['todo', '할 일'], ['calendar', '캘린더'], ['sheet', '표']].map(entry => '<button id="personal-entry-tab-'
      + entry[0] + '" type="button" role="tab" data-action="entry-tab" data-view="' + entry[0] + '" aria-selected="'
      + String(view === entry[0]) + '" aria-controls="personal-entry-result-body" tabindex="' + (view === entry[0] ? '0' : '-1') + '">' + entry[1] + '</button>').join('');
    let body;
    if (view === 'txt') body = '<pre class="result-txt">' + escapeHtml(projection.txt) + '</pre>';
    else if (view === 'todo') body = '<div class="result-list">' + projection.items.map(item => renderResultItem(item, 'todo', flow.id, true)).join('') + '</div>';
    else if (view === 'calendar') body = renderResultCalendar(projection, 'entry', flow.id);
    else body = '<div class="result-sheet-scroll" tabindex="0" aria-label="개인 사본 표, 가로로 스크롤 가능"><table class="result-sheet"><caption>개인 사본 실행 회차</caption>'
      + '<thead><tr><th>순서</th><th>회차</th><th>구간</th><th>할 일</th><th>원 발생일</th><th>실행 날짜</th><th>시간</th><th>상태</th></tr></thead><tbody>'
      + projection.sheet.map(row => '<tr data-item-ref="' + escapeHtml(row.itemRef) + '" data-source-item-ref="' + escapeHtml(row.sourceItemRef)
        + '" data-occurrence-id="' + escapeHtml(row.occurrenceId || '') + '"><td>' + row.order + '</td><td>' + escapeHtml(row.occurrenceIndex ? row.occurrenceIndex + '회차' : '—')
        + '</td><td>' + escapeHtml(row.sectionTitle || '—') + '</td><td>' + escapeHtml(row.title) + '</td><td>'
        + escapeHtml(row.originalDate || '미정') + '</td><td>' + escapeHtml(row.executionDate || '미정') + '</td><td>' + escapeHtml(row.time || '미정') + '</td><td>' + escapeHtml(row.status) + '</td></tr>').join('') + '</tbody></table></div>';
    const horizon = projection.occurrenceManifest.hasMore ? '<div class="result-horizon"><span>같은 회차 범위를 네 결과에 표시합니다.</span><button class="button" type="button" data-action="entry-more-occurrences"'
      + (presentation.page >= 130 ? ' disabled' : '') + '>회차 더 보기</button></div>' : '';
    return '<section class="result-panel" data-testid="personal-entry-result" data-read-only="true" data-flow-ref="' + escapeHtml(projection.flowRef)
      + '" data-result-view="' + escapeHtml(view) + '" data-result-item-refs="' + escapeHtml(JSON.stringify(projection.itemRefs))
      + '" data-result-source-item-refs="' + escapeHtml(JSON.stringify(projection.sourceItemRefs)) + '" data-result-row-ids="' + escapeHtml(JSON.stringify(projection.rowIds)) + '" data-result-occurrence-ids="'
      + escapeHtml(JSON.stringify(projection.occurrenceIds)) + '"><p>내 사본의 제목·계획·실행 상태입니다. 여기서는 내용을 바꾸지 않습니다.</p>' + horizon
      + '<div class="result-tabs" role="tablist" aria-label="네 가지 결과 보기">' + tabs + '</div><div id="personal-entry-result-body" class="result-body" role="tabpanel" aria-labelledby="personal-entry-tab-'
      + view + '" tabindex="0">' + body + '</div></section>';
  }

  function renderResultPanel(flow, presentation) {
    if (presentation && presentation.readOnly === true) return renderPersonalEntryResult(flow, presentation);
    if (personalExecutionOnly()) return '<p role="status">원문 상태를 확인하기 전에는 네 가지 결과를 표시하지 않습니다.</p>';
    const projection = personalResultProjection(flow.id);
    if (!projection) return '<p role="status">원문과 개인 계획의 구간·순서를 확인하지 못해 결과를 열지 않았습니다. 저장된 내용은 그대로이며 목록으로 돌아와 다시 열 수 있어요.</p>';
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
      const fallback = projection.timelineOrderFallbacks || [];
      body = (fallback.length ? '<p class="timeline-result-fallback" data-result-order-fallback="' + escapeHtml(JSON.stringify(fallback)) + '">반복 회차가 있거나 날짜별 순서를 확인하지 못한 날은 이 Flow의 Plan 순서로 표시합니다.</p>' : '') + renderResultCalendar(projection, 'flow', flow.id);
    } else {
      body = '<div class="result-sheet-head"><span>원본 Item과 실행 회차를 분리한 읽기 전용 표입니다.</span><button class="button" type="button" data-action="download-result-csv" data-flow-id="' + escapeHtml(flow.id) + '">CSV 다운로드</button></div><div class="result-sheet-scroll" tabindex="0" aria-label="실행 회차 표, 가로로 스크롤 가능"><table class="result-sheet"><caption class="visually-hidden">실행 회차 표 보기</caption><thead><tr><th>순서</th><th>회차</th><th>구간</th><th>할 일</th><th>원 발생일</th><th>실행 날짜</th><th>시간</th><th>상태</th></tr></thead><tbody>' + projection.sheet.map(row => '<tr data-item-ref="' + escapeHtml(row.itemRef) + '" data-source-item-ref="' + escapeHtml(row.sourceItemRef) + '" data-occurrence-id="' + escapeHtml(row.occurrenceId || '') + '"><td>' + row.order + '</td><td>' + escapeHtml(row.occurrenceIndex ? row.occurrenceIndex + '회차' : '—') + '</td><td>' + escapeHtml(row.sectionTitle || '—') + '</td><td>' + escapeHtml(row.title) + '</td><td>' + escapeHtml(row.originalDate || '미정') + '</td><td>' + escapeHtml(row.executionDate || '미정') + '</td><td>' + escapeHtml(row.time || '미정') + '</td><td>' + escapeHtml(row.status) + '</td></tr>').join('') + '</tbody></table></div>';
    }
    return '<section class="result-panel" data-testid="standalone-result-surface" data-flow-ref="' + escapeHtml(projection.flowRef) + '" data-result-view="' + escapeHtml(resultView) + '" data-result-item-refs="' + escapeHtml(JSON.stringify(projection.itemRefs)) + '" data-result-source-item-refs="' + escapeHtml(JSON.stringify(projection.sourceItemRefs)) + '" data-result-row-ids="' + escapeHtml(JSON.stringify(projection.rowIds)) + '" data-result-occurrence-ids="' + escapeHtml(JSON.stringify(projection.occurrenceIds)) + '"><div class="result-head"><div><p class="eyebrow">Flow 결과</p><h2>다른 방식으로 보기</h2></div></div><details class="working-source" data-working-source-kind="' + escapeHtml(projection.workingSource.kind) + '"><summary>원문 보기</summary><p>개인 편집은 원문을 바꾸지 않아요.</p><pre>' + escapeHtml(projection.workingSource.rawText) + '</pre></details>' + horizon + '<div class="result-tabs" role="tablist" aria-label="네 가지 결과 보기">' + tabs + '</div><div id="standalone-result-panel" class="result-body" role="tabpanel" aria-labelledby="standalone-result-tab-' + escapeHtml(resultView) + '" tabindex="0" data-result-manifest="' + escapeHtml(JSON.stringify(projection.itemRefs)) + '" data-occurrence-manifest="' + escapeHtml(JSON.stringify(projection.occurrenceIds)) + '">' + body + '</div></section>';
  }

  function personalTextBaseline(scope, field, ref) {
    const inherited = scope === 'plan' ? planEditorPresentation.baseline : planEditorPresentation.baseline.items[ref];
    const capability = planEditorPresentation.capabilities;
    const owner = field === 'memo' ? 'existing-personal-baseline' : capability
      ? (scope === 'plan' ? capability.title.owner : capability.items[ref].title.owner) : 'existing-personal-baseline';
    return field === 'memo' ? { owner, present: inherited.memoPresent, ...(inherited.memoPresent ? { value: inherited.memo } : {}) }
      : { owner, present: true, value: inherited.title };
  }
  function personalScheduleBaseline(ref) {
    return { owner: planEditorPresentation.capabilities ? planEditorPresentation.capabilities.items[ref].schedule.owner : 'existing-personal-baseline',
      date: planEditorPresentation.baseline.items[ref].planDate };
  }
  function personalTextValue(draft, baseline) { return draft.mode === 'override' ? draft.value : baseline.present ? baseline.value : ''; }
  function draftSectionForItem(ref) {
    if (!isStructureEditor(planSession) || !planEditorPresentation.structure) return null;
    return planEditorPresentation.structure.sections.find(section => section.itemRefs.includes(ref)) || null;
  }
  function draftSectionTitle(section) {
    if (!section) return '';
    const draft = section.sectionId && planDraft.sectionTitles[section.sectionId];
    return draft && draft.mode === 'override' ? draft.value : section.sourceTitle;
  }
  function syncPlanSectionLabels() {
    if (!isStructureEditor(planSession) || itemSession) return;
    document.querySelectorAll('[data-testid="standalone-plan-editor"] .plan-edit-item').forEach(row => {
      const index = planDraft.orderedItemRefs.indexOf(row.dataset.itemRef);
      const label = row.querySelector('.plan-item-summary small');
      if (index >= 0 && label) label.textContent = (index + 1) + ' · ' + draftSectionTitle(draftSectionForItem(row.dataset.itemRef));
    });
  }
  function renderPlanSectionControls() {
    if (!isStructureEditor(planSession)) return '';
    const sections = planEditorPresentation.structure.sections.filter(section => section.editCapability === 'poc-shadow');
    if (!sections.length) return '<p class="personal-control-baseline" data-plan-sections-readonly>구간 이름은 원본을 따릅니다. 할 일 순서는 아래에서 바꿀 수 있어요.</p>';
    return '<section class="plan-section-controls" aria-labelledby="plan-section-heading"><h2 id="plan-section-heading">내 구간 이름</h2><p>원본 구간과 소속은 유지하고, 이 계획에 표시할 이름만 바꿉니다.</p>' + sections.map((section, index) => {
      const draft = planDraft.sectionTitles[section.sectionId], id = 'plan-section-' + index;
      const mode = '<select id="' + id + '-mode" data-section-mode="' + escapeHtml(section.sectionId) + '"><option value="inherit"' + (draft.mode === 'inherit' ? ' selected' : '') + '>원본 따르기</option><option value="override"' + (draft.mode === 'override' ? ' selected' : '') + '>직접 입력</option></select>';
      const value = draft.mode === 'override' ? '<textarea id="' + id + '-value" data-section-field="' + escapeHtml(section.sectionId) + '" aria-label="' + (index + 1) + '번째 구간 이름 직접 입력" rows="2">' + (/^[\r\n]/.test(draft.value) ? '\n' : '') + escapeHtml(draft.value) + '</textarea>' : '<p class="personal-control-baseline">현재 원본 값: ' + escapeHtml(section.sourceTitle) + '</p>';
      return '<div class="field personal-plan-control" data-plan-section-id="' + escapeHtml(section.sectionId) + '"><label for="' + id + '-mode">' + (index + 1) + '번째 구간 · ' + escapeHtml(section.sourceTitle) + '</label>' + mode + value + '</div>';
    }).join('') + '</section>';
  }
  function changePlanOrder(control) {
    if (!isStructureEditor(planSession) || itemSession || editorLocked() || planSession.pendingClose) return;
    const refs = planDraft.orderedItemRefs.slice(), previous = JSON.stringify(refs);
    let index = -1, direction = 0;
    if (control.dataset.action === 'plan-order-reset') refs.splice(0, refs.length, ...planEditorPresentation.baseline.orderedItemRefs);
    else {
      index = refs.indexOf(control.dataset.itemRef); direction = Number(control.dataset.direction);
      if (index < 0 || ![-1, 1].includes(direction) || index + direction < 0 || index + direction >= refs.length) return;
      [refs[index], refs[index + direction]] = [refs[index + direction], refs[index]];
    }
    if (JSON.stringify(refs) === previous) return;
    planDraft.orderedItemRefs = refs; updateEditorDraft();
    editorFeedback = { state: 'noop', message: '할 일 순서를 바꿨어요. Plan 전체 저장 전까지는 저장되지 않습니다.' };
    render();
    const row = '[data-testid="standalone-plan-editor"] [data-item-ref="' + CSS.escape(control.dataset.itemRef || '') + '"]';
    focusAfterRender(index < 0 ? '[data-action="plan-order-reset"]' : row + ' [data-direction="' + direction + '"]:not(:disabled)', row + ' button:not(:disabled)');
  }
  function renderPersonalPlanEditor(flow) {
    if (!planSession || planSession.scopeId !== flow.ref || !planEditorPresentation || !planDraft || planDraft.flowRef !== flow.ref) {
      return '<section class="plan-item-save-feedback" role="alert"><h1>편집 대상을 확인하지 못했어요.</h1><p>입력과 저장된 내용은 변경하지 않았습니다.</p></section>';
    }
    const structure = isStructureEditor(planSession);
    const refs = structure ? planDraft.orderedItemRefs : flow.steps.flatMap(step => step.itemIds).map(id => taskById(id).ref);
    const rows = refs.map((ref, index) => {
      const task = state().tasks.find(entry => entry.ref === ref && entry.flowId === flow.id), draft = task && planDraft.items[task.ref];
      if (!draft) throw new Error('personal-plan-item-identity-mismatch');
      const title = personalTextValue(draft.title, personalTextBaseline('item', 'title', task.ref));
      const date = draft.schedule.mode === 'fixed_date' ? draft.schedule.date : draft.schedule.mode === 'unscheduled' ? null : personalScheduleBaseline(task.ref).date;
      const memo = personalTextBaseline('item', 'memo', task.ref);
      const order = structure ? '<div class="plan-order-actions" role="group" aria-label="' + escapeHtml(title) + ' 순서 이동">' + [[-1, '위로'], [1, '아래로']].map(([direction, label]) => {
        const boundary = index + direction < 0 || index + direction >= refs.length;
        return '<button type="button" class="button" data-action="plan-order-move" data-item-ref="' + escapeHtml(ref) + '" data-direction="' + direction + '" data-plan-order-boundary="' + boundary + '"' + (boundary ? ' disabled' : '') + ' aria-label="' + escapeHtml(title + ' ' + label) + '">' + label + '</button>';
      }).join('') + '</div>' : '';
      return '<article class="plan-edit-item" data-item-id="' + escapeHtml(task.id) + '" data-item-ref="' + escapeHtml(task.ref) + '"><div class="plan-item-summary"><div><small>' + (structure ? (index + 1) + ' · ' + escapeHtml(draftSectionTitle(draftSectionForItem(ref))) : 'Item') + '</small><strong>' + escapeHtml(title) + '</strong><span>계획 ' + escapeHtml(date ? dateLabel(date) : '날짜 미정') + (draft.memo.mode === 'override' || memo.present ? ' · 개인 메모 있음' : '') + '</span></div><button class="button" type="button" data-action="open-plan-item-editor" data-id="' + escapeHtml(task.id) + '" data-return-focus="plan-item-' + escapeHtml(task.id) + '">수정</button></div>' + order + '<div class="source-item"><small>원본 정보</small><strong>' + escapeHtml(sourceTitle(task)) + '</strong><span>원본 일정 · ' + escapeHtml(task.sourceDate || '미정') + '</span>' + renderItemSourceDetails(task) + '</div></article>';
    }).join('');
    return '<button class="detail-back" type="button" data-action="close-plan-editor">← Flow로</button><section class="plan-editor" data-product-plan-item-grammar="v1" data-testid="standalone-plan-editor" data-editor-draft-contract="' + escapeHtml(planSession.draftContract) + '" data-editor-persistence-scope="poc-shadow-only"><header><p class="eyebrow">Plan 편집</p><h1>' + escapeHtml(flowDisplayTitle(flow)) + '</h1><p>Item에서 반영한 변경을 모아 마지막에 한 번 저장합니다. 원문·완료·실행 위치는 바꾸지 않습니다.</p></header><section class="source-read-only" data-editor-field-group="source-read-only"><p class="eyebrow">원본 정보</p><strong>' + escapeHtml(sourceTitle(flow)) + '</strong><span>' + escapeHtml(flow.originLabel) + '</span>' + (flow.rawText !== null ? '<pre>' + escapeHtml(flow.rawText) + '</pre>' : '') + '</section>'
      + PC.renderTextControl({ scope: 'plan', field: 'flow-title', draft: planDraft.title, baseline: personalTextBaseline('plan', 'title') })
      + renderPlanSectionControls() + '<section class="plan-edit-list"><h2>' + (structure ? '할 일 순서' : 'Item') + '</h2>' + (structure ? '<p>구간을 넘어서 순서를 바꿀 수 있어요. 각 할 일의 구간 소속과 실행 날짜는 그대로입니다.</p><button class="button" type="button" data-action="plan-order-reset">원래 순서로</button>' : '') + rows + '</section><div class="detail-toolbar plan-save-bar"><button class="button" type="button" data-action="close-plan-editor">취소</button><button class="button primary" type="button" data-action="commit-plan-editor">Plan 전체 저장</button></div></section>';
  }

  function renderPlanEditor(flow) {
    if (isPersonalEditor(planSession)) return renderPersonalPlanEditor(flow);
    if (!planDraft || planDraft.flowId !== flow.id) planDraft = newPlanDraft(flow);
    const source = '<section class="source-read-only" data-editor-field-group="source-read-only"><p class="eyebrow">원본 정보</p><strong>' + escapeHtml(sourceTitle(flow)) + '</strong><span>' + escapeHtml(flow.originLabel) + '</span>' + (flow.rawText !== null ? '<pre>' + escapeHtml(flow.rawText) + '</pre>' : '') + '</section>';
    const rows = planDraft.items.map(draft => {
      const task = taskById(draft.id);
      return '<article class="plan-edit-item" data-item-id="' + escapeHtml(draft.id) + '" data-item-ref="' + escapeHtml(task.ref || '') + '"><div class="plan-item-summary"><div><small>Item</small><strong>' + escapeHtml(draft.title) + '</strong><span>' + escapeHtml(draft.planDate ? dateLabel(draft.planDate) : '날짜 미정') + (draft.memo ? ' · 메모 있음' : '') + '</span></div><button class="button" type="button" data-action="open-plan-item-editor" data-id="' + escapeHtml(draft.id) + '" data-return-focus="plan-item-' + escapeHtml(draft.id) + '">수정</button></div><div class="source-item"><small>원본 정보</small><strong>' + escapeHtml(sourceTitle(task)) + '</strong><span>처음 계획한 날짜 · ' + escapeHtml(task.sourceDate || '미정') + '</span>' + renderItemSourceDetails(task) + '</div></article>';
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
    if (!task || itemSession || editorLocked()) return;
    itemEditorReturn = { screen: copyScreen(screen), focusSelector: returnFocusSelector(opener) };
    if (task.flowId) {
      const flow = flowById(task.flowId);
      if (!flow) return;
      if (flow.origin === 'authoring-handoff' && sourceCandidateBlocked()) { setSaveStatus('원문 비교 저장소를 확인하지 못해 Item 편집을 열지 않았어요.', 'error'); return; }
      if (planSession && planSession.scopeId !== (isPersonalEditor(planSession) ? flow.ref : flow.id)) return;
      if (!planSession) {
        if (!beginEditorRoot('plan', flow.ref, null, editorPoint(opener))) return;
        planDraft = copyScreen(planSession.draft);
      }
      if (!planDraft || (isPersonalEditor(planSession) ? planDraft.flowRef !== flow.ref : planDraft.flowId !== flow.id)) return;
      if (screen.type === 'plan-editor') updateEditorDraft();
      const staged = isPersonalEditor(planSession) ? planDraft.items[task.ref] : planDraft.items.find(entry => entry.id === task.id);
      if (!staged) return;
      if (!isPersonalEditor(planSession)) itemDraft = { mode: 'plan', id: task.id, flowId: task.flowId, title: staged.title, memo: staged.memo, planDate: staged.planDate };
      const parentPoint = editorPoint(opener);
      parentPoint.screen = { type: 'plan-editor', view: screen.view || 'today', selectedFlowId: flow.id };
      parentPoint.selector = '[data-return-focus="plan-item-' + CSS.escape(task.id) + '"]';
      parentPoint.node = null;
      parentPoint.index = 0;
      let child;
      try {
        const options = { ...sourceEditorOptions(), sessionId: 'editor-item-' + (++editorSequence), itemRef: task.ref, returnPoint: parentPoint };
        child = isSourceEditor(planSession) ? (isStructureEditor(planSession) ? planItemSessions.createSourceBoundPersonalPlanStructureChild : planItemSessions.createSourceBoundPersonalPlanChild)(storage, planSession, options)
          : isPersonalEditor(planSession) ? planItemSessions.createChildSession(planSession, options)
          : planItemSessions.createChildSession(planSession, { sessionId: options.sessionId, itemId: task.id, draft: itemDraft, returnPoint: parentPoint });
        if (isPersonalEditor(child)) itemDraft = copyScreen(child.draft);
      }
      catch (_) {
        itemDraft = null;
        screen = parentPoint.screen;
        editorFeedback = { state: 'invalid', message: '편집 대상이 달라 Item을 열지 않았어요. 부모 Plan의 입력은 유지했습니다.' };
        render();
        return;
      }
      itemSession = child;
      itemSummaryPage = 0;
      pushEditorHistory(itemSession);
    } else {
      if (planSession) return;
      itemDraft = { mode: 'quick', id: task.id, flowId: null, title: task.title, memo: task.memo || '', date: task.date, folderId: task.folderId };
      if (!beginEditorRoot('quick', task.id, itemDraft, editorPoint(opener))) { itemDraft = null; return; }
    }
    editorFeedback = null;
    editorLastInputPoint = null;
    screen = { type: 'item-editor', view: screen.view || 'today', selectedFlowId: task.flowId, selectedItemId: task.id, itemContext: screen.itemContext || screen.view || 'today' };
    render();
    focusAfterRender(isPersonalEditor(itemSession) ? '[data-item-mode="title"]' : '[data-item-field="title"]', '[data-action="close-item-editor"]');
  }

  function closeItemEditor(message) {
    requestEditorClose('cancel', false);
  }

  function renderItemDetail(task) {
    const section = personalItemSection(task);
    if (section && section.ok === false) return '<button class="detail-back" type="button" data-action="close-item-detail">← 이전 화면으로</button><section class="item-detail" data-testid="standalone-item-structure-blocked"><h1>항목을 함께 표시할 수 없어요.</h1><p role="status">원문과 개인 구간·Undo를 확인하지 못해 상세와 편집을 열지 않았습니다. 저장된 내용은 그대로입니다.</p></section>';
    const flow = task.flowId ? flowById(task.flowId) : null;
    const title = task.title;
    const context = screen.itemContext || screen.view || 'today';
    const backLabel = itemReturn && itemReturn.screen.selectedFlowId ? 'Flow로' : contextLabel(screen.view || 'today') + '으로';
    const source = flow && !personalExecutionOnly()
      ? '<section class="item-source" data-source-snapshot="true"><p class="eyebrow">원본 정보</p><strong>' + escapeHtml(sourceTitle(task)) + '</strong><span>처음 계획한 날짜 · ' + escapeHtml(task.sourceDate || '미정') + '</span>' + renderItemSourceDetails(task) + '<p>여기서 바꾸는 실행 날짜는 원래 계획을 바꾸지 않아요.</p></section>'
      : '';
    const memo = typeof task.memo === 'string' ? task.memo === '' ? '(빈 메모)' : task.memo : '메모 없음';
    return '<button class="detail-back" type="button" data-action="close-item-detail">← ' + escapeHtml(backLabel) + '</button><article class="item-detail" data-product-plan-item-grammar="v1" data-testid="standalone-item-detail" data-item-id="' + escapeHtml(task.id) + '" data-item-ref="' + escapeHtml(task.ref || '') + '"><header><div class="meta"><span class="origin">' + escapeHtml(flow ? 'Flow Item' : '빠른 할 일') + '</span><span>' + escapeHtml(flow ? flowDisplayTitle(flow) : folderTitle(task.folderId)) + '</span></div><h1 tabindex="-1" data-item-detail-heading>' + escapeHtml(title) + '</h1><p>' + (task.done ? '완료한 항목입니다.' : '진행 중인 항목입니다.') + '</p></header><section class="item-facts" aria-label="Item 정보"><div><span>실행 날짜</span><strong>' + escapeHtml(dateLabel(task.date)) + '</strong></div>' + (task.time ? '<div><span>실행 시간</span><strong>' + escapeHtml(task.time) + '</strong></div>' : '') + '<div data-item-personal-memo><span>내 메모</span><strong>' + escapeHtml(memo) + '</strong></div><div><span>폴더</span><strong>' + escapeHtml(folderTitle(flow ? flow.folderId : task.folderId)) + '</strong></div></section>' + (section ? '<p class="personal-control-baseline" data-item-effective-section>구간 · ' + escapeHtml(section.title) + '</p>' : '') + source + '<div class="detail-toolbar item-actions"><button class="button primary" type="button" data-action="edit-item" data-id="' + escapeHtml(task.id) + '" data-return-focus="item-edit-' + escapeHtml(task.id) + '"' + (flow && personalExecutionOnly() ? ' disabled' : '') + '>' + (flow ? 'Plan에서 수정' : '수정') + '</button><button class="button" type="button" data-action="task-menu" data-move-kind="task" data-move-source="detail" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(context) + '" aria-controls="move-panel" aria-expanded="' + Boolean(moveTarget && moveTarget.kind === 'task' && moveTarget.id === task.id) + '">날짜·위치 이동</button><button class="button" type="button" data-action="toggle-complete" data-id="' + escapeHtml(task.id) + '">' + (task.done ? '다시 열기' : '완료') + '</button>' + (flow ? '' : '<button class="button danger" type="button" data-action="move-to-trash" data-kind="quick" data-id="' + escapeHtml(task.id) + '">휴지통으로</button>') + '</div></article>';
  }

  function renderPersonalItemEditor(task) {
    if (!itemDraft || itemDraft.itemRef !== task.ref || !planEditorPresentation) return renderItemDetail(task);
    const flow = flowById(task.flowId);
    return '<button class="detail-back" type="button" data-action="close-item-editor">← 취소</button><section class="item-editor" data-product-plan-item-grammar="v1" data-testid="standalone-item-editor" data-editor-mode="plan" data-editor-draft-contract="' + escapeHtml(itemSession.draftContract) + '"><header><p class="eyebrow">Item 편집</p><h1>' + escapeHtml(task.title) + '</h1></header><section class="item-source" data-source-snapshot="true"><p class="eyebrow">원본 정보</p><strong>' + escapeHtml(sourceTitle(task)) + '</strong><span>원본 일정 · ' + escapeHtml(task.sourceDate || '미정') + '</span>' + renderItemSourceDetails(task) + '</section>'
      + PC.renderTextControl({ scope: 'item', field: 'title', draft: itemDraft.title, baseline: personalTextBaseline('item', 'title', task.ref) })
      + PC.renderTextControl({ scope: 'item', field: 'memo', draft: itemDraft.memo, baseline: personalTextBaseline('item', 'memo', task.ref) })
      + PC.renderScheduleControl({ draft: itemDraft.schedule, baseline: personalScheduleBaseline(task.ref) })
      + '<div class="inherited-folder"><span>실행 위치 · 읽기 전용</span><strong>' + escapeHtml(dateLabel(task.date)) + (task.time ? ' · ' + escapeHtml(task.time) : '') + '</strong><span>폴더 · ' + escapeHtml(folderTitle(flow.folderId)) + '</span><small>Flow의 폴더를 함께 사용합니다. 여기서는 실행 날짜·완료 상태를 바꾸지 않습니다.</small></div><p class="editor-guidance">이 Item을 Plan에 반영한 뒤, Plan 전체 저장을 눌러 확정하세요.</p><div class="detail-toolbar item-save-bar"><button class="button" type="button" data-action="close-item-editor">취소</button><button class="button primary" type="button" data-action="save-item-editor">Plan에 반영</button></div></section>';
  }
  function renderItemEditor(task) {
    if (isPersonalEditor(itemSession)) return renderPersonalItemEditor(task);
    if (!itemDraft || itemDraft.id !== task.id) return renderItemDetail(task);
    const flow = task.flowId ? flowById(task.flowId) : null;
    const source = flow
      ? '<section class="item-source" data-source-snapshot="true"><p class="eyebrow">원본 정보</p><strong>' + escapeHtml(sourceTitle(task)) + '</strong><span>처음 계획한 날짜 · ' + escapeHtml(task.sourceDate || '미정') + '</span>' + renderItemSourceDetails(task) + '</section>'
      : '';
    const dateValue = itemDraft.mode === 'plan' ? itemDraft.planDate : itemDraft.date;
    const folder = itemDraft.mode === 'quick'
      ? '<label class="field"><span>폴더</span><select data-item-field="folder">' + folderOptions(itemDraft.folderId, true) + '</select></label>'
      : '<div class="inherited-folder"><span>폴더</span><strong>' + escapeHtml(folderTitle(flow ? flow.folderId : null)) + '</strong><small>Flow의 폴더를 함께 사용합니다.</small></div>';
    const guidance = itemDraft.mode === 'plan'
      ? '<p class="editor-guidance">이 Item을 Plan에 반영한 뒤, Plan 전체 저장을 눌러 확정하세요.</p>'
      : '<p class="editor-guidance">저장하면 이 빠른 할 일만 바뀌고 되돌릴 수 있어요.</p>';
    return '<button class="detail-back" type="button" data-action="close-item-editor">← 취소</button><section class="item-editor" data-product-plan-item-grammar="v1" data-testid="standalone-item-editor" data-editor-mode="' + escapeHtml(itemDraft.mode) + '"><header><p class="eyebrow">Item 편집</p><h1>' + escapeHtml(task.title) + '</h1></header>' + source + '<label class="field"><span>Item 제목</span><input data-item-field="title" value="' + escapeHtml(itemDraft.title) + '" maxlength="120"></label><label class="field"><span>내 메모</span><textarea data-item-field="memo" rows="4">' + escapeHtml(itemDraft.memo) + '</textarea></label><label class="field"><span>계획 날짜</span><input type="date" data-item-field="date" value="' + escapeHtml(dateValue || '') + '"></label>' + folder + guidance + '<div class="detail-toolbar item-save-bar"><button class="button" type="button" data-action="close-item-editor">취소</button><button class="button primary" type="button" data-action="save-item-editor">' + (itemDraft.mode === 'plan' ? 'Plan에 반영' : '저장') + '</button></div></section>';
  }

  function renderSourceUpdateBanner(flow) {
    if (!flow || flow.origin !== 'authoring-handoff') return '';
    if (sourceCandidateBlocked()) {
      return '<aside class="source-update-banner is-blocked" data-testid="standalone-source-update-unavailable"><div><span class="source-update-local-badge">로컬 검증 후보</span><strong>원문 업데이트 확인을 사용할 수 없어요.</strong><p>저장 영역을 안전하게 읽지 못해 기존 내용을 그대로 두었습니다.</p></div></aside>';
    }
    const durable = M.readLocalSourcePracticeContext(sourceCandidateStore, envelope.state, flow.id);
    const preview = sourceCandidatePreview(flow);
    if (!durable.ok || !preview) return '';
    const applied = durable.catalog.appliedVersion;
    const appliedHtml = applied ? '<aside class="source-update-banner is-applied" data-testid="standalone-source-update-applied"><div><strong>연습용 원문 변경을 이 사본에 적용했어요.</strong><p>개인 폴더·날짜·완료 상태는 그대로 유지했습니다.</p></div>' + (durable.catalog.undo.available ? '<button class="button" type="button" data-action="source-update-undo" data-flow-id="' + escapeHtml(flow.id) + '" data-candidate-id="' + escapeHtml(applied.candidateId) + '">이전 원문으로 되돌리기</button>' : '') + '</aside>' : '';
    const records = preview.catalog.candidates.filter(entry => entry.status !== 'applied');
    if (!records.length) return appliedHtml;
    const actions = records.map((entry, index) => '<button class="button" type="button" data-action="open-source-update-review" data-flow-id="' + escapeHtml(flow.id) + '" data-candidate-id="' + escapeHtml(entry.candidateId) + '">비교 ' + (index + 1) + ' 이어가기 · 결정 ' + entry.resolvedCount + '/' + entry.changeCount + (entry.status === 'deferred' ? ' · 보류' : '') + '</button>').join('');
    return appliedHtml + '<aside class="source-update-banner" data-testid="standalone-source-update-banner"><div><strong>보관된 로컬 비교 ' + records.length + '개</strong><p>' + (preview.observationStale ? '저장된 원문 상태가 달라졌습니다. 기존 선택을 확인하고 현재 원문으로 다시 비교해 주세요.' : '적용 전 선택은 이 실행 중에만 유지됩니다.') + '</p></div><div class="source-update-banner-actions">' + actions + '</div></aside>';
  }

  function sourceUpdateChangeLabel(change, index) {
    const target = change.scope === 'flow' ? 'Flow 정보' : 'Item';
    const kind = change.kind === 'added' ? '추가' : change.kind === 'removed' ? '삭제' : '변경';
    return (index + 1) + '. ' + target + ' ' + kind;
  }

  function sourceUpdateChoiceLabels(change) {
    if (change.kind === 'added') return { mine: '추가하지 않기', incoming: '새 항목 추가' };
    if (change.kind === 'removed') return { mine: '이전 항목 유지', incoming: '새 원문처럼 제외' };
    return { mine: '내 작업 유지', incoming: '새 원문 선택' };
  }

  function sourceUpdateRevisionValue(revision, change) {
    if (!revision || !change) return '<strong>없음</strong>';
    if (change.scope === 'flow') {
      return '<strong>' + escapeHtml(revision.projectedFlow.title) + '</strong><span>Flow 이름</span><pre>' + escapeHtml(revision.rawText) + '</pre>';
    }
    const item = revision.projectedFlow.items.find(entry => entry.ref === change.itemRef);
    if (!item) return '<strong>없음</strong><span>이 원문에는 해당 Item이 없습니다.</span>';
    return '<strong>' + escapeHtml(item.title) + '</strong><span>날짜 · ' + escapeHtml(item.sourceDate || '미정') + '</span>' + (item.description ? '<p>' + escapeHtml(item.description) + '</p>' : '');
  }

  function renderSourceUpdateReview(flow) {
    if (!sourceUpdateSession || sourceUpdateSession.flowId !== flow.id) return '';
    const session = sourceUpdateSession;
    const candidate = session.candidate;
    const review = session.workingStore.reviews[session.candidateId];
    const selectedIndex = Math.max(0, candidate.changes.findIndex(change => change.changeId === session.selectedChangeId));
    const change = candidate.changes[selectedIndex];
    const resolution = review && review.resolutions[change.changeId];
    const unresolved = candidate.changes.filter(entry => !review || review.resolutions[entry.changeId] === undefined).length;
    const labels = sourceUpdateChoiceLabels(change);
    const nav = candidate.changes.map((entry, index) => {
      const resolved = Boolean(review && review.resolutions[entry.changeId]);
      return '<button type="button" data-action="select-source-update-change" data-change-id="' + escapeHtml(entry.changeId) + '" aria-current="' + String(entry.changeId === change.changeId) + '"><span>' + escapeHtml(sourceUpdateChangeLabel(entry, index)) + '</span><small>' + (resolved ? '선택 완료' : '결정 필요') + '</small></button>';
    }).join('');
    const valueTabs = [['base', 'Base · 기준 원문'], ['mine', '내 작업'], ['incoming', '새 원문']].map(entry => '<button type="button" role="tab" data-action="source-update-value-tab" data-value-view="' + entry[0] + '" aria-selected="' + String(sourceUpdateValueView === entry[0]) + '">' + entry[1] + '</button>').join('');
    const values = [
      ['base', 'Base · 기준 원문', candidate.base],
      ['mine', '내 작업', candidate.mine],
      ['incoming', '새 원문', candidate.incoming]
    ].map(entry => '<article class="source-update-value ' + (sourceUpdateValueView === entry[0] ? 'is-active' : '') + '" data-source-value="' + entry[0] + '"><h4>' + entry[1] + '</h4>' + sourceUpdateRevisionValue(entry[2], change) + '</article>').join('');
    let status = '<p class="source-update-resolution-status" role="status">' + (unresolved ? unresolved + '곳을 더 선택해야 적용할 수 있어요.' : '모든 차이를 선택했습니다. 한 번에 적용할 수 있어요.') + '</p>';
    if (session.status === 'stale') status = '<div class="source-update-next-action" role="alert"><strong>비교를 시작한 뒤 현재 원문이 달라졌어요. 기존 선택은 보관했습니다.</strong><button class="button" type="button" data-action="refresh-source-update-review">현재 원문으로 다시 비교</button></div>';
    else if (session.status === 'failed') status = '<div class="source-update-next-action" role="alert"><strong>저장을 확인하지 못했어요. 현재 비교와 선택을 유지했습니다.</strong><button class="button" type="button" data-action="source-update-apply"' + (unresolved ? ' disabled' : '') + '>다시 시도</button></div>';
    return '<div class="source-update-backdrop" data-source-update-backdrop="true"><section class="source-update-dialog" data-testid="standalone-source-update-dialog" role="dialog" aria-modal="true" aria-labelledby="source-update-heading" aria-describedby="source-update-description"><header class="source-update-head"><div><span class="source-update-local-badge">예시 원문 비교</span><h2 id="source-update-heading">로컬 원문 비교 연습</h2><p id="source-update-description">' + candidate.changes.length + '곳을 하나씩 확인하세요. 적용 전 선택은 이 실행 중에만 유지됩니다.</p></div><button class="icon-button" type="button" data-action="close-source-update-review" aria-label="원문 비교 닫기">×</button></header><div class="source-update-body"><nav class="source-update-change-nav" aria-label="달라진 곳">' + nav + '</nav><section class="source-update-compare"><div class="source-update-value-tabs" role="tablist" aria-label="비교할 원문">' + valueTabs + '</div><div class="source-update-values">' + values + '</div><fieldset class="source-update-choices"><legend>' + escapeHtml(sourceUpdateChangeLabel(change, selectedIndex)) + ' 선택</legend><label><input type="radio"' + (session.status === 'stale' || session.status === 'applying' ? ' disabled' : '') + ' name="source-update-resolution" value="keep-mine" data-source-update-choice="keep-mine" data-change-id="' + escapeHtml(change.changeId) + '"' + (resolution === 'keep-mine' ? ' checked' : '') + '><span>' + labels.mine + '</span></label><label><input type="radio"' + (session.status === 'stale' || session.status === 'applying' ? ' disabled' : '') + ' name="source-update-resolution" value="use-incoming" data-source-update-choice="use-incoming" data-change-id="' + escapeHtml(change.changeId) + '"' + (resolution === 'use-incoming' ? ' checked' : '') + '><span>' + labels.incoming + '</span></label><label><input type="radio"' + (session.status === 'stale' || session.status === 'applying' ? ' disabled' : '') + ' name="source-update-resolution" value="later" data-source-update-choice="later" data-change-id="' + escapeHtml(change.changeId) + '"' + (resolution === undefined ? ' checked' : '') + '><span>나중에 결정</span></label></fieldset></section></div><footer class="source-update-footer">' + status + '<div><button class="button" type="button" data-action="close-source-update-review">나중에</button><button class="button primary" type="button" data-action="source-update-apply"' + (unresolved || session.status === 'applying' || session.status === 'stale' ? ' disabled' : '') + '>' + (session.status === 'applying' ? '적용 중…' : '선택 적용') + '</button></div></footer></section></div>';
  }

  function renderFlowDetail(flow) {
    const total = flow.steps.reduce((sum, step) => sum + step.itemIds.length, 0);
    const done = flow.steps.reduce((sum, step) => sum + step.itemIds.filter(id => taskById(id).done).length, 0);
    if (personalExecutionOnly()) {
      const lists = flow.steps.map(step => renderTaskList(step.itemIds, 'flow:' + flow.id + ':' + step.id)).join('');
      return '<button class="detail-back" type="button" data-action="close-flow">← 목록으로</button><section class="detail-header"><h1>' + escapeHtml(flowDisplayTitle(flow)) + '</h1><p>개인 실행 항목 ' + total + '개 · 완료 ' + done + '개</p><p>원문을 확인하지 못해 원문·계획 편집·네 결과는 열지 않습니다.</p></section>' + lists;
    }
    if (screen.type === 'plan-editor') return renderPlanEditor(flow);
    const structureRead = personalStructurePacket(flow.id);
    if (!structureRead.ok) return '<button class="detail-back" type="button" data-action="close-flow">← 목록으로</button><p role="status">원문과 개인 구간을 함께 확인하지 못해 상세를 열지 않았습니다. 저장된 내용은 그대로입니다.</p>';
    let steps = '<div class="flow-execution-list" data-flow-execution-view><h2>실행 목록</h2><p>구간별 실행 정렬입니다. 계획의 전체 순서는 아래 Flow 결과와 개인 편집에서 확인하세요.</p>';
    flow.steps.forEach((step, index) => {
      const context = 'flow:' + flow.id + ':' + step.id;
      const ids = M.viewTaskIds(state(), context).filter(id => step.itemIds.includes(id));
      const section = structureRead.structure && structureRead.structure.sections.find(entry => entry.sourceOrder === index);
      steps += '<section class="step-block" data-execution-section-index="' + index + '"><h2>' + escapeHtml(section ? section.title : step.title) + '</h2>' + renderTaskList(ids, context) + '</section>';
    });
    steps += '</div>';
    const raw = flow.rawText === null ? '' : '<details class="raw-source"><summary>저장한 원문 보기</summary><pre>' + escapeHtml(flow.rawText) + '</pre></details>';
    return '<button class="detail-back" type="button" data-action="close-flow">← ' + escapeHtml(contextLabel(screen.view || 'today')) + '으로</button><section class="detail-header"><div class="meta"><span class="origin">' + escapeHtml(flow.originLabel) + '</span><span>' + escapeHtml(folderTitle(flow.folderId)) + '</span></div><h1>' + escapeHtml(flowDisplayTitle(flow)) + '</h1><p>' + total + '개 중 ' + done + '개 완료 · 이 화면의 완료와 날짜 이동은 기간 보기에도 같은 상태로 보입니다.</p><div class="detail-toolbar"><button class="button" type="button" data-action="open-plan-editor" data-id="' + escapeHtml(flow.id) + '">개인 편집</button><button class="button" type="button" data-action="flow-menu" data-move-kind="flow" data-move-source="more" data-id="' + escapeHtml(flow.id) + '" data-context="' + escapeHtml(screen.view || 'today') + '" aria-controls="move-panel" aria-expanded="' + Boolean(moveTarget && moveTarget.kind === 'flow' && moveTarget.id === flow.id) + '">폴더 이동</button>' + (flow.rawText !== null ? '<button class="button" type="button" data-action="go-authoring">새 작성본 만들기</button>' : '') + '<button class="button danger" type="button" data-action="move-to-trash" data-kind="flow" data-id="' + escapeHtml(flow.id) + '">휴지통으로</button></div></section>' + renderSourceUpdateBanner(flow) + steps + raw + renderResultPanel(flow) + renderSourceUpdateReview(flow);
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
      const reviewCount = parsed.itemCount + nearMissCount;
      reviewOpener.disabled = parsed.itemCount === 0 && nearMissCount === 0;
      reviewOpener.setAttribute('aria-expanded', String(authoringReviewOpen));
      reviewOpener.setAttribute('aria-label', '원문과 실행 항목 검토, ' + reviewCount + '개');
      reviewOpener.textContent = '항목 검토 ' + reviewCount;
    }
    if (reviewBody) {
      const items = parsed.steps.filter(step => step.items.length).map(step => '<section><h3>' + escapeHtml(step.title) + '</h3><ol>' + step.items.map(renderAuthoringReviewItem).join('') + '</ol></section>').join('');
      const nearMisses = M.listAuthoringNearMissTargets(authoring.rawText).filter(entry => !dismissedNearMisses.has(entry.targetId));
      const nearMiss = nearMisses.length ? '<section class="near-miss-list"><h3>할 일처럼 보이는 줄</h3><p>자동으로 고치지 않습니다. 원하는 줄만 확인해서 바꿔 주세요.</p>' + nearMisses.map(entry => '<article data-near-miss-id="' + escapeHtml(entry.targetId) + '"><strong>' + escapeHtml(entry.title) + '</strong><span>' + entry.sourceLine + '행</span><div><button class="button" type="button" data-action="repair-near-miss" data-target-id="' + escapeHtml(entry.targetId) + '">할 일로 고치기</button><button class="button" type="button" data-action="dismiss-near-miss" data-target-id="' + escapeHtml(entry.targetId) + '">그대로 두기</button></div></article>').join('') + '</section>' : '';
      reviewBody.innerHTML = (authoringChooserEntry === 'context' ? '' : renderAuthoringPropertyGuard()) + (items || nearMiss ? items + nearMiss : '<p>검토할 항목이 아직 없어요.</p>');
    }
    const count = document.getElementById('source-count');
    if (count) count.textContent = authoring.rawText.length + '자 · Item ' + parsed.itemCount + '개';
    const save = document.getElementById('commit-authoring');
    if (save) save.disabled = parsed.issues.length > 0 || parsed.itemCount === 0 || authoringPropertyIsRecovering();
    const saveCreator = document.getElementById('save-creator-draft');
    if (saveCreator) saveCreator.disabled = !authoring.rawText.trim() || creatorDraftBlocked() || authoringPropertyIsRecovering();
    renderAuthoringContextPanel();
  }

  function syncAuthoringGhostScroll() {
    const editor = document.getElementById('flow-editor');
    const scroll = document.getElementById('authoring-ghost-scroll');
    if (!editor || !scroll) return;
    scroll.style.transform = 'translate(' + (-editor.scrollLeft) + 'px, ' + (-editor.scrollTop) + 'px)';
    positionAuthoringContextAnchor();
  }

  function positionAuthoringContextAnchor() {
    const frame = document.getElementById('flow-editor-frame');
    const anchor = document.getElementById('authoring-context-anchor');
    const editor = document.getElementById('flow-editor');
    if (!frame || !anchor || !editor) return;
    const target = authoringContextTarget;
    const row = target && frame.querySelector('[data-line="' + target.line + '"]');
    const box = frame.getBoundingClientRect();
    const line = row && row.getBoundingClientRect();
    const visible = Boolean(authoringFlowViewVisible && target && line && line.bottom > box.top && line.top < box.bottom);
    anchor.hidden = !visible;
    if (!visible) return;
    anchor.dataset.sourceLine = String(target.line);
    anchor.dataset.owner = target.kind;
    anchor.setAttribute('aria-label', '원문 ' + target.line + '행에 내용 추가');
    anchor.style.top = Math.max(4, Math.min(box.height - 52,
      line.top - box.top + Math.max(0, (line.height - 48) / 2))) + 'px';
  }

  function renderAuthoringGhosts() {
    const editor = document.getElementById('flow-editor');
    const overlay = document.getElementById('authoring-ghost-overlay');
    const scroll = document.getElementById('authoring-ghost-scroll');
    const toggle = document.getElementById('authoring-ghost-toggle');
    if (!editor || !overlay || !scroll || !toggle) return;
    toggle.setAttribute('aria-pressed', String(authoringGhostVisible));
    const frame = document.getElementById('flow-editor-frame');
    const textToggle = document.getElementById('authoring-text-view-toggle');
    const flowToggle = document.getElementById('authoring-flow-view-toggle');
    frame.dataset.flowView = String(authoringFlowViewVisible);
    toggle.hidden = !authoringFlowViewVisible;
    textToggle.setAttribute('aria-pressed', String(!authoringFlowViewVisible));
    flowToggle.setAttribute('aria-pressed', String(authoringFlowViewVisible));
    overlay.hidden = !authoringFlowViewVisible;
    scroll.replaceChildren();
    const rawText = editor.value;
    const sourceFingerprint = A.fingerprintPersonalWorkspacePocAuthoringSource(rawText);
    const selection = { start: editor.selectionStart, end: editor.selectionEnd };
    authoringContextTarget = !authoringEditorComposing && !authoringPropertyComposing && !authoringPropertyApplying && !authoringPropertyIsRecovering()
      && rawText === authoring.rawText
      ? A.resolvePersonalWorkspacePocAuthoringGuideTarget({ rawText, sourceFingerprint,
        selectionStart: selection.start, selectionEnd: selection.end }) : null;
    if (!authoringFlowViewVisible) { positionAuthoringContextAnchor(); return; }
    const guides = A.buildPersonalWorkspacePocEditorLineGuides({ rawText, sourceFingerprint,
      selectionStart: selection.start, selectionEnd: selection.end, view: 'flow', ghostEnabled: authoringGhostVisible });
    const lines = A.buildPersonalWorkspacePocLiveEditorPresentation(rawText, guides, selection,
      { flowViewVisible: true, ghostVisible: authoringGhostVisible });
    const legacyHints = new Map(M.authoringGhostLines(rawText).map(line => [line.line, line.ghost]));

    const fragment = document.createDocumentFragment();
    lines.forEach(line => {
      const row = document.createElement('span');
      row.className = 'authoring-ghost-line';
      row.dataset.line = String(line.line);
      row.dataset.presentationMode = line.mode;
      row.dataset.hierarchyDepth = String(line.hierarchyDepth);
      row.dataset.hierarchyGuide = String(line.showHierarchyGuide);
      row.dataset.lineRole = line.role;
      const sourceGeometry = document.createElement('span');
      sourceGeometry.className = 'authoring-ghost-source';
      sourceGeometry.textContent = line.displayText || '\u00a0';
      row.appendChild(sourceGeometry);
      if (line.ghost) {
        const ghost = document.createElement('span');
        ghost.className = 'authoring-ghost';
        const legacy = legacyHints.get(line.line);
        if (legacy) ghost.dataset.ghostHint = legacy.hintId;
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
    editor.insertAdjacentHTML('beforebegin', '<div class="flow-editor-tools" role="group" aria-label="원문 보기 옵션"><button id="authoring-text-view-toggle" class="authoring-ghost-toggle" type="button" data-action="authoring-text-view">순수 텍스트</button><button id="authoring-flow-view-toggle" class="authoring-ghost-toggle" type="button" data-action="authoring-flow-view">Flow 편집</button><button id="authoring-ghost-toggle" class="authoring-ghost-toggle" type="button" data-action="toggle-authoring-ghost" aria-pressed="' + String(authoringGhostVisible) + '" aria-controls="authoring-ghost-overlay">빈칸 힌트</button></div>');
    const frame = document.createElement('div');
    frame.id = 'flow-editor-frame';
    frame.className = 'flow-editor-frame';
    editor.parentNode.insertBefore(frame, editor);
    frame.appendChild(editor);
    frame.insertAdjacentHTML('afterbegin', '<div id="authoring-ghost-overlay" class="authoring-ghost-overlay" aria-hidden="true"><div id="authoring-ghost-scroll" class="authoring-ghost-scroll"></div></div>');
    // The host textarea is moved once, never cloned, assigned value, or remounted
    // for options, caret changes or the contextual helper.
    frame.insertAdjacentHTML('beforeend', '<button id="authoring-context-anchor" class="authoring-context-anchor" type="button" data-action="open-authoring-context" aria-controls="authoring-context-panel" aria-expanded="false" hidden><span aria-hidden="true">＋</span></button>');
    frame.insertAdjacentHTML('afterend', '<div id="authoring-context-panel" class="authoring-context-panel" hidden></div>');
    ['select', 'click', 'keyup', 'compositionend'].forEach(type => editor.addEventListener(type, renderAuthoringGhosts));
    editor.addEventListener('compositionstart', () => { authoringEditorComposing = true; renderAuthoringGhosts(); });
    editor.addEventListener('compositionend', () => { authoringEditorComposing = false; renderAuthoringGhosts(); });
    const toolbar = frame.previousElementSibling;
    toolbar.querySelectorAll('button').forEach(button => button.addEventListener('pointerdown', event => event.preventDefault()));
    frame.querySelector('#authoring-context-anchor').addEventListener('pointerdown', event => event.preventDefault());
    if (authoringEditorResizeObserver) authoringEditorResizeObserver.disconnect();
    authoringEditorResizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(positionAuthoringContextAnchor) : null;
    if (authoringEditorResizeObserver) authoringEditorResizeObserver.observe(frame);
    renderAuthoringGhosts();
  }

  function prepareTemplatePreviewAccessibility() {
    const examplePreview = document.getElementById('template-example-preview');
    const exampleLabel = document.getElementById('template-example-label');
    if (examplePreview) examplePreview.removeAttribute('aria-live');
    if (exampleLabel) exampleLabel.setAttribute('aria-live', 'polite');
  }

  function applyNativeTemplateScaffold(editor, template) {
    if (!featureWritable('draft')) return false;
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

  function validationExampleRuntimeReady() {
    try {
      const version = M.validationExampleCatalogVersion;
      const groups = M.validationExampleGroups;
      const catalog = M.validationExampleCatalog;
      if (!Number.isInteger(version) || version < 1 || !Array.isArray(groups) || !Array.isArray(catalog)) return false;
      if (groups.length !== 5 || catalog.length !== 31 || typeof M.fingerprintPersonalWorkspacePocAuthoringSource !== 'function') return false;
      const ids = new Set();
      const validEntries = catalog.every(entry => {
        if (!entry || entry.version !== version || typeof entry.exampleId !== 'string' || ids.has(entry.exampleId)) return false;
        ids.add(entry.exampleId);
        return typeof entry.label === 'string'
          && typeof entry.rawText === 'string'
          && typeof entry.sourceShape === 'string'
          && typeof entry.provenance === 'string'
          && typeof entry.upstreamBoundary === 'string'
          && Number.isInteger(entry.expectedOriginalItemCount)
          && typeof entry.expectedMode === 'string'
          && typeof entry.expectedPreservation === 'string';
      });
      return validEntries && groups.every(group => (
        group
        && typeof group.groupId === 'string'
        && typeof group.label === 'string'
        && Number.isInteger(group.expectedCount)
        && catalog.filter(entry => entry.groupId === group.groupId).length === group.expectedCount
      ));
    } catch (error) {
      return false;
    }
  }

  function structureTemplateRuntimeReady() {
    try {
      const previews = M.structureTemplatePreviews;
      if (
        M.structureTemplatePreviewCatalogVersion !== '1.1.0-p0'
        || M.structureTemplatePreviewContractVersion !== 'p0.2'
        || !Array.isArray(previews)
        || previews.length !== 6
        || typeof M.findStructureTemplatePreview !== 'function'
        || typeof M.planStructureTemplatePreviewMaterialization !== 'function'
      ) return false;
      const ids = new Set();
      return previews.every(preview => {
        if (!preview || ids.has(preview.templateId)) return false;
        ids.add(preview.templateId);
        return preview.catalogVersion === M.structureTemplatePreviewCatalogVersion
          && preview.contractVersion === M.structureTemplatePreviewContractVersion
          && typeof preview.templateVersion === 'string'
          && typeof preview.label === 'string'
          && typeof preview.expectedRawText === 'string'
          && preview.expectedRawText.length > 0
          && Number.isInteger(preview.expectedItemCount)
          && preview.expectedItemCount > 0
          && M.TEMPLATE_CATALOG.some(template => template.id === preview.templateId);
      }) && M.TEMPLATE_CATALOG.every(template => ids.has(template.id));
    } catch (error) {
      return false;
    }
  }

  function structureTemplatePreviewFor(templateId) {
    if (!structureTemplateRuntimeReady()) return null;
    try {
      const preview = M.findStructureTemplatePreview(templateId, {
        catalogVersion: M.structureTemplatePreviewCatalogVersion,
        contractVersion: M.structureTemplatePreviewContractVersion
      });
      return preview
        && preview.templateId === templateId
        && preview.catalogVersion === M.structureTemplatePreviewCatalogVersion
        && preview.contractVersion === M.structureTemplatePreviewContractVersion
        ? preview
        : null;
    } catch (error) {
      return null;
    }
  }

  function validationExampleGroupLabel(groupId) {
    const group = Array.isArray(M.validationExampleGroups)
      ? M.validationExampleGroups.find(entry => entry.groupId === groupId)
      : null;
    return group ? group.label : groupId;
  }

  function filteredValidationExamples() {
    if (!validationExampleRuntimeReady()) return [];
    try {
      const result = M.filterValidationExamples({
        query: validationExampleQuery,
        groupId: validationExampleGroupId
      });
      return Array.isArray(result) ? result : [];
    } catch (error) {
      return [];
    }
  }

  function selectedValidationExample() {
    if (!validationExampleRuntimeReady() || !validationExampleSelectedId) return null;
    try {
      const selection = M.projectValidationExampleSelection({
        catalogVersion: M.validationExampleCatalogVersion,
        exampleId: validationExampleSelectedId
      });
      return selection && selection.status === 'selected' ? selection.example : null;
    } catch (error) {
      return null;
    }
  }

  function setValidationExampleBackgroundInert(inert) {
    document.querySelectorAll('.topbar, #sidebar, .authoring-head, .authoring-mobile-tabs, .authoring-grid').forEach(element => {
      element.inert = Boolean(inert);
    });
  }

  function renderValidationExampleExplorer() {
    const host = document.getElementById('validation-example-host');
    const opener = document.getElementById('validation-example-opener');
    if (opener) opener.setAttribute('aria-expanded', String(validationExampleExplorerOpen));
    if (!host) return;
    if (!validationExampleExplorerOpen) {
      host.replaceChildren();
      setValidationExampleBackgroundInert(false);
      return;
    }

    if (!validationExampleRuntimeReady()) {
      host.innerHTML = '<div class="validation-example-backdrop"><section id="validation-example-dialog" class="validation-example-dialog validation-example-unavailable" role="dialog" aria-modal="true" aria-labelledby="validation-example-heading"><header class="validation-example-head"><div><p>원문은 그대로</p><h2 id="validation-example-heading">검증 예시를 불러오지 못했어요</h2></div><button class="button" type="button" data-action="close-validation-examples">닫기</button></header><div class="validation-example-unavailable-body" role="alert"><strong>예시 catalog를 안전하게 확인할 수 없습니다.</strong><span>현재 원문을 직접 작성할 수 있으며 기존 데이터는 바뀌지 않았습니다.</span></div></section></div>';
      setValidationExampleBackgroundInert(true);
      return;
    }

    const visible = filteredValidationExamples();
    let selected = selectedValidationExample();
    if (selected && !visible.some(entry => entry.exampleId === selected.exampleId)) {
      validationExampleSelectedId = null;
      selected = null;
    }
    const groupOptions = M.validationExampleGroups.map(group => (
      '<option value="' + escapeHtml(group.groupId) + '"' + (validationExampleGroupId === group.groupId ? ' selected' : '') + '>'
      + escapeHtml(group.label) + ' ' + group.expectedCount + '개</option>'
    )).join('');
    const rows = visible.length
      ? visible.map(entry => (
        '<li><button class="validation-example-row" type="button" data-action="select-validation-example" data-example-id="' + escapeHtml(entry.exampleId) + '" aria-pressed="' + String(Boolean(selected && selected.exampleId === entry.exampleId)) + '" aria-controls="validation-example-preview-heading"><strong>' + escapeHtml(entry.label) + '</strong><span>' + escapeHtml(validationExampleGroupLabel(entry.groupId)) + ' · ' + escapeHtml(entry.sourceShape) + '</span></button></li>'
      )).join('')
      : '<li class="validation-example-empty"><strong>조건에 맞는 예시가 없습니다.</strong><button class="button" type="button" data-action="clear-validation-example-filter">검색 지우기</button></li>';
    const sourceEmpty = authoring.rawText.length === 0;
    const preview = selected
      ? '<button class="button validation-example-mobile-back" type="button" data-action="validation-example-list">목록으로</button><p class="validation-example-group-label">' + escapeHtml(validationExampleGroupLabel(selected.groupId)) + '</p><h3 id="validation-example-preview-heading" tabindex="-1">' + escapeHtml(selected.label) + '</h3>'
        + (selected.groupId === 'error-input' ? '<p class="validation-example-caution">이 예시는 오류 처리 확인용입니다. 그대로 저장할 Flow가 아닙니다.</p>' : '')
        + '<dl class="validation-example-facts"><dt>입력 형태</dt><dd>' + escapeHtml(selected.sourceShape) + '</dd><dt>출처</dt><dd>' + escapeHtml(selected.provenance) + '</dd><dt>상위 경계</dt><dd>' + escapeHtml(selected.upstreamBoundary) + '</dd><dt>예상 결과</dt><dd>Item ' + selected.expectedOriginalItemCount + '개 · ' + escapeHtml(selected.expectedMode) + '</dd><dt>보존할 내용</dt><dd>' + escapeHtml(selected.expectedPreservation) + '</dd></dl><section class="validation-example-source" aria-labelledby="validation-example-source-heading"><h4 id="validation-example-source-heading">예시 원문 전체</h4><pre data-validation-example-raw-text="true">' + escapeHtml(selected.rawText) + '</pre></section>'
      : '<div class="validation-example-preview-empty"><h3 id="validation-example-preview-heading">미리볼 예시를 고르세요.</h3><p>목록을 고르면 원문 전체와 예상 결과를 여기에서 확인할 수 있습니다.</p></div>';
    const apply = selected
      ? '<footer class="validation-example-apply-bar"><p id="validation-example-apply-note" role="status">' + (sourceEmpty ? '누르면 이 원문의 정확한 사본이 현재 입력에 한 번 들어갑니다.' : '현재 원문을 덮어쓰지 않도록 적용을 막았습니다. 빈 원문에서만 시작할 수 있습니다.') + '</p><button class="button primary" type="button" data-action="apply-validation-example" data-example-id="' + escapeHtml(selected.exampleId) + '"' + (sourceEmpty ? '' : ' disabled') + ' aria-describedby="validation-example-apply-note">이 예시로 시작</button></footer>'
      : '';

    host.innerHTML = '<div class="validation-example-backdrop"><section id="validation-example-dialog" class="validation-example-dialog" data-has-selection="' + String(Boolean(selected)) + '" data-catalog-version="' + M.validationExampleCatalogVersion + '" role="dialog" aria-modal="true" aria-labelledby="validation-example-heading" aria-describedby="validation-example-description"><header class="validation-example-head"><div><p>원문은 아직 바뀌지 않음</p><h2 id="validation-example-heading">검증 예시 찾아보기</h2><span id="validation-example-description">실제 콘텐츠와 검증된 입력 사례 31개입니다. 고르기만 해서는 원문이 바뀌지 않습니다.</span></div><button class="button" type="button" data-action="close-validation-examples">닫기</button></header><div class="validation-example-layout"><section class="validation-example-list-pane" aria-labelledby="validation-example-list-heading"><div class="validation-example-controls"><h3 id="validation-example-list-heading">예시 목록</h3><label for="validation-example-search"><span>예시 검색</span><input id="validation-example-search" type="search" value="' + escapeHtml(validationExampleQuery) + '" placeholder="이름, 입력 형태, 출처, 경계로 찾기" autocomplete="off"></label><label for="validation-example-group"><span>분류</span><select id="validation-example-group"><option value="all"' + (validationExampleGroupId === 'all' ? ' selected' : '') + '>전체 31개</option>' + groupOptions + '</select></label><p id="validation-example-count" role="status">31개 중 ' + visible.length + '개</p></div><ul class="validation-example-list">' + rows + '</ul></section><section class="validation-example-preview-pane" aria-labelledby="validation-example-preview-heading"><div class="validation-example-preview-scroll">' + preview + '</div>' + apply + '</section></div><p class="visually-hidden" id="validation-example-selection-status" aria-live="polite" aria-atomic="true">' + (selected ? escapeHtml(selected.label) + ' 예시를 선택했습니다. 예상 Item ' + selected.expectedOriginalItemCount + '개입니다.' : '') + '</p></section></div>';
    setValidationExampleBackgroundInert(true);
  }

  function openValidationExampleExplorer(control) {
    if (!validationExampleRuntimeReady()) {
      setSaveStatus('검증 예시를 불러오지 못했어요 · 변경 없음', 'error');
      showToast('검증 예시 catalog를 안전하게 확인할 수 없어 열지 않았어요. 원문은 그대로입니다.', false, null, 'error');
      return;
    }
    if (authoring.templatePickerOpen) setTemplatePickerOpen(false, false);
    validationExampleExplorerOpen = true;
    validationExampleQuery = '';
    validationExampleGroupId = 'all';
    validationExampleSelectedId = null;
    validationExampleExpectedSourceFingerprint = M.fingerprintPersonalWorkspacePocAuthoringSource(authoring.rawText);
    validationExampleReturnFocus = control || document.activeElement;
    renderValidationExampleExplorer();
    focusAfterRender('#validation-example-search', '[data-action="close-validation-examples"]');
    setSaveStatus('검증 예시 탐색 중 · 원문은 그대로예요', 'noop');
  }

  function closeValidationExampleExplorer(options) {
    const settings = Object.assign({ restoreFocus: true, announce: true }, options || {});
    const returnFocus = validationExampleReturnFocus;
    validationExampleExplorerOpen = false;
    validationExampleQuery = '';
    validationExampleGroupId = 'all';
    validationExampleSelectedId = null;
    validationExampleExpectedSourceFingerprint = null;
    validationExampleReturnFocus = null;
    renderValidationExampleExplorer();
    if (settings.announce) setSaveStatus('검증 예시를 닫았어요 · 원문은 그대로예요', 'noop');
    if (settings.restoreFocus) window.setTimeout(() => {
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      else {
        const opener = document.getElementById('validation-example-opener');
        if (opener) opener.focus({ preventScroll: true });
      }
    }, 0);
  }

  function showValidationExampleList() {
    const previousId = validationExampleSelectedId;
    validationExampleSelectedId = null;
    renderValidationExampleExplorer();
    if (previousId) focusAfterRender('[data-action="select-validation-example"][data-example-id="' + previousId.replace(/"/g, '\\"') + '"]', '#validation-example-search');
  }

  function restoreValidationExampleNativeAttempt(editor, before) {
    nativeSourcePlanPending = true;
    try {
      if (editor.value !== before.editorValue && typeof document.execCommand === 'function') document.execCommand('undo');
    } catch (error) { /* Direct byte restoration below is the fail-closed fallback. */ }
    nativeSourcePlanPending = false;
    if (editor.value !== before.editorValue) editor.value = before.editorValue;
    authoring = before.authoring;
    authoringDraftStored = before.authoringDraftStored;
    editor.setSelectionRange(before.selectionStart, before.selectionEnd, before.selectionDirection);
    editor.scrollTop = before.scrollTop;
    editor.scrollLeft = before.scrollLeft;
    renderAuthoringPreview();
    renderAuthoringGhosts();
  }

  function applyNativeValidationExample(editor, plan, entry) {
    if (!featureWritable('draft')) return false;
    validationExamplePersistenceRollback = false;
    const replacement = plan && plan.replacement;
    if (!replacement || replacement.beforeRawText !== '' || replacement.afterRawText !== entry.rawText || plan.nextRawText !== entry.rawText) return false;
    if (editor.value !== '' || authoring.rawText !== '' || typeof document.execCommand !== 'function') return false;
    const before = {
      editorValue: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
      selectionDirection: editor.selectionDirection,
      scrollTop: editor.scrollTop,
      scrollLeft: editor.scrollLeft,
      authoring: Object.assign({}, authoring),
      authoringDraftStored
    };
    setValidationExampleBackgroundInert(false);
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(0, 0, 'none');
    nativeSourcePlanPending = true;
    nativeSourcePlanInputEventCount = 0;
    let commandAccepted = false;
    try {
      commandAccepted = document.execCommand('insertText', false, replacement.afterRawText);
    } catch (error) {
      commandAccepted = false;
    }
    const exactCommit = commandAccepted === true
      && editor.value === replacement.afterRawText
      && nativeSourcePlanInputEventCount > 0;
    nativeSourcePlanPending = false;
    if (!exactCommit) {
      restoreValidationExampleNativeAttempt(editor, before);
      setValidationExampleBackgroundInert(true);
      return false;
    }

    authoring.rawText = editor.value;
    authoring.templateId = null;
    authoring.templatePickerOpen = false;
    authoring.sourceConfirmed = false;
    authoringReviewOpen = false;
    authoringPropertyTarget = null;
    dismissedNearMisses = new Set();
    if (!persistAuthoringDraft()) {
      restoreValidationExampleNativeAttempt(editor, before);
      setValidationExampleBackgroundInert(true);
      validationExamplePersistenceRollback = true;
      setSaveStatus('검증 예시 저장 실패 · 원문을 되돌렸어요', 'error');
      showToast('예시를 안전하게 저장하지 못해 원문을 되돌렸어요.', false, null, 'error');
      return false;
    }

    authoringSourceMutationCount += 1;
    elements.app.dataset.authoringSourceMutations = String(authoringSourceMutationCount);
    closeValidationExampleExplorer({ restoreFocus: false, announce: false });
    renderAuthoringPreview();
    renderAuthoringGhosts();
    editor.setSelectionRange(editor.value.length, editor.value.length, 'none');
    editor.focus({ preventScroll: true });
    setSaveStatus(successfulStorageStatus('검증 예시 원문 저장됨'), 'saved');
    showToast('“' + entry.label + '” 예시 원문을 넣었어요. Ctrl+Z로 되돌릴 수 있습니다.', false);
    return true;
  }

  function applyValidationExample(exampleId) {
    const editor = document.getElementById('flow-editor');
    if (!validationExampleRuntimeReady() || !editor || exampleId !== validationExampleSelectedId) {
      setSaveStatus('검증 예시를 적용하지 않았어요 · 변경 없음', 'error');
      return false;
    }
    if (authoring.rawText.length !== 0 || editor.value !== authoring.rawText) {
      setSaveStatus('원문 있음 · 예시 적용 0건', 'noop');
      showToast('현재 원문을 덮어쓰지 않았어요. 검증 예시는 빈 원문에서만 시작할 수 있습니다.', false);
      return false;
    }
    const entry = selectedValidationExample();
    if (!entry || entry.exampleId !== exampleId || typeof validationExampleExpectedSourceFingerprint !== 'string') {
      setSaveStatus('검증 예시를 확인하지 못했어요 · 변경 없음', 'error');
      return false;
    }
    let plan;
    try {
      plan = M.planValidationExampleApply({
        catalogVersion: M.validationExampleCatalogVersion,
        exampleId,
        rawText: authoring.rawText,
        expectedSourceFingerprint: validationExampleExpectedSourceFingerprint,
        confirmed: true
      });
    } catch (error) {
      plan = null;
    }
    if (!plan || plan.status !== 'applied' || plan.sourceMutationCount !== 1) {
      const noOp = plan && (plan.reason === 'nonempty-source' || plan.reason === 'same-source' || plan.reason === 'cancelled');
      setSaveStatus(noOp ? '예시 적용 0건 · 원문은 그대로' : '검증 예시 적용 차단 · 변경 없음', noOp ? 'noop' : 'error');
      showToast(noOp ? '원문을 바꾸지 않았어요.' : '예시를 안전하게 적용할 수 없어 원문을 바꾸지 않았어요.', false, null, noOp ? 'status' : 'error');
      return false;
    }
    if (!applyNativeValidationExample(editor, plan, entry)) {
      if (!validationExamplePersistenceRollback && editor.value === authoring.rawText && editor.value.length === 0) {
        setSaveStatus('검증 예시 적용 실패 · 원문은 그대로예요', 'error');
        showToast('이 브라우저에서는 예시를 안전하게 넣지 못했어요. 원문은 그대로입니다.', false, null, 'error');
      }
      return false;
    }
    return true;
  }

  function applyNativeStructureTemplatePreview(editor, plan, preview) {
    if (!featureWritable('draft')) return false;
    structureTemplatePersistenceRollback = false;
    const replacement = plan && plan.replacement;
    if (!replacement || replacement.beforeRawText !== '' || replacement.afterRawText !== preview.expectedRawText || plan.nextRawText !== preview.expectedRawText) return false;
    if (editor.value !== '' || authoring.rawText !== '' || typeof document.execCommand !== 'function') return false;
    const before = {
      editorValue: editor.value,
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
      selectionDirection: editor.selectionDirection,
      scrollTop: editor.scrollTop,
      scrollLeft: editor.scrollLeft,
      authoring: Object.assign({}, authoring),
      authoringDraftStored
    };
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(0, 0, 'none');
    nativeSourcePlanPending = true;
    nativeSourcePlanInputEventCount = 0;
    let commandAccepted = false;
    try {
      commandAccepted = document.execCommand('insertText', false, replacement.afterRawText);
    } catch (error) {
      commandAccepted = false;
    }
    const exactCommit = commandAccepted === true
      && editor.value === replacement.afterRawText
      && nativeSourcePlanInputEventCount > 0;
    nativeSourcePlanPending = false;
    if (!exactCommit) {
      restoreValidationExampleNativeAttempt(editor, before);
      return false;
    }

    authoring.rawText = editor.value;
    authoring.templateId = null;
    authoring.templatePickerOpen = false;
    authoring.sourceConfirmed = false;
    authoringReviewOpen = false;
    authoringPropertyTarget = null;
    dismissedNearMisses = new Set();
    if (!persistAuthoringDraft()) {
      restoreValidationExampleNativeAttempt(editor, before);
      structureTemplatePersistenceRollback = true;
      setSaveStatus('구조화 원문 저장 실패 · 원문을 되돌렸어요', 'error');
      showToast('구조화 원문을 안전하게 저장하지 못해 원문을 되돌렸어요.', false, null, 'error');
      return false;
    }

    authoringSourceMutationCount += 1;
    elements.app.dataset.authoringSourceMutations = String(authoringSourceMutationCount);
    setTemplatePickerOpen(false, false);
    renderAuthoringPreview();
    renderAuthoringGhosts();
    editor.setSelectionRange(0, 0, 'none');
    editor.focus({ preventScroll: true });
    setSaveStatus(successfulStorageStatus('구조화 원문 저장됨'), 'saved');
    showToast('“' + preview.label + '” 검증 입력값을 ' + preview.contractVersion + ' 컴파일러로 글로 만들었어요. Ctrl+Z로 되돌릴 수 있습니다.', false);
    return true;
  }

  function applyStructureTemplatePreview(templateId) {
    const editor = document.getElementById('flow-editor');
    const preview = structureTemplatePreviewFor(templateId);
    if (!editor || !preview) {
      setSaveStatus('구조화 미리보기를 확인하지 못했어요 · 변경 없음', 'error');
      showToast('버전과 컴파일 결과를 확인할 수 없어 원문을 만들지 않았어요.', false, null, 'error');
      return false;
    }
    if (editor.value !== authoring.rawText || authoring.rawText.length !== 0) {
      setSaveStatus('원문 있음 · 구조화 원문 생성 0건', 'noop');
      showToast('검증 입력값으로 글 만들기는 빈 원문에서만 실행할 수 있어요. 현재 내용은 그대로입니다.', false);
      return false;
    }
    let plan;
    try {
      plan = M.planStructureTemplatePreviewMaterialization({
        templateId: preview.templateId,
        catalogVersion: preview.catalogVersion,
        contractVersion: preview.contractVersion,
        rawText: authoring.rawText,
        confirmed: true,
        expectedSourceFingerprint: M.fingerprintPersonalWorkspacePocAuthoringSource(authoring.rawText)
      });
    } catch (error) {
      plan = null;
    }
    if (!plan || plan.status !== 'applied' || plan.sourceMutationCount !== 1 || plan.workspaceMutationCount !== 0 || plan.operatingMutationCount !== 0) {
      const noOp = plan && (plan.reason === 'nonempty-source' || plan.reason === 'same-source' || plan.reason === 'cancelled');
      setSaveStatus(noOp ? '구조화 원문 생성 0건 · 원문은 그대로' : '구조화 원문 생성 차단 · 변경 없음', noOp ? 'noop' : 'error');
      showToast(noOp ? '원문을 바꾸지 않았어요.' : '버전·편집기·컴파일 결과를 확인할 수 없어 원문을 만들지 않았어요.', false, null, noOp ? 'status' : 'error');
      return false;
    }
    if (!applyNativeStructureTemplatePreview(editor, plan, preview)) {
      if (!structureTemplatePersistenceRollback && editor.value === authoring.rawText && editor.value.length === 0) {
        setSaveStatus('구조화 원문 생성 실패 · 원문은 그대로예요', 'error');
        showToast('이 브라우저에서는 구조화 원문을 안전하게 만들지 못했어요. 원문은 그대로입니다.', false, null, 'error');
      }
      return false;
    }
    return true;
  }

  function renderCreatorDraftLibrary() {
    if (creatorDraftBlocked()) {
      const reason = creatorDraftLibraryStatus === 'corrupt' ? '저장된 초안 보관함이 손상되었습니다.' : '초안 보관함을 읽을 수 없습니다.';
      return '<section class="creator-drafts creator-drafts-blocked" aria-labelledby="creator-drafts-heading"><div class="creator-drafts-title"><div><p class="eyebrow">이 기기에만 저장</p><h2 id="creator-drafts-heading" tabindex="-1">초안 목록</h2></div></div><div class="empty" role="alert"><strong>' + reason + '</strong><span>기존 바이트를 덮어쓰지 않았습니다. 도움말의 연습 데이터 초기화로 이 PoC 영역만 비울 수 있어요.</span></div></section>';
    }
    const activeCount = M.listCreatorDrafts(creatorDraftLibrary, { archived: false }).length;
    const archivedCount = M.listCreatorDrafts(creatorDraftLibrary, { archived: true }).length;
    const archived = creatorDraftFilter === 'archived';
    const drafts = M.listCreatorDrafts(creatorDraftLibrary, { archived, query: creatorDraftQuery });
    let rows = drafts.map(draft => {
      const itemCount = M.parseSource(draft.rawText).itemCount;
      const menuOpen = creatorDraftMenuId === draft.draftId;
      const renaming = creatorDraftRenameId === draft.draftId;
      const primaryAction = archived
        ? '<button class="button" type="button" data-action="restore-creator-draft" data-id="' + escapeHtml(draft.draftId) + '" data-revision="' + draft.recordRevision + '">복원</button>'
        : '<button class="button" type="button" data-action="open-creator-draft" data-id="' + escapeHtml(draft.draftId) + '">이어서 작성</button>';
      let actionPanel = '';
      if (menuOpen) {
        actionPanel = '<div id="creator-draft-actions-' + escapeHtml(draft.draftId) + '" class="creator-draft-inline-actions">';
        if (renaming) {
          actionPanel += '<form data-creator-rename-form="true" data-id="' + escapeHtml(draft.draftId) + '" data-revision="' + draft.recordRevision + '"><label class="field"><span>초안 이름</span><input name="displayName" value="' + escapeHtml(draft.title) + '" maxlength="100" required autofocus></label><p>원문 제목은 바뀌지 않습니다.</p><div><button class="button" type="button" data-action="cancel-creator-rename" data-id="' + escapeHtml(draft.draftId) + '">취소</button><button class="button primary" type="submit">이름 저장</button></div></form>';
        } else {
          actionPanel += '<button class="button" type="button" data-action="begin-creator-rename" data-id="' + escapeHtml(draft.draftId) + '">이름 바꾸기</button><button class="button" type="button" data-action="clone-creator-draft" data-id="' + escapeHtml(draft.draftId) + '" data-revision="' + draft.recordRevision + '">복제</button>' + (archived ? '' : '<button class="button" type="button" data-action="archive-creator-draft" data-id="' + escapeHtml(draft.draftId) + '" data-revision="' + draft.recordRevision + '">보관함으로</button>');
        }
        actionPanel += '</div>';
      }
      return '<article class="creator-draft-row" data-creator-draft-id="' + escapeHtml(draft.draftId) + '"><div class="creator-draft-copy"><strong>' + escapeHtml(draft.title) + '</strong><span class="creator-draft-source">출처 · ' + escapeHtml(M.creatorDraftSourceLabel(draft.rawText)) + '</span><small>Item ' + itemCount + '개 · ' + escapeHtml(creatorDraftTime(draft.updatedAt)) + '</small></div><div class="creator-draft-row-actions">' + primaryAction + '<button class="icon-button" type="button" data-action="toggle-creator-actions" data-id="' + escapeHtml(draft.draftId) + '" aria-label="' + escapeHtml(draft.title) + ' 초안 더보기" aria-expanded="' + String(menuOpen) + '" aria-controls="creator-draft-actions-' + escapeHtml(draft.draftId) + '">…</button></div>' + actionPanel + '</article>';
    }).join('');
    if (!rows) {
      const emptyCopy = creatorDraftQuery.trim()
        ? '<strong>검색 결과가 없어요.</strong><span>다른 이름이나 원문 내용으로 찾아보세요.</span>'
        : archived
          ? '<strong>보관한 초안이 없어요.</strong><span>작성 중 초안을 보관하면 여기에서 다시 복원할 수 있어요.</span>'
          : '<strong>내 초안이 아직 없어요.</strong><span>작성 화면에서 제작 초안으로 저장하면 여기에 표시됩니다.</span>';
      rows = '<div class="empty creator-draft-empty">' + emptyCopy + '</div>';
    }
    return '<section class="creator-drafts" aria-labelledby="creator-drafts-heading"><div class="creator-drafts-title"><div><p class="eyebrow">이 기기에만 저장</p><h2 id="creator-drafts-heading" tabindex="-1">초안 목록</h2><p>개인공간이나 공개 화면에는 추가되지 않습니다.</p></div><button class="button primary" type="button" data-action="new-authoring">새로 작성</button></div><label class="creator-draft-search" for="creator-draft-search"><span>초안 검색</span><input id="creator-draft-search" type="search" value="' + escapeHtml(creatorDraftQuery) + '" placeholder="제목 또는 출처 검색" autocomplete="off"></label><div class="creator-draft-filters" aria-label="초안 상태"><button type="button" data-action="set-creator-filter" data-filter="active" aria-pressed="' + String(!archived) + '">작성 중 ' + activeCount + '</button><button type="button" data-action="set-creator-filter" data-filter="archived" aria-pressed="' + String(archived) + '">보관함 ' + archivedCount + '</button></div><p class="creator-draft-results" role="status">' + drafts.length + '개 초안</p><div class="creator-draft-list">' + rows + '</div></section>';
  }

  function applyAuthoringOwnerPanel(openedDraft) {
    const heading = document.querySelector('.preview-panel > .panel-head h2');
    const note = document.querySelector('.authoring-result-note');
    const savePanel = document.querySelector('.preview-panel > .save-panel');
    if (!openedDraft) {
      const saveCreator = document.getElementById('save-creator-draft');
      if (saveCreator) saveCreator.textContent = '제작 초안으로 저장';
      const saveNote = savePanel ? savePanel.querySelector('.creator-save-note') : null;
      if (saveNote) saveNote.textContent = '제작 초안은 이 기기에만 저장되며 개인공간이나 공개 화면에는 추가되지 않습니다.';
      return;
    }
    if (heading) heading.textContent = '제작 초안 결과';
    if (note) note.textContent = '현재 원문을 제작 초안 결과로 확인합니다.';
    if (!savePanel) return;
    savePanel.innerHTML = '<p class="creator-save-note"><strong>이 기기에만 저장됩니다.</strong> 개인공간이나 공개 화면에는 추가되지 않습니다.</p><div class="authoring-actions"><button class="button" type="button" data-action="authoring-step" data-step="input">원문 수정</button><button id="save-creator-draft" class="button primary" type="button" data-action="save-creator-draft">초안 변경 저장</button></div>';
  }

  function renderAuthoring() {
    if (draftUnavailable() && authoringStep !== 'drafts') {
      elements.content.innerHTML = '<section class="plan-item-recovery-gate" data-testid="authoring-storage-gate"><h1 tabindex="-1">작성 초안 저장소를 확인해 주세요</h1><p role="alert">보관된 초안을 읽거나 검증하지 못해 새 내용으로 덮어쓰지 않았습니다. 개인공간의 저장 내용은 유지됩니다.</p>'
        + (authoring.rawText ? '<details><summary>이 화면의 입력 확인</summary><pre>' + escapeHtml(authoring.rawText) + '</pre></details>' : '')
        + '<button class="button" type="button" data-action="feature-check-storage" data-feature="draft">작성 초안 다시 확인</button><button class="button" type="button" data-action="go-workspace">개인공간으로</button></section>';
      return;
    }
    if (authoringPropertyTarget && authoringPropertyTarget.draftId !== authoring.draftId) { authoringPropertyTarget = null; authoringChooser = null; }
    if (authoringPropertyReselection && authoringPropertyReselection.draftId !== authoring.draftId) authoringPropertyReselection = null;
    if (authoringPropertyRecovery && authoringPropertyRecovery.draftId !== authoring.draftId) authoringPropertyRecovery = null;
    const structureTemplateReady = structureTemplateRuntimeReady();
    const templates = M.TEMPLATE_CATALOG.map(template => {
      const presentation = template;
      return '<article class="template-option"><button class="template-choice" type="button" data-action="select-template" data-template-id="' + escapeHtml(template.id) + '" data-template-preview-id="' + escapeHtml(template.id) + '" data-structure-preview="' + (structureTemplateReady && structureTemplatePreviewFor(template.id) ? 'available' : 'unavailable') + '" data-preview-active="' + String(authoringTemplatePreviewId === template.id) + '" aria-controls="template-example-preview"><strong>' + escapeHtml(presentation.label) + '</strong><span>' + escapeHtml(presentation.description) + '</span><small>예: ' + escapeHtml(presentation.exampleLabel) + '</small></button></article>';
    }).join('');
    const previewTemplate = M.templateById(authoringTemplatePreviewId) || M.TEMPLATE_CATALOG[0];
    const structurePreview = structureTemplatePreviewFor(previewTemplate.id);
    const structurePreviewContent = renderAuthoringTemplatePreview(previewTemplate, structurePreview);
    const templatePreviewActions = '';
    const pickerHidden = authoring.templatePickerOpen ? '' : ' hidden';
    const inputActive = authoringStep === 'input' ? ' active' : '';
    const resultActive = authoringStep === 'result' ? ' active' : '';
    const activeDraftCount = creatorDraftBlocked() ? 0 : M.listCreatorDrafts(creatorDraftLibrary, { archived: false }).length;
    const openedDraft = currentCreatorDraft();
    const heading = authoringStep === 'drafts' ? '내 초안' : openedDraft ? '초안 편집' : '새 Flow 만들기';
    const headButton = authoringStep === 'drafts'
      ? '<button class="button creator-drafts-desktop" type="button" data-action="authoring-step" data-step="input">작성으로 돌아가기</button>'
      : '<button class="button creator-drafts-desktop" type="button" data-action="authoring-step" data-step="drafts">내 초안 ' + activeDraftCount + '개</button>';
    const head = '<header class="authoring-head"><div><p class="eyebrow">내 원문으로 시작</p><h1 tabindex="-1">' + heading + '</h1><p>' + (authoringStep === 'drafts' ? '개인공간에 추가하기 전 작성본을 찾고 이어서 관리하세요.' : openedDraft ? '내 초안의 원문을 이어서 편집하고 변경을 저장하세요.' : '메모하듯 쓰고 결과를 확인한 뒤 개인공간에 저장하세요.') + '</p></div>' + headButton + '</header>';
    const mobileTabs = '<nav class="authoring-mobile-tabs" aria-label="작성 화면"><button id="authoring-tab-input" type="button" data-action="authoring-step" data-step="input" aria-current="' + (authoringStep === 'input' ? 'page' : 'false') + '">입력</button><button id="authoring-tab-result" type="button" data-action="authoring-step" data-step="result" aria-current="' + (authoringStep === 'result' ? 'page' : 'false') + '">결과</button><button id="authoring-tab-drafts" type="button" data-action="authoring-step" data-step="drafts" aria-current="' + (authoringStep === 'drafts' ? 'page' : 'false') + '">내 초안</button></nav>';
    if (authoringStep === 'drafts') {
      elements.content.innerHTML = '<section class="authoring-shell authoring-shell-library" data-product-plan-item-grammar="v1">' + head + mobileTabs + renderCreatorDraftLibrary() + '</section>';
      return;
    }
    const openedNote = openedDraft ? '<p class="creator-open-note">“' + escapeHtml(openedDraft.title) + '” 초안을 편집 중입니다.</p>' : '';
    const validationExamplesReady = validationExampleRuntimeReady();
    const validationExampleLaunch = '<div class="template-launch validation-example-launch"><div><strong>검증 예시</strong><span>' + (validationExamplesReady ? '완성된 원문 사례를 읽고 빈 원문에서 시작합니다.' : '예시 catalog를 불러오지 못했습니다.') + '</span></div><button class="button" id="validation-example-opener" type="button" data-action="open-validation-examples" aria-haspopup="dialog" aria-expanded="' + String(validationExampleExplorerOpen) + '" aria-controls="validation-example-dialog"' + (validationExamplesReady ? '' : ' disabled') + '>검증 예시 찾아보기</button></div>';
    elements.content.innerHTML = '<section class="authoring-shell" data-product-plan-item-grammar="v1">' + head + mobileTabs + '<div class="authoring-grid"><section class="editor-panel authoring-pane' + inputActive + '" data-authoring-pane="input"><div class="panel-head"><h2>메모하듯 작성하세요</h2><span id="source-count"></span></div>' + openedNote + '<div class="template-launch"><div><strong>작성 틀</strong><span>빈 원문에 골격만 넣습니다.</span></div><button class="button" id="template-picker-opener" type="button" data-action="toggle-template-picker" aria-expanded="' + String(authoring.templatePickerOpen) + '" aria-controls="template-picker-panel">작성 틀 보기</button></div>' + validationExampleLaunch + '<section id="template-picker-panel" class="template-picker-panel" aria-label="작성 틀 선택"' + pickerHidden + '><div class="template-picker-head"><div><strong>어떤 구조로 쓸까요?</strong><span>컴파일 예시를 확인하고 빈 골격 또는 검증 입력값을 명시적으로 적용하세요.</span></div><button class="icon-button" type="button" data-action="cancel-template-picker" aria-label="작성 틀 닫기">×</button></div><div class="template-grid">' + templates + '</div><aside id="template-example-preview" class="template-example" data-structure-contract="' + escapeHtml(structurePreview ? structurePreview.contractVersion : 'unavailable') + '" data-structure-catalog="' + escapeHtml(structurePreview ? structurePreview.catalogVersion : 'unavailable') + '" role="region" aria-labelledby="template-example-label">' + structurePreviewContent + templatePreviewActions + '</aside><p class="template-contract">틀 이름·설명·컴파일 예시는 원문에 들어가지 않습니다. 두 적용 행동은 정확히 빈 원문에서만 한 번 실행됩니다.</p></section><textarea id="flow-editor" class="flow-editor" spellcheck="false" aria-label="Flow 원문" placeholder="# Flow 이름\n\n## 첫 단계\n- [ ] 할 일">' + escapeHtml(authoring.rawText) + '</textarea><div class="authoring-input-actions"><button class="button" type="button" data-action="cancel-authoring">취소</button><button class="button primary" type="button" data-action="authoring-step" data-step="result">결과 보기</button></div></section><aside class="preview-panel authoring-pane' + resultActive + '" data-authoring-pane="result"><div class="panel-head"><div><h2>개인공간에 들어갈 내용</h2><span>작성 원문 → 결과</span></div><button id="authoring-review-opener" class="button subtle" type="button" data-action="toggle-authoring-review" aria-label="원문과 실행 항목 검토, 0개" aria-controls="authoring-review" aria-expanded="' + String(authoringReviewOpen) + '">항목 검토</button></div><p class="authoring-result-note">현재 원문을 실행할 Item으로 정리한 결과입니다.</p><div id="authoring-artifact-result" class="preview-body"></div><section id="authoring-review" class="authoring-review" aria-label="항목 검토" hidden><div class="authoring-review-head"><h2>항목 검토</h2><button class="icon-button" type="button" data-action="close-authoring-review" aria-label="원문과 실행 항목 검토 닫기">×</button></div><div id="authoring-review-body"></div></section><div class="preview-body save-panel"><label class="field"><span>저장할 폴더</span><select id="authoring-folder">' + folderOptions(authoring.folderId, true) + '</select></label><p class="creator-save-note">내 초안은 작성 전용 보관함입니다. 개인공간에는 아직 추가되지 않습니다.</p><div class="authoring-actions"><button class="button" type="button" data-action="authoring-step" data-step="input">원문 수정</button><button id="save-creator-draft" class="button" type="button" data-action="save-creator-draft">' + (openedDraft ? '초안 변경 저장' : '내 초안에 보관') + '</button><button id="commit-authoring" class="button primary authoring-save-action" type="button" data-action="commit-authoring">개인 Flow로 저장</button></div></div></aside></div><div id="validation-example-host"></div></section>';
    // HTML parsing strips the first LF after a textarea start tag. Hydrate only
    // this newly created editor; retained editor/history paths never come here.
    document.getElementById('flow-editor').value = authoring.rawText;
    applyAuthoringOwnerPanel(openedDraft);
    mountAuthoringGhostEditor();
    if (authoringPropertyIsRecovering()) document.getElementById('flow-editor').readOnly = true;
    prepareTemplatePreviewAccessibility();
    renderAuthoringPreview();
    renderValidationExampleExplorer();
  }

  function renderAuthoringTemplatePreview(template, preview) {
    const id = escapeHtml(template.id);
    return '<strong id="template-example-label" aria-live="polite">' + escapeHtml(template.label) + ' · 빈 틀</strong>'
      + '<p>빈칸에 내 내용을 채워 시작합니다.</p><pre id="template-scaffold-source">' + escapeHtml(template.scaffold) + '</pre>'
      + '<div class="template-preview-actions"><button class="button primary template-apply" type="button" data-action="apply-template" data-template-id="' + id + '">빈 틀 넣기</button></div>'
      + (preview ? '' : '<p id="template-structure-warning" class="template-structure-warning" role="alert">버전을 확인할 수 없어 완성 예시를 표시하지 않습니다.</p>')
      + '<details id="template-completed-example"><summary>완성 예시 보기</summary><p>' + escapeHtml(template.exampleLabel) + '</p>'
      + (preview ? '<pre id="template-example-source">' + escapeHtml(preview.expectedRawText) + '</pre><p id="template-structure-guidance">예시의 내용으로 시작하려면 아래 버튼을 누르세요. 빈 원문에서만 적용됩니다.</p><button class="button template-structure-apply" type="button" data-action="materialize-structure-template-preview" data-template-id="' + id + '">이 예시로 시작</button>'
        : '')
      + '</details><details id="template-verification-details"><summary>검증 정보</summary><p id="template-structure-meta" class="template-structure-meta">'
      + (preview ? 'StructureDraft ' + escapeHtml(preview.contractVersion) + ' · 카탈로그 ' + escapeHtml(preview.catalogVersion) + ' · 틀 ' + escapeHtml(preview.templateVersion) + ' · Item ' + preview.expectedItemCount + '개' : '컴파일 예시 확인 불가') + '</p></details>';
  }

  function setAuthoringTemplatePreview(templateId) {
    const template = M.templateById(templateId);
    if (!template) return;
    const structurePreview = structureTemplatePreviewFor(template.id);
    authoringTemplatePreviewId = template.id;
    document.querySelectorAll('.template-choice[data-template-preview-id]').forEach(choice => {
      choice.dataset.previewActive = String(choice.dataset.templatePreviewId === template.id);
    });
    const preview = document.getElementById('template-example-preview');
    if (preview) {
      preview.dataset.structureContract = structurePreview ? structurePreview.contractVersion : 'unavailable';
      preview.dataset.structureCatalog = structurePreview ? structurePreview.catalogVersion : 'unavailable';
      preview.innerHTML = renderAuthoringTemplatePreview(template, structurePreview);
    }
    prepareTemplatePreviewAccessibility();
  }

  function setAuthoringReviewOpen(open, returnFocus) {
    authoringReviewOpen = open;
    if (!open && authoringChooserEntry === 'review') { authoringPropertyTarget = null; authoringChooser = null; }
    const review = document.getElementById('authoring-review');
    const opener = document.getElementById('authoring-review-opener');
    if (review) review.hidden = !open;
    if (opener) opener.setAttribute('aria-expanded', String(open));
    if (open && review) {
      const close = review.querySelector('[data-action="close-authoring-review"]');
      if (close) close.focus();
    } else if (returnFocus && opener) opener.focus();
  }

  function currentAuthoringPropertyTicket(target) {
    return Boolean(target && target.state !== 'stale' && target.state !== 'recovery-required'
      && target.draftId === authoring.draftId && target.epoch === authoringSourceEpoch
      && target.beforeRawText === authoring.rawText
      && target.sourceFingerprint === M.fingerprint(authoring.rawText)
      && target.editor === document.getElementById('flow-editor'));
  }

  function authoringPropertyIsRecovering() {
    return Boolean(authoringPropertyRecovery && authoringPropertyRecovery.draftId === authoring.draftId);
  }

  function rememberAuthoringPropertyInputs(form) {
    if (!authoringPropertyTarget || !form) return;
    const values = Object.assign({}, authoringPropertyTarget.values);
    new FormData(form).forEach((value, name) => { values[name === 'value' ? form.dataset.key : name] = String(value); });
    authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { values });
  }

  function setAuthoringPropertyResult(status, message) {
    elements.app.dataset.authoringPropertyState = status;
    if (authoringPropertyTarget) authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { state: status });
    window.clearTimeout(showToast.timer);
    pendingRetry = null;
    elements.toast.hidden = true;
    setSaveStatus(message, status === 'success' ? 'saved' : status === 'noop' || status === 'canceled' ? 'noop' : 'error');
    if (status === 'recovery-required') {
      authoringPropertyRecovery = { draftId: authoring.draftId };
      const editor = document.getElementById('flow-editor');
      if (editor) editor.readOnly = true;
    }
    renderAuthoringPreview();
    if (elements.dialog.open) {
      elements.dialog.querySelectorAll('button[type="submit"]').forEach(button => {
        button.disabled = status === 'stale' || status === 'recovery-required';
        if (status === 'failed') { button.textContent = '다시 시도'; button.dataset.authoringPropertyRetry = 'true'; }
      });
    }
    return { status };
  }

  function renderAuthoringPropertyGuard() {
    const target = authoringPropertyTarget;
    if (authoringPropertyIsRecovering()) return '<section class="property-inline-tray" data-authoring-property-recovery="true"><strong>복구 상태를 확인하지 못했어요.</strong><p>추가 반영을 멈췄어요. 현재 원문을 확인하고 필요한 내용은 복사해 두세요.</p></section>';
    if (target && target.state === 'stale') {
      const entry = M.authoringPropertyByKey(target.editorKey);
      const values = Object.entries(target.values || {}).map(([key, value]) => '<div><strong>' + escapeHtml((M.authoringPropertyByKey(key) || {}).label || key) + '</strong><p style="overflow-wrap:anywhere">' + escapeHtml(value) + '</p></div>').join('');
      return '<section class="property-inline-tray" data-authoring-property-stale="true"><strong style="overflow-wrap:anywhere">' + escapeHtml(target.title) + (entry ? ' · ' + escapeHtml(entry.label) : '') + '</strong><p>원문이 바뀌어 적용할 항목을 다시 확인해야 해요.</p>' + values + '<button class="button" type="button" data-action="reselect-authoring-property" data-authoring-property-reselect="true">항목 다시 선택</button><button class="button" type="button" data-action="cancel-stale-authoring-property">취소</button></section>';
    }
    if (authoringPropertyReselection && authoringPropertyReselection.draftId === authoring.draftId) return '<p data-authoring-property-reselecting="true">적용할 항목의 속성 편집을 선택하세요. 입력한 값은 새 대상을 확인한 뒤에만 적용합니다.</p>';
    if (target && target.state === 'failed') return '<p data-authoring-property-failure="true">보관하지 못해 원문은 바꾸지 않았어요. 입력한 값은 남아 있어요.</p>';
    return '';
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
    const value = Object.prototype.hasOwnProperty.call(authoringPropertyTarget.values || {}, entry.key)
      ? authoringPropertyTarget.values[entry.key] : authoringPropertyValue(item, entry);
    const inputId = 'authoring-inline-property-' + item.sourceLine + '-' + entry.key;
    const label = entry.key === 'subcheck'
      ? '추가할 하위 체크'
      : entry.key === 'guide' || entry.key === 'caution'
        ? '새 ' + entry.label + ' 한 줄'
        : entry.label;
    const failure = authoringPropertyTarget.state === 'failed'
      ? '<p class="property-save-error" role="status">보관하지 못해 원문은 바꾸지 않았어요. 입력한 값은 남아 있어요.</p>' : '';
    return '<form class="property-inline-form" data-authoring-inline-form="true" data-line="' + item.sourceLine + '" data-key="' + escapeHtml(entry.key) + '"><p class="property-dependent-owner"><strong>' + escapeHtml(item.title) + '</strong> · ' + escapeHtml(label) + '</p>' + failure + '<label for="' + escapeHtml(inputId) + '"><span>' + escapeHtml(label) + '</span><input id="' + escapeHtml(inputId) + '" name="value" type="' + propertyInputType(entry) + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(propertyInputPlaceholder(entry)) + '" autocomplete="off" autofocus></label><p>' + (entry.key === 'guide' || entry.key === 'caution' || entry.key === 'subcheck' ? '같은 문장은 추가하지 않습니다.' : '적용할 때 원문 한 곳만 한 번 바꿉니다.') + '</p><div class="property-inline-actions"><button class="button" type="button" data-action="cancel-authoring-property" data-line="' + item.sourceLine + '" data-key="' + escapeHtml(entry.key) + '">취소</button><button class="button primary" type="submit"' + (authoringPropertyTarget.state === 'failed' ? ' data-authoring-property-retry="true"' : '') + '>' + (authoringPropertyTarget.state === 'failed' ? '다시 시도' : entry.key === 'subcheck' || entry.key === 'guide' || entry.key === 'caution' ? '추가' : '적용') + '</button></div></form>';
  }

  function renderAuthoringPropertyTray(item) {
    if (!currentAuthoringPropertyTicket(authoringPropertyTarget) || authoringPropertyTarget.line !== item.sourceLine) return '';
    if (!authoringChooser || authoringChooser.stage === 'closed') return '';
    const view = A.selectAuthoringChooser(authoringChooser);
    const activeGroup = view.group;
    const groups = view.groups.map(group => '<button class="property-group-choice" type="button" data-action="choose-authoring-property-group" data-line="' + item.sourceLine + '" data-group="' + escapeHtml(group.key) + '"><strong>' + escapeHtml(group.label) + '</strong></button>').join('');
    const keys = view.stage === 'value' ? [authoringPropertyTarget.editorKey] : view.propertyKeys;
    const entries = keys.map(key => M.authoringPropertyByKey(key)).filter(Boolean).map(entry => {
      const instances = authoringPropertyInstances(item, entry);
      const active = authoringPropertyTarget.editorKey === entry.key;
      const dependent = dependentPropertyKind(entry.key);
      const actionKey = dependent || entry.key;
      const actionLabel = dependent
        ? entry.key === 'repeatEnd' ? '반복과 함께 설정' : '함께 설정'
        : entry.key === 'subcheck' || entry.key === 'guide' || entry.key === 'caution' ? '추가' : instances.length ? '바꾸기' : '입력';
      return '<article class="property-card" data-property-key="' + escapeHtml(entry.key) + '" data-write-support="' + escapeHtml(entry.writeSupport) + '"><div class="property-card-head"><div><strong>' + escapeHtml(entry.label) + '</strong><small>원문 표기 · ' + escapeHtml(entry.sourceLabel) + '</small></div><button class="button quiet" type="button" data-action="edit-authoring-property" data-line="' + item.sourceLine + '" data-key="' + escapeHtml(actionKey) + '" aria-expanded="' + String(active) + '">' + escapeHtml(actionLabel) + '</button></div>' + renderAuthoringPropertyInstances(item, entry, instances) + renderAuthoringInlinePropertyForm(item, entry) + '</article>';
    }).join('');
    const heading = view.stage === 'groups' ? '추가할 정보 선택' : (A.getAuthoringChooserGroup(activeGroup) || {}).label || '항목 정보';
    const back = view.stage !== 'groups' || authoringChooser.entry === 'structure'
      ? '<button class="button" type="button" data-action="back-authoring-chooser">뒤로</button>' : '';
    return '<section id="authoring-property-tray-' + item.sourceLine + '" class="property-inline-tray" data-authoring-property-tray="true" data-chooser-stage="' + view.stage + '" data-owner-line="' + item.sourceLine + '" aria-labelledby="authoring-property-tray-heading-' + item.sourceLine + '"><header><div><p>' + escapeHtml(item.title) + '</p><h4 id="authoring-property-tray-heading-' + item.sourceLine + '" tabindex="-1">' + escapeHtml(heading) + '</h4></div><div>' + back + '<button class="button" type="button" data-action="close-authoring-properties" data-line="' + item.sourceLine + '">닫기</button></div></header><p class="property-boundary-copy">적용하면 이 항목의 원문과 결과가 함께 바뀝니다.</p>' + (groups ? '<div class="property-group-chooser" role="group" aria-label="정보 범주">' + groups + '</div>' : '') + (entries ? '<div class="property-card-list" data-property-group="' + escapeHtml(activeGroup) + '">' + entries + '</div>' : '') + '</section>';
  }

  function dispatchAuthoringChooser(command) {
    if (!authoringChooser) return null;
    const result = A.reduceAuthoringChooser(authoringChooser, Object.assign({}, command,
      { owner: authoringChooser.owner, session: authoringChooser.session }),
      { navigationLocked: authoringPropertyApplying || authoringPropertyIsRecovering() });
    authoringChooser = result.state;
    return result;
  }

  function rememberAuthoringChooserValue() {
    if (!authoringChooser || authoringChooser.stage !== 'value' || !authoringPropertyTarget) return;
    dispatchAuthoringChooser({ type: 'remember-value', key: authoringChooser.property, draft: authoringPropertyTarget });
  }

  function backAuthoringChooser() {
    if (!authoringChooser || authoringPropertyApplying || authoringPropertyIsRecovering()) return;
    rememberAuthoringChooserValue();
    const result = dispatchAuthoringChooser({ type: 'back' });
    if (!result || !result.changed) return;
    if (elements.dialog.open && elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]')) {
      elements.dialog.close(); dialogSubmit = null; dialogReturnFocus = null;
    }
    if (result.state.stage === 'closed') { closeAuthoringProperties(authoringPropertyTarget && authoringPropertyTarget.line); return; }
    if (authoringPropertyTarget) authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { editorKey: null, dependentKind: null });
    renderAuthoringPreview();
    const selector = result.focus === 'property' && result.focusKey ? authoringPropertyOpenerSelector(authoringPropertyTarget.line, result.focusKey)
      : result.focus === 'group' ? '[data-action="choose-authoring-property-group"][data-group="' + result.focusKey + '"]'
        : result.focus === 'structure' ? '[data-action="authoring-context-information"]' : '[data-chooser-stage] h4';
    focusAfterRender(selector, '#authoring-context-heading');
  }

  function readAuthoringContextSnapshot(editor) {
    return { editorId: authoring.draftId + ':native-editor', documentId: authoring.draftId,
      rawText: editor.value, sourceFingerprint: A.fingerprintPersonalWorkspacePocAuthoringSource(editor.value),
      selectionStart: editor.selectionStart, selectionEnd: editor.selectionEnd,
      selectionDirection: editor.selectionDirection, scrollTop: editor.scrollTop, scrollLeft: editor.scrollLeft,
      dispatchCount: authoringSourceEpoch, composing: authoringEditorComposing || authoringPropertyComposing };
  }

  function openAuthoringContext(opener) {
    const editor = document.getElementById('flow-editor');
    if (!editor || authoringPropertyApplying || authoringPropertyIsRecovering() || authoringEditorComposing) return;
    const snapshot = readAuthoringContextSnapshot(editor);
    const target = A.resolvePersonalWorkspacePocAuthoringGuideTarget({ rawText: snapshot.rawText,
      sourceFingerprint: snapshot.sourceFingerprint, selectionStart: snapshot.selectionStart, selectionEnd: snapshot.selectionEnd });
    if (!target || snapshot.rawText !== authoring.rawText) return;
    if (authoringChooserEntry === 'context' && authoringChooser && authoringChooser.stage !== 'closed') {
      closeAuthoringProperties(authoringPropertyTarget.line); return;
    }
    let beforeDraftBytes = null; let draftReadError = false;
    try { beforeDraftBytes = storage.getItem(M.DRAFT_STORAGE_KEY); } catch (_) { draftReadError = true; }
    const line = target.ownerItemLine || target.line;
    const item = M.parseSource(authoring.rawText).steps.flatMap(step => step.items).find(entry => entry.sourceLine === line);
    authoringPropertyTarget = { line, title: item ? item.title : '원문 ' + line + '행',
      sourceFingerprint: M.fingerprint(authoring.rawText), beforeRawText: authoring.rawText,
      beforeDraftBytes, draftReadError, draftId: authoring.draftId, epoch: authoringSourceEpoch, editor,
      group: null, editorKey: null, values: {}, state: 'ready', guideTarget: target,
      guideTicket: A.createPersonalWorkspacePocSourceEditorTicket({ transactionId: 'standalone-context-' + (++authoringHelperSequence), kind: 'helper', snapshot }) };
    authoringPropertyReselection = null;
    authoringChooserEntry = 'context'; authoringChooserOpener = opener;
    authoringChooser = A.createAuthoringChooser({ owner: authoringPropertyTarget, entry: 'structure' });
    authoringReviewOpen = false;
    renderAuthoringPreview();
    focusAfterRender('#authoring-context-heading', '#authoring-context-anchor');
  }

  function renderAuthoringContextPanel() {
    const panel = document.getElementById('authoring-context-panel');
    const anchor = document.getElementById('authoring-context-anchor');
    if (!panel) return;
    const open = Boolean(authoringChooserEntry === 'context' && authoringChooser && authoringChooser.stage !== 'closed' && authoringPropertyTarget);
    panel.hidden = !open;
    if (anchor) anchor.setAttribute('aria-expanded', String(open));
    if (!open) { panel.replaceChildren(); return; }
    if (!currentAuthoringPropertyTicket(authoringPropertyTarget)) {
      panel.innerHTML = renderAuthoringPropertyGuard(); return;
    }
    const owner = authoringPropertyTarget;
    if (authoringChooser.stage === 'structure') {
      const guide = owner.guideTarget;
      const actions = guide.allowedActionIds.filter(id => ['flow-title', 'first-step', 'first-task', 'next-task', 'new-step'].includes(id));
      panel.innerHTML = '<section class="property-inline-tray" data-chooser-stage="structure"><header><h4 id="authoring-context-heading" tabindex="-1">' + escapeHtml(owner.title) + '</h4><button class="button" data-action="close-authoring-properties" data-line="' + owner.line + '">닫기</button></header><div class="authoring-context-commands">' + actions.map(id => {
        const action = A.getPersonalWorkspacePocAuthoringMenuAction(id);
        return '<button class="button" data-action="authoring-context-command" data-command="' + id + '">' + escapeHtml(action.label) + '</button>';
      }).join('') + (guide.kind === 'root-item' ? '<button class="button" data-action="authoring-context-information">항목 정보</button><button class="button" data-action="authoring-context-subcheck">하위 확인</button>' : '') + '</div></section>';
    } else {
      const item = M.parseSource(authoring.rawText).steps.flatMap(step => step.items).find(entry => entry.sourceLine === owner.line);
      panel.innerHTML = item ? renderAuthoringPropertyTray(item) : renderAuthoringPropertyGuard();
    }
  }

  function applyAuthoringContextCommand(actionId) {
    const editor = document.getElementById('flow-editor');
    const owner = authoringPropertyTarget;
    if (!editor || !owner || !currentAuthoringPropertyTicket(owner) || !owner.guideTicket || !authoringChooser || authoringChooser.stage !== 'structure') return;
    const result = A.planPersonalWorkspacePocHelperTransaction({ ticket: owner.guideTicket,
      current: readAuthoringContextSnapshot(editor), target: owner.guideTarget, actionId });
    if (!result.ok) { setAuthoringPropertyResult(result.reason.startsWith('stale') ? 'stale' : 'failed', '현재 원문 위치를 다시 확인해 주세요. 원문은 바꾸지 않았어요.'); return; }
    const replacement = result.plan.replacement;
    const applied = applyAuthoringSourcePlan({ nextRawText: result.plan.nextSnapshot.rawText,
      transaction: { kind: 'property-context-structure', beforeRawText: owner.beforeRawText,
        beforeFingerprint: owner.sourceFingerprint, change: { from: replacement.replaceStart, to: replacement.replaceEnd, insert: replacement.insertedText } },
      selection: { start: replacement.nextSelectionStart, end: replacement.nextSelectionEnd } }, '현재 위치에 내용을 추가했어요.');
    if (applied.status === 'success') { authoringChooser = null; authoringPropertyTarget = null; renderAuthoringContextPanel(); }
  }

  function isAuthoringReviewItemOpen(line) {
    return Boolean(authoringChooserEntry === 'review' && authoringChooser && authoringChooser.stage !== 'closed' && currentAuthoringPropertyTicket(authoringPropertyTarget) && authoringPropertyTarget.line === line);
  }

  function renderAuthoringReviewItem(item) {
    const open = isAuthoringReviewItemOpen(item.sourceLine);
    return '<li class="authoring-review-item" data-authoring-item-line="' + item.sourceLine + '"><div class="authoring-review-summary"><span><strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.date ? dateLabel(item.date) : '날짜 미정') + '</small></span><button class="button quiet" type="button" data-action="open-authoring-properties" data-line="' + item.sourceLine + '" aria-expanded="' + String(open) + '" aria-controls="authoring-property-tray-' + item.sourceLine + '">' + (open ? '속성 접기' : '속성 편집') + '</button></div>' + (open ? renderAuthoringPropertyTray(item) : '') + '</li>';
  }

  function setAuthoringPaneWithoutRemount(step) {
    authoringStep = step;
    document.querySelectorAll('[data-authoring-pane]').forEach(pane => pane.classList.toggle('active', pane.dataset.authoringPane === step));
    ['input', 'result', 'drafts'].forEach(name => {
      const tab = document.getElementById('authoring-tab-' + name);
      if (tab) tab.setAttribute('aria-current', name === step ? 'page' : 'false');
    });
  }

  function applyAuthoringSourcePlan(plan, successMessage) {
    if (authoringPropertyApplying || authoringPropertyComposing || authoringPropertyCompositionEnter || authoringPropertyIsRecovering()) return { status: 'blocked' };
    if (!workspaceWritable()) return { status: 'blocked' };
    // Helpers persist before native insertion, which may not fire beforeinput.
    // Reject observed library drift here, before either side can be changed.
    if (personalEntryReturnConflicts.creator) return setAuthoringPropertyResult('failed', '내 초안 보관함이 다른 화면에서 바뀌어 적용을 막았습니다. 현재 입력과 원문은 그대로입니다.');
    if (draftUnavailable()) return setAuthoringPropertyResult('failed', '작성 초안 보관 상태를 먼저 다시 확인해 주세요. 현재 입력과 원문은 그대로입니다.');
    const editor = document.getElementById('flow-editor');
    const change = plan && plan.transaction && plan.transaction.change;
    const propertyPlan = plan && plan.transaction && /^property-/.test(plan.transaction.kind);
    if ((propertyPlan && !currentAuthoringPropertyTicket(authoringPropertyTarget))
      || !editor || !change || editor.value !== authoring.rawText
      || plan.transaction.beforeRawText !== authoring.rawText
      || plan.transaction.beforeFingerprint !== M.fingerprint(authoring.rawText)) {
      return setAuthoringPropertyResult('stale', '원문이 바뀌어 적용할 항목을 다시 확인해야 해요.');
    }
    if (editor.value.slice(0, change.from) + change.insert + editor.value.slice(change.to) !== plan.nextRawText
      || typeof document.execCommand !== 'function') {
      return setAuthoringPropertyResult('failed', '안전한 원문 변경을 지원하지 않아 반영하지 않았어요.');
    }
    const before = {
      value: editor.value, authoring: Object.assign({}, authoring), stored: authoringDraftStored,
      epoch: authoringSourceEpoch, selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd, selectionDirection: editor.selectionDirection,
      scrollTop: editor.scrollTop, scrollLeft: editor.scrollLeft,
      step: authoringStep, reviewOpen: authoringReviewOpen, dialogOpen: elements.dialog.open
    };
    let beforeBytes;
    if (propertyPlan && authoringPropertyTarget.draftReadError) return setAuthoringPropertyResult('failed', '작성 초안을 읽지 못해 원문은 바꾸지 않았어요. 항목을 다시 선택해 주세요.');
    try { beforeBytes = storage.getItem(M.DRAFT_STORAGE_KEY); }
    catch (error) { return setAuthoringPropertyResult('failed', '보관 상태를 읽지 못해 원문은 바꾸지 않았어요. 입력한 값은 남아 있어요.'); }
    // One exact read owns this helper attempt. Do not consume a transient read
    // failure in a generic feature preflight before its retry feedback can run.
    const checkedDraft = M.loadAuthoringDraft({ getItem: key => {
      if (key !== M.DRAFT_STORAGE_KEY) throw new Error('unexpected-helper-draft-key');
      return beforeBytes;
    } });
    if (!['empty', 'restored'].includes(checkedDraft.status)) {
      loadedDraft = checkedDraft;
      return setAuthoringPropertyResult('failed', '보관된 초안을 확인하지 못해 원문은 바꾸지 않았어요. 초안 보관 상태를 다시 확인해 주세요.');
    }
    if (propertyPlan && beforeBytes !== authoringPropertyTarget.beforeDraftBytes) return setAuthoringPropertyResult('stale', '보관된 원문이 바뀌어 적용할 항목을 다시 확인해야 해요.');
    const candidate = Object.assign({}, before.authoring, { rawText: plan.nextRawText, sourceConfirmed: false });
    authoringPropertyApplying = true;
    elements.app.dataset.authoringPropertyState = 'saving';
    setSaveStatus('반영 중…', 'saving');
    const persisted = forceWriteError
      ? { status: 'failed' }
      : M.writeAuthoringDraftCandidate(storage, candidate, beforeBytes);
    if (persisted.status !== 'success') {
      authoringPropertyApplying = false;
      return setAuthoringPropertyResult(persisted.status,
        persisted.status === 'recovery-required' ? '복구 상태를 확인하지 못했어요.'
          : persisted.status === 'stale' ? '보관된 원문이 바뀌어 적용할 항목을 다시 확인해야 해요.'
            : '보관하지 못해 원문은 바꾸지 않았어요. 입력한 값은 남아 있어요.');
    }
    // Keep this exact textarea alive: remounting would discard its native history.
    if (before.dialogOpen) elements.dialog.close();
    setAuthoringPaneWithoutRemount('input');
    editor.focus({ preventScroll: true });
    editor.setSelectionRange(change.from, change.to);
    nativeSourcePlanPending = true;
    nativeSourcePlanInputEventCount = 0;
    let commandAccepted = false;
    try { commandAccepted = document.execCommand('insertText', false, change.insert); }
    catch (error) { commandAccepted = false; }
    const exactCommit = editor.value === plan.nextRawText && nativeSourcePlanInputEventCount > 0;
    if (!exactCommit) {
      const changed = editor.value !== before.value;
      if (changed) {
        try { document.execCommand('undo'); } catch (error) { /* Byte verification below owns recovery. */ }
        authoringRejectedNativeRedo = { draftId: authoring.draftId, beforeRawText: before.value };
      }
      nativeSourcePlanPending = false;
      const sourceRestored = editor.value === before.value;
      const restored = M.restoreAuthoringDraftCandidate(storage, beforeBytes, persisted.candidateBytes);
      authoring = Object.assign({}, before.authoring, { rawText: editor.value });
      authoringDraftStored = before.stored;
      authoringSourceEpoch = before.epoch;
      authoringPropertyApplying = false;
      if (sourceRestored) {
        editor.setSelectionRange(before.selectionStart, before.selectionEnd, before.selectionDirection);
        editor.scrollTop = before.scrollTop;
        editor.scrollLeft = before.scrollLeft;
      }
      authoringReviewOpen = before.reviewOpen;
      setAuthoringPaneWithoutRemount(before.step);
      if (before.dialogOpen) elements.dialog.showModal();
      renderAuthoringGhosts();
      return setAuthoringPropertyResult(sourceRestored && restored.status === 'restored' ? 'failed' : 'recovery-required',
        sourceRestored && restored.status === 'restored'
          ? '원문 반영을 확인하지 못해 이전 내용으로 되돌렸어요. 입력한 값은 남아 있어요.'
          : '복구 상태를 확인하지 못했어요.');
    }
    nativeSourcePlanPending = false;
    authoring = candidate;
    authoringDraftStored = true;
    loadedDraft = { status: 'restored', authoring };
    authoringRejectedNativeRedo = null;
    authoringSourceMutationCount += 1;
    elements.app.dataset.authoringSourceMutations = String(authoringSourceMutationCount);
    if (authoringPropertyTarget) {
      authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, {
        sourceFingerprint: M.fingerprint(candidate.rawText), beforeRawText: candidate.rawText,
        beforeDraftBytes: persisted.candidateBytes, draftReadError: false,
        epoch: authoringSourceEpoch, editorKey: null, values: {}, state: 'success'
      });
    }
    authoringReviewOpen = false;
    if (before.dialogOpen) { dialogSubmit = null; dialogReturnFocus = null; }
    authoringPropertyApplying = false;
    authoringChooser = null;
    renderAuthoringGhosts();
    const selection = plan.selection || { start: change.from, end: change.from + change.insert.length };
    editor.setSelectionRange(selection.start, selection.end);
    return setAuthoringPropertyResult('success', '항목 정보를 반영하고 이 기기에 보관했어요.');
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
    return setAuthoringPropertyResult(result.status === 'no-op' ? 'noop' : result.reason === 'stale-source' ? 'stale' : 'failed', message);
  }

  function openAuthoringProperties(line) {
    if (authoringPropertyIsRecovering() || authoringPropertyApplying) return;
    const parsed = M.parseSource(authoring.rawText);
    const item = parsed.steps.flatMap(step => step.items).find(entry => entry.sourceLine === line);
    if (!item) {
      setSaveStatus('편집할 Item을 찾지 못했어요.', 'error');
      return;
    }
    const alreadyOpen = isAuthoringReviewItemOpen(line);
    let beforeDraftBytes = null;
    let draftReadError = false;
    try { beforeDraftBytes = storage.getItem(M.DRAFT_STORAGE_KEY); }
    catch (error) { draftReadError = true; }
    const retained = authoringPropertyReselection && authoringPropertyReselection.draftId === authoring.draftId ? authoringPropertyReselection : null;
    authoringPropertyTarget = alreadyOpen ? null : {
      line, title: item.title, sourceFingerprint: parsed.sourceFingerprint, beforeRawText: authoring.rawText,
      beforeDraftBytes, draftReadError,
      draftId: authoring.draftId, epoch: authoringSourceEpoch, editor: document.getElementById('flow-editor'),
      group: retained ? retained.group : null, editorKey: retained ? retained.editorKey : null,
      values: retained ? retained.values : {}, state: 'ready'
    };
    authoringChooserEntry = 'review';
    authoringChooserOpener = document.querySelector('[data-action="open-authoring-properties"][data-line="' + line + '"]');
    authoringChooser = authoringPropertyTarget ? A.createAuthoringChooser({ owner: authoringPropertyTarget, entry: 'groups' }) : null;
    if (retained && retained.editorKey && authoringChooser) {
      const group = A.getAuthoringChooserPropertyGroup(retained.editorKey);
      if (group) {
        dispatchAuthoringChooser({ type: 'choose-group', group: group.key });
        dispatchAuthoringChooser({ type: 'choose-property', key: retained.editorKey, initialDraft: authoringPropertyTarget });
      }
    }
    authoringPropertyReselection = null;
    elements.app.dataset.authoringPropertyState = alreadyOpen ? 'canceled' : 'ready';
    renderAuthoringPreview();
    if (retained && retained.dependentKind) {
      openAuthoringDependentPropertyDialog(line, retained.dependentKind);
      return;
    }
    focusAfterRender(alreadyOpen ? '[data-action="open-authoring-properties"][data-line="' + line + '"]' : '#authoring-property-tray-heading-' + line, '#authoring-review-opener');
  }

  function chooseAuthoringPropertyGroup(line, group) {
    if (!authoringPropertyTarget || authoringPropertyTarget.line !== line || !A.getAuthoringChooserGroup(group)) return;
    const result = dispatchAuthoringChooser({ type: 'choose-group', group });
    if (!result || !result.changed) return;
    authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { group, editorKey: null });
    renderAuthoringPreview();
    focusAfterRender('[data-property-group="' + group + '"] button', '#authoring-property-tray-heading-' + line);
  }

  function closeAuthoringProperties(line, restoreFocus) {
    if (!authoringPropertyTarget || authoringPropertyTarget.line !== line) return;
    if (authoringPropertyApplying || authoringPropertyIsRecovering()) return;
    const wasContext = authoringChooserEntry === 'context';
    const opener = authoringChooserOpener;
    authoringChooser = null;
    authoringPropertyTarget = null;
    renderAuthoringPreview();
    if (restoreFocus !== false) {
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
      else focusAfterRender(wasContext ? '#authoring-context-anchor' : '[data-action="open-authoring-properties"][data-line="' + line + '"]', '#flow-editor');
    }
    setSaveStatus('속성 편집을 닫았어요. 원문은 그대로입니다.', 'noop');
  }

  function canDismissAuthoringChooserOutside() {
    // Like React's separate value form, the K1-A value/failed owner remains
    // available while the source is edited. Only navigation-only menus dismiss.
    return Boolean(authoringChooser && authoringPropertyTarget
      && authoringChooser.stage !== 'value' && !authoringPropertyTarget.editorKey
      && !['stale', 'failed', 'recovery-required'].includes(authoringPropertyTarget.state));
  }

  function authoringPropertyOpenerSelector(line, key) {
    return '[data-action="edit-authoring-property"][data-line="' + line + '"][data-key="' + key + '"]';
  }

  function editAuthoringProperty(line, key) {
    const entry = M.authoringPropertyByKey(key);
    if (!entry || !currentAuthoringPropertyTicket(authoringPropertyTarget) || authoringPropertyTarget.line !== line || authoringPropertyIsRecovering()) return;
    const moved = dispatchAuthoringChooser({ type: 'choose-property', key });
    if (!moved || !moved.changed) return;
    const remembered = authoringChooser.drafts[key];
    if (remembered) authoringPropertyTarget = remembered;
    const dependent = dependentPropertyKind(key);
    if (dependent) {
      openAuthoringDependentPropertyDialog(line, dependent);
      return;
    }
    authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { editorKey: key, dependentKind: null,
      state: remembered ? remembered.state : authoringPropertyTarget.state === 'failed' ? 'failed' : 'ready' });
    renderAuthoringPreview();
    focusAfterRender('#authoring-inline-property-' + line + '-' + key, '#authoring-property-tray-heading-' + line);
  }

  function openAuthoringDependentPropertyDialog(line, kind) {
    if (!currentAuthoringPropertyTicket(authoringPropertyTarget) || authoringPropertyTarget.line !== line || authoringPropertyIsRecovering()) return;
    const parsed = M.parseSource(authoring.rawText);
    const item = parsed.steps.flatMap(step => step.items).find(entry => entry.sourceLine === line);
    if (!item || !['relativeDate', 'timezone', 'repeat'].includes(kind)) {
      setSaveStatus('함께 설정할 값을 찾지 못했어요.', 'error');
      return;
    }
    authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { editorKey: kind, dependentKind: kind,
      state: authoringPropertyTarget.state === 'failed' ? 'failed' : 'ready' });
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
      rememberAuthoringPropertyInputs(form);
      if (authoringPropertyComposing || authoringPropertyCompositionEnter || authoringPropertyApplying || authoringPropertyIsRecovering()) return;
      if (!currentAuthoringPropertyTicket(authoringPropertyTarget)) {
        setAuthoringPropertyResult('stale', '원문이 바뀌어 적용할 항목을 다시 확인해야 해요.');
        return;
      }
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
    elements.dialog.querySelectorAll('[name]').forEach(input => {
      if (Object.prototype.hasOwnProperty.call(authoringPropertyTarget.values, input.name)) input.value = authoringPropertyTarget.values[input.name];
    });
    rememberAuthoringPropertyInputs(elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]'));
  }

  function locateAuthoringProperty(key, propertySourceLine) {
    if (!currentAuthoringPropertyTicket(authoringPropertyTarget)) return;
    const result = M.locateAuthoringPropertyValue({ rawText: authoring.rawText, expectedSourceFingerprint: authoringPropertyTarget.sourceFingerprint, itemSourceLine: authoringPropertyTarget.line, key, propertySourceLine });
    if (result.status !== 'located') {
      setSaveStatus('선택할 기존 값이 없어요.', 'noop');
      showToast('아직 원문에 없는 속성입니다.', false);
      return;
    }
    authoringStep = 'input';
    authoringReviewOpen = false;
    authoringChooser = null;
    dialogReturnFocus = null;
    if (elements.dialog.open) elements.dialog.close();
    dialogSubmit = null;
    setAuthoringPaneWithoutRemount('input');
    renderAuthoringPreview();
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
    if (personalEntry.active() && (!personalEntry.visitActive?.() || personalEntry.readHostActive())) { personalEntry.check(); return; }
    if (screen.type !== 'authoring' && authoringEditorResizeObserver) {
      authoringEditorResizeObserver.disconnect(); authoringEditorResizeObserver = null;
    }
    if (screen.type !== 'authoring' && !personalEntryVisit) { authoringChooser = null; authoringPropertyTarget = null; authoringContextTarget = null; }
    if (workspaceRecoveryGate || editorRecoveryGate || !workspacePacket.ok || !envelope) {
      elements.sidebar.hidden = true;
      elements.sidebar.innerHTML = '';
      document.querySelectorAll('.product-nav button').forEach(button => { button.disabled = true; });
      [elements.undo, elements.compactUndo].forEach(control => { control.disabled = true; });
      elements.app.dataset.successfulMutations = String(successfulMutations);
      elements.app.dataset.workspaceStatus = workspaceRecoveryGate ? workspaceRecoveryGate.status : editorRecoveryGate ? editorRecoveryGate.status : 'blocked';
      elements.mutationCount.textContent = String(successfulMutations);
      if (elements.footerStorageNote) elements.footerStorageNote.dataset.storageKey = S.STORAGE_KEY;
      elements.content.innerHTML = workspaceRecoveryGate ? renderWorkspaceStorageGate() : editorRecoveryGate ? renderEditorRecoveryGate() : '<section class="plan-item-recovery-gate"><h1>저장 상태 확인 필요</h1><p>기존 저장본을 확인하지 못해 열지 않았습니다.</p></section>';
      syncWorkspaceSaveStatus();
      return;
    }
    refreshPersonalDisplaySource();
    const display = personalDisplayPacket();
    personalDisplayBlocked = !display.ok;
    elements.app.dataset.personalDisplayMode = display.mode || 'source-projection-blocked';
    if (!display.ok) {
      elements.app.dataset.successfulMutations = String(successfulMutations); elements.mutationCount.textContent = String(successfulMutations);
      elements.sidebar.hidden = true; elements.sidebar.innerHTML = '';
      document.querySelectorAll('.product-nav button').forEach(button => { button.disabled = true; });
      [elements.undo, elements.compactUndo].forEach(button => { button.disabled = true; });
      elements.content.innerHTML = '<section class="plan-item-recovery-gate" data-testid="personal-plan-display-gate"><h1 tabindex="-1">원문과 개인 계획을 확인해 주세요</h1><p role="alert">개인 편집을 원문과 함께 표시할 수 없어 화면과 추가 변경을 막았습니다. 기존 저장값과 Undo는 보존했습니다.</p><button class="button primary" type="button" data-action="personal-display-recheck">원문 상태 다시 확인</button></section>';
      return;
    }
    elements.app.dataset.workspaceStatus = 'ready';
    elements.app.dataset.workspaceOrigin = workspacePacket.origin;
    document.querySelectorAll('.product-nav button').forEach(button => {
      const active = screen.type === 'authoring' ? button.dataset.action === 'go-authoring' : button.dataset.action === 'go-workspace';
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    [elements.undo, elements.compactUndo].forEach(control => { control.disabled = envelope.undo === null && creatorDraftLibrary.undo === null && (!sourceCandidateStore || !sourceCandidateStore.undo); });
    elements.app.dataset.productPlanItemGrammar = 'v1';
    elements.app.dataset.successfulMutations = String(successfulMutations);
    elements.app.dataset.authoringSourceMutations = String(authoringSourceMutationCount);
    elements.app.dataset.creatorDraftStatus = creatorDraftLibraryStatus;
    elements.app.dataset.sourceCandidateStatus = sourceCandidateStoreStatus;
    elements.app.dataset.storageMode = storageMode;
    elements.mutationCount.textContent = String(successfulMutations);
    elements.mutationCount.dataset.successfulMutations = String(successfulMutations);
    if (elements.storageModeNote) elements.storageModeNote.dataset.storageMode = storageMode;
    if (elements.footerStorageNote) elements.footerStorageNote.dataset.storageKey = S.STORAGE_KEY;
    renderSidebar();
    if (editorRecoveryGate) elements.content.innerHTML = renderEditorRecoveryGate();
    else if (screen.type === 'authoring') renderAuthoring();
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
    if (!personalEntryVisit && (screen.type === 'workspace' || screen.type === 'authoring') && !draftUnavailable() && !personalDisplayBlocked) {
      elements.content.insertAdjacentHTML('afterbegin', '<div class="personal-entry-launch"><button class="button" type="button" data-action="open-personal-entry">기존 Flow 찾기</button></div>');
    }
    const featureErrors = [];
    if (display.mode === 'personal-execution-only') featureErrors.push('<p>원문 상태를 확인하지 못했습니다. 마지막으로 저장된 이름과 개인 실행 정보만 표시합니다. 원문·계획 편집·네 결과는 열지 않습니다.</p>');
    if (creatorDraftBlocked()) featureErrors.push('<p>내 초안 보관함을 확인하지 못해 보관함 변경을 막았습니다. 개인공간은 유지합니다.</p><button class="button" type="button" data-action="feature-check-storage" data-feature="creator">내 초안 다시 확인</button>');
    if (sourceCandidateBlocked()) featureErrors.push('<p>원문 비교 저장소를 확인하지 못해 원문 비교와 해당 편집을 막았습니다. 현재 개인 실행 정보는 유지합니다.</p><button class="button" type="button" data-action="feature-check-storage" data-feature="source">원문 비교 다시 확인</button>');
    if (featureErrors.length) elements.content.insertAdjacentHTML('afterbegin', '<section class="plan-item-save-feedback" role="alert" data-testid="feature-storage-status">' + featureErrors.join('') + '</section>');
    syncEditorUI();
    renderPlanSaveResult();
    renderContextualResult();
    syncWorkspaceToast();
    syncWorkspaceSaveStatus();
  }

  function openDialog(title, body, submitHandler) {
    dismissPlanSaveResult();
    if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false });
    dialogReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    elements.dialogTitle.textContent = title;
    elements.dialogBody.innerHTML = body;
    dialogSubmit = submitHandler || null;
    elements.dialog.showModal();
    focusAfterRender('[autofocus]', '#dialog [data-action="close-dialog"]');
  }

  function closeDialog(options) {
    if (activeEditorSession() && activeEditorSession().pendingClose) { continueEditor(); return; }
    const returnFocus = dialogReturnFocus;
    if (elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]') && authoringPropertyTarget && !authoringPropertyApplying) {
      authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { editorKey: null, values: {}, dependentKind: null });
      authoringPropertyComposing = false;
      authoringPropertyCompositionEnter = false;
    }
    dialogSubmit = null;
    if (elements.dialog.open) elements.dialog.close();
    dialogReturnFocus = null;
    // The explicit guide -> comparison transition hands focus to that dialog.
    // Ordinary dismissals keep their original return-focus behavior.
    if (options && options.restoreFocus === false) return;
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
    if (info.element && info.element.isConnected && !info.element.closest('[hidden], [inert]')) return info.element;
    return visibleContentNodes('[data-move-kind][data-id][aria-controls="move-panel"]').find(control =>
      control.dataset.moveKind === info.kind &&
      control.dataset.id === info.id &&
      control.dataset.moveSource === info.source
    ) || null;
  }

  function restoreMoveFocus(info) {
    const visit = personalEntryVisit, targetScreen = JSON.stringify(screen);
    window.requestAnimationFrame(() => {
      if (personalEntryVisit !== visit || visit && targetScreen !== JSON.stringify(screen)) return;
      const control = findMoveReturnControl(info);
      if (control) {
        control.focus();
        return;
      }
      const result = elements.content.querySelector('[data-testid="workspace-contextual-result"]');
      if (result && contextualAnchor && info && contextualAnchor.id === info.id && contextualAnchor.screenKey === resultScreenKey()) {
        result.scrollIntoView({ block: 'nearest' });
        if (contextualAnchor.input === 'keyboard') result.focus({ preventScroll: true });
        return;
      }
      const heading = visibleContentNodes('.page-head h1, .detail-header h1')[0];
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
    window.requestAnimationFrame(clearContextualGestureSpacer);
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
      { date: localToday, label: '오늘' },
      { date: window.FlowPocTimelineContext.addPlainDays(localToday, 1), label: '내일' },
      { date: window.FlowPocTimelineContext.addPlainDays(localToday, 7), label: '일주일 뒤' },
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
    const targetOrderGroup = isTimelineContext(target.context) ? timelineGroup(target.context, task.id) : null;
    const orderWarning = targetOrderGroup && targetOrderGroup.blocked ? '<p class="timeline-order-warning">이전 순서가 서로 달라 이 목록의 순서 변경은 잠겨 있어요. 날짜와 폴더는 따로 옮길 수 있습니다.</p>' : '';
    const folderSection = task.flowId === null
      ? '<section class="move-section" aria-labelledby="move-folder-heading"><h3 id="move-folder-heading">폴더</h3><div class="move-destination-list">' + folderDestinationRows(task.folderId) + '</div></section>'
      : '<section class="move-section"><h3>폴더</h3><p class="move-note">Flow Item의 폴더는 부모 Flow <strong>' + escapeHtml(flowDisplayTitle(flowById(task.flowId))) + '</strong>를 따릅니다.</p></section>';
    const orderSection = orderIds.length > 1
      ? '<section class="move-section" aria-labelledby="move-order-heading"><h3 id="move-order-heading">이 목록의 순서</h3><div class="move-order-grid"><button class="button" type="button" data-action="move-top" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(target.context) + '"' + (orderIndex <= 0 ? ' disabled' : '') + '>맨 위</button><button class="button" type="button" data-action="move-up" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(target.context) + '"' + (orderIndex <= 0 ? ' disabled' : '') + '>위로</button><button class="button" type="button" data-action="move-down" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(target.context) + '"' + (orderIndex < 0 || orderIndex === orderIds.length - 1 ? ' disabled' : '') + '>아래로</button><button class="button" type="button" data-action="move-bottom" data-id="' + escapeHtml(task.id) + '" data-context="' + escapeHtml(target.context) + '"' + (orderIndex < 0 || orderIndex === orderIds.length - 1 ? ' disabled' : '') + '>맨 아래</button></div></section>'
      : orderWarning;
    const existingConversion = task.flowId === null ? quickConversionReceipt(task.id) : null;
    const conversionSection = task.flowId !== null ? '' : existingConversion && flowById(existingConversion.flowId)
      ? '<details class="quick-conversion move-section" data-testid="standalone-quick-conversion"><summary>Flow로 정리</summary><div class="quick-conversion-body"><p class="move-note">원 빠른 할 일은 그대로 유지됩니다.</p><p class="quick-conversion-complete"><strong>' + escapeHtml(existingConversion.flowTitle) + '</strong> Flow를 이미 만들었어요.</p><button class="button primary" type="button" data-action="open-converted-flow" data-id="' + escapeHtml(existingConversion.flowId) + '">만든 Flow 열기</button></div></details>'
      : '<details class="quick-conversion move-section" data-testid="standalone-quick-conversion"><summary>Flow로 정리</summary><form class="quick-conversion-body" data-quick-conversion-form data-quick-id="' + escapeHtml(task.id) + '" data-expected-revision="' + escapeHtml(target.expectedRevision) + '"><label class="field"><span>새 Flow 이름</span><input name="flowTitle" value="' + escapeHtml(task.title + ' Flow') + '" maxlength="120" required></label><p class="move-note">원 빠른 할 일은 그대로 유지합니다. 현재 폴더·실행 날짜·메모만 새 Flow의 Item에 복사하고 완료 상태는 복사하지 않습니다.</p><button class="button primary" type="submit">새 Flow로 정리</button></form></details>';
    return '<div class="move-target-summary"><strong>' + escapeHtml(task.title) + '</strong><span>' + escapeHtml(dateLabel(task.date)) + ' · ' + escapeHtml(folderTitle(flowFolder(task))) + '</span></div><section class="move-section" aria-labelledby="move-date-heading"><h3 id="move-date-heading">실행 날짜</h3><div class="move-destination-list">' + dateDestinationRows(task) + '</div><form class="move-date-form" data-move-form="task-date"><label class="field"><span>다른 날짜</span><input name="date" type="date" value="' + escapeHtml(task.date || '') + '" required></label><button class="button" type="submit">날짜 적용</button></form></section>' + folderSection + orderSection + conversionSection;
  }

  function openMovePanel(kind, id, context, opener, focusPanel) {
    if (!workspaceWritable()) return;
    if (refreshTimelineClock()) return;
    dismissPlanSaveResult();
    interruptContextualResult('move-preview');
    const entry = kind === 'flow' ? flowById(id) : taskById(id);
    if (!entry || (kind !== 'flow' && kind !== 'task')) return;
    if (elements.dialog.open) closeDialog();
    moveTarget = { kind, id, context: context || screen.view || (kind === 'flow' ? 'folder:unfiled' : 'today'), expectedRevision: envelope.state.revision };
    if (kind === 'task' && isTimelineContext(moveTarget.context)) {
      moveTarget.orderTicket = pointerOrigin && pointerOrigin.id === id && pointerOrigin.orderTicket
        ? pointerOrigin.orderTicket : openingTimelineTicket(id, moveTarget.context);
      if (moveTarget.orderTicket) moveTarget.context = moveTarget.orderTicket.context + ':' + moveTarget.orderTicket.contextKey;
    }
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
    if (workspaceRecoveryGate || editorRecoveryGate) return false;
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

  function submitQuickConversion(form) {
    if (!workspaceWritable()) return false;
    if (!moveTarget || moveTarget.kind !== 'task' || moveTarget.id !== form.dataset.quickId) {
      setMovePanelStatus('빠른 할 일을 다시 확인해 주세요.', 'error');
      setSaveStatus('변경하지 못했어요.', 'error');
      return false;
    }
    const data = new FormData(form);
    const result = C.transitionCheckpoint(workspacePacket.checkpoint, {
      type: 'convert-quick-item-to-flow',
      quickItemId: form.dataset.quickId,
      expectedRevision: Number(form.dataset.expectedRevision),
      flowTitle: String(data.get('flowTitle') || ''),
      now: new Date().toISOString()
    });
    if (!result.changed) {
      setMovePanelStatus(result.message || '변경 조건을 확인해 주세요.', !result.ok ? 'error' : 'neutral');
      setSaveStatus(!result.ok ? '변경하지 못했어요.' : '이미 같은 상태예요.', !result.ok ? 'error' : 'noop');
      showToast(result.message || '변경 조건을 확인해 주세요.', false, null, !result.ok ? 'error' : 'status');
      return false;
    }
    const receipt = M.quickConversionReceipts(result.checkpoint.state).find(entry => entry.sourceQuickItemId === form.dataset.quickId);
    if (!receipt) {
      setMovePanelStatus('새 Flow 연결 정보를 확인할 수 없어 저장하지 않았습니다.', 'error');
      setSaveStatus('변경하지 못했어요.', 'error');
      return false;
    }
    const convertedFlow = result.checkpoint.state.flows.find(entry => entry.id === receipt.flowId);
    setMovePanelStatus('새 Flow 저장 중…', 'ready');
    return writeCandidate(result.checkpoint, result.message, () => {
      closeMovePanel({ restoreFocus: false, announce: false });
      resultView = 'txt';
      resultOccurrencePage = 1;
      resultCalendarBaseDate = M.TODAY;
      resultCalendarSelectedDate = M.TODAY;
      screen = { type: 'workspace', view: 'folder:' + ((convertedFlow && convertedFlow.folderId) || 'unfiled'), selectedFlowId: receipt.flowId };
      focusAfterRender('[data-action="close-flow"]');
    });
  }

  function occurrenceFromControl(control) {
    if (!control) return null;
    const flow = flowById(control.dataset.flowId);
    if (!flow) return null;
    const projection = personalResultProjection(flow.id);
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
    if (activeEditorSession() || sourceUpdateSession || moveTarget || !workspaceWritable()) return;
    const flow = screen.type === 'workspace' && envelope.state.flows.find(entry => entry.id === screen.selectedFlowId);
    const available = flow && sourceCandidatePreview(flow);
    const explanation = !flow ? '연습할 Flow를 먼저 열어 주세요.' : !available ? '이 Flow의 원문으로는 비교 연습을 시작할 수 없습니다.' : '기기에 저장된 원문으로 비교 과정을 연습합니다. 외부 원문을 확인하지 않습니다.';
    const practice = '<section data-testid="standalone-source-practice-guide"><h3>로컬 원문 비교 연습</h3>' + (flow ? '<p>' + escapeHtml(flow.title) + '</p>' : '') + '<p>' + explanation + '</p><button class="button" type="button" data-action="start-source-practice" data-flow-id="' + escapeHtml(flow && flow.id) + '"' + (!available ? ' disabled' : '') + '>로컬 비교 연습 시작</button></section>';
    openDialog('사용 안내', '<ol class="guide-list"><li><strong>새 Flow</strong>에서 원문을 쓰고 결과를 확인한 뒤 개인공간에 저장합니다.</li><li>기간 목록의 Item 제목을 누르면 같은 상세 화면에서 메모, 날짜, 완료 상태를 확인할 수 있습니다.</li><li>이동 손잡이, 더보기 메뉴, 키보드로 날짜·폴더·순서를 바꿀 수 있습니다.</li><li>Flow Item 수정은 Plan에 모았다가 전체 저장하고, 빠른 할 일 수정은 바로 저장합니다.</li><li>저장된 내용은 새로고침 뒤에도 이어집니다.</li></ol>' + practice + '<details class="test-tools"><summary>테스트 도구</summary><label class="test-toggle"><input id="force-write-error" type="checkbox"' + (forceWriteError ? ' checked' : '') + '> 다음 저장을 실패로 확인</label><button class="button danger" type="button" data-action="reset-poc">연습 데이터 초기화</button></details><div class="dialog-actions"><button class="button primary" type="button" data-action="close-dialog">확인</button></div>');
  }

  function retryAuthoringCommit() {
    const control = document.querySelector('[data-action="commit-authoring"]');
    if (control) control.click();
  }

  function reorderPeerIds(id, context) {
    if (isTimelineContext(context)) {
      const group = timelineGroup(context, id);
      return group && !group.blocked ? group.ids.slice() : [];
    }
    const ids = M.viewTaskIds(state(), context);
    return ids;
  }

  function currentTimelineTicket(context, peerIds) {
    const group = timelineGroup(context, peerIds && peerIds[0]);
    if (!group) return null;
    const token = group.context + ':' + group.contextKey;
    for (const owner of [dragged, pointerOrigin, moveTarget]) {
      if (owner && owner.orderTicket && owner.orderTicket.context + ':' + owner.orderTicket.contextKey === token) return owner.orderTicket;
    }
    return timelineOpeningTickets.get(token) || null;
  }

  function applyTimelineOrder(context, peerIds, reorderedPeers, reset) {
    const ticket = currentTimelineTicket(context, peerIds);
    const currentDate = readLocalToday();
    const samePeers = ticket && JSON.stringify(ticket.currentOrderedRefKeys) === JSON.stringify(peerIds);
    if (!ticket || ticket.blocked || !samePeers || ticket.checkpoint !== workspacePacket.checkpoint || ticket.localToday !== currentDate
      || !S.sameAuthority(storage, ticket.packet).ok) {
      setSaveStatus('순서 이동을 취소했어요 · 변경 없음', 'noop');
      showToast('날짜나 목록이 바뀌어 순서 이동을 취소했어요. 목록을 다시 선택해 주세요.', false);
      return false;
    }
    const action = { type: reset ? 'timeline-reset' : 'timeline-reorder', context: ticket.context, contextKey: ticket.contextKey,
      localToday: ticket.localToday, expectedRevision: ticket.expectedRevision, currentOrderedRefKeys: ticket.currentOrderedRefKeys.slice(), now: new Date().toISOString() };
    if (!reset) action.orderedRefKeys = reorderedPeers;
    return transition(action, { currentLocalToday: readLocalToday() });
  }

  function resetTimelineOrder(context) {
    const group = timelineGroup(context);
    if (!group || group.blocked) return false;
    return applyTimelineOrder(context, group.ids, null, true);
  }

  function commitPeerOrder(context, peerIds, reorderedPeers) {
    if (isTimelineContext(context)) return applyTimelineOrder(context, peerIds, reorderedPeers, false);
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
    if (reducedMotion) {
      stopDragAutoScroll();
      return;
    }
    const maxSpeed = 18;
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
    window.requestAnimationFrame(clearContextualGestureSpacer);
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
    window.requestAnimationFrame(clearContextualGestureSpacer);
  }

  function cancelActiveMoveInteraction(message, options) {
    const settings = Object.assign({ pointerId: null, restoreFocus: true, closePanel: true }, options || {});
    const matchingPointer = Boolean(pointerOrigin && (settings.pointerId === null || settings.pointerId === pointerOrigin.pointerId));
    const activeDrag = Boolean(dragged);
    if (!matchingPointer && !activeDrag && longPressTimer === null) return false;
    if (matchingPointer || longPressTimer !== null) cancelHandlePress('', true);
    finishDrag();
    if (settings.closePanel && movePanelOpen()) closeMovePanel({ restoreFocus: settings.restoreFocus, announce: false });
    if (message) setSaveStatus(message, 'noop');
    return true;
  }

  document.addEventListener('click', event => {
    const clickedControl = event.target.closest('[data-action]');
    const clickedAction = clickedControl && clickedControl.dataset.action;
    if (clickedAction === 'personal-display-recheck') {
      event.preventDefault();
      if (!personalDisplayBlocked || activeEditorSession() || workspaceTransactionPending || workspaceRecoveryGate || editorRecoveryGate) return;
      const packet = S.loadWorkspace(storage);
      if (!packet.ok) { routeWorkspaceRecovery(packet); return; }
      adoptWorkspace(packet); refreshPersonalDisplaySource(); render();
      focusAfterRender('[data-testid="personal-plan-display-gate"] h1', '#main');
      return;
    }
    if (['workspace-check-storage', 'workspace-recover-storage', 'workspace-open-verified'].includes(clickedAction)) {
      event.preventDefault();
      if (!workspaceRecoveryGate || workspaceTransactionPending) return;
      if (clickedAction === 'workspace-check-storage') checkWorkspaceStorage();
      else if (clickedAction === 'workspace-recover-storage') recoverWorkspaceStorage();
      else openVerifiedWorkspace();
      return;
    }
    if (workspaceTransactionPending || workspaceRecoveryGate || (!workspacePacket.ok && !editorRecoveryGate) || personalDisplayBlocked && !editorRecoveryGate) { event.preventDefault(); return; }
    if (clickedAction === 'close-dialog' && recoveredDraftDiscardDialogOpen()) { event.preventDefault(); closeDialog(); return; }
    if (editorRecoveryGate && !['editor-check-storage', 'editor-recover-storage', 'editor-clear-confirmed', 'editor-open-verified', 'editor-reopen-source', 'editor-discard-recovered', 'editor-discard-recovered-confirm', 'editor-keep-recovered'].includes(clickedAction)) { event.preventDefault(); return; }
    if (event.target.dataset && event.target.dataset.sourceUpdateBackdrop === 'true') {
      closeSourceUpdateReview();
      return;
    }
    if (event.target.classList && event.target.classList.contains('validation-example-backdrop')) {
      closeValidationExampleExplorer();
      return;
    }
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
    const recoveryAction = ['editor-check-storage', 'editor-recover-storage', 'editor-clear-confirmed', 'editor-open-verified', 'editor-reopen-source', 'editor-discard-recovered', 'editor-discard-recovered-confirm', 'editor-keep-recovered'].includes(action);
    if (recoveryAction && !editorRecoveryGate && !editorHasPendingRecovery()) { event.preventDefault(); return; }
    if (editorRecoveryGate && !recoveryAction) { event.preventDefault(); return; }
    if (action === 'editor-check-storage') { checkEditorStorage(); return; }
    if (action === 'editor-recover-storage') { resumeEditorRecovery(); return; }
    if (action === 'editor-clear-confirmed') { clearEditorConfirmed(); return; }
    if (action === 'editor-open-verified') { openVerifiedEditorState(); return; }
    if (action === 'editor-reopen-source') { resumeEditorRecovery(); return; }
    if (action === 'editor-discard-recovered') { discardRecoveredSourceDraft(false); return; }
    if (action === 'editor-discard-recovered-confirm') { discardRecoveredSourceDraft(true); return; }
    if (action === 'editor-keep-recovered') { if (recoveredDraftDiscardDialogOpen()) closeDialog(); return; }
    if (editorHistoryConsuming) { event.preventDefault(); return; }
    const editorSession = activeEditorSession();
    if (editorSession) {
      const allowed = editorSession.pendingClose ? ['editor-continue', 'editor-discard', 'close-dialog'] : ['close-plan-editor', 'close-item-editor', 'commit-plan-editor', 'save-item-editor', 'open-plan-item-editor', 'plan-order-move', 'plan-order-reset', 'plan-summary-page', 'editor-retry', 'dismiss-toast'];
      if (!allowed.includes(action) || editorLocked()) { event.preventDefault(); return; }
    }
    if (action === 'editor-continue') { continueEditor(); return; }
    if (action === 'editor-discard') { discardEditor(); return; }
    if (action === 'editor-retry') { saveEditor(true); return; }
    if (action === 'plan-summary-page') { changePlanSummaryPage(control); return; }
    if (['plan-result-page', 'plan-result-undo', 'plan-result-dismiss'].includes(action)) { handlePlanResultAction(control); return; }
    if (action === 'contextual-undo') { undoContextualResult(control.dataset.ownerId); return; }
    if (action === 'contextual-dismiss') {
      const anchor = contextualAnchor;
      const restoreKeyboard = contextualInput === 'keyboard';
      contextualOwner = F.dismissResult(contextualOwner, control.dataset.ownerId);
      renderContextualResult();
      if (restoreKeyboard && anchor && anchor.screenKey === resultScreenKey()) {
        window.requestAnimationFrame(() => {
          if (anchor.screenKey !== resultScreenKey()) return;
          const rows = contextualRows();
          const source = rows.find(row => rowKey(row) === anchor.kind + ':' + anchor.id)
            || rows.find(row => rowKey(row) === anchor.next) || rows.find(row => rowKey(row) === anchor.previous);
          const target = source && (Array.from(source.querySelectorAll('[data-action]')).find(button => button.dataset.action === anchor.focusAction)
            || source.querySelector('button:not([disabled]), a[href]')) || elements.content.querySelector('h1') || elements.content;
          if (!target.hasAttribute('tabindex') && !target.matches('button, a[href]')) target.tabIndex = -1;
          target.focus({ preventScroll: true });
          target.scrollIntoView({ block: 'nearest' });
        });
      }
      return;
    }
    if (action === 'feature-check-storage') { checkFeatureStorage(control.dataset.feature); return; }
    if (action === 'open-source-update-review') {
      const flow = envelope.state.flows.find(entry => entry.id === control.dataset.flowId);
      if (flow) openSourceUpdateReview(flow, control, control.dataset.candidateId);
    }
    else if (action === 'start-source-practice') {
      if (!elements.dialog.open || screen.type !== 'workspace' || screen.selectedFlowId !== control.dataset.flowId) return;
      const flow = envelope.state.flows.find(entry => entry.id === control.dataset.flowId);
      if (flow) startLocalSourcePractice(flow, Array.from(document.querySelectorAll('[data-action="open-guide"]')).find(entry => entry.getClientRects().length));
    }
    else if (action === 'close-source-update-review') closeSourceUpdateReview();
    else if (action === 'defer-source-update') {
      deferredSourceUpdateFlowIds.add(control.dataset.flowId);
      setSaveStatus('나중에 확인할게요 · 저장된 내용은 그대로예요', 'noop');
      render();
      focusAfterRender('[data-action="open-source-update-review"]', '[data-action="open-plan-editor"]');
    }
    else if (action === 'select-source-update-change' && sourceUpdateSession) {
      sourceUpdateSession.selectedChangeId = control.dataset.changeId;
      sourceUpdateValueView = 'mine';
      render();
      focusAfterRender('[data-source-update-choice="later"]', '[data-action="close-source-update-review"]', true);
    }
    else if (action === 'source-update-value-tab' && sourceUpdateSession) {
      if (!['base', 'mine', 'incoming'].includes(control.dataset.valueView)) return;
      sourceUpdateValueView = control.dataset.valueView;
      render();
      focusAfterRender('[data-action="source-update-value-tab"][data-value-view="' + sourceUpdateValueView + '"]');
    }
    else if (action === 'source-update-apply') applySourceUpdate();
    else if (action === 'source-update-undo') {
      const owner = sourceCandidateStore && sourceCandidateStore.undo;
      const flow = envelope.state.flows.find(entry => entry.id === control.dataset.flowId);
      if (owner && flow && owner.flowRef === flow.ref && owner.candidateId === control.dataset.candidateId) undoSourceUpdate();
    }
    else if (action === 'refresh-source-update-review') refreshSourceUpdateReview();
    else if (action === 'open-validation-examples') openValidationExampleExplorer(control);
    else if (action === 'close-validation-examples') closeValidationExampleExplorer();
    else if (action === 'select-validation-example') {
      let selection;
      try {
        selection = M.projectValidationExampleSelection({
          catalogVersion: M.validationExampleCatalogVersion,
          exampleId: control.dataset.exampleId
        });
      } catch (error) {
        selection = null;
      }
      if (!selection || selection.status !== 'selected' || selection.sourceMutationCount !== 0) {
        setSaveStatus('검증 예시를 확인하지 못했어요 · 변경 없음', 'error');
        return;
      }
      validationExampleSelectedId = selection.example.exampleId;
      renderValidationExampleExplorer();
      if (window.matchMedia('(max-width: 767px)').matches) {
        focusAfterRender('#validation-example-preview-heading', '[data-action="validation-example-list"]');
      } else {
        focusAfterRender('[data-action="select-validation-example"][data-example-id="' + validationExampleSelectedId.replace(/"/g, '\\"') + '"]', '#validation-example-search');
      }
      setSaveStatus('검증 예시 미리보기 · 원문은 그대로예요', 'noop');
    }
    else if (action === 'validation-example-list') {
      showValidationExampleList();
      setSaveStatus('검증 예시 목록 · 원문은 그대로예요', 'noop');
    }
    else if (action === 'clear-validation-example-filter') {
      validationExampleQuery = '';
      validationExampleGroupId = 'all';
      validationExampleSelectedId = null;
      renderValidationExampleExplorer();
      focusAfterRender('#validation-example-search');
      setSaveStatus('검증 예시 필터를 지웠어요 · 원문은 그대로예요', 'noop');
    }
    else if (action === 'apply-validation-example') applyValidationExample(control.dataset.exampleId);
    else if (action === 'go-workspace') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); planDraft = null; screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: null }; render(); }
    else if (action === 'go-authoring') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); authoringStep = 'input'; authoringResultView = 'txt'; authoringOccurrencePage = 1; authoringReviewOpen = false; authoringReceipt = null; screen = { type: 'authoring' }; render(); }
    else if (action === 'new-authoring') {
      if (authoring.rawText.trim() && !window.confirm('현재 작성 중 초안을 닫고 새로 작성할까요?')) {
        setSaveStatus('새 작성을 취소했어요 · 변경 없음', 'noop');
        return;
      }
      if (!discardAuthoringDraft()) return;
      authoring = freshAuthoring();
      authoringStep = 'input';
      authoringResultView = 'txt';
      authoringOccurrencePage = 1;
      authoringReviewOpen = false;
      authoringPropertyTarget = null;
      dismissedNearMisses = new Set();
      creatorDraftMenuId = null;
      creatorDraftRenameId = null;
      render();
      focusAfterRender('#flow-editor', '.authoring-head h1');
    }
    else if (action === 'open-creator-draft') openCreatorDraft(control.dataset.id);
    else if (action === 'save-creator-draft') { if (!authoringPropertyIsRecovering()) saveCreatorDraft(); }
    else if (action === 'set-creator-filter') {
      if (control.dataset.filter !== 'active' && control.dataset.filter !== 'archived') return;
      creatorDraftFilter = control.dataset.filter;
      creatorDraftMenuId = null;
      creatorDraftRenameId = null;
      render();
      focusAfterRender('[data-action="set-creator-filter"][data-filter="' + creatorDraftFilter + '"]');
    }
    else if (action === 'toggle-creator-actions') {
      const closing = creatorDraftMenuId === control.dataset.id;
      creatorDraftMenuId = closing ? null : control.dataset.id;
      creatorDraftRenameId = null;
      render();
      focusAfterRender(closing ? '[data-action="toggle-creator-actions"][data-id="' + control.dataset.id + '"]' : '#creator-draft-actions-' + control.dataset.id + ' button', '#creator-drafts-heading');
    }
    else if (action === 'begin-creator-rename') {
      creatorDraftMenuId = control.dataset.id;
      creatorDraftRenameId = control.dataset.id;
      creatorDraftReturnFocusId = control.dataset.id;
      render();
      focusAfterRender('[data-creator-rename-form][data-id="' + control.dataset.id + '"] input');
    }
    else if (action === 'cancel-creator-rename') {
      creatorDraftRenameId = null;
      creatorDraftMenuId = null;
      setSaveStatus('이름 변경을 취소했어요 · 변경 없음', 'noop');
      render();
      focusAfterRender('[data-action="toggle-creator-actions"][data-id="' + control.dataset.id + '"]', '#creator-drafts-heading');
    }
    else if (action === 'clone-creator-draft') {
      const newId = newCreatorDraftId();
      transitionCreatorDraft({ type: 'clone', draftId: control.dataset.id, expectedRevision: Number(control.dataset.revision), newDraftId: newId, now: new Date().toISOString() }, { focusSelector: '[data-creator-draft-id="' + newId + '"] [data-action="open-creator-draft"]' });
    }
    else if (action === 'archive-creator-draft' || action === 'restore-creator-draft') {
      const visible = M.listCreatorDrafts(creatorDraftLibrary, { archived: creatorDraftFilter === 'archived', query: creatorDraftQuery });
      const index = visible.findIndex(draft => draft.draftId === control.dataset.id);
      const next = visible[index + 1] || visible[index - 1] || null;
      transitionCreatorDraft({ type: action === 'archive-creator-draft' ? 'archive' : 'restore', draftId: control.dataset.id, expectedRevision: Number(control.dataset.revision), now: new Date().toISOString() }, { focusSelector: next ? '[data-creator-draft-id="' + next.draftId + '"] button' : '#creator-drafts-heading' });
    }
    else if (action === 'set-view') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); if (control.dataset.view !== 'month') showEmptyMonthDates = false; screen = { type: 'workspace', view: control.dataset.view, selectedFlowId: null }; render(); }
    else if (action === 'open-flow') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); planDraft = null; resultView = 'txt'; resultOccurrencePage = 1; resultCalendarBaseDate = M.TODAY; resultCalendarSelectedDate = M.TODAY; screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: control.dataset.id }; render(); }
    else if (action === 'close-flow') { if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false }); planDraft = null; screen = { type: 'workspace', view: screen.view || 'today', selectedFlowId: null }; render(); }
    else if (action === 'open-receipt-flow') { resultView = 'txt'; resultOccurrencePage = 1; resultCalendarBaseDate = M.TODAY; resultCalendarSelectedDate = M.TODAY; screen = { type: 'workspace', view: 'folder:' + ((flowById(control.dataset.id) || {}).folderId || 'unfiled'), selectedFlowId: control.dataset.id }; render(); }
    else if (action === 'open-converted-flow') {
      const flow = flowById(control.dataset.id);
      if (!flow) return;
      if (moveTarget) closeMovePanel({ restoreFocus: false, announce: false });
      resultView = 'txt';
      resultOccurrencePage = 1;
      resultCalendarBaseDate = M.TODAY;
      resultCalendarSelectedDate = M.TODAY;
      screen = { type: 'workspace', view: 'folder:' + (flow.folderId || 'unfiled'), selectedFlowId: flow.id };
      render();
      focusAfterRender('[data-action="close-flow"]');
    }
    else if (action === 'open-item-detail') openItemDetail(control.dataset.id, control);
    else if (action === 'close-item-detail') closeItemDetail();
    else if (action === 'plan-order-move' || action === 'plan-order-reset') changePlanOrder(control);
    else if (action === 'edit-item' || action === 'open-plan-item-editor') openItemEditor(taskById(control.dataset.id), control);
    else if (action === 'close-item-editor') closeItemEditor();
    else if (action === 'save-item-editor') {
      if (!itemDraft) return;
      if (isPersonalEditor(itemSession)) {
        updateEditorDraft();
        const applied = isSourceEditor(itemSession) ? (isStructureEditor(itemSession) ? planItemSessions.applySourceBoundPersonalPlanStructureChild : planItemSessions.applySourceBoundPersonalPlanChild)(storage, planSession, itemSession, sourceEditorOptions())
          : planItemSessions.applyChild(planSession, itemSession);
        if (!applied.ok) { showPersonalEditorError(applied.error || applied.reason); return; }
        planSession = applied.parent; planDraft = copyScreen(planSession.draft);
        finishEditorClose(itemSession, planSession.valid ? 'Item을 Plan에 반영했어요. Plan 전체 저장 전입니다.' : 'Item 입력은 Plan에 반영했습니다. 전체 저장 전에 다른 제목·날짜와 반복 조건을 확인해 주세요.', false);
        return;
      }
      if (!itemDraft.title.trim()) {
        setSaveStatus('Item 제목을 입력해 주세요.', 'error');
        editorFeedback = { state: 'invalid', message: 'Item 제목을 입력해 주세요. 입력한 내용은 유지했습니다.' };
        syncEditorUI();
        document.querySelector('[data-testid="plan-item-save-feedback"]').focus();
        return;
      }
      if (itemDraft.mode === 'plan') {
        updateEditorDraft();
        const applied = planItemSessions.applyChild(planSession, itemSession);
        if (!applied.ok) {
          editorFeedback = { state: 'invalid', message: '부모 Plan과 편집 대상이 달라 반영하지 않았어요. 입력은 유지했습니다.' };
          syncEditorUI();
          return;
        }
        planSession = applied.parent;
        planDraft = copyScreen(planSession.draft);
        finishEditorClose(itemSession, 'Item을 Plan에 반영했어요. Plan 전체 저장 전입니다.', false);
      } else {
        saveEditor(false);
      }
    }
    else if (action === 'add-quick') openQuickDialog(control.dataset.folderId || null, control.dataset.date || null);
    else if (action === 'add-folder') openFolderDialog();
    else if (action === 'task-menu') openTaskMenu(control.dataset.id, control.dataset.context, control, true);
    else if (action === 'flow-menu') openFlowMenu(control.dataset.id, control.dataset.context || screen.view, control, true);
    else if (action === 'open-plan-editor') openPlanEditor(flowById(control.dataset.id), control);
    else if (action === 'close-plan-editor') requestEditorClose('cancel', false);
    else if (action === 'commit-plan-editor') saveEditor(false);
    else if (action === 'result-tab') { resultView = control.dataset.view; render(); focusAfterRender('#standalone-result-tab-' + resultView); }
    else if (action === 'authoring-result-tab') { authoringResultView = control.dataset.view; renderAuthoringPreview(); focusAfterRender('#authoring-result-tab-' + authoringResultView); }
    else if (action === 'result-more-occurrences') { if (resultOccurrencePage < 130) { resultOccurrencePage += 1; render(); setSaveStatus('네 결과의 회차 범위를 함께 늘렸어요.', 'noop'); } }
    else if (action === 'authoring-more-occurrences') { if (authoringOccurrencePage < 130) { authoringOccurrencePage += 1; renderAuthoringPreview(); setSaveStatus('네 결과의 회차 범위를 함께 늘렸어요.', 'noop'); } }
    else if (action === 'copy-result-txt') { const projection = personalResultProjection(control.dataset.flowId); if (projection) copyTextResult(projection.txt); }
    else if (action === 'copy-authoring-txt') copyTextResult(M.authoringResultProjection(authoring.rawText, authoringProjectionOptions()).txt);
    else if (action === 'copy-lossless-raw') copyTextResult(M.analyzeLosslessAuthoring(authoring.rawText).rawText);
    else if (action === 'download-result-txt' || action === 'download-result-csv') {
      const projection = personalResultProjection(control.dataset.flowId);
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
    else if (action === 'open-authoring-context') openAuthoringContext(control);
    else if (action === 'authoring-context-information' || action === 'authoring-context-subcheck') {
      const result = dispatchAuthoringChooser({ type: 'show-groups' });
      if (!result || !result.changed) return;
      if (action === 'authoring-context-subcheck') {
        chooseAuthoringPropertyGroup(authoringPropertyTarget.line, 'execution');
        editAuthoringProperty(authoringPropertyTarget.line, 'subcheck');
      } else { renderAuthoringPreview(); focusAfterRender('[data-action="choose-authoring-property-group"]'); }
    }
    else if (action === 'authoring-context-command') applyAuthoringContextCommand(control.dataset.command);
    else if (action === 'back-authoring-chooser') backAuthoringChooser();
    else if (action === 'open-authoring-properties') openAuthoringProperties(Number(control.dataset.line));
    else if (action === 'reselect-authoring-property') {
      if (!authoringPropertyTarget || authoringPropertyIsRecovering()) return;
      authoringPropertyReselection = Object.assign({}, authoringPropertyTarget);
      authoringPropertyTarget = null;
      renderAuthoringPreview();
      setSaveStatus('입력한 값을 적용할 항목의 속성 편집을 선택해 주세요.', 'noop');
    }
    else if (action === 'cancel-stale-authoring-property') {
      authoringPropertyTarget = null;
      authoringPropertyReselection = null;
      setAuthoringPropertyResult('canceled', '입력을 취소했어요. 원문은 그대로입니다.');
    }
    else if (action === 'close-authoring-properties') closeAuthoringProperties(Number(control.dataset.line));
    else if (action === 'choose-authoring-property-group') chooseAuthoringPropertyGroup(Number(control.dataset.line), control.dataset.group);
    else if (action === 'edit-authoring-property') editAuthoringProperty(Number(control.dataset.line), control.dataset.key);
    else if (action === 'cancel-authoring-property') {
      if (authoringChooser && authoringChooser.stage === 'value') { backAuthoringChooser(); return; }
      const line = Number(control.dataset.line);
      const key = control.dataset.key;
      if (authoringPropertyTarget && authoringPropertyTarget.line === line) authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { editorKey: null, values: {}, dependentKind: null, state: 'ready' });
      authoringPropertyComposing = false;
      authoringPropertyCompositionEnter = false;
      renderAuthoringPreview();
      focusAfterRender(authoringPropertyOpenerSelector(line, key), '#authoring-property-tray-heading-' + line);
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
      if (!workspaceWritable()) return;
      const manifest = M.trashManifest(state()).find(entry => entry.kind === control.dataset.kind && entry.id === control.dataset.id);
      if (!manifest || !window.confirm('“' + manifest.title + '”을 영구 삭제할까요? 삭제 뒤에는 Undo하거나 복구할 수 없습니다.')) {
        setSaveStatus('영구 삭제를 취소했어요 · 삭제하지 않았어요', 'noop');
        return;
      }
      let sourceRaw;
      try { sourceRaw = storage.getItem(M.SOURCE_CANDIDATE_STORAGE_KEY); }
      catch (_) { setSaveStatus('원문 비교 저장소를 읽지 못해 삭제하지 않았어요.', 'error'); return; }
      const flow = manifest.kind === 'flow' ? envelope.state.flows.find(entry => entry.id === manifest.id) : null;
      const target = flow ? { kind: 'flow', id: flow.id, savedCopyId: flow.savedCopyId, sourceFlowId: flow.sourceFlowId, ref: flow.ref } : { kind: manifest.kind, id: manifest.id };
      const prepared = S.preparePermanentDelete(workspacePacket, { target, confirmed: true, expectedRevision: envelope.state.revision,
        sourceCandidateRaw: sourceRaw, now: new Date().toISOString() }, 'delete-' + Date.now().toString(36) + '-' + (++workspaceOperationSequence));
      commitWorkspacePrepared(prepared, '선택한 사본의 영구 삭제와 복구 기록 정리를 확인했어요.', () => {
        reloadFeatureStores(false);
        screen = { type: 'workspace', view: 'trash', selectedFlowId: null };
      });
    }
    else if (action === 'move-top') { const changed = moveOrderToEdge(control.dataset.id, control.dataset.context, 'top'); if (moveTarget && moveTarget.id === control.dataset.id) finishMoveTransition(changed); else if (changed && elements.dialog.open) closeDialog(); }
    else if (action === 'move-up') { const changed = moveOrder(control.dataset.id, control.dataset.context, -1); if (moveTarget && moveTarget.id === control.dataset.id) finishMoveTransition(changed); else if (changed && elements.dialog.open) closeDialog(); }
    else if (action === 'move-down') { const changed = moveOrder(control.dataset.id, control.dataset.context, 1); if (moveTarget && moveTarget.id === control.dataset.id) finishMoveTransition(changed); else if (changed && elements.dialog.open) closeDialog(); }
    else if (action === 'move-bottom') { const changed = moveOrderToEdge(control.dataset.id, control.dataset.context, 'bottom'); if (moveTarget && moveTarget.id === control.dataset.id) finishMoveTransition(changed); else if (changed && elements.dialog.open) closeDialog(); }
    else if (action === 'timeline-reset') resetTimelineOrder(control.dataset.context);
    else if (action === 'move-folder-target' || action === 'move-date-target') applyMoveDestination(control);
    else if (action === 'schedule-task') { const changed = transition({ type: 'schedule', id: control.dataset.id, date: control.dataset.date || null }); if (changed) closeDialog(); }
    else if (action === 'undo') undo();
    else if (action === 'toggle-empty-month') { showEmptyMonthDates = !showEmptyMonthDates; render(); setSaveStatus(showEmptyMonthDates ? '빈 날짜를 펼쳤어요.' : '빈 날짜를 접었어요.', 'noop'); }
    else if (action === 'dismiss-toast') { elements.toast.hidden = true; pendingRetry = null; }
    else if (action === 'retry') { const retry = pendingRetry; pendingRetry = null; if (retry) retry(); }
    else if (action === 'open-guide') openGuide();
    else if (action === 'close-dialog') {
      const authoringPropertyCanceled = Boolean(elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]'));
      if (authoringPropertyCanceled && authoringChooser && authoringChooser.stage === 'value') { backAuthoringChooser(); return; }
      closeDialog();
      if (authoringPropertyCanceled) setSaveStatus('취소했어요. 원문은 바뀌지 않았습니다.', 'noop');
    }
    else if (action === 'close-move-panel') closeMovePanel({ restoreFocus: true, announce: true, message: '이동을 취소했어요.' });
    else if (action === 'authoring-step') {
      if (control.dataset.step !== 'input' && control.dataset.step !== 'result' && control.dataset.step !== 'drafts') return;
      if (authoringPropertyTarget && (control.dataset.step === 'drafts' || canDismissAuthoringChooserOutside())) closeAuthoringProperties(authoringPropertyTarget.line, false);
      authoringStep = control.dataset.step;
      if (authoringStep === 'input') authoringReviewOpen = false;
      creatorDraftMenuId = null;
      creatorDraftRenameId = null;
      if (authoringStep !== 'drafts' && document.getElementById('flow-editor')) {
        setAuthoringPaneWithoutRemount(authoringStep);
        renderAuthoringPreview();
      } else render();
      const destination = authoringStep === 'drafts' ? document.getElementById('creator-drafts-heading') : document.querySelector('[data-authoring-pane="' + authoringStep + '"]');
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
    else if (action === 'authoring-text-view' || action === 'authoring-flow-view') {
      authoringFlowViewVisible = action === 'authoring-flow-view';
      renderAuthoringGhosts();
    }
    else if (action === 'toggle-authoring-ghost') {
      authoringGhostVisible = !authoringGhostVisible;
      renderAuthoringGhosts();
      setSaveStatus(authoringGhostVisible ? '빈칸 힌트를 표시했어요.' : '빈칸 힌트를 숨겼어요.', 'noop');
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
      setAuthoringTemplatePreview(template.id);
      setSaveStatus('작성 틀을 미리 보고 있어요. 원문은 바뀌지 않았습니다.', 'noop');
    }
    else if (action === 'apply-template') {
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
    else if (action === 'materialize-structure-template-preview') {
      applyStructureTemplatePreview(control.dataset.templateId);
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
      if (authoringPropertyIsRecovering() || !featureWritable('draft')) return;
      const parsed = M.parseSource(authoring.rawText);
      const handoff = M.makeHandoff(authoring.rawText, Object.assign({}, authoring, { sourceConfirmed: parsed.issues.length === 0 && parsed.itemCount > 0 }));
      const result = C.transitionCheckpoint(workspacePacket.checkpoint, { type: 'commit-authoring', handoff });
      if (!result.changed) {
        if (!result.ok) {
          setSaveStatus('저장하지 못했어요.', 'error');
          showToast(result.message || '원문과 저장 대상을 확인해 주세요.', false);
          return;
        }
        const existing = state().flows.find(flow => flow.handoffId === handoff.handoffId);
        if (existing && !M.isTrashedFlow(state(), existing.id) && existing.rawText === authoring.rawText) {
          authoringReceipt = { flowId: existing.id, title: existing.title, itemCount: existing.steps.reduce((sum, step) => sum + step.itemIds.length, 0) };
          authoringStep = 'input';
          authoringReviewOpen = false;
          screen = { type: 'receipt' };
          setSaveStatus('이미 저장된 Flow예요. 작성 초안은 그대로 두었습니다.', 'noop');
          render();
        } else {
          setSaveStatus('이전에 저장한 Flow를 지금 열 수 없어요. 작성 초안은 그대로입니다.', 'noop');
        }
        return;
      }
      let expectedDraftRaw;
      try {
        expectedDraftRaw = storage.getItem(M.DRAFT_STORAGE_KEY);
        const checked = M.loadAuthoringDraft({ getItem: () => expectedDraftRaw });
        if (checked.status !== 'restored' || checked.authoring.draftId !== authoring.draftId || checked.authoring.rawText !== authoring.rawText
          || checked.authoring.folderId !== authoring.folderId || checked.authoring.templateId !== authoring.templateId) throw new Error('draft-owner-drift');
      } catch (_) {
        setSaveStatus('작성 초안과 저장본이 달라 저장하지 않았어요. 원문을 확인한 뒤 다시 저장해 주세요.', 'error');
        return;
      }
      writeCandidate(result.checkpoint, result.message, () => {
        authoringDraftStored = false;
        loadedDraft = { status: 'empty', authoring: null };
        authoringReceipt = envelope.state.lastReceipt;
        authoring = freshAuthoring();
        authoringSourceEpoch += 1;
        authoringPropertyTarget = null; authoringPropertyReselection = null;
        authoringStep = 'input'; authoringReviewOpen = false;
        screen = { type: 'receipt' };
      }, 'authoring-handoff', expectedDraftRaw);
    }
    else if (action === 'delete-folder') {
      const folder = folderById(control.dataset.id);
      if (folder && window.confirm('“' + folder.title + '” 폴더만 삭제할까요? 안의 내용은 미분류로 옮깁니다.')) {
        if (transition({ type: 'delete-folder', id: folder.id })) { screen = { type: 'workspace', view: 'folder:unfiled', selectedFlowId: null }; render(); }
      }
    }
    else if (action === 'reset-poc') {
      if (!workspaceWritable()) return;
      if (window.confirm('이 연습 화면에서 바꾼 내용, 작성 중 초안, 내 초안, 원문 비교 상태만 초기화할까요?')) {
        const prepared = S.prepareReset(storage, workspacePacket, 'reset-' + Date.now().toString(36) + '-' + (++workspaceOperationSequence));
        commitWorkspacePrepared(prepared, '이 화면의 연습 데이터와 초안을 초기화했어요.', resetRuntimeAfterStorage);
      }
    }
  });

  document.addEventListener('submit', event => {
    if (storageActionsLocked()) { event.preventDefault(); return; }
    if (event.target.matches('[data-quick-conversion-form]')) {
      event.preventDefault();
      submitQuickConversion(event.target);
      return;
    }
    if (event.target.matches('[data-creator-rename-form]')) {
      event.preventDefault();
      const form = event.target;
      const data = new FormData(form);
      const id = form.dataset.id;
      transitionCreatorDraft({ type: 'rename', draftId: id, expectedRevision: Number(form.dataset.revision), displayName: String(data.get('displayName') || ''), now: new Date().toISOString() }, { focusSelector: '[data-action="toggle-creator-actions"][data-id="' + id + '"]' });
      return;
    }
    if (event.target.matches('[data-authoring-inline-form]')) {
      event.preventDefault();
      const form = event.target;
      const line = Number(form.dataset.line);
      const key = form.dataset.key;
      rememberAuthoringPropertyInputs(form);
      if (authoringPropertyComposing || authoringPropertyCompositionEnter || authoringPropertyApplying || authoringPropertyIsRecovering()) return;
      if (!currentAuthoringPropertyTicket(authoringPropertyTarget) || authoringPropertyTarget.line !== line) {
        setAuthoringPropertyResult('stale', '원문이 바뀌어 적용할 항목을 다시 확인해야 해요.');
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
    if (isTextEntryControl(event.target)) scheduleVisualViewportSync();
    scheduleFocusedControlVisibility(event.target);
  });

  document.addEventListener('focusout', () => {
    window.setTimeout(scheduleVisualViewportSync, 0);
  });

  document.addEventListener('focusout', event => {
    if (activeEditorSession() && event.target.matches('[data-item-field], [data-plan-field], [data-item-mode], [data-plan-mode], [data-section-field], [data-section-mode], [data-action="plan-order-move"], [data-action="plan-order-reset"]') && !activeEditorSession().pendingClose) editorLastInputPoint = editorPoint(event.target);
  });

  document.addEventListener('compositionstart', event => {
    if (event.target.closest('[data-authoring-inline-form], [data-dialog-form="authoring-dependent-property"]')) authoringPropertyComposing = true;
  });
  document.addEventListener('compositionend', event => {
    if (event.target.closest('[data-authoring-inline-form], [data-dialog-form="authoring-dependent-property"]')) authoringPropertyComposing = false;
  });
  document.addEventListener('keyup', event => { if (event.key === 'Enter') authoringPropertyCompositionEnter = false; });
  document.addEventListener('beforeinput', event => {
    if (event.target.id !== 'flow-editor') return;
    if (!featureWritable('draft')) { event.preventDefault(); return; }
    if (authoringPropertyIsRecovering() || (event.inputType === 'historyRedo' && authoringRejectedNativeRedo && authoringRejectedNativeRedo.draftId === authoring.draftId)) event.preventDefault();
  });

  document.addEventListener('input', event => {
    if (workspaceTransactionPending || workspaceRecoveryGate || editorRecoveryGate || !workspacePacket.ok) return;
    if (activeEditorSession() && (editorLocked() || activeEditorSession().pendingClose)) return;
    const propertyForm = event.target.closest('[data-authoring-inline-form], [data-dialog-form="authoring-dependent-property"]');
    if (propertyForm) rememberAuthoringPropertyInputs(propertyForm);
    if (event.target.id === 'validation-example-search') {
      validationExampleQuery = event.target.value;
      validationExampleSelectedId = null;
      renderValidationExampleExplorer();
      const search = document.getElementById('validation-example-search');
      if (search) {
        search.focus({ preventScroll: true });
        search.setSelectionRange(validationExampleQuery.length, validationExampleQuery.length);
      }
      setSaveStatus('검증 예시 검색 · 원문은 그대로예요', 'noop');
      return;
    }
    if (event.target.id === 'creator-draft-search') {
      creatorDraftQuery = event.target.value;
      creatorDraftMenuId = null;
      creatorDraftRenameId = null;
      render();
      const search = document.getElementById('creator-draft-search');
      if (search) {
        search.focus({ preventScroll: true });
        search.setSelectionRange(creatorDraftQuery.length, creatorDraftQuery.length);
      }
      return;
    }
    if (event.target.id === 'flow-editor') {
      if (!nativeSourcePlanPending && !nativeTemplateInsertPending && !featureWritable('draft')) { event.target.value = authoring.rawText; return; }
      if (nativeTemplateInsertPending) nativeTemplateInputEventCount += 1;
      authoring.rawText = event.target.value;
      authoringSourceEpoch += 1;
      authoringOccurrencePage = 1;
      if (nativeSourcePlanPending) {
        nativeSourcePlanInputEventCount += 1;
      } else {
        if (!nativeTemplateInsertPending && authoring.templatePickerOpen) setTemplatePickerOpen(false, false);
        if (authoringPropertyTarget) {
          authoringPropertyTarget = Object.assign({}, authoringPropertyTarget, { state: 'stale' });
          elements.app.dataset.authoringPropertyState = 'stale';
        } else authoringReviewOpen = false;
        if (event.inputType !== 'historyUndo' && event.inputType !== 'historyRedo') authoringRejectedNativeRedo = null;
        renderAuthoringPreview();
        renderAuthoringGhosts();
        if (!nativeTemplateInsertPending && !authoringPropertyIsRecovering()) persistAuthoringDraft();
      }
    }
    if (event.target.id === 'force-write-error') forceWriteError = event.target.checked;
    if (isStructureEditor(planSession) && !itemSession && event.target.dataset.sectionField) {
      const id = event.target.dataset.sectionField;
      if (!Object.prototype.hasOwnProperty.call(planDraft.sectionTitles, id)) return;
      planDraft.sectionTitles[id] = { mode: 'override', value: event.target.value };
      updateEditorDraft(); syncPlanSectionLabels(); editorLastInputPoint = editorPoint(event.target);
      return;
    }
    if (isPersonalEditor(activeEditorSession()) && (event.target.dataset.itemField || event.target.dataset.planField)) {
      const field = event.target.dataset.itemField || event.target.dataset.planField;
      if (itemSession) {
        if (field === 'title' || field === 'memo') itemDraft[field] = { mode: 'override', value: event.target.value };
        else if (field === 'date') itemDraft.schedule = { mode: 'fixed_date', date: event.target.value };
      } else if (field === 'flow-title') planDraft.title = { mode: 'override', value: event.target.value };
      updateEditorDraft(); editorLastInputPoint = editorPoint(event.target);
      return;
    }
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
    if (event.target.dataset.itemField || event.target.dataset.planField) { updateEditorDraft(); editorLastInputPoint = editorPoint(event.target); }
  });

  document.addEventListener('change', event => {
    if (workspaceTransactionPending || workspaceRecoveryGate || editorRecoveryGate || !workspacePacket.ok) return;
    if (activeEditorSession() && (editorLocked() || activeEditorSession().pendingClose)) return;
    if (isStructureEditor(planSession) && !itemSession && event.target.dataset.sectionMode) {
      const id = event.target.dataset.sectionMode, selector = '#' + CSS.escape(event.target.id);
      if (!Object.prototype.hasOwnProperty.call(planDraft.sectionTitles, id)) return;
      try {
        planDraft.sectionTitles[id] = PC.changeTextMode(planDraft.sectionTitles[id], event.target.value, planEditorPresentation.baseline.sectionTitles[id]);
        updateEditorDraft(); render(); focusAfterRender(selector);
      } catch (_) { showPersonalEditorError('invalid-plan-section-draft'); }
      return;
    }
    if (isPersonalEditor(activeEditorSession()) && (event.target.dataset.itemMode || event.target.dataset.planMode)) {
      const field = event.target.dataset.itemMode || event.target.dataset.planMode;
      const selected = event.target.value;
      const selector = '#' + CSS.escape(event.target.id);
      try {
        if (itemSession) {
          if (field === 'schedule') itemDraft.schedule = PC.changeScheduleMode(itemDraft.schedule, selected);
          else if (field === 'title' || field === 'memo') {
            const inherited = personalTextBaseline('item', field, itemDraft.itemRef);
            itemDraft[field] = PC.changeTextMode(itemDraft[field], selected, inherited.present ? inherited.value : '');
          } else return;
        } else if (field === 'flow-title') planDraft.title = PC.changeTextMode(planDraft.title, selected, personalTextBaseline('plan', 'title').value);
        else return;
        updateEditorDraft();
        render();
        // Keep the mode select focused; Tab reaches its newly revealed input.
        focusAfterRender(selector);
      } catch (_) { showPersonalEditorError('invalid-personal-mode'); }
      return;
    }
    if (event.target.matches('[data-source-update-choice]') && sourceUpdateSession) {
      if (sourceUpdateSession.status === 'stale' || sourceUpdateSession.status === 'applying'
        || !checkSourceUpdateObservation(sourceUpdateSession).ok) return;
      const choice = event.target.value;
      const result = M.resolveLocalSourceCandidateChange(sourceUpdateSession.workingStore, {
        candidateId: sourceUpdateSession.candidateId,
        changeId: event.target.dataset.changeId,
        resolution: choice,
        now: new Date().toISOString()
      });
      if (result.changed) {
        sourceUpdateSession.workingStore = result.store;
        if (sourcePracticeMemory) sourcePracticeMemory.store = result.store;
        sourceUpdateSession.status = 'comparing';
        sourceUpdateSession.error = null;
        setSaveStatus(choice === 'later' ? '나중에 결정 · 아직 저장하지 않았어요' : '선택함 · 아직 저장하지 않았어요', 'noop');
        render();
        focusAfterRender('[data-source-update-choice="' + choice + '"]', '[data-action="source-update-apply"]', true);
      } else {
        setSaveStatus('이미 같은 선택이에요 · 저장된 내용은 그대로예요', 'noop');
      }
      return;
    }
    if (event.target.id === 'validation-example-group') {
      const nextGroupId = event.target.value;
      const groupExists = nextGroupId === 'all' || (Array.isArray(M.validationExampleGroups) && M.validationExampleGroups.some(group => group.groupId === nextGroupId));
      if (!groupExists) {
        setSaveStatus('검증 예시 분류를 확인하지 못했어요 · 변경 없음', 'error');
        return;
      }
      validationExampleGroupId = nextGroupId;
      validationExampleSelectedId = null;
      renderValidationExampleExplorer();
      focusAfterRender('#validation-example-group', '#validation-example-search');
      setSaveStatus('검증 예시 분류 · 원문은 그대로예요', 'noop');
      return;
    }
    if (event.target.id === 'authoring-folder' && !authoringPropertyIsRecovering()) { if (!featureWritable('draft')) { event.target.value = authoring.folderId || ''; return; } authoring.folderId = event.target.value || null; persistAuthoringDraft(); }
    if (itemDraft && event.target.dataset.itemField === 'folder') { itemDraft.folderId = event.target.value || null; updateEditorDraft(); editorLastInputPoint = editorPoint(event.target); }
  });

  document.addEventListener('keydown', event => {
    if (workspaceRecoveryGate || workspaceTransactionPending || (!workspacePacket.ok && !editorRecoveryGate)) {
      if (!['Tab', 'Enter', ' '].includes(event.key)) event.preventDefault();
      return;
    }
    if (event.key === 'Escape' && recoveredDraftDiscardDialogOpen()) { event.preventDefault(); event.stopImmediatePropagation(); closeDialog(); return; }
    if (editorRecoveryGate && event.key !== 'Tab' && event.key !== 'Enter' && event.key !== ' ') { event.preventDefault(); return; }
    if (editorHistoryConsuming && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); return; }
    if (activeEditorSession() && activeEditorSession().pendingClose && event.key === 'Tab') {
      const controls = Array.from(elements.dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(control => control.getClientRects().length > 0);
      const index = controls.indexOf(document.activeElement);
      if (controls.length && ((event.shiftKey && index <= 0) || (!event.shiftKey && (index < 0 || index === controls.length - 1)))) {
        event.preventDefault();
        controls[event.shiftKey ? controls.length - 1 : 0].focus({ preventScroll: true });
      }
      return;
    }
    if (activeEditorSession() && event.key === 'Escape') {
      if (event.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      requestEditorClose('escape', false);
      return;
    }
    const helperForm = event.target.closest('[data-authoring-inline-form], [data-dialog-form="authoring-dependent-property"]');
    if (helperForm && event.key === 'Enter' && (event.isComposing || event.keyCode === 229 || authoringPropertyComposing)) {
      authoringPropertyCompositionEnter = true;
      event.preventDefault();
      return;
    }
    if (helperForm && event.key === 'Enter') authoringPropertyCompositionEnter = false;
    if (event.target.id === 'flow-editor' && authoringRejectedNativeRedo && authoringRejectedNativeRedo.draftId === authoring.draftId
      && (event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
      event.preventDefault();
      return;
    }
    if (sourceUpdateSession) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeSourceUpdateReview();
        return;
      }
      if (event.key === 'Tab') {
        const dialog = document.querySelector('[data-testid="standalone-source-update-dialog"]');
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
          .filter(element => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!dialog.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      const valueTab = event.target.closest('[data-action="source-update-value-tab"]');
      if (valueTab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const views = ['base', 'mine', 'incoming'];
        const current = views.indexOf(valueTab.dataset.valueView);
        let next = current;
        if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = views.length - 1;
        else if (event.key === 'ArrowLeft') next = (current - 1 + views.length) % views.length;
        else next = (current + 1) % views.length;
        sourceUpdateValueView = views[next];
        render();
        focusAfterRender('[data-action="source-update-value-tab"][data-value-view="' + sourceUpdateValueView + '"]');
        return;
      }
    }
    if (validationExampleExplorerOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (validationExampleSelectedId) {
          showValidationExampleList();
          setSaveStatus('검증 예시 목록으로 돌아왔어요 · 원문은 그대로예요', 'noop');
        } else {
          closeValidationExampleExplorer();
        }
        return;
      }
      if (event.key === 'Tab') {
        const dialog = document.getElementById('validation-example-dialog');
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'))
          .filter(element => element.getClientRects().length > 0 && element.getAttribute('aria-hidden') !== 'true');
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!dialog.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    if (event.key === 'Escape' && screen.type === 'authoring' && authoringStep === 'drafts' && creatorDraftRenameId) {
      event.preventDefault();
      const id = creatorDraftReturnFocusId || creatorDraftRenameId;
      creatorDraftRenameId = null;
      creatorDraftMenuId = null;
      setSaveStatus('이름 변경을 취소했어요 · 변경 없음', 'noop');
      render();
      focusAfterRender('[data-action="toggle-creator-actions"][data-id="' + id + '"]', '#creator-drafts-heading');
      return;
    }
    if (event.key === 'Escape' && screen.type === 'authoring' && authoringStep === 'drafts' && creatorDraftMenuId) {
      event.preventDefault();
      const id = creatorDraftMenuId;
      creatorDraftMenuId = null;
      setSaveStatus('초안 메뉴를 닫았어요 · 변경 없음', 'noop');
      render();
      focusAfterRender('[data-action="toggle-creator-actions"][data-id="' + id + '"]', '#creator-drafts-heading');
      return;
    }
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
      requestEditorClose('escape', false);
      return;
    }
    if (event.key === 'Escape' && screen.type === 'authoring' && authoringChooser && authoringPropertyTarget
      && (!elements.dialog.open || elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]'))) {
      if (event.isComposing || event.keyCode === 229 || authoringEditorComposing || authoringPropertyComposing) return;
      event.preventDefault();
      backAuthoringChooser();
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
    if (event.key === 'Escape' && (dragged || pointerOrigin || longPressTimer !== null)) {
      event.preventDefault();
      cancelActiveMoveInteraction('이동을 취소했어요.', { restoreFocus: true });
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
    if (!workspaceWritable()) { event.preventDefault(); return; }
    const handle = event.target.closest('.drag-handle[draggable="true"]');
    if (!handle) return;
    const kind = handle.dataset.moveKind;
    const row = handle.closest(kind === 'flow' ? '.flow-row' : '.task-row');
    if (!row) return;
    const id = kind === 'flow' ? row.dataset.flowId : row.dataset.taskId;
    dragged = { kind, id, context: row.dataset.context, list: kind === 'task' ? row.closest('.task-list') : null,
      orderTicket: kind === 'task' ? openingTimelineTicket(id, row.dataset.context) : null };
    openMovePanel(kind, id, row.dataset.context, handle, false);
    if (!dragged || !moveTarget) { event.preventDefault(); return; }
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
    if (!workspaceWritable()) { event.preventDefault(); finishDrag(); return; }
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
    const canceled = cancelActiveMoveInteraction('이동을 취소했어요.', { restoreFocus: false });
    if (!canceled && movePanelOpen()) {
      closeMovePanel({ restoreFocus: false, announce: true, message: '이동을 취소했어요.' });
    }
  });
  window.addEventListener('resize', () => {
    const nextLayoutViewport = {
      width: Math.max(1, window.innerWidth || document.documentElement.clientWidth || 1),
      height: Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1)
    };
    const keyboardResize = isTextEntryControl(document.activeElement)
      && Math.abs(nextLayoutViewport.width - lastLayoutViewport.width) <= 2
      && Math.abs(nextLayoutViewport.height - lastLayoutViewport.height) >= VIRTUAL_KEYBOARD_MIN_INSET_PX;
    lastLayoutViewport = nextLayoutViewport;
    syncVisualViewport();
    const canceled = cancelActiveMoveInteraction('화면 크기가 바뀌어 이동을 취소했어요.', { restoreFocus: !keyboardResize });
    if (!canceled && movePanelOpen() && !keyboardResize) {
      closeMovePanel({ restoreFocus: true, announce: true, message: '화면 크기가 바뀌어 이동을 취소했어요.' });
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { refreshTimelineClock(); return; }
    const canceled = cancelActiveMoveInteraction('이동을 취소했어요.', { restoreFocus: false });
    if (!canceled && movePanelOpen()) {
      closeMovePanel({ restoreFocus: false, announce: true, message: '이동을 취소했어요.' });
    }
  });
  window.addEventListener('focus', refreshTimelineClock);

  document.addEventListener('pointerdown', event => {
    if (storageActionsLocked()) return;
    if (event.target.closest('#authoring-ghost-toggle')) {
      event.preventDefault();
      return;
    }
    const handle = event.target.closest('.drag-handle');
    if (!handle || event.pointerType === 'mouse' || event.button !== 0) return;
    cancelHandlePress('', false);
    pointerOrigin = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, handle, kind: handle.dataset.moveKind, id: handle.dataset.id, context: handle.dataset.context, phase: 'armed', moved: false,
      orderTicket: handle.dataset.moveKind === 'task' ? openingTimelineTicket(handle.dataset.id, handle.dataset.context) : null };
    longPressTimer = window.setTimeout(() => {
      if (!pointerOrigin || !workspaceWritable()) return;
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
    if (storageActionsLocked()) { cancelActiveMoveInteraction('', { restoreFocus: false }); return; }
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
    const matchingPointer = Boolean(pointerOrigin && event.pointerId === pointerOrigin.pointerId);
    const cancelNativeDrag = Boolean(dragged && !(event.pointerType === 'mouse' && event.isTrusted));
    if (!matchingPointer && !cancelNativeDrag) return;
    const handle = event.target.closest('.drag-handle') || (moveReturnFocus ? moveReturnFocus.element : null);
    if (handle) suppressNextHandleClick(handle);
    cancelActiveMoveInteraction('이동을 취소했어요.', { pointerId: matchingPointer ? event.pointerId : null, restoreFocus: true, closePanel: matchingPointer });
  });
  document.addEventListener('touchcancel', () => {
    cancelActiveMoveInteraction('터치 이동을 취소했어요.', { restoreFocus: true });
  }, { passive: true });
  document.addEventListener('lostpointercapture', event => {
    if (!pointerOrigin || event.pointerId !== pointerOrigin.pointerId) return;
    cancelActiveMoveInteraction('터치 이동을 취소했어요.', { pointerId: event.pointerId, restoreFocus: true });
  });
  document.addEventListener('scroll', event => {
    if (event.target && event.target.id === 'flow-editor') syncAuthoringGhostScroll();
    if (pointerOrigin) {
      const message = pointerOrigin.phase === 'active' ? '스크롤로 이동을 취소했어요.' : '스크롤로 누르기 취소';
      cancelActiveMoveInteraction(message, { restoreFocus: true });
    }
  }, true);

  function handleVisualViewportChange() {
    if (pointerOrigin || dragged || longPressTimer !== null) {
      cancelActiveMoveInteraction('화면 표시 영역이 바뀌어 이동을 취소했어요.', { restoreFocus: false });
    }
    syncVisualViewport();
  }

  function handleVisualViewportScroll() {
    scheduleVisualViewportSync();
  }

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleVisualViewportChange, { passive: true });
    window.visualViewport.addEventListener('scroll', handleVisualViewportScroll, { passive: true });
  }
  window.addEventListener('orientationchange', handleVisualViewportChange, { passive: true });

  elements.dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (activeEditorSession() && activeEditorSession().pendingClose) { continueEditor(); return; }
    const authoringPropertyCanceled = Boolean(elements.dialog.querySelector('[data-dialog-form="authoring-dependent-property"]'));
    if (authoringPropertyCanceled && authoringChooser && authoringChooser.stage === 'value') { backAuthoringChooser(); return; }
    closeDialog();
    setSaveStatus(authoringPropertyCanceled ? '취소했어요. 원문은 바뀌지 않았습니다.' : '취소했어요.', 'noop');
  });

  elements.dialog.addEventListener('click', event => {
    if (event.target !== elements.dialog || !activeEditorSession() || !activeEditorSession().pendingClose) return;
    const bounds = elements.dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) continueEditor();
  });

  document.addEventListener('click', event => {
    if (screen.type !== 'authoring' || !canDismissAuthoringChooserOutside() || elements.dialog.open) return;
    if (event.target.closest('.property-inline-tray, #authoring-context-anchor, [data-action="open-authoring-properties"], [data-action="reselect-authoring-property-target"]')) return;
    closeAuthoringProperties(authoringPropertyTarget.line, false);
  });
  document.addEventListener('focusout', event => {
    // Rendering the next chooser step removes the old control without a focus
    // destination. Only a real focus transfer may dismiss this non-modal UI.
    if (!canDismissAuthoringChooserOutside() || !event.relatedTarget || !event.target.closest('.property-inline-tray')) return;
    if (event.relatedTarget.closest('.property-inline-tray, #authoring-context-anchor')) return;
    const owner = authoringChooser.owner;
    window.setTimeout(() => {
      if (!canDismissAuthoringChooserOutside() || authoringChooser.owner !== owner || elements.dialog.open) return;
      if (document.activeElement && document.activeElement.closest('.property-inline-tray, #authoring-context-anchor')) return;
      closeAuthoringProperties(authoringPropertyTarget.line, false);
    }, 0);
  });
  document.addEventListener('keydown', () => { contextualInput = 'keyboard'; }, true);
  document.addEventListener('pointerdown', () => { contextualInput = 'pointer'; }, true);
  window.addEventListener('storage', event => {
    if (personalEntry.active() && event.storageArea === storage && (event.key === null || [M.SOURCE_CANDIDATE_STORAGE_KEY,
      M.DRAFT_STORAGE_KEY, M.CREATOR_DRAFT_STORAGE_KEY, S.STORAGE_KEY, S.LEGACY_KEY, S.RECOVERY_KEY, S.LEGACY_RECOVERY_KEY].includes(event.key))) {
      workspaceEpoch += 1;
      if (!personalEntry.visitActive?.() && (event.key === null || event.key === M.SOURCE_CANDIDATE_STORAGE_KEY)) personalPlanSourceEpoch += 1;
      personalEntry.invalidate('저장된 내용이 바뀌어 이전 미리보기를 닫았습니다.');
      if (!personalEntry.visitActive?.()) return;
    }
    if (event.storageArea === storage && (event.key === M.SOURCE_CANDIDATE_STORAGE_KEY || event.key === null)) {
      personalPlanSourceEpoch += 1;
      if (isSourceEditor(activeEditorSession()) && !editorRecoveryGate) {
        editorFeedback = { state: 'invalid', message: personalEditorMessage('stale-source-plan') };
        syncEditorUI();
      } else if (!activeEditorSession() && !editorRecoveryGate && !workspaceRecoveryGate) { reloadFeatureStores(false); render(); }
    }
    if (event.storageArea === storage && (event.key === null || [S.STORAGE_KEY, S.LEGACY_KEY, S.RECOVERY_KEY, S.LEGACY_RECOVERY_KEY].includes(event.key))) {
      interruptContextualResult('observed-external-change');
      // An observed A -> B -> A does not make an old result current again.
      // Own same-tab writes do not dispatch this cross-document event.
      dismissPlanSaveResult();
    }
  });

  if (!workspacePacket.ok) routeWorkspaceRecovery(workspacePacket);
  else if (storageMode === 'volatile') setSaveStatus('임시 모드 · 새로고침하면 초기화', 'error');
  else if (creatorDraftLibraryStatus === 'corrupt') setSaveStatus('손상된 내 초안 차단 · 기존 바이트 보존', 'error');
  else if (creatorDraftLibraryStatus === 'read-error') setSaveStatus('내 초안 읽기 실패 · 변경 차단', 'error');
  else if (loadedDraft.status === 'restored') setSaveStatus('작성 중 초안 복원 · 저장 확인 전', 'saved');
  else if (loadedDraft.status === 'corrupt') setSaveStatus('손상된 작성 초안 차단 · 기존 값 보존', 'error');
  else if (loadedDraft.status === 'read-error') setSaveStatus('작성 초안 읽기 실패 · 해당 기능 변경 차단', 'error');
  else if (workspacePacket.origin === 'checkpoint') setSaveStatus('마지막 성공 checkpoint 복원', 'saved');
  else if (workspacePacket.origin === 'legacy') setSaveStatus('기존 저장본 읽기 · 새 저장본은 아직 만들지 않았어요.', 'noop');
  else if (workspacePacket.origin === 'seed') setSaveStatus('처음 사용하는 예제 데이터 · 저장된 사용자 변경 없음', 'noop');
  render();
  syncVisualViewport();
  scheduleTimelineClock();
})();
