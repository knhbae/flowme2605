'use client';

import type { EventClickArg, EventContentArg, EventDropArg, EventMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import koLocale from '@fullcalendar/core/locales/ko';
import type { DateClickArg } from '@fullcalendar/interaction';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArtifactWorkbench } from './ArtifactWorkbench';
import { ArtifactPreview } from './ArtifactPreview';
import { PlatformNav } from './PlatformNav';
import { addDays, formatDate, formatKoreanShortDate, getRangeEnd } from '@/lib/flow/date';
import { inferPrimaryDestination } from '@/lib/flow/destination';
import { getRepresentativeFlowSlugs, normalizeExecutionModel, type FlowExportTarget } from '@/lib/flow/execution-model';
import { buildCalendarIcs, buildIcsCalendar, buildText, buildWorkbookSheets, buildXlsxBuffer } from '@/lib/flow/export';
import { FLOW_EXPORT_FEEDBACK, FLOW_EXPORT_LABELS } from '@/lib/flow/export-labels';
import { FLOW_ENTRY_DETAIL_CTA_LABEL, toContentDisplayTitle, toUserFacingMapTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';
import {
  buildMyFlowStepIcs,
  buildMyFlowStepPortableText,
  canBuildMyFlowStepIcs,
  type MyFlowPortableStepExportInput,
} from '@/lib/flow/my-flow-step-export';
import { getCreatorChannelSummaries } from '@/lib/flow/creator-channel-preview';
import { getSourceFitAudit } from '@/lib/flow/source-fit';
import {
  assessSourceBackedFlowMapUpdate,
  buildSourceBackedFlowMapPersistenceRecord,
  buildSourceBackedFlowMapSavedSnapshot,
  buildSourceBackedFlowMapPublishPackage,
  getCuratedSourceAppSeedFlowMaps,
  getSourceBackedHomepageFlowMaps,
  getSourceBackedMyFlowMapForBundle,
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
  mergeSourceBackedMyFlowBundles,
  type SourceBackedFlowMapUpdateAssessment,
  type SourceBackedFlowMapSavedSnapshot,
} from '@/lib/flow/source-backed-my-flow';
import { parseTextFlow, serializeTextFlow, timingLabel } from '@/lib/flow/parser';
import { expandRoutineOccurrences, getRoutineWeekdayLabels } from '@/lib/flow/recurrence';
import {
  clearFlowLocalProgress,
  type ActiveFlowProgress,
  getBundles,
  getActiveFlowProgress,
  getChecks,
  getComparisonState,
  getItemStates,
  getMyFlowStepItemChecks,
  getReactionLogs,
  getSavedFlowMapIndexByFlowSlug,
  getSavedFlowRecord,
  getStoredAnchor,
  getWorkbenchState,
  hasDismissedStorageNotice,
  cloneSeedBundles,
  dismissStorageNotice,
  saveBundles,
  saveChecks,
  saveComparisonState,
  saveFlowRecord,
  saveItemStates,
  saveMyFlowStepItemChecks,
  saveReactionLogs,
  saveStoredAnchor,
  saveWorkbenchState,
  type MyFlowStepItemChecks,
  type SavedFlowMapSnapshot,
} from '@/lib/flow/storage';
import {
  AnchorType,
  ContentType,
  FlowBundle,
  FlowComparisonState,
  FlowItem,
  FlowItemDetail,
  FlowItemLinkType,
  FlowSection,
  FlowItemState,
  FlowWorkbenchState,
  FlowUser,
  MealSlot,
  PrimaryDestination,
  ReactionLog,
  Recipe,
  RiskLevel,
  StructureType,
} from '@/lib/flow/types';
import { getCurrentUser, getVirtualUser, findVirtualUserByName, findVirtualUserBySlug } from '@/lib/flow/users';

const categoryPresets = [
  {
    label: '이사',
    category: '이사',
    structure_type: 'timeline' as const,
    content_type: 'default' as const,
    anchor_type: 'end_date' as const,
  },
  {
    label: '이유식',
    category: '육아/이유식',
    structure_type: 'phase' as const,
    content_type: 'meal_plan' as const,
    anchor_type: 'start_date' as const,
  },
  {
    label: '홈트',
    category: '운동/홈트',
    structure_type: 'routine' as const,
    content_type: 'default' as const,
    anchor_type: 'start_date' as const,
  },
  {
    label: '이직',
    category: '커리어/이직',
    structure_type: 'checklist' as const,
    content_type: 'default' as const,
    anchor_type: 'none' as const,
  },
];

const riskLabels: Record<RiskLevel, string> = {
  low: '낮은 위험',
  medium: '확인하며 진행',
  medical_sensitive: '의료 주의',
  financial_sensitive: '재정 주의',
};

const riskClasses: Record<RiskLevel, string> = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  medical_sensitive: 'border-red-200 bg-red-50 text-red-800',
  financial_sensitive: 'border-teal-200 bg-teal-50 text-teal-800',
};

const categoryColors: Record<string, string> = {
  이사: '#1264F0',
  '육아/이유식': '#A16207',
  '운동/홈트': '#B91C1C',
  '운동/루틴': '#B91C1C',
  '커리어/이직': '#0F766E',
  '여행/해외': '#7C3AED',
  '여행/여권': '#7C3AED',
  '세금/연말정산': '#4B5563',
  '사업/세무': '#0F766E',
  '공부/시험': '#2563EB',
  '공부/영어': '#0F766E',
  '자동차/구매': '#4B5563',
  '자동차/관리': '#0F766E',
  '자동차/검사': '#4B5563',
  '결혼/준비': '#BE185D',
  '운동/러닝': '#B91C1C',
  '다이어트/습관': '#A16207',
};

const reactionFields: { key: keyof ReactionLog; label: string }[] = [
  { key: 'amount', label: '먹은 양' },
  { key: 'fedAt', label: '먹인 시간' },
  { key: 'skin', label: '피부 반응' },
  { key: 'vomitingOrDiarrhea', label: '구토/설사 여부' },
  { key: 'stool', label: '변 상태' },
  { key: 'sleep', label: '수면 변화' },
  { key: 'preferenceNote', label: '거부/선호 메모' },
];

const mealCalendarOnlySlugs = new Set(['baby-food-menu-recipe']);
const flowCreatorDisplayOverrideSlugs = new Set([
  'baby-food-menu-recipe',
  'real-mofa-overseas-travel-prep',
  'washer-tub-clean-monthly',
  'monstera-care-routine',
  'water-purifier-filter-cycle',
]);
const serviceCatalogFlowSlugs = new Set([
  'jeonse-contract-precheck-docs',
]);
const publicSaveActionFlowSlugs = new Set([
  ...serviceCatalogFlowSlugs,
  'vehicle-inspection-prep',
]);
const publicServiceFlowStatusHiddenSlugs = new Set([
  'moving-d30-basic',
  'washer-tub-clean-monthly',
  'monstera-care-routine',
  'water-purifier-filter-cycle',
  'jeonse-contract-precheck-docs',
  'elementary-school-entry-d30',
  'kids-printable-squishy-craft',
  'remote-help-session-precheck',
  'fridge-cleanout-weekly-plan',
]);

const publicServiceFooterHiddenSlugs = new Set([
  'jeonse-contract-precheck-docs',
]);

const linkTypeLabels: Record<string, string> = {
  official: '공식 링크',
  reference: '참고 자료',
  tool: '도구',
  creator: '제작자 링크',
};

const genericCompletionCriteria = '이 항목을 완료했어요.';

function visibleCompletionCriteria(detail?: FlowItemDetail): string | undefined {
  if (!detail?.completion_criteria || detail.completion_criteria === genericCompletionCriteria) return undefined;
  return detail.completion_criteria;
}

function getItemDetail(bundle: FlowBundle, itemId: string): FlowItemDetail | undefined {
  return bundle.itemDetails?.find((detail) => detail.item_id === itemId);
}

function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

function FlowBadges({ bundle, showStatus = false }: { bundle: FlowBundle; showStatus?: boolean }) {
  const { flow } = bundle;
  const visibleRisk = flow.risk_level && flow.risk_level !== 'low' ? flow.risk_level : undefined;
  return (
    <div className="flex flex-wrap gap-2">
      {showStatus ? (
        <Badge className={flow.status === 'published' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-700'}>
          {flow.status === 'published' ? '공개 Flow' : '초안 Flow'}
        </Badge>
      ) : null}
      {flow.source_url ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">✓ 출처 확인됨</Badge> : null}
      {visibleRisk ? (
        <Badge className={riskClasses[visibleRisk]}>{riskLabels[visibleRisk]}</Badge>
      ) : null}
    </div>
  );
}

function FlowHeroMeta({ bundle, hideAnchorStart = false }: { bundle: FlowBundle; hideAnchorStart?: boolean }) {
  const anchorLabel = getHeroStartLabel(bundle);
  return (
    <div className="mt-4 flex flex-wrap gap-2 text-sm">
      <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-800">{getFlowDurationLabel(bundle)}</span>
      <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold text-slate-800">{getFlowCountLabel(bundle)}</span>
      {!hideAnchorStart ? <span className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">{anchorLabel}</span> : null}
    </div>
  );
}

function FlowMigrationStatus({ bundle }: { bundle: FlowBundle }) {
  if (serviceCatalogFlowSlugs.has(bundle.flow.slug)) return null;
  const model = normalizeExecutionModel(bundle);
  if (model.exposureStatus !== 'migration_candidate') return null;

  return (
    <section className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
      <p className="font-semibold">저장 후 일정과 체크로 이어집니다</p>
      <p className="mt-1">
        전체 항목은 그대로 볼 수 있고, 날짜가 있거나 반복되는 일은 캘린더와 체크 목록에서 이어서 확인할 수 있어요.
      </p>
    </section>
  );
}

function FlowSourceFitStatus({ bundle }: { bundle: FlowBundle }) {
  if (serviceCatalogFlowSlugs.has(bundle.flow.slug)) return null;
  if (publicServiceFlowStatusHiddenSlugs.has(bundle.flow.slug)) return null;

  const audit = getSourceFitAudit(bundle.flow.slug);
  if (!audit || audit.decision === 'keep_representative') return null;

  const isPreviewOnly = audit.decision === 'catalog_preview_only';
  const title = isPreviewOnly ? '원문 확인 중' : '근거 확인 중';
  const body = isPreviewOnly
    ? '저장하기 전에 원문 링크와 실행 항목이 내 상황에 맞는지 한 번 확인하세요.'
    : '실행 항목은 볼 수 있지만, 일부 조건은 원문 기준을 확인하며 사용하는 것이 좋습니다.';

  return (
    <section
      className="mt-4 rounded-2xl border border-[#E7E4DD] bg-[#FAFAF8] p-4 text-sm leading-6 text-[#4A4842]"
      data-decision={audit.decision}
      data-testid="source-fit-status"
    >
      <p className="font-semibold text-[#1B1A17]">{title}</p>
      <p className="mt-1">{body}</p>
    </section>
  );
}

function SourceContentCard({ bundle, className = 'mt-5' }: { bundle: FlowBundle; className?: string }) {
  if (!bundle.flow.source_title && !bundle.flow.source_url) return null;

  const domain = getSourceDomain(bundle.flow.source_url);
  const hideConversionNote = serviceCatalogFlowSlugs.has(bundle.flow.slug);
  const sourceMeta = [
    domain,
    bundle.flow.source_checked_at ? `${formatMyFlowDisplayDate(bundle.flow.source_checked_at)} 확인` : null,
    bundle.flow.updated_at ? `${formatMyFlowDisplayDate(formatDate(new Date(bundle.flow.updated_at)))} 업데이트` : null,
    getSourcePrecisionLabel(bundle),
  ].filter(Boolean);

  return (
    <section data-testid="flow-source-card" className={`${className} rounded-lg border border-slate-200 bg-white p-4 shadow-sm`}>
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700">원문과 근거</p>
              <h2 className="mt-1 break-keep text-base font-semibold text-slate-950">{bundle.flow.source_title ? toUserFacingSourceTitle(bundle.flow.source_title) : '원본 콘텐츠'}</h2>
              <p className="mt-1 break-all text-xs font-semibold text-slate-500">{sourceMeta.join(' · ')}</p>
            </div>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              열기
            </span>
          </div>
        </summary>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="min-w-0">
            {bundle.flow.conversion_note && !hideConversionNote ? <p className="text-sm leading-6 text-slate-600">원문에서 옮긴 방식: {bundle.flow.conversion_note}</p> : null}
        </div>
        {bundle.flow.source_url ? (
          <a className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
            원문 보기
          </a>
        ) : null}
        </div>
      </details>
    </section>
  );
}

function FlowWarningCard({ bundle, className = 'mt-5' }: { bundle: FlowBundle; className?: string }) {
  if (!bundle.flow.warning) return null;

  return (
    <div data-testid="flow-warning-card" className={`${className} rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 shadow-sm`}>
      {bundle.flow.warning}
    </div>
  );
}

const exportTargetLabels: Record<FlowExportTarget, string> = {
  memo: '메모',
  sheet: '시트',
  calendar: '캘린더',
  todo: '투두',
};

function getExportTargetsText(bundle: FlowBundle): string {
  return normalizeExecutionModel(bundle).exportTargets.map((target) => exportTargetLabels[target]).join(' · ');
}

function getFlowPreviewItems(bundle: FlowBundle, count = 3): string[] {
  if (bundle.flow.content_type === 'meal_plan') {
    return (bundle.mealSlots ?? []).slice(0, count).map((slot) => slot.menu_title);
  }

  return bundle.items.slice(0, count).map((item) => item.title);
}

function getPreviewTypeLabel(bundle: FlowBundle): string {
  const model = normalizeExecutionModel(bundle);
  if (model.uxType === 'decision') return '후보 비교 + 현장 체크';
  if (model.uxType === 'routine' || model.uxType === 'program') return '반복 달력';
  if (model.uxType === 'meal_plan') return '식단 달력';
  if (model.uxType === 'timeline') return '월별 달력';
  return '체크리스트';
}

function getPublicFlowKindLabel(bundle: FlowBundle): string {
  if (bundle.flow.slug === 'jeonse-contract-precheck-docs') return '계약 일정 체크';
  if (bundle.flow.content_type === 'meal_plan') return '식단/레시피';
  if (bundle.flow.primary_destination === 'sheet') return '실행 시트';
  if (bundle.flow.primary_destination === 'calendar') return '실행 캘린더';
  if (bundle.flow.primary_destination === 'memo') return '실행 메모';
  return '실행 체크리스트';
}

const destinationSignalLabels: Record<PrimaryDestination, string> = {
  calendar: '캘린더 일정',
  sheet: '시트',
  memo: '메모',
  internal_check: '체크리스트',
  hybrid: '캘린더 + 체크',
};

const representativeReasonBySlug: Record<string, string> = {
  'moving-d30-basic': '이사일 기준으로 D-30부터 당일까지 날짜가 잡힘',
  'jeonse-contract-precheck-docs': '계약일 기준으로 D-3, D-Day, D+1만 남김',
  'elementary-school-entry-d30': '입학일 기준으로 공식 확인과 준비물을 분리',
};

function getCatalogDestinationLabel(bundle: FlowBundle): string {
  const destination = bundle.flow.primary_destination ?? inferPrimaryDestination(bundle);
  return destinationSignalLabels[destination] ?? getPublicFlowKindLabel(bundle);
}

function getCatalogSourceSignal(bundle: FlowBundle): string {
  if (bundle.flow.source_status === 'real' && bundle.flow.source_checked_at) return '출처 확인됨';
  if (bundle.flow.source_status === 'real') return '실제 원문';
  if (bundle.flow.source_url) return '원문 연결';
  return '출처 없음';
}

function getCatalogReason(bundle: FlowBundle): string {
  return representativeReasonBySlug[bundle.flow.slug] ?? `${getCatalogDestinationLabel(bundle)}로 그대로 저장 가능`;
}

type CatalogIntent = 'all' | 'moving' | 'study' | 'family' | 'purchase' | 'routine';

const catalogIntentFilters: { id: CatalogIntent; label: string; terms: string[] }[] = [
  { id: 'all', label: '전체', terms: [] },
  { id: 'moving', label: '이사/계약', terms: ['이사', '계약', '전세', '입주', '웨딩', '결혼'] },
  { id: 'study', label: '공부', terms: ['공부', '학습', '수학', '오픽', '시험', '진도', '독서'] },
  { id: 'family', label: '아이/건강', terms: ['아이', '아기', '영유아', '이유식', '건강', '예방접종', '출생'] },
  { id: 'purchase', label: '구매/생활', terms: ['구매', '신차', '중고차', '차량', '생활', '청소', '냉장고'] },
  { id: 'routine', label: '루틴', terms: ['루틴', '반복', '운동', '홈트', '요일', '매일'] },
];

function normalizeCatalogText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function matchesCatalogQuery(searchText: string, query: string): boolean {
  const normalizedQuery = normalizeCatalogText(query.trim());
  if (!normalizedQuery) return true;
  return normalizeCatalogText(searchText).includes(normalizedQuery);
}

function matchesCatalogIntent(searchText: string, intent: CatalogIntent): boolean {
  if (intent === 'all') return true;
  const filter = catalogIntentFilters.find((item) => item.id === intent);
  if (!filter) return true;
  const normalizedText = normalizeCatalogText(searchText);
  return filter.terms.some((term) => normalizedText.includes(normalizeCatalogText(term)));
}

function getCatalogScaleText(counts: { flows?: number; steps: number; items: number }): string {
  return `할 일 ${counts.steps}개`;
}

function getCatalogFirstTask(previewSteps: string[], fallback: string): string {
  return previewSteps[0] ?? fallback;
}

function getCatalogPromiseText(input: string, artifact: string): string {
  if (input.includes('없음')) return `바로 저장됩니다: ${artifact}`;
  const inputLabel = input.endsWith(' 입력') ? input.slice(0, -3) : input;
  return `${inputLabel}만 넣으면 저장됩니다: ${artifact}`;
}

function isJeonsePrecheckFlow(bundle: FlowBundle): boolean {
  return bundle.flow.slug === 'jeonse-contract-precheck-docs';
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>진행률</span>
        <span>
          {done} / {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full bg-[#2563EB]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function slugify(input: string) {
  const ascii = input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `flow-${Date.now()}`;
}

function getStructureLabel(bundle: FlowBundle): string {
  if (bundle.flow.content_type === 'meal_plan') return '식단·레시피형';
  if (bundle.flow.structure_type === 'timeline') return '날짜 역산형';
  if (bundle.flow.structure_type === 'routine') return '반복 루틴형';
  return '체크리스트형';
}

function getAnchorInputLabel(bundle: FlowBundle): string {
  if (bundle.flow.setup_anchor_label) return bundle.flow.setup_anchor_label;
  if (bundle.flow.anchor_type === 'none') return '날짜 입력 없음';
  if (bundle.flow.anchor_type === 'baby_birth_date') return '아이 생년월일';
  if (bundle.flow.content_type === 'meal_plan') return '이유식 시작일';
  if (bundle.flow.category.includes('건강/검진')) return '검진일';
  if (bundle.flow.category.includes('여행')) return '출국일';
  if (bundle.flow.category.includes('결혼')) return '예식일';
  if (bundle.flow.category.includes('공부/시험') || bundle.flow.category.includes('시험') || bundle.flow.category.includes('자격증')) return '시험일';
  if (bundle.flow.category.includes('자동차/관리')) return '관리 시작일';
  if (bundle.flow.category.includes('이사')) return '이사일';
  if (bundle.flow.category.includes('운동') || bundle.flow.category.includes('러닝')) return '운동 시작일';
  return bundle.flow.anchor_type === 'end_date' ? '목표일' : '시작일';
}

function getAnchorLabel(bundle: FlowBundle): string {
  if (bundle.flow.anchor_type === 'none') return '기준값 없음';
  return `${getAnchorInputLabel(bundle)} 입력`;
}

function getSetupStepTitle(bundle: FlowBundle): string {
  if (isJeonsePrecheckFlow(bundle)) return '계약일만 넣기';
  if (bundle.flow.anchor_type === 'none') return `1. ${bundle.flow.setup_anchor_label ?? '바로 확인'}`;
  return `1. ${getAnchorInputLabel(bundle)} 입력하기`;
}

function getSetupStepDescription(bundle: FlowBundle): string {
  if (bundle.flow.anchor_type === 'none') {
    if (bundle.flow.primary_destination === 'sheet') return '날짜 입력 없이 표에 필요한 값을 바로 채웁니다.';
    if (bundle.flow.slug === 'used-car-buying-check') return '날짜 입력 없이 현장 체크리스트를 바로 엽니다.';
    return '날짜 입력 없이 바로 확인합니다.';
  }
  return `입력할 날짜: ${getAnchorInputLabel(bundle)}`;
}

function getSetupStepHelp(bundle: FlowBundle): string {
  if (isJeonsePrecheckFlow(bundle)) return 'D-3, D-Day, D+1 일정으로 바로 보여줍니다.';
  if (bundle.flow.setup_anchor_hint) return bundle.flow.setup_anchor_hint;
  if (bundle.flow.anchor_type === 'none') return '이 Flow는 날짜 입력이 필요 없는 체크리스트입니다.';
  return `${getAnchorInputLabel(bundle)} 기준으로 날짜가 계산됩니다.`;
}

function hasDatedCalendarSchedule(bundle: FlowBundle): boolean {
  if (bundle.mealSlots?.some((slot) => slot.day_offset !== undefined)) return true;
  return bundle.items.some((item) => item.day_offset !== undefined);
}

function hasCalendarSchedule(bundle: FlowBundle): boolean {
  return hasDatedCalendarSchedule(bundle) || bundle.flow.structure_type === 'routine' || isFitnessExactVideoFlow(bundle);
}

function getFlowResultText(bundle: FlowBundle): string {
  if (bundle.flow.description) return bundle.flow.description;
  if (bundle.flow.structure_type === 'timeline') return '목표 날짜를 기준으로 해야 할 일을 순서대로 실행합니다.';
  if (bundle.flow.structure_type === 'routine') return '정해진 요일과 반복 규칙에 맞춰 루틴을 체크합니다.';
  if (bundle.flow.content_type === 'meal_plan') return '시작일 기준 식단표와 레시피를 확인하고 필요한 메모만 남깁니다.';
  return '단계별 확인 항목을 하나씩 실행합니다.';
}

function getFlowItemCount(bundle: FlowBundle): number {
  return bundle.flow.content_type === 'meal_plan' ? bundle.mealSlots?.length ?? 0 : bundle.items.length;
}

function getFlowPreviewStepTitles(bundle: FlowBundle, limit = 3): string[] {
  return bundle.items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => item.title)
    .filter(Boolean)
    .slice(0, limit);
}

function getFlowDurationLabel(bundle: FlowBundle): string {
  if (bundle.flow.content_type === 'meal_plan') return '첫 식단표 기준';
  if (bundle.flow.structure_type === 'routine') return bundle.repeatRules?.[1]?.replace('@', '') ?? bundle.repeatRules?.[0]?.replace('@', '') ?? '반복 실행';
  if (bundle.flow.slug === 'water-purifier-filter-cycle') return '필터 주기표';
  if (bundle.flow.primary_destination === 'sheet') return '시트 우선';
  const offsets = bundle.items.map((item) => item.day_offset).filter((value): value is number => value !== undefined);
  if (!offsets.length) return '체크리스트';
  const min = Math.min(...offsets);
  const max = Math.max(...offsets);
  if (min < 0 && max <= 0) {
    const days = Math.abs(min);
    if (days >= 90 && days % 30 === 0) return `평균 소요 ${days / 30}개월`;
    return `평균 소요 ${days}일`;
  }
  return `${max - min + 1}일 흐름`;
}

function formatCount(value?: number): string {
  return new Intl.NumberFormat('ko-KR').format(value ?? 0);
}

function getSourceDomain(url?: string): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function getCreatorName(bundle: FlowBundle): string {
  if (flowCreatorDisplayOverrideSlugs.has(bundle.flow.slug) && bundle.flow.creator_name) return bundle.flow.creator_name;
  return getCreatorUser(bundle)?.name ?? bundle.flow.creator_name ?? 'FLOW 큐레이션팀';
}

function getCreatorUser(bundle: FlowBundle): FlowUser | undefined {
  return getVirtualUser(bundle.flow.owner_user_id) ?? findVirtualUserByName(bundle.flow.creator_name);
}

function getCreatorRole(bundle: FlowBundle): string | undefined {
  if (flowCreatorDisplayOverrideSlugs.has(bundle.flow.slug) && bundle.flow.creator_role) return bundle.flow.creator_role;
  return getCreatorUser(bundle)?.role ?? bundle.flow.creator_role;
}

function getCreatorNote(bundle: FlowBundle): string | undefined {
  if (flowCreatorDisplayOverrideSlugs.has(bundle.flow.slug) && bundle.flow.creator_note) return bundle.flow.creator_note;
  return getCreatorUser(bundle)?.bio ?? bundle.flow.creator_note;
}

function getCreatorAvatar(bundle: FlowBundle): string {
  return getCreatorUser(bundle)?.avatar_initial ?? getCreatorName(bundle).slice(0, 1);
}

function getCreatorPath(bundle: FlowBundle): string {
  const user = getCreatorUser(bundle);
  return `/u/${user?.slug ?? creatorSlug(getCreatorName(bundle))}`;
}

function decodeCreatorSlug(value: string): string {
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value;
}

function creatorKey(value: string): string {
  return decodeCreatorSlug(value).trim().toLowerCase().replace(/\s+/g, '-');
}

function creatorSlug(name: string): string {
  return creatorKey(name);
}

function normalizeCreatorSlug(slug: string): string {
  return creatorKey(slug);
}

function getFlowTags(bundle: FlowBundle): string[] {
  return bundle.flow.tags ?? [];
}

function cloneBundleForEditing(bundle: FlowBundle): FlowBundle {
  const id = `flow-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const copied = JSON.parse(JSON.stringify(bundle)) as FlowBundle;

  return {
    ...copied,
    flow: {
      ...copied.flow,
      id,
      slug: `${copied.flow.slug}-copy-${Date.now()}`,
      title: `${copied.flow.title} 사본`,
      status: 'draft',
      raw_text: copied.flow.raw_text ?? serializeTextFlow(copied.sections, copied.items, copied.itemDetails, copied.warnings),
      owner_user_id: getCurrentUser().id,
      creator_name: getCurrentUser().name,
      creator_role: getCurrentUser().role,
      creator_note: getCurrentUser().bio,
      usage_count: 0,
      copy_count: 0,
      created_at: now,
      updated_at: now,
    },
    sections: copied.sections.map((section) => ({ ...section, flow_id: id })),
    items: copied.items.map((item) => ({ ...item, flow_id: id })),
    mealSlots: copied.mealSlots?.map((slot) => ({ ...slot, flow_id: id })),
    recipes: copied.recipes?.map((recipe) => ({ ...recipe, flow_id: id })),
  };
}

function FlowCard({
  bundle,
  variant = 'default',
  editable = false,
  onCopy,
}: {
  bundle: FlowBundle;
  variant?: 'default' | 'compact';
  editable?: boolean;
  onCopy?: (bundle: FlowBundle) => void;
}) {
  const displayTitle = toContentDisplayTitle(bundle.flow.title);
  const count = getFlowItemCount(bundle);
  const color = categoryColors[bundle.flow.category] ?? '#6B7280';
  const previewItems = getFlowPreviewItems(bundle, variant === 'compact' ? 3 : 4);

  return (
    <article className="flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium text-gray-600">{bundle.flow.category}</span>
          <Badge className="border-gray-200 bg-gray-50 text-gray-600">{getStructureLabel(bundle)}</Badge>
          <Badge
            className={
              bundle.flow.source_status === 'real'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : bundle.flow.source_status === 'preview'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
            }
          >
            {getSourceStatusLabel(bundle)}
          </Badge>
        </div>
        <div>
          <h2 className="text-lg font-semibold leading-snug text-gray-950">
            <Link className="underline-offset-4 hover:text-blue-700 hover:underline" href={`/f/${bundle.flow.slug}`}>
              {displayTitle}
            </Link>
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">{getFlowResultText(bundle)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
              {getCreatorAvatar(bundle)}
            </span>
            <Link className="font-medium underline-offset-2 hover:text-blue-700 hover:underline" href={getCreatorPath(bundle)}>
              by {getCreatorName(bundle)}
            </Link>
            <span>베타 운영 중</span>
            <span>{count}개 항목</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {getFlowTags(bundle).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
              #{tag}
            </span>
          ))}
        </div>
        <div className="rounded-md border border-gray-100 bg-[#FAFAF8] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-gray-500">미리보기</p>
            <span className="text-xs font-semibold text-blue-700">{getPreviewTypeLabel(bundle)}</span>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-gray-700">
            {previewItems.map((item) => (
              <li key={item} className="line-clamp-1">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs font-semibold text-gray-500">출력: {getExportTargetsText(bundle)}</p>
        </div>
        {variant === 'default' ? <p className="text-sm font-medium text-gray-600">{getAnchorLabel(bundle)}</p> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white" href={`/f/${bundle.flow.slug}`}>
          시작하기
        </Link>
        {editable ? (
          <Link className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800" href={`/flows/${bundle.flow.id}/edit`}>
            편집하기
          </Link>
        ) : onCopy ? (
          <button className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800" onClick={() => onCopy?.(bundle)}>
            내 버전 만들기
          </button>
        ) : null}
      </div>
    </article>
  );
}

function DirectoryFlowCard({ bundle }: { bundle: FlowBundle }) {
  const displayTitle = toContentDisplayTitle(bundle.flow.title);
  const previewStepTitles = getFlowPreviewStepTitles(bundle);
  const count = getFlowItemCount(bundle);
  const input = getAnchorLabel(bundle);
  const artifact = getCatalogDestinationLabel(bundle);
  const firstTask = getCatalogFirstTask(previewStepTitles, getCatalogReason(bundle));
  const promise = getCatalogPromiseText(input, artifact);

  return (
    <Link
      data-testid="single-flow-catalog-card"
      aria-label={displayTitle}
      className="block h-full rounded-2xl border border-[#E7E4DD] bg-white p-3.5 transition hover:border-[#3654FF]/40 hover:shadow-[0_8px_24px_rgba(27,26,23,0.06)]"
      href={`/f/${bundle.flow.slug}`}
    >
      <article className="flex h-full min-w-0 flex-col justify-between gap-2.5">
        <div>
          <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#8A857B]">
            <span className="min-w-0 truncate">{bundle.flow.category}</span>
            <span data-testid="flow-card-support-meta" className="shrink-0 text-[#8A857B]">
              체크 {count}개
            </span>
          </div>
          <h3 className="mt-2 break-keep text-base font-semibold leading-snug text-[#1B1A17] sm:text-lg">{displayTitle}</h3>
          <p className="mt-1 break-keep text-sm font-semibold leading-5 text-[#3654FF]">{promise}</p>
          <div className="mt-2 rounded-xl bg-[#FAFAF8] px-3 py-2">
            <p className="line-clamp-1 text-sm font-semibold text-[#1B1A17]">
              <span className="mr-1 text-[11px] text-[#6E6B64]">먼저 할 일</span>
              {firstTask}
            </p>
          </div>
        </div>
        <div className="pt-1 text-sm">
          <span
            data-testid="flow-card-primary-action"
            className="inline-flex items-center gap-1 rounded-lg py-1 text-sm font-semibold text-[#3654FF]"
          >
            {FLOW_ENTRY_DETAIL_CTA_LABEL}
          </span>
          <span aria-hidden="true" className="ml-1 text-[#3654FF]">›</span>
        </div>
      </article>
    </Link>
  );
}

type FlowMapCatalogLink = {
  id: string;
  title: string;
  summary: string;
  categoryLabel: string;
  userFacingStatus: string;
  input: string;
  artifact: string;
  counts: { flows: number; steps: number; items: number; sourceRows?: number };
  recommendedFlowSlug: string;
  recommendedFlowTitle: string;
  sourceUrl: string;
  sourceUrlCount: number;
  sourceSignal: string;
  previewSteps: string[];
  searchText: string;
  sourceKind: string;
};

function getFlowMapCatalogSearchText(item: FlowMapCatalogLink): string {
  return [
    item.title,
    item.summary,
    item.categoryLabel,
    item.userFacingStatus,
    item.input,
    item.artifact,
    item.recommendedFlowTitle,
    item.sourceSignal,
    item.searchText,
    ...item.previewSteps,
  ].join(' ');
}

function getBundleCatalogSearchText(bundle: FlowBundle): string {
  return [
    bundle.flow.title,
    getFlowResultText(bundle),
    bundle.flow.category,
    getStructureLabel(bundle),
    getAnchorLabel(bundle),
    getCatalogDestinationLabel(bundle),
    getCatalogSourceSignal(bundle),
    getCatalogReason(bundle),
    ...getFlowTags(bundle),
    ...getFlowPreviewStepTitles(bundle),
  ].join(' ');
}

function getChildFlowCatalogSearchText(
  childFlows: {
    slug: string;
    title: string;
    destination?: string;
    steps: { title: string; stepTitle?: string; detailItems?: string[] }[];
  }[],
): string {
  return childFlows
    .flatMap((flow) => [
      flow.slug,
      flow.title,
      flow.destination,
      ...flow.steps.flatMap((step) => [step.title, step.stepTitle, ...(step.detailItems ?? [])]),
    ])
    .filter(Boolean)
    .join(' ');
}

function FlowMapCatalogCard({ item }: { item: FlowMapCatalogLink }) {
  const firstTask = getCatalogFirstTask(item.previewSteps, item.recommendedFlowTitle);
  const promise = getCatalogPromiseText(item.input, item.artifact);
  const scaleText = getCatalogScaleText(item.counts);

  return (
    <article
      data-testid="flow-map-catalog-card"
      data-source-kind={item.sourceKind}
      className="flex min-w-0 flex-col rounded-2xl border border-[#E7E4DD] bg-white p-3.5 transition hover:border-[#3654FF]/40 hover:shadow-[0_8px_24px_rgba(27,26,23,0.06)]"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] font-semibold text-[#8A857B]">
        <span className="min-w-0 truncate">{item.categoryLabel}</span>
        <span data-testid="flow-card-support-meta" className="shrink-0 text-[#8A857B]">
          {scaleText}
        </span>
      </div>
      <h3 className="mt-2 break-keep text-base font-semibold leading-snug text-[#1B1A17] sm:text-lg">{item.title}</h3>
      <p className="mt-1 break-keep text-sm font-semibold leading-5 text-[#3654FF]">{promise}</p>
      <div className="mt-2 rounded-xl bg-[#FAFAF8] px-3 py-2">
        <p className="line-clamp-1 text-sm font-semibold text-[#1B1A17]">
          <span className="mr-1 text-[11px] text-[#6E6B64]">먼저 할 일</span>
          {firstTask}
        </p>
      </div>
      <div className="mt-auto pt-3">
        <Link
          data-testid="flow-map-detail-link"
          className="inline-flex items-center gap-1 rounded-lg py-1 text-sm font-semibold text-[#3654FF] hover:text-[#2945E8]"
          href={`/flow-maps/${item.id}`}
        >
          <span data-testid="flow-card-primary-action">{FLOW_ENTRY_DETAIL_CTA_LABEL}</span>
          <span aria-hidden="true">›</span>
        </Link>
      </div>
    </article>
  );
}

function isPublicDirectoryBundle(bundle: FlowBundle): boolean {
  return serviceCatalogFlowSlugs.has(bundle.flow.slug);
}

function createEmptyMealBundle({
  id,
  slug,
  title,
  description,
  category,
  anchor_type,
}: {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: string;
  anchor_type: AnchorType;
}): FlowBundle {
  const now = new Date().toISOString();
  return {
    flow: {
      id,
      slug,
      title,
      description,
      category,
      structure_type: 'phase',
      content_type: 'meal_plan',
      anchor_type,
      status: 'draft',
      risk_level: 'medical_sensitive',
      owner_user_id: getCurrentUser().id,
      creator_name: getCurrentUser().name,
      creator_role: getCurrentUser().role,
      creator_note: getCurrentUser().bio,
      usage_count: 0,
      copy_count: 0,
      warning:
        '이 Flow는 제작자 경험 기반의 식단표와 레시피를 시작일 기준으로 정리한 것입니다. 아이의 건강 상태, 알레르기, 시작 시기, 재료 선택은 전문가 또는 공식 정보를 확인하세요.',
      created_at: now,
      updated_at: now,
    },
    sections: [{ id: `${id}-phase-1`, flow_id: id, title: '초기 1단계', order: 0 }],
    items: [],
    mealSlots: [],
    recipes: [],
    warnings: [],
  };
}

function createTextBundle({
  id,
  slug,
  title,
  description,
  category,
  structure_type,
  anchor_type,
  initialText,
}: {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category: string;
  structure_type: StructureType;
  anchor_type: AnchorType;
  initialText?: string;
}): FlowBundle {
  const now = new Date().toISOString();
  const rawText =
    initialText?.trim() ||
    (structure_type === 'timeline'
      ? '# 새 Flow\n\n## D-30\n- 해야 할 일 D-30\n\n## D-Day\n- 당일 확인 D-Day'
      : structure_type === 'routine'
        ? '@주 3회\n\n## 준비\n- 첫 번째 루틴\n\n## 본 루틴\n@2~3세트\n- 반복할 동작'
        : '## 첫 번째 섹션\n- 확인할 일');
  const parsed = parseTextFlow(rawText, id);

  return {
    flow: {
      id,
      slug,
      title,
      description,
      category,
      structure_type,
      content_type: 'default',
      anchor_type,
      status: 'draft',
      owner_user_id: getCurrentUser().id,
      creator_name: getCurrentUser().name,
      creator_role: getCurrentUser().role,
      creator_note: getCurrentUser().bio,
      usage_count: 0,
      copy_count: 0,
      created_at: now,
      updated_at: now,
      raw_text: rawText,
    },
    ...parsed,
  };
}

function useBundles() {
  const [bundles, setBundles] = useState<FlowBundle[]>(() => cloneSeedBundles());
  useEffect(() => setBundles(getBundles()), []);

  const persist = (next: FlowBundle[]) => {
    setBundles(next);
    saveBundles(next);
  };

  return { bundles, persist };
}

export function FlowList() {
  const { bundles } = useBundles();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? '전체';
  const initialTag = searchParams.get('tag') ?? '전체';
  const [category, setCategory] = useState(initialCategory);
  const [tag, setTag] = useState(initialTag);
  const [structure, setStructure] = useState('전체');
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogIntent, setCatalogIntent] = useState<CatalogIntent>('all');
  const directoryBundles = bundles.filter(isPublicDirectoryBundle);
  const showCatalogFilters = directoryBundles.length > 6;
  const categories = ['전체', ...Array.from(new Set(directoryBundles.map((bundle) => bundle.flow.category)))];
  const tags = ['전체', ...Array.from(new Set(directoryBundles.flatMap((bundle) => getFlowTags(bundle))))];
  const structures = ['전체', '날짜 역산형', '반복 루틴형', '체크리스트형', '식단·레시피형'];
  const effectiveCategory = showCatalogFilters ? category : '전체';
  const effectiveTag = showCatalogFilters ? tag : '전체';
  const effectiveStructure = showCatalogFilters ? structure : '전체';
  const filtered = directoryBundles
    .filter((bundle) => {
      const categoryMatched = effectiveCategory === '전체' || bundle.flow.category === effectiveCategory;
      const tagMatched = effectiveTag === '전체' || getFlowTags(bundle).includes(effectiveTag);
      const structureMatched = effectiveStructure === '전체' || getStructureLabel(bundle) === effectiveStructure;
      return categoryMatched && tagMatched && structureMatched;
    })
    .sort((a, b) => {
      if (sort === 'recent') return new Date(b.flow.updated_at).getTime() - new Date(a.flow.updated_at).getTime();
      return (b.flow.usage_count ?? 0) - (a.flow.usage_count ?? 0);
    });
  const visibleFlowMapCatalogLinks = flowMapCatalogLinks.filter((item) => {
    const searchText = getFlowMapCatalogSearchText(item);
    return matchesCatalogQuery(searchText, catalogQuery) && matchesCatalogIntent(searchText, catalogIntent);
  });
  const visibleDirectoryBundles = filtered.filter((bundle) => {
    const searchText = getBundleCatalogSearchText(bundle);
    return matchesCatalogQuery(searchText, catalogQuery) && matchesCatalogIntent(searchText, catalogIntent);
  });
  const visibleCatalogCount = visibleFlowMapCatalogLinks.length + visibleDirectoryBundles.length;
  const totalCatalogCount = flowMapCatalogLinks.length + filtered.length;
  const hasCatalogFilter = catalogQuery.trim().length > 0 || catalogIntent !== 'all';
  return (
    <main className="min-h-screen bg-[#FAFAF8] px-5 py-6 pb-28 md:py-8 md:pb-8">
      <div className="mx-auto max-w-6xl">
      <PlatformNav />
      <section data-testid="flow-map-catalog-section" className="mb-8">
        <div data-testid="flow-catalog-hero" className="mb-3">
          <p className="text-sm font-semibold text-[#6E6B64]">Flow 찾기</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h1 className="break-keep text-2xl font-semibold tracking-tight text-[#1B1A17] sm:text-3xl">무엇을 저장할까요?</h1>
            <span data-testid="flow-catalog-count" className="text-sm font-semibold text-[#8A857B]">
              {hasCatalogFilter ? `${visibleCatalogCount}/${totalCatalogCount}개 콘텐츠` : `${totalCatalogCount}개 콘텐츠`}
            </span>
          </div>
          <p className="mt-1 break-keep text-sm leading-6 text-[#6E6B64]">저장하면 일정과 체크리스트가 생깁니다.</p>
        </div>
        <div className="mb-3 grid gap-2">
          <label>
            <span className="sr-only">검색</span>
            <input
              data-testid="flow-catalog-search"
              className="min-h-11 w-full rounded-xl border border-[#E7E4DD] bg-white px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none placeholder:text-[#A09B91] focus:border-[#3654FF] focus:ring-2 focus:ring-[#3654FF]/10"
              value={catalogQuery}
              onChange={(event) => setCatalogQuery(event.target.value)}
              placeholder="이사, 공부, 식단, 체크리스트"
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="상황별 콘텐츠 필터">
            {catalogIntentFilters.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  catalogIntent === item.id ? 'border-[#1B1A17] bg-[#1B1A17] text-white' : 'border-[#E7E4DD] bg-white text-[#6E6B64]'
                }`}
                aria-pressed={catalogIntent === item.id}
                onClick={() => setCatalogIntent(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {showCatalogFilters ? (
          <div className="mb-4 rounded-2xl border border-[#E7E4DD] bg-white p-4">
            <details className="rounded-xl border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-2">
              <summary className="cursor-pointer text-sm font-semibold text-[#1B1A17]">필터 열기</summary>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#6E6B64]">태그</span>
                  <select className="w-full rounded-xl border border-[#E7E4DD] bg-white px-3 py-2" value={tag} onChange={(event) => setTag(event.target.value)}>
                    {tags.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#6E6B64]">카테고리</span>
                  <select className="w-full rounded-xl border border-[#E7E4DD] bg-white px-3 py-2" value={category} onChange={(event) => setCategory(event.target.value)}>
                    {categories.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#6E6B64]">진행 방식</span>
                  <select className="w-full rounded-xl border border-[#E7E4DD] bg-white px-3 py-2" value={structure} onChange={(event) => setStructure(event.target.value)}>
                    {structures.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#6E6B64]">정렬</span>
                  <select className="w-full rounded-xl border border-[#E7E4DD] bg-white px-3 py-2" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                    <option value="popular">인기순</option>
                    <option value="recent">최신순</option>
                  </select>
                </label>
              </div>
            </details>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#6E6B64]">
              <span>{visibleDirectoryBundles.length}/{filtered.length}개 한 개만 저장</span>
              {tag !== '전체' ? <span className="rounded-full bg-[#EEF1FF] px-2 py-1 font-medium text-[#3654FF]">#{tag}</span> : null}
              {category !== '전체' ? <span className="rounded-full bg-[#FAFAF8] px-2 py-1 font-medium text-[#1B1A17]">{category}</span> : null}
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleFlowMapCatalogLinks.map((item) => (
            <FlowMapCatalogCard key={item.id} item={item} />
          ))}
          {visibleDirectoryBundles.map((bundle) => (
            <DirectoryFlowCard key={bundle.flow.id} bundle={bundle} />
          ))}
        </div>
        {visibleCatalogCount === 0 ? (
          <div className="mt-4 rounded-2xl border border-[#E7E4DD] bg-white p-5 text-sm text-[#6E6B64]">
            <p className="font-semibold text-[#1B1A17]">맞는 콘텐츠가 없습니다.</p>
            <p className="mt-1">검색어나 상황 필터를 줄이면 다시 볼 수 있습니다.</p>
          </div>
        ) : null}
      </section>
      </div>
    </main>
  );
}

function StatCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg bg-gray-50 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`${compact ? 'text-lg' : 'text-2xl'} mt-1 font-semibold text-gray-950`}>{value}</p>
    </div>
  );
}

function getSourceStatusLabel(bundle: FlowBundle) {
  if (bundle.flow.source_status === 'real') return '실제 원본';
  if (bundle.flow.source_status === 'preview') return '샘플 후보';
  if (bundle.flow.source_status === 'needs_review') return '원문 확인';
  return bundle.flow.source_url ? '출처 연결' : '초안';
}

function getSourcePrecisionLabel(bundle: FlowBundle): string | undefined {
  if (bundle.flow.source_precision === 'exact') return '정확한 출처 페이지';
  if (bundle.flow.source_precision === 'broad') return '넓은 출처';
  return undefined;
}

function isFitnessExactVideoFlow(bundle: FlowBundle): boolean {
  return Boolean(bundle.flow.tags?.includes('exact-video') && bundle.flow.source_url?.includes('youtube.com/watch'));
}

function getCreatorBundlePriority(bundle: FlowBundle): number {
  if (bundle.flow.source_status === 'real' && bundle.flow.source_precision === 'exact') return 0;
  if (bundle.flow.source_status === 'real') return 1;
  if (bundle.flow.source_status === 'needs_review') return 2;
  return 3;
}

export function CreatorDirectory() {
  const { bundles } = useBundles();
  const summaries = getCreatorChannelSummaries(bundles);
  const totalFlows = summaries.reduce((sum, item) => sum + item.flow_count, 0);
  const totalRealFlows = summaries.reduce((sum, item) => sum + item.real_flow_count, 0);
  const totalSampleCandidates = summaries.reduce((sum, item) => sum + item.sample_candidate_count, 0);
  const totalSourceReviewFlows = summaries.reduce((sum, item) => sum + item.source_review_count, 0);
  const categories = Array.from(new Set(summaries.flatMap((item) => item.specialty_tags))).slice(0, 10);

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <PlatformNav />
      <header className="border-b border-gray-200 pb-6">
        <p className="text-sm font-semibold text-blue-700">Creator Channels</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">제작자 채널</h1>
        <p className="mt-3 max-w-3xl leading-7 text-gray-600">
          채널별 콘텐츠가 실제 실행 Flow로 얼마나 잘 전환되는지 확인하는 미리보기입니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          <StatCard label="채널" value={`${summaries.length}`} />
          <StatCard label="Flow 후보" value={`${totalFlows}+`} />
          <StatCard label="실제 원본" value={`${totalRealFlows}`} />
          <StatCard label="샘플 후보" value={`${totalSampleCandidates}`} />
          <StatCard label="원본 검토" value={`${totalSourceReviewFlows}`} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {category}
            </span>
          ))}
        </div>
      </header>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((channel) => {
          const representativeFlows = bundles
            .filter((bundle) => bundle.flow.owner_user_id === channel.id)
            .sort((a, b) => getCreatorBundlePriority(a) - getCreatorBundlePriority(b))
            .slice(0, 3);

          return (
          <article
            key={channel.id}
            className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">{channel.channel_type}</p>
                <h2 className="mt-1 text-xl font-semibold">
                  <Link className="underline-offset-4 hover:text-blue-700 hover:underline" href={`/u/${channel.slug}`}>
                    {channel.name}
                  </Link>
                </h2>
                <p className="mt-1 text-sm text-gray-600">{channel.role}</p>
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700">
                {channel.real_flow_count} 실제 · {channel.sample_candidate_count} 샘플
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">{channel.bio}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <StatCard label="실제 원본" value={`${channel.real_flow_count}`} compact />
              <StatCard label="샘플 후보" value={`${channel.sample_candidate_count}`} compact />
              <StatCard label="원본 검토" value={`${channel.source_review_count}`} compact />
            </div>
            <p className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs font-medium leading-5 text-gray-600">
              {channel.next_content_action}
            </p>
            {representativeFlows.length ? (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500">대표 Flow</p>
                <div className="mt-2 space-y-2">
                  {representativeFlows.map((bundle) => (
                    <Link
                      key={bundle.flow.id}
                      className="block rounded-md bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-blue-50 hover:text-blue-700"
                      href={`/f/${bundle.flow.slug}`}
                    >
                      {toContentDisplayTitle(bundle.flow.title)}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
          );
        })}
      </section>
    </main>
  );
}

const homeFlowMapDisplay: Record<string, { title: string; summary: string; note: string; reason: string }> = {
  'moving-d30': {
    title: '원룸 이사 D-30',
    summary: '이사일 하나로 원문 체크리스트를 날짜별 할 일로 저장합니다.',
    note: '생활 일정',
    reason: '날짜가 있는 큰 준비 과정을 한 번에 저장',
  },
  'middle-school-math-1': {
    title: '중1 수학 목차 진도',
    summary: '원문 목차의 단원과 하위 개념을 진도표로 저장합니다.',
    note: '교육 진도',
    reason: '목차가 있는 콘텐츠를 단원별 진행표로 저장',
  },
};

const homeFlowMapBaselineLinks = getSourceBackedHomepageFlowMaps().map((map) => {
  const display = homeFlowMapDisplay[map.id] ?? {
    title: map.userLabel,
    summary: map.summary,
    note: '여러 항목',
    reason: '큰 구조가 있는 원문을 실행 흐름으로 저장',
  };
  const publishPackage = buildSourceBackedFlowMapPublishPackage(map.id);
  const childFlows = publishPackage?.public.childFlows ?? [];
  const recommendedFlowSlug = map.recommendedFlowSlug ?? map.flowSlugs[0] ?? map.id;
  const recommendedFlow = childFlows.find((flow) => flow.slug === recommendedFlowSlug) ?? childFlows[0];
  const counts = getFlowMapCatalogCounts(map.flowSlugs.length, publishPackage, map.counts);
  const previewSteps =
    childFlows
      .flatMap((flow) => flow.steps.slice(0, 2).map((step) => step.title))
      .slice(0, 3);
  return {
    id: map.id,
    title: toContentDisplayTitle(display.title),
    summary: display.summary,
    categoryLabel: display.note,
    userFacingStatus: '바로 저장 가능',
    input: map.setupInput?.label ?? '입력 없음',
    artifact: map.artifacts[0] ?? '저장 항목',
    note: display.note,
    reason: display.reason,
    flowCount: map.flowSlugs.length,
    counts,
    recommendedFlowSlug: recommendedFlowSlug,
    recommendedFlowTitle: toContentDisplayTitle(recommendedFlow?.title ?? recommendedFlowSlug),
    sourceUrl: map.sourceUrl,
    sourceUrlCount: map.sourceUrlCount ?? 1,
    sourceSignal: '원문 연결',
    previewSteps,
    searchText: [map.title, map.userLabel, map.sourceTitle, ...map.artifacts, getChildFlowCatalogSearchText(childFlows)].filter(Boolean).join(' '),
    sourceKind: 'representative',
  };
});

const curatedSourceAppSeedCatalogLinks = getCuratedSourceAppSeedFlowMaps().map((map) => {
  const publishPackage = buildSourceBackedFlowMapPublishPackage(map.id);
  const childFlows = publishPackage?.public.childFlows ?? [];
  const recommendedFlowSlug = map.recommendedFlowSlug ?? map.flowSlugs[0] ?? map.id;
  const recommendedFlow = childFlows.find((flow) => flow.slug === recommendedFlowSlug) ?? childFlows[0];
  const counts = getFlowMapCatalogCounts(map.flowSlugs.length, publishPackage, map.counts);
  const previewSteps =
    childFlows
      .flatMap((flow) => flow.steps.slice(0, 1).map((step) => step.title))
      .slice(0, 3);
  return {
    id: map.id,
    title: toContentDisplayTitle(map.title),
    summary: map.summary,
    categoryLabel: map.categoryLabel ?? '콘텐츠',
    userFacingStatus: map.userFacingStatus ?? '확인 가능',
    input: map.setupInput?.label ?? '입력 없음',
    artifact: map.artifacts[0] ?? '저장 항목',
    note: map.categoryLabel ?? '콘텐츠',
    reason: map.summary,
    flowCount: map.flowSlugs.length,
    counts,
    recommendedFlowSlug,
    recommendedFlowTitle: toContentDisplayTitle(recommendedFlow?.title ?? recommendedFlowSlug),
    sourceUrl: map.sourceUrl,
    sourceUrlCount: map.sourceUrlCount ?? 1,
    sourceSignal: '원문 연결',
    previewSteps,
    searchText: [map.title, map.userLabel, map.sourceTitle, ...map.artifacts, getChildFlowCatalogSearchText(childFlows)].filter(Boolean).join(' '),
    sourceKind: 'curated-source',
  };
});

const flowMapCatalogLinks = [
  ...homeFlowMapBaselineLinks,
  ...curatedSourceAppSeedCatalogLinks.filter(
    (item) => !homeFlowMapBaselineLinks.some((homeItem) => homeItem.id === item.id),
  ),
];

const HOME_RECOMMENDATION_LIMIT = 3;
const homeRecommendedFlowMapLinks = homeFlowMapBaselineLinks.slice(0, HOME_RECOMMENDATION_LIMIT);

function getHomeRecommendationPromise(item: FlowMapCatalogLink): string {
  const inputLabel = item.input === '입력 없음' ? '입력 없이' : `${item.input}만 넣으면`;
  const countSuffix = item.input === '입력 없음' || item.counts.steps <= 0 ? '' : ` · 할 일 ${item.counts.steps}개`;
  return `${inputLabel} ${item.artifact}${countSuffix}`;
}

function HomeRecommendationCard({ item, variant = 'secondary' }: { item: FlowMapCatalogLink; variant?: 'primary' | 'secondary' }) {
  const promise = getHomeRecommendationPromise(item);
  const firstTask = getCatalogFirstTask(item.previewSteps, item.recommendedFlowTitle);
  const isPrimary = variant === 'primary';

  return (
    <Link
      data-testid={isPrimary ? 'home-primary-flow-card' : 'home-secondary-flow-card'}
      data-home-recommendation-card="true"
      className={[
        'block rounded-2xl border border-[#E7E4DD] bg-white transition hover:border-[#3654FF]/40 hover:shadow-[0_8px_24px_rgba(27,26,23,0.06)]',
        isPrimary ? 'p-4 md:p-5' : 'p-3.5',
      ].join(' ')}
      href={`/flow-maps/${item.id}`}
    >
      <p className="text-[11px] font-semibold text-[#8A857B]">{item.categoryLabel}</p>
      <h2 className={isPrimary ? 'mt-2 text-2xl font-semibold leading-snug text-[#1B1A17]' : 'mt-1.5 text-base font-semibold leading-snug text-[#1B1A17]'}>
        {item.title}
      </h2>
      <p
        data-testid={isPrimary ? 'home-primary-flow-promise' : undefined}
        className={isPrimary ? 'mt-3 rounded-xl bg-[#FAFAF8] px-3 py-2.5 text-sm font-semibold leading-5 text-[#1B1A17]' : 'mt-2 break-keep text-sm font-semibold leading-5 text-[#3654FF]'}
      >
        {promise}
      </p>
      {isPrimary ? (
        <p className="mt-2 break-keep text-sm leading-6 text-[#6E6B64]">{item.summary}</p>
      ) : (
        <p className="mt-2 line-clamp-1 break-keep text-sm leading-5 text-[#6E6B64]">{firstTask}</p>
      )}
      <p className={isPrimary ? 'mt-4 border-t border-[#E7E4DD] pt-3 text-sm font-semibold text-[#3654FF]' : 'mt-3 text-sm font-semibold text-[#3654FF]'}>
        {FLOW_ENTRY_DETAIL_CTA_LABEL}
      </p>
    </Link>
  );
}

function getFlowMapCatalogCounts(
  fallbackFlowCount: number,
  publishPackage: ReturnType<typeof buildSourceBackedFlowMapPublishPackage>,
  explicitCounts?: { flows: number; steps: number; items: number; sourceRows?: number },
) {
  if (explicitCounts) return explicitCounts;
  const childFlows = publishPackage?.public.childFlows ?? [];
  return {
    flows: fallbackFlowCount,
    steps: childFlows.reduce((sum, flow) => sum + flow.steps.length, 0),
    items: childFlows.reduce(
      (sum, flow) => sum + flow.steps.reduce((stepSum, step) => stepSum + step.detailItemCount, 0),
      0,
    ),
  };
}

export function HomeLanding() {
  const [primaryMap, ...secondaryMaps] = homeRecommendedFlowMapLinks;

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-5 py-6 pb-28 md:py-8 md:pb-12">
      <div className="mx-auto max-w-6xl">
      <PlatformNav />
      <section className="grid gap-6 py-6 md:py-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-2xl">
          <h1 className="break-keep text-3xl font-semibold leading-tight tracking-tight text-gray-950 md:text-5xl">
            콘텐츠를 일정과 할 일로 저장
          </h1>
          <p className="mt-4 max-w-2xl break-keep text-base leading-7 text-gray-600 md:text-lg md:leading-8">
            블로그, 유튜브, 공식 안내에서 따라 할 부분만 골라 일정과 체크리스트로 저장합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-7">
            <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#3654FF] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2945E8] sm:w-auto" href="/flows">
              콘텐츠 고르러 가기
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#3654FF]">바로 시작</p>
            <p className="text-xs font-medium text-[#8A857B]">{homeRecommendedFlowMapLinks.length}개 추천</p>
          </div>
          {primaryMap ? <HomeRecommendationCard item={primaryMap} variant="primary" /> : null}
          {secondaryMaps.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {secondaryMaps.map((map) => (
                <HomeRecommendationCard key={map.id} item={map} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      </div>
    </main>
  );
}

type MyFlowRow = {
  id: string;
  title: string;
  section: string;
  timing?: string;
  date?: string;
  detail?: FlowItemDetail;
  itemType?: MyFlowItemTypeInfo;
};

type MySavedFlow = {
  progress: ActiveFlowProgress;
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  rows: MyFlowRow[];
  done: number;
  total: number;
  percent: number;
  meta: string;
  savedMap?: SavedFlowMapSnapshot;
  demoGroup?: string;
  demoNote?: string;
};

type MyFlowInventoryGroup = {
  key: string;
  label: string;
  title: string;
  flows: MySavedFlow[];
  savedMap?: SavedFlowMapSnapshot;
};

type MyFlowSelectedDateGroup = {
  key: string;
  label: string;
  title: string;
  kind: 'routine' | 'schedule';
  rows: MyFlowCalendarRow[];
  savedMap?: SavedFlowMapSnapshot;
};

type ChecklistFilter = 'all' | 'open' | 'done';
type MyFlowStatusSheet = 'overdue' | 'next';
type MyFlowDemoMode = 'legacy' | 'ux12' | 'ux20' | 'source-backed';
type MyFlowDemoFixture = {
  slug: string;
  anchor?: string;
  completedCount: number;
  group: string;
  note: string;
};

const myFlowChecklistDestinationSlugs = new Set(['used-car-buying-check', 'new-car-delivery-check', 'passport-renewal-docs']);

function getMyFlowAnchorDisplay(bundle: FlowBundle, anchor: string, demoMode: MyFlowDemoMode | null): string | null {
  if (!anchor) return null;
  const displayAnchor = /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? formatMyFlowDisplayDate(anchor) : anchor;
  if (bundle.flow.anchor_type === 'none') return `${demoMode ? '데모 기준일' : '기준일'} ${displayAnchor}`;
  return `${getAnchorInputLabel(bundle)} ${displayAnchor}`;
}

function getMyFlowOpenActionLabel(bundle: FlowBundle): string {
  if (bundle.flow.tags?.includes('progress-flow')) return '진도 보기';
  const destination = inferPrimaryDestination(bundle);
  if (myFlowChecklistDestinationSlugs.has(bundle.flow.slug) || destination === 'internal_check') return '열기';
  if (destination === 'sheet') return '표 보기';
  if (destination === 'memo') return '메모 보기';
  return '열기';
}

function getMyFlowOpenActionAriaLabel(title: string, actionLabel: string): string {
  const displayTitle = toUserFacingSourceTitle(title).trim();
  const displayAction = actionLabel.trim();
  if (!displayTitle) return displayAction || '열기';
  if (!displayAction) return displayTitle;
  return `${displayTitle} ${displayAction}`;
}

type MyFlowExecutionItemType =
  | 'scheduled_task'
  | 'routine_session'
  | 'check_task'
  | 'log_entry'
  | 'memo_evidence'
  | 'decision_hold'
  | 'reference_caution';
type MyFlowItemTypeInfo = {
  primary: MyFlowExecutionItemType;
  secondary: MyFlowExecutionItemType[];
};
const MY_FLOW_ITEM_TYPE_LABELS: Record<MyFlowExecutionItemType, string> = {
  scheduled_task: '일정',
  routine_session: '루틴',
  check_task: '체크',
  log_entry: '기록',
  memo_evidence: '메모',
  decision_hold: '결정',
  reference_caution: '주의',
};
const MY_FLOW_ITEM_TYPE_OVERVIEW_ORDER: MyFlowExecutionItemType[] = [
  'scheduled_task',
  'routine_session',
  'check_task',
  'memo_evidence',
  'decision_hold',
];
type MyFlowItemDraft = Pick<Partial<FlowItemDetail>, 'why' | 'how' | 'completion_criteria' | 'caution'> & {
  title?: string;
  date?: string;
  repeatPreset?: string;
  memo?: string;
  location?: string;
  time?: string;
  logValue?: string;
  decisionStatus?: 'undecided' | 'buy' | 'hold' | 'reject';
  nextReviewDate?: string;
};
type MyFlowRoutineRuleDraft = {
  weekdays?: string[];
  endDate?: string;
  scope?: 'this' | 'future' | 'all';
};
type MyFlowRoutineCompletionUndo = {
  flowSlug: string;
  rowId: string;
  activeRowKey: string;
  date: string;
  originalDate: string;
};
const MY_FLOW_ITEM_DRAFTS_STORAGE_KEY = 'flow:my-flow:item-drafts';
const MY_FLOW_DATE_OVERRIDES_STORAGE_KEY = 'flow:my-flow:date-overrides';
const MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY = 'flow:my-flow:hidden-flows';
const MY_FLOW_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

type FlowListFilter = 'all' | 'open' | 'routine' | 'done' | 'hidden';

function getStoredMyFlowItemDrafts(): Record<string, MyFlowItemDraft> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MY_FLOW_ITEM_DRAFTS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredMyFlowItemDrafts(drafts: Record<string, MyFlowItemDraft>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MY_FLOW_ITEM_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
}

function getStoredMyFlowDateOverrides(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MY_FLOW_DATE_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveStoredMyFlowDateOverrides(overrides: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MY_FLOW_DATE_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
}

function getStoredMyFlowHiddenFlowSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0) : [];
  } catch {
    return [];
  }
}

function saveStoredMyFlowHiddenFlowSlugs(slugs: string[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY, JSON.stringify(slugs));
}

function getMyFlowItemTypeText(bundle: FlowBundle, row: MyFlowRow, item?: FlowItem): string {
  const detail = row.detail ?? getItemDetail(bundle, row.id);
  return [
    bundle.flow.title,
    bundle.flow.category,
    bundle.flow.primary_destination,
    row.title,
    row.section,
    row.timing,
    item?.description,
    item?.repeat_rule,
    item?.source_type,
    item?.risk_level,
    detail?.why,
    detail?.how,
    detail?.completion_criteria,
    detail?.caution,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function hasMyFlowTypeSignal(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

function deriveMyFlowItemType(bundle: FlowBundle, row: MyFlowRow): MyFlowItemTypeInfo {
  const item = bundle.items.find((entry) => entry.id === row.id);
  const text = getMyFlowItemTypeText(bundle, row, item);
  const secondary = new Set<MyFlowExecutionItemType>();
  const hasCaution = Boolean(row.detail?.caution || item?.risk_level);
  const hasDecision = Boolean(
    item?.hold_eligible ||
    hasMyFlowTypeSignal(text, /보류|결정|선택|비교|서명|중단|상담|consult|hold|stop|sign/),
  );
  const hasEvidence = Boolean(
    item?.photo_filename_pattern ||
    bundle.flow.primary_destination === 'memo' ||
    hasMyFlowTypeSignal(text, /증빙|사진|파일명|제출|접수|확인서|영수증|계약서|보관|공식 조회|딜러 확인|memo|evidence|proof/),
  );
  const hasLog = hasMyFlowTypeSignal(text, /기록|관찰|점수|컨디션|수면|식사|운동 시간|상태|메모|log|record|tracker/);
  const isRoutine = bundle.flow.structure_type === 'routine' || Boolean(item?.repeat_rule);

  if (hasDecision) secondary.add('decision_hold');
  if (hasEvidence) secondary.add('memo_evidence');
  if (hasLog) secondary.add('log_entry');
  if (hasCaution) secondary.add('reference_caution');

  let primary: MyFlowExecutionItemType = 'check_task';
  if (isRoutine) {
    primary = 'routine_session';
  } else if (row.date) {
    primary = 'scheduled_task';
  } else if (hasDecision) {
    primary = 'decision_hold';
  } else if (hasEvidence) {
    primary = 'memo_evidence';
  } else if (hasLog) {
    primary = 'log_entry';
  }

  secondary.delete(primary);
  return { primary, secondary: Array.from(secondary) };
}

function withMyFlowItemType(bundle: FlowBundle, row: MyFlowRow): MyFlowRow {
  return {
    ...row,
    itemType: deriveMyFlowItemType(bundle, row),
  };
}

function getMyFlowTypeCounts(rows: MyFlowRow[]): Array<{ type: MyFlowExecutionItemType; count: number }> {
  const counts = new Map<MyFlowExecutionItemType, number>();
  rows.forEach((row) => {
    const itemType = row.itemType;
    if (!itemType) return;
    [itemType.primary, ...itemType.secondary].forEach((type) => {
      if (type === 'reference_caution') return;
      counts.set(type, (counts.get(type) ?? 0) + 1);
    });
  });
  return MY_FLOW_ITEM_TYPE_OVERVIEW_ORDER
    .map((type) => ({ type, count: counts.get(type) ?? 0 }))
    .filter((entry) => entry.count > 0);
}

function getMyFlowDetailTypeSummary(row: MyFlowRow): { label: string; text?: string } | null {
  const itemType = row.itemType;
  if (!itemType) return null;
  const types = [itemType.primary, ...itemType.secondary];
  if (types.includes('decision_hold')) {
    return {
      label: '결정',
    };
  }
  if (types.includes('memo_evidence')) {
    return {
      label: '메모',
    };
  }
  if (types.includes('log_entry')) {
    return {
      label: '기록',
    };
  }
  return null;
}

function getMyFlowRows(bundle: FlowBundle, anchor: string): MyFlowRow[] {
  const scheduleRows = anchor ? getScheduleEntries(bundle, anchor) : [];
  if (scheduleRows.length > 0) {
    return scheduleRows.map((entry) =>
      withMyFlowItemType(bundle, {
        id: entry.id,
        title: entry.title,
        section: entry.section,
        timing: entry.timing,
        date: entry.startDate,
        detail: entry.detail,
      }),
    );
  }

  return bundle.items.map((item) =>
    withMyFlowItemType(bundle, {
      id: item.id,
      title: item.title,
      section: getSectionTitleForBundle(bundle, item.section_id),
      timing: item.repeat_rule,
      detail: getItemDetail(bundle, item.id),
    }),
  );
}

function getHeroStartLabel(bundle: FlowBundle): string {
  if (bundle.flow.anchor_type === 'none') {
    return bundle.flow.setup_anchor_label ?? '바로 체크 시작';
  }
  return `${getAnchorInputLabel(bundle)} 입력으로 시작`;
}

function getFlowCountLabel(bundle: FlowBundle): string {
  const count = getFlowItemCount(bundle);
  if (bundle.flow.primary_destination === 'sheet') return `${count}개 행`;
  return `${count}개 항목`;
}

function getMyFlowCheckIds(bundle: FlowBundle, rowId: string, anchor: string): string[] {
  return getToggleCheckIds(bundle, rowId, anchor);
}

function getMyFlowMonthCells(anchor: string): (Date | null)[] {
  const base = anchor ? new Date(anchor) : new Date();
  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
  const dayCount = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let index = 0; index < monthStart.getDay(); index += 1) cells.push(null);
  for (let day = 1; day <= dayCount; day += 1) cells.push(new Date(base.getFullYear(), base.getMonth(), day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function getMyFlowMonthLabel(anchor: string): string {
  const base = anchor ? new Date(anchor) : new Date();
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
}

function isMyFlowRowChecked(flow: MySavedFlow, row: MyFlowRow): boolean {
  const checkIds = getMyFlowCheckIds(flow.bundle, row.id, flow.anchor);
  return checkIds.length > 0 && checkIds.every((id) => flow.checks[id]);
}

function getMyFlowSavedMapTitle(flow: MySavedFlow): string {
  return flow.savedMap ? toUserFacingMapTitle(flow.savedMap.title) : flow.demoGroup ?? '';
}

function getMyFlowFlowPathLabel(flow: MySavedFlow): string {
  const flowTitle = getMyFlowExecutionFlowTitle(flow.progress.title);
  const mapTitle = getMyFlowSavedMapTitle(flow);
  return mapTitle ? `${mapTitle} · ${flowTitle}` : flowTitle;
}

function getMyFlowFlowChipLabel(flow: MySavedFlow): string {
  return getMyFlowExecutionFlowTitle(flow.progress.title);
}

function getMyFlowFlowProgressLabel(flow: MySavedFlow): string {
  return `${flow.done}/${flow.total}`;
}

function getMyFlowSourceHref(flow: MySavedFlow): string {
  const sourceBackedMap = getSourceBackedMyFlowMapForBundle(flow.bundle);
  return flow.savedMap ? `/flow-maps/${flow.savedMap.mapId}` : sourceBackedMap ? `/flow-maps/${sourceBackedMap.id}` : `/f/${flow.progress.slug}`;
}

function getMyFlowSourceLinkLabel(flow: MySavedFlow): string {
  return flow.savedMap || getSourceBackedMyFlowMapForBundle(flow.bundle) ? '전체 보기' : 'Flow 보기';
}

type MyFlowContentReadiness = {
  kind: 'ready' | 'review' | 'preview' | 'legacy';
  label: string;
  groupLabel?: string;
};

type MyFlowMapUpdateNotice = {
  mapId: string;
  title: string;
  label: string;
  tone: 'amber' | 'slate';
  status: SourceBackedFlowMapUpdateAssessment['status'];
  canApplyAutomatically: boolean;
  reasons: string[];
  affectedCount: number;
  affectedFlowSlugs: string[];
  comparisonRows: MyFlowMapUpdateComparisonRow[];
  savedVersion: string;
  currentVersion?: string;
  anchor?: string;
};

type MyFlowMapUpdateComparisonRow = {
  slug: string;
  savedStepCount?: number;
  currentStepCount?: number;
  savedSourceCheckedAt?: string;
  currentSourceCheckedAt?: string;
  changeLabels: string[];
};

type MyFlowDismissedMapUpdate = {
  savedVersion: string;
  currentVersion?: string;
  dismissedAt: string;
};

type MyFlowDismissedMapUpdates = Record<string, MyFlowDismissedMapUpdate>;

const MY_FLOW_DISMISSED_MAP_UPDATES_KEY = 'flow:map:update:dismissed';

function getMyFlowDismissedMapUpdates(): MyFlowDismissedMapUpdates {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(MY_FLOW_DISMISSED_MAP_UPDATES_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveMyFlowDismissedMapUpdates(value: MyFlowDismissedMapUpdates): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MY_FLOW_DISMISSED_MAP_UPDATES_KEY, JSON.stringify(value));
}

function toSourceBackedSavedSnapshot(snapshot: SavedFlowMapSnapshot): SourceBackedFlowMapSavedSnapshot {
  return {
    mapId: snapshot.mapId,
    title: snapshot.title,
    version: snapshot.version,
    savedAt: snapshot.savedAt,
    ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
    flowSlugs: snapshot.flowSlugs,
    stepCountsByFlow: snapshot.stepCountsByFlow ?? {},
    riskLevelsByFlow: (snapshot.riskLevelsByFlow ?? {}) as SourceBackedFlowMapSavedSnapshot['riskLevelsByFlow'],
    sourceCheckedAtByFlow: snapshot.sourceCheckedAtByFlow ?? {},
  };
}

function formatMyFlowMapUpdateReason(reason: string): string {
  if (reason.startsWith('버전 변경:')) return '원문 기준 정보가 새로 발행되었습니다.';
  if (reason.includes('Flow 구성이 바뀌었습니다')) return '포함된 Flow 구성이 바뀌었습니다.';
  if (reason.includes('Step 수가 바뀌었습니다')) return '일정이나 항목 수가 바뀌었습니다.';
  if (reason.includes('출처 확인일이 바뀌었습니다')) return '출처 확인일이 바뀌었습니다.';
  if (reason.includes('공식/민감 일정')) return '검진/접종처럼 공식 일정은 자동으로 바꾸지 않습니다.';
  return reason;
}

function buildMyFlowMapUpdateComparisonRows(
  saved: SourceBackedFlowMapSavedSnapshot,
  current?: SourceBackedFlowMapSavedSnapshot,
): MyFlowMapUpdateComparisonRow[] {
  const slugs = Array.from(new Set([...saved.flowSlugs, ...(current?.flowSlugs ?? [])]));
  return slugs
    .map((slug) => {
      const savedStepCount = saved.stepCountsByFlow[slug];
      const currentStepCount = current?.stepCountsByFlow[slug];
      const savedSourceCheckedAt = saved.sourceCheckedAtByFlow[slug];
      const currentSourceCheckedAt = current?.sourceCheckedAtByFlow[slug];
      const changeLabels = [
        !saved.flowSlugs.includes(slug) ? '새로 추가' : undefined,
        current && !current.flowSlugs.includes(slug) ? '현재 발행본에서 제외' : undefined,
        savedStepCount !== currentStepCount ? '항목 수 변경' : undefined,
        savedSourceCheckedAt !== currentSourceCheckedAt ? '출처 확인일 변경' : undefined,
      ].filter((item): item is string => Boolean(item));

      return {
        slug,
        savedStepCount,
        currentStepCount,
        savedSourceCheckedAt,
        currentSourceCheckedAt,
        changeLabels: changeLabels.length ? changeLabels : ['버전 정보 변경'],
      };
    })
    .filter((row) => row.changeLabels.length > 0);
}

function getMyFlowMapUpdateNotice(snapshot: SavedFlowMapSnapshot): MyFlowMapUpdateNotice | undefined {
  const sourceSnapshot = toSourceBackedSavedSnapshot(snapshot);
  const currentSnapshot = buildSourceBackedFlowMapSavedSnapshot(snapshot.mapId, {
    savedAt: snapshot.savedAt,
    ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
  });
  const assessment = assessSourceBackedFlowMapUpdate(sourceSnapshot);
  if (assessment.status === 'up_to_date') return undefined;
  const affectedCount = Math.max(assessment.affectedFlows.length, snapshot.flowSlugs.length);
  const reasons = assessment.reasons.map(formatMyFlowMapUpdateReason);
  const comparisonRows = buildMyFlowMapUpdateComparisonRows(sourceSnapshot, currentSnapshot);

  if (assessment.status === 'map_missing') {
    return {
      mapId: snapshot.mapId,
      title: snapshot.title,
      label: '원문 확인 필요',
      tone: 'amber',
      status: assessment.status,
      canApplyAutomatically: assessment.canApplyAutomatically,
      reasons,
      affectedCount,
      affectedFlowSlugs: assessment.affectedFlows,
      comparisonRows,
      savedVersion: assessment.savedVersion,
      ...(assessment.currentVersion ? { currentVersion: assessment.currentVersion } : {}),
      ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
    };
  }

  return {
    mapId: snapshot.mapId,
    title: snapshot.title,
    label: assessment.status === 'review_before_apply' ? '업데이트 확인 필요' : '업데이트 있음',
    tone: assessment.status === 'review_before_apply' ? 'amber' : 'slate',
    status: assessment.status,
    canApplyAutomatically: assessment.canApplyAutomatically,
    reasons,
    affectedCount,
    affectedFlowSlugs: assessment.affectedFlows,
    comparisonRows,
    savedVersion: assessment.savedVersion,
    ...(assessment.currentVersion ? { currentVersion: assessment.currentVersion } : {}),
    ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
  };
}

function isMyFlowMapUpdateDismissed(
  notice: MyFlowMapUpdateNotice,
  dismissedUpdates: MyFlowDismissedMapUpdates,
): boolean {
  const dismissed = dismissedUpdates[notice.mapId];
  if (!dismissed) return false;
  return dismissed.savedVersion === notice.savedVersion && dismissed.currentVersion === notice.currentVersion;
}

function getMyFlowContentReadiness(flow: MySavedFlow): MyFlowContentReadiness {
  const sourceStatus = flow.bundle.flow.source_status;
  const sourceBacked = flow.progress.slug.startsWith('source-backed-') || Boolean(flow.bundle.flow.tags?.includes('source-backed'));
  if (flow.savedMap || sourceBacked || sourceStatus === 'real' || serviceCatalogFlowSlugs.has(flow.progress.slug)) return { kind: 'ready', label: '실행 가능' };
  if (sourceStatus === 'preview') return { kind: 'preview', label: '원문 확인', groupLabel: '확인 후 실행' };
  if (sourceStatus === 'needs_review') return { kind: 'review', label: '원문 확인', groupLabel: '확인 후 실행' };
  return { kind: 'legacy', label: '예전 저장', groupLabel: '예전 저장 콘텐츠' };
}

function isMyFlowReadyContent(flow: MySavedFlow): boolean {
  return getMyFlowContentReadiness(flow).kind === 'ready';
}

function getMyFlowContentReadinessNote(readiness: MyFlowContentReadiness): string {
  if (readiness.kind === 'ready') return '내 Flow에서 실행할 수 있습니다.';
  if (readiness.kind === 'review') return '원문과 할 일을 한 번 확인한 뒤 실행하세요.';
  if (readiness.kind === 'preview') return '원문을 확인한 뒤 내 일정에 맞게 실행하세요.';
  return '예전 저장 방식입니다. 새 콘텐츠와 구분해서 봅니다.';
}

function getMyFlowRoutineDays(bundle: FlowBundle): string[] {
  const labels = getRoutineWeekdayLabels(bundle.repeatRules?.[0] ?? '', []);
  return labels.length ? labels : ['월', '수', '금'];
}

const MY_FLOW_UX12_DEMO_FIXTURES: MyFlowDemoFixture[] = [
  { slug: 'new-apartment-precheck', anchor: '2026-06-08', completedCount: 0, group: '???P0', note: '입주 체크' },
  { slug: 'japan-esim-setup-before-departure', anchor: '2026-06-20', completedCount: 0, group: '???P0', note: '여행 준비' },
  { slug: 'dog-adoption-first-week', anchor: '2026-06-05', completedCount: 0, group: '???P0', note: '반려동물' },
  { slug: 'moving-d30-basic', anchor: '2026-06-26', completedCount: 2, group: '생활 일정', note: 'D-day 일정' },
  { slug: 'wedding-d180-basic', anchor: '2026-11-24', completedCount: 5, group: '생활 일정', note: '장기 일정' },
  { slug: 'computer-skills-d30-study', anchor: '2026-06-27', completedCount: 2, group: '대표 P0', note: '공부 진도표' },
  { slug: 'samsung-aircon-seasonal-check', anchor: '2026-06-01', completedCount: 1, group: '대표 P0', note: '가전 루틴' },
  { slug: 'samsung-washer-filter-cleaning', anchor: '2026-06-01', completedCount: 1, group: '대표 P0', note: '가전 루틴' },
  { slug: 'overseas-travel-d14', anchor: '2026-06-20', completedCount: 3, group: '생활 일정', note: '여행 체크' },
  { slug: 'passport-renewal-docs', anchor: '2026-06-15', completedCount: 2, group: '생활 일정', note: '서류 메모' },
  { slug: 'baby-food-menu-recipe', anchor: '2026-05-28', completedCount: 4, group: '반복 루틴', note: '식단 캘린더' },
  { slug: 'home-workout-20min', anchor: '2026-05-27', completedCount: 4, group: '반복 루틴', note: '운동 루틴' },
  { slug: 'running-5k-4week', anchor: '2026-05-29', completedCount: 2, group: '반복 루틴', note: '훈련 루틴' },
  { slug: 'english-study-30day-routine', anchor: '2026-06-02', completedCount: 3, group: '반복 루틴', note: '학습 루틴' },
  { slug: 'business-registration-basic', anchor: '2026-06-03', completedCount: 1, group: '행정/결정', note: '공식 체크' },
  { slug: 'year-end-tax-docs', anchor: '2026-12-31', completedCount: 2, group: '행정/결정', note: '세금 서류' },
  { slug: 'driver-license-renewal-check', anchor: '2026-06-10', completedCount: 1, group: '행정/결정', note: '갱신 체크' },
  { slug: 'used-car-buying-check', completedCount: 1, group: '행정/결정', note: '결정 체크' },
];

const MY_FLOW_UX20_DEMO_FIXTURES: MyFlowDemoFixture[] = [
  ...MY_FLOW_UX12_DEMO_FIXTURES,
  { slug: 'job-change-risk-check', completedCount: 1, group: '커리어/결정', note: '이직 리스크' },
  { slug: 'national-health-checkup-d7', anchor: '2026-06-18', completedCount: 1, group: '건강/공식', note: '검진 준비' },
  { slug: 'happy-birth-service-check', completedCount: 1, group: '육아/행정', note: '출산 신청' },
  { slug: 'pet-registration-basic', completedCount: 1, group: '생활/반려동물', note: '등록 준비' },
  { slug: 'vaccination-certificate-issue', completedCount: 1, group: '생활/증명서', note: '증명 발급' },
  { slug: 'family-certificate-issue', completedCount: 1, group: '생활/증명서', note: '가족관계' },
  { slug: 'resident-register-copy-issue', completedCount: 1, group: '생활/증명서', note: '등본 발급' },
  { slug: 'industrial-accident-claim-docs', completedCount: 1, group: '행정/결정', note: '산재 서류' },
  { slug: 'study-exam-d30-plan', anchor: '2026-06-27', completedCount: 2, group: '공부/루틴', note: '시험 D-day' },
  { slug: 'new-car-delivery-check', completedCount: 1, group: '자동차/결정', note: '인수 점검' },
  { slug: 'car-care-monthly-routine', anchor: '2026-06-01', completedCount: 1, group: '자동차/루틴', note: '월간 관리' },
  { slug: 'diet-habit-2week', anchor: '2026-06-01', completedCount: 1, group: '건강/루틴', note: '수면 체크' },
];

const MY_FLOW_SOURCE_BACKED_DEMO_FIXTURES: MyFlowDemoFixture[] = [
  { slug: 'source-backed-moving-d30', anchor: '2026-07-22', completedCount: 0, group: '이사 D-30 일정', note: 'D-day 일정' },
  { slug: 'source-backed-middle-school-math-1', completedCount: 0, group: '중1 수학 진도', note: '진도표' },
];

const MY_FLOW_LEGACY_DEMO_FIXTURES = MY_FLOW_UX12_DEMO_FIXTURES;

function getMyFlowDemoMode(): MyFlowDemoMode | null {
  if (typeof window === 'undefined') return null;
  const demo = new URLSearchParams(window.location.search).get('demo');
  if (demo === 'source-backed' || demo === 'source') return 'source-backed';
  if (demo === 'ux20' || demo === '20') return 'ux20';
  if (demo === 'ux12' || demo === '12') return 'ux12';
  if (demo === '1' || demo === 'true') return 'legacy';
  return null;
}

function getRequestedSourceBackedDemoFixtures(): MyFlowDemoFixture[] {
  if (typeof window === 'undefined') return MY_FLOW_SOURCE_BACKED_DEMO_FIXTURES;
  const params = new URLSearchParams(window.location.search);
  const mapId = params.get('savedMap') ?? params.get('demoMap');
  const publishPackage = mapId ? buildSourceBackedFlowMapPublishPackage(mapId) : undefined;
  if (!publishPackage) return MY_FLOW_SOURCE_BACKED_DEMO_FIXTURES;

  const anchor = publishPackage.map.setupInput?.defaultValue;
  const note = publishPackage.map.setupInput ? `${publishPackage.map.setupInput.label} ${anchor}` : '저장 후 예시';
  return publishPackage.myFlow.savedSlugs.map((slug) => ({
    slug,
    ...(anchor ? { anchor } : {}),
    completedCount: 0,
    group: publishPackage.map.userLabel,
    note,
  }));
}

function getMyFlowDemoFixtures(mode: MyFlowDemoMode | null): MyFlowDemoFixture[] {
  if (mode === 'source-backed') return getRequestedSourceBackedDemoFixtures();
  if (mode === 'ux20') return MY_FLOW_UX20_DEMO_FIXTURES;
  if (mode === 'ux12') return MY_FLOW_UX12_DEMO_FIXTURES;
  return MY_FLOW_LEGACY_DEMO_FIXTURES;
}

function buildMyFlowDemoState(bundles: FlowBundle[], fixtures: MyFlowDemoFixture[]) {
  const savedAt = '2026-05-28T13:02:49.000Z';
  const progress: ActiveFlowProgress[] = [];
  const checksBySlug: Record<string, Record<string, boolean>> = {};
  const savedMapSnapshotsById = new Map<string, SavedFlowMapSnapshot>();

  fixtures.forEach((demo) => {
    const bundle = bundles.find((entry) => entry.flow.slug === demo.slug);
    if (!bundle) return;
    const anchor = demo.anchor ?? '';
    const executableIds = getExecutableCheckIds(bundle, anchor);
    const checks = Object.fromEntries(executableIds.slice(0, demo.completedCount).map((id) => [id, true]));
    checksBySlug[demo.slug] = checks;
    progress.push({
      slug: demo.slug,
      title: bundle.flow.title,
      done: Math.min(demo.completedCount, executableIds.length),
      total: executableIds.length,
      skipped: 0,
      ...(anchor ? { anchor, anchorMode: 'custom' } : {}),
      lastVisited: savedAt,
    });
    const sourceBackedMap = getSourceBackedMyFlowMapForBundle(bundle);
    if (sourceBackedMap) {
      const snapshotAnchor = sourceBackedMap.setupInput ? anchor || sourceBackedMap.setupInput.defaultValue : undefined;
      const snapshot = buildSourceBackedFlowMapSavedSnapshot(sourceBackedMap.id, {
        savedAt,
        ...(snapshotAnchor ? { anchor: snapshotAnchor } : {}),
      });
      if (snapshot) savedMapSnapshotsById.set(sourceBackedMap.id, snapshot);
    }
  });

  const savedFlowMapBySlug = Array.from(savedMapSnapshotsById.values()).reduce<Record<string, SavedFlowMapSnapshot>>((index, snapshot) => {
    snapshot.flowSlugs.forEach((slug) => {
      index[slug] = snapshot;
    });
    return index;
  }, {});

  return { progress, checksBySlug, savedFlowMapBySlug };
}

function seedMyFlowDemoState(bundles: FlowBundle[], fixtures: MyFlowDemoFixture[] = MY_FLOW_LEGACY_DEMO_FIXTURES): void {
  if (typeof window === 'undefined') return;
  const savedAt = '2026-05-28T03:00:00.000Z';

  fixtures.forEach((demo) => {
    const bundle = bundles.find((entry) => entry.flow.slug === demo.slug);
    if (!bundle) return;
    const anchor = demo.anchor ?? '';
    window.localStorage.setItem(
      `flow:saved:${demo.slug}`,
      JSON.stringify({
        slug: demo.slug,
        savedAt,
        selectedArtifactMode: 'calendar',
        ...(anchor ? { anchor } : {}),
      }),
    );
    if (anchor) saveStoredAnchor(demo.slug, { mode: 'custom', anchor });
    const completedIds = getExecutableCheckIds(bundle, anchor).slice(0, demo.completedCount);
    saveChecks(demo.slug, Object.fromEntries(completedIds.map((id) => [id, true])));
  });
}

function getMyFlowMonthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

function formatMyFlowLocalDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMyFlowMonthHeading(date: string): string {
  const [year, month] = date.split('-');
  return `${year}년 ${Number(month)}월`;
}

function formatMyFlowDisplayDate(date: string, options: { includeWeekday?: boolean } = {}): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  const label = `${Number(month)}월 ${Number(day)}일`;
  if (!options.includeWeekday) return label;
  const weekday = ['일', '월', '화', '수', '목', '금', '토'][new Date(Number(year), Number(month) - 1, Number(day)).getDay()];
  return `${label} (${weekday})`;
}

function addMyFlowMonths(date: string, count: number): string {
  const current = new Date(`${getMyFlowMonthStart(date)}T00:00:00`);
  current.setMonth(current.getMonth() + count);
  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-01`;
}

function getMyFlowDetailChecklistItems(detail?: FlowItemDetail): string[] {
  if (!detail?.how) return [];
  return detail.how
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
}

function compactMyFlowInlineActionHint(text?: string): string | undefined {
  const firstLine = text
    ?.split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !/^[-*]\s+/.test(line));
  if (!firstLine) return undefined;
  const actionOnly = firstLine
    .replace(/^실행:\s*/, '')
    .split(/\s+기록:\s*/)[0]
    .trim();
  if (!actionOnly) return undefined;
  return actionOnly.length > 120 ? `${actionOnly.slice(0, 117)}...` : actionOnly;
}

function getMyFlowInlineActionHint(detail?: FlowItemDetail, item?: FlowItem): string | undefined {
  if (getMyFlowDetailChecklistItems(detail).length > 0) return undefined;
  return (
    compactMyFlowInlineActionHint(detail?.how) ||
    compactMyFlowInlineActionHint(item?.description) ||
    compactMyFlowInlineActionHint(visibleCompletionCriteria(detail)) ||
    compactMyFlowInlineActionHint(detail?.why)
  );
}

function formatMyFlowDetailMemo(detail: FlowItemDetail, row?: MyFlowRow, item?: FlowItem): string {
  const checklistItems = getMyFlowDetailChecklistItems(detail);
  const parts = [
    detail.why,
    checklistItems.length > 0 ? undefined : detail.how,
    visibleCompletionCriteria(detail),
  ].filter(Boolean);
  if (parts.length > 0) return parts.join('\n\n');
  if (item?.description) return item.description;
  if (row?.title) return `${row.title}\n\n처리한 뒤 완료 체크합니다.`;
  return '';
}

function formatMyFlowRepeatSummary(weekdays: string[]): string {
  return weekdays.length > 0 ? `${weekdays.join(' · ')} 반복` : '반복 요일 없음';
}

function formatMyFlowTimingChip(timing: string): string {
  const value = timing.trim();
  if (!value) return '';
  return /^D(?:-\d+|\+\d+(?:~D\+\d+)?|-Day|Day)$/i.test(value) ? `기준 ${value}` : value;
}

function getMyFlowTimingChipLabel(timing: string): string | undefined {
  const value = timing.trim();
  if (!value) return undefined;
  return /^D(?:-\d+|\+\d+(?:~D\+\d+)?|-Day|Day)$/i.test(value) ? `Flow 기준 ${value}` : undefined;
}

function getMyFlowRowDisplaySectionLabel(row: MyFlowCalendarRow): string {
  const section = row.section.trim();
  const timing = row.timing?.trim() ?? '';
  if (!section) return '';
  const normalizeUserLabel = (value: string) => toUserFacingSourceTitle(value.replace(/\bStep\b/g, '단계').replace(/\bItem\b/g, '체크'));
  if (timing && section.startsWith(timing)) {
    return normalizeUserLabel(section.slice(timing.length).trim() || section);
  }
  return normalizeUserLabel(section.replace(/^D(?:-\d+|\+\d+(?:~D\+\d+)?|-Day|Day)\s+/i, '').trim() || section);
}

function getMyFlowAgendaSharedMeta(rows: MyFlowCalendarRow[], kind: 'routine' | 'schedule') {
  if (rows.length < 2) return {};

  const timingValues = kind === 'routine' ? [] : rows.map((row) => row.timing?.trim() ?? '');
  const sharedTimingValue = timingValues.length > 0 && timingValues.every((value) => value && value === timingValues[0])
    ? timingValues[0]
    : '';
  const sectionValues = rows.map((row) => getMyFlowRowDisplaySectionLabel(row));
  const sharedSection = sectionValues.every((value) => value && value === sectionValues[0])
    ? sectionValues[0]
    : '';

  return {
    timing: sharedTimingValue
      ? {
          label: formatMyFlowTimingChip(sharedTimingValue),
          accessibilityLabel: getMyFlowTimingChipLabel(sharedTimingValue),
        }
      : undefined,
    section: sharedSection || undefined,
  };
}
function getMyFlowExecutionFlowTitle(title: string): string {
  return toContentDisplayTitle(
    title
      .replace(/\s+D(?:-\d+|\+\d+(?:~D\+\d+)?|-Day|Day)\s+/i, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

type MyFlowCalendarRow = MyFlowRow & {
  flow: MySavedFlow;
  originalDate?: string;
  calendarKey?: string;
};
type MyFlowCalendarScope = 'all' | 'map' | 'schedule' | 'routine';
type MyFlowRoutineCalendarIcon = {
  key: string;
  title: string;
  flowTitle: string;
  color: string;
  iconKind: MyFlowRoutineIconKind;
};

const MY_FLOW_ROUTINE_ICON_LIMIT = 2;
const MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT = 2;
const MY_FLOW_MOBILE_STRUCTURE_STEP_PREVIEW_LIMIT = 5;
type MyFlowRoutineIconKind = 'study' | 'running' | 'workout' | 'meal' | 'maintenance' | 'routine';

function getMyFlowCalendarRowKey(flowSlug: string, rowId: string, originalDate: string): string {
  return `${flowSlug}::${rowId}::${originalDate}`;
}

function getMyFlowManualScheduleKey(flowSlug: string, rowId: string): string {
  return getMyFlowCalendarRowKey(flowSlug, rowId, 'none');
}

function getMyFlowRowInstanceKey(row: MyFlowCalendarRow): string {
  return row.calendarKey ?? `${row.flow.progress.slug}::${row.id}::${row.date ?? 'none'}`;
}

function isMyFlowCalendarRowInScope(row: MyFlowCalendarRow, scope: MyFlowCalendarScope): boolean {
  if (scope === 'map') return Boolean(row.flow.savedMap);
  if (scope === 'schedule') return row.flow.bundle.flow.structure_type !== 'routine';
  if (scope === 'routine') return row.flow.bundle.flow.structure_type === 'routine';
  return true;
}

function getMyFlowCalendarShortTitle(title: string): string {
  if (title.length <= 8) return title;
  return `${title.slice(0, 7)}...`;
}

function getMyFlowRoutineIcon(row: MyFlowCalendarRow): string {
  const text = [
    row.flow.bundle.flow.title,
    row.flow.bundle.flow.category,
    row.title,
    row.section,
  ]
    .join(' ')
    .toLowerCase();
  if (/공부|영어|study|learn|시험/.test(text)) return '✎';
  if (/러닝|러너|달리|5km|running|run/.test(text)) return '🏃';
  if (/운동|홈트|workout|fitness|body/.test(text)) return '🏋';
  if (/이유식|식단|식사|meal|food|menu/.test(text)) return '🍽';
  return '↻';
}

function getMyFlowRoutineIconKind(row: MyFlowCalendarRow): MyFlowRoutineIconKind {
  const text = [
    row.flow.bundle.flow.title,
    row.flow.bundle.flow.category,
    row.title,
    row.section,
  ]
    .join(' ')
    .toLowerCase();
  if (/공부|영어|study|learn|시험/.test(text)) return 'study';
  if (/러닝|러너|달리|5km|running|run/.test(text)) return 'running';
  if (/운동|홈트|workout|fitness|body/.test(text)) return 'workout';
  if (/이유식|식단|식사|meal|food|menu/.test(text)) return 'meal';
  if (/aircon|washer|filter|clean|maintenance|에어컨|세탁기|필터|청소|관리|가전/.test(text)) return 'maintenance';
  return 'routine';
}

function renderMyFlowRoutineIcon(kind: MyFlowRoutineIconKind) {
  const commonProps = {
    className: 'h-3.5 w-3.5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  };

  if (kind === 'study') {
    return (
      <svg {...commonProps}>
        <path d="M4 19.5V5.8A2.8 2.8 0 0 1 6.8 3H20v17H6.8A2.8 2.8 0 0 0 4 22" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
      </svg>
    );
  }
  if (kind === 'running') {
    return (
      <svg {...commonProps}>
        <circle cx="13" cy="4" r="2" />
        <path d="m10 17 3-5 3 2" />
        <path d="m8 22 2-5" />
        <path d="m16 14 2 4 3 2" />
        <path d="m7 9 4-2 2 3" />
      </svg>
    );
  }
  if (kind === 'workout') {
    return (
      <svg {...commonProps}>
        <path d="M6 7v10" />
        <path d="M18 7v10" />
        <path d="M3 9v6" />
        <path d="M21 9v6" />
        <path d="M6 12h12" />
      </svg>
    );
  }
  if (kind === 'meal') {
    return (
      <svg {...commonProps}>
        <path d="M7 3v8" />
        <path d="M4 3v4a3 3 0 0 0 6 0V3" />
        <path d="M7 11v10" />
        <path d="M17 3v18" />
        <path d="M14 7h6" />
      </svg>
    );
  }
  if (kind === 'maintenance') {
    return (
      <svg {...commonProps}>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4" />
        <path d="m15 5 4 4" />
      </svg>
    );
  }
  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v4l2.5 2" />
    </svg>
  );
}

function findFirstMyFlowDateInMonth(rows: MyFlowCalendarRow[], monthDate: string): string {
  const month = monthDate.slice(0, 7);
  return rows.find((row) => row.date?.startsWith(month))?.date ?? getMyFlowMonthStart(monthDate);
}

function findMyFlowDefaultFocusDate(rows: MyFlowCalendarRow[], todayDate: string, fallbackDate: string): string {
  const datedRows = Array.from(
    new Set(rows
      .map((row) => row.date)
      .filter((date): date is string => Boolean(date))),
  ).sort();
  if (datedRows.length === 0) return getMyFlowMonthStart(fallbackDate);
  if (datedRows.includes(todayDate)) return todayDate;
  const nextDate = datedRows.find((date) => date >= todayDate);
  if (nextDate) return nextDate;
  return datedRows[datedRows.length - 1] ?? getMyFlowMonthStart(fallbackDate);
}

type MyFlowView = 'today' | 'calendar' | 'flow' | 'checklist' | 'routine';
type MyFlowsProps = {
  initialView?: Extract<MyFlowView, 'today' | 'calendar' | 'flow'>;
  surface?: 'my' | 'calendar';
};

export function MyFlows({ initialView = 'today', surface = 'my' }: MyFlowsProps = {}) {
  const { bundles } = useBundles();
  const myFlowBundles = useMemo(() => mergeSourceBackedMyFlowBundles(bundles), [bundles]);
  const currentUser = getCurrentUser();
  const isCalendarSurface = surface === 'calendar';
  const [savedMapIdParam, setSavedMapIdParam] = useState('');
  const [activeProgress, setActiveProgress] = useState<ReturnType<typeof getActiveFlowProgress>>([]);
  const [savedView, setSavedView] = useState<MyFlowView>(initialView);
  const [myFlowVisibleMonth, setMyFlowVisibleMonth] = useState(getMyFlowMonthStart(formatDate(new Date())));
  const [myFlowSelectedDate, setMyFlowSelectedDate] = useState(formatDate(new Date()));
  const [selectedSavedFlowSlug, setSelectedSavedFlowSlug] = useState('all');
  const [myFlowCalendarScope, setMyFlowCalendarScope] = useState<MyFlowCalendarScope>('all');
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter>('all');
  const [flowListFilter, setFlowListFilter] = useState<FlowListFilter>('all');
  const [flowListQuery, setFlowListQuery] = useState('');
  const [checksBySlug, setChecksBySlug] = useState<Record<string, Record<string, boolean>>>({});
  const [savedFlowMapBySlug, setSavedFlowMapBySlug] = useState<Record<string, SavedFlowMapSnapshot>>({});
  const [myFlowDateOverrides, setMyFlowDateOverrides] = useState<Record<string, string>>({});
  const [myFlowHiddenFlowSlugs, setMyFlowHiddenFlowSlugs] = useState<string[]>([]);
  const [myFlowItemDrafts, setMyFlowItemDrafts] = useState<Record<string, MyFlowItemDraft>>({});
  const [myFlowEditingDrafts, setMyFlowEditingDrafts] = useState<Record<string, MyFlowItemDraft>>({});
  const [myFlowStepItemChecks, setMyFlowStepItemChecks] = useState<MyFlowStepItemChecks>({});
  const [myFlowRoutineRuleDrafts, setMyFlowRoutineRuleDrafts] = useState<Record<string, MyFlowRoutineRuleDraft>>({});
  const [myFlowRoutineRuleEditorDrafts, setMyFlowRoutineRuleEditorDrafts] = useState<Record<string, MyFlowRoutineRuleDraft>>({});
  const [myFlowExpandedRoutineKey, setMyFlowExpandedRoutineKey] = useState('');
  const [myFlowExpandedAdvancedKey, setMyFlowExpandedAdvancedKey] = useState('');
  const [myFlowExpandedMemoKey, setMyFlowExpandedMemoKey] = useState('');
  const [myFlowEditingDetailKey, setMyFlowEditingDetailKey] = useState('');
  const [myFlowActiveRowKey, setMyFlowActiveRowKey] = useState('');
  const [myFlowDetailSurface, setMyFlowDetailSurface] = useState<MyFlowView | 'post-save' | ''>('');
  const [myFlowDetailOpen, setMyFlowDetailOpen] = useState(false);
  const [myFlowExpandedStructureSlug, setMyFlowExpandedStructureSlug] = useState('');
  const [myFlowExpandedStructureStepSlug, setMyFlowExpandedStructureStepSlug] = useState('');
  const [myFlowRoutineCompletionUndo, setMyFlowRoutineCompletionUndo] = useState<MyFlowRoutineCompletionUndo | null>(null);
  const [myFlowInventoryOpen, setMyFlowInventoryOpen] = useState(false);
  const [myFlowTodayCompletedOpen, setMyFlowTodayCompletedOpen] = useState(false);
  const [myFlowRoutineOverflowDate, setMyFlowRoutineOverflowDate] = useState('');
  const [myFlowScheduleOverflowDate, setMyFlowScheduleOverflowDate] = useState('');
  const [myFlowRoutineBoardsOpen, setMyFlowRoutineBoardsOpen] = useState(false);
  const [myFlowChecklistPickerOpen, setMyFlowChecklistPickerOpen] = useState(false);
  const [myFlowStatusSheet, setMyFlowStatusSheet] = useState<MyFlowStatusSheet | null>(null);
  const [myFlowInventorySheetOpen, setMyFlowInventorySheetOpen] = useState(false);
  const [myFlowLargeInventoryOpen, setMyFlowLargeInventoryOpen] = useState(false);
  const [myFlowDismissedMapUpdates, setMyFlowDismissedMapUpdates] = useState<MyFlowDismissedMapUpdates>({});
  const [myFlowExpandedMapUpdateId, setMyFlowExpandedMapUpdateId] = useState('');
  const [myFlowAppliedMapUpdateId, setMyFlowAppliedMapUpdateId] = useState('');
  const [myFlowHandledSavedMapId, setMyFlowHandledSavedMapId] = useState('');
  const [myFlowPostSaveWorkspaceOpen, setMyFlowPostSaveWorkspaceOpen] = useState(false);
  const [myFlowStepCopiedKey, setMyFlowStepCopiedKey] = useState('');
  const [myFlowStepDownloadedKey, setMyFlowStepDownloadedKey] = useState('');
  const [isMyFlowMobileViewport, setIsMyFlowMobileViewport] = useState(false);
  const [myFlowDemoMode, setMyFlowDemoMode] = useState<MyFlowDemoMode | null>(null);
  const [myFlowRoutineIconLimit, setMyFlowRoutineIconLimit] = useState(MY_FLOW_ROUTINE_ICON_LIMIT);
  const isMyFlowScenarioDemo = myFlowDemoMode === 'ux12' || myFlowDemoMode === 'ux20' || myFlowDemoMode === 'source-backed';
  const myFlowCalendarCardRef = useRef<HTMLElement | null>(null);
  const myFlowSelectedDayRef = useRef<HTMLElement | null>(null);
  const myFlowInlineDetailRef = useRef<HTMLDivElement | null>(null);
  const myFlowOverviewSummaryRef = useRef<HTMLElement | null>(null);
  const myFlowWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const myFlowDraggingRoutineKeyRef = useRef('');
  const myFlowDraggingRoutineDateRef = useRef('');
  const showDemoData = Boolean(myFlowDemoMode);
  const savedViewTabs = [
    ['today', '오늘'],
    ['calendar', '캘린더'],
    ['flow', '전체'],
  ] as const;
  const checklistFilterTabs = [
    ['all', '전체'],
    ['open', '남은 항목'],
    ['done', '완료'],
  ] as const;
  const flowListFilterTabs = [
    ['all', '전체'],
    ['open', '진행 중'],
    ['routine', '루틴'],
    ['done', '완료'],
    ...(myFlowHiddenFlowSlugs.length > 0 ? [['hidden', '숨김'] as const] : []),
  ] as const;
  const closeMyFlowTransientDetail = () => {
    setMyFlowActiveRowKey('');
    setMyFlowDetailSurface('');
    setMyFlowDetailOpen(false);
    setMyFlowExpandedStructureSlug('');
    setMyFlowExpandedStructureStepSlug('');
    setMyFlowEditingDetailKey('');
    setMyFlowExpandedAdvancedKey('');
    setMyFlowExpandedMemoKey('');
    setMyFlowExpandedRoutineKey('');
    setMyFlowRoutineOverflowDate('');
    setMyFlowScheduleOverflowDate('');
  };
  const selectMyFlowView = (id: typeof savedViewTabs[number][0]) => {
    setMyFlowPostSaveWorkspaceOpen(true);
    closeMyFlowTransientDetail();
    setSavedView(id);
    if (id !== 'flow') setMyFlowExpandedStructureSlug('');
    setMyFlowStatusSheet(null);
    setMyFlowInventorySheetOpen(false);
    if (id !== 'calendar' || typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return;
    window.setTimeout(() => {
      myFlowCalendarCardRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }, 0);
  };
  const openMyFlowFilteredInventory = (filter: 'all' | 'open' | 'routine' | 'done') => {
    setSavedView('flow');
    setMyFlowStatusSheet(null);
    setFlowListFilter(filter);
    setFlowListQuery('');
    setMyFlowInventoryOpen(true);
    setMyFlowLargeInventoryOpen(false);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      setMyFlowInventorySheetOpen(true);
      return;
    }
    window.setTimeout(() => {
      myFlowOverviewSummaryRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 0);
  };
  const scrollMyFlowSelectedDayOnMobile = () => {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return;
    window.setTimeout(() => {
      const selectedDay = myFlowSelectedDayRef.current;
      if (!selectedDay) return;
      selectedDay.scrollIntoView({ block: 'start', behavior: 'auto' });
      window.setTimeout(() => {
        const top = selectedDay.getBoundingClientRect().top;
        if (top > 120) window.scrollBy({ top: top - 104, behavior: 'auto' });
      }, 0);
    }, 0);
  };
  const scrollMyFlowInlineDetailIntoView = (detail = myFlowInlineDetailRef.current) => {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches || !detail) return;
    window.setTimeout(() => {
      const rect = detail.getBoundingClientRect();
      if (rect.top < 72 || rect.top > window.innerHeight - 180) {
        detail.scrollIntoView({ block: 'start', behavior: 'auto' });
        window.setTimeout(() => {
          const nextTop = detail.getBoundingClientRect().top;
          if (nextTop > 88) window.scrollBy({ top: nextTop - 88, behavior: 'auto' });
          const nextRect = detail.getBoundingClientRect();
          const bottomLimit = window.innerHeight - 104;
          if (nextRect.bottom > bottomLimit && nextRect.top > 72) {
            window.scrollBy({ top: Math.min(nextRect.bottom - bottomLimit, nextRect.top - 72), behavior: 'auto' });
          }
        }, 0);
        return;
      }
      const bottomLimit = window.innerHeight - 104;
      if (rect.bottom > bottomLimit && rect.top > 72) {
        window.scrollBy({ top: Math.min(rect.bottom - bottomLimit, rect.top - 72), behavior: 'auto' });
      }
    }, 0);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    setSavedMapIdParam(params.get('savedMap') ?? '');
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const mobileFlowQuery = window.matchMedia('(max-width: 767px)');
    const syncRoutineIconLimit = () => {
      setMyFlowRoutineIconLimit(mediaQuery.matches ? 1 : MY_FLOW_ROUTINE_ICON_LIMIT);
    };
    const syncMobileFlowViewport = () => {
      setIsMyFlowMobileViewport(mobileFlowQuery.matches);
      if (!mobileFlowQuery.matches) setMyFlowInventorySheetOpen(false);
    };
    syncRoutineIconLimit();
    syncMobileFlowViewport();
    mediaQuery.addEventListener('change', syncRoutineIconLimit);
    mobileFlowQuery.addEventListener('change', syncMobileFlowViewport);
    return () => {
      mediaQuery.removeEventListener('change', syncRoutineIconLimit);
      mobileFlowQuery.removeEventListener('change', syncMobileFlowViewport);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isMyFlowMobileViewport || !myFlowDetailOpen || !myFlowActiveRowKey) return;
    scrollMyFlowInlineDetailIntoView();
  }, [isMyFlowMobileViewport, myFlowActiveRowKey, myFlowDetailOpen, savedView]);

  const refreshSavedFlowState = () => {
    const progress = getActiveFlowProgress(myFlowBundles);
    setActiveProgress(progress);
    setChecksBySlug(Object.fromEntries(progress.map((item) => [item.slug, getChecks(item.slug)])));
    setSavedFlowMapBySlug(getSavedFlowMapIndexByFlowSlug());
    setMyFlowStepItemChecks(getMyFlowStepItemChecks());
  };

  useEffect(() => {
    const demoMode = getMyFlowDemoMode();
    setMyFlowDemoMode(demoMode);
    if (demoMode === 'ux12' || demoMode === 'ux20' || demoMode === 'source-backed') {
      const demoState = buildMyFlowDemoState(myFlowBundles, getMyFlowDemoFixtures(demoMode));
      setActiveProgress(demoState.progress);
      setChecksBySlug(demoState.checksBySlug);
      setSavedFlowMapBySlug(demoState.savedFlowMapBySlug);
      setSelectedSavedFlowSlug('all');
      setSavedView(initialView);
      setMyFlowVisibleMonth(getMyFlowMonthStart('2026-05-28'));
      setMyFlowSelectedDate('2026-05-28');
      setFlowListFilter('all');
      setFlowListQuery('');
      setMyFlowDateOverrides({});
      setMyFlowHiddenFlowSlugs([]);
      setMyFlowItemDrafts({});
      setMyFlowEditingDrafts({});
      setMyFlowStepItemChecks({});
      setMyFlowRoutineRuleDrafts({});
      setMyFlowRoutineRuleEditorDrafts({});
      setMyFlowExpandedRoutineKey('');
      setMyFlowExpandedAdvancedKey('');
      setMyFlowExpandedMemoKey('');
      setMyFlowEditingDetailKey('');
      setMyFlowActiveRowKey('');
      setMyFlowDetailSurface('');
      setMyFlowDetailOpen(false);
      setMyFlowExpandedStructureSlug('');
      setMyFlowExpandedStructureStepSlug('');
      setMyFlowInventoryOpen(false);
      setMyFlowTodayCompletedOpen(false);
      setMyFlowRoutineOverflowDate('');
      setMyFlowScheduleOverflowDate('');
      setMyFlowRoutineBoardsOpen(false);
      setMyFlowChecklistPickerOpen(false);
      setMyFlowStatusSheet(null);
      setMyFlowInventorySheetOpen(false);
      setMyFlowPostSaveWorkspaceOpen(false);
      setMyFlowDismissedMapUpdates({});
      setMyFlowExpandedMapUpdateId('');
      setMyFlowAppliedMapUpdateId('');
      return;
    }
    if (demoMode === 'legacy') seedMyFlowDemoState(myFlowBundles);
    setMyFlowItemDrafts(getStoredMyFlowItemDrafts());
    setMyFlowDateOverrides(getStoredMyFlowDateOverrides());
    setMyFlowHiddenFlowSlugs(getStoredMyFlowHiddenFlowSlugs());
    setMyFlowDismissedMapUpdates(getMyFlowDismissedMapUpdates());
    setMyFlowExpandedMapUpdateId('');
    setMyFlowAppliedMapUpdateId('');
    refreshSavedFlowState();
  }, [initialView, myFlowBundles]);

  const demoFixtureBySlug = new Map(getMyFlowDemoFixtures(myFlowDemoMode).map((fixture) => [fixture.slug, fixture]));

  const savedFlows: MySavedFlow[] = activeProgress.reduce<MySavedFlow[]>((items, progress) => {
      const progressBundle = myFlowBundles.find((entry) => entry.flow.slug === progress.slug);
      if (!progressBundle) return items;
      const demoFixture = demoFixtureBySlug.get(progress.slug);
      const anchor = progress.anchor ?? '';
      const checks = checksBySlug[progress.slug] ?? {};
      const rows = getMyFlowRows(progressBundle, anchor);
      const executableIds = getExecutableCheckIds(progressBundle, anchor);
      const savedMap = savedFlowMapBySlug[progress.slug];
      const total = Math.max(executableIds.filter((id) => !isItemStateSkipped(getItemStates(progress.slug), id)).length, progress.total);
      const done = executableIds.filter((id) => checks[id] && !isItemStateSkipped(getItemStates(progress.slug), id)).length;
      const anchorDisplay = getMyFlowAnchorDisplay(progressBundle, anchor, myFlowDemoMode);
      const meta = [
        anchorDisplay,
        `${done}/${total} 완료`,
        progress.skipped ? `${progress.skipped}개 제외` : null,
      ].filter(Boolean).join(' · ');
      items.push({
        progress,
        bundle: progressBundle,
        anchor,
        checks,
        rows,
        done,
        total,
        percent: total ? Math.round((done / total) * 100) : 0,
        meta,
        ...(savedMap ? { savedMap } : {}),
        ...(demoFixture ? { demoGroup: demoFixture.group, demoNote: demoFixture.note } : {}),
      });
      return items;
    }, []);

  useEffect(() => {
    if (selectedSavedFlowSlug !== 'all' && !savedFlows.some((flow) => flow.progress.slug === selectedSavedFlowSlug)) {
      setSelectedSavedFlowSlug('all');
    }
  }, [selectedSavedFlowSlug, savedFlows]);

  const visibleSavedFlows = selectedSavedFlowSlug === 'all'
    ? savedFlows
    : savedFlows.filter((flow) => flow.progress.slug === selectedSavedFlowSlug);
  const savedFlowMapSnapshots = Array.from(
    Object.values(savedFlowMapBySlug).reduce((snapshots, snapshot) => snapshots.set(snapshot.mapId, snapshot), new Map<string, SavedFlowMapSnapshot>()).values(),
  );
  const myFlowMapUpdateNotices = savedFlowMapSnapshots.flatMap((snapshot) => {
    const notice = getMyFlowMapUpdateNotice(snapshot);
    if (notice && isMyFlowMapUpdateDismissed(notice, myFlowDismissedMapUpdates)) return [];
    return notice ? [notice] : [];
  });
  const postSaveMap = savedMapIdParam ? savedFlowMapSnapshots.find((snapshot) => snapshot.mapId === savedMapIdParam) : undefined;
  const postSaveFlows = postSaveMap
    ? savedFlows.filter((flow) => postSaveMap.flowSlugs.includes(flow.progress.slug))
    : [];
  const hasPostSavePanel = Boolean(postSaveMap && postSaveFlows.length > 0 && (!isMyFlowScenarioDemo || savedMapIdParam));
  const showPostSavePanel = hasPostSavePanel && !myFlowPostSaveWorkspaceOpen;
  const showMyFlowWorkspace = savedFlows.length > 0;
  const shouldCollapseFlowInventory =
    savedFlows.length >= 6 &&
    selectedSavedFlowSlug === 'all' &&
    flowListFilter === 'all' &&
    flowListQuery.trim().length === 0;
  const shouldGroupFlowInventory = savedFlows.length >= 20 || isMyFlowScenarioDemo;
  const showMyFlowSidebar = savedFlows.length > 1 && savedFlows.length < 20 && savedView === 'flow';
  const showFlowInventory = !shouldCollapseFlowInventory || myFlowInventoryOpen;
  const showMyFlowScopeControl = !isMyFlowMobileViewport && savedFlows.length > 1;
  const getSavedFlowNextRow = (flow: MySavedFlow) =>
    flow.rows.find((row) => !isMyFlowRowChecked(flow, row)) ?? flow.rows[0];
  const getMyFlowRoutineWeekdays = (flow: MySavedFlow) =>
    myFlowRoutineRuleDrafts[flow.progress.slug]?.weekdays ?? getRoutineWeekdayLabels(flow.bundle.repeatRules?.[0] ?? '', []);
  const getMyFlowRoutineDraft = (flow: MySavedFlow): MyFlowRoutineRuleDraft => ({
    scope: 'this',
    ...myFlowRoutineRuleDrafts[flow.progress.slug],
    weekdays: getMyFlowRoutineWeekdays(flow),
  });
  const getMyFlowRoutineEditorDraft = (flow: MySavedFlow): MyFlowRoutineRuleDraft => ({
    ...getMyFlowRoutineDraft(flow),
    ...myFlowRoutineRuleEditorDrafts[flow.progress.slug],
  });
  const openMyFlowRoutineRuleEditor = (flow: MySavedFlow, routineKey: string) => {
    setMyFlowRoutineRuleEditorDrafts((current) => ({
      ...current,
      [flow.progress.slug]: current[flow.progress.slug] ?? getMyFlowRoutineDraft(flow),
    }));
    setMyFlowExpandedRoutineKey(routineKey);
  };
  const updateMyFlowRoutineRuleDraft = (flow: MySavedFlow, patch: MyFlowRoutineRuleDraft) => {
    setMyFlowRoutineRuleDrafts((current) => ({
      ...current,
      [flow.progress.slug]: {
        ...getMyFlowRoutineDraft(flow),
        ...patch,
      },
    }));
  };
  const updateMyFlowRoutineRuleEditorDraft = (flow: MySavedFlow, patch: MyFlowRoutineRuleDraft) => {
    setMyFlowRoutineRuleEditorDrafts((current) => ({
      ...current,
      [flow.progress.slug]: {
        ...(current[flow.progress.slug] ?? getMyFlowRoutineDraft(flow)),
        ...patch,
      },
    }));
  };
  const cancelMyFlowRoutineRuleEditorDraft = (flow: MySavedFlow) => {
    setMyFlowRoutineRuleEditorDrafts((current) => {
      const next = { ...current };
      delete next[flow.progress.slug];
      return next;
    });
    setMyFlowExpandedRoutineKey('');
  };
  const applyMyFlowRoutineRuleEditorDraft = (flow: MySavedFlow) => {
    const nextDraft = getMyFlowRoutineEditorDraft(flow);
    updateMyFlowRoutineRuleDraft(flow, nextDraft);
  };
  const baseCalendarRows: MyFlowCalendarRow[] = visibleSavedFlows.flatMap((flow) =>
    flow.rows
      .filter((row) => row.date)
      .map((row) => {
        const originalDate = row.date ?? '';
        const calendarKey = getMyFlowCalendarRowKey(flow.progress.slug, row.id, originalDate);
        return {
          ...row,
          flow,
          originalDate,
          calendarKey,
          date: myFlowDateOverrides[calendarKey] ?? row.date,
        };
      }),
  );
  const manuallyScheduledRows: MyFlowCalendarRow[] = visibleSavedFlows.flatMap((flow) =>
    flow.rows
      .filter((row) => !row.date)
      .flatMap((row) => {
        const calendarKey = getMyFlowManualScheduleKey(flow.progress.slug, row.id);
        const date = myFlowDateOverrides[calendarKey];
        if (!date) return [];
        return [{
          ...row,
          flow,
          originalDate: 'none',
          calendarKey,
          date,
        }];
      }),
  );
  const generatedRoutineRows: MyFlowCalendarRow[] = visibleSavedFlows.flatMap((flow) => {
    if (flow.bundle.flow.structure_type !== 'routine' || !flow.anchor) return [];
    if (baseCalendarRows.some((row) => row.flow.progress.slug === flow.progress.slug)) return [];
    const nextRow = getSavedFlowNextRow(flow);
    if (!nextRow) return [];
    const routineWeekdays = getMyFlowRoutineWeekdays(flow);
    const routineEndDate = myFlowRoutineRuleDrafts[flow.progress.slug]?.endDate;
    return expandRoutineOccurrences({
      startDate: flow.anchor,
      repeatLabel: flow.bundle.repeatRules?.[0] ?? '',
      weekdays: routineWeekdays,
      weeks: 4,
    }).filter((occurrence) => !routineEndDate || occurrence.date <= routineEndDate).map((occurrence) => {
      const originalDate = occurrence.date;
      const calendarKey = getMyFlowCalendarRowKey(flow.progress.slug, nextRow.id, originalDate);
      return {
        ...nextRow,
        originalDate,
        calendarKey,
        date: myFlowDateOverrides[calendarKey] ?? originalDate,
        timing: nextRow.timing ?? `${occurrence.sessionIndex}회차 · ${occurrence.weekday}요일`,
        section: nextRow.section || '루틴',
        flow,
      };
    });
  });
  const calendarRows = [...baseCalendarRows, ...manuallyScheduledRows, ...generatedRoutineRows].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const calendarScheduleRows = calendarRows.filter((row) => row.flow.bundle.flow.structure_type !== 'routine');
  const calendarRoutineRows = calendarRows.filter((row) => row.flow.bundle.flow.structure_type === 'routine');
  const calendarScopedRows = calendarRows.filter((row) => isMyFlowCalendarRowInScope(row, myFlowCalendarScope));
  const calendarScopedDateSignature = calendarScopedRows.map((row) => row.date ?? '').join('|');
  const calendarScopedScheduleRows = calendarScopedRows.filter((row) => row.flow.bundle.flow.structure_type !== 'routine');
  const calendarScopedRoutineRows = calendarScopedRows.filter((row) => row.flow.bundle.flow.structure_type === 'routine');
  const myFlowTodayDate = showDemoData ? '2026-05-28' : formatDate(new Date());
  const calendarAnchor =
    showDemoData && selectedSavedFlowSlug === 'all' && !isCalendarSurface
      ? myFlowTodayDate
      : calendarRows[0]?.date || visibleSavedFlows[0]?.anchor || myFlowTodayDate;
  const calendarCells = getMyFlowMonthCells(myFlowVisibleMonth);
  const monthAllCalendarRows = calendarRows.filter((row) => row.date?.startsWith(myFlowVisibleMonth.slice(0, 7)));
  const monthCalendarRows = calendarScopedRows.filter((row) => row.date?.startsWith(myFlowVisibleMonth.slice(0, 7)));
  const myFlowCalendarScopeTotalCounts: Record<MyFlowCalendarScope, number> = {
    all: calendarRows.length,
    map: calendarRows.filter((row) => Boolean(row.flow.savedMap)).length,
    schedule: calendarScheduleRows.length,
    routine: calendarRoutineRows.length,
  };
  const getMyFlowRowStatusLabel = (row?: { date?: string } | null) => {
    if (!row?.date) return '먼저 할 일';
    if (row.date < myFlowTodayDate) return '지난 할 일';
    if (row.date === myFlowTodayDate) return '오늘 할 일';
    return '다음 할 일';
  };
  const myFlowCalendarScopeMonthCounts: Record<MyFlowCalendarScope, number> = {
    all: monthAllCalendarRows.length,
    map: monthAllCalendarRows.filter((row) => Boolean(row.flow.savedMap)).length,
    schedule: monthAllCalendarRows.filter((row) => row.flow.bundle.flow.structure_type !== 'routine').length,
    routine: monthAllCalendarRows.filter((row) => row.flow.bundle.flow.structure_type === 'routine').length,
  };
  const myFlowCalendarScopeOptions: Array<{ id: MyFlowCalendarScope; label: string; count: number }> = [
    { id: 'all', label: '전체', count: myFlowCalendarScopeMonthCounts.all },
    ...(myFlowCalendarScopeTotalCounts.map > 0 && myFlowCalendarScopeTotalCounts.map < myFlowCalendarScopeTotalCounts.all
      ? [{ id: 'map' as const, label: '저장한 일정', count: myFlowCalendarScopeMonthCounts.map }]
      : []),
    ...(myFlowCalendarScopeTotalCounts.schedule > 0 && myFlowCalendarScopeTotalCounts.schedule < myFlowCalendarScopeTotalCounts.all
      ? [{ id: 'schedule' as const, label: '일정', count: myFlowCalendarScopeMonthCounts.schedule }]
      : []),
    ...(myFlowCalendarScopeTotalCounts.routine > 0
      ? [{ id: 'routine' as const, label: '루틴', count: myFlowCalendarScopeMonthCounts.routine }]
      : []),
  ];
  const showMyFlowCalendarScopeFilter = myFlowCalendarScopeOptions.length > 1;
  const myFlowCalendarScopeLabel = myFlowCalendarScopeOptions.find((option) => option.id === myFlowCalendarScope)?.label ?? '전체';
  const moveMyFlowCalendarMonth = (nextMonth: string) => {
    setMyFlowVisibleMonth(nextMonth);
    setMyFlowSelectedDate(findFirstMyFlowDateInMonth(calendarScopedRows, nextMonth));
    setMyFlowActiveRowKey('');
    setMyFlowRoutineOverflowDate('');
    setMyFlowScheduleOverflowDate('');
    setMyFlowExpandedMemoKey('');
    setMyFlowEditingDetailKey('');
    setMyFlowDetailSurface('');
    setMyFlowDetailOpen(false);
  };
  const selectMyFlowCalendarScope = (scope: MyFlowCalendarScope) => {
    const scopedRows = calendarRows.filter((row) => isMyFlowCalendarRowInScope(row, scope));
    setMyFlowCalendarScope(scope);
    setMyFlowSelectedDate(findFirstMyFlowDateInMonth(scopedRows, myFlowVisibleMonth));
    setMyFlowActiveRowKey('');
    setMyFlowRoutineOverflowDate('');
    setMyFlowScheduleOverflowDate('');
    setMyFlowExpandedRoutineKey('');
    setMyFlowExpandedAdvancedKey('');
    setMyFlowExpandedMemoKey('');
    setMyFlowEditingDetailKey('');
    setMyFlowDetailSurface('');
    setMyFlowDetailOpen(false);
  };
  const myFlowWeekEndDate = formatDate(addDays(new Date(`${myFlowTodayDate}T00:00:00`), 7));
  const todayScheduleRows = calendarScheduleRows.filter((row) => row.date === myFlowTodayDate);
  const todayRoutineRows = calendarRoutineRows.filter((row) => row.date === myFlowTodayDate);
  const overdueRows = calendarScheduleRows
    .filter((row) => row.date && row.date < myFlowTodayDate && !isMyFlowRowChecked(row.flow, row))
    .slice(0, 6);
  const upcomingRows = calendarScheduleRows
    .filter((row) => row.date && row.date > myFlowTodayDate && row.date <= myFlowWeekEndDate && !isMyFlowRowChecked(row.flow, row))
    .slice(0, 6);
  const todayAllRows = [...todayScheduleRows, ...todayRoutineRows];
  const todayOpenRows = todayAllRows.filter((row) => !isMyFlowRowChecked(row.flow, row));
  const todayCompletedRows = todayAllRows.filter((row) => isMyFlowRowChecked(row.flow, row));
  const todayOpenScheduleRows = todayScheduleRows.filter((row) => !isMyFlowRowChecked(row.flow, row));
  const todayOpenRoutineRows = todayRoutineRows.filter((row) => !isMyFlowRowChecked(row.flow, row));
  const todayOpenCount = todayOpenRows.length;
  const routineNextRows = Array.from(
    calendarRoutineRows
      .filter((row) => row.date && row.date >= myFlowTodayDate && !isMyFlowRowChecked(row.flow, row))
      .reduce<Map<string, MyFlowCalendarRow>>((nextRows, row) => {
        if (!nextRows.has(row.flow.progress.slug)) nextRows.set(row.flow.progress.slug, row);
        return nextRows;
      }, new Map())
      .values(),
  ).slice(0, 3);
  const myFlowFallbackNextRows: MyFlowCalendarRow[] = visibleSavedFlows
    .map((flow) => {
      const row = getSavedFlowNextRow(flow);
      if (!row) return null;
      return { ...row, flow };
    })
    .filter((row): row is MyFlowCalendarRow => Boolean(row));
  const myFlowFallbackFutureRows = myFlowFallbackNextRows.filter((row) => row.date && row.date > myFlowTodayDate);
  const myFlowFallbackUndatedRows = myFlowFallbackNextRows.filter((row) => !row.date);
  const myFlowFallbackPastRows = myFlowFallbackNextRows.filter((row) => row.date && row.date < myFlowTodayDate);
  const myFlowExecutionCandidateRows = [
    ...todayOpenRows,
    ...overdueRows,
    ...upcomingRows,
    ...routineNextRows,
    ...myFlowFallbackFutureRows,
    ...myFlowFallbackUndatedRows,
    ...myFlowFallbackPastRows,
  ];
  const postSaveFlowSlugSet = new Set(postSaveFlows.map((flow) => flow.progress.slug));
  const postSaveContinuationRows = showPostSavePanel
    ? myFlowExecutionCandidateRows.reduce<MyFlowCalendarRow[]>((rows, row) => {
        if (!postSaveFlowSlugSet.has(row.flow.progress.slug)) return rows;
        const key = getMyFlowRowInstanceKey(row);
        if (rows.some((existing) => getMyFlowRowInstanceKey(existing) === key)) return rows;
        rows.push(row);
        return rows;
      }, []).slice(0, 1)
    : [];
  const postSavePrimaryContinuationRow = postSaveContinuationRows[0] ?? null;
  const hasMyFlowContinuationCandidate = postSaveContinuationRows.length > 0 || myFlowExecutionCandidateRows.length > 0;
  const myFlowNextDatedSummaryRow = [
    ...upcomingRows,
    ...routineNextRows,
    ...myFlowFallbackFutureRows,
  ].find((row) => row.date && row.date > myFlowTodayDate);
  const myFlowTodaySummaryCopy =
    todayOpenCount > 0
      ? `오늘 ${todayOpenCount}개 남았어요.`
      : overdueRows.length > 0
        ? `오늘 예정된 할 일은 없고 지난 할 일 ${overdueRows.length}개가 남았어요.`
        : myFlowNextDatedSummaryRow?.date
          ? `오늘 예정된 할 일이 없어요. 다음 할 일은 ${formatMyFlowDisplayDate(myFlowNextDatedSummaryRow.date)}이에요.`
          : hasMyFlowContinuationCandidate
            ? '오늘 예정된 일정은 없어요. 먼저 열 항목이 준비되어 있어요.'
            : visibleSavedFlows.length > 0
              ? '오늘 예정된 일정은 없어요.'
              : '저장한 콘텐츠가 아직 없어요.';
  const myFlowContinuationRows = [
    ...postSaveContinuationRows,
    ...myFlowExecutionCandidateRows,
  ].reduce<MyFlowCalendarRow[]>((rows, row) => {
    if (rows.some((existing) => getMyFlowRowInstanceKey(existing) === getMyFlowRowInstanceKey(row))) return rows;
    rows.push(row);
    return rows;
  }, []).slice(0, 4);
  const myFlowPrimaryContinuationRow = myFlowContinuationRows[0] ?? null;
  const myFlowPrimaryContinuationKey = myFlowPrimaryContinuationRow ? getMyFlowRowInstanceKey(myFlowPrimaryContinuationRow) : '';
  const myFlowPrimaryContinuationIsToday = Boolean(myFlowPrimaryContinuationRow?.date && myFlowPrimaryContinuationRow.date === myFlowTodayDate);
  const myFlowPrimaryContinuationIsOverdue = Boolean(myFlowPrimaryContinuationRow?.date && myFlowPrimaryContinuationRow.date < myFlowTodayDate);
  const myFlowPrimaryContinuationIsFuture = Boolean(myFlowPrimaryContinuationRow?.date && myFlowPrimaryContinuationRow.date > myFlowTodayDate);
  const myFlowNowEyebrow = !myFlowPrimaryContinuationRow
    ? '지금 이어하기'
    : myFlowPrimaryContinuationIsToday
      ? '오늘 실행'
      : myFlowPrimaryContinuationIsOverdue
        ? '지난 할 일'
        : myFlowPrimaryContinuationIsFuture
          ? '다음 할 일'
          : '먼저 할 일';
  const getMyFlowRowDraft = (row: MyFlowCalendarRow) => myFlowItemDrafts[getMyFlowRowInstanceKey(row)] ?? {};
  const getMyFlowRowDisplayTitle = (row: MyFlowCalendarRow) => toUserFacingSourceTitle(getMyFlowRowDraft(row).title ?? row.title);
  const myFlowNowVisibleCount = myFlowPrimaryContinuationRow ? 1 : 0;
  const myFlowNowTitle = myFlowPrimaryContinuationRow
    ? myFlowPrimaryContinuationIsToday
      ? `${myFlowNowVisibleCount}개 남음`
      : myFlowPrimaryContinuationIsOverdue
        ? `${myFlowNowVisibleCount}개 남음`
        : myFlowPrimaryContinuationIsFuture
          ? `${myFlowNowVisibleCount}개 예정`
          : `${myFlowNowVisibleCount}개 대기`
    : '이어갈 할 일이 없습니다';
  const myFlowNowHelp = myFlowPrimaryContinuationRow
    ? myFlowPrimaryContinuationIsToday
      ? '체크할 항목을 열어 완료합니다.'
      : myFlowPrimaryContinuationIsOverdue
        ? '먼저 정리할 항목입니다.'
        : myFlowPrimaryContinuationIsFuture
          ? '필요하면 열어서 체크와 메모를 확인합니다.'
          : '날짜가 없어도 저장한 콘텐츠의 첫 항목부터 바로 열 수 있습니다.'
    : '저장한 콘텐츠의 전체 목록을 확인하거나 새 콘텐츠를 찾아보세요.';
  const myFlowSecondaryContinuationRows = [
    ...todayOpenRows,
    ...overdueRows,
    ...upcomingRows,
    ...routineNextRows,
    ...myFlowFallbackFutureRows,
    ...myFlowFallbackUndatedRows,
  ].reduce<MyFlowCalendarRow[]>((rows, row) => {
    const key = getMyFlowRowInstanceKey(row);
    if (key === myFlowPrimaryContinuationKey) return rows;
    if (row.date && row.date < myFlowTodayDate) return rows;
    if (rows.some((existing) => getMyFlowRowInstanceKey(existing) === key)) return rows;
    rows.push(row);
    return rows;
  }, []).slice(0, 3);
  const visibleTodayOpenScheduleRows = todayOpenScheduleRows.filter((row) => getMyFlowRowInstanceKey(row) !== myFlowPrimaryContinuationKey);
  const visibleTodayOpenRoutineRows = todayOpenRoutineRows.filter((row) => getMyFlowRowInstanceKey(row) !== myFlowPrimaryContinuationKey);
  const visibleTodayOpenRows = [...visibleTodayOpenScheduleRows, ...visibleTodayOpenRoutineRows];
  const showTodayOpenSection = visibleTodayOpenRows.length > 0;
  const overdueSummaryByFlow = overdueRows.reduce<Array<{ title: string; count: number; firstDate?: string }>>((summaries, row) => {
    const title = getMyFlowFlowChipLabel(row.flow);
    const existing = summaries.find((summary) => summary.title === title);
    if (existing) {
      existing.count += 1;
      if (!existing.firstDate || (row.date && row.date < existing.firstDate)) existing.firstDate = row.date;
      return summaries;
    }
    summaries.push({ title, count: 1, ...(row.date ? { firstDate: row.date } : {}) });
    return summaries;
  }, []);
  const overdueSummaryPreview = overdueSummaryByFlow.slice(0, 3);
  const hiddenOverdueFlowCount = Math.max(0, overdueSummaryByFlow.length - overdueSummaryPreview.length);
  const myFlowSelectedDateRows = calendarScopedScheduleRows.filter((row) => row.date === myFlowSelectedDate);
  const myFlowSelectedDateRoutineRows = calendarScopedRoutineRows.filter((row) => row.date === myFlowSelectedDate);
  const myFlowSelectedDateAllRows = [...myFlowSelectedDateRows, ...myFlowSelectedDateRoutineRows];
  const myFlowSelectedDateRoutineOverflowCount = Math.max(0, myFlowSelectedDateRoutineRows.length - myFlowRoutineIconLimit);
  const myFlowSelectedDateScheduleLimit = myFlowSelectedDateRoutineRows.length > 0
    ? MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT
    : MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT + 2;
  const myFlowSelectedDateScheduleOverflowCount = Math.max(0, myFlowSelectedDateRows.length - myFlowSelectedDateScheduleLimit);
  const buildMyFlowSelectedDateGroups = (
    rows: MyFlowCalendarRow[],
    kind: 'routine' | 'schedule',
  ): MyFlowSelectedDateGroup[] => {
    const groups = new Map<string, MyFlowSelectedDateGroup>();
    rows.forEach((row) => {
      const savedMap = row.flow.savedMap;
      const key = `${kind}-${savedMap?.mapId ?? row.flow.progress.slug}`;
      const existing = groups.get(key);
      if (existing) {
        existing.rows.push(row);
        return;
      }
      groups.set(key, {
        key,
        kind,
        label: savedMap
          ? (kind === 'routine' ? '저장한 루틴' : '저장한 일정')
          : (kind === 'routine' ? '루틴' : '일정'),
        title: savedMap ? toUserFacingMapTitle(savedMap.title) : toContentDisplayTitle(getMyFlowExecutionFlowTitle(row.flow.progress.title)),
        rows: [row],
        ...(savedMap ? { savedMap } : {}),
      });
    });
    return Array.from(groups.values());
  };
  const myFlowSelectedDateGroups = [
    ...buildMyFlowSelectedDateGroups(myFlowSelectedDateRows, 'schedule'),
    ...buildMyFlowSelectedDateGroups(myFlowSelectedDateRoutineRows, 'routine'),
  ];
  const myFlowAllRows: MyFlowCalendarRow[] = visibleSavedFlows.flatMap((flow) =>
    flow.rows.map((row) => ({ ...row, flow })),
  );
  const myFlowActiveRow =
    calendarRows.find((row) => getMyFlowRowInstanceKey(row) === myFlowActiveRowKey) ??
    myFlowAllRows.find((row) => getMyFlowRowInstanceKey(row) === myFlowActiveRowKey) ??
    myFlowSelectedDateAllRows[0];
  const myFlowSelectedDateOpenCount = myFlowSelectedDateAllRows.filter((row) => !isMyFlowRowChecked(row.flow, row)).length;
  const myFlowCalendarOpenCount = calendarScopedRows.filter((row) => !isMyFlowRowChecked(row.flow, row)).length;
  const myFlowScheduleCountByDate = calendarScopedScheduleRows.reduce<Record<string, number>>((counts, row) => {
    if (!row.date) return counts;
    counts[row.date] = (counts[row.date] ?? 0) + 1;
    return counts;
  }, {});
  const myFlowScheduleRowsByDate = calendarScopedScheduleRows.reduce<Map<string, MyFlowCalendarRow[]>>((groups, row) => {
    if (!row.date) return groups;
    const rows = groups.get(row.date) ?? [];
    rows.push(row);
    groups.set(row.date, rows);
    return groups;
  }, new Map<string, MyFlowCalendarRow[]>());
  const myFlowRoutineRowsByDate = calendarScopedRoutineRows.reduce<Map<string, MyFlowCalendarRow[]>>((groups, row) => {
    if (!row.date) return groups;
    const rows = groups.get(row.date) ?? [];
    rows.push(row);
    groups.set(row.date, rows);
    return groups;
  }, new Map<string, MyFlowCalendarRow[]>());
  const getMyFlowRowDisplayDetail = (row: MyFlowCalendarRow): FlowItemDetail => {
    const draft = getMyFlowRowDraft(row);
    return {
      ...(row.detail ?? { item_id: row.id }),
      item_id: row.detail?.item_id ?? row.id,
      ...(draft.why !== undefined ? { why: draft.why } : {}),
      ...(draft.how !== undefined ? { how: draft.how } : {}),
      ...(draft.completion_criteria !== undefined ? { completion_criteria: draft.completion_criteria } : {}),
      ...(draft.caution !== undefined ? { caution: draft.caution } : {}),
    };
  };
  const myFlowPriorityCards = (() => {
    const seenSlugs = new Set<string>();
    return [
      { label: '오늘 실행', rows: todayOpenRows, className: 'border-blue-200 bg-blue-50 text-blue-800' },
      { label: '다음 7일', rows: upcomingRows, className: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
      { label: '지난 할 일', rows: overdueRows, className: 'border-amber-200 bg-amber-50 text-amber-800' },
    ].flatMap((group) =>
      group.rows.flatMap((row) => {
        const slug = row.flow.progress.slug;
        if (seenSlugs.has(slug)) return [];
        seenSlugs.add(slug);
        return [{
          ...group,
          row,
        }];
      }),
    ).slice(0, 4);
  })();
  const myFlowStatusOverdueRows = overdueRows.slice(0, 6);
  const myFlowStatusNextRows = [...todayOpenRows, ...upcomingRows].slice(0, 6);
  const myFlowStatusOverdueGroups = Array.from(
    myFlowStatusOverdueRows.reduce<
      Map<
        string,
        {
          key: string;
          dateLabel: string;
          title: string;
          timingLabel?: string;
          timingAriaLabel?: string;
          rows: MyFlowCalendarRow[];
        }
      >
    >((groups, row) => {
      const dateLabel = row.date ? formatMyFlowDisplayDate(row.date) : '날짜 없음';
      const title = getMyFlowFlowChipLabel(row.flow);
      const timingValue = row.flow.bundle.flow.structure_type !== 'routine' ? (row.timing ?? '') : '';
      const timingLabel = timingValue ? formatMyFlowTimingChip(timingValue) : undefined;
      const timingAriaLabel = timingValue ? getMyFlowTimingChipLabel(timingValue) : undefined;
      const savedContentKey = row.flow.savedMap?.mapId ?? row.flow.progress.slug;
      const key = `${row.date ?? 'none'}-${savedContentKey}-${timingValue || 'no-timing'}`;
      const existing = groups.get(key);
      if (existing) {
        existing.rows.push(row);
        return groups;
      }
      groups.set(key, {
        key,
        dateLabel,
        title,
        ...(timingLabel ? { timingLabel } : {}),
        ...(timingAriaLabel ? { timingAriaLabel } : {}),
        rows: [row],
      });
      return groups;
    }, new Map()).values(),
  );
  const myFlowStatusOpenFlowCount = visibleSavedFlows.filter((flow) => flow.done < flow.total).length;
  const myFlowStatusAveragePercent = visibleSavedFlows.length
    ? Math.round(visibleSavedFlows.reduce((sum, flow) => sum + flow.percent, 0) / visibleSavedFlows.length)
    : 0;
  const myFlowStatusNextActionCount = myFlowStatusNextRows.length;
  const getMyFlowStatusSheetOpenAriaLabel = (
    row: MyFlowCalendarRow,
    group?: { dateLabel: string; title: string; timingLabel?: string },
  ) => {
    const contextTitle = group
      ? [getMyFlowRowDisplayTitle(row), group.dateLabel, group.title, group.timingLabel].filter(Boolean).join(' · ')
      : getMyFlowRowDisplayTitle(row);
    return getMyFlowOpenActionAriaLabel(contextTitle, getMyFlowOpenActionLabel(row.flow.bundle));
  };
  const updateMyFlowItemDraft = (row: MyFlowCalendarRow, patch: MyFlowItemDraft) => {
    const key = getMyFlowRowInstanceKey(row);
    setMyFlowItemDrafts((current) => {
      const next = {
        ...current,
        [key]: {
          ...current[key],
          ...patch,
        },
      };
      if (!isMyFlowScenarioDemo) saveStoredMyFlowItemDrafts(next);
      return next;
    });
  };
  const updateMyFlowEditingDraft = (row: MyFlowCalendarRow, patch: MyFlowItemDraft) => {
    const key = getMyFlowRowInstanceKey(row);
    setMyFlowEditingDrafts((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
      },
    }));
  };
  const updateMyFlowDateOverrideState = (updater: (current: Record<string, string>) => Record<string, string>) => {
    setMyFlowDateOverrides((current) => {
      const next = updater(current);
      if (!isMyFlowScenarioDemo) saveStoredMyFlowDateOverrides(next);
      return next;
    });
  };
  const toggleMyFlowHiddenFlow = (slug: string) => {
    setMyFlowHiddenFlowSlugs((current) => {
      const exists = current.includes(slug);
      const next = exists ? current.filter((item) => item !== slug) : [...current, slug];
      if (!isMyFlowScenarioDemo) saveStoredMyFlowHiddenFlowSlugs(next);
      if (exists && flowListFilter === 'hidden' && next.length === 0) setFlowListFilter('all');
      return next;
    });
  };
  const toggleMyFlowStepItemCheck = (row: MyFlowCalendarRow, itemIndex: number) => {
    const key = getMyFlowRowInstanceKey(row);
    setMyFlowStepItemChecks((current) => {
      const currentRowChecks = current[key] ?? {};
      const next = {
        ...current,
        [key]: {
          ...currentRowChecks,
          [String(itemIndex)]: !currentRowChecks[String(itemIndex)],
        },
      };
      if (!isMyFlowScenarioDemo) saveMyFlowStepItemChecks(next);
      return next;
    });
  };
  const discardMyFlowEditingDraft = (row: MyFlowCalendarRow) => {
    const key = getMyFlowRowInstanceKey(row);
    setMyFlowEditingDrafts((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const getMyFlowRowEditorDraft = (row: MyFlowCalendarRow): Required<Pick<MyFlowItemDraft, 'title' | 'date' | 'repeatPreset' | 'memo' | 'location' | 'time'>> => {
    const key = getMyFlowRowInstanceKey(row);
    const committedDraft = getMyFlowRowDraft(row);
    const editingDraft = myFlowEditingDrafts[key] ?? {};
    const detail = getMyFlowRowDisplayDetail(row);
    const item = row.flow.bundle.items.find((entry) => entry.id === row.id);
    return {
      title: editingDraft.title ?? getMyFlowRowDisplayTitle(row),
      date: editingDraft.date ?? row.date ?? '',
      repeatPreset: editingDraft.repeatPreset ?? committedDraft.repeatPreset ?? '',
      memo: editingDraft.memo ?? committedDraft.memo ?? formatMyFlowDetailMemo(detail, row, item),
      location: editingDraft.location ?? committedDraft.location ?? '',
      time: editingDraft.time ?? committedDraft.time ?? '',
    };
  };
  const getMyFlowDecisionDraft = (row: MyFlowCalendarRow): Required<Pick<MyFlowItemDraft, 'decisionStatus' | 'nextReviewDate'>> => {
    const key = getMyFlowRowInstanceKey(row);
    const committedDraft = getMyFlowRowDraft(row);
    const editingDraft = myFlowEditingDrafts[key] ?? {};
    return {
      decisionStatus: editingDraft.decisionStatus ?? committedDraft.decisionStatus ?? 'undecided',
      nextReviewDate: editingDraft.nextReviewDate ?? committedDraft.nextReviewDate ?? '',
    };
  };
  const getMyFlowLogDraft = (row: MyFlowCalendarRow): Required<Pick<MyFlowItemDraft, 'logValue'>> => {
    const key = getMyFlowRowInstanceKey(row);
    const committedDraft = getMyFlowRowDraft(row);
    const editingDraft = myFlowEditingDrafts[key] ?? {};
    return {
      logValue: editingDraft.logValue ?? committedDraft.logValue ?? '',
    };
  };
  const hasMyFlowEditingDraft = (row: MyFlowCalendarRow) => Boolean(myFlowEditingDrafts[getMyFlowRowInstanceKey(row)]);
  const saveMyFlowEditingDraft = (row: MyFlowCalendarRow) => {
    const key = getMyFlowRowInstanceKey(row);
    const editingDraft = myFlowEditingDrafts[key];
    if (!editingDraft) return;
    const { date, ...itemDraft } = editingDraft;
    if (Object.keys(itemDraft).length > 0) updateMyFlowItemDraft(row, itemDraft);
    const manualScheduleKey = !row.date ? getMyFlowManualScheduleKey(row.flow.progress.slug, row.id) : '';
    const scheduleKey = row.calendarKey ?? manualScheduleKey;
    if (scheduleKey && date !== undefined) {
      updateMyFlowDateOverrideState((current) => {
        const next = { ...current };
        if (date) {
          next[scheduleKey] = date;
        } else {
          delete next[scheduleKey];
        }
        return next;
      });
      if (date) {
        setMyFlowSelectedDate(date);
        setMyFlowVisibleMonth(getMyFlowMonthStart(date));
      }
    }
    discardMyFlowEditingDraft(row);
    closeMyFlowRowDetail();
  };
  const cancelMyFlowEditingDraft = (row: MyFlowCalendarRow) => {
    discardMyFlowEditingDraft(row);
    closeMyFlowRowDetail();
  };
  const copyMyFlowStepPortableText = async (input: MyFlowPortableStepExportInput, key: string) => {
    const text = buildMyFlowStepPortableText(input);
    try {
      await navigator.clipboard.writeText(text);
      setMyFlowStepCopiedKey(key);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      setMyFlowStepCopiedKey(copied ? key : '');
    }
    window.setTimeout(() => setMyFlowStepCopiedKey(''), 1600);
  };
  const downloadMyFlowStepCalendar = (input: MyFlowPortableStepExportInput, key: string, fileBase: string) => {
    if (!canBuildMyFlowStepIcs(input)) return;
    const ics = buildMyFlowStepIcs(input);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileBase.replace(/[^a-z0-9가-힣_-]+/gi, '-')}.ics`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setMyFlowStepDownloadedKey(key);
    window.setTimeout(() => setMyFlowStepDownloadedKey(''), 1600);
  };
  const myFlowCalendarScheduleRows = calendarScopedScheduleRows.filter((row) => {
    if (!row.date) return true;
    const sameDateRows = myFlowScheduleRowsByDate.get(row.date) ?? [];
    const scheduleLimit = myFlowRoutineRowsByDate.has(row.date)
      ? MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT
      : MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT + 2;
    return sameDateRows.indexOf(row) < scheduleLimit;
  });
  const myFlowCalendarEvents = [
    ...myFlowCalendarScheduleRows.map((row) => {
      const checked = isMyFlowRowChecked(row.flow, row);
      const color = categoryColors[row.flow.bundle.flow.category] ?? '#2563EB';
      const title = getMyFlowRowDisplayTitle(row);
      return {
        id: row.calendarKey ?? `${row.flow.progress.slug}-${row.id}-${row.date}`,
        title,
        start: row.date,
        allDay: true,
        backgroundColor: checked ? '#F8FAFC' : '#FFFFFF',
        borderColor: checked ? '#CBD5E1' : '#E2E8F0',
        textColor: checked ? '#64748B' : '#0F172A',
        editable: Boolean(row.calendarKey),
        extendedProps: {
          kind: 'schedule',
          checked,
          calendarKey: row.calendarKey,
          itemTitle: title,
          shortTitle: getMyFlowCalendarShortTitle(title),
          itemCountOnDate: row.date ? myFlowScheduleCountByDate[row.date] ?? 1 : 1,
          color,
        },
      };
    }),
    ...Array.from(myFlowScheduleRowsByDate.entries())
      .map(([date, rows]) => {
        const scheduleLimit = myFlowRoutineRowsByDate.has(date)
          ? MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT
          : MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT + 2;
        return { date, rows, scheduleLimit };
      })
      .filter(({ rows, scheduleLimit }) => rows.length > scheduleLimit)
      .map(({ date, rows, scheduleLimit }) => ({
        id: `schedule-overflow-${date}`,
        title: `+${rows.length - scheduleLimit}`,
        start: date,
        allDay: true,
        editable: false,
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
        textColor: '#475569',
        extendedProps: {
          kind: 'scheduleOverflow',
          hiddenCount: rows.length - scheduleLimit,
        },
      })),
    ...Array.from(myFlowRoutineRowsByDate.entries()).map(([date, rows]) => {
      return {
        id: `routine-rail-${date}`,
        title: `${rows.length}개 루틴`,
        start: date,
        allDay: true,
        editable: false,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: '#0F172A',
        extendedProps: {
          kind: 'routineRail',
          hiddenCount: Math.max(0, rows.length - myFlowRoutineIconLimit),
          routines: rows.slice(0, myFlowRoutineIconLimit).map<MyFlowRoutineCalendarIcon>((row) => {
            const color = categoryColors[row.flow.bundle.flow.category] ?? '#0F766E';
            return {
              key: getMyFlowRowInstanceKey(row),
              title: getMyFlowRowDisplayTitle(row),
              flowTitle: getMyFlowExecutionFlowTitle(row.flow.progress.title),
              color,
              iconKind: getMyFlowRoutineIconKind(row),
            };
          }),
        },
      };
    }),
  ];
  const routineFlows = visibleSavedFlows.filter((flow) => flow.bundle.flow.structure_type === 'routine');
  const checklistFlowRows = visibleSavedFlows
    .map((flow) => ({
      flow,
      rows: flow.rows.filter((row) => {
        const checked = isMyFlowRowChecked(flow, row);
        if (checklistFilter === 'done') return checked;
        if (checklistFilter === 'open') return !checked;
        return true;
      }),
    }))
    .filter((item) => item.rows.length > 0);
  const shouldLimitChecklistPicker = isMyFlowMobileViewport && selectedSavedFlowSlug === 'all' && checklistFlowRows.length > 4;
  const visibleChecklistPickerRows = shouldLimitChecklistPicker && !myFlowChecklistPickerOpen ? checklistFlowRows.slice(0, 4) : checklistFlowRows;
  const hiddenChecklistPickerCount = shouldLimitChecklistPicker ? Math.max(0, checklistFlowRows.length - visibleChecklistPickerRows.length) : 0;
  const flowListNormalizedQuery = flowListQuery.trim().toLowerCase();
  const hiddenFlowSlugSet = new Set(myFlowHiddenFlowSlugs);
  const flowListVisibleFlows = visibleSavedFlows
    .filter((flow) => {
      const hidden = hiddenFlowSlugSet.has(flow.progress.slug);
      if (flowListFilter === 'hidden') return hidden;
      if (hidden) return false;
      if (flowListFilter === 'open') return flow.done < flow.total;
      if (flowListFilter === 'routine') return flow.bundle.flow.structure_type === 'routine';
      if (flowListFilter === 'done') return flow.done >= flow.total;
      return true;
    })
    .filter((flow) => {
      if (!flowListNormalizedQuery) return true;
      return [flow.progress.title, flow.bundle.flow.category, flow.meta]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(flowListNormalizedQuery);
    });
  const shouldLimitMobileLargeInventory =
    isMyFlowMobileViewport &&
    savedFlows.length > 20 &&
    selectedSavedFlowSlug === 'all' &&
    flowListFilter === 'all' &&
    flowListNormalizedQuery.length === 0 &&
    !myFlowLargeInventoryOpen;
  const mobileInventoryVisibleFlows = shouldLimitMobileLargeInventory
    ? flowListVisibleFlows.slice(0, 8)
    : flowListVisibleFlows;
  const hiddenMobileInventoryCount = shouldLimitMobileLargeInventory
    ? Math.max(0, flowListVisibleFlows.length - mobileInventoryVisibleFlows.length)
    : 0;
  const shouldLimitMobileFlowBoard =
    isMyFlowMobileViewport &&
    selectedSavedFlowSlug === 'all' &&
    flowListVisibleFlows.length > 4 &&
    !myFlowInventorySheetOpen;
  const mobileFlowBoardVisibleFlows = shouldLimitMobileFlowBoard ? flowListVisibleFlows.slice(0, 4) : flowListVisibleFlows;
  const hiddenMobileFlowBoardCount = shouldLimitMobileFlowBoard
    ? Math.max(0, flowListVisibleFlows.length - mobileFlowBoardVisibleFlows.length)
    : 0;
  const mobileFlowRemainingCount = flowListVisibleFlows.reduce((sum, flow) => sum + Math.max(0, flow.total - flow.done), 0);
  const mobileFlowSummaryChips = [
    todayOpenCount > 0
      ? { label: `오늘 ${todayOpenCount}`, className: 'bg-[#EEF1FF] text-[#3654FF]' }
      : null,
    upcomingRows.length > 0
      ? { label: `다음 ${upcomingRows.length}`, className: 'bg-[#ECF7F1] text-[#1F8A5B]' }
      : null,
    overdueRows.length > 0
      ? { label: `지난 할 일 ${overdueRows.length}`, className: 'bg-[#FFF4ED] text-[#D6462E]' }
      : null,
  ].filter((chip): chip is { label: string; className: string } => Boolean(chip));
  const mobileFlowSummaryText =
    mobileFlowRemainingCount > 0
      ? `${flowListVisibleFlows.length}개 저장 · ${mobileFlowRemainingCount}개 남음`
      : `${flowListVisibleFlows.length}개 저장 · 모두 완료`;
  const flowListReadyFlows = flowListVisibleFlows.filter((flow) => isMyFlowReadyContent(flow));
  const flowListSupportFlows = flowListVisibleFlows.filter((flow) => !isMyFlowReadyContent(flow));
  const shouldSeparateFlowReadiness =
    !isMyFlowScenarioDemo &&
    selectedSavedFlowSlug === 'all' &&
    flowListSupportFlows.length > 0 &&
    showFlowInventory;
  const flowListGroups = Array.from(
    flowListVisibleFlows.reduce((groups, flow) => {
      const readiness = isMyFlowScenarioDemo ? null : getMyFlowContentReadiness(flow);
      const category = readiness?.groupLabel ?? flow.savedMap?.title ?? flow.demoGroup ?? flow.bundle.flow.category ?? '기타';
      const next = groups.get(category) ?? [];
      next.push(flow);
      groups.set(category, next);
      return groups;
    }, new Map<string, MySavedFlow[]>()),
  );
  const buildMyFlowInventoryGroups = (flows: MySavedFlow[], supportMode = false): MyFlowInventoryGroup[] =>
    Array.from(
      flows.reduce((groups, flow) => {
        const readiness = isMyFlowScenarioDemo ? null : getMyFlowContentReadiness(flow);
        const savedMap = supportMode ? undefined : flow.savedMap;
        const savedMapId = savedMap?.mapId || flow.progress.slug;
        const fallbackGroupTitle = (supportMode && readiness ? readiness.groupLabel : flow.demoGroup ?? flow.bundle.flow.category) || '기타';
        const key: string = savedMap
          ? `map:${savedMapId}`
          : `group:${fallbackGroupTitle}`;
        const label: string = savedMap ? '저장한 콘텐츠' : supportMode && readiness ? fallbackGroupTitle : isMyFlowScenarioDemo ? '묶음' : '분류';
        const title: string = savedMap?.title || fallbackGroupTitle;
        let group = groups.get(key);
        if (!group) {
          group = { key, label, title, flows: [], ...(savedMap ? { savedMap } : {}) };
        }
        group.flows.push(flow);
        groups.set(key, group);
        return groups;
      }, new Map<string, MyFlowInventoryGroup>()).values(),
    );
  const flowListReadyGroups = buildMyFlowInventoryGroups(flowListReadyFlows);
  const flowListSupportGroups = buildMyFlowInventoryGroups(flowListSupportFlows, true);
  const flowListInventoryGroups = buildMyFlowInventoryGroups(flowListVisibleFlows);
  const shouldGroupBySavedMap = flowListVisibleFlows.some((flow) => Boolean(flow.savedMap));
  const visibleSavedViewTabs = savedViewTabs.filter(([id]) => {
    if (!isCalendarSurface && id === 'calendar') return false;
    return true;
  });
  const primarySavedViewTabIds = new Set(['today', 'flow']);
  const primarySavedViewTabs = visibleSavedViewTabs.filter(([id]) => primarySavedViewTabIds.has(id));
  const secondarySavedViewTabs = visibleSavedViewTabs.filter(([id]) => !primarySavedViewTabIds.has(id));
  const primarySavedViewTabGridClass =
    primarySavedViewTabs.length <= 1 ? 'grid-cols-1' :
    primarySavedViewTabs.length === 2 ? 'grid-cols-2' :
    primarySavedViewTabs.length === 3 ? 'grid-cols-3' :
    'grid-cols-4';
  const showSavedViewTabs = !isCalendarSurface && visibleSavedViewTabs.length > 0;
  const showMyFlowWorkspaceControls = showMyFlowScopeControl || showSavedViewTabs;
  const myFlowWorkspaceHeader = (() => {
    if (showPostSavePanel) {
      return {
        eyebrow: '저장됨',
        title: '먼저 할 일',
        help: '바로 이어서 실행합니다.',
      };
    }
    if (savedView === 'calendar') {
      return {
        eyebrow: '내 Flow',
        title: '월간 일정',
        help: '날짜별 항목을 보고 필요한 것만 열어봅니다.',
      };
    }
    if (savedView === 'flow') {
      return {
        eyebrow: '저장한 Flow',
        title: '저장한 Flow',
        help: '저장한 흐름별 진행률과 다음 항목만 먼저 보고, 필요한 상세는 열어서 확인합니다.',
      };
    }
    if (savedView === 'checklist') {
      return {
        eyebrow: '체크 보기',
        title: '남은 체크',
        help: 'Flow별 남은 항목을 펼치지 않고 필요한 것부터 확인합니다.',
      };
    }
    if (savedView === 'routine') {
      return {
        eyebrow: '루틴 보기',
        title: '반복 흐름',
        help: '반복되는 항목은 오늘 실행과 다음 날짜 중심으로 봅니다.',
      };
    }
    return {
      eyebrow: '내 실행 공간',
      title: '저장한 Flow',
      help: '지금 이어할 할 일부터 보고, 전체 구조는 필요할 때 엽니다.',
    };
  })();

  useEffect(() => {
    if (myFlowCalendarScope === 'all') return;
    if (myFlowCalendarScopeTotalCounts[myFlowCalendarScope] > 0) return;
    setMyFlowCalendarScope('all');
  }, [myFlowCalendarScope, myFlowCalendarScopeTotalCounts.map, myFlowCalendarScopeTotalCounts.schedule, myFlowCalendarScopeTotalCounts.routine]);

  useEffect(() => {
    if (isCalendarSurface) {
      if (savedView !== 'calendar') setSavedView('calendar');
      return;
    }
    if (visibleSavedViewTabs.some(([id]) => id === savedView)) return;
    setSavedView(visibleSavedViewTabs[0]?.[0] ?? 'today');
  }, [isCalendarSurface, savedView, visibleSavedViewTabs]);

  useEffect(() => {
    if (!showPostSavePanel || !savedMapIdParam || myFlowHandledSavedMapId === savedMapIdParam) return;
    setSelectedSavedFlowSlug('all');
    setSavedView('today');
    setMyFlowInventoryOpen(false);
    setMyFlowPostSaveWorkspaceOpen(false);
    setMyFlowHandledSavedMapId(savedMapIdParam);
  }, [myFlowHandledSavedMapId, savedMapIdParam, showPostSavePanel]);

  useEffect(() => {
    const anchorMonthStart = getMyFlowMonthStart(calendarAnchor);
    setMyFlowSelectedDate((currentDate) => {
      const currentDateStillHasRows = calendarScopedRows.some((row) => row.date === currentDate);
      const nextSelectedDate = currentDateStillHasRows
        ? currentDate
        : findMyFlowDefaultFocusDate(calendarScopedRows, myFlowTodayDate, anchorMonthStart);
      setMyFlowVisibleMonth(getMyFlowMonthStart(nextSelectedDate || anchorMonthStart));
      return nextSelectedDate;
    });
  }, [calendarAnchor, selectedSavedFlowSlug, myFlowCalendarScope, calendarScopedDateSignature, myFlowTodayDate]);

  const toggleSavedFlowItem = (flow: MySavedFlow, rowId: string, rowContext?: MyFlowCalendarRow) => {
    const checkIds = getMyFlowCheckIds(flow.bundle, rowId, flow.anchor);
    const nextChecked = !checkIds.every((id) => flow.checks[id]);
    const nextChecks = checkIds.reduce(
      (next, id) => ({
        ...next,
        [id]: nextChecked,
      }),
      { ...flow.checks },
    );
    if (nextChecked && myFlowDetailOpen && rowContext?.date && flow.bundle.flow.structure_type === 'routine') {
      const originalDate = rowContext.originalDate ?? rowContext.date;
      setMyFlowRoutineCompletionUndo({
        flowSlug: flow.progress.slug,
        rowId,
        activeRowKey: getMyFlowCalendarRowKey(flow.progress.slug, rowId, originalDate),
        date: rowContext.date,
        originalDate,
      });
      const nextRoutineRow = flow.rows.find((candidate) =>
        !getMyFlowCheckIds(flow.bundle, candidate.id, flow.anchor).every((id) => nextChecks[id]),
      );
      if (nextRoutineRow) {
        setMyFlowActiveRowKey(getMyFlowCalendarRowKey(flow.progress.slug, nextRoutineRow.id, originalDate));
      }
    } else {
      setMyFlowRoutineCompletionUndo((current) =>
        current?.flowSlug === flow.progress.slug && current.rowId === rowId ? null : current,
      );
    }
    if (isMyFlowScenarioDemo) {
      setChecksBySlug((current) => ({ ...current, [flow.progress.slug]: nextChecks }));
      return;
    }
    saveChecks(flow.progress.slug, nextChecks);
    refreshSavedFlowState();
  };

  const undoMyFlowRoutineCompletion = (flow: MySavedFlow, undo: MyFlowRoutineCompletionUndo) => {
    const checkIds = getMyFlowCheckIds(flow.bundle, undo.rowId, flow.anchor);
    const currentChecks = checksBySlug[flow.progress.slug] ?? flow.checks;
    const nextChecks = checkIds.reduce(
      (next, id) => ({
        ...next,
        [id]: false,
      }),
      { ...currentChecks },
    );
    setMyFlowRoutineCompletionUndo(null);
    setMyFlowActiveRowKey(undo.activeRowKey);
    setMyFlowSelectedDate(undo.date);
    setMyFlowVisibleMonth(getMyFlowMonthStart(undo.date));
    if (isMyFlowScenarioDemo) {
      setChecksBySlug((current) => ({ ...current, [flow.progress.slug]: nextChecks }));
      return;
    }
    saveChecks(flow.progress.slug, nextChecks);
    refreshSavedFlowState();
  };

  const completeSavedFlow = (flow: MySavedFlow) => {
    const executableIds = getExecutableCheckIds(flow.bundle, flow.anchor);
    const nextChecks = executableIds.reduce(
      (next, id) => ({
        ...next,
        [id]: true,
      }),
      { ...flow.checks },
    );
    if (isMyFlowScenarioDemo) {
      setChecksBySlug((current) => ({ ...current, [flow.progress.slug]: nextChecks }));
      return;
    }
    saveChecks(flow.progress.slug, nextChecks);
    refreshSavedFlowState();
  };

  const removeSavedFlow = (flow: MySavedFlow) => {
    if (isMyFlowScenarioDemo) {
      setActiveProgress((current) => current.filter((item) => item.slug !== flow.progress.slug));
      setChecksBySlug((current) => {
        const next = { ...current };
        delete next[flow.progress.slug];
        return next;
      });
      if (selectedSavedFlowSlug === flow.progress.slug) setSelectedSavedFlowSlug('all');
      return;
    }
    if (typeof window !== 'undefined' && !window.confirm(`${getMyFlowExecutionFlowTitle(flow.progress.title)} 저장 기록을 이 브라우저에서 지울까요?`)) return;
    clearFlowLocalProgress(flow.progress.slug);
    refreshSavedFlowState();
  };

  const resetMyFlowRowDetailState = () => {
    setMyFlowActiveRowKey('');
    setMyFlowEditingDrafts({});
    setMyFlowExpandedRoutineKey('');
    setMyFlowExpandedAdvancedKey('');
    setMyFlowExpandedMemoKey('');
    setMyFlowEditingDetailKey('');
    setMyFlowDetailSurface('');
    setMyFlowDetailOpen(false);
  };

  const openMyFlowRowDetail = (row: MyFlowCalendarRow, surface: MyFlowView | 'post-save' = savedView) => {
    const key = getMyFlowRowInstanceKey(row);
    setMyFlowActiveRowKey(key);
    setMyFlowDetailSurface(surface);
    setMyFlowEditingDrafts({});
    setMyFlowExpandedRoutineKey('');
    setMyFlowExpandedAdvancedKey('');
    setMyFlowExpandedMemoKey('');
    setMyFlowEditingDetailKey('');
    setMyFlowRoutineOverflowDate('');
    setMyFlowScheduleOverflowDate('');
    setMyFlowRoutineCompletionUndo(null);
    setMyFlowDetailOpen(true);
    if (row.date) {
      setMyFlowSelectedDate(row.date);
      setMyFlowVisibleMonth(getMyFlowMonthStart(row.date));
    }
  };

  const toggleMyFlowRowDetail = (row: MyFlowCalendarRow, surface: MyFlowView = savedView) => {
    const key = getMyFlowRowInstanceKey(row);
    if (myFlowDetailOpen && myFlowActiveRowKey === key) {
      resetMyFlowRowDetailState();
      return;
    }
    openMyFlowRowDetail(row, surface);
  };

  const getMyFlowRowForFlowTab = (flow: MySavedFlow, row: MyFlowRow): MyFlowCalendarRow => {
    const originalDate = row.date;
    return {
      ...row,
      flow,
      ...(originalDate
        ? {
            originalDate,
            calendarKey: getMyFlowCalendarRowKey(flow.progress.slug, row.id, originalDate),
            date: myFlowDateOverrides[getMyFlowCalendarRowKey(flow.progress.slug, row.id, originalDate)] ?? row.date,
          }
        : {}),
    };
  };

  const toggleMyFlowStructureFlow = (flow: MySavedFlow) => {
    setSavedView('flow');
    if (myFlowExpandedStructureSlug === flow.progress.slug) {
      setMyFlowExpandedStructureSlug('');
      setMyFlowExpandedStructureStepSlug('');
      if (myFlowActiveRow?.flow.progress.slug === flow.progress.slug) resetMyFlowRowDetailState();
      return;
    }
    setMyFlowExpandedStructureSlug(flow.progress.slug);
    setMyFlowExpandedStructureStepSlug('');
    if (myFlowActiveRow?.flow.progress.slug !== flow.progress.slug) resetMyFlowRowDetailState();
  };

  const openMyFlowRowFromFlowTab = (flow: MySavedFlow, row: MyFlowRow) => {
    if (flow.bundle.flow.structure_type === 'routine') {
      const routineRow =
        calendarRows.find((candidate) => candidate.flow.progress.slug === flow.progress.slug && candidate.id === row.id && !isMyFlowRowChecked(candidate.flow, candidate)) ??
        calendarRows.find((candidate) => candidate.flow.progress.slug === flow.progress.slug && candidate.id === row.id);
      if (routineRow) {
        if (myFlowDetailOpen && myFlowActiveRowKey === getMyFlowRowInstanceKey(routineRow)) {
          resetMyFlowRowDetailState();
          return;
        }
        setMyFlowExpandedStructureSlug(flow.progress.slug);
        setSavedView('flow');
        openMyFlowRowDetail(routineRow, 'flow');
        return;
      }
    }
    const flowRow = getMyFlowRowForFlowTab(flow, row);
    if (myFlowDetailOpen && myFlowActiveRowKey === getMyFlowRowInstanceKey(flowRow)) {
      resetMyFlowRowDetailState();
      return;
    }
    setMyFlowExpandedStructureSlug(flow.progress.slug);
    setSavedView('flow');
    openMyFlowRowDetail(flowRow, 'flow');
  };

  const getPostSaveContinuationRow = (): MyFlowCalendarRow | null => {
    if (postSavePrimaryContinuationRow) return postSavePrimaryContinuationRow;
    const postSaveFlowSlugs = new Set(postSaveFlows.map((flow) => flow.progress.slug));
    if (myFlowPrimaryContinuationRow && postSaveFlowSlugs.has(myFlowPrimaryContinuationRow.flow.progress.slug)) {
      return myFlowPrimaryContinuationRow;
    }
    const firstPostSaveRow = postSaveFlows
      .flatMap((flow) => flow.rows.map((row, index) => ({ flow, row, index })))
      .sort((left, right) => {
        const leftDate = left.row.date ?? '9999-12-31';
        const rightDate = right.row.date ?? '9999-12-31';
        const dateOrder = leftDate.localeCompare(rightDate);
        return dateOrder === 0 ? left.index - right.index : dateOrder;
      })[0];
    if (!firstPostSaveRow) return null;
    const originalDate = firstPostSaveRow.row.date;
    return {
      ...firstPostSaveRow.row,
      flow: firstPostSaveRow.flow,
      ...(originalDate
        ? {
            originalDate,
            calendarKey: getMyFlowCalendarRowKey(firstPostSaveRow.flow.progress.slug, firstPostSaveRow.row.id, originalDate),
            date: myFlowDateOverrides[getMyFlowCalendarRowKey(firstPostSaveRow.flow.progress.slug, firstPostSaveRow.row.id, originalDate)] ?? firstPostSaveRow.row.date,
          }
        : {}),
    };
  };

  const openMyFlowContinuationFromPostSave = () => {
    const continuationRow = getPostSaveContinuationRow();
    setMyFlowPostSaveWorkspaceOpen(true);
    if (!continuationRow) {
      setSelectedSavedFlowSlug('all');
      setSavedView('flow');
      scrollMyFlowPostSaveTargetIntoView('flow');
      return;
    }
    const targetSurface: MyFlowView = visibleSavedViewTabs.some(([id]) => id === 'today') ? 'today' : 'flow';
    setSelectedSavedFlowSlug(continuationRow.flow.progress.slug);
    setSavedView(targetSurface);
    openMyFlowRowDetail(continuationRow, targetSurface);
    scrollMyFlowPostSaveTargetIntoView('flow');
  };

  const scrollMyFlowPostSaveTargetIntoView = (target: 'calendar' | 'checklist' | 'flow') => {
    window.setTimeout(() => {
      const targetRef = target === 'calendar' ? myFlowCalendarCardRef.current : myFlowWorkspaceRef.current;
      targetRef?.scrollIntoView({ block: 'start', behavior: 'auto' });
    }, 0);
  };

  const openMyFlowListFromPostSave = () => {
    closeMyFlowRowDetail();
    setMyFlowPostSaveWorkspaceOpen(true);
    setSavedView('flow');
    setSelectedSavedFlowSlug('all');
    scrollMyFlowPostSaveTargetIntoView('flow');
  };

  const renderExecutionRow = (
    row: MyFlowCalendarRow,
    options: {
      kind?: 'routine' | 'schedule';
      compact?: boolean;
      openDetail?: boolean;
      inlineDetail?: boolean;
      minimalMeta?: boolean;
      showRoutineDate?: boolean;
      hideDateMeta?: boolean;
      hideTimingMeta?: boolean;
      hideSectionMeta?: boolean;
      hideFlowMeta?: boolean;
      showFlowProgress?: boolean;
      detailSurface?: MyFlowView;
    } = {},
  ) => {
    const checked = isMyFlowRowChecked(row.flow, row);
    const color = categoryColors[row.flow.bundle.flow.category] ?? '#2563EB';
    const activeRowKey = myFlowActiveRow && myFlowDetailOpen ? getMyFlowRowInstanceKey(myFlowActiveRow) : '';
    const isActive = Boolean(activeRowKey) && getMyFlowRowInstanceKey(row) === activeRowKey;
    const displayTitle = getMyFlowRowDisplayTitle(row);
    const displayTiming = options.kind === 'routine' || options.hideTimingMeta ? '' : formatMyFlowTimingChip(row.timing ?? '');
    const timingAccessibilityLabel = options.kind === 'routine' || options.hideTimingMeta ? undefined : getMyFlowTimingChipLabel(row.timing ?? '');
    const displaySection = options.hideSectionMeta ? '' : getMyFlowRowDisplaySectionLabel(row);
    const displayDate = row.date ? formatMyFlowDisplayDate(row.date) : '';
    const rowDateMeta = options.kind === 'routine' && !options.showRoutineDate ? '루틴' : displayDate;
    const flowChipLabel = getMyFlowFlowChipLabel(row.flow);
    const showFlowChip = !options.minimalMeta && !options.hideFlowMeta && (options.showFlowProgress || visibleSavedFlows.length > 1 || Boolean(row.flow.savedMap));
    const flowProgressLabel = getMyFlowFlowProgressLabel(row.flow);
    const isRoutineExecution = options.kind === 'routine' || row.itemType?.primary === 'routine_session';
    const completionActionLabel = isRoutineExecution
      ? (checked ? '이번 항목 완료 취소' : '이번 항목 완료')
      : (checked ? '완료 취소' : '완료 체크');
    const useMobileIconCompletion = isMyFlowMobileViewport && options.compact;
    const visibleCompletionActionLabel = options.compact
      ? (useMobileIconCompletion ? (checked ? '✓' : '') : (isRoutineExecution ? (checked ? '완료 취소' : '항목 완료') : (checked ? '취소' : '완료')))
      : completionActionLabel;
    const routineProgressLabel = `항목 ${row.flow.done}/${row.flow.total}`;
    const routineDragKey = getMyFlowRowInstanceKey(row);
    const rowClassName = `flex min-w-0 items-stretch rounded-md border bg-white text-sm ${options.compact ? 'gap-1 p-1 sm:gap-1.5 sm:p-1.5' : 'gap-2 p-2'} ${isActive ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`;
    const rowButtonClassName = `flex min-w-0 flex-1 items-start rounded-md text-left hover:bg-blue-50 ${options.compact ? 'gap-1.5 px-0.5 py-0.5 sm:gap-2 sm:py-1' : 'gap-3 px-1 py-1'}`;
    const rowDotClassName = `mt-1 shrink-0 rounded-full ${options.compact ? 'h-1.5 w-1.5 sm:h-2 sm:w-2' : 'h-2.5 w-2.5'}`;
    const rowCompletionClassName = useMobileIconCompletion
      ? `inline-flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-md border text-sm font-black ${checked ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300 bg-white text-transparent'}`
      : `shrink-0 self-center rounded-md font-semibold ${options.compact ? 'px-1.5 py-1 text-[11px] sm:px-2 sm:py-1.5 sm:text-xs' : 'px-2.5 py-2 text-xs'} ${checked ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'}`;
    const startRoutineRowDrag = (dataTransfer?: DataTransfer) => {
      if (!isRoutineExecution) return;
      myFlowDraggingRoutineKeyRef.current = routineDragKey;
      myFlowDraggingRoutineDateRef.current = row.date ?? '';
      if (!dataTransfer) return;
      dataTransfer.effectAllowed = 'move';
      dataTransfer.setData('application/x-flowme-routine-key', routineDragKey);
      dataTransfer.setData('text/plain', routineDragKey);
    };
    const rowDetailSurface = options.detailSurface ?? savedView;

    if (options.openDetail) {
      const activeInlineDetail = Boolean(
        options.inlineDetail &&
        myFlowDetailSurface === rowDetailSurface &&
        myFlowDetailOpen &&
        myFlowActiveRow &&
        getMyFlowRowInstanceKey(myFlowActiveRow) === getMyFlowRowInstanceKey(row),
      );
      return (
        <div key={`${routineDragKey}-${options.kind ?? 'schedule'}`} data-testid="my-flow-execution-row-shell" className="grid gap-1.5">
        <article
          data-item-type={row.itemType?.primary ?? 'check_task'}
          data-routine-key={isRoutineExecution ? routineDragKey : undefined}
          draggable={isRoutineExecution}
          onPointerDown={() => startRoutineRowDrag()}
          onMouseDown={() => startRoutineRowDrag()}
          onDragStart={(event) => startRoutineRowDrag(event.dataTransfer)}
          onDragEnd={() => {
            window.setTimeout(() => {
              myFlowDraggingRoutineKeyRef.current = '';
              myFlowDraggingRoutineDateRef.current = '';
            }, 0);
          }}
          className={rowClassName}
        >
          <button
            className={rowButtonClassName}
            type="button"
            onClick={() => toggleMyFlowRowDetail(row, rowDetailSurface)}
          >
            <span className={rowDotClassName} style={{ backgroundColor: color }} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-500 sm:gap-1.5">
                <span data-testid="my-flow-row-date-meta" className={options.hideDateMeta ? 'hidden sm:inline' : undefined}>{rowDateMeta}</span>
                {displayTiming ? <span data-testid="my-flow-row-timing-chip" aria-label={timingAccessibilityLabel} title={timingAccessibilityLabel} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{displayTiming}</span> : null}
                {!options.minimalMeta && displaySection ? <span data-testid="my-flow-row-section-label">{displaySection}</span> : null}
                {showFlowChip ? <span data-testid="my-flow-row-flow-chip" className="max-w-full truncate rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{flowChipLabel}</span> : null}
                {options.showFlowProgress ? <span data-testid="my-flow-row-progress-chip" className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{flowProgressLabel}</span> : null}
              </span>
              <span className={`mt-1 block font-semibold ${checked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                {displayTitle}
              </span>
            </span>
          </button>
          <div className="flex shrink-0 flex-col items-end justify-center gap-1">
            {isRoutineExecution ? (
              <span data-testid="my-flow-routine-progress-pill" className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                {routineProgressLabel}
              </span>
            ) : null}
            <button
              className={rowCompletionClassName}
              type="button"
              aria-label={completionActionLabel}
              onClick={() => toggleSavedFlowItem(row.flow, row.id, row)}
            >
            {visibleCompletionActionLabel}
          </button>
        </div>
      </article>
      {activeInlineDetail && myFlowActiveRow ? (
        <div
          ref={(node) => {
            myFlowInlineDetailRef.current = node;
            if (node) scrollMyFlowInlineDetailIntoView(node);
          }}
          data-testid="my-flow-inline-detail"
        >
          {renderMyFlowItemDetailEditor(myFlowActiveRow, 'inline', rowDetailSurface)}
        </div>
      ) : null}
      </div>
      );
    }

    return (
      <article
        key={`${routineDragKey}-${options.kind ?? 'schedule'}`}
        data-item-type={row.itemType?.primary ?? 'check_task'}
        data-routine-key={isRoutineExecution ? routineDragKey : undefined}
        draggable={isRoutineExecution}
        onPointerDown={() => startRoutineRowDrag()}
        onMouseDown={() => startRoutineRowDrag()}
        onDragStart={(event) => startRoutineRowDrag(event.dataTransfer)}
        onDragEnd={() => {
          window.setTimeout(() => {
            myFlowDraggingRoutineKeyRef.current = '';
            myFlowDraggingRoutineDateRef.current = '';
          }, 0);
        }}
        className={rowClassName}
      >
        <button
          className={rowButtonClassName}
          type="button"
          onClick={() => toggleMyFlowRowDetail(row, rowDetailSurface)}
        >
          <span className={rowDotClassName} style={{ backgroundColor: color }} />
          <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-500 sm:gap-1.5">
                <span data-testid="my-flow-row-date-meta" className={options.hideDateMeta ? 'hidden sm:inline' : undefined}>{rowDateMeta}</span>
                {displayTiming ? <span data-testid="my-flow-row-timing-chip" aria-label={timingAccessibilityLabel} title={timingAccessibilityLabel} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{displayTiming}</span> : null}
                {!options.minimalMeta && displaySection ? <span data-testid="my-flow-row-section-label">{displaySection}</span> : null}
                {showFlowChip ? <span data-testid="my-flow-row-flow-chip" className="max-w-full truncate rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{flowChipLabel}</span> : null}
                {options.showFlowProgress ? <span data-testid="my-flow-row-progress-chip" className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{flowProgressLabel}</span> : null}
              </span>
            <span className={`mt-1 block font-semibold ${checked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
              {displayTitle}
            </span>
            {!options.compact && !options.hideTimingMeta && row.timing ? <span className="mt-1 block text-xs text-slate-500">{formatMyFlowTimingChip(row.timing)}</span> : null}
          </span>
        </button>
        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
          {isRoutineExecution ? (
            <span data-testid="my-flow-routine-progress-pill" className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
              {routineProgressLabel}
            </span>
          ) : null}
          <button
            className={rowCompletionClassName}
            type="button"
            aria-label={completionActionLabel}
            onClick={() => toggleSavedFlowItem(row.flow, row.id, row)}
          >
            {visibleCompletionActionLabel}
          </button>
        </div>
      </article>
    );
  };

  const renderMobileContinuationFlowCard = (
    row: MyFlowCalendarRow,
    options: { tone?: 'primary' | 'plain'; primaryLabel?: string; nextLabel?: string; hideLeadLabel?: boolean } = {},
  ) => {
    const flow = row.flow;
    const activeRowKey = myFlowActiveRow && myFlowDetailOpen ? getMyFlowRowInstanceKey(myFlowActiveRow) : '';
    const rowKey = getMyFlowRowInstanceKey(row);
    const isActive = myFlowDetailSurface === 'today' && activeRowKey === rowKey;
    const checked = isMyFlowRowChecked(flow, row);
    const color = categoryColors[flow.bundle.flow.category] ?? '#2563EB';
    const isPrimary = options.tone === 'primary';
    const flowContext = flow.savedMap
      ? toUserFacingMapTitle(flow.savedMap.title)
      : flow.bundle.flow.structure_type === 'routine'
        ? '반복 흐름'
        : flow.rows.some((candidate) => Boolean(candidate.date))
          ? '일정 흐름'
          : '체크 흐름';
    const rowMeta = [
      row.date ? formatMyFlowDisplayDate(row.date) : '',
      row.timing ? formatMyFlowTimingChip(row.timing) : '',
      getMyFlowRowDisplaySectionLabel(row),
    ].filter(Boolean).join(' · ');
    const flowMeta = [
      getMyFlowExecutionFlowTitle(flow.progress.title),
      `${flow.done}/${flow.total} 완료`,
      flowContext,
    ].filter(Boolean).join(' · ');
    const toneClassName = isPrimary || isActive
      ? 'border-blue-200 bg-blue-50/50'
      : 'border-slate-200 bg-white';

    return (
      <article
        key={`mobile-continuation-${rowKey}`}
        data-testid="my-flow-mobile-continuation-card"
        data-flow-slug={flow.progress.slug}
        data-row-key={rowKey}
        className={`min-w-0 rounded-lg border px-3 py-3 shadow-sm ${toneClassName}`}
      >
        <button
          type="button"
          data-testid="my-flow-mobile-continuation-open"
          aria-expanded={isActive}
          className={`w-full min-w-0 rounded-md px-0 py-0 text-left transition ${
            isActive
              ? 'text-slate-950'
              : isPrimary
                ? 'text-slate-950'
                : 'text-slate-900 hover:text-blue-800'
          }`}
          onClick={() => toggleMyFlowRowDetail(row, 'today')}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="min-w-0">
              {options.hideLeadLabel ? null : (
                <span className="block text-xs font-semibold text-blue-700">{isPrimary ? options.primaryLabel ?? '지금 할 일' : options.nextLabel ?? '다음 할 일'}</span>
              )}
              <span data-testid="my-flow-mobile-continuation-title" className={`mt-1 block text-base font-semibold leading-6 ${checked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                {getMyFlowRowDisplayTitle(row)}
              </span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                {rowMeta || getMyFlowRowDisplaySectionLabel(row) || '날짜 없는 체크 항목'}
              </span>
            </span>
            <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${
              checked
                ? 'bg-emerald-50 text-emerald-700'
                : isActive
                  ? 'bg-white text-blue-700 ring-1 ring-blue-100'
                  : 'bg-slate-100 text-slate-700'
            }`}>
              {checked ? '완료' : isActive ? '열림' : '열기'}
            </span>
          </span>
        </button>
        <div data-testid="my-flow-mobile-continuation-flow-context" className="mt-2 flex min-w-0 items-center gap-2 text-[11px] font-semibold text-slate-500">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="min-w-0 truncate">{flowMeta}</span>
        </div>
        {isActive && myFlowActiveRow ? (
          <div
            ref={(node) => {
              myFlowInlineDetailRef.current = node;
              if (node) scrollMyFlowInlineDetailIntoView(node);
            }}
            className="mt-3"
            data-testid="my-flow-inline-detail"
          >
            {renderMyFlowItemDetailEditor(myFlowActiveRow, 'inline', 'today')}
          </div>
        ) : null}
      </article>
    );
  };

  const moveMyFlowCalendarRow = (row: MyFlowCalendarRow, nextDate: string) => {
    if (!row.calendarKey || !nextDate) return;
    updateMyFlowDateOverrideState((current) => ({ ...current, [row.calendarKey as string]: nextDate }));
    setMyFlowSelectedDate(nextDate);
    setMyFlowActiveRowKey(row.calendarKey);
    setMyFlowVisibleMonth(getMyFlowMonthStart(nextDate));
  };

  const moveMyFlowRoutineByKey = (routineKey: string, nextDate: string) => {
    const row = calendarRows.find((item) => item.flow.bundle.flow.structure_type === 'routine' && getMyFlowRowInstanceKey(item) === routineKey);
    if (!row) return;
    moveMyFlowCalendarRow(row, nextDate);
    setMyFlowRoutineOverflowDate('');
    setMyFlowScheduleOverflowDate('');
    setMyFlowExpandedRoutineKey('');
    setMyFlowExpandedAdvancedKey('');
    setMyFlowExpandedMemoKey('');
    setMyFlowEditingDetailKey('');
    setMyFlowDetailOpen(false);
  };

  const renderMyFlowCalendarEvent = (info: EventContentArg) => {
    const kind = info.event.extendedProps.kind as string | undefined;
    if (kind === 'routineRail') {
      const routines = (info.event.extendedProps.routines ?? []) as MyFlowRoutineCalendarIcon[];
      const hiddenCount = Number(info.event.extendedProps.hiddenCount ?? 0);
      const routineDate = info.event.startStr;
      return (
        <span className="my-flow-routine-rail flex min-h-7 max-w-full items-center gap-0 overflow-hidden px-0 py-0.5 sm:gap-0.5 sm:px-0.5" data-testid="my-flow-routine-rail" data-has-overflow={hiddenCount > 0 ? 'true' : undefined} aria-label="루틴">
          {routines.map((routine, routineIndex) => (
            <button
              key={routine.key}
              type="button"
              title={`${routine.flowTitle}: ${routine.title}`}
              aria-label={`${routine.flowTitle}: ${routine.title}`}
              data-testid="my-flow-routine-icon"
              data-routine-icon-kind={routine.iconKind}
              data-routine-extra={routineIndex > 0 ? 'true' : undefined}
              draggable
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-transparent leading-none shadow-none ring-0 hover:bg-slate-50 hover:ring-1 hover:ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-300 ${routine.key === myFlowActiveRowKey ? 'my-flow-calendar-active-routine bg-blue-50 shadow-sm ring-2 ring-blue-500' : ''}`}
              style={{ color: routine.color }}
              onPointerDown={() => {
                myFlowDraggingRoutineKeyRef.current = routine.key;
                myFlowDraggingRoutineDateRef.current = routineDate;
              }}
              onMouseDown={() => {
                myFlowDraggingRoutineKeyRef.current = routine.key;
                myFlowDraggingRoutineDateRef.current = routineDate;
              }}
              onDragStart={(event) => {
                event.stopPropagation();
                myFlowDraggingRoutineKeyRef.current = routine.key;
                myFlowDraggingRoutineDateRef.current = routineDate;
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('application/x-flowme-routine-key', routine.key);
                event.dataTransfer.setData('text/plain', routine.key);
              }}
              onDragEnd={() => {
                window.setTimeout(() => {
                  myFlowDraggingRoutineKeyRef.current = '';
                  myFlowDraggingRoutineDateRef.current = '';
                }, 0);
              }}
              onClick={(event) => {
                event.stopPropagation();
                myFlowDraggingRoutineKeyRef.current = '';
                myFlowDraggingRoutineDateRef.current = '';
                const row = calendarRows.find((item) => getMyFlowRowInstanceKey(item) === routine.key);
                setMyFlowRoutineOverflowDate('');
                setMyFlowScheduleOverflowDate('');
                if (row) openMyFlowRowDetail(row);
              }}
            >
              {renderMyFlowRoutineIcon(routine.iconKind)}
            </button>
          ))}
          {hiddenCount > 0 ? (
            <button
              type="button"
              aria-label={`${info.event.startStr} 루틴 ${hiddenCount}개 더 보기`}
              className="inline-flex h-7 min-w-[11px] shrink-0 items-center justify-center rounded-md bg-slate-100 px-0 text-[8px] font-black text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 sm:min-w-7 sm:px-0.5 sm:text-[10px]"
              data-testid="my-flow-routine-overflow"
              onClick={(event) => {
                event.stopPropagation();
                if (info.event.startStr) {
                  setMyFlowSelectedDate(info.event.startStr);
                  setMyFlowRoutineOverflowDate(info.event.startStr);
                  setMyFlowScheduleOverflowDate('');
                  scrollMyFlowSelectedDayOnMobile();
                }
                setMyFlowActiveRowKey('');
                setMyFlowExpandedMemoKey('');
                setMyFlowEditingDetailKey('');
                setMyFlowDetailOpen(false);
              }}
            >
              +{hiddenCount}
            </button>
          ) : null}
        </span>
      );
    }
    if (kind === 'scheduleOverflow') {
      const hiddenCount = Number(info.event.extendedProps.hiddenCount ?? 0);
      const eventDate = info.event.startStr;
      const selectOverflowDate = () => {
        if (!eventDate) return;
        setMyFlowSelectedDate(eventDate);
        setMyFlowRoutineOverflowDate('');
        setMyFlowScheduleOverflowDate(eventDate);
        setMyFlowActiveRowKey('');
        setMyFlowEditingDrafts({});
    setMyFlowExpandedRoutineKey('');
    setMyFlowExpandedAdvancedKey('');
    setMyFlowExpandedMemoKey('');
    setMyFlowEditingDetailKey('');
    setMyFlowDetailOpen(false);
        scrollMyFlowSelectedDayOnMobile();
      };
      return (
        <span
          data-testid="my-flow-schedule-overflow"
          role="button"
          tabIndex={0}
          aria-label={`${eventDate} 일정 ${hiddenCount}개 더 보기`}
          className="block rounded-md bg-slate-100 px-0.5 py-0.5 text-[10px] font-black text-slate-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
          onClick={(event) => {
            event.stopPropagation();
            selectOverflowDate();
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            event.stopPropagation();
            selectOverflowDate();
          }}
        >
          +{hiddenCount}
        </span>
      );
    }
    const itemCountOnDate = Number(info.event.extendedProps.itemCountOnDate ?? 1);
    const checked = Boolean(info.event.extendedProps.checked);
    const color = String(info.event.extendedProps.color ?? '#2563EB');
    const scheduleLabel = itemCountOnDate > 1 ? `${itemCountOnDate}개` : '일정';

    return (
      <span data-testid="my-flow-calendar-schedule-content" className="flex min-w-0 items-center gap-1">
        <span
          data-testid="my-flow-calendar-schedule-rail"
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: checked ? '#94A3B8' : color }}
        />
        <span className={`truncate text-[10px] font-black leading-none ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
          {scheduleLabel}
        </span>
      </span>
    );
  };

  const renderMyFlowCalendarDayCell = (info: { date: Date; dayNumberText: string }) => {
    const dateStr = formatMyFlowLocalDate(info.date);
    const selected = dateStr === myFlowSelectedDate;
    return (
      <button
        type="button"
        data-testid="my-flow-calendar-date-button"
        aria-pressed={selected}
        className={`rounded px-0.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-200 ${selected ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'}`}
        onPointerDown={() => {
          myFlowDraggingRoutineKeyRef.current = '';
          myFlowDraggingRoutineDateRef.current = '';
        }}
        onMouseDown={() => {
          myFlowDraggingRoutineKeyRef.current = '';
          myFlowDraggingRoutineDateRef.current = '';
        }}
        onClick={(event) => {
          event.stopPropagation();
          setMyFlowSelectedDate(dateStr);
          setMyFlowActiveRowKey('');
          setMyFlowRoutineOverflowDate('');
          setMyFlowScheduleOverflowDate('');
          setMyFlowExpandedRoutineKey('');
          setMyFlowExpandedAdvancedKey('');
          setMyFlowExpandedMemoKey('');
          setMyFlowEditingDetailKey('');
          setMyFlowDetailOpen(false);
        }}
      >
        {info.dayNumberText}
      </button>
    );
  };

  const handleMyFlowCalendarDayCellMount = (info: { el: HTMLElement; date: Date }) => {
    const dateStr = formatMyFlowLocalDate(info.date);
    const allowRoutineDrop = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    };
    const moveRoutineDrop = (event: DragEvent | MouseEvent | PointerEvent) => {
      const routineKey = event instanceof DragEvent
        ? event.dataTransfer?.getData('application/x-flowme-routine-key') || event.dataTransfer?.getData('text/plain') || myFlowDraggingRoutineKeyRef.current
        : myFlowDraggingRoutineKeyRef.current;
      if (!routineKey) return;
      if (!(event instanceof DragEvent) && myFlowDraggingRoutineDateRef.current === dateStr) return;
      event.preventDefault();
      moveMyFlowRoutineByKey(routineKey, dateStr);
      myFlowDraggingRoutineKeyRef.current = '';
      myFlowDraggingRoutineDateRef.current = '';
    };
    info.el.addEventListener('dragover', allowRoutineDrop);
    info.el.addEventListener('drop', moveRoutineDrop);
    info.el.addEventListener('mouseup', moveRoutineDrop);
    info.el.addEventListener('pointerup', moveRoutineDrop);
  };

  const handleMyFlowCalendarEventClick = (info: EventClickArg) => {
    if (info.event.startStr) setMyFlowSelectedDate(info.event.startStr);
    setMyFlowRoutineOverflowDate('');
    setMyFlowScheduleOverflowDate('');
    const calendarKey = String(info.event.extendedProps.calendarKey ?? '');
    if (!calendarKey) {
      setMyFlowActiveRowKey('');
      setMyFlowExpandedMemoKey('');
      setMyFlowEditingDetailKey('');
      setMyFlowDetailOpen(false);
      return;
    }
    const row = calendarRows.find((item) => getMyFlowRowInstanceKey(item) === calendarKey);
    if (row) {
      openMyFlowRowDetail(row);
    } else {
      setMyFlowActiveRowKey(calendarKey);
      setMyFlowEditingDetailKey('');
      setMyFlowDetailOpen(true);
    }
  };

  const handleMyFlowCalendarEventMount = (info: EventMountArg) => {
    const kind = String(info.event.extendedProps.kind ?? '');
    if (kind === 'routineRail') {
      info.el.classList.add('my-flow-routine-rail-event');
      info.el.style.setProperty('border-color', 'transparent', 'important');
      info.el.style.setProperty('background', 'transparent', 'important');
      info.el.style.setProperty('box-shadow', 'none', 'important');
      return;
    }
    if (kind === 'scheduleOverflow') {
      info.el.classList.add('my-flow-schedule-overflow-event');
      info.el.style.setProperty('border-color', 'transparent', 'important');
      info.el.style.setProperty('background', 'transparent', 'important');
      info.el.style.setProperty('box-shadow', 'none', 'important');
      return;
    }
    if (kind !== 'schedule') return;
    const title = String(info.event.extendedProps.itemTitle ?? info.event.title);
    const label = `${title} 상세 열기`;
    info.el.setAttribute('aria-label', label);
    info.el.setAttribute('title', label);
    info.el.setAttribute('role', 'button');
    info.el.setAttribute('tabindex', '0');
    info.el.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      (info.el as HTMLElement).click();
    });
  };

  const handleMyFlowCalendarEventDrop = (info: EventDropArg) => {
    const calendarKey = String(info.event.extendedProps.calendarKey ?? '');
    const kind = String(info.event.extendedProps.kind ?? '');
    const nextDate = info.event.startStr;
    if (!calendarKey || kind !== 'schedule' || !nextDate) {
      info.revert();
      return;
    }
    updateMyFlowDateOverrideState((current) => ({ ...current, [calendarKey]: nextDate }));
    setMyFlowSelectedDate(nextDate);
    setMyFlowActiveRowKey(calendarKey);
    setMyFlowEditingDetailKey('');
    setMyFlowDetailOpen(true);
    setMyFlowVisibleMonth(getMyFlowMonthStart(nextDate));
  };

  const handleMyFlowCalendarDateClick = (info: DateClickArg) => {
    setMyFlowSelectedDate(info.dateStr);
    setMyFlowActiveRowKey('');
    setMyFlowEditingDrafts({});
    setMyFlowExpandedRoutineKey('');
    setMyFlowRoutineOverflowDate('');
    setMyFlowScheduleOverflowDate('');
    setMyFlowExpandedMemoKey('');
    setMyFlowEditingDetailKey('');
    setMyFlowDetailOpen(false);
    scrollMyFlowSelectedDayOnMobile();
  };

  const closeMyFlowRowDetail = () => {
    resetMyFlowRowDetailState();
  };

  const renderMyFlowItemDetailEditor = (row: MyFlowCalendarRow, mode: 'inline' | 'drawer' | 'panel', surfaceContext: MyFlowView | 'post-save' | '' = myFlowDetailSurface || savedView) => {
    const checked = isMyFlowRowChecked(row.flow, row);
    const detail = getMyFlowRowDisplayDetail(row);
    const item = row.flow.bundle.items.find((entry) => entry.id === row.id);
    const editorDraft = getMyFlowRowEditorDraft(row);
    const hasEditorChanges = hasMyFlowEditingDraft(row);
    const isDrawerMode = mode === 'drawer' || mode === 'panel';
    const isInlineMobileMode = mode === 'inline' && isMyFlowMobileViewport;
    const isFlowTabInlineMobileMode = isInlineMobileMode && surfaceContext === 'flow';
    const useReadonlyTitleHeader = isDrawerMode || isInlineMobileMode;
    const isRoutineRow = row.flow.bundle.flow.structure_type === 'routine';
    const isProgressFlow = Boolean(row.flow.bundle.flow.tags?.includes('progress-flow'));
    const timing = row.timing ?? item?.repeat_rule ?? '';
    const detailSection = getMyFlowRowDisplaySectionLabel(row);
    const visibleDetailSection = isProgressFlow ? '' : detailSection;
    const detailFlowChipLabel = getMyFlowFlowChipLabel(row.flow);
    const showDetailFlowChip = Boolean(detailFlowChipLabel) && !isInlineMobileMode;
    const routineKey = getMyFlowRowInstanceKey(row);
    const isRoutineRepeatExpanded = myFlowExpandedRoutineKey === routineKey;
    const isAdvancedExpanded = myFlowExpandedAdvancedKey === routineKey;
    const isMemoExpanded = myFlowExpandedMemoKey === routineKey;
    const typeSummary = getMyFlowDetailTypeSummary(row);
    const decisionDraft = getMyFlowDecisionDraft(row);
    const isDecisionRow = row.itemType?.primary === 'decision_hold' || Boolean(row.itemType?.secondary.includes('decision_hold'));
    const isLogRow = row.itemType?.primary === 'log_entry' || Boolean(row.itemType?.secondary.includes('log_entry'));
    const showTypeSummary = !isDrawerMode && !isProgressFlow && !isInlineMobileMode;
    const showOccurrenceFields = !isDrawerMode || isProgressFlow || Boolean(row.calendarKey);
    const showRoutineRepeatSettings = !isDrawerMode;
    const logDraft = getMyFlowLogDraft(row);
    const appliedRoutineRuleDraft = getMyFlowRoutineDraft(row.flow);
    const routineRuleDraft = isRoutineRepeatExpanded ? getMyFlowRoutineEditorDraft(row.flow) : appliedRoutineRuleDraft;
    const routineWeekdays = routineRuleDraft.weekdays ?? [];
    const isSingleOccurrenceRoutineScope = routineRuleDraft.scope === 'this';
    const detailChecklistItems = getMyFlowDetailChecklistItems(detail);
    const hasDetailChecklistItems = detailChecklistItems.length > 0;
    const inlineActionHint = getMyFlowInlineActionHint(detail, item);
    const detailChecklistLabel = row.flow.bundle.flow.tags?.includes('progress-flow') ? '개념 항목' : '확인 항목';
    const detailChecklistState = myFlowStepItemChecks[getMyFlowRowInstanceKey(row)] ?? {};
    const attachmentLabel = item?.photo_filename_pattern;
    const links = detail.links ?? [];
    const primaryLink = links[0];
    const advancedLinks = primaryLink ? links.slice(1) : links;
    const hasAdvancedMeta = Boolean(attachmentLabel || advancedLinks.length > 0);
    const shouldCollapsePortableExport = isInlineMobileMode;
    const portableExportKey = getMyFlowRowInstanceKey(row);
    const isDetailEditing = !isDrawerMode && myFlowEditingDetailKey === portableExportKey;
    const showEditableDetailFields = isDrawerMode || isDetailEditing;
    const portableExportInput: MyFlowPortableStepExportInput = {
      flowTitle: getMyFlowExecutionFlowTitle(row.flow.progress.title),
      stepId: portableExportKey,
      stepTitle: editorDraft.title,
      sectionTitle: visibleDetailSection,
      date: editorDraft.date,
      time: editorDraft.time,
      repeatPreset: editorDraft.repeatPreset,
      location: editorDraft.location,
      memo: editorDraft.memo,
      sourceLabel: primaryLink ? toUserFacingSourceTitle(primaryLink.label) : undefined,
      sourceUrl: primaryLink?.url,
      items: detailChecklistItems,
      checkedItems: detailChecklistState,
      completionCriteria: detail.completion_criteria,
      caution: detail.caution,
    };
    const canDownloadPortableCalendar = canBuildMyFlowStepIcs(portableExportInput);
    const hasExpandableMemo = editorDraft.memo.trim().length > 0;
    const inlineDetailHeaderLabel = hasDetailChecklistItems ? '확인할 항목' : '실행할 일';
    const detailCompletionActionLabel = isRoutineRow
      ? (checked ? '이번 항목 완료 취소' : '이번 항목 완료')
      : (checked ? '완료 취소' : '완료 체크');
    const detailCompletionVisibleLabel = isRoutineRow
      ? detailCompletionActionLabel
      : checked ? '완료됨' : '완료';
    const detailCompletionClassName = isRoutineRow
      ? `rounded-md px-3 py-2 text-xs font-semibold ${checked ? 'bg-white text-slate-600' : 'bg-blue-700 text-white'}`
      : `inline-flex min-h-9 items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${
        checked
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-700'
      }`;
    const routineProgressLabel = `항목 ${row.flow.done}/${row.flow.total}`;
    const canUndoRoutineCompletion = isRoutineRow && myFlowRoutineCompletionUndo?.flowSlug === row.flow.progress.slug;
    const fieldClassName = 'mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
    const textareaClassName = `${fieldClassName} ${isMemoExpanded ? 'min-h-52' : isDrawerMode ? 'h-28 min-h-28' : 'h-20 min-h-20'} resize-y font-normal leading-6`;
    const canEditDate = Boolean(row.calendarKey || isProgressFlow);
    const showTimeLocationFields = !isProgressFlow || Boolean(row.calendarKey);
    const showRepeatPresetField = !isRoutineRow && showTimeLocationFields;
    const scheduleSummaryRows = [
      editorDraft.date ? { label: '날짜', value: editorDraft.date } : undefined,
      editorDraft.time ? { label: '시간', value: editorDraft.time } : undefined,
      editorDraft.repeatPreset ? { label: '반복', value: editorDraft.repeatPreset === 'daily' ? '매일' : editorDraft.repeatPreset === 'weekly' ? '매주' : editorDraft.repeatPreset === 'monthly' ? '매월' : editorDraft.repeatPreset } : undefined,
      editorDraft.location ? { label: '장소', value: editorDraft.location } : undefined,
    ].filter((entry): entry is { label: string; value: string } => Boolean(entry));
    const occurrenceFields = (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {canEditDate ? (
          <label className="block text-xs font-semibold text-slate-600">
            날짜
            <input
              data-testid="my-flow-detail-date-input"
              aria-label="날짜"
              className={fieldClassName}
              type="date"
              value={editorDraft.date}
              onChange={(event) => updateMyFlowEditingDraft(row, { date: event.target.value })}
            />
          </label>
        ) : null}
        {showTimeLocationFields ? (
          <>
        <label className="block text-xs font-semibold text-slate-600">
          시간
          <input
            className={fieldClassName}
            type="time"
            value={editorDraft.time}
            onChange={(event) => updateMyFlowEditingDraft(row, { time: event.target.value })}
          />
        </label>
        <label className="block text-xs font-semibold text-slate-600">
          장소
          <input
            className={fieldClassName}
            placeholder="장소 없음"
            value={editorDraft.location}
            onChange={(event) => updateMyFlowEditingDraft(row, { location: event.target.value })}
          />
        </label>
        {showRepeatPresetField ? (
          <label className="block text-xs font-semibold text-slate-600">
            반복
            <select
              data-testid="my-flow-detail-repeat-input"
              aria-label="반복"
              className={fieldClassName}
              value={editorDraft.repeatPreset}
              onChange={(event) => updateMyFlowEditingDraft(row, { repeatPreset: event.target.value })}
            >
              <option value="">반복 없음</option>
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
            </select>
          </label>
        ) : null}
          </>
        ) : null}
        {isProgressFlow && !row.calendarKey ? (
          <p data-testid="my-flow-progress-schedule-note" className="rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 sm:col-span-2">
            날짜를 넣으면 이 항목만 캘린더에 보입니다. 나머지 단원은 진도표에 그대로 둡니다.
          </p>
        ) : null}
      </div>
    );
    const routineRepeatSettings = isRoutineRow ? (
      <div className="mt-3 rounded-md bg-white px-3 py-3 text-xs font-semibold text-slate-600">
        <button
          type="button"
          data-testid="my-flow-routine-repeat-toggle"
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={isRoutineRepeatExpanded}
          onClick={() => {
            if (isRoutineRepeatExpanded) {
              setMyFlowExpandedRoutineKey('');
              return;
            }
            openMyFlowRoutineRuleEditor(row.flow, routineKey);
          }}
        >
          <span>반복 설정</span>
          <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">{formatMyFlowRepeatSummary(routineWeekdays)}</span>
        </button>
        {isRoutineRepeatExpanded ? (
          <div data-testid="my-flow-routine-repeat-editor">
            <label className="mt-3 block">
              적용 범위
              <select
                aria-label="반복 변경 적용 범위"
                className={fieldClassName}
                value={routineRuleDraft.scope ?? 'future'}
                onChange={(event) => updateMyFlowRoutineRuleEditorDraft(row.flow, { scope: event.target.value as MyFlowRoutineRuleDraft['scope'] })}
              >
                <option value="this">이 이벤트만</option>
                <option value="future">이 이벤트 및 이후</option>
                <option value="all">모든 이벤트</option>
              </select>
            </label>
            {isSingleOccurrenceRoutineScope ? (
              <p data-testid="my-flow-routine-scope-note" className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 text-[11px] font-semibold leading-5 text-slate-600">
                이 이벤트만은 이번 날짜의 시간·장소·메모만 바꿉니다. 반복 요일과 종료일은 이 이벤트 및 이후 또는 모든 이벤트에서 바꾸세요.
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {MY_FLOW_WEEKDAYS.map((weekday) => {
                const checkedWeekday = routineWeekdays.includes(weekday);
                return (
                  <label key={weekday} className={`inline-flex min-h-8 items-center gap-1 rounded-md border px-2 ${isSingleOccurrenceRoutineScope ? 'border-slate-200 bg-slate-50 text-slate-400' : checkedWeekday ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                    <input
                      aria-label={`반복 요일 ${weekday}`}
                      className="h-3.5 w-3.5"
                      type="checkbox"
                      disabled={isSingleOccurrenceRoutineScope}
                      checked={checkedWeekday}
                      onChange={(event) => {
                        const nextWeekdays = event.target.checked
                          ? [...routineWeekdays, weekday].filter((value, index, values) => values.indexOf(value) === index)
                          : routineWeekdays.filter((day) => day !== weekday);
                        updateMyFlowRoutineRuleEditorDraft(row.flow, { weekdays: nextWeekdays.length > 0 ? nextWeekdays : routineWeekdays });
                      }}
                    />
                    {weekday}
                  </label>
                );
              })}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                종료
                <input
                  aria-label="반복 종료일"
                  data-testid="my-flow-routine-end-date"
                  className={fieldClassName}
                  type="date"
                  disabled={isSingleOccurrenceRoutineScope}
                  value={routineRuleDraft.endDate ?? ''}
                  onChange={(event) => updateMyFlowRoutineRuleEditorDraft(row.flow, { endDate: event.target.value })}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-col gap-2 rounded-md bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-800 sm:flex-row sm:items-center sm:justify-between">
              <p data-testid="my-flow-routine-repeat-pending">
                저장 전: 반복 변경은 아래 버튼을 눌러야 캘린더에 반영됩니다.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="my-flow-routine-repeat-cancel"
                  className="rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700"
                  onClick={() => cancelMyFlowRoutineRuleEditorDraft(row.flow)}
                >
                  반복 변경 취소
                </button>
                <button
                  type="button"
                  data-testid="my-flow-routine-repeat-apply"
                  className="rounded-md bg-blue-700 px-3 py-2 text-xs font-bold text-white"
                  onClick={() => applyMyFlowRoutineRuleEditorDraft(row.flow)}
                >
                  반복 변경 저장
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    ) : null;

    return (
      <section
        data-testid="my-flow-item-detail"
        data-item-type={row.itemType?.primary ?? 'check_task'}
        className={
          mode === 'inline'
            ? 'mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3'
            : mode === 'panel'
              ? 'rounded-md border border-blue-100 bg-white p-3'
              : 'space-y-3'
        }
      >
        <div className={isInlineMobileMode ? 'grid gap-3' : 'flex flex-wrap items-start justify-between gap-3'}>
          <div className={isInlineMobileMode ? 'min-w-0' : 'min-w-0 flex-1'}>
            {useReadonlyTitleHeader || !isDetailEditing ? (
              <div>
                {isInlineMobileMode && hasDetailChecklistItems ? null : (
                  <p className="text-xs font-semibold text-blue-700">{isInlineMobileMode ? inlineDetailHeaderLabel : '확인할 항목'}</p>
                )}
                {isInlineMobileMode ? (
                  <>
                    {hasDetailChecklistItems ? (
                      <p className="mt-1 text-xs font-semibold text-slate-600">필요한 항목만 체크하고 완료로 표시하세요.</p>
                    ) : null}
                  </>
                ) : (
                  <h3 className={`mt-1 font-semibold text-slate-950 ${isInlineMobileMode ? 'text-base leading-6' : 'text-lg leading-6'}`}>{editorDraft.title}</h3>
                )}
              </div>
            ) : (
              <label className="block text-xs font-semibold text-slate-600">
                제목
                <input
                  className={fieldClassName}
                  value={editorDraft.title}
                  onChange={(event) => updateMyFlowEditingDraft(row, { title: event.target.value })}
                />
              </label>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
              {row.date ? <span>{formatMyFlowDisplayDate(row.date)}</span> : null}
              {!isRoutineRow && timing ? <span data-testid="my-flow-detail-timing-chip" aria-label={getMyFlowTimingChipLabel(timing)} title={getMyFlowTimingChipLabel(timing)} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-600">{formatMyFlowTimingChip(timing)}</span> : null}
              {visibleDetailSection ? <span data-testid="my-flow-detail-section-label">{visibleDetailSection}</span> : null}
              {showDetailFlowChip ? <span data-testid="my-flow-detail-flow-chip" className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{detailFlowChipLabel}</span> : null}
            </p>
            {primaryLink && !shouldCollapsePortableExport ? (
              <a
                data-testid="my-flow-detail-source-link"
                className="mt-2 inline-flex min-h-8 items-center rounded-md border border-blue-100 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300"
                href={primaryLink.url}
                target="_blank"
                rel="noreferrer"
              >
                {toUserFacingSourceTitle(primaryLink.label)}
              </a>
            ) : null}
          </div>
          <div data-testid="my-flow-routine-action-group" className={`flex flex-wrap gap-2 ${isInlineMobileMode ? 'justify-start' : 'shrink-0 justify-end'}`}>
            {isRoutineRow ? (
              <span data-testid="my-flow-routine-progress-pill" className="inline-flex min-h-8 items-center rounded-md bg-emerald-50 px-2 text-xs font-black text-emerald-700">
                {routineProgressLabel}
              </span>
            ) : null}
            <button
              className={detailCompletionClassName}
              type="button"
              aria-label={detailCompletionActionLabel}
              onClick={() => toggleSavedFlowItem(row.flow, row.id, row)}
            >
              {!isRoutineRow ? (
                <span className={`inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${checked ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-transparent'}`} aria-hidden="true">
                  ✓
                </span>
              ) : null}
              {detailCompletionVisibleLabel}
            </button>
            {!isDrawerMode && !isInlineMobileMode ? (
              <button
                className={`rounded-md px-3 py-2 text-xs font-semibold ${
                  isFlowTabInlineMobileMode
                    ? isDetailEditing
                      ? 'bg-white text-slate-700 ring-1 ring-slate-200'
                      : 'text-blue-700 hover:bg-white'
                    : isDetailEditing
                      ? 'border border-slate-200 bg-white text-slate-700'
                      : 'border border-blue-100 bg-white text-blue-700 hover:border-blue-300'
                }`}
                type="button"
                data-testid="my-flow-detail-edit-toggle"
                aria-pressed={isDetailEditing}
                onClick={() => {
                  if (isDetailEditing) {
                    cancelMyFlowEditingDraft(row);
                    setMyFlowEditingDetailKey('');
                    return;
                  }
                  setMyFlowEditingDetailKey(portableExportKey);
                }}
              >
                {isDetailEditing ? '수정 취소' : '수정'}
              </button>
            ) : null}
            <button
              className={`rounded-md px-3 py-2 text-xs font-semibold ${
                isFlowTabInlineMobileMode
                  ? 'text-slate-600 hover:bg-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
              type="button"
              onClick={closeMyFlowRowDetail}
            >
              닫기
            </button>
          </div>
        </div>
        {canUndoRoutineCompletion ? (
          <div
            data-testid="my-flow-routine-undo-notice"
            className="mt-3 flex flex-col gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>방금 완료한 항목을 되돌릴 수 있습니다.</span>
            <button
              className="rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700"
              type="button"
              onClick={() => {
                if (myFlowRoutineCompletionUndo) undoMyFlowRoutineCompletion(row.flow, myFlowRoutineCompletionUndo);
              }}
            >
              방금 완료 취소
            </button>
          </div>
        ) : null}
        {isInlineMobileMode && inlineActionHint ? (
          <section data-testid="my-flow-inline-action-hint" className="mt-3 rounded-md bg-white px-3 py-3">
            <p className="text-xs font-semibold text-slate-500">바로 할 일</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{inlineActionHint}</p>
          </section>
        ) : null}
        {hasEditorChanges ? (
          <div className="mt-3 flex flex-col gap-2 rounded-md border border-blue-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-600">{isDrawerMode ? '메모 변경은 저장해야 반영됩니다.' : '저장 전까지 캘린더와 목록에는 반영되지 않습니다.'}</p>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                type="button"
                data-testid="my-flow-detail-cancel-changes"
                onClick={() => cancelMyFlowEditingDraft(row)}
              >
                변경 취소
              </button>
              <button
                className="rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white"
                type="button"
                data-testid="my-flow-detail-save-changes"
                onClick={() => {
                  saveMyFlowEditingDraft(row);
                  setMyFlowEditingDetailKey('');
                }}
              >
                변경 저장
              </button>
            </div>
          </div>
        ) : null}
        {typeSummary && showTypeSummary ? (
          <section
            data-testid="my-flow-detail-type-summary"
            className={
              typeSummary.text
                ? 'mt-3 rounded-md bg-white px-3 py-3 text-xs font-semibold text-slate-600'
                : 'mt-2 text-xs font-semibold text-slate-600'
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{typeSummary.label}</span>
              {row.itemType?.secondary.map((type) => (
                type === 'reference_caution' ? null : (
                  <span key={type} className="rounded-md bg-slate-50 px-2 py-1 text-slate-600">{MY_FLOW_ITEM_TYPE_LABELS[type]}</span>
                )
              ))}
            </div>
            {typeSummary.text ? <p className="mt-2 leading-5 text-slate-600">{typeSummary.text}</p> : null}
          </section>
        ) : null}
        {detailChecklistItems.length > 0 ? (
          <section data-testid="my-flow-item-checklist" className="mt-3 rounded-md bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-600">{detailChecklistLabel}</p>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">
                {Object.values(detailChecklistState).filter(Boolean).length}/{detailChecklistItems.length}
              </span>
            </div>
            <div className="mt-2 grid gap-1.5">
              {detailChecklistItems.map((itemText, itemIndex) => {
                const itemChecked = Boolean(detailChecklistState[String(itemIndex)]);
                return (
                  <label key={`${itemText}-${itemIndex}`} className="flex min-h-9 items-start gap-2 rounded-md border border-slate-100 bg-slate-50 px-2.5 py-2 text-sm text-slate-700">
                    <input
                      className="mt-1 h-4 w-4 shrink-0"
                      type="checkbox"
                      checked={itemChecked}
                      onChange={() => toggleMyFlowStepItemCheck(row, itemIndex)}
                    />
                    <span className={itemChecked ? 'text-slate-400 line-through' : undefined}>{itemText}</span>
                  </label>
                );
              })}
            </div>
          </section>
        ) : null}
        {!showEditableDetailFields && (scheduleSummaryRows.length > 0 || editorDraft.memo.trim()) ? (
          isInlineMobileMode ? (
            <details data-testid="my-flow-detail-read-summary" className="mt-3 rounded-md bg-white px-3 py-3">
              <summary className="cursor-pointer text-xs font-semibold text-slate-700">메모·일정</summary>
              <div className="mt-3 grid gap-2">
                {scheduleSummaryRows.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-500">일정</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {scheduleSummaryRows.map((entry) => (
                        <span key={entry.label} className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                          {entry.label} {entry.value}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {editorDraft.memo.trim() ? (
                  <div>
                    <p className="text-xs font-semibold text-slate-500">메모</p>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 px-2 py-2 text-sm leading-6 text-slate-700">{editorDraft.memo}</p>
                  </div>
                ) : null}
                {!isDrawerMode ? (
                  <button
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs font-semibold text-blue-700"
                    type="button"
                    data-testid="my-flow-detail-edit-toggle"
                    aria-pressed={isDetailEditing}
                    onClick={() => {
                      if (isDetailEditing) {
                        cancelMyFlowEditingDraft(row);
                        setMyFlowEditingDetailKey('');
                        return;
                      }
                      setMyFlowEditingDetailKey(portableExportKey);
                    }}
                  >
                    {isDetailEditing ? '수정 취소' : '메모/일정 수정'}
                  </button>
                ) : null}
              </div>
            </details>
          ) : (
            <section data-testid="my-flow-detail-read-summary" className="mt-3 grid gap-2 rounded-md bg-white px-3 py-3">
              {scheduleSummaryRows.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500">일정</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {scheduleSummaryRows.map((entry) => (
                      <span key={entry.label} className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                        {entry.label} {entry.value}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {editorDraft.memo.trim() ? (
                <div>
                  <p className="text-xs font-semibold text-slate-500">메모</p>
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 px-2 py-2 text-sm leading-6 text-slate-700">{editorDraft.memo}</p>
                </div>
              ) : null}
            </section>
          )
        ) : null}
        {isDecisionRow && isDetailEditing ? (
          <section data-testid="my-flow-decision-fields" className="mt-3 rounded-md bg-white px-3 py-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-slate-600">
                결정 상태
                <select
                  aria-label="결정 상태"
                  data-testid="my-flow-decision-status"
                  className={fieldClassName}
                  value={decisionDraft.decisionStatus}
                  onChange={(event) => updateMyFlowEditingDraft(row, { decisionStatus: event.target.value as MyFlowItemDraft['decisionStatus'] })}
                >
                  <option value="undecided">미정</option>
                  <option value="buy">구매</option>
                  <option value="hold">보류</option>
                  <option value="reject">거절</option>
                </select>
              </label>
              <label className="block text-xs font-semibold text-slate-600">
                다음 확인일
                <input
                  aria-label="다음 확인일"
                  data-testid="my-flow-decision-next-review"
                  className={fieldClassName}
                  type="date"
                  value={decisionDraft.nextReviewDate}
                  onChange={(event) => updateMyFlowEditingDraft(row, { nextReviewDate: event.target.value })}
                />
              </label>
            </div>
          </section>
        ) : null}
        {isLogRow && isDetailEditing ? (
          <section data-testid="my-flow-log-fields" className="mt-3 rounded-md bg-white px-3 py-3">
            <label className="block text-xs font-semibold text-slate-600">
              오늘 기록
              <input
                aria-label="오늘 기록"
                data-testid="my-flow-log-value"
                className={fieldClassName}
                placeholder="예: 이상 없음, 누유 없음, 7점"
                value={logDraft.logValue}
                onChange={(event) => updateMyFlowEditingDraft(row, { logValue: event.target.value })}
              />
            </label>
          </section>
        ) : null}
        {isDetailEditing && showRoutineRepeatSettings ? routineRepeatSettings : null}
        {!showOccurrenceFields || !showEditableDetailFields ? null : isRoutineRow ? (
          <section data-testid="my-flow-routine-occurrence-section" className="mt-3 rounded-md bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600">
              <p className="text-slate-900">이번 일정</p>
              <span className="rounded-md bg-slate-50 px-2 py-1 text-slate-500">날짜 · 시간 · 장소</span>
            </div>
            {occurrenceFields}
          </section>
        ) : occurrenceFields}
        {showEditableDetailFields ? (
          <label className="mt-3 block text-xs font-semibold text-slate-600">
            메모
            <textarea data-testid="my-flow-detail-memo" className={textareaClassName} value={editorDraft.memo} onChange={(event) => updateMyFlowEditingDraft(row, { memo: event.target.value })} />
          </label>
        ) : null}
        {hasExpandableMemo && isDetailEditing ? (
          <button
            type="button"
            className="mt-2 rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            aria-expanded={isMemoExpanded}
            onClick={() => setMyFlowExpandedMemoKey(isMemoExpanded ? '' : routineKey)}
          >
            {isMemoExpanded ? '메모 작게 보기' : '메모 크게 보기'}
          </button>
        ) : null}
        {shouldCollapsePortableExport ? (
          <details data-testid="my-flow-detail-portable-export" className="mt-3 rounded-md bg-white px-3 py-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">원문·내 도구</summary>
            {primaryLink ? (
              <a
                data-testid="my-flow-detail-source-link"
                className="mt-3 inline-flex min-h-8 items-center rounded-md border border-blue-100 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300"
                href={primaryLink.url}
                target="_blank"
                rel="noreferrer"
              >
                {toUserFacingSourceTitle(primaryLink.label)}
              </a>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">내 도구로 옮기기</p>
              <span className="text-[11px] font-semibold text-slate-500">
                {canDownloadPortableCalendar ? '텍스트 · 캘린더' : '텍스트'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="my-flow-detail-copy-portable-text"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700"
                onClick={() => copyMyFlowStepPortableText(portableExportInput, portableExportKey)}
              >
                {FLOW_EXPORT_LABELS.memoCopy}
              </button>
              {canDownloadPortableCalendar ? (
                <button
                  type="button"
                  data-testid="my-flow-detail-download-ics"
                  className="rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  onClick={() => downloadMyFlowStepCalendar(portableExportInput, portableExportKey, `${row.flow.progress.slug}-${row.id}`)}
                >
                  {FLOW_EXPORT_LABELS.calendarFile}
                </button>
              ) : null}
              {myFlowStepCopiedKey === portableExportKey ? (
                <span data-testid="my-flow-detail-copy-feedback" className="inline-flex min-h-8 items-center rounded-md bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700">{FLOW_EXPORT_FEEDBACK.memoCopied}</span>
              ) : null}
              {myFlowStepDownloadedKey === portableExportKey ? (
                <span data-testid="my-flow-detail-download-feedback" className="inline-flex min-h-8 items-center rounded-md bg-blue-50 px-2 text-[11px] font-semibold text-blue-700">{FLOW_EXPORT_FEEDBACK.calendarReady}</span>
              ) : null}
            </div>
          </details>
        ) : (
          <section data-testid="my-flow-detail-portable-export" className="mt-3 rounded-md bg-white px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">내 도구로 옮기기</p>
              <span className="text-[11px] font-semibold text-slate-500">
                {canDownloadPortableCalendar ? '텍스트 · 캘린더' : '텍스트'}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="my-flow-detail-copy-portable-text"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700"
                onClick={() => copyMyFlowStepPortableText(portableExportInput, portableExportKey)}
              >
                {FLOW_EXPORT_LABELS.memoCopy}
              </button>
              {canDownloadPortableCalendar ? (
                <button
                  type="button"
                  data-testid="my-flow-detail-download-ics"
                  className="rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  onClick={() => downloadMyFlowStepCalendar(portableExportInput, portableExportKey, `${row.flow.progress.slug}-${row.id}`)}
                >
                  {FLOW_EXPORT_LABELS.calendarFile}
                </button>
              ) : null}
              {myFlowStepCopiedKey === portableExportKey ? (
                <span data-testid="my-flow-detail-copy-feedback" className="inline-flex min-h-8 items-center rounded-md bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700">{FLOW_EXPORT_FEEDBACK.memoCopied}</span>
              ) : null}
              {myFlowStepDownloadedKey === portableExportKey ? (
                <span data-testid="my-flow-detail-download-feedback" className="inline-flex min-h-8 items-center rounded-md bg-blue-50 px-2 text-[11px] font-semibold text-blue-700">{FLOW_EXPORT_FEEDBACK.calendarReady}</span>
              ) : null}
            </div>
          </section>
        )}
        {isDrawerMode && hasAdvancedMeta ? (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
            {attachmentLabel ? (
              <p>
                <span className="text-slate-500">첨부</span>
                <span className="ml-2 text-slate-900">{attachmentLabel}</span>
              </p>
            ) : null}
            {advancedLinks.length > 0 ? (
              <div className={attachmentLabel ? 'mt-2' : ''}>
                <p className="text-slate-500">링크</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {advancedLinks.map((link) => (
                    <a key={`${link.label}-${link.url}`} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-blue-700" href={link.url} target="_blank" rel="noreferrer">
                      {toUserFacingSourceTitle(link.label)}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        {!isDrawerMode && hasAdvancedMeta ? (
          <div className="mt-2 text-xs font-semibold text-slate-600">
            <button
              type="button"
              data-testid="my-flow-detail-advanced-toggle"
              className="flex w-full items-center justify-between gap-3 rounded-md text-left text-slate-700 hover:bg-white"
              aria-expanded={isAdvancedExpanded}
              onClick={() => setMyFlowExpandedAdvancedKey(isAdvancedExpanded ? '' : routineKey)}
            >
              <span>더보기</span>
              <span className="text-[11px] text-slate-500">
                {[attachmentLabel ? '첨부' : '', advancedLinks.length > 0 ? '링크' : ''].filter(Boolean).join(' · ')}
              </span>
            </button>
            {isAdvancedExpanded ? (
              <div data-testid="my-flow-detail-advanced-content" className="mt-2 grid gap-2 rounded-md bg-white px-3 py-2">
                {attachmentLabel ? (
                  <p>
                    <span className="text-slate-500">첨부 파일</span>
                    <span className="ml-2 text-slate-900">{attachmentLabel}</span>
                  </p>
                ) : null}
                {advancedLinks.length > 0 ? (
                  <div>
                    <p className="text-slate-500">링크</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {advancedLinks.map((link) => (
                        <a key={`${link.label}-${link.url}`} className="rounded-md border border-slate-200 px-2 py-1 text-blue-700" href={link.url} target="_blank" rel="noreferrer">
                          {toUserFacingSourceTitle(link.label)}
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  };

  const renderPostSavePanel = () => {
    if (!postSaveMap || postSaveFlows.length === 0) return null;
    const postSaveContinuationRow = getPostSaveContinuationRow();
    const postSaveHeading = postSaveContinuationRow
      ? '내 Flow에 저장했습니다'
      : '저장한 내용을 확인하세요';
    return (
      <section data-testid="my-flow-post-save-panel" className="mb-4 rounded-2xl border border-[#E7E4DD] bg-white p-3 shadow-[0_8px_24px_rgba(27,26,23,0.05)] sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[#3654FF]">저장됨</span>
              <span className="break-keep text-[#6E6B64]">{toUserFacingMapTitle(postSaveMap.title)}</span>
            </div>
            <h3 className="mt-2 break-keep text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              {postSaveHeading}
            </h3>
          </div>
          <div className="grid shrink-0 gap-2 sm:w-44">
            {postSaveContinuationRow ? (
              <button
                type="button"
                data-testid="my-flow-post-save-open-first"
                className="min-h-10 rounded-xl bg-[#3654FF] px-3 py-2 text-sm font-semibold text-white"
                onClick={openMyFlowContinuationFromPostSave}
              >
                먼저 열기
              </button>
            ) : null}
            <button
              type="button"
              data-testid="my-flow-post-save-view-flow"
              className="min-h-10 rounded-xl border border-[#E7E4DD] bg-white px-3 py-2 text-sm font-semibold text-[#3654FF]"
              onClick={openMyFlowListFromPostSave}
            >
              전체 보기
            </button>
          </div>
        </div>
      </section>
    );
  };

  const renderFlowListRow = (flow: MySavedFlow) => {
    const flowTitle = getMyFlowExecutionFlowTitle(flow.progress.title);
    const savedMapTitle = flow.savedMap ? toUserFacingMapTitle(flow.savedMap.title) : '';
    const nextRow = getSavedFlowNextRow(flow);
    const color = categoryColors[flow.bundle.flow.category] ?? '#2563EB';
    const nextActionLabel = getMyFlowOpenActionLabel(flow.bundle);
    const sourceHref = getMyFlowSourceHref(flow);
    const sourceLabel = getMyFlowSourceLinkLabel(flow);
    const contentReadiness = getMyFlowContentReadiness(flow);
    const showContentReadinessBadge = !isMyFlowScenarioDemo && contentReadiness.kind !== 'ready';

    return (
      <article
        key={flow.progress.slug}
        data-testid="my-flow-group-row"
        data-flow-slug={flow.progress.slug}
        className={`rounded-lg border p-3 ${showContentReadinessBadge ? 'border-amber-200 bg-amber-50/70 shadow-none' : 'border-slate-200 bg-white shadow-sm'}`}
      >
        <div className="flex items-start gap-3">
          <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-base font-semibold text-slate-950">{flowTitle}</h4>
                  {showContentReadinessBadge ? (
                    <span data-testid="my-flow-content-readiness" className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                      {contentReadiness.label}
                    </span>
                  ) : null}
                </div>
                {savedMapTitle ? <p className="mt-1 text-xs font-semibold text-blue-700">{savedMapTitle}</p> : null}
                <p className="mt-1 text-xs font-semibold text-slate-500">{flow.meta}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{flow.done}/{flow.total}</span>
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{flow.percent}%</span>
              </div>
            </div>
            {nextRow ? (
              <div className="mt-3 rounded-md bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-500">{getMyFlowRowStatusLabel(nextRow)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{nextRow.title}</p>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300"
                type="button"
                aria-label={nextRow ? getMyFlowOpenActionAriaLabel(nextRow.title, nextActionLabel) : getMyFlowOpenActionAriaLabel(flowTitle, nextActionLabel)}
                onClick={() => (nextRow ? openMyFlowRowFromFlowTab(flow, nextRow) : setSelectedSavedFlowSlug(flow.progress.slug))}
              >
                {nextActionLabel}
              </button>
              <Link className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300" href={sourceHref}>
                {sourceLabel}
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderCompactFlowStructureRow = (flow: MySavedFlow) => {
    const flowTitle = getMyFlowExecutionFlowTitle(flow.progress.title);
    const nextRow = getSavedFlowNextRow(flow);
    const progressSummary = `${flow.done}/${flow.total} 완료`;
    const structureLabel = flow.savedMap
      ? toUserFacingMapTitle(flow.savedMap.title)
      : flow.bundle.flow.structure_type === 'routine'
        ? '반복 흐름'
        : flow.rows.some((row) => Boolean(row.date))
          ? '일정 흐름'
          : '체크 흐름';
    const activeCompactRow =
      myFlowDetailSurface === 'flow' && myFlowActiveRow && myFlowDetailOpen && myFlowActiveRow.flow.progress.slug === flow.progress.slug
        ? myFlowActiveRow
        : null;
    const activeCompactKey = activeCompactRow ? getMyFlowRowInstanceKey(activeCompactRow) : '';
    const flowExpanded = myFlowExpandedStructureSlug === flow.progress.slug || Boolean(activeCompactRow);
    const stepRows = flow.rows.map((row) => getMyFlowRowForFlowTab(flow, row));
    const stepEntries = stepRows.map((row, index) => ({ row, index }));
    const allStepsVisible = myFlowExpandedStructureStepSlug === flow.progress.slug;
    const shouldLimitStepRows = stepEntries.length > MY_FLOW_MOBILE_STRUCTURE_STEP_PREVIEW_LIMIT && !allStepsVisible;
    const visibleStepEntries = shouldLimitStepRows
      ? stepEntries.slice(0, MY_FLOW_MOBILE_STRUCTURE_STEP_PREVIEW_LIMIT)
      : stepEntries;
    const hiddenStepCount = stepEntries.length - visibleStepEntries.length;
    return (
      <article
        key={`compact-${flow.progress.slug}`}
        data-testid="my-flow-mobile-structure-row"
        data-flow-slug={flow.progress.slug}
        className={`rounded-lg border p-3 shadow-sm ${flowExpanded ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white'}`}
      >
        <button
          type="button"
          data-testid="my-flow-mobile-structure-open"
          aria-expanded={flowExpanded}
          className="w-full rounded-md text-left"
          onClick={() => toggleMyFlowStructureFlow(flow)}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-1 gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${flowExpanded ? 'bg-blue-700' : 'bg-slate-400'}`} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-950">{flowTitle}</span>
                <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{structureLabel}</span>
              </span>
            </span>
            <span
              data-testid="my-flow-mobile-structure-progress"
              className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${flowExpanded ? 'bg-white text-blue-700 ring-1 ring-blue-100' : 'bg-slate-100 text-slate-700'}`}
            >
              {progressSummary}
            </span>
          </span>
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-blue-700" style={{ width: `${flow.percent}%` }} aria-hidden="true" />
          </span>
          {nextRow && !flowExpanded ? (
            <span className="mt-3 block rounded-md bg-slate-50 px-3 py-2">
              <span className="block text-xs font-semibold text-blue-700">{getMyFlowRowStatusLabel(nextRow)}</span>
              <span className="mt-1 block text-sm font-semibold text-slate-950">{nextRow.title}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                {[nextRow.date ? formatMyFlowDisplayDate(nextRow.date) : '', nextRow.section ? toUserFacingSourceTitle(nextRow.section) : ''].filter(Boolean).join(' · ') || progressSummary}
              </span>
            </span>
          ) : !nextRow ? (
            <span className="mt-3 block rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">남은 항목이 없습니다.</span>
          ) : null}
        </button>
        {flowExpanded ? (
          <div data-testid="my-flow-mobile-structure-step-list" className="mt-3 grid gap-2">
            {visibleStepEntries.map(({ row: stepRow, index }) => {
              const stepKey = getMyFlowRowInstanceKey(stepRow);
              const stepOpen = activeCompactKey === stepKey;
              const stepChecked = isMyFlowRowChecked(flow, stepRow);
              return (
                <div key={`step-${flow.progress.slug}-${stepRow.id}-${stepRow.date ?? index}`} className="rounded-md bg-white ring-1 ring-blue-100">
                  <button
                    type="button"
                    data-testid="my-flow-mobile-structure-step-row"
                    aria-expanded={stepOpen}
                    className={`w-full rounded-md px-3 py-2 text-left ${stepOpen ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
                    onClick={() => openMyFlowRowFromFlowTab(flow, stepRow)}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold text-slate-500">단계 {index + 1}</span>
                        <span className={`mt-0.5 block text-sm font-semibold ${stepChecked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                          {getMyFlowRowDisplayTitle(stepRow)}
                        </span>
                        <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                          {[stepRow.date ? formatMyFlowDisplayDate(stepRow.date) : '', stepRow.timing ? formatMyFlowTimingChip(stepRow.timing) : '', getMyFlowRowDisplaySectionLabel(stepRow)].filter(Boolean).join(' · ') || progressSummary}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${stepChecked ? 'bg-emerald-50 text-emerald-700' : stepOpen ? 'bg-white text-blue-700 ring-1 ring-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                        {stepChecked ? '완료' : stepOpen ? '열림' : '열기'}
                      </span>
                    </span>
                  </button>
                  {stepOpen && activeCompactRow ? (
                    <div
                      ref={(node) => {
                        myFlowInlineDetailRef.current = node;
                        if (node) scrollMyFlowInlineDetailIntoView(node);
                      }}
                      className="px-3 pb-3"
                      data-testid="my-flow-mobile-structure-inline-detail"
                    >
                      {renderMyFlowItemDetailEditor(activeCompactRow, 'inline', 'flow')}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {hiddenStepCount > 0 ? (
              <button
                type="button"
                data-testid="my-flow-mobile-structure-show-all"
                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-left text-sm font-semibold text-blue-700"
                onClick={() => setMyFlowExpandedStructureStepSlug(flow.progress.slug)}
              >
                전체 단계 보기 · {hiddenStepCount}개 더
              </button>
            ) : allStepsVisible && stepEntries.length > MY_FLOW_MOBILE_STRUCTURE_STEP_PREVIEW_LIMIT ? (
              <button
                type="button"
                data-testid="my-flow-mobile-structure-collapse"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700"
                onClick={() => {
                  setMyFlowExpandedStructureStepSlug('');
                  resetMyFlowRowDetailState();
                }}
              >
                주요 단계만 보기
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    );
  };

  const renderSavedFlowOverviewCard = (flow: MySavedFlow) => {
    const flowTitle = getMyFlowExecutionFlowTitle(flow.progress.title);
    const savedMapTitle = flow.savedMap ? toUserFacingMapTitle(flow.savedMap.title) : '';
    const nextRow = getSavedFlowNextRow(flow);
    const progressSummary = `${flow.done}/${flow.total} 완료`;
    const anchorDisplay = getMyFlowAnchorDisplay(flow.bundle, flow.anchor, myFlowDemoMode);
    const nextActionLabel = getMyFlowOpenActionLabel(flow.bundle);
    const typeCounts = flow.bundle.flow.tags?.includes('progress-flow') ? [] : getMyFlowTypeCounts(flow.rows);
    const sourceHref = getMyFlowSourceHref(flow);
    const sourceLabel = getMyFlowSourceLinkLabel(flow);
    const contentReadiness = getMyFlowContentReadiness(flow);
    const showContentReadinessBadge = !isMyFlowScenarioDemo && contentReadiness.kind !== 'ready';
    const hiddenInInventory = hiddenFlowSlugSet.has(flow.progress.slug);
    const showHideToggle = savedFlows.length > 1 && !isMyFlowMobileViewport;
    const activeOverviewRow =
      myFlowDetailSurface === 'flow' && myFlowActiveRow && myFlowDetailOpen && myFlowActiveRow.flow.progress.slug === flow.progress.slug
        ? myFlowActiveRow
        : null;
    const cardToneClass = showContentReadinessBadge
      ? 'border-amber-200 bg-amber-50/70 shadow-none'
      : 'border-slate-200 bg-white shadow-sm';
    const nextActionToneClass = showContentReadinessBadge
      ? 'border-amber-100 bg-white'
      : 'border-blue-100 bg-blue-50';

    return (
      <section
        key={flow.progress.slug}
        data-testid="my-flow-overview-card"
        data-flow-slug={flow.progress.slug}
        className={`rounded-lg border p-4 ${cardToneClass}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 text-xl font-semibold tracking-tight text-slate-950">{flowTitle}</h3>
              {showContentReadinessBadge ? (
                <span data-testid="my-flow-content-readiness" className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                  {contentReadiness.label}
                </span>
              ) : null}
            </div>
            {showContentReadinessBadge ? (
              <p className="mt-2 text-xs font-semibold text-amber-800">{getMyFlowContentReadinessNote(contentReadiness)}</p>
            ) : null}
            {flow.savedMap ? (
              <p data-testid="my-flow-map-context" className="mt-2 w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                저장한 콘텐츠 · {savedMapTitle}
              </p>
            ) : null}
            {anchorDisplay ? (
              <p className="mt-2 w-fit rounded-md bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-700">
                {anchorDisplay}
              </p>
            ) : null}
            {flow.demoNote ? <p className="mt-2 text-xs font-semibold text-slate-500">{flow.demoNote}</p> : null}
            {typeCounts.length > 0 ? (
              <div data-testid="my-flow-type-counts" className="mt-3 hidden flex-wrap gap-1.5 sm:flex">
                {typeCounts.map(({ type, count }) => (
                  <span key={type} className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                    {MY_FLOW_ITEM_TYPE_LABELS[type]} {count}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <div data-testid="my-flow-next-action" className={`mt-4 rounded-md border px-3 py-3 ${nextActionToneClass}`}>
          <p className={`text-xs font-semibold ${showContentReadinessBadge ? 'text-slate-600' : 'text-blue-700'}`}>{nextRow ? getMyFlowRowStatusLabel(nextRow) : '다음에 볼 항목'}</p>
          {nextRow ? (
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">{[nextRow.timing ? formatMyFlowTimingChip(nextRow.timing) : '', nextRow.date ? formatMyFlowDisplayDate(nextRow.date) : '', nextRow.section ? toUserFacingSourceTitle(nextRow.section) : ''].filter(Boolean).join(' · ')}</p>
              <p className="mt-0.5 font-semibold text-slate-950">{nextRow.title}</p>
              </div>
              <button
                type="button"
                data-testid="my-flow-next-action-open"
                className={`min-h-9 shrink-0 rounded-md px-3 py-2 text-xs font-semibold ${showContentReadinessBadge ? 'border border-slate-200 bg-white text-slate-800' : 'bg-blue-700 text-white'}`}
                aria-label={getMyFlowOpenActionAriaLabel(nextRow.title, nextActionLabel)}
                onClick={() => openMyFlowRowFromFlowTab(flow, nextRow)}
              >
                {nextActionLabel}
              </button>
            </div>
          ) : (
            <p className="mt-1 text-sm text-slate-600">남은 실행 항목이 없습니다.</p>
          )}
        </div>
        {activeOverviewRow ? (
          <div className="mt-3" data-testid="my-flow-overview-inline-detail">
            {renderMyFlowItemDetailEditor(activeOverviewRow, 'inline', 'flow')}
          </div>
        ) : null}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
            <span>진행</span>
            <span data-testid="my-flow-overview-progress-summary" className="text-slate-950">{progressSummary}</span>
          </div>
          <div
            data-testid="my-flow-overview-progress-bar"
            className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
            aria-label={`진행 ${progressSummary}`}
            role="img"
          >
            <div className="h-full bg-blue-700" style={{ width: `${flow.percent}%` }} />
          </div>
        </div>
        <div className={`mt-4 grid gap-2 ${showHideToggle ? 'sm:grid-cols-[minmax(0,1fr)_auto]' : ''}`}>
          <Link className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300" href={sourceHref}>
                {flow.savedMap ? '원문 보기' : sourceLabel}
          </Link>
          {showHideToggle ? (
            <button
              type="button"
              data-testid="my-flow-hide-toggle"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-blue-300 hover:text-slate-900"
              onClick={() => toggleMyFlowHiddenFlow(flow.progress.slug)}
            >
              {hiddenInInventory ? '목록에 보이기' : '목록에서 숨기기'}
            </button>
          ) : null}
        </div>
      </section>
    );
  };

  const renderFlowInventoryGroups = (groups: MyFlowInventoryGroup[]) => (
    <div data-testid="my-flow-map-group-list" className="grid gap-4">
      {groups.map((group) => {
        const done = group.flows.reduce((sum, flow) => sum + flow.done, 0);
        const total = group.flows.reduce((sum, flow) => sum + flow.total, 0);
        const isMapGroup = Boolean(group.savedMap);
        return (
          <section
            key={group.key}
            data-testid={isMapGroup ? 'my-flow-map-group' : 'my-flow-inventory-group'}
            className={isMapGroup ? 'rounded-lg border border-blue-100 bg-blue-50/45 p-3' : 'rounded-lg border border-slate-200 bg-white p-3'}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${isMapGroup ? 'text-blue-700' : 'text-slate-500'}`}>{isMapGroup ? '저장한 콘텐츠' : group.label}</p>
                <h4 className="mt-1 text-base font-semibold text-slate-950">{group.savedMap ? toUserFacingMapTitle(group.title) : toContentDisplayTitle(group.title)}</h4>
                <p className="mt-1 text-xs font-semibold text-slate-600">{group.flows.length}개 목록 · {done}/{total} 완료</p>
              </div>
              {group.savedMap ? (
                <Link
                  data-testid="my-flow-map-group-source-link"
                  className="inline-flex min-h-8 shrink-0 items-center justify-center rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:border-blue-300"
                  href={`/flow-maps/${group.savedMap.mapId}`}
                >
                    원문 보기
                </Link>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {group.flows.map((flow) => renderSavedFlowOverviewCard(flow))}
            </div>
          </section>
        );
      })}
    </div>
  );

  const dismissMyFlowMapUpdateNotice = (notice: MyFlowMapUpdateNotice) => {
    setMyFlowDismissedMapUpdates((current) => {
      const next = {
        ...current,
        [notice.mapId]: {
          savedVersion: notice.savedVersion,
          ...(notice.currentVersion ? { currentVersion: notice.currentVersion } : {}),
          dismissedAt: new Date().toISOString(),
        },
      };
      if (!isMyFlowScenarioDemo) saveMyFlowDismissedMapUpdates(next);
      return next;
    });
  };

  const applyMyFlowMapUpdateNotice = (notice: MyFlowMapUpdateNotice) => {
    if (typeof window === 'undefined' || notice.status === 'map_missing') return;

    const savedAt = new Date().toISOString();
    const snapshot = buildSourceBackedFlowMapSavedSnapshot(notice.mapId, {
      savedAt,
      ...(notice.anchor ? { anchor: notice.anchor } : {}),
    });
    if (!snapshot) return;

    window.localStorage.setItem(getSourceBackedFlowMapSnapshotStorageKey(notice.mapId), JSON.stringify(snapshot));
    const persistenceRecord = buildSourceBackedFlowMapPersistenceRecord(notice.mapId, {
      savedAt,
      ...(notice.anchor ? { anchor: notice.anchor } : {}),
    });
    if (persistenceRecord) {
      window.localStorage.setItem(getSourceBackedFlowMapPersistenceStorageKey(notice.mapId), JSON.stringify(persistenceRecord));
    }
    snapshot.flowSlugs.forEach((slug) => {
      if (getSavedFlowRecord(slug)) return;
      saveFlowRecord(slug, {
        selectedArtifactMode: 'calendar',
        ...(notice.anchor ? { anchor: notice.anchor } : {}),
      });
    });

    setMyFlowDismissedMapUpdates((current) => {
      const next = { ...current };
      delete next[notice.mapId];
      if (!isMyFlowScenarioDemo) saveMyFlowDismissedMapUpdates(next);
      return next;
    });
    setMyFlowExpandedMapUpdateId('');
    setMyFlowAppliedMapUpdateId(notice.mapId);
    refreshSavedFlowState();
  };

  const getMyFlowUpdateRowTitle = (slug: string) => toContentDisplayTitle(myFlowBundles.find((entry) => entry.flow.slug === slug)?.flow.title ?? slug);

  const renderMyFlowMapUpdateNotices = () => {
    if (myFlowMapUpdateNotices.length === 0 && myFlowAppliedMapUpdateId) {
      return (
        <section data-testid="my-flow-map-update-applied" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">새 기준으로 표시했습니다.</p>
          <p className="mt-1 text-xs font-medium text-emerald-800">기존 체크와 메모는 유지하고, 새로 추가된 Flow만 목록에 더합니다.</p>
        </section>
      );
    }

    return myFlowMapUpdateNotices.length > 0 ? (
      <section data-testid="my-flow-map-update-review" className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-amber-800">업데이트 확인</p>
            <h4 className="text-base font-semibold text-amber-950">저장한 콘텐츠에 다시 볼 내용이 있습니다</h4>
            <p className="mt-1 text-sm font-medium text-amber-900">기존 항목은 그대로 두고, 원문이나 일정 변경 가능성만 따로 확인합니다.</p>
          </div>
          <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{myFlowMapUpdateNotices.length}개</span>
        </div>
        <div className="mt-3 grid gap-2">
          {myFlowMapUpdateNotices.map((notice) => {
            const expanded = myFlowExpandedMapUpdateId === notice.mapId;
            return (
              <article key={notice.mapId} data-testid="my-flow-map-update-notice" className="rounded-md border border-amber-100 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${notice.tone === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
                      {notice.label}
                    </span>
                    <h5 className="mt-2 text-sm font-semibold text-slate-950">{toUserFacingMapTitle(notice.title)}</h5>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      영향 Flow {notice.affectedCount}개 · {notice.canApplyAutomatically ? '확인 후 바로 반영 가능' : '검토 후 반영'}
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-1.5 sm:w-auto sm:flex sm:shrink-0 sm:flex-wrap">
                    <button
                      type="button"
                      data-testid="my-flow-map-update-toggle"
                      aria-expanded={expanded}
                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-blue-100 bg-blue-50 px-2.5 text-xs font-semibold text-blue-800 hover:border-blue-300"
                      onClick={() => setMyFlowExpandedMapUpdateId(expanded ? '' : notice.mapId)}
                    >
                      {expanded ? '변경 접기' : '변경 보기'}
                    </button>
                    <button
                      type="button"
                      data-testid="my-flow-map-update-apply"
                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-emerald-100 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={notice.status === 'map_missing'}
                      onClick={() => applyMyFlowMapUpdateNotice(notice)}
                    >
                      새 기준으로 표시
                    </button>
                    <Link className="inline-flex min-h-8 items-center justify-center rounded-md border border-amber-100 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 hover:border-amber-300" href={`/flow-maps/${notice.mapId}`}>
                      전체 보기
                    </Link>
                    <button
                      type="button"
                      data-testid="my-flow-map-update-dismiss"
                      className="inline-flex min-h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-slate-300"
                      onClick={() => dismissMyFlowMapUpdateNotice(notice)}
                    >
                      지금은 숨기기
                    </button>
                  </div>
                </div>
                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                  자동 반영 안 함. 기존 체크와 메모는 유지하고, 새 Flow가 있으면 목록에만 추가합니다. 제외된 Flow는 삭제하지 않습니다.
                </p>
                {notice.reasons.length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-xs font-medium text-amber-900">
                    {notice.reasons.slice(0, 2).map((reason) => (
                      <li key={reason}>- {reason}</li>
                    ))}
                  </ul>
                ) : null}
                {expanded ? (
                  <div data-testid="my-flow-map-update-comparison" className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded bg-white px-2 py-1 ring-1 ring-slate-200">저장 {notice.savedVersion}</span>
                      {notice.currentVersion ? <span className="rounded bg-white px-2 py-1 ring-1 ring-slate-200">현재 {notice.currentVersion}</span> : null}
                    </div>
                    <div className="mt-3 grid gap-2">
                      {notice.comparisonRows.map((row) => (
                        <div key={row.slug} data-testid="my-flow-map-update-comparison-row" className="rounded-md border border-slate-200 bg-white p-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-950">{getMyFlowUpdateRowTitle(row.slug)}</p>
                            <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {row.changeLabels.join(' · ')}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-slate-500">
                            항목 {row.savedStepCount ?? '-'} → {row.currentStepCount ?? '-'}
                            {row.savedSourceCheckedAt || row.currentSourceCheckedAt
                              ? ` · 출처 ${row.savedSourceCheckedAt ?? '-'} → ${row.currentSourceCheckedAt ?? '-'}`
                              : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    ) : null;
  };

  const renderFlowReadinessInventory = () => (
    <div data-testid="my-flow-readiness-sections" className="grid gap-4">
      {flowListReadyFlows.length > 0 ? (
        <section data-testid="my-flow-ready-section">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-blue-700">실행 가능</p>
              <h4 className="text-base font-semibold text-slate-950">바로 이어서 볼 콘텐츠</h4>
            </div>
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{flowListReadyFlows.length}개</span>
          </div>
          {renderFlowInventoryGroups(flowListReadyGroups)}
        </section>
      ) : null}
      {flowListSupportFlows.length > 0 ? (
        <section data-testid="my-flow-review-section" className="rounded-lg border border-amber-200 bg-amber-50/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-amber-800">원문 확인</p>
              <h4 className="text-base font-semibold text-amber-950">확인 후 실행할 콘텐츠</h4>
            </div>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{flowListSupportFlows.length}개</span>
          </div>
          <p className="mt-1 text-sm font-medium text-amber-900">
            원문이나 저장 형식 확인이 필요한 콘텐츠는 바로 실행할 콘텐츠와 구분합니다.
          </p>
          <div className="mt-3">
            {renderFlowInventoryGroups(flowListSupportGroups)}
          </div>
        </section>
      ) : null}
    </div>
  );

  return (
    <main className={`mx-auto max-w-6xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-5 md:pb-8 ${isCalendarSurface ? 'py-3 sm:py-6' : 'py-4 sm:py-8'}`}>
      <PlatformNav />
      <div className={`flex flex-wrap items-end justify-between gap-4 ${isCalendarSurface ? 'mb-3 sm:mb-5' : 'mb-5 sm:mb-8'}`}>
        <div>
          <p className={isCalendarSurface ? 'text-xs font-semibold text-blue-700' : 'text-sm font-medium text-gray-500'}>{isCalendarSurface ? '일정 보기' : '내 실행 공간'}</p>
          <h1 className={`${isCalendarSurface ? 'mt-0.5 text-2xl' : 'mt-1 text-2xl sm:text-3xl'} font-semibold tracking-tight`}>{isCalendarSurface ? '캘린더' : '내 Flow'}</h1>
          <p className={`${isCalendarSurface ? 'hidden sm:block' : 'sm:mt-2 sm:text-base'} mt-1 text-sm text-gray-600`}>
            {isCalendarSurface
              ? '저장한 콘텐츠의 날짜가 있는 항목을 바로 확인합니다.'
              : '오늘, 다음, 지난 할 일을 먼저 봅니다.'}
          </p>
        </div>
        {savedFlows.length > 0 ? (
          <div className="hidden flex-wrap gap-2 sm:flex">
            <Link className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800" href={`/u/${currentUser.slug}`}>
              스튜디오
            </Link>
            <Link className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" href="/flows">
              Flow 찾기
            </Link>
          </div>
        ) : null}
      </div>

      {savedFlows.length === 0 ? (
        <section data-testid="my-flow-empty-state" className="rounded-xl border border-dashed border-slate-300 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-blue-700">{isCalendarSurface ? '저장한 일정 없음' : '저장한 콘텐츠 없음'}</p>
          <h2 className="mt-2 break-keep text-2xl font-semibold tracking-tight text-slate-950">
            {isCalendarSurface ? '일정이 생길 콘텐츠를 먼저 고르세요' : '저장할 콘텐츠를 먼저 고르세요'}
          </h2>
          <p className="mt-2 max-w-xl break-keep text-sm leading-6 text-slate-600">
            {isCalendarSurface
              ? '날짜가 있는 콘텐츠를 저장하면 가장 가까운 일정부터 보여줍니다.'
              : '하나를 저장하면 오늘, 다음, 지난 할 일이 여기에서 바로 이어집니다.'}
          </p>
          <div className="mt-5">
            <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white sm:w-auto" href="/flows">
              콘텐츠 고르러 가기
            </Link>
          </div>
        </section>
      ) : null}

      {savedFlows.length > 0 ? (
        <section className="mb-6">
          <div className={`mb-2 flex-wrap items-end justify-between gap-3 sm:mb-3 ${isCalendarSurface ? 'hidden lg:flex' : 'hidden sm:flex'}`}>
            <div>
              <p className="text-sm font-semibold text-blue-700">{myFlowWorkspaceHeader.eyebrow}</p>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">{myFlowWorkspaceHeader.title}</h2>
                {showDemoData ? (
                  <span data-testid="my-flow-demo-badge" className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                    {myFlowDemoMode === 'ux20' ? 'UX20 데모' : myFlowDemoMode === 'ux12' ? 'UX12 데모' : myFlowDemoMode === 'source-backed' ? '원문 기반 데모' : '데모 데이터'}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="hidden text-sm text-gray-500 sm:block">{myFlowWorkspaceHeader.help}</p>
          </div>
          {showPostSavePanel ? renderPostSavePanel() : null}
          {showMyFlowWorkspace ? (
          <div
            data-testid="my-flow-workspace"
            ref={myFlowWorkspaceRef}
            className={`mb-4 grid gap-4 ${showMyFlowSidebar ? 'lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]' : ''}`}
          >
            {showMyFlowSidebar ? (
              <aside data-testid="my-flow-list" className="hidden self-start rounded-lg border border-slate-200 bg-white p-3 shadow-sm lg:block">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">실행 목록</p>
                    <h3 className="text-base font-semibold text-slate-950">Flow 목록</h3>
                  </div>
                  <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{savedFlows.length}개</p>
                </div>
                <div className="grid gap-2">
                  {savedFlows.map((flow) => (
                    <button
                      key={flow.progress.slug}
                      className={`rounded-md border px-3 py-3 text-left ${selectedSavedFlowSlug === flow.progress.slug ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50'}`}
                      type="button"
                      aria-pressed={selectedSavedFlowSlug === flow.progress.slug}
                      data-testid={`my-flow-filter-${flow.progress.slug}`}
                      onClick={() => setSelectedSavedFlowSlug(flow.progress.slug)}
                    >
                      <span className="block text-sm font-semibold">{getMyFlowExecutionFlowTitle(flow.progress.title)}</span>
                      <span className="mt-1 block text-xs font-semibold text-blue-700">{flow.done}/{flow.total} 완료</span>
                    </button>
                  ))}
                </div>
              </aside>
            ) : null}
            <div className="min-w-0">
              {showMyFlowWorkspaceControls ? (
              <div className="mb-4 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:flex sm:items-end sm:justify-between sm:gap-3">
                {showMyFlowScopeControl ? (
                  <div className="min-w-0 sm:w-72">
                    <label className="mb-1 block text-xs font-semibold text-slate-500" htmlFor="my-flow-scope">
                      보기 범위
                    </label>
                    <select
                      id="my-flow-scope"
                      className="min-h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      value={selectedSavedFlowSlug}
                      data-testid="my-flow-scope-select"
                      onChange={(event) => setSelectedSavedFlowSlug(event.target.value)}
                    >
                      <option value="all">전체 Flow</option>
                      {savedFlows.map((flow) => (
                        <option key={flow.progress.slug} value={flow.progress.slug}>
                          {getMyFlowExecutionFlowTitle(flow.progress.title)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {showSavedViewTabs ? (
                  <div className="mt-3 grid gap-2 sm:mt-0 sm:justify-items-end">
                    <div className={`grid ${primarySavedViewTabGridClass} gap-1 rounded-md bg-slate-100 p-1 sm:inline-grid sm:gap-2`}>
                      {primarySavedViewTabs.map(([id, label]) => (
                        <button
                          key={id}
                          className={`rounded-md px-3 py-2 text-sm font-semibold ${savedView === id ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-700 hover:bg-white'}`}
                          type="button"
                          aria-pressed={savedView === id}
                          data-testid={`my-flow-view-${id}`}
                          onClick={() => selectMyFlowView(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {secondarySavedViewTabs.length > 0 ? (
                      <div className="flex flex-wrap justify-end gap-1">
                        {secondarySavedViewTabs.map(([id, label]) => (
                          <button
                            key={id}
                            className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${savedView === id ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'}`}
                            type="button"
                            aria-pressed={savedView === id}
                            data-testid={`my-flow-view-${id}`}
                            onClick={() => selectMyFlowView(id)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              ) : null}

              {savedView === 'today' ? (
                <div className="mb-4 grid min-w-0 gap-4">
                  <section data-testid="my-flow-now-section" className="grid min-w-0 gap-3 rounded-lg border border-blue-100 bg-white p-3 shadow-sm sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">{myFlowNowEyebrow}</p>
                        <h3 className="mt-0.5 text-base font-semibold text-slate-950 sm:mt-1 sm:text-lg">
                          {myFlowNowTitle}
                        </h3>
                        {!isMyFlowMobileViewport ? (
                          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                            {myFlowNowHelp}
                          </p>
                        ) : null}
                      </div>
                      {myFlowPrimaryContinuationRow ? (
                        <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                          {myFlowPrimaryContinuationRow.date ? formatMyFlowDisplayDate(myFlowPrimaryContinuationRow.date) : '날짜 없음'}
                        </span>
                      ) : null}
                    </div>
                    {myFlowPrimaryContinuationRow ? (
                      renderMobileContinuationFlowCard(myFlowPrimaryContinuationRow, { tone: 'primary', hideLeadLabel: true })
                    ) : null}
                  </section>

                  <section data-testid="my-flow-today-summary" className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">{isMyFlowScenarioDemo ? '데모 기준일' : '오늘 상태'}</p>
                        <h3 className="mt-0.5 text-lg font-semibold text-slate-950 sm:mt-1 sm:text-xl">오늘 할 일</h3>
                        <p data-testid="my-flow-today-date-meta" className="mt-1 text-xs font-semibold text-slate-500">
                          {formatMyFlowDisplayDate(myFlowTodayDate, { includeWeekday: true })}
                        </p>
                        {isMyFlowScenarioDemo ? (
                          <p className="mt-1 inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 sm:py-1">
                            실제 오늘과 다른 고정 기준일
                          </p>
                        ) : null}
                    <p className="mt-1 text-xs text-slate-600 sm:text-sm">{myFlowTodaySummaryCopy}</p>
                      </div>
                      <div className="hidden grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-600 sm:grid sm:w-80">
                        <div className="rounded-md bg-slate-50 px-2 py-2">
                          <p className="text-lg font-semibold text-slate-950">{todayOpenCount}</p>
                          <p>남음</p>
                        </div>
                        <div className="rounded-md bg-slate-50 px-2 py-2">
                          <p className="text-lg font-semibold text-slate-950">{todayRoutineRows.length}</p>
                          <p>루틴</p>
                        </div>
                        <div className="rounded-md bg-slate-50 px-2 py-2">
                          <p className="text-lg font-semibold text-slate-950">{overdueRows.length}</p>
                          <p>지난 할 일</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {showTodayOpenSection && !isMyFlowMobileViewport ? (
                    <section data-testid="my-flow-today-list" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950">오늘 할 일</h3>
                          <p className="mt-1 text-sm text-slate-600">{visibleTodayOpenScheduleRows.length}개 일정 · {visibleTodayOpenRoutineRows.length}개 루틴</p>
                        </div>
                      </div>
                      {visibleTodayOpenRows.length > 0 ? (
                        <div data-testid="my-flow-today-open-list" className="mt-3 grid gap-2">
                          {visibleTodayOpenScheduleRows.map((row) => renderExecutionRow(row, { kind: 'schedule', openDetail: true, inlineDetail: true, detailSurface: 'today' }))}
                          {visibleTodayOpenRoutineRows.map((row) => renderExecutionRow(row, { kind: 'routine', openDetail: true, inlineDetail: true, detailSurface: 'today' }))}
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {myFlowSecondaryContinuationRows.length > 0 ? (
                    <section data-testid="my-flow-upcoming-list" className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-500">다음 항목</p>
                          <h3 className="mt-1 text-lg font-semibold text-slate-950">가까운 할 일만 보기</h3>
                        </div>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {myFlowSecondaryContinuationRows.length}개
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {myFlowSecondaryContinuationRows.map((row) => renderMobileContinuationFlowCard(row))}
                      </div>
                    </section>
                  ) : null}

                  {overdueRows.length > 0 ? (
                    <section data-testid="my-flow-overdue-list" className="min-w-0 rounded-lg border border-amber-100 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-amber-700">지난 할 일</p>
                          <h3 className="mt-0.5 text-sm font-semibold text-slate-950">{overdueRows.length}개 남음</h3>
                          <p className="mt-0.5 truncate text-xs text-slate-500">필요한 일정만 열어 완료하거나 메모합니다.</p>
                        </div>
                        <button
                          type="button"
                          data-testid="my-flow-overdue-open-sheet"
                          className="min-h-9 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
                          onClick={() => setMyFlowStatusSheet('overdue')}
                        >
                          지난 할 일 보기
                        </button>
                      </div>
                      {!isMyFlowMobileViewport && overdueSummaryPreview.length > 0 ? (
                        <div className="mt-3 grid gap-2">
                          {overdueSummaryPreview.map((summary) => (
                            <div key={summary.title} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm ring-1 ring-amber-100">
                              <span className="min-w-0 truncate font-semibold text-slate-900">{summary.title}</span>
                              <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                                {summary.count}개
                              </span>
                            </div>
                          ))}
                          {hiddenOverdueFlowCount > 0 ? (
                            <p className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-100">
                              외 {hiddenOverdueFlowCount}개 콘텐츠에 지난 할 일이 있습니다.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {todayCompletedRows.length > 0 ? (
                    <section data-testid="my-flow-today-completed-list" className="min-w-0 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-500">보조 상태</p>
                          <h3 className="mt-0.5 text-sm font-semibold text-slate-800">오늘 완료</h3>
                        </div>
                        <button
                          type="button"
                          data-testid="my-flow-today-completed-toggle"
                          className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                          aria-expanded={myFlowTodayCompletedOpen}
                          onClick={() => setMyFlowTodayCompletedOpen((open) => !open)}
                        >
                          {myFlowTodayCompletedOpen ? '오늘 완료 접기' : `오늘 완료 ${todayCompletedRows.length}개 보기`}
                        </button>
                      </div>
                      {myFlowTodayCompletedOpen ? (
                        <div className="mt-2 grid gap-2">
                          {todayCompletedRows.map((row) =>
                            renderExecutionRow(row, {
                              kind: row.flow.bundle.flow.structure_type === 'routine' ? 'routine' : 'schedule',
                              compact: true,
                              openDetail: true,
                              inlineDetail: true,
                              minimalMeta: true,
                              detailSurface: 'today',
                            }),
                          )}
                        </div>
                      ) : null}
                    </section>
                  ) : null}
                </div>
              ) : null}

          {savedView === 'flow' ? (
            <div className="grid gap-4">
              {selectedSavedFlowSlug === 'all' ? renderMyFlowMapUpdateNotices() : null}
              {selectedSavedFlowSlug === 'all' && visibleSavedFlows.length > 0 ? (
                <>
                  {isMyFlowMobileViewport ? (
                    <div data-testid="my-flow-mobile-flow-hub" className="grid gap-3">
                      <section data-testid="my-flow-mobile-flow-summary" className="rounded-2xl border border-[#E7E4DD] bg-white px-3 py-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="shrink-0 text-sm font-semibold text-[#3654FF]">저장한 콘텐츠</p>
                          {mobileFlowSummaryChips.length > 0 ? (
                            <div className="flex min-w-0 flex-wrap justify-end gap-1.5 text-[11px] font-semibold">
                              {mobileFlowSummaryChips.map((chip) => (
                                <span key={chip.label} className={`rounded-md px-2 py-1 ${chip.className}`}>
                                  {chip.label}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <p className="mt-2 truncate text-xs font-semibold text-[#6E6B64]">
                          {mobileFlowSummaryText}
                        </p>
                      </section>
                      {flowListVisibleFlows.length > 0 ? (
                        <div className="grid gap-3">
                          {mobileFlowBoardVisibleFlows.map((flow) => renderCompactFlowStructureRow(flow))}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">조건에 맞는 Flow가 없습니다.</p>
                      )}
                      {hiddenMobileFlowBoardCount > 0 ? (
                        <button
                          type="button"
                          data-testid="my-flow-mobile-inventory-open"
                          className="mt-4 w-full rounded-md bg-blue-700 px-4 py-3 text-left text-sm font-semibold text-white shadow-sm"
                          onClick={() => openMyFlowFilteredInventory('all')}
                        >
                          전체 Flow 목록 열기 · {hiddenMobileFlowBoardCount}개 더 보기
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  {!isMyFlowMobileViewport ? (
                  <section data-testid="my-flow-status-board" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">저장한 콘텐츠 정리</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">진행 중인 Flow를 한눈에 확인하세요</h3>
                        <p className="mt-1 text-sm text-slate-600">다음 실행, 진행률, 지난 할 일을 먼저 보고 전체 목록은 필요할 때 펼칩니다.</p>
                      </div>
                      <span className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{visibleSavedFlows.length}개 콘텐츠</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <button
                        type="button"
                        data-testid="my-flow-status-open"
                        className="rounded-md bg-slate-50 px-3 py-2 text-left transition hover:bg-white hover:ring-2 hover:ring-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        onClick={() => openMyFlowFilteredInventory('open')}
                      >
                        <p className="text-xs font-semibold text-slate-500">진행 중</p>
                        <p className="mt-1 text-xl font-semibold text-slate-950">{myFlowStatusOpenFlowCount}</p>
                      </button>
                      <div className="rounded-md bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold text-slate-500">평균 진행</p>
                        <p className="mt-1 text-xl font-semibold text-slate-950">{myFlowStatusAveragePercent}%</p>
                      </div>
                      <button
                        type="button"
                        data-testid="my-flow-status-next"
                        className="rounded-md bg-blue-50 px-3 py-2 text-left transition hover:bg-white hover:ring-2 hover:ring-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        onClick={() => setMyFlowStatusSheet('next')}
                      >
                        <p className="text-xs font-semibold text-blue-700">다음 실행</p>
                        <p className="mt-1 text-xl font-semibold text-blue-950">{myFlowStatusNextActionCount}</p>
                      </button>
                      <button
                        type="button"
                        data-testid="my-flow-status-overdue"
                        className="rounded-md bg-amber-50 px-3 py-2 text-left transition hover:bg-white hover:ring-2 hover:ring-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-200"
                        onClick={() => setMyFlowStatusSheet('overdue')}
                      >
                        <p className="text-xs font-semibold text-amber-700">지난 할 일</p>
                        <p className="mt-1 text-xl font-semibold text-amber-950">{myFlowStatusOverdueRows.length}</p>
                      </button>
                    </div>
                  </section>
                  ) : null}
                  {!isMyFlowMobileViewport ? (
                  <section data-testid="my-flow-priority-section" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">실행 우선순위</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">지금 볼 Flow</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                        <span className="rounded-md bg-slate-100 px-2 py-1">오늘 남음 {todayOpenCount}</span>
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">지난 할 일 {overdueRows.length}</span>
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">7일 안 {upcomingRows.length}</span>
                      </div>
                    </div>
                    {myFlowPriorityCards.length > 0 ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {myFlowPriorityCards.map(({ row, label, className }) => (
                          <article
                            key={`${label}-${row.flow.progress.slug}-${row.id}-${row.date ?? 'row'}`}
                            data-testid="my-flow-priority-card"
                            className="rounded-md border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>
                              {row.date ? <span className="text-xs font-semibold text-slate-500">{formatMyFlowDisplayDate(row.date)}</span> : null}
                              {row.timing && row.flow.bundle.flow.structure_type !== 'routine' ? (
                                <span aria-label={getMyFlowTimingChipLabel(row.timing)} title={getMyFlowTimingChipLabel(row.timing)} className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{formatMyFlowTimingChip(row.timing)}</span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm font-semibold text-slate-600">{getMyFlowFlowChipLabel(row.flow)}</p>
                            <p className="mt-1 text-base font-semibold text-slate-950">{getMyFlowRowDisplayTitle(row)}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                className="rounded-md border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-300"
                                type="button"
                                aria-label={getMyFlowOpenActionAriaLabel(getMyFlowRowDisplayTitle(row), getMyFlowOpenActionLabel(row.flow.bundle))}
                                onClick={() => {
                                  toggleMyFlowRowDetail(row);
                                }}
                              >
                                {getMyFlowOpenActionLabel(row.flow.bundle)}
                              </button>
                            </div>
                            {myFlowActiveRow && myFlowDetailOpen && getMyFlowRowInstanceKey(myFlowActiveRow) === getMyFlowRowInstanceKey(row) ? (
                              <div className="mt-3" data-testid="my-flow-priority-inline-detail">
                                {renderMyFlowItemDetailEditor(myFlowActiveRow, 'inline', savedView)}
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">급하게 볼 Flow가 없습니다. 아래 전체 목록에서 진행률을 확인하세요.</p>
                    )}
                  </section>
                  ) : null}
                  {!isMyFlowMobileViewport ? (
                    <>
                  <section ref={myFlowOverviewSummaryRef} data-testid="my-flow-overview-summary" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-500">전체 Flow 목록</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-950">필요한 Flow만 열기</h3>
              </div>
                      <div className="flex flex-col gap-2 sm:min-w-72">
                        <input
                          className="min-h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                          type="search"
                          placeholder="Flow 검색"
                          value={flowListQuery}
                          data-testid="my-flow-search"
                          onChange={(event) => setFlowListQuery(event.target.value)}
                        />
                        <div className="flex flex-wrap gap-2">
                          {flowListFilterTabs.map(([id, label]) => (
                            <button
                              key={id}
                              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${flowListFilter === id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                              type="button"
                              aria-pressed={flowListFilter === id}
                              data-testid={`my-flow-list-filter-${id}`}
                              onClick={() => setFlowListFilter(id)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {shouldCollapseFlowInventory ? (
                      <button
                        type="button"
                        data-testid="my-flow-inventory-toggle"
                        className="mt-3 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-white"
                        aria-expanded={myFlowInventoryOpen}
                        onClick={() => setMyFlowInventoryOpen((open) => !open)}
                      >
                        {myFlowInventoryOpen ? '전체 Flow 접기' : `전체 Flow 보기 ${flowListVisibleFlows.length}개`}
                      </button>
                    ) : null}
                  </section>
                  {showFlowInventory && shouldSeparateFlowReadiness ? (
                    renderFlowReadinessInventory()
                  ) : showFlowInventory && shouldGroupFlowInventory ? (
                    <div className="grid gap-4">
                      {flowListGroups.map(([group, flows]) => (
                        <section key={group} data-testid="my-flow-demo-group">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold text-slate-500">
                                {flows.some((flow) => flow.savedMap) ? '저장한 콘텐츠' : isMyFlowScenarioDemo ? '데모 묶음' : '분류'}
                              </p>
                              <h4 className="text-base font-semibold text-slate-950">{group}</h4>
                            </div>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{flows.length}개</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {flows.map((flow) => renderSavedFlowOverviewCard(flow))}
                          </div>
                        </section>
                      ))}
                    </div>
                  ) : showFlowInventory && shouldGroupBySavedMap ? (
                    renderFlowInventoryGroups(flowListInventoryGroups)
                  ) : showFlowInventory ? (
                    flowListVisibleFlows.map((flow) => renderSavedFlowOverviewCard(flow))
                  ) : null}
                  {showFlowInventory && flowListVisibleFlows.length === 0 ? (
                    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                      <h3 className="text-lg font-semibold text-slate-950">조건에 맞는 Flow가 없습니다</h3>
                      <p className="mt-2">검색어 또는 상태 필터를 바꾸면 다시 볼 수 있습니다.</p>
                    </section>
                  ) : null}
                    </>
                  ) : null}
                </>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {visibleSavedFlows.map((flow) => renderSavedFlowOverviewCard(flow))}
                </div>
              )}
            </div>
          ) : null}

          {savedView === 'calendar' ? (
            <div>
              <section data-testid="my-flow-calendar-context" className="mb-3 hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:block">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-blue-700">캘린더 기준</p>
                    <h3 className="mt-1 truncate text-lg font-semibold text-slate-950">
                      {selectedSavedFlowSlug === 'all' ? '전체 일정' : getMyFlowExecutionFlowTitle(visibleSavedFlows[0]?.progress.title ?? '')}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{visibleSavedFlows.length}개 콘텐츠</span>
                    {showMyFlowCalendarScopeFilter ? <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{myFlowCalendarScopeLabel} 표시</span> : null}
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">{myFlowCalendarOpenCount}개 남음</span>
                  </div>
                </div>
              </section>
              <div className="grid gap-3 pb-0 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
              <section ref={myFlowCalendarCardRef} data-testid="my-flow-calendar-card" className="order-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:p-4 lg:order-1">
                <div className="hidden items-start justify-between gap-3 sm:flex">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">월간 일정</h3>
                    <p className="mt-1 hidden text-sm text-slate-600 sm:block">일정은 점으로, 루틴은 아이콘으로 표시합니다.</p>
                  </div>
                  <div className="hidden flex-wrap gap-2 sm:flex">
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{monthCalendarRows.filter((row) => row.flow.bundle.flow.structure_type !== 'routine').length}개 일정</span>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">루틴 아이콘 {monthCalendarRows.filter((row) => row.flow.bundle.flow.structure_type === 'routine').length}개</span>
                  </div>
                </div>
                {showMyFlowCalendarScopeFilter ? (
                  <div
                    data-testid="my-flow-calendar-scope-filter"
                    className="mt-2 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:mt-3 sm:w-fit"
                    aria-label="캘린더 표시 범위"
                  >
                    {myFlowCalendarScopeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        data-testid={`my-flow-calendar-scope-${option.id}`}
                        aria-pressed={myFlowCalendarScope === option.id}
                        className={`min-h-8 shrink-0 rounded-md px-2.5 text-xs font-bold ${myFlowCalendarScope === option.id ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-600'}`}
                        onClick={() => selectMyFlowCalendarScope(option.id)}
                      >
                        {option.label}
                        <span className="ml-1 text-[10px] font-semibold text-slate-500">{option.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {monthCalendarRows.some((row) => row.flow.bundle.flow.structure_type === 'routine') ? (
                  <div data-testid="my-flow-routine-legend" className="mt-3 hidden flex-wrap gap-2 rounded-lg bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600 sm:flex">
                    {[
                      ['workout', '운동'],
                      ['running', '러닝'],
                      ['study', '공부'],
                      ['meal', '식단'],
                    ].map(([kind, label]) => (
                      <span key={kind} className="inline-flex min-h-7 items-center gap-1.5 rounded-md bg-white px-2 text-slate-700 ring-1 ring-slate-200">
                        <span className="inline-flex h-5 w-5 items-center justify-center text-slate-700">
                          {renderMyFlowRoutineIcon(kind as MyFlowRoutineIconKind)}
                        </span>
                        {label}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-1 flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-1 sm:mt-4 sm:p-2">
                  <button
                    type="button"
                    aria-label="이전 달"
                    onClick={() => moveMyFlowCalendarMonth(addMyFlowMonths(myFlowVisibleMonth, -1))}
                    className="min-h-8 rounded-md bg-white px-2 text-xs font-bold text-slate-700 sm:min-h-9 sm:px-3 sm:text-sm"
                  >
                    이전
                  </button>
                  <div className="text-center">
                    <h4 className="text-base font-black text-slate-950">{formatMyFlowMonthHeading(myFlowVisibleMonth)}</h4>
                    <label className="sr-only" htmlFor="my-flow-month-picker">월 선택</label>
                    <input
                      id="my-flow-month-picker"
                      data-testid="my-flow-month-picker"
                      aria-label="월 선택"
                      className="mt-0.5 min-h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 sm:mt-1 sm:min-h-8"
                      type="month"
                      value={myFlowVisibleMonth.slice(0, 7)}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        const nextMonth = `${event.target.value}-01`;
                        moveMyFlowCalendarMonth(nextMonth);
                      }}
                    />
                    <div className="mt-1 hidden justify-center gap-1 sm:flex">
                      <button
                        type="button"
                        aria-label="오늘로 이동"
                        className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                        onClick={() => {
                          setMyFlowSelectedDate(myFlowTodayDate);
                          setMyFlowVisibleMonth(getMyFlowMonthStart(myFlowTodayDate));
                          setMyFlowActiveRowKey('');
                          setMyFlowRoutineOverflowDate('');
                          setMyFlowScheduleOverflowDate('');
                          setMyFlowExpandedMemoKey('');
                          setMyFlowEditingDetailKey('');
                          setMyFlowDetailOpen(false);
                        }}
                      >
                        오늘
                      </button>
                      <button
                        type="button"
                        aria-label="첫 일정으로 이동"
                        className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                        onClick={() => {
                          const firstDate = findFirstMyFlowDateInMonth(calendarScopedRows, calendarAnchor);
                          setMyFlowSelectedDate(firstDate);
                          setMyFlowVisibleMonth(getMyFlowMonthStart(firstDate));
                          setMyFlowActiveRowKey('');
                          setMyFlowRoutineOverflowDate('');
                          setMyFlowScheduleOverflowDate('');
                          setMyFlowExpandedMemoKey('');
                          setMyFlowEditingDetailKey('');
                          setMyFlowDetailOpen(false);
                        }}
                      >
                        첫 일정
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="다음 달"
                    onClick={() => moveMyFlowCalendarMonth(addMyFlowMonths(myFlowVisibleMonth, 1))}
                    className="min-h-8 rounded-md bg-white px-2 text-xs font-bold text-slate-700 sm:min-h-9 sm:px-3 sm:text-sm"
                  >
                    다음
                  </button>
                </div>
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-0.5 sm:rounded-2xl sm:p-2">
                  <FullCalendar
                    key={`${myFlowVisibleMonth}-${myFlowSelectedDate}-${myFlowCalendarScope}`}
                    plugins={[dayGridPlugin, interactionPlugin]}
                    locale={koLocale}
                    initialView="dayGridMonth"
                    initialDate={myFlowVisibleMonth}
                    headerToolbar={false}
                    height="auto"
                    editable
                    events={myFlowCalendarEvents}
                    dayCellClassNames={(info) =>
                      formatMyFlowLocalDate(info.date) === myFlowSelectedDate ? ['my-flow-calendar-selected-date'] : []
                    }
                    eventContent={renderMyFlowCalendarEvent}
                    eventClassNames={(info) =>
                      String(info.event.extendedProps.calendarKey ?? '') === myFlowActiveRowKey ? ['my-flow-calendar-active-event'] : []
                    }
                    dayCellContent={renderMyFlowCalendarDayCell}
                    dayCellDidMount={handleMyFlowCalendarDayCellMount}
                    dayMaxEvents={3}
                    dayMaxEventRows={3}
                    eventClick={handleMyFlowCalendarEventClick}
                    eventDidMount={handleMyFlowCalendarEventMount}
                    eventDrop={handleMyFlowCalendarEventDrop}
                    dateClick={handleMyFlowCalendarDateClick}
                  />
                </div>
              </section>
              <section
                ref={myFlowSelectedDayRef}
                data-testid="my-flow-calendar-selected-day"
                data-overflow-date={myFlowRoutineOverflowDate === myFlowSelectedDate ? myFlowRoutineOverflowDate : undefined}
                data-schedule-overflow-date={myFlowScheduleOverflowDate === myFlowSelectedDate ? myFlowScheduleOverflowDate : undefined}
                className="order-1 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:p-4 lg:order-2"
              >
                <h3 className="mt-1 text-lg font-semibold text-slate-950">{formatMyFlowDisplayDate(myFlowSelectedDate, { includeWeekday: true })}</h3>
                {!isMyFlowMobileViewport ? (
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {showMyFlowCalendarScopeFilter ? `${myFlowCalendarScopeLabel} · ` : ''}{myFlowSelectedDateRows.length}개 일정 · {myFlowSelectedDateRoutineRows.length}개 루틴 · {myFlowSelectedDateOpenCount}개 남음
                  </p>
                ) : null}
                {myFlowRoutineOverflowDate === myFlowSelectedDate && myFlowSelectedDateRoutineOverflowCount > 0 ? (
                  <p data-testid="my-flow-selected-day-overflow-note" className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    +{myFlowSelectedDateRoutineOverflowCount} 루틴 포함
                  </p>
                ) : null}
                {myFlowScheduleOverflowDate === myFlowSelectedDate && myFlowSelectedDateScheduleOverflowCount > 0 ? (
                  <p data-testid="my-flow-selected-day-schedule-overflow-note" className="mt-2 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    +{myFlowSelectedDateScheduleOverflowCount} 일정 포함
                  </p>
                ) : null}
                {myFlowSelectedDateAllRows.length > 0 ? (
                  <div data-testid="my-flow-selected-date-groups" className="mt-4 grid gap-3">
                    {myFlowSelectedDateGroups.map((group) => {
                      const groupOpenCount = group.rows.filter((row) => !isMyFlowRowChecked(row.flow, row)).length;
                      const groupHasMultipleFlows = new Set(group.rows.map((row) => row.flow.progress.slug)).size > 1;
                      const sharedMeta = getMyFlowAgendaSharedMeta(group.rows, group.kind);
                      return (
                        <section
                          key={group.key}
                          data-testid="my-flow-selected-date-group"
                          className={`rounded-lg border p-2.5 ${group.savedMap ? 'border-blue-100 bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}
                        >
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className={`text-xs font-semibold ${group.savedMap ? 'text-blue-700' : 'text-slate-500'}`}>{group.label}</p>
                              <h4 className="mt-0.5 truncate text-sm font-semibold text-slate-950">{group.savedMap ? toUserFacingMapTitle(group.title) : toContentDisplayTitle(group.title)}</h4>
                            </div>
                            {group.rows.length > 1 || groupOpenCount !== group.rows.length ? (
                              <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                                {group.rows.length}개 · {groupOpenCount}개 남음
                              </span>
                            ) : null}
                          </div>
                          {sharedMeta.timing || sharedMeta.section ? (
                            <div data-testid="my-flow-selected-date-group-meta" className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                              {sharedMeta.timing ? (
                                <span
                                  data-testid="my-flow-group-timing-chip"
                                  aria-label={sharedMeta.timing.accessibilityLabel}
                                  title={sharedMeta.timing.accessibilityLabel}
                                  className="rounded bg-white px-1.5 py-0.5 text-slate-600 ring-1 ring-slate-200"
                                >
                                  {sharedMeta.timing.label}
                                </span>
                              ) : null}
                              {sharedMeta.section ? (
                                <span data-testid="my-flow-group-section-label">{sharedMeta.section}</span>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="grid gap-1.5">
                            {group.rows.map((row) => renderExecutionRow(row, {
                              kind: group.kind,
                              compact: true,
                              openDetail: true,
                              inlineDetail: true,
                              hideDateMeta: true,
                              hideTimingMeta: Boolean(sharedMeta.timing),
                              hideSectionMeta: Boolean(sharedMeta.section),
                              hideFlowMeta: !groupHasMultipleFlows,
                              showFlowProgress: groupHasMultipleFlows,
                              detailSurface: 'calendar',
                            }))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">이 날짜에 등록된 일정이 없습니다.</p>
                )}
              </section>
              </div>
            </div>
          ) : null}

          {savedView === 'checklist' ? (
            <div className="grid gap-4" data-testid="my-flow-checklist-view">
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:w-fit">
                {checklistFilterTabs.map(([id, label]) => (
                  <button
                    key={id}
                    className={`min-h-10 rounded-md px-3 py-2 text-sm font-semibold ${checklistFilter === id ? 'bg-blue-700 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                    type="button"
                    aria-pressed={checklistFilter === id}
                    data-testid={`my-flow-checklist-filter-${id}`}
                    onClick={() => setChecklistFilter(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedSavedFlowSlug === 'all' && checklistFlowRows.length > 1 ? (
                <section data-testid="my-flow-checklist-picker" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-blue-700">체크 실행</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-950">체크할 콘텐츠를 먼저 선택하세요</h3>
                      <p className="mt-1 text-sm text-slate-600">전체 체크리스트를 한 번에 펼치지 않고 Flow별 남은 항목부터 보여줍니다.</p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{checklistFlowRows.length}개 콘텐츠</span>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {visibleChecklistPickerRows.map(({ flow, rows }) => {
                      const openCount = rows.filter((row) => !isMyFlowRowChecked(flow, row)).length;
                      return (
                        <article key={flow.progress.slug} data-testid="my-flow-checklist-summary-card" className="rounded-md border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-slate-950">{getMyFlowExecutionFlowTitle(flow.progress.title)}</h4>
                              <p className="mt-1 text-xs font-semibold text-blue-700">{flow.meta}</p>
                            </div>
                            <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600">{openCount}개 남음</span>
                          </div>
                          <button
                            type="button"
                            className="mt-3 w-full rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                            onClick={() => setSelectedSavedFlowSlug(flow.progress.slug)}
                          >
                            체크 항목 열기
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  {shouldLimitChecklistPicker ? (
                    <button
                      type="button"
                      data-testid="my-flow-checklist-picker-toggle"
                      className="mt-3 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800"
                      aria-expanded={myFlowChecklistPickerOpen}
                      onClick={() => setMyFlowChecklistPickerOpen((open) => !open)}
                    >
                      {myFlowChecklistPickerOpen ? '체크 흐름 접기' : `체크 흐름 더 보기 ${hiddenChecklistPickerCount}개`}
                    </button>
                  ) : null}
                </section>
              ) : null}
              {selectedSavedFlowSlug === 'all' && checklistFlowRows.length > 1 ? null : checklistFlowRows.map(({ flow, rows }) => (
                <section key={flow.progress.slug} data-testid="my-flow-checklist-detail-section" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{getMyFlowExecutionFlowTitle(flow.progress.title)}</h3>
                      <p className="mt-1 text-sm font-semibold text-blue-700">{flow.meta}</p>
                    </div>
                    <button className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800" type="button" onClick={() => completeSavedFlow(flow)}>
                      전체 완료
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {rows.map((row) =>
                      renderExecutionRow({ ...row, flow }, { compact: true, openDetail: true, inlineDetail: true, minimalMeta: true, hideFlowMeta: true, detailSurface: 'checklist' }),
                    )}
                  </div>
                </section>
              ))}
              {checklistFlowRows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                  <h3 className="text-lg font-semibold text-slate-950">표시할 체크 항목이 없습니다</h3>
                  <p className="mt-2">다른 Flow나 상태 필터를 선택하면 저장된 체크 항목을 다시 볼 수 있습니다.</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {savedView === 'routine' ? (
            routineFlows.length > 0 ? (
              <div className="grid gap-3">
                {routineNextRows.length > 0 ? (
                  <section data-testid="my-flow-routine-next-section" className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm md:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">루틴 실행</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">다음 루틴</h3>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-blue-700">{routineNextRows.length}개</span>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {routineNextRows.map((row) => (
                        <div key={getMyFlowRowInstanceKey(row)} data-testid="my-flow-routine-next-card">
                          {renderExecutionRow(row, { kind: 'routine', compact: true, openDetail: true, inlineDetail: true, showRoutineDate: true, showFlowProgress: true, detailSurface: 'routine' })}
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
                <button
                  type="button"
                  data-testid="my-flow-routine-board-toggle"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 shadow-sm md:hidden"
                  aria-expanded={myFlowRoutineBoardsOpen}
                  onClick={() => setMyFlowRoutineBoardsOpen((open) => !open)}
                >
                  {myFlowRoutineBoardsOpen ? '주간 루틴 접기' : `주간 루틴 보기 ${routineFlows.length}개`}
                </button>
                <div className={`${myFlowRoutineBoardsOpen ? 'grid' : 'hidden'} gap-3 md:grid md:grid-cols-2`}>
                  {routineFlows.map((flow) => (
                  <article
                    key={flow.progress.slug}
                    data-testid={myFlowRoutineBoardsOpen ? 'my-flow-routine-board' : undefined}
                    className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">주간 루틴</h3>
                        <p className="mt-1 text-sm font-semibold text-blue-700">{getMyFlowExecutionFlowTitle(flow.progress.title)}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-600">{flow.meta}</p>
                      </div>
                      <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{flow.percent}%</span>
                    </div>
                    <div className="mt-4 grid grid-cols-7 gap-1">
                      {['일', '월', '화', '수', '목', '금', '토'].map((day) => {
                        const active = getMyFlowRoutineDays(flow.bundle).includes(day);
                        return (
                          <span key={day} className={`rounded-md border px-1.5 py-2 text-center text-xs font-semibold ${active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                            {day}요일
                          </span>
                        );
                      })}
                    </div>
                    <div className="mt-4 divide-y divide-slate-100">
                      {flow.rows.slice(0, 5).map((row) => {
                        const checked = isMyFlowRowChecked(flow, row);
                        return (
                          <label key={row.id} className="flex gap-3 py-3 text-sm">
                            <input className="mt-1 h-4 w-4 shrink-0" type="checkbox" aria-label={`내 Flow 체크: ${row.title}`} checked={checked} onChange={() => toggleSavedFlowItem(flow, row.id)} />
                            <span className="min-w-0 flex-1">
                              <span className={`block font-semibold ${checked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>{row.title}</span>
                              <span className="mt-1 block text-xs text-slate-500">{[row.timing ? formatMyFlowTimingChip(row.timing) : '', row.section].filter(Boolean).join(' · ')}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <Link className="mt-4 inline-flex w-full justify-center rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white" href={`/f/${flow.progress.slug}`}>
                      루틴 이어서 체크하기
                    </Link>
                  </article>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
                <h3 className="text-lg font-semibold text-slate-950">저장된 루틴이 없습니다</h3>
                <p className="mt-2">반복 흐름을 저장하면 요일별 루틴과 완료 여부가 여기에 모입니다.</p>
              </div>
            )
          ) : null}
            </div>
          </div>
          ) : null}
        </section>
      ) : null}

      {myFlowStatusSheet ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40"
          role="dialog"
          aria-modal="true"
          aria-label={myFlowStatusSheet === 'overdue' ? '지난 할 일' : '다음 할 일'}
          data-testid="my-flow-status-sheet"
        >
          <button
            className="absolute inset-0 h-full w-full cursor-default"
            type="button"
            aria-label="목록 닫기"
            onClick={() => setMyFlowStatusSheet(null)}
          />
          <section className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl md:left-1/2 md:max-w-lg md:-translate-x-1/2">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  {myFlowStatusSheet === 'overdue' ? '놓친 항목 정리' : '다가오는 항목 정리'}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  {myFlowStatusSheet === 'overdue' ? '지난 할 일' : '다음 할 일'}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setMyFlowStatusSheet(null)}
              >
                닫기
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              {myFlowStatusSheet === 'overdue' ? myFlowStatusOverdueGroups.map((group) => (
                <section
                  key={`overdue-group-${group.key}`}
                  data-testid="my-flow-status-sheet-group"
                  className="rounded-xl border border-amber-100 bg-amber-50/70 p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2 px-1 text-xs font-semibold text-amber-800">
                    <span>{group.dateLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{group.title}</span>
                    {group.timingLabel ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span
                          className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-amber-800"
                          data-testid="my-flow-status-sheet-group-timing-chip"
                          aria-label={group.timingAriaLabel}
                        >
                          {group.timingLabel}
                        </span>
                      </>
                    ) : null}
                    <span aria-hidden="true">·</span>
                    <span>{group.rows.length}개</span>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {group.rows.map((row) => (
                      <article
                        key={`overdue-${row.flow.progress.slug}-${row.id}-${row.date ?? 'row'}`}
                        data-testid="my-flow-status-sheet-row"
                        data-flow-slug={row.flow.progress.slug}
                        data-row-key={getMyFlowRowInstanceKey(row)}
                        className="rounded-lg border border-amber-100 bg-white p-3"
                      >
                        <p className="text-base font-semibold text-slate-950">{getMyFlowRowDisplayTitle(row)}</p>
                        <button
                          type="button"
                          className="mt-3 min-h-9 rounded-md border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300"
                          aria-label={getMyFlowStatusSheetOpenAriaLabel(row, group)}
                          onClick={() => {
                            setMyFlowStatusSheet(null);
                            openMyFlowRowFromFlowTab(row.flow, row);
                          }}
                        >
                          {getMyFlowOpenActionLabel(row.flow.bundle)}
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )) : myFlowStatusNextRows.map((row) => (
                <article
                  key={`${myFlowStatusSheet}-${row.flow.progress.slug}-${row.id}-${row.date ?? 'row'}`}
                  data-testid="my-flow-status-sheet-row"
                  data-flow-slug={row.flow.progress.slug}
                  data-row-key={getMyFlowRowInstanceKey(row)}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                    {row.date ? <span>{formatMyFlowDisplayDate(row.date)}</span> : null}
                    {row.timing && row.flow.bundle.flow.structure_type !== 'routine' ? (
                      <span className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-600">{formatMyFlowTimingChip(row.timing)}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-600">{getMyFlowFlowChipLabel(row.flow)}</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">{getMyFlowRowDisplayTitle(row)}</p>
                  <button
                    type="button"
                    className="mt-3 min-h-9 rounded-md border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300"
                    aria-label={getMyFlowStatusSheetOpenAriaLabel(row)}
                    onClick={() => {
                      setMyFlowStatusSheet(null);
                      openMyFlowRowFromFlowTab(row.flow, row);
                    }}
                  >
                    {getMyFlowOpenActionLabel(row.flow.bundle)}
                  </button>
                </article>
              ))}
              {(myFlowStatusSheet === 'overdue' ? myFlowStatusOverdueRows : myFlowStatusNextRows).length === 0 ? (
                <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">지금 확인할 Flow가 없습니다.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {myFlowInventorySheetOpen ? (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="전체 Flow 목록"
          data-testid="my-flow-inventory-sheet"
        >
          <button
            className="absolute inset-0 h-full w-full cursor-default"
            type="button"
            aria-label="목록 닫기"
            onClick={() => setMyFlowInventorySheetOpen(false)}
          />
          <section className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">전체 Flow 목록</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-950">필요한 Flow만 열기</h3>
              </div>
              <button
                type="button"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setMyFlowInventorySheetOpen(false)}
              >
                닫기
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <input
                className="min-h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                type="search"
                placeholder="Flow 검색"
                value={flowListQuery}
                data-testid="my-flow-search"
                onChange={(event) => {
                  setFlowListQuery(event.target.value);
                  setMyFlowLargeInventoryOpen(false);
                }}
              />
              <div className="flex flex-wrap gap-2">
                {flowListFilterTabs.map(([id, label]) => (
                  <button
                    key={id}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${flowListFilter === id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    type="button"
                    aria-pressed={flowListFilter === id}
                    data-testid={`my-flow-list-filter-${id}`}
                    onClick={() => {
                      setFlowListFilter(id);
                      setMyFlowLargeInventoryOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid gap-2">
                {mobileInventoryVisibleFlows.map((flow) => renderFlowListRow(flow))}
              </div>
              {hiddenMobileInventoryCount > 0 ? (
                <button
                  type="button"
                  data-testid="my-flow-mobile-large-inventory-toggle"
                  className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-800"
                  aria-expanded={myFlowLargeInventoryOpen}
                  onClick={() => setMyFlowLargeInventoryOpen(true)}
                >
                  전체 Flow 보기 {flowListVisibleFlows.length}개
                </button>
              ) : null}
              {flowListVisibleFlows.length === 0 ? (
                <p className="rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">조건에 맞는 Flow가 없습니다.</p>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

    </main>
  );
}

export function CreatorProfile({ slug }: { slug: string }) {
  const { bundles } = useBundles();
  const normalized = normalizeCreatorSlug(slug);
  const user = findVirtualUserBySlug(normalized);
  const previewSummary = getCreatorChannelSummaries(bundles).find((item) => item.slug === normalized);
  const creatorBundles = bundles.filter((bundle) => {
    const creator = getCreatorUser(bundle);
    if (user) return creator?.id === user.id;
    return normalizeCreatorSlug(creator?.slug ?? creatorSlug(getCreatorName(bundle))) === normalized;
  }).sort((a, b) => getCreatorBundlePriority(a) - getCreatorBundlePriority(b));
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'real' | 'preview'>('all');
  const [libraryQuery, setLibraryQuery] = useState('');
  const first = creatorBundles[0];
  const profile = user ?? (first ? getCreatorUser(first) : undefined);
  const totalUsage = creatorBundles.reduce((sum, bundle) => sum + (bundle.flow.usage_count ?? 0), 0);
  const totalCopies = creatorBundles.reduce((sum, bundle) => sum + (bundle.flow.copy_count ?? 0), 0);
  const categories = Array.from(new Set(creatorBundles.map((bundle) => bundle.flow.category))).slice(0, 6);
  const allCategories = ['전체', ...Array.from(new Set(creatorBundles.map((bundle) => bundle.flow.category)))];
  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();
  const visibleCreatorBundles = creatorBundles
    .filter((bundle) => (categoryFilter === '전체' ? true : bundle.flow.category === categoryFilter))
    .filter((bundle) => {
      if (sourceFilter === 'real') return bundle.flow.source_status === 'real';
      if (sourceFilter === 'preview') return bundle.flow.source_status === 'preview';
      return true;
    })
    .filter((bundle) => {
      if (!normalizedLibraryQuery) return true;
      const searchable = [
        bundle.flow.title,
        bundle.flow.description,
        bundle.flow.category,
        bundle.flow.source_title,
        ...(bundle.flow.tags ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(normalizedLibraryQuery);
    });
  const exactRealBundles = creatorBundles.filter(
    (bundle) => bundle.flow.source_status === 'real' && bundle.flow.source_precision === 'exact',
  );
  const recommendedBundles = exactRealBundles.slice(0, 3);

  if (!first && !profile) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-8">
        <PlatformNav />
        <section className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center">
          <h1 className="text-2xl font-semibold">제작자를 찾을 수 없습니다</h1>
          <p className="mt-2 text-gray-600">공개 Flow 탐색에서 다른 제작자를 확인해 보세요.</p>
          <Link className="mt-5 inline-flex rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" href="/flows">
            공개 Flow 탐색
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 pb-28 md:pb-8">
      <PlatformNav />
      <header className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-xl font-semibold text-blue-700">
            {profile?.avatar_initial ?? (first ? getCreatorAvatar(first) : '?')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-700">{profile?.is_current_user ? 'My Creator Profile' : 'Creator'}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{profile?.name ?? (first ? getCreatorName(first) : '제작자')}</h1>
            <p className="mt-2 text-gray-600">{profile?.role ?? (first ? getCreatorRole(first) : '')}</p>
            <p className="mt-3 max-w-3xl leading-7 text-gray-600">{profile?.bio ?? (first ? getCreatorNote(first) : '')}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">공개 Flow</p>
            <p className="mt-1 text-2xl font-semibold">{creatorBundles.length}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">총 실행</p>
            <p className="mt-1 text-2xl font-semibold">{formatCount(totalUsage)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">총 복사</p>
            <p className="mt-1 text-2xl font-semibold">{formatCount(totalCopies)}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(profile?.specialty_tags ?? categories).map((category) => (
            <span key={category} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{category}</span>
          ))}
        </div>
        {previewSummary ? (
          <section className="mt-5 grid gap-3 sm:grid-cols-7">
            <StatCard label="Flow 후보" value={`${previewSummary.flow_count}`} compact />
            <StatCard label="실제 원본" value={`${previewSummary.real_flow_count}`} compact />
            <StatCard label="샘플 후보" value={`${previewSummary.sample_candidate_count}`} compact />
            <StatCard label="실행 항목" value={`${previewSummary.executable_item_count}`} compact />
            <StatCard label="원본 검토" value={`${previewSummary.source_review_count}`} compact />
            <StatCard label="수동 검토" value={`${previewSummary.manual_source_fit_count}`} compact />
            <StatCard label="1차 분류" value={`${previewSummary.derived_source_review_count}`} compact />
          </section>
        ) : null}
      </header>

      {recommendedBundles.length ? (
        <section className="mt-8 border-y border-gray-200 bg-gray-50 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Exact Source</p>
              <h2 className="mt-1 text-2xl font-semibold">실제 콘텐츠로 바로 시작</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                운동/다이어트 앱처럼 출처가 분명한 콘텐츠를 먼저 고르고, 오늘 실행한 기록과 다음 반복 날짜까지 남기게 구성했습니다.
              </p>
            </div>
            <button
              className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700"
              type="button"
              onClick={() => setSourceFilter('real')}
            >
              실제 Flow만 보기
            </button>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {recommendedBundles.map((bundle) => (
              <FlowCard key={`recommended-${bundle.flow.id}`} bundle={bundle} variant="compact" />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-500">Published Flows</p>
            <h2 className="text-2xl font-semibold">채널 Flow 라이브러리</h2>
            <p className="mt-1 text-sm text-gray-600">
              {visibleCreatorBundles.length}개 표시 / 전체 {creatorBundles.length}개
            </p>
          </div>
          <Link className="text-sm font-semibold text-blue-700" href="/flows/new">내 콘텐츠로 만들기</Link>
        </div>
        <label className="mb-3 block">
          <span className="text-sm font-semibold text-gray-700">Flow 검색</span>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="제목, 카테고리, 태그, 출처로 검색"
            value={libraryQuery}
            onChange={(event) => setLibraryQuery(event.target.value)}
          />
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['real', '실제 원본'],
            ['preview', '샘플 후보'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                sourceFilter === key
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              type="button"
              onClick={() => setSourceFilter(key as 'all' | 'real' | 'preview')}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {allCategories.map((category) => (
            <button
              key={category}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                categoryFilter === category
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              type="button"
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleCreatorBundles.map((bundle) => (
            <FlowCard key={bundle.flow.id} bundle={bundle} />
          ))}
        </div>
      </section>
    </main>
  );
}

export function NewFlow() {
  const { bundles, persist } = useBundles();
  const [presetKey, setPresetKey] = useState('custom');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('공부/시험');
  const [structure, setStructure] = useState<StructureType>('timeline');
  const [contentType, setContentType] = useState<ContentType>('default');
  const [anchor, setAnchor] = useState<AnchorType>('end_date');
  const [sourceText, setSourceText] = useState('');

  const applyPreset = (key: string) => {
    setPresetKey(key);
    if (key === 'custom') return;

    const next = categoryPresets.find((item) => item.label === key);
    if (!next) return;
    setCategory(next.category);
    setStructure(next.structure_type);
    setContentType(next.content_type);
    setAnchor(next.anchor_type);
  };

  const submit = () => {
    const id = `flow-${crypto.randomUUID()}`;
    const safeTitle = title.trim() || '새 실행 Flow';
    const slug = `${slugify(safeTitle)}-${Date.now()}`;
    const bundle =
      contentType === 'meal_plan'
        ? createEmptyMealBundle({
            id,
            slug,
            title: safeTitle,
            description,
            category,
            anchor_type: anchor,
          })
        : createTextBundle({
            id,
            slug,
            title: safeTitle,
            description,
            category,
            structure_type: structure,
            anchor_type: anchor,
            initialText: sourceText,
          });

    persist([...bundles, bundle]);
    window.location.href = `/flows/${id}/edit`;
  };

  const patternCards = [
    {
      id: 'goal',
      title: '목표일 기준으로 준비하기',
      description: '시험, 결혼, 이사처럼 끝나는 날짜가 있고 거꾸로 준비해야 하는 콘텐츠',
      category: '공부/시험',
      structure_type: 'timeline' as const,
      content_type: 'default' as const,
      anchor_type: 'end_date' as const,
      example: '- 기출 1회 풀기 D-14',
    },
    {
      id: 'routine',
      title: '매일·매주 반복하기',
      description: '공부, 운동, 자동차 관리처럼 반복해서 쌓는 루틴 콘텐츠',
      category: '운동/루틴',
      structure_type: 'routine' as const,
      content_type: 'default' as const,
      anchor_type: 'start_date' as const,
      example: '@주 3회',
    },
    {
      id: 'checklist',
      title: '순서대로 체크하기',
      description: '자동차 구매, 서류 준비, 점검처럼 완료 여부가 중요한 콘텐츠',
      category: '생활/체크',
      structure_type: 'checklist' as const,
      content_type: 'default' as const,
      anchor_type: 'none' as const,
      example: '- 계약 전 확인하기',
    },
    {
      id: 'meal',
      title: '식단·레시피로 구성하기',
      description: '이유식, 식단, 요리 루틴처럼 기간표와 레시피가 함께 필요한 콘텐츠',
      category: '식단/레시피',
      structure_type: 'phase' as const,
      content_type: 'meal_plan' as const,
      anchor_type: 'start_date' as const,
      example: 'D+0~D+2 메뉴',
    },
  ];

  const selectPattern = (pattern: (typeof patternCards)[number]) => {
    setPresetKey(pattern.id);
    setCategory(pattern.category);
    setStructure(pattern.structure_type);
    setContentType(pattern.content_type);
    setAnchor(pattern.anchor_type);
  };

  return (
    <main className="mx-auto max-w-6xl px-5 py-8">
      <PlatformNav />
      <div className="mb-8">
        <p className="text-sm font-semibold text-blue-700">Create</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Flow 만들기</h1>
        <p className="mt-2 text-gray-600">블로그 글, 영상 요약, 개인 노하우를 붙여넣고 실행 순서로 정리합니다.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href="/my">
            제작자 스튜디오
          </Link>
          <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href={`/u/${getCurrentUser().slug}`}>
            내 제작자 프로필
          </Link>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5 rounded-lg border border-gray-200 bg-white p-5">
          <div>
            <p className="text-sm font-medium text-gray-500">1. 콘텐츠 넣기</p>
            <h2 className="mt-1 text-xl font-semibold">무엇을 Flow로 만들까요?</h2>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">제목</span>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="예: 시험 D-30 공부 계획" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">한 줄 설명</span>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="예: 시험일을 넣으면 남은 30일 공부 순서가 정리됩니다." />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">원본 콘텐츠</span>
            <textarea className="min-h-[260px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm leading-6" value={sourceText} onChange={(event) => setSourceText(event.target.value)} placeholder={'블로그 글, 영상 요약, 메모를 붙여넣으세요.\n\n## 준비\n- 해야 할 일 D-30\n- 당일 확인 D-Day'} />
          </label>

          <div>
            <p className="text-sm font-medium text-gray-500">2. 실행 방식 고르기</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {patternCards.map((pattern) => (
                <button
                  key={pattern.id}
                  className={`rounded-lg border p-4 text-left ${presetKey === pattern.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  onClick={() => selectPattern(pattern)}
                >
                  <p className="font-semibold text-gray-950">{pattern.title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{pattern.description}</p>
                  <p className="mt-3 rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600">{pattern.example}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <div>
            <p className="text-sm font-medium text-gray-500">3. 시작 전 확인</p>
            <h2 className="mt-1 text-lg font-semibold">초안 설정</h2>
          </div>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">카테고리</span>
            <input className="w-full rounded-md border border-gray-300 px-3 py-2" value={category} onChange={(event) => { setPresetKey('custom'); setCategory(event.target.value); }} />
          </label>
          <details className="rounded-md border border-gray-200 bg-[#FAFAF8] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-gray-800">고급 설정</summary>
            <div className="mt-3 space-y-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium">표현 방식</span>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={structure} onChange={(event) => setStructure(event.target.value as StructureType)}>
                  <option value="timeline">날짜 역산 일정표</option>
                  <option value="phase">기간별 식단/단계표</option>
                  <option value="routine">반복 루틴</option>
                  <option value="checklist">단계형 체크리스트</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-medium">기준 날짜</span>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2" value={anchor} onChange={(event) => setAnchor(event.target.value as AnchorType)}>
                  <option value="start_date">시작일 기준</option>
                  <option value="end_date">목표일 기준</option>
                  <option value="baby_age_month">아이 월령 기준</option>
                  <option value="baby_birth_date">아이 생년월일 기준</option>
                  <option value="none">날짜 없이 체크</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={contentType === 'meal_plan'} onChange={(event) => setContentType(event.target.checked ? 'meal_plan' : 'default')} />
                식단표와 레시피가 필요한 Flow
              </label>
            </div>
          </details>
          <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900">
            <p className="font-semibold">다음 단계에서 다듬습니다</p>
            <p className="mt-1">항목 제목, 날짜, 반복 규칙, 링크, 완료 기준은 편집 화면에서 바로 수정할 수 있습니다.</p>
          </div>
          <button className="w-full rounded-md bg-[#2563EB] px-4 py-3 text-sm font-semibold text-white" onClick={submit}>
            Flow 초안 만들기
          </button>
        </aside>
      </div>
    </main>
  );
}

export function Editor({ id }: { id: string }) {
  const { bundles, persist } = useBundles();
  const bundle = bundles.find((item) => item.flow.id === id);

  if (!bundle) return <main className="p-8">Flow를 찾을 수 없습니다.</main>;

  const save = (next: FlowBundle) => {
    persist(bundles.map((item) => (item.flow.id === id ? next : item)));
  };

  return bundle.flow.content_type === 'meal_plan' ? (
    <MealPlanEditor bundle={bundle} onSave={save} />
  ) : (
    <TextFlowEditor bundle={bundle} onSave={save} />
  );
}

function TextFlowEditor({ bundle, onSave }: { bundle: FlowBundle; onSave: (bundle: FlowBundle) => void }) {
  const [text, setText] = useState(bundle.flow.raw_text ?? '');
  const [draftItems, setDraftItems] = useState<FlowItem[]>(bundle.items);
  const [draftDetails, setDraftDetails] = useState<FlowItemDetail[]>(bundle.itemDetails ?? []);
  const [saveMessage, setSaveMessage] = useState('');
  const [lastPublished, setLastPublished] = useState(false);
  const parsed = useMemo(() => parseTextFlow(text, bundle.flow.id), [bundle.flow.id, text]);

  useEffect(() => {
    setDraftItems(parsed.items);
    setDraftDetails((details) => {
      const parsedDetails = parsed.itemDetails ?? [];
      const merged = parsed.items.map((item) => {
        const fromText = parsedDetails.find((detail) => detail.item_id === item.id);
        const fromState = details.find((detail) => detail.item_id === item.id);
        return fromText ?? fromState ?? { item_id: item.id };
      });
      return merged.filter(
        (detail) =>
          detail.why ||
          detail.how ||
          detail.completion_criteria ||
          detail.caution ||
          (detail.links?.length ?? 0) > 0,
      );
    });
  }, [parsed.items, parsed.itemDetails]);

  const updateItem = (id: string, patch: Partial<FlowItem>) => {
    setDraftItems((items) => {
      const nextItems = items.map((item) => (item.id === id ? { ...item, ...patch } : item));
      setText(serializeTextFlow(parsed.sections, nextItems, draftDetails, parsed.warnings));
      return nextItems;
    });
  };

  const updateDetail = (id: string, patch: Partial<FlowItemDetail>) => {
    setDraftDetails((details) => {
      const existing = details.find((detail) => detail.item_id === id) ?? { item_id: id };
      const nextDetail = { ...existing, ...patch };
      const nextDetails = [
        ...details.filter((detail) => detail.item_id !== id),
        nextDetail,
      ].filter(
        (detail) =>
          detail.why ||
          detail.how ||
          detail.completion_criteria ||
          detail.caution ||
          (detail.links?.length ?? 0) > 0,
      );
      setText(serializeTextFlow(parsed.sections, draftItems, nextDetails, parsed.warnings));
      return nextDetails;
    });
  };

  const saveDraft = (status = bundle.flow.status) => {
    onSave({
      ...bundle,
      sections: parsed.sections,
      items: draftItems,
      itemDetails: draftDetails,
      repeatRules: parsed.repeatRules,
      warnings: parsed.warnings,
      flow: {
        ...bundle.flow,
        status,
        raw_text: text,
        updated_at: new Date().toISOString(),
      },
    });
    setSaveMessage(status === 'published' ? '발행됨' : '초안 저장됨');
    setLastPublished(status === 'published');
    window.setTimeout(() => setSaveMessage(''), 1600);
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <EditorHeader bundle={bundle} onSave={() => saveDraft()} onPublish={() => saveDraft('published')} />
      {lastPublished ? <PublishSuccessPanel bundle={bundle} /> : null}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">1. 콘텐츠 원문</p>
              <h2 className="text-lg font-semibold">붙여넣은 내용을 정리합니다</h2>
            </div>
            <Badge className="border-gray-200 bg-gray-50 text-gray-700">Markdown</Badge>
          </div>
          <details className="mb-3 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm">
            <summary className="cursor-pointer font-semibold text-blue-900">고급 문법 보기</summary>
            <div className="mt-3 grid gap-3 text-blue-950 md:grid-cols-3">
              <div>
                <p className="font-semibold">초급</p>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-2 text-xs">{'## 섹션\n- 할 일 D-3\n- 할 일 D-Day'}</pre>
              </div>
              <div>
                <p className="font-semibold">중급</p>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-2 text-xs">{'- 할 일 D-3\n  done: 완료 기준\n  link: 이름 | URL | official'}</pre>
              </div>
              <div>
                <p className="font-semibold">고급</p>
                <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-2 text-xs">{'- 할 일 D-3\n  why: 왜 필요한가\n  how: 실행 방법\n  caution: 주의사항'}</pre>
              </div>
            </div>
          </details>
          <textarea className="h-[520px] w-full rounded-md border border-gray-300 p-3 font-mono text-sm leading-6" value={text} onChange={(event) => { setText(event.target.value); setSaveMessage(''); }} />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-500">2. 실행 항목</p>
              <h2 className="text-lg font-semibold">저장 전에 항목 확인</h2>
              <p className="mt-1 text-sm text-gray-500">{draftItems.length}개 항목 · 여기서 수정하면 원문에도 반영됩니다.</p>
            </div>
            {saveMessage ? <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">{saveMessage}</span> : null}
          </div>
          <div className="max-h-[520px] space-y-4 overflow-auto pr-1">
            {parsed.sections.map((section) => (
              <div key={section.id} className="rounded-md border border-gray-200 bg-[#FAFAF8] p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{section.title}</h3>
                  <span className="text-xs text-gray-500">
                    {draftItems.filter((item) => item.section_id === section.id).length}개 항목
                  </span>
                </div>
                <div className="space-y-3">
                  {draftItems.filter((item) => item.section_id === section.id).map((item) => (
                    <div key={item.id} className="rounded-md border border-gray-200 bg-white p-3">
                      {(() => {
                        const detail = draftDetails.find((entry) => entry.item_id === item.id);
                        const primaryLink = detail?.links?.[0];
                        return (
                          <>
                      <label className="block space-y-1">
                        <span className="text-xs font-semibold text-gray-500">실행 내용</span>
                        <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} />
                      </label>
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-gray-500">기준일로부터</span>
                          <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" type="number" value={item.day_offset ?? ''} placeholder="-30" onChange={(event) => updateItem(item.id, { day_offset: event.target.value === '' ? undefined : Number(event.target.value) })} />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-gray-500">기간</span>
                          <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" type="number" value={item.duration_days ?? ''} placeholder="1" onChange={(event) => updateItem(item.id, { duration_days: event.target.value === '' ? undefined : Number(event.target.value) })} />
                        </label>
                        <label className="block space-y-1">
                          <span className="text-xs font-semibold text-gray-500">반복 규칙</span>
                          <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={item.repeat_rule ?? ''} placeholder="주 3회" onChange={(event) => updateItem(item.id, { repeat_rule: event.target.value || undefined })} />
                        </label>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        표시 시점: {timingLabel(item.day_offset, item.duration_days) || '기준 없음'}
                      </p>
                      <details className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3">
                        <summary className="cursor-pointer text-sm font-semibold text-gray-700">실행 디테일</summary>
                        <div className="mt-3 grid gap-3">
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold text-gray-500">왜 필요한가</span>
                            <textarea className="min-h-16 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={detail?.why ?? ''} onChange={(event) => updateDetail(item.id, { why: event.target.value })} />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold text-gray-500">어떻게 실행하나</span>
                            <textarea className="min-h-16 w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={detail?.how ?? ''} onChange={(event) => updateDetail(item.id, { how: event.target.value })} />
                          </label>
                          <label className="block space-y-1">
                            <span className="text-xs font-semibold text-gray-500">완료 기준</span>
                            <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={detail?.completion_criteria ?? ''} onChange={(event) => updateDetail(item.id, { completion_criteria: event.target.value })} />
                          </label>
                          <div className="grid gap-2 md:grid-cols-[1fr_1.4fr_120px]">
                            <label className="block space-y-1">
                              <span className="text-xs font-semibold text-gray-500">링크 이름</span>
                              <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={primaryLink?.label ?? ''} placeholder="정부24" onChange={(event) => updateDetail(item.id, { links: [{ label: event.target.value, url: primaryLink?.url ?? '', type: primaryLink?.type ?? 'reference' }] })} />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-xs font-semibold text-gray-500">URL</span>
                              <input className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={primaryLink?.url ?? ''} placeholder="https://..." onChange={(event) => updateDetail(item.id, { links: [{ label: primaryLink?.label ?? '링크', url: event.target.value, type: primaryLink?.type ?? 'reference' }] })} />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-xs font-semibold text-gray-500">유형</span>
                              <select className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" value={primaryLink?.type ?? 'reference'} onChange={(event) => updateDetail(item.id, { links: [{ label: primaryLink?.label ?? '링크', url: primaryLink?.url ?? '', type: event.target.value as FlowItemLinkType }] })}>
                                <option value="official">공식</option>
                                <option value="reference">참고</option>
                                <option value="tool">도구</option>
                                <option value="creator">제작자</option>
                              </select>
                            </label>
                          </div>
                        </div>
                      </details>
                          </>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {parsed.warnings.length > 0 ? <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{parsed.warnings.join(' / ')}</div> : null}
        </section>
      </div>
      <TextEditorPreview sections={parsed.sections} items={parsed.items} />
    </main>
  );
}

function TextEditorPreview({
  sections,
  items,
}: {
  sections: FlowBundle['sections'];
  items: FlowItem[];
}) {
  return (
    <section data-testid="editor-preview" className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">미리보기</p>
          <h2 className="text-lg font-semibold">공개 페이지 미리보기</h2>
        </div>
        <Badge className="border-gray-200 bg-gray-50 text-gray-700">저장 전 미리보기</Badge>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="rounded-md border border-gray-100 p-3">
            <h3 className="font-semibold">{section.title}</h3>
            <div className="mt-2 space-y-2">
              {items.filter((item) => item.section_id === section.id).map((item) => (
                <div key={item.id} className="flex gap-2 text-sm">
                  <span className="mt-1 h-4 w-4 rounded border border-gray-300" />
                  <span className="font-mono text-blue-700">{timingLabel(item.day_offset, item.duration_days)}</span>
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MealPlanEditor({ bundle, onSave }: { bundle: FlowBundle; onSave: (bundle: FlowBundle) => void }) {
  const [draft, setDraft] = useState(bundle);
  const [editorTab, setEditorTab] = useState<'slots' | 'recipes' | 'safety' | 'preview'>('slots');
  const [lastPublished, setLastPublished] = useState(false);

  const updateSlot = (id: string, patch: Partial<MealSlot>) => {
    setDraft((value) => ({
      ...value,
      mealSlots: (value.mealSlots ?? []).map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)),
    }));
  };

  const updateRecipe = (id: string, patch: Partial<Recipe>) => {
    setDraft((value) => ({
      ...value,
      recipes: (value.recipes ?? []).map((recipe) => (recipe.id === id ? { ...recipe, ...patch } : recipe)),
    }));
  };

  const addRecipe = () => {
    const recipeId = `${bundle.flow.id}-recipe-${Date.now()}`;
    setDraft((value) => ({
      ...value,
      recipes: [
        ...(value.recipes ?? []),
        {
          id: recipeId,
          flow_id: value.flow.id,
          title: '새 레시피',
          ingredients: [{ name: '재료' }],
          steps: [{ order: 1, text: '조리 순서' }],
          source_type: 'creator_experience',
          risk_level: 'medical_sensitive',
        },
      ],
    }));
  };

  const addSlot = () => {
    const recipe = draft.recipes?.[0];
    setDraft((value) => ({
      ...value,
      mealSlots: [
        ...(value.mealSlots ?? []),
        {
          id: `${value.flow.id}-meal-${Date.now()}`,
          flow_id: value.flow.id,
          section_id: value.sections[0]?.id,
          recipe_id: recipe?.id ?? '',
          day_offset: 0,
          duration_days: 3,
          menu_title: '새 메뉴',
          new_ingredients: [],
          allergy_watch_days: 3,
          order: value.mealSlots?.length ?? 0,
        },
      ],
    }));
  };

  const saveDraft = (status = draft.flow.status) => {
    onSave({
      ...draft,
      flow: { ...draft.flow, status, updated_at: new Date().toISOString() },
    });
    setLastPublished(status === 'published');
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <EditorHeader bundle={draft} onSave={() => saveDraft()} onPublish={() => saveDraft('published')} />
      {lastPublished ? <PublishSuccessPanel bundle={draft} /> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {[
          ['slots', '식단표'],
          ['recipes', '레시피'],
          ['safety', '주의문'],
          ['preview', '미리보기'],
        ].map(([id, label]) => (
          <button
            key={id}
            className={`rounded-md border px-3 py-2 text-sm font-semibold ${editorTab === id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'}`}
            onClick={() => setEditorTab(id as typeof editorTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {editorTab === 'slots' ? (
        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">식단 슬롯</h2>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={addSlot}>
              슬롯 추가
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">시작일 기준 며칠 뒤부터 몇 일간 먹일지, 메뉴와 새 재료, 연결 레시피를 정합니다.</p>
          <div className="mt-4 overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-2">기간</th>
                  <th className="p-2">메뉴</th>
                  <th className="p-2">새 재료</th>
                  <th className="p-2">연결된 레시피</th>
                </tr>
              </thead>
              <tbody>
                {(draft.mealSlots ?? []).map((slot) => (
                  <tr key={slot.id} className="border-b">
                    <td className="p-2">
                      <div className="flex gap-2">
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-500">D+ 시작</span>
                          <input className="w-20 rounded border px-2 py-1" type="number" value={slot.day_offset} onChange={(event) => updateSlot(slot.id, { day_offset: Number(event.target.value) })} />
                        </label>
                        <label className="block">
                          <span className="mb-1 block text-xs text-gray-500">며칠간</span>
                          <input className="w-20 rounded border px-2 py-1" type="number" value={slot.duration_days} onChange={(event) => updateSlot(slot.id, { duration_days: Number(event.target.value) })} />
                        </label>
                      </div>
                    </td>
                    <td className="p-2">
                      <input className="w-full rounded border px-2 py-1" value={slot.menu_title} onChange={(event) => updateSlot(slot.id, { menu_title: event.target.value })} />
                    </td>
                    <td className="p-2">
                      <input className="w-full rounded border px-2 py-1" value={slot.new_ingredients.join(', ')} onChange={(event) => updateSlot(slot.id, { new_ingredients: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
                    </td>
                    <td className="p-2">
                      <select className="w-full rounded border px-2 py-1" value={slot.recipe_id} onChange={(event) => updateSlot(slot.id, { recipe_id: event.target.value })}>
                        {(draft.recipes ?? []).map((recipe) => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.title}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {editorTab === 'recipes' ? (
        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">레시피 카드</h2>
            <button className="rounded-md border px-3 py-2 text-sm" onClick={addRecipe}>
              레시피 추가
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {(draft.recipes ?? []).map((recipe) => (
              <div key={recipe.id} className="rounded-md border border-gray-200 p-3">
                <label className="mb-2 block">
                  <span className="mb-1 block text-xs font-semibold text-gray-500">레시피 제목</span>
                  <input className="w-full rounded border px-2 py-1 font-semibold" value={recipe.title} onChange={(event) => updateRecipe(recipe.id, { title: event.target.value })} />
                </label>
                <label className="mb-2 block">
                  <span className="mb-1 block text-xs font-semibold text-gray-500">재료 - 한 줄에 하나씩</span>
                  <textarea className="min-h-20 w-full rounded border px-2 py-1 text-sm" value={recipe.ingredients.map((item) => item.name).join('\n')} onChange={(event) => updateRecipe(recipe.id, { ingredients: event.target.value.split('\n').filter(Boolean).map((name) => ({ name })) })} />
                </label>
                <label className="mb-2 block">
                  <span className="mb-1 block text-xs font-semibold text-gray-500">조리 순서 - 한 줄에 하나씩</span>
                  <textarea className="min-h-24 w-full rounded border px-2 py-1 text-sm" value={recipe.steps.map((item) => item.text).join('\n')} onChange={(event) => updateRecipe(recipe.id, { steps: event.target.value.split('\n').filter(Boolean).map((text, index) => ({ order: index + 1, text })) })} />
                </label>
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">분량/농도</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" placeholder="분량/농도 메모" value={recipe.texture_note ?? ''} onChange={(event) => updateRecipe(recipe.id, { texture_note: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">보관</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" placeholder="보관 메모" value={recipe.storage_note ?? ''} onChange={(event) => updateRecipe(recipe.id, { storage_note: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">도구</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" placeholder="도구 메모" value={recipe.tool_note ?? ''} onChange={(event) => updateRecipe(recipe.id, { tool_note: event.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-gray-500">주의</span>
                    <input className="w-full rounded border px-2 py-1 text-sm" placeholder="주의 메모" value={recipe.caution_note ?? ''} onChange={(event) => updateRecipe(recipe.id, { caution_note: event.target.value })} />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {editorTab === 'safety' ? (
        <section className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-amber-900">Warning/caution text</span>
            <textarea className="min-h-20 w-full rounded-md border border-amber-200 p-3 text-sm" value={draft.flow.warning ?? ''} onChange={(event) => setDraft((value) => ({ ...value, flow: { ...value.flow, warning: event.target.value } }))} />
          </label>
        </section>
      ) : null}

      {editorTab === 'preview' ? (
        <section className="mt-5 rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500">공개 페이지 미리보기</p>
            <h2 className="text-xl font-semibold">{draft.flow.title}</h2>
          </div>
          {draft.flow.warning ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{draft.flow.warning}</div> : null}
          <MealPlanRenderer bundle={draft} anchor="" checks={{}} onToggle={() => undefined} reactionLogs={{}} onReactionChange={() => undefined} />
        </section>
      ) : null}
    </main>
  );
}

function EditorHeader({
  bundle,
  onSave,
  onPublish,
}: {
  bundle: FlowBundle;
  onSave: () => void;
  onPublish: () => void;
}) {
  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3">
            <FlowBadges bundle={bundle} showStatus />
          </div>
          <p className="text-sm text-gray-500">붙여넣기 → 실행 항목 다듬기 → 발행</p>
          <h1 className="mt-1 text-3xl font-semibold">{bundle.flow.title}</h1>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-md border px-3 py-2 text-sm" href={`/f/${bundle.flow.slug}`}>
            미리보기
          </Link>
          <button className="rounded-md border px-3 py-2 text-sm" onClick={onSave}>
            초안 저장
          </button>
          <button className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white" onClick={onPublish}>
            발행
          </button>
        </div>
      </div>
    </header>
  );
}

function PublishSuccessPanel({ bundle }: { bundle: FlowBundle }) {
  const publicPath = `/f/${bundle.flow.slug}`;
  const creatorPath = getCreatorPath(bundle);

  const copyPublicLink = async () => {
    const url = `${window.location.origin}${publicPath}`;
    await navigator.clipboard.writeText(url);
  };

  return (
    <section className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-semibold text-green-800">발행되었습니다</p>
      <h2 className="mt-1 text-xl font-semibold text-gray-950">다음 행동을 선택하세요</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white" onClick={copyPublicLink}>
          공개 링크 복사
        </button>
        <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href={publicPath}>
          공개 페이지 열기
        </Link>
        <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href={creatorPath}>
          제작자 프로필에서 보기
        </Link>
        <Link className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold" href="/flows/new">
          다른 Flow 만들기
        </Link>
      </div>
    </section>
  );
}

export function PublicFlow({ slug }: { slug: string }) {
  const { bundles, persist } = useBundles();
  const [bundle, setBundle] = useState<FlowBundle | null>(() => mergeSourceBackedMyFlowBundles(cloneSeedBundles()).find((item) => item.flow.slug === slug) ?? null);
  const [anchor, setAnchor] = useState('');
  const [anchorMode, setAnchorMode] = useState<AnchorMode>('custom');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [itemStates, setItemStates] = useState<Record<string, FlowItemState>>({});
  const [comparisonState, setComparisonState] = useState<FlowComparisonState>(() => getComparisonState(slug));
  const [workbenchState, setWorkbenchState] = useState<FlowWorkbenchState>(() => getWorkbenchState(slug));
  const [weekdaySelection, setWeekdaySelection] = useState(() => getInitialWeekdaySelection(bundle));
  const [reactionLogs, setReactionLogs] = useState<Record<string, ReactionLog>>({});
  const [copyState, setCopyState] = useState('');
  const [downloadState, setDownloadState] = useState('');
  const [calendarState, setCalendarState] = useState('');
  const [view, setView] = useState<PublicView>('list');
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [showMobileExportSheet, setShowMobileExportSheet] = useState(false);
  const [showStorageNotice, setShowStorageNotice] = useState(false);
  const [savedFlowAt, setSavedFlowAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    const found = mergeSourceBackedMyFlowBundles(getBundles()).find((item) => item.flow.slug === slug) ?? null;
    const storedAnchor = getStoredAnchor(slug);
    const hasStoredAnchor = Boolean(storedAnchor.anchor) || storedAnchor.mode !== 'custom';
    const defaultAnchorMode: AnchorMode = found && found.flow.anchor_type !== 'none' ? 'example' : 'custom';
    setBundle(found);
    setAnchor(storedAnchor.anchor);
    setAnchorMode(hasStoredAnchor && isAnchorMode(storedAnchor.mode) ? storedAnchor.mode : defaultAnchorMode);
    setChecks(getChecks(slug));
    setItemStates(getItemStates(slug));
    setComparisonState(getComparisonState(slug));
    setWorkbenchState(getWorkbenchState(slug));
    setReactionLogs(getReactionLogs(slug));
    setShowStorageNotice(found ? !isJeonsePrecheckFlow(found) && !hasDismissedStorageNotice() : false);
    setSavedFlowAt(getSavedFlowRecord(slug)?.savedAt);
  }, [slug]);

  useEffect(() => {
    saveChecks(slug, checks);
  }, [checks, slug]);

  useEffect(() => {
    saveStoredAnchor(slug, { mode: anchorMode, anchor });
  }, [anchor, anchorMode, slug]);

  useEffect(() => {
    saveItemStates(slug, itemStates);
  }, [itemStates, slug]);

  useEffect(() => {
    saveComparisonState(slug, comparisonState);
  }, [comparisonState, slug]);

  useEffect(() => {
    saveWorkbenchState(slug, workbenchState);
  }, [workbenchState, slug]);

  useEffect(() => {
    saveReactionLogs(slug, reactionLogs);
  }, [reactionLogs, slug]);

  useEffect(() => {
    const update = () => setShowMobileActions(window.scrollY > 520);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  if (!bundle) return <main className="p-8">Flow를 찾을 수 없습니다.</main>;

  const publicDisplayTitle = toContentDisplayTitle(bundle.flow.title);
  const displayAnchor = getPreviewAnchor(bundle, anchorMode, anchor);
  const views = getPublicViews(bundle, Boolean(displayAnchor));
  const activeView = views.some((item) => item.id === view) ? view : 'list';
  const executableIds = getExecutableCheckIds(bundle, displayAnchor).filter((id) => !isItemStateSkipped(itemStates, id));
  const executableCount = executableIds.length;
  const done = executableIds.filter((id) => checks[id]).length;
  const workbenchDone = Object.values(workbenchState.occurrences).filter((state) => state.done).length;
  const exportDone = done || workbenchDone;
  const canExportCalendar = hasCalendarSchedule(bundle);
  const showTodayExecution = isFitnessExactVideoFlow(bundle);
  const showExportFirstHero = isExportFirstHeroRoute(bundle);
  const showMobileWorkbenchFirst = shouldShowMobileWorkbenchFirst(bundle);
  const showDesktopReferenceRail = shouldUseDesktopReferenceRail(bundle);
  const hideSharedPublicFooter = shouldHideSharedPublicFooter(bundle);
  const compactJeonsePage = isJeonsePrecheckFlow(bundle);
  const showPublicSaveAction = publicSaveActionFlowSlugs.has(bundle.flow.slug) && !showExportFirstHero;
  const showMobileExportActions = showMobileActions && !compactJeonsePage && !showPublicSaveAction;
  const primaryDestination = inferPrimaryDestination(bundle);
  const holdSignalCount = getHoldSignalCount(bundle, workbenchState);
  const mobileStickyCtaLabel = getMobileStickyCtaLabel(bundle, canExportCalendar, holdSignalCount);
  const publicHeroInput = getAnchorLabel(bundle);
  const publicHeroArtifact = getCatalogDestinationLabel(bundle);
  const publicHeroPromise = getCatalogPromiseText(publicHeroInput, publicHeroArtifact);
  const publicHeroFirstTask = getCatalogFirstTask(getFlowPreviewStepTitles(bundle), getCatalogReason(bundle));
  const showPublicHeroSetup = !showTodayExecution && !showExportFirstHero && (showPublicSaveAction || bundle.flow.anchor_type === 'none');
  const publicMobileClearanceClass = showPublicSaveAction ? 'flowme-mobile-save-clearance' : 'flowme-mobile-export-clearance';

  const toggle = (id: string) => {
    setChecks((value) => {
      const ids = getToggleCheckIds(bundle, id, displayAnchor);
      const nextValue = !ids.every((checkId) => value[checkId]);
      return ids.reduce(
        (next, checkId) => ({
          ...next,
          [checkId]: nextValue,
        }),
        { ...value },
      );
    });
  };
  const updateReaction = (slotId: string, patch: ReactionLog) => {
    setReactionLogs((value) => ({ ...value, [slotId]: { ...value[slotId], ...patch } }));
  };
  const updateItemNote = (id: string, note: string) => {
    setItemStates((value) => ({
      ...value,
      [id]: {
        ...value[id],
        note,
      },
    }));
  };
  const toggleItemSkipped = (id: string) => {
    setItemStates((value) => {
      const current = value[id] ?? {};
      return {
        ...value,
        [id]: {
          ...current,
          skipped: !current.skipped,
        },
      };
    });
  };
  const copy = async () => {
    const text = buildText(bundle, checks, displayAnchor, itemStates, comparisonState, workbenchState);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(FLOW_EXPORT_FEEDBACK.memoCopied);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyState(copied ? FLOW_EXPORT_FEEDBACK.memoCopied : FLOW_EXPORT_FEEDBACK.copyFailed);
    }
    window.setTimeout(() => setCopyState(''), 1600);
  };
  const downloadExcel = async () => {
    setDownloadState(FLOW_EXPORT_FEEDBACK.sheetPreparing);
    const sheets = buildWorkbookSheets(bundle, checks, displayAnchor, {
      weekdays: weekdaySelection,
      reactionLogs,
      itemStates,
      comparisonState,
      workbenchState,
    });
    const buffer = await buildXlsxBuffer(sheets);
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bundle.flow.slug}.xlsx`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setDownloadState(FLOW_EXPORT_FEEDBACK.sheetReady);
    window.setTimeout(() => setDownloadState(''), 1600);
  };
  const downloadCalendar = () => {
    setCalendarState(FLOW_EXPORT_FEEDBACK.calendarPreparing);
    const ics = hasDatedCalendarSchedule(bundle)
      ? buildIcsCalendar(bundle, checks, displayAnchor, itemStates)
      : buildCalendarIcs(bundle, displayAnchor, weekdaySelection);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${bundle.flow.slug}.ics`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    setCalendarState(FLOW_EXPORT_FEEDBACK.calendarReady);
    window.setTimeout(() => setCalendarState(''), 1600);
  };
  const copyToEditableDraft = () => {
    if (!bundle) return;
    const next = cloneBundleForEditing(bundle);
    persist([...bundles, next]);
    window.location.href = `/flows/${next.flow.id}/edit`;
  };
  const saveToMyFlow = () => {
    const record = saveFlowRecord(bundle.flow.slug, {
      selectedArtifactMode: canExportCalendar && bundle.flow.primary_destination !== 'internal_check' ? 'calendar' : 'checklist',
      anchor: displayAnchor || undefined,
    });
    setSavedFlowAt(record?.savedAt ?? new Date().toISOString());
  };
  const openExportActions = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setShowMobileExportSheet(true);
      return;
    }
    document.querySelector('[aria-label="Flow artifact workbench"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const renderPublicSaveActions = () =>
    showPublicSaveAction ? (
      <div data-testid="public-flow-save-actions" className="hidden gap-2 sm:grid sm:max-w-sm">
        {savedFlowAt ? (
          <Link className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#3654FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8]" href="/my">
            내 Flow에서 보기
          </Link>
        ) : (
          <button
            type="button"
            className="min-h-11 rounded-xl bg-[#3654FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8]"
            onClick={saveToMyFlow}
          >
            내 Flow에 저장
          </button>
        )}
        {bundle.flow.source_url ? (
          <a className="inline-flex min-h-8 items-center justify-center text-sm font-semibold text-[#6E6B64] underline-offset-2 hover:text-[#3654FF] hover:underline" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
            원문은 아래에서 확인
          </a>
        ) : null}
      </div>
    ) : null;
  const renderPublicMobileSaveCta = () =>
    showPublicSaveAction ? (
      <div
        data-testid="public-flow-mobile-save-cta"
        className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-[#E7E4DD] bg-white/95 p-3 shadow-[0_14px_36px_rgba(27,26,23,0.14)] backdrop-blur sm:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#8A857B]">{savedFlowAt ? '저장됨' : '공유 콘텐츠'}</p>
            <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicDisplayTitle}</p>
          </div>
          {savedFlowAt ? (
            <Link className="shrink-0 rounded-xl bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" href="/my">
              내 Flow에서 보기
            </Link>
          ) : (
            <button className="shrink-0 rounded-xl bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" type="button" onClick={saveToMyFlow}>
              내 Flow에 저장
            </button>
          )}
        </div>
      </div>
    ) : null;
  const renderPublicHeroSetup = () => {
    if (!showPublicHeroSetup) return null;
    if (bundle.flow.anchor_type === 'none') {
      return (
        <div data-testid="public-flow-primary-setup" className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#E7E4DD]">
          <p className="text-[11px] font-semibold text-[#8A857B]">필요한 입력</p>
          <p className="mt-1 text-sm font-semibold text-[#1B1A17]">입력 없이 바로 확인합니다.</p>
          <div data-testid="public-flow-save-actions" className="mt-3">
            {savedFlowAt ? (
              <Link
                className="inline-flex min-h-10 w-full items-center justify-center rounded-xl bg-[#3654FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8]"
                href="/my"
              >
                내 Flow에서 보기
              </Link>
            ) : (
              <button
                type="button"
                className="min-h-10 w-full rounded-xl bg-[#3654FF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8]"
                onClick={saveToMyFlow}
              >
                내 Flow에 저장
              </button>
            )}
          </div>
        </div>
      );
    }
    return (
      <div data-testid="public-flow-primary-setup" className="rounded-xl bg-white px-3 py-3 ring-1 ring-[#E7E4DD]">
        <AnchorInput bundle={bundle} anchor={anchor} displayAnchor={displayAnchor} mode={anchorMode} onModeChange={setAnchorMode} onChange={setAnchor} weekdays={weekdaySelection} onWeekdaysChange={setWeekdaySelection} compactSecondaryActions />
      </div>
    );
  };
  const renderArtifactWorkbench = () => (
    <ArtifactWorkbench
      bundle={bundle}
      anchor={displayAnchor}
      weekdays={weekdaySelection}
      checks={checks}
      itemStates={itemStates}
      comparisonState={comparisonState}
      onComparisonChange={setComparisonState}
      workbenchState={workbenchState}
      onWorkbenchChange={setWorkbenchState}
      onToggleItem={toggle}
      exportActions={{
        done: exportDone,
        canExportCalendar,
        copyState,
        downloadState,
        calendarState,
        onCopyText: copy,
        onDownloadExcel: downloadExcel,
        onDownloadCalendar: downloadCalendar,
        onCopyToEditableDraft: copyToEditableDraft,
      }}
    />
  );
  const showCalendarExportAction = canExportCalendar && bundle.flow.primary_destination !== 'internal_check';
  const renderSetupSection = () =>
    !showTodayExecution && !showExportFirstHero && !showPublicHeroSetup ? (
      <section
        data-testid="public-flow-primary-setup"
        className={compactJeonsePage ? 'my-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-4' : 'my-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5'}
      >
        <div className={compactJeonsePage ? 'grid gap-3' : 'grid gap-4'}>
          <div className={compactJeonsePage ? '' : 'rounded-lg border border-slate-200 bg-slate-50 p-4'}>
            <p className="text-sm font-semibold text-blue-700">{getSetupStepTitle(bundle)}</p>
            {!compactJeonsePage ? <p className="mt-1 text-sm text-slate-600">{getSetupStepDescription(bundle)}</p> : null}
            <p className={compactJeonsePage ? 'mt-1 text-sm text-slate-600' : 'mt-1 text-sm text-slate-500'}>{getSetupStepHelp(bundle)}</p>
            <div className={compactJeonsePage ? 'mt-4 max-w-3xl' : 'mt-4'}>
              <AnchorInput bundle={bundle} anchor={anchor} displayAnchor={displayAnchor} mode={anchorMode} onModeChange={setAnchorMode} onChange={setAnchor} weekdays={weekdaySelection} onWeekdaysChange={setWeekdaySelection} />
            </div>
          </div>
        </div>
      </section>
    ) : null;

  return (
    <main className={`min-h-screen bg-[#FAFAF8] px-4 py-3 text-slate-950 md:px-6 md:py-6 ${publicMobileClearanceClass}`}>
      {renderPublicMobileSaveCta()}
      <div className="mx-auto max-w-7xl">
        <PublicFlowShareShell savedFlowAt={savedFlowAt} />

        <header data-testid="public-flow-hero" className={compactJeonsePage ? 'rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm md:px-5 md:py-4' : 'rounded-2xl border border-[#E7E4DD] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(27,26,23,0.05)] md:px-6 md:py-5'}>
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
            <span>{bundle.flow.category}</span>
            <span aria-hidden="true">·</span>
            <span>{getPublicFlowKindLabel(bundle)}</span>
            {bundle.flow.source_title && !compactJeonsePage ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{getCatalogSourceSignal(bundle)}</span>
              </>
            ) : null}
          </div>
          <h1 className={compactJeonsePage ? 'mt-2 max-w-3xl text-2xl font-bold tracking-normal text-slate-950 md:text-3xl' : 'mt-2 max-w-4xl text-2xl font-bold tracking-normal text-slate-950 md:mt-3 md:text-4xl'}>{publicDisplayTitle}</h1>
          {showPublicHeroSetup ? (
            <section className={compactJeonsePage ? 'mt-3 rounded-xl border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-2.5' : 'mt-3 rounded-2xl border border-[#E7E4DD] bg-[#FAFAF8] p-3'}>
              <p data-testid="public-flow-result-promise" className="break-keep text-sm font-semibold leading-6 text-[#3654FF]">{publicHeroPromise}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)] md:items-start">
                {renderPublicHeroSetup()}
                <div data-testid="public-flow-first-action-preview" className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-[#E7E4DD]">
                  <p className="text-[11px] font-semibold text-[#8A857B]">먼저 할 일</p>
                  <p className="mt-1 line-clamp-2 break-keep text-sm font-semibold text-[#1B1A17]">{publicHeroFirstTask}</p>
                </div>
              </div>
              {showPublicSaveAction ? <div className="mt-3">{renderPublicSaveActions()}</div> : null}
            </section>
          ) : (
            <section className="mt-3 rounded-2xl border border-[#E7E4DD] bg-[#FAFAF8] p-3">
              <p data-testid="public-flow-result-promise" className="break-keep text-sm font-semibold leading-6 text-[#3654FF]">{publicHeroPromise}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#E7E4DD]">
                  <p className="text-[11px] font-semibold text-[#8A857B]">입력</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicHeroInput}</p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#E7E4DD]">
                  <p className="text-[11px] font-semibold text-[#8A857B]">저장 결과</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicHeroArtifact}</p>
                </div>
                <div data-testid="public-flow-first-action-preview" className="rounded-xl bg-white px-3 py-2 ring-1 ring-[#E7E4DD]">
                  <p className="text-[11px] font-semibold text-[#8A857B]">먼저 할 일</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicHeroFirstTask}</p>
                </div>
              </div>
            </section>
          )}
          {bundle.flow.description ? <p className={compactJeonsePage ? 'mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base md:leading-7' : 'mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base md:leading-7'}>{bundle.flow.description}</p> : null}
          {compactJeonsePage ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">D-3 / D-Day / D+1</span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">7개 체크</span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">출처 확인됨</span>
            </div>
          ) : (
            <>
              <FlowHeroMeta bundle={bundle} hideAnchorStart={showPublicHeroSetup || showMobileWorkbenchFirst} />
              <div className="mt-3 md:mt-4">
                <FlowBadges bundle={bundle} />
              </div>
            </>
          )}
          {showPublicSaveAction ? (
            !showPublicHeroSetup ? <div className="mt-4">{renderPublicSaveActions()}</div> : null
          ) : null}
        </header>

      {showDesktopReferenceRail ? (
        <div data-testid="flow-desktop-workbench-layout" className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className={showMobileWorkbenchFirst ? 'flex min-w-0 flex-col lg:block' : 'min-w-0'}>
            <div className={showMobileWorkbenchFirst ? 'order-3 lg:hidden' : 'lg:hidden'}>
              <FlowMigrationStatus bundle={bundle} />
              <FlowSourceFitStatus bundle={bundle} />
            </div>

            {showExportFirstHero ? (
              <ExportFirstHero
                bundle={bundle}
                anchor={anchor}
                displayAnchor={displayAnchor}
                mode={anchorMode}
                onModeChange={setAnchorMode}
                onAnchorChange={setAnchor}
                weekdays={weekdaySelection}
                onWeekdaysChange={setWeekdaySelection}
                savedFlowAt={savedFlowAt}
                onSaveToMyFlow={saveToMyFlow}
                onDownloadExcel={downloadExcel}
                onDownloadCalendar={downloadCalendar}
                onCopyText={copy}
              />
            ) : null}

            <div className={showMobileWorkbenchFirst ? 'order-2 lg:contents' : undefined}>{renderSetupSection()}</div>
            <div className={showMobileWorkbenchFirst ? 'order-1 lg:contents' : undefined}>{renderArtifactWorkbench()}</div>
          </div>
          <aside data-testid="flow-desktop-rail" className="hidden space-y-4 lg:sticky lg:top-6 lg:block">
            <FlowMigrationStatus bundle={bundle} />
            <FlowSourceFitStatus bundle={bundle} />
            <SourceContentCard bundle={bundle} className="mt-0" />
            <FlowWarningCard bundle={bundle} className="mt-0" />
          </aside>
        </div>
      ) : showMobileWorkbenchFirst ? (
        <div className="flex flex-col">
          <div className="order-3 md:order-1">
            <FlowMigrationStatus bundle={bundle} />
            <FlowSourceFitStatus bundle={bundle} />
          </div>
          <div className="order-2 md:order-2">{renderSetupSection()}</div>
          <div className="order-1 md:order-3">{renderArtifactWorkbench()}</div>
        </div>
      ) : (
        <>
          <FlowMigrationStatus bundle={bundle} />
          <FlowSourceFitStatus bundle={bundle} />

          {showExportFirstHero ? (
            <ExportFirstHero
              bundle={bundle}
              anchor={anchor}
              displayAnchor={displayAnchor}
              mode={anchorMode}
              onModeChange={setAnchorMode}
              onAnchorChange={setAnchor}
              weekdays={weekdaySelection}
              onWeekdaysChange={setWeekdaySelection}
              savedFlowAt={savedFlowAt}
              onSaveToMyFlow={saveToMyFlow}
              onDownloadExcel={downloadExcel}
              onDownloadCalendar={downloadCalendar}
              onCopyText={copy}
            />
          ) : null}

          {renderSetupSection()}
          {renderArtifactWorkbench()}
        </>
      )}

      {showStorageNotice ? (
        <section className="my-5 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p>
              <span className="font-semibold">진행 상황은 이 브라우저에 자동 저장됩니다.</span> 다른 기기에서 보거나 백업하려면 시트 파일을 받아두세요.
            </p>
            <button
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700"
              onClick={() => {
                dismissStorageNotice();
                setShowStorageNotice(false);
              }}
            >
              확인
            </button>
          </div>
        </section>
      ) : null}

      {!shouldUseSimplifiedFeedbackLayout(bundle) ? <ArtifactPreview bundle={bundle} /> : null}

      {showTodayExecution && !shouldUseSimplifiedFeedbackLayout(bundle) ? (
        <ExactVideoToolPreview
          bundle={bundle}
          anchor={anchor}
          displayAnchor={displayAnchor}
          anchorMode={anchorMode}
          onAnchorModeChange={setAnchorMode}
          onAnchorChange={setAnchor}
          weekdays={weekdaySelection}
          onWeekdaysChange={setWeekdaySelection}
          destination={primaryDestination}
          onCopyText={copy}
          onDownloadExcel={downloadExcel}
          onDownloadCalendar={downloadCalendar}
          onCopyToEditableDraft={copyToEditableDraft}
          copyState={copyState}
          downloadState={downloadState}
          calendarState={calendarState}
        />
      ) : null}

      {shouldUseSimplifiedFeedbackLayout(bundle) ? null : showTodayExecution ? (
        shouldHideExactVideoExecutionCard(bundle) ? null : <ExactVideoRenderer bundle={bundle} checks={checks} onToggle={toggle} />
      ) : (
        <>
          {!shouldUseSimplifiedFeedbackLayout(bundle) ? <FlowOverview bundle={bundle} anchor={displayAnchor} checks={checks} itemStates={itemStates} onToggle={toggle} /> : null}

          {views.length > 1 ? (
            <div className="mb-5 flex flex-wrap gap-2">
              {views.map((item) => (
                <button key={item.id} className={`rounded-md border px-3 py-2 text-sm font-semibold ${activeView === item.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700'}`} onClick={() => setView(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {activeView === 'week' ? (
            <WeekRenderer bundle={bundle} anchor={displayAnchor} weekdays={weekdaySelection} checks={checks} onToggle={toggle} />
          ) : activeView === 'month' && bundle.flow.structure_type === 'routine' ? (
            <RoutineMonthRenderer bundle={bundle} anchor={displayAnchor} weekdays={weekdaySelection} />
          ) : activeView === 'month' ? (
            <MonthRenderer bundle={bundle} anchor={displayAnchor} checks={checks} onToggle={toggle} />
          ) : activeView === 'recipes' ? (
            <RecipeListRenderer bundle={bundle} anchor={displayAnchor} />
          ) : bundle.flow.content_type === 'meal_plan' ? (
            <MealPlanRenderer bundle={bundle} anchor={displayAnchor} checks={checks} onToggle={toggle} reactionLogs={reactionLogs} onReactionChange={updateReaction} />
          ) : bundle.flow.structure_type === 'timeline' ? (
            <TimelineRenderer bundle={bundle} anchor={displayAnchor} checks={checks} itemStates={itemStates} onToggle={toggle} onNoteChange={updateItemNote} onSkipToggle={toggleItemSkipped} />
          ) : bundle.flow.structure_type === 'routine' ? (
            <RoutineRenderer bundle={bundle} anchor={displayAnchor} checks={checks} itemStates={itemStates} onToggle={toggle} weekdays={weekdaySelection} onNoteChange={updateItemNote} onSkipToggle={toggleItemSkipped} />
          ) : (
            <ChecklistRenderer bundle={bundle} checks={checks} itemStates={itemStates} onToggle={toggle} onNoteChange={updateItemNote} onSkipToggle={toggleItemSkipped} />
          )}
        </>
      )}

      {!hideSharedPublicFooter ? (
        <>
          <section className="my-5 rounded-2xl border border-[#E7E4DD] bg-white p-4 shadow-[0_1px_0_rgba(27,26,23,0.03)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link className="text-sm font-semibold text-[#1B1A17] underline-offset-2 hover:text-[#3654FF] hover:underline" href={getCreatorPath(bundle)}>
                  by {getCreatorName(bundle)}
                </Link>
                {getCreatorRole(bundle) ? <p className="mt-1 text-sm text-[#6E6B64]">{getCreatorRole(bundle)}</p> : null}
                {getCreatorNote(bundle) ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6E6B64]">{getCreatorNote(bundle)}</p> : null}
              </div>
            </div>
          </section>

          <SourceContentCard bundle={bundle} className={showDesktopReferenceRail ? 'mt-5 lg:hidden' : 'mt-5'} />

          <FlowWarningCard bundle={bundle} className={showDesktopReferenceRail ? 'mt-5 lg:hidden' : 'mt-5'} />
        </>
      ) : null}

      {showMobileExportSheet && !compactJeonsePage ? (
        <div className="fixed inset-0 z-30 md:hidden" data-testid="mobile-export-sheet" role="dialog" aria-modal="true" aria-labelledby="mobile-export-title">
          <button className="absolute inset-0 bg-slate-950/35" aria-label="배경" onClick={() => setShowMobileExportSheet(false)} />
          <section className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[#E7E4DD] bg-white p-5 shadow-[0_-16px_40px_rgba(27,26,23,0.16)]">
            <div className="mx-auto h-1.5 w-12 rounded-full bg-[#E7E4DD]" />
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="mobile-export-title" className="text-lg font-semibold text-[#1B1A17]">어디로 가져갈까요</h2>
                <p className="mt-1 text-sm text-[#6E6B64]">
                  {getMobileExportSheetSummary(bundle, displayAnchor, executableCount)}
                </p>
              </div>
              <button className="shrink-0 whitespace-nowrap rounded-xl border border-[#D8D5CD] px-3 py-1.5 text-sm font-semibold text-[#6E6B64]" onClick={() => setShowMobileExportSheet(false)}>
                닫기
              </button>
            </div>
            <div className="mt-5 grid gap-2">
              {showCalendarExportAction ? (
                <button data-testid="mobile-export-calendar" aria-label={`${FLOW_EXPORT_LABELS.calendarFile}: ${publicDisplayTitle} .ics 일정`} className="flex items-center gap-3 rounded-xl bg-[#EEF1FF] px-4 py-3 text-left text-sm font-semibold text-[#1B1A17] disabled:text-[#A7A39A]" disabled={done === 0} onClick={downloadCalendar}>
                  <span aria-hidden="true" className="h-3 w-3 rounded-sm border border-[#3654FF] bg-white" />
                  <span className="flex-1">
                    <span className="block">{FLOW_EXPORT_LABELS.calendarFile}</span>
                    <span className="mt-0.5 block text-xs font-medium text-[#6E6B64]">구글 · 애플 · .ics 파일</span>
                  </span>
                  <span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 border-r border-t border-[#6E6B64]" />
                </button>
              ) : null}
              <button data-testid="mobile-export-excel" aria-label={`${FLOW_EXPORT_LABELS.sheetFile}: ${publicDisplayTitle} .xlsx 실행 시트`} className="flex items-center gap-3 rounded-xl bg-[#FAFAF8] px-4 py-3 text-left text-sm font-semibold text-[#1B1A17] disabled:text-[#A7A39A]" disabled={done === 0} onClick={downloadExcel}>
                <span aria-hidden="true" className="h-3 w-3 rounded-sm border border-[#6E6B64] bg-white" />
                <span className="flex-1">
                  <span className="block">{FLOW_EXPORT_LABELS.sheetFile}</span>
                  <span className="mt-0.5 block text-xs font-medium text-[#6E6B64]">진도표와 메모 시트</span>
                </span>
                <span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 border-r border-t border-[#6E6B64]" />
              </button>
              <button data-testid="mobile-export-copy" aria-label={`${FLOW_EXPORT_LABELS.memoCopy}: ${publicDisplayTitle} 실행 메모`} className="flex items-center gap-3 rounded-xl bg-[#FAFAF8] px-4 py-3 text-left text-sm font-semibold text-[#1B1A17] disabled:text-[#A7A39A]" disabled={done === 0} onClick={copy}>
                <span aria-hidden="true" className="h-3 w-3 rounded-sm border border-[#6E6B64] bg-white" />
                <span className="flex-1">
                  <span className="block">{FLOW_EXPORT_LABELS.memoCopy}</span>
                  <span className="mt-0.5 block text-xs font-medium text-[#6E6B64]">노션 · 카카오톡 · 메모장</span>
                </span>
                <span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 border-r border-t border-[#6E6B64]" />
              </button>
              <div className="my-1 h-px bg-[#E7E4DD]" />
              <button className="flex items-center gap-3 rounded-xl border border-[#D8D5CD] px-4 py-3 text-left text-sm font-semibold text-[#1B1A17]" onClick={copyToEditableDraft}>
                <span aria-hidden="true" className="h-3 w-3 rounded-sm border border-[#6E6B64] bg-[#FAFAF8]" />
                <span className="flex-1">
                  <span className="block">내 버전으로 편집</span>
                  <span className="mt-0.5 block text-xs font-medium text-[#6E6B64]">저장 후 내용 수정</span>
                </span>
                <span aria-hidden="true" className="h-2.5 w-2.5 rotate-45 border-r border-t border-[#6E6B64]" />
              </button>
            </div>
            <div className="mt-3 min-h-5 text-sm">
              {copyState ? <span className="text-[#1F8A5B]">{copyState}</span> : null}
              {downloadState ? <span className="text-[#3654FF]">{downloadState}</span> : null}
              {calendarState ? <span className="text-[#3654FF]">{calendarState}</span> : null}
            </div>
          </section>
        </div>
      ) : null}

      <div
        data-testid="mobile-export-bar"
        aria-hidden={!showMobileExportActions}
        className={`fixed inset-x-4 bottom-[calc(9.75rem+env(safe-area-inset-bottom))] z-20 rounded-2xl border border-[#E7E4DD] bg-white/95 px-4 py-3 shadow-[0_14px_36px_rgba(27,26,23,0.14)] backdrop-blur transition duration-200 md:hidden ${showMobileExportActions ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-[#6E6B64]">진행률</span>
                <span className="font-semibold">{done} / {executableCount}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#E7E4DD]">
                <div className="h-full bg-[#3654FF]" style={{ width: `${executableCount > 0 ? Math.round((done / executableCount) * 100) : 0}%` }} />
              </div>
            </div>
            {showPublicSaveAction ? (
              savedFlowAt ? (
                <Link className="shrink-0 rounded-xl bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" href="/my">
                  내 Flow에서 보기
                </Link>
              ) : (
                <button className="shrink-0 rounded-xl bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={saveToMyFlow}>
                  내 Flow에 저장
                </button>
              )
            ) : showExportFirstHero ? (
              <button className="shrink-0 rounded-xl bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={() => setShowMobileExportSheet(true)}>
                내 도구로 가져가기
              </button>
            ) : (
              <button className="shrink-0 rounded-xl bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" onClick={() => setShowMobileExportSheet(true)}>
                {mobileStickyCtaLabel}
              </button>
            )}
          </div>
        </div>
      </div>
      {!savedFlowAt ? <PublicFlowSecondaryBrowseLink /> : null}
      </div>
    </main>
  );
}

function PublicFlowShareShell({ savedFlowAt }: { savedFlowAt?: string }) {
  return (
    <nav
      aria-label="공유 콘텐츠"
      data-testid="flow-public-shell"
      className="mb-4 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#E7E4DD] bg-white/95 px-4 py-2.5 shadow-[0_1px_0_rgba(27,26,23,0.03)] backdrop-blur md:mb-6"
    >
      <Link className="inline-flex min-h-9 items-center text-lg font-semibold tracking-tight text-[#1B1A17]" href="/">
        FLOW
      </Link>
      {savedFlowAt ? (
        <Link className="inline-flex min-h-9 items-center rounded-xl border border-[#E7E4DD] px-3 text-sm font-semibold text-[#6E6B64] hover:text-[#3654FF]" href="/my">
          내 Flow에서 보기
        </Link>
      ) : (
        <span className="text-xs font-semibold text-[#8A857B]">공유 화면</span>
      )}
    </nav>
  );
}

function PublicFlowSecondaryBrowseLink() {
  return (
    <div className="mt-3 flex justify-end">
      <Link
        data-testid="flow-public-secondary-browse-link"
        className="inline-flex min-h-9 items-center px-1 text-xs font-semibold text-[#8A857B] underline-offset-4 hover:text-[#3654FF] hover:underline"
        href="/flows"
      >
        콘텐츠 더 보기
      </Link>
    </div>
  );
}

function isExportFirstHeroRoute(bundle: FlowBundle) {
  return bundle.flow.slug === 'moving-d30-basic';
}

function shouldShowMobileWorkbenchFirst(bundle: FlowBundle) {
  return (
    bundle.flow.structure_type === 'routine' ||
    [
      'baby-food-menu-recipe',
      'water-purifier-filter-cycle',
      'wedding-d180-basic',
      'used-car-buying-check',
      'plank-30-day-challenge',
      'elementary-school-entry-d30',
      'kids-printable-squishy-craft',
      'fridge-cleanout-weekly-plan',
    ].includes(bundle.flow.slug)
  );
}

function shouldUseDesktopReferenceRail(bundle: FlowBundle) {
  return [
    'moving-d30-basic',
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
    'used-car-buying-check',
    'baby-food-menu-recipe',
    'elementary-school-entry-d30',
  ].includes(bundle.flow.slug);
}

function compactDateLabel(value: string) {
  if (!value) return '';
  return formatKoreanShortDate(value);
}

function getExportFirstPreviewEntries(bundle: FlowBundle, anchor: string): ScheduleEntry[] {
  if (!anchor) return [];
  const seen = new Set<string>();
  const entries = getScheduleEntries(bundle, anchor).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const grouped: ScheduleEntry[] = [];

  for (const entry of entries) {
    const key = entry.timing || entry.startDate;
    if (seen.has(key)) continue;
    seen.add(key);
    grouped.push(entry);
  }

  if (grouped.length <= 3) return grouped;

  const dayOfEntry = grouped.find((entry) => entry.timing === 'D-Day' || entry.startDate === anchor);
  return [grouped[0], grouped[1], dayOfEntry ?? grouped[2]].filter(
    (entry, index, list): entry is ScheduleEntry => Boolean(entry) && list.findIndex((item) => item?.id === entry.id) === index,
  );
}

function getMobileExportSheetSummary(bundle: FlowBundle, anchor: string, executableCount: number) {
  if (bundle.flow.slug === 'moving-d30-basic' && anchor) return `이사일 ${anchor} 기준 ${executableCount}개 항목`;
  if (anchor) return `${anchor} 기준 ${executableCount}개 항목`;
  return `${executableCount}개 항목`;
}

function getMobileStickyCtaLabel(bundle: FlowBundle, canExportCalendar: boolean, holdSignalCount = 0): string {
  if ((bundle.flow.slug === 'new-car-delivery-check' || bundle.flow.slug === 'used-car-buying-check') && holdSignalCount > 0) {
    return `보류 ${holdSignalCount}건 포함 .xlsx`;
  }
  if (bundle.flow.slug === 'moving-d30-basic') return '내 Flow에 저장';
  if (bundle.flow.slug === 'computer-skills-d30-study') return '시트·캘린더 파일 받기';
  if (bundle.flow.slug === 'diet-habit-2week') return '수면 체크표 .xlsx 받기';
  if (bundle.flow.slug === 'new-car-delivery-check') return '증거표 .xlsx 받기';
  if (bundle.flow.primary_destination === 'internal_check') return '체크리스트로 쓰기';
  if (bundle.flow.primary_destination === 'hybrid') return canExportCalendar ? '시트·캘린더 파일 받기' : '시트·메모로 복사';
  if (bundle.flow.primary_destination === 'calendar' || canExportCalendar) return FLOW_EXPORT_LABELS.calendarFile;
  if (bundle.flow.primary_destination === 'sheet') return FLOW_EXPORT_LABELS.sheetFile;
  if (bundle.flow.primary_destination === 'memo') return FLOW_EXPORT_LABELS.memoCopy;
  return '내 도구로 가져가기';
}

function getHoldSignalCount(bundle: FlowBundle, workbenchState: FlowWorkbenchState): number {
  if (!bundle.flow.hold_section) return 0;
  return Object.entries(workbenchState.memoCards ?? {}).filter(([id, value]) => isHoldMemoField(bundle, id) && value.trim()).length;
}

function isHoldMemoField(bundle: FlowBundle, id: string): boolean {
  if (id.startsWith(`${bundle.flow.slug}-hold-`)) return true;
  if (bundle.flow.slug === 'new-car-delivery-check') {
    return ['new-car-photo-files', 'new-car-dealer-confirmation', 'new-car-handover-boundary'].includes(id);
  }
  if (bundle.flow.slug === 'used-car-buying-check') {
    return ['used-car-proof-files', 'used-car-expert-check', 'used-car-buy-hold-memo'].includes(id);
  }
  return false;
}

function ExportFirstHero({
  bundle,
  anchor,
  displayAnchor,
  mode,
  onModeChange,
  onAnchorChange,
  weekdays,
  onWeekdaysChange,
  savedFlowAt,
  onSaveToMyFlow,
  onDownloadExcel,
  onDownloadCalendar,
  onCopyText,
}: {
  bundle: FlowBundle;
  anchor: string;
  displayAnchor: string;
  mode: AnchorMode;
  onModeChange: (value: AnchorMode) => void;
  onAnchorChange: (value: string) => void;
  weekdays: string[];
  onWeekdaysChange: (value: string[]) => void;
  savedFlowAt?: string;
  onSaveToMyFlow: () => void;
  onDownloadExcel: () => void;
  onDownloadCalendar: () => void;
  onCopyText: () => void;
}) {
  const displayTitle = toContentDisplayTitle(bundle.flow.title);
  const previewEntries = getExportFirstPreviewEntries(bundle, displayAnchor);
  const remainingCount = Math.max(getScheduleEntries(bundle, displayAnchor).length - previewEntries.length, 0);
  const sourceText = bundle.flow.source_title ? `${bundle.items.length}개 항목 · ${toUserFacingSourceTitle(bundle.flow.source_title)}` : `${bundle.items.length}개 항목`;

  return (
    <section aria-label="Export-first flow hero" className="my-6 rounded-2xl border border-[#E7E4DD] bg-white p-4 shadow-[0_1px_0_rgba(27,26,23,0.03)] md:p-5">
      <div className="grid gap-5 md:grid-cols-[1.08fr_0.92fr] md:items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-normal text-[#1B1A17] md:text-3xl">{displayTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-[#6E6B64]">{sourceText}</p>

          <div className="mt-5 rounded-2xl border border-[#E7E4DD] bg-[#FAFAF8] p-4">
            <p className="text-sm font-semibold text-[#4A4842]">이렇게 캘린더에 들어갑니다</p>
            <div className="mt-3 space-y-2">
              {previewEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-[3.2rem_5.8rem_1fr] items-baseline gap-2 text-sm">
                  <span className="font-semibold text-[#6E6B64]">{entry.timing}</span>
                  <span className="font-medium text-[#6E6B64]">{formatKoreanShortDate(entry.startDate)}</span>
                  <span className="min-w-0 text-[#1B1A17]">{entry.title}</span>
                </div>
              ))}
            </div>
            {remainingCount > 0 ? <p className="mt-3 text-xs font-medium text-[#6E6B64]">+ 나머지 {remainingCount}개 항목</p> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E7E4DD] bg-white p-4 shadow-[0_1px_0_rgba(27,26,23,0.03)]">
          <p className="text-sm font-semibold text-[#1B1A17]">{getSetupStepTitle(bundle)}</p>
          <p className="mt-1 text-sm leading-6 text-[#6E6B64]">{getSetupStepDescription(bundle)}</p>
          <div className="mt-4">
            <AnchorInput
              bundle={bundle}
              anchor={anchor}
              displayAnchor={displayAnchor}
              mode={mode}
              onModeChange={onModeChange}
              onChange={onAnchorChange}
              weekdays={weekdays}
              onWeekdaysChange={onWeekdaysChange}
              compactSecondaryActions
            />
          </div>
          <div className="mt-4" data-testid="moving-save-actions">
            {savedFlowAt ? (
              <div className="rounded-2xl border border-[#DCEBDD] bg-[#EAF7F0] p-3 text-sm text-[#1B1A17]">
                <p className="font-semibold">내 Flow에 담았어요</p>
                <p className="mt-1 text-xs leading-5 text-[#1F8A5B]">이제 FLOW 안에서 체크하거나 외부 도구로도 보낼 수 있습니다.</p>
              </div>
            ) : null}
            {savedFlowAt ? (
              <Link
                className="mt-3 flex w-full items-center justify-center rounded-xl bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8]"
                href="/my"
              >
                내 Flow에서 보기
              </Link>
            ) : (
              <button
                type="button"
                className="w-full rounded-xl bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8]"
                onClick={onSaveToMyFlow}
              >
                내 Flow에 저장
              </button>
            )}
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <button className="rounded-xl border border-[#D8D5CD] bg-white px-3 py-2.5 text-sm font-semibold text-[#1B1A17] hover:border-[#3654FF]/40 hover:text-[#3654FF]" type="button" onClick={onDownloadCalendar}>
                {FLOW_EXPORT_LABELS.calendarFile}
              </button>
              <button className="rounded-xl border border-[#D8D5CD] bg-white px-3 py-2.5 text-sm font-semibold text-[#1B1A17] hover:border-[#3654FF]/40 hover:text-[#3654FF]" type="button" onClick={onDownloadExcel}>
                {FLOW_EXPORT_LABELS.sheetFile}
              </button>
              <button className="rounded-xl border border-[#D8D5CD] bg-white px-3 py-2.5 text-sm font-semibold text-[#1B1A17] hover:border-[#3654FF]/40 hover:text-[#3654FF]" type="button" onClick={onCopyText}>
                {FLOW_EXPORT_LABELS.memoCopy}
              </button>
            </div>
          </div>
          {displayAnchor ? (
            <p className="mt-2 text-center text-xs font-medium text-[#6E6B64]">
              {compactDateLabel(previewEntries[0]?.startDate ?? displayAnchor)}부터 {bundle.items.length}개 항목을 옮깁니다.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AnchorInput({
  bundle,
  anchor,
  displayAnchor,
  mode,
  onModeChange,
  onChange,
  weekdays,
  onWeekdaysChange,
  compactSecondaryActions = false,
}: {
  bundle: FlowBundle;
  anchor: string;
  displayAnchor: string;
  mode: AnchorMode;
  onModeChange: (value: AnchorMode) => void;
  onChange: (value: string) => void;
  weekdays: string[];
  onWeekdaysChange: (value: string[]) => void;
  compactSecondaryActions?: boolean;
}) {
  if (bundle.flow.anchor_type === 'none') {
    const noAnchorInstruction =
      bundle.flow.primary_destination === 'sheet'
        ? '표에 필요한 값을 채우고, 확인이 끝난 행만 완료로 표시하세요.'
        : '아래 항목을 하나씩 확인하고 완료한 것은 체크하세요.';
    return <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">{noAnchorInstruction}</div>;
  }

  const label = getAnchorInputLabel(bundle);
  const anchorDate = anchor ? new Date(anchor) : null;
  const today = new Date();
  const daysUntil = anchorDate && !Number.isNaN(anchorDate.getTime())
    ? Math.ceil((anchorDate.getTime() - new Date(formatDate(today)).getTime()) / 86400000)
    : null;
  const earliestOffset = getEarliestOffset(bundle);
  const isPast = daysUntil !== null && daysUntil < 0;
  const isClose = daysUntil !== null && earliestOffset < 0 && daysUntil >= 0 && daysUntil < Math.abs(earliestOffset);
  const selectedDateLabel = anchor ? formatKoreanShortDate(anchor, { includeWeekday: true }) : '';
  const displayAnchorLabel = displayAnchor ? formatKoreanShortDate(displayAnchor, { includeWeekday: true }) : '';

  if (isJeonsePrecheckFlow(bundle)) {
    const secondaryActions = (
      <div className="grid grid-cols-2 gap-2">
        <button className={`rounded-md border px-3 py-2 text-left text-sm font-semibold ${mode === 'undecided' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`} type="button" onClick={() => onModeChange('undecided')}>
          날짜 미정
        </button>
        <button className={`rounded-md border px-3 py-2 text-left text-sm font-semibold ${mode === 'example' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`} type="button" onClick={() => onModeChange('example')}>
          예시 보기
        </button>
      </div>
    );

    return (
      <div className="space-y-3">
        <label className="block space-y-2">
          <span className="text-sm font-semibold text-slate-950">{label}</span>
          <div className="flex gap-2">
            <input
              aria-label={label}
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2"
              type="date"
              value={anchor}
              onInput={(event) => {
                onModeChange('custom');
                onChange(event.currentTarget.value);
              }}
              onChange={(event) => {
                onModeChange('custom');
                onChange(event.target.value);
              }}
            />
            <button className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => onModeChange('custom')}>
              적용
            </button>
          </div>
        </label>
        {compactSecondaryActions ? (
          <details className="rounded-xl border border-[#E7E4DD] bg-white px-3 py-2 text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-[#6E6B64]">다른 방법</summary>
            <div className="mt-2">{secondaryActions}</div>
          </details>
        ) : (
          secondaryActions
        )}
        {mode === 'custom' && anchor ? (
          <p className={`rounded-md border px-3 py-2 text-sm ${isPast ? 'border-red-200 bg-red-50 text-red-800' : isClose ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {isPast ? `${label}이 이미 지났어요.` : `${label} ${selectedDateLabel} 기준으로 일정이 조정됐습니다.`}
          </p>
        ) : mode === 'example' ? (
          <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">예시 날짜 {displayAnchorLabel}로 미리 봅니다.</p>
        ) : mode === 'undecided' ? (
          <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">날짜를 정하면 모든 일정이 다시 계산됩니다.</p>
        ) : null}
      </div>
    );
  }

  const secondaryActions = (
    <div className="grid gap-2 sm:grid-cols-2">
      <button className={`rounded-md border px-3 py-2 text-left text-sm font-semibold ${mode === 'undecided' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`} type="button" onClick={() => onModeChange('undecided')}>
        아직 날짜가 안 정해졌어요
      </button>
      <button className={`rounded-md border px-3 py-2 text-left text-sm font-semibold ${mode === 'example' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`} type="button" onClick={() => onModeChange('example')}>
        그냥 예시로 둘러볼게요
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label={label}
            className="min-w-[220px] flex-1 rounded-md border border-gray-300 px-3 py-2"
            type="date"
            value={anchor}
            onInput={(event) => {
              onModeChange('custom');
              onChange(event.currentTarget.value);
            }}
            onChange={(event) => {
              onModeChange('custom');
              onChange(event.target.value);
            }}
          />
          <button className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" type="button" onClick={() => onModeChange('custom')}>
            입력
          </button>
        </div>
      </label>
      {compactSecondaryActions ? (
        <details className="rounded-xl border border-[#E7E4DD] bg-white px-3 py-2 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-[#6E6B64]">다른 방법</summary>
          <div className="mt-2">{secondaryActions}</div>
        </details>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs font-semibold text-gray-400">
            <span className="h-px flex-1 bg-gray-200" />
            또는
            <span className="h-px flex-1 bg-gray-200" />
          </div>
          {secondaryActions}
        </>
      )}
      {mode === 'custom' && anchor ? (
        <div className={`rounded-md border p-3 text-sm ${isPast ? 'border-red-200 bg-red-50 text-red-800' : isClose ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {isPast ? (
            `${label}이 이미 지났어요. 다른 날짜를 입력하시겠어요?`
          ) : (
            <>
              <span className="font-semibold">{label}: {selectedDateLabel}</span>
              {daysUntil !== null ? ` (D-${daysUntil})` : ''} 으로 모든 항목이 자동 조정됐어요.
              {isClose ? ` ${label}까지 ${daysUntil}일밖에 남지 않아 일부 초기 단계는 빠르게 처리하거나 건너뛸 수 있어요.` : null}
            </>
          )}
        </div>
      ) : mode === 'example' ? (
        <p className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-600">예시 날짜로 미리보기 · {label} {displayAnchorLabel}</p>
      ) : mode === 'undecided' ? (
        <p className="rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-600">날짜 없이 항목만 먼저 둘러봅니다. 날짜를 넣으면 모든 일정이 다시 계산됩니다.</p>
      ) : null}
      {bundle.flow.structure_type === 'routine' && shouldShowWeekdaySelection(bundle) ? (
        <div>
          <p className="mb-2 text-sm font-semibold">{getWeekdaySelectionLabel(bundle)}</p>
          <div className="flex flex-wrap gap-2">
            {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
              <label key={day} className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={weekdays.includes(day)}
                  onChange={() =>
                    onWeekdaysChange(
                      weekdays.includes(day)
                        ? weekdays.filter((value) => value !== day)
                        : [...weekdays, day],
                    )
                  }
                />
                {day}
              </label>
            ))}
          </div>
        </div>
      ) : bundle.flow.structure_type === 'routine' ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <span className="font-semibold">반복 주기</span>
          <span className="ml-2">{getFixedRoutineCadenceLabel(bundle)}</span>
        </div>
      ) : null}
    </div>
  );
}

function shouldShowWeekdaySelection(bundle: FlowBundle): boolean {
  return !['washer-tub-clean-monthly', 'monstera-care-routine'].includes(bundle.flow.slug);
}

function getFixedRoutineCadenceLabel(bundle: FlowBundle): string {
  return bundle.repeatRules?.[1]?.replace('@', '') ?? bundle.repeatRules?.[0]?.replace('@', '') ?? 'Flow에 정해진 주기로 반복';
}

function getWeekdaySelectionLabel(bundle: FlowBundle): string {
  if (bundle.flow.slug.startsWith('real-fitvely-video-')) return '적용 요일';
  if (bundle.flow.category.includes('운동')) return '운동 요일';
  return '반복 요일';
}

function getInitialWeekdaySelection(bundle: FlowBundle | null): string[] {
  if (!bundle) return ['월', '수', '금'];
  if (bundle.flow.structure_type !== 'routine') return ['월', '수', '금'];
  return getRoutineWeekdayLabels(bundle.repeatRules?.[0] ?? '', []);
}

function getEmbeddedToolCopy(destination: PrimaryDestination): {
  title: string;
  description: string;
  rhythm: string;
  tool: string;
  previewTitle: string;
  scheduleLabel: string;
} {
  if (destination === 'calendar') {
    return {
      title: '4주 반복 운동 캘린더',
      description: '같은 영상을 주 3회 반복하는 일정으로 먼저 보여줍니다. 시작일과 요일만 바꾸면 알림에서 실행 방법과 원본 영상 링크를 확인할 수 있습니다.',
      rhythm: '주 3회',
      tool: '캘린더',
      previewTitle: '4주 12회차 미리보기',
      scheduleLabel: '캘린더 일정',
    };
  }
  if (destination === 'hybrid' || destination === 'sheet') {
    return {
      title: '운동표에 이미 들어간 기준',
      description: '영상의 핵심 기준을 이번 주 운동표에 먼저 넣어두고, 사용자는 날짜와 요일만 조정합니다.',
      rhythm: '주 3회',
      tool: '운동표',
      previewTitle: '주간 운동표 미리보기',
      scheduleLabel: '운동표 반영',
    };
  }
  return {
    title: '식사 체크표에 이미 들어간 적용 Flow',
    description: '영상의 원칙을 오늘부터 일별 체크표에 넣어둡니다. 필요하면 적용일과 요일만 가볍게 바꿉니다.',
    rhythm: '매일',
    tool: '체크표',
    previewTitle: '일별 적용 체크표',
    scheduleLabel: '메모 적용',
  };
}

const workoutProgrammingExactVideoSlugs = new Set([
  'real-fitvely-video-bulk-up-method',
  'real-fitvely-video-workout-order',
  'real-fitvely-video-workout-split-science',
]);

function getExactVideoToolCopy(bundle: FlowBundle, destination: PrimaryDestination): ReturnType<typeof getEmbeddedToolCopy> {
  if (destination === 'hybrid' && workoutProgrammingExactVideoSlugs.has(bundle.flow.slug)) {
    return {
      title: '운동 기준 결정표에 들어간 적용 Flow',
      description: '영상의 운동 기준 후보를 먼저 비교하고, 고른 기준만 이번 주 운동표로 옮깁니다.',
      rhythm: '결정 후 적용',
      tool: '결정표+운동표',
      previewTitle: '결정 후 운동표 미리보기',
      scheduleLabel: '선택 기준 반영',
    };
  }

  if (
    destination === 'sheet' &&
    bundle.flow.slug.startsWith('real-fitvely-video-') &&
    bundle.flow.category.includes('다이어트')
  ) {
    return {
      title: '오늘 한 끼 적용 관찰표 Flow',
      description:
        '영상에서 기준 1개를 고른 뒤 다음 식사나 운동 전후 행동에 한 번만 적용하고, 적용 전/후 반응을 관찰표 한 줄에 적습니다.',
      rhythm: '한 번 적용 후 기록',
      tool: '적용 전후 관찰표',
      previewTitle: '오늘 적용 기록 미리보기',
      scheduleLabel: '적용 전후 기록',
    };
  }

  return getEmbeddedToolCopy(destination);
}

const weekdayIndex: Record<string, number> = {
  일: 0,
  월: 1,
  화: 2,
  수: 3,
  목: 4,
  금: 5,
  토: 6,
};
const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];

function getExactVideoSchedule(
  anchor: string,
  weekdays: string[],
  title: string,
  destination: PrimaryDestination,
  scheduleLabel?: string,
  weeks = 1,
): { date: string; day: string; label: string; title: string }[] {
  if (!anchor) return [];

  const start = new Date(anchor);
  if (Number.isNaN(start.getTime())) return [];

  const selected = weekdays.length ? weekdays : ['월', '수', '금'];
  const label = scheduleLabel ?? (
    destination === 'calendar'
      ? '캘린더 일정'
      : destination === 'hybrid' || destination === 'sheet'
        ? '운동표 반영'
        : '메모 적용'
  );

  const selectedDays = new Set(selected.filter((day) => weekdayIndex[day] !== undefined));
  const entries: { date: string; day: string; label: string; title: string }[] = [];

  for (let index = 0; index < weeks * 7; index += 1) {
    const date = addDays(start, index);
    const day = weekdayLabels[date.getDay()];
    if (selectedDays.has(day)) {
      entries.push({
        date: formatDate(date),
        day,
        label,
        title,
      });
    }
  }

  return entries;
}

function getExactToolPreview(
  anchor: string,
  weekdays: string[],
  title: string,
  destination: PrimaryDestination,
  scheduleLabel?: string,
): { date: string; day: string; label: string; title: string }[] {
  if (destination === 'calendar') return getExactVideoSchedule(anchor, weekdays, title, destination, scheduleLabel, 4);
  if (destination !== 'memo') return getExactVideoSchedule(anchor, weekdays, title, destination, scheduleLabel);
  if (!anchor) return [];

  const start = new Date(anchor);
  if (Number.isNaN(start.getTime())) return [];

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const day = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
    return {
      date: formatDate(date),
      day,
      label: '적용 체크',
      title,
    };
  });
}

function itemDate(anchor: string, item: FlowItem) {
  if (!anchor || item.day_offset === undefined) return '';
  return formatDate(addDays(new Date(anchor), item.day_offset));
}

type PublicView = 'list' | 'week' | 'month' | 'recipes';
type AnchorMode = 'custom' | 'example' | 'undecided';

function nextMonday(date: Date): Date {
  const day = date.getDay();
  const add = day === 0 ? 1 : 8 - day;
  return addDays(date, add);
}

function getPreviewAnchor(bundle: FlowBundle, mode: AnchorMode, customAnchor: string): string {
  if (bundle.flow.anchor_type === 'none') return '';
  if (mode === 'custom') return customAnchor;
  if (mode === 'undecided') return '';
  const today = new Date();
  if (bundle.flow.content_type === 'meal_plan') return formatDate(today);
  if (bundle.flow.category.includes('결혼')) return formatDate(addDays(today, 180));
  if (bundle.flow.category.includes('이사')) return formatDate(addDays(today, 30));
  if (bundle.flow.category.includes('여행')) return formatDate(addDays(today, 14));
  if (bundle.flow.structure_type === 'routine') return formatDate(nextMonday(today));
  return formatDate(today);
}

function getAnchorModeLabel(mode: AnchorMode): string {
  if (mode === 'custom') return '내 날짜 기준';
  if (mode === 'undecided') return '날짜 미정';
  return '예시 날짜로 미리보기';
}

function isAnchorMode(value: string): value is AnchorMode {
  return value === 'custom' || value === 'example' || value === 'undecided';
}

function getEarliestOffset(bundle: FlowBundle): number {
  const itemOffsets = bundle.items.map((item) => item.day_offset).filter((value): value is number => value !== undefined);
  const mealOffsets = (bundle.mealSlots ?? []).map((slot) => slot.day_offset);
  return Math.min(0, ...itemOffsets, ...mealOffsets);
}

type ScheduleEntry = {
  id: string;
  title: string;
  section: string;
  timing: string;
  startDate: string;
  endDate?: string;
  durationDays?: number;
  detail?: FlowItemDetail;
  meta?: string;
};

type CalendarEntry = ScheduleEntry & {
  calendarDate: string;
  dayIndex: number;
};

function occurrenceCheckId(id: string, date: string): string {
  return `${id}__${date}`;
}

function isDateBasedFlow(bundle: FlowBundle): boolean {
  return bundle.flow.content_type === 'meal_plan' || bundle.flow.structure_type === 'timeline';
}

function getEntryCheckIds(entry: ScheduleEntry): string[] {
  const duration = Math.max(entry.durationDays ?? 1, 1);
  if (duration <= 1) return [entry.id];
  return Array.from({ length: duration }, (_, index) =>
    occurrenceCheckId(entry.id, formatDate(addDays(new Date(entry.startDate), index))),
  );
}

function getExecutableCheckIds(bundle: FlowBundle, anchor: string): string[] {
  if (isDateBasedFlow(bundle) && anchor) {
    return getScheduleEntries(bundle, anchor).flatMap(getEntryCheckIds);
  }
  if (bundle.flow.content_type === 'meal_plan') return (bundle.mealSlots ?? []).map((slot) => slot.id);
  return bundle.items.map((item) => item.id);
}

function getToggleCheckIds(bundle: FlowBundle, id: string, anchor: string): string[] {
  if (!isDateBasedFlow(bundle) || !anchor) return [id];
  const entry = getScheduleEntries(bundle, anchor).find((item) => item.id === id);
  return entry ? getEntryCheckIds(entry) : [id];
}

function isBaseEntryChecked(bundle: FlowBundle, id: string, anchor: string, checks: Record<string, boolean>): boolean {
  const ids = getToggleCheckIds(bundle, id, anchor);
  return ids.length > 0 && ids.every((checkId) => checks[checkId]);
}

function baseStateId(id: string): string {
  return id.split('__')[0];
}

function isItemStateSkipped(itemStates: Record<string, FlowItemState>, id: string): boolean {
  return Boolean(itemStates[baseStateId(id)]?.skipped);
}

function getPublicViews(bundle: FlowBundle, hasScheduleAnchor = false): { id: PublicView; label: string }[] {
  if (isFitnessExactVideoFlow(bundle)) {
    return [{ id: 'list', label: '실행 항목' }];
  }
  if (bundle.flow.content_type === 'meal_plan') {
    return [
      { id: 'list', label: '전체 할 일' },
      ...(hasScheduleAnchor ? [{ id: 'month' as PublicView, label: '월별 달력' }] : []),
      { id: 'recipes', label: '레시피' },
    ];
  }
  if (bundle.flow.structure_type === 'timeline') {
    return [
      { id: 'list', label: '전체 할 일' },
      ...(hasScheduleAnchor ? [{ id: 'month' as PublicView, label: '월별 달력' }] : []),
    ];
  }
  if (bundle.flow.structure_type === 'routine') {
    return [
      { id: 'list', label: '전체 루틴' },
      ...(hasScheduleAnchor ? [{ id: 'month' as PublicView, label: '월별 달력' }] : []),
    ];
  }
  return [{ id: 'list', label: '전체 할 일' }];
}

function getScheduleEntries(bundle: FlowBundle, anchor: string): ScheduleEntry[] {
  if (!anchor && bundle.flow.structure_type !== 'checklist') return [];
  if (bundle.flow.content_type === 'meal_plan') {
    return (bundle.mealSlots ?? []).map((slot) => {
      const start = addDays(new Date(anchor), slot.day_offset);
      const end = getRangeEnd(start, slot.duration_days);
      return {
        id: slot.id,
        title: slot.menu_title,
        section: getSectionTitleForBundle(bundle, slot.section_id),
        timing: timingLabel(slot.day_offset, slot.duration_days),
        startDate: formatDate(start),
        endDate: formatDate(end),
        durationDays: slot.duration_days,
        meta: slot.new_ingredients.length ? `새 재료: ${slot.new_ingredients.join(', ')}` : undefined,
      };
    });
  }

  return bundle.items
    .filter((item) => item.day_offset !== undefined)
    .map((item) => {
      const start = addDays(new Date(anchor), item.day_offset ?? 0);
      const end = item.duration_days && item.duration_days > 1 ? getRangeEnd(start, item.duration_days) : undefined;
      return {
        id: item.id,
        title: item.title,
        section: getSectionTitleForBundle(bundle, item.section_id),
        timing: timingLabel(item.day_offset, item.duration_days),
        startDate: formatDate(start),
        endDate: end ? formatDate(end) : undefined,
        durationDays: item.duration_days,
        detail: getItemDetail(bundle, item.id),
        meta: item.repeat_rule,
      };
    });
}

function expandCalendarEntries(entries: ScheduleEntry[]): CalendarEntry[] {
  return entries.flatMap((entry) => {
    const duration = Math.max(entry.durationDays ?? 1, 1);
    return Array.from({ length: duration }, (_, index) => {
      const calendarDate = formatDate(addDays(new Date(entry.startDate), index));
      return {
        ...entry,
        id: duration > 1 ? occurrenceCheckId(entry.id, calendarDate) : entry.id,
        calendarDate,
        dayIndex: index + 1,
      };
    });
  });
}

const defaultComparisonCandidates = [
  { id: 'candidate-1', name: '후보 A' },
  { id: 'candidate-2', name: '후보 B' },
];

function ensureComparisonState(state: FlowComparisonState): FlowComparisonState {
  return {
    candidates: state.candidates.length ? state.candidates : defaultComparisonCandidates,
    notes: state.notes ?? {},
  };
}

function updateComparisonCandidateName(state: FlowComparisonState, candidateId: string, name: string): FlowComparisonState {
  const current = ensureComparisonState(state);
  return {
    ...current,
    candidates: current.candidates.map((candidate) => (candidate.id === candidateId ? { ...candidate, name } : candidate)),
  };
}

function updateComparisonNote(state: FlowComparisonState, itemId: string, candidateId: string, note: string): FlowComparisonState {
  const current = ensureComparisonState(state);
  return {
    ...current,
    notes: {
      ...current.notes,
      [itemId]: {
        ...(current.notes[itemId] ?? {}),
        [candidateId]: note,
      },
    },
  };
}

function addComparisonCandidate(state: FlowComparisonState): FlowComparisonState {
  const current = ensureComparisonState(state);
  const nextIndex = current.candidates.length + 1;
  return {
    ...current,
    candidates: [
      ...current.candidates,
      {
        id: `candidate-${Date.now()}-${nextIndex}`,
        name: `후보 ${nextIndex}`,
      },
    ],
  };
}

function TopExecutionPreview({
  bundle,
  anchor,
  weekdays,
  comparisonState,
  onComparisonChange,
}: {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
  comparisonState: FlowComparisonState;
  onComparisonChange: (state: FlowComparisonState) => void;
}) {
  const model = normalizeExecutionModel(bundle);
  const previewItems = getFlowPreviewItems(bundle, 5);

  if (isFitnessExactVideoFlow(bundle)) return null;

  if (model.uxType === 'decision') {
    const criteria = bundle.items;
    const comparison = ensureComparisonState(comparisonState);
    return (
      <section className="my-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-blue-700">현장에서 바로 체크</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {previewItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 inline-block h-4 w-4 rounded border border-gray-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">후보 비교 미리보기</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-950">후보 비교표</h2>
              <p className="mt-1 text-sm text-gray-600">후보별 가격, 상태, 조건을 적어두고 아래 체크리스트로 현장 확인을 이어갑니다.</p>
            </div>
            <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800" onClick={() => onComparisonChange(addComparisonCandidate(comparisonState))}>
              후보 추가
            </button>
          </div>
          <div className="mt-3 overflow-x-auto rounded-md border border-gray-200 bg-white text-sm">
            <div
              className="grid min-w-[760px] bg-gray-50 text-xs font-semibold text-gray-600"
              style={{ gridTemplateColumns: `minmax(220px,1.2fr) repeat(${comparison.candidates.length}, minmax(180px,1fr))` }}
            >
              <span className="px-3 py-2">비교 항목</span>
              {comparison.candidates.map((candidate, index) => (
                <label key={candidate.id} className="px-3 py-2">
                  <span className="sr-only">후보 {index + 1} 이름</span>
                  <input
                    aria-label={`후보 ${index + 1} 이름`}
                    className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-800"
                    value={candidate.name}
                    onChange={(event) => onComparisonChange(updateComparisonCandidateName(comparisonState, candidate.id, event.target.value))}
                  />
                </label>
              ))}
            </div>
            {criteria.map((item) => (
              <div
                key={item.id}
                className="grid min-w-[760px] border-t border-gray-100"
                style={{ gridTemplateColumns: `minmax(220px,1.2fr) repeat(${comparison.candidates.length}, minmax(180px,1fr))` }}
              >
                <span className="px-3 py-3 font-medium text-gray-800">{item.title}</span>
                {comparison.candidates.map((candidate, index) => (
                  <label key={`${item.id}-${candidate.id}`} className="px-3 py-2">
                    <span className="sr-only">{item.title} / 후보 {index + 1} 메모</span>
                    <textarea
                      aria-label={`${item.title} / 후보 ${index + 1} 메모`}
                      className="min-h-16 w-full resize-y rounded border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
                      placeholder="가격, 상태, 조건 메모"
                      value={comparison.notes[item.id]?.[candidate.id] ?? ''}
                      onChange={(event) => onComparisonChange(updateComparisonNote(comparisonState, item.id, candidate.id, event.target.value))}
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (model.uxType === 'routine' || model.uxType === 'program') {
    const repeatLabel = bundle.repeatRules?.[0] ?? '주 3회';
    const selectedWeekdays = getRoutineWeekdayLabels(repeatLabel, weekdays);
    const startDate = anchor || formatDate(nextMonday(new Date()));
    const occurrences = expandRoutineOccurrences({
      startDate,
      repeatLabel,
      weekdays: selectedWeekdays,
      weeks: 2,
    }).slice(0, 6);
    const firstSection = bundle.sections[0];
    const sessionItems = bundle.items.filter((item) => item.section_id === firstSection?.id).slice(0, 5);

    return (
      <section className="my-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-blue-700">반복 달력 미리보기</p>
            <span className="text-xs font-semibold text-gray-500">{selectedWeekdays.join(' · ')} 반복</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {occurrences.map((occurrence) => (
              <div key={`${occurrence.date}-${occurrence.sessionIndex}`} className="rounded-md border border-gray-200 bg-[#FAFAF8] p-3">
                <p className="text-xs font-semibold text-gray-500">{occurrence.weekday}요일</p>
                <p className="mt-1 font-semibold text-gray-950">{occurrence.sessionIndex}회차</p>
                <p className="text-sm text-gray-600">{occurrence.date.slice(5)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-blue-700">한 회차에 하는 일</p>
          <p className="mt-1 text-sm text-gray-500">{firstSection?.title ?? '루틴 항목'}</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {sessionItems.map((item) => (
              <li key={item.id} className="flex gap-2">
                <span className="text-blue-700">•</span>
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  if (model.views.includes('month_calendar')) {
    const entries = anchor ? getScheduleEntries(bundle, anchor).slice(0, 5) : [];
    return (
      <section className="my-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-blue-700">월별 달력 미리보기</p>
          <div className="mt-3 space-y-2">
            {(entries.length ? entries : getFlowPreviewItems(bundle, 5).map((title, index) => ({ id: title, title, startDate: '', timing: `항목 ${index + 1}` }))).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-[#FAFAF8] px-3 py-2 text-sm">
                <span className="font-medium text-gray-800">{entry.title}</span>
                <span className="shrink-0 text-xs font-semibold text-blue-700">{entry.startDate ? entry.startDate.slice(5) : entry.timing}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm font-semibold text-blue-700">실행 리스트 미리보기</p>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {previewItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 inline-block h-4 w-4 rounded border border-gray-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="my-5 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-semibold text-blue-700">실행 리스트 미리보기</p>
      <ul className="mt-3 space-y-2 text-sm text-gray-700">
        {previewItems.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-0.5 inline-block h-4 w-4 rounded border border-gray-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function getSectionTitleForBundle(bundle: FlowBundle, sectionId?: string): string {
  return bundle.sections.find((section) => section.id === sectionId)?.title ?? '';
}

function getWeekKey(date: string): string {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(value, diff);
  return formatDate(monday);
}

function getWeekDays(weekStart: string): string[] {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }, (_, index) => formatDate(addDays(start, index)));
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function getMonthCalendarDays(month: string): (string | null)[] {
  const first = new Date(`${month}-01T00:00:00`);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  const prefix = first.getDay();
  const days: (string | null)[] = Array.from({ length: prefix }, () => null);
  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

function WeekRenderer({
  bundle,
  anchor,
  weekdays,
  checks,
  onToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  if (bundle.flow.structure_type === 'routine') {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-xl font-semibold">주간 루틴</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {(weekdays.length ? weekdays : ['월', '수', '금']).map((day) => (
            <div key={day} className="rounded-md border border-gray-200 p-3">
              <h3 className="font-semibold">{day}요일</h3>
              <div className="mt-3 space-y-2 text-sm">
                {bundle.sections.map((section) => (
                  <div key={section.id}>
                    <p className="font-medium">{section.title}</p>
                    <p className="text-gray-500">{bundle.items.filter((item) => item.section_id === section.id).length}개 동작</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const entries = expandCalendarEntries(getScheduleEntries(bundle, anchor));
  if (!anchor) return <EmptyScheduleMessage />;

  const weeks = Array.from(new Set(entries.map((entry) => getWeekKey(entry.calendarDate)))).sort();
  return (
    <div className="space-y-5">
      {weeks.map((week) => (
        <section key={week} className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{week} 주</h2>
          <div className="mt-4 overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {getWeekDays(week).map((date) => {
                const dayEntries = entries.filter((entry) => entry.calendarDate === date);
                const dayLabel = ['일', '월', '화', '수', '목', '금', '토'][new Date(date).getDay()];
                return (
                  <div key={date} className="min-h-36 rounded-md border border-gray-200 bg-[#FAFAF8] p-2">
                    <p className="text-xs font-semibold text-gray-600">{dayLabel}</p>
                    <p className="text-xs text-gray-500">{date.slice(5)}</p>
                    <div className="mt-2 space-y-2">
                      {dayEntries.map((entry) => (
                        <label key={entry.id} className="block rounded border border-gray-200 bg-white p-2 text-xs leading-4">
                          <span className="mb-1 block font-mono text-blue-700">{entry.timing}</span>
                          <span className="flex items-start gap-1.5 font-semibold">
                            <input className="mt-0.5" type="checkbox" checked={Boolean(checks[entry.id])} onChange={() => onToggle(entry.id)} />
                            <span>{entry.durationDays && entry.durationDays > 1 ? `${entry.title} ${entry.dayIndex}일차` : entry.title}</span>
                          </span>
                          {entry.endDate ? <span className="mt-1 block text-gray-500">~ {entry.endDate}</span> : null}
                          {entry.meta ? <span className="mt-1 block text-gray-600">{entry.meta}</span> : null}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function MonthRenderer({
  bundle,
  anchor,
  checks,
  onToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const entries = expandCalendarEntries(getScheduleEntries(bundle, anchor));
  if (!anchor) return <EmptyScheduleMessage />;

  const months = Array.from(new Set(entries.map((entry) => monthKey(entry.calendarDate)))).sort();
  return (
    <div className="space-y-5">
      {months.map((month) => (
        <section key={month} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold">{month}</h2>
            <p className="text-sm font-semibold text-gray-600">이번 달 핵심 {new Set(entries.filter((entry) => monthKey(entry.calendarDate) === month).map((entry) => entry.id)).size}개</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="rounded-md bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600">
                  {day}
                </div>
              ))}
              {getMonthCalendarDays(month).map((date, index) => {
                const dayEntries = date ? entries.filter((entry) => entry.calendarDate === date) : [];
                return (
                  <div key={`${month}-${index}`} className={`min-h-32 rounded-md border p-2 ${date ? 'border-gray-200 bg-[#FAFAF8]' : 'border-gray-100 bg-gray-50/60'}`}>
                    {date ? <p className="text-xs font-medium text-gray-500">{date.slice(8)}</p> : null}
                    <div className="mt-2 space-y-2">
                      {dayEntries.map((entry) => (
                        <label key={entry.id} className="block rounded border border-gray-200 bg-white p-2 text-xs leading-4">
                          <span className="mb-1 block font-mono text-blue-700">{entry.timing}</span>
                          <span className="flex items-start gap-1.5 font-semibold">
                            <input className="mt-0.5" type="checkbox" checked={Boolean(checks[entry.id])} onChange={() => onToggle(entry.id)} />
                            <span>{entry.durationDays && entry.durationDays > 1 ? `${entry.title} ${entry.dayIndex}일차` : entry.title}</span>
                          </span>
                          {entry.meta ? <span className="mt-1 block text-gray-600">{entry.meta}</span> : null}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function RoutineMonthRenderer({
  bundle,
  anchor,
  weekdays,
}: {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
}) {
  if (!anchor) return <EmptyScheduleMessage />;

  const repeatLabel = bundle.repeatRules?.[0] ?? '주 3회';
  const selectedWeekdays = getRoutineWeekdayLabels(repeatLabel, weekdays);
  const occurrences = expandRoutineOccurrences({
    startDate: anchor,
    repeatLabel,
    weekdays: selectedWeekdays,
    weeks: 4,
  });
  const months = Array.from(new Set(occurrences.map((occurrence) => monthKey(occurrence.date)))).sort();
  const sessionSummary = bundle.sections
    .map((section) => {
      const count = bundle.items.filter((item) => item.section_id === section.id).length;
      return count ? `${section.title} ${count}개` : section.title;
    })
    .slice(0, 2);

  return (
    <div className="space-y-5">
      {months.map((month) => (
        <section key={month} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">{month}</h2>
              <p className="mt-1 text-sm font-semibold text-blue-700">루틴 회차</p>
            </div>
            <p className="text-sm font-semibold text-gray-600">{selectedWeekdays.join(' · ')} 반복</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="grid min-w-[760px] grid-cols-7 gap-2">
              {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="rounded-md bg-gray-50 px-2 py-2 text-center text-xs font-semibold text-gray-600">
                  {day}
                </div>
              ))}
              {getMonthCalendarDays(month).map((date, index) => {
                const occurrence = date ? occurrences.find((item) => item.date === date) : undefined;
                return (
                  <div key={`${month}-${index}`} className={`min-h-32 rounded-md border p-2 ${date ? 'border-gray-200 bg-[#FAFAF8]' : 'border-gray-100 bg-gray-50/60'}`}>
                    {date ? <p className="text-xs font-medium text-gray-500">{date.slice(8)}</p> : null}
                    {occurrence ? (
                      <div className="mt-2 rounded border border-blue-100 bg-white p-2 text-xs leading-4">
                        <p className="font-semibold text-blue-700">{occurrence.sessionIndex}회차</p>
                        <p className="mt-1 font-medium text-gray-800">{toContentDisplayTitle(bundle.flow.title)}</p>
                        {sessionSummary.map((summary) => (
                          <p key={summary} className="mt-1 text-gray-500">{summary}</p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

function RecipeListRenderer({ bundle, anchor }: { bundle: FlowBundle; anchor: string }) {
  return (
    <div className="space-y-4">
      {(bundle.recipes ?? []).map((recipe) => (
        <section key={recipe.id} className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold">{recipe.title}</h2>
          <div className="mt-3">
            <p className="text-sm font-semibold text-gray-600">연결된 식단</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(bundle.mealSlots ?? []).filter((slot) => slot.recipe_id === recipe.id).map((slot) => {
                const start = anchor ? addDays(new Date(anchor), slot.day_offset) : null;
                const end = start ? getRangeEnd(start, slot.duration_days) : null;
                const dateLabel = start && end ? ` / ${formatDate(start)} ~ ${formatDate(end)}` : '';
                return (
                  <span key={slot.id} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                    {timingLabel(slot.day_offset, slot.duration_days)}{dateLabel}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">재료</h3>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {recipe.ingredients.map((ingredient) => <li key={ingredient.name}>{ingredient.name}</li>)}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">조리 방법</h3>
              <ol className="mt-2 list-decimal pl-5 text-sm">
                {recipe.steps.map((step) => <li key={step.order}>{step.text}</li>)}
              </ol>
            </div>
          </div>
          {recipe.caution_note ? <p className="mt-4 text-sm text-red-700"><b>주의:</b> {recipe.caution_note}</p> : null}
        </section>
      ))}
    </div>
  );
}

function EmptyScheduleMessage() {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5 text-sm text-gray-600">
      기준 날짜를 입력하면 주간/월간 보기로 전환됩니다.
    </section>
  );
}

function ItemDetailContent({ detail }: { detail?: FlowItemDetail }) {
  if (!detail?.why && !detail?.how && !detail?.completion_criteria && !detail?.caution && !detail?.links?.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-gray-100 bg-[#FAFAF8] p-3 text-sm">
      <div className="grid gap-3 text-gray-700 md:grid-cols-2">
        {detail.why ? (
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-gray-500"><span aria-hidden="true">?</span> 왜 필요한가</p>
            <p className="mt-1 leading-6">{detail.why}</p>
          </div>
        ) : null}
        {detail.how ? (
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-gray-500"><span aria-hidden="true">→</span> 어떻게 하나요</p>
            <p className="mt-1 leading-6">{detail.how}</p>
          </div>
        ) : null}
        {visibleCompletionCriteria(detail) ? (
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-gray-500"><span aria-hidden="true">✓</span> 완료 조건</p>
            <p className="mt-1 leading-6">{visibleCompletionCriteria(detail)}</p>
          </div>
        ) : null}
        {detail.caution ? (
          <div className="text-amber-800">
            <p className="flex items-center gap-1 text-xs font-semibold"><span aria-hidden="true">!</span> 주의</p>
            <p className="mt-1 leading-6">{detail.caution}</p>
          </div>
        ) : null}
        {detail.links?.length ? (
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-gray-500">바로가기</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.links.map((link) => (
                <a key={`${link.label}-${link.url}`} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700" href={link.url} target="_blank" rel="noreferrer">
                  {linkTypeLabels[link.type] ?? '링크'} · {toUserFacingSourceTitle(link.label)}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailPreview({ detail }: { detail?: FlowItemDetail }) {
  const text = detail?.why ?? detail?.how ?? detail?.caution;
  if (!text) return null;
  return <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{text}</p>;
}

function ItemCardBadges({ badges }: { badges: ActionBadge[] }) {
  const visibleBadges = badges.filter((badge) => !['날짜 고정', '완료 기준', '할 일', '루틴'].includes(badge.label));
  return <ExecutionMetaBadges badges={visibleBadges} />;
}

function ItemMetaText({ parts }: { parts: string[] }) {
  const text = parts.filter(Boolean).join(' · ');
  if (!text) return null;
  return <span className="shrink-0 text-xs font-semibold leading-6 text-gray-500">{text}</span>;
}

function FlowItemCard({
  bundle,
  item,
  anchor,
  checked,
  state,
  onToggle,
  onNoteChange,
  onSkipToggle,
}: {
  bundle: FlowBundle;
  item: FlowItem;
  anchor?: string;
  checked: boolean;
  state?: FlowItemState;
  onToggle: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onSkipToggle: (id: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [memoOpen, setMemoOpen] = useState(false);
  const detail = getItemDetail(bundle, item.id);
  const skipped = Boolean(state?.skipped);
  const date = item.day_offset !== undefined && anchor ? itemDate(anchor, item) : '';
  const timing = item.day_offset !== undefined ? timingLabel(item.day_offset, item.duration_days) : '';
  const repeat = item.repeat_rule && !timing ? item.repeat_rule : '';
  const hasDetail = Boolean(detail?.why || detail?.how || detail?.completion_criteria || detail?.caution || detail?.links?.length);
  const memoButtonLabel = '메모';

  return (
    <div
      data-testid="flow-item-card"
      data-skipped={skipped ? 'true' : 'false'}
      className={`rounded-lg border p-4 transition ${skipped ? 'border-gray-200 bg-gray-50 opacity-75' : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      <div className="flex gap-3">
        <input
          aria-label={`완료: ${item.title}`}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300"
          type="checkbox"
          disabled={skipped}
          checked={checked}
          onChange={() => onToggle(item.id)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className={`text-base font-semibold leading-6 ${skipped ? 'text-gray-400 line-through' : 'text-gray-950'}`}>{item.title}</h3>
            <ItemMetaText parts={[repeat, timing, date]} />
          </div>
          <ItemCardBadges badges={getActionBadges(bundle, item, detail)} />
          <DetailPreview detail={detail} />
        </div>
      </div>

      {skipped ? <p className="mt-2 pl-8 text-xs font-medium text-gray-500">진행률 계산에서 제외 · 다시 포함 가능</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 pl-8">
        <button
          className="text-sm font-semibold text-gray-600 hover:text-blue-700"
          type="button"
          onClick={() => setMemoOpen((value) => !value)}
        >
          <span aria-hidden="true">✎ </span>
          {memoButtonLabel}
        </button>
        <button
          className={`text-sm font-semibold ${skipped ? 'text-gray-700' : 'text-amber-800 hover:text-amber-900'}`}
          type="button"
          aria-pressed={skipped}
          onClick={() => onSkipToggle(item.id)}
        >
          <span aria-hidden="true">− </span>
          {skipped ? '다시 포함' : '해당 없음'}
        </button>
        {hasDetail ? (
          <button
            className="ml-auto text-sm font-semibold text-gray-600 hover:text-blue-700"
            type="button"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((value) => !value)}
          >
            {detailsOpen ? '접기' : '자세히'} <span aria-hidden="true">{detailsOpen ? '↑' : '↓'}</span>
          </button>
        ) : null}
      </div>

      {memoOpen ? (
        <div className="mt-3 pl-8">
          <label className="grid gap-1 text-sm">
            <span className="font-semibold text-gray-700">메모</span>
            <textarea
              aria-label={`${item.title} 메모`}
              className="min-h-20 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm leading-5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              placeholder="예) 우리는 포장이사로 결정됨, 견적은 다음 주 비교"
              value={state?.note ?? ''}
              onChange={(event) => onNoteChange(item.id, event.target.value)}
            />
          </label>
          <p className="mt-1 text-xs font-medium text-gray-500">자동 저장됨 · 이 기기에만 저장</p>
        </div>
      ) : null}

      {detailsOpen ? (
        <div className="pl-8">
          <ItemDetailContent detail={detail} />
        </div>
      ) : null}
    </div>
  );
}

function shouldCollapseSecondaryExecutionSections(bundle: FlowBundle) {
  return (
    bundle.flow.slug === 'diet-habit-2week' ||
    bundle.flow.slug === 'new-car-delivery-check' ||
    bundle.flow.slug === 'used-car-buying-check' ||
    bundle.flow.slug === 'baby-food-menu-recipe'
  );
}

function shouldUseSimplifiedFeedbackLayout(bundle: FlowBundle) {
  return (
    bundle.flow.slug === 'computer-skills-d30-study' ||
    bundle.flow.slug === 'diet-habit-2week' ||
    bundle.flow.slug === 'new-car-delivery-check' ||
    bundle.flow.slug === 'moving-d30-basic' ||
    bundle.flow.slug === 'baby-food-menu-recipe' ||
    bundle.flow.slug === 'washer-tub-clean-monthly' ||
    bundle.flow.slug === 'monstera-care-routine' ||
    bundle.flow.slug === 'water-purifier-filter-cycle' ||
    bundle.flow.slug === 'used-car-buying-check' ||
    bundle.flow.slug === 'passport-renewal-docs' ||
    bundle.flow.slug === 'real-thankyou-bubu-home-workout-starter' ||
    bundle.flow.slug === 'real-fitvely-diet-record-routine' ||
    bundle.flow.slug === 'vehicle-inspection-prep' ||
    bundle.flow.slug === 'real-mofa-overseas-travel-prep' ||
    bundle.flow.slug === 'jeonse-contract-precheck-docs' ||
    bundle.flow.slug === 'elementary-school-entry-d30' ||
    bundle.flow.slug === 'kids-printable-squishy-craft' ||
    bundle.flow.slug === 'remote-help-session-precheck' ||
    bundle.flow.slug === 'fridge-cleanout-weekly-plan'
  );
}

function shouldHideSharedPublicFooter(bundle: FlowBundle) {
  return publicServiceFooterHiddenSlugs.has(bundle.flow.slug);
}

function shouldHideExactVideoExecutionCard(bundle: FlowBundle) {
  return bundle.flow.slug === 'real-thankyou-bubu-home-workout-starter';
}

function FlowExecutionSectionShell({
  section,
  collapsed,
  children,
}: {
  section: FlowSection;
  collapsed: boolean;
  children: ReactNode;
}) {
  if (collapsed) {
    return (
      <>
        <details data-testid="mobile-collapsed-section" id={`section-${section.id}`} className="scroll-mt-6 rounded-lg border border-gray-200 bg-white p-4 md:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <span className="text-base font-semibold text-gray-950">{section.title}</span>
            <span className="shrink-0 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">펼치기</span>
          </summary>
          <div className="mt-4 space-y-3">{children}</div>
        </details>
        <section id={`section-${section.id}`} className="hidden scroll-mt-6 rounded-lg border border-gray-200 bg-white p-5 md:block">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <div className="mt-4 space-y-3">{children}</div>
        </section>
      </>
    );
  }

  return (
    <section id={`section-${section.id}`} className="scroll-mt-6 rounded-lg border border-gray-200 bg-white p-5">
      <h2 className="text-xl font-semibold">{section.title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function getSectionItemIds(bundle: FlowBundle, sectionId: string): string[] {
  if (bundle.flow.content_type === 'meal_plan') {
    return (bundle.mealSlots ?? []).filter((slot) => slot.section_id === sectionId).map((slot) => slot.id);
  }
  return bundle.items.filter((item) => item.section_id === sectionId).map((item) => item.id);
}

function getNextEntries(
  bundle: FlowBundle,
  anchor: string,
  checks: Record<string, boolean>,
  itemStates: Record<string, FlowItemState> = {},
): ScheduleEntry[] {
  const entries = getScheduleEntries(bundle, anchor).filter((entry) => !isItemStateSkipped(itemStates, entry.id) && !isBaseEntryChecked(bundle, entry.id, anchor, checks));
  if (!entries.length && (bundle.flow.structure_type === 'checklist' || bundle.flow.structure_type === 'routine' || bundle.flow.structure_type === 'timeline')) {
    return bundle.items
      .filter((item) => !checks[item.id] && !itemStates[item.id]?.skipped)
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        title: item.title,
        section: getSectionTitleForBundle(bundle, item.section_id),
        timing: bundle.flow.structure_type === 'routine' ? item.repeat_rule ?? '이번 주 루틴' : '',
        startDate: '',
      }));
  }
  return entries
    .sort((a, b) => (a.startDate || '9999').localeCompare(b.startDate || '9999'))
    .slice(0, 3);
}

type ActionBadge = {
  label: string;
  className: string;
};

function hasAttentionRisk(risk?: RiskLevel) {
  return risk === 'medium' || risk === 'medical_sensitive' || risk === 'financial_sensitive';
}

function getDateBoundCount(bundle: FlowBundle) {
  if (bundle.flow.content_type === 'meal_plan') return bundle.mealSlots?.length ?? 0;
  return bundle.items.filter((item) => item.day_offset !== undefined || Boolean(item.repeat_rule)).length;
}

function getAttentionCount(bundle: FlowBundle) {
  if (bundle.flow.warning) return Math.max(1, bundle.items.length || bundle.recipes?.length || 1);
  return bundle.items.filter((item) => {
    const detail = getItemDetail(bundle, item.id);
    return Boolean(detail?.caution) || hasAttentionRisk(item.risk_level);
  }).length;
}

function getExecutionSummary(
  bundle: FlowBundle,
  anchor: string,
  checks: Record<string, boolean>,
  nextEntries: ScheduleEntry[],
  itemStates: Record<string, FlowItemState> = {},
) {
  const executableIds = getExecutableCheckIds(bundle, anchor).filter((id) => !isItemStateSkipped(itemStates, id));
  const fallbackTotal = bundle.flow.content_type === 'meal_plan' ? (bundle.mealSlots ?? []).length : bundle.items.length;
  const total = executableIds.length || fallbackTotal;
  const done = executableIds.filter((id) => checks[id]).length;

  return [
    {
      label: '다음',
      value: nextEntries[0]?.timing || (nextEntries.length ? `${nextEntries.length}개` : '없음'),
    },
    {
      label: '날짜 고정',
      value: `${getDateBoundCount(bundle)}개`,
    },
    {
      label: '확인·주의',
      value: `${getAttentionCount(bundle)}개`,
    },
    {
      label: '완료',
      value: `${done} / ${total}`,
    },
  ];
}

function getActionBadges(bundle: FlowBundle, item: FlowItem, detail?: FlowItemDetail): ActionBadge[] {
  const badges: ActionBadge[] = [];

  if (bundle.flow.structure_type === 'routine' || item.repeat_rule) {
    badges.push({ label: '루틴', className: 'border-red-100 bg-red-50 text-red-700' });
  } else if (item.day_offset !== undefined) {
    badges.push({ label: '날짜 고정', className: 'border-blue-100 bg-blue-50 text-blue-700' });
  } else {
    badges.push({ label: '할 일', className: 'border-gray-200 bg-gray-50 text-gray-700' });
  }

  if (visibleCompletionCriteria(detail)) {
    badges.push({ label: '완료 기준', className: 'border-emerald-100 bg-emerald-50 text-emerald-700' });
  }

  if (detail?.caution || hasAttentionRisk(item.risk_level)) {
    badges.push({ label: '확인·주의', className: 'border-amber-100 bg-amber-50 text-amber-800' });
  }

  if (item.source_type === 'official') {
    badges.push({ label: '공식 확인', className: 'border-teal-100 bg-teal-50 text-teal-700' });
  }

  return badges;
}

function ExecutionMetaBadges({ badges }: { badges: ActionBadge[] }) {
  if (!badges.length) return null;

  return (
    <span className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      {badges.map((badge) => (
        <span key={badge.label} className={`rounded-full border px-2 py-0.5 font-semibold ${badge.className}`}>
          {badge.label}
        </span>
      ))}
    </span>
  );
}

function FlowOverview({
  bundle,
  anchor,
  checks,
  itemStates,
  onToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  onToggle: (id: string) => void;
}) {
  const executableIds = getExecutableCheckIds(bundle, anchor).filter((id) => !isItemStateSkipped(itemStates, id));
  const done = executableIds.filter((id) => checks[id]).length;
  const total = executableIds.length || (bundle.flow.content_type === 'meal_plan' ? bundle.mealSlots?.length ?? 0 : bundle.items.filter((item) => !itemStates[item.id]?.skipped).length);
  const showNext = done > 0 && done < total;
  const nextEntries = showNext ? getNextEntries(bundle, anchor, checks, itemStates) : [];
  const summaryItems = getExecutionSummary(bundle, anchor, checks, nextEntries, itemStates);

  return (
    <section className={`mb-5 grid items-start gap-4 ${showNext ? 'lg:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]' : ''}`}>
      {showNext ? (
      <div className="min-w-0 rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <p className="text-sm font-semibold text-blue-700">다음 행동</p>
        <h2 className="mt-1 text-2xl font-semibold">지금 먼저 체크할 일</h2>
        <p className="mt-1 text-sm text-blue-900/70">가까운 항목을 먼저 처리하고, 날짜 고정·주의 항목은 놓치지 않게 따로 확인하세요.</p>
        <div className="mt-4 border-t border-blue-100 pt-3">
          <p className="text-xs font-semibold text-blue-700">실행 우선순위</p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {summaryItems.map((item) => (
              <div key={item.label} className="border-l border-blue-200 pl-3">
                <p className="text-xs font-medium text-blue-900/60">{item.label}</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-950">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {nextEntries.length ? nextEntries.map((entry, index) => (
            <label key={entry.id} className={`block rounded-lg border bg-white p-3 ${index === 0 ? 'border-blue-300 ring-2 ring-blue-100' : 'border-blue-100'}`}>
              <span className="flex items-start gap-3">
                <input className="mt-1" type="checkbox" checked={isBaseEntryChecked(bundle, entry.id, anchor, checks)} onChange={() => onToggle(entry.id)} />
                <span>
                  {index === 0 ? <span className="mb-1 inline-flex rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">추천 다음 항목</span> : null}
                  <span className="block font-semibold">{entry.title}</span>
                  <span className="mt-1 block text-sm text-gray-500">
                    {[entry.timing, entry.startDate, entry.section].filter(Boolean).join(' · ')}
                  </span>
                </span>
              </span>
            </label>
          )) : (
            <p className="rounded-md bg-white p-3 text-sm text-gray-600">표시할 다음 항목이 없습니다.</p>
          )}
        </div>
      </div>
      ) : null}

      <div className="min-w-0 rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-500">한눈에 보는 전체 루트</p>
            <h2 className="text-xl font-semibold">전체 흐름</h2>
          </div>
          <span className="text-sm text-gray-500">{bundle.sections.length}단계</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {bundle.sections.map((section, index) => {
            const ids = getSectionItemIds(bundle, section.id);
            const done = ids.filter((id) => checks[id]).length;
            const total = ids.length;
            return (
              <a key={section.id} href={`#section-${section.id}`} className="rounded-md border border-gray-200 bg-[#FAFAF8] p-3 hover:border-blue-300">
                <p className="text-xs font-semibold text-blue-700">단계 {index + 1}</p>
                <p className="mt-1 line-clamp-2 font-semibold">{section.title}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full bg-[#2563EB]" style={{ width: total ? `${Math.round((done / total) * 100)}%` : '0%' }} />
                </div>
                <p className="mt-2 text-xs text-gray-500">{done} / {total} 완료</p>
              </a>
            );
          })}
        </div>
      </div>

    </section>
  );
}

function TimelineRenderer({
  bundle,
  anchor,
  checks,
  itemStates,
  onToggle,
  onNoteChange,
  onSkipToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  onToggle: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onSkipToggle: (id: string) => void;
}) {
  const collapseSecondarySections = shouldCollapseSecondaryExecutionSections(bundle);

  return (
    <div className="space-y-5">
      {bundle.sections.map((section, index) => (
        <FlowExecutionSectionShell key={section.id} section={section} collapsed={collapseSecondarySections && index > 0}>
          {bundle.items.filter((item) => item.section_id === section.id).map((item) => (
              <FlowItemCard
                key={item.id}
                bundle={bundle}
                item={item}
                anchor={anchor}
                checked={isBaseEntryChecked(bundle, item.id, anchor, checks)}
                state={itemStates[item.id]}
                onToggle={onToggle}
                onNoteChange={onNoteChange}
                onSkipToggle={onSkipToggle}
              />
          ))}
        </FlowExecutionSectionShell>
      ))}
    </div>
  );
}

function MealPlanRenderer({
  bundle,
  anchor,
  checks,
  onToggle,
  reactionLogs,
  onReactionChange,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
  reactionLogs: Record<string, ReactionLog>;
  onReactionChange: (id: string, patch: ReactionLog) => void;
}) {
  const collapseSecondarySections = shouldCollapseSecondaryExecutionSections(bundle);
  const hideReactionDetails = mealCalendarOnlySlugs.has(bundle.flow.slug);

  return (
    <div className="space-y-5">
      {bundle.sections.map((section, index) => (
        <FlowExecutionSectionShell key={section.id} section={section} collapsed={collapseSecondarySections && index > 0}>
          <div className="space-y-4">
            {(bundle.mealSlots ?? []).filter((slot) => slot.section_id === section.id).map((slot) => {
              const start = anchor ? addDays(new Date(anchor), slot.day_offset) : null;
              const end = start ? getRangeEnd(start, slot.duration_days) : null;
              const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
              return (
                <div key={slot.id} className="rounded-lg border border-gray-200 bg-white p-4">
                  <label className="flex gap-3">
                    <input className="mt-1" type="checkbox" checked={isBaseEntryChecked(bundle, slot.id, anchor, checks)} onChange={() => onToggle(slot.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-amber-50 px-2 py-1 font-mono font-semibold text-amber-700">{timingLabel(slot.day_offset, slot.duration_days)}</span>
                        {start && end ? <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{formatDate(start)} ~ {formatDate(end)}</span> : null}
                      </span>
                      <span className="mt-2 block text-base font-semibold text-gray-950">{slot.menu_title}</span>
                    </span>
                  </label>
                  <p className="mt-2 text-sm text-gray-600">새 재료: {slot.new_ingredients.join(', ')}</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <details data-testid={`recipe-${slot.id}`} className="rounded-md border border-gray-200 p-3">
                      <summary className="cursor-pointer font-semibold">레시피 보기</summary>
                      {recipe ? (
                        <div className="mt-3 space-y-3 text-sm">
                          <div>
                            <h3 className="font-semibold">재료</h3>
                            <ul className="mt-1 list-disc pl-5">
                              {recipe.ingredients.map((ingredient) => (
                                <li key={ingredient.name}>{ingredient.name}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h3 className="font-semibold">조리 방법</h3>
                            <ol className="mt-1 list-decimal pl-5">
                              {recipe.steps.map((step) => (
                                <li key={step.order}>{step.text}</li>
                              ))}
                            </ol>
                          </div>
                          {recipe.texture_note ? <p><b>분량/농도:</b> {recipe.texture_note}</p> : null}
                          {recipe.storage_note ? <p><b>보관:</b> {recipe.storage_note}</p> : null}
                          {recipe.tool_note ? <p><b>도구:</b> {recipe.tool_note}</p> : null}
                          {recipe.caution_note ? <p className="text-red-700"><b>주의:</b> {recipe.caution_note}</p> : null}
                        </div>
                      ) : null}
                    </details>
                    {!hideReactionDetails ? (
                      <details data-testid={`reaction-log-${slot.id}`} className="rounded-md border border-gray-200 p-3">
                        <summary className="cursor-pointer font-semibold">반응 기록</summary>
                        <div className="mt-3 grid gap-2">
                          {reactionFields.map((field) => (
                            <label key={field.key} className="grid gap-1 text-sm">
                              <span>{field.label}</span>
                              <input className="rounded border border-gray-300 px-2 py-1" value={reactionLogs[slot.id]?.[field.key] ?? ''} onChange={(event) => onReactionChange(slot.id, { [field.key]: event.target.value })} />
                            </label>
                          ))}
                        </div>
                      </details>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </FlowExecutionSectionShell>
      ))}
    </div>
  );
}

function ExactVideoToolPreview({
  bundle,
  anchor,
  displayAnchor,
  anchorMode,
  onAnchorModeChange,
  onAnchorChange,
  weekdays,
  onWeekdaysChange,
  destination,
  onCopyText,
  onDownloadExcel,
  onDownloadCalendar,
  onCopyToEditableDraft,
  copyState,
  downloadState,
  calendarState,
}: {
  bundle: FlowBundle;
  anchor: string;
  displayAnchor: string;
  anchorMode: AnchorMode;
  onAnchorModeChange: (value: AnchorMode) => void;
  onAnchorChange: (value: string) => void;
  weekdays: string[];
  onWeekdaysChange: (value: string[]) => void;
  destination: PrimaryDestination;
  onCopyText: () => void;
  onDownloadExcel: () => void;
  onDownloadCalendar: () => void;
  onCopyToEditableDraft: () => void;
  copyState: string;
  downloadState: string;
  calendarState: string;
}) {
  const item = bundle.items[0];
  const copy = getExactVideoToolCopy(bundle, destination);
  const preview = item ? getExactToolPreview(displayAnchor, weekdays, item.title, destination, copy.scheduleLabel) : [];

  return (
    <section aria-label="영상 반복 캘린더 설정" className="my-6 rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="text-sm font-semibold text-blue-700">운동 캘린더</h2>
          <h3 className="mt-1 text-2xl font-semibold text-gray-950">{copy.title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{copy.description}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">추천 리듬: {copy.rhythm}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">{copy.tool}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-start justify-start gap-2 lg:justify-end">
          {bundle.flow.source_url ? (
            <a className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
              영상 열기
            </a>
          ) : null}
          <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={onCopyToEditableDraft}>
            내 버전 만들기
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <section aria-label="이번 주 등록 미리보기" className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-950">{copy.previewTitle}</h3>
              <p className="mt-1 text-sm text-gray-600">미리 들어간 내용을 보고 시작일과 요일만 바꿉니다.</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-gray-700">{preview.length}회차 표시</span>
          </div>
          <ExactToolPreviewGrid entries={preview} destination={destination} />
        </section>

        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-950">시작일</p>
              <div className="mt-2">
                <AnchorInput
                  bundle={bundle}
                  anchor={anchor}
                  displayAnchor={displayAnchor}
                  mode={anchorMode}
                  onModeChange={onAnchorModeChange}
                  onChange={onAnchorChange}
                  weekdays={weekdays}
                  onWeekdaysChange={onWeekdaysChange}
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-950">가져가기</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white" onClick={onDownloadCalendar}>
                  {FLOW_EXPORT_LABELS.calendarFile}
                </button>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={onDownloadExcel}>
                  {FLOW_EXPORT_LABELS.sheetFile}
                </button>
                <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={onCopyText}>
                  {FLOW_EXPORT_LABELS.memoCopy}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                {calendarState ? <span className="text-blue-700">{calendarState}</span> : null}
                {downloadState ? <span className="text-blue-700">{downloadState}</span> : null}
                {copyState ? <span className="text-green-700">{copyState}</span> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ExactToolPreviewGrid({
  entries,
  destination,
}: {
  entries: { date: string; day: string; label: string; title: string }[];
  destination: PrimaryDestination;
}) {
  if (destination === 'memo') {
    return (
      <div className="mt-4">
        <p className="mb-2 text-sm font-semibold text-gray-700">일별 적용 체크표</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {entries.map((entry) => (
            <div key={entry.date} className="rounded-md border border-gray-200 bg-white p-3">
              <p className="text-sm font-semibold text-gray-950">{entry.day}요일</p>
              <p className="mt-1 text-sm text-gray-500">{entry.date}</p>
              <p className="mt-2 text-xs font-medium text-blue-700">{entry.label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-semibold text-gray-700">월간 미리보기</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {entries.map((entry) => (
          <div key={entry.date} className="rounded-md border border-blue-100 bg-white p-3">
            <p className="text-sm font-semibold text-blue-700">{entry.day}요일</p>
            <p className="mt-1 text-lg font-semibold text-gray-950">{entry.date}</p>
            <p className="mt-2 text-sm text-gray-600">{entry.label}</p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-gray-950">{entry.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExactVideoRenderer({
  bundle,
  checks,
  onToggle,
}: {
  bundle: FlowBundle;
  checks: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const item = bundle.items[0];
  const detail = item ? getItemDetail(bundle, item.id) : undefined;

  if (!item) return null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-950">실행 항목</h2>
            <p className="mt-1 text-sm font-semibold text-blue-700">{bundle.sections[0]?.title ?? '오늘 실행'}</p>
          </div>
          {bundle.flow.source_url ? (
            <a className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
              원본 열기
            </a>
          ) : null}
        </div>
        <div className="mt-4 rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
          <label className="flex gap-3">
            <input className="mt-1" type="checkbox" checked={Boolean(checks[item.id])} onChange={() => onToggle(item.id)} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-gray-950">{item.title}</span>
              <DetailPreview detail={detail} />
            </span>
          </label>
          <ItemDetailContent detail={detail} />
        </div>
      </section>
    </div>
  );
}

function RoutineRenderer({
  bundle,
  anchor,
  checks,
  itemStates,
  onToggle,
  weekdays,
  onNoteChange,
  onSkipToggle,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  onToggle: (id: string) => void;
  weekdays: string[];
  onNoteChange: (id: string, note: string) => void;
  onSkipToggle: (id: string) => void;
}) {
  const rules = (bundle.repeatRules ?? []).join(', ') || '주 3회';
  const collapseSecondarySections = shouldCollapseSecondaryExecutionSections(bundle);
  const firstSection = bundle.sections[0];
  const firstItems = firstSection ? bundle.items.filter((item) => item.section_id === firstSection.id).slice(0, 3) : [];
  const showSafetyNote = hasAttentionRisk(bundle.flow.risk_level) || Boolean(bundle.flow.warning);
  const weekdayLabel = getWeekdaySelectionLabel(bundle);
  const setupLabel = bundle.flow.slug.startsWith('real-fitvely-video-') ? '이번 주 적용 설정' : '이번 주 루틴 설정';
  const previewLabel = bundle.flow.slug.startsWith('real-fitvely-video-') ? '첫 적용 미리보기' : '첫 루틴 미리보기';

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-red-100 bg-red-50/50 p-5">
        <p className="text-sm font-semibold text-red-700">{setupLabel}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="border-l border-red-200 pl-3">
            <p className="text-xs font-semibold text-gray-500">시작일</p>
            <p className="mt-1 font-semibold text-gray-950">{anchor || '미입력'}</p>
          </div>
          <div className="border-l border-red-200 pl-3">
            <p className="text-xs font-semibold text-gray-500">{weekdayLabel}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {weekdays.length ? weekdays.map((day) => (
                <span key={day} className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">{day}</span>
              )) : <span className="text-sm text-gray-500">미선택</span>}
            </div>
          </div>
          <div className="border-l border-red-200 pl-3">
            <p className="text-xs font-semibold text-gray-500">반복 규칙</p>
            <p className="mt-1 font-semibold text-gray-950">{rules}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="border-l border-red-200 pl-3">
            <p className="text-sm font-semibold text-gray-700">리셋 규칙</p>
            <p className="mt-1 text-sm leading-6 text-gray-600">놓친 날은 부채로 쌓지 않고 다음 가능한 세션부터 다시 시작합니다.</p>
          </div>
          {showSafetyNote ? (
            <div className="border-l border-amber-200 pl-3">
              <p className="text-sm font-semibold text-gray-700">몸 상태 체크</p>
              <p className="mt-1 text-sm leading-6 text-gray-600">{bundle.flow.warning ?? '통증·어지러움이 있으면 강도를 낮추거나 중단합니다.'}</p>
            </div>
          ) : null}
        </div>
        {firstItems.length ? (
          <div className="mt-4 rounded-lg bg-white p-3">
            <p className="text-sm font-semibold text-gray-700">{previewLabel}</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              {firstItems.map((item) => (
                <li key={item.id}>- {item.title}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
      {bundle.sections.map((section, index) => (
        <FlowExecutionSectionShell key={section.id} section={section} collapsed={collapseSecondarySections && index > 0}>
          {bundle.items.filter((item) => item.section_id === section.id).map((item) => (
              <FlowItemCard
                key={item.id}
                bundle={bundle}
                item={item}
                anchor={anchor}
                checked={Boolean(checks[item.id])}
                state={itemStates[item.id]}
                onToggle={onToggle}
                onNoteChange={onNoteChange}
                onSkipToggle={onSkipToggle}
              />
          ))}
        </FlowExecutionSectionShell>
      ))}
    </div>
  );
}

function ChecklistRenderer({
  bundle,
  checks,
  itemStates,
  onToggle,
  onNoteChange,
  onSkipToggle,
}: {
  bundle: FlowBundle;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  onToggle: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onSkipToggle: (id: string) => void;
}) {
  const collapseSecondarySections = shouldCollapseSecondaryExecutionSections(bundle);

  return (
    <div className="space-y-5">
      {bundle.sections.map((section, index) => (
        <FlowExecutionSectionShell key={section.id} section={section} collapsed={collapseSecondarySections && index > 0}>
          {bundle.items.filter((item) => item.section_id === section.id).map((item) => (
              <FlowItemCard
                key={item.id}
                bundle={bundle}
                item={item}
                checked={Boolean(checks[item.id])}
                state={itemStates[item.id]}
                onToggle={onToggle}
                onNoteChange={onNoteChange}
                onSkipToggle={onSkipToggle}
              />
          ))}
        </FlowExecutionSectionShell>
      ))}
    </div>
  );
}
