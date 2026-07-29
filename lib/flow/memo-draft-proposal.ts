import type {
  FlowExperienceProjection,
  FlowExperienceProjectionRow,
  FlowExperienceShape,
  FlowExperienceShapeProjection,
} from './flow-experience-projection';

export type MemoDraftProposalItem = {
  id: string;
  title: string;
  detail?: string;
  date?: string;
  included: boolean;
};

export type MemoDraftProposalInput = {
  flowId?: string;
  title: string;
  items: MemoDraftProposalItem[];
};

const SHAPES: FlowExperienceShape[] = [
  'flow_execution',
  'calendar',
  'checklist',
  'sheet',
  'memo',
];

const SHAPE_LABELS: Record<FlowExperienceShape, string> = {
  flow_execution: 'Flow 실행',
  calendar: '캘린더',
  checklist: '체크리스트',
  sheet: '실행표',
  memo: '메모',
};

function normalizePlainDate(value?: string): string | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1])
    || date.getMonth() !== Number(match[2]) - 1
    || date.getDate() !== Number(match[3])
  ) return undefined;
  return value;
}

function getEligibleShapes(hasDate: boolean): FlowExperienceShape[] {
  return SHAPES.filter((shape) => shape !== 'calendar' || hasDate);
}

export function buildMemoDraftProposalProjection(
  input: MemoDraftProposalInput,
): FlowExperienceProjection {
  const rows = input.items.map((item, orderRank): FlowExperienceProjectionRow => {
    const date = normalizePlainDate(item.date);
    const detail = item.detail?.trim();
    return {
      id: item.id,
      sourceItemId: item.id,
      ownership: 'user_created',
      role: 'action',
      completable: true,
      title: item.title.trim(),
      ...(detail ? { description: detail, memo: detail } : {}),
      orderRank,
      included: item.included,
      completed: false,
      schedule: date
        ? { state: 'dated', date }
        : { state: 'unscheduled' },
      resources: [],
      eligibleShapes: getEligibleShapes(Boolean(date)),
    };
  });
  const outlineRows = rows.filter((row) => row.included && row.title.length > 0);
  const excludedRows = rows.filter((row) => !row.included || row.title.length === 0);
  const hasDatedRows = outlineRows.some((row) => row.schedule.state === 'dated');
  const primaryShape: FlowExperienceShape = 'checklist';
  const secondaryShapes: FlowExperienceShape[] = hasDatedRows
    ? ['calendar', 'memo']
    : ['memo', 'sheet'];

  const shapes = Object.fromEntries(SHAPES.map((shape) => {
    const shapeRows = outlineRows.filter((row) => row.eligibleShapes.includes(shape));
    const role = shape === primaryShape
      ? 'primary'
      : secondaryShapes.includes(shape)
        ? 'secondary'
        : shapeRows.length > 0
          ? 'available'
          : 'not_applicable';
    return [shape, {
      shape,
      label: SHAPE_LABELS[shape],
      role,
      rows: shapeRows,
      count: shapeRows.length,
    } satisfies FlowExperienceShapeProjection];
  })) as Record<FlowExperienceShape, FlowExperienceShapeProjection>;

  return {
    flowId: input.flowId ?? 'memo-draft-proposal',
    flowSlug: 'memo-draft-proposal',
    title: input.title.trim() || '내 메모 초안',
    primaryShape,
    secondaryShapes,
    outlineRows,
    excludedRows,
    shapes,
    sourceMutationCount: 0,
  };
}
