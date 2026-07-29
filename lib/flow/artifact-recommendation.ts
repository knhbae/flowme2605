import { getArtifactPlan, type PrimaryArtifactSurface } from './artifact-plan';
import { inferPrimaryDestination } from './destination';
import type {
  FlowExportDestination,
  FlowExportScope,
  FlowExportScopePlan,
} from './export-scope';
import type {
  FlowExperienceProjection,
  FlowExperienceShape,
} from './flow-experience-projection';
import type { FlowBundle } from './types';

export type ArtifactRecommendationRole = 'primary' | 'secondary' | 'additional';

export type ArtifactShapeRecommendation = {
  shape: FlowExperienceShape;
  label: string;
  role: Exclude<ArtifactRecommendationRole, 'additional'>;
  count: number;
  countLabel: string;
  reason: string;
  lossCount: number;
  lossSummary: string;
  deltaSummary?: string;
};

export type ArtifactRecommendationVM = {
  primary?: ArtifactShapeRecommendation;
  secondary: ArtifactShapeRecommendation[];
  visible: ArtifactShapeRecommendation[];
  unsupportedShapeCount: number;
};

export type ArtifactExportRecommendation = {
  destination: FlowExportDestination;
  role: ArtifactRecommendationRole;
  count: number;
  actionLabel: string;
  reason: string;
  lossCount: number;
  lossSummary: string;
  deltaSummary?: string;
};

export type ArtifactExportRecommendationVM = {
  scope: FlowExportScope;
  scopeLabel: string;
  primary?: ArtifactExportRecommendation;
  secondary: ArtifactExportRecommendation[];
  additional: ArtifactExportRecommendation[];
  visible: ArtifactExportRecommendation[];
  unavailable: FlowExportDestination[];
};

export type ArtifactPreflightScheduleState = 'not_applicable' | 'provisional' | 'committed';

export type ArtifactPreflightVM = {
  primary?: ArtifactShapeRecommendation;
  secondary: ArtifactShapeRecommendation[];
  destinations: FlowExportDestination[];
  preferredDestination?: FlowExportDestination;
  scheduleState: ArtifactPreflightScheduleState;
  scheduledEventCount: number;
  summary: string;
};

const SHAPE_REASON: Record<FlowExperienceShape, string> = {
  flow_execution: '회차와 다음 행동을 이어서 실행하기 좋아요.',
  calendar: '날짜에 맞춰 실행할 Flow예요.',
  checklist: '하나씩 확인하고 완료하기 좋아요.',
  sheet: '항목을 한눈에 비교하거나 기록하기 좋아요.',
  memo: '나중에 다시 볼 정보를 함께 남기기 좋아요.',
};

const DESTINATION_LABEL: Record<FlowExportDestination, string> = {
  calendar: '캘린더 일정',
  checklist: '체크리스트',
  sheet: '시트',
  memo: '메모',
};

const DESTINATION_REASON: Record<FlowExportDestination, string> = {
  calendar: '날짜가 정해진 항목만 일정으로 만듭니다.',
  checklist: '실행 순서와 완료 기준을 함께 옮깁니다.',
  sheet: '개인 순서를 유지한 행으로 옮깁니다.',
  memo: '제목과 날짜, 메모를 함께 옮깁니다.',
};

function shapeCountLabel(shape: FlowExperienceShape, count: number): string {
  if (shape === 'calendar') return `일정 ${count}개`;
  if (shape === 'sheet') return `${count}행`;
  return `${count}개`;
}

function shapeLossSummary(shape: FlowExperienceShape, lossCount: number): string {
  if (lossCount === 0) return '전체 항목 유지';
  if (shape === 'calendar') return `날짜 없는 항목 등 ${lossCount}개는 FlowMe에 남음`;
  return `${lossCount}개는 FlowMe에 남음`;
}

export function getArtifactShapeExportDestination(
  shape: FlowExperienceShape,
): FlowExportDestination {
  if (shape === 'calendar') return 'calendar';
  if (shape === 'sheet') return 'sheet';
  if (shape === 'memo') return 'memo';
  return 'checklist';
}

export function buildArtifactRecommendationVM(
  projection: FlowExperienceProjection,
): ArtifactRecommendationVM {
  const orderedShapes = [projection.primaryShape, ...projection.secondaryShapes]
    .filter((shape, index, values) => values.indexOf(shape) === index)
    .filter((shape) => projection.shapes[shape].count > 0);
  const primaryShape = orderedShapes[0];
  const primaryIds = new Set(primaryShape ? projection.shapes[primaryShape].rows.map((row) => row.id) : []);
  const visible = orderedShapes.slice(0, 3).map((shape, index): ArtifactShapeRecommendation => {
    const shapeProjection = projection.shapes[shape];
    const shapeIds = new Set(shapeProjection.rows.map((row) => row.id));
    const lossCount = projection.outlineRows.filter((row) => !shapeIds.has(row.id)).length;
    const addedToPrimary = shapeProjection.rows.filter((row) => !primaryIds.has(row.id)).length;
    return {
      shape,
      label: shapeProjection.label,
      role: index === 0 ? 'primary' : 'secondary',
      count: shapeProjection.count,
      countLabel: shapeCountLabel(shape, shapeProjection.count),
      reason: SHAPE_REASON[shape],
      lossCount,
      lossSummary: shapeLossSummary(shape, lossCount),
      ...(index > 0 && addedToPrimary > 0 ? { deltaSummary: `${addedToPrimary}개를 더 담음` } : {}),
    };
  });
  return {
    primary: visible[0],
    secondary: visible.slice(1),
    visible,
    unsupportedShapeCount: Object.values(projection.shapes).filter((shape) => shape.count === 0).length,
  };
}

export function buildArtifactPreflightVM(options: {
  projection: FlowExperienceProjection;
  preferredDestination?: FlowExportDestination;
  scheduleState?: ArtifactPreflightScheduleState;
  scheduledEventCount?: number;
}): ArtifactPreflightVM {
  const recommendation = buildArtifactRecommendationVM(options.projection);
  const destinations = recommendation.visible
    .map((candidate) => getArtifactShapeExportDestination(candidate.shape))
    .filter((destination, index, values) => values.indexOf(destination) === index);
  const scheduleState = options.scheduleState ?? 'not_applicable';
  const scheduledEventCount = Math.max(0, options.scheduledEventCount ?? 0);
  const primarySummary = recommendation.primary
    ? `${recommendation.primary.label} · ${recommendation.primary.countLabel}`
    : '가져갈 결과 없음';
  const summary = scheduleState === 'provisional' && destinations.includes('calendar')
    ? `${primarySummary} · 날짜를 정하면 캘린더 ${scheduledEventCount}개`
    : scheduleState === 'committed' && destinations.includes('calendar')
      ? `${primarySummary} · 캘린더 ${scheduledEventCount}개`
      : primarySummary;
  const preferredDestination = options.preferredDestination
    && destinations.includes(options.preferredDestination)
    ? options.preferredDestination
    : destinations[0];

  return {
    primary: recommendation.primary,
    secondary: recommendation.secondary,
    destinations,
    ...(preferredDestination ? { preferredDestination } : {}),
    scheduleState,
    scheduledEventCount,
    summary,
  };
}

function surfaceToDestination(surface: PrimaryArtifactSurface): FlowExportDestination {
  if (surface === 'timeline_calendar' || surface === 'routine_calendar') return 'calendar';
  if (surface === 'spreadsheet_log' || surface === 'meal_reaction_log' || surface === 'decision_table') return 'sheet';
  if (surface === 'memo_card') return 'memo';
  return 'checklist';
}

export function getPreferredArtifactExportDestination(bundle: FlowBundle): FlowExportDestination {
  const destination = inferPrimaryDestination(bundle);
  if (destination === 'calendar') return 'calendar';
  if (destination === 'sheet') return 'sheet';
  if (destination === 'memo') return 'memo';
  if (destination === 'internal_check') return 'checklist';
  return surfaceToDestination(getArtifactPlan(bundle).primarySurface);
}

function scopeLabel(plan: FlowExportScopePlan): string {
  if (plan.scope === 'flow') return 'Flow 전체';
  if (plan.scope === 'selected') return `선택한 ${plan.includedCount}개`;
  return '현재 항목';
}

function exportActionLabel(
  plan: FlowExportScopePlan,
  destination: FlowExportDestination,
  count: number,
): string {
  const prefix = scopeLabel(plan);
  if (destination === 'calendar') return `${prefix} · 캘린더 일정 ${count}개 받기`;
  if (destination === 'sheet') return `${prefix} · 시트 ${count}행 복사`;
  return `${prefix} · ${DESTINATION_LABEL[destination]} ${count}개 복사`;
}

function exportLossSummary(
  plan: FlowExportScopePlan,
  destination: FlowExportDestination,
  lossCount: number,
): string {
  if (lossCount === 0) return '선택 범위 전체 유지';
  if (destination === 'calendar') {
    const undated = plan.metrics.undatedCount;
    return undated > 0
      ? `날짜 없는 ${undated}개는 FlowMe에 남음`
      : `${lossCount}개는 FlowMe에 남음`;
  }
  return `${lossCount}개 제외`;
}

function secondaryPriority(primary: FlowExportDestination): FlowExportDestination[] {
  if (primary === 'calendar') return ['checklist', 'memo', 'sheet'];
  if (primary === 'checklist') return ['memo', 'sheet', 'calendar'];
  if (primary === 'sheet') return ['memo', 'checklist', 'calendar'];
  return ['checklist', 'sheet', 'calendar'];
}

export function buildArtifactExportRecommendationVM(options: {
  plan: FlowExportScopePlan;
  destinations: FlowExportDestination[];
  preferredDestination?: FlowExportDestination;
}): ArtifactExportRecommendationVM {
  const uniqueDestinations = options.destinations.filter((destination, index, values) => (
    values.indexOf(destination) === index
  ));
  const ready = uniqueDestinations.filter((destination) => options.plan.countByDestination[destination] > 0);
  const preferred = options.preferredDestination && ready.includes(options.preferredDestination)
    ? options.preferredDestination
    : undefined;
  const primaryDestination = preferred
    ?? (options.plan.metrics.datedCount > 0 && ready.includes('calendar') ? 'calendar' : undefined)
    ?? (ready.includes('checklist') ? 'checklist' : ready[0]);
  const orderedReady = primaryDestination
    ? [
        primaryDestination,
        ...secondaryPriority(primaryDestination).filter((destination) => ready.includes(destination)),
        ...ready,
      ].filter((destination, index, values) => values.indexOf(destination) === index)
    : [];
  const primaryCount = primaryDestination ? options.plan.countByDestination[primaryDestination] : 0;
  const recommendations = orderedReady.map((destination, index): ArtifactExportRecommendation => {
    const count = options.plan.countByDestination[destination];
    const lossCount = options.plan.metrics.omittedCountByDestination[destination];
    const delta = count - primaryCount;
    return {
      destination,
      role: index === 0 ? 'primary' : index <= 2 ? 'secondary' : 'additional',
      count,
      actionLabel: exportActionLabel(options.plan, destination, count),
      reason: DESTINATION_REASON[destination],
      lossCount,
      lossSummary: exportLossSummary(options.plan, destination, lossCount),
      ...(index > 0 && delta !== 0
        ? { deltaSummary: delta > 0 ? `${delta}개를 더 담음` : `${Math.abs(delta)}개 적음` }
        : {}),
    };
  });
  return {
    scope: options.plan.scope,
    scopeLabel: scopeLabel(options.plan),
    primary: recommendations[0],
    secondary: recommendations.slice(1, 3),
    additional: recommendations.slice(3),
    visible: recommendations.slice(0, 3),
    unavailable: uniqueDestinations.filter((destination) => options.plan.countByDestination[destination] === 0),
  };
}
