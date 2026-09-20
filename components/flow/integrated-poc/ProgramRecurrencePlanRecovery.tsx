'use client';

import React, { useMemo } from 'react';
import type { ProgramData } from '../../../lib/flow/integrated-poc/contract';
import type { ProgramOccurrenceExecution } from '../../../lib/flow/integrated-poc/recurrence-state-contract';
import { programOccurrenceExecutionKey } from '../../../lib/flow/integrated-poc/recurrence-state-contract';
import { programPersonalOccurrenceKey, type ProgramPersonalOccurrenceExecution } from '../../../lib/flow/integrated-poc/program-recurrence-plan-contract';
import { readProgramRecurrencePlanRecoveries } from '../../../lib/flow/integrated-poc/program-recurrence-plan-state';
import { programOccurrenceSourceFacts } from '../../../lib/flow/integrated-poc/recurrence-recovery';
import { readProgramPublicCopyRecoveryLocation } from '../../../lib/flow/integrated-poc/public-copy-recovery-location';
import { textWorkspaceModel as M } from '../../../lib/flow/integrated-poc/text-workspace';
import styles from './ProgramRecurrence.module.css';

type Scope = { today: string; documentId?: string; folderId?: string };
export function programRecurrencePlanRecoveryRows(data: ProgramData, scope: Scope) {
  const actorId = data.activeActorId, space = data.spaces[actorId];
  return readProgramRecurrencePlanRecoveries(data, { actorId, localToday: scope.today }).flatMap(entry => {
    const source = entry.owner.source, creator = source.publicOwner ? undefined : source.creatorOwner;
    const publicLocation = source.publicOwner ? readProgramPublicCopyRecoveryLocation(space, source) : null;
    const creatorSource = creator ? space.creatorWorkspace?.executionSources?.[creator.ownerId] : undefined;
    const binding = creator || source.publicOwner ? undefined : space.savedBindings.find(item => item.flowRef === source.sourceFlowRef && item.savedCopyId === source.savedCopyId && item.flowId === source.flowId);
    const sourceDocumentId = source.publicOwner ? publicLocation?.documentId : creatorSource?.documentId ?? binding?.documentId;
    const lineId = source.publicOwner ? publicLocation?.lineId : creatorSource ? creatorSource.revisions.flatMap(revision => revision.rows).find(row => row.rowId === creator!.rowId)?.documentLineId : binding?.itemLines[source.sourceItemRef];
    const matches = lineId ? [...space.text.documents, ...space.text.flows].filter(document => document.lines.some(line => line.id === lineId)) : [];
    const document = matches.length === 1 ? matches[0] : sourceDocumentId ? M.getDocument(space.text, sourceDocumentId) : undefined;
    if (scope.documentId && (source.publicOwner ? !publicLocation?.visibleDocumentIds.includes(scope.documentId) : sourceDocumentId !== scope.documentId && document?.id !== scope.documentId)) return [];
    if (scope.folderId) {
      let folder = space.text.folders.find(item => item.id === document?.folderId);
      const visited = new Set<string>();
      while (folder && folder.id !== scope.folderId && !visited.has(folder.id)) {
        visited.add(folder.id); const parentId = folder.parentId; folder = space.text.folders.find(item => item.id === parentId);
      }
      if (folder?.id !== scope.folderId) return [];
    }
    const facts = programOccurrenceSourceFacts(source, data.public) as { item?: { title?: unknown } };
    const title = typeof facts?.item?.title === 'string' ? facts.item.title : document?.title ?? '이전 반복 계획';
    const taskRecords: unknown[] = JSON.parse(entry.owner.retainedTaskRecordsRaw);
    return [{ ...entry, title, taskRecords, documentId: document?.id, lineId: matches.length === 1 ? lineId : undefined }];
  });
}
const reasonText = (reason: string) => ({
  'source-changed-or-unavailable': '원본이 바뀌었거나 현재 연결을 확인할 수 없어 이전 계획의 기록을 보존했습니다.',
  'source-held': '원본이 보관·제외되었거나 실행 검토가 필요합니다. 이전 기록은 읽을 수 있습니다.',
  'retained-private-records': '다시 계획하는 과정에서 현재 계획 밖에 남은 개인 회차 기록입니다.',
  'retained-source-records': '새 계획에 옮겨 쓰지 않은 이전 원본 회차의 기록입니다.',
} as Record<string, string>)[reason] ?? '현재 계획으로 연결할 수 없는 이전 기록을 보존했습니다.';

function ExecutionRecord({ record, personal }: { record: ProgramOccurrenceExecution | ProgramPersonalOccurrenceExecution; personal: boolean }) {
  return <dl className={styles.record}>
    <div><dt>{personal ? '개인 계획 날짜' : '원래 회차 날짜'}</dt><dd>{record.originalDate}</dd></div>
    <div><dt>실행 날짜</dt><dd>{record.schedule.mode === 'inherit' ? `${record.originalDate} · 계획 따름` : record.schedule.date ?? '날짜 미정'}</dd></div>
    <div><dt>완료 기록</dt><dd>{record.completion.status === 'completed' ? '완료' : record.completion.status === 'open' ? '다시 열림' : '완료 기록 없음'}{record.completion.completedAt && <time dateTime={record.completion.completedAt}> · {record.completion.completedAt}</time>}</dd></div>
    <div><dt>실행 포함</dt><dd>{record.participation === 'included' ? '포함' : record.participation === 'held' ? '보류' : '제외'}</dd></div>
  </dl>;
}

/** Read-only even when live metadata/period rows no longer exist. No writer is accepted. */
export function ProgramRecurrencePlanRecovery(props: Scope & { data: ProgramData; disabled?: boolean; onOpenSource: (documentId: string, lineId?: string) => void }) {
  const entries = useMemo(() => programRecurrencePlanRecoveryRows(props.data, props), [props.data, props.today, props.documentId, props.folderId]);
  if (!entries.length) return null;
  return <section className={`${styles.surface} ${styles.planRecovery}`} aria-label="보존한 반복 계획 기록">
    <details><summary>보존한 반복 계획 {entries.length}개</summary>
      <p>이전 날짜·완료·포함 상태를 읽는 곳입니다. 현재 회차에 자동으로 연결하거나 덮어쓰지 않습니다.</p>
      {entries.map(entry => <article key={entry.owner.ownerId} className={styles.recovery} data-plan-owner={entry.owner.ownerId}>
        <h3>{entry.title}</h3><p>{reasonText(entry.reason)}</p>
        {entry.documentId ? <button type="button" disabled={props.disabled} onClick={() => props.onOpenSource(entry.documentId!, entry.lineId)}>{entry.lineId ? '연결된 문서의 원문 항목 보기' : '연결된 문서 보기'}</button> : <p>연결된 문서를 찾을 수 없습니다. 아래의 당시 원문 정보와 실행 기록은 남아 있습니다.</p>}
        <details className={styles.sourceDetails}><summary>계획을 만들 때의 원문 정보</summary><p>시작 {entry.owner.source.sourceRule.startDate} · {entry.owner.source.sourceRule.recurrence} · {entry.owner.source.sourceRule.recurrenceEnd ?? '종료 지정 없음'}</p></details>
        {entry.retainedSourceExecutions.length > 0 && <><h4>이전 원본 회차 기록</h4><ul>{entry.retainedSourceExecutions.map(record => <li key={programOccurrenceExecutionKey(record)}><ExecutionRecord record={record} personal={false} /></li>)}</ul></>}
        {entry.retainedPersonal.length > 0 && <><h4>이전 개인 회차 기록</h4><ul>{entry.retainedPersonal.map(record => <li key={programPersonalOccurrenceKey(record)}><ExecutionRecord record={record} personal /></li>)}</ul></>}
        {entry.taskRecords.length > 0 && <details className={styles.sourceDetails}><summary>계획 변경 전 항목의 누적 진행 기록</summary><ul>{entry.taskRecords.map((value, index) => {
          const record = value as { date?: unknown; percent?: unknown } | null;
          return <li key={index}>{record && typeof record.date === 'string' && typeof record.percent === 'number' ? `${record.date} · ${record.percent}%` : <pre>{JSON.stringify(value, null, 2)}</pre>}</li>;
        })}</ul><p>항목 단위 기록이며 새 개인 회차의 완료 기록으로 옮겨 쓰지 않습니다.</p></details>}
        {!entry.retainedSourceExecutions.length && !entry.retainedPersonal.length && !entry.taskRecords.length && <p>따로 변경한 실행 기록은 없습니다. 계획의 원본 연결 정보는 보존했습니다.</p>}
      </article>)}
    </details>
  </section>;
}
