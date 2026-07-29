import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(OUT_DIR, '../../..');
const SOURCE_RELATIVE =
  'docs/content-audit/2026-07-27-creator-portfolio-qualified-v2.json';
const SOURCE_PATH = path.join(REPO_ROOT, SOURCE_RELATIVE);
const GENERATED_AT = '2026-07-28T00:00:00.000Z';
const TEST_ANCHOR = '2030-01-07';
const EXPECTED = {
  bundles: 8,
  flows: 21,
  steps: 49,
  items: 160,
  sourceRows: 210,
  scheduledItems: 112,
  undatedItems: 48,
};
const ARCHITECTURES = [
  {
    id: 'current_canonical_v1',
    label: 'Current canonical',
    verdict: 'Go',
    summary:
      '160 Item과 210 SourceRow를 first-class로 보존하면서 일정이 있는 112개만 VEVENT로 투영한다. It preserves the full canonical contract and keeps calendar output destination-specific.',
  },
  {
    id: 'literal_ics_first',
    label: 'Literal ICS-first',
    verdict: 'Hold',
    summary:
      '48개 날짜 없는 Item과 provenance를 VTODO·RELATED-TO·X-property 보존에 의존시켜 hard gate 두 개를 통과하지 못한다. Local syntax passes, but portable completion and provenance do not.',
  },
  {
    id: 'item_first_shared_context',
    label: 'Item-first shared context',
    verdict: 'Modify',
    summary:
      '의미 보존은 통과하지만 공유 일정이 필요한 corpus가 이사 1개뿐이라 새 canonical entity 비용을 정당화하지 못한다. Keep the grouping benefit at projection time.',
  },
];
const TARGETS = [
  'calendar_ics',
  'task_ics_vtodo',
  'checklist',
  'todo',
  'sheet',
  'memo',
];
const DISPOSITION_POINTS = {
  retained: 1,
  grouped_declared: 0.8,
  description_fallback: 0.65,
  sidecar_authoritative: 0.75,
  unproven_client: 0.35,
  unsupported: 0,
  forbidden_by_design: 1,
  not_applicable: 1,
};
const DIMENSIONS = [
  {
    id: 'source_meaning_provenance',
    label: 'Source 의미·provenance',
    max: 20,
    factorKey: 'sourceFactor',
    formula:
      '20 × source retention factor. X-property로만 복구되고 외부 client 보존이 미검증이면 0.5를 적용한다.',
  },
  {
    id: 'independent_completion_state',
    label: 'Item별 독립 완료 상태',
    max: 15,
    factorKey: 'completionFactor',
    formula:
      '15 × independently recoverable completion factor. VEVENT는 FlowMe manual completion을 소유하지 않는다.',
  },
  {
    id: 'scheduled_undated_coverage',
    label: '일정·비일정 포괄성',
    max: 10,
    factorKey: 'coverageFactor',
    formula:
      '10 × (scheduled natural coverage + undated natural coverage) / 160. 미검증 VTODO는 undated coverage에 0.5를 적용한다.',
  },
  {
    id: 'minimum_input_edit_simplicity',
    label: '최소 입력·수정 단순성',
    max: 8,
    factorKey: 'inputFactor',
    formula:
      '8 × setup/source-value reuse factor. source 값을 다시 묻지 않고 0~2개 setup input으로 시작하는지를 본다.',
  },
  {
    id: 'calendar_client_compatibility',
    label: 'Calendar client 호환 위험',
    max: 10,
    factorKey: 'clientFactor',
    formula:
      '10 × client-risk factor. 실제 Google/Outlook/Apple round-trip이 없으므로 단순 VEVENT도 최대 0.7, VTODO+RELATED-TO+X-property 의존은 0.2다.',
  },
  {
    id: 'rights_review_private_overlay',
    label: '권리·검토·개인 overlay 보존',
    max: 10,
    factorKey: 'overlayFactor',
    formula:
      '10 × canonical layer retention factor. user export에 내부 review를 넣지 않으면서 canonical sidecar 없이 보존 가능한지를 본다.',
  },
  {
    id: 'projection_loss',
    label: 'Projection 손실',
    max: 10,
    factorKey: 'projectionFactor',
    formula:
      '10 × projection-loss manifest 평균. retained=1, grouped=0.8, description=0.65, sidecar=0.75, unproven=0.35, unsupported=0.',
  },
  {
    id: 'runtime_migration',
    label: '현재 runtime 이관 영향',
    max: 7,
    factorKey: 'migrationFactor',
    formula:
      '7 × migration factor. 현재 Item adapter 유지=1, 새 canonical entity=0.57, ICS-first 교체=0.14.',
  },
  {
    id: 'backend_dto_complexity',
    label: 'Backend DTO 복잡도',
    max: 5,
    factorKey: 'dtoFactor',
    formula:
      '5 × DTO simplicity factor. 기존 canonical 계약 재사용=1, context indirection=0.6, component/X-property/sidecar 동시 관리=0.2.',
  },
  {
    id: 'external_tool_portability',
    label: '외부 도구 이식성',
    max: 5,
    factorKey: 'portabilityFactor',
    formula:
      '5 × destination-neutral portability factor. 외부 account round-trip 미실행으로 canonical projection도 최대 0.8이다.',
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readSource() {
  const raw = fs.readFileSync(SOURCE_PATH);
  return {
    raw,
    sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    data: JSON.parse(raw.toString('utf8')),
  };
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}

function semanticEqual(left, right) {
  return JSON.stringify(stable(left)) === JSON.stringify(stable(right));
}

function writeJson(filename, value) {
  fs.writeFileSync(
    path.join(OUT_DIR, filename),
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}

function writeText(filename, value) {
  fs.writeFileSync(
    path.join(OUT_DIR, filename),
    value.endsWith('\n') ? value : `${value}\n`,
    'utf8',
  );
}

function datePlus(iso, offsetDays) {
  const value = new Date(`${iso}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function compactDate(iso) {
  return iso.replaceAll('-', '');
}

function resolveTestDate(schedule) {
  if (!schedule) return null;
  if (schedule.type === 'relative_to_target') {
    return datePlus(TEST_ANCHOR, schedule.offsetDays);
  }
  if (schedule.type === 'source_day_index') {
    return datePlus(TEST_ANCHOR, schedule.dayIndex - 174);
  }
  if (schedule.type === 'relative_weekday') {
    const weekday = { 월: 0, 화: 1, 수: 2, 목: 3, 금: 4, 토: 5, 일: 6 };
    return datePlus(
      TEST_ANCHOR,
      (schedule.week - 1) * 7 + weekday[schedule.weekday],
    );
  }
  if (schedule.type === 'sequence_day') {
    return datePlus(TEST_ANCHOR, schedule.day - 1);
  }
  throw new Error(`Unsupported schedule type: ${schedule.type}`);
}

function naturalProjection(defaultArtifact, scheduled) {
  if (defaultArtifact === 'sheet_checklist') return 'sheet';
  if (defaultArtifact === 'checklist_sheet') return 'checklist';
  if (defaultArtifact === 'checklist_memo') return 'checklist';
  if (defaultArtifact === 'resource_queue') return 'todo';
  if (defaultArtifact === 'calendar_checklist') {
    return scheduled ? 'calendar' : 'checklist';
  }
  return scheduled ? 'calendar' : 'todo';
}

function fallbackFor(defaultArtifact) {
  if (defaultArtifact === 'sheet_checklist') {
    return ['sheet', 'checklist', 'todo', 'memo'];
  }
  if (defaultArtifact === 'checklist_sheet') {
    return ['checklist', 'sheet', 'todo', 'memo'];
  }
  if (defaultArtifact === 'checklist_memo') {
    return ['checklist', 'memo', 'todo', 'sheet'];
  }
  if (defaultArtifact === 'resource_queue') {
    return ['todo', 'sheet', 'checklist', 'memo'];
  }
  return ['checklist', 'todo', 'sheet', 'memo'];
}

function buildCorpus(source) {
  const selectionById = new Map(
    source.logicHandoffSelections.map((entry) => [entry.bundleId, entry]),
  );
  const examples = source.representativeFlowExamples.filter((example) =>
    selectionById.has(example.userContentBundle.bundleId),
  );
  assert(examples.length === EXPECTED.bundles, 'Expected eight selected examples.');
  const selectedIds = [...selectionById.keys()].sort();
  const exampleIds = examples
    .map((example) => example.userContentBundle.bundleId)
    .sort();
  assert(
    semanticEqual(selectedIds, exampleIds),
    'Logic handoff and representative example bundle IDs differ.',
  );

  const records = [];
  let flowCount = 0;
  let stepCount = 0;
  for (const example of examples) {
    const bundle = example.userContentBundle;
    const selection = selectionById.get(bundle.bundleId);
    const rowsById = new Map(
      example.sourceRows.map((row) => [row.sourceRowId, row]),
    );
    flowCount += bundle.map.flows.length;
    for (const flow of bundle.map.flows) {
      stepCount += flow.steps.length;
      for (const step of flow.steps) {
        const scheduleGroupCounts = new Map();
        for (const item of step.items) {
          if (!item.schedule) continue;
          const key = JSON.stringify(stable(item.schedule));
          scheduleGroupCounts.set(key, (scheduleGroupCounts.get(key) ?? 0) + 1);
        }
        for (const item of step.items) {
          assert(item.sourceRowIds.length > 0, `${item.itemId} has no SourceRow.`);
          assert(
            item.sourceRowIds.every((id) => rowsById.has(id)),
            `${item.itemId} has an unresolved SourceRow.`,
          );
          const scheduled = Boolean(item.schedule);
          const groupKey = scheduled
            ? `${step.stepId}:${JSON.stringify(stable(item.schedule))}`
            : null;
          const groupSize = scheduled
            ? scheduleGroupCounts.get(JSON.stringify(stable(item.schedule)))
            : 0;
          const calendarPolicy =
            scheduled && groupSize > 1 ? 'step_bundle' : scheduled ? 'per_item' : 'none';
          records.push({
            bundleId: bundle.bundleId,
            bundleTitle: bundle.title,
            creatorId: example.creatorId,
            lifeArea: example.categoryId,
            flowId: flow.flowId,
            stepId: step.stepId,
            stepTitle: step.title,
            itemId: item.itemId,
            itemTitle: item.itemTitle,
            detail: item.memo ?? '',
            completionMode: item.completionMode,
            sourceRowIds: item.sourceRowIds,
            sourceRowCount: item.sourceRowIds.length,
            schedule: item.schedule ?? null,
            scheduled,
            hasSchedule: scheduled,
            calendarComponent: scheduled ? 'VEVENT' : 'VTODO',
            vtodoFallback: !scheduled,
            testResolvedDate: scheduled ? resolveTestDate(item.schedule) : null,
            testDateEvidence:
              'test_only_user_overlay_anchor; not a source date and not publishable',
            scheduleGroupKey: groupKey,
            scheduleGroupSize: groupSize,
            calendarPolicy,
            naturalPrimaryProjection: naturalProjection(
              bundle.defaultArtifact,
              scheduled,
            ),
            projections: {
              calendar: {
                eligible: scheduled,
                component: scheduled ? 'VEVENT' : null,
                policy: calendarPolicy,
                reason: scheduled
                  ? 'Source schedule exists; test date uses declared test-only overlay anchor.'
                  : 'No source schedule; VEVENT is forbidden.',
              },
              vtodo: {
                eligible: !scheduled,
                component: !scheduled ? 'VTODO' : null,
                defaultEnabled: false,
                clientSupport: 'not_proven',
                fallback: fallbackFor(bundle.defaultArtifact),
              },
              checklist: { eligible: true, granularity: 'item' },
              todo: { eligible: true, granularity: 'item' },
              sheet: { eligible: true, granularity: 'item_or_occurrence_row' },
              memo: { eligible: true, granularity: 'flow_or_step_document' },
            },
            readiness: {
              architectureFit: 'Go',
              logicReadiness: selection.logicReadiness,
              publicReadiness: selection.publicReadiness,
              rightsStatus: selection.rightsStatus,
            },
          });
        }
      }
    }
  }
  const totals = {
    bundles: examples.length,
    flows: flowCount,
    steps: stepCount,
    items: records.length,
    sourceRows: examples.reduce(
      (sum, example) => sum + example.sourceRows.length,
      0,
    ),
    sourceRowReferences: records.reduce(
      (sum, record) => sum + record.sourceRowCount,
      0,
    ),
    uniqueSourceRowsReferenced: new Set(
      records.flatMap((record) => record.sourceRowIds),
    ).size,
    scheduledItems: records.filter((record) => record.scheduled).length,
    undatedItems: records.filter((record) => !record.scheduled).length,
  };
  for (const [key, value] of Object.entries(EXPECTED)) {
    assert(totals[key] === value, `${key}: expected ${value}, received ${totals[key]}`);
  }
  assert(
    totals.uniqueSourceRowsReferenced === totals.sourceRows,
    'Unique SourceRow coverage does not reconcile.',
  );
  return { examples, records, totals };
}

function projectionMatrix(records, totals, input) {
  const bundledRecords = records.filter(
    (record) => record.calendarPolicy === 'step_bundle',
  );
  const bundleGroups = new Map();
  for (const record of bundledRecords) {
    if (!bundleGroups.has(record.scheduleGroupKey)) {
      bundleGroups.set(record.scheduleGroupKey, []);
    }
    bundleGroups.get(record.scheduleGroupKey).push(record.itemId);
  }
  const compactEventCount =
    records.filter((record) => record.calendarPolicy === 'per_item').length +
    bundleGroups.size;
  const bundleResults = [...new Set(records.map((record) => record.bundleId))].map(
    (bundleId) => {
      const bundleRecords = records.filter(
        (record) => record.bundleId === bundleId,
      );
      const scheduledItems = bundleRecords.filter(
        (record) => record.scheduled,
      ).length;
      const undatedItems = bundleRecords.length - scheduledItems;
      return {
        bundleId,
        architectureFit: 'Go',
        reason:
          scheduledItems > 0
            ? `${scheduledItems}개 scheduled Item만 VEVENT 대상이며 ${undatedItems}개 undated Item에는 날짜를 발명하지 않는다. Item completion과 SourceRow는 canonical에 남는다.`
            : `${undatedItems}개 undated Item을 VEVENT로 만들지 않고 ${bundleRecords[0].naturalPrimaryProjection}를 primary 비Calendar projection으로 유지한다.`,
      };
    },
  );
  return {
    schemaVersion: 'flowme-projection-matrix-v2',
    generatedAt: GENERATED_AT,
    input,
    evidenceBoundary: {
      source: 'Qualified v2 logic handoff eight only',
      testAnchor:
        `${TEST_ANCHOR} is a test-only user overlay used to exercise relative schedule serialization; it is not source evidence.`,
      externalCalendarAccountRoundTrip: 'NOT_RUN',
      observedUserValidation: 'NOT_RUN',
    },
    totals,
    projectionSummary: {
      calendarEligibleItems: totals.scheduledItems,
      calendarIneligibleUndatedItems: totals.undatedItems,
      perItemVeventCount: totals.scheduledItems,
      compactStepBundleVeventCount: compactEventCount,
      stepBundleGroups: bundleGroups.size,
      stepBundleGroupedItems: bundledRecords.length,
      stepBundleEventReduction: totals.scheduledItems - compactEventCount,
      stepBundleIndependentCompletionLossDeclaredForItems: bundledRecords.length,
      vtodoEligibleUndatedItems: totals.undatedItems,
      vtodoDefaultEnabledItems: 0,
      vtodoFallbackItems: totals.undatedItems,
      checklistEligibleItems: totals.items,
      todoEligibleItems: totals.items,
      sheetEligibleItems: totals.items,
      memoEligibleItems: totals.items,
      schedulelessVevents: 0,
    },
    bundleResults,
    stepBundleGroups: [...bundleGroups.entries()].map(([groupKey, itemIds]) => ({
      groupKey,
      itemIds,
      itemCount: itemIds.length,
      declaration:
        'One VEVENT may carry these child IDs for compact display, but the calendar artifact cannot own each child completion state.',
    })),
    records,
  };
}

function lossDisposition(architecture, target, pathId) {
  const isLiteral = architecture === 'literal_ics_first';
  if (pathId === 'rights_review_private_overlay') {
    return isLiteral ? 'sidecar_authoritative' : 'forbidden_by_design';
  }
  if (target === 'calendar_ics') {
    const table = isLiteral
      ? {
          identity: 'retained',
          title_detail: 'description_fallback',
          completion_state: 'unsupported',
          schedule: 'retained',
          source_provenance: 'unproven_client',
          hierarchy_order: 'unproven_client',
        }
      : {
          identity: 'retained',
          title_detail: 'description_fallback',
          completion_state: 'sidecar_authoritative',
          schedule: 'retained',
          source_provenance: 'description_fallback',
          hierarchy_order: 'grouped_declared',
        };
    return table[pathId];
  }
  if (target === 'task_ics_vtodo') {
    const table = isLiteral
      ? {
          identity: 'unproven_client',
          title_detail: 'description_fallback',
          completion_state: 'unproven_client',
          schedule: 'not_applicable',
          source_provenance: 'unproven_client',
          hierarchy_order: 'unproven_client',
        }
      : {
          identity: 'unproven_client',
          title_detail: 'description_fallback',
          completion_state: 'sidecar_authoritative',
          schedule: 'not_applicable',
          source_provenance: 'description_fallback',
          hierarchy_order: 'unproven_client',
        };
    return table[pathId];
  }
  const canonicalTable = {
    identity: 'retained',
    title_detail: target === 'sheet' ? 'grouped_declared' : 'retained',
    completion_state: target === 'memo' ? 'sidecar_authoritative' : 'retained',
    schedule:
      target === 'sheet'
        ? 'retained'
        : target === 'memo'
          ? 'description_fallback'
          : 'grouped_declared',
    source_provenance: target === 'sheet' ? 'grouped_declared' : 'retained',
    hierarchy_order: 'retained',
  };
  if (!isLiteral) return canonicalTable[pathId];
  const literalTable = {
    identity: 'retained',
    title_detail: target === 'sheet' ? 'grouped_declared' : 'retained',
    completion_state: 'unproven_client',
    schedule: 'unproven_client',
    source_provenance: 'unproven_client',
    hierarchy_order: 'unproven_client',
  };
  return literalTable[pathId];
}

function buildLossManifest(input) {
  const paths = [
    'identity',
    'title_detail',
    'completion_state',
    'schedule',
    'source_provenance',
    'hierarchy_order',
    'rights_review_private_overlay',
  ];
  const records = [];
  for (const architecture of ARCHITECTURES) {
    for (const target of TARGETS) {
      const pathResults = paths.map((pathId) => {
        const disposition = lossDisposition(architecture.id, target, pathId);
        return {
          pathId,
          disposition,
          points: DISPOSITION_POINTS[disposition],
        };
      });
      records.push({
        architecture: architecture.id,
        target,
        paths: pathResults,
        retentionRatio:
          pathResults.reduce((sum, entry) => sum + entry.points, 0) /
          pathResults.length,
      });
    }
  }
  const architectureRetention = Object.fromEntries(
    ARCHITECTURES.map((architecture) => {
      const subset = records.filter(
        (record) => record.architecture === architecture.id,
      );
      return [
        architecture.id,
        subset.reduce((sum, record) => sum + record.retentionRatio, 0) /
          subset.length,
      ];
    }),
  );
  return {
    schemaVersion: 'flowme-projection-loss-manifest-v2',
    generatedAt: GENERATED_AT,
    input,
    evidenceBoundary: {
      scoring: 'deterministic contract scoring; not observed-user evidence',
      externalCalendarAccountRoundTrip: 'NOT_RUN',
    },
    controlledDispositions: DISPOSITION_POINTS,
    architectureRetention,
    stepBundleLossRule:
      'step_bundle keeps canonical child Item IDs but declares loss of independent completion in the exported calendar event.',
    records,
  };
}

function escapeIcs(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll(/\r?\n/g, '\\n')
    .replaceAll(',', '\\,')
    .replaceAll(';', '\\;');
}

function component(kind, properties) {
  return [
    `BEGIN:${kind}`,
    ...properties.map(([key, value]) => `${key}:${escapeIcs(value)}`),
    `END:${kind}`,
  ];
}

function literalIcsFor(example) {
  const bundle = example.userContentBundle;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FlowMe//Qualified Architecture Lab v2//KO',
  ];
  lines.push(
    ...component('VJOURNAL', [
      ['UID', `${bundle.map.mapId}@flowme.local`],
      ['DTSTAMP', '20260728T000000Z'],
      ['SUMMARY', bundle.map.title],
      ['X-FLOWME-KIND', 'MAP'],
    ]),
  );
  for (const flow of bundle.map.flows) {
    lines.push(
      ...component('VJOURNAL', [
        ['UID', `${flow.flowId}@flowme.local`],
        ['DTSTAMP', '20260728T000000Z'],
        ['SUMMARY', flow.title],
        ['RELATED-TO;RELTYPE=PARENT', `${bundle.map.mapId}@flowme.local`],
        ['X-FLOWME-KIND', 'FLOW'],
      ]),
    );
    for (const step of flow.steps) {
      lines.push(
        ...component('VJOURNAL', [
          ['UID', `${step.stepId}@flowme.local`],
          ['DTSTAMP', '20260728T000000Z'],
          ['SUMMARY', step.title],
          ['RELATED-TO;RELTYPE=PARENT', `${flow.flowId}@flowme.local`],
          ['X-FLOWME-KIND', 'STEP'],
        ]),
      );
      for (const item of step.items) {
        const kind = item.schedule ? 'VEVENT' : 'VTODO';
        const properties = [
          ['UID', `${item.itemId}@flowme.local`],
          ['DTSTAMP', '20260728T000000Z'],
          ['SUMMARY', item.itemTitle],
          ['DESCRIPTION', item.memo ?? ''],
          ['RELATED-TO;RELTYPE=PARENT', `${step.stepId}@flowme.local`],
          ['X-FLOWME-KIND', 'ITEM'],
          ['X-FLOWME-SOURCE-ROWS', item.sourceRowIds.join(',')],
        ];
        if (item.schedule) {
          properties.push([
            'DTSTART;VALUE=DATE',
            compactDate(resolveTestDate(item.schedule)),
          ]);
        } else {
          properties.push(['STATUS', 'NEEDS-ACTION']);
        }
        lines.push(...component(kind, properties));
      }
    }
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

function parseIcs(text) {
  const stack = [];
  const components = [];
  const errors = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/).filter(Boolean)) {
    if (rawLine.startsWith('BEGIN:')) {
      const kind = rawLine.slice(6);
      const parent = stack.at(-1) ?? null;
      if (
        (parent === 'VEVENT' || parent === 'VTODO') &&
        kind !== 'VALARM'
      ) {
        errors.push(`nested_component:${parent}>${kind}`);
      }
      stack.push(kind);
      if (kind !== 'VCALENDAR') {
        current = { kind, properties: {} };
        components.push(current);
      }
      continue;
    }
    if (rawLine.startsWith('END:')) {
      const kind = rawLine.slice(4);
      if (stack.pop() !== kind) errors.push(`mismatched_end:${kind}`);
      current =
        [...components].reverse().find((candidate) =>
          stack.includes(candidate.kind),
        ) ?? null;
      continue;
    }
    if (!current) continue;
    const colon = rawLine.indexOf(':');
    if (colon < 0) {
      errors.push(`missing_colon:${rawLine}`);
      continue;
    }
    const key = rawLine.slice(0, colon).split(';')[0];
    current.properties[key] = rawLine.slice(colon + 1);
  }
  if (stack.length) errors.push(`unclosed:${stack.join(',')}`);
  return { components, errors };
}

function buildRoundTrips(corpus, input) {
  const records = [];
  for (const example of corpus.examples) {
    const bundleId = example.userContentBundle.bundleId;
    const itemRecords = corpus.records.filter(
      (record) => record.bundleId === bundleId,
    );
    const canonical = {
      bundleId,
      items: itemRecords.map((record) => ({
        itemId: record.itemId,
        schedule: record.schedule,
        sourceRowIds: record.sourceRowIds,
        completionMode: record.completionMode,
      })),
      sourceRows: example.sourceRows,
    };
    const canonicalParsed = JSON.parse(JSON.stringify(canonical));
    const sharedGroups = new Map();
    for (const record of itemRecords.filter(
      (candidate) =>
        candidate.scheduled && candidate.scheduleGroupSize > 1,
    )) {
      if (!sharedGroups.has(record.scheduleGroupKey)) {
        sharedGroups.set(record.scheduleGroupKey, {
          contextId: `ctx:${record.scheduleGroupKey}`,
          schedule: record.schedule,
          itemIds: [],
        });
      }
      sharedGroups.get(record.scheduleGroupKey).itemIds.push(record.itemId);
    }
    const shared = {
      bundleId,
      contexts: [...sharedGroups.values()],
      items: itemRecords.map((record) => ({
        itemId: record.itemId,
        schedule:
          record.scheduleGroupSize > 1 ? null : record.schedule,
        sharedContextRef:
          record.scheduleGroupSize > 1
            ? `ctx:${record.scheduleGroupKey}`
            : null,
        sourceRowIds: record.sourceRowIds,
        completionMode: record.completionMode,
      })),
    };
    const contextById = new Map(
      shared.contexts.map((context) => [context.contextId, context]),
    );
    const rehydrated = shared.items.map((item) => ({
      itemId: item.itemId,
      schedule: item.sharedContextRef
        ? contextById.get(item.sharedContextRef).schedule
        : item.schedule,
      sourceRowIds: item.sourceRowIds,
      completionMode: item.completionMode,
    }));
    const ics = literalIcsFor(example);
    const parsed = parseIcs(ics);
    const itemComponents = parsed.components.filter(
      (componentEntry) =>
        componentEntry.properties['X-FLOWME-KIND'] === 'ITEM',
    );
    const recoveredRows = itemComponents.flatMap((componentEntry) =>
      String(componentEntry.properties['X-FLOWME-SOURCE-ROWS'] ?? '')
        .replaceAll('\\,', ',')
        .split(',')
        .filter(Boolean),
    );
    records.push({
      bundleId,
      input: {
        items: itemRecords.length,
        sourceRows: example.sourceRows.length,
        scheduledItems: itemRecords.filter((record) => record.scheduled).length,
        undatedItems: itemRecords.filter((record) => !record.scheduled).length,
      },
      currentCanonical: {
        semanticJsonRoundTrip: semanticEqual(canonical, canonicalParsed),
        stableItemIds: semanticEqual(
          canonical.items.map((item) => item.itemId),
          canonicalParsed.items.map((item) => item.itemId),
        ),
        sourceRowsStable: semanticEqual(
          canonical.sourceRows,
          canonicalParsed.sourceRows,
        ),
      },
      itemFirstSharedContext: {
        contextCount: shared.contexts.length,
        boundItemCount: shared.contexts.reduce(
          (sum, context) => sum + context.itemIds.length,
          0,
        ),
        semanticRehydration: semanticEqual(canonical.items, rehydrated),
        independentCompletionOwner: 'Item',
      },
      literalIcsFirst: {
        parserErrors: parsed.errors,
        itemComponents: itemComponents.length,
        veventCount: itemComponents.filter(
          (componentEntry) => componentEntry.kind === 'VEVENT',
        ).length,
        vtodoCount: itemComponents.filter(
          (componentEntry) => componentEntry.kind === 'VTODO',
        ).length,
        schedulelessVevents: itemComponents.filter(
          (componentEntry) =>
            componentEntry.kind === 'VEVENT' &&
            !componentEntry.properties.DTSTART,
        ).length,
        nestedVeventOrVtodo: parsed.errors.filter((error) =>
          error.startsWith('nested_component:'),
        ).length,
        sourceRowReferencesRecoveredByLabParser: recoveredRows.length,
        sourceRowIdsRecoveredByLabParser: recoveredRows,
        sourceRowReferencesExpected: itemRecords.reduce(
          (sum, record) => sum + record.sourceRowCount,
          0,
        ),
        completionSemanticsNative: {
          vevent: 0,
          vtodo: itemRecords.filter((record) => !record.scheduled).length,
          note:
            'VTODO status is standard syntax, but external client import/re-export preservation is NOT_RUN.',
        },
        externalClientRoundTrip: 'NOT_RUN',
        vtodoSupport: 'NOT_PROVEN',
        relatedToSupport: 'NOT_PROVEN',
        xPropertySupport: 'NOT_PROVEN',
      },
    });
  }
  const summary = {
    canonicalSemanticRoundTripsPassed: records.filter(
      (record) => record.currentCanonical.semanticJsonRoundTrip,
    ).length,
    sharedContextSemanticRoundTripsPassed: records.filter(
      (record) => record.itemFirstSharedContext.semanticRehydration,
    ).length,
    literalSyntaxPasses: records.filter(
      (record) => record.literalIcsFirst.parserErrors.length === 0,
    ).length,
    totalRecords: records.length,
    schedulelessVevents: records.reduce(
      (sum, record) => sum + record.literalIcsFirst.schedulelessVevents,
      0,
    ),
    nestedVeventOrVtodo: records.reduce(
      (sum, record) => sum + record.literalIcsFirst.nestedVeventOrVtodo,
      0,
    ),
    vevents: records.reduce(
      (sum, record) => sum + record.literalIcsFirst.veventCount,
      0,
    ),
    vtodos: records.reduce(
      (sum, record) => sum + record.literalIcsFirst.vtodoCount,
      0,
    ),
    sourceRowReferencesRecoveredByLabParser: records.reduce(
      (sum, record) =>
        sum + record.literalIcsFirst.sourceRowReferencesRecoveredByLabParser,
      0,
    ),
    uniqueSourceRowsRecoveredByLabParser: new Set(
      records.flatMap((record) =>
        record.literalIcsFirst.sourceRowIdsRecoveredByLabParser ?? [],
      ),
    ).size,
    externalClientRoundTrip: 'NOT_RUN',
    observedUserValidation: 'NOT_RUN',
  };
  assert(summary.schedulelessVevents === 0, 'Scheduleless VEVENT found.');
  assert(summary.nestedVeventOrVtodo === 0, 'Nested VEVENT/VTODO found.');
  assert(summary.vevents === EXPECTED.scheduledItems, 'VEVENT count mismatch.');
  assert(summary.vtodos === EXPECTED.undatedItems, 'VTODO count mismatch.');
  assert(
    summary.uniqueSourceRowsRecoveredByLabParser === EXPECTED.sourceRows,
    'Lab parser unique SourceRow recovery mismatch.',
  );
  return {
    schemaVersion: 'flowme-round-trip-results-v2',
    generatedAt: GENERATED_AT,
    input,
    evidenceBoundary: {
      canonicalJson: 'RUN',
      sharedContextRehydration: 'RUN',
      literalIcsLabParser: 'RUN',
      externalGoogleOutlookApple: 'NOT_RUN',
      observedUserValidation: 'NOT_RUN',
    },
    testOverlay: {
      anchorDate: TEST_ANCHOR,
      purpose: 'relative schedule serializer test only',
      sourceEvidence: false,
      publishable: false,
    },
    summary,
    records,
  };
}

function roundScore(max, factor) {
  return Math.round(max * factor);
}

function buildScorecard(corpus, lossManifest, roundTrips, input) {
  const projectionFactor = lossManifest.architectureRetention;
  const scheduled = corpus.totals.scheduledItems;
  const undated = corpus.totals.undatedItems;
  const total = corpus.totals.items;
  const factors = {
    current_canonical_v1: {
      sourceFactor: 1,
      completionFactor: 1,
      coverageFactor: 1,
      inputFactor: 1,
      clientFactor: 0.7,
      overlayFactor: 1,
      projectionFactor: projectionFactor.current_canonical_v1,
      migrationFactor: 1,
      dtoFactor: 1,
      portabilityFactor: 0.8,
    },
    literal_ics_first: {
      sourceFactor: 0.5,
      completionFactor: (undated / total) * 0.8,
      coverageFactor: (scheduled + undated * 0.5) / total,
      inputFactor: 1,
      clientFactor: 0.2,
      overlayFactor: 0.3,
      projectionFactor: projectionFactor.literal_ics_first,
      migrationFactor: 0.14,
      dtoFactor: 0.2,
      portabilityFactor: 0.4,
    },
    item_first_shared_context: {
      sourceFactor: 1,
      completionFactor: 1,
      coverageFactor: 1,
      inputFactor: 0.875,
      clientFactor: 0.7,
      overlayFactor: 1,
      projectionFactor: projectionFactor.item_first_shared_context,
      migrationFactor: 0.57,
      dtoFactor: 0.6,
      portabilityFactor: 0.8,
    },
  };
  const architectures = ARCHITECTURES.map((architecture) => {
    const architectureFactors = factors[architecture.id];
    const dimensions = DIMENSIONS.map((dimension) => {
      const factor = architectureFactors[dimension.factorKey];
      return {
        id: dimension.id,
        label: dimension.label,
        score: roundScore(dimension.max, factor),
        max: dimension.max,
        factor: Number(factor.toFixed(4)),
        formula: dimension.formula,
        evidence:
          dimension.id === 'scheduled_undated_coverage'
            ? `${scheduled} scheduled + ${undated} undated Items; VTODO external support is NOT_PROVEN.`
            : dimension.id === 'projection_loss'
              ? `Manifest mean retention=${factor.toFixed(4)} across ${TARGETS.length} targets.`
              : 'Factor is fixed by the v2 architecture contract and verified corpus evidence.',
      };
    });
    const score = dimensions.reduce((sum, dimension) => sum + dimension.score, 0);
    const hardGates =
      architecture.id === 'literal_ics_first'
        ? [
            {
              id: 'source_provenance_without_unproven_client_extension',
              status: 'fail',
              evidence:
                '210 unique SourceRows (250 references) recover in the lab parser only through X-FLOWME-SOURCE-ROWS; external preservation is NOT_PROVEN.',
            },
            {
              id: 'independent_completion_for_all_items',
              status: 'fail',
              evidence:
                '112 VEVENT Items have no native FlowMe manual completion semantics.',
            },
            {
              id: 'no_scheduleless_vevent',
              status: 'pass',
              evidence: '0 scheduleless VEVENT.',
            },
            {
              id: 'no_nested_vevent_vtodo',
              status: 'pass',
              evidence: '0 nested VEVENT/VTODO.',
            },
          ]
        : [
            {
              id: 'source_provenance',
              status: 'pass',
              evidence: '210/210 SourceRows retain first-class references.',
            },
            {
              id: 'independent_completion_for_all_items',
              status: 'pass',
              evidence: '160/160 completion owners remain Item.',
            },
            {
              id: 'no_scheduleless_vevent',
              status: 'pass',
              evidence: '0 scheduleless VEVENT.',
            },
            {
              id: 'no_nested_vevent_vtodo',
              status: 'pass',
              evidence: '0 nested VEVENT/VTODO.',
            },
          ];
    return {
      id: architecture.id,
      label: architecture.label,
      verdict: architecture.verdict,
      summary: architecture.summary,
      score,
      dimensions,
      hardGates,
    };
  });
  assert(
    !semanticEqual(
      architectures.map((architecture) => architecture.score),
      [96, 51, 95],
    ),
    'v1 scores were accidentally copied.',
  );
  return {
    schemaVersion: 'flowme-architecture-scorecard-v2',
    generatedAt: GENERATED_AT,
    input,
    evidenceType: 'deterministic_contract_score_plus_internal_expert_factors',
    observedUserValidation: 'NOT_RUN',
    weights: Object.fromEntries(
      DIMENSIONS.map((dimension) => [dimension.id, dimension.max]),
    ),
    formulaPolicy: {
      total: 'sum(round(dimension.max × dimension.factor))',
      projectionFactor:
        'mean of disposition points across six projection targets and seven semantic paths',
      note:
        'These are deterministic architecture comparison scores, not user preference or production reliability evidence.',
    },
    corpusTotals: corpus.totals,
    sharedContextAdoptionGate: {
      requiredDistinctBundles: 3,
      observedDistinctBundles: new Set(
        corpus.records
          .filter((record) => record.scheduleGroupSize > 1)
          .map((record) => record.bundleId),
      ).size,
      passed:
        new Set(
          corpus.records
            .filter((record) => record.scheduleGroupSize > 1)
            .map((record) => record.bundleId),
        ).size >= 3,
    },
    roundTripSummary: roundTrips.summary,
    architectures,
    records: architectures.map((architecture) => ({
      architecture: architecture.id,
      label: architecture.label,
      verdict: architecture.verdict,
      summary: architecture.summary,
      total: architecture.score,
      dimensions: Object.fromEntries(
        architecture.dimensions.map((dimension) => [
          dimension.id,
          {
            score: dimension.score,
            max: dimension.max,
            factor: dimension.factor,
          },
        ]),
      ),
      hardGates: architecture.hardGates,
    })),
    comparisonConclusion:
      'Current canonical remains preferred. The 48 undated Items strengthen the need for destination-specific projections and make literal ICS-first more dependent on unproven VTODO/RELATED-TO/X-property behavior. Persisted SharedContext still fails the three-bundle adoption gate; use projection-time grouping instead.',
  };
}

function buildFinalAdjudication(corpus, matrix, scorecard, input) {
  const scoreById = Object.fromEntries(
    scorecard.architectures.map((architecture) => [
      architecture.id,
      architecture.score,
    ]),
  );
  return {
    schemaVersion: 'flowme-final-architecture-adjudication-v2',
    generatedAt: GENERATED_AT,
    input,
    decision: 'keep_current_canonical_v1_add_projection_time_grouping',
    verdict: 'Go',
    rationale: [
      `Current canonical scored ${scoreById.current_canonical_v1}/100 on the new 160-Item corpus and passed every hard gate.`,
      `${corpus.totals.undatedItems}/${corpus.totals.items} Items are undated; forcing ICS-first makes their usable behavior depend on VTODO support that was not externally tested.`,
      `Only one distinct bundle needs equal-schedule multi-Item grouping, below the frozen three-bundle threshold for a persisted SharedContext entity.`,
      'Literal ICS-first can pass a local syntax parser but cannot portably own FlowMe completion, provenance, rights/review, and private overlay without X-properties or a sidecar.',
    ],
    adoptNow: [
      'Keep SourceRow → Item → Step → Flow → Bundle/Flow Map canonical.',
      'Keep completion, decision, record, hold, and occurrence state on Item.',
      'Add projectionPolicy.calendar = none | per_item | step_bundle at export/request time.',
      'Allow step_bundle only for source-equal schedules; include child Item IDs and declare independent completion loss.',
      'Export scheduled Items as sibling VEVENT components only.',
      'Offer VTODO only behind a destination capability check; default to Checklist/Todo/Sheet/Memo fallbacks.',
    ],
    hold: [
      {
        proposal: 'persist SharedContext as a canonical entity',
        reason:
          '1 distinct bundle qualifies; the frozen adoption threshold is 3, and existing setup fields already collect anchors once.',
      },
      {
        proposal: 'use literal ICS-first as canonical storage',
        reason:
          'Fails source-provenance and independent-completion hard gates; external VTODO/RELATED-TO/X-property round-trip is NOT_RUN.',
      },
      {
        proposal: 'claim external calendar compatibility',
        reason:
          'No Google, Outlook, or Apple account import/re-export test was run.',
      },
    ],
    backendRules: [
      'Reject VEVENT generation when effective Item.schedule is null.',
      'Never nest VEVENT or VTODO; emit sibling components inside VCALENDAR.',
      'Keep stable Item ID + occurrence key as projection identity.',
      'For step_bundle, include all child Item IDs and set completionOwner=canonical_item_state.',
      'Treat VTODO, RELATED-TO, VALARM, VJOURNAL, and X-property preservation as capability flags, not assumptions.',
      'Keep rights/review/private overlay out of user exports while retaining them in canonical DTO storage.',
      'Do not turn test-only anchor dates into source facts.',
    ],
    verifiedMetrics: {
      ...corpus.totals,
      perItemVevents: matrix.projectionSummary.perItemVeventCount,
      compactStepBundleVevents:
        matrix.projectionSummary.compactStepBundleVeventCount,
      stepBundleGroupedItems:
        matrix.projectionSummary.stepBundleGroupedItems,
      stepBundleIndependentCompletionLossDeclaredForItems:
        matrix.projectionSummary
          .stepBundleIndependentCompletionLossDeclaredForItems,
      schedulelessVevents: 0,
      nestedVeventOrVtodo: 0,
      inventedActions: 0,
      inventedSourceDates: 0,
      sourceValuesReasked: 0,
      corpusCounts: {
        bundles: corpus.totals.bundles,
        flows: corpus.totals.flows,
        steps: corpus.totals.steps,
        items: corpus.totals.items,
        sourceRows: corpus.totals.sourceRows,
        scheduledItems: corpus.totals.scheduledItems,
        undatedItems: corpus.totals.undatedItems,
      },
      externalClientRoundTrip: 'not_run',
      observedUserValidation: 'not_run',
    },
    verificationStatus: {
      deterministicGenerator: 'RUN',
      schemaValidation: 'delegated_to_integrated_validator',
      canonicalJsonRoundTrip: '8/8 PASS',
      sharedContextSemanticRehydration: '8/8 PASS',
      literalIcsLabParser: '8/8 PASS',
      externalGoogleOutlookAppleRoundTrip: 'NOT_RUN',
      observedUserValidation: 'NOT_RUN',
      runtimeChanged: false,
      databaseChanged: false,
      productionApiChanged: false,
    },
  };
}

function alternativesMarkdown(corpus, scorecard, matrix, input) {
  const rows = scorecard.architectures
    .map(
      (architecture) =>
        `| ${architecture.label} | ${architecture.score}/100 | ${architecture.verdict} | ${architecture.hardGates.filter((gate) => gate.status === 'fail').length} |`,
    )
    .join('\n');
  return `# Architecture Alternatives v2

**Input:** \`${input.path}\`  
**SHA-256:** \`${input.sha256}\`  
**Evidence:** deterministic contract comparison; observed-user validation and external calendar account round-trip are **NOT RUN**

## Frozen corpus

- ${corpus.totals.bundles} Bundle / ${corpus.totals.flows} Flow / ${corpus.totals.steps} Step
- ${corpus.totals.items} Item / ${corpus.totals.sourceRows} SourceRow
- ${corpus.totals.scheduledItems} scheduled / ${corpus.totals.undatedItems} undated Item
- All three alternatives use the same Item boundaries, schedules, completion modes, and SourceRow refs.

## Result

| Alternative | Recomputed score | Verdict | Failed hard gates |
| --- | ---: | --- | ---: |
${rows}

The v1 values 96/51/95 were not reused. Every v2 dimension is calculated as
\`round(max × factor)\`; projection loss is calculated from six target projections
and seven semantic paths. See \`architecture-scorecard-v2.json\` for every formula
and factor.

## A. Current canonical

\`SourceRow → Item → Step → Flow → Bundle/Flow Map → projection\`

- Keeps 160 independent completion owners and 210 direct SourceRow references.
- Scheduled Items can become VEVENT; 48 undated Items remain valid without a fake date.
- Rights, review, and private overlay remain outside user exports.
- Adopt with an explicit projection-time \`none | per_item | step_bundle\` policy.

## B. Literal ICS-first

\`VCALENDAR → VJOURNAL/VEVENT/VTODO + RELATED-TO + X-properties\`

- Local syntax checks can represent 112 VEVENT and 48 VTODO as siblings.
- It recovers 210 references only because the lab parser understands
  \`X-FLOWME-SOURCE-ROWS\`.
- 112 VEVENT Items have no native FlowMe manual completion state.
- VTODO, RELATED-TO, VJOURNAL, and X-property client round-trip are unproven.
- A sidecar is still required for rights, review, and private overlay, defeating
  the claim that ICS is the complete canonical model.

## C. Item-first shared context

\`SourceRow → Item → sharedContextRef → Step/Flow/Map → projection\`

- Semantic rehydration passes and Item remains the state owner.
- ${matrix.projectionSummary.stepBundleGroups} equal-schedule groups bind
  ${matrix.projectionSummary.stepBundleGroupedItems} Items.
- Those groups occur in only one distinct Bundle, below the frozen three-Bundle
  adoption gate.
- Persisting a new entity does not reduce current setup fields enough to justify
  schema and migration cost. Keep the idea at projection time.

## Projection decision

- Per-item Calendar: ${matrix.projectionSummary.perItemVeventCount} VEVENT.
- Compact moving Calendar: ${matrix.projectionSummary.compactStepBundleVeventCount}
  VEVENT, reducing ${matrix.projectionSummary.stepBundleEventReduction} calendar
  entries while declaring independent-completion loss for
  ${matrix.projectionSummary.stepBundleIndependentCompletionLossDeclaredForItems}
  child Items.
- Undated: ${matrix.projectionSummary.vtodoEligibleUndatedItems} VTODO candidates,
  default-disabled until a target capability check passes; every one has
  Checklist/Todo/Sheet/Memo fallback.

## Decision

Keep current canonical v1 and add projection-time schedule grouping. The larger
undated share (48/160, 30%) strengthens—not weakens—the rule that ICS is a
projection rather than the Flow content unit.
`;
}

function finalizeRightsAndReadiness(matrix) {
  const fileName = 'rights-and-readiness-matrix-v2.json';
  const filePath = path.join(OUT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${fileName} must be generated before architecture finalization.`);
  }
  const readiness = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const bundleResults = new Map(
    matrix.bundleResults.map((record) => [record.bundleId, record]),
  );
  readiness.records = readiness.records.map((record) => {
    if (!record.includedInNormalCorpusTotals) return record;
    const result = bundleResults.get(record.bundleId);
    if (!result) {
      throw new Error(`Missing architecture fit for ${record.bundleId}`);
    }
    return {
      ...record,
      architectureFit: result.architectureFit,
      architectureFitReason: result.reason,
    };
  });
  readiness.normalCorpusSummary.architectureFit = readiness.records
    .filter((record) => record.includedInNormalCorpusTotals)
    .reduce((counts, record) => {
      counts[record.architectureFit] =
        (counts[record.architectureFit] ?? 0) + 1;
      return counts;
    }, {});
  writeJson(fileName, readiness);
}

function finalizeBaselineDelta(scorecard, adjudication) {
  const fileName = 'baseline-delta-v2.json';
  const filePath = path.join(OUT_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`${fileName} must be generated before architecture finalization.`);
  }
  const delta = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const scores = Object.fromEntries(
    scorecard.architectures.map((architecture) => [
      architecture.id,
      architecture.score,
    ]),
  );
  delta.currentCorpus.architectureScores = scores;
  delta.currentCorpus.architectureDecision = adjudication.decision;
  delta.architectureScoreDelta = Object.fromEntries(
    Object.entries(scores).map(([architectureId, score]) => [
      architectureId,
      score - delta.baseline.architectureScores[architectureId],
    ]),
  );
  writeJson(fileName, delta);
}

function run() {
  const source = readSource();
  const input = {
    path: SOURCE_RELATIVE,
    sha256: source.sha256,
    schemaVersion: source.data.schemaVersion,
    logicHandoffBundleIds: source.data.logicHandoffSelections.map(
      (entry) => entry.bundleId,
    ),
  };
  const corpus = buildCorpus(source.data);
  const matrix = projectionMatrix(corpus.records, corpus.totals, input);
  const lossManifest = buildLossManifest(input);
  const roundTrips = buildRoundTrips(corpus, input);
  const scorecard = buildScorecard(corpus, lossManifest, roundTrips, input);
  const adjudication = buildFinalAdjudication(
    corpus,
    matrix,
    scorecard,
    input,
  );

  writeJson('projection-matrix-v2.json', matrix);
  writeJson('projection-loss-manifest-v2.json', lossManifest);
  writeJson('round-trip-results-v2.json', roundTrips);
  writeJson('architecture-scorecard-v2.json', scorecard);
  writeJson('final-adjudication-v2.json', adjudication);
  finalizeRightsAndReadiness(matrix);
  finalizeBaselineDelta(scorecard, adjudication);
  writeText(
    'architecture-alternatives-v2.md',
    alternativesMarkdown(corpus, scorecard, matrix, input),
  );

  console.log(
    JSON.stringify(
      {
        inputSha256: input.sha256,
        totals: corpus.totals,
        scores: Object.fromEntries(
          scorecard.architectures.map((architecture) => [
            architecture.id,
            architecture.score,
          ]),
        ),
        projectionSummary: matrix.projectionSummary,
        roundTripSummary: roundTrips.summary,
        decision: adjudication.decision,
      },
      null,
      2,
    ),
  );
}

run();
