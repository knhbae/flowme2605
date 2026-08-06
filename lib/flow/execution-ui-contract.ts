export type FlowExecutionActionRole =
  | 'primary'
  | 'secondary'
  | 'utility'
  | 'completion'
  | 'destructive'
  | 'recovery';

export type FlowExecutionActionDefinition = {
  label: string;
  role: FlowExecutionActionRole;
};

export const FLOW_EXECUTION_ACTIONS = {
  saveToMyFlow: { label: '내 Flow에 저장', role: 'primary' },
  startFirstItem: { label: '첫 할 일 시작', role: 'primary' },
  saveChanges: { label: '변경 저장', role: 'primary' },
  viewWholeFlow: { label: '전체 Flow 보기', role: 'secondary' },
  openItem: { label: '열기', role: 'utility' },
  editItem: { label: '할 일 조정', role: 'secondary' },
  exportFlow: { label: '내 도구로 옮기기', role: 'secondary' },
  openCalendar: { label: '캘린더', role: 'utility' },
  close: { label: '닫기', role: 'utility' },
  cancel: { label: '취소', role: 'secondary' },
  delete: { label: '삭제', role: 'destructive' },
  undo: { label: '되돌리기', role: 'recovery' },
} as const satisfies Record<string, FlowExecutionActionDefinition>;

export const FLOW_EXECUTION_COPY_BUDGET = {
  eyebrow: 18,
  title: 48,
  summary: 72,
  helper: 48,
  action: 14,
  meta: 32,
} as const;

export function isWithinExecutionCopyBudget(
  value: string,
  kind: keyof typeof FLOW_EXECUTION_COPY_BUDGET,
) {
  return Array.from(value.trim()).length <= FLOW_EXECUTION_COPY_BUDGET[kind];
}
