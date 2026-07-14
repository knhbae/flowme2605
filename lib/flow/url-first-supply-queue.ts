import { formatKoreanShortDate } from './date';
import { lookupUrlFirstP0Input, type UrlFirstLookupResult } from './url-first-lookup';

export const URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY = 'flow:url-first:supply-candidates';

export type UrlFirstSupplyCandidateStatus = 'miss_request' | 'needs_review_request';
export type UrlFirstSupplyCandidateLastLookupStatus = UrlFirstLookupResult['status'];

export type UrlFirstSupplyCandidateLastLookup = {
  status: UrlFirstSupplyCandidateLastLookupStatus;
  title: string;
  checkedAt: string;
  canSaveToMyFlow: boolean;
  flowMapId?: string;
  flowSlug?: string;
  routeHref?: string;
};

export type UrlFirstSupplyCandidate = {
  canonicalUrl: string;
  originalUrl: string;
  title: string;
  memo: string;
  status: UrlFirstSupplyCandidateStatus;
  savedAt: string;
  lastLookup?: UrlFirstSupplyCandidateLastLookup;
};

export type UrlFirstSupplyCandidateInput = {
  title?: string;
  memo?: string;
  savedAt?: string;
};

export type UrlFirstSupplyCandidateUpdateInput = {
  title?: string;
  memo?: string;
};

export type UrlFirstSupplyCandidateUpsertResult = {
  candidate: UrlFirstSupplyCandidate;
  candidates: UrlFirstSupplyCandidate[];
  created: boolean;
};

export type UrlFirstSupplyCandidateUpdateResult = {
  candidate?: UrlFirstSupplyCandidate;
  candidates: UrlFirstSupplyCandidate[];
  updated: boolean;
};

export type UrlFirstSupplyCandidateRemoveResult = {
  candidates: UrlFirstSupplyCandidate[];
  removed: boolean;
};

export type UrlFirstSupplyCandidateAvailabilityState = 'executable' | 'needs_review' | 'missing';

export type UrlFirstSupplyCandidateAvailability = {
  state: UrlFirstSupplyCandidateAvailabilityState;
  lookup: UrlFirstLookupResult;
};

export type UrlFirstDraftItemSuggestion = {
  title: string;
  memo: string;
  dayOffset: number;
};

export const URL_FIRST_SUPPLY_CANDIDATE_PRODUCTION_CHECKLIST = [
  '원문이 계획/절차형 콘텐츠인지 확인',
  '날짜/상대일/반복 규칙이 있는지 확인',
  'Step으로 나눌 수 있는 실행 단위인지 확인',
  'sourceTrace에 남길 출처/근거를 분리',
  '실행 불가/위험/민감 콘텐츠 여부 확인',
] as const;

function clean(value?: string): string {
  return (value ?? '').trim();
}

function getMemoBasedCandidateTitle(value: string): string {
  const firstThought = splitUrlFirstDraftRequestLines(value)[0] ?? clean(value);
  if (firstThought.length <= 60) return firstThought;
  return `${firstThought.slice(0, 57).trimEnd()}...`;
}

function getUrlFirstDraftTopic(candidate: UrlFirstSupplyCandidate): string {
  const title = clean(candidate.title)
    .replace(/(?:초안\s*)?요청$/u, '')
    .replace(/체크리스트$/u, '')
    .replace(/^새로\s+보고\s+싶은\s*/u, '')
    .trim();
  return title.length >= 2 ? title : '이번 준비';
}

function splitUrlFirstDraftRequestLines(value: string): string[] {
  return value
    .replace(/\r/gu, '\n')
    .split(/\n+|[.!?;]+|\s*(?:→|->)\s*/u)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/u, '').replace(/\s+/gu, ' ').trim())
    .filter((line) => line.length >= 2);
}

function toUrlFirstDraftActionTitle(value: string): string {
  const text = value
    .replace(/https?:\/\/\S+/giu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/고\s*싶(?:어요|습니다|음)$/u, '기')
    .replace(/해야\s*(?:해요|합니다|함)$/u, '하기')
    .replace(/해\s*주세요$/u, '하기')
    .replace(/한다$/u, '하기');
  if (!text) return '';
  if (/(?:기|하기|보기|두기|정하기|고르기|나누기|적기|챙기기|확인하기)$/u.test(text)) return text;
  if (/(?:확인|정리|비교|준비|선택|점검|기록|실행|완료)$/u.test(text)) return `${text}하기`;
  return `${text} 정리하기`;
}

export function buildUrlFirstDraftItemSuggestions(candidate: UrlFirstSupplyCandidate): UrlFirstDraftItemSuggestion[] {
  const topic = getUrlFirstDraftTopic(candidate);
  const suggestions: Omit<UrlFirstDraftItemSuggestion, 'dayOffset'>[] = [];
  const seen = new Set<string>();
  const addSuggestion = (title: string, memo: string) => {
    const normalizedTitle = clean(title);
    if (!normalizedTitle || seen.has(normalizedTitle) || suggestions.length >= 7) return;
    seen.add(normalizedTitle);
    suggestions.push({ title: normalizedTitle, memo });
  };

  addSuggestion(`${topic} 범위 정하기`, '내가 쓴 제목에서 제안한 항목입니다. 저장 후 제목과 메모를 다시 바꿀 수 있어요.');
  splitUrlFirstDraftRequestLines(candidate.memo).slice(0, 5).forEach((line) => {
    const actionTitle = toUrlFirstDraftActionTitle(line);
    if (actionTitle) addSuggestion(actionTitle, '내가 남긴 메모에서 제안한 항목입니다.');
  });
  if (suggestions.length < 2) {
    addSuggestion('원문에서 꼭 따라 할 내용 고르기', '원문 링크를 열어 실제로 필요한 내용만 남겨보세요.');
  }
  addSuggestion(`${topic} 실행 순서를 기준일에 맞춰 나누기`, '기준일을 바꾸면 따로 조정하지 않은 날짜가 함께 다시 맞춰집니다.');

  while (suggestions.length < 3) {
    addSuggestion(`${topic} 첫 행동 시작하기`, '저장 후 My Flow에서 날짜와 메모를 내 상황에 맞게 손볼 수 있어요.');
  }

  return suggestions.map((suggestion, dayOffset) => ({ ...suggestion, dayOffset }));
}

export function buildMemoDraftItemSuggestions(input: string): UrlFirstDraftItemSuggestion[] {
  const suggestions: Omit<UrlFirstDraftItemSuggestion, 'dayOffset'>[] = [];
  const seen = new Set<string>();
  const addSuggestion = (title: string, memo: string) => {
    const normalizedTitle = clean(title);
    if (!normalizedTitle || seen.has(normalizedTitle) || suggestions.length >= 7) return;
    seen.add(normalizedTitle);
    suggestions.push({ title: normalizedTitle, memo });
  };

  splitUrlFirstDraftRequestLines(input).slice(0, 6).forEach((line) => {
    const actionTitle = toUrlFirstDraftActionTitle(line);
    if (actionTitle) addSuggestion(actionTitle, '내가 붙여넣은 메모에서 나눈 할 일입니다.');
  });
  if (suggestions.length < 2) {
    addSuggestion('이번 준비의 범위 정하기', '메모에서 이번에 실제로 할 부분만 남겨보세요.');
  }
  addSuggestion('할 일을 실행할 순서 정하기', '저장 후 날짜와 순서를 내 상황에 맞게 다시 바꿀 수 있어요.');

  while (suggestions.length < 3) {
    addSuggestion('첫 행동 시작하기', '저장 후 My Flow에서 제목과 메모를 다시 손볼 수 있어요.');
  }

  return suggestions.map((suggestion, dayOffset) => ({ ...suggestion, dayOffset }));
}

function getCandidateStatus(result: UrlFirstLookupResult): UrlFirstSupplyCandidateStatus | undefined {
  if (result.status === 'miss') return 'miss_request';
  if (result.status === 'needs_review') return 'needs_review_request';
  return undefined;
}

function isCandidateStatus(value: unknown): value is UrlFirstSupplyCandidateStatus {
  return value === 'miss_request' || value === 'needs_review_request';
}

function isLastLookupStatus(value: unknown): value is UrlFirstSupplyCandidateLastLookupStatus {
  return value === 'hit' || value === 'needs_review' || value === 'miss' || value === 'memo_draft';
}

function normalizeLastLookup(value: unknown): UrlFirstSupplyCandidateLastLookup | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const lookup = value as Partial<UrlFirstSupplyCandidateLastLookup>;
  const title = clean(lookup.title);
  const checkedAt = clean(lookup.checkedAt);
  if (!isLastLookupStatus(lookup.status) || !title || !checkedAt || typeof lookup.canSaveToMyFlow !== 'boolean') return undefined;

  return {
    status: lookup.status,
    title,
    checkedAt,
    canSaveToMyFlow: lookup.canSaveToMyFlow,
    ...(clean(lookup.flowMapId) ? { flowMapId: clean(lookup.flowMapId) } : {}),
    ...(clean(lookup.flowSlug) ? { flowSlug: clean(lookup.flowSlug) } : {}),
    ...(clean(lookup.routeHref) ? { routeHref: clean(lookup.routeHref) } : {}),
  };
}

function normalizeCandidate(value: unknown): UrlFirstSupplyCandidate | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Partial<UrlFirstSupplyCandidate>;
  const canonicalUrl = clean(candidate.canonicalUrl);
  const originalUrl = clean(candidate.originalUrl);
  const title = clean(candidate.title);
  const savedAt = clean(candidate.savedAt);
  if (!canonicalUrl || !originalUrl || !title || !savedAt || !isCandidateStatus(candidate.status)) return undefined;

  return {
    canonicalUrl,
    originalUrl,
    title,
    memo: clean(candidate.memo),
    status: candidate.status,
    savedAt,
    ...(normalizeLastLookup(candidate.lastLookup) ? { lastLookup: normalizeLastLookup(candidate.lastLookup) } : {}),
  };
}

export function buildUrlFirstSupplyCandidate(
  result: UrlFirstLookupResult,
  input: UrlFirstSupplyCandidateInput = {},
): UrlFirstSupplyCandidate | undefined {
  const status = getCandidateStatus(result);
  const canonicalUrl = clean(result.canonicalUrl);
  if (!status || !canonicalUrl) return undefined;

  const memo = clean(input.memo);
  const title = clean(input.title) || getMemoBasedCandidateTitle(memo);
  if (!title) return undefined;
  return {
    canonicalUrl,
    originalUrl: clean(result.input) || canonicalUrl,
    title,
    memo,
    status,
    savedAt: clean(input.savedAt) || new Date().toISOString(),
  };
}

export function normalizeUrlFirstSupplyCandidates(value: unknown): UrlFirstSupplyCandidate[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const normalized: UrlFirstSupplyCandidate[] = [];

  for (const item of value) {
    const candidate = normalizeCandidate(item);
    if (!candidate || seen.has(candidate.canonicalUrl)) continue;
    seen.add(candidate.canonicalUrl);
    normalized.push(candidate);
  }

  return normalized;
}

export function upsertUrlFirstSupplyCandidate(
  current: UrlFirstSupplyCandidate[],
  nextCandidate: UrlFirstSupplyCandidate,
): UrlFirstSupplyCandidateUpsertResult {
  const candidates = normalizeUrlFirstSupplyCandidates(current);
  const existing = candidates.find((candidate) => candidate.canonicalUrl === nextCandidate.canonicalUrl);
  if (existing) {
    return {
      candidate: existing,
      candidates,
      created: false,
    };
  }

  return {
    candidate: nextCandidate,
    candidates: [nextCandidate, ...candidates],
    created: true,
  };
}

export function updateUrlFirstSupplyCandidate(
  current: UrlFirstSupplyCandidate[],
  canonicalUrl: string,
  input: UrlFirstSupplyCandidateUpdateInput,
): UrlFirstSupplyCandidateUpdateResult {
  const targetCanonicalUrl = clean(canonicalUrl);
  const candidates = normalizeUrlFirstSupplyCandidates(current);
  let updatedCandidate: UrlFirstSupplyCandidate | undefined;
  const nextCandidates = candidates.map((candidate) => {
    if (candidate.canonicalUrl !== targetCanonicalUrl) return candidate;
    updatedCandidate = {
      ...candidate,
      title: clean(input.title) || candidate.title,
      memo: input.memo === undefined ? candidate.memo : clean(input.memo),
    };
    return updatedCandidate;
  });

  return {
    candidate: updatedCandidate,
    candidates: nextCandidates,
    updated: Boolean(updatedCandidate),
  };
}

export function recordUrlFirstSupplyCandidateLookup(
  current: UrlFirstSupplyCandidate[],
  canonicalUrl: string,
  lookup: UrlFirstLookupResult,
  checkedAt = new Date().toISOString(),
): UrlFirstSupplyCandidateUpdateResult {
  const targetCanonicalUrl = clean(canonicalUrl);
  const candidates = normalizeUrlFirstSupplyCandidates(current);
  let updatedCandidate: UrlFirstSupplyCandidate | undefined;
  const lastLookup: UrlFirstSupplyCandidateLastLookup = {
    status: lookup.status,
    title: clean(lookup.title) || lookup.status,
    checkedAt,
    canSaveToMyFlow: lookup.canSaveToMyFlow,
    ...(clean(lookup.flowMapId) ? { flowMapId: clean(lookup.flowMapId) } : {}),
    ...(clean(lookup.flowSlug) ? { flowSlug: clean(lookup.flowSlug) } : {}),
    ...(clean(lookup.routeHref) ? { routeHref: clean(lookup.routeHref) } : {}),
  };
  const nextCandidates = candidates.map((candidate) => {
    if (candidate.canonicalUrl !== targetCanonicalUrl) return candidate;
    updatedCandidate = {
      ...candidate,
      lastLookup,
    };
    return updatedCandidate;
  });

  return {
    candidate: updatedCandidate,
    candidates: nextCandidates,
    updated: Boolean(updatedCandidate),
  };
}

export function removeUrlFirstSupplyCandidate(
  current: UrlFirstSupplyCandidate[],
  canonicalUrl: string,
): UrlFirstSupplyCandidateRemoveResult {
  const targetCanonicalUrl = clean(canonicalUrl);
  const candidates = normalizeUrlFirstSupplyCandidates(current);
  const nextCandidates = candidates.filter((candidate) => candidate.canonicalUrl !== targetCanonicalUrl);
  return {
    candidates: nextCandidates,
    removed: nextCandidates.length !== candidates.length,
  };
}

function getCandidateRequestLabel(candidate: UrlFirstSupplyCandidate): string {
  return candidate.status === 'needs_review_request' ? '원문 확인 대기' : '제작 대기';
}

function getAvailabilityLabel(availability: UrlFirstSupplyCandidateAvailability): string {
  if (availability.state === 'executable') return '이제 실행 가능';
  if (availability.state === 'needs_review') return '원문 확인 대기';
  return '제작 대기';
}

function getLastLookupSummary(candidate: UrlFirstSupplyCandidate): string {
  if (!candidate.lastLookup) return '아직 없음';
  const flowReference = candidate.lastLookup.flowMapId ?? candidate.lastLookup.flowSlug ?? candidate.lastLookup.routeHref;
  return [candidate.lastLookup.status, candidate.lastLookup.checkedAt, flowReference].filter(Boolean).join(', ');
}

function getUserFacingLastLookupLabel(candidate: UrlFirstSupplyCandidate): string {
  if (!candidate.lastLookup) return '아직 다시 확인하지 않았어요.';
  const statusLabel: Record<UrlFirstSupplyCandidateLastLookupStatus, string> = {
    hit: candidate.lastLookup.canSaveToMyFlow ? '시작할 수 있는 콘텐츠가 준비됐어요' : '비슷한 콘텐츠 확인이 필요해요',
    needs_review: '원문 확인이 더 필요해요',
    miss: '아직 준비 전이에요',
    memo_draft: '메모 초안으로 이어질 수 있어요',
  };
  return `${formatKoreanShortDate(candidate.lastLookup.checkedAt)} · ${statusLabel[candidate.lastLookup.status]}`;
}

function getUserFacingCandidateStatusNote(candidate: UrlFirstSupplyCandidate): string {
  const availability = getUrlFirstSupplyCandidateAvailability(candidate);
  if (availability.state === 'executable') return '같은 원문으로 바로 시작할 수 있는 Flow가 준비됐어요.';
  if (availability.state === 'needs_review') return '원문 확인이 더 필요해 초안 요청으로 보관했어요.';
  return '아직 바로 시작할 Flow가 없어 초안 요청으로 보관했어요.';
}

export function buildUrlFirstSupplyCandidateUserSummaryMarkdown(candidate: UrlFirstSupplyCandidate): string {
  const normalized = normalizeCandidate(candidate);
  if (!normalized) return '';

  return [
    '# 초안 요청 정리본',
    '',
    `- 원문 링크: ${normalized.originalUrl}`,
    `- 요청 제목: ${normalized.title}`,
    `- 요청 메모: ${normalized.memo || '없음'}`,
    `- 저장일: ${formatKoreanShortDate(normalized.savedAt)}`,
    `- 현재 상태: ${getUserFacingCandidateStatusNote(normalized)}`,
    `- 마지막 확인: ${getUserFacingLastLookupLabel(normalized)}`,
    '',
    '초안이 준비되면 제목, 날짜, 메모를 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요.',
    '',
  ].join('\n');
}

export function buildUrlFirstSupplyCandidateProductionMarkdown(candidate: UrlFirstSupplyCandidate): string {
  const normalized = normalizeCandidate(candidate);
  if (!normalized) return '';
  const availability = getUrlFirstSupplyCandidateAvailability(normalized);
  const statusNote =
    availability.state === 'executable'
      ? '이미 실행 가능한 Flow가 있으므로 새 제작보다 기존 hit 시작 흐름을 우선합니다.'
      : '아직 실행 가능한 Flow가 아니므로 사람이 원문을 확인한 뒤 Flow seed/content로 옮깁니다.';

  return [
    '# Flow 제작 후보 handoff',
    '',
    '## 후보 정보',
    `- Canonical URL: ${normalized.canonicalUrl}`,
    `- Original URL: ${normalized.originalUrl}`,
    `- 사용자 제목: ${normalized.title}`,
    `- 사용자 메모: ${normalized.memo || '없음'}`,
    `- 저장일: ${normalized.savedAt}`,
    `- 요청 상태: ${getCandidateRequestLabel(normalized)}`,
    `- 현재 조회 상태: ${getAvailabilityLabel(availability)}`,
    `- 마지막 다시 조회: ${getLastLookupSummary(normalized)}`,
    '- AI/크롤링: 사용하지 않음',
    '',
    '## 제작 전 체크리스트',
    ...URL_FIRST_SUPPLY_CANDIDATE_PRODUCTION_CHECKLIST.map((item) => `- [ ] ${item}`),
    '',
    '## 처리 메모',
    `- ${statusNote}`,
    '- 원본/source는 유지하고, 실제 Flow 제작 시 sourceTrace와 위험 경계를 별도로 기록합니다.',
    '',
  ].join('\n');
}

export function getUrlFirstSupplyCandidateAvailability(candidate: UrlFirstSupplyCandidate): UrlFirstSupplyCandidateAvailability {
  const lookup = lookupUrlFirstP0Input(candidate.canonicalUrl);
  if (lookup.status === 'hit' && lookup.canSaveToMyFlow) {
    return {
      state: 'executable',
      lookup,
    };
  }
  if (lookup.status === 'hit' || lookup.status === 'needs_review') {
    return {
      state: 'needs_review',
      lookup,
    };
  }
  return {
    state: 'missing',
    lookup,
  };
}
