import React from 'react';
import type { CreatorUpdateChoice } from '@/lib/flow/integrated-poc/creator-update';
import type { ProgramNativeHandoffPreview } from '@/lib/flow/integrated-poc/creator-native-execution-adapter';
import styles from './ProgramCreatorNativeHandoff.module.css';

export function programNativeHandoffChoices(preview: ProgramNativeHandoffPreview): Record<string, CreatorUpdateChoice> {
  return Object.fromEntries(preview.rows.map(row => [row.itemId,
    { source: !preview.documentId && row.incomingKind ? 'incoming' : 'keep', date: 'keep', time: 'keep', children: 'keep' },
  ]));
}
export function programNativeHandoffHasSelection(choices: Record<string, CreatorUpdateChoice>) {
  return Object.values(choices).some(choice => Object.values(choice).some(value => value === 'incoming'));
}
export type ProgramCreatorNativeHandoffProps = {
  preview: ProgramNativeHandoffPreview;
  choices: Record<string, CreatorUpdateChoice>;
  busy: boolean;
  feedback?: { error: boolean; text: string };
  onChange: (itemId: string, field: keyof CreatorUpdateChoice, value: 'keep' | 'incoming') => void;
  onApply: () => void;
  onCancel: () => void;
  onRefresh: () => void;
};
export function ProgramCreatorNativeHandoff({ preview, choices, busy, feedback, onChange, onApply, onCancel, onRefresh }: ProgramCreatorNativeHandoffProps) {
  return <section className={styles.review} aria-label="제작 설정과 개인 실행 비교" aria-busy={busy}
    onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing && !busy) { event.preventDefault(); event.stopPropagation(); onCancel(); } }}>
    <h2 tabIndex={-1}>{preview.documentId ? '개인 수정과 새 제작 내용 비교' : '개인 문서로 가져올 내용'}</h2>
    <p>{preview.documentId ? '선택한 내용만 반영합니다. 선택하지 않은 개인 날짜·메모·진행 기록은 유지합니다.' : '포함된 항목만 새 개인 문서에 가져옵니다. 제작 원문의 체크 상태를 내 완료 기록으로 복사하지 않습니다.'}</p>
    <p>제작 설정 {preview.contextRevision} · {preview.rows.length}개 비교</p>
    {preview.rows.length === 0 && <p>가져올 항목이 없습니다. 원문에서 포함 여부와 검토 항목을 확인해 주세요.</p>}
    {preview.rows.map(row => {
      const choice = choices[row.itemId] ?? { source: 'keep', date: 'keep', time: 'keep', children: 'keep' };
      const hasPersonal = !!row.personal;
      return <fieldset key={row.itemId} className={styles.item} disabled={busy}>
        <legend>{row.title || '제목 없는 항목'} · {row.kind === 'added' ? '새 항목' : row.kind === 'removed' ? '이번 제작 결과에서 빠짐' : '기존 항목'}</legend>
        <div className={styles.columns}>
          {hasPersonal && <details><summary>이전에 가져온 내용</summary><pre tabIndex={0}>{row.previous || '이전 내용 없음'}</pre></details>}
          {hasPersonal && <details open><summary>현재 내 내용</summary><pre tabIndex={0}>{row.personal}</pre></details>}
          <details open><summary>이번 제작 내용</summary><pre tabIndex={0}>{row.incoming || '이번 결과에 포함되지 않습니다.'}</pre></details>
        </div>
        {row.kind === 'removed' && !hasPersonal ? <p>제작 결과에서 제외된 항목은 가져오지 않습니다.</p> : <label>내용 반영<select value={choice.source} onChange={event => onChange(row.itemId, 'source', event.target.value as 'keep' | 'incoming')}>
          <option value="keep">{hasPersonal ? '현재 내 내용 유지' : '가져오지 않기'}</option>
          <option value="incoming">{row.kind === 'removed' ? '현재 항목을 이전 기록으로 보관' : row.mode === 'replace' ? '이전 기록을 남기고 새 실행으로 가져오기' : hasPersonal ? '이번 제작 내용 반영' : '개인 문서로 가져오기'}</option>
        </select></label>}
        {row.mode === 'replace' && <p>종류가 바뀌었거나 보관된 항목입니다. 가져오면 이전 날짜·메모·진행 기록은 보관하고, 이번 제작 날짜·시간·하위 항목으로 새 실행을 만듭니다.</p>}
        {row.fieldUpdatesAllowed && <details><summary>날짜·시간·하위 체크 선택</summary>
          <div className={styles.fields}>{(['date', 'time', 'children'] as const).map(field => <label key={field}>
            {field === 'date' ? '개인 실행 날짜' : field === 'time' ? '개인 시간' : '하위 체크'}
            <select value={choice[field]} onChange={event => onChange(row.itemId, field, event.target.value as 'keep' | 'incoming')}>
              <option value="keep">현재 내 값 유지</option><option value="incoming">{field === 'date' ? `제작 날짜 반영 (${row.sourceDate ?? '날짜 미정'})` : field === 'time' ? `제작 시간 반영 (${row.sourceTime ?? '시간 미정'})` : '제작 하위 체크 반영'}</option>
            </select></label>)}</div>
          <p>바뀌어 빠지는 하위 항목과 지난 실행 기록은 보관합니다. 원래 일정과 공개 내용은 바꾸지 않습니다.</p>
        </details>}
      </fieldset>;
    })}
    {feedback?.text && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? styles.error : undefined}>{feedback.text}</p>}
    <div className={styles.actions}>
      <button className={styles.primary} disabled={busy || !programNativeHandoffHasSelection(choices)} onClick={onApply}>{busy ? '개인 실행 연결 저장 중…' : '선택한 내용으로 개인 실행 연결'}</button>
      <button disabled={busy} onClick={onCancel}>모두 유지하고 닫기</button>
      <button disabled={busy} onClick={onRefresh}>최신 내용으로 다시 비교</button>
    </div>
  </section>;
}
