export const MY_FLOW_FIRST_ENTRY_ITEM_LIMIT = 3;

export type MyFlowFirstEntryItemInput<TRow> = {
  key: string;
  itemId: string;
  row: TRow;
  completed: boolean;
  actionable?: boolean;
  completionDisabled?: boolean;
};

export type MyFlowProgressInput = {
  total: number;
  completed: number;
};

export type MyFlowItemCompletionBinding = {
  key: string;
  itemId: string;
  state: 'open' | 'completed';
  checked: boolean;
  owner: 'item_detail';
  row: {
    checked: boolean;
    canToggle: false;
    showsControl: false;
  };
  detail: {
    checked: boolean;
    canToggle: boolean;
    showsControl: true;
  };
};

export type MyFlowFirstEntryItem<TRow> = MyFlowFirstEntryItemInput<TRow> & {
  completion: MyFlowItemCompletionBinding;
};

export type MyFlowFirstEntryModel<TRow> = {
  items: Array<MyFlowFirstEntryItem<TRow>>;
  nextItems: Array<MyFlowFirstEntryItem<TRow>>;
  progress: {
    total: number;
    completed: number;
    remaining: number;
    percent: number;
    label: string;
  };
  fullPlan: {
    defaultExpanded: false;
    itemCount: number;
  };
  completionOwner: 'item_detail';
};

/**
 * Projects one committed completion value onto both My Flow surfaces.
 *
 * The row only reports status and opens Item detail. Item detail is the only
 * surface allowed to change completion. Rebuilding this binding after the
 * existing completion store changes keeps the row and detail synchronized
 * without introducing another persistence key or rewriting Item identity.
 */
export function buildMyFlowItemCompletionBinding(input: {
  key: string;
  itemId: string;
  completed: boolean;
  disabled?: boolean;
}): MyFlowItemCompletionBinding {
  return {
    key: input.key,
    itemId: input.itemId,
    state: input.completed ? 'completed' : 'open',
    checked: input.completed,
    owner: 'item_detail',
    row: {
      checked: input.completed,
      canToggle: false,
      showsControl: false,
    },
    detail: {
      checked: input.completed,
      canToggle: !input.disabled,
      showsControl: true,
    },
  };
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * Builds the compact My Flow entry state from already-resolved Items.
 *
 * `actionableKeys` is deliberately supplied by the caller. Date, recurrence,
 * hold, and shape-aware priority stay with their existing canonical resolvers;
 * this model only caps that authoritative order to the next three open Items.
 */
export function buildMyFlowFirstEntryModel<TRow>(input: {
  items: Array<MyFlowFirstEntryItemInput<TRow>>;
  actionableKeys?: string[];
  progress?: MyFlowProgressInput;
}): MyFlowFirstEntryModel<TRow> {
  const seenKeys = new Set<string>();
  const items = input.items.reduce<Array<MyFlowFirstEntryItem<TRow>>>((result, item) => {
    if (!item.key.trim() || !item.itemId.trim() || seenKeys.has(item.key)) return result;
    seenKeys.add(item.key);
    result.push({
      ...item,
      completion: buildMyFlowItemCompletionBinding({
        key: item.key,
        itemId: item.itemId,
        completed: item.completed,
        disabled: item.completionDisabled,
      }),
    });
    return result;
  }, []);
  const itemByKey = new Map(items.map((item) => [item.key, item]));
  const orderedKeys = input.actionableKeys ?? items.map((item) => item.key);
  const seenActionableKeys = new Set<string>();
  const nextItems = orderedKeys.reduce<Array<MyFlowFirstEntryItem<TRow>>>((result, key) => {
    if (result.length >= MY_FLOW_FIRST_ENTRY_ITEM_LIMIT || seenActionableKeys.has(key)) {
      return result;
    }
    seenActionableKeys.add(key);
    const item = itemByKey.get(key);
    if (!item || item.completed || item.actionable === false) return result;
    result.push(item);
    return result;
  }, []);

  const calculatedTotal = items.length;
  const calculatedCompleted = items.filter((item) => item.completed).length;
  const total = normalizeCount(input.progress?.total ?? calculatedTotal);
  const completed = Math.min(total, normalizeCount(input.progress?.completed ?? calculatedCompleted));
  const remaining = total - completed;

  return {
    items,
    nextItems,
    progress: {
      total,
      completed,
      remaining,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
      label: `${completed}/${total} 완료`,
    },
    fullPlan: {
      defaultExpanded: false,
      itemCount: total,
    },
    completionOwner: 'item_detail',
  };
}
