'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { formatKoreanShortDate } from '@/lib/flow/date';
import { buildArtifactRecommendationVM } from '@/lib/flow/artifact-recommendation';
import { buildDateGroupedTodoListViewModel } from '@/lib/flow/date-grouped-todo-list';
import type {
  PublicFlowTextSyntaxGroup,
  PublicFlowTextSyntaxModel,
} from '@/lib/flow/public-flow-text-syntax';
import type {
  FlowExperienceProjection,
  FlowExperienceProjectionRow,
  FlowExperienceShape,
} from '@/lib/flow/flow-experience-projection';
import { FlowDateRailGroup } from './FlowExecutionPrimitives';
import { DateGroupedTodoList } from './DateGroupedTodoList';

const EMPTY_MESSAGE: Record<FlowExperienceShape, string> = {
  flow_execution: '저장할 실행 항목이 없습니다.',
  calendar: '기준일이나 항목 날짜를 정하면 일정이 여기에 나타납니다.',
  checklist: '체크할 실행 항목이 없습니다.',
  sheet: '표로 옮길 항목이 없습니다.',
  memo: '메모로 가져갈 내용이 없습니다.',
};

const APPROVED_PUBLIC_SHAPES = ['memo', 'checklist', 'calendar'] as const satisfies readonly FlowExperienceShape[];

const APPROVED_PUBLIC_SHAPE_LABELS: Record<(typeof APPROVED_PUBLIC_SHAPES)[number], string> = {
  memo: 'Text',
  checklist: 'Todo',
  calendar: 'Calendar',
};

function getApprovedPublicShapeLabel(shape: FlowExperienceShape): string | undefined {
  return APPROVED_PUBLIC_SHAPES.includes(shape as (typeof APPROVED_PUBLIC_SHAPES)[number])
    ? APPROVED_PUBLIC_SHAPE_LABELS[shape as (typeof APPROVED_PUBLIC_SHAPES)[number]]
    : undefined;
}

function getDateLabel(row: FlowExperienceProjectionRow): string {
  if (!row.schedule.date) return '날짜 없음';
  return formatKoreanShortDate(row.schedule.date, { includeWeekday: true });
}

function getCalendarGroupAriaLabel(date: string, row: FlowExperienceProjectionRow): string {
  if (date === '날짜 없음') return date;
  const year = date.match(/^(\d{4})-/u)?.[1];
  return year ? `${Number(year)}년 ${getDateLabel(row)}` : getDateLabel(row);
}

function getRowMeta(row: FlowExperienceProjectionRow): string[] {
  return [
    row.schedule.date ? getDateLabel(row) : '',
    row.section ?? '',
    row.role === 'resource' || row.role === 'reference' ? '자료' : '',
    row.role === 'warning' ? '주의' : '',
  ].filter(Boolean);
}

function RowCompletionCriterion({ row }: { row: FlowExperienceProjectionRow }) {
  if (!row.completionCriterion) return null;
  return (
    <span
      data-flow-row-slot="completion-criterion"
      className="mt-1 block break-words text-[11px] leading-4 text-[var(--flowme-text-secondary)]"
    >
      완료 기준 · {row.completionCriterion}
    </span>
  );
}

type ShapeRowProps = {
  rows: FlowExperienceProjectionRow[];
  remainder?: boolean;
  rowTestId?: string;
  onRowEdit?: (row: FlowExperienceProjectionRow, returnFocusSelector: string) => void;
};

function getRowTestId(remainder: boolean, rowTestId?: string): string {
  return rowTestId ?? (remainder ? 'flow-artifact-preview-remainder-row' : 'flow-artifact-preview-row');
}

function getRowEditReturnFocusSelector(rowId: string): string {
  return `[data-testid="public-flow-artifact-preview-row-edit"][data-item-id="${CSS.escape(rowId)}"]`;
}

function RowEditButton({
  row,
  onRowEdit,
}: {
  row: FlowExperienceProjectionRow;
  onRowEdit?: ShapeRowProps['onRowEdit'];
}) {
  if (!onRowEdit) return null;
  return (
    <button
      type="button"
      data-flow-row-slot="secondary-action"
      data-testid="public-flow-artifact-preview-row-edit"
      data-item-id={row.id}
      className="min-h-[var(--flowme-control-height)] shrink-0 rounded-[var(--flowme-radius-control)] px-2 text-xs font-semibold text-[var(--flowme-text-secondary)] transition hover:bg-[var(--flowme-soft)] hover:text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
      aria-label={`${row.title} 내용과 날짜 수정`}
      onClick={() => onRowEdit(row, getRowEditReturnFocusSelector(row.id))}
    >
      수정
    </button>
  );
}

function FlowExecutionRows({ rows, remainder = false, rowTestId, onRowEdit }: ShapeRowProps) {
  return (
    <ol data-testid="flow-artifact-execution-preview">
      {rows.map((row, index) => (
        <li
          key={row.id}
          data-testid={getRowTestId(remainder, rowTestId)}
          data-item-id={row.id}
          data-flow-row-mode="preview"
          data-completion-control="false"
          data-p35-r9-marker="P35-R9-SHARED-EXECUTION-ROW"
          data-p35-r9-preview-marker="P35-R9-PREVIEW-NOT-COMPLETION"
          className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-[var(--flowme-border)] px-2 py-3"
        >
          <span data-flow-row-slot="marker" aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--flowme-action-soft)] text-[10px] font-bold text-[var(--flowme-action-strong)]">
            {index + 1}
          </span>
          <span className="min-w-0" data-flow-row-slot="content">
            <span data-flow-row-slot="title" className="block break-words text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
            {getRowMeta(row).length > 0 ? (
              <span data-flow-row-slot="meta" className="mt-1 block text-[11px] font-medium text-[var(--flowme-text-secondary)]">{getRowMeta(row).join(' · ')}</span>
            ) : null}
            <RowCompletionCriterion row={row} />
          </span>
          <RowEditButton row={row} onRowEdit={onRowEdit} />
        </li>
      ))}
    </ol>
  );
}

function CalendarRows({ rows, remainder = false, rowTestId, onRowEdit }: ShapeRowProps) {
  const dateGroups = Array.from(rows.reduce((groups, row) => {
    const date = row.schedule.date ?? '날짜 없음';
    groups.set(date, [...(groups.get(date) ?? []), row]);
    return groups;
  }, new Map<string, FlowExperienceProjectionRow[]>())).sort(([left], [right]) => {
    if (left === '날짜 없음') return right === '날짜 없음' ? 0 : 1;
    if (right === '날짜 없음') return -1;
    return left.localeCompare(right);
  });
  return (
    <div data-testid="flow-artifact-calendar-preview" className="border-t border-[var(--flowme-border)]">
      {dateGroups.map(([date, groupRows]) => (
        <FlowDateRailGroup
          key={date}
          date={date === '날짜 없음' ? undefined : date}
          undatedLabel="날짜 없음"
          showMonth
          dateRailAriaHidden
        >
          <h3 className="sr-only">{getCalendarGroupAriaLabel(date, groupRows[0])}</h3>
          <ol className="min-w-0">
            {groupRows.map((row) => (
              <li
                key={row.id}
                data-testid={getRowTestId(remainder, rowTestId)}
                data-item-id={row.id}
                data-flow-row-mode="preview"
                data-completion-control="false"
                data-p35-r9-marker="P35-R9-SHARED-EXECUTION-ROW"
                data-p35-r9-preview-marker="P35-R9-PREVIEW-NOT-COMPLETION"
                className="flex min-w-0 items-center justify-between gap-2 border-b border-[var(--flowme-border)] px-3 py-2.5 last:border-b-0"
              >
                <span className="min-w-0" data-flow-row-slot="content">
                  <span data-flow-row-slot="title" className="block break-words text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
                  {row.section ? <span data-flow-row-slot="meta" className="mt-0.5 block text-[11px] text-[var(--flowme-text-secondary)]">{row.section}</span> : null}
                  <RowCompletionCriterion row={row} />
                </span>
                <RowEditButton row={row} onRowEdit={onRowEdit} />
              </li>
            ))}
          </ol>
        </FlowDateRailGroup>
      ))}
    </div>
  );
}

function ChecklistRows({ rows, remainder = false, rowTestId, onRowEdit }: ShapeRowProps) {
  return (
    <ul data-testid="flow-artifact-checklist-preview">
      {rows.map((row) => (
        <li
          key={row.id}
          data-testid={getRowTestId(remainder, rowTestId)}
          data-item-id={row.id}
          data-flow-row-mode="preview"
          data-completion-control="false"
          data-p35-r9-marker="P35-R9-SHARED-EXECUTION-ROW"
          data-p35-r9-preview-marker="P35-R9-PREVIEW-NOT-COMPLETION"
          className="flex min-w-0 items-start gap-3 border-t border-[var(--flowme-border)] px-2 py-3"
        >
          <span data-flow-row-slot="marker" aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-[var(--flowme-soft)] text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">·</span>
          <span className="min-w-0 flex-1" data-flow-row-slot="content">
            <span data-flow-row-slot="title" className="block break-words text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
            {getRowMeta(row).length > 0 ? <span data-flow-row-slot="meta" className="mt-0.5 block text-[11px] text-[var(--flowme-text-secondary)]">{getRowMeta(row).join(' · ')}</span> : null}
            <RowCompletionCriterion row={row} />
          </span>
          <RowEditButton row={row} onRowEdit={onRowEdit} />
        </li>
      ))}
    </ul>
  );
}

function SheetRows({ rows, remainder = false, rowTestId, onRowEdit }: ShapeRowProps) {
  return (
    <div data-testid="flow-artifact-sheet-preview" className="border-t border-[var(--flowme-border)]">
      <div className={`hidden bg-[var(--flowme-surface-subtle)] px-2 py-2 text-[10px] font-semibold text-[var(--flowme-text-tertiary)] sm:grid ${
        onRowEdit ? 'grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto]' : 'grid-cols-[2.5rem_minmax(0,1fr)_7rem]'
      }`}>
        <span>순서</span><span>항목</span><span>날짜</span>{onRowEdit ? <span className="sr-only">수정</span> : null}
      </div>
      <ol>
        {rows.map((row, index) => (
          <li
            key={row.id}
            data-testid={getRowTestId(remainder, rowTestId)}
            data-item-id={row.id}
            data-flow-row-mode="preview"
            data-completion-control="false"
            data-p35-r9-marker="P35-R9-SHARED-EXECUTION-ROW"
            data-p35-r9-preview-marker="P35-R9-PREVIEW-NOT-COMPLETION"
            className={`grid min-w-0 items-center gap-2 border-t border-[var(--flowme-border)] px-2 py-2.5 first:border-t-0 ${
              onRowEdit
                ? 'grid-cols-[2rem_minmax(0,1fr)_auto] sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem_auto]'
                : 'grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem]'
            }`}
          >
            <span data-flow-row-slot="marker" className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">{index + 1}</span>
            <span className="min-w-0" data-flow-row-slot="content">
              <span data-flow-row-slot="title" className="block break-words text-sm font-semibold text-[var(--flowme-text)]">{row.title}</span>
              {row.memo ? <span data-flow-row-slot="meta" className="mt-0.5 line-clamp-1 block text-[11px] text-[var(--flowme-text-secondary)]">{row.memo}</span> : null}
              <RowCompletionCriterion row={row} />
              <span data-flow-row-slot="meta" className="mt-0.5 block text-[11px] text-[var(--flowme-text-secondary)] sm:hidden">{row.schedule.date ? getDateLabel(row) : '날짜 없음'}</span>
            </span>
            <span className="hidden text-xs text-[var(--flowme-text-secondary)] sm:block">{row.schedule.date ? getDateLabel(row) : '날짜 없음'}</span>
            <RowEditButton row={row} onRowEdit={onRowEdit} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function MemoRows({ rows, remainder = false, rowTestId, onRowEdit }: ShapeRowProps) {
  return (
    <div data-testid="flow-artifact-memo-preview" className="border-t border-[var(--flowme-border)] px-2 py-1">
      {rows.map((row) => (
        <section
          key={row.id}
          data-testid={getRowTestId(remainder, rowTestId)}
          data-item-id={row.id}
          data-flow-row-mode="preview"
          data-completion-control="false"
          data-p35-r9-marker="P35-R9-SHARED-EXECUTION-ROW"
          data-p35-r9-preview-marker="P35-R9-PREVIEW-NOT-COMPLETION"
          className="border-b border-[var(--flowme-border)] px-1 py-3 last:border-b-0"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 data-flow-row-slot="title" className="break-words text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</h3>
            <span className="flex shrink-0 items-center gap-1">
              {row.role === 'resource' || row.role === 'reference' ? <span className="text-[10px] font-semibold text-[var(--flowme-action)]">자료</span> : null}
              {row.role === 'warning' ? <span className="text-[10px] font-semibold text-[var(--flowme-danger-strong)]">주의</span> : null}
              <RowEditButton row={row} onRowEdit={onRowEdit} />
            </span>
          </div>
          {row.memo || row.description ? (
            <p data-flow-row-slot="meta" className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--flowme-text-secondary)]">{row.memo || row.description}</p>
          ) : null}
          <RowCompletionCriterion row={row} />
          {getRowMeta(row).length > 0 ? <p className="mt-1 text-[11px] text-[var(--flowme-text-tertiary)]">{getRowMeta(row).join(' · ')}</p> : null}
        </section>
      ))}
    </div>
  );
}

function normalizeSyntaxValue(value?: string): string {
  return value?.replace(/\s+/gu, ' ').trim() ?? '';
}

function buildFallbackPublicTextSyntaxModel(
  title: string,
  rows: FlowExperienceProjectionRow[],
): PublicFlowTextSyntaxModel {
  const groups = rows.reduce<PublicFlowTextSyntaxGroup[]>((result, row) => {
    const section = normalizeSyntaxValue(row.section) || '기본';
    const repeatRule = normalizeSyntaxValue(row.schedule.repeatRule) || undefined;
    const current = result.at(-1);
    const syntaxRow = {
      id: row.id,
      sourceItemId: row.sourceItemId,
      title: row.title,
      scheduleMode: 'unscheduled' as const,
      ...(row.description ? { description: row.description } : {}),
      ...(row.completionCriterion ? { done: row.completionCriterion } : {}),
      ...(row.caution ? { caution: row.caution } : {}),
      resources: row.resources.map((resource) => ({ ...resource })),
    };
    if (current && current.section === section && current.repeatRule === repeatRule) {
      current.rows.push(syntaxRow);
      return result;
    }
    result.push({ section, ...(repeatRule ? { repeatRule } : {}), rows: [syntaxRow] });
    return result;
  }, []);
  return { title, warnings: [], groups };
}

function formatFixedDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return value;
  return `${Number(match[1])}년 ${Number(match[2])}월 ${Number(match[3])}일`;
}

function PublicTextSyntax({
  title,
  rows,
  model,
  rowTestId,
  onRowEdit,
}: {
  title: string;
  rows: FlowExperienceProjectionRow[];
  model?: PublicFlowTextSyntaxModel;
  rowTestId?: string;
  onRowEdit?: ShapeRowProps['onRowEdit'];
}) {
  const syntax = model ?? buildFallbackPublicTextSyntaxModel(title, rows);
  const effectiveRowById = new Map(rows.map((row) => [row.id, row]));
  if (syntax.groups.length === 0) {
    return (
      <p data-testid="flow-artifact-empty" className="border-t border-[var(--flowme-border)] px-3 py-5 text-sm leading-6 text-[var(--flowme-text-secondary)]">
        {EMPTY_MESSAGE.memo}
      </p>
    );
  }
  return (
    <div
      data-testid="flow-artifact-text-syntax-preview"
      role="region"
      aria-label="Flow 문법 전체"
      className="border-t border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-3 py-4 font-mono text-xs leading-6 text-[var(--flowme-text)]"
    >
      <p className="mb-4 whitespace-pre-wrap break-words font-semibold text-[var(--flowme-text)]">
        # {normalizeSyntaxValue(syntax.title)}
      </p>
      {syntax.warnings.length > 0 ? (
        <div className="mb-4 text-[var(--flowme-danger-strong)]">
          {syntax.warnings.map((warning, warningIndex) => (
            <p key={`${warning}:${warningIndex}`} className="whitespace-pre-wrap break-words">
              ! {normalizeSyntaxValue(warning)}
            </p>
          ))}
        </div>
      ) : null}
      {syntax.groups.map((group, groupIndex) => (
        <div
          key={`${group.section}:${group.repeatRule ?? ''}:${groupIndex}`}
          className={groupIndex > 0 ? 'mt-5' : undefined}
        >
          <p className="whitespace-pre-wrap break-words font-semibold text-[var(--flowme-action-strong)]">
            ## {group.section}
          </p>
          {group.repeatRule ? (
            <p className="whitespace-pre-wrap break-words text-[var(--flowme-text-secondary)]">
              @{group.repeatRule}
            </p>
          ) : null}
          {group.rows.map((row) => {
            const title = normalizeSyntaxValue(row.title);
            const why = normalizeSyntaxValue(row.why);
            const how = normalizeSyntaxValue(row.how);
            const done = normalizeSyntaxValue(row.done);
            const caution = normalizeSyntaxValue(row.caution);
            const description = normalizeSyntaxValue(row.description);
            const personalDetail = normalizeSyntaxValue(row.personalDetail);
            const effectiveRow = effectiveRowById.get(row.id);
            return (
              <div
                key={row.id}
                data-testid={getRowTestId(false, rowTestId)}
                data-item-id={row.id}
                data-flow-row-mode="preview"
                data-completion-control="false"
                className="mt-1 flex min-w-0 items-start justify-between gap-2"
              >
                <div className="min-w-0 flex-1 whitespace-pre-wrap break-words">
                  <p>- {title}{row.timing ? ` ${row.timing}` : ''}</p>
                  {why ? <p className="text-[var(--flowme-text-secondary)]">{'  '}why: {why}</p> : null}
                  {how ? <p className="text-[var(--flowme-text-secondary)]">{'  '}how: {how}</p> : null}
                  {done ? <p className="text-[var(--flowme-text-secondary)]">{'  '}done: {done}</p> : null}
                  {caution ? <p className="text-[var(--flowme-danger-strong)]">{'  '}caution: {caution}</p> : null}
                  {row.resources.map((resource, resourceIndex) => (
                    <p key={`${row.id}:${resource.label}:${resource.url}:${resourceIndex}`} className="text-[var(--flowme-text-secondary)]">
                      {'  '}link: {normalizeSyntaxValue(resource.label)} | {normalizeSyntaxValue(resource.url)} | {normalizeSyntaxValue(resource.type)}
                    </p>
                  ))}
                  {row.scheduleMode === 'fixed_override' && row.fixedDate ? (
                    <p data-text-schedule-mode="fixed_override" className="mt-1 font-sans text-[11px] text-[var(--flowme-text-tertiary)]">
                      고정 날짜 · {formatFixedDate(row.fixedDate)}{row.durationDays && row.durationDays > 1
                        ? ` · ${row.durationDays}일간`
                        : ''}
                    </p>
                  ) : row.scheduleMode === 'explicit_undated' ? (
                    <p data-text-schedule-mode="explicit_undated" className="mt-1 font-sans text-[11px] text-[var(--flowme-text-tertiary)]">
                      날짜 없음 · 사용자가 날짜를 비웠어요
                    </p>
                  ) : null}
                  {description ? (
                    <p data-text-context="source-description" className="mt-1 font-sans text-[11px] text-[var(--flowme-text-tertiary)]">
                      설명 · {description}
                    </p>
                  ) : null}
                  {personalDetail ? (
                    <p data-text-context="personal-detail" className="mt-1 font-sans text-[11px] text-[var(--flowme-text-secondary)]">
                      내 메모 · {personalDetail}
                    </p>
                  ) : null}
                </div>
                {effectiveRow ? <RowEditButton row={effectiveRow} onRowEdit={onRowEdit} /> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function renderShapeRows(
  shape: FlowExperienceShape,
  rows: FlowExperienceProjectionRow[],
  remainder = false,
  rowTestId?: string,
  onRowEdit?: ShapeRowProps['onRowEdit'],
) {
  if (shape === 'calendar') return <CalendarRows rows={rows} remainder={remainder} rowTestId={rowTestId} onRowEdit={onRowEdit} />;
  if (shape === 'checklist') return <ChecklistRows rows={rows} remainder={remainder} rowTestId={rowTestId} onRowEdit={onRowEdit} />;
  if (shape === 'sheet') return <SheetRows rows={rows} remainder={remainder} rowTestId={rowTestId} onRowEdit={onRowEdit} />;
  if (shape === 'memo') return <MemoRows rows={rows} remainder={remainder} rowTestId={rowTestId} onRowEdit={onRowEdit} />;
  return <FlowExecutionRows rows={rows} remainder={remainder} rowTestId={rowTestId} onRowEdit={onRowEdit} />;
}

function ShapeRows({
  shape,
  rows,
  previewRowLimit,
  rowTestId,
  expandTestId,
  onRowEdit,
  emptyAction,
}: {
  shape: FlowExperienceShape;
  rows: FlowExperienceProjectionRow[];
  previewRowLimit: number;
  rowTestId?: string;
  expandTestId?: string;
  onRowEdit?: ShapeRowProps['onRowEdit'];
  emptyAction?: ReactNode;
}) {
  if (rows.length === 0) {
    if (emptyAction) {
      return (
        <div className="border-t border-[var(--flowme-border)] px-3 py-5">
          <p data-testid="flow-artifact-empty" className="text-sm leading-6 text-[var(--flowme-text-secondary)]">
            {EMPTY_MESSAGE[shape]}
          </p>
          <div data-testid="flow-artifact-empty-action" className="mt-3">
            {emptyAction}
          </div>
        </div>
      );
    }
    return (
      <p data-testid="flow-artifact-empty" className="border-t border-[var(--flowme-border)] px-3 py-5 text-sm leading-6 text-[var(--flowme-text-secondary)]">
        {EMPTY_MESSAGE[shape]}
      </p>
    );
  }

  const visibleRows = rows.slice(0, previewRowLimit);
  const remainingRows = rows.slice(previewRowLimit);
  return (
    <>
      {renderShapeRows(shape, visibleRows, false, rowTestId, onRowEdit)}
      {remainingRows.length > 0 ? (
        <details className="border-t border-[var(--flowme-border)]">
          <summary
            data-testid={expandTestId}
            className="flex min-h-[var(--flowme-control-height)] cursor-pointer list-none items-center justify-between gap-3 px-2 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]"
          >
            <span>나머지 {remainingRows.length}개 보기</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          {renderShapeRows(shape, remainingRows, true, rowTestId, onRowEdit)}
        </details>
      ) : null}
    </>
  );
}

export function getFlowArtifactResultSummary(rows: FlowExperienceProjectionRow[]): string {
  const dates = Array.from(new Set(rows.flatMap((row) => row.schedule.date ? [row.schedule.date] : []))).sort();
  const undatedCount = rows.filter((row) => !row.schedule.date).length;
  const hasRecurrence = rows.some((row) => row.schedule.state === 'recurring');
  const dateLabel = dates.length === 0
    ? '날짜 없음'
    : dates.length === 1
      ? formatKoreanShortDate(dates[0], { includeWeekday: true })
      : `${formatKoreanShortDate(dates[0])} - ${formatKoreanShortDate(dates[dates.length - 1])}`;
  const parts = [
    dateLabel,
    dates.length > 0 && undatedCount > 0 ? `날짜 없음 ${undatedCount}개` : '',
    hasRecurrence ? '반복 일정' : '',
  ].filter(Boolean);
  return parts.join(' · ');
}

export function FlowArtifactDataPreview({
  projection,
  selectedShape: controlledSelectedShape,
  onSelectedShapeChange,
  showShapeChoices = true,
  showRecommendationReason = true,
  previewRowLimit = 6,
  testId = 'flow-artifact-data-preview',
  rowTestId,
  expandTestId,
  resultSummary,
  onRowEdit,
  onRowOpen,
  anchorDate,
  publicApprovedMode = false,
  textSyntaxModel,
  calendarPreamble,
  emptyAction,
}: {
  projection: FlowExperienceProjection;
  selectedShape?: FlowExperienceShape;
  onSelectedShapeChange?: (shape: FlowExperienceShape) => void;
  showShapeChoices?: boolean;
  showRecommendationReason?: boolean;
  previewRowLimit?: number;
  testId?: string;
  rowTestId?: string;
  expandTestId?: string;
  resultSummary?: string;
  onRowEdit?: (row: FlowExperienceProjectionRow, returnFocusSelector: string) => void;
  onRowOpen?: (row: FlowExperienceProjectionRow, returnFocusSelector: string) => void;
  anchorDate?: string;
  /** Restricts a public result preview to the approved Text/Todo/Calendar views. */
  publicApprovedMode?: boolean;
  textSyntaxModel?: PublicFlowTextSyntaxModel;
  calendarPreamble?: ReactNode;
  emptyAction?: ReactNode;
}) {
  const recommendation = buildArtifactRecommendationVM(projection);
  const availableShapes = publicApprovedMode
    ? [...APPROVED_PUBLIC_SHAPES]
    : recommendation.visible.map((candidate) => candidate.shape);
  const initialShape = publicApprovedMode
    ? availableShapes[0] ?? 'memo'
    : recommendation.primary?.shape ?? projection.primaryShape;
  const [internalSelectedShape, setInternalSelectedShape] = useState<FlowExperienceShape>(initialShape);
  const selectedShape = controlledSelectedShape && availableShapes.includes(controlledSelectedShape)
    ? controlledSelectedShape
    : publicApprovedMode && !availableShapes.includes(internalSelectedShape)
      ? initialShape
      : internalSelectedShape;

  useEffect(() => {
    setInternalSelectedShape(initialShape);
  }, [initialShape, projection.flowId]);

  useEffect(() => {
    if (!availableShapes.includes(selectedShape)) {
      setInternalSelectedShape(initialShape);
      onSelectedShapeChange?.(initialShape);
    }
  }, [availableShapes, initialShape, onSelectedShapeChange, selectedShape]);

  const selected = projection.shapes[selectedShape];
  const selectedRecommendation = recommendation.visible.find((candidate) => candidate.shape === selectedShape);
  const groupedTodoViewModel = buildDateGroupedTodoListViewModel({
    anchorDate,
    items: selected.rows.map((row, sourceOrder) => ({
      id: row.id,
      title: row.title,
      date: row.schedule.date,
      completed: false,
      sourceOrder,
      meta: [
        row.memo || row.description ? '메모' : '',
        row.completionCriterion ? '완료 기준' : '',
      ].filter(Boolean),
      data: row,
    })),
  });

  return (
    <section
      data-testid={testId}
      data-primary-shape={projection.primaryShape}
      data-selected-shape={selectedShape}
      data-public-format-mode={publicApprovedMode ? 'approved' : 'default'}
      data-p29-marker="P29-ARTIFACT-RECOMMENDATION"
      data-p35-marker="P35-PUBLIC-RESULT-FIRST"
      data-flow-anatomy="artifact-result"
      className="min-w-0 border-y border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
      aria-labelledby="flow-artifact-data-preview-title"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 px-2 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">먼저 확인할 결과</p>
          <h2 id="flow-artifact-data-preview-title" className="mt-0.5 text-sm font-semibold text-[var(--flowme-text)]">
            {(publicApprovedMode ? getApprovedPublicShapeLabel(selectedShape) : undefined) ?? selected.label} · {selected.count}개
          </h2>
          <p
            data-testid="flow-artifact-result-summary"
            className="mt-1 text-[11px] font-medium text-[var(--flowme-text-secondary)]"
          >
            {resultSummary ?? getFlowArtifactResultSummary(selected.rows)}
          </p>
          {showRecommendationReason && selectedRecommendation ? (
            <p data-testid="flow-artifact-recommendation-reason" className="mt-1 text-[11px] font-medium text-[var(--flowme-text-secondary)]">
              {selectedRecommendation.reason} · {selectedRecommendation.lossSummary}
            </p>
          ) : null}
        </div>
        {showShapeChoices && availableShapes.length > 1 ? (
          <div
            role="group"
            aria-label="결과 형태"
            className={publicApprovedMode
              ? 'grid w-full grid-cols-3 gap-1'
              : 'flex max-w-full flex-wrap gap-1'}
          >
            {availableShapes.map((shape) => {
              const candidate = projection.shapes[shape];
              const candidateRecommendation = recommendation.visible.find((item) => item.shape === shape);
              const selectedCandidate = shape === selectedShape;
              return (
                <button
                  key={shape}
                  type="button"
                  aria-pressed={selectedCandidate}
                  data-testid="flow-artifact-shape-choice"
                  data-artifact-shape={shape}
                  data-recommendation-role={candidateRecommendation?.role}
                  data-recommendation-count={candidateRecommendation?.count}
                  className={`min-h-[var(--flowme-control-height)] rounded-[var(--flowme-radius-control)] border px-2.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
                    selectedCandidate
                      ? 'border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] text-[var(--flowme-action-strong)]'
                      : 'border-[var(--flowme-border)] bg-white text-[var(--flowme-text-secondary)] hover:border-[var(--flowme-action)]'
                  }`}
                  onClick={() => {
                    setInternalSelectedShape(shape);
                    onSelectedShapeChange?.(shape);
                  }}
                >
                  {publicApprovedMode
                    ? getApprovedPublicShapeLabel(shape)
                    : `${candidate.label} ${candidateRecommendation?.countLabel ?? candidate.count}`}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>
      {selectedShape === 'memo' && publicApprovedMode ? (
        <PublicTextSyntax
          title={projection.title}
          rows={selected.rows}
          model={textSyntaxModel}
          rowTestId={rowTestId}
          onRowEdit={onRowEdit}
        />
      ) : selectedShape === 'checklist' && publicApprovedMode ? (
        <DateGroupedTodoList
          mode="public"
          viewModel={groupedTodoViewModel}
          getItemHref={(row) => `#public-item-${encodeURIComponent(row.id)}`}
          onOpenItem={onRowOpen
            ? (row) => onRowOpen(
                row.data!,
                `[data-todo-detail-link="${CSS.escape(row.id)}"]`,
              )
            : undefined}
          testId={`${testId}-todo`}
          rowTestId={rowTestId}
          checkboxTestId={`${testId}-todo-checkbox`}
          detailLinkTestId={`${testId}-todo-detail-link`}
          className="border-t border-[var(--flowme-border)] px-2 py-3"
        />
      ) : (
        <>
          {publicApprovedMode && selectedShape === 'calendar' && calendarPreamble ? (
            <div
              data-testid="flow-artifact-calendar-preamble"
              className="border-t border-[var(--flowme-border)] px-3 py-4"
            >
              {calendarPreamble}
            </div>
          ) : null}
          <ShapeRows
            shape={selectedShape}
            rows={selected.rows}
            previewRowLimit={publicApprovedMode && selectedShape === 'calendar'
              ? selected.rows.length
              : previewRowLimit}
            rowTestId={rowTestId}
            expandTestId={expandTestId}
            onRowEdit={onRowEdit}
            emptyAction={emptyAction}
          />
        </>
      )}
    </section>
  );
}
