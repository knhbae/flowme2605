import type { FlowBundle } from './types';

export type DesignRefGapStatus = 'landed' | 'pending';

export type DesignRefGapPriority = 'P1' | 'P2';

export type DesignRefGapQueueItem = {
  id: string;
  label: string;
  status: DesignRefGapStatus;
  priority: DesignRefGapPriority;
  routeSlugs: string[];
  reference: string;
  nextAction: string;
  statusAfterAlignment: string;
};

export type DesignRefGapQueueSummary = {
  totalCount: number;
  landedCount: number;
  pendingCount: number;
  p1PendingCount: number;
  validatedCount: number;
  items: DesignRefGapQueueItem[];
  landedItems: DesignRefGapQueueItem[];
  pendingItems: DesignRefGapQueueItem[];
};

export const designRefGapQueueItems: DesignRefGapQueueItem[] = [
  {
    id: 'moving-timeline-calendar-primary',
    label: 'Moving timeline calendar leads the execution list',
    status: 'landed',
    priority: 'P1',
    routeSlugs: ['moving-d30-basic'],
    reference: 'design-ref moving desktop primary column',
    nextAction: 'Keep calendar-before-list behavior covered while broader rail work proceeds.',
    statusAfterAlignment: 'landed in UI, not validated until real user behavior exists.',
  },
  {
    id: 'moving-desktop-right-rail',
    label: 'Moving desktop source and warning rail',
    status: 'landed',
    priority: 'P1',
    routeSlugs: ['moving-d30-basic'],
    reference: 'design-ref desktop source context rail',
    nextAction: 'Use moving as the reference implementation before applying the rail to other dense routes.',
    statusAfterAlignment: 'landed in UI, not validated until real user behavior exists.',
  },
  {
    id: 'mobile-log-summary-cards',
    label: 'Mobile log routes start with a summary card',
    status: 'landed',
    priority: 'P1',
    routeSlugs: ['diet-habit-2week'],
    reference: 'design-ref mobile dense table compression',
    nextAction: 'Apply the same summary-first treatment to remaining study and reaction logs.',
    statusAfterAlignment: 'landed in UI, not validated until real user behavior exists.',
  },
  {
    id: 'mobile-comparison-summary-cards',
    label: 'Mobile comparison routes start with a summary card',
    status: 'landed',
    priority: 'P1',
    routeSlugs: ['new-car-delivery-check', 'used-car-buying-check'],
    reference: 'design-ref mobile comparison compression',
    nextAction: 'Check vehicle purchase sessions for evidence-first comprehension after mobile cleanup.',
    statusAfterAlignment: 'landed in UI, not validated until real user behavior exists.',
  },
  {
    id: 'desktop-reference-rail-generalization',
    label: 'Generalize desktop source rail beyond moving',
    status: 'landed',
    priority: 'P1',
    routeSlugs: [
      'computer-skills-d30-study',
      'diet-habit-2week',
      'new-car-delivery-check',
      'used-car-buying-check',
      'baby-food-menu-recipe',
    ],
    reference: 'design-ref source context stays visible beside the workbench',
    nextAction: 'Keep dense desktop routes covered while mobile summary entries are finished.',
    statusAfterAlignment: 'landed in UI, not validated until real user behavior exists.',
  },
  {
    id: 'mobile-study-log-summary',
    label: 'Study progress table needs mobile summary entry',
    status: 'landed',
    priority: 'P1',
    routeSlugs: ['computer-skills-d30-study'],
    reference: 'design-ref mobile log summary before dense editable rows',
    nextAction: 'Use the observed-session package to check whether users understand source rows before export.',
    statusAfterAlignment: 'landed in UI, not validated until real user behavior exists.',
  },
  {
    id: 'mobile-baby-food-reaction-summary',
    label: 'Baby food route needs reaction-first mobile entry',
    status: 'landed',
    priority: 'P1',
    routeSlugs: ['baby-food-menu-recipe'],
    reference: 'design-ref mobile first artifact before recipe density',
    nextAction: 'Check whether the reaction summary is understood before recipe details in observed sessions.',
    statusAfterAlignment: 'landed in UI, not validated until real user behavior exists.',
  },
  {
    id: 'observed-session-prep',
    label: 'Observed-session package for current candidates',
    status: 'landed',
    priority: 'P2',
    routeSlugs: ['computer-skills-d30-study', 'diet-habit-2week', 'new-car-delivery-check'],
    reference: 'design-ref cannot replace real user validation',
    nextAction: 'Run the moderated mobile sessions and record behavior before using validation language.',
    statusAfterAlignment: 'observed-session prep package ready, not validated until real user behavior exists.',
  },
];

export function summarizeDesignRefGapQueue(bundles: FlowBundle[]): DesignRefGapQueueSummary {
  const bundleSlugs = new Set(bundles.map((bundle) => bundle.flow.slug));
  const items = designRefGapQueueItems
    .map((item) => ({
      ...item,
      routeSlugs: item.routeSlugs.filter((slug) => bundleSlugs.has(slug)),
    }))
    .filter((item) => item.routeSlugs.length > 0);
  const landedItems = items.filter((item) => item.status === 'landed');
  const pendingItems = items.filter((item) => item.status === 'pending');

  return {
    totalCount: items.length,
    landedCount: landedItems.length,
    pendingCount: pendingItems.length,
    p1PendingCount: pendingItems.filter((item) => item.priority === 'P1').length,
    validatedCount: items.filter((item) => !item.statusAfterAlignment.includes('not validated')).length,
    items,
    landedItems,
    pendingItems,
  };
}
