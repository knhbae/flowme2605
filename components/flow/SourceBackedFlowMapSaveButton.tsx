'use client';

import { useRef, useState } from 'react';
import { buildFlowMapActionContract } from '@/lib/flow/flow-map-action-contract';
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
import { setFlowItemPersonalExclusion } from '@/lib/flow/flow-item-state';
import type { RiskLevel } from '@/lib/flow/types';
import { FlowBottomSheet } from './FlowExecutionPrimitives';
import {
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from './flow-ui';

type SourceBackedFlowMapSaveButtonProps = {
  mapId: string;
  mapTitle: string;
  sourceUrl: string;
  sourceLabel: string;
  riskLevels: RiskLevel[];
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

export function SourceBackedFlowMapSaveButton({
  mapId,
  mapTitle,
  sourceUrl,
  sourceLabel,
  riskLevels,
  savedFlows,
  setupInput,
}: SourceBackedFlowMapSaveButtonProps) {
  const [anchor, setAnchor] = useState(setupInput?.defaultValue ?? '');
  const [showRequired, setShowRequired] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [customTitle, setCustomTitle] = useState(mapTitle);
  const [selectedStepIds, setSelectedStepIds] = useState(() => savedFlows.flatMap((flow) => flow.steps.map((step) => step.id)));
  const [titleDraft, setTitleDraft] = useState(mapTitle);
  const [selectedStepIdsDraft, setSelectedStepIdsDraft] = useState(() => savedFlows.flatMap((flow) => flow.steps.map((step) => step.id)));
  const [adjustmentReturnFocusSelector, setAdjustmentReturnFocusSelector] = useState<string | undefined>();
  const anchorInputRef = useRef<HTMLInputElement>(null);
  const needsAnchor = Boolean(setupInput);
  const allStepIds = savedFlows.flatMap((flow) => flow.steps.map((step) => step.id));
  const selectedStepIdSet = new Set(selectedStepIds);
  const selectedCount = selectedStepIds.length;
  const selectedStepIdDraftSet = new Set(selectedStepIdsDraft);
  const selectedDraftCount = selectedStepIdsDraft.length;
  const actionContract = buildFlowMapActionContract({
    mapId,
    title: customTitle,
    sourceUrl,
    sourceLabel,
    surface: 'public_preview',
    saveMode: 'save_all',
    executionState: 'executable',
    editable: true,
    exportable: false,
    selection: { selectedCount, totalCount: allStepIds.length },
    riskLevels,
  });
  const primaryAction = actionContract.actions.primary;
  const editAction = actionContract.actions.edit;
  const saveButtonLabel = primaryAction?.label ?? '전체 저장하고 시작';
  const mobileSaveButtonLabel = needsAnchor && !anchor
    ? `${setupInput?.label ?? '날짜'} 정하기`
    : saveButtonLabel;
  const setupInputHint = setupInput
    ? `${setupInput.label}에 맞춰 할 일 날짜가 정해집니다.`
    : '';

  const toggleDraftStep = (stepId: string) => {
    setSelectedStepIdsDraft((current) => current.includes(stepId)
      ? current.filter((id) => id !== stepId)
      : [...current, stepId]);
  };

  const openAdjustment = (returnFocusSelector: string) => {
    setTitleDraft(customTitle);
    setSelectedStepIdsDraft(selectedStepIds);
    setAdjustmentReturnFocusSelector(returnFocusSelector);
    setAdjusting(true);
  };

  const closeAdjustment = () => {
    setTitleDraft(customTitle);
    setSelectedStepIdsDraft(selectedStepIds);
    setAdjusting(false);
  };

  const applyAdjustment = () => {
    if (selectedDraftCount === 0) return;
    setCustomTitle(titleDraft.trim() || mapTitle);
    setSelectedStepIds(selectedStepIdsDraft);
    setAdjusting(false);
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
        const nextState = setFlowItemPersonalExclusion(
          nextItemStates[step.id],
          !selectedStepIdSet.has(step.id),
        );
        if (nextState) nextItemStates[step.id] = nextState;
        else delete nextItemStates[step.id];
      });
      saveItemStates(flow.slug, nextItemStates);
    });
    window.localStorage.setItem(getSourceBackedFlowMapSnapshotStorageKey(mapId), JSON.stringify(savedMapSnapshot));
    window.localStorage.setItem(getSourceBackedFlowMapPersistenceStorageKey(mapId), JSON.stringify(persistenceRecord));
    window.location.href = buildPostSaveHref({ kind: 'map', id: mapId });
  };

  return (
    <div
      className="grid w-full gap-3 sm:w-auto"
      data-testid="flow-map-action-controller"
      data-map-save-mode={actionContract.controller.saveMode}
      data-map-source-action={actionContract.identity.source.id}
    >
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
      {customTitle !== mapTitle || selectedCount !== allStepIds.length ? (
        <p data-testid="flow-map-applied-adjustment-summary" className="text-xs font-semibold text-slate-600">
          저장 결과 · {customTitle} · 할 일 {selectedCount}개
        </p>
      ) : null}
      {actionContract.risk.caution ? (
        <p
          data-testid="flow-map-risk-caution"
          data-adjacent-to-action={actionContract.risk.caution.adjacentToActionId}
          className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950"
        >
          {actionContract.risk.caution.text}
        </p>
      ) : null}
      <div className={`hidden gap-2 sm:grid ${editAction ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
        <button
          className="min-h-11 items-center justify-center rounded-lg bg-[#3654FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2945E8] disabled:bg-slate-300"
          data-testid="flow-map-save-all"
          data-map-action-intent={primaryAction?.intent}
          type="button"
          disabled={!primaryAction || primaryAction.disabled}
          onClick={saveMap}
        >
          {saveButtonLabel}
        </button>
        {editAction ? (
          <button
            className="min-h-11 rounded-lg border border-[#D9D6CF] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#3654FF]/40 hover:text-[#3654FF]"
            data-testid="flow-map-adjust-save"
            data-map-action-intent={editAction.intent}
            type="button"
            aria-expanded={adjusting}
            onClick={() => openAdjustment('[data-testid="flow-map-adjust-save"]')}
          >
            {editAction.label}
          </button>
        ) : null}
      </div>
      <div className="fixed inset-x-0 bottom-[calc(4.625rem+env(safe-area-inset-bottom))] z-30 border-y border-[#E7E4DD] bg-white/95 px-4 py-2 shadow-[0_-8px_20px_rgba(27,26,23,0.06)] backdrop-blur sm:hidden" data-testid="flow-map-mobile-sticky-save">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <p className="min-w-0 flex-1 px-1 text-[11px] font-semibold leading-4 text-slate-600">
            {needsAnchor && !anchor ? `${setupInput?.label} 필요` : `${selectedCount}개 할 일`}
          </p>
          {editAction ? (
            <button
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#D9D6CF] bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              data-testid="flow-map-adjust-save-mobile"
              data-map-action-intent={editAction.intent}
              type="button"
              aria-expanded={adjusting}
              onClick={() => openAdjustment('[data-testid="flow-map-adjust-save-mobile"]')}
            >
              조정
            </button>
          ) : null}
          <button className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-[#3654FF] px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300" data-testid="flow-map-save-all-mobile" data-map-action-intent={primaryAction?.intent} type="button" disabled={!primaryAction || primaryAction.disabled} onClick={saveMap}>
            {mobileSaveButtonLabel}
          </button>
        </div>
      </div>
      {adjusting && editAction ? (
        <FlowBottomSheet
          testId="flow-map-adjust-panel"
          headingId="flow-map-adjust-panel-title"
          eyebrow="내 결과 편집"
          title="Flow 편집"
          onClose={closeAdjustment}
          initialFocusSelector="[data-testid='flow-map-custom-title']"
          returnFocusSelector={adjustmentReturnFocusSelector}
          p35Marker="P35-MAP-ATOMIC-FULL-HEIGHT-EDITOR"
          dialogProps={{
            'data-editor-transaction': 'atomic',
            'data-map-action-intent': editAction.intent,
          }}
          className="inset-0 max-h-none rounded-none px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[min(34rem,96vw)] sm:max-h-none sm:rounded-none sm:px-6 sm:pb-6 sm:pt-5"
        >
          <div className="mt-4 grid gap-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-800">
              내 Flow 이름
              <input
                data-testid="flow-map-custom-title"
                className={FLOW_UI_INPUT_CLASS}
                maxLength={80}
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
              />
            </label>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-slate-800">저장할 할 일</legend>
              <p className="text-xs font-medium text-slate-600">현재 {selectedCount}개 · 조정 후 {selectedDraftCount}개</p>
              <div className="max-h-[58dvh] overflow-y-auto border-y border-slate-200 bg-white">
                {savedFlows.map((flow) => (
                  <div key={flow.slug} className="grid">
                    {savedFlows.length > 1 ? <p className="sticky top-0 z-10 bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600">{flow.title}</p> : null}
                    {flow.steps.map((step) => (
                      <label key={step.id} className="flex min-h-12 items-start gap-3 border-b border-slate-200 px-2 py-3 text-sm font-semibold text-slate-800 last:border-b-0">
                        <input
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#3654FF]"
                          type="checkbox"
                          checked={selectedStepIdDraftSet.has(step.id)}
                          onChange={() => toggleDraftStep(step.id)}
                        />
                        <span className="min-w-0 break-keep">{step.title}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </fieldset>
            {selectedDraftCount === 0 ? <p className="text-xs font-semibold text-red-700">저장할 할 일을 1개 이상 선택하세요.</p> : null}
          </div>
          <div className="sticky bottom-0 z-20 mt-5 flex justify-end gap-2 border-t border-slate-200 bg-white/95 py-3 backdrop-blur">
            <button
              type="button"
              data-testid="flow-map-adjust-cancel"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              onClick={closeAdjustment}
            >
              취소
            </button>
            <button
              type="button"
              data-testid="flow-map-adjust-apply"
              className={FLOW_UI_PRIMARY_ACTION_CLASS}
              disabled={selectedDraftCount === 0}
              onClick={applyAdjustment}
            >
              변경 적용
            </button>
          </div>
        </FlowBottomSheet>
      ) : null}
    </div>
  );
}
