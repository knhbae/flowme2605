import assert from "node:assert/strict";
import test from "node:test";

import {
  UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
  UNIFIED_EDITOR_TEMPLATE_OPTIONS as TEMPLATE_OPTIONS,
} from "./unified-editor-template-scaffolds.mjs";
import {
  UNIFIED_EDITOR_STRUCTURE_ACTIONS,
  UNIFIED_EDITOR_TEMPLATE_OPTIONS,
  createUnifiedEditorExampleState,
  deriveUnifiedEditorGhostHints,
  prepareUnifiedEditorTemplateInsertion,
  reduceUnifiedEditorExampleState,
} from "./unified-editor-guidance-controller.mjs";

function insertionInput(templateId, overrides = {}) {
  return {
    templateId,
    openedSource: "",
    currentSource: "",
    openedSourceFingerprint: UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
    currentSourceFingerprint: UNIFIED_EDITOR_EMPTY_SOURCE_FINGERPRINT,
    openedDispatchCount: 3,
    currentDispatchCount: 3,
    hostMatches: true,
    composing: false,
    ...overrides,
  };
}

test("catalog · 기존 6개 구조 틀과 scaffold byte를 새 편집기에서도 그대로 쓴다", () => {
  assert.equal(UNIFIED_EDITOR_TEMPLATE_OPTIONS, TEMPLATE_OPTIONS);
  assert.equal(UNIFIED_EDITOR_TEMPLATE_OPTIONS.length, 6);

  for (const option of TEMPLATE_OPTIONS) {
    const planned = prepareUnifiedEditorTemplateInsertion(insertionInput(option.templateId));
    assert.equal(planned.status, "ready", option.templateId);
    assert.equal(planned.nextSource, option.scaffold, option.templateId);
    assert.deepEqual(
      new TextEncoder().encode(planned.transaction.changes.insert),
      new TextEncoder().encode(option.scaffold),
      option.templateId,
    );
    assert.deepEqual(planned.transaction.changes, { from: 0, to: 0, insert: option.scaffold });
    assert.deepEqual(planned.transaction.selection, { anchor: 2 });
    assert.deepEqual(planned.firstEditableSlot, { line: 1, kind: "flow-title", offset: 2 });
    assert.equal(planned.dispatchCount, 1);
    assert.equal(planned.changeCount, 1);
  }
});

test("template insertion · nonempty, stale, composition과 ABA를 source write 0으로 막는다", () => {
  const templateId = TEMPLATE_OPTIONS[0].templateId;
  const cases = [
    [{ currentSource: "이미 쓴 글" }, "source-changed"],
    [{ openedSource: "기존 글" }, "initial-source-not-empty"],
    [{ hostMatches: false }, "stale-host"],
    [{ composing: true }, "active-composition"],
    [{ currentSourceFingerprint: "raw-v1:0:stale" }, "source-fingerprint-mismatch"],
    [{ currentDispatchCount: 4 }, "source-changed"],
    [{ currentDispatchCount: undefined }, "dispatch-count-missing"],
    [{ templateId: "missing-template" }, "unknown-template"],
  ];
  for (const [override, reason] of cases) {
    assert.deepEqual(
      prepareUnifiedEditorTemplateInsertion(insertionInput(templateId, override)),
      { status: "blocked", reason, dispatchCount: 0, changeCount: 0 },
    );
  }
});

test("structure menu · 계층·실제 문법·항목 정보 명칭을 한 모델로 고정한다", () => {
  assert.deepEqual(
    UNIFIED_EDITOR_STRUCTURE_ACTIONS.map((action) => ({
      action: action.action,
      group: action.group,
      relationLabel: action.relationLabel,
      label: action.label,
      syntax: action.syntax,
      indentLevel: action.indentLevel,
    })),
    [
      {
        action: "item",
        group: "current-step",
        relationLabel: "현재 단계에",
        label: "다음 할 일",
        syntax: "- [ ] ",
        indentLevel: 0,
      },
      {
        action: "subcheck",
        group: "current-item",
        relationLabel: "현재 할 일 아래",
        label: "하위 확인",
        syntax: "  - [ ] ",
        indentLevel: 1,
      },
      {
        action: "properties",
        group: "current-item",
        relationLabel: "현재 할 일 안에",
        label: "항목 정보",
        syntax: "  - 날짜: …",
        indentLevel: 1,
      },
      {
        action: "step",
        group: "new-section",
        relationLabel: "새 구간으로",
        label: "새 단계",
        syntax: "## ",
        indentLevel: 0,
      },
    ],
  );
  assert.equal(
    UNIFIED_EDITOR_STRUCTURE_ACTIONS.find(({ action }) => action === "properties")?.description,
    "날짜 · 시간 · 장소 · 반복 · 자료 · 완료 기준",
  );
  assert.equal(UNIFIED_EDITOR_STRUCTURE_ACTIONS.some(({ label }) => label === "날짜 · 장소 · 완료 기준"), false);
});

test("ghost hints · 빈 문법에만 나오고 입력값·source byte에는 들어가지 않는다", () => {
  const text = [
    "# ",
    "- 기준일: ",
    "## 이미 쓴 단계",
    "- [ ] ",
    "  - [ ] ",
    "  - 장소: ",
    "  - 날짜: 2026-09-15",
    "일반 문장",
  ].join("\r\n");
  const hints = deriveUnifiedEditorGhostHints({ text, examplesVisible: true });
  assert.deepEqual(hints.map(({ line, kind, propertyLabel }) => ({ line, kind, propertyLabel })), [
    { line: 1, kind: "flow-title", propertyLabel: null },
    { line: 2, kind: "property-value", propertyLabel: "기준일" },
    { line: 4, kind: "item-title", propertyLabel: null },
    { line: 5, kind: "subcheck-title", propertyLabel: null },
    { line: 6, kind: "property-value", propertyLabel: "장소" },
  ]);
  assert.equal(hints.every(({ text: hint }) => hint.startsWith("예:")), true);
  assert.equal(hints.every(({ text: hint }) => !text.includes(hint)), true);
  assert.equal(hints.some(({ line }) => line === 3 || line === 7 || line === 8), false);
  assert.deepEqual(deriveUnifiedEditorGhostHints({ text, examplesVisible: false }), []);
});

test("ghost hints · parser와 같은 bullet·공백 문법만 빈 체크 예시로 인정한다", () => {
  const valid = [
    "- [ ] ",
    "* [ ]",
    "+\t[ ]  ",
    "  * [ ] ",
    "\t+ [ ]",
  ].join("\n");
  assert.deepEqual(
    deriveUnifiedEditorGhostHints(valid).map(({ line, kind }) => ({ line, kind })),
    [
      { line: 1, kind: "item-title" },
      { line: 2, kind: "item-title" },
      { line: 3, kind: "item-title" },
      { line: 4, kind: "subcheck-title" },
      { line: 5, kind: "subcheck-title" },
    ],
  );

  const invalid = [
    "-[ ]",
    "*[ ] ",
    "+[ ]",
    "  -[ ]",
    "-[]",
    "- [  ]",
    "- [\t]",
  ].join("\n");
  assert.deepEqual(deriveUnifiedEditorGhostHints(invalid), []);
});

test("ghost hints · source origin이 달라도 같은 TXT와 template context면 결과가 같다", () => {
  const option = TEMPLATE_OPTIONS.find(
    ({ templateId }) => templateId === "travel-itinerary-prep-v1",
  );
  assert.ok(option);
  const base = {
    text: option.scaffold,
    templateId: option.templateId,
    examplesVisible: true,
  };
  const direct = deriveUnifiedEditorGhostHints({ ...base, origin: "direct-typing" });
  const inserted = deriveUnifiedEditorGhostHints({ ...base, origin: "contextual-plus" });
  const template = deriveUnifiedEditorGhostHints({ ...base, origin: "template" });
  const reentered = deriveUnifiedEditorGhostHints({ ...base, origin: "existing-document" });
  assert.deepEqual(inserted, direct);
  assert.deepEqual(template, direct);
  assert.deepEqual(reentered, direct);
  assert.equal(direct.find(({ line }) => line === 1)?.text, "예: 첫 도쿄 여행");
  assert.equal(direct.find(({ propertyLabel }) => propertyLabel === "장소")?.text, "예: 하네다공항");
});

test("global example state · template session과 무관하게 한 토글 상태만 순수하게 바꾼다", () => {
  const initial = createUnifiedEditorExampleState();
  assert.deepEqual(initial, {
    visible: true,
    ariaPressed: true,
    buttonLabel: "예시 숨기기",
  });
  const hidden = reduceUnifiedEditorExampleState(initial, { type: "toggle", origin: "template" });
  assert.deepEqual(hidden, {
    visible: false,
    ariaPressed: false,
    buttonLabel: "예시 보기",
  });
  const shown = reduceUnifiedEditorExampleState(hidden, { type: "show", origin: "direct-typing" });
  assert.deepEqual(shown, initial);
  assert.deepEqual(reduceUnifiedEditorExampleState(shown, "hide"), hidden);
});
