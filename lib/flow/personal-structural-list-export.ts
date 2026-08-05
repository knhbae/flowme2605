import type {
  PersonalStructuralProjectionDestination,
  PersonalStructuralProjectionResult,
  PersonalStructuralProjectionRow,
} from './personal-structural-projection';
import { normalizeCompletionCriterion } from './completion-criterion';
import {
  encodeEffectiveFlowArtifactResources,
  encodeEffectiveFlowLabeledMemo,
  encodeEffectiveFlowTsv,
  type EffectiveFlowLabeledField,
} from './effective-flow-artifact-codec';
import type {
  PersonalStructuralRecurrenceRule,
  PersonalStructuralRepeat,
  PersonalStructuralWeekday,
} from './personal-structural-recurrence';

export type PersonalStructuralListExportStatus =
  | 'pending'
  | 'done'
  | 'reopened'
  | 'skipped'
  | 'held';

export type PersonalStructuralListExportResource = {
  label?: string;
  url: string;
};

export type PersonalStructuralListExportRow = {
  itemId: string;
  title: string;
  date?: string;
  scheduleState: 'unscheduled' | 'all_day' | 'timed';
  time?: string;
  durationMinutes?: number;
  timeZone?: string;
  repeatLabel?: string;
  description?: string;
  memo?: string;
  executionMemo?: string;
  completionCriteria?: string;
  itemWarning?: string;
  flowWarning?: string;
  resources?: PersonalStructuralListExportResource[];
  status: PersonalStructuralListExportStatus;
  personalOrderRank: number;
  sourceRef?: string;
};

export type PersonalStructuralListExportArtifacts = {
  checklistRows: PersonalStructuralListExportRow[];
  sheetRows: PersonalStructuralListExportRow[];
  memoRows: PersonalStructuralListExportRow[];
  checklistText: string;
  sheetTsv: string;
  memoText: string;
};

export type PersonalStructuralListExportRowsInput = {
  flowTitle: string;
  rows: PersonalStructuralListExportRow[];
  sourceLabel?: string;
  sourceUrl?: string;
};

export const PERSONAL_STRUCTURAL_SHEET_HEADERS = [
  '순서',
  '상태',
  '할 일',
  '날짜',
  '시간',
  '예상 시간',
  '시간대',
  '반복',
  '메모',
  '원문',
  '설명',
  '완료 기준',
  '실행 메모',
  '항목 주의',
  '계획 주의',
  '자료',
  '계획 원문 이름',
  '계획 원문 URL',
] as const;

function clean(value?: string): string {
  return (value ?? '').trim();
}

function compactLine(value?: string): string {
  return clean(value).replaceAll(/\s*\r?\n\s*/g, ' / ');
}

function appendChecklistMultiline(
  lines: string[],
  label: string,
  value?: string,
): void {
  const normalized = (value ?? '')
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim();
  if (!normalized) return;
  const [first, ...rest] = normalized.split('\n');
  lines.push(`  ${label}: ${first}`);
  rest.forEach((line) => lines.push(`    ${line}`));
}

function normalizedResources(
  resources?: PersonalStructuralListExportResource[],
): PersonalStructuralListExportResource[] {
  const seen = new Set<string>();
  return (resources ?? []).flatMap((resource) => {
    const label = resource.label;
    const url = resource.url;
    if (!url.trim()) return [];
    const key = `${label ?? ''}\u0000${url}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ ...(label !== undefined ? { label } : {}), url }];
  });
}

function statusLabel(status: PersonalStructuralListExportStatus): string {
  if (status === 'done') return '완료';
  if (status === 'skipped') return '스킵';
  if (status === 'held') return '보류';
  return '미완료';
}

function durationLabel(durationMinutes?: number): string {
  if (!durationMinutes) return '';
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  if (!hours) return `${minutes}분`;
  if (!minutes) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

const PERSONAL_STRUCTURAL_WEEKDAY_LABELS: Record<
  PersonalStructuralWeekday,
  string
> = {
  MO: '월',
  TU: '화',
  WE: '수',
  TH: '목',
  FR: '금',
  SA: '토',
  SU: '일',
};

function latestPersonalStructuralRecurrenceRule(
  repeat: PersonalStructuralRepeat,
): PersonalStructuralRecurrenceRule | undefined {
  if (!('schemaVersion' in repeat)) return repeat;
  return [...repeat.revisions]
    .sort((left, right) =>
      left.effectiveFrom.localeCompare(right.effectiveFrom) ||
      left.revision - right.revision,
    )
    .at(-1)?.rule;
}

export function formatPersonalStructuralRepeatLabel(
  repeat?: PersonalStructuralRepeat,
): string {
  if (!repeat) return '';
  const rule = latestPersonalStructuralRecurrenceRule(repeat);
  const seriesStatus = 'schemaVersion' in repeat && repeat.status === 'paused'
    ? '일시 중지'
    : 'schemaVersion' in repeat && repeat.status === 'ended'
      ? '종료'
      : '';
  if (!rule) return seriesStatus ? `반복 · ${seriesStatus}` : '';

  const interval = Math.max(1, Math.trunc(rule.interval));
  const cadence = rule.frequency === 'daily'
    ? interval === 1 ? '매일' : `${interval}일마다`
    : rule.frequency === 'weekly'
      ? interval === 1 ? '매주' : `${interval}주마다`
      : interval === 1 ? '매월' : `${interval}개월마다`;
  const weeklyDays = rule.frequency === 'weekly' && rule.weekdays?.length
    ? rule.weekdays
        .map((weekday) => PERSONAL_STRUCTURAL_WEEKDAY_LABELS[weekday])
        .join('·')
    : '';
  const monthlyDay = rule.frequency === 'monthly' && rule.dayOfMonth
    ? `${rule.dayOfMonth}일`
    : '';
  const end = rule.end?.mode === 'until'
    ? `${rule.end.date}까지`
    : rule.end?.mode === 'count'
      ? `${rule.end.count}회`
      : '';
  return [cadence, weeklyDays || monthlyDay, end, seriesStatus]
    .filter(Boolean)
    .join(' · ');
}

function scheduleLabel(row: PersonalStructuralListExportRow): string {
  if (!row.date) return '날짜 없음';
  if (row.scheduleState === 'all_day') return `${row.date} 종일`;
  return [
    row.date,
    row.time,
    row.durationMinutes ? `예상 ${durationLabel(row.durationMinutes)}` : '',
  ].filter(Boolean).join(' · ');
}

function rowStatus<TSource>(
  row: PersonalStructuralProjectionRow<TSource>,
): PersonalStructuralListExportStatus {
  return row.executionState?.state ?? 'pending';
}

function dedupeRows<TSource>(
  rows: PersonalStructuralProjectionRow<TSource>[],
): PersonalStructuralProjectionRow<TSource>[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (!row.itemId || seen.has(row.itemId)) return false;
    seen.add(row.itemId);
    return true;
  });
}

function toListRows<TSource>(options: {
  projection: PersonalStructuralProjectionResult<TSource>;
  destination: Extract<PersonalStructuralProjectionDestination, 'checklist' | 'sheet' | 'memo'>;
  sourceLabel?: string;
  sourceUrl?: string;
}): PersonalStructuralListExportRow[] {
  const sourceRef = [clean(options.sourceLabel), clean(options.sourceUrl)]
    .filter(Boolean)
    .join(' ');

  return dedupeRows(options.projection.rowsByDestination[options.destination]).map(
    (row) => ({
      itemId: row.itemId,
      title: compactLine(row.title) || '할 일',
      ...(row.calendarDate ? { date: row.calendarDate } : {}),
      scheduleState: row.scheduleProjection.scheduleState,
      ...(row.scheduleProjection.startTime
        ? { time: row.scheduleProjection.startTime }
        : {}),
      ...(row.scheduleProjection.durationMinutes
        ? { durationMinutes: row.scheduleProjection.durationMinutes }
        : {}),
      ...(row.scheduleProjection.timeZone
        ? { timeZone: row.scheduleProjection.timeZone }
        : {}),
      ...(row.schedule?.mode === 'fixed_date' && row.schedule.repeat
        ? { repeatLabel: formatPersonalStructuralRepeatLabel(row.schedule.repeat) }
        : {}),
      ...(row.personalMemo !== undefined
        ? { memo: row.personalMemo }
        : {}),
      status: rowStatus(row),
      personalOrderRank: row.personalOrderRank,
      ...(row.ownership === 'source' && sourceRef ? { sourceRef } : {}),
    }),
  );
}

function buildChecklistText(options: {
  flowTitle: string;
  rows: PersonalStructuralListExportRow[];
  sourceLabel?: string;
  sourceUrl?: string;
}): string {
  const lines = [clean(options.flowTitle) || '내 계획', `할 일 ${options.rows.length}개`, ''];

  options.rows.forEach((row) => {
    const checked = row.status === 'done' ? 'x' : ' ';
    const stateSuffix = row.status === 'skipped'
      ? ' (스킵)'
      : row.status === 'held'
        ? ' (보류)'
        : '';
    lines.push(`- [${checked}] ${row.title}${stateSuffix}`);
    lines.push(`  일정: ${scheduleLabel(row)}`);
    appendChecklistMultiline(lines, '시간대', row.timeZone);
    appendChecklistMultiline(lines, '반복', row.repeatLabel);
    appendChecklistMultiline(lines, '설명', row.description);
    const criterion = normalizeCompletionCriterion(row.completionCriteria);
    if (criterion) {
      appendChecklistMultiline(lines, '완료 기준', criterion);
    }
    appendChecklistMultiline(lines, '개인 메모', row.memo);
    appendChecklistMultiline(lines, '실행 메모', row.executionMemo);
    appendChecklistMultiline(lines, '주의', row.itemWarning);
    appendChecklistMultiline(lines, '계획 주의', row.flowWarning);
    normalizedResources(row.resources).forEach((resource) => {
      lines.push(`  자료: ${[resource.label, resource.url].filter(Boolean).join(' - ')}`);
    });
  });

  const source = [clean(options.sourceLabel), clean(options.sourceUrl)]
    .filter(Boolean)
    .join(' ');
  if (source) lines.push('', `계획 원문: ${source}`);
  return `${lines.join('\n').trim()}\n`;
}

function buildSheetTsv(options: {
  rows: PersonalStructuralListExportRow[];
  sourceLabel?: string;
  sourceUrl?: string;
}): string {
  const body = options.rows.map((row, index) => [
    String(index + 1),
    statusLabel(row.status),
    row.title,
    row.date ?? '날짜 없음',
    row.date ? (row.scheduleState === 'all_day' ? '종일' : row.time ?? '') : '',
    row.scheduleState === 'timed' ? durationLabel(row.durationMinutes) : '',
    row.timeZone ?? '',
    row.repeatLabel ?? '',
    row.memo ?? '',
    row.sourceRef ?? '',
    row.description ?? '',
    row.completionCriteria ?? '',
    row.executionMemo ?? '',
    row.itemWarning ?? '',
    row.flowWarning ?? '',
    encodeEffectiveFlowArtifactResources(normalizedResources(row.resources)),
    options.sourceLabel ?? '',
    options.sourceUrl ?? '',
  ]);
  return encodeEffectiveFlowTsv([PERSONAL_STRUCTURAL_SHEET_HEADERS, ...body]);
}

function buildMemoText(options: {
  flowTitle: string;
  rows: PersonalStructuralListExportRow[];
  sourceLabel?: string;
  sourceUrl?: string;
}): string {
  const field = (
    label: string,
    value: string | undefined,
  ): EffectiveFlowLabeledField[] => (
    value !== undefined && value.length > 0 ? [{ label, value }] : []
  );

  return encodeEffectiveFlowLabeledMemo({
    title: clean(options.flowTitle) || '내 계획',
    summary: `할 일 ${options.rows.length}개`,
    records: options.rows.map((row, index) => ({
      order: index + 1,
      title: row.title,
      fields: [
        { label: '상태', value: statusLabel(row.status) },
        { label: '일정', value: scheduleLabel(row) },
        ...field('시간대', row.timeZone),
        ...field('반복', row.repeatLabel),
        ...field('설명', row.description),
        ...field('완료 기준', row.completionCriteria),
        ...field('개인 메모', row.memo),
        ...field('실행 메모', row.executionMemo),
        ...field('주의', row.itemWarning),
        ...field('계획 주의', row.flowWarning),
        ...normalizedResources(row.resources).flatMap((resource, resourceIndex) => [
          ...field(`자료 ${resourceIndex + 1} 이름`, resource.label),
          { label: `자료 ${resourceIndex + 1} URL`, value: resource.url },
        ]),
        ...field('원문', row.sourceRef),
      ],
    })),
    footerFields: [
      ...field('계획 원문 이름', options.sourceLabel),
      ...field('계획 원문 URL', options.sourceUrl),
    ],
  });
}

function normalizeListExportRows(
  rows: PersonalStructuralListExportRow[],
): PersonalStructuralListExportRow[] {
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (!row.itemId || seen.has(row.itemId)) return false;
      seen.add(row.itemId);
      return true;
    })
    .map((row) => {
      const completionCriteria = normalizeCompletionCriterion(row.completionCriteria);
      return {
        ...row,
        completionCriteria,
        resources: normalizedResources(row.resources),
      };
    })
    .sort((left, right) => left.personalOrderRank - right.personalOrderRank);
}

export function buildPersonalStructuralListExportArtifactsFromRows(
  options: PersonalStructuralListExportRowsInput,
): PersonalStructuralListExportArtifacts {
  const rows = normalizeListExportRows(options.rows);
  const checklistRows = rows.map((row) => ({ ...row }));
  const sheetRows = rows.map((row) => ({ ...row }));
  const memoRows = rows.map((row) => ({ ...row }));
  return {
    checklistRows,
    sheetRows,
    memoRows,
    checklistText: buildChecklistText({ ...options, rows: checklistRows }),
    sheetTsv: buildSheetTsv({ ...options, rows: sheetRows }),
    memoText: buildMemoText({ ...options, rows: memoRows }),
  };
}

export function buildPersonalStructuralListExportArtifacts<TSource>(options: {
  flowTitle: string;
  projection: PersonalStructuralProjectionResult<TSource>;
  sourceLabel?: string;
  sourceUrl?: string;
}): PersonalStructuralListExportArtifacts {
  const checklistRows = toListRows({ ...options, destination: 'checklist' });
  const sheetRows = toListRows({ ...options, destination: 'sheet' });
  const memoRows = toListRows({ ...options, destination: 'memo' });

  return {
    checklistRows,
    sheetRows,
    memoRows,
    checklistText: buildChecklistText({ ...options, rows: checklistRows }),
    sheetTsv: buildSheetTsv({ ...options, rows: sheetRows }),
    memoText: buildMemoText({ ...options, rows: memoRows }),
  };
}
