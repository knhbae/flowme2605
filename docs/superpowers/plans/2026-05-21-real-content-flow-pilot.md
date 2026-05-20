# Real Content Flow Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 10 real-source pilot Flows across appliance care, car, exercise, certification exam, and diet so FLOW can test actual content conversion before creator operations work.

**Architecture:** Add a separate pilot seed module that exports source metadata and Flow bundles, then include those bundles in the existing seed pack. Keep public route behavior unchanged while extending discovery, content-lab grouping, and tests around the new Flows.

**Tech Stack:** Next.js App Router, TypeScript, Node test runner via `tsx --test`, Playwright, existing FLOW parser/export helpers.

---

## File Structure

- Create `lib/flow/real-content-pilot-flows.ts`: owns the 10 B-pilot Flow definitions, source manifest, and local bundle helpers.
- Modify `lib/flow/seed-flows.ts`: imports `realContentPilotBundles` and appends them to `baseSeedBundles`.
- Modify `lib/flow/seed-flows.test.ts`: verifies the 10 pilot slugs, sources, risk labels, and creator metadata.
- Modify `lib/flow/content-lab.ts`: exposes the 10 converted pilot Flows as a distinct B-pilot board instead of only candidate counts.
- Modify `lib/flow/content-lab.test.ts`: verifies B-pilot coverage by category and slug.
- Modify `components/flow/ContentLab.tsx`: renders the B-pilot board with category, source, risk, and linked Flow cards.
- Modify `tests/e2e/flow-mvp.spec.ts`: updates `/flow-lab` expectations and adds smoke coverage for representative pilot routes.

## Pilot Slugs

Use these exact slugs so tests and links are stable:

- `samsung-aircon-seasonal-check`
- `samsung-washer-filter-cleaning`
- `vehicle-inspection-prep`
- `driver-license-renewal-check` already exists; upgrade details instead of duplicating it.
- `home-workout-20min` already exists; upgrade details instead of duplicating it.
- `running-5k-4week` already exists; upgrade details instead of duplicating it.
- `qnet-exam-application-prep`
- `computer-skills-d30-study`
- `diet-meal-exercise-log`
- `diet-reset-2week`

Because four pilot concepts already exist as seed Flows, the implementation should add six new Flows and enrich the four existing Flows so the B-pilot still covers 10 real converted Flows without duplicate public routes.

### Task 1: Add Pilot Source Manifest Tests

**Files:**
- Test: `lib/flow/seed-flows.test.ts`
- Planned create in Task 2: `lib/flow/real-content-pilot-flows.ts`

- [ ] **Step 1: Write the failing test**

Append this test to `lib/flow/seed-flows.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- lib/flow/seed-flows.test.ts
```

Expected: FAIL because the six new pilot slugs do not exist and some existing slugs are not yet categorized as the pilot expects.

- [ ] **Step 3: Commit the failing test**

```powershell
git add lib/flow/seed-flows.test.ts
git commit -m "test: define real content pilot seed coverage"
```

### Task 2: Create Pilot Flow Module

**Files:**
- Create: `lib/flow/real-content-pilot-flows.ts`
- Modify: `lib/flow/seed-flows.ts`

- [ ] **Step 1: Add the pilot module**

Create `lib/flow/real-content-pilot-flows.ts` with this structure:

```ts
import { Flow, FlowBundle, FlowItemDetail, RiskLevel } from './types';
import { parseTextFlow } from './parser';

const now = '2026-05-21T00:00:00.000Z';

type PilotSource = {
  slug: string;
  category: string;
  sourceTitle: string;
  sourceUrl: string;
  sourceType: 'official' | 'creator_experience' | 'reference';
  riskLevel: RiskLevel;
};

export const realContentPilotSources: PilotSource[] = [
  {
    slug: 'samsung-aircon-seasonal-check',
    category: '가전관리',
    sourceTitle: '삼성전자서비스 Samsung Care+ 에어컨 관리 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/info/carePlus',
    sourceType: 'official',
    riskLevel: 'low',
  },
  {
    slug: 'samsung-washer-filter-cleaning',
    category: '가전관리',
    sourceTitle: '삼성전자서비스 세탁기 필터 청소 안내',
    sourceUrl: 'https://www.samsungsvc.co.kr/solution/1477182',
    sourceType: 'official',
    riskLevel: 'low',
  },
  {
    slug: 'vehicle-inspection-prep',
    category: '자동차/검사',
    sourceTitle: 'TS한국교통안전공단 자동차검사 절차 안내',
    sourceUrl: 'https://main.kotsa.or.kr/portal/contents.do?menuCode=01010104',
    sourceType: 'official',
    riskLevel: 'medium',
  },
  {
    slug: 'qnet-exam-application-prep',
    category: '자격증/시험',
    sourceTitle: 'Q-Net 원서접수 안내',
    sourceUrl: 'https://q-net.or.kr/rcv001.do?gSite=Q&id=rcv00103&rcvPFlag=Y',
    sourceType: 'official',
    riskLevel: 'medium',
  },
  {
    slug: 'computer-skills-d30-study',
    category: '자격증/시험',
    sourceTitle: '시나공 컴퓨터활용능력 학습 후기와 교재 정보',
    sourceUrl: 'https://www.sinagong.co.kr/',
    sourceType: 'reference',
    riskLevel: 'low',
  },
  {
    slug: 'diet-meal-exercise-log',
    category: '다이어트/기록',
    sourceTitle: '핏블리 다이어트 식단·운동 루틴 참고',
    sourceUrl: 'https://fashionbiz.co.kr/article/204870',
    sourceType: 'creator_experience',
    riskLevel: 'medical_sensitive',
  },
  {
    slug: 'diet-reset-2week',
    category: '다이어트/기록',
    sourceTitle: '다이어트 습관 리셋 루틴 참고',
    sourceUrl: 'https://fashionbiz.co.kr/article/204870',
    sourceType: 'creator_experience',
    riskLevel: 'medical_sensitive',
  },
];

function makePilotBundle(flow: Omit<Flow, 'created_at' | 'updated_at'>, rawText: string): FlowBundle {
  const parsed = parseTextFlow(rawText, flow.id);
  return {
    flow: {
      ...flow,
      content_type: flow.content_type ?? 'default',
      created_at: now,
      updated_at: now,
      raw_text: rawText,
    },
    ...parsed,
  };
}

function withPilotDetails(
  bundle: FlowBundle,
  details: Record<string, Pick<FlowBundle['items'][number], 'description' | 'source_type' | 'risk_level'> & Omit<FlowItemDetail, 'item_id'>>,
): FlowBundle {
  return {
    ...bundle,
    items: bundle.items.map((item) => {
      const detail = details[item.title];
      return detail
        ? {
            ...item,
            description: detail.description,
            source_type: detail.source_type,
            risk_level: detail.risk_level,
          }
        : item;
    }),
    itemDetails: bundle.items
      .map((item) => {
        const detail = details[item.title];
        return detail
          ? {
              item_id: item.id,
              why: detail.why,
              how: detail.how,
              completion_criteria: detail.completion_criteria,
              caution: detail.caution,
              links: detail.links,
            }
          : null;
      })
      .filter(Boolean) as FlowItemDetail[],
  };
}
```

- [ ] **Step 2: Add the six new Flow bundles**

In the same file, define six raw text constants and `realContentPilotBundles`. Use these titles and structure choices:

```ts
const samsungAirconText = `@계절 시작 전 1회
## 사용 전 자가 점검
- 전원 연결과 리모컨 배터리 확인하기
- 실외기 주변 통풍 공간 정리하기
- 실내기 먼지 필터 분리와 세척하기
- 냉방 시험 가동하고 냄새와 소음 기록하기

## 사용 중 반복 관리
- 2주마다 외부 필터 먼지 확인하기
- 냉방 효율이 떨어졌는지 체감 기록하기
- 물 맺힘이나 누수 흔적 확인하기
- 전문 세척 필요 여부 결정하기`;

const samsungWasherText = `@월 1회
## 필터 점검
- 세탁기 전원 끄고 물기 주변 정리하기
- 필터 분리 가능 여부와 모델 안내 확인하기
- 필터 이물질 제거하고 손상 여부 확인하기
- 필터 재조립 후 배수 오류가 없는지 확인하기

## 세탁 환경 관리
- 세탁조 냄새와 이물질 발생 여부 기록하기
- 세탁실 습기와 곰팡이 흔적 확인하기
- 전문 세척 또는 소모품 교체 필요 여부 판단하기`;

const vehicleInspectionText = `## D-14 검사 기간 확인
- 자동차검사 유효기간과 예약 가능일 확인하기 D-14
- 자동차등록증과 차량 정보 준비하기 D-14
- 가까운 검사소와 수수료 확인하기 D-10

## D-3 차량 상태 점검
- 번호판과 차대번호 식별 상태 확인하기 D-3
- 등화장치와 경음기 작동 확인하기 D-3
- 타이어 마모와 공기압 확인하기 D-3
- 오일 누유와 경고등 여부 기록하기 D-3

## D-Day 검사 당일
- 예약 시간보다 여유 있게 검사소 도착하기 D-Day
- 접수와 수수료 결제 진행하기 D-Day
- 검사 결과와 재검사 필요 항목 기록하기 D-Day`;

const qnetExamText = `## D-30 응시 조건 확인
- 응시 자격과 제출 서류 필요 여부 확인하기 D-30
- Q-Net 회원 정보와 사진 등록 상태 확인하기 D-30
- 원서접수 시작일과 결제 수단 준비하기 D-21

## D-14 접수 후 확인
- 접수 내역과 시험장 위치 확인하기 D-14
- 환불과 변경 마감일 기록하기 D-14
- 수험표 출력 가능 시점 확인하기 D-7

## D-Day 시험 당일
- 신분증과 수험표 챙기기 D-Day
- 허용 필기구와 계산기 기준 확인하기 D-Day
- 시험 후 합격자 발표일 기록하기 D-Day`;

const computerSkillsText = `## D-30 범위 쪼개기
- 필기와 실기 시험 범위 나누기 D-30
- 매일 공부 가능한 시간 블록 정하기 D-30
- 기출 회독 목표 정하기 D-28

## D-21 기본기 회독
- 핵심 이론 1회독 시작하기 D-21
- 자주 틀리는 기능 목록 만들기 D-18
- 실기 프로그램 환경 점검하기 D-14

## D-7 실전 전환
- 제한 시간 맞춰 모의 문제 풀기 D-7
- 오답을 유형별로 정리하기 D-5
- 시험장 준비물과 이동 시간 확인하기 D-1`;

const dietLogText = `@매일
## 아침 설정
- 오늘 식사 시간과 운동 가능 시간 정하기
- 단백질과 채소 포함 여부 계획하기
- 물 섭취 목표 정하기

## 저녁 기록
- 실제 식사와 간식 기록하기
- 운동 시간과 강도 기록하기
- 배고픔과 컨디션 변화 기록하기
- 다음 날 조정할 한 가지 정하기`;

const dietResetText = `@14일
## 1주차 관찰
- 시작 체중보다 식사 패턴 먼저 기록하기
- 매일 같은 시간에 식사 로그 남기기
- 무리한 제한 없이 줄일 간식 하나 정하기
- 걷기나 가벼운 운동 시간을 확보하기

## 2주차 조정
- 자주 무너지는 시간대 찾기
- 대체 식사나 간식 후보 정하기
- 운동 후 컨디션과 수면 상태 기록하기
- 다음 2주에 유지할 규칙 3개 정하기`;
```

Create each bundle with `withPilotDetails(makePilotBundle(...), details)` and include at least one official/reference/creator link in every Flow's details.

- [ ] **Step 3: Import bundles into the seed pack**

Modify the top of `lib/flow/seed-flows.ts`:

```ts
import { realContentPilotBundles } from './real-content-pilot-flows';
```

Modify `baseSeedBundles` near the end:

```ts
  ...additionalOnlineBundles,
  ...creatorInspiredBundles,
  ...realContentPilotBundles,
];
```

- [ ] **Step 4: Run unit tests**

Run:

```powershell
npm test
```

Expected: the new pilot seed test still has failures for the four existing-but-not-yet-upgraded pilot Flows. The six new slugs should now be found.

- [ ] **Step 5: Commit**

```powershell
git add lib/flow/real-content-pilot-flows.ts lib/flow/seed-flows.ts
git commit -m "feat: add real content pilot flow seeds"
```

### Task 3: Upgrade Existing Pilot Flows

**Files:**
- Modify: `lib/flow/seed-flows.ts`
- Test: `lib/flow/seed-flows.test.ts`

- [ ] **Step 1: Update categories and details for existing pilot slugs**

In `lib/flow/seed-flows.ts`, update these existing Flow definitions:

```ts
// driver-license-renewal-check
category: '자동차/검사',
source_title: '한국도로교통공단 안전운전 통합민원 면허갱신 안내',
source_url: 'https://www.safedriving.or.kr/diGuide/selectDiGuide02.do',

// home-workout-20min
category: '운동/루틴',
source_title: 'ThankyouBUBU 홈트 루틴 콘텐츠 참고',
source_url: 'https://www.youtube.com/@ThankyouBUBU',

// running-5k-4week
category: '운동/루틴',
source_title: '런데이 초보 러닝 콘텐츠 참고',
source_url: 'https://www.runday.co.kr/',

// diet-habit-2week
category: '다이어트/기록',
source_title: '핏블리 다이어트 습관 콘텐츠 참고',
source_url: 'https://fashionbiz.co.kr/article/204870',
```

Ensure each of those four bundles has at least one `itemDetails` entry with `completion_criteria` and at least one link matching the updated source.

- [ ] **Step 2: Update creator routing metadata**

Modify `enrichSeedMeta` so the new categories map correctly:

```ts
const creatorByCategory = bundle.flow.category.includes('자동차')
  ? creatorMeta('차근차근 모빌리티', '자동차 생활 크리에이터', '구매와 관리에서 놓치기 쉬운 확인 순서를 정리합니다.', 420 + index * 37, 88 + index * 9)
  : bundle.flow.category.includes('자격증') || bundle.flow.category.includes('공부')
    ? creatorMeta('루틴 공부방', '학습 루틴 크리에이터', '시험과 자기계발 콘텐츠를 실행 단위로 쪼개 정리합니다.', 510 + index * 31, 102 + index * 8)
    : bundle.flow.category.includes('가전')
      ? creatorMeta('FLOW 큐레이션팀', '공식자료 큐레이터', '공식 관리 안내를 반복 실행표로 재구성합니다.', 480 + index * 24, 96 + index * 6)
      : bundle.flow.category.includes('결혼')
        ? creatorMeta('웨딩 체크메이트', '결혼 준비 경험자', '준비 기간별 의사결정과 업체 확인 순서를 정리합니다.', 760 + index * 21, 164 + index * 7)
        : bundle.flow.category.includes('운동') || bundle.flow.category.includes('다이어트')
          ? creatorMeta('생활 루틴 코치', '운동·습관 크리에이터', '무리하지 않고 반복할 수 있는 루틴을 실행표로 정리합니다.', 690 + index * 25, 141 + index * 6)
          : bundle.flow.category.includes('서류') || bundle.flow.category.includes('사업') || bundle.flow.category.includes('노무')
            ? creatorMeta('생활 행정 노트', '공식자료 큐레이터', '공식 안내를 신청 전 확인 순서로 재구성합니다.', 360 + index * 18, 72 + index * 5)
            : creatorMeta('FLOW 큐레이션팀', '경험 콘텐츠 큐레이터', '반복되는 생활 과제를 실행 가능한 Flow로 정리합니다.', 480 + index * 24, 96 + index * 6);
```

- [ ] **Step 3: Update seed count expectations**

Change the first assertion in `lib/flow/seed-flows.test.ts` from:

```ts
assert.equal(seedBundles.length, 24);
```

to:

```ts
assert.equal(seedBundles.length, 30);
```

Add the six new slugs to the sorted expected slug list.

- [ ] **Step 4: Run unit tests**

Run:

```powershell
npm test
```

Expected: PASS for `seed-flows.test.ts`; other test failures, if any, should be unrelated to seed metadata and fixed before committing.

- [ ] **Step 5: Commit**

```powershell
git add lib/flow/seed-flows.ts lib/flow/seed-flows.test.ts
git commit -m "feat: upgrade real content pilot seed metadata"
```

### Task 4: Add B-Pilot Content Lab Model

**Files:**
- Modify: `lib/flow/content-lab.ts`
- Test: `lib/flow/content-lab.test.ts`

- [ ] **Step 1: Write failing content-lab test**

Append this test to `lib/flow/content-lab.test.ts`:

```ts
test('converted pilot lab exposes 10 real-source flows for B validation', () => {
  const summary = getContentLabSummary(seedBundles);

  assert.equal(summary.convertedPilotFlowCount, 10);
  assert.deepEqual(summary.convertedPilotCategories.sort(), [
    '가전관리',
    '다이어트/기록',
    '운동/루틴',
    '자동차/검사',
    '자격증/시험',
  ]);
  assert.equal(summary.missingConvertedPilotSlugs.length, 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm test -- lib/flow/content-lab.test.ts
```

Expected: FAIL because `convertedPilotFlowCount`, `convertedPilotCategories`, and `missingConvertedPilotSlugs` do not exist.

- [ ] **Step 3: Implement B-pilot lab model**

In `lib/flow/content-lab.ts`, add:

```ts
export const convertedPilotSlugs = [
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
```

Update `getContentLabSummary` return object:

```ts
const convertedPilotBundles = bundles.filter((bundle) => convertedPilotSlugs.includes(bundle.flow.slug));

return {
  pilotCreatorCount: pilotCreatorLabs.length,
  pilotFlowCount: pilotSlugs.length,
  missingPilotFlowSlugs: pilotSlugs.filter((slug) => !slugs.has(slug)),
  convertedPilotFlowCount: convertedPilotSlugs.length,
  missingConvertedPilotSlugs: convertedPilotSlugs.filter((slug) => !slugs.has(slug)),
  convertedPilotCategories: Array.from(new Set(convertedPilotBundles.map((bundle) => bundle.flow.category))).sort(),
  expansionCreatorCount: expansionCreatorLabs.length,
  expansionCandidateCount: expansionCandidates.length,
  structureCoverage: Array.from(new Set(expansionCandidates.map((candidate) => candidate.structure_type))).sort(),
  categoryCoverage: Array.from(new Set(expansionCandidates.map((candidate) => candidate.category))).sort(),
  averageCandidateScore:
    Math.round(
      expansionCandidates.reduce((sum, candidate) => sum + scoreCandidate(candidate), 0) /
        Math.max(expansionCandidates.length, 1),
    ),
};
```

- [ ] **Step 4: Run content-lab tests**

Run:

```powershell
npm test -- lib/flow/content-lab.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add lib/flow/content-lab.ts lib/flow/content-lab.test.ts
git commit -m "feat: expose converted pilot flows in content lab"
```

### Task 5: Render B-Pilot Board

**Files:**
- Modify: `components/flow/ContentLab.tsx`
- Test: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Update E2E expectations**

Replace the `/flow-lab` test body with:

```ts
test('flow lab shows converted pilot and scale validation boards', async ({ page }) => {
  await page.goto('/flow-lab');

  await expect(page.getByRole('heading', { name: '실제 제작자 콘텐츠가 여러 Flow로 관리되는지 검증' })).toBeVisible();
  await expect(page.getByText('3 x 4 파일럿 검증')).toBeVisible();
  await expect(page.getByText('B 파일럿 실제 Flow 변환')).toBeVisible();
  await expect(page.getByText('10 x 20 확장 후보 검증')).toBeVisible();
  await expect(page.getByText('10', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /삼성전자서비스 에어컨/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /자동차검사 준비/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Q-Net 원서접수/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /다이어트 식단·운동 기록/ })).toBeVisible();
});
```

- [ ] **Step 2: Run E2E test to verify it fails**

Run:

```powershell
npm run build
npm run test:e2e -- tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"
```

Expected: FAIL because the B-pilot section is not rendered yet.

- [ ] **Step 3: Render converted pilot section**

In `components/flow/ContentLab.tsx`, import `convertedPilotSlugs`:

```ts
import {
  convertedPilotSlugs,
  expansionCreatorLabs,
  getContentLabSummary,
  pilotCreatorLabs,
  scoreCandidate,
} from '@/lib/flow/content-lab';
```

Inside `ContentLab`, compute:

```ts
const convertedPilotBundles = convertedPilotSlugs
  .map((slug) => bundleBySlug.get(slug))
  .filter(Boolean) as typeof seedBundles;
```

Add a section between Phase 1 and Phase 2:

```tsx
<section className="mb-10">
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-gray-500">Phase B</p>
      <h2 className="text-2xl font-semibold text-gray-950">B 파일럿 실제 Flow 변환</h2>
      <p className="mt-2 text-sm text-gray-600">
        실제 공식/제작자 소스를 원문 복사가 아닌 실행 구조로 바꾼 10개 대표 Flow입니다.
      </p>
    </div>
    <span className="rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
      {summary.convertedPilotFlowCount} converted
    </span>
  </div>
  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
    {convertedPilotBundles.map((bundle) => (
      <Link
        key={bundle.flow.slug}
        className="rounded-lg border border-gray-200 bg-white p-4 hover:border-blue-300 hover:text-blue-800"
        href={`/f/${bundle.flow.slug}`}
      >
        <span className="block text-xs font-semibold text-gray-500">{bundle.flow.category}</span>
        <span className="mt-1 block text-sm font-semibold text-gray-950">{bundle.flow.title}</span>
        <span className="mt-2 block text-xs text-gray-500">
          {bundle.flow.structure_type} · {bundle.flow.anchor_type} · {bundle.items.length} items
        </span>
      </Link>
    ))}
  </div>
</section>
```

- [ ] **Step 4: Run focused E2E**

Run:

```powershell
npm run build
npm run test:e2e -- tests/e2e/flow-mvp.spec.ts -g "flow lab shows converted pilot"
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add components/flow/ContentLab.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: show converted pilot flows in lab"
```

### Task 6: Add Representative Route Smoke Tests

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add route smoke test**

Append:

```ts
test('representative real content pilot flows are executable', async ({ page }) => {
  await page.goto('/f/samsung-aircon-seasonal-check');
  await expect(page.getByRole('heading', { name: /에어컨/ })).toBeVisible();
  await expect(page.getByText('출처와 주의 정보')).toBeVisible();
  await expect(page.getByRole('button', { name: '내 날짜 입력' })).toBeVisible();
  await page.getByRole('button', { name: '내 날짜 입력' }).click();
  await page.getByLabel(/시작일|기준일|관리 시작일/).fill('2026-06-01');
  await expect(page.getByRole('heading', { name: '지금 먼저 체크할 일' })).toBeVisible();

  await page.goto('/f/qnet-exam-application-prep');
  await expect(page.getByRole('heading', { name: /Q-Net/ })).toBeVisible();
  await page.getByRole('button', { name: '내 날짜 입력' }).click();
  await page.getByLabel(/시험일|기준 날짜|마감일/).fill('2026-07-15');
  await expect(page.getByText('2026-06-15').first()).toBeVisible();
});
```

- [ ] **Step 2: Run focused E2E**

Run:

```powershell
npm run build
npm run test:e2e -- tests/e2e/flow-mvp.spec.ts -g "representative real content pilot"
```

Expected: PASS. If label text differs from the regex, inspect the rendered anchor label and update the regex to the exact Korean label used by the app.

- [ ] **Step 3: Commit**

```powershell
git add tests/e2e/flow-mvp.spec.ts
git commit -m "test: cover representative real content pilot routes"
```

### Task 7: Full Verification

**Files:**
- No source edits unless verification exposes a specific issue.

- [ ] **Step 1: Run unit tests**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: Next.js build succeeds and `/flow-lab` plus `/f/[slug]` remain available.

- [ ] **Step 3: Run E2E**

Run:

```powershell
npm run test:e2e
```

Expected: all Playwright tests pass.

- [ ] **Step 4: Inspect git status**

Run:

```powershell
git status --short
```

Expected: no unstaged implementation files from this plan. Pre-existing unrelated changes may remain if they were present before execution.

## Self-Review

- Spec coverage: Tasks 1-3 cover 10 real converted Flows, source attribution, risk labels, and execution structure. Task 4 covers content-lab validation. Task 5 covers UI grouping. Task 6 covers user-facing route execution. Task 7 covers verification.
- Placeholder scan: checked for forbidden placeholder patterns; none remain.
- Type consistency: plan uses existing `Flow`, `FlowBundle`, `FlowItemDetail`, `RiskLevel`, `source_type`, `risk_level`, `structure_type`, and `anchor_type` names from `lib/flow/types.ts`.
