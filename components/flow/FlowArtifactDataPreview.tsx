'use client';

import { useEffect, useState } from 'react';

import { formatKoreanShortDate } from '@/lib/flow/date';
import { buildArtifactRecommendationVM } from '@/lib/flow/artifact-recommendation';
import type {
  FlowExperienceProjection,
  FlowExperienceProjectionRow,
  FlowExperienceShape,
} from '@/lib/flow/flow-experience-projection';

const EMPTY_MESSAGE: Record<FlowExperienceShape, string> = {
  flow_execution: '저장할 실행 항목이 없습니다.',
  calendar: '기준일이나 항목 날짜를 정하면 일정이 여기에 나타납니다.',
  checklist: '체크할 실행 항목이 없습니다.',
  sheet: '표로 옮길 항목이 없습니다.',
  memo: '메모로 가져갈 내용이 없습니다.',
};

function getDateLabel(row: FlowExperienceProjectionRow): string {
  if (!row.schedule.date) return '날짜 없음';
  return formatKoreanShortDate(row.schedule.date, { includeWeekday: true });
}

function getRowMeta(row: FlowExperienceProjectionRow): string[] {
  return [
    row.schedule.date ? getDateLabel(row) : '',
    row.section ?? '',
    row.role === 'resource' || row.role === 'reference' ? '자료' : '',
    row.role === 'warning' ? '주의' : '',
  ].filter(Boolean);
}

function FlowExecutionRows({ rows, remainder = false }: { rows: FlowExperienceProjectionRow[]; remainder?: boolean }) {
  return (
    <ol data-testid="flow-artifact-execution-preview">
      {rows.map((row, index) => (
        <li
          key={row.id}
          data-testid={remainder ? 'flow-artifact-preview-remainder-row' : 'flow-artifact-preview-row'}
          data-item-id={row.id}
          className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-2.5 border-t border-[var(--flowme-border)] px-2 py-3"
        >
          <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--flowme-action-soft)] text-[10px] font-bold text-[var(--flowme-action-strong)]">
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
            {getRowMeta(row).length > 0 ? (
              <span className="mt-1 block text-[11px] font-medium text-[var(--flowme-text-secondary)]">{getRowMeta(row).join(' · ')}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function CalendarRows({ rows, remainder = false }: { rows: FlowExperienceProjectionRow[]; remainder?: boolean }) {
  const dateGroups = Array.from(rows.reduce((groups, row) => {
    const date = row.schedule.date ?? '날짜 없음';
    groups.set(date, [...(groups.get(date) ?? []), row]);
    return groups;
  }, new Map<string, FlowExperienceProjectionRow[]>()));
  return (
    <div data-testid="flow-artifact-calendar-preview" className="border-t border-[var(--flowme-border)]">
      {dateGroups.map(([date, groupRows]) => (
        <section key={date} className="grid grid-cols-[4.25rem_minmax(0,1fr)] border-b border-[var(--flowme-border)] last:border-b-0">
          <div className="bg-[var(--flowme-surface-subtle)] px-2 py-3 text-center">
            <span className="block text-lg font-semibold text-[var(--flowme-text)]">{date === '날짜 없음' ? '-' : date.slice(8)}</span>
            <span className="mt-0.5 block text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">
              {date === '날짜 없음' ? date : formatKoreanShortDate(date, { includeWeekday: true }).replace(/^\d+월 \d+일\s*/u, '')}
            </span>
          </div>
          <ol className="min-w-0">
            {groupRows.map((row) => (
              <li
                key={row.id}
                data-testid={remainder ? 'flow-artifact-preview-remainder-row' : 'flow-artifact-preview-row'}
                data-item-id={row.id}
                className="border-b border-[var(--flowme-border)] px-3 py-2.5 last:border-b-0"
              >
                <span className="block break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
                {row.section ? <span className="mt-0.5 block text-[11px] text-[var(--flowme-text-secondary)]">{row.section}</span> : null}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function ChecklistRows({ rows, remainder = false }: { rows: FlowExperienceProjectionRow[]; remainder?: boolean }) {
  return (
    <ul data-testid="flow-artifact-checklist-preview">
      {rows.map((row) => (
        <li
          key={row.id}
          data-testid={remainder ? 'flow-artifact-preview-remainder-row' : 'flow-artifact-preview-row'}
          data-item-id={row.id}
          className="flex min-w-0 items-start gap-3 border-t border-[var(--flowme-border)] px-2 py-3"
        >
          <span aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 rounded-[4px] border-2 border-[var(--flowme-border-strong)] bg-white" />
          <span className="min-w-0 flex-1">
            <span className="block break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</span>
            {getRowMeta(row).length > 0 ? <span className="mt-0.5 block text-[11px] text-[var(--flowme-text-secondary)]">{getRowMeta(row).join(' · ')}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SheetRows({ rows, remainder = false }: { rows: FlowExperienceProjectionRow[]; remainder?: boolean }) {
  return (
    <div data-testid="flow-artifact-sheet-preview" className="border-t border-[var(--flowme-border)]">
      <div className="hidden grid-cols-[2.5rem_minmax(0,1fr)_7rem] bg-[var(--flowme-surface-subtle)] px-2 py-2 text-[10px] font-semibold text-[var(--flowme-text-tertiary)] sm:grid">
        <span>순서</span><span>항목</span><span>날짜</span>
      </div>
      <ol>
        {rows.map((row, index) => (
          <li
            key={row.id}
            data-testid={remainder ? 'flow-artifact-preview-remainder-row' : 'flow-artifact-preview-row'}
            data-item-id={row.id}
            className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)] gap-2 border-t border-[var(--flowme-border)] px-2 py-2.5 first:border-t-0 sm:grid-cols-[2.5rem_minmax(0,1fr)_7rem]"
          >
            <span className="text-xs font-semibold text-[var(--flowme-text-tertiary)]">{index + 1}</span>
            <span className="min-w-0">
              <span className="block break-keep text-sm font-semibold text-[var(--flowme-text)]">{row.title}</span>
              {row.memo ? <span className="mt-0.5 line-clamp-1 block text-[11px] text-[var(--flowme-text-secondary)]">{row.memo}</span> : null}
              <span className="mt-0.5 block text-[11px] text-[var(--flowme-text-secondary)] sm:hidden">{row.schedule.date ? getDateLabel(row) : '날짜 없음'}</span>
            </span>
            <span className="hidden text-xs text-[var(--flowme-text-secondary)] sm:block">{row.schedule.date ? getDateLabel(row) : '날짜 없음'}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function MemoRows({ rows, remainder = false }: { rows: FlowExperienceProjectionRow[]; remainder?: boolean }) {
  return (
    <div data-testid="flow-artifact-memo-preview" className="border-t border-[var(--flowme-border)] px-2 py-1">
      {rows.map((row) => (
        <section
          key={row.id}
          data-testid={remainder ? 'flow-artifact-preview-remainder-row' : 'flow-artifact-preview-row'}
          data-item-id={row.id}
          className="border-b border-[var(--flowme-border)] px-1 py-3 last:border-b-0"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="break-keep text-sm font-semibold leading-5 text-[var(--flowme-text)]">{row.title}</h3>
            {row.role === 'resource' || row.role === 'reference' ? <span className="shrink-0 text-[10px] font-semibold text-[var(--flowme-action)]">자료</span> : null}
            {row.role === 'warning' ? <span className="shrink-0 text-[10px] font-semibold text-[var(--flowme-danger-strong)]">주의</span> : null}
          </div>
          {row.memo || row.description ? (
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-[var(--flowme-text-secondary)]">{row.memo || row.description}</p>
          ) : null}
          {getRowMeta(row).length > 0 ? <p className="mt-1 text-[11px] text-[var(--flowme-text-tertiary)]">{getRowMeta(row).join(' · ')}</p> : null}
        </section>
      ))}
    </div>
  );
}

function renderShapeRows(shape: FlowExperienceShape, rows: FlowExperienceProjectionRow[], remainder = false) {
  if (shape === 'calendar') return <CalendarRows rows={rows} remainder={remainder} />;
  if (shape === 'checklist') return <ChecklistRows rows={rows} remainder={remainder} />;
  if (shape === 'sheet') return <SheetRows rows={rows} remainder={remainder} />;
  if (shape === 'memo') return <MemoRows rows={rows} remainder={remainder} />;
  return <FlowExecutionRows rows={rows} remainder={remainder} />;
}

function ShapeRows({ shape, rows }: { shape: FlowExperienceShape; rows: FlowExperienceProjectionRow[] }) {
  if (rows.length === 0) {
    return (
      <p data-testid="flow-artifact-empty" className="border-t border-[var(--flowme-border)] px-3 py-5 text-sm leading-6 text-[var(--flowme-text-secondary)]">
        {EMPTY_MESSAGE[shape]}
      </p>
    );
  }

  const visibleRows = rows.slice(0, 6);
  const remainingRows = rows.slice(6);
  return (
    <>
      {renderShapeRows(shape, visibleRows)}
      {remainingRows.length > 0 ? (
        <details className="border-t border-[var(--flowme-border)]">
          <summary className="flex min-h-[var(--flowme-control-height)] cursor-pointer list-none items-center justify-between gap-3 px-2 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]">
            <span>나머지 {remainingRows.length}개 보기</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          {renderShapeRows(shape, remainingRows, true)}
        </details>
      ) : null}
    </>
  );
}

export function FlowArtifactDataPreview({ projection }: { projection: FlowExperienceProjection }) {
  const recommendation = buildArtifactRecommendationVM(projection);
  const availableShapes = recommendation.visible.map((candidate) => candidate.shape);
  const initialShape = recommendation.primary?.shape ?? projection.primaryShape;
  const [selectedShape, setSelectedShape] = useState<FlowExperienceShape>(initialShape);

  useEffect(() => {
    setSelectedShape(initialShape);
  }, [initialShape, projection.flowId]);

  useEffect(() => {
    if (!availableShapes.includes(selectedShape)) setSelectedShape(initialShape);
  }, [availableShapes, initialShape, selectedShape]);

  const selected = projection.shapes[selectedShape];
  const selectedRecommendation = recommendation.visible.find((candidate) => candidate.shape === selectedShape);

  return (
    <section
      data-testid="flow-artifact-data-preview"
      data-primary-shape={projection.primaryShape}
      data-selected-shape={selectedShape}
      data-p29-marker="P29-ARTIFACT-RECOMMENDATION"
      data-flow-anatomy="artifact-result"
      className="min-w-0 border-y border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
      aria-labelledby="flow-artifact-data-preview-title"
    >
      <header className="flex flex-wrap items-end justify-between gap-3 px-2 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">먼저 확인할 결과</p>
          <h2 id="flow-artifact-data-preview-title" className="mt-0.5 text-sm font-semibold text-[var(--flowme-text)]">
            {selected.label} · {selected.count}개
          </h2>
          {selectedRecommendation ? (
            <p data-testid="flow-artifact-recommendation-reason" className="mt-1 text-[11px] font-medium text-[var(--flowme-text-secondary)]">
              {selectedRecommendation.reason} · {selectedRecommendation.lossSummary}
            </p>
          ) : null}
        </div>
        {availableShapes.length > 1 ? (
          <div role="group" aria-label="결과 형태" className="flex max-w-full flex-wrap gap-1">
            {availableShapes.map((shape) => {
              const candidate = projection.shapes[shape];
              const candidateRecommendation = recommendation.visible.find((item) => item.shape === shape);
              const selectedCandidate = shape === selectedShape;
              return (
                <button
                  key={shape}
                  type="button"
                  aria-pressed={selectedCandidate}
                  data-recommendation-role={candidateRecommendation?.role}
                  data-recommendation-count={candidateRecommendation?.count}
                  className={`min-h-[var(--flowme-control-height)] rounded-[var(--flowme-radius-control)] border px-2.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
                    selectedCandidate
                      ? 'border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] text-[var(--flowme-action-strong)]'
                      : 'border-[var(--flowme-border)] bg-white text-[var(--flowme-text-secondary)] hover:border-[var(--flowme-action)]'
                  }`}
                  onClick={() => setSelectedShape(shape)}
                >
                  {candidate.label} {candidateRecommendation?.countLabel ?? candidate.count}
                </button>
              );
            })}
          </div>
        ) : null}
      </header>
      <ShapeRows shape={selectedShape} rows={selected.rows} />
    </section>
  );
}
