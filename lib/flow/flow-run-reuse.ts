import type {
  SourceBackedFlowMapPersonalCopy,
  SourceBackedFlowMapPersonalCopyStepOverride,
} from './source-backed-my-flow';

export type FlowRunFixedDatePolicy = 'keep_fixed_dates' | 'reset_to_anchor';

export type FlowRunNewAnchorPlan = {
  anchor: string;
  fixedDateOverrideCount: number;
  fixedDatePolicy: FlowRunFixedDatePolicy | 'not_needed';
  retainedFixedDateOverrideCount: number;
  resetFixedDateOverrideCount: number;
  personalCopySnapshot?: SourceBackedFlowMapPersonalCopy;
};

function clonePersonalCopy(personalCopy: SourceBackedFlowMapPersonalCopy): SourceBackedFlowMapPersonalCopy {
  return {
    source: personalCopy.source,
    ...(personalCopy.originalTitle ? { originalTitle: personalCopy.originalTitle } : {}),
    includedStepIdsByFlow: Object.fromEntries(
      Object.entries(personalCopy.includedStepIdsByFlow).map(([flowSlug, stepIds]) => [flowSlug, [...stepIds]]),
    ),
    excludedStepIdsByFlow: Object.fromEntries(
      Object.entries(personalCopy.excludedStepIdsByFlow).map(([flowSlug, stepIds]) => [flowSlug, [...stepIds]]),
    ),
    ...(personalCopy.stepOverridesByFlow
      ? {
          stepOverridesByFlow: Object.fromEntries(
            Object.entries(personalCopy.stepOverridesByFlow).map(([flowSlug, stepOverrides]) => [
              flowSlug,
              Object.fromEntries(
                Object.entries(stepOverrides).map(([stepId, stepOverride]) => [
                  stepId,
                  {
                    ...(stepOverride.title ? { title: stepOverride.title } : {}),
                    ...(stepOverride.schedule
                      ? { schedule: { mode: 'fixed_date' as const, date: stepOverride.schedule.date } }
                      : {}),
                    ...(stepOverride.userMemo ? { userMemo: stepOverride.userMemo } : {}),
                  },
                ]),
              ),
            ]),
          ),
        }
      : {}),
  };
}

function countFixedDateOverrides(personalCopy?: SourceBackedFlowMapPersonalCopy): number {
  if (!personalCopy?.stepOverridesByFlow) return 0;
  return Object.values(personalCopy.stepOverridesByFlow).reduce(
    (count, stepOverrides) =>
      count + Object.values(stepOverrides).filter((stepOverride) => stepOverride.schedule?.mode === 'fixed_date').length,
    0,
  );
}

function resetFixedDateOverrides(personalCopy: SourceBackedFlowMapPersonalCopy): SourceBackedFlowMapPersonalCopy {
  const cloned = clonePersonalCopy(personalCopy);
  if (!cloned.stepOverridesByFlow) return cloned;

  const stepOverridesByFlow = Object.fromEntries(
    Object.entries(cloned.stepOverridesByFlow).flatMap(([flowSlug, stepOverrides]) => {
      const nextStepOverrides = Object.fromEntries(
        Object.entries(stepOverrides).flatMap(([stepId, stepOverride]) => {
          const nextOverride: SourceBackedFlowMapPersonalCopyStepOverride = {
            ...(stepOverride.title ? { title: stepOverride.title } : {}),
            ...(stepOverride.userMemo ? { userMemo: stepOverride.userMemo } : {}),
          };
          return Object.keys(nextOverride).length > 0 ? [[stepId, nextOverride] as const] : [];
        }),
      );
      return Object.keys(nextStepOverrides).length > 0 ? [[flowSlug, nextStepOverrides] as const] : [];
    }),
  );

  const { stepOverridesByFlow: _discardedStepOverrides, ...baseCopy } = cloned;
  return {
    ...baseCopy,
    ...(Object.keys(stepOverridesByFlow).length > 0 ? { stepOverridesByFlow } : {}),
  };
}

export function prepareFlowRunNewAnchor(
  personalCopy: SourceBackedFlowMapPersonalCopy | undefined,
  anchor: string,
  fixedDatePolicy?: FlowRunFixedDatePolicy,
): FlowRunNewAnchorPlan | undefined {
  const normalizedAnchor = anchor.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedAnchor)) return undefined;

  const fixedDateOverrideCount = countFixedDateOverrides(personalCopy);
  if (fixedDateOverrideCount > 0 && !fixedDatePolicy) return undefined;

  if (!personalCopy) {
    return {
      anchor: normalizedAnchor,
      fixedDateOverrideCount: 0,
      fixedDatePolicy: 'not_needed',
      retainedFixedDateOverrideCount: 0,
      resetFixedDateOverrideCount: 0,
    };
  }

  const shouldReset = fixedDateOverrideCount > 0 && fixedDatePolicy === 'reset_to_anchor';
  const resolvedPolicy: FlowRunFixedDatePolicy | 'not_needed' =
    fixedDateOverrideCount > 0 && fixedDatePolicy ? fixedDatePolicy : 'not_needed';
  return {
    anchor: normalizedAnchor,
    fixedDateOverrideCount,
    fixedDatePolicy: resolvedPolicy,
    retainedFixedDateOverrideCount: shouldReset ? 0 : fixedDateOverrideCount,
    resetFixedDateOverrideCount: shouldReset ? fixedDateOverrideCount : 0,
    personalCopySnapshot: shouldReset ? resetFixedDateOverrides(personalCopy) : clonePersonalCopy(personalCopy),
  };
}
