'use client';

import {
  FLOW_UI_COMPACT_ACTION_CLASS,
  FLOW_UI_SELECTION_ROW_CLASS,
} from './flow-ui';

export type FlowItemMultiSelectItem = {
  key: string;
  title: string;
  meta?: string;
};

type FlowItemMultiSelectProps = {
  items: FlowItemMultiSelectItem[];
  selectedKeys: string[];
  itemTestId: string;
  selectionAriaLabel: (item: FlowItemMultiSelectItem) => string;
  onToggleItem: (key: string) => void;
  onToggleAll: () => void;
  maxHeightClassName?: string;
};

export function FlowItemMultiSelect({
  items,
  selectedKeys,
  itemTestId,
  selectionAriaLabel,
  onToggleItem,
  onToggleAll,
  maxHeightClassName = '',
}: FlowItemMultiSelectProps) {
  const selectedKeySet = new Set(selectedKeys);
  const allSelected = items.length > 0 && items.every((item) => selectedKeySet.has(item.key));

  return (
    <div className="min-w-0">
      <div className="flex min-h-10 items-center justify-between gap-3 border-b border-[#E7E4DD]">
        <p className="text-xs font-semibold text-[#6E6B64]">할 일 선택</p>
        <button
          type="button"
          className={FLOW_UI_COMPACT_ACTION_CLASS}
          onClick={onToggleAll}
        >
          {allSelected ? '선택 해제' : '모두 선택'}
        </button>
      </div>
      <div className={`overflow-y-auto ${maxHeightClassName}`}>
        {items.map((item) => (
          <label
            key={item.key}
            data-testid={itemTestId}
            className={FLOW_UI_SELECTION_ROW_CLASS}
          >
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 rounded border-[#A7A39A] accent-[#3654FF] focus:outline-none focus:ring-2 focus:ring-[#3654FF]/25"
              checked={selectedKeySet.has(item.key)}
              aria-label={selectionAriaLabel(item)}
              onChange={() => onToggleItem(item.key)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#1B1A17]">{item.title}</span>
              {item.meta ? <span className="mt-0.5 block truncate text-xs font-medium text-[#6E6B64]">{item.meta}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
