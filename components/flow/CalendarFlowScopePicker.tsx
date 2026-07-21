'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_TERTIARY_ACTION_CLASS,
} from './flow-ui';

export type CalendarFlowScopePickerOption = {
  slug: string;
  title: string;
  monthCount: number;
  totalCount: number;
  color: string;
  initial: string;
};

type CalendarFlowScopePickerProps = {
  options: CalendarFlowScopePickerOption[];
  selectedSlugs: string[];
  onApply: (selectedSlugs: string[]) => void;
};

export function CalendarFlowScopePicker({
  options,
  selectedSlugs,
  onApply,
}: CalendarFlowScopePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draftSelection, setDraftSelection] = useState<string[]>(selectedSlugs);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const visibleOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.title.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  const close = () => {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus({ preventScroll: true }), 0);
  };

  const apply = () => {
    onApply(draftSelection);
    close();
  };

  useEffect(() => {
    if (!open) return;
    setDraftSelection(selectedSlugs);
    setQuery('');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, selectedSlugs]);

  const selectionLabel = selectedSlugs.length === 0
    ? '전체 Flow'
    : selectedSlugs.length === 1
      ? options.find((option) => option.slug === selectedSlugs[0])?.title ?? '1개 Flow'
      : `${selectedSlugs.length}개 Flow`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-testid="calendar-flow-scope-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${FLOW_UI_SECONDARY_ACTION_CLASS} max-w-full justify-between gap-3`}
        onClick={() => setOpen(true)}
      >
        <span className="truncate">{selectionLabel}</span>
        <span className="shrink-0 text-xs text-[var(--flowme-text-secondary)]">선택</span>
      </button>

      {open ? (
        <div
          data-testid="calendar-flow-scope-picker-layer"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) close();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="calendar-flow-scope-picker-title"
            data-testid="calendar-flow-scope-picker"
            className="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-lg bg-[var(--flowme-surface)] shadow-[0_-12px_36px_rgba(27,26,23,0.18)] sm:rounded-lg"
          >
            <header className="flex items-start justify-between gap-3 border-b border-[var(--flowme-border)] px-4 py-4">
              <div>
                <h2 id="calendar-flow-scope-picker-title" className="text-lg font-semibold text-[var(--flowme-text)]">볼 Flow 선택</h2>
                <p className="mt-1 text-sm text-[var(--flowme-text-secondary)]">선택하지 않으면 전체 일정을 봅니다.</p>
              </div>
              <button type="button" className={FLOW_UI_TERTIARY_ACTION_CLASS} aria-label="Flow 선택 닫기" onClick={close}>
                닫기
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              <label className="block text-xs font-semibold text-[var(--flowme-text-secondary)]">
                Flow 검색
                <input
                  ref={searchRef}
                  type="search"
                  data-testid="calendar-flow-scope-picker-search"
                  className="mt-1 min-h-11 w-full rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 text-base text-[var(--flowme-text)] outline-none focus:border-[var(--flowme-action)] focus:ring-2 focus:ring-[var(--flowme-focus)] sm:text-sm"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              <div className="mt-3 border-y border-[var(--flowme-border)]">
                {visibleOptions.map((option) => {
                  const selected = draftSelection.includes(option.slug);
                  return (
                    <label
                      key={option.slug}
                      data-testid="calendar-flow-scope-picker-option"
                      data-flow-slug={option.slug}
                      className="relative flex min-h-14 cursor-pointer items-center gap-3 border-b border-[var(--flowme-border)] px-1 py-2.5 last:border-b-0 hover:bg-[var(--flowme-surface-subtle)]"
                    >
                      <input
                        type="checkbox"
                        className="h-5 w-5 shrink-0 accent-[var(--flowme-action)]"
                        checked={selected}
                        aria-label={`${option.title} 일정 ${selected ? '선택 해제' : '선택'}`}
                        onChange={() => setDraftSelection((current) => (
                          current.includes(option.slug)
                            ? current.filter((slug) => slug !== option.slug)
                            : [...current, option.slug]
                        ))}
                      />
                      <span
                        aria-hidden="true"
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-black text-white"
                        style={{ backgroundColor: option.color }}
                      >
                        {option.initial}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-[var(--flowme-text)]">{option.title}</span>
                        <span className="mt-0.5 block text-xs text-[var(--flowme-text-secondary)]">이번 달 {option.monthCount}개</span>
                      </span>
                    </label>
                  );
                })}
                {visibleOptions.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-[var(--flowme-text-secondary)]">검색 결과가 없습니다.</p>
                ) : null}
              </div>
            </div>

            <footer className="flex items-center justify-between gap-2 border-t border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
              <button
                type="button"
                data-testid="calendar-flow-scope-picker-all"
                className={FLOW_UI_TERTIARY_ACTION_CLASS}
                onClick={() => setDraftSelection([])}
              >
                전체 보기
              </button>
              <button
                type="button"
                data-testid="calendar-flow-scope-picker-apply"
                className={FLOW_UI_PRIMARY_ACTION_CLASS}
                onClick={apply}
              >
                {draftSelection.length > 0 ? `${draftSelection.length}개 Flow 보기` : '전체 Flow 보기'}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
