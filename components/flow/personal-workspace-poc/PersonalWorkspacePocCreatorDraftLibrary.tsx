'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';

export type PersonalWorkspacePocCreatorDraftLibraryItem = Readonly<{
  draftId: string;
  title: string;
  sourceLabel: string;
  itemCount: number;
  unresolvedIssueCount: number;
  status: 'active' | 'archived';
  revision: number;
  updatedAt: string;
}>;

type PersonalWorkspacePocCreatorDraftLibraryProps = Readonly<{
  drafts: readonly PersonalWorkspacePocCreatorDraftLibraryItem[];
  currentDraftId?: string;
  busy?: boolean;
  undoLabel?: string;
  onOpen: (draftId: string) => void;
  onRename: (draftId: string, title: string) => void;
  onDuplicate: (draftId: string) => string | void;
  onArchive: (draftId: string) => void;
  onRestore: (draftId: string) => void;
  onUndo: () => void;
  onNewDraft: () => void;
}>;

type DraftFilter = 'active' | 'archived';

function normalizedSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/\s+/gu, ' ').trim();
}

export function filterPersonalWorkspacePocCreatorDraftLibraryItems(
  drafts: readonly PersonalWorkspacePocCreatorDraftLibraryItem[],
  filter: DraftFilter,
  query: string,
): PersonalWorkspacePocCreatorDraftLibraryItem[] {
  const normalizedQuery = normalizedSearch(query);
  return drafts
    .filter((draft) => draft.status === filter)
    .filter((draft) => {
      if (!normalizedQuery) return true;
      return normalizedSearch(`${draft.title} ${draft.sourceLabel}`).includes(normalizedQuery);
    })
    .sort((left, right) => (
      right.updatedAt.localeCompare(left.updatedAt)
      || left.draftId.localeCompare(right.draftId)
    ));
}

function updatedLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

const ACTION_CLASS = 'min-h-12 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none hover:border-teal-700 focus-visible:ring-2 focus-visible:ring-teal-700 disabled:cursor-not-allowed disabled:opacity-50';

export function PersonalWorkspacePocCreatorDraftLibrary({
  drafts,
  currentDraftId,
  busy = false,
  undoLabel,
  onOpen,
  onRename,
  onDuplicate,
  onArchive,
  onRestore,
  onUndo,
  onNewDraft,
}: PersonalWorkspacePocCreatorDraftLibraryProps) {
  const [filter, setFilter] = useState<DraftFilter>('active');
  const [query, setQuery] = useState('');
  const [openActionsDraftId, setOpenActionsDraftId] = useState<string>();
  const [renamingDraftId, setRenamingDraftId] = useState<string>();
  const [renameValue, setRenameValue] = useState('');
  const actionOpeners = useRef(new Map<string, HTMLButtonElement>());
  const rowOpeners = useRef(new Map<string, HTMLButtonElement>());
  const renameInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const counts = useMemo(() => ({
    active: drafts.filter((draft) => draft.status === 'active').length,
    archived: drafts.filter((draft) => draft.status === 'archived').length,
  }), [drafts]);
  const normalizedQuery = normalizedSearch(query);
  const visibleDrafts = useMemo(
    () => filterPersonalWorkspacePocCreatorDraftLibraryItems(drafts, filter, query),
    [drafts, filter, query],
  );

  useEffect(() => {
    if (!renamingDraftId) return;
    renameInputRef.current?.focus({ preventScroll: true });
    renameInputRef.current?.select();
  }, [renamingDraftId]);

  useEffect(() => {
    if (!openActionsDraftId || renamingDraftId) return;
    const draftId = openActionsDraftId;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpenActionsDraftId(undefined);
      window.requestAnimationFrame(() => {
        actionOpeners.current.get(draftId)?.focus({ preventScroll: true });
      });
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [openActionsDraftId, renamingDraftId]);

  const returnToActions = (draftId: string) => {
    window.requestAnimationFrame(() => {
      actionOpeners.current.get(draftId)?.focus({ preventScroll: true });
    });
  };

  const closeActions = (draftId: string) => {
    setOpenActionsDraftId(undefined);
    setRenamingDraftId(undefined);
    setRenameValue('');
    returnToActions(draftId);
  };

  const beginRename = (draft: PersonalWorkspacePocCreatorDraftLibraryItem) => {
    setRenameValue(draft.title);
    setRenamingDraftId(draft.draftId);
  };

  const submitRename = (event: FormEvent<HTMLFormElement>, draft: PersonalWorkspacePocCreatorDraftLibraryItem) => {
    event.preventDefault();
    const nextTitle = renameValue.replace(/\s+/gu, ' ').trim();
    if (!nextTitle || nextTitle === draft.title) {
      closeActions(draft.draftId);
      return;
    }
    onRename(draft.draftId, nextTitle);
    closeActions(draft.draftId);
  };

  const actThenFocus = (draftId: string, action: () => string | void) => {
    const requestedFocusId = action() ?? draftId;
    setOpenActionsDraftId(undefined);
    setRenamingDraftId(undefined);
    window.requestAnimationFrame(() => {
      rowOpeners.current.get(requestedFocusId)?.focus({ preventScroll: true });
      if (!rowOpeners.current.get(requestedFocusId)) headingRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <section
      data-testid="creator-draft-library"
      aria-labelledby="creator-draft-library-heading"
      className="min-w-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-bold tracking-[0.12em] text-teal-800">이 기기에만 저장</p>
          <h2
            ref={headingRef}
            id="creator-draft-library-heading"
            tabIndex={-1}
            className="mt-1 text-xl font-semibold tracking-[-0.02em] outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
          >
            제작자 초안
          </h2>
          <p className="mt-2 break-keep text-sm leading-6 text-slate-600">
            개인공간이나 공개 화면에는 추가되지 않습니다.
          </p>
        </div>
        <button
          type="button"
          data-testid="creator-draft-new"
          className={ACTION_CLASS}
          disabled={busy}
          onClick={onNewDraft}
        >
          새 초안
        </button>
      </div>

      {undoLabel ? (
        <div className="mt-3 flex min-h-12 flex-wrap items-center justify-between gap-2 border-l-2 border-teal-600 bg-teal-50 px-3 py-2 text-sm text-teal-950" role="status">
          <span>{undoLabel}</span>
          <button type="button" data-testid="creator-draft-undo" className={ACTION_CLASS} disabled={busy} onClick={onUndo}>되돌리기</button>
        </div>
      ) : null}

      <label htmlFor="creator-draft-search" className="mt-5 block text-sm font-semibold text-slate-900">초안 검색</label>
      <input
        id="creator-draft-search"
        data-testid="creator-draft-search"
        type="search"
        value={query}
        className="mt-2 min-h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
        placeholder="제목 또는 출처 검색"
        onChange={(event) => setQuery(event.target.value)}
      />

      <div className="mt-4 grid grid-cols-2 border-b border-slate-200" role="group" aria-label="초안 상태">
        {(['active', 'archived'] as const).map((nextFilter) => (
          <button
            key={nextFilter}
            type="button"
            data-testid={`creator-draft-filter-${nextFilter}`}
            aria-pressed={filter === nextFilter}
            className={`min-h-12 border-b-2 px-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${filter === nextFilter ? 'border-teal-700 text-teal-900' : 'border-transparent text-slate-500'}`}
            onClick={() => {
              setFilter(nextFilter);
              setOpenActionsDraftId(undefined);
              setRenamingDraftId(undefined);
            }}
          >
            {nextFilter === 'active' ? `작성 중 ${counts.active}` : `보관함 ${counts.archived}`}
          </button>
        ))}
      </div>

      {visibleDrafts.length === 0 ? (
        <div data-testid="creator-draft-empty" className="py-12 text-center">
          <p className="text-sm font-semibold text-slate-700">
            {normalizedQuery
              ? `“${query.trim()}”에 맞는 초안이 없습니다.`
              : filter === 'active'
                ? '이 기기에 보관한 초안이 없습니다.'
                : '보관한 초안이 없습니다.'}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {normalizedQuery ? '검색어를 바꾸거나 다른 상태를 확인하세요.' : '새 Flow 원문을 작성한 뒤 제작 초안으로 보관할 수 있습니다.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200" data-testid="creator-draft-list">
          {visibleDrafts.map((draft) => {
            const actionsOpen = openActionsDraftId === draft.draftId;
            const renaming = renamingDraftId === draft.draftId;
            const controlsId = `creator-draft-actions-${draft.draftId}`;
            return (
              <li
                key={draft.draftId}
                data-testid="creator-draft-row"
                data-creator-draft-id={draft.draftId}
                className="py-4"
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="break-words text-base font-semibold text-slate-950">{draft.title}</h3>
                      {draft.draftId === currentDraftId ? <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-900">열려 있음</span> : null}
                    </div>
                    <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                      {draft.itemCount}개 항목 · r{draft.revision} · {updatedLabel(draft.updatedAt)}
                      {draft.unresolvedIssueCount > 0 ? ` · 확인 ${draft.unresolvedIssueCount}개` : ''}
                    </p>
                    {draft.sourceLabel ? <p className="mt-1 truncate text-xs text-slate-500">{draft.sourceLabel}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {draft.status === 'active' ? (
                      <button
                        ref={(node) => {
                          if (node) rowOpeners.current.set(draft.draftId, node);
                          else rowOpeners.current.delete(draft.draftId);
                        }}
                        type="button"
                        data-testid="creator-draft-open"
                        className={ACTION_CLASS}
                        disabled={busy}
                        onClick={() => onOpen(draft.draftId)}
                      >
                        이어서 작성
                      </button>
                    ) : null}
                    <button
                      ref={(node) => {
                        if (node) actionOpeners.current.set(draft.draftId, node);
                        else actionOpeners.current.delete(draft.draftId);
                      }}
                      type="button"
                      data-testid="creator-draft-menu"
                      aria-label={`${draft.title} 초안 작업 열기`}
                      aria-expanded={actionsOpen}
                      aria-controls={controlsId}
                      className={`${ACTION_CLASS} min-w-12 px-2`}
                      disabled={busy}
                      onClick={() => {
                        if (actionsOpen) closeActions(draft.draftId);
                        else {
                          setOpenActionsDraftId(draft.draftId);
                          setRenamingDraftId(undefined);
                        }
                      }}
                    >
                      <span aria-hidden="true">…</span>
                    </button>
                  </div>
                </div>

                {actionsOpen ? (
                  <div id={controlsId} data-testid="creator-draft-actions" className="mt-3 border-l-2 border-slate-300 bg-slate-50 p-3">
                    {renaming ? (
                      <form className="grid gap-2" onSubmit={(event) => submitRename(event, draft)}>
                        <label htmlFor={`creator-draft-rename-${draft.draftId}`} className="text-xs font-semibold text-slate-700">목록에 보일 이름</label>
                        <input
                          ref={renameInputRef}
                          id={`creator-draft-rename-${draft.draftId}`}
                          data-testid="creator-draft-rename-input"
                          value={renameValue}
                          className="min-h-12 rounded-md border border-slate-300 bg-white px-3 text-base outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20"
                          onChange={(event) => setRenameValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Escape') return;
                            event.preventDefault();
                            closeActions(draft.draftId);
                          }}
                        />
                        <p className="text-xs leading-5 text-slate-500">원문 제목은 바뀌지 않습니다.</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="submit" data-testid="creator-draft-rename-save" className={ACTION_CLASS} disabled={busy || !renameValue.trim()}>이름 저장</button>
                          <button type="button" data-testid="creator-draft-rename-cancel" className={ACTION_CLASS} disabled={busy} onClick={() => closeActions(draft.draftId)}>취소</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" data-testid="creator-draft-rename" className={ACTION_CLASS} disabled={busy} onClick={() => beginRename(draft)}>이름 바꾸기</button>
                        <button type="button" data-testid="creator-draft-clone" className={ACTION_CLASS} disabled={busy} onClick={() => actThenFocus(draft.draftId, () => onDuplicate(draft.draftId))}>복제</button>
                        {draft.status === 'active' ? (
                          <button type="button" data-testid="creator-draft-archive" className={ACTION_CLASS} disabled={busy} onClick={() => actThenFocus(draft.draftId, () => onArchive(draft.draftId))}>보관</button>
                        ) : (
                          <button type="button" data-testid="creator-draft-restore" className={ACTION_CLASS} disabled={busy} onClick={() => actThenFocus(draft.draftId, () => onRestore(draft.draftId))}>복원</button>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
