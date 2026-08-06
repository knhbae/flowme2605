import {
  buildFlowExperienceProjection,
  type FlowExperienceProjection,
  type FlowExperienceProjectionRow,
} from '../flow-experience-projection';
import type { TextAuthoringDocument } from './types';
import {
  adaptTextAuthoringDocumentToFlowBundle,
  type AuthoringAdapterLossManifest,
} from './flow-bundle-adapter';

export type AuthoringArtifactKind = 'calendar' | 'todo' | 'sheet' | 'memo';

export type AuthoringArtifactLossReason =
  | 'undated_item'
  | 'relative_anchor_required'
  | 'invalid_schedule'
  | 'non_completable_role'
  | 'non_row_role'
  | 'insufficient_tabular_structure'
  | 'compatibility_loss';

export type AuthoringArtifactLoss = {
  lossId: string;
  artifact: AuthoringArtifactKind;
  reason: AuthoringArtifactLossReason;
  message: string;
  itemId?: string;
  sourcePreserved: true;
};

export type AuthoringArtifactRow = {
  itemId: string;
  stepId?: string;
  stepTitle?: string;
  title: string;
  /** Authored checkbox marker; separate from personal execution state. */
  sourceChecked?: boolean;
  description?: string;
  /** @deprecated Use `description`; retained for existing consumers. */
  detail?: string;
  completion?: string;
  date?: string;
  sourceExpression?: string;
  time?: string;
  timezone?: string;
  place?: string;
  durationMinutes?: number;
  repeat?: string;
  condition?: string;
  order: number;
  resources: FlowExperienceProjectionRow['resources'];
  sources?: FlowExperienceProjectionRow['resources'];
  /** @deprecated Use `resources` and `sources` when the distinction matters. */
  links: FlowExperienceProjectionRow['resources'];
  sheetCells?: Record<string, string>;
  caution?: string;
  experienceRow: FlowExperienceProjectionRow;
};

export type AuthoringSheetColumn = {
  key: string;
  label: string;
};

export type AuthoringArtifactView = {
  artifact: AuthoringArtifactKind;
  label: string;
  eligible: boolean;
  count: number;
  rows: AuthoringArtifactRow[];
  sheetColumns?: AuthoringSheetColumn[];
  losses: AuthoringArtifactLoss[];
  dateRange?: {
    start: string;
    end: string;
  };
};

export type AuthoringArtifactRecommendation = {
  artifact: AuthoringArtifactKind;
  role: 'primary' | 'secondary';
  count: number;
  reason: string;
};

export type AuthoringArtifactProjection = {
  documentId: string;
  title: string;
  primaryArtifact: AuthoringArtifactKind;
  secondaryArtifacts: AuthoringArtifactKind[];
  recommendations: AuthoringArtifactRecommendation[];
  artifacts: Record<AuthoringArtifactKind, AuthoringArtifactView>;
  counts: {
    interpreted: number;
    included: number;
    excluded: number;
    dated: number;
    undated: number;
  };
  lossManifest: {
    entries: AuthoringArtifactLoss[];
    lossCount: number;
    sourcePreserved: true;
    adapter: AuthoringAdapterLossManifest;
  };
  flowExperienceProjection: FlowExperienceProjection;
  sourceMutationCount: 0;
};

export type BuildAuthoringArtifactProjectionOptions = {
  anchor?: string;
  primaryArtifact?: AuthoringArtifactKind;
  secondaryArtifacts?: AuthoringArtifactKind[];
};

export type AuthoringArtifactScope = 'whole' | 'selected' | 'current_step';

export type BuildArtifactPreflightOptions = {
  artifact: AuthoringArtifactKind;
  scope?: AuthoringArtifactScope;
  selectedItemIds?: string[];
  currentStepId?: string;
};

export type AuthoringArtifactPreflight = {
  preflightId: string;
  documentId: string;
  artifact: AuthoringArtifactKind;
  scope: AuthoringArtifactScope;
  eligible: boolean;
  formats: string[];
  sourceItemCount: number;
  count: number;
  omittedCount: number;
  itemIds: string[];
  firstItems: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  losses: AuthoringArtifactLoss[];
  lossCount: number;
  sourcePreserved: true;
};

type UnknownRecord = Record<string, unknown>;

const ARTIFACT_LABELS: Record<AuthoringArtifactKind, string> = {
  calendar: '캘린더',
  todo: '체크/할 일',
  sheet: '표/엑셀',
  memo: '텍스트',
};

export const AUTHORING_ARTIFACT_FORMATS: Record<AuthoringArtifactKind, string[]> = {
  calendar: ['ics'],
  todo: ['markdown', 'plain_text'],
  sheet: ['csv', 'tsv', 'xlsx'],
  memo: ['raw_source', 'plain_text', 'markdown'],
};

const SECONDARY_ORDER: Record<AuthoringArtifactKind, AuthoringArtifactKind[]> = {
  calendar: ['todo', 'memo', 'sheet'],
  todo: ['memo', 'sheet', 'calendar'],
  sheet: ['todo', 'memo', 'calendar'],
  memo: ['todo', 'sheet', 'calendar'],
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isPlainDate(value: string | undefined): value is string {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return false;
  const date = new Date(Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  ));
  return (
    date.getUTCFullYear() === Number(match[1])
    && date.getUTCMonth() === Number(match[2]) - 1
    && date.getUTCDate() === Number(match[3])
  );
}

function rawAnchorDate(document: TextAuthoringDocument): string | undefined {
  for (const line of document.rawText.split(/\r?\n/u)) {
    const match = /^(?:-\s+)?기준일:\s*(\d{4}-\d{2}-\d{2})\s*$/u.exec(line);
    if (match && isPlainDate(match[1])) return match[1];
  }
  return undefined;
}

function itemProperties(item: UnknownRecord | undefined): UnknownRecord[] {
  return item && Array.isArray(item.properties)
    ? item.properties.filter(isRecord)
    : [];
}

function propertyValue(
  item: UnknownRecord | undefined,
  key: string,
): string | undefined {
  const property = [...itemProperties(item)].reverse().find(
    (candidate) => stringValue(candidate.key) === key,
  );
  return property ? stringValue(property.value) : undefined;
}

function canonicalLinkGroup(
  entries: unknown,
  fallback: FlowExperienceProjectionRow['resources'],
): FlowExperienceProjectionRow['resources'] {
  const values = Array.isArray(entries) ? entries.filter(isRecord) : [];
  const links = values.flatMap((entry) => {
    const url = stringValue(entry.url);
    if (!url) return [];
    return [{
      label: stringValue(entry.label) ?? url,
      url,
      type: stringValue(entry.type) ?? 'link',
      owner: stringValue(entry.owner),
    }];
  });
  const effectiveOwner = [...links].reverse().find(
    (link) => link.owner && link.owner !== 'source',
  )?.owner;
  const owned = effectiveOwner
    ? links.filter((link) => link.owner === effectiveOwner)
    : [];
  const sourceOwned = links.filter(
    (link) => !link.owner || link.owner === 'source',
  );
  const candidates = owned.length > 0
    ? owned
    : sourceOwned.length > 0
      ? sourceOwned
      : links.length > 0
        ? links
        : fallback.map((link) => ({ ...link, owner: undefined }));
  const seen = new Set<string>();
  return candidates.filter((link) => {
    const identity = `${link.label}\u0000${link.url}\u0000${link.type}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  }).map(({ owner: _owner, ...link }) => link);
}

function normalizedArtifact(value: unknown): AuthoringArtifactKind | undefined {
  if (value === 'calendar' || value === 'sheet' || value === 'memo' || value === 'todo') {
    return value;
  }
  if (value === 'checklist' || value === 'internal_check') return 'todo';
  return undefined;
}

function dateRange(rows: AuthoringArtifactRow[]): AuthoringArtifactView['dateRange'] {
  const dates = rows
    .map((row) => row.date)
    .filter((date): date is string => Boolean(date))
    .sort();
  if (dates.length === 0) return undefined;
  return {
    start: dates[0],
    end: dates[dates.length - 1],
  };
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function getCanonicalItemMaps(document: TextAuthoringDocument) {
  const items = document.parseResult.canonical.items as unknown as UnknownRecord[];
  const steps = document.parseResult.canonical.steps as unknown as UnknownRecord[];
  const itemById = new Map(items.map((item, index) => [
    stringValue(item.itemId) ?? `authoring-item-${index + 1}`,
    item,
  ]));
  const stepById = new Map(steps.map((step, index) => [
    stringValue(step.stepId) ?? `authoring-step-${index + 1}`,
    step,
  ]));
  return { items, itemById, stepById };
}

function makeArtifactRow(
  row: FlowExperienceProjectionRow,
  item: UnknownRecord | undefined,
  stepById: Map<string, UnknownRecord>,
): AuthoringArtifactRow {
  const stepId = item ? stringValue(item.stepId) : undefined;
  const step = stepId ? stepById.get(stepId) : undefined;
  const schedule = item && isRecord(item.schedule) ? item.schedule : undefined;
  const description = item
    ? stringValue(item.detail) ?? row.description
    : row.description;
  const completion = item
    ? (
      stringValue(item.completion)
      ?? (
        isRecord(item.completion)
          ? stringValue(item.completion.doneWhen) ?? stringValue(item.completion.text)
          : undefined
      )
    )
    : undefined;
  const resources = canonicalLinkGroup(item?.resources, row.resources);
  const sources = canonicalLinkGroup(item?.sources, []);
  const links = [...resources, ...sources].filter((link, index, values) => (
    values.findIndex((candidate) => (
      candidate.label === link.label
      && candidate.url === link.url
      && candidate.type === link.type
    )) === index
  ));
  const place = propertyValue(item, 'place');
  const repeat = schedule
    ? stringValue(schedule.repeat) ?? propertyValue(item, 'repeat')
    : propertyValue(item, 'repeat');
  const condition = propertyValue(item, 'condition');
  return {
    itemId: row.sourceItemId,
    ...(stepId ? { stepId } : {}),
    ...(step && stringValue(step.title) ? { stepTitle: stringValue(step.title) } : {}),
    title: row.title,
    ...(item && typeof item.sourceChecked === 'boolean'
      ? { sourceChecked: item.sourceChecked }
      : {}),
    ...(description ? { description, detail: description } : {}),
    ...(completion ? { completion } : {}),
    ...(row.schedule.date ? { date: row.schedule.date } : {}),
    ...(schedule && schedule.kind === 'relative'
      ? { sourceExpression: stringValue(schedule.expression) ?? stringValue(schedule.raw) }
      : {}),
    ...(schedule && stringValue(schedule.time)
      ? { time: stringValue(schedule.time) }
      : {}),
    ...(schedule && stringValue(schedule.timezone)
      ? { timezone: stringValue(schedule.timezone) }
      : {}),
    ...(place ? { place } : {}),
    ...(schedule && typeof schedule.durationMinutes === 'number'
      ? { durationMinutes: schedule.durationMinutes }
      : {}),
    ...(repeat ? { repeat } : {}),
    ...(condition ? { condition } : {}),
    order: row.orderRank,
    resources: resources.map((link) => ({ ...link })),
    sources: sources.map((link) => ({ ...link })),
    links: links.map((link) => ({ ...link })),
    ...(row.caution ? { caution: row.caution } : {}),
    experienceRow: {
      ...row,
      schedule: { ...row.schedule },
      resources: row.resources.map((resource) => ({ ...resource })),
      eligibleShapes: [...row.eligibleShapes],
    },
  };
}

type SheetContract = {
  eligible: boolean;
  columns: AuthoringSheetColumn[];
  cellsByItemId: Map<string, Record<string, string>>;
};

const STRUCTURED_SHEET_FIELDS: Array<{
  key: string;
  label: string;
  value: (row: AuthoringArtifactRow) => string | undefined;
}> = [
  { key: 'description', label: '설명', value: (row) => row.description },
  { key: 'completion', label: '완료 기준', value: (row) => row.completion },
  { key: 'date', label: '날짜', value: (row) => row.date },
  { key: 'time', label: '시간', value: (row) => row.time },
  { key: 'timezone', label: '시간대', value: (row) => row.timezone },
  { key: 'place', label: '장소', value: (row) => row.place },
  {
    key: 'durationMinutes',
    label: '소요 시간(분)',
    value: (row) => row.durationMinutes == null
      ? undefined
      : String(row.durationMinutes),
  },
  { key: 'repeat', label: '반복', value: (row) => row.repeat },
  { key: 'condition', label: '조건', value: (row) => row.condition },
  {
    key: 'resources',
    label: '자료',
    value: (row) => row.resources.length > 0
      ? row.resources.map((link) => `${link.label}: ${link.url}`).join('\n')
      : undefined,
  },
  {
    key: 'sources',
    label: '출처',
    value: (row) => (row.sources?.length ?? 0) > 0
      ? row.sources?.map((link) => `${link.label}: ${link.url}`).join('\n')
      : undefined,
  },
];

function originalTableSheetContract(
  rows: AuthoringArtifactRow[],
  itemById: Map<string, UnknownRecord>,
): SheetContract {
  const columns: AuthoringSheetColumn[] = [];
  const columnKeys = new Set<string>();
  const cellsByItemId = new Map<string, Record<string, string>>();

  for (const row of rows) {
    const cells: Record<string, string> = {};
    for (const property of itemProperties(itemById.get(row.itemId))) {
      const label = stringValue(property.label) ?? stringValue(property.key);
      const value = stringValue(property.value);
      if (!label || !value) continue;
      if (!columnKeys.has(label)) {
        columnKeys.add(label);
        columns.push({ key: label, label });
      }
      cells[label] = value;
    }
    cellsByItemId.set(row.itemId, cells);
  }

  return {
    eligible: rows.length > 0,
    columns,
    cellsByItemId,
  };
}

function structuredSheetContract(rows: AuthoringArtifactRow[]): SheetContract {
  const sharedFields = STRUCTURED_SHEET_FIELDS.filter((field) => (
    rows.filter((row) => Boolean(field.value(row))).length >= 2
  ));
  const eligible = rows.length >= 2 && sharedFields.length >= 2;
  const columns = eligible
    ? [
        { key: 'title', label: '항목' },
        ...sharedFields.map(({ key, label }) => ({ key, label })),
      ]
    : [];
  const cellsByItemId = new Map(rows.map((row) => {
    const cells: Record<string, string> = { title: row.title };
    for (const field of sharedFields) {
      const value = field.value(row);
      if (value) cells[field.key] = value;
    }
    return [row.itemId, cells];
  }));
  return { eligible, columns, cellsByItemId };
}

function buildSheetContract(
  document: TextAuthoringDocument,
  rows: AuthoringArtifactRow[],
  itemById: Map<string, UnknownRecord>,
): SheetContract {
  const originalTable = document.inputKinds.includes('table')
    || document.parseResult.canonical.sourceRows.some(
      (row) => row.rowType === 'table_row',
    );
  return originalTable
    ? originalTableSheetContract(rows, itemById)
    : structuredSheetContract(rows);
}

function calendarRowOrder(
  left: AuthoringArtifactRow,
  right: AuthoringArtifactRow,
): number {
  return (left.date ?? '').localeCompare(right.date ?? '')
    || left.order - right.order
    || left.itemId.localeCompare(right.itemId);
}

function lossForMissingArtifactRow(
  artifact: AuthoringArtifactKind,
  itemId: string,
  item: UnknownRecord,
  anchor: string | undefined,
): AuthoringArtifactLoss {
  const schedule = isRecord(item.schedule) ? item.schedule : undefined;
  if (artifact === 'calendar') {
    if (!schedule) {
      return {
        lossId: `calendar-undated-${itemId}`,
        artifact,
        reason: 'undated_item',
        message: '날짜가 없는 항목은 캘린더 일정에 포함하지 않습니다.',
        itemId,
        sourcePreserved: true,
      };
    }
    if (schedule.kind === 'relative' && !anchor) {
      return {
        lossId: `calendar-anchor-${itemId}`,
        artifact,
        reason: 'relative_anchor_required',
        message: '상대 날짜는 기준일을 입력한 뒤에만 캘린더 날짜로 계산합니다.',
        itemId,
        sourcePreserved: true,
      };
    }
    return {
      lossId: `calendar-invalid-${itemId}`,
      artifact,
      reason: 'invalid_schedule',
      message: '일정 원문은 보존했지만 캘린더에서 쓸 날짜로 해석되지 않았습니다.',
      itemId,
      sourcePreserved: true,
    };
  }
  if (artifact === 'todo') {
    return {
      lossId: `todo-role-${itemId}`,
      artifact,
      reason: 'non_completable_role',
      message: '자료·안내·주의는 별도 할 일로 만들지 않고 설명과 텍스트에 보존합니다.',
      itemId,
      sourcePreserved: true,
    };
  }
  return {
    lossId: `sheet-role-${itemId}`,
    artifact,
    reason: 'non_row_role',
    message: '자료·안내·주의는 별도 표 행으로 만들지 않고 설명과 텍스트에 보존합니다.',
    itemId,
    sourcePreserved: true,
  };
}

function recommendationReason(
  artifact: AuthoringArtifactKind,
  count: number,
  role: 'primary' | 'secondary',
): string {
  if (artifact === 'calendar') {
    return `${count}개 항목에 계산 가능한 날짜가 있어 캘린더 ${role === 'primary' ? '결과' : '보조 결과'}로 적합합니다.`;
  }
  if (artifact === 'sheet') {
    return `${count}개 항목의 순서와 내용을 행 단위로 유지합니다.`;
  }
  if (artifact === 'memo') {
    return `${count}개 항목의 설명·자료·주의를 함께 보존합니다.`;
  }
  return `${count}개 실행 항목을 순서대로 확인할 수 있습니다.`;
}

export function buildAuthoringArtifactProjection(
  document: TextAuthoringDocument,
  options: BuildAuthoringArtifactProjectionOptions = {},
): AuthoringArtifactProjection {
  const anchor = rawAnchorDate(document);
  const adapter = adaptTextAuthoringDocumentToFlowBundle(document, { anchor });
  const experience = buildFlowExperienceProjection(
    adapter.bundle,
    adapter.projectionOptions,
  );
  const { items, itemById, stepById } = getCanonicalItemMaps(document);
  const flow = document.parseResult.canonical.flow as unknown as UnknownRecord;
  const includedItemIds = new Set(items.flatMap((item, index) => {
    if (item.included === false) return [];
    return [stringValue(item.itemId) ?? `authoring-item-${index + 1}`];
  }));

  const shapeRows: Record<AuthoringArtifactKind, FlowExperienceProjectionRow[]> = {
    calendar: experience.shapes.calendar.rows,
    todo: experience.shapes.checklist.rows,
    sheet: experience.shapes.sheet.rows,
    memo: experience.shapes.memo.rows,
  };
  const artifacts = {} as Record<AuthoringArtifactKind, AuthoringArtifactView>;
  const allLosses: AuthoringArtifactLoss[] = [];

  for (const artifact of Object.keys(ARTIFACT_LABELS) as AuthoringArtifactKind[]) {
    let rows = shapeRows[artifact].map((row) => (
      makeArtifactRow(
        row,
        itemById.get(row.sourceItemId),
        stepById,
      )
    ));
    if (artifact === 'calendar') rows = [...rows].sort(calendarRowOrder);
    const sheetContract = artifact === 'sheet'
      ? buildSheetContract(document, rows, itemById)
      : undefined;
    if (sheetContract) {
      rows = sheetContract.eligible
        ? rows.map((row) => ({
            ...row,
            sheetCells: {
              ...(sheetContract.cellsByItemId.get(row.itemId) ?? {}),
            },
          }))
        : [];
    }
    const visibleItemIds = new Set(rows.map((row) => row.itemId));
    const losses = artifact === 'memo'
      ? []
      : artifact === 'sheet' && sheetContract && !sheetContract.eligible
        ? [{
            lossId: 'sheet-insufficient-tabular-structure',
            artifact,
            reason: 'insufficient_tabular_structure' as const,
            message: '원본 표이거나 두 개 이상의 항목이 의미 있는 필드 두 개 이상을 공유할 때만 표/엑셀을 사용할 수 있습니다.',
            sourcePreserved: true as const,
          }]
        : [...includedItemIds].flatMap((itemId) => {
          if (visibleItemIds.has(itemId)) return [];
          const item = itemById.get(itemId);
          return item
            ? [lossForMissingArtifactRow(artifact, itemId, item, anchor)]
            : [];
        });
    allLosses.push(...losses);
    artifacts[artifact] = {
      artifact,
      label: ARTIFACT_LABELS[artifact],
      eligible: rows.length > 0,
      count: rows.length,
      rows,
      ...(sheetContract ? { sheetColumns: sheetContract.columns } : {}),
      losses,
      ...(dateRange(rows) ? { dateRange: dateRange(rows) } : {}),
    };
  }

  for (const entry of adapter.lossManifest.entries) {
    if (entry.kind === 'defaulted_legacy_field') continue;
    for (const artifact of Object.keys(ARTIFACT_LABELS) as AuthoringArtifactKind[]) {
      const loss: AuthoringArtifactLoss = {
        lossId: `compatibility-${artifact}-${entry.lossId}`,
        artifact,
        reason: 'compatibility_loss',
        message: entry.message,
        ...(entry.itemId ? { itemId: entry.itemId } : {}),
        sourcePreserved: true,
      };
      artifacts[artifact].losses.push(loss);
      allLosses.push(loss);
    }
  }

  const requestedPrimary = options.primaryArtifact
    ?? normalizedArtifact(flow.primaryArtifact)
    ?? 'todo';
  const primaryArtifact = artifacts[requestedPrimary].eligible
    ? requestedPrimary
    : (
      (['todo', 'sheet', 'memo', 'calendar'] as AuthoringArtifactKind[])
        .find((artifact) => artifacts[artifact].eligible)
      ?? requestedPrimary
    );

  const canonicalSecondary = Array.isArray(flow.secondaryArtifacts)
    ? flow.secondaryArtifacts.flatMap((artifact) => {
      const normalized = normalizedArtifact(artifact);
      return normalized ? [normalized] : [];
    })
    : [];
  const preferredSecondary = options.secondaryArtifacts ?? canonicalSecondary;
  const requestedSecondary = preferredSecondary.filter(
    (artifact, index, entries) => (
      artifact !== primaryArtifact
      && entries.indexOf(artifact) === index
      && artifacts[artifact].eligible
    ),
  );
  const fallbackSecondary = SECONDARY_ORDER[primaryArtifact].filter(
    (artifact) => (
      artifacts[artifact].eligible
      && !requestedSecondary.includes(artifact)
    ),
  );
  const secondaryArtifacts = [
    ...requestedSecondary,
    ...fallbackSecondary,
  ].slice(0, 2);
  const recommendations: AuthoringArtifactRecommendation[] = [
    {
      artifact: primaryArtifact,
      role: 'primary',
      count: artifacts[primaryArtifact].count,
      reason: recommendationReason(primaryArtifact, artifacts[primaryArtifact].count, 'primary'),
    },
    ...secondaryArtifacts.map((artifact): AuthoringArtifactRecommendation => ({
      artifact,
      role: 'secondary',
      count: artifacts[artifact].count,
      reason: recommendationReason(artifact, artifacts[artifact].count, 'secondary'),
    })),
  ];

  const includedRows = experience.outlineRows;
  const dated = includedRows.filter((row) => row.schedule.state !== 'unscheduled').length;
  return {
    documentId: document.documentId,
    title: stringValue(flow.title) ?? '제목 없는 Flow',
    primaryArtifact,
    secondaryArtifacts,
    recommendations,
    artifacts,
    counts: {
      interpreted: items.length,
      included: includedRows.length,
      excluded: experience.excludedRows.length,
      dated,
      undated: includedRows.length - dated,
    },
    lossManifest: {
      entries: allLosses,
      lossCount: allLosses.length,
      sourcePreserved: true,
      adapter: adapter.lossManifest,
    },
    flowExperienceProjection: experience,
    sourceMutationCount: 0,
  };
}

function scopedRows(
  projection: AuthoringArtifactProjection,
  options: BuildArtifactPreflightOptions,
): {
  sourceItemIds: Set<string>;
  rows: AuthoringArtifactRow[];
} {
  const scope = options.scope ?? 'whole';
  const includedRows = projection.flowExperienceProjection.outlineRows;
  let sourceItemIds: Set<string>;
  if (scope === 'selected') {
    sourceItemIds = new Set(options.selectedItemIds ?? []);
  } else if (scope === 'current_step') {
    const stepId = options.currentStepId;
    sourceItemIds = new Set(
      projection.artifacts.memo.rows
        .filter((row) => row.stepId === stepId)
        .map((row) => row.itemId),
    );
  } else {
    sourceItemIds = new Set(includedRows.map((row) => row.sourceItemId));
  }
  return {
    sourceItemIds,
    rows: projection.artifacts[options.artifact].rows.filter(
      (row) => sourceItemIds.has(row.itemId),
    ),
  };
}

export function buildArtifactPreflight(
  projection: AuthoringArtifactProjection,
  options: BuildArtifactPreflightOptions,
): AuthoringArtifactPreflight {
  const scope = options.scope ?? 'whole';
  const { sourceItemIds, rows } = scopedRows(projection, options);
  const itemIds = rows.map((row) => row.itemId);
  const losses = projection.artifacts[options.artifact].losses.filter(
    (loss) => !loss.itemId || sourceItemIds.has(loss.itemId),
  );
  const range = dateRange(rows);
  const identity = [
    projection.documentId,
    options.artifact,
    scope,
    [...sourceItemIds].sort().join(','),
    itemIds.join(','),
  ].join('|');
  const formats = AUTHORING_ARTIFACT_FORMATS[options.artifact].filter(
    (format) => !(
      options.artifact === 'memo'
      && scope !== 'whole'
      && format === 'raw_source'
    ),
  );
  return {
    preflightId: `preflight-${stableHash(identity)}`,
    documentId: projection.documentId,
    artifact: options.artifact,
    scope,
    eligible: rows.length > 0,
    formats,
    sourceItemCount: sourceItemIds.size,
    count: rows.length,
    omittedCount: Math.max(0, sourceItemIds.size - rows.length),
    itemIds,
    firstItems: rows.slice(0, 3).map((row) => row.title),
    ...(range ? { dateRange: range } : {}),
    losses,
    lossCount: losses.length,
    sourcePreserved: true,
  };
}
