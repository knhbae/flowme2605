'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ProgramSpace } from './ProgramSpace';
import { createProgramController, type ProgramController, type ProgramControllerSnapshot } from '@/lib/flow/integrated-poc/controller';
import { PROGRAM_STATE_KEY } from '@/lib/flow/integrated-poc/contract';
import { commitDocumentCollectionLinks, emptyDocumentCollections, isDocumentCollections, type DocumentCollections } from '@/lib/flow/integrated-poc/document-collections';
import { COLLECTION_TRIAL_DATA_KEY, COLLECTION_TRIAL_LINK_KEY, COLLECTION_TRIAL_TODAY, createDocumentCollectionsTrialData } from '@/lib/flow/integrated-poc/document-collections-trial';

export function DocumentCollectionsLab() {
  const controller = useRef<ProgramController | null>(null);
  const [snapshot, setSnapshot] = useState<ProgramControllerSnapshot | null>(null);
  const [collections, setCollections] = useState<DocumentCollections>(emptyDocumentCollections);
  const collectionRaw = useRef<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    try {
      if (!navigator.locks) { setError('이 브라우저는 시험 저장에 필요한 잠금을 지원하지 않습니다. 저장값은 바꾸지 않았습니다.'); return; }
      const read = localStorage.getItem(COLLECTION_TRIAL_LINK_KEY);
      const links: unknown = read === null ? emptyDocumentCollections() : JSON.parse(read);
      if (!isDocumentCollections(links)) { setError('시험 모음 저장값을 읽을 수 없습니다. 기존 값은 지우지 않았습니다.'); return; }
      collectionRaw.current = read; setCollections(links);
      const key = (value: string) => { if (value !== PROGRAM_STATE_KEY) throw new Error('trial-key-only'); return COLLECTION_TRIAL_DATA_KEY; };
      const created = createProgramController({
        initialData: createDocumentCollectionsTrialData(),
        storage: { getItem: value => localStorage.getItem(key(value)), setItem: (value, raw) => localStorage.setItem(key(value), raw), removeItem: value => localStorage.removeItem(key(value)) },
        exclusive: async work => navigator.locks.request(COLLECTION_TRIAL_DATA_KEY, () => work()),
        onChange: next => setSnapshot(next),
      });
      if (!created.ok) { setError('시험 문서 저장값을 읽을 수 없습니다. 기존 값은 지우지 않았습니다.'); return; }
      controller.current = created; setSnapshot(created.snapshot());
    } catch { setError('이 브라우저에서 로컬 시험 저장소를 사용할 수 없습니다.'); }
    return () => { controller.current = null; };
  }, []);
  async function writeCollections(next: DocumentCollections) {
    if (!isDocumentCollections(next) || !navigator.locks) return false;
    try {
      // Capture the caller's expected bytes before waiting for another writer.
      const expected = collectionRaw.current;
      return await navigator.locks.request(COLLECTION_TRIAL_LINK_KEY, () => {
        const result = commitDocumentCollectionLinks({ read: () => localStorage.getItem(COLLECTION_TRIAL_LINK_KEY), write: raw => localStorage.setItem(COLLECTION_TRIAL_LINK_KEY, raw) }, expected, next);
        if (!result.ok) return false;
        collectionRaw.current = result.raw; setCollections(next); return true;
      });
    } catch { return false; }
  }
  return <main style={{ maxWidth: 1200, margin: '0 auto', padding: 16 }}>
    <h1 style={{ fontSize: 24, marginBottom: 8 }}>문서·모음 로컬 시험</h1>
    <p role="status" style={{ marginBottom: 20 }}>시험 문서만 사용합니다. 브라우저 로컬 저장이며 실제 계정·Alpha 서버 저장과 연결되지 않습니다. 기준 b4aedf · 후보 문서·모음.</p>
    {error ? <p role="alert">{error}</p> : snapshot ? <ProgramSpace data={snapshot.envelope.data} today={COLLECTION_TRIAL_TODAY}
      capabilities={{ discovery: false, publication: false, copyInspection: false, revisionHistory: false, creatorNavigation: false }}
      navigate={() => { /* Existing ProgramSpace owns this isolated document presentation. */ }}
      mutate={(label, build, options) => controller.current ? controller.current.mutate(label, build, { actorId: snapshot.envelope.data.activeActorId, ...options }) : Promise.resolve({ ok: false, reason: 'storage-unavailable' })}
      onUndo={async () => { await controller.current?.undo(snapshot.envelope.data.activeActorId); }}
      onRedo={async () => { await controller.current?.redo(snapshot.envelope.data.activeActorId); }}
      documentCollections={{ state: collections, onChange: writeCollections,
        initialWritingDocumentId: snapshot.envelope.data.receipts.find(row => row.id === 'trial-quick-document'
          && row.actorId === snapshot.envelope.data.activeActorId)?.resultId }} /> : <p>시험 문서 준비 중</p>}
  </main>;
}
