import fs from "node:fs";

const base = "docs/content-audit/original-source-review";
const queuePath = `${base}/2026-05-31-original-source-review-queue.json`;
const resolvedPath = `${base}/2026-05-31-resolved-original-candidates.json`;
const extractsPath = `${base}/2026-05-31-resolved-source-extracts.json`;

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const resolved = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
const extracts = JSON.parse(fs.readFileSync(extractsPath, "utf8"));
const resolvedById = Object.fromEntries(resolved.map((item) => [item.id, item]));
const extractById = Object.fromEntries(extracts.map((item) => [item.id, item]));

function contentShape(r, text = "") {
  const t = `${r.title} ${r.originalSummary || ""} ${text}`;
  if (/(D-|마감|신청|접수|시험|갱신|출국|이사|예약|여름|준비|일정|날짜)/.test(t)) return "timeline_or_calendar";
  if (/(반복|루틴|주기|매주|매월|2주|1개월|운동|청소|필터|습관|챌린지)/.test(t)) return "routine";
  if (/(비교|견적|시세|이력|결정|보험|후보)/.test(t)) return "sheet_or_decision";
  if (/(체크|점검|목록|단계|방법|확인|준비물|서류)/.test(t)) return "checklist";
  return "memo_reference";
}

function flowPlan(r, extract) {
  const plan = {
    structure: contentShape(r, extract?.textSample || ""),
    destination: r.destination || "hybrid",
    actionCount: "3-6",
    calendar: [],
    checklist: [],
    routine: [],
    completion: "",
    risk: "",
  };
  if (r.category === "집/가전 관리") {
    plan.calendar = ["관리 기준일 입력", "청소/점검 반복일 생성", "이상 증상 시 문의 일정 생성"];
    plan.checklist = ["전원/안전 상태 확인", "필터/부품 상태 확인", "원문 단계 실행", "완료 후 다음 관리일 기록"];
    plan.routine = ["제품별 권장 주기 반복", "계절 시작 전 사전점검"];
    plan.completion = "청소/교체/점검 결과와 다음 관리일이 기록됨";
    plan.risk = "분해·전기·내부 세척은 일반 실행과 전문가 문의를 분리";
  } else if (r.category === "공부/자격증") {
    plan.calendar = ["시험일/접수일 입력", "자료 확보일", "반복 학습일", "오답 재시도일"];
    plan.checklist = ["범위/자료 선택", "오늘 학습 실행", "점수/오답 기록", "다음 복습일 지정"];
    plan.routine = ["주 3회 학습", "주 1회 모의고사 또는 복습"];
    plan.completion = "선택한 회차/범위의 학습 결과와 다음 복습일이 남음";
    plan.risk = "합격 보장 표현 금지, 공식 일정과 개인 후기를 분리";
  } else if (r.category === "여행/안전") {
    plan.calendar = ["출국 D-30 공식 정보 확인", "D-7 서류/보험/연락처 확인", "D-1 오프라인 메모 저장"];
    plan.checklist = ["목적지/항공 조건 확인", "준비물 또는 비상 연락처 기록", "예약/서류 상태 체크", "보류 항목 표시"];
    plan.routine = ["여행 중 매일 다음날 일정/안전정보 확인"];
    plan.completion = "출국 전 확인 항목과 비상 메모가 저장됨";
    plan.risk = "최신 규정은 공식 링크로 재확인, 안전·의료 판단 금지";
  } else if (r.category === "육아/가족") {
    plan.calendar = ["시작일/월령/방문일 입력", "관찰 또는 준비 반복일", "문의/제출 마감일"];
    plan.checklist = ["대상 정보 입력", "오늘 확인 항목 체크", "관찰/준비물 메모", "보류 또는 문의 표시"];
    plan.routine = ["매일 또는 매주 짧은 기록", "주 1회 다음 준비 정리"];
    plan.completion = "관찰/준비/신청 상태가 완료 또는 보류로 남음";
    plan.risk = "의료·양육 확정 조언 금지, 공식 정보와 경험담 분리";
  } else if (r.category === "돈/저축/구독") {
    plan.calendar = ["결제일/갱신일/신청일 입력", "월말 점검일", "해지/변경 마감일"];
    plan.checklist = ["현재 상태 조회", "유지/해지/변경 후보 표시", "공식 절차 확인", "결정 기록"];
    plan.routine = ["매월 1회 결제/구독 점검", "분기 1회 저축/보험/세금 항목 재검토"];
    plan.completion = "조회 결과와 유지/해지/보류 결정이 기록됨";
    plan.risk = "재무 조언처럼 보이지 않게 개인 결정 기록 중심으로 유지";
  } else if (r.category === "반려동물/식물") {
    plan.calendar = ["등록/접종/관리 기준일 입력", "정기 관리일 반복", "이상 상태 문의일"];
    plan.checklist = ["대상 정보 입력", "원문 단계 확인", "오늘 상태 기록", "다음 관리일 조정"];
    plan.routine = ["주 1-2회 관리", "월 1회 성장/건강 기록"];
    plan.completion = "관리 상태와 다음 날짜가 남음";
    plan.risk = "진단·치료 조언 금지, 관찰 기록과 전문가 문의 분리";
  } else if (r.category === "자동차/모빌리티") {
    plan.calendar = ["점검 기준일", "조회/방문/정비 예약일", "갱신/검사 마감일"];
    plan.checklist = ["차량 정보 입력", "조회/점검 항목 확인", "사진/메모 기록", "구매/정비/보류 결정"];
    plan.routine = ["월 1회 차량 상태 점검", "장거리 이동 전 체크"];
    plan.completion = "후보/차량별 확인 결과와 결정이 남음";
    plan.risk = "가격·안전 보장 금지, 공식 조회 한계 표시";
  } else if (r.category === "식단/건강/운동") {
    plan.calendar = ["실행 시작일", "반복 요일", "컨디션 기록일"];
    plan.checklist = ["재료/도구 준비", "원문 단계 실행", "완료 여부 체크", "컨디션/이상 반응 기록"];
    plan.routine = ["주 1-3회 반복", "2주 후 유지/수정/중단 결정"];
    plan.completion = "오늘 실행 여부와 상태 기록이 남음";
    plan.risk = "효과 보장 금지, 통증/이상 반응 중단 조건 표시";
  } else if (r.category === "커리어/창작") {
    plan.calendar = ["시작일/마감일/게시일 입력", "기획/초안/검토/발행 일정"];
    plan.checklist = ["목표/요구사항 확인", "초안 또는 자료 링크 기록", "검토 반영", "제출/예약/발행 완료"];
    plan.routine = ["주 1회 작성/업로드/리서치 루틴"];
    plan.completion = "산출물이 예약/발행/제출 상태로 남음";
    plan.risk = "공식 절차와 개인 경험/성장 조언 분리";
  } else {
    plan.calendar = ["기준일 입력", "마감 전 확인", "완료 후 결과 메모"];
    plan.checklist = ["공식 출처 확인", "필요 입력값 기록", "실행 항목 체크", "완료/보류 상태 기록"];
    plan.routine = ["필요할 때 반복 확인"];
    plan.completion = "실행 상태와 다음 행동이 기록됨";
    plan.risk = "법률·재무·안전 확정 조언 금지";
  }
  return plan;
}

function domain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function summarizeExtract(review, extract) {
  const title = extract.pageTitle || extract.resolvedTitle || review.title;
  const headings = (extract.headings || []).filter((heading) => heading && heading !== title).slice(0, 4);
  const headingPart = headings.length ? ` 확인된 소제목/단서는 ${headings.join(", ")}이다.` : "";
  const kind =
    extract.originalUrl?.includes("youtube.com/watch")
      ? "영상 원문"
      : extract.originalUrl?.includes("blog.naver.com")
        ? "블로그 원문"
        : "웹 원문";
  return `${kind} "${title}"를 확인했다.${headingPart} ${review.category} 맥락에서는 "${review.flow || review.title}"로 전환할 수 있는 실행 단서를 제공하며, 원문 링크와 사용자 입력값(${review.inputs || "기준일/대상"})을 함께 보존해야 한다.`;
}

const merged = queue.map((review) => {
  if (review.reviewStatus !== "needs_original_source_selection") return review;
  const resolvedItem = resolvedById[review.id];
  const extract = extractById[review.id];
  if (!resolvedItem?.selected) {
    return {
      ...review,
      reviewStatus: "original_source_not_found",
      reviewStatusLabel: "원문 후보 미발견",
      originalSummary: "검색 후보에서 실제 원문 URL을 자동으로 찾지 못했다. 수동 검색이 필요하다.",
    };
  }
  if (!extract || extract.accessStatus !== "readable") {
    return {
      ...review,
      resolvedOriginalUrl: resolvedItem.selected.url,
      resolvedOriginalTitle: resolvedItem.selected.title || "",
      reviewStatus: "resolved_source_needs_manual_review",
      reviewStatusLabel: "원문 후보 확인 필요",
      pageTitle: extract?.pageTitle || resolvedItem.selected.title || "",
      originalSummary: "실제 원문 후보 URL은 찾았지만 본문 접근 또는 다운로드 처리에 실패했다. 별도 열람이 필요하다.",
      extraction: extract || null,
    };
  }
  return {
    ...review,
    resolvedOriginalUrl: resolvedItem.selected.url,
    resolvedOriginalTitle: resolvedItem.selected.title || extract.pageTitle || "",
    resolvedDomain: domain(resolvedItem.selected.url),
    reviewStatus: "original_readable",
    reviewStatusLabel: "원문 확인됨(검색 해소)",
    pageTitle: extract.pageTitle || resolvedItem.selected.title || "",
    originalSummary: summarizeExtract(review, extract),
    flowContent: flowPlan(review, extract),
    extraction: {
      accessStatus: extract.accessStatus,
      httpStatus: extract.httpStatus || null,
      finalUrl: extract.finalUrl || extract.originalUrl,
      headings: extract.headings || [],
      error: extract.error || "",
    },
  };
});

fs.writeFileSync(queuePath, JSON.stringify(merged, null, 2), "utf8");

const counts = merged.reduce((acc, item) => {
  acc[item.reviewStatus] = (acc[item.reviewStatus] || 0) + 1;
  return acc;
}, {});

let md = `# 원문 확인 리뷰 Batch 02 - 검색 후보 170개

생성일: 2026-05-31

검색결과 URL이던 170개 후보를 실제 원문 후보 URL로 해소한 뒤 본문을 수집한 결과다.

## 상태 요약

${Object.entries(counts)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

## 항목별 리뷰

`;

for (const item of merged.filter((review) => review.sourceKind !== "direct_url")) {
  md += `## ${item.id}. ${item.title}

- 상태: ${item.reviewStatusLabel}
- 카테고리: ${item.category}
- 검색 URL: ${item.url}
- 원문 URL: ${item.resolvedOriginalUrl || "확인 필요"}
${item.pageTitle ? `- 원문 제목: ${item.pageTitle}\n` : ""}
원문 요약:
${item.originalSummary}

`;
  if (item.flowContent) {
    md += `Flow 콘텐츠화:
- 구조/목적지: ${item.flowContent.structure} / ${item.flowContent.destination}
- 캘린더 예시: ${item.flowContent.calendar.join(" / ")}
- 체크리스트 예시: ${item.flowContent.checklist.join(" / ")}
- 루틴 예시: ${item.flowContent.routine.join(" / ")}
- 완료 기준: ${item.flowContent.completion}
- 출처/위험 분리: ${item.flowContent.risk}

`;
  }
  md += `검토 메모:


`;
}

fs.writeFileSync(`${base}/2026-05-31-original-source-review-batch-02-resolved-search.md`, md, "utf8");

console.log(JSON.stringify({ counts, queuePath }, null, 2));
