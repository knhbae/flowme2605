import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCreatorChannelSummaries,
  previewCreatorChannels,
  previewFlowBundles,
} from './creator-channel-preview';
import { inferPrimaryDestination } from './destination';
import { seedBundles } from './seed-flows';
import { virtualUsers } from './users';

test('seed pack contains public Korean Flow bundles across practical categories', () => {
  assert.ok(seedBundles.length >= 231);
  const slugs = new Set(seedBundles.map((bundle) => bundle.flow.slug));
  const originalSlugs = [
    'baby-food-menu-recipe',
    'business-registration-basic',
    'car-care-monthly-routine',
    'computer-skills-d30-study',
    'diet-habit-2week',
    'diet-meal-exercise-log',
    'diet-reset-2week',
    'driver-license-renewal-check',
    'english-study-30day-routine',
    'family-certificate-issue',
    'happy-birth-service-check',
    'home-workout-20min',
    'industrial-accident-claim-docs',
    'job-change-risk-check',
    'moving-d30-basic',
    'national-health-checkup-d7',
    'new-car-delivery-check',
    'overseas-travel-d14',
    'passport-renewal-docs',
    'pet-registration-basic',
    'qnet-exam-application-prep',
    'resident-register-copy-issue',
    'running-5k-4week',
    'samsung-aircon-seasonal-check',
    'samsung-washer-filter-cleaning',
    'study-exam-d30-plan',
    'used-car-buying-check',
    'vaccination-certificate-issue',
    'vehicle-inspection-prep',
    'wedding-d180-basic',
    'year-end-tax-docs',
  ];
  assert.ok(originalSlugs.every((slug) => slugs.has(slug)));
  assert.ok(seedBundles.every((bundle) => bundle.flow.status === 'published'));
  assert.ok(seedBundles.some((bundle) => bundle.flow.title === '이사 D-30 준비 Flow'));
  assert.ok(seedBundles.some((bundle) => bundle.flow.title === '초기 이유식 메뉴·레시피 Flow'));
  assert.ok(seedBundles.some((bundle) => bundle.flow.title === '해외여행 출국 준비 Flow'));
  assert.ok(seedBundles.some((bundle) => bundle.flow.title === '연말정산 서류 준비 Flow'));
});

test('baby food seed keeps meal slots, recipes, caution, and reaction-log affordance data', () => {
  const baby = seedBundles.find((bundle) => bundle.flow.slug === 'baby-food-menu-recipe');

  assert.ok(baby);
  assert.equal(baby.flow.structure_type, 'phase');
  assert.equal(baby.flow.content_type, 'meal_plan');
  assert.equal(baby.flow.risk_level, 'medical_sensitive');
  assert.match(baby.flow.warning ?? '', /전문가 또는 공식 정보/);
  assert.equal(baby.mealSlots?.length, 6);
  assert.equal(baby.recipes?.length, 6);
  assert.deepEqual(baby.mealSlots?.[0], {
    id: 'meal-rice-0',
    flow_id: 'flow-baby-food',
    section_id: 'baby-phase-1',
    recipe_id: 'recipe-rice',
    day_offset: 0,
    duration_days: 3,
    menu_title: '쌀미음',
    new_ingredients: ['쌀'],
    allergy_watch_days: 3,
    order: 0,
  });
});

test('seed checklist items include execution details and official links where useful', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);

  const item = moving.items.find((entry) => entry.title === '전입신고와 확정일자 확인하기');
  assert.ok(item);
  const detail = moving.itemDetails?.find((entry) => entry.item_id === item.id);

  assert.ok(detail);
  assert.match(detail.why ?? '', /주소 이전/);
  assert.match(detail.completion_criteria ?? '', /확정일자/);
  assert.ok(detail.links?.some((link) => link.type === 'official' && link.label.includes('정부24')));
});

test('new travel and tax seeds keep reference links inside item details', () => {
  const travel = seedBundles.find((bundle) => bundle.flow.slug === 'overseas-travel-d14');
  const tax = seedBundles.find((bundle) => bundle.flow.slug === 'year-end-tax-docs');

  assert.ok(travel);
  assert.ok(tax);
  assert.equal(travel.flow.structure_type, 'timeline');
  assert.equal(tax.flow.structure_type, 'checklist');
  assert.ok(travel.itemDetails?.some((detail) => detail.links?.some((link) => link.url.includes('passport.go.kr'))));
  assert.ok(tax.itemDetails?.some((detail) => detail.links?.some((link) => link.url.includes('hometax.go.kr'))));
});

test('online-sourced seed flows include official source links and risk metadata', () => {
  const onlineSlugs = [
    'passport-renewal-docs',
    'national-health-checkup-d7',
    'business-registration-basic',
    'driver-license-renewal-check',
    'happy-birth-service-check',
    'pet-registration-basic',
    'vaccination-certificate-issue',
    'family-certificate-issue',
    'resident-register-copy-issue',
    'industrial-accident-claim-docs',
  ];

  for (const slug of onlineSlugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);

    assert.ok(bundle, slug);
    assert.equal(bundle.flow.status, 'published');
    assert.ok(bundle.flow.source_url?.startsWith('https://'), slug);
    assert.ok(bundle.items.every((item) => item.source_type === 'official'), slug);
    assert.ok(
      bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.type === 'official')),
      slug,
    );
  }
});

test('creator-inspired seed flows cover followable blog and video-like routines', () => {
  const creatorSlugs = [
    'study-exam-d30-plan',
    'english-study-30day-routine',
    'used-car-buying-check',
    'new-car-delivery-check',
    'car-care-monthly-routine',
    'wedding-d180-basic',
    'running-5k-4week',
    'diet-habit-2week',
  ];

  for (const slug of creatorSlugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);

    assert.ok(bundle, slug);
    assert.equal(bundle.flow.status, 'published');
    assert.ok(bundle.flow.source_url?.startsWith('https://'), slug);
    assert.ok(bundle.items.length > 0, slug);
    assert.ok(
      bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.type === 'reference')),
      slug,
    );
  }
});

test('P1 migrated representative candidates include tailored executable item details', () => {
  const migratedSlugs = [
    'wedding-d180-basic',
    'study-exam-d30-plan',
    'home-workout-20min',
    'english-study-30day-routine',
    'car-care-monthly-routine',
  ];

  for (const slug of migratedSlugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, slug);
    assert.equal(bundle.itemDetails?.length, bundle.items.length, `${slug} should detail every item`);

    const detailByItem = new Map(bundle.itemDetails?.map((detail) => [detail.item_id, detail]));
    const whyTexts = new Set<string>();
    const howTexts = new Set<string>();
    const completionTexts = new Set<string>();

    for (const item of bundle.items) {
      const detail = detailByItem.get(item.id);
      assert.ok(detail, `${slug} missing detail for ${item.title}`);
      assert.ok(detail.why && detail.why.length >= 20, `${slug} weak why for ${item.title}`);
      assert.ok(detail.how && detail.how.length >= 20, `${slug} weak how for ${item.title}`);
      assert.ok(
        detail.completion_criteria && detail.completion_criteria.length >= 15,
        `${slug} weak completion criteria for ${item.title}`,
      );
      assert.ok(
        detail.links?.some((link) => link.type === 'reference'),
        `${slug} missing reference link for ${item.title}`,
      );
      whyTexts.add(detail.why);
      howTexts.add(detail.how);
      completionTexts.add(detail.completion_criteria);
    }

    assert.ok(whyTexts.size >= Math.min(4, bundle.items.length), `${slug} uses repeated why text`);
    assert.ok(howTexts.size >= Math.min(4, bundle.items.length), `${slug} uses repeated how text`);
    assert.ok(
      completionTexts.size >= Math.min(4, bundle.items.length),
      `${slug} uses repeated completion criteria`,
    );
  }
});

test('source replacement and risk review routes have artifact-specific item copy', () => {
  const slugs = [
    'computer-skills-d30-study',
    'diet-habit-2week',
    'new-car-delivery-check',
    'year-end-tax-docs',
    'diet-meal-exercise-log',
    'diet-reset-2week',
    'business-registration-basic',
    'happy-birth-service-check',
    'industrial-accident-claim-docs',
    'national-health-checkup-d7',
    'vaccination-certificate-issue',
    'job-change-risk-check',
  ];
  const genericWhy = '공식 안내의 신청 조건, 제출 서류, 처리 절차를 실행 전에 확인하기 위한 항목입니다.';
  const genericHow = '링크의 최신 안내를 열어 본인 상황에 해당하는 신청 자격, 구비서류, 수수료, 처리기간을 확인합니다.';
  const genericCompletion = '이 항목을 완료했어요.';
  const artifactWords = /메모|기록|표|파일|캘린더|질문|증빙|상태|점수|사진|제출|공식|기관|회사|중단/;

  for (const slug of slugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, slug);
    assert.equal(bundle.itemDetails?.length, bundle.items.length, `${slug} should detail every item`);

    const details = new Map(bundle.itemDetails?.map((detail) => [detail.item_id, detail]));
    for (const item of bundle.items) {
      const detail = details.get(item.id);
      assert.ok(detail, `${slug} missing detail for ${item.title}`);
      assert.ok(detail.why && detail.why.length >= 20, `${slug} weak why for ${item.title}`);
      assert.ok(detail.how && detail.how.length >= 20, `${slug} weak how for ${item.title}`);
      assert.ok(detail.completion_criteria && detail.completion_criteria.length >= 15, `${slug} weak completion for ${item.title}`);
      assert.notEqual(detail.why, genericWhy, `${slug} generic why for ${item.title}`);
      assert.notEqual(detail.how, genericHow, `${slug} generic how for ${item.title}`);
      assert.notEqual(detail.completion_criteria, genericCompletion, `${slug} generic completion for ${item.title}`);
      assert.match(
        `${item.title} ${item.description ?? ''} ${detail.why} ${detail.how} ${detail.completion_criteria} ${detail.caution ?? ''}`,
        artifactWords,
        `${slug} should point ${item.title} to an artifact, official question, or stop condition`,
      );
    }
  }
});

test('computer skills study items are written as sequence actions', () => {
  const study = seedBundles.find((bundle) => bundle.flow.slug === 'computer-skills-d30-study');
  assert.ok(study);
  assert.equal(study.flow.primary_destination, 'hybrid');
  assert.match(study.flow.description, /FLOW가 시험일 기준으로 변환/);
  assert.equal(study.items.length, 9);
  assert.equal(study.itemDetails?.length, study.items.length);

  for (const item of study.items) {
    const detail = study.itemDetails?.find((entry) => entry.item_id === item.id);
    assert.ok(detail, `${item.title} missing detail`);
    const portableAction = [item.title, detail.why, detail.how, detail.completion_criteria, detail.caution].join('\n');

    assert.match(portableAction, /실행:/, `${item.title} should say what to do`);
    assert.match(portableAction, /기록:/, `${item.title} should say where to record the result`);
    assert.match(
      portableAction,
      /D-30 학습표|챕터 진도표|기출 점수·오답 기록|캘린더 일정|실기 환경|시험장 준비/,
      `${item.title} should point to a concrete study artifact`,
    );
  }
});

test('diet habit route is framed as an observation sheet, not a diet prescription', () => {
  const diet = seedBundles.find((entry) => entry.flow.slug === 'diet-habit-2week');

  assert.ok(diet);
  assert.equal(diet.flow.title, '2주 식사·활동 관찰 Flow');
  assert.match(diet.flow.description, /감량 처방이 아니라/);
  assert.match(diet.flow.warning ?? '', /감량 처방이 아니라 관찰 기록용/);
  assert.match(diet.flow.warning ?? '', /어지러움|통증|폭식 유발감/);
  assert.ok(diet.sections.some((section) => section.title.includes('관찰')));
  assert.ok(diet.items.some((item) => item.title.includes('중단') || item.title.includes('상담')));
  assert.ok(
    diet.itemDetails?.every((detail) =>
      `${detail.why} ${detail.how} ${detail.completion_criteria} ${detail.caution ?? ''}`.includes('관찰표'),
    ),
  );

  for (const item of diet.items) {
    assert.doesNotMatch(item.title, /스쿼트|푸시업|플랭크/);
    assert.doesNotMatch(item.description ?? '', /스쿼트|푸시업|플랭크/);
  }
});

test('new car route is framed around evidence before handover signing', () => {
  const newCar = seedBundles.find((entry) => entry.flow.slug === 'new-car-delivery-check');

  assert.ok(newCar);
  assert.match(newCar.flow.description, /사진 파일명|딜러 확인|서명 전 보류/);
  assert.match(newCar.flow.warning ?? '', /서명|인수 확정/);

  const detailText = newCar.itemDetails
    ?.map((detail) => `${detail.why} ${detail.how} ${detail.completion_criteria} ${detail.caution ?? ''}`)
    .join('\n') ?? '';
  assert.match(detailText, /신차 인수 증빙표/);
  assert.match(detailText, /사진|딜러 확인|서명/);
});

test('used car route warns that the checklist does not guarantee vehicle condition', () => {
  const usedCar = seedBundles.find((entry) => entry.flow.slug === 'used-car-buying-check');

  assert.ok(usedCar);
  assert.match(usedCar.flow.warning ?? '', /차량 상태를 보증하지 않습니다/);
  assert.match(usedCar.flow.warning ?? '', /공식 조회와 전문가 점검/);
});

test('seed flows expose creator and popularity signals for discovery', () => {
  const userIds = new Set(virtualUsers.map((user) => user.id));
  for (const bundle of seedBundles) {
    assert.ok(bundle.flow.creator_name, bundle.flow.slug);
    assert.ok(bundle.flow.owner_user_id, bundle.flow.slug);
    assert.ok(userIds.has(bundle.flow.owner_user_id), bundle.flow.slug);
    assert.ok(bundle.flow.creator_role, bundle.flow.slug);
    assert.ok(bundle.flow.creator_note, bundle.flow.slug);
    assert.equal(typeof bundle.flow.usage_count, 'number', bundle.flow.slug);
    assert.equal(typeof bundle.flow.copy_count, 'number', bundle.flow.slug);
    assert.ok(bundle.flow.tags?.length, bundle.flow.slug);
  }
});

test('real content pilot covers 10 converted flows across five categories', () => {
  const pilotSlugs = [
    'samsung-aircon-seasonal-check',
    'samsung-washer-filter-cleaning',
    'vehicle-inspection-prep',
    'driver-license-renewal-check',
    'home-workout-20min',
    'running-5k-4week',
    'qnet-exam-application-prep',
    'computer-skills-d30-study',
    'diet-meal-exercise-log',
    'diet-reset-2week',
  ];

  for (const slug of pilotSlugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, slug);
    assert.equal(bundle.flow.status, 'published', slug);
    assert.ok(bundle.flow.source_title, slug);
    assert.ok(bundle.flow.source_url?.startsWith('https://'), slug);
    assert.ok(bundle.items.length >= 4, slug);
    assert.ok(bundle.itemDetails?.some((detail) => detail.completion_criteria), slug);
  }

  const categories = new Set(
    pilotSlugs.map((slug) => seedBundles.find((entry) => entry.flow.slug === slug)?.flow.category),
  );
  assert.ok(categories.has('가전관리'));
  assert.ok(categories.has('자동차/검사'));
  assert.ok(categories.has('운동/루틴'));
  assert.ok(categories.has('자격증/시험'));
  assert.ok(categories.has('다이어트/기록'));
});

test('official pilot source domains use official tags instead of blog-following tags', () => {
  const officialPilotSources = [
    { slug: 'samsung-aircon-seasonal-check', host: 'samsungsvc.co.kr' },
    { slug: 'samsung-washer-filter-cleaning', host: 'samsungsvc.co.kr' },
    { slug: 'vehicle-inspection-prep', host: 'kotsa.or.kr' },
    { slug: 'driver-license-renewal-check', host: 'safedriving.or.kr' },
    { slug: 'qnet-exam-application-prep', host: 'q-net.or.kr' },
    { slug: 'diet-habit-2week', host: 'health.kdca.go.kr' },
  ];

  for (const { slug, host } of officialPilotSources) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);

    assert.ok(bundle, slug);
    assert.ok(bundle.flow.source_url?.includes(host), slug);
    assert.ok(bundle.flow.tags?.includes('공식확인'), slug);
    assert.ok(!bundle.flow.tags?.includes('블로그 따라하기'), slug);
  }
});

test('existing pilot flows use upgraded source metadata and matching detail links', () => {
  const expected = [
    {
      slug: 'driver-license-renewal-check',
      category: '자동차/검사',
      source_title: '한국도로교통공단 안전운전 통합민원 면허갱신 안내',
      source_url: 'https://www.safedriving.or.kr/diGuide/selectDiGuide02.do',
    },
    {
      slug: 'home-workout-20min',
      category: '운동/루틴',
      source_title: 'ThankyouBUBU 홈트 루틴 콘텐츠 참고',
      source_url: 'https://www.youtube.com/@ThankyouBUBU',
    },
    {
      slug: 'running-5k-4week',
      category: '운동/루틴',
      source_title: '런데이 초보 러닝 콘텐츠 참고',
      source_url: 'https://www.runday.co.kr/',
    },
    {
      slug: 'diet-habit-2week',
      category: '다이어트/기록',
      source_title: '질병관리청 건강하게 체중 감량하기 안내',
      source_url:
        'https://health.kdca.go.kr/healthinfo/biz/health/ntcnInfo/healthSourc/thtimtCntnts/thtimtCntntsView.do?thtimt_cntnts_sn=82',
    },
  ];

  for (const expectedFlow of expected) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === expectedFlow.slug);
    assert.ok(bundle, expectedFlow.slug);
    assert.equal(bundle.flow.category, expectedFlow.category, expectedFlow.slug);
    assert.equal(bundle.flow.source_title, expectedFlow.source_title, expectedFlow.slug);
    assert.equal(bundle.flow.source_url, expectedFlow.source_url, expectedFlow.slug);

    const expectedHost = new URL(expectedFlow.source_url).host;
    assert.ok(
      bundle.itemDetails?.some(
        (detail) =>
          detail.completion_criteria &&
          detail.links?.some((link) => new URL(link.url).host === expectedHost),
      ),
      expectedFlow.slug,
    );
  }
});

test('source-backed legacy flows are normalized as needs-review inventory', () => {
  const needsReviewSlugs = [
    'job-change-risk-check',
    'year-end-tax-docs',
    'passport-renewal-docs',
    'national-health-checkup-d7',
    'business-registration-basic',
    'driver-license-renewal-check',
    'happy-birth-service-check',
    'pet-registration-basic',
    'vaccination-certificate-issue',
    'family-certificate-issue',
    'resident-register-copy-issue',
    'industrial-accident-claim-docs',
    'new-car-delivery-check',
    'diet-habit-2week',
    'samsung-aircon-seasonal-check',
    'samsung-washer-filter-cleaning',
    'vehicle-inspection-prep',
    'qnet-exam-application-prep',
    'computer-skills-d30-study',
    'diet-meal-exercise-log',
    'diet-reset-2week',
  ];

  for (const slug of needsReviewSlugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, slug);
    assert.equal(bundle.flow.source_status, 'needs_review', slug);
    assert.ok(bundle.flow.source_url?.startsWith('https://'), slug);
    assert.ok(bundle.flow.source_title, slug);
    assert.ok(bundle.flow.source_checked_at, slug);
    assert.ok(bundle.flow.conversion_note, slug);
    assert.ok(bundle.flow.source_precision, slug);
  }
});

test('creator channel preview exposes 10 channels and 400+ published flows', () => {
  assert.ok(previewCreatorChannels.length >= 10);
  assert.ok(previewFlowBundles.length >= 400);
  assert.ok(previewFlowBundles.every((bundle) => bundle.flow.status === 'published'));

  const summaries = getCreatorChannelSummaries(seedBundles);
  const previewSummaries = summaries.filter((summary) => summary.is_preview_channel);

  assert.ok(previewSummaries.length >= 10);
  assert.ok(previewSummaries.every((summary) => summary.flow_count >= 40));
  assert.ok(previewSummaries.every((summary) => summary.source_coverage === 100));
  assert.ok(previewSummaries.every((summary) => summary.execution_score >= 70));
});

test('generated preview flows are executable and source-backed', () => {
  const generated = seedBundles.filter((bundle) => bundle.flow.id.startsWith('flow-preview-'));

  assert.ok(generated.length >= 400);
  for (const bundle of generated) {
    assert.ok(bundle.flow.slug.startsWith('channel-'), bundle.flow.slug);
    assert.ok(bundle.flow.owner_user_id, bundle.flow.slug);
    assert.ok(bundle.flow.creator_name, bundle.flow.slug);
    assert.ok(bundle.flow.source_title, bundle.flow.slug);
    assert.ok(bundle.flow.source_url?.startsWith('https://'), bundle.flow.slug);
    assert.ok(bundle.items.length >= 4, bundle.flow.slug);
    assert.ok(bundle.itemDetails?.some((detail) => detail.completion_criteria), bundle.flow.slug);
  }
});

test('real source-backed channel batch covers every preview channel', () => {
  const real = seedBundles.filter((bundle) => bundle.flow.source_status === 'real');
  assert.ok(real.length >= 20);

  for (const channel of previewCreatorChannels) {
    const count = real.filter((bundle) => bundle.flow.owner_user_id === channel.id).length;
    assert.ok(count >= 2, `${channel.slug} expected at least 2 real source-backed flows`);
  }
});

test('real source-backed flows include precision and tailored executable details', () => {
  const real = seedBundles.filter((bundle) => bundle.flow.source_status === 'real');
  assert.ok(real.length >= 20);
  const oneActionRealSourceSlugs = new Set([
    'real-fitvely-diet-record-routine',
  ]);

  for (const bundle of real) {
    assert.ok(bundle.flow.source_url, `${bundle.flow.slug} missing source_url`);
    assert.ok(bundle.flow.source_title, `${bundle.flow.slug} missing source_title`);
    assert.ok(bundle.flow.source_checked_at, `${bundle.flow.slug} missing source_checked_at`);
    assert.ok(bundle.flow.conversion_note, `${bundle.flow.slug} missing conversion_note`);
    assert.ok(bundle.flow.source_precision, `${bundle.flow.slug} missing source_precision`);
    assert.ok(['exact', 'broad'].includes(bundle.flow.source_precision), bundle.flow.slug);
    const expectedItemCount = bundle.flow.tags?.includes('exact-video') || oneActionRealSourceSlugs.has(bundle.flow.slug) ? 1 : 5;
    assert.equal(bundle.items.length, expectedItemCount, `${bundle.flow.slug} expected ${expectedItemCount} items`);
    assert.equal(
      bundle.itemDetails?.length,
      expectedItemCount,
      `${bundle.flow.slug} expected ${expectedItemCount} item details`,
    );

    const detailByItem = new Map(bundle.itemDetails?.map((detail) => [detail.item_id, detail]));
    const whyTexts = new Set<string>();
    const howTexts = new Set<string>();
    const completionTexts = new Set<string>();

    for (const item of bundle.items) {
      const detail = detailByItem.get(item.id);
      assert.ok(detail, `${bundle.flow.slug} missing detail for ${item.title}`);
      assert.ok(detail.why && detail.why.length >= 20, `${bundle.flow.slug} weak why for ${item.title}`);
      assert.ok(detail.how && detail.how.length >= 20, `${bundle.flow.slug} weak how for ${item.title}`);
      assert.ok(
        detail.completion_criteria && detail.completion_criteria.length >= 15,
        `${bundle.flow.slug} weak completion criteria for ${item.title}`,
      );
      assert.ok(detail.links?.length, `${bundle.flow.slug} missing detail link for ${item.title}`);
      whyTexts.add(detail.why);
      howTexts.add(detail.how);
      completionTexts.add(detail.completion_criteria);
    }

    if (!bundle.flow.tags?.includes('exact-video') && !oneActionRealSourceSlugs.has(bundle.flow.slug)) {
      assert.ok(whyTexts.size >= 4, `${bundle.flow.slug} uses generic why text`);
      assert.ok(howTexts.size >= 4, `${bundle.flow.slug} uses generic how text`);
      assert.ok(completionTexts.size >= 4, `${bundle.flow.slug} uses generic completion text`);
    }
  }
});

test('fitness creator deep dive converts exact videos into executable flows', () => {
  const expected = [
    { creator: 'ThankyouBUBU', slugPrefix: 'real-thankyou-bubu-video-', minimum: 10 },
    { creator: 'FITVELY', slugPrefix: 'real-fitvely-video-', minimum: 10 },
  ];

  for (const { creator, slugPrefix, minimum } of expected) {
    const exactVideoFlows = seedBundles.filter(
      (bundle) =>
        bundle.flow.source_status === 'real' &&
        bundle.flow.source_precision === 'exact' &&
        bundle.flow.slug.startsWith(slugPrefix),
    );

    assert.ok(exactVideoFlows.length >= minimum, `${creator} needs ${minimum}+ exact video flows`);

    for (const bundle of exactVideoFlows) {
      assert.match(bundle.flow.source_url ?? '', /^https:\/\/www\.youtube\.com\/watch\?v=/, bundle.flow.slug);
      assert.equal(bundle.items.length, 1, `${bundle.flow.slug} should keep creator video execution to one checklist item`);
      assert.equal(bundle.itemDetails?.length, 1, `${bundle.flow.slug} should keep creator video detail in one panel`);
      assert.ok(bundle.items.every((item) => item.repeat_rule === 'weekly'), bundle.flow.slug);
      assert.ok(bundle.items.every((item) => item.source_type === 'creator_experience'), bundle.flow.slug);
      assert.ok(
        bundle.itemDetails?.every((detail) =>
          detail.completion_criteria &&
          detail.links?.some((link) => link.type === 'creator') &&
          detail.how?.includes('준비') &&
          detail.how?.includes('실행') &&
          (detail.how?.includes('마무리') || detail.how?.includes('수정 조건')),
        ),
        bundle.flow.slug,
      );
      assert.ok(bundle.flow.tags?.includes('exact-video'), bundle.flow.slug);
    }
  }
});

test('fitness exact video flows keep one action with clear execution detail', () => {
  const workout = seedBundles.find((bundle) => bundle.flow.slug === 'real-thankyou-bubu-video-full-body-no-jump');
  const diet = seedBundles.find((bundle) => bundle.flow.slug === 'real-fitvely-video-body-fat-6kg-method');
  const workoutPlan = seedBundles.find((bundle) => bundle.flow.slug === 'real-fitvely-video-workout-split-science');

  assert.ok(workout);
  assert.ok(diet);
  assert.ok(workoutPlan);

  assert.equal(workout.items[0].title, '운동 스케줄 등록하고 영상 실행');
  assert.match(workout.itemDetails?.[0]?.how ?? '', /준비:.*실행:.*마무리:/);
  assert.equal(diet.items[0].title, '다음 식사 한 끼에 감량 기준 적용');
  assert.match(diet.itemDetails?.[0]?.how ?? '', /준비:.*실행:.*마무리:/);
  assert.equal(workoutPlan.items[0].title, '이번 주 분할·세트·휴식 기준 정하기');
  assert.match(workoutPlan.itemDetails?.[0]?.how ?? '', /운동표|분할|세트|휴식/);
  assert.doesNotMatch(workoutPlan.itemDetails?.[0]?.how ?? '', /식사 한 끼/);
});

test('exact workout video details separate summary, guide, source, and safety record', () => {
  const slugs = [
    'real-thankyou-bubu-video-full-body-no-jump',
    'real-thankyou-bubu-video-daily-stretch-9min',
    'real-thankyou-bubu-video-no-knee-cardio-strength',
  ];

  for (const slug of slugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);

    assert.ok(bundle, slug);
    assert.equal(bundle.items.length, 1, `${slug} should keep one video execution action`);

    const detail = bundle.itemDetails?.[0];
    assert.ok(detail, `${slug} missing detail`);

    assert.match(detail.how ?? '', /요약:/, `${slug} needs an execution summary`);
    assert.match(detail.how ?? '', /상세히 보기:/, `${slug} needs a detailed execution guide`);
    assert.match(detail.how ?? '', /원본 영상:/, `${slug} needs original video instruction`);
    assert.match(detail.how ?? '', /운동 후 기록:/, `${slug} needs post-workout log guidance`);
    assert.match(detail.caution ?? '', /통증|어지러움|호흡|중단|전문가/, `${slug} needs explicit stop condition`);
    assert.ok(
      detail.links?.some((link) => link.type === 'creator' && link.url.includes('youtube.com/watch?v=')),
      `${slug} needs creator video link`,
    );
  }
});

test('former broad ThankyouBUBU replacements use one exact-video execution action', () => {
  const slugs = ['real-thankyou-bubu-home-workout-starter', 'real-thankyou-bubu-20min-routine'];

  for (const slug of slugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);

    assert.ok(bundle, slug);
    assert.equal(bundle.flow.source_precision, 'exact', `${slug} should keep exact source precision`);
    assert.equal(bundle.items.length, 1, `${slug} should not ask users to manage a five-step workout plan`);
    assert.equal(bundle.itemDetails?.length, 1, `${slug} should keep the execution guidance in one detail panel`);

    const detail = bundle.itemDetails?.[0];
    assert.ok(detail, `${slug} missing detail`);

    assert.match(detail.how ?? '', /요약:/, `${slug} needs a summary before detailed guidance`);
    assert.match(detail.how ?? '', /상세히 보기:/, `${slug} needs a detailed execution guide`);
    assert.match(detail.how ?? '', /원본 영상:/, `${slug} needs the original YouTube video as authority`);
    assert.match(detail.how ?? '', /운동 후 기록:/, `${slug} needs post-workout record fields`);
    assert.match(detail.caution ?? '', /통증|어지러움|중단|전문가/, `${slug} needs a clear stop condition`);
    assert.ok(
      detail.links?.some((link) => link.type === 'creator' && link.url.includes('youtube.com/watch?v=')),
      `${slug} needs creator video link`,
    );
  }
});

test('repeated workout video flows are written as calendar-notification-ready actions', () => {
  const slugs = ['real-thankyou-bubu-home-workout-starter', 'real-thankyou-bubu-20min-routine'];

  for (const slug of slugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);

    assert.ok(bundle, slug);
    assert.equal(bundle.items.length, 1, `${slug} should keep one repeated-video action`);
    assert.equal(bundle.flow.primary_destination, 'calendar', `${slug} should stay calendar-first`);

    const detail = bundle.itemDetails?.[0];
    assert.ok(detail, `${slug} missing detail`);

    const portableAction = [
      bundle.items[0]?.title,
      detail.how,
      detail.completion_criteria,
      detail.caution,
    ].join('\n');

    assert.match(portableAction, /캘린더 알림/, `${slug} should explain what appears in each reminder`);
    assert.match(portableAction, /준비:/, `${slug} needs preparation instructions`);
    assert.match(portableAction, /실행:/, `${slug} needs execution instructions`);
    assert.match(portableAction, /운동 후 기록:/, `${slug} needs post-workout record fields`);
    assert.match(portableAction, /원본 영상:/, `${slug} needs the source-video handoff`);
    assert.match(portableAction, /중단|전문가/, `${slug} needs a stop or consult condition`);
  }
});

test('diet exact video details stay limited to one application and record', () => {
  const slugs = [
    'real-fitvely-video-body-fat-6kg-method',
    'real-fitvely-video-carb-reason',
    'real-fitvely-video-three-week-check',
    'real-fitvely-video-post-workout-nutrition',
    'real-fitvely-video-carb-amount-shorts',
    'real-fitvely-video-after-work-nutrition',
  ];

  for (const slug of slugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);

    assert.ok(bundle, slug);
    assert.equal(bundle.items.length, 1, `${slug} should keep one diet application action`);
    assert.equal(inferPrimaryDestination(bundle), 'sheet', `${slug} should be observation-sheet first`);

    const detail = bundle.itemDetails?.[0];
    assert.ok(detail, `${slug} missing detail`);

    assert.match(detail.how ?? '', /요약:/, `${slug} needs a narrow application summary`);
    assert.match(detail.how ?? '', /기준 후보:/, `${slug} needs visible source-rule candidates`);
    assert.match(detail.how ?? '', /적용 기준:/, `${slug} needs one selected rule`);
    assert.match(detail.how ?? '', /관찰표:/, `${slug} needs observation-sheet guidance`);
    assert.match(detail.how ?? '', /원본 영상:/, `${slug} needs source-video authority`);
    assert.match(detail.how ?? '', /기록:/, `${slug} needs an observation record`);
    assert.match(detail.how ?? '', /중단 조건:/, `${slug} needs a stop condition`);
    assert.match(detail.caution ?? '', /제한|폭식|어지러움|중단|전문가/, `${slug} needs diet-sensitive caution`);
  }
});

test('FITVELY diet record exact source becomes one observation-sheet action', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'real-fitvely-diet-record-routine');

  assert.ok(bundle);
  assert.equal(bundle.flow.source_precision, 'exact');
  assert.equal(inferPrimaryDestination(bundle), 'sheet');
  assert.equal(bundle.items.length, 1, 'diet record route should not ask users to manage five habit actions');
  assert.equal(bundle.itemDetails?.length, 1, 'diet record route should keep guidance in one detail panel');

  const detail = bundle.itemDetails?.[0];
  assert.ok(detail);

  assert.match(detail.how ?? '', /요약:/, 'diet record route needs a narrow summary');
  assert.match(detail.how ?? '', /적용 기준:/, 'diet record route needs one selected source rule');
  assert.match(detail.how ?? '', /관찰표:/, 'diet record route needs sheet-first observation guidance');
  assert.match(detail.how ?? '', /원본 영상:/, 'diet record route needs source-video authority');
  assert.match(detail.how ?? '', /기록:/, 'diet record route needs an observation row');
  assert.match(detail.how ?? '', /중단 조건:/, 'diet record route needs stop/consult criteria');
  assert.match(detail.caution ?? '', /제한|폭식|어지러움|중단|전문가/, 'diet record route needs diet-sensitive caution');
});

test('workout-plan exact video details convert one rule into a weekly plan record', () => {
  const slugs = [
    'real-fitvely-video-bulk-up-method',
    'real-fitvely-video-workout-order',
    'real-fitvely-video-workout-split-science',
  ];

  for (const slug of slugs) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);

    assert.ok(bundle, slug);
    assert.equal(bundle.items.length, 1, `${slug} should keep one workout-plan action`);
    assert.equal(inferPrimaryDestination(bundle), 'hybrid', `${slug} should remain hybrid`);

    const detail = bundle.itemDetails?.[0];
    assert.ok(detail, `${slug} missing detail`);

    assert.match(detail.how ?? '', /요약:/, `${slug} needs a weekly-plan summary`);
    assert.match(detail.how ?? '', /결정표:/, `${slug} needs a decision table before workout scheduling`);
    assert.match(detail.how ?? '', /선택 기준:/, `${slug} needs a selected rule`);
    assert.match(detail.how ?? '', /결정 후 운동표:/, `${slug} needs weekly workout table guidance after the decision`);
    assert.match(detail.how ?? '', /원본 영상:/, `${slug} needs source-video authority`);
    assert.match(detail.how ?? '', /기록:/, `${slug} needs a workout record`);
    assert.match(detail.how ?? '', /수정 조건:/, `${slug} needs a revise-or-hold condition`);
    assert.match(detail.caution ?? '', /통증|피로|호흡|중단|전문가/, `${slug} needs workout-plan caution`);
  }
});

test('source-backed flows expose primary destination for portable UX', () => {
  const workout = seedBundles.find((bundle) => bundle.flow.slug === 'real-thankyou-bubu-video-full-body-no-jump');
  const diet = seedBundles.find((bundle) => bundle.flow.slug === 'real-fitvely-video-body-fat-6kg-method');
  const workoutPlan = seedBundles.find((bundle) => bundle.flow.slug === 'real-fitvely-video-workout-split-science');
  const qnet = seedBundles.find((bundle) => bundle.flow.slug === 'real-qnet-application-examday-check');

  assert.ok(workout);
  assert.ok(diet);
  assert.ok(workoutPlan);
  assert.ok(qnet);

  assert.equal(inferPrimaryDestination(workout), 'calendar');
  assert.equal(inferPrimaryDestination(diet), 'sheet');
  assert.equal(inferPrimaryDestination(workoutPlan), 'hybrid');
  assert.equal(inferPrimaryDestination(qnet), 'hybrid');
});

test('ThankyouBUBU former broad workout routes use exact video sources', () => {
  const starter = seedBundles.find((bundle) => bundle.flow.slug === 'real-thankyou-bubu-home-workout-starter');
  const routine = seedBundles.find((bundle) => bundle.flow.slug === 'real-thankyou-bubu-20min-routine');

  assert.ok(starter);
  assert.equal(starter.flow.source_precision, 'exact');
  assert.equal(starter.flow.source_url, 'https://www.youtube.com/watch?v=pcyrlkHXAdE');
  assert.ok(starter.flow.source_title?.includes('점프'));
  assert.ok(starter.itemDetails.every((detail) => detail.links.some((link) => link.url === starter.flow.source_url)));

  assert.ok(routine);
  assert.equal(routine.flow.source_precision, 'exact');
  assert.equal(routine.flow.source_url, 'https://www.youtube.com/watch?v=gSz5n4sLENI');
  assert.ok(routine.flow.source_title?.includes('칼소폭 찐 핵핵핵 매운맛'));
  assert.ok(routine.itemDetails.every((detail) => detail.links.some((link) => link.url === routine.flow.source_url)));
});

test('FITVELY diet record route uses an exact diet source while weekly body check stays broad', () => {
  const diet = seedBundles.find((bundle) => bundle.flow.slug === 'real-fitvely-diet-record-routine');
  const weekly = seedBundles.find((bundle) => bundle.flow.slug === 'real-fitvely-weekly-body-check');

  assert.ok(diet);
  assert.equal(diet.flow.source_precision, 'exact');
  assert.equal(diet.flow.source_url, 'https://www.youtube.com/watch?v=qcTxaFMWzKs');
  assert.ok(diet.flow.source_title?.includes('g단위'));
  assert.ok(diet.itemDetails.every((detail) => detail.links.some((link) => link.url === diet.flow.source_url)));

  assert.ok(weekly);
  assert.equal(weekly.flow.source_precision, 'broad');
  assert.equal(weekly.flow.source_url, 'https://www.fitvely.com/');
});

test('Sinagong study route uses an exact book source without representative promotion', () => {
  const study = seedBundles.find((bundle) => bundle.flow.slug === 'real-sinagong-computer-d30-study');

  assert.ok(study);
  assert.equal(study.flow.source_precision, 'exact');
  assert.equal(study.flow.source_url, 'https://www.gilbut.co.kr/m/book/view?bookcode=BN004603');
  assert.ok(study.flow.source_title?.includes('시나공'));
  assert.ok(study.flow.source_title?.includes('컴활'));
  assert.ok(study.itemDetails.every((detail) => detail.links.some((link) => link.url === study.flow.source_url)));
});

test('pet health visit route uses an exact official visit program source without promotion', () => {
  const pet = seedBundles.find((bundle) => bundle.flow.slug === 'real-pet-health-visit-routine');

  assert.ok(pet);
  assert.equal(pet.flow.source_precision, 'exact');
  assert.equal(pet.flow.source_url, 'https://news.seoul.go.kr/env/archives/567583/');
  assert.ok(pet.flow.source_title?.includes('우리동네 동물병원'));
  assert.ok(pet.itemDetails.every((detail) => detail.links.some((link) => link.url === pet.flow.source_url)));
});

test('MOFA travel prep route uses an exact country safety source without promotion', () => {
  const travel = seedBundles.find((bundle) => bundle.flow.slug === 'real-mofa-overseas-travel-prep');

  assert.ok(travel);
  assert.equal(travel.flow.source_precision, 'exact');
  assert.equal(travel.flow.source_url, 'https://www.0404.go.kr/ntnSafetyInfo/86/detail');
  assert.ok(travel.flow.source_title?.includes('베트남'));
  assert.ok(travel.itemDetails.every((detail) => detail.links.some((link) => link.url === travel.flow.source_url)));
});

test('fitness exact video flow titles preserve the original content premise', () => {
  const exactVideos = seedBundles.filter((bundle) => bundle.flow.tags?.includes('exact-video'));
  const carb = seedBundles.find((bundle) => bundle.flow.slug === 'real-fitvely-video-carb-reason');

  assert.ok(carb);
  assert.equal(carb.flow.title, 'FITVELY 탄수화물을 먹어야 하는 이유 Flow');
  assert.match(carb.flow.source_title ?? '', /다이어트할 때 탄수화물을 꼭 먹어야 하는 이유/);

  for (const bundle of exactVideos) {
    assert.doesNotMatch(bundle.flow.title, /기준 Flow$/, bundle.flow.slug);
    assert.doesNotMatch(bundle.flow.title, /^FITVELY 다음 식사/, bundle.flow.slug);
  }
});

test('preview-generated creator channel flows are explicitly marked preview', () => {
  const generated = seedBundles.filter((bundle) => bundle.flow.id.startsWith('flow-preview-'));
  assert.ok(generated.length >= 400);
  assert.ok(generated.every((bundle) => bundle.flow.source_status === 'preview'));
});

test('creator channel summaries separate sample candidates from reviewed source inventory', () => {
  const summaries = getCreatorChannelSummaries(seedBundles);
  const samsung = summaries.find((summary) => summary.slug === 'samsung-service');
  const fitvely = summaries.find((summary) => summary.slug === 'fitvely');

  assert.ok(samsung);
  assert.ok(fitvely);
  assert.equal(samsung.sample_candidate_count, samsung.preview_flow_count);
  assert.ok(samsung.source_review_count >= samsung.real_flow_count);
  assert.ok(samsung.next_content_action.includes('원본'));
  assert.equal(fitvely.sample_candidate_count, fitvely.preview_flow_count);
  assert.ok(fitvely.sensitive_count > 0);
});
