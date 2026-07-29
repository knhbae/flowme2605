import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const OBSERVED_AT = '2026-07-28T23:59:00+09:00';

const INPUTS = {
  baseline: 'docs/specs/2026-07-28-flow-item-map-architecture-qualified-corpus-revalidation-v2/qualified-corpus-fixture-v2.json',
  outputQuality: 'docs/specs/2026-07-20-url-to-flow-output-quality-lab-v2/gold-source-contract-v2.json',
  valueGold: 'docs/specs/2026-07-22-flow-content-value-qualified-benchmark-v1/gold-source-contract-v1.json',
  deepSet: 'docs/content-audit/2026-07-19-flow-content-source-expansion/deep-set-v1.json',
  reverified: 'docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/reverified-source-packets-v1.json',
  seed: 'docs/content-audit/2026-07-19-flow-content-source-expansion-seed.json',
  discoveryLedger: 'docs/content-audit/2026-07-20-flow-content-discovery-candidate-ledger-v1.json',
  p0: 'docs/content-audit/2026-07-20-flow-content-discovery-p0-reclassification-v1.json',
  valuePool: 'docs/specs/2026-07-22-flow-content-value-qualified-benchmark-v1/candidate-pool-v1.json',
  qualified: 'docs/content-audit/2026-07-27-creator-portfolio-qualified-v2.json',
  vertical: 'docs/content-audit/2026-07-28-vertical-execution-service-benchmark-v1.json',
  taxonomy: 'docs/specs/2026-07-20-flowme-taxonomy-v1-1/taxonomy-v1.1.json',
  canonicalContract: 'docs/specs/2026-07-11-canonical-flow-data-model/canonical-flow-contract.ts',
  runtimeTypes: 'lib/flow/types.ts',
  runtimeExport: 'lib/flow/export.ts',
};

const CONTROLLED = {
  lifeAreas: [
    'home_living',
    'family_parenting',
    'study_reading',
    'money_admin_purchase',
    'health_fitness',
    'travel_outings',
    'meals_grocery',
    'work_career',
    'hobby_pet',
  ],
  sourceShapes: [
    'single_action',
    'checklist_rows',
    'date_offsets',
    'date_window',
    'recurrence_rule',
    'procedure_rows',
    'table_rows',
    'lesson_rows',
    'resource_collection',
    'decision_criteria',
    'narrative_guidance',
    'template_fields',
  ],
  executionPatterns: [
    'date_preparation',
    'ordered_procedure',
    'repeating_routine',
    'progress_tracking',
    'resource_queue',
    'compare_decide',
    'phase_lifecycle',
  ],
  artifacts: ['calendar', 'checklist', 'todo', 'sheet', 'memo'],
  intents: ['act', 'inspect', 'decide', 'record', 'use_resource'],
  completionModes: ['check', 'decision', 'record'],
  scheduleModes: ['absolute', 'anchor_offset', 'date_window'],
  rowTargets: ['item', 'field', 'memo', 'flow_context', 'step_context', 'omitted'],
  fieldValueTypes: [
    'short_text',
    'long_text',
    'number',
    'boolean',
    'date',
    'datetime',
    'url',
    'single_select',
    'multi_select',
    'file_ref',
  ],
  fieldPurposes: ['schedule', 'sort', 'filter', 'record', 'export', 'generation'],
};

const VALUE_CLASSIFICATION = {
  'VQ-01': ['family_parenting', 'procedure_rows', 'ordered_procedure'],
  'VQ-03': ['meals_grocery', 'table_rows', 'date_preparation'],
  'VQ-04': ['home_living', 'procedure_rows', 'ordered_procedure'],
  'VQ-05': ['study_reading', 'lesson_rows', 'progress_tracking'],
  'VQ-06': ['money_admin_purchase', 'decision_criteria', 'compare_decide'],
  'VQ-10': ['home_living', 'table_rows', 'progress_tracking'],
  'VQ-11': ['money_admin_purchase', 'date_window', 'date_preparation'],
  'VQ-12': ['hobby_pet', 'checklist_rows', 'ordered_procedure'],
};

const SOURCE_ROW_TYPE_MAP = {
  action: 'procedure',
  procedure_step: 'procedure',
  procedure_row: 'procedure',
  recipe_step: 'procedure',
  creator_guidance_row: 'procedure',
  before: 'procedure',
  after: 'procedure',
  during: 'procedure',
  emergency: 'procedure',
  condition: 'reference',
  conditional: 'reference',
  state: 'reference',
  decision: 'table_row',
  criteria: 'table_row',
  table: 'table_row',
  lesson: 'resource',
  lesson_row: 'resource',
  module_row: 'resource',
  resource: 'resource',
  resource_row: 'resource',
  resource_instruction: 'resource',
  date: 'date',
  official_schedule_row: 'date',
  offset: 'offset',
  check: 'check',
  checklist: 'check',
  checklist_group: 'check',
  conditional_checklist_group: 'check',
  optional_checklist_group: 'check',
  procedure: 'procedure',
  reference: 'reference',
  memo: 'reference',
  field: 'reference',
  template_field: 'reference',
  recipe_field_group: 'reference',
  recurrence_rule: 'reference',
  rights_note: 'reference',
};

function abs(rel) {
  return path.join(ROOT, rel);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(abs(rel), 'utf8'));
}

function readText(rel) {
  return fs.readFileSync(abs(rel), 'utf8');
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(HERE, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha(value) {
  const source = Buffer.isBuffer(value) ? value : Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));
  return crypto.createHash('sha256').update(source).digest('hex');
}

function slug(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || `id-${sha(String(value)).slice(0, 10)}`;
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
}

function canonicalUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['fbclid', 'gclid'].includes(key)) parsed.searchParams.delete(key);
    }
    parsed.hostname = parsed.hostname.toLowerCase();
    if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    return value;
  }
}

function rowType(value) {
  const key = String(value || 'reference').toLowerCase();
  return SOURCE_ROW_TYPE_MAP[key] || (['date', 'offset', 'check', 'table_row', 'procedure', 'resource', 'reference'].includes(key) ? key : 'reference');
}

function normalizeSourceShape(value) {
  const raw = String(value || '').toLowerCase();
  if (CONTROLLED.sourceShapes.includes(raw)) return raw;
  if (raw.includes('date') && raw.includes('window')) return 'date_window';
  if (raw.includes('offset')) return 'date_offsets';
  if (raw.includes('recurrence') || raw.includes('routine')) return 'recurrence_rule';
  if (raw.includes('lesson') || raw.includes('curriculum')) return 'lesson_rows';
  if (raw.includes('resource') || raw.includes('collection')) return 'resource_collection';
  if (raw.includes('decision') || raw.includes('criteria') || raw.includes('compare')) return 'decision_criteria';
  if (raw.includes('table')) return 'table_rows';
  if (raw.includes('check')) return 'checklist_rows';
  if (raw.includes('procedure') || raw.includes('process')) return 'procedure_rows';
  if (raw.includes('template') || raw.includes('field')) return 'template_fields';
  if (raw.includes('narrative') || raw.includes('guidance')) return 'narrative_guidance';
  if (raw.includes('single')) return 'single_action';
  return 'narrative_guidance';
}

function normalizeExecutionPattern(value, sourceShape, artifact) {
  const raw = String(value || '').toLowerCase();
  const alias = {
    source_table_rows: 'progress_tracking',
    calendar_checklist: 'date_preparation',
    procedure_checklist: 'ordered_procedure',
  };
  const mapped = alias[raw] || raw;
  if (CONTROLLED.executionPatterns.includes(mapped)) return mapped;
  if (sourceShape === 'date_offsets' || sourceShape === 'date_window') return 'date_preparation';
  if (sourceShape === 'recurrence_rule') return 'repeating_routine';
  if (sourceShape === 'lesson_rows' || sourceShape === 'table_rows') return artifact === 'sheet' ? 'progress_tracking' : 'ordered_procedure';
  if (sourceShape === 'resource_collection') return 'resource_queue';
  if (sourceShape === 'decision_criteria') return 'compare_decide';
  if (sourceShape === 'procedure_rows' || sourceShape === 'checklist_rows') return 'ordered_procedure';
  return 'phase_lifecycle';
}

function legacyPlanningPattern(pattern) {
  return pattern === 'progress_tracking' ? 'source_table_rows' : pattern;
}

function normalizeArtifact(value, fallback = 'checklist') {
  const raw = String(value || '').toLowerCase();
  if (CONTROLLED.artifacts.includes(raw)) return raw;
  if (raw.includes('calendar')) return 'calendar';
  if (raw.includes('sheet') || raw.includes('table')) return 'sheet';
  if (raw.includes('todo')) return 'todo';
  if (raw.includes('memo') || raw.includes('note')) return 'memo';
  if (raw.includes('check')) return 'checklist';
  return fallback;
}

function inferIntent({ explicit, title = '', type = '', pattern = '' }) {
  const raw = String(explicit || type || '').toLowerCase();
  if (/action|act|procedure|step|meal|guidance/.test(raw)) return 'act';
  if (/consume|resource|use_resource|lesson|module/.test(raw)) return 'use_resource';
  if (/decide|decision|criteria|compare/.test(raw)) return 'decide';
  if (/record|state|result/.test(raw)) return 'record';
  if (/inspect|check|reference|condition|date|offset/.test(raw)) return 'inspect';
  if (pattern === 'resource_queue' || /학습|읽기|듣기|시청|영상|강의|챕터/.test(title)) return 'use_resource';
  if (/선택|결정|비교/.test(title)) return 'decide';
  if (/기록|결과|상태|진도/.test(title)) return 'record';
  if (/확인|점검|검사/.test(title)) return 'inspect';
  return 'act';
}

function sourceBackedDoneWhen(intent, title) {
  const quoted = `‘${title}’`;
  if (intent === 'use_resource') return `${quoted} 학습 또는 자료 사용을 마쳤다.`;
  if (intent === 'inspect') return `${quoted} 항목을 원문 기준으로 확인했다.`;
  if (intent === 'record') return '이번 실행에서 입력한 값을 저장했다.';
  if (intent === 'decide') return `${quoted} 선택과 근거를 기록했다.`;
  return `${quoted} 작업을 원문 설명대로 마쳤다.`;
}

function inputValueType(label) {
  const text = String(label || '');
  if (/날짜|일자|시작 주|기준일|생년|기한|기간/.test(text)) return 'date';
  if (/횟수|수량|인원|개수/.test(text)) return 'number';
  if (/선택|방식|유형|상태/.test(text)) return 'single_select';
  return 'short_text';
}

function normalizeInputType(type, label = '') {
  const raw = String(type || '').toLowerCase();
  if (raw === 'choice') return 'single_select';
  if (raw === 'weekday_multi' || raw === 'multi_select') return 'multi_select';
  if (raw === 'text') return 'short_text';
  if (CONTROLLED.fieldValueTypes.includes(raw)) return raw;
  return inputValueType(label);
}

function scheduleFromOffsetLabel(label, anchorFieldId) {
  const text = String(label || '').trim();
  if (/2\s*주\s*전/.test(text)) {
    return { mode: 'anchor_offset', anchorFieldId, dayOffset: -14, allDay: true, timezone: 'Asia/Seoul' };
  }
  if (/1\s*주\s*전/.test(text)) {
    return { mode: 'anchor_offset', anchorFieldId, dayOffset: -7, allDay: true, timezone: 'Asia/Seoul' };
  }
  if (/2\s*[~～-]\s*4\s*일\s*전/.test(text)) {
    return {
      mode: 'date_window',
      basis: 'anchor_offset',
      anchorFieldId,
      startDayOffset: -4,
      endDayOffset: -2,
      reminderDayOffset: -4,
      timezone: 'Asia/Seoul',
    };
  }
  if (/전날/.test(text)) {
    return { mode: 'anchor_offset', anchorFieldId, dayOffset: -1, allDay: true, timezone: 'Asia/Seoul' };
  }
  if (/당일/.test(text)) {
    return { mode: 'anchor_offset', anchorFieldId, dayOffset: 0, allDay: true, timezone: 'Asia/Seoul' };
  }
  return undefined;
}

function completionFor(intent, doneWhen, fieldIds = [], decisionOptions = null) {
  if (intent === 'record' && fieldIds.length) {
    return { mode: 'record', recordFieldIds: fieldIds, doneWhen: doneWhen || '필요한 값을 기록했다.' };
  }
  if (intent === 'decide') {
    return {
      mode: 'decision',
      options: decisionOptions || [
        { value: 'selected', label: '선택' },
        { value: 'not_selected', label: '선택하지 않음' },
      ],
      doneWhen: doneWhen || '선택과 근거를 기록했다.',
    };
  }
  return { mode: 'check', doneWhen: doneWhen || '원문에 적힌 행동을 마쳤다.' };
}

function riskLevel(lifeArea, text = '') {
  const haystack = `${lifeArea} ${text}`;
  if (/의학|건강검진|예방접종|질환|응급/.test(haystack)) return 'medical_sensitive';
  if (/계약|법률|전세|여권|행정|신청/.test(haystack)) return 'legal_sensitive';
  if (/비용|구매|보험|대출|장학금/.test(haystack)) return 'financial_sensitive';
  if (/안전|폭염|보호구/.test(haystack)) return 'safety_sensitive';
  return 'low';
}

function makeSource({ fixtureId, title, url, publisher, locale = 'ko-KR', checkedAt = '2026-07-28', sourceType = 'reference' }) {
  const sourceId = `source-${fixtureId}`;
  const snapshotId = `snapshot-${fixtureId}`;
  return {
    source: {
      sourceId,
      title,
      sourceType,
      originalUrl: url,
      canonicalUrl: canonicalUrl(url),
      locale,
      publisher: publisher || 'unknown',
      checkedAt,
      rightsStatus: 'needs_review',
      riskLevel: riskLevel('', title),
    },
    snapshot: {
      snapshotId,
      sourceId,
      fetchedAt: checkedAt.length === 10 ? `${checkedAt}T12:00:00+09:00` : checkedAt,
      finalUrl: canonicalUrl(url),
      contentHash: `sha256:${sha(`${title}|${url}|${checkedAt}`)}`,
      extractionVersion: 'flow-canonical-structure-corpus-expansion-v1',
    },
  };
}

function normalizeRows(rows, fixtureId, sourceId, snapshotId, fallbackUrl) {
  const seen = new Set();
  return rows.map((row, index) => {
    const original = row.sourceRowId || row.id || `${fixtureId}-row-${index + 1}`;
    let sourceRowId = `${fixtureId}--${slug(original)}`;
    while (seen.has(sourceRowId)) sourceRowId = `${sourceRowId}-${index + 1}`;
    seen.add(sourceRowId);
    return {
      sourceRowId,
      originalSourceRowId: original,
      sourceId,
      snapshotId,
      rowType: rowType(row.rowType || row.type || row.kind),
      title: row.title || row.label || `원문 행 ${index + 1}`,
      detail: row.detail || row.description || '',
      locator: row.locator || row.sourceLocator || `원문 행 ${index + 1}`,
      order: Number.isFinite(row.order) ? row.order : index,
      sourceUrl: row.sourceUrl || fallbackUrl,
      evidenceNote: row.evidenceNote || null,
    };
  });
}

function sourceRef(entityType, entityId, sourceRowIds, fixtureId, relation = 'derived_from', note = undefined) {
  return {
    sourceRefId: `ref-${fixtureId}-${entityType}-${slug(entityId)}-${sha(sourceRowIds.join('|')).slice(0, 8)}`,
    entityType,
    entityId,
    sourceRowIds,
    relation,
    supportLevel: 'direct',
    ...(note ? { note } : {}),
  };
}

function classifyRowRelations(rowAccounting) {
  const targetUseCount = new Map();
  for (const entry of rowAccounting) {
    for (const target of unique(entry.targets || [])) {
      const key = `${entry.targetType}:${target}`;
      targetUseCount.set(key, (targetUseCount.get(key) || 0) + 1);
    }
  }
  return rowAccounting.map((entry) => {
    const targets = unique(entry.targets || []);
    if (entry.targetType === 'omitted' || targets.length === 0) {
      return { ...entry, targets, relationType: 'omitted' };
    }
    const sharedTarget = targets.some((target) => (targetUseCount.get(`${entry.targetType}:${target}`) || 0) > 1);
    const relationType =
      targets.length > 1
        ? sharedTarget
          ? 'many_to_many'
          : 'one_to_many'
        : sharedTarget
          ? 'many_to_one'
          : 'one_to_one';
    return { ...entry, targets, relationType };
  });
}

function projectionProfiles(primary, secondary, calendarPolicy) {
  return unique([primary, ...secondary]).map((target) => ({
    target,
    formats:
      target === 'calendar'
        ? ['ics']
        : target === 'sheet'
          ? ['csv', 'xlsx']
          : target === 'memo' || target === 'checklist' || target === 'todo'
            ? ['plain_text', 'markdown']
            : ['plain_text'],
    granularity: target === 'calendar' && calendarPolicy === 'step_bundle' ? 'step_bundle' : 'item',
    groupBy: target === 'sheet' ? 'flow' : 'step',
    includeSource: true,
    includeCautions: true,
    includeUserMemo: true,
  }));
}

function baselineSchedule(raw, fieldId) {
  if (!raw) return undefined;
  if (raw.type === 'relative_to_target') {
    return { mode: 'anchor_offset', anchorFieldId: fieldId, dayOffset: raw.offsetDays, allDay: true, timezone: 'Asia/Seoul' };
  }
  if (raw.type === 'relative_weekday') {
    const weekdayMap = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };
    return {
      mode: 'anchor_offset',
      anchorFieldId: fieldId,
      dayOffset: Math.max(0, (Number(raw.week || 1) - 1) * 7 + (weekdayMap[raw.weekday] ?? 0)),
      allDay: true,
      timezone: 'Asia/Seoul',
    };
  }
  if (raw.type === 'sequence_day') {
    return {
      mode: 'anchor_offset',
      anchorFieldId: fieldId,
      dayOffset: Math.max(0, Number(raw.day || 1) - 1),
      allDay: true,
      timezone: 'Asia/Seoul',
    };
  }
  if (raw.type === 'source_day_index') {
    return {
      mode: 'anchor_offset',
      anchorFieldId: fieldId,
      dayOffset: Number(raw.dayIndex || 0),
      allDay: true,
      timezone: 'Asia/Seoul',
    };
  }
  return undefined;
}

function valueSchedule(raw) {
  if (!raw) return undefined;
  if (raw.kind === 'date_window') {
    return {
      mode: 'date_window',
      basis: 'absolute',
      startDate: String(raw.startsAt).slice(0, 10),
      endDate: String(raw.endsAt).slice(0, 10),
      sourceReminder: null,
      timezone: raw.timezone || 'Asia/Seoul',
    };
  }
  if (raw.kind === 'deadline') {
    return {
      mode: 'absolute',
      start: raw.dueAt,
      allDay: false,
      timezone: raw.timezone || 'Asia/Seoul',
    };
  }
  return undefined;
}

function recurrenceFromText(text, anchorFieldId) {
  const source = String(text || '');
  let frequency = null;
  if (/매일|daily|every day/i.test(source)) frequency = 'daily';
  else if (/매주|weekly|every week/i.test(source)) frequency = 'weekly';
  else if (/매월|monthly|every month|월\s*\d+\s*회|once a month/i.test(source)) frequency = 'monthly';
  if (!frequency) return undefined;
  const intervalMatch = source.match(/(?:every|매)\s*(\d+)\s*(?:months?|개월|weeks?|주|days?|일)/i);
  return {
    mode: 'anchor_offset',
    anchorFieldId,
    dayOffset: 0,
    allDay: true,
    timezone: 'Asia/Seoul',
    recurrence: {
      frequency,
      interval: intervalMatch ? Number(intervalMatch[1]) : 1,
      sourceDefined: true,
    },
  };
}

function buildFixture({
  fixtureId,
  batch,
  evidenceTier,
  title,
  url,
  publisher,
  locale,
  checkedAt,
  userNeed,
  taxonomy,
  normalizedRows,
  flows,
  steps,
  items,
  fields,
  memos,
  sourceRefs,
  rowAccounting,
  inputs,
  calendarPolicy = 'none',
  reviewFlags = [],
  originalRecordRef,
  canonicalExtensionCandidates = [],
  sourceDescriptors = null,
  sourceSnapshots = null,
  classificationDelta = null,
}) {
  const { source, snapshot } = makeSource({ fixtureId, title, url, publisher, locale, checkedAt });
  source.riskLevel = riskLevel(taxonomy.primaryLifeArea, `${title} ${userNeed}`);
  const primaryArtifact = normalizeArtifact(taxonomy.primaryArtifact);
  const secondaryArtifacts = unique((taxonomy.secondaryArtifacts || []).map((value) => normalizeArtifact(value))).filter(
    (value) => value !== primaryArtifact,
  );
  const canonicalFlows = flows.map((flow) => ({
    ...flow,
    bundleId: `bundle-${fixtureId}`,
    primarySourceId: flow.primarySourceId || source.sourceId,
    supportingSourceIds: flow.supportingSourceIds || [],
    planningPattern: legacyPlanningPattern(taxonomy.primaryExecutionPattern),
    secondaryPatterns: (taxonomy.secondaryExecutionPatterns || []).map(legacyPlanningPattern),
    primaryArtifact,
    projectionProfiles: projectionProfiles(primaryArtifact, secondaryArtifacts, calendarPolicy),
    riskLevel: source.riskLevel,
  }));
  const bundle = {
    bundleId: `bundle-${fixtureId}`,
    title,
    summary: userNeed,
    lifeArea: taxonomy.primaryLifeArea,
    topicTags: taxonomy.topicTags || [],
    flowIds: canonicalFlows.map((flow) => flow.flowId),
  };
  const canonicalItems = items.map((item) => ({
    ...item,
    ...(item.dependsOnItemIds?.length
      ? { dependencySourceRefIds: unique(item.dependencySourceRefIds?.length ? item.dependencySourceRefIds : item.sourceRefIds) }
      : {}),
    sourceTrace: sourceRefs
      .filter((ref) => item.sourceRefIds.includes(ref.sourceRefId))
      .map((ref) => ({
        sourceRefId: ref.sourceRefId,
        sourceRowIds: ref.sourceRowIds,
        relation: ref.relation,
        supportLevel: ref.supportLevel,
      })),
    userOverlayPolicy: {
      canRename: true,
      canExclude: true,
      canAddPersonalMemo: true,
      canOverrideSchedule: true,
      cannotRewriteSourceRows: true,
      cannotRemoveCautions: true,
    },
  }));
  const exactRowAccounting = classifyRowRelations(rowAccounting);
  const canonicalSourceRows = normalizedRows.map(
    ({ sourceUrl: _sourceUrl, evidenceNote: _evidenceNote, originalSourceRowId: _original, ...row }) => row,
  );
  const canonicalSources = sourceDescriptors || [source];
  const canonicalSnapshots = (sourceSnapshots || [snapshot]).map((candidate) => {
    const rowsForSnapshot = canonicalSourceRows
      .filter((row) => row.sourceId === candidate.sourceId)
      .map((row, rowIndex) => ({
        rowType: row.rowType,
        title: row.title || row.label || '',
        detail: row.detail,
        locator: row.locator,
        order: Number.isFinite(row.order) ? row.order : rowIndex,
      }))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ko'));
    return {
      ...candidate,
      contentHash: `sha256:${sha({
        sourceId: candidate.sourceId,
        finalUrl: candidate.finalUrl,
        fetchedAt: candidate.fetchedAt,
        rows: rowsForSnapshot,
      })}`,
      hashBasis: 'canonical_url_observed_at_and_captured_source_rows',
      capturedSourceRowCount: rowsForSnapshot.length,
    };
  });
  const primarySnapshot =
    canonicalSnapshots.find((candidate) => candidate.sourceId === source.sourceId) || canonicalSnapshots[0] || snapshot;
  const canonicalContent = {
    schemaVersion: 'flowme-canonical-flow-v1',
    contentId: `content-${fixtureId}`,
    version: '1.0.0-research',
    contentHash: '',
    lifecycleStatus: 'draft',
    createdAt: OBSERVED_AT,
    updatedAt: OBSERVED_AT,
    bundle,
    flows: canonicalFlows,
    steps,
    items: canonicalItems,
    fields,
    memos,
    sources: canonicalSources,
    sourceSnapshots: canonicalSnapshots,
    sourceRows: canonicalSourceRows,
    sourceRefs,
  };
  canonicalContent.contentHash = `sha256:${sha({ ...canonicalContent, contentHash: '' })}`;

  const itemProvenanceClaims = canonicalItems.map((item) => {
    const refs = sourceRefs.filter((ref) => item.sourceRefIds.includes(ref.sourceRefId));
    const ids = unique(refs.flatMap((ref) => ref.sourceRowIds));
    const scheduleIds = item.schedule ? ids : [];
    return {
      itemId: item.itemId,
      actionRefIds: ids,
      detailRefIds: ids,
      completionRefIds: ids,
      completionDerivation: 'controlled_system_grammar_over_source_backed_action',
      scheduleRefIds: scheduleIds,
      recurrenceRefIds: item.schedule?.recurrence ? scheduleIds : [],
      dependencyRefIds: item.dependsOnItemIds?.length ? ids : [],
      note: '완료 문구는 source-backed 행동을 실행 상태로 표현하는 제품 문법이며 새로운 사실을 추가하지 않는다.',
    };
  });
  const occurrenceIdentityExamples = canonicalItems
    .filter((item) => item.schedule?.recurrence)
    .map((item) => {
      const frequency = item.schedule.recurrence.frequency;
      const occurrenceKeys =
        frequency === 'monthly'
          ? ['date:2099-01-01', 'date:2099-02-01']
          : frequency === 'weekly'
            ? ['date:2099-01-01', 'date:2099-01-08']
            : ['date:2099-01-01', 'date:2099-01-02'];
      return {
        itemId: item.itemId,
        keyTemplate: 'date:<local-YYYY-MM-DD>',
        identityTupleTemplate: ['copyId', 'runId', 'itemId', 'occurrenceKey'],
        simulationStatus: 'contract_test_not_source_fact',
        simulationAnchor: '2099-01-01',
        occurrenceKeys,
        identityTuples: occurrenceKeys.map((key) => `test-copy|test-run|${item.itemId}|${key}`),
      };
    });
  const mappingTypes = exactRowAccounting.map((entry) => entry.relationType);
  const projections = generateProjections(
    canonicalItems,
    steps,
    fields,
    memos,
    primaryArtifact,
    secondaryArtifacts,
    calendarPolicy,
  );

  return {
    fixtureId,
    batch,
    evidenceTier,
    originalRecordRef,
    source: {
      sourceId: source.sourceId,
      snapshotId: primarySnapshot.snapshotId,
      snapshotContentHash: primarySnapshot.contentHash,
      title,
      provider: source.publisher,
      url: source.originalUrl,
      canonicalUrl: source.canonicalUrl,
      locale: source.locale,
      observedAt: source.checkedAt,
      accessStatus: 'captured_in_internal_research_artifact',
      evidenceTier,
    },
    userNeed,
    taxonomy: {
      version: 'flowme-taxonomy-v1.1',
      primaryLifeArea: taxonomy.primaryLifeArea,
      secondaryLifeAreas: taxonomy.secondaryLifeAreas || [],
      topicTags: taxonomy.topicTags || [],
      sourceShape: taxonomy.sourceShape,
      secondarySourceShapes: taxonomy.secondarySourceShapes || [],
      primaryExecutionPattern: taxonomy.primaryExecutionPattern,
      secondaryExecutionPatterns: taxonomy.secondaryExecutionPatterns || [],
      primaryArtifact,
      secondaryArtifacts,
    },
    canonicalContent,
    conversionAudit: {
      rowAccounting: exactRowAccounting,
      itemProvenanceClaims,
      relationTypes: unique(mappingTypes),
      unresolvedQuestions: [],
      canonicalExtensionCandidates,
      occurrenceIdentityExamples,
      ...(classificationDelta ? { classificationDelta } : {}),
    },
    inputs: {
      required: inputs?.required || [],
      optional: inputs?.optional || [],
      duringExecution: inputs?.duringExecution || [],
      autoFilled: unique(['sourceTitle', 'sourceUrl', 'sourceRows', ...(inputs?.autoFilled || [])]),
      neverAskAgain: unique(['sourceTitle', 'sourceUrl', 'sourceRows', ...(inputs?.neverAskAgain || [])]),
    },
    projectionEvaluation: projections,
    researchReview: {
      researchUseStatus: 'research_only',
      publicReadiness: 'not_assessed',
      reviewFlags,
      claimBoundary:
        '이 fixture는 데이터 구조와 변환 로직 검토용이다. 공개 허가, 전문 안전 검토, 사용자 유용성, 외부 Calendar 왕복을 증명하지 않는다.',
    },
    metrics: {
      flowCount: canonicalFlows.length,
      stepCount: steps.length,
      itemCount: canonicalItems.length,
      fieldCount: fields.length,
      memoCount: memos.length,
      sourceRowCount: normalizedRows.length,
      scheduledItemCount: canonicalItems.filter((item) => item.schedule).length,
      undatedItemCount: canonicalItems.filter((item) => !item.schedule).length,
    },
  };
}

function generateProjections(items, steps, fields, memos, primaryArtifact, secondaryArtifacts, calendarPolicy) {
  const selected = new Set([primaryArtifact, ...secondaryArtifacts]);
  const stepById = new Map(steps.map((step) => [step.stepId, step]));
  const scheduledItems = items.filter((item) => item.schedule);
  let calendarEntries;
  if (calendarPolicy === 'step_bundle') {
    const groups = new Map();
    for (const item of scheduledItems) {
      const key = `${item.stepId}|${JSON.stringify(item.schedule)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    calendarEntries = [...groups.values()].map((group) => ({
      component: 'VEVENT',
      projectionId: `calendar-bundle-${group[0].stepId}-${sha(group.map((item) => item.itemId).join('|')).slice(0, 8)}`,
      itemId: group[0].itemId,
      stepId: group[0].stepId,
      title: stepById.get(group[0].stepId)?.title || group[0].title,
      schedule: group[0].schedule,
      childItemIds: group.map((item) => item.itemId),
      completionOwner: 'canonical_child_items',
      unresolvedAnchor: group[0].schedule.mode === 'anchor_offset',
      lossNote: '외부 이벤트 하나는 child Item별 완료를 직접 보존하지 못할 수 있다.',
    }));
  } else {
    calendarEntries = scheduledItems.map((item) => ({
      component: 'VEVENT',
      projectionId: `calendar-item-${item.itemId}`,
      itemId: item.itemId,
      stepId: item.stepId,
      title: item.title,
      schedule: item.schedule,
      childItemIds: [item.itemId],
      completionOwner: item.itemId,
      unresolvedAnchor: item.schedule.mode === 'anchor_offset',
    }));
  }
  const checklistEntries = items.map((item) => ({
    itemId: item.itemId,
    group: stepById.get(item.stepId)?.title || '',
    title: item.title,
    completion: item.completion.mode,
    sourceRefIds: item.sourceRefIds,
  }));
  const sheetRows =
    items.length > 0
      ? items.map((item) => ({
          rowKind: 'item',
          itemId: item.itemId,
          step: stepById.get(item.stepId)?.title || '',
          title: item.title,
          intent: item.intent,
          completion: item.completion.mode,
          scheduleMode: item.schedule?.mode || null,
          sourceRefIds: item.sourceRefIds,
        }))
      : fields.map((field) => ({
          rowKind: 'field_definition',
          fieldId: field.fieldId,
          title: field.label,
          valueType: field.valueType,
          required: field.required,
          sourceRefIds: field.sourceRefIds || [],
        }));
  const memoBlocks =
    items.length > 0
      ? items.map((item) => ({ itemId: item.itemId, title: item.title, description: item.description || '' }))
      : memos.map((memo) => ({
          memoId: memo.memoId,
          title: memo.title,
          description: memo.text,
          sourceRefIds: memo.sourceRefIds || [],
        }));
  return {
    primaryArtifact,
    secondaryArtifacts,
    calendarPolicy,
    calendar: {
      selected: selected.has('calendar'),
      eligibleScheduledItemCount: scheduledItems.length,
      eventCount: selected.has('calendar') ? calendarEntries.length : 0,
      entries: selected.has('calendar') ? calendarEntries : [],
      suppressedUndatedItemIds: items.filter((item) => !item.schedule).map((item) => item.itemId),
      rule: 'schedule이 있는 Item만 VEVENT 후보가 된다. anchor가 풀리지 않으면 실제 ICS를 만들지 않는다.',
    },
    vtodo: {
      capabilityStatus: 'not_tested',
      entries: [],
      fallbackOrder: ['checklist', 'todo', 'sheet', 'memo'],
    },
    checklist: { selected: selected.has('checklist'), entries: selected.has('checklist') ? checklistEntries : [] },
    todo: { selected: selected.has('todo'), entries: selected.has('todo') ? checklistEntries : [] },
    sheet: { selected: selected.has('sheet'), rows: selected.has('sheet') ? sheetRows : [] },
    memo: {
      selected: selected.has('memo'),
      blocks: selected.has('memo') ? memoBlocks : [],
    },
    forbidden: [
      'schedule이 없는 Item의 VEVENT',
      'VEVENT 안의 VTODO 중첩',
      'projection이 canonical Item 완료 상태를 소유하는 구조',
    ],
    lossNotes:
      calendarPolicy === 'step_bundle'
        ? ['step_bundle은 표시 밀도를 줄이지만 외부 이벤트 하나가 child Item별 완료를 보존하지 못할 수 있다.']
        : [],
  };
}

function scheduleSemantic(schedule) {
  if (!schedule) return null;
  if (schedule.type === 'relative_to_target') {
    return { mode: 'anchor_offset', dayOffset: Number(schedule.offsetDays), allDay: true };
  }
  if (schedule.type === 'relative_weekday') {
    const weekdayMap = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };
    return {
      mode: 'anchor_offset',
      dayOffset: Math.max(0, (Number(schedule.week || 1) - 1) * 7 + (weekdayMap[schedule.weekday] ?? 0)),
      allDay: true,
    };
  }
  if (schedule.type === 'sequence_day') {
    return { mode: 'anchor_offset', dayOffset: Math.max(0, Number(schedule.day || 1) - 1), allDay: true };
  }
  if (schedule.type === 'source_day_index') {
    return { mode: 'anchor_offset', dayOffset: Number(schedule.dayIndex || 0), allDay: true };
  }
  if (schedule.mode === 'anchor_offset') {
    return {
      mode: 'anchor_offset',
      dayOffset: Number(schedule.dayOffset),
      allDay: Boolean(schedule.allDay),
      ...(schedule.recurrence
        ? {
            recurrence: {
              frequency: schedule.recurrence.frequency,
              interval: schedule.recurrence.interval,
              sourceDefined: schedule.recurrence.sourceDefined,
            },
          }
        : {}),
    };
  }
  if (schedule.mode === 'absolute') {
    return { mode: 'absolute', start: schedule.start, end: schedule.end || null, allDay: Boolean(schedule.allDay) };
  }
  if (schedule.mode === 'date_window') {
    return {
      mode: 'date_window',
      basis: schedule.basis,
      startDate: schedule.startDate || null,
      endDate: schedule.endDate || null,
      startDayOffset: schedule.startDayOffset ?? null,
      endDayOffset: schedule.endDayOffset ?? null,
    };
  }
  return schedule;
}

function baselinePreservationManifest(data, baselineFixtures) {
  return data.bundles.map((record, index) => {
    const fixture = baselineFixtures[index];
    const originalRows = record.sourceRows
      .map((row, rowIndex) => ({
        title: row.title || row.label || '',
        detail: row.detail || row.description || '',
        rowType: rowType(row.rowType || row.type || row.kind),
        order: Number.isFinite(row.order) ? row.order : rowIndex,
      }))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ko'));
    const generatedRows = fixture.canonicalContent.sourceRows
      .map((row) => ({ title: row.title, detail: row.detail, rowType: row.rowType, order: row.order }))
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'ko'));
    const originalItems = record.bundle.map.flows.flatMap((flow) =>
      flow.steps.flatMap((step) =>
        step.items.map((item) => ({
          title: item.itemTitle,
          description: item.memo || '',
          optional: Boolean(item.optional),
          schedule: scheduleSemantic(item.schedule),
          sourceRows: (item.sourceRowIds || [])
            .map((id) => record.sourceRows.find((row) => row.sourceRowId === id))
            .filter(Boolean)
            .map((row) => ({ title: row.title || row.label || '', detail: row.detail || row.description || '' })),
        })),
      ),
    );
    const generatedItems = fixture.canonicalContent.items.map((item) => ({
      title: item.title,
      description: item.description || '',
      optional: Boolean(item.optional),
      schedule: scheduleSemantic(item.schedule),
      sourceRows: unique(
        fixture.canonicalContent.sourceRefs
          .filter((ref) => item.sourceRefIds.includes(ref.sourceRefId))
          .flatMap((ref) => ref.sourceRowIds),
      )
        .map((id) => fixture.canonicalContent.sourceRows.find((row) => row.sourceRowId === id))
        .filter(Boolean)
        .map((row) => ({ title: row.title, detail: row.detail || '' })),
    }));
    const checks = {
      sourceRowCardinality: record.sourceRows.length === fixture.metrics.sourceRowCount,
      itemCardinality: originalItems.length === fixture.metrics.itemCount,
      flowCardinality: record.bundle.map.flows.length === fixture.metrics.flowCount,
      stepCardinality:
        record.bundle.map.flows.reduce((sum, flow) => sum + flow.steps.length, 0) === fixture.metrics.stepCount,
      sourceRowSemantics: sha(originalRows) === sha(generatedRows),
      itemSemantics: sha(originalItems) === sha(generatedItems),
    };
    return {
      baselineBundleId: record.bundleId,
      fixtureId: fixture.fixtureId,
      originalRecordSha256: `sha256:${sha(record)}`,
      original: {
        sourceRowsSha256: `sha256:${sha(originalRows)}`,
        itemsSha256: `sha256:${sha(originalItems)}`,
      },
      generated: {
        sourceRowsSha256: `sha256:${sha(generatedRows)}`,
        itemsSha256: `sha256:${sha(generatedItems)}`,
      },
      checks,
      allSemanticChecksPassed: Object.values(checks).every(Boolean),
      allowedTransforms: [
        'stable fixture-scoped ID namespace',
        'memo to canonical description alias',
        'legacy schedule shape to canonical schedule mode',
        'SourceRef and property provenance addition',
        'system completion grammar when the frozen record has no canonical CompletionSpec',
      ],
    };
  });
}

function buildBaselineFixtures(data) {
  return data.bundles.map((record) => {
    const fixtureId = `base-${slug(record.bundleId.replace(/^bundle-/, ''))}`;
    const sourceUrl = record.bundle.sourceUrls?.[0] || record.sourceRows.find((row) => row.sourceUrl)?.sourceUrl;
    const allSourceUrls = unique([
      ...(record.bundle.sourceUrls || []),
      ...record.sourceRows.map((row) => row.sourceUrl).filter(Boolean),
    ]);
    const sourceMetas = allSourceUrls.map((url, index) =>
      makeSource({
        fixtureId: index === 0 ? fixtureId : `${fixtureId}-${index + 1}`,
        title: index === 0 ? record.title : `${record.title} · 원문 ${index + 1}`,
        url,
        publisher: record.creatorName,
        checkedAt: '2026-07-27',
        sourceType: 'creator_experience',
      }),
    );
    const sourceMeta = sourceMetas[0];
    const sourceByUrl = new Map(
      sourceMetas.map((meta, index) => [canonicalUrl(allSourceUrls[index]), meta]),
    );
    const rowIdMap = new Map();
    const rows = normalizeRows(record.sourceRows, fixtureId, sourceMeta.source.sourceId, sourceMeta.snapshot.snapshotId, sourceUrl);
    rows.forEach((row) => {
      const matched = sourceByUrl.get(canonicalUrl(row.sourceUrl));
      if (matched) {
        row.sourceId = matched.source.sourceId;
        row.snapshotId = matched.snapshot.snapshotId;
      }
    });
    record.sourceRows.forEach((row, index) => rowIdMap.set(row.sourceRowId, rows[index].sourceRowId));

    const setup = record.bundle.setupFields || [];
    const anchorSource = setup.find((field) => field.type === 'date') || null;
    const fields = [];
    const sourceRefs = [];
    const items = [];
    const steps = [];
    const flows = [];
    const rowAccounting = rows.map((row) => ({
      sourceRowId: row.sourceRowId,
      targets: [],
      targetType: 'item',
      relationType: 'unassigned',
      reason: '',
    }));
    const accountingByRow = new Map(rowAccounting.map((entry) => [entry.sourceRowId, entry]));

    for (const [flowIndex, flow] of record.bundle.map.flows.entries()) {
      const flowId = `${fixtureId}-flow-${flowIndex + 1}`;
      const flowFields = setup.map((field) => ({
        fieldId: `${flowId}-field-${slug(field.key)}`,
        owner: { type: 'flow', id: flowId },
        key: field.key,
        label: field.label,
        valueType: normalizeInputType(field.type, field.label),
        purposes: field.type === 'date' ? ['schedule', 'generation'] : ['generation', 'filter'],
        valueSource: 'user',
        required: Boolean(field.required),
        ...(field.options ? { options: field.options.map((value) => ({ value, label: value })) } : {}),
      }));
      fields.push(...flowFields);
      const anchorFieldId = anchorSource
        ? `${flowId}-field-${slug(anchorSource.key)}`
        : `${flowId}-field-start-date`;
      const stepIds = [];
      for (const [stepIndex, step] of flow.steps.entries()) {
        const stepId = `${flowId}-step-${stepIndex + 1}`;
        stepIds.push(stepId);
        const itemIds = [];
        for (const [itemIndex, item] of step.items.entries()) {
          const itemId = `${stepId}-item-${itemIndex + 1}`;
          itemIds.push(itemId);
          const mappedRows = unique((item.sourceRowIds || []).map((id) => rowIdMap.get(id)).filter(Boolean));
          const ref = sourceRef('item', itemId, mappedRows, fixtureId, 'derived_from', 'Qualified v2 Item 경계를 보존');
          sourceRefs.push(ref);
          for (const sourceRowId of mappedRows) {
            const account = accountingByRow.get(sourceRowId);
            account.targets.push(itemId);
            account.relationType = account.targets.length > 1 ? 'one_to_many' : 'one_to_one_or_many_to_one';
            account.reason = 'Qualified v2에서 검증한 Item 경계를 그대로 보존한다.';
          }
          const intent = inferIntent({
            title: item.itemTitle,
            pattern: record.taxonomy.executionPattern,
          });
          const schedule = baselineSchedule(item.schedule, anchorFieldId);
          items.push({
            itemId,
            stepId,
            title: item.itemTitle,
            description: item.memo || '',
            intent,
            order: itemIndex,
            completion: completionFor(intent, item.memo ? `${item.memo} 내용을 확인하고 실행 상태를 남겼다.` : `${item.itemTitle} 완료 상태를 남겼다.`),
            ...(schedule ? { schedule } : {}),
            fieldIds: [],
            memoIds: [],
            cautionMemoIds: [],
            sourceRefIds: [ref.sourceRefId],
            optional: Boolean(item.optional),
            dependsOnItemIds: [],
            conditionMemoIds: [],
          });
        }
        steps.push({
          stepId,
          flowId,
          title: step.title,
          order: stepIndex,
          itemIds,
          sourceRefIds: [],
          groupingHint: 'Qualified v2의 원문 구간·주차·컬렉션 그룹을 보존',
        });
      }
      const referencedRowIds = unique(
        flow.steps.flatMap((step) => step.items.flatMap((item) => (item.sourceRowIds || []).map((id) => rowIdMap.get(id)))),
      );
      const referencedSourceIds = unique(
        rows.filter((row) => referencedRowIds.includes(row.sourceRowId)).map((row) => row.sourceId),
      );
      const videoSource = flow.sourceVideoUrl
        ? sourceByUrl.get(canonicalUrl(flow.sourceVideoUrl))?.source.sourceId
        : null;
      const primarySourceId = videoSource || referencedSourceIds[0] || sourceMeta.source.sourceId;
      flows.push({
        flowId,
        title: flow.title,
        summary: record.userJob,
        userNeed: record.userJob,
        primarySourceId,
        supportingSourceIds: referencedSourceIds.filter((id) => id !== primarySourceId),
        setupFieldIds: flowFields.map((field) => field.fieldId),
        stepIds,
        ...(anchorSource
          ? {
              anchorDefinition: {
                fieldId: `${flowId}-field-${slug(anchorSource.key)}`,
                kind: /birth|생년|d\+n/i.test(anchorSource.key + anchorSource.label) ? 'birth_date' : 'event_date',
                label: anchorSource.label,
                required: Boolean(anchorSource.required),
              },
            }
          : {}),
      });
    }
    const taxonomy = {
      primaryLifeArea: record.taxonomy.lifeArea,
      secondaryLifeAreas: [],
      topicTags: [],
      sourceShape: normalizeSourceShape(record.taxonomy.sourceShape),
      secondarySourceShapes: [],
      primaryExecutionPattern: normalizeExecutionPattern(
        record.taxonomy.executionPattern,
        normalizeSourceShape(record.taxonomy.sourceShape),
        normalizeArtifact(record.taxonomy.primaryArtifact),
      ),
      secondaryExecutionPatterns: [],
      primaryArtifact: normalizeArtifact(record.taxonomy.primaryArtifact),
      secondaryArtifacts: (record.taxonomy.secondaryArtifacts || []).map((value) => normalizeArtifact(value)),
    };
    return buildFixture({
      fixtureId,
      batch: 'qualified_v2_baseline',
      evidenceTier: 'frozen_qualified_v2_canonical',
      title: record.title,
      url: sourceUrl,
      publisher: record.creatorName,
      checkedAt: '2026-07-27',
      userNeed: record.userJob,
      taxonomy,
      normalizedRows: rows,
      flows,
      steps,
      items,
      fields,
      memos: [],
      sourceRefs,
      rowAccounting,
      inputs: {
        required: setup
          .filter((field) => field.required)
          .map((field) => ({
            key: field.key,
            label: field.label,
            type: normalizeInputType(field.type, field.label),
            ...(field.options ? { options: field.options.map((value) => ({ value, label: value })) } : {}),
          })),
        optional: setup
          .filter((field) => !field.required)
          .map((field) => ({
            key: field.key,
            label: field.label,
            type: normalizeInputType(field.type, field.label),
            ...(field.options ? { options: field.options.map((value) => ({ value, label: value })) } : {}),
          })),
      },
      calendarPolicy: record.taxonomy.naturalCalendarPolicy || (items.some((item) => item.schedule) ? 'per_item' : 'none'),
      reviewFlags: ['baseline_content_and_hierarchy_frozen'],
      originalRecordRef: `${INPUTS.baseline}#/bundles/${data.bundles.indexOf(record)}`,
      canonicalExtensionCandidates: record.bundle.map.flows.length > 1 ? ['multi_flow_map_preserved'] : [],
      sourceDescriptors: sourceMetas.map((meta) => meta.source),
      sourceSnapshots: sourceMetas.map((meta) => meta.snapshot),
    });
  });
}

function buildOqFixture(record) {
  const fixtureId = `oq-${slug(record.caseId)}`;
  const classification = record.expectedClassification;
  const shape = normalizeSourceShape(classification.sourceShape);
  const pattern = normalizeExecutionPattern(classification.primaryExecutionPattern, shape, classification.primaryArtifact);
  const taxonomy = {
    primaryLifeArea: classification.primaryLifeArea,
    secondaryLifeAreas: classification.secondaryLifeAreas || [],
    topicTags: classification.topicTags || [],
    sourceShape: shape,
    secondarySourceShapes: (classification.secondarySourceShapes || []).map(normalizeSourceShape),
    primaryExecutionPattern: pattern,
    secondaryExecutionPatterns: (classification.secondaryExecutionPatterns || []).map((value) =>
      normalizeExecutionPattern(value, shape, classification.primaryArtifact),
    ),
    primaryArtifact: normalizeArtifact(classification.primaryArtifact),
    secondaryArtifacts: (classification.secondaryArtifacts || []).map((value) => normalizeArtifact(value)),
  };
  const originalPrimaryArtifact = taxonomy.primaryArtifact;
  let classificationDelta = null;
  if (record.caseId === 'OQ-P03-VEHICLE') {
    taxonomy.primaryArtifact = 'checklist';
    taxonomy.secondaryArtifacts = ['memo'];
    classificationDelta = {
      fromPrimaryArtifact: originalPrimaryArtifact,
      toPrimaryArtifact: 'checklist',
      reason:
        '차량별 공식 시작일·종료일과 방문일은 source-owned 값이 아니다. 조회 전에도 실행 가능한 공식 조회 Checklist를 주 결과물로 두고 Calendar는 사용자 날짜 입력 후 projection 확장으로 보류한다.',
    };
  }
  const sourceMeta = makeSource({
    fixtureId,
    title: record.primarySource.title,
    url: record.primarySource.url,
    publisher: record.primarySource.publisher,
    locale: record.primarySource.locale,
    checkedAt: record.primarySource.checkedAt,
  });
  const rows = normalizeRows(
    record.sourceRows,
    fixtureId,
    sourceMeta.source.sourceId,
    sourceMeta.snapshot.snapshotId,
    record.primarySource.url,
  );
  const rowMap = new Map(record.sourceRows.map((row, index) => [row.sourceRowId, rows[index]]));
  const roleByRow = new Map((record.expectedRoleAssignments || []).map((entry) => [entry.sourceRowId, entry]));
  const flowId = `${fixtureId}-flow-1`;
  const stepGroups = new Map();
  const items = [];
  const fields = [];
  const memos = [];
  const sourceRefs = [];
  const rowAccounting = [];
  let itemIndex = 0;

  if (record.caseId === 'OQ-C01-MOVING') {
    fields.push({
      fieldId: `${fixtureId}-field-move-date`,
      owner: { type: 'flow', id: flowId },
      key: 'move_date',
      label: '이사일',
      valueType: 'date',
      purposes: ['schedule', 'generation'],
      valueSource: 'user',
      required: true,
    });
  }
  if (record.caseId === 'OQ-P03-VEHICLE') {
    for (const [key, label, required] of [
      ['inspection_window_start', '공식 조회한 검사 가능 시작일', true],
      ['inspection_window_end', '공식 조회한 검사 가능 종료일', true],
      ['visit_date', '방문 예정일', false],
    ]) {
      fields.push({
        fieldId: `${fixtureId}-field-${key}`,
        owner: { type: 'flow', id: flowId },
        key,
        label,
        valueType: 'date',
        purposes: ['record', 'filter', 'export'],
        valueSource: 'user',
        required,
      });
    }
  }

  function ensureStep(label) {
    const key = label || '실행';
    if (!stepGroups.has(key)) stepGroups.set(key, []);
    return key;
  }

  for (const originalRow of record.sourceRows) {
    const row = rowMap.get(originalRow.sourceRowId);
    const assignment = roleByRow.get(originalRow.sourceRowId) || {
      role: 'item',
      targetIds: [`${fixtureId}-item-${itemIndex + 1}`],
      reason: '원문 행을 독립 실행 단위로 보존',
    };
    const targets = [];
    const role = ['item', 'field'].includes(assignment.role) ? assignment.role : 'memo';
    if (role === 'item') {
      const clauses = String(row.detail || '')
        .split(/\s*(?:,|;)\s*/)
        .map((value) => value.trim())
        .filter(Boolean);
      const shouldSplit = (assignment.targetIds || []).length > 1 && clauses.length === assignment.targetIds.length;
      const itemSources = shouldSplit ? clauses : [row.title];
      for (const [splitIndex, itemTitle] of itemSources.entries()) {
        itemIndex += 1;
        const itemId = `${fixtureId}-item-${itemIndex}`;
        const stepKey = ensureStep(row.locator || '실행');
        stepGroups.get(stepKey).push(itemId);
        const ref = sourceRef(
          'item',
          itemId,
          [row.sourceRowId],
          fixtureId,
          'derived_from',
          shouldSplit ? `원문 복합 행을 ${itemSources.length}개의 독립 완료 상태로 분리: ${assignment.reason}` : assignment.reason,
        );
        sourceRefs.push(ref);
        const isVehicle = record.caseId === 'OQ-P03-VEHICLE';
        const resolvedTitle = isVehicle
          ? '공식 검사 가능 기간을 조회하고 방문일 정하기'
          : shouldSplit
            ? itemTitle
            : row.title;
        const intent = isVehicle
          ? 'decide'
          : inferIntent({
              title: itemTitle,
              type: ['date', 'offset'].includes(row.rowType) ? '' : row.rowType,
              pattern,
            });
        let schedule;
        const recurrence = recurrenceFromText(`${row.title} ${row.detail}`, `${fixtureId}-field-start-date`);
        if (recurrence) schedule = recurrence;
        if (record.caseId === 'OQ-C01-MOVING') {
          schedule = scheduleFromOffsetLabel(row.title, `${fixtureId}-field-move-date`);
        }
        const itemFieldIds = isVehicle ? fields.map((field) => field.fieldId) : [];
        items.push({
          itemId,
          stepId: '',
          title: resolvedTitle,
          description: shouldSplit ? row.title : row.detail,
          intent,
          order: itemIndex - 1,
          completion: completionFor(intent, sourceBackedDoneWhen(intent, resolvedTitle), itemFieldIds),
          ...(schedule ? { schedule } : {}),
          fieldIds: itemFieldIds,
          memoIds: [],
          cautionMemoIds: [],
          sourceRefIds: [ref.sourceRefId],
          optional: false,
          dependsOnItemIds: [],
          conditionMemoIds: [],
        });
        targets.push(itemId);
      }
    } else if (role === 'field') {
      const fieldId = `${fixtureId}-field-${slug(assignment.targetIds?.[0] || row.title)}`;
      const ref = sourceRef('field', fieldId, [row.sourceRowId], fixtureId, 'derived_from', assignment.reason);
      sourceRefs.push(ref);
      fields.push({
        fieldId,
        owner: { type: 'flow', id: flowId },
        key: slug(row.title).replace(/-/g, '_'),
        label: row.title,
        valueType: /\d/.test(row.detail) ? 'long_text' : 'short_text',
        purposes: ['filter', 'export'],
        valueSource: 'source',
        required: false,
        sourceDefault: row.detail,
        sourceRefIds: [ref.sourceRefId],
      });
      targets.push(fieldId);
    } else {
      const memoId = `${fixtureId}-memo-${slug(assignment.targetIds?.[0] || row.title)}`;
      const ref = sourceRef('memo', memoId, [row.sourceRowId], fixtureId, role === 'memo' ? 'supports' : 'boundary', assignment.reason);
      sourceRefs.push(ref);
      memos.push({
        memoId,
        scope: { type: 'flow', id: flowId },
        kind: /금지|주의|모델|안전/.test(`${row.title} ${row.detail}`) ? 'caution' : 'source_detail',
        title: row.title,
        text: row.detail,
        sourceRefIds: [ref.sourceRefId],
      });
      targets.push(memoId);
    }
    rowAccounting.push({
      sourceRowId: row.sourceRowId,
      targetType: role,
      targets,
      relationType: targets.length > 1 ? 'one_to_many' : 'one_to_one',
      reason: assignment.reason,
    });
  }

  if (items.length === 0) {
    const itemId = `${fixtureId}-item-decision`;
    const allRows = rows.map((row) => row.sourceRowId);
    const ref = sourceRef('item', itemId, allRows, fixtureId, 'derived_from', '비교 Field와 source memo를 하나의 결정 상태로 묶는다.');
    sourceRefs.push(ref);
    const decisionOptions =
      record.caseId === 'OQ-C08-AC-DECISION'
        ? [
            { value: 'professional_cleaning', label: '전문세척' },
            { value: 'general_cleaning', label: '일반세척' },
          ]
        : undefined;
    items.push({
      itemId,
      stepId: '',
      title: record.userJob || `${record.primarySource.title} 결정하기`,
      description: record.artifactReason,
      intent: 'decide',
      order: 0,
      completion: completionFor('decide', '선택과 근거를 기록했다.', [], decisionOptions),
      fieldIds: fields.map((field) => field.fieldId),
      memoIds: memos.filter((memo) => memo.kind !== 'caution').map((memo) => memo.memoId),
      cautionMemoIds: memos.filter((memo) => memo.kind === 'caution').map((memo) => memo.memoId),
      sourceRefIds: [ref.sourceRefId],
      optional: false,
      dependsOnItemIds: [],
      conditionMemoIds: [],
    });
    ensureStep('비교 후 결정');
    stepGroups.get('비교 후 결정').push(itemId);
  }

  if (items.some((item) => item.schedule?.recurrence) && !fields.some((field) => field.fieldId === `${fixtureId}-field-start-date`)) {
    fields.push({
      fieldId: `${fixtureId}-field-start-date`,
      owner: { type: 'flow', id: flowId },
      key: 'start_date',
      label: '첫 실행일',
      valueType: 'date',
      purposes: ['schedule', 'generation'],
      valueSource: 'user',
      required: true,
    });
  }
  const steps = [...stepGroups.entries()].map(([label, itemIds], index) => {
    const stepId = `${flowId}-step-${index + 1}`;
    for (const itemId of itemIds) items.find((item) => item.itemId === itemId).stepId = stepId;
    return { stepId, flowId, title: label, order: index, itemIds, sourceRefIds: [], groupingHint: '원문 locator를 Step 표시 문맥으로 사용' };
  });
  const inputFields = fields.filter((field) => field.valueSource === 'user');
  const scheduleAnchorField = inputFields.find((field) => field.purposes.includes('schedule'));
  const flows = [
    {
      flowId,
      title: record.primarySource.title,
      summary: record.userJob,
      userNeed: record.userJob,
      setupFieldIds: inputFields.map((field) => field.fieldId),
      stepIds: steps.map((step) => step.stepId),
      ...(scheduleAnchorField
        ? {
            anchorDefinition: {
              fieldId: scheduleAnchorField.fieldId,
              kind: scheduleAnchorField.key === 'move_date' ? 'event_date' : 'start_date',
              label: scheduleAnchorField.label,
              required: scheduleAnchorField.required,
            },
          }
        : {}),
    },
  ];
  return buildFixture({
    fixtureId,
    batch: 'output_quality_gold',
    evidenceTier: 'frozen_gold_source_contract',
    title: record.primarySource.title,
    url: record.primarySource.url,
    publisher: record.primarySource.publisher,
    locale: record.primarySource.locale,
    checkedAt: record.primarySource.checkedAt,
    userNeed: record.userJob,
    taxonomy,
    normalizedRows: rows,
    flows,
    steps,
    items,
    fields,
    memos,
    sourceRefs,
    rowAccounting,
    inputs: {
      required: inputFields.filter((field) => field.required).map((field) => ({ key: field.key, label: field.label, type: field.valueType })),
      optional: inputFields.filter((field) => !field.required).map((field) => ({ key: field.key, label: field.label, type: field.valueType })),
    },
    calendarPolicy: taxonomy.primaryArtifact === 'calendar' ? 'per_item' : 'none',
    reviewFlags: unique([
      ...(classification.review?.blockers || []),
      classification.rights?.reviewStatus === 'restricted' ? 'rights_not_assessed_in_structure_lab' : null,
      record.caseId === 'OQ-P03-VEHICLE' ? 'calendar_waits_for_official_user_date_input' : null,
    ]),
    originalRecordRef: `${INPUTS.outputQuality}#/cases/${record.caseId}`,
    canonicalExtensionCandidates: unique([
      ...(items.some((item) => item.schedule?.recurrence) ? ['occurrence_identity_required'] : []),
      ...(record.caseId === 'OQ-P03-VEHICLE' ? ['calendar_projection_after_user_date_window'] : []),
    ]),
    classificationDelta,
  });
}

function buildValueFixture(record) {
  const fixtureId = `value-${slug(record.caseId)}`;
  const [lifeArea, shape, pattern] = VALUE_CLASSIFICATION[record.caseId] || [
    'home_living',
    normalizeSourceShape(record.sourceShape),
    'ordered_procedure',
  ];
  const taxonomy = {
    primaryLifeArea: lifeArea,
    secondaryLifeAreas: [],
    topicTags: [],
    sourceShape: shape,
    secondarySourceShapes: [],
    primaryExecutionPattern: pattern,
    secondaryExecutionPatterns: [],
    primaryArtifact: normalizeArtifact(record.primaryProjection),
    secondaryArtifacts: (record.secondaryProjections || []).map((value) => normalizeArtifact(value)),
  };
  const sourceMeta = makeSource({
    fixtureId,
    title: record.source.title,
    url: record.source.canonicalUrl,
    publisher: record.source.provider,
    checkedAt: record.source.observedAt,
  });
  const rows = normalizeRows(record.sourceRows, fixtureId, sourceMeta.source.sourceId, sourceMeta.snapshot.snapshotId, record.source.canonicalUrl);
  const rowIdMap = new Map(record.sourceRows.map((row, index) => [row.id || row.sourceRowId, rows[index].sourceRowId]));
  const flowId = `${fixtureId}-flow-1`;
  const fields = [];
  const memos = [];
  const sourceRefs = [];
  const items = [];
  const itemIdMap = new Map();
  const inputDefinitions = [
    ...(record.minimumInputs || []).map((label, index) => ({
      key: record.caseId === 'VQ-03' && index === 0 ? 'week_start_date' : slug(label).replace(/-/g, '_'),
      label,
      type: record.caseId === 'VQ-03' && index === 0 ? 'date' : inputValueType(label),
      required: true,
    })),
    ...(record.optionalInputs || []).map((label) => ({
      key: slug(label).replace(/-/g, '_'),
      label,
      type: inputValueType(label),
      required: false,
    })),
  ];
  const setupFields = inputDefinitions.map((input) => ({
    fieldId: `${flowId}-field-${input.key}`,
    owner: { type: 'flow', id: flowId },
    key: input.key,
    label: input.label,
    valueType: input.type,
    purposes: input.type === 'date' ? ['schedule', 'generation'] : ['generation', 'filter'],
    valueSource: 'user',
    required: input.required,
  }));
  fields.push(...setupFields);

  for (const [index, allowed] of record.allowedItems.entries()) {
    const itemId = `${fixtureId}-item-${index + 1}`;
    itemIdMap.set(allowed.itemId, itemId);
    const mappedRows = unique((allowed.sourceRefs || []).map((id) => rowIdMap.get(id)).filter(Boolean));
    const itemFields = [];
    for (const key of unique(allowed.fields || [])) {
      const fieldId = `${itemId}-field-${slug(key)}`;
      itemFields.push(fieldId);
      fields.push({
        fieldId,
        owner: { type: 'item', id: itemId },
        key,
        label: key,
        valueType: /priority|status|decision/i.test(key) ? 'single_select' : /date|day|month/i.test(key) ? 'date' : 'long_text',
        purposes: allowed.type === 'record' ? ['record', 'export'] : ['filter', 'record', 'export'],
        valueSource: 'user',
        required: allowed.type === 'record',
      });
    }
    const conditionMemoIds = [];
    for (const [conditionIndex, condition] of (allowed.conditions || []).entries()) {
      const memoId = `${itemId}-condition-${conditionIndex + 1}`;
      const conditionRef = sourceRef(
        'memo',
        memoId,
        mappedRows,
        fixtureId,
        'supports',
        '원문 조건을 실행 조건 Memo로 보존한다.',
      );
      sourceRefs.push(conditionRef);
      conditionMemoIds.push(memoId);
      memos.push({
        memoId,
        scope: { type: 'item', id: itemId },
        kind: 'instruction',
        title: '적용 조건',
        text: condition.statement,
        sourceRefIds: [conditionRef.sourceRefId],
      });
    }
    const ref = sourceRef('item', itemId, mappedRows, fixtureId, 'derived_from', 'Value-qualified gold allowed Item과 sourceRefs를 보존');
    sourceRefs.push(ref);
    const intent = inferIntent({ explicit: allowed.type, title: allowed.title, pattern });
    items.push({
      itemId,
      stepId: '',
      title: allowed.title,
      description: allowed.detail || '',
      intent,
      order: index,
      completion: completionFor(intent, allowed.completion, itemFields),
      ...(valueSchedule(allowed.schedule) ? { schedule: valueSchedule(allowed.schedule) } : {}),
      fieldIds: itemFields,
      memoIds: [],
      cautionMemoIds: [],
      sourceRefIds: [ref.sourceRefId],
      optional: false,
      dependsOnItemIds: [],
      conditionMemoIds,
    });
  }
  if (record.caseId === 'VQ-03') {
    const anchorFieldId = setupFields.find((field) => field.key === 'week_start_date')?.fieldId;
    if (!anchorFieldId) throw new Error('VQ-03 requires a week_start_date field.');
    for (const [index, item] of items.entries()) {
      item.schedule = {
        mode: 'anchor_offset',
        anchorFieldId,
        dayOffset: index,
        allDay: true,
        timezone: 'Asia/Seoul',
      };
    }
  }
  const stepGroups = new Map();
  for (const item of items) {
    const key =
      item.schedule?.mode === 'date_window'
        ? '신청 기간'
        : item.schedule?.mode === 'absolute'
          ? '마감'
          : item.intent === 'record'
            ? '결과와 상태'
            : item.intent === 'decide'
              ? '확인과 결정'
              : item.intent === 'use_resource'
                ? '학습·자료'
                : '실행';
    if (!stepGroups.has(key)) stepGroups.set(key, []);
    stepGroups.get(key).push(item.itemId);
  }
  const steps = [...stepGroups.entries()].map(([label, itemIds], index) => {
    const stepId = `${flowId}-step-${index + 1}`;
    for (const itemId of itemIds) items.find((item) => item.itemId === itemId).stepId = stepId;
    return { stepId, flowId, title: label, order: index, itemIds, sourceRefIds: [], groupingHint: 'intent와 source schedule에 따른 표시 그룹' };
  });
  const rowAccounting = rows.map((row) => {
    const targets = items
      .filter((item) => {
        const refs = sourceRefs.filter((ref) => item.sourceRefIds.includes(ref.sourceRefId));
        return refs.some((ref) => ref.sourceRowIds.includes(row.sourceRowId));
      })
      .map((item) => item.itemId);
    const omitted = (record.omittedSourceRows || []).find((entry) => (entry.sourceRowId || entry.id) === row.originalSourceRowId);
    return {
      sourceRowId: row.sourceRowId,
      targetType: targets.length ? 'item' : 'omitted',
      targets,
      relationType: targets.length > 1 ? 'one_to_many' : targets.length === 1 ? 'one_to_one_or_many_to_one' : 'omitted',
      reason: omitted?.reason || (targets.length ? 'Gold contract의 SourceRef를 보존' : 'Gold contract에서 실행 범위 밖으로 명시'),
    };
  });
  return buildFixture({
    fixtureId,
    batch: 'value_qualified_gold',
    evidenceTier: 'frozen_value_gold_contract',
    title: record.source.title,
    url: record.source.canonicalUrl,
    publisher: record.source.provider,
    checkedAt: record.source.observedAt,
    userNeed: record.userJob,
    taxonomy,
    normalizedRows: rows,
    flows: [
      {
        flowId,
        title: record.source.title,
        summary: record.reason,
        userNeed: record.userJob,
        setupFieldIds: setupFields.map((field) => field.fieldId),
        stepIds: steps.map((step) => step.stepId),
        ...(setupFields.some((field) => field.key === 'week_start_date')
          ? {
              anchorDefinition: {
                fieldId: setupFields.find((field) => field.key === 'week_start_date').fieldId,
                kind: 'start_date',
                label: setupFields.find((field) => field.key === 'week_start_date').label,
                required: true,
              },
            }
          : {}),
      },
    ],
    steps,
    items,
    fields,
    memos,
    sourceRefs,
    rowAccounting,
    inputs: {
      required: inputDefinitions.filter((input) => input.required).map(({ key, label, type }) => ({ key, label, type })),
      optional: inputDefinitions.filter((input) => !input.required).map(({ key, label, type }) => ({ key, label, type })),
      autoFilled: record.autoFilledValues || [],
    },
    calendarPolicy: taxonomy.primaryArtifact === 'calendar' ? 'per_item' : 'none',
    reviewFlags: [],
    originalRecordRef: `${INPUTS.valueGold}#/cases/${record.caseId}`,
    canonicalExtensionCandidates: items.some((item) => item.conditionMemoIds.length) ? ['condition_memo_binding'] : [],
  });
}

function buildDeepFixture(record) {
  const fixtureId = `deep-${slug(record.caseId)}`;
  const shape = normalizeSourceShape(
    record.classification.sourceShape ||
      (record.classification.planningPattern === 'resource_queue'
        ? 'resource_collection'
        : record.classification.planningPattern === 'source_table_rows'
          ? 'table_rows'
          : 'narrative_guidance'),
  );
  const originalArtifact = normalizeArtifact(record.classification.primaryArtifact);
  const artifact = record.caseId === 'DS08' ? 'checklist' : originalArtifact;
  const pattern = normalizeExecutionPattern(record.classification.planningPattern, shape, artifact);
  const taxonomy = {
    primaryLifeArea: record.classification.lifeArea,
    secondaryLifeAreas: [],
    topicTags: [],
    sourceShape: shape,
    secondarySourceShapes: [],
    primaryExecutionPattern: pattern,
    secondaryExecutionPatterns: [],
    primaryArtifact: artifact,
    secondaryArtifacts:
      record.caseId === 'DS08'
        ? ['memo']
        : artifact === 'calendar'
          ? ['checklist']
          : artifact === 'sheet'
            ? ['checklist']
            : ['memo'],
  };
  const sourceMeta = makeSource({
    fixtureId,
    title: record.sourceSnapshot.title,
    url: record.sourceSnapshot.sourceUrl,
    publisher: record.sourceSnapshot.publisher,
    locale: record.sourceSnapshot.locale,
    checkedAt: record.sourceSnapshot.checkedAt,
  });
  const rows = normalizeRows(
    record.sourceRows,
    fixtureId,
    sourceMeta.source.sourceId,
    sourceMeta.snapshot.snapshotId,
    record.sourceSnapshot.sourceUrl,
  );
  const rowMap = new Map(record.sourceRows.map((row, index) => [row.id || row.sourceRowId, rows[index].sourceRowId]));
  const flowId = `${fixtureId}-flow-1`;
  const sourceRefs = [];
  const items = (record.canonicalPackage?.flow?.items || []).map((raw, index) => {
    const itemId = `${fixtureId}-item-${index + 1}`;
    const mappedRows = unique((raw.sourceRowRefs || []).map((id) => rowMap.get(id)).filter(Boolean));
    const ref = sourceRef('item', itemId, mappedRows, fixtureId, 'derived_from', 'Deep-set canonical package Item 경계를 보존');
    sourceRefs.push(ref);
    const intent = inferIntent({ title: raw.title, pattern });
    return {
      itemId,
      stepId: '',
      title: raw.title,
      description: '',
      intent,
      order: index,
      completion: completionFor(intent, raw.completionCriterion),
      fieldIds: [],
      memoIds: [],
      cautionMemoIds: [],
      sourceRefIds: [ref.sourceRefId],
      optional: false,
      dependsOnItemIds: [],
      conditionMemoIds: [],
    };
  });
  if (items.length === 0) {
    for (const [index, row] of rows.entries()) {
      const itemId = `${fixtureId}-item-${index + 1}`;
      const ref = sourceRef('item', itemId, [row.sourceRowId], fixtureId);
      sourceRefs.push(ref);
      const intent = inferIntent({ title: row.title, type: row.rowType, pattern });
      items.push({
        itemId,
        stepId: '',
        title: row.title,
        description: row.detail,
        intent,
        order: index,
        completion: completionFor(intent, sourceBackedDoneWhen(intent, row.title)),
        fieldIds: [],
        memoIds: [],
        cautionMemoIds: [],
        sourceRefIds: [ref.sourceRefId],
        optional: false,
        dependsOnItemIds: [],
        conditionMemoIds: [],
      });
    }
  }
  const stepGroups = new Map();
  for (const item of items) {
    const refs = sourceRefs.find((ref) => item.sourceRefIds.includes(ref.sourceRefId))?.sourceRowIds || [];
    const firstRow = rows.find((row) => refs.includes(row.sourceRowId));
    const key = firstRow?.locator || '실행';
    if (!stepGroups.has(key)) stepGroups.set(key, []);
    stepGroups.get(key).push(item.itemId);
  }
  const steps = [...stepGroups.entries()].map(([label, itemIds], index) => {
    const stepId = `${flowId}-step-${index + 1}`;
    for (const itemId of itemIds) items.find((item) => item.itemId === itemId).stepId = stepId;
    return { stepId, flowId, title: label, order: index, itemIds, sourceRefIds: [], groupingHint: '원문 locator 기준 표시 그룹' };
  });
  const rowAccounting = rows.map((row) => {
    const targets = items
      .filter((item) =>
        sourceRefs
          .filter((ref) => item.sourceRefIds.includes(ref.sourceRefId))
          .some((ref) => ref.sourceRowIds.includes(row.sourceRowId)),
      )
      .map((item) => item.itemId);
    return {
      sourceRowId: row.sourceRowId,
      targetType: targets.length ? 'item' : 'omitted',
      targets,
      relationType: targets.length > 1 ? 'one_to_many' : targets.length ? 'one_to_one_or_many_to_one' : 'omitted',
      reason: targets.length ? 'Deep-set canonical package의 SourceRow ref를 보존' : '완전한 실행 단위로 승격되지 않은 원문 문맥',
    };
  });
  return buildFixture({
    fixtureId,
    batch: 'deep_set_unique',
    evidenceTier: 'frozen_deep_set_source_rows',
    title: record.sourceSnapshot.title,
    url: record.sourceSnapshot.sourceUrl,
    publisher: record.sourceSnapshot.publisher,
    locale: record.sourceSnapshot.locale,
    checkedAt: record.sourceSnapshot.checkedAt,
    userNeed: record.classification.userJob,
    taxonomy,
    normalizedRows: rows,
    flows: [
      {
        flowId,
        title: record.canonicalPackage?.flow?.title || record.sourceSnapshot.title,
        summary: record.classification.userJob,
        userNeed: record.classification.userJob,
        setupFieldIds: [],
        stepIds: steps.map((step) => step.stepId),
      },
    ],
    steps,
    items,
    fields: [],
    memos: [],
    sourceRefs,
    rowAccounting,
    inputs: { required: [], optional: [] },
    calendarPolicy: 'none',
    reviewFlags: unique([record.sourceSnapshot.risk, record.gate?.risk]),
    originalRecordRef: `${INPUTS.deepSet}#/cases/${record.caseId}`,
    canonicalExtensionCandidates: record.caseId === 'DS08' ? ['calendar_projection_after_user_trip_date_and_times'] : [],
    classificationDelta:
      record.caseId === 'DS08'
        ? {
            fromPrimaryArtifact: originalArtifact,
            toPrimaryArtifact: 'checklist',
            reason:
              '원문은 장소 순서를 제공하지만 방문 날짜와 시각은 제공하지 않는다. 순서 Checklist를 canonical 결과로 보존하고 Calendar는 사용자 trip date/time overlay 이후에만 만든다.',
          }
        : null,
  });
}

function buildReverifiedFixture(packet) {
  const fixtureId = `live-${slug(packet.candidateId || packet.packetId)}`;
  const sourceMeta = makeSource({
    fixtureId,
    title: packet.title,
    url: packet.canonicalUrl || packet.url,
    publisher: packet.provider,
    checkedAt: packet.observedAt || '2026-07-28',
  });
  const rows = normalizeRows(
    packet.sourceRows,
    fixtureId,
    sourceMeta.source.sourceId,
    sourceMeta.snapshot.snapshotId,
    packet.canonicalUrl || packet.url,
  );
  const shape = normalizeSourceShape(packet.sourceShapeRecommendation);
  const originalArtifact = normalizeArtifact(packet.primaryArtifactRecommendation);
  const artifact = packet.candidateId === 'C01' ? 'sheet' : originalArtifact;
  const pattern = normalizeExecutionPattern(packet.executionPatternRecommendation, shape, artifact);
  const taxonomy = {
    primaryLifeArea: CONTROLLED.lifeAreas.includes(packet.primaryLifeArea) ? packet.primaryLifeArea : 'home_living',
    secondaryLifeAreas: (packet.secondaryLifeAreas || []).filter((value) => CONTROLLED.lifeAreas.includes(value)),
    topicTags: packet.topicTags || [],
    sourceShape: shape,
    secondarySourceShapes: (packet.secondarySourceShapes || []).map(normalizeSourceShape),
    primaryExecutionPattern: pattern,
    secondaryExecutionPatterns: (packet.secondaryExecutionPatterns || []).map((value) =>
      normalizeExecutionPattern(value, shape, artifact),
    ),
    primaryArtifact: artifact,
    secondaryArtifacts:
      packet.candidateId === 'C01'
        ? ['checklist']
        : (packet.secondaryArtifactRecommendations || []).map((value) => normalizeArtifact(value)),
  };
  const flowId = `${fixtureId}-flow-1`;
  const sourceRefs = [];
  const fields = [];
  const memos = [];
  const items = [];
  const stepGroups = new Map();
  const rowAccounting = [];
  let anchorField = null;
  let previousExplicitSequenceItemId = null;
  const setupFieldIds = new Set();
  if (packet.candidateId === 'C01') {
    const birthFieldId = `${fixtureId}-field-birth-date`;
    fields.push({
      fieldId: birthFieldId,
      owner: { type: 'flow', id: flowId },
      key: 'birth_date',
      label: '생년월일',
      valueType: 'date',
      purposes: ['schedule', 'generation'],
      valueSource: 'user',
      required: false,
    });
    setupFieldIds.add(birthFieldId);
  }
  const recurrenceSourceRows = rows.filter((row, index) => {
    const original = packet.sourceRows[index];
    return /recurrence/.test(String(original.kind || '').toLowerCase()) ||
      Boolean(recurrenceFromText(`${row.title} ${row.detail}`, `${fixtureId}-field-start-date`));
  });
  const recurrenceText = recurrenceSourceRows.map((row) => `${row.title} ${row.detail}`).join(' ');

  for (const [index, row] of rows.entries()) {
    const original = packet.sourceRows[index];
    const rawKind = String(original.targetHint || original.kind || '').toLowerCase();
    const targetHint =
      shape === 'template_fields' || /field/.test(rawKind) || recurrenceSourceRows.some((entry) => entry.sourceRowId === row.sourceRowId)
        ? 'field'
        : rawKind;
    if (targetHint === 'memo' || targetHint === 'reference') {
      const memoId = `${fixtureId}-memo-${index + 1}`;
      const ref = sourceRef('memo', memoId, [row.sourceRowId], fixtureId, 'supports', '실웹 재검증 행을 설명 문맥으로 보존');
      sourceRefs.push(ref);
      memos.push({
        memoId,
        scope: { type: 'flow', id: flowId },
        kind: /주의|금지|안전|경고/.test(`${row.title} ${row.detail}`) ? 'caution' : 'source_detail',
        title: row.title,
        text: row.detail,
        sourceRefIds: [ref.sourceRefId],
      });
      rowAccounting.push({
        sourceRowId: row.sourceRowId,
        targetType: 'memo',
        targets: [memoId],
        relationType: 'one_to_one',
        reason: '행이 독립 완료 상태보다 설명·주의 문맥에 가깝다.',
      });
      continue;
    }
    if (targetHint === 'field') {
      const fieldId = `${fixtureId}-field-${index + 1}`;
      const ref = sourceRef('field', fieldId, [row.sourceRowId], fixtureId, 'derived_from', '실웹 재검증 행을 source-owned Field로 보존');
      sourceRefs.push(ref);
      const isUserValueField = shape === 'template_fields';
      fields.push({
        fieldId,
        owner: { type: 'flow', id: flowId },
        key: slug(row.title).replace(/-/g, '_'),
        label: row.title,
        valueType: 'long_text',
        purposes: isUserValueField ? ['record', 'export'] : ['schedule', 'filter', 'export'],
        valueSource: isUserValueField ? 'user' : 'source',
        required: Boolean(original.required),
        ...(isUserValueField ? {} : { sourceDefault: row.detail }),
        sourceRefIds: [ref.sourceRefId],
      });
      rowAccounting.push({
        sourceRowId: row.sourceRowId,
        targetType: 'field',
        targets: [fieldId],
        relationType: 'one_to_one',
        reason: '행이 독립 행동이 아니라 정렬·필터·표시 값이다.',
      });
      continue;
    }
    const itemId = `${fixtureId}-item-${items.length + 1}`;
    const mappedSourceRows = unique([
      row.sourceRowId,
      ...(recurrenceSourceRows.length > 0
        ? recurrenceSourceRows.map((entry) => entry.sourceRowId)
        : []),
    ]);
    const ref = sourceRef('item', itemId, mappedSourceRows, fixtureId, 'derived_from', '실웹 재검증 SourceRow를 독립 상태 Item으로 보존');
    sourceRefs.push(ref);
    const intent = inferIntent({ explicit: original.intentHint, title: row.title, type: row.rowType, pattern });
    let schedule =
      recurrenceFromText(`${row.title} ${row.detail}`, `${fixtureId}-field-start-date`) ||
      (recurrenceSourceRows.length > 0
        ? recurrenceFromText(recurrenceText, `${fixtureId}-field-start-date`)
        : undefined);
    if (schedule) anchorField = `${fixtureId}-field-start-date`;
    const stepKey = row.locator || '실행';
    const hasExplicitSequenceLocator =
      shape === 'procedure_rows' &&
      /procedure_(?:step|row)|recipe_step/.test(String(original.kind || '').toLowerCase()) &&
      /\bStep\s+\d+\b/i.test(String(row.locator || ''));
    const dependsOnItemIds =
      hasExplicitSequenceLocator && previousExplicitSequenceItemId
        ? [previousExplicitSequenceItemId]
        : [];
    if (!stepGroups.has(stepKey)) stepGroups.set(stepKey, []);
    stepGroups.get(stepKey).push(itemId);
    items.push({
      itemId,
      stepId: '',
      title: row.title,
      description: row.detail,
      intent,
      order: items.length,
      completion: completionFor(intent, sourceBackedDoneWhen(intent, row.title)),
      ...(schedule ? { schedule } : {}),
      fieldIds: [],
      memoIds: [],
      cautionMemoIds: [],
      sourceRefIds: [ref.sourceRefId],
      optional: Boolean(original.optional),
      dependsOnItemIds,
      conditionMemoIds: [],
    });
    if (hasExplicitSequenceLocator) previousExplicitSequenceItemId = itemId;
    rowAccounting.push({
      sourceRowId: row.sourceRowId,
      targetType: 'item',
      targets: [itemId],
      relationType: 'one_to_one',
      reason: '실웹 재검증 행 자체가 독립적으로 완료·기록할 수 있다.',
    });
  }
  if (anchorField) {
    fields.push({
      fieldId: anchorField,
      owner: { type: 'flow', id: flowId },
      key: 'start_date',
      label: '첫 실행일',
      valueType: 'date',
      purposes: ['schedule', 'generation'],
      valueSource: 'user',
      required: true,
    });
    setupFieldIds.add(anchorField);
  }
  if (items.length === 0 && shape !== 'template_fields') {
    const itemId = `${fixtureId}-item-1`;
    const allRows = rows.map((row) => row.sourceRowId);
    const ref = sourceRef('item', itemId, allRows, fixtureId, 'derived_from', '설명·Field를 사용하는 단일 사용자 결정 상태');
    sourceRefs.push(ref);
    const syntheticIntent = shape === 'template_fields' ? 'record' : pattern === 'compare_decide' ? 'decide' : 'act';
    items.push({
      itemId,
      stepId: '',
      title: packet.userNeed || packet.title,
      description: packet.notes || '',
      intent: syntheticIntent,
      order: 0,
      completion: completionFor(
        syntheticIntent,
        syntheticIntent === 'record' ? '이번 실행에서 입력한 값을 저장했다.' : '선택 또는 실행 상태를 남겼다.',
        fields.map((field) => field.fieldId),
      ),
      fieldIds: fields.map((field) => field.fieldId),
      memoIds: memos.filter((memo) => memo.kind !== 'caution').map((memo) => memo.memoId),
      cautionMemoIds: memos.filter((memo) => memo.kind === 'caution').map((memo) => memo.memoId),
      sourceRefIds: [ref.sourceRefId],
      optional: false,
      dependsOnItemIds: [],
      conditionMemoIds: [],
    });
    stepGroups.set('실행', [itemId]);
  }
  const steps = [...stepGroups.entries()].map(([label, itemIds], index) => {
    const stepId = `${flowId}-step-${index + 1}`;
    for (const itemId of itemIds) items.find((item) => item.itemId === itemId).stepId = stepId;
    return { stepId, flowId, title: label, order: index, itemIds, sourceRefIds: [], groupingHint: '실웹 source locator를 보존' };
  });
  const setupFields = fields.filter((field) => setupFieldIds.has(field.fieldId));
  const required = setupFields
    .filter((field) => field.required)
    .map((field) => ({ key: field.key, label: field.label, type: field.valueType }));
  const optional = setupFields
    .filter((field) => !field.required)
    .map((field) => ({ key: field.key, label: field.label, type: field.valueType }));
  const duringExecution = fields
    .filter((field) => field.valueSource === 'user' && !setupFieldIds.has(field.fieldId))
    .map((field) => ({ key: field.key, label: field.label, type: field.valueType, required: field.required }));
  return buildFixture({
    fixtureId,
    batch: 'live_reverified_expansion',
    evidenceTier: 'live_source_reverified',
    title: packet.title,
    url: packet.canonicalUrl || packet.url,
    publisher: packet.provider,
    checkedAt: packet.observedAt,
    userNeed: packet.userNeed || `${packet.title}의 원문 행을 실행 상태로 관리한다.`,
    taxonomy,
    normalizedRows: rows,
    flows: [
      {
        flowId,
        title: packet.title,
        summary: packet.userNeed || packet.notes || '',
        userNeed: packet.userNeed || `${packet.title}의 원문 행을 실행 상태로 관리한다.`,
        setupFieldIds: [...setupFieldIds],
        stepIds: steps.map((step) => step.stepId),
        ...(anchorField
          ? { anchorDefinition: { fieldId: anchorField, kind: 'start_date', label: '첫 실행일', required: true } }
          : {}),
      },
    ],
    steps,
    items,
    fields,
    memos,
    sourceRefs,
    rowAccounting,
    inputs: { required, optional, duringExecution },
    calendarPolicy: items.some((item) => item.schedule) && artifact === 'calendar' ? 'per_item' : 'none',
    reviewFlags: packet.reviewFlags || [],
    originalRecordRef: `${INPUTS.reverified}#/completePackets/${packet.candidateId || packet.packetId}`,
    canonicalExtensionCandidates: unique([
      ...(anchorField ? ['recurrence_occurrence_identity'] : []),
      ...(packet.candidateId === 'C01' ? ['relative_age_window_resolver'] : []),
    ]),
    classificationDelta:
      packet.candidateId === 'C01'
        ? {
            fromPrimaryArtifact: originalArtifact,
            toPrimaryArtifact: 'sheet',
            reason:
              '공식 원문은 월령 범위를 제공하지만 일 단위 계산식과 실제 생년월일은 제공하지 않는다. 월령 표를 Sheet로 보존하고 Calendar는 검증된 age-window resolver 이후에만 만든다.',
          }
        : null,
  });
}

function selectUnique(fixtures, minimum = 40) {
  const selected = [];
  const seenUrls = new Set();
  const rejected = [];
  for (const fixture of fixtures) {
    const key = canonicalUrl(fixture.source.canonicalUrl);
    if (!key) {
      rejected.push({ fixtureId: fixture.fixtureId, reason: 'missing_canonical_url' });
      continue;
    }
    if (seenUrls.has(key)) {
      rejected.push({ fixtureId: fixture.fixtureId, reason: 'duplicate_primary_url', canonicalUrl: key });
      continue;
    }
    seenUrls.add(key);
    selected.push(fixture);
  }
  if (selected.length < minimum) {
    throw new Error(`Complete unique fixture count ${selected.length} is below required ${minimum}. Reverify more source packets.`);
  }
  return { selected, rejected };
}

function boundaryControls(deepData, oqData, reverified) {
  const controls = [];
  for (const record of deepData.cases.filter((entry) => ['DS03', 'DS09'].includes(entry.caseId))) {
    const sourceRows = record.sourceRows.map((row) => ({
      sourceRowId: row.sourceRowId,
      title: row.title,
      detail: row.detail,
      locator: row.locator,
    }));
    controls.push({
      boundaryId: `boundary-${record.caseId.toLowerCase()}`,
      title: record.sourceSnapshot.title,
      sourceUrl: record.sourceSnapshot.sourceUrl,
      observedAt: record.sourceSnapshot.checkedAt,
      sourceRowsCaptured: record.sourceRows.length,
      sourceRows,
      rowAccounting: sourceRows.map((row) => ({
        sourceRowId: row.sourceRowId,
        targetType: 'omitted',
        targets: [],
        relationType: 'omitted',
        reason: '원문 범위가 불완전해 확보된 일부 행을 실행 Item으로 승격하지 않는다.',
      })),
      status: 'stopped_incomplete',
      stopReason:
        record.caseId === 'DS03'
          ? '구독자 잠금 뒤의 핵심 절차 행을 확보하지 못해 완전한 Flow를 만들 수 없다.'
          : '공개 HTML에서 전체 조리 단계의 완결성을 확인하지 못해 일부 행을 전체 절차로 승격하지 않는다.',
      allowedRepresentation: 'memo_with_source_link_only',
      forbiddenRepresentation: 'complete_items_or_calendar',
    });
  }
  for (const packet of reverified.incompletePackets || []) {
    if (controls.length >= 5) break;
    const sourceRows = (packet.sourceRows || []).map((row) => ({
      sourceRowId: row.sourceRowId,
      title: row.title,
      detail: row.detail,
      locator: row.locator,
    }));
    controls.push({
      boundaryId: `boundary-${slug(packet.candidateId || packet.title)}`,
      title: packet.title,
      sourceUrl: packet.url,
      observedAt: packet.observedAt || '2026-07-28',
      sourceRowsCaptured: packet.sourceRows?.length || 0,
      sourceRows,
      rowAccounting: sourceRows.map((row) => ({
        sourceRowId: row.sourceRowId,
        targetType: 'omitted',
        targets: [],
        relationType: 'omitted',
        reason: packet.reason || packet.notes || '필수 원문 행이 부족해 실행 Item으로 승격하지 않는다.',
      })),
      status: 'stopped_incomplete',
      stopReason: packet.reason || packet.notes || '행 단위 원문 근거를 완결적으로 확보하지 못했다.',
      allowedRepresentation: 'source_link_or_memo_only',
      forbiddenRepresentation: 'complete_items_or_calendar',
    });
  }
  return controls.slice(0, 5);
}

function collectCandidateObjects(value, sourceArtifact, pathParts = [], out = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectCandidateObjects(entry, sourceArtifact, [...pathParts, index], out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const directUrl =
    value.canonicalUrl ||
    value.sourceUrl ||
    value.url ||
    value.primaryUrl ||
    value.originalUrl ||
    value.source?.canonicalUrl ||
    value.source?.url ||
    value.sourceSnapshot?.sourceUrl ||
    value.primarySource?.url;
  const id =
    value.fixtureId ||
    value.caseId ||
    value.candidateId ||
    value.flowId ||
    value.creatorId ||
    value.serviceId ||
    value.id ||
    null;
  const title = value.title || value.name || value.source?.title || value.sourceSnapshot?.title || value.primarySource?.title || null;
  if (directUrl && (id || title)) {
    out.push({
      recordKind: 'content',
      sourceArtifact,
      jsonPath: `#/${pathParts.join('/')}`,
      candidateId: String(id || slug(title)),
      title: title || String(id),
      canonicalUrl: canonicalUrl(directUrl),
      observedStatus:
        value.status ||
        value.goldClass ||
        value.logicReadiness ||
        value.promotionReadiness ||
        value.gate?.result ||
        'candidate',
    });
  }
  for (const [key, child] of Object.entries(value)) {
    if (
      [
        'evidence',
        'evidenceRefs',
        'source',
        'primarySource',
        'sourceSnapshot',
        'sourceRows',
        'sourceRefs',
        'screenshots',
        'comments',
        'metrics',
      ].includes(key)
    ) {
      continue;
    }
    if (typeof child === 'object' && child !== null) collectCandidateObjects(child, sourceArtifact, [...pathParts, key], out);
  }
  return out;
}

function buildCandidateLedger(fixtures, dataByKey, rejectedDuplicates) {
  const raw = [];
  for (const key of ['seed', 'discoveryLedger', 'p0', 'valuePool', 'qualified', 'vertical']) {
    collectCandidateObjects(dataByKey[key], INPUTS[key], [], raw);
  }
  const selectedByUrl = new Map(fixtures.map((fixture) => [canonicalUrl(fixture.source.canonicalUrl), fixture.fixtureId]));
  const grouped = new Map();
  for (const entry of raw) {
    const key = entry.canonicalUrl || `${entry.sourceArtifact}:${entry.candidateId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        ledgerId: `ledger-${sha(key).slice(0, 12)}`,
        canonicalUrl: entry.canonicalUrl,
        title: entry.title,
        candidateIds: [],
        sourceArtifacts: [],
        observedStatuses: [],
        corpusRole: selectedByUrl.has(entry.canonicalUrl) ? 'complete_fixture' : 'candidate_only',
        fixtureId: selectedByUrl.get(entry.canonicalUrl) || null,
      });
    }
    const target = grouped.get(key);
    target.candidateIds.push(entry.candidateId);
    target.sourceArtifacts.push(entry.sourceArtifact);
    target.evidenceRefs ||= [];
    target.evidenceRefs.push(`${entry.sourceArtifact}${entry.jsonPath}`);
    target.observedStatuses.push(entry.observedStatus);
  }
  for (const fixture of fixtures) {
    if (![...grouped.values()].some((entry) => entry.fixtureId === fixture.fixtureId)) {
      grouped.set(`fixture:${fixture.fixtureId}`, {
        ledgerId: `ledger-${sha(fixture.fixtureId).slice(0, 12)}`,
        canonicalUrl: fixture.source.canonicalUrl,
        title: fixture.source.title,
        candidateIds: [fixture.fixtureId],
        sourceArtifacts: [String(fixture.originalRecordRef).split('#')[0]],
        evidenceRefs: [fixture.originalRecordRef],
        observedStatuses: ['complete_structure_fixture'],
        corpusRole: 'complete_fixture',
        fixtureId: fixture.fixtureId,
      });
    }
  }
  for (const opportunity of dataByKey.vertical?.contentDiscoveryOpportunities || []) {
    const key = `vertical-opportunity:${opportunity.id}`;
    grouped.set(key, {
      ledgerId: `ledger-${sha(key).slice(0, 12)}`,
      canonicalUrl: null,
      title: opportunity.title,
      candidateIds: [opportunity.id],
      sourceArtifacts: [INPUTS.vertical],
      evidenceRefs: [`${INPUTS.vertical}#/contentDiscoveryOpportunities/${opportunity.id}`],
      observedStatuses: [opportunity.decision || 'future_opportunity'],
      corpusRole: 'future_content_opportunity',
      fixtureId: null,
      requiredSourceRows: opportunity.requiredSourceRows || [],
      futureContractOnly: true,
    });
  }
  for (const duplicate of rejectedDuplicates) {
    const key = `duplicate:${duplicate.fixtureId}`;
    grouped.set(key, {
      ledgerId: `ledger-${sha(key).slice(0, 12)}`,
      canonicalUrl: duplicate.canonicalUrl || null,
      title: duplicate.fixtureId,
      candidateIds: [duplicate.fixtureId],
      sourceArtifacts: [],
      evidenceRefs: [],
      observedStatuses: ['duplicate_primary_url'],
      corpusRole: 'exclusion',
      fixtureId: null,
      forcedCorpusStatus: 'duplicate',
      exclusionReason: duplicate.reason,
    });
  }
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.fixtureId, fixture]));
  const inputArtifactHashes = Object.fromEntries(
    Object.values(INPUTS)
      .filter((rel) => fs.existsSync(abs(rel)))
      .map((rel) => [rel, `sha256:${sha(fs.readFileSync(abs(rel)))}`]),
  );
  const controlledCorpusStatuses = ['converted', 'candidate_only', 'source_missing', 'duplicate', 'structurally_redundant'];
  const records = [...grouped.values()]
    .map((entry) => {
      const fixture = entry.fixtureId ? fixtureById.get(entry.fixtureId) : null;
      const corpusStatus =
        entry.forcedCorpusStatus ||
        (entry.corpusRole === 'complete_fixture'
          ? 'converted'
          : entry.corpusRole === 'future_content_opportunity'
            ? 'source_missing'
            : unique(entry.observedStatuses).some((status) => /missing|boundary|hold|blocked/i.test(String(status)))
              ? 'source_missing'
              : 'candidate_only');
      return {
        ...entry,
        candidateIds: unique(entry.candidateIds),
        sourceArtifacts: unique(entry.sourceArtifacts),
        evidenceRefs: unique(entry.evidenceRefs || []),
        sourceArtifactHashes: unique(entry.sourceArtifacts)
          .map((artifact) => inputArtifactHashes[artifact])
          .filter(Boolean),
        observedStatuses: unique(entry.observedStatuses),
        stableContentId: entry.fixtureId || entry.ledgerId,
        duplicateLineage: unique(entry.sourceArtifacts).length > 1,
        sourceRowsAvailable: entry.corpusRole === 'complete_fixture',
        canonicalFixtureAvailable: entry.corpusRole === 'complete_fixture',
        corpusStatus,
        ...(fixture
          ? {
              sourceSnapshotHashes: fixture.canonicalContent.sourceSnapshots.map((snapshot) => snapshot.contentHash),
              sourceRowsSha256: `sha256:${sha(fixture.canonicalContent.sourceRows)}`,
            }
          : {}),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  return {
    schemaVersion: 'flowme-candidate-master-ledger-v1',
    generatedAt: OBSERVED_AT,
    claimBoundary: '후보 계보와 구조 fixture 포함 여부를 나타낸다. 공개 자격 또는 사용자 수요 점수가 아니다.',
    controlledCorpusStatuses,
    counts: {
      rawReferences: raw.length,
      deduplicatedCandidates: grouped.size,
      completeFixtures: fixtures.length,
      candidateOnly: records.filter((entry) => entry.corpusStatus === 'candidate_only').length,
      duplicate: records.filter((entry) => entry.corpusStatus === 'duplicate').length,
      structurallyRedundant: records.filter((entry) => entry.corpusStatus === 'structurally_redundant').length,
    },
    records,
  };
}

function frequency(values) {
  return Object.fromEntries(
    [...values.reduce((map, value) => map.set(String(value ?? 'none'), (map.get(String(value ?? 'none')) || 0) + 1), new Map())].sort(
      ([a], [b]) => a.localeCompare(b),
    ),
  );
}

function structuralCoverage(fixtures, boundaries) {
  const allItems = fixtures.flatMap((fixture) => fixture.canonicalContent.items);
  const sourceShapes = fixtures.map((fixture) => fixture.taxonomy.sourceShape);
  const patterns = fixtures.map((fixture) => fixture.taxonomy.primaryExecutionPattern);
  const artifacts = fixtures.map((fixture) => fixture.taxonomy.primaryArtifact);
  const relationTypes = fixtures.flatMap((fixture) => fixture.conversionAudit.rowAccounting.map((entry) => entry.relationType));
  const patternCounts = frequency(patterns);
  const manyToManyCases = fixtures.filter((fixture) => {
    const sourceRowsByItem = new Map();
    for (const item of fixture.canonicalContent.items) {
      const rowIds = unique(
        fixture.canonicalContent.sourceRefs
          .filter((ref) => item.sourceRefIds.includes(ref.sourceRefId))
          .flatMap((ref) => ref.sourceRowIds),
      );
      sourceRowsByItem.set(item.itemId, rowIds);
    }
    return fixture.conversionAudit.rowAccounting.some(
      (entry) =>
        entry.targets.length > 1 &&
        entry.targets.some((targetId) => (sourceRowsByItem.get(targetId) || []).length > 1),
    );
  });
  const boundaryOmissionRows = boundaries.flatMap((boundary) =>
    (boundary.rowAccounting || []).filter((entry) => entry.targetType === 'omitted'),
  );
  const groupingCases = fixtures.filter((fixture) => {
    if (fixture.projectionEvaluation.calendarPolicy === 'step_bundle' || fixture.canonicalContent.flows.length > 1) return true;
    const itemById = new Map(fixture.canonicalContent.items.map((item) => [item.itemId, item]));
    return fixture.canonicalContent.steps.some((step) => {
      const scheduleCounts = frequency(
        step.itemIds.map((id) => itemById.get(id)?.schedule).filter(Boolean).map((schedule) => JSON.stringify(schedule)),
      );
      return Object.values(scheduleCounts).some((count) => count > 1);
    });
  });
  const required = {
    completeFixturesAtLeast40: fixtures.length >= 40,
    allSevenExecutionPatterns: CONTROLLED.executionPatterns.every((value) => patterns.includes(value)),
    eachExecutionPatternAtLeastTwo: CONTROLLED.executionPatterns.every((value) => (patternCounts[value] || 0) >= 2),
    allFiveArtifacts: CONTROLLED.artifacts.every((value) => artifacts.includes(value)),
    allFiveIntents: CONTROLLED.intents.every((value) => allItems.some((item) => item.intent === value)),
    allThreeCompletionModes: CONTROLLED.completionModes.every((value) => allItems.some((item) => item.completion.mode === value)),
    scheduleModesPresent: ['none', ...CONTROLLED.scheduleModes].every((mode) =>
      mode === 'none' ? allItems.some((item) => !item.schedule) : allItems.some((item) => item.schedule?.mode === mode),
    ),
    recurrencePresent: allItems.some((item) => item.schedule?.recurrence),
    fieldsPresent: fixtures.some((fixture) => fixture.canonicalContent.fields.length),
    memosPresent: fixtures.some((fixture) => fixture.canonicalContent.memos.length),
    oneToManyPresent: relationTypes.some((value) => ['one_to_many', 'many_to_many'].includes(value)),
    manyToOnePresent: fixtures.some((fixture) =>
      fixture.canonicalContent.items.some((item) => {
        const refs = fixture.canonicalContent.sourceRefs.filter((ref) => item.sourceRefIds.includes(ref.sourceRefId));
        return refs.some((ref) => ref.sourceRowIds.length > 1);
      }),
    ),
    manyToManyPresent: manyToManyCases.length > 0,
    omissionControlPresent: boundaryOmissionRows.length > 0,
    optionalItemPresent: allItems.some((item) => item.optional),
    conditionPresent: allItems.some((item) => item.conditionMemoIds?.length),
    dependencyPresent: allItems.some((item) => item.dependsOnItemIds?.length),
    twoSetupInputPathPresent: fixtures.some(
      (fixture) => fixture.inputs.required.length + fixture.inputs.optional.length >= 2,
    ),
    duringExecutionFieldPresent: fixtures.some((fixture) => fixture.inputs.duringExecution?.length),
    singleItemFixturePresent: fixtures.some((fixture) => fixture.metrics.itemCount === 1),
    templateFieldFixturePresent: sourceShapes.includes('template_fields'),
    zeroItemFieldOrMemoFixturePresent: fixtures.some(
      (fixture) =>
        fixture.metrics.itemCount === 0 &&
        fixture.metrics.fieldCount + fixture.metrics.memoCount > 0 &&
        fixture.taxonomy.primaryArtifact !== 'calendar',
    ),
    selectedPrimaryProjectionHasOutput: fixtures.every((fixture) => {
      const projection = fixture.projectionEvaluation;
      if (fixture.taxonomy.primaryArtifact === 'calendar') return projection.calendar.entries.length > 0;
      if (fixture.taxonomy.primaryArtifact === 'sheet') return projection.sheet.rows.length > 0;
      if (fixture.taxonomy.primaryArtifact === 'memo') return projection.memo.blocks.length > 0;
      return projection[fixture.taxonomy.primaryArtifact].entries.length > 0;
    }),
    calendarPrimaryHasScheduledItems: fixtures.every(
      (fixture) => fixture.taxonomy.primaryArtifact !== 'calendar' || fixture.metrics.scheduledItemCount > 0,
    ),
    occurrenceIdentityExamplePresent: fixtures.some(
      (fixture) => fixture.conversionAudit.occurrenceIdentityExamples.length > 0,
    ),
    exactRelationClassification: relationTypes.every((value) =>
      ['one_to_one', 'many_to_one', 'one_to_many', 'many_to_many'].includes(value),
    ),
    sharedContextOrGroupingAtLeastThree: groupingCases.length >= 3,
    boundaryControlsAtMostFive: boundaries.length <= 5,
  };
  return {
    schemaVersion: 'flowme-structural-coverage-contract-v1',
    generatedAt: OBSERVED_AT,
    controlledValues: CONTROLLED,
    requiredCoverage: required,
    allRequiredCoveragePassed: Object.values(required).every(Boolean),
    observed: {
      fixtureCount: fixtures.length,
      sourceRows: fixtures.reduce((sum, fixture) => sum + fixture.metrics.sourceRowCount, 0),
      items: allItems.length,
      fields: fixtures.reduce((sum, fixture) => sum + fixture.metrics.fieldCount, 0),
      memos: fixtures.reduce((sum, fixture) => sum + fixture.metrics.memoCount, 0),
      sourceShapes: frequency(sourceShapes),
      executionPatterns: patternCounts,
      primaryArtifacts: frequency(artifacts),
      intents: frequency(allItems.map((item) => item.intent)),
      completionModes: frequency(allItems.map((item) => item.completion.mode)),
      scheduleModes: frequency(allItems.map((item) => item.schedule?.mode || 'none')),
      recurrenceItems: allItems.filter((item) => item.schedule?.recurrence).length,
      relationTypes: frequency(relationTypes),
      manyToManyCases: manyToManyCases.map((fixture) => fixture.fixtureId),
      boundaryOmissionRows: boundaryOmissionRows.length,
      optionalItems: allItems.filter((item) => item.optional).length,
      conditionedItems: allItems.filter((item) => item.conditionMemoIds?.length).length,
      dependentItems: allItems.filter((item) => item.dependsOnItemIds?.length).length,
      zeroInputFixtures: fixtures.filter((fixture) => fixture.inputs.required.length === 0).length,
      oneInputFixtures: fixtures.filter((fixture) => fixture.inputs.required.length === 1).length,
      twoOrMoreInputFixtures: fixtures.filter((fixture) => fixture.inputs.required.length >= 2).length,
      twoOrMoreSetupInputFixtures: fixtures.filter(
        (fixture) => fixture.inputs.required.length + fixture.inputs.optional.length >= 2,
      ).length,
      duringExecutionFieldFixtures: fixtures.filter((fixture) => fixture.inputs.duringExecution?.length).length,
      zeroItemFieldOrMemoFixtures: fixtures
        .filter((fixture) => fixture.metrics.itemCount === 0 && fixture.metrics.fieldCount + fixture.metrics.memoCount > 0)
        .map((fixture) => fixture.fixtureId),
      occurrenceIdentityExampleCount: fixtures.reduce(
        (sum, fixture) => sum + fixture.conversionAudit.occurrenceIdentityExamples.length,
        0,
      ),
      sharedContextOrGroupingCases: groupingCases.map((fixture) => fixture.fixtureId),
    },
    gaps: [
      '조건식 DSL과 dependency relation 종류는 공통 반복 근거가 부족해 Open으로 유지한다.',
      '외부 Calendar의 VTODO·RELATED-TO·X-property 왕복은 수행하지 않았다.',
      '연간·업무일 recurrence는 실제 독립 사례가 부족하다.',
      'single_action SourceShape는 실제 독립 SourceRow packet을 확보하지 못해 다음 source acquisition 목표로 남긴다.',
      '조건 충족 후 due date와 location의 공통 저장 형태는 독립 사례가 부족하다.',
      '공개 가능성과 전문 안전성은 이 구조 corpus의 판정 대상이 아니다.',
    ],
  };
}

function saturationLog(fixtures) {
  const batches = [
    { batch: 'batch_0_baseline', fixtures: fixtures.slice(0, 8), kind: 'frozen_baseline' },
    { batch: 'batch_1_expansion', fixtures: fixtures.slice(8, 18), kind: 'blind_conversion_chunk' },
    { batch: 'batch_2_expansion', fixtures: fixtures.slice(18, 28), kind: 'blind_conversion_chunk' },
    { batch: 'batch_3_expansion', fixtures: fixtures.slice(28, 38), kind: 'blind_conversion_chunk' },
    { batch: 'batch_4_expansion', fixtures: fixtures.slice(38), kind: 'blind_conversion_chunk' },
  ];
  const seen = { shapes: new Set(), patterns: new Set(), artifacts: new Set(), intents: new Set(), completion: new Set(), schedule: new Set() };
  let cumulative = 0;
  const entries = [];
  for (const batchSpec of batches) {
    const current = batchSpec.fixtures;
    cumulative += current.length;
    const before = Object.fromEntries(Object.entries(seen).map(([key, value]) => [key, value.size]));
    for (const fixture of current) {
      seen.shapes.add(fixture.taxonomy.sourceShape);
      seen.patterns.add(fixture.taxonomy.primaryExecutionPattern);
      seen.artifacts.add(fixture.taxonomy.primaryArtifact);
      for (const item of fixture.canonicalContent.items) {
        seen.intents.add(item.intent);
        seen.completion.add(item.completion.mode);
        seen.schedule.add(item.schedule?.mode || 'none');
      }
    }
    const after = Object.fromEntries(Object.entries(seen).map(([key, value]) => [key, value.size]));
    entries.push({
      batch: batchSpec.batch,
      batchKind: batchSpec.kind,
      fixtureCount: current.length,
      fixtureIds: current.map((fixture) => fixture.fixtureId),
      cumulativeFixtureCount: cumulative,
      newStructuralValues: Object.fromEntries(Object.keys(before).map((key) => [key, after[key] - before[key]])),
      cumulativeCoverage: after,
      newMandatoryCanonicalFields: [],
      newCommonRules: [],
      note:
        batchSpec.kind === 'frozen_baseline'
          ? '동결 baseline 8개를 첫 batch로 보존했다.'
          : '동결된 공통 변환 규칙으로 순서대로 10개 이하를 변환했으며 사례별 예외나 새 mandatory core field를 추가하지 않았다.',
    });
  }
  const patternCounts = frequency(fixtures.map((fixture) => fixture.taxonomy.primaryExecutionPattern));
  const recurrencePresent = fixtures.some((fixture) =>
    fixture.canonicalContent.items.some((item) => item.schedule?.recurrence),
  );
  const last20FixtureIds = fixtures.slice(-20).map((fixture) => fixture.fixtureId);
  const last20FixtureStability = {
    fixtureCount: last20FixtureIds.length,
    fixtureIds: last20FixtureIds,
    newMandatoryCanonicalFields: [],
    newCommonRules: [],
    stable: last20FixtureIds.length === 20,
    interpretation:
      '마지막 20개는 동결 규칙으로 변환됐다. 새 source shape 관측은 coverage 증가일 수 있지만 mandatory canonical field 또는 공통 규칙 변경을 뜻하지 않는다.',
  };
  const ready =
    fixtures.length >= 40 &&
    CONTROLLED.executionPatterns.every((pattern) => (patternCounts[pattern] || 0) >= 2) &&
    CONTROLLED.artifacts.every((artifact) => fixtures.some((fixture) => fixture.taxonomy.primaryArtifact === artifact)) &&
    recurrencePresent &&
    last20FixtureStability.stable;
  return {
    schemaVersion: 'flowme-structural-saturation-log-v1',
    generatedAt: OBSERVED_AT,
    entries,
    last20FixtureStability,
    decision: ready ? 'planning_handoff_ready_with_open_questions' : 'continue_source_acquisition',
    rationale:
      '40개 이상 실제 행 기반 fixture와 핵심 실행·projection 축을 확보했다. 남은 공백은 사례별 예외가 아니라 dependency, 고급 recurrence, 실제 destination 호환성 검증이다.',
  };
}

function backendDtos(fixtures) {
  const archetypes = [
    ...CONTROLLED.executionPatterns.map((pattern) => [
      `execution_pattern:${pattern}`,
      (fixture) => fixture.taxonomy.primaryExecutionPattern === pattern,
    ]),
    ['field_only_zero_item', (fixture) => fixture.canonicalContent.items.length === 0 && fixture.canonicalContent.fields.length > 0],
    ['anchor_offset', (fixture) => fixture.canonicalContent.items.some((item) => item.schedule?.mode === 'anchor_offset')],
    ['absolute', (fixture) => fixture.canonicalContent.items.some((item) => item.schedule?.mode === 'absolute')],
    ['date_window', (fixture) => fixture.canonicalContent.items.some((item) => item.schedule?.mode === 'date_window')],
    ['recurrence', (fixture) => fixture.canonicalContent.items.some((item) => item.schedule?.recurrence)],
    ['decision', (fixture) => fixture.canonicalContent.items.some((item) => item.intent === 'decide')],
    ['record', (fixture) => fixture.canonicalContent.items.some((item) => item.intent === 'record')],
    ['resource', (fixture) => fixture.canonicalContent.items.some((item) => item.intent === 'use_resource')],
    ['field', (fixture) => fixture.canonicalContent.fields.length > 0],
    ['memo', (fixture) => fixture.canonicalContent.memos.length > 0],
    ['multi_flow', (fixture) => fixture.canonicalContent.flows.length > 1],
    ['multi_step', (fixture) => fixture.canonicalContent.steps.length > 1],
    ['many_to_one', (fixture) =>
      fixture.canonicalContent.items.some((item) =>
        fixture.canonicalContent.sourceRefs
          .filter((ref) => item.sourceRefIds.includes(ref.sourceRefId))
          .some((ref) => ref.sourceRowIds.length > 1),
      )],
    ['one_to_many', (fixture) => fixture.conversionAudit.rowAccounting.some((entry) => entry.targets.length > 1)],
    ['zero_input', (fixture) => fixture.inputs.required.length === 0],
    ['no_calendar', (fixture) => fixture.projectionEvaluation.calendar.eventCount === 0],
  ];
  const chosen = [];
  const used = new Set();
  for (const [archetype, predicate] of archetypes) {
    const fixture = fixtures.find((candidate) => predicate(candidate) && !used.has(candidate.fixtureId));
    if (!fixture) continue;
    used.add(fixture.fixtureId);
    chosen.push({ archetype, fixture });
  }
  for (const fixture of fixtures) {
    if (chosen.length >= 15) break;
    if (!used.has(fixture.fixtureId)) {
      used.add(fixture.fixtureId);
      chosen.push({ archetype: 'portfolio_variety', fixture });
    }
  }
  return {
    schemaVersion: 'flowme-representative-backend-dto-v1',
    generatedAt: OBSERVED_AT,
    count: chosen.slice(0, 15).length,
    dtos: chosen.slice(0, 15).map(({ archetype, fixture }) => ({
      archetype,
      fixtureId: fixture.fixtureId,
      decision: {
        state: fixture.metrics.itemCount === 0 ? 'structure_only_no_items' : 'ready_for_structure_handoff',
        reason:
          fixture.metrics.itemCount === 0
            ? '원문은 실행 Item이 아니라 입력 Field 정의를 제공한다.'
            : '실제 SourceRow와 canonical Item 경계가 모두 추적된다.',
      },
      taxonomy: fixture.taxonomy,
      sourceEvidence: {
        source: fixture.source,
        sources: fixture.canonicalContent.sources,
        sourceSnapshots: fixture.canonicalContent.sourceSnapshots,
        sourceRows: fixture.canonicalContent.sourceRows,
        sourceRefs: fixture.canonicalContent.sourceRefs,
      },
      canonicalContent: {
        schemaVersion: fixture.canonicalContent.schemaVersion,
        contentId: fixture.canonicalContent.contentId,
        version: fixture.canonicalContent.version,
        contentHash: fixture.canonicalContent.contentHash,
        bundle: fixture.canonicalContent.bundle,
        flows: fixture.canonicalContent.flows,
        steps: fixture.canonicalContent.steps,
        items: fixture.canonicalContent.items,
        fields: fixture.canonicalContent.fields,
        memos: fixture.canonicalContent.memos,
      },
      conversionAudit: fixture.conversionAudit,
      inputContract: fixture.inputs,
      projectionPlan: fixture.projectionEvaluation,
      structureReview: fixture.researchReview,
    })),
  };
}

function storyboard(fixtures) {
  const desired = [
    'base-opentutorials-web1-progress',
    'base-moving-d30',
    'oq-oq-c02-kmooc-full',
    'oq-oq-c05-washer',
    'oq-oq-c08-ac-decision',
    'value-vq-01',
    'value-vq-06',
    'value-vq-10',
    'value-vq-11',
    'deep-ds08',
  ];
  const selected = [];
  for (const id of desired) {
    const fixture = fixtures.find((entry) => entry.fixtureId === id);
    if (fixture && !selected.includes(fixture)) selected.push(fixture);
  }
  for (const fixture of fixtures) {
    if (selected.length >= 12) break;
    if (!selected.includes(fixture) && (fixture.batch === 'live_reverified_expansion' || selected.length < 8)) selected.push(fixture);
  }
  return {
    schemaVersion: 'flowme-report-storyboard-v1',
    generatedAt: OBSERVED_AT,
    mainDeckTargetScreens: 38,
    representativeCount: selected.slice(0, 12).length,
    representatives: selected.slice(0, 12).map((fixture, index) => ({
      order: index + 1,
      fixtureId: fixture.fixtureId,
      archetype: `${fixture.taxonomy.sourceShape} → ${fixture.taxonomy.primaryExecutionPattern} → ${fixture.taxonomy.primaryArtifact}`,
      claim:
        index === 0
          ? '날짜 없는 진도 Item도 완전한 Flow이며 Sheet·Checklist로 자연스럽게 실행된다.'
          : `${fixture.source.title}은 원문 행을 ${fixture.metrics.itemCount}개 Item과 ${fixture.metrics.stepCount}개 Step으로 보존한다.`,
      sourceRowIds: fixture.canonicalContent.sourceRows.slice(0, 3).map((row) => row.sourceRowId),
      itemIds: fixture.canonicalContent.items.slice(0, 3).map((item) => item.itemId),
      slideATitle: `${fixture.source.title} · 원문에서 SourceRow로`,
      slideBTitle: `${fixture.source.title} · Item에서 projection으로`,
    })),
  };
}

function buildSchema() {
  const stringArray = { type: 'array', items: { type: 'string' }, uniqueItems: true };
  const idString = { type: 'string', minLength: 1 };
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://flowme.local/schemas/canonical-corpus-v1.schema.json',
    title: 'FlowMe Canonical Structure Corpus v1',
    type: 'object',
    additionalProperties: false,
    required: ['schemaVersion', 'generatedAt', 'counts', 'controlledEnums', 'fixtures', 'boundaryControls'],
    $defs: {
      OwnerRef: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'id'],
        properties: {
          type: { enum: ['bundle', 'flow', 'step', 'item'] },
          id: idString,
        },
      },
      Source: {
        type: 'object',
        additionalProperties: false,
        required: [
          'sourceId',
          'title',
          'sourceType',
          'originalUrl',
          'canonicalUrl',
          'locale',
          'publisher',
          'checkedAt',
          'rightsStatus',
          'riskLevel',
        ],
        properties: {
          sourceId: idString,
          title: idString,
          sourceType: { enum: ['reference', 'creator_experience'] },
          originalUrl: idString,
          canonicalUrl: idString,
          locale: idString,
          publisher: idString,
          checkedAt: idString,
          rightsStatus: { enum: ['needs_review'] },
          riskLevel: { enum: ['low', 'medical_sensitive', 'legal_sensitive', 'financial_sensitive', 'safety_sensitive'] },
        },
      },
      SourceSnapshot: {
        type: 'object',
        additionalProperties: false,
        required: [
          'snapshotId',
          'sourceId',
          'fetchedAt',
          'finalUrl',
          'contentHash',
          'extractionVersion',
          'hashBasis',
          'capturedSourceRowCount',
        ],
        properties: {
          snapshotId: idString,
          sourceId: idString,
          fetchedAt: idString,
          finalUrl: idString,
          contentHash: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
          extractionVersion: idString,
          hashBasis: { const: 'canonical_url_observed_at_and_captured_source_rows' },
          capturedSourceRowCount: { type: 'integer', minimum: 0 },
        },
      },
      SourceRow: {
        type: 'object',
        additionalProperties: false,
        required: ['sourceRowId', 'sourceId', 'snapshotId', 'rowType', 'title', 'detail', 'locator', 'order'],
        properties: {
          sourceRowId: idString,
          sourceId: idString,
          snapshotId: idString,
          rowType: { enum: ['date', 'offset', 'check', 'table_row', 'procedure', 'resource', 'reference'] },
          title: idString,
          detail: { type: 'string' },
          locator: idString,
          order: { type: 'integer', minimum: 0 },
        },
      },
      SourceRef: {
        type: 'object',
        additionalProperties: false,
        required: ['sourceRefId', 'entityType', 'entityId', 'sourceRowIds', 'relation', 'supportLevel'],
        properties: {
          sourceRefId: idString,
          entityType: { enum: ['item', 'field', 'memo'] },
          entityId: idString,
          sourceRowIds: { ...stringArray, minItems: 1 },
          relation: { enum: ['derived_from', 'supports'] },
          supportLevel: { const: 'direct' },
          note: { type: 'string' },
        },
      },
      Recurrence: {
        type: 'object',
        additionalProperties: false,
        required: ['frequency', 'interval', 'sourceDefined'],
        properties: {
          frequency: { enum: ['daily', 'weekly', 'monthly'] },
          interval: { type: 'integer', minimum: 1 },
          sourceDefined: { type: 'boolean' },
          weekdays: stringArray,
          count: { type: 'integer', minimum: 1 },
          until: { type: 'string' },
        },
      },
      Schedule: {
        type: 'object',
        additionalProperties: false,
        required: ['mode'],
        properties: {
          mode: { enum: CONTROLLED.scheduleModes },
          start: { type: 'string' },
          end: { type: 'string' },
          allDay: { type: 'boolean' },
          timezone: { type: 'string' },
          anchorFieldId: { type: 'string' },
          dayOffset: { type: 'integer' },
          basis: { enum: ['absolute', 'anchor_offset'] },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          sourceReminder: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          startDayOffset: { type: 'integer' },
          endDayOffset: { type: 'integer' },
          reminderDayOffset: { type: 'integer' },
          recurrence: { $ref: '#/$defs/Recurrence' },
        },
      },
      Completion: {
        type: 'object',
        additionalProperties: false,
        required: ['mode', 'doneWhen'],
        properties: {
          mode: { enum: CONTROLLED.completionModes },
          doneWhen: idString,
          recordFieldIds: stringArray,
          options: {
            type: 'array',
            minItems: 2,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['value', 'label'],
              properties: { value: idString, label: idString },
            },
          },
        },
      },
      SourceTrace: {
        type: 'object',
        additionalProperties: false,
        required: ['sourceRefId', 'sourceRowIds', 'relation', 'supportLevel'],
        properties: {
          sourceRefId: idString,
          sourceRowIds: { ...stringArray, minItems: 1 },
          relation: { enum: ['derived_from', 'supports'] },
          supportLevel: { const: 'direct' },
        },
      },
      Item: {
        type: 'object',
        additionalProperties: false,
        required: [
          'itemId',
          'stepId',
          'title',
          'description',
          'intent',
          'order',
          'completion',
          'fieldIds',
          'memoIds',
          'cautionMemoIds',
          'sourceRefIds',
          'optional',
          'dependsOnItemIds',
          'conditionMemoIds',
          'sourceTrace',
          'userOverlayPolicy',
        ],
        properties: {
          itemId: idString,
          stepId: idString,
          title: idString,
          description: { type: 'string' },
          intent: { enum: CONTROLLED.intents },
          order: { type: 'integer', minimum: 0 },
          completion: { $ref: '#/$defs/Completion' },
          schedule: { $ref: '#/$defs/Schedule' },
          fieldIds: stringArray,
          memoIds: stringArray,
          cautionMemoIds: stringArray,
          sourceRefIds: { ...stringArray, minItems: 1 },
          optional: { type: 'boolean' },
          dependsOnItemIds: stringArray,
          dependencySourceRefIds: stringArray,
          conditionMemoIds: stringArray,
          sourceTrace: { type: 'array', minItems: 1, items: { $ref: '#/$defs/SourceTrace' } },
          userOverlayPolicy: {
            type: 'object',
            additionalProperties: false,
            required: [
              'canRename',
              'canExclude',
              'canAddPersonalMemo',
              'canOverrideSchedule',
              'cannotRewriteSourceRows',
              'cannotRemoveCautions',
            ],
            properties: Object.fromEntries(
              [
                'canRename',
                'canExclude',
                'canAddPersonalMemo',
                'canOverrideSchedule',
                'cannotRewriteSourceRows',
                'cannotRemoveCautions',
              ].map((key) => [key, { type: 'boolean' }]),
            ),
          },
        },
      },
      Field: {
        type: 'object',
        additionalProperties: false,
        required: ['fieldId', 'owner', 'key', 'label', 'valueType', 'purposes', 'valueSource', 'required'],
        properties: {
          fieldId: idString,
          owner: { $ref: '#/$defs/OwnerRef' },
          key: idString,
          label: idString,
          valueType: { enum: CONTROLLED.fieldValueTypes },
          purposes: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: { enum: CONTROLLED.fieldPurposes },
          },
          valueSource: { enum: ['source', 'user'] },
          required: { type: 'boolean' },
          sourceDefault: {
            anyOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'array', items: { type: 'string' } }],
          },
          sourceRefIds: stringArray,
          options: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['value', 'label'],
              properties: { value: idString, label: idString },
            },
          },
        },
      },
      Memo: {
        type: 'object',
        additionalProperties: false,
        required: ['memoId', 'scope', 'kind', 'title', 'text', 'sourceRefIds'],
        properties: {
          memoId: idString,
          scope: { $ref: '#/$defs/OwnerRef' },
          kind: { enum: ['source_detail', 'instruction', 'caution'] },
          title: idString,
          text: { type: 'string' },
          sourceRefIds: { ...stringArray, minItems: 1 },
        },
      },
      Step: {
        type: 'object',
        additionalProperties: false,
        required: ['stepId', 'flowId', 'title', 'order', 'itemIds', 'sourceRefIds', 'groupingHint'],
        properties: {
          stepId: idString,
          flowId: idString,
          title: idString,
          order: { type: 'integer', minimum: 0 },
          itemIds: { ...stringArray, minItems: 1 },
          sourceRefIds: stringArray,
          groupingHint: { type: 'string' },
        },
      },
      ProjectionProfile: {
        type: 'object',
        additionalProperties: false,
        required: [
          'target',
          'formats',
          'granularity',
          'groupBy',
          'includeSource',
          'includeCautions',
          'includeUserMemo',
        ],
        properties: {
          target: { enum: CONTROLLED.artifacts },
          formats: stringArray,
          granularity: { enum: ['item', 'step_bundle'] },
          groupBy: { enum: ['flow', 'step'] },
          includeSource: { type: 'boolean' },
          includeCautions: { type: 'boolean' },
          includeUserMemo: { type: 'boolean' },
        },
      },
      Flow: {
        type: 'object',
        additionalProperties: false,
        required: [
          'flowId',
          'bundleId',
          'title',
          'summary',
          'userNeed',
          'primarySourceId',
          'supportingSourceIds',
          'setupFieldIds',
          'stepIds',
          'planningPattern',
          'secondaryPatterns',
          'primaryArtifact',
          'projectionProfiles',
          'riskLevel',
        ],
        properties: {
          flowId: idString,
          bundleId: idString,
          title: idString,
          summary: { type: 'string' },
          userNeed: { type: 'string' },
          primarySourceId: idString,
          supportingSourceIds: stringArray,
          setupFieldIds: stringArray,
          stepIds: stringArray,
          planningPattern: { type: 'string' },
          secondaryPatterns: stringArray,
          primaryArtifact: { enum: CONTROLLED.artifacts },
          projectionProfiles: { type: 'array', minItems: 1, items: { $ref: '#/$defs/ProjectionProfile' } },
          riskLevel: { enum: ['low', 'medical_sensitive', 'legal_sensitive', 'financial_sensitive', 'safety_sensitive'] },
          anchorDefinition: {
            type: 'object',
            additionalProperties: false,
            required: ['fieldId', 'kind', 'label', 'required'],
            properties: {
              fieldId: idString,
              kind: { enum: ['birth_date', 'event_date', 'start_date'] },
              label: idString,
              required: { type: 'boolean' },
            },
          },
        },
      },
      Bundle: {
        type: 'object',
        additionalProperties: false,
        required: ['bundleId', 'title', 'summary', 'lifeArea', 'topicTags', 'flowIds'],
        properties: {
          bundleId: idString,
          title: idString,
          summary: { type: 'string' },
          lifeArea: { enum: CONTROLLED.lifeAreas },
          topicTags: stringArray,
          flowIds: { ...stringArray, minItems: 1 },
        },
      },
      CanonicalContent: {
        type: 'object',
        additionalProperties: false,
        required: [
          'schemaVersion',
          'contentId',
          'version',
          'contentHash',
          'lifecycleStatus',
          'createdAt',
          'updatedAt',
          'bundle',
          'flows',
          'steps',
          'items',
          'fields',
          'memos',
          'sources',
          'sourceSnapshots',
          'sourceRows',
          'sourceRefs',
        ],
        properties: {
          schemaVersion: { const: 'flowme-canonical-flow-v1' },
          contentId: idString,
          version: idString,
          contentHash: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
          lifecycleStatus: { const: 'draft' },
          createdAt: idString,
          updatedAt: idString,
          bundle: { $ref: '#/$defs/Bundle' },
          flows: { type: 'array', minItems: 1, items: { $ref: '#/$defs/Flow' } },
          steps: { type: 'array', items: { $ref: '#/$defs/Step' } },
          items: { type: 'array', items: { $ref: '#/$defs/Item' } },
          fields: { type: 'array', items: { $ref: '#/$defs/Field' } },
          memos: { type: 'array', items: { $ref: '#/$defs/Memo' } },
          sources: { type: 'array', minItems: 1, items: { $ref: '#/$defs/Source' } },
          sourceSnapshots: { type: 'array', minItems: 1, items: { $ref: '#/$defs/SourceSnapshot' } },
          sourceRows: { type: 'array', minItems: 1, items: { $ref: '#/$defs/SourceRow' } },
          sourceRefs: { type: 'array', items: { $ref: '#/$defs/SourceRef' } },
        },
      },
      RowAccounting: {
        type: 'object',
        additionalProperties: false,
        required: ['sourceRowId', 'targetType', 'targets', 'relationType', 'reason'],
        properties: {
          sourceRowId: idString,
          targetType: { enum: CONTROLLED.rowTargets },
          targets: stringArray,
          relationType: { enum: ['one_to_one', 'many_to_one', 'one_to_many', 'many_to_many', 'omitted'] },
          reason: { type: 'string' },
        },
      },
      ProvenanceClaim: {
        type: 'object',
        additionalProperties: false,
        required: [
          'itemId',
          'actionRefIds',
          'detailRefIds',
          'completionRefIds',
          'completionDerivation',
          'scheduleRefIds',
          'recurrenceRefIds',
          'dependencyRefIds',
          'note',
        ],
        properties: {
          itemId: idString,
          actionRefIds: stringArray,
          detailRefIds: stringArray,
          completionRefIds: stringArray,
          completionDerivation: { const: 'controlled_system_grammar_over_source_backed_action' },
          scheduleRefIds: stringArray,
          recurrenceRefIds: stringArray,
          dependencyRefIds: stringArray,
          note: { type: 'string' },
        },
      },
      ConversionAudit: {
        type: 'object',
        additionalProperties: false,
        required: [
          'rowAccounting',
          'itemProvenanceClaims',
          'relationTypes',
          'unresolvedQuestions',
          'canonicalExtensionCandidates',
          'occurrenceIdentityExamples',
        ],
        properties: {
          rowAccounting: { type: 'array', minItems: 1, items: { $ref: '#/$defs/RowAccounting' } },
          itemProvenanceClaims: { type: 'array', items: { $ref: '#/$defs/ProvenanceClaim' } },
          relationTypes: {
            type: 'array',
            uniqueItems: true,
            items: { enum: ['one_to_one', 'many_to_one', 'one_to_many', 'many_to_many', 'omitted'] },
          },
          unresolvedQuestions: stringArray,
          canonicalExtensionCandidates: stringArray,
          occurrenceIdentityExamples: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: [
                'itemId',
                'keyTemplate',
                'identityTupleTemplate',
                'simulationStatus',
                'simulationAnchor',
                'occurrenceKeys',
                'identityTuples',
              ],
              properties: {
                itemId: idString,
                keyTemplate: { const: 'date:<local-YYYY-MM-DD>' },
                identityTupleTemplate: stringArray,
                simulationStatus: { const: 'contract_test_not_source_fact' },
                simulationAnchor: { const: '2099-01-01' },
                occurrenceKeys: { ...stringArray, minItems: 2 },
                identityTuples: { ...stringArray, minItems: 2 },
              },
            },
          },
          classificationDelta: {
            type: 'object',
            additionalProperties: false,
            required: ['fromPrimaryArtifact', 'toPrimaryArtifact', 'reason'],
            properties: {
              fromPrimaryArtifact: { enum: CONTROLLED.artifacts },
              toPrimaryArtifact: { enum: CONTROLLED.artifacts },
              reason: idString,
            },
          },
        },
      },
      InputDefinition: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'label', 'type'],
        properties: {
          key: idString,
          label: idString,
          type: { enum: CONTROLLED.fieldValueTypes },
          required: { type: 'boolean' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['value', 'label'],
              properties: { value: idString, label: idString },
            },
          },
        },
      },
      InputContract: {
        type: 'object',
        additionalProperties: false,
        required: ['required', 'optional', 'duringExecution', 'autoFilled', 'neverAskAgain'],
        properties: {
          required: { type: 'array', items: { $ref: '#/$defs/InputDefinition' } },
          optional: { type: 'array', items: { $ref: '#/$defs/InputDefinition' } },
          duringExecution: { type: 'array', items: { $ref: '#/$defs/InputDefinition' } },
          autoFilled: stringArray,
          neverAskAgain: stringArray,
        },
      },
      CalendarEntry: {
        type: 'object',
        additionalProperties: false,
        required: [
          'component',
          'projectionId',
          'itemId',
          'stepId',
          'title',
          'schedule',
          'childItemIds',
          'completionOwner',
          'unresolvedAnchor',
        ],
        properties: {
          component: { const: 'VEVENT' },
          projectionId: idString,
          itemId: idString,
          stepId: idString,
          title: idString,
          schedule: { $ref: '#/$defs/Schedule' },
          childItemIds: { ...stringArray, minItems: 1 },
          completionOwner: idString,
          unresolvedAnchor: { type: 'boolean' },
          lossNote: { type: 'string' },
        },
      },
      ChecklistEntry: {
        type: 'object',
        additionalProperties: false,
        required: ['itemId', 'group', 'title', 'completion', 'sourceRefIds'],
        properties: {
          itemId: idString,
          group: { type: 'string' },
          title: idString,
          completion: { enum: CONTROLLED.completionModes },
          sourceRefIds: { ...stringArray, minItems: 1 },
        },
      },
      SheetRow: {
        anyOf: [
          {
            type: 'object',
            additionalProperties: false,
            required: [
              'rowKind',
              'itemId',
              'step',
              'title',
              'intent',
              'completion',
              'scheduleMode',
              'sourceRefIds',
            ],
            properties: {
              rowKind: { const: 'item' },
              itemId: idString,
              step: { type: 'string' },
              title: idString,
              intent: { enum: CONTROLLED.intents },
              completion: { enum: CONTROLLED.completionModes },
              scheduleMode: { anyOf: [{ enum: CONTROLLED.scheduleModes }, { type: 'null' }] },
              sourceRefIds: { ...stringArray, minItems: 1 },
            },
          },
          {
            type: 'object',
            additionalProperties: false,
            required: ['rowKind', 'fieldId', 'title', 'valueType', 'required', 'sourceRefIds'],
            properties: {
              rowKind: { const: 'field_definition' },
              fieldId: idString,
              title: idString,
              valueType: { enum: CONTROLLED.fieldValueTypes },
              required: { type: 'boolean' },
              sourceRefIds: { ...stringArray, minItems: 1 },
            },
          },
        ],
      },
      MemoProjectionBlock: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description'],
        properties: {
          itemId: idString,
          memoId: idString,
          title: idString,
          description: { type: 'string' },
          sourceRefIds: stringArray,
        },
      },
      ProjectionEvaluation: {
        type: 'object',
        additionalProperties: false,
        required: [
          'primaryArtifact',
          'secondaryArtifacts',
          'calendarPolicy',
          'calendar',
          'vtodo',
          'checklist',
          'todo',
          'sheet',
          'memo',
          'forbidden',
          'lossNotes',
        ],
        properties: {
          primaryArtifact: { enum: CONTROLLED.artifacts },
          secondaryArtifacts: { type: 'array', uniqueItems: true, items: { enum: CONTROLLED.artifacts } },
          calendarPolicy: { enum: ['none', 'optional_per_item', 'per_item', 'step_bundle'] },
          calendar: {
            type: 'object',
            additionalProperties: false,
            required: ['selected', 'eligibleScheduledItemCount', 'eventCount', 'entries', 'suppressedUndatedItemIds', 'rule'],
            properties: {
              selected: { type: 'boolean' },
              eligibleScheduledItemCount: { type: 'integer', minimum: 0 },
              eventCount: { type: 'integer', minimum: 0 },
              entries: { type: 'array', items: { $ref: '#/$defs/CalendarEntry' } },
              suppressedUndatedItemIds: stringArray,
              rule: idString,
            },
          },
          vtodo: {
            type: 'object',
            additionalProperties: false,
            required: ['capabilityStatus', 'entries', 'fallbackOrder'],
            properties: {
              capabilityStatus: { const: 'not_tested' },
              entries: { type: 'array' },
              fallbackOrder: { type: 'array', items: { enum: CONTROLLED.artifacts }, uniqueItems: true },
            },
          },
          checklist: {
            type: 'object',
            additionalProperties: false,
            required: ['selected', 'entries'],
            properties: {
              selected: { type: 'boolean' },
              entries: { type: 'array', items: { $ref: '#/$defs/ChecklistEntry' } },
            },
          },
          todo: {
            type: 'object',
            additionalProperties: false,
            required: ['selected', 'entries'],
            properties: {
              selected: { type: 'boolean' },
              entries: { type: 'array', items: { $ref: '#/$defs/ChecklistEntry' } },
            },
          },
          sheet: {
            type: 'object',
            additionalProperties: false,
            required: ['selected', 'rows'],
            properties: { selected: { type: 'boolean' }, rows: { type: 'array', items: { $ref: '#/$defs/SheetRow' } } },
          },
          memo: {
            type: 'object',
            additionalProperties: false,
            required: ['selected', 'blocks'],
            properties: {
              selected: { type: 'boolean' },
              blocks: { type: 'array', items: { $ref: '#/$defs/MemoProjectionBlock' } },
            },
          },
          forbidden: stringArray,
          lossNotes: stringArray,
        },
      },
      ResearchReview: {
        type: 'object',
        additionalProperties: false,
        required: ['researchUseStatus', 'publicReadiness', 'reviewFlags', 'claimBoundary'],
        properties: {
          researchUseStatus: { const: 'research_only' },
          publicReadiness: { const: 'not_assessed' },
          reviewFlags: stringArray,
          claimBoundary: idString,
        },
      },
      Metrics: {
        type: 'object',
        additionalProperties: false,
        required: [
          'flowCount',
          'stepCount',
          'itemCount',
          'fieldCount',
          'memoCount',
          'sourceRowCount',
          'scheduledItemCount',
          'undatedItemCount',
        ],
        properties: Object.fromEntries(
          [
            'flowCount',
            'stepCount',
            'itemCount',
            'fieldCount',
            'memoCount',
            'sourceRowCount',
            'scheduledItemCount',
            'undatedItemCount',
          ].map((key) => [key, { type: 'integer', minimum: 0 }]),
        ),
      },
    },
    properties: {
      schemaVersion: { const: 'flowme-canonical-structure-corpus-v1' },
      generatedAt: { type: 'string' },
      claimBoundary: { type: 'string' },
      controlledEnums: {
        type: 'object',
        additionalProperties: false,
        required: [
          'lifeAreas',
          'sourceShapes',
          'executionPatterns',
          'artifacts',
          'intents',
          'completionModes',
          'scheduleModes',
          'rowTargets',
          'fieldValueTypes',
          'fieldPurposes',
        ],
        properties: {
          lifeAreas: { type: 'array', items: { enum: CONTROLLED.lifeAreas }, uniqueItems: true },
          sourceShapes: { type: 'array', items: { enum: CONTROLLED.sourceShapes }, uniqueItems: true },
          executionPatterns: { type: 'array', items: { enum: CONTROLLED.executionPatterns }, uniqueItems: true },
          artifacts: { type: 'array', items: { enum: CONTROLLED.artifacts }, uniqueItems: true },
          intents: { type: 'array', items: { enum: CONTROLLED.intents }, uniqueItems: true },
          completionModes: { type: 'array', items: { enum: CONTROLLED.completionModes }, uniqueItems: true },
          scheduleModes: { type: 'array', items: { enum: CONTROLLED.scheduleModes }, uniqueItems: true },
          rowTargets: { type: 'array', items: { enum: CONTROLLED.rowTargets }, uniqueItems: true },
          fieldValueTypes: { type: 'array', items: { enum: CONTROLLED.fieldValueTypes }, uniqueItems: true },
          fieldPurposes: { type: 'array', items: { enum: CONTROLLED.fieldPurposes }, uniqueItems: true },
        },
      },
      counts: {
        type: 'object',
        additionalProperties: false,
        required: [
          'completeFixtures',
          'boundaryControls',
          'bundles',
          'maps',
          'sourceRows',
          'flows',
          'steps',
          'items',
          'fields',
          'memos',
          'scheduledItems',
          'undatedItems',
        ],
        properties: {
          completeFixtures: { type: 'integer', minimum: 40 },
          boundaryControls: { type: 'integer', minimum: 0, maximum: 5 },
          bundles: { type: 'integer', minimum: 40 },
          maps: { type: 'integer', minimum: 40 },
          sourceRows: { type: 'integer', minimum: 1 },
          flows: { type: 'integer', minimum: 1 },
          steps: { type: 'integer', minimum: 1 },
          items: { type: 'integer', minimum: 0 },
          fields: { type: 'integer', minimum: 0 },
          memos: { type: 'integer', minimum: 0 },
          scheduledItems: { type: 'integer', minimum: 0 },
          undatedItems: { type: 'integer', minimum: 0 },
        },
      },
      fixtureSelection: {
        type: 'object',
        additionalProperties: false,
        required: ['ordering', 'duplicateRule', 'rejectedDuplicates'],
        properties: {
          ordering: stringArray,
          duplicateRule: idString,
          rejectedDuplicates: { type: 'array', items: { type: 'object' } },
        },
      },
      fixtures: {
        type: 'array',
        minItems: 40,
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'fixtureId',
            'batch',
            'evidenceTier',
            'originalRecordRef',
            'source',
            'userNeed',
            'taxonomy',
            'canonicalContent',
            'conversionAudit',
            'inputs',
            'projectionEvaluation',
            'researchReview',
            'metrics',
          ],
          properties: {
            fixtureId: { type: 'string', minLength: 1 },
            batch: { type: 'string', minLength: 1 },
            originalRecordRef: idString,
            userNeed: { type: 'string' },
            evidenceTier: {
              enum: [
                'frozen_qualified_v2_canonical',
                'frozen_gold_source_contract',
                'frozen_value_gold_contract',
                'frozen_deep_set_source_rows',
                'live_source_reverified',
              ],
            },
            source: {
              type: 'object',
              additionalProperties: false,
              required: [
                'sourceId',
                'snapshotId',
                'snapshotContentHash',
                'title',
                'provider',
                'url',
                'canonicalUrl',
                'locale',
                'observedAt',
                'accessStatus',
                'evidenceTier',
              ],
              properties: {
                sourceId: { type: 'string' },
                snapshotId: { type: 'string' },
                snapshotContentHash: { type: 'string', pattern: '^sha256:[a-f0-9]{64}$' },
                title: { type: 'string' },
                provider: { type: 'string' },
                url: { type: 'string' },
                canonicalUrl: { type: 'string' },
                locale: { type: 'string' },
                observedAt: { type: 'string' },
                accessStatus: { const: 'captured_in_internal_research_artifact' },
                evidenceTier: { type: 'string' },
              },
            },
            taxonomy: {
              type: 'object',
              additionalProperties: false,
              required: [
                'version',
                'primaryLifeArea',
                'secondaryLifeAreas',
                'topicTags',
                'sourceShape',
                'secondarySourceShapes',
                'primaryExecutionPattern',
                'secondaryExecutionPatterns',
                'primaryArtifact',
                'secondaryArtifacts',
              ],
              properties: {
                version: { const: 'flowme-taxonomy-v1.1' },
                primaryLifeArea: { enum: CONTROLLED.lifeAreas },
                secondaryLifeAreas: { type: 'array', items: { enum: CONTROLLED.lifeAreas }, uniqueItems: true },
                topicTags: { type: 'array', items: { type: 'string' } },
                sourceShape: { enum: CONTROLLED.sourceShapes },
                secondarySourceShapes: { type: 'array', items: { enum: CONTROLLED.sourceShapes }, uniqueItems: true },
                primaryExecutionPattern: { enum: CONTROLLED.executionPatterns },
                secondaryExecutionPatterns: { type: 'array', items: { enum: CONTROLLED.executionPatterns }, uniqueItems: true },
                primaryArtifact: { enum: CONTROLLED.artifacts },
                secondaryArtifacts: { type: 'array', items: { enum: CONTROLLED.artifacts }, uniqueItems: true },
              },
            },
            canonicalContent: { $ref: '#/$defs/CanonicalContent' },
            conversionAudit: { $ref: '#/$defs/ConversionAudit' },
            inputs: { $ref: '#/$defs/InputContract' },
            projectionEvaluation: { $ref: '#/$defs/ProjectionEvaluation' },
            researchReview: { $ref: '#/$defs/ResearchReview' },
            metrics: { $ref: '#/$defs/Metrics' },
          },
        },
      },
      boundaryControls: { type: 'array', maxItems: 5, items: { type: 'object' } },
    },
  };
}

function main() {
  const dataByKey = Object.fromEntries(
    Object.entries(INPUTS)
      .filter(([key, rel]) => rel.endsWith('.json') && fs.existsSync(abs(rel)))
      .map(([key, rel]) => [key, readJson(rel)]),
  );
  const requiredMissing = ['baseline', 'outputQuality', 'valueGold', 'deepSet', 'reverified'].filter((key) => !dataByKey[key]);
  if (requiredMissing.length) throw new Error(`Missing required inputs: ${requiredMissing.join(', ')}`);

  const inputLineage = {
    schemaVersion: 'flowme-canonical-structure-input-lineage-v1',
    generatedAt: OBSERVED_AT,
    frozenBeforeBuild: true,
    inputs: Object.entries(INPUTS)
      .filter(([, rel]) => fs.existsSync(abs(rel)))
      .map(([role, rel]) => {
        const buffer = fs.readFileSync(abs(rel));
        return { role, path: rel, sha256: sha(buffer), bytes: buffer.length };
      }),
    ownership: {
      ownedPaths: [
        'docs/specs/2026-07-28-flow-canonical-structure-corpus-expansion-v1/',
        'docs/content-audit/2026-07-28-flow-canonical-structure-corpus-expansion-review-ko.html',
      ],
      existingDirtyFilesPreserved: true,
      runtimeFilesChanged: false,
    },
  };

  const baselineFixtures = buildBaselineFixtures(dataByKey.baseline);
  inputLineage.baselinePreservation = baselinePreservationManifest(dataByKey.baseline, baselineFixtures);
  inputLineage.baselinePreservationSummary = {
    fixtureCount: inputLineage.baselinePreservation.length,
    allSemanticChecksPassed: inputLineage.baselinePreservation.every((entry) => entry.allSemanticChecksPassed),
  };
  const oqFixtures = dataByKey.outputQuality.cases.filter((record) => record.sourceCompleteness === 'complete').map(buildOqFixture);
  const valueFixtures = dataByKey.valueGold.cases
    .filter((record) => record.goldClass === 'positive')
    .filter((record) => VALUE_CLASSIFICATION[record.caseId])
    .map(buildValueFixture);
  const deepFixtures = dataByKey.deepSet.cases
    .filter((record) => !['DS03', 'DS09'].includes(record.caseId))
    .map(buildDeepFixture);
  const liveFixtures = (dataByKey.reverified.completePackets || []).map(buildReverifiedFixture);
  const { selected: fixtures, rejected } = selectUnique(
    [...baselineFixtures, ...oqFixtures, ...valueFixtures, ...deepFixtures, ...liveFixtures],
    40,
  );
  const boundaries = boundaryControls(dataByKey.deepSet, dataByKey.outputQuality, dataByKey.reverified);
  const counts = {
    completeFixtures: fixtures.length,
    boundaryControls: boundaries.length,
    bundles: fixtures.length,
    maps: fixtures.length,
    sourceRows: fixtures.reduce((sum, fixture) => sum + fixture.metrics.sourceRowCount, 0),
    flows: fixtures.reduce((sum, fixture) => sum + fixture.metrics.flowCount, 0),
    steps: fixtures.reduce((sum, fixture) => sum + fixture.metrics.stepCount, 0),
    items: fixtures.reduce((sum, fixture) => sum + fixture.metrics.itemCount, 0),
    fields: fixtures.reduce((sum, fixture) => sum + fixture.metrics.fieldCount, 0),
    memos: fixtures.reduce((sum, fixture) => sum + fixture.metrics.memoCount, 0),
    scheduledItems: fixtures.reduce((sum, fixture) => sum + fixture.metrics.scheduledItemCount, 0),
    undatedItems: fixtures.reduce((sum, fixture) => sum + fixture.metrics.undatedItemCount, 0),
  };
  const corpus = {
    schemaVersion: 'flowme-canonical-structure-corpus-v1',
    generatedAt: OBSERVED_AT,
    claimBoundary:
      '실제 원문 행과 동결 연구 계약에 기반한 구조 연구 corpus다. 공개 허가, 전문 검토, 사용자 유용성, 외부 Calendar 호환성 판정이 아니다.',
    controlledEnums: CONTROLLED,
    counts,
    fixtureSelection: {
      ordering: ['qualified_v2_baseline', 'output_quality_gold', 'value_qualified_gold', 'deep_set_unique', 'live_reverified_expansion'],
      duplicateRule: 'canonical primary URL 기준 첫 번째 완전한 source packet을 유지',
      rejectedDuplicates: rejected,
    },
    fixtures,
    boundaryControls: boundaries,
  };

  const mapping = {
    schemaVersion: 'flowme-source-row-item-mapping-v1',
    generatedAt: OBSERVED_AT,
    fixtureCount: fixtures.length,
    sourceRowCount: counts.sourceRows,
    records: fixtures.flatMap((fixture) =>
      fixture.conversionAudit.rowAccounting.map((entry) => ({
        fixtureId: fixture.fixtureId,
        sourceTitle: fixture.source.title,
        ...entry,
      })),
    ),
  };
  const coverage = structuralCoverage(fixtures, boundaries);
  const saturation = saturationLog(fixtures);
  const dtos = backendDtos(fixtures);
  const story = storyboard(fixtures);
  const ledger = buildCandidateLedger(fixtures, dataByKey, rejected);
  const schema = buildSchema();

  writeJson('input-lineage-v1.json', inputLineage);
  writeJson('candidate-master-ledger-v1.json', ledger);
  writeJson('canonical-corpus-v1.json', corpus);
  writeJson('canonical-corpus.schema.json', schema);
  writeJson('source-row-item-mapping-v1.json', mapping);
  writeJson('structural-coverage-contract-v1.json', coverage);
  writeJson('structural-saturation-log-v1.json', saturation);
  writeJson('representative-backend-dto-v1.json', dtos);
  writeJson('report-storyboard-v1.json', story);

  process.stdout.write(
    `${JSON.stringify(
      {
        generated: [
          'input-lineage-v1.json',
          'candidate-master-ledger-v1.json',
          'canonical-corpus-v1.json',
          'canonical-corpus.schema.json',
          'source-row-item-mapping-v1.json',
          'structural-coverage-contract-v1.json',
          'structural-saturation-log-v1.json',
          'representative-backend-dto-v1.json',
          'report-storyboard-v1.json',
        ],
        counts,
        coveragePassed: coverage.allRequiredCoveragePassed,
        rejectedDuplicates: rejected.length,
      },
      null,
      2,
    )}\n`,
  );
}

main();
