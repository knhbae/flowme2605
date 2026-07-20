'use client';

import { useRef, useState } from 'react';
import {
  buildSourceBackedFlowMapReviewedVersion,
  buildSourceBackedFlowMapPersistenceRecord,
  buildSourceBackedFlowMapSavedSnapshot,
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
  type SourceBackedFlowMapPersonalCopy,
} from '@/lib/flow/source-backed-my-flow';
import { getItemStates, saveFlowRecord, saveItemStates, type SavedFlowArtifactMode } from '@/lib/flow/storage';
import { buildPostSaveHref } from '@/lib/flow/post-save-receipt';

type SourceBackedFlowMapSaveButtonProps = {
  mapId: string;
  mapTitle: string;
  savedFlows: {
    slug: string;
    title: string;
    artifactMode: SavedFlowArtifactMode;
    steps: {
      id: string;
      title: string;
    }[];
  }[];
  setupInput?: {
    label: string;
    hint: string;
    defaultValue?: string;
  };
};

export function SourceBackedFlowMapSaveButton({ mapId, mapTitle, savedFlows, setupInput }: SourceBackedFlowMapSaveButtonProps) {
  const [anchor, setAnchor] = useState(setupInput?.defaultValue ?? '');
  const [showRequired, setShowRequired] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [customTitle, setCustomTitle] = useState(mapTitle);
  const [selectedStepIds, setSelectedStepIds] = useState(() => savedFlows.flatMap((flow) => flow.steps.map((step) => step.id)));
  const anchorInputRef = useRef<HTMLInputElement>(null);
  const needsAnchor = Boolean(setupInput);
  const allStepIds = savedFlows.flatMap((flow) => flow.steps.map((step) => step.id));
  const selectedStepIdSet = new Set(selectedStepIds);
  const selectedCount = selectedStepIds.length;
  const saveButtonLabel = adjusting ? `선택한 ${selectedCount}개 저장` : '그대로 저장';
  const mobileSaveButtonLabel = needsAnchor && !anchor
    ? `${setupInput?.label ?? '날짜'} 입력`
    : saveButtonLabel;
  const setupInputHint = setupInput
    ? `${setupInput.label}에 맞춰 할 일 날짜가 정해집니다.`
    : '';

  const toggleStep = (stepId: string) => {
    setSelectedStepIds((current) => current.includes(stepId)
      ? current.filter((id) => id !== stepId)
      : [...current, stepId]);
  };

  const saveMap = () => {
    if (needsAnchor && !anchor) {
      setShowRequired(true);
      anchorInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => anchorInputRef.current?.focus(), 120);
      return;
    }
    if (selectedCount === 0) return;

    const savedAt = new Date().toISOString();
    const baseSnapshot = buildSourceBackedFlowMapSavedSnapshot(mapId, {
      savedAt,
      ...(needsAnchor ? { anchor } : {}),
    });
    const basePersistenceRecord = buildSourceBackedFlowMapPersistenceRecord(mapId, {
      savedAt,
      ...(needsAnchor ? { anchor } : {}),
    });
    if (!baseSnapshot || !basePersistenceRecord) return;

    const normalizedTitle = customTitle.trim() || mapTitle;
    const personalized = normalizedTitle !== mapTitle || selectedCount !== allStepIds.length;
    const includedStepIdsByFlow = Object.fromEntries(
      savedFlows.flatMap((flow) => {
        const included = flow.steps.filter((step) => selectedStepIdSet.has(step.id)).map((step) => step.id);
        return included.length > 0 ? [[flow.slug, included] as const] : [];
      }),
    );
    const excludedStepIdsByFlow = Object.fromEntries(
      savedFlows.flatMap((flow) => {
        const excluded = flow.steps.filter((step) => !selectedStepIdSet.has(step.id)).map((step) => step.id);
        return excluded.length > 0 ? [[flow.slug, excluded] as const] : [];
      }),
    );
    const personalCopy: SourceBackedFlowMapPersonalCopy = {
      source: 'url_first_custom_start',
      originalTitle: mapTitle,
      includedStepIdsByFlow,
      excludedStepIdsByFlow,
    };
    const adjusted = personalized
      ? buildSourceBackedFlowMapReviewedVersion(
          { ...baseSnapshot, title: normalizedTitle },
          personalCopy,
          { savedAt, ...(needsAnchor ? { anchor } : {}) },
        )
      : undefined;
    const savedMapSnapshot = adjusted?.snapshot ?? baseSnapshot;
    const persistenceRecord = adjusted?.persistenceRecord ?? basePersistenceRecord;
    const includedFlowSlugs = new Set(savedMapSnapshot.flowSlugs);

    savedFlows.filter((flow) => includedFlowSlugs.has(flow.slug)).forEach((flow) => {
      saveFlowRecord(flow.slug, {
        selectedArtifactMode: flow.artifactMode,
        ...(needsAnchor ? { anchor } : {}),
      });
      const nextItemStates = { ...getItemStates(flow.slug) };
      flow.steps.forEach((step) => {
        if (selectedStepIdSet.has(step.id)) {
          if (nextItemStates[step.id]?.note === 'excluded_on_start') delete nextItemStates[step.id];
          return;
        }
        nextItemStates[step.id] = {
          ...nextItemStates[step.id],
          skipped: true,
          note: 'excluded_on_start',
        };
      });
      saveItemStates(flow.slug, nextItemStates);
    });
    window.localStorage.setItem(getSourceBackedFlowMapSnapshotStorageKey(mapId), JSON.stringify(savedMapSnapshot));
    window.localStorage.setItem(getSourceBackedFlowMapPersistenceStorageKey(mapId), JSON.stringify(persistenceRecord));
    window.location.href = buildPostSaveHref({ kind: 'map', id: mapId });
  };

  return (
    <div className="grid w-full gap-3 sm:w-auto">
      {setupInput ? (
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          {setupInput.label}
          <input
            aria-label={setupInput.label}
            className={`min-h-11 rounded-lg border bg-[#FAFAF8] px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:bg-white focus:ring-2 ${showRequired ? 'border-red-500 ring-2 ring-red-100 focus:border-red-500 focus:ring-red-100' : 'border-[#E7E4DD] focus:border-[#3654FF] focus:ring-[#3654FF]/10'}`}
            data-testid="flow-map-anchor-input"
            ref={anchorInputRef}
            type="date"
            value={anchor}
            onChange={(event) => {
              setAnchor(event.target.value);
              setShowRequired(false);
            }}
          />
          <span className="text-xs font-medium leading-5 text-slate-500">{setupInputHint}</span>
          {showRequired ? <span className="text-xs font-semibold text-red-700">저장하려면 날짜를 입력해 주세요.</span> : null}
        </label>
      ) : null}
      {adjusting ? (
        <section data-testid="flow-map-adjust-panel" className="grid gap-3 border-y border-[#DDE3FF] bg-[#F7F8FF] px-3 py-3">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            내 Flow 이름
            <input
              data-testid="flow-map-custom-title"
              className="min-h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none focus:border-[#3654FF] focus:ring-2 focus:ring-[#3654FF]/10"
              maxLength={80}
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
            />
          </label>
          <fieldset className="grid gap-2">
            <legend className="text-xs font-semibold text-slate-600">저장할 할 일</legend>
            {savedFlows.map((flow) => (
              <div key={flow.slug} className="grid gap-1.5">
                {savedFlows.length > 1 ? <p className="text-xs font-semibold text-slate-500">{flow.title}</p> : null}
                {flow.steps.map((step) => (
                  <label key={step.id} className="flex min-h-10 items-start gap-2 rounded-md bg-white px-2.5 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                    <input
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#3654FF]"
                      type="checkbox"
                      checked={selectedStepIdSet.has(step.id)}
                      onChange={() => toggleStep(step.id)}
                    />
                    <span className="min-w-0 break-keep">{step.title}</span>
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
          {selectedCount === 0 ? <p className="text-xs font-semibold text-red-700">저장할 할 일을 1개 이상 선택하세요.</p> : null}
          <button
            type="button"
            className="min-h-10 justify-self-start text-sm font-semibold text-slate-600 underline underline-offset-4"
            onClick={() => {
              setAdjusting(false);
              setCustomTitle(mapTitle);
              setSelectedStepIds(allStepIds);
            }}
          >
            조정 취소
          </button>
        </section>
      ) : null}
      <div className="hidden gap-2 sm:grid sm:grid-cols-2">
        <button
          className="min-h-11 items-center justify-center rounded-lg bg-[#3654FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2945E8] disabled:bg-slate-300"
          data-testid="flow-map-save-all"
          type="button"
          disabled={selectedCount === 0}
          onClick={saveMap}
        >
          {saveButtonLabel}
        </button>
        <button
          className="min-h-11 rounded-lg border border-[#D9D6CF] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#3654FF]/40 hover:text-[#3654FF]"
          data-testid="flow-map-adjust-save"
          type="button"
          aria-expanded={adjusting}
          onClick={() => setAdjusting((open) => !open)}
        >
          {adjusting ? '조정 접기' : '조정하고 저장'}
        </button>
      </div>
      <div className="fixed inset-x-0 bottom-[calc(4.625rem+env(safe-area-inset-bottom))] z-30 border-y border-[#E7E4DD] bg-white/95 px-4 py-2 shadow-[0_-8px_20px_rgba(27,26,23,0.06)] backdrop-blur sm:hidden" data-testid="flow-map-mobile-sticky-save">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <p className="min-w-0 flex-1 px-1 text-[11px] font-semibold leading-4 text-slate-600">
            {needsAnchor && !anchor ? `${setupInput?.label} 필요` : `${selectedCount}개 할 일`}
          </p>
          <button
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#D9D6CF] bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            data-testid="flow-map-adjust-save-mobile"
            type="button"
            aria-expanded={adjusting}
            onClick={() => setAdjusting((open) => !open)}
          >
            조정
          </button>
          <button className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[#3654FF] px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300" data-testid="flow-map-save-all-mobile" type="button" disabled={selectedCount === 0} onClick={saveMap}>
            {mobileSaveButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
