'use client';

import React, { useMemo, useRef, useState } from 'react';
import type { ProgramPrivateSpace } from '@/lib/flow/integrated-poc/contract';
import { programId } from '@/lib/flow/integrated-poc/contract';
import { PROGRAM_TRASH_DOCUMENT_ID, programTrashBundles, reviveProgramTrashBundle } from '@/lib/flow/integrated-poc/first-cleanup';
import type { ProgramMutationResult, ProgramMutate } from '@/lib/flow/integrated-poc/ui-contract';
import { programErrorMessage } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './ProgramDocumentLifecycle.module.css';

export function ProgramDocumentTrash({ space, onOpen, actorId, mutate, disabled }: {
  space: ProgramPrivateSpace; onOpen: (id: string) => void; actorId: string; mutate: ProgramMutate; disabled?: boolean;
}) {
  const docs = [...space.text.documents, ...space.text.flows].filter(doc => doc.id !== PROGRAM_TRASH_DOCUMENT_ID && space.documentTrash?.[doc.id]);
  const bundles = useMemo(() => programTrashBundles(space), [space]);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const pending = useRef(false);
  async function revive(lineId: string) {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const result = await mutate('버린 할 일 되살리기', current => reviveProgramTrashBundle(current, {
        actorId, requestId: programId('trash-revive'), expectedSpace: current.spaces[actorId], lineId,
      }), { history: true, awaitAutomaticRead: true });
      setFailed(!result.ok);
      setMessage(result.ok ? '할 일 묶음을 되살렸습니다. 원래 글이 없으면 날짜 미정으로 돌아갑니다.' : programErrorMessage(result.reason));
    } catch { setFailed(true); setMessage(programErrorMessage('storage-unavailable')); }
    finally { pending.current = false; setBusy(false); }
  }
  return <details className={styles.tools}>
    <summary>휴지통{docs.length + bundles.length ? ` · ${docs.length + bundles.length}` : ''}</summary>
    <section aria-label="버린 할 일"><h3>버린 할 일{bundles.length ? ` · ${bundles.length}` : ''}</h3>
      {bundles.length ? <ul className={styles.list}>{bundles.map(bundle => <li key={bundle.lineId} data-trash-bundle={bundle.lineId}>
        <span>{bundle.title}<small>{bundle.day} · {bundle.documentTitle}{bundle.folder ? ` · /${bundle.folder}` : ''}</small></span>
        <button type="button" disabled={disabled || busy} onClick={() => void revive(bundle.lineId)}>되살리기</button>
      </li>)}</ul> : <p className={styles.hint}>버린 할 일이 없습니다.</p>}
    </section>
    <section aria-label="지운 글"><h3>지운 글{docs.length ? ` · ${docs.length}` : ''}</h3>
      {docs.length ? <ul className={styles.list}>{docs.map(doc => <li key={doc.id}><button type="button" onClick={() => onOpen(doc.id)}>{doc.title}<small>내용 확인·복원</small></button></li>)}</ul> : <p className={styles.hint}>지운 글이 없습니다.</p>}
    </section>
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
  </details>;
}

export function ProgramDocumentTrashAction({ space, documentId, disabled, onChange }: {
  space: ProgramPrivateSpace; documentId: string; disabled?: boolean; onChange: (trashed: boolean) => Promise<ProgramMutationResult>;
}) {
  const trashed = !!space.documentTrash?.[documentId];
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const pending = useRef(false);
  // The fixed container is never restored as an ordinary document: each bundle has its own origin and records.
  if (documentId === PROGRAM_TRASH_DOCUMENT_ID) return <p className={styles.hint}>버린 할 일은 휴지통에서 묶음별로 되살릴 수 있습니다.</p>;
  async function change(next: boolean) {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true); setMessage('');
    try {
      const result = await onChange(next); setFailed(!result.ok);
      if (result.ok) { setConfirming(false); setMessage(next ? '휴지통으로 옮겼습니다. 내용과 연결은 보존됩니다.' : '삭제 전 위치로 복원했습니다.'); }
      else setMessage(programErrorMessage(result.reason));
    } catch { setFailed(true); setMessage(programErrorMessage('storage-unavailable')); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className={styles.tools} onKeyDown={event => { if (event.key === 'Escape' && confirming && !pending.current) { event.preventDefault(); event.stopPropagation(); setConfirming(false); setMessage(''); } }}>
    {trashed ? <><p className={styles.hint}>휴지통의 문서입니다. 원문·진행 기록·다른 문서의 연결은 남아 있습니다.</p><button disabled={disabled || busy} onClick={() => void change(false)}>{busy ? '복원 중' : '휴지통에서 복원'}</button></>
      : !confirming ? <button disabled={disabled || busy} onClick={() => { setConfirming(true); setMessage(''); }}>문서 삭제…</button>
        : <><p>이 문서를 휴지통으로 옮길까요? 기간 목록에서는 숨겨집니다. 공개한 Flow와 원본은 삭제하지 않습니다.</p><div className={styles.actions}><button disabled={disabled || busy} onClick={() => void change(true)}>{busy ? '옮기는 중' : '휴지통으로 이동'}</button><button disabled={disabled || busy} onClick={() => setConfirming(false)}>삭제 취소</button></div></>}
    {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
  </div>;
}
