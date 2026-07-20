export const FLOW_UI_SURFACE_CLASS =
  'rounded-lg border border-[var(--flowme-border)] bg-[var(--flowme-surface)] shadow-[0_1px_0_rgba(27,26,23,0.03)]';

export const FLOW_UI_INSET_CLASS =
  'rounded-md border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)]';

export const FLOW_UI_TOOLBAR_CLASS =
  'flex min-h-12 items-center justify-between gap-3 border-y border-[var(--flowme-border)] py-2';

export const FLOW_UI_PRIMARY_ACTION_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md bg-[var(--flowme-text)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#33312C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:bg-[var(--flowme-disabled)] disabled:text-[var(--flowme-text-tertiary)]';

export const FLOW_UI_SECONDARY_ACTION_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] px-3 py-2 text-sm font-semibold text-[var(--flowme-text)] transition hover:border-[var(--flowme-text-tertiary)] hover:bg-[var(--flowme-surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:border-[var(--flowme-border)] disabled:bg-[var(--flowme-surface-subtle)] disabled:text-[var(--flowme-text-tertiary)]';

export const FLOW_UI_TERTIARY_ACTION_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-[var(--flowme-text-secondary)] transition hover:bg-[var(--flowme-soft)] hover:text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:text-[var(--flowme-text-tertiary)]';

export const FLOW_UI_COMPACT_ACTION_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-semibold text-[var(--flowme-text-secondary)] transition hover:bg-[var(--flowme-soft)] hover:text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:text-[var(--flowme-text-tertiary)]';

export const FLOW_UI_ICON_ACTION_CLASS =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] text-sm font-semibold text-[var(--flowme-text-secondary)] transition hover:border-[var(--flowme-text-tertiary)] hover:bg-[var(--flowme-surface-subtle)] hover:text-[var(--flowme-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:text-[var(--flowme-text-tertiary)]';

export const FLOW_UI_SEGMENTED_CLASS =
  'grid gap-1 rounded-lg bg-[var(--flowme-soft)] p-1';

export const FLOW_UI_SEGMENT_ACTIVE_CLASS =
  'bg-[var(--flowme-surface)] text-[var(--flowme-text)] shadow-[0_1px_2px_rgba(27,26,23,0.08)]';

export const FLOW_UI_SEGMENT_IDLE_CLASS =
  'text-[var(--flowme-text-secondary)] hover:bg-white/70 hover:text-[var(--flowme-text)]';

export const FLOW_UI_INPUT_CLASS =
  'min-h-11 rounded-md border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] px-3 py-2 text-base font-medium text-[var(--flowme-text)] outline-none transition focus:border-[var(--flowme-action)] focus:ring-2 focus:ring-[var(--flowme-focus)] disabled:cursor-not-allowed disabled:bg-[var(--flowme-surface-subtle)] disabled:text-[var(--flowme-text-tertiary)] sm:text-sm';

export const FLOW_UI_SELECTION_ROW_CLASS =
  'flex min-h-14 cursor-pointer items-center gap-3 border-b border-[var(--flowme-border)] px-1 py-2.5 transition last:border-b-0 hover:bg-[var(--flowme-surface-subtle)]';

export const FLOW_UI_EXECUTION_ROW_CLASS =
  'min-h-14 border-b border-[var(--flowme-border)] bg-transparent py-2.5 text-sm transition last:border-b-0';

export const FLOW_UI_STATUS_INFO_CLASS =
  'border-l-2 border-[var(--flowme-action)] bg-[var(--flowme-action-soft)] px-3 py-2 text-sm text-[var(--flowme-action-strong)]';

export const FLOW_UI_SHEET_CLASS =
  'absolute inset-x-0 bottom-0 max-h-[86dvh] overflow-y-auto overscroll-contain rounded-t-lg bg-[var(--flowme-surface)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_36px_rgba(27,26,23,0.16)]';

export const FLOW_UI_DANGER_ACTION_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-[var(--flowme-danger-border)] bg-[var(--flowme-surface)] px-3 py-2 text-sm font-semibold text-[var(--flowme-danger-strong)] transition hover:bg-[var(--flowme-danger-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-danger-focus)]';

export const FLOW_UI_DISCLOSURE_CLASS =
  'flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-[var(--flowme-border)] bg-[var(--flowme-surface-subtle)] px-3 py-2 text-left text-sm font-semibold text-[var(--flowme-text)] transition hover:border-[var(--flowme-border-strong)] hover:bg-[var(--flowme-action-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]';
