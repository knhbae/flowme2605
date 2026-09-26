'use client';

import React, { useMemo, useRef, useState } from 'react';
import { PROGRAM_CATALOG_SLUGS } from '@/lib/flow/integrated-poc/catalog';
import type { CatalogLibrarySnapshot } from '@/lib/flow/integrated-poc/catalog-library';
import { buildCatalogContent } from '@/lib/flow/integrated-poc/catalog-content';
import { isNativeCreatorCatalogContentSource } from '@/lib/flow/integrated-poc/native-creator-document-contract';
import { executeAlphaCreatorIntent } from '@/lib/flow/integrated-poc/alpha-creator/dispatch';
import type { AlphaCreatorIntent } from '@/lib/flow/integrated-poc/alpha-creator/contract';
import { programId, type ProgramData } from '@/lib/flow/integrated-poc/contract';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './AlphaCatalogContentImport.module.css';

export function AlphaCatalogContentImport({ data, mutate, navigate, sourceLibrary, disabled = false }: {
  data: ProgramData; mutate: ProgramMutate; navigate: ProgramNavigate; sourceLibrary: CatalogLibrarySnapshot; disabled?: boolean;
}) {
  const catalog = useMemo(() => PROGRAM_CATALOG_SLUGS.map(slug => buildCatalogContent(slug, sourceLibrary)), [sourceLibrary]);
  const [selected, setSelected] = useState<string | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const running = useRef(false);
  const entries = Object.entries(data.spaces[data.activeActorId]?.creatorWorkspace?.structureDrafts ?? {});
  const existing = (slug: string) => entries.find(([, context]) => context.nativeDocument && isNativeCreatorCatalogContentSource(context.nativeDocument.source) && context.nativeDocument.source.sourceSlug === slug)?.[0];
  const preview = catalog.find(row => row.ok && row.content.sourceSlug === selected);
  async function apply() {
    if (running.current || disabled || !preview?.ok) return;
    running.current = true; setBusy(true); setMessage('콘텐츠를 가져오는 중…');
    const requestId = programId('catalog-import');
    const intent: AlphaCreatorIntent = { type: 'catalog-content-import', draftId: programId('creator'),
      sourceSlug: preview.content.sourceSlug, sourceVersionId: preview.content.versionId, now: new Date().toISOString() };
    try {
      const result = await mutate('기존 Flow 콘텐츠 가져오기', current => executeAlphaCreatorIntent(current, current.activeActorId, intent, requestId), { alphaCreator: intent });
      if (!result.ok) { setMessage(programErrorMessage(result.reason)); return; }
      setSelected(null); setMessage('제작 공간에 가져왔습니다. 사용 기록은 포함하지 않았고, 아직 공개하지 않았습니다.');
    } catch { setMessage('저장 결과를 확인하지 못했습니다. 상단의 서버 저장 상태를 확인해 주세요.'); }
    finally { running.current = false; setBusy(false); }
  }
  return <details className={styles.panel} onKeyDown={event => { if (event.key === 'Escape' && !busy) { setSelected(null); setMessage('취소했습니다.'); } }}>
    <summary>이전 PoC의 Flow 콘텐츠 가져오기</summary>
    <p>콘텐츠만 비공개 제작 사본으로 가져옵니다. 완료·개인 메모·이동한 날짜는 가져오지 않습니다.</p>
    <ul>{catalog.map((row, index) => row.ok ? <li key={row.content.sourceSlug}>
      <span>{row.content.bundle.flow.title}<small>{row.content.bundle.sections.length}개 구간 · {row.content.bundle.items.length}개 항목</small></span>
      {existing(row.content.sourceSlug) ? <button type="button" disabled={disabled || busy} onClick={() => navigate({ view: 'creator', id: existing(row.content.sourceSlug) })}>가져온 콘텐츠 열기</button>
        : <button type="button" disabled={disabled || busy} onClick={() => { setSelected(row.content.sourceSlug); setMessage(''); }}>내용 확인</button>}
    </li> : <li key={index}>이 콘텐츠는 원본을 확인하지 못해 가져올 수 없습니다.</li>)}</ul>
    {preview?.ok && <section aria-label="가져올 콘텐츠 확인">
      <h2>{preview.content.bundle.flow.title}</h2><p>{preview.content.bundle.flow.description}</p>
      <p>원래 작성자: {preview.content.bundle.flow.creator_name ?? '표시 없음'} · 관리 사본은 현재 로그인 계정에 저장합니다.</p>
      <a href={preview.content.bundle.flow.source_url} target="_blank" rel="noopener noreferrer">원래 출처 열기</a>
      {preview.content.bundle.flow.warning && <p>{preview.content.bundle.flow.warning}</p>}
      {preview.content.bundle.flow.source_status === 'needs_review' && <p>출처 재검토가 필요한 콘텐츠입니다. 최신 정보로 확인된 자료는 아닙니다.</p>}
      <p>{preview.content.bundle.flow.setup_anchor_label ?? '기준일'}은 실행할 때 정합니다. 지금 개인 일정으로 등록하지 않습니다.</p>
      <details><summary>기존 원문 보기</summary><pre>{preview.content.bundle.flow.raw_text}</pre></details>
      <div className={styles.actions}><button type="button" disabled={disabled || busy} onClick={() => void apply()}>{busy ? '가져오는 중…' : '비공개 제작 사본으로 가져오기'}</button>
        <button type="button" disabled={busy} onClick={() => { setSelected(null); setMessage('취소했습니다.'); }}>취소</button></div>
    </section>}
    {message && <p role="status" aria-live="polite">{message}</p>}
  </details>;
}
