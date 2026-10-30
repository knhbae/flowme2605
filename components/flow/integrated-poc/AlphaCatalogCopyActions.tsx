'use client';
import React, { useMemo, useRef, useState } from 'react';
import { buildCatalogContent, catalogContentFingerprint, inspectCatalogContentCapability } from '@/lib/flow/integrated-poc/catalog-content';
import type { FlowBundle } from '@/lib/flow/types';
import type { CatalogLibrarySnapshot } from '@/lib/flow/integrated-poc/catalog-library';
import { canonicalJson } from '@/lib/flow/integrated-poc/alpha-persistence/json';
import { isNativeCreatorCatalogContentSource } from '@/lib/flow/integrated-poc/native-creator-document-contract';
import { executeAlphaCreatorIntent } from '@/lib/flow/integrated-poc/alpha-creator/dispatch';
import { programId, type ProgramData } from '@/lib/flow/integrated-poc/contract';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './AlphaCatalogContentImport.module.css';

const reasons: Record<string, string> = {
  archived: '보관·공개 제외 대상입니다. 원본 열람만 유지합니다.',
  'review-required': '출처 검토가 남아 있어 제작 연결을 보류했습니다.',
  'unsupported-shape': '반복·기간·식단 등 이 구조의 편집·실행 연결은 아직 지원하지 않습니다.',
  'projection-loss': '편집문 변환에서 항목이나 순서를 온전히 보존하지 못해 연결을 보류했습니다.',
  'not-enabled': '이 콘텐츠는 아직 제작 연결 검증을 마치지 않았습니다.',
};

/** Mounted by source identity. Opening/previewing never invokes a writer. */
export function AlphaCatalogCopyActions({ data, bundle, library, variant, mutate, navigate, disabled = false, onBusyChange }: {
  data: ProgramData; bundle: FlowBundle; library: CatalogLibrarySnapshot; variant: boolean; mutate: ProgramMutate; navigate: ProgramNavigate;
  disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const slug = bundle.flow.slug;
  const projected = useMemo(() => buildCatalogContent(slug, library), [slug, library]);
  const capability = useMemo(() => inspectCatalogContentCapability(slug, library), [slug, library]);
  const [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const running = useRef(false);
  const workspace = data.spaces[data.activeActorId]?.creatorWorkspace;
  const existing = Object.entries(workspace?.structureDrafts ?? {}).find(([, context]) => {
    const source = context.nativeDocument?.source;
    return source && isNativeCreatorCatalogContentSource(source) && source.sourceSlug === slug;
  });
  const normalized = { ...bundle, flow: { ...bundle.flow } };
  delete (normalized.flow as Partial<FlowBundle['flow']>).status;
  delete normalized.flow.usage_count; delete normalized.flow.copy_count;
  const sourceMatches = projected.ok && catalogContentFingerprint(normalized) === catalogContentFingerprint(projected.content.bundle)
    && canonicalJson(normalized) === canonicalJson(projected.content.bundle);
  const unavailable = variant ? '현재 작업 판본은 비교 열람만 가능합니다. 이전 PoC 원본 판본으로 돌아가 주세요.'
    : !projected.ok ? reasons[capability.ready ? 'not-enabled' : capability.reason] ?? '원본을 확인하지 못해 제작 연결을 보류했습니다.'
      : !sourceMatches ? '자료실 원본과 제작용 원본이 달라 연결하지 않았습니다.' : '';
  async function apply() {
    if (running.current || disabled || unavailable || existing || !preview || !projected.ok) return;
    running.current = true; setBusy(true); onBusyChange?.(true); setMessage('제작 사본을 저장하는 중…');
    const intent = { type: 'catalog-content-import' as const, sourceSlug: slug, sourceVersionId: projected.content.versionId,
      draftId: programId('creator'), now: new Date().toISOString() };
    const requestId = programId('catalog-import');
    try {
      const result = await mutate('자료실 콘텐츠 제작 사본 가져오기', current => executeAlphaCreatorIntent(current, current.activeActorId, intent, requestId), { alphaCreator: intent });
      if (!result.ok) { setMessage(programErrorMessage(result.reason)); return; }
      setPreview(false); setMessage('제작 사본을 저장했습니다. 사본을 열어 편집한 뒤 개인 실행은 별도로 확인해 주세요.');
    } catch { setMessage('저장 결과를 확인하지 못했습니다. 서버 상태를 확인한 뒤 다시 시도해 주세요.'); }
    finally { running.current = false; setBusy(false); onBusyChange?.(false); }
  }
  return <section className={styles.panel} aria-label="제작 사본 연결" onKeyDown={event => {
    if (event.key === 'Escape' && preview && !busy) { event.stopPropagation(); setPreview(false); setMessage('취소했습니다.'); }
  }}>
    <h3>이 콘텐츠로 Flow 만들기</h3>
    {unavailable ? <p>{unavailable}</p> : existing ? workspace?.library.records[existing[0]]?.status === 'active'
      ? <><p>이 원본에서 가져온 제작 사본이 있습니다. 새 사본을 중복 생성하지 않습니다.</p>
        <button type="button" disabled={disabled || busy} onClick={() => navigate({ view: 'creator', id: existing[0] })}>제작 사본 열기</button></>
      : <p>보관된 제작 사본이 있습니다. 제작 초안 목록에서 복원한 뒤 사용해 주세요. 새 사본으로 덮어쓰지 않습니다.</p>
      : <><p>원본은 그대로 두고 내 계정에 편집 사본을 만듭니다. 개인 일정·완료·메모는 생성하지 않습니다.</p>
        {!preview && <button type="button" disabled={disabled || busy} onClick={() => { setPreview(true); setMessage(''); }}>제작 사본 내용 확인</button>}
        {preview && projected.ok && <section aria-label="제작 사본 가져오기 확인">
          <p>{projected.content.bundle.sections.length}개 구간 · {projected.content.bundle.items.length}개 항목. 아래 글은 원본 구조에서 만든 편집문이며 기존 원문과 다를 수 있습니다.</p>
          <details><summary>생성될 편집문 보기</summary><pre>{projected.document.rawText}</pre></details>
          <p>저장 후 제작 사본을 열어 수정할 수 있습니다. 개인 실행으로 보내기는 별도 비교·선택·적용 단계입니다. 공개하지 않습니다.</p>
          <div className={styles.actions}><button type="button" disabled={disabled || busy} onClick={() => void apply()}>{busy ? '저장하는 중…' : '비공개 제작 사본으로 가져오기'}</button>
            <button type="button" disabled={busy} onClick={() => { setPreview(false); setMessage('취소했습니다.'); }}>취소</button></div>
        </section>}</>}
    {message && <p role="status" aria-live="polite">{existing && workspace?.library.records[existing[0]]?.status === 'active'
      ? '제작 사본을 저장했습니다. 사본을 열어 편집한 뒤 개인 실행은 별도로 확인해 주세요.' : message}</p>}
  </section>;
}
