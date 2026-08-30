import {
  UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
  UNIFIED_EDITOR_TEMPLATE_OPTIONS as TEMPLATE_OPTIONS,
  createUnifiedEditorTemplateDraft,
} from "./unified-editor-template-scaffolds.mjs";

/**
 * The successor keeps the six approved TXT scaffolds byte-for-byte. This
 * module only plans one insertion into the existing editor; it does not own a
 * second draft buffer or a materialization CTA.
 */
export const UNIFIED_EDITOR_TEMPLATE_OPTIONS = TEMPLATE_OPTIONS;

export const UNIFIED_EDITOR_STRUCTURE_ACTIONS = Object.freeze([
  Object.freeze({
    action: "item",
    group: "current-step",
    relation: "same",
    relationLabel: "현재 단계에",
    label: "다음 할 일",
    description: "같은 단계의 할 일을 이어서 추가",
    syntax: "- [ ] ",
    indentLevel: 0,
  }),
  Object.freeze({
    action: "subcheck",
    group: "current-item",
    relation: "child",
    relationLabel: "현재 할 일 아래",
    label: "하위 확인",
    description: "현재 할 일에 딸린 확인 항목 추가",
    syntax: "  - [ ] ",
    indentLevel: 1,
  }),
  Object.freeze({
    action: "properties",
    group: "current-item",
    relation: "detail",
    relationLabel: "현재 할 일 안에",
    label: "항목 정보",
    description: "날짜 · 시간 · 장소 · 반복 · 자료 · 완료 기준",
    syntax: "  - 날짜: …",
    indentLevel: 1,
  }),
  Object.freeze({
    action: "step",
    group: "new-section",
    relation: "section",
    relationLabel: "새 구간으로",
    label: "새 단계",
    description: "다음 할 일 묶음을 새 단계에서 시작",
    syntax: "## ",
    indentLevel: 0,
  }),
]);

function freezeBlocked(reason) {
  return Object.freeze({
    status: "blocked",
    reason,
    dispatchCount: 0,
    changeCount: 0,
  });
}

function sourceValue(input, primary, fallback) {
  if (Object.hasOwn(input ?? {}, primary)) return String(input[primary] ?? "");
  if (fallback && Object.hasOwn(input ?? {}, fallback)) return String(input[fallback] ?? "");
  return "";
}

/**
 * Plans the only source-changing part of template selection. The caller must
 * dispatch `transaction` once. Every stale/unsafe condition returns no change.
 */
export function prepareUnifiedEditorTemplateInsertion(input) {
  if (input?.hostMatches !== true) return freezeBlocked("stale-host");
  if (input?.composing === true) return freezeBlocked("active-composition");
  if (
    input?.openedSourceFingerprint !== UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT
    || input?.currentSourceFingerprint !== input.openedSourceFingerprint
  ) {
    return freezeBlocked("source-fingerprint-mismatch");
  }

  const openedSource = sourceValue(input, "openedSource", "initialSource");
  const currentSource = sourceValue(input, "currentSource", "sourceText");
  if (openedSource !== "") return freezeBlocked("initial-source-not-empty");
  if (currentSource !== "") return freezeBlocked("source-changed");

  const openedDispatchCount = input?.openedDispatchCount;
  const currentDispatchCount = input?.currentDispatchCount;
  if (
    !Number.isSafeInteger(openedDispatchCount)
    || openedDispatchCount < 0
    || !Number.isSafeInteger(currentDispatchCount)
    || currentDispatchCount < 0
  ) {
    return freezeBlocked("dispatch-count-missing");
  }
  if (openedDispatchCount !== currentDispatchCount) return freezeBlocked("source-changed");

  let draft;
  try {
    draft = createUnifiedEditorTemplateDraft(input?.templateId);
  } catch (error) {
    if (error instanceof RangeError) return freezeBlocked("unknown-template");
    throw error;
  }

  const changes = Object.freeze({ from: 0, to: 0, insert: draft.text });
  const selection = Object.freeze({ anchor: 2 });
  const transaction = Object.freeze({ changes, selection });
  return Object.freeze({
    status: "ready",
    templateId: draft.templateId,
    sourceFingerprint: UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
    nextSource: draft.text,
    dispatchCount: 1,
    changeCount: 1,
    firstEditableSlot: Object.freeze({ line: 1, kind: "flow-title", offset: 2 }),
    transaction,
    command: transaction,
  });
}

const GENERIC_HINTS = Object.freeze({
  "flow-title": "예: 나의 준비 Flow",
  "step-title": "예: 첫 단계",
  "item-title": "예: 예약 확인",
  "subcheck-title": "예: 취소 조건 확인",
  기준일: "예: 2026-09-15",
  날짜: "예: 2026-09-15",
  "상대 날짜": "예: D-3",
  시간: "예: 09:30",
  시간대: "예: Asia/Seoul",
  장소: "예: 서울역 2번 출구",
  "소요 시간": "예: 30분",
  반복: "예: 매주 월, 수",
  "반복 종료": "예: 8회 또는 2026-10-31",
  설명: "예: 예약 메일과 결제 내역 확인",
  "실행 조건": "예: 결제 승인을 받은 뒤",
  자료: "예: [예약 페이지](https://example.com)",
  안내: "예: 신분증을 미리 준비",
  주의: "예: 취소 수수료 확인",
  출처: "예: [공식 안내](https://example.com)",
  "완료 기준": "예: 예약 번호를 기록하면 완료",
});

function lineRecords(text) {
  const records = [];
  const newlinePattern = /\r\n|\r|\n/gu;
  let start = 0;
  let match;
  while ((match = newlinePattern.exec(text)) !== null) {
    records.push(Object.freeze({
      line: records.length + 1,
      start,
      text: text.slice(start, match.index),
    }));
    start = match.index + match[0].length;
  }
  records.push(Object.freeze({ line: records.length + 1, start, text: text.slice(start) }));
  return records;
}

function blankSyntax(lineText) {
  if (/^##[\t ]*$/u.test(lineText)) {
    return { kind: "step-title", anchor: lineText.length };
  }
  if (/^#[\t ]*$/u.test(lineText)) {
    return { kind: "flow-title", anchor: lineText.length };
  }
  const blankCheck = /^([\t ]*)[-*+][\t ]+\[ \][\t ]*$/u.exec(lineText);
  if (blankCheck) {
    const indentationWidth = blankCheck[1].replace(/\t/gu, "  ").length;
    return {
      kind: indentationWidth >= 2 ? "subcheck-title" : "item-title",
      anchor: lineText.length,
    };
  }
  const property = /^(?:[\t ]{0,2})-[\t ]+([^:：\r\n]+)[:：][\t ]*$/u.exec(lineText);
  const label = property?.[1]?.trim();
  if (label && Object.hasOwn(GENERIC_HINTS, label)) {
    return { kind: "property-value", propertyLabel: label, anchor: lineText.length };
  }
  return undefined;
}

function templateHintMatches(blank, hint) {
  if (!hint) return false;
  if (hint.kind === blank.kind) return true;
  if (hint.kind === "property-value" && blank.kind === "property-value") return true;
  return hint.kind === "location"
    && blank.kind === "property-value"
    && blank.propertyLabel === "장소";
}

function normalizeHintInput(input, options) {
  if (typeof input === "object" && input !== null) {
    return {
      text: String(input.text ?? ""),
      examplesVisible: input.examplesVisible !== false,
      templateId: input.templateId,
    };
  }
  return {
    text: String(input ?? ""),
    examplesVisible: options?.examplesVisible !== false,
    templateId: options?.templateId,
  };
}

/**
 * Derives presentation-only hints from the current TXT bytes. `origin` is
 * intentionally ignored: direct typing, + insertion, template insertion and
 * re-entry receive the same result for the same text and template context.
 */
export function deriveUnifiedEditorGhostHints(input, options) {
  const normalized = normalizeHintInput(input, options);
  if (!normalized.examplesVisible) return Object.freeze([]);

  const template = UNIFIED_EDITOR_TEMPLATE_OPTIONS.find(
    ({ templateId }) => templateId === String(normalized.templateId ?? ""),
  );
  const templateHints = new Map(template?.hints.map((hint) => [hint.line, hint]) ?? []);
  const hints = [];
  for (const line of lineRecords(normalized.text)) {
    const blank = blankSyntax(line.text);
    if (!blank) continue;
    const templateHint = templateHints.get(line.line);
    const text = templateHintMatches(blank, templateHint)
      ? templateHint.text
      : GENERIC_HINTS[blank.propertyLabel ?? blank.kind];
    hints.push(Object.freeze({
      line: line.line,
      start: line.start,
      anchor: line.start + blank.anchor,
      kind: blank.kind,
      propertyLabel: blank.propertyLabel ?? null,
      text,
    }));
  }
  return Object.freeze(hints);
}

function freezeExampleState(visible) {
  return Object.freeze({
    visible,
    ariaPressed: visible,
    buttonLabel: visible ? "예시 숨기기" : "예시 보기",
  });
}

export function createUnifiedEditorExampleState(visible = true) {
  return freezeExampleState(visible !== false);
}

/** Presentation-only reducer. It never accepts or returns source text. */
export function reduceUnifiedEditorExampleState(state, action) {
  const visible = state?.visible !== false;
  const type = typeof action === "string" ? action : action?.type;
  if (type === "toggle") return freezeExampleState(!visible);
  if (type === "show") return freezeExampleState(true);
  if (type === "hide") return freezeExampleState(false);
  return freezeExampleState(visible);
}
