import { FlowBundle } from './types';

export type FlowUxType =
  | 'timeline'
  | 'checklist'
  | 'routine'
  | 'program'
  | 'phase'
  | 'meal_plan'
  | 'decision'
  | 'mini_flow';

export type FlowExposureStatus =
  | 'representative'
  | 'migration_candidate'
  | 'catalog_preview'
  | 'legacy_accessible'
  | 'hidden';

export type FlowView =
  | 'list'
  | 'agenda'
  | 'month_calendar'
  | 'routine_sessions'
  | 'comparison_table'
  | 'export_preview';

export type FlowExportTarget = 'memo' | 'sheet' | 'calendar' | 'todo';

export type FlowExecutionModel = {
  slug: string;
  uxType: FlowUxType;
  exposureStatus: FlowExposureStatus;
  sourceMode: 'seed' | 'real' | 'preview';
  views: FlowView[];
  exportTargets: FlowExportTarget[];
  migrationGaps: string[];
};

const representativeFlowSlugs = [
  'moving-d30-basic',
  'used-car-buying-check',
  'running-5k-4week',
  'baby-food-menu-recipe',
  'overseas-travel-d14',
] as const;

const decisionFlowSlugs = new Set([
  'used-car-buying-check',
  'wedding-d180-basic',
  'job-change-risk-check',
]);

const programFlowSlugs = new Set([
  'running-5k-4week',
]);

const migrationCandidateSlugs = new Set([
  'wedding-d180-basic',
  'study-exam-d30-plan',
  'home-workout-20min',
  'english-study-30day-routine',
  'car-care-monthly-routine',
  'national-health-checkup-d7',
  'passport-renewal-docs',
  'year-end-tax-docs',
  'job-change-risk-check',
  'new-car-delivery-check',
  'diet-habit-2week',
]);

export function getRepresentativeFlowSlugs(): string[] {
  return [...representativeFlowSlugs];
}

export function isRepresentativeFlow(bundle: FlowBundle): boolean {
  return representativeFlowSlugs.includes(bundle.flow.slug as (typeof representativeFlowSlugs)[number]);
}

export function normalizeExecutionModel(bundle: FlowBundle): FlowExecutionModel {
  const uxType = inferUxType(bundle);
  const exposureStatus = inferExposureStatus(bundle, uxType);

  return {
    slug: bundle.flow.slug,
    uxType,
    exposureStatus,
    sourceMode: getSourceMode(bundle),
    views: getViewsForUxType(uxType),
    exportTargets: getExportTargetsForUxType(uxType),
    migrationGaps: getMigrationGaps(bundle, uxType),
  };
}

function getSourceMode(bundle: FlowBundle): FlowExecutionModel['sourceMode'] {
  if (bundle.flow.source_status === 'real') return 'real';
  if (bundle.flow.source_status === 'preview') return 'preview';
  return 'seed';
}

function inferUxType(bundle: FlowBundle): FlowUxType {
  if (isExactVideoMiniFlow(bundle)) return 'mini_flow';
  if (bundle.flow.content_type === 'meal_plan') return 'meal_plan';
  if (programFlowSlugs.has(bundle.flow.slug)) return 'program';
  if (decisionFlowSlugs.has(bundle.flow.slug)) return 'decision';
  if (bundle.flow.structure_type === 'timeline') return 'timeline';
  if (bundle.flow.structure_type === 'routine') return 'routine';
  if (bundle.flow.structure_type === 'phase') return 'phase';
  return 'checklist';
}

function inferExposureStatus(bundle: FlowBundle, uxType: FlowUxType): FlowExposureStatus {
  if (isRepresentativeFlow(bundle)) return 'representative';
  if (bundle.flow.source_status === 'preview') return 'catalog_preview';
  if (uxType === 'mini_flow') return 'catalog_preview';
  if (migrationCandidateSlugs.has(bundle.flow.slug) || bundle.flow.source_status === 'real') return 'migration_candidate';
  return 'legacy_accessible';
}

function isExactVideoMiniFlow(bundle: FlowBundle): boolean {
  return Boolean(
    bundle.flow.source_status === 'real' &&
      bundle.flow.source_precision === 'exact' &&
      bundle.flow.tags?.includes('exact-video') &&
      bundle.items.length === 1,
  );
}

function getViewsForUxType(uxType: FlowUxType): FlowView[] {
  switch (uxType) {
    case 'timeline':
      return ['list', 'agenda', 'month_calendar', 'export_preview'];
    case 'routine':
      return ['list', 'routine_sessions', 'month_calendar', 'export_preview'];
    case 'program':
      return ['list', 'agenda', 'routine_sessions', 'month_calendar', 'export_preview'];
    case 'meal_plan':
      return ['list', 'agenda', 'month_calendar', 'export_preview'];
    case 'phase':
      return ['list', 'agenda', 'export_preview'];
    case 'decision':
      return ['list', 'comparison_table', 'export_preview'];
    case 'mini_flow':
      return ['list', 'export_preview'];
    case 'checklist':
    default:
      return ['list', 'export_preview'];
  }
}

function getExportTargetsForUxType(uxType: FlowUxType): FlowExportTarget[] {
  switch (uxType) {
    case 'timeline':
    case 'program':
    case 'routine':
    case 'meal_plan':
      return ['memo', 'sheet', 'calendar', 'todo'];
    case 'decision':
      return ['memo', 'sheet', 'todo'];
    case 'mini_flow':
      return ['memo', 'calendar'];
    case 'phase':
    case 'checklist':
    default:
      return ['memo', 'sheet', 'todo'];
  }
}

function getMigrationGaps(bundle: FlowBundle, uxType: FlowUxType): string[] {
  const gaps: string[] = [];

  if (!bundle.itemDetails?.length && bundle.flow.content_type !== 'meal_plan') {
    gaps.push('item_details_missing');
  }
  if ((uxType === 'routine' || uxType === 'program') && !bundle.repeatRules?.length) {
    gaps.push('repeat_rule_needs_structure');
  }
  if ((uxType === 'timeline' || uxType === 'program') && !bundle.items.some((item) => item.day_offset !== undefined) && uxType !== 'program') {
    gaps.push('dated_offsets_missing');
  }
  if (uxType === 'decision' && bundle.flow.slug !== 'used-car-buying-check') {
    gaps.push('comparison_table_preview_needed');
  }

  return gaps;
}
