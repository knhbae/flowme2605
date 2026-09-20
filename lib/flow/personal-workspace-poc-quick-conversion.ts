import {
  toPersonalWorkspacePocQuickItemRef,
  type PersonalWorkspacePocAuthoredFlow,
  type PersonalWorkspacePocQuickItem,
} from './personal-workspace-poc-contract';
import { materializePersonalWorkspacePocAuthoring } from './personal-workspace-poc-authoring';

export const PERSONAL_WORKSPACE_POC_QUICK_CONVERSION_VERSION = 1 as const;

export type MaterializePersonalWorkspacePocQuickConversionInput = Readonly<{
  quickItem: PersonalWorkspacePocQuickItem;
  quickItemRef: string;
  flowTitle: string;
  stateRevision: number;
  committedAt: string;
}>;

export type PersonalWorkspacePocQuickConversionMaterialization = Readonly<
  | {
      ok: true;
      conversionId: string;
      handoffId: string;
      flow: PersonalWorkspacePocAuthoredFlow;
      itemRef: string;
    }
  | {
      ok: false;
      error: 'invalid-quick-item-ref' | 'invalid-flow-title' | 'invalid-quick-title' | 'materialization-failed';
    }
>;

function isSingleLineTitle(value: string): boolean {
  return Boolean(value.trim())
    && value === value.trim()
    && !/[\r\n\u0000-\u001f\u007f]/u.test(value);
}

/**
 * Builds a deterministic, write-free one-Item Flow from an exact QuickItem
 * snapshot. The state transition remains the sole owner of persistence.
 */
export function materializePersonalWorkspacePocQuickConversion(
  input: MaterializePersonalWorkspacePocQuickConversionInput,
): PersonalWorkspacePocQuickConversionMaterialization {
  if (input.quickItemRef !== toPersonalWorkspacePocQuickItemRef(input.quickItem.quickItemId)) {
    return { ok: false, error: 'invalid-quick-item-ref' };
  }
  if (!isSingleLineTitle(input.flowTitle)) {
    return { ok: false, error: 'invalid-flow-title' };
  }
  if (!isSingleLineTitle(input.quickItem.title)) {
    return { ok: false, error: 'invalid-quick-title' };
  }
  if (!Number.isSafeInteger(input.stateRevision) || input.stateRevision < 0) {
    return { ok: false, error: 'materialization-failed' };
  }

  const conversionId = [
    'quick-item-to-flow',
    `v${PERSONAL_WORKSPACE_POC_QUICK_CONVERSION_VERSION}`,
    encodeURIComponent(input.quickItem.quickItemId),
    `revision-${input.stateRevision}`,
  ].join(':');
  const handoffId = conversionId;
  const materialized = materializePersonalWorkspacePocAuthoring({
    handoffId,
    documentId: `quick-item:${encodeURIComponent(input.quickItem.quickItemId)}`,
    revisionId: `personal-workspace-revision:${input.stateRevision}`,
    rawText: `# ${input.flowTitle}\n\n- [ ] ${input.quickItem.title}`,
    committedAt: input.committedAt,
  });
  if (!materialized.ok || materialized.flow.items.length !== 1) {
    return { ok: false, error: 'materialization-failed' };
  }
  return {
    ok: true,
    conversionId,
    handoffId,
    flow: materialized.flow,
    itemRef: materialized.flow.items[0].ref,
  };
}
