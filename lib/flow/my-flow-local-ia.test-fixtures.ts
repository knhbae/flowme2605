export const APPROVED_MY_PLAN_CLOCK = '2026-08-10T09:00:00+09:00';
export const APPROVED_MY_PLAN_TIME_ZONE = 'Asia/Seoul';

export type ApprovedMyPlanSortFixture = {
  planId: string;
  sourceId: string;
  title: string;
  copy: number;
  savedAt: string;
  nextIncompleteAt?: string;
  done: number;
  total: number;
};

export const APPROVED_MY_PLAN_SORT_FIXTURE: readonly ApprovedMyPlanSortFixture[] = [
  {
    planId: 'moving-a',
    sourceId: 'moving-d30',
    title: '이사 D-30 준비',
    copy: 1,
    savedAt: '2026-08-10T08:10:00+09:00',
    nextIncompleteAt: '2026-08-09',
    done: 0,
    total: 1,
  },
  {
    planId: 'moving-b',
    sourceId: 'moving-d30',
    title: '이사 D-30 준비',
    copy: 2,
    savedAt: '2026-08-10T08:20:00+09:00',
    nextIncompleteAt: '2026-08-12',
    done: 0,
    total: 1,
  },
  {
    planId: 'wedding-2',
    sourceId: 'wedding-2',
    title: '결혼 준비 2',
    copy: 1,
    savedAt: '2026-08-09T21:00:00+09:00',
    nextIncompleteAt: '2026-08-10',
    done: 0,
    total: 1,
  },
  {
    planId: 'wedding-10',
    sourceId: 'wedding-10',
    title: '결혼 준비 10',
    copy: 1,
    savedAt: '2026-08-10T08:30:00+09:00',
    done: 0,
    total: 1,
  },
  {
    planId: 'reading',
    sourceId: 'reading',
    title: '독서 기록',
    copy: 1,
    savedAt: '2026-08-08T11:00:00+09:00',
    done: 1,
    total: 1,
  },
  {
    planId: 'cleanup',
    sourceId: 'cleanup',
    title: '집 정리',
    copy: 1,
    savedAt: '2026-08-10T07:00:00+09:00',
    nextIncompleteAt: '2026-08-12',
    done: 0,
    total: 1,
  },
] as const;

export const APPROVED_MY_PLAN_SORT_EXPECTED = {
  next: ['moving-a', 'wedding-2', 'moving-b', 'cleanup', 'wedding-10', 'reading'],
  saved: ['wedding-10', 'moving-b', 'moving-a', 'cleanup', 'wedding-2', 'reading'],
  name: ['wedding-2', 'wedding-10', 'reading', 'moving-a', 'moving-b', 'cleanup'],
} as const;
