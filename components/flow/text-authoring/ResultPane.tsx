"use client";

import { useState } from "react";

import {
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from "@/components/flow/flow-ui";
import type {
  AuthoringArtifactKind,
  AuthoringArtifactPreflight,
  AuthoringArtifactProjection,
  AuthoringArtifactRow,
  AuthoringArtifactView,
} from "@/lib/flow/text-authoring/artifact-projection";
import type {
  AuthoringReviewGate,
  AuthoringSourceState,
} from "@/lib/flow/text-authoring/types";

import { InlineHelp } from "./InlineHelp";

const ARTIFACT_LABEL: Record<AuthoringArtifactKind, string> = {
  calendar: "캘린더",
  todo: "체크/할 일",
  sheet: "표/엑셀",
  memo: "텍스트",
};

const RESULT_SLOT_ORDER: AuthoringArtifactKind[] = [
  "calendar",
  "todo",
  "sheet",
  "memo",
];

const PREVIEW_ROW_LIMIT = 8;

const PREVIEW_TEST_ID: Record<AuthoringArtifactKind, string> = {
  calendar: "flow-artifact-calendar-preview",
  todo: "flow-artifact-checklist-preview",
  sheet: "flow-artifact-sheet-preview",
  memo: "flow-artifact-memo-preview",
};

export type AuthoringTextResultVariant =
  | "raw"
  | "structured_plain_text"
  | "structured_markdown";

export type AuthoringTextResultValues = Partial<
  Record<AuthoringTextResultVariant, string>
>;

function unavailableReason(
  artifact: AuthoringArtifactKind,
  projection: AuthoringArtifactProjection,
): string {
  const view = projection.artifacts[artifact];
  const firstLoss = view.losses.find((loss) => loss.message.trim());
  if (firstLoss) return firstLoss.message;
  if (artifact === "calendar") {
    return "계산할 날짜가 있는 항목이 없습니다.";
  }
  if (artifact === "sheet") {
    return "반복되는 표 열이 2개 이상일 때 사용할 수 있습니다.";
  }
  if (artifact === "todo") {
    return "체크할 실행 항목이 없습니다.";
  }
  return "텍스트로 정리할 항목이 없습니다.";
}

type PreviewField = {
  key: string;
  label: string;
  value: string;
};

function previewFields(
  row: AuthoringArtifactRow,
  artifact: Exclude<AuthoringArtifactKind, "sheet">,
): PreviewField[] {
  const candidates: Array<PreviewField | null> = [
    row.description
      ? { key: "description", label: "설명", value: row.description }
      : null,
    row.completion
      ? { key: "completion", label: "완료 기준", value: row.completion }
      : null,
    row.date ? { key: "date", label: "날짜", value: row.date } : null,
    row.sourceExpression
      ? { key: "source-expression", label: "원문 날짜", value: row.sourceExpression }
      : null,
    row.time ? { key: "time", label: "시간", value: row.time } : null,
    row.timezone
      ? { key: "timezone", label: "시간대", value: row.timezone }
      : null,
    row.place ? { key: "place", label: "장소", value: row.place } : null,
    row.durationMinutes != null
      ? {
          key: "duration",
          label: "소요 시간",
          value: `${row.durationMinutes}분`,
        }
      : null,
    row.repeat ? { key: "repeat", label: "반복", value: row.repeat } : null,
    row.condition
      ? { key: "condition", label: "조건", value: row.condition }
      : null,
    row.caution ? { key: "caution", label: "주의", value: row.caution } : null,
  ];

  if (artifact === "calendar") {
    const fieldOrder = [
      "date",
      "source-expression",
      "time",
      "timezone",
      "duration",
      "place",
      "description",
      "completion",
      "repeat",
      "condition",
      "caution",
    ];
    return candidates
      .filter((field): field is PreviewField => field !== null)
      .sort(
        (left, right) =>
          fieldOrder.indexOf(left.key) - fieldOrder.indexOf(right.key),
      );
  }

  return candidates.filter((field): field is PreviewField => field !== null);
}

function PreviewLinks({ row }: { row: AuthoringArtifactRow }) {
  const groups = [
    { key: "resources", label: "자료", links: row.resources },
    { key: "sources", label: "출처", links: row.sources ?? [] },
  ].filter((group) => group.links.length > 0);
  if (groups.length === 0) return null;
  return (
    <section
      data-testid="ta-authoring-preview-links"
      className="mt-3 grid gap-3 border-t border-[var(--flowme-border)] pt-3 sm:grid-cols-2"
      aria-label="자료와 출처 링크"
    >
      {groups.map((group) => (
        <div key={group.key} data-link-kind={group.key}>
          <p className="text-[10px] font-bold text-[var(--flowme-text-tertiary)]">
            {group.label}
          </p>
          <ul className="mt-1.5 space-y-1.5">
            {group.links.map((link, index) => (
              <li key={`${link.url}-${index}`} className="min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block min-h-8 rounded px-1 py-1 text-xs font-semibold text-[var(--flowme-action)] underline decoration-[var(--flowme-border-strong)] underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                >
                  <span className="block break-words">{link.label}</span>
                  <span className="block break-all text-[10px] font-normal text-[var(--flowme-text-tertiary)]">
                    {link.url}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function PreviewEditButton({
  row,
  onEditItem,
}: {
  row: AuthoringArtifactRow;
  onEditItem: (itemId: string) => void;
}) {
  return (
    <button
      type="button"
      data-testid="public-flow-artifact-preview-row-edit"
      data-item-id={row.itemId}
      className={`${FLOW_UI_SECONDARY_ACTION_CLASS} shrink-0`}
      aria-label={`${row.title} 내용과 날짜 수정`}
      onClick={() => onEditItem(row.itemId)}
    >
      수정
    </button>
  );
}

function RichPreviewRow({
  artifact,
  row,
  index,
  onEditItem,
}: {
  artifact: Exclude<AuthoringArtifactKind, "sheet">;
  row: AuthoringArtifactRow;
  index: number;
  onEditItem: (itemId: string) => void;
}) {
  const fields = previewFields(row, artifact);
  return (
    <article
      data-testid="ta-authoring-artifact-row"
      data-item-id={row.itemId}
      data-artifact-kind={artifact}
      data-source-checked={
        artifact === "todo" && row.sourceChecked !== undefined
          ? String(row.sourceChecked)
          : undefined
      }
      className="border-t border-[var(--flowme-border)] px-3 py-3 first:border-t-0"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          aria-hidden="true"
          className={`mt-0.5 flex h-6 min-w-6 shrink-0 items-center justify-center rounded text-[10px] font-bold ${
            artifact === "todo"
              ? "border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] text-[var(--flowme-text-tertiary)]"
              : "bg-[var(--flowme-action-soft)] text-[var(--flowme-action-strong)]"
          }`}
        >
          {artifact === "todo"
            ? row.sourceChecked === true
              ? "✓"
              : "□"
            : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          {row.stepTitle ? (
            <p className="mb-0.5 text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">
              {row.stepTitle}
            </p>
          ) : null}
          <h3
            className={`break-words text-sm font-semibold leading-5 ${
              artifact === "todo" && row.sourceChecked === true
                ? "text-[var(--flowme-text-secondary)] line-through"
                : "text-[var(--flowme-text)]"
            }`}
          >
            {artifact === "todo" && row.sourceChecked !== undefined ? (
              <span className="sr-only">
                {row.sourceChecked ? "원문에서 체크됨: " : "원문에서 미체크: "}
              </span>
            ) : null}
            {row.title}
          </h3>
        </div>
        <PreviewEditButton row={row} onEditItem={onEditItem} />
      </div>

      {fields.length > 0 ? (
        <dl className="mt-3 grid gap-x-3 gap-y-1.5 rounded-[var(--flowme-radius-control)] bg-[var(--flowme-surface-subtle)] px-3 py-2.5 text-xs sm:grid-cols-[5rem_minmax(0,1fr)]">
          {fields.map((field) => (
            <div
              key={field.key}
              data-authoring-preview-field={field.key}
              className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-2 sm:contents"
            >
              <dt className="font-semibold text-[var(--flowme-text-tertiary)]">
                {field.label}
              </dt>
              <dd className="min-w-0 whitespace-pre-wrap break-words text-[var(--flowme-text-secondary)]">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <PreviewLinks row={row} />
    </article>
  );
}

function SheetCellValue({ value }: { value: string }) {
  const parts = value.split(/(https?:\/\/[^\s]+)/gu);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, index) =>
        /^https?:\/\//u.test(part) ? (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="break-all text-[var(--flowme-action)] underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </span>
  );
}

function SheetPreview({
  view,
  rows,
  offset,
  onEditItem,
}: {
  view: AuthoringArtifactView;
  rows: AuthoringArtifactRow[];
  offset: number;
  onEditItem: (itemId: string) => void;
}) {
  const columns = view.sheetColumns ?? [];
  return (
    <div
      data-testid={PREVIEW_TEST_ID.sheet}
      className="overflow-x-auto border-t border-[var(--flowme-border)]"
      tabIndex={0}
      aria-label={`표 미리보기, ${columns.length}개 열`}
    >
      <table className="w-full min-w-[640px] table-auto border-collapse text-left text-xs">
        <thead className="bg-[var(--flowme-surface-subtle)] text-[var(--flowme-text-tertiary)]">
          <tr>
            <th scope="col" className="w-10 px-2 py-2 font-semibold">
              #
            </th>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                data-authoring-sheet-column={column.key}
                className="min-w-32 border-l border-[var(--flowme-border)] px-3 py-2 font-semibold"
              >
                {column.label}
              </th>
            ))}
            <th scope="col" className="w-16 px-2 py-2">
              <span className="sr-only">수정</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.itemId}
              data-testid="ta-authoring-artifact-row"
              data-item-id={row.itemId}
              data-artifact-kind="sheet"
              className="border-t border-[var(--flowme-border)] align-top"
            >
              <th scope="row" className="px-2 py-3 font-semibold text-[var(--flowme-text-tertiary)]">
                {offset + index + 1}
              </th>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-authoring-sheet-cell={column.key}
                  className="max-w-72 border-l border-[var(--flowme-border)] px-3 py-3 text-[var(--flowme-text-secondary)]"
                >
                  <SheetCellValue value={row.sheetCells?.[column.key] ?? "—"} />
                </td>
              ))}
              <td className="px-2 py-2">
                <PreviewEditButton row={row} onEditItem={onEditItem} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuthoringProjectionPreview({
  artifact,
  view,
  preflight,
  onEditItem,
}: {
  artifact: AuthoringArtifactKind;
  view: AuthoringArtifactView;
  preflight: AuthoringArtifactPreflight;
  onEditItem: (itemId: string) => void;
}) {
  const visibleRows = view.rows.slice(0, PREVIEW_ROW_LIMIT);
  const remainingRows = view.rows.slice(PREVIEW_ROW_LIMIT);
  const renderRows = (rows: AuthoringArtifactRow[], offset = 0) =>
    artifact === "sheet" ? (
      <SheetPreview
        view={view}
        rows={rows}
        offset={offset}
        onEditItem={onEditItem}
      />
    ) : (
      <div data-testid={PREVIEW_TEST_ID[artifact]}>
        {rows.map((row, index) => (
          <RichPreviewRow
            key={row.itemId}
            artifact={artifact}
            row={row}
            index={offset + index}
            onEditItem={onEditItem}
          />
        ))}
      </div>
    );

  return (
    <section
      data-testid="ta-authoring-artifact-preview"
      data-selected-shape={artifact}
      className="min-w-0 border-y border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
      aria-labelledby="ta-authoring-artifact-preview-title"
    >
      <header className="px-3 py-3">
        <p className="text-[10px] font-semibold text-[var(--flowme-text-tertiary)]">
          실제로 가져갈 내용
        </p>
        <h2
          id="ta-authoring-artifact-preview-title"
          className="mt-0.5 text-sm font-semibold text-[var(--flowme-text)]"
        >
          {ARTIFACT_LABEL[artifact]} · {view.count}개
        </h2>
        <p className="mt-1 text-[11px] text-[var(--flowme-text-secondary)]">
          {preflight.count}개 포함 · {preflight.omittedCount}개 제외
        </p>
      </header>
      {renderRows(visibleRows)}
      {remainingRows.length > 0 ? (
        <details className="border-t border-[var(--flowme-border)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]">
            <span>나머지 {remainingRows.length}개 보기</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          {renderRows(remainingRows, PREVIEW_ROW_LIMIT)}
        </details>
      ) : null}
    </section>
  );
}

type RepeatDefinition = {
  itemId: string;
  title: string;
  repeat: string;
};

export function ResultPane({
  projection,
  preflight,
  unavailableMessage,
  repeatDefinitions,
  reviewGates,
  sourceState,
  userCorrectionCount,
  itemCount,
  itemReviewCount,
  selectedArtifact,
  anchor,
  onArtifactChange,
  onAnchorChange,
  onEditItem,
  onOpenExport,
  onOpenReview,
  onOpenSourceUpdate,
  onDeferSourceUpdate,
  onOpenRoundTrip,
  onOpenItemReview,
  onReturnToInput,
  onSaveDraft,
  saveLabel = "초안 저장",
  saveDisabled = false,
  rawText,
  sourceSnapshotText,
  textResultValues,
  onCopyRawText,
  onCopySourceSnapshot,
  onCopyStructuredText,
  onCopyStructuredMarkdown,
  canAlignSourceOrder = false,
  onAlignSourceOrder,
  hasUndo = false,
  onUndo,
}: {
  projection: AuthoringArtifactProjection | null;
  preflight: AuthoringArtifactPreflight | null;
  unavailableMessage?: string;
  repeatDefinitions: RepeatDefinition[];
  reviewGates: AuthoringReviewGate[];
  sourceState?: AuthoringSourceState;
  userCorrectionCount: number;
  itemCount: number;
  itemReviewCount: number;
  selectedArtifact: AuthoringArtifactKind;
  anchor: string;
  onArtifactChange: (artifact: AuthoringArtifactKind) => void;
  onAnchorChange: (anchor: string) => void;
  onEditItem: (itemId: string) => void;
  onOpenExport: () => void;
  onOpenReview: () => void;
  onOpenSourceUpdate: () => void;
  onDeferSourceUpdate: () => void;
  onOpenRoundTrip: () => void;
  onOpenItemReview: () => void;
  onReturnToInput: () => void;
  onSaveDraft?: () => void;
  saveLabel?: string;
  saveDisabled?: boolean;
  rawText?: string;
  sourceSnapshotText?: string;
  textResultValues?: AuthoringTextResultValues;
  onCopyRawText?: () => void | Promise<void>;
  onCopySourceSnapshot?: () => void | Promise<void>;
  onCopyStructuredText?: () => void | Promise<void>;
  onCopyStructuredMarkdown?: () => void | Promise<void>;
  canAlignSourceOrder?: boolean;
  onAlignSourceOrder?: () => void;
  hasUndo?: boolean;
  onUndo?: () => void;
}) {
  const [textCopyStatus, setTextCopyStatus] = useState("");
  if (!projection || !preflight) {
    return (
      <section
        className="ta-pane ta-result-pane flex h-full min-h-[420px] flex-col border-l border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
        aria-labelledby="text-authoring-result-empty-heading"
      >
        <header className="ta-pane-header border-b border-[var(--flowme-border)] px-4 py-4">
          <h2
            id="text-authoring-result-empty-heading"
            className="text-lg font-semibold"
          >
            결과
          </h2>
        </header>
        <div className="m-auto px-6 py-12 text-center">
          <p className="text-sm font-semibold">
            {unavailableMessage
              ? "결과를 다시 계산해야 합니다."
              : "입력을 작성하면 결과가 여기에 표시됩니다."}
          </p>
          <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
            {unavailableMessage ??
              "원문을 바꾸지 않고 캘린더·체크/할 일·표/엑셀·텍스트 결과를 만듭니다."}
          </p>
          {unavailableMessage ? (
            <button
              type="button"
              className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-4`}
              onClick={onReturnToInput}
            >
              입력 보기
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  const selectedView = projection.artifacts[selectedArtifact];
  const unavailableSlots = RESULT_SLOT_ORDER.filter(
    (artifact) => !projection.artifacts[artifact].eligible,
  );
  const needsAnchor = projection.artifacts.calendar.losses.some(
    (loss) => loss.reason === "relative_anchor_required",
  );
  const outstandingReviewCount = reviewGates.filter(
    (gate) => gate.status === "required",
  ).length;
  const personalOnlyReviewCount = reviewGates.filter(
    (gate) => gate.status === "personal_only",
  ).length;
  const reviewBlockingCount = reviewGates.filter(
    (gate) => gate.status !== "evidence_recorded",
  ).length;
  const pendingSourceState =
    sourceState?.status === "source_updated" ||
    sourceState?.status === "conflict_source_vs_user"
      ? sourceState
      : null;
  const copyTextResult = async ({
    copy,
    value,
    successMessage,
  }: {
    copy?: () => void | Promise<void>;
    value?: string;
    successMessage: string;
  }) => {
    setTextCopyStatus("");
    try {
      if (copy) {
        await copy();
      } else if (value) {
        await navigator.clipboard.writeText(value);
      } else {
        throw new Error("복사할 내용이 없습니다.");
      }
      setTextCopyStatus(successMessage);
    } catch {
      setTextCopyStatus("복사하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
  };

  return (
    <section
      data-authoring-result-kind={selectedArtifact}
      className="ta-pane ta-result-pane flex h-full min-h-0 flex-col border-l border-[var(--flowme-border)] bg-[var(--flowme-surface)]"
      aria-labelledby="text-authoring-result-heading"
    >
      <header className="ta-pane-header flex items-center justify-between gap-3 border-b border-[var(--flowme-border)] px-4 py-3">
        <div>
          <h2
            id="text-authoring-result-heading"
            className="text-lg font-semibold tracking-[-0.02em]"
          >
            결과
          </h2>
          <p className="text-[11px] text-[var(--flowme-text-tertiary)]">
            입력과 동시에 반영됩니다
          </p>
        </div>
        {onSaveDraft ? (
          <button
            type="button"
            data-testid="ta-authoring-save-desktop"
            className={`${FLOW_UI_PRIMARY_ACTION_CLASS} hidden min-[900px]:inline-flex`}
            disabled={saveDisabled}
            onClick={onSaveDraft}
          >
            {saveLabel}
          </button>
        ) : null}
      </header>

      <div
        data-authoring-pane-scroll
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <section
          data-testid="ta-authoring-item-review-summary"
          data-review-needed={itemReviewCount > 0}
          className="border-b border-[var(--flowme-border)] px-4 py-3"
        >
          <button
            type="button"
            data-testid="ta-authoring-item-review-open"
            data-review-needed={itemReviewCount > 0}
            className={`min-h-11 w-full rounded-[var(--flowme-radius-control)] border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${
              itemReviewCount > 0
                ? "border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] text-[var(--flowme-warning-strong)]"
                : "border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] text-[var(--flowme-text-secondary)] hover:border-[var(--flowme-border-strong)] hover:text-[var(--flowme-text)]"
            }`}
            aria-label={
              itemReviewCount > 0
                ? `확인이 필요한 문장 ${itemReviewCount}개, 항목 검토`
                : `${itemCount}개 항목으로 반영됨, 항목 검토`
            }
            onClick={onOpenItemReview}
          >
            <span className="flex items-center justify-between gap-3 text-xs font-semibold">
              <span>
                {itemReviewCount > 0
                  ? `확인이 필요한 문장 ${itemReviewCount}개`
                  : `${itemCount}개 항목으로 반영됨`}
              </span>
              <span className="shrink-0">항목 검토 ›</span>
            </span>
            {itemReviewCount > 0 ? (
              <span className="mt-1 block text-[11px] leading-5 text-[var(--flowme-text-secondary)]">
                결과에 넣을지 정하지 못한 문장은 원문에 남아 있습니다.
              </span>
            ) : null}
          </button>
        </section>

        {pendingSourceState ? (
          <section
            data-testid="ta-authoring-source-update-banner"
            data-source-state={pendingSourceState.status}
            className="m-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] p-3"
          >
            <p className="text-sm font-semibold text-[var(--flowme-warning-strong)]">
              원문이 바뀌었습니다.
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
              내 수정 {userCorrectionCount}개는 유지되며 자동으로 합치지
              않습니다.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="ta-authoring-source-update-open"
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                onClick={onOpenSourceUpdate}
              >
                달라진 {pendingSourceState.changes.length}곳 확인
              </button>
              <button
                type="button"
                data-testid="ta-authoring-source-update-later"
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                onClick={onDeferSourceUpdate}
              >
                나중에
              </button>
            </div>
          </section>
        ) : null}

        <section className="border-b border-[var(--flowme-border)] px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold text-[var(--flowme-text-secondary)]">
              결과 형태
            </h3>
            <InlineHelp
              label="결과 형태 설명"
              testId="ta-authoring-result-shape-help"
              panelTestId="ta-authoring-result-shape-help-panel"
            >
              <div className="space-y-2">
                <p>
                  입력이 조건을 만족하면 해당 결과가 활성화됩니다. 네 버튼의
                  위치는 바뀌지 않습니다.
                </p>
                {selectedArtifact === "memo" ? (
                  <p data-testid="ta-authoring-memo-boundary">
                    텍스트는 원문 그대로가 기본입니다. 다른 형식은 파일로
                    가져갈 때만 선택합니다.
                  </p>
                ) : null}
                {selectedArtifact === "sheet" ? (
                  <p data-testid="ta-authoring-sheet-boundary">
                    표/엑셀은 여러 항목이 같은 정보 두 가지 이상을 공유하거나,
                    원문이 실제 표일 때만 활성화됩니다. 미리보기의 열 그대로
                    CSV·Excel 파일을 만듭니다.
                  </p>
                ) : null}
                {unavailableSlots.length > 0 ? (
                  <ul className="space-y-1" data-testid="ta-authoring-result-disabled-reasons">
                    {unavailableSlots.map((artifact) => (
                      <li key={artifact}>
                        <strong>{ARTIFACT_LABEL[artifact]}</strong>: {unavailableReason(artifact, projection)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </InlineHelp>
          </div>
          <div
            className="ta-result-shape-grid mt-2 grid grid-cols-4 gap-1.5"
            role="group"
            aria-label="결과 형태"
          >
            {RESULT_SLOT_ORDER.map((artifact) => {
              const view = projection.artifacts[artifact];
              const selected = artifact === selectedArtifact;
              const recommended = artifact === projection.primaryArtifact;
              const reason = view.eligible
                ? undefined
                : unavailableReason(artifact, projection);
              return (
                <button
                  key={artifact}
                  type="button"
                  data-testid={`ta-authoring-result-slot-${artifact}`}
                  aria-pressed={selected}
                  aria-label={`${ARTIFACT_LABEL[artifact]} ${view.count}${reason ? ` · 사용 불가: ${reason}` : ""}`}
                  data-selected={selected}
                  data-eligible={view.eligible}
                  data-recommended={recommended}
                  disabled={!view.eligible}
                  title={reason}
                  className={`min-h-14 min-w-0 rounded-[var(--flowme-radius-control)] border px-1.5 py-2 text-center text-[11px] font-semibold leading-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] sm:px-2 sm:text-sm ${
                    selected
                      ? "border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] text-[var(--flowme-positive-strong)]"
                      : "border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] hover:bg-[var(--flowme-surface-subtle)]"
                  } disabled:cursor-not-allowed disabled:border-[var(--flowme-border)] disabled:bg-[var(--flowme-surface-subtle)] disabled:text-[var(--flowme-text-tertiary)]`}
                  onClick={() => onArtifactChange(artifact)}
                >
                  <span className="block break-keep">
                    {selected ? <span aria-hidden="true">✓ </span> : null}
                    {ARTIFACT_LABEL[artifact]}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-normal sm:text-xs">
                    {view.eligible
                      ? recommended
                        ? `추천 · ${view.count}개`
                        : `${view.count}개`
                      : "사용 불가"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {unavailableMessage ? (
          <p
            data-testid="ta-authoring-result-stale-status"
            className="border-b border-[var(--flowme-border)] bg-[var(--flowme-action-soft)] px-4 py-2 text-xs text-[var(--flowme-action-strong)]"
            role="status"
          >
            {unavailableMessage}
          </p>
        ) : null}

        {needsAnchor || anchor ? (
          <section className="m-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] p-3">
            <label
              htmlFor="text-authoring-preview-anchor"
              className="text-xs font-semibold text-[var(--flowme-warning-strong)]"
            >
              D-Day 계산 기준일
            </label>
            <p className="mt-1 text-[11px] leading-5 text-[var(--flowme-text-secondary)]">
              원문에 상대 날짜가 있어 필요합니다. 선택한 날짜는 왼쪽 입력에
              <code className="mx-1">- 기준일:</code>
              줄로 함께 반영됩니다.
            </p>
            <input
              id="text-authoring-preview-anchor"
              type="date"
              data-testid="ta-authoring-preview-anchor"
              className={`${FLOW_UI_INPUT_CLASS} mt-2 w-full`}
              value={anchor}
              onChange={(event) => onAnchorChange(event.target.value)}
            />
          </section>
        ) : null}

        {selectedArtifact === "calendar" && (canAlignSourceOrder || hasUndo) ? (
          <section
            data-testid="ta-authoring-calendar-order-action"
            className="mx-4 mt-4 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3"
          >
            <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
              {canAlignSourceOrder
                ? "캘린더는 날짜순으로 보여 주지만 입력 순서는 자동으로 바꾸지 않습니다."
                : "입력 순서를 날짜순으로 맞췄습니다. 필요하면 한 번에 되돌릴 수 있습니다."}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {canAlignSourceOrder ? (
                <button
                  type="button"
                  className={FLOW_UI_SECONDARY_ACTION_CLASS}
                  disabled={!onAlignSourceOrder}
                  onClick={onAlignSourceOrder}
                >
                  입력도 이 순서로 맞추기
                </button>
              ) : null}
              {hasUndo ? (
                <button
                  type="button"
                  className={FLOW_UI_SECONDARY_ACTION_CLASS}
                  disabled={!onUndo}
                  onClick={onUndo}
                >
                  순서 변경 되돌리기
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="px-4 py-4">
          {selectedArtifact === "memo" ? (
            <section
              data-testid="ta-authoring-text-result-boundary"
              className="mb-4 space-y-2"
              aria-label="텍스트 결과 구분"
            >
              <article className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] p-3">
                <h3 className="text-sm font-semibold">원문 그대로</h3>
                <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
                  입력한 글의 줄바꿈과 표식을 바꾸지 않습니다.
                </p>
                <button
                  type="button"
                  data-testid="ta-authoring-copy-raw-text"
                  className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-3 w-full`}
                  disabled={!rawText && !textResultValues?.raw && !onCopyRawText}
                  onClick={() =>
                    copyTextResult({
                      copy: onCopyRawText,
                      value: rawText ?? textResultValues?.raw,
                      successMessage: "원문을 그대로 복사했습니다.",
                    })
                  }
                >
                  원문 그대로 복사
                </button>
              </article>
              <details className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)]">
                <summary className="cursor-pointer px-3 py-3 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                  다른 텍스트 형식
                </summary>
                <div className="grid gap-2 border-t border-[var(--flowme-border)] p-3">
                  <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
                    항목의 설명·완료 기준·자료 링크를 묶은 복사본입니다. 원문은
                    바뀌지 않습니다.
                  </p>
                  {sourceSnapshotText && sourceSnapshotText !== rawText ? (
                    <button
                      type="button"
                      data-testid="ta-authoring-copy-source-snapshot"
                      className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
                      onClick={() =>
                        copyTextResult({
                          copy: onCopySourceSnapshot,
                          value: sourceSnapshotText,
                          successMessage: "처음 붙여넣은 원문을 복사했습니다.",
                        })
                      }
                    >
                      처음 붙여넣은 원문 복사
                    </button>
                  ) : null}
                  <button
                    type="button"
                    data-testid="ta-authoring-copy-structured-text"
                    className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
                    disabled={
                      !textResultValues?.structured_plain_text &&
                      !onCopyStructuredText
                    }
                    onClick={() =>
                      copyTextResult({
                        copy: onCopyStructuredText,
                        value: textResultValues?.structured_plain_text,
                        successMessage: "정리된 TXT를 복사했습니다.",
                      })
                    }
                  >
                    항목별 텍스트 복사
                  </button>
                  <button
                    type="button"
                    data-testid="ta-authoring-copy-structured-markdown"
                    className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
                    disabled={
                      !textResultValues?.structured_markdown &&
                      !onCopyStructuredMarkdown
                    }
                    onClick={() =>
                      copyTextResult({
                        copy: onCopyStructuredMarkdown,
                        value: textResultValues?.structured_markdown,
                        successMessage: "정리된 Markdown을 복사했습니다.",
                      })
                    }
                  >
                    문법 포함 텍스트 복사
                  </button>
                </div>
              </details>
              {textCopyStatus ? (
                <p
                  role="status"
                  className={`rounded-[var(--flowme-radius-control)] px-3 py-2 text-xs font-semibold ${
                    textCopyStatus.startsWith("복사하지")
                      ? "bg-[var(--flowme-warning-soft)] text-[var(--flowme-warning-strong)]"
                      : "bg-[var(--flowme-positive-soft)] text-[var(--flowme-positive-strong)]"
                  }`}
                >
                  {textCopyStatus}
                </p>
              ) : null}
            </section>
          ) : null}
          <AuthoringProjectionPreview
            artifact={selectedArtifact}
            view={selectedView}
            preflight={preflight}
            onEditItem={onEditItem}
          />
        </div>

        {reviewGates.length > 0 ? (
          <section
            data-testid="ta-authoring-review-summary"
            data-outstanding-count={outstandingReviewCount}
            className="px-4 pb-4"
          >
            <button
              type="button"
              data-testid="ta-authoring-review-open"
              className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full justify-between gap-3`}
              onClick={onOpenReview}
            >
              <span>권리·안전</span>
              <span className="text-xs text-[var(--flowme-warning-strong)]">
                {outstandingReviewCount > 0
                  ? `확인 전 ${outstandingReviewCount}개`
                  : personalOnlyReviewCount > 0
                    ? `개인용 제한 ${personalOnlyReviewCount}개`
                    : "확인 기록 있음"}
              </span>
            </button>
          </section>
        ) : null}

        {repeatDefinitions.length > 0 ? (
          <details
            data-testid="ta-authoring-repeat-boundary"
            className="m-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)]"
          >
            <summary className="cursor-pointer px-3 py-3 text-xs font-semibold text-[var(--flowme-warning-strong)]">
              반복 설정 {repeatDefinitions.length}개 · 반복 일정 파일은 아직
              만들지 않음
            </summary>
            <div className="border-t border-[var(--flowme-warning)] px-3 py-3">
              <p className="text-xs font-semibold">반복 정의 보존</p>
              <ul className="mt-2 space-y-1 text-xs leading-5">
                {repeatDefinitions.slice(0, 4).map((definition) => (
                  <li key={definition.itemId}>
                    {definition.title} · {definition.repeat}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-5 text-[var(--flowme-text-secondary)]">
                현재는 각 항목을 한 번만 미리보기·내보내며, 반복 일정(ICS
                RRULE)은 만들지 않습니다.
              </p>
            </div>
          </details>
        ) : null}

        <details
          data-testid="ta-authoring-preflight"
          data-count={preflight.count}
          className="m-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)]"
          aria-labelledby="text-authoring-preflight-heading"
        >
          <summary
            id="text-authoring-preflight-heading"
            className="cursor-pointer px-3 py-3 text-sm font-semibold"
          >
            가져갈 내용 {preflight.count}개 · 제외 {preflight.omittedCount}개
            {preflight.lossCount > 0
              ? ` · 빠지는 정보 ${preflight.lossCount}개`
              : ""}
          </summary>
          <div className="border-t border-[var(--flowme-border)] px-3 py-3">
            <dl className="text-xs">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
                <dt className="text-[var(--flowme-text-secondary)]">
                  날짜 범위
                </dt>
                <dd className="font-semibold">
                  {preflight.dateRange
                    ? `${preflight.dateRange.start} ~ ${preflight.dateRange.end}`
                    : "확정 날짜 없음"}
                </dd>
              </div>
            </dl>
            {preflight.losses.length > 0 ? (
              <section className="mt-3 bg-[var(--flowme-warning-soft)] px-3 py-3">
                <h3 className="text-xs font-semibold text-[var(--flowme-warning-strong)]">
                  빠지는 정보
                </h3>
                <ul className="mt-2 space-y-1 text-xs leading-5">
                  {preflight.losses.slice(0, 6).map((loss) => (
                    <li key={loss.lossId}>— {loss.message}</li>
                  ))}
                </ul>
                {preflight.losses.length > 6 ? (
                  <p className="mt-2 text-[11px] text-[var(--flowme-text-secondary)]">
                    외 {preflight.losses.length - 6}개
                  </p>
                ) : null}
              </section>
            ) : null}
          </div>
        </details>

        <div className="border-t border-[var(--flowme-border)] px-4 py-4">
          <button
            type="button"
            data-testid={
              reviewBlockingCount > 0 || pendingSourceState
                ? "ta-authoring-export-review-required"
                : "ta-authoring-export-open"
            }
            className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
            onClick={onOpenExport}
          >
            {pendingSourceState
              ? `파일로 가져가기 전 변경 ${pendingSourceState.changes.length}곳 확인`
              : outstandingReviewCount > 0
                ? `파일로 가져가기 전 ${outstandingReviewCount}개 확인`
                : personalOnlyReviewCount > 0
                  ? "개인용 제한 확인"
                  : "파일로 가져가기"}
          </button>
          <details
            data-testid="ta-authoring-result-more"
            className="mt-2 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)]"
          >
            <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-[var(--flowme-text-secondary)]">
              추가 확인
            </summary>
            <div className="border-t border-[var(--flowme-border)] p-2">
              <button
                type="button"
                className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
                onClick={onOpenRoundTrip}
              >
                문법 변환 비교
              </button>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
