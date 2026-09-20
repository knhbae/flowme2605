import { seedBundles } from '../seed-flows';
import type { FlowBundle, FlowItem, FlowItemDetail } from '../types';
import type { ProgramPublicFlow, ProgramPublicItem, ProgramPublicVersion } from './contract';
import { programDate, programIdentifier, safeProgramUrl, validateProgramPublicItem } from './program-data';

export const PROGRAM_CATALOG_SLUGS = ['moving-d30-basic', 'chiangmai-solo-trip-packing'] as const;
export type ProgramCatalogCoverage = {
  flowId: string; versionId: string; sourceSlug: string; sourceItemIds: string[];
  originalSnapshot: string; originalRawText: string; sourceFingerprint: string;
  anchorLabel: string; anchorHint: string; sourceNeedsReview: boolean;
  sourceCheckedAt: string | null; retainedFields: string[]; nonExecutionFields: string[];
};
export type ProgramCatalogAdaptation =
  | { ok: true; flow: ProgramPublicFlow; version: ProgramPublicVersion; coverage: ProgramCatalogCoverage }
  | { ok: false; sourceSlug: string; reason: 'invalid-source' | 'unsupported-fields'; fields: string[] };

function fingerprint(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619) >>> 0;
  return hash.toString(16).padStart(8, '0');
}
function extraDefinedKeys(value: object, allowed: readonly string[], prefix: string): string[] {
  return Object.entries(value).filter(([key, content]) => content !== undefined && !allowed.includes(key)).map(([key]) => `${prefix}.${key}`);
}
const itemKeys = ['id', 'flow_id', 'section_id', 'title', 'description', 'type', 'day_offset', 'duration_days', 'repeat_rule', 'source_type', 'risk_level', 'order'];
const detailKeys = ['item_id', 'source_fragment_ids', 'source_fragment_text', 'why', 'how', 'completion_criteria', 'caution', 'links'];
const flowKeys = ['id', 'slug', 'title', 'description', 'category', 'structure_type', 'content_type', 'anchor_type', 'status', 'source_title', 'source_url', 'source_status', 'source_precision', 'primary_destination', 'setup_anchor_label', 'setup_anchor_hint', 'source_published_at', 'source_modified_at', 'source_checked_at', 'conversion_note', 'risk_level', 'created_at', 'updated_at', 'warning', 'raw_text', 'owner_user_id', 'creator_name', 'creator_role', 'creator_note', 'usage_count', 'copy_count', 'tags', 'stop_conditions', 'principles', 'hold_section'];
const sourceTypeLabel = { official: '공식 정보', creator_experience: '작성자 경험', reference: '참고 자료' };

function itemDescription(bundle: FlowBundle, item: FlowItem, detail?: FlowItemDetail): string {
  const section = bundle.sections.find(row => row.id === item.section_id);
  return [section ? `구간: ${section.title}` : '', section?.description ?? '', item.description ?? '',
    item.source_type ? `내용 구분: ${sourceTypeLabel[item.source_type]}` : '',
    detail?.source_fragment_text ? `원문 발췌: ${detail.source_fragment_text}` : '',
    detail?.why ? `이유: ${detail.why}` : '', detail?.how ? `방법: ${detail.how}` : '',
    detail?.caution ? `주의: ${detail.caution}` : '',
    ...(detail?.links ?? []).map(link => `${link.label} (${link.type}): ${link.url}`)].filter(Boolean).join('\n');
}

/** Copies repository snapshots only. Unsupported execution semantics block the
 * adapter; the exact complete original remains available in coverage. */
export function adaptProgramCatalogBundle(bundle: FlowBundle, ownerId: string): ProgramCatalogAdaptation {
  const sourceSlug = bundle.flow.slug;
  const failed = (reason: 'invalid-source' | 'unsupported-fields', fields: string[]): ProgramCatalogAdaptation => ({ ok: false, sourceSlug, reason, fields });
  if (!programIdentifier(ownerId) || !programIdentifier(bundle.flow.id) || !bundle.items.length || bundle.flow.status !== 'published'
    || !bundle.flow.source_url || !safeProgramUrl(bundle.flow.source_url)) return failed('invalid-source', ['flow.source_url/status/items']);
  const fields = [
    ...extraDefinedKeys(bundle, ['flow', 'sections', 'items', 'itemDetails', 'warnings', 'repeatRules', 'mealSlots', 'recipes'], 'bundle'),
    ...extraDefinedKeys(bundle.flow, flowKeys, 'flow'),
    ...(bundle.repeatRules?.length ? ['bundle.repeatRules'] : []), ...(bundle.mealSlots?.length ? ['bundle.mealSlots'] : []), ...(bundle.recipes?.length ? ['bundle.recipes'] : []),
    ...(!['timeline', 'checklist'].includes(bundle.flow.structure_type) ? ['flow.structure_type'] : []),
    ...(bundle.flow.content_type && bundle.flow.content_type !== 'default' ? ['flow.content_type'] : []),
    ...(!['start_date', 'end_date', 'none'].includes(bundle.flow.anchor_type) ? ['flow.anchor_type'] : []),
  ];
  for (const item of bundle.items) {
    fields.push(...extraDefinedKeys(item, itemKeys, `item:${item.id}`));
    if (item.duration_days !== undefined) fields.push(`item:${item.id}.duration_days`);
    if (item.repeat_rule !== undefined) fields.push(`item:${item.id}.repeat_rule`);
    if (item.type !== 'todo' && item.type !== 'calendar') fields.push(`item:${item.id}.type`);
  }
  for (const detail of bundle.itemDetails ?? []) fields.push(...extraDefinedKeys(detail, detailKeys, `detail:${detail.item_id}`));
  for (const section of bundle.sections) fields.push(...extraDefinedKeys(section, ['id', 'flow_id', 'title', 'description', 'order'], `section:${section.id}`));
  if (fields.length) return failed('unsupported-fields', fields);
  if (new Set(bundle.items.map(item => item.id)).size !== bundle.items.length
    || bundle.items.some(item => item.flow_id !== bundle.flow.id || !Number.isSafeInteger(item.order)
      || item.section_id && !bundle.sections.some(section => section.id === item.section_id)
      || item.day_offset !== undefined && (!Number.isSafeInteger(item.day_offset) || Math.abs(item.day_offset) > 36600))) return failed('invalid-source', ['item.identity/schedule']);
  const flowId = `catalog-${sourceSlug}`;
  const originalSnapshot = JSON.stringify(bundle);
  const sourceFingerprint = fingerprint(originalSnapshot);
  const versionId = `${flowId}-snapshot-${sourceFingerprint}`;
  const ordered = bundle.items.map((item, position) => ({ item, position })).sort((a, b) => a.item.order - b.item.order || a.position - b.position);
  const items: ProgramPublicItem[] = ordered.map(({ item }) => {
    const detail = bundle.itemDetails?.find(row => row.item_id === item.id);
    return { id: item.id, title: item.title, description: itemDescription(bundle, item, detail),
      completionCriteria: detail?.completion_criteria ?? '', sourceUrl: bundle.flow.source_url!,
      schedule: item.day_offset === undefined ? { kind: 'undated' } : { kind: 'relative', days: item.day_offset }, subchecks: [] };
  });
  if (!items.every(validateProgramPublicItem)) return failed('invalid-source', ['projected-item']);
  const checkedAt = bundle.flow.source_checked_at && programDate(bundle.flow.source_checked_at) ? bundle.flow.source_checked_at : null;
  const sourceNeedsReview = bundle.flow.source_status === 'needs_review';
  const summary = [bundle.flow.description ?? '', bundle.flow.warning ? `주의: ${bundle.flow.warning}` : '',
    ...(bundle.warnings ?? []).map(warning => `원본 안내: ${warning}`),
    bundle.flow.conversion_note ? `적용 범위: ${bundle.flow.conversion_note}` : '',
    ...(bundle.flow.stop_conditions ?? []).map(value => `중단 조건: ${value}`), ...(bundle.flow.principles ?? []).map(value => `원칙: ${value}`),
    bundle.flow.hold_section ? [`보류: ${bundle.flow.hold_section.title}`, ...bundle.flow.hold_section.reasons, bundle.flow.hold_section.consequence, bundle.flow.hold_section.memo_template].join('\n') : '',
    sourceNeedsReview ? '출처 재검토가 필요한 기존 자료입니다. 최신 조건은 원문에서 확인하세요.' : '',
    checkedAt ? `저장소의 출처 확인 기록: ${checkedAt}. 이번 실행에서 원문을 다시 확인한 결과는 아닙니다.` : '출처를 확인한 날짜 기록이 없습니다.',
  ].filter(Boolean).join('\n\n');
  const version: ProgramPublicVersion = { id: versionId, flowId, number: 1, parentVersionId: null,
    title: bundle.flow.title, summary, items, source: { kind: 'repository-source', label: bundle.flow.source_title ?? '저장소의 출처 자료', url: bundle.flow.source_url!, checkedAt },
    createdBy: ownerId, createdAt: bundle.flow.updated_at };
  const flow: ProgramPublicFlow = { id: flowId, ownerId, currentVersionId: versionId, category: bundle.flow.category,
    situations: (bundle.flow.tags ?? []).filter(tag => !/P0|검증|후보|다양화/.test(tag)), derivedFrom: null, archived: false };
  return { ok: true, flow, version, coverage: { flowId, versionId, sourceSlug, sourceItemIds: items.map(item => item.id), originalSnapshot,
    originalRawText: bundle.flow.raw_text ?? '', sourceFingerprint, anchorLabel: bundle.flow.setup_anchor_label ?? (bundle.flow.anchor_type === 'end_date' ? '마치는 날' : '시작일'),
    anchorHint: bundle.flow.setup_anchor_hint ?? '', sourceNeedsReview, sourceCheckedAt: checkedAt,
    retainedFields: ['item identity/order/day_offset', 'section title/description', 'description/why/how/completion_criteria/caution', 'all source links', 'source provenance/checkedAt/warnings', 'exact original snapshot'],
    nonExecutionFields: ['usage_count/copy_count: not observed-user evidence', 'creator identity: original snapshot only; local actor is simulated', 'source_fragment_ids/risk metadata/raw text: original snapshot retained'] } };
}

export function buildProgramCatalog(ownerId: string): { flows: ProgramPublicFlow[]; versions: ProgramPublicVersion[]; coverage: ProgramCatalogCoverage[] } {
  const result: ReturnType<typeof buildProgramCatalog> = { flows: [], versions: [], coverage: [] };
  for (const slug of PROGRAM_CATALOG_SLUGS) {
    const bundle = seedBundles.find(row => row.flow.slug === slug);
    if (!bundle) throw new Error(`Missing catalog source: ${slug}`);
    const adapted = adaptProgramCatalogBundle(bundle, ownerId);
    if (!adapted.ok) throw new Error(`Unsupported catalog source ${slug}: ${adapted.fields.join(', ')}`);
    result.flows.push(adapted.flow); result.versions.push(adapted.version); result.coverage.push(adapted.coverage);
  }
  return result;
}

const catalogSourceMetadata = buildProgramCatalog('catalog-source-reader').coverage;
export function programCatalogMetadata(versionId: string): ProgramCatalogCoverage | undefined {
  return catalogSourceMetadata.find(row => row.versionId === versionId);
}
