'use client';

import React, { type MouseEvent } from 'react';

import type {
  DateGroupedTodoListViewModel,
  DateGroupedTodoRow,
} from '@/lib/flow/date-grouped-todo-list';

type DateGroupedTodoListBaseProps<Data> = {
  viewModel: DateGroupedTodoListViewModel<Data>;
  getItemHref: (row: DateGroupedTodoRow<Data>) => string;
  onOpenItem?: (row: DateGroupedTodoRow<Data>) => void;
  nextItemId?: string;
  ariaLabel?: string;
  testId?: string;
  rowTestId?: string;
  checkboxTestId?: string;
  detailLinkTestId?: string;
  className?: string;
};

type PublicDateGroupedTodoListProps<Data> = DateGroupedTodoListBaseProps<Data> & {
  mode: 'public';
  onToggleItem?: never;
};

type SavedDateGroupedTodoListProps<Data> = DateGroupedTodoListBaseProps<Data> & {
  mode: 'saved';
  onToggleItem: (row: DateGroupedTodoRow<Data>, completed: boolean) => void;
};

export type DateGroupedTodoListProps<Data = unknown> =
  | PublicDateGroupedTodoListProps<Data>
  | SavedDateGroupedTodoListProps<Data>;

export function DateGroupedTodoList<Data = unknown>(
  props: DateGroupedTodoListProps<Data>,
) {
  const {
    viewModel,
    getItemHref,
    onOpenItem,
    nextItemId,
    ariaLabel = '날짜별 할 일',
    testId = 'date-grouped-todo-list',
    rowTestId,
    checkboxTestId,
    detailLinkTestId,
    className = '',
  } = props;

  const openItem = (
    event: MouseEvent<HTMLAnchorElement>,
    row: DateGroupedTodoRow<Data>,
  ) => {
    if (!onOpenItem) return;
    event.preventDefault();
    onOpenItem(row);
  };

  return (
    <div
      role="list"
      aria-label={ariaLabel}
      data-testid={testId}
      data-todo-mode={props.mode}
      data-todo-row-count={viewModel.rowCount}
      className={`space-y-3 ${className}`}
    >
      {viewModel.groups.map((group) => (
        <section
          key={group.id}
          role="listitem"
          aria-label={group.accessibleLabel}
          data-testid={`${testId}-group`}
          data-date-group={group.id}
          className="grid grid-cols-[72px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
        >
          <div
            data-testid={`${testId}-date-rail`}
            data-date-rail={group.id}
            aria-hidden="true"
            className="flex min-h-full flex-col items-center bg-[var(--flowme-action-soft)] px-2 py-3 text-center text-[var(--flowme-action)]"
          >
            <span className="text-xs font-semibold leading-4">{group.monthLabel}</span>
            <span className="text-2xl font-bold leading-8">{group.dayLabel}</span>
            {group.weekdayLabel ? (
              <span className="text-xs font-semibold leading-4">{group.weekdayLabel}</span>
            ) : null}
            {group.relativeDateLabel ? (
              <span className="mt-2 text-xs font-bold leading-4">{group.relativeDateLabel}</span>
            ) : null}
            <span className="mt-auto pt-2 text-xs font-semibold leading-4">
              {group.countLabel}
            </span>
          </div>

          <div role="list" aria-label="할 일">
            {group.rows.map((row) => {
              const isNext = row.id === nextItemId;
              return (
                <div
                  key={row.id}
                  role="listitem"
                  data-testid={rowTestId ?? `${testId}-row`}
                  data-todo-item-id={row.id}
                  data-next-item={isNext || undefined}
                  className={`grid min-h-16 grid-cols-[48px_minmax(0,1fr)] border-b border-[var(--flowme-border)] last:border-b-0 ${
                    isNext ? 'bg-[var(--flowme-action-soft)]' : ''
                  }`}
                >
                  {props.mode === 'saved' ? (
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={row.completed}
                      aria-label={
                        row.completed
                          ? `${row.title} 완료 취소`
                          : `${row.title} 완료`
                      }
                      data-testid={checkboxTestId ?? `${testId}-checkbox`}
                      data-todo-checkbox="mutable"
                      className="inline-flex h-12 w-12 min-h-12 min-w-12 items-center justify-center self-center rounded-xl text-xl font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] focus-visible:ring-inset"
                      onClick={() => props.onToggleItem(row, !row.completed)}
                    >
                      <span aria-hidden="true">{row.completed ? '☑' : '□'}</span>
                    </button>
                  ) : (
                    <span
                      role="checkbox"
                      aria-checked={row.completed}
                      aria-readonly="true"
                      aria-label={`${row.title} 완료 상태, 미리보기에서는 변경할 수 없음`}
                      data-testid={checkboxTestId ?? `${testId}-checkbox`}
                      data-todo-checkbox="readonly"
                      className="inline-flex h-12 w-12 min-h-12 min-w-12 items-center justify-center self-center text-xl font-semibold text-[var(--flowme-text-tertiary)]"
                    >
                      <span aria-hidden="true">{row.completed ? '☑' : '□'}</span>
                    </span>
                  )}

                  <a
                    href={getItemHref(row)}
                    aria-label={`${row.title} 상세 보기`}
                    data-testid={detailLinkTestId ?? `${testId}-detail-link`}
                    data-todo-detail-link={row.id}
                    className="flex min-h-16 min-w-0 items-center gap-2 rounded-xl px-2 py-2 text-left text-[var(--flowme-text)] no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] focus-visible:ring-inset"
                    onClick={(event) => openItem(event, row)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-5">
                        {row.title}
                        {isNext ? (
                          <span
                            data-testid={`${testId}-next-badge`}
                            className="ml-2 inline-flex rounded-full bg-[var(--flowme-action)] px-2 py-0.5 align-middle text-[11px] font-bold leading-4 text-white"
                          >
                            다음
                          </span>
                        ) : null}
                      </span>
                      {row.metaLabel ? (
                        <span className="mt-1 block text-xs leading-4 text-[var(--flowme-text-secondary)]">
                          {row.metaLabel}
                        </span>
                      ) : null}
                    </span>
                    <span aria-hidden="true" className="shrink-0 text-lg text-[var(--flowme-text-tertiary)]">
                      ›
                    </span>
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
