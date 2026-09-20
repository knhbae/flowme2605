import React from 'react';
import type { ProgramNativeLineagePreview } from '@/lib/flow/integrated-poc/creator-native-lineage';
import type { ProgramNativeLineageMapping } from '@/lib/flow/integrated-poc/creator-native-lineage-contract';
import styles from './ProgramCreatorNativeLineage.module.css';

export type { ProgramNativeLineageMapping, ProgramNativeLineagePreview };

function remainingRows(preview: ProgramNativeLineagePreview, items: ProgramNativeLineageMapping['items'], before: ProgramNativeLineageMapping['remaining']) {
  const used = new Set(Object.values(items).filter(value => value !== 'new' && value !== 'skip'));
  return Object.fromEntries(preview.existing.filter(row => !used.has(row.rowId)).map(row => [row.rowId, before[row.rowId] === 'retain' ? 'retain' : 'keep'])) as ProgramNativeLineageMapping['remaining'];
}

/** Only the model's unique, exact source-row suggestion may select an old row. */
export function defaultProgramNativeLineageMappings(preview: ProgramNativeLineagePreview): ProgramNativeLineageMapping {
  const items = Object.fromEntries(preview.items.map(item => {
    const row = item.suggestedRowId;
    const exact = item.included && row && item.exactRowIds.length === 1 && item.exactRowIds[0] === row
      && preview.existing.filter(old => old.rowId === row).length === 1
      && preview.items.filter(other => other.exactRowIds.includes(row)).length === 1;
    return [item.itemId, exact ? row : 'skip'];
  }));
  return { items, remaining: remainingRows(preview, items, {}) };
}

export function programNativeLineageMappingIssue(preview: ProgramNativeLineagePreview, mapping: ProgramNativeLineageMapping): string | null {
  if (!mapping || !mapping.items || !mapping.remaining || Array.isArray(mapping.items) || Array.isArray(mapping.remaining)
    || Object.keys(mapping).sort().join(',') !== 'items,remaining'
    || new Set(preview.items.map(item => item.itemId)).size !== preview.items.length
    || new Set(preview.existing.map(row => row.rowId)).size !== preview.existing.length
    || Object.keys(mapping.items).length !== preview.items.length
    || Object.keys(mapping.items).some(id => !preview.items.some(item => item.itemId === id))) return '비교 대상이 맞지 않습니다. 최신 내용으로 다시 비교해 주세요.';
  const used = new Set<string>();
  for (const item of preview.items) {
    const choice = mapping.items[item.itemId];
    if (choice === 'skip') continue;
    if (!item.included) return '제작 결과에서 제외된 항목은 연결할 수 없습니다.';
    if (choice === 'new') continue;
    if (!preview.existing.some(row => row.rowId === choice)) return '선택한 이전 행을 찾을 수 없습니다. 다시 비교해 주세요.';
    if (used.has(choice)) return '같은 이전 행을 여러 항목에 연결할 수 없습니다.';
    used.add(choice);
  }
  const remaining = preview.existing.filter(row => !used.has(row.rowId));
  if (Object.keys(mapping.remaining).length !== remaining.length || Object.entries(mapping.remaining).some(([id, value]) => !remaining.some(row => row.rowId === id) || !['keep', 'retain'].includes(value))) return '연결하지 않은 이전 행의 유지·보관 선택을 다시 확인해 주세요.';
  return null;
}

export type ProgramCreatorNativeLineageProps = {
  preview: ProgramNativeLineagePreview;
  mapping: ProgramNativeLineageMapping;
  busy: boolean;
  feedback?: { error: boolean; text: string };
  onChange: (mapping: ProgramNativeLineageMapping) => void;
  onApply: () => void | Promise<void>;
  onCancel: () => void;
  onRefresh: () => void | Promise<void>;
};

export function ProgramCreatorNativeLineage({ preview, mapping, busy, feedback, onChange, onApply, onCancel, onRefresh }: ProgramCreatorNativeLineageProps) {
  const issue = programNativeLineageMappingIssue(preview, mapping);
  const hasSelection = preview.items.some(item => mapping.items[item.itemId] !== 'skip');
  const used = new Set(Object.values(mapping.items));
  // One event dispatch per rendered controlled snapshot, including synchronous callbacks.
  let dispatched = false;
  const act = (callback: () => void | Promise<void>) => { if (busy || dispatched) return; dispatched = true; return callback(); };
  const changeItem = (itemId: string, choice: string) => {
    if (busy || dispatched) return;
    const item = preview.items.find(item => item.itemId === itemId);
    if (!item || (!item.included && choice !== 'skip') || (choice !== 'new' && choice !== 'skip' && !preview.existing.some(row => row.rowId === choice))) return;
    const items = { ...mapping.items, [itemId]: choice };
    const next = { items, remaining: remainingRows(preview, items, mapping.remaining) };
    if (!programNativeLineageMappingIssue(preview, next)) onChange(next);
  };
  return <section className={styles.review} aria-label="제작 항목과 이전 개인 행 연결" aria-busy={busy}
    onKeyDown={event => { if (event.key === 'Escape' && !event.nativeEvent.isComposing && event.keyCode !== 229 && !busy) { event.preventDefault(); event.stopPropagation(); act(onCancel); } }}>
    <h2 tabIndex={-1}>이전 개인 행과 연결하기</h2>
    <p>원문 행이 정확히 일치할 때만 미리 선택했습니다. 제목이 비슷해도 같은 항목으로 추정하지 않습니다.</p>
    {preview.items.length === 0 && <p>연결할 제작 항목이 없습니다. 포함 설정을 확인한 뒤 다시 비교해 주세요.</p>}
    {preview.items.map(item => {
      const choice = mapping.items[item.itemId] ?? 'skip';
      const old = preview.existing.find(row => row.rowId === choice);
      const replacement = old && (old.kind !== 'ordinary' || item.kind !== 'ordinary');
      return <fieldset key={item.itemId} className={styles.item} disabled={busy}>
        <legend>{item.title || '제목 없는 항목'}{!item.included && ' · 제작 결과에서 제외됨'}</legend>
        <div className={styles.columns}>
          <div><h3>이번 제작 내용</h3><pre tabIndex={0}>{item.incoming || '내용 없음'}</pre></div>
          {old && <div><h3>현재 내 본문과 기록</h3><pre tabIndex={0}>{old.personal || '개인 본문 없음'}</pre>
            <details><summary>이전 원문과 연결 정보</summary><pre tabIndex={0}>{old.source}</pre><dl><dt>이전 행</dt><dd>{old.rowId}</dd><dt>저장본</dt><dd>{old.revisionId}</dd><dt>개인 문서</dt><dd>{old.documentId}</dd></dl></details></div>}
        </div>
        <label>이 항목의 연결 대상<select aria-label={`${item.title || '제목 없는 항목'} 연결 대상`} value={choice} disabled={busy || !item.included} onChange={event => changeItem(item.itemId, event.target.value)}>
          <option value="skip">이번에는 연결하지 않기</option>
          {item.included && <option value="new">새 개인 항목으로 가져오기</option>}
          {item.included && preview.existing.map(row => <option key={row.rowId} value={row.rowId} disabled={used.has(row.rowId) && choice !== row.rowId}>{row.title || '제목 없는 이전 행'} · {row.rowId}</option>)}
        </select></label>
        {old && <p>{replacement ? '종류가 바뀌었거나 이전 항목이 반복입니다. 이전 본문·날짜·진행·회차 기록은 보관하고 새 실행을 만듭니다. 지난 기록을 새 회차에 옮기지 않습니다.' : '현재 개인 본문·날짜·진행 기록을 그대로 두고 연결합니다. 제작 내용의 필드별 반영은 이후 비교에서 선택합니다.'}</p>}
      </fieldset>;
    })}
    {preview.existing.filter(row => !used.has(row.rowId)).length > 0 && <div className={styles.remaining}>
      <h3>연결하지 않은 이전 행</h3>
      {preview.existing.filter(row => !used.has(row.rowId)).map(row => <fieldset key={row.rowId} className={styles.item} disabled={busy}>
        <legend>{row.title || '제목 없는 이전 행'}</legend>
        <details><summary>현재 내 본문과 원문 확인</summary><h4>개인 본문</h4><pre tabIndex={0}>{row.personal}</pre><h4>이전 원문</h4><pre tabIndex={0}>{row.source}</pre><p>이전 행 {row.rowId} · 문서 {row.documentId}</p></details>
        <label>이전 행 처리<select aria-label={`${row.title || '제목 없는 이전 행'} 이전 행 처리`} value={mapping.remaining[row.rowId] ?? ''} onChange={event => {
          if (busy || dispatched || !['keep', 'retain'].includes(event.target.value)) return;
          const next: ProgramNativeLineageMapping = { items: { ...mapping.items }, remaining: { ...mapping.remaining, [row.rowId]: event.target.value as 'keep' | 'retain' } };
          if (!programNativeLineageMappingIssue(preview, next)) onChange(next);
        }}><option value="" disabled>처리를 선택해 주세요</option><option value="keep">기존 개인 항목으로 유지</option><option value="retain">이전 기록으로 보관</option></select></label>
        {mapping.remaining[row.rowId] === 'retain' && <p>현재 실행에서 분리해 보관합니다. 본문과 개인 기록은 삭제하지 않습니다.</p>}
      </fieldset>)}
    </div>}
    {!hasSelection && <p>모두 연결하지 않으면 변경하지 않습니다. 이전 행만 보관하는 용도로 적용할 수 없습니다.</p>}
    {issue && <p role="alert" className={styles.error}>{issue}</p>}
    {feedback?.text && <p role={feedback.error ? 'alert' : 'status'} className={feedback.error ? styles.error : undefined}>{feedback.text}</p>}
    <div className={styles.actions}>
      <button type="button" className={styles.primary} disabled={busy || !!issue || !hasSelection} onClick={() => { if (!issue && hasSelection) return act(onApply); }}>{busy ? '연결 저장 중…' : '선택한 연결 적용'}</button>
      <button type="button" disabled={busy} onClick={() => act(onCancel)}>변경 없이 닫기</button>
      <button type="button" disabled={busy} onClick={() => act(onRefresh)}>최신 내용으로 다시 비교</button>
    </div>
  </section>;
}
