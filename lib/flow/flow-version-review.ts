import type {
  SourceBackedFlowMapPersonalCopy,
  SourceBackedFlowMapPersonalCopyStepOverride,
  SourceBackedFlowMapPersistenceRecord,
  SourceBackedFlowMapStepBinding,
} from './source-backed-my-flow';

export type FlowVersionChangeKind = 'changed' | 'added' | 'removed';
export type FlowVersionChangedField = 'title' | 'details' | 'schedule' | 'destination' | 'source';
export type FlowVersionConflictField = 'title' | 'memo' | 'date';

export type FlowVersionReviewItem = {
  key: string;
  flowSlug: string;
  flowTitle: string;
  stepId: string;
  kind: FlowVersionChangeKind;
  previous?: SourceBackedFlowMapStepBinding;
  current?: SourceBackedFlowMapStepBinding;
  changedFields: FlowVersionChangedField[];
  conflictFields: FlowVersionConflictField[];
  hasPersonalConflict: boolean;
  sensitive: boolean;
};

export type FlowVersionReview = {
  mapId: string;
  savedVersion: string;
  currentVersion: string;
  items: FlowVersionReviewItem[];
  changedCount: number;
  addedCount: number;
  removedCount: number;
  conflictCount: number;
  sensitive: boolean;
};

export type FlowVersionReviewSelection =
  | 'use_latest'
  | 'use_latest_keep_personal'
  | 'keep_current'
  | 'include'
  | 'exclude'
  | 'keep_removed';

export type FlowVersionReviewSelections = Record<string, FlowVersionReviewSelection>;

export type FlowVersionReviewPersonalCopyResult = {
  personalCopy?: SourceBackedFlowMapPersonalCopy;
  unresolvedKeys: string[];
};

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableValue(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function isSensitiveStep(step?: SourceBackedFlowMapStepBinding): boolean {
  return step?.riskLevel === 'medical_sensitive' || step?.riskLevel === 'financial_sensitive';
}

function getChangedFields(
  previous: SourceBackedFlowMapStepBinding,
  current: SourceBackedFlowMapStepBinding,
): FlowVersionChangedField[] {
  return [
    previous.title !== current.title ? 'title' : undefined,
    stableValue(previous.textFallback) !== stableValue(current.textFallback) ? 'details' : undefined,
    stableValue(previous.calendar) !== stableValue(current.calendar) ? 'schedule' : undefined,
    previous.destination !== current.destination ? 'destination' : undefined,
    stableValue({ url: previous.sourceUrl, type: previous.sourceType, risk: previous.riskLevel })
      !== stableValue({ url: current.sourceUrl, type: current.sourceType, risk: current.riskLevel })
      ? 'source'
      : undefined,
  ].filter((field): field is FlowVersionChangedField => Boolean(field));
}

function getConflictFields(
  kind: FlowVersionChangeKind,
  changedFields: FlowVersionChangedField[],
  override?: SourceBackedFlowMapPersonalCopyStepOverride,
): FlowVersionConflictField[] {
  if (!override) return [];
  const sourceTextChanged = kind === 'removed' || changedFields.includes('title') || changedFields.includes('details') || changedFields.includes('source');
  return [
    override.title && sourceTextChanged ? 'title' : undefined,
    override.userMemo && sourceTextChanged ? 'memo' : undefined,
    override.schedule && (kind === 'removed' || changedFields.includes('schedule')) ? 'date' : undefined,
  ].filter((field): field is FlowVersionConflictField => Boolean(field));
}

function recordSteps(record: SourceBackedFlowMapPersistenceRecord): Map<string, {
  flowSlug: string;
  flowTitle: string;
  step: SourceBackedFlowMapStepBinding;
}> {
  return new Map(
    record.childFlows.flatMap((flow) =>
      flow.steps.map((step) => [
        `${flow.slug}::${step.stepId}`,
        { flowSlug: flow.slug, flowTitle: flow.title, step },
      ] as const),
    ),
  );
}

function personalRetainedSteps(personalCopy?: SourceBackedFlowMapPersonalCopy): Map<string, {
  flowSlug: string;
  flowTitle: string;
  step: SourceBackedFlowMapStepBinding;
}> {
  return new Map(
    Object.entries(personalCopy?.retainedStepsByFlow ?? {}).flatMap(([flowSlug, steps]) =>
      Object.values(steps).map((step) => [
        `${flowSlug}::${step.stepId}`,
        { flowSlug, flowTitle: flowSlug, step },
      ] as const),
    ),
  );
}

export function buildFlowVersionReview(options: {
  savedRecord: SourceBackedFlowMapPersistenceRecord;
  currentRecord: SourceBackedFlowMapPersistenceRecord;
  savedVersion?: string;
  personalCopy?: SourceBackedFlowMapPersonalCopy;
}): FlowVersionReview {
  const previousSteps = recordSteps(options.savedRecord);
  personalRetainedSteps(options.personalCopy).forEach((value, key) => {
    if (!previousSteps.has(key)) previousSteps.set(key, value);
  });
  const currentSteps = recordSteps(options.currentRecord);
  const excludedKeys = new Set(
    Object.entries(options.personalCopy?.excludedStepIdsByFlow ?? {}).flatMap(([flowSlug, ids]) =>
      ids.map((stepId) => `${flowSlug}::${stepId}`),
    ),
  );
  const keys = Array.from(new Set([...previousSteps.keys(), ...currentSteps.keys()])).sort();
  const items = keys.flatMap<FlowVersionReviewItem>((key) => {
    const previousEntry = previousSteps.get(key);
    const currentEntry = currentSteps.get(key);
    if (!previousEntry && currentEntry && excludedKeys.has(key)) return [];
    if (!previousEntry && !currentEntry) return [];

    const flowSlug = currentEntry?.flowSlug ?? previousEntry!.flowSlug;
    const flowTitle = currentEntry?.flowTitle ?? previousEntry!.flowTitle;
    const stepId = currentEntry?.step.stepId ?? previousEntry!.step.stepId;
    const override = options.personalCopy?.stepOverridesByFlow?.[flowSlug]?.[stepId];
    const kind: FlowVersionChangeKind = !previousEntry ? 'added' : !currentEntry ? 'removed' : 'changed';
    const changedFields = previousEntry && currentEntry ? getChangedFields(previousEntry.step, currentEntry.step) : [];
    if (kind === 'changed' && changedFields.length === 0) return [];
    const conflictFields = getConflictFields(kind, changedFields, override);
    return [{
      key,
      flowSlug,
      flowTitle,
      stepId,
      kind,
      ...(previousEntry ? { previous: previousEntry.step } : {}),
      ...(currentEntry ? { current: currentEntry.step } : {}),
      changedFields,
      conflictFields,
      hasPersonalConflict: conflictFields.length > 0,
      sensitive: isSensitiveStep(previousEntry?.step) || isSensitiveStep(currentEntry?.step),
    }];
  }).sort((left, right) => {
    if (left.hasPersonalConflict !== right.hasPersonalConflict) return left.hasPersonalConflict ? -1 : 1;
    const kindOrder: Record<FlowVersionChangeKind, number> = { changed: 0, added: 1, removed: 2 };
    return kindOrder[left.kind] - kindOrder[right.kind] || left.key.localeCompare(right.key);
  });

  return {
    mapId: options.currentRecord.map.id,
    savedVersion: options.savedVersion ?? options.savedRecord.map.version,
    currentVersion: options.currentRecord.map.version,
    items,
    changedCount: items.filter((item) => item.kind === 'changed').length,
    addedCount: items.filter((item) => item.kind === 'added').length,
    removedCount: items.filter((item) => item.kind === 'removed').length,
    conflictCount: items.filter((item) => item.hasPersonalConflict).length,
    sensitive: items.some((item) => item.sensitive)
      || options.currentRecord.childFlows.some((flow) => flow.riskLevel === 'medical_sensitive' || flow.riskLevel === 'financial_sensitive'),
  };
}

function clonePersonalCopy(
  personalCopy: SourceBackedFlowMapPersonalCopy | undefined,
  savedRecord: SourceBackedFlowMapPersistenceRecord,
): SourceBackedFlowMapPersonalCopy {
  const includedStepIdsByFlow = personalCopy?.includedStepIdsByFlow
    ? structuredClone(personalCopy.includedStepIdsByFlow)
    : Object.fromEntries(savedRecord.childFlows.map((flow) => [flow.slug, flow.stepIds]));
  const excludedStepIdsByFlow = personalCopy?.excludedStepIdsByFlow
    ? structuredClone(personalCopy.excludedStepIdsByFlow)
    : Object.fromEntries(savedRecord.childFlows.map((flow) => [flow.slug, []]));
  return {
    source: 'version_review',
    ...(personalCopy?.originalTitle ? { originalTitle: personalCopy.originalTitle } : {}),
    includedStepIdsByFlow,
    excludedStepIdsByFlow,
    ...(personalCopy?.stepOverridesByFlow
      ? { stepOverridesByFlow: structuredClone(personalCopy.stepOverridesByFlow) }
      : {}),
    ...(personalCopy?.retainedStepsByFlow
      ? { retainedStepsByFlow: structuredClone(personalCopy.retainedStepsByFlow) }
      : {}),
  };
}

function setIncluded(personalCopy: SourceBackedFlowMapPersonalCopy, flowSlug: string, stepId: string, included: boolean): void {
  const includedIds = new Set(personalCopy.includedStepIdsByFlow[flowSlug] ?? []);
  const excludedIds = new Set(personalCopy.excludedStepIdsByFlow[flowSlug] ?? []);
  if (included) {
    includedIds.add(stepId);
    excludedIds.delete(stepId);
  } else {
    includedIds.delete(stepId);
    excludedIds.add(stepId);
  }
  personalCopy.includedStepIdsByFlow[flowSlug] = Array.from(includedIds);
  personalCopy.excludedStepIdsByFlow[flowSlug] = Array.from(excludedIds);
}

function removeConflictOverrides(
  override: SourceBackedFlowMapPersonalCopyStepOverride,
  conflictFields: FlowVersionConflictField[],
): SourceBackedFlowMapPersonalCopyStepOverride | undefined {
  const next = { ...override };
  if (conflictFields.includes('title')) delete next.title;
  if (conflictFields.includes('memo')) delete next.userMemo;
  if (conflictFields.includes('date')) delete next.schedule;
  return Object.keys(next).length > 0 ? next : undefined;
}

export function buildFlowVersionReviewPersonalCopy(options: {
  review: FlowVersionReview;
  savedRecord: SourceBackedFlowMapPersistenceRecord;
  personalCopy?: SourceBackedFlowMapPersonalCopy;
  selections: FlowVersionReviewSelections;
  flowSlug?: string;
}): FlowVersionReviewPersonalCopyResult {
  const personalCopy = clonePersonalCopy(options.personalCopy, options.savedRecord);
  const relevantItems = options.review.items.filter((item) => !options.flowSlug || item.flowSlug === options.flowSlug);
  const unresolvedKeys = relevantItems.filter((item) => !options.selections[item.key]).map((item) => item.key);
  if (unresolvedKeys.length > 0) return { unresolvedKeys };

  relevantItems.forEach((item) => {
    const selection = options.selections[item.key];
    const flowOverrides = personalCopy.stepOverridesByFlow?.[item.flowSlug] ?? {};
    const retainedSteps = personalCopy.retainedStepsByFlow?.[item.flowSlug] ?? {};

    if (item.kind === 'added') {
      setIncluded(personalCopy, item.flowSlug, item.stepId, selection === 'include');
      return;
    }

    if (item.kind === 'removed') {
      const keep = selection === 'keep_removed';
      setIncluded(personalCopy, item.flowSlug, item.stepId, keep);
      if (keep && item.previous) {
        personalCopy.retainedStepsByFlow = personalCopy.retainedStepsByFlow ?? {};
        personalCopy.retainedStepsByFlow[item.flowSlug] = { ...retainedSteps, [item.stepId]: structuredClone(item.previous) };
      } else if (personalCopy.retainedStepsByFlow?.[item.flowSlug]) {
        delete personalCopy.retainedStepsByFlow[item.flowSlug][item.stepId];
      }
      return;
    }

    setIncluded(personalCopy, item.flowSlug, item.stepId, true);
    if (selection === 'keep_current' && item.previous) {
      personalCopy.retainedStepsByFlow = personalCopy.retainedStepsByFlow ?? {};
      personalCopy.retainedStepsByFlow[item.flowSlug] = { ...retainedSteps, [item.stepId]: structuredClone(item.previous) };
      return;
    }
    if (personalCopy.retainedStepsByFlow?.[item.flowSlug]) {
      delete personalCopy.retainedStepsByFlow[item.flowSlug][item.stepId];
    }
    if (selection === 'use_latest' && flowOverrides[item.stepId]) {
      const nextOverride = removeConflictOverrides(flowOverrides[item.stepId], item.conflictFields);
      personalCopy.stepOverridesByFlow = personalCopy.stepOverridesByFlow ?? {};
      if (nextOverride) personalCopy.stepOverridesByFlow[item.flowSlug] = { ...flowOverrides, [item.stepId]: nextOverride };
      else {
        const nextFlowOverrides = { ...flowOverrides };
        delete nextFlowOverrides[item.stepId];
        if (Object.keys(nextFlowOverrides).length > 0) personalCopy.stepOverridesByFlow[item.flowSlug] = nextFlowOverrides;
        else delete personalCopy.stepOverridesByFlow[item.flowSlug];
      }
    }
  });

  Object.keys(personalCopy.retainedStepsByFlow ?? {}).forEach((flowSlug) => {
    if (Object.keys(personalCopy.retainedStepsByFlow?.[flowSlug] ?? {}).length === 0) {
      delete personalCopy.retainedStepsByFlow?.[flowSlug];
    }
  });
  if (Object.keys(personalCopy.retainedStepsByFlow ?? {}).length === 0) delete personalCopy.retainedStepsByFlow;
  if (Object.keys(personalCopy.stepOverridesByFlow ?? {}).length === 0) delete personalCopy.stepOverridesByFlow;

  return { personalCopy, unresolvedKeys: [] };
}
