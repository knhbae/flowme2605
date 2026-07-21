export const PERSONAL_FLOW_LIFECYCLE_SCHEMA_VERSION = 1 as const;
export const PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY = 'flow:my-flow:lifecycle:v1';
export const LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY = 'flow:my-flow:hidden-flows';

export type PersonalFlowLifecycleStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export type PersonalFlowLifecycleRecord = {
  schemaVersion: typeof PERSONAL_FLOW_LIFECYCLE_SCHEMA_VERSION;
  archivedFlowSlugs: string[];
  updatedAt: string;
  migration?: {
    source: 'legacy_hidden_flows';
    migratedAt: string;
  };
};

export type PersonalFlowLifecycleLoadResult = {
  record: PersonalFlowLifecycleRecord;
  source: 'stored' | 'legacy_hidden_flows' | 'empty';
  warnings: string[];
};

function normalizeSlugList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)));
}

function parseJson(raw: string | null): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function createEmptyPersonalFlowLifecycle(
  updatedAt = new Date().toISOString(),
): PersonalFlowLifecycleRecord {
  return {
    schemaVersion: PERSONAL_FLOW_LIFECYCLE_SCHEMA_VERSION,
    archivedFlowSlugs: [],
    updatedAt,
  };
}

export function normalizePersonalFlowLifecycle(
  value: unknown,
  fallbackUpdatedAt = new Date().toISOString(),
): PersonalFlowLifecycleRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyPersonalFlowLifecycle(fallbackUpdatedAt);
  }
  const candidate = value as Partial<PersonalFlowLifecycleRecord>;
  const updatedAt = typeof candidate.updatedAt === 'string' && candidate.updatedAt.trim()
    ? candidate.updatedAt
    : fallbackUpdatedAt;
  const migration = candidate.migration?.source === 'legacy_hidden_flows' && typeof candidate.migration.migratedAt === 'string'
    ? {
        source: 'legacy_hidden_flows' as const,
        migratedAt: candidate.migration.migratedAt,
      }
    : undefined;
  return {
    schemaVersion: PERSONAL_FLOW_LIFECYCLE_SCHEMA_VERSION,
    archivedFlowSlugs: normalizeSlugList(candidate.archivedFlowSlugs),
    updatedAt,
    ...(migration ? { migration } : {}),
  };
}

export function savePersonalFlowLifecycle(
  storage: PersonalFlowLifecycleStorage,
  record: PersonalFlowLifecycleRecord,
): PersonalFlowLifecycleRecord {
  const normalized = normalizePersonalFlowLifecycle(record, record.updatedAt);
  storage.setItem(PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY, JSON.stringify(normalized));
  // Keep the legacy list in sync so an older client can still restore archived flows.
  storage.setItem(
    LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY,
    JSON.stringify(normalized.archivedFlowSlugs),
  );
  return normalized;
}

export function loadPersonalFlowLifecycle(
  storage: PersonalFlowLifecycleStorage,
  now = new Date().toISOString(),
): PersonalFlowLifecycleLoadResult {
  const storedRaw = storage.getItem(PERSONAL_FLOW_LIFECYCLE_STORAGE_KEY);
  const storedValue = parseJson(storedRaw);
  if (storedValue && typeof storedValue === 'object' && !Array.isArray(storedValue)) {
    return {
      record: normalizePersonalFlowLifecycle(storedValue, now),
      source: 'stored',
      warnings: [],
    };
  }

  const warnings = storedRaw ? ['malformed_lifecycle_record_ignored'] : [];
  const legacyRaw = storage.getItem(LEGACY_MY_FLOW_HIDDEN_FLOWS_STORAGE_KEY);
  const legacyValue = parseJson(legacyRaw);
  const legacyArchivedFlowSlugs = normalizeSlugList(legacyValue);
  if (legacyArchivedFlowSlugs.length > 0) {
    const record = savePersonalFlowLifecycle(storage, {
      schemaVersion: PERSONAL_FLOW_LIFECYCLE_SCHEMA_VERSION,
      archivedFlowSlugs: legacyArchivedFlowSlugs,
      updatedAt: now,
      migration: {
        source: 'legacy_hidden_flows',
        migratedAt: now,
      },
    });
    return {
      record,
      source: 'legacy_hidden_flows',
      warnings,
    };
  }

  if (legacyRaw && !Array.isArray(legacyValue)) warnings.push('malformed_legacy_hidden_flows_ignored');
  return {
    record: createEmptyPersonalFlowLifecycle(now),
    source: 'empty',
    warnings,
  };
}

export function archivePersonalFlow(
  record: PersonalFlowLifecycleRecord,
  flowSlug: string,
  updatedAt = new Date().toISOString(),
): PersonalFlowLifecycleRecord {
  const slug = flowSlug.trim();
  const normalized = normalizePersonalFlowLifecycle(record, updatedAt);
  if (!slug) return normalized;
  return {
    ...normalized,
    archivedFlowSlugs: Array.from(new Set([...normalized.archivedFlowSlugs, slug])),
    updatedAt,
  };
}

export function restorePersonalFlow(
  record: PersonalFlowLifecycleRecord,
  flowSlug: string,
  updatedAt = new Date().toISOString(),
): PersonalFlowLifecycleRecord {
  const slug = flowSlug.trim();
  const normalized = normalizePersonalFlowLifecycle(record, updatedAt);
  return {
    ...normalized,
    archivedFlowSlugs: normalized.archivedFlowSlugs.filter((item) => item !== slug),
    updatedAt,
  };
}

export function isPersonalFlowArchived(
  record: PersonalFlowLifecycleRecord,
  flowSlug: string,
): boolean {
  return record.archivedFlowSlugs.includes(flowSlug);
}
