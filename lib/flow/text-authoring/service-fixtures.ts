import type { AuthoringArtifactKind } from "./artifact-projection";

export type P0TextAuthoringFixtureId =
  | "plain-prose"
  | "root-with-child"
  | "dated-and-undated"
  | "finite-repeat"
  | "fact-table"
  | "invalid-date"
  | "url-only"
  | "long-38-items";

export type P0TextAuthoringFixture = {
  id: P0TextAuthoringFixtureId;
  source: string;
  expected: {
    canonicalItems: number;
    explicitRootItems: number;
    checklistEntries: number;
    issueTypes: string[];
    blockingIssueCount: number;
    projectionCounts: Record<AuthoringArtifactKind, number>;
    sourcePreserved: true;
    inventedActionCount: 0;
  };
};

const longItems = Array.from({ length: 38 }, (_, index) =>
  [
    `- [ ] 항목 ${index + 1}`,
    `  - 설명: 설명 ${index + 1}`,
    `  - 완료 기준: 확인 ${index + 1}`,
  ].join("\n"),
).join("\n");

export const P0_TEXT_AUTHORING_FIXTURES: readonly P0TextAuthoringFixture[] = [
  {
    id: "plain-prose",
    source: ["정말 제목입니다.", "설명입니다.", "첫 번째 항목입니다."].join(
      "\n",
    ),
    expected: {
      canonicalItems: 0,
      explicitRootItems: 0,
      checklistEntries: 0,
      issueTypes: ["ambiguous_role", "ambiguous_role", "ambiguous_role"],
      blockingIssueCount: 0,
      projectionCounts: { calendar: 0, todo: 0, sheet: 0, memo: 1 },
      sourcePreserved: true,
      inventedActionCount: 0,
    },
  },
  {
    id: "root-with-child",
    source: [
      "# 출국 준비",
      "- [ ] 여권 확인",
      "  - [ ] 만료일 확인",
      "  - [ ] 비자 페이지 확인",
    ].join("\n"),
    expected: {
      canonicalItems: 1,
      explicitRootItems: 1,
      checklistEntries: 2,
      issueTypes: [],
      blockingIssueCount: 0,
      projectionCounts: { calendar: 0, todo: 1, sheet: 0, memo: 1 },
      sourcePreserved: true,
      inventedActionCount: 0,
    },
  },
  {
    id: "dated-and-undated",
    source: [
      "# 일정",
      "- [ ] 날짜 있는 항목",
      "  - 날짜: 2026-08-20",
      "- [ ] 날짜 없는 항목",
    ].join("\n"),
    expected: {
      canonicalItems: 2,
      explicitRootItems: 2,
      checklistEntries: 0,
      issueTypes: [],
      blockingIssueCount: 0,
      projectionCounts: { calendar: 1, todo: 2, sheet: 0, memo: 2 },
      sourcePreserved: true,
      inventedActionCount: 0,
    },
  },
  {
    id: "finite-repeat",
    source: [
      "# 세 번 점검",
      "- [ ] 상태 확인",
      "  - 날짜: 2026-08-11",
      "  - 반복: 매일",
      "  - 반복 종료: 3회",
    ].join("\n"),
    expected: {
      canonicalItems: 1,
      explicitRootItems: 1,
      checklistEntries: 0,
      issueTypes: [],
      blockingIssueCount: 0,
      projectionCounts: { calendar: 3, todo: 3, sheet: 3, memo: 3 },
      sourcePreserved: true,
      inventedActionCount: 0,
    },
  },
  {
    id: "fact-table",
    source: [
      "제품\t가격\t자료",
      "기본형\t10000\thttps://example.com/basic",
      "고급형\t20000\thttps://example.com/pro",
    ].join("\n"),
    expected: {
      // Table rows remain lossless compatibility rows for Sheet/TXT, but are
      // not executable Todo or Calendar actions without an explicit marker.
      canonicalItems: 2,
      explicitRootItems: 0,
      checklistEntries: 0,
      issueTypes: [],
      blockingIssueCount: 0,
      projectionCounts: { calendar: 0, todo: 0, sheet: 2, memo: 2 },
      sourcePreserved: true,
      inventedActionCount: 0,
    },
  },
  {
    id: "invalid-date",
    source: [
      "# 잘못된 날짜",
      "- [ ] 날짜 다시 입력",
      "  - 날짜: 8월 11일",
    ].join("\n"),
    expected: {
      canonicalItems: 1,
      explicitRootItems: 1,
      checklistEntries: 0,
      issueTypes: ["invalid_date"],
      blockingIssueCount: 0,
      projectionCounts: { calendar: 0, todo: 1, sheet: 0, memo: 1 },
      sourcePreserved: true,
      inventedActionCount: 0,
    },
  },
  {
    id: "url-only",
    source: "https://example.com/source",
    expected: {
      canonicalItems: 0,
      explicitRootItems: 0,
      checklistEntries: 0,
      issueTypes: ["source_import_required"],
      blockingIssueCount: 1,
      projectionCounts: { calendar: 0, todo: 0, sheet: 0, memo: 0 },
      sourcePreserved: true,
      inventedActionCount: 0,
    },
  },
  {
    id: "long-38-items",
    source: `# 긴 목록\n${longItems}`,
    expected: {
      canonicalItems: 38,
      explicitRootItems: 38,
      checklistEntries: 0,
      issueTypes: [],
      blockingIssueCount: 0,
      projectionCounts: { calendar: 0, todo: 38, sheet: 38, memo: 38 },
      sourcePreserved: true,
      inventedActionCount: 0,
    },
  },
] as const;
