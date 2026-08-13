"use client";

import { useState } from "react";

import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
  FLOW_UI_TERTIARY_ACTION_CLASS,
} from "@/components/flow/flow-ui";

import type { AuthoringDraftView } from "./authoring-ui-types";

export type AuthoringLibraryFilter =
  "all" | "draft" | "needs_review" | "previewed" | "archived";

const FILTER_OPTIONS: Array<{
  value: AuthoringLibraryFilter;
  label: string;
}> = [
  { value: "all", label: "전체" },
  { value: "draft", label: "작성 중" },
  { value: "needs_review", label: "확인 필요" },
  { value: "previewed", label: "결과 확인" },
  { value: "archived", label: "보관 포함" },
];

const OWNERSHIP_LABEL = {
  creator: "제작자 초안",
  personal: "개인 초안",
  suggestion: "수정 제안",
} as const;

const ARTIFACT_LABEL: Record<string, string> = {
  calendar: "캘린더",
  todo: "할 일",
  checklist: "할 일",
  sheet: "표·Excel",
  memo: "TXT",
};

export type DraftLibraryProps = {
  drafts: AuthoringDraftView[];
  query: string;
  filter: AuthoringLibraryFilter;
  onQueryChange: (query: string) => void;
  onFilterChange: (filter: AuthoringLibraryFilter) => void;
  onCreate: () => void;
  onOpen: (draftId: string) => void;
  onRename?: (draftId: string, title: string) => boolean | void;
  onDuplicate: (draftId: string) => void;
  onArchive: (draftId: string) => boolean | void;
  onRestore: (draftId: string) => boolean | void;
  onHistory: (draftId: string) => void;
  productMode?: boolean;
};

export function DraftLibrary(props: DraftLibraryProps) {
  if (props.productMode) {
    return <ProductDraftLibrary {...props} />;
  }

  return <ReviewDraftLibrary {...props} />;
}

function ReviewDraftLibrary({
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
}: DraftLibraryProps) {
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
        <button
          type="button"
          className={FLOW_UI_PRIMARY_ACTION_CLASS}
          onClick={onCreate}
        >
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
                  option.value === "archived"
                    ? "ta-authoring-show-archived"
                    : undefined
                }
                aria-pressed={active}
                data-selected={active}
                className={`min-h-11 min-w-0 rounded-[var(--flowme-radius-control)] px-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] sm:px-3 ${
                  active
                    ? "bg-[var(--flowme-text)] text-white"
                    : "bg-[var(--flowme-soft)] text-[var(--flowme-text-secondary)] hover:text-[var(--flowme-text)]"
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
                    <span className="break-words text-base font-semibold">
                      {draft.title}
                    </span>
                    <span className="rounded bg-[var(--flowme-positive-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--flowme-positive-strong)]">
                      {draft.status}
                    </span>
                    <span className="rounded bg-[var(--flowme-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--flowme-text-secondary)]">
                      {OWNERSHIP_LABEL[draft.ownership]}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-[var(--flowme-text-secondary)]">
                    {draft.source || "출처 이름 없음"}
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
            {query || filter !== "all"
              ? "조건에 맞는 Flow가 없습니다."
              : "아직 저장한 Flow가 없습니다."}
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

function ProductDraftLibrary({
  drafts,
  filter,
  onFilterChange,
  onCreate,
  onOpen,
  onRename,
  onDuplicate,
  onArchive,
  onRestore,
}: DraftLibraryProps) {
  const archivedView = filter === "archived";
  const visibleDrafts = drafts.filter((draft) =>
    archivedView ? draft.archived : !draft.archived,
  );
  const [renamingDraftId, setRenamingDraftId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [notice, setNotice] = useState<{
    message: string;
    archivedDraft?: Pick<AuthoringDraftView, "draftId" | "title">;
  } | null>(null);

  const beginRename = (draft: AuthoringDraftView) => {
    setRenamingDraftId(draft.draftId);
    setRenameValue(draft.title);
  };

  const finishRename = (draft: AuthoringDraftView) => {
    const title = renameValue.trim();
    if (!title || title === draft.title || !onRename) return;
    if (onRename(draft.draftId, title) === false) return;
    setRenamingDraftId(null);
    setRenameValue("");
    setNotice({ message: `이름을 변경했습니다: ${title}` });
  };

  const archiveDraft = (draft: AuthoringDraftView) => {
    if (onArchive(draft.draftId) === false) return;
    setRenamingDraftId(null);
    setNotice({
      message: `보관함으로 이동했습니다: ${draft.title}`,
      archivedDraft: { draftId: draft.draftId, title: draft.title },
    });
  };

  const undoArchive = () => {
    if (!notice?.archivedDraft) return;
    if (onRestore(notice.archivedDraft.draftId) === false) return;
    setNotice({
      message: `콘텐츠 목록으로 되돌렸습니다: ${notice.archivedDraft.title}`,
    });
  };

  return (
    <section
      data-testid="ta-authoring-library"
      aria-labelledby="text-authoring-library-heading"
      className="mx-auto min-h-[70dvh] w-full max-w-5xl px-4 pb-24 pt-7 sm:px-6"
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--flowme-border)] pb-5">
        <h1
          id="text-authoring-library-heading"
          className="text-2xl font-semibold tracking-[-0.03em]"
        >
          {archivedView ? "보관한 콘텐츠" : "콘텐츠"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="ta-authoring-archive-view"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={() => onFilterChange(archivedView ? "all" : "archived")}
          >
            {archivedView ? "콘텐츠 목록" : "보관한 콘텐츠"}
          </button>
          {!archivedView ? (
            <button
              type="button"
              className={FLOW_UI_PRIMARY_ACTION_CLASS}
              onClick={onCreate}
            >
              새 콘텐츠
            </button>
          ) : null}
        </div>
      </header>

      {notice ? (
        <div
          role="status"
          className="mt-4 flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-soft)] px-3 py-2 text-sm"
        >
          <span>{notice.message}</span>
          {notice.archivedDraft ? (
            <button
              type="button"
              className={FLOW_UI_TERTIARY_ACTION_CLASS}
              onClick={undoArchive}
            >
              되돌리기
            </button>
          ) : null}
        </div>
      ) : null}

      {visibleDrafts.length > 0 ? (
        <ol className="mt-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)]">
          {visibleDrafts.map((draft) => {
            const renaming = renamingDraftId === draft.draftId;
            const savedAtLabel = draft.lastSavedAtLabel;

            return (
              <li
                key={draft.draftId}
                data-testid="ta-authoring-library-row"
                data-draft-id={draft.draftId}
                className="border-b border-[var(--flowme-border)] p-4 last:border-b-0"
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="break-words text-base font-semibold">
                        {draft.title}
                      </h2>
                      <span className="rounded bg-[var(--flowme-soft)] px-2 py-1 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                        {draft.status}
                      </span>
                    </div>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--flowme-text-secondary)]">
                      <span>
                        {ARTIFACT_LABEL[draft.primaryArtifact] ??
                          draft.primaryArtifact}
                      </span>
                      <span
                        aria-label={`마지막으로 명시 저장한 시각 ${savedAtLabel}`}
                      >
                        저장 {savedAtLabel}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {draft.archived ? (
                      <button
                        type="button"
                        data-testid="ta-authoring-restore"
                        className={FLOW_UI_PRIMARY_ACTION_CLASS}
                        onClick={() => onRestore(draft.draftId)}
                      >
                        복구
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={FLOW_UI_PRIMARY_ACTION_CLASS}
                          onClick={() => onOpen(draft.draftId)}
                        >
                          열기
                        </button>
                        <details className="relative">
                          <summary
                            aria-label={`${draft.title} 더보기`}
                            className={`${FLOW_UI_SECONDARY_ACTION_CLASS} flex cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden`}
                          >
                            더보기
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 grid min-w-40 gap-1 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-2 shadow-lg">
                            {onRename ? (
                              <button
                                type="button"
                                className={FLOW_UI_TERTIARY_ACTION_CLASS}
                                onClick={(event) => {
                                  event.currentTarget
                                    .closest("details")
                                    ?.removeAttribute("open");
                                  beginRename(draft);
                                }}
                              >
                                이름 변경
                              </button>
                            ) : null}
                            <button
                              type="button"
                              data-testid="ta-authoring-duplicate"
                              className={FLOW_UI_TERTIARY_ACTION_CLASS}
                              onClick={(event) => {
                                event.currentTarget
                                  .closest("details")
                                  ?.removeAttribute("open");
                                onDuplicate(draft.draftId);
                              }}
                            >
                              복제
                            </button>
                            <button
                              type="button"
                              data-testid="ta-authoring-archive"
                              className={FLOW_UI_TERTIARY_ACTION_CLASS}
                              onClick={(event) => {
                                event.currentTarget
                                  .closest("details")
                                  ?.removeAttribute("open");
                                archiveDraft(draft);
                              }}
                            >
                              보관
                            </button>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                </div>

                {renaming ? (
                  <form
                    className="mt-4 flex flex-col gap-2 border-t border-[var(--flowme-border)] pt-4 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      finishRename(draft);
                    }}
                  >
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">콘텐츠 이름</span>
                      <input
                        autoFocus
                        type="text"
                        value={renameValue}
                        maxLength={120}
                        aria-label="콘텐츠 이름"
                        className="min-h-11 w-full rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] px-3 text-sm outline-none focus:border-[var(--flowme-action)] focus:ring-2 focus:ring-[var(--flowme-focus)]"
                        onChange={(event) => setRenameValue(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className={FLOW_UI_PRIMARY_ACTION_CLASS}
                      disabled={
                        !renameValue.trim() ||
                        renameValue.trim() === draft.title ||
                        !onRename
                      }
                    >
                      이름 저장
                    </button>
                    <button
                      type="button"
                      className={FLOW_UI_TERTIARY_ACTION_CLASS}
                      onClick={() => {
                        setRenamingDraftId(null);
                        setRenameValue("");
                      }}
                    >
                      취소
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <section className="mt-8 rounded-[var(--flowme-radius-surface)] border border-dashed border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] px-6 py-14 text-center">
          <h2 className="text-base font-semibold">
            {archivedView
              ? "보관한 콘텐츠가 없습니다."
              : "아직 저장한 콘텐츠가 없습니다."}
          </h2>
          {archivedView ? (
            <button
              type="button"
              className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-5`}
              onClick={() => onFilterChange("all")}
            >
              콘텐츠 목록
            </button>
          ) : null}
        </section>
      )}
    </section>
  );
}
