'use client';

import { useEffect, useRef, useState } from 'react';

import type { CalendarFlowScope, CalendarFlowScopePresentation } from '@/lib/flow/calendar-flow-scope';
import type { CalendarGridNavigationKey } from '@/lib/flow/calendar-keyboard-navigation';
import {
  buildMyFlowCalendarToMyFlowHref,
  planMyFlowCalendarScopePersistence,
  planMyFlowCalendarTransition,
  reconcileMyFlowCalendarFocus,
  reconcileMyFlowCalendarScope,
  type MyFlowCalendarControllerAction,
  type MyFlowCalendarControllerState,
  type MyFlowCalendarSharedResetProfile,
} from '@/lib/flow/my-flow-calendar-controller';
import type { MyFlowWorkspaceTarget } from '@/lib/flow/my-flow-local-ia';
import {
  MY_FLOW_ROUTINE_ICON_LIMIT,
  getMyFlowCalendarMonthStart,
  type MyFlowCalendarViewRow,
} from '@/lib/flow/my-flow-calendar-view-model';

const MY_FLOW_CALENDAR_SELECTED_FLOWS_KEY = 'flow:calendar:selected-flows:v1';
const EMPTY_CALENDAR_ROWS: readonly MyFlowCalendarViewRow[] = [];

type MyFlowCalendarControllerPorts = Readonly<{
  hasUnsavedItemEdits: () => boolean;
  requestDiscardConfirmation: () => void;
  resetSharedState: (profile: MyFlowCalendarSharedResetProfile) => void;
}>;

type MyFlowCalendarControllerOptions = Readonly<{
  initialDate: string;
  ports: MyFlowCalendarControllerPorts;
}>;

function readSelectedFlowSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(MY_FLOW_CALENDAR_SELECTED_FLOWS_KEY) || '[]',
    );
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === 'string')
      : [];
  } catch {
    return [];
  }
}

function isSameControllerState(
  left: MyFlowCalendarControllerState,
  right: MyFlowCalendarControllerState,
): boolean {
  return left.visibleMonth === right.visibleMonth
    && left.selectedDate === right.selectedDate
    && left.scope === right.scope
    && left.selectedFlowSlugs.join('|') === right.selectedFlowSlugs.join('|')
    && left.daySheetOpen === right.daySheetOpen
    && left.routineOverflowDate === right.routineOverflowDate
    && left.scheduleOverflowDate === right.scheduleOverflowDate;
}

export function useMyFlowCalendarController({
  initialDate,
  ports,
}: MyFlowCalendarControllerOptions) {
  const initialState: MyFlowCalendarControllerState = {
    visibleMonth: getMyFlowCalendarMonthStart(initialDate),
    selectedDate: initialDate,
    scope: 'all',
    selectedFlowSlugs: [],
    daySheetOpen: false,
    routineOverflowDate: '',
    scheduleOverflowDate: '',
  };
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [routineIconLimit, setRoutineIconLimit] = useState(MY_FLOW_ROUTINE_ICON_LIMIT);
  const calendarCardRef = useRef<HTMLElement | null>(null);
  const selectedDayRef = useRef<HTMLElement | null>(null);
  const initialFocusAppliedRef = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const syncRoutineIconLimit = () => {
      setRoutineIconLimit(mediaQuery.matches ? 1 : MY_FLOW_ROUTINE_ICON_LIMIT);
    };
    syncRoutineIconLimit();
    mediaQuery.addEventListener('change', syncRoutineIconLimit);
    return () => mediaQuery.removeEventListener('change', syncRoutineIconLimit);
  }, []);

  const updateState = (nextState: MyFlowCalendarControllerState) => {
    if (isSameControllerState(stateRef.current, nextState)) return;
    stateRef.current = nextState;
    setState(nextState);
  };

  const scrollSelectedDayOnMobile = () => {
    if (typeof window === 'undefined' || !window.matchMedia('(max-width: 767px)').matches) return;
    window.setTimeout(() => {
      const selectedDay = selectedDayRef.current;
      if (!selectedDay) return;
      selectedDay.scrollIntoView({ block: 'start', behavior: 'auto' });
      window.setTimeout(() => {
        const top = selectedDay.getBoundingClientRect().top;
        if (top > 120) window.scrollBy({ top: top - 104, behavior: 'auto' });
      }, 0);
    }, 0);
  };

  const dispatch = <Row extends MyFlowCalendarViewRow>(
    action: MyFlowCalendarControllerAction,
    rows: readonly Row[] = EMPTY_CALENDAR_ROWS as readonly Row[],
  ): boolean => {
    const transition = planMyFlowCalendarTransition(stateRef.current, action, rows);
    if (!transition.applied) return false;
    if (
      transition.effects.discard.kind === 'block_if_dirty'
      && ports.hasUnsavedItemEdits()
    ) {
      ports.requestDiscardConfirmation();
      return false;
    }

    updateState(transition.state);
    ports.resetSharedState(transition.reset);

    if (transition.effects.focus.kind === 'date_button_after_frame') {
      const nextDate = transition.effects.focus.date;
      window.requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(
            `.fc-daygrid-day[data-date="${nextDate}"] [data-testid="my-flow-calendar-date-button"]`,
          )
          ?.focus({ preventScroll: true });
      });
    }
    if (transition.effects.scroll.kind === 'selected_day_on_mobile') {
      scrollSelectedDayOnMobile();
    }
    return true;
  };

  const initializeDemo = (date: string) => dispatch({
    kind: 'initialize_demo',
    date,
    selectedFlowSlugs: readSelectedFlowSlugs(),
  });

  const loadSelectedFlowPreference = () => dispatch({
    kind: 'load_selected_flows',
    selectedFlowSlugs: readSelectedFlowSlugs(),
  });

  const synchronizeScope = (input: Readonly<{
    knownFlowSlugs: readonly string[];
    hasRoutineRows: boolean;
  }>) => {
    const scope = reconcileMyFlowCalendarScope({
      scope: stateRef.current.scope,
      knownFlowSlugs: input.knownFlowSlugs,
      hasRoutineRows: input.hasRoutineRows,
    });
    if (scope !== stateRef.current.scope) updateState({ ...stateRef.current, scope });
  };

  const synchronizeScopePersistence = (input: Readonly<{
    calendarSurface: boolean;
    presentation: CalendarFlowScopePresentation;
    knownFlowSlugs: readonly string[];
  }>) => {
    if (typeof window === 'undefined') return;
    const persistence = planMyFlowCalendarScopePersistence({
      state: stateRef.current,
      calendarSurface: input.calendarSurface,
      presentation: input.presentation,
      knownFlowSlugs: input.knownFlowSlugs,
    });
    updateState(persistence.state);
    if (persistence.storage.kind === 'remove_selected_flows') {
      window.localStorage.removeItem(MY_FLOW_CALENDAR_SELECTED_FLOWS_KEY);
    } else if (persistence.storage.kind === 'write_selected_flows') {
      window.localStorage.setItem(
        MY_FLOW_CALENDAR_SELECTED_FLOWS_KEY,
        JSON.stringify(persistence.storage.value),
      );
    }
  };

  const synchronizeFocus = <Row extends MyFlowCalendarViewRow>(input: Readonly<{
    rows: readonly Row[];
    calendarAnchor: string;
    todayDate: string;
    calendarSurface: boolean;
  }>) => {
    const reconciliation = reconcileMyFlowCalendarFocus({
      state: stateRef.current,
      rows: input.rows,
      calendarAnchor: input.calendarAnchor,
      todayDate: input.todayDate,
      calendarSurface: input.calendarSurface,
      initialFocusApplied: initialFocusAppliedRef.current,
    });
    initialFocusAppliedRef.current = reconciliation.initialFocusApplied;
    updateState(reconciliation.state);
  };

  const openWorkspace = (target: MyFlowWorkspaceTarget) => {
    if (typeof window === 'undefined') return;
    window.location.assign(buildMyFlowCalendarToMyFlowHref(target, window.location.href));
  };

  return {
    state,
    routineIconLimit,
    calendarCardRef,
    selectedDayRef,
    dispatch,
    initializeDemo,
    loadSelectedFlowPreference,
    synchronizeScope,
    synchronizeScopePersistence,
    synchronizeFocus,
    clearOverflow: () => dispatch({ kind: 'clear_overflow' }),
    closeDaySheet: () => dispatch({ kind: 'close_day_sheet' }),
    syncVisibleMonth: (date: string) => dispatch({ kind: 'external_sync_visible_month', date }),
    syncToDate: (date: string) => dispatch({ kind: 'external_sync_to_date', date }),
    moveMonth: <Row extends MyFlowCalendarViewRow>(nextMonth: string, rows: readonly Row[]) => (
      dispatch({ kind: 'month', nextMonth }, rows)
    ),
    selectScope: <Row extends MyFlowCalendarViewRow>(
      scope: CalendarFlowScope,
      rows: readonly Row[],
    ) => dispatch({ kind: 'compact_scope', scope }, rows),
    applySelectedFlows: <Row extends MyFlowCalendarViewRow>(
      selectedFlowSlugs: readonly string[],
      knownFlowSlugs: readonly string[],
      rows: readonly Row[],
    ) => dispatch({
      kind: 'picker_flows',
      selectedFlowSlugs,
      knownFlowSlugs,
    }, rows),
    selectDateButton: (date: string) => dispatch({ kind: 'date_button_click', date }),
    navigateDateByKey: (date: string, key: CalendarGridNavigationKey) => dispatch({
      kind: 'keyboard_date',
      date,
      key,
    }),
    selectCalendarDate: (date: string) => dispatch({ kind: 'calendar_date_click', date }),
    selectEventDate: (date?: string) => dispatch({ kind: 'event_click', ...(date ? { date } : {}) }),
    selectRoutineIcon: (date: string) => dispatch({ kind: 'routine_icon', date }),
    selectRoutineOverflow: (date?: string) => dispatch({
      kind: 'routine_overflow',
      ...(date ? { date } : {}),
    }),
    selectScheduleOverflow: (date: string) => dispatch({ kind: 'schedule_overflow', date }),
    selectFlowOverflow: (date: string) => dispatch({ kind: 'flow_overflow', date }),
    goToday: (todayDate: string) => dispatch({ kind: 'today', todayDate }),
    goFirstSchedule: <Row extends MyFlowCalendarViewRow>(
      calendarAnchor: string,
      rows: readonly Row[],
    ) => dispatch({ kind: 'first_schedule', calendarAnchor }, rows),
    openWorkspace,
  };
}
