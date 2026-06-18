import fs from "node:fs";

const samplesPath = "docs/content-audit/original-source-review/2026-06-01-creator-flow-validation-samples.json";
const seedPath = "docs/content-audit/original-source-review/2026-06-01-my-flow-seed-candidates.json";
const planPath = "docs/content-audit/2026-06-01-creator-flow-validation-plan.md";
const mdPath = "docs/content-audit/2026-06-01-creator-flow-samples.md";
const htmlPath = "docs/content-audit/2026-06-01-creator-flow-samples.html";
const publicHtmlPath = "public/content-audit/creator-flow-review.html";
const rulesPath = "docs/content-audit/2026-06-01-creator-flow-prompt-rules.md";
const reviewNotesPath = "docs/content-audit/original-source-review/2026-06-01-creator-flow-review-notes.json";

const data = JSON.parse(fs.readFileSync(samplesPath, "utf8"));
const { samples, dimensions, dimensionLabels, structureLabels, autoFlowCritique } = data;

const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const list = (items) => items.map((item) => `- ${item}`).join("\n");

const mdTable = (headers, rows) =>
  [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");

const sourceStructures = [...new Set(samples.map((sample) => sample.sourceStructure))];
const actualDemoById = {
  "rep-washing-machine-care": {
    user: "서울 원룸에 사는 1인 가구",
    filledInputs: ["제품: 삼성 드럼세탁기", "마지막 청소일: 2026-05-18", "반복: 4주마다"],
    today: ["세탁통 청소 실행", "냄새/소음 여부 메모"],
    calendar: ["2026-06-15 세탁통 청소", "2026-07-13 세탁통 청소", "매월 첫째 주 필터/외관 점검"],
    checklist: ["공식 청소 안내 링크 열기", "세탁통 청소 실행 후 마지막 청소일 갱신", "냄새/누수/소음이 있으면 서비스 문의 보류로 표시"],
    detailMemo: "공식 안내는 링크로 열고, 오늘은 세탁통 청소 완료 여부와 이상 징후만 기록한다. 블로그 후기는 준비물 참고로만 둔다.",
    result: "다음 청소일이 자동으로 생기고, 이상 징후가 있으면 완료가 아니라 '서비스 확인 필요' 상태로 남는다.",
  },
  "rep-content-engine-pipeline": {
    user: "주 3회 숏폼을 올리는 1인 크리에이터",
    filledInputs: ["채널: 인스타 릴스", "주간 발행 수: 3개", "다음 발행일: 2026-06-04"],
    today: ["다음 발행물 상태를 '편집 중'으로 이동", "막힌 콘텐츠 1개 보류 사유 작성"],
    calendar: ["2026-06-04 릴스 발행", "매주 월요일 아이디어 3개 정리", "매주 금요일 다음 주 발행 슬롯 확인"],
    checklist: ["아이디어 3개 입력", "다음 발행물 상태 갱신", "발행일 캘린더 등록", "촬영 대기 콘텐츠 보류 사유 남기기"],
    detailMemo: "템플릿 전체 DB를 복제하지 않는다. Flow에는 제목, 채널, 상태, 다음 행동, 발행일만 둔다.",
    result: "아이디어 목록이 아니라 오늘 발행에 가까운 콘텐츠와 막힌 이유가 먼저 보인다.",
  },
  "rep-used-car-inspection": {
    user: "첫 중고차를 보러 가는 구매자",
    filledInputs: ["차량: 아반떼 CN7", "방문일: 2026-06-08", "예산: 1,500만원"],
    today: ["방문 차량 기본 정보 입력", "성능기록부 링크 저장", "구매/보류/거절 결정 남기기"],
    calendar: ["2026-06-08 차량 방문 점검", "2026-06-09 보험/총비용 재확인"],
    checklist: ["연식/주행거리/가격 입력", "성능기록부와 실차 상태 대조", "외관/타이어/누유 사진 메모", "구매/보류/거절 중 하나 선택"],
    detailMemo: "가이드는 점검 관점으로만 사용한다. 최종 판단은 사진, 기록부, 방문 메모, 공식 조회 링크를 근거로 남긴다.",
    result: "완료 체크가 아니라 '보류: 누유 확인 필요'처럼 결정 상태가 남는다.",
  },
  "rep-course-launch-checklist": {
    user: "첫 온라인 강의를 여는 강사",
    filledInputs: ["코스명: 노션 가계부 만들기", "출시일: 2026-06-20", "판매 채널: Gumroad"],
    today: ["판매 페이지 초안 작성", "테스트 구매 계정 준비"],
    calendar: ["2026-06-06 판매 페이지 초안 마감", "2026-06-17 결제/접근 권한 테스트", "2026-06-20 출시 공지 발송"],
    checklist: ["첫 공개 범위 확정", "판매 페이지에 대상/결과/가격/구매 링크 입력", "테스트 구매 후 강의 접근 확인"],
    detailMemo: "출시 조언 전문보다 출시일 기준 마감과 사용자가 직접 확인할 결과물만 남긴다.",
    result: "출시 전 해야 할 일이 긴 글이 아니라 D-14, D-3, 출시일 작업으로 정리된다.",
  },
  "rep-plant-care-bundle": {
    user: "몬스테라를 처음 키우는 사용자",
    filledInputs: ["식물: 몬스테라", "마지막 물 확인일: 2026-05-30", "확인 주기: 5일마다"],
    today: ["흙 마름 상태 확인", "잎 처짐/변색 메모"],
    calendar: ["2026-06-04 물주기 확인", "2026-06-09 물주기 확인", "매월 1일 계절 관리 점검"],
    checklist: ["화분 위치 기록", "흙 상태 보고 물주기/보류 선택", "잎 상태 사진 또는 한 줄 메모", "분갈이는 보류/확인으로 남기기"],
    detailMemo: "모든 식물에 같은 주기를 강제하지 않는다. 오늘 판단은 흙 상태와 관찰 메모 중심으로 한다.",
    result: "캘린더에는 물주기 확인만 보이고, 실제 판단 근거는 상세 기록에 남는다.",
  },
  "rep-baby-food-record": {
    user: "초기 이유식을 시작한 보호자",
    filledInputs: ["월령: 6개월", "오늘 재료: 애호박", "기록 기간: 7일"],
    today: ["새 재료 여부 체크", "피부/구토/설사 관찰 메모"],
    calendar: ["2026-06-01 애호박 반응 기록", "2026-06-02 같은 재료 반응 기록", "2026-06-07 이번 주 재료 기록 확인"],
    checklist: ["오늘 재료와 섭취 여부 입력", "관찰 항목 체크", "이상 반응이 있으면 상담 메모로 전환"],
    detailMemo: "공식 정보는 링크로 두고 Flow에는 재료, 시간대, 반응 기록만 남긴다. 판단이나 처방은 하지 않는다.",
    result: "완료보다 기록이 중심이다. 이상 반응은 '상담 필요' 상태로 남는다.",
  },
  "rep-writing-challenge": {
    user: "뉴스레터를 시작하려는 직장인",
    filledInputs: ["시작일: 2026-06-01", "작성 도구: Google Docs", "하루 목표: 15분"],
    today: ["Day 1 프롬프트 열기", "작성 링크 붙여넣기"],
    calendar: ["2026-06-01 Day 1 글쓰기", "2026-06-02 Day 2 글쓰기", "2026-06-30 Day 30 회고"],
    checklist: ["오늘 프롬프트 번호 확인", "15분 작성", "문서 링크 저장", "건너뛴 날은 재개일 지정"],
    detailMemo: "프롬프트 전문은 원문 링크에서 확인한다. Flow에는 오늘 번호와 작성 링크만 남긴다.",
    result: "30일짜리 동기부여 글이 아니라 매일 작성 링크가 쌓이는 실행 루틴이 된다.",
  },
  "rep-wedding-timeline": {
    user: "2027년 봄 결혼식을 준비하는 커플",
    filledInputs: ["결혼식 날짜: 2027-04-24", "예산: 3,000만원", "우선 예약: 장소"],
    today: ["장소 후보 3곳 입력", "견적 비교 메모"],
    calendar: ["2026-04-24 장소 후보 비교", "2027-02-24 초대장 발송", "2027-04-10 최종 인원 확인"],
    checklist: ["장소 후보/견적/방문일 입력", "업체 보류 사유 남기기", "주요 마감만 캘린더 등록"],
    detailMemo: "원문의 긴 타임라인은 월별 묶음으로 보고, 실제 캘린더에는 지금 결정해야 할 마감만 넣는다.",
    result: "전체 준비 목록이 아니라 결혼식 날짜 기준으로 이번 달 결정 항목이 보인다.",
  },
  "rep-youtube-workout-playlist": {
    user: "운동을 처음 시작하는 사용자",
    filledInputs: ["시작일: 2026-06-02", "가능 요일: 화/목/토", "중단 조건: 통증/어지러움"],
    today: ["오늘 영상 열기", "완료/강도/통증 여부 기록"],
    calendar: ["2026-06-02 Day 1 운동 영상", "2026-06-04 Day 2 운동 영상", "2026-06-06 Day 3 운동 영상"],
    checklist: ["원문 영상 열기", "가능한 강도로 따라 하기", "강도와 통증 여부 기록", "불편하면 다음 회차 보류"],
    detailMemo: "운동 동작은 영상이 담당한다. Flow는 일정, 영상 링크, 완료 여부, 컨디션 기록만 담당한다.",
    result: "운동법을 복제하지 않고 오늘 볼 영상과 기록 필드만 남는다.",
  },
  "rep-blog-start-series": {
    user: "회사 블로그를 맡은 마케터",
    filledInputs: ["주제: B2B SaaS 운영 팁", "발행 요일: 수요일", "첫 글 마감: 2026-06-12"],
    today: ["글감 3개 입력", "첫 글 발행일 지정"],
    calendar: ["2026-06-12 첫 글 초안 마감", "2026-06-17 첫 글 발행", "매주 월요일 글감 백로그 정리"],
    checklist: ["글감 후보 3개 입력", "첫 글을 초안 상태로 이동", "발행일 예약", "발행 후 다음 글 상태 갱신"],
    detailMemo: "PDF와 블로그 글은 운영 방식 참고로 둔다. Flow에는 글감, 상태, 발행일만 남긴다.",
    result: "블로그 시작 가이드가 실제 발행 캘린더와 백로그로 바뀐다.",
  },
  "rep-code-study-challenge": {
    user: "프론트엔드 공부를 다시 시작한 개발자",
    filledInputs: ["시작일: 2026-06-01", "학습 주제: React", "로그 채널: GitHub README"],
    today: ["오늘 코딩 60분", "로그 링크 남기기"],
    calendar: ["2026-06-01 Day 1 React 학습", "2026-06-02 Day 2 React 학습", "매주 일요일 주간 회고"],
    checklist: ["오늘 학습 주제 한 줄 입력", "코딩 실행", "로그 링크 저장", "끊긴 날은 재개일 지정"],
    detailMemo: "챌린지 규칙은 출처 링크로 두고, Flow에는 오늘 실행 시간과 로그 링크만 둔다.",
    result: "100일 반복 일정이 아니라 오늘 실행과 로그 링크가 중심이 된다.",
  },
  "rep-photography-challenge": {
    user: "카메라 연습을 시작한 취미 사진가",
    filledInputs: ["시작일: 2026-06-01", "저장 위치: Google Photos 앨범", "촬영 요일: 매일"],
    today: ["오늘 촬영 과제 번호 확인", "사진 링크 저장"],
    calendar: ["2026-06-01 Day 1 촬영", "2026-06-02 Day 2 촬영", "2026-06-30 30일 결과 확인"],
    checklist: ["PDF에서 오늘 번호 확인", "사진 촬영", "사진 링크 또는 파일 위치 저장", "못 찍은 날은 재촬영일 지정"],
    detailMemo: "PDF 과제 문장은 복제하지 않는다. 오늘 번호, 결과 링크, 짧은 회고만 남긴다.",
    result: "PDF가 실행 캘린더와 사진 결과 로그로 바뀐다.",
  },
};
const seedCandidates = samples
  .filter((sample) => sample.seedCandidate)
  .map((sample) => ({
    id: sample.id,
    title: sample.title,
    sourceStructure: sample.sourceStructure,
    destination: sample.destination,
    structure: sample.structure,
    userInputs: sample.userInputs,
    sourceUrls: sample.sourceUrls.map(([, title, url]) => ({ title, url })),
    today: sample.today,
    calendar: sample.calendar.map(([title, timing, type]) => ({ title, timing, type })),
    items: sample.items.map(([title, type, completion]) => ({ title, type, completion })),
    memo: sample.memo,
    completion: sample.completion,
    hold: sample.hold,
    uxProblems: sample.uxProblems,
    demoFlow: actualDemoById[sample.id],
  }));
const findSample = (id) => samples.find((sample) => sample.id === id);
const topSamples = samples.slice(0, 4);
const uxRiskSamples = samples.filter((sample) =>
  ["rep-youtube-workout-playlist", "rep-code-study-challenge", "rep-writing-challenge", "rep-plant-care-bundle"].includes(sample.id),
);
const sensitiveSamples = samples.filter((sample) =>
  ["rep-baby-food-record", "rep-washing-machine-care", "rep-used-car-inspection", "rep-youtube-workout-playlist"].includes(sample.id),
);
const creatorOpsSamples = samples.filter((sample) =>
  ["rep-content-engine-pipeline", "rep-course-launch-checklist", "rep-blog-start-series"].includes(sample.id),
);
const nextUxActions = [
  "월간 캘린더의 루틴은 긴 텍스트 카드보다 아이콘/개수 중심으로 줄인다.",
  "증빙은 모든 Flow의 기본 입력이 아니라 비교/계약/제출/결정 Flow의 선택 필드로 둔다.",
  "모바일 Flow 탭은 상태판과 전체 목록을 동시에 길게 보여주지 말고, 상태 카드를 누르면 해당 목록만 펼친다.",
  "민감 영역은 완료 체크보다 기록/상담/공식 확인 메모를 먼저 보이게 한다.",
  "자동 변환은 출처 구조와 목적지를 먼저 고른 뒤 오늘/캘린더/상세/완료 기준으로 분리한다.",
];
const executiveSummaryMd = `## 결론 먼저

- 바로 seed로 실험할 우선 후보: ${topSamples.map((sample) => sample.title).join(", ")}
- My Flow UX를 가장 잘 검증하는 후보: ${findSample("rep-used-car-inspection").title}, ${findSample("rep-content-engine-pipeline").title}, ${findSample("rep-plant-care-bundle").title}
- 캘린더 과밀을 가장 강하게 드러내는 후보: ${uxRiskSamples.map((sample) => sample.title).join(", ")}
- 민감 영역 경계 검증 후보: ${sensitiveSamples.map((sample) => sample.title).join(", ")}
- 지금 결론: FlowMe는 "원문을 복제하는 앱"이 아니라 "원문을 실행 가능한 일정/체크/기록/상태로 바꾸는 앱"이어야 한다.
`;

const priorityGroupsMd = `## 후보 그룹

### 1. Seed 우선 후보
${list(topSamples.map((sample) => `${sample.title}: ${sample.average}점, ${sample.verdict}`))}

### 2. 제작자가 공유/판매하기 좋은 후보
${list(creatorOpsSamples.map((sample) => `${sample.title}: 제작자의 운영 시스템을 실행 Flow로 바꾸기 좋음`))}

### 3. My Flow UX 한계를 드러내는 후보
${list(uxRiskSamples.map((sample) => `${sample.title}: ${sample.uxProblems[0]}`))}

### 4. 출처/위험 경계가 중요한 후보
${list(sensitiveSamples.map((sample) => `${sample.title}: ${sample.boundary.risk}`))}
`;

const uxActionsMd = `## 다음 UX/UI 우선순위

${list(nextUxActions)}
`;

function sampleSection(sample) {
  const demo = actualDemoById[sample.id];
  return `## ${sample.rank}. ${sample.title}

- 대표 유형: ${sample.requiredType}
- 출처 구조: ${sample.sourceStructure} (${structureLabels[sample.sourceStructure]})
- 목적지/구조: ${sample.destination} / ${sample.structure}
- 평균 점수: ${sample.average} (${sample.verdict})

### 실제 생성 예시
- 사용자 상황: ${demo.user}
- 입력값: ${demo.filledInputs.join(" / ")}
- 오늘 탭: ${demo.today.join(" / ")}
- 캘린더: ${demo.calendar.join(" / ")}
- 체크/상태:
${demo.checklist.map((item) => `  - ${item}`).join("\n")}
- 상세 메모: ${demo.detailMemo}
- 사용자가 보는 결과: ${demo.result}

### 원문 URL
${sample.sourceUrls.map(([role, title, url]) => `- ${role}: [${title}](${url})`).join("\n")}

### 원문에서 확인한 실행 신호
${list(sample.sourceSignals)}

### 사용자 목표
${sample.userGoal}

### 제작자가 공유/판매하고 싶을 이유
${sample.creatorIncentive}

### 사용자 입력 1~3개
${list(sample.userInputs)}

### My Flow 노출 예시
- 오늘 탭: ${sample.today.join(" / ")}
- 캘린더: ${sample.calendar.map(([title, timing]) => `${timing} - ${title}`).join(" / ")}
- 체크/루틴/기록/상태:
${sample.items.map(([title, type, completion]) => `  - ${title} (${type}): ${completion}`).join("\n")}

### 상세 메모에 들어갈 원문 요약
${sample.memo}

### 완료 기준
${sample.completion}

### 보류/탈락 조건
${list(sample.hold)}

### 저작권/출처/위험 경계
- 저작권: ${sample.boundary.copyright}
- 출처: ${sample.boundary.source}
- 위험: ${sample.boundary.risk}

### My Flow UX에서 예상되는 문제
${list(sample.uxProblems)}

### 점수
${mdTable(["항목", "점수"], dimensions.map((key) => [dimensionLabels[key], String(sample.scores[key])]))}
`;
}

const planMd = `# 제작자형 Flow 콘텐츠 검증 계획

Date: 2026-06-01
Status: 대표 케이스 12개 재선정 및 원문 기반 정답 Flow 샘플 작성

## 목표

이 작업은 많은 후보를 자동 생성하는 것이 아니라, FlowMe의 My Flow UX가 실제 제작자형 콘텐츠를 감당하는지 검증하고 향후 변환 프롬프트/로직의 기준을 만들기 위한 대표 샘플 검증이다.

## 기존 자동 exampleFlow 진단

${list(autoFlowCritique)}

## 대표 케이스 선정 범위

${list([
  "단일 URL 체크리스트형",
  "단일 URL 챌린지형",
  "제작자 여러 URL 묶음형",
  "유튜브 플레이리스트형",
  "블로그 시리즈형",
  "Notion/Gumroad 템플릿형",
  "공식 정보 + 제작자 경험 혼합형",
  "기준일 타임라인형",
  "생활 루틴/관리형",
  "제작/운영 파이프라인형",
  "학습/스터디형",
  "문서/PDF 실행형",
])}

## 산출물

- [원문 기반 정답 Flow 샘플 문서](./2026-06-01-creator-flow-samples.md)
- [HTML 리뷰 페이지](./2026-06-01-creator-flow-samples.html)
- [제작 프롬프트/로직 규칙 초안](./2026-06-01-creator-flow-prompt-rules.md)
- [샘플 JSON](./original-source-review/2026-06-01-creator-flow-validation-samples.json)
- [My Flow seed 후보 JSON](./original-source-review/2026-06-01-my-flow-seed-candidates.json)
`;

const samplesMd = `# 원문 기반 제작자형 정답 Flow 샘플

Date: 2026-06-01

이 문서는 자동 exampleFlow를 그대로 믿지 않고, 원문에서 확인 가능한 실행 신호를 기준으로 사람이 검토한 대표 Flow 샘플이다. 목적은 My Flow UX/UI 검증, 사용자 유용성 검증, 제작 프롬프트/로직 기준 수립이다.

${executiveSummaryMd}

## 요약

- 대표 샘플: ${samples.length}개
- Deep sample: ${samples.filter((sample) => sample.depth === "deep").length}개
- Seed 후보: ${seedCandidates.length}개
- 출처 구조: ${sourceStructures.map((key) => `${key}(${structureLabels[key]})`).join(", ")}

${priorityGroupsMd}

${uxActionsMd}

## 점수표

${mdTable(
  ["순위", "Flow", "대표 유형", "출처 구조", "평균", "판정"],
  samples.map((sample) => [String(sample.rank), sample.title, sample.requiredType, sample.sourceStructure, String(sample.average), sample.verdict]),
)}

${samples.map(sampleSection).join("\n")}

## UX/UI 검증 결과 요약

### 충분한 부분
- 오늘 탭, 캘린더, Flow별/상태별 관점은 대표 케이스 대부분을 담을 수 있다.
- 일정형, 루틴형, 체크형을 상위 노출 타입으로 유지하고 내부 secondary type으로 memo_evidence, log_entry, decision_hold를 두는 방향은 타당하다.
- 중고차, 콘텐츠 파이프라인처럼 완료보다 결정/상태가 중요한 Flow도 현재 모델로 표현 가능하다.

### 부족한 부분
- 루틴이 월간 캘린더 안에서 텍스트 카드로 많이 보이면 모바일과 데스크톱 모두 시인성이 떨어진다.
- 증빙은 기본 입력으로 강제하면 복잡하다. 결정 근거가 필요한 후보 비교/계약/제출 Flow에서만 선택 필드로 보여야 한다.
- Flow 탭에서 상태판과 전체 목록을 동시에 길게 보여주면 모바일 사용자는 무엇을 눌러야 할지 흐려진다.
- 민감 영역은 완료 체크보다 기록/상담 메모가 먼저 보이는 상세 구조가 필요하다.

### 제작 로직에 반영할 규칙
- 출처 구조를 먼저 판별하고 목적지를 고른 뒤 action을 만든다.
- 사용자 입력은 1~3개를 넘기지 않는다.
- 원문 본문은 요약 메모와 링크로만 두고 실행 항목에는 날짜, 상태, 결과물, 보류 조건만 남긴다.
- 캘린더 월간 칸에는 행동 제목과 아이콘/개수만 남기고 D-day, 긴 설명, 증빙 필드는 상세로 보낸다.
- 건강/육아/안전/정비/법률/재무는 기록, 공식 확인, 전문가 문의로 제한한다.
`;

const rulesMd = `# 제작자형 Flow 변환 프롬프트/로직 규칙 초안

Date: 2026-06-01

## 변환 순서

1. 출처 구조를 판별한다: single_url / source_bundle / youtube_playlist / blog_series / template / official_plus_creator.
2. 사용자 목표를 한 문장으로 쓴다.
3. 원문에서 날짜, 반복, 마감, 상태, 제출물, 기록, 결정 지점을 3~5개만 뽑는다.
4. primary destination을 먼저 고른다: calendar / sheet / memo / internal_check / hybrid.
5. 사용자 입력은 1~3개로 제한한다.
6. 오늘 탭, 캘린더, 체크/루틴/기록/상태, 상세 메모를 분리한다.
7. 원문 본문, 템플릿 DB, 영상/강의 내용은 복제하지 않는다.
8. 완료 기준과 보류/탈락 조건을 반드시 쓴다.
9. 민감 영역은 공식 확인, 기록, 상담 메모로 제한한다.
10. My Flow UX에서 과밀해지는 지점을 비판적으로 기록한다.

## 자동 생성 금지 신호

- action 배열을 그대로 캘린더/오늘/진행 카드로 감싸는 방식
- 모든 완료 기준이 같은 문장으로 끝나는 방식
- structure만 보고 임의 D-day나 반복 주기를 붙이는 방식
- 원문 본문, PDF 과제, 영상 동작 설명, 유료 템플릿 구조를 상세 메모에 복제하는 방식
- 출처/제작자 경험/위험 경계를 한 문단에 섞는 방식

## 권장 프롬프트 뼈대

\`\`\`text
다음 원문 또는 URL 묶음을 FlowMe 실행 콘텐츠로 변환한다.
1. 출처 구조를 판별한다.
2. 사용자의 실제 목표를 한 문장으로 쓴다.
3. 원문에서 실행 신호 3~5개를 추출한다.
4. 사용자 입력을 1~3개로 제한한다.
5. 오늘 탭, 캘린더, 체크/루틴/기록/상태, 상세 메모를 분리한다.
6. 원문 본문은 복제하지 않고 출처 링크로 남긴다.
7. 완료 기준과 보류/탈락 조건을 쓴다.
8. My Flow UX에서 복잡해지는 지점을 적고, 캘린더/리마인더 앱보다 복잡하면 실패로 판정한다.
\`\`\`
`;

const cards = samples
  .map(
    (sample) => {
      const demo = actualDemoById[sample.id];
      return `<article class="card">
      <div class="head">
        <div>
          <p class="meta">#${sample.rank} · ${esc(sample.requiredType)} · ${esc(structureLabels[sample.sourceStructure])}</p>
          <h2>${esc(sample.title)}</h2>
        </div>
        <span>${sample.average}</span>
      </div>
      <section class="demo" data-section="actual-demo">
        <p class="eyebrow">실제 생성 예시</p>
        <p><b>사용자 상황</b><br>${esc(demo.user)}</p>
        <div class="chips">${demo.filledInputs.map((input) => `<span>${esc(input)}</span>`).join("")}</div>
        <div class="demo-grid">
          <div><b>오늘</b><ul>${demo.today.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>
          <div><b>캘린더</b><ul>${demo.calendar.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>
        </div>
        <b>체크/상태</b>
        <ol>${demo.checklist.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>
        <p class="done">${esc(demo.result)}</p>
      </section>
      <form class="review" data-section="user-review" data-flow-id="${esc(sample.id)}" data-flow-title="${esc(sample.title)}" method="post" action="http://127.0.0.1:54521/api/reviews" target="review-save-frame">
        <input type="hidden" name="flowId" value="${esc(sample.id)}" />
        <input type="hidden" name="title" value="${esc(sample.title)}" />
        <div class="review-head">
          <b>내 평가</b>
          <span data-review-status>아직 저장 안 됨</span>
        </div>
        <div class="rating" role="radiogroup" aria-label="${esc(sample.title)} 평가 점수">
          ${[5, 4, 3, 2, 1].map((score) => `<label><input type="radio" name="rating" value="${score}" /> ${score}</label>`).join("")}
        </div>
        <textarea data-review-memo name="memo" rows="3" placeholder="좋은 점, 애매한 점, Flow로 안 맞는 이유, 수정 의견을 적어주세요."></textarea>
        <button type="submit" data-save-review>메모 저장</button>
      </form>
      <p><b>사용자 목표</b><br>${esc(sample.userGoal)}</p>
      <p><b>제작자 인센티브</b><br>${esc(sample.creatorIncentive)}</p>
      <section><b>원문 URL</b><ul>${sample.sourceUrls.map(([role, title, url]) => `<li>${esc(role)}: <a href="${esc(url)}" target="_blank" rel="noreferrer">${esc(title)}</a></li>`).join("")}</ul></section>
      <section><b>원문 실행 신호</b><ul>${sample.sourceSignals.map((signal) => `<li>${esc(signal)}</li>`).join("")}</ul></section>
      <section class="flow">
        <b>정답 Flow 샘플</b>
        <div class="chips">${sample.userInputs.map((input) => `<span>${esc(input)}</span>`).join("")}</div>
        <p><b>오늘</b> ${esc(sample.today.join(" / "))}</p>
        <p><b>캘린더</b> ${esc(sample.calendar.map(([title, timing]) => `${timing} - ${title}`).join(" / "))}</p>
        <ol>${sample.items.map(([title, type, completion]) => `<li><b>${esc(title)}</b><br><small>${esc(type)} · ${esc(completion)}</small></li>`).join("")}</ol>
        <p class="done">${esc(sample.completion)}</p>
      </section>
      <section class="risk">
        <b>보류/경계</b>
        <ul>${sample.hold.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
        <p>${esc(sample.boundary.risk)}</p>
      </section>
      <details>
        <summary>점수와 UX 리스크</summary>
        <table>${dimensions.map((key) => `<tr><th>${esc(dimensionLabels[key])}</th><td>${sample.scores[key]}</td></tr>`).join("")}</table>
        <ul>${sample.uxProblems.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
      </details>
    </article>`;
    },
  )
  .join("\n");

const summaryHtml = `<section class="summary" data-section="executive-summary">
      <div>
        <p class="eyebrow">결론 먼저</p>
        <h2>대표 12개 중 우선 실험 후보는 ${esc(topSamples.map((sample) => sample.title).join(", "))}입니다.</h2>
        <p>이번 검증의 결론은 FlowMe가 원문을 복제하는 앱이 아니라, 원문을 실행 가능한 일정/체크/기록/상태로 바꾸는 앱이어야 한다는 점입니다.</p>
      </div>
      <ul>
        ${nextUxActions.slice(0, 4).map((action) => `<li>${esc(action)}</li>`).join("")}
      </ul>
    </section>`;

const reviewToolbarHtml = `<section class="review-toolbar" data-section="review-toolbar">
      <div>
        <h2>내 평가 저장</h2>
        <p>Codex 파일 미리보기에서는 버튼 저장이 막힐 수 있습니다. 메모를 실제 JSON/MD 파일에 저장하려면 아래 저장 가능한 로컬 페이지에서 입력하세요.</p>
        <p><a href="http://127.0.0.1:54521/review" target="_blank" rel="noreferrer">저장 가능한 리뷰 페이지 열기</a></p>
      </div>
      <div class="toolbar-actions">
        <label class="write-key"><span>저장 키</span><input type="password" data-review-write-key placeholder="필요 시 입력" /></label>
        <button type="button" data-export-reviews="json">JSON 내보내기</button>
        <button type="button" data-export-reviews="md">MD 내보내기</button>
      </div>
    </section>`;

const groupsHtml = `<section class="groups" data-section="priority-groups">
      <article><h2>Seed 우선 후보</h2><ul>${topSamples.map((sample) => `<li><b>${esc(sample.title)}</b><span>${sample.average} · ${esc(sample.verdict)}</span></li>`).join("")}</ul></article>
      <article><h2>제작자형 후보</h2><ul>${creatorOpsSamples.map((sample) => `<li><b>${esc(sample.title)}</b><span>공유/판매 인센티브 높음</span></li>`).join("")}</ul></article>
      <article><h2>UX 한계 검증</h2><ul>${uxRiskSamples.map((sample) => `<li><b>${esc(sample.title)}</b><span>${esc(sample.uxProblems[0])}</span></li>`).join("")}</ul></article>
      <article><h2>출처/위험 경계</h2><ul>${sensitiveSamples.map((sample) => `<li><b>${esc(sample.title)}</b><span>${esc(sample.boundary.risk)}</span></li>`).join("")}</ul></article>
    </section>`;

const reviewScript = `<script>
(() => {
  const storageKey = "flowme.creatorFlowReviewNotes.v1";
  const localApiOrigin = "http://127.0.0.1:54521";
  const isLocalHost = location.hostname === "127.0.0.1" || location.hostname === "localhost";
  const isReviewServer = isLocalHost && location.port === "54521";
  const canUseApi = isLocalHost || location.protocol === "file:";
  const apiUrl = isReviewServer ? "/api/reviews" : localApiOrigin + "/api/reviews";
  let notes = {};

  const readLocal = () => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  };

  const writeLocal = () => {
    localStorage.setItem(storageKey, JSON.stringify(notes));
  };

  const setStatus = (card, message) => {
    const status = card.querySelector("[data-review-status]");
    if (status) status.textContent = message;
  };

  const applyNote = (card, note) => {
    if (!note) return;
    const input = card.querySelector('input[type="radio"][value="' + note.rating + '"]');
    if (input) input.checked = true;
    const memo = card.querySelector("[data-review-memo]");
    if (memo) memo.value = note.memo || "";
    setStatus(card, note.savedToFile ? "파일 저장됨 " + new Date(note.updatedAt).toLocaleString() : "브라우저 저장됨");
  };

  const currentNoteFromCard = (card) => {
    const checked = card.querySelector('input[type="radio"]:checked');
    const memo = card.querySelector("[data-review-memo]");
    return {
      flowId: card.dataset.flowId,
      title: card.dataset.flowTitle,
      rating: checked ? Number(checked.value) : null,
      memo: memo ? memo.value.trim() : "",
      updatedAt: new Date().toISOString(),
    };
  };

  const downloadText = (filename, content, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const collectReviews = () => {
    document.querySelectorAll("[data-section='user-review']").forEach((card) => {
      const note = currentNoteFromCard(card);
      if (note.rating || note.memo) {
        notes[note.flowId] = { ...notes[note.flowId], ...note };
      }
    });
    writeLocal();
    return notes;
  };

  const exportMarkdown = (reviewMap) => {
    const rows = Object.values(reviewMap)
      .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
      .map((note) => {
        const memo = String(note.memo || "").replace(/\\|/g, "\\\\|").replace(/\\r?\\n/g, "<br>");
        return "| " + (note.title || note.flowId) + " | " + (note.rating || "") + " | " + memo + " | " + (note.updatedAt || "") + " |";
      });
    return ["# 제작자형 Flow 리뷰 메모", "", "| Flow | 점수 | 메모 | 저장 시각 |", "|---|---:|---|---|", ...rows, ""].join("\\n");
  };

  const saveToApi = async (note) => {
    if (!canUseApi) return { ok: false, reason: "file-mode" };
    const writeKey = document.querySelector("[data-review-write-key]")?.value?.trim() || sessionStorage.getItem("flowme.reviewWriteKey") || "";
    if (writeKey) sessionStorage.setItem("flowme.reviewWriteKey", writeKey);
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", ...(writeKey ? { "x-review-write-key": writeKey } : {}) },
      body: JSON.stringify(note),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, status: response.status, ...payload };
    return payload;
  };

  const loadApiNotes = async () => {
    if (!canUseApi) return {};
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) return {};
      const payload = await response.json();
      return Object.fromEntries(
        Object.entries(payload.reviews || {}).map(([flowId, note]) => [flowId, { ...note, savedToFile: true }]),
      );
    } catch {
      return {};
    }
  };

  document.addEventListener("click", async (event) => {
    const exportButton = event.target.closest("[data-export-reviews]");
    if (exportButton) {
      const reviewMap = collectReviews();
      const mode = exportButton.dataset.exportReviews;
      if (mode === "md") {
        downloadText("creator-flow-review-notes.md", exportMarkdown(reviewMap), "text/markdown;charset=utf-8");
      } else {
        downloadText("creator-flow-review-notes.json", JSON.stringify({ exportedAt: new Date().toISOString(), reviews: reviewMap }, null, 2) + "\\n", "application/json;charset=utf-8");
      }
      return;
    }

    const button = event.target.closest("[data-save-review]");
    if (!button) return;
    event.preventDefault();
    const card = button.closest("[data-section='user-review']");
    const note = currentNoteFromCard(card);
    if (!note.rating && !note.memo) {
      setStatus(card, "점수나 메모를 입력해주세요");
      return;
    }
    notes[note.flowId] = note;
    writeLocal();
    setStatus(card, "저장 중...");
    try {
      const result = await saveToApi(note);
      if (result.ok) {
        notes[note.flowId] = { ...note, savedToFile: true };
        writeLocal();
        setStatus(card, "파일 저장됨 " + new Date(note.updatedAt).toLocaleString());
      } else {
        const reason = result.error === "setup_missing" ? "서버 저장 설정 필요" : result.error === "auth_failed" ? "저장 키 확인 필요" : "상단 내보내기로 공유";
        setStatus(card, "브라우저 저장됨 · " + reason);
      }
    } catch (error) {
      setStatus(card, "브라우저 저장됨 · 상단 내보내기로 공유");
    }
  });

  (async () => {
    notes = { ...readLocal(), ...(await loadApiNotes()) };
    document.querySelectorAll("[data-section='user-review']").forEach((card) => {
      applyNote(card, notes[card.dataset.flowId]);
    });
  })();
})();
</script>`;

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>제작자형 Flow 정답 샘플</title>
  <style>
    body{margin:0;background:#f6f7f9;color:#172033;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}
    header{background:#111827;color:white;padding:32px 20px}.wrap,main{width:min(1120px,calc(100vw - 32px));margin:0 auto}
    h1{margin:0 0 8px;font-size:30px}.lead{color:#cbd5e1;max-width:900px}.stats,.grid,.groups{display:grid;gap:12px}.stats{grid-template-columns:repeat(4,minmax(0,1fr));margin:18px 0}.grid{grid-template-columns:repeat(2,minmax(0,1fr));padding-bottom:48px}.groups{grid-template-columns:repeat(4,minmax(0,1fr));margin:12px 0 18px}
    .stat,.card,.summary,.review-toolbar,.groups article{background:white;border:1px solid #dde3ec;border-radius:8px;box-shadow:0 8px 20px rgba(23,32,51,.05)}.stat{padding:14px}.stat b{display:block;font-size:26px}.card,.summary,.review-toolbar,.groups article{padding:14px}
    .summary,.review-toolbar{display:grid;grid-template-columns:1.15fr .85fr;gap:18px;margin:18px 0}.summary h2{font-size:22px}.review-toolbar h2{margin:0 0 6px}.review-toolbar p{margin:0;color:#475569}.toolbar-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap}.toolbar-actions button{border:0;border-radius:8px;background:#111827;color:white;font-weight:700;padding:9px 12px}.write-key{display:flex;align-items:center;gap:6px;color:#475569;font-size:12px}.write-key input{width:120px;border:1px solid #dbe3f0;border-radius:8px;padding:8px}.eyebrow{margin:0 0 6px;color:#2563eb;font-size:12px;font-weight:800}.groups h2{font-size:15px}.groups ul,.summary ul{padding-left:18px}.groups li{margin:0 0 8px}.groups span{display:block;color:#64748b;font-size:12px}
    .head{display:flex;justify-content:space-between;gap:12px}.head span{border:1px solid #bfdbfe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:4px 9px;font-weight:800;height:max-content}.meta{margin:0 0 4px;color:#64748b;font-size:12px}h2{margin:0;font-size:18px}
    .flow,.demo,.review{border:1px solid #dbeafe;background:#f8fbff;border-radius:8px;padding:10px}.demo{border-color:#bbf7d0;background:#f7fef9}.review{border-color:#c7d2fe;background:#fbfbff}.review-head{display:flex;align-items:center;justify-content:space-between;gap:10px}.review-head span{color:#64748b;font-size:12px}.rating{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.rating label{border:1px solid #dbe3f0;background:white;border-radius:999px;padding:4px 8px;font-size:13px}.rating input{margin-right:4px}.review textarea{box-sizing:border-box;width:100%;border:1px solid #dbe3f0;border-radius:8px;padding:8px;font:inherit;resize:vertical}.review button{margin-top:8px;border:0;border-radius:8px;background:#2563eb;color:white;font-weight:700;padding:8px 10px}.demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.demo ul{margin-top:4px}.risk{border:1px solid #fed7aa;background:#fffaf2;border-radius:8px;padding:10px}.chips{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0}.chips span{border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:2px 7px;font-size:12px}.done{color:#047857;font-weight:700}a{color:#2563eb;text-decoration:none}table{border-collapse:collapse;width:100%;margin-top:8px}th,td{border-top:1px solid #e5e7eb;padding:5px;text-align:left}small{color:#475569}@media(max-width:920px){.stats,.grid,.groups,.summary,.review-toolbar,.demo-grid{grid-template-columns:1fr}.toolbar-actions{justify-content:flex-start}}
  </style>
</head>
<body>
  <header><div class="wrap"><h1>제작자형 Flow 정답 샘플</h1><p class="lead">자동 exampleFlow를 신뢰하지 않고, 원문 실행 신호를 기준으로 사람이 검토한 대표 12개 Flow 샘플입니다.</p></div></header>
  <main>
    <section class="stats">
      <div class="stat"><b>${samples.length}</b><span>대표 샘플</span></div>
      <div class="stat"><b>${samples.filter((sample) => sample.depth === "deep").length}</b><span>Deep sample</span></div>
      <div class="stat"><b>${seedCandidates.length}</b><span>Seed 후보</span></div>
      <div class="stat"><b>${sourceStructures.length}</b><span>출처 구조</span></div>
    </section>
    ${summaryHtml}
    ${reviewToolbarHtml}
    ${groupsHtml}
    <section class="card"><h2>기존 자동 exampleFlow 진단</h2><ul>${autoFlowCritique.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></section>
    <h2>후보 상세</h2>
    <section class="grid">${cards}</section>
    <iframe name="review-save-frame" hidden title="review save target"></iframe>
  </main>
${reviewScript}
</body>
</html>`;

fs.writeFileSync(seedPath, JSON.stringify({ generatedAt: data.generatedAt, seedCandidates }, null, 2) + "\n", "utf8");
fs.writeFileSync(planPath, planMd, "utf8");
fs.writeFileSync(mdPath, samplesMd, "utf8");
fs.writeFileSync(rulesPath, rulesMd, "utf8");
fs.writeFileSync(htmlPath, html, "utf8");
fs.mkdirSync("public/content-audit", { recursive: true });
fs.writeFileSync(publicHtmlPath, html, "utf8");
console.log(`rebuilt ${samples.length} representative creator flow validation artifacts from ${samplesPath}`);
