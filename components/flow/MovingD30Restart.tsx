'use client';

import type { EventClickArg, EventContentArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import type { DateClickArg } from '@fullcalendar/interaction';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { useMemo, useState } from 'react';
import {
  addMovingRestartItem,
  buildMovingRestartChecklistText,
  buildMovingRestartIcs,
  buildMovingRestartSheets,
  deleteMovingRestartItem,
  generateMovingRestartItems,
  moveMovingRestartItem,
  type MovingRestartItem,
  updateMovingRestartItem,
} from '@/lib/flow/moving-d30-restart';
import { formatUserFacingScheduleDate } from '@/lib/flow/date';
import { toUserFacingSourceTitle } from '@/lib/flow/display-title';
import { FLOW_EXPORT_LABELS } from '@/lib/flow/export-labels';

const defaultMoveDate = '2026-06-27';
const KOREAN_WEEKDAY_SHORT = ['일', '월', '화', '수', '목', '금', '토'];

function sortItems(items: MovingRestartItem[]) {
  return items.slice().sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function monthStart(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function formatMonthHeading(date: string) {
  const [year, month] = date.split('-');
  return `${year}년 ${Number(month)}월`;
}

function addMonths(date: string, count: number) {
  const current = new Date(`${monthStart(date)}T00:00:00`);
  current.setMonth(current.getMonth() + count);
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

function findFirstItemDateInMonth(items: MovingRestartItem[], monthDate: string) {
  const month = monthDate.slice(0, 7);
  return sortItems(items).find((item) => item.date.startsWith(month))?.date ?? monthStart(monthDate);
}

function getCalendarShortTitle(title: string) {
  if (title.includes('주소 변경')) return '주소';
  if (title.includes('업체 일정')) return '업체';
  if (title.includes('공과금')) return '정산';
  if (title.includes('전입신고')) return '전입';
  if (title.includes('대형폐기물')) return '폐기';
  if (title.includes('이사 방식')) return '업체';
  if (title.includes('하자 사진')) return '하자';
  return title.split(/\s+/).slice(0, 2).join(' ');
}

function groupScheduleMilestones(items: MovingRestartItem[]) {
  return items.reduce<Array<{ date: string; offsetLabel: string; items: MovingRestartItem[] }>>((groups, item) => {
    const last = groups.at(-1);
    if (last && last.date === item.date && last.offsetLabel === item.offsetLabel) {
      last.items.push(item);
      return groups;
    }

    groups.push({ date: item.date, offsetLabel: item.offsetLabel, items: [item] });
    return groups;
  }, []);
}

function getMilestoneHeading(group: { offsetLabel: string; items: MovingRestartItem[] }) {
  return group.items.length > 1 ? `${group.offsetLabel} 마일스톤 ${group.items.length}개` : group.offsetLabel;
}

export function MovingD30Restart() {
  const [moveDate, setMoveDate] = useState(defaultMoveDate);
  const [items, setItems] = useState(() => generateMovingRestartItems(defaultMoveDate));
  const [visibleMonth, setVisibleMonth] = useState(monthStart(defaultMoveDate));
  const [selectedDate, setSelectedDate] = useState(() =>
    findFirstItemDateInMonth(generateMovingRestartItems(defaultMoveDate), defaultMoveDate),
  );
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [editSurface, setEditSurface] = useState<'desktop' | 'mobile' | undefined>();
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftMemo, setDraftMemo] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(defaultMoveDate);
  const [newMemo, setNewMemo] = useState('');

  const sortedItems = useMemo(() => sortItems(items), [items]);
  const scheduleGroups = useMemo(() => groupScheduleMilestones(sortedItems), [sortedItems]);
  const selectedItem = items.find((item) => item.id === selectedId);
  const selectedDateItems = sortedItems.filter((item) => item.date === selectedDate);
  const nextItems = sortedItems.slice(0, 3);
  const doneCount = items.filter((item) => item.done).length;
  const itemCountByDate = items.reduce<Record<string, number>>((counts, item) => {
    counts[item.date] = (counts[item.date] ?? 0) + 1;
    return counts;
  }, {});

  const events = items.map((item) => ({
    id: item.id,
    title: item.title,
    start: item.date,
    allDay: true,
    classNames: [
      item.sourceType === 'official' ? 'moving-restart-official-event' : 'moving-restart-checklist-event',
      ...(itemCountByDate[item.date] === 1
        ? ['min-h-8', 'whitespace-normal', 'items-start', 'sm:min-h-0', 'sm:whitespace-nowrap']
        : []),
    ].filter(Boolean),
    extendedProps: {
      itemTitle: item.title,
      shortTitle: getCalendarShortTitle(item.title),
      itemCountOnDate: itemCountByDate[item.date] ?? 1,
      offsetLabel: item.offsetLabel,
    },
  }));

  function renderEventContent(info: EventContentArg) {
    const shortTitle = String(info.event.extendedProps.shortTitle ?? '');
    const itemTitle = String(info.event.extendedProps.itemTitle ?? '');
    const itemCountOnDate = Number(info.event.extendedProps.itemCountOnDate ?? 1);

    return (
      <span className="block min-w-0 px-0.5 text-[10px] font-bold leading-4 sm:px-1 sm:leading-5 sm:text-xs">
        <span className={itemCountOnDate === 1 ? 'line-clamp-2 whitespace-normal sm:hidden' : 'block truncate sm:hidden'}>
          {itemCountOnDate === 1 ? itemTitle : shortTitle}
        </span>
        <span className="hidden truncate sm:block">
          {itemTitle}
        </span>
      </span>
    );
  }

  function regenerate() {
    const nextItems = generateMovingRestartItems(moveDate);
    const nextMonth = monthStart(moveDate);
    setItems(nextItems);
    setSelectedId(undefined);
    setEditSurface(undefined);
    setSelectedDate(findFirstItemDateInMonth(nextItems, nextMonth));
    setVisibleMonth(nextMonth);
    setNewDate(moveDate);
  }

  function handleEventDrop(info: EventDropArg) {
    const nextDate = info.event.startStr;
    if (!nextDate) return;
    setItems((current) => moveMovingRestartItem(current, info.event.id, nextDate));
    setSelectedDate(nextDate);
  }

  function startEdit(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setSelectedId(id);
    setEditSurface(typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches ? 'mobile' : 'desktop');
    setSelectedDate(item.date);
    setDraftTitle(item.title);
    setDraftDate(item.date);
    setDraftMemo(item.memo);
  }

  function handleEventClick(info: EventClickArg) {
    startEdit(info.event.id);
  }

  function saveEdit() {
    if (!selectedId) return;
    setItems((current) =>
      updateMovingRestartItem(current, selectedId, {
        title: draftTitle,
        date: draftDate,
        memo: draftMemo,
      }),
    );
    setSelectedId(undefined);
    setEditSurface(undefined);
  }

  function deleteSelected() {
    if (!selectedId) return;
    setItems((current) => deleteMovingRestartItem(current, selectedId));
    setSelectedId(undefined);
    setEditSurface(undefined);
    setDraftTitle('');
    setDraftDate('');
    setDraftMemo('');
  }

  function addCustomItem() {
    const title = newTitle.trim();
    if (!title) return;
    setItems((current) => addMovingRestartItem(current, { title, date: newDate, memo: newMemo }));
    setSelectedDate(newDate);
    setVisibleMonth(monthStart(newDate));
    setNewTitle('');
    setNewMemo('');
    setShowAddForm(false);
  }

  function moveCalendarMonth(count: number) {
    const nextMonth = addMonths(visibleMonth, count);
    setVisibleMonth(nextMonth);
    setSelectedDate(findFirstItemDateInMonth(items, nextMonth));
  }

  function goToMoveMonth() {
    const nextMonth = monthStart(moveDate);
    setVisibleMonth(nextMonth);
    setSelectedDate(findFirstItemDateInMonth(items, nextMonth));
  }

  function handleDateClick(info: DateClickArg) {
    setSelectedDate(info.dateStr);
  }

  function toggleDone(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setItems((current) => updateMovingRestartItem(current, id, { done: !item.done }));
  }

  function downloadBlob(fileName: string, type: string, value: BlobPart) {
    const blob = new Blob([value], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  function copyChecklist() {
    const text = buildMovingRestartChecklistText(items);
    void navigator.clipboard?.writeText(text);
    setFeedback('체크리스트를 만들었습니다');
  }

  function downloadCalendar() {
    downloadBlob('moving-d30-flow.ics', 'text/calendar;charset=utf-8', buildMovingRestartIcs(items));
    setFeedback('캘린더 파일을 만들었습니다');
  }

  async function downloadSheet() {
    const { buildXlsxBuffer } = await import('@/lib/flow/export');
    const buffer = await buildXlsxBuffer(buildMovingRestartSheets(items));
    downloadBlob('moving-d30-flow.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer);
    setFeedback(`${FLOW_EXPORT_LABELS.sheetFile} 완료`);
  }

  function isDemoLoggedIn() {
    return typeof window !== 'undefined' && window.localStorage.getItem('flow:auth:demo-user') === 'true';
  }

  function saveToMyFlow() {
    if (!isDemoLoggedIn()) {
      setShowAuthGate(true);
      return;
    }
    window.localStorage.setItem(
      'flow:saved:restart-moving-d30',
      JSON.stringify({
        slug: 'restart-moving-d30',
        savedAt: new Date().toISOString(),
        selectedArtifactMode: 'calendar',
        anchor: moveDate,
        items,
      }),
    );
    setSaved(true);
    setFeedback('내 Flow에 저장했습니다');
  }

  function focusExportPanel() {
    document.getElementById('moving-restart-export-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <main className="min-h-screen bg-slate-100 px-2 py-3 pb-28 text-slate-950 sm:px-4 sm:py-8 lg:pb-8">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl border border-slate-200 bg-white px-3 py-4 shadow-sm sm:rounded-[28px] sm:p-6">
          <p className="text-sm font-semibold text-blue-600">이사 준비 · 다시 시작</p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal">이사 D-30 준비</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            이사일을 넣으면 웹 체크리스트가 날짜별 캘린더와 실행표로 바뀝니다.
          </p>

          <label className="mt-6 block text-sm font-semibold text-slate-700" htmlFor="moving-restart-date">
            이사일
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="moving-restart-date"
              aria-label="이사일"
              type="date"
              value={moveDate}
              onChange={(event) => {
                setMoveDate(event.target.value);
                setNewDate(event.target.value);
              }}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-semibold"
            />
            <button
              type="button"
              onClick={regenerate}
              className="h-12 rounded-2xl bg-blue-600 px-5 text-base font-bold text-white"
            >
              일정 만들기
            </button>
          </div>

          <section data-testid="moving-mobile-next-tasks" className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-3 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-700">먼저 볼 일정</p>
                <h2 className="mt-1 text-lg font-black text-slate-950">다음 할 일</h2>
              </div>
              <p className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700">{doneCount}/{items.length} 완료</p>
            </div>
            <div className="mt-3 grid gap-2">
              {nextItems.map((item) => (
                <article key={item.id} className="rounded-xl bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-blue-700">
                        {formatUserFacingScheduleDate(item.date, { offsetLabel: item.offsetLabel })}
                      </p>
                      <h3 className="mt-1 text-sm font-black text-slate-950">{item.title}</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(item.id)}
                      className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                    >
                      수정
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-6" aria-label="이사 D-30 캘린더" role="region">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">생성된 캘린더</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 sm:block">
                  날짜를 끌어 옮기거나 아래 일정에서 편집한 뒤 내보냅니다.
                </p>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {doneCount}/{items.length} 완료
              </p>
            </div>
            <div className="-mx-1 mt-3 rounded-xl border border-slate-200 bg-white p-1 sm:mx-0 sm:rounded-3xl sm:p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  aria-label="이전 달"
                  onClick={() => moveCalendarMonth(-1)}
                  className="min-h-9 rounded-xl bg-slate-100 px-2.5 text-sm font-bold text-slate-700 sm:px-3"
                >
                  이전
                </button>
                <h3 className="text-base font-black text-slate-950">{formatMonthHeading(visibleMonth)}</h3>
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="기준월"
                    onClick={goToMoveMonth}
                    className="min-h-9 rounded-xl bg-slate-100 px-2.5 text-sm font-bold text-slate-700 sm:px-3"
                  >
                    기준월
                  </button>
                  <button
                    type="button"
                    aria-label="다음 달"
                    onClick={() => moveCalendarMonth(1)}
                    className="min-h-9 rounded-xl bg-slate-100 px-2.5 text-sm font-bold text-slate-700 sm:px-3"
                  >
                    다음
                  </button>
                </div>
              </div>
              <FullCalendar
                key={visibleMonth}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate={visibleMonth}
                headerToolbar={false}
                dayHeaderContent={(args) => KOREAN_WEEKDAY_SHORT[args.date.getDay()]}
                height="auto"
                editable
                events={events}
                eventContent={renderEventContent}
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
                dateClick={handleDateClick}
              />
            </div>
            <div
              data-testid="moving-calendar-selected-day"
              className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 sm:hidden"
            >
              <p className="text-xs font-bold text-slate-500">선택한 날짜</p>
              <h3 className="mt-1 text-base font-black text-slate-950">{formatUserFacingScheduleDate(selectedDate)}</h3>
              {selectedDateItems.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {selectedDateItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => startEdit(item.id)}
                      aria-label={`${item.title} 수정`}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left"
                    >
                      <span className="text-xs font-bold text-blue-700">{item.offsetLabel}</span>
                      <span className="mt-1 block text-sm font-black text-slate-950">{item.title}</span>
                      {item.memo ? <span className="mt-1 block text-xs leading-5 text-slate-600">{item.memo}</span> : null}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm leading-6 text-slate-600">이 날짜에 등록된 일정이 없습니다.</p>
              )}
            </div>
          </section>

          <section data-testid="moving-mobile-full-schedule" className="mt-7" aria-label="생성된 이사 일정">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">전체 일정</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 lg:hidden">
                  전체 {items.length}개 일정은 필요할 때 펼쳐서 확인합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm((value) => !value)}
                className="min-h-10 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700"
              >
                항목 추가
              </button>
            </div>

            {showAddForm ? (
              <div className="mt-3 rounded-3xl border border-blue-100 bg-blue-50 p-4">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="moving-new-title">
                  새 항목 제목
                </label>
                <input
                  id="moving-new-title"
                  aria-label="새 항목 제목"
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold"
                />
                <label className="mt-3 block text-sm font-semibold text-slate-700" htmlFor="moving-new-date">
                  새 항목 날짜
                </label>
                <input
                  id="moving-new-date"
                  aria-label="새 항목 날짜"
                  type="date"
                  value={newDate}
                  onChange={(event) => setNewDate(event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold"
                />
                <label className="mt-3 block text-sm font-semibold text-slate-700" htmlFor="moving-new-memo">
                  새 항목 메모
                </label>
                <textarea
                  id="moving-new-memo"
                  aria-label="새 항목 메모"
                  value={newMemo}
                  onChange={(event) => setNewMemo(event.target.value)}
                  className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addCustomItem}
                  className="mt-3 min-h-11 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
                >
                  새 항목 저장
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setShowFullSchedule((value) => !value)}
              className="mt-3 min-h-11 w-full rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700 lg:hidden"
            >
              {showFullSchedule ? '전체 일정 접기' : `전체 ${items.length}개 보기`}
            </button>

            <div
              data-testid="moving-full-schedule-list"
              className={`mt-3 divide-y divide-slate-100 rounded-3xl border border-slate-200 ${showFullSchedule ? 'block' : 'hidden lg:block'}`}
            >
              {scheduleGroups.map((group) => (
                <section
                  key={`${group.date}-${group.offsetLabel}`}
                  data-testid="moving-schedule-date-group"
                  className="bg-white"
                >
                  <div
                    data-testid="moving-schedule-date-group-heading"
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3"
                  >
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {getMilestoneHeading(group)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {formatUserFacingScheduleDate(group.date)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {group.items.map((item) => (
                      <article key={item.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div>
                          <h3 className="text-base font-bold">{item.title}</h3>
                          <p className="mt-1 text-sm leading-6 text-slate-600">{item.memo}</p>
                        </div>
                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => toggleDone(item.id)}
                            className="min-h-10 rounded-2xl bg-slate-100 px-3 text-sm font-bold text-slate-700"
                          >
                            {item.done ? '완료됨' : '완료'}
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(item.id)}
                            className="min-h-10 rounded-2xl bg-slate-100 px-3 text-sm font-bold text-slate-700"
                          >
                            {item.title} 편집
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section id="moving-restart-export-panel" className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">내보낼 파일</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              수정한 일정 기준으로 캘린더 파일, 체크리스트, 시트, FlowMe 저장을 선택합니다.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={downloadCalendar}
                className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
              >
                {FLOW_EXPORT_LABELS.calendarFile}
              </button>
              <button
                type="button"
                onClick={copyChecklist}
                className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700"
              >
                {FLOW_EXPORT_LABELS.checklistCopy}
              </button>
              <button
                type="button"
                onClick={() => void downloadSheet()}
                className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700"
              >
                {FLOW_EXPORT_LABELS.sheetFile}
              </button>
              <button
                type="button"
                onClick={saveToMyFlow}
                className="min-h-11 rounded-2xl bg-violet-100 px-4 text-sm font-bold text-violet-800"
              >
                내 Flow로 저장
              </button>
            </div>
            {feedback ? (
              <div className="mt-4 rounded-2xl bg-green-50 p-3 text-sm font-semibold text-green-800">
                {feedback}
                {saved ? (
                  <a className="ml-2 underline" href="/my">
                    내 Flow에서 보기
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>

          <section data-testid="moving-source-section" className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">출처 분리</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 lg:hidden">체크리스트와 공식 전입신고 안내를 따로 확인합니다.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSources((value) => !value)}
                className="min-h-10 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700 lg:hidden"
              >
                {showSources ? '출처 접기' : '출처 보기'}
              </button>
            </div>
            <div className={showSources ? 'mt-3 block' : 'mt-3 hidden lg:block'}>
              <a
                className="block rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700 hover:bg-slate-100"
                href="https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC%ED%95%A0_%EB%95%8C_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_%EC%83%81%EC%84%B8_%EC%A0%95%EB%A6%AC-47214"
                rel="noreferrer"
                target="_blank"
              >
                {toUserFacingSourceTitle('AJD 이사할 때 체크리스트 상세 정리')}
              </a>
              <a
                className="mt-2 block rounded-2xl bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700 hover:bg-slate-100"
                href="https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000016&HighCtgCD=A0101"
                rel="noreferrer"
                target="_blank"
              >
                정부24 전입신고 민원안내 및 신청
              </a>
            </div>
          </section>

          <section className="hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm lg:block">
            <h2 className="text-lg font-bold">선택한 항목 편집</h2>
            {selectedItem && editSurface === 'desktop' ? (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="moving-edit-title">
                  항목 제목
                </label>
                <input
                  id="moving-edit-title"
                  aria-label="항목 제목"
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
                />
                <label className="mt-3 block text-sm font-semibold text-slate-700" htmlFor="moving-edit-date">
                  항목 날짜
                </label>
                <input
                  id="moving-edit-date"
                  aria-label="항목 날짜"
                  type="date"
                  value={draftDate}
                  onChange={(event) => setDraftDate(event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
                />
                <label className="mt-3 block text-sm font-semibold text-slate-700" htmlFor="moving-edit-memo">
                  항목 메모
                </label>
                <textarea
                  id="moving-edit-memo"
                  aria-label="항목 메모"
                  value={draftMemo}
                  onChange={(event) => setDraftMemo(event.target.value)}
                  className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="min-h-11 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
                  >
                    항목 저장
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="min-h-11 rounded-2xl bg-red-50 px-4 text-sm font-bold text-red-700"
                  >
                    항목 삭제
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-600">
                캘린더 이벤트나 일정의 편집 버튼을 눌러 제목, 날짜, 메모를 수정합니다.
              </p>
            )}
          </section>
        </aside>
      </div>

      {showAuthGate ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/30 px-4">
          <section
            role="dialog"
            aria-label="내 Flow로 저장할까요?"
            className="w-full max-w-sm rounded-[28px] bg-white p-6 shadow-2xl"
          >
            <h2 className="text-2xl font-bold">내 Flow로 저장할까요?</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              로그인하면 수정한 이사 D-30 일정을 FlowMe에서 다시 열고 체크할 수 있습니다.
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  window.localStorage.setItem('flow:auth:demo-user', 'true');
                  setShowAuthGate(false);
                  saveToMyFlow();
                }}
                className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
              >
                로그인/회원가입
              </button>
              <button
                type="button"
                onClick={() => setShowAuthGate(false)}
                className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700"
              >
                계속 둘러보기
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <div
        data-testid="moving-mobile-export-actions"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-3 py-3 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-sm grid-cols-[1fr] gap-2">
          <button
            type="button"
            onClick={focusExportPanel}
            className="min-h-11 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
          >
            파일 받기 옵션
          </button>
        </div>
      </div>

      {selectedItem && editSurface === 'mobile' ? (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/30 px-2 pb-2 lg:hidden">
          <section
            role="dialog"
            aria-label="일정 수정"
            className="w-full rounded-[24px] bg-white p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-700">{selectedItem.offsetLabel}</p>
                <h2 className="mt-1 text-xl font-black">일정 수정</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedId(undefined);
                  setEditSurface(undefined);
                }}
                className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"
              >
                닫기
              </button>
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700" htmlFor="moving-mobile-edit-title">
              항목 제목
            </label>
            <input
              id="moving-mobile-edit-title"
              aria-label="항목 제목"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
            />
            <label className="mt-3 block text-sm font-semibold text-slate-700" htmlFor="moving-mobile-edit-date">
              항목 날짜
            </label>
            <input
              id="moving-mobile-edit-date"
              aria-label="항목 날짜"
              type="date"
              value={draftDate}
              onChange={(event) => setDraftDate(event.target.value)}
              className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold"
            />
            <label className="mt-3 block text-sm font-semibold text-slate-700" htmlFor="moving-mobile-edit-memo">
              항목 메모
            </label>
            <textarea
              id="moving-mobile-edit-memo"
              aria-label="항목 메모"
              value={draftMemo}
              onChange={(event) => setDraftMemo(event.target.value)}
              className="mt-2 min-h-20 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
            />
            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={saveEdit}
                className="min-h-11 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
              >
                항목 저장
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                className="min-h-11 rounded-2xl bg-red-50 px-4 text-sm font-bold text-red-700"
              >
                삭제
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
