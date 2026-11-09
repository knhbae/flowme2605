'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { ProgramData } from '../../../lib/flow/integrated-poc/contract';
import { programErrorMessage, type ProgramMutate, type ProgramNavigate } from '../../../lib/flow/integrated-poc/ui-contract';
import { archiveProgramPublication, createProgramRepublishDraft, publicationDraftAt, saveProgramPublicationDraft } from '../../../lib/flow/integrated-poc/publication-editor';
import { readProgramPublicationManagement, type ProgramPublicationEditMode } from '../../../lib/flow/integrated-poc/publication-management';
import { ProgramShareLink } from './ProgramShareLink';
import styles from './ProgramPublicationManagement.module.css';
import { ProgramIcon } from './icons';

export type ProgramPublicationManagementProps = {
  data: ProgramData; flowId: string; mutate: ProgramMutate; navigate: ProgramNavigate;
  onBack: () => void; onEdit: (documentId: string, mode: ProgramPublicationEditMode) => Promise<boolean>;
  onBeforeAction?: () => Promise<boolean>; disabled?: boolean;
};

/** Shared by the activity row and document-menu hosts; all writes retain the existing social intents. */
export function ProgramPublicationManagement(props: ProgramPublicationManagementProps) {
  return <PublicationManagementBody key={`${props.data.activeActorId}:${props.flowId}`} {...props} />;
}
function PublicationManagementBody({ data, flowId, mutate, navigate, onBack, onEdit, onBeforeAction, disabled = false }: ProgramPublicationManagementProps) {
  const actorId = data.activeActorId, dataRef = useRef(data); dataRef.current = data;
  const management = readProgramPublicationManagement(data, actorId, flowId);
  const [documentId, setDocumentId] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<{ documentId: string; versionId: string; title: string } | null>(null);
  const acting = useRef(false), mounted = useRef(true), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { mounted.current = true; heading.current?.focus(); return () => { mounted.current = false; }; }, []);
  const document = management?.documents.find(row => row.id === documentId) ?? management?.documents.find(row => row.canEditPublication && !row.archived) ?? management?.documents[0];
  const blocked = disabled || busy;
  async function run(action: () => Promise<void>) {
    if (disabled || acting.current) return;
    acting.current = true; setBusy(true); setMessage('');
    try { if ((!onBeforeAction || await onBeforeAction()) && mounted.current && dataRef.current.activeActorId === actorId) await action(); }
    catch { if (mounted.current) setMessage('결과를 확인하지 못했습니다. 현재 상태를 다시 확인해 주세요.'); }
    finally { acting.current = false; if (mounted.current) setBusy(false); }
  }
  async function edit(mode: ProgramPublicationEditMode) {
    if (!document || !document.canEditPublication || document.archived) return;
    await run(async () => { if (!await onEdit(document.id, mode) && mounted.current) setMessage('공개 초안을 열지 못했습니다. 저장 상태와 공개 연결을 확인해 주세요.'); });
  }
  async function republish() {
    if (!document || document.archived || !document.canEditPublication) return;
    await run(async () => {
      const current = dataRef.current, expected = publicationDraftAt(current, actorId, document.id);
      const draft = createProgramRepublishDraft(current, document.id, flowId, new Date().toISOString());
      if (!draft) { setMessage('이 문서의 공개 연결이나 초안이 바뀌었습니다. 현재 상태를 다시 확인해 주세요.'); return; }
      const result = await mutate('새 링크 공개 초안 준비', latest => saveProgramPublicationDraft(latest, actorId, draft, expected),
        { history: false, alphaSocial: { type: 'publication-save', draft, expected } });
      if (!result.ok) { if (mounted.current) setMessage(programErrorMessage(result.reason)); return; }
      if (!result.presentationPending && mounted.current) await onEdit(document.id, 'republish');
      else if (mounted.current) setMessage(programErrorMessage('presentation-pending'));
    });
  }
  async function archive() {
    const target = archiveTarget; if (!target) return;
    await run(async () => {
      const result = await mutate('공개 목록에서 내리기', current => archiveProgramPublication(current, actorId, target.documentId, flowId, target.versionId),
        { history: false, alphaSocial: { type: 'publication-archive', documentId: target.documentId, flowId, expectedVersionId: target.versionId } });
      if (!mounted.current) return;
      if (!result.ok) { setMessage(programErrorMessage(result.reason)); return; }
      setArchiveTarget(null); setMessage('공개 목록에서 내렸습니다. 기존 버전·개인 사본·작성 중인 초안은 그대로 보관했습니다.'); heading.current?.focus();
    });
  }
  const leave = (action: () => void) => void run(async () => { action(); });
  if (!management) return <section className={styles.management} aria-label="공개 관리"><h1 ref={heading} tabIndex={-1}>공개 관리</h1><p>현재 계정의 공개 Flow를 찾을 수 없습니다.</p><button type="button" disabled={blocked} onClick={() => leave(onBack)}>내 공개 Flow로</button></section>;
  const { flow, version, reviews, reactions } = management;
  const canEdit = !!document && document.canEditPublication && !document.archived;
  return <section className={styles.management} aria-label="공개 관리" data-publication-management={flow.id}>
    <header className={styles.header}><button type="button" aria-label="내 공개 Flow로 돌아가기" disabled={blocked} onClick={() => leave(onBack)}><ProgramIcon name="back" size={24} /></button><span>내 공개 Flow</span><h1 ref={heading} tabIndex={-1}>관리</h1></header>
    <div className={styles.card}><div className={styles.title}><h2>{version.title}</h2><span>버전 {version.number}</span></div>{version.summary && <p>{version.summary}</p>}<small>{flow.archived ? '공개 철회됨' : '공개 중'} · {version.createdAt.slice(0, 10)}</small></div>
    {document?.sourceChanged === true && <div className={styles.changed} role="status"><span>원래 글이 바뀌었습니다</span>{!flow.archived && <button type="button" disabled={blocked || !canEdit} onClick={() => void edit('new-version')}>새 버전 ›</button>}</div>}
    {message && <p role="status" className={styles.message}>{message}</p>}
    {management.documents.length > 1 && <label className={styles.documentPicker}>원래 글<select value={document?.id ?? ''} disabled={blocked} onChange={event => setDocumentId(event.target.value)}>{management.documents.map(row => <option value={row.id} key={row.id}>{row.title}{row.archived ? ' · 보관됨' : ''}</option>)}</select></label>}
    <div className={styles.actions}>
      {flow.archived ? <button type="button" disabled={blocked || !canEdit} onClick={() => void republish()}>새 링크로 다시 공개<span><ProgramIcon name="right" size={16} /></span></button>
        : <button type="button" disabled={blocked || !canEdit} onClick={() => void edit('new-version')}>새 버전 공개<small>① 고르기부터</small><span><ProgramIcon name="right" size={16} /></span></button>}
      {!flow.archived && <ProgramShareLink flowId={flow.id} versionId={version.id} />}
      <details className={styles.feedback} data-publication-feedback><summary>받은 후기·반응<small>후기 {reviews.length} · 반응 {reactions.length}</small></summary>
        <h3>받은 후기 {reviews.length}</h3>{reviews.length ? <ul>{reviews.map(post => <li key={post.id}><button type="button" disabled={blocked} onClick={() => leave(() => navigate({ view: 'community', id: post.id }))}><strong>{post.title}</strong><small>{data.actors.find(row => row.id === post.authorId)?.name ?? '작성자'} · {post.createdAt.slice(0, 10)}</small></button></li>)}</ul> : <p>아직 받은 후기가 없습니다.</p>}
        <h3>받은 반응 {reactions.length}</h3>{reactions.length ? <ul>{reactions.map(({ reaction, post, replyId }) => <li key={`${reaction.targetKind}:${reaction.targetId}:${reaction.actorId}`}><button type="button" disabled={blocked} onClick={() => leave(() => navigate({ view: 'community', id: post.id, ...(replyId ? { replyId } : {}) }))}><strong>{post.title}</strong><small>{data.actors.find(row => row.id === reaction.actorId)?.name ?? '참여자'} · 도움됐어요{replyId ? ' · 내 답글' : ''}</small></button></li>)}</ul> : <p>아직 받은 반응이 없습니다.</p>}
      </details>
      <button type="button" disabled={blocked || !document} onClick={() => document && leave(() => navigate({ view: 'space', id: document.id }))}>원래 글 열기<small>{document?.title ?? '연결된 문서 없음'}</small><span><ProgramIcon name="right" size={16} /></span></button>
      {!flow.archived && <button type="button" className={styles.danger} disabled={blocked || !management.archiveDocumentId} onClick={() => setArchiveTarget({ documentId: management.archiveDocumentId!, versionId: version.id, title: version.title })}>공개 내리기</button>}
    </div>
    {!canEdit && <p className={styles.hint}>{!document ? '이 Flow와 연결된 내 문서가 없습니다.' : document.archived ? '보관한 원래 글을 복원한 뒤 공개 초안을 이어 쓸 수 있습니다.' : '원래 글이나 편집 가능한 공개 연결을 확인하지 못했습니다.'}</p>}
    <p className={styles.hint}>내리면 Flow 찾기에서 빠집니다. 원래 글·이전 버전·이미 가져간 개인 사본은 남습니다.</p>
    <div className={styles.placeholder} aria-label="신고·숨김 준비 중">신고·숨김 · 준비 중</div>
    {archiveTarget && <section className={styles.confirmation} role="alertdialog" aria-modal="false" aria-label="공개 철회 확인" aria-labelledby="publication-archive-heading"><h2 id="publication-archive-heading">‘{archiveTarget.title}’ 공개를 철회할까요?</h2><p>공개 목록에서만 숨깁니다. 원문·이전 버전·개인 사본·현재 초안은 지우지 않습니다. 나중에 같은 문서를 새 링크로 다시 공개할 수 있습니다. 이 Flow의 링크로는 더 이상 가져오거나 출력할 수 없습니다.</p>{flow.currentVersionId !== archiveTarget.versionId && <p role="alert">확인 중 버전이 바뀌었습니다. 취소한 뒤 최신 제목과 버전으로 다시 확인해 주세요.</p>}<div><button type="button" autoFocus disabled={blocked} onClick={() => setArchiveTarget(null)}>취소 · 공개 유지</button><button type="button" className={styles.danger} disabled={blocked || flow.currentVersionId !== archiveTarget.versionId} onClick={() => void archive()}>확인 · 공개 철회하고 보관</button></div></section>}
  </section>;
}
