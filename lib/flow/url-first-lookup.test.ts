import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AJD_MOVING_SOURCE_URL,
  buildUrlFirstStartPackage,
  buildUrlFirstMemoDraft,
  canonicalizeFlowSourceUrl,
  lookupUrlOrMemoP0Input,
  lookupUrlFirstP0Input,
} from './url-first-lookup';

test('canonical URL lookup resolves the AJD moving source to the shared 24-item public Flow without fake usage counts', () => {
  const noisyUrl = AJD_MOVING_SOURCE_URL
    .replace('https://www.ajd.co.kr', 'http://m.ajd.co.kr')
    .concat('?utm_source=blog&utm_medium=social#comment-12');

  assert.equal(canonicalizeFlowSourceUrl(noisyUrl), AJD_MOVING_SOURCE_URL);

  const result = lookupUrlFirstP0Input(noisyUrl);
  assert.equal(result.status, 'hit');
  assert.equal(result.canonicalUrl, AJD_MOVING_SOURCE_URL);
  assert.equal(result.flowMapId, undefined);
  assert.equal(result.routeHref, '/f/moving-d30-basic');
  assert.equal(result.flowSlug, 'moving-d30-basic');
  assert.equal(result.sourceStatus, 'real');
  assert.deepEqual(result.exportModes, ['calendar', 'markdown', 'checklist']);
  assert.equal(result.canSaveToMyFlow, true);
  assert.equal(result.aiGeneration.enabled, false);
  assert.equal('usageCount' in result, false);
});

test('source-backed canary URLs resolve to existing Flow Map hits', () => {
  const canaries = [
    {
      url: `${AJD_MOVING_SOURCE_URL}?utm_source=blog`,
      routeHref: '/f/moving-d30-basic',
    },
    {
      url: 'https://mathbang.net/13?utm_medium=share',
      routeHref: '/flow-maps/middle-school-math-1',
    },
    {
      url: 'https://blog.naver.com/wilklove/223518896995?utm_campaign=flow',
      routeHref: '/flow-maps/curated-wedding-checklist-family',
    },
  ];

  for (const canary of canaries) {
    const result = lookupUrlFirstP0Input(canary.url);
    assert.equal(result.status, 'hit');
    assert.equal(result.routeHref, canary.routeHref);
    assert.equal(result.canSaveToMyFlow, true);
    assert.equal(result.canExport, true);
    assert.equal(result.aiGeneration.enabled, false);
    assert.equal('usageCount' in result, false);
  }
});

test('manual production registered source-backed Flow resolves from its source URL', () => {
  const result = lookupUrlFirstP0Input('https://www.samsungsvc.co.kr/solution/28524?utm_source=user');

  assert.equal(result.status, 'hit');
  assert.equal(result.canonicalUrl, 'https://www.samsungsvc.co.kr/solution/28524');
  assert.equal(result.flowMapId, 'aircon-filter-cleaning');
  assert.equal(result.routeHref, '/flow-maps/aircon-filter-cleaning');
  assert.equal(result.canSaveToMyFlow, true);
  assert.equal(result.canExport, true);
  assert.deepEqual(result.exportModes, ['calendar', 'markdown', 'checklist']);
  assert.equal(result.aiGeneration.enabled, false);

  const started = buildUrlFirstStartPackage(result, {
    startDate: '2026-07-06',
    exportMode: 'calendar',
    savedAt: '2026-07-05T09:00:00.000Z',
  });

  assert.equal(started.status, 'ready');
  assert.equal(started.flowMapId, 'aircon-filter-cleaning');
  assert.equal(started.targetHref, '/my?savedMap=aircon-filter-cleaning');
  assert.deepEqual(
    started.savedFlows.map((flow) => flow.slug),
    ['source-backed-aircon-filter-cleaning'],
  );
  assert.ok(started.savedFlows.every((flow) => flow.anchor === '2026-07-06'));
  assert.ok(started.savedFlows.every((flow) => flow.selectedArtifactMode === 'calendar'));
  assert.equal(started.savedMapSnapshot?.anchor, '2026-07-06');
  assert.equal(started.persistenceRecord?.childFlows[0]?.steps[0]?.stepId, 'aircon-clean-repeat');
  assert.match(started.markdownExport?.content ?? '', /aircon-filter-cleaning/);
});

test('broad Funmom category URL stops at source-row review without save, export, or draft bypass', () => {
  const result = lookupUrlFirstP0Input('https://funmom.tistory.com/?utm_source=user');

  assert.equal(result.status, 'needs_review');
  assert.equal(result.canonicalUrl, 'https://funmom.tistory.com/');
  assert.equal(result.flowMapId, 'curated-funmom-learning-park');
  assert.equal(result.routeHref, '/flow-maps/curated-funmom-learning-park');
  assert.equal(result.title, '실행할 자료를 더 골라야 해요');
  assert.match(result.summary, /개별 자료와 난이도/);
  assert.equal(result.gate?.title, '실행할 자료를 더 골라야 해요');
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.canExport, false);
  assert.equal(result.saveMode, 'blocked');
  assert.deepEqual(result.preview.calendar, []);
  assert.deepEqual(result.preview.markdown, []);
  assert.match(result.preview.myFlow[0] ?? '', /개별 원문 자료/);
  assert.equal(result.aiGeneration.enabled, false);
});

test('creator infant-feeding URL stops at medical source-fit review without save, export, or draft bypass', () => {
  const result = lookupUrlFirstP0Input(
    'https://blog.naver.com/01695258757/222768860919?utm_source=user',
  );

  assert.equal(result.status, 'needs_review');
  assert.equal(result.canonicalUrl, 'https://blog.naver.com/01695258757/222768860919');
  assert.equal(result.flowMapId, 'baby-food-map');
  assert.equal(result.routeHref, '/flow-maps/baby-food-map');
  assert.equal(result.title, '아이 상태에 맞는 확인이 필요해요');
  assert.match(result.summary, /시작 시기와 메뉴를 아이 상태에 맞게/);
  assert.equal(result.gate?.kind, 'medical_source_fit');
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.canExport, false);
  assert.equal(result.saveMode, 'blocked');
  assert.deepEqual(result.preview.calendar, []);
  assert.deepEqual(result.preview.markdown, []);
  assert.match(result.preview.myFlow[0] ?? '', /민간 식단표와 현재 공식 안내/);
  assert.equal(result.aiGeneration.enabled, false);
});

test('duplicate opic source URL resolves to the curated source-backed representative only', () => {
  const result = lookupUrlFirstP0Input(
    'https://mansour.tistory.com/entry/%EC%98%A4%ED%94%BD-%EB%AA%A8%EC%9D%98%EA%B3%A0%EC%82%AC-%EA%B3%B5%EB%B6%80-%EB%B0%A9%EB%B2%95?utm_source=duplicate',
  );

  assert.equal(result.status, 'hit');
  assert.equal(result.canonicalUrl, 'https://mansour.tistory.com/entry/오픽-모의고사-공부-방법');
  assert.equal(result.flowMapId, 'curated-opic-mock-course');
  assert.equal(result.routeHref, '/flow-maps/curated-opic-mock-course');
  assert.equal(result.canSaveToMyFlow, true);
  assert.equal(result.aiGeneration.enabled, false);
});

test('duplicate new car source URL resolves to the curated source-backed representative only', () => {
  const result = lookupUrlFirstP0Input(
    'https://web.getcha.kr/blog/complete-guide-new-car-purchase-procedure-for-beginners?utm_source=duplicate',
  );

  assert.equal(result.status, 'hit');
  assert.equal(result.canonicalUrl, 'https://web.getcha.kr/blog/complete-guide-new-car-purchase-procedure-for-beginners');
  assert.equal(result.flowMapId, 'curated-new-car-purchase-guide');
  assert.equal(result.routeHref, '/flow-maps/curated-new-car-purchase-guide');
  assert.equal(result.canSaveToMyFlow, true);
  assert.equal(result.aiGeneration.enabled, false);
});

test('broad Allblanc channel source URL resolves to the curated exact-video representative only', () => {
  const result = lookupUrlFirstP0Input('https://www.youtube.com/@allblanctv?utm_source=duplicate');

  assert.equal(result.status, 'hit');
  assert.equal(result.canonicalUrl, 'https://youtube.com/@allblanctv');
  assert.equal(result.flowMapId, 'curated-allblanc-workout-park');
  assert.equal(result.routeHref, '/flow-maps/curated-allblanc-workout-park');
  assert.equal(result.canSaveToMyFlow, true);
  assert.equal(result.aiGeneration.enabled, false);
});

test('baby food source URL resolves to the held source-traced map without opening execution', () => {
  const result = lookupUrlFirstP0Input(
    'https://blog.naver.com/01695258757/222768860919?utm_source=duplicate',
  );

  assert.equal(result.status, 'needs_review');
  assert.equal(result.canonicalUrl, 'https://blog.naver.com/01695258757/222768860919');
  assert.equal(result.flowMapId, 'baby-food-map');
  assert.equal(result.routeHref, '/flow-maps/baby-food-map');
  assert.equal(result.flowSlug, 'baby-150-start');
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.canExport, false);
  assert.equal(result.gate?.kind, 'medical_source_fit');
  assert.equal(result.aiGeneration.enabled, false);
});

test('reading source URL resolves to the curated monthly routine representative only', () => {
  const result = lookupUrlFirstP0Input(
    'https://blog.naver.com/naristyle87/222978131890?utm_source=duplicate',
  );

  assert.equal(result.status, 'hit');
  assert.equal(result.canonicalUrl, 'https://blog.naver.com/naristyle87/222978131890');
  assert.equal(result.flowMapId, 'curated-reading-routine-log');
  assert.equal(result.routeHref, '/flow-maps/curated-reading-routine-log');
  assert.equal(result.flowSlug, 'curated-reading-monthly-log');
  assert.equal(result.canSaveToMyFlow, true);
  assert.equal(result.aiGeneration.enabled, false);
});

test('official child vaccination source URL resolves to a non-executable review hold', () => {
  const result = lookupUrlFirstP0Input(
    'https://khms.or.kr/healthy_life/prevention/vaccination_child?utm_source=duplicate',
  );

  assert.equal(result.status, 'needs_review');
  assert.equal(result.canonicalUrl, 'https://khms.or.kr/healthy_life/prevention/vaccination_child');
  assert.equal(result.flowMapId, 'curated-child-vaccination-schedule');
  assert.equal(result.routeHref, '/flow-maps/curated-child-vaccination-schedule');
  assert.equal(result.flowSlug, 'curated-child-vaccination-first-year');
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.canExport, false);
  assert.equal(result.saveMode, 'blocked');
  assert.deepEqual(result.preview.calendar, []);
  assert.deepEqual(result.preview.markdown, []);
  assert.equal(result.aiGeneration.enabled, false);
});

test('official baby health source URL resolves to a non-executable review hold', () => {
  const result = lookupUrlFirstP0Input(
    'https://easylaw.go.kr/CSP/CnpClsMain.laf?ccfNo=1&cciNo=2&cnpClsNo=2&csmSeq=1138&popMenu=ov',
  );

  assert.equal(result.status, 'needs_review');
  assert.equal(result.flowMapId, 'baby-health-schedule');
  assert.equal(result.routeHref, '/flow-maps/baby-health-schedule');
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.canExport, false);
  assert.equal(result.saveMode, 'blocked');
  assert.deepEqual(result.preview.calendar, []);
  assert.deepEqual(result.preview.markdown, []);
  assert.equal(result.aiGeneration.enabled, false);
});

test('dated and current NTS year-end tax URLs resolve to the same non-executable review hold', () => {
  const urls = [
    'https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?mi=6489&nttSn=1330438',
    'https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7706&mi=6646',
  ];

  for (const url of urls) {
    const result = lookupUrlFirstP0Input(`${url}&utm_source=stale-review`);
    assert.equal(result.status, 'needs_review');
    assert.equal(result.flowMapId, 'year-end-tax-submit');
    assert.equal(result.routeHref, '/flow-maps/year-end-tax-submit');
    assert.equal(result.canSaveToMyFlow, false);
    assert.equal(result.canExport, false);
    assert.equal(result.saveMode, 'blocked');
    assert.deepEqual(result.preview.calendar, []);
    assert.deepEqual(result.preview.markdown, []);
    assert.equal(result.aiGeneration.enabled, false);
  }
});

test('wedding source URL resolves to the curated checklist family representative only', () => {
  const result = lookupUrlFirstP0Input(
    'https://blog.naver.com/wilklove/223518896995?utm_source=duplicate',
  );

  assert.equal(result.status, 'hit');
  assert.equal(result.canonicalUrl, 'https://blog.naver.com/wilklove/223518896995');
  assert.equal(result.flowMapId, 'curated-wedding-checklist-family');
  assert.equal(result.routeHref, '/flow-maps/curated-wedding-checklist-family');
  assert.equal(result.flowSlug, 'curated-wedding-naver-timeline');
  assert.equal(result.canSaveToMyFlow, true);
  assert.equal(result.aiGeneration.enabled, false);
});

test('rejected source-backed registration URLs do not resolve as lookup hits', () => {
  const result = lookupUrlFirstP0Input('https://www.kisa.or.kr/1020601?utm_source=user');

  assert.equal(result.status, 'miss');
  assert.equal(result.canonicalUrl, 'https://www.kisa.or.kr/1020601');
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.aiGeneration.enabled, false);
});

test('needs_review content is preview-only and blocks export/save', () => {
  const result = lookupUrlFirstP0Input('https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');

  assert.equal(result.status, 'needs_review');
  assert.equal(result.routeHref, '/f/vehicle-inspection-prep');
  assert.equal(result.sourceStatus, 'needs_review');
  assert.deepEqual(result.exportModes, []);
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.gate?.reason, '원문 확인 전에는 캘린더 파일을 만들지 않습니다.');
  assert.equal(result.aiGeneration.enabled, false);
});

test('unknown URL stays a miss with user-facing disabled-generation copy', () => {
  const result = lookupUrlFirstP0Input('https://example.com/some-plan?utm_source=newsletter');

  assert.equal(result.status, 'miss');
  assert.equal(result.canonicalUrl, 'https://example.com/some-plan');
  assert.equal(result.sourceStatus, 'missing');
  assert.deepEqual(result.exportModes, []);
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.title, '바로 시작할 Flow를 찾지 못했어요');
  assert.equal(result.summary, '제목과 메모를 남기면 직접 손볼 수 있는 초안을 준비할 수 있어요.');
  assert.equal(result.aiGeneration.enabled, false);
  assert.match(result.aiGeneration.reason, /기존 Flow를 먼저 찾아보고/);
  assert.doesNotMatch(result.aiGeneration.reason, /\bP\d+\b/);
  assert.doesNotMatch(result.summary, /대기열|파이프라인|\bP\d+\b/);
});

test('memo draft remains private and recommends an existing moving Flow', () => {
  const result = buildUrlFirstMemoDraft('8월 말 이사 예정. 이번 주에는 견적과 관리사무소 연락을 정리하고 싶음.');

  assert.equal(result.status, 'memo_draft');
  assert.equal(result.sourceStatus, 'missing');
  assert.equal(result.canSaveToMyFlow, false);
  assert.equal(result.recommendation?.href, '/flow-maps/moving-d30');
  assert.deepEqual(result.exportModes, []);
  assert.equal(result.aiGeneration.enabled, false);
  assert.match(result.aiGeneration.reason, /자동으로 내용을 생성하지 않습니다/);
});

test('shared URL-or-memo entry keeps URLs on lookup and sends plain text to a private memo draft', () => {
  const hit = lookupUrlOrMemoP0Input('https://mathbang.net/13?utm_source=share');
  const memo = lookupUrlOrMemoP0Input('주말에 이사 견적을 비교하고 관리사무소에 연락하기');

  assert.equal(hit.status, 'hit');
  assert.equal(hit.inputKind, 'url');
  assert.equal(memo.status, 'memo_draft');
  assert.equal(memo.inputKind, 'memo');
  assert.equal(memo.canSaveToMyFlow, false);
  assert.equal(memo.aiGeneration.enabled, false);
});

test('memo draft does not recommend an unrelated fixed content route', () => {
  const result = buildUrlFirstMemoDraft('매주 읽을 책을 고르고 독서 기록을 남기고 싶다.');

  assert.equal(result.status, 'memo_draft');
  assert.equal(result.recommendation, undefined);
});

test('hit URL start package saves the selected start date and builds a markdown export', () => {
  const result = lookupUrlFirstP0Input('https://mathbang.net/13?utm_source=share');
  const started = buildUrlFirstStartPackage(result, {
    startDate: '2026-07-15',
    exportMode: 'markdown',
    savedAt: '2026-07-05T00:00:00.000Z',
  });

  assert.equal(started.status, 'ready');
  assert.equal(started.canSaveToMyFlow, true);
  assert.equal(started.flowMapId, 'middle-school-math-1');
  assert.equal(started.targetHref, '/my?savedMap=middle-school-math-1');
  assert.ok(started.savedFlows.length > 0);
  assert.ok(started.savedFlows.every((flow) => flow.anchor === '2026-07-15'));
  assert.ok(started.savedFlows.every((flow) => flow.selectedArtifactMode === 'checklist'));
  assert.equal(started.savedMapSnapshot?.anchor, '2026-07-15');
  assert.equal(started.savedMapSnapshot?.savedAt, '2026-07-05T00:00:00.000Z');
  assert.equal(started.persistenceRecord?.saved.anchor, '2026-07-15');
  assert.equal(started.markdownExport?.filename, 'middle-school-math-1-flow.md');
  assert.match(started.markdownExport?.content ?? '', /2026-07-15/);
  assert.match(started.markdownExport?.content ?? '', /middle-school-math-1/);
});

test('AJD calendar start package writes the canonical public Flow identity', () => {
  const result = lookupUrlFirstP0Input(AJD_MOVING_SOURCE_URL);
  const started = buildUrlFirstStartPackage(result, {
    startDate: '2026-08-01',
    exportMode: 'calendar',
    savedAt: '2026-07-05T00:00:00.000Z',
  });

  assert.equal(started.status, 'ready');
  assert.equal(started.flowMapId, undefined);
  assert.equal(started.flowSlug, 'moving-d30-basic');
  assert.equal(started.targetHref, '/my?savedFlow=moving-d30-basic');
  assert.ok(started.savedFlows.length > 0);
  assert.deepEqual(
    started.savedFlows.map((flow) => flow.slug),
    ['moving-d30-basic'],
  );
  assert.ok(started.savedFlows.every((flow) => flow.selectedArtifactMode === 'calendar'));
  assert.equal(started.savedMapSnapshot, undefined);
});

test('direct Flow start package lands on the canonical saved Flow receipt', () => {
  const mapResult = lookupUrlFirstP0Input(AJD_MOVING_SOURCE_URL);
  const { flowMapId: _flowMapId, ...directFlowResult } = mapResult;
  const started = buildUrlFirstStartPackage(directFlowResult, {
    startDate: '2026-08-01',
    exportMode: 'calendar',
    savedAt: '2026-07-05T00:00:00.000Z',
  });

  assert.equal(started.status, 'ready');
  assert.equal(started.flowMapId, undefined);
  assert.equal(started.flowSlug, 'moving-d30-basic');
  assert.equal(started.targetHref, '/my?savedFlow=moving-d30-basic');
});

test('customized start package stores a personal title and excludes unchecked steps only in My Flow state', () => {
  const result = lookupUrlFirstP0Input('https://mathbang.net/13?utm_source=share');
  const started = buildUrlFirstStartPackage(result, {
    startDate: '2026-07-15',
    exportMode: 'markdown',
    savedAt: '2026-07-05T00:00:00.000Z',
    customTitle: 'My algebra catch-up plan',
    includedStepIds: ['math-prime-factorization'],
  });

  assert.equal(started.status, 'ready');
  assert.equal(started.savedMapSnapshot?.title, 'My algebra catch-up plan');
  assert.deepEqual(started.savedMapSnapshot?.flowSlugs, ['source-backed-middle-school-math-1']);
  assert.equal(started.savedMapSnapshot?.stepCountsByFlow?.['source-backed-middle-school-math-1'], 1);
  assert.equal(started.persistenceRecord?.map.title, 'My algebra catch-up plan');
  assert.deepEqual(
    started.persistenceRecord?.childFlows[0]?.steps.map((step) => step.stepId),
    ['math-prime-factorization'],
  );
  assert.equal(
    started.itemStatesByFlowSlug?.['source-backed-middle-school-math-1']?.['math-integers-rationals']?.personalExcluded,
    true,
  );
  assert.equal(
    started.itemStatesByFlowSlug?.['source-backed-middle-school-math-1']?.['math-integers-rationals']?.note,
    undefined,
  );
  assert.equal(started.savedMapSnapshot?.personalCopy?.source, 'url_first_custom_start');
  assert.deepEqual(started.savedMapSnapshot?.personalCopy?.includedStepIdsByFlow, {
    'source-backed-middle-school-math-1': ['math-prime-factorization'],
  });
  assert.deepEqual(started.savedMapSnapshot?.personalCopy?.excludedStepIdsByFlow, {
    'source-backed-middle-school-math-1': [
      'math-integers-rationals',
      'math-letter-expression',
      'math-coordinate-graph',
      'math-basic-geometry',
      'math-plane-figures',
      'math-solid-figures',
      'math-data-analysis',
    ],
  });
  assert.equal(
    started.itemStatesByFlowSlug?.['source-backed-middle-school-math-1']?.['math-prime-factorization'],
    undefined,
  );
  assert.match(started.markdownExport?.content ?? '', /My algebra catch-up plan/);
  assert.match(started.markdownExport?.content ?? '', /1\. 소인수분해/);
  assert.doesNotMatch(started.markdownExport?.content ?? '', /2\. 정수와 유리수/);
});

test('customized start package blocks when every step is excluded', () => {
  const result = lookupUrlFirstP0Input('https://mathbang.net/13?utm_source=share');
  const started = buildUrlFirstStartPackage(result, {
    startDate: '2026-07-15',
    exportMode: 'markdown',
    savedAt: '2026-07-05T00:00:00.000Z',
    customTitle: 'Empty personal plan',
    includedStepIds: [],
  });

  assert.equal(started.status, 'blocked');
  assert.equal(started.canSaveToMyFlow, false);
  assert.deepEqual(started.savedFlows, []);
  assert.equal(started.markdownExport, undefined);
});

test('non-saveable URL lookup results cannot build a start package', () => {
  const needsReview = lookupUrlFirstP0Input('https://flowme.local/f/vehicle-inspection-prep?utm_campaign=share');
  const miss = lookupUrlFirstP0Input('https://example.com/some-plan?utm_source=newsletter');

  for (const result of [needsReview, miss]) {
    const started = buildUrlFirstStartPackage(result, {
      startDate: '2026-07-15',
      exportMode: 'calendar',
      savedAt: '2026-07-05T00:00:00.000Z',
    });

    assert.equal(started.status, 'blocked');
    assert.equal(started.canSaveToMyFlow, false);
    assert.deepEqual(started.savedFlows, []);
    assert.equal(started.savedMapSnapshot, undefined);
    assert.equal(started.persistenceRecord, undefined);
    assert.equal(started.markdownExport, undefined);
  }
});
