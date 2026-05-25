import type { FlowBundle, PrimaryDestination } from './types';

export type UxCleanupPriority = 'P1' | 'P2' | 'P3';

export type UxCleanupDecision =
  | 'rewrite_content_before_featured'
  | 'improve_ux_before_featured'
  | 'merge_or_rewrite_before_featured'
  | 'hide_or_hold';

export type UxCleanupBacklogGroup = {
  id: string;
  label: string;
  priority: UxCleanupPriority;
  cleanupDecision: UxCleanupDecision;
  primaryDestination: PrimaryDestination;
  routeSlugs: string[];
  unresolvedGap: string;
  requiredMinimum: string[];
  nextBatch: string;
  statusAfterCleanup: string;
};

export type UxCleanupBacklogSummary = {
  totalGroupCount: number;
  totalRouteCount: number;
  validatedCount: number;
  priorityCounts: Record<UxCleanupPriority, number>;
  firstBatchGroupIds: string[];
  groups: UxCleanupBacklogGroup[];
};

const emptyPriorityCounts: Record<UxCleanupPriority, number> = {
  P1: 0,
  P2: 0,
  P3: 0,
};

export const uxCleanupBacklogGroups: UxCleanupBacklogGroup[] = [
  {
    id: 'exact_workout_video_execution_detail',
    label: 'Exact workout videos need executable detail',
    priority: 'P1',
    cleanupDecision: 'rewrite_content_before_featured',
    primaryDestination: 'calendar',
    routeSlugs: [
      'real-thankyou-bubu-video-full-body-no-jump',
      'real-thankyou-bubu-video-daily-stretch-9min',
      'real-thankyou-bubu-video-belly-side-all-in-one',
      'real-thankyou-bubu-video-no-knee-cardio-strength',
      'real-thankyou-bubu-video-arm-back-shoulder',
      'real-thankyou-bubu-video-waist-8cm',
      'real-thankyou-bubu-video-8min-cardio',
      'real-thankyou-bubu-video-3min-arm',
      'real-thankyou-bubu-video-3min-abs',
      'real-thankyou-bubu-video-lower-belly-8min',
      'real-thankyou-bubu-home-workout-starter',
      'real-thankyou-bubu-20min-routine',
    ],
    unresolvedGap:
      'Users can schedule the workout, but some routes still need the visible structure that says what to do without inventing a movement sequence.',
    requiredMinimum: [
      'summary',
      'detailed execution guide',
      'original video link',
      'post-workout record',
      'stop condition',
    ],
    nextBatch:
      'ThankyouBUBU reminder detail now covers the two former broad-source routes and ten exact-video routes. Next Screen 4 / routine setup batch should reduce start-date, weekday, and session-count friction without generating unsupported exercise plans.',
    statusAfterCleanup:
      'ThankyouBUBU workout reminders are calendar-notification-ready, but the route family is still not validated until real user behavior exists.',
  },
  {
    id: 'health_observation_guardrail',
    label: 'Health and diet routes need observation-first guardrails',
    priority: 'P1',
    cleanupDecision: 'rewrite_content_before_featured',
    primaryDestination: 'sheet',
    routeSlugs: [
      'diet-habit-2week',
      'real-fitvely-video-body-fat-6kg-method',
      'real-fitvely-video-carb-reason',
      'real-fitvely-video-three-week-check',
      'real-fitvely-video-post-workout-nutrition',
      'real-fitvely-video-carb-amount-shorts',
      'real-fitvely-video-after-work-nutrition',
      'real-fitvely-diet-record-routine',
    ],
    unresolvedGap:
      'Diet and nutrition routes can be misread as prescription unless the first artifact is observation, one selected rule, and a stop/consult boundary.',
    requiredMinimum: [
      'one selected source rule',
      'observation row',
      'stop/consult condition',
      'no outcome promise',
      'source/risk separation',
    ],
    nextBatch:
      'First exact FITVELY diet-record reshape landed for real-fitvely-diet-record-routine; the remaining FITVELY nutrition exact-video routes now use sheet-first 관찰표 copy with one application and one observation record. Next review should check whether source-rule choice is understood in user sessions.',
    statusAfterCleanup: 'cleanup backlog item, not validated until real user behavior exists.',
  },
  {
    id: 'vehicle_purchase_evidence_first',
    label: 'Vehicle purchase routes need evidence before checklist completion',
    priority: 'P1',
    cleanupDecision: 'improve_ux_before_featured',
    primaryDestination: 'sheet',
    routeSlugs: ['new-car-delivery-check', 'used-car-buying-check', 'vehicle-inspection-prep'],
    unresolvedGap:
      'Vehicle routes can look complete when a checklist is checked, even though the real user output should be evidence, comparison, and hold/buy notes.',
    requiredMinimum: [
      'evidence or comparison table',
      'photo/source proof field',
      'dealer/seller confirmation',
      'hold/buy memo',
      'no acceptance advice',
    ],
    nextBatch:
      'vehicle-inspection-prep now has reservation/result follow-up memo fields; re-check used-car and vehicle inspection sessions for mobile density and evidence-first comprehension.',
    statusAfterCleanup: 'cleanup backlog item, not validated until real user behavior exists.',
  },
  {
    id: 'official_admin_condition_memo',
    label: 'Official and admin routes need condition memo clarity',
    priority: 'P2',
    cleanupDecision: 'improve_ux_before_featured',
    primaryDestination: 'memo',
    routeSlugs: [
      'passport-renewal-docs',
      'driver-license-renewal-check',
      'qnet-exam-application-prep',
      'national-health-checkup-d7',
      'business-registration-basic',
    ],
    unresolvedGap:
      'Official routes are often useful, but each needs a route-specific condition/submission memo so FLOW does not look like a generic checklist.',
    requiredMinimum: [
      'official source link',
      'user situation fields',
      'submission or condition memo',
      'document/status fields',
      'official verification reminder',
    ],
    nextBatch:
      'Use passport memo, driver condition table, and Q-Net deadline log as references for remaining official/admin route rewrites.',
    statusAfterCleanup: 'cleanup backlog item, not validated until real user behavior exists.',
  },
  {
    id: 'study_source_row_eligibility',
    label: 'Study routes need source-row eligibility decisions',
    priority: 'P2',
    cleanupDecision: 'merge_or_rewrite_before_featured',
    primaryDestination: 'hybrid',
    routeSlugs: ['real-sinagong-computer-d30-study'],
    unresolvedGap:
      'The Sinagong exact-source route may duplicate the representative `computer-skills-d30-study` route unless it has its own source-derived rows and score/wrong-answer shape.',
    requiredMinimum: [
      'source-derived rows',
      'editable target date/status/note fields',
      'wrong-answer or retry field',
      'canonical route decision',
      'merge/hide decision if redundant',
    ],
    nextBatch:
      'Merge with the canonical computer-skills-d30-study route or rewrite with distinct Sinagong source rows before any featured framing.',
    statusAfterCleanup: 'cleanup backlog item, not validated until real user behavior exists.',
  },
  {
    id: 'baby_food_reaction_first',
    label: 'Baby food routes need reaction log before recipe density',
    priority: 'P2',
    cleanupDecision: 'improve_ux_before_featured',
    primaryDestination: 'hybrid',
    routeSlugs: ['baby-food-menu-recipe'],
    unresolvedGap:
      'The meal-plan content is rich, but the parent first needs today’s meal slot, new ingredient, reaction log, and allergy-watch caution.',
    requiredMinimum: [
      'today meal slot',
      'new ingredient marker',
      'reaction log',
      'allergy-watch caution',
      'recipe details below first artifact',
    ],
    nextBatch:
      'Use this as the family/health-adjacent density reference before adding more recipe-like content.',
    statusAfterCleanup: 'cleanup backlog item, not validated until real user behavior exists.',
  },
  {
    id: 'travel_safety_multi_source',
    label: 'Travel routes need emergency memo and source separation',
    priority: 'P2',
    cleanupDecision: 'rewrite_content_before_featured',
    primaryDestination: 'hybrid',
    routeSlugs: ['overseas-travel-d14', 'real-mofa-overseas-travel-prep'],
    unresolvedGap:
      'Travel routes need passport, destination, emergency contact, insurance, and embassy/consular source separation rather than one broad travel checklist.',
    requiredMinimum: [
      'country or destination check',
      'emergency memo',
      'official source separation',
      'passport copy/storage field',
      'family contact field',
    ],
    nextBatch:
      'Rewrite the MOFA route around country-check and emergency-card outputs before considering broader travel exposure.',
    statusAfterCleanup: 'cleanup backlog item, not validated until real user behavior exists.',
  },
  {
    id: 'workout_programming_decision_table',
    label: 'Workout programming routes need decision table before calendar',
    priority: 'P2',
    cleanupDecision: 'rewrite_content_before_featured',
    primaryDestination: 'hybrid',
    routeSlugs: [
      'real-fitvely-video-bulk-up-method',
      'real-fitvely-video-workout-order',
      'real-fitvely-video-workout-split-science',
    ],
    unresolvedGap:
      'Workout programming videos are not simple follow-along routines; users need to choose a rule or split before calendarizing.',
    requiredMinimum: [
      'selected source rule',
      'decision or comparison table',
      'weekly workout table',
      'revise-or-hold condition',
      'no training outcome promise',
    ],
    nextBatch:
      'First decision-table pass landed for the three FITVELY workout programming routes; next review should check mobile table comprehension in user sessions.',
    statusAfterCleanup: 'cleanup backlog item, not validated until real user behavior exists.',
  },
  {
    id: 'hidden_or_hold_source_gap',
    label: 'Routes without exact source stay hidden or on hold',
    priority: 'P3',
    cleanupDecision: 'hide_or_hold',
    primaryDestination: 'sheet',
    routeSlugs: ['real-fitvely-weekly-body-check'],
    unresolvedGap:
      'The current source does not confirm a matching weekly body-check method, so FLOW should not invent measurement, photo, or adjustment rules.',
    requiredMinimum: [
      'matching exact source',
      'measurement row from source',
      'observation note',
      'stop/consult condition',
    ],
    nextBatch:
      'Do not rewrite this route unless a matching exact FITVELY weekly body-check source is found.',
    statusAfterCleanup: 'hidden or hold backlog item, not validated until real user behavior exists.',
  },
];

export function getUxCleanupBacklogGroup(id: string): UxCleanupBacklogGroup | undefined {
  return uxCleanupBacklogGroups.find((group) => group.id === id);
}

export function summarizeUxCleanupBacklog(bundles: FlowBundle[]): UxCleanupBacklogSummary {
  const bundleSlugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const groups = uxCleanupBacklogGroups
    .map((group) => ({
      ...group,
      routeSlugs: group.routeSlugs.filter((slug) => bundleSlugs.has(slug)),
    }))
    .filter((group) => group.routeSlugs.length > 0);
  const priorityCounts = { ...emptyPriorityCounts };

  for (const group of groups) {
    priorityCounts[group.priority] += 1;
  }

  return {
    totalGroupCount: groups.length,
    totalRouteCount: groups.reduce((count, group) => count + group.routeSlugs.length, 0),
    validatedCount: groups.filter((group) => !group.statusAfterCleanup.includes('not validated')).length,
    priorityCounts,
    firstBatchGroupIds: groups.filter((group) => group.priority === 'P1').map((group) => group.id),
    groups,
  };
}
