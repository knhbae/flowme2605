'use client';

import React, { useRef, useState } from 'react';
import type { ProgramData, ProgramPrivateSpace } from '@/lib/flow/integrated-poc/contract';
import { inspectProgramTaskDocumentMove } from '@/lib/flow/integrated-poc/task-document-move';
import { programErrorMessage, type ProgramMutationResult } from '@/lib/flow/integrated-poc/ui-contract';
import styles from './ProgramDocumentLifecycle.module.css';

export function ProgramTaskDocumentMove({ data, taskId, disabled, onMove, onOpen }: {
  data: ProgramData; taskId: string; disabled?: boolean;
  onMove: (destinationId: string, expected: ProgramPrivateSpace) => Promise<ProgramMutationResult>;
  onOpen: (documentId: string, taskId: string) => void;
}) {
  const space = data.spaces[data.activeActorId], inspected = inspectProgramTaskDocumentMove(space, taskId);
  const [destination, setDestination] = useState(''), [message, setMessage] = useState(''), [failed, setFailed] = useState(false), [busy, setBusy] = useState(false);
  const pending = useRef(false), expected = useRef<ProgramPrivateSpace | null>(null);
  const [movedTo, setMovedTo] = useState<string | null>(null);
  if (!inspected.ok) return inspected.reason === 'source-owned' ? <p className={styles.hint}>Flow 항목은 소속을 유지합니다. 다른 문서에서는 같은 항목을 연결해 사용하세요.</p> : null;
  const choices = space.text.documents.filter(doc => !space.archivedDocumentIds.includes(doc.id));
  const reset = () => { setDestination(''); setMessage(''); setFailed(false); expected.current = null; };
  return <details className={styles.tools} onToggle={event => { if (!event.currentTarget.open && !pending.current) reset(); }}>
    <summary>할 일의 원문을 다른 문서로 이동</summary>
    <form onKeyDown={event => { if (event.key === 'Escape' && !pending.current && destination) { event.preventDefault(); event.stopPropagation(); reset(); } }} onSubmit={async event => {
      event.preventDefault(); if (pending.current || disabled || !destination) return;
      pending.current = true; setBusy(true); setMessage('');
      try {
        const result = await onMove(destination, expected.current ?? space);
        setFailed(!result.ok);
        if (result.ok) { setMessage(result.changed === false ? '이미 같은 문서에 있습니다.' : '하위 내용과 진행 기록을 유지하며 옮겼습니다.'); setMovedTo(destination); expected.current = null; }
        else setMessage(programErrorMessage(result.reason));
      } catch { setFailed(true); setMessage(programErrorMessage('storage-unavailable')); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <p className={styles.hint}>참조 추가와 다릅니다. 원문과 하위 내용을 옮기며 날짜·폴더 소속·진행 기록은 유지합니다.</p>
      <label>옮길 문서<select value={destination} disabled={disabled || busy} onChange={event => { expected.current = space; setDestination(event.target.value); setMovedTo(null); setMessage(''); }}>
        <option value="">문서 선택</option>{choices.map(doc => <option key={doc.id} value={doc.id}>{doc.title}{doc.id === inspected.task.docId ? ' · 현재 문서' : ''}</option>)}
      </select></label>
      <div className={styles.actions}><button type="submit" disabled={disabled || busy || !destination}>{busy ? '옮기는 중' : '이 문서로 이동'}</button><button type="button" disabled={disabled || busy} onClick={reset}>이동 취소</button></div>
      {message && <p role={failed ? 'alert' : 'status'}>{message}</p>}
      {failed && <button type="button" disabled={busy} onClick={reset}>현재 상태에서 다시 선택</button>}
      {movedTo && <button type="button" disabled={busy} onClick={() => onOpen(movedTo, taskId)}>옮긴 문서 열기</button>}
    </form>
  </details>;
}
