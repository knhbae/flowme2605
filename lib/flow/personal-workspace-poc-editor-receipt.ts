import type { PersonalWorkspacePocFlow } from './personal-workspace-poc-contract';
import { getPersonalWorkspacePocInheritedMemo } from './personal-workspace-poc-plan-memo-baseline';
import { resolvePersonalWorkspacePocPlanTextIntent } from './personal-workspace-poc-plan-text-intent';
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

function boundedDisplayText(value: string, limit = 160): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit - 1).replace(/[\uD800-\uDBFF]$/u, '')}…`;
}

function receiptLabel(value: string): string {
  const safe = value.replace(/[\r\n\u0000-\u001f\u007f]/gu, ' ').trim();
  const split = safe.lastIndexOf(' · ');
  const suffix = split >= 0 ? safe.slice(split) : '';
  return safe.length > 160 && suffix && suffix.length < 160
    ? `${boundedDisplayText(safe.slice(0, split), 160 - suffix.length)}${suffix}`
    : boundedDisplayText(safe);
}

/**
 * Display-only use of the planner's shared value normalizer. The public summary
 * has no trusted open guard and must not fabricate one to run the planner.
 * Keep the captured baseline intent intact: only the proposed draft normalizes.
 * Neither this projection nor its result proves current save permission.
 */
function normalizedTextDraft(
  value: PersonalWorkspacePocPlanTextDraft,
  inherited: string | undefined,
  baseline: PersonalWorkspacePocPlanTextDraft,
): PersonalWorkspacePocPlanTextDraft {
  const normalized = resolvePersonalWorkspacePocPlanTextIntent({
    draft: value, inherited, capturedOverride: textIntent(baseline),
  });
  return normalized === undefined ? { mode: 'inherit' } : { mode: 'override', value: normalized };
}

function textIntent(value: PersonalWorkspacePocPlanTextDraft): string | undefined {
  return value.mode === 'inherit' ? undefined : value.value;
}

function textValue(value: PersonalWorkspacePocPlanTextDraft, inherited = ''): string {
  const raw = value.mode === 'inherit' ? inherited : value.value;
  const display = raw ? String(compactReceiptValue(raw)) : '없음';
  return `${value.mode === 'inherit' ? '원본' : '내 계획'} · ${display}`;
}

function memoValue(value: PersonalWorkspacePocPlanTextDraft, inherited?: string): string {
  if (value.mode === 'override') return textValue(value);
  if (inherited === undefined) return '개인 메모 없음';
  const display = inherited ? String(compactReceiptValue(inherited)) : '없음';
  return `기존 개인 메모 · ${display}`;
}

function scheduleValue(
  value: PersonalWorkspacePocPlanScheduleDraft,
  inherited?: string,
): string {
  if (value.mode === 'inherit') return `원본 일정 · ${inherited ?? '날짜 미정'}`;
  if (value.mode === 'unscheduled') return '내 계획 · 날짜 미정';
  return `내 계획 · ${value.date}`;
}

function orderDisplayValues(input: Readonly<{
  sourceFlow: PersonalWorkspacePocFlow;
  baseline: PersonalWorkspacePocPlanDraft;
  draft: PersonalWorkspacePocPlanDraft;
}>): readonly [string, string] {
  const sourceByRef = new Map(input.sourceFlow.items.map((item) => [item.ref, item]));
  const display = (plan: PersonalWorkspacePocPlanDraft, normalize: boolean) => plan.orderedItemRefs.map((ref, index) => {
    const source = sourceByRef.get(ref);
    const captured = input.baseline.items[ref]?.title;
    const proposed = plan.items[ref]?.title;
    const intent = normalize && proposed && captured
      ? normalizedTextDraft(proposed, source?.title, captured) : proposed;
    const title = intent?.mode === 'override' ? intent.value : source?.title ?? '';
    const safeTitle = title.replace(/[\r\n\u0000-\u001f\u007f]/gu, ' ').trim() || '항목';
    return `${index + 1}. ${safeTitle}`;
  }).join(' → ');
  const before = display(input.baseline, false);
  const after = display(input.draft, true);
  // Full refs still decide identity/order below. Equal visible titles and long
  // lists use distinct bounded counts, never identifiers as display fallbacks.
  return before === after || before.length > 160 || after.length > 160
    ? [`기존 순서 · ${input.baseline.orderedItemRefs.length}개`, `변경된 순서 · ${input.draft.orderedItemRefs.length}개`]
    : [before, after];
}

function appendChange(
  changes: PersonalWorkspacePocReceiptChange[],
  input: Readonly<{
    field: string;
    label: string;
    before: string;
    after: string;
    changed: boolean;
  }>,
) {
  if (!input.changed) return;
  let before = compactReceiptValue(input.before);
  let after = compactReceiptValue(input.after);
  if (before === after) {
    // Exact semantic comparison has already established a real change. Keep
    // compressed values distinguishable without exposing the long memo/order.
    before = `변경 전 · ${boundedDisplayText(String(before), 150)}`;
    after = `변경 후 · ${boundedDisplayText(String(after), 150)}`;
  }
  changes.push({
    owner: 'poc-personal-plan',
    field: input.field,
    label: receiptLabel(input.label),
    before,
    after,
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
  const flowTitle = normalizedTextDraft(input.draft.title, input.sourceFlow.title, input.baseline.title);

  appendChange(changes, {
    field: 'flow.title',
    label: 'Flow 제목',
    before: textValue(input.baseline.title, input.sourceFlow.title),
    after: textValue(flowTitle, input.sourceFlow.title),
    changed: textIntent(input.baseline.title) !== textIntent(flowTitle),
  });
  if (changes.length > 0) affectedRefs.add(input.sourceFlow.ref);

  for (const section of input.sourceFlow.sections ?? []) {
    if (section.editCapability !== 'poc-shadow') continue;
    const before = input.baseline.sectionTitles?.[section.sectionId];
    const after = input.draft.sectionTitles?.[section.sectionId];
    if (!before || !after) continue;
    const normalizedAfter = normalizedTextDraft(after, section.title, before);
    const beforeLength = changes.length;
    appendChange(changes, {
      field: `section.${section.sectionId}.title`,
      label: `${section.title} · 구간 제목`,
      before: textValue(before, section.title),
      after: textValue(normalizedAfter, section.title),
      changed: textIntent(before) !== textIntent(normalizedAfter),
    });
    if (changes.length > beforeLength) affectedRefs.add(input.sourceFlow.ref);
  }

  const [beforeOrder, afterOrder] = orderDisplayValues(input);
  const orderChangeStart = changes.length;
  appendChange(changes, {
    field: 'flow.item-order',
    label: 'Item 순서',
    before: beforeOrder,
    after: afterOrder,
    changed: input.baseline.orderedItemRefs.length !== input.draft.orderedItemRefs.length
      || input.baseline.orderedItemRefs.some((ref, index) => ref !== input.draft.orderedItemRefs[index]),
  });
  if (changes.length > orderChangeStart) affectedRefs.add(input.sourceFlow.ref);

  for (const itemRef of input.draft.orderedItemRefs) {
    const source = sourceByRef.get(itemRef);
    const before = input.baseline.items[itemRef];
    const after = input.draft.items[itemRef];
    if (!source || !before || !after) continue;
    const title = normalizedTextDraft(after.title, source.title, before.title);
    const inheritedMemo = getPersonalWorkspacePocInheritedMemo(source);
    const memo = normalizedTextDraft(after.memo, inheritedMemo, before.memo);
    const beforeLength = changes.length;
    appendChange(changes, {
      field: `item.${source.itemId}.title`,
      label: `${source.title} · 제목`,
      before: textValue(before.title, source.title),
      after: textValue(title, source.title),
      changed: textIntent(before.title) !== textIntent(title),
    });
    appendChange(changes, {
      field: `item.${source.itemId}.memo`,
      label: `${source.title} · 메모`,
      before: memoValue(before.memo, inheritedMemo),
      after: memoValue(memo, inheritedMemo),
      changed: textIntent(before.memo) !== textIntent(memo),
    });
    appendChange(changes, {
      field: `item.${source.itemId}.schedule`,
      label: `${source.title} · 계획 날짜`,
      before: scheduleValue(before.schedule, source.sourceDate),
      after: scheduleValue(after.schedule, source.sourceDate),
      changed: before.schedule.mode !== after.schedule.mode
        || (before.schedule.mode === 'fixed_date' && after.schedule.mode === 'fixed_date'
          && before.schedule.date !== after.schedule.date),
    });
    if (changes.length > beforeLength) affectedRefs.add(itemRef);
  }

  return { changes, affectedRefs: [...affectedRefs] };
}
