import {
  normalizeCalendarFlowScope,
  normalizeCalendarFlowSelection,
  type CalendarFlowScope,
  type CalendarFlowScopePresentation,
} from './calendar-flow-scope';
import {
  getCalendarGridNavigationDate,
  type CalendarGridNavigationKey,
} from './calendar-keyboard-navigation';
import { getMyFlowWorkspaceHref, type MyFlowWorkspaceTarget } from './my-flow-local-ia';
import {
  filterMyFlowCalendarRows,
  findFirstMyFlowCalendarDateInMonth,
  findMyFlowCalendarDefaultFocusDate,
  getMyFlowCalendarMonthStart,
  type MyFlowCalendarViewRow,
} from './my-flow-calendar-view-model';

export type MyFlowCalendarControllerState = Readonly<{
  visibleMonth: string;
  selectedDate: string;
  scope: CalendarFlowScope;
  selectedFlowSlugs: readonly string[];
  daySheetOpen: boolean;
  routineOverflowDate: string;
  scheduleOverflowDate: string;
}>;

type SharedStateDisposition = 'preserve' | 'clear';

export type MyFlowCalendarSharedResetProfile = Readonly<{
  name:
    | 'none'
    | 'month'
    | 'scope'
    | 'date_button'
    | 'calendar_date_click'
    | 'event_click'
    | 'routine_icon'
    | 'routine_overflow'
    | 'schedule_overflow'
    | 'today';
  activeRow: SharedStateDisposition;
  editingDrafts: SharedStateDisposition;
  expandedRoutine: SharedStateDisposition;
  expandedAdvanced: SharedStateDisposition;
  expandedMemo: SharedStateDisposition;
  editingDetail: SharedStateDisposition;
  detailSurface: SharedStateDisposition;
  detailOpen: SharedStateDisposition;
}>;

export type MyFlowCalendarControllerEffects = Readonly<{
  discard:
    | Readonly<{ kind: 'none'; description: 'continue_without_dirty_editor_guard' }>
    | Readonly<{ kind: 'block_if_dirty'; description: 'show_discard_prompt_and_abort_transition' }>;
  focus:
    | Readonly<{ kind: 'none'; description: 'leave_focus_unchanged' }>
    | Readonly<{
        kind: 'date_button_after_frame';
        description: 'focus_selected_date_button_without_scroll_after_frame';
        date: string;
      }>;
  scroll:
    | Readonly<{ kind: 'none'; description: 'leave_scroll_unchanged' }>
    | Readonly<{
        kind: 'selected_day_on_mobile';
        description: 'scroll_selected_day_into_mobile_view_after_state_commit';
      }>;
}>;

export type MyFlowCalendarControllerPlan = Readonly<{
  applied: boolean;
  state: MyFlowCalendarControllerState;
  reset: MyFlowCalendarSharedResetProfile;
  effects: MyFlowCalendarControllerEffects;
}>;

export type MyFlowCalendarControllerAction =
  | Readonly<{ kind: 'initialize_demo'; date: string; selectedFlowSlugs: readonly string[] }>
  | Readonly<{ kind: 'load_selected_flows'; selectedFlowSlugs: readonly string[] }>
  | Readonly<{ kind: 'clear_overflow' }>
  | Readonly<{ kind: 'close_day_sheet' }>
  | Readonly<{ kind: 'month'; nextMonth: string }>
  | Readonly<{ kind: 'compact_scope'; scope: CalendarFlowScope }>
  | Readonly<{ kind: 'picker_flows'; selectedFlowSlugs: readonly string[]; knownFlowSlugs: readonly string[] }>
  | Readonly<{ kind: 'date_button_click'; date: string }>
  | Readonly<{ kind: 'keyboard_date'; date: string; key: CalendarGridNavigationKey }>
  | Readonly<{ kind: 'calendar_date_click'; date: string }>
  | Readonly<{ kind: 'event_click'; date?: string }>
  | Readonly<{ kind: 'routine_icon'; date: string }>
  | Readonly<{ kind: 'routine_overflow'; date?: string }>
  | Readonly<{ kind: 'schedule_overflow'; date: string }>
  | Readonly<{ kind: 'flow_overflow'; date: string }>
  | Readonly<{ kind: 'today'; todayDate: string }>
  | Readonly<{ kind: 'first_schedule'; calendarAnchor: string }>
  | Readonly<{ kind: 'external_sync_visible_month'; date: string }>
  | Readonly<{ kind: 'external_sync_to_date'; date: string }>;

const PRESERVE: SharedStateDisposition = 'preserve';
const CLEAR: SharedStateDisposition = 'clear';

const RESET_PROFILES: Readonly<Record<MyFlowCalendarSharedResetProfile['name'], MyFlowCalendarSharedResetProfile>> = {
  none: {
    name: 'none', activeRow: PRESERVE, editingDrafts: PRESERVE, expandedRoutine: PRESERVE,
    expandedAdvanced: PRESERVE, expandedMemo: PRESERVE, editingDetail: PRESERVE,
    detailSurface: PRESERVE, detailOpen: PRESERVE,
  },
  month: {
    name: 'month', activeRow: CLEAR, editingDrafts: PRESERVE, expandedRoutine: PRESERVE,
    expandedAdvanced: PRESERVE, expandedMemo: CLEAR, editingDetail: CLEAR,
    detailSurface: CLEAR, detailOpen: CLEAR,
  },
  scope: {
    name: 'scope', activeRow: CLEAR, editingDrafts: PRESERVE, expandedRoutine: CLEAR,
    expandedAdvanced: CLEAR, expandedMemo: CLEAR, editingDetail: CLEAR,
    detailSurface: CLEAR, detailOpen: CLEAR,
  },
  date_button: {
    name: 'date_button', activeRow: CLEAR, editingDrafts: PRESERVE, expandedRoutine: CLEAR,
    expandedAdvanced: CLEAR, expandedMemo: CLEAR, editingDetail: CLEAR,
    detailSurface: PRESERVE, detailOpen: CLEAR,
  },
  calendar_date_click: {
    name: 'calendar_date_click', activeRow: CLEAR, editingDrafts: CLEAR, expandedRoutine: CLEAR,
    expandedAdvanced: PRESERVE, expandedMemo: CLEAR, editingDetail: CLEAR,
    detailSurface: PRESERVE, detailOpen: CLEAR,
  },
  event_click: {
    name: 'event_click', activeRow: CLEAR, editingDrafts: PRESERVE, expandedRoutine: PRESERVE,
    expandedAdvanced: PRESERVE, expandedMemo: CLEAR, editingDetail: CLEAR,
    detailSurface: PRESERVE, detailOpen: CLEAR,
  },
  routine_icon: {
    name: 'routine_icon', activeRow: PRESERVE, editingDrafts: PRESERVE, expandedRoutine: PRESERVE,
    expandedAdvanced: PRESERVE, expandedMemo: PRESERVE, editingDetail: PRESERVE,
    detailSurface: PRESERVE, detailOpen: PRESERVE,
  },
  routine_overflow: {
    name: 'routine_overflow', activeRow: CLEAR, editingDrafts: PRESERVE, expandedRoutine: PRESERVE,
    expandedAdvanced: PRESERVE, expandedMemo: CLEAR, editingDetail: CLEAR,
    detailSurface: PRESERVE, detailOpen: CLEAR,
  },
  schedule_overflow: {
    name: 'schedule_overflow', activeRow: CLEAR, editingDrafts: CLEAR, expandedRoutine: CLEAR,
    expandedAdvanced: CLEAR, expandedMemo: CLEAR, editingDetail: CLEAR,
    detailSurface: PRESERVE, detailOpen: CLEAR,
  },
  today: {
    name: 'today', activeRow: CLEAR, editingDrafts: PRESERVE, expandedRoutine: PRESERVE,
    expandedAdvanced: PRESERVE, expandedMemo: CLEAR, editingDetail: CLEAR,
    detailSurface: PRESERVE, detailOpen: CLEAR,
  },
};

const NO_DISCARD = { kind: 'none', description: 'continue_without_dirty_editor_guard' } as const;
const BLOCK_IF_DIRTY = { kind: 'block_if_dirty', description: 'show_discard_prompt_and_abort_transition' } as const;
const NO_FOCUS = { kind: 'none', description: 'leave_focus_unchanged' } as const;
const NO_SCROLL = { kind: 'none', description: 'leave_scroll_unchanged' } as const;
const MOBILE_SELECTED_DAY_SCROLL = {
  kind: 'selected_day_on_mobile',
  description: 'scroll_selected_day_into_mobile_view_after_state_commit',
} as const;

function effects(input: {
  discard?: 'block_if_dirty';
  focusDate?: string;
  scrollSelectedDay?: boolean;
} = {}): MyFlowCalendarControllerEffects {
  return {
    discard: input.discard === 'block_if_dirty' ? BLOCK_IF_DIRTY : NO_DISCARD,
    focus: input.focusDate
      ? {
          kind: 'date_button_after_frame',
          description: 'focus_selected_date_button_without_scroll_after_frame',
          date: input.focusDate,
        }
      : NO_FOCUS,
    scroll: input.scrollSelectedDay ? MOBILE_SELECTED_DAY_SCROLL : NO_SCROLL,
  };
}

function scopedRows<Row extends MyFlowCalendarViewRow>(
  rows: readonly Row[],
  scope: CalendarFlowScope,
  selectedFlowSlugs: readonly string[],
): Row[] {
  return filterMyFlowCalendarRows([...rows], {
    scope,
    selectedFlowSlugs: [...selectedFlowSlugs],
  });
}

function plan(
  state: MyFlowCalendarControllerState,
  reset: MyFlowCalendarSharedResetProfile['name'],
  controllerEffects: MyFlowCalendarControllerEffects = effects(),
  applied = true,
): MyFlowCalendarControllerPlan {
  return { applied, state, reset: RESET_PROFILES[reset], effects: controllerEffects };
}

/**
 * Describes the existing AppClient Calendar transition asymmetries without
 * performing React, DOM, navigation, or storage work.
 */
export function planMyFlowCalendarTransition<Row extends MyFlowCalendarViewRow>(
  current: MyFlowCalendarControllerState,
  action: MyFlowCalendarControllerAction,
  rows: readonly Row[],
): MyFlowCalendarControllerPlan {
  if (action.kind === 'initialize_demo') {
    return plan({
      ...current,
      visibleMonth: getMyFlowCalendarMonthStart(action.date),
      selectedDate: action.date,
      scope: 'all',
      selectedFlowSlugs: [...action.selectedFlowSlugs],
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'none');
  }

  if (action.kind === 'load_selected_flows') {
    return plan({
      ...current,
      selectedFlowSlugs: [...action.selectedFlowSlugs],
    }, 'none');
  }

  if (action.kind === 'clear_overflow') {
    return plan({
      ...current,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'none');
  }

  if (action.kind === 'close_day_sheet') {
    return plan({ ...current, daySheetOpen: false }, 'none');
  }

  if (action.kind === 'month') {
    const rowsInScope = scopedRows(rows, current.scope, current.selectedFlowSlugs);
    return plan({
      ...current,
      visibleMonth: action.nextMonth,
      selectedDate: findFirstMyFlowCalendarDateInMonth(rowsInScope, action.nextMonth),
      daySheetOpen: false,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'month', effects({ discard: 'block_if_dirty' }));
  }

  if (action.kind === 'compact_scope') {
    const rowsInScope = scopedRows(rows, action.scope, []);
    return plan({
      ...current,
      scope: action.scope,
      selectedFlowSlugs: [],
      selectedDate: rowsInScope.some((row) => row.date === current.selectedDate)
        ? current.selectedDate
        : findFirstMyFlowCalendarDateInMonth(rowsInScope, current.visibleMonth),
      daySheetOpen: false,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'scope', effects({ discard: 'block_if_dirty' }));
  }

  if (action.kind === 'picker_flows') {
    const selectedFlowSlugs = normalizeCalendarFlowSelection(
      [...action.selectedFlowSlugs],
      [...action.knownFlowSlugs],
    );
    const rowsInScope = scopedRows(rows, 'all', selectedFlowSlugs);
    return plan({
      ...current,
      scope: 'all',
      selectedFlowSlugs,
      selectedDate: rowsInScope.some((row) => row.date === current.selectedDate)
        ? current.selectedDate
        : findFirstMyFlowCalendarDateInMonth(rowsInScope, current.visibleMonth),
      daySheetOpen: false,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'scope', effects({ discard: 'block_if_dirty' }));
  }

  if (action.kind === 'date_button_click') {
    return plan({
      ...current,
      selectedDate: action.date,
      daySheetOpen: true,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'date_button');
  }

  if (action.kind === 'keyboard_date') {
    const nextDate = getCalendarGridNavigationDate(action.date, action.key);
    if (!nextDate) return plan(current, 'none', effects(), false);
    return plan({
      ...current,
      visibleMonth: getMyFlowCalendarMonthStart(nextDate),
      selectedDate: nextDate,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'date_button', effects({ focusDate: nextDate }));
  }

  if (action.kind === 'calendar_date_click') {
    return plan({
      ...current,
      selectedDate: action.date,
      daySheetOpen: true,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'calendar_date_click');
  }

  if (action.kind === 'event_click') {
    return plan({
      ...current,
      selectedDate: action.date ? action.date.slice(0, 10) : current.selectedDate,
      daySheetOpen: true,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'event_click');
  }

  if (action.kind === 'routine_icon') {
    return plan({
      ...current,
      selectedDate: action.date,
      daySheetOpen: true,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'routine_icon', effects({ scrollSelectedDay: true }));
  }

  if (action.kind === 'routine_overflow') {
    if (!action.date) return plan(current, 'routine_overflow');
    return plan({
      ...current,
      selectedDate: action.date,
      daySheetOpen: true,
      routineOverflowDate: action.date,
      scheduleOverflowDate: '',
    }, 'routine_overflow', effects({ scrollSelectedDay: true }));
  }

  if (action.kind === 'schedule_overflow' || action.kind === 'flow_overflow') {
    return plan({
      ...current,
      selectedDate: action.date,
      daySheetOpen: true,
      routineOverflowDate: '',
      scheduleOverflowDate: action.kind === 'schedule_overflow' ? action.date : '',
    }, 'schedule_overflow', effects({ scrollSelectedDay: true }));
  }

  if (action.kind === 'today') {
    return plan({
      ...current,
      visibleMonth: getMyFlowCalendarMonthStart(action.todayDate),
      selectedDate: action.todayDate,
      daySheetOpen: false,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'today');
  }

  if (action.kind === 'first_schedule') {
    const rowsInScope = scopedRows(rows, current.scope, current.selectedFlowSlugs);
    const firstDate = findFirstMyFlowCalendarDateInMonth(rowsInScope, action.calendarAnchor);
    return plan({
      ...current,
      visibleMonth: getMyFlowCalendarMonthStart(firstDate),
      selectedDate: firstDate,
      daySheetOpen: false,
      routineOverflowDate: '',
      scheduleOverflowDate: '',
    }, 'today');
  }

  if (action.kind === 'external_sync_visible_month') {
    if (!action.date) return plan(current, 'none', effects(), false);
    return plan({
      ...current,
      visibleMonth: getMyFlowCalendarMonthStart(action.date),
    }, 'none');
  }

  if (!action.date) return plan(current, 'none', effects(), false);
  return plan({
    ...current,
    visibleMonth: getMyFlowCalendarMonthStart(action.date),
    selectedDate: action.date,
  }, 'none');
}

export type MyFlowCalendarFocusReconciliation = Readonly<{
  state: MyFlowCalendarControllerState;
  initialFocusApplied: boolean;
  reason:
    | 'initial_calendar_focus'
    | 'current_visible_selection_retained'
    | 'first_visible_row_selected'
    | 'default_focus_selected';
}>;

export function reconcileMyFlowCalendarFocus<Row extends MyFlowCalendarViewRow>(input: Readonly<{
  state: MyFlowCalendarControllerState;
  rows: readonly Row[];
  calendarAnchor: string;
  todayDate: string;
  calendarSurface: boolean;
  initialFocusApplied: boolean;
}>): MyFlowCalendarFocusReconciliation {
  const anchorMonthStart = getMyFlowCalendarMonthStart(input.calendarAnchor);
  const visibleMonthStart = getMyFlowCalendarMonthStart(input.state.visibleMonth);
  const visibleMonth = visibleMonthStart.slice(0, 7);
  const visibleMonthRows = input.rows.filter((row) => row.date?.startsWith(visibleMonth));

  if (input.calendarSurface && !input.initialFocusApplied && input.rows.length > 0) {
    const selectedDate = findMyFlowCalendarDefaultFocusDate(
      input.rows,
      input.todayDate,
      anchorMonthStart,
    );
    return {
      state: {
        ...input.state,
        selectedDate,
        visibleMonth: getMyFlowCalendarMonthStart(selectedDate),
      },
      initialFocusApplied: true,
      reason: 'initial_calendar_focus',
    };
  }

  const selectedDateIsVisible = input.state.selectedDate.startsWith(visibleMonth);
  const selectedDateHasRows = input.rows.some((row) => row.date === input.state.selectedDate);
  if (selectedDateIsVisible && (selectedDateHasRows || visibleMonthRows.length === 0)) {
    return {
      state: input.state,
      initialFocusApplied: input.initialFocusApplied,
      reason: 'current_visible_selection_retained',
    };
  }
  if (selectedDateIsVisible) {
    return {
      state: {
        ...input.state,
        selectedDate: visibleMonthRows[0]?.date ?? visibleMonthStart,
      },
      initialFocusApplied: input.initialFocusApplied,
      reason: 'first_visible_row_selected',
    };
  }

  const selectedDate = findMyFlowCalendarDefaultFocusDate(
    input.rows,
    input.todayDate,
    anchorMonthStart,
  );
  return {
    state: {
      ...input.state,
      selectedDate,
      visibleMonth: getMyFlowCalendarMonthStart(selectedDate || anchorMonthStart),
    },
    initialFocusApplied: input.initialFocusApplied,
    reason: 'default_focus_selected',
  };
}

export type MyFlowCalendarScopePersistencePlan = Readonly<{
  state: MyFlowCalendarControllerState;
  storage:
    | Readonly<{ kind: 'none' }>
    | Readonly<{ kind: 'remove_selected_flows' }>
    | Readonly<{ kind: 'write_selected_flows'; value: readonly string[] }>;
  reason:
    | 'not_calendar_surface'
    | 'waiting_for_known_flows'
    | 'picker_not_available'
    | 'selection_normalized'
    | 'picker_selection_persisted';
}>;

export function planMyFlowCalendarScopePersistence(input: Readonly<{
  state: MyFlowCalendarControllerState;
  calendarSurface: boolean;
  presentation: CalendarFlowScopePresentation;
  knownFlowSlugs: readonly string[];
}>): MyFlowCalendarScopePersistencePlan {
  if (!input.calendarSurface) {
    return { state: input.state, storage: { kind: 'none' }, reason: 'not_calendar_surface' };
  }
  if (input.knownFlowSlugs.length === 0) {
    return { state: input.state, storage: { kind: 'none' }, reason: 'waiting_for_known_flows' };
  }
  if (input.presentation !== 'picker') {
    return {
      state: { ...input.state, selectedFlowSlugs: [] },
      storage: { kind: 'remove_selected_flows' },
      reason: 'picker_not_available',
    };
  }
  const selectedFlowSlugs = normalizeCalendarFlowSelection(
    [...input.state.selectedFlowSlugs],
    [...input.knownFlowSlugs],
  );
  if (selectedFlowSlugs.join('|') !== input.state.selectedFlowSlugs.join('|')) {
    return {
      state: { ...input.state, selectedFlowSlugs },
      storage: { kind: 'none' },
      reason: 'selection_normalized',
    };
  }
  return {
    state: { ...input.state, scope: 'all' },
    storage: { kind: 'write_selected_flows', value: selectedFlowSlugs },
    reason: 'picker_selection_persisted',
  };
}

export function reconcileMyFlowCalendarScope(input: Readonly<{
  scope: CalendarFlowScope;
  knownFlowSlugs: readonly string[];
  hasRoutineRows: boolean;
}>): CalendarFlowScope {
  return normalizeCalendarFlowScope(
    input.scope,
    [...input.knownFlowSlugs],
    input.hasRoutineRows,
  );
}

export function buildMyFlowCalendarToMyFlowHref(
  target: MyFlowWorkspaceTarget,
  currentHref: string,
): string {
  const targetUrl = new URL(getMyFlowWorkspaceHref(target), 'https://flowme.local');
  const sourceUrl = new URL(currentHref, 'https://flowme.local');
  const demoMode = sourceUrl.searchParams.get('demo');
  if (demoMode) targetUrl.searchParams.set('demo', demoMode);
  return `${targetUrl.pathname}${targetUrl.search}`;
}
