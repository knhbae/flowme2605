"use client";

import { useEffect, useMemo, useRef } from "react";

import {
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from "@/components/flow/flow-ui";
import type {
  AuthoringSourceState,
  AuthoringSourceUpdateChange,
  AuthoringSourceUpdateResolution,
} from "@/lib/flow/text-authoring/types";

import { AuthoringDialog } from "./AuthoringDialog";

export type SourceUpdateCreatorDecision =
  "keep_working" | "use_incoming" | "later";

export type SourceUpdateDialogChange = {
  changeId: string;
  label: string;
  baseValue?: unknown;
  workingValue?: unknown;
  incomingValue?: unknown;
  decision?: SourceUpdateCreatorDecision;
};

export type SourceUpdateDialogView = {
  status:
    | "update-detected"
    | "comparing"
    | "conflict"
    | "deferred"
    | "stale-candidate"
    | "applying"
    | "apply-failed";
  changes: SourceUpdateDialogChange[];
  selectedChangeId?: string;
  creatorCanApply: boolean;
  userCorrectionCount: number;
  errorMessage?: string;
};

function displayValue(value: unknown): string {
  if (value == null || value === "") return "없음";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "포함" : "제외";
  if (Array.isArray(value)) {
    if (value.length === 0) return "없음";
    return value.map(displayValue).join(" / ");
  }
  if (typeof value === "object") {
    if ("title" in value && typeof value.title === "string") return value.title;
    if ("doneWhen" in value && typeof value.doneWhen === "string") {
      return value.doneWhen;
    }
    if ("raw" in value && typeof value.raw === "string") return value.raw;
    if ("date" in value && typeof value.date === "string") return value.date;
    if ("url" in value && typeof value.url === "string") {
      const label =
        "label" in value && typeof value.label === "string"
          ? value.label
          : value.url;
      return `${label} · ${value.url}`;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return "구조화된 내용";
    }
  }
  return String(value);
}

function statusMessage(view: SourceUpdateDialogView): string | null {
  if (!view.creatorCanApply) {
    return "이 초안을 수정할 권한이 없어 새 원문을 적용할 수 없습니다.";
  }
  if (view.status === "stale-candidate") {
    return "비교를 시작한 뒤 내 작업이 달라졌습니다. 현재 작업 기준으로 새 원문을 다시 받아 주세요.";
  }
  if (view.status === "apply-failed") {
    return (
      view.errorMessage ??
      "변경을 적용하지 못했습니다. 내 작업과 선택은 그대로 남아 있습니다."
    );
  }
  return null;
}

function SourceCandidateDialog({
  open,
  view,
  onSelectChange,
  onResolve,
  onApply,
  onReject,
  onLater,
}: {
  open: boolean;
  view: SourceUpdateDialogView | null;
  onSelectChange: (changeId: string) => void;
  onResolve: (changeId: string, decision: SourceUpdateCreatorDecision) => void;
  onApply: () => void;
  onReject: () => void;
  onLater: () => void;
}) {
  const changes = view?.changes ?? [];
  const unresolvedCount = changes.filter(
    (change) => !change.decision || change.decision === "later",
  ).length;
  const activeChange =
    changes.find((change) => change.changeId === view?.selectedChangeId) ??
    changes.find((change) => !change.decision || change.decision === "later") ??
    changes[0];
  const activeIndex = activeChange
    ? changes.findIndex((change) => change.changeId === activeChange.changeId)
    : -1;
  const changeRef = useRef<HTMLDivElement>(null);
  const blockedMessage = view ? statusMessage(view) : null;
  const applyDisabled = Boolean(
    !view ||
    !view.creatorCanApply ||
    unresolvedCount > 0 ||
    view.status === "stale-candidate" ||
    view.status === "applying",
  );
  const decisionOptions = useMemo(
    () => [
      { value: "keep_working" as const, label: "내 작업 유지" },
      { value: "use_incoming" as const, label: "새 원문 선택" },
      { value: "later" as const, label: "나중에 결정" },
    ],
    [],
  );

  useEffect(() => {
    if (!open || !activeChange) return;
    const frame = window.requestAnimationFrame(() => {
      changeRef.current
        ?.querySelector<HTMLInputElement>('input[type="radio"]')
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeChange?.changeId, open]);

  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-source-candidate-dialog"
      title="새 원문과 내 작업 비교"
      description={
        unresolvedCount > 0
          ? `${unresolvedCount}곳을 더 결정해야 적용할 수 있습니다.`
          : "모든 변경을 결정했습니다. 적용 전까지 내 작업은 바뀌지 않습니다."
      }
      initialFocusSelector='[data-testid="ta-authoring-source-candidate-change"] input[type="radio"]'
      variant="drawer"
      onClose={onLater}
      footer={
        <>
          <button
            type="button"
            data-testid="ta-authoring-source-candidate-later"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onLater}
          >
            닫고 나중에
          </button>
          <button
            type="button"
            data-testid="ta-authoring-source-candidate-reject"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            disabled={!view?.creatorCanApply}
            onClick={onReject}
          >
            이 새 원문 사용하지 않기
          </button>
          <button
            type="button"
            data-testid="ta-authoring-source-candidate-apply"
            className={FLOW_UI_PRIMARY_ACTION_CLASS}
            disabled={applyDisabled}
            onClick={onApply}
          >
            {view?.status === "applying" ? "적용하는 중…" : "결정한 변경 적용"}
          </button>
        </>
      }
    >
      {view && activeChange ? (
        <div className="grid min-h-0 gap-4 min-[900px]:grid-cols-[10rem_minmax(0,1fr)]">
          <nav aria-label="달라진 곳" className="min-w-0">
            <ol className="flex gap-2 overflow-x-auto pb-1 min-[900px]:flex-col min-[900px]:overflow-visible">
              {changes.map((change, index) => {
                const selected = change.changeId === activeChange.changeId;
                const decided = Boolean(
                  change.decision && change.decision !== "later",
                );
                return (
                  <li
                    key={change.changeId}
                    className="shrink-0 min-[900px]:w-full"
                  >
                    <button
                      type="button"
                      data-testid="ta-authoring-source-candidate-change-nav"
                      data-change-id={change.changeId}
                      aria-current={selected ? "step" : undefined}
                      className={`min-h-11 w-full rounded-[var(--flowme-radius-control)] border px-3 py-2 text-left text-xs font-semibold ${
                        selected
                          ? "border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]"
                          : "border-[var(--flowme-border)] bg-[var(--flowme-surface)] text-[var(--flowme-text-secondary)]"
                      }`}
                      onClick={() => onSelectChange(change.changeId)}
                    >
                      <span className="block">변경 {index + 1}</span>
                      <span className="mt-0.5 block truncate font-normal">
                        {decided ? "결정 완료" : "결정 필요"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div
            ref={changeRef}
            data-testid="ta-authoring-source-candidate-change"
            data-change-id={activeChange.changeId}
            className="min-w-0"
          >
            <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              변경 {activeIndex + 1}/{changes.length}
            </p>
            <h3 className="mt-1 text-lg font-semibold">{activeChange.label}</h3>

            {view.userCorrectionCount > 0 ? (
              <p className="mt-2 text-xs leading-5 text-[var(--flowme-text-secondary)]">
                내가 고친 내용 {view.userCorrectionCount}개는 선택하기 전까지
                그대로 유지됩니다.
              </p>
            ) : null}

            {blockedMessage ? (
              <div
                role="alert"
                data-testid="ta-authoring-source-candidate-error"
                className="mt-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-danger)] bg-[var(--flowme-danger-soft)] px-3 py-3 text-sm leading-5 text-[var(--flowme-danger-strong)]"
              >
                {blockedMessage}
              </div>
            ) : null}

            <dl className="mt-4 grid gap-2">
              <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3">
                <dt className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                  기준 원문
                </dt>
                <dd
                  data-testid="ta-authoring-source-candidate-base"
                  className="mt-2 whitespace-pre-wrap break-words text-sm"
                >
                  {displayValue(activeChange.baseValue)}
                </dd>
              </div>
              <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] p-3">
                <dt className="text-xs font-semibold text-[var(--flowme-positive-strong)]">
                  내 작업
                </dt>
                <dd
                  data-testid="ta-authoring-source-candidate-working"
                  className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold"
                >
                  {displayValue(activeChange.workingValue)}
                </dd>
              </div>
              <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] p-3">
                <dt className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                  새 원문
                </dt>
                <dd
                  data-testid="ta-authoring-source-candidate-incoming"
                  className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold"
                >
                  {displayValue(activeChange.incomingValue)}
                </dd>
              </div>
            </dl>

            <fieldset className="mt-4 grid gap-2">
              <legend className="text-sm font-semibold">
                이 변경은 어떻게 할까요?
              </legend>
              {decisionOptions.map((option) => {
                const selected = activeChange.decision === option.value;
                return (
                  <label
                    key={option.value}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-[var(--flowme-radius-control)] border px-3 py-3 text-sm font-semibold ${
                      selected
                        ? "border-[var(--flowme-action)] bg-[var(--flowme-action-soft)]"
                        : "border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`source-candidate-${activeChange.changeId}`}
                      value={option.value}
                      checked={selected}
                      data-testid={`ta-authoring-source-candidate-choice-${option.value}`}
                      disabled={
                        !view.creatorCanApply ||
                        view.status === "stale-candidate"
                      }
                      onChange={() =>
                        onResolve(activeChange.changeId, option.value)
                      }
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </fieldset>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--flowme-text-secondary)]">
          비교할 원문 변경이 없습니다.
        </p>
      )}
    </AuthoringDialog>
  );
}

type PendingLegacySourceState = Extract<
  AuthoringSourceState,
  { status: "source_updated" | "conflict_source_vs_user" }
>;

type LegacySourceUpdateDialogProps = {
  open: boolean;
  state: PendingLegacySourceState | null;
  userCorrectionCount: number;
  onResolve: (
    changeId: string,
    resolution: AuthoringSourceUpdateResolution,
  ) => void;
  onApply: () => void;
  onReject: () => void;
  onLater: () => void;
};

type CandidateSourceUpdateDialogProps = {
  open: boolean;
  view: SourceUpdateDialogView | null;
  onSelectChange: (changeId: string) => void;
  onResolve: (changeId: string, decision: SourceUpdateCreatorDecision) => void;
  onApply: () => void;
  onReject: () => void;
  onLater: () => void;
};

function legacyChangeLabel(change: AuthoringSourceUpdateChange): string {
  if (change.kind === "added") return "새 원문에 항목이 추가됐습니다";
  if (change.kind === "removed") return "새 원문에서 항목이 빠졌습니다";
  const labels: Record<string, string> = {
    title: "제목",
    detail: "설명",
    completion: "완료 기준",
    schedule: "날짜·반복",
    resources: "자료 링크",
    sources: "출처 링크",
    guides: "안내",
    cautions: "주의",
    role: "항목 역할",
    included: "포함 여부",
    nesting: "들여쓰기",
    order: "항목 순서",
    step_mapping: "단계 연결",
  };
  return `${labels[change.field] ?? change.field}가 달라졌습니다`;
}

function legacyResolutionOptions(
  change: AuthoringSourceUpdateChange,
): Array<{ value: AuthoringSourceUpdateResolution; label: string }> {
  if (change.kind === "added") {
    return [
      { value: "include_added", label: "새 항목 포함" },
      { value: "exclude_added", label: "새 항목은 제외" },
    ];
  }
  if (change.kind === "removed") {
    return [
      { value: "keep_previous", label: "이전 원문 연결 유지" },
      { value: "remove_removed", label: "새 원문처럼 결과에서 제외" },
    ];
  }
  if (change.userValue !== undefined) {
    return [
      { value: "keep_user", label: "내 값 유지" },
      { value: "use_incoming", label: "새 원문 값 사용" },
    ];
  }
  return [{ value: "use_incoming", label: "새 원문 값 사용" }];
}

function LegacySourceUpdateDialog({
  open,
  state,
  userCorrectionCount,
  onResolve,
  onApply,
  onReject,
  onLater,
}: LegacySourceUpdateDialogProps) {
  const changes = state?.changes ?? [];
  const unresolvedCount = changes.filter(
    (change) => change.state === "open",
  ).length;
  const activeChange =
    changes.find((change) => change.state === "open") ??
    changes[changes.length - 1];
  const activeIndex = activeChange
    ? changes.findIndex((change) => change.changeId === activeChange.changeId)
    : -1;
  const options = activeChange ? legacyResolutionOptions(activeChange) : [];

  return (
    <AuthoringDialog
      open={open}
      testId="ta-authoring-source-compare-dialog"
      title="원문 변경 비교"
      description={`이전 원문, 새 원문, 내가 고친 값을 자동으로 합치지 않고 함께 보존합니다. ${unresolvedCount}곳 선택 필요.`}
      initialFocusSelector='[data-testid="ta-authoring-source-change"] input[type="radio"]'
      onClose={onLater}
      footer={
        <>
          <button
            type="button"
            data-testid="ta-authoring-source-update-later"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onLater}
          >
            나중에
          </button>
          <button
            type="button"
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={onReject}
          >
            이 새 버전 사용하지 않기
          </button>
          <button
            type="button"
            data-testid="ta-authoring-source-update-apply"
            className={FLOW_UI_PRIMARY_ACTION_CLASS}
            disabled={!state || unresolvedCount > 0}
            onClick={onApply}
          >
            선택한 변경 {changes.length}개 적용
          </button>
        </>
      }
    >
      {state && activeChange ? (
        <>
          <p className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-warning-soft)] px-3 py-3 text-xs leading-5 text-[var(--flowme-warning-strong)]">
            내 수정 {userCorrectionCount}개와 현재 결과는 그대로 보존했습니다.
          </p>
          <div data-testid="ta-authoring-source-change" className="mt-4">
            <p className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              변경 {activeIndex + 1}/{changes.length}
            </p>
            <h3 className="mt-1 text-lg font-semibold">
              {legacyChangeLabel(activeChange)}
            </h3>
            <dl className="mt-4 grid gap-2 lg:grid-cols-3">
              {activeChange.kind !== "added" ? (
                <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3">
                  <dt className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                    이전 원문
                  </dt>
                  <dd
                    data-testid="ta-authoring-source-old-value"
                    className="mt-2 break-words text-sm font-semibold"
                  >
                    {displayValue(activeChange.oldSourceValue)}
                  </dd>
                </div>
              ) : null}
              {activeChange.kind !== "removed" ? (
                <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] p-3">
                  <dt className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
                    새 원문
                  </dt>
                  <dd
                    data-testid="ta-authoring-source-new-value"
                    className="mt-2 break-words text-sm font-semibold"
                  >
                    {displayValue(activeChange.incomingSourceValue)}
                  </dd>
                </div>
              ) : null}
              {activeChange.kind === "changed" ? (
                <div className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] p-3">
                  <dt className="text-xs font-semibold text-[var(--flowme-positive-strong)]">
                    내가 고친 값
                  </dt>
                  <dd
                    data-testid="ta-authoring-source-user-value"
                    className="mt-2 break-words text-sm font-semibold"
                  >
                    {displayValue(activeChange.userValue)}
                  </dd>
                </div>
              ) : null}
            </dl>
            <fieldset className="mt-4 grid gap-2 sm:grid-cols-2">
              <legend className="sr-only">이 변경에 사용할 값</legend>
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] px-3 py-3 text-sm font-semibold"
                >
                  <input
                    type="radio"
                    name={`source-update-${activeChange.changeId}`}
                    value={option.value}
                    checked={activeChange.resolution === option.value}
                    data-testid={
                      option.value === "keep_user"
                        ? "ta-authoring-source-choice-keep-user"
                        : option.value === "use_incoming"
                          ? "ta-authoring-source-choice-use-new"
                          : undefined
                    }
                    onChange={() =>
                      onResolve(activeChange.changeId, option.value)
                    }
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
          </div>
        </>
      ) : (
        <p className="text-sm text-[var(--flowme-text-secondary)]">
          비교할 원문 변경이 없습니다.
        </p>
      )}
    </AuthoringDialog>
  );
}

/**
 * The P1-E view is opt-in. Legacy staged source updates remain operable when
 * the feature gate is off, so rollback never strands an existing P0 draft.
 */
export function SourceUpdateDialog(
  props: CandidateSourceUpdateDialogProps | LegacySourceUpdateDialogProps,
) {
  if ("view" in props) return <SourceCandidateDialog {...props} />;
  return <LegacySourceUpdateDialog {...props} />;
}
