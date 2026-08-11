'use client';

import {
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from '@/components/flow/flow-ui';
import type {
  AuthoringArtifactKind,
  AuthoringArtifactPreflight,
  AuthoringArtifactScope,
} from '@/lib/flow/text-authoring/artifact-projection';
import type {
  TextAuthoringDraftHistoryEntry,
} from '@/lib/flow/text-authoring/storage';

import type {
  AuthoringOwnership,
  AuthoringReceiptView,
} from './authoring-ui-types';
import { AuthoringDialog } from './AuthoringDialog';

const ARTIFACT_LABEL: Record<AuthoringArtifactKind, string> = {
  calendar: '캘린더',
  todo: '할 일',
  sheet: '표·Excel',
  memo: 'TXT',
};

function formatLabel(artifact: AuthoringArtifactKind, format: string): string {
  if (artifact === 'calendar' && format === 'ics') return '캘린더 파일(ICS)';
  if (artifact === 'todo' && format === 'plain_text') return 'TXT';
  if (artifact === 'todo' && format === 'markdown') return 'Markdown';
  if (artifact === 'sheet' && format === 'xlsx') return 'Excel(XLSX)';
  if (artifact === 'sheet') return format.toUpperCase();
  if (
    artifact === 'memo' &&
    ['raw_source', 'raw', 'raw_text', 'source_text'].includes(format)
  ) {
    return '현재 작업 원문 (.txt)';
  }
  if (artifact === 'memo' && format === 'plain_text') return '항목별 TXT';
  if (artifact === 'memo' && format === 'markdown') return '정리된 Markdown';
  return format.toUpperCase();
}

const SCOPE_LABEL: Record<AuthoringArtifactScope, string> = {
  whole: '전체',
  selected: '선택 항목',
  current_step: '현재 단계',
};

const HISTORY_KIND_LABEL: Record<string, string> = {
  saved: '저장',
  duplicated: '복제',
  archived: '보관',
  restored: '복원',
};

const SAVE_RECEIPT_COPY: Record<
  AuthoringOwnership,
  { title: string; description: string }
> = {
  creator: {
    title: '제작자 초안을 저장했습니다',
    description: '이 기기의 제작자 초안에 저장했습니다. 공개 Flow는 바뀌지 않았습니다.',
  },
  personal: {
    title: '개인 초안을 저장했습니다',
    description: '이 기기의 개인 초안에 저장했습니다. 공개 Flow는 바뀌지 않았습니다.',
  },
  suggestion: {
    title: '수정 제안 초안을 저장했습니다',
    description: '이 기기의 수정 제안 초안에 저장했습니다. 아직 전송되지 않았습니다.',
  },
};

export type AuthoringExportReceiptView = {
  receiptId: string;
  artifact: AuthoringArtifactKind;
  scope: AuthoringArtifactScope;
  format: string;
  count: number;
  omittedCount: number;
  reviewEvidenceCount: number;
  sourceState: 'current' | 'source_updated' | 'conflict_source_vs_user' | 'unknown';
  createdAtLabel: string;
};

export type AuthoringRoundTripView = {
  markdown: string;
  matchedCount: number;
  changedCount: number;
  unresolvedCount: number;
  lossFields: string[];
};

export function ResetAuthoringDialog({
  open,
  onClose,
  onDiscard,
  title = '작성 중인 변경사항을 버릴까요?',
  description = '명시 저장하지 않은 원문·구조 수정과 이 기기의 임시 복구본이 사라집니다. 이미 저장한 초안은 초안 목록에 남습니다.',
  confirmLabel = '변경사항 버리고 새로 시작',
  notice = '이 동작은 현재 작성 화면만 초기화합니다. 공개 Flow나 저장된 초안은 삭제하지 않습니다.',
}: {
  open: boolean;
  onClose: () => void;
  onDiscard: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  notice?: string;
}) {
  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-reset-dialog"
      title={title}
      description={description}
      onClose={onClose}
      footer={(
        <>
          <button
            type="button"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onClose}
          >
            계속 작성
          </button>
          <button
            type="button"
            className={FLOW_UI_PRIMARY_ACTION_CLASS}
            onClick={onDiscard}
          >
            {confirmLabel}
          </button>
        </>
      )}
    >
      <p className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-warning-soft)] px-3 py-3 text-sm leading-6 text-[var(--flowme-warning-strong)]">
        {notice}
      </p>
    </AuthoringDialog>
  );
}

export function SaveReceiptDialog({
  open,
  receipt,
  onClose,
  onOpenLibrary,
  onContinue,
}: {
  open: boolean;
  receipt: AuthoringReceiptView | null;
  onClose: () => void;
  onOpenLibrary: () => void;
  onContinue: () => void;
}) {
  if (!receipt) return null;
  const copy = SAVE_RECEIPT_COPY[receipt.ownership];
  const needsFollowUp =
    receipt.reviewRequiredCount > 0 ||
    receipt.reviewPersonalOnlyCount > 0 ||
    receipt.sourceState === 'source_updated' ||
    receipt.sourceState === 'conflict_source_vs_user';
  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-receipt"
      title={copy.title}
      description={copy.description}
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={FLOW_UI_SECONDARY_ACTION_CLASS} onClick={onContinue}>
            계속 편집
          </button>
          <button
            type="button"
            data-testid="ta-authoring-library-toggle"
            className={FLOW_UI_PRIMARY_ACTION_CLASS}
            onClick={onOpenLibrary}
          >
            초안 목록으로
          </button>
        </>
      )}
    >
      <h3 className="text-xl font-semibold">{receipt.title}</h3>
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-[var(--flowme-border)] bg-[var(--flowme-border)]">
        {[
          ['포함 항목', `${receipt.itemCount}개`],
          ['기본 결과', receipt.artifact],
        ].map(([label, value]) => (
          <div key={label} className="bg-[var(--flowme-surface)] px-3 py-3">
            <dt className="text-[10px] text-[var(--flowme-text-tertiary)]">{label}</dt>
            <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {needsFollowUp ? (
        <p className="mt-4 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-warning-soft)] px-3 py-2 text-xs leading-5 text-[var(--flowme-warning-strong)]">
          외부 파일은 만들지 않았습니다. 권리·안전 확인이나 원문 변경 결정을
          마치기 전에는 파일로 가져갈 수 없습니다.
        </p>
      ) : null}
      <details
        data-testid="ta-authoring-receipt-details"
        className="mt-4 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)]"
      >
        <summary className="cursor-pointer px-3 py-3 text-sm font-semibold">
          저장 정보
        </summary>
        <div className="border-t border-[var(--flowme-border)] px-3 py-3">
          <dl className="space-y-2 text-xs">
            {[
              ['저장 시각', receipt.savedAtLabel],
              ['원문 연결', receipt.sourcePreserved ? '보존' : '확인 필요'],
              [
                '검토 기록',
                receipt.reviewRequiredCount > 0
                  ? `확인 전 ${receipt.reviewRequiredCount}개`
                  : receipt.reviewPersonalOnlyCount > 0
                    ? `개인용 제한 ${receipt.reviewPersonalOnlyCount}개`
                    : receipt.reviewEvidenceCount > 0
                      ? `사용자가 근거 기록 ${receipt.reviewEvidenceCount}개`
                      : '해당 없음',
              ],
              [
                '원문 버전',
                receipt.sourceState === 'current'
                  ? '현재 원문'
                  : receipt.sourceState === 'conflict_source_vs_user'
                    ? `내 값 충돌 · ${receipt.sourceOpenChangeCount}개`
                    : receipt.sourceState === 'source_updated'
                      ? `새 버전 대기 · ${receipt.sourceOpenChangeCount}개`
                      : '기록 없음',
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-4 border-b border-[var(--flowme-border)] pb-2 last:border-b-0 last:pb-0"
              >
                <dt className="text-[var(--flowme-text-secondary)]">{label}</dt>
                <dd className="break-words text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </AuthoringDialog>
  );
}

export function ExportPreflightDialog({
  open,
  preflight,
  scope,
  format,
  receipt,
  onScopeChange,
  onFormatChange,
  onConfirm,
  onClose,
}: {
  open: boolean;
  preflight: AuthoringArtifactPreflight | null;
  scope: AuthoringArtifactScope;
  format: string;
  receipt: AuthoringExportReceiptView | null;
  onScopeChange: (scope: AuthoringArtifactScope) => void;
  onFormatChange: (format: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-export-dialog"
      title={receipt ? '가져가기 기록' : '가져가기 전 확인'}
      description="형식보다 범위와 실제 포함 수를 먼저 확인합니다."
      onClose={onClose}
      footer={(
        <>
          <button type="button" className={FLOW_UI_SECONDARY_ACTION_CLASS} onClick={onClose}>
            {receipt ? '닫기' : '취소'}
          </button>
          {!receipt ? (
            <button
              type="button"
              className={FLOW_UI_PRIMARY_ACTION_CLASS}
              disabled={!preflight?.eligible}
              onClick={onConfirm}
            >
              {preflight?.count ?? 0}개 가져가기 확정
            </button>
          ) : null}
        </>
      )}
    >
      {receipt ? (
        <>
          <div className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-positive-soft)] px-3 py-3 text-sm font-semibold text-[var(--flowme-positive-strong)]">
            {ARTIFACT_LABEL[receipt.artifact]} · {receipt.count}개 ·{' '}
            {formatLabel(receipt.artifact, receipt.format)}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4 border-b border-[var(--flowme-border)] pb-2">
              <dt className="text-[var(--flowme-text-secondary)]">범위</dt>
              <dd className="font-semibold">{SCOPE_LABEL[receipt.scope]}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--flowme-border)] pb-2">
              <dt className="text-[var(--flowme-text-secondary)]">제외</dt>
              <dd className="font-semibold">{receipt.omittedCount}개</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--flowme-border)] pb-2">
              <dt className="text-[var(--flowme-text-secondary)]">기록 시각</dt>
              <dd className="font-semibold">{receipt.createdAtLabel}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--flowme-border)] pb-2">
              <dt className="text-[var(--flowme-text-secondary)]">권리·안전</dt>
              <dd className="font-semibold">
                {receipt.reviewEvidenceCount > 0
                  ? `사용자가 근거 기록 ${receipt.reviewEvidenceCount}개`
                  : '검토 항목 없음'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[var(--flowme-border)] pb-2">
              <dt className="text-[var(--flowme-text-secondary)]">원문 버전</dt>
              <dd className="font-semibold">
                {receipt.sourceState === 'current' ? '현재 원문' : '확인 필요'}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-[var(--flowme-text-secondary)]">
            선택한 범위와 파일에 포함된 항목 수를 기록했습니다. 외부 서비스에는
            연결하지 않았습니다.
          </p>
        </>
      ) : preflight ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                범위
              </span>
              <select
                className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full appearance-auto`}
                value={scope}
                onChange={(event) =>
                  onScopeChange(event.target.value as AuthoringArtifactScope)
                }
              >
                <option value="whole">전체</option>
                <option value="selected">선택 항목</option>
                <option value="current_step">현재 단계</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                형식
              </span>
              <select
                className={`${FLOW_UI_INPUT_CLASS} mt-1 w-full appearance-auto`}
                value={format}
                onChange={(event) => onFormatChange(event.target.value)}
              >
                {preflight.formats.map((candidate) => (
                  <option key={candidate} value={candidate}>
                    {formatLabel(preflight.artifact, candidate)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-[var(--flowme-border)] bg-[var(--flowme-border)] sm:grid-cols-4">
            {[
              ['대상', preflight.sourceItemCount],
              ['포함', preflight.count],
              ['제외', preflight.omittedCount],
              ['손실 안내', preflight.lossCount],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-[var(--flowme-surface)] px-3 py-3">
                <dd className="text-lg font-semibold">{value}</dd>
                <dt className="text-[10px] text-[var(--flowme-text-tertiary)]">{label}</dt>
              </div>
            ))}
          </dl>
          {preflight.firstItems.length > 0 ? (
            <section className="mt-4">
              <h3 className="text-xs font-semibold">먼저 포함되는 항목</h3>
              <ol className="mt-2 border-t border-[var(--flowme-border)]">
                {preflight.firstItems.map((title, index) => (
                  <li
                    key={`${index}-${title}`}
                    className="flex gap-3 border-b border-[var(--flowme-border)] py-2 text-xs"
                  >
                    <span className="text-[var(--flowme-text-tertiary)]">{index + 1}</span>
                    <span className="font-semibold">{title}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
          {preflight.losses.length > 0 ? (
            <section className="mt-4 bg-[var(--flowme-warning-soft)] px-3 py-3">
              <h3 className="text-xs font-semibold text-[var(--flowme-warning-strong)]">
                포함하지 않는 정보
              </h3>
              <ul className="mt-2 space-y-1 text-xs leading-5">
                {preflight.losses.slice(0, 8).map((loss) => (
                  <li key={loss.lossId}>— {loss.message}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : (
        <p className="text-sm">확인할 결과가 없습니다.</p>
      )}
    </AuthoringDialog>
  );
}

export function RoundTripDialog({
  open,
  value,
  onClose,
}: {
  open: boolean;
  value: AuthoringRoundTripView | null;
  onClose: () => void;
}) {
  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-roundtrip"
      title="Markdown 비교"
      description="지원하는 Markdown 범위로 내보낸 뒤 다시 읽었을 때 유지되는 내용을 확인합니다."
      onClose={onClose}
      footer={(
        <button type="button" className={FLOW_UI_PRIMARY_ACTION_CLASS} onClick={onClose}>
          확인 완료
        </button>
      )}
    >
      {value ? (
        <>
          <dl className="grid grid-cols-3 gap-px overflow-hidden border border-[var(--flowme-border)] bg-[var(--flowme-border)]">
            {[
              ['일치', value.matchedCount],
              ['변경', value.changedCount],
              ['확인 필요', value.unresolvedCount],
            ].map(([label, count]) => (
              <div key={String(label)} className="bg-[var(--flowme-surface)] px-3 py-3">
                <dd className="text-lg font-semibold">{count}</dd>
                <dt className="text-[10px] text-[var(--flowme-text-tertiary)]">{label}</dt>
              </div>
            ))}
          </dl>
          <pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap break-words bg-[var(--flowme-surface-subtle)] p-3 font-mono text-xs leading-5">
            {value.markdown}
          </pre>
          <p className="mt-3 text-xs leading-5 text-[var(--flowme-text-secondary)]">
            유지되지 않는 실행 상태: 완료, 재실행, 회차별 기록. 저작 원문에는 영향을
            주지 않습니다.
          </p>
          {value.lossFields.length > 0 ? (
            <p className="mt-2 text-xs text-[var(--flowme-warning-strong)]">
              확인할 필드: {value.lossFields.join(', ')}
            </p>
          ) : null}
        </>
      ) : null}
    </AuthoringDialog>
  );
}

export function HistoryDialog({
  open,
  title,
  history,
  onRestore,
  onClose,
}: {
  open: boolean;
  title: string;
  history: TextAuthoringDraftHistoryEntry[];
  onRestore: (versionId: string) => void;
  onClose: () => void;
}) {
  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-history"
      title={`${title} 저장 기록`}
      description="저장·복제·보관·복원 기록입니다."
      onClose={onClose}
      footer={(
        <button type="button" className={FLOW_UI_PRIMARY_ACTION_CLASS} onClick={onClose}>
          닫기
        </button>
      )}
    >
      {history.length > 0 ? (
        <ol className="border-t border-[var(--flowme-border)]">
          {[...history].reverse().map((entry, index) => (
            <li
              key={entry.versionId}
              className="grid gap-3 border-b border-[var(--flowme-border)] py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div>
                <p className="text-sm font-semibold">
                  {index === 0 ? '현재 저장본' : `이전 저장본 ${history.length - index}`}
                </p>
                <p className="mt-1 text-xs text-[var(--flowme-text-secondary)]">
                  {new Intl.DateTimeFormat('ko-KR', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(new Date(entry.savedAt))}
                  {' · '}
                  {HISTORY_KIND_LABEL[entry.kind] ?? entry.kind}
                </p>
              </div>
              <button
                type="button"
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                disabled={index === 0}
                onClick={() => onRestore(entry.versionId)}
              >
                이 버전 복원
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-[var(--flowme-text-secondary)]">저장 기록이 없습니다.</p>
      )}
    </AuthoringDialog>
  );
}
