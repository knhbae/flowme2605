import type { AlphaAccount } from '../alpha-persistence/contract';

/** Counts only, computed from an already validated private space. Categories may
 * overlap: a working copy can belong to a saved creator draft. Catalog variants
 * are separate from the primary catalog Flow/Item/section counts. */
export type PreservationContentSummary = {
  documents: number; flowDocuments: number; savedFlows: number;
  creatorDrafts: number; creatorWorkingCopies: number;
  catalogFlows: number; catalogItems: number; catalogSections: number;
  catalogMaps: number; catalogVariants: number;
};

const keys: (keyof PreservationContentSummary)[] = ['documents', 'flowDocuments', 'savedFlows',
  'creatorDrafts', 'creatorWorkingCopies', 'catalogFlows', 'catalogItems', 'catalogSections', 'catalogMaps', 'catalogVariants'];

export function isPreservationContentSummary(value: unknown): value is PreservationContentSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return Reflect.ownKeys(row).length === keys.length && keys.every(key => Object.hasOwn(row, key)
    && Number.isSafeInteger(row[key]) && (row[key] as number) >= 0);
}

export function summarizePreservationContent(space: AlphaAccount['space']): PreservationContentSummary {
  const catalog = space.catalogLibrary;
  return {
    documents: space.text.documents.length,
    flowDocuments: space.text.flows.length,
    savedFlows: space.savedBindings.length,
    creatorDrafts: Object.keys(space.creatorWorkspace?.library.records ?? {}).length,
    creatorWorkingCopies: space.creatorWorkspace?.working ? 1 : 0,
    catalogFlows: catalog?.bundles.length ?? 0,
    catalogItems: catalog?.bundles.reduce((sum, bundle) => sum + bundle.items.length, 0) ?? 0,
    catalogSections: catalog?.bundles.reduce((sum, bundle) => sum + bundle.sections.length, 0) ?? 0,
    catalogMaps: catalog?.maps.length ?? 0,
    catalogVariants: catalog?.variants.length ?? 0,
  };
}
