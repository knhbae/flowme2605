'use client';

import Link from 'next/link';
import { useRef } from 'react';

import type { FlowManagementCommand } from '@/lib/flow/flow-command-grammar';

export type FlowManagementMenuAction = FlowManagementCommand & {
  testId: string;
  href?: string;
  external?: boolean;
  onSelect?: () => void;
  returnFocusOnSelect?: boolean;
};

export function FlowManagementMenu({
  flowTitle,
  actions,
  testId,
  triggerTestId,
  marker,
  align = 'right',
  triggerClassName = '',
  q3CopyEnabled = true,
  enforce48pxActions = false,
}: {
  flowTitle: string;
  actions: FlowManagementMenuAction[];
  testId: string;
  triggerTestId?: string;
  marker?: string;
  align?: 'left' | 'right';
  triggerClassName?: string;
  q3CopyEnabled?: boolean;
  enforce48pxActions?: boolean;
}) {
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const closeAndReturnFocus = () => {
    if (detailsRef.current) detailsRef.current.open = false;
    window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };

  return (
    <details
      ref={detailsRef}
      data-testid={testId}
      data-p34-marker={marker}
      className="relative"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !event.currentTarget.open) return;
        event.preventDefault();
        event.stopPropagation();
        closeAndReturnFocus();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          event.currentTarget.open = false;
        }
      }}
    >
      <summary
        ref={triggerRef}
        data-testid={triggerTestId}
        aria-haspopup="menu"
        aria-label={`${flowTitle} ${q3CopyEnabled ? '계획 관리' : 'Flow 관리'}`}
        className={`inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-[var(--flowme-radius-control)] border border-[var(--flowme-control-border)] bg-[var(--flowme-surface)] px-3 py-2 text-sm font-semibold text-[var(--flowme-text-secondary)] hover:border-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)] hover:text-[var(--flowme-text)] [&::-webkit-details-marker]:hidden ${triggerClassName}`}
      >
        {q3CopyEnabled ? '계획 관리' : 'Flow 관리'}
      </summary>
      <div
        role="menu"
        aria-label={`${flowTitle} ${q3CopyEnabled ? '계획 관리' : 'Flow 관리'}`}
        className={`absolute top-full z-50 mt-2 grid min-w-60 gap-1 rounded-[var(--flowme-radius-surface)] border border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] p-1.5 [box-shadow:var(--flowme-shadow-raised)] ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}
      >
        {actions.map((action) => {
          const className = `grid ${enforce48pxActions ? 'min-h-12' : 'min-h-11'} w-full items-center rounded-[var(--flowme-radius-control)] px-3 py-2 text-left text-sm font-semibold ${
            action.role === 'destructive'
              ? 'text-[var(--flowme-danger-strong)] hover:bg-[var(--flowme-danger-soft)]'
              : action.role === 'recovery'
                ? 'text-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)]'
                : 'text-[var(--flowme-text-secondary)] hover:bg-[var(--flowme-surface-subtle)] hover:text-[var(--flowme-text)]'
          }`;
          const content = (
            <>
              <span>{action.label}</span>
              {action.description ? (
                <span className="mt-0.5 text-xs font-medium leading-4 text-[var(--flowme-text-secondary)]">
                  {action.description}
                </span>
              ) : null}
            </>
          );

          if (action.href) {
            return (
              <Link
                key={action.id}
                role="menuitem"
                data-testid={action.testId}
                className={className}
                href={action.href}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noreferrer' : undefined}
                onClick={() => {
                  if (!action.external) closeAndReturnFocus();
                }}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              data-testid={action.testId}
              className={className}
              onClick={() => {
                action.onSelect?.();
                if (action.returnFocusOnSelect === false) {
                  if (detailsRef.current) detailsRef.current.open = false;
                } else {
                  closeAndReturnFocus();
                }
              }}
            >
              {content}
            </button>
          );
        })}
      </div>
    </details>
  );
}
