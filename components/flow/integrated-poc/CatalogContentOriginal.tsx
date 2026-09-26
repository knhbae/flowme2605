import React from 'react';
import type { NativeCreatorCatalogContentSource } from '@/lib/flow/integrated-poc/native-creator-document-contract';
import { projectCatalogContent } from '@/lib/flow/integrated-poc/catalog-content';
import { CatalogLibraryContent } from './CatalogLibraryContent';
import type { FlowBundle } from '@/lib/flow/types';

export function CatalogContentOriginal({ source }: { source: NativeCreatorCatalogContentSource }) {
  let result;
  try { result = projectCatalogContent(JSON.parse(source.contentJson)); } catch { return <p>기존 콘텐츠 원본을 확인하지 못했습니다.</p>; }
  if (!result.ok) return <p>기존 콘텐츠 원본을 확인하지 못했습니다.</p>;
  const { flow, sections, items } = result.content.bundle;
  return <details><summary>가져온 Flow의 원문·출처</summary>
    <p>기존 콘텐츠 {sections.length}개 구간 · {items.length}개 항목. 현재 편집본과 구분해 보관한 원본입니다.</p>
    <p>{flow.description}</p><p>원래 작성자: {flow.creator_name ?? '표시 없음'}</p>
    <a href={flow.source_url} target="_blank" rel="noopener noreferrer">{flow.source_title ?? '원래 출처'}</a>
    {flow.warning && <p>{flow.warning}</p>}{flow.conversion_note && <p>{flow.conversion_note}</p>}
    {flow.source_status === 'needs_review' && <p>출처 재검토 필요</p>}
    {flow.source_checked_at && <p>기존 출처 확인 기록: {flow.source_checked_at}. 이번에 다시 확인한 날짜가 아닙니다.</p>}
    <p>{flow.anchor_type === 'none' ? '일정 기준 없음' : `${flow.setup_anchor_label ?? '기준일'}: 실행할 때 지정`} · 사용 기록은 가져오지 않음</p>
    {flow.raw_text ? <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{flow.raw_text}</pre> : <p>저장된 원문 없음 · 편집문은 아래 원본 구조에서 생성했습니다.</p>}
    <details><summary>가져올 때의 전체 원본 구조·안내</summary>
      <p>현재 편집 내용과 별도로 보관한 원본입니다. 완료 표시나 개인 사용 기록이 아닙니다.</p>
      {(result.content.bundle.warnings ?? []).map((warning, i) => <p key={i}>{warning}</p>)}
      <CatalogLibraryContent bundle={{ ...result.content.bundle, flow: { ...flow, status: 'published' } } as FlowBundle} />
    </details>
  </details>;
}
