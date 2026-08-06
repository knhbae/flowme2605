import {
  MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
  MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
  type StoredMyFlowItemDraft,
} from './my-flow-personal-state';
import { readProjectionIdentityStorage } from './projection-identity';

type MyFlowMutationProjectionValues = Readonly<{
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
}>;

function sortScopedRecord<T>(flowSlug: string, record: Record<string, T>): Record<string, T> {
  const prefix = `${flowSlug}::`;
  return Object.fromEntries(
    Object.entries(record)
      .filter(([key]) => key.startsWith(prefix))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

/**
 * Builds the semantic, current-Flow projection values used by freshness checks.
 * Read-only legacy aliases are materialized in-memory on both the rendered and
 * locked paths, while values owned by another Flow are deliberately excluded.
 */
export function normalizeMyFlowMutationProjectionValues(input: Readonly<{
  flowSlug: string;
  itemIds: readonly string[];
  itemDrafts: Record<string, StoredMyFlowItemDraft>;
  dateOverrides: Record<string, string>;
}>): MyFlowMutationProjectionValues {
  const projected = readProjectionIdentityStorage(
    {
      getItem(key) {
        if (key === MY_FLOW_ITEM_DRAFTS_STORAGE_KEY) return JSON.stringify(input.itemDrafts);
        if (key === MY_FLOW_DATE_OVERRIDES_STORAGE_KEY) return JSON.stringify(input.dateOverrides);
        return null;
      },
    },
    {
      flowId: input.flowSlug,
      itemIds: [...input.itemIds],
      itemDraftStorageKey: MY_FLOW_ITEM_DRAFTS_STORAGE_KEY,
      dateOverrideStorageKey: MY_FLOW_DATE_OVERRIDES_STORAGE_KEY,
    },
  );

  return {
    itemDrafts: sortScopedRecord(
      input.flowSlug,
      projected.itemDrafts as Record<string, StoredMyFlowItemDraft>,
    ),
    dateOverrides: sortScopedRecord(
      input.flowSlug,
      projected.dateOverrides as Record<string, string>,
    ),
  };
}
