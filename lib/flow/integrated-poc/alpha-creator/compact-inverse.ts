import type { AlphaChange, AlphaPrivateField } from '../alpha-persistence/contract';
import { canonicalJson, detached } from '../alpha-persistence/json';

/** Reference codec for the private DB ledger. Never accepted as a forward command. */
export const CREATOR_INVERSE_SCHEMA = 'flowme-alpha-object-inverse/1' as const;
export const CREATOR_INVERSE_LIMITS = Object.freeze({ patches: 4096, depth: 120 });
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type CreatorInversePatch =
  | { op: 'set'; path: string[]; value: Json }
  | { op: 'remove'; path: string[] }
  | { op: 'splice'; path: string[]; expectedLength: number; index: number; remove: number; values: Json[] };
export type CompactCreatorInverse = { field: 'creatorWorkspace'; schema: typeof CREATOR_INVERSE_SCHEMA; changes: CreatorInversePatch[] };
export type CreatorInverse = AlphaChange | CompactCreatorInverse;
const fields = new Set(['creatorWorkspace', 'text', 'archivedDocumentIds', 'retentionDocuments', 'catalogLibrary']);
const own = (value: object, key: string) => Object.hasOwn(value, key);
const object = (value: unknown): value is Record<string, Json> => value !== null && typeof value === 'object' && !Array.isArray(value);
const equal = (a: Json, b: Json) => JSON.stringify(a) === JSON.stringify(b);
const fail = (): never => { throw Error('invalid-creator-inverse'); };

export function createCreatorInverse(beforeSpace: object, afterSpace: object, field: AlphaPrivateField = 'creatorWorkspace'): CreatorInverse {
  if (!fields.has(field)) return fail();
  const before = detached(beforeSpace) as Record<string, Json>, after = detached(afterSpace) as Record<string, Json>;
  const legacy: AlphaChange = own(before, field) ? { field, present: true, value: before[field] } : { field, present: false };
  if (field !== 'creatorWorkspace' || !object(before[field]) || !object(after[field])) return legacy;
  const changes: CreatorInversePatch[] = [];
  function diff(current: Json, target: Json, path: string[]) {
    if (changes.length > CREATOR_INVERSE_LIMITS.patches || path.length > CREATOR_INVERSE_LIMITS.depth) throw Error('diff-limit');
    if (equal(current, target)) return;
    if (object(current) && object(target)) {
      for (const key of [...new Set([...Object.keys(current), ...Object.keys(target)])].sort()) {
        const child = [...path, key];
        if (!own(target, key)) changes.push({ op: 'remove', path: child });
        else if (!own(current, key)) changes.push({ op: 'set', path: child, value: target[key] });
        else diff(current[key], target[key], child);
        if (changes.length > CREATOR_INVERSE_LIMITS.patches) throw Error('diff-limit');
      }
    } else if (Array.isArray(current) && Array.isArray(target)) {
      if (current.length === target.length) current.forEach((value, i) => diff(value, target[i], [...path, String(i)]));
      else {
        let prefix = 0, suffix = 0;
        while (prefix < Math.min(current.length, target.length) && equal(current[prefix], target[prefix])) prefix++;
        while (suffix < Math.min(current.length, target.length) - prefix && equal(current[current.length - 1 - suffix], target[target.length - 1 - suffix])) suffix++;
        changes.push({ op: 'splice', path, expectedLength: current.length, index: prefix, remove: current.length - prefix - suffix,
          values: target.slice(prefix, target.length - suffix) });
      }
    } else changes.push({ op: 'set', path, value: target });
  }
  try {
    diff(after[field], before[field], []);
    if (!changes.length || changes.length > CREATOR_INVERSE_LIMITS.patches) return legacy;
    const compact: CompactCreatorInverse = { field, schema: CREATOR_INVERSE_SCHEMA, changes };
    return new TextEncoder().encode(canonicalJson(compact)).length < new TextEncoder().encode(canonicalJson(legacy)).length ? compact : legacy;
  } catch (error) {
    if (error instanceof Error && ['diff-limit', 'alpha-json-depth', 'alpha-too-large'].includes(error.message)) return legacy;
    throw error;
  }
}

function exactKeys(value: Record<string, Json>, names: string[]) {
  if (Object.keys(value).sort().join('|') !== [...names].sort().join('|')) fail();
}
function pathOf(value: unknown): string[] {
  if (!Array.isArray(value) || !value.length || value.length > CREATOR_INVERSE_LIMITS.depth || value.some(key => typeof key !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(key))) return fail();
  return value as string[];
}
function indexOf(key: string, length: number) {
  if (!/^(0|[1-9][0-9]*)$/.test(key)) return fail();
  const index = Number(key);
  if (!Number.isSafeInteger(index) || index >= length) return fail();
  return index;
}

/** All validation and writes happen on a detached copy: failure cannot partially mutate input. */
export function applyCreatorInverse(space: object, entries: unknown): Record<string, Json> {
  const result = detached(space) as Record<string, Json>, inverse = detached(entries);
  if (!object(result) || !Array.isArray(inverse) || !inverse.length || inverse.length > fields.size) return fail();
  const seenFields = new Set<string>();
  for (const entry of inverse) {
    if (!object(entry) || typeof entry.field !== 'string' || !fields.has(entry.field) || seenFields.has(entry.field)) return fail();
    const field = entry.field; seenFields.add(field);
    if (!own(entry, 'schema')) {
      if (entry.present !== true && entry.present !== false) return fail();
      exactKeys(entry, entry.present ? ['field', 'present', 'value'] : ['field', 'present']);
      if (entry.present) result[field] = entry.value; else delete result[field];
      continue;
    }
    exactKeys(entry, ['field', 'schema', 'changes']);
    if (field !== 'creatorWorkspace' || entry.schema !== CREATOR_INVERSE_SCHEMA || !object(result[field]) || !Array.isArray(entry.changes) || !entry.changes.length || entry.changes.length > CREATOR_INVERSE_LIMITS.patches) return fail();
    const paths: string[][] = [];
    for (const patch of entry.changes) {
      if (!object(patch)) return fail();
      const path = pathOf(patch.path);
      if (paths.some(prior => prior.slice(0, Math.min(prior.length, path.length)).every((part, i) => part === path[i]))) return fail();
      paths.push(path);
      let parent: Json = result[field];
      for (const part of path.slice(0, -1)) {
        if (Array.isArray(parent)) parent = parent[indexOf(part, parent.length)];
        else if (object(parent) && own(parent, part)) parent = parent[part];
        else return fail();
      }
      const key = path[path.length - 1];
      let exists: boolean, current: Json | undefined;
      if (Array.isArray(parent)) { const index = indexOf(key, parent.length); exists = true; current = parent[index]; }
      else if (object(parent)) { exists = own(parent, key); current = parent[key]; }
      else return fail();
      const set = (value: Json) => { if (Array.isArray(parent)) parent[Number(key)] = value; else (parent as Record<string, Json>)[key] = value; };
      if (patch.op === 'set') {
        exactKeys(patch, ['op', 'path', 'value']);
        if (exists && equal(current!, patch.value)) return fail();
        set(patch.value);
      } else if (patch.op === 'remove') {
        exactKeys(patch, ['op', 'path']);
        if (Array.isArray(parent) || !exists) return fail();
        delete (parent as Record<string, Json>)[key];
      } else if (patch.op === 'splice') {
        exactKeys(patch, ['op', 'path', 'expectedLength', 'index', 'remove', 'values']);
        if (!Array.isArray(current) || !Array.isArray(patch.values)) return fail();
        const { expectedLength, index, remove } = patch;
        if (![expectedLength, index, remove].every(n => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0) || expectedLength !== current.length || (index as number) > current.length || (remove as number) > current.length - (index as number)) return fail();
        const next = [...current.slice(0, index as number), ...patch.values, ...current.slice((index as number) + (remove as number))];
        if (equal(current, next)) return fail();
        set(next);
      } else return fail();
    }
  }
  return detached(result);
}
