'use client';

import React, { useRef, useState } from 'react';
import type { ProgramPrivateSpace } from '@/lib/flow/integrated-poc/contract';
import type { ProgramMutationResult } from '@/lib/flow/integrated-poc/ui-contract';
import { programErrorMessage } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './ProgramDocumentLifecycle.module.css';

export function ProgramDocumentTrash({ space, onOpen }: { space: ProgramPrivateSpace; onOpen: (id: string) => void }) {
  const docs = [...space.text.documents, ...space.text.flows].filter(doc => space.documentTrash?.[doc.id]);
  return <details className={styles.tools}>
    <summary>휴지통{docs.length ? ` · ${docs.length}` : ''}</summary>
    {docs.length ? <ul className={styles.list}>{docs.map(doc => <li key={doc.id}><button type="button" onClick={() => onOpen(doc.id)}>{doc.title}<small>내용 확인·복원</small></button></li>)}</ul> : <p className={styles.hint}>휴지통이 비어 있습니다.</p>}
  </details>;
}

export function ProgramDocumentTrashAction({ space, documentId, disabled, onChange }: {
  space: ProgramPrivateSpace; documentId: string; disabled?: boolean; onChange: (trashed: boolean) => Promise<ProgramMutationResult>;
}) {
  const trashed = !!space.documentTrash?.[documentId];
  const [confirming, setConfirming] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const pending = useRef(false);
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
