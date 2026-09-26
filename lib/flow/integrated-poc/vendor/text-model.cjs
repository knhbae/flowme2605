/* Generated from v11 20707fa0/model.js; source SHA256 f78a8f99053f1d8e10dd2435de68496f4587b8ed4ffe4f5bbb2f214b74425f03.
 * Regenerate: node scripts/personal-workspace-poc/program-vendor-text.mjs
 * Only core source is reused; no historical application, HTML or storage adapter. */
module.exports = (function () {
  'use strict';
  var MAX_RAW = 100000, MAX_LINES = 1200, MAX_PROGRESS_RECORDS = 10000, MAX_DEPTH = 32, counter = 0;
  function uid(prefix) {
    var value = typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID() : Date.now().toString(36) + '-' + (++counter).toString(36) + '-' + Math.random().toString(36).slice(2);
    return prefix + '-' + value;
  }
  function str(value, max, nonempty) { return typeof value === 'string' && value.length <= max && (!nonempty || value.trim().length > 0); }
  function shape(value, keys) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length &&
      keys.every(function (key) { return Object.prototype.hasOwnProperty.call(value, key); });
  }
  function validDate(value) {
    if (value === null) return true;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parsed = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function dateValue(text) { return text === '미정' ? null : text; }
  function raw(doc) {
    if (!doc || !Array.isArray(doc.lines) || !doc.lines.every(function (line) { return line && typeof line.text === 'string'; })) return '';
    return doc.lines.map(function (line) { return line.text; }).join('\n');
  }
  // Isolated UX prototype: ID sidecars are local review data, not a production schema.
  // Never import operating storage, migrate older keys, or publish these private fixtures.
  function allDocuments(state) { return state.documents.concat(state.flows); }
  function getDocument(state, id) {
    return state && Array.isArray(state.documents) && Array.isArray(state.flows)
      ? allDocuments(state).find(function (doc) { return doc.id === id; }) || null : null;
  }
  function scopeList(state) {
    return state.folders.map(function (folder) { return { id: folder.id, title: folder.title, kind: 'folder', parentId: folder.parentId }; })
      .concat(state.flows.map(function (flow) { return { id: flow.id, title: flow.title, kind: 'flow', parentId: flow.folderId, sourceVersion: flow.sourceVersion }; }));
  }
  function bindingAt(state, docId, lineId) { return state.bindings.find(function (binding) { return binding.docId === docId && binding.lineId === lineId; }); }
  function isTaskReference(state, lineId) { return state.bindings.some(function (binding) { return binding.kind === 'task' && binding.lineId === lineId; }); }
  function taskList(state) {
    return allDocuments(state).reduce(function (all, doc) {
      return all.concat(parseDocument(doc, state).tasks.filter(function (task) { return !isTaskReference(state, task.id); }));
    }, []);
  }
  function itemList(state) {
    return allDocuments(state).reduce(function (all, doc) {
      return all.concat(parseDocument(doc, state).items.filter(function (item) { return !isTaskReference(state, item.id); }));
    }, []);
  }
  function itemGraph(state) {
    var graph = new Map();
    allDocuments(state).forEach(function (doc) { parseDocument(doc, state, true).rows.forEach(function (row) {
      if (!['task', 'subcheck'].includes(row.kind) || !row.title) return;
      var ancestors = row.ancestorItemIds || [], parent = ancestors[ancestors.length - 1];
      var binding = bindingAt(state, doc.id, row.id), id = binding && binding.kind === 'task' ? binding.taskId : row.id;
      if (!graph.has(id)) graph.set(id, new Set());
      if (parent) { if (!graph.has(parent)) graph.set(parent, new Set()); graph.get(parent).add(id); }
    }); });
    return graph;
  }
  function graphReaches(graph, start, wanted) {
    var pending = [start], visited = new Set();
    while (pending.length) {
      var id = pending.pop();
      if (id === wanted) return true;
      if (visited.has(id)) continue;
      visited.add(id); if (graph.has(id)) graph.get(id).forEach(function (child) { pending.push(child); });
    }
    return false;
  }
  function graphHasCycle(graph) {
    var indegrees = new Map(); graph.forEach(function (_, id) { indegrees.set(id, 0); });
    graph.forEach(function (edges) { edges.forEach(function (id) { indegrees.set(id, (indegrees.get(id) || 0) + 1); }); });
    var pending = []; indegrees.forEach(function (degree, id) { if (!degree) pending.push(id); });
    var count = 0;
    while (pending.length) { var id = pending.pop(); count += 1; (graph.get(id) || []).forEach(function (child) {
      indegrees.set(child, indegrees.get(child) - 1); if (!indegrees.get(child)) pending.push(child);
    }); }
    return count !== indegrees.size;
  }
  function validate(state) {
    try {
      if (!shape(state, ['version', 'documents', 'folders', 'flows', 'bindings', 'taskScopes', 'itemScopes', 'progressRecords']) || state.version !== 11 ||
          !Array.isArray(state.documents) || state.documents.length > 100 || !Array.isArray(state.folders) || state.folders.length > 100 ||
          !Array.isArray(state.flows) || state.flows.length > 100 || !Array.isArray(state.bindings) || state.bindings.length > 5000 ||
          state.taskScopes === null || typeof state.taskScopes !== 'object' || Array.isArray(state.taskScopes) ||
          state.itemScopes === null || typeof state.itemScopes !== 'object' || Array.isArray(state.itemScopes) ||
          !Array.isArray(state.progressRecords) || state.progressRecords.length > MAX_PROGRESS_RECORDS) return false;
      var ids = new Set(), folders = new Map(), locations = new Map(), parsed = new Map();
      function register(id) { if (!str(id, 160, true) || ['__proto__', 'constructor', 'prototype'].includes(id) || ids.has(id)) return false; ids.add(id); return true; }
      for (var folder of state.folders) {
        if (!shape(folder, ['id', 'title', 'parentId']) || !register(folder.id) || !validTitle(folder.title) || folder.title.length > 100 ||
            !(folder.parentId === null || str(folder.parentId, 160, true))) return false;
        folders.set(folder.id, folder);
      }
      for (var current of state.folders) {
        var seen = new Set([current.id]), parent = current.parentId;
        while (parent !== null) {
          if (!folders.has(parent) || seen.has(parent) || seen.size >= MAX_DEPTH) return false;
          seen.add(parent); parent = folders.get(parent).parentId;
        }
      }
      for (var doc of allDocuments(state)) {
        var isFlow = state.flows.includes(doc);
        var fields = ['id', 'title', 'folder', 'folderId', 'lines'].concat(isFlow ? ['private', 'sourceVersion'] : []);
        if (!shape(doc, fields) || !register(doc.id) || !str(doc.title, 1000, false) || /[\r\n]/.test(doc.title) ||
            !folders.has(doc.folderId) || doc.folder !== folders.get(doc.folderId).title ||
            (isFlow && (doc.private !== true || !str(doc.sourceVersion, 200, true))) ||
            !Array.isArray(doc.lines) || doc.lines.length > MAX_LINES) return false;
        var length = Math.max(0, doc.lines.length - 1);
        for (var line of doc.lines) {
          if (!shape(line, ['id', 'text']) || !register(line.id) || !str(line.text, MAX_RAW, false) || /[\r\n]/.test(line.text)) return false;
          locations.set(line.id, { doc: doc, line: line }); length += line.text.length;
        }
        if (length > MAX_RAW) return false;
        var analysis = parseDocument(doc, state);
        if (analysis.issues.some(function (issue) { return issue.blocking; })) return false;
        parsed.set(doc.id, analysis);
      }
      var scopeIds = new Set(scopeList(state).map(function (scope) { return scope.id; })), bound = new Set(), references = new Set();
      for (var binding of state.bindings) {
        var expected = binding && binding.kind === 'scope' ? ['kind', 'docId', 'lineId', 'scopeId'] : ['kind', 'docId', 'lineId', 'taskId', 'dateMode'];
        if (!shape(binding, expected) || !['scope', 'task'].includes(binding.kind) || bound.has(binding.lineId)) return false;
        var location = locations.get(binding.lineId);
        if (!location || location.doc.id !== binding.docId) return false;
        var row = parsed.get(binding.docId).rows.find(function (entry) { return entry.id === binding.lineId; });
        if (binding.kind === 'scope') {
          if (!scopeIds.has(binding.scopeId) || row.kind !== 'scope' || !/^ *- \S/.test(location.line.text) || !scopePlacementAllowed(state, row, binding.scopeId)) return false;
        } else {
          if (!str(binding.taskId, 160, true) || !['keep', 'apply'].includes(binding.dateMode) || row.kind !== 'task' ||
              !parsed.get(binding.docId).tasks.some(function (task) { return task.id === binding.lineId; }) ||
              parsed.get(binding.docId).rows.some(function (entry) { return entry.kind === 'property' && entry.taskId === binding.lineId; })) return false;
          references.add(binding.lineId);
        }
        bound.add(binding.lineId);
      }
      var canonical = new Map();
      parsed.forEach(function (value) { value.tasks.forEach(function (task) { if (!references.has(task.id)) canonical.set(task.id, task); }); });
      var dormantItems = new Set(), dormantTasks = new Set();
      parsed.forEach(function (value) { value.rows.forEach(function (row) {
        var parts = ['task', 'subcheck'].includes(row.kind) && taskParts(row.text);
        if (parts && !parts[4].trim() && !references.has(row.id) && Object.prototype.hasOwnProperty.call(state.itemScopes, row.id)) {
          if (!scopeIds.has(state.itemScopes[row.id])) throw Error('invalid dormant owner');
          dormantItems.add(row.id);
          if (row.kind === 'task' && Object.prototype.hasOwnProperty.call(state.taskScopes, row.id)) {
            if (state.taskScopes[row.id] !== state.itemScopes[row.id]) throw Error('invalid dormant plan');
            dormantTasks.add(row.id);
          }
        }
      }); });
      if (Object.keys(state.taskScopes).length !== canonical.size + dormantTasks.size) return false;
      for (var pair of canonical) if (!Object.prototype.hasOwnProperty.call(state.taskScopes, pair[0]) || !scopeIds.has(state.taskScopes[pair[0]])) return false;
      // Child records use their stable source-line IDs, without becoming Tasks.
      var progressTargets = new Map();
      parsed.forEach(function (value) { value.items.forEach(function (item) { if (!references.has(item.id)) progressTargets.set(item.id, item); }); });
      if (Object.keys(state.itemScopes).length !== progressTargets.size + dormantItems.size) return false;
      for (var itemPair of progressTargets) if (!Object.prototype.hasOwnProperty.call(state.itemScopes, itemPair[0]) || !scopeIds.has(state.itemScopes[itemPair[0]])) return false;
      for (var plannedId of canonical.keys()) if (state.taskScopes[plannedId] !== state.itemScopes[plannedId]) return false;
      var progressPairs = new Set(), latest = new Map();
      for (var record of state.progressRecords) {
        if (!shape(record, ['taskId', 'date', 'percent']) || !progressTargets.has(record.taskId) || record.date === null || !validDate(record.date) ||
            !Number.isInteger(record.percent) || record.percent < 0 || record.percent > 100) return false;
        var recordKey = record.taskId + '\u0000' + record.date;
        if (progressPairs.has(recordKey)) return false;
        progressPairs.add(recordKey);
        if (!latest.has(record.taskId) || latest.get(record.taskId).date < record.date) latest.set(record.taskId, record);
      }
      // Tracked completion follows the latest dated snapshot, not the last edit.
      // This also blocks deleting a recorded Task or changing its checkbox through
      // raw text/updateTask while keeping contradictory progress records behind.
      for (var progress of latest) if (progressTargets.get(progress[0]).done !== (progress[1].percent === 100)) return false;
      for (var parsedDoc of parsed.values()) for (var numericTask of parsedDoc.tasks) {
        if (numericTask.inputPercent === undefined) continue;
        var numericBinding = bindingAt(state, numericTask.docId, numericTask.id);
        if (!latest.has(numericBinding && numericBinding.kind === 'task' ? numericBinding.taskId : numericTask.id)) return false;
      }
      for (var childDoc of parsed.values()) for (var numericChild of childDoc.rows) {
        if (numericChild.kind === 'subcheck' && numericChild.title && numericChild.progressPercent !== undefined && !latest.has(numericChild.id)) return false;
      }
      for (var reference of state.bindings.filter(function (binding) { return binding.kind === 'task'; })) {
        var target = canonical.get(reference.taskId), projected = parsed.get(reference.docId).tasks.find(function (task) { return task.id === reference.lineId; });
        if (!target || !projected || projected.title !== target.title || projected.done !== target.done) return false;
      }
      if (graphHasCycle(itemGraph(state))) return false;
      return true;
    } catch (_) { return false; }
  }
  function sectionDate(text) {
    var match = /^\[(\d{4}(?:[-/.].*)?|미정)\]$/.exec(text.trim());
    if (!match) return { recognized: false, valid: false, date: null };
    var value = dateValue(match[1]);
    return { recognized: true, valid: validDate(value), date: validDate(value) ? value : null };
  }
  function indentation(text) {
    var leading = /^[ \t]*/.exec(text)[0];
    return { spaces: leading.length, depth: leading.length / 2, valid: !leading.includes('\t') && leading.length % 2 === 0 };
  }
  // token excludes brackets. Decimal notation is lexical: 1 is 1%, 1.0 is
  // a ratio (100%). String arithmetic avoids floating-point rounding of 0.29.
  function parseProgressToken(token) {
    var invalid = { ok: false, percent: null, kind: null };
    if (typeof token !== 'string' || !/^\d+(?:\.\d+)?%?$/.test(token)) return invalid;
    var explicit = token.endsWith('%'), numeric = explicit ? token.slice(0, -1) : token;
    var pieces = numeric.split('.'), whole = Number(pieces[0]), fraction = pieces[1];
    if (!Number.isFinite(whole)) return invalid;
    if (explicit || fraction === undefined) {
      if (whole < 0 || whole > 100 || (fraction !== undefined && /[1-9]/.test(fraction))) return invalid;
      return { ok: true, percent: whole, kind: explicit ? 'percent' : 'integer' };
    }
    if (whole > 1 || (whole === 1 && /[1-9]/.test(fraction)) || /[1-9]/.test(fraction.slice(2))) return invalid;
    return { ok: true, percent: whole * 100 + Number((fraction + '00').slice(0, 2)), kind: 'ratio' };
  }
  function taskParts(text) {
    var parts = /^( *-\s+\[)([^\]\r\n]*)(\](?:\s+|$))(.*?)(\s*)$/.exec(text);
    return parts && (/^[ xX]$/.test(parts[2]) || parseProgressToken(parts[2]).ok) ? parts : null;
  }
  function subcheckParts(text) { return taskParts(text); }
  function propertyParts(text) { return /^ *-\s+(날짜|메모|시간):\s*(.*)$/.exec(text); }
  function parseDocument(doc, state, skipSourceDates) {
    var rows = [], result = [], items = [], issues = [], stack = [], taskMap = new Map(), groupDate = null, dateLineId = null, fence = null;
    if (!doc || !Array.isArray(doc.lines)) return { rows: [], tasks: [], items: [], issues: [{ code: 'invalid-document', index: -1, lineId: null, blocking: true }] };
    var bindings = state && Array.isArray(state.bindings) ? state.bindings.filter(function (binding) { return binding && binding.docId === doc.id; }) : [];
    var latestRecords = new Map();
    if (state && Array.isArray(state.progressRecords)) state.progressRecords.forEach(function (record) {
      if (record && typeof record.date === 'string' && (!latestRecords.has(record.taskId) || latestRecords.get(record.taskId).date < record.date)) latestRecords.set(record.taskId, record);
    });
    function issue(code, row, blocking) { issues.push({ code: code, index: row.index, lineId: row.id, blocking: !!blocking }); }
    doc.lines.forEach(function (line, index) {
      if (!line || typeof line.text !== 'string') return;
      var text = line.text, trim = text.trim(), indent = indentation(text);
      var row = { id: line.id, text: text, index: index, kind: 'note', depth: indent.depth, guideLevels: [], parentLineId: null, ancestorScopeId: null, ancestorScopeKind: null,
        groupDate: groupDate, dateLineId: dateLineId, subtreeEndIndex: index + 1 };
      rows.push(row);
      var mark = /^ *(\x60{3,}|~{3,})(.*)$/.exec(text);
      if (fence) {
        row.kind = 'fence'; row.depth = fence.depth;
        row.guideLevels = stack.map(function (entry) { return entry.depth; });
        if (mark && mark[1][0] === fence.mark && mark[1].length >= fence.length && !mark[2].trim()) fence = null;
        return;
      }
      if (!trim) {
        row.kind = 'blank'; row.guideLevels = stack.map(function (entry) { return entry.depth; });
        row.parentLineId = stack.length ? stack[stack.length - 1].id : null;
        return;
      }
      if (!indent.valid) { issue('invalid-indent', row, true); return; }
      if (row.depth > MAX_DEPTH && !(row.depth === MAX_DEPTH + 1 && propertyParts(text))) { issue('max-depth', row, true); return; }
      while (stack.length && stack[stack.length - 1].depth >= row.depth) stack.pop();
      var parent = stack[stack.length - 1] || null;
      row.parentLineId = parent ? parent.id : null; row.parentKind = parent ? parent.kind : null;
      row.guideLevels = stack.map(function (entry) { return entry.depth; });
      var ancestorScope = stack.slice().reverse().find(function (entry) { return entry.kind === 'scope'; });
      row.ancestorScopeIds = stack.filter(function (entry) { return entry.kind === 'scope'; }).map(function (entry) { return entry.scopeId; });
      if (ancestorScope) { row.ancestorScopeId = ancestorScope.scopeId; row.ancestorScopeKind = ancestorScope.scopeKind; }
      if (row.depth > 0 && (!parent || parent.depth !== row.depth - 1)) { issue('missing-parent', row, true); return; }
      if (mark) { row.kind = 'fence'; fence = { depth: row.depth, mark: mark[1][0], length: mark[1].length, row: row }; return; }
      var dateSection = sectionDate(text);
      if (dateSection.recognized) {
        if (row.depth !== 0) { issue('nested-date', row, true); return; }
        stack = []; row.kind = 'date'; row.date = dateSection.date; row.valid = dateSection.valid;
        groupDate = dateSection.date; dateLineId = row.id; row.groupDate = groupDate; row.dateLineId = row.id;
        if (!dateSection.valid) issue('invalid-date', row, false);
        return;
      }
      var binding = bindings.find(function (entry) { return entry.lineId === line.id; });
      if (binding && binding.kind === 'scope') {
        if (!/^ *- \S/.test(text) || taskParts(text)) { issue('invalid-scope-line', row, true); return; }
        var scope = state && scopeList(state).find(function (entry) { return entry.id === binding.scopeId; });
        row.kind = 'scope'; row.scopeId = binding.scopeId; row.scopeKind = scope ? scope.kind : null;
        row.ancestorScopeIds = stack.filter(function (entry) { return entry.kind === 'scope'; }).map(function (entry) { return entry.scopeId; });
        if (row.ancestorScopeIds.includes(binding.scopeId) || doc.id === binding.scopeId) issue('scope-cycle', row, true);
        stack.push(row); return;
      }
      var parts = taskParts(text), nearestTask = stack.slice().reverse().find(function (entry) { return entry.kind === 'task'; });
      var nearestCheck = stack.slice().reverse().find(function (entry) { return entry.kind === 'task' || entry.kind === 'subcheck'; });
      row.ancestorItemIds = stack.filter(function (entry) { return ['task', 'subcheck'].includes(entry.kind); }).map(function (entry) {
        var ancestorBinding = bindings.find(function (entryBinding) { return entryBinding.lineId === entry.id && entryBinding.kind === 'task'; });
        return ancestorBinding ? ancestorBinding.taskId : entry.id;
      });
      var scopeBoundary = stack.slice().reverse().find(function (entry) { return ['task', 'subcheck', 'scope'].includes(entry.kind); });
      if (scopeBoundary && scopeBoundary.kind === 'scope') nearestCheck = null;
      var stableTask = state && state.taskScopes && Object.prototype.hasOwnProperty.call(state.taskScopes, line.id);
      var canonical = !!stableTask || !!(binding && binding.kind === 'task') || !nearestCheck;
      row.structuralKind = nearestCheck ? 'subcheck' : 'task';
      row.parentTaskId = nearestTask ? nearestTask.id : null;
      var unfinishedMark = !parts && /^ *-\s+\[([^\]]*)(?:\](?!\()|$)/.exec(text);
      if (unfinishedMark && (!unfinishedMark[1].trim() || /^[\d.+-]/.test(unfinishedMark[1].trim()) || /^(?:NaN|Infinity|x)$/i.test(unfinishedMark[1].trim()))) {
        issue('invalid-progress-token', row, true); return;
      }
      if (parts) {
        var numericProgress = parseProgressToken(parts[2]);
        if (numericProgress.ok) {
          row.progressToken = parts[2]; row.progressPercent = numericProgress.percent;
        }
        if (!parts[4].trim()) {
          // A scaffold keeps its structural kind while the user types its title.
          // It is never included in derived Tasks/subchecks until nonempty.
          row.kind = canonical ? 'task' : 'subcheck';
          if (nearestTask) row.taskId = nearestTask.id;
          issue('empty-task', row, false); stack.push(row); return;
        }
        row.kind = canonical ? 'task' : 'subcheck'; row.isCanonical = canonical;
        row.taskId = canonical ? line.id : nearestTask ? nearestTask.id : nearestCheck.id;
        row.subcheckId = canonical ? undefined : line.id;
        row.title = parts[4].trim(); row.done = parts[2].toLowerCase() === 'x';
        if (!canonical && nearestCheck && !taskMap.has(nearestCheck.id)) { issue('orphan-subcheck', row, false); stack.push(row); return; }
        var task = { id: line.id, docId: doc.id, docTitle: doc.title || '새 문서', folder: doc.folder,
          title: parts[4].trim(), done: parts[2].toLowerCase() === 'x', date: groupDate, groupDate: groupDate,
          sourceIndex: index, depth: row.depth, note: '', time: null, subchecks: [], isCanonical: canonical,
          parentItemId: nearestCheck ? nearestCheck.id : null, parentTaskId: row.parentTaskId, explicitDate: false };
        if (numericProgress.ok) {
          var numericOwnerId = binding && binding.kind === 'task' ? binding.taskId : line.id, latestRecord = latestRecords.get(numericOwnerId);
          task.inputPercent = numericProgress.percent; task.inputToken = parts[2];
          task.done = latestRecord ? latestRecord.percent === 100 : numericProgress.percent === 100;
        }
        row.done = task.done;
        items.push(task); if (canonical) result.push(task); taskMap.set(line.id, task); stack.push(row); return;
      }
      var property = propertyParts(text);
      if (property && row.depth > 0) {
        row.kind = 'property';
        if (!nearestCheck || row.depth !== nearestCheck.depth + 1 || parent !== nearestCheck) { issue('orphan-property', row, row.depth > MAX_DEPTH); stack.push(row); return; }
        var taskOwner = taskMap.get(nearestCheck.id); row.taskId = nearestCheck.id;
        if (!taskOwner) { issue('orphan-property', row, false); return; }
        if (property[1] === '날짜') {
          var individual = dateValue(property[2].trim());
          taskOwner.date = validDate(individual) ? individual : null;
          taskOwner.explicitDate = true;
          if (!validDate(individual)) issue('invalid-date-property', row, false);
        } else if (property[1] === '메모') taskOwner.note = taskOwner.note ? taskOwner.note + '\n' + property[2] : property[2];
        else {
          taskOwner.time = /^([01]\d|2[0-3]):[0-5]\d$/.test(property[2].trim()) ? property[2].trim() : null;
          if (taskOwner.time === null) issue('invalid-time', row, false);
        }
        stack.push(row); return;
      }
      if (/^ *#{1,6}\s+/.test(text)) row.kind = 'heading';
      stack.push(row);
    });
    if (fence) issue('unclosed-fence', fence.row, false);
    // Every source checkbox owns its properties and history. taskScopes is the
    // stable planning registry: a listed item does not disappear when nested.
    items.forEach(function (item) {
      var ref = bindings.find(function (entry) { return entry.kind === 'task' && entry.lineId === item.id; });
      if (ref && !skipSourceDates) {
        var source = taskMap.get(ref.taskId);
        if (!source && state) {
          var sourceDoc = allDocuments(state).find(function (owner) { return owner.id !== doc.id && owner.lines.some(function (line) { return line.id === ref.taskId; }); });
          if (sourceDoc) source = parseDocument(sourceDoc, state, true).tasks.find(function (entry) { return entry.id === ref.taskId; });
        }
        if (source) item.date = source.date;
      }
      if (!item.isCanonical && !item.explicitDate && taskMap.has(item.parentItemId)) item.date = taskMap.get(item.parentItemId).date;
      var row = rows[item.sourceIndex]; row.date = item.date; row.note = item.note; row.time = item.time;
      if (!item.isCanonical && taskMap.has(row.taskId)) taskMap.get(row.taskId).subchecks.push({ id: item.id, title: item.title, done: item.done });
    });
    // subtreeEndIndex is exclusive; blank lines preserve the preceding outline stack.
    rows.forEach(function (row) {
      var end = row.index + 1;
      while (end < rows.length && (rows[end].kind === 'blank' || rows[end].depth > row.depth)) end += 1;
      row.subtreeEndIndex = end;
    });
    return { rows: rows, tasks: result, items: items, issues: issues };
  }
  function scopes(state) { return validate(state) ? scopeList(state) : []; }
  function scopeTaskIds(state, scopeId) {
    var selected = new Set([scopeId]), changed = true;
    while (changed) {
      changed = false;
      scopeList(state).forEach(function (scope) { if (selected.has(scope.parentId) && !selected.has(scope.id)) { selected.add(scope.id); changed = true; } });
    }
    return new Set(Object.keys(state.taskScopes).filter(function (id) { return selected.has(state.taskScopes[id]); }));
  }
  function tasks(state, options) {
    if (!validate(state)) return [];
    var filter = options || {};
    if (filter.from !== undefined && (!validDate(filter.from) || filter.from === null)) return [];
    if (filter.to !== undefined && (!validDate(filter.to) || filter.to === null)) return [];
    if (filter.from && filter.to && filter.from > filter.to) return [];
    var catalog = scopeList(state), allowed = null;
    if (filter.folder !== undefined) {
      var matching = catalog.filter(function (scope) { return scope.id === filter.folder || (scope.kind === 'folder' && scope.title === filter.folder); });
      if (matching.length !== 1) return [];
      allowed = scopeTaskIds(state, matching[0].id);
    }
    return taskList(state).map(function (task) {
      var scope = catalog.find(function (entry) { return entry.id === state.taskScopes[task.id]; });
      var folder = state.folders.find(function (entry) { return entry.id === (scope.kind === 'flow' ? scope.parentId : scope.id); });
      return Object.assign({}, task, { scopeId: scope.id, scopeKind: scope.kind, scopeTitle: scope.title, folder: folder.title, folderId: folder.id });
    }).filter(function (task) {
      if (allowed && !allowed.has(task.id)) return false;
      if (filter.undatedOnly && task.date !== null) return false;
      if (filter.from !== undefined && (task.date === null || task.date < filter.from)) return false;
      if (filter.to !== undefined && (task.date === null || task.date > filter.to)) return false;
      return true;
    });
  }
  function scopeTasks(state, scopeId) {
    if (!validate(state) || !scopeList(state).some(function (scope) { return scope.id === scopeId; })) return [];
    var ids = scopeTaskIds(state, scopeId);
    return tasks(state).filter(function (task) { return ids.has(task.id); });
  }
  function emptyContext() { return { scopeId: null, scopeKind: null, ancestorScopeIds: [], date: null, dateLineId: null, parentLineId: null, valid: false }; }
  function contextUnchecked(state, docId, index) {
    var doc = getDocument(state, docId);
    if (!doc) return emptyContext();
    var row = parseDocument(doc, state).rows[index];
    return row ? { scopeId: row.ancestorScopeId, scopeKind: row.ancestorScopeKind, ancestorScopeIds: row.ancestorScopeIds || [], date: row.groupDate, dateLineId: row.dateLineId, parentLineId: row.parentLineId, valid: true } : emptyContext();
  }
  function contextAt(state, docId, index) { return validate(state) ? contextUnchecked(state, docId, index) : emptyContext(); }
  function insertionUnchecked(state, docId, index, depth) {
    var doc = getDocument(state, docId);
    if (!doc || !Number.isInteger(index) || index < 0 || index > doc.lines.length || !Number.isInteger(depth) || depth < 0 || depth > MAX_DEPTH) return emptyContext();
    var probe = { id: '__insertion-probe__', text: '  '.repeat(depth) + '-' };
    var projected = Object.assign({}, doc, { lines: doc.lines.slice(0, index).concat([probe]) });
    var analysis = parseDocument(projected, state), row = analysis.rows[index];
    if (!row || row.kind === 'fence' || analysis.issues.some(function (issue) { return issue.index === index && issue.blocking; })) return emptyContext();
    return { scopeId: row.ancestorScopeId, scopeKind: row.ancestorScopeKind, ancestorScopeIds: row.ancestorScopeIds || [], date: row.groupDate, dateLineId: row.dateLineId,
      parentLineId: row.parentLineId, parentKind: row.parentKind, depth: depth, valid: true };
  }
  // Context before a future row: scopeId is a strict confirmed ancestor, never document-default ownership.
  function insertionContext(state, docId, index, depth) { return validate(state) ? insertionUnchecked(state, docId, index, depth) : emptyContext(); }
  // v7 insertion plans are read-only, ephemeral editor commands, not persisted blocks.
  // Recompute from the current stable line ID immediately before a native transaction.
  // index is a pre-insertion row boundary; subtreeEndIndex remains exclusive.
  // offset/caretOffset use JavaScript UTF-16 positions. Insert text at offset without
  // deleting source; caretOffset stops before the separator before the following row.
  // Empty syntax is only a writing scaffold: no invented title or canonical Task.
  function insertionOptions(state, docId, lineId) {
    if (!validate(state)) return [];
    var doc = getDocument(state, docId);
    if (!doc || typeof lineId !== 'string' || doc.lines.length >= MAX_LINES) return [];
    var analysis = parseDocument(doc, state), row = analysis.rows.find(function (entry) { return entry.id === lineId; });
    if (!row || row.kind === 'fence' || !Number.isInteger(row.depth) || row.depth > MAX_DEPTH + 1 ||
        analysis.issues.some(function (issue) { return issue.lineId === row.id; }) || /^ *-\s*$/.test(row.text)) return [];
    var source = raw(doc), byId = new Map(analysis.rows.map(function (entry) { return [entry.id, entry]; }));
    var result = [], probeId = '__v7-insertion-probe__';
    while (byId.has(probeId)) probeId += '_';
    function boundary(anchor) {
      var index = anchor.subtreeEndIndex;
      while (index > anchor.index + 1 && analysis.rows[index - 1].kind === 'blank') index -= 1;
      return index;
    }
    function option(kind, label, relation, syntax, index, depth, expectedParent) {
      var isProperty = kind === 'note' && syntax === '- 메모: ';
      if (!Number.isInteger(depth) || depth < 0 || depth > (isProperty ? MAX_DEPTH + 1 : MAX_DEPTH)) return;
      var prefix = '  '.repeat(depth) + syntax;
      // Analyze a nonempty probe so a checkbox cannot masquerade as an empty Task
      // while actually becoming an orphan or changing into a subcheck when typed.
      var probe = { id: probeId, text: prefix + '추가 항목' };
      var projected = Object.assign({}, doc, { lines: doc.lines.slice(0, index).concat([probe], doc.lines.slice(index)) });
      var next = parseDocument(projected, state), added = next.rows[index];
      if (!added || added.kind === 'fence' || next.issues.some(function (issue) { return issue.lineId === probeId; }) ||
          added.kind !== (isProperty ? 'property' : kind) ||
          (expectedParent !== undefined && added.parentLineId !== expectedParent)) return;
      if (kind === 'task' && !next.tasks.some(function (task) { return task.id === probeId; })) return;
      if (kind === 'subcheck' || isProperty) {
        if (!added.taskId || isProperty && isTaskReference(state, added.taskId) || !analysis.items.some(function (task) { return task.id === added.taskId; })) return;
      }
      // The new line must not adopt a following descendant, detach a property, end a
      // scope early, or reinterpret an existing checkbox. Do not repair these here.
      if (next.rows.some(function (entry) {
        var prior = byId.get(entry.id);
        return prior && prior.kind !== 'blank' && (entry.kind !== prior.kind || entry.parentLineId !== prior.parentLineId ||
          entry.ancestorScopeId !== prior.ancestorScopeId || entry.taskId !== prior.taskId || entry.groupDate !== prior.groupDate);
      })) return;
      var offset = index < doc.lines.length ? doc.lines.slice(0, index).reduce(function (sum, line) { return sum + line.text.length + 1; }, 0) : source.length;
      var leading = index === doc.lines.length && doc.lines.length ? '\n' : '';
      var trailing = index < doc.lines.length ? '\n' : '';
      var text = leading + prefix + trailing;
      // Reserve one typed character for the scaffold to become meaningful.
      if (source.length + text.length + 1 > MAX_RAW) return;
      result.push({ kind: kind, label: label, relation: relation, syntax: syntax, index: index, depth: depth,
        offset: offset, text: text, caretOffset: offset + leading.length + prefix.length, parentLineId: added.parentLineId });
    }
    function sameLevel(anchor) {
      var at = boundary(anchor), parent = byId.get(anchor.parentLineId);
      var taskAncestor = parent;
      while (taskAncestor && taskAncestor.kind !== 'task') taskAncestor = byId.get(taskAncestor.parentLineId);
      option(taskAncestor ? 'subcheck' : 'task', taskAncestor ? '다음 하위 체크' : '다음 할 일', '같은 높이에', '- [ ] ', at, anchor.depth, anchor.parentLineId);
    }
    if (row.kind === 'task') {
      if (!analysis.tasks.some(function (task) { return task.id === row.id; })) return [];
      sameLevel(row);
      option('subcheck', '하위 체크', '이 할 일 안에', '- [ ] ', boundary(row), row.depth + 1, row.id);
      if (!isTaskReference(state, row.id)) {
        option('note', '메모', '이 할 일 안에', '- 메모: ', boundary(row), row.depth + 1, row.id);
      }
    } else if (row.kind === 'subcheck') {
      sameLevel(row);
      option('subcheck', '하위 체크', '이 항목 안에', '- [ ] ', boundary(row), row.depth + 1, row.id);
      option('note', '메모', '이 항목 안에', '- 메모: ', boundary(row), row.depth + 1, row.id);
    } else if (row.kind === 'scope') {
      option('task', '할 일', '이 묶음 안에', '- [ ] ', boundary(row), row.depth + 1, row.id);
      option('note', '메모', '이 묶음 안에', '- ', boundary(row), row.depth + 1, row.id);
    } else if (row.kind === 'property') {
      var owner = byId.get(row.taskId);
      if (owner) {
        option('subcheck', '하위 체크', '이 할 일 안에', '- [ ] ', boundary(owner), owner.depth + 1, owner.id);
        option('note', '메모', '이 할 일 안에', '- 메모: ', boundary(owner), owner.depth + 1, owner.id);
      }
    } else {
      sameLevel(row);
      option('note', '메모', '같은 높이에', '- ', boundary(row), row.depth, row.kind === 'date' ? null : row.parentLineId);
    }
    return result;
  }
  function scopePlacementAllowed(state, row, scopeId) {
    var scope = scopeList(state).find(function (entry) { return entry.id === scopeId; });
    if (!scope) return false;
    return Number.isInteger(row.depth) && row.depth >= 0 && row.depth <= MAX_DEPTH &&
      !(row.ancestorScopeIds || [row.ancestorScopeId]).includes(scopeId);
  }
  function rowMeta(state, docId) {
    if (!validate(state)) return [];
    var doc = getDocument(state, docId);
    if (!doc) return [];
    var canonical = new Map(tasks(state).map(function (task) { return [task.id, task]; }));
    var items = new Map(itemList(state).map(function (item) { return [item.id, item]; }));
    return parseDocument(doc, state).rows.map(function (row) {
      var binding = bindingAt(state, docId, row.id), meta = Object.assign({}, row, { isReference: false, scopeMismatch: false });
      if (binding && binding.kind === 'scope') {
        var scope = scopeList(state).find(function (entry) { return entry.id === binding.scopeId; });
        return Object.assign(meta, { kind: 'scope', scopeId: scope.id, scopeKind: scope.kind, scopeTitle: scope.title, binding: binding });
      }
      var taskId = binding && binding.kind === 'task' ? binding.taskId : row.taskId;
      var task = canonical.get(taskId);
      if (task) Object.assign(meta, { taskId: task.id, task: task, date: task.date, scopeId: task.scopeId, scopeKind: task.scopeKind,
        scopeMismatch: task.scopeId !== (row.ancestorScopeId || (state.flows.some(function (flow) { return flow.id === doc.id; }) ? doc.id : doc.folderId)) });
      if (task && row.kind === 'task') Object.assign(meta, { progressTargetId: task.id, progressTitle: task.title, progressDate: task.date });
      if (task && row.kind === 'subcheck' && row.title) Object.assign(meta, {
        progressTargetId: row.id, progressTitle: row.title, progressDate: task.date, parentTaskId: task.id
      });
      var item = items.get(row.id);
      if (item) {
        var ownScope = scopeList(state).find(function (entry) { return entry.id === state.itemScopes[item.id]; });
        Object.assign(meta, { kind: row.structuralKind, isCanonical: !!item.isCanonical, date: item.date,
          scopeId: ownScope.id, scopeKind: ownScope.kind, progressTargetId: item.id, progressTitle: item.title,
          progressDate: item.date, parentTaskId: row.parentTaskId, note: item.note, time: item.time,
          scopeMismatch: ownScope.id !== (row.ancestorScopeId || (state.flows.some(function (flow) { return flow.id === doc.id; }) ? doc.id : doc.folderId)) });
      }
      if (binding && binding.kind === 'task') Object.assign(meta, { isReference: true, dateMode: binding.dateMode, binding: binding });
      return meta;
    });
  }
  function putDocument(state, changed) {
    return Object.assign({}, state, {
      documents: state.documents.map(function (doc) { return doc.id === changed.id ? changed : doc; }),
      flows: state.flows.map(function (doc) { return doc.id === changed.id ? changed : doc; })
    });
  }
  function syncReferences(state) {
    var canonical = new Map(taskList(state).map(function (task) { return [task.id, task]; })), next = state;
    allDocuments(state).forEach(function (doc) {
      var changed = false;
      var lines = doc.lines.map(function (line) {
        var binding = bindingAt(state, doc.id, line.id);
        if (!binding || binding.kind !== 'task') return line;
        var task = canonical.get(binding.taskId), parts = taskParts(line.text);
        if (!task || !parts) return line;
        var text = parts[1] + (parseProgressToken(parts[2]).ok ? parts[2] : (task.done ? 'x' : ' ')) + parts[3] + task.title + parts[5];
        if (text === line.text) return line;
        changed = true; return { id: line.id, text: text };
      });
      if (changed) next = putDocument(next, Object.assign({}, doc, { lines: lines }));
    });
    return next;
  }
  function sameTaskKinds(before, next) {
    var prior = new Map(), after = new Map();
    allDocuments(before).forEach(function (doc) { parseDocument(doc, before).rows.forEach(function (row) { prior.set(row.id, row); }); });
    allDocuments(next).forEach(function (doc) { parseDocument(doc, next).rows.forEach(function (row) { after.set(row.id, row); }); });
    for (var pair of prior) {
      var previous = pair[1], current = after.get(pair[0]);
      if (current && ['task', 'subcheck'].includes(previous.kind) && taskParts(current.text) && !['task', 'subcheck'].includes(current.kind)) return false;
    }
    return true;
  }
  function finalize(before, next) {
    if (!sameTaskKinds(before, next)) return before;
    // Plain text may contain unfinished property-like notes. But an existing
    // owned property cannot silently lose/change its owner through indentation.
    for (var doc of allDocuments(before)) {
      var afterDoc = getDocument(next, doc.id);
      if (!afterDoc || raw(doc) === raw(afterDoc)) continue;
      var afterRows = new Map(parseDocument(afterDoc, next).rows.map(function (row) { return [row.id, row]; }));
      for (var prior of parseDocument(doc, before).rows) if (prior.kind === 'property' && prior.taskId) {
        var current = afterRows.get(prior.id);
        if (current && current.text.trimStart() === prior.text.trimStart() && (current.kind !== 'property' || current.taskId !== prior.taskId)) return before;
      }
    }
    var synced = syncReferences(assignNewTaskScopes(next)); return validate(synced) ? synced : before;
  }
  function replaceDocument(state, changed) { return finalize(state, putDocument(state, changed)); }
  // Review-only identity boundary: at most 1,200 lines / 100,000 characters per document.
  // Exact-line LCS keeps matched IDs, preferring the earliest old match on ties.
  // A changed gap reuses IDs only for matching kind sequences whose kinds are each unique
  // within that gap (including a single-line replacement). Ambiguous multi-task rewrites
  // are rejected. ID bindings and creation-time scope ownership are preserved; these are not public references.
  function reconcile(oldDoc, texts, state) {
    var old = oldDoc.lines, a = old.length, b = texts.length;
    if (a === b && old.every(function (line, index) { return line.text.trimStart() === texts[index].trimStart(); })) {
      return old.map(function (line, index) { return { id: line.id, text: texts[index] }; });
    }
    var matches = [], prefix = 0, oldEnd = a, newEnd = b;
    while (prefix < a && prefix < b && old[prefix].text === texts[prefix]) { matches.push([prefix, prefix]); prefix += 1; }
    while (oldEnd > prefix && newEnd > prefix && old[oldEnd - 1].text === texts[newEnd - 1]) { oldEnd -= 1; newEnd -= 1; }
    var oldSize = oldEnd - prefix, newSize = newEnd - prefix;
    var grid = Array.from({ length: oldSize + 1 }, function () { return new Uint16Array(newSize + 1); });
    for (var i = oldSize - 1; i >= 0; i -= 1) {
      for (var j = newSize - 1; j >= 0; j -= 1) grid[i][j] = old[prefix + i].text === texts[prefix + j] ? grid[i + 1][j + 1] + 1 : Math.max(grid[i + 1][j], grid[i][j + 1]);
    }
    var x = 0, y = 0;
    while (x < oldSize && y < newSize) {
      if (old[prefix + x].text === texts[prefix + y]) { matches.push([prefix + x, prefix + y]); x += 1; y += 1; }
      else if (grid[x + 1][y] > grid[x][y + 1]) x += 1;
      else y += 1;
    }
    for (var suffix = 0; oldEnd + suffix < a; suffix += 1) matches.push([oldEnd + suffix, newEnd + suffix]);
    var fresh = texts.map(function (text) { return { id: uid('line'), text: text }; });
    matches.forEach(function (pair) { if (pair[0] < a) fresh[pair[1]].id = old[pair[0]].id; });
    var usedInitially = new Set(fresh.map(function (line) { return line.id; }));
    fresh.forEach(function (line) {
      if (old.some(function (entry) { return entry.id === line.id; })) return;
      var same = old.filter(function (entry) { return !usedInitially.has(entry.id) && entry.text.trimStart() === line.text.trimStart(); });
      if (same.length === 1 && fresh.filter(function (entry) { return entry.text.trimStart() === line.text.trimStart(); }).length === 1) { line.id = same[0].id; usedInitially.add(line.id); }
    });
    var oldKinds = parseDocument(oldDoc, state).rows.map(function (row) { return row.kind; });
    var newKinds = parseDocument(Object.assign({}, oldDoc, { lines: fresh }), state).rows.map(function (row) { return row.kind; });
    // Program numeric-bulk identity patch: a unique token-only edit keeps its ID.
    // Do not infer identity across duplicate titles, depth or parent changes.
    var priorRows = parseDocument(oldDoc, state).rows;
    var freshRows = parseDocument(Object.assign({}, oldDoc, { lines: fresh }), state).rows;
    function tokenless(line) {
      var parts = taskParts(line.text);
      return parts && parts[4].trim() ? parts[1] + parts[3] + parts[4] + parts[5] : null;
    }
    fresh.forEach(function (line, index) {
      if (old.some(function (entry) { return entry.id === line.id; })) return;
      var key = tokenless(line);
      if (!key || fresh.filter(function (entry) { return tokenless(entry) === key; }).length !== 1) return;
      var candidates = old.filter(function (entry) { return tokenless(entry) === key; });
      if (candidates.length !== 1 || fresh.some(function (entry) { return entry.id === candidates[0].id; })) return;
      var priorIndex = old.indexOf(candidates[0]), prior = priorRows[priorIndex], current = freshRows[index];
      if (prior.kind !== current.kind || prior.depth !== current.depth || prior.parentLineId !== current.parentLineId) return;
      if (!parseProgressToken(taskParts(line.text)[2]).ok && !parseProgressToken(taskParts(candidates[0].text)[2]).ok) return;
      line.id = candidates[0].id;
    });
    var leftOld = -1, leftNew = -1, ambiguous = [], converted = false;
    matches.concat([[a, b]]).forEach(function (pair) {
      var oldCount = pair[0] - leftOld - 1, newCount = pair[1] - leftNew - 1;
      if (oldCount > 0 && newCount > 0) {
        var oldGap = oldKinds.slice(leftOld + 1, pair[0]), newGap = newKinds.slice(leftNew + 1, pair[1]);
        var oldChecks = old.slice(leftOld + 1, pair[0]).filter(function (line) { return taskParts(line.text); });
        var newChecks = fresh.slice(leftNew + 1, pair[1]).filter(function (line) { return taskParts(line.text); });
        if (oldChecks.length === 1 && newChecks.length === 1 &&
            !fresh.some(function (line) { return line.id === oldChecks[0].id; }) &&
            !old.some(function (line) { return line.id === newChecks[0].id; })) newChecks[0].id = oldChecks[0].id;
        if (oldCount === newCount) oldGap.forEach(function (kind, index) {
          if (['task', 'subcheck'].includes(kind) && ['task', 'subcheck'].includes(newGap[index]) && kind !== newGap[index]) converted = true;
        });
        oldGap.forEach(function (kind, index) {
          if (oldGap.filter(function (value) { return value === kind; }).length === 1 &&
              newGap.filter(function (value) { return value === kind; }).length === 1) {
            var target = fresh[leftNew + 1 + newGap.indexOf(kind)], oldId = old[leftOld + 1 + index].id;
            if (!old.some(function (entry) { return entry.id === target.id; }) && !fresh.some(function (entry) { return entry.id === oldId; })) target.id = oldId;
          }
        });
        if (oldGap.includes('task') && newGap.includes('task')) ambiguous.push([leftOld + 1, pair[0], leftNew + 1, pair[1]]);
      }
      if (pair[0] < a) fresh[pair[1]].id = old[pair[0]].id;
      leftOld = pair[0]; leftNew = pair[1];
    });
    var used = new Set(fresh.map(function (line) { return line.id; }));
    var oldIds = new Set(old.map(function (line) { return line.id; }));
    var remainingOld = old.filter(function (line) { return !used.has(line.id); });
    var remainingNew = fresh.filter(function (line) { return !oldIds.has(line.id); });
    remainingNew.forEach(function (line) {
      var candidates = remainingOld.filter(function (item) { return item.text === line.text && !used.has(item.id); });
      if (candidates.length === 1 && remainingNew.filter(function (item) { return item.text === line.text; }).length === 1) {
        line.id = candidates[0].id; used.add(line.id);
      }
    });
    var missingKinds = old.filter(function (line) { return !used.has(line.id) && taskParts(line.text); })
      .map(function (line) { return oldKinds[old.indexOf(line)]; });
    var createdKinds = fresh.filter(function (line) { return !oldIds.has(line.id) && taskParts(line.text); })
      .map(function (line) { return newKinds[fresh.indexOf(line)]; });
    if (remainingOld.some(function (line) { return taskParts(line.text) && !used.has(line.id) && remainingNew.some(function (freshLine) { return freshLine.text.trimStart() === line.text.trimStart(); }); })) return null;
    // Reparenting is explicit; an unmatched multi-checkbox rewrite is still not
    // permission to guess which old identity belongs to which newly typed item.
    if (missingKinds.length && createdKinds.length && (missingKinds.length > 1 || createdKinds.length > 1)) return null;
    if (ambiguous.some(function (gap) {
      return old.slice(gap[0], gap[1]).some(function (line) { return taskParts(line.text) && !used.has(line.id); }) &&
        fresh.slice(gap[2], gap[3]).some(function (line) { return taskParts(line.text) && !oldIds.has(line.id); });
    })) return null;
    return fresh;
  }
  function assignNewTaskScopes(state) {
    var owners = {}, itemOwners = {}, next = Object.assign({}, state, { taskScopes: owners, itemScopes: itemOwners });
    itemList(state).forEach(function (task) {
      var doc = getDocument(state, task.docId);
      itemOwners[task.id] = (state.itemScopes || {})[task.id] || state.taskScopes[task.id] || contextUnchecked(state, doc.id, task.sourceIndex).scopeId ||
        (state.flows.some(function (flow) { return flow.id === doc.id; }) ? doc.id : doc.folderId);
      if (task.isCanonical) owners[task.id] = itemOwners[task.id];
    });
    // Keep dormant source identities during an empty-title editing scaffold.
    // They are not queryable items and cannot receive progress until titled.
    allDocuments(state).forEach(function (doc) { parseDocument(doc, state).rows.forEach(function (row) {
      var parts = ['task', 'subcheck'].includes(row.kind) && taskParts(row.text);
      if (parts && !parts[4].trim() && !isTaskReference(state, row.id) && (state.itemScopes || {})[row.id]) {
        itemOwners[row.id] = state.itemScopes[row.id];
        if (state.taskScopes[row.id]) owners[row.id] = state.taskScopes[row.id];
      }
    }); });
    return next;
  }
  function editText(state, docId, text, options) {
    return editTextResult(state, docId, text, options).state;
  }
  // Local diagnostic adapter: preserve every existing rejection and identity rule.
  // Reasons are transient UI results, never part of the persisted workspace.
  function editTextResult(state, docId, text, options) {
    var reject = function (reason) { return { state: state, reason: reason || 'blocked' }; };
    if (!validate(state) || !str(text, MAX_RAW, false)) return reject();
    if (options !== undefined && (!options || typeof options !== 'object' || Array.isArray(options) ||
        Object.keys(options).some(function (key) { return key !== 'progressDate'; }) ||
        (Object.prototype.hasOwnProperty.call(options, 'progressDate') && (options.progressDate === null || !validDate(options.progressDate))))) return reject();
    var doc = getDocument(state, docId);
    if (!doc) return reject();
    var normalized = text.replace(/\r\n?/g, '\n');
    if (normalized === raw(doc)) return { state: state, reason: null };
    var split = normalized ? normalized.split('\n') : [];
    if (split.length > MAX_LINES) return reject();
    var lines = reconcile(doc, split, state);
    if (!lines) return reject('identity-ambiguous');
    var next = putDocument(state, Object.assign({}, doc, { lines: lines }));
    var surviving = new Set(lines.map(function (line) { return line.id; }));
    var previousIds = new Set(doc.lines.map(function (line) { return line.id; }));
    var lostBinding = state.bindings.some(function (binding) { return binding.docId === docId && !surviving.has(binding.lineId); });
    if (lostBinding && lines.some(function (line) { return !previousIds.has(line.id) && /^ *- /.test(line.text); })) return reject();
    next = Object.assign({}, next, { bindings: next.bindings.filter(function (binding) { return binding.docId !== docId || surviving.has(binding.lineId); }) });
    var beforeTasks = new Map(taskList(state).map(function (task) { return [task.id, task]; }));
    var edited = parseDocument(getDocument(next, docId), next), desired = new Map();
    if (edited.issues.some(function (issue) { return issue.blocking; })) return reject('invalid-format');
    for (var binding of next.bindings.filter(function (entry) { return entry.docId === docId && entry.kind === 'task'; })) {
      var projected = edited.tasks.find(function (task) { return task.id === binding.lineId; });
      var previous = beforeTasks.get(binding.taskId);
      if (!projected || !previous) return reject();
      var projectedDone = projected.inputPercent === undefined ? projected.done : previous.done;
      if (projected.title !== previous.title || projectedDone !== previous.done) {
        var existing = desired.get(binding.taskId);
        if (existing && (existing.title !== projected.title || existing.done !== projectedDone)) return reject();
        desired.set(binding.taskId, { title: projected.title, done: projectedDone });
      }
    }
    next = assignNewTaskScopes(next);
    var afterTasks = new Map(taskList(next).map(function (task) { return [task.id, task]; }));
    if (next.bindings.some(function (binding) { return binding.kind === 'task' && !afterTasks.has(binding.taskId); })) return reject();
    for (var entry of desired) {
      var current = afterTasks.get(entry[0]), before = beforeTasks.get(entry[0]), requested = entry[1];
      if (!current || (current.docId === docId && (current.title !== before.title || current.done !== before.done) &&
          (current.title !== requested.title || current.done !== requested.done))) return reject();
      var owner = getDocument(next, current.docId), ownerLines = owner.lines.slice(), source = ownerLines[current.sourceIndex], parts = taskParts(source.text);
      ownerLines[current.sourceIndex] = { id: source.id, text: parts[1] + (parseProgressToken(parts[2]).ok ? parts[2] : (requested.done ? 'x' : ' ')) + parts[3] + requested.title + parts[5] };
      next = putDocument(next, Object.assign({}, owner, { lines: ownerLines }));
    }
    next = applyTextProgress(state, next, docId, edited, options && options.progressDate);
    if (!next) return reject();
    next = finalize(state, pinStructuralDates(state, next, docId, true));
    return next === state ? reject() : { state: next, reason: null };
  }
  // Only a newly materialized numeric Task or an effective numeric value change
  // records progress. Retyping equivalent notation, renaming and structural moves
  // preserve history. Numeric marks retain their original spelling as input facts;
  // latest dated history supplies current completion independently of those marks.
  function applyTextProgress(before, next, docId, edited, fallbackDate) {
    var oldDoc = getDocument(before, docId), oldAnalysis = parseDocument(oldDoc, before);
    var oldLines = new Map(oldDoc.lines.map(function (line) { return [line.id, line]; }));
    var oldTasks = new Set(oldAnalysis.items.map(function (task) { return task.id; })), requests = new Map(), literalChecks = new Map();
    for (var row of edited.rows) {
      if (!['task', 'subcheck'].includes(row.kind)) continue;
      var projected = edited.items.find(function (task) { return task.id === row.id; });
      if (!projected) continue;
      var oldLine = oldLines.get(row.id), oldParts = oldLine && taskParts(oldLine.text), parts = taskParts(row.text);
      var numeric = parseProgressToken(parts[2]), priorNumeric = parseProgressToken(oldParts && oldParts[2]);
      var binding = bindingAt(next, docId, row.id), taskId = binding && binding.kind === 'task' ? binding.taskId : row.id;
      if (!numeric.ok) {
        if (oldParts && oldParts[2] !== parts[2] && (!/^[ xX]$/.test(oldParts[2]) || (oldParts[2].toLowerCase() === 'x') !== (parts[2].toLowerCase() === 'x'))) {
          var literalDone = parts[2].toLowerCase() === 'x';
          if (literalChecks.has(taskId) && literalChecks.get(taskId) !== literalDone) return null;
          literalChecks.set(taskId, literalDone);
        }
        continue;
      }
      if (oldTasks.has(row.id) && priorNumeric.ok && priorNumeric.percent === numeric.percent) continue;
      var dateOwnerId = row.id, properties = [];
      while (dateOwnerId && !properties.length) {
        properties = edited.rows.filter(function (entry) { return entry.kind === 'property' && entry.taskId === dateOwnerId && propertyParts(entry.text)[1] === '날짜'; });
        var dateOwner = edited.items.find(function (item) { return item.id === dateOwnerId; });
        dateOwnerId = dateOwner && !dateOwner.isCanonical ? dateOwner.parentItemId : null;
      }
      var date = null;
      if (properties.length) {
        date = dateValue(propertyParts(properties[properties.length - 1].text)[2].trim());
        if (!validDate(date)) return null;
      } else if (row.dateLineId) {
        var dateRow = edited.rows.find(function (entry) { return entry.id === row.dateLineId; });
        if (!dateRow || !dateRow.valid) return null;
        date = row.groupDate;
      }
      if (date === null) date = fallbackDate;
      if (date === null || !validDate(date)) return null;
      var key = taskId + '\u0000' + date;
      if (requests.has(key) && requests.get(key).percent !== numeric.percent) return null;
      requests.set(key, { taskId: taskId, date: date, percent: numeric.percent });
    }
    var records = next.progressRecords.slice();
    requests.forEach(function (request) {
      var at = records.findIndex(function (record) { return record.taskId === request.taskId && record.date === request.date; });
      if (at === -1) records.push(request); else if (records[at].percent !== request.percent) records[at] = request;
    });
    if (records.length > MAX_PROGRESS_RECORDS) return null;
    next = Object.assign({}, next, { progressRecords: records });
    var latest = new Map();
    records.forEach(function (record) { if (!latest.has(record.taskId) || latest.get(record.taskId).date < record.date) latest.set(record.taskId, record); });
    for (var intent of literalChecks) if (latest.has(intent[0]) && (latest.get(intent[0]).percent === 100) !== intent[1]) return null;
    var affected = new Set(Array.from(requests.values()).map(function (request) { return request.taskId; }));
    for (var task of progressTargetsUnchecked(next)) {
      if (!affected.has(task.id)) continue;
      var owner = getDocument(next, task.docId), lines = owner.lines.slice(), source = lines[task.sourceIndex], sourceParts = taskParts(source.text);
      if (parseProgressToken(sourceParts[2]).ok) continue;
      var done = latest.get(task.id).percent === 100;
      if (task.done !== done) {
        lines[task.sourceIndex] = { id: source.id, text: sourceParts[1] + (done ? 'x' : ' ') + sourceParts[3] + sourceParts[4] + sourceParts[5] };
        next = putDocument(next, Object.assign({}, owner, { lines: lines }));
      }
    }
    return next;
  }
  // Structural moves keep existing effective dates. Editing date text itself is explicit.
  function pinStructuralDates(before, next, docId, dateSectionInput) {
    var oldDoc = getDocument(before, docId), newDoc = getDocument(next, docId);
    var oldSections = parseDocument(oldDoc, before).rows.filter(function (row) { return row.kind === 'date'; });
    var newSections = parseDocument(newDoc, next).rows.filter(function (row) { return row.kind === 'date'; });
    // Explicit date-section insertion/removal/change may change inherited dates.
    // Existing IDs, relative order, depth and parent/scope must still agree.
    if (dateSectionInput && JSON.stringify(oldSections.map(function (row) { return [row.id, row.text]; })) !==
        JSON.stringify(newSections.map(function (row) { return [row.id, row.text]; }))) {
      var oldItems = parseDocument(oldDoc, before).rows.filter(function (row) { return row.kind === 'task' || row.kind === 'subcheck'; });
      var newItems = parseDocument(newDoc, next).rows.filter(function (row) { return row.kind === 'task' || row.kind === 'subcheck'; });
      var oldItemIds = new Set(oldItems.map(function (row) { return row.id; }));
      function itemShape(row) { return [row.id, row.kind, row.depth, row.parentLineId, row.ancestorScopeIds]; }
      var sameItems = JSON.stringify(oldItems.map(itemShape)) === JSON.stringify(newItems.filter(function (row) { return oldItemIds.has(row.id); }).map(itemShape));
      var addedChild = newItems.some(function (row) { return !oldItemIds.has(row.id) && row.ancestorItemIds.some(function (id) { return oldItemIds.has(id); }); });
      if (sameItems && !addedChild) return next;
    }
    if (oldSections.some(function (row) {
      var current = newSections.find(function (entry) { return entry.id === row.id; });
      return current && current.text !== row.text;
    })) return next;
    var prior = new Map(itemList(before).filter(function (task) { return task.docId === docId; }).map(function (task) { return [task.id, task]; }));
    var changed = itemList(next).filter(function (task) { return task.docId === docId && prior.has(task.id) && task.date !== prior.get(task.id).date; });
    changed.forEach(function (task) {
      var previous = prior.get(task.id), currentDoc = getDocument(next, docId);
      var currentItem = itemList(next).find(function (item) { return item.id === task.id; });
      if (currentItem && currentItem.date === previous.date) return;
      function dateProperties(doc, index) {
        return propertyIndexes(doc, index).filter(function (i) { return propertyParts(doc.lines[i].text)[1] === '날짜'; })
          .map(function (i) { return doc.lines[i].text.trim(); }).join('\n');
      }
      if (dateProperties(oldDoc, previous.sourceIndex) !== dateProperties(newDoc, task.sourceIndex)) return;
      if (dateSectionInput && !task.explicitDate) {
        var currentItems = new Map(itemList(next).filter(function (item) { return item.docId === docId; }).map(function (item) { return [item.id, item]; }));
        var descendant = task, priorDescendant = previous, seenAncestors = new Set();
        while (descendant.parentItemId && descendant.parentItemId === priorDescendant.parentItemId && descendant.depth === priorDescendant.depth) {
          if (seenAncestors.has(descendant.parentItemId)) break;
          seenAncestors.add(descendant.parentItemId);
          var parentItem = currentItems.get(descendant.parentItemId), priorParent = prior.get(descendant.parentItemId);
          if (!parentItem || !priorParent || parentItem.parentItemId !== priorParent.parentItemId || parentItem.depth !== priorParent.depth) break;
          if (dateProperties(oldDoc, priorParent.sourceIndex) !== dateProperties(newDoc, parentItem.sourceIndex)) return;
          if (parentItem.explicitDate) break;
          descendant = parentItem; priorDescendant = priorParent;
        }
      }
      var index = currentDoc.lines.findIndex(function (line) { return line.id === task.id; });
      var lines = replaceProperties(currentDoc.lines, index, '날짜', [previous.date === null ? '미정' : previous.date]);
      next = putDocument(next, Object.assign({}, currentDoc, { lines: lines }));
    });
    return next;
  }
  function findTask(state, taskId) {
    if (!validate(state)) return null;
    var task = itemList(state).find(function (entry) { return entry.id === taskId; });
    return task ? { doc: getDocument(state, task.docId), task: task } : null;
  }
  function progressTargetsUnchecked(state) {
    return itemList(state);
  }
  function findProgressTarget(state, id) {
    if (!validate(state)) return null;
    var target = progressTargetsUnchecked(state).find(function (entry) { return entry.id === id; });
    return target ? { doc: getDocument(state, target.docId), task: target } : null;
  }
  // Review-only cumulative snapshots: percentages are not deltas. Accept canonical
  // Task IDs and source subcheck IDs; TXT resolves local references explicitly.
  // UI callers use rowMeta.progressTargetId (not the child's parent taskId).
  // A child's effective date follows its canonical parent Task; its progress and
  // completion are independent, with no parent aggregation or Task promotion.
  // Queries return detached values. There is no aggregation or record-deletion API.
  function progressHistory(state, taskId) {
    if (!validate(state) || typeof taskId !== 'string') return [];
    return state.progressRecords.filter(function (record) { return record.taskId === taskId; })
      .map(function (record) { return { date: record.date, percent: record.percent }; })
      .sort(function (a, b) { return a.date.localeCompare(b.date); });
  }
  function latestProgress(state, taskId) {
    var history = progressHistory(state, taskId);
    return history.length ? history[history.length - 1] : null;
  }
  function recordProgress(state, taskId, date, percent) {
    if (typeof taskId !== 'string' || date === null || !validDate(date) || !Number.isInteger(percent) || percent < 0 || percent > 100) return state;
    var found = findProgressTarget(state, taskId);
    if (!found) return state;
    var existing = state.progressRecords.findIndex(function (record) { return record.taskId === taskId && record.date === date; });
    if (existing !== -1 && state.progressRecords[existing].percent === percent) return state;
    if (existing === -1 && state.progressRecords.length >= MAX_PROGRESS_RECORDS) return state;
    var records = state.progressRecords.slice(), record = { taskId: taskId, date: date, percent: percent };
    if (existing === -1) records.push(record); else records[existing] = record;
    var latest = records.reduce(function (last, entry) {
      return entry.taskId === taskId && (!last || entry.date > last.date) ? entry : last;
    }, null);
    var next = Object.assign({}, state, { progressRecords: records });
    if (found.task.done !== (latest.percent === 100)) {
      var lines = found.doc.lines.slice(), line = lines[found.task.sourceIndex], parts = taskParts(line.text);
      lines[found.task.sourceIndex] = { id: line.id, text: parts[1] + (parseProgressToken(parts[2]).ok ? parts[2] : (latest.percent === 100 ? 'x' : ' ')) + parts[3] + parts[4] + parts[5] };
      next = putDocument(next, Object.assign({}, found.doc, { lines: lines }));
    }
    return finalize(state, next);
  }
  function relatedIndexes(doc, index) {
    var rows = parseDocument(doc).rows, row = rows[index];
    return row ? rows.slice(index + 1, row.subtreeEndIndex).filter(function (entry) { return entry.kind !== 'blank'; })
      .map(function (entry) { return entry.index; }) : [];
  }
  function propertyIndexes(doc, index) {
    var rows = parseDocument(doc).rows, row = rows[index];
    return row ? rows.slice(index + 1, row.subtreeEndIndex).filter(function (entry) {
      return entry.kind === 'property' && entry.depth === row.depth + 1 && propertyParts(entry.text);
    }).map(function (entry) { return entry.index; }) : [];
  }
  function validTitle(value) { return str(value, MAX_RAW, true) && !/[\r\n]/.test(value); }
  function replaceProperties(lines, sourceIndex, name, values) {
    var prefixIndent = '  '.repeat(indentation(lines[sourceIndex].text).depth + 1);
    var indexes = propertyIndexes({ lines: lines }, sourceIndex), existing = indexes.filter(function (index) { return propertyParts(lines[index].text)[1] === name; });
    if (!existing.length) {
      if (!values.length) return lines;
      var inserted = lines.slice(), insertion = indexes.length ? indexes[indexes.length - 1] + 1 : sourceIndex + 1;
      inserted.splice.apply(inserted, [insertion, 0].concat(values.map(function (value) { return { id: uid('line'), text: prefixIndent + '- ' + name + ': ' + value }; })));
      return inserted;
    }
    var result = [], used = 0, targets = new Set(existing), last = existing[existing.length - 1];
    lines.forEach(function (line, index) {
      if (!targets.has(index)) result.push(line);
      else {
        if (used < values.length) {
          var prefix = line.text.slice(0, line.text.indexOf(name + ':')) + name + ': ';
          result.push({ id: line.id, text: prefix + values[used] });
        }
        used += 1;
        if (index === last) while (used < values.length) { result.push({ id: uid('line'), text: prefixIndent + '- ' + name + ': ' + values[used] }); used += 1; }
      }
    });
    return result;
  }
  function updateTask(state, taskId, patch) {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length ||
        Object.keys(patch).some(function (key) { return !['title', 'done', 'date', 'note', 'time'].includes(key); })) return state;
    if (Object.prototype.hasOwnProperty.call(patch, 'title') && !validTitle(patch.title)) return state;
    if (Object.prototype.hasOwnProperty.call(patch, 'done') && typeof patch.done !== 'boolean') return state;
    if (Object.prototype.hasOwnProperty.call(patch, 'date') && !validDate(patch.date)) return state;
    if (Object.prototype.hasOwnProperty.call(patch, 'note') && !str(patch.note, MAX_RAW, false)) return state;
    if (Object.prototype.hasOwnProperty.call(patch, 'time') && (typeof patch.time !== 'string' || (patch.time.trim() && !/^([01]\d|2[0-3]):[0-5]\d$/.test(patch.time.trim())))) return state;
    var found = findTask(state, taskId);
    if (!found) return state;
    var doc = found.doc, task = found.task, nextLines = doc.lines.slice(), line = doc.lines[task.sourceIndex], parts = taskParts(line.text);
    var changedText = parts[1] + (patch.done === undefined ? parts[2] : (patch.done ? 'x' : ' ')) + parts[3] +
      (patch.title === undefined ? parts[4] : patch.title.trim()) + parts[5];
    if (changedText !== line.text) nextLines[task.sourceIndex] = { id: line.id, text: changedText };
    if (Object.prototype.hasOwnProperty.call(patch, 'date')) {
      var indexes = propertyIndexes(doc, task.sourceIndex), dates = indexes.filter(function (index) { return propertyParts(doc.lines[index].text)[1] === '날짜'; });
      var dateText = patch.date === null ? '미정' : patch.date;
      if (dates.length) {
        var dateIndex = dates[dates.length - 1], dateLine = doc.lines[dateIndex];
        nextLines[dateIndex] = { id: dateLine.id, text: dateLine.text.replace(/(날짜:\s*).*$/, '$1' + dateText) };
      } else nextLines.splice(task.sourceIndex + 1, 0, { id: uid('line'), text: '  '.repeat(task.depth + 1) + '- 날짜: ' + dateText });
    }
    if (Object.prototype.hasOwnProperty.call(patch, 'note')) nextLines = replaceProperties(nextLines, task.sourceIndex, '메모', patch.note.trim() ? patch.note.replace(/\r\n?/g, '\n').split('\n') : []);
    if (Object.prototype.hasOwnProperty.call(patch, 'time')) nextLines = replaceProperties(nextLines, task.sourceIndex, '시간', patch.time.trim() ? [patch.time.trim()] : []);
    return replaceDocument(state, Object.assign({}, doc, { lines: nextLines }));
  }
  function updateSubcheck(state, docId, lineId, done) {
    if (!validate(state) || typeof done !== 'boolean') return state;
    var doc = getDocument(state, docId);
    if (!doc) return state;
    var row = parseDocument(doc, state).rows.find(function (entry) { return entry.id === lineId; });
    if (!row || row.kind !== 'subcheck' || !row.title || !row.taskId || row.done === done) return state;
    var lines = doc.lines.slice(), line = lines[row.index];
    var text = line.text.replace(/^( *- \[)[ xX](\])/, function (_, before, after) { return before + (done ? 'x' : ' ') + after; });
    if (text === line.text) return state;
    lines[row.index] = { id: line.id, text: text };
    return replaceDocument(state, Object.assign({}, doc, { lines: lines }));
  }
  function restoreTaskDate(state, taskId) {
    var found = findTask(state, taskId);
    if (!found) return state;
    var indexes = new Set(propertyIndexes(found.doc, found.task.sourceIndex).filter(function (index) { return propertyParts(found.doc.lines[index].text)[1] === '날짜'; }));
    if (!indexes.size) return state;
    return replaceDocument(state, Object.assign({}, found.doc, { lines: found.doc.lines.filter(function (_, index) { return !indexes.has(index); }) }));
  }
  function addTask(state, input) {
    if (!validate(state) || !input || !validTitle(input.title)) return state;
    if (Object.prototype.hasOwnProperty.call(input, 'scopeId') && !scopeList(state).some(function (scope) { return scope.id === input.scopeId; })) return state;
    var doc = getDocument(state, input.docId), date = input.date === undefined ? null : input.date;
    var defaultScope = doc && (state.flows.some(function (flow) { return flow.id === doc.id; }) ? doc.id : doc.folderId);
    var wanted = input.scopeId === undefined ? defaultScope : input.scopeId;
    if (!doc || !validDate(date) || !scopeList(state).some(function (scope) { return scope.id === wanted; })) return state;
    var parsed = parseDocument(doc, state), sections = parsed.rows.filter(function (row) { return row.kind === 'date'; });
    if (parsed.issues.some(function (issue) { return issue.code === 'unclosed-fence'; })) return state;
    var lines = doc.lines.slice(), matching = sections.filter(function (row) { return row.valid && row.date === date; });
    var section = matching[matching.length - 1], insertAt = lines.length, depth = 0, scopeBinding = null;
    if (section) {
      var following = sections.find(function (row) { return row.index > section.index; });
      var end = following ? following.index : lines.length;
      while (end > section.index + 1 && !lines[end - 1].text.trim()) end -= 1;
      var candidate = parsed.rows.filter(function (row) {
        return row.kind === 'scope' && row.scopeId === wanted && row.index > section.index && row.index < end && row.depth < MAX_DEPTH;
      }).pop();
      if (candidate) { insertAt = Math.min(end, candidate.subtreeEndIndex); depth = candidate.depth + 1; }
      else if (wanted === defaultScope) insertAt = end;
      else section = null;
    }
    if (!section) {
      if (lines.length && lines[lines.length - 1].text.trim()) lines.push({ id: uid('line'), text: '' });
      lines.push({ id: uid('line'), text: '[' + (date === null ? '미정' : date) + ']' });
      if (wanted !== defaultScope) {
        var scope = scopeList(state).find(function (entry) { return entry.id === wanted; });
        var scopeLine = { id: uid('line'), text: '- ' + scope.title };
        lines.push(scopeLine); depth = 1;
        scopeBinding = { kind: 'scope', docId: doc.id, lineId: scopeLine.id, scopeId: wanted };
      }
      insertAt = lines.length;
    }
    var taskLine = { id: uid('line'), text: '  '.repeat(depth) + '- [ ] ' + input.title.trim() };
    lines.splice(insertAt, 0, taskLine);
    var next = putDocument(state, Object.assign({}, doc, { lines: lines }));
    if (scopeBinding) next = Object.assign({}, next, { bindings: next.bindings.concat([scopeBinding]) });
    next = assignNewTaskScopes(next);
    next = Object.assign({}, next, { taskScopes: Object.assign({}, next.taskScopes, { [taskLine.id]: wanted }), itemScopes: Object.assign({}, next.itemScopes, { [taskLine.id]: wanted }) });
    return finalize(state, next);
  }
  function removeTask(state, taskId) {
    var found = findTask(state, taskId);
    if (!found || state.progressRecords.some(function (record) { return record.taskId === taskId; }) ||
        state.bindings.some(function (binding) { return binding.kind === 'task' && binding.taskId === taskId; })) return state;
    var indexes = new Set([found.task.sourceIndex].concat(relatedIndexes(found.doc, found.task.sourceIndex)));
    return finalize(state, assignNewTaskScopes(putDocument(state, Object.assign({}, found.doc, { lines: found.doc.lines.filter(function (_, index) { return !indexes.has(index); }) }))));
  }
  function addDocument(state, input) {
    if (!validate(state) || !input || !str(input.title, 1000, false) || /[\r\n]/.test(input.title)) return state;
    var wanted = input.folder === undefined ? '미분류' : input.folder, folder, next = state;
    if (input.folderId !== undefined) {
      folder = state.folders.find(function (entry) { return entry.id === input.folderId; });
      if (!folder) return state;
    } else {
      var candidates = state.folders.filter(function (entry) { return entry.id === wanted || entry.title === wanted; });
      if (candidates.length > 1) return state;
      folder = candidates[0];
    }
    if (!folder) {
      if (!str(wanted, 100, true) || /[\r\n]/.test(wanted)) return state;
      folder = { id: uid('folder'), title: wanted.trim(), parentId: null };
      next = Object.assign({}, state, { folders: state.folders.concat([folder]) });
    }
    var doc = { id: uid('doc'), title: input.title.trim() || '새 문서', folder: folder.title, folderId: folder.id, lines: [] };
    return finalize(state, Object.assign({}, next, { documents: next.documents.concat([doc]) }));
  }
  function insertionTarget(state, docId, index) {
    var doc = getDocument(state, docId);
    if (!doc || !Number.isInteger(index) || index < 0 || index > doc.lines.length) return null;
    var parsed = parseDocument(doc, state), row = parsed.rows[index], line = doc.lines[index], depth = row ? row.depth : 0;
    var context = insertionUnchecked(state, docId, index, depth);
    if (!context.valid) return null;
    if (!row) return { doc: doc, line: null, index: index, depth: 0, context: context };
    if (['fence', 'date', 'property', 'heading'].includes(row.kind) ||
        (row.kind === 'note' && row.text.trim() && !/^ *-($| )/.test(row.text)) ||
        (['task', 'subcheck'].includes(row.kind) && row.text.trim() && !/^ *- \[[ xX]\]\s*$/.test(row.text)) ||
        relatedIndexes(doc, index).length) return null;
    return { doc: doc, line: line, index: index, depth: depth, context: context };
  }
  function attachScope(state, docId, index, scopeId) {
    if (!validate(state)) return state;
    var scope = scopeList(state).find(function (entry) { return entry.id === scopeId; }), target = insertionTarget(state, docId, index);
    if (!scope || !target || (target.line && taskParts(target.line.text))) return state;
    var placement = { depth: target.depth, parentKind: target.context.parentKind,
      ancestorScopeKind: target.context.scopeKind, ancestorScopeId: target.context.scopeId, ancestorScopeIds: target.context.ancestorScopeIds };
    if (scopeId === docId || !scopePlacementAllowed(state, placement, scopeId)) return state;
    var line = { id: target.line ? target.line.id : uid('line'), text: '  '.repeat(target.depth) + '- ' + scope.title }, lines = target.doc.lines.slice();
    if (target.line) lines[index] = line; else lines.push(line);
    var next = putDocument(state, Object.assign({}, target.doc, { lines: lines }));
    next = Object.assign({}, next, { bindings: next.bindings.filter(function (entry) { return entry.lineId !== line.id; })
      .concat([{ kind: 'scope', docId: docId, lineId: line.id, scopeId: scopeId }]) });
    return finalize(state, assignNewTaskScopes(next));
  }
  function createFolderAt(state, docId, index, title) {
    if (!validate(state) || !validTitle(title) || title.trim().length > 100) return state;
    var target = insertionTarget(state, docId, index);
    if (!target || (target.line && !/^ *-\s*$/.test(target.line.text))) return state;
    var parentId = null;
    if (target.depth > 0) {
      if (target.context.scopeKind !== 'folder') return state;
      parentId = target.context.scopeId;
    }
    var catalogDepth = 0, parent = state.folders.find(function (folder) { return folder.id === parentId; });
    while (parent) { catalogDepth += 1; parent = state.folders.find(function (folder) { return folder.id === parent.parentId; }); }
    if (catalogDepth >= MAX_DEPTH || state.folders.some(function (folder) { return folder.parentId === parentId && folder.title === title.trim(); })) return state;
    var folder = { id: uid('folder'), title: title.trim(), parentId: parentId };
    var next = Object.assign({}, state, { folders: state.folders.concat([folder]) });
    var attached = attachScope(next, docId, index, folder.id);
    return attached === next ? state : finalize(state, attached);
  }
  function linkTask(state, docId, index, taskId, options) {
    if (!validate(state)) return state;
    var settings = options || {}, mode = settings.dateMode || 'keep', target = insertionTarget(state, docId, index), source = findTask(state, taskId);
    if (!target || !source || !['keep', 'apply'].includes(mode) ||
        (target.line && target.line.id === taskId)) return state;
    if (target.line && state.bindings.some(function (entry) { return entry.kind === 'task' && entry.taskId === target.line.id; })) return state;
    if (target.line && bindingAt(state, docId, target.line.id) && bindingAt(state, docId, target.line.id).kind === 'scope') return state;
    var next = state;
    if (mode === 'apply') {
      var date = Object.prototype.hasOwnProperty.call(settings, 'date') ? settings.date : target.context.date;
      if (!validDate(date)) return state;
      next = updateTask(state, taskId, { date: date });
      if (next === state && source.task.date !== date) return state;
    }
    var doc = getDocument(next, docId), lines = doc.lines.slice();
    var location = target.line ? lines.findIndex(function (line) { return line.id === target.line.id; }) : lines.length;
    if (location < 0) return state;
    var current = findTask(next, taskId).task;
    var line = { id: target.line ? target.line.id : uid('line'), text: '  '.repeat(target.depth) + '- [' + (current.done ? 'x' : ' ') + '] ' + current.title };
    if (target.line) lines[location] = line; else lines.push(line);
    next = putDocument(next, Object.assign({}, doc, { lines: lines }));
    next = Object.assign({}, next, { bindings: next.bindings.filter(function (entry) { return entry.lineId !== line.id; })
      .concat([{ kind: 'task', docId: docId, lineId: line.id, taskId: taskId, dateMode: mode }]) });
    return finalize(state, assignNewTaskScopes(next));
  }
  function importFlowTasks(state, docId, scopeLineId) {
    if (!validate(state)) return state;
    var binding = bindingAt(state, docId, scopeLineId), doc = getDocument(state, docId);
    if (!binding || binding.kind !== 'scope' || !state.flows.some(function (flow) { return flow.id === binding.scopeId && flow.private; })) return state;
    var row = parseDocument(doc, state).rows.find(function (entry) { return entry.id === scopeLineId; });
    if (!row || row.depth >= MAX_DEPTH) return state;
    var descendantIds = new Set(doc.lines.slice(row.index + 1, row.subtreeEndIndex).map(function (line) { return line.id; }));
    var existing = new Set(state.bindings.filter(function (entry) { return entry.kind === 'task' && entry.docId === docId && descendantIds.has(entry.lineId); })
      .map(function (entry) { return entry.taskId; }));
    var missing = taskList(state).filter(function (task) { return task.docId === binding.scopeId && !existing.has(task.id); });
    if (!missing.length) return state;
    var additions = [], bindings = state.bindings.slice();
    missing.forEach(function (task) {
      var line = { id: uid('line'), text: '  '.repeat(row.depth + 1) + '- [' + (task.done ? 'x' : ' ') + '] ' + task.title };
      additions.push(line); bindings.push({ kind: 'task', docId: docId, lineId: line.id, taskId: task.id, dateMode: 'keep' });
    });
    var lines = doc.lines.slice(), at = row.subtreeEndIndex;
    while (at > row.index + 1 && !lines[at - 1].text.trim()) at -= 1;
    lines.splice.apply(lines, [at, 0].concat(additions));
    var next = putDocument(state, Object.assign({}, doc, { lines: lines }));
    return finalize(state, Object.assign({}, next, { bindings: bindings }));
  }
  function unlink(state, docId, lineId) {
    if (!validate(state)) return state;
    var binding = bindingAt(state, docId, lineId), doc = getDocument(state, docId);
    if (!binding || !doc) return state;
    var analysis = parseDocument(doc, state), row = analysis.rows.find(function (entry) { return entry.id === lineId; });
    var lines = doc.lines.filter(function (line) { return line.id !== lineId; }).map(function (line) {
      var index = doc.lines.indexOf(line);
      var protectedCode = analysis.rows[index].kind === 'fence' && !/^ *(\x60{3,}|~{3,})/.test(line.text);
      return index > row.index && index < row.subtreeEndIndex && line.text.startsWith('  ') && line.text.trim() && !protectedCode
        ? { id: line.id, text: line.text.slice(2) } : line;
    });
    var next = putDocument(state, Object.assign({}, doc, { lines: lines }));
    next = Object.assign({}, next, { bindings: next.bindings.filter(function (entry) { return entry.lineId !== lineId; }) });
    return finalize(state, pinStructuralDates(state, assignNewTaskScopes(next), docId));
  }
  function renameScope(state, scopeId, title) {
    if (!validate(state) || !validTitle(title) || title.length > 100 || !scopeList(state).some(function (scope) { return scope.id === scopeId; })) return state;
    var value = title.trim(), next = Object.assign({}, state, { folders: state.folders.map(function (folder) {
      return folder.id === scopeId ? Object.assign({}, folder, { title: value }) : folder;
    }) });
    allDocuments(next).forEach(function (doc) {
      var lines = doc.lines.map(function (line) {
        var binding = bindingAt(next, doc.id, line.id);
        return binding && binding.kind === 'scope' && binding.scopeId === scopeId ? { id: line.id, text: /^ */.exec(line.text)[0] + '- ' + value } : line;
      });
      next = putDocument(next, Object.assign({}, doc, { lines: lines, title: doc.id === scopeId ? value : doc.title, folder: doc.folderId === scopeId ? value : doc.folder }));
    });
    return finalize(state, next);
  }
  // v11 review-only movement: same source IDs, flexible local outline placement.
  // The 32-level resource cap is not an ownership rule. Catalogs stay unchanged.
  function moveInfo(state, docId, lineId) {
    if (!validate(state)) return null;
    var doc = getDocument(state, docId);
    if (!doc) return null;
    var analysis = parseDocument(doc, state), row = analysis.rows.find(function (entry) { return entry.id === lineId; });
    if (!row || !['task', 'subcheck', 'scope'].includes(row.kind)) return null;
    var binding = bindingAt(state, docId, lineId);
    var projected = analysis.tasks.find(function (task) { return task.id === lineId; });
    if (row.kind === 'task' && !projected) return null;
    if (row.kind === 'subcheck' && (!row.title || !analysis.tasks.some(function (task) { return task.id === row.taskId; }))) return null;
    var end = row.subtreeEndIndex;
    while (end > row.index + 1 && analysis.rows[end - 1].kind === 'blank') end -= 1;
    if (analysis.issues.some(function (issue) { return issue.code === 'unclosed-fence' && issue.index < end; })) return null;
    var selected = doc.lines.slice(row.index, end), selectedIds = new Set(selected.map(function (line) { return line.id; }));
    var kind = binding && binding.kind === 'task' ? 'reference' : row.kind;
    var scope = binding && binding.kind === 'scope' ? scopeList(state).find(function (entry) { return entry.id === binding.scopeId; }) : null;
    var label = scope ? scope.title : projected ? projected.title : row.title;
    var selection = { lineId: lineId, startIndex: row.index, endIndex: end, depth: row.depth, label: label,
      descendantCount: analysis.rows.slice(row.index + 1, end).filter(function (entry) { return entry.kind !== 'blank'; }).length,
      lineIds: selected.map(function (line) { return line.id; }), kind: kind };
    var remaining = doc.lines.filter(function (line) { return !selectedIds.has(line.id); });
    var remainderDoc = Object.assign({}, doc, { lines: remaining }), remainder = parseDocument(remainderDoc, state);
    if (remainder.issues.some(function (issue) { return issue.blocking; })) return null;
    var explicitDates = new Set(analysis.rows.filter(function (entry) {
      return entry.kind === 'property' && entry.taskId && propertyParts(entry.text)[1] === '날짜';
    }).map(function (entry) { return entry.taskId; }));
    var movedTasks = analysis.items.filter(function (task) { return selectedIds.has(task.id) && !isTaskReference(state, task.id); });
    return { doc: doc, analysis: analysis, row: row, binding: binding, selection: selection, selected: selected,
      remaining: remaining, remainder: remainder, movedTasks: movedTasks, explicitDates: explicitDates };
  }
  function selectionForMove(state, docId, lineId) {
    var info = moveInfo(state, docId, lineId);
    return info ? info.selection : null;
  }
  function moveTargetsForInfo(state, info) {
    var result = [], stack = [], fence = null, date = null, rows = info.remainder.rows;
    var originalIndexes = new Map(info.doc.lines.map(function (line, index) { return [line.id, index]; }));
    var selectedIds = new Set(info.selection.lineIds), selectedRows = info.analysis.rows.slice(info.selection.startIndex, info.selection.endIndex);
    var adjacentEnd = info.selection.startIndex;
    while (adjacentEnd < info.remaining.length && !info.remaining[adjacentEnd].text.trim()) adjacentEnd += 1;
    var allItems = new Map(itemList(state).map(function (item) { return [item.id, item]; }));
    var selectedScopes = selectedRows.filter(function (row) { return row.kind === 'scope'; }).map(function (row) { return row.scopeId; });
    var relativeMax = selectedRows.reduce(function (max, row) {
      return row.kind === 'blank' || row.kind === 'fence' ? max : Math.max(max, row.depth - info.row.depth - (row.kind === 'property' ? 1 : 0));
    }, 0);
    var graph = itemGraph(state), roots = selectedRows.filter(function (row) {
      return ['task', 'subcheck'].includes(row.kind) && row.title && !(row.ancestorItemIds || []).some(function (id) { return selectedIds.has(id); });
    }).map(function (row) { var binding = bindingAt(state, info.doc.id, row.id); return binding && binding.kind === 'task' ? binding.taskId : row.id; });
    for (var index = 0; index <= rows.length; index += 1) {
      var target = rows[index];
      if (!fence && (!target || !['blank', 'fence'].includes(target.kind))) {
        for (var depth = 0; depth <= MAX_DEPTH - relativeMax; depth += 1) {
          var ancestors = stack.filter(function (entry) { return entry.depth < depth; }), parent = ancestors[ancestors.length - 1] || null;
          if (target && target.depth > depth || depth > 0 && (!parent || parent.depth !== depth - 1 || ['date', 'property'].includes(parent.kind))) continue;
          if (index >= info.selection.startIndex && index <= adjacentEnd && depth === info.row.depth) continue;
          if (ancestors.some(function (entry) { return entry.kind === 'scope' && selectedScopes.includes(entry.scopeId); })) continue;
          var parentItem = ancestors.slice().reverse().find(function (entry) { return ['task', 'subcheck'].includes(entry.kind); });
          var parentBinding = parentItem && bindingAt(state, info.doc.id, parentItem.id), parentId = parentItem && (parentBinding && parentBinding.kind === 'task' ? parentBinding.taskId : parentItem.id);
          if (parentId && roots.some(function (id) { return id === parentId || graphReaches(graph, id, parentId); })) continue;
          var delta = depth - info.row.depth;
          var exceptions = info.movedTasks.filter(function (item) {
            if (item.explicitDate || !item.isCanonical && selectedIds.has(item.parentItemId)) return false;
            var incoming = !item.isCanonical && parentId && allItems.has(parentId) ? allItems.get(parentId).date : date;
            return incoming !== item.date;
          });
          var growth = selectedRows.reduce(function (sum, row) {
            return sum + (row.text.trim() && !(row.kind === 'fence' && !/^ *(\x60{3,}|~{3,})/.test(row.text)) ? delta * 2 : 0);
          }, 0) + exceptions.reduce(function (sum, item) { return sum + 1 + 2 * (item.depth + delta + 1) + '- 날짜: '.length + (item.date || '미정').length; }, 0);
          if (info.doc.lines.length + exceptions.length > MAX_LINES || raw(info.doc).length + growth > MAX_RAW) continue;
          var beforeId = target ? target.id : null;
          var text = target ? target.kind === 'scope' ? scopeList(state).find(function (scope) { return scope.id === target.scopeId; }).title
            : ['task', 'subcheck'].includes(target.kind) ? taskParts(target.text)[4].trim() : target.text.trim() : '';
          var parentTitle = parent ? parent.kind === 'scope' ? scopeList(state).find(function (scope) { return scope.id === parent.scopeId; }).title : parent.title || parent.text.trim() : null;
          result.push({ beforeLineId: beforeId, label: (parentTitle ? parentTitle.slice(0, 45) + ' 아래' : '최상위') + ' · ' + (target ? (text.length > 60 ? text.slice(0, 60) + '…' : text) + ' 앞' : '문서 맨 끝'),
            index: target ? originalIndexes.get(target.id) : info.doc.lines.length, depth: depth, parentLineId: parent ? parent.id : null,
            targetKey: (beforeId === null ? '$end' : beforeId) + ':' + depth });
        }
      }
      if (!target) break;
      var mark = /^ *(\x60{3,}|~{3,})(.*)$/.exec(target.text);
      if (target.kind === 'fence') {
        if (!fence) {
          while (stack.length && stack[stack.length - 1].depth >= target.depth) stack.pop();
          if (mark) fence = { mark: mark[1][0], length: mark[1].length };
        } else if (mark && mark[1][0] === fence.mark && mark[1].length >= fence.length && !mark[2].trim()) fence = null;
      } else if (target.kind === 'date') {
        stack = []; date = target.date;
      } else if (target.kind !== 'blank') {
        while (stack.length && stack[stack.length - 1].depth >= target.depth) stack.pop();
        stack.push(target);
      }
    }
    return result;
  }
  function moveTargets(state, docId, lineId) {
    var info = moveInfo(state, docId, lineId);
    return info ? moveTargetsForInfo(state, info) : [];
  }
  function movementPreservesMeaning(before, next, docId) {
    var oldDoc = getDocument(before, docId), nextDoc = getDocument(next, docId);
    var nextLines = new Map(nextDoc.lines.map(function (line) { return [line.id, line]; }));
    if (!oldDoc.lines.every(function (line) { var current = nextLines.get(line.id); return current && current.text.trimStart() === line.text.trimStart(); })) return false;
    if (Object.keys(before.itemScopes).length !== Object.keys(next.itemScopes).length || Object.keys(before.itemScopes).some(function (id) { return before.itemScopes[id] !== next.itemScopes[id]; }) || JSON.stringify(before.bindings) !== JSON.stringify(next.bindings) ||
        JSON.stringify(before.progressRecords) !== JSON.stringify(next.progressRecords) || JSON.stringify(before.folders) !== JSON.stringify(next.folders)) return false;
    if (Object.keys(before.taskScopes).some(function (id) { return next.taskScopes[id] !== before.taskScopes[id]; })) return false;
    var oldTasks = itemList(before), newTasks = new Map(itemList(next).map(function (task) { return [task.id, task]; }));
    return oldTasks.length === newTasks.size && oldTasks.every(function (task) {
      var now = newTasks.get(task.id);
      return now && ['docId', 'title', 'done', 'date', 'note', 'time'].every(function (key) { return now[key] === task[key]; });
    });
  }
  function moveSubtree(state, docId, lineId, beforeLineId, depth) {
    var info = moveInfo(state, docId, lineId);
    if (!info || !(beforeLineId === null || typeof beforeLineId === 'string')) return state;
    var candidates = moveTargetsForInfo(state, info).filter(function (target) { return target.beforeLineId === beforeLineId; });
    var destination = depth === undefined ? candidates.find(function (target) { return target.depth === info.row.depth; })
      : candidates.find(function (target) { return target.depth === depth; });
    if (!destination) return state;
    var at = beforeLineId === null ? info.remaining.length : info.remaining.findIndex(function (line) { return line.id === beforeLineId; });
    var lines = info.remaining.slice();
    var delta = destination.depth - info.row.depth;
    var moved = info.selected.map(function (line) {
      var row = info.analysis.rows[info.doc.lines.findIndex(function (entry) { return entry.id === line.id; })];
      if (!line.text.trim() || row.kind === 'fence' && !/^ *(\x60{3,}|~{3,})/.test(line.text)) return line;
      return { id: line.id, text: '  '.repeat(row.depth + delta) + line.text.trimStart() };
    });
    lines.splice.apply(lines, [at, 0].concat(moved));
    var next = pinStructuralDates(state, putDocument(state, Object.assign({}, info.doc, { lines: lines })), docId);
    next = finalize(state, next);
    return next !== state && movementPreservesMeaning(state, next, docId) ? next : state;
  }
  return { MAX_DEPTH: MAX_DEPTH, raw: raw, parseDocument: parseDocument, tasks: tasks, editText: editText, editTextResult: editTextResult,
    updateTask: updateTask, addTask: addTask, removeTask: removeTask, addDocument: addDocument, validate: validate,
    scopes: scopes, scopeTasks: scopeTasks, contextAt: contextAt, rowMeta: rowMeta, getDocument: getDocument,
    attachScope: attachScope, linkTask: linkTask, unlink: unlink, renameScope: renameScope, restoreTaskDate: restoreTaskDate,
    updateSubcheck: updateSubcheck, insertionContext: insertionContext, insertionOptions: insertionOptions, createFolderAt: createFolderAt, importFlowTasks: importFlowTasks,
    selectionForMove: selectionForMove, moveTargets: moveTargets, moveSubtree: moveSubtree,
    recordProgress: recordProgress, progressHistory: progressHistory, latestProgress: latestProgress, parseProgressToken: parseProgressToken };
})();
