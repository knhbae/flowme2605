import type { PersonalWorkspacePocFlow } from '../personal-workspace-poc-contract';
import { PROGRAM_LEGACY_MAP_MEMBERSHIP_LIMITS as LIMITS, compareProgramLegacyMapMembership,
  withProgramLegacyMapMembershipEvidence,
  type ProgramLegacyMapMembershipRevision, type ProgramLegacyMapMembershipSelection } from './legacy-map-membership';

export type ProgramLegacyMapMembershipEffective = { acceptedAbsences: Record<string, string> };
export type ProgramLegacyMapMembershipReview = {
  id: string; incomingRevisionId: string; expectedSelection: string;
  choices: Record<string, 'mine' | 'incoming'>; status: 'pending' | 'deferred' | 'applied'; createdAt: string;
};
export type ProgramLegacyMapMembershipOwner = {
  ownerId: string; baseSourceToken: string; revisions: Record<string, ProgramLegacyMapMembershipRevision>;
  effective: ProgramLegacyMapMembershipEffective; reviews: ProgramLegacyMapMembershipReview[];
  undo?: { reviewId: string; selection: ProgramLegacyMapMembershipEffective };
};
export type ProgramLegacyMapMembershipStore = { version: 1; groups: Record<string, ProgramLegacyMapMembershipOwner> };
export const programMapMembershipCanonical = (value: unknown): string => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
export const programMapMembershipRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.entries(Object.getOwnPropertyDescriptors(value))
    .every(([key, descriptor]) => !['__proto__', 'constructor', 'prototype'].includes(key) && 'value' in descriptor);
export const programMapMembershipId = (value: unknown): value is string => typeof value === 'string' && !!value.trim()
  && value.length <= LIMITS.maxIdentifierLength && !['__proto__', 'constructor', 'prototype'].includes(value);
export const programMapMembershipStamp = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u.test(value) && Number.isFinite(Date.parse(value));
const shape = (value: object, required: string[], optional: string[] = []) => required.every(key => Object.hasOwn(value, key))
  && Object.keys(value).every(key => [...required, ...optional].includes(key));

export function programLegacyMapMembershipSelection(owner: ProgramLegacyMapMembershipOwner, effective = owner.effective): ProgramLegacyMapMembershipSelection {
  return { version: 1, baseSourceToken: owner.baseSourceToken, revisions: owner.revisions, acceptedAbsences: effective.acceptedAbsences };
}
export function programLegacyMapMembershipReviewChanges(owner: ProgramLegacyMapMembershipOwner, originals: readonly PersonalWorkspacePocFlow[], review: ProgramLegacyMapMembershipReview) {
  try {
    return compareProgramLegacyMapMembership(originals, owner.revisions[review.incomingRevisionId],
      programLegacyMapMembershipSelection(owner, JSON.parse(review.expectedSelection)));
  } catch { return { ok: false as const, reason: 'invalid-membership-review' }; }
}
export function resolveProgramLegacyMapMembershipReview(owner: ProgramLegacyMapMembershipOwner, originals: readonly PersonalWorkspacePocFlow[], review: ProgramLegacyMapMembershipReview) {
  const compared = programLegacyMapMembershipReviewChanges(owner, originals, review);
  return resolveComparedReview(review, compared);
}
function resolveComparedReview(review: ProgramLegacyMapMembershipReview, compared: ReturnType<typeof programLegacyMapMembershipReviewChanges>) {
  if (!compared.ok || !compared.changes.length || compared.changes.some(change => !review.choices[change.id])
    || Object.keys(review.choices).some(id => !compared.changes.some(change => change.id === id))) return null;
  const previous = JSON.parse(review.expectedSelection) as ProgramLegacyMapMembershipEffective;
  const effective = { acceptedAbsences: { ...previous.acceptedAbsences } };
  for (const change of compared.changes) if (review.choices[change.id] === 'incoming') {
    if (change.kind === 'removed') effective.acceptedAbsences[change.flowRef] = review.incomingRevisionId;
    else delete effective.acceptedAbsences[change.flowRef];
  }
  return effective;
}

/** No owner in an old payload means the original membership, with no migration.
 * Every accepted absence must have both exact package evidence and a complete
 * explicit review receipt. Original Flow/Item data is never projected away. */
export function validateProgramLegacyMapMembershipStore(value: unknown, originals: readonly PersonalWorkspacePocFlow[]): value is ProgramLegacyMapMembershipStore | undefined {
  if (value === undefined) return true;
  try {
    if (!programMapMembershipRecord(value) || !shape(value, ['version', 'groups']) || value.version !== 1
      || !programMapMembershipRecord(value.groups) || Object.keys(value.groups).length > LIMITS.maxGroups) return false;
    for (const [groupRef, candidate] of Object.entries(value.groups)) {
      if (!programMapMembershipRecord(candidate) || !shape(candidate, ['ownerId', 'baseSourceToken', 'revisions', 'effective', 'reviews'], ['undo'])) return false;
      const owner = candidate as ProgramLegacyMapMembershipOwner;
      if (!programMapMembershipRecord(owner.revisions)
        || !Object.keys(owner.revisions).length || !Array.isArray(owner.reviews) || !owner.reviews.length || owner.reviews.length > LIMITS.maxReviews
        || new Set(owner.reviews.map(review => review.id)).size !== owner.reviews.length) return false;
      const verified = withProgramLegacyMapMembershipEvidence(originals, groupRef, owner.revisions, evidence => {
      if (owner.ownerId !== evidence.ownerId || owner.baseSourceToken !== evidence.baseSourceToken) return false;
      const effectiveValid = (effective: unknown): effective is ProgramLegacyMapMembershipEffective => programMapMembershipRecord(effective)
        && shape(effective, ['acceptedAbsences']) && evidence.validateAbsences(effective.acceptedAbsences);
      if (!effectiveValid(owner.effective)) return false;
      const applied = new Map<string, ProgramLegacyMapMembershipEffective>();
      for (const review of owner.reviews) {
        if (!programMapMembershipRecord(review) || !shape(review, ['id', 'incomingRevisionId', 'expectedSelection', 'choices', 'status', 'createdAt'])
          || !programMapMembershipId(review.id) || review.id.length > LIMITS.maxRequestIdLength || !programMapMembershipStamp(review.createdAt)
          || !Object.hasOwn(owner.revisions, review.incomingRevisionId) || typeof review.expectedSelection !== 'string'
          || review.expectedSelection.length > LIMITS.maxEvidenceBytes || !effectiveValid(JSON.parse(review.expectedSelection))
          || !programMapMembershipRecord(review.choices) || Object.values(review.choices).some(choice => !['mine', 'incoming'].includes(choice))
          || !['pending', 'deferred', 'applied'].includes(review.status)) return false;
        const compared = evidence.compare(review.incomingRevisionId, JSON.parse(review.expectedSelection).acceptedAbsences);
        if (!compared.ok || !compared.changes.length || Object.keys(review.choices).some(id => !compared.changes.some(change => change.id === id))) return false;
        if (review.status === 'applied') {
          const result = resolveComparedReview(review, compared);
          if (!result || !effectiveValid(result)) return false;
          applied.set(review.id, result);
        }
      }
      if (Object.keys(owner.effective.acceptedAbsences).length
        && ![...applied.values()].some(result => programMapMembershipCanonical(result) === programMapMembershipCanonical(owner.effective))) return false;
      if (owner.undo) {
        if (!programMapMembershipRecord(owner.undo) || !shape(owner.undo, ['reviewId', 'selection']) || !effectiveValid(owner.undo.selection)) return false;
        const review = owner.reviews.find(row => row.id === owner.undo!.reviewId), result = applied.get(owner.undo.reviewId);
        if (!review || !result || review.expectedSelection !== programMapMembershipCanonical(owner.undo.selection)
          || programMapMembershipCanonical(result) !== programMapMembershipCanonical(owner.effective)) return false;
      }
      return true;
      });
      if (!verified.ok || !verified.value) return false;
    }
    return true;
  } catch { return false; }
}

/** Called only on a validated payload; membership exclusion is separate from
 * original affiliation and from an archived personal document. */
export function programLegacyMapMembershipChildRetained(store: ProgramLegacyMapMembershipStore | undefined, flowRef: string) {
  return Object.values(store?.groups ?? {}).some(owner => Object.hasOwn(owner.effective.acceptedAbsences, flowRef));
}
