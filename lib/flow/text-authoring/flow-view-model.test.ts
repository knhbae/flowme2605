import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";

import { buildAuthoringArtifactProjection } from "./artifact-projection";
import { locateAuthoringSource } from "./long-document-table";
import { createTextAuthoringDocument } from "./parser";
import {
  AUTHORING_FLOW_VIEW_STRUCTURED_SOURCE_UNIT_LIMIT,
  buildAuthoringFlowViewModel,
  getAuthoringFlowViewHierarchy,
} from "./flow-view-model";

const NOW = "2026-08-24T00:00:00.000Z";

function modelFor(
  rawText: string,
  options: Parameters<typeof createTextAuthoringDocument>[1] = {},
) {
  const document = createTextAuthoringDocument(rawText, {
    now: NOW,
    ...options,
  });
  return {
    document,
    model: buildAuthoringFlowViewModel({
      documentId: document.documentId,
      rawText: document.rawText,
      parseResult: document.parseResult,
    }),
  };
}

function todoSource(sourceUnits: number, lineEnding = "\n"): string {
  return Array.from(
    { length: sourceUnits },
    (_, index) => `- [ ] 항목 ${index + 1}`,
  ).join(lineEnding);
}

test("source-ordered document semantics preserve CRLF, blank lines, and exact locators", () => {
  const rawText =
    [
      "# 제주 준비",
      "",
      "## 출발 전",
      "- [ ] 항공권을 확인합니다.",
      "  - 날짜: 2026-08-30",
      "  - [x] 예약 번호를 저장합니다.",
      "일반 설명은 TXT 원문으로 남습니다.",
    ].join("\r\n") + "\r\n";
  const { document, model } = modelFor(rawText, {
    documentId: "flow-view-crlf",
    longDocumentTable: { enabled: true },
  });

  assert.equal(model.status, "current");
  assert.equal(model.exactSourceCoverage, true);
  assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
  assert.deepEqual(
    model.blocks.map((block) => block.kind),
    [
      "heading",
      "blank",
      "heading",
      "action",
      "property",
      "action",
      "text",
      "blank",
    ],
  );

  const flowHeading = model.blocks[0];
  assert.equal(flowHeading.kind, "heading");
  if (flowHeading.kind === "heading") {
    assert.equal(flowHeading.level, 1);
    assert.equal(flowHeading.text, "제주 준비");
  }
  assert.equal(flowHeading.rawText, "# 제주 준비\r\n");
  assert.equal(model.blocks[1].rawText, "\r\n");
  assert.equal(model.blocks[1].text, "");
  const terminalBlank = model.blocks.at(-1);
  assert.equal(terminalBlank?.kind, "blank");
  assert.equal(terminalBlank?.rawText, "");
  assert.equal(terminalBlank?.selectionRange.startOffset, rawText.length);
  assert.equal(terminalBlank?.selectionRange.endOffset, rawText.length);

  const rootAction = model.blocks[3];
  assert.equal(rootAction.kind, "action");
  if (rootAction.kind === "action") {
    assert.deepEqual(rootAction.marker, {
      kind: "checkbox",
      checked: false,
    });
    assert.equal(rootAction.text, "항공권을 확인합니다.");
    assert.equal(rootAction.depth, 0);
  }

  const item = document.parseResult.canonical.items[0];
  const dateProperty = model.blocks[4];
  assert.equal(dateProperty.kind, "property");
  if (dateProperty.kind === "property") {
    assert.equal(dateProperty.label, "날짜");
    assert.equal(dateProperty.value, "2026-08-30");
    assert.equal(dateProperty.depth, 1);
    assert.deepEqual(dateProperty.owner, {
      kind: "item",
      id: item.itemId,
    });
  }

  const subcheck = model.blocks[5];
  assert.equal(subcheck.kind, "action");
  if (subcheck.kind === "action") {
    assert.deepEqual(subcheck.marker, {
      kind: "checkbox",
      checked: true,
    });
    assert.equal(subcheck.depth, 1);
    assert.equal(subcheck.entity.kind, "subcheck");
    assert.equal(subcheck.entity.ownerItemId, item.itemId);
  }

  const prose = model.blocks[6];
  assert.equal(prose.kind, "text");
  if (prose.kind === "text") {
    assert.equal(prose.style, "prose");
    assert.equal(prose.attention, undefined);
  }

  assert.equal(
    rootAction.selectionRange.endOffset,
    rawText.indexOf("\r\n", rawText.indexOf("- [ ]")),
  );
  for (const block of model.blocks) {
    assert.equal(locateAuthoringSource(rawText, block.locator).valid, true);
    assert.equal(
      locateAuthoringSource(rawText, block.locator).rawText,
      block.rawText,
    );
  }
});

test("checkbox, bullet, and ordered source keep distinct non-invented markers", () => {
  const rawText = [
    "- [ ] 체크하지 않은 항목",
    "- [x] 체크한 항목",
    "- 글머리 행동",
    "7. 순서 행동",
  ].join("\n");
  const { model } = modelFor(rawText, {
    documentId: "flow-view-action-markers",
  });
  const actions = model.blocks.filter((block) => block.kind === "action");

  assert.equal(actions.length, 4);
  assert.deepEqual(
    actions.map((action) => action.kind === "action" && action.marker),
    [
      { kind: "checkbox", checked: false },
      { kind: "checkbox", checked: true },
      { kind: "bullet" },
      { kind: "ordered", ordinal: "7" },
    ],
  );
  assert.deepEqual(
    actions.map((action) => action.text),
    ["체크하지 않은 항목", "체크한 항목", "글머리 행동", "순서 행동"],
  );
  assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
});

test("plain, URL, code, HTML, comment, blockquote, and table source never become actions", () => {
  const rawText = [
    "일반 배경 설명입니다.",
    "https://example.com/source",
    "> 인용문입니다.",
    "```md",
    "- [ ] 코드 안 문장은 할 일이 아닙니다.",
    "```",
    "<section>원문 HTML</section>",
    "<!-- 원문 주석 -->",
    "| 이름 | 가격 |",
    "| --- | --- |",
    "| 재료 | 1000 |",
  ].join("\n");
  const { document, model } = modelFor(rawText, {
    documentId: "flow-view-raw-shapes",
    longDocumentTable: { enabled: true },
  });

  assert.equal(model.status, "current");
  assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
  assert.equal(
    model.blocks.some((block) => block.kind === "action"),
    false,
  );
  const styles = model.blocks.flatMap((block) =>
    block.kind === "text" ? [block.style] : [],
  );
  for (const style of [
    "prose",
    "link",
    "blockquote",
    "code",
    "html",
    "comment",
    "table",
  ] as const) {
    assert.equal(styles.includes(style), true, `missing text style: ${style}`);
  }
  assert.equal(document.rawText, rawText);
});

test("legacy import assist cannot promote an unmarked plain sentence in document preview", () => {
  const rawText = "항공권 확인";
  const { document, model } = modelFor(rawText, {
    documentId: "flow-view-legacy-import-assist",
    importAssist: true,
  });

  assert.equal(document.parseResult.canonical.items.length, 1);
  assert.equal(
    model.blocks.some((block) => block.kind === "action"),
    false,
  );
  assert.equal(model.blocks.length, 1);
  assert.equal(model.blocks[0].kind, "text");
  if (model.blocks[0].kind === "text") {
    assert.equal(model.blocks[0].style, "prose");
  }
  assert.equal(model.blocks[0].text, rawText);
  assert.equal(model.blocks[0].rawText, rawText);
});

test("invalid and ambiguous source fail closed while valid explicit syntax stays semantic", () => {
  const rawText = [
    "  - [ ] 부모 없는 확인",
    "- [ ] 예약을 확인합니다.",
    "  - 날짜: 2026-99-99",
    "이 문장은 일반 원문입니다.",
  ].join("\n");
  const { model } = modelFor(rawText, { documentId: "flow-view-invalid" });

  assert.equal(model.status, "current");
  assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
  assert.deepEqual(
    model.blocks.map((block) => block.kind),
    ["text", "action", "text", "text"],
  );
  assert.equal(
    model.blocks.filter((block) => block.kind === "action").length,
    1,
  );
  assert.equal(model.blocks[0].attention?.reason, "unsupported");
  assert.equal(model.blocks[2].attention?.reason, "invalid");
  assert.equal(model.blocks[3].attention, undefined);
  assert.equal(
    model.blocks[3].kind === "text" ? model.blocks[3].style : undefined,
    "prose",
  );
});

test("conflicting mappings become literal attention without inventing an action", () => {
  const rawText = "- [ ] 한 항목";
  const document = createTextAuthoringDocument(rawText, {
    documentId: "flow-view-ambiguous-mapping",
    now: NOW,
  });
  const parseResult = structuredClone(document.parseResult);
  const itemMapping = parseResult.mappings.find(
    (mapping) => mapping.targetKind === "item",
  );
  assert.ok(itemMapping);
  parseResult.mappings.push({
    ...itemMapping,
    mappingId: "conflicting-flow-mapping",
    targetKind: "flow",
    targetDraftId: parseResult.canonical.flow.flowId,
  });

  const model = buildAuthoringFlowViewModel({
    documentId: document.documentId,
    rawText,
    parseResult,
  });
  assert.equal(model.status, "current");
  assert.equal(model.blocks.length, 1);
  assert.equal(model.blocks[0].kind, "text");
  if (model.blocks[0].kind === "text") {
    assert.equal(model.blocks[0].style, "literal");
    assert.equal(model.blocks[0].attention?.reason, "ambiguous");
  }
  assert.equal(model.blocks[0].rawText, rawText);
});

test("stale parse identity or source ranges fail closed to one exact literal block", () => {
  const rawText = "- [ ] 원래 항목";
  const document = createTextAuthoringDocument(rawText, {
    documentId: "flow-view-stale",
    now: NOW,
  });
  const staleText = `${rawText}\n새 원문`;
  const staleModel = buildAuthoringFlowViewModel({
    documentId: document.documentId,
    rawText: staleText,
    parseResult: document.parseResult,
  });
  assert.equal(staleModel.status, "raw-only-stale");
  assert.equal(staleModel.blocks.length, 1);
  assert.equal(staleModel.blocks[0].kind, "text");
  if (staleModel.blocks[0].kind === "text") {
    assert.equal(staleModel.blocks[0].style, "literal");
  }
  assert.equal(staleModel.blocks[0].rawText, staleText);

  const corrupt = structuredClone(document.parseResult);
  corrupt.canonical.sourceRows[0].rawText = "다른 bytes";
  const corruptModel = buildAuthoringFlowViewModel({
    documentId: document.documentId,
    rawText,
    parseResult: corrupt,
  });
  assert.equal(corruptModel.status, "raw-only-stale");
  assert.equal(corruptModel.blocks[0].rawText, rawText);
});

test("P1-C too-large analysis returns one exact literal block and zero actions", () => {
  const rawText = "- [ ] 크기 제한을 넘는 원문";
  const { model } = modelFor(rawText, {
    documentId: "flow-view-too-large",
    longDocumentTable: {
      enabled: true,
      limits: { utf8Bytes: 4, lines: 100, logicalCells: 100 },
    },
  });

  assert.equal(model.status, "raw-only-too-large");
  assert.equal(model.blocks.length, 1);
  assert.equal(model.blocks[0].kind, "text");
  if (model.blocks[0].kind === "text") {
    assert.equal(model.blocks[0].style, "literal");
  }
  assert.equal(model.blocks[0].rawText, rawText);
  assert.equal(
    model.blocks.some((block) => block.kind === "action"),
    false,
  );
});

test("visible text and markers remain raw-source-derived when canonical display values drift", () => {
  const rawText = ["- [ ] 예약을 확인합니다.", "  - 날짜: 2026-08-30"].join(
    "\n",
  );
  const document = createTextAuthoringDocument(rawText, {
    documentId: "flow-view-raw-authority",
    now: NOW,
  });
  const parseResult = structuredClone(document.parseResult);
  parseResult.canonical.items[0].sourceTitle = "원문에 없는 행동";
  parseResult.canonical.items[0].title = "원문에 없는 행동";
  parseResult.canonical.items[0].sourceChecked = true;
  const dateField = parseResult.canonical.fields.find(
    (field) => field.key === "date",
  );
  assert.ok(dateField);
  dateField.label = "원문에 없는 필드";
  dateField.value = "2099-12-31";

  const model = buildAuthoringFlowViewModel({
    documentId: document.documentId,
    rawText,
    parseResult,
  });
  const action = model.blocks[0];
  const property = model.blocks[1];

  assert.equal(action.kind, "action");
  if (action.kind === "action") {
    assert.equal(action.text, "예약을 확인합니다.");
    assert.deepEqual(action.marker, { kind: "checkbox", checked: false });
  }
  assert.equal(property.kind, "property");
  if (property.kind === "property") {
    assert.equal(property.label, "날짜");
    assert.equal(property.value, "2026-08-30");
  }
  assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
});

test("property mappings retain Flow and parent Item ownership", () => {
  const rawText = [
    "- 기준일: 2026-08-24",
    "- [ ] 예약을 확인합니다.",
    "  - 날짜: 2026-08-30",
    "  - 완료 기준: 예약 번호를 남겼습니다.",
  ].join("\n");
  const { document, model } = modelFor(rawText, {
    documentId: "flow-view-property-owner",
  });
  const item = document.parseResult.canonical.items[0];
  const properties = model.blocks.filter((block) => block.kind === "property");
  const anchor = properties.find(
    (block) => block.kind === "property" && block.label === "기준일",
  );
  const date = properties.find(
    (block) => block.kind === "property" && block.label === "날짜",
  );
  const completion = properties.find(
    (block) => block.kind === "property" && block.label === "완료 기준",
  );

  assert.ok(item);
  assert.equal(anchor?.kind, "property");
  if (anchor?.kind === "property") {
    assert.equal(anchor.depth, 0);
    assert.deepEqual(anchor.owner, {
      kind: "flow",
      id: document.parseResult.canonical.flow.flowId,
    });
  }
  for (const property of [date, completion]) {
    assert.equal(property?.kind, "property");
    if (property?.kind === "property") {
      assert.equal(property.depth, 1);
      assert.deepEqual(property.owner, { kind: "item", id: item.itemId });
    }
  }
});

test("live-editor hierarchy exposes one root/child level without changing source meaning", () => {
  const rawText = [
    "- 기준일: 2026-08-24",
    "- [ ] 첫 번째 예약을 확인합니다.",
    "  - 설명: 확인 결과가 길어져도 같은 항목 아래에 남습니다.",
    "  - [ ] 예약 번호를 저장합니다.",
    "- [ ] 두 번째 예약을 확인합니다.",
  ].join("\n");
  const { model } = modelFor(rawText, {
    documentId: "flow-view-hierarchy",
  });
  const [flowProperty, rootAction, itemProperty, childAction, nextRootAction] =
    model.blocks;

  assert.deepEqual(getAuthoringFlowViewHierarchy(flowProperty), {
    depth: 0,
    role: "flow-property",
  });
  assert.deepEqual(getAuthoringFlowViewHierarchy(rootAction), {
    depth: 0,
    role: "root-action",
  });
  assert.deepEqual(getAuthoringFlowViewHierarchy(itemProperty), {
    depth: 1,
    role: "item-property",
  });
  assert.deepEqual(getAuthoringFlowViewHierarchy(childAction), {
    depth: 1,
    role: "child-action",
  });
  assert.deepEqual(getAuthoringFlowViewHierarchy(nextRootAction), {
    depth: 0,
    role: "root-action",
  });
  assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
});

test("unsupported deep checkboxes stay literal instead of gaining a deeper visual hierarchy", () => {
  const rawText = [
    "- [ ] 부모 항목",
    "  - [ ] 지원하는 하위 체크",
    "    - [ ] 지원하지 않는 더 깊은 체크",
  ].join("\n");
  const { document, model } = modelFor(rawText, {
    documentId: "flow-view-deep-hierarchy-fallback",
  });
  const deepBlock = model.blocks[2];

  assert.equal(deepBlock.kind, "text");
  assert.deepEqual(getAuthoringFlowViewHierarchy(deepBlock), {
    depth: 0,
    role: "none",
  });
  assert.equal(deepBlock.rawText, "    - [ ] 지원하지 않는 더 깊은 체크");
  assert.equal(
    document.parseResult.canonical.items.some((item) =>
      item.sourceTitle.includes("더 깊은 체크"),
    ),
    false,
  );
  assert.equal(
    document.parseResult.issues.some(
      (issue) => issue.type === "unsupported_nested_item",
    ),
    true,
  );
});

test("indented bullet and ordered Items remain root actions instead of becoming checklist children", () => {
  const rawText = [
    "- 부모 글머리표",
    "    - 들여썼지만 독립 항목인 글머리표",
    "    7. 들여썼지만 독립 항목인 번호 목록",
  ].join("\n");
  const { document, model } = modelFor(rawText, {
    documentId: "flow-view-indented-independent-items",
  });
  const actions = model.blocks.filter((block) => block.kind === "action");

  assert.equal(document.parseResult.canonical.items.length, 3);
  assert.deepEqual(
    actions.map((block) => getAuthoringFlowViewHierarchy(block)),
    [
      { depth: 0, role: "root-action" },
      { depth: 0, role: "root-action" },
      { depth: 0, role: "root-action" },
    ],
  );
  assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
});

test("building document preview is pure and leaves every artifact projection unchanged", () => {
  const rawText = [
    "# 점검",
    "- [ ] 예약을 확인합니다.",
    "  - 날짜: 2026-08-30",
    "  - 완료 기준: 예약 번호를 남겼습니다.",
  ].join("\n");
  const document = createTextAuthoringDocument(rawText, {
    documentId: "flow-view-pure",
    now: NOW,
  });
  const documentBefore = structuredClone(document);
  const projectionBefore = buildAuthoringArtifactProjection(document);

  const model = buildAuthoringFlowViewModel({
    documentId: document.documentId,
    rawText: document.rawText,
    parseResult: document.parseResult,
  });

  assert.deepEqual(document, documentBefore);
  assert.deepEqual(
    buildAuthoringArtifactProjection(document),
    projectionBefore,
  );
  assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
});

test("preview source-unit cap is inclusive and cap + 1 keeps exact bytes in one literal block", () => {
  for (const sourceUnits of [
    AUTHORING_FLOW_VIEW_STRUCTURED_SOURCE_UNIT_LIMIT - 1,
    AUTHORING_FLOW_VIEW_STRUCTURED_SOURCE_UNIT_LIMIT,
  ]) {
    const rawText = todoSource(sourceUnits, "\r\n");
    const { model } = modelFor(rawText, {
      documentId: `flow-view-cap-${sourceUnits}`,
    });
    assert.equal(model.status, "current");
    assert.equal(model.blocks.length, sourceUnits);
    assert.equal(
      model.blocks.filter((block) => block.kind === "action").length,
      sourceUnits,
    );
    assert.equal(model.blocks.map((block) => block.rawText).join(""), rawText);
  }

  const aboveLimit = AUTHORING_FLOW_VIEW_STRUCTURED_SOURCE_UNIT_LIMIT + 1;
  const rawText = todoSource(aboveLimit, "\r\n");
  const { model } = modelFor(rawText, {
    documentId: `flow-view-cap-${aboveLimit}`,
  });
  assert.equal(model.status, "raw-only-too-large");
  assert.equal(model.blocks.length, 1);
  assert.equal(model.blocks[0].kind, "text");
  assert.equal(model.blocks[0].rawText, rawText);
  assert.equal(
    model.blocks.some((block) => block.kind === "action"),
    false,
  );
});

test("preview performance stays bounded at 1k structured units and 20k literal fallback", (t) => {
  const atLimitRaw = todoSource(
    AUTHORING_FLOW_VIEW_STRUCTURED_SOURCE_UNIT_LIMIT,
  );
  const atLimitDocument = createTextAuthoringDocument(atLimitRaw, {
    documentId: "flow-view-performance-1k",
    now: NOW,
  });
  const startAtLimit = performance.now();
  const atLimitModel = buildAuthoringFlowViewModel({
    documentId: atLimitDocument.documentId,
    rawText: atLimitRaw,
    parseResult: atLimitDocument.parseResult,
  });
  const atLimitMs = performance.now() - startAtLimit;

  const twentyThousandRaw = todoSource(20_000);
  const startFallback = performance.now();
  const fallbackModel = buildAuthoringFlowViewModel({
    documentId: atLimitDocument.documentId,
    rawText: twentyThousandRaw,
    parseResult: atLimitDocument.parseResult,
  });
  const fallbackMs = performance.now() - startFallback;

  assert.equal(atLimitModel.status, "current");
  assert.equal(atLimitModel.blocks.length, 1_000);
  assert.ok(atLimitMs < 1_000, `1k structured preview took ${atLimitMs}ms`);
  assert.equal(fallbackModel.status, "raw-only-too-large");
  assert.equal(fallbackModel.blocks.length, 1);
  assert.equal(fallbackModel.blocks[0].kind, "text");
  assert.equal(fallbackModel.blocks[0].rawText, twentyThousandRaw);
  assert.equal(
    fallbackModel.blocks.some((block) => block.kind === "action"),
    false,
  );
  assert.ok(fallbackMs < 250, `20k literal fallback took ${fallbackMs}ms`);
  t.diagnostic(
    `Document preview benchmark: 1k structured=${atLimitMs.toFixed(1)}ms, 20k literal fallback=${fallbackMs.toFixed(1)}ms`,
  );
});
