import type { AlphaAccount, AlphaReferenceContext } from '../alpha-persistence/contract';
import { canonicalJson, parseAlphaJson } from '../alpha-persistence/json';
import { isAccountForOwner } from '../alpha-auth/account-access';
import type { ProgramLegacySnapshotPayload } from '../legacy-snapshot';

/** M3 execution edits are not a source-import/source-update authorization.
 * These are the immutable inputs identified by legacy-source-lifecycle-contract.
 * Source lifecycle contains raw/structured revision evidence and is frozen until
 * its separate M4/M6 handoff is approved. Personal plan/review/membership layers
 * remain editable under the existing full-domain validator. */
export const ALPHA_M3_IMMUTABLE_SOURCE_FIELDS = Object.freeze(['model', 'sourceCandidateStore', 'sourceLifecycle'] as const);
const immutableState = ['workspaceId', 'version', 'authoredFlows', 'authoringReceipts', 'quickConversionReceipts'] as const;
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
function fieldSame(a: object, b: object, key: string) {
  const av = a as Record<string, unknown>, bv = b as Record<string, unknown>;
  return Object.hasOwn(av, key) === Object.hasOwn(bv, key) && (!Object.hasOwn(av, key) || same(av[key], bv[key]));
}
export function preservesAlphaPrivateSources(before: AlphaAccount, after: AlphaAccount, references?: AlphaReferenceContext): boolean {
  try {
    if (!isAccountForOwner(before, before.ownerId, references) || !isAccountForOwner(after, before.ownerId, references)
      || !same(before.source, after.source)) return false;
    const oldSnapshot = before.space.legacySnapshot, nextSnapshot = after.space.legacySnapshot;
    if (oldSnapshot === null || nextSnapshot === null) {
      if (oldSnapshot !== nextSnapshot) return false; // No implicit first import or source deletion.
    } else {
      if (oldSnapshot.workspaceId !== nextSnapshot.workspaceId) return false;
      const a = parseAlphaJson(oldSnapshot.raw) as ProgramLegacySnapshotPayload, b = parseAlphaJson(nextSnapshot.raw) as ProgramLegacySnapshotPayload;
      if (ALPHA_M3_IMMUTABLE_SOURCE_FIELDS.some(key => !fieldSame(a, b, key)) || immutableState.some(key => !fieldSame(a.state, b.state, key))) return false;
      // A newly written legacy undo snapshot cannot smuggle an authoring import
      // into a later execution Undo. Existing historical evidence stays intact.
      if (b.state.undo && !fieldSame(a.state, b.state, 'undo')) {
        if (immutableState.filter(key => key !== 'version').some(key => !fieldSame(a.state, b.state.undo!.snapshot, key))) return false;
        if (b.state.undo.storageCompanion) return false;
      }
    }
    const oldBindings = new Map(before.space.savedBindings.map(binding => [binding.flowRef, binding]));
    const nextBindings = new Map(after.space.savedBindings.map(binding => [binding.flowRef, binding]));
    for (const binding of after.space.savedBindings) {
      const prior = oldBindings.get(binding.flowRef);
      if (!prior || ['savedCopyId', 'flowId', 'flowRef', 'documentId'].some(key => !fieldSame(prior, binding, key))
        || !same(prior.itemLines, binding.itemLines)) return false;
      // sourceRevision is a derived identifier for the EFFECTIVE projected Flow:
      // legitimate personal overlays can change it without changing source input.
    }
    for (const binding of before.space.savedBindings) if (!nextBindings.has(binding.flowRef)
      && [...after.space.text.documents, ...after.space.text.flows].some(doc => doc.id === binding.documentId)) return false;
    return true;
  } catch { return false; }
}
