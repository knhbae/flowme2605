/* B1-G: raw-state personal Plan projection/candidates only. No storage or UI.
   C may consume this adapter later; M must not import it back. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => ({ model: require('./model.js'), timeline: require('./timeline-context.js') }));
  else root.FlowPocPersonalPlanContext = factory(() => ({ model: root.FlowMeIntegratedPoc, timeline: root.FlowPocTimelineContext }));
})(typeof globalThis !== 'undefined' ? globalThis : this, function (loadDependencies) {
  'use strict';
  const VERSION = 1;
  const METADATA_KEY = 'personalPlanContextV1';
  const CONTRACT = 'flowme-standalone-personal-plan-context-v1';
  const STRUCTURE_DRAFT_VERSION = 2;
  const STRUCTURE_METADATA_VERSION = 2;
  const STRUCTURE_CONTRACT = 'flowme-standalone-personal-plan-context-v2';
  const contexts = new WeakMap();
  const sourceContexts = new WeakMap();
  const sourceEditorContexts = new WeakMap();
  const structureEditorContexts = new WeakMap();
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const copy = value => JSON.parse(JSON.stringify(value));
  const text = value => typeof value === 'string' && Boolean(value.trim());
  const keys = (value, required, optional = []) => record(value) && required.every(key => own(value, key))
    && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
  const fail = reason => { throw new Error(reason); };
  const failure = error => ({ ok: false, reason: error instanceof Error ? error.message : 'invalid-plan-data' });
  const tokenKeys = new Set(['__proto__', 'prototype', 'constructor']);
  const signature = value => value === null || typeof value !== 'object' ? JSON.stringify(value)
    : Array.isArray(value) ? '[' + value.map(signature).join(',') + ']'
      : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + signature(value[key])).join(',') + '}';
  const equal = (left, right) => signature(left) === signature(right);

  // Accept native JSON-container prototypes from another realm, not a custom
  // prototype that can add inherited serialization hooks before JSON.clone.
  function nativePrototype(proto, name) {
    if (!proto || Object.getOwnPropertyDescriptor(proto, 'toJSON')) return false;
    const constructor = Object.getOwnPropertyDescriptor(proto, 'constructor');
    if (!constructor || !own(constructor, 'value') || typeof constructor.value !== 'function'
      || Function.prototype.toString.call(constructor.value) !== 'function ' + name + '() { [native code] }') return false;
    const prototype = Object.getOwnPropertyDescriptor(constructor.value, 'prototype');
    return Boolean(prototype && own(prototype, 'value') && prototype.value === proto);
  }

  function plainObjectPrototype(proto) {
    return proto === null || (Object.getPrototypeOf(proto) === null && nativePrototype(proto, 'Object'));
  }

  // Validate descriptors before reading unknown values. Fail instead of dropping
  // poison keys, getters, prototypes, holes or lossy JSON values during clone.
  function safeData(value, parents = new Set()) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number' && Number.isFinite(value)) return;
    if (!value || typeof value !== 'object' || parents.has(value) || Object.getOwnPropertySymbols(value).length) fail('unsafe-plan-data');
    const names = Object.getOwnPropertyNames(value);
    if (Array.isArray(value)) {
      const proto = Object.getPrototypeOf(value);
      if (!nativePrototype(proto, 'Array') || !plainObjectPrototype(Object.getPrototypeOf(proto))) fail('unsafe-plan-data');
      if (names.length !== value.length + 1 || Object.keys(value).length !== value.length) fail('unsafe-plan-data');
      for (let index = 0; index < value.length; index += 1) if (!own(value, String(index))) fail('unsafe-plan-data');
    } else {
      const proto = Object.getPrototypeOf(value);
      if (!plainObjectPrototype(proto)) fail('unsafe-plan-data');
      if (names.length !== Object.keys(value).length) fail('unsafe-plan-data');
    }
    parents.add(value);
    for (const key of names) {
      if (Array.isArray(value) && key === 'length') continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (tokenKeys.has(key) || !descriptor || !own(descriptor, 'value') || descriptor.enumerable !== true) fail('unsafe-plan-data');
      safeData(descriptor.value, parents);
    }
    parents.delete(value);
  }

  function frozenCopy(value) {
    const next = copy(value);
    const freeze = entry => { if (entry && typeof entry === 'object') { Object.values(entry).forEach(freeze); Object.freeze(entry); } return entry; };
    return freeze(next);
  }

  function inputRecord(input, required, optional = []) {
    if (!record(input)) fail('invalid-plan-input');
    const proto = Object.getPrototypeOf(input);
    if (proto !== null && Object.getPrototypeOf(proto) !== null) fail('invalid-plan-input');
    if (Object.getOwnPropertySymbols(input).length) fail('invalid-plan-input');
    for (const key of Object.getOwnPropertyNames(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (tokenKeys.has(key) || !descriptor || !own(descriptor, 'value') || descriptor.enumerable !== true
        || (!required.includes(key) && !optional.includes(key))) fail('invalid-plan-input');
    }
    if (!required.every(key => own(input, key))) fail('invalid-plan-input');
  }

  function dependencies() {
    const deps = loadDependencies();
    if (!deps.model || deps.model.VERSION !== 1 || typeof deps.model.validate !== 'function'
      || typeof deps.model.isTrashedFlow !== 'function' || !deps.timeline || deps.timeline.VERSION !== 1
      || typeof deps.timeline.isPlainDate !== 'function') fail('plan-dependencies-unavailable');
    return deps;
  }

  function legacyCollision(state) {
    if (state && state.timelineContextV1 && state.timelineContextV1.legacySnapshot
      && own(state.timelineContextV1.legacySnapshot, METADATA_KEY)) fail('legacy-reserved-field-collision');
  }

  function inspectLegacyInputs(input) {
    legacyCollision(input.state);
    if (input.undo !== undefined && input.undo !== null) {
      safeData(input.undo); legacyCollision(input.undo);
      if (own(input.undo, METADATA_KEY)) {
        const deps = dependencies();
        inspectMetadata(input.undo, identities(input.undo, deps), deps);
      }
    }
    if (input.legacyBaseRaw !== undefined && input.legacyBaseRaw !== null) {
      if (typeof input.legacyBaseRaw !== 'string') fail('invalid-legacy-plan-input');
      let envelope;
      try { envelope = JSON.parse(input.legacyBaseRaw); } catch (_) { fail('invalid-legacy-plan-input'); }
      safeData(envelope);
      if (!record(envelope) || envelope.version !== 1 || !record(envelope.state)
        || !own(envelope, 'undo') || (envelope.undo !== null && !record(envelope.undo))) fail('invalid-legacy-plan-input');
      if (own(envelope.state, METADATA_KEY) || (envelope.undo && own(envelope.undo, METADATA_KEY))) fail('legacy-reserved-field-collision');
    }
  }

  function identities(state, deps) {
    safeData(state);
    if (!record(state) || state.version !== 1 || !Number.isSafeInteger(state.revision) || state.revision < 0) fail('invalid-plan-state');
    let errors;
    try { errors = deps.model.validate(state); } catch (_) { fail('invalid-plan-domain'); }
    if (!Array.isArray(errors) || errors.length) fail('invalid-plan-domain');
    legacyCollision(state);
    const byFlowRef = new Map();
    const allItemRefs = new Set();
    for (const flow of state.flows) {
      if (!text(flow.savedCopyId) || !text(flow.sourceFlowId)
        || flow.ref !== 'saved-flow:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId)
        || byFlowRef.has(flow.ref)) fail('invalid-plan-identity');
      const items = [];
      for (const id of flow.steps.flatMap(step => step.itemIds)) {
        const matches = state.tasks.filter(task => task.id === id && task.flowId === flow.id);
        if (matches.length !== 1) fail('invalid-plan-identity');
        const item = matches[0];
        const prefix = 'flow-item:' + encodeURIComponent(flow.savedCopyId) + ':' + encodeURIComponent(flow.sourceFlowId) + ':';
        if (typeof item.ref !== 'string' || !item.ref.startsWith(prefix) || allItemRefs.has(item.ref)) fail('invalid-plan-identity');
        let itemId;
        try { itemId = decodeURIComponent(item.ref.slice(prefix.length)); } catch (_) { fail('invalid-plan-identity'); }
        if (!text(itemId) || prefix + encodeURIComponent(itemId) !== item.ref) fail('invalid-plan-identity');
        allItemRefs.add(item.ref);
        items.push({ localTaskId: item.id, itemRef: item.ref, itemId });
      }
      byFlowRef.set(flow.ref, { flow, binding: { localFlowId: flow.id, flowRef: flow.ref,
        savedCopyId: flow.savedCopyId, sourceFlowId: flow.sourceFlowId, items } });
    }
    return byFlowRef;
  }

  function captureFields(state, located, deps) {
    const flow = located.flow;
    if (!text(flow.title) || (own(flow, 'sourceTitle') && typeof flow.sourceTitle !== 'string')) fail('invalid-plan-baseline');
    const pick = (value, names) => Object.fromEntries(names.filter(key => own(value, key)).map(key => [key, value[key]]));
    const items = located.binding.items.map(identity => {
      const item = state.tasks.find(task => task.id === identity.localTaskId);
      if (!text(item.title) || (own(item, 'memo') && typeof item.memo !== 'string')
        || (own(item, 'sourceTitle') && typeof item.sourceTitle !== 'string')) fail('invalid-plan-baseline');
      for (const key of ['planDate', 'sourceDate']) if (own(item, key) && item[key] !== null && !deps.timeline.isPlainDate(item[key])) fail('invalid-plan-baseline');
      return pick(item, ['id', 'ref', 'title', 'memo', 'planDate', 'sourceTitle', 'sourceDate']);
    });
    return { flow: pick(flow, ['title', 'sourceTitle']), items };
  }

  function validSchedule(schedule, draft, deps) {
    if (!record(schedule)) return false;
    if (schedule.mode === 'fixed_date') return keys(schedule, ['mode', 'date']) && deps.timeline.isPlainDate(schedule.date);
    return (schedule.mode === 'unscheduled' || (draft && schedule.mode === 'inherit')) && keys(schedule, ['mode']);
  }

  function validateOverlay(overlay, located, fields, deps, allowEmpty = false) {
    if (!keys(overlay, ['flowRef', 'savedCopyId', 'flowId', 'items'], ['title'])
      || overlay.flowRef !== located.binding.flowRef || overlay.savedCopyId !== located.binding.savedCopyId
      || overlay.flowId !== located.binding.sourceFlowId || !record(overlay.items)
      || (own(overlay, 'title') && !text(overlay.title))) fail('invalid-plan-overlay');
    const byRef = new Map(fields.items.map(item => [item.ref, item]));
    for (const [ref, item] of Object.entries(overlay.items)) {
      const baseline = byRef.get(ref);
      if (!baseline || !keys(item, ['itemRef'], ['title', 'memo', 'schedule']) || item.itemRef !== ref
        || (own(item, 'title') && !text(item.title))
        || (own(item, 'memo') && (typeof item.memo !== 'string' || item.memo === baseline.memo))
        || (own(item, 'schedule') && !validSchedule(item.schedule, false, deps))
        || Object.keys(item).length === 1) fail('invalid-plan-overlay');
    }
    if (!allowEmpty && !own(overlay, 'title') && Object.keys(overlay.items).length === 0) fail('empty-plan-overlay');
  }

  function inspectMetadata(state, byFlowRef, deps) {
    if (!own(state, METADATA_KEY)) return null;
    const meta = state[METADATA_KEY];
    const structural = meta && meta.version === STRUCTURE_METADATA_VERSION && meta.contract === STRUCTURE_CONTRACT;
    if (!keys(meta, ['version', 'contract', 'entries']) || (!structural && (meta.version !== VERSION || meta.contract !== CONTRACT))
      || !record(meta.entries) || Object.keys(meta.entries).length === 0) fail('invalid-plan-metadata');
    for (const [ref, entry] of Object.entries(meta.entries)) {
      const located = byFlowRef.get(ref);
      if (!located || !keys(entry, ['binding', 'legacyPlanFields', 'overlay'], structural ? ['structure'] : [])
        || !equal(entry.binding, located.binding)) fail('invalid-plan-binding');
      const fields = captureFields(state, located, deps);
      if (!equal(entry.legacyPlanFields, fields)) fail('stale-plan-baseline');
      if (own(entry, 'structure')) validateStructure(entry.structure, state, located, deps);
      validateOverlay(entry.overlay, located, fields, deps, own(entry, 'structure'));
    }
    return meta;
  }

  // New section inputs follow React's trim-exact nonblank rule. Do not reuse
  // this for v1 core titles or memo, whose existing lossless rules are broader.
  const sectionText = value => text(value) && value.trim() === value;
  const sectionId = value => typeof value === 'string' && Boolean(value.trim()) && value.trim() === value && !tokenKeys.has(value);
  const fullPermutation = (value, refs) => Array.isArray(value) && value.length === refs.length
    && value.every(ref => typeof ref === 'string' && refs.includes(ref)) && new Set(value).size === refs.length;

  // Verify the original commit algorithm, not the source-update projection's
  // step-N fallback. A missing id is never allocated or repaired here.
  function authoredSectionProof(state, located, deps) {
    const flow = located.flow;
    if (flow.origin !== 'authoring-handoff' || typeof flow.rawText !== 'string'
      || !text(flow.handoffId) || flow.savedCopyId !== 'poc-' + flow.handoffId
      || !flow.sourceFlowId.startsWith('authoring-') || typeof deps.model.parseSource !== 'function'
      || typeof deps.model.fingerprint !== 'function' || flow.sourceFingerprint !== deps.model.fingerprint(flow.rawText)) return [];
    const safeId = value => String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'entry';
    const draftId = flow.sourceFlowId.slice('authoring-'.length);
    if (!draftId || safeId(draftId) !== draftId || safeId(flow.handoffId) !== flow.handoffId) return [];
    const suffix = safeId(flow.handoffId) + '-' + flow.sourceFingerprint;
    if (flow.id !== 'authored-' + suffix) return [];
    const parsed = deps.model.parseSource(flow.rawText);
    if (!parsed || parsed.issues.length || parsed.sourceFingerprint !== flow.sourceFingerprint) return [];
    const lines = [], rawLines = flow.rawText.replace(/\r\n?/g, '\n').split('\n');
    let current = false;
    rawLines.forEach((line, index) => {
      if (/^##\s+(.+?)\s*$/.test(line)) { lines.push(index + 1); current = true; return; }
      const item = /^-\s*\[([ xX])\]\s*(.*?)\s*$/.exec(line);
      if (item && item[2] && !current) { lines.push(null); current = true; }
    });
    if (lines.length !== parsed.steps.length) return [];
    const stored = flow.steps;
    if (stored.length !== parsed.steps.filter(step => step.items.length).length
      || stored.some(step => !sectionId(step.id)) || new Set(stored.map(step => step.id)).size !== stored.length) return [];
    const proofs = []; let storedIndex = 0, itemNumber = 0;
    for (let index = 0; index < parsed.steps.length; index += 1) {
      const original = parsed.steps[index];
      if (!original.items.length) continue;
      const step = stored[storedIndex++];
      if (step.id !== 'step-' + (index + 1) || step.title !== original.title || step.itemIds.length !== original.items.length) return [];
      const itemRefs = [];
      for (let itemIndex = 0; itemIndex < original.items.length; itemIndex += 1) {
        itemNumber += 1;
        const parsedItem = original.items[itemIndex], taskId = 'authored-item-' + suffix + '-' + itemNumber;
        const identity = located.binding.items.find(item => item.localTaskId === taskId);
        const task = state.tasks.find(item => item.id === taskId && item.flowId === flow.id);
        if (step.itemIds[itemIndex] !== taskId || !identity || identity.itemId !== 'item-' + itemNumber
          || !task || task.sourceLine !== parsedItem.sourceLine) return [];
        itemRefs.push(identity.itemRef);
      }
      if (lines[index] !== null) proofs.push({ sectionId: step.id, sourceLine: lines[index], itemRefs });
    }
    return proofs;
  }

  function captureStructure(state, located, deps) {
    return { rawSteps: copy(located.flow.steps), originalItemRefs: located.binding.items.map(item => item.itemRef),
      editableSections: authoredSectionProof(state, located, deps) };
  }

  function validateStructure(structure, state, located, deps) {
    if (!keys(structure, ['version', 'capture'], ['sectionTitles', 'orderedItemRefs']) || structure.version !== 1
      || !keys(structure.capture, ['rawSteps', 'originalItemRefs', 'editableSections'])
      || !equal(structure.capture, captureStructure(state, located, deps))) fail('invalid-plan-structure-capture');
    let changes = 0;
    if (own(structure, 'sectionTitles')) {
      if (!record(structure.sectionTitles) || Object.keys(structure.sectionTitles).length === 0) fail('invalid-plan-section-titles');
      const editable = new Set(structure.capture.editableSections.map(section => section.sectionId));
      for (const [id, title] of Object.entries(structure.sectionTitles)) {
        if (!editable.has(id) || !sectionText(title)) fail('invalid-plan-section-titles');
      }
      changes += 1;
    }
    if (own(structure, 'orderedItemRefs')) {
      if (!fullPermutation(structure.orderedItemRefs, structure.capture.originalItemRefs)
        || equal(structure.orderedItemRefs, structure.capture.originalItemRefs)) fail('invalid-plan-structure-order');
      changes += 1;
    }
    // Do not compare saved intent to today's source titles. A later source can
    // equal a personal alias without revoking that saved personal choice.
    if (!changes) fail('empty-plan-structure');
  }

  function structureView(sourceOwned, located, structure) {
    const capture = captureStructure(sourceOwned.rawState, located, sourceOwned.deps);
    const flow = sourceOwned.sourceView.flows.find(entry => entry.ref === located.binding.flowRef);
    const byTask = new Map(located.binding.items.map(item => [item.localTaskId, item.itemRef]));
    const ids = located.flow.steps.map(step => step.id);
    const sections = located.flow.steps.map((step, index) => {
      const id = sectionId(step.id) && ids.filter(value => value === step.id).length === 1 ? step.id : null;
      const proof = id && capture.editableSections.find(entry => entry.sectionId === id);
      const sourceTitle = flow.steps[index].title;
      const aliases = structure && structure.sectionTitles;
      return { sectionId: id, sourceOrder: index, sourceTitle,
        title: id && aliases && own(aliases, id) ? aliases[id] : sourceTitle,
        itemRefs: step.itemIds.map(taskId => byTask.get(taskId)),
        titleOwner: proof ? 'authoring' : located.flow.origin === 'authoring-handoff' ? 'unproven' : 'source',
        editCapability: proof ? 'poc-shadow' : 'readonly' };
    });
    return { flowRef: located.binding.flowRef, sections,
      orderedItemRefs: copy(structure && structure.orderedItemRefs || capture.originalItemRefs) };
  }

  function blankOverlay(located) {
    return { flowRef: located.binding.flowRef, savedCopyId: located.binding.savedCopyId, flowId: located.binding.sourceFlowId, items: {} };
  }

  function newDraft(located, fields, overlay) {
    const textDraft = (value, key) => own(value, key) ? { mode: 'override', value: value[key] } : { mode: 'inherit' };
    return { version: VERSION, flowRef: located.binding.flowRef, savedCopyId: located.binding.savedCopyId,
      flowId: located.binding.sourceFlowId, title: textDraft(overlay, 'title'),
      items: Object.fromEntries(fields.items.map(item => {
        const override = overlay.items[item.ref] || {};
        return [item.ref, { itemRef: item.ref, title: textDraft(override, 'title'), memo: textDraft(override, 'memo'),
          schedule: override.schedule ? copy(override.schedule) : { mode: 'inherit' } }];
      })) };
  }

  /** Raw authoritative state only. Full checkpoint validation remains C's job. */
  function inspectPlanContext(input) {
    try {
      inputRecord(input, ['state', 'flowRef'], ['legacyBaseRaw', 'undo']);
      const deps = dependencies();
      const byFlowRef = identities(input.state, deps);
      inspectLegacyInputs(input);
      const meta = inspectMetadata(input.state, byFlowRef, deps);
      const located = byFlowRef.get(input.flowRef);
      if (!located) fail('unknown-plan');
      if (deps.model.isTrashedFlow(input.state, located.flow.id)) fail('trashed-plan');
      const fields = captureFields(input.state, located, deps);
      const overlay = meta && meta.entries[input.flowRef] ? meta.entries[input.flowRef].overlay : blankOverlay(located);
      const draft = newDraft(located, fields, overlay);
      const baseline = { owner: 'existing-personal-baseline', title: fields.flow.title,
        sourceTitlePresent: own(fields.flow, 'sourceTitle'), items: Object.fromEntries(fields.items.map(item => {
          const raw = input.state.tasks.find(task => task.id === item.id);
          return [item.ref, { title: item.title, memoPresent: own(item, 'memo'), ...(own(item, 'memo') ? { memo: item.memo } : {}),
            planDatePresent: own(item, 'planDate'), planDate: own(item, 'planDate') ? item.planDate : own(item, 'sourceDate') ? item.sourceDate : raw.date,
            sourceTitlePresent: own(item, 'sourceTitle') }];
        })) };
      const context = Object.freeze({ version: VERSION });
      contexts.set(context, { bytes: JSON.stringify(input.state), located: frozenCopy(located), fields: frozenCopy(fields), overlay: frozenCopy(overlay), deps });
      return { ok: true, context, draft: frozenCopy(draft), baseline: frozenCopy(baseline) };
    } catch (error) { return failure(error); }
  }

  function textDraft(value, allowEmpty) {
    return keys(value, ['mode']) && value.mode === 'inherit'
      || keys(value, ['mode', 'value']) && value.mode === 'override' && typeof value.value === 'string' && (allowEmpty || text(value.value));
  }

  function normalized(owned, draft) {
    safeData(draft);
    const binding = owned.located.binding;
    if (!keys(draft, ['version', 'flowRef', 'savedCopyId', 'flowId', 'title', 'items']) || draft.version !== VERSION
      || draft.flowRef !== binding.flowRef || draft.savedCopyId !== binding.savedCopyId || draft.flowId !== binding.sourceFlowId
      || !textDraft(draft.title, false) || !record(draft.items)
      || Object.keys(draft.items).length !== owned.fields.items.length) fail('invalid-plan-draft');
    const overlay = blankOverlay(owned.located);
    if (draft.title.mode === 'override' && draft.title.value !== owned.fields.flow.title) overlay.title = draft.title.value;
    for (const baseline of owned.fields.items) {
      const item = draft.items[baseline.ref];
      if (!keys(item, ['itemRef', 'title', 'memo', 'schedule']) || item.itemRef !== baseline.ref
        || !textDraft(item.title, false) || !textDraft(item.memo, true) || !validSchedule(item.schedule, true, owned.deps)) fail('invalid-plan-draft');
      const override = { itemRef: baseline.ref };
      if (item.title.mode === 'override' && item.title.value !== baseline.title) override.title = item.title.value;
      if (item.memo.mode === 'override' && item.memo.value !== baseline.memo) override.memo = item.memo.value;
      if (item.schedule.mode !== 'inherit') override.schedule = copy(item.schedule);
      if (Object.keys(override).length > 1) overlay.items[baseline.ref] = override;
    }
    return overlay;
  }

  function normalizePlanDraft(context, draft) {
    try {
      const owned = contexts.get(context);
      if (!owned) fail('invalid-plan-context');
      return { ok: true, overlay: frozenCopy(normalized(owned, draft)) };
    } catch (error) { return failure(error); }
  }

  // Shared by raw-only and bound-source readers after raw metadata validation.
  // This helper is deliberately private: an arbitrary composed view is not authority.
  function applyValidatedOverlay(state, meta, deps) {
      const next = copy(state);
      if (meta) for (const [ref, entry] of Object.entries(meta.entries)) {
        const flow = next.flows.find(value => value.ref === ref);
        if (own(entry.overlay, 'title')) flow.title = entry.overlay.title;
        for (const item of Object.values(entry.overlay.items)) {
          const task = next.tasks.find(value => value.ref === item.itemRef && value.flowId === flow.id);
          if (own(item, 'title')) task.title = item.title;
          if (own(item, 'memo')) task.memo = item.memo;
          if (item.schedule) task.planDate = item.schedule.mode === 'fixed_date' ? item.schedule.date : null;
        }
      }
      // Reuse the existing domain guard, including supported recurrence limits.
      if (deps.model.validate(next).length) fail('invalid-effective-plan');
      return next;
  }

  /** Raw authoritative state only; the bound reader below is a separate API. */
  function projectPersonalPlanState(state) {
    try {
      const deps = dependencies();
      const byFlowRef = identities(state, deps);
      const meta = inspectMetadata(state, byFlowRef, deps);
      const next = applyValidatedOverlay(state, meta, deps);
      return { ok: true, viewOnly: true, state: next };
    } catch (error) { return failure(error); }
  }

  function sourceReadRaw(sourceRead) {
    inputRecord(sourceRead, ['ok'], ['raw', 'reason']);
    if (sourceRead.ok === false && keys(sourceRead, ['ok', 'reason'])
      && ['read-error', 'unavailable'].includes(sourceRead.reason)) fail('source-read-' + sourceRead.reason);
    if (sourceRead.ok !== true || !keys(sourceRead, ['ok', 'raw'])
      || (sourceRead.raw !== null && typeof sourceRead.raw !== 'string')) fail('invalid-source-read');
    return sourceRead.raw;
  }

  function sourceEpoch(value) {
    if (!Number.isSafeInteger(value) || value < 0) fail('invalid-source-epoch');
    return value;
  }

  function decodeSourceRead(raw, deps) {
    if (typeof deps.model.loadSourceCandidateStore !== 'function'
      || typeof deps.model.composeSourceCandidateState !== 'function'
      || typeof deps.model.fingerprint !== 'function'
      || typeof deps.model.fingerprintPersonalWorkspacePocAuthoringSource !== 'function'
      || typeof deps.model.SOURCE_CANDIDATE_STORAGE_KEY !== 'string') fail('source-read-unavailable');
    const loaded = deps.model.loadSourceCandidateStore({ getItem(key) {
      if (key !== deps.model.SOURCE_CANDIDATE_STORAGE_KEY) fail('source-reader-key-mismatch');
      return raw;
    } });
    if (!loaded || !['empty', 'restored'].includes(loaded.status) || !loaded.store) {
      fail('source-read-' + (loaded && ['corrupt', 'unavailable', 'read-error'].includes(loaded.status) ? loaded.status : 'unavailable'));
    }
    if (loaded.raw !== raw) fail('source-reader-raw-mismatch');
    // The existing decoder receives JSON text, never caller-supplied getters.
    safeData(loaded.store);
    return loaded;
  }

  function sourceProjectionBinding(projected, located, state) {
    const binding = located.binding;
    if (!projected || projected.ref !== binding.flowRef || projected.savedCopyId !== binding.savedCopyId
      || projected.flowId !== binding.sourceFlowId || projected.origin !== 'authoring-handoff') fail('source-target-mismatch');
    const sections = projected.sections || [];
    if (sections.length !== located.flow.steps.length || projected.items.length !== binding.items.length) fail('source-membership-not-supported');
    for (let index = 0; index < sections.length; index += 1) {
      if (sections[index].sectionId !== located.flow.steps[index].id || sections[index].sourceOrder !== index) fail('source-membership-not-supported');
    }
    for (let index = 0; index < binding.items.length; index += 1) {
      const identity = binding.items[index];
      const sourceItem = projected.items.find(item => item.ref === identity.itemRef);
      const step = located.flow.steps.find(entry => entry.itemIds.includes(identity.localTaskId));
      if (!sourceItem || sourceItem.itemId !== identity.itemId || sourceItem.savedCopyId !== binding.savedCopyId
        || sourceItem.flowId !== binding.sourceFlowId || sourceItem.sourceOrder !== index
        || !step || sourceItem.sectionId !== step.id) fail('source-membership-not-supported');
      if (!state.tasks.some(task => task.id === identity.localTaskId && task.ref === sourceItem.ref)) fail('source-target-mismatch');
    }
  }

  function validateSourceBindings(state, byFlowRef, store, deps) {
    // Pending/deferred records are validated too, but only effective records are
    // composed. A missing target is not silently converted to a partial success.
    for (const envelope of Object.values(store.envelopes)) {
      const located = byFlowRef.get(envelope.target.flowRef);
      if (!located) fail('source-target-missing');
      const flow = located.flow;
      if (flow.origin !== 'authoring-handoff' || envelope.target.savedCopyId !== flow.savedCopyId
        || envelope.target.flowId !== flow.sourceFlowId || envelope.target.handoffId !== flow.handoffId) fail('source-target-mismatch');
      if (typeof flow.rawText !== 'string' || flow.sourceFingerprint !== deps.model.fingerprint(flow.rawText)
        || envelope.base.rawText !== flow.rawText || envelope.mine.rawText !== flow.rawText
        || envelope.base.sourceFingerprint !== deps.model.fingerprintPersonalWorkspacePocAuthoringSource(flow.rawText)) fail('source-base-lineage-mismatch');
      if (!equal(envelope.base, envelope.mine)) fail('source-chain-not-supported');
      sourceProjectionBinding(envelope.base.projectedFlow, located, state);
      const source = envelope.base.projectedFlow;
      if (own(flow, 'sourceTitle') && flow.sourceTitle !== source.title) fail('source-base-fact-mismatch');
      for (const identity of located.binding.items) {
        const task = state.tasks.find(entry => entry.id === identity.localTaskId);
        const item = source.items.find(entry => entry.ref === identity.itemRef);
        if ((own(task, 'sourceTitle') && task.sourceTitle !== item.title)
          || (own(task, 'sourceDate') && task.sourceDate !== (item.sourceDate === undefined ? null : item.sourceDate))) fail('source-base-fact-mismatch');
      }
    }
    for (const [ref, version] of Object.entries(store.effectiveVersions)) {
      const located = byFlowRef.get(ref);
      if (!located) fail('source-target-missing');
      sourceProjectionBinding(version.projectedFlow, located, state);
    }
  }

  function restorePresence(target, original, names) {
    for (const key of names) { if (own(original, key)) target[key] = copy(original[key]); else delete target[key]; }
  }

  function verifySourceOnlyChange(raw, view) {
    safeData(view);
    const restored = copy(view);
    if (restored.flows.length !== raw.flows.length || restored.tasks.length !== raw.tasks.length) fail('source-membership-not-supported');
    raw.flows.forEach((flow, index) => {
      const next = restored.flows[index];
      if (next.id !== flow.id || next.ref !== flow.ref || next.steps.length !== flow.steps.length) fail('source-target-mismatch');
      restorePresence(next, flow, ['title', 'sourceTitle', 'rawText', 'sourceFingerprint']);
      flow.steps.forEach((step, position) => { next.steps[position].title = step.title; });
    });
    raw.tasks.forEach((task, index) => {
      const next = restored.tasks[index];
      if (next.id !== task.id || next.ref !== task.ref) fail('source-target-mismatch');
      restorePresence(next, task, ['title', 'sourceTitle', 'sourceDate', 'sourceDescription', 'completionCriterion']);
    });
    if (!equal(restored, raw)) fail('unexpected-source-view-change');
  }

  const capability = (owner, reason) => ({ editable: !reason, owner, ...(reason ? { reason } : {}) });
  function sourceCapabilities(raw, view, store, byFlowRef, deps) {
    const flows = {};
    for (const located of byFlowRef.values()) {
      const flow = located.flow;
      const target = view.flows.find(entry => entry.ref === flow.ref);
      const applied = own(store.effectiveVersions, flow.ref);
      function titleCapability(original, next) {
        const hasSource = own(original, 'sourceTitle');
        const owner = hasSource && original.title === original.sourceTitle ? 'source' : 'existing-personal-baseline';
        const changed = applied && original.title !== next.title;
        if (!hasSource) next.title = original.title;
        return capability(owner, changed ? hasSource ? 'source-aware-normalization-required' : 'source-title-owner-unproven' : null);
      }
      const title = titleCapability(flow, target);
      const items = {};
      for (const identity of located.binding.items) {
        const task = raw.tasks.find(entry => entry.id === identity.localTaskId);
        const next = view.tasks.find(entry => entry.id === identity.localTaskId);
        const beforeDate = own(task, 'planDate') ? task.planDate : own(task, 'sourceDate') ? task.sourceDate : task.date;
        const afterDate = own(next, 'planDate') ? next.planDate : own(next, 'sourceDate') ? next.sourceDate : next.date;
        items[identity.itemRef] = {
          title: titleCapability(task, next),
          memo: capability('existing-personal-baseline', null),
          schedule: capability(own(task, 'planDate') ? 'existing-personal-baseline' : own(task, 'sourceDate') ? 'source' : 'existing-personal-baseline',
            applied && beforeDate !== afterDate ? 'source-aware-normalization-required' : null),
        };
      }
      const trashed = deps.model.isTrashedFlow(raw, flow.id);
      let baselineReason = null;
      try { captureFields(raw, located, deps); } catch (_) { baselineReason = 'invalid-plan-baseline'; }
      const canEdit = !trashed && !baselineReason && title.editable && Object.values(items).every(item => Object.values(item).every(field => field.editable));
      flows[flow.ref] = { canEdit, title, items, ...(trashed || baselineReason ? { reason: trashed ? 'trashed-plan' : baselineReason } : {}) };
    }
    return { flows };
  }

  /** Read-only Sa gate. Does not authorize normalization or a storage attempt. */
  function readPersonalPlanSourceContext(input) {
    try {
      inputRecord(input, ['rawState', 'legacyBaseRaw', 'undo', 'sourceRead', 'sourceEpoch']);
      const raw = sourceReadRaw(input.sourceRead);
      const epoch = sourceEpoch(input.sourceEpoch);
      if (input.legacyBaseRaw !== null && typeof input.legacyBaseRaw !== 'string') fail('invalid-legacy-plan-input');
      if (input.undo !== null) safeData(input.undo);
      const deps = dependencies();
      const byFlowRef = identities(input.rawState, deps);
      inspectLegacyInputs({ state: input.rawState, legacyBaseRaw: input.legacyBaseRaw, undo: input.undo });
      const meta = inspectMetadata(input.rawState, byFlowRef, deps);
      const loaded = decodeSourceRead(raw, deps);
      validateSourceBindings(input.rawState, byFlowRef, loaded.store, deps);
      const sourceView = deps.model.composeSourceCandidateState(copy(input.rawState), loaded.store);
      verifySourceOnlyChange(input.rawState, sourceView);
      const capabilities = frozenCopy(sourceCapabilities(input.rawState, sourceView, loaded.store, byFlowRef, deps));
      const state = frozenCopy(applyValidatedOverlay(sourceView, meta, deps));
      const context = Object.freeze({ version: VERSION });
      sourceContexts.set(context, { rawBytes: JSON.stringify(input.rawState), sourceRaw: raw, epoch, capabilities,
        rawState: frozenCopy(input.rawState), sourceView: frozenCopy(sourceView), deps });
      return { ok: true, viewOnly: true, context, state, capabilities,
        sourceDiagnostics: frozenCopy({ status: loaded.status, appliedFlowRefs: Object.keys(loaded.store.effectiveVersions),
          pendingCount: Object.values(loaded.store.reviews).filter(review => review.status === 'pending').length,
          deferredCount: Object.values(loaded.store.reviews).filter(review => review.status === 'deferred').length }) };
    } catch (error) { return { ...failure(error), scope: 'source-dependent', canEdit: false }; }
  }

  function checkPersonalPlanSourceContext(context, input) {
    try {
      const owned = sourceContexts.get(context);
      if (!owned) fail('invalid-source-context');
      inputRecord(input, ['rawState', 'sourceRead', 'sourceEpoch']);
      const raw = sourceReadRaw(input.sourceRead);
      const epoch = sourceEpoch(input.sourceEpoch);
      safeData(input.rawState);
      if (JSON.stringify(input.rawState) !== owned.rawBytes) fail('stale-plan-source-raw');
      if (raw !== owned.sourceRaw) fail('stale-plan-source-read');
      if (epoch !== owned.epoch) fail('stale-plan-source-epoch');
      return { ok: true, capabilities: owned.capabilities };
    } catch (error) { return { ...failure(error), scope: 'source-dependent', canEdit: false }; }
  }

  // Validation copies use the same metadata assembly as actual candidates,
  // but do not carry a new revision, timestamp, Undo or storage authority.
  function withPlannedMetadata(before, owned, overlay, structureOverride) {
      const state = copy(before);
      const ref = owned.located.binding.flowRef;
      const previous = own(before, METADATA_KEY) && before[METADATA_KEY].entries[ref];
      const structure = arguments.length > 3 ? structureOverride : previous && previous.structure;
      const hasChanges = own(overlay, 'title') || Object.keys(overlay.items).length > 0;
      if (hasChanges || structure) {
        if (!own(state, METADATA_KEY)) state[METADATA_KEY] = { version: VERSION, contract: CONTRACT, entries: {} };
        if (structure) { state[METADATA_KEY].version = STRUCTURE_METADATA_VERSION; state[METADATA_KEY].contract = STRUCTURE_CONTRACT; }
        state[METADATA_KEY].entries[ref] = { binding: copy(owned.located.binding), legacyPlanFields: copy(owned.fields), overlay,
          ...(structure ? { structure: copy(structure) } : {}) };
      } else if (own(state, METADATA_KEY)) {
        delete state[METADATA_KEY].entries[ref];
        if (Object.keys(state[METADATA_KEY].entries).length === 0) delete state[METADATA_KEY];
      }
      return state;
  }

  function validatePlannedViews(state, sourceView, deps) {
      const projected = projectPersonalPlanState(state);
      if (!projected.ok) return projected;
      if (sourceView) applyValidatedOverlay(sourceView, state[METADATA_KEY] || null, deps);
      return { ok: true };
  }

  function planFromOverlay(before, owned, overlay, now, sourceView) {
      if (equal(overlay, owned.overlay)) return { ok: true, changed: false, state: before };
      if (typeof now !== 'string' || !Number.isFinite(Date.parse(now)) || new Date(now).toISOString() !== now) fail('invalid-plan-time');
      if (before.revision >= Number.MAX_SAFE_INTEGER) fail('revision-overflow');
      const state = withPlannedMetadata(before, owned, overlay);
      state.revision += 1;
      state.updatedAt = now;
      const validated = validatePlannedViews(state, sourceView, owned.deps);
      if (!validated.ok) return validated;
      return { ok: true, changed: true, state, undo: copy(before) };
  }

  function planPersonalPlanState(input) {
    try {
      inputRecord(input, ['state', 'context', 'draft', 'now']);
      const owned = contexts.get(input.context);
      if (!owned) fail('invalid-plan-context');
      safeData(input.state);
      if (JSON.stringify(input.state) !== owned.bytes) fail('stale-plan-context');
      return planFromOverlay(input.state, owned, normalized(owned, input.draft), input.now);
    } catch (error) { return failure(error); }
  }

  function sourceEditorCapabilities(sourceCapability) {
    const result = copy(sourceCapability);
    const unlockVerifiedBaseline = field => {
      if (field.reason === 'source-aware-normalization-required') { delete field.reason; field.editable = true; }
    };
    unlockVerifiedBaseline(result.title);
    for (const item of Object.values(result.items)) Object.values(item).forEach(unlockVerifiedBaseline);
    result.canEdit = !result.reason && result.title.editable
      && Object.values(result.items).every(item => Object.values(item).every(field => field.editable));
    return result;
  }

  /** Uses a privately verified pre-P source view; public canEdit flags are not inputs. */
  function inspectPersonalPlanSourceEditor(input) {
    try {
      inputRecord(input, ['sourceContext', 'flowRef']);
      const sourceOwned = sourceContexts.get(input.sourceContext);
      if (!sourceOwned) fail('invalid-source-context');
      const byFlowRef = identities(sourceOwned.rawState, sourceOwned.deps);
      const located = byFlowRef.get(input.flowRef);
      if (!located) fail('unknown-plan');
      const rawCapability = sourceOwned.capabilities.flows[input.flowRef];
      const capabilities = sourceEditorCapabilities(rawCapability);
      if (!capabilities.canEdit) {
        const fieldReasons = [capabilities.title, ...Object.values(capabilities.items).flatMap(item => Object.values(item))];
        return { ok: false, reason: capabilities.reason || fieldReasons.find(field => !field.editable)?.reason || 'source-editor-unavailable',
          canEdit: false, capabilities: frozenCopy(capabilities) };
      }
      const fields = captureFields(sourceOwned.rawState, located, sourceOwned.deps);
      const inheritedFields = copy(fields);
      const sourceFlow = sourceOwned.sourceView.flows.find(flow => flow.ref === input.flowRef);
      inheritedFields.flow.title = sourceFlow.title;
      for (const item of inheritedFields.items) {
        const sourceItem = sourceOwned.sourceView.tasks.find(task => task.ref === item.ref && task.flowId === located.flow.id);
        item.title = sourceItem.title;
      }
      const meta = inspectMetadata(sourceOwned.rawState, byFlowRef, sourceOwned.deps);
      const overlay = meta && meta.entries[input.flowRef] ? meta.entries[input.flowRef].overlay : blankOverlay(located);
      const draft = newDraft(located, fields, overlay);
      const baseline = { title: inheritedFields.flow.title, items: Object.fromEntries(inheritedFields.items.map(item => {
        const sourceItem = sourceOwned.sourceView.tasks.find(task => task.ref === item.ref && task.flowId === located.flow.id);
        return [item.ref, { title: item.title, memoPresent: own(item, 'memo'), ...(own(item, 'memo') ? { memo: item.memo } : {}),
          planDatePresent: own(item, 'planDate'), planDate: own(sourceItem, 'planDate') ? sourceItem.planDate
            : own(sourceItem, 'sourceDate') ? sourceItem.sourceDate : sourceItem.date }];
      })) };
      const context = Object.freeze({ version: VERSION });
      sourceEditorContexts.set(context, { sourceContext: input.sourceContext, sourceOwned, located: frozenCopy(located),
        fields: frozenCopy(fields), inheritedFields: frozenCopy(inheritedFields), overlay: frozenCopy(overlay),
        openedDraft: frozenCopy(draft), deps: sourceOwned.deps });
      return { ok: true, context, draft: frozenCopy(draft), baseline: frozenCopy(baseline), capabilities: frozenCopy(capabilities) };
    } catch (error) { return { ...failure(error), canEdit: false }; }
  }

  function normalizedSourceIntent(owned, draft) {
    // Normalize edited fields against the privately verified pre-P baseline.
    // Preserve unchanged stored intent, even if a later source now has its value.
    const overlay = normalized({ ...owned, fields: owned.inheritedFields }, draft);
    if (equal(draft.title, owned.openedDraft.title)) restorePresence(overlay, owned.overlay, ['title']);
    for (const item of owned.fields.items) {
      const original = owned.overlay.items[item.ref] || { itemRef: item.ref };
      const next = overlay.items[item.ref] || { itemRef: item.ref };
      for (const key of ['title', 'memo', 'schedule']) {
        if (equal(draft.items[item.ref][key], owned.openedDraft.items[item.ref][key])) restorePresence(next, original, [key]);
      }
      if (Object.keys(next).length > 1) overlay.items[item.ref] = next;
      else delete overlay.items[item.ref];
    }
    return overlay;
  }

  function planPersonalPlanSourceState(input) {
    try {
      inputRecord(input, ['context', 'rawState', 'sourceRead', 'sourceEpoch', 'draft', 'now']);
      const owned = sourceEditorContexts.get(input.context);
      if (!owned) fail('invalid-source-editor-context');
      const fresh = checkPersonalPlanSourceContext(owned.sourceContext, { rawState: input.rawState,
        sourceRead: input.sourceRead, sourceEpoch: input.sourceEpoch });
      if (!fresh.ok) return fresh;
      return planFromOverlay(input.rawState, owned, normalizedSourceIntent(owned, input.draft), input.now, owned.sourceOwned.sourceView);
    } catch (error) { return { ...failure(error), canEdit: false }; }
  }

  /** Captured input/domain validity only. Never current freshness or permission. */
  function validateCapturedPersonalPlanSourceDraft(input) {
    const scope = 'captured-source-draft';
    try {
      inputRecord(input, ['context', 'draft']);
      const owned = sourceEditorContexts.get(input.context);
      if (!owned) fail('invalid-source-editor-context');
      const overlay = normalizedSourceIntent(owned, input.draft);
      const validationState = withPlannedMetadata(owned.sourceOwned.rawState, owned, overlay);
      const validated = validatePlannedViews(validationState, owned.sourceOwned.sourceView, owned.deps);
      if (!validated.ok) return { ok: false, scope, reason: validated.reason };
      return { ok: true, scope };
    } catch (error) { return { ...failure(error), scope }; }
  }

  /** B2 has a distinct opaque editor token. No storage permission is issued. */
  function inspectPersonalPlanStructureEditor(input) {
    try {
      inputRecord(input, ['sourceContext', 'flowRef']);
      const core = inspectPersonalPlanSourceEditor(input);
      if (!core.ok) return core;
      const coreOwned = sourceEditorContexts.get(core.context), sourceOwned = coreOwned.sourceOwned;
      const located = coreOwned.located;
      const meta = inspectMetadata(sourceOwned.rawState, identities(sourceOwned.rawState, sourceOwned.deps), sourceOwned.deps);
      const entry = meta && meta.entries[input.flowRef], structure = entry && entry.structure || null;
      const capture = captureStructure(sourceOwned.rawState, located, sourceOwned.deps);
      const projected = structureView(sourceOwned, located, structure);
      const sectionTitles = Object.fromEntries(capture.editableSections.map(section => [section.sectionId,
        structure && structure.sectionTitles && own(structure.sectionTitles, section.sectionId)
          ? { mode: 'override', value: structure.sectionTitles[section.sectionId] } : { mode: 'inherit' }]));
      const draft = { ...copy(core.draft), version: STRUCTURE_DRAFT_VERSION, sectionTitles,
        orderedItemRefs: copy(projected.orderedItemRefs) };
      const context = Object.freeze({ version: STRUCTURE_DRAFT_VERSION });
      structureEditorContexts.set(context, { coreOwned, sourceOwned, located, capture: frozenCopy(capture),
        structure: structure ? frozenCopy(structure) : null, openedDraft: frozenCopy(draft),
        inheritedSections: frozenCopy(Object.fromEntries(projected.sections.filter(section => section.editCapability === 'poc-shadow')
          .map(section => [section.sectionId, section.sourceTitle]))) });
      return { ok: true, context, draft: frozenCopy(draft), structure: frozenCopy(projected),
        baseline: frozenCopy({ ...core.baseline, sectionTitles: Object.fromEntries(projected.sections
          .filter(section => section.editCapability === 'poc-shadow').map(section => [section.sectionId, section.sourceTitle])),
          orderedItemRefs: capture.originalItemRefs }), capabilities: core.capabilities };
    } catch (error) { return { ...failure(error), canEdit: false }; }
  }

  function normalizedStructureIntent(owned, draft) {
    safeData(draft);
    if (!keys(draft, ['version', 'flowRef', 'savedCopyId', 'flowId', 'title', 'items', 'sectionTitles', 'orderedItemRefs'])
      || draft.version !== STRUCTURE_DRAFT_VERSION || !record(draft.sectionTitles)
      || !equal(Object.keys(draft.sectionTitles).sort(), owned.capture.editableSections.map(section => section.sectionId).sort())
      || !fullPermutation(draft.orderedItemRefs, owned.capture.originalItemRefs)) fail('invalid-plan-structure-draft');
    const coreDraft = { version: VERSION, flowRef: draft.flowRef, savedCopyId: draft.savedCopyId, flowId: draft.flowId,
      title: draft.title, items: draft.items };
    const overlay = normalizedSourceIntent(owned.coreOwned, coreDraft);
    const titles = {}, previous = owned.structure;
    for (const section of owned.capture.editableSections) {
      const id = section.sectionId, value = draft.sectionTitles[id];
      if (!textDraft(value, false) || (value.mode === 'override' && !sectionText(value.value))) fail('invalid-plan-section-draft');
      if (equal(value, owned.openedDraft.sectionTitles[id]) && previous && previous.sectionTitles && own(previous.sectionTitles, id)) {
        titles[id] = previous.sectionTitles[id];
      } else if (value.mode === 'override' && value.value !== owned.inheritedSections[id]) titles[id] = value.value;
    }
    let order = null;
    if (equal(draft.orderedItemRefs, owned.openedDraft.orderedItemRefs) && previous && previous.orderedItemRefs) order = previous.orderedItemRefs;
    else if (!equal(draft.orderedItemRefs, owned.capture.originalItemRefs)) order = draft.orderedItemRefs;
    const structure = Object.keys(titles).length || order ? { version: 1, capture: copy(owned.capture),
      ...(Object.keys(titles).length ? { sectionTitles: titles } : {}), ...(order ? { orderedItemRefs: copy(order) } : {}) } : null;
    return { overlay, structure };
  }

  function structureValidationState(owned, draft) {
    const intent = normalizedStructureIntent(owned, draft);
    const state = withPlannedMetadata(owned.sourceOwned.rawState, owned.coreOwned, intent.overlay, intent.structure);
    const validated = validatePlannedViews(state, owned.sourceOwned.sourceView, owned.sourceOwned.deps);
    if (!validated.ok) fail(validated.reason);
    return state;
  }

  function validateCapturedPersonalPlanStructureDraft(input) {
    const scope = 'captured-structure-draft';
    try {
      inputRecord(input, ['context', 'draft']);
      const owned = structureEditorContexts.get(input.context);
      if (!owned) fail('invalid-structure-editor-context');
      structureValidationState(owned, input.draft);
      return { ok: true, scope };
    } catch (error) { return { ...failure(error), scope }; }
  }

  function planPersonalPlanStructureState(input) {
    try {
      inputRecord(input, ['context', 'rawState', 'sourceRead', 'sourceEpoch', 'draft', 'now']);
      const owned = structureEditorContexts.get(input.context);
      if (!owned) fail('invalid-structure-editor-context');
      const fresh = checkPersonalPlanSourceContext(owned.coreOwned.sourceContext,
        { rawState: input.rawState, sourceRead: input.sourceRead, sourceEpoch: input.sourceEpoch });
      if (!fresh.ok) return fresh;
      const state = structureValidationState(owned, input.draft);
      if (equal(state, input.rawState)) return { ok: true, changed: false, state: input.rawState };
      if (typeof input.now !== 'string' || !Number.isFinite(Date.parse(input.now)) || new Date(input.now).toISOString() !== input.now) fail('invalid-plan-time');
      if (state.revision >= Number.MAX_SAFE_INTEGER) fail('revision-overflow');
      state.revision += 1; state.updatedAt = input.now;
      return { ok: true, changed: true, state, undo: copy(input.rawState) };
    } catch (error) { return { ...failure(error), canEdit: false }; }
  }

  function readPersonalPlanStructureView(input) {
    try {
      inputRecord(input, ['sourceContext', 'flowRef']);
      const owned = sourceContexts.get(input.sourceContext);
      if (!owned) fail('invalid-source-context');
      const byFlowRef = identities(owned.rawState, owned.deps), located = byFlowRef.get(input.flowRef);
      if (!located) fail('unknown-plan');
      const meta = inspectMetadata(owned.rawState, byFlowRef, owned.deps), entry = meta && meta.entries[input.flowRef];
      return frozenCopy({ ok: true, viewOnly: true, ...structureView(owned, located, entry && entry.structure) });
    } catch (error) { return failure(error); }
  }

  // Display-only: compare captured semantic intent before formatting. This does
  // not check live freshness, mint a candidate, or issue permission to save.
  function summarizeCapturedPersonalPlanChanges(input) {
    const scope = 'captured-plan-changes';
    try {
      inputRecord(input, ['context', 'draft'], ['compareDraft']);
      const structural = structureEditorContexts.get(input.context);
      const core = structural ? structural.coreOwned : sourceEditorContexts.get(input.context);
      if (!core) fail('invalid-captured-plan-context');
      const validateIntent = draft => {
        const intent = structural ? normalizedStructureIntent(structural, draft)
          : { overlay: normalizedSourceIntent(core, draft) };
        const temporary = structural
          ? withPlannedMetadata(core.sourceOwned.rawState, core, intent.overlay, intent.structure)
          : withPlannedMetadata(core.sourceOwned.rawState, core, intent.overlay);
        const validated = validatePlannedViews(temporary, core.sourceOwned.sourceView, core.deps);
        if (!validated.ok) fail(validated.reason);
        return intent;
      };
      const after = validateIntent(input.draft);
      const before = own(input, 'compareDraft') ? validateIntent(input.compareDraft)
        : { overlay: core.overlay, ...(structural ? { structure: structural.structure } : {}) };
      const changes = [], affectedRefs = new Set(), affectedItems = new Set();
      const flowRef = core.located.binding.flowRef;
      const controls = /[\u0000-\u001f\u007f]/u;
      const boundedLabel = raw => {
        const clean = raw.replace(/[\u0000-\u001f\u007f]/gu, ' ');
        if (clean.length <= 160) return clean;
        let end = 159;
        // Keep the UTF-16 display limit without splitting a source code point.
        const left = clean.charCodeAt(end - 1), right = clean.charCodeAt(end);
        if (left >= 0xd800 && left <= 0xdbff && right >= 0xdc00 && right <= 0xdfff) end -= 1;
        return clean.slice(0, end) + '…';
      };
      const displayText = (value, prefix) => {
        if (value === undefined) return '개인 메모 없음';
        const short = prefix + ' · ' + (value === '' ? '없음' : value);
        return short.length <= 160 && !controls.test(short) ? short : prefix + ' · ' + value.length + '자';
      };
      const textIntent = (record, key) => own(record, key) ? { mode: 'override', value: record[key] } : { mode: 'inherit' };
      const textValue = (intent, inherited, memo) => displayText(intent.mode === 'override' ? intent.value : inherited,
        intent.mode === 'override' ? '내 계획' : memo ? '기존 개인 메모' : '원본 따르기');
      const append = (field, label, ref, previous, next, previousDisplay, nextDisplay, previousCount, nextCount, order) => {
        if (equal(previous, next)) return;
        // Compaction must not turn different exact values into an equal pair.
        if (previousDisplay === nextDisplay) {
          previousDisplay = (order ? '기존 순서 · ' : '변경 전 · ') + previousCount + (order ? '개' : '자');
          nextDisplay = (order ? '변경된 순서 · ' : '변경 후 · ') + nextCount + (order ? '개' : '자');
        }
        changes.push({ owner: 'poc-personal-plan', field, label: boundedLabel(label), before: previousDisplay, after: nextDisplay });
        affectedRefs.add(ref); if (ref !== flowRef) affectedItems.add(ref);
      };
      const appendText = (field, label, ref, previous, next, inherited, memo = false) => {
        const oldValue = previous.mode === 'override' ? previous.value : inherited;
        const newValue = next.mode === 'override' ? next.value : inherited;
        append(field, label, ref, previous, next, textValue(previous, inherited, memo), textValue(next, inherited, memo),
          oldValue === undefined ? 0 : oldValue.length, newValue === undefined ? 0 : newValue.length);
      };
      appendText('flow.title', 'Flow 제목', flowRef, textIntent(before.overlay, 'title'), textIntent(after.overlay, 'title'), core.inheritedFields.flow.title);
      if (structural) {
        for (const section of structural.capture.editableSections) {
          const id = section.sectionId, inherited = structural.inheritedSections[id];
          appendText('section.' + id + '.title', inherited + ' · 구간 제목', flowRef,
            textIntent(before.structure && before.structure.sectionTitles || {}, id),
            textIntent(after.structure && after.structure.sectionTitles || {}, id), inherited);
        }
        const original = structural.capture.originalItemRefs;
        const oldOrder = before.structure && before.structure.orderedItemRefs || original;
        const newOrder = after.structure && after.structure.orderedItemRefs || original;
        const orderDisplay = (order, overlay) => {
          const titles = new Map(core.inheritedFields.items.map(item => [item.ref, item.title]));
          const value = order.map((ref, index) => {
            const item = overlay.items[ref];
            return (index + 1) + '. ' + (item && own(item, 'title') ? item.title : titles.get(ref));
          }).join(' → ');
          return value.length <= 160 && !controls.test(value) ? value : order.length + '개 항목';
        };
        append('flow.item-order', 'Item 순서', flowRef, oldOrder, newOrder,
          orderDisplay(oldOrder, before.overlay), orderDisplay(newOrder, after.overlay), oldOrder.length, newOrder.length, true);
      }
      for (const item of core.inheritedFields.items) {
        const previous = before.overlay.items[item.ref] || {}, next = after.overlay.items[item.ref] || {};
        const prefix = 'item.' + item.ref;
        appendText(prefix + '.title', item.title + ' · 제목', item.ref, textIntent(previous, 'title'), textIntent(next, 'title'), item.title);
        appendText(prefix + '.memo', item.title + ' · 메모', item.ref, textIntent(previous, 'memo'), textIntent(next, 'memo'), item.memo, true);
        const sourceItem = core.sourceOwned.sourceView.tasks.find(task => task.ref === item.ref && task.flowId === core.located.flow.id);
        const inheritedDate = own(sourceItem, 'planDate') ? sourceItem.planDate : own(sourceItem, 'sourceDate') ? sourceItem.sourceDate : sourceItem.date;
        const oldSchedule = previous.schedule || { mode: 'inherit' }, newSchedule = next.schedule || { mode: 'inherit' };
        const scheduleDisplay = schedule => schedule.mode === 'inherit' ? '원본 일정 · ' + (inheritedDate || '날짜 미정')
          : schedule.mode === 'unscheduled' ? '내 계획 · 날짜 미정' : '내 계획 · ' + schedule.date;
        append(prefix + '.schedule', item.title + ' · 계획 날짜', item.ref, oldSchedule, newSchedule,
          scheduleDisplay(oldSchedule), scheduleDisplay(newSchedule), 0, 0);
      }
      return frozenCopy({ ok: true, scope, changed: changes.length > 0, changes, affectedRefs: [...affectedRefs],
        changedFieldCount: changes.length, flowCount: affectedRefs.has(flowRef) ? 1 : 0, itemCount: affectedItems.size });
    } catch (error) { return frozenCopy({ ...failure(error), scope }); }
  }

  return Object.freeze({ VERSION, METADATA_KEY, CONTRACT, STRUCTURE_DRAFT_VERSION, STRUCTURE_METADATA_VERSION, STRUCTURE_CONTRACT,
    summarizeCapturedPersonalPlanChanges,
    inspectPersonalPlanStructureEditor, validateCapturedPersonalPlanStructureDraft, planPersonalPlanStructureState, readPersonalPlanStructureView,
    inspectPlanContext, normalizePlanDraft, projectPersonalPlanState, planPersonalPlanState,
    readPersonalPlanSourceContext, checkPersonalPlanSourceContext, inspectPersonalPlanSourceEditor, planPersonalPlanSourceState,
    validateCapturedPersonalPlanSourceDraft });
});
