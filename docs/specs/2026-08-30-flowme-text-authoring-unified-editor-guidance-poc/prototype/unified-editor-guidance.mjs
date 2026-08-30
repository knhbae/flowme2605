import {
  UNIFIED_EDITOR_STRUCTURE_ACTIONS,
  UNIFIED_EDITOR_TEMPLATE_OPTIONS,
  createUnifiedEditorExampleState,
  deriveUnifiedEditorGhostHints,
  prepareUnifiedEditorTemplateInsertion,
  reduceUnifiedEditorExampleState,
} from "./unified-editor-guidance-controller.mjs";
import {
  UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
} from "./unified-editor-template-scaffolds.mjs";

export {
  UNIFIED_EDITOR_STRUCTURE_ACTIONS,
  UNIFIED_EDITOR_TEMPLATE_OPTIONS,
  createUnifiedEditorExampleState,
  deriveUnifiedEditorGhostHints,
  prepareUnifiedEditorTemplateInsertion,
  reduceUnifiedEditorExampleState,
};

const SELECTORS = Object.freeze({
  editor: '[data-testid="ta-authoring-flow-editor"]',
  content: '[data-testid="ta-authoring-flow-editor-content"]',
  mount: '[data-testid="ta-authoring-flow-editor-mount"]',
  menu: '[data-testid="ta-authoring-stable-inline-menu"]',
  layer: '[data-testid="ta-authoring-stable-inline-layer"]',
  flowToggle: '[data-testid="ta-authoring-view-flow"]',
  textToggle: '[data-testid="ta-authoring-view-text"]',
  syntaxGuide: '[data-testid="ta-authoring-syntax-guide"]',
});

const TEST_IDS = Object.freeze({
  exampleToggle: "ta-authoring-unified-example-toggle",
  ghostLayer: "ta-authoring-unified-ghost-layer",
  structureMenu: "ta-authoring-unified-structure-menu",
  templateEntry: "ta-authoring-unified-template-entry",
  templatePicker: "ta-authoring-unified-template-picker",
});

const runtimeState = {
  picker: null,
  composing: false,
  selectingTemplate: false,
  exampleState: createUnifiedEditorExampleState(true),
  activeTemplateId: null,
  insertionCount: 0,
  blockedCount: 0,
  lastBlockedReason: null,
  lastResult: null,
  hintCount: 0,
  hintTexts: [],
  entryEnhancementCount: 0,
  hierarchyEnhancementCount: 0,
  pickerOpenCount: 0,
  exampleToggleCount: 0,
  returnedToTemplateEntry: false,
  refreshFrame: 0,
  contentObserver: null,
  observedContent: null,
  scrollTarget: null,
};

function stableInlineApi() {
  return window.__FLOWME_STABLE_INLINE_INFO_EDITOR_POC__
    ?? window.__FLOWME_KEYBOARD_PROPERTY_TRAY_RELIABILITY_POC__
    ?? null;
}

function continuousEditorState() {
  return window.__FLOWME_CONTINUOUS_LIVE_EDITOR_POC__?.getState?.() ?? null;
}

function isFlowModeActive() {
  const editor = document.querySelector(SELECTORS.editor);
  const toggle = document.querySelector(SELECTORS.flowToggle);
  return editor?.getAttribute("data-editor-mode") === "flow"
    && toggle?.getAttribute("aria-pressed") === "true";
}

function editorRuntimeFor(element = document) {
  const editor = element?.closest?.(SELECTORS.editor)
    ?? document.querySelector(SELECTORS.editor);
  const content = editor?.querySelector?.(SELECTORS.content);
  const mount = editor?.querySelector?.(SELECTORS.mount);
  const view = content?.cmTile?.view;
  const live = continuousEditorState();
  if (
    !(editor instanceof HTMLElement)
    || !(content instanceof HTMLElement)
    || !(mount instanceof HTMLElement)
    || !view?.state?.doc
    || view.contentDOM !== content
    || editor.getAttribute("aria-busy") === "true"
    || (live && live.documentText !== view.state.doc.toString())
  ) {
    return null;
  }
  return { editor, content, mount, view, live };
}

function editorViewportRuntimeFor(element = document) {
  const editor = element?.closest?.(SELECTORS.editor)
    ?? document.querySelector(SELECTORS.editor);
  const content = editor?.querySelector?.(SELECTORS.content);
  const mount = editor?.querySelector?.(SELECTORS.mount);
  const view = content?.cmTile?.view;
  if (
    !(editor instanceof HTMLElement)
    || !(content instanceof HTMLElement)
    || !(mount instanceof HTMLElement)
    || !view?.state?.doc
    || view.contentDOM !== content
  ) {
    return null;
  }
  return { editor, content, mount, view };
}

function ensureLiveRegion() {
  let live = document.querySelector('[data-testid="ta-authoring-unified-live"]');
  if (!(live instanceof HTMLElement)) {
    live = document.createElement("p");
    live.className = "ueg-live";
    live.dataset.testid = "ta-authoring-unified-live";
    live.dataset.unifiedEditorOwned = "true";
    live.setAttribute("role", "status");
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    document.body.append(live);
  }
  return live;
}

function announce(message) {
  const live = ensureLiveRegion();
  live.textContent = "";
  window.requestAnimationFrame(() => {
    live.textContent = message;
  });
}

function sourceHeader() {
  const guide = document.querySelector(SELECTORS.syntaxGuide);
  if (guide instanceof HTMLElement) {
    const help = guide.closest(".ta-inline-help");
    if (help?.parentElement instanceof HTMLElement) return help.parentElement;
  }
  const candidates = [...document.querySelectorAll("span, label")];
  const label = candidates.find((element) => element.textContent?.trim() === "작업 원문");
  return label?.parentElement ?? null;
}

function syncExampleToggle(button) {
  if (!(button instanceof HTMLButtonElement)) return;
  button.textContent = runtimeState.exampleState.buttonLabel;
  button.setAttribute("aria-pressed", String(runtimeState.exampleState.ariaPressed));
  button.hidden = !isFlowModeActive();
}

function toggleExamples(event) {
  runtimeState.exampleState = reduceUnifiedEditorExampleState(
    runtimeState.exampleState,
    { type: "toggle" },
  );
  runtimeState.exampleToggleCount += 1;
  const button = document.querySelector(`[data-testid="${TEST_IDS.exampleToggle}"]`);
  syncExampleToggle(button);
  renderGhostHints();
  if (event?.detail > 0) {
    const safe = editorRuntimeFor();
    window.requestAnimationFrame(() => safe?.view?.focus?.());
  }
}

function ensureExampleToggle() {
  const header = sourceHeader();
  if (!(header instanceof HTMLElement)) return null;
  for (const stale of document.querySelectorAll(`[data-testid="${TEST_IDS.exampleToggle}"]`)) {
    if (stale.parentElement !== header) stale.remove();
  }
  let button = header.querySelector(`[data-testid="${TEST_IDS.exampleToggle}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "ueg-example-toggle";
    button.dataset.testid = TEST_IDS.exampleToggle;
    button.dataset.unifiedEditorOwned = "true";
    button.setAttribute("aria-controls", "ta-authoring-unified-ghost-layer");
    button.setAttribute("aria-label", "Flow 편집 입력 예시 보기 또는 숨기기");
    button.addEventListener("pointerdown", (event) => event.preventDefault());
    button.addEventListener("click", toggleExamples);
    const trailingStatus = [...header.children].find(
      (child) => child instanceof HTMLElement && child.getAttribute("aria-live") === "polite",
    );
    header.insertBefore(button, trailingStatus ?? null);
  }
  syncExampleToggle(button);
  return button;
}

function ensureGhostLayer(editor) {
  for (const stale of document.querySelectorAll(`[data-testid="${TEST_IDS.ghostLayer}"]`)) {
    if (stale.parentElement !== editor) stale.remove();
  }
  let layer = editor?.querySelector?.(`[data-testid="${TEST_IDS.ghostLayer}"]`);
  if (!(layer instanceof HTMLElement) && editor instanceof HTMLElement) {
    layer = document.createElement("div");
    layer.id = "ta-authoring-unified-ghost-layer";
    layer.className = "ueg-ghost-layer";
    layer.dataset.testid = TEST_IDS.ghostLayer;
    layer.dataset.unifiedEditorOwned = "true";
    layer.setAttribute("aria-hidden", "true");
    editor.append(layer);
  }
  return layer;
}

function scaffoldLineShapeMatches(scaffoldLine, currentLine) {
  if (scaffoldLine === "") return currentLine === "";
  if (/^##[\t ]*$/u.test(scaffoldLine)) return /^##(?:[\t ]+.*)?$/u.test(currentLine);
  if (/^#[\t ]*$/u.test(scaffoldLine)) {
    return /^#(?:[\t ]+.*)?$/u.test(currentLine) && !/^##/u.test(currentLine);
  }
  if (/^[\t ]{2}-[\t ]*\[[\t ]*\][\t ]*$/u.test(scaffoldLine)) {
    return /^[\t ]{2}-[\t ]*\[[\t ]*\](?:[\t ]+.*)?$/u.test(currentLine);
  }
  if (/^-[\t ]*\[[\t ]*\][\t ]*$/u.test(scaffoldLine)) {
    return /^-[\t ]*\[[\t ]*\](?:[\t ]+.*)?$/u.test(currentLine);
  }
  const property = /^(?<prefix>[\t ]{0,2}-[\t ]+[^:：\r\n]+[:：])[\t ]*$/u.exec(scaffoldLine);
  return property ? currentLine.startsWith(property.groups.prefix) : currentLine === scaffoldLine;
}

function alignedTemplateId(text) {
  const template = UNIFIED_EDITOR_TEMPLATE_OPTIONS.find(
    ({ templateId }) => templateId === runtimeState.activeTemplateId,
  );
  if (!template) return null;
  const scaffoldLines = template.scaffold.split(/\r\n|\r|\n/u);
  const currentLines = String(text ?? "").split(/\r\n|\r|\n/u);
  if (scaffoldLines.length !== currentLines.length) return null;
  return scaffoldLines.every((line, index) => scaffoldLineShapeMatches(line, currentLines[index]))
    ? template.templateId
    : null;
}

function visibleEditorBounds(safe) {
  const editorRect = safe.editor.getBoundingClientRect();
  const scrollerRect = safe.view.scrollDOM?.getBoundingClientRect?.() ?? editorRect;
  const viewport = window.visualViewport;
  const viewportTop = viewport?.offsetTop ?? 0;
  const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
  return {
    editorRect,
    top: Math.max(editorRect.top, scrollerRect.top, viewportTop),
    bottom: Math.min(editorRect.bottom, scrollerRect.bottom, viewportBottom),
  };
}

function renderGhostHints() {
  const safe = editorRuntimeFor();
  const editor = safe?.editor ?? document.querySelector(SELECTORS.editor);
  const layer = editor instanceof HTMLElement ? ensureGhostLayer(editor) : null;
  if (!(layer instanceof HTMLElement)) return [];
  const visible = Boolean(safe && isFlowModeActive() && runtimeState.exampleState.visible);
  layer.hidden = !visible;
  if (!visible) {
    layer.replaceChildren();
    runtimeState.hintCount = 0;
    runtimeState.hintTexts = [];
    return [];
  }

  const text = safe.view.state.doc.toString();
  const templateId = alignedTemplateId(text);
  if (runtimeState.activeTemplateId && !templateId) runtimeState.activeTemplateId = null;
  const hints = deriveUnifiedEditorGhostHints({
    text,
    examplesVisible: true,
    templateId,
  });
  const viewport = safe.view.viewport ?? { from: 0, to: safe.view.state.doc.length };
  const bounds = visibleEditorBounds(safe);
  const fragment = document.createDocumentFragment();
  const rendered = [];
  for (const hint of hints) {
    if (hint.anchor < viewport.from || hint.anchor > viewport.to) continue;
    let coordinates;
    try {
      coordinates = safe.view.coordsAtPos(hint.anchor);
    } catch {
      continue;
    }
    if (!coordinates || coordinates.bottom < bounds.top - 24 || coordinates.top > bounds.bottom + 24) {
      continue;
    }
    const ghost = document.createElement("span");
    ghost.className = "ueg-ghost";
    ghost.dataset.unifiedEditorOwned = "true";
    ghost.dataset.ghostLine = String(hint.line);
    ghost.dataset.ghostKind = hint.kind;
    if (hint.propertyLabel) ghost.dataset.propertyLabel = hint.propertyLabel;
    ghost.textContent = hint.text;
    const left = Math.max(8, (coordinates.right ?? coordinates.left) - bounds.editorRect.left + 7);
    ghost.style.left = `${left}px`;
    ghost.style.top = `${Math.max(0, coordinates.top - bounds.editorRect.top)}px`;
    ghost.style.maxWidth = `${Math.max(0, bounds.editorRect.width - left - 54)}px`;
    fragment.append(ghost);
    rendered.push(hint);
  }
  layer.replaceChildren(fragment);
  runtimeState.hintCount = rendered.length;
  runtimeState.hintTexts = rendered.map(({ text: hintText }) => hintText);
  return rendered;
}

function keepCaretAboveVisualKeyboard() {
  const safe = editorViewportRuntimeFor();
  const viewport = window.visualViewport;
  if (!safe || !viewport || !isFlowModeActive()) {
    document.documentElement.style.setProperty("--ueg-visual-keyboard-inset", "0px");
    document.documentElement.dataset.unifiedKeyboardOpen = "false";
    return false;
  }
  const keyboardInset = Math.max(
    0,
    window.innerHeight - (viewport.offsetTop ?? 0) - viewport.height,
  );
  document.documentElement.style.setProperty(
    "--ueg-visual-keyboard-inset",
    `${keyboardInset}px`,
  );
  document.documentElement.dataset.unifiedKeyboardOpen = String(keyboardInset >= 120);
  const coordinates = safe.view.coordsAtPos(safe.view.state.selection.main.head);
  if (!coordinates) return false;
  const visibleTop = viewport.offsetTop ?? 0;
  const visibleBottom = visibleTop + viewport.height;
  const margin = 20;
  let delta = 0;
  if (coordinates.bottom > visibleBottom - margin) {
    delta = coordinates.bottom - visibleBottom + margin;
  } else if (coordinates.top < visibleTop + margin) {
    delta = coordinates.top - visibleTop - margin;
  }
  if (Math.abs(delta) < 1) return false;
  const beforeScrollerTop = safe.view.scrollDOM.scrollTop;
  safe.view.scrollDOM.scrollTop += delta;
  const consumedByEditor = safe.view.scrollDOM.scrollTop - beforeScrollerTop;
  const pageDelta = delta - consumedByEditor;
  if (Math.abs(pageDelta) >= 1) window.scrollBy({ top: pageDelta, behavior: "auto" });
  window.requestAnimationFrame(() => safe.view.requestMeasure?.());
  return true;
}

function createStructureWrapper(menu) {
  let wrapper = menu.querySelector(`[data-testid="${TEST_IDS.structureMenu}"]`);
  if (!(wrapper instanceof HTMLElement)) {
    wrapper = document.createElement("div");
    wrapper.className = "ueg-structure-menu";
    wrapper.dataset.testid = TEST_IDS.structureMenu;
    wrapper.dataset.unifiedEditorOwned = "true";
    wrapper.setAttribute("role", "presentation");
    const heading = menu.querySelector(".tsi-menu-heading");
    heading?.after(wrapper);
  }
  const options = [...menu.children].filter(
    (child) => child instanceof HTMLElement && child.classList.contains("tsi-option"),
  );
  wrapper.append(...options);
  return wrapper;
}

function createTemplateEntry() {
  const entry = document.createElement("button");
  entry.type = "button";
  entry.id = "ta-authoring-unified-template-entry";
  entry.className = "tsi-option ueg-template-entry";
  entry.dataset.testid = TEST_IDS.templateEntry;
  entry.dataset.unifiedEditorOwned = "true";
  entry.dataset.unifiedTemplateEntry = "true";
  // Keep the entry in the inherited roving list without borrowing a source
  // mutation command. Keyboard activation is completed on keyup below.
  entry.dataset.stableInlineAction = "unified-template";
  entry.setAttribute("role", "menuitem");
  entry.setAttribute("aria-label", "작성 틀로 시작. 반복, 기준일, 일정 골격을 원문에 넣습니다.");
  entry.tabIndex = -1;
  const title = document.createElement("span");
  title.className = "tsi-option-title";
  title.textContent = "작성 틀로 시작";
  const syntax = document.createElement("code");
  syntax.textContent = "반복 · 기준일 · 일정";
  const description = document.createElement("small");
  description.textContent = "빈 TXT 골격을 넣고 이 편집기에서 바로 수정";
  entry.append(title, syntax, description);
  entry.addEventListener("focus", () => alignStableActiveControl(entry));
  return entry;
}

function alignStableActiveControl(control) {
  const menu = control?.closest?.(SELECTORS.menu);
  const safe = editorRuntimeFor(menu);
  const api = stableInlineApi();
  if (!(menu instanceof HTMLElement) || !safe || !api?.getState) return false;
  const controls = [...menu.querySelectorAll("[data-stable-inline-action]")];
  const desired = controls.indexOf(control);
  const current = Number(api.getState().activeIndex);
  if (desired < 0 || !Number.isInteger(current) || controls.length === 0) return false;
  const steps = (desired - current + controls.length) % controls.length;
  for (let index = 0; index < steps; index += 1) {
    safe.content.dispatchEvent(new KeyboardEvent("keydown", {
      key: "ArrowDown",
      bubbles: true,
      cancelable: true,
    }));
  }
  return true;
}

function markFirstStructureActionActive(menu, wrapper) {
  const controls = [...menu.querySelectorAll("[data-stable-inline-action]")];
  const firstOptionIndex = controls.findIndex((control) => control.classList.contains("tsi-option"));
  if (firstOptionIndex < 0) return;
  const active = controls[firstOptionIndex];
  for (const control of controls) control.dataset.active = String(control === active);
  if (active?.id) menu.setAttribute("aria-activedescendant", active.id);
  wrapper.dataset.firstAction = active?.getAttribute("data-stable-inline-action") ?? "";
}

function enhanceNonemptyStructureMenu(menu, wrapper) {
  menu.querySelector('[data-unified-template-entry="true"]')?.remove();
  const options = new Map();
  let changed = false;
  for (const action of UNIFIED_EDITOR_STRUCTURE_ACTIONS) {
    const option = menu.querySelector(`.tsi-option[data-stable-inline-action="${action.action}"]`);
    if (!(option instanceof HTMLButtonElement)) continue;
    const alreadyEnhanced = option.dataset.unifiedAction === action.action
      && option.dataset.unifiedGroup === action.group
      && option.dataset.unifiedIndent === String(action.indentLevel)
      && option.querySelector(".tsi-option-title")?.textContent === action.label
      && option.querySelector("code")?.textContent === action.syntax
      && option.querySelector(".ueg-menu-relation")?.textContent === action.relationLabel
      && option.querySelector(".ueg-menu-description")?.textContent === action.description;
    option.id = `ta-authoring-unified-structure-action-${action.action}`;
    option.dataset.testid = `ta-authoring-unified-structure-action-${action.action}`;
    option.dataset.unifiedEditorOwned = "true";
    option.dataset.unifiedAction = action.action;
    option.dataset.unifiedGroup = action.group;
    option.dataset.unifiedIndent = String(action.indentLevel);
    option.dataset.unifiedHierarchyEnhanced = "true";
    option.dataset.hierarchyRelation = action.relation;
    option.dataset.hierarchyGroup = action.group;
    option.setAttribute(
      "aria-label",
      `${action.relationLabel}. ${action.label}. ${action.description}. 문법 ${action.syntax}`,
    );
    if (alreadyEnhanced) {
      options.set(action.action, option);
      continue;
    }
    const title = option.querySelector(".tsi-option-title") ?? document.createElement("span");
    title.className = "tsi-option-title";
    title.textContent = action.label;
    const syntax = option.querySelector("code") ?? document.createElement("code");
    syntax.textContent = action.syntax;
    option.querySelectorAll("small, .ueg-menu-relation").forEach((element) => element.remove());
    const relation = document.createElement("span");
    relation.className = "ueg-menu-relation";
    relation.textContent = action.relationLabel;
    const description = document.createElement("small");
    description.className = "ueg-menu-description";
    description.textContent = action.description;
    option.replaceChildren(syntax, title, relation, description);
    options.set(action.action, option);
    changed = true;
  }
  const beforeOrder = [...wrapper.querySelectorAll("[data-unified-action]")]
    .map((option) => option.getAttribute("data-unified-action"));
  const targetOrder = UNIFIED_EDITOR_STRUCTURE_ACTIONS
    .map(({ action }) => action)
    .filter((action) => options.has(action));
  const orderChanged = beforeOrder.join("|") !== targetOrder.join("|");
  if (orderChanged) {
    changed = true;
    let previous = null;
    for (const action of UNIFIED_EDITOR_STRUCTURE_ACTIONS) {
      const option = options.get(action.action);
      if (!option) continue;
      if (previous) previous.after(option);
      else wrapper.prepend(option);
      previous = option;
    }
  }
  menu.dataset.unifiedHierarchy = "true";
  if (changed) {
    markFirstStructureActionActive(menu, wrapper);
    runtimeState.hierarchyEnhancementCount += 1;
  }
}

function enhanceStructureMenu(menu) {
  if (
    !(menu instanceof HTMLElement)
    || menu.hidden
    || menu.dataset.mode !== "structure"
    || !isFlowModeActive()
    || runtimeState.picker
  ) return false;
  const safe = editorRuntimeFor(menu);
  if (!safe) return false;
  const wrapper = createStructureWrapper(menu);
  const sourceText = safe.view.state.doc.toString();
  if (sourceText === "") {
    menu.removeAttribute("data-unified-hierarchy");
    let entry = wrapper.querySelector('[data-unified-template-entry="true"]');
    if (!(entry instanceof HTMLButtonElement)) {
      entry = createTemplateEntry();
      const flow = wrapper.querySelector('[data-stable-inline-action="flow"]');
      if (flow instanceof HTMLElement) flow.after(entry);
      else wrapper.prepend(entry);
      runtimeState.entryEnhancementCount += 1;
    }
    return true;
  }
  enhanceNonemptyStructureMenu(menu, wrapper);
  return true;
}

function pickerControls(menu) {
  return [...menu.querySelectorAll("[data-unified-picker-control]")]
    .filter((control) => control instanceof HTMLButtonElement && !control.disabled);
}

function setActivePickerControl(menu, control, focus = false) {
  for (const candidate of pickerControls(menu)) {
    const active = candidate === control;
    candidate.tabIndex = active ? 0 : -1;
    candidate.dataset.active = String(active);
  }
  if (control?.id) menu.setAttribute("aria-activedescendant", control.id);
  if (focus) control?.focus?.({ preventScroll: true });
}

function movePickerFocus(menu, direction) {
  const controls = pickerControls(menu);
  if (controls.length === 0) return;
  const current = controls.findIndex((control) => control.id === menu.getAttribute("aria-activedescendant"));
  let next;
  if (direction === "home") next = 0;
  else if (direction === "end") next = controls.length - 1;
  else if (direction === "next") next = (Math.max(current, -1) + 1) % controls.length;
  else next = current <= 0 ? controls.length - 1 : current - 1;
  setActivePickerControl(menu, controls[next], true);
  controls[next].scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
}

function createPickerButton({ action, template, label, ariaLabel }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = template ? "tsi-option ueg-template-option" : "ueg-picker-command";
  button.dataset.unifiedEditorOwned = "true";
  button.dataset.unifiedPickerControl = "true";
  button.setAttribute("role", "menuitem");
  button.tabIndex = -1;
  if (action) button.dataset.unifiedPickerAction = action;
  if (template) {
    button.id = `ta-authoring-unified-template-option-${template.templateId}`;
    button.dataset.testid = `ta-authoring-unified-template-option-${template.templateId}`;
    button.dataset.unifiedTemplateId = template.templateId;
    button.setAttribute(
      "aria-label",
      `${template.label}. ${template.structureLabel}. ${template.description}. 선택하면 빈 TXT 골격을 원문에 넣습니다.`,
    );
    const title = document.createElement("span");
    title.className = "tsi-option-title";
    title.textContent = template.label;
    const structure = document.createElement("span");
    structure.className = "ueg-template-structure";
    structure.textContent = template.structureLabel;
    const description = document.createElement("small");
    description.textContent = template.description;
    button.append(title, structure, description);
  } else {
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel ?? label);
  }
  return button;
}

function pickerSessionStatus(session) {
  const safe = editorRuntimeFor(session.menu);
  if (!safe || !isFlowModeActive() || safe.view !== session.view || safe.content !== session.content) {
    return "stale-host";
  }
  if (runtimeState.composing || safe.view.composing) return "active-composition";
  if (safe.view.state.doc !== session.openedDoc || safe.view.state.doc.toString() !== "") {
    return "source-changed";
  }
  if (Number(safe.live?.dispatchCount ?? 0) !== session.openedDispatchCount) {
    return "source-changed";
  }
  return "active";
}

function blockedMessage(reason) {
  if (reason === "active-composition") {
    return "한글 입력을 마친 뒤 작성 틀을 다시 선택해 주세요. 원문은 바꾸지 않았습니다.";
  }
  if (reason === "unknown-template") {
    return "이 작성 틀을 찾지 못했습니다. 다른 틀을 선택해 주세요.";
  }
  return "원문이 바뀌어 이 선택은 적용하지 않았습니다. 현재 원문은 그대로 남아 있어요.";
}

function markPickerBlocked(session, reason) {
  if (!session || session.blockedReason) return;
  session.blockedReason = reason;
  for (const option of session.menu.querySelectorAll("[data-unified-template-id]")) {
    if (option instanceof HTMLButtonElement) option.disabled = true;
  }
  const status = session.menu.querySelector('[data-testid="ta-authoring-unified-template-picker-status"]');
  if (status instanceof HTMLElement) {
    status.hidden = false;
    status.textContent = blockedMessage(reason);
  }
  runtimeState.blockedCount += 1;
  runtimeState.lastBlockedReason = reason;
  runtimeState.lastResult = { status: "blocked", reason };
}

function positionTemplatePicker() {
  const session = runtimeState.picker;
  if (!session?.menu?.isConnected || session.menu.hidden) return;
  const safe = editorRuntimeFor(session.menu);
  if (!safe) return;
  const editorRect = safe.editor.getBoundingClientRect();
  const viewport = window.visualViewport;
  const visibleTop = Math.max(editorRect.top, viewport?.offsetTop ?? 0);
  const visibleBottom = Math.min(
    editorRect.bottom,
    (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
  );
  const top = Math.max(8, visibleTop - editorRect.top + 8);
  const bottom = Math.max(top + 120, visibleBottom - editorRect.top - 8);
  const width = Math.max(0, Math.min(360, editorRect.width - 16));
  session.menu.dataset.docked = "true";
  session.menu.dataset.placement = "docked";
  session.menu.style.top = `${top}px`;
  session.menu.style.left = `${Math.max(8, (editorRect.width - width) / 2)}px`;
  session.menu.style.width = `${width}px`;
  session.menu.style.maxHeight = `${Math.max(120, bottom - top)}px`;
}

function monitorPicker() {
  const session = runtimeState.picker;
  if (!session) return;
  const status = pickerSessionStatus(session);
  if (status !== "active") markPickerBlocked(session, status);
  positionTemplatePicker();
}

function closeTemplatePicker(options = {}) {
  const session = runtimeState.picker;
  if (!session) return false;
  runtimeState.picker = null;
  session.menu.hidden = true;
  session.menu.removeAttribute("aria-activedescendant");
  session.menu.removeAttribute("data-docked");
  session.menu.removeAttribute("data-placement");
  session.menu.style.removeProperty("top");
  session.menu.style.removeProperty("left");
  session.menu.style.removeProperty("width");
  session.menu.style.removeProperty("max-height");
  if (options.reopen === true) {
    window.requestAnimationFrame(() => {
      const api = stableInlineApi();
      api?.open?.();
      const menu = document.querySelector(SELECTORS.menu);
      enhanceStructureMenu(menu);
      const entry = menu?.querySelector?.('[data-unified-template-entry="true"]');
      const safe = editorRuntimeFor(menu);
      const controls = [...(menu?.querySelectorAll?.("[data-stable-inline-action]") ?? [])];
      const desired = controls.indexOf(entry);
      const current = Number(api?.getState?.().activeIndex);
      if (safe && desired >= 0 && Number.isInteger(current) && controls.length > 0) {
        const steps = (desired - current + controls.length) % controls.length;
        for (let index = 0; index < steps; index += 1) {
          safe.content.dispatchEvent(new KeyboardEvent("keydown", {
            key: "ArrowDown",
            bubbles: true,
            cancelable: true,
          }));
        }
      }
      if (entry instanceof HTMLButtonElement) {
        entry.focus({ preventScroll: true });
        runtimeState.returnedToTemplateEntry = true;
      }
    });
  } else if (options.focusEditor !== false) {
    window.requestAnimationFrame(() => session.view.focus());
  }
  scheduleRefresh();
  return true;
}

function openTemplatePicker(menu = document.querySelector(SELECTORS.menu)) {
  if (!(menu instanceof HTMLElement)) return false;
  if (runtimeState.picker) return true;
  runtimeState.returnedToTemplateEntry = false;
  const safe = editorRuntimeFor(menu);
  if (
    !safe
    || !isFlowModeActive()
    || safe.view.state.doc.toString() !== ""
    || runtimeState.composing
    || safe.view.composing
  ) {
    runtimeState.blockedCount += 1;
    runtimeState.lastBlockedReason = runtimeState.composing || safe?.view?.composing
      ? "active-composition"
      : "source-changed";
    runtimeState.lastResult = {
      status: "blocked",
      reason: runtimeState.lastBlockedReason,
    };
    return false;
  }

  const session = {
    menu,
    editor: safe.editor,
    content: safe.content,
    view: safe.view,
    openedDoc: safe.view.state.doc,
    openedDispatchCount: Number(safe.live?.dispatchCount ?? 0),
    blockedReason: null,
  };
  stableInlineApi()?.close?.({ focusEditor: false, restoreSelection: false });

  const shell = document.createElement("div");
  shell.className = "ueg-picker-shell";
  shell.dataset.testid = TEST_IDS.templatePicker;
  shell.dataset.unifiedEditorOwned = "true";
  shell.setAttribute("role", "presentation");
  const heading = document.createElement("div");
  heading.className = "tsi-menu-heading ueg-picker-heading";
  heading.setAttribute("role", "presentation");
  const back = createPickerButton({
    action: "back",
    label: "←",
    ariaLabel: "추가 항목으로 돌아가기",
  });
  back.id = "ta-authoring-unified-template-picker-back";
  back.classList.add("ueg-picker-back");
  const title = document.createElement("strong");
  title.id = "ta-authoring-unified-template-picker-title";
  title.textContent = "작성 틀 선택";
  const close = createPickerButton({
    action: "close",
    label: "닫기",
    ariaLabel: "작성 틀 선택 닫기",
  });
  close.id = "ta-authoring-unified-template-picker-close";
  close.classList.add("ueg-picker-close");
  heading.append(back, title, close);

  const options = UNIFIED_EDITOR_TEMPLATE_OPTIONS.map(
    (template) => createPickerButton({ template }),
  );
  const status = document.createElement("p");
  status.className = "ueg-picker-status";
  status.dataset.testid = "ta-authoring-unified-template-picker-status";
  status.setAttribute("role", "status");
  status.hidden = true;
  shell.append(heading, ...options, status);
  menu.replaceChildren(shell);
  menu.dataset.mode = "unified-template-picker";
  menu.setAttribute("aria-label", "작성 틀 선택");
  const layer = menu.closest(SELECTORS.layer);
  if (layer instanceof HTMLElement) layer.hidden = false;
  menu.hidden = false;
  runtimeState.picker = session;
  runtimeState.pickerOpenCount += 1;
  setActivePickerControl(menu, options[0], true);
  positionTemplatePicker();
  return true;
}

function selectTemplate(templateId) {
  const session = runtimeState.picker;
  if (!session || runtimeState.selectingTemplate) return false;
  runtimeState.selectingTemplate = true;
  const safe = editorRuntimeFor(session.menu);
  const hostMatches = Boolean(
    safe
    && isFlowModeActive()
    && safe.view === session.view
    && safe.content === session.content
    && safe.view.state.doc === session.openedDoc,
  );
  const plan = prepareUnifiedEditorTemplateInsertion({
    templateId,
    hostMatches,
    openedSourceFingerprint: UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
    currentSourceFingerprint: UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
    openedSource: "",
    currentSource: safe?.view?.state?.doc?.toString?.() ?? "",
    openedDispatchCount: session.openedDispatchCount,
    currentDispatchCount: Number(safe?.live?.dispatchCount ?? session.openedDispatchCount),
    composing: runtimeState.composing || Boolean(safe?.view?.composing),
  });
  runtimeState.lastResult = plan;
  if (plan.status !== "ready" || !safe) {
    runtimeState.selectingTemplate = false;
    markPickerBlocked(session, plan.reason ?? "stale-host");
    return false;
  }

  closeTemplatePicker({ focusEditor: false });
  safe.view.focus();
  safe.view.dispatch({
    changes: plan.transaction.changes,
    selection: plan.transaction.selection,
    scrollIntoView: true,
    userEvent: "input.template",
  });
  runtimeState.insertionCount += 1;
  runtimeState.activeTemplateId = plan.templateId;
  runtimeState.selectingTemplate = false;
  announce("작성 틀을 원문에 넣었습니다. 첫 빈칸부터 바로 수정하세요.");
  window.requestAnimationFrame(() => {
    safe.view.focus();
    safe.view.requestMeasure?.();
    scheduleRefresh();
  });
  return true;
}

function syncMenuPresentation() {
  const menu = document.querySelector(SELECTORS.menu);
  if (!(menu instanceof HTMLElement)) return;
  if (runtimeState.picker) {
    monitorPicker();
    return;
  }
  const safe = editorRuntimeFor(menu);
  if (
    !menu.hidden
    && menu.dataset.mode === "property-core"
    && safe?.view?.state?.doc?.toString?.() === ""
    && isFlowModeActive()
  ) {
    openTemplatePicker(menu);
    return;
  }
  enhanceStructureMenu(menu);
}

function bindContentObserver() {
  const safe = editorRuntimeFor();
  const content = safe?.content ?? document.querySelector(SELECTORS.content);
  if (!(content instanceof HTMLElement) || content === runtimeState.observedContent) return;
  runtimeState.contentObserver?.disconnect();
  runtimeState.observedContent = content;
  runtimeState.contentObserver = new MutationObserver(scheduleRefresh);
  runtimeState.contentObserver.observe(content, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["data-flow-editor-state", "data-flow-hierarchy-role"],
  });
}

function bindScrollTarget() {
  const safe = editorRuntimeFor();
  const next = safe?.view?.scrollDOM ?? null;
  if (runtimeState.scrollTarget === next) return;
  runtimeState.scrollTarget?.removeEventListener("scroll", scheduleRefresh);
  runtimeState.scrollTarget = next;
  runtimeState.scrollTarget?.addEventListener("scroll", scheduleRefresh, { passive: true });
}

function refreshPresentation() {
  runtimeState.refreshFrame = 0;
  ensureExampleToggle();
  bindContentObserver();
  bindScrollTarget();
  keepCaretAboveVisualKeyboard();
  syncMenuPresentation();
  renderGhostHints();
}

function scheduleRefresh() {
  if (runtimeState.refreshFrame) return;
  runtimeState.refreshFrame = window.requestAnimationFrame(refreshPresentation);
}

function scheduleViewportRefresh() {
  keepCaretAboveVisualKeyboard();
  scheduleRefresh();
  for (const delay of [16, 64, 112]) {
    window.setTimeout(() => {
      keepCaretAboveVisualKeyboard();
      scheduleRefresh();
    }, delay);
  }
}

function handlePointerDown(event) {
  if (!(event.target instanceof Element)) return;
  const control = event.target.closest([
    '[data-unified-template-entry="true"]',
    "[data-unified-template-id]",
    "[data-unified-picker-action]",
  ].join(","));
  if (control instanceof HTMLButtonElement) event.preventDefault();
  if (runtimeState.picker && !runtimeState.picker.menu.contains(event.target)) {
    closeTemplatePicker({ focusEditor: false });
  }
}

function handleClick(event) {
  if (!(event.target instanceof Element)) return;
  const entry = event.target.closest('[data-unified-template-entry="true"]');
  const option = event.target.closest("[data-unified-template-id]");
  const action = event.target.closest("[data-unified-picker-action]");
  if (!(entry || option || action)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (entry instanceof HTMLButtonElement) {
    openTemplatePicker(entry.closest(SELECTORS.menu));
  } else if (option instanceof HTMLButtonElement) {
    selectTemplate(option.dataset.unifiedTemplateId);
  } else if (action instanceof HTMLButtonElement) {
    if (action.dataset.unifiedPickerAction === "back") {
      closeTemplatePicker({ reopen: true, focusEditor: false });
    } else if (action.dataset.unifiedPickerAction === "close") {
      closeTemplatePicker();
    }
  }
}

function handleKeyDown(event) {
  const templateEntry = event.target instanceof Element
    ? event.target.closest('[data-unified-template-entry="true"]')
    : null;
  if (
    !runtimeState.picker
    && templateEntry instanceof HTMLButtonElement
    && (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openTemplatePicker(templateEntry.closest(SELECTORS.menu));
    return;
  }
  const session = runtimeState.picker;
  if (!session || !session.menu.contains(event.target)) return;
  if (event.isComposing || runtimeState.composing || session.view.composing) return;
  const directions = new Map([
    ["ArrowDown", "next"],
    ["ArrowUp", "previous"],
    ["Home", "home"],
    ["End", "end"],
  ]);
  if (directions.has(event.key)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    movePickerFocus(session.menu, directions.get(event.key));
  } else if (event.key === "Enter" || event.key === " ") {
    const active = document.getElementById(session.menu.getAttribute("aria-activedescendant"));
    if (active instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopImmediatePropagation();
      active.click();
    }
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeTemplatePicker({ reopen: true, focusEditor: false });
  } else if (event.key === "Tab") {
    window.requestAnimationFrame(() => {
      if (runtimeState.picker === session) {
        closeTemplatePicker({ focusEditor: false });
      }
    });
  }
}

function handleKeyUp(event) {
  const templateEntry = document.activeElement?.closest?.(
    '[data-unified-template-entry="true"]',
  );
  if (
    !runtimeState.picker
    && templateEntry instanceof HTMLButtonElement
    && (event.key === "Enter" || event.key === " ")
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openTemplatePicker(templateEntry.closest(SELECTORS.menu));
    return;
  }
  if (!runtimeState.returnedToTemplateEntry || event.key !== "Escape") return;
  const menu = document.querySelector(SELECTORS.menu);
  if (!(menu instanceof HTMLElement) || !menu.hidden) return;
  runtimeState.returnedToTemplateEntry = false;
  const trigger = document.querySelector('[data-testid="ta-authoring-stable-inline-trigger"]');
  if (trigger instanceof HTMLButtonElement) trigger.focus({ preventScroll: true });
}

function getState() {
  const safe = editorRuntimeFor();
  const live = continuousEditorState();
  const selection = safe?.view?.state?.selection?.main ?? live?.selection ?? null;
  const menu = document.querySelector(SELECTORS.menu);
  return {
    insertionCount: runtimeState.insertionCount,
    blockedCount: runtimeState.blockedCount,
    blockedReason: runtimeState.lastBlockedReason,
    lastResult: runtimeState.lastResult,
    examplesVisible: runtimeState.exampleState.visible,
    exampleVisible: runtimeState.exampleState.visible,
    exampleButtonLabel: runtimeState.exampleState.buttonLabel,
    exampleToggleCount: runtimeState.exampleToggleCount,
    hintCount: runtimeState.hintCount,
    hintTexts: [...runtimeState.hintTexts],
    templateId: runtimeState.activeTemplateId,
    pickerOpen: Boolean(runtimeState.picker),
    pickerBlockedReason: runtimeState.picker?.blockedReason ?? null,
    templateEntryVisible: Boolean(
      document.querySelector(`[data-testid="${TEST_IDS.templateEntry}"]`)?.getClientRects?.().length,
    ),
    hierarchyOrder: [...(menu?.querySelectorAll("[data-unified-hierarchy-enhanced='true']") ?? [])]
      .map((option) => option.getAttribute("data-stable-inline-action")),
    hierarchyEnhancementCount: runtimeState.hierarchyEnhancementCount,
    entryEnhancementCount: runtimeState.entryEnhancementCount,
    pickerOpenCount: runtimeState.pickerOpenCount,
    documentText: safe?.view?.state?.doc?.toString?.() ?? live?.documentText ?? "",
    selection: selection ? { from: selection.from, to: selection.to, head: selection.head } : null,
    continuousDispatchCount: Number(safe?.live?.dispatchCount ?? live?.dispatchCount ?? 0),
    separateEditorCount: 0,
    materializeCtaCount: 0,
  };
}

function refreshExamples() {
  ensureExampleToggle();
  renderGhostHints();
  return getState();
}

function initializeUnifiedEditorGuidance() {
  document.documentElement.dataset.unifiedEditorGuidancePoc = "true";
  ensureLiveRegion();
  ensureExampleToggle();
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("click", handleClick, true);
  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("keyup", handleKeyUp, true);
  window.addEventListener("compositionstart", () => {
    runtimeState.composing = true;
    if (runtimeState.picker) markPickerBlocked(runtimeState.picker, "active-composition");
  }, true);
  window.addEventListener("compositionend", () => {
    runtimeState.composing = false;
    scheduleRefresh();
  }, true);
  for (const eventName of ["input", "keyup", "pointerup", "focusin", "selectionchange"]) {
    document.addEventListener(eventName, scheduleRefresh, {
      passive: true,
      capture: eventName === "input",
    });
  }
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(SELECTORS.textToggle)) {
      if (runtimeState.picker) closeTemplatePicker({ focusEditor: false });
      scheduleRefresh();
    } else if (event.target.closest(SELECTORS.flowToggle)) {
      window.setTimeout(scheduleRefresh, 0);
    }
  });
  const rootObserver = new MutationObserver((mutations) => {
    const externalChange = mutations.some((mutation) => {
      const target = mutation.target instanceof Element
        ? mutation.target
        : mutation.target.parentElement;
      return !target?.closest?.('[data-unified-editor-owned="true"]');
    });
    if (externalChange) scheduleRefresh();
  });
  rootObserver.observe(document.getElementById("root") || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["hidden", "data-mode", "data-editor-mode", "aria-pressed", "aria-busy"],
  });
  window.addEventListener("resize", scheduleViewportRefresh, { passive: true });
  window.addEventListener("flowme:authoring-visual-viewport-change", scheduleViewportRefresh, { passive: true });
  window.visualViewport?.addEventListener("resize", scheduleViewportRefresh, { passive: true });
  window.visualViewport?.addEventListener("scroll", scheduleViewportRefresh, { passive: true });
  refreshPresentation();
  window.setTimeout(scheduleRefresh, 100);
  window.setTimeout(scheduleRefresh, 300);

  window.__FLOWME_UNIFIED_EDITOR_GUIDANCE_POC__ = Object.freeze({
    version: "2026-08-30-01",
    templates: UNIFIED_EDITOR_TEMPLATE_OPTIONS,
    structureActions: UNIFIED_EDITOR_STRUCTURE_ACTIONS,
    openTemplatePicker: () => {
      let menu = document.querySelector(SELECTORS.menu);
      if (!(menu instanceof HTMLElement) || menu.hidden) {
        stableInlineApi()?.open?.();
        menu = document.querySelector(SELECTORS.menu);
      }
      enhanceStructureMenu(menu);
      return openTemplatePicker(menu);
    },
    selectTemplate,
    refreshExamples,
    toggleExamples: () => toggleExamples(),
    enhanceMenu: () => enhanceStructureMenu(document.querySelector(SELECTORS.menu)),
    prepareInsertion: prepareUnifiedEditorTemplateInsertion,
    deriveGhostHints: deriveUnifiedEditorGhostHints,
    getState,
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeUnifiedEditorGuidance, { once: true });
  } else {
    initializeUnifiedEditorGuidance();
  }
}
