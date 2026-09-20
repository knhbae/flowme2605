/* K1-B: disposable editor ownership and scoped PoC persistence, not a stored schema. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => require('./workspace-checkpoint.js'), () => require('./personal-plan-context.js'));
  else root.FlowPocPlanItemSession = factory(() => root.FlowPocWorkspaceCheckpoint, () => root.FlowPocPersonalPlanContext);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (loadCheckpoint, loadPersonalPlan) {
  'use strict';

  const instances = new Map();
  function createForWorkspace(workspaceName) {
    if (workspaceName !== 'legacy-v1' && workspaceName !== 'checkpoint-v2') throw new Error('unsupported-workspace-pair');
    if (!instances.has(workspaceName)) instances.set(workspaceName, createInstance(workspaceName));
    return instances.get(workspaceName);
  }

  function createInstance(WORKSPACE_PAIR) {
  const checkpointWorkspace = WORKSPACE_PAIR === 'checkpoint-v2';
  const VERSION = 1;
  const LEGACY_STORAGE_KEY = 'flow:poc:personal-workspace:v1:standalone-integrated';
  const LEGACY_RECOVERY_KEY = 'flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v1';
  const STORAGE_KEY = checkpointWorkspace ? 'flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2' : LEGACY_STORAGE_KEY;
  const RECOVERY_VERSION = 1;
  const PERSONAL_PLAN_RECOVERY_VERSION = 2;
  const PERSONAL_PLAN_DRAFT_CONTRACT = 'flowme-standalone-personal-plan-draft-v1';
  const SOURCE_PLAN_RECOVERY_VERSION = 3;
  const SOURCE_PLAN_DRAFT_CONTRACT = 'flowme-standalone-source-bound-personal-plan-draft-v1';
  const STRUCTURE_PLAN_RECOVERY_VERSION = 4;
  const STRUCTURE_PLAN_DRAFT_CONTRACT = 'flowme-standalone-source-bound-personal-plan-draft-v2';
  const SOURCE_STORAGE_KEY = 'flow:poc:personal-workspace:v1:source-candidates';
  const CAPTURED_SOURCE_BOUNDARY = 'captured-source-bound';
  // E01–15 binds the checkpoint, NOT the separately stored source-candidate read.
  // This is an output fact, never a caller-supplied permission or sourceReady flag.
  const SOURCE_BOUNDARY = 'not-bound';
  const RECOVERY_KEY = checkpointWorkspace ? 'flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2' : LEGACY_RECOVERY_KEY;
  const CLOSE_REASONS = Object.freeze(['cancel', 'back', 'x', 'backdrop', 'escape', 'browser-back']);
  // Only write dispatch/outcome consumption has a replay ledger. Close/draft transitions are pure.
  const dispatchedSessions = new WeakSet();
  const issuedOutcomes = new WeakMap();
  const attemptValidators = new WeakMap();
  const verifiedRecoveries = new WeakSet();
  const ownedSessions = new WeakSet();
  const personalBindings = new WeakMap();
  const invalidatedSourceBindings = new WeakMap();
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

  function copyData(value) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (Array.isArray(value)) return Object.freeze(value.map(copyData));
    if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      return Object.freeze(Object.fromEntries(Object.keys(value).map(key => [key, copyData(value[key])])));
    }
    throw new Error('invalid-editor-data');
  }

  // New drafts are dictionaries, not the legacy items array. Check descriptors
  // before copying so a rejected input cannot run a getter/toJSON or lose fields.
  function copyPersonalData(value, seen) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (!value || typeof value !== 'object') throw new Error('invalid-personal-plan-data');
    const visited = seen || new Set();
    if (visited.has(value)) throw new Error('cyclic-personal-plan-data');
    const proto = Object.getPrototypeOf(value);
    const nativePrototype = (prototype, name) => {
      if (!prototype || Object.getOwnPropertyDescriptor(prototype, 'toJSON')) return false;
      const ctor = Object.getOwnPropertyDescriptor(prototype, 'constructor');
      if (!ctor || !own(ctor, 'value') || typeof ctor.value !== 'function'
        || Function.prototype.toString.call(ctor.value) !== 'function ' + name + '() { [native code] }') return false;
      const descriptor = Object.getOwnPropertyDescriptor(ctor.value, 'prototype');
      return Boolean(descriptor && own(descriptor, 'value') && descriptor.value === prototype);
    };
    const plainPrototype = prototype => prototype === null
      || Object.getPrototypeOf(prototype) === null && nativePrototype(prototype, 'Object');
    if (Array.isArray(value) ? !nativePrototype(proto, 'Array') || !plainPrototype(Object.getPrototypeOf(proto))
      : !plainPrototype(proto)) throw new Error('invalid-personal-plan-prototype');
    visited.add(value);
    const keys = Reflect.ownKeys(value);
    const result = Array.isArray(value) ? [] : {};
    for (const key of keys) {
      if (Array.isArray(value) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== 'string' || ['__proto__', 'prototype', 'constructor', 'toJSON'].includes(key)
        || !descriptor || !own(descriptor, 'value') || !descriptor.enumerable) throw new Error('invalid-personal-plan-property');
      if (Array.isArray(value) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) throw new Error('invalid-personal-plan-array');
      Object.defineProperty(result, key, { value: copyPersonalData(descriptor.value, visited), enumerable: true, configurable: true, writable: true });
    }
    if (Array.isArray(value) && (keys.length !== value.length + 1 || result.length !== value.length)) throw new Error('invalid-personal-plan-array');
    visited.delete(value);
    return Object.freeze(result);
  }

  const exactKeys = (value, keys) => Boolean(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(key => own(value, key)));
  const personalSession = session => isSession(session) && personalBindings.has(session)
    && [PERSONAL_PLAN_DRAFT_CONTRACT, SOURCE_PLAN_DRAFT_CONTRACT, STRUCTURE_PLAN_DRAFT_CONTRACT].includes(session.draftContract);
  const sourceSession = session => personalSession(session) && session.draftContract === SOURCE_PLAN_DRAFT_CONTRACT;
  const structureSession = session => personalSession(session) && session.draftContract === STRUCTURE_PLAN_DRAFT_CONTRACT;
  // Family dispatch is private. Public v3 and v4 wrappers must keep exact brands.
  const sourceFamilySession = session => sourceSession(session) || structureSession(session);
  const sourceJournal = journal => journal && [SOURCE_PLAN_RECOVERY_VERSION, STRUCTURE_PLAN_RECOVERY_VERSION].includes(journal.version);
  const sourceContract = contract => contract === STRUCTURE_PLAN_DRAFT_CONTRACT ? {
    journalVersion: STRUCTURE_PLAN_RECOVERY_VERSION, inspector: 'inspectSourceBoundPersonalPlanStructureContext',
    validator: 'validateCapturedPersonalPlanStructureDraft', action: 'commit-source-bound-personal-plan-structure-context',
  } : contract === SOURCE_PLAN_DRAFT_CONTRACT ? {
    journalVersion: SOURCE_PLAN_RECOVERY_VERSION, inspector: 'inspectSourceBoundPersonalPlanContext',
    validator: 'validateCapturedPersonalPlanSourceDraft', action: 'commit-source-bound-personal-plan-context',
  } : null;
  const rootBinding = session => { const binding = personalBindings.get(session); return binding && (binding.root || binding); };
  function textModeShape(value) {
    return exactKeys(value, ['mode']) && value.mode === 'inherit'
      || exactKeys(value, ['mode', 'value']) && value.mode === 'override' && typeof value.value === 'string';
  }
  function scheduleModeShape(value) {
    return exactKeys(value, ['mode']) && ['inherit', 'unscheduled'].includes(value.mode)
      || exactKeys(value, ['mode', 'date']) && value.mode === 'fixed_date' && typeof value.date === 'string';
  }
  function personalItemShape(item, ref) {
    return exactKeys(item, ['itemRef', 'title', 'memo', 'schedule']) && item.itemRef === ref
      && textModeShape(item.title) && textModeShape(item.memo) && scheduleModeShape(item.schedule);
  }
  function personalShape(session, draft) {
    const identity = ['version', 'flowRef', 'savedCopyId', 'flowId'];
    if (!identity.every(key => draft[key] === session.baseline[key])) return false;
    if (session.kind === 'item') return exactKeys(draft, identity.concat(['itemRef', 'title', 'memo', 'schedule']))
      && draft.itemRef === session.scopeId && personalItemShape({ itemRef: draft.itemRef, title: draft.title, memo: draft.memo, schedule: draft.schedule }, session.scopeId);
    const refs = Object.keys(session.baseline.items);
    const structure = structureSession(session);
    if (!exactKeys(draft, identity.concat(structure ? ['title', 'items', 'sectionTitles', 'orderedItemRefs'] : ['title', 'items']))
      || !textModeShape(draft.title) || !exactKeys(draft.items, refs) || !refs.every(ref => personalItemShape(draft.items[ref], ref))) return false;
    if (!structure) return true;
    const sections = Object.keys(session.baseline.sectionTitles), ordered = draft.orderedItemRefs;
    return exactKeys(draft.sectionTitles, sections) && sections.every(id => textModeShape(draft.sectionTitles[id]))
      && Array.isArray(ordered) && ordered.length === refs.length && new Set(ordered).size === refs.length
      && ordered.every(ref => typeof ref === 'string' && own(session.baseline.items, ref));
  }
  function validPersonalDraft(session, draft) {
    if (!personalShape(session, draft)) return false;
    if (session.kind === 'item') return (draft.title.mode === 'inherit' || Boolean(draft.title.value.trim()))
      && (draft.schedule.mode !== 'fixed_date' || validDate(draft.schedule.date));
    try {
      const model = loadPersonalPlan(), binding = personalBindings.get(session);
      return (sourceFamilySession(session) ? model[sourceContract(session.draftContract).validator]({ context: binding.context, draft })
        : model.normalizePlanDraft(binding.context, draft)).ok === true;
    }
    catch (_) { return false; }
  }

  /** Checkpoint-bound only. No source readiness/capability is asserted by this API. */
  function createPersonalPlanSession(options) {
    if (!checkpointWorkspace) throw new Error('personal-plan-requires-checkpoint');
    if (!options || typeof options.sessionId !== 'string' || !options.sessionId
      || typeof options.flowRef !== 'string' || !options.flowRef) throw new Error('invalid-personal-plan-session');
    const model = loadCheckpoint();
    // Validate before copying, including the full Undo and legacy provenance.
    if (!model || model.validateCheckpoint(options.checkpoint).ok !== true) throw new Error('invalid-personal-plan-checkpoint');
    const checkpoint = copyPersonalData(options.checkpoint);
    const inspected = model.inspectPersonalPlanContext(checkpoint, options.flowRef);
    if (!inspected || inspected.ok !== true) throw new Error('invalid-personal-plan-context');
    const baseline = copyPersonalData(inspected.draft), draft = copyPersonalData(inspected.draft);
    const session = replaceSession(null, { version: VERSION, sessionId: options.sessionId, kind: 'plan',
      scopeId: options.flowRef, draftContract: PERSONAL_PLAN_DRAFT_CONTRACT, sourceBoundary: SOURCE_BOUNDARY,
      baseline, draft, revision: 0, valid: true, status: 'clean', pendingClose: null,
      returnPoint: options.returnPoint, parent: null, attempt: null, submission: 0, error: null });
    personalBindings.set(session, Object.freeze({ checkpoint, context: inspected.context }));
    return session;
  }

  function sourceObservation(storage, readSourceEpoch) {
    if (!storage || typeof storage.getItem !== 'function' || typeof readSourceEpoch !== 'function') throw new Error('source-observation-required');
    let before, after, raw;
    try { before = readSourceEpoch(); } catch (_) { throw new Error('source-epoch-read-failed'); }
    if (!Number.isSafeInteger(before) || before < 0) throw new Error('invalid-source-epoch');
    try { raw = storage.getItem(SOURCE_STORAGE_KEY); } catch (_) { throw new Error('source-read-error'); }
    if (raw !== null && typeof raw !== 'string') throw new Error('invalid-source-read');
    try { after = readSourceEpoch(); } catch (_) { throw new Error('source-epoch-read-failed'); }
    if (!Number.isSafeInteger(after) || after < 0) throw new Error('invalid-source-epoch');
    if (before !== after) throw new Error('source-observation-drift');
    return { sourceRead: Object.freeze({ ok: true, raw }), sourceEpoch: after };
  }

  function createSourceBoundPersonalPlanSession(storage, options) {
    return createSourcePlanSession(storage, options, SOURCE_PLAN_DRAFT_CONTRACT);
  }

  function createSourceBoundPersonalPlanStructureSession(storage, options) {
    return createSourcePlanSession(storage, options, STRUCTURE_PLAN_DRAFT_CONTRACT);
  }

  function createSourcePlanSession(storage, options, contract) {
    if (!checkpointWorkspace || !options || typeof options.sessionId !== 'string' || !options.sessionId
      || typeof options.flowRef !== 'string' || !options.flowRef || own(options, 'sourceRead') || own(options, 'sourceEpoch')) throw new Error('invalid-source-plan-session');
    const observation = sourceObservation(storage, options.readSourceEpoch), model = loadCheckpoint();
    if (!model || model.validateCheckpoint(options.checkpoint).ok !== true) throw new Error('invalid-source-plan-checkpoint');
    const checkpoint = copyPersonalData(options.checkpoint);
    const definition = sourceContract(contract);
    if (!definition || typeof model[definition.inspector] !== 'function') throw new Error('source-plan-feature-unavailable');
    const inspected = model[definition.inspector](checkpoint, Object.assign({ flowRef: options.flowRef }, observation));
    if (!inspected || inspected.ok !== true) throw new Error(inspected && inspected.reason || 'source-plan-inspection-failed');
    const session = replaceSession(null, { version: VERSION, sessionId: options.sessionId, kind: 'plan', scopeId: options.flowRef,
      draftContract: contract, sourceBoundary: CAPTURED_SOURCE_BOUNDARY,
      baseline: copyPersonalData(inspected.draft), draft: copyPersonalData(inspected.draft), revision: 0, valid: true,
      status: 'clean', pendingClose: null, returnPoint: options.returnPoint, parent: null, attempt: null, submission: 0, error: null });
    personalBindings.set(session, Object.freeze({ checkpoint, context: inspected.context, sourceContext: inspected.sourceContext,
      sourceRaw: observation.sourceRead.raw, sourceEpoch: observation.sourceEpoch }));
    return session;
  }

  function checkSourceBinding(storage, session, readSourceEpoch) {
    if (!sourceFamilySession(session)) return { ok: false, reason: 'invalid-source-plan-owner' };
    const binding = rootBinding(session);
    if (invalidatedSourceBindings.has(binding)) return { ok: false, reason: invalidatedSourceBindings.get(binding) };
    try {
      const observation = sourceObservation(storage, readSourceEpoch);
      if (observation.sourceRead.raw !== binding.sourceRaw || observation.sourceEpoch !== binding.sourceEpoch) {
        invalidatedSourceBindings.set(binding, 'stale-source-plan');
        return { ok: false, reason: 'stale-source-plan' };
      }
      const checked = loadPersonalPlan().checkPersonalPlanSourceContext(binding.sourceContext, {
        rawState: binding.checkpoint.state, sourceRead: observation.sourceRead, sourceEpoch: observation.sourceEpoch });
      if (!checked.ok) {
        invalidatedSourceBindings.set(binding, checked.reason || 'stale-source-plan');
        return { ok: false, reason: checked.reason || 'stale-source-plan' };
      }
      return Object.assign({ ok: true }, observation);
    } catch (error) {
      const reason = error.message || 'source-observation-failed';
      // Actual observed mismatch cannot regain permission by returning to A.
      // An unreadable observation is not evidence of changed bytes: a later
      // explicit retry must perform all reads again, never treat it as absence.
      if (reason === 'source-observation-drift') invalidatedSourceBindings.set(binding, reason);
      return { ok: false, reason };
    }
  }

  function checkSourceBoundPersonalPlanSession(storage, session, options) {
    return checkSourcePlanSession(storage, session, options, SOURCE_PLAN_DRAFT_CONTRACT);
  }

  function checkSourceBoundPersonalPlanStructureSession(storage, session, options) {
    return checkSourcePlanSession(storage, session, options, STRUCTURE_PLAN_DRAFT_CONTRACT);
  }

  function checkSourcePlanSession(storage, session, options, contract) {
    if (!sourceFamilySession(session) || session.draftContract !== contract || !options) return { ok: false, reason: 'invalid-source-plan-owner' };
    const binding = rootBinding(session);
    try {
      if (loadCheckpoint().validateCheckpoint(options.checkpoint).ok !== true || !equalData(options.checkpoint, binding.checkpoint)) {
        invalidatedSourceBindings.set(binding, 'stale-source-plan-checkpoint');
        return { ok: false, reason: 'stale-source-plan-checkpoint' };
      }
    } catch (_) { return { ok: false, reason: 'invalid-source-plan-checkpoint' }; }
    return checkSourceBinding(storage, session, options.readSourceEpoch);
  }

  function equalData(left, right) {
    if (left === right) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) !== Array.isArray(right)) return false;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => own(right, key) && equalData(left[key], right[key]));
  }

  function validDate(value) {
    if (value === null) return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function validDraft(kind, draft) {
    if (!draft || typeof draft.title !== 'string' || !draft.title.trim()) return false;
    if (kind === 'plan') return Array.isArray(draft.items) && draft.items.every(item =>
      item && typeof item.id === 'string' && typeof item.title === 'string' && Boolean(item.title.trim())
      && typeof item.memo === 'string' && validDate(item.planDate));
    return typeof draft.memo === 'string' && validDate(kind === 'quick' ? draft.date : draft.planDate);
  }

  function statusFor(baseline, draft, valid) {
    return equalData(baseline, draft) ? 'clean' : valid ? 'dirty-valid' : 'dirty-invalid';
  }

  function isSession(session) {
    return Boolean(session && ownedSessions.has(session) && session.version === VERSION && typeof session.sessionId === 'string'
      && ['plan', 'item', 'quick'].includes(session.kind) && Number.isInteger(session.revision));
  }

  function locked(session) {
    return isSession(session) && ['submitting', 'recovery-required'].includes(session.status);
  }

  function stateResult(session, effect, extra) {
    return Object.assign({ session, status: session ? session.status : 'closed', effect }, extra || {});
  }

  function reject(session, error) {
    return stateResult(session, 'blocked', { ok: false, error });
  }

  function replaceSession(session, fields) {
    const next = Object.freeze(Object.assign({}, session, fields));
    ownedSessions.add(next);
    if (session && personalBindings.has(session)) personalBindings.set(next, personalBindings.get(session));
    return next;
  }

  function createSession(options) {
    if (options && own(options, 'draftContract')) throw new Error('unsupported-editor-draft-contract');
    if (!options || !options.sessionId || !options.scopeId || !['plan', 'item', 'quick'].includes(options.kind)) throw new Error('invalid-editor-session');
    const baseline = copyData(options.draft);
    const draft = copyData(options.draft);
    const valid = options.valid !== false && validDraft(options.kind, draft);
    return replaceSession(null, { version: VERSION, sessionId: options.sessionId, kind: options.kind,
      scopeId: options.scopeId, baseline, draft, revision: 0, valid, status: 'clean',
      pendingClose: null, returnPoint: options.returnPoint, parent: options.parent ? copyData(options.parent) : null,
      attempt: null, submission: 0, error: null });
  }

  function identityUnchanged(session, draft) {
    for (const key of ['id', 'flowId', 'mode']) {
      if (own(session.baseline, key) && draft[key] !== session.baseline[key]) return false;
    }
    if (session.kind !== 'plan') return true;
    if (!Array.isArray(draft.items) || !Array.isArray(session.baseline.items)) return false;
    const before = session.baseline.items.map(item => item.id);
    const after = draft.items.map(item => item && item.id);
    return new Set(before).size === before.length && new Set(after).size === after.length
      && before.length === after.length && before.every(id => after.includes(id));
  }

  function updateDraft(session, draft, options) {
    if (!isSession(session)) return reject(session, 'missing-editor-session');
    if (locked(session) || session.pendingClose) return reject(session, 'editor-locked');
    if (options && ((own(options, 'sessionId') && options.sessionId !== session.sessionId)
      || (own(options, 'revision') && options.revision !== session.revision))) return reject(session, 'stale-editor-session');
    let nextDraft;
    const personal = personalSession(session);
    try { nextDraft = personal ? copyPersonalData(draft) : copyData(draft); } catch (_) { return reject(session, 'invalid-editor-data'); }
    if (personal ? !personalShape(session, nextDraft) : !identityUnchanged(session, nextDraft)) return reject(session, 'editor-identity-changed');
    const valid = (!options || options.valid !== false) && (personal ? validPersonalDraft(session, nextDraft) : validDraft(session.kind, nextDraft));
    if (equalData(session.draft, nextDraft) && valid === session.valid) return stateResult(session, 'unchanged', { ok: true });
    const next = replaceSession(session, { draft: nextDraft, revision: session.revision + 1, valid,
      status: statusFor(session.baseline, nextDraft, valid), attempt: null, error: null });
    return stateResult(next, 'updated', { ok: true });
  }

  function requestClose(session, options) {
    if (!isSession(session)) return reject(session, 'missing-editor-session');
    const reason = options && options.reason;
    if (!CLOSE_REASONS.includes(reason)) return reject(session, 'invalid-close-reason');
    const rearmHistory = reason === 'browser-back';
    if (locked(session)) return Object.assign(reject(session, 'editor-locked'), { rearmHistory });
    if (session.pendingClose) {
      const continued = continueEditing(session);
      return Object.assign(continued, { rearmHistory });
    }
    if (session.status === 'clean') return stateResult(null, 'close', { ok: true, returnPoint: session.returnPoint, closedSession: session, rearmHistory: false });
    const next = replaceSession(session, { pendingClose: Object.freeze({ reason, editingPoint: options.editingPoint }) });
    return stateResult(next, 'confirm', { ok: true, rearmHistory });
  }

  function continueEditing(session) {
    if (!isSession(session) || !session.pendingClose || locked(session)) return reject(session, 'no-discard-confirmation');
    const editingPoint = session.pendingClose.editingPoint;
    return stateResult(replaceSession(session, { pendingClose: null }), 'continue', { ok: true, editingPoint, returnPoint: editingPoint });
  }

  function discardChanges(session) {
    if (!isSession(session) || !session.pendingClose || locked(session)) return reject(session, 'no-discard-confirmation');
    return stateResult(null, 'close', { ok: true, discarded: true, returnPoint: session.returnPoint, closedSession: session });
  }

  function createChildSession(parent, options) {
    if (!isSession(parent) || parent.kind !== 'plan' || locked(parent) || parent.pendingClose) throw new Error('parent-editor-unavailable');
    if (sourceFamilySession(parent)) throw new Error('source-child-wrapper-required');
    if (personalSession(parent)) return createPersonalChild(parent, options);
    const matches = parent.draft.items.filter(item => item.id === options.itemId);
    if (matches.length !== 1) throw new Error('ambiguous-parent-item');
    const item = matches[0];
    const draft = options.draft || Object.assign({ mode: 'plan', flowId: parent.draft.flowId }, item);
    if (draft.id !== item.id || draft.flowId !== parent.draft.flowId || draft.mode !== 'plan'
      || !['title', 'memo', 'planDate'].every(key => equalData(draft[key], item[key]))) throw new Error('stale-child-baseline');
    return createSession({ sessionId: options.sessionId, kind: 'item', scopeId: options.itemId, draft,
      returnPoint: options.returnPoint, parent: { sessionId: parent.sessionId, scopeId: parent.scopeId,
        revision: parent.revision, itemId: options.itemId } });
  }

  function applyChild(parent, child) {
    if (!isSession(parent) || !isSession(child) || parent.kind !== 'plan' || child.kind !== 'item'
      || locked(parent) || locked(child) || parent.pendingClose || child.pendingClose) return { ok: false, parent, child, error: 'editor-locked' };
    if (sourceFamilySession(parent) || sourceFamilySession(child)) return { ok: false, parent, child, error: 'source-child-wrapper-required' };
    if (personalSession(parent) || personalSession(child)) return applyPersonalChild(parent, child);
    const ticket = child.parent;
    if (!ticket || ticket.sessionId !== parent.sessionId || ticket.scopeId !== parent.scopeId
      || ticket.revision !== parent.revision || child.scopeId !== ticket.itemId
      || child.draft.id !== ticket.itemId || child.draft.flowId !== parent.draft.flowId) return { ok: false, parent, child, error: 'stale-parent-editor' };
    if (!child.valid || !validDraft('item', child.draft)) return { ok: false, parent, child, error: 'invalid-child-draft' };
    const matches = parent.draft.items.filter(item => item.id === ticket.itemId);
    if (matches.length !== 1) return { ok: false, parent, child, error: 'ambiguous-parent-item' };
    const draft = Object.assign({}, parent.draft, { items: parent.draft.items.map(item => item.id === ticket.itemId
      ? Object.assign({}, item, { title: child.draft.title.trim(), memo: child.draft.memo, planDate: child.draft.planDate }) : item) });
    const updated = updateDraft(parent, draft);
    if (!updated.ok) return { ok: false, parent, child, error: updated.error };
    return { ok: true, parent: updated.session, child: null, returnPoint: child.returnPoint, effect: 'close', changed: updated.session !== parent };
  }

  function createPersonalChild(parent, options) {
    if (!options || typeof options.sessionId !== 'string' || !options.sessionId || typeof options.itemRef !== 'string'
      || !own(parent.draft.items, options.itemRef)) throw new Error('invalid-personal-child-ref');
    const item = parent.draft.items[options.itemRef];
    const expected = Object.assign({ version: parent.draft.version, flowRef: parent.draft.flowRef,
      savedCopyId: parent.draft.savedCopyId, flowId: parent.draft.flowId }, item);
    if (own(options, 'draft') && !equalData(copyPersonalData(options.draft), expected)) throw new Error('stale-child-baseline');
    const child = replaceSession(null, { version: VERSION, sessionId: options.sessionId, kind: 'item',
      scopeId: options.itemRef, draftContract: parent.draftContract, sourceBoundary: parent.sourceBoundary,
      baseline: copyPersonalData(expected), draft: copyPersonalData(expected), revision: 0, valid: true, status: 'clean',
      pendingClose: null, returnPoint: options.returnPoint, parent: Object.freeze({ sessionId: parent.sessionId,
        scopeId: parent.scopeId, revision: parent.revision, itemRef: options.itemRef }), attempt: null, submission: 0, error: null });
    personalBindings.set(child, Object.freeze({ parent, root: personalBindings.get(parent) }));
    // A supported but invalid value can be reopened without declaring it valid.
    return validPersonalDraft(child, child.draft) ? child : replaceSession(child, { valid: false });
  }

  function applyPersonalChild(parent, child) {
    const fail = error => ({ ok: false, parent, child, error });
    const binding = personalBindings.get(child), ticket = child.parent;
    if (!personalSession(parent) || !personalSession(child) || !binding || binding.parent !== parent
      || !ticket || ticket.revision !== parent.revision || ticket.itemRef !== child.scopeId
      || !own(parent.draft.items, child.scopeId)) return fail('stale-parent-editor');
    if (!child.valid || !validPersonalDraft(child, child.draft)) return fail('invalid-child-draft');
    const item = { itemRef: child.scopeId, title: child.draft.title, memo: child.draft.memo, schedule: child.draft.schedule };
    const draft = Object.assign({}, parent.draft, { items: Object.assign({}, parent.draft.items, { [child.scopeId]: item }) });
    const updated = updateDraft(parent, draft);
    if (!updated.ok) return fail(updated.error);
    return { ok: true, parent: updated.session, child: null, returnPoint: child.returnPoint,
      effect: 'close', changed: updated.session !== parent, sourceBoundary: parent.sourceBoundary };
  }

  function createSourceBoundPersonalPlanChild(storage, parent, options) {
    return createSourcePlanChild(storage, parent, options, SOURCE_PLAN_DRAFT_CONTRACT);
  }

  function createSourceBoundPersonalPlanStructureChild(storage, parent, options) {
    return createSourcePlanChild(storage, parent, options, STRUCTURE_PLAN_DRAFT_CONTRACT);
  }

  function createSourcePlanChild(storage, parent, options, contract) {
    if (!sourceFamilySession(parent) || parent.draftContract !== contract || parent.kind !== 'plan' || locked(parent) || parent.pendingClose) throw new Error('parent-editor-unavailable');
    const checked = checkSourcePlanSession(storage, parent, options, contract);
    if (!checked.ok) throw new Error(checked.reason);
    return createPersonalChild(parent, options);
  }

  function applySourceBoundPersonalPlanChild(storage, parent, child, options) {
    return applySourcePlanChild(storage, parent, child, options, SOURCE_PLAN_DRAFT_CONTRACT);
  }

  function applySourceBoundPersonalPlanStructureChild(storage, parent, child, options) {
    return applySourcePlanChild(storage, parent, child, options, STRUCTURE_PLAN_DRAFT_CONTRACT);
  }

  function applySourcePlanChild(storage, parent, child, options, contract) {
    if (!sourceFamilySession(parent) || !sourceFamilySession(child) || parent.draftContract !== contract || child.draftContract !== contract
      || parent.kind !== 'plan' || child.kind !== 'item'
      || locked(parent) || locked(child) || parent.pendingClose || child.pendingClose) return { ok: false, parent, child, error: 'editor-locked' };
    const checked = checkSourcePlanSession(storage, parent, options, contract);
    if (!checked.ok) return { ok: false, parent, child, error: checked.reason, requiresSourceReopen: true };
    return applyPersonalChild(parent, child);
  }

  function validateOwnedEnvelope(value, validator) {
    if (checkpointWorkspace) {
      const model = loadCheckpoint();
      if (!model || typeof model.validateCheckpoint !== 'function' || model.validateCheckpoint(value).ok !== true) return false;
      return typeof validator !== 'function' || validator(value) === true;
    }
    return typeof validator === 'function' && validator(value) === true;
  }

  function legacyGuard(storage, expectedRaw) {
    if (!checkpointWorkspace) return {};
    let journalRaw;
    try { journalRaw = storage.getItem(LEGACY_RECOVERY_KEY); }
    catch (_) { return { legacyStatus: 'journal-read-error', legacyError: 'legacy-journal-read-failed', canResume: false }; }
    if (journalRaw !== null) return { legacyStatus: 'journal-present', legacyError: 'legacy-recovery-pending', canResume: false };
    let raw;
    try { raw = storage.getItem(LEGACY_STORAGE_KEY); }
    catch (_) { return { legacyStatus: 'read-error', legacyError: 'legacy-base-read-failed', canResume: false }; }
    return raw === expectedRaw ? { legacyStatus: 'matching', legacyError: null, canResume: true }
      : { legacyStatus: 'drift', legacyError: 'legacy-base-drift', canResume: false };
  }

  // Explicit recovery may restore owned checkpoint bytes despite base drift, but
  // never competes with an unresolved or unreadable legacy recovery operation.
  function legacyJournalGuard(storage) {
    if (!checkpointWorkspace) return null;
    try { return storage.getItem(LEGACY_RECOVERY_KEY) === null ? null : 'legacy-recovery-pending'; }
    catch (_) { return 'legacy-journal-read-failed'; }
  }

  function recoveryLegacyStatus(storage, journal) {
    if (!checkpointWorkspace) return {};
    if (!journal) return { legacyStatus: 'unverified', legacyError: 'legacy-base-unverified', canResume: false };
    try { return legacyGuard(storage, JSON.parse(journal.candidateRaw).legacyBaseRaw); }
    catch (_) { return { legacyStatus: 'unverified', legacyError: 'legacy-base-unverified', canResume: false }; }
  }

  function beginSave(session, options) {
    if (personalSession(session)) return reject(session, 'personal-plan-save-wrapper-required');
    return beginCandidateSave(session, options, false);
  }

  function checkpointBefore(beforeRaw, legacyBaseRaw) {
    const model = loadCheckpoint();
    const checkpoint = beforeRaw === null ? model.fromLegacy(legacyBaseRaw).checkpoint : JSON.parse(beforeRaw);
    if (!checkpoint || model.validateCheckpoint(checkpoint).ok !== true || checkpoint.legacyBaseRaw !== legacyBaseRaw) throw new Error('invalid-before-checkpoint');
    return checkpoint;
  }

  /** Derive the only permitted candidate; arbitrary caller candidates are never accepted. */
  function beginPersonalPlanSave(session, options) {
    if (!personalSession(session) || sourceFamilySession(session) || session.kind !== 'plan') return reject(session, 'invalid-personal-plan-save-owner');
    if (locked(session) || session.pendingClose) return reject(session, 'editor-locked');
    if (!session.valid || !validPersonalDraft(session, session.draft)) return reject(session, 'invalid-editor-draft');
    if (!options || !(options.expectedRaw === null || typeof options.expectedRaw === 'string')) return reject(session, 'invalid-save-attempt');
    const binding = personalBindings.get(session);
    let result;
    try {
      const model = loadCheckpoint();
      if (model.validateCheckpoint(options.checkpoint).ok !== true || !equalData(options.checkpoint, binding.checkpoint)) return reject(session, 'stale-personal-plan-checkpoint');
      const before = checkpointBefore(options.expectedRaw, binding.checkpoint.legacyBaseRaw);
      if (!equalData(before, binding.checkpoint)) return reject(session, 'stale-personal-plan-before');
      result = model.transitionCheckpoint(binding.checkpoint, { type: 'commit-personal-plan-context',
        context: binding.context, draft: session.draft, now: options.now });
    } catch (_) { return reject(session, 'invalid-personal-plan-checkpoint'); }
    if (!result || result.ok !== true) return reject(session, result && result.reason || 'invalid-personal-plan-transition');
    if (!result.changed) return stateResult(session, 'unchanged', { ok: true, changed: false, sourceBoundary: SOURCE_BOUNDARY });
    return beginCandidateSave(session, { candidate: result.checkpoint, expectedRaw: options.expectedRaw,
      attemptId: options.attemptId }, true);
  }

  function beginCandidateSave(session, options, personal) {
    if (!isSession(session) || session.kind === 'item') return reject(session, 'invalid-save-owner');
    if (locked(session) || session.pendingClose) return reject(session, 'editor-locked');
    if (session.status === 'clean') return stateResult(session, 'unchanged', { ok: false, error: 'unchanged-editor-draft' });
    if (!session.valid || !(personal ? validPersonalDraft(session, session.draft) : validDraft(session.kind, session.draft))) return reject(session, 'invalid-editor-draft');
    if (!options || typeof options.attemptId !== 'string' || !options.attemptId
      || !(options.expectedRaw === null || typeof options.expectedRaw === 'string')
      || (!checkpointWorkspace && typeof options.validateEnvelope !== 'function')
      || (checkpointWorkspace && options.validateEnvelope !== undefined && typeof options.validateEnvelope !== 'function')) return reject(session, 'invalid-save-attempt');
    let candidate;
    let serialized;
    try {
      candidate = copyData(options.candidate);
      serialized = JSON.stringify(candidate);
      if (!validateOwnedEnvelope(candidate, options.validateEnvelope) || typeof serialized !== 'string') return reject(session, 'invalid-envelope');
      if (checkpointWorkspace && options.expectedRaw !== null) {
        const before = JSON.parse(options.expectedRaw);
        if (!validateOwnedEnvelope(before, options.validateEnvelope) || before.legacyBaseRaw !== candidate.legacyBaseRaw) return reject(session, 'invalid-before-checkpoint');
      }
    } catch (_) { return reject(session, 'invalid-envelope'); }
    const attempt = Object.freeze(Object.assign({ version: VERSION, sessionId: session.sessionId, kind: session.kind,
      scopeId: session.scopeId, revision: session.revision, attemptId: options.attemptId,
      expectedRaw: options.expectedRaw, candidate, serialized, candidateRaw: serialized },
    personal ? { draftContract: session.draftContract, sourceBoundary: session.sourceBoundary } : {}));
    attemptValidators.set(attempt, options.validateEnvelope);
    const next = replaceSession(session, { status: 'submitting', attempt, submission: session.submission + 1, error: null });
    return stateResult(next, 'submit', Object.assign({ ok: true, attempt }, personal ? { sourceBoundary: session.sourceBoundary } : {}));
  }

  function beginSourceBoundPersonalPlanSave(storage, session, options) {
    return beginSourcePlanSave(storage, session, options, SOURCE_PLAN_DRAFT_CONTRACT);
  }

  function beginSourceBoundPersonalPlanStructureSave(storage, session, options) {
    return beginSourcePlanSave(storage, session, options, STRUCTURE_PLAN_DRAFT_CONTRACT);
  }

  function beginSourcePlanSave(storage, session, options, contract) {
    if (!sourceFamilySession(session) || session.draftContract !== contract || session.kind !== 'plan') return reject(session, 'invalid-source-plan-save-owner');
    if (locked(session) || session.pendingClose) return reject(session, 'editor-locked');
    if (!session.valid || !validPersonalDraft(session, session.draft)) return reject(session, 'invalid-editor-draft');
    if (!options || own(options, 'sourceRead') || own(options, 'sourceEpoch')
      || !(options.expectedRaw === null || typeof options.expectedRaw === 'string')) return reject(session, 'invalid-save-attempt');
    const checked = checkSourcePlanSession(storage, session, options, contract);
    if (!checked.ok) return Object.assign(reject(session, checked.reason), { requiresSourceReopen: true });
    const binding = rootBinding(session);
    let result;
    try {
      const before = checkpointBefore(options.expectedRaw, binding.checkpoint.legacyBaseRaw);
      if (!equalData(before, binding.checkpoint)) return reject(session, 'stale-source-plan-before');
      result = loadCheckpoint().transitionCheckpoint(binding.checkpoint, { type: sourceContract(contract).action,
        context: binding.context, draft: session.draft, sourceRead: checked.sourceRead, sourceEpoch: checked.sourceEpoch, now: options.now });
    } catch (_) { return reject(session, 'invalid-source-plan-checkpoint'); }
    if (!result || result.ok !== true) return reject(session, result && result.reason || 'invalid-source-plan-transition');
    if (!result.changed) return stateResult(session, 'unchanged', { ok: true, changed: false, sourceBoundary: CAPTURED_SOURCE_BOUNDARY });
    return beginCandidateSave(session, { candidate: result.checkpoint, expectedRaw: options.expectedRaw, attemptId: options.attemptId }, true);
  }

  function retrySave(session, attemptId) {
    if (sourceFamilySession(session)) return reject(session, 'source-retry-wrapper-required');
    return retryCandidateSave(session, attemptId);
  }

  function retrySourceBoundPersonalPlanSave(storage, session, options) {
    return retrySourcePlanSave(storage, session, options, SOURCE_PLAN_DRAFT_CONTRACT);
  }

  function retrySourceBoundPersonalPlanStructureSave(storage, session, options) {
    return retrySourcePlanSave(storage, session, options, STRUCTURE_PLAN_DRAFT_CONTRACT);
  }

  function retrySourcePlanSave(storage, session, options, contract) {
    if (!sourceFamilySession(session) || session.draftContract !== contract || session.kind !== 'plan') return reject(session, 'invalid-source-plan-owner');
    const checked = checkSourcePlanSession(storage, session, options, contract);
    if (!checked.ok) return Object.assign(reject(session, checked.reason), { requiresSourceReopen: true });
    return retryCandidateSave(session, options.attemptId);
  }

  function retryCandidateSave(session, attemptId) {
    if (!isSession(session) || session.pendingClose || session.status !== 'recoverable-error'
      || !session.attempt || session.attempt.attemptId !== attemptId
      || session.attempt.revision !== session.revision || session.error === 'stale-expected-raw') return reject(session, 'stale-save-attempt');
    const next = replaceSession(session, { status: 'submitting', submission: session.submission + 1, error: null });
    return stateResult(next, 'submit', { ok: true, attempt: session.attempt });
  }

  function ownsAttempt(session, attempt) {
    return isSession(session) && session.kind !== 'item' && session.status === 'submitting'
      && session.attempt === attempt && attempt && attemptValidators.has(attempt) && attempt.version === VERSION
      && attempt.sessionId === session.sessionId && attempt.scopeId === session.scopeId
      && attempt.kind === session.kind && attempt.revision === session.revision;
  }

  /** Legacy single-target adapter; the durable wrapper reserves its dispatch first. */
  function performWriteAttempt(storage, session, attempt, reserved, beforeTargetWrite) {
    const counts = { writeCount: 0, rollbackWriteCount: 0 };
    let claimed = false;
    const outcome = (status, error, rollback) => {
      const value = Object.freeze(Object.assign({ status, error: error || null, rollback: rollback || 'not-needed',
        changed: status === 'committed', serialized: attempt && attempt.serialized,
        sessionId: session && session.sessionId, attemptId: attempt && attempt.attemptId,
        revision: session && session.revision, submission: session && session.submission }, counts));
      if (claimed) issuedOutcomes.set(value, session);
      return value;
    };
    if (checkpointWorkspace && !reserved) return outcome('preflight-failed', 'durable-required');
    if (!ownsAttempt(session, attempt) || (!reserved && dispatchedSessions.has(session))) return outcome('preflight-failed', 'stale-save-attempt');
    dispatchedSessions.add(session);
    claimed = true;
    let before;
    try { before = storage.getItem(STORAGE_KEY); }
    catch (_) { return outcome('preflight-failed', 'initial-read-failed'); }
    if (before !== attempt.expectedRaw) return outcome('preflight-failed', 'stale-expected-raw');
    if (before === attempt.serialized) return outcome('unchanged');
    if (beforeTargetWrite) {
      const error = beforeTargetWrite();
      if (error) return outcome('recovery-required', error, 'recovery-required');
      try {
        if (storage.getItem(STORAGE_KEY) !== before) return outcome('recovery-required', 'external-storage-drift', 'recovery-required');
      } catch (_) { return outcome('recovery-required', 'target-recheck-failed', 'recovery-required'); }
    }
    let failure = 'write-failed';
    try {
      counts.writeCount += 1;
      storage.setItem(STORAGE_KEY, attempt.serialized);
      failure = 'write-readback-failed';
      if (storage.getItem(STORAGE_KEY) !== attempt.serialized) throw new Error(failure);
      return outcome('committed');
    } catch (_) {
      // A setItem can throw after changing bytes. Inspect actual state before any rollback.
      let current;
      try { current = storage.getItem(STORAGE_KEY); }
      catch (_) { return outcome('recovery-required', 'rollback-read-failed', 'recovery-required'); }
      if (current === before) return outcome('failed', failure, 'not-needed');
      if (current !== attempt.serialized) return outcome('recovery-required', 'external-storage-drift', 'recovery-required');
      if (beforeTargetWrite) {
        const error = beforeTargetWrite();
        if (error) return outcome('recovery-required', error, 'recovery-required');
        try {
          if (storage.getItem(STORAGE_KEY) !== attempt.serialized) return outcome('recovery-required', 'external-storage-drift', 'recovery-required');
        } catch (_) { return outcome('recovery-required', 'rollback-read-failed', 'recovery-required'); }
      }
      try {
        counts.rollbackWriteCount += 1;
        if (before === null) storage.removeItem(STORAGE_KEY);
        else storage.setItem(STORAGE_KEY, before);
      } catch (_) {
        // A throwing rollback may still have restored the bytes; verify, never infer.
      }
      try {
        if (storage.getItem(STORAGE_KEY) === before) return outcome('failed', failure, 'complete');
      } catch (_) { return outcome('recovery-required', 'rollback-readback-failed', 'recovery-required'); }
      return outcome('recovery-required', 'rollback-verification-failed', 'recovery-required');
    }
  }

  function writeAttempt(storage, session, attempt) {
    return performWriteAttempt(storage, session, attempt, false);
  }

  function decodeJournal(raw, validateEnvelope) {
    try {
      if (typeof raw !== 'string' || (!checkpointWorkspace && typeof validateEnvelope !== 'function')) return null;
      const value = JSON.parse(raw);
      const keys = ['version', 'targetKey', 'phase', 'sessionId', 'kind', 'scopeId', 'revision', 'submission', 'attemptId', 'beforeRaw', 'candidateRaw', 'baseline', 'draft'];
      const source = checkpointWorkspace && sourceJournal(value);
      const structure = source && value.version === STRUCTURE_PLAN_RECOVERY_VERSION;
      const definition = source ? sourceContract(structure ? STRUCTURE_PLAN_DRAFT_CONTRACT : SOURCE_PLAN_DRAFT_CONTRACT) : null;
      const personal = checkpointWorkspace && value && value.version === PERSONAL_PLAN_RECOVERY_VERSION;
      if (personal || source) keys.push('draftContract');
      if (source) keys.push('sourceReadSnapshot');
      if (!value || Object.keys(value).length !== keys.length || !keys.every(key => own(value, key))
        || value.version !== (source ? definition.journalVersion : personal ? PERSONAL_PLAN_RECOVERY_VERSION : RECOVERY_VERSION) || value.targetKey !== STORAGE_KEY
        || !['prepared', 'confirmed'].includes(value.phase) || !['plan', 'quick'].includes(value.kind)
        || (personal && (value.draftContract !== PERSONAL_PLAN_DRAFT_CONTRACT || value.kind !== 'plan'))
        || (source && (value.draftContract !== (structure ? STRUCTURE_PLAN_DRAFT_CONTRACT : SOURCE_PLAN_DRAFT_CONTRACT) || value.kind !== 'plan'
          || !exactKeys(value.sourceReadSnapshot, ['version', 'raw']) || value.sourceReadSnapshot.version !== 1
          || !(value.sourceReadSnapshot.raw === null || typeof value.sourceReadSnapshot.raw === 'string')))
        || !['sessionId', 'scopeId', 'attemptId'].every(key => typeof value[key] === 'string' && value[key])
        || !Number.isInteger(value.revision) || value.revision < 0 || !Number.isInteger(value.submission) || value.submission < 1
        || !(value.beforeRaw === null || typeof value.beforeRaw === 'string') || typeof value.candidateRaw !== 'string'
        || !validateOwnedEnvelope(JSON.parse(value.candidateRaw), validateEnvelope)
        || (value.beforeRaw !== null && !validateOwnedEnvelope(JSON.parse(value.beforeRaw), validateEnvelope))) return null;
      if (checkpointWorkspace && value.beforeRaw !== null
        && JSON.parse(value.beforeRaw).legacyBaseRaw !== JSON.parse(value.candidateRaw).legacyBaseRaw) return null;
      if (personal || source) {
        // Valid checkpoint bytes alone are not evidence for this Plan's save.
        // Reissue a context from actual before bytes and reproduce one C action.
        const candidate = JSON.parse(value.candidateRaw);
        const before = checkpointBefore(value.beforeRaw, candidate.legacyBaseRaw);
        const model = loadCheckpoint();
        // The replay epoch is local to this historical reconstruction, not the
        // previous UI observation counter or permission to edit the current key.
        const sourceRead = source ? { ok: true, raw: value.sourceReadSnapshot.raw } : null;
        const inspected = source ? model[definition.inspector](before, { flowRef: value.scopeId, sourceRead, sourceEpoch: 0 })
          : model.inspectPersonalPlanContext(before, value.scopeId);
        if (!inspected || inspected.ok !== true || !equalData(value.baseline, inspected.draft)) return null;
        const action = { type: source ? definition.action : 'commit-personal-plan-context',
          context: inspected.context, draft: value.draft, now: candidate.state.updatedAt };
        if (source) Object.assign(action, { sourceRead, sourceEpoch: 0 });
        const result = model.transitionCheckpoint(before, action);
        if (!result || result.ok !== true || !result.changed || JSON.stringify(result.checkpoint) !== value.candidateRaw) return null;
        return copyPersonalData(value);
      }
      const baseline = createSession({ sessionId: value.sessionId, scopeId: value.scopeId, kind: value.kind, draft: value.baseline });
      if (!identityUnchanged(baseline, value.draft) || !validDraft(value.kind, value.draft)
        || (value.kind === 'plan' ? value.draft.flowId !== value.scopeId : value.draft.id !== value.scopeId)) return null;
      return copyData(value);
    } catch (_) { return null; }
  }

  function inspectRecovery(journalRaw, targetRaw, validateEnvelope) {
    const journal = decodeJournal(journalRaw, validateEnvelope);
    if (!journal) return { status: 'blocked', journalRaw, journal: null, targetRaw, targetOwnership: 'foreign', canRecover: false, error: 'invalid-recovery-journal' };
    const targetOwnership = targetRaw === journal.candidateRaw ? 'candidate' : targetRaw === journal.beforeRaw ? 'before' : 'foreign';
    const matching = journal.phase === 'confirmed' ? targetOwnership === 'candidate' : targetOwnership !== 'foreign';
    return { status: matching ? journal.phase : 'blocked', journalRaw, journal, targetRaw, targetOwnership,
      canRecover: matching && journal.phase === 'prepared', error: matching ? null : 'recovery-target-drift',
      ...(sourceJournal(journal) ? { requiresSourceReopen: true } : {}) };
  }

  /** Startup inspection is strictly read-only, including confirmed commit records. */
  function loadRecovery(storage, validateEnvelope) {
    let journalRaw;
    try { journalRaw = storage.getItem(RECOVERY_KEY); }
    catch (_) { return Object.assign({ status: 'blocked', journalRaw: null, journal: null, targetOwnership: 'unreadable', canRecover: false, error: 'recovery-journal-read-failed' }, recoveryLegacyStatus(storage, null)); }
    if (journalRaw === null) return Object.assign({ status: 'none', journalRaw: null, journal: null, targetOwnership: null, canRecover: false }, recoveryLegacyStatus(storage, null));
    let targetRaw;
    try { targetRaw = storage.getItem(STORAGE_KEY); }
    catch (_) { return Object.assign({ status: 'blocked', journalRaw, journal: decodeJournal(journalRaw, validateEnvelope), targetOwnership: 'unreadable', canRecover: false, error: 'recovery-target-read-failed' }, recoveryLegacyStatus(storage, null)); }
    const recovery = inspectRecovery(journalRaw, targetRaw, validateEnvelope);
    return Object.assign(recovery, recoveryLegacyStatus(storage, recovery.journal), checkpointWorkspace && recovery.status === 'blocked' ? { canResume: false } : {});
  }

  function replaceJournal(storage, expectedRaw, nextRaw, counts, beforeJournalWrite) {
    try {
      if (storage.getItem(RECOVERY_KEY) !== expectedRaw) return { ok: false, error: 'recovery-journal-drift' };
    } catch (_) { return { ok: false, error: 'recovery-journal-read-failed' }; }
    if (beforeJournalWrite) {
      const error = beforeJournalWrite();
      if (error) return { ok: false, error, guardBlocked: true };
      try {
        if (storage.getItem(RECOVERY_KEY) !== expectedRaw) return { ok: false, error: 'recovery-journal-drift' };
      } catch (_) { return { ok: false, error: 'recovery-journal-read-failed' }; }
    }
    let threw = false;
    try { counts.journalWriteCount += 1; storage.setItem(RECOVERY_KEY, nextRaw); }
    catch (_) { threw = true; }
    try {
      const actual = storage.getItem(RECOVERY_KEY);
      return actual === nextRaw ? { ok: true, threw } : { ok: false, threw, actual, error: 'recovery-journal-write-unverified' };
    } catch (_) { return { ok: false, threw, error: 'recovery-journal-readback-failed' }; }
  }

  function removeOwnedJournal(storage, expectedRaw, expectedTarget, counts, beforeRemoval) {
    try {
      const initialLegacyError = legacyJournalGuard(storage);
      if (initialLegacyError) return { ok: false, error: initialLegacyError };
      if (storage.getItem(STORAGE_KEY) !== expectedTarget) return { ok: false, error: 'recovery-target-drift' };
      // Check ownership immediately before removal, not just at dialog/open time.
      const current = storage.getItem(RECOVERY_KEY);
      if (current !== null && current !== expectedRaw) return { ok: false, error: 'recovery-journal-drift' };
      if (current !== null) {
        if (beforeRemoval) {
          const error = beforeRemoval();
          if (error) return { ok: false, error };
        }
        if (checkpointWorkspace) {
          if (storage.getItem(STORAGE_KEY) !== expectedTarget || storage.getItem(RECOVERY_KEY) !== current) return { ok: false, error: 'recovery-owner-drift' };
          const legacyError = legacyJournalGuard(storage);
          if (legacyError) return { ok: false, error: legacyError };
        }
        try { counts.journalWriteCount += 1; storage.removeItem(RECOVERY_KEY); }
        catch (_) { /* A throwing remove may already have succeeded. Verify both records. */ }
      }
      if (storage.getItem(RECOVERY_KEY) !== null) return { ok: false, error: 'recovery-journal-cleanup-failed' };
      if (storage.getItem(STORAGE_KEY) !== expectedTarget) return { ok: false, error: 'recovery-target-drift' };
      const finalLegacyError = legacyJournalGuard(storage);
      if (finalLegacyError) return { ok: false, error: finalLegacyError };
      return { ok: true };
    } catch (_) { return { ok: false, error: 'recovery-cleanup-unverified' }; }
  }

  /** Prepare -> target verification -> confirmed. Confirmation remains until explicit cleanup. */
  function writeDurableAttempt(storage, session, attempt, options) {
    let claimed = false;
    let legacyStatus = checkpointWorkspace ? { legacyStatus: 'unverified', legacyError: 'legacy-base-unverified', canResume: false } : {};
    const counts = { writeCount: 0, rollbackWriteCount: 0, journalWriteCount: 0 };
    const source = sourceFamilySession(session);
    let sourceError = null;
    const sourceGuard = () => {
      if (!source) return null;
      const checked = checkSourceBinding(storage, session, options && options.readSourceEpoch);
      sourceError = checked.ok ? null : checked.reason;
      return sourceError;
    };
    const issue = (status, error, extra) => {
      const result = Object.freeze(Object.assign({ status, error: error || null, rollback: 'not-needed',
        changed: status === 'committed', serialized: attempt && attempt.serialized,
        sessionId: session && session.sessionId, attemptId: attempt && attempt.attemptId,
        revision: session && session.revision, submission: session && session.submission,
        journalRaw: null, phase: null, commitUncertain: false }, counts, legacyStatus, extra || {},
      personalSession(session) ? { sourceBoundary: session.sourceBoundary } : {}, source
        ? { sourceError, requiresSourceReopen: Boolean(sourceError), ...(sourceError ? { canResume: false } : {}) } : {}));
      if (claimed) issuedOutcomes.set(result, session);
      return result;
    };
    if (!ownsAttempt(session, attempt) || dispatchedSessions.has(session)) return issue('preflight-failed', 'stale-save-attempt');
    claimed = true;
    dispatchedSessions.add(session);
    const initialSourceError = sourceGuard();
    if (initialSourceError) return issue('preflight-failed', initialSourceError);
    let targetRaw;
    try { targetRaw = storage.getItem(STORAGE_KEY); }
    catch (_) { return issue('preflight-failed', 'initial-read-failed'); }
    if (targetRaw !== attempt.expectedRaw) return issue('preflight-failed', 'stale-expected-raw');
    const validator = attemptValidators.get(attempt);
    const personal = personalSession(session);
    const journal = { version: source ? sourceContract(session.draftContract).journalVersion : personal ? PERSONAL_PLAN_RECOVERY_VERSION : RECOVERY_VERSION, targetKey: STORAGE_KEY, phase: 'prepared', sessionId: session.sessionId,
      kind: session.kind, scopeId: session.scopeId, revision: session.revision, submission: session.submission,
      attemptId: attempt.attemptId, beforeRaw: attempt.expectedRaw, candidateRaw: attempt.serialized,
      baseline: session.baseline, draft: session.draft };
    if (personal) journal.draftContract = session.draftContract;
    if (source) journal.sourceReadSnapshot = { version: 1, raw: rootBinding(session).sourceRaw };
    const preparedRaw = JSON.stringify(journal);
    // A known attempt can later prove absent journal + before bytes without writing a journal now.
    if (!decodeJournal(preparedRaw, validator)) return issue('preflight-failed', 'invalid-recovery-journal');
    legacyStatus = legacyGuard(storage, attempt.candidate.legacyBaseRaw);
    if (checkpointWorkspace && !legacyStatus.canResume) return issue('recovery-required', legacyStatus.legacyError);
    let oldJournalRaw;
    try { oldJournalRaw = storage.getItem(RECOVERY_KEY); }
    catch (_) { return issue('recovery-required', 'recovery-journal-read-failed', { journalRaw: preparedRaw, phase: 'prepared' }); }
    if (oldJournalRaw !== null) {
      const previous = inspectRecovery(oldJournalRaw, targetRaw, validator);
      if (checkpointWorkspace) return issue('recovery-required', previous.error || 'pending-recovery-journal', { journalRaw: oldJournalRaw, phase: previous.journal && previous.journal.phase });
      if (previous.status !== 'confirmed') return issue('recovery-required', previous.error || 'pending-recovery-journal', { journalRaw: oldJournalRaw, phase: previous.journal && previous.journal.phase });
    }
    if (targetRaw === attempt.serialized) {
      legacyStatus = legacyGuard(storage, attempt.candidate.legacyBaseRaw);
      if (checkpointWorkspace && !legacyStatus.canResume) return issue('recovery-required', legacyStatus.legacyError);
      return issue('unchanged', null, { journalRaw: oldJournalRaw, phase: oldJournalRaw === null ? null : 'confirmed' });
    }
    const guardBeforeWrite = checkpointWorkspace ? () => {
      const sourceFailure = sourceGuard();
      if (sourceFailure) return sourceFailure;
      legacyStatus = legacyGuard(storage, attempt.candidate.legacyBaseRaw);
      return legacyStatus.canResume ? null : legacyStatus.legacyError;
    } : null;
    const prepared = replaceJournal(storage, oldJournalRaw, preparedRaw, counts, guardBeforeWrite);
    if (prepared.guardBlocked) return issue('recovery-required', prepared.error);
    if (!prepared.ok || prepared.threw) {
      let current;
      try { current = storage.getItem(RECOVERY_KEY); }
      catch (_) { return issue('recovery-required', 'recovery-prepare-unverified', { journalRaw: preparedRaw, phase: 'prepared' }); }
      if (current === oldJournalRaw) return issue('preflight-failed', prepared.error || 'recovery-prepare-failed');
      return issue('recovery-required', prepared.error || 'recovery-prepare-failed', { journalRaw: current, phase: current === preparedRaw ? 'prepared' : null });
    }
    const guardBeforeTarget = checkpointWorkspace ? () => {
      const error = guardBeforeWrite();
      if (error) return error;
      try { return storage.getItem(RECOVERY_KEY) === preparedRaw ? null : 'recovery-journal-drift'; }
      catch (_) { return 'recovery-journal-read-failed'; }
    } : null;
    const target = performWriteAttempt(storage, session, attempt, true, guardBeforeTarget);
    issuedOutcomes.delete(target);
    counts.writeCount = target.writeCount;
    counts.rollbackWriteCount = target.rollbackWriteCount;
    if (target.status !== 'committed') {
      legacyStatus = legacyGuard(storage, attempt.candidate.legacyBaseRaw);
      if (checkpointWorkspace && !legacyStatus.canResume) return issue('recovery-required', legacyStatus.legacyError, { rollback: target.rollback, journalRaw: preparedRaw, phase: 'prepared' });
      if (target.status === 'failed') {
        const cleanup = removeOwnedJournal(storage, preparedRaw, attempt.expectedRaw, counts, guardBeforeWrite);
        if (cleanup.ok) return issue('failed', target.error, { rollback: target.rollback });
        return issue('recovery-required', cleanup.error, { rollback: 'recovery-required', journalRaw: preparedRaw, phase: 'prepared' });
      }
      return issue('recovery-required', target.error || 'recovery-target-unverified', { rollback: 'recovery-required', journalRaw: preparedRaw, phase: 'prepared' });
    }
    const confirmedRaw = JSON.stringify(Object.assign({}, journal, { phase: 'confirmed' }));
    const guardBeforeConfirmation = checkpointWorkspace ? () => {
      const error = guardBeforeWrite();
      if (error) return error;
      try { return storage.getItem(STORAGE_KEY) === attempt.serialized ? null : 'confirmation-target-drift'; }
      catch (_) { return 'confirmation-target-read-failed'; }
    } : null;
    const confirmed = replaceJournal(storage, preparedRaw, confirmedRaw, counts, guardBeforeConfirmation);
    if (confirmed.guardBlocked) return issue('recovery-required', confirmed.error, { rollback: 'recovery-required', journalRaw: preparedRaw, phase: 'prepared' });
    // Never route confirmation errors into the prepared target-rollback path.
    let actualJournal;
    let actualTarget;
    try {
      actualJournal = storage.getItem(RECOVERY_KEY);
      actualTarget = storage.getItem(STORAGE_KEY);
    } catch (_) {
      return issue('recovery-required', 'commit-uncertain', { journalRaw: confirmedRaw, phase: 'confirmed', commitUncertain: true });
    }
    if (actualJournal === confirmedRaw && actualTarget === attempt.serialized) {
      legacyStatus = legacyGuard(storage, attempt.candidate.legacyBaseRaw);
      sourceGuard();
      return issue('committed', null, { journalRaw: confirmedRaw, phase: 'confirmed' });
    }
    return issue('recovery-required', confirmed.error || 'commit-confirmation-unverified', {
      journalRaw: actualJournal, phase: actualJournal === preparedRaw ? 'prepared' : actualJournal === confirmedRaw ? 'confirmed' : null,
      commitUncertain: true, rollback: 'recovery-required' });
  }

  /** Explicit recovery only. A confirmed commit is never rolled back by this API. */
  function recoverDurableAttempt(storage, options) {
    const counts = { writeCount: 0, journalWriteCount: 0 };
    const journal = decodeJournal(options && options.expectedJournalRaw, options && options.validateEnvelope);
    const fail = error => Object.assign({ ok: false, status: 'blocked', error }, counts, recoveryLegacyStatus(storage, journal), checkpointWorkspace ? { canResume: false } : {});
    if (!journal || journal.phase !== 'prepared') return fail('invalid-prepared-recovery');
    const initialLegacyError = legacyJournalGuard(storage);
    if (initialLegacyError) return fail(initialLegacyError);
    let currentJournal;
    let currentTarget;
    try {
      currentJournal = storage.getItem(RECOVERY_KEY);
      currentTarget = storage.getItem(STORAGE_KEY);
    } catch (_) { return fail('recovery-read-failed'); }
    // Absence + before supports retry after a cleanup that succeeded but could not be observed.
    if (currentJournal !== options.expectedJournalRaw && !(currentJournal === null && currentTarget === journal.beforeRaw)) return fail('recovery-journal-drift');
    if (currentTarget !== journal.beforeRaw && currentTarget !== journal.candidateRaw) return fail('recovery-target-drift');
    if (currentTarget === journal.candidateRaw && currentTarget !== journal.beforeRaw) {
      try {
        if (storage.getItem(RECOVERY_KEY) !== options.expectedJournalRaw || storage.getItem(STORAGE_KEY) !== currentTarget) return fail('recovery-owner-drift');
        const legacyError = legacyJournalGuard(storage);
        if (legacyError) return fail(legacyError);
        if (checkpointWorkspace && (storage.getItem(RECOVERY_KEY) !== options.expectedJournalRaw || storage.getItem(STORAGE_KEY) !== currentTarget)) return fail('recovery-owner-drift');
        const finalLegacyError = legacyJournalGuard(storage);
        if (finalLegacyError) return fail(finalLegacyError);
        counts.writeCount += 1;
        if (journal.beforeRaw === null) storage.removeItem(STORAGE_KEY);
        else storage.setItem(STORAGE_KEY, journal.beforeRaw);
      } catch (_) { /* Verify actual restoration even when the write throws after changing bytes. */ }
      try { if (storage.getItem(STORAGE_KEY) !== journal.beforeRaw) return fail('recovery-restore-unverified'); }
      catch (_) { return fail('recovery-restore-read-failed'); }
    }
    const cleanup = removeOwnedJournal(storage, options.expectedJournalRaw, journal.beforeRaw, counts);
    if (!cleanup.ok) return fail(cleanup.error);
    const result = Object.freeze(Object.assign({ ok: true, status: 'recovered', journal, beforeRaw: journal.beforeRaw }, counts, recoveryLegacyStatus(storage, journal),
      sourceJournal(journal) ? { requiresSourceReopen: true,
        review: copyPersonalData({ viewOnly: true, scopeId: journal.scopeId, baseline: journal.baseline, draft: journal.draft }) } : {}));
    verifiedRecoveries.add(result);
    return result;
  }

  function resumeRecoveredSession(recovery, options) {
    if (!recovery || !verifiedRecoveries.has(recovery) || !options || typeof options.sessionId !== 'string'
      || !options.sessionId || options.sessionId === recovery.journal.sessionId) throw new Error('invalid-recovered-session');
    if (sourceJournal(recovery.journal)) throw new Error('source-reopen-wrapper-required');
    if (checkpointWorkspace) {
      if (recovery.canResume !== true || !options.storage) throw new Error('legacy-recovery-locked');
      const legacyStatus = recoveryLegacyStatus(options.storage, recovery.journal);
      if (!legacyStatus.canResume) throw new Error(legacyStatus.legacyError);
      try {
        if (options.storage.getItem(STORAGE_KEY) !== recovery.beforeRaw || options.storage.getItem(RECOVERY_KEY) !== null) throw new Error('recovered-workspace-drift');
      } catch (_) { throw new Error('recovered-workspace-unverified'); }
    }
    const journal = recovery.journal;
    const personal = journal.version === PERSONAL_PLAN_RECOVERY_VERSION && journal.draftContract === PERSONAL_PLAN_DRAFT_CONTRACT;
    const baseline = personal ? createPersonalPlanSession({ sessionId: options.sessionId, flowRef: journal.scopeId,
      checkpoint: checkpointBefore(journal.beforeRaw, JSON.parse(journal.candidateRaw).legacyBaseRaw), returnPoint: options.returnPoint })
      : createSession({ sessionId: options.sessionId, kind: journal.kind, scopeId: journal.scopeId,
        draft: journal.baseline, returnPoint: options.returnPoint });
    if (personal && !equalData(baseline.baseline, journal.baseline)) throw new Error('invalid-recovered-baseline');
    const updated = updateDraft(baseline, journal.draft);
    if (!updated.ok) throw new Error('invalid-recovered-draft');
    verifiedRecoveries.delete(recovery);
    return updated.session;
  }

  function resumeRecoveredSourceBoundPersonalPlanSession(storage, recovery, options) {
    return resumeRecoveredSourcePlanSession(storage, recovery, options, SOURCE_PLAN_DRAFT_CONTRACT);
  }

  function resumeRecoveredSourceBoundPersonalPlanStructureSession(storage, recovery, options) {
    return resumeRecoveredSourcePlanSession(storage, recovery, options, STRUCTURE_PLAN_DRAFT_CONTRACT);
  }

  function resumeRecoveredSourcePlanSession(storage, recovery, options, contract) {
    const rejected = reason => ({ ok: false, reason, requiresSourceReopen: true,
      review: recovery && verifiedRecoveries.has(recovery) ? recovery.review : undefined });
    if (!checkpointWorkspace || !recovery || !verifiedRecoveries.has(recovery) || recovery.journal.version !== sourceContract(contract).journalVersion
      || recovery.journal.draftContract !== contract
      || !options || typeof options.sessionId !== 'string' || !options.sessionId || options.sessionId === recovery.journal.sessionId) return rejected('invalid-recovered-source-session');
    const journal = recovery.journal;
    try {
      if (!recovery.canResume) return rejected('legacy-recovery-locked');
      const legacy = recoveryLegacyStatus(storage, journal);
      if (!legacy.canResume) return rejected(legacy.legacyError);
      if (storage.getItem(STORAGE_KEY) !== recovery.beforeRaw || storage.getItem(RECOVERY_KEY) !== null) return rejected('recovered-workspace-drift');
      const observation = sourceObservation(storage, options.readSourceEpoch);
      if (observation.sourceRead.raw !== journal.sourceReadSnapshot.raw) return rejected('source-reopen-changed');
      const checkpoint = checkpointBefore(journal.beforeRaw, JSON.parse(journal.candidateRaw).legacyBaseRaw);
      const fresh = createSourcePlanSession(storage, { checkpoint, flowRef: journal.scopeId, sessionId: options.sessionId,
        returnPoint: options.returnPoint, readSourceEpoch: options.readSourceEpoch }, contract);
      const binding = rootBinding(fresh);
      if (binding.sourceRaw !== journal.sourceReadSnapshot.raw || binding.sourceEpoch !== observation.sourceEpoch
        || !equalData(fresh.baseline, journal.baseline)) return rejected('source-reopen-baseline-changed');
      const updated = updateDraft(fresh, journal.draft);
      if (!updated.ok || !updated.session.valid) return rejected(updated.error || 'invalid-recovered-source-draft');
      if (storage.getItem(STORAGE_KEY) !== recovery.beforeRaw || storage.getItem(RECOVERY_KEY) !== null) return rejected('recovered-workspace-drift');
      const finalLegacy = recoveryLegacyStatus(storage, journal);
      if (!finalLegacy.canResume) return rejected(finalLegacy.legacyError);
      const finalSource = checkSourceBinding(storage, updated.session, options.readSourceEpoch);
      if (!finalSource.ok) return rejected(finalSource.reason);
      verifiedRecoveries.delete(recovery);
      return { ok: true, session: updated.session, requiresSourceReopen: false, sourceBoundary: CAPTURED_SOURCE_BOUNDARY };
    } catch (error) { return rejected(error.message || 'source-reopen-failed'); }
  }

  /** Coordinator cleanup after durable success; it cannot mutate target or undo a commit. */
  function clearConfirmedRecovery(storage, options) {
    const counts = { writeCount: 0, journalWriteCount: 0 };
    const journal = decodeJournal(options && options.expectedJournalRaw, options && options.validateEnvelope);
    if (!journal || journal.phase !== 'confirmed') return Object.assign({ ok: false, status: 'blocked', error: 'invalid-confirmed-recovery' }, counts, recoveryLegacyStatus(storage, null));
    const result = removeOwnedJournal(storage, options.expectedJournalRaw, journal.candidateRaw, counts);
    return Object.assign({ ok: result.ok, status: result.ok ? 'cleared' : 'blocked', error: result.error || null,
      journal, candidateRaw: journal.candidateRaw }, counts, recoveryLegacyStatus(storage, journal), checkpointWorkspace && !result.ok ? { canResume: false } : {},
      sourceJournal(journal) ? { requiresSourceReopen: true } : {});
  }

  function finishSave(session, attempt, outcome) {
    if (!ownsAttempt(session, attempt) || !outcome || issuedOutcomes.get(outcome) !== session
      || outcome.attemptId !== attempt.attemptId || outcome.submission !== session.submission) return reject(session, 'stale-save-outcome');
    // A duplicate caller cannot issue two close/receipt effects for one outcome.
    issuedOutcomes.delete(outcome);
    if (checkpointWorkspace && outcome.canResume !== true && (outcome.status === 'committed' || outcome.status === 'unchanged')) {
      const next = replaceSession(session, { status: 'recovery-required', error: outcome.sourceError || outcome.legacyError || 'legacy-base-unverified' });
      return stateResult(next, 'blocked', { ok: false, error: next.error, outcome, changed: outcome.changed });
    }
    if (outcome.status === 'committed' || outcome.status === 'unchanged') return stateResult(null, 'close', {
      ok: true, returnPoint: session.returnPoint, closedSession: session, outcome,
      changed: outcome.status === 'committed', candidate: attempt.candidate });
    const recovery = outcome.status === 'recovery-required';
    const next = replaceSession(session, { status: recovery ? 'recovery-required' : 'recoverable-error', error: outcome.error });
    return stateResult(next, recovery ? 'blocked' : 'error', { ok: false, error: outcome.error, outcome });
  }

  return Object.freeze({ VERSION, WORKSPACE_PAIR, STORAGE_KEY, RECOVERY_VERSION, RECOVERY_KEY, PERSONAL_PLAN_RECOVERY_VERSION, PERSONAL_PLAN_DRAFT_CONTRACT,
    SOURCE_PLAN_RECOVERY_VERSION, SOURCE_PLAN_DRAFT_CONTRACT, SOURCE_STORAGE_KEY,
    STRUCTURE_PLAN_RECOVERY_VERSION, STRUCTURE_PLAN_DRAFT_CONTRACT,
    createForWorkspace, CLOSE_REASONS, equalData, validDraft, locked, createPersonalPlanSession, beginPersonalPlanSave,
    createSourceBoundPersonalPlanSession, checkSourceBoundPersonalPlanSession, createSourceBoundPersonalPlanChild,
    applySourceBoundPersonalPlanChild, beginSourceBoundPersonalPlanSave, retrySourceBoundPersonalPlanSave, resumeRecoveredSourceBoundPersonalPlanSession,
    createSourceBoundPersonalPlanStructureSession, checkSourceBoundPersonalPlanStructureSession, createSourceBoundPersonalPlanStructureChild,
    applySourceBoundPersonalPlanStructureChild, beginSourceBoundPersonalPlanStructureSave, retrySourceBoundPersonalPlanStructureSave, resumeRecoveredSourceBoundPersonalPlanStructureSession,
    createSession, updateDraft, requestClose, continueEditing, discardChanges,
    createChildSession, applyChild, beginSave, retrySave, writeAttempt, finishSave,
    writeDurableAttempt, loadRecovery, recoverDurableAttempt, resumeRecoveredSession, clearConfirmedRecovery });
  }
  return createForWorkspace('legacy-v1');
});
