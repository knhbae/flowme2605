export const PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION = 1 as const;
export const PUBLIC_FLOW_SAVE_HANDOFF_STORAGE_KEY_PREFIX =
  'flow:p35:save-handoff:v1:';

export type PublicFlowSaveDecision = 'overwrite' | 'copy';

export type PublicFlowSaveRawBackup = Readonly<{
  keys: readonly string[];
  values: Readonly<Record<string, string | null>>;
}>;

export type PublicFlowSaveHandoff = {
  schemaVersion: typeof PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION;
  token: string;
  sourceFlowSlug: string;
  personalCopyKey: string;
  idempotencyKey: string;
  itemCount: number;
  decision: PublicFlowSaveDecision;
  targetHref: string;
  rawBackup: PublicFlowSaveRawBackup;
  /** Exact raw values written by the save, used as the undo compare-and-swap guard. */
  expectedPostSaveRaw: PublicFlowSaveRawBackup;
};

export type PublicFlowSaveHandoffInput = Omit<
  PublicFlowSaveHandoff,
  'schemaVersion'
>;

export type PublicFlowSaveHandoffStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export type PublicFlowSaveUndoStorage = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export type PublicFlowSaveUndoResult = {
  /** Whether the original save backup is now fully restored. */
  complete: boolean;
  /** Keys whose save-backup restore mutation succeeded before any failure. */
  restoredKeys: string[];
  /** Keys whose save-backup restore mutation failed. */
  failedKeys: string[];
  /** Keys changed after the save; a conflict always aborts before any write. */
  conflictKeys: string[];
  /** Whether a failed undo left storage exactly as it was before undo began. */
  rollbackComplete: boolean;
};

const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const SOURCE_FLOW_SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/u;
const PERSONAL_COPY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const MAX_STORAGE_KEY_LENGTH = 1_024;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeToken(value: unknown): string | undefined {
  if (typeof value !== 'string' || !TOKEN_PATTERN.test(value)) return undefined;
  return value;
}

function normalizeSourceFlowSlug(value: unknown): string | undefined {
  if (typeof value !== 'string' || !SOURCE_FLOW_SLUG_PATTERN.test(value)) {
    return undefined;
  }
  return value;
}

function normalizePersonalCopyKey(value: unknown): string | undefined {
  if (typeof value !== 'string' || !PERSONAL_COPY_KEY_PATTERN.test(value)) {
    return undefined;
  }
  return value;
}

function normalizeTargetHref(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.startsWith('/')) return undefined;
  try {
    const target = new URL(value, 'https://flowme.local');
    if (target.origin !== 'https://flowme.local' || target.pathname !== '/my') {
      return undefined;
    }
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return undefined;
  }
}

function normalizeRawBackup(value: unknown): PublicFlowSaveRawBackup | undefined {
  if (!isPlainRecord(value) || !Array.isArray(value.keys) || !isPlainRecord(value.values)) {
    return undefined;
  }

  const keys: string[] = [];
  const seen = new Set<string>();
  for (const key of value.keys) {
    if (
      typeof key !== 'string' ||
      !key ||
      key.length > MAX_STORAGE_KEY_LENGTH ||
      key.includes('\0') ||
      seen.has(key)
    ) {
      return undefined;
    }
    seen.add(key);
    keys.push(key);
  }

  const rawValues = value.values;
  const valueKeys = Object.keys(rawValues);
  if (valueKeys.length !== keys.length || valueKeys.some((key) => !seen.has(key))) {
    return undefined;
  }

  const values: Record<string, string | null> = {};
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(rawValues, key)) return undefined;
    const raw = rawValues[key];
    if (raw !== null && typeof raw !== 'string') return undefined;
    values[key] = raw;
  }

  return { keys, values };
}

export function normalizePublicFlowSaveHandoff(
  value: unknown,
): PublicFlowSaveHandoff | undefined {
  if (!isPlainRecord(value) || value.schemaVersion !== PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION) {
    return undefined;
  }

  const token = normalizeToken(value.token);
  const sourceFlowSlug = normalizeSourceFlowSlug(value.sourceFlowSlug);
  const personalCopyKey = normalizePersonalCopyKey(value.personalCopyKey);
  const idempotencyKey = normalizeToken(value.idempotencyKey);
  const targetHref = normalizeTargetHref(value.targetHref);
  const rawBackup = normalizeRawBackup(value.rawBackup);
  const expectedPostSaveRaw = normalizeRawBackup(value.expectedPostSaveRaw);
  const itemCount = value.itemCount;
  const decision = value.decision;

  if (
    !token ||
    !sourceFlowSlug ||
    !personalCopyKey ||
    !idempotencyKey ||
    !targetHref ||
    !rawBackup ||
    !expectedPostSaveRaw ||
    expectedPostSaveRaw.keys.length !== rawBackup.keys.length ||
    expectedPostSaveRaw.keys.some((key, index) => key !== rawBackup.keys[index]) ||
    !Number.isSafeInteger(itemCount) ||
    Number(itemCount) < 0 ||
    (decision !== 'overwrite' && decision !== 'copy')
  ) {
    return undefined;
  }

  return {
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    token,
    sourceFlowSlug,
    personalCopyKey,
    idempotencyKey,
    itemCount: Number(itemCount),
    decision,
    targetHref,
    rawBackup,
    expectedPostSaveRaw,
  };
}

export function getPublicFlowSaveHandoffStorageKey(
  token: string,
): string | undefined {
  const normalized = normalizeToken(token);
  return normalized
    ? `${PUBLIC_FLOW_SAVE_HANDOFF_STORAGE_KEY_PREFIX}${encodeURIComponent(normalized)}`
    : undefined;
}

export function writePublicFlowSaveHandoff(
  storage: PublicFlowSaveHandoffStorage,
  input: PublicFlowSaveHandoffInput,
): PublicFlowSaveHandoff | undefined {
  const handoff = normalizePublicFlowSaveHandoff({
    schemaVersion: PUBLIC_FLOW_SAVE_HANDOFF_SCHEMA_VERSION,
    ...input,
  });
  if (!handoff) return undefined;

  const storageKey = getPublicFlowSaveHandoffStorageKey(handoff.token);
  if (!storageKey) return undefined;
  try {
    storage.setItem(storageKey, JSON.stringify(handoff));
    return handoff;
  } catch {
    return undefined;
  }
}

export function consumePublicFlowSaveHandoff(
  storage: PublicFlowSaveHandoffStorage,
  token: string,
): PublicFlowSaveHandoff | undefined {
  const storageKey = getPublicFlowSaveHandoffStorageKey(token);
  if (!storageKey) return undefined;

  let raw: string | null;
  try {
    raw = storage.getItem(storageKey);
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;

  // A handoff is single-use. If removal fails, do not return a payload that
  // could be consumed again after refresh or browser Back.
  try {
    storage.removeItem(storageKey);
  } catch {
    return undefined;
  }

  try {
    const handoff = normalizePublicFlowSaveHandoff(JSON.parse(raw));
    return handoff?.token === token ? handoff : undefined;
  } catch {
    return undefined;
  }
}

export function undoPublicFlowSaveHandoff(
  storage: PublicFlowSaveUndoStorage,
  handoff: PublicFlowSaveHandoff,
): PublicFlowSaveUndoResult {
  let normalized: PublicFlowSaveHandoff | undefined;
  try {
    normalized = normalizePublicFlowSaveHandoff(handoff);
  } catch {
    // A hostile or malformed object can throw from a property/key getter. No
    // storage mutation has started, so the pre-undo state is still intact.
    return {
      complete: false,
      restoredKeys: [],
      failedKeys: [],
      conflictKeys: [],
      rollbackComplete: true,
    };
  }
  if (!normalized) {
    return {
      complete: false,
      restoredKeys: [],
      failedKeys: [],
      conflictKeys: [],
      rollbackComplete: true,
    };
  }

  const keys = [...normalized.rawBackup.keys];
  const preUndoValues = new Map<string, string | null>();
  for (const key of keys) {
    try {
      preUndoValues.set(key, storage.getItem(key));
    } catch {
      // Snapshot every key before the first mutation. A read failure therefore
      // aborts without requiring a compensating write.
      return {
        complete: false,
        restoredKeys: [],
        failedKeys: [key],
        conflictKeys: [],
        rollbackComplete: true,
      };
    }
  }

  const conflictKeys = keys.filter(
    (key) => preUndoValues.get(key) !== normalized.expectedPostSaveRaw.values[key],
  );
  if (conflictKeys.length > 0) {
    return {
      complete: false,
      restoredKeys: [],
      failedKeys: [],
      conflictKeys,
      rollbackComplete: true,
    };
  }

  const restoredKeys: string[] = [];
  const restoreOrder = [...keys].reverse();
  for (const key of restoreOrder) {
    try {
      const raw = normalized.rawBackup.values[key];
      if (raw === null) storage.removeItem(key);
      else storage.setItem(key, raw);
      restoredKeys.push(key);
    } catch {
      let rollbackComplete = true;
      // The save-backup restore runs in reverse key order, so replaying the
      // pre-undo snapshot in the original order compensates in reverse. Restore
      // every key because a storage implementation may mutate and then throw.
      for (const rollbackKey of keys) {
        try {
          const raw = preUndoValues.get(rollbackKey);
          if (raw === null || raw === undefined) storage.removeItem(rollbackKey);
          else storage.setItem(rollbackKey, raw);
        } catch {
          rollbackComplete = false;
        }
      }
      return {
        complete: false,
        restoredKeys,
        failedKeys: [key],
        conflictKeys: [],
        rollbackComplete,
      };
    }
  }

  return {
    complete: true,
    restoredKeys,
    failedKeys: [],
    conflictKeys: [],
    rollbackComplete: true,
  };
}
