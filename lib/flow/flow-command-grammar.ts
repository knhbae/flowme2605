export type FlowCommandRole =
  | 'primary'
  | 'secondary'
  | 'utility'
  | 'recovery'
  | 'destructive';

export type FlowManagementCommandId =
  | 'adjust'
  | 'reuse'
  | 'source'
  | 'archive'
  | 'restore'
  | 'backup'
  | 'permanent_delete';

export type FlowManagementCommand = {
  id: FlowManagementCommandId;
  label: string;
  role: FlowCommandRole;
  description?: string;
};

export const FLOW_COMMAND_LABELS = {
  manageFlow: 'Flow 관리',
  adjustFlow: 'Flow 편집',
  reuseFlow: '새 실행으로 다시 쓰기',
  viewSource: '원문 보기',
  archiveFlow: '보관',
  restoreFlow: '복구',
  backupFlow: '개인 백업 받기',
  permanentlyDeleteFlow: '이 기기에서 영구 삭제',
  editItem: '항목 수정',
  excludeSourceItem: '이 Flow에서 제외',
  restoreSourceItem: '다시 포함',
  deletePersonalItem: '항목 삭제',
  restorePersonalItem: '항목 복구',
  skipOccurrence: '이번 회차 건너뛰기',
  resumeOccurrence: '이번 회차 다시 진행',
  holdOccurrence: '이번 회차 보류',
  adjustRecurrence: '반복 일정 조정',
} as const;

export function buildFlowManagementCommandModel(options: {
  archived: boolean;
  canAdjust?: boolean;
  canReuse?: boolean;
  hasSource?: boolean;
  canBackup?: boolean;
}): FlowManagementCommand[] {
  if (options.archived) {
    const commands: FlowManagementCommand[] = [
      {
        id: 'restore',
        label: FLOW_COMMAND_LABELS.restoreFlow,
        role: 'recovery',
      },
    ];
    if (options.canBackup !== false) {
      commands.push({
        id: 'backup',
        label: FLOW_COMMAND_LABELS.backupFlow,
        role: 'secondary',
      });
    }
    if (options.hasSource !== false) {
      commands.push({
        id: 'source',
        label: FLOW_COMMAND_LABELS.viewSource,
        role: 'utility',
      });
    }
    commands.push({
      id: 'permanent_delete',
      label: FLOW_COMMAND_LABELS.permanentlyDeleteFlow,
      role: 'destructive',
    });
    return commands;
  }

  const commands: FlowManagementCommand[] = [];
  if (options.canAdjust) {
    commands.push({
      id: 'adjust',
      label: FLOW_COMMAND_LABELS.adjustFlow,
      role: 'secondary',
    });
  }
  if (options.canReuse) {
    commands.push({
      id: 'reuse',
      label: FLOW_COMMAND_LABELS.reuseFlow,
      role: 'secondary',
    });
  }
  if (options.hasSource !== false) {
    commands.push({
      id: 'source',
      label: FLOW_COMMAND_LABELS.viewSource,
      role: 'utility',
    });
  }
  commands.push({
    id: 'archive',
    label: FLOW_COMMAND_LABELS.archiveFlow,
    role: 'secondary',
    description: '보관함에서 복구하거나 영구 삭제할 수 있어요.',
  });
  return commands;
}

export function getStructuralItemCommandLabels(
  ownership: 'source' | 'personal',
): { remove: string; restore: string } {
  return ownership === 'source'
    ? {
        remove: FLOW_COMMAND_LABELS.excludeSourceItem,
        restore: FLOW_COMMAND_LABELS.restoreSourceItem,
      }
    : {
        remove: FLOW_COMMAND_LABELS.deletePersonalItem,
        restore: FLOW_COMMAND_LABELS.restorePersonalItem,
      };
}

export function getOccurrenceCommandLabels() {
  return {
    skip: FLOW_COMMAND_LABELS.skipOccurrence,
    resume: FLOW_COMMAND_LABELS.resumeOccurrence,
    hold: FLOW_COMMAND_LABELS.holdOccurrence,
    adjustSeries: FLOW_COMMAND_LABELS.adjustRecurrence,
  };
}

export function getExportScopeActionLabel(
  scope: 'flow' | 'selected' | 'item',
  count: number,
): string {
  const normalizedCount = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0;
  if (scope === 'selected') return `선택한 ${normalizedCount}개 옮기기`;
  if (scope === 'item') return `현재 항목 ${normalizedCount}개 옮기기`;
  return `전체 ${normalizedCount}개 옮기기`;
}
