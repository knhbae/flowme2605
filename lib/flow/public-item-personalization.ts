import type { FlowExperienceItemOverride } from './flow-experience-projection';
import {
  getMyFlowDateOverrideKey,
  MY_FLOW_DATE_REMOVED_OVERRIDE,
  type StoredMyFlowItemDraft,
} from './my-flow-personal-state';
import { getPersonalDraftProjectionValueKey } from './personal-draft-projection-state';

export type PublicItemPersonalization = {
  title?: string;
  detail?: string;
  date?: string | null;
};

export type PublicItemPersonalizationSource = {
  itemId: string;
  title: string;
  detail?: string;
  date?: string;
};

export type PublicItemPersonalizationPromotion = {
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
  promotedItemCount: number;
  sourceMutationCount: 0;
};

export type PublicItemPersonalizationRestore = {
  personalizations: Record<string, PublicItemPersonalization>;
  restoredItemCount: number;
};

function normalizeText(value?: string): string {
  return value?.replace(/\s+/gu, ' ').trim() ?? '';
}

function normalizeDetail(value?: string): string {
  return value?.trim() ?? '';
}

function isPlainDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return false;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (
    date.getFullYear() === Number(match[1])
    && date.getMonth() === Number(match[2]) - 1
    && date.getDate() === Number(match[3])
  );
}

export function buildPublicFlowExperienceItemOverrides(
  personalizations: Record<string, PublicItemPersonalization>,
): Record<string, FlowExperienceItemOverride> {
  return Object.fromEntries(
    Object.entries(personalizations).flatMap(([itemId, personalization]) => {
      const title = normalizeText(personalization.title);
      const detail = normalizeDetail(personalization.detail);
      const hasDate = Object.prototype.hasOwnProperty.call(personalization, 'date');
      const date = personalization.date;
      const override: FlowExperienceItemOverride = {
        ...(title ? { title } : {}),
        ...(detail ? { memo: detail } : {}),
        ...(hasDate
          ? { date: typeof date === 'string' && isPlainDate(date) ? date : null }
          : {}),
      };
      return Object.keys(override).length > 0 ? [[itemId, override] as const] : [];
    }),
  );
}

export function promotePublicItemPersonalizations(options: {
  flowSlug: string;
  sources: PublicItemPersonalizationSource[];
  personalizations: Record<string, PublicItemPersonalization>;
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
  /** Preserve the approved raw TXT memo as an explicit value, including empty text. */
  preserveExplicitDetail?: boolean;
}): PublicItemPersonalizationPromotion {
  const itemDrafts = structuredClone(options.itemDrafts);
  const dateOverrides = { ...options.dateOverrides };
  let promotedItemCount = 0;

  options.sources.forEach((source) => {
    const personalization = options.personalizations[source.itemId];
    if (!personalization) return;

    const valueKey = getPersonalDraftProjectionValueKey(
      options.flowSlug,
      source.itemId,
    );
    const dateOverrideKey = getMyFlowDateOverrideKey(
      options.flowSlug,
      source.itemId,
      source.date,
    );
    const currentDraft = { ...(itemDrafts[valueKey] ?? {}) };
    const sourceTitle = normalizeText(source.title);
    const sourceDetail = normalizeDetail(source.detail);
    const title = normalizeText(personalization.title);
    const detail = normalizeDetail(personalization.detail);
    const hasTitle = Object.prototype.hasOwnProperty.call(personalization, 'title');
    const hasDetail = Object.prototype.hasOwnProperty.call(personalization, 'detail');
    const hasDate = Object.prototype.hasOwnProperty.call(personalization, 'date');
    const date = personalization.date;
    let changed = false;

    if (hasTitle) {
      if (title && title !== sourceTitle) {
        currentDraft.title = title;
        changed = true;
      } else if (Object.prototype.hasOwnProperty.call(currentDraft, 'title')) {
        delete currentDraft.title;
        changed = true;
      }
    }

    if (hasDetail) {
      if (options.preserveExplicitDetail) {
        if (currentDraft.memo !== detail || !Object.prototype.hasOwnProperty.call(currentDraft, 'memo')) {
          currentDraft.memo = detail;
          changed = true;
        }
      } else if (detail && detail !== sourceDetail) {
        currentDraft.memo = detail;
        changed = true;
      } else if (Object.prototype.hasOwnProperty.call(currentDraft, 'memo')) {
        delete currentDraft.memo;
        changed = true;
      }
    }

    if (hasDate) {
      if (typeof date === 'string' && isPlainDate(date) && date !== source.date) {
        currentDraft.date = date;
        delete dateOverrides[dateOverrideKey];
        changed = true;
      } else if (date === null && source.date) {
        delete currentDraft.date;
        dateOverrides[dateOverrideKey] = MY_FLOW_DATE_REMOVED_OVERRIDE;
        changed = true;
      } else {
        delete currentDraft.date;
        delete dateOverrides[dateOverrideKey];
      }
    }

    if (Object.keys(currentDraft).length > 0) itemDrafts[valueKey] = currentDraft;
    else delete itemDrafts[valueKey];
    if (changed) promotedItemCount += 1;
  });

  return {
    itemDrafts,
    dateOverrides,
    promotedItemCount,
    sourceMutationCount: 0,
  };
}

export function restorePublicItemPersonalizations(options: {
  flowSlug: string;
  sources: PublicItemPersonalizationSource[];
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
}): PublicItemPersonalizationRestore {
  const personalizations: Record<string, PublicItemPersonalization> = {};

  options.sources.forEach((source) => {
    const valueKey = getPersonalDraftProjectionValueKey(
      options.flowSlug,
      source.itemId,
    );
    const draft = options.itemDrafts[valueKey] ?? {};
    const dateOverrideKey = getMyFlowDateOverrideKey(
      options.flowSlug,
      source.itemId,
      source.date,
    );
    const storedDateOverride = options.dateOverrides[dateOverrideKey];
    const restored: PublicItemPersonalization = {};

    if (Object.prototype.hasOwnProperty.call(draft, 'title')) {
      restored.title = draft.title ?? '';
    }
    if (Object.prototype.hasOwnProperty.call(draft, 'memo')) {
      restored.detail = draft.memo ?? '';
    }
    if (storedDateOverride === MY_FLOW_DATE_REMOVED_OVERRIDE) {
      restored.date = null;
    } else if (Object.prototype.hasOwnProperty.call(draft, 'date')) {
      restored.date = draft.date?.trim() || null;
    } else if (storedDateOverride?.trim() && storedDateOverride !== source.date) {
      restored.date = storedDateOverride.trim();
    }

    if (Object.keys(restored).length > 0) {
      personalizations[source.itemId] = restored;
    }
  });

  return {
    personalizations,
    restoredItemCount: Object.keys(personalizations).length,
  };
}
