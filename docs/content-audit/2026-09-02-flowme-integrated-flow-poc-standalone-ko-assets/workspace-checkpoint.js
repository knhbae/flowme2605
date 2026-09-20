/* Pure workspace-v2 packet contract. No storage reader/writer or DOM access. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => ({ model: require('./model.js'), timeline: require('./timeline-context.js') }), () => require('./personal-plan-context.js'));
  else root.FlowPocWorkspaceCheckpoint = factory(() => ({ model: root.FlowMeIntegratedPoc, timeline: root.FlowPocTimelineContext }), () => root.FlowPocPersonalPlanContext);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (loadDependencies, loadPersonalPlan) {
  'use strict';

  const VERSION = 2;
  const CONTRACT = 'flowme-standalone-workspace-checkpoint-v2';
  const LEGACY_STORAGE_KEY = 'flow:poc:personal-workspace:v1:standalone-integrated';
  const STORAGE_KEY = LEGACY_STORAGE_KEY + ':workspace-v2';
  const METADATA_KEY = 'timelineContextV1';
  const PLAN_METADATA_KEY = 'personalPlanContextV1';
  const PLAN_CONTRACT = 'flowme-standalone-personal-plan-context-v1';
  const TIMELINE_VIEWS = ['today', 'week', 'month', 'undated'];
  const seedBaselines = new WeakMap();
  const sourceEditorCheckpoints = new WeakMap();
  const sourceStructureEditorCheckpoints = new WeakMap();
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const copy = value => JSON.parse(JSON.stringify(value));
  const fail = (reason, details) => Object.assign({ ok: false, reason }, details);
  const token = value => value.context + ':' + value.contextKey;
  const exactKeys = (value, expected) => isRecord(value) && Object.keys(value).length === expected.length && expected.every(key => own(value, key));

  function dependencies(options) {
    const injected = options || {};
    const loaded = injected.model && injected.timeline ? injected : loadDependencies();
    const model = injected.model || loaded.model;
    const timeline = injected.timeline || loaded.timeline;
    if (!model || model.VERSION !== 1 || typeof model.validate !== 'function' || typeof model.apply !== 'function' || typeof model.seedState !== 'function' || typeof model.isTrashedTask !== 'function'
      || !timeline || timeline.VERSION !== 1 || typeof timeline.selectTimelineGroups !== 'function' || typeof timeline.projectLegacyTimeline !== 'function' || !timeline.isPlainDate(model.TODAY)) throw new Error('checkpoint-dependencies-unavailable');
    // Trusted module injection only; never read a trust flag from persisted data.
    return { model, timeline, personalPlan: () => personalPlanDependency(injected) };
  }

  function personalPlanDependency(options) {
    const adapter = own(options, 'personalPlan') ? options.personalPlan : loadPersonalPlan();
    if (!adapter || adapter.VERSION !== 1 || adapter.CONTRACT !== PLAN_CONTRACT || adapter.METADATA_KEY !== PLAN_METADATA_KEY
      || ['inspectPlanContext', 'normalizePlanDraft', 'projectPersonalPlanState', 'planPersonalPlanState'].some(name => typeof adapter[name] !== 'function')) throw new Error('personal-plan-dependencies-unavailable');
    return adapter;
  }

  function sourceBoundPlanDependency(deps) {
    const adapter = deps.personalPlan();
    if (['readPersonalPlanSourceContext', 'checkPersonalPlanSourceContext', 'inspectPersonalPlanSourceEditor', 'planPersonalPlanSourceState']
      .some(name => typeof adapter[name] !== 'function')) throw new Error('source-bound-plan-dependencies-unavailable');
    return adapter;
  }

  function sourceBoundStructureDependency(deps) {
    const adapter = sourceBoundPlanDependency(deps);
    if (adapter.STRUCTURE_DRAFT_VERSION !== 2 || adapter.STRUCTURE_METADATA_VERSION !== 2
      || adapter.STRUCTURE_CONTRACT !== 'flowme-standalone-personal-plan-context-v2'
      || ['inspectPersonalPlanStructureEditor', 'validateCapturedPersonalPlanStructureDraft',
        'planPersonalPlanStructureState', 'readPersonalPlanStructureView'].some(name => typeof adapter[name] !== 'function')) {
      throw new Error('source-bound-structure-dependencies-unavailable');
    }
    return adapter;
  }

  function exactDataFields(value, fields) {
    return exactKeys(value, fields) && Object.getOwnPropertyNames(value).length === fields.length && !Object.getOwnPropertySymbols(value).length
      && fields.every(key => { const descriptor = Object.getOwnPropertyDescriptor(value, key); return descriptor && own(descriptor, 'value'); });
  }

  function nativePrototype(proto, name) {
    if (!proto || Object.getOwnPropertyDescriptor(proto, 'toJSON')) return false;
    const constructor = Object.getOwnPropertyDescriptor(proto, 'constructor');
    if (!constructor || !own(constructor, 'value') || typeof constructor.value !== 'function'
      || Function.prototype.toString.call(constructor.value) !== 'function ' + name + '() { [native code] }') return false;
    const prototype = Object.getOwnPropertyDescriptor(constructor.value, 'prototype');
    return Boolean(prototype && own(prototype, 'value') && prototype.value === proto);
  }

  /* Compare JSON values and array order; harmless object key ordering is not
     provenance. Reject lossy JSON inputs before clone can erase their values. */
  function signature(value, parents = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
    if (!value || typeof value !== 'object' || parents.has(value) || Object.getOwnPropertySymbols(value).length) throw new Error('invalid-json-data');
    if (!Array.isArray(value) && Object.prototype.toString.call(value) !== '[object Object]') throw new Error('invalid-json-data');
    parents.add(value);
    let result;
    if (Array.isArray(value)) {
      const proto = Object.getPrototypeOf(value);
      const objectProto = proto && Object.getPrototypeOf(proto);
      if (!nativePrototype(proto, 'Array') || !objectProto || Object.getPrototypeOf(objectProto) !== null || !nativePrototype(objectProto, 'Object')
        || Object.getOwnPropertyNames(value).length !== value.length + 1 || Object.keys(value).length !== value.length) throw new Error('invalid-json-array');
      // Read descriptors before values: a rejected getter must never execute.
      result = '[' + Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !own(descriptor, 'value') || descriptor.enumerable !== true) throw new Error('invalid-json-array');
        return signature(descriptor.value, parents);
      }).join(',') + ']';
    } else {
      if (Object.getOwnPropertySymbols(value).length) throw new Error('invalid-json-data');
      result = '{' + Object.keys(value).sort().map(key => {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !own(descriptor, 'value')) throw new Error('invalid-json-data');
        return JSON.stringify(key) + ':' + signature(descriptor.value, parents);
      }).join(',') + '}';
    }
    parents.delete(value);
    return result;
  }

  function freezeOwn(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freezeOwn); Object.freeze(value); }
    return value;
  }

  function legacyStateCheck(state, model) {
    if (!isRecord(state) || !own(state, 'version') || state.version !== 1) return fail('invalid-legacy-state');
    if (own(state, METADATA_KEY) || own(state, PLAN_METADATA_KEY)) return fail('legacy-reserved-field-collision');
    signature(state);
    const errors = model.validate(state);
    if (!Array.isArray(errors) || errors.length) return fail('invalid-legacy-state');
    return { ok: true };
  }

  function baseline(raw, deps) {
    if (raw !== null && typeof raw !== 'string') return fail('invalid-legacy-raw');
    let envelope;
    if (raw === null) {
      if (!seedBaselines.has(deps.model)) {
        const seed = deps.model.seedState();
        const checked = legacyStateCheck(seed, deps.model);
        if (!checked.ok) return checked;
        seedBaselines.set(deps.model, freezeOwn(copy(seed)));
      }
      envelope = { version: 1, state: seedBaselines.get(deps.model), undo: null };
    } else {
      try { envelope = JSON.parse(raw); } catch (error) { return fail('invalid-legacy-json'); }
      if (!isRecord(envelope) || envelope.version !== 1 || !own(envelope, 'state') || !own(envelope, 'undo')) return fail('invalid-legacy-envelope');
    }
    const current = legacyStateCheck(envelope.state, deps.model);
    if (!current.ok) return current;
    if (envelope.undo !== null) {
      const previous = legacyStateCheck(envelope.undo, deps.model);
      if (!previous.ok) return previous;
    }
    return { ok: true, envelope, signatures: [signature(envelope.state)].concat(envelope.undo === null ? [] : [signature(envelope.undo)]) };
  }

  function validContext(value, timeline) {
    return ['date', 'undated', 'overdue'].includes(value.context)
      && (value.context === 'undated' ? value.contextKey === 'undated' : timeline.isPlainDate(value.contextKey));
  }

  function stateCheck(state, base, deps) {
    if (!isRecord(state) || !own(state, 'version') || state.version !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0) return fail('invalid-checkpoint-state');
    if (!isRecord(state.orders) || TIMELINE_VIEWS.some(view => own(state.orders, view))) return fail('active-legacy-timeline-order');
    const errors = deps.model.validate(state);
    if (!Array.isArray(errors) || errors.length) return fail('invalid-checkpoint-domain');
    const metadata = state[METADATA_KEY];
    if (!exactKeys(metadata, ['version', 'records', 'resolvedContexts', 'legacySnapshot']) || metadata.version !== 1 || !Array.isArray(metadata.records) || !Array.isArray(metadata.resolvedContexts)) return fail('invalid-timeline-metadata');
    const legacy = legacyStateCheck(metadata.legacySnapshot, deps.model);
    if (!legacy.ok) return legacy;
    if (!base.signatures.includes(signature(metadata.legacySnapshot))) return fail('legacy-snapshot-binding-mismatch');
    const resolved = new Set();
    for (const context of metadata.resolvedContexts) {
      if (!exactKeys(context, ['context', 'contextKey']) || !validContext(context, deps.timeline) || resolved.has(token(context))) return fail('invalid-resolved-context');
      resolved.add(token(context));
    }
    const records = new Set();
    for (const order of metadata.records) {
      if (!exactKeys(order, ['context', 'contextKey', 'orderedRefKeys', 'revision']) || !validContext(order, deps.timeline)
        || !Number.isSafeInteger(order.revision) || order.revision < 0 || order.revision > state.revision
        || !Array.isArray(order.orderedRefKeys) || order.orderedRefKeys.some(id => typeof id !== 'string' || !/^[a-z0-9_-]+$/i.test(id))
        || new Set(order.orderedRefKeys).size !== order.orderedRefKeys.length || records.has(token(order)) || !resolved.has(token(order))) return fail('invalid-timeline-record');
      records.add(token(order));
    }
    if (own(state, PLAN_METADATA_KEY)) {
      // The effective copy is read-only and must not replace checkpoint raw.
      const plan = deps.personalPlan().projectPersonalPlanState(state);
      if (!plan.ok) return fail(plan.reason || 'invalid-personal-plan-metadata');
    }
    return { ok: true };
  }

  function validateWith(checkpoint, deps) {
    signature(checkpoint);
    if (!exactKeys(checkpoint, ['version', 'contract', 'legacyBaseRaw', 'state', 'undo']) || checkpoint.version !== VERSION || checkpoint.contract !== CONTRACT) return fail('invalid-checkpoint-envelope');
    const base = baseline(checkpoint.legacyBaseRaw, deps);
    if (!base.ok) return base;
    const current = stateCheck(checkpoint.state, base, deps);
    if (!current.ok) return current;
    if (checkpoint.undo !== null) {
      const previous = stateCheck(checkpoint.undo, base, deps);
      if (!previous.ok) return previous;
    }
    return { ok: true };
  }

  function validateCheckpoint(checkpoint, options) {
    try { return validateWith(checkpoint, dependencies(options)); }
    catch (error) { return fail('checkpoint-validation-failed'); }
  }

  function inspectPersonalPlanContext(checkpoint, flowRef, options) {
    try {
      const deps = dependencies(options);
      const checked = validateWith(checkpoint, deps);
      if (!checked.ok) return checked;
      return deps.personalPlan().inspectPlanContext({ state: checkpoint.state, flowRef, legacyBaseRaw: checkpoint.legacyBaseRaw, undo: checkpoint.undo });
    } catch (error) { return fail('personal-plan-inspection-failed'); }
  }

  function inspectSourceBoundPersonalPlanContext(checkpoint, observation, options) {
    try {
      if (!exactDataFields(observation, ['flowRef', 'sourceRead', 'sourceEpoch'])) return fail('invalid-source-bound-plan-observation');
      const deps = dependencies(options);
      const checked = validateWith(checkpoint, deps);
      if (!checked.ok) return checked;
      const adapter = sourceBoundPlanDependency(deps);
      const read = adapter.readPersonalPlanSourceContext({ rawState: checkpoint.state, legacyBaseRaw: checkpoint.legacyBaseRaw,
        undo: checkpoint.undo, sourceRead: observation.sourceRead, sourceEpoch: observation.sourceEpoch });
      if (!read.ok) return read;
      const editor = adapter.inspectPersonalPlanSourceEditor({ sourceContext: read.context, flowRef: observation.flowRef });
      if (editor.ok) sourceEditorCheckpoints.set(editor.context, signature(checkpoint));
      return editor.ok ? Object.assign({}, editor, { sourceContext: read.context }) : editor;
    } catch (error) { return fail('source-bound-plan-inspection-failed'); }
  }

  function inspectSourceBoundPersonalPlanStructureContext(checkpoint, observation, options) {
    try {
      if (!exactDataFields(observation, ['flowRef', 'sourceRead', 'sourceEpoch'])) return fail('invalid-source-bound-structure-observation');
      const deps = dependencies(options);
      const checked = validateWith(checkpoint, deps);
      if (!checked.ok) return checked;
      const adapter = sourceBoundStructureDependency(deps);
      const read = adapter.readPersonalPlanSourceContext({ rawState: checkpoint.state, legacyBaseRaw: checkpoint.legacyBaseRaw,
        undo: checkpoint.undo, sourceRead: observation.sourceRead, sourceEpoch: observation.sourceEpoch });
      if (!read.ok) return read;
      const editor = adapter.inspectPersonalPlanStructureEditor({ sourceContext: read.context, flowRef: observation.flowRef });
      // Keep the genuine P token for captured input diagnostics; only this
      // separate C registry grants a structural write against the full packet.
      if (editor.ok) sourceStructureEditorCheckpoints.set(editor.context, signature(checkpoint));
      return editor.ok ? Object.assign({}, editor, { sourceContext: read.context }) : editor;
    } catch (error) { return fail('source-bound-structure-inspection-failed'); }
  }

  function projectState(state) {
    const next = copy(state);
    TIMELINE_VIEWS.forEach(view => { delete next.orders[view]; });
    next[METADATA_KEY] = { version: 1, records: [], resolvedContexts: [], legacySnapshot: copy(state) };
    return next;
  }

  function fromLegacy(raw, options) {
    try {
      const deps = dependencies(options);
      const base = baseline(raw, deps);
      if (!base.ok) return base;
      const checkpoint = { version: VERSION, contract: CONTRACT, legacyBaseRaw: raw, state: projectState(base.envelope.state), undo: base.envelope.undo === null ? null : projectState(base.envelope.undo) };
      const checked = validateWith(checkpoint, deps);
      return checked.ok ? { ok: true, checkpoint } : checked;
    } catch (error) { return fail('legacy-projection-failed'); }
  }

  // Called only after the complete packet (including P current/Undo metadata)
  // passes validation. Personal order occupies that Flow's existing raw slots;
  // unrelated Flow/Quick slots and the persisted arrays remain untouched.
  function personalPlanTiePositions(state) {
    const rawPositions = new Map(state.tasks.map((task, index) => [task.id, index]));
    const positions = new Map(rawPositions);
    if (!own(state, PLAN_METADATA_KEY)) return positions;
    for (const entry of Object.values(state[PLAN_METADATA_KEY].entries)) {
      if (!entry.structure || !own(entry.structure, 'orderedItemRefs')) continue;
      const ids = new Map(entry.binding.items.map(item => [item.itemRef, item.localTaskId]));
      const slots = entry.binding.items.map(item => rawPositions.get(item.localTaskId)).sort((a, b) => a - b);
      if (slots.some(slot => slot === undefined) || slots.length !== entry.structure.orderedItemRefs.length) throw new Error('invalid-personal-plan-tie');
      entry.structure.orderedItemRefs.forEach((ref, index) => {
        if (!ids.has(ref)) throw new Error('invalid-personal-plan-tie');
        positions.set(ids.get(ref), slots[index]);
      });
    }
    return positions;
  }

  function projectWith(checkpoint, view, localToday, deps) {
    const checked = validateWith(checkpoint, deps);
    if (!checked.ok) return Object.assign({}, checked, { groups: [] });
    const metadata = checkpoint.state[METADATA_KEY];
    const positions = personalPlanTiePositions(checkpoint.state);
    const tasks = checkpoint.state.tasks.map(task => ({ id: task.id, date: task.date, time: task.time, done: task.done, sourceOrder: positions.get(task.id), excluded: deps.model.isTrashedTask(checkpoint.state, task) || task.timelinePolicy === 'excluded' }));
    const current = deps.timeline.selectTimelineGroups({ tasks, view, localToday, timelineOrders: metadata.records });
    if (!current.ok) return current;
    const legacy = deps.timeline.projectLegacyTimeline({ state: metadata.legacySnapshot, tasks, view, localToday }, deps.model);
    if (!legacy.ok) return legacy;
    const resolved = new Set(metadata.resolvedContexts.map(token));
    const legacyGroups = new Map(legacy.groups.map(group => [token(group), group]));
    return Object.assign({}, current, { groups: current.groups.map(group => resolved.has(token(group)) ? group : legacyGroups.get(token(group)) || group) });
  }

  function projectGroups(checkpoint, view, localToday, options) {
    try { return projectWith(checkpoint, view, localToday, dependencies(options)); }
    catch (error) { return fail('checkpoint-projection-failed', { groups: [] }); }
  }

  function sameIds(left, right) { return left.length === right.length && left.every((id, index) => id === right[index]); }
  function fullPeers(ids, expected) { return Array.isArray(ids) && ids.length === expected.length && new Set(ids).size === ids.length && ids.every(id => expected.includes(id)); }
  function unchanged(checkpoint, reason, message) { return Object.assign({ ok: !reason, changed: false, checkpoint }, reason ? { reason } : {}, message ? { message } : {}); }

  function planMetadataSignature(state) {
    return signature(own(state, PLAN_METADATA_KEY) ? { present: true, value: state[PLAN_METADATA_KEY] } : { present: false });
  }

  function personalPlanTransition(checkpoint, action, deps) {
    const fields = ['type', 'context', 'draft', 'now'];
    if (!exactDataFields(action, fields)) return unchanged(checkpoint, 'invalid-personal-plan-action');
    const result = deps.personalPlan().planPersonalPlanState({ state: checkpoint.state, context: action.context, draft: action.draft, now: action.now });
    return finishPersonalPlanTransition(checkpoint, result, deps);
  }

  function sourceBoundPlanTransition(checkpoint, action, deps) {
    if (!exactDataFields(action, ['type', 'context', 'draft', 'sourceRead', 'sourceEpoch', 'now'])) return unchanged(checkpoint, 'invalid-source-bound-plan-action');
    // Bind Undo and legacy provenance as well as P's raw/source state. This is
    // JSON-value binding; E2 still owns exact stored bytes and observed epochs.
    if (!sourceEditorCheckpoints.has(action.context)) return unchanged(checkpoint, 'invalid-source-bound-checkpoint-context');
    if (sourceEditorCheckpoints.get(action.context) !== signature(checkpoint)) return unchanged(checkpoint, 'stale-source-bound-checkpoint');
    const result = sourceBoundPlanDependency(deps).planPersonalPlanSourceState({ context: action.context, rawState: checkpoint.state,
      sourceRead: action.sourceRead, sourceEpoch: action.sourceEpoch, draft: action.draft, now: action.now });
    return finishPersonalPlanTransition(checkpoint, result, deps);
  }

  function sourceBoundStructureTransition(checkpoint, action, deps) {
    if (!exactDataFields(action, ['type', 'context', 'draft', 'sourceRead', 'sourceEpoch', 'now'])) return unchanged(checkpoint, 'invalid-source-bound-structure-action');
    if (!sourceStructureEditorCheckpoints.has(action.context)) return unchanged(checkpoint, 'invalid-source-bound-structure-checkpoint-context');
    if (sourceStructureEditorCheckpoints.get(action.context) !== signature(checkpoint)) return unchanged(checkpoint, 'stale-source-bound-structure-checkpoint');
    const result = sourceBoundStructureDependency(deps).planPersonalPlanStructureState({ context: action.context, rawState: checkpoint.state,
      sourceRead: action.sourceRead, sourceEpoch: action.sourceEpoch, draft: action.draft, now: action.now });
    return finishPersonalPlanTransition(checkpoint, result, deps);
  }

  function finishPersonalPlanTransition(checkpoint, result, deps) {
    if (!result.ok) return unchanged(checkpoint, result.reason || 'invalid-personal-plan-candidate');
    if (!result.changed) return unchanged(checkpoint, null, '바뀐 개인 계획이 없어요.');
    // P already owns the single increment and exact full-state before snapshot.
    if (result.state.revision !== checkpoint.state.revision + 1 || signature(result.undo) !== signature(checkpoint.state)
      || signature(result.state[METADATA_KEY]) !== signature(checkpoint.state[METADATA_KEY])) return unchanged(checkpoint, 'invalid-personal-plan-candidate');
    const candidate = { version: VERSION, contract: CONTRACT, legacyBaseRaw: checkpoint.legacyBaseRaw, state: result.state, undo: result.undo };
    const checked = validateWith(candidate, deps);
    return checked.ok ? { ok: true, changed: true, checkpoint: candidate, message: '개인 계획을 반영했어요.' } : unchanged(checkpoint, checked.reason);
  }

  function timelineTransition(checkpoint, action, options, deps) {
    if (!deps.timeline.isPlainDate(action.localToday) || !deps.timeline.isPlainDate(options && options.currentLocalToday)) return unchanged(checkpoint, 'invalid-timeline-clock');
    if (action.localToday !== options.currentLocalToday) return unchanged(checkpoint, 'stale-timeline-clock');
    if (!validContext(action, deps.timeline) || (action.context === 'overdue' && action.contextKey !== action.localToday)) return unchanged(checkpoint, 'invalid-timeline-context');
    if (!Number.isSafeInteger(action.expectedRevision) || action.expectedRevision !== checkpoint.state.revision) return unchanged(checkpoint, 'stale-state-revision');
    if (typeof action.now !== 'string' || !action.now.trim()) return unchanged(checkpoint, 'invalid-action-time');
    // Arbitrary date groups are addressed by their actual date, not by a view name.
    const view = action.context === 'date' ? 'month' : action.context === 'undated' ? 'undated' : 'today';
    const anchor = action.context === 'date' ? action.contextKey : action.localToday;
    const projection = projectWith(checkpoint, view, anchor, deps);
    if (!projection.ok) return unchanged(checkpoint, projection.reason);
    const group = projection.groups.find(entry => token(entry) === token(action));
    if (!group) return unchanged(checkpoint, 'unknown-timeline-context');
    if (group.blocked) return unchanged(checkpoint, 'legacy-context-blocked');
    if (!fullPeers(action.currentOrderedRefKeys, group.ids) || !sameIds(action.currentOrderedRefKeys, group.ids)) return unchanged(checkpoint, 'stale-timeline-peers');
    if (action.type === 'timeline-reorder' && !fullPeers(action.orderedRefKeys, group.ids)) return unchanged(checkpoint, 'invalid-timeline-peers');
    if (action.type === 'timeline-reset' && action.orderedRefKeys !== undefined && (!fullPeers(action.orderedRefKeys, group.defaultIds) || !sameIds(action.orderedRefKeys, group.defaultIds))) return unchanged(checkpoint, 'invalid-reset-order');
    if (action.type === 'timeline-reorder' && sameIds(action.orderedRefKeys, group.ids)) return unchanged(checkpoint, null, '이미 같은 순서예요.');
    if (action.type === 'timeline-reset' && !group.manualOrder) return unchanged(checkpoint, null, '이미 시간순이에요.');
    if (checkpoint.state.revision >= Number.MAX_SAFE_INTEGER) return unchanged(checkpoint, 'revision-overflow');
    const next = copy(checkpoint.state);
    next.revision += 1;
    next.updatedAt = action.now;
    const metadata = next[METADATA_KEY];
    metadata.records = metadata.records.filter(entry => token(entry) !== token(action));
    if (action.type === 'timeline-reorder') metadata.records.push({ context: action.context, contextKey: action.contextKey, orderedRefKeys: action.orderedRefKeys.slice(), revision: next.revision });
    if (!metadata.resolvedContexts.some(entry => token(entry) === token(action))) metadata.resolvedContexts.push({ context: action.context, contextKey: action.contextKey });
    const candidate = { version: VERSION, contract: CONTRACT, legacyBaseRaw: checkpoint.legacyBaseRaw, state: next, undo: copy(checkpoint.state) };
    const checked = validateWith(candidate, deps);
    return checked.ok ? { ok: true, changed: true, checkpoint: candidate, message: action.type === 'timeline-reset' ? '이 목록을 시간순으로 되돌렸어요.' : '이 목록의 순서를 바꿨어요.' } : unchanged(checkpoint, checked.reason);
  }

  /* Timeline actions require an independently injected currentLocalToday in
     options as well as the action's opening localToday. No ambient clock read. */
  function transitionCheckpoint(checkpoint, action, options) {
    try {
      const deps = dependencies(options);
      const checked = validateWith(checkpoint, deps);
      if (!checked.ok) return unchanged(checkpoint, checked.reason);
      if (!isRecord(action)) return unchanged(checkpoint, 'invalid-action');
      const actionType = Object.getOwnPropertyDescriptor(action, 'type');
      if (!actionType || !own(actionType, 'value')) return unchanged(checkpoint, 'invalid-action');
      if (actionType.value === 'commit-personal-plan-context') return personalPlanTransition(checkpoint, action, deps);
      if (actionType.value === 'commit-source-bound-personal-plan-context') return sourceBoundPlanTransition(checkpoint, action, deps);
      if (actionType.value === 'commit-source-bound-personal-plan-structure-context') return sourceBoundStructureTransition(checkpoint, action, deps);
      // v2 keeps original raw/snapshots. Do not promise permanent deletion while
      // retaining those bytes; the legacy domain API remains unchanged.
      if (action.type === 'permanently-delete-from-trash') return unchanged(checkpoint, 'legacy-retention-conflict');
      if (action.type === 'timeline-reorder' || action.type === 'timeline-reset') return timelineTransition(checkpoint, action, options, deps);
      if (action.type === 'reorder' && TIMELINE_VIEWS.includes(action.context)) return unchanged(checkpoint, 'legacy-timeline-action-disabled');
      const beforeMetadata = signature(checkpoint.state[METADATA_KEY]);
      const beforePersonalPlan = planMetadataSignature(checkpoint.state);
      const result = deps.model.apply(copy(checkpoint.state), action);
      if (!result.changed) return unchanged(checkpoint, result.error || null, result.message);
      if (signature(result.state[METADATA_KEY]) !== beforeMetadata) return unchanged(checkpoint, 'unexpected-timeline-metadata-change');
      if (planMetadataSignature(result.state) !== beforePersonalPlan) return unchanged(checkpoint, 'unexpected-personal-plan-metadata-change');
      const candidate = { version: VERSION, contract: CONTRACT, legacyBaseRaw: checkpoint.legacyBaseRaw, state: result.state, undo: copy(checkpoint.state) };
      const valid = validateWith(candidate, deps);
      return valid.ok ? { ok: true, changed: true, checkpoint: candidate, message: result.message } : unchanged(checkpoint, valid.reason);
    } catch (error) { return unchanged(checkpoint, 'checkpoint-transition-failed'); }
  }

  function undoCheckpoint(checkpoint, options) {
    try {
      const deps = dependencies(options);
      const checked = validateWith(checkpoint, deps);
      if (!checked.ok) return unchanged(checkpoint, checked.reason);
      if (checkpoint.undo === null) return unchanged(checkpoint, null, '되돌릴 변경이 없어요.');
      const state = copy(checkpoint.undo);
      // Preserve M.undoEnvelope's existing timestamp exception; everything else,
      // including metadata and revision, comes from the single prior snapshot.
      state.updatedAt = deps.model.TODAY + 'T12:00:00.000Z';
      const candidate = { version: VERSION, contract: CONTRACT, legacyBaseRaw: checkpoint.legacyBaseRaw, state, undo: null };
      const valid = validateWith(candidate, deps);
      return valid.ok ? { ok: true, changed: true, checkpoint: candidate, message: '마지막 성공 상태로 되돌렸어요.' } : unchanged(checkpoint, valid.reason);
    } catch (error) { return unchanged(checkpoint, 'checkpoint-undo-failed'); }
  }

  return Object.freeze({ VERSION, CONTRACT, STORAGE_KEY, LEGACY_STORAGE_KEY, METADATA_KEY, fromLegacy, validateCheckpoint, inspectPersonalPlanContext,
    inspectSourceBoundPersonalPlanContext, inspectSourceBoundPersonalPlanStructureContext, projectGroups, transitionCheckpoint, undoCheckpoint });
});
