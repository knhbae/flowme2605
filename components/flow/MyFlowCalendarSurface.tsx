'use client';

import dayGridPlugin from '@fullcalendar/daygrid';
import koLocale from '@fullcalendar/core/locales/ko';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import type { ComponentProps, ReactNode, Ref } from 'react';

import { FlowBottomSheet } from './FlowExecutionPrimitives';
import { FLOW_UI_COMPACT_ACTION_CLASS } from './flow-ui';

type FullCalendarProps = ComponentProps<typeof FullCalendar>;

type MyFlowCalendarSurfaceProps = {
  calendarCardRef: Ref<HTMLElement>;
  monthScheduleCount: number;
  monthRoutineCount: number;
  scopeControl?: ReactNode;
  visibleMonth: string;
  monthHeading: string;
  calendarKey: string;
  calendarProps: FullCalendarProps;
  selectedDay: ReactNode;
  selectedDayTitle: string;
  mobileSelectedDay: boolean;
  mobileSelectedDayOpen: boolean;
  selectedDayReturnFocusSelector: string;
  onCloseMobileSelectedDay: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onMonthChange: (monthStart: string) => void;
  onToday: () => void;
  onFirstSchedule: () => void;
};

export function MyFlowCalendarSurface({
  calendarCardRef,
  monthScheduleCount,
  monthRoutineCount,
  scopeControl,
  visibleMonth,
  monthHeading,
  calendarKey,
  calendarProps,
  selectedDay,
  selectedDayTitle,
  mobileSelectedDay,
  mobileSelectedDayOpen,
  selectedDayReturnFocusSelector,
  onCloseMobileSelectedDay,
  onPreviousMonth,
  onNextMonth,
  onMonthChange,
  onToday,
  onFirstSchedule,
}: MyFlowCalendarSurfaceProps) {
  return (
    <div
      data-testid="my-flow-calendar-workspace"
      data-p35-marker="P35-MYFLOW-SAFE-SPLIT"
      data-p29-marker="P29-CALENDAR-IDENTITY-COMPLETION"
      data-p31-marker="P31-EFFECTIVE-DATE-PRECEDENCE"
      data-p30-calendar-marker="P30-CALENDAR-COMPACT-IDENTITY"
      data-p35-calendar-marker="P35-CALENDAR-LENS-ONE-TOGGLE"
      data-flow-anatomy="calendar-workspace"
      className="grid gap-4 pb-0 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-0"
    >
      <section
        ref={calendarCardRef}
        data-testid="my-flow-calendar-card"
        data-calendar-layout="month-overview"
        className="order-2 min-w-0 py-2 sm:py-3 lg:px-4"
      >
        <div className="hidden items-start justify-between gap-3 sm:flex">
          <h3 className="text-lg font-semibold text-slate-950">월간 날짜 보기</h3>
          <p className="text-xs font-semibold text-[#6E6B64]">
            날짜 {monthScheduleCount} · 반복 {monthRoutineCount}
          </p>
        </div>

        {scopeControl}

        <div className="mt-2 flex min-h-12 items-center justify-between gap-2 border-y border-[#E7E4DD] py-2 sm:mt-4">
          <button
            type="button"
            aria-label="이전 달"
            onClick={onPreviousMonth}
            className={FLOW_UI_COMPACT_ACTION_CLASS}
          >
            이전
          </button>
          <div className="text-center">
            <h4 className="text-base font-black text-slate-950">{monthHeading}</h4>
            <label className="sr-only" htmlFor="my-flow-month-picker">월 선택</label>
            <input
              id="my-flow-month-picker"
              data-testid="my-flow-month-picker"
              aria-label="월 선택"
              className="mt-0.5 min-h-11 rounded-md border border-slate-200 bg-white px-2 text-base font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-[var(--flowme-focus)] sm:mt-1 sm:text-sm"
              type="month"
              value={visibleMonth.slice(0, 7)}
              onChange={(event) => {
                if (!event.target.value) return;
                onMonthChange(`${event.target.value}-01`);
              }}
            />
            <div className="mt-1 hidden justify-center gap-1 sm:flex">
              <button
                type="button"
                aria-label="오늘로 이동"
                className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                onClick={onToday}
              >
                오늘
              </button>
              <button
                type="button"
                aria-label="첫 일정으로 이동"
                className="rounded-md bg-white px-2 py-1 text-[11px] font-bold text-slate-600"
                onClick={onFirstSchedule}
              >
                첫 일정
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="다음 달"
            onClick={onNextMonth}
            className={FLOW_UI_COMPACT_ACTION_CLASS}
          >
            다음
          </button>
        </div>

        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white p-0.5 sm:p-2">
          <FullCalendar
            {...calendarProps}
            key={calendarKey}
            plugins={[dayGridPlugin, interactionPlugin]}
            locale={koLocale}
            initialView="dayGridMonth"
            initialDate={visibleMonth}
            headerToolbar={false}
            height="auto"
            editable={false}
            dayMaxEvents={3}
            dayMaxEventRows={3}
          />
        </div>
      </section>

      {mobileSelectedDay ? (
        mobileSelectedDayOpen ? (
          <FlowBottomSheet
            testId="my-flow-calendar-day-sheet"
            headingId="my-flow-calendar-day-sheet-title"
            p35Marker="P35-R6-CALENDAR-DAY-SHEET-390"
            eyebrow="선택한 날짜"
            title={selectedDayTitle}
            initialFocusSelector='[data-testid="my-flow-task-complete-control"], [data-testid="my-flow-calendar-open-flow"]'
            returnFocusSelector={selectedDayReturnFocusSelector}
            className="pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
            onClose={onCloseMobileSelectedDay}
          >
            <div className="mt-4">{selectedDay}</div>
          </FlowBottomSheet>
        ) : null
      ) : selectedDay}
    </div>
  );
}
