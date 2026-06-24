'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  SourceBackedFlowMapPublishPackage,
  SourceBackedStepDestination,
} from '@/lib/flow/source-backed-my-flow';

type CreatorDraftRow = {
  stepTitle: string;
  destination: SourceBackedStepDestination;
  sourceUrl: string;
  itemFallbackText: string;
  creatorNote: string;
};

type StoredCreatorDraft = {
  mapId: string;
  publishedVersion: string;
  draftVersion: string;
  savedAt: string;
  rows: Record<string, CreatorDraftRow>;
};

type StoredCreatorPublishedDraft = StoredCreatorDraft & {
  publishedAt: string;
  source: 'local_creator_publish';
};

type CreatorEditorProps = {
  publishPackage: SourceBackedFlowMapPublishPackage;
};

const destinationOptions: SourceBackedStepDestination[] = ['calendar', 'todo', 'checklist', 'sheet', 'memo', 'progress'];

const destinationLabel: Record<SourceBackedStepDestination, string> = {
  calendar: '캘린더',
  checklist: '체크',
  memo: '메모',
  progress: '진도',
  sheet: '시트',
  todo: '할 일',
};

const sourceTypeLabel: Record<string, string> = {
  creator_experience: '제작자 경험',
  official: '공식',
  reference: '참고 원문',
};

const riskLevelLabel: Record<string, string> = {
  financial_sensitive: '금융 민감',
  legal_sensitive: '법률 민감',
  low: '낮음',
  medical_sensitive: '건강 민감',
  medium: '주의',
};

const reviewStatusClass: Record<string, string> = {
  needs_items: 'bg-amber-50 text-amber-900 ring-amber-200',
  needs_source: 'bg-rose-50 text-rose-900 ring-rose-200',
  ready: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

function buildInitialDraftRows(rows: SourceBackedFlowMapPublishPackage['creator']['sourceRows']) {
  return Object.fromEntries(
    rows.map((row) => [
      row.stepId,
      {
        stepTitle: row.generatedStepTitle,
        destination: row.destination,
        sourceUrl: row.sourceUrl ?? '',
        itemFallbackText: row.itemFallbackText,
        creatorNote: '',
      } satisfies CreatorDraftRow,
    ]),
  );
}

function countFallbackItems(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length;
}

function getRowIssues(row: CreatorDraftRow) {
  return [
    !row.stepTitle.trim() ? 'Step 제목 필요' : undefined,
    !row.sourceUrl.trim() ? '원문 링크 필요' : undefined,
    countFallbackItems(row.itemFallbackText) === 0 ? 'Item fallback 필요' : undefined,
  ].filter((item): item is string => Boolean(item));
}

export function SourceBackedFlowMapCreatorEditor({ publishPackage }: CreatorEditorProps) {
  const { creator, map, myFlow } = publishPackage;
  const initialRows = useMemo(() => buildInitialDraftRows(creator.sourceRows), [creator.sourceRows]);
  const [draftRows, setDraftRows] = useState<Record<string, CreatorDraftRow>>(initialRows);
  const [selectedStepId, setSelectedStepId] = useState(creator.sourceRows[0]?.stepId ?? '');
  const [savedAt, setSavedAt] = useState<string | undefined>();
  const [publishedAt, setPublishedAt] = useState<string | undefined>();
  const editorRef = useRef<HTMLElement | null>(null);
  const localPublishStorageKey = `flow:map:published-local:${map.id}`;

  useEffect(() => {
    setDraftRows(initialRows);
    setSelectedStepId(creator.sourceRows[0]?.stepId ?? '');
    setSavedAt(undefined);
    setPublishedAt(undefined);

    const stored = window.localStorage.getItem(creator.draft.storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<StoredCreatorDraft>;
        if (parsed.mapId === map.id && parsed.publishedVersion === creator.draft.publishedVersion && parsed.rows) {
          setDraftRows({ ...initialRows, ...parsed.rows });
          setSavedAt(parsed.savedAt);
        }
      } catch {
        window.localStorage.removeItem(creator.draft.storageKey);
      }
    }

    const published = window.localStorage.getItem(localPublishStorageKey);
    if (published) {
      try {
        const parsed = JSON.parse(published) as Partial<StoredCreatorPublishedDraft>;
        if (parsed.mapId === map.id && parsed.publishedVersion === creator.draft.publishedVersion && parsed.publishedAt) {
          setPublishedAt(parsed.publishedAt);
        }
      } catch {
        window.localStorage.removeItem(localPublishStorageKey);
      }
    }
  }, [creator.draft.publishedVersion, creator.draft.storageKey, creator.sourceRows, initialRows, localPublishStorageKey, map.id]);

  const selectedSourceRow = creator.sourceRows.find((row) => row.stepId === selectedStepId) ?? creator.sourceRows[0];
  const selectedDraft = selectedSourceRow ? draftRows[selectedSourceRow.stepId] ?? initialRows[selectedSourceRow.stepId] : undefined;

  const readyToPublish = creator.publishBlockers.length === 0;
  const readyRowCount = creator.sourceRows.filter((row) => row.reviewStatus === 'ready').length;
  const sourceCheckCount = creator.sourceRows.filter((row) => row.reviewStatus === 'needs_source').length;
  const itemCheckCount = creator.sourceRows.filter((row) => row.reviewStatus === 'needs_items').length;
  const draftIssueRows = Object.values(draftRows).filter((row) => getRowIssues(row).length > 0).length;
  const changedRows = creator.sourceRows.filter((row) => {
    const draft = draftRows[row.stepId];
    if (!draft) return false;
    return (
      draft.stepTitle !== row.generatedStepTitle ||
      draft.destination !== row.destination ||
      draft.sourceUrl !== (row.sourceUrl ?? '') ||
      draft.itemFallbackText !== row.itemFallbackText ||
      draft.creatorNote.trim().length > 0
    );
  }).length;
  const canPublishDraft = readyToPublish && draftIssueRows === 0;

  const updateDraftRow = <Field extends keyof CreatorDraftRow>(
    stepId: string,
    field: Field,
    value: CreatorDraftRow[Field],
  ) => {
    setDraftRows((current) => ({
      ...current,
      [stepId]: {
        ...(current[stepId] ?? initialRows[stepId]),
        [field]: value,
      },
    }));
  };

  const selectSourceRow = (stepId: string) => {
    setSelectedStepId(stepId);
    if (window.innerWidth >= 1024) return;

    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  };

  const saveDraft = () => {
    const now = new Date().toISOString();
    const record: StoredCreatorDraft = {
      mapId: map.id,
      publishedVersion: creator.draft.publishedVersion,
      draftVersion: creator.draft.draftVersion,
      savedAt: now,
      rows: draftRows,
    };
    window.localStorage.setItem(creator.draft.storageKey, JSON.stringify(record));
    setSavedAt(now);
  };

  const resetDraft = () => {
    window.localStorage.removeItem(creator.draft.storageKey);
    setDraftRows(initialRows);
    setSavedAt(undefined);
  };

  const publishDraft = () => {
    if (!canPublishDraft) return;
    const now = new Date().toISOString();
    const record: StoredCreatorPublishedDraft = {
      mapId: map.id,
      publishedVersion: creator.draft.publishedVersion,
      draftVersion: creator.draft.draftVersion,
      savedAt: savedAt ?? now,
      publishedAt: now,
      source: 'local_creator_publish',
      rows: draftRows,
    };
    window.localStorage.setItem(localPublishStorageKey, JSON.stringify(record));
    setPublishedAt(now);
  };

  return (
    <main data-testid="flow-map-creator" className="mx-auto max-w-7xl px-4 py-5 pb-16 sm:px-5 sm:py-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-700">제작자 편집</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{map.title}</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              원문 행이 사용자에게 저장될 Step과 Item fallback으로 바뀐 결과를 확인하고, 공개 전에 초안을 고칩니다.
            </p>
          </div>
          <div className="grid gap-2 text-sm font-semibold sm:min-w-56">
            <span className="rounded-md bg-slate-100 px-3 py-2 text-slate-700">공개 버전 {creator.draft.publishedVersion}</span>
            <span className="rounded-md bg-blue-50 px-3 py-2 text-blue-800">초안 {changedRows}개 수정</span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
            data-testid="creator-save-draft"
            type="button"
            onClick={saveDraft}
          >
            초안 저장
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            data-testid="creator-reset-draft"
            type="button"
            onClick={resetDraft}
          >
            초안 초기화
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            data-testid="creator-publish-draft"
            type="button"
            disabled={!canPublishDraft}
            onClick={publishDraft}
          >
            새 공개 버전으로 표시
          </button>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800" href={creator.publicPreviewHref}>
            공개 화면 보기
          </Link>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800" href={myFlow.demoHref}>
            저장 후 화면 보기
          </Link>
        </div>
        {savedAt ? <p className="mt-3 text-sm font-semibold text-emerald-700">초안 저장됨: {new Date(savedAt).toLocaleString('ko-KR')}</p> : null}
        {publishedAt ? <p className="mt-2 text-sm font-semibold text-emerald-800">로컬 발행 표시됨: {new Date(publishedAt).toLocaleString('ko-KR')}</p> : null}
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)_300px]">
        <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-500">원문 행</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">Step으로 바뀐 항목</h2>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{creator.sourceRows.length}개</span>
          </div>
          <div className="mt-4 grid gap-2">
            {creator.sourceRows.map((row) => {
              const draft = draftRows[row.stepId] ?? initialRows[row.stepId];
              const issues = getRowIssues(draft);
              const selected = row.stepId === selectedSourceRow?.stepId;
              return (
                <button
                  key={row.stepId}
                  className={`rounded-lg border p-3 text-left transition ${
                    selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                  data-testid="flow-map-source-row"
                  type="button"
                  onClick={() => selectSourceRow(row.stepId)}
                >
                  <span className="text-xs font-semibold text-slate-500">{[row.flowTitle, row.sectionTitle].filter(Boolean).join(' / ')}</span>
                  <span className="mt-1 block text-sm font-semibold text-slate-950">{row.sourceRowTitle}</span>
                  <span className="mt-2 flex flex-wrap gap-1 text-[11px] font-semibold">
                    <span className={`rounded px-1.5 py-0.5 ring-1 ${reviewStatusClass[row.reviewStatus]}`}>{row.reviewLabel}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">{destinationLabel[draft.destination]}</span>
                    {issues.length ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">수정 필요</span> : null}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1 text-[11px] font-semibold text-slate-600">
                    {row.sourceType ? <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200">{sourceTypeLabel[row.sourceType] ?? row.sourceType}</span> : null}
                    {row.riskLevel ? <span className="rounded bg-white px-1.5 py-0.5 ring-1 ring-slate-200">{riskLevelLabel[row.riskLevel] ?? row.riskLevel}</span> : null}
                  </span>
                  {row.detailItems.length > 0 ? (
                    <span className="mt-2 block text-xs leading-5 text-slate-600">
                      {row.detailItems.slice(0, 3).join(' / ')}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        {selectedSourceRow && selectedDraft ? (
          <section
            ref={editorRef}
            className="scroll-mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            data-testid="creator-row-editor"
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">원문에서 가져온 행</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950">{selectedSourceRow.sourceRowTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedSourceRow.sourceRowDescription}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">{selectedSourceRow.scheduleSummary}</span>
                  {selectedSourceRow.sourceType ? (
                    <span className="rounded-md bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                      {sourceTypeLabel[selectedSourceRow.sourceType] ?? selectedSourceRow.sourceType}
                    </span>
                  ) : null}
                  {selectedSourceRow.riskLevel ? (
                    <span className="rounded-md bg-white px-2 py-1 text-slate-700 ring-1 ring-slate-200">
                      {riskLevelLabel[selectedSourceRow.riskLevel] ?? selectedSourceRow.riskLevel}
                    </span>
                  ) : null}
                </div>
                {selectedSourceRow.sourceUrl ? (
                  <a className="mt-4 inline-flex text-sm font-semibold text-blue-700 underline underline-offset-2" href={selectedSourceRow.sourceUrl} target="_blank" rel="noreferrer">
                    원문 근거 열기
                  </a>
                ) : null}
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-sm font-semibold text-blue-700">사용자에게 저장될 Step</p>
                <label className="mt-3 grid gap-1 text-sm font-semibold text-slate-800">
                  Step 제목
                  <input
                    className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={selectedDraft.stepTitle}
                    onChange={(event) => updateDraftRow(selectedSourceRow.stepId, 'stepTitle', event.target.value)}
                  />
                </label>
                <label className="mt-3 grid gap-1 text-sm font-semibold text-slate-800">
                  저장 위치
                  <select
                    className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={selectedDraft.destination}
                    onChange={(event) =>
                      updateDraftRow(selectedSourceRow.stepId, 'destination', event.target.value as SourceBackedStepDestination)
                    }
                  >
                    {destinationOptions.map((destination) => (
                      <option key={destination} value={destination}>
                        {destinationLabel[destination]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 grid gap-1 text-sm font-semibold text-slate-800">
                  원문 링크
                  <input
                    className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={selectedDraft.sourceUrl}
                    onChange={(event) => updateDraftRow(selectedSourceRow.stepId, 'sourceUrl', event.target.value)}
                  />
                </label>
                <label className="mt-3 grid gap-1 text-sm font-semibold text-slate-800">
                  Item fallback
                  <textarea
                    className="min-h-36 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={selectedDraft.itemFallbackText}
                    onChange={(event) => updateDraftRow(selectedSourceRow.stepId, 'itemFallbackText', event.target.value)}
                  />
                </label>
                <label className="mt-3 grid gap-1 text-sm font-semibold text-slate-800">
                  제작자 메모
                  <textarea
                    className="min-h-20 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    data-testid="creator-draft-note"
                    placeholder="사용자 화면에는 바로 노출하지 않는 내부 메모"
                    value={selectedDraft.creatorNote}
                    onChange={(event) => updateDraftRow(selectedSourceRow.stepId, 'creatorNote', event.target.value)}
                  />
                </label>
              </div>
            </div>
          </section>
        ) : null}

        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">공개 전 확인</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm font-semibold">
              <div className="rounded-lg bg-emerald-50 px-2 py-3 text-emerald-800">
                <span className="block text-xl">{readyRowCount}</span>
                준비
              </div>
              <div className="rounded-lg bg-rose-50 px-2 py-3 text-rose-900">
                <span className="block text-xl">{sourceCheckCount}</span>
                원문
              </div>
              <div className="rounded-lg bg-amber-50 px-2 py-3 text-amber-900">
                <span className="block text-xl">{itemCheckCount}</span>
                Item
              </div>
            </div>
            {readyToPublish ? (
              <p className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">현재 공개 화면으로 보낼 수 있습니다.</p>
            ) : (
              <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                {creator.publishBlockers.join(' / ')}
              </div>
            )}
            {draftIssueRows ? (
              <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">초안에서 {draftIssueRows}개 행을 더 확인해야 합니다.</p>
            ) : null}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">저장 후 사용자 화면</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{myFlow.groupedAs}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              사용자는 이 편집 내용을 보지 않고, 저장된 Step과 Item만 내 Flow에서 실행합니다.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
