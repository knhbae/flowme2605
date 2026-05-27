'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventDropArg } from '@fullcalendar/core';
import { useState } from 'react';
import { generateMovingRestartItems, moveMovingRestartItem } from '@/lib/flow/moving-d30-restart';

const defaultMoveDate = '2026-06-27';

export function MovingD30Restart() {
  const [moveDate, setMoveDate] = useState(defaultMoveDate);
  const [items, setItems] = useState(() => generateMovingRestartItems(defaultMoveDate));

  const events = items.map((item) => ({
    id: item.id,
    title: `${item.offsetLabel} ${item.title}`,
    start: item.date,
    allDay: true,
    classNames: item.sourceType === 'official' ? ['moving-restart-official-event'] : ['moving-restart-checklist-event'],
  }));

  function regenerate() {
    setItems(generateMovingRestartItems(moveDate));
  }

  function handleEventDrop(info: EventDropArg) {
    const nextDate = info.event.startStr;
    if (!nextDate) return;
    setItems((current) => moveMovingRestartItem(current, info.event.id, nextDate));
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950">
      <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_340px]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-blue-600">restart / moving-d30</p>
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
              onChange={(event) => setMoveDate(event.target.value)}
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

          <section className="mt-7" aria-label="이사 D-30 캘린더" role="region">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">생성된 캘린더</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  날짜를 끌어 옮기면 export 일정도 함께 바뀝니다.
                </p>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                FullCalendar month view
              </p>
            </div>
            <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-3">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate={moveDate}
                headerToolbar={false}
                height="auto"
                editable
                events={events}
                eventDrop={handleEventDrop}
              />
            </div>
          </section>

          <section className="mt-7" aria-label="생성된 이사 일정">
            <h2 className="text-lg font-bold">다가오는 일정</h2>
            <div className="mt-3 divide-y divide-slate-100 rounded-3xl border border-slate-200">
              {items.map((item) => (
                <article key={item.id} className="grid grid-cols-[64px_1fr] gap-3 p-4">
                  <div className="grid h-12 place-items-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                    {item.offsetLabel}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{item.date}</p>
                    <h3 className="mt-1 text-base font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.memo}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">출처 분리</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">아정당 이사 준비 체크리스트</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">정부24 전입신고 안내</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
