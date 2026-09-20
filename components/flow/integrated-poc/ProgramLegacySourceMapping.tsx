import React from 'react';
import type { PersonalWorkspacePocFlowItem } from '@/lib/flow/personal-workspace-poc-contract';
import type { PersonalWorkspacePocAuthoringItemContext } from '@/lib/flow/personal-workspace-poc-source-attributes-contract';
import styles from './ProgramLegacySourceMapping.module.css';

type Item = PersonalWorkspacePocFlowItem;
type Context = PersonalWorkspacePocAuthoringItemContext;

/** Display only saved facts. A row number/order is context, never an identity match. */
export function programLegacyMappingFacts(item: Item, context?: Context) {
  const attrs = context?.attributes;
  const rows: { label: string; value: string }[] = [];
  const add = (label: string, values: readonly (string | undefined)[]) => {
    const unique = [...new Set(values.filter((value): value is string => typeof value === 'string' && !!value.trim()))];
    if (unique.length) rows.push({ label, value: unique.join('\n') });
  };
  add('구간', [item.sectionTitle]);
  add(context ? '원문 날짜' : '저장된 날짜', [attrs?.date, attrs?.resolvedDate, item.sourceDate]);
  add('상대 날짜', [attrs?.relativeDate]);
  // Only suppress the exact label produced from these already-visible fields.
  // An unfamiliar stored label may contain source context and must remain visible.
  const derivedTiming = [attrs?.relativeDate, attrs?.time, attrs?.timeZone].filter(Boolean).join(' · ');
  add('시간·일정', [attrs?.time, derivedTiming && item.sourceTimingLabel === derivedTiming ? undefined : item.sourceTimingLabel]);
  add('시간대', [attrs?.timeZone]);
  add('내용', [item.description, attrs?.description, ...(attrs?.additionalDescriptions ?? [])]);
  add('완료 기준', [item.completionCriterion, attrs?.completionCriteria]);
  add('장소', [attrs?.place]);
  add('반복', [attrs?.recurrence]);
  add('반복 종료', [attrs?.recurrenceEnd]);
  add('실행 조건', [attrs?.executionCondition]);
  add('주의', [attrs?.caution]);
  add('안내', [attrs?.guide]);
  if (attrs?.durationMinutes !== undefined) add('소요 시간', [`${attrs.durationMinutes}분`]);
  add('자료', [attrs?.resourceLabel, attrs?.resourceUrl]);
  add('출처', [attrs?.sourceLabel, attrs?.sourceUrl]);
  return rows;
}

export function programLegacyMappingOptionLabel(item: Item) {
  // The exact original order distinguishes otherwise identical candidates without
  // proposing a match. Full values and identity remain in the candidate details.
  const context = [item.sectionTitle, item.sourceDate, item.sourceTimingLabel,
    item.description, item.completionCriterion].filter((value): value is string => !!value?.trim());
  return [`${item.sourceOrder + 1}번째 · ${item.title}`, ...context.map(value => value.length > 64 ? `${value.slice(0, 64)}…` : value)].join(' · ');
}

export function ProgramLegacyMappingItem({ item, context, label }: { item: Item; context?: Context; label: string }) {
  const facts = programLegacyMappingFacts(item, context);
  return <div className={styles.item}>
    <p className={styles.eyebrow}>{label}{context ? ` · 원문 ${context.sourceLine}행` : ` · 저장 순서 ${item.sourceOrder + 1}번째`}</p>
    <h4>{item.title}</h4>
    {!!facts.length && <dl className={styles.facts}>{facts.map(row => <React.Fragment key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></React.Fragment>)}</dl>}
    {!!context?.attributes.subchecks?.length && <details className={styles.more}><summary>하위 체크 {context.attributes.subchecks.length}개</summary>
      <ul>{context.attributes.subchecks.map(row => <li key={row.subcheckId}>{row.sourceChecked ? '[x]' : '[ ]'} {row.title}</li>)}</ul>
    </details>}
    <details className={styles.more}><summary>식별자·전체 기술자료</summary><pre>{JSON.stringify(context ? { item, attributes: context.attributes } : item, null, 2)}</pre></details>
  </div>;
}

export function ProgramLegacyMappingCandidates({ items }: { items: readonly Item[] }) {
  return <details className={styles.candidates}><summary>기존 항목 {items.length}개 살펴보기</summary>
    {items.map(item => <ProgramLegacyMappingItem key={item.ref} item={item} label="기존 항목" />)}
  </details>;
}

export function ProgramLegacyMappingPair({ item, context, existing, selection, children }: {
  item: Item; context?: Context; existing?: Item; selection?: string; children: React.ReactNode;
}) {
  return <div className={styles.pair}>
    <ProgramLegacyMappingItem item={item} context={context} label="연결할 원문" />
    <div className={styles.choice}>
      {children}
      {existing ? <ProgramLegacyMappingItem item={existing} label="선택한 기존 항목" />
        : selection === 'new' ? <p className={styles.outcome}>이 원문 행을 새 실행 항목으로 만듭니다.</p>
        : selection === 'source-only' ? <p className={styles.outcome}>이 행은 원문에 남기고 실행 항목은 만들지 않습니다.</p>
        : <p className={styles.outcome}>연결할 기존 항목을 고르면 이곳에서 나란히 비교할 수 있습니다.</p>}
    </div>
  </div>;
}
