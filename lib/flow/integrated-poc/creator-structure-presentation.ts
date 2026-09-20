import type { GroupInstance, StructureDraft, StructureTemplateDefinition, StructureTemplateDerivedValue, StructureTemplateFieldDefinition, StructureTemplateGroupDefinition, StructureTemplateValue } from '../personal-workspace-poc-structure-template/types';

/** Display-only catalog metadata. Never supplies a draft or materialization input. */
export function programCreatorStructureExample(definition: StructureTemplateDefinition) {
  const example = definition.previewFixture;
  if (example.previewOnly !== true || example.synthetic !== true
    || typeof example.title !== 'string' || typeof example.summary !== 'string'
    || !Array.isArray(example.fieldExamples) || !example.fieldExamples.length
    || !example.fieldExamples.every(row => Array.isArray(row) && row.length === 2 && row.every(value => typeof value === 'string'))
    || !Array.isArray(example.sourcePreview) || !example.sourcePreview.every(line => typeof line === 'string')) return null;
  return { title: example.title, summary: example.summary,
    fields: example.fieldExamples.map(row => ({ label: row[0] as string, value: row[1] as string })),
    source: example.sourcePreview.join('\n') };
}

const weekdays: Record<string, string> = { MO:'월', TU:'화', WE:'수', TH:'목', FR:'금', SA:'토', SU:'일' };
const kindLabels: Record<StructureTemplateDerivedValue['kind'], string> = {
  first_occurrence: '첫 일정', recurrence_end: '반복 종료일', recurrence_count: '총 반복 횟수', resolved_anchor_date: '기준일로 계산한 날짜',
};

function hasInput(value: StructureTemplateValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasInput);
  return true;
}

/** Presentation only: never clear an incompatible value or hide a validation target. */
export function programCreatorStructureFieldVisibility(field: StructureTemplateFieldDefinition, draft: StructureDraft,
  values: Readonly<Record<string, StructureTemplateValue>>, hasIssue = false) {
  let active = true;
  switch (field.requiredAt) {
    case 'when_end_mode_until': active = draft.values.end_mode === 'until'; break;
    case 'when_end_mode_count': active = draft.values.end_mode === 'count'; break;
    case 'when_anchor_offset': active = values.schedule_mode === 'anchor_offset'; break;
    case 'when_departure_offset': active = values.prep_schedule_mode === 'departure_offset'; break;
    case 'when_absolute': active = values.schedule_mode === 'absolute' || values.prep_schedule_mode === 'absolute'; break;
  }
  const retained = !active && hasInput(values[field.slotId]);
  return { visible: active || retained || hasIssue, retained };
}

/** Exact scope label for error navigation, including the ordinal of repeated groups. */
export function programCreatorStructureFieldLabels(definition: StructureTemplateDefinition, draft: StructureDraft) {
  const labels = new Map<string, string>();
  for (const field of definition.setupFields) labels.set(`root.${field.slotId}`, field.label);
  function walk(instances: readonly GroupInstance[], definitions: readonly StructureTemplateGroupDefinition[], parent: string) {
    for (const instance of instances) {
      const group = definitions.find(entry => entry.groupId === instance.groupId);
      if (!group) continue;
      const order = instances.filter(entry => entry.groupId === instance.groupId).indexOf(instance) + 1;
      const path = [parent, `${group.label} ${order}`].filter(Boolean).join(' › ');
      for (const field of group.fields) labels.set(`${instance.instanceId}.${field.slotId}`, `${path} · ${field.label}`);
      walk(instance.children, group.childGroups ?? [], path);
    }
  }
  walk(draft.groups, definition.groups, '');
  return labels;
}
function fieldValue(field: StructureTemplateFieldDefinition, value: StructureTemplateValue | undefined): string {
  if (value === undefined || value === null || value === '') return '미입력';
  const display = field.type === 'weekday_set' && Array.isArray(value)
    ? value.map(day => weekdays[String(day)] ?? String(day)).join('·')
    : Array.isArray(value) ? value.join(', ') : typeof value === 'object' ? '입력 확인 필요' : String(value);
  return `${display}${field.unit ? ` ${field.unit}` : ''}`;
}

/** Explain the planner's actual values using the exact user's scoped inputs; do not recalculate. */
export function programCreatorStructureCalculations(definition: StructureTemplateDefinition, draft: StructureDraft, values: readonly StructureTemplateDerivedValue[]) {
  const inputs = new Map<string, string>();
  for (const field of definition.setupFields) inputs.set(field.slotId, `${field.label}: ${fieldValue(field, draft.values[field.slotId])}`);
  function walk(instances: readonly GroupInstance[], definitions: readonly StructureTemplateGroupDefinition[], parent: string) {
    for (const instance of instances) {
      const group = definitions.find(entry => entry.groupId === instance.groupId);
      if (!group) continue;
      const order = instances.filter(entry => entry.groupId === instance.groupId).findIndex(entry => entry.instanceId === instance.instanceId) + 1;
      const path = [parent, `${group.label} ${order}`].filter(Boolean).join(' › ');
      for (const field of group.fields) inputs.set(`${instance.instanceId}.${field.slotId}`, `${path} · ${field.label}: ${fieldValue(field, instance.values[field.slotId])}`);
      walk(instance.children, group.childGroups ?? [], path);
    }
  }
  walk(draft.groups, definition.groups, '');
  return values.map(value => ({ label: kindLabels[value.kind], value: `${value.value}${value.kind === 'recurrence_count' ? '회' : ''}`,
    sources: value.sourceSlotKeys.map(key => inputs.get(key) ?? '계산에 사용한 입력을 확인할 수 없습니다.') }));
}
