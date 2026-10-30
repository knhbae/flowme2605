import { seedBundles } from '../seed-flows';
import type { FlowBundle } from '../types';
import { createTextAuthoringDocument } from './native-creator-vendor/text-authoring/parser';
import type { TextAuthoringDocument } from './native-creator-vendor/text-authoring/types';
import { CATALOG_LIBRARY_VERSION, type CatalogLibrarySnapshot } from './catalog-library';
import { CATALOG_CONTENT_SEALS } from './catalog-content-seals';
import { sha256Sync } from './sha256-sync';

export const CATALOG_CONTENT_VERSION = 'flowme-catalog-content-v1' as const;
// Dependency-free allowlist: readers run during program-data initialization.
export const CATALOG_CONTENT_SLUGS = ['moving-d30-basic', 'chiangmai-solo-trip-packing'] as const;
export const CATALOG_CONTENT_V2_VERSION = 'flowme-catalog-content-v2' as const;
/** Explicit private-copy capability, not a change to public/source-fit policy. */
export const CATALOG_CONTENT_V2_INITIAL_SLUGS = ['closet-organize-1day', 'kitchen-reset-organize', 'travel-packing-list', 'portfolio-4week', 'blog-youtube-start'] as const;
export const CATALOG_CONTENT_V2_WAVE2_SLUGS = ['samsung-aircon-seasonal-check', 'samsung-washer-filter-cleaning', 'computer-skills-d30-study', 'home-cafe-daily'] as const;
// Additive capability only: the frozen v2 payload and projector never change.
export const CATALOG_CONTENT_V2_SLUGS = [...CATALOG_CONTENT_V2_INITIAL_SLUGS, ...CATALOG_CONTENT_V2_WAVE2_SLUGS] as const;
export const CATALOG_CONTENT_V3_VERSION = 'flowme-catalog-content-v3' as const;
/** Explicit single-day private copies, coordinated with the DEV v3 validator. */
export const CATALOG_CONTENT_V3_SLUGS = ['curated-opic-single-mock-review', 'curated-opic-course-row-import'] as const;
/** Compatibility name for the original projection preparation tests. */
export const CATALOG_CONTENT_V3_CANDIDATE_SLUGS = CATALOG_CONTENT_V3_SLUGS;
export type CatalogContentBundle = Omit<FlowBundle, 'flow'> & {
  flow: Omit<FlowBundle['flow'], 'status' | 'usage_count' | 'copy_count'>;
};
type CatalogContentBase = {
  sourceSlug: string;
  versionId: string;
  bundle: CatalogContentBundle;
};
export type CatalogContent = CatalogContentBase & ({ contractVersion: typeof CATALOG_CONTENT_VERSION }
  | { contractVersion: typeof CATALOG_CONTENT_V2_VERSION | typeof CATALOG_CONTENT_V3_VERSION; catalogVersion: string });
export type CatalogContentProjectionResult = {
  ok: true; content: CatalogContent; document: TextAuthoringDocument;
  itemMapping: { sourceItemId: string; nativeItemId: string }[];
  sectionMapping: { sourceSectionId: string; nativeStepId: string }[];
} | { ok: false; reason: 'invalid-source' | 'unsupported-fields' | 'unsupported-source' | 'projection-loss' };

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
/** Content identifier, not a cryptographic authentication seal. */
export function catalogContentFingerprint(value: unknown): string {
  const text = stableJson(value); let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
function exactContentSeal(value: Record<string, unknown>): boolean {
  if (typeof value.sourceSlug !== 'string' || typeof value.versionId !== 'string') return false;
  const expected = CATALOG_CONTENT_SEALS[value.sourceSlug];
  return !!expected && value.versionId === expected.versionId && sha256Sync(stableJson(value)) === expected.sha256;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string');
const singleLine = (value: unknown): value is string => typeof value === 'string' && !!value.trim() && !/[\r\n]/u.test(value);
const unique = (rows: { id: string }[]) => new Set(rows.map(row => row.id)).size === rows.length;
const keysWithin = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every(key => keys.includes(key));
const contentFlowKeys = ['id', 'slug', 'title', 'description', 'category', 'structure_type', 'content_type', 'anchor_type', 'source_title', 'source_url', 'source_status', 'source_precision', 'primary_destination', 'setup_anchor_label', 'setup_anchor_hint', 'source_published_at', 'source_modified_at', 'source_checked_at', 'conversion_note', 'risk_level', 'created_at', 'updated_at', 'warning', 'raw_text', 'owner_user_id', 'creator_name', 'creator_role', 'creator_note', 'tags', 'stop_conditions', 'principles', 'hold_section'];
const contentItemKeys = ['id', 'flow_id', 'section_id', 'title', 'description', 'type', 'day_offset', 'source_type', 'risk_level', 'order'];
const contentDetailKeys = ['item_id', 'source_fragment_ids', 'source_fragment_text', 'why', 'how', 'completion_criteria', 'caution', 'links'];
function safeContentUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 3000) return false;
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
    && !/(^|[?&])(token|access_token|api[_-]?key|password|secret|authorization)=/i.test(url.search); }
  catch { return false; }
}
function validBundle(value: unknown, singleDay = false): value is CatalogContentBundle {
  if (!record(value) || !record(value.flow) || !Array.isArray(value.sections) || !Array.isArray(value.items)) return false;
  const flow = value.flow;
  const sectionRows = value.sections; const itemRows = value.items;
  if (singleDay && (flow.structure_type !== 'timeline' || flow.anchor_type !== 'start_date'
    || !itemRows.every(item => record(item) && item.duration_days === 1 && item.type === 'calendar'
      && Number.isSafeInteger(item.day_offset)))) return false;
  if (!keysWithin(value, ['flow', 'sections', 'items', 'itemDetails', 'warnings', 'repeatRules', 'mealSlots', 'recipes'])
    || !keysWithin(flow, contentFlowKeys)) return false;
  for (const key of ['repeatRules', 'mealSlots', 'recipes']) if (value[key] !== undefined && (!Array.isArray(value[key]) || value[key].length)) return false;
  if (!['timeline', 'checklist'].includes(flow.structure_type as string)
    || (flow.content_type !== undefined && flow.content_type !== 'default')
    || !['start_date', 'end_date', 'none'].includes(flow.anchor_type as string) || !safeContentUrl(flow.source_url)) return false;
  if (['status', 'usage_count', 'copy_count'].some(key => key in flow)) return false;
  const flowStrings = ['id', 'slug', 'title', 'category', 'structure_type', 'anchor_type', 'created_at', 'updated_at'];
  if (!flowStrings.every(key => singleLine(flow[key]))) return false;
  for (const [key, entry] of Object.entries(flow)) {
    if (['tags', 'stop_conditions', 'principles'].includes(key)) { if (!strings(entry)) return false; }
    else if (key === 'hold_section') {
      if (!record(entry) || Object.keys(entry).some(k => !['title', 'reasons', 'consequence', 'memo_template'].includes(k))
        || !strings(entry.reasons) || !['title', 'consequence', 'memo_template'].every(k => typeof entry[k] === 'string')) return false;
    } else if (typeof entry !== 'string') return false;
  }
  if (!Number.isFinite(Date.parse(flow.updated_at as string)) || !Number.isFinite(Date.parse(flow.created_at as string))) return false;
  if (flow.source_status !== undefined && !['real', 'preview', 'needs_review'].includes(flow.source_status as string)) return false;
  if (flow.source_precision !== undefined && !['exact', 'broad'].includes(flow.source_precision as string)) return false;
  if (value.warnings !== undefined && !strings(value.warnings)) return false;
  if (!value.sections.every(section => record(section) && keysWithin(section, ['id', 'flow_id', 'title', 'description', 'order']) && singleLine(section.id) && singleLine(section.title)
    && section.flow_id === flow.id && Number.isSafeInteger(section.order)
    && (section.description === undefined || typeof section.description === 'string'))) return false;
  if (!value.items.length || !value.items.every(item => record(item) && keysWithin(item, singleDay ? [...contentItemKeys, 'duration_days'] : contentItemKeys) && singleLine(item.id) && singleLine(item.title)
    && ['todo', 'calendar'].includes(item.type as string)
    && item.flow_id === flow.id && Number.isSafeInteger(item.order) && typeof item.section_id === 'string'
    && sectionRows.some((section: unknown) => record(section) && section.id === item.section_id)
    && (item.description === undefined || typeof item.description === 'string')
    && (item.source_type === undefined || ['official', 'creator_experience', 'reference'].includes(item.source_type as string))
    && (item.risk_level === undefined || ['low', 'medium', 'medical_sensitive', 'financial_sensitive'].includes(item.risk_level as string))
    && (item.day_offset === undefined || Number.isSafeInteger(item.day_offset) && Math.abs(item.day_offset as number) <= 36600))) return false;
  if (!unique(value.items as { id: string }[]) || !unique(value.sections as { id: string }[])) return false;
  if (value.itemDetails !== undefined) {
    if (!Array.isArray(value.itemDetails) || !value.itemDetails.every(detail => record(detail) && keysWithin(detail, contentDetailKeys)
      && itemRows.some((item: unknown) => record(item) && item.id === detail.item_id)
      && Object.entries(detail).every(([key, entry]) => key === 'source_fragment_ids' ? strings(entry)
        : key === 'links' ? Array.isArray(entry) && entry.every(link => record(link)
          && Object.keys(link).length === 3 && ['label', 'url', 'type'].every(k => typeof link[k] === 'string')
          && safeContentUrl(link.url)
          && ['official', 'reference', 'tool', 'creator'].includes(link.type as string))
          : typeof entry === 'string'))) return false;
    if (new Set(value.itemDetails.map(row => row.item_id)).size !== value.itemDetails.length) return false;
  }
  return true;
}

/** Validate the embedded source; it deliberately does not consult a mutable seed. */
export function validateCatalogContent(value: unknown): value is CatalogContent {
  // v3 activation is shared by native replay, account restore and file intake.
  // Exact frozen content validation is mandatory on every one of these paths.
  if (record(value) && value.contractVersion === CATALOG_CONTENT_V3_VERSION) return validateCatalogContentV3Candidate(value);
  if (record(value) && value.contractVersion === CATALOG_CONTENT_V2_VERSION) {
    if (Object.keys(value).sort().join(',') !== 'bundle,catalogVersion,contractVersion,sourceSlug,versionId'
      || value.catalogVersion !== CATALOG_LIBRARY_VERSION || typeof value.sourceSlug !== 'string'
      || !CATALOG_CONTENT_V2_SLUGS.some(slug => slug === value.sourceSlug) || !validBundle(value.bundle)) return false;
    return exactContentSeal(value);
  }
  if (!record(value) || Object.keys(value).sort().join(',') !== 'bundle,contractVersion,sourceSlug,versionId'
    || value.contractVersion !== CATALOG_CONTENT_VERSION || typeof value.sourceSlug !== 'string'
    || !CATALOG_CONTENT_SLUGS.some(slug => slug === value.sourceSlug) || !validBundle(value.bundle)
    || value.bundle.flow.slug !== value.sourceSlug) return false;
  return value.versionId === `catalog-content-${value.sourceSlug}-${catalogContentFingerprint(value.bundle)}`;
}

/** A generated editing representation is separate from the exact original raw_text.
 * Every source field stays in the immutable content payload, not in user history. */
export function projectCatalogContent(value: unknown): CatalogContentProjectionResult {
  if (!validateCatalogContent(value)) return { ok: false, reason: 'invalid-source' };
  return projectValidatedCatalogContent(value);
}
function projectValidatedCatalogContent(value: CatalogContent): CatalogContentProjectionResult {
  const content: CatalogContent = JSON.parse(JSON.stringify(value));
  const { bundle } = content;
  const sections = [...bundle.sections].sort((a, b) => a.order - b.order);
  const ordered = sections.flatMap(section => [...bundle.items].filter(item => item.section_id === section.id).sort((a, b) => a.order - b.order));
  // Refuse interleaved section ordering rather than quietly changing item order.
  if (ordered.some((item, i) => item.id !== [...bundle.items].sort((a, b) => a.order - b.order)[i].id)) return { ok: false, reason: 'projection-loss' };
  const lines = [`# ${bundle.flow.title}`];
  const property = (label: string, text?: string) => { if (text) for (const line of text.split(/\r?\n/u)) if (line.trim()) lines.push(`  ${label}: ${line}`); };
  for (const section of sections) {
    lines.push('', `## ${section.title}`);
    for (const item of ordered.filter(row => row.section_id === section.id)) {
      const detail = bundle.itemDetails?.find(row => row.item_id === item.id);
      lines.push(`- [ ] ${item.title}`);
      if (item.day_offset !== undefined) property('상대날짜', item.day_offset === 0 ? 'D-Day' : `D${item.day_offset > 0 ? '+' : ''}${item.day_offset}`);
      property('상세', item.description); property('상세', detail?.why); property('방법', detail?.how);
      property('완료기준', detail?.completion_criteria); property('주의', detail?.caution);
      property('상세', detail?.source_fragment_text);
      property('출처', bundle.flow.source_url);
      for (const link of detail?.links ?? []) property('링크', `${link.label} ${link.url}`);
    }
  }
  const document = createTextAuthoringDocument(lines.join('\n'), { documentId: content.versionId,
    ownership: 'creator', title: bundle.flow.title, sourceTitle: bundle.flow.source_title,
    sourceUrl: bundle.flow.source_url, sourceExternalVersion: content.versionId, now: bundle.flow.updated_at,
    reviewRequirements: [{ kind: 'rights', reasonKey: 'catalog_content_original_attribution' }], importAssist: false });
  const native = document.parseResult.canonical;
  if (native.items.length !== ordered.length || native.steps.length !== sections.length
    || native.items.some((item, i) => item.title !== ordered[i].title || item.sourceChecked
      || (ordered[i].day_offset === undefined ? !!item.schedule : item.schedule?.kind !== 'relative' || item.schedule.dayOffset !== ordered[i].day_offset))
    || native.steps.some((step, i) => step.title !== sections[i].title)) return { ok: false, reason: 'projection-loss' };
  // The general text parser labels a source property "official". This adapter
  // knows the original attribution and must never promote a reference to official.
  for (const [i, item] of native.items.entries()) {
    const source = ordered[i]; const detail = bundle.itemDetails?.find(row => row.item_id === source.id);
    for (const link of item.sources) link.type = source.source_type === 'official' ? 'official' : source.source_type === 'creator_experience' ? 'creator' : 'reference';
    for (const link of item.resources) {
      const original = detail?.links?.find(row => row.url === link.url);
      if (original) { link.type = original.type; link.label = original.label; }
    }
  }
  if (content.contractVersion === CATALOG_CONTENT_V2_VERSION || content.contractVersion === CATALOG_CONTENT_V3_VERSION) {
    // v1 replay is intentionally unchanged. v2 verifies effective fields, not
    // merely that the source text still exists somewhere in an opaque snapshot.
    const linesOf = (text?: string) => (text?.split(/\r?\n/u) ?? []).filter(line => line.trim()).map(line => line.trim());
    for (const [i, item] of native.items.entries()) {
      const source = ordered[i], detail = bundle.itemDetails?.find(row => row.item_id === source.id);
      const expectedDetail = [source.description, detail?.why, detail?.how, detail?.source_fragment_text].flatMap(linesOf).join('\n');
      const sourceType = source.source_type === 'official' ? 'official' : source.source_type === 'creator_experience' ? 'creator' : 'reference';
      if ((item.detail ?? '') !== expectedDetail || (item.sourceDetail ?? '') !== expectedDetail
        || (item.completion?.doneWhen ?? '') !== linesOf(detail?.completion_criteria).join('\n')
        || stableJson(item.cautions) !== stableJson(linesOf(detail?.caution))
        || item.sources.length !== 1 || item.sources[0].url !== bundle.flow.source_url || item.sources[0].type !== sourceType
        || item.resources.length !== (detail?.links?.length ?? 0)
        || item.resources.some((link, index) => { const original = detail!.links![index]; return link.url !== original.url || link.label !== original.label || link.type !== original.type; })
        || item.recurrence || !item.included || item.role !== 'item' || item.sourceChecked) return { ok: false, reason: 'projection-loss' };
      item.sources[0].label = bundle.flow.source_title || '출처';
      if (content.contractVersion === CATALOG_CONTENT_V3_VERSION && (source.duration_days !== 1
        || item.schedule?.kind !== 'relative' || item.schedule.dayOffset !== source.day_offset
        || item.schedule.time !== undefined || item.schedule.timezone !== undefined
        || item.schedule.durationMinutes !== undefined || item.schedule.repeat !== undefined)) return { ok: false, reason: 'projection-loss' };
    }
  }
  return { ok: true, content, document,
    itemMapping: ordered.map((item, i) => ({ sourceItemId: item.id, nativeItemId: native.items[i].itemId })),
    sectionMapping: sections.map((section, i) => ({ sourceSectionId: section.id, nativeStepId: native.steps[i].stepId })) };
}

export function adaptCatalogContentBundle(source: FlowBundle, library?: CatalogLibrarySnapshot): CatalogContentProjectionResult {
  if (CATALOG_CONTENT_V2_SLUGS.some(slug => slug === source?.flow?.slug)
    || CATALOG_CONTENT_V3_SLUGS.some(slug => slug === source?.flow?.slug)) {
    try {
      if (source.flow.status !== 'published') return { ok: false, reason: 'invalid-source' };
      const content = CATALOG_CONTENT_V3_SLUGS.some(slug => slug === source.flow.slug)
        ? frozenSingleDayContent(source.flow.slug, library) : frozenContent(source.flow.slug, library);
      if (!content || stableJson(content.bundle) !== stableJson(contentBundle(source))) return { ok: false, reason: 'invalid-source' };
      return projectCatalogContent(content);
    } catch { return { ok: false, reason: 'invalid-source' }; }
  }
  if (!CATALOG_CONTENT_SLUGS.some(slug => slug === source?.flow?.slug)) return { ok: false, reason: 'unsupported-source' };
  try {
    if (source.flow.status !== 'published') return { ok: false, reason: 'invalid-source' };
    const bundle = JSON.parse(JSON.stringify(source));
    delete bundle.flow.status; delete bundle.flow.usage_count; delete bundle.flow.copy_count;
    if (!validBundle(bundle)) return { ok: false, reason: 'unsupported-fields' };
    return projectCatalogContent({ contractVersion: CATALOG_CONTENT_VERSION, sourceSlug: source.flow.slug,
      versionId: `catalog-content-${source.flow.slug}-${catalogContentFingerprint(bundle)}`, bundle });
  } catch { return { ok: false, reason: 'invalid-source' }; }
}

export function buildCatalogContent(slug: string, library?: CatalogLibrarySnapshot): CatalogContentProjectionResult {
  if (CATALOG_CONTENT_V3_SLUGS.some(candidate => candidate === slug)) {
    const content = frozenSingleDayContent(slug, library);
    return content ? projectCatalogContent(content) : { ok: false, reason: 'invalid-source' };
  }
  if (CATALOG_CONTENT_V2_SLUGS.some(candidate => candidate === slug)) {
    const content = frozenContent(slug, library);
    return content ? projectCatalogContent(content) : { ok: false, reason: 'invalid-source' };
  }
  if (!CATALOG_CONTENT_SLUGS.some(candidate => candidate === slug)) return { ok: false, reason: 'unsupported-source' };
  const bundle = seedBundles.find(candidate => candidate.flow.slug === slug);
  return bundle ? adaptCatalogContentBundle(bundle) : { ok: false, reason: 'invalid-source' };
}

function contentBundle(source: FlowBundle): CatalogContentBundle {
  const bundle = JSON.parse(JSON.stringify(source));
  delete bundle.flow.status; delete bundle.flow.usage_count; delete bundle.flow.copy_count;
  return bundle;
}
function frozenContent(slug: string, library?: CatalogLibrarySnapshot): CatalogContent | null {
  if (!library || library.catalogVersion !== CATALOG_LIBRARY_VERSION) return null;
  const source = library.bundles.find(row => row.flow.slug === slug);
  if (!source) return null;
  const bundle = contentBundle(source as unknown as FlowBundle), catalogVersion = CATALOG_LIBRARY_VERSION;
  return { contractVersion: CATALOG_CONTENT_V2_VERSION, catalogVersion, sourceSlug: slug,
    versionId: `catalog-content-v2-${slug}-${catalogContentFingerprint({ catalogVersion, bundle })}`, bundle };
}

function frozenSingleDayContent(slug: string, library?: CatalogLibrarySnapshot): CatalogContent | null {
  if (!CATALOG_CONTENT_V3_CANDIDATE_SLUGS.some(value => value === slug)) return null;
  const original = frozenContent(slug, library); if (!original || !('catalogVersion' in original)) return null;
  return { ...original, contractVersion: CATALOG_CONTENT_V3_VERSION,
    versionId: `catalog-content-v3-${slug}-${catalogContentFingerprint({ catalogVersion: original.catalogVersion, bundle: original.bundle })}` };
}

/** Compatibility projection entry point; runtime uses the same frozen contract.
 * Keep duration_days:1 in the immutable original; date-only relative schedules
 * represent one all-day occurrence, not a 1440-minute timed event. */
export function buildCatalogContentV3Candidate(slug: string, library?: CatalogLibrarySnapshot): CatalogContentProjectionResult {
  const content = frozenSingleDayContent(slug, library);
  return content ? projectCatalogContentV3Candidate(content) : { ok: false, reason: 'unsupported-source' };
}

/** Exact frozen v3 contract, also enforced by the shared runtime reader. */
export function validateCatalogContentV3Candidate(value: unknown): value is CatalogContent {
  if (!record(value) || value.contractVersion !== CATALOG_CONTENT_V3_VERSION
    || Object.keys(value).sort().join(',') !== 'bundle,catalogVersion,contractVersion,sourceSlug,versionId'
    || value.catalogVersion !== CATALOG_LIBRARY_VERSION || typeof value.sourceSlug !== 'string'
    || !CATALOG_CONTENT_V3_CANDIDATE_SLUGS.some(slug => slug === value.sourceSlug) || !validBundle(value.bundle, true)) return false;
  return exactContentSeal(value);
}

export function projectCatalogContentV3Candidate(value: unknown): CatalogContentProjectionResult {
  return validateCatalogContentV3Candidate(value) ? projectValidatedCatalogContent(value) : { ok: false, reason: 'invalid-source' };
}

export type CatalogContentCapability = { ready: true; sourceSlug: string; sourceVersionId: string; contractVersion: CatalogContent['contractVersion'] }
  | { ready: false; sourceSlug: string; reason: 'archived' | 'review-required' | 'unsupported-shape' | 'projection-loss' | 'not-enabled' };
/** Precedence: explicit approved copies (v1 grandfathered) -> archived ->
 * review-required -> unsupported-shape -> projection-loss -> not-enabled.
 * Exposure is never treated as permission. Mechanical success alone cannot
 * enable a new source; all other sources remain read-only. */
export function inspectCatalogContentCapability(slug: string, library?: CatalogLibrarySnapshot): CatalogContentCapability {
  if (CATALOG_CONTENT_SLUGS.some(s => s === slug) || CATALOG_CONTENT_V2_SLUGS.some(s => s === slug)
    || CATALOG_CONTENT_V3_SLUGS.some(s => s === slug)) {
    const projected = buildCatalogContent(slug, library);
    return projected.ok ? { ready: true, sourceSlug: slug, sourceVersionId: projected.content.versionId, contractVersion: projected.content.contractVersion }
      : { ready: false, sourceSlug: slug, reason: projected.reason === 'projection-loss' ? 'projection-loss' : 'unsupported-shape' };
  }
  const source = library?.bundles.find(row => row.flow.slug === slug), policy = library?.policies.flows.find(row => row.slug === slug);
  if (!source || !policy) return { ready: false, sourceSlug: slug, reason: 'not-enabled' };
  if (policy.runtimeExcluded || policy.archive || policy.exposure === 'hidden') return { ready: false, sourceSlug: slug, reason: 'archived' };
  if (['catalog_preview', 'source_review'].includes(policy.exposure) || ['preview', 'needs_review'].includes(source.flow.source_status ?? '')) return { ready: false, sourceSlug: slug, reason: 'review-required' };
  const bundle = contentBundle(source as unknown as FlowBundle);
  if (!validBundle(bundle)) return { ready: false, sourceSlug: slug, reason: 'unsupported-shape' };
  const projection = projectValidatedCatalogContent({ contractVersion: CATALOG_CONTENT_VERSION, sourceSlug: slug,
    versionId: `catalog-content-${slug}-${catalogContentFingerprint(bundle)}`, bundle });
  return { ready: false, sourceSlug: slug, reason: projection.ok ? 'not-enabled' : 'projection-loss' };
}
