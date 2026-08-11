import assert from "node:assert/strict";
import test from "node:test";

import { buildAuthoringArtifactProjection } from "./artifact-projection";
import { applyAuthoringOperation } from "./operations";
import { createTextAuthoringDocument } from "./parser";
import { projectAuthoringRecurrenceDates } from "./recurrence";

const NOW = "2026-08-04T00:00:00.000Z";

function authoringDocument(rawText: string) {
  return createTextAuthoringDocument(rawText, { now: NOW });
}

test("Calendar sorts dates, all-day rows, and times while other projections keep source order", () => {
  const document = authoringDocument(
    [
      "# 날짜 정렬",
      "## 실행",
      "- [ ] 늦은 항목",
      "  - 날짜: 2026-08-10",
      "  - 시간: 09:00",
      "- [ ] 같은 날 늦은 시간",
      "  - 날짜: 2026-08-03",
      "  - 시간: 16:30",
      "- [ ] 같은 날 종일",
      "  - 날짜: 2026-08-03",
      "- [ ] 같은 날 이른 시간",
      "  - 날짜: 2026-08-03",
      "  - 시간: 09:00",
    ].join("\n"),
  );

  const sourceOrder = document.parseResult.canonical.items.map(
    (item) => item.title,
  );
  const projection = buildAuthoringArtifactProjection(document);

  assert.deepEqual(sourceOrder, [
    "늦은 항목",
    "같은 날 늦은 시간",
    "같은 날 종일",
    "같은 날 이른 시간",
  ]);
  assert.deepEqual(
    projection.artifacts.calendar.rows.map((row) => row.title),
    ["같은 날 종일", "같은 날 이른 시간", "같은 날 늦은 시간", "늦은 항목"],
  );
  assert.deepEqual(
    projection.artifacts.todo.rows.map((row) => row.title),
    sourceOrder,
  );
  assert.deepEqual(
    projection.artifacts.memo.rows.map((row) => row.title),
    sourceOrder,
  );
  assert.deepEqual(
    document.parseResult.canonical.items.map((item) => item.title),
    sourceOrder,
  );
});

test("a hidden preview anchor cannot resolve relative dates without an explicit ISO anchor in the raw document", () => {
  const withoutRawAnchor = authoringDocument(
    [
      "# 기준일 없음",
      "## 실행",
      "- [ ] 사전 확인",
      "  상대 날짜: D-3",
      "- [ ] 당일 확인",
      "  상대 날짜: D-Day",
    ].join("\n"),
  );
  const hiddenAnchor = buildAuthoringArtifactProjection(withoutRawAnchor, {
    anchor: "2026-08-10",
  });

  assert.equal(hiddenAnchor.artifacts.calendar.eligible, false);
  assert.equal(hiddenAnchor.artifacts.calendar.count, 0);
  assert.equal(
    hiddenAnchor.artifacts.calendar.losses.filter(
      (loss) => loss.reason === "relative_anchor_required",
    ).length,
    2,
  );

  const withRawAnchor = authoringDocument(
    [
      "# 기준일 있음",
      "기준일: 2026-08-10",
      "## 실행",
      "- [ ] 사전 확인",
      "  상대 날짜: D-3",
      "- [ ] 당일 확인",
      "  상대 날짜: D-Day",
    ].join("\n"),
  );
  const resolved = buildAuthoringArtifactProjection(withRawAnchor);

  assert.deepEqual(
    resolved.artifacts.calendar.rows.map((row) => row.date),
    ["2026-08-07", "2026-08-10"],
  );
});

test("Sheet is disabled for a title-only list and enabled for two shared meaningful fields", () => {
  const titleOnly = authoringDocument(
    [
      "# 제목 목록",
      "## 실행",
      "- [ ] 첫 항목",
      "- [ ] 둘째 항목",
      "- [ ] 셋째 항목",
    ].join("\n"),
  );
  const titleOnlyProjection = buildAuthoringArtifactProjection(titleOnly, {
    primaryArtifact: "sheet",
  });

  assert.equal(titleOnlyProjection.artifacts.sheet.eligible, false);
  assert.equal(titleOnlyProjection.artifacts.sheet.count, 0);
  assert.equal(titleOnlyProjection.primaryArtifact, "todo");
  assert.equal(titleOnly.parseResult.artifactEligibility.counts.sheet, 0);
  assert.equal(
    titleOnly.parseResult.artifactEligibility.secondary.includes("sheet"),
    false,
  );
  assert.ok(
    titleOnlyProjection.artifacts.sheet.losses.some(
      (loss) => loss.reason === "insufficient_tabular_structure",
    ),
  );

  const structured = authoringDocument(
    [
      "# 반복 필드 목록",
      "## 실행",
      "- [ ] 첫 항목",
      "  설명: 첫 설명",
      "  장소: 서울",
      "- [ ] 둘째 항목",
      "  설명: 둘째 설명",
      "  장소: 부산",
    ].join("\n"),
  );
  const structuredProjection = buildAuthoringArtifactProjection(structured, {
    primaryArtifact: "sheet",
  });

  assert.equal(structuredProjection.artifacts.sheet.eligible, true);
  assert.equal(structuredProjection.artifacts.sheet.count, 2);
  assert.equal(structured.parseResult.artifactEligibility.counts.sheet, 2);
  assert.equal(
    structured.parseResult.artifactEligibility.secondary.includes("sheet"),
    true,
  );
  assert.deepEqual(
    structuredProjection.artifacts.sheet.sheetColumns?.map(
      (column) => column.label,
    ),
    ["항목", "설명", "장소"],
  );
  assert.deepEqual(structuredProjection.artifacts.sheet.rows[0].sheetCells, {
    title: "첫 항목",
    description: "첫 설명",
    place: "서울",
  });
});

test("an original table keeps its real columns and cells even when it has only one data row", () => {
  const table = authoringDocument(
    ["활동\t담당\t자료", "예약 확인\t민지\thttps://example.com/booking"].join(
      "\n",
    ),
  );
  const projection = buildAuthoringArtifactProjection(table, {
    primaryArtifact: "sheet",
  });

  assert.equal(projection.artifacts.sheet.eligible, true);
  assert.equal(projection.artifacts.sheet.count, 1);
  assert.deepEqual(
    projection.artifacts.sheet.sheetColumns?.map((column) => column.label),
    ["활동", "담당", "자료"],
  );
  assert.deepEqual(projection.artifacts.sheet.rows[0].sheetCells, {
    활동: "예약 확인",
    담당: "민지",
    자료: "https://example.com/booking",
  });
});

test("projection rows expose execution detail, schedule context, and links without changing source order", () => {
  const document = authoringDocument(
    [
      "# 상세 필드",
      "## 실행",
      "- [ ] 장소 예약",
      "  설명: 좌석을 확인합니다.",
      "  완료 기준: 예약번호를 저장함",
      "  날짜: 2026-08-10",
      "  시간: 09:30",
      "  시간대: Asia/Seoul",
      "  장소: 서울역",
      "  소요 시간: 45분",
      "  반복: 매주 월요일",
      "  조건: 비가 오면 실내",
      "  자료: [예약 페이지](https://example.com/booking)",
      "  출처: [공식 안내](https://example.com/official)",
    ].join("\n"),
  );

  const row = buildAuthoringArtifactProjection(document).artifacts.todo.rows[0];

  assert.equal(row.description, "좌석을 확인합니다.");
  assert.equal(row.detail, row.description);
  assert.equal(row.completion, "예약번호를 저장함");
  assert.equal(row.date, "2026-08-10");
  assert.equal(row.time, "09:30");
  assert.equal(row.timezone, "Asia/Seoul");
  assert.equal(row.place, "서울역");
  assert.equal(row.durationMinutes, 45);
  assert.equal(row.repeat, "매주 월요일");
  assert.equal(row.condition, "비가 오면 실내");
  assert.equal(row.experienceRow.description, "좌석을 확인합니다.");
  assert.doesNotMatch(
    row.experienceRow.description ?? "",
    /날짜:|반복:|조건:/u,
  );
  assert.deepEqual(
    row.resources.map(({ label, url }) => ({ label, url })),
    [{ label: "예약 페이지", url: "https://example.com/booking" }],
  );
  assert.deepEqual(
    row.sources?.map(({ label, url }) => ({ label, url })),
    [{ label: "공식 안내", url: "https://example.com/official" }],
  );
  assert.equal(row.links.length, 2);
});

test("projection uses the latest owned place and condition instead of stale source values", () => {
  let document = authoringDocument(
    [
      "# 변경한 상세",
      "## 실행",
      "- [ ] 장소 확인",
      "  - 장소: 서울",
      "  - 조건: 비가 오면 실내",
      "  - 자료: [이전 자료](https://example.com/old-resource)",
      "  - 출처: [이전 출처](https://example.com/old-source)",
    ].join("\n"),
  );
  const itemId = document.parseResult.canonical.items[0].itemId;
  document = applyAuthoringOperation(
    document,
    { type: "set_property", itemId, key: "place", value: "부산" },
    { actorLane: "creator", now: "2026-08-04T01:00:00.000Z" },
  );
  document = applyAuthoringOperation(
    document,
    { type: "set_property", itemId, key: "condition", value: "맑으면 야외" },
    { actorLane: "creator", now: "2026-08-04T01:01:00.000Z" },
  );
  document = applyAuthoringOperation(
    document,
    {
      type: "set_property",
      itemId,
      key: "resource",
      value: "새 자료 https://example.com/new-resource",
    },
    { actorLane: "creator", now: "2026-08-04T01:02:00.000Z" },
  );
  document = applyAuthoringOperation(
    document,
    {
      type: "set_property",
      itemId,
      key: "source",
      value: "새 출처 https://example.com/new-source",
    },
    { actorLane: "creator", now: "2026-08-04T01:03:00.000Z" },
  );

  const row = buildAuthoringArtifactProjection(document).artifacts.todo.rows[0];
  assert.equal(row.place, "부산");
  assert.equal(row.condition, "맑으면 야외");
  assert.deepEqual(
    row.resources.map((link) => link.url),
    ["https://example.com/new-resource"],
  );
  assert.deepEqual(
    row.sources?.map((link) => link.url),
    ["https://example.com/new-source"],
  );
});

test("finite recurrence expands the same bounded occurrence rows across Calendar, Todo, Sheet, and TXT", () => {
  const document = authoringDocument(
    [
      "# 정기 점검",
      "## 실행",
      "- [ ] 필터 점검",
      "  - 날짜: 2026-08-03",
      "  - 반복: 매주 월, 수, 금",
      "  - 반복 종료: 35회",
      "  - 실행 조건: 정수기를 사용 중인 경우",
      "  - [ ] 전원 끄기",
      "  - [ ] 필터 상태 확인",
    ].join("\n"),
  );

  const firstPage = buildAuthoringArtifactProjection(document);
  const expanded = buildAuthoringArtifactProjection(document, {
    finiteOccurrenceLimit: 60,
  });

  assert.equal(document.parseResult.canonical.items.length, 1);
  assert.deepEqual(
    [
      ...new Set(
        firstPage.lossManifest.adapter.entries
          .map((entry) => entry.kind)
          .filter((kind) => kind !== "defaulted_legacy_field"),
      ),
    ].sort(),
    ["unsupported_recurrence", "unsupported_subcheck"],
  );
  const canonicalItem = document.parseResult.canonical.items[0];
  const helperPage = projectAuthoringRecurrenceDates({
    itemId: canonicalItem.itemId,
    startDate:
      canonicalItem.schedule?.kind === "absolute"
        ? canonicalItem.schedule.date
        : "",
    rule: canonicalItem.recurrence as NonNullable<
      typeof canonicalItem.recurrence
    >,
    limit: 30,
  });
  assert.equal(firstPage.artifacts.todo.count, 30);
  assert.equal(firstPage.artifacts.calendar.count, 30);
  assert.equal(firstPage.artifacts.memo.count, 30);
  assert.equal(firstPage.artifacts.sheet.count, 30);
  assert.equal(firstPage.artifacts.todo.hasMoreOccurrences, true);
  assert.deepEqual(firstPage.artifacts.todo.recurrenceSummaries[0], {
    itemId: document.parseResult.canonical.items[0].itemId,
    label: "매주 월, 수, 금 · 35회",
    mode: "finite_count",
    visibleCount: 30,
    totalCount: 35,
    hasMore: true,
    nextOccurrenceLimit: 35,
  });
  assert.equal(expanded.artifacts.todo.count, 35);
  assert.equal(expanded.artifacts.calendar.count, 35);
  assert.equal(expanded.artifacts.sheet.count, 35);
  assert.equal(expanded.artifacts.memo.count, 35);
  assert.equal(expanded.artifacts.todo.hasMoreOccurrences, false);
  assert.deepEqual(
    expanded.artifacts.todo.rows.slice(0, 30).map((row) => row.occurrenceId),
    firstPage.artifacts.todo.rows.map((row) => row.occurrenceId),
  );
  assert.ok(
    firstPage.artifacts.todo.rows.every(
      (row) =>
        row.itemId === document.parseResult.canonical.items[0].itemId &&
        row.rowId === row.occurrenceId &&
        row.subchecks.length === 2,
    ),
  );
  assert.deepEqual(
    firstPage.artifacts.todo.rows.map((row) => ({
      occurrenceId: row.occurrenceId,
      itemId: row.itemId,
      date: row.date,
      occurrenceIndex: row.occurrenceIndex,
    })),
    helperPage.occurrences,
  );
  assert.deepEqual(
    firstPage.artifacts.sheet.sheetColumns?.map((column) => column.label),
    ["항목", "회차", "날짜", "반복", "실행 조건", "체크리스트"],
  );
  assert.deepEqual(
    firstPage.artifacts.sheet.rows.slice(0, 2).map((row) => ({
      rowId: row.rowId,
      itemId: row.itemId,
      occurrenceIndex: row.sheetCells?.occurrenceIndex,
      date: row.sheetCells?.date,
    })),
    [
      {
        rowId: helperPage.occurrences[0].occurrenceId,
        itemId: canonicalItem.itemId,
        occurrenceIndex: "1회차",
        date: "2026-08-03",
      },
      {
        rowId: helperPage.occurrences[1].occurrenceId,
        itemId: canonicalItem.itemId,
        occurrenceIndex: "2회차",
        date: "2026-08-05",
      },
    ],
  );
  for (const artifact of ["calendar", "todo", "sheet", "memo"] as const) {
    assert.deepEqual(
      firstPage.artifacts[artifact].rows.map((row) => row.rowId),
      helperPage.occurrences.map((occurrence) => occurrence.occurrenceId),
    );
  }
});

test("count three keeps one canonical Item but projects exactly three rows in all four results", () => {
  const document = authoringDocument(
    [
      "# 세 번 점검",
      "## 실행",
      "- [ ] 상태 확인",
      "  - 날짜: 2026-08-03",
      "  - 반복: 매일",
      "  - 반복 종료: 3회",
    ].join("\n"),
  );
  const projection = buildAuthoringArtifactProjection(document);

  assert.equal(document.parseResult.canonical.items.length, 1);
  for (const artifact of ["calendar", "todo", "sheet", "memo"] as const) {
    assert.equal(projection.artifacts[artifact].count, 3);
    assert.deepEqual(
      projection.artifacts[artifact].rows.map((row) => row.occurrenceIndex),
      [1, 2, 3],
    );
  }
});

test("open-ended recurrence uses a four-week window and grows without duplicating stable occurrences", () => {
  const document = authoringDocument(
    [
      "# 매일 기록",
      "## 실행",
      "- [ ] 상태 기록",
      "  - 날짜: 2026-08-03",
      "  - 반복: 매일",
    ].join("\n"),
  );

  const fourWeeks = buildAuthoringArtifactProjection(document);
  const eightWeeks = buildAuthoringArtifactProjection(document, {
    openEndedOccurrenceWeeks: 8,
  });

  assert.equal(fourWeeks.artifacts.todo.count, 28);
  assert.equal(eightWeeks.artifacts.todo.count, 56);
  assert.equal(fourWeeks.artifacts.calendar.count, 28);
  assert.equal(fourWeeks.artifacts.sheet.count, 28);
  assert.equal(fourWeeks.artifacts.memo.count, 28);
  assert.equal(eightWeeks.artifacts.calendar.count, 56);
  assert.equal(eightWeeks.artifacts.sheet.count, 56);
  assert.equal(eightWeeks.artifacts.memo.count, 56);
  assert.equal(fourWeeks.artifacts.todo.hasMoreOccurrences, true);
  assert.deepEqual(fourWeeks.artifacts.todo.recurrenceSummaries[0], {
    itemId: document.parseResult.canonical.items[0].itemId,
    label: "매일 · 종료 없음",
    mode: "open_ended",
    visibleCount: 28,
    visibleWeeks: 4,
    hasMore: true,
    nextPreviewWeeks: 8,
  });
  assert.deepEqual(
    eightWeeks.artifacts.todo.rows.slice(0, 28).map((row) => row.occurrenceId),
    fourWeeks.artifacts.todo.rows.map((row) => row.occurrenceId),
  );
});

test("invalid date is actionable only when authored, malformed URL gates structured results, and source text remains in Memo", () => {
  const invalidDate = authoringDocument(
    [
      "# 날짜 확인",
      "## 실행",
      "- [ ] 날짜 없는 항목",
      "- [ ] 날짜가 잘못된 항목",
      "  - 날짜: 8월 3일",
    ].join("\n"),
  );
  const dateProjection = buildAuthoringArtifactProjection(invalidDate);
  const undatedRow = dateProjection.artifacts.todo.rows.find(
    (row) => row.title === "날짜 없는 항목",
  );
  const invalidRow = dateProjection.artifacts.todo.rows.find(
    (row) => row.title === "날짜가 잘못된 항목",
  );

  assert.deepEqual(undatedRow?.validations, []);
  assert.deepEqual(invalidRow?.validations, [
    {
      type: "invalid_date",
      label: "날짜 입력 확인 필요",
      message: "날짜를 계산하지 않았습니다.",
      input: "8월 3일",
      expected: "YYYY-MM-DD",
      blocking: false,
    },
  ]);
  assert.equal(dateProjection.artifacts.calendar.count, 0);

  const invalidUrl = authoringDocument(
    [
      "# 링크 확인",
      "## 실행",
      "- [ ] 정상 항목",
      "  - 자료: https://example.com/ok",
      "- [ ] 자료 확인",
      "  - 자료: example.com/file",
    ].join("\n"),
  );
  const urlProjection = buildAuthoringArtifactProjection(invalidUrl);

  assert.equal(urlProjection.artifacts.todo.count, 0);
  assert.equal(urlProjection.artifacts.calendar.count, 0);
  assert.equal(urlProjection.artifacts.sheet.count, 0);
  assert.equal(urlProjection.artifacts.memo.count, 2);
  assert.equal(
    urlProjection.artifacts.memo.rows[1].validations[0].type,
    "invalid_url",
  );
  assert.ok(
    urlProjection.artifacts.todo.losses.some(
      (loss) => loss.reason === "invalid_url",
    ),
  );
});

test("unsupported recurrence shows a repair message, creates no Calendar occurrence, and structural properties do not leak into description", () => {
  const document = authoringDocument(
    [
      "# 반복 확인",
      "## 실행",
      "- [ ] 운동",
      "  - 설명: 몸 상태를 기록합니다.",
      "  - 날짜: 2026-08-03",
      "  - 반복: 주 3회",
      "  - 실행 조건: 통증이 없는 경우",
      "  - 담당 메모: 강도를 함께 기록",
    ].join("\n"),
  );
  const projection = buildAuthoringArtifactProjection(document);
  const row = projection.artifacts.todo.rows[0];

  assert.equal(projection.artifacts.todo.count, 1);
  assert.equal(projection.artifacts.calendar.count, 0);
  assert.equal(row.validations[0].type, "invalid_recurrence");
  assert.equal(
    row.description,
    ["몸 상태를 기록합니다.", "담당 메모: 강도를 함께 기록"].join("\n"),
  );
  assert.doesNotMatch(row.description ?? "", /날짜:|반복:|실행 조건:/u);
});
