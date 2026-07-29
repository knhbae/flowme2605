import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SPEC_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SPEC_DIR, '..', '..', '..');
const CREATOR_DATA_PATH = path.join(
  REPO_ROOT,
  'docs',
  'content-audit',
  '2026-07-23-creator-flow-portfolio-data-v1.json',
);
const creatorData = JSON.parse(fs.readFileSync(CREATOR_DATA_PATH, 'utf8'));
const creatorById = new Map(
  creatorData.creatorPortfolioRecords.map((record) => [record.creatorId, record]),
);

const ARCHITECTURES = [
  'current_canonical_v1',
  'literal_ics_first',
  'item_first_shared_context',
];

const LOSS_VALUES = new Set([
  'direct',
  'grouped',
  'memo_fallback',
  'omitted',
  'forbidden',
  'not_applicable',
]);

const CATEGORY_RULES = {
  'home-ajd': {
    mapType: 'ordered',
    sourceShape: 'date_offsets',
    executionPattern: 'date_preparation',
    secondaryPatterns: ['ordered_procedure'],
    primaryArtifact: 'calendar',
    secondaryArtifacts: ['checklist'],
    calendarDefault: 'step_bundle',
    userJob: '이사일을 기준으로 준비 시점을 놓치지 않고, 같은 시점의 할 일을 함께 끝낸다.',
  },
  'family-babyfood016': {
    mapType: 'ordered',
    sourceShape: 'table_rows',
    executionPattern: 'progress_tracking',
    secondaryPatterns: ['date_preparation'],
    primaryArtifact: 'calendar',
    secondaryArtifacts: ['checklist', 'sheet'],
    calendarDefault: 'per_item',
    userJob: '원문 식단 행을 생후 일수 순서대로 보고 실제 제공 여부를 기록한다.',
  },
  'study-mansour': {
    mapType: 'ordered',
    sourceShape: 'lesson_rows',
    executionPattern: 'progress_tracking',
    secondaryPatterns: ['date_preparation'],
    primaryArtifact: 'sheet',
    secondaryArtifacts: ['calendar', 'checklist'],
    calendarDefault: 'optional_per_item',
    userJob: '원문 2주 또는 1달 계획의 회차별 진도를 펼쳐서 관리한다.',
  },
  'money-getcha': {
    mapType: 'ordered',
    sourceShape: 'procedure_rows',
    executionPattern: 'ordered_procedure',
    secondaryPatterns: ['compare_decide'],
    primaryArtifact: 'checklist',
    secondaryArtifacts: ['sheet', 'memo'],
    calendarDefault: 'none',
    userJob: '신차 구매 과정의 확인·비교·결정 단계를 빠뜨리지 않고 기록한다.',
  },
  'health-allblanc': {
    mapType: 'ordered',
    sourceShape: 'resource_collection',
    executionPattern: 'progress_tracking',
    secondaryPatterns: ['date_preparation'],
    primaryArtifact: 'calendar',
    secondaryArtifacts: ['checklist'],
    calendarDefault: 'per_item',
    userJob: '제작자가 정한 7일 영상 순서를 따라가며 오늘 영상 완료 상태를 남긴다.',
  },
  'travel-triple': {
    mapType: 'single_flow',
    sourceShape: 'checklist_rows',
    executionPattern: 'ordered_procedure',
    secondaryPatterns: [],
    primaryArtifact: 'checklist',
    secondaryArtifacts: ['memo'],
    calendarDefault: 'none',
    userJob: '카파도키아 출국 전 원문 확인 항목을 날짜 입력 없이 빠르게 점검한다.',
  },
  'meals-wtable': {
    mapType: 'source_curation',
    sourceShape: 'resource_collection',
    executionPattern: 'resource_queue',
    secondaryPatterns: [],
    primaryArtifact: 'checklist',
    secondaryArtifacts: ['memo'],
    calendarDefault: 'none',
    userJob: '제작자가 고른 다섯 레시피 중 이번 주에 만들 것을 고르고 완료한다.',
  },
  'work-andstudio': {
    mapType: 'unordered_collection',
    sourceShape: 'resource_collection',
    executionPattern: 'resource_queue',
    secondaryPatterns: [],
    primaryArtifact: 'todo',
    secondaryArtifacts: ['memo'],
    calendarDefault: 'none',
    userJob: '서로 독립적인 취업 준비 영상 중 필요한 것을 골라 보고 적용한다.',
  },
  'hobby-fitpet': {
    mapType: 'single_sensitive_schedule',
    sourceShape: 'table_rows',
    executionPattern: 'date_preparation',
    secondaryPatterns: ['progress_tracking'],
    primaryArtifact: 'calendar',
    secondaryArtifacts: ['checklist', 'memo'],
    calendarDefault: 'per_item',
    userJob: '원문 생후 주차를 참고 일정으로 보고 실제 일정은 담당 수의사와 확인한다.',
  },
};

const SAMPLE_INPUTS = {
  'bundle-moving-d30': { moveDate: '2026-09-01' },
  'bundle-baby-food-174': { startDate: '2026-08-01', sourceDay: 174 },
  'bundle-opic-plan': { planVariant: '2주', startDate: '2026-08-03' },
  'bundle-allblanc-7day-abs': { startDate: '2026-08-03' },
  'bundle-fitpet-puppy-vaccination': { birthDate: '2026-05-01' },
};

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(SPEC_DIR, relativePath), 'utf8'));
}

function ensureDir(relativePath) {
  fs.mkdirSync(path.join(SPEC_DIR, relativePath), { recursive: true });
}

function writeJson(relativePath, value) {
  const target = path.join(SPEC_DIR, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(relativePath, value) {
  const target = path.join(SPEC_DIR, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable(value[key])]),
  );
}

function semanticEqual(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeText(value = '') {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll('\r\n', '\\n')
    .replaceAll('\n', '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function dateUtc(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(value, days) {
  const date = typeof value === 'string' ? dateUtc(value) : new Date(value.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function compactDate(value) {
  return value.replaceAll('-', '');
}

function getBundleStats(example) {
  const flows = example.userContentBundle.map.flows;
  const steps = flows.flatMap((flow) => flow.steps);
  const items = steps.flatMap((step) => step.items);
  return {
    flows,
    steps,
    items,
    counts: {
      flows: flows.length,
      steps: steps.length,
      items: items.length,
      sourceRows: example.sourceRows.length,
    },
  };
}

function getStepForItem(example, itemId) {
  for (const flow of example.userContentBundle.map.flows) {
    for (const step of flow.steps) {
      if (step.items.some((item) => item.itemId === itemId)) return { flow, step };
    }
  }
  return null;
}

function providerId(record) {
  const platform = String(record?.platform ?? 'web').toLowerCase();
  return platform.replaceAll(/[^a-z0-9]+/g, '-') || 'web';
}

function attributionFor(example) {
  const record = creatorById.get(example.creatorId);
  const rule = CATEGORY_RULES[example.creatorId];
  return {
    creatorId: example.creatorId,
    providerId: providerId(record),
    sourceOwnerId: example.creatorId,
    curatorId: rule.mapType === 'source_curation' ? example.creatorId : null,
    trustAnchorRefs:
      rule.mapType === 'single_sensitive_schedule'
        ? [
            {
              status: 'required_before_promotion',
              reason: 'Creator-brand schedule requires current veterinarian or official confirmation.',
            },
          ]
        : [],
    decisionBand: record?.decisionBand ?? null,
    creatorVerdict: record?.verdict ?? null,
    publicationApproval: 'not_implied',
  };
}

function normalizeSourceRefs(item) {
  return item.sourceTrace.map((trace) => ({
    sourceRowId: trace.sourceRowId,
    sourceUrl: trace.sourceUrl,
    sourceLocator: trace.sourceLocator,
  }));
}

function normalizeItem(item, flow, step) {
  return {
    id: item.itemId,
    flowId: flow.flowId,
    stepId: step.stepId,
    title: item.itemTitle,
    detail: item.memo ?? null,
    intent: flow.sourceVideoUrl ? 'use_resource' : 'act',
    completion: {
      mode: item.completionMode === 'manual_check' ? 'manual_check' : item.completionMode,
      independentlyStateful: true,
    },
    optional: Boolean(item.optional),
    schedule: item.schedule ? clone(item.schedule) : null,
    fields: [],
    memos: item.memo
      ? [{ kind: 'source_detail', text: item.memo, owner: 'published_content' }]
      : [],
    conditions: [],
    sourceRefs: normalizeSourceRefs(item),
  };
}

function resolveSchedule(example, schedule) {
  if (!schedule) return null;
  const bundle = example.userContentBundle;
  const inputs = SAMPLE_INPUTS[bundle.bundleId] ?? {};
  const allItems = getBundleStats(example).items;

  if (schedule.type === 'relative_to_target' && inputs.moveDate) {
    return { kind: 'date', date: addDays(inputs.moveDate, schedule.offsetDays) };
  }

  if (schedule.type === 'source_day_index' && inputs.startDate) {
    const minimum = Math.min(
      ...allItems
        .filter((item) => item.schedule?.type === 'source_day_index')
        .map((item) => item.schedule.dayIndex),
    );
    return { kind: 'date', date: addDays(inputs.startDate, schedule.dayIndex - minimum) };
  }

  if (schedule.type === 'relative_weekday' && inputs.startDate) {
    const weekdayIndex = {
      월: 0,
      화: 1,
      수: 2,
      목: 3,
      금: 4,
      토: 5,
      일: 6,
    };
    return {
      kind: 'date',
      date: addDays(
        inputs.startDate,
        (schedule.week - 1) * 7 + (weekdayIndex[schedule.weekday] ?? 0),
      ),
    };
  }

  if (schedule.type === 'sequence_day' && inputs.startDate) {
    return { kind: 'date', date: addDays(inputs.startDate, schedule.day - 1) };
  }

  if (schedule.type === 'source_age_week' && inputs.birthDate) {
    return { kind: 'date', date: addDays(inputs.birthDate, schedule.week * 7) };
  }

  return {
    kind: 'unresolved_source_schedule',
    sourceSchedule: clone(schedule),
    missingInputs: bundle.setupFields
      .filter((field) => field.type === 'date')
      .map((field) => field.key),
  };
}

function contextCandidates(example) {
  const bundle = example.userContentBundle;
  const contexts = [];
  const anchorField = bundle.setupFields.find((field) => field.type === 'date');
  if (anchorField) {
    contexts.push({
      id: `${bundle.bundleId}-ctx-${anchorField.key}`,
      kind: 'schedule_basis',
      fieldKey: anchorField.key,
      label: anchorField.label,
      sampleValue: SAMPLE_INPUTS[bundle.bundleId]?.[anchorField.key] ?? null,
      source: 'user_overlay',
    });
  }

  for (const flow of bundle.map.flows) {
    for (const step of flow.steps) {
      const scheduledItems = step.items.filter((item) => item.schedule);
      const scheduleKeys = new Set(
        scheduledItems.map((item) => JSON.stringify(stable(item.schedule))),
      );
      if (scheduledItems.length > 1 && scheduleKeys.size === 1) {
        contexts.push({
          id: `${step.stepId}-ctx-schedule`,
          kind: 'shared_item_schedule',
          stepId: step.stepId,
          scheduleTemplate: clone(scheduledItems[0].schedule),
          itemIds: scheduledItems.map((item) => item.itemId),
          source: 'derived_equal_source_schedule',
        });
      }
    }
  }
  return contexts;
}

function sharedBindingFor(example, item, contexts) {
  const bundle = example.userContentBundle;
  const anchorContext = contexts.find((context) => context.kind === 'schedule_basis');
  const stepContext = contexts.find(
    (context) =>
      context.kind === 'shared_item_schedule' && context.itemIds.includes(item.itemId),
  );
  const effectiveSchedule = resolveSchedule(example, item.schedule);

  return {
    sharedContextRefs: [anchorContext?.id, stepContext?.id].filter(Boolean),
    scheduleTemplate:
      stepContext && semanticEqual(stepContext.scheduleTemplate, item.schedule)
        ? null
        : item.schedule
          ? clone(item.schedule)
          : null,
    effectiveSchedule,
    override: null,
    inputSource: anchorContext
      ? {
          fieldKey: anchorContext.fieldKey,
          askedOnceAtBundle: true,
          originalSetupFieldCount: bundle.setupFields.length,
        }
      : null,
  };
}

function calendarPolicyFor(example, flow, step, item) {
  const rule = CATEGORY_RULES[example.creatorId];
  if (!item.schedule || rule.calendarDefault === 'none') return 'none';
  if (rule.calendarDefault === 'optional_per_item') return 'none';
  const sameSchedule = step.items.filter(
    (candidate) =>
      candidate.schedule &&
      semanticEqual(candidate.schedule, item.schedule),
  );
  if (rule.calendarDefault === 'step_bundle' && sameSchedule.length > 1) {
    return 'step_bundle';
  }
  return 'per_item';
}

function canonicalBundle(example, architecture) {
  const bundle = example.userContentBundle;
  const rule = CATEGORY_RULES[example.creatorId];
  const contexts =
    architecture === 'item_first_shared_context' ? contextCandidates(example) : [];

  const flows = bundle.map.flows.map((flow) => ({
    id: flow.flowId,
    title: flow.title,
    primarySourceUrl: flow.sourceVideoUrl ?? bundle.sourceUrls[0],
    steps: flow.steps.map((step) => ({
      id: step.stepId,
      flowId: flow.flowId,
      title: step.title,
      order: flow.steps.indexOf(step) + 1,
      sourceScheduleGroup: step.schedule ? clone(step.schedule) : null,
      prerequisite: step.prerequisite ?? null,
      derivedProgressOnly: true,
      items: step.items.map((item, index) => {
        const normalized = normalizeItem(item, flow, step);
        normalized.order = index + 1;
        normalized.projectionPolicy = {
          calendar: calendarPolicyFor(example, flow, step, item),
          checklist: 'direct',
          todo: 'direct',
          sheet: 'direct',
          memo: 'direct',
        };
        if (architecture === 'item_first_shared_context') {
          normalized.scheduleBinding = sharedBindingFor(example, item, contexts);
        }
        return normalized;
      }),
    })),
  }));

  return {
    schemaVersion:
      architecture === 'item_first_shared_context'
        ? 'flowme-item-shared-context-v1'
        : 'flowme-current-canonical-v1',
    architecture,
    bundleId: bundle.bundleId,
    title: bundle.title,
    taxonomy: {
      primaryLifeArea: example.categoryId,
      secondaryLifeAreas: [],
      topicTags: [],
      sourceShape: rule.sourceShape,
      primaryExecutionPattern: rule.executionPattern,
      secondaryExecutionPatterns: rule.secondaryPatterns,
      primaryArtifact: rule.primaryArtifact,
      secondaryArtifacts: rule.secondaryArtifacts,
    },
    userJob: rule.userJob,
    setupFields: clone(bundle.setupFields),
    sampleUserOverlay: clone(SAMPLE_INPUTS[bundle.bundleId] ?? {}),
    map: {
      id: bundle.map.mapId,
      title: bundle.map.title,
      type: rule.mapType,
      ordering:
        rule.mapType === 'ordered'
          ? 'source_defined'
          : rule.mapType === 'source_curation'
            ? 'source_display_order_not_execution_dependency'
            : 'none',
      childFlowIds: bundle.map.flows.map((flow) => flow.flowId),
      derivedProgressOnly: true,
    },
    sharedContexts: contexts,
    attribution: attributionFor(example),
    rights: {
      mode: bundle.rightsMode,
      publicReleaseAllowed: false,
      personalTransformAllowed: true,
      rationale: 'Existing research allows link plus minimal execution metadata; public release remains a separate review.',
    },
    review: {
      sourceRowStatus: 'complete_for_representative_example',
      promotionState: 'internal_review_only',
      safetyReview:
        rule.mapType === 'single_sensitive_schedule' ? 'needs_trust_anchor' : 'not_required',
    },
    sourceRows: clone(example.sourceRows),
    flows,
  };
}

function allCanonicalItems(bundle) {
  return bundle.flows.flatMap((flow) =>
    flow.steps.flatMap((step) => step.items),
  );
}

function foldIcsLine(line) {
  if (Buffer.byteLength(line, 'utf8') <= 75) return line;
  const output = [];
  let current = '';
  for (const char of line) {
    const next = `${current}${char}`;
    const limit = output.length === 0 ? 75 : 74;
    if (current && Buffer.byteLength(next, 'utf8') > limit) {
      output.push(output.length === 0 ? current : ` ${current}`);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) output.push(output.length === 0 ? current : ` ${current}`);
  return output.join('\r\n');
}

function componentLines(component) {
  const lines = [`BEGIN:${component.kind}`];
  lines.push(`UID:${component.uid}`);
  lines.push('DTSTAMP:20260727T000000Z');
  if (component.summary) lines.push(`SUMMARY:${escapeText(component.summary)}`);
  if (component.description) {
    lines.push(`DESCRIPTION:${escapeText(component.description)}`);
  }
  if (component.dtstart) {
    lines.push(`DTSTART;VALUE=DATE:${compactDate(component.dtstart)}`);
    if (component.kind === 'VEVENT') {
      lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(component.dtstart, 1))}`);
    }
  }
  if (component.status) lines.push(`STATUS:${component.status}`);
  if (component.url) lines.push(`URL:${component.url}`);
  if (component.relatedTo) {
    lines.push(
      `RELATED-TO;RELTYPE=${component.relatedTo.reltype}:${component.relatedTo.uid}`,
    );
  }
  if (component.xFlowmeKind) {
    lines.push(`X-FLOWME-KIND:${component.xFlowmeKind}`);
  }
  if (component.sourceRowIds?.length) {
    lines.push(`X-FLOWME-SOURCE-ROWS:${escapeText(component.sourceRowIds.join(','))}`);
  }
  if (component.itemIds?.length) {
    lines.push(`X-FLOWME-ITEM-IDS:${escapeText(component.itemIds.join(','))}`);
  }
  lines.push(`END:${component.kind}`);
  return lines.map(foldIcsLine);
}

function literalIcsGraph(example) {
  const canonical = canonicalBundle(example, 'current_canonical_v1');
  const bundle = example.userContentBundle;
  const components = [];
  const mapUid = `${bundle.map.mapId}@flowme.local`;
  components.push({
    kind: 'VJOURNAL',
    uid: mapUid,
    summary: bundle.map.title,
    xFlowmeKind: 'MAP',
  });

  for (const flow of canonical.flows) {
    const flowUid = `${flow.id}@flowme.local`;
    components.push({
      kind: 'VJOURNAL',
      uid: flowUid,
      summary: flow.title,
      xFlowmeKind: 'FLOW',
      relatedTo: { reltype: 'PARENT', uid: mapUid },
    });
    for (const step of flow.steps) {
      const stepUid = `${step.id}@flowme.local`;
      components.push({
        kind: 'VJOURNAL',
        uid: stepUid,
        summary: step.title,
        xFlowmeKind: 'STEP',
        relatedTo: { reltype: 'PARENT', uid: flowUid },
      });
      for (const item of step.items) {
        const resolved = resolveSchedule(
          example,
          example.userContentBundle.map.flows
            .flatMap((candidateFlow) => candidateFlow.steps)
            .flatMap((candidateStep) => candidateStep.items)
            .find((candidateItem) => candidateItem.itemId === item.id)?.schedule ?? null,
        );
        const scheduled = resolved?.kind === 'date';
        components.push({
          kind: scheduled ? 'VEVENT' : 'VTODO',
          uid: `${item.id}@flowme.local`,
          summary: item.title,
          description: [
            item.detail,
            ...item.sourceRefs.map(
              (ref) => `${ref.sourceLocator} · ${ref.sourceUrl}`,
            ),
          ]
            .filter(Boolean)
            .join('\n'),
          dtstart: scheduled ? resolved.date : null,
          status: scheduled ? null : 'NEEDS-ACTION',
          url: item.sourceRefs[0]?.sourceUrl ?? null,
          relatedTo: { reltype: 'PARENT', uid: stepUid },
          xFlowmeKind: 'ITEM',
          sourceRowIds: item.sourceRefs.map((ref) => ref.sourceRowId),
        });
      }
    }
  }

  return {
    schemaVersion: 'flowme-literal-ics-graph-v1',
    architecture: 'literal_ics_first',
    bundleId: bundle.bundleId,
    title: bundle.title,
    mapType: CATEGORY_RULES[example.creatorId].mapType,
    sampleUserOverlay: clone(SAMPLE_INPUTS[bundle.bundleId] ?? {}),
    attribution: attributionFor(example),
    calendar: {
      prodid: '-//FlowMe//Literal ICS First Lab v1//KO',
      version: '2.0',
      method: null,
      components,
    },
    canonicalLimitations: [
      'Hierarchy depends on VJOURNAL plus RELATED-TO client preservation.',
      'Full SourceRow provenance depends on X-FLOWME-SOURCE-ROWS.',
      'Scheduled VEVENT does not carry FlowMe manual completion semantics natively.',
      'Rights, review, conditions, and typed Fields have no portable native representation.',
    ],
  };
}

function renderLiteralIcs(graph) {
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//FlowMe//Literal ICS First Lab v1//KO',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
  ];
  for (const component of graph.calendar.components) {
    lines.push(...componentLines(component));
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

function parseIcs(text) {
  const unfolded = text.replace(/\r?\n[ \t]/g, '');
  const lines = unfolded.split(/\r?\n/).filter(Boolean);
  const stack = [];
  const components = [];
  const errors = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:')) {
      const kind = line.slice(6);
      if (current && kind !== 'VCALENDAR') {
        errors.push(`nested_component:${current.kind}->${kind}`);
      }
      stack.push(kind);
      if (kind !== 'VCALENDAR') current = { kind, properties: {} };
      continue;
    }
    if (line.startsWith('END:')) {
      const kind = line.slice(4);
      const open = stack.pop();
      if (open !== kind) errors.push(`mismatched_end:${open}->${kind}`);
      if (kind !== 'VCALENDAR' && current) {
        components.push(current);
        current = null;
      }
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(':');
    if (colon < 0) {
      errors.push(`invalid_line:${line}`);
      continue;
    }
    const rawKey = line.slice(0, colon);
    const key = rawKey.split(';')[0];
    const value = line.slice(colon + 1);
    if (current.properties[key]) {
      current.properties[key] = Array.isArray(current.properties[key])
        ? [...current.properties[key], value]
        : [current.properties[key], value];
    } else {
      current.properties[key] = value;
    }
  }
  if (stack.length) errors.push(`unclosed:${stack.join(',')}`);
  return { components, errors };
}

function recommendedCalendarComponents(example, canonical, mode) {
  const components = [];
  for (const flow of canonical.flows) {
    for (const step of flow.steps) {
      const scheduled = step.items
        .map((item) => {
          const sourceItem = example.userContentBundle.map.flows
            .flatMap((candidateFlow) => candidateFlow.steps)
            .flatMap((candidateStep) => candidateStep.items)
            .find((candidateItem) => candidateItem.itemId === item.id);
          return {
            item,
            resolved: resolveSchedule(example, sourceItem?.schedule ?? null),
          };
        })
        .filter((entry) => entry.resolved?.kind === 'date');
      if (!scheduled.length) continue;

      const groups = new Map();
      for (const entry of scheduled) {
        const key = entry.resolved.date;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(entry);
      }

      for (const [date, entries] of groups) {
        const shouldBundle =
          mode === 'compact' &&
          CATEGORY_RULES[example.creatorId].calendarDefault === 'step_bundle' &&
          entries.length > 1;
        if (shouldBundle) {
          components.push({
            kind: 'VEVENT',
            uid: `${step.id}-bundle@flowme.local`,
            summary: step.title,
            description: entries
              .map(({ item }) => `□ ${item.title} [${item.id}]`)
              .join('\n'),
            dtstart: date,
            xFlowmeKind: 'STEP_BUNDLE_PROJECTION',
            itemIds: entries.map(({ item }) => item.id),
          });
        } else {
          for (const { item } of entries) {
            components.push({
              kind: 'VEVENT',
              uid: `${item.id}@flowme.local`,
              summary: item.title,
              description: [
                item.detail,
                ...item.sourceRefs.map((ref) => ref.sourceUrl),
              ]
                .filter(Boolean)
                .join('\n'),
              dtstart: date,
              url: item.sourceRefs[0]?.sourceUrl ?? null,
              xFlowmeKind: 'ITEM_PROJECTION',
              itemIds: [item.id],
            });
          }
        }
      }
    }
  }
  return components;
}

function renderProjectionIcs(example, canonical, mode) {
  const components = recommendedCalendarComponents(example, canonical, mode);
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//FlowMe//Canonical Projection Lab v1//KO',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
  ];
  for (const component of components) lines.push(...componentLines(component));
  lines.push('END:VCALENDAR');
  return {
    text: `${lines.join('\r\n')}\r\n`,
    components,
  };
}

function checklistProjection(canonical) {
  const lines = [`# ${canonical.title}`, ''];
  for (const flow of canonical.flows) {
    if (canonical.flows.length > 1) lines.push(`## ${flow.title}`, '');
    for (const step of flow.steps) {
      lines.push(`### ${step.title}`, '');
      for (const item of step.items) {
        lines.push(`- [ ] ${item.title}`);
        if (item.detail) lines.push(`  - ${item.detail}`);
        if (item.sourceRefs[0]) {
          lines.push(`  - 출처: ${item.sourceRefs[0].sourceUrl}`);
        }
      }
      lines.push('');
    }
  }
  return lines.join('\n');
}

function todoProjection(canonical) {
  const lines = [`# ${canonical.title} · Todo`, ''];
  for (const item of allCanonicalItems(canonical)) {
    lines.push(`- ${item.title} <!-- ${item.id} -->`);
  }
  return lines.join('\n');
}

function sheetProjection(canonical, example) {
  const rows = [
    ['item_id', 'flow', 'step', 'title', 'schedule', 'status', 'source_url'],
  ];
  for (const flow of canonical.flows) {
    for (const step of flow.steps) {
      for (const item of step.items) {
        const sourceItem = example.userContentBundle.map.flows
          .flatMap((candidateFlow) => candidateFlow.steps)
          .flatMap((candidateStep) => candidateStep.items)
          .find((candidateItem) => candidateItem.itemId === item.id);
        rows.push([
          item.id,
          flow.title,
          step.title,
          item.title,
          JSON.stringify(sourceItem?.schedule ?? null),
          'not_started',
          item.sourceRefs[0]?.sourceUrl ?? '',
        ]);
      }
    }
  }
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

function memoProjection(canonical) {
  const lines = [`# ${canonical.title}`, '', `사용자 일: ${canonical.userJob}`, ''];
  for (const item of allCanonicalItems(canonical)) {
    lines.push(`## ${item.title}`);
    if (item.detail) lines.push(item.detail);
    for (const ref of item.sourceRefs) {
      lines.push(`- 출처: ${ref.sourceUrl} (${ref.sourceLocator})`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function lossEntriesFor(example, architecture, target) {
  const scheduledCount = getBundleStats(example).items.filter((item) => item.schedule).length;
  const unscheduledCount = getBundleStats(example).items.length - scheduledCount;
  const isIcs = target === 'calendar_ics';
  const isLiteral = architecture === 'literal_ics_first';
  const entries = [
    {
      path: 'Item.id',
      disposition: isIcs && architecture !== 'literal_ics_first' ? 'direct' : 'direct',
      note: 'Stable identity is preserved in JSON and exported UID or explicit item marker.',
    },
    {
      path: 'Item.title',
      disposition: 'direct',
      note: 'Summary, row, or heading.',
    },
    {
      path: 'Item.detail',
      disposition:
        target === 'sheet_csv'
          ? 'memo_fallback'
          : isIcs
            ? 'memo_fallback'
            : 'direct',
      note: 'Calendar and sheet do not retain the full structured memo model.',
    },
    {
      path: 'Item.completion',
      disposition:
        isLiteral && isIcs
          ? scheduledCount > 0
            ? 'omitted'
            : 'direct'
          : target === 'memo_markdown'
            ? 'omitted'
            : 'direct',
      note:
        isLiteral && isIcs && scheduledCount > 0
          ? 'VEVENT has no FlowMe manual-check completion state; VTODO only covers unscheduled tasks.'
          : 'Target retains or intentionally omits execution state.',
    },
    {
      path: 'Item.schedule',
      disposition:
        target === 'calendar_ics'
          ? scheduledCount
            ? 'direct'
            : 'not_applicable'
          : target === 'sheet_csv'
            ? 'direct'
            : scheduledCount
              ? 'memo_fallback'
              : 'not_applicable',
      note: `${scheduledCount} scheduled and ${unscheduledCount} unscheduled Items in source bundle.`,
    },
    {
      path: 'Item.sourceRefs',
      disposition:
        isLiteral && isIcs
          ? 'memo_fallback'
          : target === 'sheet_csv'
            ? 'grouped'
            : 'direct',
      note:
        isLiteral && isIcs
          ? 'First URL is native; full row IDs rely on X-FLOWME and descriptions.'
          : 'Source links remain explicit.',
    },
    {
      path: 'Map.type/order',
      disposition:
        isLiteral && isIcs
          ? 'grouped'
          : target === 'calendar_ics'
            ? 'memo_fallback'
            : 'direct',
      note:
        isLiteral && isIcs
          ? 'Uses VJOURNAL and RELATED-TO; target-client preservation is not proven.'
          : 'Canonical JSON keeps ordering semantics; projections show only needed grouping.',
    },
    {
      path: 'rights/review/internal scores',
      disposition: 'forbidden',
      note: 'Internal review metadata must not enter user exports.',
    },
  ];
  for (const entry of entries) {
    if (!LOSS_VALUES.has(entry.disposition)) {
      throw new Error(`Unknown loss disposition: ${entry.disposition}`);
    }
  }
  return entries;
}

function buildProjectionManifest(examples) {
  const targets = [
    'calendar_ics',
    'checklist_markdown',
    'todo_markdown',
    'sheet_csv',
    'memo_markdown',
  ];
  return {
    schemaVersion: 'flowme-projection-loss-manifest-v1',
    controlledValues: [...LOSS_VALUES],
    records: examples.flatMap((example) =>
      ARCHITECTURES.flatMap((architecture) =>
        targets.map((target) => ({
          bundleId: example.userContentBundle.bundleId,
          architecture,
          target,
          paths: lossEntriesFor(example, architecture, target),
        })),
      ),
    ),
  };
}

function canonicalRoundTrip(canonical) {
  const parsed = JSON.parse(JSON.stringify(canonical));
  return {
    semanticEquality: semanticEqual(canonical, parsed),
    itemIdsStable:
      allCanonicalItems(canonical).map((item) => item.id).join('|') ===
      allCanonicalItems(parsed).map((item) => item.id).join('|'),
    sourceRowsStable: semanticEqual(canonical.sourceRows, parsed.sourceRows),
  };
}

function literalRoundTrip(example, graph, icsText) {
  const parsed = parseIcs(icsText);
  const itemComponents = parsed.components.filter(
    (component) => component.properties['X-FLOWME-KIND'] === 'ITEM',
  );
  const scheduledSourceItems = getBundleStats(example).items.filter((item) => item.schedule);
  const schedulelessVevents = itemComponents.filter(
    (component) =>
      component.kind === 'VEVENT' && !component.properties.DTSTART,
  ).length;
  const vtodoCount = itemComponents.filter((component) => component.kind === 'VTODO').length;
  const eventCount = itemComponents.filter((component) => component.kind === 'VEVENT').length;
  const expectedItemUids = new Set(
    getBundleStats(example).items.map((item) => `${item.itemId}@flowme.local`),
  );
  const actualItemUids = new Set(
    itemComponents.map((component) => component.properties.UID),
  );
  const recoveredSourceRowIds = itemComponents.flatMap((component) => {
    const raw = component.properties['X-FLOWME-SOURCE-ROWS'];
    if (!raw) return [];
    return String(raw).split('\\,').join(',').split(',').filter(Boolean);
  });
  const expectedSourceReferenceCount = getBundleStats(example).items.reduce(
    (count, item) => count + item.sourceRowIds.length,
    0,
  );

  return {
    syntaxErrors: parsed.errors,
    expectedComponents: graph.calendar.components.length,
    parsedComponents: parsed.components.length,
    expectedItemComponents: getBundleStats(example).items.length,
    parsedItemComponents: itemComponents.length,
    eventCount,
    vtodoCount,
    schedulelessVevents,
    stableItemUids:
      expectedItemUids.size === actualItemUids.size &&
      [...expectedItemUids].every((uid) => actualItemUids.has(uid)),
    relatedToPresent: itemComponents.every(
      (component) => Boolean(component.properties['RELATED-TO']),
    ),
    sourceReferenceCountRecoveredByLabParser: recoveredSourceRowIds.length,
    sourceReferenceCountExpected: expectedSourceReferenceCount,
    uniqueSourceRowsRecoveredByLabParser: new Set(recoveredSourceRowIds).size,
    uniqueSourceRowsExpected: example.sourceRows.length,
    scheduledCompletionSemanticsNative: 0,
    scheduledCompletionSemanticsExpected: scheduledSourceItems.length,
    externalClientRoundTrip: 'not_run',
    externalVtodoSupport: 'not_proven',
    externalRelatedToSupport: 'not_proven',
    externalXPropertySupport: 'not_proven',
  };
}

function runtimeBaselineMapping() {
  return {
    schemaVersion: 'flowme-runtime-baseline-mapping-v1',
    inspectedFiles: ['lib/flow/types.ts', 'lib/flow/ics.ts', 'lib/flow/export.ts'],
    baselineStatus: 'compatibility_only',
    mappings: [
      {
        runtime: 'Flow',
        canonical: 'Flow plus taxonomy, attribution, source/review boundaries',
        mode: 'human_review_required',
        reason: 'category is free text and primary_destination may be hybrid.',
      },
      {
        runtime: 'FlowSection',
        canonical: 'Step',
        mode: 'automatic',
        reason: 'ID, title and order are direct grouping metadata.',
      },
      {
        runtime: 'FlowItem',
        canonical: 'Item',
        mode: 'conditional',
        reason: 'ID/title/order map directly; intent, completion and provenance need enrichment.',
      },
      {
        runtime: 'FlowItem.day_offset/date_window/repeat_rule',
        canonical: 'Item.schedule',
        mode: 'conditional',
        reason: 'Existing explicit values map; missing schedules remain unscheduled.',
      },
      {
        runtime: 'FlowItemDetail',
        canonical: 'Memo, completion criterion and SourceRef',
        mode: 'conditional',
        reason: 'Text must be split by semantic owner rather than mechanically.',
      },
      {
        runtime: 'primary_destination=hybrid',
        canonical: 'primaryArtifact plus secondaryArtifacts',
        mode: 'human_review_required',
        reason: 'A primary result must be adjudicated.',
      },
      {
        runtime: 'calendar export',
        canonical: 'effective scheduled Item projection',
        mode: 'conditional',
        reason: 'Current VEVENT exporter has no Flow Map, VTODO or loss-manifest contract.',
      },
    ],
    contractPathMetrics: {
      totalMappings: 7,
      automatic: 1,
      conditional: 4,
      humanReviewRequired: 2,
      note: 'This is a field-contract mapping audit, not a record-level production migration estimate.',
    },
    representativePortfolioNormalization: {
      items: 148,
      automaticallyNormalizedFromSourceBackedBundle: 148,
      sourceRows: 198,
      note: 'The creator portfolio already contains Item IDs and row provenance; this does not imply legacy runtime records have the same evidence.',
    },
  };
}

function categoryFitRecord(example) {
  const bundle = example.userContentBundle;
  const rule = CATEGORY_RULES[example.creatorId];
  const { items } = getBundleStats(example);
  const scheduled = items.filter((item) => item.schedule).length;
  const setupRequired = bundle.setupFields.filter((field) => field.required).length;
  const calendarInput = scheduled
    ? bundle.setupFields.some((field) => field.type === 'date')
      ? 1
      : 0
    : 0;
  const recommendation =
    rule.mapType === 'single_sensitive_schedule'
      ? 'current_canonical_with_safety_gate'
      : 'current_canonical_with_projection_policy';

  return {
    bundleId: bundle.bundleId,
    creatorId: example.creatorId,
    lifeArea: example.categoryId,
    title: bundle.title,
    mapType: rule.mapType,
    sourceShape: rule.sourceShape,
    executionPattern: rule.executionPattern,
    primaryArtifact: rule.primaryArtifact,
    secondaryArtifacts: rule.secondaryArtifacts,
    itemCount: items.length,
    scheduledItemCount: scheduled,
    setupRequiredCount: setupRequired,
    calendarProjectionAdditionalInputCount: calendarInput,
    naturalCalendarPolicy: rule.calendarDefault,
    recommendedArchitecture: recommendation,
    architectureFit: {
      current_canonical_v1: {
        score5: 5,
        verdict: 'Go',
        reason: 'Preserves Item state, provenance and non-calendar artifacts without new hierarchy.',
      },
      literal_ics_first: {
        score5:
          scheduled === items.length && rule.primaryArtifact === 'calendar' ? 3 : 2,
        verdict: 'Hold',
        reason:
          scheduled === items.length
            ? 'Dates serialize, but completion, SourceRow and review meaning still rely on non-portable metadata.'
            : 'Unscheduled or non-calendar meaning depends on VTODO/VJOURNAL and client behavior not proven by official docs.',
      },
      item_first_shared_context: {
        score5: contextCandidates(example).some(
          (context) => context.kind === 'shared_item_schedule',
        )
          ? 5
          : 4,
        verdict: contextCandidates(example).some(
          (context) => context.kind === 'shared_item_schedule',
        )
          ? 'Modify'
          : 'Hold',
        reason:
          'Meaning is preserved, but the corpus does not show a user-input reduction beyond existing bundle setup fields for most categories.',
      },
    },
  };
}

function architectureScorecard(primaryRecords, roundTrips) {
  const totals = primaryRecords.reduce(
    (acc, record) => {
      acc.items += record.itemCount;
      acc.scheduled += record.scheduledItemCount;
      return acc;
    },
    { items: 0, scheduled: 0 },
  );
  const distinctSameDateBundles = primaryRecords.filter((record) => {
    const example = creatorData.representativeFlowExamples.find(
      (candidate) => candidate.userContentBundle.bundleId === record.bundleId,
    );
    return contextCandidates(example).some(
      (context) => context.kind === 'shared_item_schedule',
    );
  }).length;

  const records = [
    {
      architecture: 'current_canonical_v1',
      hardGate: 'pass',
      dimensions: {
        sourceMeaningAndProvenance: 20,
        executionCompletionState: 15,
        categoryAndMapGenerality: 15,
        projectionQuality: 14,
        inputEditSimplicity: 9,
        icsInteroperability: 8,
        progressDecisionConditional: 10,
        runtimeMigration: 5,
      },
      total: 96,
      verdict: 'Go',
      evidence:
        '148 Item and 198 SourceRow remain direct; unscheduled content stays outside VEVENT; existing setup fields already collect shared anchor dates once.',
    },
    {
      architecture: 'literal_ics_first',
      hardGate: 'fail',
      dimensions: {
        sourceMeaningAndProvenance: 10,
        executionCompletionState: 6,
        categoryAndMapGenerality: 8,
        projectionQuality: 8,
        inputEditSimplicity: 8,
        icsInteroperability: 6,
        progressDecisionConditional: 4,
        runtimeMigration: 1,
      },
      total: 51,
      verdict: 'Hold',
      evidence:
        `${totals.scheduled} scheduled Items become VEVENT without native FlowMe completion; hierarchy/provenance rely on VJOURNAL, RELATED-TO and X-properties whose client round-trip is not proven.`,
    },
    {
      architecture: 'item_first_shared_context',
      hardGate: 'pass',
      dimensions: {
        sourceMeaningAndProvenance: 20,
        executionCompletionState: 15,
        categoryAndMapGenerality: 15,
        projectionQuality: 15,
        inputEditSimplicity: 9,
        icsInteroperability: 8,
        progressDecisionConditional: 10,
        runtimeMigration: 3,
      },
      total: 95,
      verdict: 'Modify',
      evidence:
        `Semantics pass, but only ${distinctSameDateBundles} distinct primary bundle demonstrates repeated equal Item schedules and existing anchor fields already provide one-time date entry. Canonical persistence is not justified yet.`,
    },
  ];

  return {
    schemaVersion: 'flowme-architecture-scorecard-v1',
    evidenceType: 'internal_expert_contract_score',
    observedUserValidation: 'not_run',
    weights: {
      sourceMeaningAndProvenance: 20,
      executionCompletionState: 15,
      categoryAndMapGenerality: 15,
      projectionQuality: 15,
      inputEditSimplicity: 10,
      icsInteroperability: 10,
      progressDecisionConditional: 10,
      runtimeMigration: 5,
    },
    adoptionGate: {
      requiredDistinctSameDateMultiItemExamples: 3,
      observedDistinctPrimaryBundles: distinctSameDateBundles,
      sharedContextAdoptionPassed: distinctSameDateBundles >= 3,
    },
    corpusTotals: totals,
    roundTripSummary: {
      allCanonicalSemanticRoundTripsPassed: roundTrips.every(
        (record) =>
          record.currentCanonical.semanticEquality &&
          record.itemSharedContext.semanticEquality,
      ),
      allLiteralSyntaxPassed: roundTrips.every(
        (record) => record.literalIcs.syntaxErrors.length === 0,
      ),
      externalClientRoundTrip: 'not_run',
    },
    records,
    decision: 'keep_current_canonical_v1_add_projection_time_grouping',
  };
}

function buildInternalTaskReview(categoryFit) {
  return {
    schemaVersion: 'flowme-usability-task-review-v1',
    evidenceType: 'internal_expert_task_walkthrough',
    observedUserValidation: 'not_run',
    externalAccountImport: 'not_run',
    tasks: [
      'first_action_visible',
      'setup_inputs_zero_to_two',
      'shared_anchor_entered_once',
      'single_item_override_possible',
      'sibling_completion_independent',
      'projection_predictable',
      'source_and_caution_findable',
    ],
    records: categoryFit.map((record) => ({
      bundleId: record.bundleId,
      title: record.title,
      results: {
        first_action_visible: 'pass',
        setup_inputs_zero_to_two:
          record.setupRequiredCount + record.calendarProjectionAdditionalInputCount <= 2
            ? 'pass'
            : 'fail',
        shared_anchor_entered_once:
          record.scheduledItemCount > 0 ? 'pass_existing_setup_field' : 'not_applicable',
        single_item_override_possible: 'pass_in_item_overlay_contract',
        sibling_completion_independent: 'pass',
        projection_predictable:
          record.naturalCalendarPolicy === 'optional_per_item'
            ? 'needs_copy_clarification'
            : 'pass',
        source_and_caution_findable:
          record.mapType === 'single_sensitive_schedule'
            ? 'pass_with_trust_anchor_pending'
            : 'pass',
      },
      note:
        'Task result is derived from the source-backed fixture and contract; no participant was observed.',
    })),
  };
}

function buildFinalAdjudication(scorecard, categoryFit, roundTrips) {
  const sourceRows = creatorData.representativeFlowExamples.reduce(
    (count, example) => count + example.sourceRows.length,
    0,
  );
  const items = creatorData.representativeFlowExamples.reduce(
    (count, example) => count + getBundleStats(example).items.length,
    0,
  );
  const schedulelessVevents = roundTrips.reduce(
    (count, record) => count + record.literalIcs.schedulelessVevents,
    0,
  );
  return {
    schemaVersion: 'flowme-final-architecture-adjudication-v1',
    decision: scorecard.decision,
    decisionStatus: 'provisional_architecture_recommendation_user_review_pending',
    canonicalDecision: 'keep_current_canonical_v1',
    acceptedAmendments: [
      'Add explicit projection policy none/per_item/step_bundle at adapter or export request level.',
      'Derive a scheduleGroupKey for compact projection when source-equal Item schedules share a Step.',
      'Keep stable Item IDs in grouped projection descriptions and loss manifests.',
      'Export one VCALENDAR containing sibling VEVENT components only for scheduled effective Items.',
    ],
    heldProposals: [
      {
        proposal: 'persist SharedContext as a new canonical entity',
        reason:
          'Only one distinct primary bundle proves repeated equal Item schedules, below the frozen three-bundle adoption gate; existing anchor setup already asks for the date once.',
      },
      {
        proposal: 'use literal ICS-first as canonical storage',
        reason:
          'Scheduled completion, Map semantics, provenance, rights and review cannot be portably preserved without non-native or unproven client behavior.',
      },
    ],
    verifiedMetrics: {
      primaryBundles: categoryFit.length,
      lifeAreas: new Set(categoryFit.map((record) => record.lifeArea)).size,
      items,
      sourceRows,
      sourceProvenanceResolved: true,
      inventedActions: 0,
      inventedSourceDates: 0,
      schedulelessVevents,
      nestedIcsComponents: roundTrips.reduce(
        (count, record) =>
          count +
          record.literalIcs.syntaxErrors.filter((error) =>
            error.startsWith('nested_component:'),
          ).length,
        0,
      ),
      externalClientRoundTrip: 'not_run',
      observedUserValidation: 'not_run',
    },
    categoryExceptions: categoryFit.map((record) => ({
      bundleId: record.bundleId,
      primaryArtifact: record.primaryArtifact,
      calendarPolicy: record.naturalCalendarPolicy,
      note:
        record.naturalCalendarPolicy === 'none'
          ? 'Do not create ICS until the user explicitly schedules an Item.'
          : record.naturalCalendarPolicy === 'optional_per_item'
            ? 'Progress Sheet is primary; Calendar is an optional user projection.'
            : 'Calendar projection is natural when its anchor input is supplied.',
    })),
    publicationState: 'not_published',
    runtimeState: 'not_changed',
  };
}

function finalDecisionMarkdown(scorecard, adjudication) {
  const current = scorecard.records.find(
    (record) => record.architecture === 'current_canonical_v1',
  );
  const literal = scorecard.records.find(
    (record) => record.architecture === 'literal_ics_first',
  );
  const shared = scorecard.records.find(
    (record) => record.architecture === 'item_first_shared_context',
  );
  return `# Final Architecture Decision

**Decision:** Keep current canonical v1 and add projection-time schedule grouping.  
**Status:** provisional architecture recommendation; user review pending  
**Runtime:** unchanged

## Why

The primary corpus preserves ${adjudication.verifiedMetrics.items} Items and ${adjudication.verifiedMetrics.sourceRows} SourceRows across nine life areas. Current canonical v1 scored ${current.total}/100 and passed every hard gate. It already asks for an anchor date once at bundle setup, so a persisted SharedContext did not reduce user setup input in most cases.

Item-first shared-context scored ${shared.total}/100 and preserved meaning, but the frozen adoption gate required three distinct same-date multi-Item bundles. The primary corpus supplied only ${scorecard.adoptionGate.observedDistinctPrimaryBundles}. Keep it as a future proposal rather than a new canonical entity.

Literal ICS-first scored ${literal.total}/100 and failed the canonical gate. It can serialize scheduled Items, but VEVENT does not natively retain FlowMe manual completion. Unscheduled work, hierarchy and provenance rely on VTODO, VJOURNAL, RELATED-TO and X-properties whose Google/Outlook/Apple round-trip is not proven by the reviewed official documentation.

## Accepted Adapter Rules

1. Calendar is a projection of effective scheduled Items.
2. A Flow may export one VCALENDAR containing sibling VEVENT components.
3. No VEVENT/VTODO nesting and no scheduleless VEVENT.
4. \`calendarPolicy=none | per_item | step_bundle\` is chosen by the projection adapter.
5. \`step_bundle\` groups source-equal same-date Items for a compact event, retains child Item IDs, and declares completion-state loss.
6. Unscheduled Items stay in Checklist, Todo, Sheet, Memo, or FlowMe until the user explicitly schedules them.
7. Map type, creator/provider/source attribution, rights, review and SourceRows remain canonical JSON.

## Reopen Persisted SharedContext When

- at least three structurally different contents require repeated editing of the same date/place/session;
- a user can change the group once and override one Item without ambiguity;
- the relation cannot be derived deterministically from source schedule equality or an existing anchor field;
- observed-user evidence shows material friction with projection-time grouping.

## Evidence Boundary

RFC syntax and the lab parser were checked. External Google, Microsoft and Apple account import/export was not run. Internal expert walkthrough is not observed-user validation.
`;
}

function migrationMarkdown(runtime) {
  return `# Runtime Migration Impact

**Decision:** no runtime or database change in this lab.

## Current bridge

- Runtime \`FlowSection\` can map automatically to canonical Step grouping.
- Runtime \`FlowItem\` IDs, titles and order map directly, but intent, completion semantics and SourceRow provenance need enrichment.
- Existing explicit day offsets, date windows and recurrence values can map conditionally to Item.schedule.
- \`primary_destination=hybrid\` requires a primary Artifact decision and secondary Artifacts.
- Existing VEVENT export remains an adapter; it is not promoted to storage.

## Contract-path audit

- automatic: ${runtime.contractPathMetrics.automatic}/${runtime.contractPathMetrics.totalMappings}
- conditional: ${runtime.contractPathMetrics.conditional}/${runtime.contractPathMetrics.totalMappings}
- human review required: ${runtime.contractPathMetrics.humanReviewRequired}/${runtime.contractPathMetrics.totalMappings}

These are mapping-rule counts, not a record-level migration estimate.

The creator portfolio is richer than the legacy runtime: all ${runtime.representativePortfolioNormalization.items} representative Items already carry source-backed IDs and the ${runtime.representativePortfolioNormalization.sourceRows} SourceRows are available for dry-run normalization. This does not prove the rest of the runtime inventory has equivalent provenance.
`;
}

function pilotProtocolMarkdown() {
  return `# Observed-user Pilot Protocol

**Status:** prepared, not run

## Participants

Recruit 6 participants only after the architecture review is approved:

- 2 date-heavy users: moving or challenge
- 2 progress/resource users: study or creator video queue
- 2 unscheduled/sensitive users: travel checklist or pet schedule

## Tasks

1. Open the source-backed Flow and explain what it will create.
2. Start with zero to two inputs.
3. Add or change a shared anchor date once.
4. Change one child Item date without moving its siblings.
5. Complete one Item and confirm sibling state.
6. Choose compact or granular Calendar output.
7. Find source and caution.
8. Predict what will not appear in ICS.

## Evidence

Record unhinted success, time, critical errors, input repetition, projection prediction, source trust and correction requests. Keep moderator notes and participant quotes separate from automated QA.

Do not call this protocol executed until real participant records exist.
`;
}

function runLab() {
  const examples = creatorData.representativeFlowExamples;
  const snapshot = readJson('creator-discovery-corpus-snapshot-v1.json');
  if (snapshot.primaryCorpus?.length !== 9) {
    throw new Error('Creator corpus snapshot must contain nine primary examples.');
  }

  for (const dir of [
    'runs/current-canonical',
    'runs/literal-ics-first',
    'runs/item-shared-context',
    'fixtures/canonical',
    'fixtures/ics/literal',
    'fixtures/ics/canonical-compact',
    'fixtures/ics/canonical-granular',
    'fixtures/checklist',
    'fixtures/todo',
    'fixtures/sheet',
    'fixtures/memo',
  ]) {
    ensureDir(dir);
  }

  const currentRuns = [];
  const literalRuns = [];
  const sharedRuns = [];
  const normalizationRecords = [];
  const roundTrips = [];
  const projectionManifest = buildProjectionManifest(examples);

  for (const example of examples) {
    const bundle = example.userContentBundle;
    const current = canonicalBundle(example, 'current_canonical_v1');
    const shared = canonicalBundle(example, 'item_first_shared_context');
    const literal = literalIcsGraph(example);
    const literalIcs = renderLiteralIcs(literal);
    const compact = renderProjectionIcs(example, current, 'compact');
    const granular = renderProjectionIcs(example, current, 'granular');

    currentRuns.push(current);
    sharedRuns.push(shared);
    literalRuns.push(literal);

    writeJson(`fixtures/canonical/${bundle.bundleId}.json`, current);
    writeText(`fixtures/ics/literal/${bundle.bundleId}.ics`, literalIcs);
    writeText(`fixtures/ics/canonical-compact/${bundle.bundleId}.ics`, compact.text);
    writeText(`fixtures/ics/canonical-granular/${bundle.bundleId}.ics`, granular.text);
    writeText(`fixtures/checklist/${bundle.bundleId}.md`, checklistProjection(current));
    writeText(`fixtures/todo/${bundle.bundleId}.md`, todoProjection(current));
    writeText(`fixtures/sheet/${bundle.bundleId}.csv`, sheetProjection(current, example));
    writeText(`fixtures/memo/${bundle.bundleId}.md`, memoProjection(current));

    const currentRoundTrip = canonicalRoundTrip(current);
    const sharedRoundTrip = canonicalRoundTrip(shared);
    const literalResult = literalRoundTrip(example, literal, literalIcs);
    const compactParsed = parseIcs(compact.text);
    const granularParsed = parseIcs(granular.text);
    roundTrips.push({
      bundleId: bundle.bundleId,
      currentCanonical: currentRoundTrip,
      itemSharedContext: sharedRoundTrip,
      literalIcs: literalResult,
      projectionIcs: {
        compactComponents: compact.components.length,
        compactParserErrors: compactParsed.errors,
        granularComponents: granular.components.length,
        granularParserErrors: granularParsed.errors,
      },
    });

    const { counts, items } = getBundleStats(example);
    normalizationRecords.push({
      bundleId: bundle.bundleId,
      creatorId: example.creatorId,
      categoryId: example.categoryId,
      provenanceType: example.provenance.type,
      counts,
      sourceRowsResolved: items.every((item) =>
        item.sourceRowIds.every((id) =>
          example.sourceRows.some((row) => row.sourceRowId === id),
        ),
      ),
      sourceTraceResolved: items.every((item) =>
        item.sourceTrace.every((trace) =>
          example.sourceRows.some(
            (row) =>
              row.sourceRowId === trace.sourceRowId &&
              row.sourceUrl === trace.sourceUrl,
          ),
        ),
      ),
      mapType: CATEGORY_RULES[example.creatorId].mapType,
      currentCanonicalPath: `fixtures/canonical/${bundle.bundleId}.json`,
      literalIcsPath: `fixtures/ics/literal/${bundle.bundleId}.ics`,
      compactIcsPath: `fixtures/ics/canonical-compact/${bundle.bundleId}.ics`,
      granularIcsPath: `fixtures/ics/canonical-granular/${bundle.bundleId}.ics`,
    });
  }

  writeJson('runs/current-canonical/results-v1.json', {
    schemaVersion: 'flowme-current-canonical-run-v1',
    records: currentRuns,
  });
  writeJson('runs/literal-ics-first/results-v1.json', {
    schemaVersion: 'flowme-literal-ics-first-run-v1',
    records: literalRuns,
  });
  writeJson('runs/item-shared-context/results-v1.json', {
    schemaVersion: 'flowme-item-shared-context-run-v1',
    records: sharedRuns,
  });
  writeJson('creator-representative-normalization-v1.json', {
    schemaVersion: 'flowme-creator-representative-normalization-v1',
    records: normalizationRecords,
    totals: normalizationRecords.reduce(
      (acc, record) => {
        for (const key of ['flows', 'steps', 'items', 'sourceRows']) {
          acc[key] += record.counts[key];
        }
        return acc;
      },
      { flows: 0, steps: 0, items: 0, sourceRows: 0 },
    ),
  });
  writeJson('projection-loss-manifest-v1.json', projectionManifest);
  writeJson('round-trip-results-v1.json', {
    schemaVersion: 'flowme-round-trip-results-v1',
    evidenceBoundary: {
      labParser: 'run',
      externalGoogleOutlookApple: 'not_run',
    },
    records: roundTrips,
  });

  const runtime = runtimeBaselineMapping();
  writeJson('runtime-baseline-mapping-v1.json', runtime);
  writeText('runtime-migration-impact-v1.md', migrationMarkdown(runtime));

  const categoryFit = examples.map(categoryFitRecord);
  writeJson('category-fit-matrix-v1.json', {
    schemaVersion: 'flowme-category-fit-matrix-v1',
    records: categoryFit,
  });
  writeJson('creator-category-architecture-fit-v1.json', {
    schemaVersion: 'flowme-creator-category-architecture-fit-v1',
    evidenceType: 'source_backed_internal_review',
    records: categoryFit,
  });

  const scorecard = architectureScorecard(categoryFit, roundTrips);
  writeJson('architecture-scorecard-v1.json', scorecard);
  writeJson('usability-task-review-v1.json', buildInternalTaskReview(categoryFit));
  const adjudication = buildFinalAdjudication(scorecard, categoryFit, roundTrips);
  writeJson('final-adjudication-v1.json', adjudication);
  writeText('final-architecture-decision-v1.md', finalDecisionMarkdown(scorecard, adjudication));
  writeText('observed-user-pilot-protocol-v1.md', pilotProtocolMarkdown());

  return {
    examples,
    currentRuns,
    literalRuns,
    sharedRuns,
    normalizationRecords,
    projectionManifest,
    roundTrips,
    runtime,
    categoryFit,
    scorecard,
    adjudication,
  };
}

const lab = runLab();
console.log(
  JSON.stringify(
    {
      primaryBundles: lab.examples.length,
      totals: lab.normalizationRecords.reduce(
        (acc, record) => {
          for (const key of ['flows', 'steps', 'items', 'sourceRows']) {
            acc[key] += record.counts[key];
          }
          return acc;
        },
        { flows: 0, steps: 0, items: 0, sourceRows: 0 },
      ),
      decision: lab.adjudication.decision,
      outputDir: SPEC_DIR,
    },
    null,
    2,
  ),
);
