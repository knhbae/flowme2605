/* Read navigation retains the editor. Only an explicit draft transition writes. */
(function (root) {
  'use strict';
  const H = value => String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const VIEWS = ['txt', 'todo', 'calendar', 'sheet'];
  const HISTORY_KEY = '__flowPocPersonalEntryV1';
  const VISIT_HISTORY_KEY = '__flowPocPersonalEntryVisitV1';
  function create(deps) {
    const host = document.createElement('section');
    host.className = 'content personal-entry-host';
    host.dataset.testid = 'personal-workspace-entry-host';
    host.hidden = true;
    deps.content.after(host);
    // This sibling is the real app renderer's temporary home. The original
    // content (including its native textarea history) is never disconnected.
    const visitHost = document.createElement('section');
    visitHost.className = 'content';
    visitHost.dataset.testid = 'personal-entry-workspace';
    visitHost.hidden = true;
    visitHost.innerHTML = '<div class="personal-entry-launch"><button class="button" type="button" data-action="entry-preview-return">미리보기로 돌아가기</button></div><div data-testid="personal-entry-visit-content"></div>';
    const visitContent = visitHost.querySelector('[data-testid="personal-entry-visit-content"]');
    host.after(visitHost);
    let session = null, generation = 0, intent = 0, historySequence = 0;
    const current = () => Boolean(session);
    const visitActive = () => Boolean(session && session.visit);
    const readHostActive = () => Boolean(session && (!session.visit || session.visit.returning));
    const controls = () => Array.from(host.querySelectorAll('button:not([disabled]), input, textarea, a[href], [tabindex="0"]'))
      .filter(node => !node.disabled && !node.closest('[hidden], [inert]'));
    function focus(target, position) {
      const ticket = ++intent, owner = session, stage = owner && owner.stage;
      requestAnimationFrame(() => {
        if (ticket !== intent || session !== owner || owner && owner.stage !== stage || !target || !target.isConnected
          || target.closest('[hidden], [inert]')) return;
        target.focus({ preventScroll: true });
        if (position) window.scrollTo(position.x, position.y);
      });
    }
    function assertCurrent() {
      if (!session || session.invalid) return false;
      const read = deps.read();
      if (!read.ok || read.binding !== session.read.binding) {
        invalidate('저장된 내용이 바뀌어 이전 미리보기를 닫았습니다.'); return false;
      }
      return true;
    }
    function invalidMarkup() {
      return '<div data-testid="personal-entry-read-gate" role="alert"><h2 tabindex="-1">읽기 상태 확인 필요</h2><p>'
        + H(session.invalid) + '</p><p>현재 화면의 원문은 그대로입니다. 저장 상태를 확인한 뒤 다시 열어 주세요.</p></div>';
    }
    function invalidate(message) {
      if (!session) return;
      if (session.authorAttempt) deps.authoringTransition.cancel(session.authorAttempt.ticket);
      session.authorAttempt = null;
      intent += 1; generation += 1;
      session.invalid = message || '저장된 내용이 바뀌어 이전 미리보기를 닫았습니다.';
      session.selectedRef = null; session.openItemId = null;
      session.read = null; session.resolution = null;
      // Invalidating the return ticket must not replace a live editor/recovery.
      if (!session.visit) render();
    }
    function markHistory() {
      const marker = { id: ++historySequence };
      try { history.pushState(Object.assign({}, history.state || {}, { [HISTORY_KEY]: marker }), '', location.href); session.historyId = marker.id; }
      catch (_) { session.historyId = null; }
    }
    function open(opener) {
      if (session || !deps.canOpen()) return false;
      const read = deps.read();
      if (!read.ok) { deps.announce('저장된 원문과 사본을 확인하지 못해 검색을 열지 않았어요. 현재 입력은 유지했습니다.'); return false; }
      const editor = deps.content.querySelector('#flow-editor');
      const feedback = document.querySelector('.global-feedback');
      const retained = { opener, editor, selection: editor ? [editor.selectionStart, editor.selectionEnd, editor.selectionDirection] : null,
        editorScroll: editor ? [editor.scrollLeft, editor.scrollTop] : null, x: window.scrollX, y: window.scrollY,
        draftRaw: read.draftRaw, libraryRaw: read.libraryRaw, sidebarInert: deps.sidebar.inert,
        topbar: document.querySelector('.topbar'), topbarInert: Boolean(document.querySelector('.topbar')?.inert),
        feedback, feedbackHidden: Boolean(feedback?.hidden), feedbackInert: Boolean(feedback?.inert) };
      session = { read, retained, generation: ++generation, stage: 'list', input: '', resolution: null,
        selectedRef: null, owner: 'mine', view: 'txt', page: 1, baseDate: deps.today(), selectedDate: deps.today(),
        openItemId: null, listReturn: null, previewReturn: null, invalid: null, authoring: deps.isAuthoring(),
        composing: false, authorAttempt: null, authorNotice: null, visit: null };
      deps.content.hidden = true; deps.content.inert = true;
      deps.sidebar.inert = true;
      if (retained.topbar) retained.topbar.inert = true;
      if (feedback) { feedback.hidden = true; feedback.inert = true; }
      if (deps.onOpen) deps.onOpen();
      host.hidden = false;
      document.getElementById('app').dataset.personalEntryActive = 'true';
      markHistory(); render(); focus(host.querySelector('#personal-entry-search')); return true;
    }
    function close(fromHistory, adoption) {
      if (!session) return;
      if (session.visit) { requestVisitReturn('authoring', fromHistory); return; }
      // Closing is a read boundary too, including same-document/unobserved drift.
      if (!adoption) assertCurrent();
      if (session.authorAttempt) deps.authoringTransition.cancel(session.authorAttempt.ticket);
      const previous = session; session = null; intent += 1; generation += 1;
      host.hidden = true; host.replaceChildren();
      deps.content.hidden = false; deps.content.inert = false; deps.sidebar.inert = previous.retained.sidebarInert;
      if (previous.retained.topbar) previous.retained.topbar.inert = previous.retained.topbarInert;
      if (previous.retained.feedback) {
        previous.retained.feedback.hidden = previous.retained.feedbackHidden;
        previous.retained.feedback.inert = previous.retained.feedbackInert;
      }
      delete document.getElementById('app').dataset.personalEntryActive;
      if (!fromHistory && previous.historyId && history.state && history.state[HISTORY_KEY]?.id === previous.historyId) {
        // Remove only our marker; do not consume or rewrite the editor's marker.
        const state = Object.assign({}, history.state); delete state[HISTORY_KEY];
        try { history.replaceState(state, '', location.href); } catch (_) { /* file viewer may reject history */ }
      }
      if (adoption) { deps.onAuthoring(adoption); return; }
      deps.onReturn(Boolean(previous.invalid), previous.authoring, previous.retained);
      const retained = previous.retained;
      if (retained.editor && retained.editor.isConnected && retained.selection) {
        retained.editor.setSelectionRange(...retained.selection);
        retained.editor.scrollLeft = retained.editorScroll[0]; retained.editor.scrollTop = retained.editorScroll[1];
      }
      const target = retained.opener && retained.opener.isConnected ? retained.opener : retained.editor;
      focus(target, retained);
    }
    function markVisitHistory(visit) {
      try {
        history.pushState(Object.assign({}, history.state || {}, { [VISIT_HISTORY_KEY]: { id: visit.id } }), '', location.href);
        visit.marked = true;
      } catch (_) { visit.marked = false; }
    }
    function beginVisit() {
      if (!session || session.visit || !assertCurrent()) return false;
      const copy = selectedCopy();
      if (!copy || typeof deps.beginVisit !== 'function') return false;
      const visit = { id: ++historySequence, token: Object.freeze({}), returning: false, marked: false, destination: 'preview' };
      session.previewReturn = { x: window.scrollX, y: window.scrollY };
      session.visit = visit;
      intent += 1;
      host.hidden = true; host.inert = true; visitHost.hidden = false;
      delete document.getElementById('app').dataset.personalEntryActive;
      deps.sidebar.inert = session.retained.sidebarInert;
      if (session.retained.topbar) session.retained.topbar.inert = session.retained.topbarInert;
      if (session.retained.feedback) { session.retained.feedback.hidden = false; session.retained.feedback.inert = false; }
      if (!deps.beginVisit(copy, visitContent, visit.token, session.read.binding)) {
        session.visit = null; visitHost.hidden = true; host.hidden = false; host.inert = false;
        deps.sidebar.inert = true;
        if (session.retained.topbar) session.retained.topbar.inert = true;
        if (session.retained.feedback) { session.retained.feedback.hidden = true; session.retained.feedback.inert = true; }
        document.getElementById('app').dataset.personalEntryActive = 'true';
        invalidate('선택한 사본을 확인하지 못해 상세를 열지 않았습니다.');
        return false;
      }
      markVisitHistory(visit);
      return true;
    }
    function finishVisitReturn(visit) {
      if (!session || session.visit !== visit) return false;
      if (!deps.endVisit(visit.token)) { if (history.state?.[VISIT_HISTORY_KEY]?.id !== visit.id) markVisitHistory(visit); return false; }
      session.visit = null; intent += 1;
      visitHost.hidden = true; visitContent.replaceChildren();
      host.hidden = false; host.inert = false;
      deps.sidebar.inert = true;
      if (session.retained.topbar) session.retained.topbar.inert = true;
      if (session.retained.feedback) { session.retained.feedback.hidden = true; session.retained.feedback.inert = true; }
      document.getElementById('app').dataset.personalEntryActive = 'true';
      assertCurrent();
      if (visit.destination === 'authoring') { close(false); return true; }
      render();
      focus(session.invalid ? host.querySelector('[data-testid="personal-entry-read-gate"] h2')
        : host.querySelector('[data-action="entry-workspace"]'), session.previewReturn);
      return true;
    }
    function requestVisitReturn(reason, fromHistory) {
      const visit = session && session.visit;
      if (!visit || visit.returning) return false;
      if (!deps.beforeVisitReturn(reason, Boolean(fromHistory))) {
        // A blocked Back must not consume the visit marker underneath a dirty
        // editor, move, or recovery. Editor history retains its own marker.
        if (fromHistory && history.state?.[VISIT_HISTORY_KEY]?.id !== visit.id) markVisitHistory(visit);
        return false;
      }
      visit.destination = reason === 'authoring' ? 'authoring' : 'preview';
      if (!fromHistory && visit.marked && history.state?.[VISIT_HISTORY_KEY]?.id === visit.id) {
        visit.returning = true;
        try { history.back(); return false; } catch (_) { visit.returning = false; }
      }
      return finishVisitReturn(visit);
    }
    function visitEventAllowed(event) {
      if (!session || !session.visit || session.visit.returning || host.contains(event.target) || deps.content.contains(event.target)) return false;
      if (!event.target.isConnected || event.target.closest('[hidden], [inert]')) return false;
      return visitHost.contains(event.target) || Boolean(deps.visitOwnsTarget && deps.visitOwnsTarget(event.target));
    }
    function selectedCopy() { return session.read.catalog.copies.find(copy => copy.flowRef === session.selectedRef); }
    function authorChoice(raw) {
      const resolved = deps.query(raw, session.read.packet);
      const kind = resolved.ok ? resolved.resolution.kind : 'empty';
      return { enabled: resolved.ok && kind !== 'empty' && !session.composing && !session.authorHistoryReturning,
        label: ['url', 'invalid-url'].includes(kind) ? '텍스트로 계속' : '이 내용으로 새 Flow 작성',
        primary: ['memo', 'url', 'invalid-url'].includes(kind) };
    }
    function authorButtonMarkup() {
      const choice = authorChoice(session.input);
      return '<button class="button' + (choice.primary ? ' primary' : '') + '" type="button" data-action="entry-author"'
        + (choice.enabled ? '' : ' disabled') + '>' + H(choice.label) + '</button>';
    }
    function updateAuthorButton() {
      if (!session || session.invalid || session.authorAttempt) return;
      const button = host.querySelector('[data-action="entry-author"]');
      if (!button) return;
      const choice = authorChoice(session.input);
      button.disabled = !choice.enabled; button.textContent = choice.label;
      button.className = 'button' + (choice.primary ? ' primary' : '');
    }
    function authorMarkup() {
      const attempt = session.authorAttempt, state = attempt.status;
      const failed = ['failed', 'stale', 'recovery-required'].includes(state);
      const message = state === 'saving' ? '새 작성 초안을 저장하고 있어요.'
        : state === 'recovery-required' ? '저장·복구 결과를 확인하지 못해 추가 쓰기를 막았습니다. 기존 원문과 아래 입력을 복사해 두고 저장 상태를 확인해 주세요.'
          : state === 'stale' ? '다른 화면의 저장 내용이 바뀌어 새 작성을 막았습니다. 현재 원문과 입력은 유지했습니다.'
            : state === 'failed' ? '초안을 저장하지 못했습니다. 기존 원문과 입력은 그대로예요. 다시 시도할 수 있습니다.'
              : '현재 작성 초안을 아래 내용의 새 초안으로 바꿉니다. 내 초안 보관함과 개인공간의 Flow는 바뀌지 않습니다.';
      return '<section class="personal-entry-author-confirm" data-testid="personal-entry-author-confirm" aria-labelledby="personal-entry-author-heading">'
        + '<h2 id="personal-entry-author-heading" tabindex="-1">' + (attempt.replacesDraft ? '새 작성으로 바꿀까요?' : '새 작성 초안') + '</h2>'
        + '<p data-testid="personal-entry-author-status" role="' + (failed ? 'alert' : 'status') + '" data-state="' + H(state) + '">' + H(message) + '</p>'
        + '<label for="personal-entry-author-raw">새 작성 내용</label><textarea id="personal-entry-author-raw" readonly rows="4">'
        + (/^\n/.test(attempt.raw) ? '\n' : '') + H(attempt.raw) + '</textarea><div class="personal-entry-author-actions">'
        + '<button class="button" type="button" data-action="entry-author-cancel">취소</button>'
        + (state === 'ready' ? '<button class="button primary" type="button" data-action="entry-author-confirm">새 작성으로 바꾸기</button>'
          : state === 'failed' ? '<button class="button primary" type="button" data-action="entry-author-retry">다시 시도</button>' : '') + '</div></section>';
    }
    function markAuthorHistory() {
      if (!session.historyId) return;
      if (history.state && history.state[HISTORY_KEY]?.id === session.historyId && history.state[HISTORY_KEY].confirm) return;
      try { history.pushState(Object.assign({}, history.state || {}, { [HISTORY_KEY]: { id: session.historyId, confirm: true } }), '', location.href); }
      catch (_) { /* Confirmation still supports Escape and explicit cancel in file viewers. */ }
    }
    function cancelAuthoring(fromHistory) {
      if (!session || !session.authorAttempt) return;
      const status = session.authorAttempt.status;
      deps.authoringTransition.cancel(session.authorAttempt.ticket);
      session.authorAttempt = null;
      session.authorNotice = status === 'recovery-required'
        ? '새 작성을 닫았습니다. 저장·복구 결과는 아직 확인되지 않았고 추가 쓰기는 차단했습니다. 필요한 입력은 복사해 두세요.'
        : status === 'stale' ? '새 작성을 닫았습니다. 다른 화면의 저장 변경을 확인한 뒤 다시 열어 주세요.'
          : '새 작성을 취소했어요 · 변경 없음';
      if (!fromHistory && history.state && history.state[HISTORY_KEY]?.id === session.historyId && history.state[HISTORY_KEY].confirm) {
        // Consume exactly our confirmation entry. Replacing its marker would
        // leave a duplicate list entry and make the next Back appear inert.
        session.authorHistoryReturning = true;
        try { history.back(); } catch (_) {
          session.authorHistoryReturning = false;
          try { history.replaceState(Object.assign({}, history.state, { [HISTORY_KEY]: { id: session.historyId } }), '', location.href); } catch (_) { /* no storage fallback */ }
        }
      }
      render(); if (!session.authorHistoryReturning) focus(host.querySelector('[data-action="entry-author"]'));
    }
    function prepareAuthoring(raw) {
      const prepared = deps.authoringTransition.prepare(raw, session.read.binding);
      session.authorAttempt = { raw, ticket: prepared.ticket, status: prepared.status,
        replacesDraft: prepared.replacesDraft, reason: prepared.reason };
      session.authorNotice = null;
      if (prepared.status !== 'ready') {
        deps.onAuthoringBlocked(prepared, session.read); render(); focus(host.querySelector('#personal-entry-author-heading')); return;
      }
      if (prepared.replacesDraft) { markAuthorHistory(); render(); focus(host.querySelector('[data-action="entry-author-cancel"]'), { x: 0, y: 0 }); }
      else commitAuthoring();
    }
    function commitAuthoring() {
      const owner = session, attempt = owner && owner.authorAttempt;
      if (!attempt || attempt.status !== 'ready' || owner.composing) return;
      attempt.status = 'saving'; render();
      // Give saving feedback a paint opportunity. Cancel, Back, drift, and a new
      // session revoke this callback before it may consume its private ticket.
      requestAnimationFrame(() => setTimeout(() => {
        if (session !== owner || owner.authorAttempt !== attempt || attempt.status !== 'saving' || owner.invalid) return;
        const result = deps.authoringTransition.commit(attempt.ticket);
        if (result.status === 'success') { close(false, result); return; }
        attempt.status = result.status; attempt.reason = result.reason;
        deps.onAuthoringBlocked(result, owner.read);
        render(); focus(host.querySelector('#personal-entry-author-heading'));
      }, 0));
    }
    function listMarkup() {
      const resolution = session.resolution;
      const matches = !resolution || resolution.kind === 'empty' ? session.read.catalog.copies
        : resolution.matches.map(match => session.read.catalog.copies.find(copy => copy.flowRef === match.flowRef)).filter(Boolean);
      let hint = '이 기기에 저장된 사본 ' + matches.length + '개';
      if (resolution && resolution.kind === 'url') hint = '이 URL과 연결된 저장 사본이 없어요. 웹을 조회하거나 새 Flow를 만들지는 않았습니다.';
      else if (resolution && resolution.kind === 'invalid-url') hint = 'URL 형식을 확인해 주세요. 입력은 그대로 유지했습니다.';
      else if (resolution && resolution.kind === 'memo') hint = '일치하는 저장 사본이 없어요. 입력을 자동으로 원문에 넣지 않았습니다.';
      return '<form data-entry-search-form><label for="personal-entry-search">검색어 또는 URL</label><div class="personal-entry-search-row"><textarea id="personal-entry-search" rows="2" autocomplete="off">'
        + (/^\n/.test(session.input) ? '\n' : '') + H(session.input) + '</textarea><button class="button primary" type="submit">찾기</button></div></form><p' + (session.authorNotice ? '' : ' role="status"') + ' class="personal-entry-count">' + H(hint)
        + '</p><div class="personal-entry-author-actions">' + authorButtonMarkup() + '</div>'
        + (session.authorNotice ? '<p role="status">' + H(session.authorNotice) + '</p>' : '')
        + '<div class="personal-entry-copies">' + matches.map(copy => '<button class="personal-entry-copy" type="button" data-action="entry-select" data-flow-ref="'
          + H(copy.flowRef) + '"><strong>' + H(copy.title) + '</strong><span>' + H(deps.folderTitle(copy.folderId)) + ' · 할 일 ' + copy.itemRefs.length
          + '개</span><small>' + H(copy.origin) + (copy.origin === 'source-backed-map' ? ' · 그룹 정보 없음' : '') + '</small></button>').join('') + '</div>';
    }
    function previewMarkup() {
      const copy = selectedCopy(); if (!copy) return invalidMarkup();
      const details = deps.preview(session.read, copy, session);
      if (!details || !details.ok) { session.invalid = '원문과 개인 사본을 안전하게 표시하지 못했습니다.'; return invalidMarkup(); }
      return '<div class="personal-entry-preview-head"><button class="button" type="button" data-action="entry-list">목록으로</button><h2 tabindex="-1">' + H(copy.title)
        + '</h2><p>' + H(deps.folderTitle(copy.folderId)) + ' · 읽기 전용</p></div><div class="personal-entry-owner" aria-label="표시 기준"><button class="button" type="button" data-action="entry-owner" data-owner="mine" aria-pressed="'
        + String(session.owner === 'mine') + '">내 사본 미리보기</button><button class="button" type="button" data-action="entry-owner" data-owner="source" aria-pressed="'
        + String(session.owner === 'source') + '">원문 기준 보기</button></div>' + details.html
        + '<div class="personal-entry-return"><button class="button" type="button" data-action="entry-workspace">개인공간에서 확인</button></div>';
    }
    function render() {
      if (!session || session.visit) return;
      host.innerHTML = '<header class="personal-entry-head"><div><p class="eyebrow">내 저장 사본</p><h1 tabindex="-1">기존 Flow 찾기</h1></div><button class="button" type="button" data-action="entry-close">'
        + (session.authoring ? '작성으로 돌아가기' : '개인공간으로 돌아가기') + '</button></header>'
        + (session.invalid ? invalidMarkup() : session.authorAttempt ? authorMarkup() : session.stage === 'list' ? listMarkup() : previewMarkup());
    }
    function back() {
      if (!session) return;
      if (session.visit) { requestVisitReturn('escape', false); return; }
      if (session.authorAttempt) { cancelAuthoring(false); return; }
      assertCurrent();
      if (session.invalid || session.stage === 'list') { close(false); return; }
      if (session.openItemId) {
        const id = session.openItemId; session.openItemId = null; render();
        focus(Array.from(host.querySelectorAll('[data-action="entry-open-item"]')).find(node => node.dataset.id === id)); return;
      }
      showList();
    }
    function showList() {
      session.openItemId = null;
      session.stage = 'list'; render();
      const item = Array.from(host.querySelectorAll('[data-action="entry-select"]')).find(node => node.dataset.flowRef === session.selectedRef);
      focus(item || host.querySelector('#personal-entry-search'), session.listReturn);
    }
    function click(event) {
      const control = event.target.closest('[data-action]'), action = control && control.dataset.action;
      if (action === 'open-personal-entry') { event.preventDefault(); event.stopImmediatePropagation(); open(control); return; }
      if (!session) return;
      if (session.visit) {
        if (visitEventAllowed(event) && action === 'entry-preview-return') { event.preventDefault(); event.stopImmediatePropagation(); requestVisitReturn('button', false); return; }
        if (visitEventAllowed(event) && action === 'go-authoring') { event.preventDefault(); event.stopImmediatePropagation(); requestVisitReturn('authoring', false); return; }
        if (!visitEventAllowed(event)) { event.preventDefault(); event.stopImmediatePropagation(); }
        return;
      }
      // Inert blocks pointer/keyboard use; this guard also blocks programmatic old writers.
      if (!host.contains(event.target)) {
        if (action || event.target.closest('.drag-handle')) { event.preventDefault(); event.stopImmediatePropagation(); }
        return;
      }
      event.stopImmediatePropagation();
      if (!control) return;
      event.preventDefault();
      if (session.authorHistoryReturning) return;
      if (action === 'entry-close') { close(false); return; }
      if (action === 'entry-author-cancel') { cancelAuthoring(false); return; }
      if (session.composing) return;
      if (session.authorAttempt) {
        if (action === 'entry-author-confirm') commitAuthoring();
        else if (action === 'entry-author-retry' && session.authorAttempt.status === 'failed') prepareAuthoring(session.authorAttempt.raw);
        return;
      }
      if (action === 'entry-author') {
        if (session.invalid) return;
        const input = host.querySelector('#personal-entry-search');
        if (!input) return;
        session.input = input.value;
        if (authorChoice(session.input).enabled) prepareAuthoring(session.input);
        return;
      }
      if (!assertCurrent()) return;
      intent += 1;
      if (action === 'entry-list') { showList(); return; }
      if (action === 'entry-preview-return' || action === 'entry-close-item') { back(); return; }
      if (action === 'entry-select') {
        const copy = session.read.catalog.copies.find(entry => entry.flowRef === control.dataset.flowRef);
        if (!copy) return;
        session.listReturn = { x: window.scrollX, y: window.scrollY };
        if (session.selectedRef !== copy.flowRef) Object.assign(session, { selectedRef: copy.flowRef, owner: 'mine', view: 'txt', page: 1,
          baseDate: deps.today(), selectedDate: deps.today(), openItemId: null });
        session.stage = 'preview'; render(); focus(host.querySelector('.personal-entry-preview-head h2'), { x: 0, y: 0 }); return;
      }
      if (action === 'entry-owner' && ['mine', 'source'].includes(control.dataset.owner)) { session.owner = control.dataset.owner; session.openItemId = null; }
      else if (action === 'entry-tab' && VIEWS.includes(control.dataset.view)) session.view = control.dataset.view;
      else if (action === 'entry-open-item') {
        const copy = selectedCopy(); if (!copy.items.some(item => item.localTaskId === control.dataset.id)) return;
        session.openItemId = control.dataset.id;
      } else if (action === 'entry-calendar-shift' && ['-1', '1'].includes(control.dataset.delta)) {
        session.baseDate = deps.shiftMonth(session.baseDate, Number(control.dataset.delta));
      } else if (action === 'entry-calendar-select' && /^\d{4}-\d{2}-\d{2}$/.test(control.dataset.date)) session.selectedDate = control.dataset.date;
      else if (action === 'entry-more-occurrences') session.page = Math.min(130, session.page + 1);
      else if (action === 'entry-workspace') { beginVisit(); return; }
      else return;
      render();
      const target = action === 'entry-open-item' ? host.querySelector('[data-testid="personal-entry-item-detail"] h3')
        : action === 'entry-workspace' ? host.querySelector('[data-testid="personal-entry-workspace"] h2')
        : action === 'entry-tab' ? host.querySelector('[data-action="entry-tab"][data-view="' + session.view + '"]')
        : action === 'entry-owner' ? host.querySelector('[data-action="entry-owner"][data-owner="' + session.owner + '"]') : host.querySelector('[data-action="' + action + '"]');
      focus(target);
    }
    document.addEventListener('click', click, true);
    document.addEventListener('submit', event => {
      if (!session) return;
      if (session.visit) { if (!visitEventAllowed(event)) { event.preventDefault(); event.stopImmediatePropagation(); } return; }
      event.preventDefault(); event.stopImmediatePropagation();
      if (session.composing || session.authorHistoryReturning || session.authorAttempt || !event.target.matches('[data-entry-search-form]') || !assertCurrent()) return;
      const raw = host.querySelector('#personal-entry-search').value;
      const resolved = deps.query(raw, session.read.packet);
      if (!resolved.ok) { invalidate('검색 내용을 확인하지 못했습니다. 입력과 저장값은 유지했습니다.'); return; }
      session.input = raw; session.resolution = resolved.resolution; session.stage = 'list'; render();
      focus(host.querySelector('#personal-entry-search'));
    }, true);
    document.addEventListener('input', event => {
      if (!session) return;
      if (session.visit) { if (!visitEventAllowed(event)) event.stopImmediatePropagation(); return; }
      if (!host.contains(event.target)) { event.stopImmediatePropagation(); return; }
      if (event.target.id === 'personal-entry-search') { session.input = event.target.value; updateAuthorButton(); }
      event.stopImmediatePropagation();
    }, true);
    document.addEventListener('keydown', event => {
      if (!session) return;
      intent += 1;
      if (session.visit) {
        if (!visitEventAllowed(event)) { event.preventDefault(); event.stopImmediatePropagation(); return; }
        if (event.key === 'Escape' && !event.isComposing && event.keyCode !== 229) {
          event.preventDefault(); event.stopImmediatePropagation(); requestVisitReturn('escape', false);
        }
        return;
      }
      if (session.authorHistoryReturning) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (session.composing || event.isComposing || event.keyCode === 229) { event.stopImmediatePropagation(); return; }
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); back(); return; }
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && event.target.id === 'personal-entry-search') {
        event.preventDefault(); event.stopImmediatePropagation(); event.target.form.requestSubmit(); return;
      }
      const tab = event.target.closest('[data-action="entry-tab"]');
      if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        const index = VIEWS.indexOf(tab.dataset.view);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? 3 : (index + (event.key === 'ArrowLeft' ? 3 : 1)) % 4;
        host.querySelector('[data-action="entry-tab"][data-view="' + VIEWS[next] + '"]').click(); return;
      }
      if (event.key === 'Tab') {
        const list = controls(), first = list[0], last = list[list.length - 1];
        if (event.shiftKey && (event.target === first || !host.contains(event.target))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (event.target === last || !host.contains(event.target))) { event.preventDefault(); first?.focus(); }
      }
      event.stopImmediatePropagation();
    }, true);
    for (const type of ['compositionstart', 'compositionend']) document.addEventListener(type, event => {
      if (session && session.visit) { if (!visitEventAllowed(event)) event.stopImmediatePropagation(); return; }
      if (!session || !host.contains(event.target)) return;
      session.composing = type === 'compositionstart'; updateAuthorButton(); event.stopImmediatePropagation();
    }, true);
    document.addEventListener('pointerdown', event => {
      if (!session) return;
      intent += 1;
      if (session.visit) { if (!visitEventAllowed(event)) { event.preventDefault(); event.stopImmediatePropagation(); } return; }
      if (!host.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    for (const type of ['beforeinput', 'change', 'dragstart', 'drop']) document.addEventListener(type, event => {
      if (session && session.visit) { if (!visitEventAllowed(event)) { event.preventDefault(); event.stopImmediatePropagation(); } return; }
      if (session && !host.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, true);
    window.addEventListener('popstate', event => {
      if (!session) return;
      if (session.visit) {
        event.stopImmediatePropagation();
        const visit = session.visit;
        if (visit.returning) { visit.returning = false; finishVisitReturn(visit); return; }
        if (deps.consumeVisitEditorHistory()) return;
        if (event.state?.[VISIT_HISTORY_KEY]?.id === visit.id) return;
        requestVisitReturn('browser-back', true);
        return;
      }
      if (session.authorHistoryReturning) {
        event.stopImmediatePropagation(); session.authorHistoryReturning = false;
        if (event.state && event.state[HISTORY_KEY]?.id === session.historyId && !event.state[HISTORY_KEY].confirm) {
          render(); focus(host.querySelector('[data-action="entry-author"]'));
        } else close(true);
        return;
      }
      if (session.authorAttempt) { event.stopImmediatePropagation(); cancelAuthoring(true); return; }
      if (session.invalid) { event.stopImmediatePropagation(); close(true); return; }
      if (event.state && event.state[HISTORY_KEY]?.id === session.historyId) return;
      event.stopImmediatePropagation(); close(true);
    });
    return Object.freeze({ active: current, readHostActive, visitActive, open, invalidate, check: assertCurrent });
  }
  root.FlowPocPersonalEntryUI = Object.freeze({ VERSION: 1, create });
})(typeof globalThis !== 'undefined' ? globalThis : this);
