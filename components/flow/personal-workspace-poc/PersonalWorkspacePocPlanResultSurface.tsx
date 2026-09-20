'use client';

import React, { useState } from 'react';
import {
  selectPersonalWorkspacePocPlanDisplayPage,
  type PersonalWorkspacePocPlanDisplay,
} from '@/lib/flow/personal-workspace-poc-plan-display';

const ACTION = 'min-h-12 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 py-2 text-sm font-semibold text-[var(--flowme-action)] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]';
const LABELS = { preview: '반영 전 확인', saving: '저장 중', success: '저장 완료', noop: '같은 내용', failure: '저장 실패', canceled: '편집 취소', undone: '되돌림 완료' } as const;

function message(display: PersonalWorkspacePocPlanDisplay): string {
  const count = display.changedFieldCount;
  switch (display.status) {
    case 'preview': return `개인 계획에서 바뀌는 내용 ${count}건을 확인해 주세요.`;
    case 'saving': return `개인 계획 변경 ${count}건을 저장하고 있습니다.`;
    case 'success': return `개인 계획 변경 ${count}건을 저장했습니다.`;
    case 'noop': return '같은 내용이라 저장하지 않았습니다.';
    case 'canceled': return `준비한 변경 ${count}건을 버렸습니다. 저장된 내용은 바뀌지 않았습니다.`;
    case 'undone': return `개인 계획 변경 ${count}건을 이전 상태로 되돌렸습니다.`;
    case 'failure': return display.rollback === 'recovery-required'
      ? '저장을 확인하지 못했습니다. 새로고침한 뒤 복구 상태를 확인해 주세요.'
      : '저장하지 못했습니다. 준비한 변경은 편집 화면에 남아 있습니다.';
  }
}

/** Full data stays in the issued display. Paging has no storage or action authority. */
export function PersonalWorkspacePocPlanResultSurface({ display, announce = true, onUndo, onDismiss }: Readonly<{
  display: PersonalWorkspacePocPlanDisplay;
  announce?: boolean;
  onUndo?: () => void;
  onDismiss?: () => void;
}>) {
  const [requestedPage, setRequestedPage] = useState(0);
  const selected = selectPersonalWorkspacePocPlanDisplayPage(display, requestedPage);
  if (!selected.ok) return <p>변경 목록을 표시하지 못했습니다. 저장 상태를 다시 확인해 주세요.</p>;
  const page = selected.page;
  const preview = display.status === 'preview';
  const headingId = preview ? 'personal-workspace-plan-preview-heading' : 'personal-workspace-plan-result-heading';
  const value = (entry: unknown) => entry === '' || entry === null ? '없음' : String(entry);
  return <section
    data-testid={preview ? 'personal-workspace-plan-change-preview' : 'personal-workspace-editor-receipt'}
    data-plan-display-contract={display.contract}
    data-receipt-status={display.status}
    data-affected-count={display.affectedCount}
    data-changed-field-count={display.changedFieldCount}
    data-flow-count={display.flowCount}
    data-item-count={display.itemCount}
    data-target-write-count={display.targetWriteCount}
    data-support-write-count={display.supportWriteCount}
    data-page-index={page.pageIndex}
    data-page-count={page.pageCount}
    aria-labelledby={headingId}
    className="my-3 min-w-0 rounded-md border border-[var(--flowme-border)] bg-white p-4"
  >
    <h3 id={headingId} className="font-semibold text-[var(--flowme-text)]">{LABELS[display.status]}</h3>
    <p role={!preview && announce ? 'status' : undefined} aria-live={!preview && announce ? 'polite' : 'off'} aria-atomic="true" className="mt-1 text-sm leading-6">{message(display)}</p>
    <p className="mt-1 text-sm text-[var(--flowme-text-secondary)]">변경 {display.changedFieldCount}건 · Flow {display.flowCount}개 · 할 일 {display.itemCount}개</p>
    {page.rows.length ? <ol start={page.startIndex + 1} className="mt-3 divide-y divide-[var(--flowme-border)]">
      {page.rows.map(change => <li key={`${change.owner}:${change.field}`} data-receipt-field={change.field} data-impact-field={preview ? change.field : undefined} className="min-w-0 py-3 text-sm [overflow-wrap:anywhere]">
        <p className="font-semibold">{change.label}</p>
        <div className="mt-1 grid min-w-0 gap-2 sm:grid-cols-2">
          <p><span className="text-[var(--flowme-text-secondary)]">변경 전 · </span><span data-receipt-before>{value(change.before)}</span></p>
          <p><span className="text-[var(--flowme-text-secondary)]">변경 후 · </span><span data-receipt-after>{value(change.after)}</span></p>
        </div>
      </li>)}
    </ol> : null}
    {page.pageCount > 1 ? <nav aria-label="개인 계획 변경 목록 페이지" className="mt-3 flex flex-wrap items-center gap-2">
      <button type="button" className={ACTION} disabled={page.pageIndex === 0} onClick={() => setRequestedPage(page.pageIndex - 1)}>이전 변경</button>
      <span className="text-sm">{page.pageIndex + 1} / {page.pageCount}쪽</span>
      <button type="button" className={ACTION} disabled={page.pageIndex + 1 === page.pageCount} onClick={() => setRequestedPage(page.pageIndex + 1)}>다음 변경</button>
    </nav> : null}
    {!preview ? <div className="mt-3 flex flex-wrap gap-2">
      {display.status === 'success' && onUndo ? <button type="button" className={ACTION} data-testid="personal-workspace-editor-receipt-undo" onClick={onUndo}>이 변경 되돌리기</button> : null}
      {onDismiss ? <button type="button" className={ACTION} onClick={onDismiss}>결과 닫기</button> : null}
    </div> : null}
  </section>;
}
