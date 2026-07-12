'use client';

import { useEffect, useState } from 'react';
import { getArtifactPlan } from '@/lib/flow/artifact-plan';
import {
  getComparisonConfig,
  getComparisonRows,
  getHoldMemoFields,
  getLogTables,
  getMemoCardFields,
  type ArtifactComparisonRow,
  type ArtifactLogTable,
  type ArtifactMemoField,
} from '@/lib/flow/artifact-fields';
import { addDays, formatDate, formatKoreanShortDate, getRangeEnd } from '@/lib/flow/date';
import { toContentDisplayTitle, toUserFacingSourceTitle } from '@/lib/flow/display-title';
import { FLOW_EXPORT_LABELS } from '@/lib/flow/export-labels';
import { timingLabel } from '@/lib/flow/parser';
import type { FlowBundle, FlowComparisonState, FlowItem, FlowItemState, FlowWorkbenchState } from '@/lib/flow/types';
import { stripUserFacingInternalLines } from '@/lib/flow/user-surface-guardrails';

type ArtifactWorkbenchProps = {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  comparisonState: FlowComparisonState;
  onComparisonChange: (state: FlowComparisonState) => void;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
};

type ArtifactExportActions = {
  done: number;
  canExportCalendar: boolean;
  copyState: string;
  downloadState: string;
  calendarState: string;
  onCopyText: () => void;
  onDownloadExcel: () => void;
  onDownloadCalendar: () => void;
  onCopyToEditableDraft: () => void;
};

type ArtifactExportActionKind = 'copy' | 'excel' | 'calendar' | 'draft';
type ArtifactExportLabels = Partial<Record<ArtifactExportActionKind, string>>;
type MobileArtifactKind = 'execution_list' | 'month_calendar' | 'log_table' | 'spreadsheet_log' | 'comparison_table';
type WorkbenchItemDetail = NonNullable<FlowBundle['itemDetails']>[number];
type WorkbenchRecipe = NonNullable<FlowBundle['recipes']>[number];

type ScheduleRow = {
  id: string;
  title: string;
  section: string;
  timing: string;
  startDate: string;
  endDate?: string;
};

type RoutineOccurrence = {
  date: string;
  weekday: string;
  sessionIndex: number;
};

const defaultComparisonCandidates = [
  { id: 'candidate-1', name: '후보 A' },
  { id: 'candidate-2', name: '후보 B' },
];

const weekdayOrder = ['일', '월', '화', '수', '목', '금', '토'];
const routineGridWeekdayOrder = ['월', '화', '수', '목', '금', '토', '일'];

const mealReactionColumns = [
  { id: 'amount', label: '먹은 양', placeholder: '예: 40ml, 3숟갈' },
  { id: 'skin', label: '피부 반응', placeholder: '예: 발진 없음' },
  { id: 'vomitingOrDiarrhea', label: '구토/설사', placeholder: '예: 없음' },
  { id: 'stool', label: '변 상태', placeholder: '예: 평소와 같음' },
  { id: 'sleep', label: '수면/컨디션', placeholder: '예: 평소와 같음' },
  { id: 'preferenceNote', label: '거부/선호 메모', placeholder: '예: 두 숟갈 후 거부' },
];

const defaultSpreadsheetColumns = ['식단', '운동', '측정', '컨디션', '리뷰'];
const dietObservationColumns = ['식사 관찰', '활동', '수면/측정', '컨디션', '중단/상담 조건'];
const fridgeCleanoutColumns = ['우선 재료', '메뉴 후보', '장보기 보류', '상태', '메모'];

const mobileArtifactCtaSlugs = new Set(['moving-d30-basic', 'computer-skills-d30-study', 'diet-habit-2week', 'new-car-delivery-check', 'fridge-cleanout-weekly-plan']);
const mealCalendarOnlySlugs = new Set(['baby-food-menu-recipe']);
const checkOnlyRoutineSlugs = new Set([
  'diet-habit-2week',
  'real-thankyou-bubu-home-workout-starter',
  'real-fitvely-diet-record-routine',
  'curated-allblanc-morning-workout',
  'curated-allblanc-no-jump-cardio',
  'curated-allblanc-lower-body',
]);
const maintenanceRoutineSlugs = new Set(['washer-tub-clean-monthly', 'monstera-care-routine']);
const FLOWME_SURFACE_CARD_CLASS = 'rounded-2xl border border-[#E7E4DD] bg-white p-4 shadow-[0_1px_0_rgba(27,26,23,0.03)]';
const FLOWME_WORKBENCH_CARD_CLASS = `${FLOWME_SURFACE_CARD_CLASS} md:p-5`;
const FLOWME_PANEL_CARD_CLASS = 'rounded-2xl border border-[#E7E4DD] bg-[#FAFAF8] p-4';
const FLOWME_INNER_ROW_CLASS = 'rounded-xl border border-[#E7E4DD] bg-white px-3 py-2 text-sm shadow-[0_1px_0_rgba(27,26,23,0.03)]';
const FLOWME_EYEBROW_CLASS = 'text-sm font-semibold text-[#3654FF]';
const FLOWME_TITLE_CLASS = 'text-base font-semibold text-[#1B1A17]';
const FLOWME_PROGRESS_CHIP_CLASS = 'rounded-full border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-1 text-xs font-semibold text-[#6E6B64]';
const FLOWME_BUTTON_PRIMARY_CLASS = 'rounded-xl bg-[#3654FF] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#2945E8] disabled:bg-[#C9C6BE]';
const FLOWME_BUTTON_SECONDARY_CLASS = 'rounded-xl border border-[#D8D5CD] bg-white px-3 py-2 text-sm font-semibold text-[#1B1A17] hover:border-[#3654FF]/40 hover:text-[#3654FF] disabled:border-[#E7E4DD] disabled:text-[#A7A39A]';
const FLOWME_DISCLOSURE_CLASS = 'mt-2 rounded-xl border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-2 text-sm';
const FLOWME_SUPPORT_CARD_CLASS = 'rounded-2xl border border-[#E7E4DD] bg-[#FAFAF8] p-4';
const FLOWME_COMPACT_SUPPORT_CARD_CLASS = 'rounded-2xl border border-[#E7E4DD] bg-[#FAFAF8] p-3';
const FLOWME_TABLE_CARD_CLASS = 'overflow-x-auto rounded-2xl border border-[#E7E4DD] bg-white shadow-[0_1px_0_rgba(27,26,23,0.03)]';
const FLOWME_TABLE_HEADER_CLASS = 'border-b border-[#E7E4DD] px-3 py-3';
const FLOWME_TABLE_HEAD_CLASS = 'bg-[#FAFAF8] text-xs font-semibold text-[#6E6B64]';
const FLOWME_INPUT_CLASS = 'rounded-xl border border-[#D8D5CD] bg-white px-3 py-2 text-sm text-[#1B1A17] outline-none focus:border-[#3654FF] focus:ring-2 focus:ring-[#3654FF]/15';
const FLOWME_SMALL_INPUT_CLASS = 'rounded-xl border border-[#D8D5CD] bg-white px-2 py-1.5 text-sm text-[#1B1A17] outline-none focus:border-[#3654FF] focus:ring-2 focus:ring-[#3654FF]/15';
const FLOWME_CHECKBOX_CLASS = 'h-4 w-4 rounded border-[#D8D5CD] text-[#3654FF]';
const FLOWME_SMALL_CHECKBOX_CLASS = 'h-3 w-3 rounded border-[#D8D5CD] text-[#3654FF]';
const FLOWME_LINK_BUTTON_CLASS = 'shrink-0 rounded-xl border border-[#D8D5CD] bg-white px-3 py-1.5 text-xs font-semibold text-[#3654FF] hover:border-[#3654FF]/40';
const FLOWME_SUCCESS_CARD_CLASS = 'rounded-2xl border border-[#E7E4DD] bg-[#EAF7F0] p-4';
const FLOWME_WARNING_CARD_CLASS = 'rounded-2xl border border-[#F0D8AE] bg-[#FFF7E8] p-3';

function getPreSavePreviewCheckboxLabel(label: string) {
  return `저장 전 미리보기 선택: ${label}`;
}

function formatPreSavePreviewProgress(done: number, total: number) {
  return `미리보기 ${done}/${total} 표시`;
}

function getPreSavePreviewTextClass(selected: boolean, base = 'text-[#1B1A17]') {
  return selected ? 'text-[#3654FF]' : base;
}

export function ArtifactWorkbench({
  bundle,
  anchor,
  weekdays,
  checks,
  itemStates,
  comparisonState,
  onComparisonChange,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: ArtifactWorkbenchProps) {
  const plan = getArtifactPlan(bundle);
  const total = getExecutableItems(bundle).filter((item) => !itemStates[item.id]?.skipped).length;
  const done = getExecutableItems(bundle).filter((item) => checks[item.id]).length;
  const isJeonsePrecheck = bundle.flow.slug === 'jeonse-contract-precheck-docs';

  return (
    <section aria-label="Flow artifact workbench" className={isJeonsePrecheck ? `my-4 ${FLOWME_WORKBENCH_CARD_CLASS}` : `my-6 ${FLOWME_WORKBENCH_CARD_CLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={FLOWME_EYEBROW_CLASS}>{isJeonsePrecheck ? '계약 일정' : '내 실행판'}</p>
          <h2 className={isJeonsePrecheck ? 'mt-1 text-xl font-bold tracking-normal text-[#1B1A17] md:text-2xl' : 'mt-1 text-2xl font-bold tracking-normal text-[#1B1A17]'}>{surfaceTitle(plan.primarySurface, bundle)}</h2>
          {isJeonsePrecheck ? null : <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6E6B64]">{surfaceDescription(plan.primarySurface, bundle)}</p>}
        </div>
        <span className={FLOWME_PROGRESS_CHIP_CLASS}>
          {formatPreSavePreviewProgress(done, total)}
        </span>
      </div>
      <FlowLevelExportPanel actions={exportActions} bundle={bundle} />
      <div className={isJeonsePrecheck ? 'mt-4' : 'mt-5'}>
        {plan.primarySurface === 'decision_table' ? (
          <DecisionWorkbench
            bundle={bundle}
            checks={checks}
            comparisonState={comparisonState}
            onComparisonChange={onComparisonChange}
            workbenchState={workbenchState}
            onWorkbenchChange={onWorkbenchChange}
            onToggleItem={onToggleItem}
            exportActions={exportActions}
          />
        ) : plan.primarySurface === 'routine_calendar' ? (
          <RoutineWorkbench
            bundle={bundle}
            anchor={anchor}
            weekdays={weekdays}
            checks={checks}
            workbenchState={workbenchState}
            onWorkbenchChange={onWorkbenchChange}
            onToggleItem={onToggleItem}
            exportActions={exportActions}
          />
        ) : plan.primarySurface === 'spreadsheet_log' ? (
          <SpreadsheetWorkbench bundle={bundle} anchor={anchor} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} exportActions={exportActions} />
        ) : plan.primarySurface === 'meal_reaction_log' ? (
          <MealReactionWorkbench
            bundle={bundle}
            anchor={anchor}
            checks={checks}
            workbenchState={workbenchState}
            onWorkbenchChange={onWorkbenchChange}
            onToggleItem={onToggleItem}
            exportActions={exportActions}
          />
        ) : plan.primarySurface === 'timeline_calendar' ? (
          <TimelineWorkbench
            bundle={bundle}
            anchor={anchor}
            checks={checks}
            comparisonState={comparisonState}
            onComparisonChange={onComparisonChange}
            workbenchState={workbenchState}
            onWorkbenchChange={onWorkbenchChange}
            onToggleItem={onToggleItem}
            exportActions={exportActions}
          />
        ) : plan.primarySurface === 'memo_card' ? (
          <MemoCardWorkbench bundle={bundle} checks={checks} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} onToggleItem={onToggleItem} exportActions={exportActions} />
        ) : plan.primarySurface === 'step_progress' ? (
          <StepProgressWorkbench bundle={bundle} checks={checks} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} onToggleItem={onToggleItem} exportActions={exportActions} />
        ) : (
          <ChecklistWorkbench
            bundle={bundle}
            anchor={anchor}
            checks={checks}
            workbenchState={workbenchState}
            onWorkbenchChange={onWorkbenchChange}
            onToggleItem={onToggleItem}
            exportActions={exportActions}
          />
        )}
      </div>
    </section>
  );
}

function FlowLevelExportPanel({ actions, bundle }: { actions?: ArtifactExportActions; bundle: FlowBundle }) {
  if (!actions) return null;

  const displayTitle = toContentDisplayTitle(bundle.flow.title);

  return (
    <section
      data-testid="public-flow-export-secondary-entry"
      className="mt-4 rounded-2xl border border-[#E7E4DD] bg-[#FAFAF8] p-3 sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#8A857B]">파일로 가져가기</p>
          <h3 className="mt-1 text-base font-semibold text-[#1B1A17]">이 Flow 통째로 가져가기</h3>
          <p className="mt-1 max-w-xl break-keep text-sm leading-6 text-[#6E6B64]">
            저장하지 않고 캘린더·시트·메모 형식으로 받을 수 있어요.
          </p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-3">
          {actions.canExportCalendar ? (
            <button
              type="button"
              data-testid="public-flow-export-format-option"
              className={FLOWME_BUTTON_SECONDARY_CLASS}
              aria-label={`${FLOW_EXPORT_LABELS.calendarFile}: ${displayTitle}`}
              onClick={actions.onDownloadCalendar}
            >
              {FLOW_EXPORT_LABELS.calendarFile}
            </button>
          ) : null}
          <button
            type="button"
            data-testid="public-flow-export-format-option"
            className={FLOWME_BUTTON_SECONDARY_CLASS}
            aria-label={`${FLOW_EXPORT_LABELS.sheetFile}: ${displayTitle}`}
            onClick={actions.onDownloadExcel}
          >
            {FLOW_EXPORT_LABELS.sheetFile}
          </button>
          <button
            type="button"
            data-testid="public-flow-export-format-option"
            className={FLOWME_BUTTON_SECONDARY_CLASS}
            aria-label={`${FLOW_EXPORT_LABELS.memoCopy}: ${displayTitle}`}
            onClick={actions.onCopyText}
          >
            {FLOW_EXPORT_LABELS.memoCopy}
          </button>
        </div>
      </div>
      <ArtifactExportStatus actions={actions} />
    </section>
  );
}

function ArtifactExportButtons({ actions, kinds, labels = {}, mobileArtifactLabel, mobileKinds }: { actions?: ArtifactExportActions; kinds: ArtifactExportActionKind[]; labels?: ArtifactExportLabels; mobileArtifactLabel?: string; mobileKinds?: ArtifactExportActionKind[] }) {
  if (!actions) return null;

  const disabled = actions.done === 0;
  const mobileExportKinds: ArtifactExportActionKind[] = [];
  const disabledTitle = disabled ? '항목을 하나라도 체크하면 받을 수 있어요' : undefined;

  return (
    <>
    <div className="hidden flex-wrap gap-2 sm:flex">
      {kinds.map((kind) => {
        if (kind === 'copy') {
          return (
            <button key={kind} className={FLOWME_BUTTON_PRIMARY_CLASS} disabled={disabled} title={disabledTitle} onClick={actions.onCopyText}>
              {labels.copy ?? FLOW_EXPORT_LABELS.checklistCopy}
            </button>
          );
        }
        if (kind === 'excel') {
          return (
            <button key={kind} className={FLOWME_BUTTON_SECONDARY_CLASS} disabled={disabled} title={disabledTitle} onClick={actions.onDownloadExcel}>
              {labels.excel ?? FLOW_EXPORT_LABELS.sheetFile}
            </button>
          );
        }
        if (kind === 'calendar' && actions.canExportCalendar) {
          return (
            <button key={kind} className={FLOWME_BUTTON_SECONDARY_CLASS} disabled={disabled} title={disabledTitle} onClick={actions.onDownloadCalendar}>
              {labels.calendar ?? FLOW_EXPORT_LABELS.calendarFile}
            </button>
          );
        }
        if (kind === 'draft') {
          return (
            <button key={kind} className={`${FLOWME_BUTTON_SECONDARY_CLASS} bg-[#FAFAF8]`} onClick={actions.onCopyToEditableDraft}>
              {labels.draft ?? FLOW_EXPORT_LABELS.editableDraft}
            </button>
          );
        }

        return null;
      })}
    </div>
    {mobileArtifactLabel && mobileExportKinds.length > 0 ? (
      <div className="mt-3 grid gap-2 sm:hidden">
        {mobileExportKinds.map((kind) => renderMobileArtifactExportButton(kind, actions, mobileArtifactLabel, disabled, disabledTitle))}
      </div>
    ) : null}
    </>
  );
}

function renderMobileArtifactExportButton(kind: ArtifactExportActionKind, actions: ArtifactExportActions, artifactLabel: string, disabled: boolean, disabledTitle?: string) {
  if (kind === 'calendar' && !actions.canExportCalendar) return null;

  const config = {
    copy: { label: `${artifactLabel} 복사`, aria: `${FLOW_EXPORT_LABELS.checklistCopy}: ${artifactLabel}`, onClick: actions.onCopyText, disabled },
    excel: { label: `${artifactLabel} 받기`, aria: `${FLOW_EXPORT_LABELS.sheetFile}: ${artifactLabel}`, onClick: actions.onDownloadExcel, disabled },
    calendar: { label: `${artifactLabel} 받기`, aria: `${FLOW_EXPORT_LABELS.calendarFile}: ${artifactLabel}`, onClick: actions.onDownloadCalendar, disabled },
    draft: { label: FLOW_EXPORT_LABELS.editableDraft, aria: `내 버전 만들기: ${artifactLabel}`, onClick: actions.onCopyToEditableDraft, disabled: false },
  }[kind];

  return (
    <button
      key={kind}
      data-testid={`mobile-artifact-export-${kind}`}
      aria-label={config.aria}
      className={`${FLOWME_BUTTON_SECONDARY_CLASS} w-full py-2.5`}
      disabled={config.disabled}
      title={config.disabled ? disabledTitle : undefined}
      type="button"
      onClick={config.onClick}
    >
      {config.label}
    </button>
  );
}

function getMobileArtifactLabel(bundle: FlowBundle, kind: MobileArtifactKind): string | undefined {
  if (!mobileArtifactCtaSlugs.has(bundle.flow.slug)) return undefined;
  if (kind === 'execution_list') return '실행 리스트';
  if (kind === 'month_calendar') return '월간 캘린더';
  if (kind === 'comparison_table') return bundle.flow.slug === 'new-car-delivery-check' ? '인수 증거표' : '비교표';
  if (kind === 'spreadsheet_log') {
    if (bundle.flow.slug === 'diet-habit-2week') return '관찰 기록표';
    if (bundle.flow.slug === 'fridge-cleanout-weekly-plan') return '재고 소진표';
    return '기록표';
  }
  if (kind === 'log_table') return bundle.flow.slug === 'computer-skills-d30-study' ? '공부 기록표' : '기록표';
  return undefined;
}

function ArtifactExportStatus({ actions }: { actions?: ArtifactExportActions }) {
  if (!actions || (!actions.copyState && !actions.downloadState && !actions.calendarState)) return null;

  return (
    <div className="mt-2 text-sm font-semibold text-[#3654FF]">
      {[actions.copyState, actions.downloadState, actions.calendarState].filter(Boolean).join(' · ')}
    </div>
  );
}

function surfaceTitle(surface: string, bundle: FlowBundle): string {
  if (bundle.flow.slug === 'jeonse-contract-precheck-docs') return 'D-3 / D-Day / D+1';
  if (surface === 'meal_reaction_log') return mealCalendarOnlySlugs.has(bundle.flow.slug) ? '식단표 + 레시피' : '식단표 + 반응 기록';
  if (surface === 'decision_table') return '후보 비교표';
  if (surface === 'routine_calendar') return maintenanceRoutineSlugs.has(bundle.flow.slug) ? '관리 캘린더' : '반복 캘린더';
  if (surface === 'spreadsheet_log') {
    if (bundle.flow.slug === 'water-purifier-filter-cycle') return '필터 주기표';
    if (bundle.flow.slug === 'fridge-cleanout-weekly-plan') return '7일 재고 소진표';
    return '기록표';
  }
  if (surface === 'timeline_calendar') return '월간 캘린더 + 실행 리스트';
  if (surface === 'memo_card') return '메모 카드';
  if (surface === 'step_progress') return '단계별 실행';
  return '실행 리스트';
}

function surfaceDescription(surface: string, bundle: FlowBundle): string {
  if (bundle.flow.slug === 'jeonse-contract-precheck-docs') return '캘린더에서 날짜를 고르고, 그날 필요한 체크만 확인합니다.';
  if (surface === 'meal_reaction_log') {
    return mealCalendarOnlySlugs.has(bundle.flow.slug)
      ? '시작일 기준 메뉴와 새 재료, 레시피 확인 순서를 먼저 봅니다.'
      : '시작일 기준 메뉴와 새 재료를 먼저 보고, 먹은 뒤 반응을 기록합니다.';
  }
  if (surface === 'decision_table') return '먼저 후보를 비교하고, 아래 체크리스트로 현장에서 확인할 일을 이어갑니다.';
  if (surface === 'routine_calendar') {
    return maintenanceRoutineSlugs.has(bundle.flow.slug)
      ? '시작일을 기준으로 다음 관리일을 만들고, 날짜 안에서 체크리스트를 확인합니다.'
      : '시작일과 반복 요일을 기준으로 회차가 달력에 박히는 모습을 먼저 보여줍니다.';
  }
  if (surface === 'spreadsheet_log') {
    if (bundle.flow.slug === 'water-purifier-filter-cycle') return '필터별 마지막 교체일, 다음 확인일, 상태 메모를 한 표로 관리합니다.';
    if (bundle.flow.slug === 'fridge-cleanout-weekly-plan') return '우선 재료, 메뉴 후보, 장보기 보류 상태를 7일 표로 관리합니다.';
    return '매일 남길 기록 열과 주간 리뷰 메모를 먼저 잡아둡니다.';
  }
  if (surface === 'timeline_calendar') return '해야 할 일을 리스트로 훑고, 같은 항목이 월간 달력에서 어느 날짜에 걸리는지 봅니다.';
  if (surface === 'memo_card') return '나중에 다시 참고할 기준과 결정 메모를 한 장으로 정리합니다.';
  if (surface === 'step_progress') return '단계 순서대로 확인하고, 지금 할 일과 다음 단계를 한눈에 봅니다.';
  return '저장 전에 필요한 항목을 미리 표시하고, 자세히에서 원문 기준과 확인 기준만 봅니다.';
}

function getWorkbenchItemDetail(bundle: FlowBundle, itemId: string): WorkbenchItemDetail | undefined {
  return bundle.itemDetails?.find((detail) => detail.item_id === itemId);
}

function WorkbenchDetailDisclosure({
  detail,
  showSourceLinks = true,
  suppressedCaution,
}: {
  detail?: WorkbenchItemDetail;
  showSourceLinks?: boolean;
  suppressedCaution?: string;
}) {
  if (!detail) return null;
  const visibleLinks = showSourceLinks ? detail.links ?? [] : [];
  const why = stripUserFacingInternalLines(detail.why);
  const how = stripUserFacingInternalLines(detail.how);
  const completionCriteria = stripUserFacingInternalLines(detail.completion_criteria);
  const caution = detail.caution && detail.caution !== suppressedCaution
    ? stripUserFacingInternalLines(detail.caution)
    : undefined;
  if (!why && !how && !completionCriteria && !caution && !visibleLinks.length) return null;

  return (
    <details className={FLOWME_DISCLOSURE_CLASS}>
      <summary className="cursor-pointer font-semibold text-[#3654FF]">자세히</summary>
      <div className="mt-2 space-y-2 leading-6 text-[#4A4842]">
        {how ? <p><b>실행:</b> {how}</p> : null}
        {completionCriteria ? <p><b>완료:</b> {completionCriteria}</p> : null}
        {why ? <p><b>이유:</b> {why}</p> : null}
        {caution ? <p className="text-amber-800"><b>주의:</b> {caution}</p> : null}
        {visibleLinks.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {visibleLinks.map((link) => (
              <a key={`${link.label}-${link.url}`} className="rounded-xl border border-[#D8D5CD] bg-white px-2 py-1 text-xs font-semibold text-[#6E6B64] hover:border-[#3654FF]/40 hover:text-[#3654FF]" href={link.url} target="_blank" rel="noreferrer">
                {toUserFacingSourceTitle(link.label)}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}

function getExecutableItems(bundle: FlowBundle): FlowItem[] {
  if (bundle.items.length) return bundle.items;
  return (bundle.mealSlots ?? []).map((slot) => ({
    id: slot.id,
    flow_id: slot.flow_id,
    section_id: slot.section_id,
    title: slot.menu_title,
    type: 'todo' as const,
    day_offset: slot.day_offset,
    duration_days: slot.duration_days,
    order: slot.order,
  }));
}

function getSectionTitle(bundle: FlowBundle, sectionId?: string): string {
  return bundle.sections.find((section) => section.id === sectionId)?.title ?? '';
}

function scheduleRows(bundle: FlowBundle, anchor: string): ScheduleRow[] {
  if (!anchor) return [];
  return getExecutableItems(bundle)
    .filter((item) => item.day_offset !== undefined)
    .map((item) => {
      const start = addDays(new Date(anchor), item.day_offset ?? 0);
      const end = item.duration_days && item.duration_days > 1 ? getRangeEnd(start, item.duration_days) : undefined;
      return {
        id: item.id,
        title: item.title,
        section: getSectionTitle(bundle, item.section_id),
        timing: timingLabel(item.day_offset, item.duration_days),
        startDate: formatDate(start),
        endDate: end ? formatDate(end) : undefined,
      };
    });
}

function TimelineWorkbench({
  bundle,
  anchor,
  checks,
  comparisonState,
  onComparisonChange,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  comparisonState: FlowComparisonState;
  onComparisonChange: (state: FlowComparisonState) => void;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const rows = scheduleRows(bundle, anchor);
  const comparisonConfig = getComparisonConfig(bundle);
  const logTables = getLogTables(bundle);
  const memoFields = getMemoCardFields(bundle);
  const shouldShowFullSourceTable = bundle.flow.slug === 'plank-30-day-challenge';
  const listLimit = shouldShowFullSourceTable ? Number.POSITIVE_INFINITY : 8;
  const listRows = rows.length
    ? rows.slice(0, listLimit)
    : getExecutableItems(bundle)
        .slice(0, listLimit)
        .map((item, index) => ({
          id: item.id,
          title: item.title,
          section: getSectionTitle(bundle, item.section_id),
          timing: item.day_offset !== undefined ? timingLabel(item.day_offset, item.duration_days) : `항목 ${index + 1}`,
          startDate: '',
        }));
  const month = rows[0]?.startDate.slice(0, 7) ?? anchor.slice(0, 7);

  return (
    <div className="space-y-4">
      {bundle.flow.slug === 'wedding-d180-basic' ? <WeddingSourceBridge sourceUrl={bundle.flow.source_url} /> : null}
      {bundle.flow.slug === 'plank-30-day-challenge' ? <PlankChallengeSourceBridge sourceUrl={bundle.flow.source_url} /> : null}
      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <MiniMonthCalendar title="월간 캘린더" eyebrow="캘린더" month={month} rows={rows} exportActions={exportActions} mobileArtifactLabel={getMobileArtifactLabel(bundle, 'month_calendar')} />
        <div data-testid="artifact-list-card" className={FLOWME_PANEL_CARD_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={FLOWME_EYEBROW_CLASS}>{shouldShowFullSourceTable ? '원문 표' : '체크리스트'}</p>
              <h3 className={FLOWME_TITLE_CLASS}>{shouldShowFullSourceTable ? '30일 실행표' : '실행 리스트'}</h3>
              {shouldShowFullSourceTable ? <p className="mt-1 text-xs font-medium text-[#6E6B64]">Day 1부터 Day 30까지 원문 순서를 모두 보여줍니다.</p> : null}
            </div>
            <ArtifactExportButtons
              actions={exportActions}
              kinds={logTables.length ? ['copy', 'draft'] : ['copy', 'excel', 'draft']}
              mobileArtifactLabel={getMobileArtifactLabel(bundle, 'execution_list')}
              mobileKinds={['excel']}
            />
          </div>
          <ArtifactExportStatus actions={exportActions} />
          <div className="mt-3 space-y-2">
            {listRows.map((row) => {
              const detail = getWorkbenchItemDetail(bundle, row.id);
              return (
                <div key={row.id} className={FLOWME_INNER_ROW_CLASS}>
                  <label className="grid grid-cols-[22px_92px_1fr] gap-3">
                    <input
                      aria-label={getPreSavePreviewCheckboxLabel(row.title)}
                      className="mt-0.5 h-4 w-4 rounded border-[#D8D5CD] text-[#3654FF]"
                      checked={Boolean(checks[row.id])}
                      onChange={() => onToggleItem(row.id)}
                      type="checkbox"
                    />
                    <span className="font-mono text-xs font-semibold text-[#3654FF]">{row.startDate ? `${row.timing} · ${row.startDate.slice(5)}` : row.timing}</span>
                    <span className={`font-medium ${getPreSavePreviewTextClass(Boolean(checks[row.id]))}`}>{row.title}</span>
                  </label>
                  <WorkbenchDetailDisclosure detail={detail} showSourceLinks={false} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {logTables.length ? (
        <div className="grid gap-4">
          {logTables.map((table, index) => (
            <LogTableCard
              key={table.id}
              table={table}
              workbenchState={workbenchState}
              onWorkbenchChange={onWorkbenchChange}
              exportActions={index === 0 ? exportActions : undefined}
              mobileArtifactLabel={index === 0 ? getMobileArtifactLabel(bundle, 'log_table') : undefined}
              mobileKinds={['excel']}
            />
          ))}
        </div>
      ) : null}
      {comparisonConfig || memoFields.length ? (
        <div className={`grid gap-4 ${comparisonConfig && memoFields.length ? 'lg:grid-cols-[1.15fr_0.85fr]' : ''}`}>
          {comparisonConfig ? (
            <ComparisonTable
              title={comparisonConfig.title}
              eyebrow={comparisonConfig.eyebrow}
              rows={comparisonConfig.rows}
              comparisonState={comparisonState}
              onComparisonChange={onComparisonChange}
            />
          ) : null}
          {memoFields.length ? <ProofMemoCard fields={memoFields} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function PlankChallengeSourceBridge({ sourceUrl }: { sourceUrl?: string }) {
  return (
    <div data-testid="plank-source-bridge" className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-emerald-700">원문에서 옮긴 실행표</p>
          <p className="mt-1 text-emerald-900">
            Day별 목표 초수를 시작일 기준 캘린더에 배치했습니다. 예: Day 1 20초, Day 7·19·27 휴식, Day 9 호흡 3:3 패턴, Day 30 150초.
          </p>
        </div>
        {sourceUrl ? (
          <a className="shrink-0 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-800" href={sourceUrl} target="_blank" rel="noreferrer">
            원문 보기
          </a>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-emerald-800">
        효과 설명은 보장으로 쓰지 않고, Flow에서는 오늘 목표·완료/조정 메모·중단 조건만 남깁니다. 통증이나 호흡 곤란이 있으면 완료보다 중단을 우선합니다.
      </p>
    </div>
  );
}

function WeddingSourceBridge({ sourceUrl }: { sourceUrl?: string }) {
  return (
    <div data-testid="wedding-source-bridge" className="rounded-md border border-rose-100 bg-rose-50 p-3 text-sm leading-6 text-rose-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-rose-700">원문에서 옮긴 준비 흐름</p>
          <p className="mt-1 text-rose-900">D-300~D-180 웨딩홀·예산·하객 규모 → D-180~D-90 스드메·신혼여행 → D-90~D-30 하객 명단·청첩장 초청 → D-30~D-Day 식권·BGM·역할 분담 순서로 실행합니다.</p>
        </div>
        {sourceUrl ? (
          <a className="shrink-0 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-800" href={sourceUrl} target="_blank" rel="noreferrer">
            원문 보기
          </a>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-rose-800">계약금/위약금, 보증인원 변경 가능 기한, 식권·주차권 수량은 원문 흐름을 참고하되 실제 업체 계약서와 상담 기록으로 다시 확인합니다.</p>
    </div>
  );
}

function MealReactionWorkbench({
  bundle,
  anchor,
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const slots = (bundle.mealSlots ?? []).slice().sort((a, b) => a.order - b.order);
  const reactionSlots = slots.slice(0, 3);
  const todayReactionSlot = reactionSlots[0];
  const calendarOnly = mealCalendarOnlySlugs.has(bundle.flow.slug);
  const calendarSlots = calendarOnly ? slots.slice(0, 10) : slots.slice(0, 6);

  return (
    <div data-testid="meal-reaction-workbench" className="space-y-4">
      {bundle.flow.warning ? (
        <div data-testid="meal-sensitive-warning" className={`${FLOWME_WARNING_CARD_CLASS} p-4`}>
          <p className="text-sm font-semibold text-[#8A5A12]">알레르기·전문가 확인</p>
          <p className="mt-1 text-sm leading-6 text-[#5F4115] md:hidden">
            아이 건강 상태, 알레르기, 시작 시기, 재료 선택은 전문가 또는 공식 정보를 확인하세요.
          </p>
          <details className="mt-2 text-sm leading-6 text-[#5F4115] md:hidden">
            <summary className="cursor-pointer font-semibold text-[#8A5A12]">주의 문구 전체 보기</summary>
            <p className="mt-1">{bundle.flow.warning}</p>
          </details>
          <p className="mt-1 hidden text-sm leading-6 text-[#5F4115] md:block">{bundle.flow.warning}</p>
        </div>
      ) : null}
      {todayReactionSlot && !calendarOnly ? (
        <div data-testid="meal-today-reaction-card" className={`${FLOWME_SURFACE_CARD_CLASS} md:hidden`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={FLOWME_EYEBROW_CLASS}>오늘 먹은 양 기록</p>
              <h3 className={FLOWME_TITLE_CLASS}>{todayReactionSlot.menu_title}</h3>
              <p className="mt-1 text-sm text-[#6E6B64]">{mealSlotTiming(todayReactionSlot.day_offset, todayReactionSlot.duration_days, anchor)}</p>
            </div>
            <button
              data-testid="meal-reaction-sheet-export"
              aria-label={`${FLOW_EXPORT_LABELS.sheetFile}: ${todayReactionSlot.menu_title} 오늘 먹은 양 반응 기록`}
              className={FLOWME_BUTTON_SECONDARY_CLASS}
              type="button"
              onClick={exportActions?.onDownloadExcel}
            >
              {FLOW_EXPORT_LABELS.sheetFile}
            </button>
          </div>
          <div data-testid="meal-reaction-summary-card" className={`mt-3 ${FLOWME_COMPACT_SUPPORT_CARD_CLASS}`}>
            <p className="text-xs font-semibold text-[#3654FF]">오늘 반응 요약</p>
            <div className="mt-2 grid gap-2 text-sm">
              <div data-testid="meal-summary-slot" className={FLOWME_INNER_ROW_CLASS}>
                <p className="text-xs font-semibold text-[#6E6B64]">오늘 식단</p>
                <p className="mt-1 font-medium text-[#1B1A17]">{todayReactionSlot.menu_title}</p>
                <p className="mt-1 text-[#6E6B64]">{mealSlotTiming(todayReactionSlot.day_offset, todayReactionSlot.duration_days, anchor)}</p>
              </div>
              <div data-testid="meal-summary-new-ingredients" className={FLOWME_INNER_ROW_CLASS}>
                <p className="text-xs font-semibold text-[#6E6B64]">새 재료</p>
                <p className="mt-1 text-[#1B1A17]">{todayReactionSlot.new_ingredients.length ? todayReactionSlot.new_ingredients.join(', ') : '-'}</p>
              </div>
              <div data-testid="meal-summary-reaction-fields" className={FLOWME_INNER_ROW_CLASS}>
                <p className="text-xs font-semibold text-[#6E6B64]">먹은 뒤 기록할 것</p>
                <p className="mt-1 text-[#1B1A17]">{mealReactionColumns.slice(0, 4).map((column) => column.label).join(' / ')}</p>
              </div>
            </div>
            <p data-testid="meal-summary-allergy-cue" className="mt-2 text-xs font-medium text-[#3654FF]">
              처음 먹인 뒤 특이 반응이 있으면 메모하고 전문가 확인을 우선합니다.
            </p>
          </div>
          <div className="mt-3 grid gap-2">
            {mealReactionColumns.slice(0, 4).map((column) => (
              <label key={column.id} className="text-sm font-semibold text-[#1B1A17]">
                {column.label}
                <input
                  aria-label={`${todayReactionSlot.menu_title} / ${column.label}`}
                  className={`mt-1 w-full font-normal ${FLOWME_INPUT_CLASS}`}
                  placeholder={column.placeholder}
                  value={workbenchState.logRows[todayReactionSlot.id]?.[column.id] ?? ''}
                  onChange={(event) => onWorkbenchChange(updateLogField(workbenchState, todayReactionSlot.id, column.id, event.currentTarget.value))}
                />
              </label>
            ))}
          </div>
        </div>
      ) : null}
      <div className={`grid gap-4 ${calendarOnly ? '' : 'lg:grid-cols-[0.95fr_1.05fr]'}`}>
        <div data-testid="artifact-calendar-card" className={FLOWME_SURFACE_CARD_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={FLOWME_EYEBROW_CLASS}>식단 일정 미리보기</p>
              <h3 className={FLOWME_TITLE_CLASS}>{calendarOnly ? '시작일 기준 식단표' : '처음 6개 식단'}</h3>
            </div>
            <ArtifactExportButtons actions={exportActions} kinds={['calendar']} />
          </div>
          {calendarOnly ? <BabyFoodSourceBridge sourceUrl={bundle.flow.source_url} /> : null}
          <ArtifactExportStatus actions={exportActions} />
          <div className="mt-3 space-y-2">
            {calendarSlots.map((slot) => {
              const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
              const isChecked = isMealSlotChecked(slot, anchor, checks);
              return (
                <div key={slot.id} className={FLOWME_INNER_ROW_CLASS}>
                  <label className="grid grid-cols-[22px_1fr] gap-x-3 gap-y-1 md:grid-cols-[22px_112px_1fr] md:gap-y-0">
                    <input
                      aria-label={getPreSavePreviewCheckboxLabel(slot.menu_title)}
                      className={`row-span-2 mt-0.5 md:row-span-1 ${FLOWME_CHECKBOX_CLASS}`}
                      checked={isChecked}
                      onChange={() => onToggleItem(slot.id)}
                      type="checkbox"
                    />
                    <span className="min-w-0 font-mono text-xs font-semibold text-[#3654FF]">{mealSlotTiming(slot.day_offset, slot.duration_days, anchor)}</span>
                    <span className={`col-start-2 min-w-0 md:col-start-auto ${getPreSavePreviewTextClass(isChecked)}`}>
                      <span className="block font-medium">{slot.menu_title}</span>
                      {slot.new_ingredients.length ? (
                        <span className="mt-1 block text-xs text-[#6E6B64]">새 재료: {slot.new_ingredients.join(', ')}</span>
                      ) : null}
                    </span>
                  </label>
                  {calendarOnly && recipe ? <RecipeDisclosure recipe={recipe} /> : null}
                </div>
              );
            })}
          </div>
        </div>
        {!calendarOnly ? (
        <div data-testid="meal-reaction-log-card" className={`hidden md:block ${FLOWME_TABLE_CARD_CLASS}`}>
          <div className={FLOWME_TABLE_HEADER_CLASS}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={FLOWME_EYEBROW_CLASS}>먹은 뒤 기록</p>
                <h3 className={FLOWME_TITLE_CLASS}>반응 기록표</h3>
              </div>
              <ArtifactExportButtons actions={exportActions} kinds={['copy', 'excel', 'draft']} labels={{ copy: FLOW_EXPORT_LABELS.memoCopy }} />
            </div>
            <ArtifactExportStatus actions={exportActions} />
            <p className="mt-2 text-sm leading-6 text-[#6E6B64]">레시피 평가는 뒤로 미루고, 먹은 양과 이상 반응을 먼저 남깁니다.</p>
          </div>
          <table className="min-w-[860px] text-left text-sm">
            <thead className={FLOWME_TABLE_HEAD_CLASS}>
              <tr>
                <th className="px-3 py-2">식단</th>
                {mealReactionColumns.map((column) => (
                  <th key={column.id} className="px-3 py-2">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reactionSlots.map((slot) => (
                <tr key={slot.id} className="border-t border-[#E7E4DD]">
                  <th className="px-3 py-3 text-sm font-semibold text-[#1B1A17]">
                    <span className="block">{slot.menu_title}</span>
                    <span className="mt-1 block text-xs font-medium text-[#6E6B64]">{mealSlotTiming(slot.day_offset, slot.duration_days, anchor)}</span>
                  </th>
                  {mealReactionColumns.map((column) => (
                    <td key={`${slot.id}-${column.id}`} className="px-2 py-2">
                      <input
                        aria-label={`${slot.menu_title} / ${column.label}`}
                        className={`w-full min-w-28 ${FLOWME_SMALL_INPUT_CLASS}`}
                        placeholder={column.placeholder}
                        value={workbenchState.logRows[slot.id]?.[column.id] ?? ''}
                        onChange={(event) => onWorkbenchChange(updateLogField(workbenchState, slot.id, column.id, event.currentTarget.value))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
          </table>
        </div>
        ) : null}
      </div>
    </div>
  );
}

function BabyFoodSourceBridge({ sourceUrl }: { sourceUrl?: string }) {
  return (
    <div data-testid="meal-source-bridge" className={`mt-3 text-sm leading-6 text-[#1B1A17] ${FLOWME_COMPACT_SUPPORT_CARD_CLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#3654FF]">원문에서 옮긴 실행 기준</p>
          <p className="mt-1 font-semibold">시작일 입력 → 3일 단위 새 재료 → 레시피 확인 → 이상 반응은 메모 후 전문가 확인</p>
        </div>
        {sourceUrl ? (
          <a className={FLOWME_LINK_BUTTON_CLASS} href={sourceUrl} target="_blank" rel="noreferrer">
            원문 보기
          </a>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-[#6E6B64]">
        원문은 날짜를 직접 입력하는 식단표와 3일 단위 알레르기 관찰 흐름을 제공합니다. Flow에서는 건강 판단보다 캘린더 식단표와 레시피 메모를 먼저 보여줍니다.
      </p>
      <p className="mt-1 text-xs leading-5 text-[#6E6B64]">
        쌀가루 20배죽, 불린 쌀 10배죽, 채소 손질, 6개월 전후 소고기 같은 단서는 레시피와 메모에서 확인하고 최신 공식/전문가 안내를 우선합니다.
      </p>
    </div>
  );
}

function mealSlotTiming(dayOffset: number, durationDays: number, anchor: string): string {
  const timing = timingLabel(dayOffset, durationDays);
  if (!anchor) return timing;
  const start = addDays(new Date(anchor), dayOffset);
  const end = durationDays > 1 ? getRangeEnd(start, durationDays) : undefined;
  return end ? `${timing} · ${formatDate(start).slice(5)}~${formatDate(end).slice(5)}` : `${timing} · ${formatDate(start).slice(5)}`;
}

function RecipeDisclosure({ recipe }: { recipe: WorkbenchRecipe }) {
  return (
    <details className={FLOWME_DISCLOSURE_CLASS}>
      <summary className="cursor-pointer font-semibold text-[#3654FF]">레시피 보기</summary>
      <div className="mt-2 grid gap-3 leading-6 text-[#6E6B64] md:grid-cols-2">
        <div>
          <p className="font-semibold text-[#1B1A17]">재료</p>
          <ul className="mt-1 list-disc pl-5">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.name}>{ingredient.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-[#1B1A17]">조리 방법</p>
          <ol className="mt-1 list-decimal pl-5">
            {recipe.steps.map((step) => (
              <li key={step.order}>{step.text}</li>
            ))}
          </ol>
        </div>
        {recipe.texture_note ? <p><b>분량/농도:</b> {recipe.texture_note}</p> : null}
        {recipe.storage_note ? <p><b>보관:</b> {recipe.storage_note}</p> : null}
        {recipe.caution_note ? <p className="text-[#8A5A12]"><b>주의:</b> {recipe.caution_note}</p> : null}
      </div>
    </details>
  );
}

function mealSlotCheckIds(slot: NonNullable<FlowBundle['mealSlots']>[number], anchor: string): string[] {
  const duration = Math.max(slot.duration_days ?? 1, 1);
  if (duration <= 1) return [slot.id];
  const baseDate = anchor || formatDate(new Date());
  return Array.from({ length: duration }, (_, index) => {
    const date = addDays(new Date(baseDate), slot.day_offset + index);
    return `${slot.id}__${formatDate(date)}`;
  });
}

function isMealSlotChecked(slot: NonNullable<FlowBundle['mealSlots']>[number], anchor: string, checks: Record<string, boolean>): boolean {
  return mealSlotCheckIds(slot, anchor).every((id) => checks[id]);
}

function MiniMonthCalendar({
  title,
  eyebrow,
  month,
  rows,
  doneIds,
  exportActions,
  mobileArtifactLabel,
}: {
  title: string;
  eyebrow?: string;
  month: string;
  rows: ScheduleRow[];
  doneIds?: Set<string>;
  exportActions?: ArtifactExportActions;
  mobileArtifactLabel?: string;
}) {
  const days = getMonthCalendarDays(month || formatDate(new Date()).slice(0, 7));
  return (
    <div data-testid="artifact-calendar-card" className={FLOWME_SURFACE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className={FLOWME_EYEBROW_CLASS}>{eyebrow}</p> : null}
          <h3 className={FLOWME_TITLE_CLASS}>{title}</h3>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-1 text-sm font-semibold text-[#6E6B64]">{month}</span>
          <ArtifactExportButtons actions={exportActions} kinds={['calendar']} mobileArtifactLabel={mobileArtifactLabel} mobileKinds={['calendar']} />
        </div>
      </div>
      <ArtifactExportStatus actions={exportActions} />
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[#6E6B64]">
        {weekdayOrder.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dayRows = date ? rows.filter((row) => row.startDate === date) : [];
          return (
            <div key={`${month}-${index}`} className={`min-h-16 rounded-xl border p-1 text-xs ${date ? 'border-[#E7E4DD] bg-[#FAFAF8]' : 'border-[#EEEAE2] bg-[#FAFAF8]/60'}`}>
              {date ? <p className="font-semibold text-[#6E6B64]">{date.slice(8)}</p> : null}
              {dayRows.slice(0, 2).map((row) => (
                <p key={row.id} className={`mt-1 truncate rounded-lg px-1 py-0.5 text-left text-[11px] font-medium ${doneIds?.has(row.id) ? 'bg-[#EAF7F0] text-[#1F8A5B]' : 'bg-white text-[#3654FF]'}`}>
                  {doneIds?.has(row.id) ? '표시 ' : ''}{row.title}
                </p>
              ))}
              {dayRows.length > 2 ? <p className="mt-1 text-[11px] text-[#6E6B64]">+{dayRows.length - 2}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoutineOccurrenceCalendar({
  bundle,
  month,
  rows,
  weekCount,
  workbenchState,
  onWorkbenchChange,
  exportActions,
}: {
  bundle: FlowBundle;
  month: string;
  rows: ScheduleRow[];
  weekCount: number;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  exportActions?: ArtifactExportActions;
}) {
  const visibleRows = rows;
  const occurrenceSummary = `${weekCount}주 ${visibleRows.length}회차`;
  const isSleepCheck = bundle.flow.slug === 'diet-habit-2week';
  const isHomeWorkout = bundle.flow.slug === 'real-thankyou-bubu-home-workout-starter';
  const isMealCheck = bundle.flow.slug === 'real-fitvely-diet-record-routine';
  const eyebrow = isSleepCheck ? '수면 체크 캘린더' : isHomeWorkout ? '홈트 캘린더' : isMealCheck ? '식단 체크 캘린더' : '회차 그리드';
  const title = isSleepCheck ? '14일 수면 체크' : isHomeWorkout ? '4주 홈트 체크' : isMealCheck ? '아침·점심·저녁 식단 체크' : `${occurrenceSummary} 루틴`;
  const description = isSleepCheck
    ? '저장 전에는 8시간 이상 잔 날을 미리 표시해 봅니다.'
    : isHomeWorkout
      ? '운동하는 날을 저장 전 미리 표시해 봅니다.'
      : isMealCheck
        ? '아침, 점심, 저녁 식단을 지켰는지만 표시합니다.'
        : '주차와 요일별 회차를 먼저 보고, 각 회차를 캘린더와 시트로 가져갑니다.';
  const firstDate = visibleRows[0]?.startDate ?? formatDate(new Date());
  const first = new Date(firstDate);
  const currentRow = visibleRows.find((row) => !workbenchState.occurrences[row.id]?.done) ?? visibleRows[0];
  const weekRows = Array.from({ length: weekCount }, (_, weekIndex) =>
    routineGridWeekdayOrder.map((weekday) =>
      visibleRows.find((row) => {
        const diff = Math.floor((new Date(row.startDate).getTime() - first.getTime()) / 86400000);
        return Math.floor(diff / 7) === weekIndex && row.timing === weekday;
      }),
    ),
  );

  return (
    <section aria-label="반복 캘린더 미리보기" data-testid="artifact-calendar-card" className={`min-w-0 ${FLOWME_SURFACE_CARD_CLASS}`}>
      <div data-testid="routine-session-grid-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={FLOWME_EYEBROW_CLASS}>{eyebrow}</p>
            <h3 className={FLOWME_TITLE_CLASS}>{title}</h3>
            <p className="mt-1 text-sm text-[#6E6B64]">{description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-full border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-1 text-sm font-semibold text-[#6E6B64]">{month}</span>
            <ArtifactExportButtons
              actions={exportActions}
              kinds={['calendar', 'excel', 'draft']}
              labels={{ calendar: FLOW_EXPORT_LABELS.calendarFile, excel: FLOW_EXPORT_LABELS.sheetFile, draft: '편집' }}
            />
          </div>
        </div>
        <ArtifactExportStatus actions={exportActions} />
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full border border-[#DDE3FF] bg-[#EEF1FF] px-3 py-1 font-semibold text-[#3654FF]">{isHomeWorkout ? '주 3회 홈트' : isMealCheck ? '식사별 체크' : occurrenceSummary}</span>
          <span className="rounded-full border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-1 font-semibold text-[#6E6B64]">{isHomeWorkout ? '미리보기 표시만' : isMealCheck ? '아침·점심·저녁' : '주차 × 요일 회차표'}</span>
          {currentRow ? <span className="rounded-full border border-[#F0D8AE] bg-[#FFF7E8] px-3 py-1 font-semibold text-[#8A5A12]">현재 {currentRow.title}</span> : null}
        </div>
        <div className="mt-3 grid grid-cols-[64px_repeat(7,minmax(0,1fr))] gap-1 text-center text-xs font-semibold text-[#6E6B64]">
          <span />
          {routineGridWeekdayOrder.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-[64px_repeat(7,minmax(0,1fr))] gap-1">
          {weekRows.map((week, weekIndex) => (
            <div key={`routine-week-${weekIndex}`} className="contents">
              <div className="rounded-xl border border-[#E7E4DD] bg-[#FAFAF8] p-2">
                <p className="text-[10px] font-bold text-[#6E6B64]">{weekIndex + 1}주차</p>
                <p className="mt-1 text-sm font-semibold text-[#1B1A17]">{weekIndex + 1}주차</p>
              </div>
              {week.map((row, dayIndex) => {
                if (!row) {
                  return (
                    <div key={`empty-${weekIndex}-${dayIndex}`} className="min-h-20 rounded-xl border border-dashed border-[#E7E4DD] bg-[#FAFAF8]/70 p-2 text-xs text-[#A7A39A]">
                      -
                    </div>
                  );
                }
                  const state = workbenchState.occurrences[row.id] ?? {};
                  const isCurrent = row.id === currentRow?.id;
                  return (
                    <label
                      key={row.id}
                      className={`min-h-20 rounded-xl border p-2 text-left text-xs ${state.done ? 'border-[#D8ECE1] bg-[#EAF7F0] text-[#1F8A5B]' : isCurrent ? 'border-[#3654FF] bg-[#EEF1FF] text-[#1B1A17]' : 'border-[#E7E4DD] bg-white text-[#1B1A17]'}`}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-semibold">{row.startDate.slice(5)}</span>
                        {isCurrent ? <span className="rounded-lg bg-white px-1.5 py-0.5 text-[10px] font-bold text-[#3654FF]">현재</span> : null}
                      </span>
                      <input
                        aria-label={getPreSavePreviewCheckboxLabel(row.title)}
                        className={`mt-2 ${FLOWME_SMALL_CHECKBOX_CLASS}`}
                        checked={Boolean(state.done)}
                        onChange={(event) => onWorkbenchChange(updateOccurrenceDone(workbenchState, row.id, event.currentTarget.checked))}
                        type="checkbox"
                      />
                      <span className="ml-1 align-middle text-[11px] font-semibold">{state.done ? '표시 ' : ''}{row.title}</span>
                      <span className="mt-1 block text-[11px] text-[#6E6B64]">{row.timing}</span>
                    </label>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RoutineSessionLogCard({
  bundle,
  rows,
  workbenchState,
  onWorkbenchChange,
  exportActions,
}: {
  bundle: FlowBundle;
  rows: ScheduleRow[];
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  exportActions?: ArtifactExportActions;
}) {
  const visibleRows = rows.slice(0, 8);
  const isSleepCheck = bundle.flow.slug === 'diet-habit-2week';
  const valueLabel = isSleepCheck ? '수면 여부' : '세트/강도';
  return (
    <section data-testid="routine-session-log-card" className={`min-w-0 ${FLOWME_SUPPORT_CARD_CLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={FLOWME_EYEBROW_CLASS}>회차 기록표</p>
          <h3 className={FLOWME_TITLE_CLASS}>지난 회차 기록</h3>
          <p className="mt-1 text-sm text-[#6E6B64]">
            {isSleepCheck ? '각 날짜가 끝나면 8시간 이상 수면 여부와 한 줄 메모를 남깁니다.' : '각 회차가 끝나면 세트/강도와 한 줄 메모를 시트로 남깁니다.'}
          </p>
        </div>
        <ArtifactExportButtons
          actions={exportActions}
          kinds={['copy', 'excel', 'draft']}
          labels={{ copy: FLOW_EXPORT_LABELS.memoCopy, excel: FLOW_EXPORT_LABELS.sheetFile, draft: '편집' }}
        />
      </div>
      <ArtifactExportStatus actions={exportActions} />
      <div className={`mt-3 ${FLOWME_TABLE_CARD_CLASS}`}>
        <table className="min-w-[720px] text-left text-sm">
          <thead className={FLOWME_TABLE_HEAD_CLASS}>
            <tr>
              <th className="px-3 py-2">날짜</th>
              <th className="px-3 py-2">회차</th>
              <th className="px-3 py-2">{valueLabel}</th>
              <th className="px-3 py-2">미리보기</th>
              <th className="px-3 py-2">한 줄 메모</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const state = workbenchState.occurrences[row.id] ?? {};
              return (
                <tr key={row.id} className="border-t border-[#E7E4DD]">
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-[#6E6B64]">{row.startDate}</td>
                  <td className="px-3 py-2 font-semibold text-[#1B1A17]">{row.title}</td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`${valueLabel}: ${row.title}`}
                      className={`w-full ${FLOWME_SMALL_INPUT_CLASS}`}
                      placeholder={isSleepCheck ? '예: 8시간 이상 / 23:30 취침' : '예: 20분 / RPE 7'}
                      value={workbenchState.logRows[row.id]?.intensity ?? ''}
                      onChange={(event) => onWorkbenchChange(updateLogField(workbenchState, row.id, 'intensity', event.currentTarget.value))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={getPreSavePreviewCheckboxLabel(row.title)}
                      className={FLOWME_CHECKBOX_CLASS}
                      checked={Boolean(state.done)}
                      onChange={(event) => onWorkbenchChange(updateOccurrenceDone(workbenchState, row.id, event.currentTarget.checked))}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`회차 메모: ${row.title}`}
                      className={`w-full ${FLOWME_SMALL_INPUT_CLASS}`}
                      placeholder={isSleepCheck ? '다음 날 피로감, 방해 요인, 내일 수면 메모' : '컨디션, 조정한 강도, 다음 회차 메모'}
                      value={state.note ?? ''}
                      onChange={(event) => onWorkbenchChange(updateOccurrenceNote(workbenchState, row.id, event.currentTarget.value))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComparisonTable({
  title,
  eyebrow,
  rows,
  comparisonState,
  onComparisonChange,
  exportActions,
  mobileArtifactLabel,
}: {
  title: string;
  eyebrow: string;
  rows: ArtifactComparisonRow[];
  comparisonState: FlowComparisonState;
  onComparisonChange: (state: FlowComparisonState) => void;
  exportActions?: ArtifactExportActions;
  mobileArtifactLabel?: string;
}) {
  const comparison = ensureComparisonState(comparisonState);

  return (
    <div data-testid="artifact-comparison-card" className={FLOWME_TABLE_CARD_CLASS}>
      <div className={`flex flex-wrap items-start justify-between gap-3 ${FLOWME_TABLE_HEADER_CLASS}`}>
        <div>
          <p className={FLOWME_EYEBROW_CLASS}>{eyebrow}</p>
          <h3 className={FLOWME_TITLE_CLASS}>{title}</h3>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ArtifactExportButtons actions={exportActions} kinds={['copy', 'excel', 'draft']} labels={{ copy: FLOW_EXPORT_LABELS.memoCopy }} mobileArtifactLabel={mobileArtifactLabel} mobileKinds={['excel']} />
          <button className={FLOWME_BUTTON_SECONDARY_CLASS} onClick={() => onComparisonChange(addComparisonCandidate(comparison))}>
            후보 추가
          </button>
        </div>
      </div>
      <ArtifactExportStatus actions={exportActions} />
      <MobileComparisonSummaryCard rows={rows} comparison={comparison} />
      <div
        className={`grid min-w-[720px] ${FLOWME_TABLE_HEAD_CLASS}`}
        style={{ gridTemplateColumns: `minmax(220px,1.1fr) repeat(${comparison.candidates.length}, minmax(170px,1fr))` }}
      >
        <span className="px-3 py-2">비교 항목</span>
        {comparison.candidates.map((candidate, index) => (
          <label key={candidate.id} className="px-3 py-2">
            <input
              aria-label={`후보 ${index + 1} 이름`}
              className={`w-full font-semibold ${FLOWME_SMALL_INPUT_CLASS}`}
              value={candidate.name}
              onChange={(event) => onComparisonChange(updateComparisonCandidateName(comparison, candidate.id, event.target.value))}
            />
          </label>
        ))}
      </div>
      {rows.slice(0, 8).map((row) => (
        <div
          key={row.id}
          className="grid min-w-[720px] border-t border-[#E7E4DD]"
          style={{ gridTemplateColumns: `minmax(220px,1.1fr) repeat(${comparison.candidates.length}, minmax(170px,1fr))` }}
        >
          <span className="px-3 py-3 text-sm font-medium text-[#1B1A17]">{row.title}</span>
          {comparison.candidates.map((candidate, index) => (
            <label key={`${row.id}-${candidate.id}`} className="px-3 py-2">
              <textarea
                aria-label={`${row.title} / 후보 ${index + 1} 메모`}
                className={`min-h-14 w-full resize-y ${FLOWME_SMALL_INPUT_CLASS}`}
                placeholder="가격, 조건, 확인할 점"
                value={comparison.notes[row.id]?.[candidate.id] ?? ''}
                onChange={(event) => onComparisonChange(updateComparisonNote(comparison, row.id, candidate.id, event.target.value))}
              />
            </label>
          ))}
        </div>
      ))}
    </div>
  );
}

function MobileComparisonSummaryCard({ rows, comparison }: { rows: ArtifactComparisonRow[]; comparison: FlowComparisonState }) {
  const previewRows = rows.slice(0, 3);
  const primaryCandidate = comparison.candidates[0]?.name ?? '후보 A';

  if (!previewRows.length) return null;

  return (
    <div data-testid="mobile-comparison-summary-card" className={`m-3 ${FLOWME_COMPACT_SUPPORT_CARD_CLASS} md:hidden`}>
      <p className="text-xs font-semibold text-[#3654FF]">먼저 채울 후보</p>
      <h4 className="mt-1 text-sm font-semibold text-[#1B1A17]">{primaryCandidate} 먼저 채우기</h4>
      <dl className="mt-2 grid gap-2 text-sm">
        {previewRows.map((row, index) => (
          <div key={row.id} className="rounded-xl border border-[#E7E4DD] bg-white px-3 py-2">
            <dt className="text-xs font-semibold text-[#6E6B64]">비교 항목 {index + 1}</dt>
            <dd className="mt-1 text-[#1B1A17]" aria-label={row.title}>아래 표에서 작성</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs font-medium text-[#3654FF]">전체 후보 비교는 아래 표에서 이어서 작성하고, 기록은 시트로 받을 수 있습니다.</p>
    </div>
  );
}

function getRepeatedWorkbenchCaution(details: Array<WorkbenchItemDetail | undefined>): string | undefined {
  const counts = new Map<string, number>();
  for (const detail of details) {
    const caution = detail?.caution?.trim();
    if (!caution) continue;
    counts.set(caution, (counts.get(caution) ?? 0) + 1);
  }

  return [...counts.entries()].find(([, count]) => count > 1)?.[0];
}

function ProofMemoCard({
  fields,
  workbenchState,
  onWorkbenchChange,
}: {
  fields: ArtifactMemoField[];
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
}) {
  const metadata = fields[0];
  const eyebrow = metadata?.groupEyebrow ?? '계약·결제 증빙';
  const title = metadata?.groupTitle ?? '증빙 메모';
  const description = metadata?.groupDescription ?? '견적, 계약금, 잔금, 보상 기준을 흩어진 캡처 대신 한곳에 남겨둡니다.';

  return (
    <div className={FLOWME_SUPPORT_CARD_CLASS}>
      <p className={FLOWME_EYEBROW_CLASS}>{eyebrow}</p>
      <h3 className={FLOWME_TITLE_CLASS}>{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#6E6B64]">{description}</p>
      <div className="mt-3 space-y-3">
        {fields.map((field) => (
          <label key={field.id} className="block">
            <span className="text-sm font-semibold text-[#1B1A17]">{field.label}</span>
            <textarea
              aria-label={field.label}
              className="mt-1 min-h-16 w-full resize-y rounded-xl border border-[#D8D5CD] bg-white px-3 py-2 text-sm text-[#1B1A17] outline-none focus:border-[#3654FF] focus:ring-2 focus:ring-[#3654FF]/15"
              placeholder={field.placeholder}
              value={workbenchState.memoCards?.[field.id] ?? ''}
              onChange={(event) => onWorkbenchChange(updateMemoCard(workbenchState, field.id, event.currentTarget.value))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function LogTableCard({
  table,
  workbenchState,
  onWorkbenchChange,
  exportActions,
  exportKinds = ['excel'],
  mobileArtifactLabel,
  mobileKinds,
}: {
  table: ArtifactLogTable;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  exportActions?: ArtifactExportActions;
  exportKinds?: ArtifactExportActionKind[];
  mobileArtifactLabel?: string;
  mobileKinds?: ArtifactExportActionKind[];
}) {
  const isWaterPurifier = table.id === 'water-purifier-filter-cycle-log';

  return (
    <div
      data-testid={`artifact-log-table-${table.id}`}
      data-source-kind={table.sourceKind ?? undefined}
      data-read-only-columns={table.readOnlyColumnIds?.join(',') ?? undefined}
      data-user-editable-columns={table.userEditableColumnIds?.join(',') ?? undefined}
      className={FLOWME_TABLE_CARD_CLASS}
    >
      <div className={FLOWME_TABLE_HEADER_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={FLOWME_EYEBROW_CLASS}>{table.eyebrow}</p>
            <h3 className={FLOWME_TITLE_CLASS}>{table.title}</h3>
          </div>
          <ArtifactExportButtons actions={exportActions} kinds={exportKinds} mobileArtifactLabel={mobileArtifactLabel} mobileKinds={mobileKinds} />
        </div>
        <ArtifactExportStatus actions={exportActions} />
        <p className="mt-2 text-sm leading-6 text-[#6E6B64]">{table.description}</p>
        {isWaterPurifier ? <WaterPurifierSourceBridge /> : null}
        {table.sourceKind === 'source_derived' ? <MobileStudyLogSummaryCard table={table} /> : <MobileLogSummaryCard table={table} />}
      </div>
      <table className="min-w-[760px] text-left text-sm">
        <thead className={FLOWME_TABLE_HEAD_CLASS}>
          <tr>
            <th className="px-3 py-2">항목</th>
            {table.columns.map((column) => (
              <th key={column.id} className="px-3 py-2">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id} className="border-t border-[#E7E4DD]">
              <th className="px-3 py-3 text-sm font-semibold text-[#1B1A17]">{row.label}</th>
              {table.columns.map((column) => {
                const isReadOnly = table.readOnlyColumnIds?.includes(column.id) ?? false;
                const value = isReadOnly ? row.defaultValues?.[column.id] ?? '' : workbenchState.logRows[row.id]?.[column.id] ?? row.defaultValues?.[column.id] ?? '';

                return (
                  <td key={`${row.id}-${column.id}`} className="px-2 py-2">
                    {isReadOnly ? (
                      <div
                        data-testid={`artifact-readonly-cell-${row.id}-${column.id}`}
                        className="min-w-36 rounded-xl border border-[#E7E4DD] bg-[#FAFAF8] px-2 py-1.5 text-sm leading-5 text-[#4A4842]"
                      >
                        {value || '-'}
                      </div>
                    ) : (
                      <input
                        aria-label={`${row.label} / ${column.label}`}
                        className="w-full min-w-28 rounded-xl border border-[#D8D5CD] px-2 py-1.5 text-sm text-[#1B1A17] outline-none focus:border-[#3654FF] focus:ring-2 focus:ring-[#3654FF]/15"
                        placeholder={column.placeholder}
                        value={value}
                        onChange={(event) => onWorkbenchChange(updateLogField(workbenchState, row.id, column.id, event.currentTarget.value))}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WaterPurifierSourceBridge() {
  return (
    <div data-testid="water-purifier-source-bridge" className={`mt-3 ${FLOWME_COMPACT_SUPPORT_CARD_CLASS} text-sm leading-6 text-[#1B1A17]`}>
      <p className="text-xs font-semibold text-[#3654FF]">원문에서 옮긴 필터 주기</p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        <p><b>침전</b> 원문 3~6개월</p>
        <p><b>프리카본</b> 원문 6~12개월</p>
        <p><b>RO/나노</b> 원문 12~24개월</p>
        <p><b>후카본</b> 원문 9~12개월</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#6E6B64]">코크/출수구 청소, 자가 살균, 물맛·냄새 확인은 필터 교체일과 별도 상태 메모로 남깁니다.</p>
    </div>
  );
}

function MobileStudyLogSummaryCard({ table }: { table: ArtifactLogTable }) {
  const firstRow = table.rows[0];
  const editableColumns = table.columns.filter((column) => table.userEditableColumnIds?.includes(column.id));

  if (!firstRow) return null;

  return (
    <div
      data-testid="mobile-study-log-summary-card"
      data-source-row-count={String(table.rows.length)}
      data-editable-column-count={String(editableColumns.length)}
      className={`mt-3 ${FLOWME_COMPACT_SUPPORT_CARD_CLASS} md:hidden`}
    >
      <p className="text-xs font-semibold text-[#3654FF]">원문 기준표 요약</p>
      <h4 className="mt-1 text-sm font-semibold text-[#1B1A17]">{table.rows.length}개 원문 행을 먼저 옮겼습니다</h4>
      <div className="mt-2 grid gap-2 text-sm">
        <div data-testid="study-summary-first-source-row" className="rounded-xl border border-[#E7E4DD] bg-white px-3 py-2">
          <p className="text-xs font-semibold text-[#6E6B64]">원문 기준 첫 행</p>
          <p className="mt-1 font-medium text-[#1B1A17]">{firstRow.label}</p>
          <p className="mt-1 text-[#4A4842]">{firstRow.defaultValues?.scope ?? '-'}</p>
        </div>
        <div data-testid="study-summary-editable-fields" className="rounded-xl border border-[#E7E4DD] bg-white px-3 py-2">
          <p className="text-xs font-semibold text-[#6E6B64]">내가 채울 칸</p>
          <p className="mt-1 text-[#1B1A17]">{editableColumns.map((column) => column.label).join(' / ')}</p>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-[#3654FF]">원문 범위는 고정하고, 목표일·상태·메모만 내가 채웁니다.</p>
    </div>
  );
}

function MobileLogSummaryCard({ table }: { table: ArtifactLogTable }) {
  const firstRow = table.rows[0];
  const previewColumns = table.columns.slice(0, 3);
  const isWaterPurifier = table.id === 'water-purifier-filter-cycle-log';

  if (!firstRow) return null;

  return (
    <div data-testid="mobile-artifact-summary-card" className={`mt-3 ${FLOWME_COMPACT_SUPPORT_CARD_CLASS} md:hidden`}>
      <p className="text-xs font-semibold text-[#3654FF]">{isWaterPurifier ? '가장 먼저 확인할 필터' : '먼저 채울 행'}</p>
      <h4 className="mt-1 text-sm font-semibold text-[#1B1A17]">{firstRow.label}</h4>
      <dl className="mt-2 grid gap-2 text-sm">
        {previewColumns.map((column) => (
          <div key={column.id} className="rounded-xl border border-[#E7E4DD] bg-white px-3 py-2">
            <dt className="text-xs font-semibold text-[#6E6B64]">{column.label}</dt>
            <dd className="mt-1 text-[#1B1A17]">{firstRow.defaultValues?.[column.id] || column.placeholder || '-'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs font-medium text-[#3654FF]">
        {isWaterPurifier ? '필터별 날짜와 상태는 아래 표에서 이어서 관리합니다.' : '전체 행은 아래 표에서 확인하고, 기록은 시트로 받을 수 있습니다.'}
      </p>
    </div>
  );
}

function MemoCardWorkbench({
  bundle,
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  checks: Record<string, boolean>;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const fields = getMemoCardFields(bundle);
  if (!fields.length) {
    return (
      <ChecklistWorkbench
        bundle={bundle}
        checks={checks}
        workbenchState={workbenchState}
        onWorkbenchChange={onWorkbenchChange}
        onToggleItem={onToggleItem}
        exportActions={exportActions}
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <ChecklistWorkbench
        bundle={bundle}
        checks={checks}
        workbenchState={workbenchState}
        onWorkbenchChange={onWorkbenchChange}
        onToggleItem={onToggleItem}
        exportActions={exportActions}
      />
      <ProofMemoCard fields={fields} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} />
    </div>
  );
}

function DecisionWorkbench({
  bundle,
  checks,
  comparisonState,
  onComparisonChange,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  checks: Record<string, boolean>;
  comparisonState: FlowComparisonState;
  onComparisonChange: (state: FlowComparisonState) => void;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const comparisonConfig = getComparisonConfig(bundle);
  const comparisonRows = getComparisonRows(bundle);
  const checklistItems = bundle.items;
  const memoFields = getMemoCardFields(bundle);
  const comparisonEyebrow = comparisonConfig?.eyebrow ?? '후보 비교표';
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <ComparisonTable
        title={comparisonConfig?.title ?? '후보 비교표'}
        eyebrow={comparisonEyebrow.replace('preview', '미리보기')}
        rows={comparisonRows}
        comparisonState={comparisonState}
        onComparisonChange={onComparisonChange}
        exportActions={exportActions}
        mobileArtifactLabel={getMobileArtifactLabel(bundle, 'comparison_table')}
      />
      <div className="space-y-4">
        {bundle.flow.warning ? <RiskBoundaryCard bundle={bundle} /> : null}
        <HoldSectionCard bundle={bundle} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} />
        {memoFields.length ? <ProofMemoCard fields={memoFields} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} /> : null}
        <div className={FLOWME_SUPPORT_CARD_CLASS}>
          <p className={FLOWME_EYEBROW_CLASS}>현장에서 바로 체크</p>
          <h3 className={FLOWME_TITLE_CLASS}>현장 체크리스트</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#4A4842]">
            {checklistItems.slice(0, 5).map((item) => (
              <li key={item.id}>
                <label className="flex gap-2">
                  <input
                    aria-label={getPreSavePreviewCheckboxLabel(item.title)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                    checked={Boolean(checks[item.id])}
                    onChange={() => onToggleItem(item.id)}
                    type="checkbox"
                  />
                  <span className={checks[item.id] ? 'text-[#3654FF]' : ''}>{item.title}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RiskBoundaryCard({ bundle }: { bundle: FlowBundle }) {
  return (
    <div className={`${FLOWME_COMPACT_SUPPORT_CARD_CLASS} bg-[#FFF7E8]`}>
      <p className="text-sm font-semibold text-[#8A5A12]">{riskBoundaryTitle(bundle)}</p>
      <p className="mt-1 text-sm leading-6 text-[#4A4842]">{bundle.flow.warning}</p>
    </div>
  );
}

function StopPrincipleCards({ bundle }: { bundle: FlowBundle }) {
  if (!bundle.flow.stop_conditions?.length && !bundle.flow.principles?.length) return null;

  return (
    <div className="mb-4 space-y-3">
      {bundle.flow.stop_conditions?.length ? (
        <section data-testid="flow-stop-conditions" className={`${FLOWME_COMPACT_SUPPORT_CARD_CLASS} bg-[#FFF5F2]`}>
          <p className="text-sm font-semibold text-[#A13E2E]">중단·상담 기준</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#4A4842]">
            {bundle.flow.stop_conditions.map((condition) => (
              <li key={condition}>- {condition}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {bundle.flow.principles?.length ? (
        <section data-testid="flow-principles" className={FLOWME_COMPACT_SUPPORT_CARD_CLASS}>
          <p className="text-sm font-semibold text-[#3654FF]">기록 원칙</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[#4A4842]">
            {bundle.flow.principles.map((principle) => (
              <li key={principle}>- {principle}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function HoldSectionCard({
  bundle,
  workbenchState,
  onWorkbenchChange,
}: {
  bundle: FlowBundle;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
}) {
  const section = bundle.flow.hold_section;
  if (!section) return null;
  const fields = getHoldMemoFields(bundle);

  return (
    <section data-testid="flow-hold-section" className={`${FLOWME_COMPACT_SUPPORT_CARD_CLASS} bg-[#FFF5F2]`}>
      <p className="text-sm font-semibold text-[#A13E2E]">{section.title}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-[#4A4842]">
        {section.reasons.map((reason) => (
          <li key={reason}>- {reason}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm leading-6 text-[#4A4842]">{section.consequence}</p>
      <p className="mt-2 rounded-xl border border-[#E7E4DD] bg-white px-3 py-2 text-xs font-semibold text-[#A13E2E]">{section.memo_template}</p>
      {fields.length ? (
        <div data-testid="flow-hold-memo-card" className="mt-3 grid gap-3">
          {fields.map((field) => (
            <label key={field.id} className="grid gap-1 text-sm font-semibold text-[#1B1A17]">
              {field.label}
              <textarea
                data-testid={`flow-hold-field-${field.id}`}
                aria-label={field.label}
                className="min-h-20 rounded-xl border border-[#D8D5CD] bg-white px-3 py-2 text-sm font-normal text-[#1B1A17] outline-none focus:border-[#3654FF] focus:ring-2 focus:ring-[#3654FF]/15"
                placeholder={field.placeholder}
                value={workbenchState.memoCards?.[field.id] ?? ''}
                onChange={(event) => onWorkbenchChange(updateMemoCard(workbenchState, field.id, event.currentTarget.value))}
              />
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function riskBoundaryTitle(bundle: FlowBundle): string {
  if (bundle.flow.slug === 'new-car-delivery-check') return '인수 전 보류 기준';
  if (bundle.flow.risk_level === 'financial_sensitive') return '결정 전 확인';
  if (bundle.flow.risk_level === 'medical_sensitive') return '기록 전 확인';
  return '주의할 점';
}

function ensureComparisonState(state: FlowComparisonState): FlowComparisonState {
  return {
    candidates: state.candidates.length ? state.candidates : defaultComparisonCandidates,
    notes: state.notes ?? {},
  };
}

function updateComparisonCandidateName(state: FlowComparisonState, candidateId: string, name: string): FlowComparisonState {
  return {
    ...state,
    candidates: state.candidates.map((candidate) => (candidate.id === candidateId ? { ...candidate, name } : candidate)),
  };
}

function updateComparisonNote(state: FlowComparisonState, itemId: string, candidateId: string, note: string): FlowComparisonState {
  return {
    ...state,
    notes: {
      ...state.notes,
      [itemId]: {
        ...(state.notes[itemId] ?? {}),
        [candidateId]: note,
      },
    },
  };
}

function addComparisonCandidate(state: FlowComparisonState): FlowComparisonState {
  const nextIndex = state.candidates.length + 1;
  return {
    ...state,
    candidates: [
      ...state.candidates,
      {
        id: `candidate-${Date.now()}-${nextIndex}`,
        name: `후보 ${nextIndex}`,
      },
    ],
  };
}

function updateOccurrenceDone(state: FlowWorkbenchState, key: string, done: boolean): FlowWorkbenchState {
  return {
    ...state,
    occurrences: {
      ...state.occurrences,
      [key]: {
        ...(state.occurrences[key] ?? {}),
        done,
      },
    },
  };
}

function updateOccurrenceNote(state: FlowWorkbenchState, key: string, note: string): FlowWorkbenchState {
  return {
    ...state,
    occurrences: {
      ...state.occurrences,
      [key]: {
        ...(state.occurrences[key] ?? {}),
        note,
      },
    },
  };
}

function updateLogField(state: FlowWorkbenchState, date: string, field: string, value: string): FlowWorkbenchState {
  return {
    ...state,
    logRows: {
      ...state.logRows,
      [date]: {
        ...(state.logRows[date] ?? {}),
        [field]: value,
      },
    },
  };
}

function updateMemoCard(state: FlowWorkbenchState, field: string, value: string): FlowWorkbenchState {
  return {
    ...state,
    memoCards: {
      ...state.memoCards,
      [field]: value,
    },
  };
}

function updateWeeklyReview(state: FlowWorkbenchState, weeklyReview: string): FlowWorkbenchState {
  return {
    ...state,
    weeklyReview,
  };
}

function occurrenceKey(occurrence: RoutineOccurrence): string {
  return `${occurrence.date}:${occurrence.sessionIndex}`;
}

function RoutineWorkbench({
  bundle,
  anchor,
  weekdays,
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
  checks: Record<string, boolean>;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  if (maintenanceRoutineSlugs.has(bundle.flow.slug)) {
    return (
      <MaintenanceRoutineWorkbench
        bundle={bundle}
        anchor={anchor}
        checks={checks}
        workbenchState={workbenchState}
        onWorkbenchChange={onWorkbenchChange}
        onToggleItem={onToggleItem}
        exportActions={exportActions}
      />
    );
  }

  const startDate = anchor || formatDate(nextMonday(new Date()));
  const selectedWeekdays = weekdays.length ? weekdays : inferWeekdays(bundle.repeatRules?.[0] ?? '');
  const weekCount = getRoutineWeekCount(bundle);
  const occurrences = expandRoutineOccurrences(startDate, selectedWeekdays, weekCount);
  const month = occurrences[0]?.date.slice(0, 7) ?? startDate.slice(0, 7);
  const rows = occurrences.map((occurrence) => ({
    id: occurrenceKey(occurrence),
    title: `${occurrence.sessionIndex}회차`,
    section: '반복',
    timing: occurrence.weekday,
    startDate: occurrence.date,
  }));
  const next = occurrences[0];
  const nextKey = next ? occurrenceKey(next) : '';
  const nextLabel = next ? `${next.sessionIndex}회차` : '';
  const nextState = nextKey ? workbenchState.occurrences[nextKey] ?? {} : {};
  const isSleepCheck = bundle.flow.slug === 'diet-habit-2week';
  const isCheckOnlyRoutine = checkOnlyRoutineSlugs.has(bundle.flow.slug);
  const isHomeWorkout = bundle.flow.slug === 'real-thankyou-bubu-home-workout-starter';
  const isMealCheck = bundle.flow.slug === 'real-fitvely-diet-record-routine';
  const isExactVideoRoutine = Boolean(bundle.flow.tags?.includes('exact-video'));
  const sessionItems = bundle.items.slice(0, 5);
  const routineRows = rows.map((row, index) => ({
    ...row,
    title: isHomeWorkout ? '홈트' : isMealCheck ? bundle.items[index % Math.max(bundle.items.length, 1)]?.title ?? row.title : row.title,
  }));

  if (isCheckOnlyRoutine) {
    return (
      <div className="grid gap-4">
        <RoutineOccurrenceCalendar
          bundle={bundle}
          month={month}
          rows={routineRows}
          weekCount={weekCount}
          workbenchState={workbenchState}
          onWorkbenchChange={onWorkbenchChange}
          exportActions={exportActions}
        />
        {isHomeWorkout ? (
          <>
            <ExactVideoTodayResultCard
              occurrenceKeyValue={nextKey}
              occurrenceLabel={nextLabel || '오늘 홈트'}
              workbenchState={workbenchState}
              onWorkbenchChange={onWorkbenchChange}
            />
            <ExactVideoSourceBridge bundle={bundle} />
          </>
        ) : isExactVideoRoutine ? <ExactVideoSourceBridge bundle={bundle} /> : null}
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${isCheckOnlyRoutine ? 'lg:grid-cols-[1.2fr_0.8fr]' : 'lg:grid-cols-[1.12fr_0.88fr]'}`}>
      <div className="order-2 grid min-w-0 gap-4 lg:order-1">
        <RoutineOccurrenceCalendar bundle={bundle} month={month} rows={routineRows} weekCount={weekCount} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} exportActions={exportActions} />
        {!isCheckOnlyRoutine ? <RoutineSessionLogCard bundle={bundle} rows={rows} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} exportActions={exportActions} /> : null}
      </div>
      <div data-testid="routine-today-session-card" className={`order-1 min-w-0 lg:order-2 ${FLOWME_SUPPORT_CARD_CLASS}`}>
        <p className={FLOWME_EYEBROW_CLASS}>이번 주 요약</p>
        <h3 className={FLOWME_TITLE_CLASS}>다음 회차</h3>
        <p className="mt-2 text-sm text-[#6E6B64]">오늘 바로 볼 회차와 실행 항목을 오른쪽에 고정해 둡니다.</p>
        <div className="mt-3 hidden grid-cols-2 gap-2 text-sm lg:grid">
          <div className={FLOWME_INNER_ROW_CLASS}>
            <p className="text-xs font-semibold text-[#6E6B64]">전체 회차</p>
            <p className="mt-1 font-semibold text-[#1B1A17]">{rows.length}회</p>
          </div>
          <div className={FLOWME_INNER_ROW_CLASS}>
            <p className="text-xs font-semibold text-[#6E6B64]">이번 주</p>
            <p className="mt-1 font-semibold text-[#1B1A17]">{selectedWeekdays.length}회</p>
          </div>
        </div>
        {next ? (
          <div className={`mt-2 ${FLOWME_INNER_ROW_CLASS}`}>
            <label className="flex items-center gap-2 text-sm font-semibold text-[#3654FF]">
              <input
                aria-label={getPreSavePreviewCheckboxLabel(nextLabel)}
                className={FLOWME_CHECKBOX_CLASS}
                checked={Boolean(nextState.done)}
                onChange={(event) => onWorkbenchChange(updateOccurrenceDone(workbenchState, nextKey, event.currentTarget.checked))}
                type="checkbox"
              />
              <span>{nextLabel} · {next.date} · {next.weekday}</span>
            </label>
            <button
              data-testid="routine-session-record-button"
              className={`mt-3 w-full sm:w-auto ${FLOWME_BUTTON_PRIMARY_CLASS}`}
              type="button"
              onClick={() => onWorkbenchChange(updateOccurrenceDone(workbenchState, nextKey, true))}
            >
              다음 회차 기록
            </button>
            {!isCheckOnlyRoutine ? (
            <textarea
              aria-label={`다음 세션 메모: ${nextLabel}`}
              className={`mt-3 min-h-20 w-full resize-y ${FLOWME_INPUT_CLASS}`}
              placeholder={isSleepCheck ? '잠든 시각, 8시간 이상 여부, 다음 날 피로감' : '오늘 컨디션, 조정할 강도, 다음 회차 메모'}
              value={nextState.note ?? ''}
              onChange={(event) => onWorkbenchChange(updateOccurrenceNote(workbenchState, nextKey, event.currentTarget.value))}
            />
            ) : null}
          </div>
        ) : null}
        <ul className="mt-3 space-y-2 text-sm text-[#6E6B64]">
          {sessionItems.map((item) => (
            <li key={item.id} className="flex gap-2">
              <span className="text-[#3654FF]">•</span>
              <span>{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ExactVideoSourceBridge({ bundle }: { bundle: FlowBundle }) {
  const detail = bundle.itemDetails?.[0];
  const sourceUrl = bundle.flow.source_url;
  const sourceTitle = bundle.flow.source_title ? toUserFacingSourceTitle(bundle.flow.source_title) : '원본 영상';
  const isUserScheduled = Boolean(bundle.flow.tags?.includes('schedule-user-choice'));
  const supportingLinks = detail?.links?.filter((link) => link.url !== sourceUrl) ?? [];
  const cues =
    bundle.flow.slug === 'real-thankyou-bubu-home-workout-starter'
      ? ['점프 없음', '눕는 동작 없음', '반복 없음', '토크 없음']
      : isUserScheduled
        ? ['원본 영상 1개', '요일 직접 선택', '완료 또는 중단 기록']
      : ['원본 영상 1개', '반복 일정', '운동 후 기록'];

  return (
    <section data-testid="exact-video-source-bridge" className={`text-sm leading-6 text-[#1B1A17] ${FLOWME_SUPPORT_CARD_CLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#3654FF]">원문에서 옮긴 실행 기준</p>
          <h3 className={FLOWME_TITLE_CLASS}>
            {isUserScheduled ? '원본을 확인하고, 내가 고른 요일에 다시 엽니다' : '원본 영상을 열고, 정한 요일에 1회 실행합니다'}
          </h3>
        </div>
        {sourceUrl ? (
          <a className={FLOWME_LINK_BUTTON_CLASS} href={sourceUrl} target="_blank" rel="noreferrer">
            원본 영상 열기
          </a>
        ) : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {cues.map((cue) => (
          <span key={cue} className="rounded-full border border-[#DDE3FF] bg-[#EEF1FF] px-2 py-1 text-xs font-semibold text-[#3654FF]">
            {cue}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm text-[#6E6B64]">
        {isUserScheduled
          ? 'Flow는 영상의 동작 순서나 운동 효과를 새로 만들지 않습니다. 체크한 요일은 원문 처방이 아니라 내 캘린더에 저장할 일정입니다.'
          : 'Flow는 영상의 동작 순서를 새로 만들지 않습니다. 캘린더에는 운동일만 넣고, 실행할 때는 원본 영상의 자세와 박자를 그대로 확인합니다.'}
      </p>
      <p className="mt-2 text-xs text-[#6E6B64]">
        저장 후 남길 기록: {detail?.completion_criteria ?? '완료 여부, 체감 난이도, 통증이나 어지러움, 다음 회차 강도 조정 메모'}
      </p>
      <p className="mt-1 text-xs text-[#3654FF]">출처: {sourceTitle}</p>
      {supportingLinks.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {supportingLinks.map((link) => (
            <a key={link.url} className={FLOWME_LINK_BUTTON_CLASS} href={link.url} target="_blank" rel="noreferrer">
              {toUserFacingSourceTitle(link.label)}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ExactVideoTodayResultCard({
  occurrenceKeyValue,
  occurrenceLabel,
  workbenchState,
  onWorkbenchChange,
}: {
  occurrenceKeyValue: string;
  occurrenceLabel: string;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
}) {
  const selectedResult = workbenchState.memoCards.exactVideoResult ?? '';
  const note = occurrenceKeyValue ? workbenchState.occurrences[occurrenceKeyValue]?.note ?? '' : '';
  const resultOptions = ['완료', '강도 낮춤', '휴식으로 변경'];

  return (
    <section data-testid="exact-video-result-card" className={`text-sm leading-6 text-[#1B1A17] ${FLOWME_SUCCESS_CARD_CLASS}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#1F8A5B]">오늘 결과</p>
          <h3 className={FLOWME_TITLE_CLASS}>{occurrenceLabel} 실행 후 남길 것</h3>
          <p className="mt-1 text-sm text-[#406B55]">원본 영상을 열어 1회 따라 한 뒤 완료 여부와 몸 상태만 가볍게 남깁니다.</p>
        </div>
        <span className="rounded-full border border-[#D8ECE1] bg-white px-2 py-1 text-xs font-semibold text-[#1F8A5B]">운동 후 기록</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {resultOptions.map((result) => (
          <button
            key={result}
            type="button"
            aria-pressed={selectedResult === result}
            className={`min-h-10 rounded-xl border px-3 text-sm font-semibold ${
              selectedResult === result ? 'border-[#1F8A5B] bg-[#1F8A5B] text-white' : 'border-[#D8ECE1] bg-white text-[#1F8A5B]'
            }`}
            onClick={() => {
              const next = updateMemoCard(workbenchState, 'exactVideoResult', result);
              onWorkbenchChange(occurrenceKeyValue && result === '완료' ? updateOccurrenceDone(next, occurrenceKeyValue, true) : next);
            }}
          >
            {result}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-sm font-semibold text-[#1B1A17]">
        몸 상태 메모
        <textarea
          aria-label="운동 후 몸 상태 메모"
          className={`mt-2 min-h-24 w-full resize-y font-normal ${FLOWME_INPUT_CLASS}`}
          placeholder="예: 완료 / RPE 6 / 무릎 통증 없음 / 다음 회차도 같은 강도"
          value={note}
          onChange={(event) => occurrenceKeyValue ? onWorkbenchChange(updateOccurrenceNote(workbenchState, occurrenceKeyValue, event.currentTarget.value)) : undefined}
        />
      </label>
      <p className="mt-2 text-xs text-[#406B55]">통증, 어지러움, 호흡 곤란이 있으면 완료보다 중단 기록을 우선합니다.</p>
    </section>
  );
}

function inferWeekdays(repeatLabel: string): string[] {
  if (repeatLabel.includes('매일 체크')) return routineGridWeekdayOrder;
  if (repeatLabel.includes('매일')) return ['월', '화', '수', '목', '금'];
  if (repeatLabel.includes('월') || repeatLabel.includes('수') || repeatLabel.includes('금')) return ['월', '수', '금'];
  if (repeatLabel.includes('화') || repeatLabel.includes('목')) return ['화', '목', '토'];
  return ['월', '수', '금'];
}

function getRoutineWeekCount(bundle: FlowBundle): number {
  if (bundle.repeatRules?.some((rule) => rule.includes('14일'))) return 2;
  return 4;
}

function nextMonday(date: Date): Date {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function expandRoutineOccurrences(startDate: string, weekdays: string[], weeks: number): RoutineOccurrence[] {
  const start = new Date(startDate);
  const days = new Set(weekdays);
  const occurrences: RoutineOccurrence[] = [];
  for (let index = 0; index < weeks * 7; index += 1) {
    const current = addDays(start, index);
    const weekday = weekdayOrder[current.getDay()];
    if (days.has(weekday)) {
      occurrences.push({
        date: formatDate(current),
        weekday,
        sessionIndex: occurrences.length + 1,
      });
    }
  }
  return occurrences;
}

function SpreadsheetWorkbench({
  bundle,
  anchor,
  workbenchState,
  onWorkbenchChange,
  exportActions,
}: {
  bundle: FlowBundle;
  anchor: string;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  exportActions?: ArtifactExportActions;
}) {
  const routeSpecificLogTables = getLogTables(bundle);
  const start = anchor || formatDate(new Date());
  const rows = Array.from({ length: 7 }, (_, index) => formatDate(addDays(new Date(start), index)));
  const showRiskBoundary = bundle.flow.risk_level === 'medical_sensitive' && Boolean(bundle.flow.warning);
  const spreadsheetColumns = getSpreadsheetColumns(bundle);
  const isFridgeCleanout = bundle.flow.slug === 'fridge-cleanout-weekly-plan';
  const [showFridgeFullSheet, setShowFridgeFullSheet] = useState(false);
  const title =
    bundle.flow.slug === 'diet-habit-2week'
      ? '관찰 기록표'
      : isFridgeCleanout
        ? '7일 재고 소진표'
        : '날짜별 기록표';
  const description =
    bundle.flow.slug === 'diet-habit-2week'
      ? '감량 결과를 판단하지 않고 식사, 수면, 활동, 컨디션, 중단/상담 조건을 같은 줄에 남깁니다.'
      : isFridgeCleanout
        ? '냉장고 지도에서 고른 재료, 메뉴 후보, 장보기 보류 상태만 기록합니다. 절약액이나 영양 균형은 계산하지 않습니다.'
        : '날짜별로 남길 기록 값을 먼저 정리합니다.';
  const routeSpecificMemoTitle =
    bundle.flow.slug === 'water-purifier-filter-cycle'
      ? '관리 메모'
      : bundle.flow.slug === 'fridge-cleanout-weekly-plan'
        ? '장보기 전 메모'
        : '주간 조정 메모';
  const routeSpecificMemoPlaceholder =
    bundle.flow.slug === 'water-purifier-filter-cycle'
      ? '이번에 확인한 필터 상태, 모델별 교체 기준, 원문/제조사 링크를 적어두세요.'
      : bundle.flow.slug === 'fridge-cleanout-weekly-plan'
        ? '남은 재료, 폐기/확인할 재료, 다음 장보기에서 보류할 항목만 적어두세요.'
        : '이번 주에 유지할 기준, 줄일 기준, 중단/상담 신호를 적어두세요.';
  if (routeSpecificLogTables.length) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="grid gap-4">
          {routeSpecificLogTables.map((table, index) => (
            <LogTableCard
              key={table.id}
              table={table}
              workbenchState={workbenchState}
              onWorkbenchChange={onWorkbenchChange}
              exportActions={index === 0 ? exportActions : undefined}
              exportKinds={index === 0 ? ['copy', 'excel', 'draft'] : ['excel']}
            />
          ))}
        </div>
        <div className={FLOWME_SUPPORT_CARD_CLASS}>
          <StopPrincipleCards bundle={bundle} />
          {showRiskBoundary ? (
            <div className={`mb-4 ${FLOWME_WARNING_CARD_CLASS}`}>
              <p className="text-sm font-semibold text-[#8A5A12]">기록 전 확인</p>
              <p className="mt-1 text-sm leading-6 text-[#5F4115]">{bundle.flow.warning}</p>
            </div>
          ) : null}
          <h3 className={FLOWME_TITLE_CLASS}>{routeSpecificMemoTitle}</h3>
          <textarea
            aria-label={routeSpecificMemoTitle}
            className={`mt-3 min-h-32 w-full resize-y ${FLOWME_INPUT_CLASS}`}
            placeholder={routeSpecificMemoPlaceholder}
            value={workbenchState.weeklyReview ?? ''}
            onChange={(event) => onWorkbenchChange(updateWeeklyReview(workbenchState, event.currentTarget.value))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <div data-testid="artifact-log-table-spreadsheet" className={FLOWME_TABLE_CARD_CLASS}>
        <div className={FLOWME_TABLE_HEADER_CLASS}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={FLOWME_EYEBROW_CLASS}>기록표</p>
              <h3 className={FLOWME_TITLE_CLASS}>{title}</h3>
            </div>
              <ArtifactExportButtons
                actions={exportActions}
                kinds={['copy', 'excel', 'draft']}
                labels={{ copy: FLOW_EXPORT_LABELS.memoCopy }}
                mobileArtifactLabel={getMobileArtifactLabel(bundle, 'spreadsheet_log')}
                mobileKinds={['excel']}
              />
          </div>
          <ArtifactExportStatus actions={exportActions} />
          <p className="mt-2 text-sm leading-6 text-[#6E6B64]">{description}</p>
          <MobileSpreadsheetSummaryCard date={rows[0]} columns={spreadsheetColumns} bundle={bundle} />
        </div>
        {isFridgeCleanout ? (
          <>
            <FridgeMobileActiveRowCard
              date={rows[0]}
              columns={spreadsheetColumns.filter((column) => column !== '메모')}
              workbenchState={workbenchState}
              onWorkbenchChange={onWorkbenchChange}
            />
            <details
              data-testid="fridge-full-sheet-disclosure"
              className="mx-3 mb-3 mt-3 rounded-xl border border-[#E7E4DD] bg-[#FAFAF8] px-3 py-2 text-sm"
              open={showFridgeFullSheet}
              onToggle={(event) => setShowFridgeFullSheet(event.currentTarget.open)}
            >
              <summary className="cursor-pointer list-none font-semibold text-[#3654FF]">
                전체 7일 표 보기
                <span className="ml-2 text-xs font-medium text-[#6E6B64]">필요할 때만 펼치기</span>
              </summary>
              {showFridgeFullSheet ? (
                <div data-testid="fridge-mobile-full-sheet-table" className="mt-3 overflow-x-auto">
                  <SpreadsheetLogTable
                    rows={rows}
                    columns={spreadsheetColumns}
                    workbenchState={workbenchState}
                    onWorkbenchChange={onWorkbenchChange}
                  />
                </div>
              ) : null}
            </details>
          </>
        ) : (
          <SpreadsheetLogTable
            rows={rows}
            columns={spreadsheetColumns}
            workbenchState={workbenchState}
            onWorkbenchChange={onWorkbenchChange}
          />
        )}
      </div>
      <div className={FLOWME_SUPPORT_CARD_CLASS}>
        <StopPrincipleCards bundle={bundle} />
        {showRiskBoundary ? (
          <div className={`mb-4 ${FLOWME_WARNING_CARD_CLASS}`}>
            <p className="text-sm font-semibold text-[#8A5A12]">
              {bundle.flow.slug === 'diet-habit-2week' ? '관찰 전 중단/상담 기준' : '기록 전 확인'}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#5F4115]">{bundle.flow.warning}</p>
          </div>
        ) : null}
        <h3 className={FLOWME_TITLE_CLASS}>
          {bundle.flow.slug === 'diet-habit-2week'
            ? '주간 관찰 메모'
            : bundle.flow.slug === 'fridge-cleanout-weekly-plan'
              ? '장보기 전 메모'
              : '주간 리뷰 메모'}
        </h3>
        <textarea
          aria-label={
            bundle.flow.slug === 'diet-habit-2week'
              ? '주간 관찰 메모'
              : bundle.flow.slug === 'fridge-cleanout-weekly-plan'
                ? '장보기 전 메모'
                : '주간 리뷰 메모'
          }
          className={`mt-3 min-h-32 w-full resize-y ${FLOWME_INPUT_CLASS}`}
          placeholder={
            bundle.flow.slug === 'diet-habit-2week'
              ? '반복된 식사 시간, 수면, 활동, 컨디션, 중단/상담 신호만 적어보세요.'
              : bundle.flow.slug === 'fridge-cleanout-weekly-plan'
                ? '남은 재료, 폐기/확인할 재료, 다음 장보기에서 보류할 항목만 적어두세요.'
                : '기록 누락, 식사 패턴, 운동 지속 여부를 보고 다음 주 기준을 적어두세요.'
          }
          value={workbenchState.weeklyReview ?? ''}
          onChange={(event) => onWorkbenchChange(updateWeeklyReview(workbenchState, event.currentTarget.value))}
        />
      </div>
    </div>
  );
}

function MaintenanceRoutineWorkbench({
  bundle,
  anchor,
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const startDate = anchor || formatDate(new Date());
  const isWasher = bundle.flow.slug === 'washer-tub-clean-monthly';
  const title = isWasher ? '다음 통세척일' : '다음 상태 확인일';
  const repeatLabel = bundle.repeatRules?.[0] ?? (isWasher ? '월 1회' : '7~10일마다');
  const memoPlaceholder = isWasher
    ? '예: 드럼 세탁기 / 액상 전용 클리너 구매 링크 / 세제통 물기 제거 / 배수필터는 다음 주말에 확인'
    : '예: 겉흙은 말랐고 잎 처짐 없음, 다음 확인일에 화분 방향만 돌리기';
  const occurrenceDates = isWasher
    ? [0, 1, 2, 3].map((months) => formatDate(addMonths(new Date(startDate), months)))
    : [0, 10, 20, 30].map((days) => formatDate(addDays(new Date(startDate), days)));
  const items = getExecutableItems(bundle);
  const maintenanceResult = workbenchState.memoCards.maintenanceResult ?? '';
  const maintenanceResultOptions = ['물주기 완료', '오늘은 보류', '관찰 메모'];
  const sourceBridge = isWasher
    ? {
        cues: '통세척/통살균 코스, 문 열어 건조, 세제통·고무패킹·배수필터 확인',
        conversion: 'Flow에서는 월 1회 관리일과 날짜 안 체크리스트로 옮겼습니다.',
        prep: '세제나 클리너는 내 모델 설명서에서 허용한 종류와 양만 사용합니다.',
        cadence: '기본 점검은 월 1회로 두고, 냄새나 오염이 반복되면 모델 설명서와 서비스 안내를 다시 확인합니다.',
      }
    : {
        cues: '겉흙 2~3cm, 잎 처짐, 밝은 간접광, 배수구멍과 분갈이 조건',
        conversion: 'Flow에서는 고정 지시가 아니라 상태 확인일과 날짜 안 체크리스트로 옮겼습니다.',
      };

  return (
    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
      <section data-testid="maintenance-routine-next-card" className={`order-2 lg:order-1 ${FLOWME_SUPPORT_CARD_CLASS}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={FLOWME_EYEBROW_CLASS}>반복 관리</p>
            <h3 className={FLOWME_TITLE_CLASS}>{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6E6B64]">
              시작일을 기준으로 캘린더에 넣을 관리일을 먼저 보여줍니다. 날짜마다 아래 체크리스트를 열어 확인하는 흐름입니다.
            </p>
          </div>
          <span className="rounded-full border border-[#DDE3FF] bg-[#EEF1FF] px-3 py-1 text-xs font-semibold text-[#3654FF]">{repeatLabel}</span>
        </div>
        <div className="mt-4 grid gap-2">
          {occurrenceDates.map((date, index) => {
            const key = `maintenance:${bundle.flow.slug}:${date}`;
            const state = workbenchState.occurrences[key] ?? {};
            const dateLabel = formatKoreanShortDate(date, { includeWeekday: true });
            return (
              <label key={key} className={`rounded-xl border px-3 py-2 text-sm ${state.done ? 'border-[#D8ECE1] bg-[#EAF7F0] text-[#1F8A5B]' : 'border-[#E7E4DD] bg-white text-[#1B1A17]'}`}>
                <span className="flex items-center gap-2">
                  <input
                    aria-label={getPreSavePreviewCheckboxLabel(dateLabel)}
                    className={FLOWME_CHECKBOX_CLASS}
                    checked={Boolean(state.done)}
                    onChange={(event) => onWorkbenchChange(updateOccurrenceDone(workbenchState, key, event.currentTarget.checked))}
                    type="checkbox"
                  />
                  <span className="text-xs font-semibold text-[#3654FF]">{dateLabel}</span>
                  <span className="font-semibold">{index === 0 ? '이번 관리일' : `${index + 1}번째 관리일`}</span>
                </span>
              </label>
            );
          })}
        </div>
        <ArtifactExportButtons
          actions={exportActions}
          kinds={['calendar', 'copy', 'draft']}
          labels={{ calendar: FLOW_EXPORT_LABELS.calendarFile, copy: FLOW_EXPORT_LABELS.memoCopy, draft: FLOW_EXPORT_LABELS.editableDraft }}
        />
        <ArtifactExportStatus actions={exportActions} />
      </section>

      <section data-testid="maintenance-routine-checklist-card" className={`order-1 lg:order-2 ${FLOWME_SURFACE_CARD_CLASS}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={FLOWME_EYEBROW_CLASS}>날짜 안 체크리스트</p>
            <h3 className={FLOWME_TITLE_CLASS}>{isWasher ? '통세척할 때 확인할 것' : '물 주기 전에 확인할 것'}</h3>
          </div>
          <span className={FLOWME_PROGRESS_CHIP_CLASS}>{items.length}개</span>
        </div>
        <div className="mt-3 grid gap-2">
          {items.map((item) => {
            const detail = getWorkbenchItemDetail(bundle, item.id);
            const isLongCycle = !isWasher && item.title.includes('분갈이');
            return (
              <div key={item.id} className={FLOWME_INNER_ROW_CLASS}>
                <label className="flex items-start gap-2">
                  <input
                    aria-label={getPreSavePreviewCheckboxLabel(item.title)}
                    className={`mt-0.5 shrink-0 ${FLOWME_CHECKBOX_CLASS}`}
                    checked={Boolean(checks[item.id])}
                    onChange={() => onToggleItem(item.id)}
                    type="checkbox"
                  />
                  <span className={`min-w-0 flex-1 ${getPreSavePreviewTextClass(Boolean(checks[item.id]))}`}>
                    <span className="font-medium">{item.title}</span>
                    {isLongCycle ? <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#8A5A12]">1~2년마다</span> : null}
                  </span>
                </label>
                <WorkbenchDetailDisclosure detail={detail} showSourceLinks={false} />
              </div>
            );
          })}
        </div>
        <div data-testid="maintenance-source-bridge" className={`mt-3 text-sm leading-6 text-[#1B1A17] ${FLOWME_COMPACT_SUPPORT_CARD_CLASS}`}>
          <p className="text-xs font-semibold text-[#3654FF]">원문에서 옮긴 실행 단서</p>
          <p className="mt-1 font-semibold">{sourceBridge.cues}</p>
          <p className="mt-1 text-xs leading-5 text-[#6E6B64]">{sourceBridge.conversion}</p>
          {'prep' in sourceBridge ? <p className="mt-2 text-xs leading-5 text-[#6E6B64]">{sourceBridge.prep}</p> : null}
          {'cadence' in sourceBridge ? <p className="mt-1 text-xs leading-5 text-[#6E6B64]">{sourceBridge.cadence}</p> : null}
          {bundle.flow.source_url ? (
            <a className="mt-2 inline-flex text-xs font-semibold text-[#3654FF] underline-offset-2 hover:underline" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
              원문 보기
            </a>
          ) : null}
        </div>
        {!isWasher ? (
          <div data-testid="maintenance-result-selector" className={`mt-3 ${FLOWME_SUCCESS_CARD_CLASS}`}>
            <p className="text-xs font-semibold text-[#1F8A5B]">오늘 결과</p>
            <p className="mt-1 text-sm leading-6 text-[#406B55]">체크리스트를 보고 이번 관리일의 결과만 고릅니다. 보류도 정상 결과입니다.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {maintenanceResultOptions.map((result) => (
                <button
                  key={result}
                  type="button"
                  aria-pressed={maintenanceResult === result}
                  className={`min-h-10 rounded-xl border px-3 text-sm font-semibold ${
                    maintenanceResult === result ? 'border-[#1F8A5B] bg-[#1F8A5B] text-white' : 'border-[#D8ECE1] bg-white text-[#1F8A5B]'
                  }`}
                  onClick={() => onWorkbenchChange(updateMemoCard(workbenchState, 'maintenanceResult', result))}
                >
                  {result}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <label className="mt-4 block text-sm font-semibold text-[#1B1A17]">
          관리 메모
          <textarea
            aria-label="관리 메모"
            className={`mt-2 min-h-28 w-full resize-y font-normal ${FLOWME_INPUT_CLASS}`}
            placeholder={memoPlaceholder}
            value={workbenchState.weeklyReview ?? ''}
            onChange={(event) => onWorkbenchChange(updateWeeklyReview(workbenchState, event.currentTarget.value))}
          />
        </label>
      </section>
    </div>
  );
}

function SpreadsheetLogTable({
  rows,
  columns,
  workbenchState,
  onWorkbenchChange,
}: {
  rows: string[];
  columns: string[];
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
}) {
  return (
    <table className="min-w-[760px] text-left text-sm">
      <thead className={FLOWME_TABLE_HEAD_CLASS}>
        <tr>
          {['날짜', ...columns].map((column) => (
            <th key={column} className="px-3 py-2">{column}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((date) => (
          <tr key={date} className="border-t border-[#E7E4DD]">
            <td className="px-3 py-3 font-semibold text-[#1B1A17]">{date}</td>
            {columns.map((column) => (
              <td key={`${date}-${column}`} className="px-2 py-2">
                <input
                  aria-label={`${date} ${column}`}
                  className={`w-full min-w-28 ${FLOWME_SMALL_INPUT_CLASS}`}
                  placeholder={spreadsheetPlaceholder(column)}
                  value={workbenchState.logRows[date]?.[column] ?? ''}
                  onChange={(event) => onWorkbenchChange(updateLogField(workbenchState, date, column, event.currentTarget.value))}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FridgeMobileActiveRowCard({
  date,
  columns,
  workbenchState,
  onWorkbenchChange,
}: {
  date: string;
  columns: string[];
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
}) {
  return (
    <div data-testid="fridge-mobile-active-row" className="mx-3 mt-3 rounded-2xl border border-[#D8ECE1] bg-[#F4FBF7] p-3 md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-[#1F8A5B]">오늘 먼저 기록</p>
          <h4 data-testid="fridge-active-row-title" className="mt-1 line-clamp-2 break-keep text-sm font-semibold leading-5 text-[#1B1A17]">재고 행 · {formatKoreanShortDate(date)}</h4>
        </div>
        <span className="rounded-full border border-[#D8ECE1] bg-white px-2 py-1 text-xs font-semibold text-[#1F8A5B]">오늘 행</span>
      </div>
      <div className="mt-3 grid gap-2">
        {columns.map((column) => (
          <label key={column} className="grid gap-1 text-sm font-semibold text-[#1B1A17]">
            <span>{column}</span>
            <input
              aria-label={`오늘 재고 행 ${column}`}
              className={`w-full font-normal ${FLOWME_SMALL_INPUT_CLASS}`}
              placeholder={spreadsheetPlaceholder(column)}
              value={workbenchState.logRows[date]?.[column] ?? ''}
              onChange={(event) => onWorkbenchChange(updateLogField(workbenchState, date, column, event.currentTarget.value))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function MobileSpreadsheetSummaryCard({ date, columns, bundle }: { date: string; columns: string[]; bundle: FlowBundle }) {
  const isFridgeCleanout = bundle.flow.slug === 'fridge-cleanout-weekly-plan';
  const previewColumns = columns.slice(0, 3);
  const title =
    bundle.flow.slug === 'diet-habit-2week'
      ? '오늘 관찰 행'
      : isFridgeCleanout
        ? '오늘 재고 행'
        : '오늘 기록 행';

  return (
    <div data-testid="mobile-artifact-summary-card" className={`mt-3 md:hidden ${FLOWME_COMPACT_SUPPORT_CARD_CLASS}`}>
      <p className="text-xs font-semibold text-[#3654FF]">먼저 채울 행</p>
      <h4 className="mt-1 text-sm font-semibold text-[#1B1A17]">{title} · {formatKoreanShortDate(date)}</h4>
      {isFridgeCleanout ? (
        <p className="mt-2 text-sm leading-6 text-[#6E6B64]">우선 재료와 메뉴 후보부터 적고, 나머지 날짜는 필요할 때만 펼칩니다.</p>
      ) : (
        <dl className="mt-2 grid gap-2 text-sm">
          {previewColumns.map((column) => (
            <div key={column} className={FLOWME_INNER_ROW_CLASS}>
              <dt className="text-xs font-semibold text-[#6E6B64]">{column}</dt>
              <dd className="mt-1 text-[#1B1A17]">{spreadsheetPlaceholder(column)}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 text-xs font-medium text-[#3654FF]">{isFridgeCleanout ? '기록 결과는 시트로 받을 수 있습니다.' : '전체 행은 아래 표에서 확인하고, 기록은 시트로 받을 수 있습니다.'}</p>
    </div>
  );
}

function getSpreadsheetColumns(bundle: FlowBundle): string[] {
  if (bundle.flow.slug === 'diet-habit-2week') return dietObservationColumns;
  if (bundle.flow.slug === 'fridge-cleanout-weekly-plan') return fridgeCleanoutColumns;
  return defaultSpreadsheetColumns;
}

function spreadsheetPlaceholder(column: string): string {
  if (column === '우선 재료') return '예: 양파, 두부, 시금치';
  if (column === '메뉴 후보') return '예: 볶음밥 / 된장국';
  if (column === '장보기 보류') return '예: 당근 보류, 우유 필요';
  if (column === '상태') return '예: 처리 / 보류 / 폐기확인';
  if (column === '메모') return '예: 냄새 확인 후 폐기';
  if (column === '식단' || column === '식사 관찰') return '아침/점심/저녁';
  if (column === '활동') return '예: 30분 걷기';
  if (column === '수면/측정') return '예: 수면 6시간 / 허리 82cm';
  if (column === '중단/상담 조건') return '예: 어지러움 반복 시 중단 후 상담';
  return column;
}

function ChecklistWorkbench({
  bundle,
  anchor = '',
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  anchor?: string;
  checks: Record<string, boolean>;
  workbenchState?: FlowWorkbenchState;
  onWorkbenchChange?: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const isJeonsePrecheck = bundle.flow.slug === 'jeonse-contract-precheck-docs';
  if (isJeonsePrecheck) {
    return (
      <JeonseContractWorkbench
        bundle={bundle}
        anchor={anchor}
        checks={checks}
        workbenchState={workbenchState}
        onWorkbenchChange={onWorkbenchChange}
        onToggleItem={onToggleItem}
        exportActions={exportActions}
      />
    );
  }

  const listTitle = bundle.flow.slug === 'new-car-delivery-check' || bundle.flow.slug === 'used-car-buying-check' ? '현장 체크리스트' : '실행 리스트';
  const holdSection = workbenchState && onWorkbenchChange ? <HoldSectionCard bundle={bundle} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} /> : null;
  const putChecklistFirst = bundle.flow.slug === 'used-car-buying-check';
  const visibleItems = getExecutableItems(bundle).slice(0, bundle.flow.slug === 'used-car-buying-check' ? bundle.items.length : 10);
  const visibleDetails = visibleItems.map((item) => getWorkbenchItemDetail(bundle, item.id));
  const repeatedCaution = getRepeatedWorkbenchCaution(visibleDetails);

  return (
    <div className="space-y-4">
      {!putChecklistFirst ? holdSection : null}
      <div data-testid="artifact-list-card" className={FLOWME_PANEL_CARD_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className={FLOWME_TITLE_CLASS}>{listTitle}</h3>
          <ArtifactExportButtons actions={exportActions} kinds={['copy', 'excel', 'draft']} />
        </div>
        <ArtifactExportStatus actions={exportActions} />
        {bundle.flow.slug === 'used-car-buying-check' ? <UsedCarSourceBridge sourceUrl={bundle.flow.source_url} /> : null}
        {repeatedCaution ? (
          <div data-testid="workbench-common-detail-caution" className="mt-3 rounded-xl border border-[#F1DDB8] bg-[#FFF9EC] px-3 py-2 text-sm leading-6 text-[#5F4115]">
            <p className="font-semibold text-[#8A5A12]">공통 주의</p>
            <p className="mt-1">{repeatedCaution}</p>
          </div>
        ) : null}
        {bundle.flow.slug === 'used-car-buying-check' && workbenchState && onWorkbenchChange ? (
          <UsedCarDecisionResultCard workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} />
        ) : null}
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {visibleItems.map((item, index) => {
            const detail = visibleDetails[index];
            return (
              <div key={item.id} className={FLOWME_INNER_ROW_CLASS}>
                <label className="flex gap-2">
                  <input
                    aria-label={getPreSavePreviewCheckboxLabel(item.title)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#D8D5CD] text-[#3654FF]"
                    checked={Boolean(checks[item.id])}
                    onChange={() => onToggleItem(item.id)}
                    type="checkbox"
                  />
                  <span className={`font-medium ${getPreSavePreviewTextClass(Boolean(checks[item.id]))}`}>{item.title}</span>
                </label>
                <WorkbenchDetailDisclosure
                  detail={detail}
                  showSourceLinks={Boolean(detail?.links?.some((link) => link.type === 'official'))}
                  suppressedCaution={repeatedCaution}
                />
              </div>
            );
          })}
        </div>
      </div>
      {putChecklistFirst ? holdSection : null}
    </div>
  );
}

function JeonseContractWorkbench({
  bundle,
  anchor,
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  anchor: string;
  checks: Record<string, boolean>;
  workbenchState?: FlowWorkbenchState;
  onWorkbenchChange?: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const displayAnchor = anchor || '2026-06-07';
  const rows = scheduleRows(bundle, displayAnchor);
  const defaultSelectedDate = rows.find((row) => row.timing === 'D-3')?.startDate ?? rows[0]?.startDate ?? displayAnchor;
  const [selectedDate, setSelectedDate] = useState(defaultSelectedDate);
  useEffect(() => {
    setSelectedDate(defaultSelectedDate);
  }, [defaultSelectedDate]);
  const selectedRows = rows.filter((row) => row.startDate === selectedDate);
  const firstRow = selectedRows[0] ?? rows.find((row) => row.timing === 'D-3') ?? rows[0];
  const groups = getJeonseChecklistGroups(bundle);
  const [activeView, setActiveView] = useState<'schedule' | 'all'>('schedule');
  const calendarSummary = rows.reduce<Record<string, ScheduleRow[]>>((acc, row) => {
    acc[row.startDate] = [...(acc[row.startDate] ?? []), row];
    return acc;
  }, {});
  const mobileCalendarRows = Object.values(calendarSummary)
    .map((dateRows) => dateRows[0])
    .sort((left, right) => left.startDate.localeCompare(right.startDate));
  const calendarDays = getJeonseCalendarDays(displayAnchor);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="전세 계약 체크 보기">
        <JeonseViewTab active={activeView === 'schedule'} label="일정 보기" onClick={() => setActiveView('schedule')} />
        <JeonseViewTab active={activeView === 'all'} label="전체 보기" onClick={() => setActiveView('all')} />
      </div>

      {activeView === 'schedule' ? (
        <>
          <section data-testid="jeonse-source-bridge" className="rounded-lg border border-slate-200 bg-white p-3 md:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">생성되는 일정 3개</p>
                <h3 className="mt-1 text-base font-semibold text-slate-950">계약 예정일 {formatShortKoreanDate(displayAnchor)} 기준</h3>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              {mobileCalendarRows.map((row) => {
                const isActive = selectedDate === row.startDate;
                const progress = getJeonseProgress(getJeonseItemsForRow(bundle, row), checks);
                const status = getJeonseDateStatus(row, progress);
                return (
                  <button
                    key={row.startDate}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedDate(row.startDate)}
                    className={`rounded-md border px-3 py-3 text-left text-sm ${
                      isActive ? 'border-blue-700 bg-blue-50 text-blue-950 ring-2 ring-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <span className="block text-xs font-semibold text-slate-500">{formatShortKoreanDate(row.startDate)} · {row.timing}</span>
                    <span className="mt-1 block font-semibold">{jeonseEventTitle(row.timing)}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-600">{formatPreSavePreviewProgress(progress.done, progress.total)}</span>
                    {status ? <span className="mt-1 block text-xs font-semibold text-amber-700">{status}</span> : null}
                  </button>
                );
              })}
            </div>
          </section>

          {firstRow ? (
            <JeonseSelectedEventCard
              bundle={bundle}
              row={firstRow}
              checks={checks}
              workbenchState={workbenchState}
              onWorkbenchChange={onWorkbenchChange}
              onToggleItem={onToggleItem}
            />
          ) : null}

          <JeonseCalendarPreview days={calendarDays} rows={mobileCalendarRows} selectedDate={selectedDate} onSelectDate={setSelectedDate} />

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm font-semibold text-blue-900">이 3개 일정을 캘린더에 넣습니다.</p>
            <button
              type="button"
              className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300"
              disabled={!exportActions?.canExportCalendar}
              onClick={exportActions?.onDownloadCalendar}
            >
              {FLOW_EXPORT_LABELS.calendarFile}
            </button>
          </section>
        </>
      ) : (
        <section data-testid="jeonse-all-items" className="rounded-lg border border-slate-200 bg-white p-3 md:p-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">전체 보기</p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">전체 체크 항목 7개</h3>
            <p className="mt-1 text-xs font-medium text-slate-500">법률 판단이나 민감정보는 FLOW에 저장하지 않습니다.</p>
          </div>
          <div className="mt-3 grid gap-3">
            {groups.map((group) => (
              <section key={group.title} className="rounded-md border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-950">{group.title}</h4>
                  <span className="text-xs font-semibold text-slate-500">
                    {group.timing} · {formatPreSavePreviewProgress(getJeonseProgress(group.items, checks).done, group.items.length)}
                  </span>
                </div>
                <div className="mt-2 grid gap-2">
                  {group.items.map((item) => {
                    const detail = getWorkbenchItemDetail(bundle, item.id);
                    return (
                      <div key={item.id} className="border-t border-slate-100 pt-2 first:border-t-0 first:pt-0">
                        <label className="flex gap-2 text-sm font-semibold text-slate-800">
                            <input
                            aria-label={getPreSavePreviewCheckboxLabel(item.title)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-700"
                            checked={Boolean(checks[item.id])}
                            onChange={() => onToggleItem(item.id)}
                            type="checkbox"
                          />
                          <span className={checks[item.id] ? 'text-blue-700' : ''}>{shortJeonseItemTitle(item.title)}</span>
                        </label>
                        <JeonseMemoDisclosure detail={detail} />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function JeonseCalendarPreview({
  days,
  rows,
  selectedDate,
  onSelectDate,
}: {
  days: Array<{ date: string; day: number } | null>;
  rows: ScheduleRow[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const rowsByDate = rows.reduce<Record<string, ScheduleRow>>((acc, row) => {
    acc[row.startDate] = row;
    return acc;
  }, {});
  const monthLabel = rows[0] ? formatKoreanMonth(rows[0].startDate) : '';

  return (
    <details data-testid="jeonse-calendar-preview" className="rounded-lg border border-slate-200 bg-white p-3 md:p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-950">캘린더 미리보기</h3>
            <p className="mt-1 text-sm font-medium text-slate-500">저장될 3개 일정이 월간 캘린더에 놓이는 위치를 확인합니다.</p>
          </div>
          {monthLabel ? <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">{monthLabel}</span> : null}
        </div>
      </summary>
      <div className="mt-3 grid grid-cols-7 overflow-hidden rounded-md border border-slate-200 bg-white text-xs">
        {['일', '월', '화', '수', '목', '금', '토'].map((weekday) => (
          <div key={weekday} className="border-b border-r border-slate-200 bg-slate-100 px-1 py-2 text-center font-semibold text-slate-600 last:border-r-0">
            {weekday}
          </div>
        ))}
        {days.map((day, index) => {
          const row = day ? rowsByDate[day.date] : undefined;
          const isActive = selectedDate === day?.date;
          return (
            <button
              key={day?.date ?? `empty-${index}`}
              type="button"
              aria-pressed={isActive}
              disabled={!row}
              onClick={() => {
                if (day) onSelectDate(day.date);
              }}
              className={`min-h-20 border-r border-slate-200 p-1 text-left last:border-r-0 md:min-h-24 ${day ? 'bg-white' : 'bg-slate-50'} ${isActive ? 'bg-blue-50 ring-2 ring-inset ring-blue-700' : ''} ${
                row ? 'cursor-pointer hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-700' : 'cursor-default'
              }`}
            >
              {day ? <p className="font-semibold text-slate-700">{day.day}</p> : null}
              {row ? (
                <div className="mt-1 rounded border border-blue-100 bg-blue-50 px-1.5 py-1 text-[11px] font-semibold leading-4 text-blue-900">
                  <span className="block">{row.timing}</span>
                  <span className="block truncate">{jeonseEventTitle(row.timing)}</span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs font-semibold ${
              selectedDate === row.startDate ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
            onClick={() => onSelectDate(row.startDate)}
          >
            <span>{row.timing}</span>
            <span className="min-w-0 truncate">{row.startDate} · {jeonseEventTitle(row.timing)}</span>
          </button>
        ))}
      </div>
    </details>
  );
}

function JeonseViewTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`min-h-10 rounded-md px-3 text-sm font-semibold ${active ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/70 hover:text-slate-950'}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function JeonseSelectedEventCard({
  bundle,
  row,
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
}: {
  bundle: FlowBundle;
  row: ScheduleRow;
  checks: Record<string, boolean>;
  workbenchState?: FlowWorkbenchState;
  onWorkbenchChange?: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
}) {
  const relatedItems = getJeonseItemsForRow(bundle, row);
  const progress = getJeonseProgress(relatedItems, checks);
  const status = getJeonseDateStatus(row, progress);
  const holdMemoField = `jeonseHold:${row.startDate}`;
  const holdMemo = workbenchState?.memoCards?.[holdMemoField] ?? '';
  return (
    <section data-testid="jeonse-selected-event-card" className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{formatKoreanFullDate(row.startDate)} · {row.timing}</p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">{jeonseEventTitle(row.timing)}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">이 날의 체크 항목 {relatedItems.length}개</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">{formatPreSavePreviewProgress(progress.done, progress.total)}</span>
          {status ? <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{status}</span> : null}
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {relatedItems.map((item) => (
          <label key={item.id} className="flex gap-2 text-sm font-semibold text-slate-800">
            <input
              aria-label={getPreSavePreviewCheckboxLabel(item.title)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-700"
              checked={Boolean(checks[item.id])}
              onChange={() => onToggleItem(item.id)}
              type="checkbox"
            />
            <span className={checks[item.id] ? 'text-blue-700' : ''}>{shortJeonseItemTitle(item.title)}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 grid gap-2 text-sm">
        <p className="font-semibold text-slate-500">주의할 점</p>
        <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 leading-6 text-slate-700">걸리는 항목이 있으면 계약 전 공인중개사나 전문가에게 확인합니다. 법률 판단, 계약서 원문, 주민등록번호, 계좌번호는 저장하지 않습니다.</p>
      </div>
      {workbenchState && onWorkbenchChange ? (
        <details data-testid="jeonse-hold-memo" className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-amber-900">
            보류 사유 남기기{holdMemo.trim() ? ' · 메모 있음' : ''}
          </summary>
          <label className="mt-2 grid gap-1 font-semibold text-amber-950">
            확인이 남은 이유
            <textarea
              aria-label="보류 사유 메모"
              className="min-h-20 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              placeholder="예: 보증보험 가능 여부를 보증기관에 다시 확인하기"
              value={holdMemo}
              onChange={(event) => onWorkbenchChange(updateMemoCard(workbenchState, holdMemoField, event.currentTarget.value))}
            />
          </label>
        </details>
      ) : null}
      {bundle.flow.source_url ? (
        <div className="mt-3 grid gap-2 text-sm">
          <p className="font-semibold text-slate-500">참고 링크</p>
          <a className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-blue-700 hover:border-blue-300" href={bundle.flow.source_url} target="_blank" rel="noreferrer">
            카카오페이 원문
          </a>
        </div>
      ) : null}
    </section>
  );
}

function JeonseMemoDisclosure({ detail }: { detail?: WorkbenchItemDetail }) {
  const memo = detail?.how ?? detail?.caution ?? detail?.completion_criteria;
  if (!memo) return null;

  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold text-blue-700">상세 메모</summary>
      <p className="mt-1 leading-6 text-slate-600">{memo}</p>
    </details>
  );
}

function getJeonseItemsForRow(bundle: FlowBundle, row: ScheduleRow): FlowItem[] {
  const sourceItem = getExecutableItems(bundle).find((candidate) => candidate.id === row.id);
  return getExecutableItems(bundle).filter((item) => item.day_offset === sourceItem?.day_offset);
}

function getJeonseProgress(items: FlowItem[], checks: Record<string, boolean>): { done: number; total: number } {
  return {
    done: items.filter((item) => Boolean(checks[item.id])).length,
    total: items.length,
  };
}

function getJeonseDateStatus(row: ScheduleRow, progress: { done: number; total: number }): string {
  if (progress.total > 0 && progress.done >= progress.total) return '확인 표시됨';
  if (row.startDate < formatDate(new Date())) return '지난 일정 · 확인 필요';
  return '';
}

function getJeonseChecklistGroups(bundle: FlowBundle) {
  const grouped = getExecutableItems(bundle).reduce<Array<{ title: string; timing: string; items: FlowItem[] }>>((acc, item) => {
    const title = getSectionTitle(bundle, item.section_id) || '기타';
    const timing = timingLabel(item.day_offset, item.duration_days);
    const existing = acc.find((group) => group.title === title);
    if (existing) {
      existing.items.push(item);
      return acc;
    }
    return [...acc, { title, timing, items: [item] }];
  }, []);

  return grouped;
}

function getJeonseCalendarDays(anchor: string): Array<{ date: string; day: number } | null> {
  const base = new Date(`${anchor}T00:00:00`);
  const monthStart = new Date(base.getFullYear(), base.getMonth(), 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const days: Array<{ date: string; day: number } | null> = Array.from({ length: monthStart.getDay() }, () => null);
  for (let day = 1; day <= lastDay; day += 1) {
    days.push({ date: `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, day });
  }
  return days;
}

function formatKoreanMonth(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  return `${value.getFullYear()}년 ${value.getMonth() + 1}월`;
}

function formatShortKoreanDate(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  return `${value.getMonth() + 1}월 ${value.getDate()}일`;
}

function formatKoreanFullDate(date: string): string {
  const value = new Date(`${date}T00:00:00`);
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  return `${value.getFullYear()}년 ${value.getMonth() + 1}월 ${value.getDate()}일 ${weekdays[value.getDay()]}`;
}

function jeonseEventTitle(timing: string): string {
  if (timing === 'D-3') return '계약 전 서류 확인';
  if (timing === 'D-Day') return '계약서 정보 확인';
  if (timing === 'D+1') return '입주 후 보호 절차';
  return '보류 사유와 문의 대상 메모';
}

function shortJeonseCalendarTitle(title: string): string {
  return title
    .replace('시세와 등기부등본 권리관계 확인하기', '계약 전 서류 확인')
    .replace('전세보증보험 가능 여부 확인하기', '보증보험 가능 여부')
    .replace('중개사와 표준계약서 확인하기', '표준계약서 확인')
    .replace('계약서 정보 일치 여부 확인하기', '계약서 정보 확인')
    .replace('확정일자와 임대차신고 일정 저장하기', '확정일자/신고 일정')
    .replace('전세보증보험 가입 확인하기', '보증보험 후속 확인')
    .replace('보류 사유와 문의 대상 메모하기', '보류 사유 메모');
}

function shortJeonseItemTitle(title: string): string {
  return title
    .replace('시세와 등기부등본 권리관계 확인하기', '시세와 등기부등본 확인')
    .replace('전세보증보험 가능 여부 확인하기', '전세보증보험 가능 여부 확인')
    .replace('중개사와 표준계약서 확인하기', '중개사와 표준계약서 확인')
    .replace('계약서 정보 일치 여부 확인하기', '계약서 정보 일치 여부 확인')
    .replace('확정일자와 임대차신고 일정 저장하기', '확정일자와 임대차신고 일정 저장')
    .replace('전세보증보험 가입 확인하기', '전세보증보험 가입 확인')
    .replace('보류 사유와 문의 대상 메모하기', '보류 사유와 문의 대상 메모');
}

function UsedCarDecisionResultCard({
  workbenchState,
  onWorkbenchChange,
}: {
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
}) {
  const selectedDecision = workbenchState.memoCards.usedCarDecision ?? '';
  const decisions = ['구매 진행', '보류', '거절'];

  return (
    <section data-testid="used-car-decision-result-card" className={`mt-3 ${FLOWME_COMPACT_SUPPORT_CARD_CLASS} bg-[#FFF7E8] text-sm leading-6 text-[#4A4842]`}>
      <p className="text-xs font-semibold text-[#8A5A12]">점검 후 판단</p>
      <h4 className="mt-1 text-sm font-semibold text-[#1B1A17]">현장 체크가 끝나면 구매/보류/거절 중 하나만 남깁니다</h4>
      <p className="mt-1 text-xs leading-5 text-[#6E6B64]">
        사진 저장은 필수가 아닙니다. 공식 조회, 정비소 점검, 판매자 설명이 맞지 않으면 아래 보류 메모에 이유만 남깁니다.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {decisions.map((decision) => (
          <button
            key={decision}
            type="button"
            aria-pressed={selectedDecision === decision}
            className={`min-h-10 rounded-xl border px-3 text-sm font-semibold ${
              selectedDecision === decision ? 'border-[#8A5A12] bg-[#8A5A12] text-white' : 'border-[#E7E4DD] bg-white text-[#1B1A17]'
            }`}
            onClick={() => onWorkbenchChange(updateMemoCard(workbenchState, 'usedCarDecision', decision))}
          >
            {decision}
          </button>
        ))}
      </div>
    </section>
  );
}

function UsedCarSourceBridge({ sourceUrl }: { sourceUrl?: string }) {
  return (
    <div data-testid="used-car-source-bridge" className={`mt-3 ${FLOWME_COMPACT_SUPPORT_CARD_CLASS} text-sm leading-6 text-[#1B1A17]`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-[#3654FF]">원문에서 옮긴 점검 순서</p>
          <p className="mt-1 text-[#1B1A17]">조회 → 낮 시간 방문 → 외관/타이어/침수 → 엔진/시동/변속/제동 → 서류/정비소 → 계약 조건 순서로 확인합니다.</p>
        </div>
        {sourceUrl ? (
          <a className="shrink-0 rounded-xl border border-[#D8D5CD] bg-white px-2 py-1 text-xs font-semibold text-[#3654FF]" href={sourceUrl} target="_blank" rel="noreferrer">
            원문 보기
          </a>
        ) : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-[#6E6B64]">사진은 필수 입력이 아니라 필요할 때만 메모합니다. 구매 판단은 공식 조회와 전문가 점검 결과를 우선합니다.</p>
    </div>
  );
}

function StepProgressWorkbench({
  bundle,
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  checks: Record<string, boolean>;
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const orderedSections = bundle.sections.slice().sort((a, b) => a.order - b.order);
  const stages = (orderedSections.length
    ? orderedSections
    : [{ id: 'all', title: '단계', order: 1 }]
  ).map((section) => ({
    id: section.id,
    title: section.title,
    items: bundle.items.filter((item) => (orderedSections.length ? item.section_id === section.id : true)),
  }));
  const totalItems = stages.reduce((sum, stage) => sum + stage.items.length, 0);
  const doneItems = stages.reduce((sum, stage) => sum + stage.items.filter((item) => checks[item.id]).length, 0);
  const percent = totalItems ? Math.round((doneItems / totalItems) * 100) : 0;
  const currentStageIndex = stages.findIndex((stage) => stage.items.some((item) => !checks[item.id]));

  return (
    <div data-testid="step-progress-workbench" className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">단계 진행률</p>
            <h3 className="mt-1 text-base font-semibold text-gray-950">
              {stages.length}단계 중 {currentStageIndex === -1 ? stages.length : currentStageIndex + 1}단계 진행 중
            </h3>
          </div>
          <ArtifactExportButtons actions={exportActions} kinds={['copy', 'excel', 'draft']} />
        </div>
        <ArtifactExportStatus actions={exportActions} />
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div data-testid="step-progress-bar" className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${percent}%` }} />
          </div>
          <span className="shrink-0 text-sm font-semibold text-gray-700">{doneItems}/{totalItems} · {percent}%</span>
        </div>
      </div>
      <ol className="space-y-3">
        {stages.map((stage, stageIndex) => {
          const stageDone = stage.items.length > 0 && stage.items.every((item) => checks[item.id]);
          const isCurrent = stageIndex === currentStageIndex;
          return (
            <li
              key={stage.id}
              data-testid="step-progress-stage"
              data-current={isCurrent ? 'true' : undefined}
              data-complete={stageDone ? 'true' : undefined}
              className={`rounded-lg border p-4 ${
                stageDone
                  ? 'border-green-200 bg-green-50'
                  : isCurrent
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 bg-[#FAFAF8]'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    stageDone ? 'bg-green-600 text-white' : isCurrent ? 'bg-[#2563EB] text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {stageDone ? '✓' : stageIndex + 1}
                </span>
                <h4 className="text-base font-semibold text-gray-950">{stage.title}</h4>
                {isCurrent ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-blue-700">현재 단계</span>
                ) : null}
              </div>
              <div className="mt-3 grid gap-2">
                {stage.items.map((item) => (
                  <label key={item.id} className="flex gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
                    <input
                      aria-label={getPreSavePreviewCheckboxLabel(item.title)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                      checked={Boolean(checks[item.id])}
                      onChange={() => onToggleItem(item.id)}
                      type="checkbox"
                    />
                    <span className={`font-medium ${checks[item.id] ? 'text-blue-700' : 'text-gray-800'}`}>{item.title}</span>
                  </label>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
        <h3 className="text-base font-semibold text-gray-950">진행 메모</h3>
        <p className="mt-1 text-sm text-gray-600">단계마다 결과나 다음에 바꿀 점을 한곳에 남깁니다.</p>
        <textarea
          aria-label="단계 진행 메모"
          className="mt-3 min-h-24 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
          placeholder="예: 2단계에서 재료가 부족해 대체함 / 다음엔 분량 절반으로"
          value={workbenchState.weeklyReview ?? ''}
          onChange={(event) => onWorkbenchChange(updateWeeklyReview(workbenchState, event.currentTarget.value))}
        />
      </div>
    </div>
  );
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
