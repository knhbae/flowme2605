'use client';

import React from 'react';

import { FlowEditorSurface } from '../FlowEditorSurface';
import {
  FLOW_UI_COMPACT_ACTION_CLASS,
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from '../flow-ui';
import type {
  FlowEditorCloseEvent,
  FlowEditorFailure,
  FlowEditorStatus,
} from '@/lib/flow/flow-editor-transaction';
import type {
  PersonalWorkspacePocPlanDraft,
  PersonalWorkspacePocPlanItemDraft,
  PersonalWorkspacePocPlanScheduleDraft,
  PersonalWorkspacePocPlanTextDraft,
} from '@/lib/flow/personal-workspace-poc-plan-editor';
import type {
  PersonalWorkspacePocReceiptChange,
  PersonalWorkspacePocReceiptChangeOwner,
} from '@/lib/flow/personal-workspace-poc-receipt';

export type PersonalWorkspacePocEditorTransactionView = Readonly<{
  status: FlowEditorStatus;
  failure?: FlowEditorFailure;
  pendingClose: boolean;
}>;

export type PersonalWorkspacePocEditorCommonActions = Readonly<{
  onRequestClose: (event: FlowEditorCloseEvent) => void;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
  onRetry?: () => void;
}>;

export type PersonalWorkspacePocEditorSourceSummary = Readonly<{
  ownerLabel?: string;
  title: string;
  description?: string;
  originalScheduleLabel?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  completionCriterion?: string;
}>;

export type PersonalWorkspacePocEditorExecutionSummary = Readonly<{
  periodLabel?: string;
  dateLabel?: string;
  orderLabel?: string;
  completionLabel?: string;
}>;

type EditableReceiptOwner = Exclude<
  PersonalWorkspacePocReceiptChangeOwner,
  'authoring-source'
>;

export type PersonalWorkspacePocEditorImpactChange = Readonly<
  Omit<PersonalWorkspacePocReceiptChange, 'owner'> & {
    owner: EditableReceiptOwner;
  }
>;

export type PersonalWorkspacePocEditorImpactSummary = Readonly<{
  targetLabel: string;
  affectedCount: number;
  includedCount?: number;
  excludedCount?: number;
  changes: readonly PersonalWorkspacePocEditorImpactChange[];
  warning?: string;
}>;

export type PersonalWorkspacePocPlanItemSummary = Readonly<{
  itemRef: string;
  sourceTitle: string;
  effectiveTitle?: string;
  planDateLabel?: string;
  sectionTitle?: string;
}>;

export type PersonalWorkspacePocPlanSectionSummary = Readonly<{
  sectionId: string;
  sourceTitle: string;
}>;

export type PersonalWorkspacePocPlanCommitIntent = Readonly<{
  kind: 'commit-personal-plan';
  scope: 'poc-shadow';
  flowRef: string;
  draft: PersonalWorkspacePocPlanDraft;
}>;

export type PersonalWorkspacePocPlanItemApplyIntent = Readonly<{
  kind: 'apply-item-to-parent-personal-draft';
  persistence: 'parent-draft-only';
  parentFlowRef: string;
  itemRef: string;
  draft: PersonalWorkspacePocPlanItemDraft;
}>;

export type PersonalWorkspacePocQuickItemRootDraft = Readonly<{
  itemRef: string;
  title: string;
  memo: string;
  executionDate?: string;
}>;

export type PersonalWorkspacePocQuickItemCommitIntent = Readonly<{
  kind: 'commit-quick-item-root';
  scope: 'poc-shadow';
  itemRef: string;
  draft: PersonalWorkspacePocQuickItemRootDraft;
}>;

export type PersonalWorkspacePocPlanEditorSurfaceProps = Readonly<{
  draft: PersonalWorkspacePocPlanDraft;
  transaction: PersonalWorkspacePocEditorTransactionView;
  actions: PersonalWorkspacePocEditorCommonActions;
  source: PersonalWorkspacePocEditorSourceSummary;
  /** Editable personal-owned sections only; read-only sections have no control. */
  sections?: readonly PersonalWorkspacePocPlanSectionSummary[];
  items: readonly PersonalWorkspacePocPlanItemSummary[];
  impact: PersonalWorkspacePocEditorImpactSummary;
  onDraftChange: (draft: PersonalWorkspacePocPlanDraft) => void;
  onOpenItem: (intent: Readonly<{
    parentFlowRef: string;
    itemRef: string;
    returnFocusSelector: string;
  }>) => void;
  onCommitIntent: (intent: PersonalWorkspacePocPlanCommitIntent) => void;
}>;

export type PersonalWorkspacePocPlanItemEditorSurfaceProps = Readonly<{
  adapter: 'plan-item';
  draft: PersonalWorkspacePocPlanItemDraft;
  transaction: PersonalWorkspacePocEditorTransactionView;
  actions: PersonalWorkspacePocEditorCommonActions;
  source: PersonalWorkspacePocEditorSourceSummary;
  execution: PersonalWorkspacePocEditorExecutionSummary;
  impact: PersonalWorkspacePocEditorImpactSummary;
  parentFlowRef: string;
  parentTitle: string;
  onDraftChange: (draft: PersonalWorkspacePocPlanItemDraft) => void;
  onApplyToParentDraft: (intent: PersonalWorkspacePocPlanItemApplyIntent) => void;
}>;

export type PersonalWorkspacePocQuickItemEditorSurfaceProps = Readonly<{
  adapter: 'quick-item-root';
  draft: PersonalWorkspacePocQuickItemRootDraft;
  transaction: PersonalWorkspacePocEditorTransactionView;
  actions: PersonalWorkspacePocEditorCommonActions;
  execution: PersonalWorkspacePocEditorExecutionSummary;
  impact: PersonalWorkspacePocEditorImpactSummary;
  onDraftChange: (draft: PersonalWorkspacePocQuickItemRootDraft) => void;
  onCommitIntent: (intent: PersonalWorkspacePocQuickItemCommitIntent) => void;
}>;

export type PersonalWorkspacePocItemEditorSurfaceProps =
  | PersonalWorkspacePocPlanItemEditorSurfaceProps
  | PersonalWorkspacePocQuickItemEditorSurfaceProps;

const ORIGIN_LABELS: Record<PersonalWorkspacePocPlanDraft['origin'], string> = {
  'source-backed-map': '원본에서 가져온 Flow',
  'personal-draft': '개인 초안',
  'canonical-personal-copy': '내 Flow 사본',
  'legacy-saved-plan': '기존 저장 Flow',
  'authoring-handoff': '직접 작성한 Flow',
};

const IMPACT_OWNER_LABELS: Record<EditableReceiptOwner, string> = {
  'poc-personal-plan': '내 계획',
  organization: '정리 위치',
  execution: '실행 상태',
};

function editorErrorSummary(
  transaction: PersonalWorkspacePocEditorTransactionView,
): Parameters<typeof FlowEditorSurface>[0]['errorSummary'] {
  if (!transaction.failure) return undefined;
  return {
    title: transaction.status === 'recovery-required'
      ? '저장 상태를 확인해 주세요'
      : '변경을 반영하지 못했습니다',
    errors: [{
      id: transaction.failure.code,
      message: transaction.failure.message,
    }],
    testId: 'personal-workspace-poc-editor-error',
  };
}

function displayValue(value: PersonalWorkspacePocReceiptChange['before']): string {
  if (value === null) return '없음';
  if (value === '') return '비움';
  if (typeof value === 'boolean') return value ? '예' : '아니요';
  return String(value);
}

function safeSourceUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : undefined;
  } catch {
    return undefined;
  }
}

function ReadOnlyRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">{label}</dt>
      <dd className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium text-[var(--flowme-text)]">
        {value}
      </dd>
    </div>
  );
}

function SourceReadOnlySection({
  source,
  emptyLabel,
}: {
  source?: PersonalWorkspacePocEditorSourceSummary;
  emptyLabel?: string;
}) {
  const sourceUrl = safeSourceUrl(source?.sourceUrl);
  return (
    <section
      data-editor-field-group="source-read-only"
      data-personal-plan-section="source"
      aria-labelledby="personal-workspace-poc-source-heading"
      className="rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3
          id="personal-workspace-poc-source-heading"
          className="text-sm font-semibold text-[var(--flowme-text)]"
        >
          원본 정보
        </h3>
        <span className="text-xs font-medium text-[var(--flowme-text-tertiary)]">원본은 바꿀 수 없어요</span>
      </div>
      {source ? (
        <dl className="mt-3 space-y-2">
          <ReadOnlyRow label="원본 제목" value={source.title} />
          <ReadOnlyRow label="원본 설명" value={source.description} />
          <ReadOnlyRow label="원래 일정" value={source.originalScheduleLabel} />
          <ReadOnlyRow label="완료 기준" value={source.completionCriterion} />
          <ReadOnlyRow label="출처" value={source.sourceLabel} />
          {sourceUrl ? (
            <div className="grid gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
              <dt className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">원문</dt>
              <dd className="min-w-0">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm font-semibold text-[var(--flowme-action-strong)] underline underline-offset-2"
                >
                  출처 열기
                </a>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <p className="mt-2 text-sm font-medium text-[var(--flowme-text-secondary)]">
          {emptyLabel ?? '연결된 원본이 없습니다.'}
        </p>
      )}
    </section>
  );
}

function ImpactSummary({
  impact,
}: {
  impact: PersonalWorkspacePocEditorImpactSummary;
}) {
  return (
    <>
      {impact.warning ? (
        <aside
          data-personal-plan-section="warnings"
          className="border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-surface-subtle)] px-3 py-2 text-sm font-medium text-[var(--flowme-warning-strong)]"
        >
          {impact.warning}
        </aside>
      ) : null}
      <section
        data-testid="personal-workspace-editor-impact"
        data-editor-field-group="impact-summary"
        data-personal-plan-section="impact"
        data-impact-target={impact.targetLabel}
        data-impact-affected-count={impact.affectedCount}
        aria-labelledby="personal-workspace-poc-impact-heading"
        className="rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-action-border)] bg-[var(--flowme-action-soft)] p-4"
      >
      <h3
        id="personal-workspace-poc-impact-heading"
        className="text-sm font-semibold text-[var(--flowme-text)]"
      >
        반영 전 확인
      </h3>
      <p className="mt-1 text-sm font-medium text-[var(--flowme-text-secondary)]">
        {impact.targetLabel} · {impact.affectedCount}개 항목
        {impact.includedCount !== undefined ? ` · 반영 ${impact.includedCount}개` : ''}
        {impact.excludedCount !== undefined ? ` · 제외 ${impact.excludedCount}개` : ''}
      </p>
      {impact.changes.length ? (
        <ul className="mt-3 space-y-2">
          {impact.changes.map((change) => (
            <li
              key={`${change.owner}:${change.field}`}
              data-impact-owner={change.owner}
              data-impact-field={change.field}
              className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-surface)] px-3 py-2 text-sm"
            >
              <p className="font-semibold text-[var(--flowme-text)]">
                {change.label}
                <span className="ml-2 text-xs font-medium text-[var(--flowme-text-tertiary)]">
                  {IMPACT_OWNER_LABELS[change.owner]}
                </span>
              </p>
              <p className="mt-1 break-words text-[var(--flowme-text-secondary)]">
                <span className="sr-only">변경 전 </span>
                <span className="line-through">{displayValue(change.before)}</span>
                <span aria-hidden="true"> → </span>
                <span className="sr-only">변경 후 </span>
                <span className="font-semibold text-[var(--flowme-text)]">{displayValue(change.after)}</span>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm font-medium text-[var(--flowme-text-secondary)]">
          바뀌는 내용이 없습니다.
        </p>
      )}
      </section>
    </>
  );
}

function TextDraftControl({
  id,
  label,
  draft,
  inheritedValue,
  allowEmpty,
  multiline = false,
  inheritOptionLabel = '원본 따르기',
  inheritHint,
  modeTestId,
  valueTestId,
  onChange,
}: {
  id: string;
  label: string;
  draft: PersonalWorkspacePocPlanTextDraft;
  inheritedValue: string;
  allowEmpty: boolean;
  multiline?: boolean;
  inheritOptionLabel?: string;
  inheritHint?: string;
  modeTestId: string;
  valueTestId: string;
  onChange: (draft: PersonalWorkspacePocPlanTextDraft) => void;
}) {
  const valueId = `${id}-value`;
  const modeId = `${id}-mode`;
  return (
    <div data-editor-personal-field={id} className="space-y-2">
      <label htmlFor={modeId} className="block text-sm font-semibold text-[var(--flowme-text)]">
        {label}
      </label>
      <select
        id={modeId}
        data-testid={modeTestId}
        data-personal-plan-title={label === '내 Flow 제목' ? 'true' : undefined}
        data-personal-plan-item-title={label === '내 할 일 제목' ? 'true' : undefined}
        className={`w-full ${FLOW_UI_INPUT_CLASS}`}
        value={draft.mode}
        onChange={(event) => {
          if (event.target.value === 'inherit') {
            onChange({ mode: 'inherit' });
          } else {
            onChange({
              mode: 'override',
              value: draft.mode === 'override' ? draft.value : inheritedValue,
            });
          }
        }}
      >
        <option value="inherit">{inheritOptionLabel}</option>
        <option value="override">직접 입력</option>
      </select>
      {draft.mode === 'override' ? (
        multiline ? (
          <textarea
            id={valueId}
            data-testid={valueTestId}
            className={`min-h-28 w-full resize-y ${FLOW_UI_INPUT_CLASS}`}
            value={draft.value}
            maxLength={2000}
            aria-label={`${label} 직접 입력`}
            onChange={(event) => onChange({ mode: 'override', value: event.target.value })}
          />
        ) : (
          <input
            id={valueId}
            data-testid={valueTestId}
            data-personal-plan-title={label === '내 Flow 제목' ? 'true' : undefined}
            data-personal-plan-item-title={label === '내 할 일 제목' ? 'true' : undefined}
            className={`w-full ${FLOW_UI_INPUT_CLASS}`}
            value={draft.value}
            maxLength={80}
            required={!allowEmpty}
            aria-label={`${label} 직접 입력`}
            onChange={(event) => onChange({ mode: 'override', value: event.target.value })}
          />
        )
      ) : (
        <p className="text-xs font-medium text-[var(--flowme-text-tertiary)]">
          {inheritHint ?? `현재 원본 값: ${inheritedValue || '없음'}`}
        </p>
      )}
    </div>
  );
}

function ScheduleDraftControl({
  id,
  draft,
  inheritedLabel,
  modeTestId,
  dateTestId,
  onChange,
}: {
  id: string;
  draft: PersonalWorkspacePocPlanScheduleDraft;
  inheritedLabel?: string;
  modeTestId: string;
  dateTestId: string;
  onChange: (draft: PersonalWorkspacePocPlanScheduleDraft) => void;
}) {
  const modeId = `${id}-mode`;
  return (
    <div data-editor-personal-field="plan-schedule" className="space-y-2">
      <label htmlFor={modeId} className="block text-sm font-semibold text-[var(--flowme-text)]">
        계획 날짜
      </label>
      <select
        id={modeId}
        data-testid={modeTestId}
        data-personal-plan-item-date="true"
        className={`w-full ${FLOW_UI_INPUT_CLASS}`}
        value={draft.mode}
        onChange={(event) => {
          if (event.target.value === 'fixed_date') {
            onChange({
              mode: 'fixed_date',
              date: draft.mode === 'fixed_date' ? draft.date : '',
            });
          } else if (event.target.value === 'unscheduled') {
            onChange({ mode: 'unscheduled' });
          } else {
            onChange({ mode: 'inherit' });
          }
        }}
      >
        <option value="inherit">원본 따르기</option>
        <option value="fixed_date">날짜 지정</option>
        <option value="unscheduled">미정</option>
      </select>
      {draft.mode === 'fixed_date' ? (
        <input
          type="date"
          data-testid={dateTestId}
          className={`w-full ${FLOW_UI_INPUT_CLASS}`}
          value={draft.date}
          required
          aria-label="개인 계획 날짜"
          onChange={(event) => onChange({ mode: 'fixed_date', date: event.target.value })}
        />
      ) : draft.mode === 'inherit' ? (
        <p className="text-xs font-medium text-[var(--flowme-text-tertiary)]">
          현재 원본 일정: {inheritedLabel || '날짜 없음'}
        </p>
      ) : (
        <p className="text-xs font-medium text-[var(--flowme-text-tertiary)]">
          개인 계획에서 날짜를 정하지 않습니다.
        </p>
      )}
    </div>
  );
}

function ExecutionReadOnlySection({
  execution,
}: {
  execution: PersonalWorkspacePocEditorExecutionSummary;
}) {
  return (
    <section
      data-editor-field-group="execution-read-only"
      data-personal-plan-section="execution"
      aria-labelledby="personal-workspace-poc-execution-heading"
      className="rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] p-4"
    >
      <h3
        id="personal-workspace-poc-execution-heading"
        className="text-sm font-semibold text-[var(--flowme-text)]"
      >
        실행 위치
      </h3>
      <p className="mt-1 text-xs font-medium text-[var(--flowme-text-tertiary)]">
        날짜와 순서 이동, 완료 상태는 편집 밖의 실행 메뉴에서 바꿉니다.
      </p>
      <dl className="mt-3 space-y-2">
        <ReadOnlyRow label="기간" value={execution.periodLabel} />
        <ReadOnlyRow label="실행일" value={execution.dateLabel} />
        <ReadOnlyRow label="순서" value={execution.orderLabel} />
        <ReadOnlyRow label="상태" value={execution.completionLabel} />
      </dl>
    </section>
  );
}

function editorDiscardConfirmation(
  transaction: PersonalWorkspacePocEditorTransactionView,
  actions: PersonalWorkspacePocEditorCommonActions,
  description: string,
) {
  return {
    open: transaction.pendingClose,
    title: '저장하지 않은 변경을 버릴까요?',
    description,
    onContinueEditing: actions.onContinueEditing,
    onDiscardChanges: actions.onDiscardChanges,
    testId: 'personal-workspace-poc-editor-discard-confirmation',
  } as const;
}

function moveItemRef(
  draft: PersonalWorkspacePocPlanDraft,
  itemRef: string,
  direction: 'up' | 'down',
): PersonalWorkspacePocPlanDraft {
  const order = [...draft.orderedItemRefs];
  const index = order.indexOf(itemRef);
  const target = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= order.length) return draft;
  [order[index], order[target]] = [order[target], order[index]];
  return { ...draft, orderedItemRefs: order };
}

export function PersonalWorkspacePocPlanEditorSurface({
  draft,
  transaction,
  actions,
  source,
  sections = [],
  items,
  impact,
  onDraftChange,
  onOpenItem,
  onCommitIntent,
}: PersonalWorkspacePocPlanEditorSurfaceProps) {
  const itemByRef = new Map(items.map((item) => [item.itemRef, item]));
  const commitBlocked = transaction.status === 'dirty-invalid'
    || transaction.status === 'recoverable-error';
  return (
    <FlowEditorSurface
      testId="personal-workspace-plan-editor"
      headingId="personal-workspace-poc-plan-editor-heading"
      context="saved-overlay"
      level="plan"
      status={transaction.status}
      layout="responsive"
      semanticRole="saved-personal-copy"
      commitRole="save-personal-overlay"
      eyebrow={ORIGIN_LABELS[draft.origin]}
      title="내 계획 편집"
      initialFocusSelector="[data-personal-plan-title]"
      skipToActionsLabel="저장 작업으로 건너뛰기"
      dismissible={transaction.status !== 'submitting' && transaction.status !== 'recovery-required'}
      onRequestClose={actions.onRequestClose}
      errorSummary={editorErrorSummary(transaction)}
      discardConfirmation={editorDiscardConfirmation(
        transaction,
        actions,
        'Flow와 할 일에 준비한 변경을 모두 버리고 원래 화면으로 돌아갑니다.',
      )}
      cancelAction={{
        label: '취소',
        testId: 'personal-workspace-poc-plan-editor-cancel',
        onAction: () => actions.onRequestClose('cancel'),
      }}
      primaryAction={{
        label: '변경 저장',
        testId: 'personal-workspace-poc-plan-editor-commit',
        disabled: commitBlocked,
        onAction: () => onCommitIntent({
          kind: 'commit-personal-plan',
          scope: 'poc-shadow',
          flowRef: draft.flowRef,
          draft,
        }),
      }}
      retryAction={transaction.status === 'recoverable-error' && actions.onRetry ? {
        label: '다시 시도',
        testId: 'personal-workspace-poc-plan-editor-retry',
        onAction: actions.onRetry,
      } : undefined}
      cancelPlacement="header"
      enforce48pxTargets
      dialogProps={{
        'data-personal-workspace-editor-kind': 'plan',
        'data-editor-schema-fields': 'source-read-only,personal-title,personal-section-title,plan-items,impact-summary',
        'data-editor-persistence-scope': 'poc-shadow-only',
        'data-flow-ref': draft.flowRef,
        'data-origin': draft.origin,
      }}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (!commitBlocked) {
            onCommitIntent({
              kind: 'commit-personal-plan',
              scope: 'poc-shadow',
              flowRef: draft.flowRef,
              draft,
            });
          }
        }}
      >
        <section
          data-editor-field-group="target"
          data-personal-plan-section="identity"
          className="border-b border-[var(--flowme-border)] pb-4"
        >
          <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">편집 대상</p>
          <p className="mt-1 break-words text-sm font-semibold text-[var(--flowme-text)]">{source.title}</p>
        </section>

        <SourceReadOnlySection source={source} />

        <section
          data-editor-field-group="personal-editable"
          data-personal-plan-section="personal"
          aria-labelledby="personal-workspace-poc-plan-personal-heading"
          className="space-y-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-action-border)] p-4"
        >
          <div>
            <h3
              id="personal-workspace-poc-plan-personal-heading"
              className="text-sm font-semibold text-[var(--flowme-text)]"
            >
              내 Flow에서 바꿀 내용
            </h3>
            <p className="mt-1 text-xs font-medium text-[var(--flowme-text-tertiary)]">
              원본은 그대로 두고 이 개인 Flow에만 적용합니다.
            </p>
          </div>
          <TextDraftControl
            id="personal-workspace-poc-plan-title"
            label="내 Flow 제목"
            draft={draft.title}
            inheritedValue={source.title}
            allowEmpty={false}
            modeTestId="personal-workspace-plan-title-mode"
            valueTestId="personal-workspace-plan-title"
            onChange={(title) => onDraftChange({ ...draft, title })}
          />
          {sections.length > 0 ? (
            <div data-testid="personal-workspace-plan-section-title-list" className="space-y-3 border-t border-[var(--flowme-border)] pt-4">
              <div>
                <h4 className="text-sm font-semibold text-[var(--flowme-text)]">내 구간 제목</h4>
                <p className="mt-1 text-xs font-medium text-[var(--flowme-text-tertiary)]">개인 소유 구간만 바꿀 수 있습니다. 원문과 원본 구간은 그대로입니다.</p>
              </div>
              {sections.map((section) => {
                const sectionDraft = draft.sectionTitles?.[section.sectionId];
                if (!sectionDraft) return null;
                return (
                  <div key={section.sectionId} data-personal-plan-section-title data-section-id={section.sectionId}>
                    <TextDraftControl
                      id={`personal-workspace-poc-plan-section-${section.sectionId}`}
                      label={`구간 · ${section.sourceTitle}`}
                      draft={sectionDraft}
                      inheritedValue={section.sourceTitle}
                      allowEmpty={false}
                      modeTestId={`personal-workspace-plan-section-title-mode-${section.sectionId}`}
                      valueTestId={`personal-workspace-plan-section-title-${section.sectionId}`}
                      onChange={(sectionTitle) => onDraftChange({
                        ...draft,
                        sectionTitles: {
                          ...(draft.sectionTitles ?? {}),
                          [section.sectionId]: sectionTitle,
                        },
                      })}
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>

        <section
          data-editor-field-group="plan-items"
          data-personal-plan-section="items"
          aria-labelledby="personal-workspace-poc-plan-items-heading"
        >
          <div className="flex items-baseline justify-between gap-3">
            <h3
              id="personal-workspace-poc-plan-items-heading"
              className="text-sm font-semibold text-[var(--flowme-text)]"
            >
              할 일 순서
            </h3>
            <span className="text-xs font-medium text-[var(--flowme-text-tertiary)]">
              {draft.orderedItemRefs.length}개
            </span>
          </div>
          <div
            data-testid="personal-workspace-plan-item-list"
            data-personal-plan-order="true"
            data-flow-editor-scroll-key="personal-workspace-poc-plan-items"
            className="mt-2 max-h-[min(52vh,30rem)] overflow-y-auto border-y border-[var(--flowme-border)]"
          >
            {draft.orderedItemRefs.map((itemRef, index) => {
              const item = itemByRef.get(itemRef);
              const title = item?.effectiveTitle || item?.sourceTitle || '할 일';
              const openerId = `personal-workspace-poc-plan-item-${index}`;
              return (
                <div
                  key={itemRef}
                  data-testid="personal-workspace-plan-item-row"
                  data-item-ref={itemRef}
                  className="grid min-h-16 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-[var(--flowme-border)] py-2.5 last:border-b-0"
                >
                  <span className="grid grid-cols-2 gap-1" role="group" aria-label={`${title} 순서`}>
                    <button
                      type="button"
                      className={FLOW_UI_COMPACT_ACTION_CLASS}
                      aria-label={`${title} 위로 이동`}
                      disabled={index === 0}
                      onClick={() => onDraftChange(moveItemRef(draft, itemRef, 'up'))}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={FLOW_UI_COMPACT_ACTION_CLASS}
                      aria-label={`${title} 아래로 이동`}
                      disabled={index === draft.orderedItemRefs.length - 1}
                      onClick={() => onDraftChange(moveItemRef(draft, itemRef, 'down'))}
                    >
                      ↓
                    </button>
                  </span>
                  <button
                    id={openerId}
                    type="button"
                    data-testid="personal-workspace-plan-item-open"
                    data-item-ref={itemRef}
                    className="min-w-0 rounded-[var(--flowme-radius-control)] px-2 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                    onClick={() => onOpenItem({
                      parentFlowRef: draft.flowRef,
                      itemRef,
                      returnFocusSelector: `#${openerId}`,
                    })}
                  >
                    <span className="block break-words text-sm font-semibold text-[var(--flowme-text)]">{title}</span>
                    <span className="mt-1 block text-xs font-medium text-[var(--flowme-text-tertiary)]">
                      {[item?.sectionTitle, item?.planDateLabel].filter(Boolean).join(' · ') || '날짜 미정'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <ImpactSummary impact={impact} />
      </form>
    </FlowEditorSurface>
  );
}

export function PersonalWorkspacePocItemEditorSurface(
  props: PersonalWorkspacePocItemEditorSurfaceProps,
) {
  const isPlanItem = props.adapter === 'plan-item';
  const commitBlocked = props.transaction.status === 'dirty-invalid'
    || props.transaction.status === 'recoverable-error';
  const source = isPlanItem ? props.source : undefined;
  const itemTitle = isPlanItem
    ? (props.draft.title.mode === 'override' ? props.draft.title.value : props.source.title)
    : props.draft.title;
  const surfaceLevel = isPlanItem ? 'item' as const : 'plan' as const;
  const semanticRole = isPlanItem ? 'pending-saved-plan-save' as const : 'saved-personal-copy' as const;
  const commitRole = isPlanItem
    ? 'apply-item-to-parent-personal-draft' as const
    : 'save-personal-overlay' as const;

  const submit = () => {
    if (commitBlocked) return;
    if (isPlanItem) {
      props.onApplyToParentDraft({
        kind: 'apply-item-to-parent-personal-draft',
        persistence: 'parent-draft-only',
        parentFlowRef: props.parentFlowRef,
        itemRef: props.draft.identity.itemRef,
        draft: props.draft,
      });
    } else {
      props.onCommitIntent({
        kind: 'commit-quick-item-root',
        scope: 'poc-shadow',
        itemRef: props.draft.itemRef,
        draft: props.draft,
      });
    }
  };

  return (
    <FlowEditorSurface
      testId="personal-workspace-item-editor"
      headingId="personal-workspace-poc-item-editor-heading"
      context="saved-overlay"
      level={surfaceLevel}
      status={props.transaction.status}
      layout="responsive"
      semanticRole={semanticRole}
      commitRole={commitRole}
      eyebrow={isPlanItem ? props.parentTitle : '빠른 할 일'}
      title={isPlanItem ? '할 일 계획 편집' : '빠른 할 일 편집'}
      initialFocusSelector={isPlanItem
        ? '[data-personal-plan-item-title]'
        : '[data-personal-quick-item-title]'}
      skipToActionsLabel={isPlanItem ? '계획 반영 작업으로 건너뛰기' : '저장 작업으로 건너뛰기'}
      dismissible={props.transaction.status !== 'submitting' && props.transaction.status !== 'recovery-required'}
      onRequestClose={props.actions.onRequestClose}
      errorSummary={editorErrorSummary(props.transaction)}
      discardConfirmation={editorDiscardConfirmation(
        props.transaction,
        props.actions,
        isPlanItem
          ? '이 할 일에서 준비한 변경만 버리고 Flow 계획으로 돌아갑니다.'
          : '빠른 할 일에서 준비한 변경을 버리고 원래 목록으로 돌아갑니다.',
      )}
      cancelAction={{
        label: isPlanItem ? '돌아가기' : '취소',
        testId: 'personal-workspace-poc-item-editor-cancel',
        onAction: () => props.actions.onRequestClose('cancel'),
      }}
      primaryAction={{
        label: isPlanItem ? '계획에 반영' : '변경 저장',
        testId: 'personal-workspace-poc-item-editor-commit',
        disabled: commitBlocked,
        onAction: submit,
      }}
      retryAction={props.transaction.status === 'recoverable-error' && props.actions.onRetry ? {
        label: '다시 시도',
        testId: 'personal-workspace-poc-item-editor-retry',
        onAction: props.actions.onRetry,
      } : undefined}
      cancelPlacement="header"
      enforce48pxTargets
      dialogProps={{
        'data-personal-workspace-editor-kind': props.adapter,
        'data-editor-schema-fields': isPlanItem
          ? 'source-read-only,personal-title,personal-memo,plan-schedule,execution-read-only,impact-summary'
          : 'personal-title,personal-memo,execution-date,impact-summary',
        'data-editor-persistence-scope': isPlanItem ? 'parent-draft-only' : 'poc-shadow-only',
        'data-item-ref': isPlanItem ? props.draft.identity.itemRef : props.draft.itemRef,
        'data-parent-flow-ref': isPlanItem ? props.parentFlowRef : undefined,
      }}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <section
          data-editor-field-group="target"
          data-personal-plan-section="identity"
          className="border-b border-[var(--flowme-border)] pb-4"
        >
          <p className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">편집 대상</p>
          <p className="mt-1 break-words text-sm font-semibold text-[var(--flowme-text)]">{itemTitle || '제목 없음'}</p>
        </section>

        {isPlanItem ? <SourceReadOnlySection source={source} /> : null}

        <section
          data-editor-field-group="personal-editable"
          data-personal-plan-section="personal"
          aria-labelledby="personal-workspace-poc-item-personal-heading"
          className="space-y-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-action-border)] p-4"
        >
          <div>
            <h3
              id="personal-workspace-poc-item-personal-heading"
              className="text-sm font-semibold text-[var(--flowme-text)]"
            >
              내가 바꿀 내용
            </h3>
            <p className="mt-1 text-xs font-medium text-[var(--flowme-text-tertiary)]">
              {isPlanItem
                ? '원본과 실행 기록은 그대로 두고 이 Flow 계획에만 반영합니다.'
                : '이 기기에 저장한 빠른 할 일만 바뀝니다.'}
            </p>
          </div>
          {isPlanItem ? (
            <>
              <TextDraftControl
                id="personal-workspace-poc-item-title"
                label="내 할 일 제목"
                draft={props.draft.title}
                inheritedValue={props.source.title}
                allowEmpty={false}
                modeTestId="personal-workspace-item-title-mode"
                valueTestId="personal-workspace-item-title-input"
                onChange={(title) => props.onDraftChange({ ...props.draft, title })}
              />
              <TextDraftControl
                id="personal-workspace-poc-item-memo"
                label="개인 메모"
                draft={props.draft.memo}
                inheritedValue=""
                allowEmpty
                multiline
                inheritOptionLabel="개인 메모 없음"
                inheritHint="개인 메모를 따로 저장하지 않습니다."
                modeTestId="personal-workspace-item-memo-mode"
                valueTestId="personal-workspace-item-memo"
                onChange={(memo) => props.onDraftChange({ ...props.draft, memo })}
              />
              <ScheduleDraftControl
                id="personal-workspace-poc-item-schedule"
                draft={props.draft.schedule}
                inheritedLabel={props.source.originalScheduleLabel}
                modeTestId="personal-workspace-item-schedule-mode"
                dateTestId="personal-workspace-item-schedule-date"
                onChange={(schedule) => props.onDraftChange({ ...props.draft, schedule })}
              />
            </>
          ) : (
            <>
              <label className="block text-sm font-semibold text-[var(--flowme-text)]">
                내 할 일 제목
                <input
                  data-testid="personal-workspace-poc-quick-item-title"
                  data-personal-quick-item-title="true"
                  className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
                  value={props.draft.title}
                  maxLength={80}
                  required
                  onChange={(event) => props.onDraftChange({ ...props.draft, title: event.target.value })}
                />
              </label>
              <label className="block text-sm font-semibold text-[var(--flowme-text)]">
                개인 메모
                <textarea
                  data-testid="personal-workspace-poc-quick-item-memo"
                  className={`mt-1 min-h-28 w-full resize-y ${FLOW_UI_INPUT_CLASS}`}
                  value={props.draft.memo}
                  maxLength={2000}
                  onChange={(event) => props.onDraftChange({ ...props.draft, memo: event.target.value })}
                />
              </label>
            </>
          )}
        </section>

        {isPlanItem ? (
          <ExecutionReadOnlySection execution={props.execution} />
        ) : (
          <section
            data-editor-field-group="execution-editable"
            data-personal-plan-section="execution"
            aria-labelledby="personal-workspace-poc-quick-execution-heading"
            className="rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] p-4"
          >
            <h3
              id="personal-workspace-poc-quick-execution-heading"
              className="text-sm font-semibold text-[var(--flowme-text)]"
            >
              실행 위치 · 개인 항목
            </h3>
            <label className="mt-3 block text-sm font-semibold text-[var(--flowme-text)]">
              실행일
              <input
                type="date"
                data-testid="personal-workspace-poc-quick-item-date"
                className={`mt-1 w-full ${FLOW_UI_INPUT_CLASS}`}
                value={props.draft.executionDate ?? ''}
                onChange={(event) => props.onDraftChange({
                  ...props.draft,
                  executionDate: event.target.value || undefined,
                })}
              />
            </label>
            <dl className="mt-3 space-y-2">
              <ReadOnlyRow label="기간" value={props.execution.periodLabel} />
              <ReadOnlyRow label="순서" value={props.execution.orderLabel} />
              <ReadOnlyRow label="상태" value={props.execution.completionLabel} />
            </dl>
          </section>
        )}

        <ImpactSummary impact={props.impact} />
      </form>
    </FlowEditorSurface>
  );
}

export const PERSONAL_WORKSPACE_POC_EDITOR_FORBIDDEN_CAPABILITIES = Object.freeze({
  operatingWriter: false,
  actualCalendarRoute: false,
  exportOrDownload: false,
  sourceReverseEdit: false,
});
