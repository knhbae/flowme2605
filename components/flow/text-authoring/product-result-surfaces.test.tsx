import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type {
  AuthoringArtifactKind,
  AuthoringArtifactPreflight,
  AuthoringArtifactProjection,
  AuthoringArtifactRow,
  AuthoringArtifactView,
} from "@/lib/flow/text-authoring/artifact-projection";
import { buildAuthoringArtifactProjection } from "@/lib/flow/text-authoring/artifact-projection";
import { serializeAuthoringPlainText } from "@/lib/flow/text-authoring/file-export";
import { createTextAuthoringDocument } from "@/lib/flow/text-authoring/parser";
import type { AuthoringLongDocumentTable } from "@/lib/flow/text-authoring/types";

import { InputPane } from "./InputPane";
import { inspectorUnsafeChangeReason } from "./ItemInspector";
import {
  ResultPane,
  authoringResultSlotState,
  groupAuthoringRowsByItem,
} from "./ResultPane";
import { StructurePane } from "./StructurePane";
import type {
  AuthoringIssueView,
  AuthoringItemPatch,
  AuthoringItemView,
  AuthoringSourceLocatorView,
  AuthoringTableLossView,
} from "./authoring-ui-types";
import {
  resolveTextAuthoringLongDocumentRuntimeDocument,
  resolveTextAuthoringP1LongDocumentTableProductGate,
} from "./TextAuthoringWorkspace";
import {
  buildAuthoringLongDocumentLossLocatorViews,
  buildAuthoringOutlineView,
  buildAuthoringTableRowLocatorViews,
  buildAuthoringTableLossView,
  composeRawPreservedTextResult,
  parseAuthoringLongDocumentFocus,
  resolveAuthoringSourceLocatorView,
  serializeAuthoringLongDocumentFocus,
  shouldUseRawPreservedTextResult,
} from "./view-model";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function artifactRow(
  rowId: string,
  itemId = rowId,
  occurrenceIndex?: number,
): AuthoringArtifactRow {
  return {
    rowId,
    itemId,
    ...(occurrenceIndex == null
      ? {}
      : {
          occurrenceId: `${itemId}-occurrence-${occurrenceIndex}`,
          occurrenceIndex,
        }),
    title: "첫 번째 항목입니다.",
    date: "2026-08-03",
    sourceChecked: false,
    subchecks: [
      {
        subcheckId: `${itemId}-child`,
        title: "하위 확인 항목입니다.",
        sourceChecked: false,
      },
    ],
    validations: [],
    order: 0,
    resources: [],
    sources: [],
    links: [],
    sheetCells: { title: "첫 번째 항목입니다.", date: "2026-08-03" },
    experienceRow: {
      id: rowId,
      sourceItemId: itemId,
      stepId: "step-1",
      title: "첫 번째 항목입니다.",
      description: "",
      caution: "",
      schedule: { state: "scheduled", date: "2026-08-03" },
      resources: [],
      eligibleShapes: ["calendar", "checklist", "sheet", "memo"],
      orderRank: 0,
    },
  } as unknown as AuthoringArtifactRow;
}

function artifactView(
  artifact: AuthoringArtifactKind,
  rows: AuthoringArtifactRow[],
): AuthoringArtifactView {
  return {
    artifact,
    label: artifact,
    eligible: rows.length > 0,
    count: rows.length,
    rows,
    textBlocks: [],
    ...(artifact === "sheet"
      ? {
          sheetColumns: [
            { key: "title", label: "항목" },
            { key: "date", label: "날짜" },
          ],
        }
      : {}),
    losses: [],
    recurrenceSummaries: [],
    hasMoreOccurrences: false,
    orderedOccurrenceIds: [],
    resolvedOccurrenceDates: [],
  };
}

function projection(): AuthoringArtifactProjection {
  const row = artifactRow("item-1");
  const artifacts = {
    calendar: artifactView("calendar", [row]),
    todo: artifactView("todo", [row]),
    sheet: artifactView("sheet", [row]),
    memo: artifactView("memo", [row]),
  };
  return {
    documentId: "document-1",
    title: "제목입니다.",
    primaryArtifact: "memo",
    secondaryArtifacts: ["todo", "calendar", "sheet"],
    recommendations: [],
    artifacts,
    counts: {
      interpreted: 1,
      included: 1,
      excluded: 0,
      dated: 1,
      undated: 0,
    },
    lossManifest: {
      entries: [],
      lossCount: 0,
      sourcePreserved: true,
      adapter: {} as AuthoringArtifactProjection["lossManifest"]["adapter"],
    },
    flowExperienceProjection:
      {} as AuthoringArtifactProjection["flowExperienceProjection"],
    sourceMutationCount: 0,
  };
}

function recurringProjection(): AuthoringArtifactProjection {
  const result = projection();
  const first = {
    ...artifactRow("routine-occurrence-0", "routine", 0),
    validations: [
      {
        type: "invalid_date" as const,
        label: "날짜",
        message: "날짜 형식을 확인해 주세요.",
        input: "8월 3일",
        expected: "YYYY-MM-DD",
        blocking: true,
      },
    ],
  };
  const second = {
    ...artifactRow("routine-occurrence-1", "routine", 1),
    date: "2026-08-10",
    sheetCells: {
      title: "첫 번째 항목입니다.",
      date: "2026-08-10",
    },
  };
  const recurrenceSummary = {
    itemId: "routine",
    label: "매주 월요일 · 2회",
    mode: "finite_count" as const,
    visibleCount: 2,
    totalCount: 2,
    hasMore: false,
  };
  for (const artifact of [
    "calendar",
    "todo",
    "sheet",
    "memo",
  ] as AuthoringArtifactKind[]) {
    result.artifacts[artifact] = {
      ...artifactView(artifact, [first, second]),
      recurrenceSummaries: [recurrenceSummary],
    };
  }
  return result;
}

const preflight: AuthoringArtifactPreflight = {
  preflightId: "preflight-1",
  documentId: "document-1",
  artifact: "memo",
  scope: "whole",
  eligible: true,
  formats: ["plain_text"],
  sourceItemCount: 1,
  count: 1,
  omittedCount: 0,
  itemIds: ["item-1"],
  firstItems: ["첫 번째 항목입니다."],
  losses: [],
  lossCount: 0,
  sourcePreserved: true,
};

const noOp = () => undefined;

function renderResult(
  productMode?: boolean,
  selectedArtifact: AuthoringArtifactKind = "memo",
  resultProjection: AuthoringArtifactProjection = projection(),
  issues: AuthoringIssueView[] = [],
  tableLoss: AuthoringTableLossView | null = null,
  rawPreservedTextResult = false,
  rawValue = "설명입니다.\n- [ ] 첫 번째 항목입니다.",
  structuredValue = rawPreservedTextResult
    ? rawValue
    : "설명입니다.\n\n[ ] 첫 번째 항목입니다.\n    날짜: 2026-08-03",
): string {
  return renderToStaticMarkup(
    <ResultPane
      projection={resultProjection}
      preflight={{ ...preflight, artifact: selectedArtifact }}
      reviewGates={[]}
      userCorrectionCount={0}
      itemCount={1}
      itemReviewCount={issues.length}
      issues={issues}
      selectedArtifact={selectedArtifact}
      anchor=""
      onArtifactChange={noOp}
      onAnchorChange={noOp}
      onEditItem={noOp}
      onEditSourceItem={noOp}
      onEditIssueSource={noOp}
      onOpenExport={noOp}
      onOpenReview={noOp}
      onOpenSourceUpdate={noOp}
      onDeferSourceUpdate={noOp}
      onOpenRoundTrip={noOp}
      onOpenItemReview={noOp}
      onReturnToInput={noOp}
      rawText={rawValue}
      textResultValues={{
        raw: rawValue,
        structured_plain_text: structuredValue,
      }}
      rawPreservedTextResult={rawPreservedTextResult}
      tableLoss={tableLoss}
      onLocateTableLoss={noOp}
      onLocateLongDocumentSource={noOp}
      onDownloadRawText={noOp}
      productMode={productMode}
    />,
  );
}

const SAFE_LONG_TABLE: AuthoringLongDocumentTable = {
  tableId: "table-safe-1",
  format: "csv",
  state: "table-safe",
  headers: ["이름", "가격", "링크"],
  rows: [["준비물", "₩12,000", "https://example.com/?a=1&b=2"]],
  sourceRows: [
    {
      rowId: "safe-table-header",
      rowIndex: 0,
      kind: "header",
      values: ["이름", "가격", "링크"],
      rawText: "이름,가격,링크",
      locator: {
        startOffset: 0,
        endOffset: 8,
        startLine: 1,
        endLine: 1,
        rawHash: "safe-table-header-hash",
        byteExact: true,
      },
      cells: [],
      sourcePreserved: true,
    },
    {
      rowId: "safe-table-body-1",
      rowIndex: 1,
      kind: "body",
      values: ["준비물", "₩12,000", "https://example.com/?a=1&b=2"],
      rawText: '준비물,"₩12,000",https://example.com/?a=1&b=2',
      locator: {
        startOffset: 10,
        endOffset: 71,
        startLine: 2,
        endLine: 2,
        rawHash: "safe-table-row-hash",
        byteExact: true,
      },
      cells: ["준비물", "₩12,000", "https://example.com/?a=1&b=2"].map(
        (value, columnIndex) => ({
          cellId: `safe-table-cell-${columnIndex}`,
          rowIndex: 1,
          columnIndex,
          value,
          rawText: value,
          locator: {
            startOffset: 10 + columnIndex * 10,
            endOffset: 19 + columnIndex * 10,
            startLine: 2,
            endLine: 2,
            rawHash: `safe-table-cell-hash-${columnIndex}`,
            byteExact: true as const,
          },
          sourcePreserved: true as const,
        }),
      ),
      sourcePreserved: true,
    },
  ],
  logicalCellCount: 6,
  rawText: '이름,가격,링크\r\n준비물,"₩12,000",https://example.com/?a=1&b=2',
  locator: {
    startOffset: 0,
    endOffset: 71,
    startLine: 1,
    endLine: 2,
    rawHash: "safe-table-hash",
    byteExact: true,
  },
  sourcePreserved: true,
  issues: [],
};

test("product result surface keeps four slots but hides QA and pre-save transfer controls", () => {
  const markup = renderResult(true);
  for (const artifact of ["calendar", "todo", "sheet", "memo"]) {
    assert.match(
      markup,
      new RegExp(`ta-authoring-result-slot-${artifact}`, "u"),
    );
  }
  assert.match(markup, /계층형 TXT 전체 내용/u);
  assert.match(markup, />표</u);
  assert.doesNotMatch(markup, /표·Excel/u);
  assert.doesNotMatch(markup, /파일로 가져가기/u);
  assert.doesNotMatch(markup, /문법 변환 비교/u);
  assert.doesNotMatch(markup, /항목 검토/u);
  assert.doesNotMatch(markup, /권리·안전/u);
});

test("QA result surface remains the default when product mode is omitted", () => {
  const markup = renderResult();
  assert.match(markup, /표·Excel/u);
  assert.match(markup, /파일로 가져가기/u);
  assert.match(markup, /문법 변환 비교/u);
  assert.match(markup, /항목 검토/u);
  assert.match(markup, /복사할 TXT 전체 내용/u);
});

test("product Todo keeps one parent, one-level checks, and bounded occurrences", () => {
  const markup = renderResult(true, "todo", recurringProjection());
  assert.match(markup, /할 일 · 1개/u);
  assert.match(markup, /하위 확인 항목입니다/u);
  assert.match(markup, /회차 미리보기/u);
  assert.match(markup, /routine-occurrence-0/u);
  assert.match(markup, /routine-occurrence-1/u);
  assert.match(markup, /원문에서 수정/u);
});

test("product Sheet separates canonical rows from diagnostic occurrence rows", () => {
  const markup = renderResult(true, "sheet", recurringProjection());
  assert.match(markup, /표 · 1개/u);
  assert.match(markup, /공통 정보를 비교하는 표/u);
  assert.match(markup, /반복 회차 보기/u);
  assert.match(markup, /반복 회차 표, 2개 행/u);
  assert.doesNotMatch(markup, />수정</u);
});

test("P1-C safe source table keeps exact cells in one horizontal table region", () => {
  const result = projection();
  result.artifacts.sheet = {
    ...result.artifacts.sheet,
    longDocumentTables: [SAFE_LONG_TABLE],
  } as AuthoringArtifactView;
  const markup = renderResult(true, "sheet", result);

  assert.match(markup, /ta-authoring-long-table/u);
  assert.match(markup, /data-row-index="1"/u);
  assert.match(markup, /data-column-index="3"/u);
  assert.match(markup, /₩12,000/u);
  assert.match(markup, /https:\/\/example.com\/\?a=1&amp;b=2/u);
  assert.match(markup, /원문에서 보기/u);
  assert.match(markup, /ta-authoring-long-table-row-source/u);
  assert.match(markup, />1행 원문<\/button>/u);
  assert.match(markup, /data-locator-id="table-row:safe-table-body-1/u);
  assert.match(markup, /data-source-start-offset="10"/u);
  assert.doesNotMatch(markup, /1개 행 · 6개 셀/u);
  assert.doesNotMatch(markup, /첫 번째 항목입니다/u);
});

const TABLE_LOSS: AuthoringTableLossView = {
  state: "blocked",
  summary:
    "표 구조를 안전하게 확인하지 못해 표·Excel을 만들지 않았습니다. 원문과 TXT는 그대로 남아 있습니다.",
  detail: "열 수가 서로 달라 원문 표를 그대로 보존했습니다.",
  sourceRowCount: 3,
  structuredRowCount: 0,
  sourceCellCount: 8,
  structuredCellCount: 0,
  firstLocator: {
    locatorId: "table-loss-1",
    kind: "table",
    label: "확인할 표",
    detail: "열 수가 서로 다릅니다.",
    status: "blocked",
    startOffset: 4,
    endOffset: 42,
    startLine: 2,
    endLine: 4,
  },
};

test("P1-C blocked Sheet explains local loss and keeps source movement", () => {
  const markup = renderResult(true, "sheet", projection(), [], TABLE_LOSS);
  assert.match(markup, /ta-authoring-table-loss-summary/u);
  assert.match(markup, /표·Excel 결과를 만들지 않았습니다/u);
  assert.match(markup, /원문과 TXT는 그대로 남아 있습니다/u);
  assert.match(markup, /3개 행/u);
  assert.match(markup, /ta-authoring-table-loss-source/u);
  assert.doesNotMatch(markup, /parser|manifest|rawHash|fixture/iu);
});

test("P1-C TXT preserves blank lines, indentation, code, and HTML exactly", () => {
  const raw =
    '# 긴 원문\r\n\r\n    들여쓴 문장\r\n```ts\r\n  const value = 1;\r\n```\r\n<div data-x="1">원문</div>';
  const markup = renderResult(true, "memo", projection(), [], null, true, raw);

  assert.match(markup, /원문 보존 TXT 전체 내용/u);
  assert.match(markup, /# 긴 원문\r\n\r\n    들여쓴 문장/u);
  assert.match(markup, /```ts\r\n  const value = 1;/u);
  assert.match(markup, /&lt;div data-x=&quot;1&quot;&gt;원문&lt;\/div&gt;/u);
  assert.match(markup, /원문 보존 TXT 복사/u);
  assert.doesNotMatch(markup, /날짜: 2026-08-03/u);
});

test("P1-C product gate has an explicit default-on rollback seam", () => {
  assert.equal(
    resolveTextAuthoringP1LongDocumentTableProductGate({ productMode: true }),
    true,
  );
  assert.equal(
    resolveTextAuthoringP1LongDocumentTableProductGate({
      productMode: true,
      override: false,
    }),
    false,
  );
  assert.equal(
    resolveTextAuthoringP1LongDocumentTableProductGate({
      productMode: true,
      environmentValue: "off",
    }),
    false,
  );
  assert.equal(
    resolveTextAuthoringP1LongDocumentTableProductGate({ productMode: false }),
    false,
  );
});

test("P1-C runtime OFF derives raw TXT fallback without mutating the saved document", () => {
  const raw = "이름,가격\r\n준비물,12000";
  const saved = createTextAuthoringDocument(raw, {
    longDocumentTable: { enabled: true },
  });
  const runtime = resolveTextAuthoringLongDocumentRuntimeDocument(saved, {
    productMode: true,
    enabled: false,
  });

  assert.notEqual(runtime, saved);
  assert.equal(saved.parseResult.longDocument?.featureEnabled, true);
  assert.equal(runtime?.parseResult.longDocument?.featureEnabled, false);
  assert.equal(runtime?.parseResult.longDocument?.status, "txt-only");
  assert.equal(runtime?.rawText, raw);
  assert.equal(saved.features?.longDocumentTable, true);
});

test("P1-C TXT keeps bounded recurrence structured and exact raw only for preservation shapes", () => {
  const recurringRaw = [
    "# 주간 점검",
    "## 실행",
    "- [ ] 정기 자료 확인",
    "  - 설명: 이번 주 자료를 확인합니다.",
    "  - 날짜: 2026-08-03",
    "  - 반복: 매주 월요일",
    "  - 반복 종료: 3회",
  ].join("\n");
  const recurringDocument = createTextAuthoringDocument(recurringRaw, {
    title: "주간 점검",
    longDocumentTable: { enabled: true },
  });

  assert.equal(shouldUseRawPreservedTextResult(recurringDocument), false);
  const recurringProjection = buildAuthoringArtifactProjection(
    recurringDocument,
    { finiteOccurrenceLimit: 30 },
  );
  const structuredText = serializeAuthoringPlainText(
    recurringDocument.title,
    recurringProjection.artifacts.memo.rows,
  );
  assert.match(structuredText, /정기 자료 확인 · 1회차/u);
  assert.match(structuredText, /정기 자료 확인 · 2회차/u);
  assert.match(structuredText, /정기 자료 확인 · 3회차/u);
  assert.notEqual(structuredText, recurringRaw);

  const mixedRaw = [
    "# 장문 원문",
    "",
    "형식 없는 원문 메모입니다.",
    "",
    "> 인용문은 기호를 보존합니다.",
    "",
    "<!-- 원문 주석 -->",
    "<section>",
    "  <p>들여쓰기를 보존합니다.</p>",
    "</section>",
    "",
    "## 실행",
    "- [ ] 계약서 확인",
    "  - 날짜: 2026-08-20",
  ].join("\n");
  const mixedDocument = createTextAuthoringDocument(mixedRaw, {
    longDocumentTable: { enabled: true },
  });
  assert.equal(shouldUseRawPreservedTextResult(mixedDocument), true);

  const tableDocument = createTextAuthoringDocument(
    ["상품,가격,메모", "A,10000,첫 줄", "B,12000,배송"].join("\n"),
    { longDocumentTable: { enabled: true } },
  );
  assert.equal(shouldUseRawPreservedTextResult(tableDocument), true);

  const budgetFallback = createTextAuthoringDocument(
    "구조 처리 한도를 넘는 원문",
    { longDocumentTable: { enabled: true, limits: { utf8Bytes: 8 } } },
  );
  assert.equal(shouldUseRawPreservedTextResult(budgetFallback), true);
});

test("P1-C mixed raw TXT appends only bounded recurrence occurrences", () => {
  const raw = [
    "# 장문과 반복",
    "",
    "> 이 인용문은 원문 그대로 남깁니다.",
    "",
    "## 실행",
    "- [ ] 정기 자료 확인",
    "  - 날짜: 2026-08-03",
    "  - 반복: 매주 월요일",
    "  - 반복 종료: 3회",
    "- [ ] 한 번만 확인",
  ].join("\n");
  const document = createTextAuthoringDocument(raw, {
    title: "장문과 반복",
    longDocumentTable: { enabled: true },
  });
  const resultProjection = buildAuthoringArtifactProjection(document, {
    finiteOccurrenceLimit: 30,
  });
  const composed = composeRawPreservedTextResult(
    raw,
    resultProjection.artifacts.memo.rows,
  );

  assert.equal(shouldUseRawPreservedTextResult(document), true);
  assert.equal(composed.startsWith(raw), true);
  assert.equal(composed.indexOf(raw, raw.length), -1);
  assert.equal(composed.match(/한 번만 확인/gu)?.length, 1);
  assert.match(composed, /\[반복 회차\]/u);
  assert.match(composed, /정기 자료 확인 · 1회차/u);
  assert.match(composed, /정기 자료 확인 · 2회차/u);
  assert.match(composed, /정기 자료 확인 · 3회차/u);

  const markup = renderResult(
    true,
    "memo",
    resultProjection,
    [],
    null,
    true,
    raw,
    composed,
  );
  assert.match(markup, /\[반복 회차\]/u);
  assert.match(markup, /정기 자료 확인 · 1회차/u);
  assert.match(markup, /정기 자료 확인 · 3회차/u);
});

test("P1-C source locator state round-trips without a storage schema change", () => {
  const focus = {
    locatorId: "table-row:2",
    startOffset: 48,
    startLine: 7,
    sourceScrollTop: 96,
    returnArtifact: "sheet" as const,
    focusTestId: "ta-authoring-long-table-row-source",
    focusLocatorId: "table-row:2",
  };
  const serialized = serializeAuthoringLongDocumentFocus(focus);

  assert.deepEqual(parseAuthoringLongDocumentFocus(serialized), focus);
  assert.equal(parseAuthoringLongDocumentFocus("source"), null);
  assert.equal(parseAuthoringLongDocumentFocus("p1c-source-locator:%7B"), null);
});

test("P1-C stale or directly invalid locator falls back without changing candidates", () => {
  const entries: AuthoringSourceLocatorView[] = [
    {
      locatorId: "heading:1",
      kind: "heading",
      label: "제목",
      detail: "",
      status: "safe",
      startOffset: 0,
      endOffset: 5,
      startLine: 1,
      endLine: 1,
    },
    {
      locatorId: "table:12",
      kind: "table",
      label: "원문 표",
      detail: "",
      status: "safe",
      startOffset: 120,
      endOffset: 190,
      startLine: 12,
      endLine: 16,
    },
  ];

  const before = structuredClone(entries);
  assert.deepEqual(
    resolveAuthoringSourceLocatorView(entries, {
      locatorId: "removed:11",
      startOffset: 9999,
      startLine: 11,
    }),
    { entry: entries[1], stale: true },
  );
  assert.deepEqual(
    resolveAuthoringSourceLocatorView(entries, {
      locatorId: "heading:1",
      startOffset: 0,
      startLine: 1,
    }),
    { entry: entries[0], stale: false },
  );
  assert.deepEqual(entries, before);
});

test("P1-C row restoration candidates retain the exact multiline source row", () => {
  const raw = [
    "상품,가격,메모,링크,비고",
    'A,"10,000원","첫 줄',
    '둘째 줄",https://example.com/item?a=1&b=2,',
    "B,12,000원,배송,https://example.com/item?c=3,확인",
  ].join("\n");
  const document = createTextAuthoringDocument(raw, {
    longDocumentTable: { enabled: true },
  });
  const rowLocators = buildAuthoringTableRowLocatorViews(
    document.parseResult.longDocument,
  );

  assert.equal(rowLocators.length, 2);
  assert.equal(
    raw.slice(rowLocators[0].startOffset, rowLocators[0].endOffset),
    ['A,"10,000원","첫 줄', '둘째 줄",https://example.com/item?a=1&b=2,'].join(
      "\n",
    ),
  );
  assert.match(rowLocators[0].locatorId, /^table-row:/u);
  assert.deepEqual(
    resolveAuthoringSourceLocatorView(rowLocators, {
      locatorId: rowLocators[0].locatorId,
      startOffset: rowLocators[0].startOffset,
      startLine: rowLocators[0].startLine,
    }),
    { entry: rowLocators[0], stale: false },
  );
});

test("P1-C blocked table return keeps the same loss locator CTA identity", () => {
  const raw = [
    "상품,가격,메모",
    'A,"10,000원","닫히지 않은 셀',
    "둘째 줄",
    "B,12,000원,배송",
  ].join("\n");
  const document = createTextAuthoringDocument(raw, {
    longDocumentTable: { enabled: true },
  });
  const lossView = buildAuthoringTableLossView(
    document.parseResult.longDocument,
  );
  const focusCandidates = buildAuthoringLongDocumentLossLocatorViews(
    document.parseResult.longDocument,
  );

  assert.ok(lossView?.firstLocator);
  const expectedCandidate = focusCandidates.find(
    (entry) => entry.locatorId === lossView.firstLocator?.locatorId,
  );
  assert.ok(expectedCandidate);
  assert.deepEqual(
    resolveAuthoringSourceLocatorView(focusCandidates, {
      locatorId: lossView.firstLocator.locatorId,
      startOffset: lossView.firstLocator.startOffset,
      startLine: lossView.firstLocator.startLine,
    }),
    { entry: expectedCandidate, stale: false },
  );
});

test("P1-C TXT exposes exact raw fallback only when structured table output is blocked", () => {
  const blockedMarkup = renderResult(
    true,
    "memo",
    projection(),
    [],
    TABLE_LOSS,
    true,
  );
  assert.match(blockedMarkup, /ta-authoring-raw-source-copy/u);
  assert.match(blockedMarkup, /ta-authoring-raw-source-download/u);
  assert.doesNotMatch(blockedMarkup, /ta-authoring-copy-structured-text/u);

  const safeMarkup = renderResult(true, "memo", projection(), [], null, true);
  assert.doesNotMatch(safeMarkup, /ta-authoring-raw-source-copy/u);
  assert.doesNotMatch(safeMarkup, /ta-authoring-raw-source-download/u);
  assert.match(safeMarkup, /ta-authoring-copy-structured-text/u);
});

test("product Calendar is a month grid with selected-day agenda", () => {
  const markup = renderResult(true, "calendar", recurringProjection());
  assert.match(markup, /월간 캘린더 미리보기/u);
  assert.match(markup, /ta-authoring-calendar-today/u);
  assert.match(markup, /2026년 8월/u);
  assert.match(markup, /2026년 8월 3일 · 1개/u);
  assert.match(markup, /일정 1/u);
});

test("product input hides ownership choices while QA input keeps them", () => {
  const render = (productMode?: boolean) =>
    renderToStaticMarkup(
      <InputPane
        title="제목입니다."
        source=""
        rawText="설명입니다."
        ownership="personal"
        ownershipLocked={false}
        parsePending={false}
        liveUpdateBlocked={false}
        parseStatusLabel={null}
        liveAppliedItemCount={null}
        scrollContainerRef={null}
        sourceTextAreaRef={null}
        onTitleChange={noOp}
        onSourceChange={noOp}
        onRawTextChange={noOp}
        onOwnershipChange={noOp}
        productMode={productMode}
      />,
    );

  assert.doesNotMatch(render(true), /ta-authoring-ownership/u);
  assert.match(render(true), /일반 문장을 그대로 붙여 넣어도 됩니다/u);
  assert.match(render(), /ta-authoring-ownership/u);
  assert.match(render(), /무엇을 Flow로 만들까요/u);
});

test("recurring result rows keep one parent and an ordered occurrence set", () => {
  const groups = groupAuthoringRowsByItem([
    artifactRow("occurrence-1", "routine", 0),
    artifactRow("occurrence-2", "routine", 1),
    artifactRow("single", "single"),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].parent.occurrenceId, undefined);
  assert.deepEqual(
    groups[0].occurrences.map((row) => row.occurrenceId),
    ["routine-occurrence-0", "routine-occurrence-1"],
  );
});

test("result slots distinguish ineligible, blocked, and partial states", () => {
  const base = projection();
  base.artifacts.calendar = {
    ...base.artifacts.calendar,
    eligible: false,
    rows: [],
    count: 0,
    losses: [
      {
        lossId: "undated",
        artifact: "calendar",
        reason: "undated_item",
        message: "날짜가 있는 할 일이 없습니다.",
        sourcePreserved: true,
      },
    ],
  };
  assert.equal(authoringResultSlotState("calendar", base).state, "disabled");

  base.artifacts.calendar.losses = [
    {
      lossId: "invalid",
      artifact: "calendar",
      reason: "invalid_schedule",
      message: "날짜를 확인해 주세요.",
      sourcePreserved: true,
    },
  ];
  assert.equal(authoringResultSlotState("calendar", base).state, "blocked");

  base.artifacts.calendar = {
    ...base.artifacts.calendar,
    eligible: true,
    rows: [artifactRow("valid")],
    count: 1,
  };
  assert.equal(
    authoringResultSlotState("calendar", base).state,
    "active-partial",
  );
  assert.equal(authoringResultSlotState("memo", base).state, "active");
});

test("P1-C long-document losses fail closed only for affected result slots", () => {
  const base = projection();
  base.artifacts.sheet = {
    ...base.artifacts.sheet,
    eligible: false,
    rows: [],
    count: 0,
    losses: [
      {
        lossId: "p1c-invalid-table",
        artifact: "sheet",
        reason: "long_document_table_invalid",
        message: "표 구조를 안전하게 확인하지 못했습니다.",
        sourcePreserved: true,
      },
    ],
  };

  assert.equal(authoringResultSlotState("sheet", base).state, "blocked");
  assert.equal(authoringResultSlotState("todo", base).state, "active");
  assert.equal(authoringResultSlotState("calendar", base).state, "active");
  assert.equal(authoringResultSlotState("memo", base).state, "active");
});

function inspectorItem(
  rawText: string,
  overrides: Partial<AuthoringItemView> = {},
): AuthoringItemView {
  return {
    itemId: "item-1",
    blockId: "block-1",
    stepId: "step-1",
    title: "첫 번째 항목입니다.",
    rawText,
    sourceLineLabel: "3~5줄",
    role: "item",
    included: true,
    detail: "",
    completion: "",
    date: "2026-08-03",
    relativeDate: "",
    time: "",
    timezone: "",
    place: "",
    duration: "",
    repeat: "",
    repeatEnd: "",
    condition: "",
    resource: "",
    source: "",
    guide: "",
    caution: "",
    userCorrected: false,
    ...overrides,
  };
}

function inspectorPatch(item: AuthoringItemView): AuthoringItemPatch {
  return {
    title: item.title,
    detail: item.detail,
    completion: item.completion,
    date: item.date,
    relativeDate: item.relativeDate,
    time: item.time,
    timezone: item.timezone,
    place: item.place,
    duration: item.duration,
    repeat: item.repeat,
    repeatEnd: item.repeatEnd,
    condition: item.condition,
    resource: item.resource,
    source: item.source,
    guide: item.guide,
    caution: item.caution,
  };
}

test("Inspector allows one existing property but fails closed on insertion and tables", () => {
  const item = inspectorItem("- [ ] 첫 번째 항목입니다.\n  - 날짜: 2026-08-03");
  assert.equal(
    inspectorUnsafeChangeReason(item, {
      ...inspectorPatch(item),
      date: "2026-08-04",
    }),
    undefined,
  );
  assert.match(
    inspectorUnsafeChangeReason(item, {
      ...inspectorPatch(item),
      detail: "새 설명",
    }) ?? "",
    /원문에 한 번 선언/u,
  );
  const tableItem = inspectorItem("| 항목 | 날짜 |\n| 값 | 2026-08-03 |");
  assert.match(
    inspectorUnsafeChangeReason(tableItem, {
      ...inspectorPatch(tableItem),
      title: "바뀐 제목",
    }) ?? "",
    /표와 탭/u,
  );
});

test("product correction surface shows the source line, expected input, and blocked result without QA jargon", () => {
  const document = createTextAuthoringDocument(
    ["# 일정", "- [ ] 일정 확인", "  - 날짜: 8월 3일"].join("\n"),
  );
  const outline = buildAuthoringOutlineView(document);
  assert.equal(outline.issues.length, 1);
  const markup = renderResult(true, "memo", projection(), outline.issues);
  assert.match(markup, /원문 수정 필요 1건/u);
  assert.match(markup, /원문 3행/u);
  assert.match(markup, /YYYY-MM-DD/u);
  assert.match(markup, /캘린더에 표시할 수 없음/u);
  assert.match(markup, /ta-authoring-product-issue-source/u);
  assert.doesNotMatch(markup, /fixture|QA|issueId|검증 카탈로그/iu);

  const detailMarkup = renderToStaticMarkup(
    <StructurePane
      embedded
      productMode
      steps={outline.steps}
      counts={outline.counts}
      selectedItemId={null}
      selectedItem={null}
      issues={outline.issues}
      stale={false}
      hasUndo={false}
      canMergeNext={false}
      onSelectItem={noOp}
      onEditItem={noOp}
      onMove={noOp}
      onMergeNext={noOp}
      onSplit={noOp}
      onRoleChange={noOp}
      onToggleIncluded={noOp}
      onResolveIssue={noOp}
      onEditIssueSource={noOp}
      onUndo={noOp}
    />,
  );
  assert.match(detailMarkup, /문제/u);
  assert.match(detailMarkup, /이렇게 입력/u);
  assert.match(detailMarkup, /현재 영향/u);
  assert.match(detailMarkup, /원문 3행 원문 수정/u);
  assert.doesNotMatch(detailMarkup, /단계 1|순서·묶음 수정/u);
});

test("Inspector safely edits one existing 자료·출처·안내·주의 line and sends missing or duplicate targets to source", () => {
  const rawText = [
    "- [ ] 첫 번째 항목입니다.",
    "  - 자료: https://example.com/tool",
    "  - 출처: https://example.com/source",
    "  - 안내: 기존 안내",
    "  - 주의: 기존 주의",
  ].join("\n");
  const item = inspectorItem(rawText, {
    resource: "https://example.com/tool",
    source: "https://example.com/source",
    guide: "기존 안내",
    caution: "기존 주의",
  });
  assert.equal(
    inspectorUnsafeChangeReason(item, {
      ...inspectorPatch(item),
      source: "https://example.com/changed",
      guide: "바꾼 안내",
      caution: "바꾼 주의",
    }),
    undefined,
  );
  assert.match(
    inspectorUnsafeChangeReason(
      inspectorItem("- [ ] 첫 번째 항목입니다.", { source: "" }),
      {
        ...inspectorPatch(inspectorItem("- [ ] 첫 번째 항목입니다.")),
        source: "https://example.com/new",
      },
    ) ?? "",
    /원문에 한 번 선언/u,
  );
  assert.match(
    inspectorUnsafeChangeReason(
      inspectorItem("- [ ] 첫 번째 항목입니다.\n  - 안내: 하나\n  - 안내: 둘", {
        guide: "하나\n둘",
      }),
      {
        ...inspectorPatch(
          inspectorItem(
            "- [ ] 첫 번째 항목입니다.\n  - 안내: 하나\n  - 안내: 둘",
            { guide: "하나\n둘" },
          ),
        ),
        guide: "바꾼 안내",
      },
    ) ?? "",
    /원문에 한 번 선언/u,
  );
});
