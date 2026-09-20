'use client';
import React, { useCallback, useMemo } from 'react';
import type { ProgramData } from '@/lib/flow/integrated-poc/contract';
import type { ProgramDestination, ProgramMutate } from '@/lib/flow/integrated-poc/ui-contract';
import type { ProgramEditorFlush } from '@/lib/flow/integrated-poc/document-action';
import { readProgramOutputReturnTarget } from '@/lib/flow/integrated-poc/output-return-target';
import { ProgramRecurrence } from './ProgramRecurrence';

export type ProgramOutputReturnProps = { data: ProgramData; destination: ProgramDestination; today: string; mutate: ProgramMutate;
  onOpenSource: (documentId: string, lineId: string) => void;
  onRegisterEditors?: (port: ProgramEditorFlush | null, key: string) => void;
  onUndo: () => Promise<void>; onRedo: () => Promise<void> };
export function ProgramOutputReturn({ data, destination, today, mutate, onOpenSource, onRegisterEditors, onUndo, onRedo }: ProgramOutputReturnProps) {
  const target = useMemo(() => readProgramOutputReturnTarget(data, destination, today), [data, destination, today]);
  const key = target.kind === 'occurrence' ? target.row.key : '';
  const register = useCallback((port: ProgramEditorFlush | null) => { if (key) onRegisterEditors?.(port, key); }, [key, onRegisterEditors]);
  return <section aria-label="내보낸 항목으로 돌아오기">
    <h2>내보낸 항목으로 돌아왔습니다</h2>
    <p>현재 저장된 항목을 확인합니다. 파일의 내용이나 날짜를 자동으로 가져오지 않습니다.</p>
    {target.kind === 'unavailable' ? <p role="status">{target.reason}</p> : target.kind === 'task' ? <p>{target.title}</p>
      : <ProgramRecurrence data={data} mutate={mutate} today={today} period="all" date={today} row={target.row} documentId={target.documentId}
        onOpenSource={onOpenSource} onRegisterEditors={register} onUndo={onUndo} onRedo={onRedo} />}
    {target.documentId && target.lineId && <button type="button" style={{ minHeight: 44 }} onClick={() => onOpenSource(target.documentId!, target.lineId!)}>원래 문서의 이 행 열기</button>}
  </section>;
}
export default ProgramOutputReturn;
