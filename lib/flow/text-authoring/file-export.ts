import { foldIcsContentLine } from '../ics';
import type {
  AuthoringArtifactRow,
  AuthoringArtifactView,
} from './artifact-projection';
import { TEXT_AUTHORING_CANONICAL_LABELS } from './authoring-grammar';

export const AUTHORING_TABLE_COLUMNS = [
  'Step',
  '항목',
  '원문 체크',
  TEXT_AUTHORING_CANONICAL_LABELS.detail,
  '날짜',
  '시간',
  '시간대',
  '장소',
  '소요 시간(분)',
  '반복',
  '조건',
  '완료 기준',
  '원문 일정',
  '자료',
  '출처',
  '주의',
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
  if (view.artifact !== 'sheet' || !view.eligible) {
    return { columns: [], rows: [] };
  }
  const columns = view.sheetColumns ?? [];
  const rows = view.rows
    .filter((row) => !includedItemIds || includedItemIds.has(row.itemId))
    .map((row) => columns.map((column) => row.sheetCells?.[column.key] ?? ''));
  return {
    columns: columns.map((column) => column.label),
    rows,
  };
}

function escapeIcsText(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(/\r?\n/gu, '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function compactDate(value: string): string {
  return value.replaceAll('-', '');
}

function addCalendarDay(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

function icsTimestamp(value: string): string {
  return new Date(value)
    .toISOString()
    .replaceAll('-', '')
    .replaceAll(':', '')
    .replace(/\.\d{3}Z$/u, 'Z');
}

function icsDescription(row: AuthoringArtifactRow): string {
  const resources = resourceText(row, 'plain_text');
  const sources = sourceText(row, 'plain_text');
  return [
    row.stepTitle ? `Step: ${row.stepTitle}` : '',
    row.sourceChecked === undefined
      ? ''
      : `원문 체크: ${row.sourceChecked ? '완료' : '미완료'}`,
    row.detail ? `${TEXT_AUTHORING_CANONICAL_LABELS.detail}: ${row.detail}` : '',
    row.completion ? `완료 기준: ${row.completion}` : '',
    row.place ? `장소: ${row.place}` : '',
    row.repeat ? `반복: ${row.repeat}` : '',
    row.condition ? `조건: ${row.condition}` : '',
    row.sourceExpression ? `원문 일정: ${row.sourceExpression}` : '',
    resources ? `자료: ${resources}` : '',
    sources ? `출처: ${sources}` : '',
    row.caution ? `주의: ${row.caution}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function serializeAuthoringIcs(
  title: string,
  rows: AuthoringArtifactRow[],
  now = new Date().toISOString(),
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlowMe//Text Authoring//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(title)}`,
  ];

  const calendarRows = rows
    .map((row, sourceIndex) => ({ row, sourceIndex }))
    .filter(({ row }) => Boolean(row.date))
    .sort((left, right) => (
      (left.row.date ?? '').localeCompare(right.row.date ?? '')
      || left.row.order - right.row.order
      || left.sourceIndex - right.sourceIndex
    ));
  for (const { row } of calendarRows) {
    const date = compactDate(row.date as string);
    const time = row.time?.match(/^([01]\d|2[0-3]):([0-5]\d)$/u);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(row.itemId)}@flowme.local`,
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
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldIcsContentLine).join('\r\n').concat('\r\n');
}

function linkText(
  links: AuthoringArtifactRow['resources'],
  format: 'plain_text' | 'markdown' | 'table',
): string {
  return links
    .map((resource) => {
      const label = resource.label.trim() || resource.url;
      if (!resource.url) return label;
      if (format === 'markdown') return `[${label}](${resource.url})`;
      return `${label}: ${resource.url}`;
    })
    .join(format === 'table' ? '\n' : ', ');
}

function resourceText(
  row: AuthoringArtifactRow,
  format: 'plain_text' | 'markdown' | 'table',
): string {
  return linkText(row.resources, format);
}

function sourceText(
  row: AuthoringArtifactRow,
  format: 'plain_text' | 'markdown' | 'table',
): string {
  return linkText(row.sources ?? [], format);
}

export function buildAuthoringTableRows(
  rows: AuthoringArtifactRow[],
): Array<Array<string | number>> {
  return rows.map((row) => [
    row.stepTitle ?? '',
    row.title,
    row.sourceChecked === undefined
      ? ''
      : row.sourceChecked
        ? '완료'
        : '미완료',
    row.detail ?? '',
    row.date ?? '',
    row.time ?? '',
    row.timezone ?? '',
    row.place ?? '',
    row.durationMinutes ?? '',
    row.repeat ?? '',
    row.condition ?? '',
    row.completion ?? '',
    row.sourceExpression ?? '',
    resourceText(row, 'table'),
    sourceText(row, 'table'),
    row.caution ?? '',
  ]);
}

export function serializeAuthoringPlainText(
  title: string,
  rows: AuthoringArtifactRow[],
): string {
  const blocks = rows.map((row, index) => {
    const lines = [`항목 ${index + 1}: ${row.title}`];
    if (row.stepTitle) lines.push(`Step: ${row.stepTitle}`);
    if (row.sourceChecked !== undefined) {
      lines.push(`원문 체크: ${row.sourceChecked ? '완료' : '미완료'}`);
    }
    if (row.detail) {
      lines.push(`${TEXT_AUTHORING_CANONICAL_LABELS.detail}: ${row.detail}`);
    }
    if (row.completion) lines.push(`완료 기준: ${row.completion}`);
    if (row.date) lines.push(`날짜: ${row.date}`);
    if (row.time) lines.push(`시간: ${row.time}`);
    if (row.timezone) lines.push(`시간대: ${row.timezone}`);
    if (row.place) lines.push(`장소: ${row.place}`);
    if (row.durationMinutes != null) {
      lines.push(`소요 시간: ${row.durationMinutes}분`);
    }
    if (row.repeat) lines.push(`반복: ${row.repeat}`);
    if (row.condition) lines.push(`조건: ${row.condition}`);
    if (row.sourceExpression) {
      lines.push(`원문 일정: ${row.sourceExpression}`);
    }
    const resources = resourceText(row, 'plain_text');
    if (resources) lines.push(`자료: ${resources}`);
    const sources = sourceText(row, 'plain_text');
    if (sources) lines.push(`출처: ${sources}`);
    if (row.caution) lines.push(`주의: ${row.caution}`);
    return lines.join('\n');
  });

  return [`제목: ${title}`, ...blocks].join('\n\n').concat('\n');
}

export function serializeAuthoringMarkdown(
  title: string,
  rows: AuthoringArtifactRow[],
): string {
  const lines = [`# ${title}`, ''];
  let currentStepKey = '';
  rows.forEach((row) => {
    const stepTitle = row.stepTitle?.trim() || '할 일';
    const stepKey = row.stepId || stepTitle;
    if (stepKey !== currentStepKey) {
      if (currentStepKey && lines.at(-1) !== '') lines.push('');
      lines.push(`## ${stepTitle}`, '');
      currentStepKey = stepKey;
    }
    lines.push(`- [${row.sourceChecked === true ? 'x' : ' '}] ${row.title}`);
    if (row.detail) {
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.detail}: ${row.detail}`);
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
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.repeat}: ${row.repeat}`);
    }
    if (row.condition) {
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.condition}: ${row.condition}`);
    }
    if (row.sourceExpression) {
      lines.push(
        `  - ${TEXT_AUTHORING_CANONICAL_LABELS.guide}: 원문 일정 · ${row.sourceExpression}`,
      );
    }
    const resources = resourceText(row, 'markdown');
    if (resources) {
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.resource}: ${resources}`);
    }
    const sources = sourceText(row, 'markdown');
    if (sources) {
      lines.push(`  - ${TEXT_AUTHORING_CANONICAL_LABELS.source}: ${sources}`);
    }
    if (row.caution) {
      lines.push(
        `  - ${TEXT_AUTHORING_CANONICAL_LABELS.caution}: ${row.caution}`,
      );
    }
    lines.push('');
  });
  return lines.join('\n').trimEnd().concat('\n');
}
