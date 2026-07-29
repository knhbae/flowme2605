import type { FlowBundle } from './types';
import { getNaturalArtifactAudit } from './natural-artifact-audit';
import { normalizeExecutionModel, type FlowExportTarget } from './execution-model';

export type ArtifactSurfaceKind =
  | 'execution_list'
  | 'month_calendar'
  | 'routine_month'
  | 'spreadsheet_preview'
  | 'comparison_table'
  | 'meal_calendar'
  | 'reaction_log'
  | 'memo_card';

export type PrimaryArtifactSurface =
  | 'timeline_calendar'
  | 'routine_calendar'
  | 'spreadsheet_log'
  | 'meal_reaction_log'
  | 'decision_table'
  | 'memo_card'
  | 'step_progress'
  | 'checklist';

export type SourceHandling = 'representative_candidate' | 'reshape_before_featured' | 'catalog_review';

export type ArtifactSurface = {
  kind: ArtifactSurfaceKind;
  title: string;
  description: string;
};

export type ArtifactPlan = {
  flowSlug: string;
  primarySurface: PrimaryArtifactSurface;
  sourceHandling: SourceHandling;
  canBeRepresentative: boolean;
  sourceAction: string;
  surfaces: ArtifactSurface[];
  exportTargets: FlowExportTarget[];
};

const decisionToHandling = {
  promote_to_manual_source_fit: 'representative_candidate',
  reshape_content_or_ux: 'reshape_before_featured',
  keep_catalog_review: 'catalog_review',
  replace_or_hide_source: 'catalog_review',
} as const;

const decisionTableOverrideSlugs = new Set(['driver-license-renewal-check']);
const checklistOverrideSlugs = new Set(['new-car-delivery-check', 'used-car-buying-check', 'passport-renewal-docs']);
const undatedChecklistTimelineSlugs = new Set(['vehicle-inspection-prep']);
const compactTimelineSlugs = new Set(['moving-d30-basic', 'vehicle-inspection-prep', 'real-mofa-overseas-travel-prep']);
const timelinePrimaryOverrideSlugs = new Set(['wedding-d180-basic']);
const checkOnlyRoutineSlugs = new Set(['diet-habit-2week', 'real-thankyou-bubu-home-workout-starter', 'real-fitvely-diet-record-routine']);
const mealCalendarOnlySlugs = new Set(['baby-food-menu-recipe']);
const maintenanceRoutineSlugs = new Set(['washer-tub-clean-monthly', 'monstera-care-routine']);
const applianceCycleSheetSlugs = new Set(['water-purifier-filter-cycle']);
const workoutProgrammingDecisionSlugs = new Set([
  'real-fitvely-video-bulk-up-method',
  'real-fitvely-video-workout-order',
  'real-fitvely-video-workout-split-science',
]);
const memoCardOverrideSlugs = new Set([
  'family-certificate-issue',
  'resident-register-copy-issue',
  'year-end-tax-docs',
  'business-registration-basic',
  'happy-birth-service-check',
  'industrial-accident-claim-docs',
  'vaccination-certificate-issue',
]);
const spreadsheetOverrideSlugs = new Set(['diet-meal-exercise-log', 'diet-reset-2week', 'water-purifier-filter-cycle', 'fridge-cleanout-weekly-plan']);
const checklistWithMemoSlugs = new Set(['overseas-safety-register']);

// 2026-06-01 크리에이터·블로그 배치: 카테고리별로 알맞은 아티팩트 표면을 새로 배정한다.
// 순차 단계(요리 준비→조리→평가, 정리 비우기→분류→정리, 창작 콘셉트→세팅→발행 등)는
// 플랫 체크리스트 대신 단계 진행 stepper(step_progress)로 보여준다.
const creatorStepProgressSlugs = new Set([
  'recipe-video-execute',
  'closet-organize-1day',
  'kitchen-reset-organize',
  'book-finish-one',
  'travel-packing-list',
  'blog-youtube-start',
]);
// 표 기반 기록(요일별 식단, 카테고리별 가계부, 주차별 관찰)은 spreadsheet_log + 전용 표.
const creatorSpreadsheetSlugs = new Set([
  'weekly-meal-plan',
  'monthly-household-budget',
  'skin-weekly-check',
]);
// 월급날 재정 분리와 병원 상담 준비는 결과를 한 장으로 남기는 memo_card.
const creatorMemoSlugs = new Set(['payday-finance-routine', 'pet-health-observation']);

function hasArtifact(bundle: FlowBundle, kind: string) {
  const audit = getNaturalArtifactAudit(bundle.flow.slug);
  return audit?.naturalArtifacts.some((artifact) => artifact.kind === kind) ?? false;
}

function getSourceHandling(bundle: FlowBundle): SourceHandling {
  const audit = getNaturalArtifactAudit(bundle.flow.slug);
  if (!audit) return 'reshape_before_featured';
  return decisionToHandling[audit.decision];
}

function getPrimarySurface(bundle: FlowBundle, model = normalizeExecutionModel(bundle)): PrimaryArtifactSurface {
  const audit = getNaturalArtifactAudit(bundle.flow.slug);
  if (bundle.flow.content_type === 'meal_plan') return 'meal_reaction_log';
  if (timelinePrimaryOverrideSlugs.has(bundle.flow.slug)) return 'timeline_calendar';
  if (undatedChecklistTimelineSlugs.has(bundle.flow.slug)) return 'checklist';
  if (checklistOverrideSlugs.has(bundle.flow.slug)) return 'checklist';
  if (checkOnlyRoutineSlugs.has(bundle.flow.slug)) return 'routine_calendar';
  if (decisionTableOverrideSlugs.has(bundle.flow.slug)) return 'decision_table';
  if (workoutProgrammingDecisionSlugs.has(bundle.flow.slug)) return 'decision_table';
  if (memoCardOverrideSlugs.has(bundle.flow.slug)) return 'memo_card';
  if (spreadsheetOverrideSlugs.has(bundle.flow.slug)) return 'spreadsheet_log';
  if (creatorStepProgressSlugs.has(bundle.flow.slug)) return 'step_progress';
  if (creatorSpreadsheetSlugs.has(bundle.flow.slug)) return 'spreadsheet_log';
  if (creatorMemoSlugs.has(bundle.flow.slug)) return 'memo_card';
  if (model.views.includes('comparison_table') || (hasArtifact(bundle, 'comparison_table') && bundle.flow.structure_type === 'checklist')) return 'decision_table';
  if ((hasArtifact(bundle, 'routine_calendar') || model.views.includes('routine_sessions') || bundle.flow.structure_type === 'routine') && !hasArtifact(bundle, 'spreadsheet')) return 'routine_calendar';
  if (bundle.flow.structure_type === 'timeline' && (hasArtifact(bundle, 'monthly_calendar') || model.views.includes('month_calendar'))) return 'timeline_calendar';
  if (hasArtifact(bundle, 'spreadsheet')) return 'spreadsheet_log';
  if (hasArtifact(bundle, 'routine_calendar') || model.views.includes('routine_sessions') || bundle.flow.structure_type === 'routine') return 'routine_calendar';
  if (hasArtifact(bundle, 'monthly_calendar') || model.views.includes('month_calendar') || bundle.flow.structure_type === 'timeline') return 'timeline_calendar';
  if (audit?.naturalArtifacts.some((artifact) => artifact.kind === 'memo')) return 'memo_card';
  return 'checklist';
}

function surface(kind: ArtifactSurfaceKind, title: string, description: string): ArtifactSurface {
  return { kind, title, description };
}

function getSurfaces(bundle: FlowBundle, primary: PrimaryArtifactSurface): ArtifactSurface[] {
  if (checklistWithMemoSlugs.has(bundle.flow.slug)) {
    return [
      surface('execution_list', '출국 전 체크리스트', '위험 정보와 비상 대비를 하나씩 확인합니다.'),
      surface('memo_card', '안전 정보 메모', '연락처, 주의사항, 원문 링크를 함께 보관합니다.'),
    ];
  }
  if (maintenanceRoutineSlugs.has(bundle.flow.slug)) {
    return [
      surface('routine_month', '관리 캘린더', '시작일 기준 다음 관리일을 만들고 날짜 안 체크리스트로 실행합니다.'),
      surface('execution_list', '날짜 안 체크리스트', '원문에서 반복 실행에 필요한 확인 항목만 남깁니다.'),
      surface('memo_card', '관리 메모', '방법, 준비물, 원문 링크처럼 반복 때 다시 볼 내용을 남깁니다.'),
    ];
  }
  if (applianceCycleSheetSlugs.has(bundle.flow.slug)) {
    return [
      surface('spreadsheet_preview', '필터 주기표', '필터별 마지막 교체일, 교체 주기, 다음 확인일을 한 표로 관리합니다.'),
      surface('memo_card', '관리 메모', '모델명, 원문 링크, 제조사별 차이를 메모로 분리합니다.'),
    ];
  }
  if (mealCalendarOnlySlugs.has(bundle.flow.slug)) {
    return [surface('meal_calendar', '이유식 일정 캘린더', '시작일 기준 메뉴와 레시피만 날짜별로 확인합니다.')];
  }
  if (checkOnlyRoutineSlugs.has(bundle.flow.slug)) {
    return [surface('routine_month', '반복 캘린더', '요일별 체크 회차만 보고 완료 여부를 남깁니다.')];
  }
  if (compactTimelineSlugs.has(bundle.flow.slug)) {
    return [
      surface('execution_list', '체크리스트', '지금 확인할 항목만 한 줄씩 체크합니다.'),
      surface('month_calendar', '월간 캘린더', '기준 날짜로 계산된 일정을 한눈에 봅니다.'),
    ];
  }
  if (primary === 'meal_reaction_log') {
    return [
      surface('meal_calendar', '이유식 일정표', '시작일 기준 메뉴와 새 재료를 먼저 확인합니다.'),
      surface('reaction_log', '반응 기록표', '먹은 양, 피부, 구토/설사, 변, 수면, 거부/선호를 기록합니다.'),
      surface('memo_card', '주의 메모', '알레르기와 전문가 확인 조건을 별도로 남깁니다.'),
    ];
  }
  if (primary === 'decision_table') {
    return [
      surface('comparison_table', '후보 비교표', '선택지를 먼저 비교하고 그 다음 실행 체크리스트로 내려갑니다.'),
      surface('execution_list', '현장 체크리스트', '결정 후 바로 확인할 일을 한 줄씩 체크합니다.'),
    ];
  }
  if (primary === 'spreadsheet_log') {
    return [
      surface('spreadsheet_preview', '기록표', '날짜별 기록 열을 먼저 만들고 주간 리뷰로 이어갑니다.'),
      surface('routine_month', '반복 리마인더', '측정, 운동, 리뷰 일정을 월간으로 확인합니다.'),
      surface('memo_card', '조정 메모', '다음 주에 바꿀 기준을 따로 남깁니다.'),
    ];
  }
  if (primary === 'routine_calendar') {
    return [
      surface('routine_month', '반복 캘린더', '요일별 반복 회차와 쉬는 날을 월간으로 봅니다.'),
      surface('memo_card', '회차 메모', '컨디션, 강도, 다음 회차 조정을 기록합니다.'),
      surface('execution_list', '실행 순서', '원본 콘텐츠의 동작이나 순서를 확인합니다.'),
    ];
  }
  if (primary === 'timeline_calendar') {
    return [
      surface('execution_list', '실행 리스트', '다가오는 할 일을 먼저 훑습니다.'),
      surface('month_calendar', '월간 캘린더', '기준 날짜로 계산된 일정을 한눈에 봅니다.'),
      surface('memo_card', '참고 메모', '원문 링크, 준비물, 다음에 다시 볼 내용을 남깁니다.'),
    ];
  }
  if (primary === 'memo_card') {
    return [
      surface('memo_card', '보관 메모', '나중에 다시 써야 하는 번호, 기준, 증빙을 저장합니다.'),
      surface('execution_list', '체크리스트', '메모를 만들기 위해 확인할 일을 체크합니다.'),
    ];
  }
  if (primary === 'step_progress') {
    return [
      surface('execution_list', '단계별 실행', '단계 순서대로 지금 단계의 할 일만 체크하며 진행합니다.'),
      surface('memo_card', '진행 메모', '단계마다 결과나 다음에 바꿀 점을 남깁니다.'),
    ];
  }
  return [surface('execution_list', '체크리스트', '지금 확인할 일을 한 줄씩 체크합니다.')];
}

export function getArtifactPlan(bundle: FlowBundle): ArtifactPlan {
  const model = normalizeExecutionModel(bundle);
  const primarySurface = getPrimarySurface(bundle, model);
  const sourceHandling = getSourceHandling(bundle);
  const audit = getNaturalArtifactAudit(bundle.flow.slug);
  const modelTargets: FlowExportTarget[] =
    model.views.includes('month_calendar') && !model.exportTargets.includes('calendar')
      ? [...model.exportTargets, 'calendar']
      : model.exportTargets;
  const exportTargets: FlowExportTarget[] =
    primarySurface === 'decision_table' && bundle.flow.primary_destination === 'hybrid' && !modelTargets.includes('sheet')
      ? [...modelTargets, 'sheet']
      : modelTargets;

  return {
    flowSlug: bundle.flow.slug,
    primarySurface,
    sourceHandling,
    canBeRepresentative: sourceHandling === 'representative_candidate',
    sourceAction:
      sourceHandling === 'catalog_review'
        ? 'Assign an exact source URL before representative promotion.'
        : audit?.nextContentAction ?? 'Keep content aligned to the selected artifact surface.',
    surfaces: getSurfaces(bundle, primarySurface),
    exportTargets,
  };
}
