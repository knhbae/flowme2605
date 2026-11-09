'use client';

import React, { useEffect, useRef } from 'react';
import type { ProgramData, ProgramPublicationDraft, ProgramPublicationDraftRow, ProgramPublicFlow, ProgramPublicVersion } from '@/lib/flow/integrated-poc/contract';
import { programPublicationPickGroups } from '@/lib/flow/integrated-poc/publication-steps';
import { programCalendarDate } from '@/lib/flow/integrated-poc/date-label';
import { programFlowCardLines } from '@/lib/flow/integrated-poc/program-discovery-display';
import type { TextRow } from '@/lib/flow/integrated-poc/text-workspace';
import { PROGRAM_OFFICIAL_LABEL, programFlowAttributionLabel } from '@/lib/flow/integrated-poc/alpha-official-actors';
import { useAlphaOfficialActors } from './AlphaOfficialActors';
import discoveryStyles from './ProgramDiscovery.module.css';
import styles from './ProgramPublisher.module.css';

function GroupCheck({ label, rows, disabled, onChange }: { label: string; rows: ProgramPublicationDraftRow[]; disabled: boolean; onChange: (selected: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null), count = rows.filter(row => row.selected).length;
  useEffect(() => { if (input.current) input.current.indeterminate = count > 0 && count < rows.length; }, [count, rows.length]);
  return <label className={`${styles.check} ${styles.groupCheck}`}><input ref={input} type="checkbox" checked={rows.length > 0 && count === rows.length} aria-checked={count > 0 && count < rows.length ? 'mixed' : rows.length > 0 && count === rows.length} disabled={disabled || !rows.length} onChange={event => onChange(event.target.checked)} /><span>{label}<small>할 일 {count}/{rows.length}개 고름</small></span></label>;
}

export function ProgramPublicationPick({ draft, originalRows, today, disabled, onSelect }: { draft: ProgramPublicationDraft; originalRows: TextRow[]; today: string; disabled: boolean; onSelect: (ids: string[], selected: boolean) => void }) {
  const original = new Map(originalRows.map(row => [row.id, row]));
  const rowChoice = (row: ProgramPublicationDraftRow) => <label className={styles.check} key={row.itemId}><input type="checkbox" checked={row.selected} disabled={disabled} onChange={event => onSelect([row.itemId], event.target.checked)} /><span>{row.origin === 'note' ? original.get(row.rowId ?? '')?.text.trim() || row.description || '이전에 선택한 메모' : row.title || '제목 없는 항목'}{row.origin === 'previous-public' && <small>이전 공개 항목 · 현재 문서에 없음</small>}</span></label>;
  return <section className={styles.pick} aria-label="공개할 줄 고르기">
    <p className={styles.stepHint}>다른 사람에게 보여 줄 할 일만 골라 주세요.</p>
    {!draft.rows.some(row => row.origin !== 'note') && <p>이 문서에는 고를 할 일이 없습니다.{draft.rows.length ? ' 공개할 메모가 있다면 펼쳐서 골라 주세요.' : ' 문서에 할 일이나 메모를 먼저 적어 주세요.'}</p>}
    {programPublicationPickGroups(draft.rows, originalRows).map(group => {
      const notes = group.rows.filter(row => row.origin === 'note'), tasks = group.rows.filter(row => row.origin !== 'note');
      return <section key={group.key} className={styles.pickGroup} data-pick-group={group.key}>{tasks.length > 0 && <GroupCheck label={group.key === 'previous-public' ? '이전 공개 항목' : group.date ? programCalendarDate(group.date, today) : '날짜 미정'} rows={tasks} disabled={disabled} onChange={selected => onSelect(tasks.map(row => row.itemId), selected)} />}
        <div className={styles.groupRows}>{tasks.map(rowChoice)}{notes.length > 0 && <details className={styles.noteChoices}><summary>메모 {notes.length}개{notes.some(row => row.selected) ? ` · ${notes.filter(row => row.selected).length}개 고름` : ''}</summary>{notes.map(rowChoice)}</details>}</div>
      </section>;
    })}
  </section>;
}

/** Discovery's card is inline in ProgramDiscovery. Reuse its exact classes,
 * display helper and three-line DOM here until an extraction is authorized. */
export function ProgramPublicationPreviewCard({ data, flow, version }: { data: ProgramData; flow: ProgramPublicFlow; version: ProgramPublicVersion }) {
  const officialActors = useAlphaOfficialActors();
  const lines = programFlowCardLines(flow, version, { needsReview: false, inMyDocuments: false,
    official: programFlowAttributionLabel(flow, version, officialActors, data) === PROGRAM_OFFICIAL_LABEL });
  return <div className={styles.cardPreview} aria-label="Flow 찾기에 보일 카드"><div className={discoveryStyles.flowCard} data-card-lines="3" aria-label={[lines.title, lines.tag, lines.oneLine, lines.brief].filter(Boolean).join(', ')}>
    <span className={discoveryStyles.cardTitleRow}><span className={discoveryStyles.cardTitle}>{lines.title}</span>{lines.tag && <span className={discoveryStyles.cardBadge} data-badge={lines.tag}>{lines.tag}</span>}</span>
    {lines.oneLine && <span className={discoveryStyles.cardSummary}>{lines.oneLine}</span>}
    <span className={discoveryStyles.cardMeta}>{lines.brief}</span>
  </div></div>;
}
