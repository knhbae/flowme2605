/* Local title query + canonical input classification. No I/O, renderer or writes. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => ({
    reader: require('./personal-entry-read.js'), canonical: require('./personal-entry-query-runtime.cjs').loadCommonJs(),
  }));
  else root.FlowPocPersonalEntryQuery = factory(() => ({ reader: root.FlowPocPersonalEntryRead,
    canonical: root.FlowPocPersonalEntryCanonical }));
})(typeof globalThis !== 'undefined' ? globalThis : this, function (loadDependencies) {
  'use strict';
  const VERSION = 1;
  const CONTRACT = 'flowme-standalone-personal-entry-query-v1';
  const READER_CONTRACT = 'flowme-standalone-personal-entry-v1';
  const EMPTY_MODEL = Object.freeze({ version: 1, flows: Object.freeze([]) });
  const failures = new WeakMap();
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  function fail(reason) { const error = new Error(reason); failures.set(error, reason); throw error; }
  function blocked(rawInput, reason) {
    return Object.freeze({ ok: false, scope: 'entry-query', reason,
      ...(typeof rawInput === 'string' ? { rawInput } : {}) });
  }
  function frozenCopy(value) {
    const copy = JSON.parse(JSON.stringify(value));
    function freeze(entry) { if (entry && typeof entry === 'object') { Object.values(entry).forEach(freeze); Object.freeze(entry); } return entry; }
    return freeze(copy);
  }
  function exact(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getOwnPropertySymbols(value).length
      || Object.getOwnPropertyNames(value).length !== keys.length || !keys.every(key => own(value, key))) return false;
    return keys.every(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor && own(descriptor, 'value') && descriptor.enumerable === true;
    });
  }
  function dependencies() {
    const deps = loadDependencies();
    if (!deps || !deps.reader || deps.reader.VERSION !== 1 || deps.reader.CONTRACT !== READER_CONTRACT
      || typeof deps.reader.readPersonalEntryCatalog !== 'function') fail('entry-reader-unavailable');
    if (!deps.canonical || typeof deps.canonical.resolvePersonalWorkspacePocEntry !== 'function') fail('entry-canonical-unavailable');
    return deps;
  }
  function classify(rawInput, canonical) {
    // The empty model supplies normalization/input kind only. It is never a
    // stand-in for canonical saved-copy/Map eligibility or source-URL facts.
    const result = canonical.resolvePersonalWorkspacePocEntry(rawInput, EMPTY_MODEL);
    if (!exact(result, ['ok', 'resolution']) || result.ok !== true) fail('entry-canonical-failed');
    const resolution = result.resolution;
    if (!resolution || !Object.getOwnPropertyDescriptor(resolution, 'kind')
      || !own(Object.getOwnPropertyDescriptor(resolution, 'kind'), 'value')) fail('invalid-canonical-resolution');
    const kind = resolution.kind;
    const keys = ['kind', 'rawInput', 'normalizedInput', 'matches'];
    if (kind === 'url') keys.push('canonicalUrl', 'lookupStatus', 'textContinuation');
    else if (kind === 'memo' || kind === 'invalid-url') keys.push('textContinuation');
    else if (kind !== 'empty') fail('invalid-canonical-resolution');
    if (!exact(resolution, keys) || resolution.rawInput !== rawInput || typeof resolution.normalizedInput !== 'string'
      || !Array.isArray(resolution.matches) || resolution.matches.length !== 0) fail('invalid-canonical-resolution');
    if (kind === 'url' && (resolution.lookupStatus !== 'miss' || typeof resolution.canonicalUrl !== 'string'
      || !/^https?:\/\//iu.test(resolution.canonicalUrl))) fail('invalid-canonical-resolution');
    if (kind !== 'empty') {
      const continuation = resolution.textContinuation;
      if (!exact(continuation, ['rawText', 'requiresExplicitChoice']) || continuation.rawText !== rawInput
        || continuation.requiresExplicitChoice !== true) fail('invalid-canonical-resolution');
    }
    return resolution;
  }
  function resolvePersonalEntry(rawInput, genuineReadPacket) {
    if (typeof rawInput !== 'string') return blocked(rawInput, 'invalid-entry-raw-input');
    try {
      const deps = dependencies(), read = deps.reader.readPersonalEntryCatalog(genuineReadPacket);
      if (!read || read.ok !== true) fail(read && read.reason || 'unknown-entry-packet');
      const catalog = read.catalog;
      if (!catalog || catalog.version !== 1 || catalog.contract !== READER_CONTRACT || !Array.isArray(catalog.copies)) fail('invalid-entry-catalog');
      const initial = classify(rawInput, deps.canonical);
      // Empty always has matches[]; the UI may separately show the full catalog.
      // URL always remains explicit miss: this catalog does not own URL facts.
      if (initial.kind !== 'memo') return frozenCopy({ ok: true, resolution: initial });
      const normalize = text => classify(text, deps.canonical).normalizedInput;
      const matches = [];
      for (const copy of catalog.copies) {
        const matchedBy = [];
        if (normalize(copy.title).includes(initial.normalizedInput)) matchedBy.push('title');
        if (copy.items.some(item => normalize(item.title).includes(initial.normalizedInput))) matchedBy.push('item-text');
        if (matchedBy.length) matches.push({ flowRef: copy.flowRef, savedCopyId: copy.savedCopyId, flowId: copy.flowId,
          title: copy.title, origin: copy.origin, matchedBy });
      }
      matches.sort((left, right) => left.title.localeCompare(right.title, 'ko') || left.flowRef.localeCompare(right.flowRef));
      // A local title hit is query, not a fabricated canonical Map/source hit.
      // No source-title, description, section, personal memo or URL is inferred.
      return frozenCopy({ ok: true, resolution: { ...initial, kind: matches.length ? 'query' : 'memo', matches } });
    } catch (error) { return blocked(rawInput, failures.get(error) || 'invalid-entry-query'); }
  }
  // Packet validity is capture-time only. S.sameAuthority, source epoch/ABA,
  // visible owner and navigation lifetime must be checked by the actual app.
  return Object.freeze({ VERSION, CONTRACT, resolvePersonalEntry });
});
