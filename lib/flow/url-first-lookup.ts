import {
  buildSourceBackedFlowMapPersistenceRecord,
  buildSourceBackedFlowMapPublishPackage,
  buildSourceBackedFlowMapSavedSnapshot,
  getSourceBackedFlowMapDateAnchorCopy,
  getUrlFirstLookupableSourceBackedFlowMaps,
  type SourceBackedFlowMapPersistenceRecord,
  type SourceBackedFlowMapSavedSnapshot,
  type SourceBackedMyFlowMap,
} from './source-backed-my-flow';
import { toUserFacingMapTitle, toUserFacingSourceTitle } from './display-title';
import type { FlowItemState } from './types';

export const AJD_MOVING_SOURCE_URL =
  'https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363';

export type UrlFirstLookupStatus = 'hit' | 'needs_review' | 'miss' | 'memo_draft';
export type UrlFirstInputKind = 'url' | 'memo';
export type UrlFirstSourceStatus = 'real' | 'needs_review' | 'missing';
export type UrlFirstExportMode = 'calendar' | 'markdown' | 'checklist';
export type UrlFirstSaveMode = 'direct' | 'preview_only' | 'draft_preview' | 'blocked';
export type UrlFirstSavedArtifactMode = 'calendar' | 'checklist' | 'sheet';

export type UrlFirstGate = {
  title: string;
  reason: string;
  requiredAction: string;
};

export type UrlFirstAiGenerationState = {
  enabled: boolean;
  reason: string;
};

export type UrlFirstPreview = {
  calendar: string[];
  markdown: string[];
  checklist: string[];
  myFlow: string[];
  calendarFilename?: string;
  markdownFilename?: string;
};

export type UrlFirstRecommendation = {
  title: string;
  href: string;
  reason: string;
};

export type UrlFirstLookupResult = {
  status: UrlFirstLookupStatus;
  inputKind: UrlFirstInputKind;
  input: string;
  title: string;
  summary: string;
  sourceStatus: UrlFirstSourceStatus;
  exportModes: UrlFirstExportMode[];
  canExport: boolean;
  canSaveToMyFlow: boolean;
  saveMode: UrlFirstSaveMode;
  aiGeneration: UrlFirstAiGenerationState;
  preview: UrlFirstPreview;
  canonicalUrl?: string;
  displayUrl?: string;
  sourceLabel?: string;
  sourceCheckedAt?: string;
  routeHref?: string;
  flowMapId?: string;
  flowSlug?: string;
  gate?: UrlFirstGate;
  recommendation?: UrlFirstRecommendation;
};

export type UrlFirstStartPackageOptions = {
  startDate: string;
  exportMode: UrlFirstExportMode;
  savedAt?: string;
  customTitle?: string;
  includedStepIds?: string[];
};

export type UrlFirstStartPackage = {
  status: 'ready' | 'blocked';
  canSaveToMyFlow: boolean;
  savedFlows: {
    slug: string;
    selectedArtifactMode: UrlFirstSavedArtifactMode;
    anchor?: string;
  }[];
  startDate?: string;
  exportMode?: UrlFirstExportMode;
  targetHref?: string;
  flowMapId?: string;
  flowSlug?: string;
  savedMapSnapshot?: SourceBackedFlowMapSavedSnapshot;
  persistenceRecord?: SourceBackedFlowMapPersistenceRecord;
  itemStatesByFlowSlug?: Record<string, Record<string, FlowItemState>>;
  markdownExport?: {
    filename: string;
    content: string;
  };
  gate?: UrlFirstGate;
};

type UrlFirstLookupTemplate = Omit<UrlFirstLookupResult, 'input' | 'canonicalUrl' | 'displayUrl'>;

const TRACKING_QUERY_KEYS = new Set(['fbclid', 'gclid']);

const aiDisabledForP0: UrlFirstAiGenerationState = {
  enabled: false,
  reason: '지금은 기존 Flow를 먼저 찾아보고, 새로 필요한 URL은 초안 요청으로 보관합니다.',
};

const movingHitPreview: UrlFirstPreview = {
  calendarFilename: 'moving-d30-flow.ics',
  markdownFilename: 'moving-d30-flow.md',
  calendar: [
    'D-30 이사 방식과 견적 후보 정하기',
    'D-21 주소 변경과 관리사무소 연락 정리',
    'D-7 계량기·하자 사진 촬영 준비',
  ],
  markdown: [
    '# 원룸 이사 D-30 일정 지도',
    '- [ ] 이사 방식과 견적 후보 정하기',
    '- [ ] 주소 변경과 관리사무소 연락 정리',
    '- [ ] 계량기·하자 사진 촬영 준비',
  ],
  checklist: ['이사일 입력', '견적 후보 2-3곳 메모', '주소 변경 대상 확인', '당일 사진 기록'],
  myFlow: ['오늘 할 일 1개', '다가오는 일정 3개', '체크 완료 상태는 저장 전 미리보기'],
};

const vehicleReviewPreview: UrlFirstPreview = {
  calendar: [],
  markdown: [],
  checklist: [],
  myFlow: ['원문 확인 전에는 내 Flow 저장이 열리지 않습니다.', '검토 완료 후 캘린더와 체크리스트 export를 다시 계산합니다.'],
};

const missPreview: UrlFirstPreview = {
  calendar: [],
  markdown: [],
  checklist: [],
  myFlow: ['아직 저장 가능한 Flow가 없어요.', 'URL과 메모를 초안 요청으로 보관합니다.'],
};

const memoDraftPreview: UrlFirstPreview = {
  calendarFilename: 'private-memo-draft.ics',
  markdownFilename: 'private-memo-draft.md',
  calendar: ['이번 주 견적 후보 정리', '다음 주 주소 변경 대상 확인', '이사 전날 사진 기록 준비'],
  markdown: [
    '# 비공개 계획 메모 초안',
    '- [ ] 이번 주 해야 할 일 분리',
    '- [ ] 날짜가 필요한 항목만 캘린더 후보로 표시',
    '- [ ] 원문 URL이 없으므로 공유 Flow 전환은 보류',
  ],
  checklist: ['할 일 문장 분리', '날짜 후보 표시', '기존 이사 Flow와 비교', '공유 전 원문/근거 보강'],
  myFlow: ['저장 전 예상 화면만 표시합니다.', '비공개 초안은 공개 Flow가 되지 않습니다.'],
};

function getSourceBackedMapSourceStatus(map: SourceBackedMyFlowMap): UrlFirstSourceStatus {
  if (map.userFacingStatus && !map.userFacingStatus.includes('바로 시작')) return 'needs_review';
  return 'real';
}

function formatSourceCheckedAt(value?: string): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function getSourceBackedPreviewRows(map: SourceBackedMyFlowMap): string[] {
  const publishPackage = buildSourceBackedFlowMapPublishPackage(map.id);
  const rows =
    publishPackage?.public.childFlows
      .flatMap((flow) => flow.steps.map((step) => step.title))
      .filter(Boolean)
      .slice(0, 3) ?? [];
  return rows.length > 0 ? rows : [`${toUserFacingMapTitle(map.title)} 저장 전 보기`];
}

function buildSourceBackedPreview(map: SourceBackedMyFlowMap): UrlFirstPreview {
  const rows = getSourceBackedPreviewRows(map);
  const displayMapTitle = toUserFacingMapTitle(map.title);
  return {
    calendarFilename: `${map.id}-flow.ics`,
    markdownFilename: `${map.id}-flow.md`,
    calendar: rows,
    markdown: [`# ${displayMapTitle}`, ...rows.map((row) => `- [ ] ${row}`)],
    checklist: rows,
    myFlow: [`${displayMapTitle} 저장 후 오늘/전체에서 이어보기`, '일정이 있는 항목은 캘린더에서도 확인'],
  };
}

function buildSourceBackedLookupTemplate(map: SourceBackedMyFlowMap): UrlFirstLookupTemplate | undefined {
  if (!map.sourceUrl) return undefined;

  const sourceStatus = getSourceBackedMapSourceStatus(map);
  const canUseDirectly = sourceStatus === 'real';
  const sourceLabel = toUserFacingSourceTitle(map.sourceTitle ?? map.userLabel ?? map.title);
  const displayMapTitle = toUserFacingMapTitle(map.title);

  return {
    status: 'hit',
    inputKind: 'url',
    title: canUseDirectly ? '이미 만들어진 Flow가 있어요' : '기존 Flow가 있지만 확인이 필요해요',
    summary: canUseDirectly
      ? `${sourceLabel} 기준으로 저장 가능한 콘텐츠를 찾았어요. 필요한 옵션만 바꾸고 저장 전 확인할 수 있습니다.`
      : `${sourceLabel} 기준의 콘텐츠가 있지만 아직 보강이 필요한 상태입니다. 저장과 export 전에 원문 확인이 필요합니다.`,
    sourceStatus,
    sourceLabel,
    sourceCheckedAt: formatSourceCheckedAt(map.updatedAt),
    routeHref: `/flow-maps/${map.id}`,
    flowMapId: map.id,
    flowSlug: map.recommendedFlowSlug ?? map.flowSlugs[0],
    exportModes: canUseDirectly ? ['calendar', 'markdown', 'checklist'] : [],
    canExport: canUseDirectly,
    canSaveToMyFlow: canUseDirectly,
    saveMode: canUseDirectly ? 'direct' : 'preview_only',
    aiGeneration: aiDisabledForP0,
    preview: buildSourceBackedPreview(map),
    ...(canUseDirectly
      ? {}
      : {
          gate: {
            title: '저장과 export 전에 확인이 필요합니다',
            reason: '원문 row와 실행 일정이 아직 보강 상태라 바로 캘린더 파일을 만들지 않습니다.',
            requiredAction: '출처 row, 일정 기준, 위험 문구를 확인한 뒤 저장과 export를 열어야 합니다.',
          },
        }),
  };
}

function buildSourceBackedLookupEntries(): Array<[string, UrlFirstLookupTemplate]> {
  const maps = getUrlFirstLookupableSourceBackedFlowMaps();
  const entries: Array<[string, UrlFirstLookupTemplate]> = [];

  for (const map of maps) {
    const template = buildSourceBackedLookupTemplate(map);
    if (!template) continue;
    entries.push([canonicalizeFlowSourceUrl(map.sourceUrl), template]);
  }

  return entries;
}

const explicitLookupTemplatesByCanonicalUrl = new Map<string, UrlFirstLookupTemplate>([
  [
    canonicalizeFlowSourceUrl(AJD_MOVING_SOURCE_URL),
    {
      status: 'hit',
      inputKind: 'url',
      title: '이미 변환된 Flow가 있어요',
      summary: '같은 원문 URL 기준으로 이사 D-30 Flow를 재사용합니다. 시작일 옵션만 바꾸고 바로 미리볼 수 있습니다.',
      sourceStatus: 'real',
      sourceLabel: toUserFacingSourceTitle('AJD 이사 준비 체크리스트'),
      sourceCheckedAt: '2026-06-23',
      routeHref: '/flow-maps/curated-ajd-moving-d30',
      flowMapId: 'curated-ajd-moving-d30',
      flowSlug: 'curated-ajd-moving-d30',
      exportModes: ['calendar', 'markdown', 'checklist'],
      canExport: true,
      canSaveToMyFlow: true,
      saveMode: 'direct',
      aiGeneration: aiDisabledForP0,
      preview: movingHitPreview,
    },
  ],
  [
    canonicalizeFlowSourceUrl('https://flowme.local/f/vehicle-inspection-prep'),
    {
      status: 'needs_review',
      inputKind: 'url',
      title: '원문 확인이 필요한 Flow입니다',
      summary: '자동차검사 D-14 준비 Flow는 구조 미리보기만 제공합니다. 원문 검토가 끝나기 전까지 저장과 export는 막아둡니다.',
      sourceStatus: 'needs_review',
      sourceLabel: '자동차검사 D-14 준비',
      sourceCheckedAt: '2026-05-23',
      routeHref: '/f/vehicle-inspection-prep',
      flowSlug: 'vehicle-inspection-prep',
      exportModes: [],
      canExport: false,
      canSaveToMyFlow: false,
      saveMode: 'preview_only',
      aiGeneration: aiDisabledForP0,
      gate: {
        title: 'Export와 저장이 잠겨 있습니다',
        reason: '원문 확인 전에는 캘린더 파일을 만들지 않습니다.',
        requiredAction: '출처 row, 일정 기준, 위험 문구를 검토한 뒤 export를 열어야 합니다.',
      },
      preview: vehicleReviewPreview,
    },
  ],
]);

const lookupTemplatesByCanonicalUrl = new Map<string, UrlFirstLookupTemplate>([
  ...buildSourceBackedLookupEntries(),
  ...explicitLookupTemplatesByCanonicalUrl,
]);

function isTrackingQueryKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return lowerKey.startsWith('utm_') || TRACKING_QUERY_KEYS.has(lowerKey);
}

function canonicalHost(hostname: string): string {
  const lowerHost = hostname.toLowerCase();
  if (lowerHost === 'm.ajd.co.kr') return 'www.ajd.co.kr';
  if (lowerHost === 'www.youtube.com') return 'youtube.com';
  return lowerHost;
}

function decodePathname(pathname: string): string {
  try {
    return decodeURI(pathname);
  } catch {
    return pathname;
  }
}

export function canonicalizeFlowSourceUrl(input: string): string {
  const trimmed = input.trim();
  const parsed = new URL(trimmed);
  const host = canonicalHost(parsed.hostname);
  const decodedPathname = decodePathname(parsed.pathname).replace(/\/+$/, '') || '/';
  const retainedParams = [...parsed.searchParams.entries()]
    .filter(([key]) => !isTrackingQueryKey(key))
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      const keyCompare = leftKey.localeCompare(rightKey);
      if (keyCompare !== 0) return keyCompare;
      return leftValue.localeCompare(rightValue);
    });
  const search = new URLSearchParams(retainedParams).toString();

  return `https://${host}${decodedPathname}${search ? `?${search}` : ''}`;
}

function withInput(template: UrlFirstLookupTemplate, input: string, canonicalUrl: string): UrlFirstLookupResult {
  return {
    ...template,
    input,
    canonicalUrl,
    displayUrl: canonicalUrl,
    exportModes: [...template.exportModes],
    aiGeneration: { ...template.aiGeneration },
    preview: {
      calendar: [...template.preview.calendar],
      markdown: [...template.preview.markdown],
      checklist: [...template.preview.checklist],
      myFlow: [...template.preview.myFlow],
      calendarFilename: template.preview.calendarFilename,
      markdownFilename: template.preview.markdownFilename,
    },
    gate: template.gate ? { ...template.gate } : undefined,
    recommendation: template.recommendation ? { ...template.recommendation } : undefined,
  };
}

function buildMiss(input: string, canonicalUrl?: string): UrlFirstLookupResult {
  return {
    status: 'miss',
    inputKind: 'url',
    input,
    canonicalUrl,
    displayUrl: canonicalUrl ?? input.trim(),
    title: '아직 Flow화되지 않은 URL입니다',
    summary: '아직 준비된 Flow가 없어요. URL과 메모를 초안 요청으로 보관하고, 바로 만들지는 않습니다.',
    sourceStatus: 'missing',
    exportModes: [],
    canExport: false,
    canSaveToMyFlow: false,
    saveMode: 'blocked',
    aiGeneration: aiDisabledForP0,
    preview: {
      calendar: [...missPreview.calendar],
      markdown: [...missPreview.markdown],
      checklist: [...missPreview.checklist],
      myFlow: [...missPreview.myFlow],
    },
  };
}

export function lookupUrlFirstP0Input(input: string): UrlFirstLookupResult {
  const trimmed = input.trim();
  if (!trimmed) return buildMiss(input);

  try {
    const canonicalUrl = canonicalizeFlowSourceUrl(trimmed);
    const template = lookupTemplatesByCanonicalUrl.get(canonicalUrl);
    if (template) return withInput(template, input, canonicalUrl);
    return buildMiss(input, canonicalUrl);
  } catch {
    return buildMiss(input);
  }
}

export function buildUrlFirstMemoDraft(input: string): UrlFirstLookupResult {
  return {
    status: 'memo_draft',
    inputKind: 'memo',
    input,
    title: '비공개 메모 초안',
    summary: 'URL 없이 적은 계획 메모를 캘린더와 체크리스트 후보로만 미리 보여줍니다. 공유 Flow로 전환하려면 원문이나 근거가 더 필요합니다.',
    sourceStatus: 'missing',
    exportModes: ['calendar', 'markdown', 'checklist'],
    canExport: false,
    canSaveToMyFlow: false,
    saveMode: 'draft_preview',
    aiGeneration: aiDisabledForP0,
    preview: {
      calendar: [...memoDraftPreview.calendar],
      markdown: [...memoDraftPreview.markdown],
      checklist: [...memoDraftPreview.checklist],
      myFlow: [...memoDraftPreview.myFlow],
      calendarFilename: memoDraftPreview.calendarFilename,
      markdownFilename: memoDraftPreview.markdownFilename,
    },
    recommendation: {
      title: '원룸 이사 D-30 일정 지도',
      href: '/flow-maps/moving-d30',
      reason: '이사 관련 메모라면 이미 검토된 이사 Flow를 먼저 재사용할 수 있습니다.',
    },
  };
}

function isPlainDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

function artifactModeForStartExport(exportMode: UrlFirstExportMode): UrlFirstSavedArtifactMode {
  return exportMode === 'calendar' ? 'calendar' : 'checklist';
}

function normalizeUrlFirstCustomTitle(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

function pickUrlFirstRecordValues<T>(record: Record<string, T>, keys: string[]): Record<string, T> {
  return Object.fromEntries(keys.flatMap((key) => (key in record ? [[key, record[key]]] : [])));
}

function getUrlFirstMapStepSelection(
  publishPackage: NonNullable<ReturnType<typeof buildSourceBackedFlowMapPublishPackage>>,
  includedStepIds?: string[],
): {
  allStepIds: string[];
  selectedStepIds: Set<string>;
  selectedFlowSlugs: string[];
  stepCountsByFlow: Record<string, number>;
  itemStatesByFlowSlug: Record<string, Record<string, FlowItemState>>;
  includedStepIdsByFlow: Record<string, string[]>;
  excludedStepIdsByFlow: Record<string, string[]>;
} {
  const allStepIds = publishPackage.public.childFlows.flatMap((flow) => flow.steps.map((step) => step.id));
  const allStepIdSet = new Set(allStepIds);
  const selectedStepIds =
    includedStepIds === undefined
      ? new Set(allStepIds)
      : new Set(includedStepIds.map((id) => id.trim()).filter((id) => allStepIdSet.has(id)));

  const selectedFlowSlugs: string[] = [];
  const stepCountsByFlow: Record<string, number> = {};
  const itemStatesByFlowSlug: Record<string, Record<string, FlowItemState>> = {};
  const includedStepIdsByFlow: Record<string, string[]> = {};
  const excludedStepIdsByFlow: Record<string, string[]> = {};

  publishPackage.public.childFlows.forEach((flow) => {
    const includedStepIds = flow.steps.filter((step) => selectedStepIds.has(step.id)).map((step) => step.id);
    const excludedStepIds = flow.steps.filter((step) => !selectedStepIds.has(step.id)).map((step) => step.id);
    if (includedStepIds.length > 0) {
      selectedFlowSlugs.push(flow.slug);
      stepCountsByFlow[flow.slug] = includedStepIds.length;
      includedStepIdsByFlow[flow.slug] = includedStepIds;
    }
    if (excludedStepIds.length > 0) excludedStepIdsByFlow[flow.slug] = excludedStepIds;

    const skippedStates = Object.fromEntries(
      flow.steps
        .filter((step) => !selectedStepIds.has(step.id))
        .map((step) => [step.id, { skipped: true, note: 'excluded_on_start' } satisfies FlowItemState]),
    );
    if (Object.keys(skippedStates).length > 0) itemStatesByFlowSlug[flow.slug] = skippedStates;
  });

  return {
    allStepIds,
    selectedStepIds,
    selectedFlowSlugs,
    stepCountsByFlow,
    itemStatesByFlowSlug,
    includedStepIdsByFlow,
    excludedStepIdsByFlow,
  };
}

function customizeUrlFirstSavedMapSnapshot(
  snapshot: SourceBackedFlowMapSavedSnapshot,
  options: {
    title?: string;
    selectedFlowSlugs: string[];
    stepCountsByFlow: Record<string, number>;
    includedStepIdsByFlow: Record<string, string[]>;
    excludedStepIdsByFlow: Record<string, string[]>;
    personalize?: boolean;
  },
): SourceBackedFlowMapSavedSnapshot {
  return {
    ...snapshot,
    title: options.title ?? snapshot.title,
    flowSlugs: options.selectedFlowSlugs,
    stepCountsByFlow: options.stepCountsByFlow,
    riskLevelsByFlow: pickUrlFirstRecordValues(snapshot.riskLevelsByFlow, options.selectedFlowSlugs),
    sourceCheckedAtByFlow: pickUrlFirstRecordValues(snapshot.sourceCheckedAtByFlow, options.selectedFlowSlugs),
    ...(options.personalize
      ? {
          personalCopy: {
            source: 'url_first_custom_start',
            originalTitle: snapshot.title,
            includedStepIdsByFlow: options.includedStepIdsByFlow,
            excludedStepIdsByFlow: options.excludedStepIdsByFlow,
          },
        }
      : {}),
  };
}

function customizeUrlFirstPersistenceRecord(
  record: SourceBackedFlowMapPersistenceRecord,
  options: {
    title?: string;
    selectedStepIds: Set<string>;
  },
): SourceBackedFlowMapPersistenceRecord {
  return {
    ...record,
    map: {
      ...record.map,
      title: options.title ?? record.map.title,
    },
    childFlows: record.childFlows
      .map((child) => {
        const steps = child.steps.filter((step) => options.selectedStepIds.has(step.stepId));
        return {
          ...child,
          stepCount: steps.length,
          itemFallbackCount: steps.reduce((total, step) => total + (step.textFallback.items?.length ?? 0), 0),
          stepIds: steps.map((step) => step.stepId),
          steps,
        };
      })
      .filter((child) => child.steps.length > 0),
  };
}

function buildUrlFirstBlockedStartPackage(result: UrlFirstLookupResult, reason: string): UrlFirstStartPackage {
  return {
    status: 'blocked',
    canSaveToMyFlow: false,
    savedFlows: [],
    gate: result.gate ?? {
      title: '저장할 수 없습니다',
      reason,
      requiredAction: '저장 가능한 기존 Flow를 먼저 선택해야 합니다.',
    },
  };
}

function buildUrlFirstStartMarkdown(
  result: UrlFirstLookupResult,
  startDate: string,
  options: { title?: string; rows?: string[] } = {},
): string {
  const id = result.flowMapId ?? result.flowSlug ?? 'flow';
  const source = result.displayUrl ?? result.sourceLabel ?? result.input.trim();
  const title = options.title ?? result.title;
  const rows = options.rows ?? (result.preview.markdown.length > 0 ? result.preview.markdown : [`# ${result.title}`]);

  return [
    `# ${title}`,
    '',
    `- Flow: ${id}`,
    `- Start date: ${startDate}`,
    source ? `- Source: ${source}` : '',
    '',
    ...rows,
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function buildUrlFirstStartPackage(
  result: UrlFirstLookupResult,
  options: UrlFirstStartPackageOptions,
): UrlFirstStartPackage {
  const startDate = options.startDate.trim();
  const sourceBackedStartPackage = result.flowMapId ? buildSourceBackedFlowMapPublishPackage(result.flowMapId) : undefined;
  const dateAnchorLabel = getSourceBackedFlowMapDateAnchorCopy(sourceBackedStartPackage).label;
  if (!result.canSaveToMyFlow || result.saveMode !== 'direct') {
    return buildUrlFirstBlockedStartPackage(result, '원문 확인이 끝나지 않았거나 아직 Flow화되지 않은 URL입니다.');
  }
  if (!isPlainDate(startDate)) {
    return buildUrlFirstBlockedStartPackage(result, `${dateAnchorLabel}은 yyyy-mm-dd 형식이어야 합니다.`);
  }

  const selectedArtifactMode = artifactModeForStartExport(options.exportMode);
  const savedAt = options.savedAt;
  const customTitle = normalizeUrlFirstCustomTitle(options.customTitle);
  const markdownExport = {
    filename: result.preview.markdownFilename ?? `${result.flowMapId ?? result.flowSlug ?? 'url-first-flow'}-flow.md`,
    content: buildUrlFirstStartMarkdown(result, startDate, customTitle ? { title: customTitle } : {}),
  };

  if (result.flowMapId) {
    const publishPackage = sourceBackedStartPackage;
    if (!publishPackage) {
      return buildUrlFirstBlockedStartPackage(result, '연결된 Flow Map을 찾을 수 없습니다.');
    }

    const stepSelection = getUrlFirstMapStepSelection(publishPackage, options.includedStepIds);
    if (stepSelection.allStepIds.length > 0 && stepSelection.selectedStepIds.size === 0) {
      return buildUrlFirstBlockedStartPackage(result, '최소 1개 Step은 포함해야 저장할 수 있습니다.');
    }
    const markdownRows = publishPackage.public.childFlows
      .flatMap((flow) => flow.steps)
      .filter((step) => stepSelection.selectedStepIds.has(step.id))
      .map((step) => `- [ ] ${step.title}`);
    const savedMapSnapshotBase = buildSourceBackedFlowMapSavedSnapshot(result.flowMapId, {
      ...(savedAt ? { savedAt } : {}),
      anchor: startDate,
    });
    const persistenceRecordBase = buildSourceBackedFlowMapPersistenceRecord(result.flowMapId, {
      ...(savedAt ? { savedAt } : {}),
      anchor: startDate,
    });
    const isPersonalizedStart =
      Boolean(customTitle && customTitle !== (savedMapSnapshotBase?.title ?? result.title)) ||
      (options.includedStepIds !== undefined && stepSelection.selectedStepIds.size !== stepSelection.allStepIds.length);
    const savedMapSnapshot = savedMapSnapshotBase
      ? customizeUrlFirstSavedMapSnapshot(savedMapSnapshotBase, {
          ...(customTitle ? { title: customTitle } : {}),
          selectedFlowSlugs: stepSelection.selectedFlowSlugs,
          stepCountsByFlow: stepSelection.stepCountsByFlow,
          includedStepIdsByFlow: stepSelection.includedStepIdsByFlow,
          excludedStepIdsByFlow: stepSelection.excludedStepIdsByFlow,
          personalize: isPersonalizedStart,
        })
      : undefined;
    const persistenceRecord = persistenceRecordBase
      ? customizeUrlFirstPersistenceRecord(persistenceRecordBase, {
          ...(customTitle ? { title: customTitle } : {}),
          selectedStepIds: stepSelection.selectedStepIds,
        })
      : undefined;
    const mapMarkdownExport = {
      ...markdownExport,
      content: buildUrlFirstStartMarkdown(result, startDate, {
        ...(customTitle ? { title: customTitle } : {}),
        ...(markdownRows.length > 0 ? { rows: markdownRows } : {}),
      }),
    };

    return {
      status: 'ready',
      canSaveToMyFlow: true,
      startDate,
      exportMode: options.exportMode,
      targetHref: `/my?savedMap=${encodeURIComponent(result.flowMapId)}`,
      flowMapId: result.flowMapId,
      ...(result.flowSlug ? { flowSlug: result.flowSlug } : {}),
      savedFlows: stepSelection.selectedFlowSlugs.map((slug) => ({
        slug,
        selectedArtifactMode,
        anchor: startDate,
      })),
      ...(savedMapSnapshot ? { savedMapSnapshot } : {}),
      ...(persistenceRecord ? { persistenceRecord } : {}),
      ...(Object.keys(stepSelection.itemStatesByFlowSlug).length > 0 ? { itemStatesByFlowSlug: stepSelection.itemStatesByFlowSlug } : {}),
      markdownExport: mapMarkdownExport,
    };
  }

  if (result.flowSlug) {
    return {
      status: 'ready',
      canSaveToMyFlow: true,
      startDate,
      exportMode: options.exportMode,
      targetHref: '/my',
      flowSlug: result.flowSlug,
      savedFlows: [
        {
          slug: result.flowSlug,
          selectedArtifactMode,
          anchor: startDate,
        },
      ],
      markdownExport,
    };
  }

  return buildUrlFirstBlockedStartPackage(result, '저장할 Flow를 찾을 수 없습니다.');
}
