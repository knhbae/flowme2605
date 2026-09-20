/* Read-only bridge for the existing personal result calendar rank consumer. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => require('./workspace-checkpoint.js'));
  else root.FlowPocTimelineResultRank = factory(() => root.FlowPocWorkspaceCheckpoint);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (getCheckpoint) {
  'use strict';
  function createResolver(checkpoint) {
    const C = getCheckpoint();
    if (!C || !C.validateCheckpoint(checkpoint).ok) return { ok: false, reason: 'invalid-checkpoint' };
    // The resolver belongs to one verified read snapshot; caller mutation or a
    // later checkpoint must not silently change an already-open result view.
    const snapshot = JSON.parse(JSON.stringify(checkpoint));
    const groups = new Map();
    function resolve(request) {
      if (!request || request.occurrenceId || typeof request.id !== 'string' || (request.date !== null && typeof request.date !== 'string')) return null;
      const key = request.date === null ? 'undated:undated' : 'date:' + request.date;
      if (!groups.has(key)) {
        // The undated selector needs a valid anchor but does not consume it.
        const projection = C.projectGroups(snapshot, request.date === null ? 'undated' : 'month', request.date === null ? '2000-01-01' : request.date);
        groups.set(key, projection.ok ? projection.groups.find(group => group.context + ':' + group.contextKey === key) || null : null);
      }
      const group = groups.get(key);
      const rank = group ? group.ids.indexOf(request.id) : -1;
      // Nonmember requests do not inject a source task into another date.
      return rank < 0 ? null : { order: rank, key, manual: Boolean(group.manualOrder && !group.blocked) };
    }
    return Object.freeze({ ok: true, resolve });
  }
  return Object.freeze({ VERSION: 1, createResolver });
});
