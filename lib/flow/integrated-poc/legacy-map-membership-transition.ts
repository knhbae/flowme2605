import { programClone, programFailure, programResult, type ProgramData, type ProgramPrivateSpace } from './contract';
import { programSame } from './controller';
import { validateProgramData } from './program-data';
import { inspectProgramLegacySnapshotPayload, type ProgramLegacySnapshotPayload } from './legacy-snapshot';
import { PROGRAM_LEGACY_MAP_MEMBERSHIP_LIMITS as LIMITS, readProgramLegacyMapMembershipBase, readProgramLegacyCurrentMapMembership,
  compareProgramLegacyMapMembership } from './legacy-map-membership';
import { programMapMembershipCanonical as canonical, programMapMembershipRecord as record, programMapMembershipId as id,
  programMapMembershipStamp as stamp, programLegacyMapMembershipSelection, resolveProgramLegacyMapMembershipReview,
  programLegacyMapMembershipReviewChanges, type ProgramLegacyMapMembershipOwner, type ProgramLegacyMapMembershipStore } from './legacy-map-membership-state';

export type ProgramLegacyMapMembershipAction =
  | { type: 'stage'; groupRef: string; requestId: string; expectedSourceToken: string; now: string }
  | { type: 'choice'; groupRef: string; reviewId: string; changeId: string; choice: 'mine' | 'incoming' | null; now: string }
  | { type: 'apply'; groupRef: string; reviewId: string; now: string; choices?: Record<string, 'mine' | 'incoming'> }
  | { type: 'defer'; groupRef: string; reviewId: string; now: string }
  | { type: 'undo'; groupRef: string; now: string };

/** Read source membership without rebasing or rewriting any personal field. */
export function readProgramLegacyMapMembership(data: ProgramData, actorId: string, groupRef: string) {
  const fail = (reason: string) => ({ ok: false as const, reason });
  if (!validateProgramData(data)) return fail('invalid');
  if (data.activeActorId !== actorId || !data.spaces[actorId]) return fail('forbidden');
  const space = data.spaces[actorId];
  if (!space.legacySnapshot) return fail('missing');
  const checked = inspectProgramLegacySnapshotPayload(JSON.parse(space.legacySnapshot.raw));
  if (!checked.ok) return fail('invalid');
  const base = readProgramLegacyMapMembershipBase(checked.payload.model.flows, groupRef);
  if (!base.ok) return base;
  const owner = checked.payload.mapMembership?.groups[groupRef] ?? null;
  const absences = owner?.effective.acceptedAbsences ?? {};
  return { ok: true as const, groupRef, ownerId: base.ownerId, title: base.flows[0].presentation!.mapGroup!.title,
    sourceToken: base.sourceToken, owner, payload: checked.payload, originalChildren: base.flows,
    effectiveChildren: base.flows.filter(flow => !Object.hasOwn(absences, flow.ref)), retainedChildren: base.flows.filter(flow => Object.hasOwn(absences, flow.ref)),
    selectionToken: canonical(owner?.effective ?? { acceptedAbsences: {} }), expectedSpace: programClone(space) };
}

/** Candidate-only transition. Supplied choices on apply are evaluated and
 * recorded atomically; radio changes and cancellation need no storage action. */
export function transitionProgramLegacyMapMembershipPayload(before: ProgramLegacySnapshotPayload, action: ProgramLegacyMapMembershipAction) {
  const fail = (reason: string) => ({ ok: false as const, reason, payload: before });
  try {
    if (!inspectProgramLegacySnapshotPayload(before).ok || !record(action) || !stamp(action.now) || !id(action.groupRef)
      || !['stage', 'choice', 'apply', 'defer', 'undo'].includes(action.type)) return fail('invalid-membership-action');
    const allowed = ['type', 'groupRef', 'now', ...(action.type === 'stage' ? ['requestId', 'expectedSourceToken']
      : action.type === 'choice' ? ['reviewId', 'changeId', 'choice'] : action.type === 'apply' ? ['reviewId', 'choices']
      : action.type === 'defer' ? ['reviewId'] : [])];
    if (Object.keys(action).some(key => !allowed.includes(key))) return fail('invalid-membership-action');
    const base = readProgramLegacyMapMembershipBase(before.model.flows, action.groupRef);
    if (!base.ok) return fail(base.reason);
    const old = before.mapMembership?.groups[action.groupRef];
    const owner: ProgramLegacyMapMembershipOwner = old ? programClone(old) : {
      ownerId: base.ownerId, baseSourceToken: base.sourceToken, revisions: {}, effective: { acceptedAbsences: {} }, reviews: [],
    };
    if (action.type === 'stage') {
      if (!id(action.requestId) || action.requestId.length > LIMITS.maxRequestIdLength) return fail('invalid-request-id');
      if (action.expectedSourceToken !== base.sourceToken) return fail('source-conflict');
      const previous = owner.reviews.find(review => review.id === action.requestId);
      const incoming = readProgramLegacyCurrentMapMembership(before.model.flows, action.groupRef, previous?.createdAt ?? action.now);
      if (!incoming.ok) return fail(incoming.reason);
      if (previous) return previous.incomingRevisionId === incoming.revisionId && canonical(owner.revisions[incoming.revisionId]) === canonical(incoming.revision)
        ? { ok: true as const, changed: false, payload: before, reviewId: previous.id } : fail('source-conflict');
      if (owner.reviews.length >= LIMITS.maxReviews || Object.keys(owner.revisions).length >= LIMITS.maxRevisions
        || !old && Object.keys(before.mapMembership?.groups ?? {}).length >= LIMITS.maxGroups) return fail('limit');
      if (owner.revisions[incoming.revisionId] && canonical(owner.revisions[incoming.revisionId]) !== canonical(incoming.revision)) return fail('source-conflict');
      owner.revisions[incoming.revisionId] = incoming.revision;
      const compared = compareProgramLegacyMapMembership(before.model.flows, incoming.revision, programLegacyMapMembershipSelection(owner));
      if (!compared.ok) return fail(compared.reason);
      if (!compared.changes.length) return fail('no-source-change');
      owner.reviews.push({ id: action.requestId, incomingRevisionId: incoming.revisionId, expectedSelection: canonical(owner.effective),
        choices: {}, status: 'pending', createdAt: action.now });
    } else {
      if (!old) return fail('missing-membership-owner');
      if (action.type === 'undo') {
        if (!owner.undo) return fail('missing-membership-undo');
        const review = owner.reviews.find(review => review.id === owner.undo!.reviewId)!;
        owner.effective = owner.undo.selection; review.status = 'pending'; delete owner.undo;
      } else {
        const review = owner.reviews.find(review => review.id === action.reviewId);
        if (!review) return fail('missing-membership-review');
        if (review.status === 'applied') return fail('source-conflict');
        if (review.expectedSelection !== canonical(owner.effective)) return fail('source-conflict');
        const compared = programLegacyMapMembershipReviewChanges(owner, before.model.flows, review);
        if (!compared.ok) return fail(compared.reason);
        if (action.type === 'choice') {
          if (!compared.changes.some(change => change.id === action.changeId) || ![null, 'mine', 'incoming'].includes(action.choice)) return fail('invalid-membership-choice');
          if (action.choice === null) delete review.choices[action.changeId]; else review.choices[action.changeId] = action.choice;
          review.status = 'pending';
        } else if (action.type === 'defer') review.status = 'deferred';
        else {
          if (action.choices !== undefined) {
            if (!record(action.choices) || Object.values(action.choices).some(choice => !['mine', 'incoming'].includes(choice))) return fail('invalid-membership-choice');
            review.choices = programClone(action.choices);
          }
          if (Object.keys(review.choices).some(key => !compared.changes.some(change => change.id === key))) return fail('invalid-membership-choice');
          if (compared.changes.some(change => !review.choices[change.id])) return fail('missing-choice');
          const resolved = resolveProgramLegacyMapMembershipReview(owner, before.model.flows, review);
          if (!resolved) return fail('invalid-membership-selection');
          // Keeping every current connection is not an acceptance receipt or
          // an Undo entry. Even a previously saved review must remain byte-exact.
          if (canonical(resolved) === canonical(owner.effective)) return { ok: true as const, changed: false, payload: before, reviewId: review.id };
          owner.undo = { reviewId: review.id, selection: owner.effective }; owner.effective = resolved; review.status = 'applied';
        }
      }
    }
    const mapMembership: ProgramLegacyMapMembershipStore = { version: 1, groups: { ...before.mapMembership?.groups, [action.groupRef]: owner } };
    const payload = { ...before, mapMembership };
    if (canonical(mapMembership) === canonical(before.mapMembership)) return { ok: true as const, changed: false, payload: before,
      reviewId: action.type === 'stage' ? action.requestId : 'reviewId' in action ? action.reviewId : '' };
    if (!inspectProgramLegacySnapshotPayload(payload).ok) return fail('invalid-membership-result');
    return { ok: true as const, changed: true, payload, reviewId: action.type === 'stage' ? action.requestId : 'reviewId' in action ? action.reviewId : '' };
  } catch { return fail('invalid-membership-action'); }
}

/** ONE Program mutation, using the existing controller's CAS/store/Undo owner.
 * This source-only action changes no source model, private shadow state, text,
 * binding, calendar record, or archive field; no reconciliation is necessary. */
export function applyProgramLegacyMapMembershipAction(data: ProgramData, input: { actorId: string; expectedSpace: ProgramPrivateSpace; action: ProgramLegacyMapMembershipAction }) {
  if (!validateProgramData(data)) return programFailure(data, 'invalid');
  if (data.activeActorId !== input.actorId || !data.spaces[input.actorId]) return programFailure(data, 'forbidden');
  const space = data.spaces[input.actorId];
  if (!programSame(space, input.expectedSpace)) return programFailure(data, 'conflict');
  if (!space.legacySnapshot) return programFailure(data, 'missing');
  const result = transitionProgramLegacyMapMembershipPayload(JSON.parse(space.legacySnapshot.raw), input.action);
  if (!result.ok) return { ...programFailure(data, result.reason === 'source-conflict' ? 'conflict' : result.reason === 'limit' ? 'limit' : 'unresolved'), membershipReason: result.reason };
  if (!result.changed) return programResult(data, data, result.reviewId);
  const next = programClone(data);
  next.spaces[input.actorId].legacySnapshot!.raw = JSON.stringify(result.payload);
  return validateProgramData(next) ? programResult(data, next, result.reviewId) : programFailure(data, 'invalid');
}

type MembershipStage = Extract<ProgramLegacyMapMembershipAction, { type: 'stage' }>;

/** A disposable comparison, not a store operation. Callers keep the returned
 * data in local component state and discard it on close/Escape. */
export function previewProgramLegacyMapMembership(data: ProgramData, input: Omit<MembershipStage, 'type'> & { actorId: string; type?: 'stage' }) {
  const { actorId, type: _type, ...stage } = input;
  if (data.activeActorId !== actorId || !data.spaces[actorId]) return programFailure(data, 'forbidden');
  return applyProgramLegacyMapMembershipAction(data, { actorId, expectedSpace: data.spaces[actorId], action: { ...stage, type: 'stage' } });
}

/** Rebuild the exact comparison against the live source and commit its evidence
 * and choices as ONE Program result. Failure never leaks the staged data. */
export function applyProgramLegacyMapMembershipPreview(data: ProgramData, input: {
  actorId: string; expectedSpace: ProgramPrivateSpace; stage: MembershipStage;
  choices: Record<string, 'mine' | 'incoming'>; expectedPreview: ProgramData;
}) {
  const staged = applyProgramLegacyMapMembershipAction(data, { actorId: input.actorId, expectedSpace: input.expectedSpace, action: input.stage });
  if (!staged.ok) return 'membershipReason' in staged && staged.membershipReason === 'no-source-change'
    ? { ...programFailure(data, 'conflict'), membershipReason: 'source-conflict' } : staged;
  if (!programSame(staged.data.spaces[input.actorId], input.expectedPreview?.spaces?.[input.actorId]))
    return { ...programFailure(data, 'conflict'), membershipReason: 'source-conflict' };
  const applied = applyProgramLegacyMapMembershipAction(staged.data, { actorId: input.actorId,
    expectedSpace: staged.data.spaces[input.actorId], action: { type: 'apply', groupRef: input.stage.groupRef,
      reviewId: input.stage.requestId, choices: input.choices, now: input.stage.now } });
  if (!applied.ok) return { ...applied, data };
  return programResult(data, applied.changed ? applied.data : data, applied.result);
}
