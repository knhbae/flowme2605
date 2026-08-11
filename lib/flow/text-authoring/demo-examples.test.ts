import assert from "node:assert/strict";
import test from "node:test";

import {
  SIMPLE_TEXT_AUTHORING_EXAMPLE,
  TEXT_AUTHORING_EXAMPLES,
  VALIDATED_TEXT_AUTHORING_EXAMPLES,
} from "../../../components/flow/text-authoring/examples";

import { TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS } from "./grammar-simulation-cases";
import { isAuthoringIssueOutstanding } from "./issue-state";
import { createTextAuthoringDocument } from "./parser";

test("the demo dropdown contains every validated grammar scenario exactly once", () => {
  assert.equal(VALIDATED_TEXT_AUTHORING_EXAMPLES.length, 30);
  assert.equal(
    new Set([
      SIMPLE_TEXT_AUTHORING_EXAMPLE.id,
      ...VALIDATED_TEXT_AUTHORING_EXAMPLES.map((example) => example.id),
    ]).size,
    31,
  );
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
        VALIDATED_TEXT_AUTHORING_EXAMPLES.filter(
          (example) => example.group === group,
        ).length,
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

  const scenarioIds = VALIDATED_TEXT_AUTHORING_EXAMPLES.map(
    (example) => example.scenarioId,
  );
  assert.equal(new Set(scenarioIds).size, scenarioIds.length);
  assert.deepEqual(
    [...scenarioIds].sort(),
    TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS.map(
      (scenario) => scenario.id,
    ).sort(),
  );
});

test("generated demo inputs stay identical to the passing simulation fixtures", () => {
  const examplesByScenario = new Map(
    VALIDATED_TEXT_AUTHORING_EXAMPLES.map((example) => [
      example.scenarioId,
      example,
    ]),
  );

  for (const scenario of TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS) {
    const example = examplesByScenario.get(scenario.id);
    assert.ok(example, `missing demo example ${scenario.id}`);
    const sourceTitle = scenario.options?.sourceTitle;
    const sourceUrl = scenario.options?.sourceUrl ?? scenario.sourceReference;
    const source =
      sourceUrl ??
      sourceTitle ??
      (scenario.group === "existing_content"
        ? "기존 FLOW 콘텐츠"
        : "문법 검증 예시");

    assert.equal(example.rawText, scenario.rawText, `${scenario.id}: rawText`);
    assert.equal(
      example.previewAnchor,
      scenario.anchor,
      `${scenario.id}: anchor`,
    );
    assert.equal(example.group, scenario.group, `${scenario.id}: group`);
    assert.equal(
      example.title,
      scenario.options?.title ?? scenario.expected.title ?? scenario.title,
      `${scenario.id}: title`,
    );
    assert.equal(example.source, source, `${scenario.id}: source`);
    assert.equal(
      example.ownership,
      scenario.options?.ownership ?? "personal",
      `${scenario.id}: ownership`,
    );
  }
});

test("K-MOOC and LibriVox demos expose source-faithful Flow Markdown Items", () => {
  const kmooc = TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS.find(
    (scenario) => scenario.id === "content-kmooc-14",
  );
  const librivox = TEXT_AUTHORING_GRAMMAR_SIMULATION_SCENARIOS.find(
    (scenario) => scenario.id === "content-librivox-38",
  );
  assert.ok(kmooc);
  assert.ok(librivox);

  const kmoocLines = kmooc.rawText.split(/\r?\n/u);
  const librivoxLines = librivox.rawText.split(/\r?\n/u);
  assert.match(kmoocLines[0] ?? "", /^# /u);
  assert.equal(kmoocLines[1], "## 14주 강의계획");
  assert.equal(kmooc.rawText.match(/^- \[ \] /gmu)?.length ?? 0, 14);
  assert.equal(kmooc.rawText.match(/^  - 주차: /gmu)?.length ?? 0, 14);
  assert.equal(kmooc.rawText.match(/^  - 주차 활동: /gmu)?.length ?? 0, 14);
  assert.match(
    kmooc.rawText,
    /- \[ \] 데이터 분석 보고서 작성법\n  - 주차: 14주차\n  - 주차 활동: 없음$/u,
  );
  assert.match(librivoxLines[0] ?? "", /^# /u);
  assert.equal(librivoxLines[1], "## 장 목록");
  assert.equal(librivox.rawText.match(/^- \[ \] /gmu)?.length ?? 0, 38);
  assert.equal(librivox.rawText.match(/^  - 순서: /gmu)?.length ?? 0, 38);
  assert.equal(librivox.rawText.match(/^  - 재생시간: /gmu)?.length ?? 0, 38);
  assert.match(
    librivox.rawText,
    /- \[ \] The Bend in the Road\n  - 순서: 38\n  - 재생시간: 00:15:02$/u,
  );

  for (const rawText of [kmooc.rawText, librivox.rawText]) {
    assert.doesNotMatch(rawText, /완료 상태|출처|자료|https?:\/\//u);
    assert.doesNotMatch(rawText, /\t/u);
    assert.doesNotMatch(rawText, /^  - (?:날짜|완료 기준):/gmu);
  }
});

test("the simple syntax example includes one-level Todo checks and bounded recurrence", () => {
  assert.match(
    SIMPLE_TEXT_AUTHORING_EXAMPLE.rawText,
    /^  - 반복: 매주 월요일$/mu,
  );
  assert.match(SIMPLE_TEXT_AUTHORING_EXAMPLE.rawText, /^  - 반복 종료: 3회$/mu);
  assert.match(
    SIMPLE_TEXT_AUTHORING_EXAMPLE.rawText,
    /^  - 실행 조건: 사용 중인 경우에 실행합니다\.$/mu,
  );
  assert.equal(
    SIMPLE_TEXT_AUTHORING_EXAMPLE.rawText.match(/^  - \[ \] /gmu)?.length ?? 0,
    2,
  );
});

test("the latest grammar showcase covers bounded recurrence, child checks, links, and unknown detail", () => {
  const example = VALIDATED_TEXT_AUTHORING_EXAMPLES.find(
    (candidate) => candidate.scenarioId === "change-latest-grammar-showcase",
  );
  assert.ok(example);
  assert.equal(example.group, "condition_change");
  assert.match(example.rawText, /^  - 날짜: 2026-08-03$/mu);
  assert.match(example.rawText, /^  - 반복 종료: 3회$/mu);
  assert.equal(example.rawText.match(/^  - \[ \] /gmu)?.length ?? 0, 2);
  assert.match(
    example.rawText,
    /^  - 자료: \[참고 자료\]\(https:\/\/example\.com\/resource\)$/mu,
  );
  assert.match(
    example.rawText,
    /^  - 출처: \[원문\]\(https:\/\/example\.com\/source\)$/mu,
  );
  assert.match(
    example.rawText,
    /^  - 담당 메모: 담당자와 확인 범위를 적습니다\.$/mu,
  );
  assert.equal(example.expectedResultLabel, "캘린더 3개");
});

test("recurrence demo labels use projected occurrence counts instead of canonical Item counts", () => {
  const labels = Object.fromEntries(
    VALIDATED_TEXT_AUTHORING_EXAMPLES.filter((example) =>
      [
        "change-repeat-condition-weekly",
        "change-daily-repeat-until-date",
        "change-repeat-condition-monthly",
        "change-latest-grammar-showcase",
      ].includes(example.scenarioId),
    ).map((example) => [example.scenarioId, example.expectedResultLabel]),
  );
  assert.deepEqual(labels, {
    "change-repeat-condition-weekly": "캘린더 4개",
    "change-daily-repeat-until-date": "캘린더 5개",
    "change-latest-grammar-showcase": "캘린더 3개",
    "change-repeat-condition-monthly": "캘린더 1개",
  });
});

test("reviewed exception examples keep their runtime repair state", () => {
  const byScenario = new Map(
    VALIDATED_TEXT_AUTHORING_EXAMPLES.map((example) => [
      example.scenarioId,
      example,
    ]),
  );
  for (const id of ["error-unknown-property", "error-explanatory-prose"]) {
    const example = byScenario.get(id);
    assert.ok(example, id);
    assert.equal(example.group, "exception_handling", id);
    assert.equal(example.resultLabel, "예외 처리", id);
    assert.equal(
      createTextAuthoringDocument(example.rawText).parseResult.issues.filter(
        isAuthoringIssueOutstanding,
      ).length,
      0,
      `${id}: handled exceptions must not raise a review count`,
    );
  }
  for (const id of [
    "error-ambiguous-date",
    "error-invalid-relative-date",
    "error-url-only",
  ]) {
    const example = byScenario.get(id);
    assert.ok(example, id);
    assert.equal(example.group, "exception_handling", id);
    assert.equal(example.resultLabel, "예외 처리", id);
    assert.match(example.expectedResultLabel ?? "", /원문 수정 필요 1건/u, id);
    assert.ok(
      createTextAuthoringDocument(example.rawText).parseResult.issues.some(
        isAuthoringIssueOutstanding,
      ),
      `${id}: reviewed fail-closed examples must retain an outstanding issue`,
    );
  }
});

test("non-compatibility demo fixtures teach only canonical v2 Item syntax", () => {
  for (const example of VALIDATED_TEXT_AUTHORING_EXAMPLES) {
    if (example.group === "compatibility") continue;
    for (const line of example.rawText.split(/\r?\n/u)) {
      assert.doesNotMatch(
        line,
        /^\s{2}(?!-\s)[^:：]{1,32}[:：]/u,
        `${example.scenarioId}: v1 property`,
      );
      if (!/^-\s+/u.test(line)) continue;
      assert.match(
        line,
        /^(?:-\s+\[[ xX]\]\s+|-\s+기준일:)/u,
        `${example.scenarioId}: noncanonical root bullet`,
      );
    }
  }

  const jeju = VALIDATED_TEXT_AUTHORING_EXAMPLES.find(
    (example) => example.scenarioId === "content-jeju-memo-5",
  );
  assert.ok(jeju);
  assert.match(jeju.rawText, /^# 제주 여행 준비$/mu);
  assert.equal(jeju.rawText.match(/^- \[ \] /gmu)?.length ?? 0, 5);
});

test("quick examples reuse the validated content instead of maintaining copies", () => {
  const expectedScenarios = new Map([
    ["jeju", "content-jeju-memo-5"],
    ["moving", "content-moving-d30"],
    ["course", "content-kmooc-14"],
    ["allblanc", "content-allblanc-7day"],
  ]);
  const validatedByScenario = new Map(
    VALIDATED_TEXT_AUTHORING_EXAMPLES.map((example) => [
      example.scenarioId,
      example,
    ]),
  );

  for (const [quickId, scenarioId] of expectedScenarios) {
    const quick = TEXT_AUTHORING_EXAMPLES.find(
      (example) => example.id === quickId,
    );
    const validated = validatedByScenario.get(scenarioId);
    assert.ok(quick, `missing quick example ${quickId}`);
    assert.ok(validated, `missing validated example ${scenarioId}`);
    assert.equal(quick.scenarioId, scenarioId);
    assert.equal(quick.rawText, validated.rawText);
    assert.equal(quick.previewAnchor, validated.previewAnchor);
    assert.equal(quick.title, validated.title);
    assert.equal(quick.source, validated.source);
  }
});
