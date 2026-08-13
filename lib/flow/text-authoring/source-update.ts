import {
  cloneAuthoringValue,
  normalizeAuthoringText,
  stableAuthoringId,
  stableAuthoringJson,
} from './identity';
import type {
  AuthoringCompletion,
  AuthoringLink,
  AuthoringMemo,
  AuthoringParseResult,
  AuthoringSchedule,
  AuthoringSourceItemMatch,
  AuthoringSourceSnapshotRef,
  AuthoringSourceState,
  AuthoringSourceUpdateCandidate,
  AuthoringSourceUpdateChange,
  AuthoringSourceUpdateField,
  AuthoringSourceUpdateResolution,
  CanonicalAuthoringItem,
  TextAuthoringDocument,
  TextAuthoringOwnership,
} from './types';

export type CreateAuthoringSourceSnapshotOptions = {
  capturedAt?: string;
  externalVersion?: string;
};

export type CreateAuthoringSourceUpdateCandidateOptions = {
  capturedAt?: string;
  externalVersion?: string;
  matches?: AuthoringSourceItemMatch[];
};

function valuesEqual(left: unknown, right: unknown): boolean {
  return stableAuthoringJson({ value: left })
    === stableAuthoringJson({ value: right });
}

type AuthoringStepMappingValue = {
  stepId: string;
  title: string;
  order: number;
};

const STRUCTURAL_FIELDS: AuthoringSourceUpdateField[] = [
  'role',
  'included',
  'nesting',
  'order',
  'step_mapping',
];

const SCHEDULE_PROPERTY_KEYS = new Set([
  'date',
  'relative_date',
  'time',
  'timezone',
  'duration',
  'repeat',
]);

function comparableLinks(links: AuthoringLink[]): Array<{
  label: string;
  url: string;
  type?: AuthoringLink['type'];
  owner?: AuthoringLink['owner'];
}> {
  return links.map((link) => ({
    label: link.label,
    url: link.url,
    ...(link.type ? { type: link.type } : {}),
    ...(link.owner ? { owner: link.owner } : {}),
  }));
}

function itemMappings(
  parseResult: AuthoringParseResult,
  itemId: string,
) {
  return parseResult.mappings.filter(
    (mapping) => mapping.targetDraftId === itemId,
  );
}

function sourceItemBlock(
  parseResult: AuthoringParseResult,
  item: CanonicalAuthoringItem,
) {
  const mappings = itemMappings(parseResult, item.itemId);
  const primaryMapping = mappings.find(
    (mapping) => mapping.targetKind === 'item',
  ) ?? mappings[0];
  if (!primaryMapping) return undefined;
  const blockIds = new Set(primaryMapping.blockIds);
  return parseResult.blocks
    .filter((block) => blockIds.has(block.blockId))
    .sort((left, right) => left.order - right.order)[0];
}

function sourceOrderValue(
  parseResult: AuthoringParseResult,
  item: CanonicalAuthoringItem,
): number {
  const orderedItems = [...parseResult.canonical.items].sort((left, right) => {
    const leftBlock = sourceItemBlock(parseResult, left);
    const rightBlock = sourceItemBlock(parseResult, right);
    const leftOrder = leftBlock?.order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = rightBlock?.order ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return left.itemId.localeCompare(right.itemId);
  });
  const sourceOrder = orderedItems.findIndex(
    (candidate) => candidate.itemId === item.itemId,
  );
  return sourceOrder >= 0 ? sourceOrder : item.order;
}

function sourceStepId(
  parseResult: AuthoringParseResult,
  item: CanonicalAuthoringItem,
): string {
  const block = sourceItemBlock(parseResult, item);
  if (block?.parentBlockId) {
    const stepMapping = parseResult.mappings.find((mapping) => (
      mapping.targetKind === 'step'
      && mapping.blockIds.includes(block.parentBlockId!)
    ));
    if (stepMapping) return stepMapping.targetDraftId;
  }
  return parseResult.canonical.steps.find(
    (step) => step.generated && step.sourceRowIds.length === 0,
  )?.stepId ?? item.stepId;
}

function stepMappingValue(
  parseResult: AuthoringParseResult,
  stepId: string,
): AuthoringStepMappingValue {
  const step = parseResult.canonical.steps.find(
    (candidate) => candidate.stepId === stepId,
  );
  return {
    stepId,
    title: step?.title ?? stepId,
    order: step?.order ?? Number.MAX_SAFE_INTEGER,
  };
}

function sourceFieldValue(
  parseResult: AuthoringParseResult,
  item: CanonicalAuthoringItem,
  field: AuthoringSourceUpdateField,
): unknown {
  if (field === 'title') return item.sourceTitle;
  if (field === 'source_checked') return item.sourceChecked ?? false;
  if (field === 'detail') return item.sourceDetail;
  if (field === 'completion') {
    return item.sourceCompletion
      ?? (item.completion?.owner === 'source' ? item.completion : undefined);
  }
  if (field === 'schedule') {
    return item.sourceSchedule
      ?? (!item.scheduleOverrides ? item.schedule : undefined);
  }
  if (field === 'resources') {
    return comparableLinks(item.resources.filter(
      (link) => !link.owner || link.owner === 'source',
    ));
  }
  if (field === 'sources') {
    return comparableLinks(item.sources.filter(
      (link) => !link.owner || link.owner === 'source',
    ));
  }
  if (field === 'guides') return cloneAuthoringValue(item.guides);
  if (field === 'cautions') return cloneAuthoringValue(item.cautions);
  const block = sourceItemBlock(parseResult, item);
  if (field === 'role') {
    const role = block?.interpretedRole;
    return (
      role === 'item'
      || role === 'resource'
      || role === 'guide'
      || role === 'caution'
      || role === 'completion'
    ) ? role : 'item';
  }
  if (field === 'included') return block?.included ?? true;
  if (field === 'nesting') return block?.depth ?? item.nestingLevel;
  if (field === 'order') return sourceOrderValue(parseResult, item);
  return stepMappingValue(
    parseResult,
    sourceStepId(parseResult, item),
  );
}

function ownedFieldValue(
  parseResult: AuthoringParseResult,
  item: CanonicalAuthoringItem,
  field: AuthoringSourceUpdateField,
  lane: TextAuthoringOwnership,
  oldSourceValue: unknown,
): unknown {
  if (field === 'title') return item.titleOverrides?.[lane];
  if (field === 'source_checked') return undefined;
  if (field === 'detail') return item.detailOverrides?.[lane];
  if (field === 'completion') return item.completionOverrides?.[lane];
  if (field === 'schedule') return item.scheduleOverrides?.[lane];
  if (field === 'resources') {
    const owned = item.resources.filter((link) => link.owner === lane);
    return owned.length > 0 ? comparableLinks(owned) : undefined;
  }
  if (field === 'sources') {
    const owned = item.sources.filter((link) => link.owner === lane);
    return owned.length > 0 ? comparableLinks(owned) : undefined;
  }
  if (field === 'guides' || field === 'cautions') return undefined;
  if (!itemMappings(parseResult, item.itemId).some(
    (mapping) => mapping.userCorrected,
  )) {
    return undefined;
  }
  let currentValue: unknown;
  if (field === 'role') currentValue = item.role;
  else if (field === 'included') currentValue = item.included;
  else if (field === 'nesting') currentValue = item.nestingLevel;
  else if (field === 'order') currentValue = item.order;
  else currentValue = stepMappingValue(parseResult, item.stepId);
  return valuesEqual(currentValue, oldSourceValue)
    ? undefined
    : currentValue;
}

function itemHasOwnedState(
  parseResult: AuthoringParseResult,
  item: CanonicalAuthoringItem,
): boolean {
  return (
    Boolean(item.titleOverrides && Object.keys(item.titleOverrides).length)
    || Boolean(item.detailOverrides && Object.keys(item.detailOverrides).length)
    || Boolean(
      item.completionOverrides
      && Object.keys(item.completionOverrides).length,
    )
    || Boolean(
      item.scheduleOverrides
      && Object.keys(item.scheduleOverrides).length,
    )
    || item.properties.some((property) => property.owner !== 'source')
    || [...item.resources, ...item.sources].some(
      (link) => link.owner && link.owner !== 'source',
    )
    || itemMappings(parseResult, item.itemId).some(
      (mapping) => mapping.userCorrected,
    )
  );
}

function uniqueByIdentity<T>(
  values: T[],
  identity: (value: T) => string,
): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = identity(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizedMatches(
  document: TextAuthoringDocument,
  candidate: AuthoringSourceUpdateCandidate,
): AuthoringSourceItemMatch[] {
  const activeItems = document.parseResult.canonical.items;
  const incomingItems = candidate.parseResult.canonical.items;
  const activeIds = new Set(activeItems.map((item) => item.itemId));
  const incomingIds = new Set(incomingItems.map((item) => item.itemId));
  const automatic = activeItems
    .filter((item) => incomingIds.has(item.itemId))
    .map((item) => ({
      activeItemId: item.itemId,
      incomingItemId: item.itemId,
      basis: 'stable_entity_id' as const,
    }));
  const explicit = candidate.matches.map((match) => ({ ...match }));
  const matches = uniqueByIdentity(
    [...explicit, ...automatic],
    (match) => `${match.activeItemId}|${match.incomingItemId}`,
  );
  const activeMatched = new Set<string>();
  const incomingMatched = new Set<string>();
  for (const match of matches) {
    if (
      !activeIds.has(match.activeItemId)
      || !incomingIds.has(match.incomingItemId)
    ) {
      throw new Error('Source update match references an unknown Item.');
    }
    if (
      match.basis === 'stable_entity_id'
      && match.activeItemId !== match.incomingItemId
    ) {
      throw new Error('Stable entity matches require identical Item IDs.');
    }
    if (
      activeMatched.has(match.activeItemId)
      || incomingMatched.has(match.incomingItemId)
    ) {
      throw new Error('Each source update Item may be matched only once.');
    }
    activeMatched.add(match.activeItemId);
    incomingMatched.add(match.incomingItemId);
  }
  return matches;
}

function statusForChanges(
  changes: AuthoringSourceUpdateChange[],
): Extract<AuthoringSourceState['status'], 'source_updated' | 'conflict_source_vs_user'> {
  const hasOpenOwnedConflict = changes.some((change) => (
    change.state === 'open'
    && (
      (change.kind === 'changed' && change.userOwner !== undefined)
      || (change.kind === 'removed' && change.hasOwnedState)
    )
  ));
  return hasOpenOwnedConflict
    ? 'conflict_source_vs_user'
    : 'source_updated';
}

function unsupportedItemSourceSemantics(
  item: CanonicalAuthoringItem,
): Record<string, unknown> {
  const residue: Record<string, unknown> = {
    ...cloneAuthoringValue(item),
  };
  [
    'itemId',
    'stepId',
    'title',
    'sourceTitle',
    'sourceChecked',
    'titleOverrides',
    'creatorTitle',
    'detail',
    'sourceDetail',
    'detailOverrides',
    'creatorDetail',
    'sourceCompletion',
    'completionOverrides',
    'completion',
    'sourceSchedule',
    'scheduleOverrides',
    'schedule',
    'role',
    'order',
    'nestingLevel',
    'included',
    'properties',
    'resources',
    'sources',
    'guides',
    'cautions',
    'sourceRowIds',
  ].forEach((key) => delete residue[key]);
  residue.properties = item.properties
    .filter((property) => (
      property.owner === 'source'
      && !SCHEDULE_PROPERTY_KEYS.has(property.key)
    ))
    .map((property) => ({
      key: property.key,
      label: property.label,
      value: property.value,
    }));
  return residue;
}

function flowSourceSemantics(
  parseResult: AuthoringParseResult,
): Record<string, unknown> {
  const { flow, fields } = parseResult.canonical;
  return {
    title: flow.title,
    summary: flow.summary,
    userNeed: flow.userNeed,
    fields: fields
      .filter((field) => field.owner.type === 'flow')
      .map((field) => ({
        key: field.key,
        label: field.label,
        value: field.value,
      })),
  };
}

function isStepMappingValue(
  value: unknown,
): value is AuthoringStepMappingValue {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<AuthoringStepMappingValue>;
  return (
    typeof record.stepId === 'string'
    && typeof record.title === 'string'
    && typeof record.order === 'number'
  );
}

function explicitlyCoveredStepIds(
  activeParseResult: AuthoringParseResult,
  incomingParseResult: AuthoringParseResult,
  changes: AuthoringSourceUpdateChange[],
): { active: Set<string>; incoming: Set<string> } {
  const covered = {
    active: new Set<string>(),
    incoming: new Set<string>(),
  };
  const activeById = new Map(
    activeParseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  const incomingById = new Map(
    incomingParseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  changes.forEach((change) => {
    if (change.kind !== 'changed' || change.field !== 'step_mapping') return;
    const activeItem = activeById.get(change.activeItemId);
    const incomingItem = incomingById.get(change.incomingItemId);
    if (!activeItem || !incomingItem) return;
    const expectedActive = sourceFieldValue(
      activeParseResult,
      activeItem,
      'step_mapping',
    );
    const expectedIncoming = sourceFieldValue(
      incomingParseResult,
      incomingItem,
      'step_mapping',
    );
    if (
      !valuesEqual(change.oldSourceValue, expectedActive)
      || !valuesEqual(change.incomingSourceValue, expectedIncoming)
      || !isStepMappingValue(expectedActive)
      || !isStepMappingValue(expectedIncoming)
    ) {
      return;
    }
    covered.active.add(expectedActive.stepId);
    covered.incoming.add(expectedIncoming.stepId);
  });
  return covered;
}

function stepSourceSemantics(
  parseResult: AuthoringParseResult,
  coveredStepIds: Set<string>,
): Array<Record<string, unknown>> {
  return [...parseResult.canonical.steps]
    .sort((left, right) => left.order - right.order)
    .map((step) => ({
      title: coveredStepIds.has(step.stepId)
        ? '__explicit_step_mapping_change__'
        : step.title,
      description: step.description,
      generated: step.generated === true,
    }));
}

type MemoCoverage = {
  activeAllItemIds: Set<string>;
  incomingAllItemIds: Set<string>;
  activeKindsByItemId: Map<string, Set<AuthoringMemo['kind']>>;
  incomingKindsByItemId: Map<string, Set<AuthoringMemo['kind']>>;
  incomingItemIdToActiveItemId: Map<string, string>;
};

function memoKindForSourceUpdateField(
  field: AuthoringSourceUpdateField,
): AuthoringMemo['kind'] | undefined {
  if (field === 'detail') return 'source_detail';
  if (field === 'resources') return 'resource';
  if (field === 'guides') return 'guide';
  if (field === 'cautions') return 'caution';
  return undefined;
}

function addMemoCoverage(
  covered: Map<string, Set<AuthoringMemo['kind']>>,
  itemId: string,
  kind: AuthoringMemo['kind'],
): void {
  const kinds = covered.get(itemId) ?? new Set<AuthoringMemo['kind']>();
  kinds.add(kind);
  covered.set(itemId, kinds);
}

function memoCoverageForChanges(
  matches: AuthoringSourceItemMatch[],
  changes: AuthoringSourceUpdateChange[],
): MemoCoverage {
  const coverage: MemoCoverage = {
    activeAllItemIds: new Set<string>(),
    incomingAllItemIds: new Set<string>(),
    activeKindsByItemId: new Map<string, Set<AuthoringMemo['kind']>>(),
    incomingKindsByItemId: new Map<string, Set<AuthoringMemo['kind']>>(),
    incomingItemIdToActiveItemId: new Map<string, string>(),
  };
  matches.forEach((match) => {
    coverage.incomingItemIdToActiveItemId.set(
      match.incomingItemId,
      match.activeItemId,
    );
  });
  changes.forEach((change) => {
    if (change.kind === 'added') {
      coverage.incomingAllItemIds.add(change.incomingItemId);
      return;
    }
    if (change.kind === 'removed') {
      coverage.activeAllItemIds.add(change.activeItemId);
      return;
    }
    const kind = memoKindForSourceUpdateField(change.field);
    if (!kind) return;
    addMemoCoverage(
      coverage.activeKindsByItemId,
      change.activeItemId,
      kind,
    );
    addMemoCoverage(
      coverage.incomingKindsByItemId,
      change.incomingItemId,
      kind,
    );
  });
  return coverage;
}

function memoMatchesSourceValue(
  parseResult: AuthoringParseResult,
  memo: AuthoringMemo,
): boolean {
  if (!memo.text.trim() || memo.sourceRowIds.length === 0) return false;
  const sourceRows = new Map(
    parseResult.canonical.sourceRows.map((row) => [row.sourceRowId, row]),
  );
  const memoRows = memo.sourceRowIds.map((sourceRowId) =>
    sourceRows.get(sourceRowId),
  );
  if (
    memoRows.some((row) => !row || row.state === 'tombstone')
    || new Set(memoRows.map((row) => row?.documentId)).size !== 1
  ) {
    return false;
  }
  const documentId = memoRows[0]?.documentId;
  if (
    !documentId
    || memo.memoId !== stableAuthoringId(
      'memo',
      documentId,
      memo.scope.type,
      memo.scope.id,
      memo.kind,
      memo.sourceRowIds.join(','),
    )
  ) {
    return false;
  }

  if (memo.scope.type === 'flow') {
    const flow = parseResult.canonical.flow;
    return (
      memo.scope.id === flow.flowId
      && memo.kind === 'source_detail'
      && flow.sourceRowIds.every((sourceRowId) => (
        sourceRows.has(sourceRowId)
      ))
      && (flow.summary?.split('\n').includes(memo.text) ?? false)
      && memo.sourceRowIds.every((sourceRowId) => (
        flow.sourceRowIds.includes(sourceRowId)
      ))
    );
  }
  if (memo.scope.type === 'step') {
    const step = parseResult.canonical.steps.find(
      (candidate) => candidate.stepId === memo.scope.id,
    );
    return Boolean(
      step
      && memo.kind === 'source_detail'
      && step.description?.split('\n').includes(memo.text)
      && memo.sourceRowIds.every((sourceRowId) => (
        step.sourceRowIds.includes(sourceRowId)
      )),
    );
  }

  const item = parseResult.canonical.items.find(
    (candidate) => candidate.itemId === memo.scope.id,
  );
  if (
    !item
    || !memo.sourceRowIds.every((sourceRowId) => (
      item.sourceRowIds.includes(sourceRowId)
    ))
  ) {
    return false;
  }
  if (memo.kind === 'source_detail') {
    return item.sourceDetail?.split('\n').includes(memo.text) ?? false;
  }
  if (memo.kind === 'guide') return item.guides.includes(memo.text);
  if (memo.kind === 'caution') return item.cautions.includes(memo.text);
  if (memo.kind === 'resource') {
    return (
      item.resources.some((resource) => (
        memo.text === resource.url
        || (
          memo.text.includes(resource.url)
          && (
            resource.label === '자료'
            || memo.text.includes(resource.label)
          )
        )
      ))
      || memoRows.some((row) => row?.rawText.includes(memo.text))
    );
  }
  return false;
}

function unsupportedMemoSourceSemantics(
  parseResult: AuthoringParseResult,
  side: 'active' | 'incoming',
  coverage: MemoCoverage,
): Array<Record<string, unknown>> {
  const allItemIds = side === 'active'
    ? coverage.activeAllItemIds
    : coverage.incomingAllItemIds;
  const kindsByItemId = side === 'active'
    ? coverage.activeKindsByItemId
    : coverage.incomingKindsByItemId;
  return parseResult.canonical.memos
    .filter((memo) => {
      if (memo.scope.type !== 'item') return true;
      return (
        !allItemIds.has(memo.scope.id)
        && !kindsByItemId.get(memo.scope.id)?.has(memo.kind)
      );
    })
    .map((memo) => ({
      scope: {
        type: memo.scope.type,
        id:
          side === 'incoming' && memo.scope.type === 'item'
            ? coverage.incomingItemIdToActiveItemId.get(memo.scope.id)
              ?? memo.scope.id
            : memo.scope.id,
      },
      kind: memo.kind,
      text: memo.text,
    }))
    .sort((left, right) => (
      stableAuthoringJson(left).localeCompare(stableAuthoringJson(right))
    ));
}

function unsupportedSourceSemanticDifferences(
  document: TextAuthoringDocument,
  candidate: AuthoringSourceUpdateCandidate,
  matches: AuthoringSourceItemMatch[],
  changes: AuthoringSourceUpdateChange[],
): string[] {
  const differences: string[] = [];
  if (
    document.sourceTitle !== candidate.snapshot.sourceTitle
    || document.sourceUrl !== candidate.snapshot.sourceUrl
  ) {
    differences.push('source_metadata');
  }
  if (
    !valuesEqual(
      flowSourceSemantics(document.parseResult),
      flowSourceSemantics(candidate.parseResult),
    )
  ) {
    differences.push('flow');
  }

  const coveredSteps = explicitlyCoveredStepIds(
    document.parseResult,
    candidate.parseResult,
    changes,
  );
  if (
    !valuesEqual(
      stepSourceSemantics(document.parseResult, coveredSteps.active),
      stepSourceSemantics(candidate.parseResult, coveredSteps.incoming),
    )
  ) {
    differences.push('steps');
  }

  const memoCoverage = memoCoverageForChanges(matches, changes);
  if (
    document.parseResult.canonical.memos.some((memo) => (
      !memoMatchesSourceValue(document.parseResult, memo)
    ))
    || candidate.parseResult.canonical.memos.some((memo) => (
      !memoMatchesSourceValue(candidate.parseResult, memo)
    ))
    || !valuesEqual(
      unsupportedMemoSourceSemantics(
        document.parseResult,
        'active',
        memoCoverage,
      ),
      unsupportedMemoSourceSemantics(
        candidate.parseResult,
        'incoming',
        memoCoverage,
      ),
    )
  ) {
    differences.push('memos');
  }

  const activeById = new Map(
    document.parseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  const incomingById = new Map(
    candidate.parseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  matches.forEach((match) => {
    const activeItem = activeById.get(match.activeItemId);
    const incomingItem = incomingById.get(match.incomingItemId);
    if (
      activeItem
      && incomingItem
      && !valuesEqual(
        unsupportedItemSourceSemantics(activeItem),
        unsupportedItemSourceSemantics(incomingItem),
      )
    ) {
      differences.push(`item:${activeItem.itemId}`);
    }
  });
  return [...new Set(differences)];
}

function assertNoUnsupportedSourceSemanticDifferences(
  document: TextAuthoringDocument,
  candidate: AuthoringSourceUpdateCandidate,
  matches: AuthoringSourceItemMatch[],
  changes: AuthoringSourceUpdateChange[],
): void {
  const differences = unsupportedSourceSemanticDifferences(
    document,
    candidate,
    matches,
    changes,
  );
  if (differences.length === 0) return;
  throw new Error(
    `Incoming source contains unsupported semantic changes: ${
      differences.join(', ')
    }. Reject this update or import it as a new draft.`,
  );
}

function changeWithoutDecision(
  change: AuthoringSourceUpdateChange,
): Omit<
  AuthoringSourceUpdateChange,
  'state' | 'resolution' | 'decidedAt' | 'actorLane'
> {
  const {
    state: _state,
    resolution: _resolution,
    decidedAt: _decidedAt,
    actorLane: _actorLane,
    ...sourceChange
  } = change;
  return sourceChange;
}

function validatedStagedSourceUpdate(
  document: TextAuthoringDocument,
  state: Extract<
    AuthoringSourceState,
    { status: 'source_updated' | 'conflict_source_vs_user' }
  >,
): {
  matches: AuthoringSourceItemMatch[];
  changes: AuthoringSourceUpdateChange[];
} {
  const probe = cloneAuthoringValue(document);
  const staged = stageAuthoringSourceUpdate(
    probe,
    cloneAuthoringValue(state.incoming),
    state.stagedAt,
  );
  if (!staged || !probe.sourceState || probe.sourceState.status === 'current') {
    throw new Error(
      'The staged source update no longer differs from the active source.',
    );
  }

  const expected = probe.sourceState;
  const storedById = new Map(
    state.changes.map((change) => [change.changeId, change]),
  );
  const complete = (
    state.changes.length === expected.changes.length
    && expected.changes.every((change) => {
      const stored = storedById.get(change.changeId);
      return stored
        ? valuesEqual(
          changeWithoutDecision(stored),
          changeWithoutDecision(change),
        )
        : false;
    })
  );
  if (!complete) {
    throw new Error(
      'The staged source update diff is incomplete or inconsistent. '
      + 'Reject this update and compare the source again.',
    );
  }
  return {
    matches: cloneAuthoringValue(expected.incoming.matches),
    changes: cloneAuthoringValue(expected.changes),
  };
}

export function createAuthoringSourceSnapshotRef(
  document: Pick<
    TextAuthoringDocument,
    'documentId' | 'rawText' | 'sourceTitle' | 'sourceUrl' | 'parseResult'
  >,
  options: CreateAuthoringSourceSnapshotOptions = {},
): AuthoringSourceSnapshotRef {
  const normalized = normalizeAuthoringText(document.rawText);
  const contentFingerprint = stableAuthoringId(
    'source-content',
    normalized,
    document.sourceTitle,
    document.sourceUrl,
    options.externalVersion,
  );
  return {
    snapshotId: stableAuthoringId(
      'source-snapshot',
      document.documentId,
      contentFingerprint,
      document.parseResult.parserVersion,
    ),
    contentFingerprint,
    capturedAt: options.capturedAt ?? new Date().toISOString(),
    rawText: document.rawText,
    ...(document.sourceTitle ? { sourceTitle: document.sourceTitle } : {}),
    ...(document.sourceUrl ? { sourceUrl: document.sourceUrl } : {}),
    ...(options.externalVersion
      ? { externalVersion: options.externalVersion }
      : {}),
  };
}

export function ensureAuthoringSourceState(
  document: TextAuthoringDocument,
  options: CreateAuthoringSourceSnapshotOptions = {},
): AuthoringSourceState {
  if (document.sourceState) return document.sourceState;
  const sourceState: AuthoringSourceState = {
    status: 'current',
    active: createAuthoringSourceSnapshotRef(document, options),
  };
  document.sourceState = sourceState;
  return sourceState;
}

export function createAuthoringSourceUpdateCandidate(
  incoming: TextAuthoringDocument,
  options: CreateAuthoringSourceUpdateCandidateOptions = {},
): AuthoringSourceUpdateCandidate {
  const sourceState = incoming.sourceState;
  const externalVersion = options.externalVersion
    ?? sourceState?.active.externalVersion;
  return {
    snapshot: createAuthoringSourceSnapshotRef(incoming, {
      capturedAt: options.capturedAt,
      externalVersion,
    }),
    rawText: incoming.rawText,
    inputKinds: cloneAuthoringValue(incoming.inputKinds),
    primaryInputKind: incoming.primaryInputKind,
    parseResult: cloneAuthoringValue(incoming.parseResult),
    matches: cloneAuthoringValue(options.matches ?? []),
  };
}

export function stageAuthoringSourceUpdate(
  document: TextAuthoringDocument,
  candidateValue: AuthoringSourceUpdateCandidate,
  now: string,
): boolean {
  const active = ensureAuthoringSourceState(document).active;
  const candidate = cloneAuthoringValue(candidateValue);
  const expectedSnapshot = createAuthoringSourceSnapshotRef({
    documentId: document.documentId,
    rawText: candidate.rawText,
    sourceTitle: candidate.snapshot.sourceTitle,
    sourceUrl: candidate.snapshot.sourceUrl,
    parseResult: candidate.parseResult,
  }, {
    capturedAt: candidate.snapshot.capturedAt,
    externalVersion: candidate.snapshot.externalVersion,
  });
  if (
    expectedSnapshot.contentFingerprint
      !== candidate.snapshot.contentFingerprint
    || expectedSnapshot.snapshotId !== candidate.snapshot.snapshotId
  ) {
    throw new Error('Incoming source snapshot does not match its captured content.');
  }
  if (candidate.snapshot.contentFingerprint === active.contentFingerprint) {
    return false;
  }
  if (
    candidate.parseResult.canonical.sourceRows.some(
      (row) => row.documentId !== document.documentId,
    )
    || candidate.parseResult.blocks.some(
      (block) => block.documentId !== document.documentId,
    )
  ) {
    throw new Error(
      'Incoming source must be parsed with the active document ID.',
    );
  }
  const rangeMatches = (
    range: { startOffset: number; endOffset: number },
    rawText: string,
  ): boolean => (
    Number.isInteger(range.startOffset)
    && Number.isInteger(range.endOffset)
    && range.startOffset >= 0
    && range.endOffset >= range.startOffset
    && range.endOffset <= candidate.rawText.length
    && candidate.rawText.slice(range.startOffset, range.endOffset) === rawText
  );
  if (
    candidate.parseResult.canonical.sourceRows.some((row) => (
      row.state !== 'tombstone'
      && !rangeMatches(row.sourceRange, row.rawText)
    ))
    || candidate.parseResult.blocks.some((block) => (
      block.state !== 'tombstone'
      && !rangeMatches(block.sourceRange, block.rawText)
    ))
  ) {
    throw new Error('Incoming parse lineage does not match the captured source.');
  }

  const matches = normalizedMatches(document, candidate);
  candidate.matches = cloneAuthoringValue(matches);
  const activeById = new Map(
    document.parseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  const incomingById = new Map(
    candidate.parseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  const changes: AuthoringSourceUpdateChange[] = [];
  const matchedActive = new Set<string>();
  const matchedIncoming = new Set<string>();
  const fields: AuthoringSourceUpdateField[] = [
    'title',
    'source_checked',
    'detail',
    'completion',
    'schedule',
    'resources',
    'sources',
    'guides',
    'cautions',
    ...STRUCTURAL_FIELDS,
  ];

  for (const match of matches) {
    const activeItem = activeById.get(match.activeItemId)!;
    const incomingItem = incomingById.get(match.incomingItemId)!;
    matchedActive.add(activeItem.itemId);
    matchedIncoming.add(incomingItem.itemId);
    for (const field of fields) {
      const oldSourceValue = sourceFieldValue(
        document.parseResult,
        activeItem,
        field,
      );
      const incomingSourceValue = sourceFieldValue(
        candidate.parseResult,
        incomingItem,
        field,
      );
      const userValue = ownedFieldValue(
        document.parseResult,
        activeItem,
        field,
        document.ownership,
        oldSourceValue,
      );
      if (
        valuesEqual(oldSourceValue, incomingSourceValue)
        && (
          userValue === undefined
          || valuesEqual(userValue, incomingSourceValue)
        )
      ) {
        continue;
      }
      changes.push({
        changeId: stableAuthoringId(
          'source-change',
          active.snapshotId,
          candidate.snapshot.snapshotId,
          activeItem.itemId,
          incomingItem.itemId,
          field,
        ),
        kind: 'changed',
        activeItemId: activeItem.itemId,
        incomingItemId: incomingItem.itemId,
        field,
        ...(oldSourceValue === undefined
          ? {}
          : { oldSourceValue: cloneAuthoringValue(oldSourceValue) }),
        ...(incomingSourceValue === undefined
          ? {}
          : { incomingSourceValue: cloneAuthoringValue(incomingSourceValue) }),
        ...(userValue === undefined
          ? {}
          : {
              userOwner: document.ownership,
              userValue: cloneAuthoringValue(userValue),
            }),
        state: 'open',
      });
    }
  }

  for (const incomingItem of candidate.parseResult.canonical.items) {
    if (matchedIncoming.has(incomingItem.itemId)) continue;
    changes.push({
      changeId: stableAuthoringId(
        'source-change',
        active.snapshotId,
        candidate.snapshot.snapshotId,
        'added',
        incomingItem.itemId,
      ),
      kind: 'added',
      incomingItemId: incomingItem.itemId,
      incomingSourceValue: cloneAuthoringValue(incomingItem),
      state: 'open',
    });
  }
  for (const activeItem of document.parseResult.canonical.items) {
    if (matchedActive.has(activeItem.itemId)) continue;
    changes.push({
      changeId: stableAuthoringId(
        'source-change',
        active.snapshotId,
        candidate.snapshot.snapshotId,
        'removed',
        activeItem.itemId,
      ),
      kind: 'removed',
      activeItemId: activeItem.itemId,
      oldSourceValue: cloneAuthoringValue(activeItem),
      hasOwnedState: itemHasOwnedState(document.parseResult, activeItem),
      state: 'open',
    });
  }

  assertNoUnsupportedSourceSemanticDifferences(
    document,
    candidate,
    matches,
    changes,
  );
  document.sourceState = {
    status: statusForChanges(changes),
    active: cloneAuthoringValue(active),
    incoming: candidate,
    changes,
    stagedAt: now,
  };
  return true;
}

function expectedResolution(
  change: AuthoringSourceUpdateChange,
  resolution: AuthoringSourceUpdateResolution,
): boolean {
  if (change.kind === 'changed') {
    return resolution === 'keep_user' || resolution === 'use_incoming';
  }
  if (change.kind === 'added') {
    return resolution === 'include_added' || resolution === 'exclude_added';
  }
  return resolution === 'keep_previous' || resolution === 'remove_removed';
}

function assertValidStagedSourceUpdateDecisions(
  changes: AuthoringSourceUpdateChange[],
): void {
  const validActorLanes = new Set<TextAuthoringOwnership>([
    'personal',
    'creator',
    'suggestion',
  ]);
  for (const change of changes) {
    const runtime = change as AuthoringSourceUpdateChange & {
      state?: unknown;
      resolution?: unknown;
      decidedAt?: unknown;
      actorLane?: unknown;
    };
    if (runtime.state === 'open') {
      if (
        runtime.resolution !== undefined
        || runtime.decidedAt !== undefined
        || runtime.actorLane !== undefined
      ) {
        throw new Error(
          'The staged source update decision state is incomplete or inconsistent.',
        );
      }
      continue;
    }
    if (
      runtime.state !== 'resolved'
      || typeof runtime.resolution !== 'string'
      || !expectedResolution(
        change,
        runtime.resolution as AuthoringSourceUpdateResolution,
      )
      || typeof runtime.decidedAt !== 'string'
      || runtime.decidedAt.trim().length === 0
      || typeof runtime.actorLane !== 'string'
      || !validActorLanes.has(runtime.actorLane as TextAuthoringOwnership)
      || (
        change.kind === 'changed'
        && runtime.resolution === 'keep_user'
        && change.userValue === undefined
      )
    ) {
      throw new Error(
        'The staged source update decision state is incomplete or inconsistent.',
      );
    }
  }
}

export function resolveAuthoringSourceUpdateChange(
  document: TextAuthoringDocument,
  changeId: string,
  resolution: AuthoringSourceUpdateResolution,
  actorLane: TextAuthoringOwnership,
  now: string,
): boolean {
  const state = document.sourceState;
  if (!state || state.status === 'current') {
    throw new Error('No source update is staged.');
  }
  const change = state.changes.find((entry) => entry.changeId === changeId);
  if (!change) throw new Error(`Source update change not found: ${changeId}`);
  if (!expectedResolution(change, resolution)) {
    throw new Error(`Resolution ${resolution} does not apply to ${change.kind}.`);
  }
  if (
    change.kind === 'changed'
    && resolution === 'keep_user'
    && change.userValue === undefined
  ) {
    throw new Error('keep_user requires an owned value for the active lane.');
  }
  if (change.state === 'resolved' && change.resolution === resolution) {
    return false;
  }
  change.state = 'resolved';
  change.resolution = resolution as typeof change.resolution;
  change.actorLane = actorLane;
  change.decidedAt = now;
  state.status = statusForChanges(state.changes);
  return true;
}

function mergeOwnedArray<T extends { owner?: string }>(
  incoming: T[],
  active: T[],
): T[] {
  const sourceValues = incoming.filter((entry) => !entry.owner || entry.owner === 'source');
  const ownedValues = active.filter((entry) => entry.owner && entry.owner !== 'source');
  return uniqueByIdentity(
    [...sourceValues, ...cloneAuthoringValue(ownedValues)],
    (entry) => stableAuthoringJson(entry),
  );
}

function mergeOwnedProperties(
  incoming: CanonicalAuthoringItem,
  active: CanonicalAuthoringItem,
): void {
  incoming.properties = uniqueByIdentity(
    [
      ...incoming.properties.filter((property) => property.owner === 'source'),
      ...cloneAuthoringValue(
        active.properties.filter((property) => property.owner !== 'source'),
      ),
    ],
    (property) => property.propertyId,
  );
  incoming.resources = mergeOwnedArray(incoming.resources, active.resources);
  incoming.sources = mergeOwnedArray(incoming.sources, active.sources);
}

function transferOwnedValues(
  incoming: CanonicalAuthoringItem,
  active: CanonicalAuthoringItem,
): void {
  incoming.titleOverrides = cloneAuthoringValue(active.titleOverrides);
  incoming.detailOverrides = cloneAuthoringValue(active.detailOverrides);
  incoming.completionOverrides = cloneAuthoringValue(active.completionOverrides);
  incoming.scheduleOverrides = cloneAuthoringValue(active.scheduleOverrides);
  incoming.creatorTitle = active.creatorTitle;
  incoming.creatorDetail = active.creatorDetail;
  mergeOwnedProperties(incoming, active);
}

function clearOwnedField(
  item: CanonicalAuthoringItem,
  field: AuthoringSourceUpdateField,
  lane: TextAuthoringOwnership,
): void {
  if (field === 'title' && item.titleOverrides) {
    delete item.titleOverrides[lane];
  } else if (field === 'detail' && item.detailOverrides) {
    delete item.detailOverrides[lane];
  } else if (field === 'completion' && item.completionOverrides) {
    delete item.completionOverrides[lane];
  } else if (field === 'schedule' && item.scheduleOverrides) {
    delete item.scheduleOverrides[lane];
  } else if (field === 'resources') {
    item.resources = item.resources.filter((link) => link.owner !== lane);
    item.properties = item.properties.filter((property) => !(
      property.owner === lane && property.key === 'resource'
    ));
  } else if (field === 'sources') {
    item.sources = item.sources.filter((link) => link.owner !== lane);
    item.properties = item.properties.filter((property) => !(
      property.owner === lane && property.key === 'source'
    ));
  }
}

function markIncomingMappingsCorrected(
  parseResult: AuthoringParseResult,
  itemId: string,
): void {
  parseResult.mappings.forEach((mapping) => {
    if (mapping.targetDraftId === itemId) mapping.userCorrected = true;
  });
}

function preserveActiveStepMapping(
  activeParseResult: AuthoringParseResult,
  incomingParseResult: AuthoringParseResult,
  activeItem: CanonicalAuthoringItem,
  incomingItem: CanonicalAuthoringItem,
): void {
  const canonical = incomingParseResult.canonical;
  let targetStep = canonical.steps.find(
    (step) => step.stepId === activeItem.stepId,
  );
  if (!targetStep) {
    const activeStep = activeParseResult.canonical.steps.find(
      (step) => step.stepId === activeItem.stepId,
    );
    targetStep = {
      stepId: activeItem.stepId,
      flowId: canonical.flow.flowId,
      title: activeStep?.title ?? 'User step',
      order: activeStep?.order ?? canonical.steps.length,
      itemIds: [],
      sourceRowIds: [],
      generated: true,
    };
    canonical.steps.push(targetStep);
    if (!canonical.flow.stepIds.includes(targetStep.stepId)) {
      canonical.flow.stepIds.push(targetStep.stepId);
    }
  }
  canonical.steps.forEach((step) => {
    step.itemIds = step.itemIds.filter(
      (itemId) => itemId !== incomingItem.itemId,
    );
  });
  incomingItem.stepId = targetStep.stepId;
  if (!targetStep.itemIds.includes(incomingItem.itemId)) {
    targetStep.itemIds.push(incomingItem.itemId);
  }
}

function keepActiveStructuralValue(
  activeParseResult: AuthoringParseResult,
  incomingParseResult: AuthoringParseResult,
  activeItem: CanonicalAuthoringItem,
  incomingItem: CanonicalAuthoringItem,
  field: AuthoringSourceUpdateField,
): void {
  if (field === 'source_checked') {
    if (activeItem.sourceChecked === undefined) delete incomingItem.sourceChecked;
    else incomingItem.sourceChecked = activeItem.sourceChecked;
  } else if (field === 'role') incomingItem.role = activeItem.role;
  else if (field === 'included') incomingItem.included = activeItem.included;
  else if (field === 'nesting') {
    incomingItem.nestingLevel = activeItem.nestingLevel;
  } else if (field === 'step_mapping') {
    preserveActiveStepMapping(
      activeParseResult,
      incomingParseResult,
      activeItem,
      incomingItem,
    );
  }
}

function applyKeptOrder(
  parseResult: AuthoringParseResult,
  moves: Array<{ itemId: string; toIndex: number }>,
): void {
  moves
    .sort((left, right) => left.toIndex - right.toIndex)
    .forEach(({ itemId, toIndex }) => {
      const items = parseResult.canonical.items;
      const fromIndex = items.findIndex((item) => item.itemId === itemId);
      if (fromIndex < 0) return;
      const [moved] = items.splice(fromIndex, 1);
      const boundedIndex = Math.max(0, Math.min(items.length, toIndex));
      items.splice(boundedIndex, 0, moved);
    });
}

function normalizeCanonicalStructure(parseResult: AuthoringParseResult): void {
  const canonical = parseResult.canonical;
  const stepById = new Map(
    canonical.steps.map((step) => [step.stepId, step]),
  );
  canonical.flow.stepIds = uniqueByIdentity(
    [
      ...canonical.flow.stepIds.filter((stepId) => stepById.has(stepId)),
      ...canonical.steps.map((step) => step.stepId),
    ],
    (stepId) => stepId,
  );
  canonical.steps = canonical.flow.stepIds
    .map((stepId) => stepById.get(stepId))
    .filter((step): step is NonNullable<typeof step> => Boolean(step));
  canonical.steps.forEach((step, index) => {
    step.order = index;
    step.itemIds = canonical.items
      .filter((item) => item.stepId === step.stepId)
      .map((item) => item.itemId);
  });
  const itemById = new Map(
    canonical.items.map((item) => [item.itemId, item]),
  );
  const orderedItemIds = uniqueByIdentity(
    [
      ...canonical.steps.flatMap((step) => step.itemIds),
      ...canonical.items.map((item) => item.itemId),
    ],
    (itemId) => itemId,
  );
  canonical.items = orderedItemIds
    .map((itemId) => itemById.get(itemId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  canonical.items.forEach((item, index) => {
    item.order = index;
  });
}

function effectiveOwnedValue<T>(
  values: Partial<Record<TextAuthoringOwnership, T>> | undefined,
  lane: TextAuthoringOwnership,
): T | undefined {
  return values?.[lane];
}

function recomputeEffectiveValues(
  item: CanonicalAuthoringItem,
  lane: TextAuthoringOwnership,
): void {
  item.title = effectiveOwnedValue(item.titleOverrides, lane) ?? item.sourceTitle;
  item.detail = effectiveOwnedValue(item.detailOverrides, lane) ?? item.sourceDetail;
  item.completion = effectiveOwnedValue(item.completionOverrides, lane)
    ?? item.sourceCompletion;
  item.schedule = effectiveOwnedValue(item.scheduleOverrides, lane)
    ?? item.sourceSchedule;
}

function sourceCompletionValue(
  item: CanonicalAuthoringItem,
): AuthoringCompletion | undefined {
  return item.sourceCompletion
    ?? (item.completion?.owner === 'source'
      ? cloneAuthoringValue(item.completion)
      : undefined);
}

function sourceScheduleValue(
  item: CanonicalAuthoringItem,
): AuthoringSchedule | undefined {
  return item.sourceSchedule
    ?? (!item.scheduleOverrides && item.schedule
      ? cloneAuthoringValue(item.schedule)
      : undefined);
}

function itemSourceRowIds(item: CanonicalAuthoringItem): string[] {
  return [...new Set([
    ...item.sourceRowIds,
    ...item.properties.flatMap((property) => property.sourceRowIds),
    ...item.resources.flatMap((link) => link.sourceRowIds),
    ...item.sources.flatMap((link) => link.sourceRowIds),
    ...(item.completion?.sourceRowIds ?? []),
    ...(item.sourceCompletion?.sourceRowIds ?? []),
    ...Object.values(item.completionOverrides ?? {})
      .flatMap((completion) => completion?.sourceRowIds ?? []),
  ])];
}

function preservePreviousSourceItem(
  document: TextAuthoringDocument,
  incomingParseResult: TextAuthoringDocument['parseResult'],
  activeItem: CanonicalAuthoringItem,
  sourceSnapshotId: string,
): void {
  const canonical = incomingParseResult.canonical;
  if (canonical.items.some((item) => item.itemId === activeItem.itemId)) return;
  let step = canonical.steps.find(
    (candidate) => candidate.stepId === activeItem.stepId,
  );
  if (!step) {
    const stepId = stableAuthoringId(
      'step',
      document.documentId,
      sourceSnapshotId,
      'previous-source',
    );
    step = canonical.steps.find((candidate) => candidate.stepId === stepId);
    if (!step) {
      step = {
        stepId,
        flowId: canonical.flow.flowId,
        title: 'Previous source',
        order: canonical.steps.length,
        itemIds: [],
        sourceRowIds: [],
        generated: true,
      };
      canonical.steps.push(step);
      canonical.flow.stepIds.push(stepId);
    }
  }

  const preservedItem = cloneAuthoringValue(activeItem);
  preservedItem.stepId = step.stepId;
  preservedItem.included = false;
  preservedItem.sourceDisposition = 'previous_source';
  canonical.items.push(preservedItem);
  step.itemIds.push(preservedItem.itemId);

  const preservedSourceRowIds = new Set(itemSourceRowIds(preservedItem));
  const existingSourceRowIds = new Set(
    canonical.sourceRows.map((row) => row.sourceRowId),
  );
  document.parseResult.canonical.sourceRows
    .filter((row) => (
      preservedSourceRowIds.has(row.sourceRowId)
      && !existingSourceRowIds.has(row.sourceRowId)
    ))
    .forEach((row) => {
      canonical.sourceRows.push({
        ...cloneAuthoringValue(row),
        state: 'tombstone',
        sourceSnapshotId,
      });
      existingSourceRowIds.add(row.sourceRowId);
    });

  const existingSourceRefIds = new Set(
    canonical.sourceRefs.map((sourceRef) => sourceRef.sourceRefId),
  );
  document.parseResult.canonical.sourceRefs
    .filter((sourceRef) => (
      sourceRef.entityType === 'item'
      && sourceRef.entityId === activeItem.itemId
      && !existingSourceRefIds.has(sourceRef.sourceRefId)
    ))
    .forEach((sourceRef) => {
      canonical.sourceRefs.push(cloneAuthoringValue(sourceRef));
      existingSourceRefIds.add(sourceRef.sourceRefId);
    });
}

export function applyAuthoringSourceUpdate(
  document: TextAuthoringDocument,
  now: string,
): void {
  const state = document.sourceState;
  if (!state || state.status === 'current') {
    throw new Error('No source update is staged.');
  }
  assertValidStagedSourceUpdateDecisions(state.changes);
  const validated = validatedStagedSourceUpdate(document, state);
  assertNoUnsupportedSourceSemanticDifferences(
    document,
    state.incoming,
    validated.matches,
    state.changes,
  );
  const open = state.changes.filter((change) => change.state === 'open');
  if (open.length > 0) {
    throw new Error('Every source update change needs an explicit decision.');
  }

  const incomingParseResult = cloneAuthoringValue(state.incoming.parseResult);
  const activeById = new Map(
    document.parseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  const incomingById = new Map(
    incomingParseResult.canonical.items.map((item) => [item.itemId, item]),
  );
  for (const match of validated.matches) {
    const activeItem = activeById.get(match.activeItemId);
    const incomingItem = incomingById.get(match.incomingItemId);
    if (!activeItem || !incomingItem) {
      throw new Error('A staged source update match is no longer valid.');
    }
    incomingItem.sourceCompletion = sourceCompletionValue(incomingItem);
    incomingItem.sourceSchedule = sourceScheduleValue(incomingItem);
    transferOwnedValues(incomingItem, activeItem);
  }

  const keptOrderMoves: Array<{ itemId: string; toIndex: number }> = [];
  for (const change of state.changes) {
    if (change.kind === 'changed') {
      const incomingItem = incomingById.get(change.incomingItemId);
      const activeItem = activeById.get(change.activeItemId);
      if (
        change.resolution === 'keep_user'
        && incomingItem
        && activeItem
      ) {
        keepActiveStructuralValue(
          document.parseResult,
          incomingParseResult,
          activeItem,
          incomingItem,
          change.field,
        );
        if (change.field === 'order') {
          keptOrderMoves.push({
            itemId: incomingItem.itemId,
            toIndex: activeItem.order,
          });
        }
        markIncomingMappingsCorrected(
          incomingParseResult,
          incomingItem.itemId,
        );
      } else if (
        change.resolution === 'use_incoming'
        && incomingItem
        && change.userOwner
      ) {
        clearOwnedField(incomingItem, change.field, change.userOwner);
      }
    }
    if (change.kind === 'added' && change.resolution === 'exclude_added') {
      const item = incomingById.get(change.incomingItemId);
      if (item) item.included = false;
    }
    if (change.kind === 'removed' && change.resolution === 'keep_previous') {
      const activeItem = activeById.get(change.activeItemId);
      if (activeItem) {
        preservePreviousSourceItem(
          document,
          incomingParseResult,
          activeItem,
          state.active.snapshotId,
        );
      }
    }
  }
  applyKeptOrder(incomingParseResult, keptOrderMoves);
  normalizeCanonicalStructure(incomingParseResult);
  incomingParseResult.canonical.items.forEach((item) => {
    item.sourceCompletion = sourceCompletionValue(item);
    item.sourceSchedule = sourceScheduleValue(item);
    recomputeEffectiveValues(item, document.ownership);
  });

  const nextActive = cloneAuthoringValue(state.incoming.snapshot);
  document.rawText = state.incoming.rawText;
  if (state.incoming.inputKinds) {
    document.inputKinds = cloneAuthoringValue(state.incoming.inputKinds);
  }
  if (state.incoming.primaryInputKind) {
    document.primaryInputKind = state.incoming.primaryInputKind;
  }
  document.parseResult = incomingParseResult;
  if (nextActive.sourceTitle) document.sourceTitle = nextActive.sourceTitle;
  else delete document.sourceTitle;
  if (nextActive.sourceUrl) document.sourceUrl = nextActive.sourceUrl;
  else delete document.sourceUrl;
  document.sourceState = {
    status: 'current',
    active: nextActive,
  };
  document.reviewGates = (document.reviewGates ?? []).map((gate) => ({
    gateId: gate.gateId,
    kind: gate.kind,
    status: gate.status === 'evidence_recorded' ? 'required' : gate.status,
    sourceSnapshotId: nextActive.snapshotId,
    sourceRowIds: document.parseResult.canonical.sourceRows
      .filter((row) => row.state !== 'tombstone')
      .map((row) => row.sourceRowId),
    reasonKey: gate.reasonKey,
    ...(gate.status === 'personal_only' && gate.evidenceNote
      ? { evidenceNote: gate.evidenceNote }
      : {}),
    ...(gate.status === 'personal_only' && gate.actorLane
      ? { actorLane: gate.actorLane }
      : {}),
    ...(gate.status === 'personal_only' && gate.decidedAt
      ? { decidedAt: gate.decidedAt }
      : {}),
  }));
  document.updatedAt = now;
}

export function rejectAuthoringSourceUpdate(
  document: TextAuthoringDocument,
): void {
  const state = document.sourceState;
  if (!state || state.status === 'current') {
    throw new Error('No source update is staged.');
  }
  document.sourceState = {
    status: 'current',
    active: cloneAuthoringValue(state.active),
  };
}
