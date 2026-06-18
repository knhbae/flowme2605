export type FlowContentCoverageAxis = {
  label: string;
  artifact: string;
  candidateIds: readonly string[];
  question: string;
};

export const antiRepetitionCandidateIds: ReadonlySet<string> = new Set([
  'college-dorm-move-in-checklist',
  'elementary-school-entry-d30',
  'kids-printable-squishy-craft',
  'anydesk-remote-setup-check',
  'fridge-cleanout-weekly-plan',
  'balcony-fall-vegetable-calendar',
  'self-wall-paint-weekend',
  'freelancer-income-tax-docs',
] as const);

export const latestDiversificationCandidateIds: ReadonlySet<string> = new Set([
  'first-kimjang-weekend-checklist',
  'passport-renewal-online-pickup',
  'car-inspection-renewal-window',
  'beginner-camping-packing-sheet',
  'free-appliance-pickup-reservation',
] as const);

export const creatorSourceBreadthCandidateIds: ReadonlySet<string> = new Set([
  'piano-carol-sheet-7day-practice',
  'cat-adoption-first-week-setup',
  'jeonse-contract-precheck-docs',
  'goodnotes-template-study-setup',
  'macaron-template-baking-day',
] as const);

export const representativeCoverageGroups: readonly FlowContentCoverageAxis[] = [
  {
    label: '반복 관리',
    artifact: '루틴/캘린더',
    candidateIds: ['washer-tub-clean-monthly', 'monstera-care-routine', 'water-purifier-filter-cycle'],
    question: '가전·식물처럼 오래 쓰는 대상의 반복 실행을 과하지 않게 저장할 수 있는가',
  },
  {
    label: '생활 전환',
    artifact: '기준일 타임라인',
    candidateIds: ['wedding-12-month-timeline', 'college-dorm-move-in-checklist', 'elementary-school-entry-d30'],
    question: '입사·입학·결혼처럼 기준일 전후 준비를 날짜와 체크로 나눌 수 있는가',
  },
  {
    label: '제작자 자료',
    artifact: '원문 링크 + 체크',
    candidateIds: ['kids-printable-squishy-craft', 'picture-book-reading-routine', 'banana-peanut-recipe-video'],
    question: '도안·영상·PDF를 복제하지 않고 실행 준비와 원문 링크를 잘 보존하는가',
  },
  {
    label: '디지털 절차',
    artifact: '순서형 체크',
    candidateIds: ['anydesk-remote-setup-check', 'alt-phone-sk7-self-activation', 'japan-esim-setup-before-departure'],
    question: '설치·개통·설정 절차를 민감 정보 저장 없이 따라 할 수 있는가',
  },
  {
    label: '짧은 프로젝트',
    artifact: 'D-3/D-1/당일 체크',
    candidateIds: ['self-wall-paint-weekend', 'kids-dino-footprint-art', 'banana-peanut-recipe-video'],
    question: '주말 작업처럼 짧은 준비-실행-정리 흐름을 한 화면에서 판단할 수 있는가',
  },
  {
    label: '시트/재고',
    artifact: '작은 표',
    candidateIds: ['fridge-cleanout-weekly-plan', 'balcony-fall-vegetable-calendar', 'water-purifier-filter-cycle'],
    question: '재고·필터·채소처럼 행 단위로 다음 실행일을 관리하는 것이 자연스러운가',
  },
  {
    label: '서류/행정',
    artifact: '마감 전 체크',
    candidateIds: ['freelancer-income-tax-docs', 'lease-contract-report-deadline', 'infant-health-checkup-prep'],
    question: '판단은 공식/전문가에 남기고 자료 준비와 마감 체크만 Flow로 둘 수 있는가',
  },
];
