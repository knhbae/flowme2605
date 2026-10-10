import { sha256Sync } from './sha256-sync';
import type { FlowBundle } from '../types';
import type { SourceBackedMyFlowMap, SourceBackedFlowMapQualityDecision } from '../source-backed-my-flow';
import type { RuntimeArchivedFlowPolicy } from '../runtime-content-policy';
import type { FlowExposureStatus } from '../execution-model';
import type { PublicFlowIndexingPolicy } from '../route-indexing-policy';
import type { CanonicalFlowRegistryEntry } from '../canonical-flow-registry';

export const CATALOG_LIBRARY_SCHEMA = 'flowme-private-catalog-library/1' as const;
/** The suffix seals the frozen payload without shipping that payload to every
 * browser. A new source revision needs a new version, pack, and review. */
export const CATALOG_LIBRARY_VERSION = 'flowme-previous-poc-content-20260923-sha256-e97907e4c2297041805ae60bb738b5477b3417c62cd00a44859ec51c98c7037c' as const;
export const CATALOG_LIBRARY_LIMITS = Object.freeze({ jsonCharacters: 3_000_000, nodes: 250_000, depth: 64 });
export type CatalogLibraryPolicies = {
  flows: { slug: string; runtimeExcluded: boolean; archive: RuntimeArchivedFlowPolicy | null; exposure: FlowExposureStatus; indexing: PublicFlowIndexingPolicy }[];
  maps: { mapId: string; quality: SourceBackedFlowMapQualityDecision; directRoute: boolean; executable: boolean; publicCatalog: boolean }[];
  canonical: CanonicalFlowRegistryEntry[];
};
export type CatalogLibraryVariant = { sourceRevision: 'current-worktree-2026-09-23'; slug: string; bundle: FlowBundle };
/** Private immutable source library, NOT published state or the user's execution
 * workspace. Source status/item.status describe original content, not new access
 * rights/completion. Only usage_count/copy_count are omitted from original Flow. */
export type CatalogLibrarySnapshot = {
  schema: typeof CATALOG_LIBRARY_SCHEMA; catalogVersion: string; importedAt: string;
  bundles: FlowBundle[]; maps: SourceBackedMyFlowMap[]; policies: CatalogLibraryPolicies;
  variants: CatalogLibraryVariant[];
};
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
const id = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && value.length <= 1200 && !['__proto__', 'constructor', 'prototype'].includes(value);
const stamp = (value: unknown): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const stable = (value: unknown): string => Array.isArray(value) ? `[${value.map(stable).join(',')}]` : plain(value)
  ? `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}` : JSON.stringify(value);
const expectedDigest = CATALOG_LIBRARY_VERSION.slice(CATALOG_LIBRARY_VERSION.lastIndexOf('-') + 1);

/** Reject accessors, prototype tricks, sparse arrays, cycles and excessive input
 * before serialization. Does not execute supplied property getters or toJSON. */
function safeJson(value: unknown): boolean {
  const ancestors = new Set<object>(); let nodes = 0, characters = 0;
  function visit(v: unknown, depth: number): boolean {
    if (++nodes > CATALOG_LIBRARY_LIMITS.nodes || depth > CATALOG_LIBRARY_LIMITS.depth) return false;
    if (typeof v === 'string') { characters += v.length; return characters <= CATALOG_LIBRARY_LIMITS.jsonCharacters; }
    if (v === null || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v !== 'object' || !v || (Array.isArray(v) ? Object.getPrototypeOf(v) !== Array.prototype : !plain(v))
      || ancestors.has(v) || Object.getOwnPropertySymbols(v).length) return false;
    const descriptors = Object.getOwnPropertyDescriptors(v);
    const keys = Object.keys(descriptors).filter(k => !Array.isArray(v) || k !== 'length');
    if (Array.isArray(v) && (keys.length !== v.length || keys.some((k, i) => k !== String(i)))) return false;
    ancestors.add(v);
    for (const key of keys) {
      const d = descriptors[key]; characters += key.length;
      if (characters > CATALOG_LIBRARY_LIMITS.jsonCharacters || ['__proto__', 'constructor', 'prototype'].includes(key)
        || !d.enumerable || !('value' in d) || !visit(d.value, depth + 1)) return false;
    }
    ancestors.delete(v); return true;
  }
  return visit(value, 0);
}
const unique = (values: unknown[]) => values.every(id) && new Set(values).size === values.length;
function referencesValid(value: CatalogLibrarySnapshot): boolean {
  if (!Array.isArray(value.bundles) || value.bundles.length !== 177 || !Array.isArray(value.maps) || value.maps.length !== 26
    || !Array.isArray(value.variants) || value.variants.length !== 2 || !plain(value.policies)
    || !exact(value.policies, ['flows', 'maps', 'canonical'])) return false;
  if (!unique(value.bundles.map(b => b.flow?.id)) || !unique(value.bundles.map(b => b.flow?.slug)) || !unique(value.maps.map(m => m.id))) return false;
  const slugs = new Set(value.bundles.map(b => b.flow.slug));
  for (const b of [...value.bundles, ...value.variants.map(v => v.bundle)]) {
    if (!plain(b.flow) || Object.hasOwn(b.flow, 'usage_count') || Object.hasOwn(b.flow, 'copy_count')
      || !Array.isArray(b.sections) || !Array.isArray(b.items) || !unique(b.sections.map(s => s.id)) || !unique(b.items.map(i => i.id))) return false;
    const sections = new Set(b.sections.map(s => s.id)); const items = new Set(b.items.map(i => i.id));
    if (b.sections.some(s => s.flow_id !== b.flow.id) || b.items.some(i => i.flow_id !== b.flow.id || i.section_id !== undefined && !sections.has(i.section_id))) return false;
    if (b.itemDetails && (!unique(b.itemDetails.map(d => d.item_id)) || b.itemDetails.some(d => !items.has(d.item_id)))) return false;
    const recipes = new Set((b.recipes ?? []).map(r => r.id));
    if (b.recipes && (!unique(b.recipes.map(r => r.id)) || b.recipes.some(r => r.flow_id !== b.flow.id))) return false;
    if (b.mealSlots && (!unique(b.mealSlots.map(m => m.id)) || b.mealSlots.some(m => m.flow_id !== b.flow.id || !recipes.has(m.recipe_id) || m.section_id !== undefined && !sections.has(m.section_id)))) return false;
  }
  if (value.maps.some(m => !Array.isArray(m.flowSlugs) || !unique(m.flowSlugs) || m.flowSlugs.some(s => !slugs.has(s)))) return false;
  if (!unique(value.variants.map(v => v.slug)) || value.variants.some(v => !slugs.has(v.slug) || v.bundle.flow.slug !== v.slug)) return false;
  return true;
}
/** Frozen v1 pack equality validates every nested field and policy in addition
 * to cardinality/references. No current seed, runtime policy, native parser or
 * server state is consulted. Keep this pack/reader when adding future versions. */
export function validateCatalogLibrarySnapshot(value: unknown): value is CatalogLibrarySnapshot {
  try {
    if (!safeJson(value) || !plain(value) || !exact(value, ['schema', 'catalogVersion', 'importedAt', 'bundles', 'maps', 'policies', 'variants'])
      || value.schema !== CATALOG_LIBRARY_SCHEMA || value.catalogVersion !== CATALOG_LIBRARY_VERSION || !stamp(value.importedAt)) return false;
    if (!referencesValid(value as CatalogLibrarySnapshot)) return false;
    const { schema: _schema, importedAt: _time, catalogVersion: _version, ...payload } = value;
    return sha256Sync(stable(payload)) === expectedDigest;
  } catch { return false; }
}
export function catalogLibrarySummary(snapshot: CatalogLibrarySnapshot) {
  return { bundles: snapshot.bundles.length, maps: snapshot.maps.length, variants: snapshot.variants.length,
    items: snapshot.bundles.reduce((n, b) => n + b.items.length, 0), sections: snapshot.bundles.reduce((n, b) => n + b.sections.length, 0),
    runtimeExcluded: snapshot.policies.flows.filter(p => p.runtimeExcluded).length,
    runtimeIncluded: snapshot.policies.flows.filter(p => !p.runtimeExcluded).length };
}
