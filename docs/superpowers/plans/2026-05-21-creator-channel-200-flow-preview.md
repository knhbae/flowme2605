# Creator Channel 200+ Flow Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vercel Preview where 10+ creator channels each contain 20+ executable Flow routes, with channel-first discovery and validation UX.

**Architecture:** Keep the current static MVP architecture and add preview seed generation instead of introducing storage. A focused `creator-channel-preview` module owns channel definitions, generated Flow bundles, and channel stats; existing `seedBundles`, `/u/[creator]`, and new `/creators` consume that data.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, node:test, Playwright, Vercel.

---

## File Structure

- Create `lib/flow/creator-channel-preview.ts`: channel profiles, generated 200+ `FlowBundle`s, stats helpers, filtering helpers.
- Modify `lib/flow/types.ts`: add optional channel metadata fields to `FlowUser` if needed.
- Modify `lib/flow/users.ts`: merge preview creator channels into `virtualUsers`.
- Modify `lib/flow/seed-flows.ts`: append generated preview bundles to `seedBundles`.
- Modify `components/flow/AppClient.tsx`: export a new `CreatorDirectory`, upgrade `CreatorProfile`, and add compact channel-scale filtering.
- Create `app/creators/page.tsx`: route for creator channel discovery.
- Modify `components/flow/ContentLab.tsx` and `lib/flow/content-lab.ts`: relabel Phase 2 as preview Flow validation after generated routes exist.
- Modify `lib/flow/seed-flows.test.ts`: lock 200+ Flow count and channel distribution.
- Modify `tests/e2e/flow-mvp.spec.ts`: add creator directory and channel-scale route tests.

---

### Task 1: Lock Creator Channel Preview Data Contract

**Files:**
- Test: `lib/flow/seed-flows.test.ts`
- Create later: `lib/flow/creator-channel-preview.ts`

- [ ] **Step 1: Add failing unit tests for 200+ channel preview**

Append these tests to `lib/flow/seed-flows.test.ts`:

```ts
import {
  getCreatorChannelSummaries,
  previewCreatorChannels,
  previewFlowBundles,
} from './creator-channel-preview';

test('creator channel preview exposes 10 channels and 200+ published flows', () => {
  assert.ok(previewCreatorChannels.length >= 10);
  assert.ok(previewFlowBundles.length >= 200);
  assert.ok(previewFlowBundles.every((bundle) => bundle.flow.status === 'published'));

  const summaries = getCreatorChannelSummaries(seedBundles);
  const previewSummaries = summaries.filter((summary) => summary.is_preview_channel);

  assert.ok(previewSummaries.length >= 10);
  assert.ok(previewSummaries.every((summary) => summary.flow_count >= 20));
  assert.ok(previewSummaries.every((summary) => summary.source_coverage === 100));
  assert.ok(previewSummaries.every((summary) => summary.execution_score >= 70));
});

test('generated preview flows are executable and source-backed', () => {
  const generated = seedBundles.filter((bundle) => bundle.flow.id.startsWith('flow-preview-'));

  assert.ok(generated.length >= 200);
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
```

- [ ] **Step 2: Run focused test and verify it fails**

Run: `npm test -- lib/flow/seed-flows.test.ts`

Expected: FAIL because `./creator-channel-preview` does not exist.

- [ ] **Step 3: Commit failing tests**

```powershell
git add lib/flow/seed-flows.test.ts
git commit -m "test: define creator channel preview coverage"
```

---

### Task 2: Add Preview Channel Generator

**Files:**
- Create: `lib/flow/creator-channel-preview.ts`
- Modify: `lib/flow/types.ts`

- [ ] **Step 1: Extend `FlowUser` with optional channel fields**

In `lib/flow/types.ts`, update `FlowUser`:

```ts
export type FlowUser = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar_initial: string;
  specialty_tags: string[];
  is_current_user?: boolean;
  source_url?: string;
  channel_type?: 'creator' | 'official' | 'brand' | 'community' | 'curation';
  is_preview_channel?: boolean;
};
```

- [ ] **Step 2: Create preview generator module**

Create `lib/flow/creator-channel-preview.ts` with:

```ts
import { AnchorType, FlowBundle, FlowItem, FlowItemDetail, FlowUser, RiskLevel, SourceType, StructureType } from './types';

const now = '2026-05-21T00:00:00.000Z';

type PreviewChannel = FlowUser & {
  source_url: string;
  channel_type: NonNullable<FlowUser['channel_type']>;
  is_preview_channel: true;
  base_category: string;
  source_type: SourceType;
  risk_level: RiskLevel;
  source_title: string;
};

const topicTemplates = [
  ['월간 점검 루틴', 'routine', 'start_date'],
  ['D-30 준비 플랜', 'timeline', 'end_date'],
  ['초보자 시작 체크', 'checklist', 'none'],
  ['4주 적응 루틴', 'routine', 'start_date'],
  ['구매 전 확인표', 'checklist', 'none'],
  ['방문 전 준비 Flow', 'timeline', 'end_date'],
  ['문제 발생 대응 순서', 'checklist', 'none'],
  ['계절 전환 관리', 'routine', 'start_date'],
  ['서류/도구 준비표', 'checklist', 'none'],
  ['D-Day 당일 체크', 'timeline', 'end_date'],
  ['기록 템플릿', 'routine', 'start_date'],
  ['2주 리셋 플랜', 'routine', 'start_date'],
  ['비용 비교 체크', 'checklist', 'none'],
  ['초급-중급 단계표', 'phase', 'start_date'],
  ['주간 반복 캘린더', 'routine', 'start_date'],
  ['실패 방지 체크', 'checklist', 'none'],
  ['공식 정보 확인 루트', 'checklist', 'none'],
  ['가족/동료 공유표', 'checklist', 'none'],
  ['30일 누적 루틴', 'routine', 'start_date'],
  ['마감 후 정리 플랜', 'timeline', 'end_date'],
] as const;

export const previewCreatorChannels: PreviewChannel[] = [
  {
    id: 'channel-samsung-service',
    slug: 'samsung-service',
    name: '삼성전자서비스',
    role: '가전관리 공식 채널',
    bio: '제품별 청소, 필터, 점검 안내를 반복 관리 Flow로 재구성합니다.',
    avatar_initial: '삼',
    specialty_tags: ['가전관리', '공식확인', '계절점검'],
    source_url: 'https://www.samsungsvc.co.kr/',
    channel_type: 'official',
    is_preview_channel: true,
    base_category: '가전관리',
    source_type: 'official',
    risk_level: 'low',
    source_title: '삼성전자서비스 제품 관리 안내',
  },
  {
    id: 'channel-thankyou-bubu',
    slug: 'thankyou-bubu',
    name: 'ThankyouBUBU',
    role: '홈트 루틴 채널',
    bio: '집에서 따라 할 수 있는 운동 루틴을 시작일 기준 실행표로 바꿉니다.',
    avatar_initial: '홈',
    specialty_tags: ['홈트', '운동루틴', '초보자'],
    source_url: 'https://www.youtube.com/@ThankyouBUBU',
    channel_type: 'creator',
    is_preview_channel: true,
    base_category: '운동/홈트',
    source_type: 'reference',
    risk_level: 'medium',
    source_title: 'ThankyouBUBU 홈트 루틴 콘텐츠',
  },
  {
    id: 'channel-fitvely',
    slug: 'fitvely',
    name: '핏블리 FITVELY',
    role: '다이어트·운동 채널',
    bio: '식단, 운동, 기록 습관을 2주와 4주 단위 실행 Flow로 정리합니다.',
    avatar_initial: '핏',
    specialty_tags: ['다이어트', '식단기록', '운동'],
    source_url: 'https://www.fitvely.com/',
    channel_type: 'creator',
    is_preview_channel: true,
    base_category: '다이어트/기록',
    source_type: 'creator_experience',
    risk_level: 'medical_sensitive',
    source_title: '핏블리 다이어트 루틴 콘텐츠',
  },
  {
    id: 'channel-sinagong',
    slug: 'sinagong',
    name: '시나공',
    role: '자격증 학습 채널',
    bio: '시험 일정과 교재 진도를 D-Day 학습 Flow로 재구성합니다.',
    avatar_initial: '시',
    specialty_tags: ['자격증', '컴활', 'D-Day'],
    source_url: 'https://www.sinagong.co.kr/',
    channel_type: 'brand',
    is_preview_channel: true,
    base_category: '자격증/시험',
    source_type: 'reference',
    risk_level: 'medium',
    source_title: '시나공 자격증 학습 콘텐츠',
  },
  {
    id: 'channel-gov24',
    slug: 'gov24',
    name: '정부24',
    role: '생활 행정 공식 채널',
    bio: '민원, 발급, 신고 절차를 신청 전 체크 Flow로 전환합니다.',
    avatar_initial: '정',
    specialty_tags: ['생활행정', '공식확인', '서류'],
    source_url: 'https://www.gov.kr/',
    channel_type: 'official',
    is_preview_channel: true,
    base_category: '생활행정',
    source_type: 'official',
    risk_level: 'medium',
    source_title: '정부24 민원 안내',
  },
  {
    id: 'channel-childcare',
    slug: 'childcare-portal',
    name: '아이사랑 육아 포털',
    role: '육아 정보 공식 채널',
    bio: '월령별 준비와 기관 신청 절차를 보호자 실행 Flow로 정리합니다.',
    avatar_initial: '육',
    specialty_tags: ['육아', '기관신청', '공식확인'],
    source_url: 'https://www.childcare.go.kr/',
    channel_type: 'official',
    is_preview_channel: true,
    base_category: '육아/돌봄',
    source_type: 'official',
    risk_level: 'medical_sensitive',
    source_title: '아이사랑 육아 정보',
  },
  {
    id: 'channel-pet-care',
    slug: 'pet-care-note',
    name: '반려동물 생활 노트',
    role: '반려동물 관리 채널',
    bio: '훈련, 건강관리, 방문 준비 콘텐츠를 체크리스트와 루틴으로 나눕니다.',
    avatar_initial: '펫',
    specialty_tags: ['반려동물', '훈련', '관리'],
    source_url: 'https://www.youtube.com/results?search_query=%EB%B0%98%EB%A0%A4%EB%8F%99%EB%AC%BC+%EA%B4%80%EB%A6%AC',
    channel_type: 'curation',
    is_preview_channel: true,
    base_category: '반려동물',
    source_type: 'reference',
    risk_level: 'medium',
    source_title: '반려동물 관리 콘텐츠 모음',
  },
  {
    id: 'channel-ohouse',
    slug: 'ohouse-living',
    name: '오늘의집',
    role: '이사·주거 채널',
    bio: '이사 준비, 수납, 주거 관리 콘텐츠를 D-Day와 반복 Flow로 검증합니다.',
    avatar_initial: '집',
    specialty_tags: ['이사', '주거관리', '수납'],
    source_url: 'https://ohou.se/',
    channel_type: 'community',
    is_preview_channel: true,
    base_category: '이사/주거',
    source_type: 'reference',
    risk_level: 'low',
    source_title: '오늘의집 주거 관리 콘텐츠',
  },
  {
    id: 'channel-travelholic',
    slug: 'travelholic',
    name: '여행에미치다',
    role: '여행 준비 채널',
    bio: '여행 준비물, 예약, 현지 실행 콘텐츠를 출발일 기준 Flow로 전환합니다.',
    avatar_initial: '여',
    specialty_tags: ['여행', '준비물', 'D-Day'],
    source_url: 'https://www.instagram.com/travelholic_insta/',
    channel_type: 'creator',
    is_preview_channel: true,
    base_category: '여행',
    source_type: 'creator_experience',
    risk_level: 'medium',
    source_title: '여행에미치다 여행 준비 콘텐츠',
  },
  {
    id: 'channel-mobility',
    slug: 'mobility-life',
    name: '차근차근 모빌리티',
    role: '자동차 생활 채널',
    bio: '구매, 검사, 정비, 보험 확인을 차량 생활주기 Flow로 묶습니다.',
    avatar_initial: '차',
    specialty_tags: ['자동차', '검사', '정비'],
    source_url: 'https://www.youtube.com/results?search_query=%EC%9E%90%EB%8F%99%EC%B0%A8+%EA%B4%80%EB%A6%AC+%EC%B2%B4%ED%81%AC',
    channel_type: 'curation',
    is_preview_channel: true,
    base_category: '자동차/관리',
    source_type: 'reference',
    risk_level: 'medium',
    source_title: '자동차 생활 관리 콘텐츠',
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
}

function itemTitles(channel: PreviewChannel, suffix: string): string[] {
  return [
    `${channel.base_category} 목표와 기준 정하기`,
    `${suffix}에 필요한 자료 모으기`,
    `공식/원천 소스 확인하기`,
    `실행 순서대로 체크하기`,
    `결과와 다음 수정점 기록하기`,
  ];
}

function makePreviewBundle(channel: PreviewChannel, topicIndex: number): FlowBundle {
  const [suffix, structureType, anchorType] = topicTemplates[topicIndex];
  const structure_type = structureType as StructureType;
  const anchor_type = anchorType as AnchorType;
  const slug = `channel-${channel.slug}-${slugify(suffix)}`;
  const flow_id = `flow-preview-${channel.slug}-${topicIndex + 1}`;
  const sectionId = `${flow_id}-section-main`;
  const titles = itemTitles(channel, suffix);
  const items: FlowItem[] = titles.map((title, index) => ({
    id: `${flow_id}-item-${index + 1}`,
    flow_id,
    section_id: sectionId,
    title,
    type: structure_type === 'timeline' ? 'calendar' : 'todo',
    day_offset: anchor_type === 'end_date' ? -Math.max(0, 30 - index * 7) : anchor_type === 'start_date' ? index * 3 : undefined,
    repeat_rule: structure_type === 'routine' ? 'weekly' : undefined,
    source_type: channel.source_type,
    risk_level: channel.risk_level,
    order: index + 1,
  }));

  const itemDetails: FlowItemDetail[] = items.map((item, index) => ({
    item_id: item.id,
    why: `${channel.name}의 ${suffix} 콘텐츠를 실제 행동으로 옮기기 위한 ${index + 1}번째 확인점입니다.`,
    how: `${channel.source_title}를 열어 기준을 확인하고, 내 상황에 맞는 실행 메모를 남깁니다.`,
    completion_criteria: `${item.title} 항목을 확인하고 다음 행동 또는 보류 사유를 기록했다.`,
    caution: channel.risk_level === 'medical_sensitive' ? '건강·육아 관련 결정은 공식 정보와 전문가 조언을 함께 확인하세요.' : undefined,
    links: [{ label: channel.source_title, url: channel.source_url, type: channel.source_type === 'official' ? 'official' : 'reference' }],
  }));

  return {
    flow: {
      id: flow_id,
      slug,
      title: `${channel.base_category} ${suffix}`,
      description: `${channel.name} 채널의 ${suffix} 콘텐츠를 실행 가능한 Flow로 재구성했습니다.`,
      category: channel.base_category,
      structure_type,
      content_type: 'default',
      anchor_type,
      status: 'published',
      source_title: channel.source_title,
      source_url: channel.source_url,
      risk_level: channel.risk_level,
      created_at: now,
      updated_at: now,
      owner_user_id: channel.id,
      creator_name: channel.name,
      creator_role: channel.role,
      creator_note: channel.bio,
      usage_count: 900 + topicIndex * 37,
      copy_count: 180 + topicIndex * 11,
      tags: [channel.base_category, structure_type === 'timeline' ? 'D-Day 준비' : structure_type === 'routine' ? '반복 루틴' : '체크리스트', channel.source_type === 'official' ? '공식확인' : '채널콘텐츠'].slice(0, 6),
      warning: channel.risk_level === 'medical_sensitive' ? '건강·육아 관련 정보는 개인 상황에 따라 달라질 수 있습니다. 공식 정보와 전문가 조언을 함께 확인하세요.' : undefined,
    },
    sections: [{ id: sectionId, flow_id, title: suffix, order: 1 }],
    items,
    itemDetails,
  };
}

export const previewFlowBundles: FlowBundle[] = previewCreatorChannels.flatMap((channel) =>
  topicTemplates.map((_, topicIndex) => makePreviewBundle(channel, topicIndex)),
);

export type CreatorChannelSummary = {
  id: string;
  slug: string;
  name: string;
  role: string;
  bio: string;
  avatar_initial: string;
  specialty_tags: string[];
  source_url?: string;
  channel_type?: FlowUser['channel_type'];
  is_preview_channel: boolean;
  flow_count: number;
  category_count: number;
  executable_item_count: number;
  anchor_coverage: number;
  source_coverage: number;
  sensitive_count: number;
  execution_score: number;
};

export function getCreatorChannelSummaries(bundles: FlowBundle[]): CreatorChannelSummary[] {
  return previewCreatorChannels.map((channel) => {
    const channelBundles = bundles.filter((bundle) => bundle.flow.owner_user_id === channel.id);
    const sourceBacked = channelBundles.filter((bundle) => bundle.flow.source_url).length;
    const anchored = channelBundles.filter((bundle) => bundle.flow.anchor_type !== 'none').length;
    const executableItemCount = channelBundles.reduce((sum, bundle) => sum + bundle.items.length, 0);
    const categoryCount = new Set(channelBundles.map((bundle) => bundle.flow.category)).size;
    const sourceCoverage = Math.round((sourceBacked / Math.max(channelBundles.length, 1)) * 100);
    const anchorCoverage = Math.round((anchored / Math.max(channelBundles.length, 1)) * 100);
    const sensitiveCount = channelBundles.filter((bundle) => bundle.flow.risk_level?.includes('sensitive')).length;

    return {
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      role: channel.role,
      bio: channel.bio,
      avatar_initial: channel.avatar_initial,
      specialty_tags: channel.specialty_tags,
      source_url: channel.source_url,
      channel_type: channel.channel_type,
      is_preview_channel: true,
      flow_count: channelBundles.length,
      category_count: categoryCount,
      executable_item_count: executableItemCount,
      anchor_coverage: anchorCoverage,
      source_coverage: sourceCoverage,
      sensitive_count: sensitiveCount,
      execution_score: Math.min(100, Math.round(sourceCoverage * 0.35 + anchorCoverage * 0.25 + Math.min(executableItemCount / 100, 1) * 40)),
    };
  });
}
```

- [ ] **Step 3: Run focused test**

Run: `npm test -- lib/flow/seed-flows.test.ts`

Expected: still FAIL until seed/users are integrated.

- [ ] **Step 4: Commit generator**

```powershell
git add lib/flow/types.ts lib/flow/creator-channel-preview.ts
git commit -m "feat: add creator channel preview generator"
```

---

### Task 3: Integrate Preview Channels Into Seed Data

**Files:**
- Modify: `lib/flow/users.ts`
- Modify: `lib/flow/seed-flows.ts`

- [ ] **Step 1: Add preview users to `virtualUsers`**

In `lib/flow/users.ts`, import preview channels:

```ts
import { previewCreatorChannels } from './creator-channel-preview';
```

Then append them after existing users:

```ts
export const virtualUsers: FlowUser[] = [
  // existing users...
  ...previewCreatorChannels,
];
```

- [ ] **Step 2: Add preview bundles to `seedBundles`**

In `lib/flow/seed-flows.ts`, import:

```ts
import { previewFlowBundles } from './creator-channel-preview';
```

Then append preview bundles before export:

```ts
const baseSeedBundles: FlowBundle[] = [
  // existing entries...
  ...realContentPilotBundles,
  ...previewFlowBundles,
];
```

- [ ] **Step 3: Update seed count expectation**

In `lib/flow/seed-flows.test.ts`, change:

```ts
assert.equal(seedBundles.length, 31);
```

to:

```ts
assert.ok(seedBundles.length >= 231);
```

Keep the explicit slug list test for the original 31 by checking `expectedOriginalSlugs.every(...)` rather than exact equality.

- [ ] **Step 4: Run unit tests**

Run: `npm test -- lib/flow/seed-flows.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit integration**

```powershell
git add lib/flow/users.ts lib/flow/seed-flows.ts lib/flow/seed-flows.test.ts
git commit -m "feat: publish preview creator channel flows"
```

---

### Task 4: Add Creator Channel Directory

**Files:**
- Create: `app/creators/page.tsx`
- Modify: `components/flow/AppClient.tsx`
- Test: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add failing E2E test**

Append to `tests/e2e/flow-mvp.spec.ts`:

```ts
test('creator directory exposes channel-scale preview library', async ({ page }) => {
  await page.goto('/creators');

  await expect(page.getByRole('heading', { name: '제작자 채널' })).toBeVisible();
  await expect(page.getByText('200+')).toBeVisible();
  await expect(page.getByRole('link', { name: /삼성전자서비스/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /ThankyouBUBU/ })).toBeVisible();
  await expect(page.getByText('실행성 점수')).toBeVisible();
});
```

- [ ] **Step 2: Create route**

Create `app/creators/page.tsx`:

```tsx
import { CreatorDirectory } from '@/components/flow/AppClient';

export default function Page() {
  return <CreatorDirectory />;
}
```

- [ ] **Step 3: Implement `CreatorDirectory`**

In `components/flow/AppClient.tsx`, import:

```ts
import { getCreatorChannelSummaries } from '@/lib/flow/creator-channel-preview';
```

Add exported component:

```tsx
export function CreatorDirectory() {
  const { bundles } = useBundles();
  const summaries = getCreatorChannelSummaries(bundles);
  const totalFlows = summaries.reduce((sum, item) => sum + item.flow_count, 0);
  const averageScore = Math.round(summaries.reduce((sum, item) => sum + item.execution_score, 0) / Math.max(summaries.length, 1));

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      <PlatformNav />
      <header className="border-b border-gray-200 pb-6">
        <p className="text-sm font-semibold text-blue-700">Creator Channels</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">제작자 채널</h1>
        <p className="mt-3 max-w-3xl leading-7 text-gray-600">
          채널별 콘텐츠가 실제 실행 Flow로 얼마나 잘 전환되는지 확인하는 Preview입니다.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <StatCard label="채널" value={`${summaries.length}`} />
          <StatCard label="Flow화 콘텐츠" value={`${totalFlows}+`} />
          <StatCard label="평균 실행성 점수" value={`${averageScore}`} />
          <StatCard label="검증 상태" value="Preview" />
        </div>
      </header>
      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {summaries.map((channel) => (
          <Link key={channel.id} className="rounded-lg border border-gray-200 bg-white p-5 hover:border-blue-300" href={`/u/${channel.slug}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-blue-700">{channel.channel_type}</p>
                <h2 className="mt-1 text-xl font-semibold">{channel.name}</h2>
                <p className="mt-1 text-sm text-gray-600">{channel.role}</p>
              </div>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-700">{channel.flow_count} flows</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">{channel.bio}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
              <StatCard label="실행성 점수" value={`${channel.execution_score}`} compact />
              <StatCard label="출처" value={`${channel.source_coverage}%`} compact />
              <StatCard label="항목" value={`${channel.executable_item_count}`} compact />
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
```

If no `StatCard` helper exists, add a local helper near `CreatorDirectory`:

```tsx
function StatCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg bg-gray-50 ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`${compact ? 'text-lg' : 'text-2xl'} mt-1 font-semibold text-gray-950`}>{value}</p>
    </div>
  );
}
```

- [ ] **Step 4: Run E2E focused test**

Run: `npm run test:e2e -- --grep "creator directory"`

Expected: PASS.

- [ ] **Step 5: Commit directory**

```powershell
git add app/creators/page.tsx components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: add creator channel directory"
```

---

### Task 5: Upgrade Creator Profile for Channel-Scale Browsing

**Files:**
- Modify: `components/flow/AppClient.tsx`
- Test: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add failing E2E test for channel page**

Append:

```ts
test('preview creator channel supports browsing 20+ flowified entries', async ({ page }) => {
  await page.goto('/u/samsung-service');

  await expect(page.getByRole('heading', { name: '삼성전자서비스' })).toBeVisible();
  await expect(page.getByText('Flow화 콘텐츠')).toBeVisible();
  await expect(page.getByText('20')).toBeVisible();
  await expect(page.getByText('출처 커버리지')).toBeVisible();
  await expect(page.getByText('채널 Flow 라이브러리')).toBeVisible();
  await expect(page.getByRole('link', { name: /가전관리 월간 점검 루틴/ })).toBeVisible();
});
```

- [ ] **Step 2: Add channel summary to `CreatorProfile`**

In `CreatorProfile`, compute:

```ts
const previewSummary = getCreatorChannelSummaries(bundles).find((item) => item.slug === normalized);
```

Then add a validation panel below header:

```tsx
{previewSummary ? (
  <section className="mt-5 grid gap-3 sm:grid-cols-5">
    <StatCard label="Flow화 콘텐츠" value={`${previewSummary.flow_count}`} compact />
    <StatCard label="실행 항목" value={`${previewSummary.executable_item_count}`} compact />
    <StatCard label="앵커 커버리지" value={`${previewSummary.anchor_coverage}%`} compact />
    <StatCard label="출처 커버리지" value={`${previewSummary.source_coverage}%`} compact />
    <StatCard label="실행성 점수" value={`${previewSummary.execution_score}`} compact />
  </section>
) : null}
```

- [ ] **Step 3: Rename library heading**

Change the creator flow section heading from:

```tsx
<h2 className="text-2xl font-semibold">이 제작자의 Flow</h2>
```

to:

```tsx
<h2 className="text-2xl font-semibold">채널 Flow 라이브러리</h2>
```

- [ ] **Step 4: Add compact category filters**

Inside `CreatorProfile`, derive categories:

```ts
const [categoryFilter, setCategoryFilter] = useState('전체');
const allCategories = ['전체', ...Array.from(new Set(creatorBundles.map((bundle) => bundle.flow.category)))];
const visibleCreatorBundles = categoryFilter === '전체'
  ? creatorBundles
  : creatorBundles.filter((bundle) => bundle.flow.category === categoryFilter);
```

Render category buttons before the grid and map `visibleCreatorBundles` instead of `creatorBundles`.

- [ ] **Step 5: Run E2E focused test**

Run: `npm run test:e2e -- --grep "preview creator channel"`

Expected: PASS.

- [ ] **Step 6: Commit profile upgrade**

```powershell
git add components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: upgrade creator channel browsing"
```

---

### Task 6: Update Flow Lab Copy and Coverage Tests

**Files:**
- Modify: `lib/flow/content-lab.ts`
- Modify: `components/flow/ContentLab.tsx`
- Modify: `lib/flow/content-lab.test.ts`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Update summary to include preview generated Flow count**

In `getContentLabSummary`, add:

```ts
const previewGeneratedBundles = bundles.filter((bundle) => bundle.flow.id.startsWith('flow-preview-'));
```

Return:

```ts
previewGeneratedFlowCount: previewGeneratedBundles.length,
```

- [ ] **Step 2: Update Flow Lab text**

Change Phase 2 heading to:

```tsx
<h2 className="text-2xl font-semibold text-gray-950">200+ 제작자 채널 Flow 검증</h2>
```

Show:

```tsx
<p className="mt-2 text-sm text-gray-600">
  후보 매트릭스가 아니라, 제작자 채널 안에서 실제 열 수 있는 Preview Flow로 전환된 항목입니다.
</p>
```

- [ ] **Step 3: Update tests**

In `lib/flow/content-lab.test.ts`, assert:

```ts
assert.ok(summary.previewGeneratedFlowCount >= 200);
```

In E2E Flow Lab test, expect:

```ts
await expect(page.getByText('200+ 제작자 채널 Flow 검증')).toBeVisible();
```

- [ ] **Step 4: Run tests**

Run: `npm test -- lib/flow/content-lab.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit lab update**

```powershell
git add lib/flow/content-lab.ts components/flow/ContentLab.tsx lib/flow/content-lab.test.ts tests/e2e/flow-mvp.spec.ts
git commit -m "feat: align flow lab with channel preview"
```

---

### Task 7: Full Verification and Vercel Preview

**Files:**
- No source edits expected unless verification exposes failures.

- [ ] **Step 1: Run unit tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: Next.js build succeeds and includes `/creators`.

- [ ] **Step 3: Run E2E tests**

Run: `npm run test:e2e`

Expected: all Playwright tests pass.

- [ ] **Step 4: Deploy Vercel Preview**

Run:

```powershell
npx vercel deploy --yes
```

Expected: Preview deployment returns a `READY` URL.

- [ ] **Step 5: Smoke check preview URL**

Run:

```powershell
$url = '<preview-url>'
(Invoke-WebRequest -Uri "$url/creators" -UseBasicParsing).StatusCode
(Invoke-WebRequest -Uri "$url/u/samsung-service" -UseBasicParsing).Content.Contains('채널 Flow 라이브러리')
(Invoke-WebRequest -Uri "$url/f/channel-samsung-service-월간-점검-루틴" -UseBasicParsing).StatusCode
```

Expected:

- `200`
- `True`
- `200`

- [ ] **Step 6: Commit any verification fixes**

If no source changes occurred, skip. If fixes were needed:

```powershell
git add <changed-files>
git commit -m "fix: stabilize creator channel preview"
```

---

## Self-Review

- Spec coverage: covered creator index, upgraded channel detail, 200+ real routes, Flow Lab relabeling, tests, and Vercel Preview.
- Placeholder scan: no incomplete markers or open-ended implementation steps remain.
- Type consistency: `FlowUser.channel_type`, `previewCreatorChannels`, `previewFlowBundles`, and `getCreatorChannelSummaries` are introduced once and reused consistently.
