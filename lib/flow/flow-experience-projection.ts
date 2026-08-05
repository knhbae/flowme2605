import { getArtifactPlan, type ArtifactSurfaceKind, type PrimaryArtifactSurface } from './artifact-plan';
import { normalizeCompletionCriterion } from './completion-criterion';
import { addDays, formatLocalDate } from './date';
import { splitExecutionDetailContent } from './execution-detail-content';
import { isFlowItemPersonallyExcluded } from './flow-item-state';
import type { FlowBundle, FlowItem, FlowItemRole, FlowItemState } from './types';

export type FlowExperienceShape = 'flow_execution' | 'calendar' | 'checklist' | 'sheet' | 'memo';

export type FlowExperienceItemOverride = {
  title?: string;
  date?: string | null;
  memo?: string;
};

export type FlowExperienceProjectionOptions = {
  anchor?: string;
  itemStates?: Record<string, FlowItemState>;
  itemOverrides?: Record<string, FlowExperienceItemOverride>;
  orderOverride?: string[];
  excludedItemIds?: string[];
  userCreatedItemIds?: string[];
  completedItemIds?: string[];
};

export type FlowExperienceProjectionRow = {
  id: string;
  sourceItemId: string;
  ownership: 'source' | 'user_created';
  role: FlowItemRole;
  completable: boolean;
  title: string;
  description?: string;
  memo?: string;
  completionCriterion?: string;
  section?: string;
  orderRank: number;
  included: boolean;
  completed: boolean;
  schedule: {
    state: 'unscheduled' | 'dated' | 'recurring';
    date?: string;
    repeatRule?: string;
  };
  resources: Array<{ label: string; url: string; type: string }>;
  caution?: string;
  eligibleShapes: FlowExperienceShape[];
};

export type FlowExperienceShapeProjection = {
  shape: FlowExperienceShape;
  label: string;
  role: 'primary' | 'secondary' | 'available' | 'not_applicable';
  rows: FlowExperienceProjectionRow[];
  count: number;
};

export type FlowExperienceProjection = {
  flowId: string;
  flowSlug: string;
  title: string;
  primaryShape: FlowExperienceShape;
  secondaryShapes: FlowExperienceShape[];
  outlineRows: FlowExperienceProjectionRow[];
  excludedRows: FlowExperienceProjectionRow[];
  shapes: Record<FlowExperienceShape, FlowExperienceShapeProjection>;
  sourceMutationCount: 0;
};

const SHAPE_ORDER: FlowExperienceShape[] = ['flow_execution', 'calendar', 'checklist', 'sheet', 'memo'];

const SHAPE_LABELS: Record<FlowExperienceShape, string> = {
  flow_execution: 'Flow 실행',
  calendar: '캘린더',
  checklist: '체크리스트',
  sheet: '실행표',
  memo: '메모',
};

const NON_COMPLETABLE_ROLES = new Set<FlowItemRole>(['record', 'resource', 'reference', 'warning']);

function parsePlainDate(value?: string): Date | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) return undefined;
  return date;
}

function resolveItemDate(item: FlowItem, anchor?: string, override?: FlowExperienceItemOverride): string | undefined {
  if (override && Object.prototype.hasOwnProperty.call(override, 'date')) {
    return override.date && parsePlainDate(override.date) ? override.date : undefined;
  }
  const anchorDate = parsePlainDate(anchor);
  if (!anchorDate || item.day_offset === undefined) return undefined;
  return formatLocalDate(addDays(anchorDate, item.day_offset));
}

function inferLegacyRole(item: FlowItem, bundle: FlowBundle): FlowItemRole {
  if (item.role) return item.role;
  const detail = bundle.itemDetails?.find((entry) => entry.item_id === item.id);
  const split = splitExecutionDetailContent(detail);
  const title = `${item.title} ${item.description ?? ''}`;

  if (item.status === 'hold' || item.hold_eligible) return 'decision';
  if (/주의|중단|금지|위험/u.test(title) && detail?.caution && !detail.completion_criteria) return 'warning';
  if (split.resources.length > 0 && split.checklistItems.length === 0 && !detail?.completion_criteria && /영상|링크|자료|공식 안내|원문/u.test(title)) {
    return 'resource';
  }
  if (/기록|로그|측정값|결과 남기/u.test(title) && bundle.flow.primary_destination === 'sheet') return 'record';
  if (item.status === 'check' || /확인|점검/u.test(item.title)) return 'confirmation';
  return 'action';
}

function getEligibleShapes(role: FlowItemRole, hasDate: boolean): FlowExperienceShape[] {
  const shapes: FlowExperienceShape[] = ['flow_execution', 'memo'];
  if (!NON_COMPLETABLE_ROLES.has(role)) shapes.push('checklist');
  if (!['resource', 'reference', 'warning'].includes(role)) shapes.push('sheet');
  if (hasDate && !['record', 'resource', 'reference', 'warning'].includes(role)) shapes.push('calendar');
  return SHAPE_ORDER.filter((shape) => shapes.includes(shape));
}

function primarySurfaceToShape(surface: PrimaryArtifactSurface): FlowExperienceShape {
  if (surface === 'timeline_calendar') return 'calendar';
  if (surface === 'routine_calendar' || surface === 'step_progress') return 'flow_execution';
  if (surface === 'spreadsheet_log' || surface === 'meal_reaction_log' || surface === 'decision_table') return 'sheet';
  if (surface === 'memo_card') return 'memo';
  return 'checklist';
}

function getPrimaryShape(bundle: FlowBundle, fallback: PrimaryArtifactSurface): FlowExperienceShape {
  if (bundle.flow.structure_type === 'routine') {
    if (bundle.flow.primary_destination === 'sheet') return 'sheet';
    if (bundle.flow.primary_destination === 'memo') return 'memo';
    return 'flow_execution';
  }
  if (bundle.flow.primary_destination === 'calendar') return 'calendar';
  if (bundle.flow.primary_destination === 'sheet') return 'sheet';
  if (bundle.flow.primary_destination === 'memo') return 'memo';
  if (bundle.flow.primary_destination === 'internal_check') return 'checklist';
  return primarySurfaceToShape(fallback);
}

function artifactSurfaceToShape(surface: ArtifactSurfaceKind): FlowExperienceShape {
  if (surface === 'month_calendar' || surface === 'routine_month' || surface === 'meal_calendar') return 'calendar';
  if (surface === 'spreadsheet_preview' || surface === 'comparison_table' || surface === 'reaction_log') return 'sheet';
  if (surface === 'memo_card') return 'memo';
  return 'checklist';
}

function getOrderRank(item: FlowItem, orderOverride: string[]): number {
  const overrideIndex = orderOverride.indexOf(item.id);
  return overrideIndex >= 0 ? overrideIndex : orderOverride.length + item.order;
}

function getProjectionItems(bundle: FlowBundle): FlowItem[] {
  if (bundle.flow.content_type !== 'meal_plan' || bundle.items.length > 0) {
    return bundle.items;
  }

  return (bundle.mealSlots ?? []).map((slot) => ({
    id: slot.id,
    flow_id: slot.flow_id,
    ...(slot.section_id ? { section_id: slot.section_id } : {}),
    title: slot.menu_title,
    description: slot.new_ingredients.length > 0
      ? `새 재료: ${slot.new_ingredients.join(', ')}`
      : undefined,
    type: 'calendar',
    day_offset: slot.day_offset,
    duration_days: slot.duration_days,
    role: 'action',
    order: slot.order,
  }));
}

export function buildFlowExperienceProjection(
  bundle: FlowBundle,
  options: FlowExperienceProjectionOptions = {},
): FlowExperienceProjection {
  const itemStates = options.itemStates ?? {};
  const itemOverrides = options.itemOverrides ?? {};
  const orderOverride = Array.from(new Set(options.orderOverride ?? []));
  const explicitlyExcluded = new Set(options.excludedItemIds ?? []);
  const userCreated = new Set(options.userCreatedItemIds ?? []);
  const completed = new Set(options.completedItemIds ?? []);
  const sections = new Map(bundle.sections.map((section) => [section.id, section.title]));

  const rows = getProjectionItems(bundle)
    .map((item): FlowExperienceProjectionRow => {
      const detail = bundle.itemDetails?.find((entry) => entry.item_id === item.id);
      const override = itemOverrides[item.id];
      const date = resolveItemDate(item, options.anchor, override);
      const role = inferLegacyRole(item, bundle);
      const included = !explicitlyExcluded.has(item.id) && !isFlowItemPersonallyExcluded(itemStates[item.id]);
      const resources = splitExecutionDetailContent(detail).resources.map((resource) => ({ ...resource }));
      const scheduleState = date ? (item.repeat_rule ? 'recurring' : 'dated') : 'unscheduled';
      const completionCriterion = normalizeCompletionCriterion(detail?.completion_criteria);

      return {
        id: item.id,
        sourceItemId: item.id,
        ownership: userCreated.has(item.id) ? 'user_created' : 'source',
        role,
        completable: !NON_COMPLETABLE_ROLES.has(role),
        title: override?.title?.trim() || item.title,
        ...(item.description ? { description: item.description } : {}),
        ...(override?.memo?.trim() ? { memo: override.memo.trim() } : {}),
        ...(completionCriterion ? { completionCriterion } : {}),
        ...(item.section_id && sections.get(item.section_id) ? { section: sections.get(item.section_id) } : {}),
        orderRank: getOrderRank(item, orderOverride),
        included,
        completed: completed.has(item.id),
        schedule: {
          state: scheduleState,
          ...(date ? { date } : {}),
          ...(item.repeat_rule ? { repeatRule: item.repeat_rule } : {}),
        },
        resources,
        ...(detail?.caution ? { caution: detail.caution } : {}),
        eligibleShapes: getEligibleShapes(role, Boolean(date)),
      };
    })
    .sort((left, right) => left.orderRank - right.orderRank || left.id.localeCompare(right.id));

  const outlineRows = rows.filter((row) => row.included);
  const excludedRows = rows.filter((row) => !row.included);
  const plan = getArtifactPlan(bundle);
  const primaryShape = getPrimaryShape(bundle, plan.primarySurface);
  const secondaryShapes = Array.from(new Set(plan.surfaces.map((surface) => artifactSurfaceToShape(surface.kind))))
    .filter((shape) => shape !== primaryShape)
    .slice(0, 2);

  const shapes = Object.fromEntries(SHAPE_ORDER.map((shape) => {
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
    flowId: bundle.flow.id,
    flowSlug: bundle.flow.slug,
    title: bundle.flow.title,
    primaryShape,
    secondaryShapes,
    outlineRows,
    excludedRows,
    shapes,
    sourceMutationCount: 0,
  };
}
