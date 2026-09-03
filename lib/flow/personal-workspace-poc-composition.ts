import {
  getPersonalWorkspacePocFlowFieldOwnership,
  getPersonalWorkspacePocFlowItemFieldOwnership,
  PERSONAL_WORKSPACE_POC_VERSION,
  type PersonalWorkspacePocFlow,
  type PersonalWorkspacePocPersonalPlanOverlay,
  type PersonalWorkspacePocReadModel,
  type PersonalWorkspacePocState,
} from './personal-workspace-poc-contract';

export type PersonalWorkspacePocCompositionResult =
  | { ok: true; model: PersonalWorkspacePocReadModel }
  | { ok: false; reason: string };

function applyPersonalPlanOverlay(
  flow: PersonalWorkspacePocFlow,
  overlay: PersonalWorkspacePocPersonalPlanOverlay,
): PersonalWorkspacePocFlow | null {
  if (overlay.flowRef !== flow.ref
    || overlay.savedCopyId !== flow.savedCopyId
    || overlay.flowId !== flow.flowId) return null;
  const itemByRef = new Map(flow.items.map((item) => [item.ref, item]));
  if (Object.keys(overlay.items).some((itemRef) => !itemByRef.has(itemRef))) return null;
  const orderedRefs = overlay.orderedItemRefs ?? flow.items.map((item) => item.ref);
  if (orderedRefs.length !== flow.items.length
    || new Set(orderedRefs).size !== orderedRefs.length
    || orderedRefs.some((itemRef) => !itemByRef.has(itemRef))) return null;

  const sourceSectionById = new Map(
    (flow.sections ?? []).map((section) => [section.sectionId, section] as const),
  );
  if (sourceSectionById.size !== (flow.sections ?? []).length
    || flow.items.some((item) => (
      item.sectionId !== undefined
      && (!sourceSectionById.has(item.sectionId)
        || item.sectionTitle !== sourceSectionById.get(item.sectionId)?.title)
    ))) return null;
  const sectionTitleOverrides = overlay.sectionTitles ?? {};
  if (Object.keys(sectionTitleOverrides).length > 0
    && !['personal-draft', 'authoring-handoff'].includes(flow.origin)) return null;
  for (const [sectionId, title] of Object.entries(sectionTitleOverrides)) {
    const section = sourceSectionById.get(sectionId);
    if (!section
      || section.editCapability !== 'poc-shadow'
      || !title.trim()
      || title !== title.trim()) return null;
  }
  const sections = flow.sections?.map((section) => ({
    ...section,
    title: sectionTitleOverrides[section.sectionId] ?? section.title,
  }));
  const effectiveSectionById = new Map(
    (sections ?? []).map((section) => [section.sectionId, section] as const),
  );

  const flowOwnership = getPersonalWorkspacePocFlowFieldOwnership(flow);
  const items = orderedRefs.map((itemRef, effectiveOrder) => {
    const item = itemByRef.get(itemRef) as PersonalWorkspacePocFlow['items'][number];
    const itemOverlay = overlay.items[itemRef];
    const ownership = getPersonalWorkspacePocFlowItemFieldOwnership(item, flow.origin, flow);
    const effectiveTitle = itemOverlay?.title ?? item.title;
    const effectiveDescription = itemOverlay && Object.hasOwn(itemOverlay, 'memo')
      ? itemOverlay.memo as string
      : item.description;
    const schedule = itemOverlay?.schedule;
    const effectiveDate = schedule?.mode === 'fixed_date'
      ? schedule.date
      : schedule?.mode === 'unscheduled'
        ? undefined
        : item.sourceDate;
    const planOwner = {
      owner: 'poc-personal' as const,
      provenance: 'poc-personal-plan' as const,
    };
    const effectiveSectionTitle = item.sectionId
      ? effectiveSectionById.get(item.sectionId)?.title
      : item.sectionTitle;
    return {
      ...item,
      title: effectiveTitle,
      ...(effectiveSectionTitle !== undefined
        ? { sectionTitle: effectiveSectionTitle }
        : {}),
      ...(effectiveDescription !== undefined
        ? { description: effectiveDescription }
        : {}),
      sourceOrder: effectiveOrder,
      ...(effectiveDate !== undefined ? { sourceDate: effectiveDate } : {}),
      ...((schedule?.mode === 'unscheduled' && 'sourceDate' in item)
        ? { sourceDate: undefined }
        : {}),
      fieldOwnership: {
        ...ownership,
        title: itemOverlay?.title !== undefined
          ? { ...ownership.title, effective: { value: effectiveTitle, ...planOwner } }
          : ownership.title,
        description: itemOverlay && Object.hasOwn(itemOverlay, 'memo')
          ? { ...ownership.description, effective: { value: effectiveDescription ?? '', ...planOwner } }
          : ownership.description,
        order: overlay.orderedItemRefs
          ? { ...ownership.order, effective: { value: effectiveOrder, ...planOwner } }
          : ownership.order,
        date: schedule
          ? {
              ...ownership.date,
              effective: {
                ...(effectiveDate !== undefined ? { value: effectiveDate } : {}),
                ...planOwner,
              },
            }
          : ownership.date,
        dateDerivation: schedule
          ? {
              ...ownership.dateDerivation,
              pocPersonalSchedule: schedule.mode === 'fixed_date'
                ? { mode: 'absolute' as const, date: schedule.date, ...planOwner }
                : { mode: 'none' as const, ...planOwner },
              effectiveDate: {
                ...(effectiveDate !== undefined ? { value: effectiveDate } : {}),
                ...planOwner,
              },
              strategy: 'poc-personal-schedule' as const,
            }
          : ownership.dateDerivation,
      },
    };
  });

  return {
    ...flow,
    title: overlay.title ?? flow.title,
    fieldOwnership: {
      ...flowOwnership,
      title: overlay.title !== undefined
        ? {
            ...flowOwnership.title,
            effective: {
              value: overlay.title,
              owner: 'poc-personal',
              provenance: 'poc-personal-plan',
            },
          }
        : flowOwnership.title,
    },
    ...(sections ? { sections } : {}),
    items,
  };
}

/**
 * Keeps the four read-only saved-plan origins separate from PoC-authored flows.
 * A collision fails closed instead of allowing a shadow value to replace source data.
 */
export function composePersonalWorkspacePocReadModel(
  baseModel: PersonalWorkspacePocReadModel,
  state: PersonalWorkspacePocState,
): PersonalWorkspacePocCompositionResult {
  const authoredFlows = state.authoredFlows ?? [];
  const flowRefs = new Set(baseModel.flows.map((flow) => flow.ref));
  const itemRefs = new Set(baseModel.flows.flatMap((flow) => flow.items.map((item) => item.ref)));
  const handoffIds = new Set<string>();

  for (const flow of authoredFlows) {
    if (flowRefs.has(flow.ref)) return { ok: false, reason: 'duplicate-flow-identity' };
    if (handoffIds.has(flow.authoring.handoffId)) {
      return { ok: false, reason: 'duplicate-authoring-handoff' };
    }
    handoffIds.add(flow.authoring.handoffId);
    flowRefs.add(flow.ref);
    for (const item of flow.items) {
      if (itemRefs.has(item.ref)) return { ok: false, reason: 'duplicate-item-identity' };
      itemRefs.add(item.ref);
    }
  }

  const combinedFlows = [...baseModel.flows, ...authoredFlows];
  const flows: PersonalWorkspacePocFlow[] = [];
  for (const flow of combinedFlows) {
    const overlay = state.personalPlanOverlays?.[flow.ref];
    if (!overlay) {
      flows.push(flow);
      continue;
    }
    const composed = applyPersonalPlanOverlay(flow, overlay);
    if (!composed) return { ok: false, reason: 'invalid-personal-plan-overlay' };
    flows.push(composed);
  }

  return {
    ok: true,
    model: {
      version: PERSONAL_WORKSPACE_POC_VERSION,
      flows,
    },
  };
}
