import fs from "node:fs";

const outJson = "docs/content-audit/original-source-review/2026-05-31-creator-flow-source-catalog.json";
const outMd = "docs/content-audit/2026-05-31-creator-flow-source-catalog.md";
const outHtml = "docs/content-audit/2026-05-31-creator-flow-source-catalog.html";

const weights = {
  creatorShareIntent: 25,
  executableSequence: 25,
  repeatOrCohortUse: 20,
  audiencePortability: 15,
  sourceRiskBoundary: 10,
  inputSimplicity: 5,
};

const candidates = [
  {
    id: "C001",
    category: "콘텐츠 제작/운영",
    title: "Notion Basic Content Calendar",
    sourceUrl: "https://www.notion.com/templates/content-calendar",
    sourceKind: "creator_template",
    originalSummary: "콘텐츠를 글, 팟캐스트, 트윗 등 프로젝트 단위로 등록하고 담당자, 타입, 상태, 게시 일정을 관리하는 Notion 템플릿이다.",
    creatorShareReason: "크리에이터가 자기 콘텐츠 운영 방식을 그대로 템플릿화해 배포하거나 유료화하기 쉽다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + sheet",
      inputs: ["채널", "게시 주기", "콘텐츠 타입"],
      actions: ["이번 주 아이디어 5개 등록", "각 아이디어 상태를 초안/제작/예약으로 이동", "게시일을 캘린더에 배치", "게시 후 성과 메모"],
      records: ["상태", "게시일", "성과 메모"],
      completion: "게시 예정 콘텐츠가 날짜와 상태를 가진 실행 목록으로 정리됨",
    },
    scores: { creatorShareIntent: 5, executableSequence: 4.8, repeatOrCohortUse: 4.6, audiencePortability: 5, sourceRiskBoundary: 5, inputSimplicity: 4.5 },
  },
  {
    id: "C002",
    category: "콘텐츠 제작/운영",
    title: "Ktoolz Content Engine",
    sourceUrl: "https://ktoolz.gumroad.com/l/content-engine",
    sourceKind: "paid_creator_template",
    originalSummary: "아이디어, 스크립트, 촬영, 편집, 업로드, 게시, 성과 추적을 한 워크스페이스에 묶은 Gumroad Notion 템플릿이다.",
    creatorShareReason: "제작자의 실제 운영 파이프라인이 상품이 되는 전형적인 Creator Flow 후보이다.",
    flowContent: {
      structure: "pipeline",
      destination: "sheet + checklist",
      inputs: ["운영 채널", "게시 빈도", "콘텐츠 포맷"],
      actions: ["아이디어를 수집함", "스크립트 작성 상태로 이동", "촬영/편집 체크 완료", "게시 후 24시간 성과 기록"],
      records: ["단계", "게시일", "조회/반응", "다음 개선점"],
      completion: "콘텐츠 1개가 아이디어에서 게시/성과 기록까지 이동함",
    },
    scores: { creatorShareIntent: 5, executableSequence: 5, repeatOrCohortUse: 4.8, audiencePortability: 4.8, sourceRiskBoundary: 5, inputSimplicity: 4.2 },
  },
  {
    id: "C003",
    category: "콘텐츠 제작/운영",
    title: "Taskade Newsletter Content Calendar",
    sourceUrl: "https://www.taskade.com/templates/content-calendar/newsletter-content-calendar",
    sourceKind: "template",
    originalSummary: "뉴스레터 발행일, 주제, 길이 목표, CTA, 구독자 성장 추적을 포함한 에디토리얼 캘린더 템플릿이다.",
    creatorShareReason: "뉴스레터 작가가 자기 발행 시스템을 독자/동료 작가에게 공유하기 좋다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + memo",
      inputs: ["발행 요일", "뉴스레터 주제", "CTA"],
      actions: ["이번 호 주제 확정", "초안 작성일 배치", "발행 전 제목/CTA 확인", "발행 후 구독자/클릭 메모"],
      records: ["주제", "제목", "CTA", "성과"],
      completion: "뉴스레터 1회차가 발행되고 성과 메모가 남음",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.7, repeatOrCohortUse: 4.8, audiencePortability: 4.7, sourceRiskBoundary: 5, inputSimplicity: 4.6 },
  },
  {
    id: "C004",
    category: "콘텐츠 제작/운영",
    title: "Later Social Media Content Calendar for Notion",
    sourceUrl: "https://later.com/resources/downloadable/social-media-content-calendar-template-notion/",
    sourceKind: "template",
    originalSummary: "소셜 콘텐츠를 Notion에서 테이블, 캘린더, 보드로 보고 계획/스케줄링하는 무료 템플릿이다.",
    creatorShareReason: "SNS 운영자가 자신의 게시 루틴을 다른 크리에이터에게 복제 가능한 방식으로 공유할 수 있다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + sheet",
      inputs: ["플랫폼", "게시 목표", "캠페인"],
      actions: ["콘텐츠 아이디어 입력", "포맷과 채널 지정", "게시일 예약", "완료 후 성과 기록"],
      records: ["플랫폼", "포맷", "상태", "성과"],
      completion: "게시물이 캘린더에 예약되고 상태가 업데이트됨",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.6, repeatOrCohortUse: 4.7, audiencePortability: 4.8, sourceRiskBoundary: 5, inputSimplicity: 4.5 },
  },
  {
    id: "C005",
    category: "코스/디지털 상품",
    title: "7-Day Mini-Course Launch System",
    sourceUrl: "https://www.notion.com/en-gb/templates/course-launch-system",
    sourceKind: "creator_template",
    originalSummary: "7일 동안 시장 검증, 커리큘럼, 스크립트/녹화, 플랫폼 설정, 이메일, 세일즈 페이지, 런칭 체크를 진행하는 미니 코스 런칭 템플릿이다.",
    creatorShareReason: "강의 제작자가 자기 런칭 방법론을 일자별 실행 Flow로 판매하기 좋다.",
    flowContent: {
      structure: "timeline",
      destination: "calendar + checklist",
      inputs: ["런칭일", "코스 주제", "판매 채널"],
      actions: ["D-6 고객/오퍼 검증", "D-5 커리큘럼 작성", "D-3 녹화/업로드 준비", "D-day 판매 페이지 공개"],
      records: ["오퍼", "모듈", "이메일 상태", "런칭 결과"],
      completion: "런칭일까지 필수 자산과 공개 상태가 체크됨",
    },
    scores: { creatorShareIntent: 5, executableSequence: 5, repeatOrCohortUse: 4.5, audiencePortability: 4.6, sourceRiskBoundary: 4.7, inputSimplicity: 4 },
  },
  {
    id: "C006",
    category: "코스/디지털 상품",
    title: "Teachable Course Launch Checklist",
    sourceUrl: "https://www.teachable.com/blog/course-launch-checklist",
    sourceKind: "platform_checklist",
    originalSummary: "온라인 강의 런칭을 작은 작업으로 나누어 초보 제작자가 한 단계씩 체크하도록 설계된 체크리스트다.",
    creatorShareReason: "코스 제작자가 자기 런칭 준비 과정을 체크리스트 Flow로 공개/리드마그넷화하기 좋다.",
    flowContent: {
      structure: "checklist",
      destination: "checklist + memo",
      inputs: ["코스명", "런칭 목표일", "판매 플랫폼"],
      actions: ["강의 아웃라인 확정", "판매 페이지 준비", "이메일/홍보 자산 체크", "런칭 후 보완 메모"],
      records: ["준비 상태", "미완료 항목", "보완 메모"],
      completion: "런칭 전 필수 작업이 완료/보류로 정리됨",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 4.6, repeatOrCohortUse: 4.3, audiencePortability: 4.5, sourceRiskBoundary: 4.7, inputSimplicity: 4.4 },
  },
  {
    id: "C007",
    category: "코스/디지털 상품",
    title: "AnitaM Course Launch Checklist",
    sourceUrl: "https://anitam.com/course-launch-checklist/",
    sourceKind: "creator_lead_magnet",
    originalSummary: "니치 주제 결정, 아이디어 검증, 아웃라인, 모듈/레슨 제작, 온라인 스쿨 런칭 단계로 구성된 무료 체크리스트다.",
    creatorShareReason: "제작자의 전문성을 무료 체크리스트로 배포하고, 이후 강의/서비스로 연결하기 좋다.",
    flowContent: {
      structure: "timeline",
      destination: "checklist",
      inputs: ["코스 아이디어", "목표 고객", "런칭일"],
      actions: ["니치/고객 검증", "강의 아웃라인 작성", "모듈별 제작 상태 체크", "런칭 페이지 공개"],
      records: ["검증 결과", "모듈 상태", "런칭 메모"],
      completion: "아이디어가 강의 구조와 런칭 준비 항목으로 전환됨",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 4.5, repeatOrCohortUse: 4.2, audiencePortability: 4.4, sourceRiskBoundary: 4.7, inputSimplicity: 4.3 },
  },
  {
    id: "C008",
    category: "코스/디지털 상품",
    title: "Digital Product Starter Checklist",
    sourceUrl: "https://www.notion.com/nl/templates/digital-product-starter-checklist",
    sourceKind: "creator_template",
    originalSummary: "아이디어, 이름/브랜드, 제품 제작, 결제 도구, 가격, 마케팅, 런칭, 이후 개선을 다루는 디지털 상품 시작 체크리스트다.",
    creatorShareReason: "템플릿/전자책/강의 제작자의 공통 런칭 루틴을 Flow로 만들기 좋다.",
    flowContent: {
      structure: "checklist",
      destination: "checklist + sheet",
      inputs: ["상품 유형", "목표 고객", "런칭일"],
      actions: ["상품 아이디어 정리", "브랜드/가격 결정", "결제/판매 도구 준비", "런칭 후 개선 항목 기록"],
      records: ["상품명", "가격", "판매 링크", "개선점"],
      completion: "상품이 판매 가능한 링크와 체크 상태를 가짐",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 4.7, repeatOrCohortUse: 4.3, audiencePortability: 4.6, sourceRiskBoundary: 4.8, inputSimplicity: 4.2 },
  },
  {
    id: "C009",
    category: "코호트/교육 운영",
    title: "Launch Academy Cohort Course Management",
    sourceUrl: "https://t0ggles.com/templates/launch-academy",
    sourceKind: "creator_template",
    originalSummary: "코호트 강의의 레슨, 액션 아이템, 리플렉션, 제출물을 모듈과 일차 번호로 관리하는 보드 템플릿이다.",
    creatorShareReason: "교육자가 자기 수강생 운영 방식을 Flow로 배포하거나 코호트 운영 도구로 제공하기 좋다.",
    flowContent: {
      structure: "phase",
      destination: "calendar + checklist",
      inputs: ["코호트 시작일", "모듈 수", "제출물"],
      actions: ["모듈별 공개일 배치", "수강생 액션 아이템 체크", "리플렉션 제출 확인", "다음 모듈 안내"],
      records: ["모듈", "제출 상태", "피드백", "완료율"],
      completion: "각 모듈의 액션/제출/피드백 상태가 관리됨",
    },
    scores: { creatorShareIntent: 5, executableSequence: 4.9, repeatOrCohortUse: 4.8, audiencePortability: 4.6, sourceRiskBoundary: 4.8, inputSimplicity: 3.9 },
  },
  {
    id: "C010",
    category: "개발/학습 챌린지",
    title: "100 Days of Code Rules",
    sourceUrl: "https://www.100daysofcode.com/rules/",
    sourceKind: "community_challenge",
    originalSummary: "100일 동안 매일 최소 1시간 코딩하고, 매일 진행 상황을 공유하며, 같은 챌린지 참가자와 교류하는 규칙이다.",
    creatorShareReason: "제작자가 자신의 학습 커뮤니티나 코딩 챌린지를 FlowMe용 진행판으로 만들기 좋은 대표 사례다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + check",
      inputs: ["시작일", "학습 주제", "공유 채널"],
      actions: ["매일 1시간 코딩", "진행 상황 기록", "공유글 링크 저장", "주간 회고"],
      records: ["오늘 한 일", "공유 링크", "연속일", "막힌 점"],
      completion: "100일 중 각 날짜의 코딩/공유 상태가 기록됨",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 5, repeatOrCohortUse: 5, audiencePortability: 4.8, sourceRiskBoundary: 5, inputSimplicity: 4.8 },
  },
  {
    id: "C011",
    category: "습관/챌린지",
    title: "loggd.life 30-Day Challenge Tracker",
    sourceUrl: "https://loggd.life/tools/30-day-challenge",
    sourceKind: "challenge_tool",
    originalSummary: "30일 챌린지를 선택하거나 직접 만들고, 매일 체크하며, 진행률과 스트릭을 브라우저에 저장하는 도구다.",
    creatorShareReason: "제작자가 자기 챌린지 주제만 얹어 배포할 수 있는 범용 Flow 구조다.",
    flowContent: {
      structure: "routine",
      destination: "internal_check + calendar",
      inputs: ["챌린지명", "일일 목표", "기간"],
      actions: ["챌린지 시작", "매일 완료 체크", "놓친 날 메모", "완주 후 회고"],
      records: ["완료 여부", "스트릭", "회고"],
      completion: "정한 기간의 체크 상태와 완주 여부가 남음",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.9, repeatOrCohortUse: 5, audiencePortability: 4.9, sourceRiskBoundary: 4.8, inputSimplicity: 5 },
  },
  {
    id: "C012",
    category: "글쓰기/창작",
    title: "Diarly 30 Day Writing Challenge",
    sourceUrl: "https://diarly.app/blog/30-day-writing-challenge.html",
    sourceKind: "challenge_article",
    originalSummary: "30일 동안 하루 하나의 짧은 글쓰기 프롬프트를 수행해 매일 쓰는 습관을 만들도록 설계된 챌린지다.",
    creatorShareReason: "작가/코치가 자기 프롬프트 묶음을 Flow로 만들어 공유하기 좋다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + memo",
      inputs: ["시작일", "글쓰기 장소", "목표 시간"],
      actions: ["오늘 프롬프트 열기", "글 작성", "작성 링크/메모 저장", "주간 회고"],
      records: ["프롬프트", "작성 여부", "글 링크", "느낀 점"],
      completion: "30개 프롬프트에 대한 작성 여부와 기록이 남음",
    },
    scores: { creatorShareIntent: 4.5, executableSequence: 4.6, repeatOrCohortUse: 4.8, audiencePortability: 4.8, sourceRiskBoundary: 5, inputSimplicity: 4.8 },
  },
  {
    id: "C013",
    category: "글쓰기/창작",
    title: "30 Day Creative Kickstart Daily Blog",
    sourceUrl: "https://www.landrysims.com/blog/im-starting-a-daily-blog",
    sourceKind: "creator_blog",
    originalSummary: "30일 동안 매일 블로그 글 하나를 쓰겠다는 공개 챌린지형 글로, 매일 창작물을 발행하는 구조를 제안한다.",
    creatorShareReason: "제작자의 공개 선언과 실천 루틴을 팔로워가 따라 하는 Flow로 만들 수 있다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + memo",
      inputs: ["시작일", "발행 채널", "하루 산출물"],
      actions: ["오늘 주제 고르기", "초안 작성", "발행 링크 기록", "누락일 보류 처리"],
      records: ["주제", "발행 링크", "누락 사유"],
      completion: "30일 동안 발행/누락 상태가 기록됨",
    },
    scores: { creatorShareIntent: 4.4, executableSequence: 4.3, repeatOrCohortUse: 4.7, audiencePortability: 4.7, sourceRiskBoundary: 5, inputSimplicity: 4.8 },
  },
  {
    id: "C014",
    category: "언어/학습 챌린지",
    title: "ZenGengo 30-Day English Speaking Challenge",
    sourceUrl: "https://www.zengengo.com/30-day-challenge",
    sourceKind: "teacher_challenge",
    originalSummary: "교사가 30일 영어 말하기 코스를 가져와 학습자에게 링크를 공유하고, 등록 학습자의 진행과 제출에 피드백을 줄 수 있는 챌린지다.",
    creatorShareReason: "교사/코치가 자기 수업 챌린지를 링크 하나로 배포하고 학습자 진행을 관리하는 Flow에 가깝다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + internal_check",
      inputs: ["시작일", "학습자 그룹", "공유 링크"],
      actions: ["코스 가져오기", "학습자에게 링크 공유", "매일 말하기 과제 제출", "교사 피드백 기록"],
      records: ["제출 여부", "피드백", "최근 활동"],
      completion: "30일 과제 제출과 피드백 상태가 관리됨",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 4.8, repeatOrCohortUse: 5, audiencePortability: 4.5, sourceRiskBoundary: 5, inputSimplicity: 4.4 },
  },
  {
    id: "C015",
    category: "언어/학습 챌린지",
    title: "Skill Tandem 30-Day Learning Challenge",
    sourceUrl: "https://skilltandem.app/en/challenge/30-tage-lern-challenge/",
    sourceKind: "challenge_generator",
    originalSummary: "언어, 코딩, 기타, 사진, 요리 등 주제를 고르면 15~30분짜리 30일 학습 과제를 생성하고 브라우저에 진행률을 저장하는 도구다.",
    creatorShareReason: "제작자가 특정 스킬의 30일 학습 루틴을 만들어 배포하기 좋은 구조다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + check",
      inputs: ["학습 주제", "시작일", "하루 가능 시간"],
      actions: ["1일차 과제 시작", "매일 15~30분 학습", "막힌 점 기록", "완주 후 다음 단계 선택"],
      records: ["일차", "완료 여부", "학습 메모"],
      completion: "30일 학습 진행률과 메모가 남음",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 4.7, repeatOrCohortUse: 5, audiencePortability: 4.8, sourceRiskBoundary: 4.8, inputSimplicity: 4.7 },
  },
  {
    id: "C016",
    category: "운동/웰니스 챌린지",
    title: "30 Day 30 Minute Fitness Challenge",
    sourceUrl: "https://www.moritzfinedesigns.com/30-day-30-minute-fitness-challenge/",
    sourceKind: "printable_challenge",
    originalSummary: "매일 30분 운동을 달력에 넣고 무료 출력물을 사용해 30일 동안 실행을 추적하도록 안내하는 챌린지다.",
    creatorShareReason: "운동 코치가 자기 프로그램을 캘린더/체크 Flow로 배포하기 쉽다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + check",
      inputs: ["시작일", "운동 시간", "중단 조건"],
      actions: ["매일 30분 운동 예약", "완료 체크", "컨디션 기록", "통증 시 보류/문의 표시"],
      records: ["완료 여부", "컨디션", "통증/보류"],
      completion: "30일 운동 완료율과 중단/문의 기록이 남음",
    },
    scores: { creatorShareIntent: 4.4, executableSequence: 4.6, repeatOrCohortUse: 4.9, audiencePortability: 4.7, sourceRiskBoundary: 3.8, inputSimplicity: 4.8 },
  },
  {
    id: "C017",
    category: "운동/웰니스 챌린지",
    title: "플랭크 30일 챌린지 계획표",
    sourceUrl: "https://khj2510.tistory.com/entry/%ED%94%8C%EB%9E%AD%ED%81%AC-30%EC%9D%BC-%EC%B1%8C%EB%A6%B0%EC%A7%80-%EA%B3%84%ED%9A%8D%ED%91%9C-%EA%B3%B5%EC%9C%A0",
    sourceKind: "creator_blog",
    originalSummary: "난이도별 플랭크 30일 계획표, 휴식일, 자세 팁, 단계 낮추기 조건을 함께 정리한 블로그 콘텐츠다.",
    creatorShareReason: "피트니스 제작자가 일차별 운동량과 휴식일을 Flow로 만들어 공유하기 좋다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + check",
      inputs: ["시작일", "난이도", "중단 조건"],
      actions: ["오늘 플랭크 시간 확인", "운동 완료 체크", "휴식일 스트레칭 기록", "통증/실패 시 단계 낮추기"],
      records: ["일차", "운동 시간", "컨디션", "보류 사유"],
      completion: "30일 중 완료/휴식/보류 상태가 기록됨",
    },
    scores: { creatorShareIntent: 4.5, executableSequence: 4.8, repeatOrCohortUse: 4.9, audiencePortability: 4.7, sourceRiskBoundary: 3.6, inputSimplicity: 4.6 },
  },
  {
    id: "C018",
    category: "운동/웰니스 챌린지",
    title: "Cheqmark 30 Day Challenge Calendar",
    sourceUrl: "https://cheqmark.io/30-day-challenge-template",
    sourceKind: "printable_template",
    originalSummary: "요가, 행복, 사진, 디톡스 같은 30일 챌린지를 출력 가능한 캘린더로 추적하도록 설계한 템플릿 페이지다.",
    creatorShareReason: "다양한 제작자가 자기 주제만 바꿔 챌린지 캘린더를 만들 수 있는 구조다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + check",
      inputs: ["챌린지 주제", "기간", "일일 행동"],
      actions: ["챌린지 선택", "매일 행동 수행", "완료 표시", "완주 회고"],
      records: ["완료 여부", "느낀 점", "완주 여부"],
      completion: "30일 캘린더에 완료 상태가 쌓임",
    },
    scores: { creatorShareIntent: 4.5, executableSequence: 4.5, repeatOrCohortUse: 4.9, audiencePortability: 5, sourceRiskBoundary: 4.3, inputSimplicity: 5 },
  },
  {
    id: "C019",
    category: "목표/생산성",
    title: "12 Week Year Planner",
    sourceUrl: "https://www.notion.com/templates/12-week-year-planner",
    sourceKind: "creator_template",
    originalSummary: "12주 단위로 목표를 세우고 실행과 진행 상황을 추적하는 Notion 플래너 템플릿이다.",
    creatorShareReason: "생산성 제작자가 자기 목표 관리 방법론을 반복 실행 Flow로 판매/공유하기 좋다.",
    flowContent: {
      structure: "phase",
      destination: "sheet + calendar",
      inputs: ["12주 시작일", "목표", "주간 전술"],
      actions: ["12주 목표 확정", "주간 실행 항목 배치", "매일 실행 체크", "주간 점수/회고 기록"],
      records: ["목표", "전술", "주간 점수", "회고"],
      completion: "12주 목표별 전술과 주간 실행률이 기록됨",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 4.8, repeatOrCohortUse: 4.8, audiencePortability: 4.6, sourceRiskBoundary: 5, inputSimplicity: 3.8 },
  },
  {
    id: "C020",
    category: "글쓰기/창작",
    title: "WriterOS for 12 Week Year for Writers",
    sourceUrl: "https://www.12weekyearforwriters.com/writeros",
    sourceKind: "paid_creator_template",
    originalSummary: "작가를 위한 12 Week Year 기반 Notion 운영체제로, 목표, 작업, 주간 계획, 데일리 허들, 글쓰기 진행 추적을 통합한다.",
    creatorShareReason: "작가/코치가 자기 글쓰기 관리 시스템을 구체적인 유료 Flow로 상품화한 사례다.",
    flowContent: {
      structure: "phase",
      destination: "sheet + memo",
      inputs: ["프로젝트명", "12주 목표", "주간 글쓰기 목표"],
      actions: ["12주 글쓰기 목표 설정", "주간 전술 배치", "데일리 허들 기록", "주간 진척 리뷰"],
      records: ["단어 수", "진척", "막힌 점", "다음 액션"],
      completion: "글쓰기 목표의 주간 실행과 리뷰가 누적됨",
    },
    scores: { creatorShareIntent: 5, executableSequence: 4.8, repeatOrCohortUse: 4.6, audiencePortability: 4.4, sourceRiskBoundary: 5, inputSimplicity: 3.8 },
  },
  {
    id: "C021",
    category: "사진/창작 챌린지",
    title: "iPhotography 30 Day Photography Challenge",
    sourceUrl: "https://d1mlukbqb3dh9w.cloudfront.net/Downloadables/30%20Day%20Photography%20Challenge%20by%20iPhotography.pdf",
    sourceKind: "printable_challenge",
    originalSummary: "30일 동안 매일 다른 사진 주제를 수행하는 출력형 사진 챌린지 PDF다.",
    creatorShareReason: "사진 강사나 크리에이터가 과제형 챌린지를 팔로워에게 공유하기 좋은 형태다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + memo",
      inputs: ["시작일", "촬영 주제", "업로드 채널"],
      actions: ["오늘 촬영 주제 확인", "사진 촬영", "업로드/저장 링크 기록", "주간 베스트 선택"],
      records: ["주제", "사진 링크", "피드백"],
      completion: "30개 촬영 과제의 완료 상태와 결과물이 남음",
    },
    scores: { creatorShareIntent: 4.5, executableSequence: 4.5, repeatOrCohortUse: 4.7, audiencePortability: 4.8, sourceRiskBoundary: 5, inputSimplicity: 4.7 },
  },
  {
    id: "C022",
    category: "크리에이터 수익화",
    title: "Crekit Creator Monetization Page Builder",
    sourceUrl: "https://crekit.io/",
    sourceKind: "creator_platform",
    originalSummary: "전자책, 템플릿, 온라인 강의, 멤버십 등 콘텐츠와 경험/지식을 판매 페이지로 만들고 수익화하도록 돕는 국내 크리에이터 플랫폼이다.",
    creatorShareReason: "Flow 제작자가 결과물을 판매/배포하는 후속 목적지를 보여주는 국내 레퍼런스다.",
    flowContent: {
      structure: "checklist",
      destination: "checklist + memo",
      inputs: ["판매할 지식/콘텐츠", "상품 유형", "판매 페이지 링크"],
      actions: ["상품 유형 선택", "판매 페이지 초안 작성", "결제/체크박스 설정", "공개 후 문의/판매 기록"],
      records: ["상품명", "가격", "판매 링크", "문의"],
      completion: "콘텐츠가 판매 가능한 페이지와 운영 체크 상태를 가짐",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.2, repeatOrCohortUse: 4.2, audiencePortability: 4.3, sourceRiskBoundary: 4.5, inputSimplicity: 4.4 },
  },
  {
    id: "C023",
    category: "언어/학습 챌린지",
    title: "퇴근 후 30분 영어 공부 루틴",
    sourceUrl: "https://theartin.tistory.com/entry/%ED%87%B4%EA%B7%BC-%ED%9B%84-30%EB%B6%84-%ED%98%84%EC%8B%A4%EC%A0%81%EC%9C%BC%EB%A1%9C-%EC%8B%A4%EC%B2%9C-%EA%B0%80%EB%8A%A5%ED%95%9C-%EC%98%81%EC%96%B4-%EA%B3%B5%EB%B6%80-%EB%A3%A8%ED%8B%B4",
    sourceKind: "creator_blog",
    originalSummary: "퇴근 후 30분을 듣기, 스피킹/라이팅, 반복 청취로 나누는 직장인 영어 루틴 글이다.",
    creatorShareReason: "어학 제작자가 자기 루틴을 매일 실행 체크와 기록 Flow로 공유하기 좋다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + memo",
      inputs: ["시작일", "하루 30분 시간대", "사용 콘텐츠"],
      actions: ["듣기 10분", "따라 말하기/쓰기", "오늘 문장 기록", "주간 복습"],
      records: ["사용 콘텐츠", "오늘 문장", "완료 여부"],
      completion: "30분 루틴 완료 여부와 학습 메모가 남음",
    },
    scores: { creatorShareIntent: 4.3, executableSequence: 4.4, repeatOrCohortUse: 4.8, audiencePortability: 4.6, sourceRiskBoundary: 4.8, inputSimplicity: 4.8 },
  },
  {
    id: "C024",
    category: "생활 루틴/회복",
    title: "퇴근 후 30분 회복 루틴",
    sourceUrl: "https://sitelensai.tistory.com/8",
    sourceKind: "creator_blog",
    originalSummary: "퇴근 후 30분을 스트레칭, 눈 휴식, 마이크로러닝으로 나누는 직장인 회복 루틴 글이다.",
    creatorShareReason: "직장인 생산성/건강 제작자가 자신의 회복 루틴을 체크형 Flow로 공유할 수 있다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + check",
      inputs: ["퇴근 시간", "회복 루틴 시간", "중단 조건"],
      actions: ["스트레칭", "눈 휴식", "짧은 학습", "컨디션 기록"],
      records: ["완료 여부", "컨디션", "중단 사유"],
      completion: "퇴근 후 루틴 수행 여부와 컨디션 기록이 남음",
    },
    scores: { creatorShareIntent: 4.2, executableSequence: 4.3, repeatOrCohortUse: 4.7, audiencePortability: 4.5, sourceRiskBoundary: 3.8, inputSimplicity: 4.8 },
  },
  {
    id: "C025",
    category: "독서/커뮤니티 운영",
    title: "Notion 독서 기록 플래너",
    sourceUrl: "https://www.notion.com/ko/templates/booka",
    sourceKind: "creator_template",
    originalSummary: "노션 마켓플레이스의 독서 기록 플래너 템플릿으로, 제작자 노슈니의 템플릿과 리뷰, 제작자 연락/공유 구조가 확인된다.",
    creatorShareReason: "독서법/기록법 제작자가 자기 독서 루틴을 템플릿으로 공유하고, 사용자는 책별 기록과 목표를 그대로 실행할 수 있다.",
    flowContent: {
      structure: "routine",
      destination: "sheet + memo",
      inputs: ["읽을 책", "독서 목표", "기록 방식"],
      actions: ["이번 달 읽을 책 등록", "읽은 날짜와 진도 기록", "핵심 문장/메모 저장", "완독 후 요약 작성"],
      records: ["책 제목", "진도", "핵심 문장", "완독 여부"],
      completion: "책별 독서 진도와 완독 메모가 남음",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.4, repeatOrCohortUse: 4.7, audiencePortability: 4.8, sourceRiskBoundary: 5, inputSimplicity: 4.6 },
  },
  {
    id: "C026",
    category: "독서/커뮤니티 운영",
    title: "네이버 프리미엄콘텐츠 독서 소모임 Notion 템플릿",
    sourceUrl: "https://contents.premium.naver.com/chunlauinotion/chunlanotion/products/240711164907978py",
    sourceKind: "paid_creator_template",
    originalSummary: "특정 기간 동안 책을 함께 읽고 독후감, 회의록, 출석부, 회원 리스트, 공지사항을 관리하는 유료 노션 템플릿이다.",
    creatorShareReason: "소모임 운영자가 자기 운영 방식을 그대로 상품화한 사례이며, FlowMe에서는 모임 회차/출석/독후감 제출 Flow로 바꾸기 좋다.",
    flowContent: {
      structure: "phase",
      destination: "calendar + sheet",
      inputs: ["모임 시작일", "목표 도서", "참여자"],
      actions: ["회차별 읽을 범위 등록", "모임일 캘린더 배치", "독후감 제출 체크", "출석/회의록 기록"],
      records: ["도서", "회차", "출석", "독후감", "회의록"],
      completion: "회차별 읽기/출석/독후감 상태가 정리됨",
    },
    scores: { creatorShareIntent: 4.9, executableSequence: 4.8, repeatOrCohortUse: 4.8, audiencePortability: 4.6, sourceRiskBoundary: 4.9, inputSimplicity: 4.1 },
  },
  {
    id: "C027",
    category: "운동/웰니스 챌린지",
    title: "CLASS101 크리에이터 빵느의 홈트 캘린더",
    sourceUrl: "https://cdn.class101.net/attachment/d1a53049-893d-4e2a-a31b-4de4da1eb49f.pdf",
    sourceKind: "creator_pdf_calendar",
    originalSummary: "CLASS101 크리에이터 빵느의 홈트 캘린더 PDF로, 요일별 스트레칭, 타바타, 복부/하체/상체 운동, 보충일이 배치되어 있다.",
    creatorShareReason: "운동 크리에이터가 자기 영상 묶음을 월간 실행 캘린더로 포장해 배포하는 명확한 Flow 사례다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + check",
      inputs: ["시작일", "운동 난이도", "휴식/중단 조건"],
      actions: ["오늘 운동명 확인", "운동 영상/루틴 실행", "완료와 컨디션 체크", "보충일에 밀린 운동 처리"],
      records: ["운동명", "완료 여부", "컨디션", "보충 여부"],
      completion: "홈트 캘린더의 날짜별 운동 완료 상태가 남음",
    },
    scores: { creatorShareIntent: 4.9, executableSequence: 4.9, repeatOrCohortUse: 5, audiencePortability: 4.7, sourceRiskBoundary: 3.7, inputSimplicity: 4.7 },
  },
  {
    id: "C028",
    category: "콘텐츠 제작/운영",
    title: "CLASS101 카드뉴스 제작 PDF",
    sourceUrl: "https://class101.net/ko/products/60e1b57f73ffc7000d2e2d31",
    sourceKind: "paid_creator_pdf",
    originalSummary: "브랜딩, 콘텐츠 제작 기획, 제작 도움 사이트, Q&A를 포함한 카드뉴스 제작 PDF 상품이다.",
    creatorShareReason: "콘텐츠 전문가가 자기 제작 프로세스를 판매하는 사례이며, FlowMe에서는 카드뉴스 1건 제작 파이프라인으로 전환 가능하다.",
    flowContent: {
      structure: "pipeline",
      destination: "checklist + memo",
      inputs: ["콘텐츠 주제", "목표 채널", "게시일"],
      actions: ["브랜딩/목적 정리", "카드뉴스 구성안 작성", "디자인/검수 체크", "게시 후 반응 기록"],
      records: ["주제", "구성안", "검수 상태", "게시 링크"],
      completion: "카드뉴스 1건이 기획에서 게시/성과 기록까지 이동함",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 4.5, repeatOrCohortUse: 4.4, audiencePortability: 4.5, sourceRiskBoundary: 4.8, inputSimplicity: 4.3 },
  },
  {
    id: "C029",
    category: "창작/연습 템플릿",
    title: "CLASS101 김나 캘리그라피 체본집",
    sourceUrl: "https://class101.net/ko/products/6221b788fae877001323d78f",
    sourceKind: "creator_practice_pdf",
    originalSummary: "100문장 이상의 체본을 PDF로 받아 붓펜이나 아이패드로 연습하고, 구매자는 3회 무료 피드백을 받을 수 있는 캘리그라피 체본집이다.",
    creatorShareReason: "창작자가 연습 자료와 피드백 루틴을 함께 상품화한 사례로, 일차별 연습/제출/피드백 Flow에 적합하다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + memo",
      inputs: ["시작일", "연습 도구", "피드백 제출일"],
      actions: ["오늘 문장 연습", "연습 사진 저장", "피드백 받을 회차 표시", "수정 포인트 기록"],
      records: ["문장", "사진 링크", "피드백", "수정 포인트"],
      completion: "연습 결과와 피드백 상태가 누적됨",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 4.6, repeatOrCohortUse: 4.8, audiencePortability: 4.6, sourceRiskBoundary: 4.9, inputSimplicity: 4.5 },
  },
  {
    id: "C030",
    category: "창작/연습 템플릿",
    title: "CLASS101 코바늘 인형블랭킷 PDF 도안",
    sourceUrl: "https://class101.net/ko/products/6159268a1e247c000dca39ff",
    sourceKind: "creator_pattern_pdf",
    originalSummary: "한글 서술 도안, 차트 도안, 과정 샷, 뜨는 법 동영상 링크를 포함한 코바늘 인형블랭킷 PDF 도안 상품이다.",
    creatorShareReason: "공예 제작자가 도안과 과정 링크를 판매하는 사례이며, 사용자는 단계별 제작 체크와 진행 사진 기록이 필요하다.",
    flowContent: {
      structure: "checklist",
      destination: "checklist + memo",
      inputs: ["작품명", "재료 준비일", "완성 목표일"],
      actions: ["재료/도구 확인", "도안 단계 시작", "진행 사진 저장", "막힌 단계 메모"],
      records: ["단계", "진행 사진", "막힌 점", "완성 여부"],
      completion: "도안 단계별 진행 상태와 완성 기록이 남음",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.6, repeatOrCohortUse: 4.4, audiencePortability: 4.5, sourceRiskBoundary: 4.6, inputSimplicity: 4.2 },
  },
  {
    id: "C031",
    category: "목표/생산성",
    title: "CLASS101 블록 플래너 활용법",
    sourceUrl: "https://class101.net/ko/products/nxp1xzo9CveqOF3Afug8",
    sourceKind: "creator_planner_method",
    originalSummary: "5년 동안 사용하며 만든 집중력 플래너의 활용법과 부가 페이지/기능 사용 방법, 코칭 가능성을 소개하는 클래스다.",
    creatorShareReason: "제작자의 개인 생산성 방법론을 플래너 사용 Flow로 구조화해 공유/판매하는 사례다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + sheet",
      inputs: ["집중 목표", "블록 시간", "리뷰 요일"],
      actions: ["오늘 블록 계획", "블록별 실행 체크", "방해 요소 기록", "주간 리뷰"],
      records: ["블록", "완료 여부", "방해 요소", "리뷰"],
      completion: "시간 블록별 실행 상태와 주간 리뷰가 남음",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 4.5, repeatOrCohortUse: 4.8, audiencePortability: 4.6, sourceRiskBoundary: 5, inputSimplicity: 4.3 },
  },
  {
    id: "C032",
    category: "창작/연습 템플릿",
    title: "CLASS101 인형옷 PDF 패턴",
    sourceUrl: "https://class101.net/en/products/628daf5cbfc12e000f45ef09",
    sourceKind: "creator_pattern_pdf",
    originalSummary: "인형옷 제작용 PDF 패턴과 동영상 링크가 포함된 다운로드 상품으로, 출력 방식과 완제품 판매 제한 등 사용 조건이 있다.",
    creatorShareReason: "도안 제작자가 패턴/영상 링크/사용 조건을 묶어 배포하는 사례이며, 사용자는 제작 단계와 라이선스 메모를 함께 관리해야 한다.",
    flowContent: {
      structure: "checklist",
      destination: "checklist + memo",
      inputs: ["작품명", "패턴 출력일", "사용 조건 확인"],
      actions: ["패턴 실제 크기 출력", "재료 준비", "단계별 제작 체크", "사용 조건/완성 사진 기록"],
      records: ["출력 여부", "제작 단계", "완성 사진", "사용 조건"],
      completion: "패턴 출력부터 완성 사진과 사용 조건 확인까지 기록됨",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 4.5, repeatOrCohortUse: 4.3, audiencePortability: 4.4, sourceRiskBoundary: 4.5, inputSimplicity: 4.2 },
  },
  {
    id: "C033",
    category: "식물/반려 생활 루틴",
    title: "Notion Plant Care Tracker",
    sourceUrl: "https://www.notion.com/templates/plant-care-tracker",
    sourceKind: "creator_template",
    originalSummary: "식물 데이터베이스, 물주기 날짜 기록, 성장 노트, 관리 지식 라이브러리, 비료/흙/화분 재고를 묶은 식물 관리 Notion 템플릿이다.",
    creatorShareReason: "식물 관리 노하우를 가진 제작자가 종별 관리 주기와 관찰 기록 방식을 Flow로 공유하기 좋고, 사용자는 반복 일정과 성장 메모를 바로 남길 수 있다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + memo",
      inputs: ["식물명", "물주기 주기", "마지막 관리일"],
      actions: ["보유 식물 등록", "물주기/분갈이 반복일 생성", "오늘 관리 완료 체크", "성장 변화 사진/메모 기록"],
      records: ["관리일", "식물 상태", "사진", "재고"],
      completion: "식물별 마지막 관리일과 다음 관리일, 관찰 메모가 갱신됨",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.8, repeatOrCohortUse: 5, audiencePortability: 4.8, sourceRiskBoundary: 4.8, inputSimplicity: 4.7 },
  },
  {
    id: "C034",
    category: "식물/반려 생활 루틴",
    title: "Artonaut Pet Care Tracker",
    sourceUrl: "https://www.notion.com/templates/pet-care-tracker-173",
    sourceKind: "paid_creator_template",
    originalSummary: "반려동물 프로필, 건강 상태, 마지막 병원 방문일, 구매/예약/청소 작업 스케줄, 용품 재고, 지식 라이브러리, 이벤트 저널을 포함한 유료 템플릿이다.",
    creatorShareReason: "펫시터, 보호자 커뮤니티, 반려동물 콘텐츠 제작자가 관리 루틴을 Flow로 판매하기 좋다. 다만 건강 판단은 공식/전문가 상담과 분리해야 한다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + sheet + memo",
      inputs: ["반려동물 이름", "예방/미용/청소 주기", "마지막 병원 방문일"],
      actions: ["반려동물 프로필 등록", "예방접종/미용/청소 반복일 생성", "용품 재고 확인", "병원 방문/이상 징후 메모"],
      records: ["예약일", "관리 상태", "용품 재고", "건강 메모"],
      completion: "반려동물별 다음 관리 일정과 관리/방문 기록이 남음",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.8, repeatOrCohortUse: 5, audiencePortability: 4.7, sourceRiskBoundary: 4.3, inputSimplicity: 4.3 },
  },
  {
    id: "C035",
    category: "식물/반려 생활 루틴",
    title: "Notion Pet Care",
    sourceUrl: "https://www.notion.com/templates/notion-pet-care",
    sourceKind: "creator_template",
    originalSummary: "반려동물의 일상 루틴을 놓치지 않도록 커스터마이즈 가능한 목록으로 케어 스케줄을 정리하는 Notion 템플릿이다.",
    creatorShareReason: "복잡한 건강 관리보다 산책, 급여, 미용, 청소 같은 반복 루틴을 제작자가 가볍게 배포하기 좋은 형태다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + checklist",
      inputs: ["반려동물", "반복 루틴", "알림 요일"],
      actions: ["주요 루틴 선택", "요일별 반복 배치", "오늘 루틴 완료 체크", "빠진 루틴만 보정"],
      records: ["루틴", "완료 여부", "메모"],
      completion: "오늘 반려동물 루틴의 완료/미완료 상태가 정리됨",
    },
    scores: { creatorShareIntent: 4.4, executableSequence: 4.5, repeatOrCohortUse: 5, audiencePortability: 4.6, sourceRiskBoundary: 4.5, inputSimplicity: 4.8 },
  },
  {
    id: "C036",
    category: "육아/가족 기록",
    title: "Baby Tracker AI enhanced",
    sourceUrl: "https://www.notion.com/templates/baby-tracker-newborn-feeding-sleep-log-shared-parent-pl",
    sourceKind: "paid_creator_template",
    originalSummary: "수유, 수면, 기저귀, 병원 노트, 부모 작업, 일간/주간 요약을 한 대시보드에서 관리하는 신생아 기록 템플릿이다.",
    creatorShareReason: "육아 콘텐츠 제작자가 초보 부모용 기록 Flow로 제공하기 좋지만, 의학 판단 대신 기록/공유/상담 준비 용도로 제한해야 한다.",
    flowContent: {
      structure: "log_routine",
      destination: "sheet + memo",
      inputs: ["아기 월령", "기록 항목", "공유 보호자"],
      actions: ["오늘 기록 항목 선택", "수유/수면/기저귀 기록", "병원 메모 분리", "주간 요약 확인"],
      records: ["시간", "항목", "상태", "상담 메모"],
      completion: "오늘 육아 기록과 공유할 요약 메모가 남음",
    },
    scores: { creatorShareIntent: 4.5, executableSequence: 4.8, repeatOrCohortUse: 5, audiencePortability: 4.7, sourceRiskBoundary: 4.1, inputSimplicity: 4.1 },
  },
  {
    id: "C037",
    category: "이벤트/결혼 준비",
    title: "The Wedding Planner",
    sourceUrl: "https://www.notion.com/templates/the-wedding-planner",
    sourceKind: "paid_creator_template",
    originalSummary: "12개월 전부터 결혼 전날까지의 체크리스트, 예산, 게스트 리스트, 좌석 배치, 업체, 웨딩 당일 타임라인을 포함한 결혼 준비 템플릿이다.",
    creatorShareReason: "웨딩 플래너나 결혼 준비 경험자가 자기 체크리스트를 Flow로 상품화하기 좋다. 날짜 기준 타임라인과 비교/결정 기록이 강하다.",
    flowContent: {
      structure: "timeline",
      destination: "calendar + sheet",
      inputs: ["결혼식 날짜", "예산", "게스트 규모"],
      actions: ["D-12개월 타임라인 생성", "업체 후보 비교", "게스트/좌석 상태 업데이트", "당일 타임라인 확정"],
      records: ["마감일", "업체", "예산", "결정 메모"],
      completion: "결혼식 날짜 기준 체크리스트와 주요 결정 상태가 정리됨",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 4.9, repeatOrCohortUse: 4.2, audiencePortability: 4.8, sourceRiskBoundary: 4.7, inputSimplicity: 3.8 },
  },
  {
    id: "C038",
    category: "이벤트/결혼 준비",
    title: "Grace Digitals Wedding Planner",
    sourceUrl: "https://www.notion.com/templates/wedding-planner-178",
    sourceKind: "paid_creator_template",
    originalSummary: "카운트다운, 예산, 업체, 게스트, 일정 이벤트, 감사 카드, 사진 샷 리스트, 허니문 플래너 등을 묶은 결혼 준비 템플릿이다.",
    creatorShareReason: "결혼 준비라는 큰 이벤트를 여러 산출물로 쪼개 판매하는 사례이며, FlowMe에서는 필수 입력과 핵심 체크만 남겨야 한다.",
    flowContent: {
      structure: "phase",
      destination: "hybrid",
      inputs: ["결혼식 날짜", "담당자", "예산 한도"],
      actions: ["준비 단계 선택", "이번 달 마감만 추출", "업체/게스트 상태 업데이트", "완료/보류 결정 기록"],
      records: ["단계", "담당자", "예산", "보류 사유"],
      completion: "현재 단계의 마감과 결정/보류 항목이 업데이트됨",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.7, repeatOrCohortUse: 4.1, audiencePortability: 4.7, sourceRiskBoundary: 4.7, inputSimplicity: 3.7 },
  },
  {
    id: "C039",
    category: "집안일/생활 운영",
    title: "Home Cleaning Calendar & Planner",
    sourceUrl: "https://www.notion.com/templates/home-cleaning",
    sourceKind: "creator_template",
    originalSummary: "청소 일정을 일간/주간/월간/연간 작업으로 나누고, 공간별 청소 항목을 배정해 집안일 루틴을 관리하는 Notion 템플릿이다.",
    creatorShareReason: "살림/정리 콘텐츠 제작자가 자기 청소 루틴을 Flow로 배포하기 좋고, 사용자는 캘린더와 체크리스트로 바로 실행할 수 있다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + checklist",
      inputs: ["집 구조", "청소 주기", "담당자"],
      actions: ["공간별 청소 항목 선택", "반복 주기 배치", "오늘 청소 완료 체크", "밀린 항목만 다음 날짜로 이동"],
      records: ["공간", "주기", "담당자", "밀림 여부"],
      completion: "오늘 청소 항목과 다음 반복일이 정리됨",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 4.8, repeatOrCohortUse: 5, audiencePortability: 4.8, sourceRiskBoundary: 4.9, inputSimplicity: 4.6 },
  },
  {
    id: "C040",
    category: "여행/일정 설계",
    title: "Something Organized Travel Planner",
    sourceUrl: "https://www.notion.com/templates/travel-planner-itinerary-bucket-list",
    sourceKind: "paid_creator_template",
    originalSummary: "여러 여행, 교통/숙소 예약, 일자별 일정, 예산, 환율, 짐 목록, 여행자 문서, 여행 저널을 한 워크스페이스에서 관리하는 유료 여행 템플릿이다.",
    creatorShareReason: "여행 크리에이터가 자기 여행 준비법을 상품화하기 좋다. 다만 너무 많은 데이터베이스는 FlowMe에서는 출발일 기준 핵심 실행만 남겨야 한다.",
    flowContent: {
      structure: "timeline",
      destination: "calendar + memo",
      inputs: ["여행지", "출발일", "동행자"],
      actions: ["출발일 기준 준비 일정 생성", "항공/숙소 예약 정보 입력", "일자별 핵심 일정 배치", "짐 목록과 문서 확인"],
      records: ["예약 링크", "예산", "준비 상태", "여행 메모"],
      completion: "출발 전 준비와 일자별 핵심 일정이 캘린더/메모로 정리됨",
    },
    scores: { creatorShareIntent: 4.7, executableSequence: 4.8, repeatOrCohortUse: 4.5, audiencePortability: 4.9, sourceRiskBoundary: 4.8, inputSimplicity: 3.9 },
  },
  {
    id: "C041",
    category: "여행/일정 설계",
    title: "MyHueDesigns Travel Planner",
    sourceUrl: "https://www.notion.com/templates/travel-planner-322",
    sourceKind: "paid_creator_template",
    originalSummary: "여행 목록, 예산/지출, 일정, 예약, 여행 저널, 짐 목록, 여행 전/중/후 할 일을 포함한 여행 플래너 템플릿이다.",
    creatorShareReason: "여행 준비 콘텐츠가 Flow로 바뀌었을 때 어떤 산출물이 필요한지 잘 보여준다. 짐 목록, 예약, 일자별 일정이 명확하다.",
    flowContent: {
      structure: "timeline",
      destination: "hybrid",
      inputs: ["여행명", "출발일", "예산"],
      actions: ["여행 전 체크리스트 생성", "예약 정보 정리", "일자별 일정 배치", "여행 후 기록 남기기"],
      records: ["예약", "비용", "일정", "저널"],
      completion: "여행 준비/일정/기록이 하나의 Flow로 연결됨",
    },
    scores: { creatorShareIntent: 4.5, executableSequence: 4.7, repeatOrCohortUse: 4.4, audiencePortability: 4.8, sourceRiskBoundary: 4.8, inputSimplicity: 4.1 },
  },
  {
    id: "C042",
    category: "돈/예산 루틴",
    title: "Finances Planner - Budget, Expenses, Goals",
    sourceUrl: "https://www.notion.com/en-gb/templates/finances-planner-budget-expenses-savings-bills-tracker",
    sourceKind: "creator_template",
    originalSummary: "기간별 예산, 지출, 저축 목표, 돈 흐름을 추적하고 목표 기여분을 예산 안에서 연결하는 재무 플래너 템플릿이다.",
    creatorShareReason: "가계부 제작자가 월간 예산 리뷰 Flow를 공유하기 좋은 사례다. 투자/재무 조언이 아니라 기록과 리마인더로 제한해야 한다.",
    flowContent: {
      structure: "routine",
      destination: "sheet + calendar",
      inputs: ["월 예산", "저축 목표", "리뷰일"],
      actions: ["이번 달 예산 입력", "고정 지출/목표 기여일 생성", "주간 지출 점검", "월말 예산 리뷰"],
      records: ["예산", "지출", "목표 기여", "리뷰 메모"],
      completion: "월 예산 대비 지출과 목표 기여 상태가 기록됨",
    },
    scores: { creatorShareIntent: 4.4, executableSequence: 4.6, repeatOrCohortUse: 5, audiencePortability: 4.7, sourceRiskBoundary: 4.2, inputSimplicity: 4.2 },
  },
  {
    id: "C043",
    category: "돈/예산 루틴",
    title: "52-Week Savings Challenge Notion Template",
    sourceUrl: "https://www.notionry.com/templates/52-week-savings-challenge-notion-template",
    sourceKind: "challenge_template",
    originalSummary: "52주 저축 챌린지를 따라가며 매주 저축 상태를 추적하는 Notion 템플릿이다.",
    creatorShareReason: "금융 조언 없이도 제작자가 '저축 습관 챌린지'를 판매/공유할 수 있는 구조다. 금액은 사용자가 정하고 Flow는 반복 체크만 담당한다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + sheet",
      inputs: ["시작일", "주간 저축 규칙", "목표 금액"],
      actions: ["52주 저축표 생성", "이번 주 저축액 입력", "미납 주차 표시", "월말 누적액 확인"],
      records: ["주차", "저축액", "누적액", "미납 여부"],
      completion: "주차별 저축 실행 상태와 누적액이 갱신됨",
    },
    scores: { creatorShareIntent: 4.5, executableSequence: 4.7, repeatOrCohortUse: 5, audiencePortability: 4.8, sourceRiskBoundary: 4.3, inputSimplicity: 4.8 },
  },
  {
    id: "C044",
    category: "식단/장보기 루틴",
    title: "Life in Notion Meal Planner",
    sourceUrl: "https://www.notionry.com/templates/meal-planner-notion-template",
    sourceKind: "creator_template",
    originalSummary: "레시피와 식사 아이디어를 저장하고, 주간 식단을 계획하며, 장보기 목록을 자동으로 만드는 식단 플래너 템플릿이다.",
    creatorShareReason: "요리/식단 제작자가 레시피 묶음을 실행 루틴으로 팔기 좋은 구조다. 건강 효능 주장보다 장보기와 주간 계획에 초점을 둬야 한다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + checklist",
      inputs: ["주간 식사 수", "선호 레시피", "장보기 요일"],
      actions: ["이번 주 식단 선택", "장보기 목록 생성", "식사 일정 배치", "남은 재료 메모"],
      records: ["레시피", "장보기", "식사일", "재료 메모"],
      completion: "주간 식단과 장보기 목록이 실행 가능한 상태로 정리됨",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 4.6, repeatOrCohortUse: 5, audiencePortability: 4.7, sourceRiskBoundary: 4.1, inputSimplicity: 4.3 },
  },
  {
    id: "C045",
    category: "운동/웰니스 챌린지",
    title: "75 Hard Habit Tracker",
    sourceUrl: "https://www.notion.com/templates/75-hard-habit-tracker-182",
    sourceKind: "paid_challenge_template",
    originalSummary: "75 Hard 챌린지의 물, 운동, 독서, 식단, 진행 사진 같은 일일 요구사항을 체크리스트와 로그로 추적하는 유료 Notion 템플릿이다.",
    creatorShareReason: "챌린지 제작자가 고정 규칙을 반복 실행 Flow로 제공하기 좋은 형태다. 다만 건강/식단 영역은 중단 조건과 개인 판단 분리가 필요하다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + internal_check",
      inputs: ["시작일", "일일 목표", "중단 조건 확인"],
      actions: ["75일 캘린더 생성", "오늘 5개 항목 체크", "빠진 항목 있으면 재시작 여부 표시", "주간 회고 기록"],
      records: ["일차", "체크 상태", "사진/메모", "재시작 여부"],
      completion: "오늘 챌린지 항목의 완료 여부와 연속 일수가 갱신됨",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 5, repeatOrCohortUse: 5, audiencePortability: 4.8, sourceRiskBoundary: 3.9, inputSimplicity: 4.5 },
  },
  {
    id: "C046",
    category: "운동/웰니스 챌린지",
    title: "Workout Planner",
    sourceUrl: "https://www.notion.com/templates/workout-planner-373",
    sourceKind: "creator_template",
    originalSummary: "훈련일, 운동 부위/활동, 피트니스 목표, 진행 사진, 식사 계획, 메모를 한 대시보드에서 관리하는 운동 플래너다.",
    creatorShareReason: "트레이너나 운동 크리에이터가 루틴표를 Flow로 공유하기 좋다. 운동 방법 자체보다 일정/기록/진행 사진 중심으로 제한해야 한다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + sheet",
      inputs: ["운동 목표", "운동 요일", "기록 항목"],
      actions: ["주간 운동일 배치", "오늘 운동 완료 체크", "진행 사진/메모 기록", "다음 주 조정 메모"],
      records: ["운동일", "부위", "완료 여부", "컨디션"],
      completion: "주간 운동 일정과 실행 기록이 갱신됨",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 4.7, repeatOrCohortUse: 5, audiencePortability: 4.7, sourceRiskBoundary: 4.0, inputSimplicity: 4.4 },
  },
  {
    id: "C047",
    category: "독서/커뮤니티 운영",
    title: "Book Club Tracker",
    sourceUrl: "https://www.notion.com/templates/bookclub",
    sourceKind: "paid_creator_template",
    originalSummary: "독서 모임 활동을 관리하기 위한 책 목록, 모임 운영, 독서 기록을 제공하는 Notion 템플릿이다.",
    creatorShareReason: "독서 모임 운영자나 북튜버가 월간 선정도서, 모임일, 질문, 참석 기록을 Flow로 배포하기 좋다.",
    flowContent: {
      structure: "routine",
      destination: "calendar + memo",
      inputs: ["모임명", "선정도서", "모임일"],
      actions: ["이번 달 선정도서 등록", "읽기 마감일 생성", "모임 질문 메모", "참석/후기 기록"],
      records: ["도서", "읽기 상태", "질문", "후기"],
      completion: "독서 마감과 모임 기록이 남음",
    },
    scores: { creatorShareIntent: 4.6, executableSequence: 4.6, repeatOrCohortUse: 4.8, audiencePortability: 4.8, sourceRiskBoundary: 4.9, inputSimplicity: 4.5 },
  },
  {
    id: "C048",
    category: "독서/커뮤니티 운영",
    title: "Book Tracker by Digital Desk",
    sourceUrl: "https://www.notion.com/templates/book-tracker-392",
    sourceKind: "creator_template",
    originalSummary: "책장 데이터베이스, 인용문, 읽고 싶은 책 목록, 연간 독서 챌린지, 여러 뷰를 포함한 독서 기록 템플릿이다.",
    creatorShareReason: "독서 콘텐츠 제작자가 읽기 챌린지나 기록 양식을 Flow로 배포하기 좋다. 단순 기록보다 목표/진행/인용 저장이 있어야 차별화된다.",
    flowContent: {
      structure: "routine",
      destination: "sheet + memo",
      inputs: ["연간 목표", "현재 읽는 책", "기록 주기"],
      actions: ["읽을 책 목록 등록", "페이지/진행률 업데이트", "인용문 저장", "월간 목표 달성률 확인"],
      records: ["책", "진행률", "인용", "평점"],
      completion: "독서 진행률과 기록 메모가 갱신됨",
    },
    scores: { creatorShareIntent: 4.5, executableSequence: 4.5, repeatOrCohortUse: 4.8, audiencePortability: 4.8, sourceRiskBoundary: 5, inputSimplicity: 4.6 },
  },
  {
    id: "C049",
    category: "크리에이터 수익화",
    title: "Influencer OS - Brand Deal & Sponsorship Tracker",
    sourceUrl: "https://www.notion.com/templates/influencer-os-brand-deal-sponsorship-tracker",
    sourceKind: "creator_template",
    originalSummary: "브랜드딜을 새 행으로 추가하고, 연락처, 플랫폼, 아웃리치 날짜, 협상 단계, 산출물, 마감일, 결제 상태, 금액, 메모를 추적하는 크리에이터용 CRM 템플릿이다.",
    creatorShareReason: "크리에이터가 자기 협찬 운영 방식을 Flow로 공유하거나, 브랜드딜 관리 템플릿을 유료화하기 좋은 직접 사례다.",
    flowContent: {
      structure: "pipeline",
      destination: "sheet + calendar",
      inputs: ["브랜드명", "마감일", "산출물"],
      actions: ["브랜드딜 행 추가", "협상/계약/제작/게시 상태 이동", "산출물 마감일 캘린더 배치", "입금 상태 확인"],
      records: ["브랜드", "단계", "마감일", "결제 상태"],
      completion: "브랜드딜이 계약부터 게시/입금까지 상태로 관리됨",
    },
    scores: { creatorShareIntent: 5, executableSequence: 4.9, repeatOrCohortUse: 4.8, audiencePortability: 4.9, sourceRiskBoundary: 4.8, inputSimplicity: 4.3 },
  },
  {
    id: "C050",
    category: "행사/운영 템플릿",
    title: "행사 기획 및 운영 Notion 템플릿",
    sourceUrl: "https://www.notion.com/ko/templates/event",
    sourceKind: "creator_template",
    originalSummary: "제안부터 보고까지 온/오프라인 행사 기획과 운영 과정을 담은 Notion 템플릿으로, 행사 준비 업무를 구조화한다.",
    creatorShareReason: "마케터나 운영자가 자기 행사 운영 노하우를 Flow로 공유/판매하기 좋은 대표 사례다. 행사일 기준 마감과 담당자 체크가 핵심이다.",
    flowContent: {
      structure: "timeline",
      destination: "calendar + sheet",
      inputs: ["행사일", "행사 유형", "담당자"],
      actions: ["행사일 기준 준비 일정 생성", "제안/섭외/홍보/운영 단계 배치", "담당자별 상태 체크", "행사 후 보고 메모 작성"],
      records: ["단계", "담당자", "마감일", "보고 메모"],
      completion: "행사 준비 단계와 행사 후 보고 상태가 정리됨",
    },
    scores: { creatorShareIntent: 4.8, executableSequence: 4.8, repeatOrCohortUse: 4.5, audiencePortability: 4.8, sourceRiskBoundary: 4.8, inputSimplicity: 4.0 },
  },
];

const sourceEvidenceById = {
  C001: {
    sourceSignals: ["Notion Marketplace 템플릿", "콘텐츠 캘린더", "프로젝트 단위 콘텐츠 상태/게시 일정 관리"],
    flowBoundary: "콘텐츠 설명 전체를 복제하지 않고 제목, 채널, 게시일, 상태, 성과 메모만 Flow 필드로 가져온다.",
  },
  C002: {
    sourceSignals: ["Gumroad 유료 Notion 템플릿", "plan/script/produce/track 흐름", "콘텐츠 제작자용 운영 OS"],
    flowBoundary: "아이디어부터 게시/성과까지의 상태 이동만 Flow화하고, 제작자의 노하우 설명은 메모로 남긴다.",
  },
  C005: {
    sourceSignals: ["7일 미니 코스 런칭", "시장 검증, 커리큘럼, 녹화, 이메일, 세일즈 페이지", "런칭일 기준 진행"],
    flowBoundary: "세일즈 카피 전체가 아니라 런칭일, 단계별 마감, 완료/보류 상태만 가져온다.",
  },
  C009: {
    sourceSignals: ["코호트 강의 템플릿", "모듈, 레슨, 액션 아이템, 제출물", "수강생 진행 관리"],
    flowBoundary: "강의 내용 자체가 아니라 모듈별 공개일, 제출 상태, 피드백 상태를 Flow로 변환한다.",
  },
  C010: {
    sourceSignals: ["100일 동안 매일 최소 1시간 코딩", "매일 진행 상황 공유", "참가자와 교류"],
    flowBoundary: "코딩 학습법 조언보다 매일 코딩, 공유 링크, 연속 일수, 회고 메모를 핵심 필드로 둔다.",
  },
  C011: {
    sourceSignals: ["챌린지를 선택하거나 직접 생성", "매일 완료 체크", "현재 스트릭/완료율/남은 날 추적", "완주 인증서"],
    flowBoundary: "습관 형성 설명은 메모로 두고, 챌린지명, 일일 목표, 기간, 오늘 체크, 완주 여부만 실행판에 둔다.",
  },
  C003: {
    sourceSignals: ["뉴스레터 에디토리얼 캘린더", "Edition Calendar와 주제/길이/CTA", "구독자 성장과 발행 성과 추적", "Mailchimp/ConvertKit/Substack/Beehiiv 자동 발행"],
    flowBoundary: "AI 에이전트와 자동화 설명 전체를 옮기지 않고 발행일, 주제, CTA, 발행 상태, 성과 메모만 Flow로 둔다.",
  },
  C004: {
    sourceSignals: ["소셜 미디어 콘텐츠 캘린더", "플랫폼/콘텐츠 타입 필드", "Draft부터 Published까지 상태 추적", "게시일과 담당자 필드"],
    flowBoundary: "마케팅 전략 설명은 메모로 분리하고 채널, 콘텐츠 타입, 상태, 게시일, 담당자만 실행 필드로 가져온다.",
  },
  C012: {
    sourceSignals: ["30일 글쓰기 챌린지", "하루 하나씩 30개 프롬프트 수행", "매일 쓰기", "완료 후 30개 글 조각 생성"],
    flowBoundary: "프롬프트 전문은 원문 링크로 남기고, 오늘 프롬프트 번호, 작성 여부, 글 링크/메모, 회고만 Flow화한다.",
  },
  C014: {
    sourceSignals: ["30일 영어 말하기 챌린지", "Import Course 후 코스 URL 공유", "학습자 진행과 최근 활동 추적", "제출물에 텍스트/오디오/비디오 피드백"],
    flowBoundary: "교사용 서비스 기능 전체가 아니라 코스 공유일, 학습자 제출 상태, 피드백 상태, 다음 과제만 Flow로 둔다.",
  },
  C015: {
    sourceSignals: ["스킬 선택 후 개인 30일 계획 생성", "일일 과제 15-30분", "0/30 진행률", "Print/PDF와 진행 저장"],
    flowBoundary: "학습 이론 설명보다 스킬명, 일차별 과제, 완료 여부, 인쇄/PDF 저장 여부만 실행판에 남긴다.",
  },
  C018: {
    sourceSignals: ["무료 출력형 30일 챌린지 캘린더", "완료한 일일 목표를 표시", "요가/행복/사진 챌린지 예시", "SMART 기준과 추적 설명"],
    flowBoundary: "동기부여 설명은 메모로 두고 챌린지명, 30일 캘린더, 오늘 체크, 완료율만 Flow로 변환한다.",
  },
  C020: {
    sourceSignals: ["12 Week Year for Writers Notion 템플릿", "목표/작업/주간 계획 데이터베이스", "Daily Huddles와 Weekly Reviews", "주간 글쓰기 진행 추적"],
    flowBoundary: "작가 운영체제 전체가 아니라 12주 목표, 주간 전술, 데일리 허들, 주간 리뷰와 글쓰기 진행률만 가져온다.",
  },
  C021: {
    sourceSignals: ["30일 사진 챌린지 PDF", "Day 1부터 Day 30까지 촬영 주제", "소셜 미디어 공유 태그", "하루 하나의 사진 과제"],
    flowBoundary: "PDF 전체를 복제하지 않고 오늘 촬영 주제, 촬영 완료, 공유 링크/사진 메모, 누락일만 Flow화한다.",
  },
  C026: {
    sourceSignals: ["유료 독서 소모임 노션 템플릿", "책 리스트", "회의록과 출석부", "독후감 리스트와 회원 리스트", "공지사항"],
    flowBoundary: "회원 개인정보와 전체 데이터베이스를 전부 옮기지 않고 선정도서, 읽기 기간, 모임일, 출석/독후감 상태만 Flow로 둔다.",
  },
  C006: {
    sourceSignals: ["Teachable 온라인 코스 런칭 체크리스트", "코스 제작과 런칭을 작은 하위 작업으로 분해", "첫 코스 제작자용 다운로드 체크리스트", "체크하면서 한 단계씩 진행"],
    flowBoundary: "코스 판매 전략 전체를 복제하지 않고 코스명, 런칭일, 판매 페이지, 이메일 준비, 런칭 후 보완 메모만 실행 Flow로 옮긴다.",
  },
  C007: {
    sourceSignals: ["코스 런칭 체크리스트 리드마그넷", "니치 결정, 아이디어 검증, 아웃라인, 모듈/레슨 제작", "온라인 수업 런칭 단계", "제작자의 전문성을 체크리스트로 배포"],
    flowBoundary: "강의 기획 조언은 메모로 두고, 검증, 아웃라인, 모듈 제작, 런칭 페이지 공개 상태만 체크리스트로 변환한다.",
  },
  C008: {
    sourceSignals: ["디지털 상품 시작 체크리스트", "아이디어, 이름/브랜딩, 상품 제작, 결제 링크, 가격, 마케팅, 런칭", "런칭 후 개선 루프", "Notion 템플릿 형태"],
    flowBoundary: "상품화 강의 전체가 아니라 상품명, 가격, 판매 링크, 런칭 체크, 개선 메모만 Flow 실행 필드로 남긴다.",
  },
  C013: {
    sourceSignals: ["30일 동안 매일 블로그 글을 쓰는 공개 챌린지", "하루 하나의 창작 산출물", "발행 링크와 빠진 날 기록", "창작자가 자기 실험을 따라 하게 만들 수 있는 구조"],
    flowBoundary: "작가의 선언문은 메모로 분리하고, 시작일, 오늘 주제, 발행 여부, 발행 링크, 결석 사유만 Flow화한다.",
  },
  C016: {
    sourceSignals: ["30 Day, 30 Minute Fitness Challenge", "각 날짜에 운동 종류를 적고 완료 시 체크마크", "30분을 10-15분 단위로 쪼갤 수 있음", "운동을 daily calendar에 예약하라는 안내"],
    flowBoundary: "운동 처방처럼 보이지 않게 운동명, 30분 목표, 완료 체크, 컨디션 메모, 중단 사유만 기록 Flow로 제한한다.",
  },
  C017: {
    sourceSignals: ["플랭크 30일 챌린지 계획표", "Day별 시간과 체크 포인트 표", "올바른 자세 체크리스트", "챌린지 완료 후 다음 단계 안내"],
    flowBoundary: "효과 보장 문구는 제외하고 Day, 목표 시간, 자세 체크, 완료/중단 상태, 통증 메모만 Flow로 옮긴다.",
  },
  C019: {
    sourceSignals: ["12-Week Year Planner", "큰 목표를 12주 스프린트로 분해", "주차별 계획과 완료율 측정", "12주 종료 후 구조화된 리뷰"],
    flowBoundary: "12 Week Year 방법론 전체를 복제하지 않고 12주 목표, 주간 태스크, 완료율, 리뷰/피벗 결정만 실행 Flow로 변환한다.",
  },
  C022: {
    sourceSignals: ["Crekit 크리에이터용 판매 페이지/비즈니스 생성", "비즈니스 모델, 타깃, 가격 전략 입력", "웹사이트, 앱, 이메일, 가격, 약관 생성", "마켓플레이스에서 템플릿 판매/리믹스"],
    flowBoundary: "AI 생성기 전체가 아니라 제작자가 공유할 판매 페이지 준비 Flow로 한정하고, 아이디어 입력, 가격/타깃, 페이지 초안, 공개 상태만 남긴다.",
  },
  C023: {
    sourceSignals: ["퇴근 후 30분 영어 공부 루틴", "10분 리스닝/쉐도잉, 10분 단어/표현, 10분 스피킹/라이팅", "출퇴근/퇴근 후 시간대 분리", "짧고 쉬운 콘텐츠 추천"],
    flowBoundary: "영어 실력 향상 보장 문구는 제외하고 오늘 학습 소스, 10분 단위 체크, 표현 메모, 말하기/쓰기 기록만 Flow화한다.",
  },
  C024: {
    sourceSignals: ["퇴근 후 30분 회복 루틴", "0-5분 눈/호흡 리셋", "5-15분 스트레칭", "15-30분 마이크로러닝 또는 독서", "오늘 퇴근 후 30분 타이머를 켜라는 다음 행동"],
    flowBoundary: "건강 조언은 주의 메모로 분리하고 시간 블록, 완료 체크, 몸 상태, 대체 루틴 선택만 실행 Flow로 둔다.",
  },
  C025: {
    sourceSignals: ["Notion 독서 기록 플래너", "읽을 책/읽는 중/완독 상태", "독서 기록과 인용 저장", "목표 독서량 또는 챌린지 추적"],
    flowBoundary: "서평 템플릿 전체보다 책 제목, 읽기 상태, 목표 날짜, 인용/메모, 완독 여부만 Flow 실행 항목으로 남긴다.",
  },
  C027: {
    sourceSignals: ["CLASS101 첨부 PDF 파일", "홈트 캘린더형 디지털 자료", "크리에이터 운동 루틴을 일정표로 배포", "다운로드 가능한 실행 자료"],
    flowBoundary: "운동법 자체를 처방하지 않고 날짜별 운동 카드, 완료 체크, 컨디션/보류 메모, 다음 운동일만 Flow로 변환한다.",
  },
  C028: {
    sourceSignals: ["CLASS101 카드뉴스 제작 PDF", "브랜딩 단계, 제작 기획, 스토리라인, 레이아웃, 리소스 안내", "5종 레이아웃 PSD 파일 포함", "콘텐츠 제작 직장인/마케터 대상"],
    flowBoundary: "PDF 본문을 복제하지 않고 카드뉴스 목적, 스토리라인 작성, 레이아웃 선택, 제작 완료, 게시 링크만 체크 Flow로 만든다.",
  },
  C029: {
    sourceSignals: ["CLASS101 캘리그라피 체본집 PDF", "100문장 이상의 문장 따라쓰기", "프린트 또는 프로크리에이트 연습", "구매자 3회 무료 피드백"],
    flowBoundary: "체본 문장을 옮기지 않고 연습일, 문장 번호, 연습 완료, 사진/피드백 요청 여부만 Flow에 둔다.",
  },
  C030: {
    sourceSignals: ["CLASS101 코바늘 인형블랭킷 PDF 도안", "한글 서술 도안과 차트 도안", "뜨는 법 동영상 링크", "과정 사진과 재료 정보 포함"],
    flowBoundary: "도안 저작물을 복제하지 않고 준비물 체크, 단계별 진행, 완성 사진, 막힌 부분 메모만 Flow 실행값으로 둔다.",
  },
  C031: {
    sourceSignals: ["CLASS101 블록 플래너 활용법", "블록 타임라인과 블록 플래너", "시간관리, 집중관리, 뽀모도로 태그", "플래너 작성 방법 강의"],
    flowBoundary: "플래너 이미지나 강의 내용을 복제하지 않고 오늘 블록, 집중 세션, 완료/미완료, 다음 조정 메모만 Flow로 만든다.",
  },
  C032: {
    sourceSignals: ["CLASS101 인형옷 PDF 패턴", "튜브탑 점프슈트와 써머햇 패턴 PDF", "완성 사진, 필요한 재료량, 실물 패턴, 과정 영상 링크", "A4 실제 크기 인쇄 안내와 상업 이용 제한"],
    flowBoundary: "패턴 파일을 복제하지 않고 인쇄 확인, 재료 준비, 제작 단계 완료, 완성 사진, 사용 조건 메모만 Flow화한다.",
  },
  C034: {
    sourceSignals: ["Artonaut Pet Care Tracker", "반려동물 관리 템플릿", "Notion 개인 대시보드에서 업무/관리 정보 팔로업", "반려동물 케어 카테고리"],
    flowBoundary: "템플릿 원문 정보가 제한적이므로 사료, 산책, 미용, 병원 예약 같은 반복 관리 필드만 최소 Flow로 잡고 건강 판단은 제외한다.",
  },
  C035: {
    sourceSignals: ["Notion Pet Care", "반려동물 일일 루틴 관리", "customizable lists", "pet care schedule과 needs 추적"],
    flowBoundary: "반려동물 건강 조언이 아니라 일일 케어 일정, 급여/산책/청소 완료, 특이사항 메모만 Flow 실행 항목으로 둔다.",
  },
  C038: {
    sourceSignals: ["Grace Digitals Wedding Planner", "Wedding Countdown, Budget & Finance, Vendors & Services", "Guest Management, Checklist, Timeline Events", "Vendor Payments, Appointment Calendar, Day-of Timeline"],
    flowBoundary: "결혼 준비 템플릿 전체를 복제하지 않고 결혼일, 이번 주 마감, 예산/업체/게스트 상태, 보류 결정만 Flow로 끌어온다.",
  },
  C041: {
    sourceSignals: ["MyHueDesigns Travel Planner", "Trips, Finance, Itinerary, Bookings, Journal, Packing List", "pre-trip/during-trip/post-trip checklist", "예산과 지출 트래커"],
    flowBoundary: "여행 데이터베이스 전체 대신 출발일, 예약 링크, 일자별 일정, 짐 체크, 여행 후 기록만 Flow로 제한한다.",
  },
  C044: {
    sourceSignals: ["Meal Planner Notion 템플릿", "레시피를 주간 캘린더에 배치", "필요 재료를 장보기 목록으로 연결", "recipe library와 grocery list"],
    flowBoundary: "영양/건강 판단은 제외하고 이번 주 식사 선택, 장보기 체크, 남은 재료 메모, 조리 완료 상태만 실행 Flow로 둔다.",
  },
  C046: {
    sourceSignals: ["Workout Planner Notion 템플릿", "운동 계획과 운동 기록", "muscle group과 daily workout plan 연결", "progress photo, meal plan 같은 기록 필드"],
    flowBoundary: "운동 처방을 제공하지 않고 주간 운동일, 오늘 운동 체크, 세트/메모, 진행 사진 여부, 다음 조정만 Flow로 옮긴다.",
  },
  C047: {
    sourceSignals: ["Book Club Tracker", "Book Catalog", "Meeting Scheduler", "Discussion Guides", "Member Profiles, Rating tracker, Books to Read"],
    flowBoundary: "독서모임 운영 템플릿 전체보다 선정 도서, 읽기 마감, 모임일, 질문 메모, 참석/후기 상태만 Flow로 만든다.",
  },
  C048: {
    sourceSignals: ["Digital Desk Book Tracker", "Bookshelf Database", "Favorite Quotes Section", "Reading Wishlist", "Reading Challenge Section과 multiple views"],
    flowBoundary: "책장 데이터베이스 전체가 아니라 목표 책 수, 현재 책, 읽기 상태, 인용 저장, 완독 체크만 Flow 실행 필드로 남긴다.",
  },
  C043: {
    sourceSignals: ["52주 저축 챌린지", "매주 저축액 입력", "날짜 필드로 입금 리마인더 설정", "주차 체크박스로 누적 진행 자동 업데이트"],
    flowBoundary: "재무 조언으로 만들지 않고 주차, 이번 주 저축액, 입금 체크, 누적액, 마지막 입금일만 기록한다.",
  },
  C033: {
    sourceSignals: ["식물 데이터베이스", "물주기 날짜 기록", "성장 노트", "비료/흙/화분 재고"],
    flowBoundary: "식물 관리 지식 전체가 아니라 식물명, 마지막 관리일, 다음 관리일, 관찰 메모를 우선한다.",
  },
  C036: {
    sourceSignals: ["수유, 수면, 기저귀 기록", "병원 노트", "일간/주간 요약", "부모 공유"],
    flowBoundary: "육아 판단이나 의료 조언으로 만들지 않고, 시간별 기록과 상담 준비 메모로 제한한다.",
  },
  C037: {
    sourceSignals: ["12개월 전부터 결혼 전날까지 체크리스트", "예산, 게스트, 좌석, 업체", "웨딩 당일 타임라인"],
    flowBoundary: "대형 템플릿을 그대로 옮기지 않고 결혼식 날짜, 이번 달 마감, 업체/게스트 결정 상태만 먼저 보여준다.",
  },
  C039: {
    sourceSignals: ["일간/주간/월간/연간 청소 작업", "공간별 작업 배정", "50개 이상 기본 작업"],
    flowBoundary: "모든 청소 항목을 노출하지 않고 오늘 할 청소, 반복 주기, 밀린 항목 이동만 남긴다.",
  },
  C040: {
    sourceSignals: ["여러 여행 관리", "교통/숙소 예약", "일자별 일정, 예산, 짐 목록, 여행 문서"],
    flowBoundary: "여행 데이터베이스 전체 대신 출발일 기준 준비, 예약 링크, 일자별 핵심 일정만 Flow화한다.",
  },
  C042: {
    sourceSignals: ["기간별 예산", "지출", "저축 목표", "목표 기여분"],
    flowBoundary: "재무 조언이 아니라 월 예산 기록, 지출 점검일, 저축 목표 체크로 제한한다.",
  },
  C045: {
    sourceSignals: ["75일 챌린지", "물/운동/독서/식단/진행 사진 일일 체크", "시작일과 일일 목표 커스터마이즈"],
    flowBoundary: "식단/운동 처방으로 보이지 않게 중단 조건을 분리하고, 일일 체크와 연속 일수만 기본 실행으로 둔다.",
  },
  C049: {
    sourceSignals: ["브랜드딜을 새 행으로 추가", "아웃리치에서 계약/결제까지 단계 추적", "산출물, 마감일, 결제 상태, 금액"],
    flowBoundary: "CRM 전체가 아니라 브랜드명, 산출물, 마감일, 계약/게시/입금 상태를 핵심 실행 필드로 둔다.",
  },
  C050: {
    sourceSignals: ["제안부터 보고까지 행사 기획/운영", "온/오프라인 행사", "행사 준비 업무 구조화"],
    flowBoundary: "행사 운영 문서 전체가 아니라 행사일, 담당자, 단계별 마감, 행사 후 보고 메모를 Flow로 변환한다.",
  },
};

const sourceKindLabels = {
  challenge_article: "챌린지 원문",
  challenge_generator: "챌린지 생성/추적 도구",
  challenge_template: "챌린지 템플릿",
  challenge_tool: "챌린지 추적 도구",
  community_challenge: "커뮤니티 챌린지",
  creator_blog: "제작자 블로그",
  creator_pattern_pdf: "제작자 PDF 도안",
  creator_pdf_calendar: "제작자 PDF 캘린더",
  creator_planner_method: "제작자 플래너 방법론",
  creator_practice_pdf: "제작자 연습 PDF",
  creator_template: "제작자 템플릿",
  creator_workbook_pdf: "제작자 워크북/PDF",
  paid_challenge_template: "유료 챌린지 템플릿",
  paid_creator_template: "유료 제작자 템플릿",
  paid_creator_workbook: "유료 제작자 워크북",
  platform_checklist: "플랫폼 체크리스트",
  printable_challenge: "출력형 챌린지",
  printable_template: "출력형 템플릿",
  teacher_challenge: "교사용 챌린지",
  template: "템플릿",
};

const boundaryByStructure = {
  routine: "원문의 반복 설명 전체를 옮기지 않고, 대상명/시작일/반복 주기/오늘 체크/회고 메모만 실행판에 둔다.",
  log_routine: "원문의 기록 항목을 전부 노출하지 않고, 시간/상태/공유 메모처럼 반복 입력에 필요한 필드만 남긴다.",
  timeline: "원문의 긴 안내를 그대로 복제하지 않고, 기준일과 단계별 마감, 완료/보류 상태만 캘린더와 체크로 옮긴다.",
  phase: "원문의 전체 데이터베이스를 옮기지 않고, 현재 단계와 다음 마감, 필요한 결정/보류 메모만 먼저 보여준다.",
  checklist: "원문의 설명과 예시는 메모로 두고, 자료 열기/준비물/단계 체크/완료 결과만 체크리스트로 옮긴다.",
  pipeline: "원문의 운영 노하우 전체가 아니라 상태 이동, 산출물, 마감일, 완료/결제 상태만 Flow 필드로 둔다.",
};

const compact = (value, max = 86) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

const sourceEvidenceFor = (row) => {
  if (sourceEvidenceById[row.id]) return { ...sourceEvidenceById[row.id], evidenceLevel: "source_checked" };

  const actionSignal = row.flowContent.actions.slice(0, 2).join(" / ");
  const recordSignal = row.flowContent.records.slice(0, 2).join(" / ");
  return {
    evidenceLevel: "source_summary",
    sourceSignals: [
      sourceKindLabels[row.sourceKind] ?? row.sourceKind,
      compact(row.originalSummary),
      `실행 단서: ${actionSignal}`,
      `기록 단서: ${recordSignal}`,
    ],
    flowBoundary:
      boundaryByStructure[row.flowContent.structure] ??
      "원문 설명 전체를 복제하지 않고 사용자가 바로 실행할 수 있는 입력, 체크, 기록, 완료 기준만 남긴다.",
  };
};

const scoreOf = (row) =>
  Number((Object.entries(row.scores).reduce((sum, [key, value]) => sum + value * weights[key], 0) / 100).toFixed(2));

const verdictOf = (score) => (score >= 4.55 ? "P0 제작자 Flow" : score >= 4.25 ? "P1 실험 후보" : score >= 3.8 ? "P2 조건부" : "OUT");

const exampleTypeByStructure = {
  routine: "routine_session",
  log_routine: "log_entry",
  timeline: "scheduled_task",
  phase: "scheduled_task",
  checklist: "check_task",
  pipeline: "pipeline_task",
};

const timingByStructure = {
  routine: ["Day 1", "매일", "매주", "마지막 날"],
  log_routine: ["오늘", "기록 직후", "이번 주", "상담/공유 전"],
  timeline: ["D-14", "D-7", "D-3", "D-day", "D+1"],
  phase: ["시작", "이번 단계", "다음 마감", "완료 후"],
  checklist: ["1단계", "2단계", "3단계", "완료"],
  pipeline: ["초안", "진행 중", "마감 전", "완료 후"],
};

const viewByDestination = (destination) => {
  if (destination.includes("calendar") && destination.includes("sheet")) return ["오늘", "캘린더", "진행표"];
  if (destination.includes("calendar") && destination.includes("memo")) return ["오늘", "캘린더", "메모"];
  if (destination.includes("calendar")) return ["오늘", "캘린더"];
  if (destination.includes("sheet")) return ["진행표", "메모"];
  if (destination.includes("memo")) return ["메모", "체크"];
  if (destination.includes("check")) return ["오늘", "체크"];
  return ["오늘", "상세"];
};

const exampleFlowFor = (row, sourceEvidence) => {
  const timings = timingByStructure[row.flowContent.structure] ?? timingByStructure.checklist;
  const itemType = exampleTypeByStructure[row.flowContent.structure] ?? "check_task";
  const visibleIn = viewByDestination(row.flowContent.destination);
  const visibleItems = row.flowContent.actions.map((action, index) => {
    const record = row.flowContent.records[index % row.flowContent.records.length];
    const sourceSignal = sourceEvidence.sourceSignals[index % sourceEvidence.sourceSignals.length];
    const isLast = index === row.flowContent.actions.length - 1;
    return {
      when: timings[index] ?? `Step ${index + 1}`,
      type: itemType,
      title: action,
      visibleIn: visibleIn[index % visibleIn.length],
      detailMemo: `${record} 기록. 원문 근거: ${sourceSignal}`,
      completionSignal: isLast ? row.flowContent.completion : `${action} 완료 상태로 표시하고 필요한 메모를 남김`,
    };
  });

  return {
    title: `${row.title} 실행 Flow`,
    sourceBasis: sourceEvidence.sourceSignals.slice(0, 3),
    userInputs: row.flowContent.inputs,
    destination: row.flowContent.destination,
    visibleItems,
    memoPolicy: sourceEvidence.flowBoundary,
    completion: row.flowContent.completion,
  };
};

const enriched = candidates
  .map((row) => {
    const score = scoreOf(row);
    const sourceEvidence = sourceEvidenceFor(row);
    return {
      ...row,
      score,
      verdict: verdictOf(score),
      sourceEvidence,
      exampleFlow: exampleFlowFor(row, sourceEvidence),
      fitReason:
        score >= 4.55
          ? "제작자가 자기 방법론을 공유/판매하기 쉽고, 사용자는 바로 일정/체크/기록으로 실행할 수 있음"
          : score >= 4.25
            ? "실행 구조는 좋지만 국내화, 위험 분리, 입력 단순화 중 하나를 더 다듬어야 함"
            : "FlowMe에 올리려면 원문 단계와 사용자 입력을 더 줄여야 함",
    };
  })
  .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
  .map((row, index) => ({ ...row, rank: index + 1 }));

const countRows = (filter) => enriched.filter(filter).length;

const exampleTitles = (filter, limit = 3) =>
  enriched
    .filter(filter)
    .slice(0, limit)
    .map((row) => row.title)
    .join(", ");

const creatorFlowInsights = [
  {
    title: "반복/챌린지 Flow",
    count: countRows((row) => row.flowContent.structure === "routine" || row.flowContent.structure === "log_routine"),
    goodFor: "30일/75일 챌린지, 운동/글쓰기/언어/청소/식물 관리처럼 매일 또는 매주 확인할 일이 있는 콘텐츠",
    flowShape: "시작일, 반복 주기, 오늘 체크, 누락/회고 메모",
    examples: exampleTitles((row) => row.flowContent.structure === "routine" || row.flowContent.structure === "log_routine"),
  },
  {
    title: "운영 파이프라인 Flow",
    count: countRows((row) => row.flowContent.structure === "pipeline"),
    goodFor: "콘텐츠 제작, 브랜드딜, 협찬, 디지털 상품처럼 상태가 초안/협상/제작/게시/입금으로 이동하는 콘텐츠",
    flowShape: "상태 보드, 마감일, 산출물, 결제/완료 상태",
    examples: exampleTitles((row) => row.flowContent.structure === "pipeline"),
  },
  {
    title: "큰 이벤트 타임라인 Flow",
    count: countRows((row) => row.flowContent.structure === "timeline" || row.flowContent.structure === "phase"),
    goodFor: "코스 런칭, 행사, 여행, 결혼 준비처럼 기준일이 있고 여러 마감과 결정이 이어지는 콘텐츠",
    flowShape: "기준일, 단계별 마감, 담당자/업체/예약, 보류 사유",
    examples: exampleTitles((row) => row.flowContent.structure === "timeline" || row.flowContent.structure === "phase"),
  },
  {
    title: "체크리스트/도안 실행 Flow",
    count: countRows((row) => row.flowContent.structure === "checklist"),
    goodFor: "PDF 패턴, 체본집, 강의 부가자료처럼 사용 조건과 단계별 완료가 중요한 콘텐츠",
    flowShape: "자료 열기, 준비물, 단계 체크, 완성 사진/사용 조건 메모",
    examples: exampleTitles((row) => row.flowContent.structure === "checklist"),
  },
];

const weakFitSignals = [
  "읽고 끝나는 팁 모음이나 추천 리스트는 제작자가 공유할 수는 있어도 FlowMe 실행판으로는 약하다.",
  "건강, 식단, 재무, 육아 콘텐츠는 기록/일정/상담 준비로 제한하고 결과 보장이나 처방처럼 보이면 제외한다.",
  "입력값이 캘린더/리마인더 수준을 넘어서면 P0에서 내려야 한다. 좋은 제작자 Flow는 보통 시작일, 주기, 대상명 정도만 먼저 묻는다.",
  "템플릿 데이터베이스가 많아도 FlowMe 첫 화면에는 오늘 할 일, 다음 마감, 완료 기준만 남겨야 한다.",
];

const esc = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const md = [
  "# 제작자 공유형 Flow 후보 카탈로그",
  "",
  "기준일: 2026-05-31",
  "",
  "이 문서는 기존 온라인 출처 200개 카탈로그를 보완하는 제작자 관점 감사 문서다. 핵심 질문은 “사용자가 따라 할 수 있는가”뿐 아니라 “제작자가 자기 방법론을 Flow로 만들어 공유/판매하고 싶을 이유가 있는가”이다.",
  "",
  "- 함께 보기: [온라인 출처 후보 200개 카탈로그](./2026-05-31-online-source-catalog-200.html)",
  "",
  "## 평가 기준",
  "",
  ...Object.entries(weights).map(([key, value]) => `- ${key}: ${value}%`),
  "",
  "## 제작자 Flow 유형 요약",
  "",
  ...creatorFlowInsights.map((row) =>
    [
      `### ${row.title}`,
      "",
      `- 후보 수: ${row.count}`,
      `- 잘 맞는 콘텐츠: ${row.goodFor}`,
      `- Flow 형태: ${row.flowShape}`,
      `- 대표 예시: ${row.examples}`,
      "",
    ].join("\n"),
  ),
  "## 약한 후보 신호",
  "",
  ...weakFitSignals.map((x) => `- ${x}`),
  "",
  "## 상위 후보",
  "",
  ...enriched.map((row) =>
    [
      `### ${row.rank}. ${row.title} (${row.score}/5, ${row.verdict})`,
      "",
      `- 카테고리: ${row.category}`,
      `- 원문: ${row.sourceUrl}`,
      `- 원문 요약: ${row.originalSummary}`,
      ...(row.sourceEvidence
        ? [
            `- 근거 수준: ${row.sourceEvidence.evidenceLevel}`,
            `- 원문 실행 신호: ${row.sourceEvidence.sourceSignals.join(", ")}`,
            `- Flow 변환 경계: ${row.sourceEvidence.flowBoundary}`,
          ]
        : []),
      `- 제작자 공유 이유: ${row.creatorShareReason}`,
      `- Flow 구조/목적지: ${row.flowContent.structure} / ${row.flowContent.destination}`,
      `- 사용자 입력: ${row.flowContent.inputs.join(", ")}`,
      `- 실행 예시: ${row.flowContent.actions.join(" → ")}`,
      `- 기록 필드: ${row.flowContent.records.join(", ")}`,
      `- 완료 기준: ${row.flowContent.completion}`,
      `- 판단: ${row.fitReason}`,
      "",
    ].join("\n"),
  ),
].join("\n");

const cards = enriched
  .map(
    (row) => `
      <article class="card">
        <div class="head">
          <div>
            <p class="rank">#${row.rank} · ${esc(row.category)}</p>
            <h2>${esc(row.title)}</h2>
          </div>
          <span class="score">${row.score}/5</span>
        </div>
        <p class="verdict">${esc(row.verdict)}</p>
        <p>${esc(row.originalSummary)}</p>
        ${
          row.sourceEvidence
            ? `<section class="evidence">
                <b>원문 근거</b>
                <span class="evidence-level">${esc(row.sourceEvidence.evidenceLevel)}</span>
                <ul>${row.sourceEvidence.sourceSignals.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
                <p>${esc(row.sourceEvidence.flowBoundary)}</p>
              </section>`
            : ""
        }
        <p class="creator"><b>제작자 관점:</b> ${esc(row.creatorShareReason)}</p>
        <section class="flow">
          <b>Flow화</b>
          <div class="chips">${row.flowContent.inputs.map((x) => `<span>${esc(x)}</span>`).join("")}</div>
          <ol>${row.flowContent.actions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
          <p class="done">${esc(row.flowContent.completion)}</p>
        </section>
        <section class="example-flow">
          <b>예시 Flow 콘텐츠</b>
          <p class="source-note">${esc(row.exampleFlow.title)} · 목적지: ${esc(row.exampleFlow.destination)}</p>
          <ul class="basis">${row.exampleFlow.sourceBasis.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <div class="flow-items">
            ${row.exampleFlow.visibleItems
              .map(
                (item) => `<div class="flow-item">
                  <span class="item-meta">${esc(item.when)} · ${esc(item.type)} · ${esc(item.visibleIn)}</span>
                  <b>${esc(item.title)}</b>
                  <p>${esc(item.detailMemo)}</p>
                  <p class="done">완료 기준: ${esc(item.completionSignal)}</p>
                </div>`,
              )
              .join("")}
          </div>
          <p class="memo-policy">메모 처리: ${esc(row.exampleFlow.memoPolicy)}</p>
        </section>
        <details>
          <summary>평가/출처</summary>
          <ul>
            ${Object.entries(row.scores).map(([key, value]) => `<li>${esc(key)}: ${value} (${weights[key]}%)</li>`).join("")}
          </ul>
          <p><a href="${esc(row.sourceUrl)}" target="_blank" rel="noreferrer">원문 열기</a></p>
          <p>${esc(row.fitReason)}</p>
        </details>
      </article>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>제작자 공유형 Flow 후보 카탈로그</title>
  <style>
    body { margin: 0; background: #f6f7f9; color: #172033; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.55; }
    header { background: #111827; color: white; padding: 32px 20px 26px; }
    main, .wrap { width: min(1120px, calc(100vw - 32px)); margin: 0 auto; }
    h1 { margin: 0 0 10px; font-size: 32px; letter-spacing: 0; }
    .lead { color: #cbd5e1; max-width: 900px; margin: 0; }
    .cross-link { margin: 12px 0 0; font-size: 14px; }
    .cross-link a { color: #bfdbfe; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
    .stat, .card { background: white; border: 1px solid #dde3ec; border-radius: 8px; box-shadow: 0 8px 20px rgba(23,32,51,.05); }
    .stat { padding: 14px; }
    .stat b { display: block; font-size: 26px; }
    .insights { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 18px 0; }
    .insight, .weak-signals { background: white; border: 1px solid #dde3ec; border-radius: 8px; padding: 14px; box-shadow: 0 8px 20px rgba(23,32,51,.05); }
    .section-title { margin: 24px 0 10px; font-size: 20px; }
    .insight h2 { margin: 0 0 6px; font-size: 16px; }
    .insight p, .weak-signals li { color: #475569; font-size: 14px; }
    .insight .count { display: inline-flex; align-items: center; min-height: 24px; border-radius: 999px; padding: 2px 8px; background: #f1f5f9; color: #334155; font-size: 12px; font-weight: 700; }
    .source-note { margin: 8px 0 0; color: #64748b; font-size: 13px; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding-bottom: 48px; }
    .card { padding: 14px; }
    .head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .rank { margin: 0 0 3px; color: #64748b; font-size: 12px; }
    h2 { margin: 0; font-size: 17px; line-height: 1.35; }
    .score { border: 1px solid #bfdbfe; background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 4px 8px; font-weight: 700; white-space: nowrap; font-size: 12px; }
    .verdict { display: inline-flex; border-radius: 999px; background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 3px 8px; font-size: 12px; font-weight: 700; }
    .creator { color: #334155; }
    .flow { border: 1px solid #dbeafe; background: #f8fbff; border-radius: 8px; padding: 10px; margin: 10px 0; }
    .example-flow { border: 1px solid #dcfce7; background: #f7fef9; border-radius: 8px; padding: 10px; margin: 10px 0; }
    .basis { margin: 6px 0 10px 18px; padding: 0; color: #475569; font-size: 12px; }
    .flow-items { display: grid; gap: 8px; margin-top: 8px; }
    .flow-item { border: 1px solid #d1fae5; background: #ffffff; border-radius: 6px; padding: 8px; }
    .flow-item b { display: block; margin: 2px 0 4px; font-size: 13px; }
    .flow-item p { margin: 3px 0; color: #475569; font-size: 12px; }
    .item-meta { color: #047857; font-size: 11px; font-weight: 700; }
    .memo-policy { margin: 8px 0 0; color: #475569; font-size: 12px; }
    .evidence { border: 1px solid #e2e8f0; background: #fbfdff; border-radius: 8px; padding: 10px; margin: 10px 0; font-size: 13px; }
    .evidence-level { display: inline-flex; margin-left: 6px; border-radius: 999px; background: #f1f5f9; color: #475569; padding: 1px 7px; font-size: 11px; }
    .evidence ul { margin: 6px 0 0 18px; padding: 0; }
    .evidence p { margin: 8px 0 0; color: #475569; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 7px 0; }
    .chips span { border: 1px solid #dbeafe; background: #eff6ff; color: #1d4ed8; border-radius: 999px; padding: 2px 7px; font-size: 12px; }
    ol { margin: 8px 0 0 18px; padding: 0; }
    li { margin: 3px 0; }
    .done { margin-bottom: 0; color: #475569; font-size: 13px; }
    details { border-top: 1px solid #eef2f7; margin-top: 10px; padding-top: 8px; }
    summary { cursor: pointer; font-weight: 700; font-size: 13px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    @media (max-width: 820px) { .stats, .insights, .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <header>
    <div class="wrap">
      <h1>제작자 공유형 Flow 후보 카탈로그</h1>
      <p class="lead">공식 절차형 콘텐츠와 별도로, 제작자가 자기 방법론·챌린지·템플릿·코스 운영 방식을 Flow로 만들어 공유하거나 판매하고 싶어질 후보를 원문 기반으로 정리했다.</p>
      <p class="cross-link"><a href="./2026-05-31-online-source-catalog-200.html">기존 온라인 출처 후보 200개 카탈로그 보기</a></p>
    </div>
  </header>
  <main>
    <section class="stats">
      <div class="stat"><b>${enriched.length}</b><span>검토 후보</span></div>
      <div class="stat"><b>${enriched.filter((x) => x.verdict.startsWith("P0")).length}</b><span>P0 제작자 Flow</span></div>
      <div class="stat"><b>${enriched.filter((x) => x.category.includes("콘텐츠") || x.category.includes("코스")).length}</b><span>수익화/운영형</span></div>
      <div class="stat"><b>${enriched.filter((x) => x.flowContent.structure === "routine").length}</b><span>반복/챌린지형</span></div>
    </section>
    <h2 class="section-title">제작자 Flow 유형 요약</h2>
    <section class="insights">
      ${creatorFlowInsights
        .map(
          (row) => `<article class="insight">
            <span class="count">${row.count}개 후보</span>
            <h2>${esc(row.title)}</h2>
            <p><b>잘 맞음:</b> ${esc(row.goodFor)}</p>
            <p><b>Flow 형태:</b> ${esc(row.flowShape)}</p>
            <p class="source-note">대표 예시: ${esc(row.examples)}</p>
          </article>`,
        )
        .join("")}
    </section>
    <section class="weak-signals">
      <h2 class="section-title">약한 후보 신호</h2>
      <ul>${weakFitSignals.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    </section>
    <h2 class="section-title">후보 상세</h2>
    <section class="grid">
      ${cards}
    </section>
  </main>
</body>
</html>
`;

fs.writeFileSync(
  outJson,
  JSON.stringify({ generatedAt: "2026-05-31", weights, insights: creatorFlowInsights, weakFitSignals, candidates: enriched }, null, 2) + "\n",
  "utf8",
);
fs.writeFileSync(outMd, md, "utf8");
fs.writeFileSync(outHtml, html, "utf8");
console.log(`wrote ${enriched.length} creator flow candidates`);
