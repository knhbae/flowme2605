/**
 * Small, runtime-neutral identity helpers for the deterministic authoring
 * parser. They intentionally avoid crypto/random APIs so the same fixture can
 * be parsed in Node, the browser, and tests with identical IDs.
 */

export function normalizeAuthoringText(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

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
