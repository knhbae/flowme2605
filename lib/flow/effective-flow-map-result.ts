import { buildFlowCapabilityResultViewModel, type FlowCapabilityResultViewModel } from './capability-result-view-model';
import { toUserFacingSourceTitle } from './display-title';
import {
  buildFlowMapCanonicalItemId,
  type EffectiveFlowMapSnapshot,
} from './effective-flow-map-snapshot';
import { buildEffectiveFlowSnapshot } from './effective-flow-snapshot';
import type { FlowExperienceProjectionRow } from './flow-experience-projection';
import {
  buildPublicFlowTextSyntaxModel,
  type PublicFlowTextSyntaxModel,
} from './public-flow-text-syntax';
import { resolvePublicDateIntent } from './public-date-intent';
import {
  sourceBackedMyFlowBundles,
  type SourceBackedFlowMapPublishPackage,
} from './source-backed-my-flow';
import type { FlowBundle } from './types';

export type EffectiveFlowMapResultOwner = {
  kind: 'flow_map';
  mapId: string;
  sourceVersion: string;
  snapshotHash: string;
  childFlowSlugs: string[];
};

export type EffectiveFlowMapResult = {
  owner: EffectiveFlowMapResultOwner;
  /**
   * Source-projected dates by stable Map Item ID before any Map
   * personalization is applied. A missing entry means that the source does
   * not project a date for the current anchor.
   */
  sourceDateByItemId: Record<string, string>;
  /**
   * Presentation-only rows. The synthetic Flow snapshot used to build the
   * shared capability preview stays private so it cannot be reused as a Map
   * persistence or transfer identity.
   */
  previewRows: FlowExperienceProjectionRow[];
  /**
   * Presentation-only rows for the public editor. Included rows follow the
   * requested effective order; excluded rows follow canonical source order.
   */
  editorRows: FlowExperienceProjectionRow[];
  viewModel: FlowCapabilityResultViewModel;
  /**
   * Display-only authoring grammar built from the effective Map projection
   * and the canonical child Flow sources. This never becomes Map identity or
   * persistence input.
   */
  textSyntaxModel: PublicFlowTextSyntaxModel;
};

function getChildBundles(
  publishPackage: SourceBackedFlowMapPublishPackage,
): FlowBundle[] {
  return publishPackage.public.childFlows.map((child) => {
    const bundle = sourceBackedMyFlowBundles.find(
      (candidate) => candidate.flow.slug === child.slug,
    );
    if (!bundle) {
      throw new Error(
        `Flow Map ${publishPackage.map.id} is missing canonical child Flow ${child.slug}.`,
      );
    }
    return bundle;
  });
}

function resolveChildDateIntent(bundle: FlowBundle, anchor: string) {
  const hasCustomAnchor = bundle.flow.anchor_type !== 'none' && Boolean(anchor);
  return resolvePublicDateIntent({
    anchorType: bundle.flow.anchor_type,
    mode: hasCustomAnchor ? 'custom' : 'undated',
    customAnchor: hasCustomAnchor ? anchor : '',
    exampleAnchor: '',
  });
}

function buildCompositeBundle(
  publishPackage: SourceBackedFlowMapPublishPackage,
  childBundles: FlowBundle[],
): FlowBundle {
  const first = childBundles[0];
  if (!first) {
    throw new Error(`Flow Map ${publishPackage.map.id} has no canonical child Flow.`);
  }
  const timestamp = publishPackage.map.updatedAt;
  return {
    flow: {
      ...first.flow,
      id: `flow-map:${publishPackage.map.id}`,
      slug: `flow-map-${publishPackage.map.id}`,
      title: publishPackage.public.title,
      description: publishPackage.public.summary,
      category: publishPackage.public.categoryLabel ?? first.flow.category,
      structure_type: 'checklist',
      content_type: 'default',
      anchor_type: publishPackage.public.setupInput ? 'start_date' : 'none',
      status: 'published',
      source_title: publishPackage.public.sourceTitle,
      source_url: publishPackage.public.sourceUrl,
      source_status: 'real',
      source_checked_at: timestamp.slice(0, 10),
      primary_destination: 'internal_check',
      created_at: timestamp,
      updated_at: timestamp,
    },
    sections: [],
    items: [],
  };
}

function buildFlowMapTextSyntaxBundle(
  compositeBundle: FlowBundle,
  childBundles: FlowBundle[],
): FlowBundle {
  const warnings = Array.from(new Set(childBundles.flatMap((bundle) => [
    bundle.flow.warning,
    ...(bundle.warnings ?? []),
  ]).flatMap((warning) => warning?.trim() ? [warning.trim()] : [])));

  return {
    ...compositeBundle,
    // Keep every source warning in one explicit list. The composite Flow is a
    // display adapter, so inheriting only the first child's warning would
    // silently drop warnings from later children.
    flow: { ...compositeBundle.flow, warning: undefined },
    items: childBundles.flatMap((bundle) => bundle.items.map((item) => ({
      ...item,
      id: buildFlowMapCanonicalItemId(bundle.flow.slug, item.id),
      flow_id: compositeBundle.flow.id,
    }))),
    itemDetails: childBundles.flatMap((bundle) => (bundle.itemDetails ?? []).map((detail) => ({
      ...detail,
      item_id: buildFlowMapCanonicalItemId(bundle.flow.slug, detail.item_id),
    }))),
    mealSlots: childBundles.flatMap((bundle) => (bundle.mealSlots ?? []).map((slot) => ({
      ...slot,
      id: buildFlowMapCanonicalItemId(bundle.flow.slug, slot.id),
      flow_id: compositeBundle.flow.id,
    }))),
    warnings,
  };
}

function buildFlowMapTextSyntaxProjection(
  projection: ReturnType<typeof buildEffectiveFlowSnapshot>['committed']['projection'],
  mapSnapshot: EffectiveFlowMapSnapshot,
) {
  return {
    ...projection,
    title: mapSnapshot.effectiveTitle,
    outlineRows: projection.outlineRows.map((row) => {
      // `buildCompositeRows` merges public Map memo/detail text for general
      // previews. Text authoring syntax must reserve `내 메모` for the private
      // personalization layer, so remove that merged value here and restore
      // only an actual personal detail override.
      const { memo: _mergedMemo, ...sourceRow } = row;
      const personalDetail = mapSnapshot.itemPersonalizations[
        row.id as keyof typeof mapSnapshot.itemPersonalizations
      ]?.detail?.trim();
      return personalDetail ? { ...sourceRow, memo: personalDetail } : sourceRow;
    }),
  };
}

function mergeMemo(
  row: FlowExperienceProjectionRow,
  mapRow: EffectiveFlowMapSnapshot['canonicalRows'][number],
): string | undefined {
  const detailText = mapRow.detailItems.filter(Boolean).join('\n');
  const parts = [row.memo, mapRow.memo, detailText]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? Array.from(new Set(parts)).join('\n') : undefined;
}

function buildCompositeRows(options: {
  publishPackage: SourceBackedFlowMapPublishPackage;
  mapSnapshot: EffectiveFlowMapSnapshot;
  childBundles: FlowBundle[];
  anchor: string;
}): {
  included: FlowExperienceProjectionRow[];
  excluded: FlowExperienceProjectionRow[];
  sourceDateByItemId: Record<string, string>;
} {
  const childSnapshotBySlug = new Map(options.childBundles.map((bundle) => {
    const dateIntent = resolveChildDateIntent(bundle, options.anchor);
    return [bundle.flow.slug, buildEffectiveFlowSnapshot({
      bundle,
      effectiveTitle: bundle.flow.title,
      dateIntent,
      personalLayerState: 'working',
      editable: false,
    })] as const;
  }));
  const effectiveIds = new Set<string>(options.mapSnapshot.itemIds.effective);
  const multipleChildren = new Set(
    options.mapSnapshot.rows.map((row) => row.flowSlug),
  ).size > 1;
  const included: FlowExperienceProjectionRow[] = [];
  const excluded: FlowExperienceProjectionRow[] = [];
  const sourceDateByItemId: Record<string, string> = {};
  const materializedRowById = new Map([
    ...options.mapSnapshot.rows,
    ...options.mapSnapshot.heldRows,
    ...options.mapSnapshot.excludedRows,
  ].map((mapRow) => [mapRow.itemId, mapRow] as const));
  const includedMapRows = options.mapSnapshot.itemIds.effective.map((itemId) => {
    const mapRow = materializedRowById.get(itemId);
    if (!mapRow) {
      throw new Error(
        `Flow Map ${options.publishPackage.map.id} Item ${itemId} has no materialized effective row.`,
      );
    }
    return mapRow;
  });
  const excludedMapRows = options.mapSnapshot.canonicalRows
    .filter((mapRow) => !effectiveIds.has(mapRow.itemId))
    .map((canonicalRow) => materializedRowById.get(canonicalRow.itemId) ?? canonicalRow);

  const orderedMapRows = [
    ...includedMapRows.map((mapRow) => ({ mapRow, included: true })),
    ...excludedMapRows.map((mapRow) => ({ mapRow, included: false })),
  ];

  orderedMapRows.forEach(({ mapRow, included: isIncluded }, orderRank) => {
    const childSnapshot = childSnapshotBySlug.get(mapRow.flowSlug);
    const childRow = childSnapshot
      ? [...childSnapshot.committed.rows, ...childSnapshot.committed.excludedRows]
          .find((candidate) => candidate.id === mapRow.stepId)
      : undefined;
    if (!childRow) {
      throw new Error(
        `Flow Map ${options.publishPackage.map.id} Item ${mapRow.itemId} has no canonical child projection.`,
      );
    }
    if (isIncluded !== effectiveIds.has(mapRow.itemId)) {
      throw new Error(
        `Flow Map ${options.publishPackage.map.id} Item ${mapRow.itemId} has an inconsistent effective selection.`,
      );
    }
    if (childRow.schedule.date) {
      sourceDateByItemId[mapRow.itemId] = childRow.schedule.date;
    }
    const sectionParts = (multipleChildren
      ? [mapRow.flowTitle, childRow.section]
      : [childRow.section])
      .map((value) => value ? toUserFacingSourceTitle(value) : '')
      .filter(Boolean);
    const section = Array.from(new Set(sectionParts)).join(' · ') || undefined;
    const memo = mergeMemo(childRow, mapRow);
    const sourceUrl = mapRow.sourceUrl?.trim();
    const resources = sourceUrl && !childRow.resources.some((resource) => resource.url === sourceUrl)
      ? [...childRow.resources, { label: '원문 보기', url: sourceUrl, type: 'source' }]
      : childRow.resources;
    const schedule = mapRow.date
      ? { state: 'dated' as const, date: mapRow.date }
      : { ...childRow.schedule };
    const eligibleShapes = mapRow.date
      && !['record', 'resource', 'reference', 'warning'].includes(childRow.role)
      ? Array.from(new Set([...childRow.eligibleShapes, 'calendar' as const]))
      : [...childRow.eligibleShapes];
    const row: FlowExperienceProjectionRow = {
      ...childRow,
      id: mapRow.itemId,
      sourceItemId: mapRow.itemId,
      title: mapRow.title,
      orderRank,
      included: isIncluded,
      ...(section ? { section } : {}),
      ...(memo ? { memo } : {}),
      resources: resources.map((resource) => ({ ...resource })),
      schedule,
      eligibleShapes,
    };
    (isIncluded ? included : excluded).push(row);
  });

  return { included, excluded, sourceDateByItemId };
}

function cloneProjectionRow(
  row: FlowExperienceProjectionRow,
): FlowExperienceProjectionRow {
  return {
    ...row,
    resources: row.resources.map((resource) => ({ ...resource })),
    schedule: { ...row.schedule },
    eligibleShapes: [...row.eligibleShapes],
  };
}

export function buildEffectiveFlowMapResult(options: {
  publishPackage: SourceBackedFlowMapPublishPackage;
  mapSnapshot: EffectiveFlowMapSnapshot;
  anchor?: string;
  q3CopyEnabled?: boolean;
}): EffectiveFlowMapResult {
  const anchor = options.anchor ?? '';
  const childBundles = getChildBundles(options.publishPackage);
  const rows = buildCompositeRows({
    publishPackage: options.publishPackage,
    mapSnapshot: options.mapSnapshot,
    childBundles,
    anchor,
  });
  const compositeBundle = buildCompositeBundle(options.publishPackage, childBundles);
  const dateIntent = resolvePublicDateIntent({
    anchorType: compositeBundle.flow.anchor_type,
    mode: compositeBundle.flow.anchor_type !== 'none' && anchor ? 'custom' : 'undated',
    customAnchor: anchor,
    exampleAnchor: '',
  });
  const snapshot = buildEffectiveFlowSnapshot({
    bundle: compositeBundle,
    effectiveTitle: options.mapSnapshot.effectiveTitle,
    dateIntent,
    personalLayerState: 'working',
    editable: options.mapSnapshot.controller.saveMode === 'save_all',
    resolvedRows: {
      included: rows.included,
      excluded: rows.excluded,
      selectedArtifactMode: 'memo',
      personalOverlayIdentity: {
        kind: 'flow_map',
        mapId: options.mapSnapshot.identity.mapId,
        sourceVersion: options.mapSnapshot.identity.sourceVersion,
        snapshotHash: options.mapSnapshot.snapshotHash,
        childFlowSlugs: options.publishPackage.public.childFlows.map((child) => child.slug),
      },
    },
  });
  const effectiveFlowSlugs = new Set(options.mapSnapshot.rows.map((row) => row.flowSlug));
  const textSourceBundles = childBundles.filter((bundle) => (
    effectiveFlowSlugs.has(bundle.flow.slug)
  ));
  const textSyntaxModel = buildPublicFlowTextSyntaxModel({
    bundle: buildFlowMapTextSyntaxBundle(compositeBundle, textSourceBundles),
    projection: buildFlowMapTextSyntaxProjection(snapshot.committed.projection, options.mapSnapshot),
    itemPersonalizations: options.mapSnapshot.itemPersonalizations,
  });
  const viewModel = buildFlowCapabilityResultViewModel({
    snapshot,
    lifecycle: 'public_preview',
    q3CopyEnabled: options.q3CopyEnabled,
    preferredDestination: 'memo',
  });
  return {
    owner: {
      kind: 'flow_map',
      mapId: options.mapSnapshot.identity.mapId,
      sourceVersion: options.mapSnapshot.identity.sourceVersion,
      snapshotHash: options.mapSnapshot.snapshotHash,
      childFlowSlugs: options.publishPackage.public.childFlows.map((child) => child.slug),
    },
    sourceDateByItemId: { ...rows.sourceDateByItemId },
    previewRows: snapshot.committed.rows.map(cloneProjectionRow),
    editorRows: [
      ...snapshot.committed.rows,
      ...snapshot.committed.excludedRows,
    ].map(cloneProjectionRow),
    viewModel,
    textSyntaxModel,
  };
}
