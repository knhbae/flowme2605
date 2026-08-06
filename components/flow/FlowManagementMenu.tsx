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
}: {
  flowTitle: string;
  actions: FlowManagementMenuAction[];
  testId: string;
  triggerTestId?: string;
  marker?: string;
  align?: 'left' | 'right';
  triggerClassName?: string;
  q3CopyEnabled?: boolean;
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
        className={`inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] [&::-webkit-details-marker]:hidden ${triggerClassName}`}
      >
        {q3CopyEnabled ? '계획 관리' : 'Flow 관리'}
      </summary>
      <div
        role="menu"
        aria-label={`${flowTitle} ${q3CopyEnabled ? '계획 관리' : 'Flow 관리'}`}
        className={`absolute top-full z-50 mt-1 grid min-w-60 gap-1 rounded-md border border-slate-200 bg-white p-1.5 shadow-[0_14px_36px_rgba(15,23,42,0.16)] ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}
      >
        {actions.map((action) => {
          const className = `grid min-h-11 w-full items-center rounded-md px-3 py-2 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 ${
            action.role === 'destructive'
              ? 'text-rose-700 hover:bg-rose-50 focus-visible:ring-[var(--flowme-danger-focus)]'
              : action.role === 'recovery'
                ? 'text-blue-700 hover:bg-blue-50 focus-visible:ring-[var(--flowme-focus)]'
                : 'text-slate-700 hover:bg-slate-50 focus-visible:ring-[var(--flowme-focus)]'
          }`;
          const content = (
            <>
              <span>{action.label}</span>
              {action.description ? (
                <span className="mt-0.5 text-[11px] font-medium leading-4 text-slate-500">
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
