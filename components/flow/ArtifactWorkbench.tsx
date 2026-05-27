'use client';

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
import { addDays, formatDate, getRangeEnd } from '@/lib/flow/date';
import { timingLabel } from '@/lib/flow/parser';
import type { FlowBundle, FlowComparisonState, FlowItem, FlowItemState, FlowWorkbenchState } from '@/lib/flow/types';

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

const mobileArtifactCtaSlugs = new Set(['moving-d30-basic', 'computer-skills-d30-study', 'diet-habit-2week', 'new-car-delivery-check']);
const mealCalendarOnlySlugs = new Set(['baby-food-menu-recipe']);
const checkOnlyRoutineSlugs = new Set(['diet-habit-2week', 'real-thankyou-bubu-home-workout-starter', 'real-fitvely-diet-record-routine']);

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

  return (
    <section aria-label="Flow artifact workbench" className="my-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">내 실행판</p>
          <h2 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">{surfaceTitle(plan.primarySurface, bundle)}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{surfaceDescription(plan.primarySurface, bundle)}</p>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {done}/{total} 완료
        </span>
      </div>
      <div className="mt-5">
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
          <RoutineWorkbench bundle={bundle} anchor={anchor} weekdays={weekdays} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} exportActions={exportActions} />
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
        ) : (
          <ChecklistWorkbench
            bundle={bundle}
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

function ArtifactExportButtons({ actions, kinds, labels = {}, mobileArtifactLabel, mobileKinds }: { actions?: ArtifactExportActions; kinds: ArtifactExportActionKind[]; labels?: ArtifactExportLabels; mobileArtifactLabel?: string; mobileKinds?: ArtifactExportActionKind[] }) {
  if (!actions) return null;

  const disabled = actions.done === 0;
  const mobileExportKinds = mobileArtifactLabel ? mobileKinds ?? kinds : [];
  const disabledTitle = disabled ? '항목을 하나라도 체크하면 받을 수 있어요' : undefined;

  return (
    <>
    <div className="hidden flex-wrap gap-2 sm:flex">
      {kinds.map((kind) => {
        if (kind === 'copy') {
          return (
            <button key={kind} className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-800 disabled:bg-slate-300" disabled={disabled} title={disabledTitle} onClick={actions.onCopyText}>
              {labels.copy ?? '메모/노션에 복사'}
            </button>
          );
        }
        if (kind === 'excel') {
          return (
            <button key={kind} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700 disabled:border-slate-200 disabled:text-slate-400" disabled={disabled} title={disabledTitle} onClick={actions.onDownloadExcel}>
              {labels.excel ?? '엑셀로 받기'}
            </button>
          );
        }
        if (kind === 'calendar' && actions.canExportCalendar) {
          return (
            <button key={kind} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700 disabled:border-slate-200 disabled:text-slate-400" disabled={disabled} title={disabledTitle} onClick={actions.onDownloadCalendar}>
              {labels.calendar ?? '캘린더 받기'}
            </button>
          );
        }
        if (kind === 'draft') {
          return (
            <button key={kind} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700" onClick={actions.onCopyToEditableDraft}>
              {labels.draft ?? '내 버전'}
            </button>
          );
        }

        return null;
      })}
    </div>
    {mobileArtifactLabel ? (
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
    copy: { label: '텍스트 복사', aria: `텍스트 복사: ${artifactLabel}`, onClick: actions.onCopyText, disabled },
    excel: { label: '시트로 받기', aria: `시트로 받기: ${artifactLabel}`, onClick: actions.onDownloadExcel, disabled },
    calendar: { label: '캘린더로 받기', aria: `캘린더로 받기: ${artifactLabel}`, onClick: actions.onDownloadCalendar, disabled },
    draft: { label: '내 버전', aria: `내 버전 만들기: ${artifactLabel}`, onClick: actions.onCopyToEditableDraft, disabled: false },
  }[kind];

  return (
    <button
      key={kind}
      data-testid={`mobile-artifact-export-${kind}`}
      aria-label={config.aria}
      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700 disabled:border-slate-200 disabled:text-slate-400"
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
  if (kind === 'spreadsheet_log') return bundle.flow.slug === 'diet-habit-2week' ? '관찰 기록표' : '기록표';
  if (kind === 'log_table') return bundle.flow.slug === 'computer-skills-d30-study' ? '공부 기록표' : '기록표';
  return undefined;
}

function ArtifactExportStatus({ actions }: { actions?: ArtifactExportActions }) {
  if (!actions || (!actions.copyState && !actions.downloadState && !actions.calendarState)) return null;

  return (
    <div className="mt-2 text-sm font-semibold text-blue-700">
      {[actions.copyState, actions.downloadState, actions.calendarState].filter(Boolean).join(' · ')}
    </div>
  );
}

function surfaceTitle(surface: string, bundle: FlowBundle): string {
  if (surface === 'meal_reaction_log') return mealCalendarOnlySlugs.has(bundle.flow.slug) ? '식단표 + 레시피' : '식단표 + 반응 기록';
  if (surface === 'decision_table') return '후보 비교표';
  if (surface === 'routine_calendar') return '반복 캘린더';
  if (surface === 'spreadsheet_log') return '기록표';
  if (surface === 'timeline_calendar') return '월간 캘린더 + 실행 리스트';
  if (surface === 'memo_card') return '메모 카드';
  return '실행 리스트';
}

function surfaceDescription(surface: string, bundle: FlowBundle): string {
  if (surface === 'meal_reaction_log') {
    return mealCalendarOnlySlugs.has(bundle.flow.slug)
      ? '시작일 기준 메뉴와 새 재료, 레시피 확인 순서를 먼저 봅니다.'
      : '시작일 기준 메뉴와 새 재료를 먼저 보고, 먹은 뒤 반응을 기록합니다.';
  }
  if (surface === 'decision_table') return '먼저 후보를 비교하고, 아래 체크리스트로 현장에서 확인할 일을 이어갑니다.';
  if (surface === 'routine_calendar') return '시작일과 반복 요일을 기준으로 회차가 달력에 박히는 모습을 먼저 보여줍니다.';
  if (surface === 'spreadsheet_log') return '매일 남길 기록 열과 주간 리뷰 메모를 먼저 잡아둡니다.';
  if (surface === 'timeline_calendar') return '해야 할 일을 리스트로 훑고, 같은 항목이 월간 달력에서 어느 날짜에 걸리는지 봅니다.';
  if (surface === 'memo_card') return '나중에 다시 참고할 기준과 결정 메모를 한 장으로 정리합니다.';
  return '필요한 항목을 체크하고, 자세히에서 원문 기준과 완료 조건만 확인합니다.';
}

function getWorkbenchItemDetail(bundle: FlowBundle, itemId: string): WorkbenchItemDetail | undefined {
  return bundle.itemDetails?.find((detail) => detail.item_id === itemId);
}

function WorkbenchDetailDisclosure({ detail }: { detail?: WorkbenchItemDetail }) {
  if (!detail?.why && !detail?.how && !detail?.completion_criteria && !detail?.caution && !detail?.links?.length) return null;

  return (
    <details className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold text-blue-700">자세히</summary>
      <div className="mt-2 space-y-2 leading-6 text-slate-700">
        {detail.how ? <p><b>실행:</b> {detail.how}</p> : null}
        {detail.completion_criteria ? <p><b>완료:</b> {detail.completion_criteria}</p> : null}
        {detail.why ? <p><b>이유:</b> {detail.why}</p> : null}
        {detail.caution ? <p className="text-amber-800"><b>주의:</b> {detail.caution}</p> : null}
        {detail.links?.length ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {detail.links.map((link) => (
              <a key={`${link.label}-${link.url}`} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700" href={link.url} target="_blank" rel="noreferrer">
                {link.label}
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
  const listRows = rows.length
    ? rows.slice(0, 8)
    : getExecutableItems(bundle)
        .slice(0, 8)
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
      <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        <MiniMonthCalendar title="월간 캘린더" eyebrow="캘린더" month={month} rows={rows} exportActions={exportActions} mobileArtifactLabel={getMobileArtifactLabel(bundle, 'month_calendar')} />
        <div data-testid="artifact-list-card" className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">체크리스트</p>
              <h3 className="text-base font-semibold text-slate-950">실행 리스트</h3>
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
                <div key={row.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                  <label className="grid grid-cols-[22px_92px_1fr] gap-3">
                    <input
                      aria-label={`실행판 체크: ${row.title}`}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700"
                      checked={Boolean(checks[row.id])}
                      onChange={() => onToggleItem(row.id)}
                      type="checkbox"
                    />
                    <span className="font-mono text-xs font-semibold text-blue-700">{row.startDate ? `${row.timing} · ${row.startDate.slice(5)}` : row.timing}</span>
                    <span className={`font-medium ${checks[row.id] ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{row.title}</span>
                  </label>
                  <WorkbenchDetailDisclosure detail={detail} />
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
  const calendarSlots = slots.slice(0, 6);
  const reactionSlots = slots.slice(0, 3);
  const todayReactionSlot = reactionSlots[0];
  const calendarOnly = mealCalendarOnlySlugs.has(bundle.flow.slug);

  return (
    <div data-testid="meal-reaction-workbench" className="space-y-4">
      {bundle.flow.warning ? (
        <div data-testid="meal-sensitive-warning" className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">알레르기·전문가 확인</p>
          <p className="mt-1 text-sm leading-6 text-amber-950 md:hidden">
            아이 건강 상태, 알레르기, 시작 시기, 재료 선택은 전문가 또는 공식 정보를 확인하세요.
          </p>
          <details className="mt-2 text-sm leading-6 text-amber-950 md:hidden">
            <summary className="cursor-pointer font-semibold text-amber-900">주의 문구 전체 보기</summary>
            <p className="mt-1">{bundle.flow.warning}</p>
          </details>
          <p className="mt-1 hidden text-sm leading-6 text-amber-950 md:block">{bundle.flow.warning}</p>
        </div>
      ) : null}
      {todayReactionSlot && !calendarOnly ? (
        <div data-testid="meal-today-reaction-card" className="rounded-lg border border-blue-200 bg-white p-4 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">오늘 먹은 양 기록</p>
              <h3 className="mt-1 text-base font-semibold text-gray-950">{todayReactionSlot.menu_title}</h3>
              <p className="mt-1 text-sm text-gray-600">{mealSlotTiming(todayReactionSlot.day_offset, todayReactionSlot.duration_days, anchor)}</p>
            </div>
            <button
              data-testid="meal-reaction-sheet-export"
              aria-label={`시트로 받기: ${todayReactionSlot.menu_title} 오늘 먹은 양 반응 기록`}
              className="shrink-0 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-800"
              type="button"
              onClick={exportActions?.onDownloadExcel}
            >
              시트로 받기
            </button>
          </div>
          <div data-testid="meal-reaction-summary-card" className="mt-3 rounded-md border border-blue-100 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase text-blue-700">reaction summary</p>
            <div className="mt-2 grid gap-2 text-sm">
              <div data-testid="meal-summary-slot" className="rounded-md bg-white px-3 py-2">
                <p className="text-xs font-semibold text-gray-500">Today slot</p>
                <p className="mt-1 font-medium text-gray-900">{todayReactionSlot.menu_title}</p>
                <p className="mt-1 text-gray-700">{mealSlotTiming(todayReactionSlot.day_offset, todayReactionSlot.duration_days, anchor)}</p>
              </div>
              <div data-testid="meal-summary-new-ingredients" className="rounded-md bg-white px-3 py-2">
                <p className="text-xs font-semibold text-gray-500">New ingredient</p>
                <p className="mt-1 text-gray-800">{todayReactionSlot.new_ingredients.length ? todayReactionSlot.new_ingredients.join(', ') : '-'}</p>
              </div>
              <div data-testid="meal-summary-reaction-fields" className="rounded-md bg-white px-3 py-2">
                <p className="text-xs font-semibold text-gray-500">Reaction fields</p>
                <p className="mt-1 text-gray-800">{mealReactionColumns.slice(0, 4).map((column) => column.label).join(' / ')}</p>
              </div>
            </div>
            <p data-testid="meal-summary-allergy-cue" className="mt-2 text-xs font-medium text-blue-800">
              Watch the first serving and keep any unusual reaction for professional review.
            </p>
          </div>
          <div className="mt-3 grid gap-2">
            {mealReactionColumns.slice(0, 4).map((column) => (
              <label key={column.id} className="text-sm font-semibold text-gray-700">
                {column.label}
                <input
                  aria-label={`${todayReactionSlot.menu_title} / ${column.label}`}
                  className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-normal text-gray-800"
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
        <div data-testid="artifact-calendar-card" className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">식단 일정 preview</p>
              <h3 className="mt-1 text-base font-semibold text-gray-950">처음 6개 식단</h3>
            </div>
            <ArtifactExportButtons actions={exportActions} kinds={['calendar']} />
          </div>
          <ArtifactExportStatus actions={exportActions} />
          <div className="mt-3 space-y-2">
            {calendarSlots.map((slot) => {
              const recipe = bundle.recipes?.find((item) => item.id === slot.recipe_id);
              const isChecked = isMealSlotChecked(slot, anchor, checks);
              return (
                <div key={slot.id} className="rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
                  <label className="grid grid-cols-[22px_112px_1fr] gap-3">
                    <input
                      aria-label={`이유식 완료: ${slot.menu_title}`}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300"
                      checked={isChecked}
                      onChange={() => onToggleItem(slot.id)}
                      type="checkbox"
                    />
                    <span className="font-mono text-xs font-semibold text-blue-700">{mealSlotTiming(slot.day_offset, slot.duration_days, anchor)}</span>
                    <span className={isChecked ? 'text-gray-400 line-through' : 'text-gray-800'}>
                      <span className="block font-medium">{slot.menu_title}</span>
                      {slot.new_ingredients.length ? (
                        <span className="mt-1 block text-xs text-gray-500">새 재료: {slot.new_ingredients.join(', ')}</span>
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
        <div data-testid="meal-reaction-log-card" className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
          <div className="border-b border-gray-100 px-3 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">먹은 뒤 기록</p>
                <h3 className="mt-1 text-base font-semibold text-gray-950">반응 기록표</h3>
              </div>
              <ArtifactExportButtons actions={exportActions} kinds={['copy', 'excel', 'draft']} />
            </div>
            <ArtifactExportStatus actions={exportActions} />
            <p className="mt-2 text-sm leading-6 text-gray-600">레시피 평가는 뒤로 미루고, 먹은 양과 이상 반응을 먼저 남깁니다.</p>
          </div>
          <table className="min-w-[860px] text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
              <tr>
                <th className="px-3 py-2">식단</th>
                {mealReactionColumns.map((column) => (
                  <th key={column.id} className="px-3 py-2">{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reactionSlots.map((slot) => (
                <tr key={slot.id} className="border-t border-gray-100">
                  <th className="px-3 py-3 text-sm font-semibold text-gray-900">
                    <span className="block">{slot.menu_title}</span>
                    <span className="mt-1 block text-xs font-medium text-gray-500">{mealSlotTiming(slot.day_offset, slot.duration_days, anchor)}</span>
                  </th>
                  {mealReactionColumns.map((column) => (
                    <td key={`${slot.id}-${column.id}`} className="px-2 py-2">
                      <input
                        aria-label={`${slot.menu_title} / ${column.label}`}
                        className="w-full min-w-28 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
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

function mealSlotTiming(dayOffset: number, durationDays: number, anchor: string): string {
  const timing = timingLabel(dayOffset, durationDays);
  if (!anchor) return timing;
  const start = addDays(new Date(anchor), dayOffset);
  const end = durationDays > 1 ? getRangeEnd(start, durationDays) : undefined;
  return end ? `${timing} · ${formatDate(start).slice(5)}~${formatDate(end).slice(5)}` : `${timing} · ${formatDate(start).slice(5)}`;
}

function RecipeDisclosure({ recipe }: { recipe: WorkbenchRecipe }) {
  return (
    <details className="mt-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm">
      <summary className="cursor-pointer font-semibold text-blue-700">레시피 보기</summary>
      <div className="mt-2 grid gap-3 leading-6 text-gray-700 md:grid-cols-2">
        <div>
          <p className="font-semibold text-gray-900">재료</p>
          <ul className="mt-1 list-disc pl-5">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.name}>{ingredient.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-gray-900">조리 방법</p>
          <ol className="mt-1 list-decimal pl-5">
            {recipe.steps.map((step) => (
              <li key={step.order}>{step.text}</li>
            ))}
          </ol>
        </div>
        {recipe.texture_note ? <p><b>분량/농도:</b> {recipe.texture_note}</p> : null}
        {recipe.storage_note ? <p><b>보관:</b> {recipe.storage_note}</p> : null}
        {recipe.caution_note ? <p className="text-amber-800"><b>주의:</b> {recipe.caution_note}</p> : null}
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
    <div data-testid="artifact-calendar-card" className="rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-sm font-semibold text-blue-700">{eyebrow}</p> : null}
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-600">{month}</span>
          <ArtifactExportButtons actions={exportActions} kinds={['calendar']} mobileArtifactLabel={mobileArtifactLabel} mobileKinds={['calendar']} />
        </div>
      </div>
      <ArtifactExportStatus actions={exportActions} />
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
        {weekdayOrder.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dayRows = date ? rows.filter((row) => row.startDate === date) : [];
          return (
            <div key={`${month}-${index}`} className={`min-h-16 rounded-md border p-1 text-xs ${date ? 'border-slate-200 bg-slate-50' : 'border-slate-100 bg-slate-50/60'}`}>
              {date ? <p className="font-semibold text-slate-600">{date.slice(8)}</p> : null}
              {dayRows.slice(0, 2).map((row) => (
                <p key={row.id} className={`mt-1 truncate rounded px-1 py-0.5 text-left text-[11px] font-medium ${doneIds?.has(row.id) ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-blue-700'}`}>
                  {doneIds?.has(row.id) ? '완료 ' : ''}{row.title}
                </p>
              ))}
              {dayRows.length > 2 ? <p className="mt-1 text-[11px] text-slate-500">+{dayRows.length - 2}</p> : null}
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
  const eyebrow = isSleepCheck ? '수면 체크 캘린더' : isHomeWorkout ? '홈트 캘린더' : isMealCheck ? '식단 체크 캘린더' : '회차 그리드 · primary';
  const title = isSleepCheck ? '14일 수면 체크' : isHomeWorkout ? '4주 홈트 체크' : isMealCheck ? '아침·점심·저녁 식단 체크' : `${occurrenceSummary} 루틴`;
  const description = isSleepCheck
    ? '매일 8시간 이상 잤는지만 완료로 표시합니다.'
    : isHomeWorkout
      ? '운동하는 날에 홈트 완료만 표시합니다.'
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
    <section aria-label="반복 캘린더 미리보기" data-testid="artifact-calendar-card" className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div data-testid="routine-session-grid-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">{eyebrow}</p>
            <h3 className="text-base font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-sm font-semibold text-slate-600">{month}</span>
            <ArtifactExportButtons
              actions={exportActions}
              kinds={['calendar', 'excel', 'draft']}
              labels={{ calendar: '캘린더에 넣기 · .ics', excel: '시트로 받기 · .xlsx', draft: '편집' }}
            />
          </div>
        </div>
        <ArtifactExportStatus actions={exportActions} />
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-md border border-blue-100 bg-blue-50 px-3 py-1 font-semibold text-blue-700">{isHomeWorkout ? '주 3회 홈트' : isMealCheck ? '식사별 체크' : occurrenceSummary}</span>
          <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1 font-semibold text-slate-700">{isHomeWorkout ? '완료 체크만' : isMealCheck ? '아침·점심·저녁' : '주차 × 요일 회차표'}</span>
          {currentRow ? <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-800">현재 {currentRow.title}</span> : null}
        </div>
        <div className="mt-3 grid grid-cols-[64px_repeat(7,minmax(0,1fr))] gap-1 text-center text-xs font-semibold text-slate-500">
          <span />
          {routineGridWeekdayOrder.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-[64px_repeat(7,minmax(0,1fr))] gap-1">
          {weekRows.map((week, weekIndex) => (
            <div key={`routine-week-${weekIndex}`} className="contents">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">WEEK {weekIndex + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{weekIndex + 1}주차</p>
              </div>
              {week.map((row, dayIndex) => {
                if (!row) {
                  return (
                    <div key={`empty-${weekIndex}-${dayIndex}`} className="min-h-20 rounded-md border border-dashed border-slate-200 bg-slate-50/70 p-2 text-xs text-slate-400">
                      -
                    </div>
                  );
                }
                  const state = workbenchState.occurrences[row.id] ?? {};
                  const isCurrent = row.id === currentRow?.id;
                  return (
                    <label
                      key={row.id}
                      className={`min-h-20 rounded-md border p-2 text-left text-xs ${state.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : isCurrent ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-800'}`}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] font-semibold">{row.startDate.slice(5)}</span>
                        {isCurrent ? <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-blue-700">현재</span> : null}
                      </span>
                      <input
                        aria-label={`캘린더 회차 체크: ${row.title}`}
                        className="mt-2 h-3 w-3 rounded border-slate-300 text-blue-700"
                        checked={Boolean(state.done)}
                        onChange={(event) => onWorkbenchChange(updateOccurrenceDone(workbenchState, row.id, event.currentTarget.checked))}
                        type="checkbox"
                      />
                      <span className="ml-1 align-middle text-[11px] font-semibold">{state.done ? '완료 ' : ''}{row.title}</span>
                      <span className="mt-1 block text-[11px] text-slate-500">{row.timing}</span>
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
    <section data-testid="routine-session-log-card" className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">회차 기록표 · secondary</p>
          <h3 className="mt-1 text-base font-semibold text-gray-950">지난 회차 기록</h3>
          <p className="mt-1 text-sm text-gray-600">
            {isSleepCheck ? '각 날짜가 끝나면 8시간 이상 수면 여부와 한 줄 메모를 남깁니다.' : '각 회차가 끝나면 세트/강도와 한 줄 메모를 시트로 남깁니다.'}
          </p>
        </div>
        <ArtifactExportButtons
          actions={exportActions}
          kinds={['copy', 'excel', 'draft']}
          labels={{ copy: '오늘 기록 복사', excel: '시트로 받기 · .xlsx', draft: '편집' }}
        />
      </div>
      <ArtifactExportStatus actions={exportActions} />
      <div className="mt-3 overflow-x-auto rounded-md border border-gray-200 bg-white">
        <table className="min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
            <tr>
              <th className="px-3 py-2">날짜</th>
              <th className="px-3 py-2">회차</th>
              <th className="px-3 py-2">{valueLabel}</th>
              <th className="px-3 py-2">완료</th>
              <th className="px-3 py-2">한 줄 메모</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const state = workbenchState.occurrences[row.id] ?? {};
              return (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-gray-600">{row.startDate}</td>
                  <td className="px-3 py-2 font-semibold text-gray-900">{row.title}</td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`${valueLabel}: ${row.title}`}
                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
                      placeholder={isSleepCheck ? '예: 8시간 이상 / 23:30 취침' : '예: 20분 / RPE 7'}
                      value={workbenchState.logRows[row.id]?.intensity ?? ''}
                      onChange={(event) => onWorkbenchChange(updateLogField(workbenchState, row.id, 'intensity', event.currentTarget.value))}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`회차 완료: ${row.title}`}
                      className="h-4 w-4 rounded border-gray-300"
                      checked={Boolean(state.done)}
                      onChange={(event) => onWorkbenchChange(updateOccurrenceDone(workbenchState, row.id, event.currentTarget.checked))}
                      type="checkbox"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      aria-label={`회차 메모: ${row.title}`}
                      className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
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
    <div data-testid="artifact-comparison-card" className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">{eyebrow}</p>
          <h3 className="mt-1 text-base font-semibold text-gray-950">{title}</h3>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ArtifactExportButtons actions={exportActions} kinds={['copy', 'excel', 'draft']} mobileArtifactLabel={mobileArtifactLabel} mobileKinds={['excel']} />
          <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800" onClick={() => onComparisonChange(addComparisonCandidate(comparison))}>
            후보 추가
          </button>
        </div>
      </div>
      <ArtifactExportStatus actions={exportActions} />
      <MobileComparisonSummaryCard rows={rows} comparison={comparison} />
      <div
        className="grid min-w-[720px] bg-gray-50 text-xs font-semibold text-gray-600"
        style={{ gridTemplateColumns: `minmax(220px,1.1fr) repeat(${comparison.candidates.length}, minmax(170px,1fr))` }}
      >
        <span className="px-3 py-2">비교 항목</span>
        {comparison.candidates.map((candidate, index) => (
          <label key={candidate.id} className="px-3 py-2">
            <input
              aria-label={`후보 ${index + 1} 이름`}
              className="w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-900"
              value={candidate.name}
              onChange={(event) => onComparisonChange(updateComparisonCandidateName(comparison, candidate.id, event.target.value))}
            />
          </label>
        ))}
      </div>
      {rows.slice(0, 8).map((row) => (
        <div
          key={row.id}
          className="grid min-w-[720px] border-t border-gray-100"
          style={{ gridTemplateColumns: `minmax(220px,1.1fr) repeat(${comparison.candidates.length}, minmax(170px,1fr))` }}
        >
          <span className="px-3 py-3 text-sm font-medium text-gray-800">{row.title}</span>
          {comparison.candidates.map((candidate, index) => (
            <label key={`${row.id}-${candidate.id}`} className="px-3 py-2">
              <textarea
                aria-label={`${row.title} / 후보 ${index + 1} 메모`}
                className="min-h-14 w-full resize-y rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
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
    <div data-testid="mobile-comparison-summary-card" className="m-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:hidden">
      <p className="text-xs font-semibold uppercase text-blue-700">mobile summary</p>
      <h4 className="mt-1 text-sm font-semibold text-gray-950">{primaryCandidate} 먼저 채우기</h4>
      <dl className="mt-2 grid gap-2 text-sm">
        {previewRows.map((row, index) => (
          <div key={row.id} className="rounded-md bg-white px-3 py-2">
            <dt className="text-xs font-semibold text-gray-500">비교 항목 {index + 1}</dt>
            <dd className="mt-1 text-gray-800" aria-label={row.title}>아래 표에서 작성</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs font-medium text-blue-800">전체 후보 비교는 아래 표에서 이어서 작성하고, 기록은 시트로 받을 수 있습니다.</p>
    </div>
  );
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
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-blue-700">{eyebrow}</p>
      <h3 className="mt-1 text-base font-semibold text-gray-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
      <div className="mt-3 space-y-3">
        {fields.map((field) => (
          <label key={field.id} className="block">
            <span className="text-sm font-semibold text-gray-800">{field.label}</span>
            <textarea
              aria-label={field.label}
              className="mt-1 min-h-16 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
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
  return (
    <div
      data-testid={`artifact-log-table-${table.id}`}
      data-source-kind={table.sourceKind ?? undefined}
      data-read-only-columns={table.readOnlyColumnIds?.join(',') ?? undefined}
      data-user-editable-columns={table.userEditableColumnIds?.join(',') ?? undefined}
      className="overflow-x-auto rounded-lg border border-slate-200 bg-white"
    >
      <div className="border-b border-slate-100 px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">{table.eyebrow}</p>
            <h3 className="mt-1 text-base font-semibold text-slate-950">{table.title}</h3>
          </div>
          <ArtifactExportButtons actions={exportActions} kinds={exportKinds} mobileArtifactLabel={mobileArtifactLabel} mobileKinds={mobileKinds} />
        </div>
        <ArtifactExportStatus actions={exportActions} />
        <p className="mt-2 text-sm leading-6 text-slate-600">{table.description}</p>
        {table.sourceKind === 'source_derived' ? <MobileStudyLogSummaryCard table={table} /> : <MobileLogSummaryCard table={table} />}
      </div>
      <table className="min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
          <tr>
            <th className="px-3 py-2">항목</th>
            {table.columns.map((column) => (
              <th key={column.id} className="px-3 py-2">{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.id} className="border-t border-slate-100">
              <th className="px-3 py-3 text-sm font-semibold text-slate-900">{row.label}</th>
              {table.columns.map((column) => {
                const isReadOnly = table.readOnlyColumnIds?.includes(column.id) ?? false;
                const value = isReadOnly ? row.defaultValues?.[column.id] ?? '' : workbenchState.logRows[row.id]?.[column.id] ?? row.defaultValues?.[column.id] ?? '';

                return (
                  <td key={`${row.id}-${column.id}`} className="px-2 py-2">
                    {isReadOnly ? (
                      <div
                        data-testid={`artifact-readonly-cell-${row.id}-${column.id}`}
                        className="min-w-36 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm leading-5 text-slate-700"
                      >
                        {value || '-'}
                      </div>
                    ) : (
                      <input
                        aria-label={`${row.label} / ${column.label}`}
                        className="w-full min-w-28 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
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

function MobileStudyLogSummaryCard({ table }: { table: ArtifactLogTable }) {
  const firstRow = table.rows[0];
  const editableColumns = table.columns.filter((column) => table.userEditableColumnIds?.includes(column.id));

  if (!firstRow) return null;

  return (
    <div
      data-testid="mobile-study-log-summary-card"
      data-source-row-count={String(table.rows.length)}
      data-editable-column-count={String(editableColumns.length)}
      className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:hidden"
    >
      <p className="text-xs font-semibold uppercase text-blue-700">study summary</p>
      <h4 className="mt-1 text-sm font-semibold text-gray-950">{table.rows.length} source rows before editing</h4>
      <div className="mt-2 grid gap-2 text-sm">
        <div data-testid="study-summary-first-source-row" className="rounded-md bg-white px-3 py-2">
          <p className="text-xs font-semibold text-gray-500">First source row</p>
          <p className="mt-1 font-medium text-gray-900">{firstRow.label}</p>
          <p className="mt-1 text-gray-700">{firstRow.defaultValues?.scope ?? '-'}</p>
        </div>
        <div data-testid="study-summary-editable-fields" className="rounded-md bg-white px-3 py-2">
          <p className="text-xs font-semibold text-gray-500">Editable after export</p>
          <p className="mt-1 text-gray-800">{editableColumns.map((column) => column.label).join(' / ')}</p>
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-blue-800">Source scope stays fixed; target date, status, and note are the user's sheet fields.</p>
    </div>
  );
}

function MobileLogSummaryCard({ table }: { table: ArtifactLogTable }) {
  const firstRow = table.rows[0];
  const previewColumns = table.columns.slice(0, 3);

  if (!firstRow) return null;

  return (
    <div data-testid="mobile-artifact-summary-card" className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:hidden">
      <p className="text-xs font-semibold uppercase text-blue-700">mobile summary</p>
      <h4 className="mt-1 text-sm font-semibold text-gray-950">{firstRow.label}</h4>
      <dl className="mt-2 grid gap-2 text-sm">
        {previewColumns.map((column) => (
          <div key={column.id} className="rounded-md bg-white px-3 py-2">
            <dt className="text-xs font-semibold text-gray-500">{column.label}</dt>
            <dd className="mt-1 text-gray-800">{firstRow.defaultValues?.[column.id] || column.placeholder || '-'}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs font-medium text-blue-800">전체 행은 아래 표에서 확인하고, 기록은 시트로 받을 수 있습니다.</p>
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
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <ComparisonTable
        title={comparisonConfig?.title ?? '후보 비교표'}
        eyebrow={comparisonConfig?.eyebrow ?? '후보 비교 preview'}
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-blue-700">현장에서 바로 체크</p>
          <h3 className="mt-1 text-base font-semibold text-gray-950">현장 체크리스트</h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {checklistItems.slice(0, 5).map((item) => (
              <li key={item.id}>
                <label className="flex gap-2">
                  <input
                    aria-label={`실행판 체크: ${item.title}`}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300"
                    checked={Boolean(checks[item.id])}
                    onChange={() => onToggleItem(item.id)}
                    type="checkbox"
                  />
                  <span className={checks[item.id] ? 'text-gray-400 line-through' : ''}>{item.title}</span>
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
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">{riskBoundaryTitle(bundle)}</p>
      <p className="mt-1 text-sm leading-6 text-amber-950">{bundle.flow.warning}</p>
    </div>
  );
}

function StopPrincipleCards({ bundle }: { bundle: FlowBundle }) {
  if (!bundle.flow.stop_conditions?.length && !bundle.flow.principles?.length) return null;

  return (
    <div className="mb-4 space-y-3">
      {bundle.flow.stop_conditions?.length ? (
        <section data-testid="flow-stop-conditions" className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-800">중단·상담 기준</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-red-950">
            {bundle.flow.stop_conditions.map((condition) => (
              <li key={condition}>- {condition}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {bundle.flow.principles?.length ? (
        <section data-testid="flow-principles" className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-semibold text-blue-800">기록 원칙</p>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-blue-950">
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
    <section data-testid="flow-hold-section" className="rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-sm font-semibold text-red-800">{section.title}</p>
      <ul className="mt-2 space-y-1 text-sm leading-6 text-red-950">
        {section.reasons.map((reason) => (
          <li key={reason}>- {reason}</li>
        ))}
      </ul>
      <p className="mt-2 text-sm leading-6 text-red-950">{section.consequence}</p>
      <p className="mt-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-red-800">{section.memo_template}</p>
      {fields.length ? (
        <div data-testid="flow-hold-memo-card" className="mt-3 grid gap-3">
          {fields.map((field) => (
            <label key={field.id} className="grid gap-1 text-sm font-semibold text-red-950">
              {field.label}
              <textarea
                data-testid={`flow-hold-field-${field.id}`}
                aria-label={field.label}
                className="min-h-20 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-normal text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
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
  workbenchState,
  onWorkbenchChange,
  exportActions,
}: {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
  exportActions?: ArtifactExportActions;
}) {
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
      </div>
    );
  }

  return (
    <div className={`grid gap-4 ${isCheckOnlyRoutine ? 'lg:grid-cols-[1.2fr_0.8fr]' : 'lg:grid-cols-[1.12fr_0.88fr]'}`}>
      <div className="order-2 grid min-w-0 gap-4 lg:order-1">
        <RoutineOccurrenceCalendar bundle={bundle} month={month} rows={routineRows} weekCount={weekCount} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} exportActions={exportActions} />
        {!isCheckOnlyRoutine ? <RoutineSessionLogCard bundle={bundle} rows={rows} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} exportActions={exportActions} /> : null}
      </div>
      <div data-testid="routine-today-session-card" className="order-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:order-2">
        <p className="text-sm font-semibold text-blue-700">이번 주 요약</p>
        <h3 className="mt-1 text-base font-semibold text-gray-950">다음 회차</h3>
        <p className="mt-2 text-sm text-gray-600">오늘 바로 볼 회차와 실행 항목을 오른쪽에 고정해 둡니다.</p>
        <div className="mt-3 hidden grid-cols-2 gap-2 text-sm lg:grid">
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold text-gray-500">전체 회차</p>
            <p className="mt-1 font-semibold text-gray-900">{rows.length}회</p>
          </div>
          <div className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-xs font-semibold text-gray-500">이번 주</p>
            <p className="mt-1 font-semibold text-gray-900">{selectedWeekdays.length}회</p>
          </div>
        </div>
        {next ? (
          <div className="mt-2 rounded-md border border-gray-200 bg-white p-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <input
                aria-label={`다음 세션 체크: ${nextLabel}`}
                className="h-4 w-4 rounded border-gray-300"
                checked={Boolean(nextState.done)}
                onChange={(event) => onWorkbenchChange(updateOccurrenceDone(workbenchState, nextKey, event.currentTarget.checked))}
                type="checkbox"
              />
              <span>{nextLabel} · {next.date} · {next.weekday}</span>
            </label>
            <button
              data-testid="routine-session-record-button"
              className="mt-3 w-full rounded-md bg-[#2563EB] px-3 py-2 text-sm font-semibold text-white sm:w-auto"
              type="button"
              onClick={() => onWorkbenchChange(updateOccurrenceDone(workbenchState, nextKey, true))}
            >
              다음 회차 기록
            </button>
            {!isCheckOnlyRoutine ? (
            <textarea
              aria-label={`다음 세션 메모: ${nextLabel}`}
              className="mt-3 min-h-20 w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-800"
              placeholder={isSleepCheck ? '잠든 시각, 8시간 이상 여부, 다음 날 피로감' : '오늘 컨디션, 조정할 강도, 다음 회차 메모'}
              value={nextState.note ?? ''}
              onChange={(event) => onWorkbenchChange(updateOccurrenceNote(workbenchState, nextKey, event.currentTarget.value))}
            />
            ) : null}
          </div>
        ) : null}
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {sessionItems.map((item) => (
            <li key={item.id} className="flex gap-2">
              <span className="text-blue-700">•</span>
              <span>{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
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
  const title = bundle.flow.slug === 'diet-habit-2week' ? '관찰 기록표' : '날짜별 기록표';
  const description =
    bundle.flow.slug === 'diet-habit-2week'
      ? '감량 결과를 판단하지 않고 식사, 수면, 활동, 컨디션, 중단/상담 조건을 같은 줄에 남깁니다.'
      : '날짜별로 남길 기록 값을 먼저 정리합니다.';
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <StopPrincipleCards bundle={bundle} />
          {showRiskBoundary ? (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-semibold text-amber-900">기록 전 확인</p>
              <p className="mt-1 text-sm leading-6 text-amber-950">{bundle.flow.warning}</p>
            </div>
          ) : null}
          <h3 className="text-base font-semibold text-gray-950">주간 조정 메모</h3>
          <textarea
            aria-label="주간 조정 메모"
            className="mt-3 min-h-32 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
            placeholder="이번 주에 유지할 기준, 줄일 기준, 중단/상담 신호를 적어두세요."
            value={workbenchState.weeklyReview ?? ''}
            onChange={(event) => onWorkbenchChange(updateWeeklyReview(workbenchState, event.currentTarget.value))}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <div data-testid="artifact-log-table-spreadsheet" className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">기록표 preview</p>
              <h3 className="mt-1 text-base font-semibold text-gray-950">{title}</h3>
            </div>
            <ArtifactExportButtons
              actions={exportActions}
              kinds={['copy', 'excel', 'draft']}
              mobileArtifactLabel={getMobileArtifactLabel(bundle, 'spreadsheet_log')}
              mobileKinds={['excel']}
            />
          </div>
          <ArtifactExportStatus actions={exportActions} />
          <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
          <MobileSpreadsheetSummaryCard date={rows[0]} columns={spreadsheetColumns} bundle={bundle} />
        </div>
        <table className="min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
            <tr>
              {['날짜', ...spreadsheetColumns].map((column) => (
                <th key={column} className="px-3 py-2">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((date) => (
              <tr key={date} className="border-t border-gray-100">
                <td className="px-3 py-3 font-semibold text-gray-900">{date}</td>
                {spreadsheetColumns.map((column) => (
                  <td key={`${date}-${column}`} className="px-2 py-2">
                    <input
                      aria-label={`${date} ${column}`}
                      className="w-full min-w-28 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
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
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <StopPrincipleCards bundle={bundle} />
        {showRiskBoundary ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-900">
              {bundle.flow.slug === 'diet-habit-2week' ? '관찰 전 중단/상담 기준' : '기록 전 확인'}
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-950">{bundle.flow.warning}</p>
          </div>
        ) : null}
        <h3 className="text-base font-semibold text-gray-950">
          {bundle.flow.slug === 'diet-habit-2week' ? '주간 관찰 메모' : '주간 리뷰 메모'}
        </h3>
        <textarea
          aria-label={bundle.flow.slug === 'diet-habit-2week' ? '주간 관찰 메모' : '주간 리뷰 메모'}
          className="mt-3 min-h-32 w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800"
          placeholder={
            bundle.flow.slug === 'diet-habit-2week'
              ? '반복된 식사 시간, 수면, 활동, 컨디션, 중단/상담 신호만 적어보세요.'
              : '기록 누락, 식사 패턴, 운동 지속 여부를 보고 다음 주 기준을 적어두세요.'
          }
          value={workbenchState.weeklyReview ?? ''}
          onChange={(event) => onWorkbenchChange(updateWeeklyReview(workbenchState, event.currentTarget.value))}
        />
      </div>
    </div>
  );
}

function MobileSpreadsheetSummaryCard({ date, columns, bundle }: { date: string; columns: string[]; bundle: FlowBundle }) {
  const previewColumns = columns.slice(0, 3);
  const title = bundle.flow.slug === 'diet-habit-2week' ? '오늘 관찰 행' : '오늘 기록 행';

  return (
    <div data-testid="mobile-artifact-summary-card" className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:hidden">
      <p className="text-xs font-semibold uppercase text-blue-700">mobile summary</p>
      <h4 className="mt-1 text-sm font-semibold text-gray-950">{title} · {date}</h4>
      <dl className="mt-2 grid gap-2 text-sm">
        {previewColumns.map((column) => (
          <div key={column} className="rounded-md bg-white px-3 py-2">
            <dt className="text-xs font-semibold text-gray-500">{column}</dt>
            <dd className="mt-1 text-gray-800">{spreadsheetPlaceholder(column)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs font-medium text-blue-800">전체 행은 아래 표에서 확인하고, 기록은 시트로 받을 수 있습니다.</p>
    </div>
  );
}

function getSpreadsheetColumns(bundle: FlowBundle): string[] {
  if (bundle.flow.slug === 'diet-habit-2week') return dietObservationColumns;
  return defaultSpreadsheetColumns;
}

function spreadsheetPlaceholder(column: string): string {
  if (column === '식단' || column === '식사 관찰') return '아침/점심/저녁';
  if (column === '활동') return '예: 30분 걷기';
  if (column === '수면/측정') return '예: 수면 6시간 / 허리 82cm';
  if (column === '중단/상담 조건') return '예: 어지러움 반복 시 중단 후 상담';
  return column;
}

function ChecklistWorkbench({
  bundle,
  checks,
  workbenchState,
  onWorkbenchChange,
  onToggleItem,
  exportActions,
}: {
  bundle: FlowBundle;
  checks: Record<string, boolean>;
  workbenchState?: FlowWorkbenchState;
  onWorkbenchChange?: (state: FlowWorkbenchState) => void;
  onToggleItem: (id: string) => void;
  exportActions?: ArtifactExportActions;
}) {
  const listTitle = bundle.flow.slug === 'new-car-delivery-check' || bundle.flow.slug === 'used-car-buying-check' ? '현장 체크리스트' : '실행 리스트';

  return (
    <div className="space-y-4">
      {workbenchState && onWorkbenchChange ? <HoldSectionCard bundle={bundle} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} /> : null}
      <div data-testid="artifact-list-card" className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-slate-950">{listTitle}</h3>
          <ArtifactExportButtons actions={exportActions} kinds={['copy', 'excel', 'draft']} />
        </div>
        <ArtifactExportStatus actions={exportActions} />
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {getExecutableItems(bundle).slice(0, 10).map((item) => {
            const detail = getWorkbenchItemDetail(bundle, item.id);
            return (
              <div key={item.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-[0_1px_0_rgba(15,23,42,0.03)]">
                <label className="flex gap-2">
                  <input
                    aria-label={`실행판 체크: ${item.title}`}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-700"
                    checked={Boolean(checks[item.id])}
                    onChange={() => onToggleItem(item.id)}
                    type="checkbox"
                  />
                  <span className={`font-medium ${checks[item.id] ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{item.title}</span>
                </label>
                <WorkbenchDetailDisclosure detail={detail} />
              </div>
            );
          })}
        </div>
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
