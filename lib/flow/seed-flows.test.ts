import assert from 'node:assert/strict';
import test from 'node:test';
import curatedSourceAppSeed from '../../docs/content-audit/2026-07-01-curated-source-app-seed-v1.json';
import {
  getCreatorChannelSummaries,
  previewCreatorChannels,
  previewFlowBundles,
} from './creator-channel-preview';
import { inferPrimaryDestination } from './destination';
import { normalizeExecutionModel } from './execution-model';
import { getPublicFlowIndexingPolicy } from './route-indexing-policy';
import { seedBundles } from './seed-flows';
import { mergeSourceBackedMyFlowBundles } from './source-backed-my-flow';
import {
  collectUserFacingClaimText,
  findLegacySourceClaimCopy,
  findYearStampedSensitiveClaims,
} from './source-claim-freshness';
import { classifyFlowSourceFreshness, summarizeFlowSourceFreshness } from './source-freshness';
import { getSourceFitAudit, sourceFitAudits } from './source-fit';
import {
  classifySourceReachability,
  collectSourceReachabilityTargets,
  sourceReachabilityIsHardBroken,
  sourceReachabilityNeedsManualReview,
} from './source-reachability';
import { virtualUsers } from './users';

const curatedSourceAppSeedFlowSlugs = curatedSourceAppSeed.contentBundles.flatMap((bundle) =>
  bundle.flows.map((flow) => flow.slug),
);

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
    'washer-tub-clean-monthly',
    'water-purifier-filter-cycle',
    'wedding-d180-basic',
    'year-end-tax-docs',
    'monstera-care-routine',
  ];
  assert.ok(originalSlugs.every((slug) => slugs.has(slug)));
  assert.ok(seedBundles.every((bundle) => bundle.flow.status === 'published'));
  assert.ok(seedBundles.some((bundle) => bundle.flow.title === '이사 D-30 준비 Flow'));
  assert.ok(seedBundles.some((bundle) => bundle.flow.title === '초기 이유식 메뉴·레시피 Flow'));
  assert.ok(seedBundles.some((bundle) => bundle.flow.title === '해외여행 출국 준비 Flow'));
  assert.ok(seedBundles.some((bundle) => bundle.flow.title === '연말정산 서류 준비 Flow'));
});

test('curated source app seed bundles are part of the canonical seed pack', () => {
  assert.equal(curatedSourceAppSeed.contentBundles.length, 9);
  assert.equal(curatedSourceAppSeedFlowSlugs.length, curatedSourceAppSeed.totals.flows);

  const seedBySlug = new Map(seedBundles.map((bundle) => [bundle.flow.slug, bundle]));
  assert.deepEqual(
    curatedSourceAppSeedFlowSlugs.filter((slug) => !seedBySlug.has(slug)),
    [],
  );

  for (const contentBundle of curatedSourceAppSeed.contentBundles) {
    const recommended = seedBySlug.get(contentBundle.recommendedFlowId);
    assert.ok(recommended, contentBundle.bundleId);
    assert.equal(recommended.flow.tags?.includes('curated-source-app-seed'), true, contentBundle.bundleId);
    assert.equal(recommended.flow.tags?.includes(`flow-map:${contentBundle.bundleId}`), true, contentBundle.bundleId);
    assert.equal(recommended.itemDetails?.length, recommended.items.length, contentBundle.bundleId);
    assert.ok(recommended.items.length >= 1, contentBundle.bundleId);
  }
});

test('baby food seed keeps meal slots, recipes, caution, and reaction-log affordance data', () => {
  const baby = seedBundles.find((bundle) => bundle.flow.slug === 'baby-food-menu-recipe');

  assert.ok(baby);
  assert.equal(baby.flow.structure_type, 'phase');
  assert.equal(baby.flow.content_type, 'meal_plan');
  assert.equal(baby.flow.risk_level, 'medical_sensitive');
  assert.match(baby.flow.warning ?? '', /전문가 또는 공식 정보/);
  assert.doesNotMatch(
    `${baby.flow.description ?? ''} ${baby.flow.creator_note ?? ''} ${(baby.flow as typeof baby.flow & { setup_anchor_hint?: string }).setup_anchor_hint ?? ''}`,
    /반응 기록/,
  );
  assert.equal(baby.flow.primary_destination, 'calendar');
  assert.match(baby.flow.conversion_note ?? '', /3일 단위/);
  assert.equal(baby.mealSlots?.length, 11);
  assert.equal(baby.recipes?.length, 11);
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
  assert.ok(baby.mealSlots?.some((slot) => slot.menu_title === '콜리플라워미음' && slot.day_offset === 12));
  assert.ok(baby.mealSlots?.some((slot) => slot.menu_title === '소고기미음' && slot.day_offset === 30));
  assert.ok(baby.recipes?.some((recipe) => recipe.title === '쌀·오트밀 소고기 브로콜리미음'));
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
    'washer-tub-clean-monthly',
    'monstera-care-routine',
    'water-purifier-filter-cycle',
    'used-car-buying-check',
    'new-car-delivery-check',
    'car-care-monthly-routine',
    'wedding-d180-basic',
    'running-5k-4week',
    'plank-30-day-challenge',
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

test('promoted content-flow candidates ship as public executable seed routes', () => {
  const promoted = [
    {
      slug: 'washer-tub-clean-monthly',
      destination: 'calendar',
      terms: ['문 열어 건조', '고무패킹', '세제통', '배수필터', '설명서에서 허용한 종류와 양'],
    },
    {
      slug: 'monstera-care-routine',
      destination: 'calendar',
      terms: ['겉흙 2~3cm', '밝은 간접광', '배수구멍', '분갈이'],
    },
    {
      slug: 'water-purifier-filter-cycle',
      destination: 'sheet',
      terms: ['코크/출수구', '자가 살균', '물맛·냄새', 'RO/나노'],
    },
    {
      slug: 'wedding-d180-basic',
      destination: 'calendar',
      terms: ['D-300', '보증인원', '계약금', '청첩장', '식권', 'BGM', '역할 분담'],
    },
    {
      slug: 'plank-30-day-challenge',
      destination: 'calendar',
      terms: ['Day 1', '20초', 'Day 7', '휴식', 'Day 30', '150초', '호흡 3:3 패턴'],
    },
    {
      slug: 'alt-phone-sk7-self-activation',
      destination: 'internal_check',
      terms: ['유심', '유심 일련번호', '번호이동 사전동의', '재부팅', '통화', '데이터', '주민등록번호', '인증값'],
    },
    {
      slug: 'infant-health-checkup-prep',
      destination: 'hybrid',
      terms: ['검진 가능 기간', '검진기관', '문진표', '발달선별검사지', '등록번호 4자리', 'D-Day'],
    },
    {
      slug: 'chiangmai-solo-trip-packing',
      destination: 'hybrid',
      terms: ['혼자', '장기체류', '유심/eSIM', 'GLN', '여행자보험', '비상약', '압축팩', '필터 샤워기', '상품 추천'],
    },
    {
      slug: 'lease-contract-report-deadline',
      destination: 'hybrid',
      terms: ['계약 체결일 30일 이내', '보증금·월세', '방문/온라인 신고', '계약서 첨부', '전자서명', '신고필증', '확정일자'],
    },
    {
      slug: 'jeonse-contract-precheck-docs',
      destination: 'hybrid',
      terms: ['시세', '등기부등본', '전세보증보험', '표준계약서', '확정일자', '보류 사유', '법률 판단'],
    },
    {
      slug: 'elementary-school-entry-d30',
      destination: 'hybrid',
      terms: ['취학통지', '예비소집', '먼저 살 물건', '보류', '네임스티커', '등교 동선', '입학식'],
    },
    {
      slug: 'kids-printable-squishy-craft',
      destination: 'hybrid',
      terms: ['원문 도안 링크', '사용 조건', '도안 출력', '코팅 재료', '보호자가 미리 자를 부분', '완성 사진은 선택 메모', '다음 놀이 후보'],
    },
    {
      slug: 'remote-help-session-precheck',
      destination: 'internal_check',
      terms: ['요청자와 작업 범위', '화면 공유만으로 충분', '일회성 원격 제어', '접속값은 FlowMe에 저장하지 않기', '반복 접근', '세션 종료', '남은 권한'],
    },
    {
      slug: 'fridge-cleanout-weekly-plan',
      destination: 'sheet',
      terms: ['냉장고 지도', '우선 소진 재료', '메인 재료', '메뉴 후보', '신선 재료', '남은 요리', '냉동실', '장보기 보류'],
    },
    {
      slug: 'picture-book-reading-routine',
      destination: 'hybrid',
      terms: ['그림책', '질문 카드', '표지', '함께 읽기', '아이가 고른 장면', '아이 말', '다음 책'],
    },
    {
      slug: 'kids-dino-footprint-art',
      destination: 'hybrid',
      terms: ['공룡', '준비물', '발자국', '아이 말', '다음 놀이'],
    },
    {
      slug: 'banana-peanut-recipe-video',
      destination: 'internal_check',
      terms: ['바나나', '땅콩버터', '내열 용기', '원본 영상', '칼로리'],
    },
  ];

  for (const { slug, destination, terms } of promoted) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, slug);
    assert.equal(bundle.flow.status, 'published', slug);
    assert.equal(bundle.flow.primary_destination, destination, slug);
    assert.equal(bundle.itemDetails?.length, bundle.items.length, slug);
    assert.ok(bundle.flow.source_url?.startsWith('https://'), slug);

    const searchable = [
      bundle.flow.title,
      bundle.flow.description,
      bundle.flow.conversion_note,
      bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
      bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''}`).join(' '),
    ].join(' ');

    for (const term of terms) {
      assert.match(searchable, new RegExp(term), `${slug} missing ${term}`);
    }
  }
});

test('alt-phone self activation route stays a lightweight checklist without storing sensitive inputs', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'alt-phone-sk7-self-activation');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'internal_check');
  assert.equal(bundle.flow.structure_type, 'checklist');
  assert.equal(bundle.flow.anchor_type, 'none');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /개인정보와 인증값은 FLOW에 저장하지 않습니다/);
  assert.equal(bundle.items.length, 6);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);

  const text = [
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => item.title).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of ['셀프개통', '유심 일련번호', '번호이동 사전동의', '위약금', '재부팅', '통화', '문자', '데이터']) {
    assert.match(text, new RegExp(cue));
  }
  assert.doesNotMatch(text, /주민등록번호.*입력 필드|인증번호.*입력 필드|카드 정보.*입력 필드|요금제.*추천합니다/);
});

test('infant health checkup route stays a visit-prep timeline without medical result tracking', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'infant-health-checkup-prep');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'hybrid');
  assert.equal(bundle.flow.structure_type, 'timeline');
  assert.equal(bundle.flow.anchor_type, 'end_date');
  assert.equal(bundle.flow.risk_level, 'medical_sensitive');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /D-14 기간 확인/);
  assert.equal(bundle.items.length, 6);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);
  assert.ok(bundle.itemDetails?.every((detail) => detail.links?.some((link) => link.type === 'official')));

  const text = [
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of ['검진 가능 기간', '문진표', '발달선별검사지', '등록번호 4자리', '검진기관 예약', '검진기관 방문']) {
    assert.match(text, new RegExp(cue));
  }
  assert.doesNotMatch(text, /성장 평가 입력|검진 결과 점수|진단 결과 기록|치료 계획 작성/);
});

test('chiangmai solo trip route stays a long-stay travel prep checklist without product or safety guarantees', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'chiangmai-solo-trip-packing');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'hybrid');
  assert.equal(bundle.flow.structure_type, 'timeline');
  assert.equal(bundle.flow.anchor_type, 'end_date');
  assert.equal(bundle.flow.risk_level, 'medium');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /D-7 통신\/결제/);
  assert.equal(bundle.items.length, 6);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);
  assert.ok(bundle.itemDetails?.every((detail) => detail.links?.some((link) => link.type === 'creator')));

  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of ['혼자', '장기체류', '유심/eSIM', 'GLN', '여행자보험', '비상약', '압축팩', '필터 샤워기']) {
    assert.match(text, new RegExp(cue));
  }
  assert.doesNotMatch(text, /상품 구매.*필수입니다|보험.*보장합니다|안전.*보장합니다|결제 가능.*보장합니다/);
});

test('lease contract report route stays an official-deadline calendar without storing private contract data', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'lease-contract-report-deadline');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'hybrid');
  assert.equal(bundle.flow.structure_type, 'timeline');
  assert.equal(bundle.flow.anchor_type, 'start_date');
  assert.equal(bundle.flow.risk_level, 'financial_sensitive');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /D\+30 접수·필증 확인/);
  assert.equal(bundle.items.length, 6);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);
  assert.ok(bundle.itemDetails?.every((detail) => detail.links?.some((link) => link.type === 'official')));

  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of ['계약 체결일 30일 이내', '보증금·월세', '관할 주민센터', 'RTMS', '정부24', '전자서명', '신고필증', '확정일자']) {
    assert.match(text, new RegExp(cue));
  }
  assert.doesNotMatch(text, /주민등록번호.*입력 필드로 요구|인증번호.*입력 필드로 요구|계약 상세 금액.*입력 필드로 요구|주민등록번호.*저장합니다|인증번호.*저장합니다|계약 상세 금액.*저장합니다|법적 효력.*보장합니다|과태료.*확정 판단합니다/);
});

test('jeonse contract precheck route keeps contract decisions outside FLOW and makes hold a normal outcome', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'jeonse-contract-precheck-docs');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'hybrid');
  assert.equal(bundle.flow.structure_type, 'checklist');
  assert.equal(bundle.flow.anchor_type, 'start_date');
  assert.equal(bundle.flow.risk_level, 'financial_sensitive');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /D-Day 계약서 정보 일치 확인/);
  assert.equal(bundle.items.length, 7);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);
  assert.ok(bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.url.includes('contents.kakaopay.com'))));
  assert.ok(bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.type === 'official')));

  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of ['시세', '등기부등본', '근저당', '압류', '전세보증보험', '중개사', '표준계약서', '확정일자', '임대차신고', '보류 사유']) {
    assert.match(text, new RegExp(cue));
  }
  assert.match(text, /법률 판단/);
  assert.match(text, /보류는 실패가 아니라 정상 결과/);
  assert.doesNotMatch(
    text,
    /계약해도 됩니다|계약 안전 점수|법률 판단을 제공합니다|주민등록번호 입력 필드|계좌번호 입력 필드|계약서 원문을 저장합니다|보증보험 가입 가능을 보장합니다/,
  );
});

test('elementary school entry route stays official-first without storing child data', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'elementary-school-entry-d30');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'hybrid');
  assert.equal(bundle.flow.structure_type, 'timeline');
  assert.equal(bundle.flow.anchor_type, 'end_date');
  assert.equal(bundle.flow.risk_level, 'medium');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /D-30 취학통지·예비소집/);
  assert.equal(bundle.items.length, 5);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);
  assert.ok(bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.type === 'official')));
  assert.ok(bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.type === 'creator')));

  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of ['취학통지', '예비소집', '먼저 살 물건', '학교 안내 전 보류', '네임스티커', '등교 동선', '입학식 가방']) {
    assert.match(text, new RegExp(cue));
  }
  assert.match(text, /보류는 누락이 아니라 정상 상태/);
  assert.doesNotMatch(
    text,
    /주민등록번호.*입력 필드|취학통지서 이미지.*업로드하라고|취학통지서 이미지.*업로드 필드|건강 정보.*입력 필드|지원금 세부 금액.*입력 필드|교실.*담임.*저장합니다|준비물 구매를 추천합니다|예방접종.*입력|예방접종.*저장합니다|예방접종.*저장하게/,
  );
});

test('elementary school entry route keeps the first item official-only and D-14 hold normal', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'elementary-school-entry-d30');

  assert.ok(bundle);

  const firstItem = bundle.items[0];
  const holdItem = bundle.items.find((item) => item.title === '학교 안내 전 보류할 물건 표시하기');

  assert.equal(firstItem.title, '취학통지와 예비소집 안내 확인하기');
  assert.equal(firstItem.day_offset, -30);
  assert.equal(firstItem.source_type, 'official');

  const firstDetail = bundle.itemDetails?.find((detail) => detail.item_id === firstItem.id);
  assert.ok(firstDetail);
  assert.ok(firstDetail.links?.every((link) => link.type === 'official'));
  assert.match(`${firstDetail.why} ${firstDetail.how}`, /첫 행동은 준비물 구매가 아니라 공식 취학통지와 학교 예비소집 안내/);
  assert.doesNotMatch(`${firstDetail.why} ${firstDetail.how}`, /상품|지원금 금액|예방접종|건강 기록/);

  assert.ok(holdItem);
  assert.equal(holdItem.day_offset, -14);
  assert.notEqual(holdItem.source_type, 'official');

  const holdDetail = bundle.itemDetails?.find((detail) => detail.item_id === holdItem.id);
  assert.ok(holdDetail);
  assert.match(`${holdDetail.description} ${holdDetail.how}`, /학교 안내 전|보류/);
  assert.match(holdDetail.caution ?? '', /보류는 누락이 아니라 정상 상태/);
});

test('kids printable squishy route keeps creator material as source link without copying files', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'kids-printable-squishy-craft');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'hybrid');
  assert.equal(bundle.flow.structure_type, 'timeline');
  assert.equal(bundle.flow.anchor_type, 'start_date');
  assert.equal(bundle.flow.risk_level, 'low');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /놀이 날짜/);
  assert.equal(bundle.items.length, 7);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);
  assert.ok(bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.url.includes('blog.naver.com'))));

  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of ['원문 도안 링크', '사용 조건', '도안 출력', '코팅 재료', '보호자가 미리 자를 부분', '스퀴시 만들기', '완성 사진은 선택 메모', '다음 놀이 후보']) {
    assert.match(text, new RegExp(cue));
  }

  assert.match(text, /도안 이미지.*파일.*원문/);
  assert.doesNotMatch(
    text,
    /도안 이미지 업로드|PDF 업로드|비밀번호 입력 필드|다운로드 파일 저장 필드|아이 사진.*필수|교육 평가 기록을 저장합니다|발달 개선을 보장합니다/,
  );
});

test('remote help session route stays a permission checklist without storing access values', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'remote-help-session-precheck');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'internal_check');
  assert.equal(bundle.flow.structure_type, 'checklist');
  assert.equal(bundle.flow.anchor_type, 'none');
  assert.equal(bundle.flow.risk_level, 'medium');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /요청자, 작업 범위, 권한 방식, 종료 확인/);
  assert.equal(bundle.items.length, 6);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);

  const officialHosts = new Set(
    bundle.itemDetails
      ?.flatMap((detail) => detail.links ?? [])
      .map((link) => new URL(link.url).hostname.replace(/^www\./, '')),
  );

  for (const host of [
    'support.anydesk.com',
    'support.google.com',
    'support.zoom.com',
    'learn.microsoft.com',
    'teamviewer.com',
  ]) {
    assert.ok(officialHosts.has(host), `missing official host ${host}`);
  }

  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of [
    '요청자와 작업 범위',
    '화면 공유만으로 충분',
    '일회성 원격 제어',
    '접속값은 FlowMe에 저장하지 않기',
    '반복 접근',
    '담당자와 해지일',
    '세션 종료',
    '남은 권한',
    '공유 중지',
  ]) {
    assert.match(text, new RegExp(cue));
  }

  assert.doesNotMatch(
    text,
    /AnyDesk ID.*입력 필드|TeamViewer.*세션값.*입력 필드|확인 코드.*저장합니다|세션 URL.*저장합니다|비밀번호.*저장합니다|토큰.*저장합니다|스크린샷.*저장합니다|채팅.*저장합니다|기기 목록.*저장합니다|보안.*보장합니다|사기.*판정합니다|원격지원.*연동합니다|무인 접속 설정을 대신합니다/,
  );
});

test('fridge cleanout weekly route stays a lightweight inventory sheet without diet or savings guarantees', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'fridge-cleanout-weekly-plan');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'sheet');
  assert.equal(bundle.flow.structure_type, 'checklist');
  assert.equal(bundle.flow.anchor_type, 'start_date');
  assert.equal(bundle.flow.risk_level, 'medium');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /7일 재고 소진표/);
  assert.equal(bundle.items.length, 6);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);
  assert.match(bundle.flow.source_url ?? '', /smilellama\.tistory\.com/);
  assert.ok(bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.url.includes('aruma16.tistory.com'))));

  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.description ?? ''} ${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of [
    '냉장고 지도',
    '우선 소진 재료 3개',
    '메인 재료',
    '메뉴 후보',
    '신선 재료',
    '남은 요리',
    '냉동실',
    '장보기 보류',
    '폐기/확인',
  ]) {
    assert.match(text, new RegExp(cue));
  }

  assert.doesNotMatch(
    text,
    /월 10만 원.*보장합니다|식비.*절약.*보장합니다|영양.*처방|영양.*보장합니다|다이어트.*성공|칼로리.*목표|체중.*감량|섭취 가능.*판단합니다|상한 음식.*먹/,
  );
});

test('picture book reading route stays a question-card routine without learning assessment bloat', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'picture-book-reading-routine');

  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'hybrid');
  assert.equal(bundle.flow.structure_type, 'routine');
  assert.equal(bundle.flow.anchor_type, 'start_date');
  assert.equal(bundle.flow.risk_level, 'low');
  assert.match(bundle.flow.setup_anchor_hint ?? '', /질문 카드/);
  assert.equal(bundle.items.length, 6);
  assert.equal(bundle.itemDetails?.length, bundle.items.length);
  assert.ok(bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.type === 'creator')));
  assert.ok(bundle.itemDetails?.some((detail) => detail.links?.some((link) => link.type === 'official')));

  const text = [
    bundle.flow.title,
    bundle.flow.description,
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');

  for (const cue of ['그림책', '질문 카드', '표지', '함께 읽기', '아이가 고른 장면', '아이 말', '다음 책']) {
    assert.match(text, new RegExp(cue));
  }
  assert.doesNotMatch(text, /독해 점수.*입력하게|발달 평가.*입력하게|독서 수준.*판정합니다|학습 성과.*보장합니다|권장도서 목록 전체.*캘린더에 배치/);
});

test('plank challenge route preserves the original day-by-day table as calendar items', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'plank-30-day-challenge');
  assert.ok(bundle);
  assert.equal(bundle.flow.primary_destination, 'calendar');
  assert.equal(bundle.flow.anchor_type, 'start_date');
  assert.equal(bundle.items.length, 30);

  const day1 = bundle.items.find((item) => item.id === 'plank-day-1');
  const restDay = bundle.items.find((item) => item.id === 'plank-day-7');
  const finalDay = bundle.items.find((item) => item.id === 'plank-day-30');
  assert.ok(day1);
  assert.ok(restDay);
  assert.ok(finalDay);
  assert.equal(day1.day_offset, 0);
  assert.equal(restDay.day_offset, 6);
  assert.equal(finalDay.day_offset, 29);
  assert.match(day1.title, /20초/);
  assert.match(restDay.title, /휴식/);
  assert.match(finalDay.title, /150초/);

  const searchable = [
    bundle.flow.conversion_note,
    bundle.flow.warning,
    bundle.items.map((item) => `${item.title} ${item.description ?? ''}`).join(' '),
    bundle.itemDetails?.map((detail) => `${detail.why ?? ''} ${detail.how ?? ''} ${detail.completion_criteria ?? ''} ${detail.caution ?? ''}`).join(' '),
  ].join(' ');
  assert.match(searchable, /Day 7·19·27 휴식일/);
  assert.match(searchable, /호흡 3:3 패턴/);
  assert.match(searchable, /어지러움|호흡 곤란|전문가/);
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
      /D-30 캘린더|실행 항목 메모|캘린더 일정|엑셀|실기 환경|시험장 준비/,
      `${item.title} should point to a concrete study artifact`,
    );
    assert.doesNotMatch(
      portableAction,
      /챕터 진도표|모의점수 로그|기출 점수·오답 기록/,
      `${item.title} should not mention removed study artifacts`,
    );
  }

  const firstItem = study.items.find((item) => item.title === '필기와 실기 시험 범위 나누기');
  const firstDetail = study.itemDetails?.find((entry) => entry.item_id === firstItem?.id);
  assert.match(firstDetail?.completion_criteria ?? '', /D-30 캘린더/);
});

test('diet habit route is reduced to one 14-day sleep check rule', () => {
  const diet = seedBundles.find((entry) => entry.flow.slug === 'diet-habit-2week');

  assert.ok(diet);
  assert.equal(diet.flow.title, '2주 수면 체크 Flow');
  assert.match(diet.flow.description, /8시간 이상 자기/);
  assert.equal(diet.sections.length, 1);
  assert.equal(diet.items.length, 1);
  assert.equal(diet.items[0]?.title, '14일 동안 8시간 이상 자기 체크하기');
  assert.deepEqual(diet.repeatRules, ['매일 체크', '14일']);
  assert.match(diet.flow.warning ?? '', /감량 처방|치료/);
  assert.ok(
    diet.itemDetails?.every((detail) =>
      `${detail.why} ${detail.how} ${detail.completion_criteria} ${detail.caution ?? ''}`.includes('수면 체크표'),
    ),
  );

  for (const item of diet.items) {
    assert.doesNotMatch(item.title, /식사|물|컨디션|운동/);
    assert.doesNotMatch(item.description ?? '', /식사|물|컨디션|운동/);
  }
});

test('new car route stays a field checklist with abnormal-response detail', () => {
  const newCar = seedBundles.find((entry) => entry.flow.slug === 'new-car-delivery-check');

  assert.ok(newCar);
  assert.match(newCar.flow.description, /현장 체크리스트|이상 시 대응/);
  assert.match(newCar.flow.warning ?? '', /서명|인수 확정/);
  assert.ok(newCar.items.length >= 8);

  const detailText = newCar.itemDetails
    ?.map((detail) => `${detail.why} ${detail.how} ${detail.completion_criteria} ${detail.caution ?? ''}`)
    .join('\n') ?? '';
  assert.match(detailText, /이상 시|딜러 확인|서명/);
  assert.match(detailText, /현장 체크리스트|사진/);
});

test('used car route warns that the checklist does not guarantee vehicle condition', () => {
  const usedCar = seedBundles.find((entry) => entry.flow.slug === 'used-car-buying-check');

  assert.ok(usedCar);
  assert.match(usedCar.flow.warning ?? '', /차량 상태를 보증하지 않습니다/);
  assert.match(usedCar.flow.warning ?? '', /공식 조회와 전문가 점검/);
});

test('validation fix routes expose route-specific setup anchors and safety metadata', () => {
  const expectedAnchors = [
    ['computer-skills-d30-study', '시험일'],
    ['diet-habit-2week', '체크 시작일'],
    ['new-car-delivery-check', '인수일 기록'],
    ['moving-d30-basic', '이사일'],
    ['baby-food-menu-recipe', '이유식 시작일'],
    ['used-car-buying-check', '현장 체크 시작'],
    ['water-purifier-filter-cycle', '필터 주기표 작성'],
    ['passport-renewal-docs', '접수일 기록'],
    ['real-thankyou-bubu-home-workout-starter', '운동 시작일'],
    ['real-fitvely-diet-record-routine', '기록 시작일'],
    ['vehicle-inspection-prep', '검사일'],
    ['real-mofa-overseas-travel-prep', '출국일'],
  ];

  for (const [slug, label] of expectedAnchors) {
    const bundle = seedBundles.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, slug);
    const flow = bundle.flow as typeof bundle.flow & {
      setup_anchor_label?: string;
      setup_anchor_hint?: string;
    };
    assert.equal(flow.setup_anchor_label, label, `${slug} should expose a route-specific setup anchor label`);
    assert.ok(flow.setup_anchor_hint && flow.setup_anchor_hint.length >= 12, `${slug} should explain how the anchor is used`);
  }

  const diet = seedBundles.find((entry) => entry.flow.slug === 'diet-habit-2week');
  const newCar = seedBundles.find((entry) => entry.flow.slug === 'new-car-delivery-check');
  const usedCar = seedBundles.find((entry) => entry.flow.slug === 'used-car-buying-check');
  const study = seedBundles.find((entry) => entry.flow.slug === 'computer-skills-d30-study');
  assert.ok(diet);
  assert.ok(newCar);
  assert.ok(usedCar);
  assert.ok(study);

  const dietFlow = diet.flow as typeof diet.flow & {
    stop_conditions?: string[];
    principles?: string[];
  };
  assert.ok(dietFlow.stop_conditions?.some((condition) => condition.includes('어지러움') || condition.includes('치료')));
  assert.ok(dietFlow.principles?.some((principle) => principle.includes('수면') && principle.includes('처방')));
  assert.ok(!diet.items.some((item) => item.title.includes('중단') || item.title.includes('상담')), 'stop/consult guidance should not be a checklist item');

  const newCarFlow = newCar.flow as typeof newCar.flow & {
    hold_section?: {
      title: string;
      reasons: string[];
      consequence: string;
      memo_template: string;
    };
  };
  assert.equal(newCarFlow.hold_section?.title, '인수 보류 기준');
  assert.ok(newCarFlow.hold_section?.reasons.some((reason) => reason.includes('사진 파일명')));
  assert.match(newCarFlow.hold_section?.memo_template ?? '', /딜러 확인|서명 보류/);
  assert.ok(newCar.items.some((item) => item.hold_eligible && item.photo_filename_pattern && item.status === 'check'));

  const usedCarFlow = usedCar.flow as typeof usedCar.flow & {
    hold_section?: {
      title: string;
      reasons: string[];
      consequence: string;
      memo_template: string;
    };
  };
  assert.equal(usedCarFlow.hold_section?.title, '구매 보류 메모');
  assert.ok(usedCarFlow.hold_section?.reasons.some((reason) => reason.includes('성능점검기록부') || reason.includes('보험이력')));
  assert.match(usedCarFlow.hold_section?.memo_template ?? '', /공식 조회|전문가 점검|보류 사유/);
  assert.ok(usedCar.items.some((item) => item.hold_eligible && item.status === 'check' && item.title.includes('계약서')));

  const d1Item = study.items.find((item) => item.day_offset === -1);
  const d1Section = study.sections.find((section) => section.id === d1Item?.section_id);
  assert.equal(d1Section?.title, 'D-1 최종 확인');
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
      category: '생활/수면',
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

test('unapproved legacy flows remain in needs-review inventory', () => {
  const needsReviewSlugs = [
    'job-change-risk-check',
    'year-end-tax-docs',
    'national-health-checkup-d7',
    'business-registration-basic',
    'driver-license-renewal-check',
    'happy-birth-service-check',
    'vaccination-certificate-issue',
    'family-certificate-issue',
    'resident-register-copy-issue',
    'industrial-accident-claim-docs',
    'diet-habit-2week',
    'qnet-exam-application-prep',
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

test('normal user routes fail the standard suite when source review is due', () => {
  const summary = summarizeFlowSourceFreshness(seedBundles, new Date());
  const attention = summary.attention
    .slice(0, 20)
    .map((entry) => `${entry.slug}:${entry.bucket}:${entry.checkedAt ?? 'missing'}`)
    .join(', ');

  assert.equal(summary.missingMetadataCount, 0, attention);
  assert.equal(summary.reviewDueCount, 0, attention);
  assert.equal(summary.staleCount, 0, attention);
});

test('standard source freshness gate rejects future and malformed review metadata', () => {
  const moving = seedBundles.find((bundle) => bundle.flow.slug === 'moving-d30-basic');
  assert.ok(moving);
  const asOf = new Date('2026-07-11T12:00:00+09:00');
  const future = {
    ...moving,
    flow: { ...moving.flow, source_checked_at: '2026-07-12' },
  };
  const malformed = {
    ...moving,
    flow: { ...moving.flow, source_url: 'not-a-url', source_precision: undefined },
  };

  assert.deepEqual(classifyFlowSourceFreshness(future, asOf).missingFields, [
    'source_checked_at_future',
  ]);
  assert.deepEqual(classifyFlowSourceFreshness(malformed, asOf).missingFields, [
    'source_url',
    'source_precision',
  ]);
});

test('source reachability policy separates hard link rot from redirects and external blocking', () => {
  assert.equal(
    classifySourceReachability({
      sourceUrl: 'https://example.com/source',
      finalUrl: 'https://example.com/source',
      status: 200,
    }),
    'reachable',
  );
  assert.equal(
    classifySourceReachability({
      sourceUrl: 'https://example.com/source',
      finalUrl: 'https://example.org/current',
      status: 200,
    }),
    'redirected',
  );
  assert.equal(
    classifySourceReachability({ sourceUrl: 'https://example.com/source', status: 403 }),
    'access_blocked',
  );
  assert.equal(
    classifySourceReachability({ sourceUrl: 'https://example.com/source', status: 404 }),
    'not_found',
  );
  assert.equal(sourceReachabilityIsHardBroken('not_found'), true);
  assert.equal(sourceReachabilityIsHardBroken('access_blocked'), false);
  assert.equal(sourceReachabilityNeedsManualReview('redirected'), true);
  assert.equal(sourceReachabilityNeedsManualReview('reachable'), false);
});

test('source reachability targets include user-facing item detail links', () => {
  const published = mergeSourceBackedMyFlowBundles(seedBundles).filter(
    (bundle) => bundle.flow.status === 'published',
  );
  const userRoutes = published.filter((bundle) => {
    const exposure = normalizeExecutionModel(bundle).exposureStatus;
    return exposure !== 'catalog_preview' && exposure !== 'hidden';
  });
  const targets = collectSourceReachabilityTargets(userRoutes);
  const primaryTargets = targets.filter((target) => target.linkRoles.includes('flow_source'));
  const detailTargets = targets.filter((target) => target.linkRoles.includes('item_detail'));
  const eFamily = targets.find(
    (target) =>
      target.sourceUrl ===
      'https://efamily.scourt.go.kr/cs/CsBltnWrtGuide.do?bltnbordId=0000008&guideCd=0000008001&guideYn=Y',
  );
  const washer = targets.find(
    (target) =>
      target.sourceUrl ===
      'https://raga-t.com/entry/%EC%84%B8%ED%83%81%EA%B8%B0-%ED%86%B5%EC%84%B8%EC%B2%99-%EB%B0%A9%EB%B2%95-%EC%99%84%EB%B2%BD-%EA%B0%80%EC%9D%B4%EB%93%9C',
  );

  assert.ok(detailTargets.length > 0);
  assert.ok(targets.length > primaryTargets.length);
  assert.deepEqual(eFamily?.linkRoles, ['item_detail']);
  assert.ok(eFamily?.slugs.includes('birth-registration-prep'));
  assert.deepEqual(washer?.linkRoles, ['flow_source', 'item_detail']);
});

test('source-fit audit links stay aligned with the current public source', () => {
  const bundlesBySlug = new Map(
    mergeSourceBackedMyFlowBundles(seedBundles).map((bundle) => [bundle.flow.slug, bundle]),
  );
  const mismatches = sourceFitAudits.flatMap((audit) => {
    const bundle = bundlesBySlug.get(audit.slug);
    if (!bundle?.flow.source_url || bundle.flow.source_url === audit.sourceUrl) return [];
    return [{ slug: audit.slug, bundleUrl: bundle.flow.source_url, auditUrl: audit.sourceUrl }];
  });

  assert.deepEqual(mismatches, []);
});

test('manual source-fit approval clears stale source review status', () => {
  const staleApproved = mergeSourceBackedMyFlowBundles(seedBundles)
    .filter((bundle) => getSourceFitAudit(bundle.flow.slug)?.decision === 'keep_representative')
    .filter((bundle) => bundle.flow.source_status === 'needs_review')
    .map((bundle) => bundle.flow.slug);

  assert.deepEqual(staleApproved, []);
});

test('public Flow indexing exposes only source-fit approved or exact real-source pages', () => {
  const published = mergeSourceBackedMyFlowBundles(seedBundles).filter(
    (bundle) => bundle.flow.status === 'published',
  );
  const indexable = published.filter((bundle) => getPublicFlowIndexingPolicy(bundle).indexable);
  const reviewOnly = published.filter((bundle) => !getPublicFlowIndexingPolicy(bundle).indexable);
  const bySlug = new Map(published.map((bundle) => [bundle.flow.slug, bundle]));

  assert.equal(indexable.length, 66);
  assert.equal(reviewOnly.length, 551);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('vehicle-inspection-prep')!).indexable, true);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('source-backed-moving-d30')!).indexable, true);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('new-car-delivery-check')!).indexable, true);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('first-passport-issue')!).indexable, true);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('closet-organize-1day')!).indexable, true);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('portfolio-4week')!).indexable, true);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('weekly-meal-plan')!).indexable, true);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('health-insurance-dependent')!).indexable, false);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('book-finish-one')!).indexable, false);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('skin-weekly-check')!).indexable, false);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('citizen-secretary-alerts')!).indexable, false);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('domestic-trip-d7')!).indexable, false);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('source-backed-baby-vaccination-schedule')!).indexable, false);
  assert.equal(getPublicFlowIndexingPolicy(bySlug.get('new-apartment-precheck')!).indexable, false);
});

test('current source-fit batch removes stale and source-invented user copy', () => {
  const bySlug = new Map(seedBundles.map((bundle) => [bundle.flow.slug, bundle]));
  const passport = bySlug.get('first-passport-issue')!;
  const citizenSecretary = bySlug.get('citizen-secretary-alerts')!;
  const closet = bySlug.get('closet-organize-1day')!;
  const domesticTrip = bySlug.get('domestic-trip-d7')!;
  const portfolio = bySlug.get('portfolio-4week')!;

  assert.match(passport.flow.raw_text ?? '', /3\.5cm×세로 4\.5cm/);
  assert.doesNotMatch(passport.flow.raw_text ?? '', /413×531/);
  assert.doesNotMatch(citizenSecretary.flow.raw_text ?? '', /100여 종|PASS·공동인증서/);
  assert.doesNotMatch(closet.flow.raw_text ?? '', /새 옷 1개|보통 1년 이상/);

  assert.equal(domesticTrip.flow.structure_type, 'checklist');
  assert.equal(domesticTrip.flow.anchor_type, 'none');
  assert.equal(domesticTrip.flow.primary_destination, 'memo');
  assert.ok(domesticTrip.items.every((item) => item.day_offset === undefined));
  assert.doesNotMatch(domesticTrip.flow.raw_text ?? '', /예약 취소 정책|관광지 운영시간|가스 밸브/);

  assert.equal(portfolio.flow.title, '개발 프로젝트 포트폴리오 4주 Flow');
  assert.deepEqual(
    portfolio.items.map((item) => item.day_offset),
    [-28, -25, -21, -20, -7, -1],
  );
  assert.doesNotMatch(portfolio.flow.raw_text ?? '', /STAR|노션·피그마·PDF/);

  assert.equal(getSourceFitAudit('first-passport-issue')?.decision, 'keep_representative');
  assert.equal(getSourceFitAudit('closet-organize-1day')?.decision, 'keep_representative');
  assert.equal(getSourceFitAudit('portfolio-4week')?.decision, 'keep_representative');
  assert.equal(getSourceFitAudit('citizen-secretary-alerts')?.decision, 'catalog_preview_only');
  assert.equal(getSourceFitAudit('domestic-trip-d7')?.decision, 'reshape_before_featured');
});

test('published user routes record source freshness while preview library stays separate', () => {
  const published = seedBundles.filter((bundle) => bundle.flow.status === 'published');
  const userRoutes = published.filter((bundle) => {
    const exposure = normalizeExecutionModel(bundle).exposureStatus;
    return exposure !== 'catalog_preview' && exposure !== 'hidden';
  });
  const previewOrHidden = published.filter((bundle) => {
    const exposure = normalizeExecutionModel(bundle).exposureStatus;
    return exposure === 'catalog_preview' || exposure === 'hidden';
  });

  assert.ok(userRoutes.length >= 130);
  assert.ok(previewOrHidden.length >= 400);

  const demotedPreviewSlugs = [
    'digital-detox-weekly',
    'japan-esim-setup-before-departure',
    'kids-dino-footprint-art',
    'new-apartment-precheck',
    'new-hobby-30day',
    'picture-book-reading-routine',
  ];
  for (const slug of demotedPreviewSlugs) {
    const bundle = published.find((entry) => entry.flow.slug === slug);
    assert.ok(bundle, `${slug} missing`);
    assert.equal(normalizeExecutionModel(bundle).exposureStatus, 'catalog_preview', slug);
  }

  for (const bundle of userRoutes) {
    assert.ok(bundle.flow.source_url?.startsWith('https://'), `${bundle.flow.slug} missing source_url`);
    assert.ok(bundle.flow.source_checked_at, `${bundle.flow.slug} missing source_checked_at`);
    assert.ok(
      bundle.flow.source_precision === 'exact' || bundle.flow.source_precision === 'broad',
      `${bundle.flow.slug} missing source_precision`,
    );
  }
});

test('normal sensitive routes keep year-stamped policy values out of user-facing copy', () => {
  const published = mergeSourceBackedMyFlowBundles(seedBundles).filter(
    (bundle) => bundle.flow.status === 'published',
  );
  const userRoutes = published.filter((bundle) => {
    const exposure = normalizeExecutionModel(bundle).exposureStatus;
    return exposure !== 'catalog_preview' && exposure !== 'hidden';
  });

  assert.deepEqual(findYearStampedSensitiveClaims(userRoutes), []);

  const sample = userRoutes.find((bundle) => bundle.flow.risk_level !== 'low');
  assert.ok(sample);
  const synthetic = {
    ...sample,
    flow: {
      ...sample.flow,
      warning: '2026년 기준 지원금은 10만원입니다.',
    },
  };
  assert.equal(findYearStampedSensitiveClaims([synthetic]).length, 1);
});

test('normal routes keep known source contradictions out of user-facing copy', () => {
  const published = mergeSourceBackedMyFlowBundles(seedBundles).filter(
    (bundle) => bundle.flow.status === 'published',
  );
  const userRoutes = published.filter((bundle) => {
    const exposure = normalizeExecutionModel(bundle).exposureStatus;
    return exposure !== 'catalog_preview' && exposure !== 'hidden';
  });

  assert.deepEqual(findLegacySourceClaimCopy(userRoutes), []);

  const sample = userRoutes.find((bundle) => bundle.flow.slug === 'payday-finance-routine');
  assert.ok(sample);
  const synthetic = {
    ...sample,
    flow: {
      ...sample.flow,
      description: '생활비 40% / 저축·투자 40% / 비상금 20%로 나눕니다.',
    },
  };
  assert.equal(findLegacySourceClaimCopy([synthetic]).length, 1);
});

test('reviewed numeric claims preserve official deadlines without service or source mismatch', () => {
  const bySlug = (slug: string) => {
    const bundle = mergeSourceBackedMyFlowBundles(seedBundles).find(
      (entry) => entry.flow.slug === slug,
    );
    assert.ok(bundle, `missing ${slug}`);
    return {
      bundle,
      copy: collectUserFacingClaimText(bundle).join('\n'),
    };
  };

  const birth = bySlug('birth-registration-prep');
  assert.match(birth.copy, /온라인 신고 참여 병원/u);
  assert.match(birth.copy, /전자가족관계등록시스템/u);
  assert.doesNotMatch(birth.copy, /정부24\s*\(온라인\)[^\n]{0,80}출생신고/u);

  const inheritance = bySlug('safe-inheritance-onestop');
  assert.match(inheritance.copy, /말일부터 1년 이내/u);
  assert.doesNotMatch(inheritance.copy, /일부 재산[^\n]{0,80}6개월/u);

  const payday = bySlug('payday-finance-routine');
  assert.match(payday.copy, /비율[^\n]{0,80}직접 정/u);
  assert.doesNotMatch(payday.copy, /생활비\s*40%[^\n]{0,80}비상금\s*20%/u);

  const passport = bySlug('passport-renewal-docs');
  assert.equal(
    passport.bundle.flow.source_url,
    'https://www.passport.go.kr/home/kor/contents.do?menuPos=7',
  );
  assert.equal(passport.bundle.flow.source_checked_at, '2026-07-11');
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
  const real = seedBundles.filter(
    (bundle) =>
      bundle.flow.source_status === 'real' &&
      bundle.flow.id.startsWith('flow-real-') &&
      !bundle.flow.tags?.includes('curated-source-app-seed'),
  );
  assert.ok(real.length >= 20);
  const customRealSourceItemCounts = new Map<string, number>([
    ['real-fitvely-diet-record-routine', 3],
  ]);

  for (const bundle of real) {
    assert.ok(bundle.flow.source_url, `${bundle.flow.slug} missing source_url`);
    assert.ok(bundle.flow.source_title, `${bundle.flow.slug} missing source_title`);
    assert.ok(bundle.flow.source_checked_at, `${bundle.flow.slug} missing source_checked_at`);
    assert.ok(bundle.flow.conversion_note, `${bundle.flow.slug} missing conversion_note`);
    assert.ok(bundle.flow.source_precision, `${bundle.flow.slug} missing source_precision`);
    assert.ok(['exact', 'broad'].includes(bundle.flow.source_precision), bundle.flow.slug);
    const expectedItemCount = customRealSourceItemCounts.get(bundle.flow.slug) ?? (bundle.flow.tags?.includes('exact-video') ? 1 : 5);
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

    if (!bundle.flow.tags?.includes('exact-video') && !customRealSourceItemCounts.has(bundle.flow.slug)) {
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
  const slugs = [
    'real-thankyou-bubu-video-full-body-no-jump',
    'real-thankyou-bubu-video-daily-stretch-9min',
    'real-thankyou-bubu-video-belly-side-all-in-one',
    'real-thankyou-bubu-video-no-knee-cardio-strength',
    'real-thankyou-bubu-video-arm-back-shoulder',
    'real-thankyou-bubu-video-waist-8cm',
    'real-thankyou-bubu-video-8min-cardio',
    'real-thankyou-bubu-video-3min-arm',
    'real-thankyou-bubu-video-3min-abs',
    'real-thankyou-bubu-video-lower-belly-8min',
    'real-thankyou-bubu-home-workout-starter',
    'real-thankyou-bubu-20min-routine',
  ];

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
    'real-fitvely-video-weight-class-method',
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
    assert.match(detail.how ?? '', /첫 행동:/, `${slug} should start with a concrete first action`);
    assert.match(detail.how ?? '', /적용 전 기록:/, `${slug} should say what to capture before applying the rule`);
    assert.match(detail.how ?? '', /적용 후 기록:/, `${slug} should say what to capture after applying the rule`);
    assert.match(detail.how ?? '', /유지\/중단 결정/, `${slug} should make the keep-or-stop decision portable`);
    assert.match(
      detail.completion_criteria ?? '',
      /적용 전.*적용 후.*유지\/중단/s,
      `${slug} completion criteria should be usable from an exported reminder or sheet row`,
    );
    assert.match(detail.caution ?? '', /제한|폭식|어지러움|중단|전문가/, `${slug} needs diet-sensitive caution`);
  }
});

test('FITVELY diet record exact source becomes three meal calendar checks', () => {
  const bundle = seedBundles.find((entry) => entry.flow.slug === 'real-fitvely-diet-record-routine');

  assert.ok(bundle);
  assert.equal(bundle.flow.source_precision, 'exact');
  assert.equal(inferPrimaryDestination(bundle), 'calendar');
  assert.equal(bundle.items.length, 3, 'diet record route should only expose breakfast, lunch, and dinner checks');
  assert.equal(bundle.itemDetails?.length, 3, 'diet record route should keep one detail panel per meal check');

  for (const detail of bundle.itemDetails ?? []) {
    assert.match(detail.how ?? '', /메뉴|기준|원본 영상/, 'diet record route needs concrete meal-check guidance');
    assert.match(detail.caution ?? '', /제한|폭식|어지러움|중단|전문가/, 'diet record route needs diet-sensitive caution');
  }
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
  assert.deepEqual(
    diet.items.map((item) => item.title),
    ['아침 식단 확인', '점심 식단 확인', '저녁 식단 확인'],
  );
  assert.ok(diet.items.every((item) => item.repeat_rule === '매일 체크'));

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
  assert.match(travel.flow.description, /외교부 해외안전여행/);
  assert.doesNotMatch(travel.flow.description, /여행에미치다/);
  assert.doesNotMatch(`${travel.flow.creator_name ?? ''} ${travel.flow.creator_note ?? ''}`, /여행에미치다/);
  assert.ok(travel.itemDetails.every((detail) => detail.links.some((link) => link.url === travel.flow.source_url)));

  const detailText = travel.itemDetails
    .map((detail) => `${detail.why} ${detail.how} ${detail.completion_criteria} ${detail.caution ?? ''}`)
    .join('\n');
  assert.match(detailText, /여행경보 단계, 확인일/);
  assert.match(detailText, /영사콜센터/);
  assert.doesNotMatch(detailText, /여행에미치다/);
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
