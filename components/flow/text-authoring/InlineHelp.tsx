"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

export function InlineHelp({
  label,
  children,
  testId,
  panelTestId,
  className = "",
  triggerClassName = "",
}: {
  label: string;
  children: ReactNode;
  testId?: string;
  panelTestId?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const generatedId = useId();
  const panelId = `authoring-help-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const titleId = `${panelId}-title`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreTriggerFocus = true) => {
    setOpen(false);
    if (!restoreTriggerFocus) return;
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;

    const focusFrame = window.requestAnimationFrame(() =>
      closeButtonRef.current?.focus(),
    );

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        const clickedFocusable =
          event.target instanceof Element &&
          Boolean(
            event.target.closest(
              'button, a[href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])',
            ),
          );
        close(!clickedFocusable);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [close, open]);

  return (
    <div
      ref={containerRef}
      className={`ta-inline-help relative inline-flex shrink-0 ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        data-testid={testId}
        aria-label={`${label} ${open ? "닫기" : "열기"}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        title={label}
        className={`group -m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] ${triggerClassName}`}
        onClick={() => {
          if (open) {
            close();
          } else {
            setOpen(true);
          }
        }}
      >
        <span
          aria-hidden="true"
          className={`flex h-5 w-5 items-center justify-center rounded-full border bg-[var(--flowme-surface)] text-[11px] font-bold leading-none transition group-hover:border-[var(--flowme-action)] group-hover:text-[var(--flowme-action-strong)] ${
            open
              ? "border-[var(--flowme-action)] bg-[var(--flowme-soft)] text-[var(--flowme-action-strong)]"
              : "border-[var(--flowme-border-strong)] text-[var(--flowme-text-secondary)]"
          }`}
        >
          ?
        </span>
      </button>
      {open ? (
        <div
          id={panelId}
          data-testid={panelTestId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="ta-inline-help-panel rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] p-4 text-left text-xs font-normal leading-5 text-[var(--flowme-text-secondary)] shadow-xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-[var(--flowme-border)] pb-3">
            <p
              id={titleId}
              className="font-semibold text-[var(--flowme-text)]"
            >
              {label}
            </p>
            <button
              ref={closeButtonRef}
              type="button"
              className="-m-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg text-[var(--flowme-text-secondary)] outline-none hover:bg-[var(--flowme-soft)] focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)]"
              aria-label={`${label} 닫기`}
              onClick={() => close()}
            >
              ×
            </button>
          </div>
          <div className="mt-3 max-h-[min(60dvh,32rem)] overflow-y-auto overscroll-contain pr-1">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}
