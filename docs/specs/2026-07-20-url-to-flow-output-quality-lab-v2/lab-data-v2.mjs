import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../..");

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));

const deepSet = readJson(
  "docs/content-audit/2026-07-19-flow-content-source-expansion/deep-set-v1.json",
);

const getDeepSetCase = (caseId) => {
  const record = deepSet.cases.find((candidate) => candidate.caseId === caseId);
  if (!record) throw new Error(`Missing deep-set case ${caseId}`);
  return record;
};

const normalizeDeepSetRows = (record) =>
  record.sourceRows.map((row) => ({
    sourceRowId: row.id,
    rowType: row.type,
    title: row.title,
    detail: row.detail,
    order: row.order - 1,
    locator: row.locator,
  }));

const makeSource = ({
  sourceId,
  title,
  publisher,
  url,
  locale = "ko-KR",
  checkedAt = "2026-07-20",
  access = "public",
  rowAccess = "full",
  providerType = "public_institution",
  format = "article",
  rightsBasis = "link_only_assumption",
  rightsReview = "restricted",
  allowedUse = ["link_metadata", "internal_review"],
  evidence,
}) => ({
  sourceId,
  title,
  publisher,
  url,
  locale,
  checkedAt,
  access,
  rowAccess,
  providerType,
  format,
  rightsBasis,
  rightsReview,
  allowedUse,
  evidence,
});

const coreClassification = ({
  lifeArea,
  secondaryLifeAreas = [],
  tags,
  sourceShape,
  secondarySourceShapes = [],
  executionPattern,
  secondaryExecutionPatterns = [],
  artifact,
  secondaryArtifacts = [],
  status = "confirmed",
}) => ({
  classificationStatus: status,
  primaryLifeArea: lifeArea,
  secondaryLifeAreas,
  topicTags: tags,
  sourceShape,
  secondarySourceShapes,
  primaryExecutionPattern: executionPattern,
  secondaryExecutionPatterns,
  primaryArtifact: artifact,
  secondaryArtifacts,
});

const review = ({
  sourceRowStatus = "complete",
  readiness = "ready_second_wave",
  freshness = "current",
  locale = "applicable",
  safety = "not_required",
  privacy = "not_required",
  rights = "restricted",
  promotion = "internal_review",
  blockers = [],
}) => ({
  sourceRowStatus,
  conversionReadiness: readiness,
  freshnessReview: freshness,
  localeReview: locale,
  safetyReview: safety,
  privacyReview: privacy,
  rightsReview: rights,
  promotionState: promotion,
  blockers,
});

const item = (id, title, sourceRowIds, options = {}) => ({
  id,
  title,
  sourceRowIds,
  step: options.step ?? "execute",
  intent: options.intent ?? "act",
  completionMode: options.completionMode ?? "check",
  doneWhen:
    options.doneWhen ?? `${title} 결과를 확인하고 완료 상태를 남겼다.`,
  schedule: options.schedule ?? null,
  recurrence: options.recurrence ?? null,
  data: options.data ?? {},
});

const field = (id, label, sourceRowIds, options = {}) => ({
  id,
  label,
  sourceRowIds,
  fieldType: options.fieldType ?? "text",
  required: options.required ?? false,
  value: options.value ?? null,
  options: options.options ?? [],
});

const memo = (id, title, body, sourceRowIds, kind = "note") => ({
  id,
  title,
  body,
  sourceRowIds,
  kind,
});

const reference = (id, title, body, sourceRowIds) => ({
  id,
  title,
  body,
  sourceRowIds,
});

const conditional = (id, when, then, sourceRowIds, escalation = null) => ({
  id,
  when,
  then,
  sourceRowIds,
  escalation,
});

const rolesFromDraft = (rows, draft, overrides = {}) => {
  const targets = new Map();
  const buckets = [
    ["item", draft.items ?? []],
    ["field", draft.fields ?? []],
    ["memo", draft.memos ?? []],
    ["reference", draft.references ?? []],
    ["conditional_response", draft.conditionalResponses ?? []],
  ];
  for (const [role, entities] of buckets) {
    for (const entity of entities) {
      for (const rowId of entity.sourceRowIds ?? []) {
        if (!targets.has(rowId)) targets.set(rowId, { role, targetIds: [] });
        if (targets.get(rowId).role === role) {
          targets.get(rowId).targetIds.push(entity.id);
        }
      }
    }
  }
  return rows.map((row) => {
    const manual = overrides[row.sourceRowId];
    if (manual) return { sourceRowId: row.sourceRowId, ...manual };
    const target = targets.get(row.sourceRowId);
    if (target) {
      return {
        sourceRowId: row.sourceRowId,
        role: target.role,
        targetIds: [...new Set(target.targetIds)],
        reason: `원문 행의 자연스러운 ${target.role} 역할로 보존`,
      };
    }
    return {
      sourceRowId: row.sourceRowId,
      role: "omission",
      targetIds: [],
      reason: "실행 단위로 만들 근거가 없거나 현재 확보 범위 밖임",
    };
  });
};

const kmoocWeeks = [
  ["데이터 리터러시", "퀴즈"],
  ["생성형 AI 활용 데이터 분석", "과제"],
  ["데이터 분석", "토론"],
  ["데이터 수집", "퀴즈"],
  ["파일 다루기", "퀴즈"],
  ["탐색적 데이터 분석", "토론"],
  ["수치 데이터 분석을 위한 NumPy", "과제"],
  ["Pandas 활용 데이터 분석", "퀴즈"],
  ["데이터 시각화", "토론"],
  ["통계분석", "토론"],
  ["데이터 기반 문제 해결 전략", "토론"],
  ["텍스트 데이터 분석", "토론"],
  ["감성 분석", "토론"],
  ["데이터 분석 보고서 작성법", "없음"],
];

const kmoocBaseRows = [
  {
    sourceRowId: "KMOOC-M01",
    rowType: "date",
    title: "수강 신청·운영 기간",
    detail: "2026-07-01부터 2026-08-31까지",
    order: 0,
    locator: "과정 메타데이터",
  },
  {
    sourceRowId: "KMOOC-M02",
    rowType: "reference",
    title: "과정 분량",
    detail: "14주, 총 40시간, VOD 26시간 15분",
    order: 1,
    locator: "과정 메타데이터",
  },
  {
    sourceRowId: "KMOOC-M03",
    rowType: "reference",
    title: "난이도와 수료증",
    detail: "초급 수준이며 수료증 제공",
    order: 2,
    locator: "과정 메타데이터",
  },
  {
    sourceRowId: "KMOOC-M04",
    rowType: "reference",
    title: "수료 조건",
    detail: "참여 80% 조건",
    order: 3,
    locator: "수료 조건",
  },
  {
    sourceRowId: "KMOOC-M05",
    rowType: "date",
    title: "성적 입력 기간",
    detail: "2026-09-01부터 2026-09-04까지",
    order: 4,
    locator: "과정 메타데이터",
  },
];

const kmoocFullRows = [
  ...kmoocBaseRows,
  ...kmoocWeeks.map(([title, activity], index) => ({
    sourceRowId: `KMOOC-W${String(index + 1).padStart(2, "0")}`,
    rowType: "table_row",
    title: `${index + 1}주차 · ${title}`,
    detail: `주차 활동: ${activity}`,
    order: index + 5,
    locator: `강의계획 이미지 ${index + 1}행`,
  })),
];

const librivoxChapters = [
  ["Mrs. Rachel Lynde Is Surprised", "00:14:35"],
  ["Matthew Cuthbert Is Surprised", "00:26:09"],
  ["Marilla Cuthbert Is Surprised", "00:12:47"],
  ["Morning at Green Gables", "00:12:03"],
  ["Anne's History", "00:11:23"],
  ["Marilla Makes Up Her Mind", "00:10:18"],
  ["Anne Says Her Prayers", "00:06:54"],
  ["Anne's Bringing-Up Is Begun", "00:23:23"],
  ["Mrs. Rachel Lynde Is Properly Horrified", "00:13:01"],
  ["Anne's Apology", "00:19:34"],
  ["Anne's Impressions of Sunday School", "00:09:16"],
  ["A Solemn Vow and Promise", "00:11:08"],
  ["The Delights of Anticipation", "00:08:57"],
  ["Anne's Confession", "00:16:07"],
  ["A Tempest in the School Teapot", "00:26:34"],
  ["Diana Is Invited to Tea with Tragic Results", "00:21:11"],
  ["A New Interest in Life", "00:10:39"],
  ["Anne to the Rescue", "00:16:59"],
  ["A Concert a Catastrophe and a Confession", "00:19:47"],
  ["A Good Imagination Gone Wrong", "00:11:50"],
  ["A New Departure in Flavorings", "00:18:14"],
  ["Anne Is Invited Out to Tea", "00:07:55"],
  ["Anne Comes to Grief in an Affair of Honor", "00:11:46"],
  ["Miss Stacy and Her Pupils Get Up a Concert", "00:10:34"],
  ["Matthew Insists on Puffed Sleeves", "00:23:29"],
  ["The Story Club Is Formed", "00:18:47"],
  ["Vanity and Vexation of Spirit", "00:17:46"],
  ["An Unfortunate Lily Maid", "00:15:19"],
  ["An Epoch in Anne's Life", "00:15:38"],
  ["The Queens Class Is Organized", "00:21:04"],
  ["Where the Brook and River Meet", "00:11:24"],
  ["The Pass List Is Out", "00:16:08"],
  ["The Hotel Concert", "00:18:13"],
  ["A Queen's Girl", "00:13:36"],
  ["The Winter at Queen's", "00:10:14"],
  ["The Glory and the Dream", "00:11:29"],
  ["The Reaper Whose Name Is Death", "00:12:23"],
  ["The Bend in the Road", "00:15:02"],
];

const librivoxRows = librivoxChapters.map(([title, duration], index) => ({
  sourceRowId: `LIBRIVOX-C${String(index + 1).padStart(2, "0")}`,
  rowType: "resource",
  title: `${index + 1}. ${title}`,
  detail: `재생시간 ${duration}`,
  order: index,
  locator: `Section ${index + 1}`,
}));

const passportRows = [
  ["PASSPORT-R01", "procedure", "신청 경로 선택", "방문 신청 또는 온라인 신청", "신청방법"],
  ["PASSPORT-R02", "check", "여권발급신청서", "여권발급신청서 작성 예시", "18세 이상 > 기본 구비 서류"],
  ["PASSPORT-R03", "check", "여권용 사진 1매", "6개월 이내 촬영한 사진", "18세 이상 > 기본 구비 서류"],
  ["PASSPORT-R04", "check", "신분증", "유효기간 이내의 국가기관 발행 신분 증명서", "18세 이상 > 기본 구비 서류"],
  ["PASSPORT-R05", "check", "기존 여권", "유효기간이 남아 있는 경우 준비", "18세 이상 > 기본 구비 서류"],
  ["PASSPORT-R06", "table_row", "여권 종류와 수수료", "복수여권 10년 58면 52,000원·26면 49,000원, 단수여권 1년 이내 17,000원", "발급 여권 및 수수료"],
  ["PASSPORT-R07", "reference", "대리신청 제한", "본인 직접 신청이 원칙이며 대리신청은 예외적인 경우에 한함", "유의사항"],
].map(([sourceRowId, rowType, title, detail, locator], order) => ({ sourceRowId, rowType, title, detail, locator, order }));

const washerRows = [
  ["WASHER-R01", "recurrence", "실행 시점", "40회 세탁마다 또는 세탁기가 필요 알림을 표시하면 더 일찍 실행", "Eco Drum Clean"],
  ["WASHER-R02", "reference", "드럼 비우기", "세탁물을 넣지 않고 드럼을 비운다", "Cycle guidance"],
  ["WASHER-R03", "reference", "세제·표백제 금지", "세제나 표백제를 사용하지 않는다", "Cycle guidance"],
  ["WASHER-R04", "procedure", "전원 켜기", "Power 버튼을 눌러 세탁기를 켠다", "Step 1"],
  ["WASHER-R05", "procedure", "Eco Drum Clean 선택", "다이얼에서 Eco Drum Clean을 선택한다", "Step 2"],
  ["WASHER-R06", "procedure", "세척 시작", "Start/Pause 버튼을 눌러 시작한다", "Step 3"],
  ["WASHER-R07", "reference", "모델 확인", "정확한 코스는 모델에 따라 다르므로 사용자 설명서를 확인한다", "Model note"],
].map(([sourceRowId, rowType, title, detail, locator], order) => ({ sourceRowId, rowType, title, detail, locator, order }));

const acRows = [
  ["AC-R01", "decision", "전문세척 범위", "전문 장비를 이용해 제품을 분해하고 주요 부품의 먼지·이물·오염물을 세척", "전문세척"],
  ["AC-R02", "decision", "일반세척 범위", "세척용 스프레이로 제품 외관과 필터 등 주요 부위의 먼지·이물을 제거", "일반세척"],
  ["AC-R03", "decision", "시간·비용 차이", "전문세척은 일반세척보다 시간과 비용이 더 든다", "차이점"],
  ["AC-R04", "reference", "비용 확인", "세척 비용은 에어컨 평수에 따라 달라 서비스 신청 때 안내받는다", "비용"],
  ["AC-R05", "reference", "신청 경로", "전문세척 1588-4190, 일반세척 1588-3366 또는 홈페이지 출장서비스", "신청"],
].map(([sourceRowId, rowType, title, detail, locator], order) => ({ sourceRowId, rowType, title, detail, locator, order }));

const portfolioRows = [
  ["PORTFOLIO-R01", "procedure", "팀과 아이템·기술 선정", "팀을 구성하고 CRUD·로그인·검색 기능 범위와 기술 스택을 정한다", "가이드 1"],
  ["PORTFOLIO-R02", "procedure", "기능·페이지 기획", "개발 범위를 명확히 하고 페이지와 기능을 기획한다", "가이드 2"],
  ["PORTFOLIO-R03", "procedure", "DB·API 설계", "기능 기획에 맞는 DB와 API를 설계하고 문서를 작성한다", "가이드 3"],
  ["PORTFOLIO-R04", "procedure", "일정·협업 규칙 설정", "Git Projects로 일정을 나누고 브랜치·커밋 규칙을 정한다", "가이드 4"],
  ["PORTFOLIO-R05", "procedure", "개발", "팀 개발과 코드리뷰를 진행한다", "가이드 5"],
  ["PORTFOLIO-R06", "procedure", "배포·도메인", "프로젝트를 배포하고 도메인을 설정한다", "가이드 6"],
  ["PORTFOLIO-R07", "procedure", "포트폴리오 완성", "설명·실행방법·구조·배포 방식과 데모를 정리한다", "가이드 7"],
].map(([sourceRowId, rowType, title, detail, locator], order) => ({ sourceRowId, rowType, title, detail, locator, order }));

const todoistRows = [
  ["TODOIST-R01", "reference", "Pre-production", "공개 페이지에서 확인된 상위 단계 이름", "Public phase 1"],
  ["TODOIST-R02", "reference", "Production", "공개 페이지에서 확인된 상위 단계 이름", "Public phase 2"],
  ["TODOIST-R03", "reference", "Post-production", "공개 페이지에서 확인된 상위 단계 이름", "Public phase 3"],
  ["TODOIST-R04", "reference", "Distribution", "공개 페이지에서 확인된 상위 단계 이름", "Public phase 4"],
  ["TODOIST-R05", "missing_boundary", "세부 task 행", "템플릿 복사 또는 권한 있는 원문 확보 전에는 세부 task를 볼 수 없음", "Copy template boundary"],
].map(([sourceRowId, rowType, title, detail, locator], order) => ({ sourceRowId, rowType, title, detail, locator, order }));

const vehicleRows = [
  {
    sourceRowId: "VEHICLE-R01",
    rowType: "date",
    title: "자동차검사 유효기간",
    detail: "공식 조회에서 차량별 검사 가능 시작일과 종료일을 확인해야 함",
    order: 0,
    locator: "정기검사 대상·기준·유효기간",
  },
];

const foodCraftRows = [
  {
    sourceRowId: "FOODCRAFT-R01",
    rowType: "reference",
    title: "자동 장보기 목록 기능 설명",
    detail: "제품이 제공하는 기능을 소개하는 서비스 랜딩 문구",
    order: 0,
    locator: "제품 기능 설명",
  },
];

const movingRecord = getDeepSetCase("DS05");
const nasaRecord = getDeepSetCase("DS12");
const fitRecord = getDeepSetCase("DS07");
const heatRecord = getDeepSetCase("DS01");
const remodelRecord = getDeepSetCase("DS02");
const ossuRecord = getDeepSetCase("DS10");
const packingRecord = getDeepSetCase("DS11");

const movingRows = normalizeDeepSetRows(movingRecord);
const nasaRows = normalizeDeepSetRows(nasaRecord);
const fitRows = normalizeDeepSetRows(fitRecord);
const heatRows = normalizeDeepSetRows(heatRecord);
const remodelRows = normalizeDeepSetRows(remodelRecord);
const ossuRows = normalizeDeepSetRows(ossuRecord);
const packingRows = normalizeDeepSetRows(packingRecord);

const movingItems = movingRows.flatMap((row) =>
  row.detail.split(/,\s*/).map((action, index) =>
    item(`moving-${row.sourceRowId}-${index + 1}`, action, [row.sourceRowId], {
      step: row.title,
      doneWhen: `${action} 처리를 마쳤다.`,
      schedule: {
        mode: "anchor_offset",
        anchor: "$user.movingDate",
        label: row.title,
        evidence: row.locator,
      },
    }),
  ),
);

const movingDraft = {
  title: "이사일 기준 준비 플로우",
  items: movingItems,
  fields: [field("moving-date", "이사일", [], { fieldType: "date", required: true, value: "$user.movingDate" })],
  memos: [memo("moving-recheck", "실행 전 재확인", "행정·공과금 절차는 실행 시 공식 페이지를 다시 확인한다.", [], "caution")],
  references: [],
  conditionalResponses: [],
};

const kmoocDraft = {
  title: "K-MOOC 14주 진도판",
  items: kmoocFullRows.slice(5).map((row, index) => {
    const activity = row.detail.replace("주차 활동: ", "");
    return item(`kmooc-week-${index + 1}`, row.title, [row.sourceRowId], {
      step: "14주 진도",
      intent: "record",
      completionMode: "record",
      doneWhen:
        activity === "없음"
          ? `${index + 1}주차 학습 상태를 기록했다.`
          : `${index + 1}주차 학습 상태와 ${activity} 결과를 기록했다.`,
      data: { week: index + 1, activity, status: "not_started" },
    });
  }),
  fields: [
    field("kmooc-window", "수강 기간", ["KMOOC-M01"], { value: "2026-07-01~2026-08-31" }),
    field("kmooc-progress", "전체 진도", ["KMOOC-M02"], { fieldType: "progress", value: "0/14" }),
    field("kmooc-certificate", "수료 조건", ["KMOOC-M04"], { value: "참여 80%" }),
  ],
  memos: [memo("kmooc-grade-window", "성적 입력 기간", "2026-09-01~2026-09-04", ["KMOOC-M05"])],
  references: [reference("kmooc-level", "과정 정보", "초급·수료증 과정", ["KMOOC-M03"])],
  conditionalResponses: [],
};

const librivoxDraft = {
  title: "Anne of Green Gables 38장 듣기 큐",
  items: librivoxRows.map((row, index) =>
    item(`librivox-chapter-${index + 1}`, row.title, [row.sourceRowId], {
      step: "재생 큐",
      intent: "use_resource",
      completionMode: "record",
      doneWhen: `${row.title} 재생 상태와 마지막 위치를 기록했다.`,
      data: { duration: row.detail.replace("재생시간 ", ""), status: "queued", note: "" },
    }),
  ),
  fields: [],
  memos: [],
  references: [],
  conditionalResponses: [],
};

const passportDraft = {
  title: "성인 여권 재발급 준비",
  items: [
    item("passport-route", "신청 경로 정하기", ["PASSPORT-R01"], { step: "신청 경로", intent: "decide", completionMode: "decision", doneWhen: "방문 또는 온라인 신청 경로를 선택했다." }),
    item("passport-form", "여권발급신청서 준비", ["PASSPORT-R02"], { step: "구비 서류", doneWhen: "신청서를 작성하거나 온라인 신청에서 입력을 마쳤다." }),
    item("passport-photo", "6개월 이내 여권 사진 1매 준비", ["PASSPORT-R03"], { step: "구비 서류", doneWhen: "규격에 맞는 6개월 이내 사진을 준비했다." }),
    item("passport-id", "유효한 신분증 준비", ["PASSPORT-R04"], { step: "구비 서류", doneWhen: "유효기간 안의 국가기관 발행 신분증을 준비했다." }),
    item("passport-existing", "유효기간이 남은 기존 여권 준비", ["PASSPORT-R05"], { step: "구비 서류", doneWhen: "해당하는 경우 기존 여권을 준비했다." }),
    item("passport-submit", "선택한 접수처에서 신청", ["PASSPORT-R01"], { step: "접수", doneWhen: "선택한 공식 접수처에서 신청을 제출했다." }),
  ],
  fields: [field("passport-route-field", "신청 경로", ["PASSPORT-R01"], { fieldType: "choice", required: true, options: ["방문", "온라인"] })],
  memos: [memo("passport-fee", "여권 종류·수수료", passportRows[5].detail, ["PASSPORT-R06"]), memo("passport-proxy", "대리신청 유의", passportRows[6].detail, ["PASSPORT-R07"], "caution")],
  references: [],
  conditionalResponses: [],
};

const washerDraft = {
  title: "Eco Drum Clean 알림형 루틴",
  items: [
    item("washer-empty", "드럼이 비었는지 확인", ["WASHER-R02"], { step: "실행 전", doneWhen: "드럼 안에 세탁물이 없음을 확인했다." }),
    item("washer-power", "세탁기 전원 켜기", ["WASHER-R04"], { step: "세척 실행" }),
    item("washer-select", "Eco Drum Clean 선택", ["WASHER-R05"], { step: "세척 실행" }),
    item("washer-start", "Start/Pause로 세척 시작", ["WASHER-R06"], { step: "세척 실행", recurrence: { trigger: "40회 세탁마다 또는 기기 알림 시", sourceRowIds: ["WASHER-R01"], evidence: "40회 세탁마다 또는 세탁기가 필요 알림을 표시하면 더 일찍 실행" } }),
  ],
  fields: [field("washer-trigger", "다음 실행 조건", ["WASHER-R01"], { value: "40회 세탁마다 또는 기기 알림 시" })],
  memos: [memo("washer-no-cleaner", "세척제 금지", "세제나 표백제를 사용하지 않는다.", ["WASHER-R03"], "caution")],
  references: [reference("washer-model", "모델별 확인", washerRows[6].detail, ["WASHER-R07"])],
  conditionalResponses: [],
};

const nasaCompletionByRowId = {
  "DS12-R03": "3~4명 팀을 꾸리고 끈 손잡이가 달린 컵과 무게를 늘릴 컵을 준비했다.",
  "DS12-R04": "크레인 스케치를 바탕으로 고정 베이스와 회전 구조를 만들었다.",
  "DS12-R05": "감개를 스케치한 뒤 실제 구조로 만들었다.",
  "DS12-R06": "끈과 종이클립 후크를 연결하고 바닥의 컵에 닿는지 시험했다.",
  "DS12-R07": "가벼운 컵부터 카드지를 사이에 두고 쌓아 가장 높은 탑을 완성했다.",
};

const nasaDraft = {
  title: "NASA 크레인 제작 활동",
  items: nasaRows.filter((row) => ["DS12-R03", "DS12-R04", "DS12-R05", "DS12-R06", "DS12-R07"].includes(row.sourceRowId)).map((row) => item(`nasa-${row.sourceRowId}`, row.title, [row.sourceRowId], { step: row.locator, doneWhen: nasaCompletionByRowId[row.sourceRowId] })),
  fields: [field("nasa-materials", "재료", ["DS12-R01"], { fieldType: "list", value: nasaRows[0].detail })],
  memos: [memo("nasa-reflection", "도전 질문 기록", nasaRows[7].detail, ["DS12-R08"])],
  references: [reference("nasa-safety", "가위 안전", nasaRows[1].detail, ["DS12-R02"])],
  conditionalResponses: [],
};

const fitCompletionByRowId = {
  "DS07-R01": "온라인 회원가입을 마치고 결과 확인 계정을 사용할 수 있다.",
  "DS07-R02": "사전 신체활동 질문 응답을 공식 서비스에 제출했다.",
  "DS07-R03": "온라인·전화·방문 중 예약 방법을 골라 체력측정을 신청했다.",
  "DS07-R04": "신청한 체력인증센터에 방문했다.",
  "DS07-R05": "센터에서 체력측정을 마쳤다.",
  "DS07-R06": "측정 결과에 대한 공식 평가를 받았다.",
  "DS07-R07": "공식 인증서를 발급받았다.",
  "DS07-R09": "공식 결과에서 이어서 관리할 항목을 확인했다.",
};

const fitDraft = {
  title: "국민체력100 이용 절차",
  items: fitRows.filter((row) => !["DS07-R08"].includes(row.sourceRowId)).map((row) => item(`fit-${row.sourceRowId}`, row.title, [row.sourceRowId], { step: Number(row.order) < 4 ? "신청·방문" : "측정·결과", doneWhen: fitCompletionByRowId[row.sourceRowId] })),
  fields: [field("fit-booking-route", "예약 방법", ["DS07-R03"], { fieldType: "choice", options: ["온라인", "전화", "방문"] })],
  memos: [],
  references: [reference("fit-prescription", "운동처방 경계", "운동 내용은 FlowMe가 만들지 않고 기관이 제공한 공식 처방만 연결한다.", ["DS07-R08"])],
  conditionalResponses: [],
};

const acDraft = {
  title: "시스템 에어컨 세척 방식 결정 메모",
  items: [item("ac-decision", "전문세척 또는 일반세척 선택", ["AC-R01", "AC-R02", "AC-R03", "AC-R04"], { step: "비교·결정", intent: "decide", completionMode: "decision", doneWhen: "필요한 세척 범위와 비용 확인 필요성을 비교해 한 방식을 선택했다." })],
  fields: [
    field("ac-pro", "전문세척", ["AC-R01"], { value: acRows[0].detail }),
    field("ac-general", "일반세척", ["AC-R02"], { value: acRows[1].detail }),
    field("ac-tradeoff", "시간·비용", ["AC-R03"], { value: acRows[2].detail }),
  ],
  memos: [memo("ac-quote", "비용은 신청 때 확인", acRows[3].detail, ["AC-R04"]), memo("ac-contact", "신청 경로", acRows[4].detail, ["AC-R05"])],
  references: [],
  conditionalResponses: [],
};

const heatDraft = {
  title: "폭염 농작업 조건부 대응 카드",
  items: [
    item("heat-before", "작업 전 온도·시간·물·그늘·보호구 계획 공유", ["DS01-R02", "DS01-R03", "DS01-R04"], { step: "작업 전", doneWhen: "작업 시작 전에 체감온도·작업시간 조정·물·그늘·보호구 계획을 팀과 공유했다." }),
    item("heat-after", "작업 후 수분·샤워·서늘한 곳 회복", ["DS01-R09"], { step: "작업 후", doneWhen: "작업 후 수분을 보충하고 샤워한 뒤 시원한 곳에서 쉬었다." }),
  ],
  fields: [],
  memos: [],
  references: [
    reference("heat-thresholds", "폭염 기준", heatRows[0].detail, ["DS01-R01"]),
    reference("heat-owner", "사업주 확인 구간", heatRows[9].detail, ["DS01-R10"]),
  ],
  conditionalResponses: [
    conditional("heat-hydration", "작업 중", "20분 간격으로 물을 마신다", ["DS01-R05"]),
    conditional("heat-stop", "위험 단계 또는 이상 증상이 나타남", "작업을 중지하고 그늘에서 쉬며 동료 상태를 확인한다", ["DS01-R06", "DS01-R07"]),
    conditional("heat-119", "의식이 없음", "즉시 119에 신고한다", ["DS01-R08"], "119"),
  ],
};

const remodelDraft = {
  title: "리모델링 계약 비교표",
  items: [item("remodel-decision", "계약 전 누락·불명확 항목 판정", remodelRows.map((row) => row.sourceRowId), { step: "계약 전 비교", intent: "decide", completionMode: "decision", doneWhen: "10개 기준의 확인값과 보완 요청을 기록하고 계약 진행 여부를 결정했다." })],
  fields: remodelRows.map((row) => field(`remodel-${row.sourceRowId}`, row.title, [row.sourceRowId], { fieldType: "status", required: true, options: ["확인", "보완 필요", "해당 없음"] })),
  memos: [memo("remodel-legal", "법률 검토 경계", "이 표는 계약 검토를 돕는 내부 초안이며 법률 자문을 대신하지 않는다.", [], "caution")],
  references: [],
  conditionalResponses: [],
};

const ossuDraft = {
  title: "OSSU 시작 구간 진도표",
  items: ossuRows.map((row, index) => item(`ossu-course-${index + 1}`, row.title, [row.sourceRowId], { step: index === 0 ? "Intro CS" : "Core Programming", intent: "record", completionMode: "record", doneWhen: `${row.title}의 등록·진행·완료 상태와 선수조건 충족 여부를 기록했다.`, data: { sourceDetail: row.detail, status: "not_started" } })),
  fields: [],
  memos: [],
  references: [],
  conditionalResponses: [],
};

const packingDraft = {
  title: "여행 휴대품·서류 체크",
  items: packingRows.map((row) => item(`packing-${row.sourceRowId}`, row.title, [row.sourceRowId], { step: row.order < 5 ? "휴대 수하물" : "여행 서류", doneWhen: `${row.detail}을 목적지 조건에 맞게 준비했다.` })),
  fields: [],
  memos: [memo("packing-localize", "목적지 규정 재확인", "항공사·입국 규정은 출발 전에 공식 출처에서 다시 확인한다.", [], "caution")],
  references: [],
  conditionalResponses: [],
};

const vehicleDraft = {
  title: "자동차검사 공식 날짜창",
  items: [item("vehicle-book", "공식 검사기간 확인 후 방문일 정하기", ["VEHICLE-R01"], { step: "검사 일정", doneWhen: "공식 조회에서 검사 가능 기간을 확인하고 그 안의 방문일을 정했다.", schedule: { mode: "date_window", start: "$user.inspectionWindowStart", end: "$user.inspectionWindowEnd", evidence: "VEHICLE-R01" } })],
  fields: [
    field("vehicle-window-start", "검사 가능 시작일", ["VEHICLE-R01"], { fieldType: "date", required: true, value: "$user.inspectionWindowStart" }),
    field("vehicle-window-end", "검사 가능 종료일", ["VEHICLE-R01"], { fieldType: "date", required: true, value: "$user.inspectionWindowEnd" }),
  ],
  memos: [memo("vehicle-no-guess", "공식 조회 필요", "FlowMe가 차량별 날짜를 추정하지 않고 사용자가 공식 조회 결과를 입력한다.", ["VEHICLE-R01"], "caution")],
  references: [],
  conditionalResponses: [],
};

const portfolioDraft = {
  title: "개발 포트폴리오 7단계 보드",
  items: portfolioRows.map((row, index) => item(`portfolio-phase-${index + 1}`, row.title, [row.sourceRowId], { step: index < 2 ? "기획" : index < 5 ? "설계·개발" : "배포·정리", intent: "record", completionMode: "record", doneWhen: `${row.detail} 결과물과 상태를 기록했다.`, data: { phase: index + 1, status: "not_started", evidence: "" } })),
  fields: [],
  memos: [memo("portfolio-timebox", "원문 시간상자", "기획·설계 1주, 개발 3주라는 원문 가이드는 예시이며 사용자 일정 확정 전 실제 마감일을 만들지 않는다.", ["PORTFOLIO-R02", "PORTFOLIO-R05"])],
  references: [],
  conditionalResponses: [],
};

const noneDraft = { title: null, items: [], fields: [], memos: [], references: [], conditionalResponses: [] };

const makeCase = ({
  caseId,
  order,
  lane,
  controlKind = "none",
  title,
  shortTitle,
  source,
  userJob,
  claimedScope,
  rows,
  completeness,
  landmarks,
  missingRows = [],
  classification,
  reviewState,
  feasibility,
  draft,
  roleOverrides = {},
  forbiddenInferences = [],
  artifactReason,
  expectedUse,
  essentialProjectionFields = {},
  beforeProblem,
}) => ({
  caseId,
  order,
  lane,
  controlKind,
  title,
  shortTitle,
  source,
  userJob,
  claimedScope,
  sourceRows: rows,
  sourceCompleteness: completeness,
  landmarks,
  missingRows,
  expected: {
    classification: { ...classification, access: { providerType: source.providerType, discoveryAccess: source.access, rowAccess: source.rowAccess, sourceFormat: source.format }, rights: { basis: source.rightsBasis, allowedUse: source.allowedUse, reviewStatus: source.rightsReview }, review: reviewState },
    feasibility,
    artifactReason,
    expectedUse,
    forbiddenInferences,
    essentialProjectionFields: Object.fromEntries(["calendar", "checklist", "todo", "sheet", "memo"].map((key) => [key, essentialProjectionFields[key] ?? []])),
  },
  draft,
  roles: rolesFromDraft(rows, draft, roleOverrides),
  beforeProblem,
});

const ready = (options = {}) => ({ generationState: "completed", outcome: "proposal", conversionReadiness: options.readiness ?? "ready_second_wave", errorCode: null, executableAllowed: true, publicExportAllowed: options.publicExportAllowed ?? false, blockers: options.blockers ?? [] });
const blocked = ({ readiness = "source_import_required", errorCode, outcome = "no_proposal", blockers = [], generationState = "completed" }) => ({ generationState, outcome, conversionReadiness: readiness, errorCode, executableAllowed: false, publicExportAllowed: false, blockers });

export const CASE_SET_VERSION = "output-quality-v2-cases-2026-07-20.1";
export const GOLD_CONTRACT_VERSION = "gold-source-contract-v2.1";
export const OUTPUT_SCHEMA_VERSION = "flowme-url-to-flow-output-envelope-v2";
export const TAXONOMY_VERSION = "flowme-taxonomy-v1.1";

export const cases = [
  makeCase({
    caseId: "OQ-C01-MOVING", order: 1, lane: "core_positive", title: "이사 준비 체크리스트", shortTitle: "이사 D-day", source: makeSource({ sourceId: "source-easylaw-moving", title: movingRecord.sourceSnapshot.title, publisher: movingRecord.sourceSnapshot.publisher, url: movingRecord.sourceSnapshot.sourceUrl, evidence: "공식 페이지의 2주 전·1주 전·2~4일 전·전날·당일·이사 후 6구간" }), userJob: "이사일을 기준으로 해야 할 일을 날짜에 배치한다.", claimedScope: "공식 체크리스트의 6개 상대일 구간", rows: movingRows, completeness: "complete", landmarks: ["2주 전", "당일", "이사 후"], classification: coreClassification({ lifeArea: "home_living", tags: ["이사", "D-day"], sourceShape: "date_offsets", executionPattern: "date_preparation", artifact: "calendar", secondaryArtifacts: ["checklist"] }), reviewState: review({}), feasibility: ready(), draft: movingDraft, roleOverrides: Object.fromEntries(movingRows.map((row) => [row.sourceRowId, { role: "item", targetIds: movingItems.filter((entry) => entry.sourceRowIds.includes(row.sourceRowId)).map((entry) => entry.id), reason: "상대일 구간의 실행 행동을 Calendar Item으로 펼침" }])), forbiddenInferences: ["이사일 입력 전 실제 날짜 생성", "원문에 없는 업체·가격 추천"], artifactReason: "이사일이 바뀌면 모든 실행일이 함께 움직여야 하므로 Calendar가 주 결과물이다.", expectedUse: "이사일 1개 입력 → 실제 날짜 미리보기 → Calendar 저장", essentialProjectionFields: { calendar: ["title", "anchorOffset", "sourceUrl"], checklist: ["group", "title", "completion"] }, beforeProblem: "기존 hybrid는 일정과 체크 중 무엇이 핵심인지 숨겼다." }),
  makeCase({
    caseId: "OQ-C02-KMOOC-FULL", order: 2, lane: "core_positive", title: "K-MOOC Introduction to Data Analysis", shortTitle: "K-MOOC 14주", source: makeSource({ sourceId: "source-kmooc-data-analysis", title: "Introduction to Data Analysis", publisher: "K-MOOC", url: "https://www.kmooc.kr/view/course/detail/20097", format: "course", providerType: "education_provider", evidence: "공개 과정 페이지와 강의계획 이미지의 14개 주차 행을 2026-07-20 확인" }), userJob: "14개 주차를 펼쳐 놓고 수강·활동 진도를 기록한다.", claimedScope: "과정 메타데이터 5행과 강의계획 이미지 14행", rows: kmoocFullRows, completeness: "complete", landmarks: ["14주", "1주차 데이터 리터러시", "14주차 데이터 분석 보고서 작성법"], classification: coreClassification({ lifeArea: "study_reading", tags: ["K-MOOC", "데이터 분석", "14주 진도"], sourceShape: "lesson_rows", secondarySourceShapes: ["date_window", "table_rows"], executionPattern: "progress_tracking", secondaryExecutionPatterns: ["resource_queue"], artifact: "sheet", secondaryArtifacts: ["todo", "calendar"] }), reviewState: review({ rights: "restricted" }), feasibility: ready(), draft: kmoocDraft, forbiddenInferences: ["이미지에 없는 세부 차시", "주차별 마감일", "평가 배점", "주차별 학습시간"], artifactReason: "핵심 상태는 14행의 주차·활동·진도이며 한 번 체크하고 사라지는 목록이 아니어서 Sheet가 주 결과물이다.", expectedUse: "14주 전체를 한 화면에서 보고 상태·퀴즈/과제/토론 결과 기록", essentialProjectionFields: { sheet: ["week", "topic", "activity", "status"], todo: ["week", "topic", "activity"], calendar: ["courseWindow"] }, beforeProblem: "과거 예시는 2주 샘플만 만들거나 phase_lifecycle로 뭉쳐 실제 진도 관리 가치를 잃었다." }),
  makeCase({
    caseId: "OQ-C03-LIBRIVOX", order: 3, lane: "core_positive", title: "Anne of Green Gables, Version 5", shortTitle: "오디오북 38장", source: makeSource({ sourceId: "source-librivox-anne-v5", title: "Anne of Green Gables, Version 5", publisher: "LibriVox", url: "https://librivox.org/anne-of-green-gables-version-5-by-lucy-maud-montgomery/", locale: "en", providerType: "open_knowledge", format: "audio", rightsBasis: "public_domain", rightsReview: "approved", allowedUse: ["link_metadata", "personal_transform", "internal_review", "public_derived"], evidence: "공개 페이지의 38개 section 제목과 재생시간 전체 확인" }), userJob: "38개 장을 순서대로 듣고 마지막 위치와 완료 상태를 관리한다.", claimedScope: "공개된 38개 chapter 행", rows: librivoxRows, completeness: "complete", landmarks: ["Chapter 1", "Chapter 20", "Chapter 38"], classification: coreClassification({ lifeArea: "study_reading", tags: ["오디오북", "영어 듣기"], sourceShape: "resource_collection", executionPattern: "resource_queue", secondaryExecutionPatterns: ["progress_tracking"], artifact: "sheet", secondaryArtifacts: ["todo"] }), reviewState: review({ rights: "approved", promotion: "internal_canary" }), feasibility: ready(), draft: librivoxDraft, forbiddenInferences: ["원문에 없는 청취 날짜", "장별 학습 목표·퀴즈"], artifactReason: "38개 자료의 순서·길이·재생 상태를 잃지 않으려면 Sheet가 주 결과물이다.", expectedUse: "다음 장 재생 → 마지막 위치 기록 → 완료 후 다음 장", essentialProjectionFields: { sheet: ["order", "chapter", "duration", "status", "note"], todo: ["order", "chapter", "duration"] }, beforeProblem: "단순 체크리스트는 재생시간과 마지막 위치를 잃는다." }),
  makeCase({
    caseId: "OQ-C04-PASSPORT", order: 4, lane: "core_positive", title: "18세 이상 여권 만료 재발급", shortTitle: "성인 여권 재발급", source: makeSource({ sourceId: "source-passport-adult-renewal", title: "유효기간 만료에 따른 재발급", publisher: "외교부 여권안내", url: "https://www.passport.go.kr/home/kor/contents.do?menuPos=7", providerType: "government_public", evidence: "18세 이상 섹션의 신청 경로·구비서류·수수료·유의사항만 범위로 고정" }), userJob: "성인 본인이 여권 만료 재발급에 필요한 준비를 마치고 신청한다.", claimedScope: "18세 이상 신청자 섹션; 미성년·분실·훼손은 제외", rows: passportRows, completeness: "complete", landmarks: ["18세 이상", "사진 1매", "방문 또는 온라인 신청"], classification: coreClassification({ lifeArea: "money_admin_purchase", tags: ["여권", "재발급", "구비서류"], sourceShape: "checklist_rows", secondarySourceShapes: ["decision_criteria"], executionPattern: "ordered_procedure", artifact: "todo", secondaryArtifacts: ["checklist", "memo"] }), reviewState: review({ rights: "restricted" }), feasibility: ready(), draft: passportDraft, forbiddenInferences: ["18세 미만 서류 혼합", "분실·훼손 절차 혼합", "임의 예약일·발급일"], artifactReason: "한 번의 신청을 끝내기 위한 다음 행동 묶음이므로 Todo가 주 결과물이고, 서류는 그 안의 checklist다.", expectedUse: "신청 경로 선택 → 서류 준비 → 공식 접수", essentialProjectionFields: { todo: ["title", "doneWhen", "sourceUrl"], checklist: ["document", "condition"] }, beforeProblem: "대상 범위를 나누지 않으면 성인·미성년 서류가 섞여 위험하다." }),
  makeCase({
    caseId: "OQ-C05-WASHER", order: 5, lane: "core_positive", title: "Samsung Eco Drum Clean", shortTitle: "세탁조 알림 루틴", source: makeSource({ sourceId: "source-samsung-washer-maintenance", title: "Washing Machine Maintenance: tips to keep your machine running smoothly", publisher: "Samsung UK Support", url: "https://www.samsung.com/uk/support/home-appliances/washing-machine-maintenance-tips-to-keep-your-machine-running-smoothly/", locale: "en-GB", providerType: "brand_official", evidence: "Eco Drum Clean 구간의 실행 조건·3단계·금지사항·모델 경계 확인" }), userJob: "40회 세탁 또는 기기 알림 때 안전한 세탁조 청소 task를 실행한다.", claimedScope: "전체 유지관리 문서 중 Eco Drum Clean 구간", rows: washerRows, completeness: "complete", landmarks: ["every 40 washes", "no detergent or bleach", "3 steps"], classification: coreClassification({ lifeArea: "home_living", tags: ["세탁기", "세탁조", "유지관리"], sourceShape: "recurrence_rule", secondarySourceShapes: ["procedure_rows"], executionPattern: "repeating_routine", secondaryExecutionPatterns: ["ordered_procedure"], artifact: "todo", secondaryArtifacts: ["checklist", "memo"] }), reviewState: review({ locale: "adaptation_required", blockers: ["locale_review_required"] }), feasibility: ready({ readiness: "ready_for_internal_canary", blockers: ["locale_review_required"] }), draft: washerDraft, forbiddenInferences: ["매월 반복으로 바꾸기", "세척제 추천", "모든 모델에 동일 코스가 있다고 단정"], artifactReason: "매번 체크하는 상시 목록이 아니라 조건이 충족될 때 생기는 하나의 반복 Todo가 핵심이다.", expectedUse: "40회 또는 기기 알림 → 4개 실행 task → 완료 후 다음 조건 대기", essentialProjectionFields: { todo: ["trigger", "title", "warning"], checklist: ["order", "title", "warning"] }, beforeProblem: "‘매월 체크리스트’로 만들면 원문의 조건과 모델 경계를 왜곡한다." }),
  makeCase({
    caseId: "OQ-C06-NASA", order: 6, lane: "core_positive", title: nasaRecord.sourceSnapshot.title, shortTitle: "NASA 크레인", source: makeSource({ sourceId: "source-nasa-crane", title: nasaRecord.sourceSnapshot.title, publisher: nasaRecord.sourceSnapshot.publisher, url: nasaRecord.sourceSnapshot.sourceUrl, locale: "en-US", providerType: "government_public", evidence: "Materials·Safety·Preparation·Procedure·Challenge Questions 8행" }), userJob: "팀 활동에서 재료·가위 안전·제작·시험 순서를 빠뜨리지 않는다.", claimedScope: "NASA 활동 페이지의 재료·안전·절차·성찰 전체", rows: nasaRows, completeness: "complete", landmarks: ["Materials List", "Safety", "Procedure 7-11"], classification: coreClassification({ lifeArea: "hobby_pet", secondaryLifeAreas: ["study_reading"], tags: ["STEM", "크레인 만들기"], sourceShape: "procedure_rows", secondarySourceShapes: ["checklist_rows"], executionPattern: "ordered_procedure", artifact: "checklist", secondaryArtifacts: ["memo"] }), reviewState: review({ safety: "passed_with_boundary", locale: "adaptation_required", blockers: ["locale_review_required"] }), feasibility: ready({ readiness: "ready_for_internal_canary", blockers: ["locale_review_required"] }), draft: nasaDraft, roleOverrides: { "DS12-R01": { role: "field", targetIds: ["nasa-materials"], reason: "재료는 완료 행동이 아니라 준비 목록 필드" }, "DS12-R02": { role: "reference", targetIds: ["nasa-safety"], reason: "가위 안전은 사전 완료 체크가 아니라 활동 내내 유지할 기준" }, "DS12-R08": { role: "memo", targetIds: ["nasa-reflection"], reason: "도전 질문의 답은 완료 체크가 아니라 기록" } }, forbiddenInferences: ["원문에 없는 제작 재료·치수", "성인 감독을 완료 체크로 축약"], artifactReason: "순서가 있는 제작·시험 행동이 중심이므로 Checklist가 주 결과물이다.", expectedUse: "재료 확인 → 안전 기준 고정 → 제작·시험 순서 실행 → 성찰 기록", essentialProjectionFields: { checklist: ["order", "title", "safetyReference"], memo: ["challengeQuestions"] }, beforeProblem: "재료·안전·성찰까지 모두 체크박스로 만들면 역할이 무너진다." }),
  makeCase({
    caseId: "OQ-C07-FIT100", order: 7, lane: "core_positive", title: fitRecord.sourceSnapshot.title, shortTitle: "국민체력100", source: makeSource({ sourceId: "source-fit100", title: fitRecord.sourceSnapshot.title, publisher: fitRecord.sourceSnapshot.publisher, url: fitRecord.sourceSnapshot.sourceUrl, providerType: "public_institution", evidence: "공식 이용 절차 STEP 01~09" }), userJob: "체력측정 신청부터 공식 결과·처방 연결까지 순서대로 진행한다.", claimedScope: "공식 이용 절차 9단계", rows: fitRows, completeness: "complete", landmarks: ["STEP 01", "STEP 05", "STEP 09"], classification: coreClassification({ lifeArea: "health_fitness", tags: ["체력측정", "공식 서비스"], sourceShape: "procedure_rows", executionPattern: "phase_lifecycle", secondaryExecutionPatterns: ["ordered_procedure"], artifact: "checklist", secondaryArtifacts: ["todo", "memo"] }), reviewState: review({ safety: "passed_with_boundary" }), feasibility: ready(), draft: fitDraft, roleOverrides: { "DS07-R08": { role: "reference", targetIds: ["fit-prescription"], reason: "FlowMe가 처방을 생성하지 않고 기관 처방을 연결하는 경계" } }, forbiddenInferences: ["FlowMe 운동 처방 생성", "문진 통과 판정", "측정 결과 예측"], artifactReason: "기관 서비스의 단계 완료 여부를 순서대로 확인하므로 Checklist가 주 결과물이다.", expectedUse: "회원가입·문진·예약·방문·측정·결과를 단계별 완료", essentialProjectionFields: { checklist: ["step", "title", "doneWhen", "officialBoundary"], memo: ["prescriptionBoundary"] }, beforeProblem: "‘건강 루틴’으로 오해하면 기관 판정과 처방을 FlowMe가 대신 만들게 된다." }),
  makeCase({
    caseId: "OQ-C08-AC-DECISION", order: 8, lane: "core_positive", title: "시스템 에어컨 세척 서비스 안내", shortTitle: "에어컨 세척 선택", source: makeSource({ sourceId: "source-samsung-ac-service", title: "시스템 에어컨 세척 서비스 안내", publisher: "삼성전자서비스", url: "https://www.samsungsvc.co.kr/video/28612", providerType: "brand_official", format: "video", evidence: "전문세척/일반세척 범위·비용/시간·신청 경로 비교 구간" }), userJob: "필요한 세척 범위를 비교해 전문세척 또는 일반세척을 선택한다.", claimedScope: "전문세척과 일반세척 차이점 구간", rows: acRows, completeness: "complete", landmarks: ["전문세척", "일반세척", "시간과 비용"], classification: coreClassification({ lifeArea: "home_living", secondaryLifeAreas: ["money_admin_purchase"], tags: ["에어컨", "서비스 선택"], sourceShape: "decision_criteria", executionPattern: "compare_decide", artifact: "memo", secondaryArtifacts: ["sheet", "todo"] }), reviewState: review({}), feasibility: ready(), draft: acDraft, roleOverrides: { "AC-R01": { role: "field", targetIds: ["ac-pro"], reason: "비교표의 전문세척 값" }, "AC-R02": { role: "field", targetIds: ["ac-general"], reason: "비교표의 일반세척 값" }, "AC-R03": { role: "field", targetIds: ["ac-tradeoff"], reason: "비교 판단 기준" }, "AC-R04": { role: "memo", targetIds: ["ac-quote"], reason: "정확한 비용은 신청 때 확인하는 메모" }, "AC-R05": { role: "memo", targetIds: ["ac-contact"], reason: "선택 후 사용할 신청 정보" } }, forbiddenInferences: ["정확한 가격 추정", "사용자 에어컨 상태 진단", "전문세척이 항상 낫다고 추천"], artifactReason: "한 번의 선택과 그 근거·연락처를 함께 남기는 결정 Memo가 주 결과물이다.", expectedUse: "범위 비교 → 가격은 문의 표시 → 선택 근거와 신청 경로 저장", essentialProjectionFields: { memo: ["options", "tradeoff", "unknownCost", "contact"], sheet: ["option", "scope", "tradeoff"] }, beforeProblem: "체크리스트로 만들면 아직 선택하지 않은 두 서비스를 모두 해야 할 일처럼 보인다." }),
  makeCase({
    caseId: "OQ-B01-HEAT", order: 9, lane: "core_boundary", title: heatRecord.sourceSnapshot.title, shortTitle: "농사로 폭염 대응", source: makeSource({ sourceId: "source-nongsaro-heat", title: heatRecord.sourceSnapshot.title, publisher: heatRecord.sourceSnapshot.publisher, url: heatRecord.sourceSnapshot.sourceUrl, providerType: "government_public", evidence: "작업 전·중·후와 중지·119 조건 10행" }), userJob: "폭염 농작업 때 사전 준비와 중지·응급 조건을 놓치지 않는다.", claimedScope: "가이드의 10개 역할 행", rows: heatRows, completeness: "complete", landmarks: ["작업 전", "위험 단계 작업중지", "의식이 없으면 119"], classification: coreClassification({ lifeArea: "work_career", secondaryLifeAreas: ["health_fitness"], tags: ["농작업", "온열질환", "조건부 대응"], sourceShape: "narrative_guidance", secondarySourceShapes: ["checklist_rows"], executionPattern: "phase_lifecycle", secondaryExecutionPatterns: ["ordered_procedure"], artifact: "memo", secondaryArtifacts: ["checklist"] }), reviewState: review({ readiness: "hold", safety: "restricted", rights: "restricted", promotion: "research_only", blockers: ["safety_review_required", "editorial_review_required"] }), feasibility: ready({ readiness: "hold", blockers: ["safety_review_required", "editorial_review_required"] }), draft: heatDraft, roleOverrides: { "DS01-R01": { role: "reference", targetIds: ["heat-thresholds"], reason: "온도 기준은 체크 완료가 아니라 판단 참고" }, "DS01-R02": { role: "item", targetIds: ["heat-before"], reason: "작업 전 실제 확인 행동" }, "DS01-R03": { role: "item", targetIds: ["heat-before"], reason: "작업 전 실제 계획 행동" }, "DS01-R04": { role: "item", targetIds: ["heat-before"], reason: "작업 전 실제 준비 행동" }, "DS01-R05": { role: "conditional_response", targetIds: ["heat-hydration"], reason: "작업 중일 때 적용되는 조건부 행동" }, "DS01-R06": { role: "conditional_response", targetIds: ["heat-stop"], reason: "위험 단계에만 적용되는 중지 조건" }, "DS01-R07": { role: "conditional_response", targetIds: ["heat-stop"], reason: "이상 증상 발생 시 대응 조건" }, "DS01-R08": { role: "conditional_response", targetIds: ["heat-119"], reason: "의식 없음에만 적용되는 응급 대응" }, "DS01-R09": { role: "item", targetIds: ["heat-after"], reason: "작업 후 실제 회복 행동" }, "DS01-R10": { role: "reference", targetIds: ["heat-owner"], reason: "사업주 책임 참고 구간" } }, forbiddenInferences: ["매일 반복 일정", "실시간 날씨·특보 자동 판정", "응급 조건을 미리 완료 체크", "진단·치료 제안"], artifactReason: "사용자는 두 개의 실행 행동보다 조건·중지·119 기준을 계속 봐야 하므로 Memo형 대응 카드가 주 결과물이다.", expectedUse: "작업 전 1회 확인 → 작업 중 조건 카드 참조 → 필요 시 중지·119 → 작업 후 회복", essentialProjectionFields: { memo: ["beforeAction", "conditions", "stopRule", "emergency", "afterAction"], checklist: ["beforeAction", "afterAction"] }, beforeProblem: "기존 repeating checklist는 위기 조건까지 매번 체크하게 만들어 사용 의미가 어색했다." }),
  makeCase({
    caseId: "OQ-B02-KMOOC-META", order: 10, lane: "core_boundary", title: "K-MOOC 메타데이터만 확보", shortTitle: "K-MOOC 불완전 A", source: makeSource({ sourceId: "source-kmooc-meta-only", title: "Introduction to Data Analysis", publisher: "K-MOOC", url: "https://www.kmooc.kr/view/course/detail/20097", format: "course", providerType: "education_provider", rowAccess: "partial", evidence: "강의계획 이미지 행을 제외하고 메타데이터 5행만 확보한 A 조건" }), userJob: "14주 진도를 관리한다.", claimedScope: "과정 메타데이터만; 14주 주차 행은 미확보", rows: [...kmoocBaseRows, { sourceRowId: "KMOOC-A-MISSING", rowType: "missing_boundary", title: "14개 주차 행", detail: "강의계획 이미지 원문을 확보하지 못한 상태", order: 5, locator: "강의계획 이미지" }], completeness: "partial", landmarks: ["14주 과정 메타데이터", "주차 행 미확보"], missingRows: ["14개 주차 제목과 활동"], classification: coreClassification({ lifeArea: "study_reading", tags: ["K-MOOC", "데이터 분석"], sourceShape: null, executionPattern: "progress_tracking", artifact: "sheet", status: "blocked_missing_source" }), reviewState: review({ sourceRowStatus: "partial", readiness: "source_import_required", rights: "pending", promotion: "research_only", blockers: ["source_incomplete", "source_import_required"] }), feasibility: blocked({ errorCode: "source_rows_incomplete", blockers: ["source_incomplete", "source_import_required"] }), draft: noneDraft, roleOverrides: Object.fromEntries([...kmoocBaseRows.map((row) => [row.sourceRowId, { role: "reference", targetIds: [], reason: "메타데이터는 보존하지만 주차 진도를 대신하지 못함" }]), ["KMOOC-A-MISSING", { role: "omission", targetIds: [], reason: "원문 주차 행이 실제로 확보되지 않음" }]]), forbiddenInferences: ["14개 가짜 주차", "메타데이터를 전체 강의 행으로 승격"], artifactReason: "완전한 원문이라면 Sheet이지만 현재는 결과물을 만들지 않는다.", expectedUse: "강의계획 이미지/텍스트를 가져오라는 요청만 표시", beforeProblem: "‘14주’ 숫자만 보고 14개 행을 생성하면 완전해 보이는 허위 Flow가 된다." }),
  makeCase({
    caseId: "OQ-B03-REMODEL", order: 11, lane: "core_boundary", title: remodelRecord.sourceSnapshot.title, shortTitle: "리모델링 계약", source: makeSource({ sourceId: "source-ohouse-remodel", title: remodelRecord.sourceSnapshot.title, publisher: remodelRecord.sourceSnapshot.publisher, url: remodelRecord.sourceSnapshot.sourceUrl, providerType: "editorial_media", rightsBasis: "unknown", rightsReview: "pending", evidence: "공개된 계약 확인 10개 행; 법률·권리 독립 검토 필요" }), userJob: "리모델링 계약 전에 10개 계약 기준을 비교하고 보완 요청을 정한다.", claimedScope: "원문 체크리스트 10행", rows: remodelRows, completeness: "complete", landmarks: ["업체 정보", "추가 비용", "계약 해지와 위약금"], classification: coreClassification({ lifeArea: "money_admin_purchase", secondaryLifeAreas: ["home_living"], tags: ["리모델링", "계약"], sourceShape: "decision_criteria", secondarySourceShapes: ["table_rows"], executionPattern: "compare_decide", artifact: "sheet", secondaryArtifacts: ["memo", "checklist"] }), reviewState: review({ readiness: "hold", safety: "not_required", rights: "pending", promotion: "research_only", blockers: ["rights_permission_required", "editorial_review_required"] }), feasibility: ready({ readiness: "hold", blockers: ["rights_permission_required", "editorial_review_required"] }), draft: remodelDraft, roleOverrides: Object.fromEntries(remodelRows.map((row) => [row.sourceRowId, { role: "field", targetIds: [`remodel-${row.sourceRowId}`], reason: "계약 비교표의 독립 판정 열" }])), forbiddenInferences: ["법률적 안전 보증", "원문에 없는 표준 문구", "권리 허가 없이 공개 파생물 배포"], artifactReason: "10개 기준별 확인값과 보완 요청을 나란히 비교해야 하므로 Sheet가 주 결과물이다.", expectedUse: "내부 개인 검토표는 생성하되 공개·배포는 권리/편집 검토 전 차단", essentialProjectionFields: { sheet: ["criterion", "status", "note", "sourceUrl"], memo: ["decision", "legalBoundary"] }, beforeProblem: "원문 완전성과 공개 허가는 별개인데 과거에는 한 gate처럼 섞였다." }),
  makeCase({
    caseId: "OQ-B04-TODOIST", order: 12, lane: "core_boundary", title: "Todoist Podcast Workflow template", shortTitle: "Todoist 로그인 경계", source: makeSource({ sourceId: "source-todoist-podcast", title: "Podcast Workflow template", publisher: "Todoist", url: "https://www.todoist.com/templates/podcast-workflow", providerType: "brand_official", format: "template", rowAccess: "metadata_only", rightsBasis: "provider_terms", rightsReview: "pending", evidence: "공개 페이지에는 4개 phase 이름만 있고 세부 task는 템플릿 복사/권한 뒤에 확인" }), userJob: "팟캐스트 제작의 실제 task를 프로젝트로 가져온다.", claimedScope: "공개 phase 이름 4개와 세부 task 접근 경계", rows: todoistRows, completeness: "metadata_only", landmarks: ["Pre-production", "Distribution", "세부 task 미확보"], missingRows: ["각 phase의 task·담당자·마감"], classification: coreClassification({ lifeArea: "work_career", tags: ["팟캐스트", "제작"], sourceShape: null, executionPattern: "phase_lifecycle", artifact: "todo", status: "blocked_missing_source" }), reviewState: review({ sourceRowStatus: "metadata_only", readiness: "source_import_required", rights: "pending", promotion: "research_only", blockers: ["source_import_required", "account_or_entitlement_required"] }), feasibility: blocked({ errorCode: "source_import_required", blockers: ["source_import_required", "account_or_entitlement_required"] }), draft: noneDraft, roleOverrides: Object.fromEntries(todoistRows.map((row) => [row.sourceRowId, { role: row.sourceRowId === "TODOIST-R05" ? "omission" : "reference", targetIds: [], reason: row.sourceRowId === "TODOIST-R05" ? "세부 원문을 확보하지 못함" : "상위 phase 이름은 세부 task를 대신할 수 없는 참고 정보" }])), forbiddenInferences: ["phase 아래 task·담당자·마감 추측", "사용자 승인 없는 템플릿 복사"], artifactReason: "원문을 확보하면 Todo가 자연스럽지만 현재는 결과물을 만들지 않는다.", expectedUse: "사용자에게 권한 있는 템플릿 복사/파일 가져오기를 요청", beforeProblem: "공개 랜딩과 로그인 후 실제 원문을 같은 것으로 보면 빈 껍데기 Flow가 생긴다." }),
  makeCase({
    caseId: "OQ-P01-OSSU", order: 13, lane: "positive_control", controlKind: "structure", title: ossuRecord.sourceSnapshot.title, shortTitle: "OSSU 시작 구간", source: makeSource({ sourceId: "source-ossu", title: ossuRecord.sourceSnapshot.title, publisher: ossuRecord.sourceSnapshot.publisher, url: ossuRecord.sourceSnapshot.sourceUrl, locale: "en", providerType: "open_knowledge", format: "table", rightsBasis: "open_license", rightsReview: "approved", allowedUse: ["link_metadata", "personal_transform", "internal_review", "public_derived"], evidence: "Intro CS와 Core Programming 6개 과정 행" }), userJob: "선수조건을 지키며 OSSU 시작 구간 6개 과정의 진도를 관리한다.", claimedScope: "전체 커리큘럼이 아니라 시작 구간 6행", rows: ossuRows, completeness: "complete", landmarks: ["Intro CS", "Systematic Program Design", "Software Architecture"], classification: coreClassification({ lifeArea: "study_reading", secondaryLifeAreas: ["work_career"], tags: ["컴퓨터과학", "커리큘럼"], sourceShape: "lesson_rows", secondarySourceShapes: ["table_rows"], executionPattern: "progress_tracking", secondaryExecutionPatterns: ["resource_queue"], artifact: "sheet", secondaryArtifacts: ["todo"] }), reviewState: review({ locale: "adaptation_required", rights: "approved", blockers: ["locale_review_required"] }), feasibility: ready({ readiness: "ready_for_internal_canary", blockers: ["locale_review_required"] }), draft: ossuDraft, forbiddenInferences: ["전체 OSSU를 범위에 추가", "선수조건 삭제", "완료 날짜 생성"], artifactReason: "과정·기간·주당 시간·선수조건·상태를 함께 보존하는 Sheet가 주 결과물이다.", expectedUse: "6행 진행 상태와 선수조건 충족 여부 기록", essentialProjectionFields: { sheet: ["course", "duration", "weeklyHours", "prerequisite", "status"] }, beforeProblem: "자료 큐만 만들면 선수조건과 기간이 손실된다." }),
  makeCase({
    caseId: "OQ-P02-PACKING", order: 14, lane: "positive_control", controlKind: "artifact", title: packingRecord.sourceSnapshot.title, shortTitle: "여행 휴대품", source: makeSource({ sourceId: "source-wikivoyage-packing", title: packingRecord.sourceSnapshot.title, publisher: packingRecord.sourceSnapshot.publisher, url: packingRecord.sourceSnapshot.sourceUrl, locale: "en", providerType: "open_knowledge", rightsBasis: "open_license", rightsReview: "approved", allowedUse: ["link_metadata", "personal_transform", "internal_review", "public_derived"], evidence: "Carry-on essentials와 Documents 자연 구간 7행" }), userJob: "휴대 수하물 필수품과 입국 서류를 빠뜨리지 않는다.", claimedScope: "휴대 수하물·서류 7행", rows: packingRows, completeness: "complete", landmarks: ["identification", "medication", "passport/visa"], classification: coreClassification({ lifeArea: "travel_outings", tags: ["여행", "휴대 수하물", "입국 서류"], sourceShape: "checklist_rows", executionPattern: "ordered_procedure", artifact: "checklist", secondaryArtifacts: ["memo"] }), reviewState: review({ locale: "adaptation_required", rights: "approved", blockers: ["locale_review_required"] }), feasibility: ready({ readiness: "ready_for_internal_canary", blockers: ["locale_review_required"] }), draft: packingDraft, forbiddenInferences: ["특정 국가 비자 규정 단정", "약품 복용 지시", "여행 날짜 생성"], artifactReason: "출발 전에 누락 여부를 확인하는 유한 목록이므로 Checklist가 주 결과물이다.", expectedUse: "목적지 조건 반영 → 7개 항목 준비 확인", essentialProjectionFields: { checklist: ["group", "title", "localizeBoundary"] }, beforeProblem: "세계 공통 목록을 한국 출발 규정처럼 보이게 하면 안 된다." }),
  makeCase({
    caseId: "OQ-P03-VEHICLE", order: 15, lane: "positive_control", controlKind: "input_boundary", title: "자동차검사 공식 날짜창", shortTitle: "자동차검사", source: makeSource({ sourceId: "source-ts-inspection", title: "정기검사 대상·기준·유효기간 안내", publisher: "한국교통안전공단", url: "https://main.kotsa.or.kr/portal/contents.do?menuCode=01010200", providerType: "public_institution", evidence: "공식 페이지는 기준을 제공하며 개인 차량의 실제 날짜는 공식 조회/사용자 입력 필요" }), userJob: "공식 조회한 검사 가능 기간 안에 방문일을 정한다.", claimedScope: "차량별 날짜를 추정하지 않는 날짜창 템플릿", rows: vehicleRows, completeness: "complete", landmarks: ["공식 검사 유효기간", "사용자 입력 경계"], classification: coreClassification({ lifeArea: "money_admin_purchase", tags: ["자동차검사", "공식 기간"], sourceShape: "date_window", executionPattern: "date_preparation", artifact: "calendar", secondaryArtifacts: ["checklist", "memo"] }), reviewState: review({}), feasibility: ready(), draft: vehicleDraft, forbiddenInferences: ["차량 정보 없이 실제 시작·종료일 생성", "원문에 없는 D-day offset"], artifactReason: "사용자가 공식 조회 날짜를 넣은 뒤 Calendar에서 기간과 방문일을 관리하는 것이 핵심이다.", expectedUse: "공식 날짜 2개 입력 → 기간 표시 → 방문일 선택", essentialProjectionFields: { calendar: ["windowStart", "windowEnd", "visitDate", "sourceUrl"] }, beforeProblem: "공식 일반 기준을 개인 차량의 확정 날짜처럼 만들면 위험하다." }),
  makeCase({
    caseId: "OQ-P04-PORTFOLIO", order: 16, lane: "positive_control", controlKind: "phase", title: "포트폴리오 4주 만에 준비하기", shortTitle: "개발 포트폴리오", source: makeSource({ sourceId: "source-velog-portfolio", title: "포트폴리오 4주 만에 준비하기", publisher: "Briley / Velog", url: "https://velog.io/@vonvoyage27/%ED%9A%A8%EC%9C%A8%EC%A0%81%EC%9C%BC%EB%A1%9C-IT-%EA%B0%9C%EB%B0%9C%EC%9E%90%EB%A1%9C-%EC%B7%A8%EC%97%85-%EC%A4%80%EB%B9%84%ED%95%98%EA%B8%B0-%ED%8F%AC%ED%8A%B8%ED%8F%B4%EB%A6%AC%EC%98%A4-%ED%8E%B8", providerType: "creator", rightsBasis: "unknown", rightsReview: "pending", evidence: "공개 본문의 가이드 1~7과 준비 순서를 2026-07-20 직접 확인" }), userJob: "개발 포트폴리오 프로젝트를 기획부터 배포·정리까지 단계별로 진행한다.", claimedScope: "본문의 7개 프로젝트 개발 가이드", rows: portfolioRows, completeness: "complete", landmarks: ["기획", "개발", "배포", "포트폴리오 완성"], classification: coreClassification({ lifeArea: "work_career", secondaryLifeAreas: ["study_reading"], tags: ["개발", "포트폴리오"], sourceShape: "procedure_rows", executionPattern: "phase_lifecycle", artifact: "sheet", secondaryArtifacts: ["todo", "memo"] }), reviewState: review({ rights: "pending", promotion: "research_only", blockers: ["rights_permission_required"] }), feasibility: ready({ readiness: "hold", blockers: ["rights_permission_required"] }), draft: portfolioDraft, forbiddenInferences: ["4주를 실제 마감일로 자동 배치", "원문에 없는 기술 스택 추천", "개인 취업 성과 보장"], artifactReason: "여러 주에 걸쳐 단계·상태·산출물을 이어서 관리하므로 Sheet가 주 결과물이다.", expectedUse: "7개 phase의 상태·증거·다음 행동 기록; 개인용 내부 draft", essentialProjectionFields: { sheet: ["phase", "title", "status", "evidence"], todo: ["nextAction", "phase"] }, beforeProblem: "모든 단계를 체크리스트 한 번으로 보여주면 프로젝트 상태와 산출물이 사라진다." }),
  makeCase({
    caseId: "OQ-N01-FOODCRAFT", order: 17, lane: "negative_control", controlKind: "no_job", title: "FoodCraft 일주일 식단 계획", shortTitle: "제품 랜딩", source: makeSource({ sourceId: "source-foodcraft-landing", title: "FoodCraft 일주일 식단 계획", publisher: "FoodCraft", url: "https://foodcraft.app/ko/guide/jugan-sigdan-gyehoek", providerType: "brand_official", rowAccess: "metadata_only", evidence: "자동 장보기 목록 등 경쟁 제품 기능 설명" }), userJob: "원문에서 실행 가능한 주간 식단을 만든다.", claimedScope: "제품 기능 설명 랜딩", rows: foodCraftRows, completeness: "metadata_only", landmarks: ["서비스 기능 설명", "실제 식단 행 없음"], missingRows: ["식단·재료·날짜 행"], classification: coreClassification({ lifeArea: "meals_grocery", tags: ["제품 기능 설명"], sourceShape: null, executionPattern: null, artifact: null, status: "blocked_missing_source" }), reviewState: review({ sourceRowStatus: "metadata_only", readiness: "hold", rights: "pending", promotion: "research_only", blockers: ["source_incomplete", "unsupported_shape"] }), feasibility: blocked({ readiness: "hold", outcome: "rejected", errorCode: "no_executable_user_job", blockers: ["source_incomplete", "unsupported_shape"] }), draft: noneDraft, roleOverrides: { "FOODCRAFT-R01": { role: "reference", targetIds: [], reason: "제품 벤치마크 참고일 뿐 사용자 실행 행이 아님" } }, forbiddenInferences: ["주간 식단", "장보기 품목", "요일별 일정"], artifactReason: "실행 가능한 원문이 없어 어떤 projection도 만들지 않는다.", expectedUse: "Flow 불가 사유와 원문 범위만 표시", beforeProblem: "제품 기능 문구를 사용자 콘텐츠로 오해하면 전부 발명이 된다." }),
  makeCase({
    caseId: "OQ-N02-LOGIN-WALL", order: 18, lane: "negative_control", controlKind: "source_access", title: "회원 전용 이사 체크리스트", shortTitle: "제목·로그인 벽", source: makeSource({ sourceId: "source-fail-003", title: "회원 전용 이사 체크리스트", publisher: "example.test fixture", url: "https://example.test/members/moving-checklist", access: "paywalled", rowAccess: "unavailable", providerType: "aggregator", rightsBasis: "unknown", rightsReview: "pending", evidence: "FAIL-003: 제목과 로그인 벽만 보이고 SourceRow 0개" }), userJob: "이사일까지 해야 할 일을 만든다.", claimedScope: "제목과 로그인 벽만 확인", rows: [], completeness: "missing", landmarks: ["sourceRowCount=0", "bodyReadable=false"], missingRows: ["원문 본문 전체"], classification: coreClassification({ lifeArea: "home_living", tags: ["이사"], sourceShape: null, executionPattern: null, artifact: null, status: "blocked_missing_source" }), reviewState: review({ sourceRowStatus: "missing", readiness: "source_import_required", freshness: "unknown", locale: "pending", rights: "pending", promotion: "research_only", blockers: ["source_unavailable", "source_import_required", "account_or_entitlement_required"] }), feasibility: blocked({ errorCode: "source_unreadable_or_paywalled", generationState: "failed", blockers: ["source_unavailable", "source_import_required", "account_or_entitlement_required"] }), draft: noneDraft, forbiddenInferences: ["제목에서 이사 행동", "D-day offset", "원문 행"], artifactReason: "검증된 행이 0개이므로 어떤 projection도 만들지 않는다.", expectedUse: "권한 있는 텍스트/파일 가져오기 안내만 표시", beforeProblem: "제목만으로 잘 만든 듯한 이사 Flow를 생성하는 것이 가장 위험한 실패다." }),
];

export const laneLabels = {
  core_positive: "핵심 양성",
  core_boundary: "핵심 경계",
  positive_control: "양성 회귀",
  negative_control: "음성 회귀",
};

export const projectionLabels = {
  calendar: "Calendar",
  checklist: "Checklist",
  todo: "Todo",
  sheet: "Sheet",
  memo: "Memo",
};
