/* Presentation and local mode changes only. No context, candidate, or writer authority. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FlowPocPersonalPlanEditorControls = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  function fields(value, names) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value)
      && Reflect.ownKeys(value).length === names.length && names.every(name => {
        const descriptor = Object.getOwnPropertyDescriptor(value, name);
        return descriptor && own(descriptor, 'value') && descriptor.enumerable;
      }));
  }
  function textDraft(value) {
    if (fields(value, ['mode']) && value.mode === 'inherit') return;
    if (fields(value, ['mode', 'value']) && value.mode === 'override' && typeof value.value === 'string') return;
    throw new Error('invalid-text-mode');
  }
  function scheduleDraft(value) {
    if (fields(value, ['mode']) && ['inherit', 'unscheduled'].includes(value.mode)) return;
    if (fields(value, ['mode', 'date']) && value.mode === 'fixed_date' && typeof value.date === 'string') return;
    throw new Error('invalid-schedule-mode');
  }
  function dateValid(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function changeTextMode(draft, mode, inheritedValue) {
    textDraft(draft);
    if (!['inherit', 'override'].includes(mode) || typeof inheritedValue !== 'string') throw new Error('invalid-text-mode-change');
    return mode === 'inherit' ? { mode: 'inherit' } : { mode: 'override', value: draft.mode === 'override' ? draft.value : inheritedValue };
  }
  function changeScheduleMode(draft, mode) {
    scheduleDraft(draft);
    if (!['inherit', 'fixed_date', 'unscheduled'].includes(mode)) throw new Error('invalid-schedule-mode-change');
    return mode === 'fixed_date' ? { mode, date: draft.mode === 'fixed_date' ? draft.date : '' } : { mode };
  }
  const option = (value, label, selected) => '<option value="' + value + '"' + (selected === value ? ' selected' : '') + '>' + label + '</option>';

  function renderTextControl({ scope, field, draft, baseline }) {
    textDraft(draft);
    if (!(scope === 'plan' && field === 'flow-title' || scope === 'item' && ['title', 'memo'].includes(field))) throw new Error('invalid-text-field');
    if (!baseline || !['source', 'existing-personal-baseline'].includes(baseline.owner)
      || typeof baseline.present !== 'boolean' || baseline.present && typeof baseline.value !== 'string'
      || field !== 'memo' && !baseline.present || field === 'memo' && baseline.owner !== 'existing-personal-baseline') throw new Error('invalid-text-baseline');
    const memo = field === 'memo';
    const label = memo ? '내 메모' : scope === 'plan' ? '내 Flow 제목' : '내 할 일 제목';
    const id = scope + '-' + field;
    const inheritLabel = memo ? baseline.present ? '기존 개인 메모 유지' : '개인 메모 없음'
      : baseline.owner === 'source' ? '원본 따르기' : '기존 제목 유지';
    const invalid = !memo && draft.mode === 'override' && !draft.value.trim();
    const attrs = ' id="' + id + '-value" data-' + scope + '-field="' + field + '" aria-label="' + label + ' 직접 입력"'
      + (invalid ? ' aria-invalid="true" aria-describedby="' + id + '-error"' : '');
    const value = draft.mode === 'override'
      ? memo ? '<textarea' + attrs + ' rows="4" maxlength="2000">' + (/^[\r\n]/.test(draft.value) ? '\n' : '') + esc(draft.value) + '</textarea>'
        : '<input' + attrs + ' value="' + esc(draft.value) + '" maxlength="80" required>'
      : '<p class="personal-control-baseline">' + (memo ? baseline.present
        ? '기존 개인 메모: ' + (baseline.value === '' ? '(빈 메모)' : esc(baseline.value)) : '개인 메모 없음'
        : (baseline.owner === 'source' ? '현재 원본 값: ' : '기존 제목: ') + esc(baseline.value)) + '</p>';
    return '<div class="field personal-plan-control" data-editor-personal-field="' + id + '">'
      + '<label for="' + id + '-mode">' + label + '</label>'
      + '<select id="' + id + '-mode" data-' + scope + '-mode="' + field + '">'
      + option('inherit', inheritLabel, draft.mode) + option('override', '직접 입력', draft.mode) + '</select>'
      + value + (invalid ? '<p class="field-error" id="' + id + '-error">제목을 입력해 주세요.</p>' : '') + '</div>';
  }

  function renderScheduleControl({ draft, baseline }) {
    scheduleDraft(draft);
    if (!baseline || !['source', 'existing-personal-baseline'].includes(baseline.owner)
      || !(baseline.date === null || dateValid(baseline.date))) throw new Error('invalid-schedule-baseline');
    const invalid = draft.mode === 'fixed_date' && !dateValid(draft.date);
    const inheritLabel = baseline.owner === 'source' ? '원본 따르기' : '기존 계획 유지';
    let value;
    if (draft.mode === 'fixed_date') value = '<input id="item-schedule-value" type="date" data-item-field="date" value="' + esc(draft.date)
      + '" required aria-label="개인 계획 날짜"' + (invalid ? ' aria-invalid="true" aria-describedby="item-schedule-error"' : '') + '>'
      + (invalid ? '<p class="field-error" id="item-schedule-error">날짜를 선택해 주세요.</p>' : '');
    else value = '<p class="personal-control-baseline">' + (draft.mode === 'unscheduled' ? '개인 계획에서 날짜를 정하지 않습니다.'
      : (baseline.owner === 'source' ? '현재 원본 일정: ' : '기존 계획 날짜: ') + (baseline.date === null ? '날짜 없음' : esc(baseline.date))) + '</p>';
    return '<div class="field personal-plan-control" data-editor-personal-field="item-schedule">'
      + '<label for="item-schedule-mode">계획 날짜</label><select id="item-schedule-mode" data-item-mode="schedule">'
      + option('inherit', inheritLabel, draft.mode) + option('fixed_date', '날짜 지정', draft.mode) + option('unscheduled', '미정', draft.mode)
      + '</select>' + value + '</div>';
  }
  return Object.freeze({ VERSION: 1, renderTextControl, renderScheduleControl, changeTextMode, changeScheduleMode });
});
