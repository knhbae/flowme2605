"use client";

import { useState } from "react";

import {
  FLOW_UI_ICON_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from "@/components/flow/flow-ui";
import type { AuthoringIssueOutcome } from "@/lib/flow/text-authoring/types";

import type {
  AuthoringCounts,
  AuthoringIssueView,
  AuthoringItemView,
  AuthoringRole,
  AuthoringStepView,
} from "./authoring-ui-types";

const ROLE_LABEL: Record<AuthoringRole, string> = {
  item: "할 일",
  resource: "자료",
  guide: "안내",
  caution: "주의",
  detail: "설명",
  completion: "완료 기준",
  unresolved: "확인 필요",
};

function RoleBadge({ role }: { role: AuthoringRole }) {
  const warning = role === "unresolved" || role === "caution";
  const contextual = role === "resource" || role === "guide";
  return (
    <span
      className={`inline-flex min-h-6 shrink-0 items-center rounded px-2 text-[10px] font-bold ${
        warning
          ? "bg-[var(--flowme-warning-soft)] text-[var(--flowme-warning-strong)]"
          : contextual
            ? "bg-[var(--flowme-soft)] text-[var(--flowme-text-secondary)]"
            : "bg-[var(--flowme-positive-soft)] text-[var(--flowme-positive-strong)]"
      }`}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

function scheduleSummary(item: AuthoringItemView): string {
  const parts = [
    item.relativeDate || item.date,
    item.time
      ? `${item.time}${item.timezone ? ` (${item.timezone})` : ""}`
      : "",
    item.duration ? `소요 ${item.duration}` : "",
    item.repeat ? `반복 ${item.repeat}` : "",
  ].filter(Boolean);
  return parts.join(" · ");
}

function IssueDecisionCard({
  issue,
  onResolveIssue,
}: {
  issue: AuthoringIssueView;
  onResolveIssue: (issueId: string, outcome: AuthoringIssueOutcome) => void;
}) {
  const canKeepSource = issue.availableOutcomes.includes("keep_source_only");
  const canConvert = issue.availableOutcomes.includes("convert_to_item");
  const canHold =
    issue.state === "open" && issue.availableOutcomes.includes("hold");

  return (
    <fieldset
      data-testid="ta-authoring-issue-card"
      data-issue-id={issue.issueId}
      data-issue-state={issue.state}
      className="min-w-0 border border-[var(--flowme-warning)] bg-[var(--flowme-surface)] p-3"
    >
      <legend className="sr-only">{issue.sourceLineLabel} 문장 분류</legend>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[var(--flowme-warning-strong)]">
          {issue.sourceLineLabel}
        </span>
        {issue.state === "held" ? (
          <span className="rounded bg-[var(--flowme-warning-soft)] px-2 py-1 text-[10px] font-bold text-[var(--flowme-warning-strong)]">
            나중에 결정
          </span>
        ) : null}
        {issue.blocking ? (
          <span className="rounded border border-[var(--flowme-warning)] px-2 py-1 text-[10px] font-bold text-[var(--flowme-warning-strong)]">
            저장 전 확인
          </span>
        ) : null}
      </div>
      <blockquote
        data-testid="ta-authoring-issue-source"
        className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[var(--flowme-border-strong)] pl-3 text-sm font-semibold leading-6 text-[var(--flowme-text)]"
      >
        {issue.rawText}
      </blockquote>
      <p className="mt-2 text-xs leading-5 text-[var(--flowme-text-secondary)]">
        {issue.reason}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {canKeepSource ? (
          <button
            type="button"
            data-testid="ta-authoring-issue-keep-source"
            className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
            aria-label={`${issue.sourceLineLabel} 원문에만 남기기`}
            onClick={() => onResolveIssue(issue.issueId, "keep_source_only")}
          >
            원문에만
          </button>
        ) : null}
        {canConvert ? (
          <button
            type="button"
            data-testid="ta-authoring-issue-convert-item"
            className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full border-[var(--flowme-positive)]`}
            aria-label={`${issue.sourceLineLabel} 할 일로 만들기`}
            onClick={() => onResolveIssue(issue.issueId, "convert_to_item")}
          >
            할 일로
          </button>
        ) : null}
        {canHold ? (
          <button
            type="button"
            data-testid="ta-authoring-issue-hold"
            className={`${FLOW_UI_SECONDARY_ACTION_CLASS} col-span-2 w-full sm:col-span-1`}
            aria-label={`${issue.sourceLineLabel} 나중에 정하기`}
            onClick={() => onResolveIssue(issue.issueId, "hold")}
          >
            보류
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}

export function StructurePane({
  steps,
  counts,
  selectedItemId,
  selectedItem,
  issues,
  stale,
  embedded = false,
  hasUndo,
  canMergeNext,
  onSelectItem,
  onEditItem,
  onMove,
  onMergeNext,
  onSplit,
  onRoleChange,
  onToggleIncluded,
  onResolveIssue,
  onUndo,
}: {
  steps: AuthoringStepView[];
  counts: AuthoringCounts;
  selectedItemId: string | null;
  selectedItem: AuthoringItemView | null;
  issues: AuthoringIssueView[];
  stale: boolean;
  embedded?: boolean;
  hasUndo: boolean;
  canMergeNext: boolean;
  onSelectItem: (itemId: string) => void;
  onEditItem: (itemId: string) => void;
  onMove: (direction: -1 | 1) => void;
  onMergeNext: () => void;
  onSplit: () => void;
  onRoleChange: (role: AuthoringRole) => void;
  onToggleIncluded: () => void;
  onResolveIssue: (issueId: string, outcome: AuthoringIssueOutcome) => void;
  onUndo: () => void;
}) {
  const [structureEditorOpen, setStructureEditorOpen] = useState(false);
  const controlsDisabled = selectedItem === null;
  const actionableOpenIssues = issues.filter(
    (issue) => issue.state === "open" && issue.availableOutcomes.length > 0,
  );
  const passiveIssues = issues.filter(
    (issue) => issue.availableOutcomes.length === 0,
  );
  const heldIssues = issues.filter(
    (issue) => issue.state === "held" && issue.availableOutcomes.length > 0,
  );
  const activeIssue = actionableOpenIssues[0];

  return (
    <section
      data-source-stale={stale}
      className={`ta-pane ta-structure-pane flex min-h-0 flex-col bg-[var(--flowme-surface)] ${
        embedded
          ? "h-auto"
          : "h-full border-l border-[var(--flowme-border)]"
      }`}
      aria-labelledby="text-authoring-structure-heading"
    >
      <header className={`ta-pane-header border-b border-[var(--flowme-border)] ${
        embedded ? "px-0 pb-4" : "px-4 py-4"
      }`}>
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="text-authoring-structure-heading"
            className="text-lg font-semibold tracking-[-0.02em]"
          >
            해석된 항목
          </h2>
          {stale ? (
            <span className="bg-[var(--flowme-warning-soft)] px-2 py-1 text-[10px] font-bold text-[var(--flowme-warning-strong)]">
              입력 변경됨
            </span>
          ) : null}
          <button
            type="button"
            data-testid="ta-authoring-structure-edit-toggle"
            aria-expanded={structureEditorOpen}
            className={`${FLOW_UI_SECONDARY_ACTION_CLASS} ml-auto shrink-0`}
            disabled={steps.length === 0}
            onClick={() => setStructureEditorOpen((current) => !current)}
          >
            {structureEditorOpen ? "수정 닫기" : "순서·묶음 수정"}
          </button>
        </div>
        {stale ? (
          <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
            아래 내용은 변경 전 결과입니다. 다시 해석해 반영하세요.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--flowme-text-secondary)]">
          <span>{counts.steps}단계</span>
          <span aria-hidden="true">·</span>
          <span>{counts.included}개 항목</span>
          {counts.unresolved > 0 ? (
            <span className="ml-auto rounded bg-[var(--flowme-warning-soft)] px-2 py-1 font-semibold text-[var(--flowme-warning-strong)]">
              {counts.unresolved}개 확인
            </span>
          ) : null}
        </div>
      </header>

      {structureEditorOpen ? (
        <section
          data-testid="ta-authoring-structure-editor"
          className="border-b border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-3 py-4 sm:px-4"
          aria-label="선택한 항목의 순서와 묶음 수정"
        >
          <p className="mb-3 text-xs leading-5 text-[var(--flowme-text-secondary)]">
            선택한 항목의 순서·묶음·역할만 바꿉니다. 원문은 변경 기록과 함께 보존됩니다.
          </p>
        {selectedItem ? (
          <>
            <section className="rounded-[var(--flowme-radius-control)] bg-[var(--flowme-surface-subtle)] px-3 py-3">
              <p className="text-[10px] font-bold text-[var(--flowme-text-tertiary)]">
                선택한 항목
              </p>
              <p className="mt-1 break-words text-sm font-semibold">
                {selectedItem.title}
              </p>
            </section>
            <div
              className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
              role="toolbar"
              aria-label="선택한 항목의 구조 고치기"
            >
            <button
              type="button"
              className={FLOW_UI_ICON_ACTION_CLASS}
              aria-label="항목을 위로 이동"
              title="위로 이동 (Alt+↑)"
              disabled={controlsDisabled}
              onClick={() => onMove(-1)}
            >
              ↑
            </button>
            <button
              type="button"
              className={FLOW_UI_ICON_ACTION_CLASS}
              aria-label="항목을 아래로 이동"
              title="아래로 이동 (Alt+↓)"
              disabled={controlsDisabled}
              onClick={() => onMove(1)}
            >
              ↓
            </button>
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              disabled={controlsDisabled || !canMergeNext}
              onClick={onMergeNext}
            >
              다음과 합치기
            </button>
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              disabled={controlsDisabled}
              onClick={onSplit}
            >
              나누기
            </button>
              <label className="col-span-2 block sm:min-w-40">
                <span className="mb-1 block text-xs font-semibold text-[var(--flowme-text-secondary)]">
                  역할
                </span>
                <select
                  id="text-authoring-role"
                  aria-label="선택 항목 역할"
                  className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full appearance-auto`}
                  value={selectedItem.role}
                  disabled={controlsDisabled}
                  onChange={(event) =>
                    onRoleChange(event.target.value as AuthoringRole)
                  }
                >
                  <option value="item">할 일</option>
                  <option value="resource">자료</option>
                  <option value="guide">안내</option>
                  <option value="caution">주의</option>
                  <option value="completion">완료 기준</option>
                </select>
              </label>
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              disabled={controlsDisabled}
              onClick={onToggleIncluded}
            >
              {selectedItem?.included === false
                ? "결과에 넣기"
                : "결과에서 빼기"}
            </button>
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              disabled={!hasUndo}
              onClick={onUndo}
            >
              되돌리기
            </button>
            </div>
          </>
        ) : (
          <p className="text-sm leading-6 text-[var(--flowme-text-secondary)]">
            아래 목록에서 수정할 항목을 먼저 선택하세요.
          </p>
        )}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              onClick={() => setStructureEditorOpen(false)}
            >
              수정 닫기
            </button>
          </div>
        </section>
      ) : null}

      <div
        data-authoring-pane-scroll
        className={embedded ? "min-h-0" : "min-h-0 flex-1 overflow-y-auto"}
      >
        {issues.length > 0 ? (
          <section
            data-testid="ta-authoring-issue-section"
            className="m-4 border-l-2 border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-3"
            aria-labelledby="text-authoring-issue-heading"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3
                id="text-authoring-issue-heading"
                className="text-sm font-semibold text-[var(--flowme-warning-strong)]"
              >
                결정이 필요한 문장 {issues.length}개
              </h3>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
              한 문장씩 결과에 넣을지 정하세요. 보류한 문장은 확인 필요 상태로
              남습니다.
            </p>

            {activeIssue ? (
              <div className="mt-3">
                <IssueDecisionCard
                  issue={activeIssue}
                  onResolveIssue={onResolveIssue}
                />
                {actionableOpenIssues.length > 1 ? (
                  <p className="mt-2 text-[11px] font-semibold text-[var(--flowme-text-secondary)]">
                    이 문장을 정하면 다음 {actionableOpenIssues.length - 1}개를
                    이어서 보여 드립니다.
                  </p>
                ) : null}
              </div>
            ) : null}

            {passiveIssues.length > 0 ? (
              <div className="mt-3 space-y-2">
                {passiveIssues.map((issue) => (
                  <article
                    key={issue.issueId}
                    className="border border-[var(--flowme-warning)] bg-[var(--flowme-surface)] p-3"
                  >
                    <p className="text-[10px] font-bold text-[var(--flowme-warning-strong)]">
                      {issue.sourceLineLabel}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs font-semibold leading-5">
                      {issue.rawText}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
                      {issue.reason} 원문을 고쳐 다시 해석해 주세요.
                    </p>
                  </article>
                ))}
              </div>
            ) : null}

            {heldIssues.length > 0 ? (
              <details
                data-testid="ta-authoring-held-issues"
                className="mt-3 border-t border-[var(--flowme-warning)] pt-2"
              >
                <summary
                  data-testid="ta-authoring-held-issues-summary"
                  className="min-h-11 cursor-pointer py-3 text-xs font-semibold text-[var(--flowme-warning-strong)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                >
                  나중에 정할 문장 {heldIssues.length}개
                </summary>
                <div className="space-y-2 pb-1">
                  {heldIssues.map((issue) => (
                    <IssueDecisionCard
                      key={issue.issueId}
                      issue={issue}
                      onResolveIssue={onResolveIssue}
                    />
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        ) : null}

        <div className="border-t border-[var(--flowme-border-strong)]">
          {steps.map((step, stepIndex) => (
            <section
              key={step.stepId}
              aria-labelledby={`text-authoring-${step.stepId}`}
            >
              <header className="sticky top-0 z-10 flex items-baseline gap-2 border-b border-t border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-4 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--flowme-positive-strong)]">
                  단계 {stepIndex + 1}
                </span>
                <h3
                  id={`text-authoring-${step.stepId}`}
                  className="min-w-0 truncate text-sm font-semibold"
                >
                  {step.title}
                </h3>
                <span className="ml-auto text-[10px] text-[var(--flowme-text-tertiary)]">
                  {step.items.filter((item) => item.included).length}개
                </span>
              </header>
              <ol>
                {step.items.map((item) => {
                  const selected = item.itemId === selectedItemId;
                  const itemSchedule = scheduleSummary(item);
                  return (
                    <li
                      key={item.itemId}
                      className="flex min-w-0 items-stretch border-b border-[var(--flowme-border)]"
                    >
                      <button
                        type="button"
                        data-testid={
                          item.included
                            ? "ta-authoring-item"
                            : "ta-authoring-excluded-item"
                        }
                        data-ta-item-id={item.itemId}
                        aria-pressed={selected}
                        className={`min-w-0 flex-1 px-4 py-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)] ${
                          selected
                            ? "bg-[var(--flowme-positive-soft)]"
                            : "bg-[var(--flowme-surface)] hover:bg-[var(--flowme-surface-subtle)]"
                        } ${item.included ? "" : "opacity-55"}`}
                        onClick={() => onSelectItem(item.itemId)}
                      >
                        <span className="flex items-start gap-2">
                          <span
                            data-testid="ta-authoring-item-marker"
                            aria-hidden="true"
                            className="shrink-0 pt-0.5 font-mono text-[11px] font-bold leading-5 text-[var(--flowme-positive-strong)]"
                          >
                            - [ ]
                          </span>
                          {item.role === "item" ? null : (
                            <RoleBadge role={item.role} />
                          )}
                          <span className="min-w-0 flex-1">
                            <span
                              className={`block break-words text-sm font-semibold leading-5 ${
                                item.included ? "" : "line-through"
                              }`}
                            >
                              {item.title}
                            </span>
                            {itemSchedule ? (
                              <span className="mt-1 block text-[11px] text-[var(--flowme-text-tertiary)]">
                                <span aria-hidden="true">↳ </span>
                                {itemSchedule}
                              </span>
                            ) : null}
                          </span>
                          <span
                            data-testid="ta-authoring-item-selection"
                            aria-hidden="true"
                            className="shrink-0 text-xs font-semibold text-[var(--flowme-positive-strong)]"
                          >
                            {selected ? "✓" : ""}
                          </span>
                          <span
                            aria-hidden="true"
                            className="shrink-0 text-[11px] font-semibold text-[var(--flowme-action)] md:hidden"
                          >
                            수정 ›
                          </span>
                        </span>
                      </button>
                      {selected ? (
                        <button
                          type="button"
                          data-testid="ta-authoring-item-edit"
                          className={`${FLOW_UI_SECONDARY_ACTION_CLASS} m-2 hidden shrink-0 self-center md:inline-flex`}
                          aria-label={`${item.title} 내용 수정`}
                          onClick={() => onEditItem(item.itemId)}
                        >
                          수정
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>

        {steps.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold">항목 구조가 없습니다.</p>
            <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
              원문을 입력하면 해석된 항목이 여기에 표시됩니다.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
