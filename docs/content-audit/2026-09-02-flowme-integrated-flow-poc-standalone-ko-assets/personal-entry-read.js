/* Capture-time local saved-copy catalog. No I/O, resolver, renderer or write authority. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => ({
    model: require('./model.js'), checkpoint: require('./workspace-checkpoint.js'), display: require('./personal-plan-display.js'),
  }));
  else root.FlowPocPersonalEntryRead = factory(() => ({ model: root.FlowMeIntegratedPoc,
    checkpoint: root.FlowPocWorkspaceCheckpoint, display: root.FlowPocPersonalPlanDisplay }));
})(typeof globalThis !== 'undefined' ? globalThis : this, function (loadDependencies) {
  'use strict';
  const VERSION = 1;
  const CONTRACT = 'flowme-standalone-personal-entry-v1';
  const ELIGIBLE_ORIGINS = Object.freeze(['source-backed-map', 'personal-draft', 'canonical-personal-copy', 'legacy-saved-plan']);
  const scope = 'entry-catalog-read';
  const packets = new WeakMap();
  const failures = new WeakMap();
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const text = value => typeof value === 'string' && value.trim().length > 0;
  const blocked = reason => Object.freeze({ ok: false, scope, reason });
  function fail(reason) { const error = new Error(reason); failures.set(error, reason); throw error; }

  function nativePrototype(proto, name) {
    if (!proto || Object.getOwnPropertyDescriptor(proto, 'toJSON')) return false;
    const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor');
    if (!ctor || !own(ctor, 'value') || typeof ctor.value !== 'function'
      || Function.prototype.toString.call(ctor.value) !== 'function ' + name + '() { [native code] }') return false;
    const descriptor = Object.getOwnPropertyDescriptor(ctor.value, 'prototype');
    return Boolean(descriptor && own(descriptor, 'value') && descriptor.value === proto);
  }
  const objectPrototype = proto => proto === null || (Object.getPrototypeOf(proto) === null && nativePrototype(proto, 'Object'));
  // Inspect descriptors before calling existing decoders. Ordinary unknown JSON
  // payload fields are tolerated, but never promoted to discovery/source facts.
  function safeData(value, parents = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (!value || typeof value !== 'object' || parents.has(value) || Object.getOwnPropertySymbols(value).length) fail('unsafe-entry-input');
    const names = Object.getOwnPropertyNames(value);
    if (Array.isArray(value)) {
      const proto = Object.getPrototypeOf(value);
      if (!nativePrototype(proto, 'Array') || !objectPrototype(Object.getPrototypeOf(proto))
        || names.length !== value.length + 1 || Object.keys(value).length !== value.length) fail('unsafe-entry-input');
      for (let index = 0; index < value.length; index += 1) if (!own(value, String(index))) fail('unsafe-entry-input');
    } else if (!objectPrototype(Object.getPrototypeOf(value)) || names.length !== Object.keys(value).length) fail('unsafe-entry-input');
    parents.add(value);
    for (const name of names) {
      if (Array.isArray(value) && name === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, name);
      if (!descriptor || !own(descriptor, 'value') || descriptor.enumerable !== true) fail('unsafe-entry-input');
      safeData(descriptor.value, parents);
    }
    parents.delete(value);
  }
  function exact(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).length !== keys.length || !keys.every(key => own(value, key))) fail('invalid-entry-input');
  }
  function input(value) {
    safeData(value); exact(value, ['checkpoint', 'sourceRead', 'sourceEpoch']);
    if (!Number.isSafeInteger(value.sourceEpoch) || value.sourceEpoch < 0) fail('invalid-source-epoch');
    const read = value.sourceRead;
    if (read && read.ok === true) {
      exact(read, ['ok', 'raw']);
      if (read.raw !== null && typeof read.raw !== 'string') fail('invalid-source-read');
    } else if (read && read.ok === false) {
      exact(read, ['ok', 'reason']);
      if (!['read-error', 'unavailable'].includes(read.reason)) fail('invalid-source-read');
    } else fail('invalid-source-read');
  }
  function dependencies() {
    const deps = loadDependencies();
    if (!deps || !deps.model || deps.model.VERSION !== 1
      || ['validate', 'isTrashedFlow', 'isTrashedTask'].some(key => typeof deps.model[key] !== 'function')) fail('entry-model-unavailable');
    if (!deps.checkpoint || deps.checkpoint.VERSION !== 2 || deps.checkpoint.CONTRACT !== 'flowme-standalone-workspace-checkpoint-v2'
      || typeof deps.checkpoint.validateCheckpoint !== 'function') fail('entry-checkpoint-unavailable');
    if (!deps.display || deps.display.VERSION !== 1 || deps.display.CONTRACT !== 'flowme-standalone-personal-plan-display-v1'
      || ['projectPersonalPlanDisplay', 'inspectPersonalPlanDisplayCandidate'].some(key => typeof deps.display[key] !== 'function')) fail('entry-display-unavailable');
    return deps;
  }
  function frozenCopy(value) {
    const copied = JSON.parse(JSON.stringify(value));
    function freeze(entry) { if (entry && typeof entry === 'object') { Object.values(entry).forEach(freeze); Object.freeze(entry); } return entry; }
    return freeze(copied);
  }
  function identity(state, model) {
    safeData(state);
    const errors = model.validate(state);
    if (!Array.isArray(errors) || errors.length !== 0) fail('invalid-entry-state');
    const byRef = new Map(), itemRefs = new Set(), localFlows = new Set(), localTasks = new Map();
    for (const task of state.tasks) {
      if (localTasks.has(task.id)) fail('duplicate-entry-task');
      localTasks.set(task.id, task);
    }
    for (const flow of state.flows) {
      if (!text(flow.id) || localFlows.has(flow.id) || !text(flow.savedCopyId) || !text(flow.sourceFlowId)) fail('invalid-entry-flow-identity');
      if (!text(flow.title)) fail('invalid-entry-title');
      localFlows.add(flow.id);
      const flowRef = 'saved-flow:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId);
      if (flow.ref !== flowRef || byRef.has(flowRef)) fail('invalid-entry-flow-identity');
      if (!ELIGIBLE_ORIGINS.includes(flow.origin) && flow.origin !== 'authoring-handoff') fail('unsupported-entry-origin');
      const localItems = new Set(), items = [];
      for (const step of flow.steps) for (const id of step.itemIds) {
        const task = localTasks.get(id);
        if (!task || task.flowId !== flow.id || localItems.has(id)) fail('invalid-entry-membership');
        if (!text(task.title)) fail('invalid-entry-title');
        localItems.add(id);
        const prefix = 'flow-item:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId) + ':';
        if (typeof task.ref !== 'string' || !task.ref.startsWith(prefix)) fail('invalid-entry-item-identity');
        const suffix = task.ref.slice(prefix.length), itemId = decodeURIComponent(suffix);
        if (!text(itemId) || suffix !== encodeURIComponent(itemId) || itemRefs.has(task.ref)) fail('invalid-entry-item-identity');
        itemRefs.add(task.ref);
        items.push({ localTaskId: task.id, itemRef: task.ref, itemId, task });
      }
      if (state.tasks.filter(task => task.flowId === flow.id).length !== items.length) fail('invalid-entry-membership');
      byRef.set(flowRef, { flow, items });
    }
    return byRef;
  }
  function sameMembership(before, after) {
    if (before.size !== after.size) fail('entry-display-membership-mismatch');
    for (const [ref, original] of before) {
      const current = after.get(ref);
      if (!current || current.flow.id !== original.flow.id || current.flow.origin !== original.flow.origin
        || current.items.length !== original.items.length) fail('entry-display-membership-mismatch');
      const currentRefs = new Map(current.items.map(item => [item.itemRef, item.localTaskId]));
      for (const item of original.items) if (currentRefs.get(item.itemRef) !== item.localTaskId) fail('entry-display-membership-mismatch');
    }
  }
  function createPersonalEntryReadPacket(value) {
    try {
      input(value); const deps = dependencies();
      const checked = deps.checkpoint.validateCheckpoint(value.checkpoint);
      if (!checked || !checked.ok) fail(checked && checked.reason || 'invalid-entry-checkpoint');
      const original = identity(value.checkpoint.state, deps.model);
      // Gate both current P and actual reachable Undo P. Current legacy display
      // alone is not proof that a later reachable personal projection is safe.
      const pair = deps.display.inspectPersonalPlanDisplayCandidate({ checkpoint: value.checkpoint,
        candidateCheckpoint: value.checkpoint, sourceRead: value.sourceRead, candidateSourceRead: value.sourceRead, sourceEpoch: value.sourceEpoch });
      if (!pair || pair.ok !== true) fail(pair && pair.reason || 'entry-display-pair-failed');
      const displayed = deps.display.projectPersonalPlanDisplay(value);
      if (!displayed || displayed.ok !== true) fail(displayed && displayed.reason || 'entry-display-failed');
      if (!['legacy-display', 'personal-source-display'].includes(displayed.mode)
        || !['empty', 'restored'].includes(displayed.sourceStatus)) fail('entry-source-read-unavailable');
      const current = identity(displayed.state, deps.model); sameMembership(original, current);
      const copies = [], excluded = [];
      for (const [flowRef, binding] of original) {
        const shown = current.get(flowRef), flow = shown.flow;
        const originalTrashed = deps.model.isTrashedFlow(value.checkpoint.state, binding.flow.id);
        if (deps.model.isTrashedFlow(displayed.state, flow.id) !== originalTrashed) fail('entry-display-lifecycle-mismatch');
        if (originalTrashed) continue;
        if (flow.origin === 'authoring-handoff') {
          excluded.push({ localFlowId: flow.id, flowRef, origin: flow.origin, reason: 'known-not-eligible' }); continue;
        }
        const shownItems = new Map(shown.items.map(item => [item.itemRef, item]));
        // This is full saved membership in stored Step traversal order, not a
        // personal Plan/Calendar order. Existing result readers own those views.
        const items = binding.items.map(item => {
          const task = shownItems.get(item.itemRef).task;
          if (deps.model.isTrashedTask(displayed.state, task)) fail('entry-display-lifecycle-mismatch');
          return { localTaskId: task.id, itemRef: item.itemRef, itemId: item.itemId,
            flowRef, savedCopyId: flow.savedCopyId, flowId: flow.sourceFlowId, title: task.title };
        });
        copies.push({ localFlowId: flow.id, flowRef, savedCopyId: flow.savedCopyId, flowId: flow.sourceFlowId,
          origin: flow.origin, title: flow.title, folderId: flow.folderId, itemRefs: items.map(item => item.itemRef), items,
          grouping: { status: 'unavailable', reason: 'grouping-metadata-unavailable' } });
      }
      const catalog = frozenCopy({ version: VERSION, contract: CONTRACT, displayMode: displayed.mode,
        sourceStatus: displayed.sourceStatus, copies, excluded });
      const packet = Object.freeze({ version: VERSION, contract: CONTRACT });
      packets.set(packet, catalog);
      // Genuine means created by this factory, not current storage permission.
      // Actual app reuse must separately check S.sameAuthority + source epoch,
      // including observed ABA. No raw/epoch flag can turn this into a writer.
      return Object.freeze({ ok: true, packet });
    } catch (error) { return blocked(failures.get(error) || 'invalid-entry-read'); }
  }
  function readPersonalEntryCatalog(packet) {
    try {
      const catalog = packets.get(packet);
      if (!catalog) return blocked('unknown-entry-packet');
      return Object.freeze({ ok: true, catalog: frozenCopy(catalog) });
    } catch (_) { return blocked('invalid-entry-packet'); }
  }
  return Object.freeze({ VERSION, CONTRACT, ELIGIBLE_ORIGINS, createPersonalEntryReadPacket, readPersonalEntryCatalog });
});
