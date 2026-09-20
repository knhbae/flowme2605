'use client';

import React, {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

import {
  PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS,
  filterPersonalWorkspacePocValidationExamples,
  type PersonalWorkspacePocValidationExample,
  type PersonalWorkspacePocValidationExampleGroupId,
} from '@/lib/flow/personal-workspace-poc-validation-examples';

export type PersonalWorkspacePocValidationExampleExplorerCloseReason =
  | 'backdrop'
  | 'button'
  | 'escape';

export type PersonalWorkspacePocValidationExampleExplorerProps = Readonly<{
  open: boolean;
  sourceEmpty: boolean;
  entries: readonly PersonalWorkspacePocValidationExample[];
  onApply: (entry: PersonalWorkspacePocValidationExample) => void;
  onClose: (reason: PersonalWorkspacePocValidationExampleExplorerCloseReason) => void;
}>;

type ExplorerGroupFilter = PersonalWorkspacePocValidationExampleGroupId | 'all';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const CONTROL_CLASS = 'min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-teal-700 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
const SECONDARY_ACTION_CLASS = 'min-h-12 cursor-pointer rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 outline-none hover:border-teal-700 active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';

export function buildPersonalWorkspacePocValidationExampleExplorerView(
  entries: readonly PersonalWorkspacePocValidationExample[],
  query: string,
  groupId: ExplorerGroupFilter,
  selectedExampleId?: string,
): Readonly<{
  visibleEntries: readonly PersonalWorkspacePocValidationExample[];
  selectedEntry?: PersonalWorkspacePocValidationExample;
}> {
  const visibleEntries = filterPersonalWorkspacePocValidationExamples(entries, {
    query,
    groupId,
  });
  return {
    visibleEntries,
    selectedEntry: selectedExampleId
      ? visibleEntries.find((entry) => entry.exampleId === selectedExampleId)
      : undefined,
  };
}

function groupLabel(groupId: PersonalWorkspacePocValidationExampleGroupId): string {
  return PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS.find(
    (group) => group.groupId === groupId,
  )?.label ?? groupId;
}

function focusAfterPaint(target: HTMLElement | null | undefined): void {
  if (!target || typeof window === 'undefined') return;
  window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
}

export function PersonalWorkspacePocValidationExampleExplorer({
  open,
  sourceEmpty,
  entries,
  onApply,
  onClose,
}: PersonalWorkspacePocValidationExampleExplorerProps) {
  const headingId = useId();
  const descriptionId = useId();
  const listHeadingId = useId();
  const previewHeadingId = useId();
  const sourcePreservationReasonId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const [query, setQuery] = useState('');
  const [groupId, setGroupId] = useState<ExplorerGroupFilter>('all');
  const [selectedExampleId, setSelectedExampleId] = useState<string>();

  const { visibleEntries, selectedEntry } = useMemo(
    () => buildPersonalWorkspacePocValidationExampleExplorerView(
      entries,
      query,
      groupId,
      selectedExampleId,
    ),
    [entries, groupId, query, selectedExampleId],
  );

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setQuery('');
    setGroupId('all');
    setSelectedExampleId(undefined);
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!selectedExampleId || selectedEntry) return;
    setSelectedExampleId(undefined);
  }, [selectedEntry, selectedExampleId]);

  useEffect(() => {
    if (
      !open
      || !selectedEntry
      || !window.matchMedia('(max-width: 767px)').matches
    ) return;
    const frame = window.requestAnimationFrame(() => {
      detailHeadingRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, selectedEntry]);

  if (!open) return null;

  const returnToRow = (exampleId: string) => {
    setSelectedExampleId(undefined);
    focusAfterPaint(rowRefs.current.get(exampleId) ?? searchInputRef.current);
  };

  const requestClose = (reason: PersonalWorkspacePocValidationExampleExplorerCloseReason) => {
    const opener = openerRef.current;
    onClose(reason);
    focusAfterPaint(opener);
  };

  const selectEntry = (entry: PersonalWorkspacePocValidationExample) => {
    setSelectedExampleId(entry.exampleId);
  };

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (selectedEntry) {
        returnToRow(selectedEntry.exampleId);
      } else {
        requestClose('escape');
      }
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((element) => (
      element.getAttribute('aria-hidden') !== 'true'
      && element.getClientRects().length > 0
    ));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    requestClose('backdrop');
  };

  return (
    <div
      data-testid="validation-example-backdrop"
      className="fixed inset-0 z-[100] flex min-w-0 items-stretch justify-center overflow-x-hidden bg-slate-950/45 p-0 md:items-center md:p-4"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        data-testid="validation-example-dialog"
        className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden bg-white text-slate-950 shadow-2xl md:h-[min(720px,calc(100dvh-32px))] md:max-h-[calc(100dvh-32px)] md:max-w-[1120px] md:rounded-xl md:border md:border-slate-200"
        onKeyDown={handleDialogKeyDown}
      >
        <header className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 md:pt-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.12em] text-teal-800">원문은 아직 바뀌지 않음</p>
            <h2 id={headingId} className="mt-1 text-xl font-semibold tracking-[-0.02em] text-slate-950">
              검증 예시 찾아보기
            </h2>
            <p id={descriptionId} className="mt-1 break-keep text-sm leading-5 text-slate-600">
              실제 콘텐츠와 검증된 입력 사례 {entries.length}개입니다. 고르기만 해서는 원문이 바뀌지 않습니다.
            </p>
          </div>
          <button
            type="button"
            data-testid="validation-example-close"
            className={`${SECONDARY_ACTION_CLASS} min-w-12 shrink-0 px-3`}
            onClick={() => requestClose('button')}
          >
            닫기
          </button>
        </header>

        <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[minmax(18rem,38fr)_minmax(0,62fr)]">
          <section
            aria-labelledby={listHeadingId}
            className={`${selectedEntry ? 'hidden md:flex' : 'flex'} min-h-0 min-w-0 flex-col border-slate-200 md:border-r`}
          >
            <div className="shrink-0 space-y-3 border-b border-slate-200 p-4 sm:p-5">
              <h3 id={listHeadingId} className="text-base font-semibold text-slate-950">예시 목록</h3>
              <div>
                <label htmlFor={`${headingId}-search`} className="block text-sm font-semibold text-slate-800">
                  예시 검색
                </label>
                <input
                  ref={searchInputRef}
                  id={`${headingId}-search`}
                  data-testid="validation-example-search"
                  type="search"
                  value={query}
                  className={`${CONTROL_CLASS} mt-2 w-full`}
                  placeholder="이름, 입력 형태, 출처, 경계로 찾기"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`${headingId}-group`} className="block text-sm font-semibold text-slate-800">
                  분류
                </label>
                <select
                  id={`${headingId}-group`}
                  data-testid="validation-example-group"
                  value={groupId}
                  className={`${CONTROL_CLASS} mt-2 w-full`}
                  onChange={(event) => setGroupId(event.target.value as ExplorerGroupFilter)}
                >
                  <option value="all">전체 {entries.length}개</option>
                  {PERSONAL_WORKSPACE_POC_VALIDATION_EXAMPLE_GROUPS.map((group) => (
                    <option key={group.groupId} value={group.groupId}>
                      {group.label} {group.expectedCount}개
                    </option>
                  ))}
                </select>
              </div>
              <p data-testid="validation-example-count" className="text-sm font-semibold text-slate-700" role="status">
                {entries.length}개 중 {visibleEntries.length}개
              </p>
            </div>

            {visibleEntries.length === 0 ? (
              <div data-testid="validation-example-empty" className="grid min-h-0 flex-1 place-content-center px-5 py-10 text-center">
                <p className="text-sm font-semibold text-slate-700">조건에 맞는 예시가 없습니다.</p>
                <button
                  type="button"
                  className={`${SECONDARY_ACTION_CLASS} mt-4`}
                  onClick={() => {
                    setQuery('');
                    setGroupId('all');
                    focusAfterPaint(searchInputRef.current);
                  }}
                >
                  검색 지우기
                </button>
              </div>
            ) : (
              <ul
                data-testid="validation-example-list"
                className="min-h-0 min-w-0 flex-1 divide-y divide-slate-200 overflow-y-auto overscroll-contain"
              >
                {visibleEntries.map((entry) => {
                  const selected = selectedEntry?.exampleId === entry.exampleId;
                  return (
                    <li key={entry.exampleId} className="min-w-0">
                      <button
                        ref={(node) => {
                          if (node) rowRefs.current.set(entry.exampleId, node);
                          else rowRefs.current.delete(entry.exampleId);
                        }}
                        type="button"
                        data-testid="validation-example-row"
                        data-example-id={entry.exampleId}
                        aria-pressed={selected}
                        aria-controls={previewHeadingId}
                        className={`min-h-12 w-full min-w-0 cursor-pointer px-4 py-3 text-left outline-none active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-700 sm:px-5 ${selected ? 'bg-teal-50' : 'bg-white hover:bg-slate-50'}`}
                        onClick={() => selectEntry(entry)}
                      >
                        <span className="block break-words text-sm font-semibold text-slate-950 [overflow-wrap:anywhere]">
                          {entry.label}
                        </span>
                        <span className="mt-1 block break-words text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
                          {groupLabel(entry.groupId)} · {entry.sourceShape}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            aria-labelledby={previewHeadingId}
            className={`${selectedEntry ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col bg-slate-50/60`}
            data-testid="validation-example-preview"
          >
            {selectedEntry ? (
              <>
                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4 [scroll-padding-bottom:6rem] sm:p-5">
                  <button
                    type="button"
                    data-testid="validation-example-back-to-list"
                    className={`${SECONDARY_ACTION_CLASS} mb-4 md:hidden`}
                    onClick={() => returnToRow(selectedEntry.exampleId)}
                  >
                    목록으로
                  </button>
                  <p className="text-xs font-bold tracking-[0.1em] text-teal-800">
                    {groupLabel(selectedEntry.groupId)}
                  </p>
                  <h3
                    ref={detailHeadingRef}
                    id={previewHeadingId}
                    tabIndex={-1}
                    className="mt-1 break-words text-xl font-semibold tracking-[-0.02em] outline-none focus-visible:ring-2 focus-visible:ring-teal-700 [overflow-wrap:anywhere]"
                  >
                    {selectedEntry.label}
                  </h3>

                  <dl className="mt-4 grid min-w-0 gap-x-4 gap-y-3 border-y border-slate-200 bg-white px-4 py-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
                    <dt className="font-semibold text-slate-700">입력 형태</dt>
                    <dd className="min-w-0 break-words text-slate-950 [overflow-wrap:anywhere]">{selectedEntry.sourceShape}</dd>
                    <dt className="font-semibold text-slate-700">출처</dt>
                    <dd className="min-w-0 break-words text-slate-950 [overflow-wrap:anywhere]">{selectedEntry.provenance}</dd>
                    <dt className="font-semibold text-slate-700">상위 경계</dt>
                    <dd className="min-w-0 break-words text-slate-950 [overflow-wrap:anywhere]">{selectedEntry.upstreamBoundary}</dd>
                    <dt className="font-semibold text-slate-700">예상 결과</dt>
                    <dd className="min-w-0 break-words text-slate-950 [overflow-wrap:anywhere]">
                      Item {selectedEntry.expectedOriginalItemCount}개 · {selectedEntry.expectedMode}
                    </dd>
                    <dt className="font-semibold text-slate-700">보존할 내용</dt>
                    <dd className="min-w-0 break-words text-slate-950 [overflow-wrap:anywhere]">{selectedEntry.expectedPreservation}</dd>
                  </dl>

                  <div className="mt-5 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-950">예시 원문 전체</h4>
                    <pre
                      data-testid="validation-example-raw-text"
                      className="mt-2 max-h-[min(42dvh,28rem)] min-w-0 overflow-y-auto whitespace-pre-wrap border border-slate-300 bg-white p-4 font-mono text-sm leading-6 text-slate-900 [overflow-wrap:anywhere]"
                    >
                      {selectedEntry.rawText}
                    </pre>
                  </div>
                </div>

                <footer className="sticky bottom-0 shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
                  {!sourceEmpty ? (
                    <p id={sourcePreservationReasonId} className="mb-3 break-keep text-sm leading-5 text-amber-900" role="status">
                      현재 원문을 덮어쓰지 않도록 적용을 막았습니다. 빈 원문에서만 시작할 수 있습니다.
                    </p>
                  ) : (
                    <p className="mb-3 break-keep text-sm leading-5 text-slate-600">
                      누르면 이 원문의 정확한 사본이 현재 입력에 한 번 들어갑니다.
                    </p>
                  )}
                  <button
                    type="button"
                    data-testid="validation-example-apply"
                    className="min-h-12 w-full cursor-pointer rounded-md bg-teal-700 px-4 py-3 text-base font-semibold text-white outline-none hover:bg-teal-800 active:bg-teal-900 focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                    disabled={!sourceEmpty}
                    aria-describedby={!sourceEmpty ? sourcePreservationReasonId : undefined}
                    onClick={() => {
                      if (!sourceEmpty) return;
                      onApply(selectedEntry);
                    }}
                  >
                    이 예시로 시작
                  </button>
                </footer>
              </>
            ) : (
              <div className="grid min-h-0 flex-1 place-content-center px-6 py-10 text-center">
                <h3 id={previewHeadingId} className="text-base font-semibold text-slate-800">미리볼 예시를 고르세요.</h3>
                <p className="mt-2 break-keep text-sm leading-6 text-slate-600">
                  목록을 고르면 원문 전체와 예상 결과를 여기에서 확인할 수 있습니다.
                </p>
              </div>
            )}
          </section>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {selectedEntry
            ? `${selectedEntry.label} 예시를 선택했습니다. 예상 Item ${selectedEntry.expectedOriginalItemCount}개입니다.`
            : ''}
        </p>
      </div>
    </div>
  );
}
