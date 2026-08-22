'use client';

import type { ComponentProps, ReactNode, Ref } from 'react';

import type { CalendarFlowScope } from '@/lib/flow/calendar-flow-scope';

import {
  CalendarFlowScopePicker,
  type CalendarFlowScopePickerOption,
} from '../CalendarFlowScopePicker';
import { MyFlowCalendarSurface } from '../MyFlowCalendarSurface';
import {
  FLOW_UI_SEGMENT_ACTIVE_CLASS,
  FLOW_UI_SEGMENT_IDLE_CLASS,
} from '../flow-ui';

type CalendarProps = ComponentProps<typeof MyFlowCalendarSurface>['calendarProps'];

export type MyFlowCalendarRouteMarker = {
  key: string;
  color: string;
  title: string;
  initial: string;
};

export type MyFlowCalendarRouteSharedMeta = {
  timing?: {
    label: string;
    accessibilityLabel?: string;
  };
  section?: string;
};

export type MyFlowCalendarRouteCompactScopeOption = {
  id: CalendarFlowScope;
  flowSlug?: string;
  label: string;
  count: number;
  marker?: MyFlowCalendarRouteMarker;
};

export type MyFlowCalendarRouteScopeModel =
  | {
      presentation: 'hidden';
    }
  | {
      presentation: 'picker';
      label: string;
      options: CalendarFlowScopePickerOption[];
      selectedSlugs: string[];
    }
  | {
      presentation: 'compact';
      label: string;
      monthHeading: string;
      selectedScope: CalendarFlowScope;
      options: MyFlowCalendarRouteCompactScopeOption[];
    };

export type MyFlowCalendarRouteGroup<TRow> = {
  key: string;
  kind: 'routine' | 'schedule';
  flowSlug?: string;
  displayTitle: string;
  openFlowAriaLabel?: string;
  openCount: number;
  hasMultipleFlows: boolean;
  marker: MyFlowCalendarRouteMarker;
  sharedMeta: MyFlowCalendarRouteSharedMeta;
  rows: readonly TRow[];
};

export type MyFlowCalendarRouteModel<TRow> = {
  calendarCardRef: Ref<HTMLElement>;
  selectedDayRef: Ref<HTMLElement>;
  monthScheduleCount: number;
  monthRoutineCount: number;
  visibleMonth: string;
  monthHeading: string;
  calendarKey: string;
  calendarProps: CalendarProps;
  selectedDate: string;
  selectedDayTitle: string;
  selectedDayReturnFocusSelector: string;
  selectedDayItemCount: number;
  selectedDayOpenCount: number;
  isMobileViewport: boolean;
  mobileDaySheetOpen: boolean;
  routineOverflowDate?: string;
  routineOverflowCount: number;
  scheduleOverflowDate?: string;
  scheduleOverflowCount: number;
  itemInspector?: ReactNode;
  scope: MyFlowCalendarRouteScopeModel;
  groups: readonly MyFlowCalendarRouteGroup<TRow>[];
  q3CopyEnabled: boolean;
  approvedPlanExecution: boolean;
};

export type MyFlowCalendarExecutionRowOptions = {
  kind: 'routine' | 'schedule';
  compact: true;
  openDetail: true;
  inlineDetail: false;
  suppressDateMeta: true;
  hideDateMeta: true;
  hideTimingMeta: boolean;
  hideSectionMeta: boolean;
  hideFlowMeta: boolean;
  showOpenLabel: true;
  openActionLabel: string;
  onOpen: () => void;
  markerColor: string;
  routineStatusInMeta: true;
  hideExecutionNoteAction: true;
  hideCompletionControl: boolean;
  draggable: false;
};

export type MyFlowCalendarRouteActions<TRow> = {
  onCloseMobileSelectedDay: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (monthStart: string) => void;
  onToday: () => void;
  onFirstSchedule: () => void;
  onSelectScope: (scope: CalendarFlowScope) => void;
  onApplySelectedFlows: (selectedSlugs: string[]) => void;
  onOpenFlow: (flowSlug: string) => void;
  onOpenRow: (row: TRow) => void;
};

export type MyFlowCalendarRouteSurfaceProps<TRow> = {
  model: MyFlowCalendarRouteModel<TRow>;
  actions: MyFlowCalendarRouteActions<TRow>;
  renderExecutionRow: (
    row: TRow,
    options: MyFlowCalendarExecutionRowOptions,
  ) => ReactNode;
};

export function MyFlowCalendarRouteSurface<TRow>({
  model,
  actions,
  renderExecutionRow,
}: MyFlowCalendarRouteSurfaceProps<TRow>) {
  const scope = model.scope;
  const scopeControl = scope.presentation === 'hidden'
    ? undefined
    : scope.presentation === 'picker'
      ? (
          <div
            data-testid="my-flow-calendar-scope-filter"
            data-scope-presentation="picker"
            data-p29-marker="P29-CALENDAR-COMPACT-SCOPE"
            className="mt-2 flex items-center justify-between gap-3 border-y border-[var(--flowme-border)] py-2 sm:mt-3"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">보기 범위</p>
              <p className="truncate text-sm font-semibold text-[var(--flowme-text)]">{scope.label}</p>
            </div>
            <CalendarFlowScopePicker
              options={scope.options}
              selectedSlugs={scope.selectedSlugs}
              q3CopyEnabled={model.q3CopyEnabled}
              onApply={actions.onApplySelectedFlows}
            />
          </div>
        )
      : (
          <div
            data-testid="my-flow-calendar-scope-filter"
            data-scope-presentation="compact"
            data-p29-marker="P29-CALENDAR-COMPACT-SCOPE"
            className="mt-2 flex w-full max-w-full flex-wrap gap-1 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-1 sm:mt-3"
            aria-label="캘린더 표시 범위"
          >
            {scope.options.map((option) => {
              const selected = scope.selectedScope === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  data-testid={option.flowSlug
                    ? `my-flow-calendar-scope-flow-${option.flowSlug}`
                    : `my-flow-calendar-scope-${option.id}`}
                  data-flow-slug={option.flowSlug}
                  aria-label={`${option.label}, ${scope.monthHeading} 일정 ${option.count}개`}
                  aria-pressed={selected}
                  className={`flex min-h-11 min-w-0 max-w-full flex-1 basis-[7rem] items-center justify-center gap-1.5 rounded-[var(--flowme-radius-control)] px-2.5 text-xs font-semibold ${selected ? FLOW_UI_SEGMENT_ACTIVE_CLASS : FLOW_UI_SEGMENT_IDLE_CLASS}`}
                  onClick={() => actions.onSelectScope(option.id)}
                >
                  {option.marker ? (
                    <span
                      data-testid="my-flow-calendar-filter-marker"
                      aria-hidden="true"
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] text-[9px] font-black text-white"
                      style={{ backgroundColor: option.marker.color }}
                    >
                      {option.marker.initial}
                    </span>
                  ) : null}
                  <span className="truncate">{option.id === 'all' ? '전체' : option.label}</span>
                  <span className="shrink-0 text-xs font-semibold text-[var(--flowme-text-secondary)]">{option.count}</span>
                </button>
              );
            })}
          </div>
        );

  const scopeLabel = scope.presentation === 'hidden' ? '' : scope.label;

  return (
    <MyFlowCalendarSurface
      calendarCardRef={model.calendarCardRef}
      monthScheduleCount={model.monthScheduleCount}
      monthRoutineCount={model.monthRoutineCount}
      scopeControl={scopeControl}
      visibleMonth={model.visibleMonth}
      monthHeading={model.monthHeading}
      calendarKey={model.calendarKey}
      selectedDayTitle={model.selectedDayTitle}
      mobileSelectedDay={model.isMobileViewport}
      mobileSelectedDayOpen={model.mobileDaySheetOpen}
      selectedDayReturnFocusSelector={model.selectedDayReturnFocusSelector}
      onCloseMobileSelectedDay={actions.onCloseMobileSelectedDay}
      calendarProps={model.calendarProps}
      onPreviousMonth={actions.onPreviousMonth}
      onNextMonth={actions.onNextMonth}
      onMonthChange={actions.onMonthChange}
      onToday={actions.onToday}
      onFirstSchedule={actions.onFirstSchedule}
      itemInspector={model.itemInspector}
      selectedDay={(
        <section
          ref={model.selectedDayRef}
          data-testid="my-flow-calendar-selected-day"
          data-calendar-layout="selected-day-execution"
          data-flow-anatomy="selected-day"
          data-overflow-date={model.routineOverflowDate}
          data-schedule-overflow-date={model.scheduleOverflowDate}
          className={model.isMobileViewport
            ? 'min-w-0'
            : 'min-w-0 border-t border-[var(--flowme-border)] py-3 sm:py-4'}
        >
          <div className={model.isMobileViewport ? 'sr-only' : 'flex items-start gap-3'}>
            <div aria-live="polite" aria-atomic="true">
              <h3 className="mt-1 text-lg font-semibold text-[var(--flowme-text)]">{model.selectedDayTitle}</h3>
              <p data-testid="my-flow-selected-day-summary" className="mt-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                {scope.presentation === 'hidden' ? '' : `${scopeLabel} · `}{model.selectedDayItemCount}개 항목 · {model.selectedDayOpenCount}개 남음
              </p>
            </div>
          </div>
          {model.routineOverflowDate && model.routineOverflowCount > 0 ? (
            <p data-testid="my-flow-selected-day-overflow-note" className="mt-2 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-positive-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--flowme-positive-strong)]">
              +{model.routineOverflowCount} 반복 항목 포함
            </p>
          ) : null}
          {model.scheduleOverflowDate && model.scheduleOverflowCount > 0 ? (
            <p data-testid="my-flow-selected-day-schedule-overflow-note" className="mt-2 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-action-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--flowme-action)]">
              +{model.scheduleOverflowCount} 날짜 항목 포함
            </p>
          ) : null}
          {model.selectedDayItemCount > 0 ? (
            <div data-testid="my-flow-selected-date-groups" className="mt-3 grid">
              {model.groups.map((group) => (
                <section
                  key={group.key}
                  data-testid="my-flow-selected-date-group"
                  data-density="compact"
                  data-flow-slug={group.flowSlug}
                  data-group-kind={group.kind}
                  data-flow-marker-key={group.marker.key}
                  data-flow-anatomy="calendar-flow-group"
                  className="border-t border-[var(--flowme-border)] py-3 first:border-t-0 first:pt-0"
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        data-testid="my-flow-selected-date-flow-marker"
                        aria-label={group.marker.title}
                        title={group.marker.title}
                        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white"
                        style={{ backgroundColor: group.marker.color }}
                      >
                        {group.marker.initial}
                      </span>
                      <div className="min-w-0">
                        <h4 data-flow-identity-slot="title" className="truncate text-sm font-semibold text-[var(--flowme-text)]">{group.displayTitle}</h4>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {group.rows.length > 1 || group.openCount !== group.rows.length ? (
                        <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                          {group.rows.length}개 · {group.openCount}개 남음
                        </span>
                      ) : null}
                      {group.flowSlug && group.openFlowAriaLabel ? (
                        <button
                          type="button"
                          data-testid="my-flow-calendar-open-flow"
                          className="min-h-11 rounded-[var(--flowme-radius-control)] px-2 text-xs font-semibold text-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)]"
                          aria-label={group.openFlowAriaLabel}
                          onClick={() => actions.onOpenFlow(group.flowSlug!)}
                        >
                          Flow 열기
                        </button>
                      ) : null}
                    </div>
                  </div>
                  {group.sharedMeta.timing || group.sharedMeta.section ? (
                    <div data-testid="my-flow-selected-date-group-meta" className="mb-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                      {group.sharedMeta.timing ? (
                        <span
                          data-testid="my-flow-group-timing-chip"
                          aria-label={group.sharedMeta.timing.accessibilityLabel}
                          title={group.sharedMeta.timing.accessibilityLabel}
                          className="text-[var(--flowme-text-secondary)]"
                        >
                          {group.sharedMeta.timing.label}
                        </span>
                      ) : null}
                      {group.sharedMeta.section ? (
                        <span data-testid="my-flow-group-section-label">{group.sharedMeta.section}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="grid gap-1.5">
                    {group.rows.map((row) => renderExecutionRow(row, {
                      kind: group.kind,
                      compact: true,
                      openDetail: true,
                      inlineDetail: false,
                      suppressDateMeta: true,
                      hideDateMeta: true,
                      hideTimingMeta: Boolean(group.sharedMeta.timing),
                      hideSectionMeta: Boolean(group.sharedMeta.section),
                      hideFlowMeta: !group.hasMultipleFlows,
                      showOpenLabel: true,
                      openActionLabel: model.q3CopyEnabled ? '계획에서 열기' : 'Flow에서 열기',
                      onOpen: () => actions.onOpenRow(row),
                      markerColor: group.marker.color,
                      routineStatusInMeta: true,
                      hideExecutionNoteAction: true,
                      hideCompletionControl: !model.approvedPlanExecution,
                      draggable: false,
                    }))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-3 py-3 text-sm text-[var(--flowme-text-secondary)]">이 날짜에 등록된 일정이 없습니다.</p>
          )}
        </section>
      )}
    />
  );
}
