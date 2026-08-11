'use client';

import {
  FlowCapabilityResultPreview,
  type FlowCapabilityResultPreviewProps,
} from './FlowCapabilityResultPreview';

export type PublicPlanResultPreviewProps = Omit<
  FlowCapabilityResultPreviewProps,
  'publicApprovedMode'
> & {
  /** Preserve the explicit legacy rollback while keeping approved mode the default. */
  approved?: boolean;
};

export function PublicPlanResultPreview({ approved = true, ...props }: PublicPlanResultPreviewProps) {
  return <FlowCapabilityResultPreview {...props} publicApprovedMode={approved} />;
}
