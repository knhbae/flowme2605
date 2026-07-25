import {
  canonicalFlowRegistry,
  getCanonicalFlowEntry,
  resolveCanonicalFlowAlias,
  type CanonicalFlowId,
  type CanonicalFlowRegistryEntry,
} from './canonical-flow-registry';
import {
  archivePersonalFlow,
  loadPersonalFlowLifecycle,
  restorePersonalFlow,
  savePersonalFlowLifecycle,
} from './personal-flow-lifecycle';

export const CANONICAL_FLOW_ORIGIN_SCHEMA_VERSION = 1 as const;
export const CANONICAL_FLOW_ORIGIN_STORAGE_KEY = 'flow:canonical:origin:v1';
export const CANONICAL_FLOW_RECONCILIATION_SCHEMA_VERSION = 1 as const;
export const CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY = 'flow:canonical:reconciliation:v1';
const SAVED_FLOW_KEY_PREFIX = 'flow:saved:';

export type CanonicalFlowStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type CanonicalFlowOriginMetadata = {
  canonicalFlowId: CanonicalFlowId;
  canonicalSavedSlug: string;
  legacyOriginSlugs: string[];
  lastCanonicalWriteAt: string;
};

export type CanonicalFlowOriginMetadataRecord = {
  schemaVersion: typeof CANONICAL_FLOW_ORIGIN_SCHEMA_VERSION;
  entries: Record<CanonicalFlowId, CanonicalFlowOriginMetadata>;
};

export type LoadedCanonicalFlowOriginMetadataRecord = CanonicalFlowOriginMetadataRecord & {
  compatibilityWarnings: string[];
};

export type CanonicalFlowReconciliationDecision = {
  canonicalFlowId: CanonicalFlowId;
  activeOriginSlug: string;
  archivedOriginSlugs: string[];
  decidedAt: string;
};

export type CanonicalFlowReconciliationRecord = {
  schemaVersion: typeof CANONICAL_FLOW_RECONCILIATION_SCHEMA_VERSION;
  decisions: Record<CanonicalFlowId, CanonicalFlowReconciliationDecision>;
};

export type LoadedCanonicalFlowReconciliationRecord = CanonicalFlowReconciliationRecord & {
  compatibilityWarnings: string[];
};

export type CanonicalSavedCopy = {
  canonicalFlowId: CanonicalFlowId;
  originSlug: string;
  role: 'canonical' | 'legacy';
  savedAt: string;
  personalTitle?: string;
  title: string;
  itemCount: number;
  archived: boolean;
};

export type CanonicalSavedCopyGroup = {
  canonicalFlowId: CanonicalFlowId;
  canonicalTitle: string;
  status: 'none' | 'single' | 'needs_choice' | 'resolved';
  copies: CanonicalSavedCopy[];
  activeCopy?: CanonicalSavedCopy;
  decision?: CanonicalFlowReconciliationDecision;
  warnings: string[];
};

function parseJson(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)));
}

function emptyOriginMetadataRecord(): LoadedCanonicalFlowOriginMetadataRecord {
  return {
    schemaVersion: CANONICAL_FLOW_ORIGIN_SCHEMA_VERSION,
    entries: {},
    compatibilityWarnings: [],
  };
}

function emptyReconciliationRecord(): LoadedCanonicalFlowReconciliationRecord {
  return {
    schemaVersion: CANONICAL_FLOW_RECONCILIATION_SCHEMA_VERSION,
    decisions: {},
    compatibilityWarnings: [],
  };
}

function addCanonicalIdCompatibilityReads<T extends { canonicalFlowId: CanonicalFlowId }>(
  records: Record<CanonicalFlowId, T>,
): {
  records: Record<CanonicalFlowId, T>;
  compatibilityWarnings: string[];
} {
  const compatibleRecords = { ...records };
  const compatibilityWarnings: string[] = [];

  for (const entry of canonicalFlowRegistry) {
    const canonicalFlowId = entry.identity.canonicalFlowId;
    const legacyRecords = entry.legacyCanonicalFlowIds.flatMap((legacyCanonicalFlowId) => {
      const record = records[legacyCanonicalFlowId];
      return record ? [{ legacyCanonicalFlowId, record }] : [];
    });
    if (legacyRecords.length === 0) continue;

    compatibilityWarnings.push(
      ...legacyRecords.map(
        ({ legacyCanonicalFlowId }) =>
          `legacy_canonical_id:${legacyCanonicalFlowId}->${canonicalFlowId}`,
      ),
    );
    if (records[canonicalFlowId]) {
      compatibilityWarnings.push(
        `multiple_canonical_id_records:${[
          canonicalFlowId,
          ...legacyRecords.map(({ legacyCanonicalFlowId }) => legacyCanonicalFlowId),
        ].join(',')}`,
      );
      continue;
    }

    compatibleRecords[canonicalFlowId] = {
      ...legacyRecords[0].record,
      canonicalFlowId,
    };
  }

  return {
    records: compatibleRecords,
    compatibilityWarnings,
  };
}

export function loadCanonicalFlowOriginMetadata(
  storage: CanonicalFlowStorage,
): LoadedCanonicalFlowOriginMetadataRecord {
  const parsed = parseJson(storage.getItem(CANONICAL_FLOW_ORIGIN_STORAGE_KEY));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyOriginMetadataRecord();
  const candidate = parsed as Partial<CanonicalFlowOriginMetadataRecord>;
  if (!candidate.entries || typeof candidate.entries !== 'object' || Array.isArray(candidate.entries)) {
    return emptyOriginMetadataRecord();
  }
  const entries = Object.fromEntries(Object.entries(candidate.entries).flatMap(([key, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const entry = value as Partial<CanonicalFlowOriginMetadata>;
    if (
      typeof entry.canonicalFlowId !== 'string' ||
      entry.canonicalFlowId !== key ||
      typeof entry.canonicalSavedSlug !== 'string' ||
      !entry.canonicalSavedSlug.trim() ||
      typeof entry.lastCanonicalWriteAt !== 'string' ||
      !entry.lastCanonicalWriteAt.trim()
    ) {
      return [];
    }
    return [[key, {
      canonicalFlowId: entry.canonicalFlowId,
      canonicalSavedSlug: entry.canonicalSavedSlug.trim(),
      legacyOriginSlugs: uniqueStrings(entry.legacyOriginSlugs),
      lastCanonicalWriteAt: entry.lastCanonicalWriteAt,
    } satisfies CanonicalFlowOriginMetadata]];
  }));
  const compatible = addCanonicalIdCompatibilityReads(entries);
  return {
    schemaVersion: CANONICAL_FLOW_ORIGIN_SCHEMA_VERSION,
    entries: compatible.records,
    compatibilityWarnings: compatible.compatibilityWarnings,
  };
}

export function recordCanonicalFlowWrite(
  storage: CanonicalFlowStorage,
  savedSlug: string,
  writtenAt: string,
): CanonicalFlowOriginMetadata | undefined {
  const resolved = resolveCanonicalFlowAlias('saved_slug', savedSlug);
  if (!resolved || resolved.alias.role !== 'canonical_entry') return undefined;
  const current = loadCanonicalFlowOriginMetadata(storage);
  const metadata: CanonicalFlowOriginMetadata = {
    canonicalFlowId: resolved.entry.identity.canonicalFlowId,
    canonicalSavedSlug: resolved.entry.canonicalPublicSlug,
    legacyOriginSlugs: [...resolved.entry.legacySavedSlugs],
    lastCanonicalWriteAt: writtenAt,
  };
  storage.setItem(CANONICAL_FLOW_ORIGIN_STORAGE_KEY, JSON.stringify({
    schemaVersion: CANONICAL_FLOW_ORIGIN_SCHEMA_VERSION,
    entries: {
      ...current.entries,
      [metadata.canonicalFlowId]: metadata,
    },
  } satisfies CanonicalFlowOriginMetadataRecord));
  return metadata;
}

export function loadCanonicalFlowReconciliationRecord(
  storage: CanonicalFlowStorage,
): LoadedCanonicalFlowReconciliationRecord {
  const parsed = parseJson(storage.getItem(CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyReconciliationRecord();
  const candidate = parsed as Partial<CanonicalFlowReconciliationRecord>;
  if (!candidate.decisions || typeof candidate.decisions !== 'object' || Array.isArray(candidate.decisions)) {
    return emptyReconciliationRecord();
  }
  const decisions = Object.fromEntries(Object.entries(candidate.decisions).flatMap(([key, value]) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const decision = value as Partial<CanonicalFlowReconciliationDecision>;
    if (
      typeof decision.canonicalFlowId !== 'string' ||
      decision.canonicalFlowId !== key ||
      typeof decision.activeOriginSlug !== 'string' ||
      !decision.activeOriginSlug.trim() ||
      typeof decision.decidedAt !== 'string' ||
      !decision.decidedAt.trim()
    ) {
      return [];
    }
    return [[key, {
      canonicalFlowId: decision.canonicalFlowId,
      activeOriginSlug: decision.activeOriginSlug.trim(),
      archivedOriginSlugs: uniqueStrings(decision.archivedOriginSlugs),
      decidedAt: decision.decidedAt,
    } satisfies CanonicalFlowReconciliationDecision]];
  }));
  const compatible = addCanonicalIdCompatibilityReads(decisions);
  return {
    schemaVersion: CANONICAL_FLOW_RECONCILIATION_SCHEMA_VERSION,
    decisions: compatible.records,
    compatibilityWarnings: compatible.compatibilityWarnings,
  };
}

function parseSavedCopy(storage: CanonicalFlowStorage, slug: string): {
  savedAt: string;
  personalTitle?: string;
} | undefined {
  const parsed = parseJson(storage.getItem(`${SAVED_FLOW_KEY_PREFIX}${slug}`));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined;
  const candidate = parsed as { slug?: unknown; savedAt?: unknown; personalTitle?: unknown };
  if (candidate.slug !== slug || typeof candidate.savedAt !== 'string' || !candidate.savedAt.trim()) {
    return undefined;
  }
  const personalTitle = typeof candidate.personalTitle === 'string' && candidate.personalTitle.trim()
    ? candidate.personalTitle.trim()
    : undefined;
  return {
    savedAt: candidate.savedAt,
    ...(personalTitle ? { personalTitle } : {}),
  };
}

function copyPresentation(entry: CanonicalFlowRegistryEntry, slug: string): {
  title: string;
  itemCount: number;
  role: CanonicalSavedCopy['role'];
} {
  if (slug === entry.canonicalPublicSlug) {
    return {
      title: '전체 이사 준비',
      itemCount: entry.canonicalItemCount,
      role: 'canonical',
    };
  }
  return {
    title: '간단 이사 준비',
    itemCount: 5,
    role: 'legacy',
  };
}

export function inspectCanonicalSavedCopyGroup(
  storage: CanonicalFlowStorage,
  entry: CanonicalFlowRegistryEntry,
  archivedFlowSlugs: string[] = [],
): CanonicalSavedCopyGroup {
  const archived = new Set(archivedFlowSlugs);
  const originSlugs = [entry.canonicalPublicSlug, ...entry.legacySavedSlugs];
  const warnings: string[] = [];
  const copies = originSlugs.flatMap((originSlug): CanonicalSavedCopy[] => {
    const parsed = parseSavedCopy(storage, originSlug);
    if (!parsed) {
      if (storage.getItem(`${SAVED_FLOW_KEY_PREFIX}${originSlug}`)) {
        warnings.push(`malformed_saved_copy:${originSlug}`);
      }
      return [];
    }
    const presentation = copyPresentation(entry, originSlug);
    return [{
      canonicalFlowId: entry.identity.canonicalFlowId,
      originSlug,
      ...presentation,
      ...parsed,
      archived: archived.has(originSlug),
    }];
  });
  const decision = loadCanonicalFlowReconciliationRecord(storage).decisions[entry.identity.canonicalFlowId];
  const activeCopy = decision
    ? copies.find((copy) => copy.originSlug === decision.activeOriginSlug)
    : copies.length === 1
      ? copies[0]
      : undefined;
  const inactiveCopies = activeCopy
    ? copies.filter((copy) => copy.originSlug !== activeCopy.originSlug)
    : [];
  const decisionStillApplied = Boolean(
    decision &&
    activeCopy &&
    !activeCopy.archived &&
    inactiveCopies.every((copy) => copy.archived),
  );
  const status: CanonicalSavedCopyGroup['status'] =
    copies.length === 0
      ? 'none'
      : copies.length === 1
        ? 'single'
        : decisionStillApplied
          ? 'resolved'
          : 'needs_choice';

  return {
    canonicalFlowId: entry.identity.canonicalFlowId,
    canonicalTitle: entry.title,
    status,
    copies,
    ...(activeCopy ? { activeCopy } : {}),
    ...(decision ? { decision } : {}),
    warnings,
  };
}

export function inspectAllCanonicalSavedCopyGroups(
  storage: CanonicalFlowStorage,
  archivedFlowSlugs: string[] = [],
): CanonicalSavedCopyGroup[] {
  return canonicalFlowRegistry.map((entry) => inspectCanonicalSavedCopyGroup(storage, entry, archivedFlowSlugs));
}

export function applyCanonicalReconciliationDecision(
  storage: CanonicalFlowStorage,
  canonicalFlowId: CanonicalFlowId,
  activeOriginSlug: string,
  decidedAt = new Date().toISOString(),
): CanonicalSavedCopyGroup | undefined {
  const entry = getCanonicalFlowEntry(canonicalFlowId);
  if (!entry) return undefined;
  const resolvedCanonicalFlowId = entry.identity.canonicalFlowId;
  const lifecycle = loadPersonalFlowLifecycle(storage, decidedAt).record;
  const currentGroup = inspectCanonicalSavedCopyGroup(storage, entry, lifecycle.archivedFlowSlugs);
  if (currentGroup.copies.length < 2) return currentGroup;
  if (!currentGroup.copies.some((copy) => copy.originSlug === activeOriginSlug)) return undefined;

  const archivedOriginSlugs = currentGroup.copies
    .filter((copy) => copy.originSlug !== activeOriginSlug)
    .map((copy) => copy.originSlug);
  let nextLifecycle = restorePersonalFlow(lifecycle, activeOriginSlug, decidedAt);
  for (const slug of archivedOriginSlugs) {
    nextLifecycle = archivePersonalFlow(nextLifecycle, slug, decidedAt);
  }
  savePersonalFlowLifecycle(storage, nextLifecycle);

  const record = loadCanonicalFlowReconciliationRecord(storage);
  const decision: CanonicalFlowReconciliationDecision = {
    canonicalFlowId: resolvedCanonicalFlowId,
    activeOriginSlug,
    archivedOriginSlugs,
    decidedAt,
  };
  storage.setItem(CANONICAL_FLOW_RECONCILIATION_STORAGE_KEY, JSON.stringify({
    schemaVersion: CANONICAL_FLOW_RECONCILIATION_SCHEMA_VERSION,
    decisions: {
      ...record.decisions,
      [resolvedCanonicalFlowId]: decision,
    },
  } satisfies CanonicalFlowReconciliationRecord));

  return inspectCanonicalSavedCopyGroup(storage, entry, nextLifecycle.archivedFlowSlugs);
}
