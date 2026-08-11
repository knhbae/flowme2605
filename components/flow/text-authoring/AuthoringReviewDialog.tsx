'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from '@/components/flow/flow-ui';
import type {
  AuthoringReviewGate,
  AuthoringReviewGateStatus,
  TextAuthoringOwnership,
} from '@/lib/flow/text-authoring/types';

import { AuthoringDialog } from './AuthoringDialog';

type ReviewChoice = {
  value: string;
  status: AuthoringReviewGateStatus;
  label: string;
};

const STATUS_LABEL: Record<AuthoringReviewGateStatus, string> = {
  required: '확인 전',
  evidence_recorded: '사용자가 근거를 기록함',
  personal_only: '개인용으로 제한',
};

const RIGHTS_CHOICES: ReviewChoice[] = [
  {
    value: 'owned_source',
    status: 'evidence_recorded',
    label: '내가 만든 원문',
  },
  {
    value: 'permission_checked',
    status: 'evidence_recorded',
    label: '사용 허락 또는 이용 조건을 확인함',
  },
  {
    value: 'personal_only',
    status: 'personal_only',
    label: '개인용으로만 남김',
  },
  {
    value: 'needs_review',
    status: 'required',
    label: '아직 확인하지 못함',
  },
];

const SAFETY_CHOICES: ReviewChoice[] = [
  {
    value: 'source_recorded',
    status: 'evidence_recorded',
    label: '공식·원문 근거를 연결함',
  },
  {
    value: 'not_safety_sensitive',
    status: 'evidence_recorded',
    label: '안전 판단이 필요한 내용이 아님',
  },
  {
    value: 'personal_only',
    status: 'personal_only',
    label: '개인용으로만 남김',
  },
  {
    value: 'needs_review',
    status: 'required',
    label: '추가 검토가 필요함',
  },
];

function defaultChoiceValue(gate: AuthoringReviewGate): string {
  if (gate.status === 'personal_only') return 'personal_only';
  if (gate.status === 'evidence_recorded') {
    return gate.kind === 'rights' ? 'permission_checked' : 'source_recorded';
  }
  return '';
}

function gateTitle(kind: AuthoringReviewGate['kind']): string {
  return kind === 'rights'
    ? '이 원문을 제작자 초안에 사용할 근거가 있나요?'
    : '안전 검토가 필요한 내용인가요?';
}

function gateDescription(kind: AuthoringReviewGate['kind']): string {
  return kind === 'rights'
    ? 'FlowMe가 권리를 판정하지 않습니다. 사용자가 확인한 범위와 근거만 기록합니다.'
    : 'FlowMe가 문장만 보고 안전 민감도를 추측하지 않습니다. 해당 여부와 확인 근거를 사용자가 직접 기록합니다.';
}

export function AuthoringReviewDialog({
  open,
  gates,
  ownership,
  sourceLabel,
  onRecord,
  onClose,
}: {
  open: boolean;
  gates: AuthoringReviewGate[];
  ownership: TextAuthoringOwnership;
  sourceLabel: string;
  onRecord: (
    gateId: string,
    status: AuthoringReviewGateStatus,
    evidenceNote?: string,
  ) => void;
  onClose: () => void;
}) {
  const firstRequiredIndex = gates.findIndex((gate) => gate.status === 'required');
  const activeIndex =
    firstRequiredIndex >= 0 ? firstRequiredIndex : Math.max(0, gates.length - 1);
  const activeGate = gates[activeIndex];
  const [choiceValue, setChoiceValue] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');
  const [error, setError] = useState('');
  const issueRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeGate) return;
    setChoiceValue(defaultChoiceValue(activeGate));
    setEvidenceNote(activeGate.evidenceNote ?? '');
    setError('');
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      issueRef.current
        ?.querySelector<HTMLInputElement>('input[type="radio"]')
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeGate?.gateId, activeGate?.status, open]);

  const choices = useMemo(
    () =>
      activeGate?.kind === 'safety' ? SAFETY_CHOICES : RIGHTS_CHOICES,
    [activeGate?.kind],
  );
  const selectedChoice = choices.find((choice) => choice.value === choiceValue);
  const outstandingCount = gates.filter(
    (gate) => gate.status === 'required',
  ).length;

  const record = () => {
    if (!activeGate || !selectedChoice) {
      setError('확인 상태를 하나 선택해 주세요.');
      return;
    }
    const trimmedEvidence = evidenceNote.trim();
    if (selectedChoice.status === 'evidence_recorded' && !trimmedEvidence) {
      setError(
        activeGate.kind === 'rights'
          ? '확인 근거 URL 또는 짧은 메모를 남겨 주세요.'
          : '확인한 출처 또는 주의·중단 기준을 남겨 주세요.',
      );
      issueRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
      return;
    }
    setError('');
    onRecord(
      activeGate.gateId,
      selectedChoice.status,
      trimmedEvidence || undefined,
    );
  };

  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-review-dialog"
      title="저장·가져가기 전에 확인할 내용"
      description={`${gates.length}개 중 ${outstandingCount}개 확인 전 · 로컬 초안과 원문은 계속 보존됩니다.`}
      initialFocusSelector='[data-testid="ta-authoring-review-issue"] input[type="radio"]'
      onClose={onClose}
      footer={(
        <>
          <button
            type="button"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onClose}
          >
            나중에
          </button>
          {activeGate ? (
            <button
              type="button"
              data-testid="ta-authoring-review-record"
              className={FLOW_UI_PRIMARY_ACTION_CLASS}
              onClick={record}
            >
              {activeGate.kind === 'rights'
                ? '권리 확인 기록'
                : '안전 확인 기록'}
            </button>
          ) : null}
        </>
      )}
    >
      {activeGate ? (
        <div
          ref={issueRef}
          data-testid="ta-authoring-review-issue"
          data-review-kind={activeGate.kind}
          data-review-status={activeGate.status}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              확인 {activeIndex + 1}/{gates.length}
            </p>
            <span
              data-testid="ta-authoring-review-status"
              className="rounded bg-[var(--flowme-warning-soft)] px-2 py-1 text-xs font-semibold text-[var(--flowme-warning-strong)]"
            >
              {STATUS_LABEL[activeGate.status]}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em]">
            {gateTitle(activeGate.kind)}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
            {gateDescription(activeGate.kind)}
          </p>
          <p className="mt-3 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-surface-subtle)] px-3 py-2 text-xs leading-5">
            {sourceLabel || '연결된 출처 이름 없음'}
            {activeGate.sourceRowIds.length > 0
              ? ` · 원문 근거 ${activeGate.sourceRowIds.length}곳`
              : ''}
          </p>

          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">확인 상태 선택</legend>
            {choices.map((choice) => {
              const selected = choice.value === choiceValue;
              return (
                <label
                  key={choice.value}
                  className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--flowme-radius-control)] border px-3 py-3 text-sm font-semibold ${
                    selected
                      ? 'border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)]'
                      : 'border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)]'
                  }`}
                >
                  <input
                    type="radio"
                    name={`authoring-review-${activeGate.gateId}`}
                    value={choice.value}
                    checked={selected}
                    onChange={() => {
                      setChoiceValue(choice.value);
                      setError('');
                    }}
                  />
                  <span>{choice.label}</span>
                </label>
              );
            })}
          </fieldset>

          {selectedChoice?.status === 'evidence_recorded' ? (
            <label className="mt-4 block">
              <span className="text-xs font-semibold">
                {activeGate.kind === 'rights'
                  ? '확인 근거 URL 또는 짧은 메모'
                  : '확인한 출처 또는 주의·중단 기준'}
              </span>
              <textarea
                data-testid="ta-authoring-review-evidence"
                className={`${FLOW_UI_INPUT_CLASS} mt-1 min-h-24 w-full resize-y`}
                value={evidenceNote}
                onChange={(event) => {
                  setEvidenceNote(event.target.value);
                  setError('');
                }}
                placeholder={
                  activeGate.kind === 'rights'
                    ? '예: 본인 작성 원문 / 이용 조건 URL과 확인 범위'
                    : '예: 공식 출처 URL / 주의 범위와 중단 기준'
                }
              />
            </label>
          ) : null}

          {selectedChoice?.status === 'personal_only' &&
          ownership !== 'personal' ? (
            <p className="mt-4 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-warning-soft)] px-3 py-3 text-xs leading-5 text-[var(--flowme-warning-strong)]">
              공개 원본과 분리된 새 개인 초안으로 전환합니다. 로컬 저장은 가능하지만
              제한된 외부 파일 생성은 계속 막힙니다.
            </p>
          ) : null}

          <p
            aria-live="polite"
            className="mt-3 min-h-5 text-xs font-semibold text-[var(--flowme-danger-strong)]"
          >
            {error}
          </p>
        </div>
      ) : (
        <p className="text-sm text-[var(--flowme-text-secondary)]">
          확인할 권리·안전 항목이 없습니다.
        </p>
      )}
    </AuthoringDialog>
  );
}
