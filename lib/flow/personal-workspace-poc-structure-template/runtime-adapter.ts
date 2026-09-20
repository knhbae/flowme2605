/**
 * Runtime-neutral helpers copied from the isolated Text Authoring baseline.
 * Keeping them local prevents the personal-workspace PoC from importing an
 * operating Text Authoring storage key or schema.
 */

export type PersonalWorkspacePocStructureTemplateStorageAdapter = Pick<
  Storage,
  'getItem' | 'setItem' | 'removeItem'
>;

export function stableAuthoringHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, '0');
}

export function stableAuthoringId(
  prefix: string,
  ...identityParts: Array<string | number | boolean | null | undefined>
): string {
  const identity = identityParts
    .map((part) => (part === undefined ? '<undefined>' : String(part)))
    .join('\u001f');
  return `${prefix}-${stableAuthoringHash(identity)}`;
}

export function stableAuthoringJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableAuthoringJson(entry)).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableAuthoringJson(entry)}`);
  return `{${entries.join(',')}}`;
}

export function cloneAuthoringValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Deep-freezes JSON-shaped preview values without depending on Node APIs. */
export function freezeStructureTemplateRuntimeValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value;
  }
  Object.values(value as Record<string, unknown>).forEach((entry) => {
    freezeStructureTemplateRuntimeValue(entry);
  });
  return Object.freeze(value);
}

export function isValidAuthoringDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value.trim());
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

export function createMemoryStructureTemplateStorage(
  initial: Readonly<Record<string, string>> = {},
): PersonalWorkspacePocStructureTemplateStorageAdapter & Readonly<{
  snapshot(): Readonly<Record<string, string>>;
}> {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    snapshot() {
      return Object.fromEntries(values.entries());
    },
  };
}
