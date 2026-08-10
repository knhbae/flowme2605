import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  MyFlowCalendarRouteSurface,
  type MyFlowCalendarRouteActions,
  type MyFlowCalendarRouteModel,
} from './MyFlowCalendarRouteSurface';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

type TestRow = { id: string };

function buildModel(): MyFlowCalendarRouteModel<TestRow> {
  return {
    calendarCardRef: null,
    selectedDayRef: null,
    monthScheduleCount: 1,
    monthRoutineCount: 0,
    visibleMonth: '2026-08-01',
    monthHeading: '2026년 8월',
    calendarKey: '2026-08',
    calendarProps: { events: [] },
    selectedDate: '2026-08-10',
    selectedDayTitle: '8월 10일',
    selectedDayReturnFocusSelector: '[data-date="2026-08-10"]',
    selectedDayItemCount: 0,
    selectedDayOpenCount: 0,
    isMobileViewport: false,
    mobileDaySheetOpen: false,
    routineOverflowCount: 0,
    scheduleOverflowCount: 0,
    scope: {
      presentation: 'compact',
      label: '전체 계획',
      monthHeading: '2026년 8월',
      selectedScope: 'all',
      options: [{ id: 'all', label: '전체', count: 1 }],
    },
    groups: [],
    q3CopyEnabled: true,
    approvedPlanExecution: true,
    itemInspector: <aside data-testid="route-item-inspector">선택 항목</aside>,
  };
}

const actions: MyFlowCalendarRouteActions<TestRow> = {
  onCloseMobileSelectedDay: () => undefined,
  onPreviousMonth: () => undefined,
  onNextMonth: () => undefined,
  onMonthChange: () => undefined,
  onToday: () => undefined,
  onFirstSchedule: () => undefined,
  onSelectScope: () => undefined,
  onApplySelectedFlows: () => undefined,
  onOpenFlow: () => undefined,
  onOpenRow: () => undefined,
};

test('route keeps selected-day content separate and forwards the optional item inspector', () => {
  const markup = renderToStaticMarkup(
    <MyFlowCalendarRouteSurface
      model={buildModel()}
      actions={actions}
      renderExecutionRow={() => null}
    />,
  );

  assert.match(markup, /data-testid="my-flow-calendar-selected-day"/u);
  assert.match(markup, /data-testid="my-flow-calendar-selected-day-region"/u);
  assert.match(markup, /data-testid="my-flow-calendar-item-inspector-region"/u);
  assert.match(markup, /data-testid="route-item-inspector"/u);
  assert.doesNotMatch(markup, /my-flow-calendar-selected-day"[^>]*lg:sticky/u);
});

test('approved Calendar rows expose completion while rollback keeps the legacy row contract', () => {
  const approved = buildModel();
  approved.selectedDayItemCount = 1;
  approved.selectedDayOpenCount = 1;
  approved.groups = [{
    key: 'schedule',
    kind: 'schedule',
    displayTitle: '계획',
    openCount: 1,
    hasMultipleFlows: false,
    marker: { key: 'plan', color: '#2563eb', title: '계획', initial: '계' },
    sharedMeta: {},
    rows: [{ id: 'row-1' }],
  }];
  const render = (model: MyFlowCalendarRouteModel<TestRow>) => renderToStaticMarkup(
    <MyFlowCalendarRouteSurface
      model={model}
      actions={actions}
      renderExecutionRow={(row, options) => (
        <div key={row.id} data-testid="row-options" data-hide-completion={String(options.hideCompletionControl)} />
      )}
    />,
  );

  assert.match(render(approved), /data-hide-completion="false"/u);
  assert.match(render({ ...approved, approvedPlanExecution: false }), /data-hide-completion="true"/u);
});
