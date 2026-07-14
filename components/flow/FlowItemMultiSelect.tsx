'use client';

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
    <div>
      <div className="flex items-center justify-between gap-3 pb-2">
        <p className="text-xs font-semibold text-slate-500">할 일 선택</p>
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
          onClick={onToggleAll}
        >
          {allSelected ? '선택 해제' : '모두 선택'}
        </button>
      </div>
      <div className={`divide-y divide-slate-100 overflow-y-auto border-y border-slate-100 ${maxHeightClassName}`}>
        {items.map((item) => (
          <label
            key={item.key}
            data-testid={itemTestId}
            className="flex min-h-12 cursor-pointer items-center gap-3 py-2 hover:bg-slate-50"
          >
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-blue-700"
              checked={selectedKeySet.has(item.key)}
              aria-label={selectionAriaLabel(item)}
              onChange={() => onToggleItem(item.key)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
              {item.meta ? <span className="mt-0.5 block truncate text-xs font-medium text-slate-500">{item.meta}</span> : null}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
