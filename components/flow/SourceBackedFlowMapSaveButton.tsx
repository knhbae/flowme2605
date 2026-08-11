'use client';

import { useEffect, useRef, useState } from 'react';

import {
  buildEffectiveFlowMapPersistenceSelection,
  buildFlowMapActionContractFromSnapshot,
  buildFlowMapCanonicalItemId,
  reviseEffectiveFlowMapSnapshot,
  type EffectiveFlowMapSnapshot,
} from '@/lib/flow/effective-flow-map-snapshot';
import {
  buildSourceBackedFlowMapReviewedVersion,
  buildSourceBackedFlowMapPersistenceRecord,
  buildSourceBackedFlowMapSavedSnapshot,
} from '@/lib/flow/source-backed-my-flow';
import {
  buildFlowMapSaveStorageKeyPlan,
  runFlowMapSaveTransaction,
  type FlowMapSaveStorage,
} from '@/lib/flow/flow-map-save-transaction';
import { getQ3UserCopyProfile } from '@/lib/flow/q3-user-copy';
import {
  buildSavedFlowRecord,
  normalizeSavedFlowRecord,
  type SavedFlowArtifactMode,
} from '@/lib/flow/storage';
import type { FlowItemState } from '@/lib/flow/types';
import { buildPostSaveHref } from '@/lib/flow/post-save-receipt';
import { setFlowItemPersonalExclusion } from '@/lib/flow/flow-item-state';
import { recordCanonicalFlowWrite } from '@/lib/flow/canonical-flow-storage';
import {
  getFlowMapSaveWriteLockName,
  withStorageWriteLock,
} from '@/lib/flow/storage-write-lock';
import { FlowBottomSheet } from './FlowExecutionPrimitives';
import {
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from './flow-ui';

export type SourceBackedFlowMapSavedFlow = {
  slug: string;
  title: string;
  artifactMode: SavedFlowArtifactMode;
  steps: {
    id: string;
    title: string;
  }[];
};

type SourceBackedFlowMapSaveButtonProps = {
  effectiveSnapshot: EffectiveFlowMapSnapshot;
  defaultTitle: string;
  anchor: string;
  onAnchorChange: (anchor: string) => void;
  selectedArtifactMode?: Extract<SavedFlowArtifactMode, 'memo' | 'checklist' | 'calendar'>;
  selectedResultReady?: boolean;
  selectedResultMessage?: string;
  q3CopyEnabled?: boolean;
  visualSubtractionEnabled?: boolean;
  onEffectiveSnapshotChange: (snapshot: EffectiveFlowMapSnapshot) => void;
  savedFlows: SourceBackedFlowMapSavedFlow[];
  setupInput?: {
    label: string;
    hint: string;
    defaultValue?: string;
  };
};

type SaveFailure = {
  kind: 'conflict' | 'storage';
  rollbackComplete: boolean;
};

type FlowMapSaveBaselineState = 'loading' | 'ready' | 'failed';

function getStoredPersistenceItemIds(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const childFlows = (value as { childFlows?: unknown }).childFlows;
  if (!Array.isArray(childFlows)) return [];
  return childFlows.flatMap((child) => {
    if (!child || typeof child !== 'object') return [];
    const flow = child as { slug?: unknown; steps?: unknown };
    if (typeof flow.slug !== 'string' || !Array.isArray(flow.steps)) return [];
    return flow.steps.flatMap((step) => {
      if (!step || typeof step !== 'object') return [];
      const stepId = (step as { stepId?: unknown }).stepId;
      return typeof stepId === 'string'
        ? [buildFlowMapCanonicalItemId(flow.slug as string, stepId)]
        : [];
    });
  });
}

function parseStoredJson(storage: Pick<FlowMapSaveStorage, 'getItem'>, key: string): unknown {
  const raw = storage.getItem(key);
  if (!raw) throw new Error(`Flow Map save did not write ${key}`);
  return JSON.parse(raw) as unknown;
}

function readStoredItemStates(
  storage: Pick<FlowMapSaveStorage, 'getItem'>,
  key: string,
): Record<string, FlowItemState> {
  try {
    return JSON.parse(storage.getItem(key) || '{}') as Record<string, FlowItemState>;
  } catch {
    return {};
  }
}

export function SourceBackedFlowMapSaveButton({
  effectiveSnapshot,
  defaultTitle,
  anchor,
  onAnchorChange,
  selectedArtifactMode,
  selectedResultReady = true,
  selectedResultMessage,
  q3CopyEnabled = true,
  visualSubtractionEnabled = true,
  onEffectiveSnapshotChange,
  savedFlows,
  setupInput,
}: SourceBackedFlowMapSaveButtonProps) {
  const copy = getQ3UserCopyProfile(q3CopyEnabled);
  const [showRequired, setShowRequired] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [titleDraft, setTitleDraft] = useState(effectiveSnapshot.effectiveTitle);
  const [selectedItemIdsDraft, setSelectedItemIdsDraft] = useState<string[]>(
    () => [...effectiveSnapshot.itemIds.effective],
  );
  const [adjustmentReturnFocusSelector, setAdjustmentReturnFocusSelector] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [saveFailure, setSaveFailure] = useState<SaveFailure | undefined>();
  const [saveBaselineState, setSaveBaselineState] = useState<FlowMapSaveBaselineState>('loading');
  const anchorInputRef = useRef<HTMLInputElement>(null);
  const editorHistoryMarkerRef = useRef<string | null>(null);
  const saveBaselineRawRef = useRef<Record<string, string | null> | undefined>(undefined);
  const conflictRecoveryRef = useRef<HTMLAnchorElement>(null);
  const unifiedPublicResult = selectedArtifactMode !== undefined;
  const showsAnchorInput = Boolean(setupInput)
    && (!unifiedPublicResult || selectedArtifactMode === 'calendar');
  const needsAnchor = showsAnchorInput && !anchor;
  const shouldPromptForAnchor = unifiedPublicResult && needsAnchor;
  const committedAnchor = !unifiedPublicResult || selectedArtifactMode === 'calendar' ? anchor : '';
  const selectedCount = effectiveSnapshot.counts.effective;
  const selectedItemIdSet = new Set<string>(effectiveSnapshot.itemIds.effective);
  const selectedItemIdDraftSet = new Set(selectedItemIdsDraft);
  const selectedDraftCount = selectedItemIdsDraft.length;
  const actionContract = buildFlowMapActionContractFromSnapshot(effectiveSnapshot, {
    surface: 'public_preview',
    editable: true,
    exportable: false,
  });
  const primaryAction = actionContract.actions.primary;
  const editAction = actionContract.actions.edit;
  const baseSaveButtonLabel = q3CopyEnabled
    ? unifiedPublicResult ? '내 계획으로 저장' : copy.map.saveToMyPlans
    : primaryAction?.label ?? '전체 저장하고 시작';
  const saveButtonLabel = saveFailure?.kind === 'conflict'
    ? '최신 저장본 확인 필요'
    : saveFailure
      ? '다시 저장'
      : baseSaveButtonLabel;
  const mobileSaveButtonLabel = shouldPromptForAnchor
    ? `${setupInput?.label ?? '날짜'} 정하기`
    : saveButtonLabel;
  const desktopSaveButtonLabel = shouldPromptForAnchor && q3CopyEnabled
    ? `${setupInput?.label ?? '날짜'} 설정 후 저장`
    : saveButtonLabel;
  const setupInputHint = setupInput
    ? `${setupInput.label}에 맞춰 할 일 날짜가 정해집니다.`
    : '';

  useEffect(() => {
    const baselineKeyPlan = buildFlowMapSaveStorageKeyPlan({
      mapId: effectiveSnapshot.identity.mapId,
      flowSlugs: [],
    });
    try {
      saveBaselineRawRef.current = {
        [baselineKeyPlan.mapSnapshotKey]: window.localStorage.getItem(baselineKeyPlan.mapSnapshotKey),
        [baselineKeyPlan.mapPersistenceKey]: window.localStorage.getItem(baselineKeyPlan.mapPersistenceKey),
      };
      setSaveBaselineState('ready');
    } catch {
      saveBaselineRawRef.current = undefined;
      setSaveBaselineState('failed');
      setSaveFailure({ kind: 'storage', rollbackComplete: false });
    }
  }, [effectiveSnapshot.identity.mapId]);

  useEffect(() => {
    if (saveFailure?.kind !== 'conflict') return;
    const frame = window.requestAnimationFrame(() => {
      conflictRecoveryRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [saveFailure?.kind]);

  const resetDraftFromApplied = () => {
    setTitleDraft(effectiveSnapshot.effectiveTitle);
    setSelectedItemIdsDraft([...effectiveSnapshot.itemIds.effective]);
  };

  const leaveEditorHistoryEntry = () => {
    const marker = editorHistoryMarkerRef.current;
    editorHistoryMarkerRef.current = null;
    if (marker && window.history.state?.flowMapEditorMarker === marker) {
      window.history.back();
    }
  };

  const closeAdjustment = () => {
    resetDraftFromApplied();
    setAdjusting(false);
    leaveEditorHistoryEntry();
  };

  useEffect(() => {
    if (!adjusting) return;
    const closeOnBrowserBack = () => {
      if (!editorHistoryMarkerRef.current) return;
      editorHistoryMarkerRef.current = null;
      resetDraftFromApplied();
      setAdjusting(false);
    };
    window.addEventListener('popstate', closeOnBrowserBack);
    return () => window.removeEventListener('popstate', closeOnBrowserBack);
  }, [adjusting, effectiveSnapshot.snapshotHash]);

  const toggleDraftStep = (itemId: string) => {
    setSelectedItemIdsDraft((current) => current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId]);
  };

  const openAdjustment = (returnFocusSelector: string) => {
    resetDraftFromApplied();
    setAdjustmentReturnFocusSelector(returnFocusSelector);
    setSaveFailure((current) => current?.kind === 'conflict' ? current : undefined);
    const marker = `flow-map-editor:${effectiveSnapshot.identity.mapId}:${Date.now()}`;
    const currentState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state as Record<string, unknown>
      : {};
    window.history.pushState({ ...currentState, flowMapEditorMarker: marker }, '', window.location.href);
    editorHistoryMarkerRef.current = marker;
    setAdjusting(true);
  };

  const applyAdjustment = () => {
    if (selectedDraftCount === 0) return;
    const nextSnapshot = reviseEffectiveFlowMapSnapshot(effectiveSnapshot, {
      effectiveTitle: titleDraft.trim() || defaultTitle,
      selectedItemIds: selectedItemIdsDraft,
    });
    onEffectiveSnapshotChange(nextSnapshot);
    setSaveFailure((current) => current?.kind === 'conflict' ? current : undefined);
    setAdjusting(false);
    leaveEditorHistoryEntry();
  };

  const failSave = (rollbackComplete: boolean, kind: SaveFailure['kind'] = 'storage') => {
    setSaving(false);
    setSaveFailure({ kind, rollbackComplete });
  };

  const saveMap = async () => {
    if (saving) return;
    if (needsAnchor) {
      setShowRequired(true);
      anchorInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => anchorInputRef.current?.focus(), 120);
      return;
    }
    if (!selectedResultReady) return;
    if (selectedCount === 0) return;
    const expectedRaw = saveBaselineRawRef.current;
    if (saveBaselineState !== 'ready' || !expectedRaw) {
      failSave(false);
      return;
    }
    setSaving(true);
    setSaveFailure(undefined);

    let persistenceSelection;
    try {
      persistenceSelection = buildEffectiveFlowMapPersistenceSelection(effectiveSnapshot);
    } catch {
      failSave(true);
      return;
    }
    const savedAt = new Date().toISOString();
    const baseSnapshot = buildSourceBackedFlowMapSavedSnapshot(effectiveSnapshot.identity.mapId, {
      savedAt,
      ...(committedAnchor ? { anchor: committedAnchor } : {}),
    });
    const basePersistenceRecord = buildSourceBackedFlowMapPersistenceRecord(effectiveSnapshot.identity.mapId, {
      savedAt,
      ...(committedAnchor ? { anchor: committedAnchor } : {}),
    });
    if (!baseSnapshot || !basePersistenceRecord) {
      failSave(true);
      return;
    }

    const adjusted = persistenceSelection.personalized
      ? buildSourceBackedFlowMapReviewedVersion(
          { ...baseSnapshot, title: persistenceSelection.title },
          persistenceSelection.personalCopy,
          { savedAt, ...(committedAnchor ? { anchor: committedAnchor } : {}) },
        )
      : undefined;
    if (persistenceSelection.personalized && !adjusted) {
      failSave(true);
      return;
    }
    const savedMapSnapshot = adjusted?.snapshot ?? baseSnapshot;
    const persistenceRecord = adjusted?.persistenceRecord ?? basePersistenceRecord;
    const includedFlowSlugs = new Set(savedMapSnapshot.flowSlugs);
    const includedFlows = savedFlows.filter((flow) => includedFlowSlugs.has(flow.slug));
    const keyPlan = buildFlowMapSaveStorageKeyPlan({
      mapId: effectiveSnapshot.identity.mapId,
      flowSlugs: includedFlows.map((flow) => flow.slug),
    });
    const lockedTransaction = await withStorageWriteLock(
      getFlowMapSaveWriteLockName(effectiveSnapshot.identity.mapId),
      () => runFlowMapSaveTransaction({
        storage: window.localStorage,
        keys: keyPlan.allKeys,
        expectedRaw,
        apply: (transactionStorage) => {
        includedFlows.forEach((flow) => {
          const savedFlowKey = keyPlan.savedFlowKeysBySlug[flow.slug]!;
          let previousRecord: ReturnType<typeof normalizeSavedFlowRecord>;
          try {
            previousRecord = normalizeSavedFlowRecord(JSON.parse(
              transactionStorage.getItem(savedFlowKey) || 'null',
            ));
          } catch {
            previousRecord = undefined;
          }
          const record = buildSavedFlowRecord(flow.slug, {
            selectedArtifactMode: selectedArtifactMode ?? flow.artifactMode,
            ...(committedAnchor ? { anchor: committedAnchor } : {}),
          }, previousRecord);
          transactionStorage.setItem(savedFlowKey, JSON.stringify(record));
          recordCanonicalFlowWrite(transactionStorage, flow.slug, record.savedAt);
          transactionStorage.setItem(keyPlan.lastVisitKey, record.savedAt);

          const itemStateKey = keyPlan.itemStateKeysBySlug[flow.slug]!;
          const nextItemStates = { ...readStoredItemStates(transactionStorage, itemStateKey) };
          flow.steps.forEach((step) => {
            const itemId = buildFlowMapCanonicalItemId(flow.slug, step.id);
            const nextState = setFlowItemPersonalExclusion(
              nextItemStates[step.id],
              !selectedItemIdSet.has(itemId),
            );
            if (nextState) nextItemStates[step.id] = nextState;
            else delete nextItemStates[step.id];
          });
          transactionStorage.setItem(itemStateKey, JSON.stringify(nextItemStates));
          transactionStorage.setItem(keyPlan.lastVisitKey, new Date().toISOString());
        });
        transactionStorage.setItem(keyPlan.mapSnapshotKey, JSON.stringify(savedMapSnapshot));
        transactionStorage.setItem(keyPlan.mapPersistenceKey, JSON.stringify(persistenceRecord));

        const storedSnapshot = parseStoredJson(transactionStorage, keyPlan.mapSnapshotKey) as {
          title?: unknown;
          stepCountsByFlow?: unknown;
        };
        const storedPersistence = parseStoredJson(transactionStorage, keyPlan.mapPersistenceKey) as {
          map?: { title?: unknown };
        };
        const storedCount = storedSnapshot.stepCountsByFlow
          && typeof storedSnapshot.stepCountsByFlow === 'object'
          ? Object.values(storedSnapshot.stepCountsByFlow as Record<string, unknown>)
              .reduce<number>((total, count) => total + (typeof count === 'number' ? count : 0), 0)
          : 0;
        const storedItemIds = getStoredPersistenceItemIds(storedPersistence);
        if (
          storedSnapshot.title !== persistenceSelection.title
          || storedPersistence.map?.title !== persistenceSelection.title
          || storedCount !== persistenceSelection.selectedItemIds.length
          || JSON.stringify(storedItemIds) !== JSON.stringify(persistenceSelection.selectedItemIds)
        ) {
          throw new Error('Stored Flow Map does not match the applied effective snapshot');
        }
      },
      }),
    );
    if (!lockedTransaction.ok) {
      failSave(true);
      return;
    }
    const transaction = lockedTransaction.value;
    if (!transaction.ok) {
      failSave(
        transaction.rollbackComplete,
        transaction.conflictKeys.length > 0 ? 'conflict' : 'storage',
      );
      return;
    }
    window.location.href = buildPostSaveHref({ kind: 'map', id: effectiveSnapshot.identity.mapId });
  };

  const desktopEditButton = editAction ? (
    <button
      className={`${visualSubtractionEnabled ? 'min-h-12' : 'min-h-11'} rounded-lg border border-[#D9D6CF] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#3654FF]/40 hover:text-[#3654FF] disabled:text-slate-400`}
      data-testid="flow-map-adjust-save"
      data-map-action-intent={editAction.intent}
      type="button"
      aria-expanded={adjusting}
      disabled={saving}
      onClick={() => openAdjustment('[data-testid="flow-map-adjust-save"]')}
    >
      {q3CopyEnabled
        ? unifiedPublicResult ? '수정' : copy.map.editPlan
        : editAction.label}
    </button>
  ) : null;
  const desktopSaveButton = (
    <button
      className={`${visualSubtractionEnabled ? 'min-h-12' : 'min-h-11'} items-center justify-center rounded-lg bg-[#3654FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2945E8] disabled:bg-slate-300`}
      data-testid="flow-map-save-all"
      data-map-action-intent={primaryAction?.intent}
      type="button"
      disabled={saving || (!selectedResultReady && !shouldPromptForAnchor) || saveBaselineState !== 'ready' || saveFailure?.kind === 'conflict' || !primaryAction || primaryAction.disabled}
      onClick={saveMap}
    >
      {desktopSaveButtonLabel}
    </button>
  );

  return (
    <div
      className="grid w-full gap-3 sm:w-auto"
      data-testid="flow-map-action-controller"
      data-map-save-mode={actionContract.controller.saveMode}
      data-map-source-action={actionContract.identity.source.id}
      data-p35-q3-copy={q3CopyEnabled ? 'on' : 'off'}
      data-save-status={saving ? 'saving' : saveFailure?.kind === 'conflict' ? 'conflict' : saveFailure ? 'failed' : 'idle'}
      aria-busy={saving}
    >
      {setupInput && showsAnchorInput ? (
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
              onAnchorChange(event.target.value);
              setShowRequired(false);
              setSaveFailure((current) => current?.kind === 'conflict' ? current : undefined);
            }}
          />
          <span className="text-xs font-medium leading-5 text-slate-500">{setupInputHint}</span>
          {showRequired ? <span className="text-xs font-semibold text-red-700">저장하려면 날짜를 입력해 주세요.</span> : null}
        </label>
      ) : null}
      {visualSubtractionEnabled ? (
        <p data-testid="flow-map-selection-summary" className="hidden text-xs font-semibold text-slate-600 sm:block">
          선택 {selectedCount} / 전체 {effectiveSnapshot.counts.canonical}
        </p>
      ) : null}
      {effectiveSnapshot.effectiveTitle !== defaultTitle || (!visualSubtractionEnabled && selectedCount !== effectiveSnapshot.counts.canonical) ? (
        <p data-testid="flow-map-applied-adjustment-summary" className="text-xs font-semibold text-slate-600">
          {visualSubtractionEnabled
            ? `저장 제목 · ${effectiveSnapshot.effectiveTitle}`
            : `저장 결과 · ${effectiveSnapshot.effectiveTitle} · 할 일 ${selectedCount}개`}
        </p>
      ) : null}
      {saveFailure?.kind === 'conflict' ? (
        <div data-testid="flow-map-save-conflict" role="alert" className="grid gap-2 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950">
          <p>
            다른 탭에서 이 계획을 먼저 저장했어요. 이 화면의 제목과 선택은 그대로 남겨뒀습니다.
          </p>
          <a
            ref={conflictRecoveryRef}
            className="w-fit underline underline-offset-2"
            href={buildPostSaveHref({ kind: 'map', id: effectiveSnapshot.identity.mapId })}
            rel="noreferrer"
            target="_blank"
          >
            새 탭에서 최신 저장본 보기
          </a>
        </div>
      ) : saveFailure ? (
        <p data-testid="flow-map-save-error" role="alert" className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-xs font-semibold leading-5 text-red-800">
          {saveFailure.rollbackComplete
            ? '저장하지 못했습니다. 선택은 그대로 유지됐어요. 다시 시도해 주세요.'
            : '저장하지 못했고 일부 로컬 값은 자동 복구되지 않았습니다. 이 화면을 닫지 말고 다시 시도해 주세요.'}
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
      {!selectedResultReady && selectedResultMessage ? (
        <p
          data-testid="flow-map-selected-result-unavailable"
          role="status"
          className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950"
        >
          {selectedResultMessage}
        </p>
      ) : null}
      <div className={`hidden gap-2 sm:grid ${editAction ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
        {visualSubtractionEnabled ? (
          <>{desktopEditButton}{desktopSaveButton}</>
        ) : (
          <>{desktopSaveButton}{desktopEditButton}</>
        )}
      </div>
      <div className={`${visualSubtractionEnabled ? 'bottom-0 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2' : 'bottom-[calc(4.625rem+env(safe-area-inset-bottom))] px-4 py-2'} fixed inset-x-0 z-30 border-y border-[#E7E4DD] bg-white/95 shadow-[0_-8px_20px_rgba(27,26,23,0.06)] backdrop-blur sm:hidden`} data-testid="flow-map-mobile-sticky-save">
        <div className="mx-auto flex max-w-xl items-center gap-2">
          <p className="min-w-0 flex-1 px-1 text-[11px] font-semibold leading-4 text-slate-600">
            <span data-testid={visualSubtractionEnabled ? 'flow-map-selection-summary' : 'flow-map-mobile-selection-summary'}>
              선택 {selectedCount} / 전체 {effectiveSnapshot.counts.canonical}
            </span>
            {needsAnchor ? ` · ${setupInput?.label} 필요` : null}
          </p>
          {editAction ? (
            <button
              className={`inline-flex ${visualSubtractionEnabled ? 'min-h-12' : 'min-h-10'} shrink-0 items-center justify-center rounded-lg border border-[#D9D6CF] bg-white px-3 py-2 text-sm font-semibold text-slate-700 disabled:text-slate-400`}
              data-testid="flow-map-adjust-save-mobile"
              data-map-action-intent={editAction.intent}
              type="button"
              aria-expanded={adjusting}
              disabled={saving}
              onClick={() => openAdjustment('[data-testid="flow-map-adjust-save-mobile"]')}
            >
              {q3CopyEnabled
                ? unifiedPublicResult ? '수정' : copy.map.editPlan
                : '조정'}
            </button>
          ) : null}
          <button className={`inline-flex ${visualSubtractionEnabled ? 'min-h-12' : 'min-h-10'} shrink-0 items-center justify-center rounded-lg bg-[#3654FF] px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300`} data-testid="flow-map-save-all-mobile" data-map-action-intent={primaryAction?.intent} type="button" disabled={saving || (!selectedResultReady && !shouldPromptForAnchor) || saveBaselineState !== 'ready' || saveFailure?.kind === 'conflict' || !primaryAction || primaryAction.disabled} onClick={saveMap}>
            {mobileSaveButtonLabel}
          </button>
        </div>
      </div>
      {adjusting && editAction ? (
        <FlowBottomSheet
          testId="flow-map-adjust-panel"
          headingId="flow-map-adjust-panel-title"
          eyebrow="내 결과 편집"
          title={q3CopyEnabled ? copy.map.editPlan : 'Flow 편집'}
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
              {q3CopyEnabled ? '내 계획 이름' : '내 Flow 이름'}
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
                    {flow.steps.map((step) => {
                      const itemId = buildFlowMapCanonicalItemId(flow.slug, step.id);
                      return (
                        <label key={itemId} className="flex min-h-12 items-start gap-3 border-b border-slate-200 px-2 py-3 text-sm font-semibold text-slate-800 last:border-b-0">
                          <input
                            className="mt-0.5 h-4 w-4 shrink-0 accent-[#3654FF]"
                            type="checkbox"
                            data-map-item-id={itemId}
                            checked={selectedItemIdDraftSet.has(itemId)}
                            onChange={() => toggleDraftStep(itemId)}
                          />
                          <span className="min-w-0 break-keep">{step.title}</span>
                        </label>
                      );
                    })}
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
              {q3CopyEnabled ? copy.map.applyChanges : '변경 적용'}
            </button>
          </div>
        </FlowBottomSheet>
      ) : null}
    </div>
  );
}
