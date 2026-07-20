import assert from 'node:assert/strict';
import test from 'node:test';
import { lookupUrlFirstP0Input } from './url-first-lookup';
import {
  buildMemoDraftItemSuggestions,
  buildUrlFirstDraftItemSuggestions,
  buildUrlFirstSupplyCandidateProductionMarkdown,
  buildUrlFirstSupplyCandidateUserSummaryMarkdown,
  buildUrlFirstSupplyCandidate,
  getUrlFirstSupplyCandidateAvailability,
  mergeDraftItemSuggestions,
  normalizeUrlFirstSupplyCandidates,
  recordUrlFirstSupplyCandidateLookup,
  removeUrlFirstSupplyCandidate,
  splitUserAuthoredDraftPhrases,
  splitDraftItemSuggestion,
  updateUrlFirstSupplyCandidate,
  upsertUrlFirstSupplyCandidate,
  URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY,
} from './url-first-supply-queue';

test('memo draft suggestions use only user-written sentences and stay editable', () => {
  const suggestions = buildMemoDraftItemSuggestions('이사 견적을 비교한다. 관리사무소에 연락한다. 주소 변경 대상을 확인한다.');

  assert.equal(suggestions.length, 3);
  assert.deepEqual(suggestions.map((item) => item.dayOffset), [0, 1, 2]);
  assert.match(suggestions[0].title, /이사 견적/);
  assert.match(suggestions[1].title, /관리사무소/);
  assert.ok(suggestions.every((item) => item.title.endsWith('하기')));
  assert.ok(suggestions.every((item) => !item.title.includes('한다 정리하기')));
  assert.deepEqual(suggestions.map((item) => item.sourceText), [
    '이사 견적을 비교한다',
    '관리사무소에 연락한다',
    '주소 변경 대상을 확인한다',
  ]);
  assert.equal(new Set(suggestions.map((item) => item.id)).size, suggestions.length);
  assert.ok(suggestions.every((item) => item.memo === '' && item.needsReview === false));
  assert.ok(suggestions.every((item) => !/AI|자동 생성|sourceTrace|Step|Item/.test(`${item.title} ${item.memo}`)));
});

test('memo draft parsing never fills a sparse memo with generic tasks', () => {
  const suggestions = buildMemoDraftItemSuggestions('관리사무소에 연락한다.');

  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.title, '관리사무소에 연락하기');
  assert.ok(suggestions.every((item) => !/범위 정하기|실행할 순서|첫 행동/u.test(item.title)));
});

test('memo draft parser splits only unambiguous Korean action lists', () => {
  assert.deepEqual(
    splitUserAuthoredDraftPhrases('이사 견적 비교, 관리사무소 연락, 주소 변경 확인'),
    ['이사 견적 비교', '관리사무소 연락', '주소 변경 확인'],
  );
  assert.deepEqual(
    splitUserAuthoredDraftPhrases('여권, 지갑, 우산 챙기기'),
    ['여권, 지갑, 우산 챙기기'],
  );
});

test('memo draft parser separates a topic from a mixed Korean action list without inventing content', () => {
  const memo = '8월 제주 여행 준비. 항공권 확인, 숙소 예약번호 정리, 렌터카 예약, 준비물 체크, 출발 전날 온라인 체크인';
  const suggestions = buildMemoDraftItemSuggestions(memo);
  const secondPass = buildMemoDraftItemSuggestions(memo);

  assert.equal(suggestions.length, 5);
  assert.deepEqual(suggestions.map((item) => item.sourceText), [
    '항공권 확인',
    '숙소 예약번호 정리',
    '렌터카 예약',
    '준비물 체크',
    '출발 전날 온라인 체크인',
  ]);
  assert.ok(suggestions.every((item) => item.sourceFragmentText.includes('항공권 확인')));
  assert.equal(new Set(suggestions.flatMap((item) => item.sourceFragmentIds)).size, 1);
  assert.deepEqual(suggestions.map((item) => item.id), secondPass.map((item) => item.id));
  assert.ok(suggestions.every((item) => !item.title.includes('8월 제주 여행 준비')));
});

test('draft review split and merge preserve source fragment ownership with deterministic IDs', () => {
  const [first, second] = buildMemoDraftItemSuggestions('항공권 확인. 숙소 예약번호 정리.');
  const merged = mergeDraftItemSuggestions(first, second);
  const mergedAgain = mergeDraftItemSuggestions(first, second);
  const split = splitDraftItemSuggestion(merged, ['항공권 다시 확인', '숙소 예약번호 다시 정리']);
  const splitAgain = splitDraftItemSuggestion(merged, ['항공권 다시 확인', '숙소 예약번호 다시 정리']);

  assert.deepEqual(merged.sourceFragmentIds, [...first.sourceFragmentIds, ...second.sourceFragmentIds]);
  assert.equal(merged.id, mergedAgain.id);
  assert.equal(split.length, 2);
  assert.ok(split.every((item) => item.sourceFragmentIds.length === 2));
  assert.deepEqual(split.map((item) => item.id), splitAgain.map((item) => item.id));
  assert.equal(new Set(split.map((item) => item.id)).size, 2);
});

test('memo draft parser excludes known application state copy from executable titles', () => {
  assert.deepEqual(buildMemoDraftItemSuggestions('바로 시작할 Flow를 찾지 못했어요.'), []);
  assert.deepEqual(buildMemoDraftItemSuggestions('Flow를 불러오는 중입니다.'), []);
});

test('URL-first draft suggestions map only user-authored desired-result phrases', () => {
  const candidate = {
    canonicalUrl: 'https://example.com/moving-plan',
    originalUrl: 'https://example.com/moving-plan?utm_source=user',
    title: '이사 준비 체크리스트',
    memo: '전입신고 준비. 업체 견적 비교하고 싶음\n짐 정리 순서 정하기',
    status: 'miss_request' as const,
    savedAt: '2026-07-10T12:00:00.000Z',
  };

  const suggestions = buildUrlFirstDraftItemSuggestions(candidate);

  assert.equal(suggestions.length, 3);
  assert.deepEqual(suggestions.map((suggestion) => suggestion.dayOffset), [0, 1, 2]);
  assert.ok(suggestions.some((suggestion) => suggestion.title === '전입신고 준비하기'));
  assert.ok(suggestions.some((suggestion) => suggestion.title === '업체 견적 비교하기'));
  assert.ok(suggestions.some((suggestion) => suggestion.title === '짐 정리 순서 정하기'));
  assert.ok(suggestions.every((suggestion) => suggestion.needsReview));
  assert.ok(suggestions.every((suggestion) => !/범위 정하기|실행 순서를 기준일/u.test(suggestion.title)));
});

test('URL-first draft suggestions keep a sparse request honest instead of filling a minimum count', () => {
  const candidate = {
    canonicalUrl: 'https://example.com/weekend',
    originalUrl: 'https://example.com/weekend',
    title: '주말 준비 초안 요청',
    memo: '',
    status: 'miss_request' as const,
    savedAt: '2026-07-10T12:00:00.000Z',
  };

  const suggestions = buildUrlFirstDraftItemSuggestions(candidate);

  assert.equal(suggestions.length, 1);
  assert.deepEqual(suggestions.map((suggestion) => suggestion.dayOffset), [0]);
  assert.ok(suggestions.every((suggestion) => suggestion.title.length > 0 && suggestion.sourceText.length > 0));
  assert.equal(suggestions[0]?.sourceText, '주말 준비');
});

test('miss URL lookup can be saved as a local production candidate request', () => {
  const result = lookupUrlFirstP0Input('https://example.com/some-plan?utm_source=newsletter');
  const candidate = buildUrlFirstSupplyCandidate(result, {
    title: '예시 준비 체크리스트',
    memo: '블로그에서 따라 하고 싶은 단계가 있어서 Flow 후보로 남김',
    savedAt: '2026-07-05T06:30:00.000Z',
  });

  assert.equal(candidate?.status, 'miss_request');
  assert.equal(candidate?.canonicalUrl, 'https://example.com/some-plan');
  assert.equal(candidate?.originalUrl, 'https://example.com/some-plan?utm_source=newsletter');
  assert.equal(candidate?.title, '예시 준비 체크리스트');
  assert.equal(candidate?.memo, '블로그에서 따라 하고 싶은 단계가 있어서 Flow 후보로 남김');
  assert.equal(candidate?.savedAt, '2026-07-05T06:30:00.000Z');
});

test('miss URL draft requires a user-authored title or desired result', () => {
  const result = lookupUrlFirstP0Input('https://example.com/empty-draft');

  assert.equal(buildUrlFirstSupplyCandidate(result, { title: '   ', memo: '\n' }), undefined);

  const memoOnly = buildUrlFirstSupplyCandidate(result, {
    memo: '여행 전에 여권과 환전 준비를 확인하고 싶어요.',
    savedAt: '2026-07-14T02:00:00.000Z',
  });
  assert.equal(memoOnly?.title, '여행 전에 여권과 환전 준비를 확인하고 싶어요');
  assert.equal(memoOnly?.memo, '여행 전에 여권과 환전 준비를 확인하고 싶어요.');
  assert.notEqual(memoOnly?.title, result.title);
});

test('needs_review lookup can be saved as a non-executable production candidate request', () => {
  const result = lookupUrlFirstP0Input('https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');
  const candidate = buildUrlFirstSupplyCandidate(result, {
    title: '자동차검사 준비 보강 요청',
    memo: '미리보기는 되지만 원문 확인 후 실행 가능하게 만들 후보',
    savedAt: '2026-07-05T06:31:00.000Z',
  });

  assert.equal(candidate?.status, 'needs_review_request');
  assert.equal(candidate?.canonicalUrl, 'https://flowme.local/f/vehicle-inspection-prep');
  assert.equal(candidate?.originalUrl, 'https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');
  assert.equal(candidate?.title, '자동차검사 준비 보강 요청');
  assert.equal(candidate?.memo, '미리보기는 되지만 원문 확인 후 실행 가능하게 만들 후보');
});

test('canonical duplicate candidate requests keep one existing record', () => {
  const first = buildUrlFirstSupplyCandidate(lookupUrlFirstP0Input('https://example.com/some-plan?utm_source=newsletter'), {
    title: '처음 저장한 후보',
    memo: '첫 메모',
    savedAt: '2026-07-05T06:30:00.000Z',
  });
  const duplicate = buildUrlFirstSupplyCandidate(lookupUrlFirstP0Input('https://example.com/some-plan?utm_campaign=again'), {
    title: '두 번째 저장 시도',
    memo: '덮어쓰지 않아야 함',
    savedAt: '2026-07-05T06:40:00.000Z',
  });

  assert.ok(first);
  assert.ok(duplicate);
  const firstUpsert = upsertUrlFirstSupplyCandidate([], first);
  const duplicateUpsert = upsertUrlFirstSupplyCandidate(firstUpsert.candidates, duplicate);

  assert.equal(firstUpsert.created, true);
  assert.equal(duplicateUpsert.created, false);
  assert.equal(duplicateUpsert.candidates.length, 1);
  assert.equal(duplicateUpsert.candidate.title, '처음 저장한 후보');
  assert.equal(duplicateUpsert.candidate.savedAt, '2026-07-05T06:30:00.000Z');
});

test('candidate queue normalization drops malformed rows and dedupes canonical URLs', () => {
  const normalized = normalizeUrlFirstSupplyCandidates([
    {
      canonicalUrl: 'https://example.com/some-plan',
      originalUrl: 'https://example.com/some-plan?utm_source=a',
      title: '정상 후보',
      memo: '메모',
      status: 'miss_request',
      savedAt: '2026-07-05T06:30:00.000Z',
    },
    {
      canonicalUrl: 'https://example.com/some-plan',
      originalUrl: 'https://example.com/some-plan?utm_source=b',
      title: '중복 후보',
      memo: '중복',
      status: 'miss_request',
      savedAt: '2026-07-05T06:35:00.000Z',
    },
    {
      canonicalUrl: '',
      originalUrl: 'https://example.com/bad',
      title: '잘못된 후보',
      memo: '',
      status: 'miss_request',
      savedAt: '2026-07-05T06:36:00.000Z',
    },
    {
      canonicalUrl: 'https://example.com/wrong-status',
      originalUrl: 'https://example.com/wrong-status',
      title: '잘못된 상태',
      memo: '',
      status: 'hit',
      savedAt: '2026-07-05T06:37:00.000Z',
    },
  ]);

  assert.equal(URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY, 'flow:url-first:supply-candidates');
  assert.equal(normalized.length, 1);
  assert.equal(normalized[0].title, '정상 후보');
});
test('candidate title and memo can be edited without changing request identity', () => {
  const candidate = {
    canonicalUrl: 'https://example.com/some-plan',
    originalUrl: 'https://example.com/some-plan?utm_source=original',
    title: 'Original request',
    memo: 'Original memo',
    status: 'miss_request' as const,
    savedAt: '2026-07-05T06:30:00.000Z',
  };

  const updated = updateUrlFirstSupplyCandidate([candidate], 'https://example.com/some-plan', {
    title: 'Updated request',
    memo: 'Updated memo',
  });

  assert.equal(updated.updated, true);
  assert.equal(updated.candidates.length, 1);
  assert.equal(updated.candidate?.canonicalUrl, 'https://example.com/some-plan');
  assert.equal(updated.candidate?.originalUrl, 'https://example.com/some-plan?utm_source=original');
  assert.equal(updated.candidate?.title, 'Updated request');
  assert.equal(updated.candidate?.memo, 'Updated memo');
  assert.equal(updated.candidate?.status, 'miss_request');
  assert.equal(updated.candidate?.savedAt, '2026-07-05T06:30:00.000Z');
});

test('candidate can be removed by canonical URL', () => {
  const candidates = [
    {
      canonicalUrl: 'https://example.com/remove-me',
      originalUrl: 'https://example.com/remove-me?utm_source=a',
      title: 'Remove me',
      memo: '',
      status: 'miss_request' as const,
      savedAt: '2026-07-05T06:30:00.000Z',
    },
    {
      canonicalUrl: 'https://example.com/keep-me',
      originalUrl: 'https://example.com/keep-me',
      title: 'Keep me',
      memo: '',
      status: 'needs_review_request' as const,
      savedAt: '2026-07-05T06:31:00.000Z',
    },
  ];

  const removed = removeUrlFirstSupplyCandidate(candidates, 'https://example.com/remove-me');

  assert.equal(removed.removed, true);
  assert.equal(removed.candidates.length, 1);
  assert.equal(removed.candidates[0].canonicalUrl, 'https://example.com/keep-me');
});

test('candidate availability detects when the canonical URL now resolves to an executable hit', () => {
  const candidate = {
    canonicalUrl: 'https://mathbang.net/13',
    originalUrl: 'https://mathbang.net/13?utm_source=old-request',
    title: 'Old math request',
    memo: 'Saved before this URL had a Flow',
    status: 'miss_request' as const,
    savedAt: '2026-07-05T06:30:00.000Z',
  };

  const availability = getUrlFirstSupplyCandidateAvailability(candidate);

  assert.equal(availability.state, 'executable');
  assert.equal(availability.lookup.status, 'hit');
  assert.equal(availability.lookup.canSaveToMyFlow, true);
  assert.equal(availability.lookup.flowMapId, 'middle-school-math-1');
});

test('manual registered production candidate resolves to lookup hit and startable Flow', () => {
  const candidate = {
    canonicalUrl: 'https://www.samsungsvc.co.kr/solution/28524',
    originalUrl: 'https://www.samsungsvc.co.kr/solution/28524?utm_source=user',
    title: 'Samsung aircon filter candidate',
    memo: 'Move a two-week cleaning routine into Flow after a human seed registration.',
    status: 'miss_request' as const,
    savedAt: '2026-07-05T08:30:00.000Z',
  };

  const availability = getUrlFirstSupplyCandidateAvailability(candidate);

  assert.equal(availability.state, 'executable');
  assert.equal(availability.lookup.status, 'hit');
  assert.equal(availability.lookup.canSaveToMyFlow, true);
  assert.equal(availability.lookup.flowMapId, 'aircon-filter-cleaning');

  const recorded = recordUrlFirstSupplyCandidateLookup(
    [candidate],
    candidate.canonicalUrl,
    availability.lookup,
    '2026-07-05T09:00:00.000Z',
  );

  assert.equal(recorded.updated, true);
  assert.equal(recorded.candidate?.canonicalUrl, candidate.canonicalUrl);
  assert.equal(recorded.candidate?.originalUrl, candidate.originalUrl);
  assert.equal(recorded.candidate?.status, 'miss_request');
  assert.equal(recorded.candidate?.lastLookup?.status, 'hit');
  assert.equal(recorded.candidate?.lastLookup?.flowMapId, 'aircon-filter-cleaning');

  const markdown = buildUrlFirstSupplyCandidateProductionMarkdown(recorded.candidate!);
  assert.match(markdown, /Canonical URL: https:\/\/www\.samsungsvc\.co\.kr\/solution\/28524/);
  assert.match(markdown, /Samsung aircon filter candidate/);
  assert.match(markdown, /hit, 2026-07-05T09:00:00.000Z, aircon-filter-cleaning/);
});

test('candidate requery records the last lookup result without changing the request identity', () => {
  const candidate = {
    canonicalUrl: 'https://mathbang.net/13',
    originalUrl: 'https://mathbang.net/13?utm_source=old-request',
    title: 'Old math request',
    memo: 'Saved before this URL had a Flow',
    status: 'miss_request' as const,
    savedAt: '2026-07-05T06:30:00.000Z',
  };

  const recorded = recordUrlFirstSupplyCandidateLookup(
    [candidate],
    candidate.canonicalUrl,
    lookupUrlFirstP0Input(candidate.canonicalUrl),
    '2026-07-05T07:00:00.000Z',
  );

  assert.equal(recorded.updated, true);
  assert.equal(recorded.candidate?.canonicalUrl, candidate.canonicalUrl);
  assert.equal(recorded.candidate?.originalUrl, candidate.originalUrl);
  assert.equal(recorded.candidate?.status, 'miss_request');
  assert.equal(recorded.candidate?.lastLookup?.status, 'hit');
  assert.equal(recorded.candidate?.lastLookup?.checkedAt, '2026-07-05T07:00:00.000Z');
  assert.equal(recorded.candidate?.lastLookup?.canSaveToMyFlow, true);
  assert.equal(recorded.candidate?.lastLookup?.flowMapId, 'middle-school-math-1');
});

test('candidate production markdown packages source request, status, last lookup, and manual checklist', () => {
  const candidate = {
    canonicalUrl: 'https://example.com/procedure',
    originalUrl: 'https://example.com/procedure?utm_source=user',
    title: '따라 하고 싶은 절차',
    memo: '가볍게 따라 하고 싶은 루틴',
    status: 'miss_request' as const,
    savedAt: '2026-07-05T06:30:00.000Z',
  };

  const markdown = buildUrlFirstSupplyCandidateProductionMarkdown(candidate);

  assert.match(markdown, /^# Flow 제작 후보 handoff/m);
  assert.match(markdown, /Canonical URL: https:\/\/example\.com\/procedure/);
  assert.match(markdown, /Original URL: https:\/\/example\.com\/procedure\?utm_source=user/);
  assert.match(markdown, /요청 상태: 제작 대기/);
  assert.match(markdown, /현재 조회 상태: 제작 대기/);
  assert.match(markdown, /마지막 다시 조회: 아직 없음/);
  assert.match(markdown, /AI\/크롤링: 사용하지 않음/);
  assert.match(markdown, /- \[ \] 원문이 계획\/절차형 콘텐츠인지 확인/);
  assert.match(markdown, /- \[ \] 날짜\/상대일\/반복 규칙이 있는지 확인/);
  assert.match(markdown, /- \[ \] Step으로 나눌 수 있는 실행 단위인지 확인/);
  assert.match(markdown, /- \[ \] sourceTrace에 남길 출처\/근거를 분리/);
  assert.match(markdown, /- \[ \] 실행 불가\/위험\/민감 콘텐츠 여부 확인/);
  assert.match(markdown, /가볍게 따라 하고 싶은 루틴/);
});

test('candidate user summary markdown omits production-only handoff wording', () => {
  const candidate = {
    canonicalUrl: 'https://example.com/procedure',
    originalUrl: 'https://example.com/procedure?utm_source=user',
    title: '따라 하고 싶은 신차 인수 체크',
    memo: '가볍게 따라 하고 싶은 루틴',
    status: 'miss_request' as const,
    savedAt: '2026-07-05T06:30:00.000Z',
    lastLookup: {
      status: 'miss' as const,
      title: '아직 Flow화되지 않은 URL입니다',
      checkedAt: '2026-07-05T07:00:00.000Z',
      canSaveToMyFlow: false,
    },
  };

  const markdown = buildUrlFirstSupplyCandidateUserSummaryMarkdown(candidate);

  assert.match(markdown, /^# 초안 요청 정리본/m);
  assert.match(markdown, /원문 링크: https:\/\/example\.com\/procedure\?utm_source=user/);
  assert.match(markdown, /요청 제목: 따라 하고 싶은 신차 인수 체크/);
  assert.match(markdown, /요청 메모: 가볍게 따라 하고 싶은 루틴/);
  assert.match(markdown, /저장일: 7월 5일/);
  assert.match(markdown, /현재 상태: 아직 바로 시작할 Flow가 없어 초안 요청으로 보관했어요\./);
  assert.match(markdown, /마지막 확인: 7월 5일 · 아직 준비 전이에요/);
  assert.match(markdown, /초안이 준비되면 제목, 날짜, 메모를 손본 뒤 내 Flow와 캘린더로 이어갈 수 있어요\./);
  assert.doesNotMatch(markdown, /handoff/i);
  assert.doesNotMatch(markdown, /Canonical URL/i);
  assert.doesNotMatch(markdown, /Original URL/i);
  assert.doesNotMatch(markdown, /\bStep\b/i);
  assert.doesNotMatch(markdown, /\bItem\b/i);
  assert.doesNotMatch(markdown, /sourceTrace/);
  assert.doesNotMatch(markdown, /source-backed/i);
  assert.doesNotMatch(markdown, /20\d{2}-\d{2}-\d{2}/);
});

test('resolved candidate production markdown prioritizes existing hit flow over new production', () => {
  const candidate = {
    canonicalUrl: 'https://mathbang.net/13',
    originalUrl: 'https://mathbang.net/13?utm_source=old-request',
    title: '이제 변환된 수학 후보',
    memo: '예전에는 miss였던 후보',
    status: 'miss_request' as const,
    savedAt: '2026-07-05T06:30:00.000Z',
    lastLookup: {
      status: 'hit' as const,
      title: '이미 만들어진 Flow가 있어요',
      checkedAt: '2026-07-05T07:00:00.000Z',
      canSaveToMyFlow: true,
      flowMapId: 'middle-school-math-1',
      routeHref: '/flow-maps/middle-school-math-1',
    },
  };

  const markdown = buildUrlFirstSupplyCandidateProductionMarkdown(candidate);

  assert.match(markdown, /현재 조회 상태: 이제 실행 가능/);
  assert.match(markdown, /마지막 다시 조회: hit, 2026-07-05T07:00:00.000Z, middle-school-math-1/);
  assert.match(markdown, /이미 실행 가능한 Flow가 있으므로 새 제작보다 기존 hit 시작 흐름을 우선합니다\./);
});
