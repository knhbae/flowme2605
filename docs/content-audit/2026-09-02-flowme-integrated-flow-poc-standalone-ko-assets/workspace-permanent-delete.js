/* Pure explicit-deletion plan. No storage, journal, DOM, or ambient clock. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => ({ model: require('./model.js'), checkpoint: require('./workspace-checkpoint.js') }), () => require('./source-update-runtime.cjs').loadCommonJs(), () => require('./personal-plan-context.js'));
  else root.FlowPocWorkspacePermanentDelete = factory(() => ({ model: root.FlowMeIntegratedPoc, checkpoint: root.FlowPocWorkspaceCheckpoint }), () => root.FlowMePersonalWorkspaceSourceUpdate, () => root.FlowPocPersonalPlanContext);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (loadDependencies, loadSourceRuntime, loadPersonalPlan) {
  'use strict';
  const VERSION = 1;
  const META = 'timelineContextV1';
  const PLAN_META = 'personalPlanContextV1';
  const PLAN_CONTRACT = 'flowme-standalone-personal-plan-context-v1';
  const STATE_KEYS = ['version', 'revision', 'updatedAt', 'folders', 'flows', 'tasks', 'orders', 'occurrenceOverrides', 'trashEntries', 'quickConversionReceipts', 'lastReceipt', META, PLAN_META];
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const copy = value => JSON.parse(JSON.stringify(value));
  const signature = value => value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(signature).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + signature(value[key])).join(',') + '}';
  const exactKeys = (value, keys) => record(value) && Object.keys(value).length === keys.length && keys.every(key => own(value, key));
  const fail = reason => { throw new Error(reason); };
  const canonicalRef = value => 'saved-flow:' + encodeURIComponent(value.savedCopyId) + ':' + encodeURIComponent(value.sourceFlowId);
  const flowMatches = (flow, target) => target.kind === 'flow' && flow.savedCopyId === target.savedCopyId && flow.sourceFlowId === target.sourceFlowId && flow.ref === target.ref;
  const targetKeys = target => target && target.kind === 'flow' ? ['kind', 'id', 'savedCopyId', 'sourceFlowId', 'ref'] : ['kind', 'id'];
  function validTarget(target) {
    try {
      return exactKeys(target, targetKeys(target)) && ['flow', 'quick'].includes(target.kind) && typeof target.id === 'string' && /^[a-z0-9_-]+$/i.test(target.id)
        && (target.kind === 'quick' || (typeof target.savedCopyId === 'string' && Boolean(target.savedCopyId) && typeof target.sourceFlowId === 'string' && Boolean(target.sourceFlowId) && target.ref === canonicalRef(target)));
    } catch (error) { return false; }
  }
  function unchanged(input, reason, ok = false) {
    return { ok, changed: false, ...(reason ? { reason } : {}), checkpoint: input && input.checkpoint, legacyRaw: input && input.checkpoint && input.checkpoint.legacyBaseRaw, sourceCandidateRaw: input && input.sourceCandidateRaw, footprint: {}, writes: [] };
  }
  function dependencies(options) {
    const supplied = options || {};
    const loaded = supplied.model && supplied.checkpoint ? supplied : loadDependencies();
    const model = supplied.model || loaded.model;
    const checkpoint = supplied.checkpoint || loaded.checkpoint;
    if (!model || model.VERSION !== 1 || typeof model.validate !== 'function' || typeof model.seedState !== 'function'
      || !checkpoint || checkpoint.VERSION !== 2 || typeof checkpoint.validateCheckpoint !== 'function') fail('delete-dependencies-unavailable');
    return { model, checkpoint };
  }
  function hasUnknown(value, keys) { return !record(value) || Object.keys(value).some(key => !keys.includes(key)); }
  function inspectPlanMetadata(state, target) {
    if (!own(state, PLAN_META)) return;
    const adapter = loadPersonalPlan();
    if (!adapter || adapter.VERSION !== 1 || adapter.CONTRACT !== PLAN_CONTRACT || adapter.METADATA_KEY !== PLAN_META
      || typeof adapter.projectPersonalPlanState !== 'function' || !adapter.projectPersonalPlanState(state).ok) fail('delete-scope-unproven');
    // Validate raw authority, then discard the view. Never scrub a projection.
    if (target.kind === 'flow' && own(state[PLAN_META].entries, target.ref)) {
      const binding = state[PLAN_META].entries[target.ref].binding;
      if (binding.flowRef !== target.ref || binding.savedCopyId !== target.savedCopyId || binding.sourceFlowId !== target.sourceFlowId
        || !state.flows.some(flow => flowMatches(flow, target) && flow.id === binding.localFlowId)) fail('delete-owner-conflict');
    }
  }
  function inspectState(state, target) {
    if (hasUnknown(state, STATE_KEYS)) fail('delete-scope-unproven');
    inspectPlanMetadata(state, target);
    const matching = state.flows.filter(flow => flowMatches(flow, target));
    if (matching.length > 1) fail('delete-owner-conflict');
    if (target.kind === 'flow' && state.flows.some(flow => (flow.id === target.id || flow.ref === target.ref || (flow.savedCopyId === target.savedCopyId && flow.sourceFlowId === target.sourceFlowId)) && !flowMatches(flow, target))) fail('delete-owner-conflict');
    if (target.kind === 'quick' && state.tasks.some(task => task.id === target.id && task.flowId !== null)) fail('delete-owner-conflict');
    const flowIds = new Set(matching.map(flow => flow.id));
    const tasks = state.tasks.filter(task => target.kind === 'quick' ? task.id === target.id && task.flowId === null : flowIds.has(task.flowId));
    for (const context of Object.keys(state.orders)) {
      if (['today', 'week', 'month', 'undated'].includes(context)) continue;
      if (/^folder:[a-z0-9_-]+$/i.test(context)) continue;
      if (/^flow:[a-z0-9_-]+(?::[a-z0-9_-]+)?$/i.test(context)) continue;
      fail('delete-scope-unproven');
    }
    if (state.lastReceipt !== undefined && state.lastReceipt !== null && (!record(state.lastReceipt) || typeof state.lastReceipt.flowId !== 'string' || !state.flows.some(flow => flow.id === state.lastReceipt.flowId))) fail('delete-scope-unproven');
    return { state, flowIds, taskIds: new Set(tasks.map(task => task.id)), taskRefs: new Set(tasks.map(task => task.ref).filter(Boolean)) };
  }
  function inspectOwners(states, target) {
    const owners = states.map(state => inspectState(state, target));
    const flowIds = new Set(owners.flatMap(owner => [...owner.flowIds]));
    const taskIds = new Set(owners.flatMap(owner => [...owner.taskIds]));
    const taskRefs = new Set(owners.flatMap(owner => [...owner.taskRefs]));
    // Historical local IDs are not proof if another entity now owns the ID.
    for (const owner of owners) {
      if (owner.state.flows.some(flow => flowIds.has(flow.id) && !flowMatches(flow, target))) fail('delete-owner-conflict');
      if (owner.state.tasks.some(task => (taskIds.has(task.id) || (task.ref && taskRefs.has(task.ref))) && !owner.taskIds.has(task.id))) fail('delete-owner-conflict');
    }
    const conversions = new Map();
    const flowBinding = flow => ({ flowId: flow.id, savedCopyId: flow.savedCopyId, sourceFlowId: flow.sourceFlowId, ref: flow.ref });
    for (const owner of owners) for (const receipt of owner.state.quickConversionReceipts || []) {
      const flow = owner.state.flows.find(entry => entry.id === receipt.flowId);
      if (!flow) fail('delete-scope-unproven');
      const binding = { ...flowBinding(flow), sourceQuickItemId: receipt.sourceQuickItemId };
      const previous = conversions.get(receipt.conversionId);
      if (previous && signature(previous) !== signature(binding)) fail('delete-scope-unproven');
      conversions.set(receipt.conversionId, binding);
    }
    // A historical conversion ID alone cannot authorize deleting an event that
    // now claims another Flow. Prove the event joins the same independent copy.
    for (const owner of owners) {
      const event = owner.state.lastReceipt;
      if (!event || (!own(event, 'conversionId') && event.operation !== 'convert-quick-item-to-flow')) continue;
      const binding = conversions.get(event.conversionId);
      const flow = owner.state.flows.find(entry => entry.id === event.flowId);
      if (!binding || !flow || signature(flowBinding(flow)) !== signature({ flowId: binding.flowId, savedCopyId: binding.savedCopyId, sourceFlowId: binding.sourceFlowId, ref: binding.ref })
        || (own(event, 'sourceQuickItemId') && event.sourceQuickItemId !== binding.sourceQuickItemId)) fail('delete-scope-unproven');
    }
    const conversionIds = new Set([...conversions].filter(([, binding]) => flowIds.has(binding.flowId) || (target.kind === 'quick' && binding.sourceQuickItemId === target.id)).map(([id]) => id));
    return { flowIds, taskIds, taskRefs, conversionIds };
  }
  function scrubState(original, target, globalOwner) {
    const next = copy(original);
    const info = inspectState(original, target);
    const counts = { flows: info.flowIds.size, tasks: info.taskIds.size, orders: 0, occurrences: 0, receipts: 0 };
    if (own(next, PLAN_META)) {
      counts.personalPlanEntries = 0;
      if (target.kind === 'flow' && own(next[PLAN_META].entries, target.ref)) {
        delete next[PLAN_META].entries[target.ref];
        counts.personalPlanEntries = 1;
      }
      if (Object.keys(next[PLAN_META].entries).length === 0) delete next[PLAN_META];
    }
    next.flows = next.flows.filter(flow => !info.flowIds.has(flow.id));
    next.tasks = next.tasks.filter(task => !info.taskIds.has(task.id));
    for (const [context, ids] of Object.entries(next.orders)) {
      if (context.startsWith('flow:') && globalOwner.flowIds.has(context.split(':')[1])) { delete next.orders[context]; counts.orders += 1; }
      else { const filtered = ids.filter(id => !globalOwner.taskIds.has(id)); if (filtered.length !== ids.length) { next.orders[context] = filtered; counts.orders += 1; } }
    }
    if (Array.isArray(next.trashEntries)) next.trashEntries = next.trashEntries.filter(entry => !(target.kind === 'quick' ? entry.kind === 'quick' && entry.id === target.id : entry.kind === 'flow' && globalOwner.flowIds.has(entry.id)));
    if (record(next.occurrenceOverrides)) for (const [key, override] of Object.entries(next.occurrenceOverrides)) {
      if (globalOwner.taskRefs.has(override.sourceItemRef)) { delete next.occurrenceOverrides[key]; counts.occurrences += 1; }
    }
    const conversions = (next.quickConversionReceipts || []).filter(receipt => globalOwner.flowIds.has(receipt.flowId) || (target.kind === 'quick' && receipt.sourceQuickItemId === target.id));
    const conversionIds = new Set(conversions.map(receipt => receipt.conversionId));
    if (Array.isArray(next.quickConversionReceipts)) next.quickConversionReceipts = next.quickConversionReceipts.filter(receipt => !conversionIds.has(receipt.conversionId));
    counts.receipts += conversions.length;
    if (next.lastReceipt && (globalOwner.flowIds.has(next.lastReceipt.flowId) || globalOwner.conversionIds.has(next.lastReceipt.conversionId))) { next.lastReceipt = null; counts.receipts += 1; }
    if (next[META]) next[META].records.forEach(order => { order.orderedRefKeys = order.orderedRefKeys.filter(id => !globalOwner.taskIds.has(id)); });
    return { state: next, counts };
  }
  function sourceOwnerMatches(owner, target) {
    return target.kind === 'flow' && owner.flowRef === target.ref && owner.savedCopyId === target.savedCopyId && owner.flowId === target.sourceFlowId;
  }
  function scrubSource(raw, target, now, options) {
    if (raw === null) return { raw, removed: 0 };
    let store;
    try { store = JSON.parse(raw); } catch (error) { fail('invalid-source-store'); }
    const runtime = options && options.sourceRuntime || loadSourceRuntime();
    if (!runtime || typeof runtime.isPersonalWorkspacePocSourceCandidateStore !== 'function') fail('source-runtime-unavailable');
    if (!runtime.isPersonalWorkspacePocSourceCandidateStore(store)) fail('invalid-source-store');
    if (target.kind === 'quick') return { raw, removed: 0 };
    const remove = new Set();
    for (const [id, envelope] of Object.entries(store.envelopes)) {
      if ((envelope.target.flowRef === target.ref || (envelope.target.savedCopyId === target.savedCopyId && envelope.target.flowId === target.sourceFlowId)) && !sourceOwnerMatches(envelope.target, target)) fail('delete-scope-unproven');
      if (sourceOwnerMatches(envelope.target, target)) remove.add(id);
    }
    if (!remove.size) return { raw, removed: 0 };
    const next = copy(store);
    remove.forEach(id => { delete next.envelopes[id]; delete next.reviews[id]; });
    for (const [key, value] of Object.entries(next.effectiveVersions)) {
      if (key === target.ref || value.targetFlowRef === target.ref || remove.has(value.candidateId)) {
        if (key !== target.ref || value.targetFlowRef !== target.ref || !remove.has(value.candidateId)) fail('delete-scope-unproven');
        delete next.effectiveVersions[key];
      }
    }
    if (next.undo) {
      if (next.undo.flowRef === target.ref || remove.has(next.undo.candidateId)) {
        if (next.undo.flowRef !== target.ref || !remove.has(next.undo.candidateId)) fail('delete-scope-unproven');
        // An unrelated previous effective version is not owned by this deletion.
        if (next.undo.previousEffectiveVersion && next.undo.previousEffectiveVersion.targetFlowRef !== target.ref) fail('delete-scope-unproven');
        delete next.undo;
      } else if (next.undo.previousEffectiveVersion && (next.undo.previousEffectiveVersion.targetFlowRef === target.ref || remove.has(next.undo.previousEffectiveVersion.candidateId))) fail('delete-scope-unproven');
    }
    if (!Number.isSafeInteger(next.revision) || next.revision >= Number.MAX_SAFE_INTEGER) fail('source-revision-overflow');
    next.revision += 1;
    next.updatedAt = now;
    if (!runtime.isPersonalWorkspacePocSourceCandidateStore(next)) fail('delete-scope-unproven');
    return { raw: JSON.stringify(next), removed: remove.size };
  }
  function planPermanentDelete(input, options) {
    if (!record(input)) return unchanged(input, 'invalid-delete-request');
    if (input.confirmed !== true) return unchanged(input, 'confirmation-required');
    if (!validTarget(input.target)) return unchanged(input, 'invalid-delete-target');
    if (!own(input, 'sourceCandidateRaw') || (input.sourceCandidateRaw !== null && typeof input.sourceCandidateRaw !== 'string')) return unchanged(input, 'source-owner-unverified');
    if (typeof input.now !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.now) || !Number.isFinite(Date.parse(input.now)) || new Date(input.now).toISOString() !== input.now) return unchanged(input, 'invalid-delete-time');
    try {
      const deps = dependencies(options);
      const cp = input.checkpoint;
      if (!deps.checkpoint.validateCheckpoint(cp).ok) return unchanged(input, 'invalid-checkpoint');
      if (!Number.isSafeInteger(input.expectedRevision) || input.expectedRevision !== cp.state.revision) return unchanged(input, 'stale-state-revision');
      const target = input.target;
      const currentOwner = inspectState(cp.state, target);
      if (target.kind === 'flow' && !currentOwner.flowIds.has(target.id)) return unchanged(input, 'target-not-found');
      if (target.kind === 'quick' && !currentOwner.taskIds.has(target.id)) return unchanged(input, 'target-not-found');
      if (!(cp.state.trashEntries || []).some(entry => entry.kind === target.kind && entry.id === target.id)) return unchanged(input, 'target-not-in-trash');
      if (cp.state.revision >= Number.MAX_SAFE_INTEGER) return unchanged(input, 'revision-overflow');
      const base = cp.legacyBaseRaw === null ? { version: 1, state: deps.model.seedState(), undo: null } : JSON.parse(cp.legacyBaseRaw);
      if (hasUnknown(base, ['version', 'state', 'undo'])) return unchanged(input, 'delete-scope-unproven');
      const allStates = [base.state, ...(base.undo ? [base.undo] : []), cp.state, ...(cp.undo ? [cp.undo] : []), cp.state[META].legacySnapshot, ...(cp.undo ? [cp.undo[META].legacySnapshot] : [])];
      const owners = inspectOwners(allStates, target);
      const oldState = scrubState(base.state, target, owners);
      const oldUndo = base.undo === null ? null : scrubState(base.undo, target, owners);
      const nextBase = { version: 1, state: oldState.state, undo: oldUndo ? oldUndo.state : null };
      if (deps.model.validate(nextBase.state).length || (nextBase.undo && deps.model.validate(nextBase.undo).length)) return unchanged(input, 'delete-legacy-validation-failed');
      const legacyRaw = signature(base) === signature(nextBase) ? cp.legacyBaseRaw : JSON.stringify(nextBase);
      const bindings = new Map([[signature(base.state), oldState.state]]);
      if (base.undo) bindings.set(signature(base.undo), oldUndo.state);
      const active = scrubState(cp.state, target, owners);
      const snapshot = bindings.get(signature(cp.state[META].legacySnapshot));
      if (!snapshot) return unchanged(input, 'delete-provenance-unproven');
      active.state[META].legacySnapshot = copy(snapshot);
      active.state.revision += 1;
      active.state.updatedAt = input.now;
      const candidate = { version: cp.version, contract: cp.contract, legacyBaseRaw: legacyRaw, state: active.state, undo: null };
      if (!deps.checkpoint.validateCheckpoint(candidate).ok) return unchanged(input, 'delete-checkpoint-validation-failed');
      const source = scrubSource(input.sourceCandidateRaw, target, input.now, options);
      const writes = [];
      if (legacyRaw !== cp.legacyBaseRaw) writes.push({ key: deps.model.STORAGE_KEY, beforeRaw: cp.legacyBaseRaw, afterRaw: legacyRaw });
      if (source.raw !== input.sourceCandidateRaw) writes.push({ key: deps.model.SOURCE_CANDIDATE_STORAGE_KEY, beforeRaw: input.sourceCandidateRaw, afterRaw: source.raw });
      // The coordinator must pair this candidate with its separately read exact
      // v2 beforeRaw. Including a reconstructed beforeRaw would be unsafe CAS.
      return { ok: true, changed: true, checkpoint: candidate, legacyRaw, sourceCandidateRaw: source.raw, checkpointRaw: JSON.stringify(candidate), footprint: { legacyState: oldState.counts, legacyUndo: oldUndo ? oldUndo.counts : null, active: active.counts, sourceCandidates: source.removed, clearedActiveUndo: cp.undo !== null }, writes };
    } catch (error) {
      const known = ['delete-dependencies-unavailable', 'delete-scope-unproven', 'delete-owner-conflict', 'invalid-source-store', 'source-runtime-unavailable', 'source-revision-overflow'];
      return unchanged(input, known.includes(error && error.message) ? error.message : 'delete-planning-failed');
    }
  }
  return Object.freeze({ VERSION, planPermanentDelete });
});
