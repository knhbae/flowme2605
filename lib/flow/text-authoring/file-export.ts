import { foldIcsContentLine } from "../ics";
import type {
  AuthoringArtifactRow,
  AuthoringArtifactTextBlock,
  AuthoringArtifactView,
} from "./artifact-projection";
import { TEXT_AUTHORING_CANONICAL_LABELS } from "./authoring-grammar";

export const AUTHORING_TABLE_COLUMNS = [
  "Step",
  "항목",
  "회차",
  "원문 체크",
  TEXT_AUTHORING_CANONICAL_LABELS.detail,
  "날짜",
  "시간",
  "시간대",
  "장소",
  "소요 시간(분)",
  "반복",
  "실행 조건",
  "완료 기준",
  "체크리스트",
  "자료",
  "출처",
  "주의",
  "입력 확인",
] as const;

export type AuthoringSheetExportTable = {
  columns: string[];
  rows: Array<Array<string | number>>;
};

/**
 * Uses the exact Sheet projection contract shown in preview. This prevents
 * original table columns from being replaced by a generic export schema.
 */
export function buildAuthoringSheetExportTable(
  view: AuthoringArtifactView,
  includedItemIds?: ReadonlySet<string>,
): AuthoringSheetExportTable {
  if (view.artifact !== "sheet" || !view.eligible) {
    return { columns: [], rows: [] };
  }
  const columns = view.sheetColumns ?? [];
  const longDocumentTables = view.longDocumentTables ?? [];
  if (longDocumentTables.length > 0) {
    if (longDocumentTables.length !== 1) {
      // Multiple independent source tables do not share one safe spreadsheet
      // shape, so callers must choose a table instead of silently flattening.
      return { columns: [], rows: [] };
    }
    const [table] = longDocumentTables;
    return {
      columns: [...table.headers],
      rows: table.rows.map((row) => [...row]),
    };
  }
  const rows = view.rows
    .filter((row) => !includedItemIds || includedItemIds.has(row.itemId))
    .map((row) => columns.map((column) => row.sheetCells?.[column.key] ?? ""));
  return {
    columns: columns.map((column) => column.label),
    rows,
  };
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(/\r?\n/gu, "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function compactDate(value: string): string {
  return value.replaceAll("-", "");
}

function addCalendarDay(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

function icsTimestamp(value: string): string {
  return new Date(value)
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/u, "Z");
}

function icsDescription(row: AuthoringArtifactRow): string {
  const resources = resourceText(row, "plain_text");
  const sources = sourceText(row, "plain_text");
  return [
    row.stepTitle ? `Step: ${row.stepTitle}` : "",
    row.sourceChecked === undefined
      ? ""
      : `원문 체크: ${row.sourceChecked ? "완료" : "미완료"}`,
    row.detail
      ? `${TEXT_AUTHORING_CANONICAL_LABELS.detail}: ${row.detail}`
      : "",
    row.completion ? `완료 기준: ${row.completion}` : "",
    row.place ? `장소: ${row.place}` : "",
    row.repeat ? `반복: ${row.repeat}` : "",
    row.condition ? `실행 조건: ${row.condition}` : "",
    ...(row.subchecks ?? []).map(
      (subcheck) =>
        `체크: ${subcheck.sourceChecked ? "완료" : "미완료"} · ${subcheck.title}`,
    ),
    ...(row.validations ?? []).map((validation) =>
      [
        validation.label,
        validation.input ? `입력값: ${validation.input}` : "",
        validation.expected ? `형식: ${validation.expected}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ),
    resources ? `자료: ${resources}` : "",
    sources ? `출처: ${sources}` : "",
    row.caution ? `주의: ${row.caution}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function serializeAuthoringIcs(
  title: string,
  rows: AuthoringArtifactRow[],
  now = new Date().toISOString(),
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FlowMe//Text Authoring//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(title)}`,
  ];

  const calendarRows = rows
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => Boolean(row.date))
    .sort((left, right) => {
      const leftTime = left.row.time?.trim() ?? "";
      const rightTime = right.row.time?.trim() ?? "";
      return (
        (left.row.date ?? "").localeCompare(right.row.date ?? "") ||
        Number(Boolean(leftTime)) - Number(Boolean(rightTime)) ||
        leftTime.localeCompare(rightTime) ||
        left.row.order - right.row.order ||
        left.sourceIndex - right.sourceIndex
      );
    });
  for (const { row } of calendarRows) {
    const date = compactDate(row.date as string);
    const time = row.time?.match(/^([01]\d|2[0-3]):([0-5]\d)$/u);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(row.occurrenceId ?? row.rowId ?? row.itemId)}@flowme.local`,
      `DTSTAMP:${icsTimestamp(now)}`,
    );
    if (time) {
      const localDateTime = `${date}T${time[1]}${time[2]}00`;
      const safeTimezone = row.timezone?.match(/^[A-Za-z0-9_+\-/]+$/u)?.[0];
      lines.push(
        safeTimezone
          ? `DTSTART;TZID=${safeTimezone}:${localDateTime}`
          : `DTSTART:${localDateTime}`,
        `DURATION:PT${Math.max(1, row.durationMinutes ?? 60)}M`,
      );
    } else {
      lines.push(
        `DTSTART;VALUE=DATE:${date}`,
        `DTEND;VALUE=DATE:${compactDate(addCalendarDay(row.date as string))}`,
      );
    }
    lines.push(
      `SUMMARY:${escapeIcsText(`${title} - ${row.title}`)}`,
      ...(row.place ? [`LOCATION:${escapeIcsText(row.place)}`] : []),
      `DESCRIPTION:${escapeIcsText(icsDescription(row))}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsContentLine).join("\r\n").concat("\r\n");
}

function linkText(
  links: AuthoringArtifactRow["resources"],
  format: "plain_text" | "markdown" | "table",
): string {
  return links
    .map((resource) => {
      const label = resource.label.trim() || resource.url;
      if (!resource.url) return label;
      if (format === "markdown") return `[${label}](${resource.url})`;
      return `${label}: ${resource.url}`;
    })
    .join(format === "table" ? "\n" : ", ");
}

function resourceText(
  row: AuthoringArtifactRow,
  format: "plain_text" | "markdown" | "table",
): string {
  return linkText(row.resources, format);
}

function sourceText(
  row: AuthoringArtifactRow,
  format: "plain_text" | "markdown" | "table",
): string {
  return linkText(row.sources ?? [], format);
}

export function buildAuthoringTableRows(
  rows: AuthoringArtifactRow[],
): Array<Array<string | number>> {
  return rows.map((row) => [
    row.stepTitle ?? "",
    row.title,
    row.occurrenceIndex == null ? "" : `${row.occurrenceIndex}회차`,
    row.sourceChecked === undefined
      ? ""
      : row.sourceChecked
        ? "완료"
        : "미완료",
    row.detail ?? "",
    row.date ?? "",
    row.time ?? "",
    row.timezone ?? "",
    row.place ?? "",
    row.durationMinutes ?? "",
    row.repeat ?? "",
    row.condition ?? "",
    row.completion ?? "",
    (row.subchecks ?? [])
      .map(
        (subcheck) => `${subcheck.sourceChecked ? "☑" : "☐"} ${subcheck.title}`,
      )
      .join("\n"),
    resourceText(row, "table"),
    sourceText(row, "table"),
    row.caution ?? "",
    (row.validations ?? [])
      .map((validation) =>
        [
          validation.label,
          validation.input ? `입력값: ${validation.input}` : "",
          validation.expected ? `형식: ${validation.expected}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      )
      .join("\n"),
  ]);
}

export function serializeAuthoringPlainText(
  title: string,
  rows: AuthoringArtifactRow[],
  sourceOnlyText: Array<string | AuthoringArtifactTextBlock> = [],
): string {
  const safeTitle = title.trim() || "제목 없는 Flow";
  const lines = [safeTitle, "=".repeat(Math.max(3, [...safeTitle].length)), ""];
  let currentStepKey = "";
  let itemNumber = 0;

  rows.forEach((row) => {
    const stepTitle = row.stepTitle?.trim() || "할 일";
    const stepKey = row.stepId || stepTitle;
    if (stepKey !== currentStepKey) {
      if (currentStepKey && lines.at(-1) !== "") lines.push("");
      lines.push(`[${stepTitle}]`);
      currentStepKey = stepKey;
      itemNumber = 0;
    }
    itemNumber += 1;
    const occurrenceLabel =
      row.occurrenceIndex == null ? "" : ` · ${row.occurrenceIndex}회차`;
    lines.push(
      `${itemNumber}. ${row.sourceChecked === true ? "☑" : "☐"} ${row.title}${occurrenceLabel}`,
    );
    const description = row.description ?? row.detail;
    if (description) {
      lines.push("   설명:");
      description
        .split(/\r?\n/u)
        .forEach((value) => lines.push(`     ${value}`));
    }
    if (row.completion) lines.push(`   완료 기준: ${row.completion}`);
    if (row.date) lines.push(`   날짜: ${row.date}`);
    if (row.time) lines.push(`   시간: ${row.time}`);
    if (row.timezone) lines.push(`   시간대: ${row.timezone}`);
    if (row.place) lines.push(`   장소: ${row.place}`);
    if (row.durationMinutes != null) {
      lines.push(`   소요 시간: ${row.durationMinutes}분`);
    }
    if (row.repeat) {
      lines.push(`   반복: ${row.recurrenceSummary ?? row.repeat}`);
    }
    if (row.condition) lines.push(`   실행 조건: ${row.condition}`);
    if ((row.subchecks ?? []).length > 0) {
      lines.push("   체크리스트:");
      (row.subchecks ?? []).forEach((subcheck) => {
        lines.push(
          `     ${subcheck.sourceChecked ? "☑" : "☐"} ${subcheck.title}`,
        );
      });
    }
    const resources = resourceText(row, "plain_text");
    if (resources) lines.push(`   자료: ${resources}`);
    const sources = sourceText(row, "plain_text");
    if (sources) lines.push(`   출처: ${sources}`);
    if (row.caution) lines.push(`   주의: ${row.caution}`);
    (row.validations ?? []).forEach((validation) => {
      lines.push(`   ${validation.label}`);
      if (validation.input) lines.push(`     입력값: ${validation.input}`);
      if (validation.expected) lines.push(`     형식: ${validation.expected}`);
    });
    lines.push("");
  });

  const sourceLines = sourceOnlyText.flatMap((entry) => {
    const value = typeof entry === "string" ? entry : entry.rawText;
    return value.trim()
      ? value
          .trim()
          .split(/\r?\n/u)
          .map((line) => line.trim())
          .filter(Boolean)
      : [];
  });
  if (sourceLines.length > 0) {
    if (lines.at(-1) !== "") lines.push("");
    lines.push("[원문 메모]");
    sourceLines.forEach((value) => lines.push(`- ${value}`));
    lines.push("");
  }

  return lines.join("\n").trimEnd().concat("\n");
}

export function serializeAuthoringMarkdown(
  title: string,
  rows: AuthoringArtifactRow[],
): string {
  const lines = [`# ${title}`, ""];
  let currentStepKey = "";
  rows.forEach((row) => {
    const stepTitle = row.stepTitle?.trim() || "할 일";
    const stepKey = row.stepId || stepTitle;
    if (stepKey !== currentStepKey) {
      if (currentStepKey && lines.at(-1) !== "") lines.push("");
      lines.push(`## ${stepTitle}`, "");
      currentStepKey = stepKey;
    }
    const occurrenceLabel =
      row.occurrenceIndex == null ? "" : ` · ${row.occurrenceIndex}회차`;
    lines.push(
      `- [${row.sourceChecked === true ? "x" : " "}] ${row.title}${occurrenceLabel}`,
    );
    const description = row.description ?? row.detail;
    if (description) {
      const [firstLine, ...remainingLines] = description.split(/\r?\n/u);
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.detail}: ${firstLine}`);
      remainingLines.forEach((value) => lines.push(`    ${value}`));
    }
    if (row.completion) {
      lines.push(
        `  - ${TEXT_AUTHORING_CANONICAL_LABELS.completion}: ${row.completion}`,
      );
    }
    if (row.date) {
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.date}: ${row.date}`);
    }
    if (row.time) {
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.time}: ${row.time}`);
    }
    if (row.timezone) {
      lines.push(
        `  - ${TEXT_AUTHORING_CANONICAL_LABELS.timezone}: ${row.timezone}`,
      );
    }
    if (row.place) {
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.place}: ${row.place}`);
    }
    if (row.durationMinutes != null) {
      lines.push(
        `  - ${TEXT_AUTHORING_CANONICAL_LABELS.duration}: ${row.durationMinutes}분`,
      );
    }
    if (row.repeat) {
      lines.push(
        `  - ${TEXT_AUTHORING_CANONICAL_LABELS.repeat}: ${row.recurrenceSummary ?? row.repeat}`,
      );
    }
    if (row.condition) {
      lines.push(`  - 실행 조건: ${row.condition}`);
    }
    (row.subchecks ?? []).forEach((subcheck) => {
      lines.push(
        `  - [${subcheck.sourceChecked ? "x" : " "}] ${subcheck.title}`,
      );
    });
    const resources = resourceText(row, "markdown");
    if (resources) {
      lines.push(
        `  - ${TEXT_AUTHORING_CANONICAL_LABELS.resource}: ${resources}`,
      );
    }
    const sources = sourceText(row, "markdown");
    if (sources) {
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.source}: ${sources}`);
    }
    if (row.caution) {
      lines.push(
        `  - ${TEXT_AUTHORING_CANONICAL_LABELS.caution}: ${row.caution}`,
      );
    }
    (row.validations ?? []).forEach((validation) => {
      lines.push(`  - ${validation.label}`);
      if (validation.input) lines.push(`    - 입력값: ${validation.input}`);
      if (validation.expected) lines.push(`    - 형식: ${validation.expected}`);
    });
    lines.push("");
  });
  return lines.join("\n").trimEnd().concat("\n");
}
