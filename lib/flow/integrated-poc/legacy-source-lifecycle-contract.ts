import { getPersonalWorkspacePocFlowItemFieldOwnership, toPersonalWorkspacePocFlowItemRef, type PersonalWorkspacePocAuthoredFlow, type PersonalWorkspacePocFlow } from '../personal-workspace-poc-contract';
import type { PersonalWorkspacePocAuthoringItemContext } from '../personal-workspace-poc-source-attributes-contract';
import { isPersonalWorkspacePocAuthoredSourceFlow } from '../personal-workspace-poc-state';
import { materializePersonalWorkspacePocAuthoring } from '../personal-workspace-poc-authoring';
import { buildPersonalWorkspacePocSourceReadIndex, readPersonalWorkspacePocTaskSourceContext } from '../personal-workspace-poc-source-attributes';
import { programLegacyMapRevisionId, validateProgramLegacyMapRevision, type ProgramLegacyStructuredSource } from './legacy-map-source';
import { readProgramMapRevisionRecurrences } from './legacy-map-recurrence';
import { programStructuredItemContext, type ProgramLegacyItemContext } from './legacy-source-context';

/** Program-only owner. Original model/authoredFlows/sourceCandidateStore are
 * immutable inputs; no public version or operating source writer is involved. */
export type ProgramLegacySourceSelection = {
  flowRevisionId: string;
  itemRevisions: Record<string, string>;
  retainedItemRefs: string[];
};
export type ProgramLegacySourceChange = { id: string; itemRef: string | null; kind: 'flow' | 'modified' | 'added' | 'removed' };
export type ProgramLegacySourceReview = {
  id: string; incomingRevisionId: string; expectedSelection: string;
  choices: Record<string, 'mine' | 'incoming'>; status: 'pending' | 'deferred' | 'applied'; createdAt: string;
};
export type ProgramLegacySourceOwner = {
  flowRef: string; baseRevisionId: string;
  revisions: Record<string, PersonalWorkspacePocAuthoredFlow>;
  /** Mutually exclusive structured evidence owner; never authored raw/lineage. */
  structured?: ProgramLegacyStructuredSource;
  effective: ProgramLegacySourceSelection;
  reviews: ProgramLegacySourceReview[];
  undo?: { reviewId: string; selection: ProgramLegacySourceSelection };
  /** Explicit user linkage, never inferred from title or order. Authentic
   * materializer revisions remain unchanged; aliases exist only in reads. */
  mapping?: { requestId: string; confirmedAt: string; sourceToken: string; itemRefs: Record<string, string> };
  partialMapping?: ProgramLegacyPartialMapping;
  /** Explicitly applied kind changes reserve the ordinary canonical ID forever.
   * Series metadata uses another ID; private execution records never become occurrences. */
  executionHandoffs?: { version: 1; itemRefs: string[] };
  /** Explicit first handoff, pinned to actual selected evidence. Reading an old
   * owner without this receipt cannot turn its private task into a series. */
  mapExecution?: { version: 1; items: Record<string, { revisionId: string; requestId: string; confirmedAt: string }> };
};
export type ProgramLegacyPartialMapping = {
  version: 1; requestId: string; confirmedAt: string; sourceToken: string;
  rowChoices: Record<string, { kind: 'existing'; itemRef: string } | { kind: 'new' } | { kind: 'source-only' }>;
  unmatchedItems: Record<string, 'keep-personal' | 'archive-execution'>;
};
export function programLegacyArchivedSourceItem(owner: ProgramLegacySourceOwner | undefined, ref: string) {
  return owner?.partialMapping?.unmatchedItems[ref] === 'archive-execution';
}
export function programLegacyPartialItemRef(target: PersonalWorkspacePocFlow, nativeRef: string) {
  // The complete native identity is encoded, not reduced to an item title or index.
  return toPersonalWorkspacePocFlowItemRef(target.savedCopyId, target.flowId, `program-mapped:${nativeRef}`);
}
export type ProgramLegacySourceLifecycleStore = { version: 1; owners: Record<string, ProgramLegacySourceOwner> };
/** Previously reviewed Map blocks remain readable when new structured evidence
 * makes that review stale. This never makes their execution capability ordinary. */
export function programLegacyKeepsReviewedMapBlocks(flow: PersonalWorkspacePocFlow, input: { sourceLifecycle?: ProgramLegacySourceLifecycleStore; mapReview?: { groups: Record<string, unknown> } }): boolean {
  const group = flow.presentation?.mapGroup;
  return !!group && !!input.mapReview?.groups[group.groupRef] && Object.values(input.sourceLifecycle?.owners ?? {}).some(owner =>
    owner.structured?.revisions[owner.baseRevisionId]?.flow.presentation?.mapGroup?.groupRef === group.groupRef);
}
export const sourceCanonical = (value: unknown): string => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry)
  ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const keys = (value: object, required: string[], optional: string[] = []) => required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => [...required, ...optional].includes(key));
const id = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= 1200 && !['__proto__', 'constructor', 'prototype'].includes(value);
const stamp = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/u.test(value) && Number.isFinite(Date.parse(value));

/** Verify typed row identity through the original materializer and its strict
 * source reader. Neither item title nor array order is used to infer identity. */
export function programLegacyAuthenticSource(flow: unknown) {
  if (!isPersonalWorkspacePocAuthoredSourceFlow(flow) || !flow.authoring.parsedItems || !flow.authoring.sourceLineItemIdentityMap) return null;
  const author = flow.authoring;
  const made = materializePersonalWorkspacePocAuthoring({ handoffId: author.handoffId, documentId: author.documentId, revisionId: author.revisionId,
    rawText: author.rawText, committedAt: author.committedAt, ...(author.templateId ? { templateId: author.templateId as NonNullable<Parameters<typeof materializePersonalWorkspacePocAuthoring>[0]['templateId']> } : {}) });
  if (!made.ok || sourceCanonical(made.flow.authoring.sourceLineItemIdentityMap) !== sourceCanonical(author.sourceLineItemIdentityMap)
    || sourceCanonical(made.flow.items) !== sourceCanonical(flow.items)) return null;
  const index = buildPersonalWorkspacePocSourceReadIndex({ baseModel: { version: 1, flows: [flow] } });
  if (!index.ok) return null;
  const context = readPersonalWorkspacePocTaskSourceContext(index.index, flow);
  if (!context.ok || context.itemContextByRef.size !== flow.items.length) return null;
  return { flow, contexts: new Map(context.itemContextByRef) };
}

export function programLegacyRevisionRefs(owner: ProgramLegacySourceOwner, revisionId: string) {
  return readRevision(owner, revisionId)?.flow.items.map(item => item.ref) ?? [];
}
export function programLegacyStructuredItemEvidence(owner: ProgramLegacySourceOwner, revisionId: string | undefined, itemRef: string) {
  const revision = revisionId && owner.structured?.revisions[revisionId];
  if (!revision) return undefined;
  const item = revision.flow.items.find(item => item.ref === itemRef);
  if (!item) return undefined;
  if (revision.kind === 'saved-map-projection') return { kind: revision.kind, item };
  const child = revision.persistence.childFlows.find(child => child.flowId === revision.flow.flowId && child.slug === revision.flow.sourceSlug);
  return { kind: revision.kind, step: child?.steps.find(step => step.stepId === item.itemId),
    sourceItem: revision.bundles.find(bundle => bundle.flow.id === revision.flow.flowId)?.items.find(row => row.id === item.itemId),
    sourceTitle: child?.sourceTitle, sourceUrl: child?.sourceUrl, sourceCheckedAt: child?.sourceCheckedAt };
}
export function programLegacySourceExecutionHandoff(owner: ProgramLegacySourceOwner | undefined, ref: string): boolean {
  if (!owner?.executionHandoffs?.itemRefs.includes(ref)) return false;
  const activation = owner.mapExecution?.items[ref];
  if (activation && owner.structured) {
    const original = owner.structured.revisions[owner.baseRevisionId]?.flow;
    const revision = owner.structured.revisions[activation.revisionId];
    const read = original && revision && readProgramMapRevisionRecurrences(revision, original);
    return !!read && read.ok && read.contexts.has(ref);
  }
  // Both kinds must be authenticated revisions of this exact aliased tuple,
  // and the candidate comparison must actually have contained that change.
  return owner.reviews.some(review => {
    const previous = projectProgramLegacySource(owner, JSON.parse(review.expectedSelection));
    const incoming = readRevision(owner, review.incomingRevisionId);
    const a = previous?.contexts.get(ref), b = incoming?.contexts.get(ref);
    return !!a && !!b && !!a.attributes.recurrence !== !!b.attributes.recurrence;
  });
}
function readRevision(owner: ProgramLegacySourceOwner, revisionId: string) {
  const structured = owner.structured?.revisions[revisionId];
  if (structured) {
    const contexts = new Map<string, ProgramLegacyItemContext>();
    if (owner.mapExecution) {
      const original = owner.structured!.revisions[owner.baseRevisionId]?.flow;
      const read = original && readProgramMapRevisionRecurrences(structured, original);
      if (!read?.ok) return null;
      for (const [ref, context] of read.contexts) if (owner.mapExecution.items[ref]) contexts.set(ref, programStructuredItemContext(context));
    }
    return { flow: structured.flow, contexts };
  }
  const read = programLegacyAuthenticSource(owner.revisions[revisionId]);
  if (!read || (!owner.mapping && !owner.partialMapping)) return read;
  const target = JSON.parse((owner.mapping ?? owner.partialMapping)!.sourceToken) as PersonalWorkspacePocFlow;
  const contexts = new Map<string, ProgramLegacyItemContext>();
  const items = read.flow.items.flatMap(item => {
    const choice = owner.partialMapping?.rowChoices[item.ref];
    if (choice?.kind === 'source-only') return [];
    const ref = choice?.kind === 'existing' ? choice.itemRef : owner.partialMapping ? programLegacyPartialItemRef(target, item.ref)
      : owner.mapping!.itemRefs[item.ref] ?? toPersonalWorkspacePocFlowItemRef(target.savedCopyId, target.flowId, item.itemId);
    contexts.set(ref, read.contexts.get(item.ref)!);
    return [{ ...item, ref, savedCopyId: target.savedCopyId, flowId: target.flowId, itemId: decodeURIComponent(ref.split(':').at(-1)!) }];
  });
  // These are exact old structured items, not fabricated authoring rows. They
  // deliberately have NO typed raw-line context until explicitly linked.
  if (owner.partialMapping && revisionId === owner.baseRevisionId) items.push(...target.items.filter(item => Object.hasOwn(owner.partialMapping!.unmatchedItems, item.ref)));
  if (new Set(items.map(item => item.ref)).size !== items.length) return null;
  return { flow: { ...read.flow, ref: target.ref, savedCopyId: target.savedCopyId, flowId: target.flowId, sourceSlug: target.sourceSlug,
    ...(target.presentation ? { presentation: target.presentation } : {}), items }, contexts };
}

/** A mixed effective source is a read projection, never a fabricated raw text
 * revision. Each selected item's exact authentic revision supplies its context. */
export function projectProgramLegacySource(owner: ProgramLegacySourceOwner, selection = owner.effective) {
  const metadata = readRevision(owner, selection.flowRevisionId)?.flow;
  if (!metadata || !record(selection.itemRevisions) || !Array.isArray(selection.retainedItemRefs)) return null;
  const contexts = new Map<string, ProgramLegacyItemContext>();
  const items: PersonalWorkspacePocFlow['items'][number][] = [];
  const sections = new Map<string, NonNullable<PersonalWorkspacePocFlow['sections']>[number]>();
  const reads = new Map<string, ReturnType<typeof readRevision>>();
  for (const [ref, revisionId] of Object.entries(selection.itemRevisions)) {
    const revision = owner.structured?.revisions[revisionId]?.flow ?? owner.revisions[revisionId];
    if (!revision) return null;
    if (!reads.has(revisionId)) reads.set(revisionId, readRevision(owner, revisionId));
    const read = reads.get(revisionId), item = read?.flow.items.find(row => row.ref === ref), context = read?.contexts.get(ref);
    const preserved = owner.partialMapping && revisionId === owner.baseRevisionId && Object.hasOwn(owner.partialMapping.unmatchedItems, ref);
    if (!item || (!context && !preserved && !owner.structured?.revisions[revisionId])) return null;
    if (item.sectionId) {
      const section = (preserved ? (JSON.parse(owner.partialMapping!.sourceToken) as PersonalWorkspacePocFlow).sections : revision.sections)?.find(row => row.sectionId === item.sectionId);
      if (!section || (sections.has(item.sectionId) && sourceCanonical(sections.get(item.sectionId)) !== sourceCanonical(section))) return null;
      sections.set(item.sectionId, section);
    }
    // A relative item kept from another revision retains THAT revision's
    // anchor derivation, even when the flow-level title/anchor choice differs.
    items.push(context?.attributes.relativeDate && revision.anchorDate !== metadata.anchorDate
      ? { ...item, fieldOwnership: getPersonalWorkspacePocFlowItemFieldOwnership(item, revision.origin, revision) } : item);
    // Retention changes source membership, not the Item's execution kind or
    // canonical metadata identity. Execution readers exclude retained contexts.
    if (context) contexts.set(ref, context);
  }
  // An explicitly connected, empty saved Map can be repaired with actual
  // incoming Steps. It stays non-executable until those additions are chosen.
  const emptySavedMap = owner.structured?.revisions[selection.flowRevisionId]?.kind === 'saved-map-projection';
  if ((!items.length && !emptySavedMap) || new Set(selection.retainedItemRefs).size !== selection.retainedItemRefs.length || selection.retainedItemRefs.some(ref => !items.some(item => item.ref === ref))) return null;
  items.sort((a, b) => a.sourceOrder - b.sourceOrder || a.ref.localeCompare(b.ref));
  // Map group membership/readiness is one original group contract; choosing a
  // single child revision cannot change sibling count or unlock that group.
  const baseGroup = owner.structured?.revisions[owner.baseRevisionId]?.flow.presentation?.mapGroup;
  const flow: PersonalWorkspacePocFlow = { ...metadata, ...(baseGroup ? { presentation: { ...metadata.presentation, mapGroup: baseGroup } } : {}), items, ...(sections.size ? { sections: [...sections.values()] } : {}) };
  if (!sections.size) delete (flow as { sections?: unknown }).sections;
  return { flow, contexts };
}

/** Source facts remain readable for retained private records. Only active
 * execution drops structured Items whose source absence was explicitly accepted. */
export function programLegacyExecutionContexts(owner: ProgramLegacySourceOwner | undefined, contexts: ReadonlyMap<string, ProgramLegacyItemContext>) {
  return new Map([...contexts].filter(([ref]) => !owner?.structured || !owner.effective.retainedItemRefs.includes(ref)));
}

export function programLegacySourceChanges(owner: ProgramLegacySourceOwner, incomingRevisionId: string,
  options: { includeAcknowledgedRemovals?: boolean } = {}): ProgramLegacySourceChange[] {
  const current = projectProgramLegacySource(owner), incoming = readRevision(owner, incomingRevisionId);
  if (!current || !incoming) return [];
  const changes: ProgramLegacySourceChange[] = [];
  const metadata = (flow: PersonalWorkspacePocFlow) => ({ title: flow.title, anchorDate: flow.anchorDate ?? null, discovery: flow.presentation?.discovery ?? null });
  if (sourceCanonical(metadata(current.flow)) !== sourceCanonical(metadata(incoming.flow))) changes.push({ id: 'flow', itemRef: null, kind: 'flow' });
  const mine = new Map(current.flow.items.map(item => [item.ref, item])), theirs = new Map(incoming.flow.items.map(item => [item.ref, item]));
  for (const ref of new Set([...mine.keys(), ...theirs.keys()])) {
    const before = mine.get(ref), after = theirs.get(ref);
    // An unmatched private row from an explicit partial mapping was never a
    // source deletion acknowledgement; keep that separate review contract.
    const retained = owner.effective.retainedItemRefs.includes(ref) && !Object.hasOwn(owner.partialMapping?.unmatchedItems ?? {}, ref);
    // Retained content is private history, not evidence that the source still
    // offers the item. Its acknowledged absence must not open another review.
    // The option exists only to read reviews saved by the earlier comparator.
    if (retained && !after && !options.includeAcknowledgedRemovals) continue;
    const comparable = (item: PersonalWorkspacePocFlow['items'][number]) => { const { fieldOwnership: _owner, ...fields } = item; return fields; };
    // Personal execution activation is not a source-content edit. Existing
    // comparisons retain the exact same change IDs before/after that handoff.
    // Reappearing identical content still needs an explicit source reattachment;
    // accepting it removes retention without replacing private execution IDs.
    if (!retained && before && after && sourceCanonical({ item: comparable(before), context: owner.structured ? undefined : current.contexts.get(ref), structured: programLegacyStructuredItemEvidence(owner, owner.effective.itemRevisions[ref], ref) })
      === sourceCanonical({ item: comparable(after), context: owner.structured ? undefined : incoming.contexts.get(ref), structured: programLegacyStructuredItemEvidence(owner, incomingRevisionId, ref) })) continue;
    changes.push({ id: `item:${ref}`, itemRef: ref, kind: !before ? 'added' : !after ? 'removed' : 'modified' });
  }
  return changes;
}

export function resolveProgramLegacySource(owner: ProgramLegacySourceOwner, review: ProgramLegacySourceReview) {
  if (review.expectedSelection !== sourceCanonical(owner.effective)) return null;
  const changes = programLegacySourceChanges(owner, review.incomingRevisionId);
  // Earlier saved reviews can combine an acknowledged absence with a real new
  // edit. Keep the old choice as evidence, but neither reapply it nor let it
  // block the remaining explicit edits. Arbitrary extra IDs are still invalid.
  const acknowledged = new Set(programLegacySourceChanges(owner, review.incomingRevisionId, { includeAcknowledgedRemovals: true })
    .filter(change => change.kind === 'removed' && !changes.some(active => active.id === change.id)).map(change => change.id));
  if (!changes.length || changes.some(change => !review.choices[change.id])
    || Object.keys(review.choices).some(key => !changes.some(change => change.id === key) && !acknowledged.has(key))) return null;
  const next: ProgramLegacySourceSelection = { ...owner.effective, itemRevisions: { ...owner.effective.itemRevisions }, retainedItemRefs: [...owner.effective.retainedItemRefs] };
  for (const change of changes) {
    if (review.choices[change.id] !== 'incoming') continue;
    if (change.kind === 'flow') next.flowRevisionId = review.incomingRevisionId;
    else if (change.kind === 'removed') { if (!next.retainedItemRefs.includes(change.itemRef!)) next.retainedItemRefs.push(change.itemRef!); }
    else { next.itemRevisions[change.itemRef!] = review.incomingRevisionId; next.retainedItemRefs = next.retainedItemRefs.filter(ref => ref !== change.itemRef); }
  }
  return projectProgramLegacySource(owner, next) ? next : null;
}

export function validateProgramLegacySourceLifecycle(value: unknown, originals: readonly PersonalWorkspacePocFlow[], mappingSources: readonly PersonalWorkspacePocFlow[] = originals): value is ProgramLegacySourceLifecycleStore {
  try {
    if (!record(value) || !keys(value, ['version', 'owners']) || value.version !== 1 || !record(value.owners) || Object.keys(value.owners).length > 200) return false;
    for (const [ref, unknownOwner] of Object.entries(value.owners)) {
      if (!record(unknownOwner) || !keys(unknownOwner, ['flowRef', 'baseRevisionId', 'revisions', 'effective', 'reviews'], ['undo', 'mapping', 'partialMapping', 'executionHandoffs', 'structured', 'mapExecution'])) return false;
      const owner = unknownOwner as ProgramLegacySourceOwner, original = originals.find(flow => flow.ref === ref);
      if (owner.flowRef !== ref || !id(owner.baseRevisionId) || !record(owner.revisions) || !Array.isArray(owner.reviews) || owner.reviews.length > 80
        || Object.keys(owner.revisions).length > 81 || !original || (!owner.structured && !owner.mapping && !owner.partialMapping && sourceCanonical(owner.revisions[owner.baseRevisionId]) !== sourceCanonical(original))) return false;
      if (owner.structured) {
        const structured = owner.structured;
        if (!record(structured) || !keys(structured, ['version', 'revisions', 'requestId', 'confirmedAt', 'sourceToken']) || structured.version !== 1 || !record(structured.revisions)
          || !id(structured.requestId) || !stamp(structured.confirmedAt) || structured.sourceToken !== sourceCanonical(original)
          || !Object.keys(structured.revisions).length || Object.keys(structured.revisions).length > 81 || Object.keys(owner.revisions).length
          || owner.mapping || owner.partialMapping || (owner.executionHandoffs && !owner.mapExecution) || structured.revisions[owner.baseRevisionId]?.kind !== 'saved-map-projection') return false;
        for (const [revisionId, revision] of Object.entries(structured.revisions)) {
          if (!validateProgramLegacyMapRevision(revision, original) || programLegacyMapRevisionId(revision) !== revisionId
            || revision.kind === 'saved-map-projection' && revisionId !== owner.baseRevisionId) return false;
        }
      }
      if (owner.mapExecution) {
        const activation = owner.mapExecution;
        if (!owner.structured || !record(activation) || !keys(activation, ['version', 'items']) || activation.version !== 1
          || !record(activation.items) || !Object.keys(activation.items).length || Object.keys(activation.items).length > 1200) return false;
        for (const [itemRef, receipt] of Object.entries(activation.items)) {
          if (!id(itemRef) || !record(receipt) || !keys(receipt, ['revisionId', 'requestId', 'confirmedAt'])
            || !id(receipt.revisionId) || !id(receipt.requestId) || !stamp(receipt.confirmedAt)
            || !owner.executionHandoffs?.itemRefs.includes(itemRef) || !programLegacySourceExecutionHandoff(owner, itemRef)) return false;
        }
      }
      if (owner.mapping && owner.partialMapping) return false;
      if (owner.partialMapping) {
        const m = owner.partialMapping, target = mappingSources.find(flow => flow.ref === ref), base = owner.revisions[owner.baseRevisionId];
        if (!record(m) || !keys(m, ['version', 'requestId', 'confirmedAt', 'sourceToken', 'rowChoices', 'unmatchedItems']) || m.version !== 1
          || !id(m.requestId) || !stamp(m.confirmedAt) || !target || m.sourceToken !== sourceCanonical(target) || !base || !('authoring' in target)
          || base.authoring.rawText !== (target as PersonalWorkspacePocAuthoredFlow).authoring.rawText || !record(m.rowChoices) || !record(m.unmatchedItems)
          || Object.keys(m.rowChoices).length !== base.items.length || base.items.some(item => !Object.hasOwn(m.rowChoices, item.ref))) return false;
        const selected: string[] = [], emitted: string[] = [];
        for (const [nativeRef, choice] of Object.entries(m.rowChoices)) {
          if (!record(choice) || !['existing', 'new', 'source-only'].includes(choice.kind)) return false;
          if (choice.kind === 'existing') {
            if (!keys(choice, ['kind', 'itemRef']) || !target.items.some(item => item.ref === choice.itemRef)) return false;
            selected.push(choice.itemRef); emitted.push(choice.itemRef);
          } else {
            if (!keys(choice, ['kind'])) return false;
            if (choice.kind === 'new') emitted.push(programLegacyPartialItemRef(target, nativeRef));
          }
        }
        const unmatched = target.items.filter(item => !selected.includes(item.ref)).map(item => item.ref);
        if (new Set(selected).size !== selected.length || Object.keys(m.unmatchedItems).length !== unmatched.length
          || unmatched.some(ref => !['keep-personal', 'archive-execution'].includes(m.unmatchedItems[ref]))
          || Object.keys(m.unmatchedItems).some(ref => !unmatched.includes(ref))
          || emitted.some(ref => !selected.includes(ref) && target.items.some(item => item.ref === ref))
          || new Set([...emitted, ...unmatched]).size !== emitted.length + unmatched.length || !emitted.length && !unmatched.length) return false;
      }
      if (owner.mapping) {
        const mapping = owner.mapping, target = mappingSources.find(flow => flow.ref === ref), base = owner.revisions[owner.baseRevisionId];
        if (!record(mapping) || !keys(mapping, ['requestId', 'confirmedAt', 'sourceToken', 'itemRefs']) || !id(mapping.requestId) || !stamp(mapping.confirmedAt)
          || !target || mapping.sourceToken !== sourceCanonical(target) || !record(mapping.itemRefs) || !base
          || !('authoring' in target) || base.authoring.rawText !== (target as PersonalWorkspacePocAuthoredFlow).authoring.rawText
          || Object.keys(mapping.itemRefs).length !== base.items.length || base.items.length !== target.items.length
          || base.items.some(item => !id(mapping.itemRefs[item.ref])) || new Set(Object.values(mapping.itemRefs)).size !== target.items.length
          || Object.values(mapping.itemRefs).some(itemRef => !target.items.some(item => item.ref === itemRef))) return false;
      }
      for (const [revisionId, flow] of Object.entries(owner.revisions)) {
        if (!id(revisionId) || !programLegacyAuthenticSource(flow) || flow.authoring.revisionId !== revisionId || (!owner.mapping && !owner.partialMapping && flow.ref !== ref)
          || flow.authoring.handoffId !== (original as PersonalWorkspacePocAuthoredFlow).authoring.handoffId
          || flow.authoring.documentId !== (original as PersonalWorkspacePocAuthoredFlow).authoring.documentId) return false;
      }
      if (owner.executionHandoffs) {
        const handoffs = owner.executionHandoffs;
        if (!record(handoffs) || !keys(handoffs, ['version', 'itemRefs']) || handoffs.version !== 1 || !Array.isArray(handoffs.itemRefs)
          || handoffs.itemRefs.length > 1200 || new Set(handoffs.itemRefs).size !== handoffs.itemRefs.length
          || handoffs.itemRefs.some(ref => !id(ref) || !programLegacySourceExecutionHandoff(owner, ref))) return false;
      }
      const selection = (entry: unknown) => record(entry) && keys(entry, ['flowRevisionId', 'itemRevisions', 'retainedItemRefs'])
        && id(entry.flowRevisionId) && record(entry.itemRevisions) && Object.entries(entry.itemRevisions).every(([itemRef, revisionId]) => id(itemRef) && id(revisionId))
        && !!projectProgramLegacySource(owner, entry as ProgramLegacySourceSelection);
      if (!selection(owner.effective) || new Set(owner.reviews.map(review => review.id)).size !== owner.reviews.length) return false;
      for (const review of owner.reviews) {
        if (!record(review) || !keys(review, ['id', 'incomingRevisionId', 'expectedSelection', 'choices', 'status', 'createdAt']) || !id(review.id)
          || !(owner.structured?.revisions[review.incomingRevisionId] ?? owner.revisions[review.incomingRevisionId]) || typeof review.expectedSelection !== 'string' || review.expectedSelection.length > 1_000_000
          || !record(review.choices) || Object.values(review.choices).some(choice => !['mine', 'incoming'].includes(choice))
          || !['pending', 'deferred', 'applied'].includes(review.status) || !stamp(review.createdAt)) return false;
        const previous = JSON.parse(review.expectedSelection);
        if (!selection(previous)) return false;
        // Old persisted reviews may contain a repeated removal that the new
        // comparator no longer offers. Preserve/read that evidence without a
        // migration, resave, or making its obsolete choice actionable again.
        const changes = programLegacySourceChanges({ ...owner, effective: previous }, review.incomingRevisionId, { includeAcknowledgedRemovals: true });
        if (!changes.length || Object.keys(review.choices).some(key => !changes.some(change => change.id === key))) return false;
      }
      if (owner.undo && (!record(owner.undo) || !keys(owner.undo, ['reviewId', 'selection']) || !owner.reviews.some(review => review.id === owner.undo!.reviewId && review.status === 'applied') || !selection(owner.undo.selection))) return false;
    }
    return true;
  } catch { return false; }
}
