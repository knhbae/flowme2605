'use client';

import type { EventClickArg, EventContentArg, EventDropArg, EventMountArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import koLocale from '@fullcalendar/core/locales/ko';
import type { DateClickArg } from '@fullcalendar/interaction';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArtifactWorkbench } from './ArtifactWorkbench';
import { ArtifactPreview } from './ArtifactPreview';
import { MyFlowDataManager } from './MyFlowDataManager';
import { PlatformNav } from './PlatformNav';
import { addDays, formatDate, formatKoreanShortDate, formatLocalDate, getRangeEnd } from '@/lib/flow/date';
import { inferPrimaryDestination } from '@/lib/flow/destination';
import { getRepresentativeFlowSlugs, normalizeExecutionModel, type FlowExportTarget } from '@/lib/flow/execution-model';
import { buildCalendarIcs, buildIcsCalendar, buildText, buildWorkbookSheets, buildXlsxBuffer } from '@/lib/flow/export';
import { FLOW_EXPORT_FEEDBACK, FLOW_EXPORT_LABELS } from '@/lib/flow/export-labels';
import { FLOW_ENTRY_DETAIL_CTA_LABEL, toContentDisplayTitle, toUserFacingMapTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';
import { buildFlowRunHistoryListExportArtifacts, getFlowRunItemStatusLabel } from '@/lib/flow/flow-run-history';
import {
  buildMyFlowStepChecklistText,
  buildMyFlowStepIcs,
  buildMyFlowStepPortableText,
  buildMyFlowStepSheetTsv,
  canBuildMyFlowStepIcs,
  type MyFlowPortableStepExportInput,
} from '@/lib/flow/my-flow-step-export';
import { getSourceFitAudit } from '@/lib/flow/source-fit';
import { getPublicFlowIndexingPolicy } from '@/lib/flow/route-indexing-policy';
import {
  getRuntimeArchivedFlowPolicy,
  isRetiredPersonalCopyBundle,
} from '@/lib/flow/runtime-content-policy';
import { countFlowRunFixedDateOverrides, type FlowRunFixedDatePolicy } from '@/lib/flow/flow-run-reuse';
import {
  buildFlowVersionReview,
  buildFlowVersionReviewPersonalCopy,
  type FlowVersionReview,
  type FlowVersionReviewItem,
  type FlowVersionReviewSelection,
  type FlowVersionReviewSelections,
} from '@/lib/flow/flow-version-review';
import {
  getFlowOccurrenceExecutionRecords,
  getFlowScopedMyFlowPersonalExecutionState,
  getMyFlowDateOverrideKey,
  getMyFlowOccurrenceExecutionStorageKey,
  getStoredMyFlowDateOverrides,
  getStoredMyFlowItemDrafts,
  getStoredMyFlowOccurrenceExecutionRecords,
  rekeyMyFlowAnchorDatedRecord,
  rekeyMyFlowPersonalExecutionStateForAnchor,
  resolveMyFlowEffectiveDate,
  saveStoredMyFlowDateOverrides,
  saveStoredMyFlowItemDrafts,
  saveStoredMyFlowOccurrenceExecutionRecords,
  type StoredMyFlowItemDraft,
} from '@/lib/flow/my-flow-personal-state';
import { expandPersonalDraftCalendarOccurrenceRows } from '@/lib/flow/personal-draft-calendar-occurrence';
import {
  expandSavedRoutineOccurrenceRows,
  type SavedRoutineOccurrenceOrigin,
} from '@/lib/flow/saved-routine-occurrence';
import {
  createPersonalDraftStructuralOverlay,
  createPersonalDraftUserItem,
  deletePersonalDraftStructuralItem,
  isPersonalDraftStructuralEditEligible,
  movePersonalDraftStructuralItem,
  resolvePersonalDraftStructuralItems,
  restorePersonalDraftStructuralItem,
  setPersonalDraftUserItemRecurrence,
  setPersonalDraftUserItemSchedule,
  undoPersonalDraftStructuralDelete,
  type PersonalDraftStructuralUndo,
} from '@/lib/flow/personal-draft-structural-edit';
import {
  buildPersonalDraftProjectionValueOverlays,
  getPersonalDraftProjectionValueKey,
} from '@/lib/flow/personal-draft-projection-state';
import { buildPersonalStructuralListExportArtifacts } from '@/lib/flow/personal-structural-list-export';
import {
  buildPersonalDraftStructuralProjection,
  type PersonalStructuralProjectionResult,
  type PersonalStructuralProjectionRow,
} from '@/lib/flow/personal-structural-projection';
import {
  PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
  PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES,
  PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES,
  isPersonalStructuralIanaTimeZone,
  isPersonalStructuralLocalTime,
  type PersonalStructuralScheduleProjection,
} from '@/lib/flow/personal-structural-schedule';
import {
  PERSONAL_STRUCTURAL_RECURRENCE_MAX_COUNT,
  PERSONAL_STRUCTURAL_RECURRENCE_MAX_INTERVAL,
  PERSONAL_STRUCTURAL_WEEKDAYS,
  type PersonalStructuralRecurrenceEnd,
  type PersonalStructuralRecurrenceRule,
  type PersonalStructuralRepeat,
  type PersonalStructuralWeekday,
} from '@/lib/flow/personal-structural-recurrence';
import {
  transitionPersonalStructuralOccurrenceExecution,
  type PersonalStructuralOccurrenceExecutionRecord,
  type PersonalStructuralOccurrenceExecutionState,
} from '@/lib/flow/personal-structural-occurrence';
import {
  loadOrMigratePersonalStructuralOverlay,
  savePersonalStructuralOverlay,
  type PersonalStructuralExecutionState,
  type PersonalStructuralItemOwnership,
  type PersonalStructuralOverlay,
  type PersonalStructuralSchedule,
} from '@/lib/flow/personal-structural-overlay';
import {
  assessSourceBackedFlowMapUpdate,
  applySourceBackedPersistenceRecordToBundle,
  buildSourceBackedFlowMapAnchorAdjustment,
  buildSourceBackedFlowMapPersonalCopyAdjustment,
  buildSourceBackedFlowMapPersistenceRecordUpdate,
  buildSourceBackedFlowMapPersistenceRecord,
  buildSourceBackedFlowMapSavedSnapshotUpdate,
  buildSourceBackedFlowMapSavedSnapshot,
  buildSourceBackedFlowMapPublishPackage,
  buildSourceBackedFlowMapReviewedVersion,
  getSourceBackedFlowMapDateAnchorCopy,
  getSourceBackedFlowMapQualityDecision,
  getPublicCatalogSourceBackedFlowMaps,
  getSourceBackedHomepageFlowMaps,
  getSourceBackedMyFlowMapForBundle,
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
  mergeSourceBackedMyFlowBundles,
  type SourceBackedFlowMapUpdateAssessment,
  type SourceBackedFlowMapSavedSnapshot,
  type SourceBackedFlowMapPersonalCopyStepOverride,
  type SourceBackedFlowMapPersistenceRecord,
} from '@/lib/flow/source-backed-my-flow';
import { parseTextFlow, serializeTextFlow, timingLabel } from '@/lib/flow/parser';
import { expandRoutineOccurrences, getRoutineWeekdayLabels } from '@/lib/flow/recurrence';
import { buildUrlFirstStartPackage, canonicalizeFlowSourceUrl, lookupUrlOrMemoP0Input, lookupUrlFirstP0Input, type UrlFirstExportMode, type UrlFirstLookupResult } from '@/lib/flow/url-first-lookup';
import {
  isLegacyUrlFirstCandidateStateCopy,
  stripUserFacingInternalLines,
} from '@/lib/flow/user-surface-guardrails';
import {
  buildMemoDraftItemSuggestions,
  buildUrlFirstDraftItemSuggestions,
  buildUrlFirstSupplyCandidateUserSummaryMarkdown,
  buildUrlFirstSupplyCandidate,
  getUrlFirstSupplyCandidateAvailability,
  normalizeUrlFirstSupplyCandidates,
  recordUrlFirstSupplyCandidateLookup,
  removeUrlFirstSupplyCandidate,
  updateUrlFirstSupplyCandidate,
  upsertUrlFirstSupplyCandidate,
  URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY,
  type UrlFirstSupplyCandidate,
  type UrlFirstDraftItemSuggestion,
  type UrlFirstSupplyCandidateLastLookupStatus,
  type UrlFirstSupplyCandidateRemoveResult,
  type UrlFirstSupplyCandidateUpdateInput,
  type UrlFirstSupplyCandidateUpdateResult,
  type UrlFirstSupplyCandidateUpsertResult,
} from '@/lib/flow/url-first-supply-queue';
import {
  clearFlowLocalProgress,
  completeActiveFlowRun,
  type ActiveFlowProgress,
  getBundles,
  getActiveFlowProgress,
  getChecks,
  getCompletedFlowRuns,
  getComparisonState,
  getItemStates,
  getMyFlowCompletionFeedback,
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
  saveMyFlowCompletionFeedback,
  saveMyFlowStepItemChecks,
  saveReactionLogs,
  recordFlowCompletionState,
  saveStoredAnchor,
  saveWorkbenchState,
  startFlowRunFromCompleted,
  type MyFlowCompletionFeedback,
  type MyFlowStepItemChecks,
  type FlowRunItemSnapshot,
  type FlowRunRecord,
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

const calendarFlowMarkerColors = [
  '#1D4ED8',
  '#0F766E',
  '#A16207',
  '#BE185D',
  '#7C3AED',
  '#C2410C',
  '#0369A1',
  '#4D7C0F',
] as const;

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
const publicHeroSetupFlowSlugs = new Set([
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

function getPublicPreSavePreviewCheckboxLabel(label: string) {
  return `저장 전 미리보기 선택: ${label}`;
}

function formatPublicPreSavePreviewProgress(done: number, total: number) {
  return `미리보기 ${done}/${total} 표시`;
}

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
      {flow.source_url ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">원문 연결됨</Badge> : null}
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
    bundle.flow.source_published_at ? `${formatSourcePublishedDate(bundle.flow.source_published_at)} 원문 게시` : null,
    bundle.flow.source_modified_at ? `${formatSourcePublishedDate(bundle.flow.source_modified_at)} 원문 수정` : null,
    bundle.flow.source_checked_at ? `${formatMyFlowDisplayDate(bundle.flow.source_checked_at)} 원문 확인 기록` : null,
    bundle.flow.updated_at ? `${formatMyFlowDisplayDate(formatDate(new Date(bundle.flow.updated_at)))} Flow 정리` : null,
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
  if (bundle.flow.source_status === 'real' && bundle.flow.source_checked_at) return '원문 연결';
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

function escapeRegexValue(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getBundleSourceDisplaySignals(bundle: FlowBundle): string[] {
  const signals = new Set<string>();
  const sourceTitleToken = bundle.flow.source_title?.trim().match(/^([A-Za-z][A-Za-z0-9._-]{1,40})(?=\s|["'@]|$)/u)?.[1];
  if (sourceTitleToken) signals.add(sourceTitleToken);
  const sourceTitleAcronym = bundle.flow.source_title?.match(/\(([A-Z][A-Z0-9]{1,20})\)/u)?.[1];
  if (sourceTitleAcronym) signals.add(sourceTitleAcronym);

  if (bundle.flow.source_url) {
    try {
      const host = new URL(bundle.flow.source_url).hostname.replace(/^www\./i, '');
      const primaryHostToken = host.split('.')[0];
      if (/^[A-Za-z][A-Za-z0-9-]{1,40}$/u.test(primaryHostToken)) signals.add(primaryHostToken);
    } catch {
      // Ignore malformed source URLs in old local drafts.
    }
  }

  return Array.from(signals).sort((a, b) => b.length - a.length);
}

function getUserFacingFlowResultText(bundle: FlowBundle): string {
  const original = getFlowResultText(bundle).trim();
  const sanitized = getBundleSourceDisplaySignals(bundle).reduce((value, signal) => {
    return value.replace(new RegExp(`^${escapeRegexValue(signal)}\\s*`, 'iu'), '').trim();
  }, original);
  return sanitized || original;
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
  return (bundle.flow.tags ?? []).filter(
    (tag) => !/source[-_\s]*backed|^recommended-flow:|^source[-_]?import|needs[_-]?review|source[-_]?trace/i.test(tag),
  );
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
  titleHref,
  primaryHref,
  primaryLabel,
  primaryTestId,
  onCopy,
}: {
  bundle: FlowBundle;
  variant?: 'default' | 'compact' | 'profile';
  editable?: boolean;
  titleHref?: string;
  primaryHref?: string;
  primaryLabel?: string;
  primaryTestId?: string;
  onCopy?: (bundle: FlowBundle) => void;
}) {
  const displayTitle = toContentDisplayTitle(bundle.flow.title);
  const count = getFlowItemCount(bundle);
  const color = categoryColors[bundle.flow.category] ?? '#6B7280';
  const previewItems = getFlowPreviewItems(bundle, variant === 'compact' ? 3 : 4);
  const isProfileVariant = variant === 'profile';
  const cardTitleHref = titleHref ?? `/f/${bundle.flow.slug}`;
  const cardPrimaryHref = primaryHref ?? `/f/${bundle.flow.slug}`;
  const cardPrimaryLabel = primaryLabel ?? '시작하기';

  return (
    <article className={`flex h-full flex-col justify-between rounded-lg border border-gray-200 bg-white shadow-sm ${isProfileVariant ? 'p-4' : 'p-5'}`}>
      <div className={isProfileVariant ? 'space-y-3' : 'space-y-4'}>
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
            <Link className="underline-offset-4 hover:text-blue-700 hover:underline" href={cardTitleHref}>
              {displayTitle}
            </Link>
          </h2>
          <p className={`mt-2 text-sm leading-6 text-gray-600 ${isProfileVariant ? 'line-clamp-2' : 'line-clamp-3'}`}>{getUserFacingFlowResultText(bundle)}</p>
          {isProfileVariant ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
              <span>{count}개 항목</span>
              <span aria-hidden="true">·</span>
              <span>{getPreviewTypeLabel(bundle)}</span>
            </div>
          ) : (
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
          )}
        </div>
        {!isProfileVariant ? <div className="flex flex-wrap gap-1">
          {getFlowTags(bundle).slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600">
              #{tag}
            </span>
          ))}
        </div> : null}
        {!isProfileVariant ? <div className="rounded-md border border-gray-100 bg-[#FAFAF8] p-3">
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
        </div> : null}
        {variant === 'default' ? <p className="text-sm font-medium text-gray-600">{getAnchorLabel(bundle)}</p> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          data-testid={primaryTestId}
          className="rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white"
          href={cardPrimaryHref}
        >
          {cardPrimaryLabel}
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
      data-map-id={item.id}
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
  return serviceCatalogFlowSlugs.has(bundle.flow.slug) && getPublicFlowIndexingPolicy(bundle).indexable;
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
    saveBundles(next);
    setBundles(next);
  };

  return { bundles, persist };
}

type UrlFirstDraftFlowInput = {
  flowTitle: string;
  anchorDate: string;
  items: UrlFirstDraftItemSuggestion[];
};

type UrlFirstDraftFlowSaveResult = {
  saved: boolean;
  slug?: string;
  targetHref?: string;
  error?: string;
  reused?: boolean;
};

type UrlFirstDraftFlowPackage = {
  bundle: FlowBundle;
  anchor?: string;
  itemStates: Record<string, FlowItemState>;
};

type PersonalDraftFlowSource =
  | {
      kind: 'url';
      originalUrl: string;
      defaultTitle: string;
      suggestions: UrlFirstDraftItemSuggestion[];
    }
  | {
      kind: 'memo';
      memo: string;
      defaultTitle: string;
      suggestions: UrlFirstDraftItemSuggestion[];
    };

function normalizeDraftText(value: string, fallback: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function createDraftFlowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return `flow-${crypto.randomUUID()}`;
  return `flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPersonalMemoDraftBundle(bundle: FlowBundle): boolean {
  return bundle.flow.status === 'draft' && bundle.flow.slug.startsWith('url-draft-') && bundle.flow.source_title === '내 메모';
}

function createPersonalDraftFlowPackage(source: PersonalDraftFlowSource, input: UrlFirstDraftFlowInput): UrlFirstDraftFlowPackage {
  const now = new Date().toISOString();
  const id = createDraftFlowId();
  const slug = `url-draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const sectionId = `${id}-draft-section`;
  const sectionTitle = source.kind === 'memo' ? '메모에서 나눈 할 일' : '손볼 초안 항목';
  const title = normalizeDraftText(input.flowTitle, source.defaultTitle);
  const anchor = isIsoDateString(input.anchorDate) ? input.anchorDate : undefined;
  const suggestions = (input.items.length > 0 ? input.items : source.suggestions).slice(0, 7);
  const items = suggestions.map<FlowItem>((suggestion, index) => {
    const dayOffset = source.kind === 'memo' ? (index === 0 ? 0 : undefined) : suggestion.dayOffset;
    return {
      id: `${id}-draft-item-${index + 1}`,
      flow_id: id,
      section_id: sectionId,
      title: normalizeDraftText(suggestion.title, `${title} 할 일 ${index + 1}`),
      ...(suggestion.memo.trim() ? { description: suggestion.memo.trim() } : {}),
      type: anchor && dayOffset !== undefined ? 'calendar' : 'todo',
      ...(dayOffset !== undefined ? { day_offset: dayOffset } : {}),
      duration_days: 1,
      source_type: source.kind === 'memo' ? 'creator_experience' : 'reference',
      risk_level: 'low',
      order: index,
    };
  });

  return {
    bundle: {
      flow: {
        id,
        slug,
        title,
        description: source.kind === 'memo' ? '내가 붙여넣은 메모에서 직접 손볼 할 일을 나눈 개인 초안입니다.' : '내가 남긴 제목과 메모를 바탕으로 제안한 초안입니다.',
        category: '내 초안',
        structure_type: 'checklist',
        content_type: 'default',
        anchor_type: anchor ? 'start_date' : 'none',
        status: 'draft',
        source_title: source.kind === 'memo' ? '내 메모' : '사용자가 넣은 링크',
        ...(source.kind === 'url' ? { source_url: source.originalUrl } : {}),
        source_status: 'preview',
        source_precision: 'broad',
        primary_destination: anchor ? 'calendar' : 'hybrid',
        owner_user_id: getCurrentUser().id,
        creator_name: getCurrentUser().name,
        creator_role: getCurrentUser().role,
        creator_note: getCurrentUser().bio,
        usage_count: 0,
        copy_count: 0,
        tags: source.kind === 'memo' ? ['내 초안', '내 메모'] : ['내 초안'],
        raw_text: `# ${title}\n\n## ${sectionTitle}\n${items.map((item) => `- ${item.title}${item.description ? `\n  메모: ${item.description}` : ''}`).join('\n')}${source.kind === 'memo' ? `\n\n## 처음 붙여넣은 메모\n${source.memo.trim()}` : ''}`,
        created_at: now,
        updated_at: now,
      },
      sections: [
        {
          id: sectionId,
          flow_id: id,
          title: sectionTitle,
          order: 0,
        },
      ],
      items,
      itemDetails:
        source.kind === 'url'
          ? items.map((item) => ({
              item_id: item.id,
              links: [
                {
                  label: '원문 링크',
                  url: source.originalUrl,
                  type: 'reference' as const,
                },
              ],
            }))
          : [],
      warnings: [],
    },
    ...(anchor ? { anchor } : {}),
    itemStates: {},
  };
}

function createUrlFirstDraftFlowPackage(candidate: UrlFirstSupplyCandidate, input: UrlFirstDraftFlowInput): UrlFirstDraftFlowPackage {
  return createPersonalDraftFlowPackage(
    {
      kind: 'url',
      originalUrl: candidate.originalUrl,
      defaultTitle: `${getUrlSupplyCandidateDisplayTitle(candidate)} 초안`,
      suggestions: buildUrlFirstDraftItemSuggestions(candidate),
    },
    input,
  );
}

function createMemoDraftFlowPackage(memo: string, input: UrlFirstDraftFlowInput): UrlFirstDraftFlowPackage {
  return createPersonalDraftFlowPackage(
    {
      kind: 'memo',
      memo,
      defaultTitle: '내 메모 초안',
      suggestions: buildMemoDraftItemSuggestions(memo),
    },
    input,
  );
}

function findExistingUrlFirstDraftBundle(
  bundles: FlowBundle[],
  candidate: UrlFirstSupplyCandidate,
): FlowBundle | undefined {
  return bundles.find((bundle) => {
    if (bundle.flow.status !== 'draft' || !bundle.flow.slug.startsWith('url-draft-') || !bundle.flow.source_url) return false;
    try {
      return canonicalizeFlowSourceUrl(bundle.flow.source_url) === candidate.canonicalUrl;
    } catch {
      return bundle.flow.source_url === candidate.originalUrl;
    }
  });
}

const urlFirstExportModeLabels: Record<UrlFirstExportMode, string> = {
  calendar: '캘린더',
  markdown: '메모 문서',
  checklist: '체크리스트',
};

function getUrlLookupStatusLabel(result: UrlFirstLookupResult): string {
  if (result.gate?.kind === 'source_rows') return '자료 확인 필요';
  if (result.gate?.kind === 'medical_source_fit') return '시작 전 확인';
  if (result.status === 'hit' && result.sourceStatus === 'needs_review') return '원문 확인 필요';
  if (result.status === 'hit') return '기존 콘텐츠';
  if (result.status === 'needs_review') return '원문 확인 필요';
  if (result.status === 'memo_draft') return '내 메모';
  return '준비된 Flow 없음';
}

function getUrlSupplyCandidateStatusLabel(candidate: UrlFirstSupplyCandidate): string {
  return candidate.status === 'needs_review_request' ? '원문 확인' : '내 초안';
}

function getUrlSupplyCandidateAvailabilityLabel(candidate: UrlFirstSupplyCandidate): string {
  const availability = getUrlFirstSupplyCandidateAvailability(candidate);
  if (availability.state === 'executable') return '이제 실행 가능';
  if (availability.state === 'needs_review') return '원문 확인 중';
  return '초안 준비 중';
}

function getUrlFirstLookupHistoryStatusLabel(status: UrlFirstSupplyCandidateLastLookupStatus): string {
  if (status === 'hit') return '저장 가능한 Flow 있음';
  if (status === 'needs_review') return '원문 확인 중';
  if (status === 'miss') return '아직 준비 전';
  return '메모 상태';
}

function getUrlSupplyCandidateLastLookupLabel(candidate: UrlFirstSupplyCandidate): string {
  if (!candidate.lastLookup) return '아직 다시 확인하지 않음';
  return `${formatKoreanShortDate(candidate.lastLookup.checkedAt)} · ${getUrlFirstLookupHistoryStatusLabel(candidate.lastLookup.status)}`;
}

function getUrlSupplyCandidateDisplayTitle(candidate: UrlFirstSupplyCandidate): string {
  const availability = getUrlFirstSupplyCandidateAvailability(candidate);
  if (availability.state === 'executable' && isLegacyUrlFirstCandidateStateCopy(candidate.title)) {
    return '이미 준비된 Flow가 있어요';
  }
  return candidate.title;
}

function getUrlSupplyCandidateDisplayMemo(candidate: UrlFirstSupplyCandidate): string {
  if (isLegacyUrlFirstCandidateStateCopy(candidate.memo)) return '';
  return candidate.memo;
}

function getMemoDraftDefaultTitle(input: string): string {
  const firstLine = input
    .replace(/\r/gu, '\n')
    .split(/\n+|[.!?;]+/u)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/u, '').replace(/\s+/gu, ' ').trim())
    .find(Boolean);
  if (!firstLine) return '내 메모 초안';
  return firstLine.length > 38 ? `${firstLine.slice(0, 38).trim()}…` : firstLine;
}

function FlowMemoDraftPanel({
  memo,
  onSaveDraftFlow,
}: {
  memo: string;
  onSaveDraftFlow: (memo: string, input: UrlFirstDraftFlowInput) => UrlFirstDraftFlowSaveResult;
}) {
  const memoItems = useMemo(() => buildMemoDraftItemSuggestions(memo), [memo]);
  const [draftTitle, setDraftTitle] = useState(() => getMemoDraftDefaultTitle(memo));
  const [draftAnchorDate, setDraftAnchorDate] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    setDraftTitle(getMemoDraftDefaultTitle(memo));
    setDraftAnchorDate('');
    setFeedback('');
  }, [memo]);

  const saveDraftFlow = () => {
    const saved = onSaveDraftFlow(memo, {
      flowTitle: draftTitle,
      anchorDate: draftAnchorDate,
      items: memoItems,
    });
    if (!saved.saved) {
      setFeedback(saved.error ?? '메모 초안을 저장하지 못했습니다.');
      return;
    }
    setFeedback('내 Flow에 메모 초안 저장됨');
    if (typeof window !== 'undefined') window.location.href = saved.targetHref ?? '/my';
  };

  return (
    <form
      data-testid="flow-memo-draft-editor"
      className="mt-3 grid gap-3 md:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        saveDraftFlow();
      }}
    >
      <div className="md:col-span-2">
        <p className="text-xs font-semibold text-[#176D5D]">내 메모에서 시작</p>
        <p className="mt-1 break-keep text-xs font-semibold leading-5 text-[#6E6B64]">
          자동으로 내용을 덧붙이지 않고, 내가 쓴 문장만 할 일로 나눴어요.
        </p>
      </div>
      <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
        초안 제목
        <input
          data-testid="flow-memo-draft-flow-title"
          aria-label="메모 초안 제목"
          className="min-h-10 rounded-lg border border-[#C9DBC4] bg-[#FAFAF8] px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
          value={draftTitle}
          maxLength={80}
          onChange={(event) => setDraftTitle(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
        첫 할 일 날짜 <span className="font-medium text-[#8A857B]">선택</span>
        <input
          data-testid="flow-memo-draft-anchor-date"
          aria-label="메모 초안 첫 할 일 날짜"
          className="min-h-10 rounded-lg border border-[#C9DBC4] bg-[#FAFAF8] px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
          type="date"
          value={draftAnchorDate}
          onChange={(event) => setDraftAnchorDate(event.target.value)}
        />
        <span className="break-keep text-[11px] font-semibold leading-5 text-[#6E6B64]">
          첫 번째 할 일만 캘린더에 넣습니다. 나머지는 저장 후 필요한 날짜만 정할 수 있어요.
        </span>
      </label>
      <div data-testid="flow-memo-draft-suggestion-list" className="grid gap-2 rounded-lg bg-[#F7FBF4] p-2.5 md:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-[#176D5D]">메모에서 나눈 할 일</p>
          <span className="text-[11px] font-semibold text-[#8A857B]">{memoItems.length}개 · 저장 후 수정 가능</span>
        </div>
        <ol className="grid gap-1.5">
          {memoItems.map((item, index) => (
            <li
              key={`memo-draft-suggestion-${index}`}
              data-testid="flow-memo-draft-item"
              className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 rounded-md bg-white px-2.5 py-2"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F2ED] text-[11px] font-semibold text-[#176D5D]">{index + 1}</span>
              <div className="min-w-0">
                <p className="break-keep text-xs font-semibold leading-5 text-[#1B1A17]">{item.title}</p>
                <p className="mt-0.5 break-keep text-[11px] font-semibold leading-5 text-[#6E6B64]">
                  {draftAnchorDate
                    ? index === 0
                      ? formatKoreanShortDate(new Date(draftAnchorDate), { includeWeekday: true })
                      : '날짜 없음 · 저장 후 필요할 때 추가'
                    : '날짜 미정'}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:col-span-2">
        <button
          type="submit"
          data-testid="flow-memo-draft-save"
          className="min-h-10 rounded-lg bg-[#176D5D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#115246]"
        >
          내 Flow에 초안 저장
        </button>
        <span className="text-xs font-semibold text-[#6E6B64]">공개되지 않는 개인 초안입니다</span>
      </div>
      {feedback ? <p role="status" className="text-xs font-semibold text-[#3654FF] md:col-span-2">{feedback}</p> : null}
    </form>
  );
}

function FlowUrlLookupResult({
  result,
  supplyCandidates,
  onSaveSupplyCandidate,
  onSaveMemoDraftFlow,
}: {
  result: UrlFirstLookupResult;
  supplyCandidates: UrlFirstSupplyCandidate[];
  onSaveSupplyCandidate: (candidate: UrlFirstSupplyCandidate) => UrlFirstSupplyCandidateUpsertResult;
  onSaveMemoDraftFlow: (memo: string, input: UrlFirstDraftFlowInput) => UrlFirstDraftFlowSaveResult;
}) {
  const needsSourceRows = result.gate?.kind === 'source_rows';
  const needsMedicalSourceFit = result.gate?.kind === 'medical_source_fit';
  const primaryActionLabel = result.status === 'hit' && result.canSaveToMyFlow
    ? '저장 전 보기'
    : result.saveMode === 'blocked'
      ? needsSourceRows
        ? '원문 자료 보기'
        : needsMedicalSourceFit
          ? '시작 전 확인'
        : '최신 내용 확인'
      : result.routeHref
        ? '미리보기 열기'
        : '초안 요청 가능';
  const exportModes = result.exportModes.map((mode) => urlFirstExportModeLabels[mode]);
  const sourceBackedStartPackage = useMemo(
    () => (result.flowMapId ? buildSourceBackedFlowMapPublishPackage(result.flowMapId) : undefined),
    [result.flowMapId],
  );
  const dateAnchorCopy = useMemo(() => getSourceBackedFlowMapDateAnchorCopy(sourceBackedStartPackage), [sourceBackedStartPackage]);
  const stepOptions = useMemo(
    () =>
      sourceBackedStartPackage?.public.childFlows.flatMap((flow) =>
        flow.steps.map((step) => ({
          id: step.id,
          title: step.title,
          flowSlug: flow.slug,
          flowTitle: flow.title,
        })),
      ) ?? [],
    [sourceBackedStartPackage],
  );
  const defaultSavedTitle = sourceBackedStartPackage?.map.title ?? result.title;
  const stepOptionKey = stepOptions.map((step) => step.id).join('|');
  const [startDate, setStartDate] = useState('');
  const [selectedExportMode, setSelectedExportMode] = useState<UrlFirstExportMode>('calendar');
  const [startMode, setStartMode] = useState<'direct' | 'custom'>('direct');
  const [customTitle, setCustomTitle] = useState(defaultSavedTitle);
  const [includedStepIds, setIncludedStepIds] = useState<string[]>(() => stepOptions.map((step) => step.id));
  const [startFeedback, setStartFeedback] = useState('');
  const existingSupplyCandidate = result.canonicalUrl ? supplyCandidates.find((candidate) => candidate.canonicalUrl === result.canonicalUrl) : undefined;
  const [candidateTitle, setCandidateTitle] = useState('');
  const [candidateMemo, setCandidateMemo] = useState('');
  const [candidateFeedback, setCandidateFeedback] = useState('');
  const canStart = result.status === 'hit' && result.canSaveToMyFlow;
  const canRequestSupplyCandidate = result.status === 'miss' || (result.status === 'needs_review' && result.saveMode !== 'blocked');

  useEffect(() => {
    setStartDate('');
    setSelectedExportMode('calendar');
    setStartMode('direct');
    setCustomTitle(defaultSavedTitle);
    setIncludedStepIds(stepOptions.map((step) => step.id));
    setStartFeedback('');
    setCandidateTitle(existingSupplyCandidate?.title ?? '');
    setCandidateMemo(existingSupplyCandidate?.memo ?? '');
    setCandidateFeedback('');
  }, [result.canonicalUrl, result.flowMapId, result.flowSlug, defaultSavedTitle, stepOptionKey, existingSupplyCandidate?.title, existingSupplyCandidate?.memo]);

  const buildStartPackage = () =>
    buildUrlFirstStartPackage(result, {
      startDate,
      exportMode: selectedExportMode,
      ...(startMode === 'custom' ? { customTitle, includedStepIds } : {}),
    });

  const downloadMarkdownExport = () => {
    const startPackage = buildStartPackage();
    if (startPackage.status !== 'ready' || !startPackage.markdownExport) {
      setStartFeedback(startPackage.gate?.reason ?? '시작일을 먼저 입력해 주세요.');
      return;
    }

    const blob = new Blob([startPackage.markdownExport.content], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = startPackage.markdownExport.filename;
    link.click();
    URL.revokeObjectURL(url);
    setStartFeedback(`${urlFirstExportModeLabels.markdown} 받음`);
  };

  const startFlowFromLookup = () => {
    const startPackage = buildStartPackage();
    if (startPackage.status !== 'ready') {
      setStartFeedback(startPackage.gate?.reason ?? '시작일을 먼저 입력해 주세요.');
      return;
    }

    startPackage.savedFlows.forEach((flow) => {
      saveFlowRecord(flow.slug, {
        selectedArtifactMode: flow.selectedArtifactMode,
        ...(flow.anchor ? { anchor: flow.anchor } : {}),
      });
      if (flow.anchor) saveStoredAnchor(flow.slug, { mode: 'custom', anchor: flow.anchor });
    });
    Object.entries(startPackage.itemStatesByFlowSlug ?? {}).forEach(([slug, itemStates]) => {
      saveItemStates(slug, {
        ...getItemStates(slug),
        ...itemStates,
      });
    });
    if (startPackage.flowMapId && startPackage.savedMapSnapshot) {
      window.localStorage.setItem(getSourceBackedFlowMapSnapshotStorageKey(startPackage.flowMapId), JSON.stringify(startPackage.savedMapSnapshot));
    }
    if (startPackage.flowMapId && startPackage.persistenceRecord) {
      window.localStorage.setItem(getSourceBackedFlowMapPersistenceStorageKey(startPackage.flowMapId), JSON.stringify(startPackage.persistenceRecord));
    }
    window.location.href = startPackage.targetHref ?? '/my';
  };

  const saveSupplyCandidate = () => {
    const candidate = buildUrlFirstSupplyCandidate(result, {
      title: candidateTitle,
      memo: candidateMemo,
    });
    if (!candidate) {
      setCandidateFeedback('저장할 URL 후보를 확인해 주세요.');
      return;
    }
    const upserted = onSaveSupplyCandidate(candidate);
    setCandidateTitle(upserted.candidate.title);
    setCandidateMemo(upserted.candidate.memo);
    setCandidateFeedback(upserted.created ? '초안 준비를 저장했어요' : '이미 저장한 초안이에요');
  };

  return (
    <section
      data-testid="flow-url-lookup-result"
      className="mt-3 border-t border-[#DDE6D8] pt-3 text-sm text-[#1B1A17]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#BFD9B8] bg-white px-2.5 py-1 text-xs font-semibold text-[#176D5D]">
          {getUrlLookupStatusLabel(result)}
        </span>
        {result.status === 'hit' || result.status === 'needs_review' ? (
          <span className="text-xs font-semibold text-[#6E6B64]">이미 만든 준비가 있는지 먼저 찾아봤어요</span>
        ) : null}
      </div>
      <h2 className="mt-2 break-keep text-lg font-semibold leading-snug text-[#1B1A17]">{result.title}</h2>
      <p className="mt-1 break-keep leading-6 text-[#5F6A5A]">{result.summary}</p>

      {result.status === 'memo_draft' ? <FlowMemoDraftPanel memo={result.input} onSaveDraftFlow={onSaveMemoDraftFlow} /> : null}

      {result.status !== 'miss' && result.status !== 'memo_draft' ? <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#6E6B64]">
            {result.saveMode === 'blocked' ? '현재 확인할 수 있는 것' : '옮길 수 있는 형태'}
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {result.saveMode === 'blocked' ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#8A6B18]">{needsSourceRows ? '원문 자료' : needsMedicalSourceFit ? '참고 원문' : '공식 원문'}</span>
            ) : exportModes.length > 0 ? (
              exportModes.map((label) => (
                <span key={label} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#3654FF]">
                  {label}
                </span>
              ))
            ) : (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#8A6B18]">확인 후 열기</span>
            )}
            {result.canSaveToMyFlow ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#176D5D]">내 Flow</span>
            ) : result.saveMode === 'blocked' ? (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#8A6B18]">새 저장 중지</span>
            ) : (
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-[#8A6B18]">저장 대기</span>
            )}
          </div>
          <p className="mt-2 line-clamp-1 text-xs font-semibold text-[#6E6B64]">
            {result.preview.myFlow[0] ?? '저장 후 이어서 실행할 수 있습니다.'}
          </p>
        </div>
        {result.routeHref ? (
          <Link
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#1B1A17] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2F2D29]"
            href={result.routeHref}
          >
            {primaryActionLabel}
          </Link>
        ) : (
          <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#E7E4DD] bg-white px-4 py-2 text-sm font-semibold text-[#6E6B64]">
            {primaryActionLabel}
          </span>
        )}
      </div> : null}

      {canStart ? (
        <div data-testid="flow-url-start-panel" className="mt-3 grid gap-3 rounded-xl border border-[#DDE6D8] bg-white p-3 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,0.8fr)_auto] sm:items-end">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F7FBF4] p-1 sm:col-span-3" aria-label="시작 방식">
            {[
              { mode: 'direct' as const, label: '그대로 시작' },
              { mode: 'custom' as const, label: '조금 고쳐 시작' },
            ].map((item) => (
              <button
                key={item.mode}
                type="button"
                data-testid={`flow-url-start-mode-${item.mode}`}
                aria-pressed={startMode === item.mode}
                className={`min-h-9 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
                  startMode === item.mode ? 'bg-[#176D5D] text-white shadow-sm' : 'text-[#176D5D] hover:bg-white'
                }`}
                onClick={() => {
                  setStartMode(item.mode);
                  setStartFeedback('');
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          {startMode === 'custom' ? (
            <div data-testid="flow-url-custom-start-panel" className="grid gap-3 rounded-lg border border-[#E7E4DD] bg-[#FAFAF8] p-3 sm:col-span-3">
              <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
                저장 이름
                <input
                  aria-label="저장 이름"
                  className="min-h-10 rounded-lg border border-[#C9DBC4] bg-white px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
                  value={customTitle}
                  maxLength={80}
                  onChange={(event) => {
                    setCustomTitle(event.target.value);
                    setStartFeedback('');
                  }}
                />
              </label>
              {stepOptions.length > 0 ? (
                <fieldset className="grid gap-2">
                  <legend className="text-xs font-semibold text-[#176D5D]">포함할 항목</legend>
                  <div className="grid max-h-56 gap-1.5 overflow-auto pr-1 sm:grid-cols-2">
                    {stepOptions.map((step) => {
                      const checked = includedStepIds.includes(step.id);
                      return (
                        <label key={step.id} className="flex min-h-10 items-start gap-2 rounded-md bg-white px-2.5 py-2 text-xs font-semibold leading-5 text-[#1B1A17]">
                          <input
                            className="mt-0.5 h-4 w-4 shrink-0"
                            type="checkbox"
                            aria-label={`포함: ${step.title}`}
                            checked={checked}
                            onChange={(event) => {
                              setIncludedStepIds((current) =>
                                event.target.checked
                                  ? Array.from(new Set([...current, step.id]))
                                  : current.filter((id) => id !== step.id),
                              );
                              setStartFeedback('');
                            }}
                          />
                          <span className="min-w-0 break-keep">{step.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
          ) : null}
          <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
            {dateAnchorCopy.label}
            <input
              data-testid="url-first-start-date-input"
              aria-label={dateAnchorCopy.label}
              className="min-h-10 rounded-lg border border-[#C9DBC4] bg-[#FAFAF8] px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);
                setStartFeedback('');
              }}
            />
            <span data-testid="url-first-date-anchor-help" className="break-keep text-[11px] font-semibold leading-5 text-[#6E6B64]">
              {sourceBackedStartPackage?.public.setupInput?.hint ?? dateAnchorCopy.help}
            </span>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
            내보내기 방식
            <select
              data-testid="url-first-export-mode-select"
              aria-label="내보내기 방식"
              className="min-h-10 rounded-lg border border-[#C9DBC4] bg-[#FAFAF8] px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
              value={selectedExportMode}
              onChange={(event) => {
                setSelectedExportMode(event.target.value as UrlFirstExportMode);
                setStartFeedback('');
              }}
            >
              <option value="calendar">캘린더</option>
              <option value="markdown">{urlFirstExportModeLabels.markdown}</option>
              <option value="checklist">체크리스트</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <button
              type="button"
              data-testid="url-first-memo-document-download"
              className="min-h-10 rounded-lg border border-[#DDE6D8] bg-[#F7FBF4] px-3 py-2 text-sm font-semibold text-[#176D5D] hover:border-[#176D5D]/40"
              onClick={downloadMarkdownExport}
            >
              {urlFirstExportModeLabels.markdown} 받기
            </button>
            <button
              type="button"
              className="min-h-10 rounded-lg bg-[#176D5D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#115246]"
              onClick={startFlowFromLookup}
            >
              시작하기
            </button>
          </div>
          {startFeedback ? (
            <p className="text-xs font-semibold text-[#3654FF] sm:col-span-3">{startFeedback}</p>
          ) : null}
        </div>
      ) : null}

      {canRequestSupplyCandidate ? (
        <section data-testid="flow-url-supply-request" className="mt-3 rounded-xl border border-[#E7E4DD] bg-white p-3">
          <div data-testid="flow-url-miss-draft-gate">
            <p className="text-sm font-semibold text-[#1B1A17]">직접 손볼 초안 준비하기</p>
            <p className="mt-1 break-keep text-xs font-semibold leading-5 text-[#6E6B64]">
              원하는 결과를 여러 할 일로 나눈 뒤 저장 전 살펴볼 수 있어요.
            </p>
          </div>
          {existingSupplyCandidate ? (
            <div data-testid="flow-url-supply-existing" className="mt-3 rounded-lg bg-[#F7FBF4] px-3 py-2 text-xs leading-5 text-[#5F6A5A]">
              <p className="font-semibold text-[#176D5D]">저장한 초안이 있어요</p>
              <p className="mt-1 font-semibold text-[#1B1A17]">{existingSupplyCandidate.title}</p>
              <a className="mt-2 inline-flex min-h-9 items-center rounded-lg bg-[#176D5D] px-3 py-1.5 font-semibold text-white" href="#flow-url-supply-candidate-list">
                초안 열기
              </a>
            </div>
          ) : (
            <form
              data-testid="flow-url-supply-candidate-form"
              className="mt-3 grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                saveSupplyCandidate();
              }}
            >
              <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
                Flow 이름
                <input
                  aria-label="Flow 이름"
                  className="min-h-10 rounded-lg border border-[#C9DBC4] bg-[#FAFAF8] px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
                  value={candidateTitle}
                  maxLength={80}
                  placeholder="어떤 콘텐츠로 보고 싶나요?"
                  onChange={(event) => setCandidateTitle(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
                원하는 결과
                <textarea
                  aria-label="원하는 결과"
                  className="min-h-16 rounded-lg border border-[#C9DBC4] bg-[#FAFAF8] px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
                  value={candidateMemo}
                  maxLength={240}
                  placeholder="원문에서 따라 하고 싶은 순서나 필요한 결과를 적어두세요."
                  onChange={(event) => setCandidateMemo(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  data-testid="flow-url-miss-primary-action"
                  className="min-h-10 rounded-lg bg-[#176D5D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#115246]"
                >
                  초안 준비하기
                </button>
                <span className="text-xs font-semibold text-[#6E6B64]">이 기기에 임시 저장돼요</span>
              </div>
            </form>
          )}
          {candidateFeedback ? <p className="mt-2 text-xs font-semibold text-[#3654FF]">{candidateFeedback}</p> : null}
        </section>
      ) : null}

      {result.gate && !canRequestSupplyCandidate ? (
        <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-[#8A6B18]">
          {result.gate.reason}
        </p>
      ) : null}
    </section>
  );
}

function FlowUrlLookupEntry({
  input,
  result,
  supplyCandidates,
  onInputChange,
  onSubmit,
  onSaveSupplyCandidate,
  onSaveMemoDraftFlow,
}: {
  input: string;
  result: UrlFirstLookupResult | null;
  supplyCandidates: UrlFirstSupplyCandidate[];
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSaveSupplyCandidate: (candidate: UrlFirstSupplyCandidate) => UrlFirstSupplyCandidateUpsertResult;
  onSaveMemoDraftFlow: (memo: string, input: UrlFirstDraftFlowInput) => UrlFirstDraftFlowSaveResult;
}) {
  return (
    <section
      data-testid="flow-url-lookup-entry"
      className="mb-4 rounded-lg border border-[#DDE6D8] bg-[#F7FBF4] p-3.5 shadow-[0_8px_20px_rgba(27,26,23,0.04)]"
    >
      <form className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2" onSubmit={onSubmit}>
        <label className="min-w-0">
          <span className="text-xs font-semibold text-[#176D5D]">URL 또는 메모</span>
          <input
            data-testid="flow-url-lookup-input"
            className="mt-1 min-h-11 w-full rounded-lg border border-[#C9DBC4] bg-white px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none placeholder:text-[#A09B91] focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="링크를 붙여넣거나, 하려는 일을 메모로 적어보세요"
            type="text"
            required
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-[#176D5D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#115246]"
        >
          Flow 찾기
        </button>
      </form>
      {result ? (
        <FlowUrlLookupResult
          result={result}
          supplyCandidates={supplyCandidates}
          onSaveSupplyCandidate={onSaveSupplyCandidate}
          onSaveMemoDraftFlow={onSaveMemoDraftFlow}
        />
      ) : null}
    </section>
  );
}

function FlowUrlSupplyCandidateCard({
  candidate,
  onRequeryCandidate,
  onUpdateCandidate,
  onRemoveCandidate,
  onSaveDraftFlow,
}: {
  candidate: UrlFirstSupplyCandidate;
  onRequeryCandidate: (candidate: UrlFirstSupplyCandidate) => void;
  onUpdateCandidate: (canonicalUrl: string, input: UrlFirstSupplyCandidateUpdateInput) => UrlFirstSupplyCandidateUpdateResult;
  onRemoveCandidate: (canonicalUrl: string) => UrlFirstSupplyCandidateRemoveResult;
  onSaveDraftFlow: (candidate: UrlFirstSupplyCandidate, input: UrlFirstDraftFlowInput) => UrlFirstDraftFlowSaveResult;
}) {
  const availability = getUrlFirstSupplyCandidateAvailability(candidate);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(candidate.title);
  const [editMemo, setEditMemo] = useState(candidate.memo);
  const [feedback, setFeedback] = useState('');
  const [showProductionInfo, setShowProductionInfo] = useState(false);
  const executable = availability.state === 'executable';
  const displayTitle = getUrlSupplyCandidateDisplayTitle(candidate);
  const displayMemo = getUrlSupplyCandidateDisplayMemo(candidate);
  const [showDraftEditor, setShowDraftEditor] = useState(false);
  const [draftTitle, setDraftTitle] = useState(displayTitle);
  const [draftAnchorDate, setDraftAnchorDate] = useState('');
  const [draftSaveTargetHref, setDraftSaveTargetHref] = useState('');
  const draftItems = useMemo(
    () => buildUrlFirstDraftItemSuggestions(candidate),
    [candidate.canonicalUrl, candidate.title, candidate.memo],
  );
  const userSummaryMarkdown = buildUrlFirstSupplyCandidateUserSummaryMarkdown(candidate);
  const productionStatusNote = executable
    ? '이미 Flow로 준비됐어요. Flow 결과로 이동해 바로 시작할 수 있어요.'
    : '원문과 원하는 결과를 보관했어요. 초안을 직접 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요.';

  useEffect(() => {
    setEditTitle(candidate.title);
    setEditMemo(candidate.memo);
    setDraftTitle(getUrlSupplyCandidateDisplayTitle(candidate));
    setDraftAnchorDate('');
    setFeedback('');
    setDraftSaveTargetHref('');
    setIsEditing(false);
    setShowDraftEditor(false);
  }, [candidate.canonicalUrl, candidate.title, candidate.memo]);

  const copyUserSummaryMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(userSummaryMarkdown);
      setFeedback('초안 요청 정리본 복사됨');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = userSummaryMarkdown;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      setFeedback(copied ? '초안 요청 정리본 복사됨' : '복사하지 못했습니다.');
    }
  };

  const saveEdits = () => {
    const updated = onUpdateCandidate(candidate.canonicalUrl, {
      title: editTitle,
      memo: editMemo,
    });
    if (!updated.updated || !updated.candidate) {
      setFeedback('수정할 요청을 찾지 못했습니다.');
      return;
    }
    setEditTitle(updated.candidate.title);
    setEditMemo(updated.candidate.memo);
    setIsEditing(false);
    setFeedback('수정 저장됨');
  };

  const removeCandidate = () => {
    const removed = onRemoveCandidate(candidate.canonicalUrl);
    if (!removed.removed) setFeedback('삭제할 후보를 찾지 못했습니다.');
  };

  const saveDraftFlow = () => {
    setDraftSaveTargetHref('');
    const saved = onSaveDraftFlow(candidate, {
      flowTitle: draftTitle,
      anchorDate: draftAnchorDate,
      items: draftItems,
    });
    if (!saved.saved) {
      setFeedback(saved.error ?? '초안을 저장하지 못했습니다.');
      return;
    }
    if (saved.reused) {
      setFeedback('이미 저장한 초안이 있어요.');
      setDraftSaveTargetHref(saved.targetHref ?? '/my');
      return;
    }
    setFeedback('내 Flow에 초안 저장됨');
    if (typeof window !== 'undefined') window.location.href = saved.targetHref ?? '/my';
  };

  return (
    <article className="rounded-xl border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${executable ? 'bg-[#E7F6EC] text-[#176D5D]' : 'bg-white text-[#176D5D]'}`}>
          {executable ? 'Flow 준비됨' : getUrlSupplyCandidateStatusLabel(candidate)}
        </span>
        <span className="text-[11px] font-semibold text-[#8A857B]">{formatKoreanShortDate(candidate.savedAt)}</span>
      </div>
      <p className="mt-1 break-keep text-sm font-semibold text-[#1B1A17]">{displayTitle}</p>
      {displayMemo ? <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-[#6E6B64]">{displayMemo}</p> : null}
      <p className={`mt-1 text-[11px] font-semibold ${executable ? 'text-[#176D5D]' : 'text-[#6E6B64]'}`}>
        {executable ? '바로 시작할 수 있는 Flow가 준비됐어요.' : '직접 손볼 초안으로 이어갈 수 있어요.'}
      </p>

      {!executable ? (
        <section data-testid="flow-url-miss-draft-entry" className="mt-3 rounded-lg border border-[#DDE6D8] bg-white p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#176D5D]">앱 안에서 이어가기</p>
              <h3 className="mt-1 break-keep text-sm font-semibold text-[#1B1A17]">직접 손볼 초안으로 시작</h3>
              <p className="mt-1 break-keep text-xs font-semibold leading-5 text-[#6E6B64]">
                내가 쓴 제목과 메모에서 여러 할 일을 제안합니다. 저장 후 My Flow에서 필요한 것만 남기고 날짜와 메모를 고칠 수 있어요.
              </p>
            </div>
            <button
              type="button"
              data-testid="flow-url-miss-draft-open"
              className="min-h-9 rounded-lg bg-[#176D5D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#115246]"
              onClick={() => {
                setShowDraftEditor((current) => !current);
                setFeedback('');
              }}
            >
              초안 편집 시작
            </button>
          </div>
          {showDraftEditor ? (
            <form
              data-testid="flow-url-miss-draft-editor"
              className="mt-3 grid gap-2 rounded-lg border border-[#E7E4DD] bg-[#FAFAF8] p-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveDraftFlow();
              }}
            >
              <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
                초안 제목
                <input
                  data-testid="flow-url-miss-draft-flow-title"
                  aria-label="초안 제목"
                  className="min-h-10 rounded-lg border border-[#C9DBC4] bg-white px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
                  value={draftTitle}
                  maxLength={80}
                  onChange={(event) => setDraftTitle(event.target.value)}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
                기준일
                <input
                  data-testid="flow-url-miss-draft-anchor-date"
                  aria-label="초안 기준일"
                  className="min-h-10 rounded-lg border border-[#C9DBC4] bg-white px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
                  type="date"
                  value={draftAnchorDate}
                  onChange={(event) => setDraftAnchorDate(event.target.value)}
                />
                <span className="break-keep text-[11px] font-semibold leading-5 text-[#6E6B64]">
                  날짜를 넣으면 캘린더에 첫 할 일이 표시됩니다. 저장 후 My Flow에서 다시 바꿀 수 있습니다.
                </span>
              </label>
              <div data-testid="flow-url-miss-draft-suggestion-list" className="grid gap-2 rounded-lg bg-white p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-[#176D5D]">제안한 할 일</p>
                  <span className="text-[11px] font-semibold text-[#8A857B]">{draftItems.length}개 · 저장 후 수정</span>
                </div>
                <ol className="grid gap-1.5">
                  {draftItems.map((item, index) => (
                    <li
                      key={`${candidate.canonicalUrl}-draft-suggestion-${index}`}
                      data-testid="flow-url-miss-draft-item"
                      data-draft-day-offset={item.dayOffset}
                      className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 rounded-md bg-[#FAFAF8] px-2.5 py-2"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F2ED] text-[11px] font-semibold text-[#176D5D]">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="break-keep text-xs font-semibold leading-5 text-[#1B1A17]">{item.title}</p>
                        <p className="mt-0.5 break-keep text-[11px] font-semibold leading-5 text-[#6E6B64]">
                          {draftAnchorDate
                            ? `${formatKoreanShortDate(addDays(new Date(draftAnchorDate), item.dayOffset), { includeWeekday: true })}`
                            : item.dayOffset === 0 ? '기준일' : `기준일 +${item.dayOffset}일`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  data-testid="flow-url-miss-draft-save"
                  className="min-h-10 rounded-lg bg-[#176D5D] px-3 py-2 text-sm font-semibold text-white hover:bg-[#115246]"
                >
                  내 Flow에 초안 저장
                </button>
                <span className="text-xs font-semibold text-[#6E6B64]">제안 항목은 저장 후 다시 손볼 수 있어요</span>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {isEditing ? (
        <form
          className="mt-3 grid gap-2 rounded-lg border border-[#E7E4DD] bg-white p-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveEdits();
          }}
        >
          <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
            요청 제목 수정
            <input
              aria-label="요청 제목 수정"
              className="min-h-10 rounded-lg border border-[#C9DBC4] bg-[#FAFAF8] px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
              value={editTitle}
              maxLength={80}
              onChange={(event) => setEditTitle(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[#176D5D]">
            요청 메모 수정
            <textarea
              aria-label="요청 메모 수정"
              className="min-h-20 rounded-lg border border-[#C9DBC4] bg-[#FAFAF8] px-3 py-2 text-sm font-semibold text-[#1B1A17] outline-none focus:border-[#176D5D] focus:ring-2 focus:ring-[#176D5D]/10"
              value={editMemo}
              maxLength={240}
              onChange={(event) => setEditMemo(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="min-h-9 rounded-lg bg-[#176D5D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#115246]">
              수정 저장
            </button>
            <button
              type="button"
              className="min-h-9 rounded-lg border border-[#E7E4DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#6E6B64]"
              onClick={() => {
                setEditTitle(candidate.title);
                setEditMemo(candidate.memo);
                setIsEditing(false);
                setFeedback('');
              }}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {executable ? (
            <button
              type="button"
              className="min-h-9 rounded-lg bg-[#176D5D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#115246]"
              onClick={() => onRequeryCandidate(candidate)}
            >
              Flow 결과로 이동
            </button>
          ) : null}
          <button
            type="button"
            className="min-h-9 rounded-lg border border-[#DDE6D8] bg-white px-3 py-1.5 text-xs font-semibold text-[#176D5D]"
            onClick={() => {
              setShowProductionInfo((current) => !current);
              setFeedback('');
            }}
          >
            {showProductionInfo ? '원문·메모 닫기' : '원문·메모 보기'}
          </button>
        </div>
      )}
      {showProductionInfo ? (
        <div data-testid="flow-url-supply-production-handoff" className="mt-3 rounded-lg border border-[#DDE6D8] bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold text-[#1B1A17]">요청 내용</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${executable ? 'bg-[#E7F6EC] text-[#176D5D]' : 'bg-[#FFF7E0] text-[#8A6B18]'}`}>
              {getUrlSupplyCandidateAvailabilityLabel(candidate)}
            </span>
          </div>
          <dl className="mt-2 grid gap-1.5 text-[11px] leading-5 text-[#6E6B64]">
            <div>
              <dt className="font-semibold text-[#1B1A17]">원 URL</dt>
              <dd>원문 링크 저장됨</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#1B1A17]">내가 쓴 제목·메모</dt>
              <dd>{displayTitle}{displayMemo ? ` · ${displayMemo}` : ''}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[#1B1A17]">마지막 확인</dt>
              <dd>{getUrlSupplyCandidateLastLookupLabel(candidate)}</dd>
            </div>
          </dl>
          <p className="mt-2 rounded-lg bg-[#FAFAF8] px-2.5 py-2 text-[11px] font-semibold leading-5 text-[#6E6B64]">{productionStatusNote}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              className="inline-flex min-h-9 items-center rounded-lg border border-[#DDE6D8] bg-white px-3 py-1.5 text-xs font-semibold text-[#176D5D]"
              href={candidate.originalUrl}
              target="_blank"
              rel="noreferrer"
            >
              원 URL 열기
            </a>
            {!executable ? (
              <button
                type="button"
                className="min-h-9 rounded-lg border border-[#DDE6D8] bg-white px-3 py-1.5 text-xs font-semibold text-[#176D5D]"
                onClick={() => onRequeryCandidate(candidate)}
              >
                다시 조회
              </button>
            ) : null}
            <button
              type="button"
              className="min-h-9 rounded-lg border border-[#E7E4DD] bg-white px-3 py-1.5 text-xs font-semibold text-[#6E6B64]"
              onClick={() => {
                setIsEditing(true);
                setFeedback('');
              }}
            >
              제목/메모 수정
            </button>
            <button
              type="button"
              className="min-h-9 rounded-lg border border-[#F0D1C6] bg-white px-3 py-1.5 text-xs font-semibold text-[#A64224]"
              onClick={removeCandidate}
            >
              삭제
            </button>
            <button
              type="button"
              className="min-h-9 rounded-lg bg-[#176D5D] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#115246]"
              data-testid="flow-url-supply-user-summary-copy"
              onClick={copyUserSummaryMarkdown}
            >
              초안 요청 정리본 복사
            </button>
          </div>
        </div>
      ) : null}
      {feedback ? (
        <div
          data-testid="flow-url-miss-draft-feedback"
          role="status"
          aria-live="polite"
          className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#3654FF]"
        >
          <span>{feedback}</span>
          {draftSaveTargetHref ? (
            <Link className="underline underline-offset-2" href={draftSaveTargetHref}>
              My Flow에서 이어서 수정
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function FlowUrlSupplyCandidateList({
  candidates,
  onRequeryCandidate,
  onUpdateCandidate,
  onRemoveCandidate,
  onSaveDraftFlow,
}: {
  candidates: UrlFirstSupplyCandidate[];
  onRequeryCandidate: (candidate: UrlFirstSupplyCandidate) => void;
  onUpdateCandidate: (canonicalUrl: string, input: UrlFirstSupplyCandidateUpdateInput) => UrlFirstSupplyCandidateUpdateResult;
  onRemoveCandidate: (canonicalUrl: string) => UrlFirstSupplyCandidateRemoveResult;
  onSaveDraftFlow: (candidate: UrlFirstSupplyCandidate, input: UrlFirstDraftFlowInput) => UrlFirstDraftFlowSaveResult;
}) {
  if (candidates.length === 0) return null;

  return (
    <section id="flow-url-supply-candidate-list" data-testid="flow-url-supply-candidate-list" className="mb-4 scroll-mt-4 rounded-lg border border-[#E7E4DD] bg-white p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#1B1A17]">내 초안</h2>
        <span className="text-[11px] font-semibold text-[#8A857B]">{candidates.length}개</span>
      </div>
      <div className={`mt-3 grid gap-2 ${candidates.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {candidates.map((candidate) => (
          <FlowUrlSupplyCandidateCard
            key={candidate.canonicalUrl}
            candidate={candidate}
            onRequeryCandidate={onRequeryCandidate}
            onUpdateCandidate={onUpdateCandidate}
            onRemoveCandidate={onRemoveCandidate}
            onSaveDraftFlow={onSaveDraftFlow}
          />
        ))}
      </div>
    </section>
  );
}

export function FlowList() {
  const { bundles, persist } = useBundles();
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? '전체';
  const initialTag = searchParams.get('tag') ?? '전체';
  const [category, setCategory] = useState(initialCategory);
  const [tag, setTag] = useState(initialTag);
  const [structure, setStructure] = useState('전체');
  const [sort, setSort] = useState<'popular' | 'recent'>('popular');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogIntent, setCatalogIntent] = useState<CatalogIntent>('all');
  const [urlLookupInput, setUrlLookupInput] = useState('');
  const [urlLookupResult, setUrlLookupResult] = useState<UrlFirstLookupResult | null>(null);
  const [catalogBrowseOpenAfterLookup, setCatalogBrowseOpenAfterLookup] = useState(false);
  const [urlSupplyCandidates, setUrlSupplyCandidates] = useState<UrlFirstSupplyCandidate[]>([]);
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
  const catalogBrowseHiddenAfterLookup = Boolean(urlLookupResult) && !catalogBrowseOpenAfterLookup;

  function handleUrlLookupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUrlLookupResult(lookupUrlOrMemoP0Input(urlLookupInput));
    setCatalogBrowseOpenAfterLookup(false);
  }

  function handleSaveMemoDraftFlow(memo: string, input: UrlFirstDraftFlowInput): UrlFirstDraftFlowSaveResult {
    try {
      const draftPackage = createMemoDraftFlowPackage(memo, input);
      const nextBundles = [
        ...bundles.filter((bundle) => bundle.flow.slug !== draftPackage.bundle.flow.slug),
        draftPackage.bundle,
      ];
      persist(nextBundles);
      saveFlowRecord(draftPackage.bundle.flow.slug, {
        selectedArtifactMode: draftPackage.anchor ? 'calendar' : 'checklist',
        ...(draftPackage.anchor ? { anchor: draftPackage.anchor } : {}),
      });
      if (draftPackage.anchor) saveStoredAnchor(draftPackage.bundle.flow.slug, { mode: 'custom', anchor: draftPackage.anchor });
      return {
        saved: true,
        slug: draftPackage.bundle.flow.slug,
        targetHref: '/my',
      };
    } catch {
      return {
        saved: false,
        error: '메모 초안을 저장하지 못했습니다. 입력한 메모는 그대로예요. 저장 공간을 확인한 뒤 다시 시도해 주세요.',
      };
    }
  }

  function persistUrlSupplyCandidates(candidates: UrlFirstSupplyCandidate[]) {
    setUrlSupplyCandidates(candidates);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY, JSON.stringify(candidates));
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const candidates = normalizeUrlFirstSupplyCandidates(JSON.parse(window.localStorage.getItem(URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY) || '[]'));
      setUrlSupplyCandidates(candidates);
      window.localStorage.setItem(URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY, JSON.stringify(candidates));
    } catch {
      setUrlSupplyCandidates([]);
      window.localStorage.setItem(URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY, JSON.stringify([]));
    }
  }, []);

  function handleSaveSupplyCandidate(candidate: UrlFirstSupplyCandidate): UrlFirstSupplyCandidateUpsertResult {
    const upserted = upsertUrlFirstSupplyCandidate(urlSupplyCandidates, candidate);
    persistUrlSupplyCandidates(upserted.candidates);
    return upserted;
  }

  function handleRequerySupplyCandidate(candidate: UrlFirstSupplyCandidate) {
    const lookup = lookupUrlFirstP0Input(candidate.canonicalUrl);
    setUrlLookupInput(candidate.canonicalUrl);
    setUrlLookupResult(lookup);
    const recorded = recordUrlFirstSupplyCandidateLookup(urlSupplyCandidates, candidate.canonicalUrl, lookup);
    if (recorded.updated) persistUrlSupplyCandidates(recorded.candidates);
    if (typeof window !== 'undefined') {
      document.querySelector('[data-testid="flow-url-lookup-entry"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleUpdateSupplyCandidate(canonicalUrl: string, input: UrlFirstSupplyCandidateUpdateInput): UrlFirstSupplyCandidateUpdateResult {
    const updated = updateUrlFirstSupplyCandidate(urlSupplyCandidates, canonicalUrl, input);
    if (updated.updated) persistUrlSupplyCandidates(updated.candidates);
    return updated;
  }

  function handleRemoveSupplyCandidate(canonicalUrl: string): UrlFirstSupplyCandidateRemoveResult {
    const removed = removeUrlFirstSupplyCandidate(urlSupplyCandidates, canonicalUrl);
    if (removed.removed) persistUrlSupplyCandidates(removed.candidates);
    return removed;
  }

  function handleSaveDraftFlowFromCandidate(candidate: UrlFirstSupplyCandidate, input: UrlFirstDraftFlowInput): UrlFirstDraftFlowSaveResult {
    try {
      const existingDraft = findExistingUrlFirstDraftBundle(bundles, candidate);
      if (existingDraft) {
        const existingAnchor = getStoredAnchor(existingDraft.flow.slug).anchor;
        saveFlowRecord(existingDraft.flow.slug, {
          selectedArtifactMode: existingAnchor ? 'calendar' : 'checklist',
          ...(existingAnchor ? { anchor: existingAnchor } : {}),
        });
        return {
          saved: true,
          reused: true,
          slug: existingDraft.flow.slug,
          targetHref: '/my',
        };
      }

      const draftPackage = createUrlFirstDraftFlowPackage(candidate, input);
      const nextBundles = [
        ...bundles.filter((bundle) => bundle.flow.slug !== draftPackage.bundle.flow.slug),
        draftPackage.bundle,
      ];
      persist(nextBundles);
      saveFlowRecord(draftPackage.bundle.flow.slug, {
        selectedArtifactMode: draftPackage.anchor ? 'calendar' : 'checklist',
        ...(draftPackage.anchor ? { anchor: draftPackage.anchor } : {}),
      });
      if (draftPackage.anchor) saveStoredAnchor(draftPackage.bundle.flow.slug, { mode: 'custom', anchor: draftPackage.anchor });
      if (Object.keys(draftPackage.itemStates).length > 0) saveItemStates(draftPackage.bundle.flow.slug, draftPackage.itemStates);
      return {
        saved: true,
        slug: draftPackage.bundle.flow.slug,
        targetHref: '/my',
      };
    } catch {
      return {
        saved: false,
        error: '초안을 저장하지 못했습니다. 입력한 내용은 그대로예요. 저장 공간을 확인한 뒤 다시 시도해 주세요.',
      };
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAF8] px-5 py-6 pb-28 md:py-8 md:pb-8">
      <div className="mx-auto max-w-6xl">
      <PlatformNav />
      <section data-testid="flow-map-catalog-section" className="mb-8">
        <div data-testid="flow-catalog-hero" className="mb-3">
          <p className="text-sm font-semibold text-[#6E6B64]">Flow 찾기</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <h1 className="break-keep text-2xl font-semibold tracking-tight text-[#1B1A17] sm:text-3xl">URL·메모로 Flow 찾기</h1>
            <span data-testid="flow-catalog-count" className="text-sm font-semibold text-[#8A857B]">
              {hasCatalogFilter ? `${visibleCatalogCount}/${totalCatalogCount}개 콘텐츠` : `${totalCatalogCount}개 콘텐츠`}
            </span>
          </div>
          <p className="mt-1 break-keep text-sm leading-6 text-[#6E6B64]">준비된 Flow를 찾거나 내 초안으로 이어갑니다.</p>
        </div>
        <FlowUrlLookupEntry
          input={urlLookupInput}
          result={urlLookupResult}
          supplyCandidates={urlSupplyCandidates}
          onInputChange={setUrlLookupInput}
          onSubmit={handleUrlLookupSubmit}
          onSaveSupplyCandidate={handleSaveSupplyCandidate}
          onSaveMemoDraftFlow={handleSaveMemoDraftFlow}
        />
        <FlowUrlSupplyCandidateList
          candidates={urlSupplyCandidates}
          onRequeryCandidate={handleRequerySupplyCandidate}
          onUpdateCandidate={handleUpdateSupplyCandidate}
          onRemoveCandidate={handleRemoveSupplyCandidate}
          onSaveDraftFlow={handleSaveDraftFlowFromCandidate}
        />
        {urlLookupResult ? (
          <div className="mb-4 border-y border-[#E7E4DD] py-3">
            <button
              type="button"
              data-testid="flow-catalog-after-lookup-toggle"
              className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-[#3654FF]"
              aria-expanded={catalogBrowseOpenAfterLookup}
              onClick={() => setCatalogBrowseOpenAfterLookup((open) => !open)}
            >
              <span>{catalogBrowseOpenAfterLookup ? '다른 Flow 접기' : '다른 Flow 둘러보기'}</span>
              <span aria-hidden="true">{catalogBrowseOpenAfterLookup ? '−' : '+'}</span>
            </button>
          </div>
        ) : null}
        <div data-testid="flow-catalog-browse-controls" className={`${catalogBrowseHiddenAfterLookup ? 'hidden' : 'grid'} mb-3 gap-2`}>
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
        {showCatalogFilters && !catalogBrowseHiddenAfterLookup ? (
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
        <div data-testid="flow-catalog-browse-results" className={`${catalogBrowseHiddenAfterLookup ? 'hidden' : 'grid'} gap-3 md:grid-cols-2 xl:grid-cols-3`}>
          {visibleFlowMapCatalogLinks.map((item) => (
            <FlowMapCatalogCard key={item.id} item={item} />
          ))}
          {visibleDirectoryBundles.map((bundle) => (
            <DirectoryFlowCard key={bundle.flow.id} bundle={bundle} />
          ))}
        </div>
        {visibleCatalogCount === 0 && !catalogBrowseHiddenAfterLookup ? (
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

function getSourceStatusLabel(bundle: FlowBundle) {
  if (bundle.flow.source_status === 'real') return '실제 원본';
  if (bundle.flow.source_status === 'preview') return '샘플 후보';
  if (bundle.flow.source_status === 'needs_review') return '원문 확인';
  return bundle.flow.source_url ? '출처 연결' : '초안';
}

function getSourcePrecisionLabel(bundle: FlowBundle): string | undefined {
  if (bundle.flow.source_precision === 'exact') return '개별 원문 페이지';
  if (bundle.flow.source_precision === 'broad') return '출처 범위 넓음';
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

const currentSourceBackedCatalogLinks = getPublicCatalogSourceBackedFlowMaps().map((map) => {
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
    title: toUserFacingMapTitle(map.title),
    summary: map.summary,
    categoryLabel: map.categoryLabel ?? '실행 콘텐츠',
    userFacingStatus: map.userFacingStatus ?? '확인 가능',
    input: map.setupInput?.label ?? '입력 없음',
    artifact: map.artifacts[0] ?? '저장 항목',
    note: map.categoryLabel ?? '실행 콘텐츠',
    reason: map.summary,
    flowCount: map.flowSlugs.length,
    counts,
    recommendedFlowSlug,
    recommendedFlowTitle: toContentDisplayTitle(recommendedFlow?.title ?? recommendedFlowSlug),
    sourceUrl: map.sourceUrl,
    sourceUrlCount: map.sourceUrlCount ?? 1,
    sourceSignal: '원문 연결',
    previewSteps,
    searchText: [map.title, map.userLabel, map.categoryLabel, map.sourceTitle, ...map.artifacts, getChildFlowCatalogSearchText(childFlows)].filter(Boolean).join(' '),
    sourceKind: 'curated-source',
  };
});

const flowMapCatalogLinks = [
  ...homeFlowMapBaselineLinks,
  ...currentSourceBackedCatalogLinks.filter(
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
        'block rounded-lg border border-[#E7E4DD] bg-white transition hover:border-[#3654FF]/40 hover:shadow-[0_8px_24px_rgba(27,26,23,0.06)]',
        isPrimary ? 'p-4 md:p-5' : 'p-3.5',
      ].join(' ')}
      href={`/flow-maps/${item.id}`}
    >
      <p className="text-[11px] font-semibold text-[#8A857B]">{item.categoryLabel} · {item.sourceSignal}</p>
      <h2 className={isPrimary ? 'mt-2 text-2xl font-semibold leading-snug text-[#1B1A17]' : 'mt-1.5 text-base font-semibold leading-snug text-[#1B1A17]'}>
        {item.title}
      </h2>
      <p
        data-testid={isPrimary ? 'home-primary-flow-promise' : undefined}
        className={isPrimary ? 'mt-3 border-y border-[#E7E4DD] py-2.5 text-sm font-semibold leading-5 text-[#1B1A17]' : 'mt-2 break-keep text-sm font-semibold leading-5 text-[#3654FF]'}
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
            <Link
              data-testid="home-url-first-entry"
              className="inline-flex min-h-12 w-full flex-col items-start justify-center rounded-lg bg-[#3654FF] px-5 py-3 text-left text-sm font-semibold text-white hover:bg-[#2945E8] sm:w-auto sm:min-w-[19rem]"
              href="/flows"
            >
              <span>URL이나 메모로 Flow 찾기</span>
              <span className="mt-0.5 text-xs font-medium text-white/80">· 링크 붙여넣기 · 요청 메모 · 준비된 Flow 확인</span>
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
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1">
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
  structuralOwnership?: PersonalStructuralItemOwnership;
  structuralProjectionOrderRank?: number;
  structuralCalendarIcsEligible?: boolean;
  structuralProjectionStableId?: string;
  structuralSchedule?: PersonalStructuralSchedule;
  structuralScheduleProjection?: PersonalStructuralScheduleProjection;
  structuralRepeat?: PersonalStructuralRepeat;
  structuralOccurrenceId?: string;
  structuralOccurrenceSeriesId?: string;
  structuralOccurrenceRevisionId?: string;
  structuralOccurrenceOriginalDate?: string;
  structuralOccurrenceExecutionState?: PersonalStructuralOccurrenceExecutionState;
  structuralOccurrenceOrigin?: SavedRoutineOccurrenceOrigin;
  structuralOccurrenceDateOverrideKey?: string;
};

type MySavedFlow = {
  progress: ActiveFlowProgress;
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  rows: MyFlowRow[];
  projectionRows?: MyFlowRow[];
  structuralProjection?: PersonalStructuralProjectionResult<FlowItem>;
  excludedRows: MyFlowRow[];
  done: number;
  total: number;
  percent: number;
  meta: string;
  savedMap?: SavedFlowMapSnapshot;
  demoGroup?: string;
  demoNote?: string;
};

type MyFlowPersonalCopySettingsDraft = {
  flowSlug: string;
  title: string;
  anchor: string;
  includedStepIds: string[];
  feedback?: string;
};

type MyFlowDirectAnchorSettingsDraft = {
  mapId: string;
  anchor: string;
  feedback?: string;
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
  flowMarker: MyFlowFlowMarker;
  savedMap?: SavedFlowMapSnapshot;
};

type MyFlowFlowMarker = {
  key: string;
  color: string;
  title: string;
  shortTitle: string;
  initial: string;
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
type MyFlowItemDraft = StoredMyFlowItemDraft;
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
type MyFlowCompletionFeedbackDraft = {
  flowSlug: string;
  mode: 'reflection' | 'correction';
  outcome: 'helpful' | 'needs_changes';
  reflectionNote: string;
  correctionScope: string;
  correctionNote: string;
  status: string;
};
type MyFlowReuseDraft = {
  flowSlug: string;
  anchor: string;
  fixedDatePolicy: FlowRunFixedDatePolicy | '';
  fixedDateOverrideCount: number;
  versionMode: 'current' | 'latest';
  versionSelections: FlowVersionReviewSelections;
  sensitiveReviewConfirmed: boolean;
  status: string;
};
type MyFlowReuseNotice = {
  flowSlug: string;
  message: string;
};
const MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY = 'flow:my-flow:hidden-flows';
const MY_FLOW_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

type FlowListFilter = 'all' | 'open' | 'routine' | 'done' | 'hidden';

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
  if (row.structuralOccurrenceId) {
    return row.structuralOccurrenceExecutionState === 'done';
  }
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
  return `전체 ${flow.done}/${flow.total} 완료`;
}

function getMyFlowRoutineExecutionLabel(row: MyFlowCalendarRow): string {
  if (!row.structuralOccurrenceId) {
    return `반복 항목 ${row.flow.done}/${row.flow.total}`;
  }
  if (row.structuralOccurrenceExecutionState === 'done') return '이번 회차 완료';
  if (row.structuralOccurrenceExecutionState === 'reopened') return '이번 회차 다시 진행';
  if (row.structuralOccurrenceExecutionState === 'skipped') return '이번 회차 건너뜀';
  if (row.structuralOccurrenceExecutionState === 'held') return '이번 회차 보류';
  return '이번 회차 대기';
}

function getMyFlowSourceHref(flow: MySavedFlow): string {
  const retiredPolicy = getRuntimeArchivedFlowPolicy(flow.progress.slug);
  if (isRetiredPersonalCopyBundle(flow.bundle)) {
    return retiredPolicy?.replacementSlug ? `/f/${retiredPolicy.replacementSlug}` : '/flows';
  }
  const readiness = getMyFlowContentReadiness(flow);
  if (readiness.kind === 'review' || readiness.kind === 'preview') {
    return flow.bundle.flow.source_url ?? '/flows';
  }
  const sourceBackedMap = getSourceBackedMyFlowMapForBundle(flow.bundle);
  return flow.savedMap ? `/flow-maps/${flow.savedMap.mapId}` : sourceBackedMap ? `/flow-maps/${sourceBackedMap.id}` : `/f/${flow.progress.slug}`;
}

function getMyFlowSourceLinkLabel(flow: MySavedFlow): string {
  if (isRetiredPersonalCopyBundle(flow.bundle)) {
    return getRuntimeArchivedFlowPolicy(flow.progress.slug)?.replacementSlug
      ? '새 Flow 보기'
      : '다른 Flow 찾기';
  }
  const readiness = getMyFlowContentReadiness(flow);
  if (readiness.kind === 'review' || readiness.kind === 'preview') {
    return flow.bundle.flow.source_url ? '현재 원문 보기' : '다른 Flow 찾기';
  }
  return flow.savedMap || getSourceBackedMyFlowMapForBundle(flow.bundle) ? '전체 보기' : 'Flow 보기';
}

function isMyFlowPersonalSavedCopy(flow: MySavedFlow): boolean {
  return Boolean(flow.savedMap?.personalCopy || flow.excludedRows.length > 0);
}

function isUrlFirstDraftSavedFlow(flow: MySavedFlow): boolean {
  return flow.progress.slug.startsWith('url-draft-') || flow.bundle.flow.slug.startsWith('url-draft-');
}

function isMemoDraftSavedFlow(flow: MySavedFlow): boolean {
  return isUrlFirstDraftSavedFlow(flow) && isPersonalMemoDraftBundle(flow.bundle);
}

function getMyFlowSettingsDateAnchorCopy(flow: MySavedFlow) {
  if (isMemoDraftSavedFlow(flow)) {
    return {
      label: '첫 할 일 날짜',
      editLabel: '첫 할 일 날짜 바꾸기',
      help: '첫 번째 할 일만 이 날짜에 맞춰집니다. 다른 할 일은 따로 정한 날짜를 유지합니다.',
      itemOverrideLabel: '이 할 일 날짜',
      distinction: '첫 할 일 날짜는 첫 번째 할 일만 정하고, 이 할 일 날짜는 선택한 할 일만 바꿉니다.',
    };
  }
  if (isUrlFirstDraftSavedFlow(flow) && !flow.savedMap?.personalCopy) return getSourceBackedFlowMapDateAnchorCopy();
  return getSourceBackedFlowMapDateAnchorCopy(
    flow.savedMap?.mapId ? buildSourceBackedFlowMapPublishPackage(flow.savedMap.mapId) : getSourceBackedMyFlowMapForBundle(flow.bundle),
  );
}

function canEditMyFlowSavedFlowSettings(flow: MySavedFlow): boolean {
  return Boolean(flow.savedMap?.personalCopy) || isUrlFirstDraftSavedFlow(flow);
}

function canEditMyFlowDirectSavedMapAnchor(flow: MySavedFlow): boolean {
  if (
    !flow.savedMap ||
    flow.savedMap.personalCopy ||
    isUrlFirstDraftSavedFlow(flow) ||
    flow.savedMap.flowSlugs[0] !== flow.progress.slug
  ) return false;
  const publishPackage = buildSourceBackedFlowMapPublishPackage(flow.savedMap.mapId);
  return Boolean(
    publishPackage?.map.setupInput ||
      flow.bundle.flow.anchor_type !== 'none' ||
      flow.savedMap.anchor,
  );
}

function getMyFlowDirectSavedMapAnchorCopy(flow: MySavedFlow) {
  return getSourceBackedFlowMapDateAnchorCopy(
    flow.savedMap?.mapId
      ? buildSourceBackedFlowMapPublishPackage(flow.savedMap.mapId)
      : getSourceBackedMyFlowMapForBundle(flow.bundle),
  );
}

function getMyFlowPortableExportFlowTitle(flow: MySavedFlow): string {
  return flow.savedMap?.personalCopy ? toUserFacingMapTitle(flow.savedMap.title) : getMyFlowExecutionFlowTitle(flow.progress.title);
}

type MyFlowContentReadiness = {
  kind: 'ready' | 'review' | 'preview' | 'retired' | 'legacy';
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
  savedRecord?: SourceBackedFlowMapPersistenceRecord;
  currentRecord?: SourceBackedFlowMapPersistenceRecord;
  versionReview?: FlowVersionReview;
  executionHeld?: boolean;
  executionHoldReason?: 'official_freshness' | 'source_rows' | 'medical_source_fit';
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

function getStoredMyFlowMapPersistenceRecord(mapId: string): SourceBackedFlowMapPersistenceRecord | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(getSourceBackedFlowMapPersistenceStorageKey(mapId)) || 'null',
    ) as SourceBackedFlowMapPersistenceRecord | null;
    return parsed?.recordType === 'saved_source_backed_flow_map' && parsed.map?.id === mapId ? parsed : undefined;
  } catch {
    return undefined;
  }
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
    ...(snapshot.personalCopy ? { personalCopy: snapshot.personalCopy } : {}),
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

function getMyFlowMapUpdateNotice(
  snapshot: SavedFlowMapSnapshot,
  storedRecord?: SourceBackedFlowMapPersistenceRecord,
): MyFlowMapUpdateNotice | undefined {
  const sourceSnapshot = toSourceBackedSavedSnapshot(snapshot);
  const qualityDecision = getSourceBackedFlowMapQualityDecision(snapshot.mapId);
  const executionHeld = qualityDecision.publicExecutionEnabled === false;
  const needsSourceRows = qualityDecision.executionHoldReason === 'source_rows';
  const needsMedicalSourceFit = qualityDecision.executionHoldReason === 'medical_source_fit';
  const currentSnapshot = buildSourceBackedFlowMapSavedSnapshotUpdate(sourceSnapshot, {
    savedAt: snapshot.savedAt,
    ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
  });
  const assessment = assessSourceBackedFlowMapUpdate(sourceSnapshot);
  if (assessment.status === 'up_to_date' && !executionHeld) return undefined;
  const affectedFlowSlugs = assessment.affectedFlows.length > 0 ? assessment.affectedFlows : snapshot.flowSlugs;
  const affectedCount = Math.max(affectedFlowSlugs.length, snapshot.flowSlugs.length);
  const reasons = executionHeld
    ? needsSourceRows
      ? [
          '원문 자료에서 실제로 실행할 개별 항목과 난이도를 고르는 중입니다.',
          '저장한 기록은 유지되지만 새 일정으로 다시 쓰기 전 원문 자료를 확인해 주세요.',
          ...assessment.reasons.map(formatMyFlowMapUpdateReason),
        ]
      : needsMedicalSourceFit
        ? [
            '민간 식단표의 시작 시기와 메뉴를 현재 공식 안내와 다시 대조하고 있습니다.',
            '저장한 기록은 유지되지만 다시 쓰기 전 아이 상태와 공식 안내를 확인해 주세요.',
            ...assessment.reasons.map(formatMyFlowMapUpdateReason),
          ]
      : [
          '공식 원문과 현재 표시 내용이 맞는지 다시 확인 중입니다.',
          '저장한 기록은 유지되지만 실행 전 공식 원문을 확인해 주세요.',
          ...assessment.reasons.map(formatMyFlowMapUpdateReason),
        ]
    : assessment.reasons.map(formatMyFlowMapUpdateReason);
  const comparisonRows = executionHeld && assessment.status === 'up_to_date'
    ? []
    : buildMyFlowMapUpdateComparisonRows(sourceSnapshot, currentSnapshot);
  const currentRecord = buildSourceBackedFlowMapPersistenceRecord(snapshot.mapId, {
    savedAt: snapshot.savedAt,
    ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
  });
  const savedRecord = storedRecord ?? (currentRecord
    ? {
        ...structuredClone(currentRecord),
        map: { ...currentRecord.map, version: snapshot.version },
      }
    : undefined);
  const versionReview = savedRecord && currentRecord
    ? buildFlowVersionReview({
        savedRecord,
        currentRecord,
        savedVersion: snapshot.version,
        personalCopy: snapshot.personalCopy,
      })
    : undefined;

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
      ...(savedRecord ? { savedRecord } : {}),
      ...(currentRecord ? { currentRecord } : {}),
      ...(versionReview ? { versionReview } : {}),
    };
  }

  if (executionHeld) {
    return {
      mapId: snapshot.mapId,
      title: snapshot.title,
      label: needsSourceRows
        ? '실행 항목 준비 중'
        : needsMedicalSourceFit
          ? '시작 시기 확인 필요'
          : '최신 공식 내용 확인 필요',
      tone: 'amber',
      status: 'review_before_apply',
      canApplyAutomatically: false,
      reasons,
      affectedCount,
      affectedFlowSlugs,
      comparisonRows,
      savedVersion: assessment.savedVersion,
      ...(assessment.currentVersion ? { currentVersion: assessment.currentVersion } : {}),
      ...(snapshot.anchor ? { anchor: snapshot.anchor } : {}),
      ...(savedRecord ? { savedRecord } : {}),
      ...(currentRecord ? { currentRecord } : {}),
      executionHeld: true,
      executionHoldReason: qualityDecision.executionHoldReason,
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
    ...(savedRecord ? { savedRecord } : {}),
    ...(currentRecord ? { currentRecord } : {}),
    ...(versionReview ? { versionReview } : {}),
  };
}

function getFlowVersionReviewItemLabel(item: FlowVersionReviewItem): string {
  if (item.kind === 'added') return '새 할 일';
  if (item.kind === 'removed') return '빠진 할 일';
  return item.hasPersonalConflict ? '내 수정과 겹침' : '내용 바뀜';
}

function getFlowVersionReviewItemChoices(
  item: FlowVersionReviewItem,
): [FlowVersionReviewSelection, string, string][] {
  if (item.kind === 'added') {
    return [
      ['include', '새 실행에 추가', '새로 생긴 할 일을 이번 실행에 넣어요.'],
      ['exclude', '이번에는 제외', '새 내용은 확인했지만 이번 실행에는 넣지 않아요.'],
    ];
  }

  if (item.kind === 'removed') {
    return [
      ['keep_removed', '내 할 일로 유지', '원문에서 빠져도 내 사본에는 그대로 남겨요.'],
      ['exclude', '새 실행에서 제외', '지난 실행 기록에만 남기고 새 실행에서는 빼요.'],
    ];
  }
  return item.hasPersonalConflict
    ? [
        ['use_latest_keep_personal', '새 내용에 내 수정 유지', '바뀐 원문을 쓰되 내가 정한 제목·메모·날짜를 이어가요.'],
        ['use_latest', '새 내용만 사용', '겹치는 내 수정을 지우고 새 원문 기준으로 시작해요.'],
        ['keep_current', '현재 내용 유지', '이번 새 실행도 지금 쓰던 원문 내용으로 시작해요.'],
      ]
    : [
        ['use_latest', '새 내용 사용', '바뀐 원문 기준으로 새 실행을 시작해요.'],
        ['keep_current', '현재 내용 유지', '이번 새 실행도 지금 쓰던 내용으로 시작해요.'],
      ];
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
  if (isRetiredPersonalCopyBundle(flow.bundle)) {
    return { kind: 'retired', label: '이전 저장본', groupLabel: '내 이전 기록' };
  }
  if (isUrlFirstDraftSavedFlow(flow)) {
    return { kind: 'ready', label: '실행 가능' };
  }
  if (flow.savedMap) {
    return { kind: 'ready', label: '실행 가능' };
  }
  if (flow.bundle.flow.status === 'published') {
    if (getPublicFlowIndexingPolicy(flow.bundle).indexable) {
      return { kind: 'ready', label: '실행 가능' };
    }
    return { kind: 'review', label: '실행 보류', groupLabel: '확인 후 실행' };
  }
  const sourceStatus = flow.bundle.flow.source_status;
  const sourceBacked = flow.progress.slug.startsWith('source-backed-') || Boolean(flow.bundle.flow.tags?.includes('source-backed'));
  if (sourceBacked || sourceStatus === 'real' || serviceCatalogFlowSlugs.has(flow.progress.slug)) return { kind: 'ready', label: '실행 가능' };
  if (sourceStatus === 'preview') return { kind: 'preview', label: '실행 보류', groupLabel: '확인 후 실행' };
  if (sourceStatus === 'needs_review') return { kind: 'review', label: '실행 보류', groupLabel: '확인 후 실행' };
  return { kind: 'legacy', label: '예전 저장', groupLabel: '예전 저장 콘텐츠' };
}

function isMyFlowReadyContent(flow: MySavedFlow): boolean {
  return getMyFlowContentReadiness(flow).kind === 'ready';
}

function getMyFlowContentReadinessNote(readiness: MyFlowContentReadiness): string {
  if (readiness.kind === 'ready') return '내 Flow에서 실행할 수 있습니다.';
  if (readiness.kind === 'review') return '현재 공개 실행에서 제외된 기록입니다. 원문 확인 전에는 완료 항목으로 사용하지 않습니다.';
  if (readiness.kind === 'preview') return '아직 공개 실행 전인 기록입니다. 원문 확인 전에는 완료 항목으로 사용하지 않습니다.';
  if (readiness.kind === 'retired') return '공개가 끝난 Flow의 내 기록입니다. 완료 기록과 메모는 이 기기에 남아 있어요.';
  return '예전 저장 방식입니다. 새 콘텐츠와 구분해서 봅니다.';
}

function getMyFlowRoutineDays(bundle: FlowBundle): string[] {
  const labels = getRoutineWeekdayLabels(bundle.repeatRules?.[0] ?? '', []);
  return labels.length ? labels : ['월', '수', '금'];
}

const MY_FLOW_UX12_DEMO_FIXTURES: MyFlowDemoFixture[] = [
  { slug: 'washer-tub-clean-monthly', anchor: '2026-05-27', completedCount: 0, group: '가전', note: '통세척 관리' },
  { slug: 'travel-packing-list', anchor: '2026-06-20', completedCount: 0, group: '생활 준비', note: '짐 싸기' },
  { slug: 'pet-health-observation', anchor: '2026-06-05', completedCount: 0, group: '반려동물', note: '건강 상담' },
  { slug: 'moving-d30-basic', anchor: '2026-06-26', completedCount: 2, group: '이사/결혼', note: 'D-day 일정' },
  { slug: 'wedding-d180-basic', anchor: '2026-11-24', completedCount: 5, group: '이사/결혼', note: '장기 일정' },
  { slug: 'computer-skills-d30-study', anchor: '2026-06-27', completedCount: 2, group: '공부', note: '공부 진도표' },
  { slug: 'samsung-aircon-seasonal-check', anchor: '2026-07-03', completedCount: 1, group: '가전', note: '에어컨 점검' },
  { slug: 'curated-allblanc-lower-body', anchor: '2026-05-22', completedCount: 1, group: '운동', note: '하체 운동' },
  { slug: 'vehicle-inspection-prep', anchor: '2026-06-17', completedCount: 3, group: '자동차', note: '검사 준비' },
  { slug: 'passport-renewal-docs', anchor: '2026-06-15', completedCount: 2, group: '여행/서류', note: '서류 메모' },
  { slug: 'baby-food-menu-recipe', anchor: '2026-05-28', completedCount: 4, group: '육아', note: '식단 캘린더' },
  { slug: 'curated-allblanc-morning-workout', anchor: '2026-06-03', completedCount: 1, group: '운동', note: '아침 운동' },
  { slug: 'curated-allblanc-no-jump-cardio', anchor: '2026-06-02', completedCount: 1, group: '운동', note: '유산소' },
  { slug: 'english-study-30day-routine', anchor: '2026-06-02', completedCount: 3, group: '공부', note: '학습 루틴' },
  { slug: 'real-samsung-washer-filter-care', anchor: '2026-06-03', completedCount: 1, group: '가전', note: '세탁기 관리' },
  { slug: 'tax-refund-find', completedCount: 2, group: '행정/지원', note: '환급 확인' },
  { slug: 'first-passport-issue', anchor: '2026-06-10', completedCount: 1, group: '여행/서류', note: '신규 발급' },
  { slug: 'used-car-buying-check', completedCount: 1, group: '자동차', note: '결정 체크' },
];

const MY_FLOW_UX20_DEMO_FIXTURES: MyFlowDemoFixture[] = [
  ...MY_FLOW_UX12_DEMO_FIXTURES,
  { slug: 'portfolio-4week', anchor: '2026-07-01', completedCount: 1, group: '커리어', note: '포트폴리오' },
  { slug: 'adult-vaccine-schedule-check', anchor: '2026-06-18', completedCount: 1, group: '건강', note: '접종 상담' },
  { slug: 'childcare-fee-support-apply', completedCount: 1, group: '육아', note: '보육료 신청' },
  { slug: 'pet-registration-basic', completedCount: 1, group: '반려동물', note: '등록 준비' },
  { slug: 'infant-health-checkup-schedule', completedCount: 1, group: '육아', note: '검진 일정' },
  { slug: 'safe-inheritance-onestop', completedCount: 1, group: '행정/지원', note: '상속 조회' },
  { slug: 'welfare-benefit-finder', completedCount: 1, group: '행정/지원', note: '지원 확인' },
  { slug: 'unemployment-benefit-apply', completedCount: 1, group: '행정/지원', note: '급여 신청' },
  { slug: 'blog-youtube-start', completedCount: 2, group: '콘텐츠', note: '영상 기획' },
  { slug: 'new-car-delivery-check', completedCount: 1, group: '자동차', note: '인수 점검' },
  { slug: 'weekly-meal-plan', anchor: '2026-06-01', completedCount: 1, group: '식단/독서', note: '저녁 계획' },
  { slug: 'reading-habit-30day', anchor: '2026-06-01', completedCount: 1, group: '식단/독서', note: '읽기 습관' },
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

function getMyFlowMonthEnd(date: string): string {
  const [year, month] = date.slice(0, 7).split('-').map(Number);
  return formatMyFlowLocalDate(new Date(year, month, 0));
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

function formatMyFlowLocalTimeLabel(time?: string): string {
  if (!isPersonalStructuralLocalTime(time)) return '';
  const [hourValue, minuteValue] = time.split(':').map(Number);
  const period = hourValue < 12 ? '오전' : '오후';
  const hour = hourValue % 12 || 12;
  return `${period} ${hour}:${String(minuteValue).padStart(2, '0')}`;
}

function formatMyFlowDurationLabel(durationMinutes?: number): string {
  if (!durationMinutes || durationMinutes < 1) return '';
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (!hours) return `${minutes}분`;
  if (!minutes) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

function formatMyFlowTimedScheduleLabel(
  schedule?: PersonalStructuralScheduleProjection,
): string {
  if (schedule?.scheduleState !== 'timed') return '';
  return [
    formatMyFlowLocalTimeLabel(schedule.startTime),
    formatMyFlowDurationLabel(schedule.durationMinutes),
  ].filter(Boolean).join(' · ');
}

function getCurrentDeviceTimeZone(): string | undefined {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isPersonalStructuralIanaTimeZone(timeZone) ? timeZone : undefined;
  } catch {
    return undefined;
  }
}

function isPersonalDraftDurationValid(durationMinutes?: number): boolean {
  return Boolean(
    typeof durationMinutes === 'number' &&
      Number.isInteger(durationMinutes) &&
      durationMinutes >= PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES &&
      durationMinutes <= PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES &&
      durationMinutes % 5 === 0,
  );
}

const PERSONAL_DRAFT_RECURRENCE_WEEKDAY_OPTIONS: {
  value: PersonalStructuralWeekday;
  label: string;
}[] = [
  { value: 'MO', label: '월' },
  { value: 'TU', label: '화' },
  { value: 'WE', label: '수' },
  { value: 'TH', label: '목' },
  { value: 'FR', label: '금' },
  { value: 'SA', label: '토' },
  { value: 'SU', label: '일' },
];

type PersonalDraftRecurrenceEditorState = {
  mode: '' | 'daily' | 'weekly' | 'monthly';
  interval: number;
  weekdays: PersonalStructuralWeekday[];
  endMode: 'never' | 'until' | 'count';
  untilDate: string;
  occurrenceCount: number;
};

function getPersonalDraftDateWeekday(date: string): PersonalStructuralWeekday {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return PERSONAL_STRUCTURAL_WEEKDAYS[(weekday + 6) % 7];
}

function getPersonalDraftRecurrenceEditorState(
  repeat: PersonalStructuralRepeat | undefined,
  startDate: string,
): PersonalDraftRecurrenceEditorState {
  const fallback: PersonalDraftRecurrenceEditorState = {
    mode: '',
    interval: 1,
    weekdays: startDate ? [getPersonalDraftDateWeekday(startDate)] : ['MO'],
    endMode: 'never',
    untilDate: '',
    occurrenceCount: 10,
  };
  if (!repeat) return fallback;

  let rule: PersonalStructuralRecurrenceRule | undefined;
  if ('schemaVersion' in repeat) {
    rule = [...repeat.revisions]
      .sort((left, right) =>
        left.effectiveFrom.localeCompare(right.effectiveFrom) ||
        left.revision - right.revision,
      )
      .at(-1)?.rule;
  } else {
    rule = repeat;
  }
  if (!rule) return fallback;

  const end = rule.end as PersonalStructuralRecurrenceEnd | undefined;
  return {
    mode: rule.frequency,
    interval: rule.interval,
    weekdays:
      rule.frequency === 'weekly' && rule.weekdays?.length
        ? rule.weekdays
        : fallback.weekdays,
    endMode: end?.mode ?? 'never',
    untilDate: end?.mode === 'until' ? end.date : '',
    occurrenceCount: end?.mode === 'count' ? end.count : 10,
  };
}

function formatPersonalDraftRecurrenceSummary(
  repeat: PersonalStructuralRepeat | undefined,
  startDate: string,
): string {
  const recurrence = getPersonalDraftRecurrenceEditorState(repeat, startDate);
  if (!recurrence.mode) return '';
  const interval = recurrence.interval;
  const base = recurrence.mode === 'daily'
    ? interval === 1 ? '매일' : `${interval}일마다`
    : recurrence.mode === 'weekly'
      ? interval === 1 ? '매주' : `${interval}주마다`
      : interval === 1 ? '매월' : `${interval}개월마다`;
  const weekdays = recurrence.mode === 'weekly'
    ? ` ${recurrence.weekdays
        .map((weekday) =>
          PERSONAL_DRAFT_RECURRENCE_WEEKDAY_OPTIONS.find(
            (option) => option.value === weekday,
          )?.label,
        )
        .filter(Boolean)
        .join('·')}`
    : '';
  const end = recurrence.endMode === 'until'
    ? ` · ${formatMyFlowDisplayDate(recurrence.untilDate)}까지`
    : recurrence.endMode === 'count'
      ? ` · ${recurrence.occurrenceCount}회`
      : '';
  return `${base}${weekdays}${end}`;
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

function stripMyFlowInternalMemoLines(text?: string): string | undefined {
  return stripUserFacingInternalLines(text);
}

function formatSourcePublishedDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const [, year, month, day] = match;
  return `${year}년 ${Number(month)}월 ${Number(day)}일`;
}

function formatMyFlowDetailMemo(detail: FlowItemDetail, row?: MyFlowRow, item?: FlowItem): string {
  const checklistItems = getMyFlowDetailChecklistItems(detail);
  const parts = [
    stripMyFlowInternalMemoLines(detail.why),
    checklistItems.length > 0 ? undefined : stripMyFlowInternalMemoLines(detail.how),
    stripMyFlowInternalMemoLines(visibleCompletionCriteria(detail)),
  ].filter(Boolean);
  if (parts.length > 0) return parts.join('\n\n');
  const itemDescription = stripMyFlowInternalMemoLines(item?.description);
  if (itemDescription) return itemDescription;
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

function stripMyFlowTimingPrefixFromTitle(title: string): string {
  return title.replace(/^D(?:-\d+|\+\d+(?:~D\+\d+)?|-Day|Day):?\s+/i, '').trim() || title;
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
  if (rows.length === 0) return {};

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
type MyFlowScheduleFlowGridGroup = {
  key: string;
  title: string;
  shortTitle: string;
  color: string;
  rows: MyFlowCalendarRow[];
};

const MY_FLOW_ROUTINE_ICON_LIMIT = 2;
const MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT = 2;
const MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT = 2;
const MY_FLOW_CALENDAR_GRID_COMPACT_FLOW_THRESHOLD = 3;
const MY_FLOW_MOBILE_STRUCTURE_STEP_PREVIEW_LIMIT = 5;
type MyFlowRoutineIconKind = 'study' | 'running' | 'workout' | 'meal' | 'maintenance' | 'routine';

function getMyFlowCalendarRowKey(flowSlug: string, rowId: string, originalDate: string): string {
  return getMyFlowDateOverrideKey(flowSlug, rowId, originalDate);
}

function getMyFlowManualScheduleKey(flowSlug: string, rowId: string): string {
  return getMyFlowCalendarRowKey(flowSlug, rowId, 'none');
}

function getMyFlowRowInstanceKey(row: MyFlowCalendarRow): string {
  return row.calendarKey ?? `${row.flow.progress.slug}::${row.id}::${row.date ?? 'none'}`;
}

function mapPersonalDraftProjectionRowToMyFlowRow(
  bundle: FlowBundle,
  sourceRows: MyFlowRow[],
  projectionRow: PersonalStructuralProjectionRow<FlowItem>,
): MyFlowRow | undefined {
  const structuralMetadata = {
    structuralOwnership: projectionRow.ownership,
    structuralProjectionOrderRank: projectionRow.personalOrderRank,
    structuralCalendarIcsEligible:
      projectionRow.destinationEligibility.calendarIcs,
    structuralProjectionStableId: projectionRow.itemId,
    ...(projectionRow.schedule ? { structuralSchedule: projectionRow.schedule } : {}),
    structuralScheduleProjection: projectionRow.scheduleProjection,
    ...(projectionRow.schedule?.mode === 'fixed_date' && projectionRow.schedule.repeat
      ? { structuralRepeat: projectionRow.schedule.repeat }
      : {}),
  };

  if (projectionRow.ownership === 'source') {
    const sourceRow = sourceRows.find((row) => row.id === projectionRow.itemId);
    if (!sourceRow) return undefined;
    const { date: _sourceDate, ...sourceRowWithoutDate } = sourceRow;
    return withMyFlowItemType(bundle, {
      ...sourceRowWithoutDate,
      title: projectionRow.title,
      ...(projectionRow.calendarDate ? { date: projectionRow.calendarDate } : {}),
      ...structuralMetadata,
    });
  }

  return withMyFlowItemType(bundle, {
    id: projectionRow.itemId,
    title: projectionRow.title,
    section: '내가 추가한 할 일',
    ...(projectionRow.calendarDate ? { date: projectionRow.calendarDate } : {}),
    ...(projectionRow.schedule?.mode === 'anchor_offset'
      ? {
          timing: `D${
            projectionRow.schedule.dayOffset >= 0 ? '+' : ''
          }${projectionRow.schedule.dayOffset}`,
        }
      : {}),
    ...(projectionRow.personalMemo
      ? {
          detail: {
            item_id: projectionRow.itemId,
            why: projectionRow.personalMemo,
          },
        }
      : {}),
    ...structuralMetadata,
  });
}

function getMyFlowPersonalCopyStepOverride(
  flow: MySavedFlow,
  rowId: string,
): SourceBackedFlowMapPersonalCopyStepOverride | undefined {
  return flow.savedMap?.personalCopy?.stepOverridesByFlow?.[flow.progress.slug]?.[baseStateId(rowId)];
}

function getMyFlowPersonalCopyStepDateOverride(flow: MySavedFlow, rowId: string): string | undefined {
  const schedule = getMyFlowPersonalCopyStepOverride(flow, rowId)?.schedule;
  return schedule?.mode === 'fixed_date' ? schedule.date : undefined;
}

function getMyFlowPersonalCopyStepDraft(row: MyFlowCalendarRow): MyFlowItemDraft {
  const override = getMyFlowPersonalCopyStepOverride(row.flow, row.id);
  if (!override) return {};
  return {
    ...(override.title ? { title: override.title } : {}),
    ...(override.schedule?.mode === 'fixed_date' ? { date: override.schedule.date } : {}),
    ...(override.userMemo ? { memo: override.userMemo } : {}),
  };
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

function getStableCalendarFlowMarkerIndex(key: string): number {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return hash % calendarFlowMarkerColors.length;
}

function getMyFlowCalendarFlowTitle(flow: MySavedFlow): string {
  if (flow.savedMap?.title) return toUserFacingMapTitle(flow.savedMap.title);
  return toContentDisplayTitle(getMyFlowExecutionFlowTitle(flow.progress.title));
}

function getMyFlowCalendarFlowMarker(flow: MySavedFlow): MyFlowFlowMarker {
  const key = flow.savedMap?.mapId || flow.progress.slug;
  const title = getMyFlowCalendarFlowTitle(flow);
  const titleCharacters = Array.from(title.trim());
  return {
    key,
    color: calendarFlowMarkerColors[getStableCalendarFlowMarkerIndex(key)],
    title,
    shortTitle: getMyFlowCalendarShortTitle(title),
    initial: titleCharacters[0] ?? 'F',
  };
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
  const { bundles, persist } = useBundles();
  const myFlowBundles = useMemo(() => mergeSourceBackedMyFlowBundles(bundles), [bundles]);
  const currentUser = getCurrentUser();
  const isCalendarSurface = surface === 'calendar';
  const [savedMapIdParam, setSavedMapIdParam] = useState('');
  const [activeProgress, setActiveProgress] = useState<ReturnType<typeof getActiveFlowProgress>>([]);
  const [savedView, setSavedView] = useState<MyFlowView>(initialView);
  const [myFlowVisibleMonth, setMyFlowVisibleMonth] = useState(getMyFlowMonthStart(formatLocalDate(new Date())));
  const [myFlowSelectedDate, setMyFlowSelectedDate] = useState(formatLocalDate(new Date()));
  const [selectedSavedFlowSlug, setSelectedSavedFlowSlug] = useState('all');
  const [myFlowCalendarScope, setMyFlowCalendarScope] = useState<MyFlowCalendarScope>('all');
  const [checklistFilter, setChecklistFilter] = useState<ChecklistFilter>('all');
  const [flowListFilter, setFlowListFilter] = useState<FlowListFilter>('all');
  const [flowListQuery, setFlowListQuery] = useState('');
  const [checksBySlug, setChecksBySlug] = useState<Record<string, Record<string, boolean>>>({});
  const [savedFlowMapBySlug, setSavedFlowMapBySlug] = useState<Record<string, SavedFlowMapSnapshot>>({});
  const [savedFlowMapPersistenceById, setSavedFlowMapPersistenceById] = useState<Record<string, SourceBackedFlowMapPersistenceRecord>>({});
  const [myFlowDateOverrides, setMyFlowDateOverrides] = useState<Record<string, string>>({});
  const [myFlowOccurrenceExecutionRecords, setMyFlowOccurrenceExecutionRecords] = useState<
    Record<string, PersonalStructuralOccurrenceExecutionRecord>
  >({});
  const [myFlowHiddenFlowSlugs, setMyFlowHiddenFlowSlugs] = useState<string[]>([]);
  const [myFlowItemDrafts, setMyFlowItemDrafts] = useState<Record<string, MyFlowItemDraft>>({});
  const [myFlowEditingDrafts, setMyFlowEditingDrafts] = useState<Record<string, MyFlowItemDraft>>({});
  const [myFlowStepItemChecks, setMyFlowStepItemChecks] = useState<MyFlowStepItemChecks>({});
  const [myFlowCompletionFeedbackBySlug, setMyFlowCompletionFeedbackBySlug] = useState<Record<string, MyFlowCompletionFeedback>>({});
  const [myFlowCompletionFeedbackDraft, setMyFlowCompletionFeedbackDraft] = useState<MyFlowCompletionFeedbackDraft | null>(null);
  const [myFlowReuseDraft, setMyFlowReuseDraft] = useState<MyFlowReuseDraft | null>(null);
  const [myFlowReuseNotice, setMyFlowReuseNotice] = useState<MyFlowReuseNotice | null>(null);
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
  const [myFlowHandledSavedMapId, setMyFlowHandledSavedMapId] = useState('');
  const [myFlowPostSaveWorkspaceOpen, setMyFlowPostSaveWorkspaceOpen] = useState(false);
  const [myFlowStepCopiedKey, setMyFlowStepCopiedKey] = useState('');
  const [myFlowStepCopiedLabel, setMyFlowStepCopiedLabel] = useState<string>(FLOW_EXPORT_FEEDBACK.memoCopied);
  const [myFlowStepDownloadedKey, setMyFlowStepDownloadedKey] = useState('');
  const [myFlowPersonalCopySettingsDraft, setMyFlowPersonalCopySettingsDraft] = useState<MyFlowPersonalCopySettingsDraft | null>(null);
  const [myFlowDirectAnchorSettingsDraft, setMyFlowDirectAnchorSettingsDraft] = useState<MyFlowDirectAnchorSettingsDraft | null>(null);
  const [myFlowStructuralOverlaysBySlug, setMyFlowStructuralOverlaysBySlug] = useState<Record<string, PersonalStructuralOverlay>>({});
  const [myFlowStructuralAddOpenSlug, setMyFlowStructuralAddOpenSlug] = useState('');
  const [myFlowStructuralAddTitle, setMyFlowStructuralAddTitle] = useState('');
  const [myFlowStructuralUndo, setMyFlowStructuralUndo] = useState<PersonalDraftStructuralUndo | null>(null);
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
    setMyFlowPersonalCopySettingsDraft(null);
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
    const mapIndex = getSavedFlowMapIndexByFlowSlug();
    setActiveProgress(progress);
    setChecksBySlug(Object.fromEntries(progress.map((item) => [item.slug, getChecks(item.slug)])));
    setSavedFlowMapBySlug(mapIndex);
    setSavedFlowMapPersistenceById(
      Object.fromEntries(
        Array.from(new Set(Object.values(mapIndex).map((snapshot) => snapshot.mapId))).flatMap((mapId) => {
          const record = getStoredMyFlowMapPersistenceRecord(mapId);
          return record ? [[mapId, record] as const] : [];
        }),
      ),
    );
    setMyFlowStepItemChecks(getMyFlowStepItemChecks());
    setMyFlowOccurrenceExecutionRecords(getStoredMyFlowOccurrenceExecutionRecords());
    setMyFlowCompletionFeedbackBySlug(
      Object.fromEntries(
        progress.flatMap((item) => {
          const feedback = getMyFlowCompletionFeedback(item.slug);
          return feedback ? [[item.slug, feedback] as const] : [];
        }),
      ),
    );
    if (typeof window !== 'undefined') {
      setMyFlowStructuralOverlaysBySlug(
        Object.fromEntries(
          progress.flatMap((item) => {
            const bundle = myFlowBundles.find((entry) => entry.flow.slug === item.slug);
            if (!bundle || !isPersonalDraftStructuralEditEligible(bundle)) return [];
            const loaded = loadOrMigratePersonalStructuralOverlay(window.localStorage, {
              savedCopyId: bundle.flow.slug,
              flowId: bundle.flow.id,
            });
            return [[bundle.flow.slug, loaded.overlay] as const];
          }),
        ),
      );
    }
  };

  useEffect(() => {
    const demoMode = getMyFlowDemoMode();
    setMyFlowDemoMode(demoMode);
    if (demoMode === 'ux12' || demoMode === 'ux20' || demoMode === 'source-backed') {
      const demoState = buildMyFlowDemoState(myFlowBundles, getMyFlowDemoFixtures(demoMode));
      setActiveProgress(demoState.progress);
      setChecksBySlug(demoState.checksBySlug);
      setSavedFlowMapBySlug(demoState.savedFlowMapBySlug);
      setSavedFlowMapPersistenceById({});
      setSelectedSavedFlowSlug('all');
      setSavedView(initialView);
      setMyFlowVisibleMonth(getMyFlowMonthStart('2026-05-28'));
      setMyFlowSelectedDate('2026-05-28');
      setFlowListFilter('all');
      setFlowListQuery('');
      setMyFlowDateOverrides({});
      setMyFlowOccurrenceExecutionRecords({});
      setMyFlowHiddenFlowSlugs([]);
      setMyFlowItemDrafts({});
      setMyFlowEditingDrafts({});
      setMyFlowStepItemChecks({});
      setMyFlowReuseDraft(null);
      setMyFlowReuseNotice(null);
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
      setMyFlowPersonalCopySettingsDraft(null);
      setMyFlowDirectAnchorSettingsDraft(null);
      setMyFlowStructuralOverlaysBySlug({});
      setMyFlowStructuralAddOpenSlug('');
      setMyFlowStructuralAddTitle('');
      setMyFlowStructuralUndo(null);
      return;
    }
    if (demoMode === 'legacy') seedMyFlowDemoState(myFlowBundles);
    setMyFlowItemDrafts(getStoredMyFlowItemDrafts());
    setMyFlowDateOverrides(getStoredMyFlowDateOverrides());
    setMyFlowHiddenFlowSlugs(getStoredMyFlowHiddenFlowSlugs());
    setMyFlowDismissedMapUpdates(getMyFlowDismissedMapUpdates());
    setMyFlowExpandedMapUpdateId('');
    setMyFlowReuseDraft(null);
    setMyFlowReuseNotice(null);
    refreshSavedFlowState();
  }, [initialView, myFlowBundles]);

  const demoFixtureBySlug = new Map(getMyFlowDemoFixtures(myFlowDemoMode).map((fixture) => [fixture.slug, fixture]));

  const savedFlows: MySavedFlow[] = activeProgress.reduce<MySavedFlow[]>((items, progress) => {
      const progressBundle = myFlowBundles.find((entry) => entry.flow.slug === progress.slug);
      if (!progressBundle) return items;
      const demoFixture = demoFixtureBySlug.get(progress.slug);
      const anchor = progress.anchor ?? '';
      const checks = checksBySlug[progress.slug] ?? {};
      const itemStates = getItemStates(progress.slug);
      const savedMap = savedFlowMapBySlug[progress.slug];
      const effectiveBundle = applySourceBackedPersistenceRecordToBundle(
        progressBundle,
        savedMap ? savedFlowMapPersistenceById[savedMap.mapId] : undefined,
        savedMap?.personalCopy,
      );
      const sourceRows = getMyFlowRows(effectiveBundle, anchor);
      const structuralEditEligible = isPersonalDraftStructuralEditEligible(effectiveBundle);
      const structuralOverlay = structuralEditEligible
        ? myFlowStructuralOverlaysBySlug[progress.slug] ?? createPersonalDraftStructuralOverlay(effectiveBundle)
        : undefined;
      const legacyExcludedItemIds = structuralOverlay
        ? effectiveBundle.items
            .map((item) => item.id)
            .filter((itemId) => isUrlFirstStartExcludedItemState(itemStates, itemId))
        : [];
      const projectionStructuralOverlay = structuralOverlay && legacyExcludedItemIds.length > 0
        ? {
            ...structuralOverlay,
            selection: {
              ...structuralOverlay.selection,
              excludedItemIds: Array.from(new Set([
                ...structuralOverlay.selection.excludedItemIds,
                ...legacyExcludedItemIds,
              ])),
            },
          }
        : structuralOverlay;
      const structuralExecutionStates: PersonalStructuralExecutionState[] = projectionStructuralOverlay
        ? Array.from(new Set([
            ...effectiveBundle.items.map((item) => item.id),
            ...projectionStructuralOverlay.userItems.map((item) => item.itemId),
          ])).map((itemId) => {
            const checkIds = getMyFlowCheckIds(effectiveBundle, itemId, anchor);
            const state: PersonalStructuralExecutionState['state'] = isItemStateSkipped(itemStates, itemId)
              ? 'skipped'
              : checkIds.length > 0 && checkIds.every((checkId) => checks[checkId])
                ? 'done'
                : 'pending';
            return { itemId, state };
          })
        : [];
      const structuralProjection = projectionStructuralOverlay
        ? buildPersonalDraftStructuralProjection({
            bundle: effectiveBundle,
            structuralOverlay: projectionStructuralOverlay,
            valueOverlays: buildPersonalDraftProjectionValueOverlays({
              flowSlug: progress.slug,
              sourceItemIds: effectiveBundle.items.map((item) => item.id),
              structuralOverlay: projectionStructuralOverlay,
              itemDrafts: myFlowItemDrafts,
              dateOverrides: myFlowDateOverrides,
            }),
            executionStates: structuralExecutionStates,
            anchorDate: anchor,
          })
        : undefined;
      const structuralRows = structuralProjection
        ? structuralProjection.effectiveRows.flatMap((projectionRow) => {
            const row = mapPersonalDraftProjectionRowToMyFlowRow(
              effectiveBundle,
              sourceRows,
              projectionRow,
            );
            return row ? [row] : [];
          })
        : sourceRows;
      const projectionRows = structuralProjection
        ? structuralProjection.rowsByDestination.calendarScreen.flatMap((projectionRow) => {
            const row = mapPersonalDraftProjectionRowToMyFlowRow(
              effectiveBundle,
              sourceRows,
              projectionRow,
            );
            return row && !isUrlFirstStartExcludedItemState(itemStates, row.id)
              ? [row]
              : [];
          })
        : sourceRows.filter((row) => !isUrlFirstStartExcludedItemState(itemStates, row.id));
      const excludedRows = structuralProjection
        ? structuralProjection.excludedRows.flatMap((projectionRow) => {
            const row = mapPersonalDraftProjectionRowToMyFlowRow(
              effectiveBundle,
              sourceRows,
              projectionRow,
            );
            return row ? [row] : [];
          })
        : structuralRows.filter((row) => isUrlFirstStartExcludedItemState(itemStates, row.id));
      const rows = structuralProjection
        ? structuralRows
        : structuralRows.filter((row) => !isUrlFirstStartExcludedItemState(itemStates, row.id));
      const executableIds = Array.from(new Set(rows.flatMap((row) => getMyFlowCheckIds(effectiveBundle, row.id, anchor))));
      const executableTotal = executableIds.filter((id) => !isItemStateSkipped(itemStates, id)).length;
      const total = structuralEditEligible
        ? executableTotal
        : savedMap
          ? executableTotal
          : Math.max(executableTotal, progress.total);
      const done = executableIds.filter((id) => checks[id] && !isItemStateSkipped(itemStates, id)).length;
      const anchorDisplay = getMyFlowAnchorDisplay(progressBundle, anchor, myFlowDemoMode);
      const meta = [
        anchorDisplay,
        `전체 ${done}/${total} 완료`,
        progress.skipped ? `${progress.skipped}개 제외` : null,
      ].filter(Boolean).join(' · ');
      items.push({
        progress,
        bundle: effectiveBundle,
        anchor,
        checks,
        itemStates,
        rows,
        ...(structuralEditEligible ? { projectionRows } : {}),
        ...(structuralProjection ? { structuralProjection } : {}),
        excludedRows,
        done,
        total,
        percent: total ? Math.round((done / total) * 100) : 0,
        meta,
        ...(savedMap ? { savedMap } : {}),
        ...(demoFixture ? { demoGroup: demoFixture.group, demoNote: demoFixture.note } : {}),
      });
      return items;
    }, []);

  const workspaceSavedFlows = isCalendarSurface
    ? savedFlows.filter(isMyFlowReadyContent)
    : savedFlows;

  useEffect(() => {
    if (selectedSavedFlowSlug !== 'all' && !workspaceSavedFlows.some((flow) => flow.progress.slug === selectedSavedFlowSlug)) {
      setSelectedSavedFlowSlug('all');
    }
  }, [selectedSavedFlowSlug, workspaceSavedFlows]);

  const visibleSavedFlows = selectedSavedFlowSlug === 'all'
    ? workspaceSavedFlows
    : workspaceSavedFlows.filter((flow) => flow.progress.slug === selectedSavedFlowSlug);
  const visibleExecutionFlows = visibleSavedFlows.filter(isMyFlowReadyContent);
  const savedFlowMapSnapshots = Array.from(
    Object.values(savedFlowMapBySlug).reduce((snapshots, snapshot) => snapshots.set(snapshot.mapId, snapshot), new Map<string, SavedFlowMapSnapshot>()).values(),
  );
  const myFlowMapUpdateNotices = savedFlowMapSnapshots.flatMap((snapshot) => {
    const notice = getMyFlowMapUpdateNotice(snapshot, savedFlowMapPersistenceById[snapshot.mapId]);
    if (notice && !notice.executionHeld && isMyFlowMapUpdateDismissed(notice, myFlowDismissedMapUpdates)) return [];
    return notice ? [notice] : [];
  });
  const postSaveMap = savedMapIdParam ? savedFlowMapSnapshots.find((snapshot) => snapshot.mapId === savedMapIdParam) : undefined;
  const postSaveFlows = postSaveMap
    ? savedFlows.filter((flow) => postSaveMap.flowSlugs.includes(flow.progress.slug))
    : [];
  const hasPostSavePanel = Boolean(postSaveMap && postSaveFlows.length > 0 && (!isMyFlowScenarioDemo || savedMapIdParam));
  const showPostSavePanel = hasPostSavePanel && !myFlowPostSaveWorkspaceOpen;
  const showMyFlowWorkspace = workspaceSavedFlows.length > 0;
  const shouldCollapseFlowInventory =
    savedFlows.length >= 6 &&
    selectedSavedFlowSlug === 'all' &&
    flowListFilter === 'all' &&
    flowListQuery.trim().length === 0;
  const shouldGroupFlowInventory = savedFlows.length >= 20 || isMyFlowScenarioDemo;
  const showMyFlowSidebar = workspaceSavedFlows.length > 1 && workspaceSavedFlows.length < 20 && savedView === 'flow';
  const showFlowInventory = !shouldCollapseFlowInventory || myFlowInventoryOpen;
  const showMyFlowScopeControl = !isMyFlowMobileViewport && workspaceSavedFlows.length > 1;
  const getMyFlowDraftItemDateOverride = (flow: MySavedFlow, rowId: string): string | undefined =>
    isUrlFirstDraftSavedFlow(flow)
      ? myFlowDateOverrides[getPersonalDraftProjectionValueKey(flow.progress.slug, rowId)]
      : undefined;
  const resolveSavedFlowRowDate = (
    flow: MySavedFlow,
    row: MyFlowRow,
    sourceDate: string | undefined = row.date,
  ) => resolveMyFlowEffectiveDate({
    flowSlug: flow.progress.slug,
    itemId: row.id,
    sourceDate,
    dateOverrides: myFlowDateOverrides,
    draftDateOverride: getMyFlowDraftItemDateOverride(flow, row.id),
    personalCopyDateOverride: getMyFlowPersonalCopyStepDateOverride(flow, row.id),
  });
  const getSavedFlowNextRow = (flow: MySavedFlow) => {
    const row = flow.rows.find((candidate) => !isMyFlowRowChecked(flow, candidate));
    if (!row || row.structuralOccurrenceId) return row;
    const resolution = resolveSavedFlowRowDate(flow, row);
    return { ...row, date: resolution.date };
  };
  const getMyFlowRoutineWeekdays = (flow: MySavedFlow) =>
    myFlowRoutineRuleDrafts[flow.progress.slug]?.weekdays ??
    flow.progress.weekdays ??
    getRoutineWeekdayLabels(flow.bundle.repeatRules?.[0] ?? '', []);
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
    const savedRecord = getSavedFlowRecord(flow.progress.slug);
    if (savedRecord && nextDraft.weekdays?.length) {
      saveFlowRecord(flow.progress.slug, {
        selectedArtifactMode: savedRecord.selectedArtifactMode,
        ...(savedRecord.anchor ? { anchor: savedRecord.anchor } : {}),
        weekdays: nextDraft.weekdays,
      });
    }
  };
  const occurrenceProjectionTodayDate = showDemoData ? '2026-05-28' : formatLocalDate(new Date());
  const occurrenceVisibleRange = {
    start: getMyFlowMonthStart(myFlowVisibleMonth),
    end: getMyFlowMonthEnd(myFlowVisibleMonth),
  };
  const occurrenceExecutionRange = {
    start: formatDate(
      addDays(new Date(`${occurrenceProjectionTodayDate}T00:00:00`), -31),
    ),
    end: formatDate(
      addDays(new Date(`${occurrenceProjectionTodayDate}T00:00:00`), 7),
    ),
  };
  const baseCalendarRows: MyFlowCalendarRow[] = visibleExecutionFlows.flatMap((flow) => {
    const baseRows = flow.projectionRows ?? flow.rows;
    const occurrenceExecutionRecords = getFlowOccurrenceExecutionRecords(
      flow.progress.slug,
      myFlowOccurrenceExecutionRecords,
    );
    const expandedRows = [occurrenceVisibleRange, occurrenceExecutionRange]
      .flatMap((range) => {
        const personalDraftOccurrenceRows = expandPersonalDraftCalendarOccurrenceRows({
          personalDraftEligible: isPersonalDraftStructuralEditEligible(flow.bundle),
          identityNamespace: flow.progress.slug,
          rows: baseRows,
          range,
          executionRecords: occurrenceExecutionRecords,
        });
        const definitions = Object.fromEntries(baseRows.map((row) => {
          const item = flow.bundle.items.find((entry) => entry.id === row.id);
          const baseDateKey = row.date
            ? getMyFlowCalendarRowKey(flow.progress.slug, row.id, row.date)
            : getMyFlowManualScheduleKey(flow.progress.slug, row.id);
          const committedDraft = {
            ...(myFlowItemDrafts[getPersonalDraftProjectionValueKey(flow.progress.slug, row.id)] ?? {}),
            ...(myFlowItemDrafts[baseDateKey] ?? {}),
          };
          const sourceRepeatRule = item?.repeat_rule;
          const repeatPreset = committedDraft.repeatPreset;
          if (!row.date || (!sourceRepeatRule && !repeatPreset)) return [row.id, undefined];
          return [row.id, {
            itemId: row.id,
            startDate: row.date,
            sourceRepeatRule,
            repeatPreset,
            ...(sourceRepeatRule || flow.bundle.flow.structure_type === 'routine'
              ? { selectedWeekdays: getMyFlowRoutineWeekdays(flow) }
              : {}),
            ...(myFlowRoutineRuleDrafts[flow.progress.slug]?.endDate
              ? { endDate: myFlowRoutineRuleDrafts[flow.progress.slug]?.endDate }
              : {}),
            ...(isUserScheduledExactVideo(flow.bundle) ? { projectionWeeks: 4 } : {}),
            ...(committedDraft.time ? { time: committedDraft.time } : {}),
            ...(committedDraft.time && committedDraft.durationMinutes
              ? { durationMinutes: committedDraft.durationMinutes }
              : {}),
          }];
        }));
        return expandSavedRoutineOccurrenceRows({
          identityNamespace: flow.progress.slug,
          rows: personalDraftOccurrenceRows,
          definitions,
          range,
          executionRecords: occurrenceExecutionRecords,
          resolveOccurrenceDate: ({ itemId, originalDate }) => {
            const overrideKey = getMyFlowCalendarRowKey(
              flow.progress.slug,
              itemId,
              originalDate,
            );
            return {
              date: myFlowDateOverrides[overrideKey] ?? originalDate,
              overrideKey,
            };
          },
        });
      })
      .reduce<MyFlowRow[]>((rows, row) => {
        const key = row.structuralOccurrenceId
          ? `occurrence:${row.structuralOccurrenceId}`
          : `base:${row.id}:${row.date ?? 'none'}`;
        if (!rows.some((entry) => {
          const entryKey = entry.structuralOccurrenceId
            ? `occurrence:${entry.structuralOccurrenceId}`
            : `base:${entry.id}:${entry.date ?? 'none'}`;
          return entryKey === key;
        })) rows.push(row);
        return rows;
      }, []);
    return expandedRows
      .filter((row) => row.date)
      .map((row) => {
        const originalDate = row.structuralOccurrenceOriginalDate ?? row.date ?? '';
        const dateResolution = row.structuralOccurrenceId
          ? undefined
          : resolveSavedFlowRowDate(flow, row, originalDate);
        const calendarKey = row.structuralOccurrenceDateOverrideKey ?? (
          row.structuralOccurrenceId
            ? `${flow.progress.slug}::occurrence::${row.structuralOccurrenceId}`
            : dateResolution?.overrideKey ?? getMyFlowCalendarRowKey(flow.progress.slug, row.id, originalDate)
        );
        return {
          ...row,
          flow,
          originalDate,
          calendarKey,
          date: row.structuralOccurrenceId
            ? row.date
            : dateResolution?.date,
        };
      });
  });
  const manuallyScheduledRows: MyFlowCalendarRow[] = visibleExecutionFlows.flatMap((flow) =>
    (flow.projectionRows ?? flow.rows)
      .filter((row) => !row.date)
      .flatMap((row) => {
        const dateResolution = resolveSavedFlowRowDate(flow, row);
        if (!dateResolution.date) return [];
        return [{
          ...row,
          flow,
          originalDate: dateResolution.originalDate,
          calendarKey: dateResolution.overrideKey,
          date: dateResolution.date,
        }];
      }),
  );
  const generatedRoutineRows: MyFlowCalendarRow[] = visibleExecutionFlows.flatMap((flow) => {
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
      const dateResolution = resolveMyFlowEffectiveDate({
        flowSlug: flow.progress.slug,
        itemId: nextRow.id,
        sourceDate: originalDate,
        dateOverrides: myFlowDateOverrides,
        personalCopyDateOverride: getMyFlowPersonalCopyStepDateOverride(flow, nextRow.id),
      });
      return {
        ...nextRow,
        originalDate,
        calendarKey: dateResolution.overrideKey,
        date: dateResolution.date,
        timing: nextRow.timing ?? `${occurrence.sessionIndex}회차 · ${occurrence.weekday}요일`,
        section: nextRow.section || '루틴',
        flow,
      };
    });
  });
  const calendarRows = [...baseCalendarRows, ...manuallyScheduledRows, ...generatedRoutineRows].sort((a, b) => {
    const dateOrder = (a.date ?? '').localeCompare(b.date ?? '');
    if (dateOrder !== 0) return dateOrder;
    const scheduleStateRank = (row: MyFlowCalendarRow) =>
      row.structuralScheduleProjection?.scheduleState === 'all_day'
        ? 0
        : row.structuralScheduleProjection?.scheduleState === 'timed'
          ? 1
          : 2;
    const stateOrder = scheduleStateRank(a) - scheduleStateRank(b);
    if (stateOrder !== 0) return stateOrder;
    const timeOrder = (
      a.structuralScheduleProjection?.startTime ?? ''
    ).localeCompare(b.structuralScheduleProjection?.startTime ?? '');
    if (timeOrder !== 0) return timeOrder;
    if (
      a.structuralProjectionOrderRank !== undefined &&
      b.structuralProjectionOrderRank !== undefined
    ) {
      return (
        a.structuralProjectionOrderRank - b.structuralProjectionOrderRank ||
        a.id.localeCompare(b.id)
      );
    }
    return 0;
  });
  const calendarScheduleRows = calendarRows.filter((row) => row.flow.bundle.flow.structure_type !== 'routine');
  const calendarRoutineRows = calendarRows.filter((row) => row.flow.bundle.flow.structure_type === 'routine');
  const calendarScopedRows = calendarRows.filter((row) => isMyFlowCalendarRowInScope(row, myFlowCalendarScope));
  const calendarScopedDateSignature = calendarScopedRows.map((row) => [
    row.date ?? '',
    row.structuralScheduleProjection?.scheduleState ?? '',
    row.structuralScheduleProjection?.startTime ?? '',
    row.structuralScheduleProjection?.durationMinutes ?? '',
  ].join(':')).join('|');
  const calendarScopedScheduleRows = calendarScopedRows.filter((row) => row.flow.bundle.flow.structure_type !== 'routine');
  const calendarScopedRoutineRows = calendarScopedRows.filter((row) => row.flow.bundle.flow.structure_type === 'routine');
  const myFlowTodayDate = occurrenceProjectionTodayDate;
  const calendarAnchor =
    showDemoData && selectedSavedFlowSlug === 'all' && !isCalendarSurface
      ? myFlowTodayDate
      : calendarRows[0]?.date || visibleExecutionFlows[0]?.anchor || myFlowTodayDate;
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
  const myFlowCalendarAllScopeLabel = isCalendarSurface ? '모든 저장 콘텐츠' : '모든 Flow';
  const myFlowCalendarSavedScopeLabel = isCalendarSurface ? '저장 콘텐츠' : '저장 Flow';
  const myFlowCalendarScopeOptions: Array<{ id: MyFlowCalendarScope; label: string; count: number }> = [
    { id: 'all', label: myFlowCalendarAllScopeLabel, count: myFlowCalendarScopeMonthCounts.all },
    ...(myFlowCalendarScopeTotalCounts.map > 0 && myFlowCalendarScopeTotalCounts.map < myFlowCalendarScopeTotalCounts.all
      ? [{ id: 'map' as const, label: myFlowCalendarSavedScopeLabel, count: myFlowCalendarScopeMonthCounts.map }]
      : []),
    ...(myFlowCalendarScopeTotalCounts.schedule > 0 && myFlowCalendarScopeTotalCounts.schedule < myFlowCalendarScopeTotalCounts.all
      ? [{ id: 'schedule' as const, label: '날짜 항목', count: myFlowCalendarScopeMonthCounts.schedule }]
      : []),
    ...(myFlowCalendarScopeTotalCounts.routine > 0
      ? [{ id: 'routine' as const, label: '반복 항목', count: myFlowCalendarScopeMonthCounts.routine }]
      : []),
  ];
  const visibleMyFlowCalendarScopeOptions = isMyFlowMobileViewport
    ? myFlowCalendarScopeOptions.filter((option) => option.id === 'all' || option.id === myFlowCalendarScope || option.count > 0)
    : myFlowCalendarScopeOptions;
  const showMyFlowCalendarScopeFilter = visibleMyFlowCalendarScopeOptions.length > 1;
  const myFlowCalendarScopeLabel = myFlowCalendarScopeOptions.find((option) => option.id === myFlowCalendarScope)?.label ?? myFlowCalendarAllScopeLabel;
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
  const myFlowFallbackNextRows: MyFlowCalendarRow[] = visibleExecutionFlows
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
            : visibleExecutionFlows.length > 0
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
  const getMyFlowRowDraft = (row: MyFlowCalendarRow): MyFlowItemDraft => ({
    ...(myFlowItemDrafts[getPersonalDraftProjectionValueKey(row.flow.progress.slug, row.id)] ?? {}),
    ...(myFlowItemDrafts[getMyFlowRowInstanceKey(row)] ?? {}),
    ...getMyFlowPersonalCopyStepDraft(row),
  });
  const getMyFlowRowDisplayTitle = (row: MyFlowCalendarRow) => {
    const draftTitle = getMyFlowRowDraft(row).title;
    return toUserFacingSourceTitle(draftTitle ?? stripMyFlowTimingPrefixFromTitle(row.title));
  };
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
  const myFlowTodayUnifiedTitle = todayOpenCount > 0 ? `오늘 ${todayOpenCount}개 남음` : myFlowNowTitle;
  const myFlowTodayUnifiedHelp = todayOpenCount > 0 ? '오늘 끝낼 항목을 바로 체크할 수 있어요.' : myFlowNowHelp;
  const showMyFlowTodaySummary = false;

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
  const myFlowSelectedDateScheduleLimit = MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT;
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
        label: kind === 'routine' ? '반복 항목' : '날짜 항목',
        title: savedMap ? toUserFacingMapTitle(savedMap.title) : toContentDisplayTitle(getMyFlowExecutionFlowTitle(row.flow.progress.title)),
        flowMarker: getMyFlowCalendarFlowMarker(row.flow),
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
  const myFlowAllRows: MyFlowCalendarRow[] = visibleExecutionFlows.flatMap((flow) =>
    flow.rows.map((row) => ({ ...row, flow })),
  );
  const myFlowActiveRow =
    calendarRows.find((row) => getMyFlowRowInstanceKey(row) === myFlowActiveRowKey) ??
    myFlowAllRows.find((row) => getMyFlowRowInstanceKey(row) === myFlowActiveRowKey) ??
    myFlowSelectedDateAllRows[0];
  const myFlowSelectedDateOpenCount = myFlowSelectedDateAllRows.filter((row) => !isMyFlowRowChecked(row.flow, row)).length;
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
  const myFlowScheduleFlowGroupIndexByDate = calendarScopedScheduleRows.reduce<Map<string, Map<string, MyFlowScheduleFlowGridGroup>>>((dateGroups, row) => {
    if (!row.date) return dateGroups;
    const flowMarker = getMyFlowCalendarFlowMarker(row.flow);
    const flowGroups = dateGroups.get(row.date) ?? new Map<string, MyFlowScheduleFlowGridGroup>();
    const existing = flowGroups.get(flowMarker.key);
    if (existing) {
      existing.rows.push(row);
    } else {
      flowGroups.set(flowMarker.key, {
        key: flowMarker.key,
        title: flowMarker.title,
        shortTitle: flowMarker.shortTitle,
        color: flowMarker.color,
        rows: [row],
      });
    }
    dateGroups.set(row.date, flowGroups);
    return dateGroups;
  }, new Map<string, Map<string, MyFlowScheduleFlowGridGroup>>());
  const myFlowScheduleFlowGroupsByDate = new Map(
    Array.from(myFlowScheduleFlowGroupIndexByDate.entries()).map(([date, flowGroups]) => [date, Array.from(flowGroups.values())]),
  );
  const isMyFlowCalendarCompactGridDate = (date?: string): boolean =>
    Boolean(date && (myFlowScheduleFlowGroupsByDate.get(date)?.length ?? 0) >= MY_FLOW_CALENDAR_GRID_COMPACT_FLOW_THRESHOLD);
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
  const myFlowStatusOpenFlowCount = visibleExecutionFlows.filter((flow) => flow.done < flow.total).length;
  const myFlowStatusAveragePercent = visibleExecutionFlows.length
    ? Math.round(visibleExecutionFlows.reduce((sum, flow) => sum + flow.percent, 0) / visibleExecutionFlows.length)
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
  const updateMyFlowItemDraftByKey = (key: string, patch: MyFlowItemDraft) => {
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
  const updateMyFlowItemDraft = (row: MyFlowCalendarRow, patch: MyFlowItemDraft) => {
    updateMyFlowItemDraftByKey(getMyFlowRowInstanceKey(row), patch);
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
  const clearMyFlowPersonalDraftLegacySchedule = (flowSlug: string, itemId: string) => {
    const key = getPersonalDraftProjectionValueKey(flowSlug, itemId);
    setMyFlowItemDrafts((current) => {
      const stored = current[key];
      if (!stored) return current;
      const {
        date: _date,
        time: _time,
        durationMinutes: _durationMinutes,
        scheduleMode: _scheduleMode,
        ...remaining
      } = stored;
      if (Object.keys(stored).length === Object.keys(remaining).length) return current;
      const next = { ...current };
      if (Object.keys(remaining).length > 0) next[key] = remaining;
      else delete next[key];
      if (!isMyFlowScenarioDemo) saveStoredMyFlowItemDrafts(next);
      return next;
    });
    updateMyFlowDateOverrideState((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, key)) return current;
      const next = { ...current };
      delete next[key];
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
  const getMyFlowRowEditorDraft = (row: MyFlowCalendarRow): Required<Pick<MyFlowItemDraft, 'title' | 'date' | 'repeatPreset' | 'memo' | 'location' | 'time' | 'durationMinutes' | 'scheduleMode' | 'recurrenceInterval' | 'recurrenceWeekdays' | 'recurrenceEndMode' | 'recurrenceUntil' | 'recurrenceCount'>> => {
    const key = getMyFlowRowInstanceKey(row);
    const committedDraft = getMyFlowRowDraft(row);
    const editingDraft = myFlowEditingDrafts[key] ?? {};
    const detail = getMyFlowRowDisplayDetail(row);
    const item = row.flow.bundle.items.find((entry) => entry.id === row.id);
    const fallbackMemo = row.flow.savedMap?.personalCopy ? '' : formatMyFlowDetailMemo(detail, row, item);
    const isPersonalDraftUserItem =
      isPersonalDraftStructuralEditEligible(row.flow.bundle) &&
      row.structuralOwnership === 'user_created';
    const structuralBaseRow = row.structuralOccurrenceId
      ? row.flow.rows.find(
          (candidate) =>
            (candidate.structuralProjectionStableId ?? candidate.id) ===
            (row.structuralProjectionStableId ?? row.id),
        ) ?? row
      : row;
    const structuralSchedule = isPersonalDraftUserItem
      ? structuralBaseRow.structuralScheduleProjection
      : undefined;
    const scheduleMode = structuralSchedule?.scheduleState === 'timed'
      ? 'timed'
      : 'all_day';
    const structuralRecurrence = getPersonalDraftRecurrenceEditorState(
      structuralBaseRow.structuralRepeat,
      structuralSchedule?.calendarDate ?? row.date ?? '',
    );
    return {
      title: editingDraft.title ?? getMyFlowRowDisplayTitle(row),
      date: editingDraft.date ?? structuralSchedule?.calendarDate ?? committedDraft.date ?? row.date ?? '',
      repeatPreset:
        editingDraft.repeatPreset ??
        (isPersonalDraftUserItem ? structuralRecurrence.mode : committedDraft.repeatPreset) ??
        '',
      memo: editingDraft.memo ?? committedDraft.memo ?? fallbackMemo,
      location: editingDraft.location ?? committedDraft.location ?? '',
      time: editingDraft.time ?? structuralSchedule?.startTime ?? committedDraft.time ?? '',
      durationMinutes:
        editingDraft.durationMinutes ??
        structuralSchedule?.durationMinutes ??
        committedDraft.durationMinutes ??
        PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
      scheduleMode: editingDraft.scheduleMode ?? committedDraft.scheduleMode ?? scheduleMode,
      recurrenceInterval:
        editingDraft.recurrenceInterval ?? structuralRecurrence.interval,
      recurrenceWeekdays:
        editingDraft.recurrenceWeekdays ?? structuralRecurrence.weekdays,
      recurrenceEndMode:
        editingDraft.recurrenceEndMode ?? structuralRecurrence.endMode,
      recurrenceUntil:
        editingDraft.recurrenceUntil ?? structuralRecurrence.untilDate,
      recurrenceCount:
        editingDraft.recurrenceCount ?? structuralRecurrence.occurrenceCount,
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
  const saveMyFlowPersonalCopyStepOverlay = (row: MyFlowCalendarRow, editingDraft: MyFlowItemDraft): boolean => {
    if (typeof window === 'undefined' || !row.flow.savedMap?.personalCopy) return false;

    const sourceSnapshot = toSourceBackedSavedSnapshot(row.flow.savedMap);
    if (!sourceSnapshot.personalCopy) return false;

    const flowSlug = row.flow.progress.slug;
    const stepId = baseStateId(row.id);
    const currentOverridesByFlow = sourceSnapshot.personalCopy.stepOverridesByFlow ?? {};
    const currentFlowOverrides = currentOverridesByFlow[flowSlug] ?? {};
    const nextOverride: SourceBackedFlowMapPersonalCopyStepOverride = {
      ...(currentFlowOverrides[stepId] ?? {}),
    };
    const sourceTitle = toUserFacingSourceTitle(row.title).trim();

    if (Object.prototype.hasOwnProperty.call(editingDraft, 'title')) {
      const title = editingDraft.title?.trim() ?? '';
      if (title && title !== sourceTitle) nextOverride.title = title;
      else delete nextOverride.title;
    }
    if (Object.prototype.hasOwnProperty.call(editingDraft, 'date')) {
      const date = editingDraft.date?.trim() ?? '';
      if (date) nextOverride.schedule = { mode: 'fixed_date', date };
      else delete nextOverride.schedule;
    }
    if (Object.prototype.hasOwnProperty.call(editingDraft, 'memo')) {
      const userMemo = editingDraft.memo?.trim() ?? '';
      if (userMemo) nextOverride.userMemo = userMemo;
      else delete nextOverride.userMemo;
    }

    const nextFlowOverrides = { ...currentFlowOverrides };
    if (Object.keys(nextOverride).length > 0) {
      nextFlowOverrides[stepId] = nextOverride;
    } else {
      delete nextFlowOverrides[stepId];
    }
    const nextOverridesByFlow = { ...currentOverridesByFlow };
    if (Object.keys(nextFlowOverrides).length > 0) {
      nextOverridesByFlow[flowSlug] = nextFlowOverrides;
    } else {
      delete nextOverridesByFlow[flowSlug];
    }

    const adjusted = buildSourceBackedFlowMapPersonalCopyAdjustment(sourceSnapshot, {
      title: sourceSnapshot.title,
      anchor: sourceSnapshot.anchor,
      savedAt: new Date().toISOString(),
      includedStepIdsByFlow: sourceSnapshot.personalCopy.includedStepIdsByFlow,
      stepOverridesByFlow: nextOverridesByFlow,
      baselineRecord: savedFlowMapPersistenceById[sourceSnapshot.mapId],
    });
    if (!adjusted) return false;

    window.localStorage.setItem(getSourceBackedFlowMapSnapshotStorageKey(adjusted.snapshot.mapId), JSON.stringify(adjusted.snapshot));
    window.localStorage.setItem(getSourceBackedFlowMapPersistenceStorageKey(adjusted.snapshot.mapId), JSON.stringify(adjusted.persistenceRecord));
    refreshSavedFlowState();
    return true;
  };
  const saveMyFlowEditingDraft = (row: MyFlowCalendarRow) => {
    const key = getMyFlowRowInstanceKey(row);
    const editingDraft = myFlowEditingDrafts[key];
    if (!editingDraft) return;
    const { date, ...itemDraft } = editingDraft;
    if (row.flow.savedMap?.personalCopy) {
      const { title, memo, ...remainingItemDraft } = itemDraft;
      const personalPatch: MyFlowItemDraft = {
        ...(title !== undefined ? { title } : {}),
        ...(date !== undefined ? { date } : {}),
        ...(memo !== undefined ? { memo } : {}),
      };
      const savedPersonalOverlay =
        Object.keys(personalPatch).length > 0 ? saveMyFlowPersonalCopyStepOverlay(row, personalPatch) : true;
      if (!savedPersonalOverlay) return;
      if (Object.keys(remainingItemDraft).length > 0) updateMyFlowItemDraft(row, remainingItemDraft);
      if (date) {
        setMyFlowSelectedDate(date);
        setMyFlowVisibleMonth(getMyFlowMonthStart(date));
      }
    } else if (isUrlFirstDraftSavedFlow(row.flow)) {
      const structuralUserItem = row.structuralOwnership === 'user_created';
      const {
        time,
        durationMinutes,
        scheduleMode,
        repeatPreset,
        recurrenceInterval,
        recurrenceWeekdays,
        recurrenceEndMode,
        recurrenceUntil,
        recurrenceCount,
        ...itemDraftWithoutStructuralSchedule
      } = itemDraft;
      const hasStructuralSchedulePatch =
        date !== undefined ||
        time !== undefined ||
        durationMinutes !== undefined ||
        scheduleMode !== undefined;
      const hasStructuralRecurrencePatch =
        repeatPreset !== undefined ||
        recurrenceInterval !== undefined ||
        recurrenceWeekdays !== undefined ||
        recurrenceEndMode !== undefined ||
        recurrenceUntil !== undefined ||
        recurrenceCount !== undefined;
      const structuralBaseRow = row.structuralOccurrenceId
        ? row.flow.rows.find(
            (candidate) =>
              (candidate.structuralProjectionStableId ?? candidate.id) ===
              (row.structuralProjectionStableId ?? row.id),
          ) ?? row
        : row;
      const shouldSyncStructuralRecurrence =
        hasStructuralSchedulePatch && Boolean(structuralBaseRow.structuralRepeat);
      const resolvedRecurrenceDraft =
        hasStructuralRecurrencePatch || shouldSyncStructuralRecurrence
        ? getMyFlowRowEditorDraft(row)
        : undefined;
      if (structuralUserItem && (hasStructuralSchedulePatch || hasStructuralRecurrencePatch)) {
        let structuralOverlay =
          myFlowStructuralOverlaysBySlug[row.flow.progress.slug] ??
          createPersonalDraftStructuralOverlay(row.flow.bundle);
        const currentSchedule = structuralBaseRow.structuralScheduleProjection;
        const nextDate = date ?? currentSchedule?.calendarDate ?? '';
        const nextMode = scheduleMode ?? (
          currentSchedule?.scheduleState === 'timed' ? 'timed' : 'all_day'
        );
        const nextTime = time ?? currentSchedule?.startTime ?? '';
        const nextDuration =
          durationMinutes ??
          currentSchedule?.durationMinutes ??
          PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES;
        const timedFieldsChanged =
          nextMode !== currentSchedule?.scheduleState ||
          nextTime !== (currentSchedule?.startTime ?? '') ||
          nextDuration !== (
            currentSchedule?.durationMinutes ??
            PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES
          );
        if (hasStructuralSchedulePatch) {
          const scheduled = setPersonalDraftUserItemSchedule({
            overlay: structuralOverlay,
            itemId: row.structuralProjectionStableId ?? row.id,
            date: nextDate,
            mode: nextMode,
            time: nextTime,
            durationMinutes: nextDuration,
            timeZone:
              nextMode === 'timed'
                ? timedFieldsChanged
                  ? getCurrentDeviceTimeZone()
                  : currentSchedule?.timeZone
                : undefined,
          });
          if (!scheduled) return;
          structuralOverlay = scheduled.overlay;
        }
        if (resolvedRecurrenceDraft && nextDate) {
          const recurrence = setPersonalDraftUserItemRecurrence({
            overlay: structuralOverlay,
            itemId: row.structuralProjectionStableId ?? row.id,
            mode:
              resolvedRecurrenceDraft.repeatPreset === 'daily' ||
              resolvedRecurrenceDraft.repeatPreset === 'weekly' ||
              resolvedRecurrenceDraft.repeatPreset === 'monthly'
                ? resolvedRecurrenceDraft.repeatPreset
                : 'none',
            interval: resolvedRecurrenceDraft.recurrenceInterval,
            weekdays: resolvedRecurrenceDraft.recurrenceWeekdays.filter(
              (weekday): weekday is PersonalStructuralWeekday =>
                PERSONAL_STRUCTURAL_WEEKDAYS.includes(
                  weekday as PersonalStructuralWeekday,
                ),
            ),
            endMode: resolvedRecurrenceDraft.recurrenceEndMode,
            untilDate: resolvedRecurrenceDraft.recurrenceUntil,
            occurrenceCount: resolvedRecurrenceDraft.recurrenceCount,
          });
          if (!recurrence) return;
          structuralOverlay = recurrence.overlay;
        }
        if (!saveMyFlowStructuralOverlay(row.flow, structuralOverlay)) return;
        clearMyFlowPersonalDraftLegacySchedule(row.flow.progress.slug, row.id);
      }
      const personalDraftItemPatch = structuralUserItem
        ? itemDraftWithoutStructuralSchedule
        : {
            ...itemDraft,
            ...(date !== undefined ? { date } : {}),
          };
      if (Object.keys(personalDraftItemPatch).length > 0) {
        updateMyFlowItemDraftByKey(
          getPersonalDraftProjectionValueKey(row.flow.progress.slug, row.id),
          personalDraftItemPatch,
        );
      }
      if (!structuralUserItem && date !== undefined) {
        const draftDateKey = getPersonalDraftProjectionValueKey(row.flow.progress.slug, row.id);
        updateMyFlowDateOverrideState((current) => {
          const next = { ...current };
          if (date) {
            next[draftDateKey] = date;
          } else {
            delete next[draftDateKey];
          }
          return next;
        });
        if (date) {
          setMyFlowSelectedDate(date);
          setMyFlowVisibleMonth(getMyFlowMonthStart(date));
        }
      }
      if (structuralUserItem && date) {
        setMyFlowSelectedDate(date);
        setMyFlowVisibleMonth(getMyFlowMonthStart(date));
      }
    } else {
      const { title, memo, ...executionDraft } = itemDraft;
      if (title !== undefined || memo !== undefined) {
        updateMyFlowItemDraftByKey(getPersonalDraftProjectionValueKey(row.flow.progress.slug, row.id), {
          ...(title !== undefined ? { title } : {}),
          ...(memo !== undefined ? { memo } : {}),
        });
      }
      if (Object.keys(executionDraft).length > 0) updateMyFlowItemDraft(row, executionDraft);
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
    }
    discardMyFlowEditingDraft(row);
    closeMyFlowRowDetail();
  };
  const cancelMyFlowEditingDraft = (row: MyFlowCalendarRow) => {
    discardMyFlowEditingDraft(row);
    closeMyFlowRowDetail();
  };
  const copyMyFlowStepText = async (text: string, key: string, feedback: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMyFlowStepCopiedKey(key);
      setMyFlowStepCopiedLabel(feedback);
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
      setMyFlowStepCopiedLabel(copied ? feedback : '');
    }
    window.setTimeout(() => {
      setMyFlowStepCopiedKey('');
      setMyFlowStepCopiedLabel(FLOW_EXPORT_FEEDBACK.memoCopied);
    }, 1600);
  };
  const copyMyFlowStepPortableText = async (input: MyFlowPortableStepExportInput, key: string) => {
    await copyMyFlowStepText(buildMyFlowStepPortableText(input), key, FLOW_EXPORT_FEEDBACK.memoCopied);
  };
  const copyMyFlowStepChecklistText = async (input: MyFlowPortableStepExportInput, key: string) => {
    await copyMyFlowStepText(buildMyFlowStepChecklistText(input), key, '체크리스트 복사됨');
  };
  const copyMyFlowStepSheetRow = async (input: MyFlowPortableStepExportInput, key: string) => {
    await copyMyFlowStepText(buildMyFlowStepSheetTsv(input), key, '시트 행 복사됨');
  };
  const getMyFlowPersonalDraftListExport = (flow: MySavedFlow) => {
    if (!flow.structuralProjection || !isPersonalDraftStructuralEditEligible(flow.bundle)) {
      return undefined;
    }
    return buildPersonalStructuralListExportArtifacts({
      flowTitle: getMyFlowExecutionFlowTitle(flow.progress.title),
      projection: flow.structuralProjection,
      sourceLabel: toUserFacingSourceTitle(flow.bundle.flow.source_title ?? ''),
      sourceUrl: flow.bundle.flow.source_url,
    });
  };
  const copyMyFlowPersonalDraftListExport = async (
    flow: MySavedFlow,
    destination: 'memo' | 'checklist' | 'sheet',
  ) => {
    const artifact = getMyFlowPersonalDraftListExport(flow);
    if (!artifact) return;
    const output = destination === 'memo'
      ? artifact.memoText
      : destination === 'checklist'
        ? artifact.checklistText
        : artifact.sheetTsv;
    const feedback = destination === 'memo'
      ? FLOW_EXPORT_FEEDBACK.memoCopied
      : destination === 'checklist'
        ? '체크리스트 복사됨'
        : '시트로 복사됨';
    await copyMyFlowStepText(
      output,
      `personal-draft-list-export::${flow.progress.slug}`,
      feedback,
    );
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
    const flowGroups = myFlowScheduleFlowGroupsByDate.get(row.date) ?? [];
    if (flowGroups.length > 1) {
      const visibleFlowGroups = flowGroups.slice(0, MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT);
      return visibleFlowGroups.some((group) => group.rows[0] === row);
    }
    const sameDateRows = myFlowScheduleRowsByDate.get(row.date) ?? [];
    const scheduleLimit = MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT;
    return sameDateRows.indexOf(row) < scheduleLimit;
  });
  const myFlowCalendarEvents = [
    ...myFlowCalendarScheduleRows.map((row) => {
      const checked = isMyFlowRowChecked(row.flow, row);
      const flowMarker = getMyFlowCalendarFlowMarker(row.flow);
      const color = flowMarker.color;
      const title = getMyFlowRowDisplayTitle(row);
      const structuralSchedule = row.structuralScheduleProjection;
      const isTimed = Boolean(
        structuralSchedule?.scheduleState === 'timed' &&
        row.date &&
        structuralSchedule.startTime,
      );
      const start = isTimed
        ? `${row.date}T${structuralSchedule?.startTime}:00`
        : row.date;
      const end = isTimed && structuralSchedule?.endDate && structuralSchedule.endTime
        ? `${structuralSchedule.endDate}T${structuralSchedule.endTime}:00`
        : undefined;
      return {
        id:
          row.structuralOccurrenceId ??
          structuralSchedule?.stableEventIdentitySeed ??
          row.calendarKey ??
          `${row.flow.progress.slug}-${row.id}-${row.date}`,
        title,
        start,
        ...(end ? { end } : {}),
        allDay: !isTimed,
        backgroundColor: checked ? '#F8FAFC' : '#FFFFFF',
        borderColor: checked ? '#CBD5E1' : '#E2E8F0',
        textColor: checked ? '#64748B' : '#0F172A',
        editable: Boolean(row.calendarKey) && row.structuralOwnership !== 'user_created',
        extendedProps: {
          kind: 'schedule',
          checked,
          calendarKey: row.calendarKey,
          itemTitle: title,
          shortTitle: getMyFlowCalendarShortTitle(title),
          itemCountOnDate: row.date ? myFlowScheduleCountByDate[row.date] ?? 1 : 1,
          flowMarkerKey: flowMarker.key,
          flowMarkerTitle: flowMarker.title,
          flowMarkerShortTitle: flowMarker.shortTitle,
          flowMarkerInitial: flowMarker.initial,
          color,
          scheduleState: structuralSchedule?.scheduleState,
          startTime: structuralSchedule?.startTime,
          durationMinutes: structuralSchedule?.durationMinutes,
          occurrenceId: row.structuralOccurrenceId,
          occurrenceState: row.structuralOccurrenceExecutionState,
        },
      };
    }),
    ...Array.from(myFlowScheduleRowsByDate.entries())
      .map(([date, rows]) => {
        const scheduleLimit = MY_FLOW_CALENDAR_SCHEDULE_EVENT_LIMIT;
        return { date, rows, scheduleLimit };
      })
      .filter(({ date }) => !isMyFlowCalendarCompactGridDate(date))
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
    ...Array.from(myFlowScheduleFlowGroupsByDate.entries())
      .filter(([, groups]) => groups.length >= MY_FLOW_CALENDAR_GRID_COMPACT_FLOW_THRESHOLD)
      .map(([date, groups]) => ({
        id: `schedule-flow-overflow-${date}`,
        title: `외 ${groups.length - MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT}개`,
        start: date,
        allDay: true,
        editable: false,
        backgroundColor: '#F8FAFC',
        borderColor: '#E2E8F0',
        textColor: '#475569',
        extendedProps: {
          kind: 'scheduleFlowOverflow',
          hiddenCount: groups.length - MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT,
          totalFlowCount: groups.length,
          visibleFlowCount: MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT,
          hiddenFlowTitles: groups.slice(MY_FLOW_CALENDAR_GRID_VISIBLE_FLOW_LIMIT).map((group) => group.title),
        },
      })),
    ...Array.from(myFlowRoutineRowsByDate.entries()).map(([date, rows]) => {
      return {
        id: `routine-rail-${date}`,
        title: `${rows.length}개 반복 항목`,
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
            const flowMarker = getMyFlowCalendarFlowMarker(row.flow);
            const color = flowMarker.color;
            return {
              key: getMyFlowRowInstanceKey(row),
              title: getMyFlowRowDisplayTitle(row),
              flowTitle: flowMarker.title,
              color,
              iconKind: getMyFlowRoutineIconKind(row),
            };
          }),
        },
      };
    }),
  ];
  const routineFlows = visibleExecutionFlows.filter((flow) => flow.bundle.flow.structure_type === 'routine');
  const checklistFlowRows = visibleExecutionFlows
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
  const mobileFlowSummaryText = `${flowListVisibleFlows.length}개 저장`;
  const flowListReadyFlows = flowListVisibleFlows.filter((flow) => isMyFlowReadyContent(flow));
  const flowListSupportFlows = flowListVisibleFlows.filter((flow) => !isMyFlowReadyContent(flow));
  const flowListSupportOnlyRetired =
    flowListSupportFlows.length > 0 &&
    flowListSupportFlows.every((flow) => getMyFlowContentReadiness(flow).kind === 'retired');
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
    const visibleMonthStart = getMyFlowMonthStart(myFlowVisibleMonth);
    const visibleMonth = visibleMonthStart.slice(0, 7);
    const visibleMonthRows = calendarScopedRows.filter((row) => row.date?.startsWith(visibleMonth));
    setMyFlowSelectedDate((currentDate) => {
      const currentDateStillHasRows = calendarScopedRows.some((row) => row.date === currentDate);
      const currentDateIsInVisibleMonth = currentDate.startsWith(visibleMonth);
      if (currentDateIsInVisibleMonth) {
        if (currentDateStillHasRows || visibleMonthRows.length === 0) return currentDate;
        return visibleMonthRows[0]?.date ?? visibleMonthStart;
      }
      const nextSelectedDate = findMyFlowDefaultFocusDate(
        calendarScopedRows,
        myFlowTodayDate,
        anchorMonthStart,
      );
      setMyFlowVisibleMonth(getMyFlowMonthStart(nextSelectedDate || anchorMonthStart));
      return nextSelectedDate;
    });
  }, [calendarAnchor, selectedSavedFlowSlug, myFlowCalendarScope, calendarScopedDateSignature, myFlowTodayDate, myFlowVisibleMonth]);

  const recordMyFlowCompletionState = (flow: MySavedFlow, checks: Record<string, boolean>) => {
    const completed = flow.rows.length > 0 && flow.rows.every((row) => {
      const checkIds = getMyFlowCheckIds(flow.bundle, row.id, flow.anchor);
      return checkIds.length > 0 && checkIds.every((id) => checks[id]);
    });
    recordFlowCompletionState(flow.progress.slug, completed);
  };

  const setPersonalDraftOccurrenceExecutionState = (
    flow: MySavedFlow,
    row: MyFlowCalendarRow,
    nextState: PersonalStructuralOccurrenceExecutionState,
  ): boolean => {
    if (
      !row.structuralOccurrenceId ||
      !row.structuralOccurrenceSeriesId ||
      !row.structuralOccurrenceRevisionId
    ) {
      return false;
    }
    const storageKey = getMyFlowOccurrenceExecutionStorageKey(
      flow.progress.slug,
      row.structuralOccurrenceId,
    );
    const current = myFlowOccurrenceExecutionRecords[storageKey];
    const nextRecord = transitionPersonalStructuralOccurrenceExecution({
      current,
      occurrenceId: row.structuralOccurrenceId,
      seriesId: row.structuralOccurrenceSeriesId,
      revisionId: row.structuralOccurrenceRevisionId,
      nextState,
      at: new Date().toISOString(),
    });
    setMyFlowOccurrenceExecutionRecords((records) => {
      const next = { ...records, [storageKey]: nextRecord };
      if (!isMyFlowScenarioDemo) {
        saveStoredMyFlowOccurrenceExecutionRecords(next);
      }
      return next;
    });
    return true;
  };

  const togglePersonalDraftOccurrenceCompletion = (
    flow: MySavedFlow,
    row: MyFlowCalendarRow,
  ): boolean => {
    if (!row.structuralOccurrenceId) return false;
    const storageKey = getMyFlowOccurrenceExecutionStorageKey(
      flow.progress.slug,
      row.structuralOccurrenceId,
    );
    const currentState = myFlowOccurrenceExecutionRecords[storageKey]?.state ?? 'pending';
    if (currentState === 'skipped' || currentState === 'held') return true;
    return setPersonalDraftOccurrenceExecutionState(
      flow,
      row,
      currentState === 'done' ? 'reopened' : 'done',
    );
  };

  const toggleSavedFlowItem = (flow: MySavedFlow, rowId: string, rowContext?: MyFlowCalendarRow) => {
    if (rowContext && togglePersonalDraftOccurrenceCompletion(flow, rowContext)) return;
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
    recordMyFlowCompletionState(flow, nextChecks);
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
    recordMyFlowCompletionState(flow, nextChecks);
    refreshSavedFlowState();
  };

  const completeSavedFlow = (flow: MySavedFlow) => {
    const executableIds = (isPersonalDraftStructuralEditEligible(flow.bundle)
      ? Array.from(
          new Set(flow.rows.flatMap((row) => getMyFlowCheckIds(flow.bundle, row.id, flow.anchor))),
        )
      : getExecutableCheckIds(flow.bundle, flow.anchor))
      .filter((id) => !isItemStateSkipped(flow.itemStates, id));
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
    recordMyFlowCompletionState(flow, nextChecks);
    refreshSavedFlowState();
  };

  const openMyFlowCompletionFeedback = (flow: MySavedFlow, mode: MyFlowCompletionFeedbackDraft['mode']) => {
    const savedFeedback = myFlowCompletionFeedbackBySlug[flow.progress.slug] ?? getMyFlowCompletionFeedback(flow.progress.slug);
    setMyFlowCompletionFeedbackDraft({
      flowSlug: flow.progress.slug,
      mode,
      outcome: savedFeedback?.reflection?.outcome ?? 'helpful',
      reflectionNote: savedFeedback?.reflection?.note ?? '',
      correctionScope:
        savedFeedback?.sourceCorrectionDraft?.scope === 'item' && savedFeedback.sourceCorrectionDraft.itemId
          ? savedFeedback.sourceCorrectionDraft.itemId
          : 'flow',
      correctionNote: savedFeedback?.sourceCorrectionDraft?.note ?? '',
      status: '',
    });
  };

  const updateMyFlowCompletionFeedbackDraft = (patch: Partial<Omit<MyFlowCompletionFeedbackDraft, 'flowSlug'>>) => {
    setMyFlowCompletionFeedbackDraft((current) => (current ? { ...current, ...patch, status: patch.status ?? '' } : current));
  };

  const saveMyFlowCompletionReflection = (flow: MySavedFlow) => {
    if (myFlowCompletionFeedbackDraft?.flowSlug !== flow.progress.slug) return;
    const savedFeedback = myFlowCompletionFeedbackBySlug[flow.progress.slug] ?? getMyFlowCompletionFeedback(flow.progress.slug);
    const nextFeedback = saveMyFlowCompletionFeedback(flow.progress.slug, {
      ...(savedFeedback?.sourceCorrectionDraft ? { sourceCorrectionDraft: savedFeedback.sourceCorrectionDraft } : {}),
      reflection: {
        outcome: myFlowCompletionFeedbackDraft.outcome,
        ...(myFlowCompletionFeedbackDraft.reflectionNote.trim()
          ? { note: myFlowCompletionFeedbackDraft.reflectionNote.trim() }
          : {}),
        updatedAt: new Date().toISOString(),
      },
    });
    if (!nextFeedback) return;
    setMyFlowCompletionFeedbackBySlug((current) => ({ ...current, [flow.progress.slug]: nextFeedback }));
    updateMyFlowCompletionFeedbackDraft({ status: '내 회고를 이 기기에 저장했어요.' });
  };

  const saveMyFlowSourceCorrectionDraft = (flow: MySavedFlow) => {
    if (myFlowCompletionFeedbackDraft?.flowSlug !== flow.progress.slug) return;
    const correctionNote = myFlowCompletionFeedbackDraft.correctionNote.trim();
    if (!correctionNote) {
      updateMyFlowCompletionFeedbackDraft({ status: '알릴 내용을 적어 주세요.' });
      return;
    }

    const itemRow = flow.rows.find((row) => baseStateId(row.id) === myFlowCompletionFeedbackDraft.correctionScope);
    const savedFeedback = myFlowCompletionFeedbackBySlug[flow.progress.slug] ?? getMyFlowCompletionFeedback(flow.progress.slug);
    const nextFeedback = saveMyFlowCompletionFeedback(flow.progress.slug, {
      ...(savedFeedback?.reflection ? { reflection: savedFeedback.reflection } : {}),
      sourceCorrectionDraft: {
        scope: itemRow ? 'item' : 'flow',
        note: correctionNote,
        updatedAt: new Date().toISOString(),
        ...(itemRow
          ? { itemId: baseStateId(itemRow.id), itemTitle: getMyFlowRowDisplayTitle({ ...itemRow, flow }) }
          : {}),
        ...(flow.bundle.flow.source_url ? { sourceUrl: flow.bundle.flow.source_url } : {}),
      },
    });
    if (!nextFeedback) return;
    setMyFlowCompletionFeedbackBySlug((current) => ({ ...current, [flow.progress.slug]: nextFeedback }));
    updateMyFlowCompletionFeedbackDraft({ status: '전송 전 메모를 이 기기에 저장했어요.' });
  };

  const getMyFlowVersionNoticeForFlow = (flow: MySavedFlow) => flow.savedMap
    ? getMyFlowMapUpdateNotice(flow.savedMap, savedFlowMapPersistenceById[flow.savedMap.mapId])
    : undefined;

  const getDefaultFlowVersionSelections = (
    review: FlowVersionReview | undefined,
    flowSlug: string,
  ): FlowVersionReviewSelections => Object.fromEntries(
    (review?.items ?? []).flatMap((item) => (
      item.flowSlug === flowSlug && item.kind === 'changed' && !item.hasPersonalConflict
        ? [[item.key, 'use_latest'] as const]
        : []
    )),
  );

  const getMyFlowReuseAnchorContext = (flow: MySavedFlow) => {
    const publishPackage = flow.savedMap?.mapId
      ? buildSourceBackedFlowMapPublishPackage(flow.savedMap.mapId)
      : undefined;
    const anchorCopy = publishPackage
      ? getSourceBackedFlowMapDateAnchorCopy(publishPackage)
      : getSourceBackedFlowMapDateAnchorCopy();
    return {
      required: flow.bundle.flow.anchor_type !== 'none'
        || Boolean(publishPackage?.map.setupInput)
        || Boolean(flow.savedMap?.anchor),
      label: publishPackage && (publishPackage.map.setupInput || flow.savedMap?.anchor)
        ? anchorCopy.label
        : getAnchorInputLabel(flow.bundle),
    };
  };

  const buildMyFlowRunItemSnapshots = (flow: MySavedFlow): FlowRunItemSnapshot[] => {
    const seen = new Set<string>();
    return flow.rows.flatMap((row, index) => {
      const rowWithFlow: MyFlowCalendarRow = { ...row, flow };
      const baseId = row.structuralOccurrenceId
        || row.structuralProjectionStableId
        || baseStateId(row.id);
      const itemId = seen.has(baseId) ? getMyFlowRowInstanceKey(rowWithFlow) : baseId;
      if (!itemId || seen.has(itemId)) return [];
      seen.add(itemId);
      const draft = getMyFlowRowDraft(rowWithFlow);
      const originalDate = row.structuralOccurrenceOriginalDate ?? row.date;
      const effectiveDate = row.structuralOccurrenceId
        ? row.date
        : resolveMyFlowEffectiveDate({
            flowSlug: flow.progress.slug,
            itemId: row.id,
            sourceDate: originalDate,
            dateOverrides: myFlowDateOverrides,
            draftDateOverride: getMyFlowDraftItemDateOverride(flow, row.id) ?? draft.date?.trim(),
            personalCopyDateOverride: getMyFlowPersonalCopyStepDateOverride(flow, row.id),
          }).date;
      const effectiveTime = row.structuralScheduleProjection?.startTime || draft.time?.trim();
      const effectiveDuration = row.structuralScheduleProjection?.durationMinutes ?? draft.durationMinutes;
      const scheduleState: FlowRunItemSnapshot['scheduleState'] = !effectiveDate
        ? 'unscheduled'
        : effectiveTime
          ? 'timed'
          : 'all_day';
      const stateId = baseStateId(row.id);
      const status: FlowRunItemSnapshot['status'] = row.structuralOccurrenceExecutionState
        ?? (flow.itemStates[stateId]?.skipped
          ? 'skipped'
          : isMyFlowRowChecked(flow, row)
            ? 'done'
            : 'pending');
      const memo = (draft.memo || draft.logValue || '').trim();
      return [{
        itemId,
        title: getMyFlowRowDisplayTitle(rowWithFlow),
        status,
        scheduleState,
        ...(effectiveDate ? { date: effectiveDate } : {}),
        ...(scheduleState === 'timed' && effectiveTime ? { time: effectiveTime } : {}),
        ...(scheduleState === 'timed' && effectiveDuration ? { durationMinutes: effectiveDuration } : {}),
        ...(memo ? { memo } : {}),
        personalOrderRank: row.structuralProjectionOrderRank ?? index,
      }];
    });
  };

  const openMyFlowReuse = (flow: MySavedFlow, versionMode: 'current' | 'latest' = 'current') => {
    const personalExecutionState = getFlowScopedMyFlowPersonalExecutionState(flow.progress.slug);
    const versionNotice = getMyFlowVersionNoticeForFlow(flow);
    setMyFlowCompletionFeedbackDraft(null);
    setMyFlowReuseNotice(null);
    setMyFlowReuseDraft({
      flowSlug: flow.progress.slug,
      anchor: '',
      fixedDatePolicy: '',
      fixedDateOverrideCount: countFlowRunFixedDateOverrides(
        flow.savedMap?.personalCopy,
        personalExecutionState,
      ),
      versionMode,
      versionSelections: versionMode === 'latest'
        ? getDefaultFlowVersionSelections(versionNotice?.versionReview, flow.progress.slug)
        : {},
      sensitiveReviewConfirmed: false,
      status: '',
    });
  };

  const updateMyFlowReuseDraft = (patch: Partial<Omit<MyFlowReuseDraft, 'flowSlug' | 'fixedDateOverrideCount'>>) => {
    setMyFlowReuseDraft((current) => (current ? { ...current, ...patch, status: patch.status ?? '' } : current));
  };

  const updateMyFlowVersionSelection = (item: FlowVersionReviewItem, selection: FlowVersionReviewSelection) => {
    setMyFlowReuseDraft((current) => current ? {
      ...current,
      versionSelections: { ...current.versionSelections, [item.key]: selection },
      status: '',
    } : current);
  };

  const startMyFlowReuse = (flow: MySavedFlow) => {
    if (myFlowReuseDraft?.flowSlug !== flow.progress.slug) return;
    const anchorContext = getMyFlowReuseAnchorContext(flow);
    const requiresAnchor = anchorContext.required;
    const anchor = myFlowReuseDraft.anchor.trim();
    if (requiresAnchor && !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) {
      updateMyFlowReuseDraft({ status: `${anchorContext.label}을 선택해 주세요.` });
      return;
    }
    if (requiresAnchor && myFlowReuseDraft.fixedDateOverrideCount > 0 && !myFlowReuseDraft.fixedDatePolicy) {
      updateMyFlowReuseDraft({ status: '따로 바꾼 날짜를 어떻게 처리할지 선택해 주세요.' });
      return;
    }

    const versionNotice = getMyFlowVersionNoticeForFlow(flow);
    const sourceSnapshot = flow.savedMap ? toSourceBackedSavedSnapshot(flow.savedMap) : undefined;
    const versionResult = myFlowReuseDraft.versionMode === 'latest'
      && versionNotice?.versionReview
      && versionNotice.savedRecord
      && sourceSnapshot
      ? buildFlowVersionReviewPersonalCopy({
          review: versionNotice.versionReview,
          savedRecord: versionNotice.savedRecord,
          personalCopy: sourceSnapshot.personalCopy,
          selections: myFlowReuseDraft.versionSelections,
          flowSlug: flow.progress.slug,
        })
      : undefined;
    if (myFlowReuseDraft.versionMode === 'latest' && !versionResult?.personalCopy) {
      updateMyFlowReuseDraft({ status: versionResult?.unresolvedKeys.length ? '바뀐 할 일의 처리 방법을 모두 선택해 주세요.' : '새 내용을 불러오지 못했습니다.' });
      return;
    }
    if (myFlowReuseDraft.versionMode === 'latest' && versionNotice?.versionReview?.sensitive && !myFlowReuseDraft.sensitiveReviewConfirmed) {
      updateMyFlowReuseDraft({ status: '공식·민감 일정의 변경 내용을 확인해 주세요.' });
      return;
    }
    const reviewedVersion = myFlowReuseDraft.versionMode === 'latest' && sourceSnapshot && versionResult?.personalCopy
      ? buildSourceBackedFlowMapReviewedVersion(sourceSnapshot, versionResult.personalCopy, {
          savedAt: new Date().toISOString(),
          ...(requiresAnchor ? { anchor } : {}),
        })
      : undefined;
    if (myFlowReuseDraft.versionMode === 'latest' && !reviewedVersion) {
      updateMyFlowReuseDraft({ status: '선택한 새 내용을 저장하지 못했습니다.' });
      return;
    }

    const completedRun = completeActiveFlowRun(flow.progress.slug, {
      mapSnapshot: flow.savedMap,
      flowTitle: getMyFlowExecutionFlowTitle(flow.progress.title),
      itemSnapshots: buildMyFlowRunItemSnapshots(flow),
    })
      ?? getCompletedFlowRuns(flow.progress.slug)[0];
    if (!completedRun) {
      updateMyFlowReuseDraft({ status: '지난 실행을 보관하지 못했습니다. 다시 시도해 주세요.' });
      return;
    }

    const personalExecutionState = completedRun.personalExecutionStateSnapshot
      ?? getFlowScopedMyFlowPersonalExecutionState(flow.progress.slug);
    const nextPersonalExecutionStateSnapshot =
      requiresAnchor && myFlowReuseDraft.fixedDatePolicy === 'keep_fixed_dates'
        ? rekeyMyFlowPersonalExecutionStateForAnchor(personalExecutionState, {
            flowSlug: flow.progress.slug,
            previousItems: getMyFlowRows(flow.bundle, flow.anchor).map((row) => ({
              itemId: row.id,
              date: row.date,
            })),
            nextItems: getMyFlowRows(flow.bundle, anchor).map((row) => ({
              itemId: row.id,
              date: row.date,
            })),
          })
        : personalExecutionState;

    if (reviewedVersion && typeof window !== 'undefined') {
      window.localStorage.setItem(
        getSourceBackedFlowMapSnapshotStorageKey(reviewedVersion.snapshot.mapId),
        JSON.stringify(reviewedVersion.snapshot),
      );
      window.localStorage.setItem(
        getSourceBackedFlowMapPersistenceStorageKey(reviewedVersion.snapshot.mapId),
        JSON.stringify(reviewedVersion.persistenceRecord),
      );
    }

    const nextRun = startFlowRunFromCompleted(flow.progress.slug, {
      previousRunId: completedRun.runId,
      reuseMode: myFlowReuseDraft.versionMode === 'latest'
        ? 'reviewed_version'
        : requiresAnchor ? 'new_anchor' : 'same_copy',
      ...(requiresAnchor ? { anchor } : {}),
      ...(requiresAnchor && myFlowReuseDraft.fixedDatePolicy
        ? { fixedDatePolicy: myFlowReuseDraft.fixedDatePolicy }
        : {}),
      personalExecutionStateSnapshot: nextPersonalExecutionStateSnapshot,
      ...(reviewedVersion
        ? {
            mapId: reviewedVersion.snapshot.mapId,
            sourceVersion: reviewedVersion.snapshot.version,
            personalCopySnapshot: reviewedVersion.snapshot.personalCopy,
          }
        : {}),
    });
    if (!nextRun) {
      updateMyFlowReuseDraft({ status: '새 실행을 시작하지 못했습니다. 날짜와 선택을 확인해 주세요.' });
      return;
    }

    setMyFlowReuseDraft(null);
    setMyFlowCompletionFeedbackDraft(null);
    setMyFlowPersonalCopySettingsDraft(null);
    setMyFlowItemDrafts(getStoredMyFlowItemDrafts());
    setMyFlowDateOverrides(getStoredMyFlowDateOverrides());
    setMyFlowOccurrenceExecutionRecords(getStoredMyFlowOccurrenceExecutionRecords());
    setMyFlowReuseNotice({
      flowSlug: flow.progress.slug,
      message: myFlowReuseDraft.versionMode === 'latest'
        ? `${requiresAnchor ? `새 ${anchorContext.label} ${formatMyFlowDisplayDate(anchor)}로 ` : ''}새 내용을 반영해 시작했어요. 지난 실행은 이전 내용 그대로 남아 있어요.`
        : requiresAnchor
          ? `새 ${anchorContext.label} ${formatMyFlowDisplayDate(anchor)}로 시작했어요. 지난 실행은 기록으로 남아 있어요.`
          : '새 실행을 시작했어요. 지난 실행은 기록으로 남아 있어요.',
    });
    setSelectedSavedFlowSlug('all');
    setSavedView('today');
    resetMyFlowRowDetailState();
    refreshSavedFlowState();
  };

  const renderTaskCompletionCheckbox = ({
    title,
    checked,
    onToggle,
    routine = false,
    compact = false,
    detail = false,
    disabled = false,
    disabledReason = '',
  }: {
    title: string;
    checked: boolean;
    onToggle: () => void;
    routine?: boolean;
    compact?: boolean;
    detail?: boolean;
    disabled?: boolean;
    disabledReason?: string;
  }) => {
    const actionLabel = routine
      ? (checked ? '이번 항목 완료 취소' : '이번 항목 완료')
      : (checked ? '완료 취소' : '완료 체크');
    const ariaLabel = disabled && disabledReason
      ? `${title} ${disabledReason}`
      : `${title} ${actionLabel}`;
    const shellSize = compact ? 'min-h-8 w-8' : detail ? 'min-h-9 w-9' : 'min-h-9 w-9';

    return (
      <label
        data-testid="my-flow-task-complete-label"
        className={`inline-flex shrink-0 items-center justify-center self-center rounded-md border bg-white transition ${shellSize} ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
            : checked
            ? 'border-emerald-300 text-emerald-700'
            : 'border-slate-300 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
        }`}
        title={ariaLabel}
        onClick={(event) => event.stopPropagation()}
      >
        <input
          data-testid="my-flow-task-complete-control"
          aria-label={ariaLabel}
          className="h-4 w-4 rounded border-slate-300 accent-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
        />
      </label>
    );
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

  const saveMyFlowStructuralOverlay = (
    flow: MySavedFlow,
    overlay: PersonalStructuralOverlay,
  ): boolean => {
    if (
      typeof window === 'undefined' ||
      isMyFlowScenarioDemo ||
      !isPersonalDraftStructuralEditEligible(flow.bundle)
    ) return false;
    try {
      const saved = savePersonalStructuralOverlay(window.localStorage, overlay);
      setMyFlowStructuralOverlaysBySlug((current) => ({
        ...current,
        [flow.progress.slug]: saved,
      }));
      return true;
    } catch {
      return false;
    }
  };

  const addMyFlowPersonalDraftItem = (flow: MySavedFlow) => {
    if (!isPersonalDraftStructuralEditEligible(flow.bundle)) return;
    const overlay =
      myFlowStructuralOverlaysBySlug[flow.progress.slug] ??
      createPersonalDraftStructuralOverlay(flow.bundle);
    const itemId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? `personal-item-${crypto.randomUUID()}`
      : `personal-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const created = createPersonalDraftUserItem({
      overlay,
      title: myFlowStructuralAddTitle,
      itemId,
    });
    if (!created || !saveMyFlowStructuralOverlay(flow, created.overlay)) return;
    setMyFlowStructuralAddTitle('');
    setMyFlowStructuralAddOpenSlug('');
    setMyFlowStructuralUndo(null);
    setMyFlowExpandedStructureStepSlug(flow.progress.slug);
  };

  const deleteMyFlowPersonalDraftItem = (row: MyFlowCalendarRow) => {
    const flow = row.flow;
    if (!isPersonalDraftStructuralEditEligible(flow.bundle)) return;
    const overlay =
      myFlowStructuralOverlaysBySlug[flow.progress.slug] ??
      createPersonalDraftStructuralOverlay(flow.bundle);
    const deleted = deletePersonalDraftStructuralItem({
      bundle: flow.bundle,
      overlay,
      itemId: row.id,
    });
    if (!deleted || !saveMyFlowStructuralOverlay(flow, deleted.overlay)) return;
    setMyFlowStructuralUndo(deleted.undo);
    resetMyFlowRowDetailState();
  };

  const undoMyFlowPersonalDraftDelete = (flow: MySavedFlow) => {
    if (!myFlowStructuralUndo || myFlowStructuralUndo.flowSlug !== flow.progress.slug) return;
    const overlay =
      myFlowStructuralOverlaysBySlug[flow.progress.slug] ??
      createPersonalDraftStructuralOverlay(flow.bundle);
    const restored = undoPersonalDraftStructuralDelete({
      overlay,
      undo: myFlowStructuralUndo,
    });
    if (!saveMyFlowStructuralOverlay(flow, restored)) return;
    setMyFlowStructuralUndo(null);
    setMyFlowExpandedStructureStepSlug(flow.progress.slug);
  };

  const restoreMyFlowPersonalDraftItem = (flow: MySavedFlow, itemId: string) => {
    if (!isPersonalDraftStructuralEditEligible(flow.bundle)) return;
    const overlay =
      myFlowStructuralOverlaysBySlug[flow.progress.slug] ??
      createPersonalDraftStructuralOverlay(flow.bundle);
    const restored = restorePersonalDraftStructuralItem({
      bundle: flow.bundle,
      overlay,
      itemId,
    });
    if (!restored || !saveMyFlowStructuralOverlay(flow, restored)) return;
    if (
      myFlowStructuralUndo?.flowSlug === flow.progress.slug &&
      myFlowStructuralUndo.itemId === itemId
    ) {
      setMyFlowStructuralUndo(null);
    }
    setMyFlowExpandedStructureStepSlug(flow.progress.slug);
  };

  const moveMyFlowPersonalDraftItem = (
    flow: MySavedFlow,
    itemId: string,
    direction: 'up' | 'down',
  ) => {
    if (!isPersonalDraftStructuralEditEligible(flow.bundle)) return;
    const overlay =
      myFlowStructuralOverlaysBySlug[flow.progress.slug] ??
      createPersonalDraftStructuralOverlay(flow.bundle);
    const reordered = movePersonalDraftStructuralItem({
      bundle: flow.bundle,
      overlay,
      itemId,
      direction,
    });
    if (!reordered || !saveMyFlowStructuralOverlay(flow, reordered)) return;
    setMyFlowExpandedStructureStepSlug(flow.progress.slug);
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
    const dateResolution = resolveSavedFlowRowDate(flow, row);
    const hasEffectiveSchedule = Boolean(dateResolution.date);
    return {
      ...row,
      flow,
      ...(hasEffectiveSchedule || row.date
        ? {
            originalDate: dateResolution.originalDate,
            calendarKey: dateResolution.overrideKey,
            date: dateResolution.date,
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

  const getMyFlowPersonalCopyStepRows = (flow: MySavedFlow): MyFlowRow[] => {
    const seen = new Set<string>();
    return getMyFlowRows(flow.bundle, flow.anchor).filter((row) => {
      const id = baseStateId(row.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  const getMyFlowPersonalCopyIncludedStepIds = (flow: MySavedFlow): string[] => {
    const allStepIds = getMyFlowPersonalCopyStepRows(flow).map((row) => baseStateId(row.id));
    const allStepIdSet = new Set(allStepIds);
    const savedIncluded = flow.savedMap?.personalCopy?.includedStepIdsByFlow[flow.progress.slug] ?? [];
    const included = savedIncluded.filter((id) => allStepIdSet.has(id));
    return included.length > 0 ? included : allStepIds.filter((id) => !isUrlFirstStartExcludedItemState(flow.itemStates, id));
  };

  const openMyFlowPersonalCopySettings = (flow: MySavedFlow) => {
    if (!canEditMyFlowSavedFlowSettings(flow)) return;
    setMyFlowExpandedStructureSlug(flow.progress.slug);
    setMyFlowPersonalCopySettingsDraft({
      flowSlug: flow.progress.slug,
      title: flow.savedMap?.personalCopy ? toUserFacingMapTitle(flow.savedMap.title) : getMyFlowExecutionFlowTitle(flow.progress.title),
      anchor: flow.anchor,
      includedStepIds: getMyFlowPersonalCopyIncludedStepIds(flow),
    });
  };

  const updateMyFlowPersonalCopySettingsDraft = (patch: Partial<Omit<MyFlowPersonalCopySettingsDraft, 'flowSlug'>>) => {
    setMyFlowPersonalCopySettingsDraft((current) => (current ? { ...current, ...patch, feedback: patch.feedback ?? '' } : current));
  };

  const toggleMyFlowPersonalCopyStep = (stepId: string, checked: boolean) => {
    setMyFlowPersonalCopySettingsDraft((current) => {
      if (!current) return current;
      const nextIncluded = checked
        ? Array.from(new Set([...current.includedStepIds, stepId]))
        : current.includedStepIds.filter((id) => id !== stepId);
      return {
        ...current,
        includedStepIds: nextIncluded,
        feedback: '',
      };
    });
  };

  const saveMyFlowDraftSettings = (flow: MySavedFlow) => {
    if (typeof window === 'undefined' || !isUrlFirstDraftSavedFlow(flow) || myFlowPersonalCopySettingsDraft?.flowSlug !== flow.progress.slug) return;

    const stepRows = getMyFlowPersonalCopyStepRows(flow);
    const allStepIds = stepRows.map((row) => baseStateId(row.id));
    const allStepIdSet = new Set(allStepIds);
    const includedStepIds = myFlowPersonalCopySettingsDraft.includedStepIds.filter((id) => allStepIdSet.has(id));
    if (includedStepIds.length === 0) {
      updateMyFlowPersonalCopySettingsDraft({ feedback: '최소 1개 할 일을 포함해 주세요.' });
      return;
    }

    const nextTitle = myFlowPersonalCopySettingsDraft.title.trim() || getMyFlowExecutionFlowTitle(flow.progress.title);
    const nextAnchor = myFlowPersonalCopySettingsDraft.anchor.trim();
    const updatedAt = new Date().toISOString();
    persist(bundles.map((bundle) => (
      bundle.flow.slug === flow.progress.slug
        ? {
            ...bundle,
            flow: {
              ...bundle.flow,
              title: nextTitle,
              anchor_type: nextAnchor && bundle.flow.anchor_type === 'none' ? 'start_date' : bundle.flow.anchor_type,
              updated_at: updatedAt,
            },
          }
        : bundle
    )));

    const savedRecord = getSavedFlowRecord(flow.progress.slug);
    saveFlowRecord(flow.progress.slug, {
      selectedArtifactMode: savedRecord?.selectedArtifactMode ?? 'calendar',
      ...(nextAnchor ? { anchor: nextAnchor } : {}),
    });
    saveStoredAnchor(flow.progress.slug, { mode: 'custom', anchor: nextAnchor });
    const includedStepIdSet = new Set(includedStepIds);
    const nextItemStates = { ...getItemStates(flow.progress.slug) };
    allStepIds.forEach((stepId) => {
      if (includedStepIdSet.has(stepId)) {
        const state = nextItemStates[stepId];
        if (state?.note === 'excluded_on_start') {
          const cleanedState: FlowItemState = { ...state };
          delete cleanedState.skipped;
          delete cleanedState.note;
          if (Object.keys(cleanedState).length > 0) nextItemStates[stepId] = cleanedState;
          else delete nextItemStates[stepId];
        }
        return;
      }
      nextItemStates[stepId] = {
        ...nextItemStates[stepId],
        skipped: true,
        note: 'excluded_on_start',
      };
    });
    saveItemStates(flow.progress.slug, nextItemStates);
    setMyFlowSelectedDate(nextAnchor || myFlowSelectedDate);
    if (nextAnchor) setMyFlowVisibleMonth(getMyFlowMonthStart(nextAnchor));
    resetMyFlowRowDetailState();
    setMyFlowPersonalCopySettingsDraft(null);
    refreshSavedFlowState();
  };

  const saveMyFlowPersonalCopySettings = (flow: MySavedFlow) => {
    if (typeof window === 'undefined' || myFlowPersonalCopySettingsDraft?.flowSlug !== flow.progress.slug) return;
    if (isUrlFirstDraftSavedFlow(flow) && !flow.savedMap?.personalCopy) {
      saveMyFlowDraftSettings(flow);
      return;
    }
    if (!flow.savedMap?.personalCopy) return;

    const stepRows = getMyFlowPersonalCopyStepRows(flow);
    const allStepIds = stepRows.map((row) => baseStateId(row.id));
    const allStepIdSet = new Set(allStepIds);
    const includedStepIds = myFlowPersonalCopySettingsDraft.includedStepIds.filter((id) => allStepIdSet.has(id));
    if (includedStepIds.length === 0) {
      updateMyFlowPersonalCopySettingsDraft({ feedback: '최소 1개 할 일을 포함해 주세요.' });
      return;
    }

    const sourceSnapshot = toSourceBackedSavedSnapshot(flow.savedMap);
    const adjusted = buildSourceBackedFlowMapPersonalCopyAdjustment(sourceSnapshot, {
      title: myFlowPersonalCopySettingsDraft.title,
      anchor: myFlowPersonalCopySettingsDraft.anchor,
      savedAt: new Date().toISOString(),
      includedStepIdsByFlow: {
        ...sourceSnapshot.personalCopy?.includedStepIdsByFlow,
        [flow.progress.slug]: includedStepIds,
      },
      baselineRecord: savedFlowMapPersistenceById[sourceSnapshot.mapId],
    });
    if (!adjusted) {
      updateMyFlowPersonalCopySettingsDraft({ feedback: '저장할 수 있는 Step을 확인해 주세요.' });
      return;
    }

    window.localStorage.setItem(getSourceBackedFlowMapSnapshotStorageKey(adjusted.snapshot.mapId), JSON.stringify(adjusted.snapshot));
    window.localStorage.setItem(getSourceBackedFlowMapPersistenceStorageKey(adjusted.snapshot.mapId), JSON.stringify(adjusted.persistenceRecord));

    const includedStepIdSet = new Set(includedStepIds);
    const nextItemStates = { ...getItemStates(flow.progress.slug) };
    allStepIds.forEach((stepId) => {
      if (includedStepIdSet.has(stepId)) {
        const state = nextItemStates[stepId];
        if (state?.note === 'excluded_on_start') {
          const cleanedState: FlowItemState = { ...state };
          delete cleanedState.skipped;
          delete cleanedState.note;
          if (Object.keys(cleanedState).length > 0) nextItemStates[stepId] = cleanedState;
          else delete nextItemStates[stepId];
        }
        return;
      }
      nextItemStates[stepId] = {
        ...nextItemStates[stepId],
        skipped: true,
        note: 'excluded_on_start',
      };
    });
    saveItemStates(flow.progress.slug, nextItemStates);

    const savedRecord = getSavedFlowRecord(flow.progress.slug);
    saveFlowRecord(flow.progress.slug, {
      selectedArtifactMode: savedRecord?.selectedArtifactMode ?? 'checklist',
      ...(adjusted.snapshot.anchor ? { anchor: adjusted.snapshot.anchor } : {}),
    });
    saveStoredAnchor(flow.progress.slug, { mode: 'custom', anchor: adjusted.snapshot.anchor ?? '' });
    resetMyFlowRowDetailState();
    setMyFlowPersonalCopySettingsDraft(null);
    refreshSavedFlowState();
  };

  const openMyFlowDirectAnchorSettings = (flow: MySavedFlow) => {
    if (!canEditMyFlowDirectSavedMapAnchor(flow) || !flow.savedMap) return;
    setMyFlowExpandedStructureSlug(flow.progress.slug);
    setMyFlowDirectAnchorSettingsDraft({
      mapId: flow.savedMap.mapId,
      anchor: flow.anchor || flow.savedMap.anchor || '',
    });
  };

  const saveMyFlowDirectAnchorSettings = (flow: MySavedFlow) => {
    if (
      typeof window === 'undefined' ||
      !canEditMyFlowDirectSavedMapAnchor(flow) ||
      !flow.savedMap ||
      myFlowDirectAnchorSettingsDraft?.mapId !== flow.savedMap.mapId
    ) return;

    const nextAnchor = myFlowDirectAnchorSettingsDraft.anchor.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextAnchor)) {
      setMyFlowDirectAnchorSettingsDraft((current) => current ? {
        ...current,
        feedback: `${getMyFlowDirectSavedMapAnchorCopy(flow).label}을 입력해 주세요.`,
      } : current);
      return;
    }

    const sourceSnapshot = toSourceBackedSavedSnapshot(flow.savedMap);
    const baselineRecord = savedFlowMapPersistenceById[sourceSnapshot.mapId];
    if (!baselineRecord) {
      setMyFlowDirectAnchorSettingsDraft((current) => current ? {
        ...current,
        feedback: '저장된 일정 정보를 다시 확인해 주세요.',
      } : current);
      return;
    }
    const savedAt = new Date().toISOString();
    const adjusted = buildSourceBackedFlowMapAnchorAdjustment(sourceSnapshot, {
      anchor: nextAnchor,
      savedAt,
      baselineRecord,
    });
    if (!adjusted) {
      setMyFlowDirectAnchorSettingsDraft((current) => current ? {
        ...current,
        feedback: '기준일을 저장하지 못했습니다.',
      } : current);
      return;
    }

    let nextDateOverrides = myFlowDateOverrides;
    let nextItemDrafts = myFlowItemDrafts;
    const mapFlows = savedFlows.filter((candidate) => candidate.savedMap?.mapId === sourceSnapshot.mapId);
    mapFlows.forEach((candidate) => {
      const previousRows = getMyFlowRows(candidate.bundle, candidate.anchor);
      const nextRows = getMyFlowRows(candidate.bundle, nextAnchor);
      const previousItems = previousRows.map((row) => ({ itemId: row.id, date: row.date }));
      const nextItems = nextRows.map((row) => ({ itemId: row.id, date: row.date }));
      nextDateOverrides = rekeyMyFlowAnchorDatedRecord(nextDateOverrides, {
        flowSlug: candidate.progress.slug,
        previousItems,
        nextItems,
      });
      nextItemDrafts = rekeyMyFlowAnchorDatedRecord(nextItemDrafts, {
        flowSlug: candidate.progress.slug,
        previousItems,
        nextItems,
      });

      const nextRowById = new Map(nextRows.map((row) => [row.id, row]));
      const nextChecks = { ...candidate.checks };
      previousRows.forEach((previousRow) => {
        const nextRow = nextRowById.get(previousRow.id);
        if (!nextRow) return;
        const previousCheckIds = getMyFlowCheckIds(candidate.bundle, previousRow.id, candidate.anchor);
        const nextCheckIds = getMyFlowCheckIds(candidate.bundle, nextRow.id, nextAnchor);
        if (
          previousCheckIds.length !== nextCheckIds.length ||
          previousCheckIds.every((checkId, index) => checkId === nextCheckIds[index])
        ) return;
        const previousValues = previousCheckIds.map((checkId) => ({
          present: Object.prototype.hasOwnProperty.call(nextChecks, checkId),
          value: nextChecks[checkId],
        }));
        previousCheckIds.forEach((checkId) => delete nextChecks[checkId]);
        nextCheckIds.forEach((checkId, index) => {
          if (previousValues[index]?.present) nextChecks[checkId] = previousValues[index].value;
        });
      });
      saveChecks(candidate.progress.slug, nextChecks);

      const savedRecord = getSavedFlowRecord(candidate.progress.slug);
      saveFlowRecord(candidate.progress.slug, {
        selectedArtifactMode: savedRecord?.selectedArtifactMode ?? 'calendar',
        anchor: nextAnchor,
      });
      saveStoredAnchor(candidate.progress.slug, { mode: 'custom', anchor: nextAnchor });
    });

    saveStoredMyFlowDateOverrides(nextDateOverrides);
    saveStoredMyFlowItemDrafts(nextItemDrafts);
    setMyFlowDateOverrides(nextDateOverrides);
    setMyFlowItemDrafts(nextItemDrafts);
    window.localStorage.setItem(
      getSourceBackedFlowMapSnapshotStorageKey(adjusted.snapshot.mapId),
      JSON.stringify(adjusted.snapshot),
    );
    window.localStorage.setItem(
      getSourceBackedFlowMapPersistenceStorageKey(adjusted.snapshot.mapId),
      JSON.stringify(adjusted.persistenceRecord),
    );
    setMyFlowSelectedDate(nextAnchor);
    setMyFlowVisibleMonth(getMyFlowMonthStart(nextAnchor));
    resetMyFlowRowDetailState();
    setMyFlowDirectAnchorSettingsDraft(null);
    refreshSavedFlowState();
  };

  const getPostSaveContinuationRow = (): MyFlowCalendarRow | null => {
    if (postSavePrimaryContinuationRow) return postSavePrimaryContinuationRow;
    const postSaveFlowSlugs = new Set(postSaveFlows.map((flow) => flow.progress.slug));
    if (myFlowPrimaryContinuationRow && postSaveFlowSlugs.has(myFlowPrimaryContinuationRow.flow.progress.slug)) {
      return myFlowPrimaryContinuationRow;
    }
    const firstPostSaveRow = postSaveFlows
      .flatMap((flow) => flow.rows.map((row, index) => {
        const dateResolution = resolveSavedFlowRowDate(flow, row);
        return {
          flow,
          row: row.structuralOccurrenceId
            ? row
            : { ...row, date: dateResolution.date },
          dateResolution,
          index,
        };
      }))
      .sort((left, right) => {
        const leftDate = left.row.date ?? '9999-12-31';
        const rightDate = right.row.date ?? '9999-12-31';
        const dateOrder = leftDate.localeCompare(rightDate);
        return dateOrder === 0 ? left.index - right.index : dateOrder;
      })[0];
    if (!firstPostSaveRow) return null;
    const { dateResolution } = firstPostSaveRow;
    return {
      ...firstPostSaveRow.row,
      flow: firstPostSaveRow.flow,
      ...(dateResolution.date
        ? {
            originalDate: dateResolution.originalDate,
            calendarKey: dateResolution.overrideKey,
            date: dateResolution.date,
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
      suppressDateMeta?: boolean;
      hideTimingMeta?: boolean;
      hideSectionMeta?: boolean;
      hideFlowMeta?: boolean;
      showFlowProgress?: boolean;
      showOpenLabel?: boolean;
      detailSurface?: MyFlowView;
      markerColor?: string;
    } = {},
  ) => {
    const checked = isMyFlowRowChecked(row.flow, row);
    const color = options.markerColor ?? categoryColors[row.flow.bundle.flow.category] ?? '#2563EB';
    const activeRowKey = myFlowActiveRow && myFlowDetailOpen ? getMyFlowRowInstanceKey(myFlowActiveRow) : '';
    const isActive = Boolean(activeRowKey) && getMyFlowRowInstanceKey(row) === activeRowKey;
    const displayTitle = getMyFlowRowDisplayTitle(row);
    const displayTiming = options.kind === 'routine' || options.hideTimingMeta ? '' : formatMyFlowTimingChip(row.timing ?? '');
    const timingAccessibilityLabel = options.kind === 'routine' || options.hideTimingMeta ? undefined : getMyFlowTimingChipLabel(row.timing ?? '');
    const displaySection = options.hideSectionMeta ? '' : getMyFlowRowDisplaySectionLabel(row);
    const displayDate = row.date ? formatMyFlowDisplayDate(row.date) : '';
    const displayTimedSchedule = formatMyFlowTimedScheduleLabel(
      row.structuralScheduleProjection,
    );
    const rowDateMeta = options.kind === 'routine' && !options.showRoutineDate ? '루틴' : displayDate;
    const flowChipLabel = getMyFlowFlowChipLabel(row.flow);
    const showFlowChip = !options.minimalMeta && !options.hideFlowMeta && (options.showFlowProgress || visibleSavedFlows.length > 1 || Boolean(row.flow.savedMap));
    const flowProgressLabel = getMyFlowFlowProgressLabel(row.flow);
    const showDateMeta = Boolean(rowDateMeta) && !options.suppressDateMeta;
    const showSectionMeta = !options.minimalMeta && Boolean(displaySection);
    const showProgressMeta = Boolean(options.showFlowProgress);
    const occurrenceExecutionState = row.structuralOccurrenceExecutionState ?? 'pending';
    const occurrenceStatusLabel = occurrenceExecutionState === 'skipped'
      ? '건너뜀'
      : occurrenceExecutionState === 'held'
        ? '보류'
        : '';
    const occurrenceCompletionDisabled = Boolean(
      row.structuralOccurrenceId &&
      (occurrenceExecutionState === 'skipped' || occurrenceExecutionState === 'held'),
    );
    const hasRowMeta = showDateMeta || Boolean(displayTimedSchedule) || Boolean(displayTiming) || showSectionMeta || showFlowChip || showProgressMeta || Boolean(occurrenceStatusLabel);
    const rowOpenAriaContext = [flowChipLabel, displayDate].filter(Boolean).join(' · ');
    const rowOpenAriaLabel = options.showOpenLabel
      ? `${displayTitle} 열기${rowOpenAriaContext ? ` · ${rowOpenAriaContext}` : ''}`
      : undefined;
    const isRoutineExecution = options.kind === 'routine' || row.itemType?.primary === 'routine_session';
    const routineProgressLabel = getMyFlowRoutineExecutionLabel(row);
    const routineDragKey = getMyFlowRowInstanceKey(row);
    const rowClassName = options.compact
      ? `flex min-w-0 items-center gap-2 border-b py-2.5 text-sm ${isActive ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 bg-transparent'}`
      : `flex min-w-0 items-center gap-2 rounded-md border bg-white p-2 text-sm ${isActive ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'}`;
    const rowButtonClassName = `flex min-w-0 flex-1 items-start text-left transition hover:text-blue-800 ${options.compact ? 'gap-2 py-0.5' : 'gap-3 rounded-md px-1 py-1 hover:bg-blue-50'}`;
    const rowDotClassName = `mt-1 shrink-0 rounded-full ${options.compact ? 'h-1.5 w-1.5 sm:h-2 sm:w-2' : 'h-2.5 w-2.5'}`;
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
          data-item-id={row.id}
          data-occurrence-id={row.structuralOccurrenceId}
          data-occurrence-state={row.structuralOccurrenceExecutionState}
          data-structural-order-rank={row.structuralProjectionOrderRank}
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
          <div className="flex shrink-0 items-center justify-center">
            {renderTaskCompletionCheckbox({
              title: displayTitle,
              checked,
              routine: isRoutineExecution,
              compact: options.compact,
              disabled: occurrenceCompletionDisabled,
              disabledReason: '다시 진행한 뒤 완료로 표시할 수 있어요',
              onToggle: () => toggleSavedFlowItem(row.flow, row.id, row),
            })}
          </div>
          <button
            className={rowButtonClassName}
            type="button"
            aria-label={rowOpenAriaLabel}
            onClick={() => toggleMyFlowRowDetail(row, rowDetailSurface)}
          >
            <span className={rowDotClassName} style={{ backgroundColor: color }} />
            <span className="min-w-0 flex-1">
              {hasRowMeta ? (
                <span className="flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-500 sm:gap-1.5">
                {showDateMeta ? <span data-testid="my-flow-row-date-meta" className={options.hideDateMeta ? 'hidden sm:inline' : undefined}>{rowDateMeta}</span> : null}
                {displayTimedSchedule ? <span data-testid="personal-draft-timed-meta">{displayTimedSchedule}</span> : null}
                {displayTiming ? <span data-testid="my-flow-row-timing-chip" aria-label={timingAccessibilityLabel} title={timingAccessibilityLabel} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{displayTiming}</span> : null}
                {showSectionMeta ? <span data-testid="my-flow-row-section-label">{displaySection}</span> : null}
                {showFlowChip ? <span data-testid="my-flow-row-flow-chip" className="max-w-full truncate rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{flowChipLabel}</span> : null}
                {showProgressMeta ? <span data-testid="my-flow-row-progress-chip" className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{flowProgressLabel}</span> : null}
                {occurrenceStatusLabel ? (
                  <span
                    data-testid="personal-draft-occurrence-row-status"
                    className={`rounded px-1.5 py-0.5 text-[10px] ${occurrenceExecutionState === 'held' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {occurrenceStatusLabel}
                  </span>
                ) : null}
                </span>
              ) : null}
              <span className={`${hasRowMeta ? 'mt-1' : ''} flex min-w-0 items-center gap-2`}>
                <span className={`min-w-0 flex-1 font-semibold ${checked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                  {displayTitle}
                </span>
                {options.showOpenLabel ? (
                  <span data-testid="my-flow-row-open-label" className="shrink-0 text-[11px] font-semibold text-blue-700">
                    열기 ›
                  </span>
                ) : null}
              </span>
            </span>
          </button>
          {isRoutineExecution ? (
            <span data-testid="my-flow-routine-progress-pill" className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
              {routineProgressLabel}
            </span>
          ) : null}
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
        data-item-id={row.id}
        data-occurrence-id={row.structuralOccurrenceId}
        data-occurrence-state={row.structuralOccurrenceExecutionState}
        data-structural-order-rank={row.structuralProjectionOrderRank}
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
        <div className="flex shrink-0 items-center justify-center">
          {renderTaskCompletionCheckbox({
            title: displayTitle,
            checked,
            routine: isRoutineExecution,
            compact: options.compact,
            disabled: occurrenceCompletionDisabled,
            disabledReason: '다시 진행한 뒤 완료로 표시할 수 있어요',
            onToggle: () => toggleSavedFlowItem(row.flow, row.id, row),
          })}
        </div>
        <button
          className={rowButtonClassName}
          type="button"
          aria-label={rowOpenAriaLabel}
          onClick={() => toggleMyFlowRowDetail(row, rowDetailSurface)}
        >
          <span className={rowDotClassName} style={{ backgroundColor: color }} />
          <span className="min-w-0 flex-1">
            {hasRowMeta ? (
              <span className="flex flex-wrap items-center gap-1 text-xs font-semibold text-slate-500 sm:gap-1.5">
                {showDateMeta ? <span data-testid="my-flow-row-date-meta" className={options.hideDateMeta ? 'hidden sm:inline' : undefined}>{rowDateMeta}</span> : null}
                {displayTimedSchedule ? <span data-testid="personal-draft-timed-meta">{displayTimedSchedule}</span> : null}
                {displayTiming ? <span data-testid="my-flow-row-timing-chip" aria-label={timingAccessibilityLabel} title={timingAccessibilityLabel} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{displayTiming}</span> : null}
                {showSectionMeta ? <span data-testid="my-flow-row-section-label">{displaySection}</span> : null}
              {showFlowChip ? <span data-testid="my-flow-row-flow-chip" className="max-w-full truncate rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{flowChipLabel}</span> : null}
              {showProgressMeta ? <span data-testid="my-flow-row-progress-chip" className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{flowProgressLabel}</span> : null}
              {occurrenceStatusLabel ? (
                <span
                  data-testid="personal-draft-occurrence-row-status"
                  className={`rounded px-1.5 py-0.5 text-[10px] ${occurrenceExecutionState === 'held' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
                >
                  {occurrenceStatusLabel}
                </span>
              ) : null}
              </span>
            ) : null}
            <span className={`${hasRowMeta ? 'mt-1' : ''} flex min-w-0 items-center gap-2`}>
              <span className={`min-w-0 flex-1 font-semibold ${checked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                {displayTitle}
              </span>
              {options.showOpenLabel ? (
                <span data-testid="my-flow-row-open-label" className="shrink-0 text-[11px] font-semibold text-blue-700">
                  열기 ›
                </span>
              ) : null}
            </span>
            {!options.compact && !options.hideTimingMeta && row.timing ? <span className="mt-1 block text-xs text-slate-500">{formatMyFlowTimingChip(row.timing)}</span> : null}
          </span>
        </button>
        {isRoutineExecution ? (
          <span data-testid="my-flow-routine-progress-pill" className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
            {routineProgressLabel}
          </span>
        ) : null}
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
    const rowTitle = getMyFlowRowDisplayTitle(row);
    const color = categoryColors[flow.bundle.flow.category] ?? '#2563EB';
    const isPrimary = options.tone === 'primary';
    const rowMeta = [
      row.date ? formatMyFlowDisplayDate(row.date) : '',
      formatMyFlowTimedScheduleLabel(row.structuralScheduleProjection),
      row.timing ? formatMyFlowTimingChip(row.timing) : '',
      getMyFlowRowDisplaySectionLabel(row),
    ].filter(Boolean).join(' · ');
    const flowMeta = [
      getMyFlowExecutionFlowTitle(flow.progress.title),
    ].filter(Boolean).join(' · ');
    const toneClassName = isPrimary || isActive
      ? 'border-blue-200 bg-blue-50/50'
      : 'border-slate-200 bg-transparent';

    return (
      <article
        key={`mobile-continuation-${rowKey}`}
        data-testid="my-flow-mobile-continuation-card"
        data-flow-slug={flow.progress.slug}
        data-row-key={rowKey}
        className={`min-w-0 border-b px-1 py-3 ${toneClassName}`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span data-testid="my-flow-mobile-continuation-complete" className="mt-0.5 shrink-0">
            {renderTaskCompletionCheckbox({
              title: rowTitle,
              checked,
              onToggle: () => toggleSavedFlowItem(flow, row.id, row),
            })}
          </span>
          <button
            type="button"
            data-testid="my-flow-mobile-continuation-open"
            aria-expanded={isActive}
            className={`min-w-0 flex-1 text-left transition ${
              isActive || isPrimary ? 'text-slate-950' : 'text-slate-900 hover:text-blue-800'
            }`}
            onClick={() => toggleMyFlowRowDetail(row, 'today')}
          >
            <span className="flex min-w-0 items-start justify-between gap-3">
              <span className="min-w-0 flex-1">
                <span data-testid="my-flow-mobile-continuation-flow-context" className="flex min-w-0 items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  <span className="min-w-0 truncate">{flowMeta}</span>
                </span>
                {options.hideLeadLabel ? null : (
                  <span className="mt-1 block text-xs font-semibold text-blue-700">{isPrimary ? options.primaryLabel ?? '지금 할 일' : options.nextLabel ?? '다음 할 일'}</span>
                )}
                <span data-testid="my-flow-mobile-continuation-title" className={`mt-1 block text-base font-semibold leading-6 ${checked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                  {rowTitle}
                </span>
                <span className="mt-1 block text-xs font-medium text-slate-500">
                  {rowMeta || getMyFlowRowDisplaySectionLabel(row) || '날짜 없는 체크 항목'}
                </span>
              </span>
              <span className="shrink-0 pt-0.5 text-xs font-semibold text-blue-700">
                {isActive ? '닫기' : '열기'} ›
              </span>
            </span>
          </button>
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
    if (kind === 'scheduleFlowOverflow') {
      const hiddenCount = Number(info.event.extendedProps.hiddenCount ?? 0);
      const totalFlowCount = Number(info.event.extendedProps.totalFlowCount ?? 0);
      const hiddenFlowTitles = ((info.event.extendedProps.hiddenFlowTitles ?? []) as string[])
        .filter(Boolean)
        .join(', ');
      const eventDate = info.event.startStr;
      const selectOverflowDate = () => {
        if (!eventDate) return;
        setMyFlowSelectedDate(eventDate);
        setMyFlowRoutineOverflowDate('');
        setMyFlowScheduleOverflowDate('');
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
          data-testid="my-flow-calendar-grid-overflow-summary"
          role="button"
          tabIndex={0}
          aria-label={`${eventDate} Flow ${totalFlowCount}개 중 ${hiddenCount}개 더 보기${hiddenFlowTitles ? `: ${hiddenFlowTitles}` : ''}`}
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
          외 {hiddenCount}개
        </span>
      );
    }
    const checked = Boolean(info.event.extendedProps.checked);
    const color = String(info.event.extendedProps.color ?? '#2563EB');
    const flowMarkerTitle = String(info.event.extendedProps.flowMarkerTitle ?? '');
    const flowMarkerShortTitle = String(info.event.extendedProps.flowMarkerShortTitle ?? '').trim();
    const flowMarkerInitial = String(info.event.extendedProps.flowMarkerInitial ?? '').trim().slice(0, 1);
    const scheduleLabel = flowMarkerShortTitle || getMyFlowCalendarShortTitle(String(info.event.extendedProps.itemTitle ?? info.event.title));

    return (
      <span
        data-testid="my-flow-calendar-schedule-content"
        data-flow-marker-key={String(info.event.extendedProps.flowMarkerKey ?? '')}
        className="flex min-w-0 items-center gap-1"
        aria-label={flowMarkerTitle || scheduleLabel}
      >
        <span
          data-testid="my-flow-calendar-schedule-rail"
          data-flow-marker-initial={flowMarkerInitial || 'F'}
          aria-hidden="true"
          className="flex h-3 w-3 shrink-0 items-center justify-center rounded-[3px] text-[8px] font-black leading-none text-white"
          style={{ backgroundColor: checked ? '#94A3B8' : color }}
        >
          {flowMarkerInitial || 'F'}
        </span>
        <span
          data-testid="my-flow-calendar-flow-label"
          title={flowMarkerTitle || scheduleLabel}
          className={`truncate text-[10px] font-black leading-none ${checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}
        >
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
    if (info.event.startStr) setMyFlowSelectedDate(info.event.startStr.slice(0, 10));
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
    if (kind === 'scheduleOverflow' || kind === 'scheduleFlowOverflow') {
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
    const nextDate = info.event.startStr.slice(0, 10);
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
    const isInlineMode = mode === 'inline';
    const isInlineMobileMode = isInlineMode && isMyFlowMobileViewport;
    const isFlowTabInlineMobileMode = isInlineMobileMode && surfaceContext === 'flow';
    const isRoutineRow = row.flow.bundle.flow.structure_type === 'routine';
    const isProgressFlow = Boolean(row.flow.bundle.flow.tags?.includes('progress-flow'));
    const isPersonalDraftUserItem =
      isPersonalDraftStructuralEditEligible(row.flow.bundle) &&
      row.structuralOwnership === 'user_created';
    const isPersonalDraftRecurringSeries = Boolean(
      isPersonalDraftUserItem && row.structuralRepeat && !row.structuralOccurrenceId,
    );
    const isPersonalDraftOccurrence = Boolean(
      isPersonalDraftUserItem && row.structuralOccurrenceId,
    );
    const sourceRow = row.flow.rows.find(
      (candidate) => baseStateId(candidate.id) === baseStateId(row.id),
    );
    const isOriginallyUndatedSavedItem = Boolean(
      sourceRow &&
        !isPersonalDraftUserItem &&
        row.flow.bundle.flow.structure_type !== 'routine' &&
        !sourceRow.date,
    );
    const occurrenceExecutionState = row.structuralOccurrenceExecutionState ?? 'pending';
    const occurrenceExecutionPaused =
      occurrenceExecutionState === 'skipped' || occurrenceExecutionState === 'held';
    const timing = row.timing ?? item?.repeat_rule ?? '';
    const detailSection = getMyFlowRowDisplaySectionLabel(row);
    const visibleDetailSection = isProgressFlow ? '' : detailSection;
    const detailFlowChipLabel = getMyFlowFlowChipLabel(row.flow);
    const showDetailFlowChip = Boolean(detailFlowChipLabel) && !isInlineMode;
    const routineKey = getMyFlowRowInstanceKey(row);
    const isRoutineRepeatExpanded = myFlowExpandedRoutineKey === routineKey;
    const isAdvancedExpanded = myFlowExpandedAdvancedKey === routineKey;
    const isMemoExpanded = myFlowExpandedMemoKey === routineKey;
    const typeSummary = getMyFlowDetailTypeSummary(row);
    const decisionDraft = getMyFlowDecisionDraft(row);
    const isDecisionRow = row.itemType?.primary === 'decision_hold' || Boolean(row.itemType?.secondary.includes('decision_hold'));
    const isLogRow = row.itemType?.primary === 'log_entry' || Boolean(row.itemType?.secondary.includes('log_entry'));
    const showTypeSummary = !isDrawerMode && !isProgressFlow && !isInlineMode;
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
    const shouldCollapseReadSummary = isInlineMode;
    const shouldCollapsePortableExport = isInlineMode;
    const portableExportKey = getMyFlowRowInstanceKey(row);
    const portableExportStableStepId = row.structuralProjectionStableId
      ? `${row.flow.progress.slug}::${row.structuralProjectionStableId}`
      : portableExportKey;
    const portableRecurrence = row.structuralRepeat && (
      isPersonalDraftUserItem || row.structuralOccurrenceOrigin === 'saved_routine'
    )
      ? row.structuralRepeat
      : undefined;
    const isDetailEditing = !isDrawerMode && myFlowEditingDetailKey === portableExportKey;
    const showEditableDetailFields = isDrawerMode || isDetailEditing;
    const portableExportInput: MyFlowPortableStepExportInput = {
      flowTitle: getMyFlowPortableExportFlowTitle(row.flow),
      stepId: portableExportStableStepId,
      stepTitle: editorDraft.title,
      sectionTitle: visibleDetailSection,
      date: editorDraft.date,
      time: editorDraft.time,
      ...(isPersonalDraftUserItem
        ? {
            stableEventIdentitySeed:
              row.structuralScheduleProjection?.stableEventIdentitySeed,
            ...(editorDraft.scheduleMode === 'timed'
              ? {
                  durationMinutes: editorDraft.durationMinutes,
                  timeZone: row.structuralScheduleProjection?.timeZone,
                }
              : {}),
          }
        : {}),
      repeatPreset: editorDraft.repeatPreset,
      ...(portableRecurrence
        ? {
            personalRecurrence: portableRecurrence,
            personalRecurrenceIdentityNamespace: row.flow.progress.slug,
          }
        : {}),
      location: editorDraft.location,
      memo: editorDraft.memo,
      sourceLabel: primaryLink ? toUserFacingSourceTitle(primaryLink.label) : undefined,
      sourceUrl: primaryLink?.url,
      items: detailChecklistItems,
      checkedItems: detailChecklistState,
      completionCriteria: detail.completion_criteria,
      caution: detail.caution,
    };
    const canDownloadPortableCalendar =
      canBuildMyFlowStepIcs(portableExportInput) &&
      (row.structuralCalendarIcsEligible ?? true);
    const portableExportSummary = canDownloadPortableCalendar ? '메모 · 체크리스트 · 시트 행 · 캘린더' : '메모 · 체크리스트 · 시트 행 · 날짜 필요';
    const showPersonalCopyPortableExportNote = Boolean(row.flow.savedMap?.personalCopy);
    const hasExpandableMemo = editorDraft.memo.trim().length > 0;
    const inlineDetailHeaderLabel = hasDetailChecklistItems ? '확인할 항목' : '실행할 일';
    const routineProgressLabel = getMyFlowRoutineExecutionLabel(row);
    const detailChecklistProgressLabel = `${detailChecklistLabel} ${Object.values(detailChecklistState).filter(Boolean).length}/${detailChecklistItems.length}`;
    const canUndoRoutineCompletion = isRoutineRow && myFlowRoutineCompletionUndo?.flowSlug === row.flow.progress.slug;
    const fieldClassName = 'mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
    const textareaClassName = `${fieldClassName} ${isMemoExpanded ? 'min-h-52' : isDrawerMode ? 'h-28 min-h-28' : 'h-20 min-h-20'} resize-y font-normal leading-6`;
    const canEditDate = Boolean(
      row.calendarKey || isProgressFlow || isPersonalDraftUserItem || isOriginallyUndatedSavedItem,
    );
    const itemDateOverrideLabel = getSourceBackedFlowMapDateAnchorCopy().itemOverrideLabel;
    const itemEditButtonLabel = canEditDate ? '제목·날짜·메모 수정' : '제목·메모 수정';
    const itemEditButtonAriaLabel = `${editorDraft.title} ${itemEditButtonLabel}`;
    const itemEditCancelAriaLabel = `${editorDraft.title} 수정 취소`;
    const showTimeLocationFields =
      !isPersonalDraftUserItem && (!isProgressFlow || Boolean(row.calendarKey));
    const showRepeatPresetField = !isRoutineRow && showTimeLocationFields;
    const personalDraftTimedScheduleInvalid = Boolean(
      isPersonalDraftUserItem &&
        editorDraft.date &&
        editorDraft.scheduleMode === 'timed' &&
        (
          !isPersonalStructuralLocalTime(editorDraft.time) ||
          !isPersonalDraftDurationValid(editorDraft.durationMinutes)
        ),
    );
    const personalDraftRecurrenceMode =
      editorDraft.repeatPreset === 'daily' ||
      editorDraft.repeatPreset === 'weekly' ||
      editorDraft.repeatPreset === 'monthly'
        ? editorDraft.repeatPreset
        : '';
    const personalDraftRecurrenceInvalid = Boolean(
      isPersonalDraftUserItem &&
        editorDraft.date &&
        personalDraftRecurrenceMode &&
        (
          !Number.isInteger(editorDraft.recurrenceInterval) ||
          editorDraft.recurrenceInterval < 1 ||
          editorDraft.recurrenceInterval > PERSONAL_STRUCTURAL_RECURRENCE_MAX_INTERVAL ||
          (personalDraftRecurrenceMode === 'weekly' &&
            editorDraft.recurrenceWeekdays.length === 0) ||
          (editorDraft.recurrenceEndMode === 'until' &&
            (!/^\d{4}-\d{2}-\d{2}$/.test(editorDraft.recurrenceUntil) ||
              editorDraft.recurrenceUntil < editorDraft.date)) ||
          (editorDraft.recurrenceEndMode === 'count' &&
            (!Number.isInteger(editorDraft.recurrenceCount) ||
              editorDraft.recurrenceCount < 1 ||
              editorDraft.recurrenceCount > PERSONAL_STRUCTURAL_RECURRENCE_MAX_COUNT))
        ),
    );
    const scheduleSummaryRows = [
      editorDraft.date ? { label: '날짜', value: /^\d{4}-\d{2}-\d{2}$/.test(editorDraft.date) ? formatMyFlowDisplayDate(editorDraft.date) : editorDraft.date } : undefined,
      editorDraft.time ? { label: '시간', value: formatMyFlowLocalTimeLabel(editorDraft.time) } : undefined,
      isPersonalDraftUserItem && editorDraft.scheduleMode === 'timed'
        ? { label: '예상', value: formatMyFlowDurationLabel(editorDraft.durationMinutes) }
        : undefined,
      personalDraftRecurrenceMode
        ? {
            label: '반복',
            value: formatPersonalDraftRecurrenceSummary(
              row.structuralRepeat,
              editorDraft.date,
            ) || (personalDraftRecurrenceMode === 'daily'
              ? '매일'
              : personalDraftRecurrenceMode === 'weekly'
                ? '매주'
                : '매월'),
          }
        : editorDraft.repeatPreset
          ? { label: '반복', value: editorDraft.repeatPreset }
          : undefined,
      editorDraft.location ? { label: '장소', value: editorDraft.location } : undefined,
    ].filter((entry): entry is { label: string; value: string } => Boolean(entry));
    const occurrenceFields = (
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {isPersonalDraftUserItem ? (
          <fieldset
            data-testid="personal-draft-date-mode-control"
            className="min-w-0 sm:col-span-2"
          >
            <legend className="text-xs font-semibold text-slate-600">날짜</legend>
            <div className="mt-1 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
              <button
                type="button"
                data-testid="personal-draft-date-mode-none"
                aria-pressed={!editorDraft.date}
                className={`min-h-9 rounded px-3 py-2 text-xs font-semibold ${
                  !editorDraft.date
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
                onClick={() => updateMyFlowEditingDraft(row, {
                  date: '',
                  scheduleMode: 'all_day',
                  time: '',
                  durationMinutes: undefined,
                  repeatPreset: '',
                  recurrenceInterval: 1,
                  recurrenceEndMode: 'never',
                })}
              >
                날짜 없음
              </button>
              <button
                type="button"
                data-testid="personal-draft-date-mode-fixed"
                aria-pressed={Boolean(editorDraft.date)}
                className={`min-h-9 rounded px-3 py-2 text-xs font-semibold ${
                  editorDraft.date
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-white/70'
                }`}
                onClick={() => {
                  if (!editorDraft.date) {
                    updateMyFlowEditingDraft(row, {
                      date: myFlowTodayDate,
                      scheduleMode: 'all_day',
                      time: '',
                      durationMinutes: undefined,
                    });
                  }
                }}
              >
                날짜 지정
              </button>
            </div>
            {editorDraft.date ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block text-xs font-semibold text-slate-600">
                  날짜 선택
                  <input
                    data-testid="my-flow-detail-date-input"
                    aria-label={`${editorDraft.title} 날짜 선택`}
                    className={fieldClassName}
                    type="date"
                    value={editorDraft.date}
                    onChange={(event) => updateMyFlowEditingDraft(row, { date: event.target.value })}
                  />
                </label>
                <button
                  type="button"
                  data-testid="personal-draft-date-clear"
                  className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300"
                  onClick={() => updateMyFlowEditingDraft(row, {
                    date: '',
                    scheduleMode: 'all_day',
                    time: '',
                    durationMinutes: undefined,
                    repeatPreset: '',
                    recurrenceInterval: 1,
                    recurrenceEndMode: 'never',
                  })}
                >
                  날짜 지우기
                </button>
              </div>
            ) : null}
            {editorDraft.date ? (
              <fieldset
                data-testid="personal-draft-time-mode-control"
                className="mt-3 min-w-0 border-t border-slate-200 pt-3"
              >
                <legend className="text-xs font-semibold text-slate-600">시간</legend>
                <div className="mt-1 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
                  <button
                    type="button"
                    data-testid="personal-draft-time-mode-all-day"
                    aria-pressed={editorDraft.scheduleMode === 'all_day'}
                    className={`min-h-9 rounded px-3 py-2 text-xs font-semibold ${
                      editorDraft.scheduleMode === 'all_day'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:bg-white/70'
                    }`}
                    onClick={() => updateMyFlowEditingDraft(row, {
                      scheduleMode: 'all_day',
                      time: '',
                      durationMinutes: undefined,
                    })}
                  >
                    종일
                  </button>
                  <button
                    type="button"
                    data-testid="personal-draft-time-mode-timed"
                    aria-pressed={editorDraft.scheduleMode === 'timed'}
                    className={`min-h-9 rounded px-3 py-2 text-xs font-semibold ${
                      editorDraft.scheduleMode === 'timed'
                        ? 'bg-white text-blue-700 shadow-sm'
                        : 'text-slate-600 hover:bg-white/70'
                    }`}
                    onClick={() => updateMyFlowEditingDraft(row, {
                      scheduleMode: 'timed',
                      time: editorDraft.scheduleMode === 'timed' ? editorDraft.time : '',
                      durationMinutes: isPersonalDraftDurationValid(editorDraft.durationMinutes)
                        ? editorDraft.durationMinutes
                        : PERSONAL_STRUCTURAL_DEFAULT_DURATION_MINUTES,
                    })}
                  >
                    시간 지정
                  </button>
                </div>
                {editorDraft.scheduleMode === 'timed' ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      시작 시간
                      <input
                        data-testid="personal-draft-time-input"
                        aria-label={`${editorDraft.title} 시작 시간`}
                        className={fieldClassName}
                        type="time"
                        value={editorDraft.time}
                        onChange={(event) => updateMyFlowEditingDraft(row, { time: event.target.value })}
                      />
                    </label>
                    <label className="block text-xs font-semibold text-slate-600">
                      예상 소요 시간
                      <span className="relative mt-1 block">
                        <input
                          data-testid="personal-draft-duration-input"
                          aria-label={`${editorDraft.title} 예상 소요 시간`}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pr-10 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          type="number"
                          min={PERSONAL_STRUCTURAL_MIN_DURATION_MINUTES}
                          max={PERSONAL_STRUCTURAL_MAX_DURATION_MINUTES}
                          step={5}
                          value={editorDraft.durationMinutes}
                          onChange={(event) => updateMyFlowEditingDraft(row, {
                            durationMinutes: event.target.value
                              ? Number(event.target.value)
                              : undefined,
                          })}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">분</span>
                      </span>
                    </label>
                    <p className="text-[11px] font-medium leading-5 text-slate-500 sm:col-span-2">
                      현재 기기 시간 기준으로 저장돼요.
                    </p>
                    {personalDraftTimedScheduleInvalid ? (
                      <p
                        data-testid="personal-draft-time-validation"
                        role="alert"
                        className="rounded-md bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 sm:col-span-2"
                      >
                        시작 시간과 5분 단위의 예상 시간을 입력해 주세요.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </fieldset>
            ) : null}
            {editorDraft.date ? (
              <fieldset
                data-testid="personal-draft-recurrence-control"
                className="mt-3 min-w-0 border-t border-slate-200 pt-3"
              >
                <legend className="text-xs font-semibold text-slate-600">반복</legend>
                <div className="mt-1 grid grid-cols-4 gap-1 rounded-md bg-slate-100 p-1">
                  {([
                    ['', '없음'],
                    ['daily', '매일'],
                    ['weekly', '매주'],
                    ['monthly', '매월'],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode || 'none'}
                      type="button"
                      data-testid={`personal-draft-recurrence-${mode || 'none'}`}
                      aria-pressed={personalDraftRecurrenceMode === mode}
                      className={`min-h-9 rounded px-2 py-2 text-xs font-semibold ${
                        personalDraftRecurrenceMode === mode
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:bg-white/70'
                      }`}
                      onClick={() => updateMyFlowEditingDraft(row, {
                        repeatPreset: mode,
                        recurrenceInterval: 1,
                        recurrenceWeekdays:
                          mode === 'weekly'
                            ? [getPersonalDraftDateWeekday(editorDraft.date)]
                            : editorDraft.recurrenceWeekdays,
                        recurrenceEndMode: 'never',
                        recurrenceUntil: '',
                        recurrenceCount: 10,
                      })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {personalDraftRecurrenceMode ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-slate-600">
                      반복 간격
                      <span className="relative mt-1 block">
                        <input
                          data-testid="personal-draft-recurrence-interval"
                          aria-label={`${editorDraft.title} 반복 간격`}
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pr-14 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          type="number"
                          min={1}
                          max={PERSONAL_STRUCTURAL_RECURRENCE_MAX_INTERVAL}
                          step={1}
                          value={editorDraft.recurrenceInterval}
                          onChange={(event) => updateMyFlowEditingDraft(row, {
                            recurrenceInterval: event.target.value
                              ? Number(event.target.value)
                              : 0,
                          })}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
                          {personalDraftRecurrenceMode === 'daily'
                            ? '일마다'
                            : personalDraftRecurrenceMode === 'weekly'
                              ? '주마다'
                              : '개월마다'}
                        </span>
                      </span>
                    </label>
                    <label className="block text-xs font-semibold text-slate-600">
                      반복 끝
                      <select
                        data-testid="personal-draft-recurrence-end-mode"
                        aria-label={`${editorDraft.title} 반복 끝`}
                        className={fieldClassName}
                        value={editorDraft.recurrenceEndMode}
                        onChange={(event) => updateMyFlowEditingDraft(row, {
                          recurrenceEndMode: event.target.value as 'never' | 'until' | 'count',
                        })}
                      >
                        <option value="never">계속</option>
                        <option value="until">날짜까지</option>
                        <option value="count">횟수만큼</option>
                      </select>
                    </label>
                    {personalDraftRecurrenceMode === 'weekly' ? (
                      <fieldset className="sm:col-span-2">
                        <legend className="text-xs font-semibold text-slate-600">반복 요일</legend>
                        <div className="mt-1 grid grid-cols-7 gap-1">
                          {PERSONAL_DRAFT_RECURRENCE_WEEKDAY_OPTIONS.map((option) => {
                            const selected = editorDraft.recurrenceWeekdays.includes(option.value);
                            return (
                              <button
                                key={option.value}
                                type="button"
                                data-testid={`personal-draft-recurrence-weekday-${option.value}`}
                                aria-pressed={selected}
                                aria-label={`${option.label}요일 반복 ${selected ? '해제' : '선택'}`}
                                className={`min-h-9 rounded-md border px-1 py-2 text-xs font-semibold ${
                                  selected
                                    ? 'border-blue-300 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 bg-white text-slate-600'
                                }`}
                                onClick={() => updateMyFlowEditingDraft(row, {
                                  recurrenceWeekdays: selected
                                    ? editorDraft.recurrenceWeekdays.filter(
                                        (weekday) => weekday !== option.value,
                                      )
                                    : [...editorDraft.recurrenceWeekdays, option.value],
                                })}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    ) : null}
                    {personalDraftRecurrenceMode === 'monthly' ? (
                      <p className="rounded-md bg-slate-50 px-3 py-2 text-xs font-medium leading-5 text-slate-600 sm:col-span-2">
                        매월 {Number(editorDraft.date.slice(8, 10))}일에 반복돼요. 해당 날짜가 없는 달은 건너뜁니다.
                      </p>
                    ) : null}
                    {editorDraft.recurrenceEndMode === 'until' ? (
                      <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                        마지막 날짜
                        <input
                          data-testid="personal-draft-recurrence-until"
                          aria-label={`${editorDraft.title} 반복 마지막 날짜`}
                          className={fieldClassName}
                          type="date"
                          min={editorDraft.date}
                          value={editorDraft.recurrenceUntil}
                          onChange={(event) => updateMyFlowEditingDraft(row, {
                            recurrenceUntil: event.target.value,
                          })}
                        />
                      </label>
                    ) : null}
                    {editorDraft.recurrenceEndMode === 'count' ? (
                      <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
                        반복 횟수
                        <span className="relative mt-1 block">
                          <input
                            data-testid="personal-draft-recurrence-count"
                            aria-label={`${editorDraft.title} 반복 횟수`}
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 pr-10 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            type="number"
                            min={1}
                            max={PERSONAL_STRUCTURAL_RECURRENCE_MAX_COUNT}
                            step={1}
                            value={editorDraft.recurrenceCount}
                            onChange={(event) => updateMyFlowEditingDraft(row, {
                              recurrenceCount: event.target.value
                                ? Number(event.target.value)
                                : 0,
                            })}
                          />
                          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">회</span>
                        </span>
                      </label>
                    ) : null}
                    {personalDraftRecurrenceInvalid ? (
                      <p
                        data-testid="personal-draft-recurrence-validation"
                        role="alert"
                        className="rounded-md bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-700 sm:col-span-2"
                      >
                        반복 간격과 요일, 끝나는 날짜 또는 횟수를 확인해 주세요.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </fieldset>
            ) : null}
          </fieldset>
        ) : canEditDate ? (
          <div
            data-testid={isOriginallyUndatedSavedItem ? 'my-flow-undated-item-date-control' : undefined}
            className="grid gap-2"
          >
            <label className="block text-xs font-semibold text-slate-600">
              {itemDateOverrideLabel}
              <input
                data-testid="my-flow-detail-date-input"
                aria-label={itemDateOverrideLabel}
                className={fieldClassName}
                type="date"
                value={editorDraft.date}
                onChange={(event) => updateMyFlowEditingDraft(row, { date: event.target.value })}
              />
            </label>
            {isOriginallyUndatedSavedItem ? (
              editorDraft.date ? (
                <button
                  type="button"
                  data-testid="my-flow-undated-item-date-clear"
                  aria-label={`${editorDraft.title} 날짜 없애기`}
                  className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-300"
                  onClick={() => updateMyFlowEditingDraft(row, { date: '' })}
                >
                  날짜 없애기
                </button>
              ) : (
                <p className="text-[11px] font-medium leading-5 text-slate-500">
                  날짜를 정하면 캘린더에도 함께 보여요.
                </p>
              )
            ) : null}
          </div>
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
        data-occurrence-id={row.structuralOccurrenceId}
        data-occurrence-state={row.structuralOccurrenceExecutionState}
        data-detail-mode={isDetailEditing ? 'edit' : 'execute'}
        data-default-primary-action-count={isDetailEditing ? undefined : '2'}
        className={
          mode === 'inline'
            ? 'mt-2 rounded-lg border border-blue-100 bg-blue-50 p-3'
            : mode === 'panel'
              ? 'rounded-md border border-blue-100 bg-white p-3'
              : 'space-y-3'
        }
      >
        {row.structuralOccurrenceId ? (
          <p
            data-testid="personal-draft-occurrence-status"
            className="mb-2 text-xs font-semibold text-blue-700"
          >
            {row.structuralOccurrenceExecutionState === 'done'
              ? '이번 일정 완료'
              : row.structuralOccurrenceExecutionState === 'reopened'
                ? '이번 일정 다시 진행'
                : row.structuralOccurrenceExecutionState === 'skipped'
                  ? '이번 일정 건너뜀'
                  : row.structuralOccurrenceExecutionState === 'held'
                    ? '이번 일정 보류'
                : '이번 일정'}
          </p>
        ) : null}
        <div className={isInlineMobileMode ? 'grid gap-3' : 'flex flex-wrap items-start justify-between gap-3'}>
          <div className={isInlineMobileMode ? 'min-w-0' : 'min-w-0 flex-1'}>
            {isDetailEditing ? (
              <label className="block text-xs font-semibold text-slate-600">
                제목
                <input
                  data-testid="my-flow-detail-title-input"
                  className={fieldClassName}
                  value={editorDraft.title}
                  onChange={(event) => updateMyFlowEditingDraft(row, { title: event.target.value })}
                />
              </label>
            ) : isInlineMobileMode ? (
              <div>
                {hasDetailChecklistItems ? (
                  <p className="text-xs font-semibold text-slate-600">필요한 항목만 체크하고 완료로 표시하세요.</p>
                ) : (
                  <p className="text-xs font-semibold text-blue-700">{inlineDetailHeaderLabel}</p>
                )}
              </div>
            ) : !isInlineMode ? (
              <div>
                <p className="text-xs font-semibold text-blue-700">확인할 항목</p>
                <h3 className="mt-1 text-lg font-semibold leading-6 text-slate-950">{editorDraft.title}</h3>
              </div>
            ) : null}
            {!isInlineMode ? (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-600">
                {row.date ? <span>{formatMyFlowDisplayDate(row.date)}</span> : null}
                {!isRoutineRow && timing ? <span data-testid="my-flow-detail-timing-chip" aria-label={getMyFlowTimingChipLabel(timing)} title={getMyFlowTimingChipLabel(timing)} className="rounded bg-white px-1.5 py-0.5 text-[10px] text-slate-600">{formatMyFlowTimingChip(timing)}</span> : null}
                {visibleDetailSection ? <span data-testid="my-flow-detail-section-label">{visibleDetailSection}</span> : null}
                {showDetailFlowChip ? <span data-testid="my-flow-detail-flow-chip" className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] text-blue-700">{detailFlowChipLabel}</span> : null}
              </p>
            ) : null}
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
            {isRoutineRow && !isDetailEditing ? (
              <span data-testid="my-flow-routine-progress-pill" className="inline-flex min-h-8 items-center rounded-md bg-emerald-50 px-2 text-xs font-black text-emerald-700">
                {routineProgressLabel}
              </span>
            ) : null}
            {!isDetailEditing && !isPersonalDraftRecurringSeries ? renderTaskCompletionCheckbox({
              title: editorDraft.title,
              checked,
              routine: isRoutineRow,
              detail: true,
              disabled: occurrenceExecutionPaused,
              disabledReason: '다시 진행한 뒤 완료로 표시할 수 있어요',
              onToggle: () => toggleSavedFlowItem(row.flow, row.id, row),
            }) : null}
            {!isDetailEditing && isPersonalDraftRecurringSeries ? (
              <Link
                href="/calendar"
                data-testid="personal-draft-recurrence-calendar-entry"
                className="inline-flex min-h-8 items-center rounded-md border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700 hover:border-blue-300"
              >
                일정별로 확인
              </Link>
            ) : null}
            {!isDrawerMode && isDetailEditing ? (
              <button
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                type="button"
                data-testid="my-flow-detail-edit-toggle"
                data-my-flow-item-edit-entry="true"
                aria-pressed="true"
                aria-label={itemEditCancelAriaLabel}
                onClick={() => {
                  cancelMyFlowEditingDraft(row);
                  setMyFlowEditingDetailKey('');
                }}
              >
                수정 취소
              </button>
            ) : null}
            {!isDetailEditing ? (
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
            ) : null}
            {!isDetailEditing && isPersonalDraftStructuralEditEligible(row.flow.bundle) ? (
              <button
                type="button"
                data-testid="personal-draft-delete-item"
                aria-label={`${editorDraft.title} 삭제`}
                className="rounded-md border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:border-rose-300 hover:bg-rose-50"
                onClick={() => deleteMyFlowPersonalDraftItem(row)}
              >
                삭제
              </button>
            ) : null}
          </div>
        </div>
        {isPersonalDraftOccurrence && !isDetailEditing && occurrenceExecutionState !== 'done' ? (
          <section
            data-testid="personal-draft-occurrence-execution-actions"
            className="mt-3 flex flex-col gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-xs font-semibold leading-5 text-slate-600">
              {occurrenceExecutionState === 'skipped'
                ? '이번 일정은 건너뛰었어요. 다음 일정은 그대로예요.'
                : occurrenceExecutionState === 'held'
                  ? '이번 일정을 잠시 보류했어요. 날짜와 다음 일정은 그대로예요.'
                  : '이번 일정만 상태를 바꿉니다. 반복 규칙과 다음 일정은 그대로예요.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {occurrenceExecutionPaused ? (
                <button
                  type="button"
                  data-testid="personal-draft-occurrence-resume"
                  aria-label={`${editorDraft.title} 이번 일정 다시 진행`}
                  className="min-h-9 rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-300"
                  onClick={() => setPersonalDraftOccurrenceExecutionState(row.flow, row, 'reopened')}
                >
                  다시 진행
                </button>
              ) : null}
              {occurrenceExecutionState !== 'skipped' ? (
                <button
                  type="button"
                  data-testid="personal-draft-occurrence-skip"
                  aria-label={`${editorDraft.title} 이번 일정만 건너뛰기`}
                  className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300"
                  onClick={() => setPersonalDraftOccurrenceExecutionState(row.flow, row, 'skipped')}
                >
                  이번만 건너뛰기
                </button>
              ) : null}
              {occurrenceExecutionState !== 'held' ? (
                <button
                  type="button"
                  data-testid="personal-draft-occurrence-hold"
                  aria-label={`${editorDraft.title} 이번 일정 잠시 보류`}
                  className="min-h-9 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:border-amber-300"
                  onClick={() => setPersonalDraftOccurrenceExecutionState(row.flow, row, 'held')}
                >
                  잠시 보류
                </button>
              ) : null}
            </div>
          </section>
        ) : null}
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
        {isInlineMobileMode && inlineActionHint && !isDetailEditing ? (
          <section data-testid="my-flow-inline-action-hint" className="mt-3 rounded-md bg-white px-3 py-3">
            <p className="text-xs font-semibold text-slate-500">바로 할 일</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{inlineActionHint}</p>
          </section>
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
        {!isDetailEditing && detailChecklistItems.length > 0 ? (
          <section data-testid="my-flow-item-checklist" className="mt-3 rounded-md bg-white px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-slate-600">{detailChecklistLabel}</p>
              <span data-testid="my-flow-detail-checklist-progress" className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">
                {detailChecklistProgressLabel}
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
        {!showEditableDetailFields && (isInlineMode || scheduleSummaryRows.length > 0 || editorDraft.memo.trim()) ? (
          shouldCollapseReadSummary ? (
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
                    data-my-flow-item-edit-entry="true"
                    aria-pressed={isDetailEditing}
                    aria-label={isDetailEditing ? itemEditCancelAriaLabel : itemEditButtonAriaLabel}
                    onClick={() => {
                      if (isDetailEditing) {
                        cancelMyFlowEditingDraft(row);
                        setMyFlowEditingDetailKey('');
                        return;
                      }
                      setMyFlowEditingDetailKey(portableExportKey);
                    }}
                  >
                    {isDetailEditing ? '수정 취소' : itemEditButtonLabel}
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
        {isDetailEditing || (isDrawerMode && hasEditorChanges) ? (
          <div data-testid="my-flow-detail-edit-actions" className="mt-3 flex flex-col gap-2 rounded-md border border-blue-100 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-slate-600">
              {hasEditorChanges
                ? isDrawerMode
                  ? '메모 변경은 저장해야 반영됩니다.'
                  : '저장하면 캘린더와 목록에도 함께 반영됩니다.'
                : '제목·날짜·메모를 바꾼 뒤 저장하세요.'}
            </p>
            <div className="flex gap-2">
              <button
                className={`rounded-md px-3 py-2 text-xs font-semibold ${hasEditorChanges && !personalDraftTimedScheduleInvalid && !personalDraftRecurrenceInvalid ? 'bg-blue-700 text-white' : 'cursor-not-allowed bg-slate-100 text-slate-400'}`}
                type="button"
                disabled={!hasEditorChanges || personalDraftTimedScheduleInvalid || personalDraftRecurrenceInvalid}
                data-testid="my-flow-detail-save-changes"
                onClick={() => {
                  if (!hasEditorChanges || personalDraftTimedScheduleInvalid || personalDraftRecurrenceInvalid) return;
                  saveMyFlowEditingDraft(row);
                  setMyFlowEditingDetailKey('');
                }}
              >
                변경 저장
              </button>
            </div>
          </div>
        ) : null}
        {shouldCollapsePortableExport ? (
          <details data-testid="my-flow-detail-portable-export" className={isDetailEditing ? 'hidden' : 'mt-3 rounded-md bg-white px-3 py-3'}>
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
                {portableExportSummary}
              </span>
            </div>
            {showPersonalCopyPortableExportNote ? (
              <p data-testid="my-flow-detail-personal-copy-export-note" className="mt-2 rounded-md bg-blue-50 px-2 py-1.5 text-[11px] font-semibold leading-5 text-blue-700">
                원본 출처는 유지하고, 복사/파일은 내 개인 사본 기준으로 만듭니다.
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="my-flow-detail-copy-portable-text"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700"
                onClick={() => copyMyFlowStepPortableText(portableExportInput, portableExportKey)}
              >
                {FLOW_EXPORT_LABELS.memoCopy}
              </button>
              <button
                type="button"
                data-testid="my-flow-detail-copy-checklist-text"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700"
                onClick={() => copyMyFlowStepChecklistText(portableExportInput, portableExportKey)}
              >
                체크리스트 복사
              </button>
              <button
                type="button"
                data-testid="my-flow-detail-copy-sheet-row"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700"
                onClick={() => copyMyFlowStepSheetRow(portableExportInput, portableExportKey)}
              >
                시트 행 복사
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
              ) : (
                <button
                  type="button"
                  data-testid="my-flow-detail-calendar-unavailable"
                  className="cursor-not-allowed rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400"
                  disabled
                >
                  날짜 필요
                </button>
              )}
              {myFlowStepCopiedKey === portableExportKey ? (
                <span data-testid="my-flow-detail-copy-feedback" className="inline-flex min-h-8 items-center rounded-md bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700">{myFlowStepCopiedLabel}</span>
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
                {portableExportSummary}
              </span>
            </div>
            {showPersonalCopyPortableExportNote ? (
              <p data-testid="my-flow-detail-personal-copy-export-note" className="mt-2 rounded-md bg-blue-50 px-2 py-1.5 text-[11px] font-semibold leading-5 text-blue-700">
                원본 출처는 유지하고, 복사/파일은 내 개인 사본 기준으로 만듭니다.
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="my-flow-detail-copy-portable-text"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700"
                onClick={() => copyMyFlowStepPortableText(portableExportInput, portableExportKey)}
              >
                {FLOW_EXPORT_LABELS.memoCopy}
              </button>
              <button
                type="button"
                data-testid="my-flow-detail-copy-checklist-text"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700"
                onClick={() => copyMyFlowStepChecklistText(portableExportInput, portableExportKey)}
              >
                체크리스트 복사
              </button>
              <button
                type="button"
                data-testid="my-flow-detail-copy-sheet-row"
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-blue-200 hover:text-blue-700"
                onClick={() => copyMyFlowStepSheetRow(portableExportInput, portableExportKey)}
              >
                시트 행 복사
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
              ) : (
                <button
                  type="button"
                  data-testid="my-flow-detail-calendar-unavailable"
                  className="cursor-not-allowed rounded-md bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400"
                  disabled
                >
                  날짜 필요
                </button>
              )}
              {myFlowStepCopiedKey === portableExportKey ? (
                <span data-testid="my-flow-detail-copy-feedback" className="inline-flex min-h-8 items-center rounded-md bg-emerald-50 px-2 text-[11px] font-semibold text-emerald-700">{myFlowStepCopiedLabel}</span>
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
              <span data-testid="my-flow-post-save-confirmation" className="rounded-full bg-[#EEF1FF] px-2.5 py-1 text-[#3654FF]">내 Flow에 저장됨</span>
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

  const renderMyFlowPersonalCopySettings = (flow: MySavedFlow) => {
    if (!canEditMyFlowSavedFlowSettings(flow) || myFlowPersonalCopySettingsDraft?.flowSlug !== flow.progress.slug) return null;

    const isDraftFlow = isUrlFirstDraftSavedFlow(flow) && !flow.savedMap?.personalCopy;
    const stepRows = getMyFlowPersonalCopyStepRows(flow);
    const includedStepIdSet = new Set(myFlowPersonalCopySettingsDraft.includedStepIds);
    const dateAnchorCopy = isDraftFlow
      ? getSourceBackedFlowMapDateAnchorCopy()
      : getSourceBackedFlowMapDateAnchorCopy(
          flow.savedMap?.mapId ? buildSourceBackedFlowMapPublishPackage(flow.savedMap.mapId) : getSourceBackedMyFlowMapForBundle(flow.bundle),
        );
    const anchorInputId = `my-flow-anchor-date-${flow.progress.slug}`;
    return (
      <form
        data-testid="my-flow-personal-copy-settings"
        className="mt-3 grid gap-3 rounded-md border border-blue-100 bg-white px-3 py-3 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          saveMyFlowPersonalCopySettings(flow);
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <button
              type="button"
              data-testid="my-flow-anchor-edit-entry"
              className="rounded-md bg-blue-50 px-2.5 py-1.5 text-left text-xs font-semibold text-blue-700"
              onClick={() => document.getElementById(anchorInputId)?.focus()}
            >
              {dateAnchorCopy.editLabel}
            </button>
            <p data-testid="my-flow-anchor-edit-help" className="mt-1 max-w-2xl break-keep text-xs font-semibold leading-5 text-slate-500">
              {dateAnchorCopy.help} {dateAnchorCopy.distinction}
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            {isDraftFlow ? 'Flow 이름' : '저장 이름'}
            <input
              aria-label={isDraftFlow ? 'Flow 이름' : '저장 이름'}
              className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              value={myFlowPersonalCopySettingsDraft.title}
              maxLength={80}
              onChange={(event) => updateMyFlowPersonalCopySettingsDraft({ title: event.target.value })}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-700">
            {dateAnchorCopy.label}
            <input
              id={anchorInputId}
              data-testid="my-flow-personal-copy-start-date-input"
              aria-label={dateAnchorCopy.label}
              className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              type="date"
              value={myFlowPersonalCopySettingsDraft.anchor}
              onChange={(event) => updateMyFlowPersonalCopySettingsDraft({ anchor: event.target.value })}
            />
          </label>
        </div>
        {isDraftFlow ? (
          <p data-testid="my-flow-draft-anchor-policy" className="rounded-md bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-800">
            기준일을 바꾸면 초안의 전체 일정이 다시 맞춰집니다. 따로 바꾼 할 일 날짜는 그대로 유지돼요.
          </p>
        ) : null}
        <fieldset data-testid={isDraftFlow ? 'my-flow-draft-item-inclusion-settings' : undefined} className="grid gap-2">
          <legend className="text-xs font-semibold text-slate-700">포함할 할 일</legend>
          <div className="grid max-h-56 gap-1.5 overflow-auto pr-1 sm:grid-cols-2">
            {stepRows.map((row) => {
              const stepId = baseStateId(row.id);
              return (
                <label key={`personal-copy-step-${flow.progress.slug}-${stepId}`} className="flex min-h-10 items-start gap-2 rounded-md bg-slate-50 px-2.5 py-2 text-xs font-semibold leading-5 text-slate-800">
                  <input
                    className="mt-0.5 h-4 w-4 shrink-0"
                    type="checkbox"
                    checked={includedStepIdSet.has(stepId)}
                    onChange={(event) => toggleMyFlowPersonalCopyStep(stepId, event.target.checked)}
                  />
                  <span className="min-w-0 break-keep">{toUserFacingSourceTitle(row.title)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {myFlowPersonalCopySettingsDraft.feedback ? (
          <p className="text-xs font-semibold text-amber-700">{myFlowPersonalCopySettingsDraft.feedback}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={() => setMyFlowPersonalCopySettingsDraft(null)}
          >
            취소
          </button>
          <button
            type="submit"
            className="min-h-9 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={myFlowPersonalCopySettingsDraft.includedStepIds.length === 0}
          >
            저장
          </button>
        </div>
      </form>
    );
  };

  const renderMyFlowDirectAnchorSettings = (flow: MySavedFlow) => {
    if (
      !canEditMyFlowDirectSavedMapAnchor(flow) ||
      !flow.savedMap ||
      myFlowDirectAnchorSettingsDraft?.mapId !== flow.savedMap.mapId
    ) return null;
    const dateAnchorCopy = getMyFlowDirectSavedMapAnchorCopy(flow);
    return (
      <form
        data-testid="my-flow-direct-anchor-settings"
        className="mt-3 grid gap-3 rounded-md border border-blue-100 bg-white px-3 py-3 text-sm"
        onSubmit={(event) => {
          event.preventDefault();
          saveMyFlowDirectAnchorSettings(flow);
        }}
      >
        <div>
          <p className="text-xs font-semibold text-blue-700">전체 일정 기준</p>
          <p data-testid="my-flow-direct-anchor-policy" className="mt-1 break-keep text-xs font-semibold leading-5 text-slate-500">
            전체 상대 일정이 다시 맞춰집니다. 따로 바꾼 할 일 날짜와 메모는 그대로 유지돼요.
          </p>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-slate-700">
          {dateAnchorCopy.label}
          <input
            data-testid="my-flow-direct-anchor-input"
            aria-label={dateAnchorCopy.label}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            type="date"
            value={myFlowDirectAnchorSettingsDraft.anchor}
            onChange={(event) => setMyFlowDirectAnchorSettingsDraft((current) => current ? {
              ...current,
              anchor: event.target.value,
              feedback: '',
            } : current)}
          />
        </label>
        {myFlowDirectAnchorSettingsDraft.feedback ? (
          <p className="text-xs font-semibold text-amber-700">{myFlowDirectAnchorSettingsDraft.feedback}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            onClick={() => setMyFlowDirectAnchorSettingsDraft(null)}
          >
            취소
          </button>
          <button
            type="submit"
            className="min-h-9 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
          >
            일정 다시 맞추기
          </button>
        </div>
      </form>
    );
  };

  const renderMyFlowExcludedSteps = (flow: MySavedFlow) => {
    if (flow.excludedRows.length === 0) return null;
    return (
      <section data-testid="my-flow-excluded-steps" className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-slate-500">제외됨</p>
          <span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            {flow.excludedRows.length}개
          </span>
        </div>
        <ul className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">
          {flow.excludedRows.map((row) => (
            <li key={`excluded-${flow.progress.slug}-${row.id}`} data-testid="my-flow-excluded-step-row" className="truncate">
              {toUserFacingSourceTitle(row.title)}
            </li>
          ))}
        </ul>
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
    const executionReady = contentReadiness.kind === 'ready';
    const sourceLinkExternal = sourceHref.startsWith('https://');
    const showContentReadinessBadge = !isMyFlowScenarioDemo && contentReadiness.kind !== 'ready';
    const inventoryMeta = [
      getMyFlowAnchorDisplay(flow.bundle, flow.anchor, myFlowDemoMode),
      flow.progress.skipped ? `${flow.progress.skipped}개 제외` : null,
    ].filter(Boolean).join(' · ');

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
                {inventoryMeta ? <p className="mt-1 text-xs font-semibold text-slate-500">{inventoryMeta}</p> : null}
              </div>
              {executionReady || contentReadiness.kind === 'retired' ? <div className="flex shrink-0 items-center gap-2">
                <span data-testid="my-flow-inventory-progress-summary" className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {getMyFlowFlowProgressLabel(flow)}
                </span>
              </div> : null}
            </div>
            {executionReady && nextRow ? (
              <div className="mt-3 rounded-md bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-500">{getMyFlowRowStatusLabel(nextRow)}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{nextRow.title}</p>
              </div>
            ) : null}
            {!executionReady ? (
              <p data-testid="my-flow-content-readiness-note" className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-semibold leading-5 text-amber-900 ring-1 ring-amber-100">
                {getMyFlowContentReadinessNote(contentReadiness)}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {executionReady ? (
                <button
                  className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300"
                  type="button"
                  aria-label={nextRow ? getMyFlowOpenActionAriaLabel(nextRow.title, nextActionLabel) : getMyFlowOpenActionAriaLabel(flowTitle, nextActionLabel)}
                  onClick={() => (nextRow ? openMyFlowRowFromFlowTab(flow, nextRow) : setSelectedSavedFlowSlug(flow.progress.slug))}
                >
                  {nextActionLabel}
                </button>
              ) : null}
              <Link
                className="inline-flex min-h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300"
                href={sourceHref}
                target={sourceLinkExternal ? '_blank' : undefined}
                rel={sourceLinkExternal ? 'noreferrer' : undefined}
              >
                {sourceLabel}
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  };

  const getMyFlowRunItemScheduleLabel = (item: FlowRunItemSnapshot): string => {
    if (!item.date) return '날짜 없음';
    return [
      formatMyFlowDisplayDate(item.date),
      item.scheduleState === 'timed' ? formatMyFlowLocalTimeLabel(item.time) : '',
      item.scheduleState === 'timed' ? formatMyFlowDurationLabel(item.durationMinutes) : '',
    ].filter(Boolean).join(' · ');
  };

  const copyMyFlowRunHistoryExport = async (
    run: FlowRunRecord,
    flow: MySavedFlow,
    destination: 'checklist' | 'sheet' | 'memo',
  ) => {
    const artifacts = buildFlowRunHistoryListExportArtifacts(
      run,
      getMyFlowExecutionFlowTitle(flow.progress.title),
    );
    if (!artifacts) return;
    const output = destination === 'checklist'
      ? artifacts.checklistText
      : destination === 'sheet'
        ? artifacts.sheetTsv
        : artifacts.memoText;
    const feedback = destination === 'checklist'
      ? '지난 실행 체크리스트 복사됨'
      : destination === 'sheet'
        ? '지난 실행 시트 복사됨'
        : '지난 실행 메모 복사됨';
    await copyMyFlowStepText(output, `past-run-export::${run.runId}`, feedback);
  };

  const renderMyFlowRunHistory = (flow: MySavedFlow) => {
    const completedRuns = getCompletedFlowRuns(flow.progress.slug);
    if (completedRuns.length === 0) return null;
    const anchorLabel = getAnchorInputLabel(flow.bundle);
    return (
      <details data-testid="my-flow-past-runs" className="mt-3 border-t border-slate-100 pt-3 text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700">지난 실행 {completedRuns.length}회</summary>
        <ol className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
          {completedRuns.map((run) => {
            const completedDate = run.completedAt?.slice(0, 10);
            const itemSnapshots = run.completionSnapshot?.itemSnapshots;
            const completedCount = itemSnapshots
              ? itemSnapshots.filter((item) => item.status === 'done').length
              : Object.values(run.completionSnapshot?.checks ?? {}).filter(Boolean).length;
            const totalCount = itemSnapshots?.length ?? Object.keys(run.completionSnapshot?.checks ?? {}).length;
            const feedback = run.completionSnapshot?.completionFeedback;
            const exportAvailable = Boolean(itemSnapshots);
            const exportKey = `past-run-export::${run.runId}`;
            return (
              <li key={run.runId} data-testid="my-flow-past-run" data-run-id={run.runId}>
                <details className="group py-2">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">
                    <span className="min-w-0 text-xs font-semibold leading-5 text-slate-600">
                      <span className="block text-sm text-slate-900">
                        {completedDate ? `${formatMyFlowDisplayDate(completedDate)} 완료` : '완료한 실행'}
                      </span>
                      <span className="block">
                        {[
                          run.anchor ? `${anchorLabel} ${formatMyFlowDisplayDate(run.anchor)}` : '',
                          totalCount > 0 ? `전체 ${completedCount}/${totalCount} 완료` : '',
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span aria-hidden="true" className="shrink-0 pt-1 text-xs font-semibold text-blue-700 group-open:hidden">보기</span>
                    <span aria-hidden="true" className="hidden shrink-0 pt-1 text-xs font-semibold text-blue-700 group-open:inline">접기</span>
                  </summary>
                  <div data-testid="my-flow-past-run-detail" className="px-1 pb-2 pt-2">
                    {itemSnapshots ? (
                      <ol data-testid="my-flow-past-run-items" className="divide-y divide-slate-100 border-y border-slate-100">
                        {itemSnapshots.map((item) => (
                          <li key={item.itemId} data-testid="my-flow-past-run-item" className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 py-2 text-xs leading-5">
                            <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-semibold ${item.status === 'done' ? 'bg-emerald-50 text-emerald-700' : item.status === 'held' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                              {getFlowRunItemStatusLabel(item.status)}
                            </span>
                            <span className="min-w-0">
                              <span className="block break-words font-semibold text-slate-900">{item.title}</span>
                              <span className="block text-slate-500">{getMyFlowRunItemScheduleLabel(item)}</span>
                              {item.memo ? <span className="mt-1 block break-words text-slate-600">내 메모: {item.memo}</span> : null}
                            </span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p data-testid="my-flow-past-run-summary-only" className="text-xs leading-5 text-slate-500">
                        이전 실행은 요약만 저장돼 있어요.
                      </p>
                    )}
                    {feedback?.reflection ? (
                      <div data-testid="my-flow-past-run-reflection" className="mt-3 border-l-2 border-emerald-200 pl-3 text-xs leading-5 text-slate-600">
                        <p className="font-semibold text-slate-900">내 실행 회고 · {feedback.reflection.outcome === 'helpful' ? '도움됐어요' : '고칠 점이 있어요'}</p>
                        {feedback.reflection.note ? <p className="mt-1 break-words">{feedback.reflection.note}</p> : null}
                      </div>
                    ) : null}
                    {feedback?.sourceCorrectionDraft ? (
                      <div data-testid="my-flow-past-run-correction" className="mt-3 border-l-2 border-amber-200 pl-3 text-xs leading-5 text-slate-600">
                        <p className="font-semibold text-slate-900">원본 내용 전송 전 메모</p>
                        <p className="mt-1 break-words">{feedback.sourceCorrectionDraft.note}</p>
                        <p className="mt-1 font-semibold text-amber-700">아직 전송되지 않았어요.</p>
                      </div>
                    ) : null}
                    {exportAvailable ? (
                      <details data-testid="my-flow-past-run-export" className="mt-3 border-t border-slate-100 pt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-blue-700">지난 실행 가져가기</summary>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" onClick={() => copyMyFlowRunHistoryExport(run, flow, 'checklist')}>체크리스트 복사</button>
                          <button type="button" className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" onClick={() => copyMyFlowRunHistoryExport(run, flow, 'sheet')}>시트로 복사</button>
                          <button type="button" className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700" onClick={() => copyMyFlowRunHistoryExport(run, flow, 'memo')}>메모로 복사</button>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-500">지난 일정의 중복 등록을 막기 위해 캘린더 파일은 새 실행에서만 만들어요.</p>
                        {myFlowStepCopiedKey === exportKey ? (
                          <p data-testid="my-flow-past-run-export-feedback" className="mt-2 text-xs font-semibold text-emerald-700" role="status">{myFlowStepCopiedLabel}</p>
                        ) : null}
                      </details>
                    ) : null}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </details>
    );
  };

  const renderMyFlowReuseNotice = (flow: MySavedFlow) => {
    if (myFlowReuseNotice?.flowSlug !== flow.progress.slug) return renderMyFlowRunHistory(flow);
    return (
      <>
        <div data-testid="my-flow-reuse-status" className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold leading-5 text-emerald-800" role="status">
          {myFlowReuseNotice.message}
        </div>
        {renderMyFlowRunHistory(flow)}
      </>
    );
  };

  const renderMyFlowCompletionFeedback = (flow: MySavedFlow) => {
    const executionComplete = flow.rows.length > 0 && flow.rows.every((row) => isMyFlowRowChecked(flow, row));
    if (isMyFlowScenarioDemo || !executionComplete) return null;

    const flowTitle = getMyFlowExecutionFlowTitle(flow.progress.title);
    const savedFeedback = myFlowCompletionFeedbackBySlug[flow.progress.slug];
    const activeDraft = myFlowCompletionFeedbackDraft?.flowSlug === flow.progress.slug
      ? myFlowCompletionFeedbackDraft
      : null;
    const activeReuseDraft = myFlowReuseDraft?.flowSlug === flow.progress.slug
      ? myFlowReuseDraft
      : null;
    const anchorContext = getMyFlowReuseAnchorContext(flow);
    const requiresAnchor = anchorContext.required;
    const anchorLabel = anchorContext.label;
    const newAnchorLabel = `새 ${anchorLabel}`;
    const versionNotice = getMyFlowVersionNoticeForFlow(flow);
    const versionReviewItems = versionNotice?.versionReview?.items.filter(
      (item) => item.flowSlug === flow.progress.slug,
    ) ?? [];
    const correctionRows = Array.from(
      new Map(flow.rows.map((row) => [baseStateId(row.id), row] as const)).values(),
    );

    return (
      <section data-testid="my-flow-completion-feedback" className="mt-4 border-t border-slate-200 pt-4">
        <p className="text-xs font-semibold text-emerald-700">완료 후 기록</p>
        <h4 className="mt-1 text-base font-semibold text-slate-950">이번 실행을 짧게 남겨보세요</h4>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          내 회고는 나만 보고, 원본에서 고칠 점은 전송 전 메모로 따로 저장합니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="my-flow-reflection-open"
            aria-pressed={activeDraft?.mode === 'reflection'}
            className={`min-h-9 rounded-md border px-3 py-2 text-sm font-semibold ${
              activeDraft?.mode === 'reflection'
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
            onClick={() => openMyFlowCompletionFeedback(flow, 'reflection')}
          >
            내 실행 회고
          </button>
          <button
            type="button"
            data-testid="my-flow-source-correction-open"
            aria-pressed={activeDraft?.mode === 'correction'}
            className={`min-h-9 rounded-md border px-3 py-2 text-sm font-semibold ${
              activeDraft?.mode === 'correction'
                ? 'border-blue-600 bg-blue-50 text-blue-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
            onClick={() => openMyFlowCompletionFeedback(flow, 'correction')}
          >
            원본 내용 알릴 점
          </button>
        </div>
        {!activeDraft && (savedFeedback?.reflection || savedFeedback?.sourceCorrectionDraft) ? (
          <p data-testid="my-flow-completion-feedback-saved-summary" className="mt-2 text-xs font-semibold text-slate-500">
            {[savedFeedback.reflection ? '내 회고 저장됨' : '', savedFeedback.sourceCorrectionDraft ? '전송 전 메모 저장됨' : '']
              .filter(Boolean)
              .join(' · ')}
          </p>
        ) : null}
        {activeDraft?.mode === 'reflection' ? (
          <div data-testid="my-flow-reflection-editor" className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-900">이번 Flow는 어땠나요?</p>
            <div className="mt-2 grid grid-cols-2 gap-2" role="group" aria-label={`${flowTitle} 실행 결과`}>
              {([
                ['helpful', '도움됐어요'],
                ['needs_changes', '고칠 점이 있어요'],
              ] as const).map(([outcome, label]) => (
                <button
                  key={outcome}
                  type="button"
                  aria-pressed={activeDraft.outcome === outcome}
                  className={`min-h-10 rounded-md border px-3 py-2 text-sm font-semibold ${
                    activeDraft.outcome === outcome
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                  onClick={() => updateMyFlowCompletionFeedbackDraft({ outcome })}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-sm font-semibold text-slate-800">
              내 메모 <span className="font-medium text-slate-500">(선택)</span>
              <textarea
                data-testid="my-flow-reflection-note"
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={activeDraft.reflectionNote}
                placeholder="다음에 다시 쓸 때 기억할 점"
                onChange={(event) => updateMyFlowCompletionFeedbackDraft({ reflectionNote: event.target.value })}
              />
            </label>
            <p className="mt-1 text-xs text-slate-500">이 기기에만 저장됩니다.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="my-flow-reflection-save"
                className="min-h-9 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                onClick={() => saveMyFlowCompletionReflection(flow)}
              >
                내 회고 저장
              </button>
              <button
                type="button"
                className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setMyFlowCompletionFeedbackDraft(null)}
              >
                닫기
              </button>
            </div>
          </div>
        ) : null}
        {activeDraft?.mode === 'correction' ? (
          <div data-testid="my-flow-source-correction-editor" className="mt-3 border-t border-slate-100 pt-3">
            <p className="text-sm font-semibold text-slate-900">원본에서 고칠 내용을 정리하세요</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              다른 사용자에게도 필요한 수정 내용을 적습니다. 아직 누구에게도 전송되지 않아요.
            </p>
            <label className="mt-3 block text-sm font-semibold text-slate-800">
              어디를 고칠까요?
              <select
                data-testid="my-flow-source-correction-scope"
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={activeDraft.correctionScope}
                onChange={(event) => updateMyFlowCompletionFeedbackDraft({ correctionScope: event.target.value })}
              >
                <option value="flow">Flow 전체</option>
                {correctionRows.map((row) => (
                  <option key={baseStateId(row.id)} value={baseStateId(row.id)}>
                    {getMyFlowRowDisplayTitle({ ...row, flow })}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold text-slate-800">
              알릴 내용
              <textarea
                data-testid="my-flow-source-correction-note"
                className="mt-1 min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={activeDraft.correctionNote}
                placeholder="빠진 내용이나 잘못된 순서·날짜를 적어 주세요"
                onChange={(event) => updateMyFlowCompletionFeedbackDraft({ correctionNote: event.target.value })}
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="my-flow-source-correction-save"
                className="min-h-9 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                onClick={() => saveMyFlowSourceCorrectionDraft(flow)}
              >
                전송 전 메모 저장
              </button>
              <button
                type="button"
                className="min-h-9 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                onClick={() => setMyFlowCompletionFeedbackDraft(null)}
              >
                닫기
              </button>
            </div>
          </div>
        ) : null}
        {activeDraft?.status ? (
          <p
            data-testid="my-flow-completion-feedback-status"
            className={`mt-2 text-xs font-semibold ${activeDraft.status.startsWith('알릴 내용을') ? 'text-amber-700' : 'text-emerald-700'}`}
            role="status"
          >
            {activeDraft.status}
          </p>
        ) : null}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">같은 준비를 다시 시작하나요?</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                지난 실행은 기록으로 남기고 완료 상태만 새로 시작합니다.
              </p>
            </div>
            <button
              type="button"
              data-testid="my-flow-reuse-open"
              aria-expanded={Boolean(activeReuseDraft)}
              className="min-h-9 shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300"
              onClick={() => (activeReuseDraft ? setMyFlowReuseDraft(null) : openMyFlowReuse(flow))}
            >
              {activeReuseDraft ? '접기' : '이 Flow 다시 쓰기'}
            </button>
          </div>
          {activeReuseDraft ? (
            <div data-testid="my-flow-reuse-panel" className="mt-3 grid gap-3 rounded-md border border-blue-100 bg-blue-50/60 p-3">
              {versionNotice?.status !== 'map_missing' && versionNotice?.currentVersion ? (
                <fieldset data-testid="my-flow-version-mode" className="grid gap-2">
                  <legend className="text-sm font-semibold text-slate-900">어떤 내용으로 시작할까요?</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ['current', '현재 내용', '지금 쓰는 구성과 내 수정을 그대로 이어가요.'],
                      ['latest', '새 내용 검토', '바뀐 원문을 확인하고 새 실행에 반영해요.'],
                    ] as const).map(([value, label, help]) => (
                      <label key={value} className={`cursor-pointer border-b-2 bg-white px-3 py-2 ${activeReuseDraft.versionMode === value ? 'border-blue-600' : 'border-slate-200'}`}>
                        <span className="flex items-start gap-2">
                          <input
                            className="mt-1 h-4 w-4 shrink-0"
                            type="radio"
                            name={`my-flow-version-mode-${flow.progress.slug}`}
                            value={value}
                            checked={activeReuseDraft.versionMode === value}
                            onChange={() => updateMyFlowReuseDraft({
                              versionMode: value,
                              versionSelections: value === 'latest'
                                ? getDefaultFlowVersionSelections(versionNotice.versionReview, flow.progress.slug)
                                : {},
                              sensitiveReviewConfirmed: false,
                            })}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-slate-900">{label}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-600">{help}</span>
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              {activeReuseDraft.versionMode === 'latest' && versionNotice?.versionReview ? (
                <section data-testid="my-flow-version-review" className="border-y border-slate-200 bg-white px-3 py-1">
                  <div className="py-2">
                    <p className="text-sm font-semibold text-slate-950">새 내용 {versionNotice.currentVersion}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      바뀜 {versionReviewItems.filter((item) => item.kind === 'changed').length}개 · 새로 생김 {versionReviewItems.filter((item) => item.kind === 'added').length}개 · 빠짐 {versionReviewItems.filter((item) => item.kind === 'removed').length}개
                    </p>
                  </div>
                  {versionReviewItems.length > 0 ? (
                    <div className="divide-y divide-slate-200">
                      {versionReviewItems.map((item) => {
                        const itemTitle = item.current?.title ?? item.previous?.title ?? '제목 없는 할 일';
                        return (
                          <fieldset key={item.key} data-testid="my-flow-version-review-item" className="py-3">
                            <legend className="w-full">
                              <span className="flex flex-wrap items-start justify-between gap-2">
                                <span className="min-w-0 text-sm font-semibold text-slate-950">{toUserFacingSourceTitle(itemTitle)}</span>
                                <span className="shrink-0 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{getFlowVersionReviewItemLabel(item)}</span>
                              </span>
                            </legend>
                            {item.kind === 'changed' && item.previous?.title !== item.current?.title ? (
                              <p className="mt-1 text-xs leading-5 text-slate-600">이전: {toUserFacingSourceTitle(item.previous?.title ?? '')}</p>
                            ) : null}
                            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                              {getFlowVersionReviewItemChoices(item).map(([value, label, help]) => (
                                <label key={value} className="flex cursor-pointer items-start gap-2 py-1">
                                  <input
                                    className="mt-1 h-4 w-4 shrink-0"
                                    type="radio"
                                    name={`my-flow-version-choice-${item.key}`}
                                    value={value}
                                    checked={activeReuseDraft.versionSelections[item.key] === value}
                                    onChange={() => updateMyFlowVersionSelection(item, value)}
                                  />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-slate-800">{label}</span>
                                    <span className="block text-xs leading-5 text-slate-500">{help}</span>
                                  </span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="border-t border-slate-200 py-3 text-xs leading-5 text-slate-600">항목 내용은 같고 원문 확인 정보만 새로 발행됐습니다.</p>
                  )}
                  {versionNotice.versionReview.sensitive ? (
                    <label className="flex cursor-pointer items-start gap-2 border-t border-slate-200 py-3 text-sm font-semibold text-slate-800">
                      <input
                        data-testid="my-flow-version-sensitive-confirm"
                        className="mt-1 h-4 w-4 shrink-0"
                        type="checkbox"
                        checked={activeReuseDraft.sensitiveReviewConfirmed}
                        onChange={(event) => updateMyFlowReuseDraft({ sensitiveReviewConfirmed: event.target.checked })}
                      />
                      <span>공식 일정의 변경 내용을 확인했습니다.</span>
                    </label>
                  ) : null}
                </section>
              ) : null}
              {requiresAnchor ? (
                <label className="grid gap-1 text-sm font-semibold text-slate-800">
                  {newAnchorLabel}
                  <input
                    data-testid="my-flow-reuse-anchor-input"
                    aria-label={newAnchorLabel}
                    className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    type="date"
                    value={activeReuseDraft.anchor}
                    onChange={(event) => updateMyFlowReuseDraft({ anchor: event.target.value })}
                  />
                  <span className="text-xs font-medium leading-5 text-slate-600">
                    {newAnchorLabel}에 맞춰 전체 일정을 다시 계산합니다.
                  </span>
                </label>
              ) : (
                <p className="text-sm leading-6 text-slate-700">
                  현재 항목과 내가 고친 내용은 유지하고 완료 체크만 비웁니다.
                </p>
              )}
              {requiresAnchor && activeReuseDraft.fixedDateOverrideCount > 0 ? (
                <fieldset data-testid="my-flow-reuse-fixed-date-policy" className="grid gap-2">
                  <legend className="text-sm font-semibold text-slate-900">
                    따로 바꾼 날짜 {activeReuseDraft.fixedDateOverrideCount}개
                  </legend>
                  <p className="text-xs leading-5 text-slate-600">새 실행에서 이 날짜를 어떻게 쓸지 선택해 주세요.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {([
                      ['reset_to_anchor', `${newAnchorLabel}에 맞추기`, '따로 정한 날짜를 지우고 전체 일정을 다시 맞춰요.'],
                      ['keep_fixed_dates', '내가 바꾼 날짜 유지', '따로 정한 날짜는 그대로 두고 나머지만 다시 맞춰요.'],
                    ] as const).map(([value, label, help]) => (
                      <label key={value} className={`flex min-h-16 cursor-pointer items-start gap-2 rounded-md border bg-white px-3 py-2 ${activeReuseDraft.fixedDatePolicy === value ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                        <input
                          className="mt-1 h-4 w-4 shrink-0"
                          type="radio"
                          name={`my-flow-reuse-fixed-date-${flow.progress.slug}`}
                          value={value}
                          checked={activeReuseDraft.fixedDatePolicy === value}
                          onChange={() => updateMyFlowReuseDraft({ fixedDatePolicy: value })}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">{label}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-slate-600">{help}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              {activeReuseDraft.status ? (
                <p data-testid="my-flow-reuse-error" className="text-xs font-semibold text-amber-700" role="status">
                  {activeReuseDraft.status}
                </p>
              ) : null}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                <button
                  type="button"
                  data-testid="my-flow-reuse-cancel"
                  className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  onClick={() => setMyFlowReuseDraft(null)}
                >
                  취소
                </button>
                <button
                  type="button"
                  data-testid="my-flow-reuse-start"
                  className="min-h-10 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white"
                  onClick={() => startMyFlowReuse(flow)}
                >
                  {activeReuseDraft.versionMode === 'latest' ? '선택한 새 내용으로 시작' : '새 실행 시작'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  };

  const renderPersonalDraftReorderControls = (
    flow: MySavedFlow,
    row: MyFlowRow,
    index: number,
    itemCount: number,
  ) => {
    const displayTitle = getMyFlowRowDisplayTitle(getMyFlowRowForFlowTab(flow, row));
    return (
      <div
        data-testid="personal-draft-reorder-controls"
        data-item-id={row.id}
        className="inline-flex shrink-0 items-center gap-1"
      >
        {([
          ['up', '↑', '위로 이동', index === 0],
          ['down', '↓', '아래로 이동', index === itemCount - 1],
        ] as const).map(([direction, icon, label, disabled]) => (
          <button
            key={direction}
            type="button"
            data-testid={`personal-draft-move-${direction}`}
            data-item-id={row.id}
            disabled={disabled}
            aria-label={`${displayTitle} ${label}`}
            title={`${displayTitle} ${label}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
            onClick={() => moveMyFlowPersonalDraftItem(flow, row.id, direction)}
          >
            <span aria-hidden="true">{icon}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderPersonalDraftListExport = (flow: MySavedFlow) => {
    const artifact = getMyFlowPersonalDraftListExport(flow);
    if (!artifact) return null;
    const exportKey = `personal-draft-list-export::${flow.progress.slug}`;
    const flowTitle = getMyFlowExecutionFlowTitle(flow.progress.title);
    const exportableCount = artifact.memoRows.length;

    return (
      <details
        data-testid="personal-draft-list-export"
        className="mt-3 border-t border-slate-200 pt-3"
      >
        <summary
          data-testid="personal-draft-list-export-toggle"
          className="cursor-pointer text-sm font-semibold text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
        >
          이 Flow 가져가기 · {exportableCount}개
        </summary>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            data-testid="personal-draft-copy-memo"
            aria-label={`${flowTitle} 전체 메모로 복사`}
            disabled={exportableCount === 0}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            onClick={() => copyMyFlowPersonalDraftListExport(flow, 'memo')}
          >
            메모로 복사
          </button>
          <button
            type="button"
            data-testid="personal-draft-copy-checklist"
            aria-label={`${flowTitle} 전체 체크리스트 복사`}
            disabled={exportableCount === 0}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            onClick={() => copyMyFlowPersonalDraftListExport(flow, 'checklist')}
          >
            체크리스트 복사
          </button>
          <button
            type="button"
            data-testid="personal-draft-copy-sheet"
            aria-label={`${flowTitle} 전체 시트로 복사`}
            disabled={exportableCount === 0}
            className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            onClick={() => copyMyFlowPersonalDraftListExport(flow, 'sheet')}
          >
            시트로 복사
          </button>
        </div>
        {myFlowStepCopiedKey === exportKey ? (
          <p
            data-testid="personal-draft-list-export-feedback"
            className="mt-2 text-xs font-semibold text-emerald-700"
            role="status"
          >
            {myFlowStepCopiedLabel}
          </p>
        ) : null}
      </details>
    );
  };

  const renderPersonalDraftStructuralControls = (flow: MySavedFlow) => {
    if (!isPersonalDraftStructuralEditEligible(flow.bundle)) return null;
    const addOpen = myFlowStructuralAddOpenSlug === flow.progress.slug;
    const undo = myFlowStructuralUndo?.flowSlug === flow.progress.slug
      ? myFlowStructuralUndo
      : null;
    const overlay =
      myFlowStructuralOverlaysBySlug[flow.progress.slug] ??
      createPersonalDraftStructuralOverlay(flow.bundle);
    const removedItems = resolvePersonalDraftStructuralItems(flow.bundle, overlay).tombstonedItems;
    const wideOrderRows = flow.rows.map((row) => getMyFlowRowForFlowTab(flow, row));
    const inputId = `personal-draft-add-title-${flow.progress.slug}`;

    return (
      <section
        data-testid="personal-draft-structural-controls"
        data-structural-edit-eligible="true"
        className="mt-3 border-t border-slate-200 pt-3"
      >
        {flow.rows.length === 0 ? (
          <p data-testid="personal-draft-empty-state" className="mb-3 text-sm font-semibold text-slate-700">
            할 일을 모두 뺐어요. 필요한 할 일을 다시 추가할 수 있어요.
          </p>
        ) : null}
        {undo ? (
          <div
            data-testid="personal-draft-delete-undo"
            role="status"
            className="mb-3 flex flex-col gap-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{undo.title} 항목을 목록에서 뺐어요.</span>
            <button
              type="button"
              data-testid="personal-draft-delete-undo-action"
              className="min-h-8 rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700"
              onClick={() => undoMyFlowPersonalDraftDelete(flow)}
            >
              되돌리기
            </button>
          </div>
        ) : null}
        {removedItems.length > 0 ? (
          <details
            data-testid="personal-draft-persistent-recovery"
            className="mb-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
          >
            <summary
              data-testid="personal-draft-persistent-recovery-entry"
              className="cursor-pointer text-sm font-semibold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
            >
              목록에서 뺀 할 일 · {removedItems.length}개
            </summary>
            <ul data-testid="personal-draft-persistent-recovery-list" className="mt-2 grid gap-2 border-t border-slate-200 pt-2">
              {removedItems.map((item) => {
                const personalTitle = myFlowItemDrafts[
                  getPersonalDraftProjectionValueKey(flow.progress.slug, item.itemId)
                ]?.title;
                const title = toUserFacingSourceTitle(personalTitle ?? item.title);
                return (
                  <li
                    key={item.itemId}
                    data-testid="personal-draft-recoverable-item"
                    data-item-id={item.itemId}
                    data-structural-ownership={item.ownership}
                    className="flex min-w-0 items-center justify-between gap-2"
                  >
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-700" title={title}>{title}</span>
                    <button
                      type="button"
                      data-testid="personal-draft-restore-item"
                      data-item-id={item.itemId}
                      aria-label={`${title} 목록에 복구`}
                      className="min-h-8 shrink-0 rounded-md border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-300"
                      onClick={() => restoreMyFlowPersonalDraftItem(flow, item.itemId)}
                    >
                      복구
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        ) : null}
        {wideOrderRows.length > 0 ? (
          <div data-testid="personal-draft-order-list-wide" className="mb-3 hidden border-b border-slate-200 pb-3 md:block">
            <p className="mb-2 text-xs font-semibold text-slate-500">할 일 순서</p>
            <ul className="grid gap-1.5">
              {wideOrderRows.map((row, index) => (
                <li
                  key={`wide-order-${flow.progress.slug}-${row.id}`}
                  data-testid="personal-draft-order-item-wide"
                  data-item-id={row.id}
                  className="flex min-w-0 items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1.5"
                >
                  <button
                    type="button"
                    data-testid="personal-draft-order-item-open-wide"
                    aria-label={`${getMyFlowRowDisplayTitle(row)} 열기`}
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded px-1 py-1 text-left text-sm font-semibold text-slate-700 hover:bg-white hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
                    onClick={() => openMyFlowRowFromFlowTab(flow, row)}
                  >
                    <span className="min-w-0 truncate" title={getMyFlowRowDisplayTitle(row)}>
                      {getMyFlowRowDisplayTitle(row)}
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-blue-700">열기</span>
                  </button>
                  {renderPersonalDraftReorderControls(flow, row, index, wideOrderRows.length)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {addOpen ? (
          <form
            data-testid="personal-draft-add-form"
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              addMyFlowPersonalDraftItem(flow);
            }}
          >
            <label htmlFor={inputId} className="grid gap-1 text-xs font-semibold text-slate-700">
              추가할 할 일
              <input
                id={inputId}
                data-testid="personal-draft-add-title"
                className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                value={myFlowStructuralAddTitle}
                maxLength={120}
                autoFocus
                onChange={(event) => setMyFlowStructuralAddTitle(event.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <button
                type="button"
                className="min-h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600"
                onClick={() => {
                  setMyFlowStructuralAddOpenSlug('');
                  setMyFlowStructuralAddTitle('');
                }}
              >
                취소
              </button>
              <button
                type="submit"
                data-testid="personal-draft-add-save"
                disabled={!myFlowStructuralAddTitle.trim()}
                className="min-h-10 rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                추가
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            data-testid="personal-draft-add-entry"
            aria-expanded="false"
            className="inline-flex min-h-9 items-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300"
            onClick={() => {
              setMyFlowStructuralAddOpenSlug(flow.progress.slug);
              setMyFlowStructuralAddTitle('');
              setMyFlowStructuralUndo(null);
            }}
          >
            + 할 일 추가
          </button>
        )}
        {renderPersonalDraftListExport(flow)}
      </section>
    );
  };

  const renderCompactFlowStructureRow = (flow: MySavedFlow) => {
    const flowTitle = getMyFlowExecutionFlowTitle(flow.progress.title);
    const nextRow = getSavedFlowNextRow(flow);
    const contentReadiness = getMyFlowContentReadiness(flow);
    const executionReady = contentReadiness.kind === 'ready';
    const retiredPersonalCopy = contentReadiness.kind === 'retired';
    const sourceHref = getMyFlowSourceHref(flow);
    const sourceLabel = getMyFlowSourceLinkLabel(flow);
    const personalSavedCopy = isMyFlowPersonalSavedCopy(flow);
    const structuralEditEligible = isPersonalDraftStructuralEditEligible(flow.bundle);
    const settingsEditable = canEditMyFlowSavedFlowSettings(flow);
    const directAnchorEditable = canEditMyFlowDirectSavedMapAnchor(flow);
    const settingsDateAnchorCopy = settingsEditable ? getMyFlowSettingsDateAnchorCopy(flow) : null;
    const directAnchorCopy = directAnchorEditable ? getMyFlowDirectSavedMapAnchorCopy(flow) : null;
    const personalCopySettingsLabel = settingsDateAnchorCopy ? `${settingsDateAnchorCopy.label}·이름 바꾸기` : '설정 조정';
    const progressSummary = getMyFlowFlowProgressLabel(flow);
    const structureLabel = flow.savedMap
      ? toUserFacingMapTitle(flow.savedMap.title)
      : flow.bundle.flow.structure_type === 'routine'
        ? `반복 항목 ${flow.total}개`
        : flow.rows.some((row) => Boolean(row.date))
          ? `날짜 항목 ${flow.total}개`
          : `체크 항목 ${flow.total}개`;
    const activeCompactRow =
      myFlowDetailSurface === 'flow' && myFlowActiveRow && myFlowDetailOpen && myFlowActiveRow.flow.progress.slug === flow.progress.slug
        ? myFlowActiveRow
        : null;
    const flowExpanded = executionReady && (myFlowExpandedStructureSlug === flow.progress.slug || Boolean(activeCompactRow));
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
        className={`rounded-lg border p-3 shadow-sm ${retiredPersonalCopy ? 'border-amber-200 bg-amber-50/70' : flowExpanded ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white'}`}
      >
        <button
          type="button"
          data-testid="my-flow-mobile-structure-open"
          aria-expanded={flowExpanded}
          disabled={!executionReady}
          className="w-full rounded-md text-left"
          onClick={() => {
            if (executionReady) toggleMyFlowStructureFlow(flow);
          }}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="flex min-w-0 flex-1 gap-2">
              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${flowExpanded ? 'bg-blue-700' : 'bg-slate-400'}`} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-950">{flowTitle}</span>
                <span className="mt-1 block truncate text-xs font-semibold text-slate-500">{structureLabel}</span>
                {!executionReady ? (
                  <span data-testid="my-flow-content-readiness" className="mt-2 inline-flex w-fit rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                    {contentReadiness.label}
                  </span>
                ) : null}
              </span>
            </span>
            {executionReady || retiredPersonalCopy ? <span
              data-testid="my-flow-mobile-structure-progress"
              className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${flowExpanded ? 'bg-white text-blue-700 ring-1 ring-blue-100' : 'bg-slate-100 text-slate-700'}`}
            >
              {progressSummary}
            </span> : null}
          </span>
          {executionReady || retiredPersonalCopy ? <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-slate-200">
            <span className="block h-full rounded-full bg-blue-700" style={{ width: `${flow.percent}%` }} aria-hidden="true" />
          </span> : null}
          {personalSavedCopy ? (
            <span data-testid="my-flow-personal-copy-badge" className="mt-2 inline-flex w-fit rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
              개인 사본
            </span>
          ) : null}
          {executionReady && nextRow && !flowExpanded ? (
          <span className="mt-3 block border-t border-slate-200 pt-3">
              <span className="block text-xs font-semibold text-blue-700">{getMyFlowRowStatusLabel(nextRow)}</span>
              <span className="mt-1 block text-sm font-semibold text-slate-950">{nextRow.title}</span>
              <span className="mt-1 block text-xs font-semibold text-slate-500">
                {[nextRow.date ? formatMyFlowDisplayDate(nextRow.date) : '', formatMyFlowTimedScheduleLabel(nextRow.structuralScheduleProjection), nextRow.section ? toUserFacingSourceTitle(nextRow.section) : ''].filter(Boolean).join(' · ') || progressSummary}
              </span>
            </span>
          ) : executionReady && !nextRow ? (
            <span className="mt-3 block border-t border-slate-200 pt-3 text-sm text-slate-600">남은 항목이 없습니다.</span>
          ) : null}
        </button>
        {!executionReady ? (
          <div className="mt-3 rounded-md border border-amber-100 bg-white px-3 py-2">
            <p className="text-xs font-semibold leading-5 text-amber-900">{getMyFlowContentReadinessNote(contentReadiness)}</p>
            <Link className="mt-2 inline-flex min-h-8 items-center justify-center rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900" href={sourceHref}>
              {sourceLabel}
            </Link>
          </div>
        ) : null}
        {executionReady && settingsEditable ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="my-flow-personal-copy-settings-open"
              aria-label={`${flowTitle} ${personalCopySettingsLabel}`}
              className="inline-flex min-h-8 items-center justify-center rounded-md border border-blue-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-300"
              onClick={() => openMyFlowPersonalCopySettings(flow)}
            >
              {personalCopySettingsLabel}
            </button>
          </div>
        ) : null}
        {executionReady && directAnchorCopy ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="my-flow-direct-anchor-settings-open"
              aria-label={`${flowTitle} ${directAnchorCopy.editLabel}`}
              className="inline-flex min-h-8 items-center justify-center rounded-md border border-blue-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:border-blue-300"
              onClick={() => openMyFlowDirectAnchorSettings(flow)}
            >
              {directAnchorCopy.editLabel}
            </button>
          </div>
        ) : null}
        {renderMyFlowPersonalCopySettings(flow)}
        {renderMyFlowDirectAnchorSettings(flow)}
        {executionReady ? renderMyFlowCompletionFeedback(flow) : null}
        {executionReady ? renderMyFlowReuseNotice(flow) : null}
        {executionReady && flowExpanded ? (
          <div data-testid="my-flow-mobile-structure-step-list" className="mt-3 grid gap-2">
            {visibleStepEntries.map(({ row: stepRow, index }) => {
              const stepOpen = Boolean(activeCompactRow && activeCompactRow.id === stepRow.id);
              const stepChecked = isMyFlowRowChecked(flow, stepRow);
              return (
                <div
                  key={`step-${flow.progress.slug}-${stepRow.id}-${stepRow.date ?? index}`}
                  data-testid={structuralEditEligible ? 'personal-draft-effective-item' : undefined}
                  data-item-id={structuralEditEligible ? stepRow.id : undefined}
                  data-structural-ownership={structuralEditEligible ? stepRow.structuralOwnership : undefined}
                  className="rounded-md bg-white ring-1 ring-blue-100"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
                    <button
                      type="button"
                      data-testid="my-flow-mobile-structure-step-row"
                      aria-expanded={stepOpen}
                      className={`min-w-0 rounded-md px-3 py-2 text-left ${stepOpen ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
                      onClick={() => openMyFlowRowFromFlowTab(flow, stepRow)}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold text-slate-500">단계 {index + 1}</span>
                          <span className={`mt-0.5 block text-sm font-semibold ${stepChecked ? 'text-slate-400 line-through' : 'text-slate-950'}`}>
                            {getMyFlowRowDisplayTitle(stepRow)}
                          </span>
                          <span className="mt-1 block truncate text-xs font-semibold text-slate-500">
                            {[stepRow.date ? formatMyFlowDisplayDate(stepRow.date) : '', formatMyFlowTimedScheduleLabel(stepRow.structuralScheduleProjection), stepRow.timing ? formatMyFlowTimingChip(stepRow.timing) : '', getMyFlowRowDisplaySectionLabel(stepRow)].filter(Boolean).join(' · ') || progressSummary}
                          </span>
                        </span>
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${stepChecked ? 'bg-emerald-50 text-emerald-700' : stepOpen ? 'bg-white text-blue-700 ring-1 ring-blue-100' : 'bg-slate-100 text-slate-600'}`}>
                          {stepChecked ? '완료' : stepOpen ? '열림' : '열기'}
                        </span>
                      </span>
                    </button>
                    {structuralEditEligible
                      ? renderPersonalDraftReorderControls(flow, stepRow, index, stepEntries.length)
                      : null}
                  </div>
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
        {executionReady && flowExpanded ? renderPersonalDraftStructuralControls(flow) : null}
        {flowExpanded ? renderMyFlowExcludedSteps(flow) : null}
      </article>
    );
  };

  const renderSavedFlowOverviewCard = (flow: MySavedFlow) => {
    const flowTitle = getMyFlowExecutionFlowTitle(flow.progress.title);
    const savedMapTitle = flow.savedMap ? toUserFacingMapTitle(flow.savedMap.title) : '';
    const personalSavedCopy = isMyFlowPersonalSavedCopy(flow);
    const settingsEditable = canEditMyFlowSavedFlowSettings(flow);
    const directAnchorEditable = canEditMyFlowDirectSavedMapAnchor(flow);
    const settingsDateAnchorCopy = settingsEditable ? getMyFlowSettingsDateAnchorCopy(flow) : null;
    const directAnchorCopy = directAnchorEditable ? getMyFlowDirectSavedMapAnchorCopy(flow) : null;
    const personalCopySettingsLabel = settingsDateAnchorCopy ? `${settingsDateAnchorCopy.label}·이름 바꾸기` : '설정 조정';
    const nextRow = getSavedFlowNextRow(flow);
    const progressSummary = getMyFlowFlowProgressLabel(flow);
    const anchorDisplay = getMyFlowAnchorDisplay(flow.bundle, flow.anchor, myFlowDemoMode);
    const nextActionLabel = getMyFlowOpenActionLabel(flow.bundle);
    const typeCounts = flow.bundle.flow.tags?.includes('progress-flow') ? [] : getMyFlowTypeCounts(flow.rows);
    const sourceHref = getMyFlowSourceHref(flow);
    const sourceLabel = getMyFlowSourceLinkLabel(flow);
    const contentReadiness = getMyFlowContentReadiness(flow);
    const executionReady = contentReadiness.kind === 'ready';
    const retiredPersonalCopy = contentReadiness.kind === 'retired';
    const sourceLinkExternal = sourceHref.startsWith('https://');
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
              <div className="mt-2 flex flex-wrap gap-2">
                <p data-testid="my-flow-map-context" className="w-fit rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  저장한 콘텐츠 · {savedMapTitle}
                </p>
                {personalSavedCopy ? (
                  <p data-testid="my-flow-personal-copy-badge" className="w-fit rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    개인 사본
                  </p>
                ) : null}
              </div>
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
            {settingsEditable ? (
              <button
                type="button"
                data-testid="my-flow-personal-copy-settings-open"
                aria-label={`${flowTitle} ${personalCopySettingsLabel}`}
                className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300"
                onClick={() => openMyFlowPersonalCopySettings(flow)}
              >
                {personalCopySettingsLabel}
              </button>
            ) : null}
            {directAnchorCopy ? (
              <button
                type="button"
                data-testid="my-flow-direct-anchor-settings-open"
                aria-label={`${flowTitle} ${directAnchorCopy.editLabel}`}
                className="mt-3 inline-flex min-h-9 items-center justify-center rounded-md border border-blue-100 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:border-blue-300"
                onClick={() => openMyFlowDirectAnchorSettings(flow)}
              >
                {directAnchorCopy.editLabel}
              </button>
            ) : null}
          </div>
        </div>
        {renderMyFlowPersonalCopySettings(flow)}
        {renderMyFlowDirectAnchorSettings(flow)}
        {executionReady ? <div data-testid="my-flow-next-action" className={`mt-4 rounded-md border px-3 py-3 ${nextActionToneClass}`}>
          <p className={`text-xs font-semibold ${showContentReadinessBadge ? 'text-slate-600' : 'text-blue-700'}`}>{nextRow ? getMyFlowRowStatusLabel(nextRow) : '다음에 볼 항목'}</p>
          {nextRow ? (
            <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-500">{[nextRow.timing ? formatMyFlowTimingChip(nextRow.timing) : '', nextRow.date ? formatMyFlowDisplayDate(nextRow.date) : '', formatMyFlowTimedScheduleLabel(nextRow.structuralScheduleProjection), nextRow.section ? toUserFacingSourceTitle(nextRow.section) : ''].filter(Boolean).join(' · ')}</p>
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
        </div> : null}
        {executionReady ? renderPersonalDraftStructuralControls(flow) : null}
        {executionReady && activeOverviewRow ? (
          <div className="mt-3" data-testid="my-flow-overview-inline-detail">
            {renderMyFlowItemDetailEditor(activeOverviewRow, 'inline', 'flow')}
          </div>
        ) : null}
        {executionReady || retiredPersonalCopy ? <div className="mt-4">
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
        </div> : null}
        {executionReady ? renderMyFlowCompletionFeedback(flow) : null}
        {executionReady ? renderMyFlowReuseNotice(flow) : null}
        {executionReady ? renderMyFlowExcludedSteps(flow) : null}
        <div className={`mt-4 grid gap-2 ${showHideToggle ? 'sm:grid-cols-[minmax(0,1fr)_auto]' : ''}`}>
          <Link
            className="inline-flex min-h-10 w-full items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300"
            href={sourceHref}
            target={sourceLinkExternal ? '_blank' : undefined}
            rel={sourceLinkExternal ? 'noreferrer' : undefined}
          >
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
        const executionReadyGroup = group.flows.every(isMyFlowReadyContent);
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
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {executionReadyGroup
                    ? `${group.flows.length}개 목록 · 전체 ${done}/${total} 완료`
                    : `${group.flows.length}개 저장 기록`}
                </p>
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

  const openMyFlowMapUpdateReview = (notice: MyFlowMapUpdateNotice) => {
    const completedFlow = savedFlows.find(
      (flow) => flow.savedMap?.mapId === notice.mapId
        && flow.rows.length > 0
        && flow.rows.every((row) => isMyFlowRowChecked(flow, row)),
    );
    if (!completedFlow) return;
    setSavedView('flow');
    setSelectedSavedFlowSlug(completedFlow.progress.slug);
    setMyFlowExpandedStructureSlug(completedFlow.progress.slug);
    openMyFlowReuse(completedFlow, 'latest');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        document.querySelector(`[data-flow-slug="${completedFlow.progress.slug}"]`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }, 0);
    }
  };

  const getMyFlowUpdateRowTitle = (slug: string) => toContentDisplayTitle(myFlowBundles.find((entry) => entry.flow.slug === slug)?.flow.title ?? slug);

  const renderMyFlowMapUpdateNotices = () => {
    const allExecutionHeld = myFlowMapUpdateNotices.every((notice) => notice.executionHeld);
    const allSourceRowsHeld = allExecutionHeld && myFlowMapUpdateNotices.every((notice) => notice.executionHoldReason === 'source_rows');
    const allMedicalSourceFitHeld = allExecutionHeld && myFlowMapUpdateNotices.every((notice) => notice.executionHoldReason === 'medical_source_fit');
    return myFlowMapUpdateNotices.length > 0 ? (
      <section data-testid="my-flow-map-update-review" className="rounded-lg border border-amber-200 bg-amber-50/70 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-amber-800">{allSourceRowsHeld ? '실행 항목 준비' : allMedicalSourceFitHeld ? '시작 시기 확인' : allExecutionHeld ? '공식 내용 재확인' : '업데이트 확인'}</p>
            <h4 className="text-base font-semibold text-amber-950">
              {allSourceRowsHeld ? '다시 쓰기 전 원문 자료를 확인해 주세요' : allMedicalSourceFitHeld ? '다시 쓰기 전 아이 상태와 공식 안내를 확인해 주세요' : allExecutionHeld ? '실행 전 최신 공식 내용을 확인해 주세요' : '저장한 콘텐츠에 다시 볼 내용이 있습니다'}
            </h4>
            <p className="mt-1 text-sm font-medium text-amber-900">
              {allSourceRowsHeld
                ? '저장한 기록은 그대로 남지만, 개별 자료와 난이도를 확인한 뒤 새 일정으로 쓰는 편이 안전합니다.'
                : allMedicalSourceFitHeld
                ? '저장한 기록은 그대로 남지만, 시작 시기와 메뉴를 아이 상태에 맞게 다시 확인해야 합니다.'
                : allExecutionHeld
                ? '저장한 기록은 그대로 남지만, 공식 내용이 달라질 수 있어 원문 확인이 필요합니다.'
                : '기존 항목은 그대로 두고, 원문이나 일정 변경 가능성만 따로 확인합니다.'}
            </p>
          </div>
          <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{myFlowMapUpdateNotices.length}개</span>
        </div>
        <div className="mt-3 grid gap-2">
          {myFlowMapUpdateNotices.map((notice) => {
            const expanded = myFlowExpandedMapUpdateId === notice.mapId;
            const completedFlowAvailable = savedFlows.some(
              (flow) => flow.savedMap?.mapId === notice.mapId
                && flow.rows.length > 0
                && flow.rows.every((row) => isMyFlowRowChecked(flow, row)),
            );
            return (
              <article key={notice.mapId} data-testid="my-flow-map-update-notice" className="rounded-md border border-amber-100 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${notice.tone === 'amber' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-700'}`}>
                      {notice.label}
                    </span>
                    <h5 className="mt-2 text-sm font-semibold text-slate-950">{toUserFacingMapTitle(notice.title)}</h5>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      영향 Flow {notice.affectedCount}개 · 현재 실행은 그대로 유지
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-1.5 sm:w-auto sm:flex sm:shrink-0 sm:flex-wrap">
                    {!notice.executionHeld ? (
                      <>
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
                          disabled={notice.status === 'map_missing' || !completedFlowAvailable}
                          onClick={() => openMyFlowMapUpdateReview(notice)}
                        >
                          {completedFlowAvailable ? '완료 Flow에서 검토' : '완료 후 검토'}
                        </button>
                      </>
                    ) : null}
                    <Link className="inline-flex min-h-8 items-center justify-center rounded-md border border-amber-100 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 hover:border-amber-300" href={`/flow-maps/${notice.mapId}`}>
                      {notice.executionHoldReason === 'source_rows' ? '원문 자료 확인' : notice.executionHoldReason === 'medical_source_fit' ? '시작 안내 확인' : notice.executionHeld ? '공식 내용 확인' : '전체 보기'}
                    </Link>
                    {!notice.executionHeld ? (
                      <button
                        type="button"
                        data-testid="my-flow-map-update-dismiss"
                        className="inline-flex min-h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:border-slate-300"
                        onClick={() => dismissMyFlowMapUpdateNotice(notice)}
                      >
                        지금은 숨기기
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                  {notice.executionHeld
                    ? notice.executionHoldReason === 'source_rows'
                      ? '저장한 내용은 자동으로 바꾸지 않습니다. 다시 쓰기 전 개별 자료와 난이도를 확인해 주세요.'
                      : notice.executionHoldReason === 'medical_source_fit'
                        ? '저장한 내용은 자동으로 바꾸지 않습니다. 다시 쓰기 전 아이 상태와 공식 이유식 안내를 확인해 주세요.'
                      : '저장한 내용은 자동으로 바꾸지 않습니다. 실행 전 공식 원문에서 최신 일정을 확인해 주세요.'
                    : '자동 반영 안 함. 지금 실행은 저장한 내용 그대로 두고, 새 내용은 다음 실행에서만 선택합니다.'}
                </p>
                {notice.reasons.length > 0 ? (
                  <ul className="mt-2 grid gap-1 text-xs font-medium text-amber-900">
                    {notice.reasons.slice(0, 2).map((reason) => (
                      <li key={reason}>- {reason}</li>
                    ))}
                  </ul>
                ) : null}
                {expanded && !notice.executionHeld ? (
                  <div data-testid="my-flow-map-update-comparison" className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      <span className="rounded bg-white px-2 py-1 ring-1 ring-slate-200">저장 {notice.savedVersion}</span>
                      {notice.currentVersion ? <span className="rounded bg-white px-2 py-1 ring-1 ring-slate-200">현재 {notice.currentVersion}</span> : null}
                    </div>
                    <div className="mt-3 grid gap-2">
                      {notice.versionReview?.items.length ? notice.versionReview.items.map((item) => (
                        <div key={item.key} data-testid="my-flow-map-update-item" className="border-b border-slate-200 bg-white px-2 py-2 last:border-b-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-950">{toUserFacingSourceTitle(item.current?.title ?? item.previous?.title ?? '')}</p>
                            <span className="bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                              {getFlowVersionReviewItemLabel(item)}
                            </span>
                          </div>
                          {item.hasPersonalConflict ? <p className="mt-1 text-[11px] font-semibold text-amber-700">내가 바꾼 내용과 겹쳐 선택이 필요합니다.</p> : null}
                        </div>
                      )) : notice.comparisonRows.map((row) => (
                        <div key={row.slug} data-testid="my-flow-map-update-comparison-row" className="border-b border-slate-200 bg-white px-2 py-2 last:border-b-0">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-950">{getMyFlowUpdateRowTitle(row.slug)}</p>
                            <span className="bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
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
              <p className="text-xs font-semibold text-amber-800">{flowListSupportOnlyRetired ? '기록 보존' : '별도 확인'}</p>
              <h4 className="text-base font-semibold text-amber-950">{flowListSupportOnlyRetired ? '이전 저장 기록' : '확인할 저장 콘텐츠'}</h4>
            </div>
            <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">{flowListSupportFlows.length}개</span>
          </div>
          <p className="mt-1 text-sm font-medium text-amber-900">
            {flowListSupportOnlyRetired
              ? '공개가 끝난 Flow는 완료 기록과 메모만 남기고, 새 실행은 대체 Flow에서 시작합니다.'
              : '원문 확인이 필요하거나 공개가 끝난 기록은 바로 실행할 콘텐츠와 구분합니다.'}
          </p>
          <div className="mt-3">
            {renderFlowInventoryGroups(flowListSupportGroups)}
          </div>
        </section>
      ) : null}
    </div>
  );

  return (
    <main className={`mx-auto max-w-[1240px] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:px-5 md:pb-8 ${isCalendarSurface ? 'py-3 sm:py-6' : 'py-4 sm:py-8'}`}>
      <PlatformNav />
      <div className={`flex flex-wrap items-end justify-between gap-4 ${isCalendarSurface ? 'mb-3 sm:mb-5' : 'mb-5 sm:mb-8'}`}>
        <div>
          <p className={isCalendarSurface ? 'text-xs font-semibold text-blue-700' : 'text-sm font-medium text-gray-500'}>{isCalendarSurface ? '날짜별 실행' : '내 실행 공간'}</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={`${isCalendarSurface ? 'mt-0.5 text-2xl' : 'mt-1 text-2xl sm:text-3xl'} font-semibold tracking-tight`}>{isCalendarSurface ? '캘린더' : '내 Flow'}</h1>
            {!isCalendarSurface && showDemoData ? (
              <span data-testid="my-flow-demo-badge" className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                {myFlowDemoMode === 'ux20' ? 'UX20 데모' : myFlowDemoMode === 'ux12' ? 'UX12 데모' : myFlowDemoMode === 'source-backed' ? '원문 기반 데모' : '데모 데이터'}
              </span>
            ) : null}
          </div>
          <p className={`${isCalendarSurface ? 'hidden sm:block' : 'sm:mt-2 sm:text-base'} mt-1 text-sm text-gray-600`}>
            {isCalendarSurface
              ? '언제 할지 정해진 항목을 날짜별로 확인합니다.'
              : '오늘, 다음, 지난 할 일을 먼저 봅니다.'}
          </p>
        </div>
        {workspaceSavedFlows.length > 0 || !isCalendarSurface ? (
          <div className="flex flex-wrap gap-2">
            {workspaceSavedFlows.length > 0 ? (
              <Link
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
                data-testid="my-flow-studio-link"
                href={`/u/${currentUser.slug}`}
              >
                스튜디오
              </Link>
            ) : null}
            {!isCalendarSurface ? <MyFlowDataManager /> : null}
          </div>
        ) : null}
      </div>

      {workspaceSavedFlows.length === 0 ? (
        <section data-testid="my-flow-empty-state" className="border-y border-slate-200 bg-slate-50/70 px-1 py-8 sm:px-6 sm:py-10">
          <p className="text-sm font-semibold text-blue-700">{isCalendarSurface ? '날짜 항목 없음' : '저장한 콘텐츠 없음'}</p>
          <h2 className="mt-2 break-keep text-2xl font-semibold tracking-tight text-slate-950">
            {isCalendarSurface ? '날짜가 있는 콘텐츠를 먼저 고르세요' : '저장할 콘텐츠를 먼저 고르세요'}
          </h2>
          <p className="mt-2 max-w-xl break-keep text-sm leading-6 text-slate-600">
            {isCalendarSurface
              ? '언제 할지 정해진 항목을 날짜별로 확인합니다.'
              : '하나를 저장하면 오늘, 다음, 지난 할 일이 여기에서 바로 이어집니다.'}
          </p>
          <div className="mt-5">
            <Link className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white sm:w-auto" href="/flows">
              콘텐츠 고르러 가기
            </Link>
          </div>
        </section>
      ) : null}

      {workspaceSavedFlows.length > 0 ? (
        <section className="mb-6">
          {showPostSavePanel ? renderPostSavePanel() : null}
          {showMyFlowWorkspace ? (
          <div
            data-testid="my-flow-workspace"
            data-surface-role={isCalendarSurface ? 'date-first' : 'task-first'}
            ref={myFlowWorkspaceRef}
            className={`mb-4 grid gap-4 ${showMyFlowSidebar ? 'xl:grid-cols-[280px_minmax(0,1fr)]' : ''}`}
          >
            {showMyFlowSidebar ? (
              <aside data-testid="my-flow-list" className="hidden max-h-[calc(100vh-2rem)] self-start overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-4 xl:block">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-500">실행 목록</p>
                    <h3 className="text-base font-semibold text-slate-950">Flow 목록</h3>
                  </div>
                  <p className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{workspaceSavedFlows.length}개</p>
                </div>
                <div className="grid gap-2">
                  {workspaceSavedFlows.map((flow) => (
                    <button
                      key={flow.progress.slug}
                      className={`rounded-md border px-3 py-3 text-left ${selectedSavedFlowSlug === flow.progress.slug ? 'border-blue-600 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50'}`}
                      type="button"
                      aria-pressed={selectedSavedFlowSlug === flow.progress.slug}
                      data-testid={`my-flow-filter-${flow.progress.slug}`}
                      onClick={() => setSelectedSavedFlowSlug(flow.progress.slug)}
                    >
                      <span className="block text-sm font-semibold">{getMyFlowExecutionFlowTitle(flow.progress.title)}</span>
                      <span className="mt-1 block text-xs font-semibold text-blue-700">{getMyFlowFlowProgressLabel(flow)}</span>
                    </button>
                  ))}
                </div>
              </aside>
            ) : null}
            <div className="min-w-0">
              {showMyFlowWorkspaceControls ? (
              <div className="mb-5 border-y border-slate-200 py-3 sm:flex sm:items-end sm:justify-between sm:gap-3">
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
                      {workspaceSavedFlows.map((flow) => (
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
                <div className="mx-auto mb-4 grid min-w-0 max-w-4xl gap-4">
                  <section data-testid="my-flow-now-section" className="grid min-w-0 gap-3 border-y border-blue-200 bg-blue-50/40 px-1 py-4 sm:px-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">{myFlowNowEyebrow}</p>
                        <h3 data-testid="my-flow-today-remaining-count" className="mt-0.5 text-base font-semibold text-slate-950 sm:mt-1 sm:text-lg">
                          {myFlowTodayUnifiedTitle}
                        </h3>
                        {!isMyFlowMobileViewport ? (
                          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                            {myFlowTodayUnifiedHelp}
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

                  {showMyFlowTodaySummary ? (
                  <section data-testid="my-flow-today-summary" className="min-w-0 border-y border-slate-200 py-4">
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
                  ) : null}

                  {showTodayOpenSection && !isMyFlowMobileViewport ? (
                    <section data-testid="my-flow-today-list" className="border-y border-slate-200 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-950">오늘 할 일</h3>
                          <p className="mt-1 text-sm text-slate-600">{visibleTodayOpenScheduleRows.length}개 날짜 항목 · {visibleTodayOpenRoutineRows.length}개 반복 항목</p>
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
                    <section data-testid="my-flow-upcoming-list" className="min-w-0 border-y border-slate-200 py-4">
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
                    <section data-testid="my-flow-overdue-list" className="min-w-0 border-y border-amber-200 bg-amber-50/30 px-1 py-3">
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
                    <section data-testid="my-flow-today-completed-list" className="min-w-0 border-y border-slate-200 py-3">
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
                      <section data-testid="my-flow-mobile-flow-summary" className="rounded-lg border border-[#E7E4DD] bg-white px-3 py-2.5 shadow-sm">
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
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">지금 볼 할 일</h3>
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
                <div className={`grid gap-3 ${myFlowReuseDraft?.versionMode === 'latest' ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                  {visibleSavedFlows.map((flow) => renderSavedFlowOverviewCard(flow))}
                </div>
              )}
            </div>
          ) : null}

          {savedView === 'calendar' ? (
            <div>
              <div className="grid gap-4 pb-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.75fr)] lg:gap-0">
              <section
                ref={myFlowCalendarCardRef}
                data-testid="my-flow-calendar-card"
                data-calendar-layout="month-overview"
                className="order-2 min-w-0 py-2 sm:py-3 lg:order-1 lg:pr-5"
              >
                <div className="hidden items-start justify-between gap-3 sm:flex">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">월간 날짜 보기</h3>
                    <p className="mt-1 hidden text-sm text-slate-600 sm:block">색과 라벨로 Flow를 구분하고, 반복 항목은 아이콘으로 표시합니다.</p>
                  </div>
                  <div className="hidden flex-wrap gap-2 sm:flex">
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">날짜 항목 {monthCalendarRows.filter((row) => row.flow.bundle.flow.structure_type !== 'routine').length}개</span>
                    <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">반복 항목 {monthCalendarRows.filter((row) => row.flow.bundle.flow.structure_type === 'routine').length}개</span>
                  </div>
                </div>
                {showMyFlowCalendarScopeFilter ? (
                  <div
                    data-testid="my-flow-calendar-scope-filter"
                    className="mt-2 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 sm:mt-3 sm:w-fit"
                    aria-label="캘린더 표시 범위"
                  >
                    {visibleMyFlowCalendarScopeOptions.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        data-testid={`my-flow-calendar-scope-${option.id}`}
                        aria-pressed={myFlowCalendarScope === option.id}
                        className={`min-h-8 shrink-0 rounded-md px-2.5 text-xs font-bold ${myFlowCalendarScope === option.id ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100' : 'text-slate-600'}`}
                        onClick={() => selectMyFlowCalendarScope(option.id)}
                      >
                        {isMyFlowMobileViewport
                          ? option.id === 'all'
                            ? '전체'
                            : option.id === 'map'
                              ? '저장'
                              : option.id === 'schedule'
                                ? '날짜'
                                : '반복'
                          : option.label}
                        <span className="ml-1 text-[10px] font-semibold text-slate-500">{option.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {monthCalendarRows.some((row) => row.flow.bundle.flow.structure_type === 'routine') ? (
                  <div data-testid="my-flow-routine-legend" className="mt-3 hidden flex-wrap gap-2 border-y border-slate-200 py-2 text-xs font-semibold text-slate-600 sm:flex">
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
                <div className="mt-1 flex items-center justify-between gap-2 border-y border-slate-200 py-2 sm:mt-4">
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
                <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-0.5 sm:p-2">
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
                data-calendar-layout="selected-day-execution"
                data-overflow-date={myFlowRoutineOverflowDate === myFlowSelectedDate ? myFlowRoutineOverflowDate : undefined}
                data-schedule-overflow-date={myFlowScheduleOverflowDate === myFlowSelectedDate ? myFlowScheduleOverflowDate : undefined}
                className="order-1 border-y border-slate-200 py-3 sm:py-4 lg:order-2 lg:border-y-0 lg:border-l lg:pl-5"
              >
                <h3 className="mt-1 text-lg font-semibold text-slate-950">{formatMyFlowDisplayDate(myFlowSelectedDate, { includeWeekday: true })}</h3>
                {!isMyFlowMobileViewport ? (
                  <p data-testid="my-flow-selected-day-summary" className="mt-1 text-xs font-semibold text-slate-500">
                    {showMyFlowCalendarScopeFilter ? `${myFlowCalendarScopeLabel} · ` : ''}{myFlowSelectedDateAllRows.length}개 항목 · {myFlowSelectedDateOpenCount}개 남음
                  </p>
                ) : null}
                {myFlowRoutineOverflowDate === myFlowSelectedDate && myFlowSelectedDateRoutineOverflowCount > 0 ? (
                  <p data-testid="my-flow-selected-day-overflow-note" className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    +{myFlowSelectedDateRoutineOverflowCount} 반복 항목 포함
                  </p>
                ) : null}
                {myFlowScheduleOverflowDate === myFlowSelectedDate && myFlowSelectedDateScheduleOverflowCount > 0 ? (
                  <p data-testid="my-flow-selected-day-schedule-overflow-note" className="mt-2 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    +{myFlowSelectedDateScheduleOverflowCount} 날짜 항목 포함
                  </p>
                ) : null}
                {myFlowSelectedDateAllRows.length > 0 ? (
                  <div data-testid="my-flow-selected-date-groups" className="mt-3 grid">
                    {myFlowSelectedDateGroups.map((group) => {
                      const groupOpenCount = group.rows.filter((row) => !isMyFlowRowChecked(row.flow, row)).length;
                      const groupHasMultipleFlows = new Set(group.rows.map((row) => row.flow.progress.slug)).size > 1;
                      const sharedMeta = getMyFlowAgendaSharedMeta(group.rows, group.kind);
                      const flowMarker = group.flowMarker;
                      return (
                        <section
                          key={group.key}
                          data-testid="my-flow-selected-date-group"
                          data-density="compact"
                          data-flow-marker-key={flowMarker.key}
                          className="border-t border-slate-200 py-3 first:border-t-0 first:pt-0"
                        >
                          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2">
                              <span
                                data-testid="my-flow-selected-date-flow-marker"
                                aria-label={flowMarker.title}
                                title={flowMarker.title}
                                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white"
                                style={{ backgroundColor: flowMarker.color }}
                              >
                                {flowMarker.initial}
                              </span>
                              <div className="min-w-0">
                                <h4 className="truncate text-sm font-semibold text-slate-950">{group.savedMap ? toUserFacingMapTitle(group.title) : toContentDisplayTitle(group.title)}</h4>
                              </div>
                            </div>
                            {group.rows.length > 1 || groupOpenCount !== group.rows.length ? (
                              <span className="text-[11px] font-semibold text-slate-500">
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
                                  className="text-slate-600"
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
                              suppressDateMeta: true,
                              hideDateMeta: true,
                              hideTimingMeta: Boolean(sharedMeta.timing),
                              hideSectionMeta: Boolean(sharedMeta.section),
                              hideFlowMeta: !groupHasMultipleFlows,
                              showOpenLabel: true,
                              detailSurface: 'calendar',
                              markerColor: flowMarker.color,
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
                      {myFlowChecklistPickerOpen ? '체크 항목 접기' : `체크 항목 더 보기 ${hiddenChecklistPickerCount}개`}
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
                          {renderExecutionRow(row, { kind: 'routine', compact: true, openDetail: true, inlineDetail: true, showRoutineDate: true, detailSurface: 'routine' })}
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
                <p className="mt-2">반복 항목을 저장하면 요일별 실행과 완료 여부가 여기에 모입니다.</p>
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

type CreatorProfileSourceFilter = 'all' | 'real' | 'preview' | 'draft';
const CREATOR_PROFILE_PAGE_SIZE = 12;

function isUrlFirstDraftBundle(bundle: FlowBundle): boolean {
  return bundle.flow.status === 'draft' && bundle.flow.slug.startsWith('url-draft-');
}

export function CreatorProfile({ slug }: { slug: string }) {
  const { bundles } = useBundles();
  const normalized = normalizeCreatorSlug(slug);
  const user = findVirtualUserBySlug(normalized);
  const allCreatorBundles = bundles.filter((bundle) => {
    const creator = getCreatorUser(bundle);
    if (user) return creator?.id === user.id;
    return normalizeCreatorSlug(creator?.slug ?? creatorSlug(getCreatorName(bundle))) === normalized;
  });
  const profileSeedBundle = allCreatorBundles[0];
  const profile = user ?? (profileSeedBundle ? getCreatorUser(profileSeedBundle) : undefined);
  const canShowReviewInventory = Boolean(profile?.is_current_user || profile?.is_preview_channel);
  const creatorBundles = allCreatorBundles
    .filter((bundle) => canShowReviewInventory || getPublicFlowIndexingPolicy(bundle).indexable)
    .sort((a, b) => getCreatorBundlePriority(a) - getCreatorBundlePriority(b));
  const allCategoryLabel = '모든 주제';
  const [categoryFilter, setCategoryFilter] = useState(allCategoryLabel);
  const [sourceFilter, setSourceFilter] = useState<CreatorProfileSourceFilter>(
    profile?.is_current_user ? 'all' : profile?.is_preview_channel ? 'real' : 'all',
  );
  const [libraryQuery, setLibraryQuery] = useState('');
  const [visibleContentLimit, setVisibleContentLimit] = useState(CREATOR_PROFILE_PAGE_SIZE);
  const first = creatorBundles[0] ?? profileSeedBundle;
  const categories = Array.from(new Set(creatorBundles.map((bundle) => bundle.flow.category))).slice(0, 6);
  const allCategories = [allCategoryLabel, ...Array.from(new Set(creatorBundles.map((bundle) => bundle.flow.category)))];
  const normalizedLibraryQuery = libraryQuery.trim().toLowerCase();
  const visibleCreatorBundles = creatorBundles
    .filter((bundle) => (categoryFilter === allCategoryLabel ? true : bundle.flow.category === categoryFilter))
    .filter((bundle) => {
      if (sourceFilter === 'real') {
        return (
          bundle.flow.source_status === 'real' ||
          normalizeExecutionModel(bundle).exposureStatus === 'representative'
        );
      }
      if (sourceFilter === 'preview') return bundle.flow.source_status === 'preview';
      if (sourceFilter === 'draft') return bundle.flow.status === 'draft';
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
  const shouldPaginateCreatorProfile = !canShowReviewInventory;
  const displayedCreatorBundles = shouldPaginateCreatorProfile
    ? visibleCreatorBundles.slice(0, visibleContentLimit)
    : visibleCreatorBundles;
  const hiddenCreatorBundleCount = Math.max(
    0,
    visibleCreatorBundles.length - displayedCreatorBundles.length,
  );
  const exactRealBundles = creatorBundles.filter(
    (bundle) => bundle.flow.source_status === 'real' && bundle.flow.source_precision === 'exact',
  );
  const recommendedBundles = exactRealBundles.slice(0, 3);
  const sourceFilterOptions: Array<[CreatorProfileSourceFilter, string]> = profile?.is_current_user
    ? [
        ['all', '모두 보기'],
        ['real', '확인된 콘텐츠'],
        ['preview', '샘플'],
        ['draft', '초안'],
      ]
    : profile?.is_preview_channel
      ? [
          ['all', '모두 보기'],
          ['real', '원문 있는 재고'],
          ['preview', '샘플'],
        ]
      : [
          ['all', '모두 보기'],
          ['real', '원문 확인됨'],
        ];

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
    <main className="mx-auto max-w-[1240px] px-5 py-8 pb-28 md:pb-8" data-testid="creator-profile-surface">
      <PlatformNav />
      <header data-metric-policy="inventory-not-outcomes" className="border-y border-gray-200 py-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-xl font-semibold text-blue-700">
            {profile?.avatar_initial ?? (first ? getCreatorAvatar(first) : '?')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-blue-700">{profile?.is_current_user ? '내 스튜디오' : '제작자'}</p>
            <h1 className="mt-2 break-keep text-2xl font-semibold tracking-tight sm:text-3xl">{profile?.name ?? (first ? getCreatorName(first) : '제작자')}</h1>
            <p className="mt-2 text-gray-600">{profile?.role ?? (first ? getCreatorRole(first) : '')}</p>
            <p className="mt-3 max-w-3xl leading-7 text-gray-600">{profile?.bio ?? (first ? getCreatorNote(first) : '')}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 divide-x divide-gray-200 border-y border-gray-200 bg-gray-50/70">
          <div className="px-3 py-4 sm:px-4">
            <p className="text-sm text-gray-500">콘텐츠</p>
            <p className="mt-1 text-2xl font-semibold">{creatorBundles.length}</p>
          </div>
          <div className="px-3 py-4 sm:px-4">
            <p className="text-sm text-gray-500">원문 확인</p>
            <p className="mt-1 text-2xl font-semibold">{exactRealBundles.length}</p>
          </div>
          <div className="px-3 py-4 sm:px-4">
            <p className="text-sm text-gray-500">주제</p>
            <p className="mt-1 text-2xl font-semibold">{allCategories.length - 1}</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(profile?.specialty_tags ?? categories).map((category) => (
            <span key={category} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">{category}</span>
          ))}
        </div>
      </header>

      {profile?.is_preview_channel && recommendedBundles.length ? (
        <section className="mt-8 border-y border-gray-200 bg-gray-50 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-emerald-700">내부 검토 재고</p>
              <h2 className="mt-1 text-2xl font-semibold">원문 있는 콘텐츠부터 검토</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                원문이 있는 콘텐츠를 먼저 모았습니다. 공개 승인 전에는 실행 페이지 대신 내부 검토 재고에서 확인합니다.
              </p>
            </div>
            <button
              className="rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-700"
              type="button"
              onClick={() => setSourceFilter('real')}
            >
              원문 재고만 보기
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
            <p className="text-sm font-semibold text-gray-500">
              {profile?.is_current_user ? '내가 만든 콘텐츠' : '저장 가능한 콘텐츠'}
            </p>
            <h2 className="text-2xl font-semibold">
              {profile?.is_current_user ? '스튜디오 콘텐츠' : '만든 콘텐츠'}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {displayedCreatorBundles.length}개 표시 / 전체 {creatorBundles.length}개
            </p>
          </div>
          <Link
            data-testid="creator-profile-library-action"
            className="text-sm font-semibold text-blue-700"
            href={profile?.is_current_user ? '/flows/new' : '/flows'}
          >
            {profile?.is_current_user ? '내 콘텐츠로 만들기' : 'Flow 찾기'}
          </Link>
        </div>
        <label className="mb-3 block">
          <span className="text-sm font-semibold text-gray-700">콘텐츠 검색</span>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="제목, 카테고리, 태그, 출처로 검색"
            value={libraryQuery}
            onChange={(event) => {
              setLibraryQuery(event.target.value);
              setVisibleContentLimit(CREATOR_PROFILE_PAGE_SIZE);
            }}
          />
        </label>
        <div className="mb-3 flex flex-wrap gap-2">
          {sourceFilterOptions.map(([key, label]) => (
            <button
              key={key}
              data-testid={key === 'draft' ? 'creator-profile-draft-tab' : undefined}
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                sourceFilter === key
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              type="button"
              onClick={() => {
                setSourceFilter(key as CreatorProfileSourceFilter);
                setVisibleContentLimit(CREATOR_PROFILE_PAGE_SIZE);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="mb-3 block md:hidden">
          <span className="text-sm font-semibold text-gray-700">주제</span>
          <select
            aria-label="주제 필터"
            className="mt-1 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800"
            value={categoryFilter}
            onChange={(event) => {
              setCategoryFilter(event.target.value);
              setVisibleContentLimit(CREATOR_PROFILE_PAGE_SIZE);
            }}
          >
            {allCategories.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <div className="mb-4 hidden flex-wrap gap-2 md:flex">
          {allCategories.map((category) => (
            <button
              key={category}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                categoryFilter === category
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
              type="button"
              onClick={() => {
                setCategoryFilter(category);
                setVisibleContentLimit(CREATOR_PROFILE_PAGE_SIZE);
              }}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayedCreatorBundles.map((bundle) => {
            const isUrlFirstDraft = isUrlFirstDraftBundle(bundle);
            const publicRouteEnabled = getPublicFlowIndexingPolicy(bundle).indexable;
            const internalReviewHref = canShowReviewInventory && !publicRouteEnabled
              ? '/content-flows'
              : undefined;
            const cardHref = isUrlFirstDraft ? '/my' : internalReviewHref;
            const cardLabel = isUrlFirstDraft
              ? '내 Flow에서 수정'
              : internalReviewHref
                ? '검토 재고 열기'
                : undefined;
            return (
              <div
                key={bundle.flow.id}
                data-testid="creator-profile-content-card"
                data-flow-origin={isUrlFirstDraft ? 'url-first-draft' : undefined}
                data-flow-status={bundle.flow.status}
                data-source-status={bundle.flow.source_status ?? 'unclassified'}
                data-exposure-status={normalizeExecutionModel(bundle).exposureStatus}
                data-public-indexable={getPublicFlowIndexingPolicy(bundle).indexable ? 'true' : 'false'}
              >
                <FlowCard
                  bundle={bundle}
                  variant={canShowReviewInventory ? 'default' : 'profile'}
                  primaryHref={cardHref}
                  primaryLabel={cardLabel}
                  primaryTestId={isUrlFirstDraft ? 'creator-profile-draft-edit-link' : undefined}
                  titleHref={cardHref}
                />
              </div>
            );
          })}
        </div>
        {hiddenCreatorBundleCount > 0 ? (
          <button
            type="button"
            data-testid="creator-profile-content-more"
            className="mt-4 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:border-blue-300 hover:text-blue-700"
            onClick={() => setVisibleContentLimit((current) => current + CREATOR_PROFILE_PAGE_SIZE)}
          >
            콘텐츠 더 보기 · {hiddenCreatorBundleCount}개 남음
          </button>
        ) : null}
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
            <h2 className="text-xl font-semibold">{toContentDisplayTitle(draft.flow.title)}</h2>
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
          <h1 className="mt-1 text-3xl font-semibold">{toContentDisplayTitle(bundle.flow.title)}</h1>
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
  const showPublicSaveAction = !showExportFirstHero;
  const showMobileExportActions = showMobileActions && !compactJeonsePage && !showPublicSaveAction;
  const primaryDestination = inferPrimaryDestination(bundle);
  const publicHeroInput = isUserScheduledExactVideo(bundle) ? '시작일과 반복 요일' : getAnchorLabel(bundle);
  const publicHeroArtifact = getCatalogDestinationLabel(bundle);
  const publicHeroPromise = isUserScheduledExactVideo(bundle)
    ? `시작일과 요일을 고르면 저장됩니다: ${publicHeroArtifact}`
    : getCatalogPromiseText(publicHeroInput, publicHeroArtifact);
  const publicHeroFirstTask = getCatalogFirstTask(getFlowPreviewStepTitles(bundle), getCatalogReason(bundle));
  const showPublicHeroSetup =
    !showExportFirstHero &&
    (
      isUserScheduledExactVideo(bundle) ||
      (!showTodayExecution && (publicHeroSetupFlowSlugs.has(bundle.flow.slug) || bundle.flow.anchor_type === 'none'))
    );
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
      ...(bundle.flow.structure_type === 'routine' ? { weekdays: weekdaySelection } : {}),
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE4E0] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(23,32,28,0.08)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto flex max-w-xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#8A857B]">{savedFlowAt ? '저장됨' : '공유 콘텐츠'}</p>
            <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicDisplayTitle}</p>
          </div>
          {savedFlowAt ? (
            <Link className="shrink-0 rounded-md bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" href="/my">
              내 Flow에서 보기
            </Link>
          ) : (
            <button className="shrink-0 rounded-md bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" type="button" onClick={saveToMyFlow}>
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
        <div data-testid="public-flow-primary-setup" className="rounded-lg border border-[#DDE4E0] bg-white px-3 py-2.5">
          <p className="text-[11px] font-semibold text-[#8A857B]">필요한 입력</p>
          <p className="mt-1 text-sm font-semibold text-[#1B1A17]">입력 없이 바로 확인합니다.</p>
        </div>
      );
    }
    return (
      <div data-testid="public-flow-primary-setup" className="rounded-lg border border-[#DDE4E0] bg-white px-3 py-3">
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
    <main className={`min-h-screen bg-[#F5F7F6] px-4 text-slate-950 md:px-8 ${publicMobileClearanceClass}`}>
      {renderPublicMobileSaveCta()}
      <div className="mx-auto max-w-[1240px]">
        <PublicFlowShareShell savedFlowAt={savedFlowAt} />

        <header data-testid="public-flow-hero" className={compactJeonsePage ? 'border-b border-[#DDE4E0] pb-5 pt-1 md:pb-6' : 'border-b border-[#DDE4E0] pb-7 pt-2 md:pb-9 md:pt-4'}>
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
          {bundle.flow.description ? <p className={compactJeonsePage ? 'mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base md:leading-7' : 'mt-4 max-w-3xl text-sm leading-6 text-slate-600 md:text-base md:leading-7'}>{bundle.flow.description}</p> : null}
          <div data-testid="public-flow-creator-attribution" className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#66706B]">
            <Link className="font-semibold text-[#1B1A17] underline-offset-2 hover:text-[#3654FF] hover:underline" href={getCreatorPath(bundle)}>
              by {getCreatorName(bundle)}
            </Link>
            <span aria-hidden="true">·</span>
            <span>원문 기준 실행본</span>
          </div>
          {showPublicHeroSetup ? (
            <section className="mt-5 border-y border-[#DDE4E0] py-4">
              <p data-testid="public-flow-result-promise" className="break-keep text-sm font-semibold leading-6 text-[#3654FF]">{publicHeroPromise}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.72fr)] md:items-stretch">
                {renderPublicHeroSetup()}
                <div data-testid="public-flow-first-action-preview" className="px-1 py-2.5 md:flex md:flex-col md:justify-center md:border-l md:border-[#DDE4E0] md:pl-5">
                  <p className="text-[11px] font-semibold text-[#8A857B]">먼저 할 일</p>
                  <p className="mt-1 line-clamp-2 break-keep text-sm font-semibold text-[#1B1A17]">{publicHeroFirstTask}</p>
                </div>
              </div>
              {showPublicSaveAction ? <div className="mt-3">{renderPublicSaveActions()}</div> : null}
            </section>
          ) : (
            <section className="mt-5 border-y border-[#DDE4E0] py-4">
              <p data-testid="public-flow-result-promise" className="break-keep text-sm font-semibold leading-6 text-[#3654FF]">{publicHeroPromise}</p>
              <div className="mt-3 grid gap-1 sm:grid-cols-3 sm:divide-x sm:divide-[#DDE4E0]">
                <div className="px-1 py-2 sm:px-4">
                  <p className="text-[11px] font-semibold text-[#8A857B]">입력</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicHeroInput}</p>
                </div>
                <div className="px-1 py-2 sm:px-4">
                  <p className="text-[11px] font-semibold text-[#8A857B]">저장 결과</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicHeroArtifact}</p>
                </div>
                <div data-testid="public-flow-first-action-preview" className="px-1 py-2 sm:px-4">
                  <p className="text-[11px] font-semibold text-[#8A857B]">먼저 할 일</p>
                  <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicHeroFirstTask}</p>
                </div>
              </div>
            </section>
          )}
          {compactJeonsePage ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">D-3 / D-Day / D+1</span>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">7개 체크</span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                출처 확인됨
              </span>
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
        <div data-testid="flow-desktop-workbench-layout" className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <div className={showMobileWorkbenchFirst ? 'flex min-w-0 flex-col xl:block' : 'min-w-0'}>
            <div className={showMobileWorkbenchFirst ? 'order-3 xl:hidden' : 'xl:hidden'}>
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
              />
            ) : null}

            <div className={showMobileWorkbenchFirst ? 'order-2 xl:contents' : undefined}>{renderSetupSection()}</div>
            <div className={showMobileWorkbenchFirst ? 'order-1 xl:contents' : undefined}>{renderArtifactWorkbench()}</div>
          </div>
          <aside data-testid="flow-desktop-rail" className="hidden space-y-4 xl:sticky xl:top-6 xl:block">
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
              <span className="font-semibold">진행 상황은 이 브라우저에 자동 저장됩니다.</span> 다른 기기에서 이어서 보려면 저장 후 내 Flow의 데이터 관리에서 백업 파일을 받아두세요.
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
          <section className="my-5 rounded-lg border border-[#DDE4E0] bg-white p-4 shadow-[0_1px_0_rgba(27,26,23,0.03)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#8A857B]">제작자 정보</p>
                <p className="mt-1 text-sm font-semibold text-[#1B1A17]">{getCreatorName(bundle)}</p>
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
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#DDE4E0] bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_28px_rgba(23,32,28,0.08)] backdrop-blur transition duration-200 md:hidden ${showMobileExportActions ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}
      >
          <div className="mx-auto max-w-xl">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-[#8A857B]">
                  저장 전 미리보기 · {done > 0 ? `${done}개 미리 선택` : `${executableCount}개 항목`}
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-[#1B1A17]">{publicDisplayTitle}</p>
              </div>
              {savedFlowAt ? (
                <Link className="shrink-0 rounded-md bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm" href="/my">
                  내 Flow에서 보기
                </Link>
              ) : (
                <button
                  type="button"
                  className="shrink-0 rounded-md bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm"
                  onClick={saveToMyFlow}
                >
                  내 Flow에 저장
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
      className="mb-5 flex min-h-14 items-center justify-between gap-3 border-b border-[#DDE4E0] py-3 md:mb-7"
    >
      <Link className="inline-flex min-h-9 items-center text-lg font-semibold tracking-tight text-[#1B1A17]" href="/">
        FLOW
      </Link>
      {savedFlowAt ? (
        <Link className="inline-flex min-h-9 items-center rounded-md border border-[#DDE4E0] bg-white px-3 text-sm font-semibold text-[#59625E] hover:border-[#3654FF]/40 hover:text-[#3654FF]" href="/my">
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
}) {
  const previewEntries = getExportFirstPreviewEntries(bundle, displayAnchor);
  const remainingCount = Math.max(getScheduleEntries(bundle, displayAnchor).length - previewEntries.length, 0);

  return (
    <section aria-label="Export-first flow hero" className="my-7 border-b border-[#DDE4E0] pb-7">
      <div className="grid gap-6 md:grid-cols-[1.12fr_0.88fr] md:items-start md:gap-8">
        <div>
          <p className="text-sm font-semibold text-[#3654FF]">저장 전 일정 확인</p>
          <h2 className="mt-1 text-xl font-bold tracking-normal text-[#1B1A17] md:text-2xl">이사일을 정하면 할 일 날짜가 맞춰집니다</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#66706B]">먼저 중요한 날짜만 확인하고, 저장 후 내 Flow에서 각 할 일을 다시 조정할 수 있습니다.</p>

          <div className="mt-5 border-y border-[#DDE4E0] py-4">
            <p className="text-sm font-semibold text-[#4A4842]">이렇게 일정이 잡혀요</p>
            <div className="mt-3 divide-y divide-[#E5EAE7]">
              {previewEntries.map((entry) => (
                <div key={entry.id} className="grid grid-cols-[3.2rem_5.8rem_minmax(0,1fr)] items-baseline gap-2 py-2 text-sm first:pt-0 last:pb-0">
                  <span className="font-semibold text-[#6E6B64]">{entry.timing}</span>
                  <span className="font-medium text-[#6E6B64]">{formatKoreanShortDate(entry.startDate)}</span>
                  <span className="min-w-0 text-[#1B1A17]">{entry.title}</span>
                </div>
              ))}
            </div>
            {remainingCount > 0 ? <p className="mt-3 text-xs font-medium text-[#6E6B64]">+ 나머지 {remainingCount}개 항목</p> : null}
          </div>
        </div>

        <div className="border-t border-[#DDE4E0] pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
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
              <div className="rounded-lg border border-[#CFE8DA] bg-[#EAF7F0] p-3 text-sm text-[#1B1A17]">
                <p className="font-semibold">내 Flow에 담았어요</p>
                <p className="mt-1 text-xs leading-5 text-[#1F8A5B]">이제 FLOW 안에서 체크하거나 외부 도구로도 보낼 수 있습니다.</p>
              </div>
            ) : null}
            {savedFlowAt ? (
              <Link
                className="mt-3 flex w-full items-center justify-center rounded-md bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8]"
                href="/my"
              >
                내 Flow에서 보기
              </Link>
            ) : (
              <button
                type="button"
                className="w-full rounded-md bg-[#3654FF] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8]"
                onClick={onSaveToMyFlow}
              >
                내 Flow에 저장
              </button>
            )}
            <p className="mt-3 text-center text-xs leading-5 text-[#737B77]">파일로 가져가기는 실행 미리보기 아래에서 선택할 수 있어요.</p>
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
        ? '저장 전에는 필요한 행을 미리 표시해 볼 수 있어요. 실제 완료 관리는 내 Flow에 저장한 뒤 이어집니다.'
        : '저장 전에는 필요한 항목을 미리 표시해 볼 수 있어요. 실제 완료 관리는 내 Flow에 저장한 뒤 이어집니다.';
    return <div className="rounded-md bg-gray-50 p-4 text-sm text-gray-600">{noAnchorInstruction}</div>;
  }

  const label = getAnchorInputLabel(bundle);
  const anchorDate = anchor ? new Date(anchor) : null;
  const today = new Date();
  const daysUntil = anchorDate && !Number.isNaN(anchorDate.getTime())
    ? Math.ceil((anchorDate.getTime() - new Date(formatLocalDate(today)).getTime()) / 86400000)
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
          <div data-testid="public-flow-anchor-action-row" className="flex gap-2">
            <input
              data-testid="public-flow-anchor-input"
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
        <div data-testid="public-flow-anchor-action-row" className="flex flex-wrap gap-2">
          <input
            data-testid="public-flow-anchor-input"
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
                  onChange={() => {
                    const nextWeekdays = weekdays.includes(day)
                      ? weekdays.filter((value) => value !== day)
                      : [...weekdays, day];
                    onWeekdaysChange(nextWeekdays.length > 0 ? nextWeekdays : weekdays);
                  }}
                />
                {day}
              </label>
            ))}
          </div>
          {bundle.flow.tags?.includes('schedule-user-choice') ? (
            <p className="mt-2 text-xs font-medium leading-5 text-slate-600">
              체크된 요일은 원문이 정한 운동 처방이 아니라 내 캘린더에 저장할 일정입니다. 저장 전에 직접 바꿀 수 있어요.
            </p>
          ) : null}
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
    title: '식사 체크표에 넣어둔 적용 기준',
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

function isUserScheduledExactVideo(bundle: FlowBundle): boolean {
  return Boolean(bundle.flow.tags?.includes('exact-video') && bundle.flow.tags?.includes('schedule-user-choice'));
}

function getExactVideoToolCopy(bundle: FlowBundle, destination: PrimaryDestination): ReturnType<typeof getEmbeddedToolCopy> {
  if (destination === 'calendar' && isUserScheduledExactVideo(bundle)) {
    return {
      title: '내가 고른 요일의 운동 캘린더',
      description: '원본 영상은 그대로 열고, 반복 요일은 영상의 처방이 아니라 내 캘린더에 저장할 일정으로 직접 고릅니다.',
      rhythm: '요일 직접 선택',
      tool: '캘린더',
      previewTitle: '선택한 요일 미리보기',
      scheduleLabel: '영상 실행',
    };
  }

  if (destination === 'hybrid' && workoutProgrammingExactVideoSlugs.has(bundle.flow.slug)) {
    return {
      title: '이번 주에 적용할 운동 기준',
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
      title: '오늘 한 끼 적용하기',
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
  if (bundle.flow.content_type === 'meal_plan') return formatLocalDate(today);
  if (bundle.flow.category.includes('결혼')) return formatDate(addDays(today, 180));
  if (bundle.flow.category.includes('이사')) return formatDate(addDays(today, 30));
  if (bundle.flow.category.includes('여행')) return formatDate(addDays(today, 14));
  if (bundle.flow.structure_type === 'routine') return formatDate(nextMonday(today));
  return formatLocalDate(today);
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

function isUrlFirstStartExcludedItemState(itemStates: Record<string, FlowItemState>, id: string): boolean {
  const state = itemStates[baseStateId(id)];
  return Boolean(state?.skipped && state.note === 'excluded_on_start');
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
  const personalMemoDraft = isPersonalMemoDraftBundle(bundle);
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
        timing: personalMemoDraft && item.day_offset === 0 ? '첫 할 일 날짜' : timingLabel(item.day_offset, item.duration_days),
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
    const startDate = anchor || formatLocalDate(nextMonday(new Date()));
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
                            <input aria-label={getPublicPreSavePreviewCheckboxLabel(entry.title)} className="mt-0.5" type="checkbox" checked={Boolean(checks[entry.id])} onChange={() => onToggle(entry.id)} />
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
                            <input aria-label={getPublicPreSavePreviewCheckboxLabel(entry.title)} className="mt-0.5" type="checkbox" checked={Boolean(checks[entry.id])} onChange={() => onToggle(entry.id)} />
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
  const why = stripUserFacingInternalLines(detail?.why);
  const how = stripUserFacingInternalLines(detail?.how);
  const completionCriteria = stripUserFacingInternalLines(visibleCompletionCriteria(detail));
  const caution = stripUserFacingInternalLines(detail?.caution);
  const links = detail?.links ?? [];
  if (!why && !how && !completionCriteria && !caution && !links.length) {
    return null;
  }

  return (
    <div className="mt-3 rounded-md border border-gray-100 bg-[#FAFAF8] p-3 text-sm">
      <div className="grid gap-3 text-gray-700 md:grid-cols-2">
        {why ? (
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-gray-500"><span aria-hidden="true">?</span> 왜 필요한가</p>
            <p className="mt-1 whitespace-pre-line leading-6">{why}</p>
          </div>
        ) : null}
        {how ? (
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-gray-500"><span aria-hidden="true">→</span> 어떻게 하나요</p>
            <p className="mt-1 whitespace-pre-line leading-6">{how}</p>
          </div>
        ) : null}
        {completionCriteria ? (
          <div>
            <p className="flex items-center gap-1 text-xs font-semibold text-gray-500"><span aria-hidden="true">✓</span> 완료 조건</p>
            <p className="mt-1 whitespace-pre-line leading-6">{completionCriteria}</p>
          </div>
        ) : null}
        {caution ? (
          <div className="text-amber-800">
            <p className="flex items-center gap-1 text-xs font-semibold"><span aria-hidden="true">!</span> 주의</p>
            <p className="mt-1 whitespace-pre-line leading-6">{caution}</p>
          </div>
        ) : null}
        {links.length ? (
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-gray-500">바로가기</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {links.map((link) => (
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
  const text = [detail?.why, detail?.how, detail?.caution]
    .map((value) => stripUserFacingInternalLines(value))
    .find(Boolean);
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
          aria-label={getPublicPreSavePreviewCheckboxLabel(item.title)}
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
  if (getSourceFitAudit(bundle.flow.slug)?.decision === 'keep_representative') return true;

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
                <input aria-label={getPublicPreSavePreviewCheckboxLabel(entry.title)} className="mt-1" type="checkbox" checked={isBaseEntryChecked(bundle, entry.id, anchor, checks)} onChange={() => onToggle(entry.id)} />
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
                <p className="mt-2 text-xs text-gray-500">{formatPublicPreSavePreviewProgress(done, total)}</p>
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
                    <input aria-label={getPublicPreSavePreviewCheckboxLabel(slot.menu_title)} className="mt-1" type="checkbox" checked={isBaseEntryChecked(bundle, slot.id, anchor, checks)} onChange={() => onToggle(slot.id)} />
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
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">일정 기준: {copy.rhythm}</span>
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
              <p className="mt-1 text-sm text-gray-600">
                {isUserScheduledExactVideo(bundle)
                  ? '현재 체크된 요일을 확인하고 내 일정에 맞게 바꿉니다.'
                  : '미리 들어간 내용을 보고 시작일과 요일만 바꿉니다.'}
              </p>
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
            <input aria-label={getPublicPreSavePreviewCheckboxLabel(item.title)} className="mt-1" type="checkbox" checked={Boolean(checks[item.id])} onChange={() => onToggle(item.id)} />
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-gray-950">{item.title}</span>
              <DetailPreview detail={detail} />
            </span>
          </label>
          <details data-testid="exact-video-execution-detail" className="group mt-3 border-t border-gray-200 pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-700">
              <span>실행 기준 보기</span>
              <span aria-hidden="true" className="text-xs text-gray-500">
                <span className="group-open:hidden">펼치기</span>
                <span className="hidden group-open:inline">접기</span>
              </span>
            </summary>
            <div className="mt-3">
              <ItemDetailContent detail={detail} />
            </div>
          </details>
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
