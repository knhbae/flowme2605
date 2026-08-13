'use client';

import {
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from 'react';

import { FLOW_UI_ICON_ACTION_CLASS } from '@/components/flow/flow-ui';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function AuthoringDialog({
  open,
  title,
  description,
  testId,
  initialFocusSelector,
  size = 'default',
  variant = 'modal',
  keepMounted = false,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  testId?: string;
  initialFocusSelector?: string;
  size?: 'default' | 'wide';
  variant?: 'modal' | 'drawer';
  keepMounted?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  const initialFocusSelectorRef = useRef(initialFocusSelector);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    initialFocusSelectorRef.current = initialFocusSelector;
  }, [initialFocusSelector]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const requestedFocus = initialFocusSelectorRef.current
      ? panel?.querySelector<HTMLElement>(initialFocusSelectorRef.current)
      : null;
    const focusable =
      requestedFocus ?? panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    window.requestAnimationFrame(() => (focusable ?? panel)?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const controls = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((control) => control.offsetParent !== null);
      if (controls.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.requestAnimationFrame(() => previouslyFocused?.focus());
    };
  }, [open]);

  if (!open && !keepMounted) return null;

  return (
    <div
      hidden={!open}
      aria-hidden={open ? undefined : true}
      className={`${open ? "grid" : "hidden"} fixed inset-0 z-[80] place-items-end bg-black/35 ${
        variant === 'drawer'
          ? 'min-[900px]:place-items-stretch min-[900px]:justify-items-end'
          : 'sm:place-items-center sm:p-4'
      }`}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        ref={panelRef}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-testid={testId}
        tabIndex={-1}
        className={`flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[var(--flowme-radius-surface)] bg-[var(--flowme-surface)] shadow-2xl ${
          variant === 'drawer'
            ? 'max-w-full min-[900px]:h-[100dvh] min-[900px]:max-h-[100dvh] min-[900px]:max-w-xl min-[900px]:rounded-none min-[900px]:border-l min-[900px]:border-[var(--flowme-border)]'
            : `sm:rounded-[var(--flowme-radius-surface)] ${
                size === 'wide' ? 'max-w-5xl' : 'max-w-2xl'
              }`
        }`}
      >
        <header className="flex items-start gap-4 border-b border-[var(--flowme-border)] px-4 py-4 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-xl font-semibold tracking-[-0.02em]">
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-xs leading-5 text-[var(--flowme-text-secondary)]"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className={FLOW_UI_ICON_ACTION_CLASS}
            aria-label="닫기"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div
          data-authoring-dialog-scroll
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5"
        >
          {children}
        </div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--flowme-border)] bg-[var(--flowme-surface)] px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-4">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
