import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMyFlowCalendarToMyFlowHref,
  planMyFlowCalendarScopePersistence,
  planMyFlowCalendarTransition,
  reconcileMyFlowCalendarFocus,
  reconcileMyFlowCalendarScope,
  type MyFlowCalendarControllerState,
} from './my-flow-calendar-controller';
import type { MyFlowCalendarViewRow } from './my-flow-calendar-view-model';

type TestRow = MyFlowCalendarViewRow & Readonly<{ token: string }>;

const initial: MyFlowCalendarControllerState = {
  visibleMonth: '2026-05-01',
  selectedDate: '2026-05-28',
  scope: 'all',
  selectedFlowSlugs: [],
  daySheetOpen: true,
  routineOverflowDate: '2026-05-28',
  scheduleOverflowDate: '2026-05-28',
};

const rows: TestRow[] = [
  { id: 'a', token: 'a', flowSlug: 'moving', flowTitle: '이사', isRoutine: false, date: '2026-05-28' },
  { id: 'b', token: 'b', flowSlug: 'moving', flowTitle: '이사', isRoutine: false, date: '2026-06-03' },
  { id: 'c', token: 'c', flowSlug: 'workout', flowTitle: '운동', isRoutine: true, date: '2026-06-05' },
];

test('month transition selects the first scoped date and preserves its narrow reset asymmetry', () => {
  const result = planMyFlowCalendarTransition(initial, { kind: 'month', nextMonth: '2026-06-01' }, rows);
  assert.equal(result.state.visibleMonth, '2026-06-01');
  assert.equal(result.state.selectedDate, '2026-06-03');
  assert.equal(result.state.daySheetOpen, false);
  assert.equal(result.reset.name, 'month');
  assert.equal(result.reset.editingDrafts, 'preserve');
  assert.equal(result.reset.expandedRoutine, 'preserve');
  assert.equal(result.reset.detailSurface, 'clear');
  assert.equal(result.effects.discard.kind, 'block_if_dirty');
});

test('compact scope and picker selection retain a valid date or choose the first scoped date', () => {
  const routine = planMyFlowCalendarTransition(
    initial,
    { kind: 'compact_scope', scope: 'routine' },
    rows,
  );
  assert.deepEqual(routine.state.selectedFlowSlugs, []);
  assert.equal(routine.state.scope, 'routine');
  assert.equal(routine.state.selectedDate, '2026-05-01');
  assert.equal(routine.reset.name, 'scope');
  assert.equal(routine.reset.editingDrafts, 'preserve');

  const picker = planMyFlowCalendarTransition(
    initial,
    {
      kind: 'picker_flows',
      selectedFlowSlugs: [' workout ', 'stale', 'workout'],
      knownFlowSlugs: ['moving', 'workout'],
    },
    rows,
  );
  assert.equal(picker.state.scope, 'all');
  assert.deepEqual(picker.state.selectedFlowSlugs, ['workout']);
  assert.equal(picker.state.selectedDate, '2026-05-01');
  assert.equal(picker.effects.discard.kind, 'block_if_dirty');
});

test('date button and FullCalendar date click intentionally use different shared resets', () => {
  const button = planMyFlowCalendarTransition(
    initial,
    { kind: 'date_button_click', date: '2026-06-03' },
    rows,
  );
  const fullCalendar = planMyFlowCalendarTransition(
    initial,
    { kind: 'calendar_date_click', date: '2026-06-03' },
    rows,
  );
  assert.equal(button.state.daySheetOpen, true);
  assert.equal(button.reset.activeRow, 'clear');
  assert.equal(button.reset.editingDrafts, 'preserve');
  assert.equal(fullCalendar.reset.activeRow, 'clear');
  assert.equal(fullCalendar.reset.editingDrafts, 'clear');
  assert.equal(fullCalendar.reset.expandedAdvanced, 'preserve');
});

test('keyboard date changes month, preserves sheet state, and requests focus without scroll', () => {
  const current = { ...initial, selectedDate: '2026-05-31', daySheetOpen: false };
  const result = planMyFlowCalendarTransition(
    current,
    { kind: 'keyboard_date', date: '2026-05-31', key: 'ArrowRight' },
    rows,
  );
  assert.equal(result.state.selectedDate, '2026-06-01');
  assert.equal(result.state.visibleMonth, '2026-06-01');
  assert.equal(result.state.daySheetOpen, false);
  assert.deepEqual(result.effects.focus, {
    kind: 'date_button_after_frame',
    description: 'focus_selected_date_button_without_scroll_after_frame',
    date: '2026-06-01',
  });
  assert.equal(result.effects.scroll.kind, 'none');
});

test('event and routine actions preserve their current reset and scroll asymmetries', () => {
  const event = planMyFlowCalendarTransition(
    initial,
    { kind: 'event_click', date: '2026-06-03T09:00:00' },
    rows,
  );
  assert.equal(event.state.selectedDate, '2026-06-03');
  assert.equal(event.reset.name, 'event_click');
  assert.equal(event.reset.expandedRoutine, 'preserve');
  assert.equal(event.effects.scroll.kind, 'none');

  const icon = planMyFlowCalendarTransition(initial, { kind: 'routine_icon', date: '2026-06-05' }, rows);
  assert.equal(icon.reset.name, 'routine_icon');
  assert.equal(icon.reset.activeRow, 'preserve');
  assert.equal(icon.effects.scroll.kind, 'selected_day_on_mobile');

  const overflow = planMyFlowCalendarTransition(initial, { kind: 'routine_overflow', date: '2026-06-05' }, rows);
  assert.equal(overflow.state.routineOverflowDate, '2026-06-05');
  assert.equal(overflow.state.scheduleOverflowDate, '');
  assert.equal(overflow.reset.editingDrafts, 'preserve');
  assert.equal(overflow.effects.scroll.kind, 'selected_day_on_mobile');

  const overflowWithoutDate = planMyFlowCalendarTransition(
    initial,
    { kind: 'routine_overflow' },
    rows,
  );
  assert.equal(overflowWithoutDate.state, initial);
  assert.equal(overflowWithoutDate.reset.name, 'routine_overflow');
  assert.equal(overflowWithoutDate.reset.activeRow, 'clear');
  assert.equal(overflowWithoutDate.effects.scroll.kind, 'none');
});

test('schedule and flow overflow share resets but keep different overflow flags', () => {
  const schedule = planMyFlowCalendarTransition(
    initial,
    { kind: 'schedule_overflow', date: '2026-06-03' },
    rows,
  );
  const flow = planMyFlowCalendarTransition(
    initial,
    { kind: 'flow_overflow', date: '2026-06-03' },
    rows,
  );
  assert.equal(schedule.state.scheduleOverflowDate, '2026-06-03');
  assert.equal(flow.state.scheduleOverflowDate, '');
  assert.equal(schedule.reset.editingDrafts, 'clear');
  assert.deepEqual(schedule.reset, flow.reset);
  assert.equal(flow.effects.scroll.kind, 'selected_day_on_mobile');
});

test('today, first schedule, and external sync keep their existing state boundaries', () => {
  const today = planMyFlowCalendarTransition(initial, { kind: 'today', todayDate: '2026-07-04' }, rows);
  assert.equal(today.state.visibleMonth, '2026-07-01');
  assert.equal(today.state.selectedDate, '2026-07-04');
  assert.equal(today.state.daySheetOpen, false);
  assert.equal(today.reset.editingDrafts, 'preserve');

  const first = planMyFlowCalendarTransition(
    initial,
    { kind: 'first_schedule', calendarAnchor: '2026-06-20' },
    rows,
  );
  assert.equal(first.state.selectedDate, '2026-06-03');
  assert.equal(first.state.visibleMonth, '2026-06-01');
  assert.equal(first.reset.name, 'today');

  const external = planMyFlowCalendarTransition(
    initial,
    { kind: 'external_sync_to_date', date: '2030-08-30' },
    rows,
  );
  assert.equal(external.state.visibleMonth, '2030-08-01');
  assert.equal(external.state.selectedDate, '2030-08-30');
  assert.equal(external.state.daySheetOpen, initial.daySheetOpen);
  assert.equal(external.reset.name, 'none');

  const visibleMonthOnly = planMyFlowCalendarTransition(
    initial,
    { kind: 'external_sync_visible_month', date: '2031-09-14' },
    rows,
  );
  assert.equal(visibleMonthOnly.state.visibleMonth, '2031-09-01');
  assert.equal(visibleMonthOnly.state.selectedDate, initial.selectedDate);
  assert.equal(visibleMonthOnly.state.daySheetOpen, initial.daySheetOpen);
});

test('initialization and controller-only closing transitions preserve unrelated state', () => {
  const demo = planMyFlowCalendarTransition(initial, {
    kind: 'initialize_demo',
    date: '2026-05-28',
    selectedFlowSlugs: ['moving'],
  }, rows);
  assert.equal(demo.state.visibleMonth, '2026-05-01');
  assert.equal(demo.state.selectedDate, '2026-05-28');
  assert.equal(demo.state.scope, 'all');
  assert.deepEqual(demo.state.selectedFlowSlugs, ['moving']);
  assert.equal(demo.state.daySheetOpen, initial.daySheetOpen);
  assert.equal(demo.state.routineOverflowDate, '');

  const loaded = planMyFlowCalendarTransition(initial, {
    kind: 'load_selected_flows',
    selectedFlowSlugs: ['workout'],
  }, rows);
  assert.deepEqual(loaded.state.selectedFlowSlugs, ['workout']);
  assert.equal(loaded.state.selectedDate, initial.selectedDate);

  const cleared = planMyFlowCalendarTransition(initial, { kind: 'clear_overflow' }, rows);
  assert.equal(cleared.state.routineOverflowDate, '');
  assert.equal(cleared.state.scheduleOverflowDate, '');
  assert.equal(cleared.state.daySheetOpen, initial.daySheetOpen);

  const closed = planMyFlowCalendarTransition(initial, { kind: 'close_day_sheet' }, rows);
  assert.equal(closed.state.daySheetOpen, false);
  assert.equal(closed.state.routineOverflowDate, initial.routineOverflowDate);
});

test('focus reconciliation applies initial focus once and otherwise retains or replaces selection', () => {
  const first = reconcileMyFlowCalendarFocus({
    state: { ...initial, selectedDate: '2026-05-01' },
    rows,
    calendarAnchor: '2026-05-28',
    todayDate: '2026-05-28',
    calendarSurface: true,
    initialFocusApplied: false,
  });
  assert.equal(first.state.selectedDate, '2026-05-28');
  assert.equal(first.initialFocusApplied, true);
  assert.equal(first.reason, 'initial_calendar_focus');

  const retained = reconcileMyFlowCalendarFocus({
    state: first.state,
    rows,
    calendarAnchor: '2026-05-28',
    todayDate: '2026-05-28',
    calendarSurface: true,
    initialFocusApplied: true,
  });
  assert.equal(retained.state, first.state);
  assert.equal(retained.reason, 'current_visible_selection_retained');

  const replaced = reconcileMyFlowCalendarFocus({
    state: { ...initial, selectedDate: '2026-05-29' },
    rows,
    calendarAnchor: '2026-05-28',
    todayDate: '2026-05-28',
    calendarSurface: true,
    initialFocusApplied: true,
  });
  assert.equal(replaced.state.selectedDate, '2026-05-28');
  assert.equal(replaced.reason, 'first_visible_row_selected');
});

test('scope persistence waits, removes, normalizes, then writes without touching storage itself', () => {
  const waiting = planMyFlowCalendarScopePersistence({
    state: initial,
    calendarSurface: true,
    presentation: 'picker',
    knownFlowSlugs: [],
  });
  assert.equal(waiting.storage.kind, 'none');
  assert.equal(waiting.reason, 'waiting_for_known_flows');

  const compact = planMyFlowCalendarScopePersistence({
    state: { ...initial, selectedFlowSlugs: ['moving'] },
    calendarSurface: true,
    presentation: 'compact',
    knownFlowSlugs: ['moving'],
  });
  assert.deepEqual(compact.state.selectedFlowSlugs, []);
  assert.equal(compact.storage.kind, 'remove_selected_flows');

  const normalized = planMyFlowCalendarScopePersistence({
    state: { ...initial, selectedFlowSlugs: ['moving', 'stale'] },
    calendarSurface: true,
    presentation: 'picker',
    knownFlowSlugs: ['moving'],
  });
  assert.deepEqual(normalized.state.selectedFlowSlugs, ['moving']);
  assert.equal(normalized.storage.kind, 'none');

  const persisted = planMyFlowCalendarScopePersistence({
    state: { ...initial, scope: 'routine', selectedFlowSlugs: ['moving'] },
    calendarSurface: true,
    presentation: 'picker',
    knownFlowSlugs: ['moving'],
  });
  assert.equal(persisted.state.scope, 'all');
  assert.deepEqual(persisted.storage, { kind: 'write_selected_flows', value: ['moving'] });
});

test('scope reconciliation rejects stale flow and unavailable routine scopes', () => {
  assert.equal(reconcileMyFlowCalendarScope({
    scope: 'flow:stale', knownFlowSlugs: ['moving'], hasRoutineRows: true,
  }), 'all');
  assert.equal(reconcileMyFlowCalendarScope({
    scope: 'routine', knownFlowSlugs: ['moving'], hasRoutineRows: false,
  }), 'all');
  assert.equal(reconcileMyFlowCalendarScope({
    scope: 'flow:moving', knownFlowSlugs: ['moving'], hasRoutineRows: false,
  }), 'flow:moving');
});

test('Calendar to My Flow href keeps target identity and only the demo query', () => {
  assert.equal(buildMyFlowCalendarToMyFlowHref({
    flowSlug: 'personal-copy:moving',
    itemKey: 'item a',
    itemDate: '2026-07-13',
  }, '/calendar?demo=ux20&ignored=1#month'),
  '/my?view=flows&flow=personal-copy%3Amoving&item=item+a&date=2026-07-13&demo=ux20');
  assert.equal(buildMyFlowCalendarToMyFlowHref(
    { flowSlug: 'moving' },
    '/calendar?ignored=1',
  ), '/my?view=flows&flow=moving');
});
