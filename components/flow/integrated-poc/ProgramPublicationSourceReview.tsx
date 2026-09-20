'use client';
import React, { useEffect, useRef } from 'react';
import { PROGRAM_PUBLICATION_SOURCE_FIELDS, type ProgramPublicationSourceField, type ProgramPublicationSourceReview } from '@/lib/flow/integrated-poc/publication-ordinary-source';
import { programOrdinaryTimingLabel } from '@/lib/flow/integrated-poc/public-ordinary-time';

const labels: Record<ProgramPublicationSourceField, string> = { title: '제목', description: '설명·자료', completionCriteria: '완료 조건', sourceUrl: '항목 출처', timing: '시간·시간대' };
export function ProgramPublicationSourceReviewPanel({ review, fields, disabled, onFields, onApply, onCancel, styles }: {
  review: ProgramPublicationSourceReview; fields: ProgramPublicationSourceField[]; disabled: boolean;
  onFields: (fields: ProgramPublicationSourceField[]) => void; onApply: () => void; onCancel: () => void; styles: Record<string, string>;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const current = (field: ProgramPublicationSourceField) => field === 'timing' ? [review.row.timing?.time, review.row.timing?.timeZone].filter(Boolean).join(' · ') : review.row[field];
  const incoming = (field: ProgramPublicationSourceField) => field === 'timing' ? programOrdinaryTimingLabel(review.source.values.timing) : review.source.values[field];
  useEffect(() => { heading.current?.focus(); }, []);
  return <section className={styles.sourceComparison} aria-label="원문 내용과 공개 초안 비교" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!disabled) onCancel(); }
  }}>
    <h4 ref={heading} tabIndex={-1}>공개 초안에 가져올 원문 내용</h4>
    <p>연결된 제작 원본에서 읽었습니다. 선택한 필드만 바꾸며 개인 메모·진행·실행 날짜는 가져오지 않습니다.</p>
    {PROGRAM_PUBLICATION_SOURCE_FIELDS.map(field => <fieldset key={field} disabled={disabled}>
      <legend>{labels[field]}</legend>
      <div className={styles.sourceValues}><div><strong>현재 공개 초안</strong><pre>{current(field) || '내용 없음'}</pre></div><div><strong>연결된 원문</strong><pre>{incoming(field) || '내용 없음'}</pre></div></div>
      <label className={styles.check}><input type="checkbox" checked={fields.includes(field)} onChange={event => onFields(event.target.checked ? [...fields, field] : fields.filter(value => value !== field))} />원문의 {labels[field]} 가져오기{current(field) === incoming(field) ? ' · 같은 내용' : ''}</label>
    </fieldset>)}
    <button type="button" disabled={disabled || fields.length === 0} onClick={onApply}>선택한 원문 내용으로 초안 저장</button>
    <button type="button" disabled={disabled} onClick={onCancel}>취소 · 공개 초안 유지</button>
  </section>;
}
