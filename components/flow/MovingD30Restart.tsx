'use client';

import type { EventClickArg, EventDropArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
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
import { buildXlsxBuffer } from '@/lib/flow/export';

const defaultMoveDate = '2026-06-27';

function sortItems(items: MovingRestartItem[]) {
  return items.slice().sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

export function MovingD30Restart() {
  const [moveDate, setMoveDate] = useState(defaultMoveDate);
  const [items, setItems] = useState(() => generateMovingRestartItems(defaultMoveDate));
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDate, setDraftDate] = useState('');
  const [draftMemo, setDraftMemo] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saved, setSaved] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(defaultMoveDate);
  const [newMemo, setNewMemo] = useState('');

  const sortedItems = useMemo(() => sortItems(items), [items]);
  const selectedItem = items.find((item) => item.id === selectedId);
  const doneCount = items.filter((item) => item.done).length;

  const events = items.map((item) => ({
    id: item.id,
    title: `${item.offsetLabel} ${item.title}`,
    start: item.date,
    allDay: true,
    classNames: item.sourceType === 'official' ? ['moving-restart-official-event'] : ['moving-restart-checklist-event'],
  }));

  function regenerate() {
    const nextItems = generateMovingRestartItems(moveDate);
    setItems(nextItems);
    setSelectedId(undefined);
    setNewDate(moveDate);
  }

  function handleEventDrop(info: EventDropArg) {
    const nextDate = info.event.startStr;
    if (!nextDate) return;
    setItems((current) => moveMovingRestartItem(current, info.event.id, nextDate));
  }

  function startEdit(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    setSelectedId(id);
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
  }

  function deleteSelected() {
    if (!selectedId) return;
    setItems((current) => deleteMovingRestartItem(current, selectedId));
    setSelectedId(undefined);
    setDraftTitle('');
    setDraftDate('');
    setDraftMemo('');
  }

  function addCustomItem() {
    const title = newTitle.trim();
    if (!title) return;
    setItems((current) => addMovingRestartItem(current, { title, date: newDate, memo: newMemo }));
    setNewTitle('');
    setNewMemo('');
    setShowAddForm(false);
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
    const buffer = await buildXlsxBuffer(buildMovingRestartSheets(items));
    downloadBlob('moving-d30-flow.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer);
    setFeedback('엑셀 실행표를 만들었습니다');
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

          <section className="mt-7" aria-label="이사 D-30 캘린더" role="region">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold">생성된 캘린더</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  날짜를 끌어 옮기거나 아래 일정에서 편집한 뒤 export합니다.
                </p>
              </div>
              <p className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {doneCount}/{items.length} 완료
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
                eventClick={handleEventClick}
                eventDrop={handleEventDrop}
              />
            </div>
          </section>

          <section className="mt-7" aria-label="생성된 이사 일정">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">다가오는 일정</h2>
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

            <div className="mt-3 divide-y divide-slate-100 rounded-3xl border border-slate-200">
              {sortedItems.map((item) => (
                <article key={item.id} className="grid gap-3 p-4 sm:grid-cols-[64px_1fr_auto] sm:items-center">
                  <div className="grid h-12 place-items-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
                    {item.offsetLabel}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-500">{item.date}</p>
                    <h3 className="mt-1 text-base font-bold">{item.title}</h3>
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
        </section>

        <aside className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">내 도구로 가져가기</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              수정한 일정 기준으로 캘린더, 체크리스트, 엑셀, FlowMe 저장을 선택합니다.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={downloadCalendar}
                className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white"
              >
                캘린더에 넣기
              </button>
              <button
                type="button"
                onClick={copyChecklist}
                className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700"
              >
                체크리스트 복사
              </button>
              <button
                type="button"
                onClick={() => void downloadSheet()}
                className="min-h-11 rounded-2xl bg-slate-100 px-4 text-sm font-bold text-slate-700"
              >
                엑셀 실행표
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

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">출처 분리</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">아정당 이사 준비 체크리스트</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">정부24 전입신고 안내</p>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">선택한 항목 편집</h2>
            {selectedItem ? (
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
    </main>
  );
}
