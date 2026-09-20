/* Isolated v4.1 prototype model. This is not the product storage contract. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlowMeV41 = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const TODAY = '2026-09-01';
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const clone = value => JSON.parse(JSON.stringify(value));
  const isId = value => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);
  const isTitle = value => typeof value === 'string' && value.trim().length > 0;
  const isTime = value => value === '' || (typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value));

  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1 || month < 1 || month > 12) return false;
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    return day >= 1 && day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }

  function seed() {
    return {
      folders: [
        { id: 'move', title: '이사 준비', parentId: null },
        { id: 'admin', title: '행정', parentId: 'move' },
        { id: 'life', title: '일상', parentId: null },
        { id: 'work', title: '업무', parentId: null }
      ],
      flows: [
        { id: 'moving', ref: 'saved-flow:copy-map-moving:flow-moving', savedCopyId: 'copy-map-moving', sourceFlowId: 'flow-moving', sourceFolderId: null, origin: 'source-backed-map', originLabel: 'Flow Map 저장본', title: '이사 준비 저장본', folderId: null, steps: [{ id: 'select', title: '업체 선정', itemIds: ['quote', 'contract'] }] },
        { id: 'memo', ref: 'saved-flow:copy-draft-memo:flow-memo', savedCopyId: 'copy-draft-memo', sourceFlowId: 'flow-memo', sourceFolderId: null, origin: 'personal-draft', originLabel: '개인 초안', title: '메모에서 만든 개인 Flow', folderId: null, steps: [{ id: 'outline', title: '메모를 실행 순서로 확인', itemIds: ['memo-outline', 'memo-share'] }] },
        { id: 'washer', ref: 'saved-flow:copy-canonical-washer:flow-washer', savedCopyId: 'copy-canonical-washer', sourceFlowId: 'flow-washer', sourceFolderId: null, origin: 'canonical-personal-copy', originLabel: '개인 사본', title: '우리집 세탁기 관리', folderId: null, steps: [{ id: 'care', title: '정기 관리', itemIds: ['washer-filter', 'washer-tub'] }] },
        { id: 'address', ref: 'saved-flow:copy-legacy-check:flow-check', savedCopyId: 'copy-legacy-check', sourceFlowId: 'flow-check', sourceFolderId: null, origin: 'legacy-saved-plan', originLabel: '기존 저장본', title: '입주 사전점검', folderId: null, steps: [{ id: 'prepare', title: '현장 확인', itemIds: ['addressdoc', 'photo-check'] }] }
      ],
      tasks: [
        { id: 'call', title: '관리실에 전화', flowId: null, folderId: 'move', date: null, memo: '엘리베이터 예약 시간 물어보기', done: false, time: '' },
        { id: 'lunch', title: '12시 점심 약속', flowId: null, folderId: 'life', date: TODAY, memo: '', done: false, time: '12:00' },
        { id: 'meeting', title: '11시 회의 참석', flowId: null, folderId: 'work', date: TODAY, memo: '', done: false, time: '11:00' },
        { id: 'quote', ref: 'flow-item:copy-map-moving:flow-moving:item-quote', sourceItemId: 'item-quote', sourceDate: null, title: '견적 3곳 비교', flowId: 'moving', folderId: null, date: null, memo: '', done: false, time: '' },
        { id: 'contract', ref: 'flow-item:copy-map-moving:flow-moving:item-contract', sourceItemId: 'item-contract', sourceDate: '2026-09-02', title: '계약 내용 확인', flowId: 'moving', folderId: null, date: '2026-09-02', memo: '', done: false, time: '' },
        { id: 'memo-outline', ref: 'flow-item:copy-draft-memo:flow-memo:item-outline', sourceItemId: 'item-outline', sourceDate: null, title: '메모 핵심 순서 확인', flowId: 'memo', folderId: null, date: null, memo: '원본 메모는 바꾸지 않고 개인 실행 위치만 조정합니다.', done: false, time: '' },
        { id: 'memo-share', ref: 'flow-item:copy-draft-memo:flow-memo:item-share', sourceItemId: 'item-share', sourceDate: TODAY, title: '다음 행동 한 줄 정리', flowId: 'memo', folderId: null, date: TODAY, memo: '', done: false, time: '' },
        { id: 'washer-filter', ref: 'flow-item:copy-canonical-washer:flow-washer:item-filter', sourceItemId: 'item-filter', sourceDate: TODAY, title: '배수 필터 확인', flowId: 'washer', folderId: null, date: TODAY, memo: '', done: false, time: '' },
        { id: 'washer-tub', ref: 'flow-item:copy-canonical-washer:flow-washer:item-tub', sourceItemId: 'item-tub', sourceDate: '2026-09-05', title: '통세척 예약', flowId: 'washer', folderId: null, date: '2026-09-05', memo: '', done: false, time: '' },
        { id: 'addressdoc', ref: 'flow-item:copy-legacy-check:flow-check:item-checklist', sourceItemId: 'item-checklist', sourceDate: TODAY, title: '점검표 준비', flowId: 'address', folderId: null, date: TODAY, memo: '', done: false, time: '' },
        { id: 'photo-check', ref: 'flow-item:copy-legacy-check:flow-check:item-photo', sourceItemId: 'item-photo', sourceDate: '2026-09-03', title: '하자 사진 촬영', flowId: 'address', folderId: null, date: '2026-09-03', memo: '', done: false, time: '' },
        { id: 'overdue', title: '박스 수량 세기', flowId: null, folderId: 'move', date: '2026-08-31', memo: '', done: false, time: '' }
      ],
      orders: {}
    };
  }

  function effectiveFolder(state, task) {
    if (!task || !state || !Array.isArray(state.flows)) return null;
    if (task.flowId === null) return task.folderId;
    const flow = state.flows.find(entry => entry.id === task.flowId);
    return flow ? flow.folderId : null;
  }

  function parseContext(state, context) {
    if (typeof context !== 'string') return null;
    if (context === 'undated' || context === 'overdue') return { type: context };
    const parts = context.split(':');
    if (parts.length === 2 && parts[0] === 'date' && isDate(parts[1])) return { type: 'date', date: parts[1] };
    if (parts.length === 2 && parts[0] === 'folder' && (parts[1] === 'unfiled' || state.folders.some(folder => folder.id === parts[1]))) {
      return { type: 'folder', id: parts[1] === 'unfiled' ? null : parts[1] };
    }
    if (parts.length === 3 && parts[0] === 'flow') {
      const flow = state.flows.find(entry => entry.id === parts[1]);
      const step = flow && flow.steps.find(entry => entry.id === parts[2]);
      if (step) return { type: 'flow', flow, step };
    }
    return null;
  }

  function baseTaskIds(state, parsed) {
    if (!parsed) return [];
    if (parsed.type === 'flow') return parsed.step.itemIds.slice();
    return state.tasks.filter(task => {
      if (parsed.type === 'date') return task.date === parsed.date;
      if (parsed.type === 'folder') return task.flowId === null && task.folderId === parsed.id;
      if (parsed.type === 'undated') return task.date === null;
      return task.date !== null && task.date < TODAY && !task.done;
    }).map(task => task.id);
  }

  function projectOrder(ids, order) {
    if (!Array.isArray(order)) return ids.slice();
    const allowed = new Set(ids);
    const seen = new Set();
    const result = [];
    order.concat(ids).forEach(id => {
      if (allowed.has(id) && !seen.has(id)) { result.push(id); seen.add(id); }
    });
    return result;
  }

  function defaultTaskIds(state, parsed) {
    const ids = baseTaskIds(state, parsed);
    if (!parsed || parsed.type !== 'date') return ids;
    const byId = new Map(state.tasks.map((task, index) => [task.id, { task, index }]));
    return ids.slice().sort((left, right) => {
      const a = byId.get(left), b = byId.get(right);
      if (a.task.time && !b.task.time) return -1;
      if (!a.task.time && b.task.time) return 1;
      return a.task.time.localeCompare(b.task.time) || a.index - b.index;
    });
  }

  function taskIds(state, context) {
    const ids = defaultTaskIds(state, parseContext(state, context));
    return projectOrder(ids, state.orders && state.orders[context]);
  }

  function validate(state) {
    const errors = [];
    if (!state || typeof state !== 'object' || !Array.isArray(state.folders) || !Array.isArray(state.flows) || !Array.isArray(state.tasks)) return ['Invalid state shape'];
    if (!state.orders || typeof state.orders !== 'object' || Array.isArray(state.orders)) return ['Invalid orders'];
    const checkIds = (entries, label) => {
      const ids = new Set();
      entries.forEach(entry => {
        if (!entry || !isId(entry.id)) errors.push('Invalid ' + label + ' id');
        else if (ids.has(entry.id)) errors.push('Duplicate ' + label + ' id: ' + entry.id);
        else ids.add(entry.id);
      });
      return ids;
    };
    const folderIds = checkIds(state.folders, 'folder');
    const flowIds = checkIds(state.flows, 'flow');
    const ids = checkIds(state.tasks, 'task');
    if (errors.length) return errors;
    if (folderIds.has('unfiled')) errors.push('Reserved folder id: unfiled');
    const folderOk = id => id === null || folderIds.has(id);
    state.folders.forEach(folder => {
      if (!isTitle(folder.title)) errors.push('Invalid folder title: ' + folder.id);
      if (!folderOk(folder.parentId)) errors.push('Unknown parent folder: ' + folder.id);
      const seen = new Set([folder.id]);
      let current = folder;
      while (current && current.parentId !== null) {
        if (seen.has(current.parentId)) { errors.push('Folder cycle: ' + folder.id); break; }
        seen.add(current.parentId);
        current = state.folders.find(entry => entry.id === current.parentId);
      }
    });
    const membership = new Map();
    state.flows.forEach(flow => {
      if (!isTitle(flow.title)) errors.push('Invalid Flow title: ' + flow.id);
      if (!folderOk(flow.folderId)) errors.push('Unknown Flow folder: ' + flow.id);
      if (!Array.isArray(flow.steps)) { errors.push('Invalid Flow steps: ' + flow.id); return; }
      checkIds(flow.steps, 'step');
      flow.steps.forEach(step => {
        if (!step || !isTitle(step.title) || !Array.isArray(step.itemIds)) { errors.push('Invalid step: ' + flow.id); return; }
        step.itemIds.forEach(id => {
          if (!ids.has(id)) errors.push('Unknown step Item: ' + id);
          if (membership.has(id)) errors.push('Repeated step Item: ' + id);
          membership.set(id, flow.id);
        });
      });
    });
    state.tasks.forEach(task => {
      if (!isTitle(task.title)) errors.push('Invalid task title: ' + task.id);
      if (task.date !== null && !isDate(task.date)) errors.push('Invalid task date: ' + task.id);
      if (!isTime(task.time)) errors.push('Invalid task time: ' + task.id);
      if (typeof task.memo !== 'string' || typeof task.done !== 'boolean') errors.push('Invalid task execution data: ' + task.id);
      if (task.flowId === null) {
        if (!folderOk(task.folderId)) errors.push('Unknown task folder: ' + task.id);
        if (membership.has(task.id)) errors.push('Standalone task in Flow: ' + task.id);
      } else {
        if (!flowIds.has(task.flowId)) errors.push('Unknown task Flow: ' + task.id);
        if (task.folderId !== null) errors.push('Flow Item has direct folder: ' + task.id);
        if (membership.get(task.id) !== task.flowId) errors.push('Flow Item membership mismatch: ' + task.id);
      }
    });
    // Only inspect projection contexts after the ownership graph is known to be valid.
    if (!errors.length) Object.keys(state.orders).forEach(context => {
      const parsed = parseContext(state, context);
      if (!parsed) { errors.push('Invalid order context: ' + context); return; }
      const base = baseTaskIds(state, parsed);
      const order = state.orders[context];
      if (!Array.isArray(order) || order.length !== base.length || new Set(order).size !== order.length || order.some(id => !base.includes(id))) {
        errors.push('Order is not a full permutation: ' + context);
      }
    });
    return errors;
  }

  function apply(state, action) {
    const reject = (error, message) => ({ state, changed: false, message, error });
    if (validate(state).length) return reject('invalid-state', '목록 상태를 확인해 주세요.');
    if (!action || typeof action !== 'object') return reject('invalid-action', '실행할 동작을 확인해 주세요.');
    const next = clone(state);
    const task = next.tasks.find(entry => entry.id === action.id);
    const folderOk = id => id === null || next.folders.some(folder => folder.id === id);
    let message;
    switch (action.type) {
      case 'move-folder': {
        if (!folderOk(action.folderId)) return reject('invalid-folder', '이동할 폴더를 찾을 수 없어요.');
        if (action.kind === 'task') {
          if (!task) return reject('unknown-task', '이동할 할 일을 찾을 수 없어요.');
          if (task.flowId !== null) return reject('flow-item-folder', 'Flow 안의 할 일은 따로 폴더로 옮길 수 없어요. Flow 전체를 옮겨 주세요.');
          task.folderId = action.folderId;
        } else if (action.kind === 'flow') {
          const flow = next.flows.find(entry => entry.id === action.id);
          if (!flow) return reject('unknown-flow', '이동할 Flow를 찾을 수 없어요.');
          flow.folderId = action.folderId;
        } else return reject('invalid-kind', '폴더에는 빠른 할 일이나 Flow를 옮길 수 있어요.');
        message = action.folderId === null ? '미분류로 옮겼어요.' : '폴더를 옮겼어요. 날짜와 기록은 유지돼요.';
        break;
      }
      case 'schedule':
        if (!task) return reject('unknown-task', '날짜는 할 일별로 지정해 주세요.');
        if (action.date !== null && !isDate(action.date)) return reject('invalid-date', '정확한 날짜를 선택해 주세요.');
        task.date = action.date;
        message = action.date === null ? '날짜를 해제했어요. 할 일은 그대로 남아 있어요.' : action.date + '에 할 일로 배치했어요.';
        break;
      case 'complete':
        if (!task) return reject('unknown-task', '할 일을 찾을 수 없어요.');
        if (typeof action.done !== 'boolean') return reject('invalid-completion', '완료 상태를 확인해 주세요.');
        task.done = action.done;
        message = action.done ? '완료했어요. 다른 화면에도 함께 반영돼요.' : '완료를 취소했어요.';
        break;
      case 'edit':
        if (!task) return reject('unknown-task', '수정할 할 일을 찾을 수 없어요.');
        if (own(action, 'title')) {
          if (!isTitle(action.title)) return reject('invalid-title', '할 일 이름을 입력해 주세요.');
          task.title = action.title.trim();
        }
        if (own(action, 'memo')) {
          if (typeof action.memo !== 'string') return reject('invalid-memo', '메모는 글로 입력해 주세요.');
          task.memo = action.memo;
        }
        if (own(action, 'time')) {
          if (!isTime(action.time)) return reject('invalid-time', '시간을 확인해 주세요.');
          task.time = action.time;
        }
        message = '수정 내용을 저장했어요.';
        break;
      case 'add-task': {
        if (!isTitle(action.title)) return reject('invalid-title', '할 일 이름을 입력해 주세요.');
        if (!folderOk(action.folderId)) return reject('invalid-folder', '할 일을 넣을 폴더를 확인해 주세요.');
        if (action.date !== null && !isDate(action.date)) return reject('invalid-date', '정확한 날짜를 선택해 주세요.');
        let number = 1;
        while (next.tasks.some(entry => entry.id === 'task-' + number)) number += 1;
        next.tasks.push({ id: 'task-' + number, title: action.title.trim(), flowId: null, folderId: action.folderId, date: action.date, memo: '', done: false, time: '' });
        message = '빠른 할 일을 추가했어요.';
        break;
      }
      case 'add-folder': {
        if (!isTitle(action.title)) return reject('invalid-title', '폴더 이름을 입력해 주세요.');
        if (!folderOk(action.parentId)) return reject('invalid-folder', '상위 폴더를 확인해 주세요.');
        let number = 1;
        while (next.folders.some(entry => entry.id === 'folder-' + number)) number += 1;
        next.folders.push({ id: 'folder-' + number, title: action.title.trim(), parentId: action.parentId });
        message = '폴더를 만들었어요.';
        break;
      }
      case 'reorder': {
        const parsed = parseContext(next, action.context);
        if (!parsed) return reject('invalid-context', '순서를 바꿀 목록을 확인해 주세요.');
        const ids = baseTaskIds(next, parsed);
        if (!Array.isArray(action.ids) || action.ids.length !== ids.length || new Set(action.ids).size !== ids.length || action.ids.some(id => !ids.includes(id))) {
          return reject('invalid-order', '같은 목록의 할 일끼리 순서를 바꿔 주세요.');
        }
        if (JSON.stringify(taskIds(next, action.context)) === JSON.stringify(action.ids)) return { state, changed: false, message: '이미 같은 순서예요.' };
        next.orders[action.context] = action.ids.slice();
        message = '이 목록의 순서를 바꿨어요. Flow 원본 순서는 유지돼요.';
        break;
      }
      case 'reset-order': {
        const parsed = parseContext(next, action.context);
        if (!parsed) return reject('invalid-context', '순서를 초기화할 목록을 확인해 주세요.');
        if (!own(next.orders, action.context)) return { state, changed: false, message: '이미 기본 순서예요.' };
        delete next.orders[action.context];
        message = parsed.type === 'date' ? '시간순으로 되돌렸어요.' : '기본 순서로 되돌렸어요.';
        break;
      }
      default:
        return reject('unsupported-action', '이 동작은 이번 시안에 포함되지 않았어요.');
    }
    Object.keys(next.orders).forEach(context => {
      next.orders[context] = projectOrder(baseTaskIds(next, parseContext(next, context)), next.orders[context]);
    });
    if (validate(next).length) return reject('invariant-failed', '변경을 적용하지 못했어요. 원래 상태를 유지했어요.');
    if (JSON.stringify(next) === JSON.stringify(state)) return { state, changed: false, message: '이미 같은 상태예요.' };
    return { state: next, changed: true, message };
  }

  return Object.freeze({ TODAY, seed, apply, taskIds, effectiveFolder, validate });
});
