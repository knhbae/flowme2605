'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import type { MyFlowLibrarySort } from '@/lib/flow/my-flow-local-ia';

const SORT_OPTIONS: readonly { value: MyFlowLibrarySort; label: string }[] = [
  { value: 'next', label: '다음 일정순' },
  { value: 'saved', label: '최근 저장순' },
  { value: 'name', label: '계획 이름순' },
];

export type MyFlowSortMenuProps = {
  sort: MyFlowLibrarySort;
  planCount: number;
  visible: boolean;
  placement?: 'mobile' | 'rail';
  onChange: (sort: MyFlowLibrarySort, trigger: HTMLButtonElement) => void;
};

export function getMyFlowSortLabel(sort: MyFlowLibrarySort): string {
  return SORT_OPTIONS.find((option) => option.value === sort)?.label ?? '다음 일정순';
}

export function MyFlowSortMenu({
  sort,
  planCount,
  visible,
  placement = 'mobile',
  onChange,
}: MyFlowSortMenuProps) {
  const id = useId().replace(/:/gu, '');
  const menuId = `my-plan-sort-menu-${id}`;
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const currentIndex = Math.max(0, SORT_OPTIONS.findIndex((option) => option.value === sort));

  const restoreTriggerFocus = () => {
    window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };
  const closeMenu = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) restoreTriggerFocus();
  };
  const openMenu = (focusIndex = currentIndex) => {
    setOpen(true);
    window.requestAnimationFrame(() => optionRefs.current[focusIndex]?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      closeMenu();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  if (!visible) return null;
  const label = getMyFlowSortLabel(sort);

  const selectOption = (nextSort: MyFlowLibrarySort) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    if (nextSort !== sort) {
      onChange(nextSort, trigger);
      setAnnouncement(`${getMyFlowSortLabel(nextSort)}으로 정렬됨, 계획 ${planCount}개`);
    }
    closeMenu();
  };

  const handleTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(event.key === 'ArrowUp' ? SORT_OPTIONS.length - 1 : currentIndex);
      return;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeMenu();
    }
  };
  const handleOptionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (index + offset + SORT_OPTIONS.length) % SORT_OPTIONS.length;
      optionRefs.current[nextIndex]?.focus();
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      optionRefs.current[event.key === 'Home' ? 0 : SORT_OPTIONS.length - 1]?.focus();
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      data-testid={`my-plan-sort-${placement}`}
      data-sort-menu-overlay="true"
    >
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-12 min-w-12 items-center justify-center gap-1 rounded-md border border-[var(--flowme-border-strong)] bg-white px-3 text-xs font-semibold text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`정렬 기준, ${label}`}
        data-testid={`my-plan-sort-${placement}-trigger`}
        onClick={() => (open ? closeMenu(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{label}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="계획 정렬 기준"
          className="absolute right-0 z-50 mt-1 min-w-40 overflow-hidden rounded-lg border border-[var(--flowme-border)] bg-white p-1 shadow-xl"
          data-testid={`my-plan-sort-${placement}-menu`}
        >
          {SORT_OPTIONS.map((option, index) => (
            <button
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              role="menuitemradio"
              aria-checked={sort === option.value}
              tabIndex={index === currentIndex ? 0 : -1}
              className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-3 text-left text-sm font-semibold ${sort === option.value ? 'bg-[var(--flowme-action-soft)] text-[var(--flowme-action)]' : 'text-[var(--flowme-text)] hover:bg-[var(--flowme-surface-subtle)]'}`}
              data-testid={`my-plan-sort-option-${option.value}`}
              onClick={() => selectOption(option.value)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              <span>{option.label}</span>
              {sort === option.value ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <span className="sr-only" role="status" aria-live="polite">{announcement}</span>
    </div>
  );
}
