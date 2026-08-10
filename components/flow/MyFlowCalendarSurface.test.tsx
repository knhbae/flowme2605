import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { MyFlowCalendarSurface } from './MyFlowCalendarSurface';

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderCalendarSurface(input: {
  mobileSelectedDay?: boolean;
  mobileSelectedDayOpen?: boolean;
  itemInspector?: boolean;
} = {}): string {
  return renderToStaticMarkup(
    <MyFlowCalendarSurface
      calendarCardRef={null}
      monthScheduleCount={2}
      monthRoutineCount={1}
      scopeControl={<div data-testid="scope-control"><button type="button">전체</button></div>}
      visibleMonth="2026-08-01"
      monthHeading="2026년 8월"
      calendarKey="2026-08"
      calendarProps={{ events: [] }}
      selectedDay={(
        <section data-testid="selected-day" data-calendar-layout="selected-day-execution">
          <button type="button">항목 열기</button>
        </section>
      )}
      itemInspector={input.itemInspector === false
        ? undefined
        : (
            <section data-testid="item-inspector">
              <button type="button">선택 항목 수정</button>
            </section>
          )}
      selectedDayTitle="8월 10일"
      mobileSelectedDay={input.mobileSelectedDay ?? false}
      mobileSelectedDayOpen={input.mobileSelectedDayOpen ?? false}
      selectedDayReturnFocusSelector="[data-date='2026-08-10']"
      onCloseMobileSelectedDay={() => undefined}
      onPreviousMonth={() => undefined}
      onNextMonth={() => undefined}
      onMonthChange={() => undefined}
      onToday={() => undefined}
      onFirstSchedule={() => undefined}
    />,
  );
}

test('calendar keeps selected day under month and gives item inspector its own responsive region', () => {
  const markup = renderCalendarSurface();

  assert.match(markup, /data-calendar-composition="filter-month-day-item-inspector"/u);
  assert.match(markup, /data-workspace-breakpoints="mobile:0-767;stacked:768-1023;desktop-compact:1024-1279;desktop-full:1280\+"/u);
  assert.match(markup, /data-stacked-layout="single-column"/u);
  assert.match(markup, /data-compact-layout="filter-main-two-column"/u);
  assert.match(markup, /data-full-layout="filter-month-day-item-inspector-three-region"/u);
  assert.match(markup, /md:grid-cols-1/u);
  assert.match(markup, /lg:grid-cols-\[minmax\(14rem,0\.32fr\)_minmax\(0,1fr\)\]/u);
  assert.match(markup, /xl:grid-cols-\[minmax\(14rem,0\.28fr\)_minmax\(0,1fr\)_320px\]/u);
  assert.match(markup, /data-testid="my-flow-calendar-filter-rail"/u);
  assert.match(markup, /data-testid="my-flow-calendar-selected-day-region"/u);
  assert.match(markup, /data-testid="my-flow-calendar-item-inspector-region"/u);
  assert.match(markup, /data-compact-item-inspector-layout="below-main"/u);
  assert.match(markup, /data-full-item-inspector-layout="third-region"/u);
  assert.match(markup, /lg:col-start-2 lg:row-start-2/u);
  assert.match(markup, /lg:col-start-2 lg:row-start-3 xl:col-start-3 xl:row-start-1 xl:row-span-2/u);
  assert.match(markup, /hidden md:block/u);
  assert.equal(markup.includes('[&amp;_button]:min-h-12'), true);

  const filterIndex = markup.indexOf('data-testid="my-flow-calendar-filter-rail"');
  const calendarIndex = markup.indexOf('data-testid="my-flow-calendar-card"');
  const selectedDayIndex = markup.indexOf('data-testid="my-flow-calendar-selected-day-region"');
  const inspectorIndex = markup.indexOf('data-testid="my-flow-calendar-item-inspector-region"');
  assert.equal(filterIndex >= 0, true);
  assert.equal(calendarIndex > filterIndex, true);
  assert.equal(selectedDayIndex > calendarIndex, true);
  assert.equal(inspectorIndex > selectedDayIndex, true);
});

test('mobile selected day remains in the existing bottom sheet instead of the wide inspector region', () => {
  const markup = renderCalendarSurface({
    mobileSelectedDay: true,
    mobileSelectedDayOpen: true,
  });

  assert.match(markup, /data-testid="my-flow-calendar-day-sheet"/u);
  assert.match(markup, /data-flow-ui="bottom-sheet"/u);
  assert.match(markup, /aria-modal="true"/u);
  assert.match(markup, /data-testid="selected-day"/u);
  assert.doesNotMatch(markup, /data-testid="my-flow-calendar-selected-day-region"/u);
  assert.match(markup, /data-testid="my-flow-calendar-item-inspector-region"[^>]*class="[^"]*hidden md:block/u);
});

test('optional item inspector does not leave a phantom third column for existing callers', () => {
  const markup = renderCalendarSurface({ itemInspector: false });

  assert.match(markup, /data-calendar-composition="filter-month-day"/u);
  assert.match(markup, /data-full-layout="filter-month-day-two-region"/u);
  assert.match(markup, /lg:grid-cols-\[minmax\(14rem,0\.32fr\)_minmax\(0,1fr\)\]/u);
  assert.doesNotMatch(markup, /xl:grid-cols-\[minmax\(14rem,0\.28fr\)_minmax\(0,1fr\)_320px\]/u);
  assert.doesNotMatch(markup, /my-flow-calendar-item-inspector-region/u);
});
