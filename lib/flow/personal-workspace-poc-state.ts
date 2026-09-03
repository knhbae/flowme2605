import {
  PERSONAL_WORKSPACE_POC_DEFAULTS,
  PERSONAL_WORKSPACE_POC_VERSION,
  PERSONAL_WORKSPACE_POC_WORKSPACE_ID,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  toPersonalWorkspacePocQuickItemRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocFolder,
  type PersonalWorkspacePocPersonalPlanOverlay,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocSnapshot,
  type PersonalWorkspacePocState,
  type PersonalWorkspacePocTimelineOrder,
  type PersonalWorkspacePocTransition,
  type PersonalWorkspacePocTransitionResult,
} from './personal-workspace-poc-contract';
import {
  fingerprintPersonalWorkspacePocAuthoringSource,
  getPersonalWorkspacePocAuthoringTemplate,
  materializePersonalWorkspacePocAuthoring,
  type PersonalWorkspacePocAuthoringTemplateId,
} from './personal-workspace-poc-authoring';
import {
  isLegacyPersonalWorkspacePocAuthoringFidelityManifestForSource,
} from './personal-workspace-poc-authoring-fidelity';
import { expandPersonalWorkspacePocOccurrences } from './personal-workspace-poc-occurrence';

const PLAIN_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value.trim());
}

function isPersonalWorkspacePocAuthoringDraftRawValue(
  rawValue: string | null,
): boolean {
  if (rawValue === null) return true;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue) as unknown;
  } catch {
    return false;
  }
  if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.rawText !== 'string') {
    return false;
  }
  return parsed.templateId === undefined
    || (typeof parsed.templateId === 'string'
      && getPersonalWorkspacePocAuthoringTemplate(parsed.templateId) !== null);
}

export function isPersonalWorkspacePocDate(value: unknown): value is string {
  if (typeof value !== 'string' || !PLAIN_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string'
    && Boolean(value)
    && Number.isFinite(Date.parse(value));
}

function isOrderKey(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMemberRefForKind(
  member: 'saved_flow' | 'quick_item',
  memberRef: string,
): boolean {
  return member === 'saved_flow'
    ? memberRef.startsWith('saved-flow:')
    : memberRef.startsWith(`quick-item:${encodeURIComponent(PERSONAL_WORKSPACE_POC_WORKSPACE_ID)}:`);
}

function parentFlowRefFromItemRef(itemRef: string): string | undefined {
  const segments = itemRef.split(':');
  return segments.length === 4 && segments[0] === 'flow-item'
    ? `saved-flow:${segments[1]}:${segments[2]}`
    : undefined;
}

function isInactiveMemberRef(state: PersonalWorkspacePocSnapshot, memberRef: string): boolean {
  return (state.trashEntries ?? []).some((entry) => entry.memberRef === memberRef)
    || (state.deletedMembers ?? []).some((entry) => entry.memberRef === memberRef);
}

function isInactiveTaskRef(state: PersonalWorkspacePocSnapshot, itemRef: string): boolean {
  if (isInactiveMemberRef(state, itemRef)) return true;
  const flowRef = parentFlowRefFromItemRef(itemRef);
  return Boolean(flowRef && isInactiveMemberRef(state, flowRef));
}

function isPocOccurrenceIdentity(
  occurrenceId: string,
  sourceItemRef: string,
  originalDate: string,
): boolean {
  return isNonEmptyString(occurrenceId)
    && sourceItemRef.startsWith('flow-item:')
    && isPersonalWorkspacePocDate(originalDate)
    && occurrenceId.startsWith(`poc-occurrence-series:v1:${encodeURIComponent(sourceItemRef)}:`)
    && occurrenceId.endsWith(`:occurrence:${originalDate}`);
}

function snapshotOf(state: PersonalWorkspacePocState): PersonalWorkspacePocSnapshot {
  return clone({
    workspaceId: state.workspaceId,
    revision: state.revision,
    folders: state.folders,
    memberships: state.memberships,
    quickItems: state.quickItems,
    placements: state.placements,
    timelineOrders: state.timelineOrders,
    completions: state.completions,
    occurrencePlacements: state.occurrencePlacements ?? {},
    occurrenceCompletions: state.occurrenceCompletions ?? {},
    authoredFlows: state.authoredFlows ?? [],
    authoringReceipts: state.authoringReceipts ?? [],
    personalPlanOverlays: state.personalPlanOverlays ?? {},
    trashEntries: state.trashEntries ?? [],
    deletedMembers: state.deletedMembers ?? [],
    updatedAt: state.updatedAt,
  });
}

function isAuthoredFlow(value: unknown): value is PersonalWorkspacePocAuthoredFlow {
  if (!isRecord(value)
    || value.origin !== 'authoring-handoff'
    || !isNonEmptyString(value.ref)
    || !isNonEmptyString(value.savedCopyId)
    || !isNonEmptyString(value.flowId)
    || !isNonEmptyString(value.sourceSlug)
    || !isNonEmptyString(value.title)
    || !Array.isArray(value.items)
    || value.items.length === 0
    || (value.sections !== undefined && !Array.isArray(value.sections))
    || !isRecord(value.authoring)) return false;
  if (value.ref !== toPersonalWorkspacePocFlowRef(value.savedCopyId, value.flowId)) return false;
  if (value.anchorDate !== undefined && !isPersonalWorkspacePocDate(value.anchorDate)) return false;
  const lineage = value.authoring;
  if (!isNonEmptyString(lineage.handoffId)
    || !isNonEmptyString(lineage.documentId)
    || !isNonEmptyString(lineage.revisionId)
    || !isNonEmptyString(lineage.parseResultId)
    || !isNonEmptyString(lineage.sourceSnapshotId)
    || typeof lineage.rawText !== 'string'
    || !isNonEmptyString(lineage.sourceFingerprint)
    || (lineage.templateId !== undefined && !isNonEmptyString(lineage.templateId))
    || !isIsoTimestamp(lineage.committedAt)) return false;
  const hasPersistedFidelity = lineage.source !== undefined
    || lineage.parsedItems !== undefined
    || lineage.sourceLineItemIdentityMap !== undefined
    || lineage.fidelityManifest !== undefined;
  if (hasPersistedFidelity) {
    const hasCompleteSourceLines = isRecord(lineage.fidelityManifest)
      && Array.isArray(lineage.fidelityManifest.sourceLines);
    const hasCompleteIdentityMap = isRecord(lineage.sourceLineItemIdentityMap);
    if (
      lineage.source !== 'text-authoring-poc-v1'
      || !Array.isArray(lineage.parsedItems)
      || !isRecord(lineage.fidelityManifest)
      || hasCompleteSourceLines !== hasCompleteIdentityMap
      || fingerprintPersonalWorkspacePocAuthoringSource(lineage.rawText)
        !== lineage.sourceFingerprint
      || (lineage.templateId !== undefined
        && getPersonalWorkspacePocAuthoringTemplate(lineage.templateId) === null)
    ) return false;
    const rebuilt = materializePersonalWorkspacePocAuthoring({
      handoffId: lineage.handoffId,
      documentId: lineage.documentId,
      revisionId: lineage.revisionId,
      rawText: lineage.rawText,
      committedAt: lineage.committedAt,
      ...(lineage.templateId
        ? { templateId: lineage.templateId as PersonalWorkspacePocAuthoringTemplateId }
        : {}),
    });
    const fidelityMatches = hasCompleteSourceLines
      ? JSON.stringify(rebuilt.ok ? rebuilt.lineage.fidelityManifest : null)
        === JSON.stringify(lineage.fidelityManifest)
      : isLegacyPersonalWorkspacePocAuthoringFidelityManifestForSource(
        lineage.fidelityManifest,
        {
          rawText: lineage.rawText,
          sourceFingerprint: lineage.sourceFingerprint,
        },
      );
    if (!rebuilt.ok
      || rebuilt.lineage.parseResultId !== lineage.parseResultId
      || rebuilt.lineage.sourceSnapshotId !== lineage.sourceSnapshotId
      || JSON.stringify(rebuilt.lineage.parsedItems) !== JSON.stringify(lineage.parsedItems)
      || (hasCompleteIdentityMap
        && JSON.stringify(rebuilt.lineage.sourceLineItemIdentityMap)
          !== JSON.stringify(lineage.sourceLineItemIdentityMap))
      || !fidelityMatches) return false;
    const includesSectionIdentity = Array.isArray(value.sections)
      || value.items.some((item) => isRecord(item) && item.sectionId !== undefined);
    const sourceProjection = (flow: Record<string, unknown>) => ({
      ref: flow.ref,
      savedCopyId: flow.savedCopyId,
      flowId: flow.flowId,
      sourceSlug: flow.sourceSlug,
      title: flow.title,
      anchorDate: flow.anchorDate ?? null,
      ...(includesSectionIdentity
        ? {
            sections: Array.isArray(flow.sections)
              ? flow.sections.map((section) => isRecord(section) ? ({
                  sectionId: section.sectionId,
                  title: section.title,
                  sourceOrder: section.sourceOrder,
                  titleOwner: section.titleOwner,
                  editCapability: section.editCapability,
                }) : null)
              : null,
          }
        : {}),
      items: Array.isArray(flow.items)
        ? flow.items.map((item) => isRecord(item) ? ({
            ref: item.ref,
            savedCopyId: item.savedCopyId,
            flowId: item.flowId,
            itemId: item.itemId,
            title: item.title,
            description: item.description ?? null,
            ...(includesSectionIdentity ? { sectionId: item.sectionId ?? null } : {}),
            sectionTitle: item.sectionTitle ?? null,
            sourceOrder: item.sourceOrder,
            sourceDate: item.sourceDate ?? null,
            sourceTimingLabel: item.sourceTimingLabel ?? null,
          }) : null)
        : [],
    });
    if (JSON.stringify(sourceProjection(value))
      !== JSON.stringify(sourceProjection(rebuilt.flow as unknown as Record<string, unknown>))) {
      return false;
    }
  }
  const sectionIds = new Set<string>();
  const sectionOrders = new Set<number>();
  for (const section of value.sections ?? []) {
    if (!isRecord(section)
      || !hasOnlyKeys(section, [
        'sectionId',
        'title',
        'sourceOrder',
        'titleOwner',
        'editCapability',
      ])
      || !isNonEmptyString(section.sectionId)
      || section.sectionId !== section.sectionId.trim()
      || sectionIds.has(section.sectionId)
      || !isNonEmptyString(section.title)
      || section.title !== section.title.trim()
      || !Number.isSafeInteger(section.sourceOrder)
      || Number(section.sourceOrder) < 0
      || sectionOrders.has(Number(section.sourceOrder))
      || section.titleOwner !== 'authoring'
      || section.editCapability !== 'poc-shadow') return false;
    sectionIds.add(section.sectionId);
    sectionOrders.add(Number(section.sourceOrder));
  }
  const itemIds = new Set<string>();
  const itemRefs = new Set<string>();
  for (const item of value.items) {
    if (!isRecord(item)
      || item.savedCopyId !== value.savedCopyId
      || item.flowId !== value.flowId
      || !isNonEmptyString(item.itemId)
      || itemIds.has(item.itemId)
      || !isNonEmptyString(item.ref)
      || itemRefs.has(item.ref)
      || item.ref !== toPersonalWorkspacePocFlowItemRef(value.savedCopyId, value.flowId, item.itemId)
      || !isNonEmptyString(item.title)
      || !Number.isSafeInteger(item.sourceOrder)
      || Number(item.sourceOrder) < 0
      || (item.description !== undefined && typeof item.description !== 'string')
      || (item.sectionId !== undefined
        && (!isNonEmptyString(item.sectionId) || !sectionIds.has(item.sectionId)))
      || (item.sectionTitle !== undefined && !isNonEmptyString(item.sectionTitle))
      || (item.sourceDate !== undefined && !isPersonalWorkspacePocDate(item.sourceDate))
      || (item.sourceTimingLabel !== undefined && !isNonEmptyString(item.sourceTimingLabel))) {
      return false;
    }
    if (item.sectionId !== undefined) {
      const section = (value.sections ?? []).find((candidate) => (
        isRecord(candidate) && candidate.sectionId === item.sectionId
      ));
      if (!section || item.sectionTitle !== section.title) return false;
    }
    itemIds.add(item.itemId);
    itemRefs.add(item.ref);
  }
  return true;
}

function isPersonalPlanOverlay(
  value: unknown,
  flowRef: string,
  allowEmpty = false,
): value is PersonalWorkspacePocPersonalPlanOverlay {
  if (!isRecord(value)
    || !hasOnlyKeys(value, [
      'flowRef',
      'savedCopyId',
      'flowId',
      'title',
      'orderedItemRefs',
      'sectionTitles',
      'items',
    ])
    || value.flowRef !== flowRef
    || !isNonEmptyString(value.savedCopyId)
    || !isNonEmptyString(value.flowId)
    || value.flowRef !== toPersonalWorkspacePocFlowRef(value.savedCopyId, value.flowId)
    || (value.title !== undefined
      && (!isNonEmptyString(value.title) || value.title !== value.title.trim()))
    || (value.orderedItemRefs !== undefined
      && (!Array.isArray(value.orderedItemRefs)
        || value.orderedItemRefs.some((ref) => !isNonEmptyString(ref))
        || new Set(value.orderedItemRefs).size !== value.orderedItemRefs.length))
    || (value.sectionTitles !== undefined && !isRecord(value.sectionTitles))
    || !isRecord(value.items)) return false;

  let hasSectionOverride = false;
  for (const [sectionId, title] of Object.entries(value.sectionTitles ?? {})) {
    if (!isNonEmptyString(sectionId)
      || sectionId !== sectionId.trim()
      || !isNonEmptyString(title)
      || title !== title.trim()) return false;
    hasSectionOverride = true;
  }

  let hasItemOverride = false;
  for (const [itemRef, item] of Object.entries(value.items)) {
    if (!isRecord(item)
      || !hasOnlyKeys(item, ['itemRef', 'title', 'memo', 'schedule'])
      || item.itemRef !== itemRef
      || !isNonEmptyString(itemRef)
      || (item.title !== undefined
        && (!isNonEmptyString(item.title) || item.title !== item.title.trim()))
      || (item.memo !== undefined && typeof item.memo !== 'string')) return false;
    if (item.schedule !== undefined) {
      if (!isRecord(item.schedule)
        || !hasOnlyKeys(item.schedule, ['mode', 'date'])
        || !['fixed_date', 'unscheduled'].includes(String(item.schedule.mode))
        || (item.schedule.mode === 'fixed_date'
          && !isPersonalWorkspacePocDate(item.schedule.date))
        || (item.schedule.mode === 'unscheduled' && item.schedule.date !== undefined)) {
        return false;
      }
    }
    if (item.title === undefined
      && item.memo === undefined
      && item.schedule === undefined) return false;
    hasItemOverride = true;
  }
  return value.title !== undefined
    || value.orderedItemRefs !== undefined
    || hasSectionOverride
    || hasItemOverride
    || allowEmpty;
}

function validateSnapshot(value: unknown): value is PersonalWorkspacePocSnapshot {
  if (!isRecord(value)) return false;
  if (value.workspaceId !== PERSONAL_WORKSPACE_POC_WORKSPACE_ID) return false;
  if (!Number.isSafeInteger(value.revision) || Number(value.revision) < 0) return false;
  if (!isIsoTimestamp(value.updatedAt)) return false;
  if (
    !Array.isArray(value.folders)
    || !Array.isArray(value.memberships)
    || !Array.isArray(value.quickItems)
    || !isRecord(value.placements)
    || !Array.isArray(value.timelineOrders)
    || !isRecord(value.completions)
    || (value.occurrencePlacements !== undefined && !isRecord(value.occurrencePlacements))
    || (value.occurrenceCompletions !== undefined && !isRecord(value.occurrenceCompletions))
    || (value.authoredFlows !== undefined && !Array.isArray(value.authoredFlows))
    || (value.authoringReceipts !== undefined && !Array.isArray(value.authoringReceipts))
    || (value.personalPlanOverlays !== undefined && !isRecord(value.personalPlanOverlays))
    || (value.trashEntries !== undefined && !Array.isArray(value.trashEntries))
    || (value.deletedMembers !== undefined && !Array.isArray(value.deletedMembers))
  ) return false;

  for (const [flowRef, overlay] of Object.entries(value.personalPlanOverlays ?? {})) {
    if (!isPersonalPlanOverlay(overlay, flowRef)) return false;
  }

  const authoredFlows = value.authoredFlows ?? [];
  const authoringReceipts = value.authoringReceipts ?? [];
  const authoredFlowRefs = new Set<string>();
  const handoffIds = new Set<string>();
  for (const flow of authoredFlows) {
    if (!isAuthoredFlow(flow)
      || authoredFlowRefs.has(flow.ref)
      || handoffIds.has(flow.authoring.handoffId)) return false;
    authoredFlowRefs.add(flow.ref);
    handoffIds.add(flow.authoring.handoffId);
  }
  const receiptHandoffIds = new Set<string>();
  for (const receipt of authoringReceipts) {
    if (!isRecord(receipt)
      || !isNonEmptyString(receipt.handoffId)
      || receiptHandoffIds.has(receipt.handoffId)
      || !isNonEmptyString(receipt.flowRef)
      || !isIsoTimestamp(receipt.committedAt)
      || !authoredFlowRefs.has(receipt.flowRef)
      || !handoffIds.has(receipt.handoffId)) return false;
    const flow = authoredFlows.find((candidate) => candidate.ref === receipt.flowRef);
    if (!flow
      || flow.authoring.handoffId !== receipt.handoffId
      || flow.authoring.committedAt !== receipt.committedAt) return false;
    receiptHandoffIds.add(receipt.handoffId);
  }
  if (receiptHandoffIds.size !== handoffIds.size) return false;

  const folderIds = new Set<string>();
  for (const folder of value.folders) {
    if (!isRecord(folder)
      || !isNonEmptyString(folder.folderId)
      || folderIds.has(folder.folderId)
      || !isNonEmptyString(folder.title)
      || !isOrderKey(folder.orderKey)
      || (folder.parentFolderId !== undefined && !isNonEmptyString(folder.parentFolderId))) {
      return false;
    }
    folderIds.add(folder.folderId);
  }

  const folderById = new Map(
    value.folders.map((folder) => [folder.folderId, folder as unknown as PersonalWorkspacePocFolder]),
  );
  for (const folder of value.folders) {
    if (!folder.parentFolderId) continue;
    const parent = folderById.get(folder.parentFolderId);
    if (!parent || parent.folderId === folder.folderId || parent.parentFolderId) return false;
  }

  const lifecycleRefs = new Set<string>();
  for (const entry of value.trashEntries ?? []) {
    if (!isRecord(entry)
      || (entry.member !== 'saved_flow' && entry.member !== 'quick_item')
      || !isNonEmptyString(entry.memberRef)
      || !isMemberRefForKind(entry.member, entry.memberRef)
      || lifecycleRefs.has(entry.memberRef)
      || !isIsoTimestamp(entry.trashedAt)
      || typeof entry.hadMembership !== 'boolean'
      || (entry.previousFolderId !== undefined && !isNonEmptyString(entry.previousFolderId))
      || (entry.hadMembership
        ? !Number.isSafeInteger(entry.previousOrderKey) || Number(entry.previousOrderKey) < 0
        : entry.previousFolderId !== undefined || entry.previousOrderKey !== undefined)) {
      return false;
    }
    lifecycleRefs.add(entry.memberRef);
  }
  for (const entry of value.deletedMembers ?? []) {
    if (!isRecord(entry)
      || (entry.member !== 'saved_flow' && entry.member !== 'quick_item')
      || !isNonEmptyString(entry.memberRef)
      || !isMemberRefForKind(entry.member, entry.memberRef)
      || lifecycleRefs.has(entry.memberRef)
      || !isIsoTimestamp(entry.deletedAt)) {
      return false;
    }
    lifecycleRefs.add(entry.memberRef);
  }

  const membershipRefs = new Set<string>();
  for (const membership of value.memberships) {
    if (!isRecord(membership)
      || (membership.member !== 'saved_flow' && membership.member !== 'quick_item')
      || !isNonEmptyString(membership.memberRef)
      || membershipRefs.has(membership.memberRef)
      || lifecycleRefs.has(membership.memberRef)
      || !isOrderKey(membership.orderKey)
      || (membership.folderId !== undefined && !folderIds.has(String(membership.folderId)))) {
      return false;
    }
    membershipRefs.add(membership.memberRef);
  }

  const quickItemIds = new Set<string>();
  for (const item of value.quickItems) {
    if (!isRecord(item)
      || !isNonEmptyString(item.quickItemId)
      || quickItemIds.has(item.quickItemId)
      || !isNonEmptyString(item.title)
      || typeof item.memo !== 'string'
      || (item.status !== 'open' && item.status !== 'completed')
      || !isIsoTimestamp(item.createdAt)
      || (item.completedAt !== undefined && !isIsoTimestamp(item.completedAt))
      || (item.status === 'open' && item.completedAt !== undefined)
      || (item.status === 'completed' && !item.completedAt)) {
      return false;
    }
    quickItemIds.add(item.quickItemId);
  }

  for (const [itemRef, placement] of Object.entries(value.placements)) {
    if (!isNonEmptyString(itemRef)
      || !isRecord(placement)
      || placement.itemRef !== itemRef
      || !['inherit', 'fixed_date', 'unscheduled'].includes(String(placement.scheduleMode))
      || !['auto', 'included', 'excluded'].includes(String(placement.timelinePolicy))
      || (placement.date !== undefined && !isPersonalWorkspacePocDate(placement.date))
      || (placement.time !== undefined && (typeof placement.time !== 'string' || !TIME_PATTERN.test(placement.time)))
      || (placement.scheduleMode === 'fixed_date' && !placement.date)
      || (placement.scheduleMode !== 'fixed_date' && placement.date !== undefined)) {
      return false;
    }
  }

  const timelineKeys = new Set<string>();
  for (const order of value.timelineOrders) {
    if (!isRecord(order)
      || !['date', 'undated', 'overdue'].includes(String(order.context))
      || !isNonEmptyString(order.contextKey)
      || !Array.isArray(order.orderedRefKeys)
      || order.orderedRefKeys.some((ref) => !isNonEmptyString(ref))
      || new Set(order.orderedRefKeys).size !== order.orderedRefKeys.length
      || !Number.isSafeInteger(order.revision)
      || Number(order.revision) < 1) {
      return false;
    }
    const key = `${order.context}:${order.contextKey}`;
    if (timelineKeys.has(key)) return false;
    timelineKeys.add(key);
  }

  for (const [itemRef, completion] of Object.entries(value.completions)) {
    if (!isNonEmptyString(itemRef)
      || !isRecord(completion)
      || (completion.status !== 'open' && completion.status !== 'completed')
      || (completion.completedAt !== undefined && !isIsoTimestamp(completion.completedAt))
      || (completion.status === 'open' && completion.completedAt !== undefined)
      || (completion.status === 'completed' && !completion.completedAt)) {
      return false;
    }
  }

  for (const [occurrenceId, placement] of Object.entries(value.occurrencePlacements ?? {})) {
    if (!isNonEmptyString(occurrenceId)
      || !isRecord(placement)
      || placement.occurrenceId !== occurrenceId
      || !isNonEmptyString(placement.sourceItemRef)
      || !isPersonalWorkspacePocDate(placement.originalDate)
      || !isPocOccurrenceIdentity(occurrenceId, placement.sourceItemRef, placement.originalDate)
      || !['fixed_date', 'unscheduled'].includes(String(placement.scheduleMode))
      || (placement.date !== undefined && !isPersonalWorkspacePocDate(placement.date))
      || (placement.scheduleMode === 'fixed_date' && !placement.date)
      || (placement.scheduleMode === 'unscheduled' && placement.date !== undefined)) return false;
  }

  for (const [occurrenceId, completion] of Object.entries(value.occurrenceCompletions ?? {})) {
    if (!isNonEmptyString(occurrenceId)
      || !isRecord(completion)
      || completion.occurrenceId !== occurrenceId
      || !isNonEmptyString(completion.sourceItemRef)
      || !isPersonalWorkspacePocDate(completion.originalDate)
      || !isPocOccurrenceIdentity(occurrenceId, completion.sourceItemRef, completion.originalDate)
      || !['open', 'completed'].includes(String(completion.status))
      || (completion.status === 'completed' && !isIsoTimestamp(completion.completedAt))
      || (completion.status === 'open' && completion.completedAt !== undefined)) return false;
  }

  return true;
}

export function isPersonalWorkspacePocState(value: unknown): value is PersonalWorkspacePocState {
  if (!isRecord(value) || value.version !== PERSONAL_WORKSPACE_POC_VERSION) return false;
  const record = value;
  if (!validateSnapshot(value)) return false;
  if (record.undo === undefined) return true;
  if (!isRecord(record.undo)
    || !isNonEmptyString(record.undo.label)
    || !validateSnapshot(record.undo.snapshot)) return false;
  if (record.undo.storageCompanion === undefined) return true;
  return isRecord(record.undo.storageCompanion)
    && record.undo.storageCompanion.kind === 'authoring-draft'
    && (record.undo.storageCompanion.rawValue === null
      || typeof record.undo.storageCompanion.rawValue === 'string')
    && isPersonalWorkspacePocAuthoringDraftRawValue(
      record.undo.storageCompanion.rawValue as string | null,
    );
}

export type PersonalWorkspacePocStateReferenceValidation =
  | { ok: true }
  | { ok: false; reason: string };

function validateSnapshotReferences(
  snapshot: PersonalWorkspacePocSnapshot,
  model: PersonalWorkspacePocReadModel,
  scope: 'current' | 'undo',
): PersonalWorkspacePocStateReferenceValidation {
  const fail = (reason: string): PersonalWorkspacePocStateReferenceValidation => ({
    ok: false,
    reason: `${scope}:${reason}`,
  });
  const projectedFlows = [...model.flows, ...(snapshot.authoredFlows ?? [])];
  const flowByRef = new Map(projectedFlows.map((flow) => [flow.ref, flow]));
  const flowRefs = new Set(projectedFlows.map((flow) => flow.ref));
  const itemRefs = new Set(projectedFlows.flatMap((flow) => flow.items.map((item) => item.ref)));
  const quickRefs = new Set(
    snapshot.quickItems.map((item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId)),
  );
  const taskRefs = new Set([...itemRefs, ...quickRefs]);
  const validOccurrenceIds = new Set<string>();
  for (const flow of projectedFlows) {
    if (flow.origin !== 'authoring-handoff') continue;
    const authoring = (flow as Partial<PersonalWorkspacePocAuthoredFlow>).authoring;
    if (!authoring) continue;
    const identities = authoring.sourceLineItemIdentityMap;
    const parsedItems = authoring.parsedItems;
    if (!identities || !parsedItems) continue;
    const parsedByLine = new Map(parsedItems.map((item) => [item.sourceLine, item]));
    for (const identity of Object.values(identities)) {
      const parsed = parsedByLine.get(identity.sourceLine);
      const startDate = parsed?.resolvedDate ?? parsed?.date;
      if (!parsed?.recurrence || !startDate) continue;
      const expanded = expandPersonalWorkspacePocOccurrences({
        sourceItemRef: identity.itemRef,
        startDate,
        recurrence: parsed.recurrence,
        ...(parsed.recurrenceEnd ? { recurrenceEnd: parsed.recurrenceEnd } : {}),
      });
      if (expanded.ok) expanded.manifest.rows.forEach((row) => validOccurrenceIds.add(row.occurrenceId));
    }
  }
  const trashEntries = snapshot.trashEntries ?? [];
  const deletedMembers = snapshot.deletedMembers ?? [];

  for (const entry of trashEntries) {
    if (entry.member === 'saved_flow' && !flowRefs.has(entry.memberRef)) {
      return fail('unknown-trash-flow');
    }
    if (entry.member === 'quick_item' && !quickRefs.has(entry.memberRef)) {
      return fail('unknown-trash-quick-item');
    }
  }
  for (const entry of deletedMembers) {
    if (entry.member === 'quick_item' && quickRefs.has(entry.memberRef)) {
      return fail('deleted-quick-item-retained');
    }
  }

  for (const [flowRef, overlay] of Object.entries(snapshot.personalPlanOverlays ?? {})) {
    const flow = flowByRef.get(flowRef);
    if (!flow
      || flow.savedCopyId !== overlay.savedCopyId
      || flow.flowId !== overlay.flowId) return fail('unknown-personal-plan-flow');
    const expectedItemRefs = flow.items.map((item) => item.ref);
    const expectedItemRefSet = new Set(expectedItemRefs);
    if (Object.keys(overlay.items).some((itemRef) => !expectedItemRefSet.has(itemRef))) {
      return fail('foreign-personal-plan-item');
    }
    if (overlay.orderedItemRefs
      && (overlay.orderedItemRefs.length !== expectedItemRefs.length
        || overlay.orderedItemRefs.some((itemRef) => !expectedItemRefSet.has(itemRef)))) {
      return fail('invalid-personal-plan-order');
    }
    const sectionTitleIds = Object.keys(overlay.sectionTitles ?? {});
    if (sectionTitleIds.length > 0) {
      if (!['personal-draft', 'authoring-handoff'].includes(flow.origin)
        || !Array.isArray(flow.sections)) return fail('read-only-personal-plan-section');
      const sectionById = new Map<string, typeof flow.sections[number]>();
      for (const section of flow.sections) {
        if (!section.sectionId.trim()
          || sectionById.has(section.sectionId)) return fail('invalid-personal-plan-sections');
        sectionById.set(section.sectionId, section);
      }
      for (const sectionId of sectionTitleIds) {
        const section = sectionById.get(sectionId);
        if (!section) return fail('foreign-personal-plan-section');
        if (section.editCapability !== 'poc-shadow') {
          return fail('read-only-personal-plan-section');
        }
      }
    }
  }

  const folderOrderByParent = new Map<string, Set<number>>();
  for (const folder of snapshot.folders) {
    if (folder.folderId === 'unfiled') return fail('reserved-folder-id');
    if (!Number.isSafeInteger(folder.orderKey) || folder.orderKey < 0) {
      return fail('invalid-folder-order');
    }
    const parentKey = folder.parentFolderId ?? 'root';
    const orders = folderOrderByParent.get(parentKey) ?? new Set<number>();
    if (orders.has(folder.orderKey)) return fail('duplicate-folder-order');
    orders.add(folder.orderKey);
    folderOrderByParent.set(parentKey, orders);
  }

  for (const membership of snapshot.memberships) {
    if (!Number.isSafeInteger(membership.orderKey) || membership.orderKey < 0) {
      return fail('invalid-membership-order');
    }
    if (membership.member === 'saved_flow' && !flowRefs.has(membership.memberRef)) {
      return fail('unknown-saved-flow-membership');
    }
    if (membership.member === 'quick_item' && !quickRefs.has(membership.memberRef)) {
      return fail('unknown-quick-item-membership');
    }
    if (isInactiveMemberRef(snapshot, membership.memberRef)) {
      return fail('inactive-member-membership');
    }
  }

  for (const [itemRef, placement] of Object.entries(snapshot.placements)) {
    if (!taskRefs.has(itemRef)) return fail('unknown-placement-ref');
    if (quickRefs.has(itemRef) && placement.scheduleMode === 'inherit') {
      return fail('quick-item-inherit-placement');
    }
  }
  for (const quickRef of quickRefs) {
    if (!snapshot.placements[quickRef]) return fail('missing-quick-item-placement');
  }

  for (const order of snapshot.timelineOrders) {
    if (order.revision > snapshot.revision) return fail('future-timeline-revision');
    if (
      (order.context === 'undated' && order.contextKey !== 'undated')
      || (order.context !== 'undated' && !isPersonalWorkspacePocDate(order.contextKey))
    ) return fail('invalid-timeline-context-key');
    if (order.orderedRefKeys.some((ref) => !taskRefs.has(ref))) {
      return fail('unknown-timeline-ref');
    }
  }

  if (Object.keys(snapshot.completions).some((itemRef) => !itemRefs.has(itemRef))) {
    return fail('unknown-completion-ref');
  }
  for (const [occurrenceId, entry] of Object.entries(snapshot.occurrencePlacements ?? {})) {
    if (!itemRefs.has(entry.sourceItemRef)
      || occurrenceId !== entry.occurrenceId
      || !validOccurrenceIds.has(occurrenceId)) return fail('unknown-occurrence-placement-ref');
  }
  for (const [occurrenceId, entry] of Object.entries(snapshot.occurrenceCompletions ?? {})) {
    if (!itemRefs.has(entry.sourceItemRef)
      || occurrenceId !== entry.occurrenceId
      || !validOccurrenceIds.has(occurrenceId)) return fail('unknown-occurrence-completion-ref');
  }
  return { ok: true };
}

/**
 * Validates persisted PoC references against the current read-only Flow model.
 * Shape validation stays separate so model drift and orphaned refs fail closed
 * without rewriting or deleting the stored payload.
 */
export function validatePersonalWorkspacePocStateReferences(
  state: PersonalWorkspacePocState,
  model: PersonalWorkspacePocReadModel,
): PersonalWorkspacePocStateReferenceValidation {
  if (!isPersonalWorkspacePocState(state)) return { ok: false, reason: 'invalid-state-shape' };
  const current = validateSnapshotReferences(state, model, 'current');
  if (!current.ok) return current;
  if (!state.undo) return { ok: true };
  if (state.revision < 1 || state.undo.snapshot.revision !== state.revision - 1) {
    return { ok: false, reason: 'undo:revision-mismatch' };
  }
  return validateSnapshotReferences(state.undo.snapshot, model, 'undo');
}

export function createPersonalWorkspacePocState(
  now = new Date().toISOString(),
): PersonalWorkspacePocState {
  return {
    version: PERSONAL_WORKSPACE_POC_VERSION,
    workspaceId: PERSONAL_WORKSPACE_POC_WORKSPACE_ID,
    revision: 0,
    folders: [],
    memberships: [],
    quickItems: [],
    placements: {},
    timelineOrders: [],
    completions: {},
    occurrencePlacements: {},
    occurrenceCompletions: {},
    authoredFlows: [],
    authoringReceipts: [],
    personalPlanOverlays: {},
    trashEntries: [],
    deletedMembers: [],
    updatedAt: now,
  };
}

function unchanged(
  state: PersonalWorkspacePocState,
  message: string,
  error?: string,
): PersonalWorkspacePocTransitionResult {
  return { state, changed: false, message, ...(error ? { error } : {}) };
}

function finalizeMutation(
  previous: PersonalWorkspacePocState,
  next: PersonalWorkspacePocState,
  label: string,
  now: string,
  message: string,
  storageCompanion?: PersonalWorkspacePocTransitionResult['storageCompanion'],
): PersonalWorkspacePocTransitionResult {
  const beforeSnapshot = snapshotOf(previous);
  const nextComparable = snapshotOf(next);
  nextComparable.revision = beforeSnapshot.revision;
  nextComparable.updatedAt = beforeSnapshot.updatedAt;
  if (JSON.stringify(nextComparable) === JSON.stringify(beforeSnapshot)) {
    return unchanged(previous, '이미 같은 위치입니다.');
  }

  next.revision = previous.revision + 1;
  next.updatedAt = now;
  next.undo = {
    label,
    snapshot: beforeSnapshot,
    ...(storageCompanion ? { storageCompanion: clone(storageCompanion) } : {}),
  };
  if (!isPersonalWorkspacePocState(next)) {
    return unchanged(previous, '변경을 적용하지 못했어요. 원래 상태를 유지합니다.', 'invariant-failed');
  }
  return { state: next, changed: true, message };
}

function finalizePermanentMutation(
  previous: PersonalWorkspacePocState,
  next: PersonalWorkspacePocState,
  now: string,
  message: string,
): PersonalWorkspacePocTransitionResult {
  const beforeSnapshot = snapshotOf(previous);
  const nextComparable = snapshotOf(next);
  nextComparable.revision = beforeSnapshot.revision;
  nextComparable.updatedAt = beforeSnapshot.updatedAt;
  if (JSON.stringify(nextComparable) === JSON.stringify(beforeSnapshot)) {
    return unchanged(previous, '이미 이 기기에서 삭제한 항목입니다.');
  }
  next.revision = previous.revision + 1;
  next.updatedAt = now;
  delete next.undo;
  if (!isPersonalWorkspacePocState(next)) {
    return unchanged(previous, '삭제를 적용하지 못했어요. 원래 상태를 유지합니다.', 'invariant-failed');
  }
  return { state: next, changed: true, message };
}

function timelineKey(
  context: PersonalWorkspacePocTimelineOrder['context'],
  contextKey: string,
): string {
  return `${context}:${contextKey}`;
}

function sameRefs(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((ref, index) => ref === right[index]);
}

function sameAuthoringHandoffFlow(
  left: PersonalWorkspacePocAuthoredFlow,
  right: PersonalWorkspacePocAuthoredFlow,
): boolean {
  const comparable = (flow: PersonalWorkspacePocAuthoredFlow) => ({
    ...flow,
    authoring: { ...flow.authoring, committedAt: '<commit-time>' },
  });
  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
}

export function applyPersonalWorkspacePocTransition(
  state: PersonalWorkspacePocState,
  action: PersonalWorkspacePocTransition,
): PersonalWorkspacePocTransitionResult {
  if (!isPersonalWorkspacePocState(state)) {
    return unchanged(state, '개인공간 상태를 확인해 주세요.', 'invalid-state');
  }
  if (action.type === 'cancel') {
    return unchanged(state, action.reason?.trim() || '이동을 취소했어요.');
  }
  if (action.type === 'undo') {
    if (!state.undo) return unchanged(state, '되돌릴 변경이 없어요.');
    const restored: PersonalWorkspacePocState = {
      version: PERSONAL_WORKSPACE_POC_VERSION,
      ...clone(state.undo.snapshot),
      revision: state.revision + 1,
      updatedAt: action.now,
    };
    if (!isPersonalWorkspacePocState(restored)) {
      return unchanged(state, '이전 상태를 복구하지 못했어요.', 'undo-invalid');
    }
    return {
      state: restored,
      changed: true,
      message: `${state.undo.label} 전으로 되돌렸어요.`,
      ...(state.undo.storageCompanion
        ? { storageCompanion: clone(state.undo.storageCompanion) }
        : {}),
    };
  }

  const next = clone(state);
  delete next.undo;

  switch (action.type) {
    case 'create-folder': {
      const folderId = action.folderId.trim();
      const title = action.title.trim();
      if (!folderId || !title) return unchanged(state, '폴더 이름을 입력해 주세요.', 'invalid-folder');
      if (next.folders.some((folder) => folder.folderId === folderId)) {
        return unchanged(state, '이미 있는 폴더입니다.', 'duplicate-folder');
      }
      if (action.parentFolderId) {
        const parent = next.folders.find((folder) => folder.folderId === action.parentFolderId);
        if (!parent || parent.parentFolderId) {
          return unchanged(state, `폴더는 최대 ${PERSONAL_WORKSPACE_POC_DEFAULTS.maxFolderDepth}단계까지 만들 수 있어요.`, 'folder-depth');
        }
      }
      const siblings = next.folders.filter(
        (folder) => folder.parentFolderId === action.parentFolderId,
      );
      next.folders.push({
        folderId,
        title,
        ...(action.parentFolderId ? { parentFolderId: action.parentFolderId } : {}),
        orderKey: siblings.reduce((max, folder) => Math.max(max, folder.orderKey), -1) + 1,
      });
      return finalizeMutation(state, next, '폴더 만들기', action.now, '폴더를 만들었어요.');
    }
    case 'delete-folder': {
      if (!next.folders.some((folder) => folder.folderId === action.folderId)) {
        return unchanged(state, '삭제할 폴더를 찾을 수 없어요.', 'unknown-folder');
      }
      const removed = new Set<string>([action.folderId]);
      let changed = true;
      while (changed) {
        changed = false;
        next.folders.forEach((folder) => {
          if (folder.parentFolderId && removed.has(folder.parentFolderId) && !removed.has(folder.folderId)) {
            removed.add(folder.folderId);
            changed = true;
          }
        });
      }
      next.folders = next.folders.filter((folder) => !removed.has(folder.folderId));
      next.memberships = next.memberships.map((membership) => (
        membership.folderId && removed.has(membership.folderId)
          ? { ...membership, folderId: undefined }
          : membership
      ));
      return finalizeMutation(
        state,
        next,
        '폴더 삭제',
        action.now,
        '폴더를 삭제하고 내용은 미분류로 옮겼어요.',
      );
    }
    case 'create-quick-item': {
      const quickItemId = action.quickItemId.trim();
      const title = action.title.trim();
      if (!quickItemId || !title) return unchanged(state, '할 일 이름을 입력해 주세요.', 'invalid-quick-item');
      const itemRef = toPersonalWorkspacePocQuickItemRef(quickItemId);
      if (next.quickItems.some((item) => item.quickItemId === quickItemId)
        || (next.deletedMembers ?? []).some((entry) => entry.memberRef === itemRef)) {
        return unchanged(state, '같은 빠른 할 일이 이미 있어요.', 'duplicate-quick-item');
      }
      if (action.date && !isPersonalWorkspacePocDate(action.date)) {
        return unchanged(state, '날짜를 확인해 주세요.', 'invalid-date');
      }
      if (action.folderId && !next.folders.some((folder) => folder.folderId === action.folderId)) {
        return unchanged(state, '폴더를 찾을 수 없어요.', 'unknown-folder');
      }
      next.quickItems.push({
        quickItemId,
        title,
        memo: action.memo ?? '',
        status: 'open',
        createdAt: action.now,
      });
      next.placements[itemRef] = action.date
        ? { itemRef, scheduleMode: 'fixed_date', date: action.date, timelinePolicy: 'auto' }
        : { itemRef, scheduleMode: 'unscheduled', timelinePolicy: 'auto' };
      if (action.folderId) {
        next.memberships.push({
          member: 'quick_item',
          memberRef: itemRef,
          folderId: action.folderId,
          orderKey: next.memberships.filter((membership) => membership.folderId === action.folderId).length,
        });
      }
      return finalizeMutation(state, next, '빠른 할 일 추가', action.now, '빠른 할 일을 추가했어요.');
    }
    case 'update-quick-item': {
      if (!Number.isSafeInteger(action.expectedRevision)
        || action.expectedRevision !== state.revision) {
        return unchanged(
          state,
          '다른 변경이 먼저 저장됐어요. 빠른 할 일을 다시 확인해 주세요.',
          'stale-state-revision',
        );
      }
      const quickItemId = action.quickItemId.trim();
      const title = action.title.trim();
      if (!quickItemId
        || !title
        || typeof action.memo !== 'string'
        || (action.date !== undefined && !isPersonalWorkspacePocDate(action.date))) {
        return unchanged(state, '빠른 할 일 내용을 확인해 주세요.', 'invalid-quick-item');
      }
      const quickItem = next.quickItems.find((item) => item.quickItemId === quickItemId);
      if (!quickItem) {
        return unchanged(state, '수정할 빠른 할 일을 찾을 수 없어요.', 'unknown-quick-item');
      }
      const itemRef = toPersonalWorkspacePocQuickItemRef(quickItemId);
      if (isInactiveMemberRef(next, itemRef)) {
        return unchanged(state, '휴지통에 있는 빠른 할 일은 복원한 뒤 수정해 주세요.', 'inactive-quick-item');
      }
      const placement = next.placements[itemRef];
      const sameDate = action.date !== undefined
        ? placement?.scheduleMode === 'fixed_date' && placement.date === action.date
        : placement?.scheduleMode === 'unscheduled';
      if (quickItem.title === title && quickItem.memo === action.memo && sameDate) {
        return unchanged(state, '같은 내용이라 저장하지 않았어요.');
      }
      quickItem.title = title;
      quickItem.memo = action.memo;
      next.placements[itemRef] = action.date !== undefined
        ? {
            itemRef,
            scheduleMode: 'fixed_date',
            date: action.date,
            ...(placement?.time ? { time: placement.time } : {}),
            timelinePolicy: placement?.timelinePolicy ?? 'auto',
          }
        : {
            itemRef,
            scheduleMode: 'unscheduled',
            ...(placement?.time ? { time: placement.time } : {}),
            timelinePolicy: placement?.timelinePolicy ?? 'auto',
          };
      return finalizeMutation(
        state,
        next,
        '빠른 할 일 수정',
        action.now,
        '빠른 할 일의 제목, 메모, 실행 날짜를 저장했어요. 완료 상태는 그대로예요.',
      );
    }
    case 'move-folder': {
      if (action.folderId && !next.folders.some((folder) => folder.folderId === action.folderId)) {
        return unchanged(state, '이동할 폴더를 찾을 수 없어요.', 'unknown-folder');
      }
      if (action.member === 'quick_item'
        && !next.quickItems.some((item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) === action.memberRef)) {
        return unchanged(state, '이동할 빠른 할 일을 찾을 수 없어요.', 'unknown-quick-item');
      }
      if (action.member === 'saved_flow' && !action.memberRef.startsWith('saved-flow:')) {
        return unchanged(state, 'Flow 전체만 폴더로 옮길 수 있어요.', 'invalid-flow-member');
      }
      if (isInactiveMemberRef(next, action.memberRef)) {
        return unchanged(state, '휴지통에 있는 항목은 복원한 뒤 옮겨 주세요.', 'inactive-member');
      }
      const existing = next.memberships.find((membership) => membership.memberRef === action.memberRef);
      if (existing?.member !== undefined && existing.member !== action.member) {
        return unchanged(state, '폴더 소속 정보를 확인해 주세요.', 'membership-kind-mismatch');
      }
      if ((!existing && action.folderId === undefined) || existing?.folderId === action.folderId) {
        return unchanged(state, '이미 같은 위치입니다.');
      }
      if (existing) {
        existing.folderId = action.folderId;
        existing.orderKey = next.memberships.filter(
          (membership) => membership.folderId === action.folderId && membership.memberRef !== action.memberRef,
        ).length;
      } else {
        next.memberships.push({
          member: action.member,
          memberRef: action.memberRef,
          ...(action.folderId ? { folderId: action.folderId } : {}),
          orderKey: next.memberships.filter((membership) => membership.folderId === action.folderId).length,
        });
      }
      return finalizeMutation(state, next, '폴더 이동', action.now, '폴더를 옮겼어요. 날짜와 기록은 그대로예요.');
    }
    case 'move-to-trash': {
      if (!isNonEmptyString(action.memberRef)
        || !isMemberRefForKind(action.member, action.memberRef)) {
        return unchanged(state, '휴지통으로 옮길 항목을 확인해 주세요.', 'invalid-trash-member');
      }
      if ((next.deletedMembers ?? []).some((entry) => entry.memberRef === action.memberRef)) {
        return unchanged(state, '이미 이 기기에서 삭제한 항목입니다.', 'already-deleted');
      }
      if ((next.trashEntries ?? []).some((entry) => entry.memberRef === action.memberRef)) {
        return unchanged(state, '이미 휴지통에 있습니다.');
      }
      if (action.member === 'quick_item'
        && !next.quickItems.some(
          (item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) === action.memberRef,
        )) {
        return unchanged(state, '휴지통으로 옮길 빠른 할 일을 찾을 수 없어요.', 'unknown-quick-item');
      }
      const membership = next.memberships.find(
        (entry) => entry.memberRef === action.memberRef,
      );
      if (membership && membership.member !== action.member) {
        return unchanged(state, '항목의 폴더 소속 정보를 확인해 주세요.', 'membership-kind-mismatch');
      }
      next.memberships = next.memberships.filter(
        (entry) => entry.memberRef !== action.memberRef,
      );
      next.trashEntries = [...(next.trashEntries ?? []), {
        member: action.member,
        memberRef: action.memberRef,
        trashedAt: action.now,
        hadMembership: Boolean(membership),
        ...(membership?.folderId ? { previousFolderId: membership.folderId } : {}),
        ...(membership ? { previousOrderKey: membership.orderKey } : {}),
      }];
      return finalizeMutation(
        state,
        next,
        '휴지통으로 이동',
        action.now,
        '휴지통으로 옮겼어요. 원본과 실행 기록은 그대로이며 되돌릴 수 있어요.',
      );
    }
    case 'restore-from-trash': {
      const entry = (next.trashEntries ?? []).find(
        (candidate) => candidate.memberRef === action.memberRef,
      );
      if (!entry) return unchanged(state, '복원할 항목이 휴지통에 없습니다.', 'unknown-trash-member');
      if (entry.member !== action.member) {
        return unchanged(state, '복원할 항목의 종류를 확인해 주세요.', 'trash-kind-mismatch');
      }
      next.trashEntries = (next.trashEntries ?? []).filter(
        (candidate) => candidate.memberRef !== action.memberRef,
      );
      if (entry.hadMembership) {
        const folderId = entry.previousFolderId
          && next.folders.some((folder) => folder.folderId === entry.previousFolderId)
          ? entry.previousFolderId
          : undefined;
        next.memberships.push({
          member: entry.member,
          memberRef: entry.memberRef,
          ...(folderId ? { folderId } : {}),
          orderKey: entry.previousOrderKey ?? next.memberships.filter(
            (membership) => membership.folderId === folderId,
          ).length,
        });
      }
      return finalizeMutation(
        state,
        next,
        '휴지통에서 복원',
        action.now,
        '휴지통에서 복원했어요. 이전 폴더가 없으면 미분류에 놓습니다.',
      );
    }
    case 'permanently-delete-from-trash': {
      const entry = (next.trashEntries ?? []).find(
        (candidate) => candidate.memberRef === action.memberRef,
      );
      if (!entry) {
        return unchanged(state, '영구 삭제할 항목이 휴지통에 없습니다.', 'unknown-trash-member');
      }
      if (entry.member !== action.member) {
        return unchanged(state, '영구 삭제할 항목의 종류를 확인해 주세요.', 'trash-kind-mismatch');
      }
      const itemRefs = action.itemRefs ?? [];
      if (action.member === 'quick_item' && itemRefs.length > 0) {
        return unchanged(state, '빠른 할 일의 삭제 범위를 확인해 주세요.', 'invalid-delete-scope');
      }
      if (action.member === 'saved_flow') {
        const segments = action.memberRef.split(':');
        const prefix = segments.length === 3
          ? `flow-item:${segments[1]}:${segments[2]}:`
          : '';
        if (!prefix
          || itemRefs.length === 0
          || new Set(itemRefs).size !== itemRefs.length
          || itemRefs.some((itemRef) => !itemRef.startsWith(prefix))) {
          return unchanged(state, 'Flow의 삭제 범위를 확인해 주세요.', 'invalid-delete-scope');
        }
      }
      next.trashEntries = (next.trashEntries ?? []).filter(
        (candidate) => candidate.memberRef !== action.memberRef,
      );
      next.deletedMembers = [...(next.deletedMembers ?? []), {
        member: action.member,
        memberRef: action.memberRef,
        deletedAt: action.now,
      }];
      next.memberships = next.memberships.filter(
        (membership) => membership.memberRef !== action.memberRef,
      );
      const removedTaskRefs = new Set<string>();
      if (action.member === 'quick_item') {
        removedTaskRefs.add(action.memberRef);
        next.quickItems = next.quickItems.filter(
          (item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) !== action.memberRef,
        );
      } else {
        itemRefs.forEach((itemRef) => removedTaskRefs.add(itemRef));
        if (next.personalPlanOverlays) delete next.personalPlanOverlays[action.memberRef];
        const authored = (next.authoredFlows ?? []).find((flow) => flow.ref === action.memberRef);
        if (authored) {
          next.authoredFlows = (next.authoredFlows ?? []).filter(
            (flow) => flow.ref !== action.memberRef,
          );
          next.authoringReceipts = (next.authoringReceipts ?? []).filter(
            (receipt) => receipt.flowRef !== action.memberRef,
          );
        }
      }
      removedTaskRefs.forEach((itemRef) => {
        delete next.placements[itemRef];
        delete next.completions[itemRef];
      });
      for (const [occurrenceId, entry] of Object.entries(next.occurrencePlacements ?? {})) {
        if (removedTaskRefs.has(entry.sourceItemRef)) delete next.occurrencePlacements?.[occurrenceId];
      }
      for (const [occurrenceId, entry] of Object.entries(next.occurrenceCompletions ?? {})) {
        if (removedTaskRefs.has(entry.sourceItemRef)) delete next.occurrenceCompletions?.[occurrenceId];
      }
      next.timelineOrders = next.timelineOrders.flatMap((order) => {
        const orderedRefKeys = order.orderedRefKeys.filter((ref) => !removedTaskRefs.has(ref));
        return orderedRefKeys.length > 0 ? [{ ...order, orderedRefKeys }] : [];
      });
      return finalizePermanentMutation(
        state,
        next,
        action.now,
        action.member === 'saved_flow'
          ? '이 기기의 개인공간에서 Flow를 영구 삭제했어요. 가져온 원본은 바뀌지 않았습니다.'
          : '이 기기에서 빠른 할 일을 영구 삭제했어요.',
      );
    }
    case 'move-date': {
      if (!isNonEmptyString(action.itemRef)) {
        return unchanged(state, '이동할 항목을 찾을 수 없어요.', 'invalid-item-ref');
      }
      if (action.date !== undefined && !isPersonalWorkspacePocDate(action.date)) {
        return unchanged(state, '날짜를 확인해 주세요.', 'invalid-date');
      }
      if (isInactiveTaskRef(next, action.itemRef)) {
        return unchanged(state, '휴지통에 있는 항목은 복원한 뒤 날짜를 바꿔 주세요.', 'inactive-item');
      }
      const current = next.placements[action.itemRef];
      if (
        (action.date !== undefined
          && current?.scheduleMode === 'fixed_date'
          && current.date === action.date)
        || (action.date === undefined && current?.scheduleMode === 'unscheduled')
      ) {
        return unchanged(state, '이미 같은 위치입니다.');
      }
      next.placements[action.itemRef] = action.date
        ? {
            itemRef: action.itemRef,
            scheduleMode: 'fixed_date',
            date: action.date,
            ...(current?.time ? { time: current.time } : {}),
            timelinePolicy: current?.timelinePolicy ?? 'auto',
          }
        : {
            itemRef: action.itemRef,
            scheduleMode: 'unscheduled',
            ...(current?.time ? { time: current.time } : {}),
            timelinePolicy: current?.timelinePolicy ?? 'auto',
          };
      return finalizeMutation(state, next, '실행 날짜 이동', action.now, action.date
        ? `${action.date}로 실행 날짜를 옮겼어요.`
        : '날짜 미정으로 옮겼어요.');
    }
    case 'restore-execution-date': {
      if (!isNonEmptyString(action.itemRef) || action.itemRef.startsWith('quick-item:')) {
        return unchanged(state, '원래 계획 날짜를 따를 Flow 항목을 확인해 주세요.', 'invalid-item-ref');
      }
      if (isInactiveTaskRef(next, action.itemRef)) {
        return unchanged(state, '휴지통에 있는 항목은 복원한 뒤 날짜를 바꿔 주세요.', 'inactive-item');
      }
      const current = next.placements[action.itemRef];
      if (!current || current.scheduleMode === 'inherit') {
        return unchanged(state, '이미 원래 계획 날짜를 따르고 있어요.');
      }
      if (current.timelinePolicy === 'auto' && !current.time) {
        delete next.placements[action.itemRef];
      } else {
        next.placements[action.itemRef] = {
          itemRef: action.itemRef,
          scheduleMode: 'inherit',
          ...(current.time ? { time: current.time } : {}),
          timelinePolicy: current.timelinePolicy,
        };
      }
      return finalizeMutation(
        state,
        next,
        '원래 계획 날짜 따르기',
        action.now,
        '실행 날짜 변경을 지우고 원래 계획 날짜를 따릅니다.',
      );
    }
    case 'set-timeline-policy': {
      if (isInactiveTaskRef(next, action.itemRef)) {
        return unchanged(state, '휴지통에 있는 항목은 복원한 뒤 표시를 바꿔 주세요.', 'inactive-item');
      }
      const current = next.placements[action.itemRef];
      if ((current?.timelinePolicy ?? 'auto') === action.policy) {
        return unchanged(state, '이미 같은 표시 상태입니다.');
      }
      next.placements[action.itemRef] = {
        itemRef: action.itemRef,
        scheduleMode: current?.scheduleMode ?? 'inherit',
        ...(current?.date ? { date: current.date } : {}),
        ...(current?.time ? { time: current.time } : {}),
        timelinePolicy: action.policy,
      };
      return finalizeMutation(state, next, '기간 목록 표시 변경', action.now, action.policy === 'excluded'
        ? '기간 목록에서 숨겼어요.'
        : '기간 목록에 다시 표시했어요.');
    }
    case 'reorder': {
      if (!action.contextKey.trim()
        || action.orderedRefKeys.length === 0
        || action.orderedRefKeys.some((ref) => !ref.trim())
        || new Set(action.orderedRefKeys).size !== action.orderedRefKeys.length) {
        return unchanged(state, '같은 목록의 항목끼리 순서를 바꿔 주세요.', 'invalid-order');
      }
      if (action.currentOrderedRefKeys && sameRefs(action.currentOrderedRefKeys, action.orderedRefKeys)) {
        return unchanged(state, '이미 같은 순서예요.');
      }
      const key = timelineKey(action.context, action.contextKey);
      const existingIndex = next.timelineOrders.findIndex(
        (order) => timelineKey(order.context, order.contextKey) === key,
      );
      if (existingIndex >= 0 && sameRefs(next.timelineOrders[existingIndex].orderedRefKeys, action.orderedRefKeys)) {
        return unchanged(state, '이미 같은 순서예요.');
      }
      const order: PersonalWorkspacePocTimelineOrder = {
        context: action.context,
        contextKey: action.contextKey,
        orderedRefKeys: [...action.orderedRefKeys],
        revision: (existingIndex >= 0 ? next.timelineOrders[existingIndex].revision : 0) + 1,
      };
      if (existingIndex >= 0) next.timelineOrders[existingIndex] = order;
      else next.timelineOrders.push(order);
      return finalizeMutation(state, next, '목록 순서 이동', action.now, '이 목록의 순서를 바꿨어요. 원본 순서는 그대로예요.');
    }
    case 'reset-order': {
      const key = timelineKey(action.context, action.contextKey);
      const before = next.timelineOrders.length;
      next.timelineOrders = next.timelineOrders.filter(
        (order) => timelineKey(order.context, order.contextKey) !== key,
      );
      if (next.timelineOrders.length === before) return unchanged(state, '이미 기본 순서예요.');
      return finalizeMutation(state, next, '시간순 복귀', action.now, '시간순으로 되돌렸어요.');
    }
    case 'apply-personal-plan': {
      if (!Number.isSafeInteger(action.expectedRevision)
        || action.expectedRevision !== state.revision) {
        return unchanged(state, '다른 변경이 먼저 저장됐어요. 편집 내용을 다시 확인해 주세요.', 'stale-state-revision');
      }
      if (isInactiveMemberRef(next, action.flowRef)) {
        return unchanged(state, '휴지통에 있는 Flow는 복원한 뒤 편집해 주세요.', 'inactive-flow');
      }
      if (!isNonEmptyString(action.flowRef)
        || !isNonEmptyString(action.savedCopyId)
        || !isNonEmptyString(action.flowId)
        || action.flowRef !== toPersonalWorkspacePocFlowRef(action.savedCopyId, action.flowId)
        || ![
          'source-backed-map',
          'personal-draft',
          'canonical-personal-copy',
          'legacy-saved-plan',
          'authoring-handoff',
        ].includes(action.origin)
        || action.overlay.flowRef !== action.flowRef
        || action.overlay.savedCopyId !== action.savedCopyId
        || action.overlay.flowId !== action.flowId
        || !isPersonalPlanOverlay(action.overlay, action.flowRef, true)) {
        return unchanged(state, '개인 계획의 Flow 식별자를 확인해 주세요.', 'invalid-personal-plan');
      }
      if (action.knownItemRefs.length === 0
        || action.knownItemRefs.some((itemRef) => !isNonEmptyString(itemRef))
        || new Set(action.knownItemRefs).size !== action.knownItemRefs.length) {
        return unchanged(state, '개인 계획의 할 일 식별자를 확인해 주세요.', 'invalid-personal-plan-items');
      }
      const knownItemRefs = new Set(action.knownItemRefs);
      if (Object.keys(action.overlay.items).some((itemRef) => !knownItemRefs.has(itemRef))
        || (action.overlay.orderedItemRefs
          && (action.overlay.orderedItemRefs.length !== action.knownItemRefs.length
            || action.overlay.orderedItemRefs.some((itemRef) => !knownItemRefs.has(itemRef))))) {
        return unchanged(state, '다른 Flow의 할 일이 섞여 저장하지 않았어요.', 'foreign-item-ref');
      }
      const sectionTitleIds = Object.keys(action.overlay.sectionTitles ?? {});
      if (sectionTitleIds.length > 0) {
        if (!['personal-draft', 'authoring-handoff'].includes(action.origin)) {
          return unchanged(state, '원본 구간 제목은 개인공간에서 바꾸지 않았어요.', 'read-only-section-title');
        }
        if (!Array.isArray(action.knownSectionIds)
          || !Array.isArray(action.editableSectionIds)
          || action.knownSectionIds.some((sectionId) => !isNonEmptyString(sectionId))
          || action.editableSectionIds.some((sectionId) => !isNonEmptyString(sectionId))
          || new Set(action.knownSectionIds).size !== action.knownSectionIds.length
          || new Set(action.editableSectionIds).size !== action.editableSectionIds.length) {
          return unchanged(state, '개인 구간 식별자를 확인해 주세요.', 'invalid-personal-plan-sections');
        }
        const knownSectionIds = new Set(action.knownSectionIds);
        const editableSectionIds = new Set(action.editableSectionIds);
        if (action.editableSectionIds.some((sectionId) => !knownSectionIds.has(sectionId))
          || sectionTitleIds.some((sectionId) => !knownSectionIds.has(sectionId))) {
          return unchanged(state, '다른 Flow의 구간이 섞여 저장하지 않았어요.', 'foreign-section-ref');
        }
        if (sectionTitleIds.some((sectionId) => !editableSectionIds.has(sectionId))) {
          return unchanged(state, '읽기 전용 구간 제목은 바꾸지 않았어요.', 'read-only-section-title');
        }
      }
      const hasOverrides = action.overlay.title !== undefined
        || action.overlay.orderedItemRefs !== undefined
        || sectionTitleIds.length > 0
        || Object.keys(action.overlay.items).length > 0;
      const overlays = next.personalPlanOverlays ?? {};
      if (hasOverrides) overlays[action.flowRef] = clone(action.overlay);
      else delete overlays[action.flowRef];
      next.personalPlanOverlays = overlays;
      return finalizeMutation(
        state,
        next,
        '개인 계획 적용',
        action.now,
        hasOverrides
          ? '개인 계획 변경을 적용했어요. 원본과 실행 위치는 그대로예요.'
          : '개인 계획 변경을 원래 값으로 되돌렸어요.',
      );
    }
    case 'commit-authoring-handoff': {
      if (!action.sourceConfirmed
        || action.confirmedSourceFingerprint !== action.flow.authoring.sourceFingerprint) {
        return unchanged(state, '원문과 구조를 확인해 주세요.', 'source-not-confirmed');
      }
      if (!isPersonalWorkspacePocAuthoringDraftRawValue(action.undoAuthoringDraftRawValue)) {
        return unchanged(state, '작성 중 초안의 복구 정보를 확인해 주세요.', 'invalid-authoring-draft-snapshot');
      }
      if (action.blockingIssues.length > 0) {
        return unchanged(state, '저장할 수 없는 입력을 먼저 수정해 주세요.', 'blocking-authoring-issues');
      }
      if (action.lossFields.length > 0 && !action.lossAccepted) {
        return unchanged(state, '저장 전에 정보 변환 범위를 확인해 주세요.', 'authoring-loss-not-accepted');
      }
      if (!isAuthoredFlow(action.flow)) {
        return unchanged(state, 'Flow 구조를 확인해 주세요.', 'invalid-authored-flow');
      }
      if (action.flow.authoring.source !== 'text-authoring-poc-v1'
        || !Array.isArray(action.flow.authoring.fidelityManifest?.sourceLines)
        || !isRecord(action.flow.authoring.sourceLineItemIdentityMap)) {
        return unchanged(
          state,
          '원문 줄과 할 일 연결 정보를 다시 확인해 주세요.',
          'incomplete-authoring-lineage',
        );
      }
      if ((action.flow.authoring.fidelityManifest?.entries.length ?? 0) > 0) {
        return unchanged(state, '손실 없이 옮길 수 없는 원문을 먼저 수정해 주세요.', 'authoring-fidelity-blocked');
      }
      if (action.folderId && !next.folders.some((folder) => folder.folderId === action.folderId)) {
        return unchanged(state, '저장할 폴더를 찾을 수 없어요.', 'unknown-folder');
      }
      const authoredFlows = next.authoredFlows ?? [];
      const receipts = next.authoringReceipts ?? [];
      const existingByHandoff = authoredFlows.find(
        (flow) => flow.authoring.handoffId === action.flow.authoring.handoffId,
      );
      if (existingByHandoff) {
        const existingMembership = next.memberships.find(
          (membership) => membership.memberRef === existingByHandoff.ref,
        );
        const sameFolder = existingMembership?.folderId === action.folderId
          || (!existingMembership && action.folderId === undefined);
        if (sameAuthoringHandoffFlow(existingByHandoff, action.flow) && sameFolder) {
          return unchanged(state, '이미 저장된 Flow를 열 수 있어요.');
        }
        return unchanged(state, '같은 저장 요청의 내용이 달라요. 새로 확인해 주세요.', 'handoff-conflict');
      }
      if (authoredFlows.some((flow) => flow.ref === action.flow.ref)
        || action.existingFlowRefs?.includes(action.flow.ref)) {
        return unchanged(state, 'Flow 식별자가 겹쳐 저장하지 않았어요.', 'flow-identity-collision');
      }
      const itemRefs = new Set(
        authoredFlows.flatMap((flow) => flow.items.map((item) => item.ref)),
      );
      if (action.flow.items.some((item) => itemRefs.has(item.ref))) {
        return unchanged(state, '할 일 식별자가 겹쳐 저장하지 않았어요.', 'item-identity-collision');
      }
      next.authoredFlows = [...authoredFlows, clone(action.flow)];
      next.authoringReceipts = [...receipts, {
        handoffId: action.flow.authoring.handoffId,
        flowRef: action.flow.ref,
        committedAt: action.flow.authoring.committedAt,
      }];
      next.memberships.push({
        member: 'saved_flow',
        memberRef: action.flow.ref,
        ...(action.folderId ? { folderId: action.folderId } : {}),
        orderKey: next.memberships.filter(
          (membership) => membership.folderId === action.folderId,
        ).length,
      });
      return finalizeMutation(
        state,
        next,
        '개인 Flow 저장',
        action.now,
        '개인 Flow에 저장했어요.',
        {
          kind: 'authoring-draft',
          rawValue: action.undoAuthoringDraftRawValue,
        },
      );
    }
    case 'complete': {
      if (isInactiveTaskRef(next, action.itemRef)) {
        return unchanged(state, '휴지통에 있는 항목은 복원한 뒤 상태를 바꿔 주세요.', 'inactive-item');
      }
      const quickItem = next.quickItems.find(
        (item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) === action.itemRef,
      );
      if (quickItem) {
        if ((quickItem.status === 'completed') === action.completed) {
          return unchanged(state, action.completed ? '이미 완료했어요.' : '이미 열린 상태예요.');
        }
        quickItem.status = action.completed ? 'completed' : 'open';
        if (action.completed) quickItem.completedAt = action.now;
        else delete quickItem.completedAt;
      } else {
        const current = next.completions[action.itemRef];
        const currentlyCompleted = current?.status === 'completed';
        if (currentlyCompleted === action.completed) {
          return unchanged(state, action.completed ? '이미 완료했어요.' : '이미 열린 상태예요.');
        }
        if (action.completed) {
          next.completions[action.itemRef] = { status: 'completed', completedAt: action.now };
        } else {
          delete next.completions[action.itemRef];
        }
      }
      return finalizeMutation(state, next, action.completed ? '완료' : '다시 열기', action.now, action.completed
        ? '완료했어요. Flow 보기와 기간 보기에 함께 반영돼요.'
        : '다시 열었어요.');
    }
    case 'move-occurrence-date': {
      if (!isPocOccurrenceIdentity(action.occurrenceId, action.sourceItemRef, action.originalDate)) {
        return unchanged(state, '반복 회차를 확인해 주세요.', 'invalid-occurrence-identity');
      }
      if (action.date !== undefined && !isPersonalWorkspacePocDate(action.date)) {
        return unchanged(state, '날짜를 확인해 주세요.', 'invalid-date');
      }
      if (isInactiveTaskRef(next, action.sourceItemRef)) {
        return unchanged(state, '휴지통에 있는 Flow는 복원한 뒤 회차를 옮겨 주세요.', 'inactive-item');
      }
      const placements = next.occurrencePlacements ?? {};
      const current = placements[action.occurrenceId];
      const effectiveCurrent = current?.scheduleMode === 'fixed_date'
        ? current.date
        : current?.scheduleMode === 'unscheduled'
          ? undefined
          : action.originalDate;
      if (effectiveCurrent === action.date) return unchanged(state, '이미 같은 위치입니다.');
      if (action.date === action.originalDate) {
        delete placements[action.occurrenceId];
      } else {
        placements[action.occurrenceId] = {
          occurrenceId: action.occurrenceId,
          sourceItemRef: action.sourceItemRef,
          originalDate: action.originalDate,
          scheduleMode: action.date ? 'fixed_date' : 'unscheduled',
          ...(action.date ? { date: action.date } : {}),
        };
      }
      next.occurrencePlacements = placements;
      return finalizeMutation(
        state,
        next,
        '이 회차 날짜 이동',
        action.now,
        action.date ? `이 회차를 ${action.date}로 옮겼어요.` : '이 회차를 날짜 미정으로 옮겼어요.',
      );
    }
    case 'restore-occurrence-date': {
      if (!isPocOccurrenceIdentity(action.occurrenceId, action.sourceItemRef, action.originalDate)) {
        return unchanged(state, '반복 회차를 확인해 주세요.', 'invalid-occurrence-identity');
      }
      if (!next.occurrencePlacements?.[action.occurrenceId]) {
        return unchanged(state, '이미 원래 회차 날짜를 따르고 있어요.');
      }
      delete next.occurrencePlacements[action.occurrenceId];
      return finalizeMutation(
        state,
        next,
        '이 회차 날짜 복원',
        action.now,
        `이 회차를 원래 날짜 ${action.originalDate}로 되돌렸어요.`,
      );
    }
    case 'complete-occurrence': {
      if (!isPocOccurrenceIdentity(action.occurrenceId, action.sourceItemRef, action.originalDate)) {
        return unchanged(state, '반복 회차를 확인해 주세요.', 'invalid-occurrence-identity');
      }
      if (isInactiveTaskRef(next, action.sourceItemRef)) {
        return unchanged(state, '휴지통에 있는 Flow는 복원한 뒤 상태를 바꿔 주세요.', 'inactive-item');
      }
      const completions = next.occurrenceCompletions ?? {};
      const currentlyCompleted = completions[action.occurrenceId]?.status === 'completed';
      if (currentlyCompleted === action.completed) {
        return unchanged(state, action.completed ? '이미 완료했어요.' : '이미 열린 상태예요.');
      }
      if (action.completed) {
        completions[action.occurrenceId] = {
          occurrenceId: action.occurrenceId,
          sourceItemRef: action.sourceItemRef,
          originalDate: action.originalDate,
          status: 'completed',
          completedAt: action.now,
        };
      } else completions[action.occurrenceId] = {
        occurrenceId: action.occurrenceId,
        sourceItemRef: action.sourceItemRef,
        originalDate: action.originalDate,
        status: 'open',
      };
      next.occurrenceCompletions = completions;
      return finalizeMutation(
        state,
        next,
        action.completed ? '이 회차 완료' : '이 회차 다시 열기',
        action.now,
        action.completed ? '이 회차를 완료했어요.' : '이 회차를 다시 열었어요.',
      );
    }
  }
}

export function getPersonalWorkspacePocFolderId(
  state: PersonalWorkspacePocState,
  memberRef: string,
): string | undefined {
  return state.memberships.find((membership) => membership.memberRef === memberRef)?.folderId;
}

export function isPersonalWorkspacePocMemberInactive(
  state: PersonalWorkspacePocState,
  memberRef: string,
): boolean {
  return isInactiveMemberRef(state, memberRef);
}

export function getPersonalWorkspacePocEffectiveDate(
  state: PersonalWorkspacePocState,
  itemRef: string,
  sourceDate?: string,
): string | undefined {
  const placement = state.placements[itemRef];
  if (!placement || placement.scheduleMode === 'inherit') return sourceDate;
  if (placement.scheduleMode === 'fixed_date') return placement.date;
  return undefined;
}

export function isPersonalWorkspacePocCompleted(
  state: PersonalWorkspacePocState,
  itemRef: string,
): boolean {
  const quick = state.quickItems.find(
    (item) => toPersonalWorkspacePocQuickItemRef(item.quickItemId) === itemRef,
  );
  return quick ? quick.status === 'completed' : state.completions[itemRef]?.status === 'completed';
}

export function applyPersonalWorkspacePocTimelineOrder(
  state: PersonalWorkspacePocState,
  context: PersonalWorkspacePocTimelineOrder['context'],
  contextKey: string,
  refs: readonly string[],
): string[] {
  const order = state.timelineOrders.find(
    (candidate) => candidate.context === context && candidate.contextKey === contextKey,
  );
  if (!order) return [...refs];
  const available = new Set(refs);
  const projected = order.orderedRefKeys.filter((ref) => available.has(ref));
  refs.forEach((ref) => {
    if (!projected.includes(ref)) projected.push(ref);
  });
  return projected;
}
