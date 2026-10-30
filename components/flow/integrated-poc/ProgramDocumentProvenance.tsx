'use client';

import type { ProgramData } from '../../../lib/flow/integrated-poc/contract';
import { programDocumentCreatorDestination, readProgramDocumentCreatorLink } from '../../../lib/flow/integrated-poc/document-creator-provenance';
import styles from './ProgramDocumentProvenance.module.css';
import { CatalogContentOriginal } from './CatalogContentOriginal';
import { isNativeCreatorCatalogContentSource } from '../../../lib/flow/integrated-poc/native-creator-document-contract';

export type ProgramDocumentProvenanceProps = { data: ProgramData; documentId: string; onOpenRevisions?: () => void;
  onOpenCreatorDraft?: (draftId: string) => void; disabled?: boolean };

/** Private captured provenance, never a claim that the legacy library is synchronized. */
export function ProgramDocumentProvenance({ data, documentId, onOpenRevisions, onOpenCreatorDraft, disabled }: ProgramDocumentProvenanceProps) {
  const link = readProgramDocumentCreatorLink(data, documentId);
  if (link.status === 'unavailable') return null;
  const space = Object.hasOwn(data.spaces, data.activeActorId) ? data.spaces[data.activeActorId] : undefined;
  const imported = space?.creatorDraftImports?.find(entry => entry.documentId === documentId);
  if (!imported && link.status === 'unlinked') return null;
  const destination = programDocumentCreatorDestination(link);
  const nativeOwners = Object.values(space?.creatorWorkspace?.nativeExecutionSources ?? {}).filter(owner => owner.documentId === documentId);
  const nativeOwner = nativeOwners.length === 1 ? nativeOwners[0] : undefined;
  const capturedSource = nativeOwner?.revisions.find(revision => revision.id === nativeOwner.currentRevisionId)?.nativeDocument.source;
  return <>
    {link.status === 'ambiguous' ? <section className={styles.provenance} aria-label="제작 초안 연결 확인"><p>이 문서에 연결된 제작 초안을 하나로 확인할 수 없습니다. 다른 초안으로 이동하거나 새 초안을 만들지 않았습니다.</p></section>
      : link.status !== 'unlinked' && <details className={styles.provenance}>
        <summary>연결된 제작 초안</summary>
        <p>{link.currentTitle ?? link.handoffTitle} · 이 문서로 인계한 저장 판본 {link.handoffRevision}</p>
        {link.currentRevision !== null && <p className={styles.meta}>현재 제작 초안의 저장 판본 {link.currentRevision}{link.currentRevision !== link.handoffRevision ? ' · 인계한 판본 이후 저장 상태가 있습니다.' : ''}</p>}
        <p className={styles.meta}>제작 초안 ID: {link.draftId}{link.originalDraftId && <> · 처음 가져온 CreatorDraft ID: {link.originalDraftId}</>}</p>
        <p>제작 초안을 다시 열어도 이 개인 문서와 자동으로 동기화되지 않습니다. 제작 화면에서 명시적으로 인계할 때 같은 문서를 확인하며, 개인 수정과 충돌하면 덮어쓰지 않습니다. 원문은 자동으로 공개되지 않습니다.</p>
        {link.status === 'archived' && <p>보관한 제작 초안입니다. 같은 초안을 열어 복원한 뒤 제작을 계속할 수 있습니다.</p>}
        {link.status === 'missing' && <p>연결된 제작 초안을 현재 개인 보관함에서 찾을 수 없습니다. 삭제·복구 상태를 확인해 주세요. 개인 문서와 아래 인계 내용은 유지되며 다른 초안으로 대신 이동하지 않습니다.</p>}
        {destination && onOpenCreatorDraft && <button type="button" disabled={disabled} onClick={() => onOpenCreatorDraft(destination.id)}>{link.status === 'archived' ? '보관한 제작 초안 열기' : '제작 계속하기'}</button>}
        <details><summary>마지막으로 인계한 내용</summary><p>개인 문서에 마지막으로 인계한 제목·본문입니다. 제작 원문의 전체 판본 이력은 아닙니다.</p><p>{link.handoffTitle}</p><pre>{link.handoffRaw || '(빈 본문)'}</pre></details>
      </details>}
    {capturedSource && isNativeCreatorCatalogContentSource(capturedSource) && <section className={styles.provenance} aria-label="실행에 연결된 Flow 원본 안내"><CatalogContentOriginal source={capturedSource} /></section>}
    {imported && <details className={styles.provenance}>
    <summary>가져온 제작 초안 확인</summary>
    <p>{imported.source.current.title} · 원래 초안의 저장 상태 {imported.source.current.recordRevision}</p>
    <p className={styles.meta}>가져온 시각 {imported.importedAt.slice(0, 16).replace('T', ' ')} UTC · 가져올 당시 {imported.source.current.status === 'archived' ? '보관된 초안' : '사용 중인 초안'}</p>
    <p>아래는 가져올 당시 보존한 원문입니다. 지금 편집하는 개인 문서와 기존 제작 보관함은 자동으로 동기화되지 않습니다. 이 원문은 공개 미리보기에 자동 포함되지 않습니다.</p>
    <details><summary>가져온 당시 원문</summary><pre>{imported.source.current.rawText || '(빈 초안)'}</pre></details>
    {imported.source.undo ? <details><summary>실제로 남아 있던 직전 저장 상태</summary>
      <p>{imported.source.undo.record.title} · 저장 상태 {imported.source.undo.record.recordRevision} · {imported.source.undo.record.updatedAt.slice(0, 16).replace('T', ' ')} UTC</p>
      <pre>{imported.source.undo.record.rawText || '(빈 초안)'}</pre>
      {imported.undoRevisionId && onOpenRevisions ? <button type="button" disabled={disabled} onClick={onOpenRevisions}>직전 본문 복구 검토</button>
        : !imported.undoRevisionId && <p>본문·제목이 같아 별도의 본문 판본을 만들지 않았습니다.</p>}
    </details> : <p>이 초안에 대해 별도로 보존된 직전 상태는 없습니다.</p>}
  </details>}
  </>;
}
