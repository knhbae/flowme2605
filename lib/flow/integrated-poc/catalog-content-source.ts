import type { FlowBundle } from '../types';
import {
  adaptCatalogContentBundle as adapt,
  buildCatalogContent as build,
  buildCatalogContentV3Candidate as buildV3,
  inspectCatalogContentCapability as inspect,
} from './catalog-content';
import { buildCatalogLibrarySnapshot } from './catalog-library-source';

export {
  CATALOG_CONTENT_SLUGS, CATALOG_CONTENT_V2_SLUGS, CATALOG_CONTENT_V2_INITIAL_SLUGS,
  CATALOG_CONTENT_V2_WAVE2_SLUGS, CATALOG_CONTENT_V3_SLUGS, CATALOG_CONTENT_V3_CANDIDATE_SLUGS,
  CATALOG_CONTENT_VERSION, CATALOG_CONTENT_V2_VERSION, CATALOG_CONTENT_V3_VERSION,
  catalogContentFingerprint, projectCatalogContent, validateCatalogContent,
  projectCatalogContentV3Candidate, validateCatalogContentV3Candidate,
} from './catalog-content';
export type { CatalogContent, CatalogContentBundle } from './catalog-content';

const frozen = () => buildCatalogLibrarySnapshot('2026-09-23T00:00:00.000Z');
export const adaptCatalogContentBundle = (source: FlowBundle) => adapt(source, frozen());
export const buildCatalogContent = (slug: string) => build(slug, frozen());
export const buildCatalogContentV3Candidate = (slug: string) => buildV3(slug, frozen());
export const inspectCatalogContentCapability = (slug: string) => inspect(slug, frozen());
