export const FLOW_EXPORT_LABELS = {
  calendarFile: '캘린더 파일 받기',
  sheetFile: '시트로 받기',
  memoCopy: '메모로 복사',
  checklistCopy: '체크리스트 복사',
  editableDraft: '개인 사본',
  editMyVersion: '개인 사본으로 편집',
} as const;

export const FLOW_EXPORT_FEEDBACK = {
  memoCopied: '메모 복사됨',
  checklistCopied: '체크리스트 복사됨',
  copyFailed: '복사 실패',
  sheetPreparing: '시트 파일 생성 중',
  sheetReady: '시트 파일 받음',
  calendarPreparing: '캘린더 파일 생성 중',
  calendarReady: '캘린더 파일 받음',
} as const;
