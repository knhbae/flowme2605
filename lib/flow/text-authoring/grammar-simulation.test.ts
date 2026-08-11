import assert from "node:assert/strict";
import test from "node:test";

import {
  buildArtifactPreflight,
  buildAuthoringArtifactProjection,
} from "./artifact-projection";
import { serializeAuthoringIcs } from "./file-export";
import {
  checkMarkdownRoundTrip,
  exportTextAuthoringMarkdown,
} from "./markdown-roundtrip";
import { createTextAuthoringDocument } from "./parser";
import { TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS } from "./grammar-simulation-cases";
import { runGrammarSimulation } from "./grammar-simulation";

const NOW = "2026-07-31T00:00:00.000Z";

function scenario(id: string) {
  const value = TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS.find(
    (candidate) => candidate.id === id,
  );
  assert.ok(value, `Missing grammar simulation scenario: ${id}`);
  return value;
}

test("TA-GRAMMAR-SIM-01 runs all existing-content and single-change scenarios without expectation drift", () => {
  const results = runGrammarSimulation(
    TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS,
  );
  const failures = results.flatMap((result) =>
    result.checks
      .filter((check) => !check.passed)
      .map((check) => ({
        scenarioId: result.id,
        check: check.key,
        expected: check.expected,
        actual: check.actual,
      })),
  );

  assert.equal(results.length, 30);
  assert.deepEqual(
    Object.fromEntries(
      [
        "existing_content",
        "condition_change",
        "compatibility",
        "exception_handling",
        "review_needed",
      ].map((group) => [
        group,
        results.filter((result) => result.group === group).length,
      ]),
    ),
    {
      existing_content: 8,
      condition_change: 11,
      compatibility: 6,
      exception_handling: 5,
      review_needed: 0,
    },
  );
  assert.deepEqual(failures, []);
});

test("source-backed K-MOOC and LibriVox rows remain one root Item each without invented fields", () => {
  for (const [id, itemCount, propertyLabels] of [
    ["content-kmooc-14", 14, ["주차", "주차 활동"]],
    ["content-librivox-38", 38, ["순서", "재생시간"]],
  ] as const) {
    const fixture = scenario(id);
    const document = createTextAuthoringDocument(fixture.rawText, {
      ...fixture.options,
      documentId: `ta-grammar-source-faithful-${id}`,
      fixtureVersion: "ta-grammar-source-faithful-v4",
      now: NOW,
    });
    assert.equal(document.parseResult.canonical.items.length, itemCount, id);
    assert.equal(
      fixture.rawText.match(/^- \[ \] /gmu)?.length ?? 0,
      itemCount,
      id,
    );
    assert.doesNotMatch(fixture.rawText, /\t/u, id);
    assert.doesNotMatch(
      fixture.rawText,
      /^  - (?:날짜|출처|완료 기준):/gmu,
      id,
    );
    document.parseResult.canonical.items.forEach((item) => {
      assert.equal(item.schedule, undefined, `${id}: ${item.title}`);
      assert.equal(item.completion, undefined, `${id}: ${item.title}`);
      assert.equal(item.sources.length, 0, `${id}: ${item.title}`);
      for (const label of propertyLabels) {
        assert.match(
          item.detail ?? "",
          new RegExp(`^${label}: `, "mu"),
          `${id}: ${item.title}: ${label}`,
        );
      }
    });
  }
});

test("the latest grammar showcase projects three occurrences while keeping one source Item", () => {
  const fixture = scenario("change-latest-grammar-showcase");
  const document = createTextAuthoringDocument(fixture.rawText, {
    documentId: "ta-grammar-latest-showcase",
    fixtureVersion: "ta-grammar-latest-showcase-v4",
    now: NOW,
  });
  const projection = buildAuthoringArtifactProjection(document);
  const [item] = document.parseResult.canonical.items;

  assert.ok(item);
  assert.equal(document.parseResult.canonical.items.length, 1);
  assert.equal(item.subchecks.length, 2);
  assert.equal(
    item.detail,
    "세 번의 실행에서 같은 자료를 확인합니다.\n담당 메모: 담당자와 확인 범위를 적습니다.",
  );
  assert.deepEqual(
    projection.artifacts.calendar.rows.map((row) => row.date),
    ["2026-08-03", "2026-08-10", "2026-08-17"],
  );
  assert.equal(projection.artifacts.todo.rows.length, 3);
  projection.artifacts.todo.rows.forEach((row) => {
    assert.equal(row.itemId, item.itemId);
    assert.equal(row.subchecks.length, 2);
    assert.match(row.description ?? "", /담당 메모:/u);
    assert.doesNotMatch(row.description ?? "", /날짜:|반복:|자료:|출처:/u);
  });
});

test("changing only the source ISO anchor moves dates and ICS while preserving Item semantics", () => {
  const document = createTextAuthoringDocument(
    scenario("change-relative-no-anchor").rawText,
    {
      documentId: "ta-grammar-anchor-identity",
      fixtureVersion: "ta-grammar-anchor-identity-v2",
      now: NOW,
    },
  );
  const augustDocument = createTextAuthoringDocument(
    scenario("change-relative-anchor-aug").rawText,
    {
      documentId: "ta-grammar-anchor-identity-august",
      fixtureVersion: "ta-grammar-anchor-identity-v2",
      now: NOW,
    },
  );
  const septemberDocument = createTextAuthoringDocument(
    scenario("change-relative-anchor-sep").rawText,
    {
      documentId: "ta-grammar-anchor-identity-september",
      fixtureVersion: "ta-grammar-anchor-identity-v2",
      now: NOW,
    },
  );
  const canonicalBefore = structuredClone(document.parseResult.canonical);
  const withoutAnchor = buildAuthoringArtifactProjection(document);
  const august = buildAuthoringArtifactProjection(augustDocument);
  const september = buildAuthoringArtifactProjection(septemberDocument);

  const itemSemantics = (value: typeof document) =>
    value.parseResult.canonical.items.map((item) => ({
      title: item.title,
      dayOffset:
        item.schedule?.kind === "relative"
          ? item.schedule.dayOffset
          : undefined,
    }));

  assert.deepEqual(itemSemantics(augustDocument), itemSemantics(document));
  assert.deepEqual(itemSemantics(septemberDocument), itemSemantics(document));
  assert.equal(withoutAnchor.artifacts.calendar.count, 0);
  assert.equal(
    withoutAnchor.artifacts.calendar.losses.filter(
      (loss) => loss.reason === "relative_anchor_required",
    ).length,
    2,
  );
  assert.deepEqual(
    august.artifacts.calendar.rows.map((row) => row.date),
    ["2026-08-07", "2026-08-10"],
  );
  assert.deepEqual(
    september.artifacts.calendar.rows.map((row) => row.date),
    ["2026-09-07", "2026-09-10"],
  );
  assert.deepEqual(document.parseResult.canonical, canonicalBefore);
  assert.match(
    serializeAuthoringIcs(august.title, august.artifacts.calendar.rows, NOW),
    /DTSTART;VALUE=DATE:20260807/u,
  );
  assert.match(
    serializeAuthoringIcs(
      september.title,
      september.artifacts.calendar.rows,
      NOW,
    ),
    /DTSTART;VALUE=DATE:20260907/u,
  );
});

test("calendar preflight requires an ISO anchor in the authored source", () => {
  const withoutAnchorDocument = createTextAuthoringDocument(
    scenario("change-relative-no-anchor").rawText,
    {
      documentId: "ta-grammar-anchor-preflight-without",
      fixtureVersion: "ta-grammar-anchor-preflight-v2",
      now: NOW,
    },
  );
  const withAnchorDocument = createTextAuthoringDocument(
    scenario("change-relative-anchor-aug").rawText,
    {
      documentId: "ta-grammar-anchor-preflight-with",
      fixtureVersion: "ta-grammar-anchor-preflight-v2",
      now: NOW,
    },
  );
  const withoutAnchor = buildArtifactPreflight(
    buildAuthoringArtifactProjection(withoutAnchorDocument),
    { artifact: "calendar" },
  );
  const withAnchor = buildArtifactPreflight(
    buildAuthoringArtifactProjection(withAnchorDocument),
    { artifact: "calendar" },
  );

  assert.equal(withoutAnchor.eligible, false);
  assert.equal(withoutAnchor.count, 0);
  assert.equal(withAnchor.eligible, true);
  assert.equal(withAnchor.count, 2);
  assert.deepEqual(withAnchor.dateRange, {
    start: "2026-08-07",
    end: "2026-08-10",
  });
});

/*
 * v1 compatibility fixtures below still opt into import-assist through their
 * fixture version. Canonical v2 examples above carry their anchor in source.
 */
test("repeat and execution condition survive the canonical round-trip while bounded occurrences stay RRULE-free", () => {
  for (const id of [
    "change-repeat-condition-weekly",
    "change-repeat-condition-monthly",
  ]) {
    const fixture = scenario(id);
    const document = createTextAuthoringDocument(fixture.rawText, {
      documentId: `ta-grammar-roundtrip-${id}`,
      fixtureVersion: "ta-grammar-repeat-condition-v2",
      now: NOW,
    });
    const projection = buildAuthoringArtifactProjection(document);
    const markdown = exportTextAuthoringMarkdown(document);
    const receipt = checkMarkdownRoundTrip(document, {
      markdown,
      receiptId: `receipt-${id}`,
      checkedAt: NOW,
    });
    const ics = serializeAuthoringIcs(
      projection.title,
      projection.artifacts.calendar.rows,
      NOW,
    );

    assert.equal(receipt.unresolvedCount, 0, id);
    assert.equal(receipt.sourcePreserved, true, id);
    assert.match(markdown, /^  - 반복: /mu, id);
    assert.match(markdown, /^  - 실행 조건: /mu, id);
    assert.equal(
      ics.match(/^BEGIN:VEVENT$/gmu)?.length ?? 0,
      projection.artifacts.calendar.rows.length,
      id,
    );
    assert.doesNotMatch(ics, /^RRULE:/gmu, id);
    assert.match(ics, /반복:/u, id);
    assert.match(ics, /실행 조건:/u, id);
  }
});

test("daily-until recurrence and same-day agenda cover common calendar service behavior", () => {
  const dailyFixture = scenario("change-daily-repeat-until-date");
  const dailyDocument = createTextAuthoringDocument(dailyFixture.rawText, {
    documentId: "ta-grammar-daily-until",
    fixtureVersion: "ta-grammar-daily-until-v2",
    now: NOW,
  });
  const dailyProjection = buildAuthoringArtifactProjection(dailyDocument);
  assert.deepEqual(
    dailyProjection.artifacts.calendar.rows.map((row) => row.date),
    ["2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14", "2026-08-15"],
  );
  for (const artifact of ["calendar", "todo", "sheet", "memo"] as const) {
    assert.equal(dailyProjection.artifacts[artifact].rows.length, 5, artifact);
  }

  const agendaFixture = scenario("change-same-day-timed-agenda");
  const agendaDocument = createTextAuthoringDocument(agendaFixture.rawText, {
    documentId: "ta-grammar-same-day-agenda",
    fixtureVersion: "ta-grammar-same-day-agenda-v2",
    now: NOW,
  });
  const agendaProjection = buildAuthoringArtifactProjection(agendaDocument);
  assert.deepEqual(
    agendaProjection.artifacts.calendar.rows.map((row) => row.title),
    ["행사 안내 확인", "참가 등록", "발표 세션 참여", "네트워킹 메모 정리"],
  );
  assert.deepEqual(
    agendaProjection.artifacts.todo.rows.map((row) => row.title),
    ["네트워킹 메모 정리", "참가 등록", "행사 안내 확인", "발표 세션 참여"],
  );
  const agendaIcs = serializeAuthoringIcs(
    agendaProjection.title,
    agendaProjection.artifacts.calendar.rows,
    NOW,
  );
  assert.deepEqual(
    [...agendaIcs.matchAll(/^SUMMARY:(.+)$/gmu)].map((match) => match[1]),
    agendaProjection.artifacts.calendar.rows.map(
      (row) => `${agendaProjection.title} - ${row.title}`,
    ),
  );
});

test("legacy aliases are read but the canonical writer emits only the official labels", () => {
  const fixture = scenario("compat-legacy-aliases");
  const document = createTextAuthoringDocument(fixture.rawText, {
    documentId: "ta-grammar-legacy-writer",
    fixtureVersion: "ta-grammar-legacy-writer-v1",
    now: NOW,
  });
  const markdown = exportTextAuthoringMarkdown(document);

  assert.match(markdown, /^  - 설명: 이전 설명입니다\.$/mu);
  assert.match(markdown, /^  - 소요 시간: 45분$/mu);
  assert.match(
    markdown,
    /^  - 자료: \[이전 자료\]\(https:\/\/example\.com\/legacy\)$/mu,
  );
  assert.doesNotMatch(markdown, /^(?:\s*)(?:자세히|예상 시간|link):/gmu);
});

test("invalid and unsupported input stays in source rows and never becomes invented canonical detail", () => {
  for (const id of [
    "error-ambiguous-date",
    "error-invalid-relative-date",
    "error-url-only",
    "error-explanatory-prose",
  ]) {
    const fixture = scenario(id);
    const document = createTextAuthoringDocument(fixture.rawText, {
      documentId: `ta-grammar-error-${id}`,
      fixtureVersion: "ta-grammar-error-boundary-v2",
      now: NOW,
    });
    const retainedSource = document.parseResult.canonical.sourceRows
      .map((row) => row.rawText)
      .join("\n");

    assert.ok(document.parseResult.issues.length > 0, id);
    document.parseResult.issues.forEach((issue) => {
      issue.sourceRowIds.forEach((sourceRowId) => {
        assert.ok(
          document.parseResult.canonical.sourceRows.some(
            (row) => row.sourceRowId === sourceRowId,
          ),
          `${id}: ${sourceRowId}`,
        );
      });
    });
    assert.ok(
      fixture.rawText
        .split(/\r?\n/u)
        .filter(Boolean)
        .some((line) => retainedSource.includes(line.trim())),
      id,
    );
  }

  const unknownProperty = scenario("error-unknown-property");
  const preserved = createTextAuthoringDocument(unknownProperty.rawText, {
    documentId: "ta-grammar-unknown-property-detail",
    fixtureVersion: "ta-grammar-unknown-property-v3",
    now: NOW,
  });
  assert.equal(preserved.parseResult.issues.length, 0);
  assert.equal(
    preserved.parseResult.canonical.items[0]?.detail,
    "담당자: 홍길동",
  );
});
