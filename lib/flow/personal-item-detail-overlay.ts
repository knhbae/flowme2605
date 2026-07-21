export const PERSONAL_ITEM_DETAIL_OVERLAY_VERSION = 1 as const;

export type PersonalItemDetailOrigin = 'source' | 'user_created';

export type PersonalItemDetailSubcheck = {
  id: string;
  text: string;
  origin: PersonalItemDetailOrigin;
};

export type PersonalItemDetailResource = {
  id: string;
  label: string;
  url: string;
  origin: PersonalItemDetailOrigin;
};

type SourceEntryOverride = {
  text?: string;
  hidden?: boolean;
};

type SourceResourceOverride = {
  label?: string;
  url?: string;
  hidden?: boolean;
};

export type PersonalItemDetailOverlay = {
  schemaVersion: typeof PERSONAL_ITEM_DETAIL_OVERLAY_VERSION;
  sourceSubcheckOverrides?: Record<string, SourceEntryOverride>;
  userSubchecks?: Array<{ id: string; text: string }>;
  subcheckOrder?: string[];
  sourceResourceOverrides?: Record<string, SourceResourceOverride>;
  userResources?: Array<{ id: string; label: string; url: string }>;
  resourceOrder?: string[];
};

export type PersonalItemDetailResolution = {
  overlay: PersonalItemDetailOverlay;
  subchecks: PersonalItemDetailSubcheck[];
  hiddenSourceSubchecks: PersonalItemDetailSubcheck[];
  resources: PersonalItemDetailResource[];
  hiddenSourceResources: PersonalItemDetailResource[];
};

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanUrl(value: unknown): string {
  const candidate = cleanText(value);
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
}

function uniqueIds(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)));
}

function orderEntries<T extends { id: string }>(entries: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return [...entries].sort((left, right) => {
    const leftRank = rank.get(left.id);
    const rightRank = rank.get(right.id);
    if (leftRank === undefined && rightRank === undefined) return 0;
    if (leftRank === undefined) return -1;
    if (rightRank === undefined) return 1;
    return leftRank - rightRank;
  });
}

export function createEmptyPersonalItemDetailOverlay(): PersonalItemDetailOverlay {
  return { schemaVersion: PERSONAL_ITEM_DETAIL_OVERLAY_VERSION };
}

export function normalizePersonalItemDetailOverlay(value: unknown): PersonalItemDetailOverlay {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return createEmptyPersonalItemDetailOverlay();
  }
  const source = value as Partial<PersonalItemDetailOverlay>;
  const sourceSubcheckOverrides = Object.fromEntries(
    Object.entries(source.sourceSubcheckOverrides ?? {}).flatMap(([id, entry]) => {
      if (!id.trim() || !entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const text = cleanText(entry.text);
      return [[id, { ...(text ? { text } : {}), ...(entry.hidden === true ? { hidden: true } : {}) }]];
    }),
  );
  const sourceResourceOverrides = Object.fromEntries(
    Object.entries(source.sourceResourceOverrides ?? {}).flatMap(([id, entry]) => {
      if (!id.trim() || !entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const label = cleanText(entry.label);
      const url = cleanUrl(entry.url);
      return [[id, {
        ...(label ? { label } : {}),
        ...(url ? { url } : {}),
        ...(entry.hidden === true ? { hidden: true } : {}),
      }]];
    }),
  );
  const seenUserSubchecks = new Set<string>();
  const userSubchecks = (Array.isArray(source.userSubchecks) ? source.userSubchecks : []).flatMap((entry) => {
    const id = cleanText(entry?.id);
    const text = cleanText(entry?.text);
    if (!id || !text || seenUserSubchecks.has(id)) return [];
    seenUserSubchecks.add(id);
    return [{ id, text }];
  });
  const seenUserResources = new Set<string>();
  const userResources = (Array.isArray(source.userResources) ? source.userResources : []).flatMap((entry) => {
    const id = cleanText(entry?.id);
    const label = cleanText(entry?.label);
    const url = cleanUrl(entry?.url);
    if (!id || !label || !url || seenUserResources.has(id)) return [];
    seenUserResources.add(id);
    return [{ id, label, url }];
  });
  return {
    schemaVersion: PERSONAL_ITEM_DETAIL_OVERLAY_VERSION,
    ...(Object.keys(sourceSubcheckOverrides).length > 0 ? { sourceSubcheckOverrides } : {}),
    ...(userSubchecks.length > 0 ? { userSubchecks } : {}),
    ...(uniqueIds(source.subcheckOrder).length > 0 ? { subcheckOrder: uniqueIds(source.subcheckOrder) } : {}),
    ...(Object.keys(sourceResourceOverrides).length > 0 ? { sourceResourceOverrides } : {}),
    ...(userResources.length > 0 ? { userResources } : {}),
    ...(uniqueIds(source.resourceOrder).length > 0 ? { resourceOrder: uniqueIds(source.resourceOrder) } : {}),
  };
}

export function resolvePersonalItemDetail(options: {
  itemId: string;
  sourceSubchecks: string[];
  sourceResources: Array<{ label: string; url: string }>;
  overlay?: unknown;
}): PersonalItemDetailResolution {
  const overlay = normalizePersonalItemDetailOverlay(options.overlay);
  const sourceSubchecks = options.sourceSubchecks.flatMap((text, index) => {
    const clean = cleanText(text);
    if (!clean) return [];
    const id = `${options.itemId}:source-subcheck:${index}`;
    const override = overlay.sourceSubcheckOverrides?.[id];
    return [{ id, text: cleanText(override?.text) || clean, origin: 'source' as const, hidden: override?.hidden === true }];
  });
  const userSubchecks = (overlay.userSubchecks ?? []).map((entry) => ({ ...entry, origin: 'user_created' as const }));
  const sourceResources = options.sourceResources.flatMap((resource, index) => {
    const label = cleanText(resource.label);
    const url = cleanUrl(resource.url);
    if (!label || !url) return [];
    const id = `${options.itemId}:source-resource:${index}`;
    const override = overlay.sourceResourceOverrides?.[id];
    return [{
      id,
      label: cleanText(override?.label) || label,
      url: cleanUrl(override?.url) || url,
      origin: 'source' as const,
      hidden: override?.hidden === true,
    }];
  });
  const userResources = (overlay.userResources ?? []).map((entry) => ({ ...entry, origin: 'user_created' as const }));

  return {
    overlay,
    subchecks: orderEntries(
      [...sourceSubchecks.filter((entry) => !entry.hidden), ...userSubchecks],
      overlay.subcheckOrder ?? [],
    ).map((entry) => ({ id: entry.id, text: entry.text, origin: entry.origin })),
    hiddenSourceSubchecks: sourceSubchecks
      .filter((entry) => entry.hidden)
      .map((entry) => ({ id: entry.id, text: entry.text, origin: entry.origin })),
    resources: orderEntries(
      [...sourceResources.filter((entry) => !entry.hidden), ...userResources],
      overlay.resourceOrder ?? [],
    ).map((entry) => ({ id: entry.id, label: entry.label, url: entry.url, origin: entry.origin })),
    hiddenSourceResources: sourceResources
      .filter((entry) => entry.hidden)
      .map((entry) => ({ id: entry.id, label: entry.label, url: entry.url, origin: entry.origin })),
  };
}

export function addPersonalDetailSubcheck(
  overlayValue: unknown,
  entry: { id: string; text: string },
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  const text = cleanText(entry.text);
  const id = cleanText(entry.id);
  if (!id || !text) return overlay;
  const userSubchecks = [...(overlay.userSubchecks ?? []).filter((item) => item.id !== id), { id, text }];
  return { ...overlay, userSubchecks, subcheckOrder: [...(overlay.subcheckOrder ?? []), id] };
}

export function updatePersonalDetailSubcheck(
  overlayValue: unknown,
  entry: PersonalItemDetailSubcheck,
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  const text = cleanText(entry.text);
  if (!text) return overlay;
  if (entry.origin === 'source') {
    return {
      ...overlay,
      sourceSubcheckOverrides: {
        ...(overlay.sourceSubcheckOverrides ?? {}),
        [entry.id]: { ...(overlay.sourceSubcheckOverrides?.[entry.id] ?? {}), text },
      },
    };
  }
  return {
    ...overlay,
    userSubchecks: (overlay.userSubchecks ?? []).map((item) => item.id === entry.id ? { ...item, text } : item),
  };
}

export function removePersonalDetailSubcheck(
  overlayValue: unknown,
  entry: PersonalItemDetailSubcheck,
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  if (entry.origin === 'source') {
    return {
      ...overlay,
      sourceSubcheckOverrides: {
        ...(overlay.sourceSubcheckOverrides ?? {}),
        [entry.id]: { ...(overlay.sourceSubcheckOverrides?.[entry.id] ?? {}), hidden: true },
      },
    };
  }
  return {
    ...overlay,
    userSubchecks: (overlay.userSubchecks ?? []).filter((item) => item.id !== entry.id),
    subcheckOrder: (overlay.subcheckOrder ?? []).filter((id) => id !== entry.id),
  };
}

export function restorePersonalDetailSubcheck(
  overlayValue: unknown,
  id: string,
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  const current = overlay.sourceSubcheckOverrides?.[id];
  if (!current) return overlay;
  return {
    ...overlay,
    sourceSubcheckOverrides: {
      ...(overlay.sourceSubcheckOverrides ?? {}),
      [id]: { ...(current.text ? { text: current.text } : {}) },
    },
  };
}

export function movePersonalDetailEntry(
  overlayValue: unknown,
  kind: 'subcheck' | 'resource',
  visibleIds: string[],
  id: string,
  direction: -1 | 1,
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  const index = visibleIds.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= visibleIds.length) return overlay;
  const next = [...visibleIds];
  [next[index], next[target]] = [next[target], next[index]];
  return kind === 'subcheck' ? { ...overlay, subcheckOrder: next } : { ...overlay, resourceOrder: next };
}

export function addPersonalDetailResource(
  overlayValue: unknown,
  entry: { id: string; label: string; url: string },
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  const id = cleanText(entry.id);
  const label = cleanText(entry.label);
  const url = cleanUrl(entry.url);
  if (!id || !label || !url) return overlay;
  const userResources = [...(overlay.userResources ?? []).filter((item) => item.id !== id), { id, label, url }];
  return { ...overlay, userResources, resourceOrder: [...(overlay.resourceOrder ?? []), id] };
}

export function updatePersonalDetailResource(
  overlayValue: unknown,
  entry: PersonalItemDetailResource,
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  const label = cleanText(entry.label);
  const url = cleanUrl(entry.url);
  if (!label || !url) return overlay;
  if (entry.origin === 'source') {
    return {
      ...overlay,
      sourceResourceOverrides: {
        ...(overlay.sourceResourceOverrides ?? {}),
        [entry.id]: { ...(overlay.sourceResourceOverrides?.[entry.id] ?? {}), label, url },
      },
    };
  }
  return {
    ...overlay,
    userResources: (overlay.userResources ?? []).map((item) => item.id === entry.id ? { ...item, label, url } : item),
  };
}

export function removePersonalDetailResource(
  overlayValue: unknown,
  entry: PersonalItemDetailResource,
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  if (entry.origin === 'source') {
    return {
      ...overlay,
      sourceResourceOverrides: {
        ...(overlay.sourceResourceOverrides ?? {}),
        [entry.id]: { ...(overlay.sourceResourceOverrides?.[entry.id] ?? {}), hidden: true },
      },
    };
  }
  return {
    ...overlay,
    userResources: (overlay.userResources ?? []).filter((item) => item.id !== entry.id),
    resourceOrder: (overlay.resourceOrder ?? []).filter((id) => id !== entry.id),
  };
}

export function restorePersonalDetailResource(
  overlayValue: unknown,
  id: string,
): PersonalItemDetailOverlay {
  const overlay = normalizePersonalItemDetailOverlay(overlayValue);
  const current = overlay.sourceResourceOverrides?.[id];
  if (!current) return overlay;
  return {
    ...overlay,
    sourceResourceOverrides: {
      ...(overlay.sourceResourceOverrides ?? {}),
      [id]: {
        ...(current.label ? { label: current.label } : {}),
        ...(current.url ? { url: current.url } : {}),
      },
    },
  };
}
