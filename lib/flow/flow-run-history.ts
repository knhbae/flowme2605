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
  // General portable artifacts contain only explicit Item snapshot fields.
  // Private execution notes, unsent source corrections, and completion feedback
  // remain on the run record for the in-product history view.
  return artifacts;
}
