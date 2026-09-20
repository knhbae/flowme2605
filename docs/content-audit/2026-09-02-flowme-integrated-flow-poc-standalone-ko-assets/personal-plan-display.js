/* Display-only compatibility facade. No storage, writer, editor authority or UI. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => ({
    model: require('./model.js'), checkpoint: require('./workspace-checkpoint.js'), personalPlan: require('./personal-plan-context.js'),
  }));
  else root.FlowPocPersonalPlanDisplay = factory(() => ({ model: root.FlowMeIntegratedPoc,
    checkpoint: root.FlowPocWorkspaceCheckpoint, personalPlan: root.FlowPocPersonalPlanContext }));
})(typeof globalThis !== 'undefined' ? globalThis : this, function (loadDependencies) {
  'use strict';
  const VERSION = 1;
  const CONTRACT = 'flowme-standalone-personal-plan-display-v1';
  const META = 'personalPlanContextV1';
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const fail = reason => { throw new Error(reason); };
  const blocked = (scope, reason, details) => Object.freeze(Object.assign({ ok: false, scope, reason }, details || {}));

  function nativePrototype(proto, name) {
    if (!proto || Object.getOwnPropertyDescriptor(proto, 'toJSON')) return false;
    const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor');
    if (!ctor || !own(ctor, 'value') || typeof ctor.value !== 'function'
      || Function.prototype.toString.call(ctor.value) !== 'function ' + name + '() { [native code] }') return false;
    const descriptor = Object.getOwnPropertyDescriptor(ctor.value, 'prototype');
    return Boolean(descriptor && own(descriptor, 'value') && descriptor.value === proto);
  }
  const objectPrototype = proto => proto === null || (Object.getPrototypeOf(proto) === null && nativePrototype(proto, 'Object'));

  // Inspect descriptors before C/M/P can read values. Preserve ordinary unknown
  // JSON keys; the public input shape, not a truthy flag, selects the operation.
  function safeData(value, parents = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (!value || typeof value !== 'object' || parents.has(value) || Object.getOwnPropertySymbols(value).length) fail('unsafe-display-input');
    const names = Object.getOwnPropertyNames(value);
    if (Array.isArray(value)) {
      const proto = Object.getPrototypeOf(value);
      if (!nativePrototype(proto, 'Array') || !objectPrototype(Object.getPrototypeOf(proto))
        || names.length !== value.length + 1 || Object.keys(value).length !== value.length) fail('unsafe-display-input');
      for (let index = 0; index < value.length; index += 1) if (!own(value, String(index))) fail('unsafe-display-input');
    } else if (!objectPrototype(Object.getPrototypeOf(value)) || names.length !== Object.keys(value).length) fail('unsafe-display-input');
    parents.add(value);
    for (const name of names) {
      if (Array.isArray(value) && name === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, name);
      if (!descriptor || !own(descriptor, 'value') || descriptor.enumerable !== true) fail('unsafe-display-input');
      safeData(descriptor.value, parents);
    }
    parents.delete(value);
  }
  function exact(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).length !== keys.length || !keys.every(key => own(value, key))) fail('invalid-display-input');
  }
  function sourcePacket(value) {
    if (!value || typeof value !== 'object') fail('invalid-source-read');
    if (value.ok === true) {
      exact(value, ['ok', 'raw']);
      if (value.raw !== null && typeof value.raw !== 'string') fail('invalid-source-read');
    } else if (value.ok === false) {
      exact(value, ['ok', 'reason']);
      if (!['read-error', 'unavailable'].includes(value.reason)) fail('invalid-source-read');
    } else fail('invalid-source-read');
  }
  function input(value, candidate) {
    safeData(value);
    exact(value, candidate ? ['checkpoint', 'candidateCheckpoint', 'sourceRead', 'candidateSourceRead', 'sourceEpoch']
      : ['checkpoint', 'sourceRead', 'sourceEpoch']);
    sourcePacket(value.sourceRead);
    if (candidate) sourcePacket(value.candidateSourceRead);
    if (!Number.isSafeInteger(value.sourceEpoch) || value.sourceEpoch < 0) fail('invalid-source-epoch');
  }
  function dependencies() {
    const deps = loadDependencies();
    if (!deps || !deps.checkpoint || deps.checkpoint.VERSION !== 2
      || deps.checkpoint.CONTRACT !== 'flowme-standalone-workspace-checkpoint-v2'
      || ['validateCheckpoint', 'undoCheckpoint'].some(name => typeof deps.checkpoint[name] !== 'function')) fail('display-checkpoint-unavailable');
    return deps;
  }
  function validateCheckpoint(checkpoint, deps) {
    const checked = deps.checkpoint.validateCheckpoint(checkpoint);
    if (!checked || !checked.ok) fail(checked && checked.reason || 'invalid-display-checkpoint');
  }
  function frozenCopy(value) {
    safeData(value);
    const next = JSON.parse(JSON.stringify(value));
    const freeze = entry => { if (entry && typeof entry === 'object') { Object.values(entry).forEach(freeze); Object.freeze(entry); } return entry; };
    return freeze(next);
  }
  function sourceObservation(sourceRead, deps) {
    if (!sourceRead.ok) return { status: sourceRead.reason, store: null };
    const model = deps.model;
    if (!model || model.VERSION !== 1 || typeof model.loadSourceCandidateStore !== 'function'
      || typeof model.composeSourceCandidateState !== 'function' || typeof model.SOURCE_CANDIDATE_STORAGE_KEY !== 'string') return { status: 'unavailable', store: null };
    const loaded = model.loadSourceCandidateStore({ getItem(key) {
      if (key !== model.SOURCE_CANDIDATE_STORAGE_KEY) fail('source-reader-key-mismatch');
      return sourceRead.raw;
    } });
    if (!loaded || !['empty', 'restored', 'corrupt', 'read-error', 'unavailable'].includes(loaded.status)
      || loaded.raw !== sourceRead.raw) fail('invalid-source-observation');
    if (['empty', 'restored'].includes(loaded.status) && !loaded.store) fail('invalid-source-observation');
    return { status: loaded.status, store: loaded.store };
  }
  function strictRead(checkpoint, sourceRead, epoch, deps) {
    const p = deps.personalPlan;
    if (!p || p.VERSION !== 1 || p.CONTRACT !== 'flowme-standalone-personal-plan-context-v1'
      || p.METADATA_KEY !== META || typeof p.readPersonalPlanSourceContext !== 'function') return { ok: false, reason: 'display-personal-plan-unavailable' };
    return p.readPersonalPlanSourceContext({ rawState: checkpoint.state, legacyBaseRaw: checkpoint.legacyBaseRaw,
      undo: checkpoint.undo, sourceRead, sourceEpoch: epoch });
  }
  function projectPersonalPlanDisplay(value) {
    const scope = 'display-only';
    try {
      input(value, false); const deps = dependencies(); validateCheckpoint(value.checkpoint, deps);
      const checkpoint = value.checkpoint, hasReachablePersonalUndo = checkpoint.undo !== null && own(checkpoint.undo, META);
      const observed = sourceObservation(value.sourceRead, deps);
      if (own(checkpoint.state, META)) {
        // No M or raw-state fallback from a failed bound P read.
        if (!['empty', 'restored'].includes(observed.status)) return blocked(scope, 'source-read-' + observed.status, { sourceStatus: observed.status, hasReachablePersonalUndo });
        const result = strictRead(checkpoint, value.sourceRead, value.sourceEpoch, deps);
        if (!result || !result.ok) return blocked(scope, result && result.reason || 'personal-display-failed', { sourceStatus: observed.status, hasReachablePersonalUndo });
        return Object.freeze({ ok: true, scope, mode: 'personal-source-display', state: frozenCopy(result.state), sourceStatus: observed.status, hasReachablePersonalUndo });
      }
      if (!['empty', 'restored'].includes(observed.status)) return Object.freeze({ ok: true, scope, mode: 'personal-execution-only',
        state: frozenCopy(checkpoint.state), sourceStatus: observed.status, hasReachablePersonalUndo });
      const state = deps.model.composeSourceCandidateState(frozenCopy(checkpoint.state), observed.store);
      return Object.freeze({ ok: true, scope, mode: 'legacy-display', state: frozenCopy(state), sourceStatus: observed.status, hasReachablePersonalUndo });
    } catch (error) { return blocked(scope, error && error.message || 'invalid-display-input'); }
  }
  function inspectPair(checkpoint, sourceRead, epoch, deps, pair) {
    validateCheckpoint(checkpoint, deps);
    if (own(checkpoint.state, META)) {
      const current = strictRead(checkpoint, sourceRead, epoch, deps);
      if (!current || !current.ok) return blocked('candidate-display-check', current && current.reason || 'personal-display-failed', { pair, snapshot: 'current' });
    }
    if (checkpoint.undo !== null && own(checkpoint.undo, META)) {
      // Consume the actual C Undo contract including its timestamp exception.
      const undone = deps.checkpoint.undoCheckpoint(checkpoint);
      if (!undone || !undone.ok || !undone.changed) return blocked('candidate-display-check', undone && undone.reason || 'personal-display-undo-failed', { pair, snapshot: 'undo' });
      const previous = strictRead(undone.checkpoint, sourceRead, epoch, deps);
      if (!previous || !previous.ok) return blocked('candidate-display-check', previous && previous.reason || 'personal-display-failed', { pair, snapshot: 'undo' });
    }
    return null;
  }
  function inspectPersonalPlanDisplayCandidate(value) {
    const scope = 'candidate-display-check';
    try {
      input(value, true); const deps = dependencies();
      // Each observation belongs to its own checkpoint. Do not mix old target
      // membership with final multi-key deletion/handoff source bytes.
      const before = inspectPair(value.checkpoint, value.sourceRead, value.sourceEpoch, deps, 'current');
      if (before) return before;
      const after = inspectPair(value.candidateCheckpoint, value.candidateSourceRead, value.sourceEpoch, deps, 'candidate');
      if (after) return after;
      // No state/context/ticket or authority is issued by a display preflight.
      return Object.freeze({ ok: true, scope });
    } catch (error) { return blocked(scope, error && error.message || 'invalid-display-input'); }
  }
  function projectPersonalPlanStructureDisplay(value) {
    const scope = 'structure-display-only';
    try {
      safeData(value);
      exact(value, ['checkpoint', 'sourceRead', 'sourceEpoch', 'flowRef']);
      if (typeof value.flowRef !== 'string' || !value.flowRef) fail('invalid-display-flow-ref');
      input({ checkpoint: value.checkpoint, sourceRead: value.sourceRead, sourceEpoch: value.sourceEpoch }, false);
      const deps = dependencies(), p = deps.personalPlan;
      const pair = inspectPair(value.checkpoint, value.sourceRead, value.sourceEpoch, deps, 'current');
      if (pair) return blocked(scope, pair.reason);
      if (!p || p.STRUCTURE_CONTRACT !== 'flowme-standalone-personal-plan-context-v2'
        || typeof p.readPersonalPlanStructureView !== 'function') return blocked(scope, 'structure-display-unavailable');
      const source = strictRead(value.checkpoint, value.sourceRead, value.sourceEpoch, deps);
      if (!source || !source.ok) return blocked(scope, source && source.reason || 'structure-display-source-failed');
      // The P context stays private. A detached display view is never an editor
      // token and cannot be used as a C/E2 transition authority.
      const structure = p.readPersonalPlanStructureView({ sourceContext: source.context, flowRef: value.flowRef });
      if (!structure || !structure.ok) return blocked(scope, structure && structure.reason || 'structure-display-failed');
      return Object.freeze({ ok: true, scope, structure: frozenCopy(structure) });
    } catch (error) { return blocked(scope, error && error.message || 'invalid-structure-display-input'); }
  }
  return Object.freeze({ VERSION, CONTRACT, projectPersonalPlanDisplay, inspectPersonalPlanDisplayCandidate, projectPersonalPlanStructureDisplay });
});
