import type { FlowBundle } from './types';

export type RoutineHorizonPolicy = {
  previewWeeks: number;
  previewDays: number;
  previewLabel: string;
  seriesEndPolicy: 'source_defined' | 'open_ended';
  seriesEndLabel: string;
  sourceDurationDays?: number;
};

const DEFAULT_PREVIEW_WEEKS = 4;
const MAX_PREVIEW_WEEKS = 8;

function normalizeDurationDays(value: unknown): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 3660
    ? Number(value)
    : undefined;
}

export function resolveRoutineHorizon(
  bundle: Pick<FlowBundle, 'flow' | 'repeatRules'>,
  previewWeeks = DEFAULT_PREVIEW_WEEKS,
): RoutineHorizonPolicy {
  const normalizedPreviewWeeks = Number.isInteger(previewWeeks)
    ? Math.min(Math.max(previewWeeks, 1), MAX_PREVIEW_WEEKS)
    : DEFAULT_PREVIEW_WEEKS;
  const explicitNaturalDuration = bundle.repeatRules
    ?.map((rule) => rule.match(/(?:^|\D)(\d{1,3})\s*일(?:간)?(?:\D|$)/u)?.[1])
    .find(Boolean);
  const sourceDurationDays = normalizeDurationDays(
    bundle.flow.routine_duration_days ?? (explicitNaturalDuration ? Number(explicitNaturalDuration) : undefined),
  );
  const effectivePreviewWeeks = sourceDurationDays
    ? Math.min(normalizedPreviewWeeks, Math.max(1, Math.ceil(sourceDurationDays / 7)))
    : normalizedPreviewWeeks;
  const seriesEndLabel = sourceDurationDays
    ? sourceDurationDays % 7 === 0
      ? `${sourceDurationDays / 7}주 프로그램`
      : `${sourceDurationDays}일 프로그램`
    : '종료일 없음';

  return {
    previewWeeks: effectivePreviewWeeks,
    previewDays: effectivePreviewWeeks * 7,
    previewLabel: `미리보기 ${effectivePreviewWeeks}주`,
    seriesEndPolicy: sourceDurationDays ? 'source_defined' : 'open_ended',
    seriesEndLabel,
    ...(sourceDurationDays ? { sourceDurationDays } : {}),
  };
}
