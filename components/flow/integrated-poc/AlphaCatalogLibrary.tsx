'use client';
import React, { useRef, useState } from 'react';
import { CATALOG_LIBRARY_VERSION, catalogLibrarySummary, type CatalogLibrarySnapshot } from '@/lib/flow/integrated-poc/catalog-library';
import { executeAlphaCreatorIntent } from '@/lib/flow/integrated-poc/alpha-creator/dispatch';
import { programId, type ProgramData } from '@/lib/flow/integrated-poc/contract';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './AlphaCatalogLibrary.module.css';
import { CatalogLibraryContent } from './CatalogLibraryContent';
import { AlphaCatalogCopyActions } from './AlphaCatalogCopyActions';
import { CATALOG_CONTENT_SLUGS, CATALOG_CONTENT_V2_SLUGS, CATALOG_CONTENT_V3_SLUGS } from '@/lib/flow/integrated-poc/catalog-content';

export function AlphaCatalogLibrary({ data, mutate, navigate, sourceLibrary, disabled = false, onDetailChange }: { data: ProgramData; mutate: ProgramMutate; navigate?: ProgramNavigate; sourceLibrary?: CatalogLibrarySnapshot; disabled?: boolean; onDetailChange?: (open: boolean) => void }) {
  const stored = data.spaces[data.activeActorId]?.catalogLibrary;
  const library = stored ?? sourceLibrary;
  if (!library) return <p role="status">로그인한 계정의 콘텐츠를 확인하는 중입니다.</p>;
  return <LoadedCatalogLibrary data={data} mutate={mutate} navigate={navigate} library={library} stored={!!stored} disabled={disabled} onDetailChange={onDetailChange} />;
}

function LoadedCatalogLibrary({ data, mutate, navigate, library, stored, disabled, onDetailChange }: { data: ProgramData; mutate: ProgramMutate; navigate?: ProgramNavigate; library: CatalogLibrarySnapshot; stored: boolean; disabled: boolean; onDetailChange?: (open: boolean) => void }) {
  const summary = catalogLibrarySummary(library);
  const [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [query, setQuery] = useState(''), [filter, setFilter] = useState<'all' | 'archived' | 'maps'>('all'), [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null), [selectedMap, setSelectedMap] = useState<string | null>(null), [variant, setVariant] = useState(false);
  const running = useRef(false);
  const previewOpener = useRef<HTMLButtonElement | null>(null);
  const returnFocus = useRef<string | null>(null);
  const focusedDetail = useRef<string | null>(null);
  const focusDetail = (key: string, node: HTMLHeadingElement | null) => { if (node && focusedDetail.current !== key) { focusedDetail.current = key; node.focus(); } };
  const restoreListFocus = (key: string, node: HTMLButtonElement | null) => { if (node && returnFocus.current === key) { node.focus(); returnFocus.current = null; } };
  const closeDetail = () => { setSelected(null); setSelectedMap(null); setVariant(false); focusedDetail.current = null; onDetailChange?.(false); };
  const archived = (slug: string) => library.policies.flows.find(row => row.slug === slug)?.runtimeExcluded;
  const rows = filter === 'maps' ? library.maps.filter(row => `${row.title} ${row.summary}`.toLowerCase().includes(query.toLowerCase()))
    : library.bundles.filter(row => (filter !== 'archived' || archived(row.flow.slug)) && `${row.flow.title} ${row.flow.category} ${row.flow.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(rows.length / 20)), currentPage = Math.min(page, pages - 1);
  const bundle = variant ? library.variants.find(row => row.slug === selected)?.bundle : library.bundles.find(row => row.flow.slug === selected);
  const map = library.maps.find(row => row.id === selectedMap);
  const policy = library.policies.flows.find(row => row.slug === selected);
  const openFlow = (slug: string) => { setSelected(slug); setVariant(false); setMessage(''); onDetailChange?.(true); };
  async function apply() {
    if (running.current || disabled || stored || !preview) return;
    running.current = true; setBusy(true); setMessage('전체 콘텐츠를 가져오는 중…');
    const intent = { type: 'catalog-library-import' as const, catalogVersion: CATALOG_LIBRARY_VERSION, now: new Date().toISOString() };
    const requestId = programId('catalog-library');
    try {
      const result = await mutate('전체 Flow 콘텐츠 비공개 가져오기', current => executeAlphaCreatorIntent(current, current.activeActorId, intent, requestId), { alphaCreator: intent });
      if (!result.ok) { setMessage(programErrorMessage(result.reason)); return; }
      setPreview(false); setMessage('전체 콘텐츠를 비공개 자료실에 보관했습니다.');
    } catch { setMessage('저장 결과를 확인하지 못했습니다. 서버 저장 상태를 확인해 주세요.'); }
    finally { running.current = false; setBusy(false); }
  }
  return <details className={styles.panel} open={!!stored} onToggle={event => { if (!event.currentTarget.open) { if (busy) event.currentTarget.open = true; else closeDetail(); } }} onKeyDown={event => { if (event.key === 'Escape' && !busy) { if (!selected && !selectedMap) { setPreview(false); previewOpener.current?.focus(); } closeDetail(); setMessage(''); } }}>
    <summary>기존 Flow 콘텐츠</summary>
    <p>Flow {summary.bundles}개 · Flow Map {summary.maps}개 · 별도 현재 판본 {summary.variants}개</p>
    <p>비공개 원본 자료실입니다. 개인 사용 기록은 포함하지 않습니다. {CATALOG_CONTENT_SLUGS.length + CATALOG_CONTENT_V2_SLUGS.length + CATALOG_CONTENT_V3_SLUGS.length}개 콘텐츠는 상세에서 제작 사본으로 연결할 수 있습니다. 나머지는 원본 열람을 유지합니다.</p>
    {!stored && <><button type="button" ref={previewOpener} disabled={disabled || busy} onClick={() => setPreview(true)}>전체 콘텐츠 내용 확인</button>
      {preview && <section aria-label="전체 콘텐츠 가져오기 확인"><p>Flow {summary.bundles}개와 Map {summary.maps}개의 구조·출처·보관 정책을 함께 보존합니다. 보관 대상 {summary.runtimeExcluded}개도 공개 상태로 바꾸지 않습니다.</p>
        <button type="button" disabled={disabled || busy} onClick={() => void apply()}>{busy ? '가져오는 중…' : '전체 콘텐츠 비공개로 가져오기'}</button>
        <button type="button" disabled={busy} onClick={() => { setPreview(false); setMessage('취소했습니다.'); }}>취소</button></section>}</>}
    {(stored || preview) && <>
      {!selected && !selectedMap && <>
      <label>콘텐츠 검색<input value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} /></label>
      <div className={styles.actions}>{([['all', '전체 Flow'], ['archived', '보관 대상'], ['maps', 'Flow Map']] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => { setFilter(key); setPage(0); setSelected(null); setSelectedMap(null); }}>{label}</button>)}</div>
      <p>검색 결과 {rows.length}개 · {currentPage + 1}/{pages}쪽</p>
      <ul className={styles.list}>{rows.slice(currentPage * 20, currentPage * 20 + 20).map(row => 'flow' in row ? <li key={row.flow.slug}><button type="button" ref={node => restoreListFocus(row.flow.slug, node)} onClick={() => { returnFocus.current = row.flow.slug; openFlow(row.flow.slug); setSelectedMap(null); }}>{row.flow.title}{archived(row.flow.slug) ? ' · 보관 대상' : ''}</button></li>
        : <li key={row.id}><button type="button" ref={node => restoreListFocus(row.id, node)} onClick={() => { returnFocus.current = row.id; setSelectedMap(row.id); setSelected(null); setMessage(''); onDetailChange?.(true); }}>{row.title} · {row.flowSlugs.length}개 Flow</button></li>)}</ul>
      {!rows.length && <p>검색 결과가 없습니다.</p>}
      <div className={styles.actions}><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>이전 쪽</button><button type="button" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>다음 쪽</button></div>
      </>}
      {(selected || selectedMap) && <button type="button" disabled={busy} onClick={closeDetail}>목록으로</button>}
      {map && !selected && <section aria-label="Flow Map 상세"><h2 tabIndex={-1} ref={node => focusDetail(`map:${map.id}`, node)}>{map.title}</h2>
        <p>원본 Flow {map.flowSlugs.length}개를 묶은 자료입니다. 이 자료실에서는 열람만 가능합니다.</p>
        {library.policies.maps.find(row => row.mapId === map.id)?.executable === false && <p>원본 정책에서 실행이 보류된 Map입니다. 열람만 제공하며 실행을 허용한 것이 아닙니다.</p>}
        <details><summary>원본에 기록된 소개·상태</summary><p>아래 문구는 과거 원본 기록이며 현재 실행 가능 여부가 아닙니다.</p><blockquote>{map.summary}</blockquote><p>{map.userFacingStatus}</p></details>
        <ul>{map.flowSlugs.map(slug => <li key={slug}><button type="button" onClick={() => openFlow(slug)}>{library.bundles.find(row => row.flow.slug === slug)?.flow.title ?? slug}{archived(slug) ? ' · 보관 대상' : ''}</button></li>)}</ul>
        <details><summary>Map 전체 원본 데이터</summary><pre>{JSON.stringify({ map, policy: library.policies.maps.find(row => row.mapId === map.id) }, null, 2)}</pre></details></section>}
      {bundle && <section aria-label="Flow 콘텐츠 상세">{map && <button type="button" disabled={busy} onClick={() => { setSelected(null); setVariant(false); }}>Map으로 돌아가기</button>}
        <h2 tabIndex={-1} ref={node => focusDetail(`flow:${bundle.flow.slug}:${variant}`, node)}>{bundle.flow.title}</h2><p>{variant ? '현재 작업 판본 · 2026-09-23' : '이전 PoC 원본 판본'}</p>
        {library.variants.some(row => row.slug === selected) && <button type="button" disabled={busy} onClick={() => setVariant(!variant)}>{variant ? '이전 PoC 원본 보기' : '현재 작업 판본 비교'}</button>}
        <p>{bundle.flow.description}</p><p>작성자: {bundle.flow.creator_name ?? '표시 없음'} · 출처 확인 기록: {bundle.flow.source_checked_at ?? '없음'} · 지금 다시 확인한 결과는 아닙니다.</p>
        {bundle.flow.source_url && /^https?:\/\//i.test(bundle.flow.source_url) && <a href={bundle.flow.source_url} target="_blank" rel="noopener noreferrer">원래 출처 열기</a>}
        {policy?.runtimeExcluded && <p>보관 대상 · 공개 제외 정책을 유지합니다. {policy.archive?.evidence}</p>}
        {bundle.flow.source_status === 'needs_review' && <p>출처 재검토 필요</p>}
        {[...new Set([bundle.flow.warning, bundle.flow.conversion_note, ...(bundle.warnings ?? [])].filter(Boolean))].map((warning, i) => <p key={i}>{warning}</p>)}
        <p>일정 기준: {bundle.flow.setup_anchor_label ?? ({ start_date: '시작일', end_date: '종료일', baby_age_month: '아이 개월 수', baby_birth_date: '아이 생일', none: '없음' })[bundle.flow.anchor_type]} {bundle.flow.setup_anchor_hint} · 개인 기준일은 설정하지 않았습니다.</p>
        {stored && navigate && <AlphaCatalogCopyActions key={`${bundle.flow.slug}:${variant}`} data={data} bundle={bundle} library={library} variant={variant} mutate={mutate}
          disabled={disabled} onBusyChange={setBusy} navigate={next => { closeDetail(); navigate(next); }} />}
        <CatalogLibraryContent bundle={bundle} />
        {bundle.flow.raw_text ? <details><summary>기존 원문 보기</summary><pre>{bundle.flow.raw_text}</pre></details> : <p>저장된 원문 없음 · 구조화된 콘텐츠만 보존되어 있습니다.</p>}
        <details><summary>전체 원본 데이터</summary><pre>{JSON.stringify({ bundle, policy }, null, 2)}</pre></details>
      </section>}
    </>}
    {message && <p role="status" aria-live="polite">{message}</p>}
  </details>;
}
