'use client';

import React from 'react';

import { FlowEditorSurface } from './FlowEditorSurface';
import { RoutineScheduleEditor } from './RoutineScheduleEditor';
import {
  FLOW_UI_COMPACT_ACTION_CLASS,
  FLOW_UI_INPUT_CLASS,
} from './flow-ui';
import type {
  FlowEditorCloseEvent,
  FlowEditorFailure,
  FlowEditorStatus,
} from '@/lib/flow/flow-editor-transaction';
import type { PublicItemPersonalization } from '@/lib/flow/public-item-personalization';
import type { SavedFlowRoutineDefinition } from '@/lib/flow/storage';
import { getFlowEditorSurfaceContract } from '@/lib/flow/flow-editor-schema';
import { Q3_USER_COPY_PROFILE } from '@/lib/flow/q3-user-copy';

type SavedEditorTransactionView = Readonly<{
  status: FlowEditorStatus;
  failure?: FlowEditorFailure;
  pendingClose: boolean;
}>;

export type SavedFlowPlanEditorViewDraft = Readonly<{
  title: string;
  anchor: string;
  anchorEditable: boolean;
  anchorLockReason?: string;
  weekdays?: readonly string[];
  routine?: SavedFlowRoutineDefinition;
  routineDurationDays?: number;
  order: readonly string[];
  items: Readonly<Record<string, Readonly<{ included: boolean }>>>;
  sources: readonly Readonly<{
    itemId: string;
    title: string;
    detail?: string;
    date?: string;
  }>[];
  itemPersonalizations: Readonly<Record<string, PublicItemPersonalization>>;
  sourceUrl?: string;
  warning?: string;
}>;

export type SavedFlowItemEditorViewDraft = Readonly<{
  itemId: string;
  title: string;
  detail: string;
  date: string;
  completionCriterion?: string;
  sourceUrl?: string;
  warning?: string;
}>;

type SharedActions = Readonly<{
  onRequestClose: (event: FlowEditorCloseEvent) => void;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
  onCommit: () => void;
}>;

function buildErrorSummary(
  transaction: SavedEditorTransactionView,
): Parameters<typeof FlowEditorSurface>[0]['errorSummary'] {
  if (!transaction.failure) return undefined;
  return {
    title: transaction.status === 'recovery-required'
      ? '저장 상태를 확인해 주세요'
      : '변경을 저장하지 못했습니다',
    errors: [{
      id: transaction.failure.code,
      message: transaction.failure.message,
    }],
    testId: 'flow-editor-error',
  };
}

function getDisplayedItem(
  draft: SavedFlowPlanEditorViewDraft,
  itemId: string,
) {
  const source = draft.sources.find((candidate) => candidate.itemId === itemId);
  const personalization = draft.itemPersonalizations[itemId];
  return {
    title: personalization?.title ?? source?.title ?? '할 일',
    date: Object.prototype.hasOwnProperty.call(personalization ?? {}, 'date')
      ? personalization?.date ?? ''
      : source?.date ?? '',
  };
}

export function SavedFlowPlanEditorSurface({
  draft,
  transaction,
  actions,
  onPatch,
  onToggleItem,
  onMoveItem,
  onOpenItem,
  q3CopyEnabled = true,
}: {
  draft: SavedFlowPlanEditorViewDraft;
  transaction: SavedEditorTransactionView;
  actions: SharedActions;
  onPatch: (patch: Readonly<{
    title?: string;
    anchor?: string;
    weekdays?: string[];
    routine?: SavedFlowRoutineDefinition;
  }>) => void;
  onToggleItem: (itemId: string, included: boolean) => void;
  onMoveItem: (itemId: string, direction: 'up' | 'down') => void;
  onOpenItem: (itemId: string, returnFocusSelector: string) => void;
  q3CopyEnabled?: boolean;
}) {
  const includedCount = Object.values(draft.items).filter((item) => item.included).length;
  const contract = getFlowEditorSurfaceContract({
    context: 'saved-overlay',
    level: 'plan',
    capabilities: {
      title: true,
      anchor: true,
      anchorEditable: draft.anchorEditable,
      items: true,
      routine: Boolean(draft.routine),
      sourceOrSafety: Boolean(draft.sourceUrl || draft.warning),
    },
  });
  return (
    <FlowEditorSurface
      testId="saved-flow-editor-plan"
      headingId="saved-flow-editor-plan-title"
      context="saved-overlay"
      level="plan"
      status={transaction.status}
      layout="responsive"
      semanticRole={contract.semanticRole}
      commitRole={contract.commitRole}
      eyebrow={q3CopyEnabled ? Q3_USER_COPY_PROFILE.savedDetail.eyebrow : '저장한 Flow'}
      title={q3CopyEnabled ? Q3_USER_COPY_PROFILE.savedDetail.editPlan : 'Flow 편집'}
      initialFocusSelector='[data-testid="saved-flow-editor-title-input"]'
      dialogProps={{
        'data-editor-schema-fields': contract.fields.map((field) => field.id).join(','),
      }}
      dismissible={transaction.status !== 'submitting' && transaction.status !== 'recovery-required'}
      onRequestClose={(cause) => actions.onRequestClose(cause)}
      errorSummary={buildErrorSummary(transaction)}
      discardConfirmation={{
        open: transaction.pendingClose,
        onContinueEditing: actions.onContinueEditing,
        onDiscardChanges: actions.onDiscardChanges,
        testId: 'flow-editor-discard-prompt',
      }}
      cancelAction={{
        label: '취소',
        testId: 'saved-flow-editor-cancel',
        disabled: transaction.status === 'submitting' || transaction.status === 'recovery-required',
        onAction: () => actions.onRequestClose('cancel'),
      }}
      primaryAction={{
        label: q3CopyEnabled ? Q3_USER_COPY_PROFILE.savedDetail.saveChanges : contract.commitLabel,
        testId: 'saved-flow-editor-save',
        onAction: actions.onCommit,
      }}
      retryAction={transaction.status === 'recoverable-error' ? {
        label: '다시 시도',
        testId: 'flow-editor-retry',
        onAction: actions.onCommit,
      } : undefined}
    >
      <form
        data-testid="my-flow-personal-copy-settings"
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          actions.onCommit();
        }}
      >
        <label className="block text-sm font-semibold text-[var(--flowme-text)]">
          저장 이름
          <input
            data-testid="saved-flow-editor-title-input"
            data-editor-field="plan-title"
            className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
            value={draft.title}
            maxLength={80}
            required
            onChange={(event) => onPatch({ title: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold text-[var(--flowme-text)]">
          기준일
          <input
            data-testid="saved-flow-editor-anchor-input"
            data-editor-field="plan-anchor"
            className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
            type="date"
            value={draft.anchor}
            disabled={!draft.anchorEditable}
            aria-describedby={draft.anchorLockReason ? 'saved-flow-editor-anchor-lock-reason' : undefined}
            onChange={(event) => onPatch({ anchor: event.target.value })}
          />
        </label>
        {draft.anchorLockReason ? (
          <p
            id="saved-flow-editor-anchor-lock-reason"
            data-testid="saved-flow-editor-anchor-lock-reason"
            className="-mt-3 border-l-2 border-[var(--flowme-warning)] px-3 py-2 text-xs font-medium text-[var(--flowme-warning-strong)]"
          >{draft.anchorLockReason}</p>
        ) : null}
        <fieldset data-editor-field="plan-items">
          <legend className="text-sm font-semibold text-[var(--flowme-text)]">
            포함할 할 일 · {includedCount}/{draft.order.length}개
          </legend>
          <div
            data-testid="saved-flow-editor-item-list"
            data-flow-editor-scroll-key="saved-plan-items"
            className="mt-2 max-h-[min(58vh,32rem)] overflow-y-auto border-y border-[var(--flowme-border)] bg-white"
          >
            {draft.order.map((itemId, index) => {
              const item = getDisplayedItem(draft, itemId);
              const included = draft.items[itemId]?.included !== false;
              return (
                <div
                  key={itemId}
                  data-testid="saved-flow-editor-item-row"
                  data-item-id={itemId}
                  className="grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-[var(--flowme-border)] px-2 py-2.5 last:border-b-0"
                >
                  <span className="grid grid-cols-2 gap-0.5" role="group" aria-label={`${item.title} 순서`}>
                    <button
                      type="button"
                      className={FLOW_UI_COMPACT_ACTION_CLASS}
                      aria-label={`${item.title} 위로 이동`}
                      disabled={index === 0}
                      onClick={() => onMoveItem(itemId, 'up')}
                    >↑</button>
                    <button
                      type="button"
                      className={FLOW_UI_COMPACT_ACTION_CLASS}
                      aria-label={`${item.title} 아래로 이동`}
                      disabled={index === draft.order.length - 1}
                      onClick={() => onMoveItem(itemId, 'down')}
                    >↓</button>
                  </span>
                  <button
                    type="button"
                    data-testid="saved-flow-editor-item-open"
                    data-item-id={itemId}
                    className="min-w-0 rounded-md px-1 py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                    onClick={() => onOpenItem(
                      itemId,
                      `[data-testid="saved-flow-editor-item-open"][data-item-id="${CSS.escape(itemId)}"]`,
                    )}
                  >
                    <span className="block break-keep text-sm font-semibold text-[var(--flowme-text)]">{item.title}</span>
                    <span className="mt-0.5 block text-[11px] font-medium text-[var(--flowme-text-secondary)]">
                      {item.date || '날짜 없음'}
                    </span>
                  </button>
                  <label className="flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                    <span>포함</span>
                    <input
                      type="checkbox"
                      checked={included}
                      aria-label={`${item.title} ${q3CopyEnabled ? '계획에 포함' : 'Flow에 포함'}`}
                      onChange={(event) => onToggleItem(itemId, event.target.checked)}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </fieldset>
        {draft.routine ? (
          <section data-editor-field="plan-routine">
            <h3 className="mb-2 text-sm font-semibold text-[var(--flowme-text)]">반복 일정</h3>
            <RoutineScheduleEditor
              testId="saved-flow-editor-routine"
              compact
              value={{
                weekdays: [...(draft.weekdays ?? [])],
                definition: draft.routine,
              }}
              sourceDurationDays={draft.routineDurationDays}
              onChange={(value) => onPatch({
                weekdays: [...value.weekdays],
                routine: structuredClone(value.definition),
              })}
            />
          </section>
        ) : null}
        {draft.warning ? (
          <section data-editor-field="source-and-safety" className="border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-2">
            <h3 className="text-xs font-semibold text-[var(--flowme-warning-strong)]">주의</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-[var(--flowme-warning-strong)]">{draft.warning}</p>
          </section>
        ) : null}
        {draft.sourceUrl ? (
          <a
            data-editor-field="source-and-safety"
            className="inline-flex text-sm font-semibold text-[var(--flowme-action)] underline underline-offset-4"
            href={draft.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >원문 보기</a>
        ) : null}
      </form>
    </FlowEditorSurface>
  );
}

export function SavedFlowItemEditorSurface({
  draft,
  transaction,
  actions,
  onPatch,
  visualSubtractionEnabled = true,
  q3CopyEnabled = true,
}: {
  draft: SavedFlowItemEditorViewDraft;
  transaction: SavedEditorTransactionView;
  actions: SharedActions;
  onPatch: (patch: Partial<Pick<SavedFlowItemEditorViewDraft, 'title' | 'detail' | 'date'>>) => void;
  visualSubtractionEnabled?: boolean;
  q3CopyEnabled?: boolean;
}) {
  const contract = getFlowEditorSurfaceContract({
    context: 'saved-overlay',
    level: 'item',
    capabilities: {
      title: true,
      detail: true,
      date: true,
      completionCriterion: Boolean(draft.completionCriterion),
      sourceOrSafety: Boolean(draft.sourceUrl || draft.warning),
    },
  });
  return (
    <FlowEditorSurface
      testId="saved-flow-editor-item"
      headingId="saved-flow-editor-item-title"
      context="saved-overlay"
      level="item"
      status={transaction.status}
      layout="responsive"
      semanticRole={contract.semanticRole}
      commitRole={contract.commitRole}
      eyebrow={q3CopyEnabled ? '항목 수정' : '할 일 조정'}
      title={draft.title.trim() || (visualSubtractionEnabled ? '수정' : '할 일 수정')}
      initialFocusSelector='[data-testid="saved-flow-editor-item-title-input"]'
      dialogProps={{
        'data-editor-schema-fields': contract.fields.map((field) => field.id).join(','),
      }}
      dismissible={transaction.status !== 'submitting' && transaction.status !== 'recovery-required'}
      onRequestClose={(cause) => actions.onRequestClose(cause)}
      errorSummary={buildErrorSummary(transaction)}
      discardConfirmation={{
        open: transaction.pendingClose,
        onContinueEditing: actions.onContinueEditing,
        onDiscardChanges: actions.onDiscardChanges,
        testId: 'flow-editor-discard-prompt',
      }}
      cancelAction={{
        label: '취소',
        testId: 'saved-flow-editor-item-cancel',
        disabled: transaction.status === 'submitting' || transaction.status === 'recovery-required',
        onAction: () => actions.onRequestClose('cancel'),
      }}
      primaryAction={{
        label: q3CopyEnabled ? Q3_USER_COPY_PROFILE.savedDetail.saveChanges : contract.commitLabel,
        testId: 'my-flow-detail-save-changes',
        onAction: actions.onCommit,
      }}
      retryAction={transaction.status === 'recoverable-error' ? {
        label: '다시 시도',
        testId: 'flow-editor-retry',
        onAction: actions.onCommit,
      } : undefined}
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          actions.onCommit();
        }}
      >
        <label className="block text-sm font-semibold text-[var(--flowme-text)]">
          할 일
          <input
            data-testid="saved-flow-editor-item-title-input"
            data-editor-field="item-title"
            className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
            value={draft.title}
            maxLength={120}
            required
            onChange={(event) => onPatch({ title: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold text-[var(--flowme-text)]">
          상세 내용·메모
          <textarea
            data-testid="saved-flow-editor-item-detail-input"
            data-editor-field="item-detail"
            className={`mt-1 min-h-28 w-full resize-y ${FLOW_UI_INPUT_CLASS}`}
            value={draft.detail}
            maxLength={1000}
            onChange={(event) => onPatch({ detail: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold text-[var(--flowme-text)]">
          날짜
          <input
            data-testid="saved-flow-editor-item-date-input"
            data-editor-field="item-date"
            className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
            type="date"
            value={draft.date}
            onChange={(event) => onPatch({ date: event.target.value })}
          />
        </label>
        {draft.completionCriterion ? (
          <section data-editor-field="item-completion-criterion" className="border-l-2 border-[var(--flowme-border-strong)] px-3 py-2">
            <h3 className="text-xs font-semibold text-[var(--flowme-text-secondary)]">완료 기준</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-[var(--flowme-text)]">{draft.completionCriterion}</p>
          </section>
        ) : null}
        {draft.warning ? (
          <section data-editor-field="source-and-safety" className="border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-2">
            <h3 className="text-xs font-semibold text-[var(--flowme-warning-strong)]">주의</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-[var(--flowme-warning-strong)]">{draft.warning}</p>
          </section>
        ) : null}
        {draft.sourceUrl ? (
          <a
            data-editor-field="source-and-safety"
            className="inline-flex text-sm font-semibold text-[var(--flowme-action)] underline underline-offset-4"
            href={draft.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >원문 보기</a>
        ) : null}
      </form>
    </FlowEditorSurface>
  );
}
