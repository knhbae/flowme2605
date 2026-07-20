import type { StoredMyFlowItemDraft } from './my-flow-personal-state';
import type {
  PersonalItemValueOverlay,
  PersonalStructuralOverlay,
} from './personal-structural-overlay';
import { buildCanonicalFlowValueKey } from './projection-identity';

export function getPersonalDraftProjectionValueKey(
  flowSlug: string,
  itemId: string,
): string {
  return buildCanonicalFlowValueKey(flowSlug, itemId);
}

function hasOwn<T extends object>(value: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function buildPersonalDraftProjectionValueOverlays(options: {
  flowSlug: string;
  sourceItemIds: string[];
  structuralOverlay: PersonalStructuralOverlay;
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
}): PersonalItemValueOverlay[] {
  const itemIds = Array.from(
    new Set([
      ...options.sourceItemIds,
      ...options.structuralOverlay.userItems.map((item) => item.itemId),
    ]),
  );

  return itemIds.flatMap((itemId) => {
    const key = getPersonalDraftProjectionValueKey(options.flowSlug, itemId);
    const draft = options.itemDrafts[key] ?? {};
    const storedDate = hasOwn(draft, 'date')
      ? draft.date?.trim() ?? ''
      : options.dateOverrides[key]?.trim();
    const title = draft.title?.replace(/\s+/g, ' ').trim();
    const hasMemo = hasOwn(draft, 'memo');
    const personalMemo = draft.memo?.trim() ?? '';

    const overlay: PersonalItemValueOverlay = {
      itemId,
      ...(title ? { title } : {}),
      ...(hasMemo ? { personalMemo } : {}),
      ...(storedDate !== undefined
        ? {
            scheduleOverride: storedDate
              ? { mode: 'fixed_date' as const, date: storedDate }
              : null,
          }
        : {}),
    };

    return Object.keys(overlay).length > 1 ? [overlay] : [];
  });
}
