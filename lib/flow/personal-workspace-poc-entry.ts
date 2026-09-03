import {
  PERSONAL_WORKSPACE_POC_VERSION,
  toPersonalWorkspacePocFlowItemRef,
  toPersonalWorkspacePocFlowRef,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocOrigin,
  type PersonalWorkspacePocReadModel,
} from './personal-workspace-poc-contract';
import { canonicalizeFlowSourceUrl } from './url-first-lookup';

const ENTRY_ELIGIBLE_ORIGINS = new Set<PersonalWorkspacePocOrigin>([
  'source-backed-map',
  'personal-draft',
  'canonical-personal-copy',
  'legacy-saved-plan',
]);

const KNOWN_ORIGINS = new Set<PersonalWorkspacePocOrigin>([
  ...ENTRY_ELIGIBLE_ORIGINS,
  'authoring-handoff',
]);

export type PersonalWorkspacePocEntryMatch = Readonly<{
  flowRef: string;
  savedCopyId: string;
  flowId: string;
  title: string;
  origin: Exclude<PersonalWorkspacePocOrigin, 'authoring-handoff'>;
  matchedBy: readonly ('title' | 'source-title' | 'item-text' | 'source-url')[];
}>;

export type PersonalWorkspacePocEntryTextContinuation = Readonly<{
  /** The exact input bytes. Normalized lookup text must never replace this value. */
  rawText: string;
  requiresExplicitChoice: true;
}>;

type EntryResolutionBase = Readonly<{
  rawInput: string;
  normalizedInput: string;
}>;

export type PersonalWorkspacePocEntryResolution =
  | (EntryResolutionBase & Readonly<{
      kind: 'empty';
      matches: readonly [];
    }>)
  | (EntryResolutionBase & Readonly<{
      kind: 'url';
      canonicalUrl: string;
      lookupStatus: 'hit' | 'miss';
      matches: readonly PersonalWorkspacePocEntryMatch[];
      textContinuation: PersonalWorkspacePocEntryTextContinuation;
    }>)
  | (EntryResolutionBase & Readonly<{
      kind: 'invalid-url';
      matches: readonly [];
      textContinuation: PersonalWorkspacePocEntryTextContinuation;
    }>)
  | (EntryResolutionBase & Readonly<{
      kind: 'query';
      matches: readonly PersonalWorkspacePocEntryMatch[];
      textContinuation: PersonalWorkspacePocEntryTextContinuation;
    }>)
  | (EntryResolutionBase & Readonly<{
      kind: 'memo';
      matches: readonly [];
      textContinuation: PersonalWorkspacePocEntryTextContinuation;
    }>);

export type PersonalWorkspacePocEntryFailureReason =
  | 'unsupported-read-model-version'
  | 'unsupported-origin'
  | 'malformed-flow-identity'
  | 'duplicate-flow-identity'
  | 'malformed-item-identity'
  | 'duplicate-item-identity'
  | 'unsupported-map-presentation'
  | 'malformed-source-url';

export type PersonalWorkspacePocEntryResult =
  | Readonly<{ ok: true; resolution: PersonalWorkspacePocEntryResolution }>
  | Readonly<{
      ok: false;
      rawInput: string;
      reason: PersonalWorkspacePocEntryFailureReason;
    }>;

function normalizeLookupText(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('ko').replace(/\s+/gu, ' ');
}

function looksLikeUrl(value: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|www\.|https?(?:\/|$)|[^\s./]+\.[a-z]{2,}(?:[/:?#]|$))/iu.test(value);
}

function canonicalizeInputUrl(value: string): string | undefined {
  try {
    return canonicalizeFlowSourceUrl(value);
  } catch {
    return undefined;
  }
}

function validateAndSelectEligibleFlows(
  model: PersonalWorkspacePocReadModel,
):
  | Readonly<{ ok: true; flows: readonly PersonalWorkspacePocFlow[] }>
  | Readonly<{ ok: false; reason: PersonalWorkspacePocEntryFailureReason }> {
  if (model.version !== PERSONAL_WORKSPACE_POC_VERSION) {
    return { ok: false, reason: 'unsupported-read-model-version' };
  }
  const flowRefs = new Set<string>();
  const itemRefs = new Set<string>();
  const flows: PersonalWorkspacePocFlow[] = [];
  for (const flow of model.flows) {
    if (!KNOWN_ORIGINS.has(flow.origin)) {
      return { ok: false, reason: 'unsupported-origin' };
    }
    if (
      !flow.savedCopyId.trim()
      || !flow.flowId.trim()
      || !flow.title.trim()
      || flow.ref !== toPersonalWorkspacePocFlowRef(flow.savedCopyId, flow.flowId)
    ) {
      return { ok: false, reason: 'malformed-flow-identity' };
    }
    if (flowRefs.has(flow.ref)) return { ok: false, reason: 'duplicate-flow-identity' };
    flowRefs.add(flow.ref);
    const map = flow.presentation?.mapGroup;
    if (
      (flow.origin === 'source-backed-map' && !map)
      || (flow.origin !== 'source-backed-map' && Boolean(map))
      || (map && map.executionState !== 'executable' && map.executionState !== 'review-hold')
    ) {
      return { ok: false, reason: 'unsupported-map-presentation' };
    }
    const sourceUrls = flow.presentation?.discovery?.sourceUrls ?? [];
    if (!Array.isArray(sourceUrls) || sourceUrls.some((sourceUrl) => (
      typeof sourceUrl !== 'string'
      || !sourceUrl.trim()
      || !canonicalizeInputUrl(sourceUrl)
    ))) {
      return { ok: false, reason: 'malformed-source-url' };
    }
    for (const item of flow.items) {
      if (
        item.savedCopyId !== flow.savedCopyId
        || item.flowId !== flow.flowId
        || !item.itemId.trim()
        || item.ref !== toPersonalWorkspacePocFlowItemRef(
          item.savedCopyId,
          item.flowId,
          item.itemId,
        )
      ) {
        return { ok: false, reason: 'malformed-item-identity' };
      }
      if (itemRefs.has(item.ref)) return { ok: false, reason: 'duplicate-item-identity' };
      itemRefs.add(item.ref);
    }
    if (
      ENTRY_ELIGIBLE_ORIGINS.has(flow.origin)
      && map?.executionState !== 'review-hold'
    ) {
      flows.push(flow);
    }
  }
  return { ok: true, flows };
}

function toMatch(
  flow: PersonalWorkspacePocFlow,
  matchedBy: PersonalWorkspacePocEntryMatch['matchedBy'],
): PersonalWorkspacePocEntryMatch {
  return {
    flowRef: flow.ref,
    savedCopyId: flow.savedCopyId,
    flowId: flow.flowId,
    title: flow.title,
    origin: flow.origin as Exclude<PersonalWorkspacePocOrigin, 'authoring-handoff'>,
    matchedBy,
  };
}

function sortMatches(
  matches: readonly PersonalWorkspacePocEntryMatch[],
): readonly PersonalWorkspacePocEntryMatch[] {
  return [...matches].sort((left, right) => (
    left.title.localeCompare(right.title, 'ko') || left.flowRef.localeCompare(right.flowRef)
  ));
}

function textContinuation(rawInput: string): PersonalWorkspacePocEntryTextContinuation {
  return { rawText: rawInput, requiresExplicitChoice: true };
}

/**
 * Resolves one discovery control without DOM, network, storage, or save helpers.
 * The exact input is carried through every branch; normalized values are lookup-only.
 */
export function resolvePersonalWorkspacePocEntry(
  rawInput: string,
  model: PersonalWorkspacePocReadModel,
): PersonalWorkspacePocEntryResult {
  const selected = validateAndSelectEligibleFlows(model);
  if (!selected.ok) return { ok: false, rawInput, reason: selected.reason };
  const trimmed = rawInput.trim();
  const normalizedInput = normalizeLookupText(rawInput);
  if (!trimmed) {
    return {
      ok: true,
      resolution: { kind: 'empty', rawInput, normalizedInput, matches: [] },
    };
  }

  const canonicalUrl = canonicalizeInputUrl(trimmed);
  if (canonicalUrl) {
    const matches: PersonalWorkspacePocEntryMatch[] = [];
    for (const flow of selected.flows) {
      const canonicalSourceUrls = new Set<string>();
      for (const sourceUrl of flow.presentation?.discovery?.sourceUrls ?? []) {
        const canonicalSourceUrl = canonicalizeInputUrl(sourceUrl);
        if (!canonicalSourceUrl) {
          return { ok: false, rawInput, reason: 'malformed-source-url' };
        }
        canonicalSourceUrls.add(canonicalSourceUrl);
      }
      if (canonicalSourceUrls.has(canonicalUrl)) {
        matches.push(toMatch(flow, ['source-url']));
      }
    }
    const orderedMatches = sortMatches(matches);
    return {
      ok: true,
      resolution: {
        kind: 'url',
        rawInput,
        normalizedInput,
        canonicalUrl,
        lookupStatus: orderedMatches.length > 0 ? 'hit' : 'miss',
        matches: orderedMatches,
        textContinuation: textContinuation(rawInput),
      },
    };
  }

  if (looksLikeUrl(trimmed)) {
    return {
      ok: true,
      resolution: {
        kind: 'invalid-url',
        rawInput,
        normalizedInput,
        matches: [],
        textContinuation: textContinuation(rawInput),
      },
    };
  }

  const queryMatches: PersonalWorkspacePocEntryMatch[] = [];
  for (const flow of selected.flows) {
    const matchedBy: Array<'title' | 'source-title' | 'item-text'> = [];
    if (normalizeLookupText(flow.title).includes(normalizedInput)) matchedBy.push('title');
    const sourceTitle = flow.presentation?.discovery?.sourceTitle;
    if (sourceTitle && normalizeLookupText(sourceTitle).includes(normalizedInput)) {
      matchedBy.push('source-title');
    }
    if (flow.items.some((item) => (
      [item.title, item.description, item.sectionTitle]
        .filter((value): value is string => Boolean(value))
        .some((value) => normalizeLookupText(value).includes(normalizedInput))
    ))) {
      matchedBy.push('item-text');
    }
    if (matchedBy.length > 0) queryMatches.push(toMatch(flow, matchedBy));
  }
  const orderedMatches = sortMatches(queryMatches);
  if (orderedMatches.length > 0) {
    return {
      ok: true,
      resolution: {
        kind: 'query',
        rawInput,
        normalizedInput,
        matches: orderedMatches,
        textContinuation: textContinuation(rawInput),
      },
    };
  }
  return {
    ok: true,
    resolution: {
      kind: 'memo',
      rawInput,
      normalizedInput,
      matches: [],
      textContinuation: textContinuation(rawInput),
    },
  };
}
