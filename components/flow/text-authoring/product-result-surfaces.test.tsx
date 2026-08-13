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
import { createTextAuthoringDocument } from "@/lib/flow/text-authoring/parser";

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
} from "./authoring-ui-types";
import { buildAuthoringOutlineView } from "./view-model";

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
      rawText={"설명입니다.\n- [ ] 첫 번째 항목입니다."}
      textResultValues={{
        structured_plain_text:
          "설명입니다.\n\n[ ] 첫 번째 항목입니다.\n    날짜: 2026-08-03",
      }}
      productMode={productMode}
    />,
  );
}

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
