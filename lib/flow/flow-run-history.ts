import {
  buildPersonalStructuralListExportArtifactsFromRows,
  type PersonalStructuralListExportArtifacts,
  type PersonalStructuralListExportRow,
} from './personal-structural-list-export';
import type { FlowRunItemSnapshot, FlowRunRecord } from './storage';

export function getFlowRunItemStatusLabel(status: FlowRunItemSnapshot['status']): string {
  if (status === 'done') return '완료';
  if (status === 'skipped') return '건너뜀';
  if (status === 'held') return '보류';
  return '미완료';
}

export function buildFlowRunHistoryListExportArtifacts(
  run: FlowRunRecord,
  fallbackFlowTitle: string,
): PersonalStructuralListExportArtifacts | undefined {
  const snapshots = run.completionSnapshot?.itemSnapshots;
  if (!snapshots) return undefined;
  const rows: PersonalStructuralListExportRow[] = snapshots.map((snapshot) => ({
    itemId: snapshot.itemId,
    title: snapshot.title,
    ...(snapshot.date ? { date: snapshot.date } : {}),
    scheduleState: snapshot.scheduleState,
    ...(snapshot.time ? { time: snapshot.time } : {}),
    ...(snapshot.durationMinutes ? { durationMinutes: snapshot.durationMinutes } : {}),
    ...(snapshot.memo ? { memo: snapshot.memo } : {}),
    status: snapshot.status,
    personalOrderRank: snapshot.personalOrderRank,
  }));
  const artifacts = buildPersonalStructuralListExportArtifactsFromRows({
    flowTitle: run.completionSnapshot?.flowTitle || fallbackFlowTitle,
    rows,
  });
  const reflection = run.completionSnapshot?.completionFeedback?.reflection;
  const reflectionLines = reflection
    ? [
        '',
        '내 실행 회고',
        `결과: ${reflection.outcome === 'helpful' ? '도움됐어요' : '고칠 점이 있어요'}`,
        ...(reflection.note ? [`메모: ${reflection.note}`] : []),
      ]
    : [];
  const executionNotes = run.completionSnapshot?.executionNotes ?? [];
  const privateNoteLines = executionNotes.filter((note) => note.kind === 'private').flatMap((note, index) => [
    ...(index === 0 ? ['', '실행 중 남긴 메모'] : []),
    `${note.itemTitle}: ${note.note}`,
  ]);
  const correctionNoteLines = executionNotes.filter((note) => note.kind === 'source_correction').flatMap((note, index) => [
    ...(index === 0 ? ['', '원본에 알릴 점 (아직 전송되지 않음)'] : []),
    `${note.itemTitle}: ${note.note}`,
  ]);
  const additionalMemoLines = [...privateNoteLines, ...correctionNoteLines, ...reflectionLines];
  return {
    ...artifacts,
    memoText: additionalMemoLines.length
      ? `${artifacts.memoText.trimEnd()}\n${additionalMemoLines.join('\n')}\n`
      : artifacts.memoText,
  };
}
