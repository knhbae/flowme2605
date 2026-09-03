import type { PersonalWorkspacePocFlow } from './personal-workspace-poc-contract';

export type PersonalWorkspacePocCopyDisplay = Readonly<{
  flowRef: string;
  /** Canonical source identity. This is never used as the saved-copy identity. */
  sourceFlowId: string;
  /** Exact effective title from the read model, without presentation decoration. */
  title: string;
  /** Present only while at least two active copies share the same source Flow. */
  copyOrdinal?: number;
  copyCount: number;
  /** Present only while copyOrdinal is present. */
  copyLabel?: string;
  /** Presentation-only title for lists, search results, and detail headings. */
  displayTitle: string;
}>;

export type PersonalWorkspacePocCopyDisambiguationOptions = Readonly<{
  /**
   * The read model also contains trashed rows so they can be restored. Callers
   * provide those inactive refs here; only the remaining active copies affect
   * numbering and receive display entries.
   */
  inactiveFlowRefs?: ReadonlySet<string>;
}>;

function compareStableText(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

function compareStableCopyIdentity(
  left: PersonalWorkspacePocFlow,
  right: PersonalWorkspacePocFlow,
): number {
  return compareStableText(left.savedCopyId, right.savedCopyId)
    || compareStableText(left.ref, right.ref);
}

function formatCopyDisplayTitle(title: string, copyOrdinal?: number): string {
  return copyOrdinal === undefined ? title : `사본 ${copyOrdinal} · ${title}`;
}

/**
 * Builds presentation-only copy labels for the active PoC read model.
 *
 * `flowId` remains the source Flow identity and `flow.ref` remains the saved
 * copy identity. The helper neither rewrites those values nor mutates the
 * source rows. Ordinals are derived from stable copy identity because the PoC
 * read model intentionally does not own or persist a copy-created timestamp.
 */
export function buildPersonalWorkspacePocCopyDisambiguation(
  flows: readonly PersonalWorkspacePocFlow[],
  options: PersonalWorkspacePocCopyDisambiguationOptions = {},
): ReadonlyMap<string, PersonalWorkspacePocCopyDisplay> {
  const activeFlows = flows
    .filter((flow) => !options.inactiveFlowRefs?.has(flow.ref))
    .slice()
    .sort((left, right) => (
      compareStableText(left.flowId, right.flowId)
      || compareStableCopyIdentity(left, right)
    ));
  const sourceGroups = new Map<string, PersonalWorkspacePocFlow[]>();

  activeFlows.forEach((flow) => {
    const group = sourceGroups.get(flow.flowId) ?? [];
    group.push(flow);
    sourceGroups.set(flow.flowId, group);
  });

  const displays = new Map<string, PersonalWorkspacePocCopyDisplay>();
  sourceGroups.forEach((group, sourceFlowId) => {
    const ordered = group.slice().sort(compareStableCopyIdentity);
    ordered.forEach((flow, index) => {
      const copyCount = ordered.length;
      const copyOrdinal = copyCount > 1 ? index + 1 : undefined;
      const copyLabel = copyOrdinal === undefined ? undefined : `사본 ${copyOrdinal}`;
      displays.set(flow.ref, {
        flowRef: flow.ref,
        sourceFlowId,
        title: flow.title,
        ...(copyOrdinal === undefined ? {} : { copyOrdinal, copyLabel }),
        copyCount,
        displayTitle: formatCopyDisplayTitle(flow.title, copyOrdinal),
      });
    });
  });

  return displays;
}

/**
 * Shared fallback for list, search, and detail consumers. An inactive Flow is
 * deliberately absent from the active display map and therefore keeps its raw
 * title in recovery-only surfaces such as Trash.
 */
export function getPersonalWorkspacePocFlowDisplayTitle(
  flow: PersonalWorkspacePocFlow,
  displays: ReadonlyMap<string, PersonalWorkspacePocCopyDisplay>,
): string {
  return displays.get(flow.ref)?.displayTitle ?? flow.title;
}
