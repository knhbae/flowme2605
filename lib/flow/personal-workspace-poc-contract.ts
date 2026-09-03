import type { PersonalWorkspacePocAuthoringFidelityManifest } from './personal-workspace-poc-authoring-fidelity';

export const PERSONAL_WORKSPACE_POC_VERSION = 1 as const;
export const PERSONAL_WORKSPACE_POC_WORKSPACE_ID = 'local-device-poc-v1';
export const PERSONAL_WORKSPACE_POC_STORAGE_PREFIX = 'flow:poc:personal-workspace:v1:';
export const PERSONAL_WORKSPACE_POC_STATE_KEY = `${PERSONAL_WORKSPACE_POC_STORAGE_PREFIX}state`;

export const PERSONAL_WORKSPACE_POC_DEFAULTS = Object.freeze({
  maxFolderDepth: 2,
  membershipsPerMember: 1,
  datedItemTimelinePolicy: 'auto' as const,
  quickItemCompletion: 'status/completedAt' as const,
  deletedFolderDestination: 'unfiled' as const,
  undoDepth: 1,
});

export type PersonalWorkspacePocOrigin =
  | 'source-backed-map'
  | 'personal-draft'
  | 'canonical-personal-copy'
  | 'legacy-saved-plan'
  | 'authoring-handoff';

/**
 * Field ownership stays independent from the saved-plan origin. A source-backed
 * Flow can still contain an existing personal override, while an authoring
 * handoff owns the source snapshot that was explicitly confirmed by the user.
 */
export type PersonalWorkspacePocFieldOwner =
  | 'source'
  | 'authoring'
  | 'existing-personal'
  | 'poc-personal'
  | 'derived'
  | 'none';

export type PersonalWorkspacePocFieldProvenance =
  | 'flow-bundle'
  | 'saved-map-snapshot'
  | 'saved-map-persistence'
  | 'saved-record'
  | 'map-personal-copy'
  | 'my-flow-item-draft'
  | 'my-flow-date-override'
  | 'personal-structural-overlay'
  | 'poc-personal-plan'
  | 'authoring-handoff'
  | 'derived-anchor-offset'
  | 'legacy-v1-fallback'
  | 'none';

export type PersonalWorkspacePocOwnedFieldValue<T> = Readonly<{
  /** Missing means that the layer intentionally has no value (for example, undated). */
  value?: T;
  owner: PersonalWorkspacePocFieldOwner;
  provenance: PersonalWorkspacePocFieldProvenance;
}>;

export type PersonalWorkspacePocFieldLayers<T> = Readonly<{
  source: PersonalWorkspacePocOwnedFieldValue<T>;
  existingPersonal: PersonalWorkspacePocOwnedFieldValue<T>;
  effective: PersonalWorkspacePocOwnedFieldValue<T>;
}>;

export type PersonalWorkspacePocScheduleInput = Readonly<
  | {
      mode: 'day-offset';
      dayOffset: number;
      owner: PersonalWorkspacePocFieldOwner;
      provenance: PersonalWorkspacePocFieldProvenance;
    }
  | {
      mode: 'absolute';
      /** May be absent when a legacy source labels a schedule absolute but omits its date. */
      date?: string;
      owner: PersonalWorkspacePocFieldOwner;
      provenance: PersonalWorkspacePocFieldProvenance;
    }
  | {
      mode: 'none';
      owner: PersonalWorkspacePocFieldOwner;
      provenance: PersonalWorkspacePocFieldProvenance;
    }
  | {
      mode: 'unsupported';
      sourceMode: string;
      owner: PersonalWorkspacePocFieldOwner;
      provenance: PersonalWorkspacePocFieldProvenance;
    }
>;

export type PersonalWorkspacePocDateDerivation = Readonly<{
  sourceSchedule: PersonalWorkspacePocScheduleInput;
  existingPersonalSchedule: PersonalWorkspacePocScheduleInput;
  /** Present only after the isolated PoC structural overlay wins. */
  pocPersonalSchedule?: PersonalWorkspacePocScheduleInput;
  /** Only populated when an offset schedule actually consumes the Flow anchor. */
  anchorInput: PersonalWorkspacePocOwnedFieldValue<string>;
  /** Winning direct date override; structural base schedules stay in the field above. */
  existingPersonalOverride: PersonalWorkspacePocOwnedFieldValue<string>;
  effectiveDate: PersonalWorkspacePocOwnedFieldValue<string>;
  strategy:
    | 'source-day-offset'
    | 'source-absolute'
    | 'existing-personal-schedule'
    | 'existing-personal-override'
    | 'poc-personal-schedule'
    | 'unsupported-source-schedule'
    | 'undated';
}>;

export type PersonalWorkspacePocFlowItemFieldOwnership = Readonly<{
  title: PersonalWorkspacePocFieldLayers<string>;
  description: PersonalWorkspacePocFieldLayers<string>;
  order: PersonalWorkspacePocFieldLayers<number>;
  date: PersonalWorkspacePocFieldLayers<string>;
  dateDerivation: PersonalWorkspacePocDateDerivation;
}>;

export type PersonalWorkspacePocFlowFieldOwnership = Readonly<{
  title: PersonalWorkspacePocFieldLayers<string>;
  anchorDate: PersonalWorkspacePocFieldLayers<string>;
}>;

/**
 * Read-only hints used to present saved origins in the integrated entry. They
 * are rebuilt from operating data and are never a persistence owner.
 */
export type PersonalWorkspacePocFlowPresentation = Readonly<{
  discovery?: Readonly<{
    sourceTitle?: string;
    /** Raw source URLs. Consumers canonicalize a copy and never rewrite these values. */
    sourceUrls: readonly string[];
  }>;
  mapGroup?: Readonly<{
    /** Internal grouping identity. UI copy must not expose this technical value. */
    groupRef: string;
    ownerId: string;
    title: string;
    childOrder: number;
    childCount: number;
    executionState: 'executable' | 'review-hold';
    reviewReasons: readonly string[];
  }>;
}>;

/**
 * Stable structural identity exposed by the read projection. Only an actual
 * personal-draft bundle section or a confirmed authoring-handoff section can
 * opt into the isolated PoC shadow writer. Runtime grouping labels never
 * appear in this catalog.
 */
export type PersonalWorkspacePocFlowSection = Readonly<{
  sectionId: string;
  title: string;
  sourceOrder: number;
  titleOwner: 'source' | 'authoring' | 'existing-personal';
  editCapability: 'read-only' | 'poc-shadow';
}>;

export type PersonalWorkspacePocFlowItem = Readonly<{
  ref: string;
  savedCopyId: string;
  flowId: string;
  itemId: string;
  title: string;
  description?: string;
  /** Stable only when this Item belongs to an actual Flow section. */
  sectionId?: string;
  sectionTitle?: string;
  /** Legacy UI-compatible effective order. Read fieldOwnership.order for its layers. */
  sourceOrder: number;
  /** Legacy UI-compatible effective date. Read fieldOwnership.date for its layers. */
  sourceDate?: string;
  sourceTimingLabel?: string;
  /**
   * Additive v1 metadata. Newly projected saved-plan rows always provide it;
   * optionality keeps already persisted authoring-handoff v1 payloads readable.
   */
  fieldOwnership?: PersonalWorkspacePocFlowItemFieldOwnership;
}>;

export type PersonalWorkspacePocFlow = Readonly<{
  ref: string;
  savedCopyId: string;
  flowId: string;
  sourceSlug: string;
  title: string;
  origin: PersonalWorkspacePocOrigin;
  anchorDate?: string;
  /** See PersonalWorkspacePocFlowItem.fieldOwnership. */
  fieldOwnership?: PersonalWorkspacePocFlowFieldOwnership;
  /** Additive, presentation-only metadata rebuilt by the read adapter. */
  presentation?: PersonalWorkspacePocFlowPresentation;
  /** Additive v1 structural catalog; omission keeps earlier handoffs readable. */
  sections?: readonly PersonalWorkspacePocFlowSection[];
  items: readonly PersonalWorkspacePocFlowItem[];
}>;

export type PersonalWorkspacePocReadModel = Readonly<{
  version: typeof PERSONAL_WORKSPACE_POC_VERSION;
  flows: readonly PersonalWorkspacePocFlow[];
}>;

export type PersonalWorkspacePocAuthoringSourceLineItemIdentity = Readonly<{
  sourceLine: number;
  itemRef: string;
  savedCopyId: string;
  flowId: string;
  itemId: string;
}>;

export type PersonalWorkspacePocAuthoringSourceLineItemIdentityMap = Readonly<
  Record<string, PersonalWorkspacePocAuthoringSourceLineItemIdentity>
>;

export type PersonalWorkspacePocAuthoringLineage = Readonly<{
  /** Missing only for already-persisted additive-v1 handoffs. */
  source?: 'text-authoring-poc-v1';
  handoffId: string;
  documentId: string;
  revisionId: string;
  parseResultId: string;
  sourceSnapshotId: string;
  rawText: string;
  sourceFingerprint: string;
  templateId?: string;
  /** Exact parser output retained for a source-to-Item audit. */
  parsedItems?: readonly PersonalWorkspacePocAuthoringParsedItemSnapshot[];
  /** Decimal source-line key to the exact materialized Item identity. */
  sourceLineItemIdentityMap?: PersonalWorkspacePocAuthoringSourceLineItemIdentityMap;
  /** Deterministic loss/fidelity decision for the exact rawText bytes. */
  fidelityManifest?: PersonalWorkspacePocAuthoringFidelityManifest;
  committedAt: string;
}>;

export type PersonalWorkspacePocAuthoringWeekday =
  | 'MO'
  | 'TU'
  | 'WE'
  | 'TH'
  | 'FR'
  | 'SA'
  | 'SU';

/**
 * Structured recurrence parsed from the bounded Text Authoring grammar. This
 * is an additive PoC contract, not an operating recurrence schema.
 */
export type PersonalWorkspacePocAuthoringRecurrenceRuleV1 = Readonly<{
  version: 1;
  raw: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  weekdays?: readonly PersonalWorkspacePocAuthoringWeekday[];
  dayOfMonth?: number;
  end?: Readonly<
    | { mode: 'count'; count: number; raw: string }
    | { mode: 'until'; date: string; raw: string }
  >;
  /** Display-only source memo. It never filters or creates occurrences. */
  executionCondition?: string;
}>;

export type PersonalWorkspacePocAuthoringSubcheckSnapshot = Readonly<{
  subcheckId: string;
  sourceLine: number;
  sourceOrder: number;
  title: string;
  sourceChecked: boolean;
}>;

export type PersonalWorkspacePocAuthoringParsedItemSnapshot = Readonly<{
  sourceLine: number;
  sourceOrder: number;
  title: string;
  sectionTitle?: string;
  /** Source checkbox state, retained without applying operating completion. */
  sourceChecked?: boolean;
  description?: string;
  /** Unknown direct Item properties retained verbatim as `label: value`. */
  additionalDescriptions?: readonly string[];
  relativeDate?: string;
  date?: string;
  resolvedDate?: string;
  time?: string;
  timeZone?: string;
  place?: string;
  durationMinutes?: number;
  resourceUrl?: string;
  resourceLabel?: string;
  sourceUrl?: string;
  sourceLabel?: string;
  recurrence?: string;
  recurrenceEnd?: string;
  recurrenceRule?: PersonalWorkspacePocAuthoringRecurrenceRuleV1;
  executionCondition?: string;
  completionCriteria?: string;
  guide?: string;
  caution?: string;
  subchecks?: readonly PersonalWorkspacePocAuthoringSubcheckSnapshot[];
}>;

export type PersonalWorkspacePocAuthoredFlow = PersonalWorkspacePocFlow & Readonly<{
  origin: 'authoring-handoff';
  authoring: PersonalWorkspacePocAuthoringLineage;
}>;

const EMPTY_OWNED_FIELD_VALUE: PersonalWorkspacePocOwnedFieldValue<never> = Object.freeze({
  owner: 'none',
  provenance: 'none',
});

function emptyOwnedFieldValue<T>(): PersonalWorkspacePocOwnedFieldValue<T> {
  return EMPTY_OWNED_FIELD_VALUE;
}

function legacyFieldLayers<T>(options: {
  value?: T;
  origin: PersonalWorkspacePocOrigin;
}): PersonalWorkspacePocFieldLayers<T> {
  const owner: PersonalWorkspacePocFieldOwner = options.origin === 'authoring-handoff'
    ? 'authoring'
    : 'source';
  const provenance: PersonalWorkspacePocFieldProvenance = options.origin === 'authoring-handoff'
    ? 'authoring-handoff'
    : 'legacy-v1-fallback';
  const value = {
    ...(options.value !== undefined ? { value: options.value } : {}),
    owner,
    provenance,
  } satisfies PersonalWorkspacePocOwnedFieldValue<T>;
  return {
    source: value,
    existingPersonal: emptyOwnedFieldValue<T>(),
    effective: value,
  };
}

/**
 * Normalizes old additive-v1 payloads without rewriting them. In particular,
 * an authoring handoff created before fieldOwnership existed is still exposed
 * as authoring-owned rather than being mistaken for an operating source row.
 */
export function getPersonalWorkspacePocFlowFieldOwnership(
  flow: PersonalWorkspacePocFlow,
): PersonalWorkspacePocFlowFieldOwnership {
  return flow.fieldOwnership ?? {
    title: legacyFieldLayers({ value: flow.title, origin: flow.origin }),
    anchorDate: legacyFieldLayers({ value: flow.anchorDate, origin: flow.origin }),
  };
}

export function getPersonalWorkspacePocFlowItemFieldOwnership(
  item: PersonalWorkspacePocFlowItem,
  origin: PersonalWorkspacePocOrigin,
  flow?: Pick<PersonalWorkspacePocFlow, 'anchorDate' | 'fieldOwnership' | 'origin'>,
): PersonalWorkspacePocFlowItemFieldOwnership {
  if (item.fieldOwnership) return item.fieldOwnership;
  const owner: PersonalWorkspacePocFieldOwner = origin === 'authoring-handoff'
    ? 'authoring'
    : 'source';
  const provenance: PersonalWorkspacePocFieldProvenance = origin === 'authoring-handoff'
    ? 'authoring-handoff'
    : 'legacy-v1-fallback';
  const relativeTiming = item.sourceTimingLabel?.split('·', 1)[0]?.trim();
  const offset = relativeTiming === 'D-Day'
    ? 0
    : /^D([+-]\d+)$/u.exec(relativeTiming ?? '')?.[1];
  const dayOffset = typeof offset === 'string' ? Number(offset) : offset;
  const sourceSchedule: PersonalWorkspacePocScheduleInput = Number.isFinite(dayOffset)
    ? { mode: 'day-offset', dayOffset: Number(dayOffset), owner, provenance }
    : item.sourceDate
      ? { mode: 'absolute', date: item.sourceDate, owner, provenance }
      : { mode: 'none', owner, provenance };
  const anchorInput = sourceSchedule.mode === 'day-offset' && flow?.anchorDate
    ? flow.fieldOwnership?.anchorDate.effective
      ?? legacyFieldLayers({ value: flow.anchorDate, origin: flow.origin }).effective
    : emptyOwnedFieldValue<string>();
  const effectiveDate = item.sourceDate
    ? {
        value: item.sourceDate,
        owner: sourceSchedule.mode === 'day-offset' ? 'derived' as const : owner,
        provenance: sourceSchedule.mode === 'day-offset'
          ? 'derived-anchor-offset' as const
          : provenance,
      }
    : emptyOwnedFieldValue<string>();
  const date = fieldLayersFromLegacySchedule({
    sourceSchedule,
    effectiveDate,
  });
  return {
    title: legacyFieldLayers({ value: item.title, origin }),
    description: legacyFieldLayers({ value: item.description, origin }),
    order: legacyFieldLayers({ value: item.sourceOrder, origin }),
    date,
    dateDerivation: {
      sourceSchedule,
      existingPersonalSchedule: { mode: 'none', owner: 'none', provenance: 'none' },
      anchorInput,
      existingPersonalOverride: emptyOwnedFieldValue<string>(),
      effectiveDate,
      strategy: sourceSchedule.mode === 'day-offset'
        ? 'source-day-offset'
        : sourceSchedule.mode === 'absolute'
          ? 'source-absolute'
          : 'undated',
    },
  };
}

function fieldLayersFromLegacySchedule(options: {
  sourceSchedule: PersonalWorkspacePocScheduleInput;
  effectiveDate: PersonalWorkspacePocOwnedFieldValue<string>;
}): PersonalWorkspacePocFieldLayers<string> {
  const source = options.sourceSchedule.mode === 'absolute'
    ? {
        ...(options.sourceSchedule.date ? { value: options.sourceSchedule.date } : {}),
        owner: options.sourceSchedule.owner,
        provenance: options.sourceSchedule.provenance,
      }
    : {
        owner: options.sourceSchedule.owner,
        provenance: options.sourceSchedule.provenance,
      };
  return {
    source,
    existingPersonal: emptyOwnedFieldValue<string>(),
    effective: options.effectiveDate,
  };
}

export type PersonalWorkspacePocAuthoringReceipt = {
  handoffId: string;
  flowRef: string;
  committedAt: string;
};

export type PersonalWorkspacePocFolder = {
  folderId: string;
  title: string;
  parentFolderId?: string;
  orderKey: number;
};

export type PersonalWorkspacePocFolderMembership = {
  member: 'saved_flow' | 'quick_item';
  memberRef: string;
  folderId?: string;
  orderKey: number;
};

export type PersonalWorkspacePocQuickItem = {
  quickItemId: string;
  title: string;
  memo: string;
  status: 'open' | 'completed';
  completedAt?: string;
  createdAt: string;
};

/**
 * PoC-only lifecycle shadow. The imported Flow/source remains read-only; this
 * record only controls whether the member is projected in this local workspace.
 */
export type PersonalWorkspacePocTrashEntry = {
  member: 'saved_flow' | 'quick_item';
  memberRef: string;
  trashedAt: string;
  hadMembership: boolean;
  previousFolderId?: string;
  previousOrderKey?: number;
};

/** A minimal tombstone prevents a read-only origin Flow from reappearing. */
export type PersonalWorkspacePocDeletedMember = {
  member: 'saved_flow' | 'quick_item';
  memberRef: string;
  deletedAt: string;
};

export type PersonalWorkspacePocExecutionPlacement = {
  itemRef: string;
  scheduleMode: 'inherit' | 'fixed_date' | 'unscheduled';
  date?: string;
  time?: string;
  timelinePolicy: 'auto' | 'included' | 'excluded';
};

export type PersonalWorkspacePocTimelineOrder = {
  context: 'date' | 'undated' | 'overdue';
  contextKey: string;
  orderedRefKeys: string[];
  revision: number;
};

export type PersonalWorkspacePocCompletion = {
  status: 'open' | 'completed';
  completedAt?: string;
};

/**
 * P2-B execution overlay for one derived recurrence occurrence. The source
 * Item and its recurrence rule remain read-only; originalDate is identity,
 * while date is only the effective personal execution location.
 */
export type PersonalWorkspacePocOccurrencePlacement = {
  occurrenceId: string;
  sourceItemRef: string;
  originalDate: string;
  scheduleMode: 'fixed_date' | 'unscheduled';
  date?: string;
};

export type PersonalWorkspacePocOccurrenceCompletion = {
  occurrenceId: string;
  sourceItemRef: string;
  originalDate: string;
  status: 'open' | 'completed';
  completedAt?: string;
};

export type PersonalWorkspacePocPersonalPlanScheduleOverride = Readonly<
  | { mode: 'fixed_date'; date: string }
  | { mode: 'unscheduled' }
>;

export type PersonalWorkspacePocPersonalPlanItemOverlay = Readonly<{
  itemRef: string;
  /** Omission inherits; an override title must stay non-empty. */
  title?: string;
  /** Presence is meaningful: the empty string explicitly clears the personal memo. */
  memo?: string;
  /** Omission inherits the imported-personal/source plan schedule. */
  schedule?: PersonalWorkspacePocPersonalPlanScheduleOverride;
}>;

export type PersonalWorkspacePocPersonalPlanOverlay = Readonly<{
  flowRef: string;
  savedCopyId: string;
  flowId: string;
  /** Omission inherits the imported-personal/source title. */
  title?: string;
  /** When present this must contain every Item ref exactly once. */
  orderedItemRefs?: readonly string[];
  /** Personal aliases keyed by a stable, explicitly editable section ID. */
  sectionTitles?: Readonly<Record<string, string>>;
  items: Readonly<Record<string, PersonalWorkspacePocPersonalPlanItemOverlay>>;
}>;

export type PersonalWorkspacePocSnapshot = {
  workspaceId: string;
  revision: number;
  folders: PersonalWorkspacePocFolder[];
  memberships: PersonalWorkspacePocFolderMembership[];
  quickItems: PersonalWorkspacePocQuickItem[];
  placements: Record<string, PersonalWorkspacePocExecutionPlacement>;
  timelineOrders: PersonalWorkspacePocTimelineOrder[];
  completions: Record<string, PersonalWorkspacePocCompletion>;
  /** Additive P2-B fields. Optional keeps every earlier v1 payload readable. */
  occurrencePlacements?: Record<string, PersonalWorkspacePocOccurrencePlacement>;
  occurrenceCompletions?: Record<string, PersonalWorkspacePocOccurrenceCompletion>;
  /** Additive P1 fields. Optional keeps already-saved P0 v1 payloads readable. */
  authoredFlows?: PersonalWorkspacePocAuthoredFlow[];
  authoringReceipts?: PersonalWorkspacePocAuthoringReceipt[];
  /** Additive Stage 1 structural shadow edits. */
  personalPlanOverlays?: Record<string, PersonalWorkspacePocPersonalPlanOverlay>;
  /** Additive PoC-only lifecycle state; omission keeps older v1 payloads readable. */
  trashEntries?: PersonalWorkspacePocTrashEntry[];
  /** Permanent removal is local projection suppression, never an operating writer call. */
  deletedMembers?: PersonalWorkspacePocDeletedMember[];
  updatedAt: string;
};

export type PersonalWorkspacePocUndoSnapshot = {
  label: string;
  snapshot: PersonalWorkspacePocSnapshot;
  /** Exact companion bytes restored only by the fixed PoC authoring-draft key. */
  storageCompanion?: Readonly<{
    kind: 'authoring-draft';
    rawValue: string | null;
  }>;
};

export type PersonalWorkspacePocState = PersonalWorkspacePocSnapshot & {
  version: typeof PERSONAL_WORKSPACE_POC_VERSION;
  undo?: PersonalWorkspacePocUndoSnapshot;
};

export type PersonalWorkspacePocTransition =
  | {
      type: 'create-folder';
      folderId: string;
      title: string;
      parentFolderId?: string;
      now: string;
    }
  | { type: 'delete-folder'; folderId: string; now: string }
  | {
      type: 'create-quick-item';
      quickItemId: string;
      title: string;
      memo?: string;
      date?: string;
      folderId?: string;
      now: string;
    }
  | {
      /** QuickItem is a root personal Item, never a synthetic Flow. */
      type: 'update-quick-item';
      quickItemId: string;
      expectedRevision: number;
      title: string;
      memo: string;
      /** QuickItem owns its initial execution date; omission means unscheduled. */
      date?: string;
      now: string;
    }
  | {
      type: 'move-folder';
      member: 'saved_flow' | 'quick_item';
      memberRef: string;
      folderId?: string;
      now: string;
    }
  | {
      type: 'move-to-trash';
      member: 'saved_flow' | 'quick_item';
      memberRef: string;
      now: string;
    }
  | {
      type: 'restore-from-trash';
      member: 'saved_flow' | 'quick_item';
      memberRef: string;
      now: string;
    }
  | {
      type: 'permanently-delete-from-trash';
      member: 'saved_flow' | 'quick_item';
      memberRef: string;
      /** Required for a Flow so its PoC execution shadow can be removed safely. */
      itemRefs?: string[];
      now: string;
    }
  | {
      type: 'move-date';
      itemRef: string;
      date?: string;
      /** @deprecated Compatibility hint only. The transition never trusts it for no-op resolution. */
      currentDate?: string;
      now: string;
    }
  | {
      type: 'restore-execution-date';
      itemRef: string;
      now: string;
    }
  | {
      type: 'set-timeline-policy';
      itemRef: string;
      policy: 'auto' | 'included' | 'excluded';
      now: string;
    }
  | {
      type: 'reorder';
      context: PersonalWorkspacePocTimelineOrder['context'];
      contextKey: string;
      orderedRefKeys: string[];
      currentOrderedRefKeys?: string[];
      now: string;
    }
  | {
      type: 'reset-order';
      context: PersonalWorkspacePocTimelineOrder['context'];
      contextKey: string;
      now: string;
    }
  | {
      type: 'complete';
      itemRef: string;
      completed: boolean;
      now: string;
    }
  | {
      type: 'move-occurrence-date';
      occurrenceId: string;
      sourceItemRef: string;
      originalDate: string;
      date?: string;
      now: string;
    }
  | {
      type: 'restore-occurrence-date';
      occurrenceId: string;
      sourceItemRef: string;
      originalDate: string;
      now: string;
    }
  | {
      type: 'complete-occurrence';
      occurrenceId: string;
      sourceItemRef: string;
      originalDate: string;
      completed: boolean;
      now: string;
    }
  | {
      type: 'apply-personal-plan';
      expectedRevision: number;
      flowRef: string;
      savedCopyId: string;
      flowId: string;
      origin: PersonalWorkspacePocOrigin;
      knownItemRefs: string[];
      /** Required when sectionTitles contains an override. */
      knownSectionIds?: string[];
      /** Subset of knownSectionIds that owns a PoC-local title shadow. */
      editableSectionIds?: string[];
      overlay: PersonalWorkspacePocPersonalPlanOverlay;
      now: string;
    }
  | {
      type: 'commit-authoring-handoff';
      flow: PersonalWorkspacePocAuthoredFlow;
      folderId?: string;
      sourceConfirmed: boolean;
      confirmedSourceFingerprint: string;
      blockingIssues: string[];
      lossFields: string[];
      lossAccepted: boolean;
      existingFlowRefs?: string[];
      /** Exact pre-commit draft bytes, captured read-only for one-step Undo. */
      undoAuthoringDraftRawValue: string | null;
      now: string;
    }
  | { type: 'undo'; now: string }
  | { type: 'cancel'; reason?: string };

export type PersonalWorkspacePocTransitionResult = Readonly<{
  state: PersonalWorkspacePocState;
  changed: boolean;
  message: string;
  error?: string;
  storageCompanion?: PersonalWorkspacePocUndoSnapshot['storageCompanion'];
}>;

function encodeRefSegment(value: string): string {
  return encodeURIComponent(value);
}

export function toPersonalWorkspacePocFlowRef(
  savedCopyId: string,
  flowId: string,
): string {
  return `saved-flow:${encodeRefSegment(savedCopyId)}:${encodeRefSegment(flowId)}`;
}

export function toPersonalWorkspacePocFlowItemRef(
  savedCopyId: string,
  flowId: string,
  itemId: string,
): string {
  return [
    'flow-item',
    encodeRefSegment(savedCopyId),
    encodeRefSegment(flowId),
    encodeRefSegment(itemId),
  ].join(':');
}

export function toPersonalWorkspacePocMapGroupRef(mapOwnerId: string): string {
  return `flow-group:${encodeRefSegment(mapOwnerId)}`;
}

export function toPersonalWorkspacePocQuickItemRef(quickItemId: string): string {
  return `quick-item:${encodeRefSegment(PERSONAL_WORKSPACE_POC_WORKSPACE_ID)}:${encodeRefSegment(quickItemId)}`;
}
