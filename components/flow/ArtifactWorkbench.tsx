'use client';

import { getArtifactPlan } from '@/lib/flow/artifact-plan';
import { addDays, formatDate, getRangeEnd } from '@/lib/flow/date';
import { timingLabel } from '@/lib/flow/parser';
import type { FlowBundle, FlowComparisonState, FlowItem, FlowItemState } from '@/lib/flow/types';

type ArtifactWorkbenchProps = {
  bundle: FlowBundle;
  anchor: string;
  weekdays: string[];
  checks: Record<string, boolean>;
  itemStates: Record<string, FlowItemState>;
  comparisonState: FlowComparisonState;
  onComparisonChange: (state: FlowComparisonState) => void;
};

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

export function ArtifactWorkbench({
  bundle,
  anchor,
  weekdays,
  checks,
  itemStates,
  comparisonState,
  onComparisonChange,
}: ArtifactWorkbenchProps) {
  const plan = getArtifactPlan(bundle);
  const total = getExecutableItems(bundle).filter((item) => !itemStates[item.id]?.skipped).length;
  const done = getExecutableItems(bundle).filter((item) => checks[item.id]).length;

  return (
    <section aria-label="Flow artifact workbench" className="my-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-700">내 실행판</p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-950">{surfaceTitle(plan.primarySurface)}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{surfaceDescription(plan.primarySurface)}</p>
        </div>
        <span className="rounded-full bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
          {done}/{total} 완료
        </span>
      </div>

      <div className="mt-5">
        {plan.primarySurface === 'decision_table' ? (
          <DecisionWorkbench bundle={bundle} comparisonState={comparisonState} onComparisonChange={onComparisonChange} />
        ) : plan.primarySurface === 'routine_calendar' ? (
          <RoutineWorkbench bundle={bundle} anchor={anchor} weekdays={weekdays} />
        ) : plan.primarySurface === 'spreadsheet_log' ? (
          <SpreadsheetWorkbench anchor={anchor} />
        ) : plan.primarySurface === 'timeline_calendar' ? (
          <TimelineWorkbench bundle={bundle} anchor={anchor} />
        ) : (
          <ChecklistWorkbench bundle={bundle} />
        )}
      </div>
    </section>
  );
}

function surfaceTitle(surface: string): string {
  if (surface === 'decision_table') return '후보 비교표';
  if (surface === 'routine_calendar') return '반복 캘린더';
  if (surface === 'spreadsheet_log') return '기록표';
  if (surface === 'timeline_calendar') return '전체 할 일 + 월간 캘린더';
  if (surface === 'memo_card') return '메모 카드';
  return '전체 할 일';
}

function surfaceDescription(surface: string): string {
  if (surface === 'decision_table') return '먼저 후보를 비교하고, 아래 체크리스트로 현장에서 확인할 일을 이어갑니다.';
  if (surface === 'routine_calendar') return '시작일과 반복 요일을 기준으로 회차가 달력에 박히는 모습을 먼저 보여줍니다.';
  if (surface === 'spreadsheet_log') return '매일 남길 기록 열과 주간 리뷰 메모를 먼저 잡아둡니다.';
  if (surface === 'timeline_calendar') return '해야 할 일을 리스트로 훑고, 같은 항목이 월간 달력에서 어느 날짜에 걸리는지 봅니다.';
  if (surface === 'memo_card') return '나중에 다시 참고할 기준과 결정 메모를 한 장으로 정리합니다.';
  return '전체 할 일을 한눈에 보고 필요한 항목부터 실행합니다.';
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

function TimelineWorkbench({ bundle, anchor }: { bundle: FlowBundle; anchor: string }) {
  const rows = scheduleRows(bundle, anchor);
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
    <div className="grid gap-4 lg:grid-cols-[1fr_1.05fr]">
      <div className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
        <p className="text-sm font-semibold text-blue-700">실행 리스트 미리보기</p>
        <h3 className="text-base font-semibold text-gray-950">전체 할 일</h3>
        <div className="mt-3 space-y-2">
          {listRows.map((row) => (
            <div key={row.id} className="grid grid-cols-[92px_1fr] gap-3 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
              <span className="font-mono text-xs font-semibold text-blue-700">{row.startDate ? `${row.timing} · ${row.startDate.slice(5)}` : row.timing}</span>
              <span className="font-medium text-gray-800">{row.title}</span>
            </div>
          ))}
        </div>
      </div>
      <MiniMonthCalendar title="월간 캘린더" eyebrow="월별 달력 preview" month={month} rows={rows} />
    </div>
  );
}

function MiniMonthCalendar({ title, eyebrow, month, rows }: { title: string; eyebrow?: string; month: string; rows: ScheduleRow[] }) {
  const days = getMonthCalendarDays(month || formatDate(new Date()).slice(0, 7));
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          {eyebrow ? <p className="text-sm font-semibold text-blue-700">{eyebrow}</p> : null}
          <h3 className="text-base font-semibold text-gray-950">{title}</h3>
        </div>
        <span className="text-sm font-semibold text-gray-500">{month}</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
        {weekdayOrder.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dayRows = date ? rows.filter((row) => row.startDate === date) : [];
          return (
            <div key={`${month}-${index}`} className={`min-h-16 rounded-md border p-1 text-xs ${date ? 'border-gray-200 bg-[#FAFAF8]' : 'border-gray-100 bg-gray-50'}`}>
              {date ? <p className="font-semibold text-gray-600">{date.slice(8)}</p> : null}
              {dayRows.slice(0, 2).map((row) => (
                <p key={row.id} className="mt-1 truncate rounded bg-white px-1 py-0.5 text-left text-[11px] font-medium text-blue-700">
                  {row.title}
                </p>
              ))}
              {dayRows.length > 2 ? <p className="mt-1 text-[11px] text-gray-500">+{dayRows.length - 2}</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DecisionWorkbench({
  bundle,
  comparisonState,
  onComparisonChange,
}: {
  bundle: FlowBundle;
  comparisonState: FlowComparisonState;
  onComparisonChange: (state: FlowComparisonState) => void;
}) {
  const comparison = ensureComparisonState(comparisonState);
  const rows = bundle.items;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-3 py-3">
          <div>
            <p className="text-sm font-semibold text-blue-700">후보 비교 preview</p>
            <h3 className="mt-1 text-base font-semibold text-gray-950">후보 비교표</h3>
          </div>
          <button className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800" onClick={() => onComparisonChange(addComparisonCandidate(comparison))}>
            후보 추가
          </button>
        </div>
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
        {rows.slice(0, 8).map((item) => (
          <div
            key={item.id}
            className="grid min-w-[720px] border-t border-gray-100"
            style={{ gridTemplateColumns: `minmax(220px,1.1fr) repeat(${comparison.candidates.length}, minmax(170px,1fr))` }}
          >
            <span className="px-3 py-3 text-sm font-medium text-gray-800">{item.title}</span>
            {comparison.candidates.map((candidate, index) => (
              <label key={`${item.id}-${candidate.id}`} className="px-3 py-2">
                <textarea
                  aria-label={`${item.title} / 후보 ${index + 1} 메모`}
                  className="min-h-14 w-full resize-y rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-800"
                  placeholder="가격, 상태, 조건 메모"
                  value={comparison.notes[item.id]?.[candidate.id] ?? ''}
                  onChange={(event) => onComparisonChange(updateComparisonNote(comparison, item.id, candidate.id, event.target.value))}
                />
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
        <p className="text-sm font-semibold text-blue-700">현장에서 바로 체크</p>
        <h3 className="mt-1 text-base font-semibold text-gray-950">현장 체크리스트</h3>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          {rows.slice(0, 5).map((item) => (
            <li key={item.id} className="flex gap-2">
              <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300 bg-white" />
              <span>{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
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

function RoutineWorkbench({ bundle, anchor, weekdays }: { bundle: FlowBundle; anchor: string; weekdays: string[] }) {
  const startDate = anchor || formatDate(nextMonday(new Date()));
  const selectedWeekdays = weekdays.length ? weekdays : inferWeekdays(bundle.repeatRules?.[0] ?? '');
  const occurrences = expandRoutineOccurrences(startDate, selectedWeekdays, 4);
  const month = occurrences[0]?.date.slice(0, 7) ?? startDate.slice(0, 7);
  const rows = occurrences.map((occurrence) => ({
    id: `${occurrence.date}-${occurrence.sessionIndex}`,
    title: `${occurrence.sessionIndex}회차`,
    section: '반복',
    timing: occurrence.weekday,
    startDate: occurrence.date,
  }));
  const next = occurrences[0];
  const sessionItems = bundle.items.slice(0, 5);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <MiniMonthCalendar title="반복 캘린더" month={month} rows={rows} />
      <div className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
        <p className="text-sm font-semibold text-blue-700">반복 달력 preview</p>
        <h3 className="mt-1 text-base font-semibold text-gray-950">한 회차에 하는 일</h3>
        <p className="mt-2 text-sm font-semibold text-gray-700">다음 회차</p>
        {next ? (
          <p className="mt-2 text-sm font-semibold text-blue-700">
            {next.sessionIndex}회차 · {next.date} · {next.weekday}
          </p>
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
  if (repeatLabel.includes('매일')) return ['월', '화', '수', '목', '금'];
  if (repeatLabel.includes('월') || repeatLabel.includes('수') || repeatLabel.includes('금')) return ['월', '수', '금'];
  if (repeatLabel.includes('화') || repeatLabel.includes('목')) return ['화', '목', '토'];
  return ['월', '수', '금'];
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

function SpreadsheetWorkbench({ anchor }: { anchor: string }) {
  const start = anchor || formatDate(new Date());
  const rows = Array.from({ length: 7 }, (_, index) => formatDate(addDays(new Date(start), index)));
  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-[760px] text-left text-sm">
          <thead className="bg-gray-50 text-xs font-semibold text-gray-600">
            <tr>
              {['날짜', '식단', '운동', '측정', '컨디션', '리뷰'].map((column) => (
                <th key={column} className="px-3 py-2">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((date, index) => (
              <tr key={date} className="border-t border-gray-100">
                <td className="px-3 py-3 font-semibold text-gray-900">{date}</td>
                <td className="px-3 py-3 text-gray-500">아침/점심/저녁 메모</td>
                <td className="px-3 py-3 text-gray-500">운동 여부</td>
                <td className="px-3 py-3 text-gray-500">{index === 0 ? '체중/허리' : '선택'}</td>
                <td className="px-3 py-3 text-gray-500">피로도/수면</td>
                <td className="px-3 py-3 text-gray-500">{index === 6 ? '주간 조정' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
        <h3 className="text-base font-semibold text-gray-950">주간 리뷰 메모</h3>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          체중 결과보다 기록 누락, 식사 패턴, 운동 지속 여부를 보고 다음 주 기준을 조정합니다.
        </p>
      </div>
    </div>
  );
}

function ChecklistWorkbench({ bundle }: { bundle: FlowBundle }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-base font-semibold text-gray-950">전체 할 일</h3>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {getExecutableItems(bundle).slice(0, 10).map((item) => (
          <div key={item.id} className="flex gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
            <span className="mt-0.5 h-4 w-4 shrink-0 rounded border border-gray-300" />
            <span className="font-medium text-gray-800">{item.title}</span>
          </div>
        ))}
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
