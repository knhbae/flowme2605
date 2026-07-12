'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  koreanFlowContentCandidates,
  koreanFlowContentCategories,
  type KoreanFlowContentCandidate,
} from '@/lib/flow/korean-flow-content-candidates';
import {
  koreanFlowContentUserReviews,
  type KoreanFlowContentUserReview,
} from '@/lib/flow/korean-flow-content-user-review';
import {
  applyKoreanFlowContentReviewRefresh,
  applyKoreanFlowContentSourceRefresh,
} from '@/lib/flow/korean-flow-content-source-refresh';
import {
  antiRepetitionCandidateIds,
  creatorSourceBreadthCandidateIds,
  latestDiversificationCandidateIds,
  representativeCoverageGroups,
} from '@/lib/flow/flow-content-coverage-axes';

type ReviewState = {
  rating?: number;
  keep?: boolean;
  issue?: boolean;
  memo?: string;
};

type UiPattern = 'timeline' | 'routine' | 'sheet' | 'decision' | 'study' | 'checklist' | 'challenge';

type ContentAudit = {
  priority: 'P0' | 'P1' | 'P2' | 'OK';
  pattern: UiPattern;
  focus: string;
  uiDecision: string;
  exportTarget: string;
};

type PreviewTab = 'summary' | 'save' | 'execute' | 'detail';
type TraceStrength = 'strong' | 'needs_review' | 'weak';
type TraceFilter = '전체' | TraceStrength;
type FocusFilter = '전체' | '반복 방지 신규 후보' | '최근 다양화 후보' | '제작자 자료 확장';

type ExperienceField = {
  label: string;
  value: string;
  help: string;
};

type ExperienceCard = {
  title: string;
  meta: string;
  body: string;
  status: string;
};

type ExperienceRow = {
  cells: string[];
  status: string;
};

type SourceTraceRow = {
  source: string;
  artifact: string;
};

type ExperienceSpec = {
  id: string;
  surface?: 'calendar' | 'sheet' | 'checklist' | 'decision';
  resultTitle: string;
  sourceSummary: string[];
  conversionSummary: string[];
  sourceTrace?: SourceTraceRow[];
  userDecisionPoints: string[];
  fields: ExperienceField[];
  saveResult: string;
  executionTitle: string;
  executionSubtitle: string;
  executionStats: Array<{ label: string; value: string }>;
  executionCards: ExperienceCard[];
  tableColumns?: string[];
  tableRows?: ExperienceRow[];
  detailTitle: string;
  detailMeta: string;
  detailMemo: string;
  detailChecks: string[];
  sourceNote: string;
  primaryAction: string;
  secondaryActions: string[];
};

type SimulatedCalendarItem = {
  day: number;
  title: string;
  kind: 'routine' | 'schedule' | 'sheet' | 'decision';
  icon: string;
};

type SimulatedFlowExecution = {
  surface: 'calendar' | 'sheet' | 'checklist' | 'decision';
  monthLabel: string;
  startOffset: number;
  daysInMonth: number;
  selectedDay: number;
  selectedDateLabel: string;
  selectedSummary: string;
  flowViewLabel: string;
  calendarItems: SimulatedCalendarItem[];
  selectedItems: Array<{
    title: string;
    meta: string;
    body: string;
    checks: string[];
    primaryAction: string;
    secondaryActions: string[];
    statusLabel: string;
  }>;
  setupRows: Array<{ label: string; value: string }>;
};

const storageKey = 'flowme:korean-content-studio-review:v2';

const publicFlowRouteByCandidateId: Partial<Record<string, { slug: string; label: string }>> = {
  'washer-tub-clean-monthly': {
    slug: 'washer-tub-clean-monthly',
    label: '서비스 Flow 보기',
  },
  'wedding-12-month-timeline': {
    slug: 'wedding-d180-basic',
    label: '서비스 Flow 보기',
  },
  'used-car-buying-check': {
    slug: 'used-car-buying-check',
    label: '서비스 Flow 보기',
  },
  'fridge-cleanout-weekly-plan': {
    slug: 'fridge-cleanout-weekly-plan',
    label: '서비스 Flow 보기',
  },
};

const destinationLabel: Record<KoreanFlowContentCandidate['destination'], string> = {
  calendar: '캘린더',
  routine: '루틴',
  checklist: '체크',
  sheet: '시트',
  hybrid: '혼합',
};

const structureLabel: Record<KoreanFlowContentCandidate['structure'], string> = {
  single_routine: '단일 반복',
  rotating_routine: '로테이션',
  timeline: '타임라인',
  checklist: '체크리스트',
  table_plan: '표 형태',
  challenge: '챌린지',
};

const sourceTypeLabel: Record<KoreanFlowContentCandidate['sourceType'], string> = {
  creator_blog: '제작자 블로그',
  creator_video: '제작자 영상',
  official: '공식/기관',
  brand_support: '브랜드 지원',
  community: '커뮤니티',
  commerce: '커머스',
};

const patternLabel: Record<UiPattern, string> = {
  timeline: '캘린더 타임라인',
  routine: '루틴 실행',
  sheet: '관리 시트',
  decision: '결정 체크',
  study: '공부 트래커',
  checklist: '체크리스트',
  challenge: '챌린지',
};

const priorityRank = { P0: 0, P1: 1, P2: 2, OK: 3 };
const priorityDisplayLabel: Record<ContentAudit['priority'], string> = {
  P0: '우선',
  P1: '검토',
  P2: '보류',
  OK: '적합',
};

const userReviewByCandidateId = new Map(koreanFlowContentUserReviews.map((review) => [review.candidateId, review]));

const traceStrengthLabel: Record<TraceStrength, string> = {
  strong: '대응 강함',
  needs_review: '재검토 필요',
  weak: '대응 약함',
};

const traceStrengthFilterLabel: Record<TraceFilter, string> = {
  전체: '대응 전체',
  strong: '대응 강함',
  needs_review: '재검토 필요',
  weak: '대응 약함',
};

const previewTabs: Array<{ id: PreviewTab; label: string }> = [
  { id: 'summary', label: '원문 요약' },
  { id: 'save', label: 'Flow로 저장' },
  { id: 'execute', label: '실행 화면' },
  { id: 'detail', label: '상세 화면' },
];

function previewTabLabel(tab: { id: PreviewTab; label: string }, candidate: KoreanFlowContentCandidate): string {
  if (tab.id !== 'save') return tab.label;

  const traceStrength = traceStrengthFor(candidate);
  if (traceStrength === 'weak') return '보류 후보';
  if (traceStrength === 'needs_review') return '조건부 저장 검토';
  return tab.label;
}

function cardCtaLabelFor(candidate: KoreanFlowContentCandidate): string {
  const traceStrength = traceStrengthFor(candidate);
  if (traceStrength === 'weak') return '저장 후보 아님';
  if (traceStrength === 'needs_review') return '조건부 저장 검토';
  return '내 Flow에 저장';
}

function cardCtaClassFor(candidate: KoreanFlowContentCandidate): string {
  const traceStrength = traceStrengthFor(candidate);
  if (traceStrength === 'weak') return 'bg-red-700 text-white';
  if (traceStrength === 'needs_review') return 'bg-amber-600 text-white';
  return 'bg-blue-700 text-white';
}

const audits: Record<string, ContentAudit> = {
  'washer-tub-clean-monthly': {
    priority: 'P1',
    pattern: 'routine',
    focus: '월 1회 저장과 다음 실행일',
    uiDecision: '저장할 때 시작일과 반복 주기만 받고, 세척 방법·준비물·링크는 메모로 둔다.',
    exportTarget: '캘린더 반복 일정 + 체크 3개',
  },
  'lg-aircon-filter-biweekly': {
    priority: 'P1',
    pattern: 'routine',
    focus: '2주 청소와 6개월 교체 분리',
    uiDecision: '짧은 청소 루틴과 긴 교체 루틴을 같은 카드에서 구분한다.',
    exportTarget: '루틴 2개 + 교체 메모',
  },
  'air-purifier-filter-seasonal': {
    priority: 'P1',
    pattern: 'routine',
    focus: '프리필터 청소와 본필터 교체',
    uiDecision: '청소 완료와 교체 필요 판단을 별도 액션으로 둔다.',
    exportTarget: '월간 루틴 + 교체 예정일',
  },
  'robot-vacuum-monthly-care': {
    priority: 'P1',
    pattern: 'routine',
    focus: '주간/월간 관리 묶음',
    uiDecision: '오늘 할 일에는 해당 주기의 작업만 보이게 한다.',
    exportTarget: '주간 루틴 + 월간 루틴',
  },
  'humidifier-daily-weekly-clean': {
    priority: 'P1',
    pattern: 'routine',
    focus: '매일 비우기와 주간 세척',
    uiDecision: '일간 체크와 주간 체크를 한 화면에서 과하게 섞지 않는다.',
    exportTarget: '일간 루틴 + 주간 루틴',
  },
  'water-purifier-filter-cycle': {
    priority: 'P0',
    pattern: 'sheet',
    focus: '필터별 마지막 교체일과 다음 교체일',
    uiDecision: '캘린더보다 필터명/주기/상태가 있는 시트가 우선이다.',
    exportTarget: '필터 관리 시트 + 다음 교체 알림',
  },
  'monstera-care-routine': {
    priority: 'P0',
    pattern: 'routine',
    focus: '물주기보다 보류 판단',
    uiDecision: '완료만 두지 말고 물주기/보류/관찰 메모를 같이 둔다.',
    exportTarget: '확인 루틴 + 관찰 메모',
  },
  'stuckyi-overwater-prevention': {
    priority: 'P0',
    pattern: 'routine',
    focus: '물을 주지 않는 결정',
    uiDecision: '오늘 물주기 완료가 아니라 오늘 보류가 정상 결과가 될 수 있어야 한다.',
    exportTarget: '확인 루틴 + 보류 사유',
  },
  'baby-food-four-week-menu': {
    priority: 'P0',
    pattern: 'sheet',
    focus: '4주 식단표와 일별 반응',
    uiDecision: '복잡한 설명보다 일별 식단표와 반응 메모 칸이 먼저 보여야 한다.',
    exportTarget: '식단 캘린더 + 반응 시트',
  },
  'homelearn-reading-challenge': {
    priority: 'P0',
    pattern: 'sheet',
    focus: '책 목록과 읽은 상태',
    uiDecision: '책 제목/상태/다음 책을 표로 보여줘야 판단이 쉽다.',
    exportTarget: '도서 목록 시트 + 읽기 루틴',
  },
  'car-maintenance-schedule': {
    priority: 'P0',
    pattern: 'sheet',
    focus: '소모품별 주행거리와 교체 기준',
    uiDecision: '기간만으로는 부족하므로 현재 km와 마지막 교체 기록이 보이는 시트가 필요하다.',
    exportTarget: '차량 소모품 시트 + 교체 알림',
  },
  'monthly-budget-close': {
    priority: 'P0',
    pattern: 'sheet',
    focus: '월말 결산 항목과 금액',
    uiDecision: '금융 조언처럼 보이지 않게 금액 입력과 월말 체크에 한정한다.',
    exportTarget: '월말 결산 시트',
  },
  'emergency-fund-account': {
    priority: 'P0',
    pattern: 'routine',
    focus: '월급일 자동이체 확인',
    uiDecision: '상품 추천 없이 금액과 자동이체 여부만 확인한다.',
    exportTarget: '월급일 루틴 + 목표 금액 메모',
  },
  'used-car-buying-check': {
    priority: 'P1',
    pattern: 'decision',
    focus: '후보 차량별 구매/보류/거절',
    uiDecision: '사진 저장을 강요하지 않고, 핵심 체크와 최종 결정 버튼을 먼저 둔다.',
    exportTarget: '후보 차량 체크리스트 + 결정 상태',
  },
  'computer-license-2nd-written': {
    priority: 'P2',
    pattern: 'study',
    focus: '기출 풀이와 오답',
    uiDecision: '공부하기가 아니라 회차/점수/오답 유형을 남길 수 있어야 한다.',
    exportTarget: '시험일 캘린더 + 공부 기록',
  },
  'korean-history-3-week': {
    priority: 'P2',
    pattern: 'study',
    focus: '주차별 범위와 기출 회독',
    uiDecision: '시험일까지 남은 기간과 주차별 범위를 같이 보여준다.',
    exportTarget: '공부 캘린더 + 오답 기록',
  },
  'plank-30-day-challenge': {
    priority: 'P2',
    pattern: 'challenge',
    focus: 'Day 1~30 진행',
    uiDecision: '휴식일과 조정도 실패가 아니라 정상 상태로 둔다.',
    exportTarget: '30일 캘린더 + 완료 체크',
  },
  'thankyou-bubu-no-jump-home-workout': {
    priority: 'P1',
    pattern: 'routine',
    focus: '원본 영상 반복 실행',
    uiDecision: '동작 순서를 새로 만들지 않고 원본 영상 링크와 완료/몸 상태 기록만 둔다.',
    exportTarget: '반복 캘린더 + 영상 링크',
  },
  'japan-esim-setup-before-departure': {
    priority: 'P1',
    pattern: 'timeline',
    focus: '출국 전 설치와 도착 후 활성화',
    uiDecision: '여행 준비물 전체가 아니라 eSIM 설정 단계만 캘린더와 메모로 둔다.',
    exportTarget: '출국 전 캘린더 + 설정 메모',
  },
  'kids-dino-footprint-art': {
    priority: 'P1',
    pattern: 'routine',
    focus: '주말 놀이 준비와 실행',
    uiDecision: '교육 기록이 아니라 놀이 날짜, 준비물, 활동 체크만 둔다.',
    exportTarget: '주말 놀이 일정 + 준비물 메모',
  },
  'banana-peanut-recipe-video': {
    priority: 'P1',
    pattern: 'checklist',
    focus: '레시피 영상 실행',
    uiDecision: '요리 날짜와 분량만 받고 원본 영상 링크와 조리 체크를 상세에 둔다.',
    exportTarget: '요리 체크리스트 + 영상 링크',
  },
};

const representativeExperienceSpecs: Record<string, ExperienceSpec> = {
  'washer-tub-clean-monthly': {
    id: 'washer-tub-clean-monthly',
    resultTitle: '월 1회 세탁기 냄새 예방 루틴',
    sourceSummary: [
      '원문은 통세척 코스, 고무패킹 닦기, 세제통 세척, 배수필터 확인을 분리해서 설명한다.',
      '드럼은 과탄산소다 100g 또는 액상 전용 클리너, 통돌이는 뜰채와 세탁조 클리너/과탄산소다처럼 준비물이 달라진다.',
      '기본 주기는 월 1회이고, 사용량이 많거나 냄새가 반복되면 2주 1회로 임시 조정할 수 있다.',
      '세척제 종류, 구매 링크, 모델별 차이는 상세 메모로 남기고 캘린더에는 한 개 반복 일정으로 옮기는 편이 가볍다.',
    ],
    sourceTrace: [
      {
        source: '원문은 통세척 코스, 고무패킹 닦기, 세제통 세척, 배수필터 확인을 분리해서 설명한다.',
        artifact: '날짜 안 체크리스트에 통세척 코스 완료, 고무패킹 안쪽 물기 닦음, 세제통/배수필터 확인, 세탁 후 문 열어 건조가 각각 남아 있습니다.',
      },
      {
        source: '드럼은 과탄산소다 100g 또는 액상 전용 클리너, 통돌이는 뜰채와 세탁조 클리너·과탄산소다처럼 준비물이 달라진다.',
        artifact: '실행 상세의 첫 체크가 내 세탁기 방식과 준비물 확인이고, 메모에 드럼/통돌이별 준비물과 구매 링크를 남기는 흐름입니다.',
      },
      {
        source: '기본 주기는 월 1회이고 사용량이 많거나 냄새가 반복되면 2주 1회로 임시 조정할 수 있다.',
        artifact: '저장 입력은 반복 주기 매월 1회로 시작하고, 실행 상세 메모에서 냄새 반복 시 다음 실행부터 2주 1회로 조정한다고 안내합니다.',
      },
      {
        source: '구매 링크, 영상/사진 링크, 모델별 차이는 실행 입력이 아니라 참고 메모로 다루는 편이 가볍다.',
        artifact: '저장 화면은 시작일, 반복 주기, 선택 메모만 받고, 준비물·원문 링크·구매 링크는 상세 메모 쪽으로 둡니다.',
      },
    ],
    conversionSummary: [
      '캘린더에는 “세탁기 통세척” 반복 일정 하나만 들어간다.',
      '상세 화면에는 통세척 직후 체크 3개와 준비물 메모를 붙인다.',
      '사진 증빙은 기본값에서 제외하고, 완료/미룸만 빠르게 누르게 한다.',
    ],
    userDecisionPoints: ['시작일과 반복 주기만 입력하면 충분한가', '세척 방법이 메모 안에서 바로 이해되는가', '체크 항목이 너무 많지 않은가'],
    fields: [
      { label: '첫 실행일', value: '2026-06-01', help: '이 날짜부터 매월 반복 일정이 생성됩니다.' },
      { label: '반복 주기', value: '매월 1회', help: '일반적인 관리 루틴 기본값입니다.' },
      { label: '선택 메모', value: '모델/구매 링크는 나중에 메모', help: '준비물과 원문 링크는 상세 메모에 남깁니다.' },
    ],
    saveResult: 'My Flow의 루틴 탭과 캘린더에 매월 반복 일정으로 저장됩니다.',
    executionTitle: '오늘 할 루틴',
    executionSubtitle: '세탁기 냄새 예방 관리',
    executionStats: [
      { label: '남은 체크', value: '3' },
      { label: '예상 시간', value: '40분' },
      { label: '반복', value: '월 1회' },
    ],
    executionCards: [
      { title: '통세척 코스 돌리기', meta: '매월 1회', body: '드럼은 과탄산소다 100g 또는 액상 전용 클리너, 통돌이는 뜰채와 세탁조 클리너/과탄산소다 메모를 보고 통세척 또는 고온 코스를 실행합니다.', status: '대기' },
      { title: '고무패킹 물기 닦기', meta: '통세척 직후', body: '문 주변 패킹 안쪽 물기와 이물질을 마른 수건으로 닦습니다.', status: '직후 체크' },
      { title: '세제통과 배수필터 확인', meta: '월 1회', body: '세제통을 분리 세척하고 배수필터 이물질을 제거한 뒤 문 열어 건조합니다.', status: '선택 확인' },
    ],
    detailTitle: '세탁기 통세척',
    detailMeta: '매월 1일 반복 · 루틴',
    detailMemo: '준비물: 드럼은 과탄산소다 100g 또는 액상 전용 클리너, 통돌이는 뜰채와 세탁조 클리너/과탄산소다. 구매 링크와 원문 영상/사진 링크는 메모에만 남기고, 통세척 후 고무패킹과 세제통을 닦고 문 열어 건조합니다. 냄새가 반복되면 다음 실행부터 2주 1회로 조정합니다.',
    detailChecks: ['내 세탁기 방식과 준비물 확인', '통세척 코스 완료', '고무패킹 안쪽 물기 닦음', '세제통/배수필터 확인', '세탁 후 문 열어 건조'],
    sourceNote: '원문은 방법 설명이고, Flow는 실행 알림과 체크만 담당합니다.',
    primaryAction: '오늘 완료',
    secondaryActions: ['다음 달로 미루기', '메모 수정'],
  },
  'monstera-care-routine': {
    id: 'monstera-care-routine',
    resultTitle: '물주기보다 보류 판단을 돕는 식물 루틴',
    sourceSummary: [
      '원문 단서는 물주기 주기보다 겉흙, 화분 무게, 잎 상태, 분갈이 조건을 확인하는 데 있다.',
      '초보 사용자는 물을 줘야 하는지 말아야 하는지가 핵심 판단이다.',
      '환경마다 주기가 달라지므로 확정 알림보다 확인 루틴이 적합하다.',
    ],
    conversionSummary: [
      '캘린더에는 “몬스테라 상태 확인”으로 들어가고, 물주기는 상세에서 결정한다.',
      '완료 버튼 외에 “오늘은 보류”가 정상 결과로 보인다.',
      '잎 상태와 분갈이 필요 여부는 관찰 메모로 남긴다.',
    ],
    userDecisionPoints: ['보류가 실패처럼 보이지 않는가', '초보가 확인할 기준이 충분히 구체적인가', '사진 기록 없이도 쓸 수 있는가'],
    fields: [
      { label: '식물 이름', value: '거실 몬스테라', help: '여러 식물을 구분하는 이름입니다.' },
      { label: '확인 주기', value: '7~10일마다', help: '물주기가 아니라 상태 확인 주기입니다.' },
      { label: '화분 위치', value: '거실 창가', help: '메모에서 빛/통풍 판단에 사용합니다.' },
    ],
    saveResult: '오늘 탭에는 상태 확인 카드가 뜨고, 상세에서 물주기/보류/관찰 메모를 선택합니다.',
    executionTitle: '식물 루틴',
    executionSubtitle: '오늘은 물을 줄지 확인',
    executionStats: [
      { label: '최근 물준 날', value: '9일 전' },
      { label: '오늘 결과', value: '선택 전' },
      { label: '분갈이', value: '6개월 확인' },
    ],
    executionCards: [
      { title: '겉흙 마름 확인 후 물주기', meta: '7~10일마다 확인', body: '흙 2~3cm 안쪽 상태와 화분 무게를 확인한 뒤 물을 줄지 정합니다.', status: '판단 필요' },
      { title: '빛과 잎 상태 보기', meta: '2주마다', body: '밝은 간접광 위치인지 보고, 잎끝 마름·갈색 반점·새잎 성장을 확인합니다.', status: '관찰' },
      { title: '분갈이 필요 확인', meta: '6개월마다', body: '뿌리 과밀, 배수, 화분 크기를 확인합니다.', status: '장기 체크' },
    ],
    detailTitle: '몬스테라 상태 확인',
    detailMeta: '7~10일마다 · 확인 루틴',
    detailMemo: '물을 주기 전에 겉흙과 화분 무게를 먼저 봅니다. 밝은 간접광에 두고 배수구멍으로 물이 빠지는지도 확인합니다.',
    detailChecks: ['겉흙 2~3cm 안쪽 확인', '화분 무게 확인', '밝은 간접광 위치 확인', '배수구멍/받침 물 고임 확인'],
    sourceNote: '식물 상태는 환경에 따라 달라지므로 확정 지시가 아니라 확인 알림으로 표현합니다.',
    primaryAction: '물주기 완료',
    secondaryActions: ['오늘은 보류', '관찰 메모'],
  },
  'wedding-12-month-timeline': {
    id: 'wedding-12-month-timeline',
    resultTitle: '결혼식까지 남은 기간별 실행 캘린더',
    sourceSummary: [
      '원문은 D-300, D-180, D-90~D-30, D-30~D-Day처럼 결혼식까지 남은 기간별 준비물을 나눈다.',
      'D-180은 웨딩홀·스드메·예복·신혼여행 예약, D-90~D-30은 청첩장·답례품·식권·주차권·BGM·사회자 대본 점검이 핵심이다.',
      '계약 조건과 업체 비교는 캘린더 이벤트 안의 메모 또는 별도 시트로 연결하고, 당일 역할 분담은 마지막 체크리스트로 남긴다.',
    ],
    conversionSummary: [
      '기준일은 결혼식 날짜이고, 각 항목은 D-day 기반 캘린더 일정으로 변환된다.',
      'Flow 탭에서는 전체 여정을 월별 레일로 보여주고, 캘린더에는 가까운 실행 일정만 강조한다.',
      '스드메/웨딩홀 비교는 상세에서 메모/체크로 관리한다.',
    ],
    userDecisionPoints: ['D-day가 캘린더 안에서 과하게 보이지 않는가', '월별 여정이 한눈에 보이는가', '업체 비교가 체크와 메모로 충분한가'],
    fields: [
      { label: '결혼식 날짜', value: '2027-05-16', help: '모든 일정의 기준일입니다.' },
      { label: '예식 지역', value: '서울/경기', help: '웨딩홀 후보 메모의 기본 조건입니다.' },
      { label: '예상 보증 인원', value: '150명', help: '예산과 홀 비교 체크에 사용합니다.' },
    ],
    saveResult: 'D-300부터 D-1주까지 월별 일정이 생성되고, 가까운 항목은 오늘/이번 주에 노출됩니다.',
    executionTitle: '이번 달 결혼 준비',
    executionSubtitle: 'D-300~D-180 구간',
    executionStats: [
      { label: '전체 단계', value: '8' },
      { label: '이번 달', value: '2' },
      { label: '미정', value: '1' },
    ],
    executionCards: [
      { title: '예산과 웨딩홀 후보 3곳 정리', meta: 'D-300~D-180', body: '예산, 지역, 보증인원, 주차 조건을 같은 표에서 비교합니다.', status: '진행 중' },
      { title: '웨딩홀 계약금·위약금 확인', meta: 'D-10~9개월', body: '계약금, 환불 가능 시점, 위약금, 보증인원 변경 가능 기한을 계약 메모에 남깁니다.', status: '예정' },
      { title: '스드메와 본식 촬영 범위 확정', meta: 'D-8~6개월', body: '드레스, 메이크업, 스냅, 영상, 원판 포함 여부와 추가 비용을 비교합니다.', status: '예정' },
      { title: '하객 명단 1차 정리', meta: 'D-5~4개월', body: '양가 하객 명단, 예상 참석 인원, 연락처 누락 여부를 확인합니다.', status: '예정' },
      { title: '청첩장 발송과 참석 회신 확인', meta: 'D-3~2개월', body: '모바일/종이 청첩장 발송 상태와 참석 회신을 나눠 체크합니다.', status: '예정' },
      { title: '식권·좌석·BGM 준비', meta: 'D-1개월', body: '식권 수량, 좌석 배치, 입장/퇴장 BGM, 축가 파일 전달 상태를 확인합니다.', status: '예정' },
      { title: '본식 역할 분담 공유', meta: 'D-2주', body: '사회자, 축가, 축의금, 차량, 혼주 동선, 업체 담당자 연락처를 공유합니다.', status: '예정' },
      { title: '당일 비상 준비물 챙기기', meta: 'D-1주', body: '충전기, 간단한 약, 수선 키트, 예비 식권, 계약서 사본을 한 가방에 묶습니다.', status: '예정' },
    ],
    detailTitle: '예산과 웨딩홀 후보 정리',
    detailMeta: 'D-300~D-180 · 캘린더 일정',
    detailMemo: '후보 3곳의 위치, 보증인원, 보증인원 변경 가능 기한, 주차, 식대, 계약금/위약금 조건을 비교합니다.',
    detailChecks: ['예산 상한 입력', '웨딩홀 후보 3곳 정리', '보증인원 기준 입력', '보증인원 변경 가능 기한 확인', '계약금/위약금 규정 확인'],
    sourceNote: '원문 타임라인은 기본 흐름이고, 실제 계약 조건은 사용자가 직접 확인해야 합니다.',
    primaryAction: '완료 체크',
    secondaryActions: ['캘린더에서 열기', '업체 메모 추가'],
  },
  'water-purifier-filter-cycle': {
    id: 'water-purifier-filter-cycle',
    resultTitle: '필터별 교체 주기를 놓치지 않는 관리 시트',
    sourceSummary: [
      '원문은 세디먼트, 프리카본, RO/나노, 후카본 필터처럼 필터별 주기가 다르다는 점이 핵심이다.',
      '한 번의 반복 일정으로 처리하면 어떤 필터를 교체해야 하는지 알기 어렵다.',
      '필터명, 마지막 교체일, 다음 교체일, 구매 링크가 행 단위로 필요하다.',
    ],
    conversionSummary: [
      'Flow의 기본 화면은 캘린더가 아니라 시트다.',
      '각 행에서 다음 교체일이 가까워지면 캘린더 알림을 만든다.',
      '모델명과 구매 링크는 메모에 넣어 반복 입력을 줄인다.',
    ],
    userDecisionPoints: ['시트가 먼저 보여야 하는 이유가 충분한가', '필터별 다음 교체일이 명확한가', '캘린더 알림과 시트가 연결되어 보이는가'],
    fields: [
      { label: '정수기 모델', value: '사용자 입력', help: '필터 구성과 구매 링크를 구분합니다.' },
      { label: '마지막 교체일', value: '2026-05-01', help: '각 필터 행의 다음 교체일을 계산합니다.' },
      { label: '알림 방식', value: '교체 7일 전', help: '가까운 교체일만 캘린더에 표시합니다.' },
    ],
    saveResult: '필터별 관리 시트가 만들어지고, 다음 교체일이 있는 행만 캘린더 알림으로 연결됩니다.',
    executionTitle: '필터 교체 관리',
    executionSubtitle: '교체 예정 필터 확인',
    executionStats: [
      { label: '필터 행', value: '4' },
      { label: '이번 달', value: '1' },
      { label: '구매 링크', value: '메모' },
    ],
    tableColumns: ['필터', '권장 주기', '마지막 교체일', '다음 교체일', '상태'],
    tableRows: [
      { cells: ['침전 필터', '3~6개월', '2026-05-01', '2026-08-01', '정상'], status: '정상' },
      { cells: ['프리카본', '6~12개월', '2026-02-20', '2026-08-20', '예정'], status: '예정' },
      { cells: ['RO/나노', '12~24개월', '2025-09-01', '2026-09-01', '확인 필요'], status: '확인 필요' },
      { cells: ['후카본', '9~12개월', '2026-01-20', '2026-10-20', '예정'], status: '예정' },
    ],
    executionCards: [
      { title: '침전 필터 교체 확인', meta: '3~6개월', body: '모래, 녹물 등 큰 입자를 거르는 첫 단계 필터입니다.', status: '정상' },
      { title: '프리카본 필터 확인', meta: '6~12개월', body: '염소, 화학물질, 냄새 제거 필터의 교체일을 봅니다.', status: '예정' },
      { title: '코크/출수구와 자가 살균 확인', meta: '월 1회', body: '필터 외에도 코크/출수구를 닦고 제품의 자가 살균 기능을 실행합니다.', status: '위생 체크' },
      { title: 'RO/나노 필터 확인', meta: '12~24개월', body: '핵심 필터는 제조사 안내와 렌탈사 기준을 우선합니다.', status: '확인 필요' },
      { title: '후카본 필터 확인', meta: '9~12개월', body: '정수 마지막 단계의 물맛과 냄새 개선 필터를 따로 기록합니다.', status: '예정' },
    ],
    detailTitle: '후카본 필터 확인',
    detailMeta: '2026-10-20 예정 · 관리 시트',
    detailMemo: '후카본은 원문에서 9~12개월 주기로 분리되어 있습니다. 정수 마지막 단계의 물맛/냄새 변화, 코크/출수구 오염, 자가 살균 실행 여부를 함께 확인합니다.',
    detailChecks: ['후카본 필터명 확인', '물맛/냄새 변화 확인', '코크/출수구 청소', '자가 살균 기능 실행', '교체 후 마지막 교체일 수정'],
    sourceNote: '교체 주기는 모델과 사용량에 따라 달라지므로 제조사/렌탈사 기준을 우선합니다.',
    primaryAction: '교체 완료',
    secondaryActions: ['다음 달로 미루기', '구매 링크 열기'],
  },
  'used-car-buying-check': {
    id: 'used-car-buying-check',
    surface: 'decision',
    resultTitle: '후보 차량을 보고 구매/보류/거절까지 정하는 체크',
    sourceSummary: [
      '원문은 구매 전 조회, 낮 시간 방문, 실차 점검, 정비소 검수, 계약 직전 확인처럼 순서가 명확하다.',
      '핵심 결과는 완료가 아니라 구매/보류/거절 결정이다.',
      '사진 저장은 있으면 좋지만 기본 UX를 무겁게 만들면 안 된다.',
    ],
    conversionSummary: [
      '후보 차량 1대가 하나의 체크 화면이 된다.',
      '공식 조회, 성능점검기록부, 외관·타이어·침수 흔적, 시동·변속·제동, 전문가 점검을 순서대로 확인한다.',
      '사진은 선택 메모로만 두고, 보류는 정상 결과로 남긴다.',
    ],
    userDecisionPoints: ['구매/보류/거절이 완료보다 중요하게 보이는가', '사진 없이도 체크가 가능한가', '보류 사유가 자연스럽게 남는가'],
    fields: [
      { label: '차량명', value: '아반떼 CN7 2021', help: '후보 차량을 구분합니다.' },
      { label: '방문일', value: '2026-06-12', help: '현장 체크 일정으로 저장됩니다.' },
      { label: '판매처', value: '딜러/개인 선택', help: '계약 전 확인 항목을 다르게 보여줄 수 있습니다.' },
    ],
    saveResult: '후보 차량 체크리스트와 방문 일정이 생성되고, 최종 결정 상태가 Flow 카드에 남습니다.',
    executionTitle: '현장 점검',
    executionSubtitle: '방문 전/현장에서 확인',
    executionStats: [
      { label: '필수 체크', value: '8' },
      { label: '결정', value: '대기' },
      { label: '보류 사유', value: '없음' },
    ],
    executionCards: [
      { title: '예산과 후보 차량 기준 정리', meta: '방문 전', body: '총예산을 차량가, 이전비, 보험료, 정비비로 나누고 연식·주행거리별 시세를 같이 봅니다.', status: '준비' },
      { title: '성능점검기록부와 보험이력 조회', meta: '방문 전/현장', body: '사고, 교환, 누유, 수리 금액, 침수/도난 이력을 실차 설명과 대조합니다.', status: '필수' },
      { title: '자동차등록원부 압류·저당 확인', meta: '방문 전', body: '자동차등록원부에서 압류, 저당, 소유자 정보를 확인합니다.', status: '필수' },
      { title: '낮 시간 방문 준비', meta: '방문 전날', body: '낮 시간 방문, 매물 사진, 차량 정보, 손전등, 휴대폰 충전, 체크 메모를 준비합니다.', status: '준비' },
      { title: '외관·타이어·침수 흔적 확인', meta: '현장', body: '외판 단차, 도장 흔적, 시트 레일 녹, 안전벨트 진흙, 트렁크 바닥, 타이어 제조 연월을 봅니다.', status: '현장' },
      { title: '엔진·변속·제동 상태 확인', meta: '시승/현장', body: '엔진룸 누유, 냉각수, 벨트, 시동, 변속 충격, 제동감, 핸들 떨림을 체크합니다.', status: '현장' },
      { title: '정비소 검수와 예상 수리비 확인', meta: '계약 전', body: '전문가 점검 결과와 예상 수리비를 가격 판단에 반영합니다.', status: '보류 판단' },
      { title: '계약 조건 확인 후 구매/보류/거절 결정', meta: '계약 전/방문 후', body: '명의이전 비용, 보험 가입 시점, 계약서의 결함·보증·반품 조건을 확인한 뒤 결정합니다.', status: '결정' },
    ],
    detailTitle: '아반떼 CN7 후보 점검',
    detailMeta: '2026-06-12 방문 · 결정 체크',
    detailMemo: '차량 가격, 주행거리, 사고·보험 이력, 자동차등록원부 확인 결과, 전문가 점검 여부, 계약서 조건, 보류 사유를 한 메모에 남깁니다.',
    detailChecks: [
      '성능점검기록부와 보험이력 불일치 확인',
      '자동차등록원부 압류·저당 확인',
      '외관·타이어·침수 흔적 확인',
      '엔진·변속·제동 이상 여부 체크',
      '정비소 검수 또는 예상 수리비 확인',
      '계약서 결함·보증·반품 조건 확인',
      '구매/보류/거절 결정 선택',
    ],
    sourceNote: '이 체크는 차량 상태를 보증하지 않으며, 계약 전 전문가/공식 서류 확인이 우선입니다.',
    primaryAction: '구매로 결정',
    secondaryActions: ['보류', '거절'],
  },
  'plank-30-day-challenge': {
    id: 'plank-30-day-challenge',
    surface: 'calendar',
    resultTitle: '시작일 기준 30일 플랭크 실행 캘린더',
    sourceSummary: [
      '원문은 Day 1부터 Day 30까지 목표 초수를 표로 제시하고, Day 7·19·27을 휴식일로 둔다.',
      'Day 9에는 호흡 3:3 패턴처럼 오늘 확인할 체크포인트가 붙어 있다.',
      '운동 효과 설명은 실행 보장으로 쓰지 않고, 통증이나 호흡 곤란이 있으면 중단 조건으로 분리한다.',
    ],
    conversionSummary: [
      '사용자가 챌린지 시작일만 넣으면 Day 1~30이 날짜별 캘린더 일정으로 생성된다.',
      '캘린더 제목은 오늘 목표 초수와 휴식일만 담고, 자세/체크포인트는 상세 메모로 내려둔다.',
      '휴식일은 실패가 아니라 “휴식·스트레칭” 완료 항목으로 보인다.',
    ],
    userDecisionPoints: ['원문 Day 표가 캘린더에 그대로 옮겨졌는가', '운동 기록 입력이 과하지 않은가', '중단 조건이 효과 설명과 분리되어 있는가'],
    fields: [
      { label: '챌린지 시작일', value: '2026-06-01', help: 'Day 1이 이 날짜에 들어갑니다.' },
      { label: '캘린더 범위', value: '30일', help: '원문 Day 1~30 표를 그대로 씁니다.' },
      { label: '기록 방식', value: '완료/조정 메모', help: '운동 시간 기록표를 필수로 만들지 않습니다.' },
    ],
    saveResult: 'My Flow 캘린더에 30일치 목표 초수와 휴식일이 들어가고, 각 날짜 상세에서 원문 체크포인트를 확인합니다.',
    executionTitle: '오늘 목표',
    executionSubtitle: '원문 Day별 목표 초수 기준',
    executionStats: [
      { label: '전체', value: '30일' },
      { label: '휴식일', value: '3일' },
      { label: '입력', value: '시작일 1개' },
    ],
    executionCards: [
      { title: 'Day 1 플랭크 20초', meta: '2026-06-01', body: '원문 목표 초수 20초와 기본 플랭크 자세 숙지를 확인합니다.', status: '대기' },
      { title: 'Day 7 휴식·스트레칭', meta: '2026-06-07', body: '원문 휴식일입니다. 플랭크를 억지로 완료하지 않고 종아리·요추 스트레칭만 남깁니다.', status: '휴식' },
      { title: 'Day 9 플랭크 55초', meta: '2026-06-09', body: '원문 체크포인트는 호흡 3:3 패턴입니다. 목표를 낮추면 조정 메모만 남깁니다.', status: '오늘' },
      { title: 'Day 19 휴식·스트레칭', meta: '2026-06-19', body: '원문 두 번째 휴식일입니다. 회복 상태만 체크합니다.', status: '휴식' },
      { title: 'Day 27 휴식·스트레칭', meta: '2026-06-27', body: '원문 세 번째 휴식일입니다. 폼롤러 회복 또는 가벼운 스트레칭으로 표시합니다.', status: '휴식' },
      { title: 'Day 30 플랭크 150초', meta: '2026-06-30', body: '원문 마지막 목표 초수입니다. 완주 또는 재도전 여부만 가볍게 남깁니다.', status: '완주' },
    ],
    detailTitle: 'Day 9 플랭크 55초',
    detailMeta: '2026-06-09 · 캘린더 일정',
    detailMemo: '원문 Day 9 목표는 55초이고 체크포인트는 호흡 3:3 패턴입니다. 타이머를 맞추고 가능한 범위에서 진행한 뒤, 완료했는지 또는 목표를 낮춘 이유만 메모합니다.',
    detailChecks: ['타이머 55초 설정', '호흡 3:3 패턴 확인', '허리 통증/어지러움/호흡 곤란 없을 때만 진행', '완료 또는 조정 메모 남김'],
    sourceNote: '개인 블로그 계획표이므로 운동 효과를 보장하지 않습니다. 허리 통증, 어지러움, 호흡 곤란, 기존 질환 악화가 있으면 중단합니다.',
    primaryAction: '오늘 목표 완료',
    secondaryActions: ['목표 낮추기', '휴식으로 변경'],
  },
  'thankyou-bubu-no-jump-home-workout': {
    id: 'thankyou-bubu-no-jump-home-workout',
    surface: 'calendar',
    resultTitle: '원본 영상을 반복 일정으로 옮긴 홈트 캘린더',
    sourceSummary: [
      '원문은 ThankyouBUBU의 단일 follow-along 영상이며, 제목에서 점프 없음, 눕는 동작 없음, 반복 없음, 토크 없음 조건이 드러난다.',
      '사용자가 해야 할 일은 동작표를 새로 읽는 것이 아니라, 정한 요일에 원본 영상을 열고 가능한 강도로 1회 따라 하는 것이다.',
      '운동 효과를 보장하지 않고 통증, 어지러움, 호흡 곤란, 기존 질환 악화는 중단 조건으로 분리한다.',
    ],
    conversionSummary: [
      '저장할 때는 운동 시작일, 운동 요일, 시간대만 받는다.',
      '캘린더 일정에는 원본 영상 링크와 준비/실행/운동 후 기록 문구가 함께 들어간다.',
      'Flow는 동작 순서를 새로 만들지 않고, 완료 여부와 몸 상태 메모만 남긴다.',
    ],
    userDecisionPoints: ['원본 영상 기준이 실행 화면에 보이는가', '입력이 캘린더/리마인더 수준을 넘지 않는가', '운동 기록이 과하게 무겁지 않은가'],
    fields: [
      { label: '운동 시작일', value: '2026-06-08', help: '첫 홈트 일정이 이 날짜에 들어갑니다.' },
      { label: '운동 요일', value: '월/수/금', help: '처음에는 주 3회 반복으로 시작합니다.' },
      { label: '운동 시간대', value: '저녁 8시', help: '캘린더 알림 시간으로만 씁니다.' },
    ],
    saveResult: 'My Flow 캘린더에 월/수/금 홈트 일정이 생기고, 각 일정 상세에서 원본 영상 링크와 몸 상태 기록 기준을 확인합니다.',
    executionTitle: '이번 주 홈트',
    executionSubtitle: '원본 영상 1개를 정한 요일에 실행',
    executionStats: [
      { label: '반복', value: '주 3회' },
      { label: '영상', value: '1개' },
      { label: '기록', value: '완료/몸 상태' },
    ],
    executionCards: [
      { title: '월요일 홈트', meta: '2026-06-08 · 저녁 8시', body: '점프 없음, 눕는 동작 없음 조건의 원본 영상을 열고 가능한 강도로 1회 따라 합니다.', status: '대기' },
      { title: '수요일 홈트', meta: '2026-06-10 · 저녁 8시', body: 'Flow는 동작 순서를 새로 만들지 않습니다. 자세와 박자는 원본 영상에서 확인합니다.', status: '예정' },
      { title: '금요일 홈트', meta: '2026-06-12 · 저녁 8시', body: '완료 여부, 체감 난이도, 통증/어지러움 여부, 다음 회차 조정만 남깁니다.', status: '예정' },
    ],
    detailTitle: '월요일 홈트',
    detailMeta: '2026-06-08 · 반복 캘린더',
    detailMemo: '원본 영상: 전신 다이어트 최고의 운동 [점프 없음, 눕는동작 없음, 반복 없음, 토크 없음]. 운동 전 공간, 물, 매트를 준비하고 원본 영상의 자세와 박자를 보며 1회 실행합니다.',
    detailChecks: ['원본 영상 열기', '점프 없음/눕는 동작 없음 조건 확인', '가능한 강도로 1회 실행', '완료 여부와 몸 상태 메모', '통증/어지러움/호흡 곤란 시 중단'],
    sourceNote: '제작자 영상 경험을 반복 일정으로 옮긴 것이며, 운동 처방이나 효과 보장이 아닙니다.',
    primaryAction: '오늘 홈트 완료',
    secondaryActions: ['강도 낮추기', '휴식으로 변경'],
  },
  'japan-esim-setup-before-departure': {
    id: 'japan-esim-setup-before-departure',
    surface: 'calendar',
    resultTitle: '출국 전 설치하고 도착 후 켜는 eSIM 체크',
    sourceSummary: [
      '원문 흐름은 eSIM 상품 확인, QR/설치 메일 보관, 출국 전 프로필 설치, 도착 후 현지 데이터 활성화로 나뉜다.',
      '사용자가 입력할 것은 출국일, 사용 기기, 알림 시간 정도면 충분하다.',
      'APN, 데이터 로밍, 기기별 화면 차이는 일정 입력이 아니라 상세 메모와 원문 링크로 내려야 한다.',
    ],
    sourceTrace: [
      {
        source: '구매 전 기기 지원 여부와 일본 상품 조건을 확인해야 한다.',
        artifact: 'D-3 일정의 첫 체크가 eSIM 지원 기기와 상품 조건 확인으로 들어갑니다.',
      },
      {
        source: 'QR 코드와 설치 안내 메일을 보관해야 공항에서 다시 찾지 않는다.',
        artifact: 'D-2 일정에 QR 코드, 주문번호, 고객센터 링크 저장 체크가 생깁니다.',
      },
      {
        source: '출국 전 프로필은 설치하되 현지 데이터 활성화는 도착 후로 둔다.',
        artifact: 'D-1 상세 메모에 프로필 설치와 현지 데이터 OFF 상태를 함께 남깁니다.',
      },
      {
        source: '도착 후 현지 회선을 켜고 지도/메신저 연결을 확인한다.',
        artifact: 'D-Day 일정은 지도와 메신저가 현지 데이터로 연결되는지를 완료 기준으로 둡니다.',
      },
    ],
    conversionSummary: [
      '여행 준비물 전체가 아니라 eSIM 설정만 별도 Flow로 분리한다.',
      '캘린더에는 D-3, D-2, D-1, D-Day 네 개 일정이 들어간다.',
      '설정 화면 캡처, APN, 고객센터 링크는 상세 메모에 붙인다.',
    ],
    userDecisionPoints: ['여행 준비물 후보와 충분히 다른가', '설정 단계가 일정으로 자연스러운가', '입력이 캘린더 수준을 넘지 않는가'],
    fields: [
      { label: '출국일', value: '2026-06-20', help: 'D-3부터 D-Day까지 일정이 계산됩니다.' },
      { label: '사용 기기', value: 'iPhone', help: '상세 메모에서 기기별 설정 링크를 고릅니다.' },
      { label: '알림 시간', value: '오전 10시', help: '각 체크 일정의 기본 알림 시간입니다.' },
    ],
    saveResult: '출국 3일 전부터 도착일까지 eSIM 준비 일정이 생성되고, 각 일정 상세에 원문 링크와 설정 메모가 붙습니다.',
    executionTitle: '출국 전 통신 설정',
    executionSubtitle: 'eSIM 구매/설치/도착 후 연결',
    executionStats: [
      { label: '일정', value: '4개' },
      { label: '입력', value: '3개' },
      { label: '상세', value: '설정 메모' },
    ],
    executionCards: [
      { title: 'eSIM 지원 기기와 상품 조건 확인', meta: 'D-3', body: '사용 기기, 일본 상품, 사용 기간, 데이터 용량을 확인합니다.', status: '준비' },
      { title: 'QR 코드와 설치 메일 저장', meta: 'D-2', body: 'QR 코드, 주문번호, 고객센터 링크를 캡처하거나 메모에 붙입니다.', status: '저장' },
      { title: '출국 전 eSIM 프로필 설치', meta: 'D-1', body: 'eSIM 프로필을 추가하고 회선 이름을 일본 여행으로 바꿉니다. 현지 데이터는 도착 후 켭니다.', status: '설치' },
      { title: '도착 후 현지 데이터 연결 확인', meta: 'D-Day', body: '셀룰러 데이터를 eSIM으로 바꾸고 지도와 메신저 연결을 확인합니다.', status: '도착 후' },
    ],
    detailTitle: '출국 전 eSIM 프로필 설치',
    detailMeta: '2026-06-19 · 캘린더 일정',
    detailMemo: '설정에서 eSIM을 추가하고 회선 이름을 일본 여행으로 바꿉니다. 데이터 로밍/APN/고객센터 링크는 원문 메모를 확인하고, 현지 데이터 활성화는 도착 후 진행합니다.',
    detailChecks: ['QR 코드 또는 설치 코드 열기', 'eSIM 프로필 추가', '회선 이름을 일본 여행으로 변경', '현지 데이터는 아직 끄기', '원문/고객센터 링크 저장'],
    sourceNote: '판매처/통신사별 활성화 시점과 APN 설정이 다를 수 있으므로 원문과 판매처 안내를 우선합니다.',
    primaryAction: '설치 완료',
    secondaryActions: ['D-Day 확인 열기', '메모 수정'],
  },
  'kids-dino-footprint-art': {
    id: 'kids-dino-footprint-art',
    surface: 'calendar',
    resultTitle: '주말 놀이 일정 안에 준비물과 활동 체크를 넣은 Flow',
    sourceSummary: [
      '원문 단서는 공룡 사전, 공룡 피규어, 화석 놀이, 클레이, 공룡 발자국 일러스트처럼 놀이 소재와 준비물이 구체적이라는 점이다.',
      '부모에게 필요한 것은 교육 기록 앱이 아니라 토요일에 무엇을 꺼내고 어떤 순서로 놀지다.',
      '아이 반응은 사진 증빙이 아니라 다음 놀이 선택을 위한 한 줄 메모면 충분하다.',
    ],
    sourceTrace: [
      {
        source: '공룡 피규어, 클레이, 발자국 일러스트 같은 준비물이 있다.',
        artifact: '놀이 전날 준비물 체크에 공룡 그림/피규어, 물감 또는 클레이, 종이, 물티슈가 들어갑니다.',
      },
      {
        source: '공룡 발자국 소재가 활동의 중심이다.',
        artifact: '놀이 시간 카드가 발자국 찍기와 색 고르기 행동으로 변환됩니다.',
      },
      {
        source: '놀이 확장은 아이 관심에서 이어진다.',
        artifact: '상세 체크에는 발자국 따라 이야기 만들기와 아이 말 한 줄 메모가 있습니다.',
      },
    ],
    conversionSummary: [
      '캘린더에는 주말 놀이 일정 하나가 생긴다.',
      '상세에는 준비물, 놀이 활동, 정리, 다음 후보만 둔다.',
      '발달 평가나 교육 효과 기록은 기본 화면에서 제외한다.',
    ],
    userDecisionPoints: ['부모가 바로 준비할 수 있는가', '기록 앱처럼 무거워지지 않았는가', '다음 놀이로 이어지는가'],
    fields: [
      { label: '놀이 날짜', value: '2026-06-13', help: '주말 놀이 일정으로 저장됩니다.' },
      { label: '아이 연령', value: '5세', help: '메모의 놀이 난이도 참고값입니다.' },
      { label: '알림 시간', value: '토요일 오전 10시', help: '놀이 시작 전 알림입니다.' },
    ],
    saveResult: '주말 캘린더에 놀이 일정이 생기고, 상세에서 준비물과 놀이 체크를 바로 확인합니다.',
    executionTitle: '이번 주말 놀이',
    executionSubtitle: '공룡 발자국 미술 놀이',
    executionStats: [
      { label: '준비물', value: '4개' },
      { label: '활동', value: '3단계' },
      { label: '기록', value: '한 줄' },
    ],
    executionCards: [
      { title: '공룡 놀이 준비물 꺼내기', meta: '놀이 전날', body: '공룡 그림/피규어, 물감 또는 클레이, 종이, 물티슈를 한곳에 모읍니다.', status: '준비' },
      { title: '공룡 발자국 찍기', meta: '놀이 시간', body: '피규어 발이나 손가락/도구로 발자국을 찍고 아이가 색을 고르게 둡니다.', status: '진행' },
      { title: '발자국 따라 이야기 만들기', meta: '놀이 중', body: '어떤 공룡이 지나갔는지, 어디로 갔는지 아이가 말하게 합니다.', status: '놀이' },
      { title: '작품 말리고 다음 놀이 고르기', meta: '놀이 후', body: '작품을 말리고 다음 주에 하고 싶은 공룡/동물 놀이 후보를 하나 고릅니다.', status: '정리' },
    ],
    detailTitle: '공룡 발자국 미술 놀이',
    detailMeta: '2026-06-13 · 주말 놀이',
    detailMemo: '공룡 그림/피규어, 물감 또는 클레이, 종이, 물티슈를 준비합니다. 발자국 작품을 만들고, 아이가 말한 공룡 이야기를 한 줄만 남깁니다.',
    detailChecks: ['준비물 모으기', '발자국 찍기', '아이 색 선택 기다리기', '아이 말 한 줄 메모', '작품 말리고 정리'],
    sourceNote: '교육 효과 보장이 아니라 보호자가 참고하는 놀이 아이디어입니다.',
    primaryAction: '놀이 완료',
    secondaryActions: ['다음 놀이 고르기', '메모 수정'],
  },
  'banana-peanut-recipe-video': {
    id: 'banana-peanut-recipe-video',
    surface: 'checklist',
    resultTitle: '짧은 레시피 영상을 당일 체크리스트로 옮긴 Flow',
    sourceSummary: [
      '원문은 바나나, 계란, 땅콩버터를 내열 용기에 넣고 에어프라이어로 굽는 짧은 조리 영상이다.',
      '사용자에게 필요한 것은 식단 기록이 아니라 재료 확인, 섞기, 굽기, 다음 조리 메모다.',
      '원본 영상 링크와 온도/시간은 상세 메모에 두고, 칼로리나 영양 기록은 기본에서 제외한다.',
    ],
    sourceTrace: [
      {
        source: '바나나, 계란, 땅콩버터, 에어프라이어용 내열 용기가 필요하다.',
        artifact: '첫 체크가 재료와 용기 준비 완료로 들어갑니다.',
      },
      {
        source: '바나나를 으깨고 계란과 땅콩버터를 섞는 짧은 조리 순서가 있다.',
        artifact: '조리 시작 체크는 용기에 재료 넣고 섞기로 변환됩니다.',
      },
      {
        source: '원문 영상의 굽기 시간과 완성 상태를 확인해야 한다.',
        artifact: '굽기 체크는 원본 영상의 온도/시간 확인을 상세 메모에 둡니다.',
      },
    ],
    conversionSummary: [
      '요리 날짜, 분량, 알림 시간만 입력한다.',
      '실행 화면은 네 단계 체크리스트와 원본 영상 링크 중심이다.',
      '맛/변형 메모는 한 줄만 남겨 다음 실행에 쓰게 한다.',
    ],
    userDecisionPoints: ['요리 앱처럼 무거워지지 않았는가', '원본 영상으로 돌아갈 수 있는가', '체크만으로 따라 할 수 있는가'],
    fields: [
      { label: '요리 날짜', value: '2026-06-14', help: '오늘 체크리스트로 저장됩니다.' },
      { label: '분량', value: '3개', help: '재료 메모에만 반영됩니다.' },
      { label: '알림 시간', value: '오후 3시', help: '간식 시간 알림입니다.' },
    ],
    saveResult: '오늘 체크리스트에 레시피 실행 4단계가 생기고, 상세에서 원본 영상 링크와 조리 메모를 봅니다.',
    executionTitle: '오늘 요리 체크',
    executionSubtitle: '바나나 땅콩버터 빵',
    executionStats: [
      { label: '체크', value: '4개' },
      { label: '예상', value: '20분' },
      { label: '입력', value: '3개' },
    ],
    executionCards: [
      { title: '재료 확인', meta: '요리 전', body: '바나나, 계란, 땅콩버터, 에어프라이어용 내열 용기를 준비합니다.', status: '준비' },
      { title: '용기에 재료 넣고 섞기', meta: '조리 시작', body: '바나나를 으깨고 계란과 땅콩버터를 넣어 섞습니다.', status: '진행' },
      { title: '에어프라이어에 굽기', meta: '조리 중', body: '원문 영상의 온도/시간을 확인해 굽고 중간 상태를 봅니다.', status: '굽기' },
      { title: '식힘 후 맛/변형 메모', meta: '조리 후', body: '다음에 바꿀 분량, 굽기 시간, 토핑 후보만 한 줄로 남깁니다.', status: '메모' },
    ],
    detailTitle: '바나나 땅콩버터 빵',
    detailMeta: '2026-06-14 · 요리 체크리스트',
    detailMemo: '원본 영상 링크와 조리 온도/시간을 먼저 확인합니다. 바나나, 계란, 땅콩버터, 내열 용기를 준비하고, 조리 후 다음에 바꿀 점만 한 줄로 남깁니다.',
    detailChecks: ['재료와 용기 준비', '바나나 으깨기', '계란과 땅콩버터 섞기', '원문 영상 기준으로 굽기', '다음 조리 메모 1줄'],
    sourceNote: '레시피 실행 메모이며 알레르기, 식단 효과, 칼로리 판단은 다루지 않습니다.',
    primaryAction: '요리 완료',
    secondaryActions: ['원본 영상 열기', '메모 수정'],
  },
  'college-dorm-move-in-checklist': {
    id: 'college-dorm-move-in-checklist',
    surface: 'checklist',
    resultTitle: '최신 공지 확인부터 입사 당일 시설점검까지 나누는 기숙사 체크',
    sourceSummary: [
      '학교 기숙사 안내와 학기별 PDF 공지는 입사일, 제출서류, 침구/개인 물품, 반입금지 물품, 택배/주소, 시설점검을 학교별로 다르게 안내한다.',
      '실행 단서는 최신 공지 재확인, 결핵검사 등 제출서류 준비, 침구와 첫날 생활용품, 반입금지 물품 제외, 입사 당일 접수와 시설점검으로 나뉜다.',
      '사용자는 입사일 하나를 기준으로 공지 재확인과 D-Day 절차를 캘린더/체크리스트에 함께 남겨야 한다.',
    ],
    sourceTrace: [
      { source: '학교별 입사일, 제출서류, 반입금지 물품은 최신 기숙사 공지와 학기별 PDF가 우선이다.', artifact: 'D-14 첫 카드가 최신 기숙사 공지 다시 확인으로 생성됩니다.' },
      { source: '여러 공지에서 결핵검사, 건강확인서, 서약서, 신분 확인 등 제출서류가 보인다.', artifact: 'D-10 카드가 제출서류 준비 시작으로 나뉩니다.' },
      { source: '침구, 세면도구, 수건, 슬리퍼, 개인 학습도구처럼 첫날 바로 필요한 물건이 보인다.', artifact: 'D-7 카드가 침구와 첫날 생활용품 체크리스트로 나뉩니다.' },
      { source: '전열기구, 취사도구, 화재위험 물품, 주류처럼 학교별 반입금지 목록이 다르다.', artifact: 'D-5 카드가 반입금지 물품 빼기로 변환됩니다.' },
      { source: '입사 당일에는 호실 확인, 서류 제출, 카드키 수령, 시설점검표 작성 같은 현장 절차가 이어진다.', artifact: 'D-Day 카드가 입사 당일 절차와 시설점검 처리로 남습니다.' },
    ],
    conversionSummary: [
      '기숙사 입사일만 입력하면 D-14부터 D-Day까지 준비 체크가 생긴다.',
      '최신 공지, 제출서류, 첫날 물품, 반입금지, 입사 당일 절차를 별도 그룹으로 보여준다.',
      '건강서류 이미지, 납부 계좌, 호실 비밀번호, 학생증/주민번호는 FlowMe에 저장하지 않는다.',
    ],
    userDecisionPoints: ['기숙사 입사가 이사/결혼과 다른 학생 전환 Flow로 보이는가', '최신 공지 확인이 첫 행동으로 보이는가', 'D-Day 입사 절차가 빠지지 않는가'],
    fields: [
      { label: '기숙사 입사일', value: '2026-08-28', help: 'D-14, D-10, D-7, D-5, D-Day 일정 기준입니다.' },
      { label: '학교/기숙사명', value: 'OO대학교 기숙사', help: '공식 공지와 제출서류 확인 메모에 씁니다.' },
      { label: '최근 공지 링크', value: '학교 공지 저장', help: '학교별 최신 공지가 우선이라는 경고와 함께 남깁니다.' },
    ],
    saveResult: '입사일 전 체크리스트가 생성되고, My Flow 체크 탭에서 최신공지/서류/물품/반입금지/D-Day 그룹으로 실행합니다.',
    executionTitle: '기숙사 입사 준비',
    executionSubtitle: '학교별 최신 공지가 우선',
    executionStats: [
      { label: '그룹', value: '5개' },
      { label: '필수', value: '서류' },
      { label: '입력', value: '3개' },
    ],
    executionCards: [
      { title: '최신 기숙사 공지 다시 확인', meta: 'D-14', body: '학교 기숙사 공지에서 입사일, 제출서류, 반입금지 물품, 택배 주소, 입사 시간 변경 여부를 먼저 확인합니다.', status: '최우선' },
      { title: '제출서류 준비 시작', meta: 'D-10', body: '결핵검사, 건강확인서, 서약서, 신분 확인 서류가 필요한지 확인하고 준비 방법과 제출기한을 적습니다.', status: '서류' },
      { title: '침구와 첫날 생활용품 챙기기', meta: 'D-7', body: '매트리스 크기, 침구, 세면도구, 수건, 슬리퍼, 개인 학습도구처럼 첫날 바로 쓰는 물건을 먼저 넣습니다.', status: '준비' },
      { title: '반입금지 물품 빼기', meta: 'D-5', body: '전열기구, 취사도구, 화재위험 물품, 주류처럼 학교별 금지 품목을 짐에서 제외합니다.', status: '제외' },
      { title: '입사 당일 절차와 시설점검 처리', meta: 'D-Day', body: '호실 확인, 서류 제출, 카드키 수령, 시설점검표 작성, 금지물품 반입 여부 확인을 현장에서 처리합니다.', status: '입사' },
    ],
    detailTitle: '최신 기숙사 공지 다시 확인',
    detailMeta: 'D-14 · 기숙사 입사 준비',
    detailMemo: '학교 기숙사 공지에서 입사일, 입사 시간, 제출서류, 반입금지 물품, 택배 주소, 시설점검 절차가 최신 안내와 맞는지 먼저 확인합니다. 건강서류 이미지, 납부 계좌, 호실 비밀번호, 학생증/주민번호는 FlowMe에 저장하지 않습니다.',
    detailChecks: ['최신 기숙사 공지 열기', '입사일/시간 변경 여부 확인', '제출서류 목록 확인', '반입금지 물품 확인', 'D-Day 접수/시설점검 절차 확인'],
    sourceNote: '공식 기숙사 안내와 학기별 PDF를 실행 체크로 정리한 후보입니다. 학교별 최신 공지가 우선입니다.',
    primaryAction: '최신 공지 확인 완료',
    secondaryActions: ['D-Day 절차 보기', '공지 링크 열기'],
  },
  'elementary-school-entry-d30': {
    id: 'elementary-school-entry-d30',
    surface: 'calendar',
    resultTitle: '공식 안내를 먼저 확인하는 초등 입학 D-30 Flow',
    sourceSummary: [
      '공식 단서는 취학통지서 발급, 우편·인편 통지, 학교별 예비소집이다.',
      '학부모 체크리스트의 좋은 단서는 네임스티커, 등교 동선, 입학식 전날 가방 점검처럼 실행 가능한 행동이다.',
      '구매 목록은 먼저 살 것과 학교 안내 전 보류할 것으로 나누어야 한다.',
    ],
    sourceTrace: [
      { source: '교육부 안내에는 정부24 취학통지서와 학교별 예비소집이 있다.', artifact: '첫 일정은 취학통지·예비소집·학교 홈페이지 확인입니다.' },
      { source: '학부모 체크리스트에는 가방, 실내화, 필기구처럼 공통 준비물이 보인다.', artifact: '구매 카드는 먼저 살 물건만 정하는 단계로 좁힙니다.' },
      { source: '공책, 미술도구, 추가 서류는 학교마다 달라질 수 있다.', artifact: '학교 안내 전 보류할 물건 카드가 따로 생깁니다.' },
      { source: '네임스티커, 등교 동선, 입학식 전날 점검 단서가 있다.', artifact: '이름 표시와 등교 연습/입학식 가방 점검이 캘린더에 남습니다.' },
    ],
    conversionSummary: [
      '입학식 날짜 하나로 D-30부터 D-1까지 준비 일정이 생긴다.',
      '첫 카드는 공식 취학통지와 예비소집 확인이며, 민감 정보 저장을 유도하지 않는다.',
      '구매 추천은 낮추고 먼저 살 것, 보류할 것, 이름 표시, 아이와 연습하는 행동을 분리한다.',
    ],
    userDecisionPoints: ['입학 준비가 구매 리스트로만 보이지 않는가', '학교별 확인이 공식 안내로 분리되는가', '먼저 살 것과 보류할 것이 구분되는가'],
    fields: [
      { label: '입학식 날짜', value: '2027-03-02', help: 'D-30부터 전날까지 일정이 생성됩니다.' },
      { label: '학교명', value: 'OO초등학교', help: '학교 안내문 확인 메모에 사용합니다.' },
      { label: '학교 안내문', value: '확인 전', help: '학교별 준비물 차이를 표시합니다.' },
    ],
    saveResult: '입학식 전 준비 일정이 캘린더에 생성되고, 상세에는 공식 안내 확인, 보류 항목, 이름 표시, 등교 연습 체크가 먼저 보입니다.',
    executionTitle: '초등 입학 준비',
    executionSubtitle: 'D-30부터 전날까지',
    executionStats: [
      { label: '일정', value: '5개' },
      { label: '중심', value: '학교 안내' },
      { label: '보류', value: '안내 후 구매' },
    ],
    executionCards: [
      { title: '취학통지·예비소집 안내 확인', meta: 'D-30', body: '정부24 또는 지자체 취학통지, 학교 예비소집 일정, 학교 홈페이지 공지를 확인합니다.', status: '공식' },
      { title: '먼저 살 물건만 정하기', meta: 'D-21', body: '책가방, 실내화, 실내화 주머니, 연필, 지우개처럼 학교가 달라도 먼저 준비해도 되는 물건만 고릅니다.', status: '결정' },
      { title: '학교 안내 전 보류할 물건 표시', meta: 'D-14', body: '공책, 종합장, 미술도구, 색연필/사인펜 종류, 추가 서류처럼 학교별로 달라질 수 있는 항목은 보류합니다.', status: '보류' },
      { title: '네임스티커와 이름 표시하기', meta: 'D-7', body: '연필, 지우개, 물통, 실내화, 가방에 이름을 붙이고 학교 안내문에서 개인 물품 표기 방식이 있는지 확인합니다.', status: '표시' },
      { title: '등교 동선과 입학식 가방 점검', meta: 'D-3~D-1', body: '학교까지 가는 길, 횡단보도, 통학 시간, 가방 무게를 아이와 확인하고 전날 요구 물품만 넣습니다.', status: '연습' },
    ],
    detailTitle: '학교 안내 전 보류할 물건 표시',
    detailMeta: 'D-14 · 입학 준비',
    detailMemo: '공책, 종합장, 미술도구, 색연필/사인펜 종류, 추가 서류처럼 학교나 담임 안내에 따라 달라질 수 있는 항목은 지금 사지 않고 보류합니다. 아동 주민번호, 취학통지서 이미지, 건강 정보, 지원금 세부 금액은 FlowMe에 저장하지 않습니다.',
    detailChecks: ['공책/종합장 보류', '미술도구 보류', '색연필/사인펜 종류 보류', '학교/담임 안내 후 구매', '민감 정보 미저장 확인'],
    sourceNote: '교육부 취학통지·예비소집 안내를 공식 기준으로 두고, 학부모 체크리스트는 이름 표시와 등교 동선 같은 보조 실행 단서로만 사용합니다.',
    primaryAction: '보류 항목 확인',
    secondaryActions: ['학교 안내 열기', 'D-7 이름 표시 보기'],
  },
  'kids-printable-squishy-craft': {
    id: 'kids-printable-squishy-craft',
    surface: 'checklist',
    resultTitle: '도안 링크를 보존하고 놀이 준비만 돕는 만들기 Flow',
    sourceSummary: [
      '원문은 제작자 도안 콘텐츠이며, 사용자는 도안 저장, 출력, 재료 준비, 만들기 시간을 정해야 실제로 활용한다.',
      'Flow는 도안을 복제하지 않고 원문 링크와 사용 조건 확인을 먼저 보여줘야 한다.',
      '교육 효과나 발달 평가는 목적이 아니며, 보호자가 안전한 작업 범위를 정하는 것이 핵심이다.',
    ],
    sourceTrace: [
      { source: '제작자 도안과 사용 안내가 원문에 있다.', artifact: '첫 체크가 원문 도안 링크와 사용 조건 저장입니다.' },
      { source: '만들기 전에 출력물과 투명테이프/손코팅지, 가위 같은 재료가 필요하다.', artifact: '놀이 전날 재료 준비 체크로 변환됩니다.' },
      { source: '아이 연령에 따라 자르기 어려운 부분은 보호자가 맡아야 한다.', artifact: '안전한 작업 범위 정리 체크가 들어갑니다.' },
      { source: '완성 후 다음 놀이로 이어질 수 있다.', artifact: '완성품 사진은 선택 메모로만 남기고 다음 놀이 후보를 고릅니다.' },
    ],
    conversionSummary: [
      '놀이 날짜, 출력 여부, 아이 연령만 받는다.',
      '원문 도안 링크, 출력, 재료, 안전한 작업 범위, 놀이 완료만 체크한다.',
      '도안 파일 자체와 교육 평가 기록은 Flow에 넣지 않는다.',
    ],
    userDecisionPoints: ['원문 링크 활용이 분명한가', '도안 복제처럼 보이지 않는가', '부모가 놀이 전 바로 준비할 수 있는가'],
    fields: [
      { label: '놀이 날짜', value: '2026-06-13', help: '주말 놀이 체크리스트가 이 날짜에 생성됩니다.' },
      { label: '도안 출력', value: '아직 안 함', help: '출력 준비 여부만 표시합니다.' },
      { label: '아이 연령', value: '6세', help: '보호자 사전 손질 범위를 판단합니다.' },
    ],
    saveResult: '주말 놀이 체크리스트가 생기고, 상세에는 원문 도안 링크와 재료 준비만 남습니다.',
    executionTitle: '이번 주말 만들기',
    executionSubtitle: '도안 출력과 재료 준비',
    executionStats: [
      { label: '체크', value: '4개' },
      { label: '원문', value: '도안 링크' },
      { label: '기록', value: '선택 메모' },
    ],
    executionCards: [
      { title: '원문 도안 링크 저장', meta: '놀이 전', body: '도안 다운로드/비밀번호/사용 안내를 원문에서 확인하고 링크를 메모에 붙입니다.', status: '원문' },
      { title: '도안 출력과 코팅/테이프 준비', meta: '놀이 전날', body: '프린터, 종이, 투명테이프 또는 손코팅지, 가위를 준비합니다.', status: '준비' },
      { title: '자르기 어려운 부분 미리 손질', meta: '놀이 전날', body: '아이 연령에 맞춰 위험한 가위질이나 세밀한 자르기는 보호자가 미리 해둡니다.', status: '안전' },
      { title: '아이와 만들고 정리하기', meta: '놀이 당일', body: '원문 사진/영상을 보며 만들고, 완성품 사진은 선택 메모로만 남깁니다.', status: '놀이' },
    ],
    detailTitle: '도안 출력과 재료 준비',
    detailMeta: '놀이 전날 · 도안 놀이',
    detailMemo: '원문 도안 링크를 열어 사용 조건과 출력 안내를 확인합니다. 종이, 투명테이프 또는 손코팅지, 가위, 정리용 봉투를 준비하고 위험한 자르기는 보호자가 먼저 합니다.',
    detailChecks: ['원문 도안 링크 열기', '사용 조건/비밀번호 확인', '도안 출력', '테이프/손코팅지/가위 준비', '보호자 사전 손질 범위 정리'],
    sourceNote: '제작자 도안의 사용 조건과 저작권은 원문 안내를 따릅니다. 칼/가위/작은 부품 사용은 보호자가 아이 연령에 맞게 조정합니다.',
    primaryAction: '놀이 준비 완료',
    secondaryActions: ['원문 열기', '놀이 당일로 이동'],
  },
  'anydesk-remote-setup-check': {
    id: 'anydesk-remote-setup-check',
    surface: 'checklist',
    resultTitle: '원격 지원 전 설치와 보안 종료까지 확인하는 체크',
    sourceSummary: [
      '원문은 공식 사이트 다운로드, Windows 설치, AnyDesk 주소 확인, 원격 ID 입력, 연결 요청 수락, 파일 전송, 보안 설정, 종료 주의를 다룬다.',
      '원격 지원은 설치보다 먼저 누가 요청한 지원인지, 내가 먼저 요청한 trusted support인지 확인해야 한다.',
      'Flow에 저장할 것은 비밀번호나 인증값이 아니라 지원 예정일, 상대 기기 OS, 지원 방식 정도다.',
      '원격 접속은 사용자 동의와 세션 종료/보안 확인이 실행의 일부여야 한다.',
    ],
    sourceTrace: [
      { source: '원격 접속 요청은 상대와 목적을 먼저 확인해야 안전하게 진행할 수 있다.', artifact: '첫 체크가 “누가 먼저 요청한 지원인지 확인”입니다.' },
      { source: '공식 사이트에서 OS별 설치 파일을 받는 단계가 있다.', artifact: '다음 체크가 공식 사이트 설치 파일 받기입니다.' },
      { source: '원격 접속에는 AnyDesk ID 또는 별칭이 필요하다.', artifact: '주소 확인 체크가 생기지만 비밀번호/인증값은 저장하지 않습니다.' },
      { source: '연결 요청을 상대가 수락해야 세션이 시작된다.', artifact: '일회성 지원은 무인 접속이 아니라 상대의 직접 수락으로 진행합니다.' },
      { source: '원격 종료 후 보안 설정 확인이 필요하다.', artifact: '마지막 체크가 세션 종료와 자동 접속/비밀번호 설정 확인입니다.' },
    ],
    conversionSummary: [
      '캘린더보다 순서형 체크리스트가 우선이다.',
      '첫 action은 설치가 아니라 trusted support 확인이다.',
      'AnyDesk 주소/비밀번호/인증값은 저장하지 않는다는 안내가 보인다.',
      '완료 기준은 작업 성공뿐 아니라 세션 종료와 보안 확인이다.',
    ],
    userDecisionPoints: ['원격 접속 보안 경계가 충분한가', '설치/주소/수락/종료 순서가 명확한가', '민감 정보 입력을 유도하지 않는가'],
    fields: [
      { label: '지원 예정일', value: '2026-06-15', help: '캘린더 참고용이며 필수 실행은 체크리스트입니다.' },
      { label: '상대 기기 OS', value: 'Windows', help: '설치 안내 링크를 고르는 기준입니다.' },
      { label: '지원 방식', value: '가족 원격 도움', help: '동의와 세션 종료를 확인합니다.' },
    ],
    saveResult: '원격 지원 체크리스트가 생성되고, 상세에서 공식 링크와 민감 정보 미저장 안내를 확인합니다.',
    executionTitle: '원격 지원 준비',
    executionSubtitle: '상대 확인부터 수동 승인, 세션 종료까지',
    executionStats: [
      { label: '체크', value: '5개' },
      { label: '민감 정보', value: '저장 안 함' },
      { label: '기본', value: '수동 승인' },
    ],
    executionCards: [
      { title: '누가 먼저 요청한 지원인지 확인', meta: '지원 전', body: '내가 먼저 요청한 가족, 업체, 사내 지원인지 확인합니다. 모르는 사람이 전화나 메신저로 원격 접속을 요구하면 진행하지 않습니다.', status: '상대 확인' },
      { title: '공식 사이트에서 설치 파일 받기', meta: '지원 전', body: 'AnyDesk 공식 사이트에서 OS에 맞는 버전을 받고 로컬/원격 기기 모두 실행 가능한지 확인합니다.', status: '설치' },
      { title: '원격 기기 AnyDesk 주소 확인', meta: '지원 시작 전', body: '상대 기기의 9~10자리 ID 또는 별칭을 확인하되, AnyDesk 주소, 비밀번호, 인증값은 Flow에 저장하지 않습니다.', status: '확인' },
      { title: '수동 승인 후 필요한 작업만 진행', meta: '지원 중', body: '일회성 지원은 무인 접속 비밀번호를 만들지 않고 상대 사용자가 연결 요청을 직접 수락한 뒤 필요한 작업만 진행합니다.', status: '수동 승인' },
      { title: '세션 종료와 보안 설정 확인', meta: '지원 직후', body: '세션을 종료하고 자동 접속/비밀번호 설정을 사용했다면 필요한 경우 끄거나 변경합니다.', status: '종료' },
    ],
    detailTitle: '누가 먼저 요청한 지원인지 확인',
    detailMeta: '지원 전 · 원격지원 체크',
    detailMemo: '내가 먼저 요청한 가족, 업체, 사내 지원인지 확인합니다. 모르는 사람이 먼저 연락해 원격 접속을 요구하면 진행하지 않습니다. AnyDesk 주소, 비밀번호, 인증값, 주민등록번호, 결제정보는 Flow에 저장하지 않습니다.',
    detailChecks: ['지원 요청자와 목적 확인', '공식 사이트 설치 완료', 'AnyDesk 주소/비밀번호/인증값 미저장 확인', '일회성 지원은 수동 승인으로 진행', '작업 후 세션 종료와 자동 접속 설정 확인'],
    sourceNote: '개인 블로그 사용법과 AnyDesk 공식 문서를 분리합니다. 무단 접속, 자동 접속 비밀번호 저장, 타인 기기 제어는 사용자 동의가 있어야 합니다.',
    primaryAction: '지원 준비 완료',
    secondaryActions: ['공식 문서 열기', '세션 종료 체크'],
  },
  'remote-help-session-precheck': {
    id: 'remote-help-session-precheck',
    surface: 'checklist',
    resultTitle: '원격 도움 전에 권한 방식을 먼저 고르는 세션 체크 Flow',
    sourceSummary: [
      'AnyDesk, TeamViewer, Chrome Remote Desktop, Zoom, Quick Assist 공식 문서는 화면 공유, 일회성 원격 제어, 반복 관리가 서로 다른 권한 단계임을 보여준다.',
      'FlowMe의 첫 단계는 도구 설치가 아니라 누가 요청한 도움인지와 어떤 작업 범위인지 확인하는 것이다.',
      '접속 주소, 확인 코드, 세션 링크, 화면 캡처, 상담 대화, 기기 목록은 FlowMe에 저장하지 않는다.',
      '완료 기준은 문제가 해결됐다는 보장이 아니라 세션을 닫고 남은 접근 권한을 확인했다는 상태다.',
    ],
    sourceTrace: [
      { source: 'Quick Assist와 Chrome Remote Desktop은 도움 요청자 확인과 일회성 코드/승인 흐름을 둔다.', artifact: '첫 카드가 요청자와 작업 범위 확인입니다.' },
      { source: 'TeamViewer와 Zoom은 screen sharing과 remote control을 분리한다.', artifact: '두 번째 카드가 화면 공유만으로 충분한지 먼저 선택합니다.' },
      { source: 'AnyDesk와 TeamViewer는 unattended/repeated access를 별도 관리 흐름으로 둔다.', artifact: '반복 관리는 기본값이 아니라 담당자, 목적, 접근 기간, 해지일 메모로 분리합니다.' },
      { source: '각 도구는 세션 종료, stop sharing, revoke/reset 같은 closeout 흐름을 제공한다.', artifact: '마지막 카드가 세션 종료와 접근 정리입니다.' },
    ],
    conversionSummary: [
      '원격 도구 설치 체크가 아니라 permission ladder 체크리스트로 변환한다.',
      '지원 시간, 도움 요청자와 범위, 지원 방식만 입력한다.',
      '접속값은 Flow에 저장하지 않습니다.',
      '보안 보장이나 위험 판정이 아니라 close/review access 메모만 남긴다.',
    ],
    userDecisionPoints: ['도구 설치보다 신뢰/범위 확인이 먼저 보이는가', '화면 공유만으로 충분한지 먼저 선택하는가', '접속값 저장을 유도하지 않는가', '세션 종료와 접근 정리가 primary artifact에 보이는가'],
    fields: [
      { label: '지원 시간', value: '오늘 15:00', help: '캘린더보다 체크 기준으로만 사용합니다.' },
      { label: '요청자와 범위', value: '사내 IT · 프린터 설정', help: '누가, 왜, 어디까지 도울지 먼저 확인합니다.' },
      { label: '지원 방식', value: '화면 공유 먼저', help: '필요할 때만 일회성 원격 제어로 올립니다.' },
    ],
    saveResult: '원격 도움 세션 체크리스트가 생성되고, 상세에서 권한 방식과 접속값 미저장 경계를 확인합니다.',
    executionTitle: '원격 도움 세션 권한 사전 체크',
    executionSubtitle: '신뢰/범위 확인 → 권한 방식 선택 → 접속값 미저장 → 세션 종료',
    executionStats: [
      { label: '체크', value: '4개' },
      { label: '기본', value: '화면 공유 먼저' },
      { label: '저장', value: '접속값 제외' },
    ],
    executionCards: [
      { title: '요청자와 작업 범위 확인', meta: '지원 전', body: '내가 먼저 요청한 가족, 업체, 사내/학교 지원인지 확인합니다. 모르는 사람이 먼저 연락해 원격 도움을 요구하면 별도 경로로 확인하기 전에는 진행하지 않습니다.', status: '신뢰/범위' },
      { title: '화면 공유만으로 충분한지 먼저 선택', meta: '도구 열기 전', body: '오류 화면을 보여주기만 하면 screen share only를 고릅니다. 조작이 필요할 때만 일회성 원격 제어와 수동 승인을 선택합니다.', status: '권한 선택' },
      { title: '접속값은 Flow에 저장하지 않습니다', meta: '세션 시작', body: '도구에서 생성되는 주소, 확인 코드, 세션 URL, 승인값은 도구 안에서만 사용합니다. Flow 입력, 메모, 복사, 내보내기에는 남기지 않습니다.', status: '미저장' },
      { title: '세션 종료와 접근 정리', meta: '지원 직후', body: '공유 또는 원격 제어를 종료하고 clipboard, file transfer, auto accept, unattended access 같은 임시 권한이 남아 있지 않은지 확인합니다.', status: '종료' },
    ],
    detailTitle: '화면 공유만으로 충분한지 먼저 선택',
    detailMeta: '도구 열기 전 · 권한 방식',
    detailMemo: '도움이 필요한 작업이 보기만으로 해결되는지 먼저 확인합니다. 보여주기만 필요하면 화면 공유로 시작하고, 조작이 필요할 때만 일회성 원격 제어와 수동 승인을 선택합니다. 반복 관리는 별도 담당자, 목적, 접근 기간, 해지일 메모가 있을 때만 검토합니다.',
    detailChecks: ['요청자와 작업 범위 확인', 'screen share only 가능 여부 확인', '일회성 remote control 필요 여부 확인', '반복 관리라면 접근 기간과 해지일 메모', '세션 종료 후 접근 정리'],
    sourceNote: '공식 제품 문서의 연결/공유/종료 흐름과 FlowMe의 product boundary를 분리합니다. 이 Flow는 보안 보장, 위험 판정, 원격 도구 연동, 기기 관리, 지원 티켓이 아닙니다.',
    primaryAction: '권한 방식 선택',
    secondaryActions: ['공식 문서 열기', '세션 종료 체크'],
  },
  'naver-search-advisor-site-readiness': {
    id: 'naver-search-advisor-site-readiness',
    surface: 'checklist',
    resultTitle: 'Naver Search Advisor 설정 전에 접근권한과 상태만 정리하는 Flow',
    sourceSummary: [
      'Naver Search Advisor 공식 문서는 사이트 등록을 host 단위로 보고, 소유확인은 HTML file 또는 HTML tag 방식으로 안내한다.',
      'robots.txt, noindex, redirect, frame, sitemap, RSS, diagnosis report는 search exposure 보장이 아니라 readiness/status 확인이다.',
      'FlowMe는 platform, method name, status, revisit memo만 저장한다.',
      '검증값, DNS 값, HTML tag content, OAuth grant, API key, credential, generated sitemap file은 Flow에 저장하지 않는다.',
    ],
    sourceTrace: [
      { source: 'Naver guide says site registration is host-unit based and ownership can use HTML meta tag or HTML file upload.', artifact: '첫 카드가 사이트 단위와 접근권한 선택입니다.' },
      { source: 'Naver help explains ownership verification because webmaster actions affect collection, deletion requests, and reports.', artifact: '두 번째 카드가 Flow 밖 소유확인 방법 선택입니다.' },
      { source: 'Naver diagnosis and SEO guide call out robots.txt, noindex, redirects, frames, sitemap, RSS, and report timing.', artifact: '중간 카드는 crawl readiness와 status memo입니다.' },
      { source: 'Naver report docs separate collection, indexing/search reflection, diagnosis, and wait time.', artifact: '마지막 카드가 다시 볼 날짜입니다.' },
    ],
    conversionSummary: [
      '검색 노출 개선 Flow가 아니라 setup readiness checklist로 변환한다.',
      '사이트 단위, 접근권한, 소유확인 방법, status, revisit date만 입력한다.',
      '검증값은 Flow에 저장하지 않습니다.',
      '직접 수정할 수 없으면 ask developer/host admin을 정상 상태로 남긴다.',
    ],
    userDecisionPoints: ['sitemap 제출보다 site unit/access method가 먼저 보이는가', 'verification, crawl, indexing/search reflection, ranking이 분리되는가', 'ask developer/host admin이 정상 상태로 보이는가', '검증값 저장을 유도하지 않는가'],
    fields: [
      { label: '설정 날짜', value: '오늘', help: 'status memo와 revisit 기준일로만 사용합니다.' },
      { label: '사이트 단위', value: 'custom domain', help: 'host 단위, CMS/host, URL unit을 먼저 구분합니다.' },
      { label: '접근권한', value: 'head edit 가능', help: '불가능하면 developer/host admin 요청으로 남깁니다.' },
    ],
    saveResult: 'Naver Search Advisor 준비 체크가 생성되고, 상세에서 접근권한과 검증값 미저장 경계를 확인합니다.',
    executionTitle: 'Naver Search Advisor 사이트 준비 체크',
    executionSubtitle: 'site unit/access method → ownership status → crawl readiness → sitemap/RSS status → revisit',
    executionStats: [
      { label: '체크', value: '5개' },
      { label: '기본', value: '접근권한 먼저' },
      { label: '저장', value: '검증값 제외' },
    ],
    executionCards: [
      { title: '사이트 단위와 접근권한 먼저 고르기', meta: '설정 전', body: 'Naver Search Advisor가 보는 host 단위인지, custom domain인지, host/CMS 관리 페이지인지 먼저 고릅니다. DNS, root upload, homepage head edit 중 가능한 접근권한을 표시하고, 어렵다면 ask developer/host admin으로 남깁니다.', status: '접근권한' },
      { title: '소유확인 방법은 Flow 밖에서 선택', meta: '검증 전', body: 'HTML file 또는 HTML tag 중 가능한 official method를 선택합니다. 검증값은 Flow에 저장하지 않습니다. Flow에는 method name과 status만 남기고 verification value, DNS value, HTML tag content는 저장하지 않습니다.', status: '소유확인' },
      { title: 'robots.txt와 noindex 준비 상태 확인', meta: '수집 전', body: 'robots.txt, Yeti 접근, noindex, redirect, frame, live page accessibility를 확인합니다. 이 카드는 crawl readiness 체크이지 ranking improvement가 아닙니다.', status: 'readiness' },
      { title: 'sitemap/RSS/request 상태만 남기기', meta: '소유확인 후', body: 'sitemap, RSS, URL collection request는 submitted, unavailable, skipped, ask developer/host admin 같은 status로만 남깁니다. generated file이나 platform value는 Flow에 넣지 않습니다.', status: 'status' },
      { title: '다시 볼 날짜 정하기', meta: 'revisit', body: 'ownership verification, crawl collection, indexing/search reflection, diagnosis report를 나중에 다시 볼 날짜를 정합니다. revisit는 status review이지 indexing guarantee나 ranking guarantee가 아닙니다.', status: 'revisit' },
    ],
    detailTitle: '사이트 단위와 접근권한 먼저 고르기',
    detailMeta: '설정 전 · access method',
    detailMemo: 'sitemap 제출이나 URL 수집 요청보다 먼저 Naver Search Advisor가 볼 사이트 단위와 내가 가진 technical access를 고릅니다. DNS, root upload, homepage head edit 중 가능한 것이 없으면 ask developer/host admin을 선택합니다. 이 Flow는 setup status memo이며 SEO scoring feature, ranking tracker, analytics dashboard가 아닙니다.',
    detailChecks: ['host/custom domain/site unit 선택', 'DNS/root upload/head edit 접근권한 확인', 'ask developer/host admin 여부 선택', 'HTML file 또는 HTML tag method status 기록', 'revisit date 설정'],
    sourceNote: 'Naver Search Advisor 공식 setup, diagnosis, ownership, report 문서를 FlowMe의 product boundary와 분리합니다. 이 Flow는 Naver integration, DNS automation, sitemap generation, IndexNow/API automation, SEO scoring, ranking tracking, analytics reporting이 아닙니다.',
    primaryAction: '접근권한 선택',
    secondaryActions: ['공식 문서 열기', 'revisit 상태 체크'],
  },
  'fridge-cleanout-weekly-plan': {
    id: 'fridge-cleanout-weekly-plan',
    surface: 'sheet',
    resultTitle: '냉장고 재고 3개로 시작하는 7일 메뉴 후보표',
    sourceSummary: [
      '원문은 재고 파악, 식재료 표준화, 주간 메뉴 플래닝, 남은 재료 활용, 성공률 체크리스트를 다룬다.',
      'FlowMe에서는 절약 금액이나 식단 효과가 아니라 재고 3개, 7일 메뉴 후보, 장보기 보류 판단만 남긴다.',
      '사용자는 복잡한 식단표보다 “오늘 새로 살지 말지”와 “남은 재료를 언제 처리할지”가 필요하다.',
    ],
    sourceTrace: [
      { source: '냉장고 재고를 파악하고 표준화하는 단계가 있다.', artifact: '첫 행은 우선 소진 재료 3개 선택으로 들어갑니다.' },
      { source: '주간 메뉴 플래닝이 실행 단서로 보인다.', artifact: '7일 메뉴 후보표가 생성됩니다.' },
      { source: '남은 재료 활용이 핵심이다.', artifact: '장보기 보류와 남은 재료 처리일 체크가 들어갑니다.' },
      { source: '절약 효과 주장은 경험담일 수 있다.', artifact: '절약 금액 보장 없이 재고/메뉴/보류만 표시합니다.' },
    ],
    conversionSummary: [
      '시작일, 소진할 재료 3개, 장보기 보류 여부만 입력한다.',
      '시트에는 7일 메뉴 후보와 장보기/보류 상태가 들어간다.',
      '건강 식단, 영양 처방, 절약 금액 보장은 하지 않는다.',
    ],
    userDecisionPoints: ['식단 관리 앱처럼 과해지지 않는가', '재고 소진과 장보기 보류가 보이는가', '절약/영양 보장을 하지 않는가'],
    fields: [
      { label: '시작일', value: '2026-06-15', help: '7일 메뉴 후보표의 첫날입니다.' },
      { label: '소진할 재료 3개', value: '애호박, 두부, 계란', help: '이번 주 메뉴 후보에 우선 반영합니다.' },
      { label: '장보기 보류', value: '가능하면 보류', help: '대체 재료가 있으면 새 구매를 미룹니다.' },
    ],
    saveResult: '7일 재고 소진 시트가 만들어지고, 오늘 탭에는 냉장고 재고 확인과 장보기 보류 결정만 뜹니다.',
    executionTitle: '이번 주 냉파표',
    executionSubtitle: '재고 먼저 쓰고 장보기는 보류',
    executionStats: [
      { label: '재료', value: '3개' },
      { label: '기간', value: '7일' },
      { label: '구매', value: '보류 판단' },
    ],
    tableColumns: ['날짜', '우선 재료', '메뉴 후보', '장보기', '상태'],
    tableRows: [
      { cells: ['D-Day', '애호박', '애호박전/볶음', '보류', '오늘'], status: '오늘' },
      { cells: ['D+1', '두부', '두부조림/된장국', '보류', '예정'], status: '예정' },
      { cells: ['D+2', '계란', '계란말이/볶음밥', '보류', '예정'], status: '예정' },
      { cells: ['D+3~D+6', '남은 재료', '사용자 메모', '필요 시', '계획'], status: '계획' },
      { cells: ['D+7', '남은 재료', '냉동/소분/다음 주 첫 메뉴', '결정', '정리'], status: '정리' },
    ],
    executionCards: [
      { title: '냉장고 재고 10분 정리', meta: 'D-Day', body: '채소, 단백질, 냉동, 소스/양념으로 나눠 빨리 써야 할 재료 3개를 고릅니다.', status: '오늘' },
      { title: '7일 메뉴 후보 적기', meta: 'D-Day', body: '복잡한 식단표가 아니라 재고 재료를 쓰는 점심/저녁 후보만 적습니다.', status: '계획' },
      { title: '장보기 보류 목록 만들기', meta: 'D+1~D+6', body: '없는 재료를 새로 사기 전 대체 가능한 재료와 보류 가능한 구매를 메모합니다.', status: '보류' },
      { title: '남은 재료 처리일 정하기', meta: 'D+7', body: '남은 재료는 냉동, 소분, 다음 주 첫 메뉴 후보 중 하나로 정리합니다.', status: '정리' },
    ],
    detailTitle: '냉장고 재고 10분 정리',
    detailMeta: 'D-Day · 재고 소진 시트',
    detailMemo: '채소, 단백질, 냉동, 소스/양념으로 나눠 빨리 써야 할 재료 3개만 고릅니다. 절약 금액이나 영양 계산은 하지 않고, 이번 주 메뉴 후보와 장보기 보류만 정합니다.',
    detailChecks: ['냉장/냉동 재고 훑기', '빨리 써야 할 재료 3개 선택', '7일 메뉴 후보 3개 이상 적기', '새로 살 재료 보류/구매 결정', 'D+7 남은 재료 처리 방향 선택'],
    sourceNote: '개인 챌린지/생활비 경험 기반입니다. 건강 식단, 영양 처방, 절약 금액 보장은 하지 않습니다.',
    primaryAction: '재고 정리 완료',
    secondaryActions: ['7일 메뉴표 보기', '장보기 메모 수정'],
  },
  'balcony-fall-vegetable-calendar': {
    id: 'balcony-fall-vegetable-calendar',
    surface: 'sheet',
    resultTitle: '채소별 파종·수확 후보일이 보이는 베란다 텃밭 Flow',
    sourceSummary: [
      '원문은 가을 채소 10종의 파종·수확 시기와 9~12월 관리 체크를 표처럼 정리한다.',
      '상추, 루꼴라, 시금치처럼 초보가 고르기 쉬운 채소를 선택하면 파종 주간, 주간 관리, 수확 후보일이 필요하다.',
      '빛, 물, 통풍은 매일 기록할 대상이 아니라 주간 확인 메모로 충분하다.',
    ],
    sourceTrace: [
      { source: '가을 채소 10종과 파종·수확 캘린더가 있다.', artifact: '채소별 행에 파종 주간, 관리 주기, 첫 수확 후보일을 나눠 표시합니다.' },
      { source: '원문은 준비물과 세팅을 먼저 설명한다.', artifact: '저장 직후 첫 체크는 화분·상토·씨앗 준비입니다.' },
      { source: '빛·물·통풍 관리가 중요하다.', artifact: '상세에는 물주기 확정 알림이 아니라 주간 상태 확인 체크만 둡니다.' },
      { source: '지역과 베란다 환경에 따라 달라질 수 있다.', artifact: '수확 보장 없이 “수확 후보일”과 “1주 미루기” 선택을 제공합니다.' },
    ],
    conversionSummary: [
      '입력은 시작 월, 키울 채소, 베란다 방향으로 제한한다.',
      '채소별 행이 있는 작은 시트와 파종/수확 후보일 캘린더를 함께 보여준다.',
      '농업 처방이나 수확 보장 대신 원문 메모와 환경별 조정 여지를 남긴다.',
    ],
    userDecisionPoints: ['채소별로 해야 할 일이 구분되는가', '수확일이 확정처럼 보이지 않는가', '매일 관찰 입력 없이도 쓸 수 있는가'],
    fields: [
      { label: '시작 월', value: '9월', help: '원문 캘린더에서 가을 파종 기준으로 시작합니다.' },
      { label: '키울 채소', value: '상추, 루꼴라, 시금치', help: '1~3개만 골라 첫 Flow를 가볍게 만듭니다.' },
      { label: '베란다 방향', value: '남동향', help: '빛/통풍 메모를 조정하는 참고값입니다.' },
    ],
    saveResult: '채소별 파종·관리·수확 후보 시트가 만들어지고, 캘린더에는 파종 주간과 첫 수확 후보일만 표시됩니다.',
    executionTitle: '베란다 텃밭표',
    executionSubtitle: '파종하고, 매주 상태 보고, 수확 후보일에 확인',
    executionStats: [
      { label: '채소', value: '3개' },
      { label: '관리', value: '주 1회' },
      { label: '수확', value: '후보일' },
    ],
    tableColumns: ['채소', '파종', '주간 관리', '첫 수확 후보', '상태'],
    tableRows: [
      { cells: ['상추', '9월 1주', '표토 마름·통풍', '10월 1주', '파종 준비'], status: '파종 준비' },
      { cells: ['루꼴라', '9월 2주', '10cm 전후 확인', '10월 2주', '예정'], status: '예정' },
      { cells: ['시금치', '9월 3주', '서늘함·과습 확인', '10~11월', '예정'], status: '예정' },
    ],
    executionCards: [
      { title: '화분·상토·씨앗 준비', meta: '시작 전', body: '화분 깊이, 배수 구멍, 상토/배양토, 씨앗 또는 종구를 원문 기준으로 확인합니다.', status: '준비' },
      { title: '선택한 채소 파종하기', meta: '파종 주간', body: '상추는 얕게 파종하고 시금치는 씨앗 불리기처럼 채소별 메모를 상세에 붙입니다.', status: '파종' },
      { title: '빛·물·통풍 주간 점검', meta: '매주', body: '표토가 마르면 아침에 물을 주고 받침 물, 잎 마름, 과습 신호를 확인합니다.', status: '주간 확인' },
      { title: '첫 수확 후보일 확인', meta: '수확권장 주간', body: '상추는 잎 6~8매부터 바깥잎 수확, 루꼴라는 10cm 전후 커팅처럼 원문 수확 기준을 봅니다.', status: '후보일' },
    ],
    detailTitle: '상추 파종 주간',
    detailMeta: '9월 1주 · 채소별 캘린더',
    detailMemo: '상추는 얕게 파종하고 표토가 마르면 아침에 물을 줍니다. 베란다 방향과 온도에 따라 파종·수확 시기는 달라질 수 있으므로 첫 수확일은 후보일로만 둡니다.',
    detailChecks: ['화분 배수 구멍 확인', '상토/씨앗 준비', '얕게 파종', '첫 물주기 완료', '수확 후보일 메모 확인'],
    sourceNote: '원문은 가을 베란다 채소 가이드입니다. Flow는 파종·관리·수확 후보일을 옮길 뿐 결과를 확정하지 않습니다.',
    primaryAction: '파종 완료',
    secondaryActions: ['수확 후보일 미루기', '채소 메모 수정'],
  },
  'self-wall-paint-weekend': {
    id: 'self-wall-paint-weekend',
    surface: 'checklist',
    resultTitle: '주말 작업 순서가 보이는 셀프 페인팅 체크 Flow',
    sourceSummary: [
      '원문은 초보자가 놓치기 쉬운 준비물, 보양, 모서리 붓칠, 롤러 칠하기, 건조/환기 순서로 설명한다.',
      '작업 날짜를 기준으로 D-3 준비, D-1 보양, 당일 작업 체크가 생기면 실행성이 높다.',
      '페인트 양 계산, 색상 선택, 제품별 건조 시간은 입력 폼이 아니라 메모와 원문 링크에 남기는 편이 가볍다.',
    ],
    sourceTrace: [
      { source: '롤러, 트레이, 붓, 마스킹테이프 같은 준비물이 나온다.', artifact: 'D-3 준비물 체크로 저장합니다.' },
      { source: '벽면 준비와 마스킹/커버링이 중요하다.', artifact: 'D-1 가구 이동과 바닥 보양 체크가 따로 보입니다.' },
      { source: '모서리와 경계는 붓으로 먼저 칠한다.', artifact: '당일 첫 작업 카드가 경계 먼저 칠하기입니다.' },
      { source: '건조와 환기가 필요하다.', artifact: '마지막 체크는 정리와 환기 완료입니다.' },
    ],
    conversionSummary: [
      '입력은 작업 날짜, 칠할 공간, 페인트 색상만 받는다.',
      '실행 화면은 주말 프로젝트 체크리스트로 보여준다.',
      '견적 계산이나 제품 추천으로 확장하지 않고 원문 메모와 작업 순서만 남긴다.',
    ],
    userDecisionPoints: ['D-3/D-1/당일 순서가 자연스러운가', '제품 세부사항이 메모로 충분한가', '초보가 바로 작업 순서를 알 수 있는가'],
    fields: [
      { label: '작업 날짜', value: '2026-06-20', help: 'D-3 준비와 D-1 보양 체크가 생성됩니다.' },
      { label: '칠할 공간', value: '작은 방 한 면', help: '작업 범위를 과하게 잡지 않게 합니다.' },
      { label: '페인트 색상', value: '오프화이트', help: '색상명과 구매 링크는 메모에서 바꿀 수 있습니다.' },
    ],
    saveResult: 'D-3 준비물, D-1 보양, 당일 칠하기 체크가 한 Flow로 저장됩니다.',
    executionTitle: '셀프 페인팅',
    executionSubtitle: '준비물부터 정리까지 주말 작업 체크',
    executionStats: [
      { label: '체크', value: '4개' },
      { label: '기간', value: 'D-3~당일' },
      { label: '입력', value: '3개' },
    ],
    executionCards: [
      { title: '페인트와 기본 도구 준비', meta: 'D-3', body: '페인트, 롤러, 트레이, 붓, 마스킹테이프, 커버링, 작업복을 확인합니다.', status: '준비' },
      { title: '가구 이동과 바닥 보양', meta: 'D-1', body: '칠할 벽 주변 가구를 빼고 바닥과 콘센트, 몰딩, 문틀을 보호합니다.', status: '보양' },
      { title: '모서리와 경계 먼저 칠하기', meta: '작업 시작', body: '롤러가 닿지 않는 모서리, 스위치 주변, 천장 경계는 작은 붓으로 먼저 칠합니다.', status: '작업' },
      { title: '롤러로 넓은 면 칠하고 정리', meta: '작업 중/후', body: '넓은 면은 롤러로 채우고 건조 시간을 확인한 뒤 마스킹 제거와 환기를 합니다.', status: '정리' },
    ],
    detailTitle: 'D-1 가구 이동과 바닥 보양',
    detailMeta: '작업 전날 · 체크리스트',
    detailMemo: '칠할 벽 주변 가구를 빼고 바닥, 콘센트, 몰딩, 문틀을 커버링/마스킹합니다. 제품별 건조 시간, 페인트 양, 색상 링크는 원문 메모에 둡니다.',
    detailChecks: ['가구 이동', '바닥 커버링', '콘센트/몰딩 마스킹', '환기 가능 상태 확인'],
    sourceNote: '제품 설명서와 벽 상태가 우선입니다. Flow는 주말 작업 순서를 놓치지 않게 돕습니다.',
    primaryAction: '보양 완료',
    secondaryActions: ['작업일 미루기', '준비물 메모 수정'],
  },
  'freelancer-income-tax-docs': {
    id: 'freelancer-income-tax-docs',
    surface: 'checklist',
    resultTitle: '세무 판단을 빼고 자료 준비만 남긴 신고 전 체크 Flow',
    sourceSummary: [
      '원문은 종합소득세 신고 전 소득 자료, 경비 증빙, 신고 전 확인 항목을 체크리스트로 정리한다.',
      'FlowMe에서는 세액 산출이나 절세 조언을 하지 않고, 자료가 흩어지지 않게 모으는 마감 전 체크만 담당한다.',
      '홈택스 또는 세무대리인에게 확인할 질문을 메모로 남기는 것이 핵심이다.',
    ],
    sourceTrace: [
      { source: '소득 확인 자료와 지급명세서가 필요하다.', artifact: '마감 14일 전 소득 자료 모으기 체크가 생깁니다.' },
      { source: '경비 증빙 분류가 중요하다.', artifact: '마감 10일 전 경비 증빙 폴더 정리 체크가 생깁니다.' },
      { source: '신고 전 빠진 자료 확인이 필요하다.', artifact: '홈택스/세무대리인 확인 질문 메모가 들어갑니다.' },
      { source: '세무 판단은 원문만으로 확정하기 어렵다.', artifact: 'Flow 안에서는 금액 판단을 하지 않고 외부 확인 대상으로 분리합니다.' },
    ],
    conversionSummary: [
      '입력은 신고 마감일, 소득 유형, 자료 보관 위치로 제한한다.',
      '소득자료/경비증빙/확인질문/누락항목 체크만 제공한다.',
      '세액 산출, 절세 판단, 경비 인정 결론은 만들지 않는다.',
    ],
    userDecisionPoints: ['세무 앱처럼 보이지 않는가', '자료 준비만 남았는가', '외부 확인 boundary가 충분히 보이는가'],
    fields: [
      { label: '신고 마감일', value: '2026-05-31', help: '마감 기준으로 자료 준비 일정을 만듭니다.' },
      { label: '소득 유형', value: '프리랜서 사업소득', help: '자료 분류 메모에만 사용합니다.' },
      { label: '자료 보관 위치', value: 'Drive/2026 종소세', help: '영수증과 지급명세서 링크를 모을 위치입니다.' },
    ],
    saveResult: '마감 전 자료 준비 체크리스트가 만들어지고, 판단이 필요한 항목은 홈택스/세무대리인 확인 메모로 남습니다.',
    executionTitle: '신고 전 자료 준비',
    executionSubtitle: '소득자료, 경비증빙, 확인 질문만 정리',
    executionStats: [
      { label: '체크', value: '4개' },
      { label: '판단', value: '외부 확인' },
      { label: '입력', value: '3개' },
    ],
    executionCards: [
      { title: '소득 자료 모으기', meta: '마감 14일 전', body: '지급명세서, 원천징수 내역, 플랫폼 정산 내역처럼 소득 확인 자료를 모읍니다.', status: '자료' },
      { title: '경비 증빙 분류하기', meta: '마감 10일 전', body: '사업 관련 카드 사용, 세금계산서, 현금영수증, 구독료, 장비 구매 내역을 폴더별로 나눕니다.', status: '분류' },
      { title: '홈택스/세무대리인 확인 메모', meta: '마감 7일 전', body: '신고 방법, 문의할 항목, 빠진 서류를 확인 질문으로 남깁니다.', status: '확인' },
      { title: '제출 전 누락 항목 체크', meta: '마감 2일 전', body: '제출 전 필요한 자료가 모였는지만 확인하고 금액 판단은 외부 확인으로 남깁니다.', status: '마감 전' },
    ],
    detailTitle: '경비 증빙 분류하기',
    detailMeta: '마감 10일 전 · 자료 준비',
    detailMemo: '사업 관련 카드 사용, 세금계산서, 현금영수증, 구독료, 장비 구매 내역을 폴더별로 나눕니다. 비용 처리 결론은 Flow에서 정하지 않고 홈택스 또는 세무대리인 확인 메모로 남깁니다.',
    detailChecks: ['카드 사용 내역 폴더 확인', '세금계산서/현금영수증 모으기', '구독료/장비 구매 내역 표시', '확인 질문 메모 작성'],
    sourceNote: '세무 판단, 신고 의무, 비용 처리 결론은 국세청/세무 전문가 확인 대상으로 분리합니다.',
    primaryAction: '자료 정리 완료',
    secondaryActions: ['확인 질문 추가', '마감일 변경'],
  },
  'jeonse-contract-precheck-docs': {
    id: 'jeonse-contract-precheck-docs',
    surface: 'decision',
    resultTitle: '계약 전 확인·보류가 함께 보이는 전세 서류 체크 Flow',
    sourceSummary: [
      '카카오페이 원문은 국토교통부 전세사기 예방 체크리스트를 저장하고 활용하라고 안내한다.',
      '핵심 포인트는 계약 전 시세·등기부등본·전세보증보험 가능 여부, 계약 시 중개사·표준계약서·정보 일치, 계약 후 확정일자·임대차신고·보증보험이다.',
      '원문에는 보험 상품 안내도 섞여 있으므로 Flow에서는 계약 판단이나 상품 추천이 아니라 확인할 문서와 보류 사유만 남긴다.',
    ],
    sourceTrace: [
      { source: '계약 전에는 시세, 등기부등본, 전세보증보험 가능 여부를 확인하라고 요약한다.', artifact: '계약 3일 전 카드가 시세·등기부등본·보증보험 확인으로 생성됩니다.' },
      { source: '계약 시 중개사 등록번호, 표준 계약서, 주소·면적·보증금 정보 일치를 확인한다.', artifact: '계약 당일 상세 체크에 중개사/계약서/정보 일치 항목이 들어갑니다.' },
      { source: '계약 후 확정일자, 임대차신고, 전세보증보험 가입을 마무리하라고 안내한다.', artifact: '입주 직후 후속 일정으로 보호 절차 체크가 생성됩니다.' },
      { source: '상품 안내와 공식 체크리스트가 섞여 있다.', artifact: 'Flow는 상품 추천을 하지 않고 공식 체크리스트 링크와 보류 메모를 분리합니다.' },
    ],
    conversionSummary: [
      '입력은 계약 예정일, 주소 후보, 보증보험 확인 여부로 제한한다.',
      '계약 전/계약 당일/입주 직후/위험 신호 발견 시 보류 메모로 나눈다.',
      '법률 결론, 계약 안전 점수, 계약금·주민등록번호 저장 필드는 만들지 않는다.',
    ],
    userDecisionPoints: ['보류가 정상 결과로 보이는가', '공식 체크리스트와 광고성 안내가 분리되는가', '입력이 계약 앱처럼 무거워지지 않는가'],
    fields: [
      { label: '계약 예정일', value: '2026-06-20', help: '계약 전/당일/입주 후 체크 일정의 기준입니다.' },
      { label: '주소 후보', value: '메모에만 저장', help: '상세 주소와 계약 정보는 Flow 입력 필드로 요구하지 않습니다.' },
      { label: '보증보험 확인', value: '확인 전', help: '가입 가능 여부를 공식/전문가 확인 항목으로 둡니다.' },
    ],
    saveResult: '계약 전 확인, 계약 당일 확인, 입주 후 보호 절차, 보류 사유 메모가 하나의 체크 Flow로 저장됩니다.',
    executionTitle: '전세계약 체크',
    executionSubtitle: '확인할 문서와 보류 사유만 남기기',
    executionStats: [
      { label: '단계', value: '4개' },
      { label: '결과', value: '확인/보류' },
      { label: '법률 판단', value: '하지 않음' },
    ],
    executionCards: [
      { title: '시세·등기부등본·권리관계 확인', meta: '계약 3일 전', body: '주변 시세, 등기부등본의 실제 소유자·근저당·압류, 전세보증보험 가능 여부를 공식 링크와 함께 확인합니다.', status: '계약 전' },
      { title: '계약 당일 정보 일치 확인', meta: '계약 당일', body: '중개사 등록번호, 표준계약서 사용 여부, 주소·면적·보증금·소유자 정보가 실제 매물과 일치하는지 체크합니다.', status: '당일' },
      { title: '확정일자·임대차신고 일정 저장', meta: '입주 직후', body: '입주 후 확정일자, 전입신고, 임대차신고, 보증보험 가입 확인을 후속 일정으로 남깁니다.', status: '후속' },
      { title: '위험 신호 보류 메모', meta: '이상 항목 발견 시', body: '근저당, 소유자 불일치, 보증보험 불가처럼 의심 항목이 있으면 계약 결론을 내리지 않고 보류 사유와 문의 대상을 적습니다.', status: '보류' },
    ],
    detailTitle: '계약 당일 정보 일치 확인',
    detailMeta: '2026-06-20 · 체크/보류',
    detailMemo: '계약서의 주소, 면적, 보증금, 임대인 정보가 등기부등본과 실제 매물 정보와 맞는지 확인합니다. Flow는 법률 판단이나 계약해도 된다는 결론을 내리지 않고, 이상 항목이 있으면 보류 사유와 문의 대상을 남깁니다.',
    detailChecks: ['중개사 등록번호 확인', '표준계약서 사용 여부 확인', '주소·면적·보증금 정보 일치 확인', '소유자 정보와 등기부등본 대조', '이상 항목 있으면 보류 사유 메모'],
    sourceNote: '카카오페이 콘텐츠와 국토교통부 체크리스트를 참고하되, 법률 판단과 계약 판단은 공인중개사/전문가/공식기관 확인 대상으로 분리합니다.',
    primaryAction: '확인 완료',
    secondaryActions: ['보류 사유 남기기', '전문가 확인'],
  },
  'cat-adoption-first-week-setup': {
    id: 'cat-adoption-first-week-setup',
    surface: 'calendar',
    resultTitle: '입양 전 공간 준비부터 첫 병원 질문까지 이어지는 반려묘 첫 주 Flow',
    sourceSummary: [
      '원문은 고양이를 처음 맞이할 때 안정된 좁은 공간, 이동장/담요, 조용한 구석 공간을 먼저 준비하라고 안내한다.',
      '화장실과 모래, 식기와 기존 사료, 스크래처/캣타워, 이동장과 위생용품, 병원 정보와 접종 기록 확인이 분리되어 있다.',
      '작성자의 경험담은 첫날 적응 사례로 참고하고, 건강 판단은 수의사 확인 대상으로 분리한다.',
    ],
    sourceTrace: [
      { source: '처음엔 좁고 안정된 공간부터 시작하는 게 좋다고 설명한다.', artifact: 'D-3 카드가 안전한 방, 숨숨집, 담요, 문/창문 잠금 확인으로 생성됩니다.' },
      { source: '화장실은 하루 1회 이상 청소, 3~4주 1회 전체 교체가 필요하다고 안내한다.', artifact: '입양 첫날 상세 체크에 화장실/모래 위치와 청소 기준 메모가 남습니다.' },
      { source: '사료는 기존에 먹던 브랜드로 시작하고 점차 바꾸라고 한다.', artifact: '첫 주 관찰 카드가 먹는 양과 기존 사료 유지 메모를 포함합니다.' },
      { source: '입양 후 첫 일정 중 하나는 동물병원 방문이라고 한다.', artifact: '입양 후 3일 이내 병원 질문 메모와 접종 기록 확인 일정이 생깁니다.' },
    ],
    conversionSummary: [
      '입력은 입양일, 고양이 나이, 첫 병원 후보만 받는다.',
      'D-3 공간 준비, D-1 이동/안전, 입양 후 3일 병원 질문, 입양 후 7일 적응 관찰로 나눈다.',
      '사진 기록이나 건강 판정 필드는 기본으로 만들지 않는다.',
    ],
    userDecisionPoints: ['입양 전 준비와 입양 후 관찰이 이어지는가', '건강 판단을 앱이 하지 않는가', '준비물 목록이 너무 길지 않은가'],
    fields: [
      { label: '입양일', value: '2026-06-14', help: 'D-3/D-1/입양 후 3일/7일 일정 기준입니다.' },
      { label: '고양이 나이', value: '3개월 추정', help: '사료와 병원 질문 메모에만 사용합니다.' },
      { label: '첫 병원 후보', value: '집 근처 동물병원', help: '예약 링크나 전화번호는 메모로 둡니다.' },
    ],
    saveResult: '입양일 기준으로 공간 준비, 이동장/안전 확인, 병원 질문, 첫 주 적응 관찰 일정이 캘린더에 저장됩니다.',
    executionTitle: '고양이 입양 첫 주',
    executionSubtitle: '공간 준비, 화장실, 이동장, 병원 질문',
    executionStats: [
      { label: '기간', value: 'D-3~D+7' },
      { label: '체크', value: '4개' },
      { label: '판단', value: '수의사 확인' },
    ],
    executionCards: [
      { title: '안정된 첫 공간 만들기', meta: 'D-3', body: '안전한 방 하나, 숨을 공간, 담요, 화장실/모래, 사료/물그릇 위치를 먼저 잡습니다.', status: '준비' },
      { title: '이동장과 첫날 동선 확인', meta: 'D-1', body: '단단한 이동장, 담요, 문/창문 잠금, 도착 후 바로 들어갈 방까지 확인합니다.', status: '전날' },
      { title: '첫 병원 질문 메모', meta: '입양 후 3일 이내', body: '접종 기록, 중성화 여부, 구충 여부, 기존 사료와 배변 상태를 병원에 물어볼 질문으로 정리합니다.', status: '병원' },
      { title: '첫 주 적응 관찰', meta: '입양 후 7일', body: '먹는 양, 화장실 사용, 숨는 시간, 놀이 반응을 한 줄씩만 메모합니다.', status: '관찰' },
    ],
    detailTitle: '첫 병원 질문 메모',
    detailMeta: '입양 후 3일 이내 · 관찰 메모',
    detailMemo: '접종 기록, 중성화 여부, 구충 여부, 기존 사료, 먹는 양, 배변 상태를 병원에 물어볼 질문으로 남깁니다. Flow는 건강 판정을 하지 않고 질문 준비와 방문 일정만 담당합니다.',
    detailChecks: ['접종 기록 확인', '중성화/구충 여부 질문', '기존 사료와 급여량 메모', '먹는 양/화장실 사용 한 줄 기록', '병원 예약 또는 방문 완료'],
    sourceNote: '원문은 개인 경험 기반 준비 체크리스트입니다. 건강, 접종, 질병 판단은 수의사 확인으로 분리합니다.',
    primaryAction: '병원 질문 준비 완료',
    secondaryActions: ['관찰 메모 추가', '방문일 변경'],
  },
  'piano-carol-sheet-7day-practice': {
    id: 'piano-carol-sheet-7day-practice',
    surface: 'calendar',
    resultTitle: '무료 악보 링크를 복제하지 않고 7일 연습 일정으로 바꾸는 피아노 Flow',
    sourceSummary: [
      '원문은 Jingle Bells 쉬운 악보 다운로드 글이며, 바이엘 초반/중반 PDF 첨부와 별도 구매 링크가 함께 보인다.',
      '피아노를 막 시작한 아이들이 치기 쉬운 캐롤 악보라는 난이도 설명이 있고, 댓글/이웃추가 상호작용과 저작자 명시·비영리·변경 금지 조건이 보인다.',
      'FlowMe는 악보 파일을 복제하지 않고 원문 링크, 난이도 선택, 목표일 전 연습 체크만 만든다.',
    ],
    sourceTrace: [
      { source: '바이엘 초반과 중반 PDF 첨부가 나뉘어 있다.', artifact: '저장 입력에 난이도 선택이 있고, 상세 메모에 원문 PDF 링크 확인이 들어갑니다.' },
      { source: '아이들이 치기 쉬운 캐롤 악보라는 사용 맥락이 있다.', artifact: 'D-6~D-5 카드가 첫 4마디 천천히 연습으로 좁혀집니다.' },
      { source: '댓글/이웃추가와 저작권 조건이 보인다.', artifact: '첫 실행 카드가 원문 링크와 사용 조건 확인을 먼저 요구합니다.' },
      { source: '악보 자체와 레슨 상담/구매 링크가 함께 있다.', artifact: 'Flow는 악보 복제나 구매 유도 없이 목표일 전 연습 캘린더만 남깁니다.' },
    ],
    conversionSummary: [
      '입력은 연주 목표일, 난이도, 연습 시간대로 제한한다.',
      'D-7 악보 링크 확인, D-6~D-5 첫 4마디, D-3 전체 이어치기, D-1 녹음 체크로 나눈다.',
      '교육 효과나 연주 점수는 만들지 않고 어려운 마디 메모만 둔다.',
    ],
    userDecisionPoints: ['제작자 자료를 복제하지 않는가', '아이/보호자가 바로 연습 일정으로 이해하는가', '연습 기록이 과하게 무겁지 않은가'],
    fields: [
      { label: '연주 목표일', value: '2026-12-24', help: 'D-7부터 D-1 연습 일정의 기준입니다.' },
      { label: '난이도', value: '바이엘 초반', help: '원문에서 맞는 PDF 링크를 확인합니다.' },
      { label: '연습 시간대', value: '저녁 7시', help: '캘린더 알림 시간으로만 씁니다.' },
    ],
    saveResult: '연주 목표일 기준으로 악보 링크 확인, 첫 4마디, 전체 이어치기, 전날 녹음 체크가 캘린더에 저장됩니다.',
    executionTitle: '징글벨 7일 연습',
    executionSubtitle: '원문 악보 링크와 짧은 연습 일정',
    executionStats: [
      { label: '기간', value: '7일' },
      { label: '자료', value: '원문 링크' },
      { label: '기록', value: '어려운 마디' },
    ],
    executionCards: [
      { title: '원문 악보 PDF와 사용 조건 확인', meta: 'D-7', body: '원문에서 바이엘 초반/중반 PDF, 구매 링크, 저작권 조건을 확인하고 악보 링크만 메모합니다.', status: '자료 확인' },
      { title: '첫 4마디 천천히 연습', meta: 'D-6~D-5', body: '오른손/왼손을 나눠 첫 4마디만 천천히 연습합니다. 아이가 막히는 마디만 표시합니다.', status: '부분 연습' },
      { title: '전체 악보 이어치기', meta: 'D-3', body: '틀리는 마디를 표시하고 원문 악보를 보며 처음부터 끝까지 1회 이어칩니다.', status: '이어치기' },
      { title: '연주 전날 녹음 체크', meta: 'D-1', body: '휴대폰으로 1회 녹음하고 어려운 마디와 목표일 준비 상태만 메모합니다.', status: '전날' },
    ],
    detailTitle: '원문 악보 PDF와 사용 조건 확인',
    detailMeta: 'D-7 · 제작자 자료',
    detailMemo: '원문에서 바이엘 초반/중반 PDF와 저작권 조건을 확인합니다. Flow는 악보 파일을 복제하지 않고 원문 링크와 연습 일정만 저장합니다.',
    detailChecks: ['원문 링크 열기', '바이엘 초반/중반 난이도 선택', '저작권/사용 조건 확인', '연습 시간대 저장', '어려운 마디 메모 준비'],
    sourceNote: '제작자 악보의 배포/사용 조건을 따릅니다. Flow는 교육 효과, 연주 점수, 악보 재배포를 제공하지 않습니다.',
    primaryAction: '악보 링크 확인 완료',
    secondaryActions: ['난이도 변경', '연습일 변경'],
  },
  'first-kimjang-weekend-checklist': {
    id: 'first-kimjang-weekend-checklist',
    surface: 'checklist',
    resultTitle: '전날 절임부터 보관 전환까지 보이는 김장 주말 Flow',
    sourceSummary: [
      '원문은 배추 포기별 분량 산정, 6~12시간 절임, 2~3회 뒤집기, 헹굼·배수, 양념, 버무리기, 숙성·보관을 단계별로 정리한다.',
      '초보 사용자에게 필요한 것은 염도 계산기보다 전날/당일/보관 전환 시점을 놓치지 않는 실행 순서다.',
      '발효 결과나 위생 안전을 보장하지 않고, 상세 비율과 주의는 원문 메모로 보존한다.',
    ],
    sourceTrace: [
      { source: '배추 포기별 양념 분량표가 있다.', artifact: 'D-3 첫 체크가 포기 수와 장보기 수량 정하기입니다.' },
      { source: '절임은 6~12시간, 2~3회 뒤집기로 설명된다.', artifact: 'D-1 일정에 절임 시작과 뒤집기 알림을 나눠 둡니다.' },
      { source: '헹굼 2~3회와 배수 20~30분이 나온다.', artifact: '당일 체크에서 헹굼·배수 후 버무리기로 이어집니다.' },
      { source: '실온 6~12시간 뒤 저온 보관 전환을 안내한다.', artifact: '김장 후 보관 전환 체크와 다음 확인일이 생깁니다.' },
    ],
    conversionSummary: [
      '입력은 김장 날짜, 배추 포기 수, 도움 인원만 받는다.',
      'D-3 장보기, D-1 절임, 당일 버무리기, 김장 후 보관 전환으로 나눈다.',
      '염도/pH 계산 UI나 성공 보장 문구는 만들지 않는다.',
    ],
    userDecisionPoints: ['전날과 당일 순서가 바로 보이는가', '분량표는 메모로 충분한가', '가족과 나눠서 체크할 수 있는가'],
    fields: [
      { label: '김장 날짜', value: '2026-11-21', help: '전날 절임과 당일 버무리기 일정의 기준입니다.' },
      { label: '배추 포기 수', value: '3포기', help: '원문 분량표를 메모에 연결합니다.' },
      { label: '도움 인원', value: '2명', help: '당일 역할 분담 메모에 사용합니다.' },
    ],
    saveResult: 'D-3 장보기, D-1 절임, 김장 당일 버무리기, 보관 전환 체크가 하나의 주말 프로젝트로 저장됩니다.',
    executionTitle: '김장 주말 체크',
    executionSubtitle: '분량 정하기, 절임 알림, 버무리기, 보관 전환',
    executionStats: [
      { label: '단계', value: '4개' },
      { label: '기간', value: 'D-3~후' },
      { label: '입력', value: '3개' },
    ],
    executionCards: [
      { title: '배추 포기 수와 양념 분량 정하기', meta: 'D-3', body: '원문 분량표를 기준으로 배추 수, 고춧가루, 액젓, 무채, 쪽파 등 장보기 수량을 메모합니다.', status: '장보기' },
      { title: '배추 절임과 뒤집기 알림 만들기', meta: 'D-1', body: '6~12시간 절임과 2~3회 뒤집기 시간을 캘린더 알림으로 나눕니다.', status: '전날' },
      { title: '헹굼·배수 후 양념 버무리기', meta: '김장 당일', body: '헹굼 2~3회와 배수 20~30분 후 줄기부터 양념을 바르는 순서를 확인합니다.', status: '당일' },
      { title: '실온 스타터와 저온 보관 전환', meta: '김장 후', body: '실온 6~12시간 후 김치냉장고나 저온 보관으로 옮기는 시간을 체크합니다.', status: '보관' },
    ],
    detailTitle: 'D-1 배추 절임과 뒤집기 알림',
    detailMeta: '김장 전날 · 프로젝트 체크',
    detailMemo: '배추 절임은 원문 기준 6~12시간 범위에서 잡고, 중간에 2~3회 뒤집기 알림을 둡니다. 상세 염도, 배추 상태, 보정 방법은 원문 링크와 메모에서 확인합니다.',
    detailChecks: ['절임 시작 시간 저장', '뒤집기 알림 2~3회 설정', '헹굼/배수 시간 메모', '당일 도움 인원 역할 확인'],
    sourceNote: '원문은 김장 방법 설명입니다. Flow는 전날과 당일 순서 체크만 담당하고 발효 결과를 보장하지 않습니다.',
    primaryAction: '절임 준비 완료',
    secondaryActions: ['뒤집기 알림 추가', '분량 메모 수정'],
  },
  'passport-renewal-online-pickup': {
    id: 'passport-renewal-online-pickup',
    surface: 'calendar',
    resultTitle: '출국 전 여권 재발급 신청과 방문 수령을 나누는 공식행정 Flow',
    sourceSummary: [
      '외교부 원문은 재발급 사유, 방문/온라인 신청 가능 조건, 18세 미만 온라인 신청 불가, 정보 변경·분실·훼손 방문 신청을 구분한다.',
      '기본 준비는 6개월 이내 여권 사진, 신분증, 유효기간이 남은 기존 여권이다.',
      '온라인 신청 자체보다 방문 수령 준비와 수령기관 변경 제한을 놓치지 않는 것이 실행 포인트다.',
    ],
    sourceTrace: [
      { source: '방문 또는 온라인 신청 가능 조건이 구분되어 있다.', artifact: '출국 30일 전 첫 체크가 온라인 신청 가능 조건 확인입니다.' },
      { source: '여권용 사진은 6개월 이내 촬영 조건이 있다.', artifact: '신청 전 사진 준비 일정이 따로 생깁니다.' },
      { source: '국내 온라인 신청은 정부24 또는 KB스타뱅킹을 안내한다.', artifact: '신청일 카드에 정부24/KB 또는 방문 신청 선택을 둡니다.' },
      { source: '온라인 신청 후 수령 준비가 필요하다.', artifact: '수령 예정일 카드에 신분증과 기존 여권 챙기기 체크가 붙습니다.' },
    ],
    conversionSummary: [
      '입력은 출국 예정일, 여권 만료일, 신청 방식으로 제한한다.',
      '신청 가능 조건, 사진 준비, 신청, 방문 수령 네 단계만 만든다.',
      '여권번호, 주민등록번호, 결제 정보는 Flow에 저장하지 않는다.',
    ],
    userDecisionPoints: ['공식 신청 가능 조건이 먼저 보이는가', '방문 수령이 누락되지 않는가', '민감정보 저장처럼 보이지 않는가'],
    fields: [
      { label: '출국 예정일', value: '2026-08-18', help: '신청과 수령 여유 기간을 보는 기준입니다.' },
      { label: '여권 만료일', value: '2026-10-02', help: '입국 잔여 유효기간 확인 메모와 연결됩니다.' },
      { label: '신청 방식', value: '온라인 신청 후 방문 수령', help: '정부24/KB 또는 방문 신청 중 선택합니다.' },
    ],
    saveResult: '출국일 기준으로 신청 가능 조건 확인, 사진 준비, 신청, 방문 수령 일정이 캘린더에 저장됩니다.',
    executionTitle: '여권 재발급 준비',
    executionSubtitle: '온라인 가능 조건부터 방문 수령까지',
    executionStats: [
      { label: '단계', value: '4개' },
      { label: '민감정보', value: '저장 안 함' },
      { label: '출처', value: '외교부' },
    ],
    executionCards: [
      { title: '온라인 신청 가능 조건 확인', meta: '출국 30일 전', body: '미성년자, 최초 발급, 분실·훼손, 정보 변경은 방문 신청 대상인지 공식 안내로 확인합니다.', status: '공식 확인' },
      { title: '6개월 이내 여권 사진 준비', meta: '신청 전', body: '여권용 사진 파일 또는 인화 사진을 준비하고 사진 규격은 외교부 안내 링크에서 확인합니다.', status: '사진' },
      { title: '정부24/KB 또는 방문 신청 진행', meta: '신청일', body: '온라인 신청은 국내 수령 시 정부24/KB스타뱅킹, 방문 신청은 여권사무 대행기관을 사용합니다.', status: '신청' },
      { title: '방문 수령 준비', meta: '수령 예정일', body: '신분증과 유효기간이 남은 기존 여권을 챙기고 방문 수령 기관을 다시 확인합니다.', status: '수령' },
    ],
    detailTitle: '방문 수령 준비',
    detailMeta: '수령 예정일 · 공식행정',
    detailMemo: '신분증과 유효기간이 남은 기존 여권을 챙깁니다. 온라인 신청의 방문 수령 방식과 기관 변경 제한은 공식 안내에서 다시 확인합니다. 여권번호, 주민등록번호, 결제 정보는 Flow에 저장하지 않습니다.',
    detailChecks: ['수령기관 확인', '신분증 준비', '기존 여권 준비', '접수 확인 위치 메모', '국가별 잔여 유효기간 별도 확인'],
    sourceNote: '외교부/정부24 공식 안내를 우선합니다. 국가별 입국 요건과 긴급여권 가능 여부는 공식 출처에서 확인해야 합니다.',
    primaryAction: '방문 수령 준비 완료',
    secondaryActions: ['공식 링크 열기', '출국일 변경'],
  },
  'car-inspection-renewal-window': {
    id: 'car-inspection-renewal-window',
    surface: 'calendar',
    resultTitle: '차량별 검사 가능 기간과 재검사 기한을 놓치지 않는 차량 Flow',
    sourceSummary: [
      'TS 원문은 관능검사, ABS검사, 하체검사, 전조등검사, 배출가스검사, 검사결과 설명 흐름을 안내한다.',
      '정기검사 대상과 차종별 유효기간, 부적합 기준이 함께 정리되어 있어 차량별 검사 가능 기간을 확인하기 좋다.',
      '부적합 시 재검사기간이 있으므로 검사 완료가 아니라 결과 확인과 재검사 예약이 핵심이다.',
    ],
    sourceTrace: [
      { source: '차종별 유효기간과 현재 검사 가능 기간 정보가 있다.', artifact: '만료 90일 전 차량별 검사 가능 기간 확인 일정이 생깁니다.' },
      { source: '검사는 현재 예약 내역과 차량 식별 정보를 확인해야 한다.', artifact: '만료 30일 전 검사소, 차량번호, 예약 시각 확인 체크가 있습니다.' },
      { source: '검사 절차가 관능, ABS, 하체, 전조등, 배출가스로 나뉜다.', artifact: '검사 당일 상세 메모에 공식 검사 항목 흐름을 보여줍니다.' },
      { source: '부적합 판정 시 재검사기간이 있다.', artifact: '부적합 시 재검사 예약 카드를 별도 결과로 둡니다.' },
    ],
    conversionSummary: [
      '입력은 검사 만료일, 차종, 검사 지역으로 제한한다.',
      '예약 전 확인, 검사소 예약, 검사 당일, 부적합 재검사로 나눈다.',
      '정비 견적이나 통과 보장은 만들지 않는다.',
    ],
    userDecisionPoints: ['공식 마감형 캘린더로 보이는가', '검사 결과에 따른 다음 행동이 보이는가', '정비 판단을 Flow가 하지 않는가'],
    fields: [
      { label: '검사 만료일', value: '2026-07-30', help: '예약과 만료 전 알림의 기준입니다.' },
      { label: '차종', value: '비사업용 승용차', help: '유효기간 확인 메모에 사용합니다.' },
      { label: '검사 지역', value: '서울', help: '종합검사 대상 지역 확인에 사용합니다.' },
    ],
    saveResult: '만료 90일 전, 30일 전, 검사 당일, 부적합 시 재검사 체크가 캘린더에 저장됩니다.',
    executionTitle: '자동차 검사 준비',
    executionSubtitle: '만료 전 예약하고 결과서 기준으로 다음 행동 결정',
    executionStats: [
      { label: '기준일', value: '만료일' },
      { label: '공식출처', value: 'TS' },
      { label: '결과', value: '통과/재검사' },
    ],
    executionCards: [
      { title: '검사 대상과 가능 기간 확인', meta: '만료 90일 전', body: '내 차량의 검사 주기와 실제 검사 가능 기간을 TS 안내와 사이버검사소에서 확인합니다.', status: '대상 확인' },
      { title: '검사소와 예약 정보 확인', meta: '만료 30일 전', body: '검사소, 차량번호, 예약 시각, 예약자 연락처와 결제 방식을 현재 예약 화면에서 확인합니다.', status: '예약' },
      { title: '검사 당일 항목 이해하기', meta: '검사 당일', body: '관능, ABS, 하체, 전조등, 배출가스, 결과 설명 순서를 메모로 확인합니다.', status: '방문' },
      { title: '부적합 재검사 기한 체크', meta: '부적합 시', body: '부적합 판정 시 재검사 기한과 정비 필요 항목을 공식 결과서 기준으로 기록합니다.', status: '결과' },
    ],
    detailTitle: '검사소와 예약 정보 확인',
    detailMeta: '만료 30일 전 · 공식검사',
    detailMemo: '검사소, 차량번호, 예약 시각, 예약자 연락처와 결제 방식을 현재 예약 화면에서 확인합니다. 검사 판정이나 정비 견적은 Flow가 판단하지 않고, 결과서와 정비업체 확인으로 남깁니다.',
    detailChecks: ['검사소 확인', '예약일·시각 저장', '차량번호 확인', '결제 방식 확인', '결과서 저장 위치 메모'],
    sourceNote: '검사 대상, 수수료, 재검사 기한은 TS/사이버검사소 공식 안내를 우선합니다.',
    primaryAction: '예약 완료',
    secondaryActions: ['검사소 변경', '결과 메모 추가'],
  },
  'beginner-camping-packing-sheet': {
    id: 'beginner-camping-packing-sheet',
    surface: 'sheet',
    resultTitle: '매번 복사해서 쓰는 캠핑 준비물 시트 Flow',
    sourceSummary: [
      '원문은 쉘터/텐트, 취침, 조리, 식재료, 안전·조명·전기, 위생, 의류, 아이·반려동물 품목으로 나눈다.',
      '엑셀/구글시트 열 구조는 분류, 품목명, 수량, 체크, 비고로 제안되어 FlowMe의 작은 시트와 잘 맞는다.',
      '캠핑장 예약이나 장비 추천이 아니라 출발 전 미체크 품목을 줄이는 것이 핵심이다.',
    ],
    sourceTrace: [
      { source: '분류/품목명/수량/체크/비고 열 구조가 제안된다.', artifact: 'Flow는 같은 열을 가진 작은 준비물 시트로 변환합니다.' },
      { source: '안전·조명·전기 품목이 초보가 놓치기 쉬운 영역으로 나온다.', artifact: '안전·조명·전기 행을 기본 강조합니다.' },
      { source: '아이·반려동물 동반 시 추가 품목이 있다.', artifact: '동반자에 따라 추가 행을 켜고 끄는 체크를 둡니다.' },
      { source: 'PDF로 저장해 가족에게 공유하는 방법을 제안한다.', artifact: '출발 전날 미체크 품목 공유를 마지막 카드로 둡니다.' },
    ],
    conversionSummary: [
      '입력은 출발일, 인원, 캠핑 형태만 받는다.',
      '캘린더보다 준비물 시트를 먼저 보여준다.',
      '장비 추천 순위, 캠핑장 예약 대행, 요금 비교는 다루지 않는다.',
    ],
    userDecisionPoints: ['시트가 먼저 보이는가', '안전/조명 항목이 묻히지 않는가', '가족 공유 전 미체크가 보이는가'],
    fields: [
      { label: '출발일', value: '2026-07-18', help: 'D-7, D-5, D-3, 전날 체크 기준입니다.' },
      { label: '인원', value: '성인 2명 + 아이 1명', help: '수량과 추가 품목 행에 반영합니다.' },
      { label: '캠핑 형태', value: '1박 오토캠핑', help: '텐트/취침/조리 기본 행을 선택합니다.' },
    ],
    saveResult: '기본 장비, 안전·조명·전기, 아이/반려동물 추가 품목이 있는 준비물 시트가 만들어집니다.',
    executionTitle: '캠핑 준비물표',
    executionSubtitle: '분류별로 미체크 품목만 줄이기',
    executionStats: [
      { label: '분류', value: '6개' },
      { label: '미체크', value: '8개' },
      { label: '공유', value: '전날' },
    ],
    tableColumns: ['분류', '품목', '수량', '상태', '비고'],
    tableRows: [
      { cells: ['쉘터/텐트', '텐트 본체', '1', '체크 전', '4인용'], status: '체크 전' },
      { cells: ['취침', '에어 매트', '2', '체크 전', '더블 1 + 싱글 1'], status: '체크 전' },
      { cells: ['안전·조명', '랜턴/헤드랜턴', '2', '강조', '여분 배터리 포함'], status: '강조' },
      { cells: ['아이 동반', '여벌 옷/작은 책', '1세트', '선택', '아이 동반 시'], status: '선택' },
    ],
    executionCards: [
      { title: '기본 장비 행 만들기', meta: '출발 7일 전', body: '쉘터/텐트, 취침, 조리, 식재료, 위생 분류를 만들고 보유/대여/구매 상태를 적습니다.', status: '시트 생성' },
      { title: '안전·조명·전기 항목 확인', meta: '출발 5일 전', body: '랜턴, 헤드랜턴, 여분 배터리, 멀티탭, 보조배터리, 구급상자, 소화기/경보기 필요 여부를 체크합니다.', status: '강조' },
      { title: '아이·반려동물 추가 품목 고르기', meta: '출발 3일 전', body: '동반자에 따라 기저귀, 장난감, 배변봉투, 하네스 등 추가 행만 켭니다.', status: '추가 행' },
      { title: '출발 전 체크와 공유', meta: '출발 전날', body: '체크박스가 남은 행만 가족/동행자에게 공유하고 당일 차에 실을 품목을 표시합니다.', status: '공유' },
    ],
    detailTitle: '안전·조명·전기 항목 확인',
    detailMeta: '출발 5일 전 · 준비물 시트',
    detailMemo: '랜턴, 헤드랜턴, 여분 배터리, 멀티탭, 보조배터리, 구급상자, 소화기/경보기 필요 여부를 확인합니다. 화기, 전기, 난로, 일산화탄소 관련 안전은 캠핑장/제품/공식 안내를 우선합니다.',
    detailChecks: ['랜턴/헤드랜턴 확인', '여분 배터리/충전 케이블 확인', '구급상자 확인', '소화기/경보기 필요 여부 확인'],
    sourceNote: '원문은 준비물 체크리스트입니다. Flow는 작은 시트와 출발 전 체크만 담당합니다.',
    primaryAction: '안전 품목 체크',
    secondaryActions: ['미체크만 보기', '가족에게 공유'],
  },
  'free-appliance-pickup-reservation': {
    id: 'free-appliance-pickup-reservation',
    surface: 'checklist',
    resultTitle: '예약 전 가능 품목과 수거 전날 준비가 보이는 폐가전 방문수거 Flow',
    sourceSummary: [
      '공식 예약 시스템은 배출품목 입력, 기본정보 입력, 본인인증, 예약 확인/완료 단계로 구성된다.',
      '지자체 안내와 공식 기준은 대형가전 단일 수거와 소형가전 5개 이상 수거 기준을 구분한다.',
      '실행에서 중요한 것은 예약 자체보다 수거 불가 품목, 철거 필요 제품, 통로 확보, 당일 연락 가능 상태다.',
    ],
    sourceTrace: [
      { source: '단일 수거 가능 품목과 소형가전 5개 이상 기준이 있다.', artifact: '예약 전 첫 체크가 수거 가능 품목 확인입니다.' },
      { source: '배출품목, 주소, 희망일 등 예약 정보를 입력한다.', artifact: '예약일 카드에는 공식 사이트에서 예약하고 확인 위치만 메모하게 합니다.' },
      { source: '고정 설치 제품은 철거되어 있어야 한다.', artifact: '수거 전날 철거·통로·잉크/토너 준비 체크가 있습니다.' },
      { source: '방문 또는 문전 수거가 진행된다.', artifact: '수거 당일 문전 배출 위치와 연락 가능 상태를 확인합니다.' },
    ],
    conversionSummary: [
      '입력은 수거 희망일, 배출 품목, 엘리베이터/통로 여부로 제한한다.',
      '수거 가능 품목 확인, 예약, 전날 준비, 당일 확인 네 단계만 둔다.',
      '개인정보와 상세 주소는 Flow에 저장하지 않고 공식 예약 시스템에만 입력하게 한다.',
    ],
    userDecisionPoints: ['공식 예약 전 확인해야 할 조건이 보이는가', '수거 전날 준비가 빠지지 않는가', '개인정보 저장처럼 보이지 않는가'],
    fields: [
      { label: '수거 희망일', value: '2026-06-28', help: '전날 준비와 당일 확인 일정을 만듭니다.' },
      { label: '배출 품목', value: '세탁기 1대 + 소형가전 5개', help: '단일/다량 기준 확인에 사용합니다.' },
      { label: '통로 상태', value: '엘리베이터 있음', help: '수거 가능 상태 준비 메모에 사용합니다.' },
    ],
    saveResult: '예약 전 가능 품목 확인, 예약일, 수거 전날 준비, 수거 당일 확인 체크가 만들어집니다.',
    executionTitle: '폐가전 방문수거',
    executionSubtitle: '예약하고, 전날 준비하고, 당일 확인',
    executionStats: [
      { label: '체크', value: '4개' },
      { label: '개인정보', value: '공식 사이트' },
      { label: '결과', value: '수거/재예약' },
    ],
    executionCards: [
      { title: '수거 가능 품목 확인', meta: '예약 전', body: '냉장고, 세탁기, 에어컨 등 단일 수거 품목인지, 소형가전은 5개 이상인지 공식 사이트에서 확인합니다.', status: '가능 여부' },
      { title: '예약 정보 입력', meta: '예약일', body: '공식 예약 시스템에서 배출품목, 주소, 희망일, 이사 여부를 입력합니다. 개인정보는 Flow에 저장하지 않습니다.', status: '예약' },
      { title: '철거·통로·잉크/토너 준비', meta: '수거 전날', body: '벽걸이 TV/에어컨 등 고정 제품은 철거 필요 여부를 확인하고, 프린터는 잉크/토너 유출 방지 상태를 확인합니다.', status: '전날' },
      { title: '수거 당일 문전 배출 확인', meta: '수거 당일', body: '방문/문전 수거 위치, 엘리베이터/통로 확보, 연락 가능 상태를 확인합니다.', status: '당일' },
    ],
    detailTitle: '수거 전날 준비',
    detailMeta: '수거 전날 · 방문수거 체크',
    detailMemo: '벽걸이 TV/에어컨 등 고정 제품은 철거 필요 여부를 확인합니다. 프린터, 복사기, 팩시밀리는 잉크/토너 유출 방지 상태를 확인하고, 엘리베이터/통로가 막히지 않게 둡니다.',
    detailChecks: ['고정 제품 철거 여부 확인', '소형가전 수량 기준 확인', '잉크/토너 유출 방지', '엘리베이터/통로 확보', '당일 연락 가능 상태 확인'],
    sourceNote: '수거 가능 품목, 지역별 수거일, 예약 변경은 공식 1599-0903/E-순환거버넌스 또는 지자체 안내를 우선합니다.',
    primaryAction: '수거 준비 완료',
    secondaryActions: ['공식 예약 열기', '재예약 메모'],
  },
};

function fallbackAudit(candidate: KoreanFlowContentCandidate): ContentAudit {
  if (candidate.structure === 'challenge') {
    return {
      priority: 'P2',
      pattern: 'challenge',
      focus: '일자별 진행',
      uiDecision: 'Day 단위 진행률과 오늘 할 일을 먼저 보여준다.',
      exportTarget: '챌린지 캘린더',
    };
  }
  if (candidate.category.includes('공부') || candidate.title.includes('시험')) {
    return {
      priority: 'P2',
      pattern: 'study',
      focus: '시험일과 공부 기록',
      uiDecision: '캘린더 일정과 점수/오답 기록을 같이 둔다.',
      exportTarget: '공부 캘린더 + 기록 시트',
    };
  }
  if (candidate.id.includes('used-car')) {
    return {
      priority: 'P1',
      pattern: 'decision',
      focus: '비교 후 결정',
      uiDecision: '후보별 체크와 보류 사유를 먼저 보여준다.',
      exportTarget: '비교 체크리스트',
    };
  }
  if (candidate.destination === 'sheet' || candidate.structure === 'table_plan') {
    return {
      priority: 'P0',
      pattern: 'sheet',
      focus: '행 단위 기록',
      uiDecision: '사용자가 수정할 수 있는 표 형태가 우선이다.',
      exportTarget: '시트',
    };
  }
  if (candidate.destination === 'routine' || candidate.structure.includes('routine')) {
    return {
      priority: 'P1',
      pattern: 'routine',
      focus: '다음 실행일',
      uiDecision: '시작일과 반복 주기를 저장하고 상세 방법은 메모로 둔다.',
      exportTarget: '반복 루틴',
    };
  }
  if (candidate.destination === 'calendar' || candidate.destination === 'hybrid' || candidate.structure === 'timeline') {
    return {
      priority: 'P1',
      pattern: 'timeline',
      focus: '날짜별 해야 할 일',
      uiDecision: 'D-day 흐름과 오늘 가까운 항목을 먼저 보여준다.',
      exportTarget: '캘린더 일정',
    };
  }
  return {
    priority: 'OK',
    pattern: 'checklist',
    focus: '완료 기준이 있는 체크',
    uiDecision: '짧은 체크리스트와 원문 메모만 남긴다.',
    exportTarget: '체크리스트',
  };
}

function auditFor(candidate: KoreanFlowContentCandidate) {
  return audits[candidate.id] ?? fallbackAudit(candidate);
}

function buildExperienceSpecFromCandidate(candidate: KoreanFlowContentCandidate, audit: ContentAudit): ExperienceSpec {
  const primaryItem = candidate.flowItems[0];
  const fields = candidate.inputs.length > 0
    ? candidate.inputs.slice(0, 3).map((input) => ({
        label: input,
        value: '사용자 입력',
        help: `${input}을 저장할 때 입력합니다.`,
      }))
    : [
        { label: '시작 기준', value: primaryItem?.schedule ?? '사용자 입력', help: '저장할 때 사용자가 바꿀 수 있습니다.' },
        { label: '실행 방식', value: patternLabel[audit.pattern], help: '원문 구조에 맞춰 기본 화면을 정합니다.' },
        { label: '완료 기준', value: primaryItem?.completion ?? '완료 체크', help: '상세 화면에서 수정할 수 있습니다.' },
      ];

  const executionCards = candidate.flowItems.map((item) => ({
    title: item.title,
    meta: item.schedule,
    body: item.memo,
    status: item.completion,
  }));

  const detailChecks = candidate.flowItems.map((item) => item.completion || item.title).slice(0, 5);
  const tableRows = candidate.flowItems.map((item) => ({
    cells: [item.title, item.schedule, '사용자 입력', item.completion, '대기'],
    status: '대기',
  }));

  return {
    id: candidate.id,
    surface: candidate.destination === 'sheet' || candidate.structure === 'table_plan'
      ? 'sheet'
      : candidate.destination === 'checklist'
        ? 'checklist'
        : 'calendar',
    resultTitle: `${candidate.title} 실행 Flow`,
    sourceSummary: [candidate.sourceSignal, candidate.demandSignal, candidate.sourceBoundary],
    conversionSummary: [
      `${destinationLabel[candidate.destination]} 중심으로 저장합니다.`,
      `${patternLabel[audit.pattern]} 화면에서 바로 실행할 수 있게 항목을 나눕니다.`,
      '설명보다 날짜, 반복, 체크, 메모, 완료 상태를 먼저 보이게 합니다.',
    ],
    sourceTrace: candidate.flowItems.slice(0, 4).map((item, index) => ({
      source: index === 0 ? `${candidate.sourceSignal} ${item.memo}` : item.memo,
      artifact: `${item.schedule} · ${item.title} · 완료 기준: ${item.completion}`,
    })),
    userDecisionPoints: ['첫 화면에서 다음 행동이 보이는가', '맞는 도구로 보이는가', '상세 체크가 실제 실행에 충분한가'],
    fields,
    saveResult: `${candidate.cta}를 누르면 My Flow에 ${destinationLabel[candidate.destination]} 실행 항목으로 저장됩니다.`,
    executionTitle: candidate.title,
    executionSubtitle: candidate.userNeed,
    executionStats: [
      { label: '항목', value: `${candidate.flowItems.length}개` },
      { label: '화면', value: patternLabel[audit.pattern] },
      { label: '저장', value: destinationLabel[candidate.destination] },
    ],
    executionCards,
    tableColumns: ['항목', '주기/일정', '기록', '완료 기준', '상태'],
    tableRows,
    detailTitle: primaryItem?.title ?? candidate.title,
    detailMeta: primaryItem?.schedule ?? patternLabel[audit.pattern],
    detailMemo: primaryItem?.memo ?? candidate.userNeed,
    detailChecks: detailChecks.length > 0 ? detailChecks : ['오늘 실행 완료'],
    sourceNote: candidate.sourceBoundary,
    primaryAction: candidate.destination === 'checklist' ? '체크 완료' : '완료 체크',
    secondaryActions: candidate.destination === 'checklist' ? ['미루기', '메모'] : ['미루기', '메모'],
  };
}

function scoreTone(score: number) {
  if (score >= 4.5) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (score >= 4) return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

function fitScoreText(score: number) {
  return score.toFixed(1);
}

function priorityTone(priority: ContentAudit['priority']) {
  if (priority === 'P0') return 'border-red-200 bg-red-50 text-red-700';
  if (priority === 'P1') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (priority === 'P2') return 'border-blue-200 bg-blue-50 text-blue-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
}

function userReviewFor(candidate: KoreanFlowContentCandidate): KoreanFlowContentUserReview | undefined {
  const review = userReviewByCandidateId.get(candidate.id);
  return review ? applyKoreanFlowContentReviewRefresh(review) : undefined;
}

function traceStrengthFor(candidate: KoreanFlowContentCandidate): TraceStrength {
  const review = userReviewFor(candidate);
  if (
    review?.status === 'hold' ||
    review?.sourceQuality === 'source_unclear' ||
    review?.sourceQuality === 'needs_exact_source' ||
    candidate.fitScore < 3.8 ||
    candidate.flowItems.length < 2
  ) {
    return 'weak';
  }

  if (
    review?.status === 'conditional' ||
    review?.sourceQuality === 'too_broad' ||
    review?.sourceQuality === 'usable_but_ai_like' ||
    candidate.fitScore < 4.2
  ) {
    return 'needs_review';
  }

  return 'strong';
}

function traceStrengthTone(strength: TraceStrength) {
  if (strength === 'strong') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (strength === 'needs_review') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-red-200 bg-red-50 text-red-800';
}

function loadReviews(): Record<string, ReviewState> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '{}');
  } catch {
    return {};
  }
}

function orderedCandidates() {
  return koreanFlowContentCandidates.map(applyKoreanFlowContentSourceRefresh).sort((a, b) => {
    const priorityDiff = priorityRank[auditFor(a).priority] - priorityRank[auditFor(b).priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.fitScore - a.fitScore;
  });
}

export function KoreanFlowContentStudio() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('전체');
  const [pattern, setPattern] = useState<'전체' | UiPattern>('전체');
  const [traceFilter, setTraceFilter] = useState<TraceFilter>('전체');
  const [focusFilter, setFocusFilter] = useState<FocusFilter>('전체');
  const [selectedId, setSelectedId] = useState(orderedCandidates()[0]?.id ?? '');
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>('execute');
  const [reviews, setReviews] = useState<Record<string, ReviewState>>({});
  const [saveMessage, setSaveMessage] = useState('');
  const selectedPreviewRef = useRef<HTMLElement | null>(null);
  const didMountSelectionRef = useRef(false);

  useEffect(() => {
    setReviews(loadReviews());
    void fetch('/api/content-flow-review')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.reviews) setReviews((current) => ({ ...current, ...data.reviews }));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, JSON.stringify(reviews));
    }
  }, [reviews]);

  const candidates = useMemo(() => orderedCandidates(), []);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      const audit = auditFor(candidate);
      const matchesCategory = category === '전체' || candidate.category === category;
      const matchesPattern = pattern === '전체' || audit.pattern === pattern;
      const matchesTrace = traceFilter === '전체' || traceStrengthFor(candidate) === traceFilter;
      const matchesFocus =
        focusFilter === '전체' ||
        (focusFilter === '반복 방지 신규 후보' && antiRepetitionCandidateIds.has(candidate.id)) ||
        (focusFilter === '최근 다양화 후보' && latestDiversificationCandidateIds.has(candidate.id)) ||
        (focusFilter === '제작자 자료 확장' && creatorSourceBreadthCandidateIds.has(candidate.id));
      const haystack = [
        candidate.title,
        candidate.category,
        candidate.sourceTitle,
        candidate.userNeed,
        candidate.sourceSignal,
        audit.focus,
        audit.uiDecision,
        candidate.flowItems.map((item) => `${item.title} ${item.memo}`).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return matchesCategory && matchesPattern && matchesTrace && matchesFocus && (!needle || haystack.includes(needle));
    });
  }, [candidates, category, focusFilter, pattern, query, traceFilter]);

  const selected = candidates.find((candidate) => candidate.id === selectedId) ?? filtered[0] ?? candidates[0];
  const selectedAudit = auditFor(selected);
  const selectedExperienceSpec = representativeExperienceSpecs[selected.id] ?? buildExperienceSpecFromCandidate(selected, selectedAudit);
  const selectedReview = reviews[selected.id] ?? {};
  const reviewedCount = Object.values(reviews).filter((review) => review.rating || review.memo || review.issue || review.keep).length;
  const p0Count = candidates.filter((candidate) => auditFor(candidate).priority === 'P0').length;
  const antiRepetitionCount = candidates.filter((candidate) => antiRepetitionCandidateIds.has(candidate.id)).length;
  const latestDiversificationCount = candidates.filter((candidate) => latestDiversificationCandidateIds.has(candidate.id)).length;
  const creatorSourceBreadthCount = candidates.filter((candidate) => creatorSourceBreadthCandidateIds.has(candidate.id)).length;

  useEffect(() => {
    if (selected && !filtered.some((candidate) => candidate.id === selected.id) && filtered[0]) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selected]);

  useEffect(() => {
    setActivePreviewTab('execute');
  }, [selected.id]);

  useEffect(() => {
    if (!didMountSelectionRef.current) {
      didMountSelectionRef.current = true;
      return;
    }
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    window.requestAnimationFrame(() => {
      selectedPreviewRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }, [selected.id]);

  const updateReview = (next: ReviewState) => {
    setReviews((current) => ({
      ...current,
      [selected.id]: {
        ...current[selected.id],
        ...next,
      },
    }));
    setSaveMessage('브라우저에 자동 저장됨');
  };

  const saveToRepo = async () => {
    const review = reviews[selected.id] ?? {};
    setSaveMessage('저장 중...');
    try {
      const response = await fetch('/api/content-flow-review', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          flowId: selected.id,
          title: selected.title,
          ...review,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      setSaveMessage('저장소에 저장됨');
    } catch {
      setSaveMessage('서버 저장 실패. 브라우저 저장은 유지됨');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <section className="mx-auto max-w-[1440px] px-3 py-2 sm:px-5 sm:py-4 lg:px-8">
        <header className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-4 p-2.5 sm:p-5 lg:grid-cols-[minmax(0,1fr)_420px] lg:p-7">
            <div>
              <p className="text-sm font-black text-blue-700">Flow 콘텐츠 스튜디오</p>
              <h1 className="mt-1 text-2xl font-black leading-tight tracking-normal sm:mt-2 sm:text-4xl">
                <span className="sm:hidden">원문을 Flow UI로 평가하기</span>
                <span className="hidden sm:inline">원문을 실제 Flow UI로 바꿔보고 평가하기</span>
              </h1>
              <p className="mt-3 hidden max-w-3xl text-sm leading-6 text-slate-600 sm:block">
                {candidates.length}개 후보를 캘린더, 루틴, 시트, 체크, 결정 화면으로 나눠 실제 사용자가 저장하고 실행하는 장면에 가깝게 보여줍니다.
                점수와 메모는 브라우저와 로컬 저장소에 남길 수 있습니다.
              </p>
            </div>
            <div className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-4 lg:grid-cols-2">
              <Metric label="전체 후보" value={`${candidates.length}개`} />
              <Metric label="우선 검토" value={`${p0Count}개`} tone="red" />
              <Metric label="평가 완료" value={`${reviewedCount}개`} tone="blue" />
              <Metric label="신규 축" value={`${antiRepetitionCount}개`} tone="blue" />
            </div>
          </div>
          <div className="hidden grid-cols-2 gap-1.5 border-t border-slate-200 p-1.5 sm:grid sm:gap-2 sm:p-3 lg:grid-cols-[minmax(0,1fr)_170px_170px_170px]">
            <input
              className="col-span-2 min-h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-500 focus:bg-white sm:min-h-10 lg:col-span-1"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="세탁기, 결혼, 식물, 중고차, 공부처럼 검색"
            />
            <select
              className="min-h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold sm:min-h-10"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>전체</option>
              {koreanFlowContentCategories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              className="min-h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold sm:min-h-10"
              value={pattern}
              onChange={(event) => setPattern(event.target.value as '전체' | UiPattern)}
            >
              <option>전체</option>
              {Object.entries(patternLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              aria-label="원문 대응 강도"
              className="col-span-2 min-h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold sm:col-span-1 sm:min-h-10"
              value={traceFilter}
              onChange={(event) => setTraceFilter(event.target.value as TraceFilter)}
            >
              {Object.entries(traceStrengthFilterLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden flex-wrap gap-2 border-t border-slate-200 p-2 sm:flex sm:p-3">
            {(['전체', '반복 방지 신규 후보', '최근 다양화 후보', '제작자 자료 확장'] as FocusFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setFocusFilter(filter)}
                className={`min-h-9 rounded-full border px-3 text-xs font-black ${
                  focusFilter === filter ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                {filter === '전체'
                  ? '전체 후보'
                  : filter === '반복 방지 신규 후보'
                    ? `반복 방지 신규 후보 ${antiRepetitionCount}개`
                    : filter === '최근 다양화 후보'
                      ? `최근 다양화 후보 ${latestDiversificationCount}개`
                      : `제작자 자료 확장 ${creatorSourceBreadthCount}개`}
              </button>
            ))}
            <span className="flex min-h-9 items-center rounded-full bg-slate-50 px-3 text-xs font-bold text-slate-500">
              기숙사 · 김장 · 여권 · 악보 · 반려묘 · 전세계약 · 굿노트 · 마카롱
            </span>
          </div>
          <div className="hidden border-t border-slate-200 bg-slate-50/70 p-2 sm:p-3 lg:block" data-testid="content-flow-coverage-groups">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black text-blue-700">대표 검토 축</p>
                <p className="text-xs font-semibold leading-5 text-slate-500">카테고리별로 어떤 Flow 가능성을 확인 중인지 빠르게 이동합니다.</p>
              </div>
              <span className="hidden rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200 sm:inline-flex">
                {representativeCoverageGroups.length}개 축
              </span>
            </div>
            <div className="flex snap-x gap-2 overflow-x-auto pb-1 lg:grid lg:snap-none lg:grid-cols-7 lg:overflow-visible lg:pb-0">
              {representativeCoverageGroups.map((group) => {
                const primaryId = group.candidateIds.find((id) => candidates.some((candidate) => candidate.id === id)) ?? group.candidateIds[0];
                const coverageCount = group.candidateIds.filter((id) => candidates.some((candidate) => candidate.id === id)).length;
                return (
                  <button
                    key={group.label}
                    type="button"
                    data-testid="content-flow-coverage-group"
                    data-target-flow-id={primaryId}
                    onClick={() => {
                      setFocusFilter('전체');
                      setCategory('전체');
                      setPattern('전체');
                      setTraceFilter('전체');
                      setQuery('');
                      setSelectedId(primaryId);
                      setSaveMessage('');
                    }}
                    className={`min-w-[190px] snap-start rounded-xl border bg-white p-3 text-left shadow-sm transition hover:border-blue-300 lg:min-w-0 ${
                      group.candidateIds.includes(selected.id) ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm font-black text-slate-950">{group.label}</strong>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-700">{coverageCount}개</span>
                    </div>
                    <p className="mt-1 text-xs font-bold text-slate-500">{group.artifact}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{group.question}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        <div className="mt-2 grid gap-3 lg:mt-4 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)]">
          <CandidateRail
            candidates={filtered}
            selectedId={selected.id}
            reviews={reviews}
            onSelect={(id) => {
              setSelectedId(id);
              setSaveMessage('');
            }}
          />

          <section ref={selectedPreviewRef} className="scroll-mt-3 grid gap-4 2xl:grid-cols-[minmax(0,1fr)_330px]">
            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <CandidateHeader candidate={selected} audit={selectedAudit} />
              {selectedExperienceSpec ? (
                <HighFidelityExperience
                  candidate={selected}
                  audit={selectedAudit}
                  spec={selectedExperienceSpec}
                  activeTab={activePreviewTab}
                  onTabChange={setActivePreviewTab}
                />
              ) : (
                <>
                  <div className="grid gap-4 p-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
                    <FlowPreview candidate={selected} audit={selectedAudit} />
                    <SavePanel candidate={selected} audit={selectedAudit} />
                  </div>
                  <div className="grid gap-3 border-t border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <InfoBlock title="원문에서 가져온 실행 단서" body={selected.sourceSignal} />
                    <InfoBlock title="사용자가 찾는 이유" body={selected.demandSignal} />
                    <InfoBlock title="UI 판단" body={selectedAudit.uiDecision} />
                    <InfoBlock title="출처/주의 경계" body={selected.sourceBoundary} />
                  </div>
                </>
              )}
            </article>

            <ReviewPanel
              candidate={selected}
              audit={selectedAudit}
              spec={selectedExperienceSpec}
              review={selectedReview}
              saveMessage={saveMessage}
              onChange={updateReview}
              onSave={saveToRepo}
            />
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'blue' | 'red' | 'amber' }) {
  const toneClass = {
    slate: 'border-slate-200 bg-slate-50 text-slate-950',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    red: 'border-red-200 bg-red-50 text-red-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-xs font-bold opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function CandidateRail({
  candidates,
  selectedId,
  reviews,
  onSelect,
}: {
  candidates: KoreanFlowContentCandidate[];
  selectedId: string;
  reviews: Record<string, ReviewState>;
  onSelect: (id: string) => void;
}) {
  return (
    <aside
      aria-label="Flow 콘텐츠 후보 선택"
      className="flex snap-x snap-mandatory scroll-px-3 gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:grid lg:max-h-[calc(100vh-32px)] lg:snap-none lg:overflow-auto lg:pr-1"
      data-testid="content-flow-candidate-list"
    >
      {candidates.map((candidate) => {
        const audit = auditFor(candidate);
        const review = reviews[candidate.id];
        const traceStrength = traceStrengthFor(candidate);
        const active = candidate.id === selectedId;
        return (
          <button
            key={candidate.id}
            type="button"
            data-testid="content-flow-candidate"
            data-flow-id={candidate.id}
            data-pattern={audit.pattern}
            aria-pressed={active}
            onClick={() => onSelect(candidate.id)}
            className={`min-w-[168px] snap-start touch-manipulation rounded-xl border bg-white p-2 text-left shadow-sm transition hover:border-blue-300 active:scale-[0.99] sm:min-w-[230px] sm:p-3 lg:min-w-0 ${
              active ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${priorityTone(audit.priority)}`}>{priorityDisplayLabel[audit.priority]}</span>
              <span
                aria-label={`Flow 적합도 ${fitScoreText(candidate.fitScore)}점`}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${scoreTone(candidate.fitScore)}`}
              >
                적합 {fitScoreText(candidate.fitScore)}
              </span>
            </div>
            <h2 className="mt-1 line-clamp-2 text-sm font-black leading-4 sm:mt-2 sm:text-base sm:leading-5">{candidate.title}</h2>
            <p className="mt-1 hidden line-clamp-2 text-xs leading-5 text-slate-600 sm:block">{candidate.userNeed}</p>
            <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
              <Chip>{candidate.category}</Chip>
              {antiRepetitionCandidateIds.has(candidate.id) ? <Chip tone="blue">신규 축</Chip> : null}
              {latestDiversificationCandidateIds.has(candidate.id) ? <Chip tone="blue">최근 다양화</Chip> : null}
              {creatorSourceBreadthCandidateIds.has(candidate.id) ? <Chip tone="blue">제작자 자료</Chip> : null}
              <Chip>{patternLabel[audit.pattern]}</Chip>
              {representativeExperienceSpecs[candidate.id] ? <Chip tone="blue">실행 UI</Chip> : null}
              <Chip tone={traceStrength === 'strong' ? 'blue' : traceStrength === 'weak' ? 'red' : 'slate'}>{traceStrengthLabel[traceStrength]}</Chip>
              {review?.rating ? <Chip tone="blue">내 점수 {review.rating}</Chip> : null}
              {review?.issue ? <Chip tone="red">문제 있음</Chip> : null}
            </div>
          </button>
        );
      })}
    </aside>
  );
}

function CandidateHeader({ candidate, audit }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit }) {
  const publicFlowRoute = publicFlowRouteByCandidateId[candidate.id];
  const traceStrength = traceStrengthFor(candidate);
  const review = userReviewFor(candidate);

  return (
    <header className="border-b border-slate-200 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${priorityTone(audit.priority)}`}>{priorityDisplayLabel[audit.priority]}</span>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${traceStrengthTone(traceStrength)}`}>{traceStrengthLabel[traceStrength]}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{candidate.category}</span>
        {antiRepetitionCandidateIds.has(candidate.id) ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">반복 방지 신규 축</span> : null}
        {latestDiversificationCandidateIds.has(candidate.id) ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">최근 다양화 후보</span> : null}
        {creatorSourceBreadthCandidateIds.has(candidate.id) ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">제작자 자료 확장</span> : null}
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{patternLabel[audit.pattern]}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{sourceTypeLabel[candidate.sourceType]}</span>
        {review?.sourceIssue ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">출처 재검토</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 sm:mt-3 sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 basis-full sm:basis-auto">
          <h2 className="text-xl font-black tracking-normal sm:text-3xl">{candidate.title}</h2>
          <p className="mt-1 line-clamp-1 text-sm leading-6 text-slate-600 sm:mt-2 sm:line-clamp-none">{candidate.userNeed}</p>
        </div>
        {publicFlowRoute ? (
          <a
            data-testid="content-flow-public-route-link"
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl bg-blue-700 px-3 text-sm font-black text-white hover:bg-blue-800"
            href={`/f/${publicFlowRoute.slug}`}
          >
            {publicFlowRoute.label}
          </a>
        ) : null}
        <a
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-800 hover:border-blue-300 hover:text-blue-700"
          href={candidate.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          원문 열기
        </a>
      </div>
    </header>
  );
}

function HighFidelityExperience({
  candidate,
  audit,
  spec,
  activeTab,
  onTabChange,
}: {
  candidate: KoreanFlowContentCandidate;
  audit: ContentAudit;
  spec: ExperienceSpec;
  activeTab: PreviewTab;
  onTabChange: (tab: PreviewTab) => void;
}) {
  return (
    <div className="bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-3 pt-2 sm:px-4 sm:pt-3">
        <div
          aria-label="Flow 콘텐츠 미리보기 보기 선택"
          className="grid grid-cols-2 gap-1 sm:flex sm:overflow-x-auto"
          data-testid="content-flow-preview-tabs"
          role="tablist"
        >
          {previewTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-controls={`content-flow-preview-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              data-testid={`content-flow-preview-tab-${tab.id}`}
              id={`content-flow-preview-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              role="tab"
              className={`min-h-11 rounded-xl border px-3 text-sm font-black transition sm:min-h-11 sm:shrink-0 sm:rounded-b-none sm:border-b-0 sm:px-4 ${
                activeTab === tab.id
                  ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.08)]'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700 sm:border-transparent'
              }`}
            >
              {previewTabLabel(tab, candidate)}
            </button>
          ))}
        </div>
      </div>
      <div
        aria-labelledby={`content-flow-preview-tab-${activeTab}`}
        className="p-3 sm:p-4"
        data-testid="content-flow-high-fidelity"
        data-flow-id={candidate.id}
        data-active-tab={activeTab}
        id={`content-flow-preview-panel-${activeTab}`}
        role="tabpanel"
      >
        {activeTab === 'summary' ? <SourceSummaryView candidate={candidate} audit={audit} spec={spec} /> : null}
        {activeTab === 'save' ? <SaveSetupView candidate={candidate} audit={audit} spec={spec} /> : null}
        {activeTab === 'execute' ? <ExecutionView candidate={candidate} audit={audit} spec={spec} /> : null}
        {activeTab === 'detail' ? <DetailSheetView candidate={candidate} audit={audit} spec={spec} /> : null}
      </div>
    </div>
  );
}

function SourceSummaryView({ candidate, audit, spec }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit; spec: ExperienceSpec }) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black text-blue-700">원문 기반 Flow 상품 화면</p>
            <h3 className="mt-1 text-2xl font-black tracking-normal">{spec.resultTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{candidate.sourceTitle}</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{sourceTypeLabel[candidate.sourceType]}</span>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <EvidencePanel title="원문에서 보이는 실행 구조" items={spec.sourceSummary} />
          <EvidencePanel title="Flow로 바꿨을 때 남길 것" items={spec.conversionSummary} tone="blue" />
        </div>

        <SourceToExecutionTrace spec={spec} />

        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-black text-amber-900">판단 포인트</p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {spec.userDecisionPoints.map((point) => (
              <div key={point} className="rounded-xl border border-amber-200 bg-white p-3 text-sm font-bold leading-6 text-amber-950">
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>
      <aside className="grid gap-3 self-start">
        <MiniProductCard candidate={candidate} audit={audit} spec={spec} />
        <InfoBlock title="출처/주의 경계" body={candidate.sourceBoundary} />
      </aside>
    </div>
  );
}

function SaveSetupView({ candidate, audit, spec }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit; spec: ExperienceSpec }) {
  const traceStrength = traceStrengthFor(candidate);

  if (traceStrength === 'weak') {
    return <HoldCandidateView candidate={candidate} audit={audit} spec={spec} />;
  }

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        {traceStrength === 'needs_review' ? <ConditionalCandidateNotice candidate={candidate} /> : null}
        <p className="text-xs font-black text-blue-700">{traceStrength === 'needs_review' ? '조건부 저장 설정' : '저장 설정'}</p>
        <h3 className="mt-1 text-2xl font-black tracking-normal">{candidate.cta}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{spec.saveResult}</p>

        <div className="mt-5 grid gap-3">
          {spec.fields.map((field) => (
            <label key={field.label} className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <span className="text-xs font-black text-slate-500">{field.label}</span>
              <input className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900" value={field.value} readOnly />
              <span className="text-xs leading-5 text-slate-500">{field.help}</span>
            </label>
          ))}
        </div>
      </section>

      <aside className="rounded-[28px] border border-slate-300 bg-slate-950 p-3 shadow-sm">
        <div className="rounded-[22px] bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-blue-700">{traceStrength === 'needs_review' ? '조건 확인 후 저장 미리보기' : '저장 미리보기'}</span>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">{destinationLabel[candidate.destination]}</span>
          </div>
          <h4 className="mt-3 text-xl font-black leading-tight">{spec.resultTitle}</h4>
          <div className="mt-4 grid gap-2">
            {spec.executionCards.slice(0, 3).map((card) => (
              <div key={card.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-black text-blue-700">{card.meta}</p>
                <p className="mt-1 text-sm font-black">{card.title}</p>
              </div>
            ))}
          </div>
          <button type="button" className="mt-4 min-h-11 w-full rounded-xl bg-blue-700 text-sm font-black text-white">
            {traceStrength === 'needs_review' ? `조건 확인 후 ${audit.exportTarget}로 저장` : `${audit.exportTarget}로 저장`}
          </button>
        </div>
      </aside>
    </div>
  );
}

function ConditionalCandidateNotice({ candidate }: { candidate: KoreanFlowContentCandidate }) {
  const review = userReviewFor(candidate);

  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3" data-testid="content-flow-conditional-candidate">
      <p className="text-xs font-black text-amber-700">조건부 저장 검토</p>
      <h4 className="mt-1 text-base font-black text-amber-950">저장 전에 원문/범위/사용 조건을 한 번 더 확인해야 합니다</h4>
      <div className="mt-2 grid gap-1.5 text-sm leading-6 text-amber-950">
        <p>
          <span className="font-black">확인 이유 </span>
          {review?.sourceIssue ?? review?.conversionNote ?? '대표 후보로 올리기 전에 실행 범위와 원문 근거를 다시 봐야 합니다.'}
        </p>
        <p>
          <span className="font-black">저장 조건 </span>
          {review?.uxAction ?? '사용자가 실제로 저장할 범위만 남기고 나머지는 메모로 내려야 합니다.'}
        </p>
      </div>
    </div>
  );
}

function HoldCandidateView({ candidate, audit, spec }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit; spec: ExperienceSpec }) {
  const review = userReviewFor(candidate);

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="rounded-2xl border border-red-200 bg-red-50 p-4" data-testid="content-flow-hold-candidate">
        <p className="text-xs font-black text-red-700">현재 저장 후보 아님</p>
        <h3 className="mt-1 text-2xl font-black tracking-normal text-red-950">원문 교체 또는 후보 제외가 먼저입니다</h3>
        <p className="mt-2 text-sm leading-6 text-red-900">
          이 후보는 사용자가 원문을 읽고 바로 실행 산출물로 옮기기에는 근거가 약합니다. Flow 저장 화면을 만들기 전에 더 명확한 원문,
          더 구체적인 실행 항목, 또는 민감 영역 경계가 필요합니다.
        </p>
        <div className="mt-4 grid gap-2 rounded-xl border border-red-200 bg-white p-3 text-sm leading-6 text-red-950">
          <p>
            <span className="font-black">보류 이유 </span>
            {review?.sourceIssue ?? '원문 근거와 실행 항목의 연결이 약합니다.'}
          </p>
          <p>
            <span className="font-black">다음 조치 </span>
            {review?.uxAction ?? '대표 후보에서 내리고 더 명확한 원문을 찾습니다.'}
          </p>
        </div>
      </section>
      <aside className="grid gap-3 self-start">
        <InfoBlock title="원래 저장 의도" body={candidate.cta} />
        <InfoBlock title="현재 분류" body={`${traceStrengthLabel[traceStrengthFor(candidate)]} · ${audit.exportTarget}`} />
        <SourceToExecutionTrace spec={spec} compact />
      </aside>
    </div>
  );
}

function getSimulatedFlowExecution(spec: ExperienceSpec): SimulatedFlowExecution {
  if (spec.id === 'washer-tub-clean-monthly') {
    return {
      surface: 'calendar',
      monthLabel: '2026년 6월',
      startOffset: 1,
      daysInMonth: 30,
      selectedDay: 1,
      selectedDateLabel: '2026-06-01 월요일',
      selectedSummary: '매월 반복되는 세탁기 통세척 루틴이 캘린더에 한 개 생깁니다.',
      flowViewLabel: '월 1회 관리 루틴',
      calendarItems: [
        { day: 1, title: '통세척', kind: 'routine', icon: '🧼' },
        { day: 29, title: '다음 통세척', kind: 'routine', icon: '🧼' },
      ],
      selectedItems: [
        {
          title: '세탁기 통세척',
          meta: '매월 1일 반복 · 40분',
          body: '내 세탁기 방식과 준비물 메모를 보고 통세척 코스를 실행한 뒤, 고무패킹과 세제통/배수필터를 확인하고 문 열어 건조합니다. 냄새가 반복되면 다음 실행부터 2주 1회로 조정하고, 메모에는 2주 간격 조정 이유만 남깁니다.',
          checks: ['드럼/통돌이 방식 확인', '과탄산소다 100g 또는 액상 전용 클리너 준비', '통세척 코스 완료', '고무패킹 안쪽 물기 닦음', '세제통/배수필터 확인', '세탁 후 문 열어 건조'],
          primaryAction: '오늘 완료',
          secondaryActions: ['다음 주로 미루기', '메모 수정'],
          statusLabel: '체크 0/6',
        },
      ],
      setupRows: [
        { label: '시작일', value: '2026-06-01' },
        { label: '반복', value: '매월 1일' },
        { label: '캘린더 제목', value: '세탁기 통세척' },
        { label: '메모', value: '모델/구매 링크' },
      ],
    };
  }

  if (spec.id === 'monstera-care-routine') {
    return {
      surface: 'calendar',
      monthLabel: '2026년 6월',
      startOffset: 1,
      daysInMonth: 30,
      selectedDay: 6,
      selectedDateLabel: '2026-06-06 토요일',
      selectedSummary: '주기 알림은 상태 확인으로 뜨고, 물주기 여부는 상세에서 판단합니다.',
      flowViewLabel: '7~10일마다 상태 확인',
      calendarItems: [
        { day: 6, title: '몬스테라 확인', kind: 'routine', icon: '🪴' },
        { day: 16, title: '몬스테라 확인', kind: 'routine', icon: '🪴' },
        { day: 26, title: '몬스테라 확인', kind: 'routine', icon: '🪴' },
      ],
      selectedItems: [
        {
          title: '몬스테라 상태 확인',
          meta: '7~10일마다 · 물주기 전 판단',
          body: '겉흙 2~3cm 안쪽과 화분 무게를 먼저 확인합니다. 밝은 간접광 위치와 배수구멍 상태도 함께 봅니다.',
          checks: ['겉흙 2~3cm 안쪽 확인', '화분 무게 확인', '밝은 간접광 위치 확인', '배수구멍/받침 물 고임 확인'],
          primaryAction: '물주기 완료',
          secondaryActions: ['오늘은 보류', '관찰 메모'],
          statusLabel: '체크 0/4',
        },
      ],
      setupRows: [
        { label: '식물', value: '거실 몬스테라' },
        { label: '반복', value: '7~10일마다 확인' },
        { label: '캘린더 제목', value: '몬스테라 상태 확인' },
      ],
    };
  }

  if (spec.id === 'wedding-12-month-timeline') {
    return {
      surface: 'calendar',
      monthLabel: '2026년 6월',
      startOffset: 1,
      daysInMonth: 30,
      selectedDay: 5,
      selectedDateLabel: '2026-06-05 금요일',
      selectedSummary: '결혼식 날짜를 기준으로 월별 준비 일정이 캘린더와 선택 날짜 목록에 생깁니다.',
      flowViewLabel: '결혼식 D-day 기반 타임라인',
      calendarItems: [
        { day: 5, title: '예산/웨딩홀', kind: 'schedule', icon: '💍' },
        { day: 12, title: '계약 조건', kind: 'schedule', icon: '📍' },
        { day: 19, title: '청첩장/식권', kind: 'schedule', icon: '📝' },
        { day: 26, title: 'BGM/역할 분담', kind: 'schedule', icon: '🎵' },
      ],
      selectedItems: [
        {
          title: '예산과 웨딩홀 후보 정리',
          meta: 'D-300~D-180 구간 · 캘린더 일정',
          body: '예산 상한, 지역, 보증인원, 보증인원 변경 가능 기한, 주차, 식대 조건을 정리하고 후보 3곳의 상담 일정을 잡습니다.',
          checks: ['예산 상한 입력', '웨딩홀 후보 3곳 정리', '보증인원 기준 입력', '보증인원 변경 가능 기한 확인', '계약금/위약금 규정 확인'],
          primaryAction: '완료 체크',
          secondaryActions: ['캘린더에서 열기', '업체 메모'],
          statusLabel: '체크 0/5',
        },
      ],
      setupRows: [
        { label: '기준일', value: '2027-05-16 결혼식' },
        { label: '생성', value: 'D-300~D-1주' },
        { label: '이번 달', value: '예산/웨딩홀 후보' },
      ],
    };
  }

  if (spec.id === 'water-purifier-filter-cycle') {
    return {
      surface: 'sheet',
      monthLabel: '2026년 8월',
      startOffset: 6,
      daysInMonth: 31,
      selectedDay: 20,
      selectedDateLabel: '2026-08-20 목요일',
      selectedSummary: '필터별 마지막 교체일을 기준으로 다음 교체일이 계산되고, 가까운 교체일만 캘린더에 보입니다.',
      flowViewLabel: '필터별 교체 주기 관리',
      calendarItems: [
        { day: 1, title: '침전 필터', kind: 'sheet', icon: '🚰' },
        { day: 20, title: '프리카본 필터', kind: 'sheet', icon: '🚰' },
        { day: 20, title: '후카본 필터', kind: 'sheet', icon: '🚰' },
      ],
      selectedItems: [
        {
          title: '후카본 필터 확인',
          meta: '9~12개월 주기 · 관리 시트 연동',
          body: '정수 마지막 단계의 필터명과 구매/렌탈 링크를 확인하고, 물맛/냄새 변화와 코크/출수구 상태를 본 뒤 마지막 교체일을 업데이트합니다.',
          checks: ['후카본 필터명 확인', '물맛/냄새 변화 확인', '코크/출수구 청소', '자가 살균 기능 실행', '교체 후 마지막 교체일 수정'],
          primaryAction: '교체 완료',
          secondaryActions: ['다음 주로 미루기', '구매 링크 열기'],
          statusLabel: '체크 0/3',
        },
      ],
      setupRows: [
        { label: '모델', value: '사용자 입력' },
        { label: '기준', value: '마지막 교체일' },
        { label: '알림', value: '교체 7일 전' },
      ],
    };
  }

  if (spec.id === 'plank-30-day-challenge') {
    return {
      surface: 'calendar',
      monthLabel: '2026년 6월',
      startOffset: 1,
      daysInMonth: 30,
      selectedDay: 9,
      selectedDateLabel: '2026-06-09',
      selectedSummary: spec.executionSubtitle,
      flowViewLabel: spec.resultTitle,
      calendarItems: [
        { day: 1, title: 'Day 1 20초', kind: 'schedule', icon: '▮' },
        { day: 7, title: 'Day 7 휴식', kind: 'routine', icon: '○' },
        { day: 9, title: 'Day 9 55초', kind: 'schedule', icon: '▮' },
        { day: 19, title: 'Day 19 휴식', kind: 'routine', icon: '○' },
        { day: 27, title: 'Day 27 휴식', kind: 'routine', icon: '○' },
        { day: 30, title: 'Day 30 150초', kind: 'schedule', icon: '▮' },
      ],
      selectedItems: [
        {
          title: 'Day 9 플랭크 55초',
          meta: '호흡 3:3 패턴 · 원문 Day 9',
          body: '타이머를 55초로 맞추고 호흡 3:3 패턴을 확인합니다. 무리하면 목표를 낮추고 이유만 메모합니다.',
          checks: ['타이머 55초 설정', '호흡 3:3 패턴 확인', '허리 통증/어지러움/호흡 곤란 없을 때만 진행', '완료 또는 조정 메모'],
          primaryAction: '오늘 목표 완료',
          secondaryActions: ['목표 낮추기', '휴식으로 변경'],
          statusLabel: '체크 0/4',
        },
      ],
      setupRows: [
        { label: '시작일', value: '2026-06-01' },
        { label: '휴식일', value: 'Day 7·19·27' },
        { label: '기록', value: '완료/조정' },
      ],
    };
  }

  if (spec.id === 'japan-esim-setup-before-departure') {
    return {
      surface: 'calendar',
      monthLabel: '2026년 6월',
      startOffset: 1,
      daysInMonth: 30,
      selectedDay: 19,
      selectedDateLabel: '2026-06-19 금요일',
      selectedSummary: '출국일 기준으로 eSIM 구매, 설치, 도착 후 연결 확인이 캘린더에 들어갑니다.',
      flowViewLabel: '일본 eSIM 출국 전 설정',
      calendarItems: [
        { day: 17, title: '기기/상품 확인', kind: 'schedule', icon: 'SIM' },
        { day: 18, title: 'QR 저장', kind: 'schedule', icon: 'QR' },
        { day: 19, title: 'eSIM 설치', kind: 'schedule', icon: '5G' },
        { day: 20, title: '현지 데이터 확인', kind: 'schedule', icon: 'ON' },
      ],
      selectedItems: [
        {
          title: '출국 전 eSIM 프로필 설치',
          meta: 'D-1 · 설정 체크',
          body: '설정에서 eSIM을 추가하고 회선 이름을 일본 여행으로 바꿉니다. 현지 데이터 활성화는 도착 후 진행합니다.',
          checks: ['QR 코드 또는 설치 코드 열기', 'eSIM 프로필 추가', '회선 이름을 일본 여행으로 변경', '현지 데이터는 아직 끄기', '원문/고객센터 링크 저장'],
          primaryAction: '설치 완료',
          secondaryActions: ['D-Day 확인 열기', '메모 수정'],
          statusLabel: '체크 0/5',
        },
      ],
      setupRows: [
        { label: '출국일', value: '2026-06-20' },
        { label: '기기', value: 'iPhone' },
        { label: '일정', value: 'D-3~D-Day' },
      ],
    };
  }

  if (spec.id === 'kids-dino-footprint-art') {
    return {
      surface: 'calendar',
      monthLabel: '2026년 6월',
      startOffset: 1,
      daysInMonth: 30,
      selectedDay: 13,
      selectedDateLabel: '2026-06-13 토요일',
      selectedSummary: '주말 놀이 일정 하나를 누르면 준비물과 놀이 순서 체크가 열립니다.',
      flowViewLabel: '주말 놀이 카드',
      calendarItems: [
        { day: 12, title: '준비물 꺼내기', kind: 'schedule', icon: 'KIT' },
        { day: 13, title: '공룡 발자국 놀이', kind: 'routine', icon: 'ART' },
      ],
      selectedItems: [
        {
          title: '공룡 발자국 미술 놀이',
          meta: '토요일 오전 10시 · 주말 놀이',
          body: '공룡 그림/피규어, 물감 또는 클레이, 종이, 물티슈를 준비하고 발자국 작품을 만듭니다. 아이가 말한 이야기는 한 줄만 남깁니다.',
          checks: ['준비물 모으기', '발자국 찍기', '아이 색 선택 기다리기', '아이 말 한 줄 메모', '작품 말리고 정리'],
          primaryAction: '놀이 완료',
          secondaryActions: ['다음 놀이 고르기', '메모 수정'],
          statusLabel: '체크 0/5',
        },
      ],
      setupRows: [
        { label: '놀이 날짜', value: '2026-06-13' },
        { label: '알림', value: '오전 10시' },
        { label: '기록', value: '한 줄 메모' },
      ],
    };
  }

  if (spec.id === 'banana-peanut-recipe-video') {
    return {
      surface: 'checklist',
      monthLabel: '2026년 6월',
      startOffset: 1,
      daysInMonth: 30,
      selectedDay: 14,
      selectedDateLabel: '2026-06-14 일요일',
      selectedSummary: '요리 날짜에 레시피 체크리스트가 생기고, 상세에는 원본 영상 링크와 조리 메모만 남습니다.',
      flowViewLabel: '요리 체크리스트',
      calendarItems: [
        { day: 14, title: '바나나 땅콩버터 빵', kind: 'decision', icon: 'CK' },
      ],
      selectedItems: [
        {
          title: '바나나 땅콩버터 빵',
          meta: '오후 3시 · 요리 체크',
          body: '바나나, 계란, 땅콩버터, 내열 용기를 준비하고 원본 영상 기준으로 굽습니다. 다음 조리 메모는 한 줄만 남깁니다.',
          checks: ['재료와 용기 준비', '바나나 으깨기', '계란과 땅콩버터 섞기', '원문 영상 기준으로 굽기', '다음 조리 메모 1줄'],
          primaryAction: '요리 완료',
          secondaryActions: ['원본 영상 열기', '메모 수정'],
          statusLabel: '체크 0/5',
        },
      ],
      setupRows: [
        { label: '요리 날짜', value: '2026-06-14' },
        { label: '분량', value: '3개' },
        { label: '알림', value: '오후 3시' },
      ],
    };
  }

  const genericSurface = spec.surface ?? 'calendar';
  const genericSelectedDay = genericSurface === 'sheet' ? 20 : genericSurface === 'decision' ? 12 : 6;
  const genericKind: SimulatedCalendarItem['kind'] = genericSurface === 'sheet' ? 'sheet' : genericSurface === 'decision' || genericSurface === 'checklist' ? 'decision' : 'schedule';
  const genericIcon = genericSurface === 'sheet' ? '▦' : genericSurface === 'decision' || genericSurface === 'checklist' ? '✓' : '•';
  const firstCard = spec.executionCards[0];

  return {
    surface: genericSurface,
    monthLabel: '2026년 6월',
    startOffset: 1,
    daysInMonth: 30,
    selectedDay: genericSelectedDay,
    selectedDateLabel: `2026-06-${String(genericSelectedDay).padStart(2, '0')}`,
    selectedSummary: spec.executionSubtitle,
    flowViewLabel: spec.resultTitle,
    calendarItems: spec.executionCards.slice(0, 4).map((card, index) => ({
      day: Math.min(genericSelectedDay + index * 5, 30),
      title: card.title,
      kind: genericKind,
      icon: genericIcon,
    })),
    selectedItems: [
      {
        title: spec.detailTitle,
        meta: spec.detailMeta,
        body: spec.detailMemo,
        checks: spec.detailChecks,
        primaryAction: spec.primaryAction,
        secondaryActions: spec.secondaryActions,
        statusLabel: `체크 0/${Math.max(spec.detailChecks.length, 1)}`,
      },
    ],
    setupRows: spec.fields.slice(0, 3).map((field) => ({
      label: field.label,
      value: field.value || firstCard?.meta || '사용자 입력',
    })),
  };
}

function ExecutionView({ candidate, audit, spec }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit; spec: ExperienceSpec }) {
  const simulation = getSimulatedFlowExecution(spec);
  const selectedItem = simulation.selectedItems[0];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white" data-testid="content-flow-execution-simulator">
      <div className="hidden border-b border-slate-200 p-4 sm:block">
        <p className="text-xs font-black text-blue-700">저장 후 My Flow 실행 시뮬레이션</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-black tracking-normal">{candidate.title}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{simulation.selectedSummary}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
            {simulation.setupRows.map((row) => (
              <SmallStat key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-0 shadow-sm md:rounded-[28px] md:border-slate-300 md:bg-slate-950 md:p-2">
          <div className="overflow-hidden rounded-2xl bg-white md:rounded-[22px]">
            <div className="hidden border-b border-slate-200 p-4 sm:block">
              <p className="text-xs font-black text-slate-500">내 실행 공간</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xl font-black">내 Flow</h4>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{simulation.flowViewLabel}</p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{patternLabel[audit.pattern]}</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 text-center text-xs font-black">
                {['오늘', '캘린더', 'Flow', '루틴'].map((tab) => (
                  <span key={tab} className={`rounded-lg px-2 py-2 ${tab === '캘린더' ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600'}`}>
                    {tab}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 sm:p-4">
              <div className="mb-2 rounded-xl border border-blue-100 bg-blue-50 p-2.5 sm:hidden">
                <p className="text-xs font-black text-blue-700">저장 후 실행 화면</p>
                <p className="mt-1 text-sm font-bold leading-5 text-blue-950">{simulation.selectedSummary}</p>
              </div>
              {simulation.surface === 'sheet' ? <SimulatedSheetSurface simulation={simulation} spec={spec} /> : null}
              {simulation.surface === 'checklist' ? <SimulatedChecklistSurface simulation={simulation} /> : null}
              {simulation.surface === 'decision' ? <SimulatedDecisionSurface simulation={simulation} /> : null}
              {simulation.surface !== 'calendar' ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black text-slate-500">캘린더 알림</p>
                  <p className="mt-1 text-sm font-bold text-slate-700">
                    {simulation.selectedDateLabel}에 실행 알림이 연결됩니다.
                  </p>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black">이전</button>
                <div className="text-center">
                  <p className="text-lg font-black">{simulation.monthLabel}</p>
                  <p className="text-xs font-semibold text-slate-500">날짜를 누르면 그날의 실행 항목이 열립니다.</p>
                </div>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-black">다음</button>
              </div>

              <SimulatedMonthCalendar simulation={simulation} />

              <section className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-3" data-testid="content-flow-selected-day-panel">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-blue-700">선택한 날짜</p>
                    <h5 className="mt-1 text-lg font-black">{simulation.selectedDateLabel}</h5>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700">{simulation.selectedItems.length}개</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {simulation.selectedItems.map((item) => (
                    <div key={item.title} className="rounded-xl border border-blue-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-blue-700">{item.meta}</p>
                          <h6 className="mt-1 text-base font-black">{item.title}</h6>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">{item.statusLabel}</span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {item.checks.slice(0, 3).map((check) => (
                          <label key={check} className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-2 text-xs font-bold">
                            <input type="checkbox" readOnly />
                            <span>{check}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {spec.executionCards.length > simulation.calendarItems.length ? (
                <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-3" data-testid="content-flow-full-timeline-list">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black text-slate-500">전체 Flow 일정</p>
                      <h5 className="mt-1 text-base font-black">{spec.executionCards.length}단계 타임라인</h5>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{destinationLabel[candidate.destination]}</span>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {spec.executionCards.map((card) => (
                      <div key={`${card.meta}-${card.title}`} className="grid grid-cols-[76px_minmax(0,1fr)] gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                        <span className="text-xs font-black text-blue-700">{card.meta}</span>
                        <div>
                          <p className="text-sm font-black leading-5 text-slate-950">{card.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-600">{card.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="content-flow-detail-sheet-preview">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black text-blue-700">날짜 item 상세</p>
              <h4 className="mt-1 text-xl font-black">{selectedItem.title}</h4>
              <p className="mt-1 text-sm font-bold text-slate-500">{selectedItem.meta}</p>
            </div>
            <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black">수정</button>
          </div>
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{selectedItem.body}</p>
          <div className="mt-4 grid gap-2">
            {selectedItem.checks.map((check, index) => (
              <label key={check} className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold">
                <input className="mt-1" type="checkbox" defaultChecked={index === 0 && spec.id === 'used-car-buying-check'} readOnly />
                <span>{check}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-2">
            <button type="button" className="min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-black text-white">
              {selectedItem.primaryAction}
            </button>
            <div className="grid grid-cols-2 gap-2">
              {selectedItem.secondaryActions.slice(0, 2).map((action) => (
                <button key={action} type="button" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700">
                  {action}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-black text-amber-900">출처/주의</p>
            <p className="mt-1 text-sm leading-6 text-amber-950">{spec.sourceNote}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}

function SimulatedSheetSurface({ simulation, spec }: { simulation: SimulatedFlowExecution; spec: ExperienceSpec }) {
  const columns = spec.tableColumns ?? ['항목', '주기', '마지막 기록', '다음 기준', '상태'];
  const rows = spec.tableRows ?? [];

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3" data-testid="content-flow-sheet-surface">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-emerald-700">관리 시트</p>
          <h5 className="mt-1 text-lg font-black text-emerald-950">{simulation.flowViewLabel}</h5>
          <p className="mt-1 text-sm leading-6 text-emerald-900">행마다 마지막 기록과 다음 실행일을 관리합니다.</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-emerald-700">{rows.length}행</span>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-white">
        <div className="grid grid-cols-5 bg-emerald-50 text-[11px] font-black text-emerald-800">
          {columns.slice(0, 5).map((column) => (
            <div key={column} className="border-r border-emerald-100 p-2 last:border-r-0">{column}</div>
          ))}
        </div>
        {rows.slice(0, 3).map((row) => (
          <div key={row.cells.join('-')} className="grid grid-cols-5 border-t border-emerald-100 text-[11px] font-bold text-slate-700">
            {row.cells.slice(0, 5).map((cell) => (
              <div key={cell} className="min-h-10 border-r border-emerald-50 p-2 last:border-r-0">{cell}</div>
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-blue-200 bg-white p-3">
        <p className="text-xs font-black text-blue-700">다가온 실행</p>
        <p className="mt-1 text-sm font-black">{simulation.selectedItems[0]?.title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-600">{simulation.selectedItems[0]?.meta}</p>
      </div>
    </section>
  );
}

function SimulatedChecklistSurface({ simulation }: { simulation: SimulatedFlowExecution }) {
  const item = simulation.selectedItems[0];

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-3" data-testid="content-flow-checklist-surface">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-blue-700">실행 체크리스트</p>
          <h5 className="mt-1 text-lg font-black text-blue-950">{item.title}</h5>
          <p className="mt-1 text-sm leading-6 text-blue-900">{item.body}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-blue-700">{item.statusLabel}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {item.checks.map((check) => (
          <label key={check} className="flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-sm font-bold">
            <input type="checkbox" readOnly />
            <span>{check}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
        <button type="button" className="min-h-11 rounded-xl bg-blue-700 px-3 text-sm font-black text-white">
          {item.primaryAction}
        </button>
        <button type="button" className="min-h-11 rounded-xl border border-blue-200 bg-white px-3 text-sm font-black text-blue-800">
          {item.secondaryActions[1] ?? '메모'}
        </button>
      </div>
    </section>
  );
}

function SimulatedDecisionSurface({ simulation }: { simulation: SimulatedFlowExecution }) {
  const item = simulation.selectedItems[0];

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-3" data-testid="content-flow-decision-surface">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-amber-700">현장 결정 체크</p>
          <h5 className="mt-1 text-lg font-black text-amber-950">{item.title}</h5>
          <p className="mt-1 text-sm leading-6 text-amber-900">{item.body}</p>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-amber-700">{item.statusLabel}</span>
      </div>
      <div className="mt-3 grid gap-2">
        {item.checks.map((check) => (
          <label key={check} className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 text-sm font-bold">
            <input type="checkbox" readOnly />
            <span>{check}</span>
          </label>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[item.primaryAction, ...item.secondaryActions].slice(0, 3).map((action, index) => (
          <button
            key={action}
            type="button"
            className={`min-h-11 rounded-xl px-2 text-xs font-black ${
              index === 0 ? 'bg-blue-700 text-white' : index === 1 ? 'border border-amber-300 bg-white text-amber-800' : 'border border-red-200 bg-white text-red-700'
            }`}
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  );
}

function SimulatedMonthCalendar({ simulation }: { simulation: SimulatedFlowExecution }) {
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = index - simulation.startOffset + 1;
    return day >= 1 && day <= simulation.daysInMonth ? day : null;
  });
  const itemsByDay = simulation.calendarItems.reduce<Record<number, SimulatedCalendarItem[]>>((groups, item) => {
    groups[item.day] = [...(groups[item.day] ?? []), item];
    return groups;
  }, {});

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white" data-testid="content-flow-simulated-calendar">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-black text-slate-500">
        {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
          <div key={day} className="border-r border-slate-200 py-2 last:border-r-0">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          const dayItems = day ? itemsByDay[day] ?? [] : [];
          const selected = day === simulation.selectedDay;
          return (
            <button
              key={`${index}-${day ?? 'empty'}`}
              type="button"
              className={`min-h-[78px] border-r border-b border-slate-100 p-1.5 text-left last:border-r-0 ${selected ? 'bg-blue-50 ring-2 ring-inset ring-blue-600' : day ? 'bg-white' : 'bg-slate-50 text-slate-300'}`}
              data-selected={selected ? 'true' : undefined}
              disabled={!day}
            >
              {day ? (
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-black ${selected ? 'bg-blue-700 text-white' : 'text-slate-700'}`}>
                  {day}
                </span>
              ) : (
                <span className="inline-flex h-6 min-w-6" aria-hidden="true" />
              )}
              <div className="mt-1 grid gap-1">
                {dayItems.slice(0, 2).map((item) => (
                  <span key={`${item.day}-${item.title}`} className={`flex items-center gap-1 rounded-md border px-1.5 py-1 text-[11px] font-black leading-tight ${item.kind === 'routine' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : item.kind === 'decision' ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-800'}`}>
                    <span aria-hidden="true">{item.icon}</span>
                    <span className="truncate">{item.title}</span>
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DetailSheetView({ candidate, audit, spec }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit; spec: ExperienceSpec }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mx-auto max-w-xl overflow-hidden rounded-[28px] border border-slate-300 bg-slate-950 p-3 shadow-sm">
          <div className="rounded-[22px] bg-white">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-blue-700">{patternLabel[audit.pattern]}</p>
                  <h3 className="mt-1 text-2xl font-black tracking-normal">{spec.detailTitle}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{spec.detailMeta}</p>
                </div>
                <button type="button" className="rounded-full border border-slate-200 px-3 py-1 text-xs font-black">
                  수정
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-4">
              <section>
                <p className="text-xs font-black text-slate-500">메모</p>
                <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-700">{spec.detailMemo}</p>
              </section>
              <section>
                <p className="text-xs font-black text-slate-500">체크</p>
                <div className="mt-2 grid gap-2">
                  {spec.detailChecks.map((check) => (
                    <label key={check} className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold">
                      <input className="mt-1" type="checkbox" readOnly />
                      <span>{check}</span>
                    </label>
                  ))}
                </div>
              </section>
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-black text-amber-900">출처/주의</p>
                <p className="mt-1 text-sm leading-6 text-amber-950">{spec.sourceNote}</p>
              </section>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <button type="button" className="min-h-11 rounded-xl bg-blue-700 px-4 text-sm font-black text-white">
                  {spec.primaryAction}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {spec.secondaryActions.slice(0, 2).map((action) => (
                    <button key={action} type="button" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700">
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <aside className="grid gap-3 self-start">
        <InfoBlock title="이 상세 화면으로 판단할 것" body={audit.uiDecision} />
        <InfoBlock title="원문 링크 위치" body={`${candidate.sourceTitle} 링크는 상세 메모 하단 또는 출처 영역에 둡니다.`} />
      </aside>
    </div>
  );
}

function EvidencePanel({ title, items, tone = 'slate' }: { title: string; items: string[]; tone?: 'slate' | 'blue' }) {
  const toneClass = tone === 'blue' ? 'border-blue-100 bg-blue-50' : 'border-slate-200 bg-slate-50';
  return (
    <section className={`rounded-2xl border p-4 ${toneClass}`}>
      <h4 className="text-sm font-black">{title}</h4>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl bg-white p-3 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function SourceToExecutionTrace({ spec, compact = false }: { spec: ExperienceSpec; compact?: boolean }) {
  const traceRows = buildSourceTraceRows(spec).slice(0, compact ? 2 : 4);

  return (
    <section
      className={`mt-4 rounded-2xl border border-blue-200 bg-blue-50 ${compact ? 'p-3' : 'p-4'}`}
      data-testid={compact ? 'content-flow-review-source-trace' : 'content-flow-source-trace'}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-blue-700">원문 → 실행 산출물 대응</p>
          <h4 className={`${compact ? 'text-sm' : 'text-base'} font-black leading-6 text-blue-950`}>
            원문 단서가 실제 카드/상세/저장 결과에 남아 있는지 확인합니다
          </h4>
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-blue-700">{traceRows.length}개 확인</span>
      </div>
      <div className="mt-3 grid gap-2">
        {traceRows.map((row, index) => (
          <div
            key={`${row.source}-${index}`}
            className="grid gap-2 rounded-xl border border-blue-100 bg-white p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
            data-testid="content-flow-source-trace-row"
          >
            <div>
              <p className="text-[11px] font-black uppercase text-slate-400">원문 단서</p>
              <p className="mt-1 text-xs font-bold leading-5 text-slate-700">{row.source}</p>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase text-blue-500">Flow에서 확인</p>
              <p className="mt-1 text-xs font-bold leading-5 text-blue-950">{row.artifact}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildSourceTraceRows(spec: ExperienceSpec) {
  if (spec.sourceTrace?.length) return spec.sourceTrace;

  const maxRows = Math.max(spec.sourceSummary.length, spec.executionCards.length, spec.detailChecks.length, 1);
  return Array.from({ length: Math.min(maxRows, 4) }, (_, index) => {
    const card = spec.executionCards[index];
    const source = spec.sourceSummary[index] ?? card?.body ?? spec.sourceSummary[0] ?? spec.sourceNote;
    const artifact =
      (card ? `${card.meta} · ${card.title} · 완료 기준: ${card.status}. ${card.body}` : undefined) ??
      spec.detailChecks[index] ??
      spec.detailMemo;
    return { source, artifact };
  });
}

function MiniProductCard({ candidate, audit, spec }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit; spec: ExperienceSpec }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-blue-700">서비스 카드 미리보기</p>
      <h4 className="mt-2 text-xl font-black leading-tight">{candidate.title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-600">{spec.resultTitle}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Chip>{destinationLabel[candidate.destination]}</Chip>
        <Chip>{patternLabel[audit.pattern]}</Chip>
        <Chip tone="blue">{audit.exportTarget}</Chip>
      </div>
      <button type="button" className={`mt-4 min-h-11 w-full rounded-xl text-sm font-black ${cardCtaClassFor(candidate)}`}>
        {cardCtaLabelFor(candidate)}
      </button>
    </section>
  );
}

function ServiceRoutine({ spec }: { spec: ExperienceSpec }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-black text-emerald-700">오늘의 실행 카드</p>
        <h4 className="mt-1 text-xl font-black">{spec.executionCards[0]?.title}</h4>
        <p className="mt-2 text-sm leading-6 text-emerald-900">{spec.executionCards[0]?.body}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="min-h-10 rounded-xl bg-emerald-700 text-sm font-black text-white" type="button">
            {spec.primaryAction}
          </button>
          {spec.secondaryActions.slice(0, 2).map((action) => (
            <button key={action} className="min-h-10 rounded-xl border border-emerald-300 bg-white text-sm font-black text-emerald-800" type="button">
              {action}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        {spec.executionCards.map((card) => (
          <ExecutionCard key={card.title} card={card} />
        ))}
      </div>
    </div>
  );
}

function ServiceTimeline({ spec }: { spec: ExperienceSpec }) {
  return (
    <div className="grid gap-3">
      {spec.executionCards.map((card, index) => (
        <div key={card.title} className="grid grid-cols-[82px_minmax(0,1fr)] gap-3">
          <div className="pt-3 text-right text-xs font-black text-blue-700">{card.meta}</div>
          <div className={`rounded-2xl border p-4 ${index === 0 ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-black">{card.title}</h4>
                <p className="mt-1 text-sm leading-6 text-slate-600">{card.body}</p>
              </div>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-slate-600">{card.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ServiceSheet({ spec }: { spec: ExperienceSpec }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-600">
            {(spec.tableColumns ?? ['항목', '일정', '입력', '완료 기준', '상태']).map((column) => (
              <div key={column} className="border-r border-slate-200 p-3 last:border-r-0">
                {column}
              </div>
            ))}
          </div>
          {(spec.tableRows ?? []).map((row) => (
            <div key={row.cells.join('-')} className="grid grid-cols-5 border-b border-slate-100 text-sm last:border-b-0">
              {row.cells.map((cell) => (
                <div key={cell} className="border-r border-slate-100 p-3 last:border-r-0">
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceDecision({ spec }: { spec: ExperienceSpec }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-black text-slate-500">최종 결정</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[spec.primaryAction, ...spec.secondaryActions].slice(0, 3).map((action, index) => (
            <button
              key={action}
              type="button"
              className={`min-h-11 rounded-xl text-sm font-black text-white ${
                index === 0 ? 'bg-emerald-700' : index === 1 ? 'bg-amber-500' : 'bg-red-600'
              }`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-2">
        {spec.executionCards.map((card) => (
          <ExecutionCard key={card.title} card={card} />
        ))}
      </div>
    </div>
  );
}

function ExecutionCard({ card }: { card: ExperienceCard }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-blue-700">{card.meta}</p>
          <h4 className="mt-1 text-base font-black">{card.title}</h4>
          <p className="mt-1 text-sm leading-6 text-slate-600">{card.body}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{card.status}</span>
      </div>
    </div>
  );
}

function FlowPreview({ candidate, audit }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3" data-testid="content-flow-preview" data-pattern={audit.pattern}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-blue-700">적용 UI</p>
          <h3 className="text-lg font-black">{patternLabel[audit.pattern]}</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">{audit.exportTarget}</span>
      </div>
      {audit.pattern === 'timeline' ? <TimelinePreview candidate={candidate} /> : null}
      {audit.pattern === 'routine' ? <RoutinePreview candidate={candidate} audit={audit} /> : null}
      {audit.pattern === 'sheet' ? <SheetPreview candidate={candidate} /> : null}
      {audit.pattern === 'decision' ? <DecisionPreview candidate={candidate} /> : null}
      {audit.pattern === 'study' ? <StudyPreview candidate={candidate} /> : null}
      {audit.pattern === 'challenge' ? <ChallengePreview candidate={candidate} /> : null}
      {audit.pattern === 'checklist' ? <ChecklistPreview candidate={candidate} /> : null}
    </section>
  );
}

function TimelinePreview({ candidate }: { candidate: KoreanFlowContentCandidate }) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-3">
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-200 text-center text-xs">
        {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
          <div key={day} className="border-r border-slate-200 bg-slate-50 py-2 font-black last:border-r-0">
            {day}
          </div>
        ))}
        {candidate.flowItems.slice(0, 4).map((item, index) => (
          <div key={item.title} className="min-h-[92px] border-r border-t border-slate-200 p-1.5 text-left last:border-r-0">
            <div className="font-black text-slate-500">{index + 3}</div>
            <div className={`mt-1 rounded-lg border p-1.5 text-[11px] leading-4 ${index === 0 ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
              <p className="font-black text-blue-700">{item.schedule}</p>
              <p className="line-clamp-2 font-bold text-slate-800">{item.title}</p>
            </div>
          </div>
        ))}
        {Array.from({ length: 10 }).map((_, index) => (
          <div key={`blank-${index}`} className="min-h-[92px] border-r border-t border-slate-200 bg-white p-1.5 text-left last:border-r-0">
            <span className="text-xs font-black text-slate-300">{index + 7}</span>
          </div>
        ))}
      </div>
      <ItemList candidate={candidate} />
    </div>
  );
}

function RoutinePreview({ candidate, audit }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-xs font-black text-emerald-700">다음 실행</p>
        <h3 className="mt-1 text-xl font-black">{candidate.flowItems[0]?.schedule ?? '반복 주기 확인'}</h3>
        <p className="mt-2 text-sm leading-6 text-emerald-900">{audit.focus}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="min-h-10 rounded-xl bg-emerald-700 text-sm font-black text-white" type="button">
            완료
          </button>
          <button className="min-h-10 rounded-xl border border-emerald-300 bg-white text-sm font-black text-emerald-800" type="button">
            보류
          </button>
          <button className="min-h-10 rounded-xl border border-emerald-300 bg-white text-sm font-black text-emerald-800" type="button">
            메모
          </button>
        </div>
      </div>
      <ItemList candidate={candidate} />
    </div>
  );
}

function SheetPreview({ candidate }: { candidate: KoreanFlowContentCandidate }) {
  const columns = sheetColumns(candidate);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-5 border-b border-slate-200 bg-slate-50 text-xs font-black text-slate-600">
            {columns.map((column) => (
              <div key={column} className="border-r border-slate-200 p-2 last:border-r-0">
                {column}
              </div>
            ))}
          </div>
          {candidate.flowItems.slice(0, 4).map((item) => (
            <div key={item.title} className="grid grid-cols-5 border-b border-slate-100 text-xs last:border-b-0">
              <div className="border-r border-slate-100 p-2 font-bold">{item.title}</div>
              <div className="border-r border-slate-100 p-2 text-blue-700">{item.schedule}</div>
              <div className="border-r border-slate-100 p-2 text-slate-600">사용자 입력</div>
              <div className="border-r border-slate-100 p-2 text-slate-600">{item.completion}</div>
              <div className="p-2">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-800">확인 전</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DecisionPreview({ candidate }: { candidate: KoreanFlowContentCandidate }) {
  return (
    <div className="grid gap-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black text-slate-500">후보 A</p>
            <h3 className="text-lg font-black">방문 후 결정 대기</h3>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">보류 가능</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button className="min-h-10 rounded-xl bg-emerald-700 text-sm font-black text-white" type="button">
            구매
          </button>
          <button className="min-h-10 rounded-xl bg-amber-500 text-sm font-black text-white" type="button">
            보류
          </button>
          <button className="min-h-10 rounded-xl bg-red-600 text-sm font-black text-white" type="button">
            거절
          </button>
        </div>
      </div>
      <ItemList candidate={candidate} />
    </div>
  );
}

function StudyPreview({ candidate }: { candidate: KoreanFlowContentCandidate }) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        <SmallStat label="오늘 범위" value={candidate.flowItems[0]?.schedule ?? '1회차'} />
        <SmallStat label="점수" value="입력 전" />
        <SmallStat label="오답" value="0개" />
      </div>
      <ItemList candidate={candidate} />
    </div>
  );
}

function ChallengePreview({ candidate }: { candidate: KoreanFlowContentCandidate }) {
  const items = candidate.flowItems.length >= 8 ? candidate.flowItems.slice(0, 12) : Array.from({ length: 12 }, (_, index) => candidate.flowItems[index % candidate.flowItems.length]);
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className={`min-h-[86px] rounded-xl border p-2 ${index === 0 ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}>
          <p className="text-xs font-black text-blue-700">Day {index + 1}</p>
          <p className="mt-1 line-clamp-2 text-xs font-bold leading-4 text-slate-800">{item.title}</p>
        </div>
      ))}
    </div>
  );
}

function ChecklistPreview({ candidate }: { candidate: KoreanFlowContentCandidate }) {
  return <ItemList candidate={candidate} />;
}

function ItemList({ candidate }: { candidate: KoreanFlowContentCandidate }) {
  return (
    <div className="mt-3 grid gap-2">
      {candidate.flowItems.map((item, index) => (
        <label key={item.title} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2 rounded-xl border border-slate-200 bg-white p-3">
          <input className="mt-1" type="checkbox" readOnly />
          <span>
            <span className="block text-xs font-black text-blue-700">{item.schedule || `Step ${index + 1}`}</span>
            <span className="mt-0.5 block text-sm font-black text-slate-950">{item.title}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">{item.memo}</span>
            <span className="mt-2 block rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-600">완료 기준: {item.completion}</span>
          </span>
        </label>
      ))}
    </div>
  );
}

function SavePanel({ candidate, audit }: { candidate: KoreanFlowContentCandidate; audit: ContentAudit }) {
  return (
    <aside className="self-start rounded-2xl border border-blue-100 bg-blue-50 p-4">
      <p className="text-xs font-black text-blue-700">내 Flow에 저장</p>
      <h3 className="mt-1 text-lg font-black text-blue-950">{candidate.cta}</h3>
      <p className="mt-2 text-sm leading-6 text-blue-900">{audit.focus}</p>
      <div className="mt-3 grid gap-2">
        {candidate.inputs.slice(0, 3).map((input) => (
          <label key={input} className="grid gap-1 text-xs font-black text-blue-900">
            {input}
            <input className="min-h-10 rounded-xl border border-blue-200 bg-white px-3 text-sm font-normal text-slate-700" placeholder="입력" readOnly />
          </label>
        ))}
      </div>
      <button type="button" data-testid="content-flow-save-simulation" className="mt-3 min-h-11 w-full rounded-xl bg-blue-700 px-4 text-sm font-black text-white">
        {audit.exportTarget}로 저장
      </button>
      <p className="mt-2 text-xs leading-5 text-blue-800">저장 후 My Flow의 오늘/캘린더/Flow 탭에서 실행하는 상태를 가정합니다.</p>
    </aside>
  );
}

function ReviewPanel({
  candidate,
  audit,
  spec,
  review,
  saveMessage,
  onChange,
  onSave,
}: {
  candidate: KoreanFlowContentCandidate;
  audit: ContentAudit;
  spec: ExperienceSpec;
  review: ReviewState;
  saveMessage: string;
  onChange: (review: ReviewState) => void;
  onSave: () => void;
}) {
  const traceStrength = traceStrengthFor(candidate);
  const userReview = userReviewFor(candidate);
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-4 xl:self-start">
      <h3 className="text-lg font-black">활용 가능성 평가</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">원문을 본 사용자가 이 Flow를 저장하고 실제로 실행할 수 있는지 남깁니다.</p>
      {traceStrength === 'weak' ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3" data-testid="content-flow-hold-review-note">
          <p className="text-xs font-black text-red-700">보류 판정</p>
          <p className="mt-1 text-sm font-bold leading-6 text-red-950">{userReview?.sourceIssue ?? '원문과 실행 산출물 연결이 약해 현재 저장 후보로 보기 어렵습니다.'}</p>
        </div>
      ) : null}
      {traceStrength === 'needs_review' ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3" data-testid="content-flow-conditional-review-note">
          <p className="text-xs font-black text-amber-700">조건부 검토</p>
          <p className="mt-1 text-sm font-bold leading-6 text-amber-950">{userReview?.uxAction ?? '저장 전 원문과 실행 범위를 다시 확인해야 합니다.'}</p>
        </div>
      ) : null}
      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs font-black text-blue-800">최우선 판정 질문</p>
        <p className="mt-1 text-sm font-black leading-6 text-blue-950">
          원문을 읽고 저장한 뒤, 생성된 캘린더/체크리스트/시트/메모만 보고도 다음 행동을 할 수 있는가?
        </p>
      </div>
      <SourceToExecutionTrace spec={spec} compact />
      <div className="mt-3 grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
        <p>
          <span className="font-black text-slate-950">원문 근거</span>
          <span className="ml-1">원문의 순서, 주기, 조건, 판단 지점이 실행 항목에 남아 있는가</span>
        </p>
        <p>
          <span className="font-black text-slate-950">저장 판단</span>
          <span className="ml-1">최소 입력만으로 {audit.exportTarget}에 저장 가능한가</span>
        </p>
        <p>
          <span className="font-black text-slate-950">실행 판단</span>
          <span className="ml-1">날짜나 항목을 누르면 체크리스트와 완료 기준이 보이는가</span>
        </p>
        <p>
          <span className="font-black text-slate-950">추측 여부</span>
          <span className="ml-1">사용자가 원문 의미를 다시 해석하지 않아도 되는가</span>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            type="button"
            data-testid={`content-flow-rating-${score}`}
            onClick={() => onChange({ rating: score })}
            className={`min-h-10 rounded-xl border text-sm font-black ${
              review.rating === score ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-700">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(review.keep)} onChange={(event) => onChange({ keep: event.target.checked })} />
          원문 보고 바로 쓸 수 있음
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={Boolean(review.issue)} onChange={(event) => onChange({ issue: event.target.checked })} />
          원문 대비 실행이 막힘
        </label>
      </div>
      <textarea
        className="mt-3 min-h-32 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
        value={review.memo ?? ''}
        onChange={(event) => onChange({ memo: event.target.value })}
        placeholder="원문에서 빠진 실행 단서, 생성된 캘린더/체크리스트/시트/메모에서 막히는 지점, 줄여야 할 입력"
      />
      <button type="button" data-testid="content-flow-review-save" onClick={onSave} className="mt-2 min-h-11 w-full rounded-xl bg-blue-700 px-4 text-sm font-black text-white">
        활용 평가 저장
      </button>
      <p className="mt-2 min-h-5 text-xs text-slate-500">{saveMessage || `${candidate.title} · ${patternLabel[audit.pattern]}`}</p>
    </aside>
  );
}

function InfoBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function Chip({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'blue' | 'red' }) {
  const toneClass = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
  }[tone];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${toneClass}`}>{children}</span>;
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black">{value}</p>
    </div>
  );
}

function sheetColumns(candidate: KoreanFlowContentCandidate) {
  if (candidate.id.includes('filter') || candidate.id.includes('maintenance')) return ['항목', '주기', '마지막 기록', '다음 기준', '상태'];
  if (candidate.id.includes('baby-food')) return ['주차', '식단/재료', '반응 메모', '다음 재료', '상태'];
  if (candidate.id.includes('reading')) return ['책/항목', '일정', '읽은 상태', '다음 후보', '상태'];
  if (candidate.id.includes('budget')) return ['분류', '일정', '금액', '다음 달 조정', '상태'];
  return ['항목', '일정', '사용자 입력', '완료 기준', '상태'];
}
