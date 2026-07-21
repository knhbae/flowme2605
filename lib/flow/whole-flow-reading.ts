import type { StructureType } from './types';

export type WholeFlowReadingMode = 'timeline' | 'phase' | 'routine' | 'checklist';

export type WholeFlowReadingRow = {
  id: string;
  section?: string;
  date?: string;
  completed?: boolean;
};

export type WholeFlowReadingDateCluster<Row extends WholeFlowReadingRow> = {
  key: string;
  date?: string;
  rows: Row[];
  showSharedDate: boolean;
};

export type WholeFlowReadingGroup<Row extends WholeFlowReadingRow> = {
  key: string;
  label: string;
  rows: Row[];
  dateClusters: WholeFlowReadingDateCluster<Row>[];
  completedCount: number;
  totalCount: number;
  startDate?: string;
  endDate?: string;
  defaultOpen: boolean;
};

export type WholeFlowReadingModel<Row extends WholeFlowReadingRow> = {
  mode: WholeFlowReadingMode;
  rows: Row[];
  groups: WholeFlowReadingGroup<Row>[];
  completedCount: number;
  totalCount: number;
  startDate?: string;
  endDate?: string;
  nextRowId?: string;
  disclosureRequired: boolean;
};

const LONG_FLOW_DISCLOSURE_THRESHOLD = 10;

function isPlainDate(value?: string): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
function getFallbackGroupLabel(mode: WholeFlowReadingMode): string {
  if (mode === 'timeline') return '일정';
  if (mode === 'phase') return '단계';
  if (mode === 'routine') return '루틴 구성';
  return '체크할 일';
}

function buildDateClusters<Row extends WholeFlowReadingRow>(rows: Row[]): WholeFlowReadingDateCluster<Row>[] {
  const clusters: WholeFlowReadingDateCluster<Row>[] = [];
  rows.forEach((row, index) => {
    const date = isPlainDate(row.date) ? row.date : undefined;
    const previous = clusters[clusters.length - 1];
    if (date && previous?.date === date) {
      previous.rows.push(row);
      previous.showSharedDate = previous.rows.length > 1;
      return;
    }
    clusters.push({
      key: date ? `date:${date}:${index}` : `row:${row.id}:${index}`,
      ...(date ? { date } : {}),
      rows: [row],
      showSharedDate: false,
    });
  });
  return clusters;
}

export function buildWholeFlowReadingModel<Row extends WholeFlowReadingRow>(input: {
  structureType: StructureType;
  rows: Row[];
}): WholeFlowReadingModel<Row> {
  const rows = input.rows.slice();
  const grouped: Array<{ label: string; rows: Row[] }> = [];
  const fallbackLabel = getFallbackGroupLabel(input.structureType);

  rows.forEach((row) => {
    const label = row.section?.trim() || fallbackLabel;
    const previous = grouped[grouped.length - 1];
    if (previous?.label === label) {
      previous.rows.push(row);
      return;
    }
    grouped.push({ label, rows: [row] });
  });

  const validDates = rows.map((row) => row.date).filter(isPlainDate).sort();
  const nextRowId = rows.find((row) => !row.completed)?.id;
  const disclosureRequired = rows.length > LONG_FLOW_DISCLOSURE_THRESHOLD && grouped.length > 1;
  let defaultGroupAssigned = false;

  const groups = grouped.map((group, index) => {
    const groupDates = group.rows.map((row) => row.date).filter(isPlainDate).sort();
    const containsNextRow = Boolean(nextRowId && group.rows.some((row) => row.id === nextRowId));
    const defaultOpen = !disclosureRequired || (!defaultGroupAssigned && (containsNextRow || index === 0));
    if (defaultOpen && disclosureRequired) defaultGroupAssigned = true;
    return {
      key: `group:${index}:${group.label}`,
      label: group.label,
      rows: group.rows,
      dateClusters: buildDateClusters(group.rows),
      completedCount: group.rows.filter((row) => row.completed).length,
      totalCount: group.rows.length,
      ...(groupDates[0] ? { startDate: groupDates[0] } : {}),
      ...(groupDates[groupDates.length - 1] ? { endDate: groupDates[groupDates.length - 1] } : {}),
      defaultOpen,
    };
  });

  return {
    mode: input.structureType,
    rows,
    groups,
    completedCount: rows.filter((row) => row.completed).length,
    totalCount: rows.length,
    ...(validDates[0] ? { startDate: validDates[0] } : {}),
    ...(validDates[validDates.length - 1] ? { endDate: validDates[validDates.length - 1] } : {}),
    ...(nextRowId ? { nextRowId } : {}),
    disclosureRequired,
  };
}
