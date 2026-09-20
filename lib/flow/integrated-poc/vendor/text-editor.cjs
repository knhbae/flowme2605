/* Generated from v11 20707fa0/editor.js; source SHA256 04451e22571d5953745231bf8124ca031d4c3c205344c452f9dbbe3feb831718.
 * Regenerate: node scripts/personal-workspace-poc/program-vendor-text.mjs
 * Only core source is reused; no historical application, HTML or storage adapter. */
/*
 * Static UX controller, adapted from PersonalWorkspacePocLiveEditor's native
 * textarea + presentation mirror pattern. This prototype's [date] syntax is
 * deliberately separate from the product parser. No storage is read or written.
 *
 * setValue loads a document; insert/replaceRange use browser-owned transactions.
 * There is no value-assignment fallback for an unsupported native command.
 */
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
    root.append(viewport, textarea, controls, moveLayer, characterMetric, moveStatus);
    container.append(root);

    let mode = 'live';
    let composing = false;
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
      selection = { start: textarea.selectionStart, end: textarea.selectionEnd, direction: textarea.selectionDirection || 'none' };
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
    function publish(inputType) {
      if (destroyed) return;
      remember();
      if (textarea.value !== lastReported) {
        lastReported = textarea.value;
        if (typeof config.onChange === 'function') config.onChange(lastReported);
      }
      render();
      maybeRequestPicker(inputType);
    }
    function scheduleRender() {
      if (renderFrame || destroyed) return;
      renderFrame = global.requestAnimationFrame(() => { renderFrame = 0; render(); revealBlurredProgress(); });
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
      const top = entry.row.offsetTop - pending.top;
      // Only the partly visible 44px control, not a distant or wrapped caret row.
      if (top >= pending.height || top + 44 <= 0 || (top >= 0 && top + 44 <= pending.height)) return;
      textarea.scrollTop = Math.max(0, pending.top + (top < 0 ? top : top + 44 - pending.height));
      syncGeometry();
    }
    function makeSpan(className, content) {
      const span = doc.createElement('span');
      span.className = className;
      span.textContent = content;
      return span;
    }
    function scrollSurface() { return foldedIds.size ? viewport : textarea; }
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
      if (composing || destroyed) return;
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
      const button = doc.createElement('button');
      button.type = 'button';
      button.className = `tle-row-open tle-${type === 'scope-open' ? 'scope' : type === 'task-date' ? 'task-date' : type === 'task-origin' ? 'task-origin' : 'reference'}-open`;
      button.dataset.lineIndex = String(index);
      button.dataset.action = type;
      const dateText = typeof meta.dateMismatch === 'string' ? meta.dateMismatch.trim() : '';
      const scopeText = typeof meta.scopeMismatch === 'string' ? meta.scopeMismatch.trim() : '';
      const label = typeof meta.label === 'string' ? meta.label : rangeOfLine(index).text;
      button.setAttribute('aria-label', `${type === 'scope-open' ? '연결된 묶음 열기' : type === 'task-date' ? '할 일 날짜 변경' : type === 'task-origin' ? '할 일 소속 확인' : '연결된 할 일 열기'}: ${label}${dateText ? `, 날짜 ${dateText}` : ''}${scopeText ? `, 실제 소속 ${scopeText}` : ''}`);
      button.title = scopeText ? button.getAttribute('aria-label') : typeof meta.subtitle === 'string' ? meta.subtitle : button.getAttribute('aria-label');
      if (dateText) {
        button.classList.add('tle-date-open');
        button.append(makeSpan('tle-row-date', dateText));
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

    function syncGeometry() {
      if (destroyed) return;
      const actionsDisabled = typeof config.isActionDisabled === 'function' && config.isActionDisabled();
      plus.disabled = actionsDisabled;
      rowMenu.disabled = actionsDisabled;
      const surface = scrollSurface();
      const textStyle = global.getComputedStyle(textarea);
      characterMetric.style.font = textStyle.font;
      characterMetric.style.letterSpacing = textStyle.letterSpacing;
      characterWidth = characterMetric.getBoundingClientRect().width || characterWidth;
      textPaddingLeft = parseFloat(textStyle.paddingLeft) || 14;
      textOriginX = root.getBoundingClientRect().left + textPaddingLeft - surface.scrollLeft;
      // clientWidth excludes the native scrollbar. Both layers use identical
      // font, padding, wrapping and raw source bytes as their line-height ruler.
      mirror.style.width = `${surface.clientWidth}px`;
      mirror.style.transform = foldedIds.size ? 'none' : `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`;
      const index = lineAt(selection.start);
      const row = rows[index];
      const height = surface.clientHeight;
      const topPad = parseFloat(global.getComputedStyle(textarea).paddingTop) || 0;
      const rowTop = row ? row.offsetTop - surface.scrollTop : topPad;
      const lineHeight = 44;
      plus.hidden = Boolean(moveState) || composing || !row || row.hidden || rowTop + lineHeight < 0 || rowTop > height;
      rowMenu.hidden = plus.hidden;
      plus.style.top = `${Math.max(0, Math.min(height - 44, rowTop))}px`;
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
      const startLine = lineAt(selection.start);
      const lastSelectedOffset = selection.end > selection.start ? selection.end - 1 : selection.end;
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
        const label = dateLabel(line);
        const meta = metadata[index];
        const safeMeta = meta && typeof meta === 'object' ? meta : null;
        const parsedTask = matchTask(line, safeMeta, false, actionsDisabled);
        const task = parsedTask && (/^[ xX]$/.test(parsedTask[2]) || progressPercent(safeMeta) !== null) ? parsedTask : null;
        const rawIndent = indentation(line);
        row.style.setProperty('--tle-indent', `${rawIndent.columns}ch`);
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
          const hidden = makeSpan('tle-hidden-syntax', prefix);
          row.append(hidden, makeSpan(complete ? 'tle-task-title-complete' : 'tle-task-title', task[4]));
          const glyph = doc.createElement('span');
          glyph.className = 'tle-check-glyph';
          glyph.dataset.checked = String(complete);
          glyph.textContent = complete ? '✓' : '';
          const checkAnchor = makeSpan('tle-check-anchor', '');
          checkAnchor.append(glyph);
          row.append(checkAnchor);
          const button = doc.createElement('button');
          button.type = 'button';
          button.className = 'tle-check-hit';
          if (progress !== null) {
            button.classList.add('tle-progress-hit');
            button.dataset.action = 'progress-open';
            button.dataset.progressPercent = String(progress);
            button.setAttribute('aria-label', `${task[4] || '할 일'} 진행률 ${progress}%, 진행 조절`);
            button.title = `${button.getAttribute('aria-label')}${typeof safeMeta.progressDate === 'string' && safeMeta.progressDate ? ` · 기록 날짜 ${safeMeta.progressDate}` : ''}`;
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
          if (safeMeta && safeMeta.kind === 'subcheck') row.classList.add('tle-line-subcheck');
          if (safeMeta && safeMeta.kind === 'reference') {
            row.classList.add('tle-line-reference');
          }
        } else {
          row.classList.add(PROPERTY.test(line) ? 'tle-line-property' : 'tle-line-prose');
          row.textContent = line || '\u200b';
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
            guide.style.left = `calc(${depth * 2}ch + 9px)`;
            row.append(guide);
          });
        }
        rows.push(row);
        fragment.append(row);
      });
      mirror.replaceChildren(fragment);
      syncGeometry();
      paintMoveState();
      if (focusedControl) {
        const replacement = [...checkButtons, ...rowButtons, ...foldButtons].find(({ button }) => button.dataset.lineIndex === focusedControl.line && (button.dataset.action || 'toggle') === focusedControl.action);
        if (replacement && !replacement.button.hidden) replacement.button.focus({ preventScroll: true });
      }
    }

    function replaceRange(start, end, text, settings) {
      if (destroyed || composing || nativeDepth || typeof doc.execCommand !== 'function') return false;
      const before = textarea.value;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end > before.length) return false;
      const insertion = String(text);
      const expected = before.slice(0, start) + insertion + before.slice(end);
      if (expected === before) return true;
      unfoldAll();
      if (moveState || gesture) cancelMove(true);
      const previousSelection = { ...selection };
      const scrollTop = textarea.scrollTop;
      const scrollLeft = textarea.scrollLeft;
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(start, end);
      nativeDepth += 1;
      pendingChange = false;
      try { doc.execCommand('insertText', false, insertion); } catch (_) { /* No fabricated undo fallback. */ }
      nativeDepth -= 1;
      const applied = textarea.value === expected;
      if (applied && settings && settings.preserveSelection) {
        const delta = insertion.length - (end - start);
        const translate = (offset) => offset <= start ? offset : offset >= end ? offset + delta : start + insertion.length;
        textarea.setSelectionRange(translate(previousSelection.start), translate(previousSelection.end), previousSelection.direction);
      } else if (applied && settings && settings.selectionAfter) {
        const next = settings.selectionAfter;
        textarea.setSelectionRange(next.start, next.end, next.direction);
      } else if (applied) {
        const nextCaret = start + insertion.length;
        textarea.setSelectionRange(nextCaret, nextCaret);
      } else if (!applied && textarea.value === before) {
        textarea.setSelectionRange(previousSelection.start, previousSelection.end, previousSelection.direction);
      }
      textarea.scrollTop = scrollTop;
      textarea.scrollLeft = scrollLeft;
      remember();
      if (pendingChange || textarea.value !== before) publish(); else render();
      pendingChange = false;
      return applied;
    }
    function insert(text) {
      return replaceRange(selection.start, selection.end, text);
    }
    function indent(outdent) {
      if (destroyed || composing || nativeDepth || (typeof config.isActionDisabled === 'function' && config.isActionDisabled())) return false;
      remember();
      if (typeof config.canApplyIndent !== 'function') return false;
      const lines = textarea.value.split('\n');
      const fenced = protectedFenceLines(lines);
      const metadata = getRowMeta();
      const startLine = lineAt(selection.start);
      let endLine = lineAt(selection.end > selection.start ? selection.end - 1 : selection.end);
      const baseColumns = Math.min(...lines.slice(startLine, endLine + 1).filter((line) => line.trim()).map((line) => indentation(line).columns));
      for (let index = startLine; index <= endLine; index += 1) {
        const meta = metadata[index];
        if (meta && Number.isInteger(meta.subtreeEndIndex) && meta.subtreeEndIndex > index && meta.subtreeEndIndex <= lines.length) endLine = Math.max(endLine, meta.subtreeEndIndex - 1);
      }
      for (let index = endLine + 1; index < lines.length; index += 1) {
        if (!lines[index].trim()) continue;
        if (indentation(lines[index]).columns <= baseColumns) break;
        endLine = index;
      }
      const first = rangeOfLine(startLine);
      const last = rangeOfLine(endLine);
      const original = { ...selection };
      const edits = [];
      let offset = first.start;
      const changedLines = lines.slice(startLine, endLine + 1).map((line, relative) => {
        const prefix = indentation(line);
        const index = startLine + relative;
        const limit = (metadata[index] && metadata[index].kind === 'property') || PROPERTY.test(line) ? MAX_DEPTH + 1 : MAX_DEPTH;
        if (!line.trim() && endLine > startLine) { offset += line.length + 1; return line; }
        if (fenced[index] || prefix.prefix.includes('\t') || prefix.columns % 2 || (outdent ? prefix.columns < 2 : prefix.columns / 2 >= limit)) return null;
        edits.push({ offset, removed: outdent ? 2 : 0, inserted: outdent ? 0 : 2 });
        offset += line.length + 1;
        return outdent ? line.slice(2) : `  ${line}`;
      });
      if (changedLines.includes(null)) return false;
      const insertion = changedLines.join('\n');
      const nextValue = textarea.value.slice(0, first.start) + insertion + textarea.value.slice(last.end);
      if (config.canApplyIndent(nextValue, { outdent: Boolean(outdent), startLine, endLine }) !== true) return false;
      const translate = (position) => position + edits.reduce((delta, edit) => {
        if (position < edit.offset) return delta;
        return delta + edit.inserted - Math.min(edit.removed, position - edit.offset);
      }, 0);
      return replaceRange(first.start, last.end, insertion, { selectionAfter: { start: translate(original.start), end: translate(original.end), direction: original.direction } });
    }
    function undo() {
      if (destroyed || composing || typeof doc.execCommand !== 'function') return false;
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
      if (event.key === 'Escape') { nextTabLeaves = true; return; }
      if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (nextTabLeaves) { nextTabLeaves = false; return; }
        if (indent(event.shiftKey)) event.preventDefault();
        return;
      }
      if (event.key.length === 1 || ['Enter', 'Backspace', 'Delete'].includes(event.key)) nextTabLeaves = false;
      if (event.key !== 'Enter' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || selection.start !== selection.end) return;
      const line = rangeOfLine(lineAt(selection.start));
      if (protectedFenceLines(textarea.value.split('\n'))[line.index]) return;
      const meta = getRowMeta()[line.index];
      const actionsDisabled = typeof config.isActionDisabled === 'function' && config.isActionDisabled();
      const task = matchTask(line.text, meta, false, actionsDisabled);
      const prefix = indentation(line.text).prefix;
      let handled = false;
      if (matchTask(line.text, meta, true, actionsDisabled)) {
        handled = replaceRange(line.start, line.end, prefix.slice(0, Math.max(0, prefix.length - 2)));
      } else if (task && selection.start >= line.end - task[4].length - task[3].length) {
        handled = insert(`\n${task[1]}- [ ] `);
      } else if (dateLabel(line.text) && selection.start === line.end) {
        handled = insert(`\n${prefix}- [ ] `);
      } else if (meta && meta.kind === 'scope' && meta.depth < MAX_DEPTH && selection.start === line.end) {
        handled = insert(`\n${prefix}  - [ ] `);
      } else if (/^ *-\s+\S/.test(line.text) && !EMPTY_TASK.test(line.text) && !TASK.test(line.text) && selection.start === line.end) {
        handled = insert(`\n${prefix}- `);
      } else if (/^ *(?:-\s*)?$/.test(line.text) && prefix.length) {
        handled = replaceRange(line.start, line.end, prefix.slice(0, Math.max(0, prefix.length - 2)));
      } else if (prefix && selection.start >= line.start + prefix.length) {
        handled = insert(`\n${prefix}`);
      }
      if (handled) event.preventDefault();
    }

    listen(textarea, 'input', (event) => {
      if (foldedIds.size) unfoldAll();
      if (moveState || gesture) cancelMove(true);
      nextTabLeaves = false;
      if (composing || event.isComposing) { remember(); render(); return; }
      if (nativeDepth) { pendingChange = true; return; }
      publish(event.inputType || 'insertText');
    });
    ['select', 'click', 'keyup', 'focus'].forEach((type) => listen(textarea, type, () => { remember(); scheduleRender(); }));
    listen(textarea, 'blur', (event) => { remember(); captureBlurReveal(event); scheduleRender(); });
    ['wheel', 'pointerdown', 'touchstart'].forEach((type) => listen(root, type, () => { pendingBlurReveal = null; }, { capture: true, passive: true }));
    listen(textarea, 'scroll', syncGeometry, { passive: true });
    listen(viewport, 'scroll', syncGeometry, { passive: true });
    listen(textarea, 'beforeinput', (event) => { if (foldedIds.size) event.preventDefault(); });
    listen(textarea, 'keydown', onKeydown);
    listen(textarea, 'compositionstart', () => { cancelMove(true); composing = true; root.classList.add('tle-composing'); });
    listen(textarea, 'compositionend', () => { composing = false; root.classList.remove('tle-composing'); publish('insertCompositionText'); });
    listen(doc, 'selectionchange', () => { if (doc.activeElement === textarea) { remember(); scheduleRender(); } });
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
    listen(doc, 'wheel', () => { viewportTransitionUntil = 0; if (gesture) cancelMove(true); }, { capture: true, passive: true });
    listen(global, 'blur', () => { activePointers.clear(); cancelMove(true); });
    listen(doc, 'visibilitychange', () => { if (doc.hidden) { activePointers.clear(); cancelMove(true); } });
    const observer = typeof global.ResizeObserver === 'function' ? new global.ResizeObserver(scheduleRender) : null;
    if (observer) observer.observe(root);
    listen(global, 'resize', scheduleRender);
    if (global.visualViewport) listen(global.visualViewport, 'resize', scheduleRender);
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
        const top = entry.row.offsetTop;
        if (top < textarea.scrollTop) textarea.scrollTop = top;
        else if (top + 44 > textarea.scrollTop + textarea.clientHeight) textarea.scrollTop = top + 44 - textarea.clientHeight;
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
