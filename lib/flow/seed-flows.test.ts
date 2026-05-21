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
      source_title: '핏블리 다이어트 습관 콘텐츠 참고',
      source_url: 'https://fashionbiz.co.kr/article/204870',
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

  for (const bundle of real) {
    assert.ok(bundle.flow.source_url, `${bundle.flow.slug} missing source_url`);
    assert.ok(bundle.flow.source_title, `${bundle.flow.slug} missing source_title`);
    assert.ok(bundle.flow.source_checked_at, `${bundle.flow.slug} missing source_checked_at`);
    assert.ok(bundle.flow.conversion_note, `${bundle.flow.slug} missing conversion_note`);
    assert.ok(bundle.flow.source_precision, `${bundle.flow.slug} missing source_precision`);
    assert.ok(['exact', 'broad'].includes(bundle.flow.source_precision), bundle.flow.slug);
    const expectedItemCount = bundle.flow.tags?.includes('exact-video') ? 1 : 5;
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

    if (!bundle.flow.tags?.includes('exact-video')) {
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
          detail.how?.includes('마무리'),
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
  assert.equal(inferPrimaryDestination(diet), 'memo');
  assert.equal(inferPrimaryDestination(workoutPlan), 'hybrid');
  assert.equal(inferPrimaryDestination(qnet), 'hybrid');
});

test('preview-generated creator channel flows are explicitly marked preview', () => {
  const generated = seedBundles.filter((bundle) => bundle.flow.id.startsWith('flow-preview-'));
  assert.ok(generated.length >= 400);
  assert.ok(generated.every((bundle) => bundle.flow.source_status === 'preview'));
});
