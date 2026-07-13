import {
  createEmptyPersonalStructuralOverlay,
  resolvePersonalStructuralItems,
  restorePersonalStructuralItem,
  tombstonePersonalStructuralItem,
  upsertPersonalStructuralUserItem,
  type PersonalStructuralItemOwnership,
  type PersonalStructuralOverlay,
  type PersonalStructuralSourceItem,
  type PersonalStructuralUserItem,
  type ResolvePersonalStructuralItemsResult,
} from './personal-structural-overlay';
import type { FlowBundle, FlowItem } from './types';

const PERSONAL_DRAFT_TAG = '내 초안';
const PERSONAL_DRAFT_SOURCE_TITLES = new Set(['내 메모', '사용자가 넣은 링크']);

export type PersonalDraftStructuralUndo = {
  flowSlug: string;
  itemId: string;
  ownership: PersonalStructuralItemOwnership;
  title: string;
};

export function isPersonalDraftStructuralEditEligible(bundle: FlowBundle): boolean {
  return Boolean(
    bundle.flow.status === 'draft' &&
      bundle.flow.slug.startsWith('url-draft-') &&
      bundle.flow.tags?.includes(PERSONAL_DRAFT_TAG) &&
      bundle.flow.source_title &&
      PERSONAL_DRAFT_SOURCE_TITLES.has(bundle.flow.source_title),
  );
}

export function createPersonalDraftStructuralOverlay(bundle: FlowBundle): PersonalStructuralOverlay {
  return createEmptyPersonalStructuralOverlay({
    savedCopyId: bundle.flow.slug,
    flowId: bundle.flow.id,
  });
}

export function getPersonalDraftStructuralSourceItems(
  bundle: FlowBundle,
): PersonalStructuralSourceItem<FlowItem>[] {
  return bundle.items.map((item) => ({
    itemId: item.id,
    title: item.title,
    order: item.order,
    ...(typeof item.day_offset === 'number'
      ? { schedule: { mode: 'anchor_offset' as const, dayOffset: item.day_offset } }
      : {}),
    source: item,
  }));
}

export function resolvePersonalDraftStructuralItems(
  bundle: FlowBundle,
  overlay: PersonalStructuralOverlay,
): ResolvePersonalStructuralItemsResult<FlowItem> {
  return resolvePersonalStructuralItems({
    sourceItems: getPersonalDraftStructuralSourceItems(bundle),
    structuralOverlay: overlay,
  });
}

export function createPersonalDraftUserItem(options: {
  overlay: PersonalStructuralOverlay;
  title: string;
  itemId: string;
  createdAt?: string;
}): { overlay: PersonalStructuralOverlay; userItem: PersonalStructuralUserItem } | undefined {
  const title = options.title.replace(/\s+/g, ' ').trim();
  const itemId = options.itemId.trim();
  if (!title || !itemId) return undefined;

  const createdAt = options.createdAt ?? new Date().toISOString();
  const orderKey = options.overlay.userItems.reduce(
    (largest, item) => Math.max(largest, item.orderKey),
    options.overlay.orderOverride.length - 1,
  ) + 1;
  const userItem: PersonalStructuralUserItem = {
    itemId,
    provenance: 'user_created',
    title,
    createdAt,
    orderKey,
  };
  const nextOverlay = upsertPersonalStructuralUserItem(
    options.overlay,
    userItem,
    createdAt,
  );

  return {
    overlay: nextOverlay,
    userItem,
  };
}

export function deletePersonalDraftStructuralItem(options: {
  bundle: FlowBundle;
  overlay: PersonalStructuralOverlay;
  itemId: string;
  deletedAt?: string;
}): { overlay: PersonalStructuralOverlay; undo: PersonalDraftStructuralUndo } | undefined {
  const resolved = resolvePersonalDraftStructuralItems(options.bundle, options.overlay);
  const item = resolved.effectiveItems.find((entry) => entry.itemId === options.itemId);
  if (!item) return undefined;

  const deletedAt = options.deletedAt ?? new Date().toISOString();
  return {
    overlay: tombstonePersonalStructuralItem(options.overlay, {
      itemId: item.itemId,
      ownership: item.ownership,
      deletedAt,
    }),
    undo: {
      flowSlug: options.bundle.flow.slug,
      itemId: item.itemId,
      ownership: item.ownership,
      title: item.title,
    },
  };
}

export function undoPersonalDraftStructuralDelete(options: {
  overlay: PersonalStructuralOverlay;
  undo: PersonalDraftStructuralUndo;
  restoredAt?: string;
}): PersonalStructuralOverlay {
  return restorePersonalStructuralItem(
    options.overlay,
    options.undo.itemId,
    options.restoredAt,
  );
}
