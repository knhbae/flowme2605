'use client';

import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_TERTIARY_ACTION_CLASS,
} from '@/components/flow/flow-ui';

import type { AuthoringDraftView } from './authoring-ui-types';

export type AuthoringLibraryFilter =
  | 'all'
  | 'draft'
  | 'needs_review'
  | 'previewed'
  | 'archived';

const FILTER_OPTIONS: Array<{
  value: AuthoringLibraryFilter;
  label: string;
}> = [
  { value: 'all', label: '전체' },
  { value: 'draft', label: '작성 중' },
  { value: 'needs_review', label: '확인 필요' },
  { value: 'previewed', label: '결과 확인' },
  { value: 'archived', label: '보관 포함' },
];

const OWNERSHIP_LABEL = {
  creator: '제작자 초안',
  personal: '개인 초안',
  suggestion: '수정 제안',
} as const;

const ARTIFACT_LABEL: Record<string, string> = {
  calendar: '캘린더',
  todo: '체크/할 일',
  checklist: '체크/할 일',
  sheet: '표/엑셀',
  memo: '텍스트',
};

export function DraftLibrary({
  drafts,
  query,
  filter,
  onQueryChange,
  onFilterChange,
  onCreate,
  onOpen,
  onDuplicate,
  onArchive,
  onRestore,
  onHistory,
}: {
  drafts: AuthoringDraftView[];
  query: string;
  filter: AuthoringLibraryFilter;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: AuthoringLibraryFilter) => void;
  onCreate: () => void;
  onOpen: (draftId: string) => void;
  onDuplicate: (draftId: string) => void;
  onArchive: (draftId: string) => void;
  onRestore: (draftId: string) => void;
  onHistory: (draftId: string) => void;
}) {
  return (
    <section
      data-testid="ta-authoring-library"
      aria-labelledby="text-authoring-library-heading"
      className="mx-auto min-h-[70dvh] w-full max-w-5xl px-4 pb-24 pt-7 sm:px-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--flowme-border)] pb-5">
        <div>
          <h1
            id="text-authoring-library-heading"
            className="text-2xl font-semibold tracking-[-0.03em]"
          >
            저장한 Flow
          </h1>
        </div>
        <button type="button" className={FLOW_UI_PRIMARY_ACTION_CLASS} onClick={onCreate}>
          새 Flow 만들기
        </button>
      </header>

      <section className="mt-5 grid gap-3 border-b border-[var(--flowme-border)] pb-5 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="block">
          <span className="sr-only">제목 또는 출처 검색</span>
          <input
            type="search"
            data-testid="ta-authoring-search"
            className="min-h-11 w-full rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] px-3 text-sm outline-none focus:border-[var(--flowme-action)] focus:ring-2 focus:ring-[var(--flowme-focus)]"
            value={query}
            placeholder="제목 또는 출처 검색"
            onChange={(event) => onQueryChange(event.target.value)}
          />
        </label>
        <div
          data-testid="ta-authoring-filters"
          className="grid max-w-full grid-cols-2 gap-1 sm:flex sm:flex-wrap"
          role="group"
          aria-label="초안 상태"
        >
          {FILTER_OPTIONS.map((option) => {
            const active = option.value === filter;
            return (
              <button
                key={option.value}
                type="button"
                data-testid={
                  option.value === 'archived'
                    ? 'ta-authoring-show-archived'
                    : undefined
                }
                aria-pressed={active}
                data-selected={active}
                className={`min-h-11 min-w-0 rounded-[var(--flowme-radius-control)] px-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] sm:px-3 ${
                  active
                    ? 'bg-[var(--flowme-text)] text-white'
                    : 'bg-[var(--flowme-soft)] text-[var(--flowme-text-secondary)] hover:text-[var(--flowme-text)]'
                }`}
                onClick={() => onFilterChange(option.value)}
              >
                {active ? <span aria-hidden="true">✓ </span> : null}
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      {drafts.length > 0 ? (
        <ol className="mt-4 overflow-hidden rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)]">
          {drafts.map((draft) => (
            <li
              key={draft.draftId}
              data-testid="ta-authoring-library-row"
              data-draft-id={draft.draftId}
              className="border-b border-[var(--flowme-border)] p-4 last:border-b-0"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <button
                  type="button"
                  className="min-w-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                  onClick={() => onOpen(draft.draftId)}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="break-words text-base font-semibold">{draft.title}</span>
                    <span className="rounded bg-[var(--flowme-positive-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--flowme-positive-strong)]">
                      {draft.status}
                    </span>
                    <span className="rounded bg-[var(--flowme-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--flowme-text-secondary)]">
                      {OWNERSHIP_LABEL[draft.ownership]}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-[var(--flowme-text-secondary)]">
                    {draft.source || '출처 이름 없음'}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[var(--flowme-text-tertiary)]">
                    <span>
                      {draft.stepCount}단계 · {draft.itemCount}개 항목
                    </span>
                    <span>
                      {ARTIFACT_LABEL[draft.primaryArtifact] ??
                        draft.primaryArtifact}
                    </span>
                    <span>{draft.updatedAtLabel}</span>
                    {draft.issueCount > 0 ? (
                      <span className="font-semibold text-[var(--flowme-warning-strong)]">
                        확인 {draft.issueCount}개
                      </span>
                    ) : null}
                  </span>
                </button>

                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={FLOW_UI_SECONDARY_ACTION_CLASS}
                    onClick={() => onOpen(draft.draftId)}
                  >
                    이어서 작성
                  </button>
                  <button
                    type="button"
                    data-testid="ta-authoring-duplicate"
                    className={FLOW_UI_TERTIARY_ACTION_CLASS}
                    onClick={() => onDuplicate(draft.draftId)}
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    className={FLOW_UI_TERTIARY_ACTION_CLASS}
                    onClick={() => onHistory(draft.draftId)}
                  >
                    저장 기록
                  </button>
                  {draft.archived ? (
                    <button
                      type="button"
                      data-testid="ta-authoring-restore"
                      className={FLOW_UI_TERTIARY_ACTION_CLASS}
                      onClick={() => onRestore(draft.draftId)}
                    >
                      복원
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="ta-authoring-archive"
                      className={FLOW_UI_TERTIARY_ACTION_CLASS}
                      onClick={() => onArchive(draft.draftId)}
                    >
                      보관
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <section className="mt-8 rounded-[var(--flowme-radius-surface)] border border-dashed border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] px-6 py-14 text-center">
          <h2 className="text-base font-semibold">
            {query || filter !== 'all'
              ? '조건에 맞는 Flow가 없습니다.'
              : '아직 저장한 Flow가 없습니다.'}
          </h2>
          <button
            type="button"
            className={`${FLOW_UI_PRIMARY_ACTION_CLASS} mt-5`}
            onClick={onCreate}
          >
            새 Flow 만들기
          </button>
        </section>
      )}
    </section>
  );
}
