import type { SavedFlowRecord } from './storage';
import type { FlowBundle } from './types';
import { sha256Sync } from './integrated-poc/sha256-sync';
import { publishedSourceEditions } from './public-source-edition-data';

/** A source edition is distinct from the source author's modification date.
 * New intake may select it; an existing plan must opt in with its exact token.
 * Candidate editions are not published until their full source comparison passes. */
export type ReviewedPublicSourceEdition = {
  version: string;
  sourceFlowId: string;
  sourceSlug: string;
  bundleSha256: string;
  sourceComparison: 'pending' | 'passed';
  bundle: FlowBundle;
};

export function publicSourceBundleSha256(bundle: FlowBundle): string {
  return sha256Sync(JSON.stringify(bundle));
}

/** Registry entries are emitted only after exact source/field comparison.
 * Pending review output lives outside this runtime registry. */
const publishedEditions: readonly ReviewedPublicSourceEdition[] = publishedSourceEditions;

function exactEdition(source: FlowBundle, version: string | undefined,
  editions: readonly ReviewedPublicSourceEdition[]): ReviewedPublicSourceEdition | undefined {
  return editions.find(edition => edition.sourceComparison === 'passed'
    && edition.sourceFlowId === source.flow.id && edition.sourceSlug === source.flow.slug
    && edition.bundle.flow.id === source.flow.id && edition.bundle.flow.slug === source.flow.slug
    && edition.version === `flowme-reviewed-source-v1:${edition.sourceSlug}:${edition.bundleSha256}`
    && (version === undefined || edition.version === version)
    && publicSourceBundleSha256(edition.bundle) === edition.bundleSha256);
}

export function getCurrentPublicSourceEdition(source: FlowBundle,
  editions: readonly ReviewedPublicSourceEdition[] = publishedEditions): ReviewedPublicSourceEdition | undefined {
  return exactEdition(source, undefined, editions);
}

export function getPublishedPublicSourceEdition(slug: string, version?: string,
  editions: readonly ReviewedPublicSourceEdition[] = publishedEditions): ReviewedPublicSourceEdition | undefined {
  const entry = editions.find(edition => edition.sourceSlug === slug && (version === undefined || edition.version === version));
  return entry ? exactEdition(entry.bundle, version, editions) : undefined;
}

export function getSavedPublicSourceEdition(source: FlowBundle,
  saved: Pick<SavedFlowRecord, 'sourceVersion' | 'sourceFlowSlug' | 'sourceFlowKey'> | undefined,
  editions: readonly ReviewedPublicSourceEdition[] = publishedEditions): ReviewedPublicSourceEdition | undefined {
  if (!saved?.sourceVersion || saved.sourceFlowSlug !== source.flow.slug || saved.sourceFlowKey !== source.flow.id) return undefined;
  return exactEdition(source, saved.sourceVersion, editions);
}

export function getCurrentPublicSourceBundle(source: FlowBundle,
  editions: readonly ReviewedPublicSourceEdition[] = publishedEditions): FlowBundle {
  const edition = getCurrentPublicSourceEdition(source, editions);
  return edition ? JSON.parse(JSON.stringify(edition.bundle)) as FlowBundle : source;
}

/** No date-string inference, latest-version fallback or migration. */
export function selectSavedPublicSourceBundle(source: FlowBundle,
  saved: Pick<SavedFlowRecord, 'sourceVersion' | 'sourceFlowSlug' | 'sourceFlowKey'> | undefined,
  editions: readonly ReviewedPublicSourceEdition[] = publishedEditions): FlowBundle {
  const edition = getSavedPublicSourceEdition(source, saved, editions);
  return edition ? JSON.parse(JSON.stringify(edition.bundle)) as FlowBundle : source;
}

export function getReviewedPublicSourceVersion(bundle: FlowBundle,
  editions: readonly ReviewedPublicSourceEdition[] = publishedEditions): string | undefined {
  const sha = publicSourceBundleSha256(bundle);
  return exactEdition(bundle, `flowme-reviewed-source-v1:${bundle.flow.slug}:${sha}`, editions)?.version;
}
