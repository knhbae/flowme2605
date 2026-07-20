export type CompletionResult = 'completed' | 'reopened';

export type CompletionControlPresentation = {
  actionLabel: string;
  accessibleName: string;
};

export function buildCompletionControlPresentation(options: {
  title: string;
  checked: boolean;
  recurring?: boolean;
  occurrenceDateLabel?: string;
  disabledReason?: string;
}): CompletionControlPresentation {
  const title = options.title.trim();
  const actionLabel = options.checked
    ? options.recurring
      ? '이번 회차 다시 열기'
      : '다시 열기'
    : options.recurring
      ? '이번 회차 완료 체크'
      : '완료 체크';
  const accessibleName = [
    title,
    options.recurring ? options.occurrenceDateLabel?.trim() : '',
    options.disabledReason?.trim() || actionLabel,
  ].filter(Boolean).join(' ');

  return { actionLabel, accessibleName };
}

export function buildCompletionNoticePresentation(options: {
  title: string;
  result: CompletionResult;
  recurring?: boolean;
  occurrenceDateLabel?: string;
}): { message: string; actionLabel: string } {
  const context = [
    `“${options.title.trim()}”`,
    options.recurring ? options.occurrenceDateLabel?.trim() : '',
  ].filter(Boolean).join(' · ');

  if (options.result === 'reopened') {
    return {
      message: `${context} 다시 열림`,
      actionLabel: '항목 보기',
    };
  }

  return {
    message: `${context} 완료`,
    actionLabel: '되돌리기',
  };
}
