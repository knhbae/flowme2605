import type {
  AuthoringCorrectionOperation,
  AuthoringLink,
  AuthoringParseResult,
  AuthoringProperty,
  AuthoringRevisionActor,
  AuthoringRevisionSnapshot,
  AuthoringSchedule,
  BlockToCanonicalMapping,
  CanonicalAuthoringItem,
  CanonicalAuthoringStep,
  DraftRevision,
  TextAuthoringDocument,
  TextAuthoringOwnership,
  UnresolvedAuthoringIssue,
} from './types';
import {
  cloneAuthoringValue,
  stableAuthoringId,
  stableAuthoringJson,
} from './identity';
import {
  allowedAuthoringIssueOutcomes,
} from './issue-state';
import {
  createTextAuthoringDocument,
  deriveAuthoringArtifactEligibility,
  parseExplicitAuthoringSchedule,
} from './parser';
import {
  deriveAuthoringLifecycleStatus,
} from './review-policy';
import {
  applyAuthoringSourceUpdate,
  rejectAuthoringSourceUpdate,
  resolveAuthoringSourceUpdateChange,
  stageAuthoringSourceUpdate,
} from './source-update';

export type ApplyAuthoringOperationOptions = {
  actorLane?: AuthoringRevisionActor;
  now?: string;
};

const PROPERTY_LABELS: Record<
  Extract<AuthoringCorrectionOperation, { type: 'set_property' }>['key'],
  string
> = {
  title: '제목',
  detail: '설명',
  completion: '완료 기준',
  date: '날짜',
  relative_date: '상대 날짜',
  time: '시간',
  timezone: '시간대',
  place: '장소',
  duration: '소요 시간',
  repeat: '반복',
  condition: '조건',
  resource: '자료',
  source: '출처',
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueLinks(links: AuthoringLink[]): AuthoringLink[] {
  const seen = new Set<string>();
  return links.filter((link) => {
    const identity = `${link.owner ?? ''}|${link.type ?? ''}|${link.url}|${link.label}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function itemById(
  parseResult: AuthoringParseResult,
  itemId: string,
): CanonicalAuthoringItem | undefined {
  return parseResult.canonical.items.find((item) => item.itemId === itemId);
}

function sharesSourceRows(
  sourceRowIds: string[],
  targetSourceRowIds: Set<string>,
): boolean {
  return sourceRowIds.some((sourceRowId) => targetSourceRowIds.has(sourceRowId));
}

function restoreItemToParsedSource(
  document: TextAuthoringDocument,
  itemId: string,
): boolean {
  const parseResult = document.parseResult;
  const selected = itemById(parseResult, itemId);
  if (!selected || selected.sourceRowIds.length === 0) return false;

  const baseline = createTextAuthoringDocument(document.rawText, {
    documentId: document.documentId,
    fixtureVersion: document.parseResult.fixtureVersion,
    ownership: document.ownership,
    title: document.title,
    ...(document.sourceTitle ? { sourceTitle: document.sourceTitle } : {}),
    ...(document.sourceUrl ? { sourceUrl: document.sourceUrl } : {}),
    now: document.createdAt,
  });
  const targetSourceRowIds = new Set(selected.sourceRowIds);
  const baselineItems = baseline.parseResult.canonical.items.filter((item) => (
    sharesSourceRows(item.sourceRowIds, targetSourceRowIds)
  ));
  const currentAffectedItemIds = new Set(
    parseResult.canonical.items
      .filter((item) => sharesSourceRows(item.sourceRowIds, targetSourceRowIds))
      .map((item) => item.itemId),
  );
  if (baselineItems.length === 0 && currentAffectedItemIds.size === 0) {
    return false;
  }

  const remainingItems = parseResult.canonical.items.filter(
    (item) => !currentAffectedItemIds.has(item.itemId),
  );
  const baselineOrder = baseline.parseResult.canonical.items.map(
    (item) => item.itemId,
  );
  const baselineTargetIds = new Set(baselineItems.map((item) => item.itemId));
  const firstTargetIndex = baselineOrder.findIndex((id) => baselineTargetIds.has(id));
  const previousBaselineId = baselineOrder
    .slice(0, Math.max(0, firstTargetIndex))
    .reverse()
    .find((id) => remainingItems.some((item) => item.itemId === id));
  const nextBaselineId = baselineOrder
    .slice(firstTargetIndex + baselineItems.length)
    .find((id) => remainingItems.some((item) => item.itemId === id));
  let insertionIndex = remainingItems.length;
  if (previousBaselineId) {
    insertionIndex =
      remainingItems.findIndex((item) => item.itemId === previousBaselineId) + 1;
  } else if (nextBaselineId) {
    insertionIndex = remainingItems.findIndex(
      (item) => item.itemId === nextBaselineId,
    );
  } else if (firstTargetIndex >= 0) {
    insertionIndex = Math.min(firstTargetIndex, remainingItems.length);
  }
  const restoredItems = baselineItems.map(cloneAuthoringValue);
  const nextItems = [
    ...remainingItems.slice(0, insertionIndex),
    ...restoredItems,
    ...remainingItems.slice(insertionIndex),
  ];
  nextItems.forEach((item, index) => {
    item.order = index;
  });

  const canonical = parseResult.canonical;
  const baselineCanonical = baseline.parseResult.canonical;
  const baselineStepIds = new Set(canonical.steps.map((step) => step.stepId));
  baselineItems.forEach((item) => {
    if (baselineStepIds.has(item.stepId)) return;
    const step = baselineCanonical.steps.find(
      (candidate) => candidate.stepId === item.stepId,
    );
    if (!step) return;
    canonical.steps.push(cloneAuthoringValue(step));
    baselineStepIds.add(step.stepId);
    if (!canonical.flow.stepIds.includes(step.stepId)) {
      canonical.flow.stepIds.push(step.stepId);
    }
  });
  canonical.items = nextItems;
  canonical.steps.forEach((step) => {
    step.itemIds = nextItems
      .filter((item) => item.stepId === step.stepId)
      .map((item) => item.itemId);
  });

  parseResult.mappings = [
    ...parseResult.mappings.filter(
      (mapping) => !sharesSourceRows(mapping.sourceLineage, targetSourceRowIds),
    ),
    ...baseline.parseResult.mappings
      .filter((mapping) => (
        sharesSourceRows(mapping.sourceLineage, targetSourceRowIds)
      ))
      .map(cloneAuthoringValue),
  ];
  parseResult.issues = [
    ...parseResult.issues.filter(
      (issue) => !sharesSourceRows(issue.sourceRowIds, targetSourceRowIds),
    ),
    ...baseline.parseResult.issues
      .filter((issue) => sharesSourceRows(issue.sourceRowIds, targetSourceRowIds))
      .map(cloneAuthoringValue),
  ];
  canonical.fields = [
    ...canonical.fields.filter(
      (field) => !sharesSourceRows(field.sourceRowIds, targetSourceRowIds),
    ),
    ...baselineCanonical.fields
      .filter((field) => sharesSourceRows(field.sourceRowIds, targetSourceRowIds))
      .map(cloneAuthoringValue),
  ];
  canonical.memos = [
    ...canonical.memos.filter(
      (memo) => !sharesSourceRows(memo.sourceRowIds, targetSourceRowIds),
    ),
    ...baselineCanonical.memos
      .filter((memo) => sharesSourceRows(memo.sourceRowIds, targetSourceRowIds))
      .map(cloneAuthoringValue),
  ];
  canonical.sourceRefs = [
    ...canonical.sourceRefs.filter(
      (sourceRef) => (
        !sharesSourceRows(sourceRef.sourceRowIds, targetSourceRowIds)
      ),
    ),
    ...baselineCanonical.sourceRefs
      .filter((sourceRef) => (
        sharesSourceRows(sourceRef.sourceRowIds, targetSourceRowIds)
      ))
      .map(cloneAuthoringValue),
  ];
  return true;
}

function latestOwnedValue<T>(
  values: Partial<Record<TextAuthoringOwnership, T>> | undefined,
): T | undefined {
  return values ? Object.values(values).at(-1) : undefined;
}

function setOwnedTitle(
  item: CanonicalAuthoringItem,
  actorLane: TextAuthoringOwnership,
  title: string,
): void {
  const overrides = { ...(item.titleOverrides ?? {}) };
  delete overrides[actorLane];
  overrides[actorLane] = title;
  item.titleOverrides = overrides;
  item.title = title;
  if (actorLane === 'creator') item.creatorTitle = title;
}

function setOwnedDetail(
  item: CanonicalAuthoringItem,
  actorLane: TextAuthoringOwnership,
  detail: string | undefined,
): void {
  const overrides = { ...(item.detailOverrides ?? {}) };
  delete overrides[actorLane];
  if (detail) overrides[actorLane] = detail;
  item.detailOverrides = Object.keys(overrides).length > 0 ? overrides : undefined;
  item.detail = detail ?? latestOwnedValue(overrides) ?? item.sourceDetail;
  if (actorLane === 'creator') item.creatorDetail = detail;
}

function setOwnedCompletion(
  item: CanonicalAuthoringItem,
  actorLane: TextAuthoringOwnership,
  completion: CanonicalAuthoringItem['completion'],
): void {
  if (
    !item.sourceCompletion
    && !item.completionOverrides
    && item.completion?.owner === 'source'
  ) {
    item.sourceCompletion = cloneAuthoringValue(item.completion);
  }
  const overrides = { ...(item.completionOverrides ?? {}) };
  delete overrides[actorLane];
  if (completion) overrides[actorLane] = completion;
  item.completionOverrides = Object.keys(overrides).length > 0
    ? overrides
    : undefined;
  item.completion = completion ?? latestOwnedValue(overrides) ?? item.sourceCompletion;
}

function setOwnedSchedule(
  item: CanonicalAuthoringItem,
  actorLane: TextAuthoringOwnership,
  schedule: AuthoringSchedule | undefined,
): void {
  if (!item.sourceSchedule && !item.scheduleOverrides && item.schedule) {
    item.sourceSchedule = cloneAuthoringValue(item.schedule);
  }
  const overrides = { ...(item.scheduleOverrides ?? {}) };
  delete overrides[actorLane];
  if (schedule) overrides[actorLane] = schedule;
  item.scheduleOverrides = Object.keys(overrides).length > 0 ? overrides : undefined;
  item.schedule = schedule ?? latestOwnedValue(overrides) ?? item.sourceSchedule;
}

function normalizeCanonicalOrder(parseResult: AuthoringParseResult): void {
  const canonical = parseResult.canonical;
  const byId = new Map(canonical.items.map((item) => [item.itemId, item]));
  const orderedIds: string[] = [];
  canonical.steps
    .sort((left, right) => left.order - right.order)
    .forEach((step, stepIndex) => {
      step.order = stepIndex;
      step.itemIds = step.itemIds.filter((itemId, index, values) => (
        byId.has(itemId) && values.indexOf(itemId) === index
      ));
      step.itemIds.forEach((itemId) => {
        if (!orderedIds.includes(itemId)) orderedIds.push(itemId);
      });
    });
  canonical.items.forEach((item) => {
    if (!orderedIds.includes(item.itemId)) orderedIds.push(item.itemId);
  });
  canonical.items = orderedIds
    .map((itemId) => byId.get(itemId))
    .filter((item): item is CanonicalAuthoringItem => Boolean(item));
  canonical.items.forEach((item, index) => {
    item.order = index;
  });
}

function markMappingsCorrected(
  mappings: BlockToCanonicalMapping[],
  itemIds: string[],
): void {
  const targets = new Set(itemIds);
  mappings.forEach((mapping) => {
    if (targets.has(mapping.targetDraftId)) mapping.userCorrected = true;
  });
}

function remapOwnedEntities(
  parseResult: AuthoringParseResult,
  removedIds: Set<string>,
  targetId: string,
): void {
  parseResult.canonical.fields.forEach((field) => {
    if (field.owner.type === 'item' && removedIds.has(field.owner.id)) {
      field.owner = { type: 'item', id: targetId };
    }
  });
  parseResult.canonical.memos.forEach((memo) => {
    if (memo.scope.type === 'item' && removedIds.has(memo.scope.id)) {
      memo.scope = { type: 'item', id: targetId };
    }
  });
  parseResult.canonical.sourceRefs.forEach((sourceRef) => {
    if (sourceRef.entityType === 'item' && removedIds.has(sourceRef.entityId)) {
      sourceRef.entityId = targetId;
    }
  });
}

function completionIdentity(
  value: NonNullable<CanonicalAuthoringItem['completion']>,
): string {
  return stableAuthoringJson({ mode: value.mode, doneWhen: value.doneWhen });
}

function scheduleIdentity(value: AuthoringSchedule): string {
  return stableAuthoringJson(value);
}

function hasConflictingValues<T>(
  values: Array<T | undefined>,
  identity: (value: T) => string,
): boolean {
  return new Set(
    values.flatMap((value) => (value === undefined ? [] : [identity(value)])),
  ).size > 1;
}

function mergedCompletion(
  values: Array<CanonicalAuthoringItem['completion']>,
): CanonicalAuthoringItem['completion'] {
  const present = values.filter(
    (value): value is NonNullable<CanonicalAuthoringItem['completion']> => (
      Boolean(value)
    ),
  );
  if (present.length === 0) return undefined;
  return {
    ...cloneAuthoringValue(present[0]),
    sourceRowIds: unique(present.flatMap((value) => value.sourceRowIds)),
  };
}

function mergedSchedule(
  values: Array<AuthoringSchedule | undefined>,
): AuthoringSchedule | undefined {
  const present = values.find(
    (value): value is AuthoringSchedule => value !== undefined,
  );
  return present ? cloneAuthoringValue(present) : undefined;
}

function effectivePropertyValues(item: CanonicalAuthoringItem): Map<string, string> {
  const values = new Map<string, string>();
  item.properties.forEach((property) => {
    values.set(property.key, property.value);
  });
  return values;
}

function hasConflictingMergeProperties(items: CanonicalAuthoringItem[]): boolean {
  const valuesByKey = new Map<string, Set<string>>();
  items.forEach((item) => {
    effectivePropertyValues(item).forEach((value, key) => {
      const values = valuesByKey.get(key) ?? new Set<string>();
      values.add(value);
      valuesByKey.set(key, values);
    });
  });
  return [...valuesByKey.values()].some((values) => values.size > 1);
}

function sourceCompletionValue(
  item: CanonicalAuthoringItem,
): CanonicalAuthoringItem['completion'] {
  return item.sourceCompletion
    ?? (item.completion?.owner === 'source' ? item.completion : undefined);
}

function sourceScheduleValue(
  item: CanonicalAuthoringItem,
): AuthoringSchedule | undefined {
  return item.sourceSchedule
    ?? (!item.scheduleOverrides ? item.schedule : undefined);
}

const MERGE_OWNER_LANES: TextAuthoringOwnership[] = [
  'personal',
  'creator',
  'suggestion',
];

function mergeItems(
  parseResult: AuthoringParseResult,
  requestedIds: string[],
  actorLane: TextAuthoringOwnership,
): boolean {
  const requested = new Set(requestedIds);
  if (requested.size < 2) return false;
  const selected = parseResult.canonical.items.filter((item) => (
    requested.has(item.itemId)
  ));
  if (selected.length !== requested.size) return false;
  const stepId = selected[0].stepId;
  if (selected.some((item) => item.stepId !== stepId)) return false;
  const step = parseResult.canonical.steps.find(
    (candidate) => candidate.stepId === stepId,
  );
  if (!step) return false;
  const selectedPositions = selected
    .map((item) => step.itemIds.indexOf(item.itemId))
    .sort((left, right) => left - right);
  if (selectedPositions.some((position) => position < 0)) return false;
  if (selectedPositions.some((
    position,
    index,
  ) => index > 0 && position !== selectedPositions[index - 1] + 1)) {
    return false;
  }
  if (
    hasConflictingValues(
      selected.map((item) => item.sourceChecked),
      (value) => String(value),
    )
    || hasConflictingValues(
      selected.map((item) => item.completion),
      completionIdentity,
    )
    || hasConflictingValues(
      selected.map(sourceCompletionValue),
      completionIdentity,
    )
    || hasConflictingValues(
      selected.map((item) => item.schedule),
      scheduleIdentity,
    )
    || hasConflictingValues(
      selected.map(sourceScheduleValue),
      scheduleIdentity,
    )
    || MERGE_OWNER_LANES.some((lane) => (
      hasConflictingValues(
        selected.map((item) => item.completionOverrides?.[lane]),
        completionIdentity,
      )
      || hasConflictingValues(
        selected.map((item) => item.scheduleOverrides?.[lane]),
        scheduleIdentity,
      )
    ))
    || hasConflictingMergeProperties(selected)
  ) {
    return false;
  }
  const base = selected[0];
  const removed = selected.slice(1);
  const removedIds = new Set(removed.map((item) => item.itemId));
  const mergedTitle = selected.map((item) => item.title).join(' · ');
  const mergedDetails = unique(
    selected
      .map((item) => item.detail)
      .filter((value): value is string => Boolean(value)),
  );

  setOwnedTitle(base, actorLane, mergedTitle);
  if (mergedDetails.length > 0) {
    setOwnedDetail(base, actorLane, mergedDetails.join('\n'));
  }
  const mergedSourceChecked = selected
    .map((item) => item.sourceChecked)
    .find((value): value is boolean => value !== undefined);
  if (mergedSourceChecked === undefined) delete base.sourceChecked;
  else base.sourceChecked = mergedSourceChecked;
  base.completion = mergedCompletion(selected.map((item) => item.completion));
  base.sourceCompletion = mergedCompletion(selected.map(sourceCompletionValue));
  const completionOverrides = Object.fromEntries(
    MERGE_OWNER_LANES.flatMap((lane) => {
      const completion = mergedCompletion(
        selected.map((item) => item.completionOverrides?.[lane]),
      );
      return completion ? [[lane, completion]] : [];
    }),
  ) as NonNullable<CanonicalAuthoringItem['completionOverrides']>;
  base.completionOverrides = Object.keys(completionOverrides).length > 0
    ? completionOverrides
    : undefined;
  base.schedule = mergedSchedule(selected.map((item) => item.schedule));
  base.sourceSchedule = mergedSchedule(selected.map(sourceScheduleValue));
  const scheduleOverrides = Object.fromEntries(
    MERGE_OWNER_LANES.flatMap((lane) => {
      const schedule = mergedSchedule(
        selected.map((item) => item.scheduleOverrides?.[lane]),
      );
      return schedule ? [[lane, schedule]] : [];
    }),
  ) as NonNullable<CanonicalAuthoringItem['scheduleOverrides']>;
  base.scheduleOverrides = Object.keys(scheduleOverrides).length > 0
    ? scheduleOverrides
    : undefined;
  base.sourceRowIds = unique(selected.flatMap((item) => item.sourceRowIds));
  base.properties = selected.flatMap((item) => item.properties);
  base.resources = uniqueLinks(selected.flatMap((item) => item.resources));
  base.sources = uniqueLinks(selected.flatMap((item) => item.sources));
  base.guides = unique(selected.flatMap((item) => item.guides));
  base.cautions = unique(selected.flatMap((item) => item.cautions));
  base.included = selected.some((item) => item.included);
  base.nestingLevel = Math.min(...selected.map((item) => item.nestingLevel));

  parseResult.canonical.items = parseResult.canonical.items.filter(
    (item) => !removedIds.has(item.itemId),
  );
  parseResult.canonical.steps.forEach((step) => {
    const hadRemoved = step.itemIds.some((itemId) => removedIds.has(itemId));
    step.itemIds = step.itemIds.filter((itemId) => !removedIds.has(itemId));
    if (
      hadRemoved
      && step.stepId === base.stepId
      && !step.itemIds.includes(base.itemId)
    ) {
      step.itemIds.push(base.itemId);
    }
  });
  parseResult.mappings.forEach((mapping) => {
    if (removedIds.has(mapping.targetDraftId)) {
      mapping.targetDraftId = base.itemId;
      mapping.userCorrected = true;
    }
  });
  markMappingsCorrected(parseResult.mappings, [base.itemId]);
  remapOwnedEntities(parseResult, removedIds, base.itemId);
  normalizeCanonicalOrder(parseResult);
  return true;
}

function duplicateMappingsForSplit(
  mappings: BlockToCanonicalMapping[],
  documentId: string,
  sourceItemId: string,
  newItemId: string,
): void {
  const copies = mappings
    .filter((mapping) => mapping.targetDraftId === sourceItemId)
    .map((mapping): BlockToCanonicalMapping => ({
      ...cloneAuthoringValue(mapping),
      mappingId: stableAuthoringId(
        'mapping',
        documentId,
        mapping.mappingId,
        'split',
        newItemId,
      ),
      targetDraftId: newItemId,
      userCorrected: true,
    }));
  mappings.forEach((mapping) => {
    if (mapping.targetDraftId === sourceItemId) mapping.userCorrected = true;
  });
  mappings.push(...copies);
}

function duplicateOwnedEntitiesForSplit(
  document: TextAuthoringDocument,
  sourceItemId: string,
  newItemId: string,
): void {
  const canonical = document.parseResult.canonical;
  canonical.fields.push(
    ...canonical.fields
      .filter((field) => field.owner.type === 'item' && field.owner.id === sourceItemId)
      .map((field) => ({
        ...cloneAuthoringValue(field),
        fieldId: stableAuthoringId(
          'field',
          document.documentId,
          field.fieldId,
          'split',
          newItemId,
        ),
        owner: { type: 'item' as const, id: newItemId },
      })),
  );
  canonical.memos.push(
    ...canonical.memos
      .filter((memo) => memo.scope.type === 'item' && memo.scope.id === sourceItemId)
      .map((memo) => ({
        ...cloneAuthoringValue(memo),
        memoId: stableAuthoringId(
          'memo',
          document.documentId,
          memo.memoId,
          'split',
          newItemId,
        ),
        scope: { type: 'item' as const, id: newItemId },
      })),
  );
  canonical.sourceRefs.push(
    ...canonical.sourceRefs
      .filter((sourceRef) => (
        sourceRef.entityType === 'item' && sourceRef.entityId === sourceItemId
      ))
      .map((sourceRef) => ({
        ...cloneAuthoringValue(sourceRef),
        sourceRefId: stableAuthoringId(
          'source-ref',
          document.documentId,
          sourceRef.sourceRefId,
          'split',
          newItemId,
        ),
        entityId: newItemId,
      })),
  );
}

function splitItem(
  document: TextAuthoringDocument,
  itemId: string,
  at: number,
  actorLane: TextAuthoringOwnership,
): boolean {
  const parseResult = document.parseResult;
  const item = itemById(parseResult, itemId);
  if (!item || at <= 0 || at >= item.title.length) return false;
  const left = item.title.slice(0, at).trim();
  const right = item.title.slice(at).trim();
  if (!left || !right) return false;
  const existingIds = new Set(
    parseResult.canonical.items.map((candidate) => candidate.itemId),
  );
  let discriminator = 0;
  let newItemId = stableAuthoringId(
    'item',
    document.documentId,
    item.itemId,
    'split',
    at,
    right,
    discriminator,
  );
  while (existingIds.has(newItemId)) {
    discriminator += 1;
    newItemId = stableAuthoringId(
      'item',
      document.documentId,
      item.itemId,
      'split',
      at,
      right,
      discriminator,
    );
  }
  const second: CanonicalAuthoringItem = {
    ...cloneAuthoringValue(item),
    itemId: newItemId,
    properties: item.properties.map((property) => ({
      ...cloneAuthoringValue(property),
      propertyId: stableAuthoringId(
        'property',
        document.documentId,
        property.propertyId,
        'split',
        newItemId,
      ),
    })),
  };
  setOwnedTitle(second, actorLane, right);
  setOwnedTitle(item, actorLane, left);
  const itemIndex = parseResult.canonical.items.findIndex(
    (candidate) => candidate.itemId === itemId,
  );
  parseResult.canonical.items.splice(itemIndex + 1, 0, second);
  const step = parseResult.canonical.steps.find(
    (candidate) => candidate.stepId === item.stepId,
  );
  if (step) {
    const stepIndex = step.itemIds.indexOf(itemId);
    step.itemIds.splice(stepIndex + 1, 0, newItemId);
  }
  duplicateMappingsForSplit(
    parseResult.mappings,
    document.documentId,
    itemId,
    newItemId,
  );
  duplicateOwnedEntitiesForSplit(document, itemId, newItemId);
  normalizeCanonicalOrder(parseResult);
  return true;
}

function reorderItem(
  parseResult: AuthoringParseResult,
  itemId: string,
  toIndex: number,
): boolean {
  const item = itemById(parseResult, itemId);
  if (!item) return false;
  const step = parseResult.canonical.steps.find(
    (candidate) => candidate.stepId === item.stepId,
  );
  if (!step) return false;
  const globalItems = [...parseResult.canonical.items];
  const fromIndex = globalItems.findIndex((candidate) => candidate.itemId === itemId);
  if (fromIndex < 0) return false;
  const boundedIndex = Math.max(0, Math.min(globalItems.length - 1, toIndex));
  if (boundedIndex === fromIndex) return false;
  const [moved] = globalItems.splice(fromIndex, 1);
  globalItems.splice(boundedIndex, 0, moved);
  const nextStepItemIds = globalItems
    .filter((candidate) => candidate.stepId === step.stepId)
    .map((candidate) => candidate.itemId);
  if (nextStepItemIds.join('|') === step.itemIds.join('|')) return false;
  step.itemIds = nextStepItemIds;
  markMappingsCorrected(parseResult.mappings, [itemId]);
  normalizeCanonicalOrder(parseResult);
  return true;
}

type SourceLine = {
  content: string;
  eol: string;
  originalLine: number;
  startOffset: number;
};

function splitSourceLinesWithEndings(rawText: string): SourceLine[] {
  const lines: SourceLine[] = [];
  const matcher = /([^\r\n]*)(\r\n|\r|\n|$)/gu;
  let match: RegExpExecArray | null;
  let originalLine = 1;
  while ((match = matcher.exec(rawText)) !== null) {
    if (match[0] === '') break;
    lines.push({
      content: match[1],
      eol: match[2],
      originalLine,
      startOffset: match.index,
    });
    originalLine += 1;
    if (match[2] === '') break;
  }
  if (lines.length === 0) {
    lines.push({ content: '', eol: '', originalLine: 1, startOffset: 0 });
  }
  return lines;
}

function itemSourceStartLine(
  parseResult: AuthoringParseResult,
  itemId: string,
): number | undefined {
  const mapping = parseResult.mappings.find((candidate) => (
    candidate.targetKind === 'item' && candidate.targetDraftId === itemId
  ));
  const blockIds = new Set(mapping?.blockIds ?? []);
  const line = parseResult.blocks
    .filter((block) => blockIds.has(block.blockId))
    .map((block) => block.sourceRange.startLine)
    .sort((left, right) => left - right)[0];
  return line;
}

function hasDuplicateItemSourceBlock(
  parseResult: AuthoringParseResult,
): boolean {
  return parseResult.canonical.steps.some((step) => {
    const seen = new Set<string>();
    return step.itemIds.some((itemId) => {
      const mapping = parseResult.mappings.find((candidate) => (
        candidate.targetKind === 'item'
        && candidate.targetDraftId === itemId
      ));
      const blockId = mapping?.blockIds[0];
      if (!blockId) return false;
      if (seen.has(blockId)) return true;
      seen.add(blockId);
      return false;
    });
  });
}

function rewriteSourceRanges(
  parseResult: AuthoringParseResult,
  oldLines: SourceLine[],
  nextLines: SourceLine[],
): void {
  const oldByNumber = new Map(oldLines.map((line) => [line.originalLine, line]));
  const nextIndexByOriginal = new Map<number, number>();
  const nextStartOffsets: number[] = [];
  let cursor = 0;
  nextLines.forEach((line, index) => {
    nextIndexByOriginal.set(line.originalLine, index);
    nextStartOffsets[index] = cursor;
    cursor += line.content.length + line.eol.length;
  });

  const rewrite = (range: {
    startOffset: number;
    endOffset: number;
    startLine: number;
    endLine: number;
  }): void => {
    const oldStart = oldByNumber.get(range.startLine);
    const oldEnd = oldByNumber.get(range.endLine);
    const nextStartIndex = nextIndexByOriginal.get(range.startLine);
    const nextEndIndex = nextIndexByOriginal.get(range.endLine);
    if (
      !oldStart
      || !oldEnd
      || nextStartIndex == null
      || nextEndIndex == null
    ) return;
    const startColumn = Math.max(0, range.startOffset - oldStart.startOffset);
    const endColumn = Math.max(0, range.endOffset - oldEnd.startOffset);
    range.startLine = nextStartIndex + 1;
    range.endLine = nextEndIndex + 1;
    range.startOffset = nextStartOffsets[nextStartIndex] + startColumn;
    range.endOffset = nextStartOffsets[nextEndIndex] + endColumn;
  };

  parseResult.canonical.sourceRows.forEach((row) => rewrite(row.sourceRange));
  parseResult.blocks.forEach((block) => rewrite(block.sourceRange));
  parseResult.issues.forEach((issue) => rewrite(issue.sourceRange));
  parseResult.canonical.sourceRows.sort((left, right) => (
    left.sourceRange.startOffset - right.sourceRange.startOffset
  ));
  parseResult.canonical.sourceRows.forEach((row, index) => {
    row.order = index;
  });
  parseResult.blocks.sort((left, right) => (
    left.sourceRange.startOffset - right.sourceRange.startOffset
  ));
  parseResult.blocks.forEach((block, index) => {
    block.order = index;
  });
}

/**
 * Rewrites only the captured source Item blocks, after an explicit user action.
 * Step headings stay fixed, properties travel with their owning Item, and all
 * stable IDs/source lineage remain unchanged. The revision snapshot makes the
 * raw rewrite and canonical reorder a single undoable transaction.
 */
function alignSourceOrder(
  document: TextAuthoringDocument,
  orderedItemIds: string[],
): boolean {
  const parseResult = document.parseResult;
  if (hasDuplicateItemSourceBlock(parseResult)) return false;
  const requestedRank = new Map(
    orderedItemIds.map((itemId, index) => [itemId, index]),
  );
  const oldLines = splitSourceLinesWithEndings(document.rawText);
  let nextLines = [...oldLines];
  let changed = false;

  const orderedSteps = [...parseResult.canonical.steps]
    .sort((left, right) => right.order - left.order);
  for (const step of orderedSteps) {
    const sourceItems = step.itemIds
      .map((itemId) => ({
        itemId,
        startLine: itemSourceStartLine(parseResult, itemId),
      }))
      .filter((entry): entry is { itemId: string; startLine: number } => (
        entry.startLine != null
      ))
      .sort((left, right) => left.startLine - right.startLine);
    if (sourceItems.length < 2) continue;

    const desired = [...sourceItems].sort((left, right) => {
      const leftRank = requestedRank.get(left.itemId);
      const rightRank = requestedRank.get(right.itemId);
      if (leftRank == null && rightRank == null) return left.startLine - right.startLine;
      if (leftRank == null) return 1;
      if (rightRank == null) return -1;
      return leftRank - rightRank;
    });
    if (desired.every((entry, index) => entry.itemId === sourceItems[index].itemId)) {
      continue;
    }

    const nextStepStart = parseResult.canonical.steps
      .filter((candidate) => candidate.order > step.order)
      .flatMap((candidate) => candidate.sourceRowIds)
      .map((sourceRowId) => parseResult.canonical.sourceRows.find(
        (row) => row.sourceRowId === sourceRowId,
      )?.sourceRange.startLine)
      .filter((line): line is number => line != null)
      .sort((left, right) => left - right)[0];
    const spanStart = sourceItems[0].startLine;
    const spanEndExclusive = nextStepStart ?? (oldLines.length + 1);
    const blocks = sourceItems.map((entry, index) => {
      const start = entry.startLine;
      const endExclusive = sourceItems[index + 1]?.startLine ?? spanEndExclusive;
      return {
        itemId: entry.itemId,
        lines: oldLines.slice(start - 1, endExclusive - 1),
      };
    });
    const blockById = new Map(blocks.map((block) => [block.itemId, block.lines]));
    const replacement = desired.flatMap((entry) => blockById.get(entry.itemId) ?? []);
    nextLines.splice(
      spanStart - 1,
      spanEndExclusive - spanStart,
      ...replacement,
    );

    step.itemIds = desired.map((entry) => entry.itemId);
    markMappingsCorrected(parseResult.mappings, step.itemIds);
    changed = true;
  }
  if (!changed) return false;

  const newline = document.rawText.includes('\r\n') ? '\r\n' : '\n';
  const sourceEndsWithNewline = /(?:\r\n|\r|\n)$/u.test(document.rawText);
  nextLines = nextLines.map((line, index) => ({
    ...line,
    eol: index < nextLines.length - 1
      ? (line.eol || newline)
      : sourceEndsWithNewline
        ? (line.eol || newline)
        : '',
  }));
  document.rawText = nextLines.map((line) => `${line.content}${line.eol}`).join('');
  rewriteSourceRanges(parseResult, oldLines, nextLines);
  normalizeCanonicalOrder(parseResult);
  return true;
}

function ownedProperty(
  document: TextAuthoringDocument,
  item: CanonicalAuthoringItem,
  key: string,
  value: string,
  actorLane: TextAuthoringOwnership,
): AuthoringProperty {
  const existing = item.properties.find((property) => (
    property.key === key && property.owner === actorLane
  ));
  if (existing) {
    existing.value = value;
    item.properties = item.properties.filter((property) => property !== existing);
    item.properties.push(existing);
    return existing;
  }
  const property: AuthoringProperty = {
    propertyId: stableAuthoringId(
      'property',
      document.documentId,
      item.itemId,
      key,
      actorLane,
    ),
    key,
    label: PROPERTY_LABELS[key as keyof typeof PROPERTY_LABELS] ?? key,
    value,
    sourceRowIds: [...item.sourceRowIds],
    owner: actorLane,
  };
  item.properties.push(property);
  return property;
}

function applyTimeProperty(
  schedule: AuthoringSchedule,
  key: string,
  value: string,
): AuthoringSchedule {
  if (key === 'time') {
    const match = /\b([01]\d|2[0-3]):([0-5]\d)\b/u.exec(value);
    return match ? { ...schedule, time: match[0] } : schedule;
  }
  if (key === 'timezone') return { ...schedule, timezone: value };
  if (key === 'repeat') return { ...schedule, repeat: value };
  if (key === 'duration') {
    const match = /(\d+)\s*(분|시간|minutes?|hours?)/iu.exec(value);
    if (!match) return schedule;
    const amount = Number(match[1]);
    return {
      ...schedule,
      durationMinutes: /시간|hours?/iu.test(match[2])
        ? amount * 60
        : amount,
    };
  }
  return schedule;
}

const SCHEDULE_DETAIL_KEYS = [
  'time',
  'timezone',
  'duration',
  'repeat',
] as const;

type ScheduleDetailKey = typeof SCHEDULE_DETAIL_KEYS[number];

function removeScheduleDetail(
  schedule: AuthoringSchedule,
  key: ScheduleDetailKey,
): AuthoringSchedule {
  const nextSchedule: AuthoringSchedule = { ...schedule };
  if (key === 'time') delete nextSchedule.time;
  if (key === 'timezone') delete nextSchedule.timezone;
  if (key === 'duration') delete nextSchedule.durationMinutes;
  if (key === 'repeat') delete nextSchedule.repeat;
  return nextSchedule;
}

function hasScheduleDetail(
  schedule: AuthoringSchedule | undefined,
  key: ScheduleDetailKey,
): boolean {
  if (!schedule) return false;
  if (key === 'duration') return schedule.durationMinutes != null;
  return Boolean(schedule[key]);
}

function preserveScheduleDetails(
  item: CanonicalAuthoringItem,
  actorLane: TextAuthoringOwnership,
  schedule: AuthoringSchedule,
  existingSchedule: AuthoringSchedule | undefined,
): AuthoringSchedule {
  let nextSchedule: AuthoringSchedule = { ...schedule };
  if (existingSchedule?.time) nextSchedule.time = existingSchedule.time;
  if (existingSchedule?.timezone) nextSchedule.timezone = existingSchedule.timezone;
  if (existingSchedule?.durationMinutes != null) {
    nextSchedule.durationMinutes = existingSchedule.durationMinutes;
  }
  if (existingSchedule?.repeat) nextSchedule.repeat = existingSchedule.repeat;
  if (
    nextSchedule.kind === 'relative'
    && existingSchedule?.kind === 'relative'
    && existingSchedule.anchorLabel
  ) {
    nextSchedule.anchorLabel = existingSchedule.anchorLabel;
  }

  SCHEDULE_DETAIL_KEYS.forEach((key) => {
    const actorProperty = [...item.properties].reverse().find((property) => (
      property.key === key && property.owner === actorLane
    ));
    const fallbackProperty = hasScheduleDetail(existingSchedule, key)
      ? undefined
      : [...item.properties].reverse().find((property) => property.key === key);
    const property = actorProperty ?? fallbackProperty;
    if (!property) return;
    nextSchedule = removeScheduleDetail(nextSchedule, key);
    if (property.value.trim()) {
      nextSchedule = applyTimeProperty(nextSchedule, key, property.value);
    }
  });

  return nextSchedule;
}

function linkFromOwnedValue(
  value: string,
  item: CanonicalAuthoringItem,
  type: AuthoringLink['type'],
  fallbackLabel: string,
  actorLane: TextAuthoringOwnership,
): AuthoringLink | undefined {
  const match = /https?:\/\/[^\s<>()\]]+/iu.exec(value);
  if (!match) return undefined;
  const label = value.slice(0, match.index).replace(/[|·-]+$/u, '').trim();
  return {
    label: label || fallbackLabel,
    url: match[0].replace(/[.,;:!?]+$/u, ''),
    type,
    owner: actorLane,
    sourceRowIds: [...item.sourceRowIds],
  };
}

function setItemProperty(
  document: TextAuthoringDocument,
  operation: Extract<AuthoringCorrectionOperation, { type: 'set_property' }>,
  actorLane: TextAuthoringOwnership,
): boolean {
  const item = itemById(document.parseResult, operation.itemId);
  if (!item) return false;
  const value = operation.value.trim();
  if (operation.key === 'title') {
    if (
      !value
      || (
        item.title === value
        && item.titleOverrides?.[actorLane] === value
      )
    ) {
      return false;
    }
    setOwnedTitle(item, actorLane, value);
  } else if (operation.key === 'detail') {
    if (
      item.detail === (value || undefined)
      && item.detailOverrides?.[actorLane] === (value || undefined)
    ) {
      return false;
    }
    setOwnedDetail(item, actorLane, value || undefined);
  } else if (operation.key === 'completion') {
    const completion: CanonicalAuthoringItem['completion'] = value
      ? {
          mode: item.intent === 'decide'
            ? 'decision'
            : item.intent === 'record'
              ? 'record'
              : 'check',
          doneWhen: value,
          sourceRowIds: [...item.sourceRowIds],
          owner: actorLane,
        }
      : undefined;
    setOwnedCompletion(item, actorLane, completion);
  } else {
    ownedProperty(document, item, operation.key, value, actorLane);
    if (operation.key === 'date') {
      const schedule = parseExplicitAuthoringSchedule(value);
      const existingSchedule = item.scheduleOverrides?.[actorLane] ?? item.schedule;
      setOwnedSchedule(
        item,
        actorLane,
        schedule?.kind === 'absolute'
          ? preserveScheduleDetails(item, actorLane, schedule, existingSchedule)
          : undefined,
      );
    } else if (operation.key === 'relative_date') {
      const schedule = parseExplicitAuthoringSchedule(value);
      const existingSchedule = item.scheduleOverrides?.[actorLane] ?? item.schedule;
      setOwnedSchedule(
        item,
        actorLane,
        schedule?.kind === 'relative'
          ? preserveScheduleDetails(item, actorLane, schedule, existingSchedule)
          : undefined,
      );
    } else if (
      operation.key === 'time'
      || operation.key === 'timezone'
      || operation.key === 'duration'
      || operation.key === 'repeat'
    ) {
      const ownedSchedule = item.scheduleOverrides?.[actorLane] ?? item.schedule;
      if (ownedSchedule) {
        if (!value) {
          setOwnedSchedule(
            item,
            actorLane,
            removeScheduleDetail(ownedSchedule, operation.key),
          );
        } else {
          setOwnedSchedule(
            item,
            actorLane,
            applyTimeProperty(ownedSchedule, operation.key, value),
          );
        }
      }
    } else if (operation.key === 'resource') {
      item.resources = item.resources.filter((link) => !(
        link.type === 'creator'
        && (link.owner ?? 'creator') === actorLane
      ));
      const link = linkFromOwnedValue(value, item, 'creator', '자료', actorLane);
      if (link) item.resources = uniqueLinks([...item.resources, link]);
    } else if (operation.key === 'source') {
      item.sources = item.sources.filter((link) => !(
        link.type === 'creator'
        && (link.owner ?? 'creator') === actorLane
      ));
      const link = linkFromOwnedValue(value, item, 'creator', '출처', actorLane);
      if (link) item.sources = uniqueLinks([...item.sources, link]);
    }
  }
  markMappingsCorrected(document.parseResult.mappings, [item.itemId]);
  return true;
}

type ClassifyIssueOperation = Extract<
  AuthoringCorrectionOperation,
  { type: 'classify_issue' }
>;

type IssueStepPlan = {
  stepId: string;
  createGenerated: boolean;
};

function sameIds(left: string[], right: string[]): boolean {
  return (
    left.length === right.length
    && left.every((id) => right.includes(id))
    && right.every((id) => left.includes(id))
  );
}

function issueMapping(
  parseResult: AuthoringParseResult,
  issue: UnresolvedAuthoringIssue,
): BlockToCanonicalMapping | undefined {
  const mappings = parseResult.mappings.filter((mapping) => (
    mapping.targetKind === 'unresolved'
    && mapping.targetDraftId === issue.issueId
  ));
  if (mappings.length !== 1) return undefined;
  const [mapping] = mappings;
  if (
    mapping.blockIds.length === 0
    || !sameIds(mapping.sourceLineage, issue.sourceRowIds)
    || mapping.blockIds.some((blockId) => (
      !parseResult.blocks.some((block) => block.blockId === blockId)
    ))
  ) {
    return undefined;
  }
  return mapping;
}

function mappingBlockOrder(
  parseResult: AuthoringParseResult,
  mapping: BlockToCanonicalMapping,
): number | undefined {
  const orders = mapping.blockIds.flatMap((blockId) => {
    const block = parseResult.blocks.find((candidate) => candidate.blockId === blockId);
    return block ? [block.order] : [];
  });
  return orders.length > 0 ? Math.min(...orders) : undefined;
}

function stepIdForMapping(
  parseResult: AuthoringParseResult,
  mapping: BlockToCanonicalMapping,
): string | undefined {
  const step = parseResult.canonical.steps.find(
    (candidate) => candidate.stepId === mapping.targetDraftId,
  );
  if (step) return step.stepId;
  return parseResult.canonical.items.find(
    (candidate) => candidate.itemId === mapping.targetDraftId,
  )?.stepId;
}

function resolveIssueStepPlan(
  document: TextAuthoringDocument,
  mapping: BlockToCanonicalMapping,
  requestedStepId: string | undefined,
): IssueStepPlan | undefined {
  const parseResult = document.parseResult;
  const steps = parseResult.canonical.steps;
  if (requestedStepId !== undefined) {
    const step = steps.find((candidate) => candidate.stepId === requestedStepId);
    return step ? { stepId: step.stepId, createGenerated: false } : undefined;
  }

  const issueBlocks = mapping.blockIds.flatMap((blockId) => {
    const block = parseResult.blocks.find((candidate) => candidate.blockId === blockId);
    return block ? [block] : [];
  });
  const parentBlockIds = new Set(
    issueBlocks.flatMap((block) => (
      block.parentBlockId ? [block.parentBlockId] : []
    )),
  );
  const parentStepIds = unique(
    parseResult.mappings.flatMap((candidate) => {
      if (!candidate.blockIds.some((blockId) => parentBlockIds.has(blockId))) return [];
      const stepId = stepIdForMapping(parseResult, candidate);
      return stepId ? [stepId] : [];
    }),
  );
  if (parentStepIds.length > 1) return undefined;
  if (parentStepIds.length === 1) {
    return { stepId: parentStepIds[0], createGenerated: false };
  }

  const issueOrder = mappingBlockOrder(parseResult, mapping);
  if (issueOrder !== undefined) {
    const preceding = parseResult.mappings
      .flatMap((candidate) => {
        if (candidate.mappingId === mapping.mappingId) return [];
        const order = mappingBlockOrder(parseResult, candidate);
        const stepId = stepIdForMapping(parseResult, candidate);
        return order !== undefined && order < issueOrder && stepId
          ? [{ order, stepId }]
          : [];
      })
      .sort((left, right) => right.order - left.order);
    if (preceding[0]) {
      const nearestStepIds = unique(
        preceding
          .filter((candidate) => candidate.order === preceding[0].order)
          .map((candidate) => candidate.stepId),
      );
      if (nearestStepIds.length !== 1) return undefined;
      return { stepId: nearestStepIds[0], createGenerated: false };
    }
  }

  if (steps.length === 1) {
    return { stepId: steps[0].stepId, createGenerated: false };
  }
  if (steps.length > 1) return undefined;
  return {
    stepId: stableAuthoringId('step', document.documentId, 'generated-default'),
    createGenerated: true,
  };
}

function ensureIssueStep(
  document: TextAuthoringDocument,
  plan: IssueStepPlan,
): CanonicalAuthoringStep {
  const canonical = document.parseResult.canonical;
  const existing = canonical.steps.find((step) => step.stepId === plan.stepId);
  if (existing) return existing;
  const step: CanonicalAuthoringStep = {
    stepId: plan.stepId,
    flowId: canonical.flow.flowId,
    title: '할 일',
    order: canonical.steps.length,
    itemIds: [],
    sourceRowIds: [],
    generated: true,
  };
  canonical.steps.push(step);
  if (!canonical.flow.stepIds.includes(step.stepId)) {
    canonical.flow.stepIds.push(step.stepId);
  }
  return step;
}

function classifiedItemIntent(
  title: string,
): CanonicalAuthoringItem['intent'] {
  if (/(결정|선택|비교|고르)/u.test(title)) return 'decide';
  if (/(확인|점검|검토|살펴|체크)/u.test(title)) return 'inspect';
  if (/https?:\/\//iu.test(title)) return 'use_resource';
  return 'act';
}

function itemMappingOrder(
  parseResult: AuthoringParseResult,
  itemId: string,
): number | undefined {
  const orders = parseResult.mappings.flatMap((mapping) => {
    if (mapping.targetDraftId !== itemId) return [];
    const order = mappingBlockOrder(parseResult, mapping);
    return order === undefined ? [] : [order];
  });
  return orders.length > 0 ? Math.max(...orders) : undefined;
}

function insertClassifiedItem(
  parseResult: AuthoringParseResult,
  step: CanonicalAuthoringStep,
  item: CanonicalAuthoringItem,
  mapping: BlockToCanonicalMapping,
): void {
  const issueOrder = mappingBlockOrder(parseResult, mapping);
  let insertAt = step.itemIds.length;
  if (issueOrder !== undefined) {
    const positionedItems = step.itemIds.flatMap((itemId, index) => {
      const order = itemMappingOrder(parseResult, itemId);
      return order === undefined ? [] : [{ index, order }];
    });
    const preceding = positionedItems
      .filter((candidate) => candidate.order < issueOrder)
      .sort((left, right) => right.order - left.order)[0];
    if (preceding) {
      insertAt = preceding.index + 1;
    } else {
      const following = positionedItems
        .filter((candidate) => candidate.order > issueOrder)
        .sort((left, right) => left.order - right.order)[0];
      if (following) insertAt = following.index;
    }
  }
  parseResult.canonical.items.push(item);
  step.itemIds.splice(insertAt, 0, item.itemId);
  normalizeCanonicalOrder(parseResult);
}

function classifyIssue(
  document: TextAuthoringDocument,
  operation: ClassifyIssueOperation,
  actorLane: TextAuthoringOwnership,
  decidedAt: string,
): boolean {
  const parseResult = document.parseResult;
  const issue = parseResult.issues.find(
    (candidate) => candidate.issueId === operation.issueId,
  );
  if (
    !issue
    || !allowedAuthoringIssueOutcomes(issue).includes(operation.outcome)
  ) {
    return false;
  }

  if (operation.outcome === 'hold') {
    parseResult.mappings.forEach((mapping) => {
      if (mapping.targetDraftId === issue.issueId) mapping.userCorrected = true;
    });
    issue.decision = {
      outcome: 'hold',
      state: 'held',
      targetKind: 'unresolved',
      actorLane,
      decidedAt,
    };
    return true;
  }

  const mapping = issueMapping(parseResult, issue);
  if (!mapping) return false;
  if (operation.outcome === 'keep_source_only') {
    mapping.userCorrected = true;
    issue.decision = {
      outcome: 'keep_source_only',
      state: 'resolved',
      targetKind: 'source',
      actorLane,
      decidedAt,
    };
    return true;
  }

  const sourceRowIds = [...issue.sourceRowIds];
  if (
    sourceRowIds.length === 0
    || unique(sourceRowIds).length !== sourceRowIds.length
  ) {
    return false;
  }
  const sourceRows = sourceRowIds.flatMap((sourceRowId) => {
    const row = parseResult.canonical.sourceRows.find(
      (candidate) => candidate.sourceRowId === sourceRowId,
    );
    return row ? [row] : [];
  });
  if (sourceRows.length !== sourceRowIds.length) return false;
  sourceRows.sort((left, right) => left.order - right.order);
  const sourceTitle = sourceRows
    .map((row) => row.rawText.trim())
    .filter(Boolean)
    .join(' ');
  const titleOverride = operation.titleOverride?.trim();
  if (!sourceTitle || (operation.titleOverride !== undefined && !titleOverride)) {
    return false;
  }

  const stepPlan = resolveIssueStepPlan(
    document,
    mapping,
    operation.targetStepId,
  );
  if (!stepPlan) return false;
  const itemId = stableAuthoringId(
    'item',
    document.documentId,
    ...sourceRowIds,
  );
  if (parseResult.canonical.items.some((item) => item.itemId === itemId)) {
    return false;
  }
  const sourceRefId = stableAuthoringId(
    'source-ref',
    document.documentId,
    'item',
    itemId,
    sourceRowIds.join(','),
    'derived_from',
  );
  if (
    parseResult.canonical.sourceRefs.some(
      (sourceRef) => sourceRef.sourceRefId === sourceRefId,
    )
  ) {
    return false;
  }

  const issueBlocks = mapping.blockIds.flatMap((blockId) => {
    const block = parseResult.blocks.find((candidate) => candidate.blockId === blockId);
    return block ? [block] : [];
  });
  const item: CanonicalAuthoringItem = {
    itemId,
    stepId: stepPlan.stepId,
    title: sourceTitle,
    sourceTitle,
    intent: classifiedItemIntent(sourceTitle),
    role: 'item',
    order: parseResult.canonical.items.length,
    nestingLevel: issueBlocks.length > 0
      ? Math.min(...issueBlocks.map((block) => block.depth))
      : 0,
    included: true,
    properties: [],
    resources: [],
    sources: [],
    guides: [],
    cautions: [],
    sourceRowIds,
  };
  if (titleOverride) setOwnedTitle(item, actorLane, titleOverride);

  const step = ensureIssueStep(document, stepPlan);
  insertClassifiedItem(parseResult, step, item, mapping);
  parseResult.canonical.sourceRefs.push({
    sourceRefId,
    entityType: 'item',
    entityId: itemId,
    sourceRowIds,
    relation: 'derived_from',
    supportLevel: 'direct',
  });
  mapping.targetKind = 'item';
  mapping.targetDraftId = itemId;
  mapping.userCorrected = true;
  issue.decision = {
    outcome: 'convert_to_item',
    state: 'resolved',
    targetKind: 'item',
    targetDraftId: itemId,
    actorLane,
    decidedAt,
  };
  return true;
}

function applyMutation(
  document: TextAuthoringDocument,
  operation: Exclude<AuthoringCorrectionOperation, { type: 'undo' }>,
  actorLane: TextAuthoringOwnership,
  decidedAt: string,
): boolean {
  const parseResult = document.parseResult;
  if (operation.type === 'record_review_decision') {
    const gate = (document.reviewGates ?? []).find(
      (candidate) => candidate.gateId === operation.gateId,
    );
    if (!gate) throw new Error(`Review gate not found: ${operation.gateId}`);
    const evidenceNote = operation.evidenceNote?.trim();
    if (operation.status === 'evidence_recorded' && !evidenceNote) {
      throw new Error('Review evidence requires a non-empty note.');
    }
    if (
      gate.status === operation.status
      && gate.evidenceNote === evidenceNote
      && gate.actorLane === actorLane
    ) {
      return false;
    }
    gate.status = operation.status;
    if (evidenceNote) gate.evidenceNote = evidenceNote;
    else delete gate.evidenceNote;
    gate.actorLane = actorLane;
    gate.decidedAt = decidedAt;
    return true;
  }
  if (operation.type === 'reopen_review') {
    const gate = (document.reviewGates ?? []).find(
      (candidate) => candidate.gateId === operation.gateId,
    );
    if (!gate) throw new Error(`Review gate not found: ${operation.gateId}`);
    if (gate.status === 'required' && !gate.evidenceNote && !gate.decidedAt) {
      return false;
    }
    gate.status = 'required';
    delete gate.evidenceNote;
    delete gate.actorLane;
    delete gate.decidedAt;
    return true;
  }
  if (operation.type === 'stage_source_update') {
    return stageAuthoringSourceUpdate(
      document,
      operation.candidate,
      decidedAt,
    );
  }
  if (operation.type === 'resolve_source_conflict') {
    return resolveAuthoringSourceUpdateChange(
      document,
      operation.changeId,
      operation.resolution,
      actorLane,
      decidedAt,
    );
  }
  if (operation.type === 'apply_source_update') {
    applyAuthoringSourceUpdate(document, decidedAt);
    return true;
  }
  if (operation.type === 'reject_source_update') {
    rejectAuthoringSourceUpdate(document);
    return true;
  }
  if (operation.type === 'classify_issue') {
    return classifyIssue(document, operation, actorLane, decidedAt);
  }
  if (operation.type === 'merge') {
    return mergeItems(parseResult, operation.itemIds, actorLane);
  }
  if (operation.type === 'split') {
    return splitItem(document, operation.itemId, operation.at, actorLane);
  }
  if (operation.type === 'reorder') {
    return reorderItem(parseResult, operation.itemId, operation.toIndex);
  }
  if (operation.type === 'align_source_order') {
    return alignSourceOrder(document, operation.orderedItemIds);
  }
  if (operation.type === 'set_property') {
    return setItemProperty(document, operation, actorLane);
  }
  if (operation.type === 'restore') {
    if (operation.itemId) {
      return restoreItemToParsedSource(document, operation.itemId);
    }
    const targets = operation.itemId
      ? parseResult.canonical.items.filter((item) => item.itemId === operation.itemId)
      : parseResult.canonical.items.filter((item) => !item.included);
    let changed = false;
    targets.forEach((item) => {
      if (!item.included) {
        item.included = true;
        changed = true;
      }
    });
    if (changed) markMappingsCorrected(
      parseResult.mappings,
      targets.map((item) => item.itemId),
    );
    return changed;
  }

  const item = itemById(parseResult, operation.itemId);
  if (!item) return false;
  if (operation.type === 'indent') {
    item.nestingLevel += 1;
  } else if (operation.type === 'outdent') {
    if (item.nestingLevel === 0) return false;
    item.nestingLevel -= 1;
  } else if (operation.type === 'rename') {
    const title = operation.title.trim();
    if (
      !title
      || (
        title === item.title
        && item.titleOverrides?.[actorLane] === title
      )
    ) {
      return false;
    }
    setOwnedTitle(item, actorLane, title);
  } else if (operation.type === 'change_role') {
    if (item.role === operation.role) return false;
    item.role = operation.role;
  } else if (operation.type === 'include') {
    if (item.included) return false;
    item.included = true;
  } else if (operation.type === 'exclude') {
    if (!item.included) return false;
    item.included = false;
  } else {
    return false;
  }
  markMappingsCorrected(parseResult.mappings, [item.itemId]);
  return true;
}

function effectiveUndoStack(
  revisions: DraftRevision[],
): DraftRevision[] {
  const stack: DraftRevision[] = [];
  revisions.forEach((revision) => {
    revision.operations.forEach((operation) => {
      if (operation.type === 'undo') {
        stack.pop();
      } else if (revision.before) {
        stack.push(revision);
      }
    });
  });
  return stack;
}

function newRevision(
  document: TextAuthoringDocument,
  operation: AuthoringCorrectionOperation,
  before: AuthoringRevisionSnapshot,
  options: ApplyAuthoringOperationOptions,
  suffix?: string,
): DraftRevision {
  const timestamp = options.now ?? new Date().toISOString();
  return {
    revisionId: stableAuthoringId(
      'revision',
      document.documentId,
      document.revision.revisionId,
      stableAuthoringJson(operation),
      document.revisionHistory.length,
      suffix,
    ),
    parentRevisionId: document.revision.revisionId,
    kind: 'edit',
    operations: [cloneAuthoringValue(operation)],
    actorLane: options.actorLane ?? document.ownership,
    timestamp,
    before: cloneAuthoringValue(before),
  };
}

function revisionSnapshot(
  document: TextAuthoringDocument,
): AuthoringRevisionSnapshot {
  return {
    parseResult: cloneAuthoringValue(document.parseResult),
    rawText: document.rawText,
    inputKinds: cloneAuthoringValue(document.inputKinds),
    primaryInputKind: document.primaryInputKind,
    sourceTitle: document.sourceTitle,
    sourceUrl: document.sourceUrl,
    reviewGates: cloneAuthoringValue(document.reviewGates ?? []),
    sourceState: cloneAuthoringValue(document.sourceState),
    lifecycleStatus: document.lifecycleStatus,
  };
}

function finishRevision(
  document: TextAuthoringDocument,
  revision: DraftRevision,
): TextAuthoringDocument {
  document.parseResult.artifactEligibility = deriveAuthoringArtifactEligibility(
    document.parseResult.canonical,
  );
  document.parseResult.parseResultId = stableAuthoringId(
    'parse-result',
    document.documentId,
    document.parseResult.parserVersion,
    document.parseResult.fixtureVersion,
    stableAuthoringJson(document.parseResult.canonical),
    revision.revisionId,
  );
  document.revision = revision;
  document.revisionHistory.push(revision);
  document.updatedAt = revision.timestamp;
  document.lifecycleStatus = deriveAuthoringLifecycleStatus(document, 'draft');
  return document;
}

function applyUndo(
  source: TextAuthoringDocument,
  options: ApplyAuthoringOperationOptions,
): TextAuthoringDocument {
  const target = effectiveUndoStack(source.revisionHistory).at(-1);
  if (!target?.before) return source;
  const document = cloneAuthoringValue(source);
  const before = revisionSnapshot(document);
  document.parseResult = cloneAuthoringValue(target.before.parseResult);
  if (Object.prototype.hasOwnProperty.call(target.before, 'rawText')) {
    document.rawText = target.before.rawText ?? '';
  }
  if (
    Object.prototype.hasOwnProperty.call(target.before, 'inputKinds')
    && target.before.inputKinds
  ) {
    document.inputKinds = cloneAuthoringValue(target.before.inputKinds);
  }
  if (
    Object.prototype.hasOwnProperty.call(target.before, 'primaryInputKind')
    && target.before.primaryInputKind
  ) {
    document.primaryInputKind = target.before.primaryInputKind;
  }
  if (Object.prototype.hasOwnProperty.call(target.before, 'sourceTitle')) {
    if (target.before.sourceTitle) {
      document.sourceTitle = target.before.sourceTitle;
    } else {
      delete document.sourceTitle;
    }
  }
  if (Object.prototype.hasOwnProperty.call(target.before, 'sourceUrl')) {
    if (target.before.sourceUrl) document.sourceUrl = target.before.sourceUrl;
    else delete document.sourceUrl;
  }
  if (Object.prototype.hasOwnProperty.call(target.before, 'reviewGates')) {
    document.reviewGates = cloneAuthoringValue(target.before.reviewGates ?? []);
  }
  if (Object.prototype.hasOwnProperty.call(target.before, 'sourceState')) {
    if (target.before.sourceState) {
      document.sourceState = cloneAuthoringValue(target.before.sourceState);
    } else {
      delete document.sourceState;
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(target.before, 'lifecycleStatus')
    && target.before.lifecycleStatus
  ) {
    document.lifecycleStatus = target.before.lifecycleStatus;
  }
  const revision = newRevision(
    document,
    { type: 'undo' },
    before,
    options,
    target.revisionId,
  );
  return finishRevision(document, revision);
}

/**
 * Applies a creator/personal/suggestion correction as an immutable document revision.
 * Captured source text and ranges are immutable except for the explicit
 * `align_source_order` operation. That operation moves complete source Item
 * blocks, retains stable IDs/lineage, and is restored by the normal undo path.
 */
export function applyAuthoringOperation(
  source: TextAuthoringDocument,
  operation: AuthoringCorrectionOperation,
  options: ApplyAuthoringOperationOptions = {},
): TextAuthoringDocument {
  if (operation.type === 'undo') return applyUndo(source, options);
  const document = cloneAuthoringValue(source);
  const before = revisionSnapshot(document);
  const revisionActor = options.actorLane ?? (
    operation.type === 'stage_source_update' ? 'system' : document.ownership
  );
  const actorLane = revisionActor === 'system'
    ? document.ownership
    : revisionActor;
  const decidedAt = options.now ?? new Date().toISOString();
  if (!applyMutation(document, operation, actorLane, decidedAt)) return source;
  const revision = newRevision(
    document,
    operation,
    before,
    { ...options, actorLane: revisionActor, now: decidedAt },
  );
  return finishRevision(document, revision);
}
