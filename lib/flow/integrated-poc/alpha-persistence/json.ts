import { ALPHA_LIMITS } from './contract';

/** JSON.stringify alone silently drops undefined, invokes getters and coerces NaN. */
export function canonicalJson(value: unknown): string {
  const seen = new Set<object>();
  function visit(part: unknown, depth: number): unknown {
    if (depth > ALPHA_LIMITS.depth) throw Error('alpha-json-depth');
    if (part === null || typeof part === 'string' || typeof part === 'boolean') return part;
    if (typeof part === 'number' && Number.isFinite(part) && !Object.is(part, -0)) return part;
    if (typeof part !== 'object' || seen.has(part)) throw Error('alpha-non-json');
    if (!Array.isArray(part) && ![Object.prototype, null].includes(Object.getPrototypeOf(part))) throw Error('alpha-non-plain');
    if (Object.getOwnPropertySymbols(part).length) throw Error('alpha-symbol');
    seen.add(part);
    try {
      const descriptors = Object.getOwnPropertyDescriptors(part);
      const keys = Object.keys(descriptors).filter(key => !Array.isArray(part) || key !== 'length');
      if (Array.isArray(part) && (keys.length !== part.length || keys.some((key, i) => key !== String(i)))) throw Error('alpha-sparse-array');
      const pairs = keys.map(key => {
        const d = descriptors[key];
        if (['__proto__', 'prototype', 'constructor'].includes(key) || !d.enumerable || !('value' in d)) throw Error('alpha-property');
        return [key, visit(d.value, depth + 1)] as const;
      });
      return Array.isArray(part) ? pairs.map(pair => pair[1]) : Object.fromEntries(pairs.sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    } finally { seen.delete(part); }
  }
  const raw = JSON.stringify(visit(value, 0));
  if (new TextEncoder().encode(raw).byteLength > ALPHA_LIMITS.bytes) throw Error('alpha-too-large');
  return raw;
}
export function detached<T>(value: T): T { return JSON.parse(canonicalJson(value)) as T; }
export function parseAlphaJson(raw: string): unknown {
  if (new TextEncoder().encode(raw).byteLength > ALPHA_LIMITS.bytes) throw Error('alpha-too-large');
  const value: unknown = JSON.parse(raw);
  canonicalJson(value);
  return value;
}
export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export const hashJson = (value: unknown) => sha256(new TextEncoder().encode(canonicalJson(value)));
