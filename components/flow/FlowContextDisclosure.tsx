'use client';

import React, { useId, useState, type ReactNode } from 'react';

import { FlowBottomSheet } from './FlowExecutionPrimitives';

export type FlowContextDisclosureKind = 'help' | 'caution';

export type FlowContextDisclosureProps = {
  kind: FlowContextDisclosureKind;
  label: string;
  title: string;
  children: ReactNode;
  eyebrow?: string;
  testId?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

/**
 * Opens optional context in the shared dialog sheet.
 *
 * Critical safety or irreversible-action guidance must remain visible next to
 * the caller's action. This disclosure intentionally accepts only supplemental
 * detail and must not replace that inline guidance.
 */
export function FlowContextDisclosure({
  kind,
  label,
  title,
  children,
  eyebrow,
  testId = 'flow-context-disclosure',
  defaultOpen = false,
  open,
  onOpenChange,
  className = '',
}: FlowContextDisclosureProps) {
  const reactId = useId();
  const idStem = `flow-context-${reactId.replace(/:/g, '')}`;
  const triggerId = `${idStem}-trigger`;
  const dialogId = `${idStem}-dialog`;
  const headingId = `${idStem}-heading`;
  const detailId = `${idStem}-detail`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const triggerToneClass = kind === 'caution'
    ? 'border-[var(--flowme-warning)] bg-[var(--flowme-warning-soft)] text-[var(--flowme-warning-strong)] hover:bg-amber-100'
    : 'border-[var(--flowme-border-strong)] bg-[var(--flowme-surface)] text-[var(--flowme-action)] hover:bg-[var(--flowme-action-soft)]';

  return (
    <>
      <button
        id={triggerId}
        type="button"
        data-testid={`${testId}-trigger`}
        data-flow-context-trigger={triggerId}
        data-flow-context-kind={kind}
        className={`inline-flex h-11 w-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border text-base font-bold leading-none transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--flowme-focus)] focus-visible:ring-offset-2 ${triggerToneClass} ${className}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">{kind === 'caution' ? '!' : '?'}</span>
      </button>

      {isOpen ? (
        <FlowBottomSheet
          testId={`${testId}-sheet`}
          headingId={headingId}
          eyebrow={eyebrow}
          title={title}
          onClose={() => setOpen(false)}
          returnFocusSelector={`[data-flow-context-trigger="${triggerId}"]`}
          dialogProps={{
            id: dialogId,
            'aria-describedby': detailId,
            'data-flow-context-kind': kind,
            'data-flow-context-detail': 'optional',
            'data-flow-context-return-focus': triggerId,
          }}
        >
          <div
            id={detailId}
            data-testid={`${testId}-detail`}
            className="mt-4 text-sm leading-6 text-[var(--flowme-text-secondary)]"
          >
            {children}
          </div>
        </FlowBottomSheet>
      ) : null}
    </>
  );
}
