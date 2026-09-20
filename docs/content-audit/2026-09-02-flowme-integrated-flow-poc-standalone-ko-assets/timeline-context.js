/* Read-only PoC timeline contract. Does not migrate or write a workspace. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(() => require('./model.js'));
  else root.FlowPocTimelineContext = factory(() => root.FlowMeIntegratedPoc);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (loadModel) {
  'use strict';

  const VERSION = 1;
  const VIEWS = Object.freeze(['today', 'week', 'month', 'undated']);
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const record = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const validId = value => typeof value === 'string' && value.trim().length > 0;
  const fail = (reason, details) => Object.assign({ contractVersion: VERSION, ok: false, reason, groups: [] }, details);

  function monthLength(year, month) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }

  function isPlainDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    return year >= 1 && year <= 9999 && month >= 1 && month <= 12 && day >= 1 && day <= monthLength(year, month);
  }

  function utcDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    // Date.UTC maps years 0..99 to 1900..1999; the plain-date contract does not.
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }

  function plainDate(date) {
    const year = date.getUTCFullYear();
    if (!Number.isInteger(year) || year < 1 || year > 9999) return null;
    return [String(year).padStart(4, '0'), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
  }

  function addPlainDays(value, amount) {
    if (!isPlainDate(value) || !Number.isSafeInteger(amount)) return null;
    const date = utcDate(value);
    date.setUTCDate(date.getUTCDate() + amount);
    return plainDate(date);
  }

  function rangeFor(view, today) {
    if (view === 'undated') return { start: null, end: null, dates: [] };
    let start = today;
    let length = 1;
    if (view === 'week') {
      const weekday = utcDate(today).getUTCDay();
      start = addPlainDays(today, -(weekday === 0 ? 6 : weekday - 1));
      length = 7;
    } else if (view === 'month') {
      const [year, month] = today.split('-').map(Number);
      start = today.slice(0, 8) + '01';
      length = monthLength(year, month);
    }
    if (!start) return null;
    const dates = Array.from({ length }, (_, index) => addPlainDays(start, index));
    if (dates.some(date => date === null)) return null;
    return { start, end: dates[dates.length - 1], dates };
  }

  function normalizeTasks(tasks) {
    if (!Array.isArray(tasks)) return fail('invalid-tasks');
    const ids = new Set();
    const normalized = [];
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      if (!record(task) || !validId(task.id)) return fail('invalid-task-id', { taskIndex: index });
      if (ids.has(task.id)) return fail('duplicate-task-id', { taskIndex: index });
      if (task.date !== null && !isPlainDate(task.date)) return fail('invalid-task-date', { taskIndex: index });
      if (typeof task.done !== 'boolean') return fail('invalid-task-completion', { taskIndex: index });
      if (task.time !== undefined && task.time !== null && task.time !== '' && (typeof task.time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(task.time))) return fail('invalid-task-time', { taskIndex: index });
      if (task.sourceOrder !== undefined && (!Number.isSafeInteger(task.sourceOrder) || task.sourceOrder < 0)) return fail('invalid-source-order', { taskIndex: index });
      if (task.excluded !== undefined && typeof task.excluded !== 'boolean') return fail('invalid-task-exclusion', { taskIndex: index });
      ids.add(task.id);
      normalized.push({ id: task.id, date: task.date, done: task.done, time: task.time || '', sourceOrder: task.sourceOrder === undefined ? index : task.sourceOrder, excluded: task.excluded === true, inputOrder: index });
    }
    return { ok: true, tasks: normalized };
  }

  function normalizeOrders(orders) {
    if (orders === undefined) return { ok: true, orders: new Map() };
    if (!Array.isArray(orders)) return fail('invalid-timeline-orders');
    const indexed = new Map();
    for (const order of orders) {
      if (!record(order) || !['date', 'undated', 'overdue'].includes(order.context)
        || (order.context === 'undated' ? order.contextKey !== 'undated' : !isPlainDate(order.contextKey))
        || !Array.isArray(order.orderedRefKeys) || order.orderedRefKeys.some(id => !validId(id))
        || new Set(order.orderedRefKeys).size !== order.orderedRefKeys.length) return fail('invalid-timeline-order');
      const key = order.context + ':' + order.contextKey;
      if (indexed.has(key)) return fail('duplicate-timeline-context');
      indexed.set(key, order.orderedRefKeys.slice());
    }
    return { ok: true, orders: indexed };
  }

  function defaultIds(tasks) {
    // Preserve standalone's time-first fallback for undated/aggregate lists too.
    // Equal source positions keep input order; titles never define identity/order.
    return tasks.slice().sort((left, right) => {
      if (left.time && !right.time) return -1;
      if (!left.time && right.time) return 1;
      if (left.time !== right.time) return left.time < right.time ? -1 : 1;
      return left.sourceOrder - right.sourceOrder || left.inputOrder - right.inputOrder;
    }).map(task => task.id);
  }

  function projectOrder(defaults, order) {
    const allowed = new Set(defaults);
    const visible = order.filter(id => allowed.has(id));
    const selected = new Set(visible);
    return visible.concat(defaults.filter(id => !selected.has(id)));
  }

  function labelFor(context, date, today) {
    if (context === 'undated') return '날짜 미정';
    if (context === 'overdue') return '지난 미완료';
    if (date === today) return '오늘';
    const [, month, day] = date.split('-').map(Number);
    return month + '월 ' + day + '일 ' + ['일', '월', '화', '수', '목', '금', '토'][utcDate(date).getUTCDay()] + '요일';
  }

  /* `id` is the caller's collision-free normalized ref key, not a title.
     Order records use { context, contextKey, orderedRefKeys }; stale refs are
     removed from the projection only. This function does not validate a write. */
  function selectTimelineGroups(input) {
    if (!record(input)) return fail('invalid-input');
    if (input.contractVersion !== undefined && input.contractVersion !== VERSION) return fail('unsupported-contract-version');
    if (!isPlainDate(input.localToday)) return fail('invalid-local-today');
    if (!VIEWS.includes(input.view)) return fail('invalid-view');
    const normalized = normalizeTasks(input.tasks);
    if (!normalized.ok) return normalized;
    const orders = normalizeOrders(input.timelineOrders);
    if (!orders.ok) return orders;
    const range = rangeFor(input.view, input.localToday);
    if (!range) return fail('date-range-overflow');
    const grouped = new Map();
    normalized.tasks.forEach(task => {
      if (task.excluded) return;
      let key;
      if (input.view === 'undated') {
        if (task.date === null) key = 'undated:undated';
      } else if (input.view === 'today') {
        if (task.date === input.localToday) key = 'date:' + task.date;
        else if (task.date !== null && task.date < input.localToday && !task.done) key = 'overdue:' + input.localToday;
      } else if (task.date !== null && task.date >= range.start && task.date <= range.end) key = 'date:' + task.date;
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(task);
    });
    const keys = Array.from(grouped.keys()).sort((left, right) => {
      if (left.startsWith('overdue:') !== right.startsWith('overdue:')) return left.startsWith('overdue:') ? -1 : 1;
      return left < right ? -1 : left > right ? 1 : 0;
    });
    const groups = keys.map(key => {
      const [context, contextKey] = key.split(':');
      const defaults = defaultIds(grouped.get(key));
      const order = orders.orders.get(key);
      return { context, contextKey, label: labelFor(context, contextKey, input.localToday), ids: order ? projectOrder(defaults, order) : defaults.slice(), defaultIds: defaults, manualOrder: Boolean(order), orderMode: order ? 'manual' : 'default-time', blocked: false };
    });
    return { contractVersion: VERSION, ok: true, localToday: input.localToday, view: input.view, range, groups };
  }

  function knownLegacyContext(state, context) {
    if (VIEWS.includes(context)) return true;
    const parts = context.split(':');
    if (parts.length === 2 && parts[0] === 'folder') return parts[1] === 'unfiled' || state.folders.some(folder => folder.id === parts[1]);
    if ((parts.length === 2 || parts.length === 3) && parts[0] === 'flow') {
      const flow = state.flows.find(entry => entry.id === parts[1]);
      return Boolean(flow && (parts.length === 2 || flow.steps.some(step => step.id === parts[2])));
    }
    return false;
  }

  function legacyContains(view, date, anchor, weekEnd) {
    if (view === 'undated') return date === null;
    if (date === null) return false;
    if (view === 'today') return date === anchor;
    if (view === 'week') return date >= anchor && date <= weekEnd;
    return date.slice(0, 7) === anchor.slice(0, 7);
  }

  function sameOrder(left, right) {
    return left.length === right.length && left.every((id, index) => id === right[index]);
  }

  function projectLegacyTimeline(input, injectedModel) {
    if (!record(input)) return fail('invalid-input');
    if (input.contractVersion !== undefined && input.contractVersion !== VERSION) return fail('unsupported-contract-version');
    // Canonical-vs-legacy precedence belongs to the later checkpoint contract.
    if (input.timelineOrders !== undefined && (!Array.isArray(input.timelineOrders) || input.timelineOrders.length)) return fail('legacy-canonical-precedence-unresolved');
    let model;
    let errors;
    try {
      model = injectedModel || loadModel();
      if (!model || model.VERSION !== 1 || !isPlainDate(model.TODAY) || typeof model.validate !== 'function' || typeof model.viewTaskIds !== 'function' || typeof model.isTrashedTask !== 'function') return fail('legacy-decoder-unavailable');
      if (!record(input.state) || input.state.version !== 1 || !record(input.state.orders)) return fail('invalid-legacy-state');
      errors = model.validate(input.state);
      if (!Array.isArray(errors) || errors.length) return fail('invalid-legacy-state', { validationErrors: Array.isArray(errors) ? errors.slice() : ['invalid-validator-result'] });
      if (Object.keys(input.state.orders).some(context => !knownLegacyContext(input.state, context))) return fail('unknown-legacy-context');
    } catch (error) {
      return fail('legacy-validation-failed');
    }
    const anchor = model.TODAY;
    const weekEnd = addPlainDays(anchor, 6);
    if (!weekEnd || (input.legacyAnchor !== undefined && input.legacyAnchor !== anchor)) return fail('invalid-legacy-anchor');
    let legacyTasks;
    try {
      legacyTasks = input.state.tasks.map((task, index) => ({ id: task.id, date: task.date, time: task.time, done: task.done, sourceOrder: index, excluded: model.isTrashedTask(input.state, task) }));
      // Reconfirm the old decoder's fixed-anchor sets, never new Monday-Sunday sets.
      const active = legacyTasks.filter(task => !task.excluded);
      for (const view of VIEWS) {
        const expected = active.filter(task => legacyContains(view, task.date, anchor, weekEnd)).map(task => task.id);
        const decoded = model.viewTaskIds(Object.assign({}, input.state, { orders: {} }), view);
        if (!Array.isArray(decoded) || decoded.length !== expected.length || new Set(decoded).size !== decoded.length || decoded.some(id => !expected.includes(id))) return fail('legacy-membership-mismatch');
      }
    } catch (error) {
      return fail('legacy-validation-failed');
    }
    const result = selectTimelineGroups({ tasks: input.tasks === undefined ? legacyTasks : input.tasks, localToday: input.localToday, view: input.view });
    if (!result.ok) return result;
    const legacyById = new Map(legacyTasks.map(task => [task.id, task]));
    const groups = result.groups.map(group => {
      if (group.context === 'overdue') return Object.assign({}, group, { legacyCandidates: [] });
      const date = group.context === 'undated' ? null : group.contextKey;
      const allowed = new Set(group.defaultIds);
      const candidates = VIEWS.filter(view => own(input.state.orders, view) && legacyContains(view, date, anchor, weekEnd)).map(view => {
        const ids = input.state.orders[view].filter(id => {
          const task = legacyById.get(id);
          return allowed.has(id) && task && !task.excluded && task.date === date;
        });
        return { view, ids, complete: ids.length === group.defaultIds.length && group.defaultIds.every(id => ids.includes(id)) };
      });
      if (!candidates.length) return Object.assign({}, group, { legacyCandidates: [] });
      const complete = candidates.filter(candidate => candidate.complete);
      const conflict = complete.length > 1 && complete.some(candidate => !sameOrder(candidate.ids, complete[0].ids));
      // Deliberately do not merge partial precedence constraints or infer priority.
      const unresolved = candidates.some(candidate => !candidate.complete);
      const mode = conflict ? 'legacy-conflict' : unresolved ? 'legacy-unresolved' : 'legacy-unambiguous';
      return Object.assign({}, group, {
        ids: conflict || unresolved ? group.defaultIds.slice() : complete[0].ids.slice(),
        manualOrder: !conflict && !unresolved,
        orderMode: mode,
        blocked: conflict || unresolved,
        legacyCandidates: candidates,
        compatibilityMessage: conflict ? '기존 정렬이 서로 달라 시간순으로 표시해요. 이 날짜의 순서 변경은 잠겨 있어요.' : unresolved ? '기존 정렬을 확정할 수 없어 시간순으로 표시해요. 이 목록의 순서 변경은 잠겨 있어요.' : '기존 정렬을 유지하고 있어요.'
      });
    });
    return Object.assign({}, result, { legacy: { version: 1, anchor, rollingWeekEnd: weekEnd }, groups });
  }

  return Object.freeze({ VERSION, isPlainDate, addPlainDays, selectTimelineGroups, projectLegacyTimeline });
});
