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
      <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white" data-testid="flow-map-save-all" type="button" onClick={saveMap}>
        전체 지도 저장
      </button>
    </div>
  );
}
