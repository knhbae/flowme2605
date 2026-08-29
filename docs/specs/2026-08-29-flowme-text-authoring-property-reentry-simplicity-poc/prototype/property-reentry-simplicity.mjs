export const PROPERTY_REENTRY_CATALOG = Object.freeze([
  Object.freeze({ key: "date", label: "날짜", syntax: "날짜: 2026-09-01", group: "core" }),
  Object.freeze({ key: "time", label: "시간", syntax: "시간: 09:30", group: "core" }),
  Object.freeze({ key: "place", label: "장소", syntax: "장소: 서울역 2번 출구", group: "core" }),
  Object.freeze({ key: "completion", label: "완료 기준", syntax: "완료 기준: 예약 번호를 기록하면 완료", group: "core" }),
  Object.freeze({ key: "relativeDate", label: "상대 날짜", syntax: "상대 날짜: D-3", group: "schedule" }),
  Object.freeze({ key: "duration", label: "소요 시간", syntax: "소요 시간: 30분", group: "schedule" }),
  Object.freeze({ key: "repeat", label: "반복", syntax: "반복: 매주 월, 수", group: "schedule" }),
  Object.freeze({ key: "detail", label: "설명", syntax: "설명: 예약 메일과 결제 내역 확인", group: "execution" }),
  Object.freeze({ key: "condition", label: "실행 조건", syntax: "실행 조건: 결제 승인을 받은 뒤", group: "execution" }),
  Object.freeze({ key: "resource", label: "자료", syntax: "자료: [예약 페이지](https://example.com)", group: "reference" }),
  Object.freeze({ key: "guide", label: "안내", syntax: "안내: 신분증을 미리 준비", group: "reference" }),
  Object.freeze({ key: "caution", label: "주의", syntax: "주의: 취소 수수료 확인", group: "reference" }),
  Object.freeze({ key: "source", label: "출처", syntax: "출처: [공식 안내](https://example.com)", group: "reference" }),
  Object.freeze({ key: "timezone", label: "시간대", syntax: "시간대: Asia/Seoul", group: "nested" }),
  Object.freeze({ key: "repeatEnd", label: "반복 종료", syntax: "반복 종료: 6회", group: "nested" }),
]);

export const PROPERTY_REENTRY_GROUPS = Object.freeze([
  Object.freeze({ label: "일정", keys: Object.freeze(["relativeDate", "duration", "repeat"]) }),
  Object.freeze({ label: "실행 내용", keys: Object.freeze(["detail", "condition"]) }),
  Object.freeze({ label: "참고·출처", keys: Object.freeze(["resource", "guide", "caution", "source"]) }),
]);

const CATALOG_BY_KEY = Object.freeze(Object.fromEntries(
  PROPERTY_REENTRY_CATALOG.map((entry) => [entry.key, entry]),
));
const KEY_BY_LABEL = Object.freeze(Object.fromEntries(
  PROPERTY_REENTRY_CATALOG.map(({ key, label }) => [label, key]),
));
const PROPERTY_LINE_PATTERN = /^(\s{2}-\s+([^:：\r\n]+)[:：][ \t]*)(.*)$/u;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(Number.isFinite(value) ? value : minimum, minimum), maximum);
}

function lineAtStart(documentText, lineStart) {
  const text = String(documentText ?? "");
  const start = Number(lineStart);
  if (!Number.isInteger(start) || start < 0 || start > text.length) return null;
  if (start > 0 && text[start - 1] !== "\n") return null;
  const newline = text.indexOf("\n", start);
  const sourceEnd = newline < 0 ? text.length : newline;
  const hasCarriageReturn = sourceEnd > start && text[sourceEnd - 1] === "\r";
  const end = hasCarriageReturn ? sourceEnd - 1 : sourceEnd;
  return Object.freeze({ start, end, text: text.slice(start, end) });
}

function parseKnownPropertyLine(documentText, lineStart) {
  const line = lineAtStart(documentText, lineStart);
  if (!line) return null;
  const match = PROPERTY_LINE_PATTERN.exec(line.text);
  if (!match) return null;
  const label = match[2].trim();
  const key = KEY_BY_LABEL[label];
  if (!key) return null;
  const rawValue = match[3];
  const value = rawValue.trimEnd();
  const valueStart = line.start + match[1].length;
  const valueEnd = valueStart + value.length;
  return Object.freeze({
    key,
    label,
    lineStart: line.start,
    lineEnd: line.end,
    value,
    valueStart,
    valueEnd,
  });
}

export function planRenderedPropertyReentry(input) {
  const documentText = String(input?.documentText ?? "");
  const property = parseKnownPropertyLine(documentText, input?.lineStart);
  if (!property) return Object.freeze({ status: "ignore", reason: "not-known-property" });

  if (property.value.length === 0) {
    return Object.freeze({
      status: "select",
      reason: "empty-value",
      ...property,
      from: property.valueStart,
      to: property.valueStart,
    });
  }

  if (Number.isFinite(input?.rawOffset) && Number(input.rawOffset) >= property.valueStart) {
    const caret = clamp(Number(input.rawOffset), property.valueStart, property.valueEnd);
    return Object.freeze({
      status: "select",
      reason: "raw-value-point",
      ...property,
      from: caret,
      to: caret,
    });
  }

  const displayText = String(input?.displayText ?? "");
  const displayPrefix = `${property.label}  `;
  const displayOffset = Number(input?.displayOffset);
  if (
    displayText.startsWith(displayPrefix) &&
    displayText.slice(displayPrefix.length) === property.value &&
    Number.isFinite(displayOffset) &&
    displayOffset >= displayPrefix.length
  ) {
    const caret = property.valueStart + clamp(
      displayOffset - displayPrefix.length,
      0,
      property.value.length,
    );
    return Object.freeze({
      status: "select",
      reason: "rendered-value-point",
      ...property,
      from: caret,
      to: caret,
    });
  }

  return Object.freeze({
    status: "select",
    reason: "select-existing-value",
    ...property,
    from: property.valueStart,
    to: property.valueEnd,
  });
}

export function deriveExistingPropertyPresentation(input) {
  const entry = CATALOG_BY_KEY[String(input?.key ?? "")];
  if (!entry) return null;
  const value = String(input?.value ?? "").trim();
  return Object.freeze(value
    ? { title: `${entry.label} · 수정`, syntax: `${entry.label}: ${value}`, status: "입력됨" }
    : { title: `${entry.label} · 입력`, syntax: `${entry.label}: 입력 전`, status: "입력 전" });
}

function textOffsetAtPoint(element, clientX, clientY) {
  if (!(element instanceof HTMLElement)) return null;
  const range = document.caretRangeFromPoint?.(clientX, clientY);
  if (!range || !element.contains(range.startContainer)) return null;
  try {
    const prefix = document.createRange();
    prefix.selectNodeContents(element);
    prefix.setEnd(range.startContainer, range.startOffset);
    return prefix.toString().length;
  } catch {
    return null;
  }
}

function editorRuntimeFor(element) {
  const content = element?.closest?.('[data-testid="ta-authoring-flow-editor-content"]');
  const view = content?.cmTile?.view;
  if (!(content instanceof HTMLElement) || !view?.state?.doc) return null;
  return { content, view };
}

function sourceLineStart(view, lineElement, event) {
  try {
    const position = view.posAtDOM(lineElement, 0);
    return view.state.doc.lineAt(position).from;
  } catch {
    try {
      const position = view.posAtCoords({ x: event.clientX, y: event.clientY });
      return Number.isInteger(position) ? view.state.doc.lineAt(position).from : null;
    } catch {
      return null;
    }
  }
}

const runtimeState = {
  reentryCount: 0,
  ignoredCount: 0,
  lastPlan: null,
  menuEnhancementCount: 0,
};

function handlePropertyPointerDown(event) {
  if (!(event.target instanceof Element) || !event.isPrimary || event.button !== 0) return;
  const rendered = event.target.closest(
    '[data-testid="ta-authoring-flow-live-rendered-block"][data-flow-block-kind="property"]',
  );
  const rawLine = event.target.closest(
    '.cm-line[data-flow-hierarchy-role="item-property"]',
  );
  const target = rendered ?? rawLine;
  if (!(target instanceof HTMLElement)) return;
  const lineElement = target.closest(".cm-line");
  if (!(lineElement instanceof HTMLElement)) return;
  const safe = editorRuntimeFor(target);
  if (!safe || safe.view.composing) return;
  const lineStart = sourceLineStart(safe.view, lineElement, event);
  if (!Number.isInteger(lineStart)) return;

  let displayText;
  let displayOffset;
  let rawOffset;
  if (rendered instanceof HTMLElement) {
    const text = rendered.querySelector(".ta-flow-live-text");
    displayText = text?.textContent ?? "";
    displayOffset = textOffsetAtPoint(text, event.clientX, event.clientY);
  } else {
    try {
      rawOffset = safe.view.posAtCoords({ x: event.clientX, y: event.clientY });
    } catch {
      rawOffset = undefined;
    }
  }

  const plan = planRenderedPropertyReentry({
    documentText: safe.view.state.doc.toString(),
    lineStart,
    displayText,
    displayOffset,
    rawOffset,
  });
  runtimeState.lastPlan = plan;
  if (plan.status !== "select") {
    runtimeState.ignoredCount += 1;
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  safe.view.dispatch({
    selection: { anchor: plan.from, head: plan.to },
    scrollIntoView: true,
    userEvent: "select.pointer",
  });
  safe.view.focus();
  runtimeState.reentryCount += 1;
  window.requestAnimationFrame(() => safe.view.requestMeasure?.());
}

function ownerPropertyValues() {
  const api = window.__FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__;
  const ownerItemId = api?.getState?.().ownerItemId;
  const content = document.querySelector('[data-testid="ta-authoring-flow-editor-content"]');
  const view = content?.cmTile?.view;
  if (!ownerItemId || !view?.state?.doc || !(content instanceof HTMLElement)) return new Map();
  const ownerLine = [...content.querySelectorAll('.cm-line[data-flow-hierarchy-role="root-action"][data-flow-item-id]')]
    .find((line) => line.getAttribute("data-flow-item-id") === ownerItemId);
  if (!(ownerLine instanceof HTMLElement)) return new Map();
  let ownerStart;
  try {
    ownerStart = view.state.doc.lineAt(view.posAtDOM(ownerLine, 0)).from;
  } catch {
    return new Map();
  }

  const values = new Map();
  const documentText = view.state.doc.toString();
  let cursor = view.state.doc.lineAt(ownerStart).to + 1;
  while (cursor <= documentText.length) {
    const line = view.state.doc.lineAt(cursor);
    const property = parseKnownPropertyLine(documentText, line.from);
    if (!property) break;
    values.set(property.key, property.value);
    if (line.to >= documentText.length) break;
    cursor = line.to + 1;
  }
  return values;
}

function actualizePropertyOptions(menu, values) {
  for (const option of menu.querySelectorAll(".tsi-option[data-stable-inline-action]")) {
    const key = option.getAttribute("data-stable-inline-action");
    const state = option.getAttribute("data-property-state");
    if (state !== "blocked") option.querySelector("small")?.remove();
    if (state !== "existing" || !key || !values.has(key)) continue;
    const presentation = deriveExistingPropertyPresentation({ key, value: values.get(key) });
    if (!presentation) continue;
    const title = option.querySelector(".tsi-option-title");
    const syntax = option.querySelector("code");
    if (title) title.textContent = presentation.title;
    if (syntax) {
      syntax.textContent = presentation.syntax;
      syntax.setAttribute("title", presentation.syntax);
    }
    option.dataset.propertyReentryActual = "true";
    option.dataset.propertyReentryStatus = presentation.status;
  }
}

function buildCoreOption(entry, values, index) {
  const option = document.createElement("button");
  option.type = "button";
  option.id = `ta-authoring-property-reentry-core-${index}`;
  option.className = "tsi-option";
  option.dataset.stableInlineAction = entry.key;
  option.dataset.propertyReentryCore = "true";
  option.setAttribute("role", "menuitem");
  option.tabIndex = -1;

  const value = values.get(entry.key);
  const hasDate = /^\d{4}-\d{2}-\d{2}$/u.test(values.get("date") ?? "");
  const blockedMessage = entry.key === "date" && values.has("relativeDate")
    ? "날짜와 상대 날짜 중 하나만 사용할 수 있어요."
    : entry.key === "time" && !hasDate
      ? "날짜를 먼저 입력해 주세요."
      : "";
  option.dataset.propertyState = blockedMessage ? "blocked" : values.has(entry.key) ? "existing" : "available";
  if (blockedMessage) {
    option.dataset.blockedMessage = blockedMessage;
    option.setAttribute("aria-disabled", "true");
  }

  const presentation = values.has(entry.key)
    ? deriveExistingPropertyPresentation({ key: entry.key, value })
    : null;
  const title = document.createElement("span");
  title.className = "tsi-option-title";
  title.textContent = presentation?.title ?? entry.label;
  const syntax = document.createElement("code");
  syntax.textContent = presentation?.syntax ?? entry.syntax;
  syntax.title = syntax.textContent;
  option.append(title, syntax);
  if (blockedMessage) {
    const reason = document.createElement("small");
    reason.textContent = blockedMessage;
    option.append(reason);
  }
  if (presentation) {
    option.dataset.propertyReentryActual = "true";
    option.dataset.propertyReentryStatus = presentation.status;
  }
  return option;
}

function makePresentationHeading(label, kind = "more") {
  const heading = document.createElement("div");
  heading.className = "tprs-menu-group";
  heading.dataset.propertyReentryGroup = label;
  heading.dataset.propertyReentryGroupKind = kind;
  heading.setAttribute("role", "presentation");
  heading.textContent = label;
  return heading;
}

function selectedPropertyKey() {
  const content = document.querySelector('[data-testid="ta-authoring-flow-editor-content"]');
  const view = content?.cmTile?.view;
  if (!view?.state?.doc) return null;
  try {
    const line = view.state.doc.lineAt(view.state.selection.main.head);
    return parseKnownPropertyLine(view.state.doc.toString(), line.from)?.key ?? null;
  } catch {
    return null;
  }
}

function synchronizeActiveAction(action) {
  window.requestAnimationFrame(() => {
    const menu = document.querySelector('[data-testid="ta-authoring-stable-inline-menu"]');
    const content = document.querySelector('[data-testid="ta-authoring-flow-editor-content"]');
    const api = window.__FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__;
    if (!(menu instanceof HTMLElement) || !(content instanceof HTMLElement) || !api?.getState) return;
    const controls = [...menu.querySelectorAll("[data-stable-inline-action]")];
    const desired = controls.findIndex((control) => control.getAttribute("data-stable-inline-action") === action);
    const current = Number(api.getState().activeIndex);
    if (desired < 0 || !Number.isInteger(current) || current === desired || controls.length === 0) return;
    const steps = (desired - current + controls.length) % controls.length;
    for (let index = 0; index < steps; index += 1) {
      content.dispatchEvent(new KeyboardEvent("keydown", {
        key: "ArrowDown",
        bubbles: true,
        cancelable: true,
      }));
    }
  });
}

function enhanceCollapsedMenu(menu, values) {
  if (menu.querySelector('[data-property-reentry-disclosure="collapsed"]')) return false;
  actualizePropertyOptions(menu, values);
  const more = menu.querySelector('[data-stable-inline-action="property-more"]');
  if (more instanceof HTMLButtonElement) {
    more.textContent = "다른 정보";
    more.dataset.propertyReentryDisclosure = "collapsed";
    more.setAttribute("aria-label", "다른 정보 9개 펼치기");
    more.setAttribute("aria-expanded", "false");
  }
  menu.dataset.propertyReentryPresentation = "collapsed";
  return true;
}

function enhanceExpandedMenu(menu, values) {
  if (
    menu.querySelector('[data-property-reentry-disclosure="expanded"]') &&
    menu.querySelectorAll('[data-property-reentry-core="true"]').length === 4 &&
    menu.querySelectorAll('[data-property-reentry-group-kind="more"]').length === 3
  ) return false;

  actualizePropertyOptions(menu, values);
  menu.querySelector(".tsi-scroll-hint")?.remove();
  for (const heading of menu.querySelectorAll("[data-property-reentry-group]")) heading.remove();

  const menuHeading = menu.querySelector(".tsi-menu-heading");
  const back = menuHeading?.querySelector('[data-stable-inline-action="back-property"]');
  if (back instanceof HTMLButtonElement) {
    back.dataset.stableInlineAction = "back-structure";
    back.setAttribute("aria-label", "구조로 돌아가기");
  }
  const close = menuHeading?.querySelector('[data-stable-inline-action="close-menu"]');
  if (menuHeading instanceof HTMLElement && !menuHeading.querySelector('[data-property-reentry-disclosure="expanded"]')) {
    const disclosure = document.createElement("button");
    disclosure.type = "button";
    disclosure.className = "tsi-menu-more";
    disclosure.dataset.stableInlineAction = "back-property";
    disclosure.dataset.propertyReentryDisclosure = "expanded";
    disclosure.setAttribute("role", "menuitem");
    disclosure.setAttribute("aria-label", "다른 정보 접기");
    disclosure.setAttribute("aria-expanded", "true");
    disclosure.textContent = "다른 정보 접기";
    menuHeading.insertBefore(disclosure, close ?? null);
  }

  const firstMore = menu.querySelector(".tsi-option");
  if (!(firstMore instanceof HTMLElement)) return false;
  const coreHeading = makePresentationHeading("기본 정보", "core");
  menu.insertBefore(coreHeading, firstMore);
  const coreEntries = PROPERTY_REENTRY_CATALOG.filter(({ group }) => group === "core");
  const coreOptions = coreEntries.map((entry, index) => buildCoreOption(entry, values, index));
  for (const option of coreOptions) menu.insertBefore(option, firstMore);

  for (const group of PROPERTY_REENTRY_GROUPS) {
    const first = group.keys
      .map((key) => menu.querySelector(`.tsi-option[data-stable-inline-action="${key}"]`))
      .find((option) => option instanceof HTMLElement);
    if (first instanceof HTMLElement) menu.insertBefore(makePresentationHeading(group.label), first);
  }
  menu.dataset.propertyReentryPresentation = "expanded";
  menu.setAttribute("aria-label", `${menu.getAttribute("aria-label") ?? "정보 넣기"} · 기본 정보와 다른 정보`);
  synchronizeActiveAction(selectedPropertyKey() ?? "relativeDate");
  return true;
}

export function enhancePropertyMenu(menu) {
  if (!(menu instanceof HTMLElement) || menu.hidden) return false;
  const mode = menu.dataset.mode ?? "";
  if (mode !== "property-core" && mode !== "property-more") return false;
  const values = ownerPropertyValues();
  const changed = mode === "property-core"
    ? enhanceCollapsedMenu(menu, values)
    : enhanceExpandedMenu(menu, values);
  if (changed) runtimeState.menuEnhancementCount += 1;
  return changed;
}

function initializePropertyReentrySimplicity() {
  document.documentElement.dataset.propertyReentrySimplicityPoc = "true";
  document.addEventListener("pointerdown", handlePropertyPointerDown, true);
  let observer;
  let frame = 0;
  const connect = () => {
    const menu = document.querySelector('[data-testid="ta-authoring-stable-inline-menu"]');
    if (!(menu instanceof HTMLElement)) {
      window.setTimeout(connect, 40);
      return;
    }
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        enhancePropertyMenu(menu);
      });
    };
    observer = new MutationObserver(schedule);
    observer.observe(menu, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "data-mode"] });
    schedule();
  };
  connect();
  window.__FLOWME_PROPERTY_REENTRY_SIMPLICITY_POC__ = Object.freeze({
    version: "2026-08-29-01",
    plan: planRenderedPropertyReentry,
    enhanceMenu: () => enhancePropertyMenu(
      document.querySelector('[data-testid="ta-authoring-stable-inline-menu"]'),
    ),
    getState: () => ({
      reentryCount: runtimeState.reentryCount,
      ignoredCount: runtimeState.ignoredCount,
      lastPlan: runtimeState.lastPlan,
      menuEnhancementCount: runtimeState.menuEnhancementCount,
      observerConnected: Boolean(observer),
    }),
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePropertyReentrySimplicity, { once: true });
  } else {
    initializePropertyReentrySimplicity();
  }
}
