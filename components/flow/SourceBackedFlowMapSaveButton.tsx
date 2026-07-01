'use client';

import { useState } from 'react';
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

export function SourceBackedFlowMapSaveButton({ mapId, savedFlows, setupInput }: SourceBackedFlowMapSaveButtonProps) {
  const [anchor, setAnchor] = useState(setupInput?.defaultValue ?? '');
  const [showRequired, setShowRequired] = useState(false);
  const needsAnchor = Boolean(setupInput);
  const saveButtonLabel = '전체 저장';

  const saveMap = () => {
    if (needsAnchor && !anchor) {
      setShowRequired(true);
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
            className="min-h-11 rounded-md border border-slate-300 bg-white px-3 py-2 text-base font-semibold text-slate-950 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            data-testid="flow-map-anchor-input"
            type="date"
            value={anchor}
            onChange={(event) => {
              setAnchor(event.target.value);
              setShowRequired(false);
            }}
          />
          <span className="text-xs font-medium leading-5 text-slate-500">{setupInput.hint}</span>
          {showRequired ? <span className="text-xs font-semibold text-red-700">저장하려면 날짜를 입력해 주세요.</span> : null}
        </label>
      ) : null}
      <button className="hidden min-h-11 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white sm:inline-flex" data-testid="flow-map-save-all" type="button" onClick={saveMap}>
        {saveButtonLabel}
      </button>
      <div className="fixed inset-x-3 bottom-20 z-30 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur sm:hidden" data-testid="flow-map-mobile-sticky-save">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 px-1 text-xs font-semibold leading-5 text-slate-600">
            {needsAnchor ? (anchor ? `${setupInput?.label} 입력됨` : `${setupInput?.label} 필요`) : `${savedFlows.length}개 Flow 저장`}
          </p>
          <button className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" data-testid="flow-map-save-all-mobile" type="button" onClick={saveMap}>
            {saveButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
