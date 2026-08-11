import { addDays, formatLocalDate } from '../date';
import type {
  FlowBundle,
  FlowItemDetail,
  FlowItemLinkType,
  FlowItemRole,
  PrimaryDestination,
  StructureType,
} from '../types';
import type {
  FlowExperienceProjectionOptions,
} from '../flow-experience-projection';
import type { TextAuthoringDocument } from './types';

export type AuthoringAdapterLossKind =
  | 'defaulted_legacy_field'
  | 'flattened_property'
  | 'flattened_schedule_detail'
  | 'invalid_schedule'
  | 'missing_step_reference'
  | 'unsupported_resource'
  | 'unsupported_subcheck'
  | 'unsupported_recurrence';

export type AuthoringAdapterLossEntry = {
  lossId: string;
  kind: AuthoringAdapterLossKind;
  path: string;
  message: string;
  itemId?: string;
  sourcePreserved: boolean;
};

export type AuthoringAdapterLossManifest = {
  adapter: 'text-authoring-to-flow-bundle-v1';
  entries: AuthoringAdapterLossEntry[];
  lossCount: number;
  sourcePreserved: true;
};

export type AuthoringFlowBundleAdapterOptions = {
  anchor?: string;
};

export type AuthoringFlowBundleAdapterResult = {
  bundle: FlowBundle;
  projectionOptions: FlowExperienceProjectionOptions;
  lossManifest: AuthoringAdapterLossManifest;
  sourceMutationCount: 0;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === 'string' && entry.trim()) return [entry.trim()];
    if (!isRecord(entry)) return [];
    const text = stringValue(entry.text)
      ?? stringValue(entry.label)
      ?? stringValue(entry.title)
      ?? stringValue(entry.value);
    return text ? [text] : [];
  });
}

function parsePlainDate(value?: string): Date | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1])
    || date.getMonth() !== Number(match[2]) - 1
    || date.getDate() !== Number(match[3])
  ) return undefined;
  return date;
}

function slugPart(value: string): string {
  const normalized = value
    .normalize('NFKC')
    .toLocaleLowerCase('ko-KR')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  return normalized || 'draft';
}

function inferStructureType(
  primaryArtifact: string | undefined,
  hasSchedule: boolean,
  hasRelativeSchedule: boolean,
): StructureType {
  if (primaryArtifact === 'calendar' || hasSchedule || hasRelativeSchedule) return 'timeline';
  return 'checklist';
}

function inferPrimaryDestination(primaryArtifact: string | undefined): PrimaryDestination {
  if (primaryArtifact === 'calendar') return 'calendar';
  if (primaryArtifact === 'sheet') return 'sheet';
  if (primaryArtifact === 'memo') return 'memo';
  return 'internal_check';
}

function inferRole(item: UnknownRecord): FlowItemRole {
  const role = stringValue(item.role);
  if (role === 'resource' || role === 'source') return 'resource';
  if (role === 'guide') return 'reference';
  if (role === 'caution') return 'warning';
  if (role === 'completion') return 'confirmation';

  const intent = stringValue(item.intent);
  if (intent === 'inspect') return 'confirmation';
  if (intent === 'decide') return 'decision';
  if (intent === 'record') return 'record';
  if (intent === 'use_resource') return 'resource';
  return 'action';
}

function completionText(value: unknown): string | undefined {
  if (typeof value === 'string') return stringValue(value);
  if (!isRecord(value)) return undefined;
  return stringValue(value.doneWhen)
    ?? stringValue(value.text)
    ?? stringValue(value.label);
}

const STRUCTURAL_PROPERTY_KEYS = new Set([
  'date',
  'relative_date',
  'anchor',
  'time',
  'timezone',
  'place',
  'duration',
  'repeat',
  'repeat_end',
  'recurrence_end',
  'condition',
  'execution_condition',
  'completion',
  'resource',
  'source',
]);

function propertyLines(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      const key = stringValue(entry.key);
      if (key && STRUCTURAL_PROPERTY_KEYS.has(key)) return [];
      const label = stringValue(entry.label) ?? stringValue(entry.key);
      const propertyValue = stringValue(entry.value)
        ?? stringValue(entry.raw)
        ?? (
          typeof entry.value === 'number' || typeof entry.value === 'boolean'
            ? String(entry.value)
            : undefined
        );
      return label && propertyValue ? [`${label}: ${propertyValue}`] : [];
    });
  }
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, entry]) => {
    if (STRUCTURAL_PROPERTY_KEYS.has(key)) return [];
    if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
      return [`${key}: ${String(entry)}`];
    }
    if (isRecord(entry)) {
      const propertyValue = stringValue(entry.value) ?? stringValue(entry.raw);
      return propertyValue ? [`${key}: ${propertyValue}`] : [];
    }
    return [];
  });
}

function linkEntries(
  value: unknown,
  fallbackType: FlowItemLinkType,
): NonNullable<FlowItemDetail['links']> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, index) => {
    if (typeof entry === 'string') {
      return /^https?:\/\//iu.test(entry)
        ? [{ label: `링크 ${index + 1}`, url: entry, type: fallbackType }]
        : [];
    }
    if (!isRecord(entry)) return [];
    const url = stringValue(entry.url) ?? stringValue(entry.href);
    if (!url || !/^https?:\/\//iu.test(url)) return [];
    const declaredType = stringValue(entry.type);
    const type: FlowItemLinkType = (
      declaredType === 'official'
      || declaredType === 'reference'
      || declaredType === 'tool'
      || declaredType === 'creator'
    ) ? declaredType : fallbackType;
    return [{
      label: stringValue(entry.label) ?? stringValue(entry.title) ?? `링크 ${index + 1}`,
      url,
      type,
    }];
  });
}

function scheduleForItem(
  item: UnknownRecord,
  anchor: string | undefined,
  addLoss: (
    kind: AuthoringAdapterLossKind,
    path: string,
    message: string,
    itemId?: string,
  ) => void,
): {
  flowType: 'todo' | 'calendar';
  detailLine?: string;
  overrideDate?: string;
  dayOffset?: number;
} {
  const schedule = isRecord(item.schedule) ? item.schedule : undefined;
  const itemId = stringValue(item.itemId) ?? 'unknown-item';
  if (!schedule) {
    return {
      flowType: 'todo' as const,
      detailLine: undefined,
    };
  }

  const kind = stringValue(schedule.kind);
  const raw = stringValue(schedule.raw);
  if (kind === 'absolute') {
    const date = stringValue(schedule.date);
    if (!parsePlainDate(date)) {
      addLoss(
        'invalid_schedule',
        `items.${itemId}.schedule`,
        '유효한 절대 날짜가 아니어서 캘린더 날짜로 변환하지 않았습니다.',
        itemId,
      );
      return {
        flowType: 'todo' as const,
        detailLine: raw ? `일정 원문: ${raw}` : undefined,
      };
    }
    if (stringValue(schedule.time)) {
      addLoss(
        'flattened_schedule_detail',
        `items.${itemId}.schedule.time`,
        '시간은 현재 FlowBundle의 구조화 날짜 필드에 없어서 설명과 원문에 보존했습니다.',
        itemId,
      );
    }
    return {
      flowType: 'calendar' as const,
      overrideDate: date,
      detailLine: raw ? `일정 원문: ${raw}` : `날짜: ${date}`,
    };
  }

  if (kind === 'relative') {
    const dayOffset = numberValue(schedule.dayOffset);
    if (dayOffset === undefined) {
      addLoss(
        'invalid_schedule',
        `items.${itemId}.schedule.dayOffset`,
        '상대 날짜 표현은 보존했지만 계산할 수 있는 날짜 간격이 없어 캘린더 날짜로 변환하지 않았습니다.',
        itemId,
      );
      return {
        flowType: 'todo' as const,
        detailLine: raw ?? stringValue(schedule.expression),
      };
    }
    const anchorDate = parsePlainDate(anchor);
    return {
      flowType: 'calendar' as const,
      dayOffset,
      ...(anchorDate ? { overrideDate: formatLocalDate(addDays(anchorDate, dayOffset)) } : {}),
      detailLine: raw ?? stringValue(schedule.expression),
    };
  }

  addLoss(
    'invalid_schedule',
    `items.${itemId}.schedule`,
    '지원하지 않는 일정 종류를 원문에만 보존했습니다.',
    itemId,
  );
  return {
    flowType: 'todo' as const,
    detailLine: raw,
  };
}

export function adaptTextAuthoringDocumentToFlowBundle(
  document: TextAuthoringDocument,
  options: AuthoringFlowBundleAdapterOptions = {},
): AuthoringFlowBundleAdapterResult {
  const canonical = document.parseResult.canonical;
  const flow = canonical.flow as unknown as UnknownRecord;
  const steps = canonical.steps as unknown as UnknownRecord[];
  const items = canonical.items as unknown as UnknownRecord[];
  const sourceRows = canonical.sourceRows as unknown as UnknownRecord[];
  const sourceRowById = new Map(sourceRows.map((row) => [
    stringValue(row.sourceRowId) ?? stringValue(row.rowId) ?? '',
    row,
  ]));
  const losses: AuthoringAdapterLossEntry[] = [];

  function addLoss(
    kind: AuthoringAdapterLossKind,
    path: string,
    message: string,
    itemId?: string,
  ): void {
    losses.push({
      lossId: `adapter-loss-${losses.length + 1}`,
      kind,
      path,
      message,
      ...(itemId ? { itemId } : {}),
      sourcePreserved: true,
    });
  }

  const flowId = stringValue(flow.flowId) ?? `authoring-flow-${slugPart(document.documentId)}`;
  const flowTitle = stringValue(flow.title) ?? '제목 없는 Flow';
  const primaryArtifact = stringValue(flow.primaryArtifact);
  const stepIds = new Set(steps.map((step) => stringValue(step.stepId)).filter(Boolean));
  const hasSchedule = items.some((item) => isRecord(item.schedule));
  const hasRelativeSchedule = items.some((item) => (
    isRecord(item.schedule) && item.schedule.kind === 'relative'
  ));

  if (!stringValue(flow.category)) {
    addLoss(
      'defaulted_legacy_field',
      'flow.category',
      '현재 FlowBundle 필수 필드인 category를 작성 초안으로 표시했습니다.',
    );
  }
  if (hasRelativeSchedule) {
    addLoss(
      'defaulted_legacy_field',
      'flow.anchor_type',
      '상대 날짜를 기존 결과 계산 형식에 맞게 연결했습니다.',
    );
  }

  const sections: FlowBundle['sections'] = steps.map((step, index) => ({
    id: stringValue(step.stepId) ?? `authoring-step-${index + 1}`,
    flow_id: flowId,
    title: stringValue(step.title) ?? `Step ${index + 1}`,
    ...(stringValue(step.description) ? { description: stringValue(step.description) } : {}),
    order: numberValue(step.order) ?? index,
  }));

  const itemDetails: FlowItemDetail[] = [];
  const itemOverrides: NonNullable<FlowExperienceProjectionOptions['itemOverrides']> = {};
  const excludedItemIds: string[] = [];

  const flowItems: FlowBundle['items'] = items.map((item, index) => {
    const itemId = stringValue(item.itemId) ?? `authoring-item-${index + 1}`;
    const stepId = stringValue(item.stepId);
    if (stepId && !stepIds.has(stepId)) {
      addLoss(
        'missing_step_reference',
        `items.${itemId}.stepId`,
        '참조한 Step을 찾지 못해 Item을 그룹 없이 보존했습니다.',
        itemId,
      );
    }

    const schedule = scheduleForItem(item, options.anchor, addLoss);
    const properties = propertyLines(item.properties);
    if (properties.length > 0) {
      addLoss(
        'flattened_property',
        `items.${itemId}.properties`,
        `${properties.length}개 속성을 현재 FlowBundle 설명 텍스트로 보존했습니다.`,
        itemId,
      );
    }
    const subcheckCount = Array.isArray(item.subchecks) ? item.subchecks.length : 0;
    if (subcheckCount > 0) {
      addLoss(
        'unsupported_subcheck',
        `items.${itemId}.subchecks`,
        `${subcheckCount}개 하위 체크는 Text Authoring 결과에 보존하며 P35 adapter v1에는 전달하지 않습니다.`,
        itemId,
      );
    }
    if (isRecord(item.recurrence)) {
      addLoss(
        'unsupported_recurrence',
        `items.${itemId}.recurrence`,
        '반복 규칙과 파생 회차는 Text Authoring 결과에 보존하며 P35 adapter v1에는 전달하지 않습니다.',
        itemId,
      );
    }

    const sourceRowIds = Array.isArray(item.sourceRowIds)
      ? item.sourceRowIds.filter((entry): entry is string => typeof entry === 'string')
      : [];
    const sourceFragments = sourceRowIds.flatMap((sourceRowId) => {
      const row = sourceRowById.get(sourceRowId);
      if (!row) return [];
      return [
        stringValue(row.rawText)
        ?? stringValue(row.text)
        ?? stringValue(row.raw)
        ?? '',
      ].filter(Boolean);
    });
    const resources = linkEntries(item.resources, 'tool');
    const sources = linkEntries(item.sources, 'reference');
    const invalidResourceCount = Array.isArray(item.resources)
      ? item.resources.length - resources.length
      : 0;
    if (invalidResourceCount > 0) {
      addLoss(
        'unsupported_resource',
        `items.${itemId}.resources`,
        `${invalidResourceCount}개 자료는 URL 링크로 표현할 수 없어 원문과 편집 초안에만 보존했습니다.`,
        itemId,
      );
    }

    const guides = stringArray(item.guides);
    const cautions = stringArray(item.cautions);
    const detail = stringValue(item.detail);
    const detailLines = [
      detail,
      ...properties,
    ].filter((entry): entry is string => Boolean(entry));
    const how = guides.length > 0 ? guides.join('\n') : undefined;
    const caution = cautions.length > 0 ? cautions.join('\n') : undefined;
    const completion = completionText(item.completion);
    const links = [...resources, ...sources];

    itemDetails.push({
      item_id: itemId,
      ...(sourceRowIds.length > 0 ? { source_fragment_ids: [...sourceRowIds] } : {}),
      ...(sourceFragments.length > 0
        ? { source_fragment_text: sourceFragments.join('\n') }
        : {}),
      ...(detail ? { why: detail } : {}),
      ...(how ? { how } : {}),
      ...(completion ? { completion_criteria: completion } : {}),
      ...(caution ? { caution } : {}),
      ...(links.length > 0 ? { links } : {}),
    });

    if (schedule.overrideDate) {
      itemOverrides[itemId] = { date: schedule.overrideDate };
    }
    if (item.included === false) excludedItemIds.push(itemId);

    return {
      id: itemId,
      flow_id: flowId,
      ...(stepId && stepIds.has(stepId) ? { section_id: stepId } : {}),
      title: stringValue(item.title) ?? `Item ${index + 1}`,
      ...(detailLines.length > 0 ? { description: detailLines.join('\n') } : {}),
      type: schedule.flowType,
      ...(schedule.dayOffset !== undefined ? { day_offset: schedule.dayOffset } : {}),
      role: inferRole(item),
      order: numberValue(item.order) ?? index,
    };
  });

  const firstSourceLink = items
    .flatMap((item) => linkEntries(item.sources, 'reference') ?? [])
    .find(Boolean)
    ?? (
      document.sourceUrl
        ? {
          label: document.sourceTitle?.trim() || '원문',
          url: document.sourceUrl,
          type: 'reference' as const,
        }
        : undefined
    );
  const createdAt = parsePlainDate(document.createdAt.slice(0, 10))
    ? document.createdAt
    : new Date(0).toISOString();
  const updatedAt = parsePlainDate(document.updatedAt.slice(0, 10))
    ? document.updatedAt
    : createdAt;
  const description = stringValue(flow.description) ?? stringValue(flow.summary);

  const bundle: FlowBundle = {
    flow: {
      id: flowId,
      slug: `authoring-${slugPart(flowId)}`,
      title: flowTitle,
      ...(description ? { description } : {}),
      category: stringValue(flow.category) ?? '작성 초안',
      structure_type: inferStructureType(primaryArtifact, hasSchedule, hasRelativeSchedule),
      anchor_type: hasRelativeSchedule ? 'end_date' : 'none',
      status: 'draft',
      ...(firstSourceLink ? {
        source_title: firstSourceLink.label,
        source_url: firstSourceLink.url,
        source_status: 'needs_review',
        source_precision: 'exact',
      } : {}),
      primary_destination: inferPrimaryDestination(primaryArtifact),
      ...(hasRelativeSchedule ? {
        setup_anchor_label: '기준일',
        setup_anchor_hint: '상대 날짜를 캘린더 날짜로 바꿀 때만 입력합니다.',
      } : {}),
      risk_level: 'low',
      raw_text: document.rawText,
      created_at: createdAt,
      updated_at: updatedAt,
    },
    sections,
    items: flowItems,
    itemDetails,
  };

  return {
    bundle,
    projectionOptions: {
      ...(options.anchor ? { anchor: options.anchor } : {}),
      ...(Object.keys(itemOverrides).length > 0 ? { itemOverrides } : {}),
      ...(excludedItemIds.length > 0 ? { excludedItemIds } : {}),
    },
    lossManifest: {
      adapter: 'text-authoring-to-flow-bundle-v1',
      entries: losses,
      lossCount: losses.length,
      sourcePreserved: true,
    },
    sourceMutationCount: 0,
  };
}
