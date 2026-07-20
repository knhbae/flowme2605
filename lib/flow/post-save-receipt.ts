export type PostSaveHandoff = {
  kind: 'flow' | 'map';
  id: string;
};

export type PostSaveReceiptItem = {
  flowSlug: string;
  itemId: string;
  date?: string;
};

export type CanonicalPostSaveReceipt = {
  title: string;
  flowCount: number;
  totalCount: number;
  datedCount: number;
  undatedCount: number;
  invalidDateCount: number;
  duplicateIdentityCount: number;
  summary: string;
};

const LOCAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isCanonicalLocalDate(value: string): boolean {
  if (!LOCAL_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizeHandoffId(value: string): string {
  return value.trim();
}

export function buildPostSaveHref(handoff: PostSaveHandoff): string {
  const id = normalizeHandoffId(handoff.id);
  if (!id) return '/my';
  const key = handoff.kind === 'map' ? 'savedMap' : 'savedFlow';
  return `/my?${key}=${encodeURIComponent(id)}`;
}

export function parsePostSaveHandoff(search: string): PostSaveHandoff | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const mapId = normalizeHandoffId(params.get('savedMap') ?? '');
  if (mapId) return { kind: 'map', id: mapId };
  const flowId = normalizeHandoffId(params.get('savedFlow') ?? '');
  return flowId ? { kind: 'flow', id: flowId } : undefined;
}

export function buildCanonicalPostSaveReceipt({
  title,
  items,
}: {
  title: string;
  items: PostSaveReceiptItem[];
}): CanonicalPostSaveReceipt {
  const flowSlugs = new Set<string>();
  const identities = new Set<string>();
  let datedCount = 0;
  let invalidDateCount = 0;
  let duplicateIdentityCount = 0;

  items.forEach((item) => {
    const flowSlug = item.flowSlug.trim();
    const itemId = item.itemId.trim();
    if (flowSlug) flowSlugs.add(flowSlug);
    const identity = `${flowSlug}::${itemId}`;
    if (identities.has(identity)) duplicateIdentityCount += 1;
    identities.add(identity);

    const date = item.date?.trim() ?? '';
    if (!date) return;
    if (isCanonicalLocalDate(date)) {
      datedCount += 1;
      return;
    }
    invalidDateCount += 1;
  });

  const totalCount = items.length;
  const undatedCount = totalCount - datedCount;
  const parts = [`할 일 ${totalCount}개`, `날짜 있음 ${datedCount}개`];
  if (undatedCount > 0) parts.push(`날짜 없음 ${undatedCount}개`);

  return {
    title: title.trim() || '저장한 Flow',
    flowCount: flowSlugs.size,
    totalCount,
    datedCount,
    undatedCount,
    invalidDateCount,
    duplicateIdentityCount,
    summary: parts.join(' · '),
  };
}
