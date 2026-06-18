import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  koreanFlowContentCandidates,
  type KoreanFlowContentCandidate,
} from '../../lib/flow/korean-flow-content-candidates';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'docs/content-audit');
const jsonPath = path.join(
  outDir,
  'original-source-review/2026-06-07-weighted-korean-source-flow-candidates.json',
);
const htmlPath = path.join(outDir, '2026-06-07-weighted-korean-source-flow-review.html');

const weights = {
  sourceContext: 0.3,
  userDesire: 0.2,
  executionClarity: 0.2,
  portability: 0.15,
  inputSimplicity: 0.1,
  reuse: 0.05,
} as const;

type WeightedScore = {
  sourceContext: number;
  userDesire: number;
  executionClarity: number;
  portability: number;
  inputSimplicity: number;
  reuse: number;
};

type ReviewOverride = {
  selectionReason: string;
  reactionEvidence: string;
  originalCheck: '직접 확인' | '기존 후보 기반' | '재확인 필요';
  originalCue: string;
  artifact: '캘린더' | '체크리스트' | '시트' | '메모' | '혼합';
  primaryInput: string;
  scores: WeightedScore;
  reviewerNote: string;
};

const candidateOrder = [
  'washer-tub-clean-monthly',
  'lg-aircon-filter-biweekly',
  'water-purifier-filter-cycle',
  'monstera-care-routine',
  'wedding-12-month-timeline',
  'used-car-buying-check',
  'moving-d30-checklist',
  'computer-license-2nd-written',
  'thankyou-bubu-no-jump-home-workout',
  'travel-d7-checklist',
  'japan-trip-packing',
  'car-maintenance-schedule',
  'car-cabin-filter-replace',
  'regular-aircon-clean-home',
  'air-purifier-filter-seasonal',
  'humidifier-daily-weekly-clean',
  'robot-vacuum-monthly-care',
  'stuckyi-overwater-prevention',
  'cat-litter-box-clean',
  'puppy-vaccination-schedule',
  'dog-adoption-first-week',
  'child-weekend-play-rotation',
  'picture-book-reading-routine',
  'homelearn-reading-challenge',
  'plank-30-day-challenge',
  'korean-history-3-week',
  'passport-issue-prep',
  'vehicle-inspection-prep',
  'baby-food-four-week-menu',
  'monthly-budget-close',
] as const;

const overrides: Record<string, ReviewOverride> = {
  'washer-tub-clean-monthly': {
    selectionReason: '생활 가전 문제이고 월 1회 반복, 준비물, 실행 후 관리가 원문에서 바로 보인다.',
    reactionEvidence: '티스토리 생활 팁 원문 직접 확인. 2025-06-06 게시, 세탁기 통세척/문 열어 건조/세제통/필터/월 1회 FAQ 구조 확인.',
    originalCheck: '직접 확인',
    originalCue: '통세척 코스, 과탄산소다 100g, 고무패킹, 세제통, 필터, 세탁 후 문 열어두기, 월 1회/냄새 시 2주.',
    artifact: '캘린더',
    primaryInput: '첫 청소일, 반복 주기',
    scores: { sourceContext: 4.1, userDesire: 4.8, executionClarity: 4.7, portability: 4.8, inputSimplicity: 4.8, reuse: 4.9 },
    reviewerNote: '방법/준비물/구매 링크는 모두 메모로 보내고, 날짜 안 체크는 3~4개만 둔다.',
  },
  'lg-aircon-filter-biweekly': {
    selectionReason: '브랜드 공식 문서에 조회수와 권장 주기가 있어 가전 관리 대표성이 높다.',
    reactionEvidence: 'LG전자 공식 지원 문서 직접 확인. 2026-06-04 갱신, 조회 293,927, 극세 필터 세척 2주 1회/교체 6개월 또는 12개월 표 확인.',
    originalCheck: '직접 확인',
    originalCue: '극세 필터 물세척 2주 1회, 기능성 필터 교체 6개월/12개월, 필터 사용 시간 초기화.',
    artifact: '캘린더',
    primaryInput: '첫 청소일, 에어컨 모델 또는 타입',
    scores: { sourceContext: 4.8, userDesire: 4.5, executionClarity: 4.8, portability: 4.7, inputSimplicity: 4.5, reuse: 4.8 },
    reviewerNote: '2주 청소와 6개월 교체를 같은 루틴에 넣되 주기 그룹을 분리해야 한다.',
  },
  'water-purifier-filter-cycle': {
    selectionReason: '필터별 주기라는 표 구조가 명확해서 시트형 Flow 가능성을 보여준다.',
    reactionEvidence: '티스토리 원문 직접 확인. 필터별 교체 주기 표와 렌탈/자가관리 문제 제기가 있다.',
    originalCheck: '직접 확인',
    originalCue: '침전 3~6개월, 프리카본 6~12개월, 나노/RO 12~24개월, 후카본 9~12개월.',
    artifact: '시트',
    primaryInput: '정수기 모델, 마지막 교체일',
    scores: { sourceContext: 3.9, userDesire: 4.5, executionClarity: 4.8, portability: 4.8, inputSimplicity: 4.1, reuse: 4.7 },
    reviewerNote: '캘린더보다 필터 행이 먼저다. 각 행에서 다음 알림을 파생시키는 UI가 맞다.',
  },
  'monstera-care-routine': {
    selectionReason: '초보 식물 관리에서 물주기/보류/관찰이 모두 발생하는 대표 루틴이다.',
    reactionEvidence: '티스토리 원문 직접 확인. 흙 2~3cm, 배수구멍, 계절별 물주기, 증상 체크, 1~2년 분갈이 FAQ 확인.',
    originalCheck: '직접 확인',
    originalCue: '흙 2~3cm 마름 확인, 여름 5~7일/겨울 2주, 밝은 간접광, 증상 체크, 분갈이 1~2년.',
    artifact: '캘린더',
    primaryInput: '식물명, 마지막 물준 날',
    scores: { sourceContext: 3.8, userDesire: 4.6, executionClarity: 4.6, portability: 4.5, inputSimplicity: 4.5, reuse: 4.8 },
    reviewerNote: '완료보다 “오늘은 보류”가 정상 결과로 보여야 한다.',
  },
  'wedding-12-month-timeline': {
    selectionReason: '장기 준비와 D-day 단계가 분명해서 타임라인 Flow 대표성이 가장 강하다.',
    reactionEvidence: '기존 원문 검토에서 기간별 준비 항목과 모바일 타임라인 UI 검토가 진행된 대표 케이스.',
    originalCheck: '기존 후보 기반',
    originalCue: 'D-300~D-180 예식장/예산/하객, D-180~D-90 계약/패키지, D-90~D-30 초대장, D-30~D-Day 역할 분담.',
    artifact: '혼합',
    primaryInput: '예식일',
    scores: { sourceContext: 4.2, userDesire: 4.9, executionClarity: 4.8, portability: 4.6, inputSimplicity: 4.0, reuse: 3.5 },
    reviewerNote: '전체 여정을 캘린더에 넣되 모바일에서는 해당 날짜 체크만 보여야 한다.',
  },
  'used-car-buying-check': {
    selectionReason: '현장 체크와 구매/보류/거절 결정이 분명해서 일반 todo와 차별점이 보인다.',
    reactionEvidence: '기존 원문 검토와 public route 점검에서 날짜 입력/증빙 부담을 줄이는 방향으로 재정리된 대표 케이스.',
    originalCheck: '기존 후보 기반',
    originalCue: '성능점검기록부, 보험이력, 낮 시간 방문, 외관/타이어/누유/침수, 정비사 확인, 계약 조건.',
    artifact: '체크리스트',
    primaryInput: '차량명 또는 후보명',
    scores: { sourceContext: 4.0, userDesire: 4.7, executionClarity: 4.5, portability: 4.4, inputSimplicity: 4.2, reuse: 3.8 },
    reviewerNote: '사진은 참고/선택 메모다. 기본은 현장 체크와 최종 판단이다.',
  },
  'moving-d30-checklist': {
    selectionReason: '이사일 하나로 여러 일정이 파생되어 캘린더 전환 가능성이 높다.',
    reactionEvidence: '이사 체크리스트류는 검색/저장 수요가 높은 생활 이벤트. 기존 moving UX 검토 맥락과 연결된다.',
    originalCheck: '기존 후보 기반',
    originalCue: '이사업체 비교, 청소/가전 배송, 인터넷/도시가스 이전, 전입신고, 주소 변경.',
    artifact: '혼합',
    primaryInput: '이사일',
    scores: { sourceContext: 3.8, userDesire: 4.8, executionClarity: 4.5, portability: 4.6, inputSimplicity: 4.1, reuse: 3.4 },
    reviewerNote: '캘린더 날짜 제목은 짧게, 상세 메모에 준비물과 링크를 둔다.',
  },
  'computer-license-2nd-written': {
    selectionReason: '시험일, 기출 회차, 오답 체크가 있어 공부 Flow 대표 후보로 적합하다.',
    reactionEvidence: '시나공/기출 자료 기반 후보. 단, 실제 커리큘럼 원문과 회차 구성이 더 명확해야 한다.',
    originalCheck: '재확인 필요',
    originalCue: '시험일 기준 기출 풀이, 오답 영역 표시, 약한 과목 재풀이.',
    artifact: '혼합',
    primaryInput: '시험일, 선택한 기출 회차',
    scores: { sourceContext: 3.5, userDesire: 4.4, executionClarity: 3.9, portability: 4.3, inputSimplicity: 3.9, reuse: 4.1 },
    reviewerNote: '공부 분야는 원문에 실제 챕터/회차가 있어야 한다. 없으면 generic 루틴이 된다.',
  },
  'thankyou-bubu-no-jump-home-workout': {
    selectionReason: '단일 영상 반복 실행이라는 creator video Flow의 좋은 예다.',
    reactionEvidence: '기존 exact-video 후보. 영상 조회/댓글 등 상호작용 수치 재확인이 필요하지만, 영상 링크를 메모에 두는 구조는 명확하다.',
    originalCheck: '재확인 필요',
    originalCue: '점프 없음, 눕는 동작 없음, 반복 없음, 원본 영상 실행.',
    artifact: '캘린더',
    primaryInput: '운동 시작일, 반복 요일',
    scores: { sourceContext: 3.7, userDesire: 4.5, executionClarity: 4.2, portability: 4.4, inputSimplicity: 4.5, reuse: 4.5 },
    reviewerNote: '영상에서 원문에 없는 30일 계획을 만들지 말고, 반복 알림과 영상 링크만 둔다.',
  },
  'travel-d7-checklist': {
    selectionReason: '출국/여행일 기준 준비물과 예약 확인이 체크리스트로 잘 옮겨진다.',
    reactionEvidence: '여행 준비물은 블로그/유튜브/커뮤니티 반응이 많은 반복 검색 주제. 후보 원문 상호작용 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '여권, 항공/숙소, 환전, 유심/eSIM, 상비약, 충전기, 보험/긴급 연락처.',
    artifact: '혼합',
    primaryInput: '출발일, 여행지',
    scores: { sourceContext: 3.4, userDesire: 4.7, executionClarity: 4.3, portability: 4.5, inputSimplicity: 4.3, reuse: 3.8 },
    reviewerNote: '공식/개인 팁이 섞이면 출처 구분이 필요하다. 하지만 저장 형태는 단순 체크리스트다.',
  },
  'japan-trip-packing': {
    selectionReason: '여행지별 준비물이라는 개인 저장 욕구가 강한 콘텐츠다.',
    reactionEvidence: '일본 여행 준비물은 네이버/유튜브 반응이 많은 주제. 현재 후보 원문은 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '여권, 교통패스, 전압/어댑터, eSIM, 동전지갑, 예약 확인.',
    artifact: '체크리스트',
    primaryInput: '출발일, 여행 기간',
    scores: { sourceContext: 3.3, userDesire: 4.7, executionClarity: 4.2, portability: 4.5, inputSimplicity: 4.4, reuse: 3.9 },
    reviewerNote: '여행 준비물은 카테고리별 체크 그룹과 메모 링크만 있으면 충분하다.',
  },
  'car-maintenance-schedule': {
    selectionReason: '소유 차량 관리 주기라 반복성과 재사용성이 높다.',
    reactionEvidence: '차량 소모품 주기 콘텐츠는 검색 수요가 높지만, 브랜드/차종별 원문 근거 재확인이 필요하다.',
    originalCheck: '재확인 필요',
    originalCue: '엔진오일, 타이어 공기압/위치교환, 와이퍼, 브레이크, 배터리.',
    artifact: '시트',
    primaryInput: '차량명, 마지막 점검일',
    scores: { sourceContext: 3.4, userDesire: 4.5, executionClarity: 4.0, portability: 4.4, inputSimplicity: 3.9, reuse: 4.8 },
    reviewerNote: '차량 프로필이 있으면 좋지만 필수 입력으로 만들면 무거워진다.',
  },
  'car-cabin-filter-replace': {
    selectionReason: '자가 교체 영상/글과 반복 주기가 결합되는 가벼운 관리 Flow다.',
    reactionEvidence: '차량용 필터 교체 콘텐츠는 유튜브 DIY 반응이 많은 편. 정확한 영상/댓글 지표 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '차종 확인, 글로브박스 분리, 필터 방향 확인, 교체 후 다음 교체일 기록.',
    artifact: '캘린더',
    primaryInput: '차종, 마지막 교체일',
    scores: { sourceContext: 3.5, userDesire: 4.3, executionClarity: 4.2, portability: 4.4, inputSimplicity: 4.1, reuse: 4.3 },
    reviewerNote: '방법 영상은 메모 링크. 앱 안에서 사진 증빙은 필요 없다.',
  },
  'regular-aircon-clean-home': {
    selectionReason: '계절성 강한 가전 청소로 저장 욕구와 반복성이 있다.',
    reactionEvidence: '에어컨 청소는 여름 전후 검색 수요가 높다. 현재 후보 원문과 상호작용 지표 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '필터 분리, 물세척, 건조, 송풍, 냄새 점검.',
    artifact: '캘린더',
    primaryInput: '첫 청소일, 반복 주기',
    scores: { sourceContext: 3.5, userDesire: 4.6, executionClarity: 4.2, portability: 4.4, inputSimplicity: 4.4, reuse: 4.6 },
    reviewerNote: 'LG 공식 필터 루틴과 중복될 수 있어 대표 케이스 통합 검토가 필요하다.',
  },
  'air-purifier-filter-seasonal': {
    selectionReason: '계절 관리와 필터 교체가 반복되는 생활 Flow다.',
    reactionEvidence: '티스토리 후보. 원문 직접 재확인과 제조사별 공식 근거 보강 필요.',
    originalCheck: '재확인 필요',
    originalCue: '프리필터 청소, 본필터 교체, 표시등/냄새 확인, 구매 링크 메모.',
    artifact: '혼합',
    primaryInput: '제품명, 마지막 교체일',
    scores: { sourceContext: 3.2, userDesire: 4.3, executionClarity: 4.0, portability: 4.3, inputSimplicity: 4.1, reuse: 4.6 },
    reviewerNote: '제품 모델별 주기 차이는 메모/출처 링크로 처리한다.',
  },
  'humidifier-daily-weekly-clean': {
    selectionReason: '매일/주간 관리가 분리되어 루틴 UI 스트레스 테스트에 좋다.',
    reactionEvidence: '겨울철 반복 검색 주제. 후보 원문 직접 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '매일 물 비우기, 주 1회 세척, 필터 확인, 완전 건조.',
    artifact: '캘린더',
    primaryInput: '사용 시작일, 사용 계절',
    scores: { sourceContext: 3.1, userDesire: 4.2, executionClarity: 4.1, portability: 4.1, inputSimplicity: 4.1, reuse: 4.7 },
    reviewerNote: '매일 체크가 부담이면 주간 리마인더 중심으로 낮춰야 한다.',
  },
  'robot-vacuum-monthly-care': {
    selectionReason: '보유 제품 관리와 소모품/센서 체크가 연결된다.',
    reactionEvidence: '생활가전 관리 글 기반 후보. 실제 댓글/조회 지표 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '브러시 머리카락 제거, 센서/접점 닦기, 먼지통/오수통 세척.',
    artifact: '캘린더',
    primaryInput: '제품명, 첫 관리일',
    scores: { sourceContext: 3.0, userDesire: 4.1, executionClarity: 4.0, portability: 4.2, inputSimplicity: 4.2, reuse: 4.4 },
    reviewerNote: '제품 보유자에게는 강하지만 대중성은 세탁기/에어컨보다 낮다.',
  },
  'stuckyi-overwater-prevention': {
    selectionReason: '물주기보다 물주기 보류가 중요한 식물 케이스를 보여준다.',
    reactionEvidence: '식물 블로그 후보. 원문 접근과 댓글/공감 지표 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '흙 완전 건조, 밑동 무름, 과습 신호, 분갈이 후 적응.',
    artifact: '캘린더',
    primaryInput: '마지막 물준 날',
    scores: { sourceContext: 3.1, userDesire: 4.1, executionClarity: 4.2, portability: 4.2, inputSimplicity: 4.4, reuse: 4.7 },
    reviewerNote: '몬스테라와 같은 식물 관리 패턴으로 묶되 식물별 메모가 달라야 한다.',
  },
  'cat-litter-box-clean': {
    selectionReason: '반려동물 일상 관리 중 반복 주기가 명확한 후보.',
    reactionEvidence: '반려묘 관리 콘텐츠는 커뮤니티/블로그 반응이 많지만 현재 원문 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '매일 배변 치우기, 주기적 전체 모래 교체, 화장실 세척, 냄새/상태 메모.',
    artifact: '캘린더',
    primaryInput: '반려묘 수, 청소 시작일',
    scores: { sourceContext: 3.0, userDesire: 4.2, executionClarity: 4.2, portability: 4.1, inputSimplicity: 4.0, reuse: 4.8 },
    reviewerNote: '반려동물 건강 판단은 빼고 청소 루틴만 남기는 것이 맞다.',
  },
  'puppy-vaccination-schedule': {
    selectionReason: '날짜/회차가 분명하지만 공식/수의사 정보 분리가 필요하다.',
    reactionEvidence: '반려견 예방접종은 검색 수요가 강하나 원문/공식 근거 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '접종 회차, 병원 예약일, 다음 접종일, 준비물 메모.',
    artifact: '캘린더',
    primaryInput: '생년월일 또는 첫 접종일',
    scores: { sourceContext: 3.2, userDesire: 4.4, executionClarity: 4.0, portability: 4.2, inputSimplicity: 3.8, reuse: 4.1 },
    reviewerNote: '제작자 리스크를 제외해도 공식/병원 확인 링크는 가까이 둬야 한다.',
  },
  'dog-adoption-first-week': {
    selectionReason: '입양 첫 주 준비/적응 체크가 단계형으로 정리될 수 있다.',
    reactionEvidence: '반려견 입양 콘텐츠는 후기/댓글형 원문 발굴 가치가 높다. 현재 후보는 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '공간 준비, 사료/식기, 산책 적응, 병원 확인, 가족 규칙.',
    artifact: '체크리스트',
    primaryInput: '입양일',
    scores: { sourceContext: 3.1, userDesire: 4.3, executionClarity: 3.9, portability: 4.1, inputSimplicity: 4.0, reuse: 3.6 },
    reviewerNote: '초기 적응은 일정+체크가 맞지만 건강 판단 필드는 만들지 않는다.',
  },
  'child-weekend-play-rotation': {
    selectionReason: '부모가 저장하고 반복하기 쉬운 육아 놀이 루틴 후보.',
    reactionEvidence: '네이버 블로그/유튜브식 놀이 콘텐츠와 잘 맞지만 실제 제작자 원문 발굴 필요.',
    originalCheck: '재확인 필요',
    originalCue: '주말 놀이 주제, 준비물, 안전한 공간, 놀이 후 정리.',
    artifact: '캘린더',
    primaryInput: '첫 주말 날짜, 아이 연령',
    scores: { sourceContext: 2.8, userDesire: 4.2, executionClarity: 3.5, portability: 4.0, inputSimplicity: 4.0, reuse: 4.5 },
    reviewerNote: '대표 후보로 쓰려면 실제 제작자 놀이 시리즈 원문이 필요하다.',
  },
  'picture-book-reading-routine': {
    selectionReason: '반복 독서 루틴과 책/질문 메모가 잘 맞는다.',
    reactionEvidence: '육아 독서 콘텐츠는 제작자/출판사/도서관 원문 조합으로 발굴할 가치가 있다. 현재 원문 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '읽을 책, 읽는 시간, 오늘 질문, 독후 대화 메모.',
    artifact: '캘린더',
    primaryInput: '요일, 책 목록',
    scores: { sourceContext: 2.9, userDesire: 4.1, executionClarity: 3.5, portability: 4.0, inputSimplicity: 3.9, reuse: 4.6 },
    reviewerNote: '책 목록과 질문 프롬프트가 원문에 있어야 강해진다.',
  },
  'homelearn-reading-challenge': {
    selectionReason: '아이 공부/독서 챌린지의 카테고리 대표 후보.',
    reactionEvidence: '홈러닝/학습지 제작자 콘텐츠 후보. 원문과 상호작용 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '매일 읽기, 학습지 분량, 부모 확인, 주간 보상.',
    artifact: '캘린더',
    primaryInput: '시작일, 반복 요일',
    scores: { sourceContext: 2.8, userDesire: 4.0, executionClarity: 3.4, portability: 3.9, inputSimplicity: 3.8, reuse: 4.4 },
    reviewerNote: '원문 없이 학습 루틴만 있으면 약하다. 실제 자료/챕터가 필요하다.',
  },
  'plank-30-day-challenge': {
    selectionReason: 'Day별 과제가 있으면 챌린지 캘린더로 잘 변환된다.',
    reactionEvidence: '운동 챌린지 콘텐츠는 유튜브/블로그 반응이 많지만 후보 원문 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: 'Day 1~30 시간/세트 증가, 휴식일, 자세 영상 링크.',
    artifact: '캘린더',
    primaryInput: '시작일',
    scores: { sourceContext: 3.0, userDesire: 4.1, executionClarity: 4.0, portability: 4.2, inputSimplicity: 4.6, reuse: 3.8 },
    reviewerNote: '컨디션 기록은 빼고 오늘 과제와 영상 링크만 둔다.',
  },
  'korean-history-3-week': {
    selectionReason: '시험 대비 일정형 후보이나 원문 커리큘럼 충실도가 관건이다.',
    reactionEvidence: '한능검 공부 콘텐츠는 검색 수요가 높다. 실제 챕터/기출표 원문 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '3주 범위, 기출 풀이, 암기 주제, 오답 재풀이.',
    artifact: '혼합',
    primaryInput: '시험일',
    scores: { sourceContext: 2.9, userDesire: 4.1, executionClarity: 3.6, portability: 4.0, inputSimplicity: 3.8, reuse: 3.9 },
    reviewerNote: '공부 분야는 자료 출처와 실제 범위표가 없으면 보류다.',
  },
  'passport-issue-prep': {
    selectionReason: '공식 행정 준비물과 방문/온라인 신청이 체크리스트로 분명하다.',
    reactionEvidence: '행정 공식/블로그 혼합 후보. 공식 원문 링크 최신성 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '신청서, 사진, 신분증, 수수료, 방문/온라인 신청, 수령.',
    artifact: '체크리스트',
    primaryInput: '신청 예정일',
    scores: { sourceContext: 3.5, userDesire: 4.2, executionClarity: 4.3, portability: 4.2, inputSimplicity: 4.3, reuse: 2.8 },
    reviewerNote: '한 번성은 낮지만 여행/행정 대표 케이스로 필요하다.',
  },
  'vehicle-inspection-prep': {
    selectionReason: '검사 예약/서류/점검이 날짜와 체크로 나뉜다.',
    reactionEvidence: '자동차 검사 공식/후기 콘텐츠 후보. 원문 최신성 재확인 필요.',
    originalCheck: '재확인 필요',
    originalCue: '검사 기간 확인, 예약, 자동차등록증/보험, 전조등/타이어/와이퍼 점검.',
    artifact: '혼합',
    primaryInput: '검사 만료일',
    scores: { sourceContext: 3.4, userDesire: 4.1, executionClarity: 4.2, portability: 4.2, inputSimplicity: 4.1, reuse: 3.6 },
    reviewerNote: '증빙보다 예약/방문 준비 체크가 먼저다.',
  },
  'baby-food-four-week-menu': {
    selectionReason: '반응 기록이 아니라 식단표/일정 export로 보면 가능성이 있다.',
    reactionEvidence: '육아 식단표 수요는 높지만 원문 복잡도와 건강 정보 분리 때문에 재검토 필요.',
    originalCheck: '재확인 필요',
    originalCue: '연령별 식단, 새 재료, 일별 메뉴, 주간 반복.',
    artifact: '혼합',
    primaryInput: '아이 월령, 시작일',
    scores: { sourceContext: 3.2, userDesire: 4.3, executionClarity: 3.5, portability: 4.0, inputSimplicity: 3.1, reuse: 3.8 },
    reviewerNote: '기록 앱처럼 만들면 실패. 캘린더/시트 export 중심이어야 한다.',
  },
  'monthly-budget-close': {
    selectionReason: '수요는 크지만 원문이 조언형이면 FlowMe에 잘 안 맞는 반례다.',
    reactionEvidence: '돈 관리 콘텐츠는 반응이 많지만 현재 후보는 사용자가 따라 할 원문 체크 구조가 약하다는 이전 평가가 있었다.',
    originalCheck: '재확인 필요',
    originalCue: '수입/지출 확인, 고정비, 예산 조정, 다음 달 목표.',
    artifact: '시트',
    primaryInput: '월, 계좌/카드 범위',
    scores: { sourceContext: 2.7, userDesire: 4.4, executionClarity: 2.8, portability: 3.6, inputSimplicity: 2.8, reuse: 4.2 },
    reviewerNote: '수요는 높지만 입력이 무거워지고 재무 조언처럼 보이면 제외해야 한다.',
  },
};

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const weightedTotal = (scores: WeightedScore) =>
  Number(
    (
      scores.sourceContext * weights.sourceContext +
      scores.userDesire * weights.userDesire +
      scores.executionClarity * weights.executionClarity +
      scores.portability * weights.portability +
      scores.inputSimplicity * weights.inputSimplicity +
      scores.reuse * weights.reuse
    ).toFixed(2),
  );

const decisionFor = (score: number) => {
  if (score >= 4.2) return '합격';
  if (score >= 3.5) return '보류';
  return '제외';
};

const artifactHint = (candidate: KoreanFlowContentCandidate, override: ReviewOverride) => {
  const first = candidate.flowItems[0];
  if (override.artifact === '시트') {
    return [
      ['열', '항목 / 주기 / 마지막 실행일 / 다음 실행일 / 메모'],
      ...candidate.flowItems.slice(0, 4).map((item) => [item.title, `${item.schedule} · ${item.completion}`]),
    ];
  }
  if (override.artifact === '체크리스트') {
    return candidate.flowItems.slice(0, 5).map((item, index) => [`${index + 1}`, item.title]);
  }
  if (override.artifact === '혼합') {
    return candidate.flowItems.slice(0, 4).map((item) => [item.schedule, item.title]);
  }
  return [
    ['제목', first?.title ?? candidate.title],
    ['일정', first?.schedule ?? '사용자 설정'],
    ['메모', first?.memo ?? candidate.memo],
  ];
};

const candidates = candidateOrder.map((id) => {
  const candidate = koreanFlowContentCandidates.find((item) => item.id === id);
  const override = overrides[id];
  if (!candidate || !override) {
    throw new Error(`Missing weighted review candidate: ${id}`);
  }
  const total = weightedTotal(override.scores);
  return {
    ...candidate,
    selection: override,
    weightedScore: total,
    decision: decisionFor(total),
    artifactRows: artifactHint(candidate, override),
  };
});

const summary = {
  generatedAt: '2026-06-07',
  purpose:
    '한국어 외부 콘텐츠를 제작자/출처 맥락과 사용자 반응 중심으로 고르고, FlowMe가 캘린더/체크리스트/시트/메모 수준으로 담을 수 있는지 평가한다.',
  weights,
  counts: candidates.reduce<Record<string, number>>((acc, item) => {
    acc[item.decision] = (acc[item.decision] ?? 0) + 1;
    return acc;
  }, {}),
  categories: Array.from(new Set(candidates.map((item) => item.category))).sort(),
  candidates,
};

fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

const scoreCell = (label: string, value: number, weight: number) =>
  `<span class="score-chip"><b>${escapeHtml(label)}</b> ${value.toFixed(1)} <small>${Math.round(weight * 100)}%</small></span>`;

const artifactPreview = (item: (typeof candidates)[number]) => {
  const rows = item.artifactRows
    .map(
      ([left, right]) =>
        `<div class="artifact-row"><span>${escapeHtml(left)}</span><strong>${escapeHtml(right)}</strong></div>`,
    )
    .join('');
  return `<div class="artifact ${item.selection.artifact}">
    <div class="artifact-head">
      <span>${escapeHtml(item.selection.artifact)}</span>
      <strong>${escapeHtml(item.selection.primaryInput)}</strong>
    </div>
    ${rows}
    <p>${escapeHtml(item.memo)}</p>
  </div>`;
};

const cards = candidates
  .map((item, index) => {
    const s = item.selection.scores;
    return `<article class="candidate" id="${escapeHtml(item.id)}">
      <header>
        <div>
          <span class="rank">#${index + 1}</span>
          <span class="category">${escapeHtml(item.category)}</span>
          <span class="decision ${item.decision}">${escapeHtml(item.decision)}</span>
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.selection.selectionReason)}</p>
        </div>
        <div class="total">
          <span>가중 점수</span>
          <strong>${item.weightedScore.toFixed(2)}</strong>
        </div>
      </header>
      <section class="source-box">
        <div>
          <h3>원문/출처</h3>
          <a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceTitle)}</a>
          <p>${escapeHtml(item.selection.reactionEvidence)}</p>
        </div>
        <div>
          <h3>원문에서 옮긴 단서</h3>
          <p>${escapeHtml(item.selection.originalCue)}</p>
          <span class="check-state">${escapeHtml(item.selection.originalCheck)}</span>
        </div>
      </section>
      <section class="split">
        <div>
          <h3>Flow 변환</h3>
          ${artifactPreview(item)}
        </div>
        <div>
          <h3>점수 근거</h3>
          <div class="score-grid">
            ${scoreCell('출처/반응', s.sourceContext, weights.sourceContext)}
            ${scoreCell('따라하고 싶음', s.userDesire, weights.userDesire)}
            ${scoreCell('실행 구조', s.executionClarity, weights.executionClarity)}
            ${scoreCell('저장 변환성', s.portability, weights.portability)}
            ${scoreCell('입력 가벼움', s.inputSimplicity, weights.inputSimplicity)}
            ${scoreCell('반복성', s.reuse, weights.reuse)}
          </div>
          <p class="review-note">${escapeHtml(item.selection.reviewerNote)}</p>
        </div>
      </section>
      <section class="review-inputs" data-review-id="${escapeHtml(item.id)}">
        <div class="rating">
          <label>내 평가</label>
          <select data-field="rating">
            <option value="">선택</option>
            <option value="5">5점: 바로 대표 후보</option>
            <option value="4">4점: 조금 다듬으면 가능</option>
            <option value="3">3점: 보류</option>
            <option value="2">2점: 약함</option>
            <option value="1">1점: 제외</option>
          </select>
        </div>
        <label class="memo">검토 메모<textarea data-field="memo" placeholder="원문과 Flow 변환이 맞는지, 저장해서 쓸 것 같은지 적기"></textarea></label>
        <button type="button" data-action="save">브라우저에 저장</button>
      </section>
    </article>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>한국어 외부 콘텐츠 Flow 선별/변환 리뷰</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f9;
      --paper: #ffffff;
      --ink: #172033;
      --muted: #667085;
      --line: #d9dee8;
      --blue: #2563eb;
      --green: #0f766e;
      --amber: #b45309;
      --red: #b42318;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif; }
    a { color: var(--blue); text-decoration: none; }
    .wrap { max-width: 1160px; margin: 0 auto; padding: 28px 18px 64px; }
    .hero { background: #111827; color: #fff; padding: 28px; border-radius: 8px; }
    .hero h1 { margin: 0 0 10px; font-size: clamp(26px, 4vw, 42px); letter-spacing: 0; }
    .hero p { margin: 0; color: #d1d5db; line-height: 1.65; max-width: 860px; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0; }
    .metric { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 14px; }
    .metric span { display: block; color: var(--muted); font-size: 13px; }
    .metric strong { display: block; margin-top: 6px; font-size: 24px; }
    .rule { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin: 18px 0; }
    .rule h2 { margin: 0 0 12px; font-size: 18px; }
    .weights { display: flex; flex-wrap: wrap; gap: 8px; }
    .weights span, .score-chip { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); background: #f8fafc; border-radius: 999px; padding: 8px 10px; font-size: 13px; }
    .score-chip small { color: var(--muted); }
    .toolbar { position: sticky; top: 0; z-index: 2; background: rgba(246,247,249,.94); backdrop-filter: blur(8px); padding: 12px 0; display: flex; gap: 10px; overflow-x: auto; }
    .toolbar a, .toolbar button { border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 9px 12px; white-space: nowrap; font: inherit; cursor: pointer; color: var(--ink); }
    .candidate { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 18px; margin: 16px 0; }
    .candidate header { display: flex; justify-content: space-between; gap: 18px; border-bottom: 1px solid var(--line); padding-bottom: 14px; }
    .candidate h2 { margin: 8px 0 6px; font-size: 22px; letter-spacing: 0; }
    .candidate h3 { margin: 0 0 8px; font-size: 15px; }
    .candidate p { margin: 0; color: var(--muted); line-height: 1.55; }
    .rank, .category, .decision, .check-state { display: inline-flex; padding: 5px 8px; border-radius: 999px; font-size: 12px; margin-right: 4px; background: #eef2ff; color: #3730a3; }
    .category { background: #ecfeff; color: #155e75; }
    .decision.합격 { background: #dcfce7; color: #166534; }
    .decision.보류 { background: #fef3c7; color: #92400e; }
    .decision.제외 { background: #fee2e2; color: #991b1b; }
    .total { min-width: 104px; text-align: right; }
    .total span { display: block; color: var(--muted); font-size: 12px; }
    .total strong { font-size: 34px; }
    .source-box, .split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px; }
    .source-box > div, .split > div { border: 1px solid var(--line); background: #fbfcfe; border-radius: 8px; padding: 14px; }
    .artifact { border: 1px solid #cbd5e1; background: #fff; border-radius: 8px; padding: 12px; }
    .artifact-head { display: flex; justify-content: space-between; gap: 8px; color: var(--muted); font-size: 13px; margin-bottom: 8px; }
    .artifact-head strong { color: var(--ink); }
    .artifact-row { display: grid; grid-template-columns: 96px 1fr; gap: 10px; border-top: 1px solid #edf1f6; padding: 9px 0; }
    .artifact-row span { color: var(--muted); font-size: 13px; }
    .artifact-row strong { font-size: 14px; }
    .score-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .review-note { margin-top: 12px !important; color: var(--ink) !important; }
    .review-inputs { display: grid; grid-template-columns: 180px 1fr auto; gap: 10px; align-items: end; border-top: 1px solid var(--line); margin-top: 14px; padding-top: 14px; }
    label { display: grid; gap: 6px; color: var(--muted); font-size: 13px; }
    select, textarea { width: 100%; border: 1px solid var(--line); border-radius: 8px; padding: 10px; font: inherit; background: #fff; color: var(--ink); }
    textarea { min-height: 74px; resize: vertical; }
    button[data-action="save"], #downloadReviews { background: var(--blue); color: #fff; border-color: var(--blue); }
    @media (max-width: 760px) {
      .wrap { padding: 18px 10px 44px; }
      .hero { padding: 20px; }
      .metric-grid, .source-box, .split, .review-inputs { grid-template-columns: 1fr; }
      .candidate { padding: 14px; }
      .candidate header { display: block; }
      .total { text-align: left; margin-top: 12px; }
      .artifact-row { grid-template-columns: 74px 1fr; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <h1>한국어 외부 콘텐츠 Flow 선별/변환 리뷰</h1>
      <p>목표는 외부 콘텐츠를 많이 모으는 것이 아니라, 실제 제작자/출처 맥락과 사용자 반응이 있는 한국어 콘텐츠가 FlowMe에서 캘린더, 체크리스트, 시트, 메모 수준으로 가볍게 담길 수 있는지 판단하는 것입니다.</p>
    </section>
    <section class="metric-grid" aria-label="요약">
      <div class="metric"><span>대표 후보</span><strong>${candidates.length}</strong></div>
      <div class="metric"><span>합격</span><strong>${summary.counts['합격'] ?? 0}</strong></div>
      <div class="metric"><span>보류</span><strong>${summary.counts['보류'] ?? 0}</strong></div>
      <div class="metric"><span>제외</span><strong>${summary.counts['제외'] ?? 0}</strong></div>
    </section>
    <section class="rule">
      <h2>이번 선별 기준</h2>
      <div class="weights">
        <span>원문 신뢰/제작자 맥락/사용자 반응 30%</span>
        <span>따라하고 싶은 욕구 20%</span>
        <span>실행 구조 명확성 20%</span>
        <span>캘린더/체크/시트/메모 변환성 15%</span>
        <span>입력 복잡도 낮음 10%</span>
        <span>반복/재사용 가능성 5%</span>
      </div>
    </section>
    <nav class="toolbar" aria-label="후보 바로가기">
      <button id="downloadReviews" type="button">내 평가 JSON 다운로드</button>
      ${candidates
        .slice(0, 12)
        .map((item, index) => `<a href="#${escapeHtml(item.id)}">${index + 1}. ${escapeHtml(item.title)}</a>`)
        .join('')}
    </nav>
    ${cards}
  </main>
  <script>
    const key = 'flowme-weighted-source-flow-review-2026-06-07';
    const load = () => {
      try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; }
    };
    const saveAll = (data) => localStorage.setItem(key, JSON.stringify(data));
    const state = load();
    document.querySelectorAll('[data-review-id]').forEach((section) => {
      const id = section.getAttribute('data-review-id');
      const saved = state[id] || {};
      section.querySelectorAll('[data-field]').forEach((field) => {
        field.value = saved[field.getAttribute('data-field')] || '';
      });
      section.querySelector('[data-action="save"]').addEventListener('click', () => {
        state[id] = {};
        section.querySelectorAll('[data-field]').forEach((field) => {
          state[id][field.getAttribute('data-field')] = field.value;
        });
        saveAll(state);
      });
    });
    document.getElementById('downloadReviews').addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(load(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'flowme-weighted-source-flow-user-review.json';
      a.click();
      URL.revokeObjectURL(url);
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(htmlPath, html, 'utf8');

console.log(`Wrote ${path.relative(root, jsonPath)}`);
console.log(`Wrote ${path.relative(root, htmlPath)}`);
