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

  function indentation(line) {
    const prefix = /^[ \t]*/.exec(line)[0];
    return { prefix, columns: prefix.replace(/\t/g, '  ').length };
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
    root.append(viewport, textarea, characterMetric);
    if (config.controls !== false) root.append(controls, moveLayer, moveStatus);
    container.append(root);

    let mode = 'live';
    let composing = false;
    let compositionAnchor = 0;
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
    let indentLease = null;
    let inputRejected = false;
    let pasteSource = null;
    function publish(inputType, inputSplice) {
      if (destroyed) return;
      remember();
      if (textarea.value !== lastReported) {
        lastReported = textarea.value;
        if (typeof config.onChange === 'function') config.onChange(lastReported, { inputType, inputSplice });
      }
      render();
      maybeRequestPicker(inputType);
    }
    let viewportRevealPending = false;
    let viewportCaretOwned = true;
    function scheduleViewportRender() { viewportRevealPending = viewportCaretOwned; scheduleRender(); }
    function scheduleRender() {
      if (renderFrame || destroyed) return;
      renderFrame = global.requestAnimationFrame(() => {
        renderFrame = 0; render(); revealBlurredProgress(); revealEndCaret();
        if (viewportRevealPending) { viewportRevealPending = false; if (!composing && !gesture && !moveState) revealFocusedCaret(); }
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
    function datePropertyLabel(line, meta, metadata, index) {
      if (!meta || meta.kind !== 'property' || !Number.isInteger(meta.depth) || meta.depth < 1) return null;
      const property = /^ *-\s+날짜:\s*(.*)$/.exec(line);
      if (!property) return null;
      // Only decorate a property with a real checkbox parent. Orphan/invalid
      // text stays literal; presentation must not imply a new scheduled Item.
      for (let parent = index - 1; parent >= 0; parent -= 1) {
        const ancestor = metadata[parent];
        if (!ancestor) return null;
        if (ancestor.kind === 'blank' || ancestor.depth >= meta.depth) continue;
        if (ancestor.depth !== meta.depth - 1 || !CHECK_KINDS.includes(ancestor.kind)) return null;
        const label = dateLabel(`[${property[1].trim()}]`);
        return label ? `예정일 ${label === '날짜 미정' ? '미정' : label}` : null;
      }
      return null;
    }
    function paintActiveSyntax(row, line, task, meta) {
      const scope = meta && meta.kind === 'scope' && ['folder', 'flow'].includes(meta.scopeKind)
        ? /^([ \t]*-\s+)(.*)$/.exec(line) : null;
      if (!task && !scope) return;
      // The first Text node remains the unchanged RAW ruler used by textarea
      // wrapping and caret Range measurements. Only its paint is replaced.
      // This layer repeats the exact character advances; it is never editable.
      row.classList.add('tle-line-active-paint');
      const paint = makeSpan('tle-active-paint', '');
      const title = task ? task[4] : scope[2];
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
      if (node === row && (offset === 0 || offset === row.childNodes.length)) return offset === 0 ? line.start : line.end;
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
    function revealFocusedCaret() {
      if (foldedIds.size || doc.activeElement !== textarea) return;
      const offset = selection.direction === 'backward' ? selection.start : selection.end;
      const line = rangeOfLine(lineAt(offset));
      const row = rows[line.index];
      if (!row || !row.firstChild || row.firstChild.nodeType !== 3) return;
      const caret = pointRange(row.firstChild, offset - line.start).getBoundingClientRect();
      const box = textarea.getBoundingClientRect();
      const delta = caret.top < box.top ? caret.top - box.top : Math.max(0, caret.bottom - box.top - textarea.clientHeight);
      if (delta) { textarea.scrollTop = Math.max(0, textarea.scrollTop + delta); syncGeometry(); }
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
      if (!row || row.hidden || !mirror.contains(row)) return;
      const line = rangeOfLine(Number(row.dataset.lineIndex));
      const title = row.querySelector('.tle-task-title, .tle-task-title-complete');
      const point = typeof doc.caretPositionFromPoint === 'function' ? doc.caretPositionFromPoint(event.clientX, event.clientY) : null;
      const hit = point ? pointRange(point.offsetNode, point.offset) : typeof doc.caretRangeFromPoint === 'function' ? doc.caretRangeFromPoint(event.clientX, event.clientY) : null;
      let offset = line.end;
      let screenTop = null;
      const node = hit && hit.startContainer;
      if (node && node.nodeType === 3 && (title ? title.contains(node) : node === row.firstChild)) {
        const prefix = title ? Number(row.dataset.taskPrefixLength) : 0;
        offset = line.start + prefix + hit.startOffset;
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
      if (composing || destroyed || (typeof config.isActionDisabled === 'function' && config.isActionDisabled())) return false;
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
      const index = gesture ? gesture.lineIndex : moveState ? moveState.startIndex : null;
      const hadSelection = Boolean(moveState || (gesture && ['selected', 'dragging'].includes(gesture.phase)));
      if (gesture) blockGestureClick(gesture.pointerId);
      finishGesture();
      moveState = null;
      targetChoices.clear();
      previewBoundary = null;
      moveStatus.textContent = '';
      paintMoveState();
      if (notify && hadSelection && index !== null) action('move-cancel', index);
    }
    function paintMoveState() {
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
      if (!value) { cancelMove(false); return true; }
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
    function beginGesture(event, lineIndex) {
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
    function gestureHandle(button, lineIndex, clickAction) {
      button.classList.add('tle-move-handle');
      const index = () => typeof lineIndex === 'function' ? lineIndex() : lineIndex;
      button.addEventListener('pointerdown', (event) => { event.preventDefault(); beginGesture(event, index()); });
      button.addEventListener('click', () => action(clickAction, index()));
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
    function addRowButton(type, index, row, meta) {
      if (config.controls === false) return;
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = `tle-row-open tle-${type === 'scope-open' ? 'scope' : type === 'task-date' ? 'task-date' : type === 'task-origin' ? 'task-origin' : 'reference'}-open`;
      button.dataset.lineIndex = String(index);
      button.dataset.action = type;
      const dateText = typeof meta.dateMismatch === 'string' ? meta.dateMismatch.trim() : '';
      const scheduledDate = scheduledDateLabel(dateText);
      const compactScheduledDate = /^\d{2}\.\d{2}$/.test(dateText) ? dateText.replace('.', '/') : scheduledDate;
      const scopeText = typeof meta.scopeMismatch === 'string' ? meta.scopeMismatch.trim() : '';
      const label = typeof meta.label === 'string' ? meta.label : rangeOfLine(index).text;
      button.setAttribute('aria-label', `${type === 'scope-open' ? '연결된 묶음 열기' : type === 'task-date' ? '할 일 예정일 변경' : type === 'task-origin' ? '할 일 소속 확인' : '연결된 할 일 열기'}: ${label}${dateText ? `, 예정일 ${scheduledDate}` : ''}${scopeText ? `, 실제 소속 ${scopeText}` : ''}`);
      button.title = scopeText ? button.getAttribute('aria-label') : typeof meta.subtitle === 'string' ? meta.subtitle : button.getAttribute('aria-label');
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
      controls.append(button);
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
      button.textContent = folded ? '›' : '⌄';
      button.setAttribute('aria-expanded', String(!folded));
      button.setAttribute('aria-label', `${meta.label || '묶음'} ${folded ? '펼치기' : '접기'}`);
      button.addEventListener('pointerdown', (event) => event.preventDefault());
      button.addEventListener('click', () => toggleFold(index));
      row.append(makeSpan('tle-fold-anchor', ''));
      controls.append(button);
      foldButtons.push({ button, row });
    }

    function syncCompositionGeometry() {
      if (!composing || mode !== 'live') return;
      const first = rows[lineAt(Math.min(compositionAnchor, selection.start))];
      const last = rows[lineAt(Math.max(compositionAnchor, selection.end))];
      if (!first || !last) return;
      // Paint the browser-owned composition only over its raw mirror rows.
      // A mask changes neither textarea layout nor hit testing/candidate anchors.
      const top = Math.max(0, first.offsetTop - textarea.scrollTop);
      const bottom = Math.max(top, last.offsetTop + last.offsetHeight - textarea.scrollTop);
      textarea.style.setProperty('--tle-composition-top', `${top}px`);
      textarea.style.setProperty('--tle-composition-bottom', `${bottom}px`);
    }

    function syncRowIndent(row) {
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
      row.style.setProperty('--tle-indent', `${width(Infinity)}px`);
      row.querySelectorAll('.tle-indent-guide').forEach((guide) => {
        guide.style.left = `${width(Number(guide.dataset.indentColumns)) + 9}px`;
      });
    }

    function syncReadingTaskInset(row) {
      const prefix = row.querySelector('.tle-hidden-syntax');
      if (!prefix) return;
      const glyph = config.controls !== false && row.querySelector('.tle-check-glyph');
      // The 44px hit extends 13px past the 18px glyph. Reading text starts
      // beyond that edge; the native RAW ruler is never given this inset.
      const hitEdge = glyph ? glyph.getBoundingClientRect().right - row.getBoundingClientRect().left + 14 : 0;
      const inset = Math.max(prefix.getBoundingClientRect().width, hitEdge);
      row.style.setProperty('--tle-task-prefix', `${Math.min(inset, Math.max(0, row.clientWidth - 44))}px`);
    }

    function syncGeometry() {
      if (destroyed) return;
      const actionsDisabled = composing || (typeof config.isActionDisabled === 'function' && config.isActionDisabled());
      plus.disabled = actionsDisabled;
      rowMenu.disabled = actionsDisabled;
      const surface = scrollSurface();
      if (!readingView && !foldedIds.size) { viewport.scrollTop = 0; viewport.scrollLeft = 0; }
      const textStyle = global.getComputedStyle(textarea);
      characterMetric.style.font = textStyle.font;
      characterMetric.style.letterSpacing = textStyle.letterSpacing;
      characterWidth = characterMetric.getBoundingClientRect().width || characterWidth;
      textPaddingLeft = parseFloat(textStyle.paddingLeft) || 14;
      textOriginX = root.getBoundingClientRect().left + textPaddingLeft - surface.scrollLeft;
      // Input uses the native RAW ruler. Reading uses the formatted rows' own
      // heights and scroll surface, so wrapped titles also move later controls.
      mirror.style.width = `${surface.clientWidth}px`;
      mirror.style.transform = readingView || foldedIds.size ? 'none' : `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
      rows.forEach(syncRowIndent);
      if (readingView || foldedIds.size) rows.forEach(syncReadingTaskInset);
      syncCompositionGeometry();
      const index = lineAt(selection.start);
      const row = rows[index];
      const height = surface.clientHeight;
      const topPad = parseFloat(global.getComputedStyle(textarea).paddingTop) || 0;
      const rowTop = row ? row.offsetTop - surface.scrollTop : topPad;
      const lineHeight = nativeLineHeight();
      let menuTop = rowTop;
      if (doc.activeElement === textarea && row && row.firstChild && row.firstChild.nodeType === 3) {
        const line = rangeOfLine(index);
        const caret = pointRange(row.firstChild, Math.min(row.firstChild.length, selection.start - line.start)).getBoundingClientRect();
        if (caret.height) menuTop = caret.top - root.getBoundingClientRect().top - Math.max(0, (44 - lineHeight) / 2);
      }
      plus.hidden = Boolean(moveState) || composing || !row || row.hidden || menuTop + 44 < 0 || menuTop > height;
      rowMenu.hidden = plus.hidden;
      plus.style.top = `${Math.max(0, Math.min(height - 44, menuTop))}px`;
      rowMenu.style.top = plus.style.top;
      plus.dataset.lineIndex = String(index);
      rowMenu.dataset.lineIndex = String(index);
      plus.setAttribute('aria-label', `${index + 1}행에 내용 추가`);
      rowMenu.setAttribute('aria-label', `${index + 1}행 메뉴`);
      checkButtons.forEach(({ button, row: checkRow, glyph }) => {
        button.disabled = actionsDisabled;
        const glyphBox = glyph.getBoundingClientRect();
        const rootBox = root.getBoundingClientRect();
        const top = checkRow.offsetTop - surface.scrollTop;
        button.hidden = checkRow.hidden || top < 0 || top + 44 > height || (mode !== 'live' && !foldedIds.size);
        button.style.top = `${top}px`;
        button.style.left = `${glyphBox.left - rootBox.left - 13}px`;
      });
      rowButtons.forEach(({ button, row: metaRow, type }) => {
        const top = metaRow.offsetTop - surface.scrollTop;
        button.disabled = actionsDisabled;
        button.hidden = (Boolean(moveState) && type !== 'scope-open') || metaRow.hidden || top < 0 || top + 44 > height || (mode !== 'live' && !foldedIds.size);
        button.style.top = `${top}px`;
        if (type === 'scope-open') {
          const anchor = metaRow.querySelector('.tle-scope-anchor');
          if (anchor) button.style.left = `${anchor.getBoundingClientRect().left - root.getBoundingClientRect().left - 13}px`;
        }
      });
      foldButtons.forEach(({ button, row: foldRow }) => {
        const top = foldRow.offsetTop - surface.scrollTop;
        const anchor = foldRow.querySelector('.tle-fold-anchor');
        button.disabled = actionsDisabled;
        button.hidden = foldRow.hidden || top < 0 || top + 44 > height;
        button.style.top = `${top}px`;
        if (anchor) button.style.left = `${anchor.getBoundingClientRect().left - root.getBoundingClientRect().left}px`;
      });
      syncMoveGeometry();
    }

    function render() {
      if (destroyed) return;
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
      const lines = textarea.value.split('\n');
      const metadata = getRowMeta();
      const actionsDisabled = typeof config.isActionDisabled === 'function' && config.isActionDisabled();
      const foldable = Object.entries(metadata).filter(([index, meta]) => meta && meta.kind === 'scope' && typeof meta.id === 'string' && Number.isInteger(meta.subtreeEndIndex) && meta.subtreeEndIndex > Number(index) + 1 && meta.subtreeEndIndex <= lines.length);
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
      const startLine = lineAt(composing ? Math.min(compositionAnchor, selection.start) : selection.start);
      const lastSelectedOffset = composing ? Math.max(compositionAnchor, selection.end) : selection.end > selection.start ? selection.end - 1 : selection.end;
      const endLine = lineAt(lastSelectedOffset);
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
        const parsedTask = matchTask(line, safeMeta, false, actionsDisabled);
        const task = parsedTask && (/^[ xX]$/.test(parsedTask[2]) || progressPercent(safeMeta) !== null) ? parsedTask : null;
        const rawIndent = indentation(line);
        row.style.setProperty('--tle-indent', '0px');
        row.dataset.depth = String(safeMeta && Number.isInteger(safeMeta.depth) ? safeMeta.depth : rawIndent.columns / 2);
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
          if (mode === 'live' && active && !composing && !fenced[index]) paintActiveSyntax(row, line, task, safeMeta);
        } else if (safeMeta && safeMeta.kind === 'scope') {
          row.classList.add('tle-line-scope');
          row.append(makeSpan('tle-date-source', line));
          row.append(makeSpan('tle-scope-anchor', ''));
          const decorated = doc.createElement('span');
          decorated.className = 'tle-scope-label';
          decorated.append(makeSpan('tle-scope-name', typeof safeMeta.label === 'string' ? safeMeta.label : line.replace(/^\s*-\s*/, '')));
          if (typeof safeMeta.subtitle === 'string' && safeMeta.subtitle) decorated.append(makeSpan('tle-scope-subtitle', safeMeta.subtitle));
          row.append(decorated);
          addRowButton('scope-open', index, row, safeMeta);
          addFoldButton(index, row, safeMeta);
        } else if (label) {
          // Invisible RAW content reserves exact textarea wrapping/height.
          // The human date label is an absolute decoration, never a text edit.
          row.classList.add('tle-line-date');
          row.append(makeSpan('tle-date-source', line), makeSpan('tle-date-label', label));
        } else if (task) {
          const progress = progressPercent(safeMeta);
          const complete = progress !== null ? progress === 100 : task[2].toLowerCase() === 'x';
          row.classList.add('tle-line-task');
          if (complete) row.classList.add('tle-line-complete');
          const prefix = line.slice(0, line.length - task[4].length);
          row.dataset.taskPrefixLength = String(prefix.length);
          const hidden = makeSpan('tle-hidden-syntax', prefix);
          row.append(hidden, makeSpan(complete ? 'tle-task-title-complete' : 'tle-task-title', task[4]));
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
          }
          if (config.controls !== false) {
            const button = doc.createElement('button');
            button.type = 'button';
            button.className = 'tle-check-hit';
            if (progress !== null) {
              button.classList.add('tle-progress-hit');
              button.dataset.action = 'progress-open';
              button.dataset.progressPercent = String(progress);
              button.setAttribute('aria-label', `${task[4] || '할 일'} 진행률 ${progress}%, 진행 조절`);
              const recordDate = typeof safeMeta.progressDate === 'string' && safeMeta.progressDate ? dateLabel(`[${safeMeta.progressDate}]`) : null;
              button.title = `${button.getAttribute('aria-label')}${recordDate ? ` · 진행 기록 ${recordDate}` : ''}`;
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
            gestureHandle(button, index, progress !== null ? 'progress-open' : 'toggle');
            controls.append(button);
            checkButtons.push({ button, row, glyph });
          }
          if (safeMeta && safeMeta.kind === 'subcheck') row.classList.add('tle-line-subcheck');
          if (safeMeta && safeMeta.kind === 'reference') {
            row.classList.add('tle-line-reference');
          }
        } else {
          row.classList.add(PROPERTY.test(line) ? 'tle-line-property' : 'tle-line-prose');
          const propertyLabel = datePropertyLabel(line, safeMeta, metadata, index);
          if (propertyLabel) {
            // Passive paint uses the unchanged source as its wrapping ruler.
            // Active editing/selection and IME take the RAW branch above.
            row.classList.add('tle-line-date-property');
            row.append(makeSpan('tle-date-source', line), makeSpan('tle-date-label tle-property-date-label', propertyLabel));
          } else row.textContent = line || '\u200b';
        }
        if ((mode === 'live' || foldedIds.size) && index !== startLine && !fenced[index] && task && safeMeta) {
          if (safeMeta.kind === 'reference') addRowButton(safeMeta.scopeMismatch && !safeMeta.dateMismatch ? 'task-origin' : 'reference-open', index, row, safeMeta);
          else if ((safeMeta.kind === 'task' || safeMeta.isCanonical === true) && safeMeta.dateMismatch) addRowButton('task-date', index, row, safeMeta);
          else if ((safeMeta.kind === 'task' || safeMeta.isCanonical === true) && safeMeta.scopeMismatch) addRowButton('task-origin', index, row, safeMeta);
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
      renderedValue = textarea.value;
      syncGeometry();
      if (anchor) { restoreViewAnchor(anchor); syncGeometry(); }
      paintMoveState();
      if (focusedControl) {
        const replacement = [...checkButtons, ...rowButtons, ...foldButtons].find(({ button }) => button.dataset.lineIndex === focusedControl.line && (button.dataset.action || 'toggle') === focusedControl.action);
        if (replacement && !replacement.button.hidden) replacement.button.focus({ preventScroll: true });
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
      if (pendingChange || textarea.value !== before) publish(); else render();
      pendingChange = false;
      return applied;
    }
    function insert(text, intent) {
      return replaceRange(selection.start, selection.end, text, { intent });
    }
    function indent(outdent) {
      if (destroyed || composing || nativeDepth || (typeof config.isActionDisabled === 'function' && config.isActionDisabled())) return false;
      remember();
      if (typeof config.canApplyIndent !== 'function' && typeof config.canApplyInput !== 'function') return false;
      const plan = inputPlans.planIndent(textarea.value, selection, getRowMeta(), Boolean(outdent), protectedFenceLines(textarea.value.split('\n')), indentLease, inputEpoch);
      if (!plan) return false;
      const intent = { kind: 'indent', start: plan.start, end: plan.end, text: plan.text, outdent: plan.outdent,
        startLine: plan.startLine, endLine: plan.endLine, selectionBefore: { ...selection }, selectionAfter: plan.selectionAfter };
      if (typeof config.canApplyIndent === 'function' && config.canApplyIndent(plan.nextRaw, intent) !== true) {
        return typeof config.canApplyInput === 'function' ? rejectInput(intent) : false;
      }
      const applied = replaceRange(plan.start, plan.end, plan.text, { selectionAfter: plan.selectionAfter, intent });
      indentLease = applied ? inputPlans.indentLease(plan, inputEpoch) : null;
      return applied;
    }
    function undo() {
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
      const memo = inputPlans.planMemoEnter(textarea.value, selection, meta);
      if (memo) {
        if (replaceRange(memo.start, memo.end, memo.text, { selectionAfter: memo.selectionAfter, intent: { kind: 'enter' } }) || inputRejected) event.preventDefault();
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
        } else handled = insert(`\n${task[1]}- [ ] `, { kind: 'enter' });
      } else if (dateLabel(line.text) && selection.start === line.end) {
        handled = insert(`\n${prefix}- [ ] `, { kind: 'enter' });
      } else if (meta && meta.kind === 'scope' && meta.depth < MAX_DEPTH && selection.start === line.end) {
        handled = insert(`\n${prefix}  - [ ] `, { kind: 'enter' });
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
      inputEpoch++; indentLease = null;
      if (foldedIds.size) unfoldAll();
      if (moveState || gesture) cancelMove(true);
      nextTabLeaves = false;
      if (composing || event.isComposing) { remember(); render(); return; }
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
      publish(event.inputType || 'insertText', inputSplice);
    });
    ['select', 'click'].forEach((type) => listen(textarea, type, () => { viewportCaretOwned = true; remember(); scheduleRender(); }));
    listen(textarea, 'focus', () => { viewportCaretOwned = true; if (gesture || moveState) cancelMove(true); remember(); render(); revealFocusedCaret(); });
    listen(textarea, 'keyup', (event) => { if (!['Control', 'Meta', 'Shift', 'Alt'].includes(event.key)) viewportCaretOwned = true; remember(); captureEndCaretReveal(event); scheduleRender(); });
    listen(textarea, 'blur', (event) => { remember(); captureBlurReveal(event); scheduleRender(); });
    ['wheel', 'pointerdown', 'touchstart'].forEach((type) => listen(root, type, () => { viewportCaretOwned = false; viewportRevealPending = false; pendingBlurReveal = null; pendingEndCaretReveal = null; }, { capture: true, passive: true }));
    listen(textarea, 'scroll', syncGeometry, { passive: true });
    listen(viewport, 'scroll', syncGeometry, { passive: true });
    listen(textarea, 'paste', () => { pasteSource = !composing ? { raw: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd } : null; });
    listen(textarea, 'beforeinput', (event) => { if (event.inputType !== 'insertFromPaste') pasteSource = null; if (foldedIds.size) event.preventDefault(); });
    listen(doc, 'copy', copyPresentation);
    listen(textarea, 'keydown', onKeydown);
    listen(textarea, 'compositionstart', () => { inputEpoch++; indentLease = null; cancelMove(true); remember(); compositionAnchor = selection.start; composing = true; root.classList.add('tle-composing'); render(); });
    listen(textarea, 'compositionend', () => { composing = false; root.classList.remove('tle-composing'); publish('insertCompositionText'); });
    listen(doc, 'selectionchange', () => { if (doc.activeElement === textarea) { remember(); scheduleRender(); } else if (readingView) scheduleRender(); });
    listen(viewport, 'pointerdown', (event) => { readingPointerAt = readingView && ['touch', 'pen'].includes(event.pointerType) ? event.timeStamp : null; });
    listen(viewport, 'pointercancel', () => { readingPointerAt = null; });
    listen(viewport, 'click', editReadingPoint);
    listen(plus, 'pointerdown', (event) => event.preventDefault());
    listen(plus, 'click', () => action('insert', lineAt(selection.start)));
    gestureHandle(rowMenu, () => lineAt(selection.start), 'row-menu');
    listen(doc, 'pointerdown', (event) => {
      pointerInsideEditorControl = event.target !== textarea && root.contains(event.target);
      if (!activePointers.size) { blockedClick = null; viewportTransitionUntil = 0; }
      activePointers.add(event.pointerId);
      if (activePointers.size > 1) cancelMove(true);
    }, true);
    listen(doc, 'pointermove', pointerMove, { capture: true, passive: false });
    listen(doc, 'pointerup', pointerEnd, true);
    listen(doc, 'pointercancel', pointerEnd, true);
    listen(root, 'lostpointercapture', (event) => { if (gesture && event.pointerId === gesture.pointerId) cancelMove(true); });
    listen(root, 'click', (event) => {
      if (blockedClick && Date.now() <= blockedClick.until && event.detail !== 0 && (event.pointerId == null || event.pointerId === blockedClick.pointerId)) {
        event.preventDefault(); event.stopImmediatePropagation(); blockedClick = null;
      }
    }, true);
    listen(root, 'contextmenu', (event) => { if (event.target.closest('.tle-move-handle')) event.preventDefault(); });
    listen(doc, 'scroll', (event) => {
      if (!gesture || gesture.phase === 'scrolling') return;
      if (gesture.phase === 'dragging' && event.target === scrollSurface() && gesture.expectedScrollTop === scrollSurface().scrollTop) { gesture.expectedScrollTop = null; return; }
      if (['selected', 'dragging'].includes(gesture.phase) && Date.now() <= viewportTransitionUntil) { syncGeometry(); return; }
      cancelMove(true);
    }, { capture: true, passive: true });
    listen(doc, 'wheel', () => { viewportCaretOwned = false; viewportRevealPending = false; viewportTransitionUntil = 0; if (gesture) cancelMove(true); }, { capture: true, passive: true });
    listen(global, 'blur', () => { activePointers.clear(); cancelMove(true); });
    listen(doc, 'visibilitychange', () => { if (doc.hidden) { activePointers.clear(); cancelMove(true); } });
    const observer = typeof global.ResizeObserver === 'function' ? new global.ResizeObserver(scheduleViewportRender) : null;
    if (observer) observer.observe(root);
    listen(global, 'resize', scheduleViewportRender);
    if (global.visualViewport) listen(global.visualViewport, 'resize', scheduleViewportRender);
    render();

    const api = {
      getValue: () => textarea.value,
      getSelection: () => ({ start: selection.start, end: selection.end, direction: selection.direction, selectionStart: selection.start, selectionEnd: selection.end, lineIndex: lineAt(selection.start) }),
      setValue(value, settings) {
        if (destroyed || composing) return false;
        const next = String(value == null ? '' : value);
        if (next === textarea.value) { render(); return true; }
        unfoldAll();
        if (moveState || gesture) cancelMove(true);
        const beforeSelection = { ...selection };
        const top = textarea.scrollTop;
        const left = textarea.scrollLeft;
        inputEpoch++; indentLease = null;
        textarea.value = next;
        lastReported = textarea.value;
        lastPickerCandidate = null;
        if (settings && settings.preserveSelection) {
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
      setMoveState,
      focusMoveTarget,
      prepareAction,
      prepareMove,
      toggleFold,
      isFolded,
      unfoldAll,
      undo,
      refresh: render,
      refreshViewport: scheduleViewportRender,
      setMode(next) {
        if (next !== 'live' && next !== 'text') throw new TypeError('Mode must be live or text.');
        if (next !== mode) pendingBlurReveal = null;
        if (next !== mode && (gesture || moveState)) cancelMove(true);
        if (next !== mode) unfoldAll();
        mode = next;
        root.dataset.mode = mode;
        render();
      },
      destroy() {
        if (destroyed) return;
        cancelMove(false);
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
