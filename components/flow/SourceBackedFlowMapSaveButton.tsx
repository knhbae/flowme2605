'use client';

import { useRef, useState } from 'react';
import {
  buildSourceBackedFlowMapPersistenceRecord,
  buildSourceBackedFlowMapSavedSnapshot,
  getSourceBackedFlowMapPersistenceStorageKey,
  getSourceBackedFlowMapSnapshotStorageKey,
} from '@/lib/flow/source-backed-my-flow';
import { saveFlowRecord, type SavedFlowArtifactMode } from '@/lib/flow/storage';

type SourceBackedFlowMapSaveButtonProps = {
  mapId: string;
  savedFlows: {
    slug: string;
    artifactMode: SavedFlowArtifactMode;
  }[];
  setupInput?: {
    label: string;
    hint: string;
    defaultValue?: string;
  };
};

function getUserFacingSetupHint(hint: string): string {
  return hint
    .replace(/날짜별 Step으로/g, '날짜별 할 일로')
    .replace(/seed Step/g, '원문 항목')
    .replace(/\bStep\b/g, '할 일')
    .replace(/할 일으로/g, '할 일로');
}

export function SourceBackedFlowMapSaveButton({ mapId, savedFlows, setupInput }: SourceBackedFlowMapSaveButtonProps) {
  const [anchor, setAnchor] = useState(setupInput?.defaultValue ?? '');
  const [showRequired, setShowRequired] = useState(false);
  const anchorInputRef = useRef<HTMLInputElement>(null);
  const needsAnchor = Boolean(setupInput);
  const saveButtonLabel = '전체 저장하고 시작';
  const mobileSaveButtonLabel = needsAnchor && !anchor ? `${setupInput?.label ?? '날짜'} 입력` : needsAnchor ? '저장하고 시작' : saveButtonLabel;
  const setupInputHint = setupInput ? getUserFacingSetupHint(setupInput.hint) : '';

  const saveMap = () => {
    if (needsAnchor && !anchor) {
      setShowRequired(true);
      anchorInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      window.setTimeout(() => anchorInputRef.current?.focus(), 120);
      return;
    }

    savedFlows.forEach((flow) => {
      saveFlowRecord(flow.slug, {
        selectedArtifactMode: flow.artifactMode,
        ...(needsAnchor ? { anchor } : {}),
      });
    });
    const savedMapSnapshot = buildSourceBackedFlowMapSavedSnapshot(mapId, {
      ...(needsAnchor ? { anchor } : {}),
    });
    if (savedMapSnapshot) {
      window.localStorage.setItem(getSourceBackedFlowMapSnapshotStorageKey(mapId), JSON.stringify(savedMapSnapshot));
    }
    const persistenceRecord = buildSourceBackedFlowMapPersistenceRecord(mapId, {
      ...(needsAnchor ? { anchor } : {}),
    });
    if (persistenceRecord) {
      window.localStorage.setItem(getSourceBackedFlowMapPersistenceStorageKey(mapId), JSON.stringify(persistenceRecord));
    }
    window.location.href = `/my?savedMap=${encodeURIComponent(mapId)}`;
  };

  return (
    <div className="grid w-full gap-3 sm:w-auto">
      {setupInput ? (
        <label className="grid gap-1 text-sm font-semibold text-slate-800">
          {setupInput.label}
          <input
            aria-label={setupInput.label}
            className={`min-h-11 rounded-xl border bg-[#FAFAF8] px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:bg-white focus:ring-2 ${showRequired ? 'border-red-500 ring-2 ring-red-100 focus:border-red-500 focus:ring-red-100' : 'border-[#E7E4DD] focus:border-[#3654FF] focus:ring-[#3654FF]/10'}`}
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
      <button className="hidden min-h-11 items-center justify-center rounded-xl bg-[#3654FF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2945E8] sm:inline-flex" data-testid="flow-map-save-all" type="button" onClick={saveMap}>
        {saveButtonLabel}
      </button>
      <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 rounded-2xl border border-[#E7E4DD] bg-white/95 p-2 shadow-[0_12px_36px_rgba(27,26,23,0.14)] backdrop-blur sm:hidden" data-testid="flow-map-mobile-sticky-save">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 px-1 text-xs font-semibold leading-5 text-slate-600">
            {needsAnchor ? (anchor ? `${setupInput?.label} 입력됨` : `${setupInput?.label} 필요`) : savedFlows.length > 1 ? `${savedFlows.length}개 콘텐츠 저장` : '콘텐츠 저장'}
          </p>
          <button className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[#3654FF] px-4 py-2 text-sm font-semibold text-white" data-testid="flow-map-save-all-mobile" type="button" onClick={saveMap}>
            {mobileSaveButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
