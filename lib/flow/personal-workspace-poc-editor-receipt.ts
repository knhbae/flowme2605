import type { PersonalWorkspacePocFlow } from './personal-workspace-poc-contract';
import type {
  PersonalWorkspacePocPlanDraft,
  PersonalWorkspacePocPlanScheduleDraft,
  PersonalWorkspacePocPlanTextDraft,
} from './personal-workspace-poc-plan-editor';
import type {
  PersonalWorkspacePocReceiptChange,
  PersonalWorkspacePocReceiptValue,
} from './personal-workspace-poc-receipt';

export type PersonalWorkspacePocPlanChangeSummary = Readonly<{
  changes: readonly PersonalWorkspacePocReceiptChange[];
  affectedRefs: readonly string[];
}>;

function compactReceiptValue(value: string): PersonalWorkspacePocReceiptValue {
  if (value.length <= 160 && !/[\r\n\u0000-\u001f\u007f]/u.test(value)) return value;
  return value ? `${value.length}자` : '없음';
}

function textValue(value: PersonalWorkspacePocPlanTextDraft, inherited = ''): string {
  const raw = value.mode === 'inherit' ? inherited : value.value;
  const display = raw ? String(compactReceiptValue(raw)) : '없음';
  return `${value.mode === 'inherit' ? '원본' : '내 계획'} · ${display}`;
}

function scheduleValue(
  value: PersonalWorkspacePocPlanScheduleDraft,
  inherited?: string,
): string {
  if (value.mode === 'inherit') return `원본 일정 · ${inherited ?? '날짜 미정'}`;
  if (value.mode === 'unscheduled') return '내 계획 · 날짜 미정';
  return `내 계획 · ${value.date}`;
}

function appendChange(
  changes: PersonalWorkspacePocReceiptChange[],
  input: Readonly<{
    field: string;
    label: string;
    before: string;
    after: string;
  }>,
) {
  if (input.before === input.after) return;
  changes.push({
    owner: 'poc-personal-plan',
    field: input.field,
    label: input.label,
    before: compactReceiptValue(input.before),
    after: compactReceiptValue(input.after),
  });
}

/**
 * Produces bounded, user-displayable values for a Plan receipt. It never copies
 * authoring rawText and uses stable Item identities in field keys.
 */
export function summarizePersonalWorkspacePocPlanDraftChanges(input: Readonly<{
  sourceFlow: PersonalWorkspacePocFlow;
  baseline: PersonalWorkspacePocPlanDraft;
  draft: PersonalWorkspacePocPlanDraft;
}>): PersonalWorkspacePocPlanChangeSummary {
  const changes: PersonalWorkspacePocReceiptChange[] = [];
  const affectedRefs = new Set<string>();
  const sourceByRef = new Map(input.sourceFlow.items.map((item) => [item.ref, item]));

  appendChange(changes, {
    field: 'flow.title',
    label: 'Flow 제목',
    before: textValue(input.baseline.title, input.sourceFlow.title),
    after: textValue(input.draft.title, input.sourceFlow.title),
  });
  if (changes.length > 0) affectedRefs.add(input.sourceFlow.ref);

  for (const section of input.sourceFlow.sections ?? []) {
    if (section.editCapability !== 'poc-shadow') continue;
    const before = input.baseline.sectionTitles?.[section.sectionId];
    const after = input.draft.sectionTitles?.[section.sectionId];
    if (!before || !after) continue;
    const beforeLength = changes.length;
    appendChange(changes, {
      field: `section.${section.sectionId}.title`,
      label: `${section.title} · 구간 제목`,
      before: textValue(before, section.title),
      after: textValue(after, section.title),
    });
    if (changes.length > beforeLength) affectedRefs.add(input.sourceFlow.ref);
  }

  const beforeOrder = input.baseline.orderedItemRefs.join(' → ');
  const afterOrder = input.draft.orderedItemRefs.join(' → ');
  const orderChangeStart = changes.length;
  appendChange(changes, {
    field: 'flow.item-order',
    label: 'Item 순서',
    before: beforeOrder,
    after: afterOrder,
  });
  if (changes.length > orderChangeStart) affectedRefs.add(input.sourceFlow.ref);

  for (const itemRef of input.draft.orderedItemRefs) {
    const source = sourceByRef.get(itemRef);
    const before = input.baseline.items[itemRef];
    const after = input.draft.items[itemRef];
    if (!source || !before || !after) continue;
    const beforeLength = changes.length;
    appendChange(changes, {
      field: `item.${source.itemId}.title`,
      label: `${source.title} · 제목`,
      before: textValue(before.title, source.title),
      after: textValue(after.title, source.title),
    });
    appendChange(changes, {
      field: `item.${source.itemId}.memo`,
      label: `${source.title} · 메모`,
      before: textValue(before.memo, source.description ?? ''),
      after: textValue(after.memo, source.description ?? ''),
    });
    appendChange(changes, {
      field: `item.${source.itemId}.schedule`,
      label: `${source.title} · 계획 날짜`,
      before: scheduleValue(before.schedule, source.sourceDate),
      after: scheduleValue(after.schedule, source.sourceDate),
    });
    if (changes.length > beforeLength) affectedRefs.add(itemRef);
  }

  return { changes, affectedRefs: [...affectedRefs] };
}
