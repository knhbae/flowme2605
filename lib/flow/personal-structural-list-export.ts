import type {
  PersonalStructuralProjectionDestination,
  PersonalStructuralProjectionResult,
  PersonalStructuralProjectionRow,
} from './personal-structural-projection';

export type PersonalStructuralListExportStatus =
  | 'pending'
  | 'done'
  | 'reopened'
  | 'skipped'
  | 'held';

export type PersonalStructuralListExportRow = {
  itemId: string;
  title: string;
  date?: string;
  scheduleState: 'unscheduled' | 'all_day' | 'timed';
  time?: string;
  durationMinutes?: number;
  memo?: string;
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

function clean(value?: string): string {
  return (value ?? '').trim();
}

function compactLine(value?: string): string {
  return clean(value).replaceAll(/\s*\r?\n\s*/g, ' / ');
}

function escapeTsvCell(value?: string): string {
  return compactLine(value).replaceAll('\t', ' ');
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
      ...(row.personalMemo !== undefined
        ? { memo: compactLine(row.personalMemo) }
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
  const lines = [clean(options.flowTitle) || '내 Flow', `할 일 ${options.rows.length}개`, ''];

  options.rows.forEach((row) => {
    const checked = row.status === 'done' ? 'x' : ' ';
    const stateSuffix = row.status === 'skipped'
      ? ' (스킵)'
      : row.status === 'held'
        ? ' (보류)'
        : '';
    lines.push(`- [${checked}] ${row.title}${stateSuffix}`);
    lines.push(`  일정: ${scheduleLabel(row)}`);
    if (row.memo) lines.push(`  메모: ${row.memo}`);
  });

  const source = [clean(options.sourceLabel), clean(options.sourceUrl)]
    .filter(Boolean)
    .join(' ');
  if (source) lines.push('', `Flow 원문: ${source}`);
  return `${lines.join('\n').trim()}\n`;
}

function buildSheetTsv(rows: PersonalStructuralListExportRow[]): string {
  const header = ['순서', '상태', '할 일', '날짜', '시간', '예상 시간', '메모', '원문'];
  const body = rows.map((row, index) => [
    String(index + 1),
    statusLabel(row.status),
    row.title,
    row.date ?? '날짜 없음',
    row.date ? (row.scheduleState === 'all_day' ? '종일' : row.time) : '',
    row.scheduleState === 'timed' ? durationLabel(row.durationMinutes) : '',
    row.memo,
    row.sourceRef ?? '원문 없음',
  ].map(escapeTsvCell).join('\t'));
  return `${[header.join('\t'), ...body].join('\n')}\n`;
}

function buildMemoText(options: {
  flowTitle: string;
  rows: PersonalStructuralListExportRow[];
  sourceLabel?: string;
  sourceUrl?: string;
}): string {
  const lines = [clean(options.flowTitle) || '내 Flow', '', `할 일 ${options.rows.length}개`];

  options.rows.forEach((row, index) => {
    lines.push('', `${index + 1}. ${row.title}`, `   상태: ${statusLabel(row.status)}`);
    lines.push(`   일정: ${scheduleLabel(row)}`);
    if (row.memo) lines.push(`   메모: ${row.memo}`);
  });

  const source = [clean(options.sourceLabel), clean(options.sourceUrl)]
    .filter(Boolean)
    .join(' ');
  if (source) lines.push('', `Flow 원문: ${source}`);
  return `${lines.join('\n').trim()}\n`;
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
    .map((row) => ({ ...row }))
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
    sheetTsv: buildSheetTsv(sheetRows),
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
    sheetTsv: buildSheetTsv(sheetRows),
    memoText: buildMemoText({ ...options, rows: memoRows }),
  };
}
