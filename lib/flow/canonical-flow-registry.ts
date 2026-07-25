export type CanonicalSourceId = string;
export type CanonicalUserJobId = string;
export type EditorialVariantId = string;
export type CanonicalFlowId = string;

export type CanonicalFlowIdentity = {
  canonicalSourceId: CanonicalSourceId;
  userJobId: CanonicalUserJobId;
  editorialVariantId: EditorialVariantId;
  canonicalFlowId: CanonicalFlowId;
};

export type CanonicalFlowAliasKind =
  | 'public_slug'
  | 'flow_map_id'
  | 'lookup_result_id'
  | 'route'
  | 'saved_slug';

export type CanonicalFlowAlias = {
  kind: CanonicalFlowAliasKind;
  value: string;
  role: 'canonical_entry' | 'legacy_entry' | 'legacy_saved_copy';
};

export type CanonicalFlowRegistryEntry = {
  identity: CanonicalFlowIdentity;
  title: string;
  canonicalPublicSlug: string;
  canonicalRoute: string;
  canonicalItemCount: number;
  aliases: CanonicalFlowAlias[];
  legacySavedSlugs: string[];
  status: 'resolved' | 'requires_editorial_resolution' | 'held';
  editorialDecision: {
    selectedSnapshot: string;
    legacySnapshot: string;
    reason: string;
  };
};

export type CrossEntryCandidate = {
  entryId: string;
  route: string;
  publicSlug?: string;
  flowMapId?: string;
  sourceUrl: string;
  canonicalSourceId: CanonicalSourceId;
  userJobId: CanonicalUserJobId;
  editorialVariantId: EditorialVariantId;
  title: string;
  itemCount: number;
  artifact: string;
  contentFingerprint: string;
  saveIdentity: string;
};

export type CrossEntryDifference = {
  field: 'title' | 'itemCount' | 'artifact' | 'contentFingerprint' | 'saveIdentity';
  values: string[];
};

export type CrossEntryInvariantDiagnostic = {
  candidateGroupId: string;
  canonicalSourceId: CanonicalSourceId;
  userJobId: CanonicalUserJobId;
  status: 'consistent' | 'requires_editorial_resolution';
  entries: CrossEntryCandidate[];
  differences: CrossEntryDifference[];
  canonicalWriteAllowed: boolean;
};

export const AJD_MOVING_CANONICAL_SOURCE_ID: CanonicalSourceId = 'source:ajd:moving-checklist:23363';
export const AJD_MOVING_USER_JOB_ID: CanonicalUserJobId = 'job:prepare-move-by-dday';
export const AJD_MOVING_CANONICAL_VARIANT_ID: EditorialVariantId =
  'variant:ajd-moving:comprehensive-calendar-v1';
export const AJD_MOVING_LEGACY_COMPACT_VARIANT_ID: EditorialVariantId =
  'variant:ajd-moving:legacy-compact-v1';
export const AJD_MOVING_CANONICAL_FLOW_ID: CanonicalFlowId =
  'flow:ajd-moving:prepare-by-dday:comprehensive-calendar-v1';
export const AJD_MOVING_CANONICAL_PUBLIC_SLUG = 'moving-d30-basic';
export const AJD_MOVING_CANONICAL_ROUTE = `/f/${AJD_MOVING_CANONICAL_PUBLIC_SLUG}`;
export const AJD_MOVING_SOURCE_URL =
  'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363';

export function createCanonicalFlowId({
  canonicalSourceId,
  userJobId,
  editorialVariantId,
}: Omit<CanonicalFlowIdentity, 'canonicalFlowId'>): CanonicalFlowId {
  const parts = [canonicalSourceId, userJobId, editorialVariantId].map((value) => value.trim());
  if (parts.some((value) => !value)) {
    throw new Error('Canonical Flow identity requires source, user job, and editorial variant IDs.');
  }
  return `canonical:${parts.join('|')}`;
}

function uniqueSorted(values: Array<string | number>): string[] {
  return Array.from(new Set(values.map(String))).sort((left, right) => left.localeCompare(right));
}

export function buildCrossEntryInvariantDiagnostic(
  candidates: CrossEntryCandidate[],
): CrossEntryInvariantDiagnostic[] {
  const grouped = new Map<string, CrossEntryCandidate[]>();

  for (const candidate of candidates) {
    const key = `${candidate.canonicalSourceId}|${candidate.userJobId}`;
    grouped.set(key, [...(grouped.get(key) ?? []), candidate]);
  }

  return Array.from(grouped.entries()).map(([candidateGroupId, entries]) => {
    const fields: Array<CrossEntryDifference['field']> = [
      'title',
      'itemCount',
      'artifact',
      'contentFingerprint',
      'saveIdentity',
    ];
    const differences = fields.flatMap((field) => {
      const values = uniqueSorted(entries.map((entry) => entry[field]));
      return values.length > 1 ? [{ field, values }] : [];
    });
    const status = differences.length > 0 ? 'requires_editorial_resolution' : 'consistent';

    return {
      candidateGroupId,
      canonicalSourceId: entries[0]?.canonicalSourceId ?? '',
      userJobId: entries[0]?.userJobId ?? '',
      status,
      entries: entries.map((entry) => ({ ...entry })),
      differences,
      canonicalWriteAllowed: status === 'consistent',
    };
  });
}

export const AJD_MOVING_PRE_RESOLUTION_CANDIDATES: CrossEntryCandidate[] = [
  {
    entryId: 'home',
    route: AJD_MOVING_CANONICAL_ROUTE,
    publicSlug: AJD_MOVING_CANONICAL_PUBLIC_SLUG,
    sourceUrl: AJD_MOVING_SOURCE_URL,
    canonicalSourceId: AJD_MOVING_CANONICAL_SOURCE_ID,
    userJobId: AJD_MOVING_USER_JOB_ID,
    editorialVariantId: 'variant:ajd-moving:unresolved',
    title: '이사 D-30 준비 Flow',
    itemCount: 24,
    artifact: 'calendar',
    contentFingerprint: 'ajd-moving-comprehensive-24-v1',
    saveIdentity: 'flow:saved:moving-d30-basic',
  },
  {
    entryId: 'find',
    route: '/flow-maps/moving-d30',
    flowMapId: 'moving-d30',
    publicSlug: 'source-backed-moving-d30',
    sourceUrl: AJD_MOVING_SOURCE_URL,
    canonicalSourceId: AJD_MOVING_CANONICAL_SOURCE_ID,
    userJobId: AJD_MOVING_USER_JOB_ID,
    editorialVariantId: 'variant:ajd-moving:unresolved',
    title: '실제 원문 기반 이사 D-30',
    itemCount: 5,
    artifact: 'calendar',
    contentFingerprint: 'ajd-moving-legacy-aggregate-5-v1',
    saveIdentity: 'flow:saved:source-backed-moving-d30',
  },
  {
    entryId: 'url_lookup',
    route: '/flow-maps/curated-ajd-moving-d30',
    flowMapId: 'curated-ajd-moving-d30',
    publicSlug: 'curated-ajd-moving-d30',
    sourceUrl: AJD_MOVING_SOURCE_URL,
    canonicalSourceId: AJD_MOVING_CANONICAL_SOURCE_ID,
    userJobId: AJD_MOVING_USER_JOB_ID,
    editorialVariantId: 'variant:ajd-moving:unresolved',
    title: '실제 원문 기반 이사 D-30',
    itemCount: 5,
    artifact: 'calendar',
    contentFingerprint: 'ajd-moving-legacy-aggregate-5-v1',
    saveIdentity: 'flow:saved:curated-ajd-moving-d30',
  },
  {
    entryId: 'direct_alias',
    route: '/f/source-backed-moving-d30',
    publicSlug: 'source-backed-moving-d30',
    sourceUrl: AJD_MOVING_SOURCE_URL,
    canonicalSourceId: AJD_MOVING_CANONICAL_SOURCE_ID,
    userJobId: AJD_MOVING_USER_JOB_ID,
    editorialVariantId: 'variant:ajd-moving:unresolved',
    title: '실제 원문 기반 이사 D-30',
    itemCount: 5,
    artifact: 'calendar',
    contentFingerprint: 'ajd-moving-legacy-aggregate-5-v1',
    saveIdentity: 'flow:saved:source-backed-moving-d30',
  },
];

export const AJD_MOVING_PRE_RESOLUTION_DIAGNOSTIC =
  buildCrossEntryInvariantDiagnostic(AJD_MOVING_PRE_RESOLUTION_CANDIDATES)[0];

const ajdMovingRegistryEntry: CanonicalFlowRegistryEntry = {
  identity: {
    canonicalSourceId: AJD_MOVING_CANONICAL_SOURCE_ID,
    userJobId: AJD_MOVING_USER_JOB_ID,
    editorialVariantId: AJD_MOVING_CANONICAL_VARIANT_ID,
    canonicalFlowId: AJD_MOVING_CANONICAL_FLOW_ID,
  },
  title: '이사 D-30 준비 Flow',
  canonicalPublicSlug: AJD_MOVING_CANONICAL_PUBLIC_SLUG,
  canonicalRoute: AJD_MOVING_CANONICAL_ROUTE,
  canonicalItemCount: 24,
  aliases: [
    { kind: 'public_slug', value: AJD_MOVING_CANONICAL_PUBLIC_SLUG, role: 'canonical_entry' },
    { kind: 'route', value: AJD_MOVING_CANONICAL_ROUTE, role: 'canonical_entry' },
    { kind: 'flow_map_id', value: 'moving-d30', role: 'legacy_entry' },
    { kind: 'flow_map_id', value: 'curated-ajd-moving-d30', role: 'legacy_entry' },
    { kind: 'lookup_result_id', value: 'curated-ajd-moving-d30', role: 'legacy_entry' },
    { kind: 'public_slug', value: 'source-backed-moving-d30', role: 'legacy_entry' },
    { kind: 'public_slug', value: 'curated-ajd-moving-d30', role: 'legacy_entry' },
    { kind: 'route', value: '/flow-maps/moving-d30', role: 'legacy_entry' },
    { kind: 'route', value: '/flow-maps/curated-ajd-moving-d30', role: 'legacy_entry' },
    { kind: 'route', value: '/f/source-backed-moving-d30', role: 'legacy_entry' },
    { kind: 'route', value: '/f/curated-ajd-moving-d30', role: 'legacy_entry' },
    { kind: 'saved_slug', value: AJD_MOVING_CANONICAL_PUBLIC_SLUG, role: 'canonical_entry' },
    { kind: 'saved_slug', value: 'source-backed-moving-d30', role: 'legacy_saved_copy' },
    { kind: 'saved_slug', value: 'curated-ajd-moving-d30', role: 'legacy_saved_copy' },
  ],
  legacySavedSlugs: ['source-backed-moving-d30', 'curated-ajd-moving-d30'],
  status: 'resolved',
  editorialDecision: {
    selectedSnapshot: 'ajd-moving-comprehensive-24-v1',
    legacySnapshot: 'ajd-moving-legacy-aggregate-5-v1',
    reason:
      'The 5-item snapshot aggregates multiple actions and cannot preserve existing item state as a subset of the 24-item snapshot.',
  },
};

export const canonicalFlowRegistry: CanonicalFlowRegistryEntry[] = [ajdMovingRegistryEntry];

export function resolveCanonicalFlowAlias(
  kind: CanonicalFlowAliasKind,
  value: string,
): { entry: CanonicalFlowRegistryEntry; alias: CanonicalFlowAlias } | undefined {
  for (const entry of canonicalFlowRegistry) {
    const alias = entry.aliases.find((candidate) => candidate.kind === kind && candidate.value === value);
    if (alias) return { entry, alias };
  }
  return undefined;
}

export function resolveCanonicalFlowRoute(
  kind: 'public_slug' | 'flow_map_id' | 'route' | 'lookup_result_id',
  value: string,
): string | undefined {
  return resolveCanonicalFlowAlias(kind, value)?.entry.canonicalRoute;
}

export function getCanonicalFlowEntry(canonicalFlowId: CanonicalFlowId): CanonicalFlowRegistryEntry | undefined {
  return canonicalFlowRegistry.find((entry) => entry.identity.canonicalFlowId === canonicalFlowId);
}

export function isCanonicalWriteAllowedForDiagnostic(
  diagnostic: CrossEntryInvariantDiagnostic | undefined,
): boolean {
  return diagnostic?.canonicalWriteAllowed === true;
}
