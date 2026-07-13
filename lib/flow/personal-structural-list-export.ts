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
    if (row.date) lines.push(`  일정: ${row.date}`);
    if (row.memo) lines.push(`  메모: ${row.memo}`);
  });

  const source = [clean(options.sourceLabel), clean(options.sourceUrl)]
    .filter(Boolean)
    .join(' ');
  if (source) lines.push('', `Flow 원문: ${source}`);
  return `${lines.join('\n').trim()}\n`;
}

function buildSheetTsv(rows: PersonalStructuralListExportRow[]): string {
  const header = ['순서', '상태', '할 일', '날짜', '메모', '원문'];
  const body = rows.map((row, index) => [
    String(index + 1),
    statusLabel(row.status),
    row.title,
    row.date ?? '날짜 없음',
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
    if (row.date) lines.push(`   일정: ${row.date}`);
    if (row.memo) lines.push(`   메모: ${row.memo}`);
  });

  const source = [clean(options.sourceLabel), clean(options.sourceUrl)]
    .filter(Boolean)
    .join(' ');
  if (source) lines.push('', `Flow 원문: ${source}`);
  return `${lines.join('\n').trim()}\n`;
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
