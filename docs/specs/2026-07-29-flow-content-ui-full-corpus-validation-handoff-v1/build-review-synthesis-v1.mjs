import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sha256 } from "./lib/utils-v1.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const GENERATED_AT = "2026-07-29T23:59:00+09:00";
const AXES = [
  "itemGranularity",
  "primaryProjection",
  "checklistTodoDecision",
  "scheduleSuitability",
  "contentValue",
  "uiUnderstandability",
];

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
}

function write(file, value) {
  fs.writeFileSync(
    path.join(DIR, file),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

function countsBy(records, key) {
  return Object.fromEntries(
    Object.entries(Object.groupBy(records, (record) => record[key])).map(
      ([value, entries]) => [value, entries.length],
    ),
  );
}

function internalVerdict(a, b) {
  if (a === "hold" && b === "hold") return "hold";
  if (a === "go" && b === "go") return "go";
  return "modify";
}

const view = read("content-ui-view-model-v1.json");
const runA = read("runs/independent-ui-review-a-v1.json");
const runB = read("runs/independent-ui-review-b-v1.json");
const reviewsA = runA.reviews;
const reviewsB = runB.judgments;
const normal = view.contents.filter((content) =>
  ["product_candidate", "structure_probe"].includes(content.corpusTier),
);
const normalIds = normal.map((content) => content.contentId);
const normalSet = new Set(normalIds);

for (const [runId, records] of [
  ["A", reviewsA],
  ["B", reviewsB],
]) {
  const ids = records.map((record) => record.contentId);
  if (
    records.length !== normal.length ||
    new Set(ids).size !== normal.length ||
    ids.some((contentId) => !normalSet.has(contentId))
  ) {
    throw new Error(`Independent review ${runId} does not cover the frozen normal corpus`);
  }
}

if (
  runA.peerOutputVisible !== false ||
  runB.peerOutputVisible !== false ||
  runA.inputManifestHash !== view.corpusFingerprint ||
  runB.inputManifestHash !== view.corpusFingerprint
) {
  throw new Error("Independent review boundary or fingerprint mismatch");
}

const aById = new Map(reviewsA.map((review) => [review.contentId, review]));
const bById = new Map(reviewsB.map((review) => [review.contentId, review]));
const comparisons = normal.map((content) => {
  const a = aById.get(content.contentId);
  const b = bById.get(content.contentId);
  const agreement = Object.fromEntries(AXES.map((axis) => [axis, a[axis] === b[axis]]));
  const disagreeingAxes = AXES.filter((axis) => !agreement[axis]);
  return {
    contentId: content.contentId,
    title: content.title,
    corpusTier: content.corpusTier,
    reviewerA: a,
    reviewerB: b,
    agreement,
    disagreeingAxes,
    exactAgreement: disagreeingAxes.length === 0,
    synthesizedInternalVerdict: internalVerdict(a.contentValue, b.contentValue),
    userReviewStatus: "NOT_REVIEWED_BY_USER",
  };
});

const axisMetrics = Object.fromEntries(
  AXES.map((axis) => {
    const agreed = comparisons.filter((comparison) => comparison.agreement[axis]).length;
    return [
      axis,
      {
        agreed,
        total: comparisons.length,
        rate: Number((agreed / comparisons.length).toFixed(4)),
      },
    ];
  }),
);
const exactAgreement = comparisons.filter((comparison) => comparison.exactAgreement).length;
const disagreementIds = comparisons
  .filter((comparison) => !comparison.exactAgreement)
  .map((comparison) => comparison.contentId);

const combined = {
  schemaVersion: "flow-content-ui-independent-review-comparison-v1",
  generatedAt: GENERATED_AT,
  corpusFingerprint: view.corpusFingerprint,
  claimBoundary:
    "Two independent internal agent reviews. This is not observed-user validation.",
  runLineage: [
    {
      runId: runA.runId,
      reviewerRole: runA.reviewerRole,
      peerOutputVisible: runA.peerOutputVisible,
      records: reviewsA.length,
      resultHash: sha256(runA),
    },
    {
      runId: runB.reviewId,
      reviewerRole: runB.reviewerRole,
      peerOutputVisible: runB.peerOutputVisible,
      records: reviewsB.length,
      resultHash: sha256(runB),
    },
  ],
  metrics: {
    content: comparisons.length,
    exactAgreement,
    exactAgreementRate: Number((exactAgreement / comparisons.length).toFixed(4)),
    anyDisagreement: comparisons.length - exactAgreement,
    axisAgreement: axisMetrics,
    reviewerAContentValue: countsBy(reviewsA, "contentValue"),
    reviewerBContentValue: countsBy(reviewsB, "contentValue"),
    synthesizedInternalVerdict: countsBy(
      comparisons,
      "synthesizedInternalVerdict",
    ),
  },
  disagreementContentIds: disagreementIds,
  comparisons,
};
write("independent-ui-review-v1.json", combined);

const previousReadjudication = read("content-value-readjudication-v1.json");
const previousById = new Map(
  previousReadjudication.records.map((record) => [record.contentId, record]),
);
const readjudication = {
  schemaVersion: "flow-content-ui-value-readjudication-v1",
  generatedAt: GENERATED_AT,
  corpusFingerprint: view.corpusFingerprint,
  claimBoundary:
    "Deterministic pre-screen plus two independent internal agent reviews; not user save intent.",
  summary: {
    records: comparisons.length,
    internalGo: comparisons.filter(
      (record) => record.synthesizedInternalVerdict === "go",
    ).length,
    internalModify: comparisons.filter(
      (record) => record.synthesizedInternalVerdict === "modify",
    ).length,
    internalHold: comparisons.filter(
      (record) => record.synthesizedInternalVerdict === "hold",
    ).length,
    valueDisagreement: comparisons.filter(
      (record) => !record.agreement.contentValue,
    ).length,
    userReviewed: 0,
  },
  records: comparisons.map((comparison) => ({
    ...previousById.get(comparison.contentId),
    reviewerA: {
      contentValue: comparison.reviewerA.contentValue,
      itemGranularity: comparison.reviewerA.itemGranularity,
      primaryProjection: comparison.reviewerA.primaryProjection,
      checklistTodoDecision: comparison.reviewerA.checklistTodoDecision,
      scheduleSuitability: comparison.reviewerA.scheduleSuitability,
      uiUnderstandability: comparison.reviewerA.uiUnderstandability,
      modifyReasons: comparison.reviewerA.modifyReasons,
    },
    reviewerB: {
      contentValue: comparison.reviewerB.contentValue,
      itemGranularity: comparison.reviewerB.itemGranularity,
      primaryProjection: comparison.reviewerB.primaryProjection,
      checklistTodoDecision: comparison.reviewerB.checklistTodoDecision,
      scheduleSuitability: comparison.reviewerB.scheduleSuitability,
      uiUnderstandability: comparison.reviewerB.uiUnderstandability,
      modifyReasons: comparison.reviewerB.modifyReasons,
    },
    synthesizedInternalVerdict: comparison.synthesizedInternalVerdict,
    disagreeingAxes: comparison.disagreeingAxes,
    userReviewStatus: "NOT_REVIEWED_BY_USER",
  })),
};
write("content-value-readjudication-v1.json", readjudication);

const problems = {
  itemGranularity: comparisons.filter(
    (comparison) =>
      comparison.reviewerA.itemGranularity !== "appropriate" ||
      comparison.reviewerB.itemGranularity !== "appropriate",
  ),
  projection: comparisons.filter(
    (comparison) => !comparison.agreement.primaryProjection,
  ),
  checklistTodo: comparisons.filter(
    (comparison) => !comparison.agreement.checklistTodoDecision,
  ),
  schedule: comparisons.filter(
    (comparison) =>
      !comparison.agreement.scheduleSuitability ||
      ["overloaded"].includes(comparison.reviewerA.scheduleSuitability) ||
      ["overloaded"].includes(comparison.reviewerB.scheduleSuitability),
  ),
  contentValue: comparisons.filter(
    (comparison) => !comparison.agreement.contentValue,
  ),
  ui: comparisons.filter(
    (comparison) =>
      comparison.reviewerA.uiUnderstandability !== "clear" ||
      comparison.reviewerB.uiUnderstandability !== "clear",
  ),
};

const evidenceIds = (records, limit = 12) =>
  records.slice(0, limit).map((record) => record.contentId);
const decisions = [
  {
    decisionId: "PD-01-item-minimum-unit",
    question: "Item의 최소 단위를 무엇으로 고정할 것인가?",
    recommendation:
      "원문 근거가 있고 독립 완료·결정·기록 상태를 저장할 가치가 있는 최소 단위로 유지한다. micro action 자동 분해는 금지한다.",
    alternative: "원문 문장 또는 화면 행마다 Item을 하나씩 만든다.",
    evidenceContentIds: evidenceIds(problems.itemGranularity),
    repeatedProblemCount: problems.itemGranularity.length,
    affectedAreas: ["backend DTO", "conversion prompt", "Flow detail UI"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-02-step-grouping",
    question: "Step의 기본 grouping은 무엇인가?",
    recommendation:
      "같은 사용자 순간·세션·원문 구간을 묶되 Item별 완료 상태는 유지한다. Step을 Todo나 Calendar의 canonical 부모로 만들지 않는다.",
    alternative: "모든 Item을 한 Step에 두거나 projection마다 새 hierarchy를 만든다.",
    evidenceContentIds: [
      "canonical:base-moving-d30",
      "canonical:base-opic-plan",
      "new:new-c08-todoist-podcast",
    ],
    repeatedProblemCount: problems.itemGranularity.length,
    affectedAreas: ["canonical contract", "projection adapter", "mobile Flow UI"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-03-checklist-versus-todo",
    question: "Checklist와 Todo를 어떤 규칙으로 나눌 것인가?",
    recommendation:
      "끝이 정해진 한 상황의 누락 방지 묶음은 Checklist, 독립적으로 재정렬·연기·추가하는 queue는 Todo로 둔다.",
    alternative: "Checklist를 Todo의 하위 canonical entity로 둔다.",
    evidenceContentIds: evidenceIds(problems.checklistTodo),
    repeatedProblemCount: problems.checklistTodo.length,
    affectedAreas: ["projection classifier", "Todo adapter", "Checklist UI"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-04-primary-projection",
    question: "기본 projection은 어떻게 정할 것인가?",
    recommendation:
      "사용자 job을 가장 적은 입력과 손실로 실행시키는 하나를 primary로 정하고, availability와 fidelity를 별도 판정한다.",
    alternative: "생성 가능한 모든 포맷을 동등하게 노출한다.",
    evidenceContentIds: evidenceIds(problems.projection),
    repeatedProblemCount: problems.projection.length,
    affectedAreas: ["artifact planner", "Gallery card", "backend response"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-05-secondary-projection-exposure",
    question: "보조 포맷을 어디까지 첫 화면에 보일 것인가?",
    recommendation:
      "primary와 최대 한 개의 자연스러운 secondary만 앞에 두고, optional·not_recommended는 포맷 비교 화면에서 손실과 함께 보여준다.",
    alternative: "다섯 포맷 버튼을 항상 같은 중요도로 노출한다.",
    evidenceContentIds: evidenceIds(problems.projection),
    repeatedProblemCount: problems.projection.length,
    affectedAreas: ["Flow detail IA", "export drawer"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-06-undated-start",
    question: "날짜 없는 콘텐츠를 처음 어떻게 시작하게 할 것인가?",
    recommendation:
      "기본은 날짜 없는 Checklist·Todo·Sheet로 바로 시작하고, 사용자가 일정화를 선택할 때만 pacing preview를 연다.",
    alternative: "저장 시 시작일과 cadence를 필수로 묻는다.",
    evidenceContentIds: [
      "canonical:base-opentutorials-web1-progress",
      "canonical:oq-oq-c03-librivox",
      "new:new-c04-instructables-origami",
    ],
    repeatedProblemCount: comparisons.filter(
      (comparison) =>
        comparison.reviewerA.scheduleSuitability === "overlay_only" ||
        comparison.reviewerB.scheduleSuitability === "overlay_only",
    ).length,
    affectedAreas: ["Input Composer", "UserFlowCopy", "schedule playground"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-07-pacing-default",
    question: "하루 N개·주 N개의 기본값을 둘 것인가?",
    recommendation:
      "전역 자동 확정값은 두지 않는다. 콘텐츠 길이에 맞춘 draft 예시만 보여주고 시작일·cadence 확인 후 미래 미완료 Item에만 적용한다.",
    alternative: "모든 날짜 없는 콘텐츠를 하루 1개로 자동 배치한다.",
    evidenceContentIds: [
      "canonical:base-opentutorials-web1-progress",
      "canonical:oq-oq-c02-kmooc-full",
      "events:new-gutenberg-top-reading-queue",
    ],
    repeatedProblemCount: problems.schedule.length,
    affectedAreas: ["pacing engine", "UserFlowCopy", "Calendar adapter"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-08-due-versus-calendar",
    question: "Todo due와 Calendar time을 어떻게 구분할 것인가?",
    recommendation:
      "마감일까지 끝내면 Todo/VTODO DUE, 실제 참석·예약·수업·시간 점유는 VEVENT로 보낸다. due만으로 time block을 만들지 않는다.",
    alternative: "날짜가 있는 모든 Item을 VEVENT로 만든다.",
    evidenceContentIds: [
      "canonical:value-vq-11",
      "new:new-a08-income-tax",
      "events:event-kr-qnet-exam-lifecycle",
    ],
    repeatedProblemCount: problems.schedule.length,
    affectedAreas: ["temporal intent", "ICS exporter", "Todo adapter"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-09-calendar-grouping",
    question: "Calendar per-item과 session bundle 중 무엇을 기본으로 할 것인가?",
    recommendation:
      "기본 per-item, 같은 날짜·시간·장소·세션일 때만 Step bundle을 허용하고 child Item ID와 완료 손실을 표시한다.",
    alternative: "같은 날짜의 모든 Item을 하나의 event로 묶는다.",
    evidenceContentIds: [
      "canonical:base-moving-d30",
      "canonical:base-allblanc-7day-abs",
      "legacy:preapp:busan-friends-2n3d-route",
    ],
    repeatedProblemCount: comparisons.filter(
      (comparison) =>
        comparison.reviewerA.modifyReasons.some((reason) =>
          reason.includes("bundle"),
        ) ||
        comparison.reviewerB.modifyReasons.some((reason) =>
          reason.includes("bundle"),
        ),
    ).length,
    affectedAreas: ["Calendar projection", "loss manifest", "mobile calendar"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-10-event-contract",
    question: "축제·공연·시험의 Series·Edition·Occurrence를 어떻게 저장할 것인가?",
    recommendation:
      "원문 일정은 Series/Edition/Occurrence·Window·Milestone으로 보존하고, 사용자의 저장·예약·참석 선택 뒤 Item을 만든다. 미확정 변경 일정은 멈춘다.",
    alternative: "원문 event row를 바로 완료 Item 또는 yearly RRULE로 만든다.",
    evidenceContentIds: [
      "events:event-kr-multi-show-choir",
      "events:event-kr-qnet-exam-lifecycle",
      "events:event-pattern-nps-rescheduled",
    ],
    repeatedProblemCount: 14,
    affectedAreas: ["event DTO", "event intent UI", "ICS projection"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-11-source-overlay-display",
    question: "원문 일정과 개인 일정화를 어떻게 구분해 보여줄 것인가?",
    recommendation:
      "source는 보라색·고정 라벨, user overlay는 노란색·draft/confirmed 라벨로 표시하고 서로 다른 필드에 저장한다.",
    alternative: "화면에서는 합쳐 보이고 provenance만 내부에 둔다.",
    evidenceContentIds: [
      "canonical:base-opentutorials-web1-progress",
      "canonical:base-moving-d30",
      "events:event-kr-single-performance",
    ],
    repeatedProblemCount: problems.schedule.length,
    affectedAreas: ["data contract", "schedule UI", "audit log"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-12-readiness-state-display",
    question: "Logic·Public·Rights·Personal 상태를 어디까지 노출할 것인가?",
    recommendation:
      "내부 검토 UI에서는 네 축을 독립 표시하고, 사용자 제품 화면에서는 실행 가능성과 출처·주의만 이해 가능한 문장으로 축약한다.",
    alternative: "하나의 Go/Modify/Hold 상태로 합친다.",
    evidenceContentIds: [
      "canonical:base-baby-food-174",
      "canonical:base-opentutorials-web1-progress",
      "new:new-a01-seoul-wedding-110",
    ],
    repeatedProblemCount: problems.ui.length,
    affectedAreas: ["admin UI", "public content card", "promotion gate"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-13-memo-sheet-position",
    question: "Memo와 Sheet를 제품에서 어떤 위치에 둘 것인가?",
    recommendation:
      "Sheet는 안정적인 행·열 상태/비교·진도 projection, Memo는 사람이 읽고 복사하는 문서 projection으로 둔다. 둘 다 canonical JSON이 아니다.",
    alternative: "Memo를 raw dump, Sheet를 단순 CSV 다운로드로만 취급한다.",
    evidenceContentIds: [
      "canonical:oq-oq-c08-ac-decision",
      "canonical:base-opentutorials-web1-progress",
      "new:new-a01-seoul-wedding-110",
    ],
    repeatedProblemCount: problems.projection.length,
    affectedAreas: ["export contract", "Sheet UI", "Memo UI"],
    userApprovalRequired: true,
  },
  {
    decisionId: "PD-14-backend-required-fields",
    question: "backend DTO에서 반드시 보존할 필드는 무엇인가?",
    recommendation:
      "Item/Step/Flow ID, sourceRowIds, completion, temporalIntent, schedule owner·derivation·status, location, fields, event identity, projection eligibility·loss, readiness 축을 필수 계약으로 넘긴다.",
    alternative: "title·memo·start/end 중심의 ICS형 DTO로 단순화한다.",
    evidenceContentIds: evidenceIds(comparisons, 12),
    repeatedProblemCount: comparisons.length,
    affectedAreas: ["backend DTO", "DB design", "LLM output schema"],
    userApprovalRequired: true,
  },
];

write("planning-decision-handoff-v1.json", {
  schemaVersion: "flow-content-ui-planning-handoff-v1",
  generatedAt: GENERATED_AT,
  corpusFingerprint: view.corpusFingerprint,
  status: "DRAFT_PENDING_USER_REVIEW",
  claimBoundary:
    "Recommendations are internal synthesis and remain pending user review in the Gallery.",
  decisions,
});

const gaps = [
  {
    gapId: "GAP-01-composite-item-boundary",
    severity: "high",
    title: "서로 다른 완료 판단이 한 Item에 합쳐진 사례",
    repeatedProblemCount: problems.itemGranularity.length,
    contentIds: evidenceIds(problems.itemGranularity, 20),
    proposedRule:
      "한 Item 안의 행동들이 독립적으로 미룰 수 있거나 완료 시점이 다르면 분리하고, 단일 완료 판단의 설명 행이면 함께 둔다.",
  },
  {
    gapId: "GAP-02-primary-projection-disagreement",
    severity: "high",
    title: "기본 projection 독립 판정 불일치",
    repeatedProblemCount: problems.projection.length,
    contentIds: evidenceIds(problems.projection, 20),
    proposedRule:
      "natural artifact, availability, fidelity, user job을 분리 채점하고 primary는 하나만 선택한다.",
  },
  {
    gapId: "GAP-03-checklist-todo-disagreement",
    severity: "high",
    title: "Checklist와 Todo 경계 불일치",
    repeatedProblemCount: problems.checklistTodo.length,
    contentIds: evidenceIds(problems.checklistTodo, 20),
    proposedRule:
      "closed bounded session과 independent reorderable queue를 tie-breaker로 고정한다.",
  },
  {
    gapId: "GAP-04-calendar-overload",
    severity: "high",
    title: "개인 overlay 없이 Calendar가 과도하거나 불완전한 사례",
    repeatedProblemCount: problems.schedule.length,
    contentIds: evidenceIds(problems.schedule, 20),
    proposedRule:
      "due-only, undated, incomplete-reschedule은 source VEVENT를 금지하고 user-confirmed pacing만 허용한다.",
  },
  {
    gapId: "GAP-05-event-intent-activation",
    severity: "high",
    title: "원문 행사 사실과 사용자 참석 Item 사이의 activation 공백",
    repeatedProblemCount: 14,
    contentIds: normal
      .filter((content) => content.contentMode === "event_source_before_user_intent")
      .map((content) => content.contentId),
    proposedRule:
      "Series/Edition/Occurrence를 먼저 보존하고 유효 회차 선택 뒤에만 attend/book/save Item을 만든다.",
  },
  {
    gapId: "GAP-06-ui-explanation-load",
    severity: "medium",
    title: "실제 사용 UI에서 추가 설명이 필요한 콘텐츠",
    repeatedProblemCount: problems.ui.length,
    contentIds: evidenceIds(problems.ui, 20),
    proposedRule:
      "첫 행동·현재 Step·primary projection을 먼저 보이고 provenance와 나머지 포맷은 보조 패널로 둔다.",
  },
  {
    gapId: "GAP-07-agent-value-disagreement",
    severity: "medium",
    title: "링크 저장 대비 Flow 가치 독립 판정 불일치",
    repeatedProblemCount: problems.contentValue.length,
    contentIds: evidenceIds(problems.contentValue, 20),
    proposedRule:
      "실제 사용자 검토 전에는 internal Modify로 보수적으로 유지하고 save reason과 return state를 직접 확인한다.",
  },
];
write("content-and-logic-gap-register-v1.json", {
  schemaVersion: "flow-content-ui-gap-register-v1",
  generatedAt: GENERATED_AT,
  corpusFingerprint: view.corpusFingerprint,
  claimBoundary: "Internal synthesis; not observed-user findings.",
  gaps,
});

console.log(
  JSON.stringify(
    {
      compared: comparisons.length,
      exactAgreement,
      exactAgreementRate: combined.metrics.exactAgreementRate,
      axisAgreement: axisMetrics,
      internalVerdict: combined.metrics.synthesizedInternalVerdict,
      decisions: decisions.length,
      gaps: gaps.length,
    },
    null,
    2,
  ),
);
