"use client";

import { useEffect, useMemo, useState } from "react";

import {
  FLOW_UI_INPUT_CLASS,
  FLOW_UI_PRIMARY_ACTION_CLASS,
  FLOW_UI_SECONDARY_ACTION_CLASS,
} from "@/components/flow/flow-ui";
import type {
  AuthoringArtifactKind,
  AuthoringArtifactLossReason,
  AuthoringArtifactPreflight,
  AuthoringArtifactProjection,
  AuthoringArtifactRow,
  AuthoringArtifactView,
} from "@/lib/flow/text-authoring/artifact-projection";
import type {
  AuthoringReviewGate,
  AuthoringLongDocumentTable,
  AuthoringSourceState,
} from "@/lib/flow/text-authoring/types";

import {
  addAuthoringCalendarMonths,
  authoringCalendarMonthFromDate,
  authoringCalendarMonthKey,
  buildAuthoringCalendarMonthCells,
  validAuthoringCalendarRows,
  type AuthoringCalendarMonth,
} from "./calendar-preview-model";
import { InlineHelp } from "./InlineHelp";
import type {
  AuthoringIssueView,
  AuthoringSourceLocatorView,
  AuthoringTableLossView,
} from "./authoring-ui-types";

const ARTIFACT_LABEL: Record<AuthoringArtifactKind, string> = {
  calendar: "캘린더",
  todo: "할 일",
  sheet: "표·Excel",
  memo: "TXT",
};

const PRODUCT_ARTIFACT_LABEL: Record<AuthoringArtifactKind, string> = {
  ...ARTIFACT_LABEL,
  sheet: "표",
};

function artifactLabel(
  artifact: AuthoringArtifactKind,
  productMode: boolean,
): string {
  return (productMode ? PRODUCT_ARTIFACT_LABEL : ARTIFACT_LABEL)[artifact];
}

const ARTIFACT_PURPOSE: Record<AuthoringArtifactKind, string> = {
  calendar: "날짜와 시간을 월간 일정으로 확인합니다.",
  todo: "할 일과 그 아래 한 단계 확인 항목을 함께 봅니다.",
  sheet: "공통 정보와 반복 회차의 손실을 표로 확인합니다.",
  memo: "원문을 읽고 복사하기 좋은 계층으로 확인합니다.",
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

const CALENDAR_WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const BLOCKING_LOSS_REASONS = new Set<AuthoringArtifactLossReason>([
  "relative_anchor_required",
  "invalid_schedule",
  "invalid_url",
  "invalid_recurrence",
  "compatibility_loss",
  "long_document_table_loss_risk",
  "long_document_table_invalid",
  "long_document_too_large",
]);

export type AuthoringResultSlotState =
  "active" | "active-partial" | "disabled" | "blocked";

export function authoringResultSlotState(
  artifact: AuthoringArtifactKind,
  projection: AuthoringArtifactProjection,
): { state: AuthoringResultSlotState; reason?: string } {
  const view = projection.artifacts[artifact];
  const hasBlockingLoss = view.losses.some((loss) =>
    BLOCKING_LOSS_REASONS.has(loss.reason),
  );
  if (view.eligible) {
    return hasBlockingLoss
      ? {
          state: "active-partial",
          reason: unavailableReason(artifact, projection),
        }
      : { state: "active" };
  }
  const state = hasBlockingLoss ? "blocked" : "disabled";
  return { state, reason: unavailableReason(artifact, projection) };
}

export type AuthoringResultRowGroup = {
  itemId: string;
  parent: AuthoringArtifactRow;
  occurrences: AuthoringArtifactRow[];
};

export function groupAuthoringRowsByItem(
  rows: AuthoringArtifactRow[],
): AuthoringResultRowGroup[] {
  const groups = new Map<string, AuthoringArtifactRow[]>();
  for (const row of rows) {
    const current = groups.get(row.itemId) ?? [];
    current.push(row);
    groups.set(row.itemId, current);
  }
  return [...groups.entries()].map(([itemId, itemRows]) => {
    const first = itemRows[0];
    return {
      itemId,
      parent: {
        ...first,
        rowId: `parent-${itemId}`,
        occurrenceId: undefined,
        occurrenceIndex: undefined,
      },
      occurrences: itemRows.filter((row) => Boolean(row.occurrenceId)),
    };
  });
}

function legacyCopyText(value: string): boolean {
  const textarea = window.document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  window.document.body.append(textarea);
  textarea.select();
  textarea.setSelectionRange(0, value.length);
  let copied = false;
  try {
    copied = window.document.execCommand("copy");
  } finally {
    textarea.remove();
  }
  return copied;
}

export type AuthoringTextResultVariant =
  "raw" | "structured_plain_text" | "structured_markdown";

export type AuthoringTextResultValues = Partial<
  Record<AuthoringTextResultVariant, string>
>;

function unavailableReason(
  artifact: AuthoringArtifactKind,
  projection: AuthoringArtifactProjection,
): string {
  const view = projection.artifacts[artifact];
  const firstLoss =
    view.losses.find(
      (loss) => BLOCKING_LOSS_REASONS.has(loss.reason) && loss.message.trim(),
    ) ?? view.losses.find((loss) => loss.message.trim());
  if (firstLoss) return firstLoss.message;
  if (artifact === "calendar") {
    return "날짜가 있는 할 일이 없습니다.";
  }
  if (artifact === "sheet") {
    return "표로 비교할 공통 정보가 부족합니다.";
  }
  if (artifact === "todo") {
    return "할 일 표식이 없습니다. 일반 문장은 TXT에 보존됩니다.";
  }
  return "원문을 입력하면 TXT 결과가 표시됩니다.";
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
    row.recurrenceSummary || row.repeat
      ? {
          key: "repeat",
          label: "반복",
          value: row.recurrenceSummary ?? row.repeat ?? "",
        }
      : null,
    row.condition
      ? { key: "condition", label: "실행 조건", value: row.condition }
      : null,
    row.caution ? { key: "caution", label: "주의", value: row.caution } : null,
  ];

  if (artifact === "calendar") {
    const fieldOrder = [
      "date",
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
                  className="flex min-h-11 flex-col justify-center rounded px-1 py-1 text-xs font-semibold text-[var(--flowme-action)] underline decoration-[var(--flowme-border-strong)] underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
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

function PreviewSourceButton({
  row,
  onEditSourceItem,
  label = "원문에서 수정",
}: {
  row: AuthoringArtifactRow;
  onEditSourceItem: (itemId: string) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      data-testid="ta-authoring-preview-source-edit"
      data-item-id={row.itemId}
      className={FLOW_UI_SECONDARY_ACTION_CLASS}
      aria-label={`${row.title} ${label}`}
      onClick={() => onEditSourceItem(row.itemId)}
    >
      {label}
    </button>
  );
}

function RichPreviewRow({
  artifact,
  row,
  index,
  onEditItem,
  onEditSourceItem,
}: {
  artifact: Exclude<AuthoringArtifactKind, "sheet">;
  row: AuthoringArtifactRow;
  index: number;
  onEditItem: (itemId: string) => void;
  onEditSourceItem: (itemId: string) => void;
}) {
  const fields = previewFields(row, artifact);
  return (
    <article
      data-testid="ta-authoring-artifact-row"
      data-row-id={row.rowId}
      data-item-id={row.itemId}
      data-occurrence-id={row.occurrenceId}
      data-occurrence-index={row.occurrenceIndex}
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
      {artifact === "todo" && row.subchecks.length > 0 ? (
        <section
          data-testid="ta-authoring-preview-subchecks"
          className="mt-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-3 py-2.5"
          aria-label={`${row.title} 하위 체크리스트`}
        >
          <ul className="space-y-1.5 text-xs leading-5">
            {row.subchecks.map((subcheck) => (
              <li
                key={subcheck.subcheckId}
                className={`flex min-w-0 items-start gap-2 ${
                  subcheck.sourceChecked
                    ? "text-[var(--flowme-text-secondary)] line-through"
                    : "text-[var(--flowme-text)]"
                }`}
              >
                <span aria-hidden="true" className="shrink-0">
                  {subcheck.sourceChecked ? "☑" : "☐"}
                </span>
                <span className="min-w-0 break-words">{subcheck.title}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {row.validations.length > 0 ? (
        <section
          data-testid="ta-authoring-preview-validations"
          className="mt-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-2.5"
          aria-label={`${row.title} 입력 확인`}
        >
          <ul className="space-y-1 text-xs leading-5 text-[var(--flowme-warning-strong)]">
            {row.validations.map((validation) => (
              <li
                key={`${validation.type}-${validation.input ?? validation.message}`}
              >
                <strong>{validation.label}</strong>: {validation.message}
                {validation.input ? ` · 입력: ${validation.input}` : ""}
                {validation.expected ? ` · 형식: ${validation.expected}` : ""}
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <PreviewSourceButton
              row={row}
              onEditSourceItem={onEditSourceItem}
            />
          </div>
        </section>
      ) : null}
      <PreviewLinks row={row} />
    </article>
  );
}

function fallbackCalendarMonth(): AuthoringCalendarMonth {
  const now = new Date();
  return {
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  };
}

function calendarMonthLabel(month: AuthoringCalendarMonth): string {
  return `${month.year}년 ${month.monthIndex + 1}월`;
}

function calendarDateLabel(value: string): string {
  const parsed = authoringCalendarMonthFromDate(value);
  const day = Number(value.slice(-2));
  if (!parsed || !Number.isInteger(day)) return value;
  return `${parsed.year}년 ${parsed.monthIndex + 1}월 ${day}일`;
}

function firstDateInCalendarMonth(
  rows: AuthoringArtifactRow[],
  month: AuthoringCalendarMonth,
): string | undefined {
  const monthKey = authoringCalendarMonthKey(month);
  return rows.find((row) => row.date?.startsWith(`${monthKey}-`))?.date;
}

function CalendarPreview({
  rows,
  onEditItem,
  onEditSourceItem,
}: {
  rows: AuthoringArtifactRow[];
  onEditItem: (itemId: string) => void;
  onEditSourceItem: (itemId: string) => void;
}) {
  const datedRows = useMemo(() => validAuthoringCalendarRows(rows), [rows]);
  const firstDate = datedRows[0]?.date;
  const firstMonth =
    authoringCalendarMonthFromDate(firstDate) ?? fallbackCalendarMonth();
  const [calendarState, setCalendarState] = useState(() => ({
    visibleMonth: firstMonth,
    selectedDate: firstDate ?? `${authoringCalendarMonthKey(firstMonth)}-01`,
  }));
  const { visibleMonth, selectedDate } = calendarState;

  useEffect(() => {
    const nextFirstDate = datedRows[0]?.date;
    const nextFirstMonth = authoringCalendarMonthFromDate(nextFirstDate);
    if (!nextFirstDate || !nextFirstMonth) return;
    setCalendarState((current) => {
      const nextVisibleMonth = firstDateInCalendarMonth(
        datedRows,
        current.visibleMonth,
      )
        ? current.visibleMonth
        : nextFirstMonth;
      const nextMonthKey = authoringCalendarMonthKey(nextVisibleMonth);
      const selectedDateStillVisible =
        current.selectedDate.startsWith(`${nextMonthKey}-`) &&
        datedRows.some((row) => row.date === current.selectedDate);
      const nextSelectedDate = selectedDateStillVisible
        ? current.selectedDate
        : (firstDateInCalendarMonth(datedRows, nextVisibleMonth) ??
          `${nextMonthKey}-01`);
      if (
        current.visibleMonth.year === nextVisibleMonth.year &&
        current.visibleMonth.monthIndex === nextVisibleMonth.monthIndex &&
        current.selectedDate === nextSelectedDate
      ) {
        return current;
      }
      return {
        visibleMonth: nextVisibleMonth,
        selectedDate: nextSelectedDate,
      };
    });
  }, [datedRows]);

  const cells = useMemo(
    () => buildAuthoringCalendarMonthCells(datedRows, visibleMonth),
    [datedRows, visibleMonth],
  );
  const selectedRows = datedRows.filter((row) => row.date === selectedDate);
  const visibleMonthLabel = calendarMonthLabel(visibleMonth);
  const today = new Date();
  const todayDate = `${String(today.getFullYear()).padStart(4, "0")}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const showMonth = (offset: number) => {
    const next = addAuthoringCalendarMonths(visibleMonth, offset);
    const nextDate =
      firstDateInCalendarMonth(datedRows, next) ??
      `${authoringCalendarMonthKey(next)}-01`;
    setCalendarState({
      visibleMonth: next,
      selectedDate: nextDate,
    });
  };

  const showToday = () => {
    const month = authoringCalendarMonthFromDate(todayDate);
    if (!month) return;
    setCalendarState({ visibleMonth: month, selectedDate: todayDate });
  };

  return (
    <section
      data-testid={PREVIEW_TEST_ID.calendar}
      className="min-w-0 border-t border-[var(--flowme-border)]"
      aria-label="월간 캘린더 미리보기"
    >
      <header className="flex min-w-0 items-center gap-2 border-b border-[var(--flowme-border)] px-2 py-2 sm:px-3">
        <button
          type="button"
          data-testid="ta-authoring-calendar-prev-month"
          className={`${FLOW_UI_SECONDARY_ACTION_CLASS} min-h-11 min-w-11 shrink-0 px-0`}
          aria-label={`${visibleMonthLabel} 이전 달 보기`}
          onClick={() => showMonth(-1)}
        >
          <span aria-hidden="true">‹</span>
        </button>
        <h3
          id="ta-authoring-calendar-month-label"
          data-testid="ta-authoring-calendar-month-label"
          className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-[var(--flowme-text)]"
          aria-live="polite"
        >
          {visibleMonthLabel}
        </h3>
        <button
          type="button"
          data-testid="ta-authoring-calendar-today"
          className={`${FLOW_UI_SECONDARY_ACTION_CLASS} min-h-11 shrink-0 px-2`}
          aria-label={`${calendarDateLabel(todayDate)}로 이동`}
          onClick={showToday}
        >
          오늘
        </button>
        <button
          type="button"
          data-testid="ta-authoring-calendar-next-month"
          className={`${FLOW_UI_SECONDARY_ACTION_CLASS} min-h-11 min-w-11 shrink-0 px-0`}
          aria-label={`${visibleMonthLabel} 다음 달 보기`}
          onClick={() => showMonth(1)}
        >
          <span aria-hidden="true">›</span>
        </button>
      </header>

      <div
        className="grid grid-cols-7 border-b border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)]"
        aria-hidden="true"
      >
        {CALENDAR_WEEKDAYS.map((weekday, index) => (
          <div
            key={weekday}
            className={`min-w-0 py-2 text-center text-[10px] font-semibold ${
              index === 0
                ? "text-[var(--flowme-warning-strong)]"
                : "text-[var(--flowme-text-tertiary)]"
            }`}
          >
            {weekday}
          </div>
        ))}
      </div>

      <div
        data-testid="ta-authoring-calendar-month-grid"
        className="grid min-w-0 grid-cols-7 gap-px bg-[var(--flowme-border)]"
        role="group"
        aria-labelledby="ta-authoring-calendar-month-label"
      >
        {cells.map((cell) =>
          cell.kind === "empty" ? (
            <div
              key={cell.cellId}
              aria-hidden="true"
              className="min-h-11 min-w-0 bg-[var(--flowme-surface-subtle)]"
            />
          ) : (
            <div key={cell.cellId} className="min-w-0">
              <button
                type="button"
                data-testid="ta-authoring-calendar-day"
                data-date={cell.date}
                data-event-count={cell.rows.length}
                aria-pressed={selectedDate === cell.date}
                aria-label={`${visibleMonth.monthIndex + 1}월 ${cell.day}일, 일정 ${cell.rows.length}개${
                  cell.rows.length > 0
                    ? `, ${cell.rows
                        .map((row) => `${row.time || "종일"} ${row.title}`)
                        .join(", ")}`
                    : ""
                }`}
                title={
                  cell.rows.length > 0
                    ? cell.rows.map((row) => row.title).join("\n")
                    : undefined
                }
                className={`flex min-h-[4.25rem] w-full min-w-0 flex-col items-center justify-start px-0.5 py-1 text-center transition focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)] ${
                  selectedDate === cell.date
                    ? "bg-[var(--flowme-positive-soft)] text-[var(--flowme-positive-strong)]"
                    : cell.rows.length > 0
                      ? "bg-[var(--flowme-action-soft)] text-[var(--flowme-action-strong)] hover:bg-[var(--flowme-positive-soft)]"
                      : "bg-[var(--flowme-surface)] text-[var(--flowme-text-secondary)] hover:bg-[var(--flowme-surface-subtle)]"
                }`}
                onClick={() =>
                  setCalendarState((current) => ({
                    ...current,
                    selectedDate: cell.date,
                  }))
                }
              >
                <span className="text-xs font-semibold leading-4">
                  {cell.day}
                </span>
                {cell.rows.length > 0 ? (
                  <>
                    <span className="mt-0.5 text-[9px] font-bold leading-3">
                      일정 {cell.rows.length}
                    </span>
                    <span
                      aria-hidden="true"
                      className="mt-0.5 hidden w-full space-y-0.5 min-[390px]:block"
                    >
                      {cell.rows.slice(0, 2).map((row) => (
                        <span
                          key={row.rowId}
                          className="block w-full truncate rounded-sm bg-[var(--flowme-surface)] px-0.5 text-[9px] font-medium leading-3 text-[var(--flowme-action-strong)]"
                        >
                          {row.time ? `${row.time} ` : ""}
                          {row.title}
                        </span>
                      ))}
                    </span>
                  </>
                ) : null}
              </button>
            </div>
          ),
        )}
      </div>

      <section
        data-testid="ta-authoring-calendar-selected-date"
        data-date={selectedDate}
        className="border-t border-[var(--flowme-border)]"
        aria-labelledby="ta-authoring-calendar-selected-date-heading"
      >
        <header className="px-3 py-3">
          <h3
            id="ta-authoring-calendar-selected-date-heading"
            className="text-sm font-semibold text-[var(--flowme-text)]"
          >
            {calendarDateLabel(selectedDate)} · {selectedRows.length}개
          </h3>
        </header>
        {selectedRows.length > 0 ? (
          <div data-testid="ta-authoring-calendar-selected-list">
            {selectedRows.map((row) => (
              <RichPreviewRow
                key={row.rowId}
                artifact="calendar"
                row={row}
                index={datedRows.findIndex(
                  (candidate) => candidate.rowId === row.rowId,
                )}
                onEditItem={onEditItem}
                onEditSourceItem={onEditSourceItem}
              />
            ))}
          </div>
        ) : (
          <p className="border-t border-[var(--flowme-border)] px-3 py-4 text-xs text-[var(--flowme-text-secondary)]">
            이 날짜에는 일정이 없습니다.
          </p>
        )}
      </section>
    </section>
  );
}

function TodoPreview({
  view,
  rows,
  offset,
  onEditItem,
  onEditSourceItem,
}: {
  view: AuthoringArtifactView;
  rows: AuthoringArtifactRow[];
  offset: number;
  onEditItem: (itemId: string) => void;
  onEditSourceItem: (itemId: string) => void;
}) {
  const groups = groupAuthoringRowsByItem(rows);
  return (
    <ul
      data-testid={PREVIEW_TEST_ID.todo}
      className="divide-y divide-[var(--flowme-border)]"
      aria-label="할 일과 하위 확인 항목"
    >
      {groups.map((group, index) => {
        const recurrence = view.recurrenceSummaries.find(
          (summary) => summary.itemId === group.itemId,
        );
        return (
          <li key={group.itemId} className="list-none">
            <RichPreviewRow
              artifact="todo"
              row={group.parent}
              index={offset + index}
              onEditItem={onEditItem}
              onEditSourceItem={onEditSourceItem}
            />
            {recurrence && group.occurrences.length > 0 ? (
              <details className="mx-3 mb-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)]">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-[var(--flowme-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]">
                  <span>회차 미리보기</span>
                  <span>
                    {recurrence.mode === "open_ended"
                      ? `${recurrence.visibleWeeks ?? 4}주 · ${group.occurrences.length}회`
                      : `${group.occurrences.length}${recurrence.totalCount ? `/${recurrence.totalCount}` : ""}회`}
                  </span>
                </summary>
                <ol className="space-y-1 border-t border-[var(--flowme-border)] px-3 py-3 text-xs text-[var(--flowme-text-secondary)]">
                  {group.occurrences.map((occurrence, occurrencePosition) => (
                    <li
                      key={occurrence.rowId}
                      data-occurrence-id={occurrence.occurrenceId}
                      className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2"
                    >
                      <span className="text-[var(--flowme-text-tertiary)]">
                        {occurrence.occurrenceIndex ?? occurrencePosition + 1}회
                      </span>
                      <span>
                        {occurrence.date ?? "날짜 확인 필요"}
                        {occurrence.time ? ` · ${occurrence.time}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </li>
        );
      })}
    </ul>
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
            className="inline-flex min-h-11 items-center break-all text-[var(--flowme-action)] underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
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

function longTableLocatorView(
  table: AuthoringLongDocumentTable,
): AuthoringSourceLocatorView {
  return {
    locatorId: `table:${table.tableId}:${table.locator.startOffset}:${table.locator.endOffset}`,
    kind: "table",
    label: table.headers.filter(Boolean).slice(0, 3).join(" · ") || "원문 표",
    detail: `${table.rows.length}개 행`,
    status:
      table.state === "table-safe"
        ? "safe"
        : table.state === "table-loss-risk"
          ? "possible-loss"
          : "blocked",
    startOffset: table.locator.startOffset,
    endOffset: table.locator.endOffset,
    startLine: table.locator.startLine,
    endLine: table.locator.endLine,
  };
}

function longTableRowLocatorView(
  table: AuthoringLongDocumentTable,
  bodyRowIndex: number,
): AuthoringSourceLocatorView | null {
  const row = table.sourceRows.filter((sourceRow) => sourceRow.kind === "body")[
    bodyRowIndex
  ];
  if (!row) return null;
  return {
    locatorId: `table-row:${row.rowId}:${row.locator.startOffset}:${row.locator.endOffset}`,
    kind: "table",
    label: `표 ${bodyRowIndex + 1}행`,
    detail: row.values.filter(Boolean).slice(0, 3).join(" · "),
    status: table.state === "table-safe" ? "safe" : "possible-loss",
    startOffset: row.locator.startOffset,
    endOffset: row.locator.endOffset,
    startLine: row.locator.startLine,
    endLine: row.locator.endLine,
  };
}

function LongDocumentTablePreview({
  table,
  onLocateSource,
}: {
  table: AuthoringLongDocumentTable;
  onLocateSource?: (
    locator: AuthoringSourceLocatorView,
    origin?: "table" | "row",
  ) => void;
}) {
  const bodySourceRows = table.sourceRows.filter(
    (sourceRow) => sourceRow.kind === "body",
  );
  return (
    <section
      data-testid="ta-authoring-long-table"
      data-table-id={table.tableId}
      data-table-state={table.state}
      className="border-t border-[var(--flowme-border)]"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--flowme-text)]">
            원문 표
          </h3>
        </div>
        {onLocateSource ? (
          <button
            type="button"
            data-testid="ta-authoring-long-table-source"
            data-locator-id={longTableLocatorView(table).locatorId}
            className={FLOW_UI_SECONDARY_ACTION_CLASS}
            onClick={() => onLocateSource(longTableLocatorView(table), "table")}
          >
            원문에서 보기
          </button>
        ) : null}
      </header>
      <div
        className="max-w-full overflow-x-auto border-t border-[var(--flowme-border)]"
        tabIndex={0}
        aria-label={`원문 표, ${table.rows.length}개 행, ${table.headers.length}개 열`}
      >
        <table className="w-full min-w-[640px] table-auto border-collapse text-left text-xs">
          <thead className="bg-[var(--flowme-surface-subtle)] text-[var(--flowme-text-tertiary)]">
            <tr>
              <th scope="col" className="w-10 px-2 py-2 font-semibold">
                행
              </th>
              {table.headers.map((header, columnIndex) => (
                <th
                  key={`${table.tableId}-header-${columnIndex}`}
                  scope="col"
                  className="min-w-32 border-l border-[var(--flowme-border)] px-3 py-2 font-semibold"
                >
                  {header || `열 ${columnIndex + 1}`}
                </th>
              ))}
              <th scope="col" className="w-20 px-2 py-2">
                <span className="sr-only">원문 위치</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => {
              const sourceLocator = longTableRowLocatorView(table, rowIndex);
              return (
                <tr
                  key={`${table.tableId}-row-${rowIndex}`}
                  className="border-t border-[var(--flowme-border)] align-top"
                >
                  <th
                    scope="row"
                    className="px-2 py-3 font-semibold text-[var(--flowme-text-tertiary)]"
                  >
                    {rowIndex + 1}
                  </th>
                  {table.headers.map((_, columnIndex) => {
                    const sourceCell =
                      bodySourceRows[rowIndex]?.cells[columnIndex];
                    return (
                      <td
                        key={`${table.tableId}-cell-${rowIndex}-${columnIndex}`}
                        data-testid="ta-authoring-long-table-cell"
                        data-row-index={rowIndex + 1}
                        data-column-index={columnIndex + 1}
                        data-source-start-offset={
                          sourceCell?.locator.startOffset
                        }
                        data-source-end-offset={sourceCell?.locator.endOffset}
                        className="max-w-72 border-l border-[var(--flowme-border)] px-3 py-3 text-[var(--flowme-text-secondary)]"
                      >
                        <SheetCellValue value={row[columnIndex] ?? ""} />
                      </td>
                    );
                  })}
                  <td className="px-2 py-2">
                    {sourceLocator && onLocateSource ? (
                      <button
                        type="button"
                        data-testid="ta-authoring-long-table-row-source"
                        data-locator-id={sourceLocator.locatorId}
                        data-row-index={rowIndex + 1}
                        className={FLOW_UI_SECONDARY_ACTION_CLASS}
                        onClick={() => onLocateSource(sourceLocator, "row")}
                      >
                        {rowIndex + 1}행 원문
                      </button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SheetPreview({
  view,
  rows,
  offset,
  onEditItem,
  onEditSourceItem,
  productMode,
  onLocateLongDocumentSource,
}: {
  view: AuthoringArtifactView;
  rows: AuthoringArtifactRow[];
  offset: number;
  onEditItem: (itemId: string) => void;
  onEditSourceItem: (itemId: string) => void;
  productMode: boolean;
  onLocateLongDocumentSource?: (
    locator: AuthoringSourceLocatorView,
    origin?: "table" | "row",
  ) => void;
}) {
  const longDocumentTables = view.longDocumentTables ?? [];
  const columns = view.sheetColumns ?? [];
  const groups = groupAuthoringRowsByItem(rows);
  const canonicalRows = productMode
    ? groups.map((group) => group.parent)
    : rows;
  const occurrenceRows = productMode
    ? groups.flatMap((group) => group.occurrences)
    : [];

  const renderRows = (
    tableRows: AuthoringArtifactRow[],
    options: { occurrences?: boolean } = {},
  ) => (
    <tbody>
      {tableRows.map((row, index) => (
        <tr
          key={row.rowId}
          data-row-id={row.rowId}
          data-testid="ta-authoring-artifact-row"
          data-item-id={row.itemId}
          data-occurrence-id={row.occurrenceId}
          data-artifact-kind="sheet"
          className="border-t border-[var(--flowme-border)] align-top"
        >
          <th
            scope="row"
            className="px-2 py-3 font-semibold text-[var(--flowme-text-tertiary)]"
          >
            {options.occurrences
              ? `${(row.occurrenceIndex ?? index) + 1}회`
              : offset + index + 1}
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
            {options.occurrences ? null : productMode ? (
              <PreviewSourceButton
                row={row}
                onEditSourceItem={onEditSourceItem}
                label="원문"
              />
            ) : (
              <PreviewEditButton row={row} onEditItem={onEditItem} />
            )}
            {row.validations.length > 0 ? (
              <p
                data-testid="ta-authoring-preview-validations"
                className="mt-1 max-w-28 text-[10px] leading-4 text-[var(--flowme-warning-strong)]"
              >
                {row.validations
                  .map((validation) => validation.label)
                  .join(", ")}
              </p>
            ) : null}
          </td>
        </tr>
      ))}
    </tbody>
  );

  const tableHead = (
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
          <span className="sr-only">
            {productMode ? "원문에서 보기" : "수정"}
          </span>
        </th>
      </tr>
    </thead>
  );

  return (
    <section
      data-testid={PREVIEW_TEST_ID.sheet}
      className="border-t border-[var(--flowme-border)]"
    >
      {productMode && longDocumentTables.length === 0 ? (
        <p className="px-3 py-3 text-xs leading-5 text-[var(--flowme-text-secondary)]">
          원문 항목의 공통 정보를 비교하는 표입니다. 셀은 원문에서 수정합니다.
        </p>
      ) : null}
      {longDocumentTables.map((table) => (
        <LongDocumentTablePreview
          key={table.tableId}
          table={table}
          onLocateSource={onLocateLongDocumentSource}
        />
      ))}
      {longDocumentTables.length === 0 ? (
        <div
          className="max-w-full overflow-x-auto border-t border-[var(--flowme-border)]"
          tabIndex={0}
          aria-label={`${productMode ? "항목 구조 표" : "표 미리보기"}, ${columns.length}개 열`}
        >
          <table className="w-full min-w-[640px] table-auto border-collapse text-left text-xs">
            {tableHead}
            {renderRows(canonicalRows)}
          </table>
        </div>
      ) : null}
      {longDocumentTables.length === 0 && occurrenceRows.length > 0 ? (
        <details className="border-t border-[var(--flowme-border)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-semibold text-[var(--flowme-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]">
            <span>반복 회차 보기</span>
            <span>{occurrenceRows.length}회</span>
          </summary>
          <div
            className="max-w-full overflow-x-auto border-t border-[var(--flowme-border)]"
            tabIndex={0}
            aria-label={`반복 회차 표, ${occurrenceRows.length}개 행`}
          >
            <table className="w-full min-w-[640px] table-auto border-collapse text-left text-xs">
              {tableHead}
              {renderRows(occurrenceRows, { occurrences: true })}
            </table>
          </div>
        </details>
      ) : null}
    </section>
  );
}

function AuthoringProjectionPreview({
  artifact,
  view,
  preflight,
  onEditItem,
  onEditSourceItem,
  productMode,
  onLocateLongDocumentSource,
}: {
  artifact: AuthoringArtifactKind;
  view: AuthoringArtifactView;
  preflight: AuthoringArtifactPreflight;
  onEditItem: (itemId: string) => void;
  onEditSourceItem: (itemId: string) => void;
  productMode: boolean;
  onLocateLongDocumentSource?: (
    locator: AuthoringSourceLocatorView,
    origin?: "table" | "row",
  ) => void;
}) {
  const recurrenceRowsAreAlreadyBounded = view.recurrenceSummaries.length > 0;
  const previewRowLimit = recurrenceRowsAreAlreadyBounded
    ? view.rows.length
    : PREVIEW_ROW_LIMIT;
  const visibleRows =
    artifact === "calendar" ? view.rows : view.rows.slice(0, previewRowLimit);
  const remainingRows =
    artifact === "calendar" ? [] : view.rows.slice(previewRowLimit);
  const displayCount =
    productMode && (artifact === "todo" || artifact === "sheet")
      ? new Set(view.rows.map((row) => row.itemId)).size
      : view.count;
  const renderRows = (rows: AuthoringArtifactRow[], offset = 0) =>
    artifact === "calendar" ? (
      <CalendarPreview
        rows={rows}
        onEditItem={onEditItem}
        onEditSourceItem={onEditSourceItem}
      />
    ) : artifact === "sheet" ? (
      <SheetPreview
        view={view}
        rows={rows}
        offset={offset}
        onEditItem={onEditItem}
        onEditSourceItem={onEditSourceItem}
        productMode={productMode}
        onLocateLongDocumentSource={onLocateLongDocumentSource}
      />
    ) : artifact === "todo" && productMode ? (
      <TodoPreview
        view={view}
        rows={rows}
        offset={offset}
        onEditItem={onEditItem}
        onEditSourceItem={onEditSourceItem}
      />
    ) : (
      <div data-testid={PREVIEW_TEST_ID[artifact]}>
        {rows.map((row, index) => (
          <RichPreviewRow
            key={row.rowId}
            artifact={artifact}
            row={row}
            index={offset + index}
            onEditItem={onEditItem}
            onEditSourceItem={onEditSourceItem}
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
          {productMode ? "원문 해석 결과" : "실제로 가져갈 내용"}
        </p>
        <h2
          id="ta-authoring-artifact-preview-title"
          className="mt-0.5 text-sm font-semibold text-[var(--flowme-text)]"
        >
          {artifactLabel(artifact, productMode)} · {displayCount}개
        </h2>
        {productMode && preflight.lossCount > 0 ? (
          <p className="mt-1 text-[11px] text-[var(--flowme-warning-strong)]">
            원문에서 확인할 내용이 있습니다.
          </p>
        ) : !productMode ? (
          <p className="mt-1 text-[11px] text-[var(--flowme-text-secondary)]">
            {preflight.count}개 포함 · {preflight.omittedCount}개 제외
          </p>
        ) : null}
      </header>
      {renderRows(visibleRows)}
      {remainingRows.length > 0 ? (
        <details className="border-t border-[var(--flowme-border)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 text-xs font-semibold text-[var(--flowme-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]">
            <span>나머지 {remainingRows.length}개 보기</span>
            <span aria-hidden="true">⌄</span>
          </summary>
          {renderRows(remainingRows, previewRowLimit)}
        </details>
      ) : null}
    </section>
  );
}

export function ResultPane({
  projection,
  preflight,
  unavailableMessage,
  reviewGates,
  sourceState,
  userCorrectionCount,
  itemCount,
  itemReviewCount,
  issues = [],
  selectedArtifact,
  anchor,
  onArtifactChange,
  onAnchorChange,
  onEditItem,
  onEditSourceItem,
  onEditIssueSource,
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
  onOpenSourceComparison,
  textResultValues,
  onCopyRawText,
  onCopySourceSnapshot,
  onCopyStructuredText,
  onCopyStructuredMarkdown,
  tableLoss,
  onLocateTableLoss,
  onDownloadRawText,
  onLocateLongDocumentSource,
  rawPreservedTextResult = false,
  canAlignSourceOrder = false,
  onAlignSourceOrder,
  hasUndo = false,
  onUndo,
  hasWorkingTextSyncUndo = false,
  onUndoWorkingText,
  onExpandFiniteOccurrences,
  onExpandOpenEndedOccurrences,
  productMode = false,
}: {
  projection: AuthoringArtifactProjection | null;
  preflight: AuthoringArtifactPreflight | null;
  unavailableMessage?: string;
  reviewGates: AuthoringReviewGate[];
  sourceState?: AuthoringSourceState;
  userCorrectionCount: number;
  itemCount: number;
  itemReviewCount: number;
  issues?: AuthoringIssueView[];
  selectedArtifact: AuthoringArtifactKind;
  anchor: string;
  onArtifactChange: (artifact: AuthoringArtifactKind) => void;
  onAnchorChange: (anchor: string) => void;
  onEditItem: (itemId: string) => void;
  onEditSourceItem: (itemId: string) => void;
  onEditIssueSource?: (issueId: string) => void;
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
  onOpenSourceComparison?: () => void;
  textResultValues?: AuthoringTextResultValues;
  onCopyRawText?: () => void | Promise<void>;
  onCopySourceSnapshot?: () => void | Promise<void>;
  onCopyStructuredText?: () => void | Promise<void>;
  onCopyStructuredMarkdown?: () => void | Promise<void>;
  tableLoss?: AuthoringTableLossView | null;
  onLocateTableLoss?: (
    locator: AuthoringSourceLocatorView,
    origin?: "summary" | "slot",
  ) => void;
  onDownloadRawText?: () => void;
  onLocateLongDocumentSource?: (
    locator: AuthoringSourceLocatorView,
    origin?: "table" | "row",
  ) => void;
  rawPreservedTextResult?: boolean;
  canAlignSourceOrder?: boolean;
  onAlignSourceOrder?: () => void;
  hasUndo?: boolean;
  onUndo?: () => void;
  hasWorkingTextSyncUndo?: boolean;
  onUndoWorkingText?: () => void;
  onExpandFiniteOccurrences?: (nextLimit: number) => void;
  onExpandOpenEndedOccurrences?: (nextWeeks: number) => void;
  productMode?: boolean;
}) {
  const [textCopyStatus, setTextCopyStatus] = useState("");
  const [focusedArtifact, setFocusedArtifact] =
    useState<AuthoringArtifactKind | null>(null);
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
              (productMode
                ? "일반 문장도 TXT에 그대로 보존됩니다."
                : "같은 항목을 캘린더·할 일·표·Excel·TXT 결과로 바꿔 봅니다.")}
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
  const firstIssue = issues[0];
  const describedArtifact = focusedArtifact ?? selectedArtifact;
  const describedSlot = authoringResultSlotState(describedArtifact, projection);
  const recurrenceSummaries = selectedView.recurrenceSummaries;
  const itemSummaryLabel =
    recurrenceSummaries.length > 0 && selectedView.rows.length !== itemCount
      ? `원문 항목 ${itemCount}개 → 결과 ${selectedView.rows.length}개`
      : `원문 항목 ${itemCount}개`;
  const nextFiniteOccurrenceLimit = recurrenceSummaries.reduce(
    (next, summary) =>
      summary.mode !== "open_ended" && summary.hasMore
        ? Math.max(next, summary.nextOccurrenceLimit ?? 0)
        : next,
    0,
  );
  const nextFiniteOccurrenceCount = recurrenceSummaries.reduce(
    (count, summary) =>
      summary.mode !== "open_ended" &&
      summary.hasMore &&
      summary.nextOccurrenceLimit != null
        ? Math.max(
            count,
            Math.max(0, summary.nextOccurrenceLimit - summary.visibleCount),
          )
        : count,
    0,
  );
  const nextOpenEndedPreviewWeeks = recurrenceSummaries.reduce(
    (next, summary) =>
      summary.mode === "open_ended" && summary.hasMore
        ? Math.max(next, summary.nextPreviewWeeks ?? 0)
        : next,
    0,
  );
  const memoValidationRows = projection.artifacts.memo.rows.filter(
    (row) => row.validations.length > 0,
  );
  const needsAnchor = projection.artifacts.calendar.losses.some(
    (loss) => loss.reason === "relative_anchor_required",
  );
  const showRawFallback = Boolean(
    tableLoss &&
    (tableLoss.state === "blocked" || tableLoss.state === "txt-only"),
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
        try {
          await copy();
        } catch (error) {
          if (!value || !legacyCopyText(value)) throw error;
        }
      } else if (value) {
        try {
          await navigator.clipboard.writeText(value);
        } catch (error) {
          if (!legacyCopyText(value)) throw error;
        }
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
          {!productMode ? (
            <p className="text-[11px] text-[var(--flowme-text-tertiary)]">
              입력을 멈추면 자동으로 반영됩니다
            </p>
          ) : null}
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
        {productMode && firstIssue ? (
          <section
            data-testid="ta-authoring-product-issue"
            className="border-b border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-4 py-4"
            aria-labelledby="ta-authoring-product-issue-heading"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3
                  id="ta-authoring-product-issue-heading"
                  className="text-sm font-semibold text-[var(--flowme-warning-strong)]"
                >
                  원문 수정 필요 {itemReviewCount}건
                </h3>
                <p className="mt-1 text-xs font-semibold text-[var(--flowme-text)]">
                  {firstIssue.sourceLineLabel} · {firstIssue.reason}
                </p>
              </div>
              <button
                type="button"
                data-testid="ta-authoring-product-issue-source"
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                onClick={() => onEditIssueSource?.(firstIssue.issueId)}
              >
                원문 수정
              </button>
            </div>
            <dl className="mt-3 grid gap-2 text-xs leading-5 sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-[var(--flowme-text)]">
                  이렇게 입력
                </dt>
                <dd className="break-words text-[var(--flowme-text-secondary)]">
                  {firstIssue.expectedInput}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-[var(--flowme-text)]">
                  현재 영향
                </dt>
                <dd className="text-[var(--flowme-warning-strong)]">
                  {firstIssue.blockedResult}
                </dd>
              </div>
            </dl>
            {itemReviewCount > 1 || firstIssue.availableOutcomes.length > 0 ? (
              <button
                type="button"
                data-testid="ta-authoring-item-review-open"
                className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-3`}
                onClick={onOpenItemReview}
              >
                {itemReviewCount > 1
                  ? `모든 문제 ${itemReviewCount}건 보기`
                  : "처리 방법 선택"}
              </button>
            ) : null}
          </section>
        ) : !productMode ? (
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
                productMode
                  ? `원문 수정 필요 ${itemReviewCount}건`
                  : itemReviewCount > 0
                    ? `확인이 필요한 문장 ${itemReviewCount}개, 항목 검토`
                    : `${itemSummaryLabel}, 항목 검토`
              }
              onClick={onOpenItemReview}
            >
              <span className="flex items-center justify-between gap-3 text-xs font-semibold">
                <span>
                  {productMode
                    ? `원문 수정 필요 ${itemReviewCount}건`
                    : itemReviewCount > 0
                      ? `확인이 필요한 문장 ${itemReviewCount}개`
                      : itemSummaryLabel}
                </span>
                <span className="shrink-0">
                  {productMode ? "첫 문제 보기 ›" : "항목 검토 ›"}
                </span>
              </span>
              {!productMode && itemReviewCount > 0 ? (
                <span className="mt-1 block text-[11px] leading-5 text-[var(--flowme-text-secondary)]">
                  결과에 넣을지 정하지 못한 문장은 원문에 남아 있습니다.
                </span>
              ) : null}
            </button>
          </section>
        ) : null}

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
              {productMode ? (
                <p>{ARTIFACT_PURPOSE[selectedArtifact]}</p>
              ) : (
                <div className="space-y-2">
                  <p>
                    입력이 조건을 만족하면 해당 결과가 활성화됩니다. 네 버튼의
                    위치는 바뀌지 않습니다.
                  </p>
                  <p data-testid={`ta-authoring-${selectedArtifact}-boundary`}>
                    {selectedArtifact === "memo"
                      ? "TXT는 좌측 작업 원문을 항목별 읽기 문서로 정리한 결과입니다."
                      : selectedArtifact === "todo"
                        ? "할 일은 - [ ]로 시작한 부모 Item이며 하위 확인 항목은 같은 항목 안에 남습니다."
                        : selectedArtifact === "calendar"
                          ? "날짜가 있는 같은 할 일만 캘린더에 나타납니다."
                          : "표·Excel은 공통 정보가 있거나 원문이 실제 표일 때 활성화됩니다."}
                  </p>
                </div>
              )}
            </InlineHelp>
          </div>
          <div
            className="ta-result-shape-grid mt-2 grid grid-cols-4 gap-1.5"
            role="tablist"
            aria-label="결과 형태"
          >
            {RESULT_SLOT_ORDER.map((artifact) => {
              const view = projection.artifacts[artifact];
              const selected = artifact === selectedArtifact;
              const slot = authoringResultSlotState(artifact, projection);
              const recommended = artifact === projection.primaryArtifact;
              const inactive =
                slot.state === "disabled" || slot.state === "blocked";
              return (
                <button
                  key={artifact}
                  type="button"
                  role="tab"
                  data-testid={`ta-authoring-result-slot-${artifact}`}
                  aria-pressed={selected}
                  aria-selected={selected}
                  aria-disabled={inactive}
                  aria-describedby={
                    productMode
                      ? "ta-authoring-result-slot-description"
                      : undefined
                  }
                  aria-label={`${artifactLabel(artifact, productMode)}${slot.reason ? ` · ${slot.reason}` : ""}`}
                  data-selected={selected}
                  data-eligible={view.eligible}
                  data-recommended={recommended}
                  data-state={slot.state}
                  disabled={!productMode && inactive}
                  className={`min-h-14 min-w-0 rounded-[var(--flowme-radius-control)] border px-1.5 py-2 text-center text-[11px] font-semibold leading-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] sm:px-2 sm:text-sm ${
                    selected
                      ? "border-[var(--flowme-positive)] bg-[var(--flowme-positive-soft)] text-[var(--flowme-positive-strong)]"
                      : slot.state === "active"
                        ? "border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] hover:bg-[var(--flowme-surface-subtle)]"
                        : slot.state === "active-partial"
                          ? "border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] text-[var(--flowme-warning-strong)]"
                          : "cursor-not-allowed border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] text-[var(--flowme-text-tertiary)]"
                  }`}
                  onFocus={() => setFocusedArtifact(artifact)}
                  onClick={() => {
                    if (
                      slot.state === "active" ||
                      slot.state === "active-partial"
                    ) {
                      onArtifactChange(artifact);
                    }
                  }}
                >
                  <span className="block break-keep">
                    {selected ? <span aria-hidden="true">✓ </span> : null}
                    {artifactLabel(artifact, productMode)}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-normal sm:text-xs">
                    {productMode
                      ? selected
                        ? "선택됨"
                        : slot.state === "active"
                          ? "사용 가능"
                          : slot.state === "active-partial"
                            ? "일부 확인 필요"
                            : slot.state === "blocked"
                              ? "원문 수정 필요"
                              : "조건 없음"
                      : view.eligible
                        ? recommended
                          ? `추천 · ${view.count}개`
                          : `${view.count}개`
                        : "사용 불가"}
                  </span>
                </button>
              );
            })}
          </div>
          {productMode ? (
            <p
              id="ta-authoring-result-slot-description"
              data-testid="ta-authoring-result-slot-description"
              className={`mt-2 min-h-5 text-xs leading-5 ${
                describedSlot.state === "blocked" ||
                describedSlot.state === "active-partial"
                  ? "text-[var(--flowme-warning-strong)]"
                  : "text-[var(--flowme-text-secondary)]"
              }`}
            >
              {describedSlot.reason ?? ARTIFACT_PURPOSE[describedArtifact]}
            </p>
          ) : null}
          {productMode &&
          describedArtifact === "sheet" &&
          selectedArtifact !== "sheet" &&
          tableLoss?.firstLocator &&
          onLocateTableLoss ? (
            <button
              type="button"
              data-testid="ta-authoring-result-slot-source"
              data-artifact="sheet"
              data-locator-id={tableLoss.firstLocator.locatorId}
              className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-2`}
              onClick={() => onLocateTableLoss(tableLoss.firstLocator!, "slot")}
            >
              원문 위치에서 확인
            </button>
          ) : null}
          {productMode &&
          sourceSnapshotText &&
          sourceSnapshotText !== rawText &&
          onOpenSourceComparison ? (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-3 py-2">
              <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
                처음 붙여넣은 원문은 보존되어 있습니다.
              </p>
              <button
                type="button"
                data-testid="ta-authoring-open-source-comparison"
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                onClick={onOpenSourceComparison}
              >
                처음 원문과 비교
              </button>
            </div>
          ) : null}
          {productMode ? (
            selectedArtifact === "calendar" &&
            (canAlignSourceOrder || hasUndo) ? (
              <div
                data-testid="ta-authoring-source-order-action"
                className="mt-2 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3"
              >
                <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
                  캘린더는 날짜·시간순으로만 표시합니다. 원문 순서는
                  그대로입니다.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {canAlignSourceOrder ? (
                    <button
                      type="button"
                      data-testid="ta-authoring-align-source-order"
                      className={FLOW_UI_SECONDARY_ACTION_CLASS}
                      disabled={!onAlignSourceOrder}
                      onClick={onAlignSourceOrder}
                    >
                      원문도 캘린더 순서로 맞추기
                    </button>
                  ) : null}
                  {hasUndo ? (
                    <button
                      type="button"
                      data-testid="ta-authoring-align-source-order-undo"
                      className={FLOW_UI_SECONDARY_ACTION_CLASS}
                      disabled={!onUndo}
                      onClick={onUndo}
                    >
                      순서 변경 되돌리기
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null
          ) : (
            <div
              data-testid="ta-authoring-source-order-action"
              className="mt-2 flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                data-testid="ta-authoring-align-source-order"
                className={FLOW_UI_SECONDARY_ACTION_CLASS}
                disabled={!canAlignSourceOrder || !onAlignSourceOrder}
                onClick={onAlignSourceOrder}
              >
                날짜순을 원문에도 적용
              </button>
              {hasUndo ? (
                <button
                  type="button"
                  data-testid="ta-authoring-align-source-order-undo"
                  className={FLOW_UI_SECONDARY_ACTION_CLASS}
                  disabled={!onUndo}
                  onClick={onUndo}
                >
                  순서 변경 되돌리기
                </button>
              ) : null}
            </div>
          )}
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

        {selectedArtifact === "sheet" && tableLoss ? (
          <section
            data-testid="ta-authoring-table-loss-summary"
            className="mx-4 mt-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] p-3"
            aria-labelledby="ta-authoring-table-loss-heading"
          >
            <h3
              id="ta-authoring-table-loss-heading"
              className="text-sm font-semibold text-[var(--flowme-warning-strong)]"
            >
              {tableLoss.state === "partial"
                ? "표·Excel 일부 확인 필요"
                : "표·Excel 결과를 만들지 않았습니다"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
              {tableLoss.summary}
            </p>
            <details
              data-testid="ta-authoring-table-loss-details"
              className="mt-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-warning)] bg-[var(--flowme-surface)]"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-xs font-semibold text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--flowme-focus)]">
                <span>보존한 범위 확인</span>
                <span aria-hidden="true">⌄</span>
              </summary>
              <div className="border-t border-[var(--flowme-warning)] px-3 py-3 text-xs leading-5 text-[var(--flowme-text-secondary)]">
                <p>{tableLoss.detail}</p>
                <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-[var(--flowme-text)]">
                      원문 표
                    </dt>
                    <dd>
                      {tableLoss.sourceRowCount}개 행 ·{" "}
                      {tableLoss.sourceCellCount}개 셀
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--flowme-text)]">
                      안전하게 읽은 범위
                    </dt>
                    <dd>
                      {tableLoss.structuredRowCount}개 행 ·{" "}
                      {tableLoss.structuredCellCount}개 셀
                    </dd>
                  </div>
                </dl>
                {tableLoss.firstLocator && onLocateTableLoss ? (
                  <button
                    type="button"
                    data-testid="ta-authoring-table-loss-source"
                    data-locator-id={tableLoss.firstLocator.locatorId}
                    className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-3`}
                    onClick={() =>
                      onLocateTableLoss(tableLoss.firstLocator!, "summary")
                    }
                  >
                    원문 위치에서 확인
                  </button>
                ) : null}
              </div>
            </details>
          </section>
        ) : null}

        {hasWorkingTextSyncUndo ? (
          <section
            data-testid="ta-authoring-working-text-sync-undo"
            className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3"
          >
            <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
              방금 수정한 항목을 좌측 작업 원문과 결과에 함께 반영했습니다.
            </p>
            <button
              type="button"
              className={FLOW_UI_SECONDARY_ACTION_CLASS}
              disabled={!onUndoWorkingText}
              onClick={onUndoWorkingText}
            >
              최근 원문 수정 되돌리기
            </button>
          </section>
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

        <div className="px-4 py-4">
          {selectedArtifact === "memo" ? (
            <section
              data-testid="ta-authoring-text-result-boundary"
              className="mb-4 space-y-3"
              aria-label="TXT 결과"
            >
              <article className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] p-3">
                <h3 className="text-sm font-semibold">TXT 결과</h3>
                {memoValidationRows.length > 0 ? (
                  <section
                    data-testid="ta-authoring-memo-validations"
                    className="mt-3 rounded-[var(--flowme-radius-control)] border border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] px-3 py-2.5"
                    aria-label="입력 형식 확인"
                  >
                    <ul className="space-y-1 text-xs leading-5 text-[var(--flowme-warning-strong)]">
                      {memoValidationRows.flatMap((row) =>
                        row.validations.map((validation) => (
                          <li
                            key={`${row.rowId}-${validation.type}-${validation.input ?? validation.message}`}
                          >
                            <strong>
                              {row.title} · {validation.label}
                            </strong>
                            : {validation.message}
                            {validation.input
                              ? ` · 입력: ${validation.input}`
                              : ""}
                            <button
                              type="button"
                              data-testid="ta-authoring-preview-source-edit"
                              data-item-id={row.itemId}
                              className={`${FLOW_UI_SECONDARY_ACTION_CLASS} ml-2 align-middle`}
                              onClick={() => onEditSourceItem(row.itemId)}
                            >
                              원문에서 수정
                            </button>
                          </li>
                        )),
                      )}
                    </ul>
                  </section>
                ) : null}
                {productMode ? (
                  <pre
                    data-testid="ta-authoring-structured-text-preview"
                    aria-label={
                      rawPreservedTextResult
                        ? "원문 보존 TXT 전체 내용"
                        : "계층형 TXT 전체 내용"
                    }
                    tabIndex={0}
                    className="mt-3 max-h-96 min-h-52 w-full overflow-auto whitespace-pre-wrap break-words rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3 font-mono text-xs leading-6 text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
                  >
                    {textResultValues?.structured_plain_text ||
                      textResultValues?.raw ||
                      rawText ||
                      ""}
                  </pre>
                ) : (
                  <textarea
                    readOnly
                    data-testid="ta-authoring-structured-text-preview"
                    aria-label="복사할 TXT 전체 내용"
                    className={`${FLOW_UI_INPUT_CLASS} mt-3 min-h-52 max-h-80 w-full resize-y whitespace-pre-wrap font-mono text-xs leading-5`}
                    value={textResultValues?.structured_plain_text ?? ""}
                    onFocus={(event) => event.currentTarget.select()}
                  />
                )}
                {!productMode || !showRawFallback ? (
                  <div
                    className={`mt-3 grid gap-2 ${
                      productMode ? "" : "sm:grid-cols-2"
                    }`}
                  >
                    <button
                      type="button"
                      data-testid="ta-authoring-copy-structured-text"
                      className={`${FLOW_UI_PRIMARY_ACTION_CLASS} w-full`}
                      disabled={
                        !textResultValues?.structured_plain_text &&
                        !rawText &&
                        !onCopyStructuredText
                      }
                      onClick={() =>
                        copyTextResult({
                          copy: onCopyStructuredText,
                          value:
                            textResultValues?.structured_plain_text ?? rawText,
                          successMessage: rawPreservedTextResult
                            ? "원문을 보존한 TXT를 복사했습니다."
                            : "TXT 전체를 복사했습니다.",
                        })
                      }
                    >
                      {productMode
                        ? rawPreservedTextResult
                          ? "원문 보존 TXT 복사"
                          : "TXT 복사"
                        : "TXT 전체 복사"}
                    </button>
                    {!productMode ? (
                      <button
                        type="button"
                        className={FLOW_UI_SECONDARY_ACTION_CLASS}
                        onClick={onOpenExport}
                      >
                        TXT 파일 만들기
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
              {!productMode ? (
                <details className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)]">
                  <summary className="cursor-pointer px-3 py-3 text-xs font-semibold text-[var(--flowme-text-secondary)]">
                    작업 원문·Markdown 복사
                  </summary>
                  <div className="grid gap-2 border-t border-[var(--flowme-border)] p-3">
                    <button
                      type="button"
                      data-testid="ta-authoring-copy-raw-text"
                      className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
                      disabled={
                        !rawText && !textResultValues?.raw && !onCopyRawText
                      }
                      onClick={() =>
                        copyTextResult({
                          copy: onCopyRawText,
                          value: rawText ?? textResultValues?.raw,
                          successMessage: "현재 작업 원문을 복사했습니다.",
                        })
                      }
                    >
                      현재 작업 원문 복사
                    </button>
                    {sourceSnapshotText && sourceSnapshotText !== rawText ? (
                      <button
                        type="button"
                        data-testid="ta-authoring-copy-source-snapshot"
                        className={`${FLOW_UI_SECONDARY_ACTION_CLASS} w-full`}
                        onClick={() =>
                          copyTextResult({
                            copy: onCopySourceSnapshot,
                            value: sourceSnapshotText,
                            successMessage:
                              "처음 붙여넣은 원문을 복사했습니다.",
                          })
                        }
                      >
                        처음 붙여넣은 원문 복사
                      </button>
                    ) : null}
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
                      문법 포함 Markdown 복사
                    </button>
                  </div>
                </details>
              ) : null}
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
              {showRawFallback ? (
                <section
                  className="rounded-[var(--flowme-radius-control)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3"
                  aria-label="원문 보존 파일"
                >
                  <p className="text-xs leading-5 text-[var(--flowme-text-secondary)]">
                    표·Excel 결과가 제한되어도 현재 작업 원문은 바꾸거나 줄이지
                    않았습니다.
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      data-testid="ta-authoring-raw-source-copy"
                      className={FLOW_UI_SECONDARY_ACTION_CLASS}
                      onClick={() =>
                        copyTextResult({
                          copy: onCopyRawText,
                          value: textResultValues?.raw ?? rawText,
                          successMessage: "원문을 그대로 복사했습니다.",
                        })
                      }
                    >
                      원문 그대로 복사
                    </button>
                    <button
                      type="button"
                      data-testid="ta-authoring-raw-source-download"
                      className={FLOW_UI_SECONDARY_ACTION_CLASS}
                      disabled={!onDownloadRawText}
                      onClick={onDownloadRawText}
                    >
                      원문 TXT 받기
                    </button>
                  </div>
                </section>
              ) : null}
            </section>
          ) : null}
          {selectedArtifact === "memo" ? null : (
            <AuthoringProjectionPreview
              artifact={selectedArtifact}
              view={selectedView}
              preflight={preflight}
              onEditItem={onEditItem}
              onEditSourceItem={onEditSourceItem}
              productMode={productMode}
              onLocateLongDocumentSource={onLocateLongDocumentSource}
            />
          )}
        </div>

        {!productMode && reviewGates.length > 0 ? (
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

        {recurrenceSummaries.length > 0 &&
        (!productMode ||
          nextFiniteOccurrenceLimit > 0 ||
          nextOpenEndedPreviewWeeks > 0) ? (
          <section
            data-testid="ta-authoring-recurrence-preview-summary"
            className="m-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] p-3"
          >
            <h3 className="text-xs font-semibold text-[var(--flowme-text)]">
              {productMode ? "회차 더 보기" : "반복 미리보기"}
            </h3>
            {productMode ? (
              <p className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
                더 보기를 해도 이미 표시한 회차의 순서는 그대로 유지됩니다.
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--flowme-text-secondary)]">
                {recurrenceSummaries.map((summary) => {
                  const title =
                    selectedView.rows.find(
                      (row) => row.itemId === summary.itemId,
                    )?.title ?? "반복 항목";
                  const countLabel =
                    summary.totalCount != null
                      ? `${summary.visibleCount}/${summary.totalCount}회`
                      : `${summary.visibleWeeks ?? 4}주 · ${summary.visibleCount}회`;
                  return (
                    <li key={summary.itemId}>
                      <strong className="text-[var(--flowme-text)]">
                        {title}
                      </strong>{" "}
                      · {summary.label} · {countLabel}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {nextFiniteOccurrenceLimit > 0 ? (
                <button
                  type="button"
                  data-testid="ta-authoring-recurrence-more-finite"
                  className={FLOW_UI_SECONDARY_ACTION_CLASS}
                  disabled={!onExpandFiniteOccurrences}
                  onClick={() =>
                    onExpandFiniteOccurrences?.(nextFiniteOccurrenceLimit)
                  }
                >
                  다음 {nextFiniteOccurrenceCount || 30}회 보기
                </button>
              ) : null}
              {nextOpenEndedPreviewWeeks > 0 ? (
                <button
                  type="button"
                  data-testid="ta-authoring-recurrence-more-open-ended"
                  className={FLOW_UI_SECONDARY_ACTION_CLASS}
                  disabled={!onExpandOpenEndedOccurrences}
                  onClick={() =>
                    onExpandOpenEndedOccurrences?.(nextOpenEndedPreviewWeeks)
                  }
                >
                  다음 4주 보기
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {productMode && preflight.losses.length > 0 ? (
          <details
            data-testid="ta-authoring-preflight"
            className="m-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)]"
          >
            <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-[var(--flowme-warning-strong)]">
              원문 확인 필요
            </summary>
            <div className="border-t border-[var(--flowme-warning)] px-3 py-3">
              <ul className="space-y-3 text-xs leading-5 text-[var(--flowme-warning-strong)]">
                {preflight.losses.map((loss) => (
                  <li key={loss.lossId}>
                    <p>{loss.message}</p>
                    {loss.itemId ? (
                      <button
                        type="button"
                        className={`${FLOW_UI_SECONDARY_ACTION_CLASS} mt-1`}
                        onClick={() => onEditSourceItem(loss.itemId!)}
                      >
                        원문에서 수정
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ) : null}
        {!productMode ? (
          <details
            data-testid="ta-authoring-preflight"
            data-count={preflight.count}
            className="m-4 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)]"
          >
            <summary className="cursor-pointer px-3 py-3 text-sm font-semibold">
              가져갈 내용 {preflight.count}개 · 제외 {preflight.omittedCount}개
              {preflight.lossCount > 0
                ? ` · 빠지는 정보 ${preflight.lossCount}개`
                : ""}
            </summary>
            <div className="border-t border-[var(--flowme-border)] px-3 py-3">
              {preflight.dateRange ? (
                <p className="text-xs">
                  날짜 범위 {preflight.dateRange.start} ~{" "}
                  {preflight.dateRange.end}
                </p>
              ) : null}
              {preflight.losses.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs leading-5">
                  {preflight.losses.slice(0, 6).map((loss) => (
                    <li key={loss.lossId}>— {loss.message}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </details>
        ) : null}
        {!productMode ? (
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
        ) : null}
      </div>
    </section>
  );
}
