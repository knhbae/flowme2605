'use client';

import { useEffect, useRef, useState } from 'react';
import { programId, type ProgramData, type ProgramPrivateSpace, type ProgramTransition } from '@/lib/flow/integrated-poc/contract';
import { previewProgramDocumentRevisionRestore, restoreProgramDocumentRevision, restoreProgramRawRevisionAsDocument, saveProgramDocumentRevision, type ProgramRevisionPreview } from '@/lib/flow/integrated-poc/document-revisions';
import { textWorkspaceModel as M } from '@/lib/flow/integrated-poc/text-workspace';
import { programErrorMessage, type ProgramMutate } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './ProgramRevisionHistory.module.css';

export type ProgramRevisionHistoryProps = {
  data: ProgramData; mutate: ProgramMutate; documentId: string; onClose: () => void; today: string;
};
type Review = { preview: ProgramRevisionPreview; expectedSpace: ProgramPrivateSpace };

export function ProgramRevisionHistory({ data, mutate, documentId, onClose, today }: ProgramRevisionHistoryProps) {
  const actorId = data.activeActorId, space = data.spaces[actorId], doc = M.getDocument(space.text, documentId);
  const revisions = space.draftRevisions.filter(revision => revision.documentId === documentId).slice().reverse();
  const [selected, setSelected] = useState(revisions[0]?.id ?? '');
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const dialog = useRef<HTMLDialogElement>(null), pending = useRef(false);
  const target = revisions.find(revision => revision.id === selected);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    return () => { previous?.focus(); };
  }, []);
  async function commit(label: string, build: (current: ProgramData) => ProgramTransition<string>) {
    if (pending.current) return null;
    pending.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await mutate(label, build);
      if (!result.ok) { setError(programErrorMessage(result.reason)); return null; }
      return result;
    } catch { setError(programErrorMessage('storage-unavailable')); return null; }
    finally { pending.current = false; setBusy(false); }
  }
  function preview() {
    setError(''); setMessage('');
    const result = previewProgramDocumentRevisionRestore(data, { actorId, documentId, revisionId: selected });
    if (!result.ok) {
      setReview(null);
      setError(result.reason === 'unresolved' ? '현재 연결·폴더·본문 구조와 안전하게 합칠 수 없는 판본입니다. 본문을 확인하고 파일로 보관할 수 있습니다.' : programErrorMessage(result.reason));
      return;
    }
    // Retain the exact reviewed baseline; a later rerender must not bless stale intent.
    setReview({ preview: result.result, expectedSpace: space });
  }
  const exportRaw = () => {
    if (!target) return;
    const url = URL.createObjectURL(new Blob([target.raw], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${target.title.replace(/[\\/:*?"<>|]/g, '-')}-저장판본.txt`;
    link.click(); URL.revokeObjectURL(url);
  };
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="program-revision-heading" onCancel={event => { event.preventDefault(); if (!pending.current) onClose(); }}>
    <header className={styles.heading}><div><h2 id="program-revision-heading">문서 저장판본</h2><p>{doc?.title ?? '문서를 찾을 수 없습니다'}</p></div><button type="button" disabled={busy} onClick={onClose} aria-label="저장판본 닫기">닫기</button></header>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.status} role="status">{message}</p>}
    {doc && <>
      <section className={styles.section}><h3>현재 내용을 판본으로 남기기</h3><p>자동 저장과 별개입니다. 현재 저장된 문서의 본문·날짜·메모를 보관합니다.</p>
        <button type="button" disabled={busy} onClick={async () => {
          const input = { actorId, requestId: programId('revision-save'), expectedSpace: space, documentId }, now = new Date().toISOString();
          const result = await commit('문서 저장판본 남기기', current => saveProgramDocumentRevision(current, input, now));
          if (result) { setSelected(result.result); setReview(null); setMessage(result.changed === false ? '같은 내용의 저장판본이 이미 있습니다.' : '현재 저장된 내용을 판본으로 남겼습니다.'); }
        }}>현재 문서의 판본 저장</button><small>오늘 {today} · 아직 저장하지 못한 편집 입력은 포함하지 않습니다.</small>
      </section>
      <section className={styles.section}><h3>저장한 내용 확인</h3>
        {!revisions.length ? <p>직접 저장한 판본이 아직 없습니다. 이전 판본을 임의로 만들어 표시하지 않습니다.</p> : <>
          <label>저장판본<select disabled={busy} value={selected} onChange={event => { setSelected(event.target.value); setReview(null); setError(''); setMessage(''); }}>
            <option value="" disabled>판본 선택</option>{revisions.map((revision, index) => <option key={revision.id} value={revision.id}>#{revisions.length - index} · {revision.createdAt.slice(0, 16).replace('T', ' ')} UTC · {revision.identity ? '행 ID 있음' : '본문만 있음'}</option>)}
          </select></label>
          {target && <><pre className={styles.raw}>{target.raw || '(빈 문서)'}</pre><div className={styles.actions}>
            <button type="button" disabled={busy} onClick={preview}>복구 전 비교</button><button type="button" onClick={exportRaw}>이 판본 TXT 보관</button>
          </div></>}
        </>}
      </section>
      {review && <section className={styles.section} aria-label="복구 전 비교"><h3>{review.preview.mode === 'same-document' ? '이 문서의 내용 복구' : '새 문서로 복구'}</h3>
        {review.preview.mode === 'same-document' ? <>
          <p>제목·본문·실행 날짜·메모를 선택한 판본으로 되돌립니다. 현재 누적 진행과 날짜별 진행 기록은 되돌리지 않습니다.</p>
          <p>다른 문서의 독립 내용은 유지합니다. 연결 행의 제목과 완료 표시는 현재 원본에 맞춥니다.</p>
          {(review.preview.retainedItemIds.length > 0 || review.preview.reactivatedItemIds.length > 0) && <p>빠지는 항목 {review.preview.retainedItemIds.length}개는 같은 ID로 보관하고, 보관했던 항목 {review.preview.reactivatedItemIds.length}개는 다시 꺼냅니다.</p>}
        </> : <p>이 판본은 행 ID가 없어 기존 항목과 안전하게 연결할 수 없습니다. 현재 문서와 진행 기록은 그대로 두고 별도 문서에 본문을 복구합니다.</p>}
        <div className={styles.compare}><div><h4>현재 저장된 본문</h4><pre className={styles.raw}>{review.preview.beforeRaw || '(빈 문서)'}</pre></div><div><h4>복구 후 본문</h4><pre className={styles.raw}>{review.preview.effectiveRaw || '(빈 문서)'}</pre></div></div>
        {review.preview.completionAdjustedIds.length > 0 && <small>저장판본의 체크 표시 {review.preview.completionAdjustedIds.length}개를 현재 누적 진행에 맞췄습니다.</small>}
        <div className={styles.actions}><button type="button" disabled={busy} onClick={() => setReview(null)}>취소</button><button className={styles.primary} type="button" disabled={busy} onClick={async () => {
          const input = { actorId, requestId: programId('revision-restore'), expectedSpace: review.expectedSpace, documentId, revisionId: review.preview.revisionId };
          const result = await commit('문서 저장판본 복구', current => review.preview.mode === 'same-document' ? restoreProgramDocumentRevision(current, input) : restoreProgramRawRevisionAsDocument(current, input));
          if (result) { setReview(null); setMessage(review.preview.mode === 'same-document' ? '내용을 복구했습니다. 상단 실행 취소로 복구 전 상태로 돌아갈 수 있습니다.' : '새 문서에 본문을 복구했습니다. 문서 목록에서 확인할 수 있습니다.'); }
        }}>{busy ? '저장 중…' : review.preview.mode === 'same-document' ? '확인한 내용으로 복구' : '새 문서에 복구'}</button></div>
      </section>}
    </>}
  </dialog>;
}
export default ProgramRevisionHistory;
