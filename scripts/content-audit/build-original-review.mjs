import fs from "node:fs";

const base = "docs/content-audit/original-source-review";
const rows = JSON.parse(fs.readFileSync(`${base}/2026-05-31-catalog-200-extracted.json`, "utf8"));
const extracts = JSON.parse(fs.readFileSync(`${base}/2026-05-31-direct-source-extracts.json`, "utf8"));
const extractById = Object.fromEntries(extracts.map((x) => [x.id, x]));

function isSearchUrl(url) {
  return /google\.com\/search|search\.naver\.com|youtube\.com\/results/.test(url);
}

function domain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function sourceKind(r) {
  if (r.url.includes("youtube.com/results")) return "youtube_search_candidate";
  if (r.url.includes("search.naver.com")) return "naver_blog_search_candidate";
  if (r.url.includes("google.com/search")) return "google_search_candidate";
  return "direct_url";
}

function accessStatus(r) {
  if (isSearchUrl(r.url)) return "needs_original_source_selection";
  const ex = extractById[r.id];
  if (!ex) return "not_fetched";
  if (ex.accessStatus === "readable") return "original_readable";
  if (r.url.endsWith(".pdf") || r.url.includes("/download/")) return "pdf_or_download_needs_text_review";
  if (ex.accessStatus === "thin_or_scripted") return "blocked_or_scripted_page";
  return "fetch_error_needs_retry";
}

function statusLabel(status) {
  return {
    original_readable: "원문 확인됨",
    needs_original_source_selection: "원문 미확정",
    pdf_or_download_needs_text_review: "PDF/다운로드 별도 확인 필요",
    blocked_or_scripted_page: "차단/스크립트 페이지 확인 필요",
    fetch_error_needs_retry: "접근 오류 재시도 필요",
    not_fetched: "미수집",
  }[status] || status;
}

function contentShape(r, text = "") {
  const t = `${r.title} ${r.shape} ${text}`;
  if (/(D-|마감|신청|접수|시험|갱신|출국|이사|예약|여름|3~5월)/.test(t)) return "timeline_or_calendar";
  if (/(반복|루틴|주기|매주|매월|2주|1개월|운동|청소|필터)/.test(t)) return "routine";
  if (/(체크|준비|점검|목록|단계|Step|방법|확인)/.test(t)) return "checklist";
  if (/(비교|견적|시세|이력|결정)/.test(t)) return "sheet_or_decision";
  return "memo_reference";
}

function originalSummary(r, ex) {
  const summaries = {
    "001": "시스템 에어컨 1WAY 필터 청소를 제품 이해, 전원 차단, 필터 분리, 세척/건조, 장착, 필터 리셋 단계로 안내한다. 사용 환경에 따라 다르지만 2주 1회 또는 청소 알림 시점이 반복 주기로 제시된다.",
    "002": "여름 전 에어컨 사용 준비를 전원코드, 리모컨 배터리, 필터 세척, 실외기 주변 정리 순서로 안내한다. 3~5월 사전 점검에 적합하다.",
    "003": "에어컨 외관 청소, 바람문 청소, 내부 청소 범위와 엔지니어 방문이 필요한 영역을 구분한다. 셀프 청소와 전문가 영역을 나누는 Flow에 적합하다.",
    "004": "에어컨 사전점검 FAQ 형태로 냉방 약함, 정상 작동 확인, 전원/리모컨 문제, 필터와 실외기 주변 점검을 묶어 안내한다.",
    "005": "블로그형 에어컨 청소 총정리로 필터 주기, 냄새/곰팡이 원인, 유형별 셀프 청소, 세정제 비교, 시즌 루틴을 다룬다. 공식 사실과 작성자 주장 분리가 필요하다.",
    "006": "에어컨 분해 청소 체험 기사로 셀프 분해의 난이도와 전문가 동행 경험을 다룬다. 실행 지침보다 전문가 의뢰 판단 메모에 가깝다.",
    "007": "천장형 에어컨 완전 분해 청소 교육/홍보 글로 PCB, 배선, 드레인판, 송풍팬 분해 등 전문가 작업을 설명한다. 일반 사용자 실행 Flow로 만들면 안 된다.",
    "008": "에어컨 분해세척 업체의 서비스/견적 페이지다. 완전분해, 고압세척, 살균/건조, 가격 견적을 제시한다. 업체 비교표 후보로만 사용한다.",
    "041": "외교부 해외안전여행 메인으로 여행일정 등록, 국가/지역별 여행정보, 여행경보, 위기상황별 매뉴얼, 영사안전콜센터로 연결되는 공식 허브다.",
    "042": "외교부 위기상황별 대처매뉴얼로 분실/도난, 체포/구금, 교통사고, 자연재해 등 상황별 공식 안내를 제공한다. 실행 체크보다는 비상 메모 카드가 맞다.",
    "043": "국가/지역별 여행정보 예시 페이지로 여행경보, 안전공지, 현지 연락처 등 여행 전 확인할 공식 정보를 제공한다.",
    "101": "국가동물보호정보시스템의 동물등록제도 안내로 등록 대상, 등록 방법, 변경신고 등 행정 절차를 설명한다.",
    "121": "카히스토리는 차량번호/차대번호 기반 사고이력, 침수/폐차 이력, 차량기준가액 등을 조회하는 서비스다. 중고차 구매 전 조회 일정/체크에 적합하다.",
    "122": "중고차 구매 전 시세 확인, 보험이력 조회, 자동차등록원부, 성능점검기록부, 실차 확인, 명의이전까지 단계별로 정리한 체크리스트형 가이드다.",
    "123": "중고차 사고이력과 주행거리 확인에 초점을 둔 가이드다. 카히스토리/카이즈유 조회, 성능점검기록부, 직접 점검과 전문가 동행을 다룬다.",
    "141": "연어 베이글 레시피로 재료, 조리도구, 10분 조리 시간, 1인분 기준, 단계별 조리 흐름을 제공한다.",
    "142": "제르셔 스쿼트 홈트 기사로 폼롤러 또는 팔 자세, 다리 넓이, 10회 4세트 수행을 안내한다. 반복 운동 루틴으로 전환 가능하지만 중단 조건이 필요하다.",
    "161": "유튜브 시작 전 채널 기획, 주제 좁히기, 장비, 업로드 루틴, 관리 흐름을 설명하는 블로그 글이다. 채널 개설 체크리스트와 반복 업로드 루틴으로 쪼갤 수 있다.",
    "162": "YouTube 고객센터의 동영상 게시 예약 공식 안내다. 업로드, 공개 상태, 날짜/시간/시간대 설정, 예약 수정 절차를 안내한다.",
    "163": "YouTube 검색 필터와 연산자 사용법을 설명한다. 업로드 날짜, 유형, 길이, 정렬, 필터 조합을 검색 리서치 체크리스트로 만들 수 있다.",
  };
  if (summaries[r.id]) return summaries[r.id];
  if (!ex || ex.accessStatus !== "readable") return "원문 접근이 아직 완료되지 않았다. 접근 방식 또는 대체 원문을 확인해야 한다.";
  return `${domain(r.url)}의 원문 제목은 "${ex.pageTitle || r.title}"이다. 본문에서 ${r.shape} 성격의 실행 단서를 확인했으며, Flow 전환 전 핵심 단계와 위험/출처 경계를 더 정리해야 한다.`;
}

function flowPlan(r, ex) {
  const plan = {
    structure: contentShape(r, ex?.textSample || ""),
    destination: r.destination,
    actionCount: "3-6",
    calendar: [],
    checklist: [],
    routine: [],
    completion: "",
    risk: "",
  };
  if (r.category === "집/가전 관리") {
    plan.calendar = ["관리 기준일 입력", "청소/점검 반복일 생성", "이상 증상 시 서비스 문의 일정 생성"];
    plan.checklist = ["전원 차단", "필터/외관 상태 확인", "세척 또는 먼지 제거", "완전 건조/장착", "알림 리셋 또는 다음 점검일 기록"];
    plan.routine = ["2주~1개월 주기 필터 확인", "3~5월 여름 전 사전점검"];
    plan.completion = "청소/점검을 완료하고 다음 점검일 또는 문의 상태를 기록함";
    plan.risk = "분해, PCB, 내부 세척은 일반 사용자 실행이 아니라 전문가 문의/보류로 분리";
  } else if (r.category === "공부/자격증") {
    plan.calendar = ["시험일/목표일 입력", "자료 다운로드/범위 확정일", "반복 풀이 일정", "오답 재시도일"];
    plan.checklist = ["자료명 입력", "회차/핵심 번호 선택", "풀이 완료", "점수/오답 영역 기록", "다음 복습일 지정"];
    plan.routine = ["주 3회 45분 풀이", "주 1회 모의고사 또는 오답 재풀이"];
    plan.completion = "선택한 회차 또는 핵심 범위를 풀고 점수/오답/재시도일을 남김";
    plan.risk = "합격 보장 표현 금지, 자료 저작권/복제 제한 분리";
  } else if (r.category === "여행/안전") {
    plan.calendar = ["출국 D-30 국가 안전정보 확인", "D-7 비상 연락처/보험/서류 확인", "D-1 오프라인 메모 저장"];
    plan.checklist = ["목적지 공식 페이지 열기", "여행경보 확인", "재외공관/영사콜센터 기록", "비상 상황별 메모 카드 작성"];
    plan.routine = ["여행 중 매일 밤 다음날 이동/안전공지 확인"];
    plan.completion = "공식 안전정보와 비상 연락처가 개인 메모 카드에 저장됨";
    plan.risk = "국가별 최신 정보는 공식 페이지 확인 링크를 유지하고 의료/법률 판단은 하지 않음";
  } else if (r.category === "육아/가족") {
    plan.calendar = ["아기 월령/시작일 입력", "새 재료 시도일", "3일 관찰 기록일"];
    plan.checklist = ["오늘 재료/식단 확인", "먹은 양 기록", "피부/구토/설사/컨디션 메모", "이상 반응 시 보류"];
    plan.routine = ["매일 반응 기록", "주 1회 식단 후보 정리"];
    plan.completion = "관찰 기록을 남기고 다음 시도/보류 상태를 정함";
    plan.risk = "의료 판단 금지, 공식/전문가 확인 링크와 부모 경험 분리";
  } else if (r.category === "반려동물/식물") {
    plan.calendar = ["등록/접종/관리 기준일 입력", "신고/접종 마감 전 알림", "정기 관리 반복일"];
    plan.checklist = ["대상 정보 입력", "공식 절차 확인", "필요 서류/장소 기록", "완료 또는 문의 상태 표시"];
    plan.routine = ["월 1회 건강/상태 기록"];
    plan.completion = "등록/신고/접종 또는 관리 상태가 완료/보류로 기록됨";
    plan.risk = "진단/치료 조언 금지, 행정 절차와 건강 판단 분리";
  } else if (r.category === "자동차/모빌리티") {
    plan.calendar = ["구매 후보 등록일", "조회/방문/계약 전 확인일", "정비 또는 보류 결정일"];
    plan.checklist = ["차량번호/차대번호 입력", "사고/침수/주행거리 조회", "성능점검기록부 대조", "실차 사진/메모", "구매/보류/거절 결정"];
    plan.routine = ["구매 후보마다 같은 확인 절차 반복"];
    plan.completion = "후보 차량별 확인 결과와 구매/보류/거절 결정이 남음";
    plan.risk = "가격/안전 보장 금지, 보험처리되지 않은 사고 한계 표시";
  } else if (r.category === "식단/건강/운동") {
    plan.calendar = ["조리/운동 실행일 입력", "반복 실행 요일 선택", "컨디션 기록일"];
    plan.checklist = ["재료/도구 준비", "원문 단계 실행", "완료 여부 기록", "컨디션/통증/이상 반응 메모"];
    plan.routine = ["주 1-3회 반복 실행", "2주 후 유지/수정/중단 결정"];
    plan.completion = "오늘 실행 여부와 컨디션 기록이 남음";
    plan.risk = "건강 효과 보장 금지, 통증/이상 반응 중단 조건 표시";
  } else if (r.category === "커리어/창작") {
    plan.calendar = ["시작일/게시일 입력", "기획/제작/검토/게시 일정 생성"];
    plan.checklist = ["주제/목표 독자 입력", "소스 링크/초안 기록", "게시 설정 확인", "발행/예약 완료"];
    plan.routine = ["주 1회 업로드 또는 리서치 루틴"];
    plan.completion = "게시물 또는 영상이 예약/발행 상태로 기록됨";
    plan.risk = "플랫폼 공식 절차와 개인 성장 조언 분리";
  } else {
    plan.calendar = ["기준일 입력", "마감 전 확인일", "완료 후 결과 메모"];
    plan.checklist = ["공식 출처 확인", "필요 입력값 기록", "실행 항목 체크", "완료/보류 상태 기록"];
    plan.routine = ["필요 시 반복 확인"];
    plan.completion = "실행 상태와 다음 행동이 명확히 기록됨";
    plan.risk = "법률/재무/안전 확정 조언 금지";
  }
  return plan;
}

function tableSafe(value) {
  return String(value || "").replace(/\|/g, "/").replace(/\n/g, " ");
}

const reviews = rows.map((r) => {
  const ex = extractById[r.id];
  const status = accessStatus(r);
  return {
    id: r.id,
    category: r.category,
    title: r.title,
    url: r.url,
    domain: domain(r.url),
    sourceKind: sourceKind(r),
    reviewStatus: status,
    reviewStatusLabel: statusLabel(status),
    pageTitle: ex?.pageTitle || "",
    originalSummary:
      status === "needs_original_source_selection"
        ? "현재 URL은 검색결과이므로 원문으로 인정하지 않는다. 실제 원문 1개를 선택한 뒤 다시 요약해야 한다."
        : originalSummary(r, ex),
    flowContent: status === "needs_original_source_selection" ? null : flowPlan(r, ex),
    extraction: ex
      ? {
          accessStatus: ex.accessStatus,
          httpStatus: ex.httpStatus || null,
          finalUrl: ex.finalUrl || "",
          headings: ex.headings || [],
          error: ex.error || "",
        }
      : null,
    reviewerMemo: "",
  };
});

fs.writeFileSync(`${base}/2026-05-31-original-source-review-queue.json`, JSON.stringify(reviews, null, 2), "utf8");

const counts = reviews.reduce((acc, r) => {
  acc[r.reviewStatus] = (acc[r.reviewStatus] || 0) + 1;
  return acc;
}, {});

let queueMd = `# 온라인 출처 200개 원문 리뷰 큐

생성일: 2026-05-31

## 현재 상태

- 전체 후보: ${reviews.length}개
- 원문 확인됨: ${counts.original_readable || 0}개
- 검색결과라 원문 선택 필요: ${counts.needs_original_source_selection || 0}개
- PDF/다운로드 별도 확인 필요: ${counts.pdf_or_download_needs_text_review || 0}개
- 차단/스크립트 페이지 확인 필요: ${counts.blocked_or_scripted_page || 0}개
- 접근 오류 재시도 필요: ${counts.fetch_error_needs_retry || 0}개

## 원칙

- Google/Naver/YouTube 검색결과 URL은 원문으로 보지 않는다.
- 원문을 읽은 항목만 Flow 변환안을 확정한다.
- 검색 후보는 먼저 실제 출처 URL을 고른 뒤 요약/Flow 변환을 작성한다.
- 의료, 법률, 재무, 안전, 장비 분해는 실행 지시와 주의/전문가 확인을 분리한다.

## 전체 큐

| ID | 상태 | 카테고리 | 후보 | 출처 | Flow 변환 |
|---|---|---|---|---|---|
`;

for (const review of reviews) {
  const flow = review.flowContent ? `${review.flowContent.structure} / ${review.flowContent.destination}` : "원문 선택 후 작성";
  queueMd += `| ${review.id} | ${review.reviewStatusLabel} | ${tableSafe(review.category)} | ${tableSafe(review.title)} | ${tableSafe(review.domain || review.sourceKind)} | ${tableSafe(flow)} |\n`;
}

fs.writeFileSync(`${base}/2026-05-31-original-source-review-queue.md`, queueMd, "utf8");

let batchMd = `# 원문 확인 리뷰 Batch 01 - 직접 URL 30개

생성일: 2026-05-31

이 문서는 기존 200개 카탈로그 중 실제 URL이 이미 있는 30개를 먼저 원문 기준으로 확인한 결과다. 검색결과 URL은 원문으로 보지 않고 별도 큐에 남겼다.

`;

for (const review of reviews.filter((r) => r.sourceKind === "direct_url")) {
  batchMd += `## ${review.id}. ${review.title}

- 상태: ${review.reviewStatusLabel}
- 카테고리: ${review.category}
- 출처: ${review.url}
`;
  if (review.pageTitle) batchMd += `- 원문 제목: ${review.pageTitle}\n`;
  batchMd += `
원문 요약:
${review.originalSummary}

`;
  if (review.flowContent) {
    batchMd += `Flow 콘텐츠화:
- 구조/목적지: ${review.flowContent.structure} / ${review.flowContent.destination}
- 캘린더 예시: ${review.flowContent.calendar.join(" / ")}
- 체크리스트 예시: ${review.flowContent.checklist.join(" / ")}
- 루틴 예시: ${review.flowContent.routine.join(" / ")}
- 완료 기준: ${review.flowContent.completion}
- 출처/위험 분리: ${review.flowContent.risk}

`;
  }
  batchMd += `검토 메모:


`;
}

fs.writeFileSync(`${base}/2026-05-31-original-source-review-batch-01-direct.md`, batchMd, "utf8");

console.log(JSON.stringify({ counts }, null, 2));
