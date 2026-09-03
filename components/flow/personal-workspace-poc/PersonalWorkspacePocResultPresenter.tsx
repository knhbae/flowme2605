'use client';

import React, { type KeyboardEvent } from 'react';

import type {
  PersonalWorkspacePocResultDownloadFile,
  PersonalWorkspacePocResultItem,
  PersonalWorkspacePocResultNavigationState,
  PersonalWorkspacePocResultProjection,
  PersonalWorkspacePocResultTextLine,
  PersonalWorkspacePocResultView,
} from '@/lib/flow/personal-workspace-poc-result-projection';

const RESULT_VIEWS: readonly Readonly<{
  view: PersonalWorkspacePocResultView;
  label: string;
}>[] = [
  { view: 'text', label: 'TXT' },
  { view: 'todo', label: '할 일' },
  { view: 'calendar', label: '캘린더' },
  { view: 'sheet', label: '표' },
];

const RESULT_PANEL_ID = 'personal-workspace-result-panel';

export const PERSONAL_WORKSPACE_POC_RESULT_FORBIDDEN_CAPABILITIES = Object.freeze({
  operatingWriter: false,
  actualCalendarRoute: false,
  sheet: false,
  operatingExportWriter: false,
  localFileDownload: true,
});

export type PersonalWorkspacePocLocalDownloadPort = Readonly<{
  createObjectUrl: (blob: Blob) => string;
  revokeObjectUrl: (url: string) => void;
  attachAnchor: (filename: string, url: string) => Readonly<{
    click: () => void;
    remove: () => void;
  }>;
}>;

function browserLocalDownloadPort(): PersonalWorkspacePocLocalDownloadPort {
  return {
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    attachAnchor: (filename, url) => {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.hidden = true;
      document.body.append(anchor);
      return anchor;
    },
  };
}

/** Uses a transient browser Blob/anchor only; it never reaches storage or an operating export writer. */
export function triggerPersonalWorkspacePocLocalResultDownload(
  file: PersonalWorkspacePocResultDownloadFile,
  port: PersonalWorkspacePocLocalDownloadPort = browserLocalDownloadPort(),
): void {
  const objectUrl = port.createObjectUrl(new Blob([file.payload], { type: file.mediaType }));
  let anchor: ReturnType<PersonalWorkspacePocLocalDownloadPort['attachAnchor']> | undefined;
  try {
    anchor = port.attachAnchor(file.filename, objectUrl);
    anchor.click();
  } finally {
    anchor?.remove();
    port.revokeObjectUrl(objectUrl);
  }
}

function downloadResultFile(
  file: PersonalWorkspacePocResultDownloadFile,
  statusId: string,
  label: 'TXT' | 'CSV',
): void {
  const status = document.getElementById(statusId);
  try {
    triggerPersonalWorkspacePocLocalResultDownload(file);
    if (status) status.textContent = `${label} 다운로드를 요청했어요. 데이터는 바뀌지 않았어요.`;
  } catch {
    if (status) status.textContent = `${label} 파일을 만들지 못했어요. 다시 시도해 주세요.`;
  }
}

export type PersonalWorkspacePocResultOpenItemIntent = Readonly<{
  flowRef: string;
  itemRef: string;
  occurrenceId?: string;
  resultView: PersonalWorkspacePocResultView;
  selectedDate?: string;
  returnFocusSelector: string;
}>;

export type PersonalWorkspacePocResultPresenterProps = Readonly<{
  projection: PersonalWorkspacePocResultProjection;
  navigation: PersonalWorkspacePocResultNavigationState;
  onResultViewChange: (view: PersonalWorkspacePocResultView) => void;
  onCalendarBaseDateChange: (baseDate: string) => void;
  onCalendarSelectedDateChange: (selectedDate: string) => void;
  onOpenItem: (intent: PersonalWorkspacePocResultOpenItemIntent) => void;
  onToggleOccurrence?: (item: PersonalWorkspacePocResultItem) => void;
  onMoveOccurrenceDate?: (item: PersonalWorkspacePocResultItem, date?: string) => void;
  onRestoreOccurrenceDate?: (item: PersonalWorkspacePocResultItem) => void;
  headingId?: string;
}>;

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 stroke-current" strokeWidth="2.25">
      <path d="m3 8 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ direction }: Readonly<{ direction: 'previous' | 'next' }>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="mx-auto h-5 w-5 stroke-current" strokeWidth="1.8">
      <path
        d={direction === 'previous' ? 'm12.5 4.5-5 5.5 5 5.5' : 'm7.5 4.5 5 5.5-5 5.5'}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatPlainDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}월 ${day}일`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${year}년 ${monthNumber}월`;
}

/** Keeps a valid plain-date day when possible and clamps it at month end. */
export function shiftPersonalWorkspacePocResultMonth(
  baseDate: string,
  monthDelta: -1 | 1,
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(baseDate);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const source = new Date(Date.UTC(year, month - 1, day));
  if (source.getUTCFullYear() !== year
    || source.getUTCMonth() !== month - 1
    || source.getUTCDate() !== day) return null;

  const targetFirst = new Date(Date.UTC(year, month - 1 + monthDelta, 1));
  const targetYear = targetFirst.getUTCFullYear();
  const targetMonth = targetFirst.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function itemRowData(item: PersonalWorkspacePocResultItem) {
  return {
    'data-testid': 'personal-workspace-result-item-row',
    'data-item-ref': item.ref,
    'data-effective-date': item.effectiveDate ?? 'undated',
    'data-completed': item.completed ? 'true' : 'false',
    'data-source-item-ref': item.sourceItemRef ?? item.ref,
    'data-occurrence-id': item.occurrenceId ?? '',
    'data-plan-order': String(item.planOrder),
    'data-context-order': String(item.contextOrder),
  } as const;
}

function itemButtonId(
  view: PersonalWorkspacePocResultView,
  item: PersonalWorkspacePocResultItem,
): string {
  return `personal-workspace-result-${view}-item-${item.planOrder}`;
}

function openItem(
  props: PersonalWorkspacePocResultPresenterProps,
  item: PersonalWorkspacePocResultItem,
  view: PersonalWorkspacePocResultView,
): void {
  const id = itemButtonId(view, item);
  props.onOpenItem({
    flowRef: props.projection.flowRef,
    itemRef: item.sourceItemRef ?? item.ref,
    ...(item.occurrenceId ? { occurrenceId: item.occurrenceId } : {}),
    resultView: view,
    ...(view === 'calendar' ? { selectedDate: props.projection.selectedDate } : {}),
    returnFocusSelector: `#${id}`,
  });
}

function itemDateLabel(item: PersonalWorkspacePocResultItem): string {
  if (!item.effectiveDate) return '날짜 미정';
  if (item.planDate && item.planDate !== item.effectiveDate) {
    return `계획 ${formatPlainDate(item.planDate)} · 실행 ${formatPlainDate(item.effectiveDate)}`;
  }
  return formatPlainDate(item.effectiveDate);
}

function renderResultItemButton(
  props: PersonalWorkspacePocResultPresenterProps,
  item: PersonalWorkspacePocResultItem,
  view: PersonalWorkspacePocResultView,
) {
  const status = item.completed ? '완료' : '진행 중';
  return (
    <div className="min-w-0 py-1">
    <button
      id={itemButtonId(view, item)}
      type="button"
      data-result-open-item={item.sourceItemRef ?? item.ref}
      data-result-occurrence-id={item.occurrenceId ?? ''}
      className="flex min-h-12 w-full min-w-0 items-start gap-3 rounded-md px-2 py-2 text-left outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-700 active:bg-slate-100 motion-reduce:transition-none"
      aria-label={`${item.title} 열기, ${itemDateLabel(item)}, ${status}`}
      onClick={() => openItem(props, item, view)}
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 ${item.completed ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-400 bg-white'}`}
      >
        {item.completed ? <CheckIcon /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <strong className={`block break-words text-sm leading-6 [overflow-wrap:anywhere] ${item.completed ? 'text-slate-600 line-through decoration-slate-400' : 'text-slate-950'}`}>
          {item.title}
        </strong>
        <span className="mt-0.5 block break-words text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
          {itemDateLabel(item)}{item.time ? ` · ${item.time}` : ''} · {status}
          {item.timelinePolicy === 'excluded' ? ' · 기간 목록에서 숨김' : ''}
        </span>
      </span>
    </button>
    {item.occurrenceId ? (
      <div className="ml-8 flex min-w-0 flex-wrap items-end gap-2 px-2 pb-2" data-testid="personal-workspace-result-occurrence-actions">
        <label className="grid min-w-[9.5rem] flex-1 gap-1 text-xs font-semibold text-slate-600">
          이 회차 실행일
          <input
            type="date"
            aria-label={`${item.title} ${item.occurrenceIndex ?? ''}회차 실행일`}
            value={item.effectiveDate ?? ''}
            className="min-h-11 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            onChange={(event) => props.onMoveOccurrenceDate?.(item, event.currentTarget.value || undefined)}
          />
        </label>
        <button
          type="button"
          className="min-h-11 rounded-md border border-teal-700 bg-white px-3 text-xs font-semibold text-teal-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          onClick={() => props.onToggleOccurrence?.(item)}
        >{item.completed ? '이 회차 다시 열기' : '이 회차 완료'}</button>
        {item.effectiveDate !== item.originalOccurrenceDate ? (
          <button
            type="button"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
            onClick={() => props.onRestoreOccurrenceDate?.(item)}
          >원래 날짜</button>
        ) : null}
      </div>
    ) : null}
    </div>
  );
}

function textLineClass(line: PersonalWorkspacePocResultTextLine): string {
  if (line.kind === 'flow-title') return 'font-semibold text-slate-950';
  if (line.kind === 'section') return 'mt-3 font-semibold text-teal-900';
  if (line.kind === 'item') return 'mt-1 text-slate-950';
  return 'text-slate-600';
}

function renderTextResult(props: PersonalWorkspacePocResultPresenterProps) {
  const itemByRef = new Map(props.projection.items.map((item) => [item.ref, item]));
  const txtDownload = props.projection.downloads?.txt;
  return (
    <div data-testid="personal-workspace-result-text-panel" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm leading-6 text-slate-600">복사 가능한 개인 실행 결과입니다. 여기서 바꾼 개인 계획은 작성 원문을 수정하지 않습니다.</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            data-testid="personal-workspace-result-txt-copy"
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none hover:border-teal-700 focus-visible:ring-2 focus-visible:ring-teal-700"
            onClick={async () => {
              const status = document.getElementById('personal-workspace-result-txt-copy-status');
              try {
                await navigator.clipboard.writeText(
                  props.projection.txt.copyText ?? props.projection.txt.normalizedText,
                );
                if (status) status.textContent = 'TXT를 복사했어요. 데이터는 바뀌지 않았어요.';
              } catch {
                if (status) status.textContent = '복사하지 못했어요. 다시 시도해 주세요.';
              }
            }}
          >
            TXT 복사
          </button>
          {txtDownload ? (
            <button
              type="button"
              data-testid="personal-workspace-result-txt-download"
              className="min-h-11 rounded-md border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-900 outline-none hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-teal-700"
              onClick={() => downloadResultFile(
                txtDownload,
                'personal-workspace-result-txt-copy-status',
                'TXT',
              )}
            >
              TXT 다운로드
            </button>
          ) : null}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <ol className="m-0 grid min-w-0 list-none gap-1 p-0 font-mono text-sm leading-6">
          {props.projection.text.lines.map((line, index) => {
            const item = line.kind === 'item' && line.itemRef
              ? itemByRef.get(line.itemRef)
              : undefined;
            return (
              <li
                key={`${line.kind}:${line.itemRef ?? 'flow'}:${index}`}
                {...(item ? itemRowData(item) : {})}
                className={`min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${textLineClass(line)}`}
              >
                {item ? (
                  <button
                    id={itemButtonId('text', item)}
                    type="button"
                    data-result-open-item={item.ref}
                    className="min-h-11 w-full whitespace-pre-wrap rounded px-1 text-left font-mono outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-teal-700 active:bg-slate-100"
                    aria-label={`${item.title} 열기, ${itemDateLabel(item)}, ${item.completed ? '완료' : '진행 중'}`}
                    onClick={() => openItem(props, item, 'text')}
                  >
                    {line.text}
                  </button>
                ) : line.text}
              </li>
            );
          })}
        </ol>
      </div>
      <p id="personal-workspace-result-txt-copy-status" data-testid="personal-workspace-result-txt-copy-status" role="status" aria-live="polite" className="mt-2 min-h-5 text-xs font-semibold text-slate-600" />
    </div>
  );
}

function renderSheetResult(props: PersonalWorkspacePocResultPresenterProps) {
  const sheet = props.projection.sheet;
  if (!sheet) {
    return <p data-testid="personal-workspace-result-sheet-panel" className="py-8 text-center text-sm text-slate-600">이전 결과에는 표 정보가 없습니다.</p>;
  }
  const csvDownload = props.projection.downloads?.csv;
  const displayColumns = sheet.columns.filter((column) => !column.technical);
  return (
    <div data-testid="personal-workspace-result-sheet-panel" className="min-w-0">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm leading-6 text-slate-600">같은 Item을 행으로 펼친 읽기 전용 표입니다.</p>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-xs font-semibold text-teal-800">{sheet.rowCount}행</span>
          {csvDownload ? (
            <button
              type="button"
              data-testid="personal-workspace-result-csv-download"
              className="min-h-11 rounded-md border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-900 outline-none hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-teal-700"
              onClick={() => downloadResultFile(
                csvDownload,
                'personal-workspace-result-csv-download-status',
                'CSV',
              )}
            >
              CSV 다운로드
            </button>
          ) : null}
        </div>
      </div>
      <div className="max-w-full overflow-x-auto rounded-lg border border-slate-200" tabIndex={0} aria-label="Item 결과 표, 가로로 스크롤 가능">
        <table className="min-w-[58rem] border-collapse text-left text-xs leading-5">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              {displayColumns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap border-b border-slate-300 px-3 py-2 font-semibold">{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row) => (
              <tr key={row.rowId} {...itemRowData(row.item)} data-sheet-row-id={row.rowId} className="border-b border-slate-200 last:border-b-0">
                {displayColumns.map((column) => {
                  const value = row.values[column.key];
                  const content = value === null || value === '' ? '—' : String(value);
                  return (
                    <td key={column.key} className="max-w-[18rem] whitespace-pre-wrap break-words px-3 py-2 align-top [overflow-wrap:anywhere]">
                      {column.key === 'title' ? (
                        <button
                          id={itemButtonId('sheet', row.item)}
                          type="button"
                          data-result-open-item={row.itemRef}
                          className="min-h-11 rounded px-1 text-left font-semibold text-slate-950 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-700"
                          onClick={() => openItem(props, row.item, 'sheet')}
                        >
                          {content}
                        </button>
                      ) : content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p id="personal-workspace-result-csv-download-status" data-testid="personal-workspace-result-csv-download-status" role="status" aria-live="polite" className="mt-2 min-h-5 text-xs font-semibold text-slate-600" />
    </div>
  );
}

function renderTodoResult(props: PersonalWorkspacePocResultPresenterProps) {
  if (props.projection.todo.rowCount === 0) {
    return <p className="border-y border-slate-200 py-8 text-center text-sm text-slate-600">표시할 할 일이 없습니다.</p>;
  }
  return (
    <div data-testid="personal-workspace-result-todo-panel" className="grid min-w-0 gap-6">
      {props.projection.todo.groups.map((group, groupIndex) => (
        <section key={group.key} aria-labelledby={`personal-workspace-result-todo-group-${groupIndex}`}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-300 pb-2">
            <h3 id={`personal-workspace-result-todo-group-${groupIndex}`} className="text-base font-semibold text-slate-950">
              {group.label}
            </h3>
            <span className="shrink-0 text-xs font-semibold text-teal-800">{group.items.length}개</span>
          </div>
          <div className="grid gap-4 pt-2 sm:pl-2">
            {group.sections.map((section, sectionIndex) => (
              <section key={section.key} aria-labelledby={`personal-workspace-result-todo-section-${groupIndex}-${sectionIndex}`}>
                <h4 id={`personal-workspace-result-todo-section-${groupIndex}-${sectionIndex}`} className="px-2 text-xs font-semibold text-slate-600">
                  {section.title}
                </h4>
                <ol className="mt-1 m-0 divide-y divide-slate-200 p-0">
                  {section.items.map((item) => (
                    <li key={item.ref} {...itemRowData(item)} className="list-none">
                      {renderResultItemButton(props, item, 'todo')}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function renderCalendarItems(
  props: PersonalWorkspacePocResultPresenterProps,
  items: readonly PersonalWorkspacePocResultItem[],
  emptyMessage: string,
) {
  if (items.length === 0) return <p className="py-5 text-sm text-slate-600">{emptyMessage}</p>;
  return (
    <ol className="m-0 divide-y divide-slate-200 p-0">
      {items.map((item) => (
        <li key={item.ref} {...itemRowData(item)} className="list-none">
          {renderResultItemButton(props, item, 'calendar')}
        </li>
      ))}
    </ol>
  );
}

function renderCalendarResult(props: PersonalWorkspacePocResultPresenterProps) {
  const calendar = props.projection.calendar;
  const itemByRef = new Map(props.projection.items.map((item) => [item.ref, item]));
  const undated = calendar.undatedItemRefs.flatMap((ref) => {
    const item = itemByRef.get(ref);
    return item ? [item] : [];
  });
  const previous = shiftPersonalWorkspacePocResultMonth(calendar.baseDate, -1);
  const next = shiftPersonalWorkspacePocResultMonth(calendar.baseDate, 1);
  return (
    <div
      data-testid="personal-workspace-result-calendar-panel"
      data-calendar-date-policy={calendar.datePolicy ?? 'effective-date-execution-first'}
      data-calendar-week-start={calendar.weekStartsOn ?? 'sunday'}
      data-month-item-refs={JSON.stringify(calendar.monthItemRefs ?? calendar.cells.flatMap((cell) => cell.itemRefs))}
      data-undated-item-refs={JSON.stringify(calendar.undatedItemRefs)}
      className="grid min-w-0 gap-5"
    >
      <section aria-labelledby="personal-workspace-result-calendar-month">
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_3rem] items-center gap-2">
          <button
            type="button"
            aria-label="이전 달"
            disabled={!previous}
            className="min-h-12 rounded-md border border-slate-300 text-lg text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-700 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => { if (previous) props.onCalendarBaseDateChange(previous); }}
          >
            <ChevronIcon direction="previous" />
          </button>
          <h3 id="personal-workspace-result-calendar-month" className="min-w-0 text-center text-base font-semibold text-slate-950">
            {formatMonth(calendar.month)}
          </h3>
          <button
            type="button"
            aria-label="다음 달"
            disabled={!next}
            className="min-h-12 rounded-md border border-slate-300 text-lg text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-teal-700 active:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => { if (next) props.onCalendarBaseDateChange(next); }}
          >
            <ChevronIcon direction="next" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-7 text-center text-xs font-semibold text-slate-600" aria-hidden="true">
          {WEEKDAYS.map((weekday) => <span key={weekday} className="py-1">{weekday}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1" aria-label={`${formatMonth(calendar.month)} 날짜 선택`}>
          {calendar.cells.map((cell) => cell.date ? (
            <button
              key={cell.key}
              type="button"
              data-calendar-date={cell.date}
              data-item-refs={JSON.stringify(cell.itemRefs)}
              data-completed-count={String(cell.completedCount)}
              aria-pressed={cell.selected}
              aria-label={`${formatPlainDate(cell.date)}, 항목 ${cell.itemRefs.length}개, 완료 ${cell.completedCount}개`}
              className={`relative min-h-11 min-w-0 rounded-md border px-0.5 py-1 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${cell.selected ? 'border-teal-700 bg-teal-50 text-teal-950' : 'border-transparent text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100'}`}
              onClick={() => {
                if (cell.date !== calendar.selectedDate) {
                  props.onCalendarSelectedDateChange(cell.date as string);
                }
              }}
            >
              <span>{cell.day}</span>
              {cell.itemRefs.length > 0 ? (
                <span aria-hidden="true" className={`mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full ${cell.completedCount === cell.itemRefs.length ? 'bg-teal-700' : 'bg-slate-500'}`} />
              ) : null}
            </button>
          ) : <span key={cell.key} aria-hidden="true" className="min-h-11" />)}
        </div>
      </section>

      <section aria-labelledby="personal-workspace-result-selected-day">
        <div className="flex items-center justify-between gap-3 border-b border-slate-300 pb-2">
          <h3 id="personal-workspace-result-selected-day" className="text-base font-semibold text-slate-950">
            {formatPlainDate(calendar.selectedDate)}
          </h3>
          <span className="shrink-0 text-xs font-semibold text-teal-800">{calendar.selectedItems.length}개</span>
        </div>
        {renderCalendarItems(props, calendar.selectedItems, '이 날짜에 실행할 항목이 없습니다.')}
      </section>

      {undated.length > 0 ? (
        <details className="rounded-lg border border-slate-200 px-3 py-2">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-teal-700">
            날짜 미정 {undated.length}개
          </summary>
          {renderCalendarItems(props, undated, '날짜 미정 항목이 없습니다.')}
        </details>
      ) : null}
    </div>
  );
}

function normalizedTxtLines(text: string): Readonly<{
  lines: readonly string[];
  hasFinalNewline: boolean;
}> {
  const hasFinalNewline = text.endsWith('\n');
  const body = hasFinalNewline ? text.slice(0, -1) : text;
  return {
    lines: body.length > 0 ? body.split('\n') : [],
    hasFinalNewline,
  };
}

function renderTxtResult(props: PersonalWorkspacePocResultPresenterProps) {
  const itemByRef = new Map(props.projection.items.map((item) => [item.ref, item]));
  const text = normalizedTxtLines(props.projection.txt.normalizedText);
  return (
    <div data-testid="personal-workspace-result-txt-panel" className="min-w-0">
      <p className="mb-2 text-sm leading-6 text-slate-600">
        저장된 내용을 글로 확인합니다.
      </p>
      <pre
        data-testid="personal-workspace-result-txt-preview"
        data-media-type={props.projection.txt.mediaType}
        data-item-refs={JSON.stringify(props.projection.txt.itemRefs)}
        className="m-0 max-w-full whitespace-pre-wrap break-words rounded-lg border border-slate-300 bg-slate-950 p-3 font-mono text-sm leading-6 text-slate-50 [overflow-wrap:anywhere] sm:p-4"
      >
        {text.lines.map((content, index) => {
          const sourceLine = props.projection.text.lines[index];
          const item = sourceLine?.kind === 'item' && sourceLine.itemRef
            ? itemByRef.get(sourceLine.itemRef)
            : undefined;
          const newline = index < text.lines.length - 1 || text.hasFinalNewline ? '\n' : '';
          return (
            <span
              key={`${index}:${item?.ref ?? 'line'}`}
              {...(item ? itemRowData(item) : {})}
              className="min-w-0 [overflow-wrap:anywhere]"
            >
              {item ? (
                <button
                  id={itemButtonId('txt', item)}
                  type="button"
                  data-result-open-item={item.ref}
                  className="whitespace-pre-wrap rounded text-left font-mono text-inherit outline-none hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-teal-300 active:bg-slate-700"
                  aria-label={`${item.title} 열기, ${itemDateLabel(item)}, ${item.completed ? '완료' : '진행 중'}`}
                  onClick={() => openItem(props, item, 'txt')}
                >
                  {content}
                </button>
              ) : content}
              {newline}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

function handleTabKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  currentView: PersonalWorkspacePocResultView,
  onResultViewChange: (view: PersonalWorkspacePocResultView) => void,
): void {
  const currentIndex = RESULT_VIEWS.findIndex((entry) => entry.view === currentView);
  let nextIndex: number | undefined;
  if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % RESULT_VIEWS.length;
  if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + RESULT_VIEWS.length) % RESULT_VIEWS.length;
  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = RESULT_VIEWS.length - 1;
  if (nextIndex === undefined) return;
  event.preventDefault();
  const next = RESULT_VIEWS[nextIndex];
  onResultViewChange(next.view);
  const tabs = event.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
  tabs?.[nextIndex]?.focus();
}

export function PersonalWorkspacePocResultPresenter(
  props: PersonalWorkspacePocResultPresenterProps,
) {
  const activeView = props.navigation.resultView;
  const headingId = props.headingId ?? 'personal-workspace-result-heading';
  return (
    <section
      data-testid="personal-workspace-result-surface"
      data-flow-ref={props.projection.flowRef}
      data-result-view={activeView}
      data-result-item-refs={JSON.stringify(props.projection.itemRefs)}
      data-result-storage="none"
      data-result-calendar-scope="poc-local"
      aria-labelledby={headingId}
      className="min-w-0 max-w-full overflow-x-clip text-slate-950"
    >
      <h2 id={headingId} tabIndex={-1} className="sr-only">다른 방식으로 보기</h2>

      <div
        role="tablist"
        aria-label="결과 보기"
        className="grid min-w-0 grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 sm:grid-cols-4"
      >
        {RESULT_VIEWS.map(({ view, label }) => (
          <button
            key={view}
            id={`personal-workspace-result-tab-${view}`}
            type="button"
            role="tab"
            data-testid={`personal-workspace-result-view-${view}`}
            aria-selected={activeView === view}
            aria-controls={RESULT_PANEL_ID}
            tabIndex={activeView === view ? 0 : -1}
            className={`min-h-12 rounded-md px-2 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-teal-700 motion-reduce:transition-none ${activeView === view ? 'bg-white text-teal-900 shadow-sm' : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 active:bg-slate-200'}`}
            onClick={() => {
              if (activeView !== view) props.onResultViewChange(view);
            }}
            onKeyDown={(event) => handleTabKeyDown(event, view, props.onResultViewChange)}
          >
            {label}
          </button>
        ))}
      </div>

      <p data-testid="personal-workspace-result-boundary" className="sr-only">
        다른 보기에서는 내용을 확인할 수 있습니다.
      </p>

      <div
        id={RESULT_PANEL_ID}
        role="tabpanel"
        aria-labelledby={`personal-workspace-result-tab-${activeView}`}
        tabIndex={0}
        data-testid={`personal-workspace-result-panel-${activeView}`}
        data-item-refs={JSON.stringify(props.projection.itemRefs)}
        className="mt-4 min-w-0 max-w-full outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
      >
        {activeView === 'text'
          ? renderTextResult(props)
          : activeView === 'todo'
            ? renderTodoResult(props)
            : activeView === 'calendar'
              ? renderCalendarResult(props)
              : activeView === 'sheet'
                ? renderSheetResult(props)
                : renderTxtResult(props)}
      </div>
    </section>
  );
}
