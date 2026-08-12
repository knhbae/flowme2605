'use client';

import React, { type ReactNode } from 'react';

import type {
  DateGroupedTodoListViewModel,
  DateGroupedTodoRow,
} from '@/lib/flow/date-grouped-todo-list';
import type { PlanExecutionWorkspaceComposition } from '@/lib/flow/responsive-execution-workspace';

import { DateGroupedTodoList } from '../DateGroupedTodoList';
import { FlowBottomSheet } from '../FlowExecutionPrimitives';

export type MyPlanExecutionSurfaceModel<Data = unknown> = Readonly<{
  flowSlug: string;
  flowTitle: string;
  progressLabel: string;
  composition: PlanExecutionWorkspaceComposition;
  todos: DateGroupedTodoListViewModel<Data>;
  nextItemId?: string;
  transferOpen: boolean;
  transferItemCount: number;
  activeItemOpen: boolean;
  editAvailable?: boolean;
}>;

export type MyPlanExecutionSurfaceActions<Data = unknown> = Readonly<{
  getItemHref: (todo: DateGroupedTodoRow<Data>) => string;
  onOpenItem: (todo: DateGroupedTodoRow<Data>) => void;
  onToggleItem: (todo: DateGroupedTodoRow<Data>) => void;
  onBackToLibrary?: () => void;
  onEditPlan: () => void;
  onToggleTransfer: () => void;
  onCloseTransfer: () => void;
}>;

export type MyPlanExecutionSurfaceRenderers = Readonly<{
  renderManagementMenu?: () => ReactNode;
  renderTransferPanel: (options: Readonly<{ showClose: boolean }>) => ReactNode;
  renderItemDetail: () => ReactNode;
}>;

export type MyPlanExecutionSurfaceProps<Data = unknown> = Readonly<{
  model: MyPlanExecutionSurfaceModel<Data>;
  actions: MyPlanExecutionSurfaceActions<Data>;
  renderers: MyPlanExecutionSurfaceRenderers;
}>;

export function MyPlanExecutionSurface<Data = unknown>({
  model,
  actions,
  renderers,
}: MyPlanExecutionSurfaceProps<Data>) {
  const {
    flowSlug,
    flowTitle,
    progressLabel,
    composition,
    todos,
    nextItemId,
    transferOpen,
    transferItemCount,
    activeItemOpen,
    editAvailable = true,
  } = model;

  return (
    <section
      data-testid="my-flow-overview-card"
      data-flow-slug={flowSlug}
      data-saved-identity={flowSlug}
      data-workspace-composition="shared-model-separate-surfaces"
      className="min-w-0"
    >
      <div
        data-testid="approved-my-plan-workspace"
        data-workspace-layout="library-execution-inspector"
        className={`grid min-w-0 gap-5 ${
          composition === 'desktop_full'
            ? 'min-[1280px]:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]'
            : ''
        }`}
      >
      <div className="min-w-0">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--flowme-border)] pb-4">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {actions.onBackToLibrary ? (
              <button
                type="button"
                data-testid="my-plan-library-back"
                aria-label="저장한 계획 목록으로 돌아가기"
                className="inline-flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-md text-xl font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                onClick={actions.onBackToLibrary}
              >
                <span aria-hidden="true">‹</span>
              </button>
            ) : null}
            <div className="min-w-0">
              <h3 className="break-words text-xl font-semibold text-[var(--flowme-text)]">
                {flowTitle}
              </h3>
              <p className="mt-1 text-sm font-semibold text-[var(--flowme-text-secondary)]">
                {progressLabel}
              </p>
            </div>
          </div>
          {renderers.renderManagementMenu?.()}
        </header>

        <DateGroupedTodoList
          mode="saved"
          viewModel={todos}
          nextItemId={nextItemId}
          ariaLabel={`${flowTitle} 날짜별 Todo`}
          testId="my-plan-date-grouped-todos"
          rowTestId="my-plan-todo-row"
          checkboxTestId="my-plan-todo-checkbox"
          detailLinkTestId="my-plan-todo-detail-link"
          className="py-3"
          getItemHref={actions.getItemHref}
          onOpenItem={actions.onOpenItem}
          onToggleItem={(todo) => actions.onToggleItem(todo)}
        />

        <div
          data-testid="my-plan-actions"
          className={`grid gap-2 border-t border-[var(--flowme-border)] pt-4 ${editAvailable
            ? 'sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'
            : 'grid-cols-1'}`}
        >
          {editAvailable ? (
            <button
              type="button"
              data-testid="my-plan-edit"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-[var(--flowme-border-strong)] bg-white px-4 text-sm font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
              onClick={actions.onEditPlan}
            >
              수정
            </button>
          ) : null}
          <button
            type="button"
            data-testid="my-flow-export-entry"
            data-action-role="transfer-to-own-tool"
            aria-expanded={transferOpen}
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--flowme-action)] px-4 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
            onClick={actions.onToggleTransfer}
          >
            내 도구로 옮기기 · {transferItemCount}개
          </button>
        </div>

        {composition !== 'mobile'
        && composition !== 'desktop_full'
        && (transferOpen || activeItemOpen) ? (
          <div
            data-testid={transferOpen
              ? 'my-plan-stacked-transfer'
              : 'my-plan-stacked-item-detail'}
            className="mt-4 border-t border-[var(--flowme-border)] pt-4"
          >
            {transferOpen
              ? renderers.renderTransferPanel({ showClose: true })
              : activeItemOpen
                ? renderers.renderItemDetail()
                : null}
          </div>
        ) : null}
      </div>

      {composition === 'desktop_full' ? (
        <aside
          data-testid="my-plan-item-inspector"
          className="min-w-0 border-l border-[var(--flowme-border)] pl-5"
        >
          {transferOpen ? (
            renderers.renderTransferPanel({ showClose: true })
          ) : activeItemOpen ? (
            renderers.renderItemDetail()
          ) : (
            <div className="sticky top-4 rounded-md bg-[var(--flowme-surface-subtle)] p-4">
              <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">Item 상세</p>
              <p className="mt-2 text-sm leading-6 text-[var(--flowme-text-secondary)]">
                Todo 본문을 열면 메모를 여기에서 확인할 수 있습니다.
              </p>
            </div>
          )}
        </aside>
      ) : null}
      </div>
      {composition === 'mobile' && transferOpen ? (
        <FlowBottomSheet
          testId="my-plan-transfer-sheet"
          headingId="my-plan-transfer-sheet-title"
          eyebrow={flowTitle}
          title="내 도구로 옮기기"
          closeLabel="이전"
          closeTestId="my-plan-transfer-back"
          closeButtonClassName="!min-h-12"
          returnFocusSelector="[data-testid='my-flow-export-entry']"
          onClose={actions.onCloseTransfer}
        >
          <div className="mt-4">
            {renderers.renderTransferPanel({ showClose: false })}
          </div>
        </FlowBottomSheet>
      ) : null}
    </section>
  );
}
