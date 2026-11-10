/* Current runtime owner: lib/flow/integrated-poc/vendor/text-editor.cjs.
 * Initially adapted from v11 20707fa0/editor.js, then maintained here with
 * lib/flow/integrated-poc/text-input-plan.cjs. No historical app or storage adapter. */
/*
 * Static UX controller, adapted from PersonalWorkspacePocLiveEditor's native
 * textarea + presentation mirror pattern. This prototype's [date] syntax is
 * deliberately separate from the product parser. No storage is read or written.
 *
 * setValue loads a document; insert/replaceRange use browser-owned transactions.
 * There is no value-assignment fallback for an unsupported native command.
 */
const inputPlans = require('../text-input-plan.cjs');
const createImeEnterCycle = require('../ime-enter-cycle.cjs').create;
const resolveAddSettings = require('../text-add-settings.cjs').resolve;
let nextEditorId = 0;
module.exports = Object.freeze({ create: function (container, options) {
  const global = container && container.ownerDocument && container.ownerDocument.defaultView;
  if (!global) throw new TypeError('Text editor requires a mounted browser document.');
  'use strict';
  const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const TASK = /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\](\s+)(.*)$/;
  const EMPTY_TASK = /^(\s*)-\s+\[([ xX]|\d+(?:\.\d+)?%?)\]\s*$/;
  const PROPERTY = /^(?: {2,}|\t+)-\s+(?:날짜|메모|시간):/;
  const MAX_DEPTH = 32;
  const CHECK_KINDS = ['task', 'reference', 'subcheck'];

  function progressPercent(meta) {
    return meta && CHECK_KINDS.includes(meta.kind) && Number.isInteger(meta.progressPercent) && meta.progressPercent >= 0 && meta.progressPercent <= 100 ? meta.progressPercent : null;
  }

  function matchTask(line, meta, empty, actionsDisabled) {
    if (meta && !CHECK_KINDS.includes(meta.kind)) return null;
    const match = (empty ? EMPTY_TASK : TASK).exec(line);
    if (!match) return null;
    if (/^[ xX]$/.test(match[2])) return match;
    return !actionsDisabled && meta && CHECK_KINDS.includes(meta.kind) ? match : null;
  }

  // W12: the hint for an empty line ('/' opens the tool menu) or a bare list item ('- /' writes a folder line).
  function lineHintText(line) {
    if (/^[ \t]*$/.test(line)) return '/ 메뉴';
    return /^[ \t]*-[ \t]+$/.test(line) ? '/ 폴더' : '';
  }

  function indentation(line) {
    const prefix = /^[ \t]*/.exec(line)[0];
    return { prefix, columns: prefix.replace(/\t/g, '  ').length };
  }

  /** Visual A (11/7): 'today', 'yesterday' or 'tomorrow' for a `[YYYY-MM-DD]` head line, by this device's local day. */
  function relativeDay(line) {
    const bracket = /^\[(\d{4}-\d{2}-\d{2})\]$/.exec(line.trim());
    if (!bracket) return null;
    const now = new Date(), day = (offset) => {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      return `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`;
    };
    return bracket[1] === day(0) ? 'today' : bracket[1] === day(-1) ? 'yesterday' : bracket[1] === day(1) ? 'tomorrow' : null;
  }
  function dateLabel(line) {
    const trimmed = line.trim();
    const bracket = /^\[([^\[\]]+)\]$/.exec(trimmed);
    if (!bracket) return null;
    const value = bracket[1];
    if (value === '미정') return '날짜 미정';
    const match = DATE.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return `${month}월 ${day}일 (${['일', '월', '화', '수', '목', '금', '토'][date.getUTCDay()]})`;
  }

  // Match model.js parseDocument: nested space-indented fences; same marker;
  // closing run at least as long as the opener, followed by whitespace only.
  function protectedFenceLines(lines) {
    let fence = null;
    return lines.map((line) => {
      const match = /^ *(`{3,}|~{3,})(.*)$/.exec(line);
      if (fence) {
        if (match && match[1][0] === fence.mark && match[1].length >= fence.length && !match[2].trim()) fence = null;
        return true;
      }
      if (!match) return false;
      fence = { mark: match[1][0], length: match[1].length };
      return true;
    });
  }

  function create(container, options) {
    if (!(container instanceof global.HTMLElement)) throw new TypeError('TextLiveEditor container must be an element.');
    const config = options || {};
    const addSettings = resolveAddSettings(config);
    const doc = container.ownerDocument;
    const id = `text-live-editor-${++nextEditorId}`;
    const root = doc.createElement('div');
    root.className = 'tle-root';
    root.dataset.mode = 'live';
    const viewport = doc.createElement('div');
    viewport.className = 'tle-viewport';
    viewport.setAttribute('aria-hidden', 'true');
    const mirror = doc.createElement('div');
    mirror.className = 'tle-presentation';
    viewport.append(mirror);
    const textarea = doc.createElement('textarea');
    textarea.id = id;
    textarea.className = 'tle-textarea';
    textarea.setAttribute('aria-label', config.label || '문서 내용');
    textarea.setAttribute('autocapitalize', 'off');
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('spellcheck', 'false');
    textarea.wrap = 'soft';
    textarea.value = String(config.value == null ? '' : config.value);
    const controls = doc.createElement('div');
    controls.className = 'tle-controls';
    const plus = doc.createElement('button');
    plus.type = 'button';
    plus.className = 'tle-plus';
    plus.textContent = '+';
    plus.setAttribute('aria-label', '현재 줄에 내용 추가');
    const rowMenu = doc.createElement('button');
    rowMenu.type = 'button';
    rowMenu.className = 'tle-row-menu';
    rowMenu.textContent = '⋮';
    rowMenu.setAttribute('aria-label', '현재 줄 메뉴');
    controls.append(plus, rowMenu);
    const moveLayer = doc.createElement('div');
    moveLayer.className = 'tle-move-overlay';
    moveLayer.setAttribute('aria-hidden', 'true');
    const dropLine = doc.createElement('div');
    dropLine.className = 'tle-move-drop';
    dropLine.setAttribute('aria-hidden', 'true');
    const dropLabel = doc.createElement('span');
    dropLabel.className = 'tle-move-drop-label';
    dropLine.append(dropLabel);
    dropLine.hidden = true;
    moveLayer.append(dropLine);
    const characterMetric = doc.createElement('span');
    characterMetric.className = 'tle-character-metric';
    characterMetric.textContent = '0';
    characterMetric.setAttribute('aria-hidden', 'true');
    const moveStatus = doc.createElement('span');
    moveStatus.className = 'tle-move-status';
    moveStatus.setAttribute('role', 'status');
    moveStatus.setAttribute('aria-live', 'polite');
    const nativeRuler = doc.createElement('div');
    nativeRuler.className = 'tle-native-ruler'; nativeRuler.setAttribute('aria-hidden', 'true');
    root.append(viewport, textarea, nativeRuler, characterMetric);
    if (config.controls !== false) root.append(controls, moveLayer, moveStatus);
    container.append(root);

    let mode = 'live';
    let composing = false;
    let compositionAnchor = 0;
    let nativePaintRaw = '', nativePaintRows = [], nativePaintRange = null;
    function syncNativePaint(reconciled = false) {
      const active = mode === 'live' && !foldedIds.size && (doc.activeElement === textarea || composing || root.classList.contains('tle-native-input') && renderedValue !== textarea.value);
      if (!active) { root.classList.remove('tle-native-input'); nativePaintRange = null; return; }
      const raw = textarea.value, lines = raw.split('\n');
      if (nativePaintRaw !== raw || !nativePaintRows.length) {
        const old = nativePaintRaw; let start = 0;
        while (start < old.length && start < raw.length && old[start] === raw[start]) start++;
        let oldEnd = old.length, nextEnd = raw.length;
        while (oldEnd > start && nextEnd > start && old[oldEnd - 1] === raw[nextEnd - 1]) { oldEnd--; nextEnd--; }
        const first = raw.slice(0, start).split('\n').length - 1;
        // A wrap/LF change can shift every later mirror row. Until that mirror
        // reconciles, native RAW owns the whole visible suffix, not stale glyphs.
        const last = Infinity;
        nativePaintRange = nativePaintRange ? {first:Math.min(first,nativePaintRange.first),last:Math.max(last,nativePaintRange.last)} : {first,last};
        if (nativePaintRows.length !== lines.length) {
          nativePaintRows = lines.map(line => { const row = doc.createElement('div'); row.className = 'tle-native-line'; row.textContent = line || '\u200b'; return row; });
          nativeRuler.replaceChildren(...nativePaintRows);
        } else lines.forEach((line,i) => { const text=line||'\u200b';if(nativePaintRows[i].textContent!==text)nativePaintRows[i].textContent=text; });
        nativePaintRaw = raw;
      }
      if (reconciled) nativePaintRange = null;
      const firstOffset = composing ? Math.min(compositionAnchor,textarea.selectionStart) : textarea.selectionStart;
      const lastOffset = composing ? Math.max(compositionAnchor,textarea.selectionEnd) : Math.max(firstOffset,textarea.selectionEnd-1);
      const first = Math.min(raw.slice(0,firstOffset).split('\n').length-1,nativePaintRange?.first??Infinity);
      const last = Math.max(raw.slice(0,lastOffset).split('\n').length-1,nativePaintRange?.last??-1);
      const a=nativePaintRows[Math.max(0,Math.min(lines.length-1,first))],b=nativePaintRows[Math.max(0,Math.min(lines.length-1,last))];
      nativeRuler.style.width = `${textarea.clientWidth}px`;
      const top=a.offsetTop-textarea.scrollTop,bottom=nativePaintRange?textarea.clientHeight:b.offsetTop+b.offsetHeight-textarea.scrollTop;
      root.style.setProperty('--tle-native-top',`${top}px`);root.style.setProperty('--tle-native-bottom',`${bottom}px`);
      root.classList.add('tle-native-input');
    }
    let destroyed = false;
    let nativeDepth = 0;
    let pendingChange = false;
    let nextTabLeaves = false;
    let lastPickerCandidate = null;
    let renderFrame = 0;
    let pendingBlurReveal = null;
    let pointerInsideEditorControl = false;
    let lastReported = textarea.value;
    let selection = { start: 0, end: 0, direction: 'none' };
    let rows = [];
    let readingView = false;
    let renderedValue = null;
    // Display-only, one completed render and one native input. Not model authority.
    let completedRowRender = null;
    let plainInputOrigin = null;
    let pendingPlainInput = null;
    let plainInputSerial = 0;
    let plainRenderSerial = 0;
    let readingPointerAt = null;
    let checkButtons = [];
    let rowButtons = [];
    let moveState = null;
    let gesture = null;
    let dragFrame = 0;
    let deferredGestureRender = false;
    let blockedClick = null;
    let targetEntries = [];
    const targetChoices = new Map();
    let previewBoundary = null;
    let characterWidth = 10;
    let textOriginX = 0;
    let textPaddingLeft = 14;
    const foldedIds = new Set();
    let foldButtons = [];
    let hiddenRows = new Set();
    let viewportTransitionUntil = 0;
    const activePointers = new Set();
    const listeners = [];

    function listen(target, type, handler, settings) {
      target.addEventListener(type, handler, settings);
      listeners.push(() => target.removeEventListener(type, handler, settings));
    }
    function remember() {
      const next = { start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection || 'none' };
      if (indentLease && (next.start !== indentLease.selection.start || next.end !== indentLease.selection.end || next.direction !== indentLease.selection.direction)) indentLease = null;
      selection = next;
      return selection;
    }
    function lineAt(offset) {
      return textarea.value.slice(0, Math.max(0, offset)).split('\n').length - 1;
    }
    function rangeOfLine(index) {
      const lines = textarea.value.split('\n');
      const safeIndex = Math.max(0, Math.min(lines.length - 1, Math.trunc(index)));
      let start = 0;
      for (let i = 0; i < safeIndex; i += 1) start += lines[i].length + 1;
      return { start, end: start + lines[safeIndex].length, index: safeIndex, text: lines[safeIndex] };
    }
    let inputEpoch = 0;
    const imeEnterCycle = createImeEnterCycle(() => ({ raw: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd,
      direction: textarea.selectionDirection, epoch: inputEpoch, focused: doc.activeElement === textarea, editable: !destroyed && !textarea.readOnly && !textarea.disabled }));
    let indentLease = null;
    let inputRejected = false;
    let pasteSource = null;
    function publish(inputType, inputSplice, deferRender = false, taskSplit) {
      if (destroyed) return;
      remember();
      const valueChanged = textarea.value !== lastReported;
      if (valueChanged) {
        lastReported = textarea.value;
        if (typeof config.onChange === 'function') config.onChange(lastReported, { inputType, inputSplice, ...(taskSplit ? { taskSplit } : {}) });
      }
      // Publish input and protection/save state now; coalesce only its display.
      // Native commands and IME mask transitions still need synchronous rows.
      if (deferRender) scheduleRender(); else render();
      // An unchanged composition end or replay is not a new insertion.
      maybeRequestPicker(valueChanged ? inputType : undefined);
    }
    let viewportRevealPending = false;
    let viewportCaretOwned = true;
    let viewportScreenRevealPending = false;
    let missedViewportShrink = null;
    let clickViewportReveal = null;
    let lastViewportHeight = viewportHeight();
    function viewportHeight() {
      return Math.min(global.innerHeight, global.visualViewport ? global.visualViewport.height : global.innerHeight);
    }
    function cancelClickViewportReveal() {
      missedViewportShrink = null;
      clickViewportReveal = null;
    }
    function isCurrentClickViewportReveal(request) {
      return Boolean(request && !destroyed && viewportCaretOwned && !composing && !gesture && !moveState && !activePointers.size && !foldedIds.size && !readingView &&
        doc.activeElement === textarea && !textarea.readOnly && !textarea.disabled && request.epoch === inputEpoch && request.raw === textarea.value &&
        textarea.selectionStart === textarea.selectionEnd && request.start === textarea.selectionStart && request.end === textarea.selectionEnd &&
        request.direction === (textarea.selectionDirection || 'none') && viewportHeight() <= request.height);
    }
    function queueClickViewportReveal() {
      const missed = missedViewportShrink;
      cancelClickViewportReveal();
      if (!missed || missed.epoch !== inputEpoch || missed.raw !== textarea.value || viewportHeight() > missed.height) return;
      const request = { epoch: inputEpoch, raw: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd,
        direction: textarea.selectionDirection || 'none', height: viewportHeight() };
      if (isCurrentClickViewportReveal(request)) clickViewportReveal = request;
    }
    function scheduleViewportRender() {
      const height = viewportHeight();
      if (height > lastViewportHeight) cancelClickViewportReveal();
      if (height < lastViewportHeight && !viewportCaretOwned && !destroyed && !composing && doc.activeElement === textarea) {
        missedViewportShrink = { epoch: inputEpoch, raw: textarea.value, height };
      }
      if (height < lastViewportHeight && viewportCaretOwned && doc.activeElement === textarea) viewportScreenRevealPending = true;
      else if (height > lastViewportHeight || !viewportCaretOwned) viewportScreenRevealPending = false;
      lastViewportHeight = height;
      viewportRevealPending = viewportCaretOwned;
      scheduleRender();
    }
    function scheduleRender() {
      if (renderFrame || destroyed) return;
      renderFrame = global.requestAnimationFrame(() => {
        renderFrame = 0;
        if (destroyed) return;
        // A host microtask can restore history selection before selectionchange.
        remember(); render(); revealBlurredProgress(); revealEndCaret();
        const clickReveal = isCurrentClickViewportReveal(clickViewportReveal);
        clickViewportReveal = null;
        const screenReveal = viewportScreenRevealPending || clickReveal;
        if (!composing || !viewportCaretOwned || doc.activeElement !== textarea) viewportScreenRevealPending = false;
        if (viewportRevealPending || clickReveal) { viewportRevealPending = false; if (viewportCaretOwned && !composing && !gesture && !moveState) revealFocusedCaret(screenReveal); }
      });
    }
    function captureBlurReveal(event) {
      pendingBlurReveal = null;
      // Do not move another control under a pointer or keyboard focus handoff.
      if ((event && event.relatedTarget && root.contains(event.relatedTarget)) || (activePointers.size && pointerInsideEditorControl)) return;
      if (destroyed || mode !== 'live' || composing || gesture || moveState || foldedIds.size || selection.start !== selection.end) return;
      pendingBlurReveal = {
        value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd,
        direction: textarea.selectionDirection, top: textarea.scrollTop, left: textarea.scrollLeft,
        height: textarea.clientHeight, width: textarea.clientWidth, index: lineAt(selection.start),
      };
    }
    function revealBlurredProgress() {
      const pending = pendingBlurReveal;
      pendingBlurReveal = null; // Consume once; refresh and manual scrolling must never pull the row back.
      if (!pending || destroyed || mode !== 'live' || composing || gesture || moveState || foldedIds.size || doc.activeElement === textarea) return;
      if (textarea.value !== pending.value || textarea.selectionStart !== pending.start || textarea.selectionEnd !== pending.end || textarea.selectionDirection !== pending.direction ||
          textarea.scrollTop !== pending.top || textarea.scrollLeft !== pending.left || textarea.clientHeight !== pending.height || textarea.clientWidth !== pending.width) return;
      const entry = checkButtons.find(({ button }) => Number(button.dataset.lineIndex) === pending.index && button.classList.contains('tle-progress-hit'));
      if (!entry || entry.row.hidden || entry.row.offsetHeight > 44 || pending.height < 44) return;
      const surface = scrollSurface();
      const top = entry.row.offsetTop - surface.scrollTop;
      // Only the partly visible 44px control, not a distant or wrapped caret row.
      if (top >= pending.height || top + 44 <= 0 || (top >= 0 && top + 44 <= pending.height)) return;
      surface.scrollTop = Math.max(0, surface.scrollTop + (top < 0 ? top : top + 44 - pending.height));
      syncGeometry();
    }
    let pendingEndCaretReveal = null;
    function nativeLineHeight() { return parseFloat(global.getComputedStyle?.(textarea).lineHeight) || 44; }
    function captureEndCaretReveal(event) {
      // Ctrl+End releases End before Control. Modifier release is not a new
      // caret intent; keep the pending snapshot for the same animation frame.
      if (event && ['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) return;
      pendingEndCaretReveal = null;
      // End's native default owns the caret and its initial scroll. A native
      // glyph can be visible while the bottom of its 44px mirror line is not.
      if (!event || event.key !== 'End' || event.defaultPrevented || event.isComposing || event.keyCode === 229 ||
          destroyed || composing || gesture || moveState || foldedIds.size || doc.activeElement !== textarea ||
          textarea.selectionStart !== textarea.value.length || textarea.selectionEnd !== textarea.value.length ||
          textarea.clientHeight < 44 || !textarea.getClientRects().length) return;
      pendingEndCaretReveal = {
        value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd,
        direction: textarea.selectionDirection, top: textarea.scrollTop, left: textarea.scrollLeft,
        height: textarea.clientHeight, width: textarea.clientWidth, mode, epoch: inputEpoch,
      };
    }
    function revealEndCaret() {
      const pending = pendingEndCaretReveal;
      pendingEndCaretReveal = null;
      if (!pending || destroyed || composing || gesture || moveState || foldedIds.size || doc.activeElement !== textarea ||
          mode !== pending.mode || inputEpoch !== pending.epoch || !textarea.getClientRects().length ||
          textarea.value !== pending.value || textarea.selectionStart !== pending.start || textarea.selectionEnd !== pending.end ||
          textarea.selectionDirection !== pending.direction || textarea.scrollTop !== pending.top || textarea.scrollLeft !== pending.left ||
          textarea.clientHeight !== pending.height || textarea.clientWidth !== pending.width) return;
      const row = rows[lineAt(pending.end)];
      const lineHeight = nativeLineHeight();
      if (!row || row.hidden || row.offsetHeight < lineHeight || row.offsetHeight % lineHeight !== 0 || row.offsetHeight > pending.height) return;
      const top = row.offsetTop - pending.top;
      const finalVisualTop = top + row.offsetHeight - lineHeight;
      // End already exposed the final native glyph. Correct only the missing
      // bottom of its visual line, including a wrapped row that fits entirely.
      // Never pull a distant/oversized row into view or change input/history.
      if (top < 0 || finalVisualTop >= pending.height || top + row.offsetHeight <= pending.height) return;
      textarea.scrollTop = pending.top + top + row.offsetHeight - pending.height;
      syncGeometry();
    }
    function makeSpan(className, content) {
      const span = doc.createElement('span');
      span.className = className;
      span.textContent = content;
      return span;
    }
    function scheduledDateLabel(value) {
      if (value === '미정') return '미정';
      const match = /^(\d{2})\.(\d{2})$/.exec(value);
      return match ? `${Number(match[1])}월 ${Number(match[2])}일` : value;
    }
    // W3: a time property reads like the date one ('시간 오전 9:00'); invalid text stays literal.
    function timeLabel(value) {
      const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
      if (!match) return null;
      const hour = Number(match[1]);
      return `시간 ${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}:${match[2]}`;
    }
    function ownedPropertyLabel(line, meta, metadata, index) {
      if (!meta || meta.kind !== 'property' || !Number.isInteger(meta.depth) || meta.depth < 1) return null;
      const property = /^ *-\s+(날짜|시간):\s*(.*)$/.exec(line);
      if (!property) return null;
      // Only decorate a property with a real checkbox parent. Orphan/invalid
      // text stays literal; presentation must not imply a new scheduled Item.
      for (let parent = index - 1; parent >= 0; parent -= 1) {
        const ancestor = metadata[parent];
        if (!ancestor) return null;
        if (ancestor.kind === 'blank' || ancestor.depth >= meta.depth) continue;
        if (ancestor.depth !== meta.depth - 1 || !CHECK_KINDS.includes(ancestor.kind)) return null;
        if (property[1] === '시간') return timeLabel(property[2].trim());
        const label = dateLabel(`[${property[2].trim()}]`);
        return label ? `예정일 ${label === '날짜 미정' ? '미정' : label}` : null;
      }
      return null;
    }
    function paintActiveSyntax(row, line, task, meta, memoOwned) {
      const scope = meta && meta.kind === 'scope' && ['folder', 'flow'].includes(meta.scopeKind)
        ? /^([ \t]*-\s+)(.*)$/.exec(line) : null;
      // memo-enter (11/10, UX): the caret's own memo line keeps the memo's rail where the other memo lines have it, its
      // '- 메모:' muted over its RAW advances and the words being written in ink, so it reads as one more memo line.
      const memo = !task && !scope && memoOwned ? /^([ \t]+-\s+메모:\s?)(.*)$/.exec(line) : null;
      if (!task && !scope && !memo) return;
      // The first Text node remains the unchanged RAW ruler used by textarea
      // wrapping and caret Range measurements. Only its paint is replaced.
      // This layer repeats the exact character advances; it is never editable.
      row.classList.add('tle-line-active-paint');
      const paint = makeSpan('tle-active-paint', '');
      if (memo) { paint.append(makeSpan('tle-active-memo-syntax', memo[1]), makeSpan('tle-active-memo-text', memo[2])); row.append(paint); return; }
      // W4: a folder line's '/' joins the transparent syntax; it keeps its RAW advance.
      const title = task ? task[4] : scope[2].replace(/^\//, '');
      const prefix = line.slice(0, line.length - title.length);
      paint.append(makeSpan('tle-active-syntax', prefix));
      if (task) {
        const progress = progressPercent(meta);
        const complete = progress !== null ? progress === 100 : task[2].toLowerCase() === 'x';
        paint.append(makeSpan(complete ? 'tle-task-title-complete' : 'tle-task-title', title));
        const anchor = makeSpan('tle-check-anchor', '');
        const glyph = makeSpan('tle-check-glyph', complete ? '✓' : '');
        glyph.dataset.checked = String(complete);
        anchor.append(glyph);
        if (progress > 0 && progress < 100) {
          glyph.classList.add('tle-progress-anchor');
          anchor.append(makeSpan('tle-active-progress tle-progress-badge', `${progress}%`));
        }
        paint.append(anchor);
      } else {
        // The read-view label has an 88px inset. Editing retains the raw '- '
        // inset instead, and displays an inert icon inside that syntax space.
        paint.append(makeSpan('tle-active-scope-name', title));
        const anchor = makeSpan('tle-active-scope-icon', '');
        anchor.append(icon(meta.scopeKind));
        paint.append(anchor);
      }
      row.append(paint);
    }
    function propertyCheckOwner(index, metadata) {
      const meta = metadata[index];
      if (!meta || meta.kind !== 'property' || !Number.isInteger(meta.depth)) return null;
      for (let parent = index - 1; parent >= 0; parent--) {
        const ancestor = metadata[parent];
        if (!ancestor) return null;
        if (ancestor.kind === 'blank' || ancestor.depth >= meta.depth) continue;
        return ancestor.depth === meta.depth - 1 && CHECK_KINDS.includes(ancestor.kind) ? parent : null;
      }
      return null;
    }
    // W4: a task whose own date line follows it shows the date there, once; no 예정일 chip on the task row.
    function ownsDateLine(index, lines, metadata) {
      for (let child = index + 1; child < lines.length && propertyCheckOwner(child, metadata) === index; child += 1) {
        if (/^[ \t]+-\s+날짜:/.test(lines[child])) return true;
      }
      return false;
    }
    function scrollSurface() { return readingView || foldedIds.size ? viewport : textarea; }
    function viewAnchor() {
      const surface = scrollSurface();
      const row = rows.find((item) => !item.hidden && item.offsetTop + item.offsetHeight > surface.scrollTop);
      return row ? { index: Number(row.dataset.lineIndex), y: row.offsetTop - surface.scrollTop } : null;
    }
    function restoreViewAnchor(anchor) {
      const row = anchor && rows[anchor.index];
      if (row && !row.hidden) scrollSurface().scrollTop = Math.max(0, row.offsetTop - anchor.y);
    }
    function pointRange(node, offset) {
      const range = doc.createRange();
      range.setStart(node, offset); range.collapse(true);
      return range;
    }
    // Copy the selected source, not the reading view's labels/layout line breaks.
    // Native textarea copying remains browser-owned, including partial selections.
    function presentationCopyPoint(node, offset, first, wholeRow) {
      if (node === mirror && Number.isInteger(offset) && offset >= 0 && offset <= rows.length) {
        return offset === rows.length ? textarea.value.length : rangeOfLine(offset).start;
      }
      const element = node.nodeType === 3 ? node.parentElement : node;
      const row = element && element.closest('.tle-line');
      if (!row || row.hidden || !mirror.contains(row)) return null;
      const line = rangeOfLine(Number(row.dataset.lineIndex));
      if (node === row) {
        if (offset === 0) return line.start;
        // Appended buttons are not source. A range ending immediately before
        // that decorative tail still ends at the unchanged source row end.
        if (Number.isInteger(offset) && offset > 0 && offset <= row.childNodes.length &&
            Array.from(row.childNodes).slice(offset).every((child) => child.nodeType === 1 &&
              ['tle-row-control', 'tle-indent-guide', 'tle-fold-anchor', 'tle-check-anchor'].some((name) => child.classList.contains(name)))) return line.end;
      }
      const span = element.closest('.tle-scope-name, .tle-task-title, .tle-task-title-complete, .tle-hidden-syntax, .tle-date-label, .tle-date-source');
      const source = span || row;
      const range = doc.createRange(); range.selectNodeContents(source); range.setEnd(node, offset);
      const local = range.toString().length, visible = source.textContent;
      let relative = local;
      if (span && span.classList.contains('tle-scope-name')) {
        const title = line.text.replace(/^\s*-\s*/, '');
        if (local === 0 && first && wholeRow) relative = 0;
        else if (local === visible.length && !first) relative = line.text.length;
        else if (title === visible) relative = line.text.length - title.length + local;
        else return null;
      } else if (span && (span.classList.contains('tle-task-title') || span.classList.contains('tle-task-title-complete'))) {
        relative = local === 0 && first && wholeRow ? 0 : Number(row.dataset.taskPrefixLength) + local;
      } else if (span && span.classList.contains('tle-date-label')) {
        if (local === 0 && first) relative = 0;
        else if (local === visible.length && !first) relative = line.text.length;
        else return null;
      } else if (!span && row.textContent !== (line.text || '\u200b')) return null;
      return line.start + Math.min(line.text.length, relative);
    }
    function copyPresentation(event) {
      if (event.defaultPrevented || !event.clipboardData || !readingView || composing || foldedIds.size || gesture || moveState ||
          doc.activeElement === textarea || textarea.value !== renderedValue) return;
      const selected = global.getSelection();
      if (!selected || selected.rangeCount !== 1 || selected.isCollapsed || !mirror.contains(selected.anchorNode) || !mirror.contains(selected.focusNode)) return;
      const range = selected.getRangeAt(0);
      const end = presentationCopyPoint(range.endContainer, range.endOffset, false);
      const startElement = range.startContainer.nodeType === 3 ? range.startContainer.parentElement : range.startContainer;
      const startRow = startElement && startElement.closest('.tle-line');
      const wholeRow = startRow && end !== null && end >= rangeOfLine(Number(startRow.dataset.lineIndex)).end;
      const start = presentationCopyPoint(range.startContainer, range.startOffset, true, wholeRow);
      if (start === null || end === null || end <= start) return;
      event.clipboardData.setData('text/plain', textarea.value.slice(start, end));
      event.preventDefault();
    }
    function revealFocusedCaret(screenReveal = false) {
      if (foldedIds.size || doc.activeElement !== textarea) return;
      const offset = selection.direction === 'backward' ? selection.start : selection.end;
      const line = rangeOfLine(lineAt(offset));
      const row = rows[line.index];
      if (!row || !row.firstChild || row.firstChild.nodeType !== 3) return;
      if (screenReveal) { revealCaretInViewport(row, offset - line.start); return; }
      const caret = pointRange(row.firstChild, offset - line.start).getBoundingClientRect();
      const box = textarea.getBoundingClientRect();
      const delta = caret.top < box.top ? caret.top - box.top : Math.max(0, caret.bottom - box.top - textarea.clientHeight);
      if (delta) { textarea.scrollTop = Math.max(0, textarea.scrollTop + delta); syncGeometry(); }
    }
    function revealCaretInViewport(row, offset) {
      if (destroyed || !viewportCaretOwned || composing || gesture || moveState || activePointers.size || foldedIds.size || readingView || doc.activeElement !== textarea || !root.getClientRects().length || !textarea.getClientRects().length) return;
      const visual = global.visualViewport;
      const top = Math.max(0, visual ? visual.offsetTop : 0);
      const bottom = Math.min(global.innerHeight, visual ? visual.offsetTop + visual.height : global.innerHeight);
      if (!Number.isFinite(top) || !Number.isFinite(bottom) || bottom <= top) return;
      const readCaret = () => {
        const rect = pointRange(row.firstChild, Math.max(0, Math.min(row.firstChild.length, offset))).getBoundingClientRect();
        const height = nativeLineHeight();
        const caretTop = rect.height > 0 ? rect.top - Math.max(0, (height - rect.height) / 2) : row.getBoundingClientRect().top;
        return { top: caretTop, bottom: caretTop + Math.max(rect.height, height) };
      };
      const clientBounds = (element) => {
        const box = element.getBoundingClientRect(), start = box.top + (element.clientTop || 0);
        return { top: start, bottom: start + element.clientHeight };
      };
      const visibleBounds = (element) => {
        const own = clientBounds(element);
        let start = Math.max(top, own.top), end = Math.min(bottom, own.bottom);
        for (let parent = element.parentElement; parent && parent !== doc.scrollingElement; parent = parent.parentElement) {
          if (!/^(auto|scroll|hidden|clip)$/.test(global.getComputedStyle(parent).overflowY)) continue;
          const box = clientBounds(parent);
          start = Math.max(start, box.top); end = Math.min(end, box.bottom);
        }
        // An offscreen container must first expose the line inside its own box.
        return end > start ? { top: start, bottom: end } : own;
      };
      const deltaFor = (bounds) => {
        const caret = readCaret();
        return caret.top < bounds.top ? caret.top - bounds.top : Math.max(0, caret.bottom - bounds.bottom);
      };
      let delta = deltaFor(visibleBounds(textarea));
      if (delta) {
        const before = textarea.scrollTop;
        textarea.scrollTop = Math.max(0, before + delta);
        if (textarea.scrollTop !== before) syncGeometry();
      }
      for (let element = root.parentElement; element && element !== doc.scrollingElement; element = element.parentElement) {
        if (!/^(auto|scroll)$/.test(global.getComputedStyle(element).overflowY) || element.scrollHeight <= element.clientHeight) continue;
        delta = deltaFor(visibleBounds(element));
        if (delta) element.scrollTop = Math.max(0, element.scrollTop + delta);
      }
      delta = deltaFor({ top, bottom });
      if (delta) global.scrollBy(0, delta);
    }
    // W3 paint wraps RAW text in spans: a tap inside one maps back to its source offset. A memo's marker and
    // note follow the source exactly; a heading's title is the line's suffix; a property label ('시간 오전 9:00',
    // '예정일 10월 31일 (토)') maps its name onto the source key and the rest proportionally onto the value.
    function paintedSourceOffset(span, text, at) {
      if (!span) return null;
      if (span.classList.contains('tle-memo-syntax')) return at;
      // U45 folder rows: the RAW line under a folder's drawn name is the source itself.
      if (span.classList.contains('tle-date-source')) return at;
      if (span.classList.contains('tle-memo-text')) return (span.previousSibling ? span.previousSibling.textContent.length : 0) + at;
      if (span.classList.contains('tle-heading-label')) return text.length - span.textContent.length + at;
      if (span.classList.contains('tle-property-date-label')) {
        const source = /^( *-\s+)(날짜|시간)(:\s*)(.*)$/.exec(text), label = span.textContent, name = label.indexOf(' ');
        if (!source || name < 0) return null;
        if (at <= name) return source[1].length + Math.min(at, source[2].length);
        const value = source[1].length + source[2].length + source[3].length, shown = Math.max(1, label.length - name - 1);
        return value + Math.round(Math.min(1, (at - name - 1) / shown) * source[4].length);
      }
      return null;
    }
    function editReadingPoint(event) {
      // A completed tap enters the unchanged native buffer. Touch scrolling and
      // selecting displayed text must not focus the editor on pointerdown.
      const pointerAt = readingPointerAt;
      readingPointerAt = null;
      if (!readingView || foldedIds.size || composing || gesture || moveState || event.defaultPrevented ||
          (pointerAt !== null && event.timeStamp - pointerAt >= 450)) return;
      const visibleSelection = global.getSelection();
      if (visibleSelection && !visibleSelection.isCollapsed) return;
      const row = event.target.closest('.tle-line');
      // P3 (11/6): an empty document is one short line under a two-line hint; a press anywhere on it starts writing.
      if (!row && textarea.value === '' && viewport.contains(event.target)) {
        event.preventDefault();
        textarea.setSelectionRange(0, 0);
        remember();
        textarea.focus({ preventScroll: true });
        render();
        return;
      }
      if (!row || row.hidden || !mirror.contains(row)) return;
      const line = rangeOfLine(Number(row.dataset.lineIndex));
      const title = row.querySelector('.tle-task-title, .tle-task-title-complete');
      const point = typeof doc.caretPositionFromPoint === 'function' ? doc.caretPositionFromPoint(event.clientX, event.clientY) : null;
      const hit = point ? pointRange(point.offsetNode, point.offset) : typeof doc.caretRangeFromPoint === 'function' ? doc.caretRangeFromPoint(event.clientX, event.clientY) : null;
      let offset = line.end;
      let screenTop = null;
      const node = hit && hit.startContainer;
      const painted = node && node.nodeType === 3 && !title && node !== row.firstChild && row.contains(node)
        ? paintedSourceOffset(node.parentElement, line.text, hit.startOffset) : null;
      if (node && node.nodeType === 3 && (title ? title.contains(node) : node === row.firstChild)) {
        const prefix = title ? Number(row.dataset.taskPrefixLength) : 0;
        offset = line.start + prefix + hit.startOffset;
        screenTop = hit.getBoundingClientRect().top;
      } else if (painted !== null) {
        offset = line.start + Math.max(0, Math.min(line.text.length, painted));
        screenTop = hit.getBoundingClientRect().top;
      }
      event.preventDefault();
      textarea.setSelectionRange(offset, offset);
      remember();
      textarea.focus({ preventScroll: true });
      render();
      // The title can wrap into a different visual line while editing. Keep the
      // tapped character at its previous screen height without rewriting RAW.
      const nativeRow = rows[line.index];
      if (screenTop !== null && nativeRow && nativeRow.firstChild && nativeRow.firstChild.nodeType === 3) {
        const caret = pointRange(nativeRow.firstChild, offset - line.start);
        textarea.scrollTop += caret.getBoundingClientRect().top - screenTop;
        syncGeometry();
      }
    }
    function applyFoldView() {
      const folded = foldedIds.size > 0;
      root.classList.toggle('tle-folded-view', folded);
      textarea.tabIndex = folded ? -1 : 0;
      textarea.toggleAttribute('inert', folded);
      if (folded) textarea.setAttribute('aria-hidden', 'true'); else textarea.removeAttribute('aria-hidden');
      viewport.setAttribute('aria-hidden', folded ? 'false' : 'true');
    }
    function unfoldAll() {
      if (!foldedIds.size) return true;
      foldedIds.clear();
      hiddenRows.clear();
      applyFoldView();
      render();
      return true;
    }
    function prepareAction(lineIndex) {
      invalidatePlainRowInput();
      if (destroyed || composing) return false;
      remember();
      if (Number.isInteger(lineIndex) && rows[lineIndex] && lineAt(selection.start) !== lineIndex) {
        const line = rangeOfLine(lineIndex);
        textarea.setSelectionRange(line.end, line.end);
        remember();
      }
      const focused = doc.activeElement;
      if (focused && (focused.matches('input,textarea') || focused.isContentEditable)) focused.blur();
      render();
      return true;
    }
    function prepareMove(lineIndex) {
      if (destroyed || composing || !Number.isInteger(lineIndex) || !rows[lineIndex]) return false;
      viewportTransitionUntil = Date.now() + 1200;
      if (!prepareAction(lineIndex)) return false;
      unfoldAll();
      return true;
    }
    function isFolded(lineIndex) {
      const meta = getRowMeta()[lineIndex];
      return Boolean(meta && typeof meta.id === 'string' && foldedIds.has(meta.id));
    }
    function toggleFold(lineIndex) {
      invalidatePlainRowInput();
      if (destroyed || composing || !Number.isInteger(lineIndex)) return false;
      const meta = getRowMeta()[lineIndex];
      if (!meta || meta.kind !== 'scope' || typeof meta.id !== 'string' || !Number.isInteger(meta.subtreeEndIndex) || meta.subtreeEndIndex <= lineIndex + 1 || meta.subtreeEndIndex > rows.length) return false;
      if (gesture || moveState) cancelMove(true);
      prepareAction(lineIndex);
      if (foldedIds.has(meta.id)) foldedIds.delete(meta.id); else foldedIds.add(meta.id);
      applyFoldView();
      render();
      const row = rows[lineIndex];
      const surface = scrollSurface();
      if (row && (row.offsetTop < surface.scrollTop || row.offsetTop + 44 > surface.scrollTop + surface.clientHeight)) surface.scrollTop = Math.max(0, row.offsetTop - 44);
      syncGeometry();
      return true;
    }
    function action(kind, lineIndex, details) {
      if (composing || destroyed || (kind === 'toggle' && typeof config.isCheckDisabled === 'function'
        ? config.isCheckDisabled(lineIndex) : typeof config.isActionDisabled === 'function' && config.isActionDisabled())) return false;
      const current = remember();
      if (typeof config.onAction === 'function') return config.onAction({
        type: kind,
        kind,
        lineIndex,
        lineText: rangeOfLine(lineIndex).text,
        value: textarea.value,
        selection: { start: current.start, end: current.end, direction: current.direction, selectionStart: current.start, selectionEnd: current.end, lineIndex: lineAt(current.start) },
        selectionStart: current.start,
        selectionEnd: current.end,
        ...details,
      });
      return false;
    }

    function finishGesture() {
      const previous = gesture;
      gesture = null;
      if (previous && previous.timer) global.clearTimeout(previous.timer);
      if (dragFrame) global.cancelAnimationFrame(dragFrame);
      dragFrame = 0;
      delete root.dataset.movePhase;
      dropLine.hidden = true;
      if (previous) {
        try { if (root.hasPointerCapture(previous.pointerId)) root.releasePointerCapture(previous.pointerId); } catch (_) { /* A cancelled pointer may already be released. */ }
      }
      syncMoveGeometry();
      if (deferredGestureRender) { deferredGestureRender = false; scheduleRender(); }
      return previous;
    }
    function blockGestureClick(pointerId) {
      blockedClick = { pointerId, until: Date.now() + 1500 };
    }
    function cancelMove(notify) {
      if (!gesture && !moveState && !targetEntries.length && !targetChoices.size && previewBoundary === null && !deferredGestureRender &&
          !root.classList.contains('tle-has-move-selection') && !root.hasAttribute('data-move-phase')) return;
      const index = gesture ? gesture.lineIndex : moveState ? moveState.startIndex : null;
      const hadSelection = Boolean(moveState || (gesture && ['selected', 'dragging'].includes(gesture.phase)));
      if (gesture) blockGestureClick(gesture.pointerId);
      finishGesture();
      moveState = null;
      targetChoices.clear();
      previewBoundary = null;
      moveStatus.textContent = '';
      paintMoveState(true);
      if (notify && hadSelection && index !== null) action('move-cancel', index);
    }
    function paintMoveState(forceGeometry = false) {
      if (!moveState && !targetEntries.length && !root.classList.contains('tle-has-move-selection')) {
        if (forceGeometry) syncGeometry();
        return;
      }
      const focused = doc.activeElement;
      const focusedTarget = focused && focused.matches('.tle-move-target-button,.tle-move-depth-button')
        ? { boundary: focused.dataset.moveTarget, key: focused.dataset.targetKey, depthButton: focused.classList.contains('tle-move-depth-button') } : null;
      rows.forEach((row, index) => row.classList.toggle('tle-move-selected', Boolean(moveState && index >= moveState.startIndex && index < moveState.endIndex)));
      root.classList.toggle('tle-has-move-selection', Boolean(moveState));
      targetEntries.forEach((entry) => { entry.element.remove(); entry.button.remove(); entry.depthButton.remove(); });
      const groups = new Map();
      if (moveState) moveState.targets.forEach((target) => {
        const boundary = target.beforeLineId === null ? '__end' : target.beforeLineId;
        if (!groups.has(boundary)) groups.set(boundary, []);
        groups.get(boundary).push(target);
      });
      targetEntries = [...groups].map(([boundary, options], ordinal) => {
        options.sort((a, b) => a.depth - b.depth);
        const target = options.find((option) => option.targetKey === targetChoices.get(boundary)) || nearestDepth(options, moveState.depth);
        const element = doc.createElement('div');
        element.className = 'tle-move-target';
        element.setAttribute('aria-hidden', 'true');
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'tle-move-target-button';
        button.textContent = target.beforeLineId === null ? '끝에' : '여기';
        const depthButton = doc.createElement('button');
        depthButton.type = 'button';
        depthButton.className = 'tle-move-depth-button';
        const entry = { boundary, options, target, element, button, depthButton, top: 0 };
        updateTarget(entry, target);
        button.addEventListener('click', () => {
          if (!moveState || gesture || moveState.value !== textarea.value || !moveState.targets.some((current) => current.targetKey === entry.target.targetKey)) return;
          if (action('move-drop', moveState.startIndex, { beforeLineId: entry.target.beforeLineId, depth: entry.target.depth }) === false) cancelMove(true);
        });
        depthButton.addEventListener('click', () => {
          if (!moveState || gesture) return;
          const index = entry.options.indexOf(entry.target);
          chooseTarget(entry, entry.options[(index + 1) % entry.options.length]);
        });
        const keydown = (event) => {
          if (!moveState || gesture || event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            const index = entry.options.indexOf(entry.target) + (event.key === 'ArrowLeft' ? -1 : 1);
            chooseTarget(entry, entry.options[Math.max(0, Math.min(entry.options.length - 1, index))]);
            return;
          }
          let next = ordinal;
          if (event.key === 'ArrowUp') next -= 1;
          else if (event.key === 'ArrowDown') next += 1;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = targetEntries.length - 1;
          else return;
          event.preventDefault();
          focusMoveTarget(Math.max(0, Math.min(targetEntries.length - 1, next)));
        };
        [button, depthButton].forEach((control) => {
          control.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End');
          control.addEventListener('keydown', keydown);
          control.addEventListener('focus', () => { if (!gesture) chooseTarget(entry, entry.target); });
        });
        moveLayer.append(element, button, depthButton);
        return entry;
      });
      syncGeometry();
      if (focusedTarget !== null) {
        const replacement = targetEntries.find((entry) => entry.boundary === focusedTarget.boundary && !entry.button.hidden);
        if (replacement) {
          updateTarget(replacement, replacement.options.find((target) => target.targetKey === focusedTarget.key) || replacement.target);
          (focusedTarget.depthButton && !replacement.depthButton.hidden ? replacement.depthButton : replacement.button).focus({ preventScroll: true });
        }
      }
    }
    function nearestDepth(options, depth) {
      return options.reduce((best, target) => Math.abs(target.depth - depth) < Math.abs(best.depth - depth) ? target : best, options[0]);
    }
    function updateTarget(entry, target) {
      entry.target = target;
      targetChoices.set(entry.boundary, target.targetKey);
      [entry.element, entry.button, entry.depthButton].forEach((element) => {
        element.dataset.lineIndex = String(target.index);
        element.dataset.beforeLineId = entry.boundary;
        element.dataset.moveTarget = entry.boundary;
        element.dataset.depth = String(target.depth);
        element.dataset.targetKey = target.targetKey;
      });
      entry.button.setAttribute('aria-label', `선택 항목 이동: 들여쓰기 ${target.depth}단계, ${target.label}`);
      entry.button.title = entry.button.getAttribute('aria-label');
      entry.depthButton.textContent = `↔ ${target.depth}`;
      entry.depthButton.setAttribute('aria-label', `들여쓰기 ${target.depth}단계, ${target.label}. 다음 깊이 선택, 마지막 다음은 첫 깊이`);
      entry.depthButton.title = entry.depthButton.getAttribute('aria-label');
      entry.element.style.left = `${previewLeft(target.depth)}px`;
    }
    function chooseTarget(entry, target) {
      if (!target || !moveState) return;
      if (entry.target.targetKey !== target.targetKey) updateTarget(entry, target);
      previewBoundary = entry.boundary;
      const announcement = `들여쓰기 ${target.depth}단계 · ${target.label}`;
      if (moveStatus.textContent !== announcement) moveStatus.textContent = announcement;
      drawDrop(entry);
    }
    function previewLeft(depth) {
      const left = textPaddingLeft;
      return Math.max(left, Math.min(left + depth * 2 * characterWidth - scrollSurface().scrollLeft, root.clientWidth - 148));
    }
    function drawDrop(entry) {
      dropLine.hidden = !entry || entry.element.hidden;
      if (dropLine.hidden) return;
      dropLine.style.top = `${entry.top - scrollSurface().scrollTop}px`;
      dropLine.style.left = `${previewLeft(entry.target.depth)}px`;
      dropLabel.style.width = `${Math.max(0, root.clientWidth - 128)}px`;
      dropLine.dataset.depth = String(entry.target.depth);
      dropLine.dataset.targetKey = entry.target.targetKey;
      dropLine.dataset.beforeLineId = entry.target.beforeLineId || '';
      dropLabel.textContent = `${entry.target.depth}단계 · ${entry.target.label}`;
    }
    function setMoveState(value) {
      if (destroyed) return false;
      if (!value) { if (moveState || gesture) invalidatePlainRowInput(); cancelMove(false); return true; }
      invalidatePlainRowInput();
      const count = textarea.value.split('\n').length;
      if (!Number.isInteger(value.startIndex) || !Number.isInteger(value.endIndex) || value.startIndex < 0 || value.endIndex <= value.startIndex || value.endIndex > count || !Array.isArray(value.targets)) return false;
      const depth = Number.isInteger(value.depth) && value.depth >= 0 && value.depth <= MAX_DEPTH ? value.depth : 0;
      const targets = value.targets.filter((target) => target && Number.isInteger(target.index) && target.index >= 0 && target.index <= count && (target.beforeLineId === null || typeof target.beforeLineId === 'string') && Number.isInteger(target.depth) && target.depth >= 0 && target.depth <= MAX_DEPTH).map((target) => ({ index: target.index, beforeLineId: target.beforeLineId, parentLineId: target.parentLineId, label: String(target.label || ''), depth: target.depth, targetKey: typeof target.targetKey === 'string' ? target.targetKey : `${target.beforeLineId || '$end'}:${target.depth}` }));
      if (!targets.length) { cancelMove(false); return false; }
      if (!moveState || moveState.startIndex !== value.startIndex || moveState.value !== textarea.value) { targetChoices.clear(); previewBoundary = null; }
      unfoldAll();
      moveState = { startIndex: value.startIndex, endIndex: value.endIndex, depth, label: String(value.label || ''), value: textarea.value, targets };
      paintMoveState();
      return true;
    }
    function syncMoveGeometry() {
      const dragging = gesture && gesture.phase === 'dragging';
      const surface = scrollSurface();
      const actionsDisabled = typeof config.isActionDisabled === 'function' && config.isActionDisabled();
      moveLayer.setAttribute('aria-hidden', !moveState || dragging ? 'true' : 'false');
      targetEntries.forEach((entry) => {
        const row = rows[entry.target.index];
        const last = rows[rows.length - 1];
        entry.top = row ? row.offsetTop : last ? last.offsetTop + last.offsetHeight : 20;
        const top = entry.top - surface.scrollTop;
        entry.element.style.top = `${top}px`;
        entry.element.style.left = `${previewLeft(entry.target.depth)}px`;
        entry.element.hidden = Boolean(row && row.hidden) || top < 0 || top > surface.clientHeight;
        entry.button.style.top = `${top}px`;
        entry.button.hidden = dragging || entry.element.hidden || top + 44 > surface.clientHeight;
        entry.button.disabled = actionsDisabled;
        entry.depthButton.style.top = `${top}px`;
        entry.depthButton.hidden = entry.button.hidden || entry.options.length < 2;
        entry.depthButton.disabled = actionsDisabled;
      });
      if (!dragging) drawDrop(targetEntries.find((entry) => entry.boundary === previewBoundary));
    }
    function focusMoveTarget(ordinal) {
      if (!moveState || gesture || !targetEntries.length) return false;
      const entry = Number.isInteger(ordinal) ? targetEntries[ordinal] : targetEntries.find((target) => !target.button.hidden) || targetEntries[0];
      if (!entry) return false;
      const surface = scrollSurface();
      if (entry.top < surface.scrollTop) surface.scrollTop = entry.top;
      else if (entry.top + 44 > surface.scrollTop + surface.clientHeight) surface.scrollTop = entry.top + 44 - surface.clientHeight;
      syncGeometry();
      if (entry.button.hidden || entry.button.disabled) return false;
      entry.button.focus({ preventScroll: true });
      entry.button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return doc.activeElement === entry.button;
    }
    function candidateAt(x, y) {
      const box = root.getBoundingClientRect();
      if (!moveState || x < box.left || x > box.right || y < box.top || y > box.bottom) return null;
      const hit = doc.elementFromPoint(x, y);
      if (!hit || !root.contains(hit)) return null;
      let best = null;
      const surface = scrollSurface();
      let distance = 32;
      targetEntries.forEach((entry) => {
        const top = entry.top - surface.scrollTop;
        const current = Math.abs(y - box.top - top);
        if (!entry.element.hidden && top >= 0 && top <= surface.clientHeight && current < distance) { best = entry; distance = current; }
      });
      if (best && gesture) {
        const requestedDepth = Math.max(0, Math.min(MAX_DEPTH, Math.round((x - textOriginX - gesture.grabOffset) / (2 * characterWidth))));
        chooseTarget(best, nearestDepth(best.options, requestedDepth));
      }
      return best;
    }
    function paintDrop() {
      if (!gesture || gesture.phase !== 'dragging') return;
      gesture.candidate = candidateAt(gesture.x, gesture.y);
      drawDrop(gesture.candidate);
    }
    function dragTick() {
      dragFrame = 0;
      if (!gesture || gesture.phase !== 'dragging') return;
      const box = root.getBoundingClientRect();
      const surface = scrollSurface();
      const visibleTop = global.visualViewport ? global.visualViewport.offsetTop : 0;
      const visibleBottom = visibleTop + (global.visualViewport ? global.visualViewport.height : global.innerHeight);
      const topEdge = Math.max(visibleTop, box.top);
      const bottomEdge = Math.min(visibleBottom, box.bottom);
      let speed = 0;
      if (gesture.x >= box.left && gesture.x <= box.right && gesture.y >= topEdge && gesture.y <= bottomEdge) {
        if (gesture.y < topEdge + 32) speed = -Math.ceil((topEdge + 32 - gesture.y) / 4);
        else if (gesture.y > bottomEdge - 32) speed = Math.ceil((gesture.y - bottomEdge + 32) / 4);
      }
      if (speed) {
        const before = surface.scrollTop;
        surface.scrollTop += speed;
        if (surface.scrollTop !== before) { gesture.expectedScrollTop = surface.scrollTop; syncGeometry(); }
        else speed = 0;
      }
      paintDrop();
      if (speed) dragFrame = global.requestAnimationFrame(dragTick);
    }
    function scheduleDrag() { if (!dragFrame) dragFrame = global.requestAnimationFrame(dragTick); }
    function scrollChain(delta) {
      let remaining = delta;
      for (let element = scrollSurface(); element && Math.abs(remaining) > .1; element = element.parentElement) {
        if (!/(auto|scroll)/.test(global.getComputedStyle(element).overflowY) || element.scrollHeight <= element.clientHeight) continue;
        const before = element.scrollTop;
        element.scrollTop += remaining;
        remaining -= element.scrollTop - before;
      }
      if (Math.abs(remaining) > .1) global.scrollBy(0, remaining);
    }
    function beginGesture(event, lineIndex, enabled) {
      if (destroyed || composing || event.button !== 0 || event.isPrimary === false || activePointers.size > 1 || (typeof config.isActionDisabled === 'function' && config.isActionDisabled())) return;
      if (gesture) cancelMove(true);
      if (moveState && moveState.startIndex !== lineIndex) cancelMove(true);
      const sourceDepth = moveState ? moveState.depth : Math.max(0, Math.min(MAX_DEPTH, Number(rows[lineIndex] && rows[lineIndex].dataset.depth) || 0));
      const current = { pointerId: event.pointerId, pointerType: event.pointerType, lineIndex, phase: 'pending', x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, source: textarea.value, timer: null, candidate: null, expectedScrollTop: null, grabOffset: event.clientX - textOriginX - sourceDepth * 2 * characterWidth };
      gesture = current;
      root.dataset.movePhase = 'pending';
      if (moveState && moveState.startIndex === lineIndex && moveState.value === textarea.value) {
        current.phase = 'selected';
        root.dataset.movePhase = 'selected';
        blockGestureClick(current.pointerId);
        try { root.setPointerCapture(current.pointerId); } catch (_) { /* See the long-press capture below. */ }
        return;
      }
      current.timer = global.setTimeout(() => {
        if (gesture !== current || activePointers.size !== 1 || current.source !== textarea.value) return;
        if (enabled && !enabled()) { cancelMove(true); return; }
        current.timer = null;
        current.phase = 'selected';
        root.dataset.movePhase = 'selected';
        blockGestureClick(current.pointerId);
        try { root.setPointerCapture(current.pointerId); } catch (_) { /* Synthetic tests do not own a native pointer. */ }
        const accepted = action('move-select', lineIndex);
        if (accepted === false || !moveState) cancelMove(true);
        else if (deferredGestureRender) { deferredGestureRender = false; scheduleRender(); }
      }, 450);
    }
    function tapScopeStart(event, lineIndex) {
      // The RAW ruler under the drawn name: the row's own text, or its source span (a folder row drawn in place).
      const row = rows[lineIndex], source = row && row.querySelector(':scope > .tle-date-source'), ruler = source ? source.firstChild : row && row.firstChild;
      if (destroyed || composing || moveState || !row || !ruler || ruler.nodeType !== 3) return;
      const line = rangeOfLine(lineIndex), syntax = /^([ \t]*-\s+\/?)/.exec(line.text), limit = syntax ? syntax[1].length : 0;
      const range = doc.createRange();
      let column = 0, top = null;
      for (let at = 0; at < Math.min(ruler.length, limit + 1); at++) {
        range.setStart(ruler, at); range.setEnd(ruler, at + 1);
        const box = range.getClientRects()[0];
        if (!box) continue;
        if (top === null) top = box.top; else if (box.top > top + 1) break;
        if (event.clientX < box.left + box.width / 2) break;
        column = at + 1;
      }
      const offset = line.start + Math.min(column, limit);
      event.preventDefault();
      textarea.setSelectionRange(offset, offset);
      remember();
      textarea.focus({ preventScroll: true });
      render();
    }
    function gestureHandle(button, lineIndex, clickAction, enabled) {
      button.classList.add('tle-move-handle');
      const index = () => typeof lineIndex === 'function' ? lineIndex() : lineIndex;
      button.addEventListener('pointerdown', (event) => { event.preventDefault(); if (enabled && !enabled()) return; beginGesture(event, index(), enabled); });
      button.addEventListener('click', (event) => {
        if (enabled && !enabled()) return;
        // P1 (11/7): in the writing view a folder line's start is its text: a tap puts the caret there (held, it still
        // picks the line up to move); a key press on the control still opens the folder.
        if (button.classList.contains('tle-scope-control') && mode === 'live' && event.detail !== 0) { tapScopeStart(event, index()); return; }
        action(clickAction, index());
      });
    }
    function pointerMove(event) {
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      const previousY = gesture.y;
      gesture.x = event.clientX;
      gesture.y = event.clientY;
      if (gesture.source !== textarea.value) { cancelMove(true); return; }
      const distance = Math.hypot(gesture.x - gesture.startX, gesture.y - gesture.startY);
      if (gesture.phase === 'pending' && distance > 8) {
        if (gesture.pointerType === 'touch' || gesture.pointerType === 'pen') {
          global.clearTimeout(gesture.timer);
          gesture.timer = null;
          gesture.phase = 'scrolling';
          root.dataset.movePhase = 'scrolling';
          blockGestureClick(gesture.pointerId);
          try { root.setPointerCapture(gesture.pointerId); } catch (_) { /* See beginGesture. */ }
          scrollChain(gesture.startY - gesture.y);
        } else cancelMove(true);
        return;
      }
      if (gesture.phase === 'scrolling') { scrollChain(previousY - gesture.y); return; }
      if ((gesture.phase === 'selected' || gesture.phase === 'dragging') && distance > 8) {
        gesture.phase = 'dragging';
        root.dataset.movePhase = 'dragging';
        if (event.cancelable) event.preventDefault();
        syncMoveGeometry();
        scheduleDrag();
      }
    }
    function pointerEnd(event) {
      activePointers.delete(event.pointerId);
      if (!gesture || event.pointerId !== gesture.pointerId) return;
      if (event.type === 'pointercancel') { cancelMove(true); return; }
      const current = gesture;
      if (current.phase === 'pending') { finishGesture(); return; }
      blockGestureClick(event.pointerId);
      if (current.phase === 'dragging') {
        current.x = event.clientX;
        current.y = event.clientY;
        const candidate = candidateAt(current.x, current.y);
        if (!candidate || current.source !== textarea.value) { cancelMove(true); return; }
        finishGesture();
        if (action('move-drop', current.lineIndex, { beforeLineId: candidate.target.beforeLineId, depth: candidate.target.depth }) === false) cancelMove(true);
      } else finishGesture();
    }

    function maybeRequestPicker(inputType) {
      if (composing || destroyed || config.controls === false) return;
      if (!addSettings.typingPickers()) { lastPickerCandidate = null; return; }
      const line = rangeOfLine(lineAt(selection.start));
      const fenced = protectedFenceLines(textarea.value.split('\n'))[line.index];
      let type = null;
      if (!fenced && selection.start === selection.end && selection.end === line.end) {
        if (/^ *- ?$/.test(line.text)) type = 'scope-picker';
        else if (/^ *- \[ \] ?$/.test(line.text)) type = 'task-picker';
      }
      if (!type) { lastPickerCandidate = null; return; }
      // A prefix and its optional trailing space are one editing episode.
      // Cancel, focus, redraw, paste replay and Undo cannot reopen it themselves.
      const key = `${line.index}:${line.start}:${type}`;
      if (!inputType || !inputType.startsWith('insert') || key === lastPickerCandidate) return;
      lastPickerCandidate = key;
      action(type, line.index);
    }

    function getRowMeta() {
      const supplied = typeof config.getRowMeta === 'function' ? config.getRowMeta() : null;
      return supplied && typeof supplied === 'object' ? supplied : {};
    }
    function icon(kind) {
      const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('fill', 'none');
      svg.setAttribute('stroke', 'currentColor');
      svg.setAttribute('stroke-width', '1.7');
      if (kind === 'flow') {
        [[5, 12], [19, 5], [19, 19]].forEach(([cx, cy]) => {
          const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', String(cx));
          circle.setAttribute('cy', String(cy));
          circle.setAttribute('r', '2');
          svg.append(circle);
        });
      }
      const path = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', kind === 'folder' ? 'M3 7V5h6l2 2h10v12H3zM3 9h18' : kind === 'flow' ? 'm7 11 10-5M7 13l10 5' : 'M7 17 17 7M7 7h10v10');
      svg.append(path);
      return svg;
    }
    function checkActionAllowed(index) {
      if (destroyed || composing || config.controls === false || (typeof config.isCheckDisabled === 'function'
        ? config.isCheckDisabled(index) : typeof config.isActionDisabled === 'function' && config.isActionDisabled())) return false;
      // A separate task action does not consume the editor's text selection.
      // Pointerdown already preserves native focus/range; keyboard focus stays
      // on its control through the existing rendered-control restoration.
      return mode === 'live' || foldedIds.size;
    }
    function checkControlVisible() {
      if(destroyed||composing||config.controls===false||!(mode==='live'||foldedIds.size))return false;
      if(!(typeof config.isCheckDisabled==='function'?config.isCheckDisabled():typeof config.isActionDisabled==='function'&&config.isActionDisabled()))return true;
      const focused=doc.activeElement;
      return !!focused&&focused.classList.contains('tle-check-hit')&&root.contains(focused);
    }
    function addCheckButton(index, row, glyph, task, safeMeta) {
      if (config.controls === false) return;
      const progress = progressPercent(safeMeta);
      const complete = progress !== null ? progress === 100 : task[2].toLowerCase() === 'x';
      const requested = safeMeta && typeof config.getCheckAction === 'function' ? config.getCheckAction(index, safeMeta) : progress !== null ? 'progress-open' : 'toggle';
      const action = ['toggle', 'progress-open', 'reference-open'].includes(requested) ? requested : 'progress-open';
      const detail = action !== 'toggle';
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'tle-check-hit';
      if (detail) {
        button.classList.add('tle-progress-hit');
        button.dataset.action = action;
        button.dataset.progressPercent = String(progress ?? (complete ? 100 : 0));
        button.setAttribute('aria-label', action === 'reference-open' ? `${task[4] || '할 일'} 원문 상태 확인` : `${task[4] || '할 일'} ${safeMeta?.kind === 'subcheck' ? '하위 체크 · ' : ''}진행률 ${progress ?? (complete ? 100 : 0)}%, 진행 조절`);
        const recordDate = typeof safeMeta?.progressDate === 'string' && safeMeta.progressDate ? dateLabel(`[${safeMeta.progressDate}]`) : null;
        button.title = `${button.getAttribute('aria-label')}${recordDate ? ` · 진행 기록 ${recordDate}${Number.isInteger(safeMeta.lastRecordedPercent) ? ` · ${safeMeta.lastRecordedPercent}%` : ''}` : ''}`;
        if (progress > 0 && progress < 100) {
          glyph.classList.add('tle-progress-anchor');
          button.append(makeSpan('tle-progress-badge', `${progress}%`));
        }
      } else {
        button.setAttribute('role', 'checkbox');
        button.setAttribute('aria-checked', String(complete));
        button.setAttribute('aria-label', `${task[4] || '할 일'} ${complete ? '완료 취소' : '완료'}`);
      }
      button.dataset.lineIndex = String(index);
      gestureHandle(button, index, action, () => checkActionAllowed(index));
      appendRowControl(row, button);
      checkButtons.push({ button, row, glyph });
    }
    function syncCheckGeometry(button, checkRow, glyph, actionsDisabled, height, lineHeight, surface, plans, readRect) {
      // A saving transition must not discard deliberate keyboard focus. The
      // shared action guard still rejects activation while logically disabled.
      const checkDisabled = composing || (typeof config.isCheckDisabled === 'function' ? config.isCheckDisabled(Number(button.dataset.lineIndex)) : actionsDisabled);
      const rect = readRect || ((node) => node.getBoundingClientRect());
      const glyphBox = rect(glyph);
      const local = button.parentElement === checkRow;
      const ownerBox = rect(local ? checkRow : root);
      const top = checkRow.offsetTop - surface.scrollTop;
      const nativeCheck = !readingView && !foldedIds.size && !moveState;
      let hitHeight = 44, hitWidth = 44;
      if (nativeCheck) {
        // The 44px control must not cover a later compact RAW line or its title.
        // Only unchanged prefix paint supplies the horizontal boundary.
        const prefix = checkRow.querySelector('.tle-active-syntax, .tle-hidden-syntax');
        const prefixRects = prefix && prefix.getClientRects();
        const glyphCenter = (glyphBox.top + glyphBox.bottom) / 2;
        let prefixRight = glyphBox.left;
        // A tab can split one visual row into several inline rectangles. Ignore
        // fragments on wrapped rows so the hit area never extends into a title.
        for (let i = 0; prefixRects && i < prefixRects.length; i += 1) {
          const box = prefixRects[i];
          if (box.width > 0 && box.height > 0 && box.top <= glyphCenter && glyphCenter < box.bottom) prefixRight = Math.max(prefixRight, box.right);
        }
        hitHeight = Math.max(0, Math.min(44, lineHeight));
        hitWidth = prefixRight > glyphBox.left ? Math.max(0, Math.min(44, prefixRight - glyphBox.left + 13)) : 0;
      }
      const plan = { button, disabled: checkDisabled && doc.activeElement !== button, ariaDisabled: String(checkDisabled),
        hidden: checkRow.hidden || (!local && (top < 0 || top + hitHeight > height)) || (mode !== 'live' && !foldedIds.size) || !hitWidth || !hitHeight,
        top: (local ? 0 : top) + 'px', left: (glyphBox.left - ownerBox.left - 13) + 'px', clipRight: (44 - hitWidth) + 'px', clipBottom: (44 - hitHeight) + 'px' };
      if (plans) plans.push(plan); else applyCheckGeometry(plan);
    }
    function applyCheckGeometry(plan) {
      const button = plan.button;
      button.disabled = plan.disabled; button.setAttribute('aria-disabled', plan.ariaDisabled); button.hidden = plan.hidden;
      button.style.top = plan.top; button.style.left = plan.left;
      button.style.setProperty('--tle-check-clip-right', plan.clipRight); button.style.setProperty('--tle-check-clip-bottom', plan.clipBottom);
    }

    function appendRowControl(row, button) {
      if (readingView || foldedIds.size) {
        // The browser scrolls the row and its controls as one subtree. Native
        // editing still uses the existing root overlay and unchanged RAW ruler.
        button.classList.add('tle-row-control');
        viewport.setAttribute('aria-hidden', 'false');
        // Compound folded rows must not suppress their child buttons in the
        // accessibility tree. Their existing Enter/Space edit handler remains.
        if (foldedIds.size) row.setAttribute('role', 'group');
        // A control action must not bubble into the reading/folded edit tap.
        button.addEventListener('click', (event) => event.stopPropagation());
        button.addEventListener('keydown', (event) => event.stopPropagation());
        row.append(button);
      } else controls.append(button);
    }
    function addRowButton(type, index, row, meta) {
      if (config.controls === false) return;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = `tle-row-open tle-${type === 'scope-open' ? 'scope' : type === 'task-date' ? 'task-date' : type === 'task-origin' ? 'task-origin' : 'reference'}-open`;
      button.dataset.lineIndex = String(index);
      button.dataset.action = type;
      // W4: the origin check is not a date chip; a task whose own date line shows the date gets this button instead.
      const dateText = type !== 'task-origin' && typeof meta.dateMismatch === 'string' ? meta.dateMismatch.trim() : '';
      const scheduledDate = scheduledDateLabel(dateText);
      const compactScheduledDate = /^\d{2}\.\d{2}$/.test(dateText) ? dateText.replace('.', '/') : scheduledDate;
      const scopeText = typeof meta.scopeMismatch === 'string' ? meta.scopeMismatch.trim() : '';
      const label = typeof meta.label === 'string' ? meta.label : rangeOfLine(index).text;
      button.setAttribute('aria-label', `${type === 'scope-open' ? '연결된 묶음 열기' : type === 'task-date' ? '할 일 예정일 변경' : type === 'task-origin' ? '할 일 소속 확인' : '연결된 할 일 열기'}: ${label}${dateText ? `, 예정일 ${scheduledDate}` : ''}${scopeText ? `, 실제 소속 ${scopeText}` : ''}`);
      button.title = scopeText ? button.getAttribute('aria-label') : typeof meta.subtitle === 'string' ? meta.subtitle : button.getAttribute('aria-label');
      if (type === 'scope-open' && row.classList.contains('tle-line-native-scope')) button.classList.add('tle-scope-control');
      if (dateText) {
        button.classList.add('tle-date-open', 'tle-scheduled-date-open');
        button.append(makeSpan('tle-row-date-kind', '예정일'), makeSpan('tle-row-date', compactScheduledDate));
        if (type === 'reference-open') button.append(icon('reference'));
      } else if (type === 'task-origin') {
        button.classList.add('tle-date-open');
        button.append(makeSpan('tle-row-date', '소속'));
      } else button.append(icon(type === 'scope-open' ? meta.scopeKind : 'reference'));
      if (type === 'scope-open') gestureHandle(button, index, type);
      else {
        button.addEventListener('pointerdown', (event) => event.preventDefault());
        button.addEventListener('click', () => action(type, index));
      }
      appendRowControl(row, button);
      rowButtons.push({ button, row, type });
    }
    function addFoldButton(index, row, meta) {
      if (config.controls === false) return;
      if (typeof meta.id !== 'string' || !Number.isInteger(meta.subtreeEndIndex) || meta.subtreeEndIndex <= index + 1) return;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = 'tle-fold-toggle';
      button.dataset.lineIndex = String(index);
      button.dataset.action = 'fold-toggle';
      const folded = foldedIds.has(meta.id);
      // W4: an outline triangle before the folder icon, not a dropdown chevron after it.
      button.textContent = folded ? '▸' : '▾';
      button.setAttribute('aria-expanded', String(!folded));
      button.setAttribute('aria-label', `${meta.label || '묶음'} ${folded ? '펼치기' : '접기'}`);
      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => toggleFold(index));
      if (row.classList.contains('tle-line-native-scope')) button.classList.add('tle-scope-control');
      // Visual A (11/7): the folder the caret is in; the host shows an open folder's fold control there only.
      if (row.dataset.caretScope === 'true') button.dataset.caretScope = 'true';
      row.append(makeSpan('tle-fold-anchor', ''));
      appendRowControl(row, button);
      foldButtons.push({ button, row });
    }

    function syncCompositionGeometry(plans) {
      if (!composing || mode !== 'live') return;
      const first = rows[lineAt(Math.min(compositionAnchor, selection.start))];
      const last = rows[lineAt(Math.max(compositionAnchor, selection.end))];
      if (!first || !last) return;
      // Paint the browser-owned composition only over its raw mirror rows.
      // A mask changes neither textarea layout nor hit testing/candidate anchors.
      const top = Math.max(0, first.offsetTop - textarea.scrollTop);
      const bottom = Math.max(top, last.offsetTop + last.offsetHeight - textarea.scrollTop);
      const plan = { top: `${top}px`, bottom: `${bottom}px` };
      if (plans) plans.push(plan); else applyCompositionGeometry(plan);
    }
    function applyCompositionGeometry(plan) {
      textarea.style.setProperty('--tle-composition-top', plan.top);
      textarea.style.setProperty('--tle-composition-bottom', plan.bottom);
    }

    function syncRowIndent(row, plans) {
      // `ch` measures the zero glyph, not the RAW spaces in a proportional
      // font. Read the existing mirror text; never replace the native ruler.
      const first = row.firstChild;
      const node = first && first.nodeType === 3 ? first : first && first.firstChild;
      if (!node || node.nodeType !== 3) return;
      const prefix = indentation(node.textContent || '').prefix;
      const width = (columns) => {
        let end = 0, consumed = 0;
        while (end < prefix.length && consumed < columns) {
          consumed += prefix[end] === '\t' ? 2 : 1;
          end++;
        }
        if (!end) return 0;
        const range = doc.createRange();
        range.setStart(node, 0);
        range.setEnd(node, end);
        return range.getBoundingClientRect().width;
      };
      // W3: a passive progress pill spans its RAW marker ('- [30%]'), so no blank is left before the title.
      const marker = () => {
        const range = doc.createRange();
        range.setStart(node, prefix.length);
        range.setEnd(node, Math.max(prefix.length, (node.textContent || '').trimEnd().length));
        return `${range.getBoundingClientRect().width}px`;
      };
      const plan = { row, indent: `${width(Infinity)}px`, guides: Array.from(row.querySelectorAll('.tle-indent-guide'),
        (guide) => ({ guide, left: `${width(Number(guide.dataset.indentColumns)) + 9}px` })),
        progress: first.classList && first.classList.contains('tle-hidden-syntax') && row.querySelector('.tle-passive-progress') ? marker() : null };
      if (plans) plans.push(plan); else applyRowIndent(plan);
    }
    function applyRowIndent(plan) {
      plan.row.style.setProperty('--tle-indent', plan.indent);
      plan.guides.forEach(({ guide, left }) => { guide.style.left = left; });
      if (plan.progress) plan.row.style.setProperty('--tle-progress-width', plan.progress);
    }

    function syncReadingTaskInset(row, plans) {
      const prefix = row.querySelector('.tle-hidden-syntax');
      if (!prefix) return;
      const glyph = config.controls !== false && row.querySelector('.tle-check-glyph');
      // Reading uses one 44px control lane, regardless of RAW [ ]/[40%] width.
      // Keep source prefixes for copy/tap mapping, not presentation spacing.
      // A control-free preview still uses its unchanged source-prefix ruler.
      const hitEdge = glyph ? glyph.getBoundingClientRect().right - row.getBoundingClientRect().left + 14 : 0;
      const sourceWidth = prefix.getBoundingClientRect().width;
      const moving = Boolean(moveState || gesture && ['selected', 'dragging'].includes(gesture.phase));
      const inset = glyph && !moving ? hitEdge + 12 : Math.max(sourceWidth, hitEdge);
      const plan = { row, inset: `${Math.min(inset, Math.max(0, row.clientWidth - 44))}px` };
      if (plans) plans.push(plan); else applyReadingTaskInset(plan);
    }
    function applyReadingTaskInset(plan) {
      plan.row.style.setProperty('--tle-task-prefix', plan.inset);
    }
    // W3 follow-up: a date or time label under a task starts where that task's title starts (W0 mockup), not at
    // its own line's indent. Reading insets are applied first; a RAW owner row (the caret's, or composing) is
    // measured on its text, so the label stays put while the task line is being written.
    function syncPropertyLabelInset(row, plans) {
      const label = row.classList.contains('tle-line-date-property') ? row.querySelector('.tle-property-date-label') : null;
      if (!label) return;
      const owner = row.dataset.checkOwner === undefined ? null : rows[Number(row.dataset.checkOwner)];
      let left = null;
      const title = owner && !owner.hidden && owner.querySelector('.tle-task-title, .tle-task-title-complete');
      const box = title && title.getClientRects()[0];
      if (box) left = box.left;
      else if (owner && !owner.hidden && owner.firstChild && owner.firstChild.nodeType === 3) {
        const text = owner.firstChild.textContent || '', task = TASK.exec(text);
        if (task) left = pointRange(owner.firstChild, text.length - task[4].length).getBoundingClientRect().left;
      }
      plans.push({ label, inset: left === null ? '' : `${Math.max(0, left - row.getBoundingClientRect().left)}px` });
    }
    function applyPropertyLabelInset(plan) {
      if (plan.inset) plan.label.style.setProperty('--tle-label-inset', plan.inset);
      else plan.label.style.removeProperty('--tle-label-inset');
    }
    function syncMembershipGeometry(lineHeight, plans) {
      const wrapped = new Set();
      rows.forEach((row) => {
        if (row.dataset.checkOwner !== undefined && row.offsetHeight > lineHeight + 0.5) wrapped.add(row.dataset.checkOwner);
      });
      rows.forEach((row) => {
        const plan = { row, wrapped: String(row.dataset.checkOwner !== undefined && wrapped.has(row.dataset.checkOwner)) };
        if (plans) plans.push(plan); else applyMembershipGeometry(plan);
      });
    }
    function applyMembershipGeometry(plan) { plan.row.dataset.membershipWrapped = plan.wrapped; }

    function syncGeometry() {
      if (destroyed) return;
      const actionsDisabled = composing || (typeof config.isActionDisabled === 'function' && config.isActionDisabled());
      const surface = scrollSurface();
      if (!readingView && !foldedIds.size) { viewport.scrollTop = 0; viewport.scrollLeft = 0; }
      const textStyle = global.getComputedStyle(textarea);
      const initialWidth = surface.clientWidth;
      if (characterMetric.style.font !== textStyle.font) characterMetric.style.font = textStyle.font;
      if (characterMetric.style.letterSpacing !== textStyle.letterSpacing) characterMetric.style.letterSpacing = textStyle.letterSpacing;
      const mirrorWidth = initialWidth + 'px';
      const mirrorTransform = readingView || foldedIds.size ? 'none' : 'translate(' + -textarea.scrollLeft + 'px, ' + -textarea.scrollTop + 'px)';
      if (mirror.style.width !== mirrorWidth) mirror.style.width = mirrorWidth;
      if (mirror.style.transform !== mirrorTransform) mirror.style.transform = mirrorTransform;
      characterWidth = characterMetric.getBoundingClientRect().width || characterWidth;
      textPaddingLeft = parseFloat(textStyle.paddingLeft) || 14;
      const lineHeight = parseFloat(textStyle.lineHeight) || nativeLineHeight();

      // Indent changes anchor positions; reading inset changes title wrapping.
      // Each dependency stage reads all rows before applying any row styles.
      const indents = [];
      rows.forEach((row) => syncRowIndent(row, indents));
      indents.forEach(applyRowIndent);
      if (readingView || foldedIds.size) {
        const insets = [];
        rows.forEach((row) => syncReadingTaskInset(row, insets));
        insets.forEach(applyReadingTaskInset);
      }
      const labelInsets = [];
      rows.forEach((row) => syncPropertyLabelInset(row, labelInsets));
      labelInsets.forEach(applyPropertyLabelInset);

      // Everything below measures the final layout. Rects live for this pass
      // only: scroll/fold/resize/IME transitions always obtain fresh positions.
      const rects = new Map();
      const rect = (node) => { if (!rects.has(node)) rects.set(node, node.getBoundingClientRect()); return rects.get(node); };
      const rootBox = rect(root);
      const scrollTop = surface.scrollTop, height = surface.clientHeight, width = surface.clientWidth;
      textOriginX = rootBox.left + textPaddingLeft - surface.scrollLeft;
      const memberships = [], composition = [];
      syncMembershipGeometry(lineHeight, memberships);
      syncCompositionGeometry(composition);
      const index = lineAt(selection.start), row = rows[index];
      const topPad = parseFloat(textStyle.paddingTop) || 0;
      const rowTop = row ? row.offsetTop - scrollTop : topPad;
      let menuTop = rowTop;
      if (doc.activeElement === textarea && row && row.firstChild && row.firstChild.nodeType === 3) {
        const line = rangeOfLine(index);
        const caret = pointRange(row.firstChild, Math.min(row.firstChild.length, selection.start - line.start)).getBoundingClientRect();
        if (caret.height) menuTop = caret.top - rootBox.top - Math.max(0, (44 - lineHeight) / 2);
      }
      const menuHidden = Boolean(moveState) || composing || !row || row.hidden || menuTop + 44 < 0 || menuTop > height;
      const menuPosition = Math.max(0, Math.min(height - 44, menuTop)) + 'px';
      let plusPosition = menuPosition, plusIndex = index;
      const addAnchor = typeof config.getAddAnchor === 'function' ? config.getAddAnchor(index) : null;
      if (addAnchor && rows[addAnchor.bottomIndex]) {
        const bottom = rows[addAnchor.bottomIndex];
        plusIndex = addAnchor.parentIndex;
        plusPosition = Math.max(0, Math.min(height - 44, bottom.offsetTop + bottom.offsetHeight - scrollTop)) + 'px';
      }
      const checks = [];
      checkButtons.forEach(({ button, row: checkRow, glyph }) =>
        syncCheckGeometry(button, checkRow, glyph, actionsDisabled, height, lineHeight, surface, checks, rect));

      // Match the existing CSS control visibility, never a previous hidden
      // attribute. A later reading/fold/move pass measures these controls again.
      const phase = root.getAttribute('data-move-phase');
      const compactControls = !root.classList.contains('tle-reading-view') && !root.classList.contains('tle-folded-view') &&
        !root.classList.contains('tle-has-move-selection') && phase !== 'selected' && phase !== 'dragging';
      // U45 folder rows: the open button covers the line's start up to the name and ▾ sits in the right gutter, one
      // line high, in reading, writing and folded alike; while writing, every folder row but the caret's (RAW) shows them.
      const scopeHidden = (metaRow, top, local) => metaRow.hidden || metaRow.classList.contains('tle-line-raw') ||
        (mode !== 'live' && !foldedIds.size) || (!local && (top < 0 || top + lineHeight > height));
      const rowPlans = rowButtons.map(({ button, row: metaRow, type }) => {
        if (button.classList.contains('tle-scope-control')) {
          const top = metaRow.offsetTop - scrollTop, local = button.parentElement === metaRow;
          // Up to the name's first character: a wrapped name's box starts at the row's start (review, 11/3).
          const name = metaRow.querySelector('.tle-active-scope-name'), start = rect(metaRow).left - textPaddingLeft;
          let firstBox = null;
          if (name && name.firstChild && name.firstChild.nodeType === 3 && name.firstChild.length) {
            const first = doc.createRange(); first.setStart(name.firstChild, 0); first.setEnd(name.firstChild, 1); firstBox = first.getClientRects()[0] || null;
          }
          const width = firstBox ? Math.max(0, Math.round(firstBox.left - start)) : 0;
          return { button, disabled: actionsDisabled, hidden: !width || scopeHidden(metaRow, top, local),
            top: (local ? 0 : top) + 'px', left: start - (local ? rect(metaRow) : rootBox).left + 'px', width: width + 'px' };
        }
        if (compactControls) return { button, disabled: actionsDisabled, hidden: true };
        const top = metaRow.offsetTop - scrollTop, local = button.parentElement === metaRow;
        const plan = { button, disabled: actionsDisabled,
          hidden: (Boolean(moveState) && type !== 'scope-open') || metaRow.hidden || (!local && (top < 0 || top + 44 > height)) || (mode !== 'live' && !foldedIds.size),
          top: (local ? 0 : top) + 'px' };
        if (type === 'scope-open') {
          const anchor = metaRow.querySelector('.tle-scope-anchor');
          if (anchor) plan.left = rect(anchor).left - (local ? rect(metaRow) : rootBox).left - 13 + 'px';
        } else if (local) {
          const clientRight = rect(surface).left + width;
          plan.right = rect(metaRow).right - clientRight + 8 + 'px';
        }
        return plan;
      });
      const foldPlans = foldButtons.map(({ button, row: foldRow }) => {
        if (button.classList.contains('tle-scope-control')) {
          const top = foldRow.offsetTop - scrollTop, local = button.parentElement === foldRow;
          return { button, disabled: actionsDisabled, hidden: scopeHidden(foldRow, top, local),
            top: (local ? 0 : top) + 'px', left: rect(foldRow).right + 2 - (local ? rect(foldRow) : rootBox).left + 'px' };
        }
        if (compactControls) return { button, disabled: actionsDisabled, hidden: true };
        const top = foldRow.offsetTop - scrollTop, local = button.parentElement === foldRow;
        const anchor = foldRow.querySelector('.tle-fold-anchor');
        const plan = { button, disabled: actionsDisabled, hidden: foldRow.hidden || (!local && (top < 0 || top + 44 > height)),
          top: (local ? 0 : top) + 'px' };
        if (anchor) plan.left = rect(anchor).left - (local ? rect(foldRow) : rootBox).left + 'px';
        return plan;
      });

      // No layout reads in this per-control commit phase.
      plus.disabled = actionsDisabled; rowMenu.disabled = actionsDisabled;
      plus.hidden = menuHidden; rowMenu.hidden = menuHidden;
      plus.style.top = plusPosition; rowMenu.style.top = menuPosition;
      plus.dataset.lineIndex = String(plusIndex); rowMenu.dataset.lineIndex = String(index);
      plus.setAttribute('aria-label', (index + 1) + '행에 내용 추가');
      rowMenu.setAttribute('aria-label', (index + 1) + '행 메뉴');
      memberships.forEach(applyMembershipGeometry);
      composition.forEach(applyCompositionGeometry);
      checks.forEach(applyCheckGeometry);
      [...rowPlans, ...foldPlans].forEach((plan) => {
        plan.button.disabled = plan.disabled; plan.button.hidden = plan.hidden;
        if (plan.top !== undefined) plan.button.style.top = plan.top;
        if (plan.left !== undefined) plan.button.style.left = plan.left;
        if (plan.right !== undefined) plan.button.style.right = plan.right;
        if (plan.width !== undefined) plan.button.style.width = plan.width;
      });
      // Move targets retain their separate state/scroll-dependent geometry.
      syncMoveGeometry();
    }

    const rowPaintFields = ['id', 'kind', 'isCanonical', 'depth', 'guideLevels', 'subtreeEndIndex', 'label',
      'progressTargetId', 'progressPercent', 'progressDate', 'progressTracked', 'lastRecordedPercent', 'scopeKind', 'subtitle', 'scopeMismatch', 'dateMismatch', 'folderPending', 'repeatLabel', 'repeatAt'];
    function invalidatePlainRowInput() {
      plainInputSerial++;
      plainInputOrigin = null;
      pendingPlainInput = null;
      completedRowRender = null;
    }
    function copyRowPaintMeta(meta, index, count) {
      if (!meta || Object.getPrototypeOf(meta) !== Object.prototype) return null;
      const properties = Object.getOwnPropertyDescriptors(meta);
      if (Reflect.ownKeys(properties).some((key) => typeof key !== 'string' || !rowPaintFields.includes(key) || !('value' in properties[key]))) return null;
      if (rowPaintFields.slice(0, 7).some((key) => !properties[key])) return null;
      if (typeof meta.id !== 'string' || !meta.id || typeof meta.label !== 'string' || typeof meta.isCanonical !== 'boolean' ||
          !['note', 'blank', 'fence', 'date', 'scope', 'task', 'subcheck', 'property', 'heading', 'reference'].includes(meta.kind) ||
          !Number.isInteger(meta.depth) || meta.depth < 0 || meta.depth > MAX_DEPTH + 1 ||
          !Number.isInteger(meta.subtreeEndIndex) || meta.subtreeEndIndex < index + 1 || meta.subtreeEndIndex > count) return null;
      const guides = meta.guideLevels;
      if (!Array.isArray(guides) || Object.getPrototypeOf(guides) !== Array.prototype || Reflect.ownKeys(guides).length !== guides.length + 1) return null;
      const guideValues = [];
      for (let i = 0; i < guides.length; i++) {
        const item = Object.getOwnPropertyDescriptor(guides, String(i));
        if (!item || !('value' in item) || !Number.isInteger(item.value) || item.value < 0 || item.value > MAX_DEPTH) return null;
        guideValues.push(item.value);
      }
      for (const key of ['progressTargetId', 'scopeKind', 'subtitle', 'scopeMismatch', 'dateMismatch', 'repeatLabel']) {
        if (properties[key] && meta[key] !== undefined && typeof meta[key] !== 'string') return null;
      }
      if (properties.scopeKind && meta.scopeKind !== undefined && !['folder', 'flow'].includes(meta.scopeKind)) return null;
      if (properties.progressDate && meta.progressDate !== undefined && meta.progressDate !== null && typeof meta.progressDate !== 'string') return null;
      if (properties.progressTracked && meta.progressTracked !== undefined && typeof meta.progressTracked !== 'boolean') return null;
      if (properties.folderPending && meta.folderPending !== undefined && typeof meta.folderPending !== 'boolean') return null;
      if (properties.repeatAt && meta.repeatAt !== undefined && (!Number.isInteger(meta.repeatAt) || meta.repeatAt < 0)) return null;
      for (const key of ['progressPercent', 'lastRecordedPercent']) {
        if (properties[key] && meta[key] !== undefined && (!Number.isInteger(meta[key]) || meta[key] < 0 || meta[key] > 100)) return null;
      }
      return { present: rowPaintFields.reduce((mask, key, i) => properties[key] ? mask | (1 << i) : mask, 0),
        values: rowPaintFields.map((key) => key === 'guideLevels' ? guideValues : properties[key] && properties[key].value) };
    }
    function currentPlainRender(context) {
      return context.renderSerial === plainRenderSerial && context.inputSerial === plainInputSerial && context.epoch === inputEpoch &&
        context.raw === textarea.value && context.start === selection.start && context.end === selection.end && context.direction === selection.direction &&
        context.start === textarea.selectionStart && context.end === textarea.selectionEnd && context.direction === (textarea.selectionDirection || 'none') &&
        !destroyed && mode === 'live' && !composing && !nativeDepth && !readingView && !foldedIds.size && !hiddenRows.size &&
        !gesture && !moveState && !activePointers.size && doc.activeElement === textarea && !textarea.readOnly && !textarea.disabled &&
        context.start === context.end && context.controls === (config.controls !== false);
    }
    function copyRowRender(context, lines, metadata, fenced, startLine, endLine, actionsDisabled) {
      if (actionsDisabled || startLine !== endLine || !currentPlainRender(context)) return null;
      // These extra display guards may reject exotic metadata; let the unchanged
      // renderer handle it rather than adding a new input failure.
      try {
      if (!Array.isArray(metadata) || Object.getPrototypeOf(metadata) !== Array.prototype) return null;
      const rowProperties = Object.getOwnPropertyDescriptors(metadata);
      if (Reflect.ownKeys(rowProperties).length !== lines.length + 1 || rowProperties.length.value !== lines.length) return null;
      const paint = [], ids = new Set();
      for (let index = 0; index < lines.length; index++) {
        const item = rowProperties[index];
        if (!item || !('value' in item)) return null;
        const meta = copyRowPaintMeta(item.value, index, lines.length);
        if (!meta || ids.has(meta.values[0])) return null;
        ids.add(meta.values[0]); paint.push(meta);
      }
      return { ...context, lines: lines.slice(), fenced: fenced.slice(), paint, activeIndex: startLine };
      } catch (_) { return null; }
    }
    function connectedRowRender(snapshot) {
      return root.isConnected && mirror.isConnected && rows.length === snapshot.lines.length && mirror.childNodes.length === rows.length &&
        snapshot.rowNodes && rows.every((row, index) => row === snapshot.rowNodes[index] && row === mirror.childNodes[index] && row.parentElement === mirror) &&
        (config.controls === false || (controls.isConnected && controls.parentElement === root)) &&
        [...checkButtons, ...rowButtons, ...foldButtons].every(({ button, row }) => button.isConnected && button.parentElement === controls && row === rows[Number(button.dataset.lineIndex)]);
    }
    function sameRowPaint(previous, next, allowLabel) {
      if (previous.present !== next.present) return false;
      return previous.values.every((value, index) => {
        if (allowLabel && rowPaintFields[index] === 'label') return true;
        const after = next.values[index];
        return Array.isArray(value) ? Array.isArray(after) && value.length === after.length && value.every((part, i) => part === after[i]) : Object.is(value, after);
      });
    }
    function plainRowPatch(previous, next, hint) {
      if (!previous || !next || !hint || hint.base !== previous || hint.inputSerial !== plainInputSerial || hint.epoch !== inputEpoch ||
          hint.raw !== next.raw || hint.start !== next.start || hint.end !== next.end || hint.direction !== next.direction ||
          previous.controls !== next.controls || previous.activeIndex !== next.activeIndex || previous.lines.length !== next.lines.length || !connectedRowRender(previous)) return null;
      const index = next.activeIndex;
      for (let row = 0; row < next.lines.length; row++) {
        if (previous.fenced[row] !== next.fenced[row] || (row !== index && previous.lines[row] !== next.lines[row]) ||
            !sameRowPaint(previous.paint[row], next.paint[row], row === index)) return null;
      }
      const before = previous.lines[index], after = next.lines[index], meta = next.paint[index].values, oldMeta = previous.paint[index].values;
      if (!before || !after || /^[\s\-+*#>\x60~\[]/.test(before) || /^[\s\-+*#>\x60~\[]/.test(after) || /[\r\n]/.test(after) ||
          next.fenced[index] || meta[1] !== 'note' || meta[2] !== false || meta[3] !== 0 || meta[4].length || oldMeta[6] !== before || meta[6] !== after) return null;
      const row = rows[index], text = row.firstChild;
      if (!row.classList.contains('tle-line-raw') || row.classList.contains('tle-line-active-paint') || row.dataset.checkOwner !== undefined ||
          row.childNodes.length !== 1 || !text || text.nodeType !== 3 || text.data !== before) return null;
      return text;
    }
    function promotePlainInput(origin, event, epoch) {
      if (!origin || origin.base !== completedRowRender || origin.inputSerial !== plainInputSerial || origin.epoch + 1 !== epoch || epoch !== inputEpoch ||
          origin.event.defaultPrevented || event.defaultPrevented || event.inputType !== 'insertText' || event.isComposing || composing || nativeDepth || event.data !== origin.data ||
          textarea.value !== origin.raw.slice(0, origin.start) + origin.data + origin.raw.slice(origin.start) ||
          textarea.selectionStart !== origin.start + origin.data.length || textarea.selectionEnd !== textarea.selectionStart || doc.activeElement !== textarea) return;
      pendingPlainInput = { base: origin.base, inputSerial: plainInputSerial, epoch, raw: textarea.value,
        start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection || 'none' };
    }

    function render() {
      if (destroyed) return;
      const previousRowRender = completedRowRender, plainHint = pendingPlainInput;
      completedRowRender = null; pendingPlainInput = null; plainInputOrigin = null;
      const rowRenderContext = { renderSerial: ++plainRenderSerial, inputSerial: plainInputSerial, epoch: inputEpoch,
        raw: textarea.value, start: selection.start, end: selection.end, direction: selection.direction, controls: config.controls !== false };
      const visibleSelection = global.getSelection();
      if (readingView && mode === 'live' && !foldedIds.size && !root.classList.contains('tle-folded-view') && !gesture && !moveState &&
          doc.activeElement !== textarea && textarea.value === renderedValue && visibleSelection && !visibleSelection.isCollapsed &&
          mirror.contains(visibleSelection.anchorNode) && mirror.contains(visibleSelection.focusNode)) {
        // Resize/refresh must not replace the text nodes being selected to copy.
        syncGeometry(); return;
      }
      if ((gesture && gesture.source !== textarea.value) || (moveState && moveState.value !== textarea.value)) cancelMove(true);
      if (gesture && ['pending', 'scrolling'].includes(gesture.phase)) { deferredGestureRender = true; syncGeometry(); return; }
      const focusedControl = doc.activeElement && (doc.activeElement.classList.contains('tle-check-hit') || doc.activeElement.classList.contains('tle-row-open') || doc.activeElement.classList.contains('tle-fold-toggle'))
        ? { line: doc.activeElement.dataset.lineIndex, action: doc.activeElement.dataset.action || 'toggle' } : null;
      const lines = rowRenderContext.raw.split('\n');
      const metadata = getRowMeta();
      const actionsDisabled = typeof config.isActionDisabled === 'function' && config.isActionDisabled();
      // A save in flight disables actions, not the row metadata: progress rows keep their paint instead of
      // dropping to RAW '- [30%]' for that moment. Hosts without the hook keep the action rule.
      const paintDisabled = typeof config.isPaintDisabled === 'function' ? config.isPaintDisabled() : actionsDisabled;
      const foldable =Object.entries(metadata).filter(([index, meta]) => meta && meta.kind === 'scope' && typeof meta.id === 'string' && Number.isInteger(meta.subtreeEndIndex) && meta.subtreeEndIndex > Number(index) + 1 && meta.subtreeEndIndex <= lines.length);
      const availableIds = new Set(foldable.map(([, meta]) => meta.id));
      foldedIds.forEach((foldId) => { if (!availableIds.has(foldId)) foldedIds.delete(foldId); });
      hiddenRows = new Set();
      foldable.forEach(([index, meta]) => {
        if (foldedIds.has(meta.id)) for (let child = Number(index) + 1; child < meta.subtreeEndIndex; child += 1) hiddenRows.add(child);
      });
      applyFoldView();
      const fenced = protectedFenceLines(lines);
      const editorActive = doc.activeElement === textarea || composing;
      const nextReadingView = mode === 'live' && !editorActive && selection.start === selection.end;
      const layoutChanged = !gesture && !moveState && nextReadingView !== readingView;
      const anchor = layoutChanged ? viewAnchor() : null;
      if (layoutChanged) readingView = nextReadingView;
      root.classList.toggle('tle-reading-view', readingView);
      root.classList.toggle('tle-edit-check-ready', checkControlVisible() && !readingView && !foldedIds.size && !moveState);
      const startLine = lineAt(composing ? Math.min(compositionAnchor, selection.start) : selection.start);
      const lastSelectedOffset = composing ? Math.max(compositionAnchor, selection.end) : selection.end > selection.start ? selection.end - 1 : selection.end;
      const endLine = lineAt(lastSelectedOffset);
      const nextRowRender = copyRowRender(rowRenderContext, lines, metadata, fenced, startLine, endLine, actionsDisabled);
      const patchText = plainRowPatch(previousRowRender, nextRowRender, plainHint);
      if (patchText) {
        patchText.data = lines[startLine];
      } else {
      const fragment = doc.createDocumentFragment();
      rows = [];
      checkButtons.forEach(({ button }) => button.remove());
      checkButtons = [];
      rowButtons.forEach(({ button }) => button.remove());
      rowButtons = [];
      foldButtons.forEach(({ button }) => button.remove());
      foldButtons = [];
      lines.forEach((line, index) => {
        const row = doc.createElement('div');
        row.className = 'tle-line';
        row.dataset.lineIndex = String(index);
        row.dataset.sourceBlank = String(!line.trim());
        row.hidden = hiddenRows.has(index);
        if (foldedIds.size && !row.hidden) {
          row.tabIndex = 0;
          row.setAttribute('role', 'button');
          row.setAttribute('aria-label', `펼쳐서 편집: ${line.trim() || '빈 줄'}`);
          const edit = () => { unfoldAll(); api.focus(index); };
          row.addEventListener('click', edit);
          row.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); edit(); } });
        }
        const active = editorActive && index >= startLine && index <= endLine;
        if (composing && active && mode === 'live') row.classList.add('tle-line-composition');
        const label = dateLabel(line);
        const meta = metadata[index];
        const safeMeta = meta && typeof meta === 'object' ? meta : null;
        const parsedTask = matchTask(line, safeMeta, false, paintDisabled);
        const task = parsedTask && (/^[ xX]$/.test(parsedTask[2]) || progressPercent(safeMeta) !== null) ? parsedTask : null;
        const heading = safeMeta && safeMeta.kind === 'heading' ? /^ *(#{1,6})\s+(\S.*)$/.exec(line) : null;
        const checkOwner = fenced[index] ? null : task && safeMeta && CHECK_KINDS.includes(safeMeta.kind) ? index : propertyCheckOwner(index, metadata);
        if (checkOwner !== null) row.dataset.checkOwner = String(checkOwner);
        if (checkOwner !== null && safeMeta.kind === 'property' && /^[ \t]+-\s+메모:/.test(line)) row.classList.add('tle-line-owned-memo');
        const rawIndent = indentation(line);
        row.style.setProperty('--tle-indent', '0px');
        row.dataset.depth = String(safeMeta && Number.isInteger(safeMeta.depth) ? safeMeta.depth : rawIndent.columns / 2);
        row.style.setProperty('--tle-reading-depth', row.dataset.depth);
        if (safeMeta && !fenced[index]) {
          if (typeof safeMeta.kind === 'string') row.dataset.rowKind = safeMeta.kind;
          if (safeMeta.scopeKind === 'folder' || safeMeta.scopeKind === 'flow') row.dataset.scopeKind = safeMeta.scopeKind;
          if (safeMeta.dateMismatch) row.dataset.dateMismatch = 'true';
          if (safeMeta.scopeMismatch) row.dataset.scopeMismatch = 'true';
        }
        if ((mode === 'text' && !foldedIds.size) || active || fenced[index]) {
          row.classList.add('tle-line-raw');
          row.textContent = line || '\u200b';
          // IME keeps the existing native row mask and browser-owned paint.
          if (mode === 'live' && active && !composing && !fenced[index]) {
            paintActiveSyntax(row, line, task, safeMeta, checkOwner !== null && !!safeMeta && safeMeta.kind === 'property');
            const glyph = task && row.querySelector('.tle-check-glyph');
            if (glyph) addCheckButton(index, row, glyph, task, safeMeta);
          }
        } else if (safeMeta && safeMeta.folderPending === true && /^(?:  )*- \/[^/]+$/.test(line)) {
          // W17 is painted only off the native edited row; text and caret advances stay RAW.
          row.classList.add('tle-line-folder-pending');
          const prefix = /^( *)- /.exec(line)[0];
          row.append(makeSpan('tle-pending-prefix', prefix), makeSpan('tle-pending-name', line.slice(prefix.length)));
          const pendingIcon = makeSpan('tle-pending-folder-icon', '');
          pendingIcon.style.left = rawIndent.prefix.length + 'ch';
          pendingIcon.setAttribute('aria-hidden', 'true'); pendingIcon.append(icon('folder')); row.append(pendingIcon);
        } else if (safeMeta && safeMeta.kind === 'scope') {
          row.classList.add('tle-line-scope');
          row.append(makeSpan('tle-date-source', line));
          const scopeAnchor = makeSpan('tle-scope-anchor', '');
          if (['folder', 'flow'].includes(safeMeta.scopeKind)) {
            const meaning = makeSpan('tle-passive-meaning tle-passive-scope', '');
            meaning.dataset.scopeKind = safeMeta.scopeKind;
            meaning.setAttribute('aria-hidden', 'true');
            meaning.append(icon(safeMeta.scopeKind));
            scopeAnchor.append(meaning);
          }
          row.append(scopeAnchor);
          const decorated = doc.createElement('span');
          decorated.className = 'tle-scope-label';
          // W4 (folder grammar F9): a line linked to a folder elsewhere names that folder's parent, muted.
          // The parent's name truncates on its own, so the '›' and the folder's own name keep their place.
          if (typeof safeMeta.scopePlace === 'string' && safeMeta.scopePlace) {
            const place = makeSpan('tle-scope-place', ' ›');
            place.prepend(makeSpan('tle-scope-place-name', safeMeta.scopePlace));
            decorated.append(place);
          }
          decorated.append(makeSpan('tle-scope-name',typeof safeMeta.label === 'string' ? safeMeta.label : line.replace(/^\s*-\s*/, '')));
          if (typeof safeMeta.subtitle === 'string' && safeMeta.subtitle) decorated.append(makeSpan('tle-scope-subtitle', safeMeta.subtitle));
          row.append(decorated);
          // U45 folder rows (UX, 11/3): reading, writing and folded draw the same name and icon in place over RAW.
          if (!gesture && !moveState && ['folder', 'flow'].includes(safeMeta.scopeKind)) {
            // Preserve the exact RAW ruler and controls; only replace its paint.
            row.classList.add('tle-line-native-scope');
            paintActiveSyntax(row, line, null, safeMeta);
          }
          addRowButton('scope-open', index, row, safeMeta);
          // Visual A (11/7): marks the folder whose lines hold the caret (a presentation flag; no text or ruler change).
          if (editorActive && Number.isInteger(safeMeta.subtreeEndIndex) && index < startLine && startLine < safeMeta.subtreeEndIndex) row.dataset.caretScope = 'true';
          addFoldButton(index, row, safeMeta);
        } else if (label) {
          // Invisible RAW content reserves exact textarea wrapping/height.
          // The human date label is an absolute decoration, never a text edit.
          row.classList.add('tle-line-date');
          // Visual A (11/7): today, yesterday and tomorrow are marked for the host to name; the label's text is unchanged.
          const dateSpan = makeSpan('tle-date-label', label), near = relativeDay(line);
          if (near) dateSpan.dataset.relative = near;
          row.append(makeSpan('tle-date-source', line), dateSpan);
        } else if (heading) {
          // W3: a heading is painted like a date label: its RAW text keeps the exact wrapping, unseen, under the title.
          // The title wraps over the same box (CSS), and the reading surface exposes it as a heading of its level.
          row.classList.add('tle-line-heading');
          const title = makeSpan('tle-date-label tle-heading-label', heading[2]);
          title.setAttribute('role', 'heading');
          title.setAttribute('aria-level', String(heading[1].length));
          row.append(makeSpan('tle-date-source', line), title);
        } else if (task) {
          const progress = progressPercent(safeMeta);
          const complete = progress !== null ? progress === 100 : task[2].toLowerCase() === 'x';
          row.classList.add('tle-line-task');
          if (complete) row.classList.add('tle-line-complete');
          const prefix = line.slice(0, line.length - task[4].length);
          row.dataset.taskPrefixLength = String(prefix.length);
          const hidden = makeSpan('tle-hidden-syntax', prefix);
          const titleSpan = makeSpan(complete ? 'tle-task-title-complete' : 'tle-task-title', task[4]);
          // N10: a repeat line's marker stays in the title as its own (unseen) source text; its chip is drawn over it by
          // CSS from the data attribute, so taps and copies still map onto the RAW title.
          const repeatAt = safeMeta && typeof safeMeta.repeatLabel === 'string' && safeMeta.repeatLabel && Number.isInteger(safeMeta.repeatAt)
            && safeMeta.repeatAt > 0 && safeMeta.repeatAt < task[4].length ? safeMeta.repeatAt : 0;
          if (repeatAt) {
            titleSpan.textContent = task[4].slice(0, repeatAt);
            const marker = makeSpan('tle-repeat-source', task[4].slice(repeatAt));
            marker.dataset.repeatLabel = safeMeta.repeatLabel;
            titleSpan.append(marker);
            row.classList.add('tle-line-repeat');
          }
          row.append(hidden, titleSpan);
          const glyph = doc.createElement('span');
          glyph.className = 'tle-check-glyph';
          glyph.dataset.checked = String(complete);
          glyph.textContent = complete ? '✓' : '';
          const checkAnchor = makeSpan('tle-check-anchor', '');
          checkAnchor.append(glyph);
          row.append(checkAnchor);
          if (config.controls === false && progress > 0 && progress < 100) {
            glyph.classList.add('tle-progress-anchor');
            const badge = makeSpan('tle-progress-badge', `${progress}%`);
            badge.style.position = 'absolute'; badge.style.top = '10px'; badge.style.left = '-13px';
            checkAnchor.append(badge);
          } else if (progress > 0 && progress < 100) {
            // Meaning belongs to the row, not the action hidden during typing.
            // Keep it inside the existing decoration anchor for source mapping.
            const badge = makeSpan('tle-passive-meaning tle-passive-progress tle-progress-badge', `${progress}%`);
            badge.setAttribute('aria-hidden', 'true');
            checkAnchor.append(badge);
          }
          addCheckButton(index, row, glyph, task, safeMeta);
          if (safeMeta && safeMeta.kind === 'subcheck') row.classList.add('tle-line-subcheck');
          if (safeMeta && safeMeta.kind === 'reference') {
            row.classList.add('tle-line-reference');
          }
        } else {
          row.classList.add(PROPERTY.test(line) ? 'tle-line-property' : 'tle-line-prose');
          const propertyLabel = ownedPropertyLabel(line, safeMeta, metadata, index);
          const memo = !propertyLabel && checkOwner !== null && safeMeta.kind === 'property' ? /^([ \t]+-\s+메모:\s?)(.*)$/.exec(line) : null;
          if (propertyLabel) {
            // Passive paint uses the unchanged source as its wrapping ruler.
            // Active editing/selection and IME take the RAW branch above.
            row.classList.add('tle-line-date-property');
            row.append(makeSpan('tle-date-source', line), makeSpan('tle-date-label tle-property-date-label', propertyLabel));
          } else if (memo) {
            // W3: '- 메모:' stays in the flow, transparent, so wrapping is the RAW one; only the note is painted.
            row.classList.add('tle-line-memo');
            row.append(makeSpan('tle-memo-syntax', memo[1]), makeSpan('tle-memo-text', memo[2]));
          } else if (/^원문 소개:/.test(line)) {
            // P3 C7 (11/7): an imported Flow's summary line reads as its intro: '원문 소개:' stays in the flow, unseen, under a
            // small label the host draws, and the words are painted as a memo's are (the same spans: taps map the same way).
            const intro = /^(원문 소개:\s?)(.*)$/.exec(line);
            row.classList.add('tle-line-intro');
            row.append(makeSpan('tle-memo-syntax', intro[1]), makeSpan('tle-memo-text', intro[2]));
          } else row.textContent = line || '\u200b';
        }
        if ((mode === 'live' || foldedIds.size) && index !== startLine && !fenced[index] && task && safeMeta) {
          if (safeMeta.kind === 'reference') addRowButton(safeMeta.scopeMismatch && !safeMeta.dateMismatch ? 'task-origin' : 'reference-open', index, row, safeMeta);
          else if ((safeMeta.kind === 'task' || safeMeta.isCanonical === true) && safeMeta.dateMismatch && !ownsDateLine(index, lines, metadata)) addRowButton('task-date', index, row, safeMeta);
          else if ((safeMeta.kind === 'task' || safeMeta.isCanonical === true) && safeMeta.scopeMismatch) addRowButton('task-origin', index, row, safeMeta);
        }
        if (mode === 'live' && !readingView && !foldedIds.size && !(composing && active) && !fenced[index] && checkOwner !== null) {
          const membership = makeSpan('tle-item-membership', '');
          membership.setAttribute('aria-hidden', 'true');
          row.append(membership);
        }
        if (mode === 'live' && !fenced[index] && safeMeta && Array.isArray(safeMeta.guideLevels)) {
          [...new Set(safeMeta.guideLevels)].filter((depth) => Number.isInteger(depth) && depth >= 0 && depth <= MAX_DEPTH && depth * 2 < rawIndent.columns).forEach((depth) => {
            const guide = makeSpan('tle-indent-guide', '');
            guide.setAttribute('aria-hidden', 'true');
            guide.dataset.indentColumns = String(depth * 2);
            row.append(guide);
          });
        }
        rows.push(row);
        fragment.append(row);
      });
      mirror.replaceChildren(fragment);
      }
      renderedValue = textarea.value;
      syncGeometry();
      syncNativePaint(true);
      if (anchor) { restoreViewAnchor(anchor); syncGeometry(); }
      paintMoveState();
      if (focusedControl) {
        const replacement = [...checkButtons, ...rowButtons, ...foldButtons].find(({ button }) => button.dataset.lineIndex === focusedControl.line && (button.dataset.action || 'toggle') === focusedControl.action);
        if (replacement && !replacement.button.hidden) {
          if(replacement.button.disabled&&replacement.button.classList.contains('tle-check-hit')){
            replacement.button.disabled=false;replacement.button.setAttribute('aria-disabled','true');
          }
          replacement.button.focus({ preventScroll: true });
        }
      }
      if (nextRowRender && currentPlainRender(nextRowRender)) {
        nextRowRender.rowNodes = rows.slice();
        if (connectedRowRender(nextRowRender)) completedRowRender = nextRowRender;
      }
    }

    function rejectInput(intent) {
      inputRejected = true;
      indentLease = null;
      if (typeof config.onInputRejected === 'function') config.onInputRejected(intent);
      return false;
    }
    function canApplyInput(nextRaw, intent) {
      return typeof config.canApplyInput !== 'function' || config.canApplyInput(nextRaw, intent) === true || rejectInput(intent);
    }
    function replaceRange(start, end, text, settings) {
      invalidatePlainRowInput();
      if (destroyed || composing || nativeDepth) return false;
      const before = textarea.value;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > before.length) return false;
      const insertion = String(text);
      const expected = before.slice(0, start) + insertion + before.slice(end);
      if (expected === before) return true;
      remember();
      const previousSelection = { ...selection };
      let selectionAfter;
      if (settings && settings.preserveSelection) {
        const delta = insertion.length - (end - start);
        const translate = offset => offset <= start ? offset : offset >= end ? offset + delta : start + insertion.length;
        selectionAfter = { start: translate(previousSelection.start), end: translate(previousSelection.end), direction: previousSelection.direction };
      } else if (settings && settings.selectionAfter) selectionAfter = { direction: 'none', ...settings.selectionAfter };
      else selectionAfter = { start: start + insertion.length, end: start + insertion.length, direction: 'none' };
      const intent = { ...(settings && settings.intent), kind: settings && settings.intent && settings.intent.kind || 'replace',
        start, end, text: insertion, selectionBefore: previousSelection, selectionAfter };
      if (intent.taskSplit && (typeof config.canApplyTaskSplit !== 'function' || config.canApplyTaskSplit(expected, intent) !== true)) return rejectInput(intent);
      if (!canApplyInput(expected, intent)) return false;
      if (typeof doc.execCommand !== 'function') return false;
      unfoldAll();
      if (moveState || gesture) cancelMove(true);
      textarea.focus({ preventScroll: true });
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      textarea.setSelectionRange(start, end);
      nativeDepth += 1;
      pendingChange = false;
      try { doc.execCommand('insertText', false, insertion); } catch (_) { /* No fabricated undo fallback. */ }
      nativeDepth -= 1;
      const applied = textarea.value === expected;
      if (applied) {
        textarea.setSelectionRange(selectionAfter.start, selectionAfter.end, selectionAfter.direction);
      } else if (!applied && textarea.value === before) {
        textarea.setSelectionRange(previousSelection.start, previousSelection.end, previousSelection.direction);
      }
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
      if (textarea.value !== before) { inputEpoch++; indentLease = null; }
      remember();
      if (pendingChange || textarea.value !== before) {
        if (applied && intent.kind === 'enter' && intent.taskSplit) publish('insertText', { start, end, text: insertion }, false, intent.taskSplit);
        else publish();
      } else render();
      pendingChange = false;
      return applied;
    }
    function insert(text, intent) {
      return replaceRange(selection.start, selection.end, text, { intent });
    }
    // A host may let ⇤·⇥ through while its other actions wait (S5: a save in flight keeps typed input, so an indent
    // can join it); without that hook indent follows isActionDisabled as before.
    const indentDisabled = () => typeof config.isIndentDisabled === 'function' ? config.isIndentDisabled()
      : typeof config.isActionDisabled === 'function' && config.isActionDisabled();
    function indent(outdent) {
      if (destroyed || composing || nativeDepth || indentDisabled()) return false;
      remember();
      if (typeof config.canApplyIndent !== 'function' && typeof config.canApplyInput !== 'function') return false;
      let plan = inputPlans.planIndent(textarea.value, selection, getRowMeta(), Boolean(outdent), protectedFenceLines(textarea.value.split('\n')), indentLease, inputEpoch);
      if (!plan) return false;
      if (typeof config.adjustIndentPlan === 'function') {
        const adjusted = config.adjustIndentPlan({ ...plan, selectionBefore: { ...selection } });
        if (adjusted) {
          if (textarea.value.slice(0, adjusted.start) + adjusted.text + textarea.value.slice(adjusted.end) !== adjusted.nextRaw) return false;
          plan = adjusted;
        }
      }
      const intent = { kind: 'indent', start: plan.start, end: plan.end, text: plan.text, outdent: plan.outdent,
        startLine: plan.startLine, endLine: plan.endLine, selectionBefore: { ...selection }, selectionAfter: plan.selectionAfter };
      if (typeof config.canApplyIndent === 'function' && config.canApplyIndent(plan.nextRaw, intent) !== true) {
        return typeof config.canApplyInput === 'function' ? rejectInput(intent) : false;
      }
      let applied = false;
      try {
        if (typeof config.onIndentStart === 'function') config.onIndentStart(plan);
        applied = replaceRange(plan.start, plan.end, plan.text, { selectionAfter: plan.selectionAfter, intent });
      } finally { if (typeof config.onIndentEnd === 'function') config.onIndentEnd(); }
      indentLease = applied ? inputPlans.indentLease(plan, inputEpoch) : null;
      return applied;
    }
    function undo() {
      invalidatePlainRowInput();
      if (destroyed || composing || typeof doc.execCommand !== 'function') return false;
      inputEpoch++; indentLease = null;
      unfoldAll();
      const before = textarea.value;
      textarea.focus({ preventScroll: true });
      nativeDepth += 1;
      try { doc.execCommand('undo'); } catch (_) { /* Leave browser state alone. */ }
      nativeDepth -= 1;
      publish();
      return textarea.value !== before;
    }
    function onKeydown(event) {
      if (imeEnterCycle.keydown(event)) { event.preventDefault(); return; }
      if (composing || event.isComposing || event.keyCode === 229 || event.defaultPrevented) return;
      remember();
      inputRejected = false;
      if (event.key === 'Escape') { nextTabLeaves = true; indentLease = null; return; }
      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (nextTabLeaves) { nextTabLeaves = false; return; }
        if (indent(event.shiftKey) || inputRejected) event.preventDefault();
        return;
      }
      if (event.key.length === 1 || ['Enter', 'Backspace', 'Delete'].includes(event.key)) nextTabLeaves = false;
      if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.altKey || textarea.readOnly) return;
      // A real Enter (past the IME and modifier guards) may first finish a line the host holds; the row
      // is read after it, so a just-declared folder line opens its indented line.
      if (typeof config.beforeEnter === 'function') config.beforeEnter();
      if(addSettings.lineBreakEnter()){event.preventDefault();insert('\n',{kind:'enter'});return;}
      const line = rangeOfLine(lineAt(selection.start));
      const fenced = protectedFenceLines(textarea.value.split('\n'))[line.index];
      const meta = getRowMeta()[line.index];
      const defaultEnter = () => {
        const caret = selection.start + 1;
        const intent = { kind: 'enter', start: selection.start, end: selection.end, text: '\n', selectionBefore: { ...selection },
          selectionAfter: { start: caret, end: caret, direction: 'none' } };
        if (!canApplyInput(textarea.value.slice(0, selection.start) + '\n' + textarea.value.slice(selection.end), intent)) event.preventDefault();
      };
      if (fenced) { defaultEnter(); return; }
      // memo-enter (11/10): Enter on an empty memo line leaves the memo for the owner's next task; Shift+Enter (and the
      // bar's ↵) still continue it.
      const memoExit = !event.shiftKey ? inputPlans.planMemoExit(textarea.value, selection, meta) : null;
      if (memoExit) {
        const left = replaceRange(memoExit.start, memoExit.end, memoExit.text, { selectionAfter: memoExit.selectionAfter, intent: { kind: 'enter' } });
        if (left || inputRejected) event.preventDefault();
        else defaultEnter();
        if (left && typeof config.onMemoExit === 'function') config.onMemoExit();
        return;
      }
      const memo = inputPlans.planMemoEnter(textarea.value, selection, meta);
      if (memo) {
        const continued = replaceRange(memo.start, memo.end, memo.text, { selectionAfter: memo.selectionAfter, intent: { kind: 'enter' } });
        if (continued || inputRejected) event.preventDefault();
        else defaultEnter();
        // memo-enter (11/10): a plain Enter that continued the memo lets the host say how to leave it.
        if (continued && !event.shiftKey && typeof config.onMemoContinue === 'function') config.onMemoContinue();
        return;
      }
      // listEnterV2: Shift+Enter at the end of a titled task adds that task's memo line.
      const taskMemo = event.shiftKey && addSettings.listEnterV2() ? inputPlans.planTaskMemoEnter(textarea.value, selection, meta) : null;
      if (taskMemo) {
        if (replaceRange(taskMemo.start, taskMemo.end, taskMemo.text, { selectionAfter: taskMemo.selectionAfter, intent: { kind: 'enter' } }) || inputRejected) event.preventDefault();
        else defaultEnter();
        return;
      }
      if (event.shiftKey || selection.start !== selection.end) { defaultEnter(); return; }
      const actionsDisabled = typeof config.isActionDisabled === 'function' && config.isActionDisabled();
      const task = matchTask(line.text, meta, false, actionsDisabled);
      const prefix = indentation(line.text).prefix;
      let handled = false;
      if (matchTask(line.text, meta, true, actionsDisabled)) {
        handled = replaceRange(line.start, line.end, prefix.slice(0, Math.max(0, prefix.length - 2)), { intent: { kind: 'enter' } });
      } else if (task && selection.start >= line.end - task[4].length - task[3].length) {
        if (selection.start === line.end) {
          const next = inputPlans.planTaskEnter(textarea.value, selection, meta);
          if (next) handled = replaceRange(next.start, next.end, next.text, { selectionAfter: next.selectionAfter, intent: { kind: 'enter' } });
        } else {
          const taskSplit = config.taskSplitEnabled ? {
            kind: 'task-title-split', sourceLineId: meta && meta.id, sourceRaw: textarea.value,
          } : null;
          const split = taskSplit && inputPlans.planTaskPropertySplit(textarea.value, selection, meta);
          if (split) handled = replaceRange(split.start, split.end, split.text, {
            selectionAfter: split.selectionAfter, intent: { kind: 'enter', taskSplit },
          });
          else handled = insert(`\n${task[1]}- [ ] `, { kind: 'enter', ...(taskSplit ? { taskSplit } : {}) });
        }
      } else if (dateLabel(line.text) && selection.start === line.end) {
        handled = insert(addSettings.listEnterV2() ? `\n${prefix}` : `\n${prefix}- [ ] `, { kind: 'enter' });
      } else if (meta && meta.kind === 'scope' && meta.depth < MAX_DEPTH && selection.start === line.end) {
        handled = insert(addSettings.listEnterV2() ? `\n${prefix}  ` : `\n${prefix}  - [ ] `, { kind: 'enter' });
      } else if (/^ *-\s+\S/.test(line.text) && !EMPTY_TASK.test(line.text) && !TASK.test(line.text) && selection.start === line.end) {
        handled = insert(`\n${prefix}- `, { kind: 'enter' });
      } else if (/^ *(?:-\s*)?$/.test(line.text) && prefix.length) {
        handled = replaceRange(line.start, line.end, prefix.slice(0, Math.max(0, prefix.length - 2)), { intent: { kind: 'enter' } });
      } else if (prefix && selection.start >= line.start + prefix.length) {
        handled = insert(`\n${prefix}`, { kind: 'enter' });
      }
      if (handled || inputRejected) event.preventDefault();
      else defaultEnter();
    }

    listen(textarea, 'input', (event) => {
      // Paint uses the browser-owned value for every input kind, before domain
      // publication. No mirror/metadata/RAF completion owns native characters.
      syncNativePaint();
      const plainOrigin = plainInputOrigin;
      plainInputOrigin = null; pendingPlainInput = null;
      inputEpoch++; indentLease = null;
      const plainEpoch = inputEpoch;
      imeEnterCycle.input(event);
      if (foldedIds.size) unfoldAll();
      if (moveState || gesture) cancelMove(true);
      nextTabLeaves = false;
      if (composing || event.isComposing) { remember(); scheduleRender(); return; }
      if (nativeDepth) { pendingChange = true; return; }
      const source = pasteSource; pasteSource = null;
      let inputSplice;
      if (event.inputType === 'insertFromPaste' && source) {
        const length = textarea.value.length - source.raw.length + source.end - source.start;
        if (length >= 0 && textarea.value.slice(0, source.start) === source.raw.slice(0, source.start) &&
            textarea.value.slice(source.start + length) === source.raw.slice(source.end)) {
          inputSplice = { start: source.start, end: source.end, text: textarea.value.slice(source.start, source.start + length) };
        }
      }
      publish(event.inputType || 'insertText', inputSplice, true);
      promotePlainInput(plainOrigin, event, plainEpoch);
    });
    ['select', 'click'].forEach((type) => listen(textarea, type, () => {
      if (type === 'click') imeEnterCycle.cancel(); else imeEnterCycle.reconcile();
      invalidatePlainRowInput(); viewportCaretOwned = true; remember();
      if (type === 'click') queueClickViewportReveal();
      else if (textarea.selectionStart !== textarea.selectionEnd || (clickViewportReveal && !isCurrentClickViewportReveal(clickViewportReveal))) cancelClickViewportReveal();
      scheduleRender();
    }));
    listen(textarea, 'focus', () => { invalidatePlainRowInput(); viewportCaretOwned = true; if (gesture || moveState) cancelMove(true); remember(); syncNativePaint(); render(); revealFocusedCaret(); });
    listen(textarea, 'keyup', (event) => { imeEnterCycle.keyup(event); if (!['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) viewportCaretOwned = true; remember(); captureEndCaretReveal(event); scheduleRender(); });
    listen(textarea, 'blur', (event) => { imeEnterCycle.cancel(); cancelClickViewportReveal(); invalidatePlainRowInput(); remember(); captureBlurReveal(event); scheduleRender(); });
    ['wheel', 'pointerdown', 'touchstart'].forEach((type) => listen(root, type, () => { imeEnterCycle.cancel(); cancelClickViewportReveal(); invalidatePlainRowInput(); viewportCaretOwned = false; viewportRevealPending = false; viewportScreenRevealPending = false; pendingBlurReveal = null; pendingEndCaretReveal = null; }, { capture: true, passive: true }));
    listen(textarea, 'scroll', () => { syncNativePaint(); syncGeometry(); }, { passive: true });
    listen(viewport, 'scroll', syncGeometry, { passive: true });
    listen(textarea, 'paste', () => { pasteSource = !composing ? { raw: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd } : null; });
    listen(textarea, 'beforeinput', (event) => {
      plainInputOrigin = null; pendingPlainInput = null; plainInputSerial++;
      if (event.inputType !== 'insertFromPaste') pasteSource = null;
      if (foldedIds.size) event.preventDefault();
      const base = completedRowRender;
      if (!event.defaultPrevented && event.inputType === 'insertText' && typeof event.data === 'string' && event.data.length && !/[\r\n]/.test(event.data) &&
          !event.isComposing && base && base.epoch === inputEpoch && base.raw === textarea.value && !composing && !nativeDepth &&
          !gesture && !moveState && !activePointers.size && mode === 'live' && !readingView && !foldedIds.size && !textarea.readOnly && !textarea.disabled &&
          doc.activeElement === textarea && textarea.selectionStart === textarea.selectionEnd) {
        plainInputOrigin = { base, event, inputSerial: plainInputSerial, epoch: inputEpoch, raw: textarea.value,
          start: textarea.selectionStart, data: event.data };
      }
    });
    listen(doc, 'copy', copyPresentation);
    listen(textarea, 'keydown', onKeydown);
    listen(textarea, 'compositionstart', () => { imeEnterCycle.start(); cancelClickViewportReveal(); invalidatePlainRowInput(); inputEpoch++; indentLease = null; cancelMove(true); remember(); compositionAnchor = selection.start; composing = true; root.classList.add('tle-composing'); syncNativePaint(); scheduleRender(); });
    listen(textarea, 'compositionend', (event) => { invalidatePlainRowInput(); composing = false; root.classList.remove('tle-composing'); syncNativePaint(); publish('insertCompositionText',undefined,true); imeEnterCycle.end(event); if (viewportScreenRevealPending) { if (viewportCaretOwned && doc.activeElement === textarea) { viewportRevealPending = true; scheduleRender(); } else viewportScreenRevealPending = false; } });
    listen(doc, 'selectionchange', () => { imeEnterCycle.reconcile(); if (clickViewportReveal && !isCurrentClickViewportReveal(clickViewportReveal)) cancelClickViewportReveal(); if (doc.activeElement === textarea) { remember(); syncNativePaint(); scheduleRender(); } else if (readingView) scheduleRender(); });
    listen(viewport, 'pointerdown', (event) => { readingPointerAt = readingView && ['touch', 'pen'].includes(event.pointerType) ? event.timeStamp : null; });
    listen(viewport, 'pointercancel', () => { readingPointerAt = null; });
    listen(viewport, 'click', editReadingPoint);
    listen(plus, 'pointerdown', (event) => event.preventDefault());
    listen(plus, 'click', () => action(addSettings.plusOpensAuthoring()?'authoring-insert':'insert',Number(plus.dataset.lineIndex??lineAt(selection.start))));
    gestureHandle(rowMenu, () => lineAt(selection.start), 'row-menu');
    listen(doc, 'pointerdown', (event) => {
      if (!root.contains(event.target)) { cancelClickViewportReveal(); viewportCaretOwned = false; viewportRevealPending = false; viewportScreenRevealPending = false; }
      pointerInsideEditorControl = event.target !== textarea && root.contains(event.target);
      if (!activePointers.size) { blockedClick = null; viewportTransitionUntil = 0; }
      activePointers.add(event.pointerId);
      if (activePointers.size > 1) cancelMove(true);
    }, true);
    listen(doc, 'pointermove', pointerMove, { capture: true, passive: false });
    listen(doc, 'pointerup', pointerEnd, true);
    listen(doc, 'pointercancel', (event) => { cancelClickViewportReveal(); pointerEnd(event); }, true);
    listen(root, 'lostpointercapture', (event) => { if (gesture && event.pointerId === gesture.pointerId) cancelMove(true); });
    listen(root, 'click', (event) => {
      if (blockedClick && Date.now() <= blockedClick.until && event.detail !== 0 && (event.pointerId == null || event.pointerId === blockedClick.pointerId)) {
        event.preventDefault(); event.stopImmediatePropagation(); blockedClick = null;
      }
    }, true);
    listen(root, 'contextmenu', (event) => { if (event.target.closest('.tle-move-handle')) event.preventDefault(); });
    listen(doc, 'scroll', (event) => {
      cancelClickViewportReveal();
      if (!gesture || gesture.phase === 'scrolling') return;
      if (gesture.phase === 'dragging' && event.target === scrollSurface() && gesture.expectedScrollTop === scrollSurface().scrollTop) { gesture.expectedScrollTop = null; return; }
      if (['selected', 'dragging'].includes(gesture.phase) && Date.now() <= viewportTransitionUntil) { syncGeometry(); return; }
      cancelMove(true);
    }, { capture: true, passive: true });
    listen(doc, 'wheel', () => { cancelClickViewportReveal(); viewportCaretOwned = false; viewportRevealPending = false; viewportScreenRevealPending = false; viewportTransitionUntil = 0; if (gesture) cancelMove(true); }, { capture: true, passive: true });
    listen(global, 'blur', () => { cancelClickViewportReveal(); activePointers.clear(); cancelMove(true); });
    listen(doc, 'visibilitychange', () => { if (doc.hidden) { cancelClickViewportReveal(); activePointers.clear(); cancelMove(true); } });
    // W12: on an empty line, once input rests for 0.4s, a muted '/ 메뉴' ('/ 폴더' on a bare '- ' line) shows where
    // '/' would go. It is an inert overlay in the controls layer (never RAW, saved or copied) and leaves at the first
    // key, composition or input of any kind, before the character is painted. An empty document has the placeholder.
    const lineHint = doc.createElement('div');
    lineHint.className = 'tle-line-hint';
    lineHint.setAttribute('aria-hidden', 'true');
    lineHint.hidden = true;
    controls.append(lineHint);
    let lineHintTimer = 0;
    function hideLineHint() {
      if (lineHintTimer) { global.clearTimeout(lineHintTimer); lineHintTimer = 0; }
      if (!lineHint.hidden) lineHint.hidden = true;
    }
    function armLineHint() {
      hideLineHint();
      if (!destroyed) lineHintTimer = global.setTimeout(showLineHint, 400);
    }
    function showLineHint() {
      lineHintTimer = 0;
      if (destroyed || composing || mode !== 'live' || readingView || foldedIds.size || gesture || moveState || textarea.readOnly ||
          doc.activeElement !== textarea || typeof config.lineHints !== 'function' || !config.lineHints()) return;
      const start = textarea.selectionStart;
      if (!textarea.value || start !== textarea.selectionEnd) return;
      const line = rangeOfLine(lineAt(start)), row = rows[line.index], node = row && row.firstChild, text = lineHintText(line.text);
      if (!text || start !== line.end || !node || node.nodeType !== 3) return;
      const caret = pointRange(node, Math.min(node.length, line.text.length)).getBoundingClientRect();
      const rowBox = row.getBoundingClientRect(), box = controls.getBoundingClientRect();
      lineHint.textContent = text;
      lineHint.style.left = `${caret.left - box.left}px`;
      lineHint.style.top = `${rowBox.top - box.top}px`;
      lineHint.hidden = false;
    }
    ['beforeinput', 'compositionstart', 'keydown', 'blur', 'pointerdown'].forEach((type) => listen(textarea, type, hideLineHint));
    ['input', 'compositionend', 'keyup', 'focus', 'select', 'click'].forEach((type) => listen(textarea, type, armLineHint));
    listen(textarea, 'scroll', armLineHint, { passive: true });
    listen(doc, 'selectionchange', () => { if (doc.activeElement === textarea && !composing) armLineHint(); });
    const observer = typeof global.ResizeObserver === 'function' ? new global.ResizeObserver(scheduleViewportRender) : null;
    if (observer) observer.observe(root);
    listen(global, 'resize', scheduleViewportRender);
    if (global.visualViewport) listen(global.visualViewport, 'resize', scheduleViewportRender);
    render();

    const api = {
      getValue: () => textarea.value,
      getSelection: () => ({ start: selection.start, end: selection.end, direction: selection.direction, selectionStart: selection.start, selectionEnd: selection.end, lineIndex: lineAt(selection.start) }),
      // Geometry read only: no render, focus, scroll or selection changes.
      caretRect(offset = textarea.selectionStart) {
        if (destroyed || !Number.isInteger(offset) || offset < 0 || offset > textarea.value.length) return null;
        const index = textarea.value.slice(0, offset).split('\n').length - 1;
        const row = nativePaintRaw === textarea.value ? nativePaintRows[index] : null;
        const node = row && row.firstChild;
        if (!node || node.nodeType !== 3 || row.hidden) return null;
        const start = textarea.value.lastIndexOf('\n', offset - 1) + 1;
        const box = pointRange(node, Math.min(node.length, offset - start)).getBoundingClientRect();
        if (!box.height) return null;
        return { left: box.left - textarea.scrollLeft, top: box.top - textarea.scrollTop,
          right: box.right - textarea.scrollLeft, bottom: box.bottom - textarea.scrollTop, width: box.width, height: box.height };
      },
      setValue(value, settings) {
        invalidatePlainRowInput();
        if (destroyed || composing) return false;
        const next = String(value == null ? '' : value);
        if (next === textarea.value) { render(); return true; }
        imeEnterCycle.cancel();
        unfoldAll();
        if (moveState || gesture) cancelMove(true);
        const beforeSelection = { ...selection };
        const top = textarea.scrollTop;
        const left = textarea.scrollLeft;
        inputEpoch++; indentLease = null;
        textarea.value = next;
        lastReported = textarea.value;
        lastPickerCandidate = null;
        if (settings && settings.selection) {
          // A caret the host mapped for a replaced line; the remembered selection follows it at once.
          const wanted = settings.selection;
          textarea.setSelectionRange(Math.min(next.length, wanted.start), Math.min(next.length, wanted.end), wanted.direction || 'none');
          textarea.scrollTop = top;
          textarea.scrollLeft = left;
        } else if (settings && settings.preserveSelection) {
          textarea.setSelectionRange(Math.min(next.length, beforeSelection.start), Math.min(next.length, beforeSelection.end), beforeSelection.direction);
          textarea.scrollTop = top;
          textarea.scrollLeft = left;
        } else {
          textarea.setSelectionRange(0, 0);
          textarea.scrollTop = 0;
          textarea.scrollLeft = 0;
        }
        remember();
        render();
        return true;
      },
      focus(lineIndex) {
        invalidatePlainRowInput();
        if (destroyed || composing) return false;
        unfoldAll();
        textarea.focus({ preventScroll: true });
        if (Number.isInteger(lineIndex)) {
          const line = rangeOfLine(lineIndex);
          textarea.setSelectionRange(line.end, line.end);
          remember();
          render();
          const row = rows[line.index];
          if (row && (row.offsetTop < textarea.scrollTop || row.offsetTop + 44 > textarea.scrollTop + textarea.clientHeight)) {
            textarea.scrollTop = Math.max(0, row.offsetTop - 44);
          }
        } else textarea.setSelectionRange(selection.start, selection.end, selection.direction);
        remember();
        render();
        return true;
      },
      focusControl(lineIndex) {
        invalidatePlainRowInput();
        if (destroyed || composing || gesture || mode !== 'live' || !Number.isInteger(lineIndex) || !rows[lineIndex]) return false;
        unfoldAll();
        if (doc.activeElement === textarea) textarea.blur();
        render();
        const entry = [...checkButtons, ...rowButtons.filter((item) => item.type === 'scope-open')].find((item) => Number(item.button.dataset.lineIndex) === lineIndex);
        if (!entry || entry.button.disabled) return false;
        const surface = scrollSurface();
        const top = entry.row.offsetTop;
        if (top < surface.scrollTop) surface.scrollTop = top;
        else if (top + 44 > surface.scrollTop + surface.clientHeight) surface.scrollTop = top + 44 - surface.clientHeight;
        syncGeometry();
        if (entry.button.hidden) return false;
        entry.button.focus({ preventScroll: true });
        const box = entry.button.getBoundingClientRect();
        if (box.top < 0 || box.bottom > global.innerHeight || box.left < 0 || box.right > global.innerWidth) entry.button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return doc.activeElement === entry.button;
      },
      insert,
      replaceRange,
      indent,
      // A writing-bar button acts exactly like the key: the Enter handler runs as for a real
      // Enter/Shift+Enter, and the line break a browser inserts for an unhandled key is inserted here.
      enter(shift) {
        if (destroyed || composing || textarea.readOnly) return false;
        let prevented = false;
        onKeydown({ key: 'Enter', code: 'Enter', keyCode: 13, shiftKey: !!shift, ctrlKey: false, metaKey: false, altKey: false, repeat: false,
          isComposing: false, defaultPrevented: false, cancelable: true, timeStamp: 0, preventDefault() { prevented = true; } });
        return prevented || insert('\n', { kind: 'enter' });
      },
      setMoveState,
      focusMoveTarget,
      prepareAction,
      prepareMove,
      toggleFold,
      isFolded,
      unfoldAll,
      undo,
      refresh: scheduleRender,
      refreshViewport: scheduleViewportRender,
      setMode(next) {
        invalidatePlainRowInput();
        if (next !== 'live' && next !== 'text') throw new TypeError('Mode must be live or text.');
        if (next !== mode) pendingBlurReveal = null;
        if (next !== mode && (gesture || moveState)) cancelMove(true);
        if (next !== mode) unfoldAll();
        mode = next;
        root.dataset.mode = mode;
        render();
      },
      destroy() {
        imeEnterCycle.cancel();
        invalidatePlainRowInput(); cancelClickViewportReveal();
        if (destroyed) return;
        cancelMove(false);
        hideLineHint();
        destroyed = true;
        if (renderFrame) global.cancelAnimationFrame(renderFrame);
        if (observer) observer.disconnect();
        listeners.forEach((remove) => remove());
        root.remove();
      },
    };
    api.getText = api.getValue;
    api.setText = api.setValue;
    return Object.freeze(api);
  }

  return create(container, options);
} });
