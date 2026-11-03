'use client';

import React, { useEffect, useState } from 'react';
import { validateCatalogLibrarySnapshot, type CatalogLibrarySnapshot } from '@/lib/flow/integrated-poc/catalog-library';
import type { ProgramData } from '@/lib/flow/integrated-poc/contract';
import type { ProgramMutate, ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import { AlphaCatalogLibrary } from './AlphaCatalogLibrary';
import { AlphaCatalogContentImport } from './AlphaCatalogContentImport';

/** Mounted per userId. No cross-account cache or browser storage of source bytes. */
export function AlphaCatalogPanels({ data, accessToken, mutate, navigate, disabled, onDetailChange, detailOpen }: {
  data: ProgramData; accessToken: string; mutate: ProgramMutate; navigate: ProgramNavigate;
  disabled: boolean; onDetailChange: (open: boolean) => void; detailOpen: boolean;
}) {
  const stored = data.spaces[data.activeActorId]?.catalogLibrary;
  const [source, setSource] = useState<CatalogLibrarySnapshot | null>(null);
  const [failure, setFailure] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (stored) return;
    const abort = new AbortController();
    setSource(null); setFailure(false);
    void (async () => {
      try {
        const response = await fetch('/api/alpha/catalog', { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store', signal: abort.signal });
        if (!response.ok) throw Error('catalog-unavailable');
        const payload: unknown = await response.json();
        if (!validateCatalogLibrarySnapshot(payload)) throw Error('catalog-invalid');
        if (!abort.signal.aborted) setSource(payload);
      } catch { if (!abort.signal.aborted) setFailure(true); }
    })();
    return () => abort.abort();
  }, [stored, accessToken, attempt]);
  const library = stored ?? source;
  if (!library) return <section aria-label="기존 Flow 콘텐츠"><p role="status">{failure ? '콘텐츠를 확인하지 못했습니다. 로그인 상태와 서버 연결을 확인해 주세요.' : '기존 Flow 콘텐츠를 불러오는 중…'}</p>
    {failure && <button type="button" onClick={() => setAttempt(value => value + 1)}>다시 확인</button>}</section>;
  return <>
    <AlphaCatalogLibrary data={data} sourceLibrary={library} mutate={mutate} navigate={navigate} onDetailChange={onDetailChange} disabled={disabled} />
    <div hidden={detailOpen} aria-label="이전 콘텐츠 제작 사본"><AlphaCatalogContentImport data={data} sourceLibrary={library} mutate={mutate} navigate={navigate} disabled={disabled} /></div>
  </>;
}
