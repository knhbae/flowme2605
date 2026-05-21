# Flow Tool Surface UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement FLOW's C-direction tool-surface UX so detail, copy/edit, and creator-channel screens show each Flow as a calendar, checklist, D-Day timeline, single action, or sheet-style working surface.

**Architecture:** Add a small surface model layer that maps existing Flow bundles to a primary `FlowSurfaceType`, then render shared surface preview components from that model. Keep exports and persistence in the existing static/local-storage architecture, but move the normal copy/edit path away from raw Markdown and into a surface-specific settings + preview editor.

**Tech Stack:** Next.js App Router, React, TypeScript, Node test runner, Playwright, existing local storage utilities, existing Excel/ICS export utilities.

---

## File Structure

- Create `lib/flow/surface.ts`
  - Owns `FlowSurfaceType`, `FlowSurfaceModel`, `inferFlowSurfaceType`, `getFlowSurfaceModel`, title-quality helpers, and creator-card metadata helpers.
  - Depends only on `lib/flow/types.ts`, `lib/flow/date.ts`, and `lib/flow/destination.ts`.
- Create `lib/flow/surface.test.ts`
  - Unit tests for surface inference, model fields, representative flows, title rules, and export priority.
- Create `components/flow/ToolSurfacePreview.tsx`
  - Pure React renderers for calendar routine, daily check, D-Day timeline, single action, and sheet tracker previews.
  - Receives a `FlowSurfaceModel` and callbacks; does not read storage.
- Create `components/flow/ToolSurfaceEditor.tsx`
  - Surface-first copy/edit screen for non-meal flows.
  - Owns editable settings state, live preview, save/publish calls, and collapsed raw Markdown advanced edit.
- Modify `components/flow/AppClient.tsx`
  - Import the new surface model and components.
  - Replace exact-video-only preview with general tool-surface preview on public Flow pages.
  - Route copied non-meal Flows to `ToolSurfaceEditor` instead of `TextFlowEditor`.
  - Update creator profile cards/filters to show source, task, rhythm, and tool.
- Modify `lib/flow/types.ts`
  - Add `FlowSurfaceType` only if the type is not colocated in `surface.ts`. Preferred: export it from `surface.ts` to keep existing data shape stable.
- Modify `lib/flow/seed-flows.test.ts`
  - Add content quality/title assertions for representative source-backed Flows.
- Modify `tests/e2e/flow-mvp.spec.ts`
  - Add detail, copy/edit, and creator-channel expectations for tool-surface UX.

---

### Task 1: Add Surface Model Failing Tests

**Files:**
- Create: `lib/flow/surface.test.ts`

- [ ] **Step 1: Create the failing test file**

Create `lib/flow/surface.test.ts` with:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { seedBundles } from './seed-flows';
import {
  getCreatorCardSurfaceMeta,
  getFlowSurfaceModel,
  hasGenericInternalTitle,
  inferFlowSurfaceType,
} from './surface';

function bySlug(slug: string) {
  const bundle = seedBundles.find((item) => item.flow.slug === slug);
  assert.ok(bundle, `missing seed bundle ${slug}`);
  return bundle;
}

test('representative flows map to a primary tool surface', () => {
  assert.equal(inferFlowSurfaceType(bySlug('real-thankyou-bubu-video-full-body-no-jump')), 'calendar_routine');
  assert.equal(inferFlowSurfaceType(bySlug('real-fitvely-video-body-fat-6kg-method')), 'daily_check');
  assert.equal(inferFlowSurfaceType(bySlug('moving-d30-basic')), 'dday_timeline');
  assert.equal(inferFlowSurfaceType(bySlug('real-qnet-application-examday-check')), 'dday_timeline');
});

test('surface model exposes first-screen recognition fields', () => {
  const model = getFlowSurfaceModel(bySlug('real-thankyou-bubu-video-full-body-no-jump'), {
    anchorDate: '2026-05-25',
    weekdays: ['월', '수', '금'],
  });

  assert.equal(model.type, 'calendar_routine');
  assert.equal(model.primaryToolLabel, '캘린더');
  assert.equal(model.rhythmLabel, '주 3회');
  assert.match(model.firstAction, /운동|영상/);
  assert.ok(model.previewEntries.length >= 3);
  assert.equal(model.primaryExport, 'calendar');
  assert.deepEqual(model.settings.map((setting) => setting.id), ['start_date', 'repeat_days', 'duration', 'missed_day']);
});

test('daily check model behaves like a checklist instead of workout calendar copy', () => {
  const model = getFlowSurfaceModel(bySlug('real-fitvely-video-body-fat-6kg-method'), {
    anchorDate: '2026-05-25',
    weekdays: ['월', '화', '수', '목', '금', '토', '일'],
  });

  assert.equal(model.type, 'daily_check');
  assert.equal(model.primaryToolLabel, '체크표');
  assert.equal(model.rhythmLabel, '매일');
  assert.equal(model.primaryExport, 'sheet');
  assert.ok(model.previewEntries.length >= 7);
  assert.ok(model.previewEntries.every((entry) => entry.label.includes('적용') || entry.label.includes('체크')));
});

test('creator card metadata exposes source task rhythm and tool', () => {
  const meta = getCreatorCardSurfaceMeta(bySlug('real-thankyou-bubu-video-full-body-no-jump'));

  assert.equal(meta.sourceKind, '정확한 출처');
  assert.match(meta.task, /운동|영상/);
  assert.equal(meta.rhythm, '주 3회');
  assert.equal(meta.tool, '캘린더');
  assert.match(meta.firstSetting, /시작일|요일/);
});

test('title quality helper catches internal abstraction titles', () => {
  assert.equal(hasGenericInternalTitle('FITVELY 탄수화물 기준 Flow'), true);
  assert.equal(hasGenericInternalTitle('운동/홈트 목표와 기준 정하기'), true);
  assert.equal(hasGenericInternalTitle('ThankyouBUBU 전신운동을 주 3회 캘린더에 넣기'), false);
});
```

- [ ] **Step 2: Run the failing tests**

Run:

```powershell
npm test -- lib/flow/surface.test.ts
```

Expected: FAIL with `Cannot find module './surface'`.

- [ ] **Step 3: Commit the failing test**

```powershell
git add lib/flow/surface.test.ts
git commit -m "test: define flow tool surface model"
```

---

### Task 2: Implement Surface Model

**Files:**
- Create: `lib/flow/surface.ts`
- Modify: `package.json`

- [ ] **Step 1: Add `surface.test.ts` to the unit test script**

In `package.json`, update `scripts.test` so it includes `lib/flow/surface.test.ts`:

```json
"test": "tsx --test lib/flow/date.test.ts lib/flow/parser.test.ts lib/flow/seed-flows.test.ts lib/flow/export.test.ts lib/flow/storage.test.ts lib/flow/surface.test.ts"
```

- [ ] **Step 2: Create `lib/flow/surface.ts`**

Create `lib/flow/surface.ts` with:

```ts
import { addDays, formatDate } from './date';
import { inferPrimaryDestination } from './destination';
import { FlowBundle, PrimaryDestination } from './types';

export type FlowSurfaceType =
  | 'calendar_routine'
  | 'daily_check'
  | 'dday_timeline'
  | 'single_action'
  | 'sheet_tracker';

export type SurfaceExportKind = 'calendar' | 'sheet' | 'memo' | 'checklist';

export type SurfaceSetting = {
  id: 'start_date' | 'target_date' | 'repeat_days' | 'duration' | 'missed_day' | 'daily_label' | 'columns' | 'proof_note';
  label: string;
  value: string;
};

export type SurfacePreviewEntry = {
  id: string;
  date?: string;
  day?: string;
  phase?: string;
  label: string;
  title: string;
  note?: string;
};

export type FlowSurfaceModel = {
  type: FlowSurfaceType;
  primaryToolLabel: string;
  rhythmLabel: string;
  firstAction: string;
  primaryExport: SurfaceExportKind;
  secondaryExports: SurfaceExportKind[];
  settings: SurfaceSetting[];
  previewEntries: SurfacePreviewEntry[];
};

export type SurfaceModelOptions = {
  anchorDate?: string;
  weekdays?: string[];
};

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export function inferFlowSurfaceType(bundle: FlowBundle): FlowSurfaceType {
  const slug = bundle.flow.slug;
  const destination = inferPrimaryDestination(bundle);

  if (bundle.flow.content_type === 'meal_plan') return 'daily_check';
  if (slug.startsWith('real-thankyou-bubu-video-')) return 'calendar_routine';
  if (slug.startsWith('real-fitvely-video-')) {
    return destination === 'calendar' ? 'calendar_routine' : 'daily_check';
  }
  if (bundle.flow.structure_type === 'timeline' || bundle.flow.anchor_type === 'end_date') return 'dday_timeline';
  if (destination === 'sheet') return 'sheet_tracker';
  if (bundle.items.length <= 2 && bundle.flow.anchor_type === 'none') return 'single_action';
  if (bundle.flow.structure_type === 'routine') return 'calendar_routine';
  if (bundle.flow.structure_type === 'checklist') return 'daily_check';
  return 'single_action';
}

export function getFlowSurfaceModel(bundle: FlowBundle, options: SurfaceModelOptions = {}): FlowSurfaceModel {
  const type = inferFlowSurfaceType(bundle);
  const anchorDate = options.anchorDate || new Date().toISOString().slice(0, 10);
  const weekdays = options.weekdays?.length ? options.weekdays : defaultWeekdays(type);
  const firstAction = getFirstAction(bundle);

  if (type === 'calendar_routine') {
    return {
      type,
      primaryToolLabel: '캘린더',
      rhythmLabel: `주 ${weekdays.length}회`,
      firstAction,
      primaryExport: 'calendar',
      secondaryExports: ['sheet', 'memo'],
      settings: [
        { id: 'start_date', label: '시작일', value: anchorDate },
        { id: 'repeat_days', label: '반복 요일', value: weekdays.join(', ') },
        { id: 'duration', label: '기간', value: '4주' },
        { id: 'missed_day', label: '놓친 날 처리', value: '건너뛰기' },
      ],
      previewEntries: makeRecurringEntries(bundle, anchorDate, weekdays, 3, '캘린더 일정'),
    };
  }

  if (type === 'daily_check') {
    return {
      type,
      primaryToolLabel: '체크표',
      rhythmLabel: weekdays.length >= 7 ? '매일' : `주 ${weekdays.length}회`,
      firstAction,
      primaryExport: 'sheet',
      secondaryExports: ['memo', 'calendar'],
      settings: [
        { id: 'start_date', label: '시작일', value: anchorDate },
        { id: 'repeat_days', label: '적용 요일', value: weekdays.join(', ') },
        { id: 'daily_label', label: '체크 문구', value: firstAction },
      ],
      previewEntries: makeRecurringEntries(bundle, anchorDate, weekdays, 7, '적용 체크'),
    };
  }

  if (type === 'dday_timeline') {
    return {
      type,
      primaryToolLabel: 'D-Day 표',
      rhythmLabel: bundle.flow.anchor_type === 'end_date' ? '목표일 기준' : '시작일 기준',
      firstAction,
      primaryExport: 'sheet',
      secondaryExports: ['calendar', 'memo'],
      settings: [
        { id: bundle.flow.anchor_type === 'end_date' ? 'target_date' : 'start_date', label: bundle.flow.anchor_type === 'end_date' ? '목표일' : '시작일', value: anchorDate },
        { id: 'duration', label: '표시 범위', value: `${bundle.sections.length}단계` },
      ],
      previewEntries: bundle.sections.slice(0, 6).map((section) => ({
        id: section.id,
        phase: section.title,
        label: section.title,
        title: bundle.items.find((item) => item.section_id === section.id)?.title ?? section.description ?? section.title,
      })),
    };
  }

  if (type === 'sheet_tracker') {
    return {
      type,
      primaryToolLabel: '시트',
      rhythmLabel: '기록형',
      firstAction,
      primaryExport: 'sheet',
      secondaryExports: ['memo'],
      settings: [
        { id: 'columns', label: '열 구성', value: '날짜, 항목, 상태, 메모' },
        { id: 'start_date', label: '시작일', value: anchorDate },
      ],
      previewEntries: bundle.items.slice(0, 5).map((item, index) => ({
        id: item.id,
        date: formatDate(addDays(new Date(`${anchorDate}T00:00:00`), item.day_offset ?? index)),
        label: '시트 행',
        title: item.title,
        note: item.description,
      })),
    };
  }

  return {
    type,
    primaryToolLabel: '메모',
    rhythmLabel: '한 번 실행',
    firstAction,
    primaryExport: 'memo',
    secondaryExports: ['checklist', 'calendar'],
    settings: [
      { id: 'start_date', label: '실행일', value: anchorDate },
      { id: 'proof_note', label: '완료 기록', value: '완료 여부와 확인 메모 남기기' },
    ],
    previewEntries: bundle.items.slice(0, 3).map((item) => ({
      id: item.id,
      label: '오늘 할 일',
      title: item.title,
      note: item.description,
    })),
  };
}

export function getCreatorCardSurfaceMeta(bundle: FlowBundle) {
  const model = getFlowSurfaceModel(bundle);
  return {
    sourceKind: bundle.flow.source_status === 'real' && bundle.flow.source_precision === 'exact' ? '정확한 출처' : bundle.flow.source_status === 'real' ? '출처 확인' : '샘플',
    task: model.firstAction,
    rhythm: model.rhythmLabel,
    tool: model.primaryToolLabel,
    firstSetting: model.settings[0]?.label ?? '바로 실행',
  };
}

export function hasGenericInternalTitle(title: string): boolean {
  return /(기준 Flow|적용 Flow|관리 Flow|목표와 기준 정하기|문제 발생 대응 순서|체크리스트 실행)/.test(title);
}

export function getSurfaceExportLabel(kind: SurfaceExportKind): string {
  if (kind === 'calendar') return '캘린더에 넣기';
  if (kind === 'sheet') return '엑셀 실행표 받기';
  if (kind === 'memo') return '메모/노션에 복사';
  return '체크리스트 복사';
}

export function exportKindFromDestination(destination: PrimaryDestination): SurfaceExportKind {
  if (destination === 'calendar') return 'calendar';
  if (destination === 'sheet') return 'sheet';
  if (destination === 'memo') return 'memo';
  return 'checklist';
}

function defaultWeekdays(type: FlowSurfaceType): string[] {
  if (type === 'calendar_routine') return ['월', '수', '금'];
  if (type === 'daily_check') return WEEKDAYS;
  return ['월'];
}

function getFirstAction(bundle: FlowBundle): string {
  return bundle.items[0]?.title ?? bundle.flow.description ?? bundle.flow.title;
}

function makeRecurringEntries(
  bundle: FlowBundle,
  anchorDate: string,
  weekdays: string[],
  count: number,
  label: string,
): SurfacePreviewEntry[] {
  const start = new Date(`${anchorDate}T00:00:00`);
  const itemTitle = getFirstAction(bundle);
  const entries: SurfacePreviewEntry[] = [];
  let cursor = new Date(start);

  while (entries.length < count) {
    const day = WEEKDAYS[(cursor.getDay() + 6) % 7];
    if (weekdays.includes(day)) {
      entries.push({
        id: `${bundle.flow.id}-${entries.length}`,
        date: formatDate(cursor),
        day,
        label,
        title: itemTitle,
      });
    }
    cursor = addDays(cursor, 1);
  }

  return entries;
}
```

- [ ] **Step 3: Run the focused tests**

Run:

```powershell
npm test -- lib/flow/surface.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run all unit tests**

Run:

```powershell
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit the surface model**

```powershell
git add package.json lib/flow/surface.ts lib/flow/surface.test.ts
git commit -m "feat: add flow tool surface model"
```

---

### Task 3: Add Shared Tool Surface Preview Components

**Files:**
- Create: `components/flow/ToolSurfacePreview.tsx`
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add failing e2e expectations for generic surface labels**

In `tests/e2e/flow-mvp.spec.ts`, add this test near the exact-video tests:

```ts
test('public flow detail shows primary tool surface before execution details', async ({ page }) => {
  await page.goto('/f/real-thankyou-bubu-video-full-body-no-jump');

  await expect(page.getByRole('heading', { name: '내 도구에 들어간 모습' })).toBeVisible();
  await expect(page.getByText('도구: 캘린더')).toBeVisible();
  await expect(page.getByText('리듬: 주 3회')).toBeVisible();
  await expect(page.getByRole('heading', { name: '월간 캘린더 미리보기' })).toBeVisible();
  await expect(page.getByRole('button', { name: '캘린더에 넣기' })).toBeVisible();

  const surface = page.getByTestId('tool-surface-preview');
  await expect(surface).toBeVisible();
  await expect(surface).toContainText('운동');
});

test('daily check flow detail uses checklist surface', async ({ page }) => {
  await page.goto('/f/real-fitvely-video-body-fat-6kg-method');

  await expect(page.getByRole('heading', { name: '내 도구에 들어간 모습' })).toBeVisible();
  await expect(page.getByText('도구: 체크표')).toBeVisible();
  await expect(page.getByText('리듬: 매일')).toBeVisible();
  await expect(page.getByRole('heading', { name: '7일 체크표 미리보기' })).toBeVisible();
  await expect(page.getByText('적용 체크').first()).toBeVisible();
});
```

- [ ] **Step 2: Run e2e tests and confirm failure**

Run:

```powershell
npm run test:e2e -- --grep "primary tool surface|daily check flow detail"
```

Expected: FAIL because `ToolSurfacePreview` does not exist in the public page yet.

- [ ] **Step 3: Create the preview component**

Create `components/flow/ToolSurfacePreview.tsx` with:

```tsx
'use client';

import { FlowSurfaceModel, SurfaceExportKind, getSurfaceExportLabel } from '@/lib/flow/surface';

type ToolSurfacePreviewProps = {
  model: FlowSurfaceModel;
  onExport: (kind: SurfaceExportKind) => void;
  onCopyToEditableDraft: () => void;
  copyState?: string;
  downloadState?: string;
  calendarState?: string;
};

export function ToolSurfacePreview({
  model,
  onExport,
  onCopyToEditableDraft,
  copyState,
  downloadState,
  calendarState,
}: ToolSurfacePreviewProps) {
  return (
    <section className="my-6 rounded-xl border border-blue-100 bg-white p-5 shadow-sm" data-testid="tool-surface-preview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-blue-700">내 도구에 들어간 모습</h2>
          <h3 className="mt-1 text-2xl font-semibold text-gray-950">{getSurfaceTitle(model)}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">{getSurfaceDescription(model)}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700">도구: {model.primaryToolLabel}</span>
            <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">리듬: {model.rhythmLabel}</span>
          </div>
        </div>
        <button className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold" onClick={onCopyToEditableDraft}>
          내 Flow로 가져오기
        </button>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <SurfaceBody model={model} />
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-950">내 상황에 맞게 바꾸기</h3>
          <dl className="mt-3 grid gap-2 text-sm">
            {model.settings.map((setting) => (
              <div key={setting.id} className="rounded-md bg-gray-50 p-3">
                <dt className="font-semibold text-gray-950">{setting.label}</dt>
                <dd className="mt-1 text-gray-600">{setting.value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="mt-4 text-sm font-semibold text-gray-950">가져가기</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {[model.primaryExport, ...model.secondaryExports].map((kind, index) => (
              <button
                key={kind}
                className={
                  index === 0
                    ? 'rounded-md bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white'
                    : 'rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold'
                }
                onClick={() => onExport(kind)}
              >
                {getSurfaceExportLabel(kind)}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {calendarState ? <span className="text-blue-700">{calendarState}</span> : null}
            {downloadState ? <span className="text-blue-700">{downloadState}</span> : null}
            {copyState ? <span className="text-green-700">{copyState}</span> : null}
          </div>
        </section>
      </div>
    </section>
  );
}

function SurfaceBody({ model }: { model: FlowSurfaceModel }) {
  if (model.type === 'calendar_routine') return <CalendarSurface model={model} />;
  if (model.type === 'daily_check') return <DailyCheckSurface model={model} />;
  if (model.type === 'dday_timeline') return <TimelineSurface model={model} />;
  if (model.type === 'sheet_tracker') return <SheetSurface model={model} />;
  return <SingleActionSurface model={model} />;
}

function CalendarSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">월간 캘린더 미리보기</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {model.previewEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-blue-100 bg-white p-3">
            <p className="text-sm font-semibold text-blue-700">{entry.day}요일</p>
            <p className="mt-1 text-lg font-semibold text-gray-950">{entry.date}</p>
            <p className="mt-2 text-sm text-gray-600">{entry.label}</p>
            <p className="mt-1 text-sm font-medium text-gray-950">{entry.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function DailyCheckSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">7일 체크표 미리보기</h3>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {model.previewEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-gray-950">{entry.day}요일</p>
            <p className="mt-1 text-sm text-gray-500">{entry.date}</p>
            <p className="mt-2 text-xs font-medium text-blue-700">{entry.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TimelineSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">D-Day 단계표 미리보기</h3>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {model.previewEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-blue-700">{entry.phase}</p>
            <p className="mt-1 text-sm font-medium text-gray-950">{entry.title}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SingleActionSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">오늘 할 일 미리보기</h3>
      <div className="mt-4 space-y-2">
        {model.previewEntries.map((entry) => (
          <article key={entry.id} className="rounded-md border border-gray-200 bg-white p-3">
            <p className="text-sm font-semibold text-blue-700">{entry.label}</p>
            <p className="mt-1 text-sm font-medium text-gray-950">{entry.title}</p>
            {entry.note ? <p className="mt-1 text-sm text-gray-600">{entry.note}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function SheetSurface({ model }: { model: FlowSurfaceModel }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-[#FAFAF8] p-4">
      <h3 className="text-lg font-semibold text-gray-950">시트 실행표 미리보기</h3>
      <div className="mt-4 overflow-hidden rounded-md border border-gray-200 bg-white">
        {model.previewEntries.map((entry) => (
          <div key={entry.id} className="grid grid-cols-[120px_1fr_90px] border-b border-gray-100 p-3 text-sm last:border-b-0">
            <span className="text-gray-500">{entry.date ?? '-'}</span>
            <span className="font-medium text-gray-950">{entry.title}</span>
            <span className="text-blue-700">{entry.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function getSurfaceTitle(model: FlowSurfaceModel): string {
  if (model.type === 'calendar_routine') return '캘린더에 들어간 반복 일정';
  if (model.type === 'daily_check') return '체크표에 들어간 일별 적용';
  if (model.type === 'dday_timeline') return '날짜별로 정리된 D-Day 단계';
  if (model.type === 'sheet_tracker') return '엑셀에 들어갈 실행표';
  return '오늘 실행할 메모와 체크';
}

function getSurfaceDescription(model: FlowSurfaceModel): string {
  if (model.type === 'calendar_routine') return '콘텐츠가 반복 일정으로 먼저 들어갑니다. 시작일과 요일만 바꾸면 됩니다.';
  if (model.type === 'daily_check') return '콘텐츠의 원칙이 7일 체크표로 들어갑니다. 적용 요일과 문구만 바꾸면 됩니다.';
  if (model.type === 'dday_timeline') return '목표일까지 해야 할 일을 단계별 표로 먼저 보여줍니다.';
  if (model.type === 'sheet_tracker') return '반복 기록과 상태 관리를 엑셀형 실행표로 먼저 보여줍니다.';
  return '한 번 실행할 일을 메모와 체크 항목으로 먼저 보여줍니다.';
}
```

- [ ] **Step 4: Wire public page to the shared preview**

In `components/flow/AppClient.tsx`, add imports:

```ts
import { getFlowSurfaceModel, SurfaceExportKind } from '@/lib/flow/surface';
import { ToolSurfacePreview } from '@/components/flow/ToolSurfacePreview';
```

Inside `PublicFlow`, after `primaryDestination`, add:

```ts
const surfaceModel = getFlowSurfaceModel(bundle, {
  anchorDate: displayAnchor,
  weekdays: weekdaySelection,
});

const exportSurface = (kind: SurfaceExportKind) => {
  if (kind === 'calendar') {
    downloadCalendar();
    return;
  }
  if (kind === 'sheet') {
    void downloadExcel();
    return;
  }
  void copy();
};
```

Replace the `ExactVideoToolPreview` rendering branch with:

```tsx
<ToolSurfacePreview
  model={surfaceModel}
  onExport={exportSurface}
  onCopyToEditableDraft={copyToEditableDraft}
  copyState={copyState}
  downloadState={downloadState}
  calendarState={calendarState}
/>
```

Keep `ExactVideoRenderer` below the preview for exact video execution detail.

- [ ] **Step 5: Run focused e2e tests**

Run:

```powershell
npm run test:e2e -- --grep "primary tool surface|daily check flow detail|fitness exact video"
```

Expected: PASS after updating older exact-video expectations to the new labels.

- [ ] **Step 6: Run unit tests and build**

Run:

```powershell
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit shared preview integration**

```powershell
git add components/flow/ToolSurfacePreview.tsx components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: show shared tool surface previews"
```

---

### Task 4: Redesign Copy/Edit as Surface-First

**Files:**
- Create: `components/flow/ToolSurfaceEditor.tsx`
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add failing copy/edit e2e test**

Replace the body of the existing `exact video copy opens an editable draft with the execution item preserved` test with:

```ts
await page.goto('/f/real-thankyou-bubu-video-full-body-no-jump');

await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

await expect(page).toHaveURL(/\/flows\/.+\/edit/);
await expect(page.getByRole('heading', { name: '내 Flow로 가져왔습니다' })).toBeVisible();
await expect(page.getByText('이 Flow는 캘린더에 들어가는 반복 루틴입니다')).toBeVisible();
await expect(page.getByRole('heading', { name: '내 일정 설정' })).toBeVisible();
await expect(page.getByRole('heading', { name: '내 도구 미리보기' })).toBeVisible();
await expect(page.getByRole('heading', { name: '원문 고급 편집' })).toBeVisible();
await expect(page.locator('textarea').first()).not.toBeVisible();
await expect(page.getByLabel('실행 내용')).toHaveValue(/운동|영상/);
```

Add this test for D-Day copy:

```ts
test('copied D-Day flow edits dates before raw content', async ({ page }) => {
  await page.goto('/f/moving-d30-basic');

  await page.getByRole('button', { name: '내 Flow로 가져오기' }).click();

  await expect(page).toHaveURL(/\/flows\/.+\/edit/);
  await expect(page.getByRole('heading', { name: '내 Flow로 가져왔습니다' })).toBeVisible();
  await expect(page.getByText('이 Flow는 D-Day 표로 관리하는 일정입니다')).toBeVisible();
  await expect(page.getByLabel('목표일').or(page.getByLabel('시작일'))).toBeVisible();
  await expect(page.getByRole('heading', { name: 'D-Day 단계표 미리보기' })).toBeVisible();
});
```

- [ ] **Step 2: Run focused e2e tests and confirm failure**

Run:

```powershell
npm run test:e2e -- --grep "editable draft|D-Day flow edits"
```

Expected: FAIL because the editor is still Markdown-first.

- [ ] **Step 3: Create `ToolSurfaceEditor`**

Create `components/flow/ToolSurfaceEditor.tsx` with:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { FlowBundle, FlowItem } from '@/lib/flow/types';
import { getFlowSurfaceModel } from '@/lib/flow/surface';
import { serializeTextFlow } from '@/lib/flow/parser';
import { ToolSurfacePreview } from './ToolSurfacePreview';

type ToolSurfaceEditorProps = {
  bundle: FlowBundle;
  onSave: (bundle: FlowBundle) => void;
  renderHeader: (actions: { onSave: () => void; onPublish: () => void }) => React.ReactNode;
};

export function ToolSurfaceEditor({ bundle, onSave, renderHeader }: ToolSurfaceEditorProps) {
  const [anchorDate, setAnchorDate] = useState(new Date().toISOString().slice(0, 10));
  const [weekdays, setWeekdays] = useState(['월', '수', '금']);
  const [items, setItems] = useState<FlowItem[]>(bundle.items);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const model = useMemo(() => getFlowSurfaceModel({ ...bundle, items }, { anchorDate, weekdays }), [anchorDate, bundle, items, weekdays]);

  const save = (status = bundle.flow.status) => {
    onSave({
      ...bundle,
      items,
      flow: {
        ...bundle.flow,
        status,
        raw_text: bundle.flow.raw_text ?? serializeTextFlow(bundle.sections, items, bundle.itemDetails ?? [], bundle.warnings),
        updated_at: new Date().toISOString(),
      },
    });
    setSaveMessage(status === 'published' ? '발행됨' : '초안 저장됨');
    window.setTimeout(() => setSaveMessage(''), 1600);
  };

  const updateItemTitle = (id: string, title: string) => {
    setItems((value) => value.map((item) => (item.id === id ? { ...item, title } : item)));
  };

  return (
    <main className="mx-auto max-w-7xl px-5 py-8">
      {renderHeader({ onSave: () => save(), onPublish: () => save('published') })}
      {saveMessage ? <p className="mt-3 text-sm font-semibold text-blue-700">{saveMessage}</p> : null}
      <section className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-semibold text-blue-700">복사 완료</p>
        <h1 className="mt-1 text-3xl font-semibold text-gray-950">내 Flow로 가져왔습니다</h1>
        <p className="mt-2 text-gray-700">{getEditorIntro(model.type)}</p>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="text-xl font-semibold text-gray-950">내 일정 설정</h2>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-gray-700">{model.type === 'dday_timeline' ? '목표일' : '시작일'}</span>
            <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
          </label>
          {(model.type === 'calendar_routine' || model.type === 'daily_check') ? (
            <fieldset className="mt-4">
              <legend className="text-sm font-semibold text-gray-700">{model.type === 'daily_check' ? '적용 요일' : '반복 요일'}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
                  <label key={day} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
                    <input
                      className="mr-1"
                      type="checkbox"
                      checked={weekdays.includes(day)}
                      onChange={(event) => {
                        setWeekdays((value) => event.target.checked ? [...value, day] : value.filter((item) => item !== day));
                      }}
                    />
                    {day}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <label key={item.id} className="block">
                <span className="text-sm font-semibold text-gray-700">실행 내용</span>
                <input className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" value={item.title} onChange={(event) => updateItemTitle(item.id, event.target.value)} />
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="sr-only">내 도구 미리보기</h2>
          <ToolSurfacePreview model={model} onExport={() => save()} onCopyToEditableDraft={() => save()} />
        </section>
      </div>

      <details className="mt-6 rounded-xl border border-gray-200 bg-white p-5" open={showAdvanced} onToggle={(event) => setShowAdvanced(event.currentTarget.open)}>
        <summary className="cursor-pointer text-xl font-semibold text-gray-950">원문 고급 편집</summary>
        <textarea
          className="mt-4 min-h-72 w-full rounded-md border border-gray-300 p-3 font-mono text-sm"
          defaultValue={bundle.flow.raw_text ?? serializeTextFlow(bundle.sections, items, bundle.itemDetails ?? [], bundle.warnings)}
        />
      </details>
    </main>
  );
}

function getEditorIntro(type: string): string {
  if (type === 'calendar_routine') return '이 Flow는 캘린더에 들어가는 반복 루틴입니다. 시작일과 요일만 바꾸면 됩니다.';
  if (type === 'daily_check') return '이 Flow는 매일 적용하는 체크표입니다. 시작일과 적용 요일만 바꾸면 됩니다.';
  if (type === 'dday_timeline') return '이 Flow는 D-Day 표로 관리하는 일정입니다. 목표일을 바꾸면 됩니다.';
  if (type === 'sheet_tracker') return '이 Flow는 엑셀 실행표로 관리하는 기록입니다. 시작일과 항목명을 바꾸면 됩니다.';
  return '이 Flow는 한 번 실행할 메모와 체크 항목입니다. 실행일과 완료 기록만 바꾸면 됩니다.';
}
```

- [ ] **Step 4: Wire editor routing**

In `components/flow/AppClient.tsx`, import:

```ts
import { ToolSurfaceEditor } from '@/components/flow/ToolSurfaceEditor';
```

Change the `Editor` return branch to:

```tsx
return bundle.flow.content_type === 'meal_plan' ? (
  <MealPlanEditor bundle={bundle} onSave={save} />
) : (
  <ToolSurfaceEditor
    bundle={bundle}
    onSave={save}
    renderHeader={({ onSave, onPublish }) => <EditorHeader bundle={bundle} onSave={onSave} onPublish={onPublish} />}
  />
);
```

Keep `TextFlowEditor` in the file for advanced reuse or future creator-specific routing, but no longer use it as the normal non-meal default.

- [ ] **Step 5: Run focused e2e tests**

Run:

```powershell
npm run test:e2e -- --grep "editable draft|D-Day flow edits"
```

Expected: PASS.

- [ ] **Step 6: Run full verification**

Run:

```powershell
npm test
npm run build
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 7: Commit copy/edit redesign**

```powershell
git add components/flow/ToolSurfaceEditor.tsx components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: edit copied flows as tool surfaces"
```

---

### Task 5: Redesign Creator Channel Cards Around Goal and Tool

**Files:**
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add failing creator channel e2e test**

Add:

```ts
test('creator channel cards show source task rhythm and tool', async ({ page }) => {
  await page.goto('/u/thankyou-bubu');

  await expect(page.getByRole('heading', { name: '목적별 Flow 라이브러리' })).toBeVisible();
  await expect(page.getByText('정확한 출처')).toBeVisible();
  await expect(page.getByText('도구: 캘린더').first()).toBeVisible();
  await expect(page.getByText('리듬: 주 3회').first()).toBeVisible();
  await expect(page.getByText('첫 설정: 시작일').first()).toBeVisible();
  await expect(page.getByRole('button', { name: '캘린더형' })).toBeVisible();
  await expect(page.getByRole('button', { name: '체크표형' })).toBeVisible();
});
```

- [ ] **Step 2: Run focused e2e and confirm failure**

Run:

```powershell
npm run test:e2e -- --grep "creator channel cards show source"
```

Expected: FAIL because cards do not expose the new metadata yet.

- [ ] **Step 3: Import surface helpers**

In `components/flow/AppClient.tsx`, extend the surface import:

```ts
import {
  FlowSurfaceType,
  SurfaceExportKind,
  getCreatorCardSurfaceMeta,
  getFlowSurfaceModel,
  inferFlowSurfaceType,
} from '@/lib/flow/surface';
```

- [ ] **Step 4: Add surface filter state in `CreatorProfile`**

Inside `CreatorProfile`, add:

```ts
const [surfaceFilter, setSurfaceFilter] = useState<'all' | FlowSurfaceType>('all');
```

Update `visibleCreatorBundles` with:

```ts
.filter((bundle) => (surfaceFilter === 'all' ? true : inferFlowSurfaceType(bundle) === surfaceFilter))
```

- [ ] **Step 5: Rename the library heading and add surface filter buttons**

Change the library heading to:

```tsx
<h2 className="text-2xl font-semibold">목적별 Flow 라이브러리</h2>
```

Add this filter row before category pills:

```tsx
<div className="mb-3 flex flex-wrap gap-2">
  {[
    ['all', '전체'],
    ['calendar_routine', '캘린더형'],
    ['daily_check', '체크표형'],
    ['dday_timeline', 'D-Day형'],
    ['sheet_tracker', '시트형'],
    ['single_action', '메모형'],
  ].map(([key, label]) => (
    <button
      key={key}
      className={`rounded-md border px-3 py-2 text-sm font-semibold ${
        surfaceFilter === key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'
      }`}
      type="button"
      onClick={() => setSurfaceFilter(key as 'all' | FlowSurfaceType)}
    >
      {label}
    </button>
  ))}
</div>
```

- [ ] **Step 6: Update `FlowCard` metadata display**

Inside `FlowCard`, compute:

```ts
const surfaceMeta = getCreatorCardSurfaceMeta(bundle);
```

In the card body, add:

```tsx
<dl className="mt-3 grid gap-1 text-sm text-gray-700">
  <div className="flex gap-1">
    <dt className="font-semibold">출처:</dt>
    <dd>{surfaceMeta.sourceKind}</dd>
  </div>
  <div className="flex gap-1">
    <dt className="font-semibold">할 일:</dt>
    <dd>{surfaceMeta.task}</dd>
  </div>
  <div className="flex gap-1">
    <dt className="font-semibold">리듬:</dt>
    <dd>{surfaceMeta.rhythm}</dd>
  </div>
  <div className="flex gap-1">
    <dt className="font-semibold">도구:</dt>
    <dd>{surfaceMeta.tool}</dd>
  </div>
  <div className="flex gap-1">
    <dt className="font-semibold">첫 설정:</dt>
    <dd>{surfaceMeta.firstSetting}</dd>
  </div>
</dl>
```

- [ ] **Step 7: Run focused e2e**

Run:

```powershell
npm run test:e2e -- --grep "creator channel cards show source"
```

Expected: PASS.

- [ ] **Step 8: Run full verification**

Run:

```powershell
npm test
npm run build
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 9: Commit creator channel redesign**

```powershell
git add components/flow/AppClient.tsx tests/e2e/flow-mvp.spec.ts
git commit -m "feat: organize creator flows by tool surface"
```

---

### Task 6: Clean Up Representative Titles and Guard Against Generic Copy

**Files:**
- Modify: `lib/flow/real-source-channel-batch.ts`
- Modify: `lib/flow/seed-flows.test.ts`
- Modify: `lib/flow/surface.test.ts`

- [ ] **Step 1: Add failing title quality test**

In `lib/flow/seed-flows.test.ts`, add:

```ts
test('representative source-backed flows use action and tool oriented titles', () => {
  const representativeSlugs = [
    'real-thankyou-bubu-video-full-body-no-jump',
    'real-fitvely-video-body-fat-6kg-method',
    'real-fitvely-video-carb-reason',
    'moving-d30-basic',
    'real-qnet-application-examday-check',
  ];

  for (const slug of representativeSlugs) {
    const bundle = seedBundles.find((item) => item.flow.slug === slug);
    assert.ok(bundle, `missing ${slug}`);
    assert.equal(hasGenericInternalTitle(bundle.flow.title), false, `${slug} has generic title: ${bundle.flow.title}`);
    assert.match(
      bundle.flow.title,
      /(캘린더|체크표|D-Day|일정표|실행표|메모|관리|넣기|적용하기|준비하기)/,
      `${slug} title does not show action/tool: ${bundle.flow.title}`,
    );
  }
});
```

Add the import:

```ts
import { hasGenericInternalTitle } from './surface';
```

- [ ] **Step 2: Run focused test and confirm failure**

Run:

```powershell
npm test -- --test-name-pattern "action and tool oriented titles"
```

Expected: FAIL for any representative title that still uses internal abstraction wording.

- [ ] **Step 3: Update representative title data**

In `lib/flow/real-source-channel-batch.ts`, update exact-video title generation so these slugs produce action/tool-oriented titles:

```ts
const title = video.channelSlug === 'thankyou-bubu'
  ? `${channel.name} ${video.titleShort}을 주 3회 캘린더에 넣기`
  : video.kind === 'diet'
    ? `${channel.name} ${video.titleShort}을 7일 체크표로 적용하기`
    : `${channel.name} ${video.titleShort}을 캘린더 루틴으로 실행하기`;
```

If the file does not already expose `titleShort`, add it to each `CreatorVideoSpec` entry with short source-preserving phrases, for example:

```ts
titleShort: '전신운동',
titleShort: '체지방 감량 원칙',
titleShort: '탄수화물 원칙',
```

For moving and Q-Net seed flows, update titles in the source bundle definitions to:

```ts
title: '이사 D-30 할 일을 월간 일정표로 준비하기'
title: 'Q-Net 시험 준비물을 D-Day 체크표로 관리하기'
```

- [ ] **Step 4: Run focused test**

Run:

```powershell
npm test -- --test-name-pattern "action and tool oriented titles"
```

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm test
npm run build
npm run test:e2e
```

Expected: PASS. Update e2e heading expectations if title changes require it.

- [ ] **Step 6: Commit content cleanup**

```powershell
git add lib/flow/real-source-channel-batch.ts lib/flow/seed-flows.ts lib/flow/seed-flows.test.ts lib/flow/surface.test.ts tests/e2e/flow-mvp.spec.ts
git commit -m "fix: make source flow titles action oriented"
```

---

### Task 7: Visual QA and Production Readiness

**Files:**
- Create generated artifacts only under `test-results/`.
- No source changes unless QA finds a defect.

- [ ] **Step 1: Run full automated verification**

Run:

```powershell
npm test
npm run build
npm run test:e2e
```

Expected: all commands PASS.

- [ ] **Step 2: Capture desktop and mobile screenshots**

Run a Playwright screenshot script against local or production after starting the app. If local:

```powershell
npm run build
Start-Process -FilePath powershell -ArgumentList @('-NoProfile','-Command','cd D:\flowme2605\flow-mvp\.worktrees\flow-20-content-ux; npm run start -- -p 3104') -WindowStyle Hidden
```

Then capture:

```powershell
node -e "const { chromium } = require('@playwright/test'); const fs = require('fs'); (async()=>{ const out='test-results/tool-surface-qa'; fs.mkdirSync(out,{recursive:true}); const pages=['/f/real-thankyou-bubu-video-full-body-no-jump','/f/real-fitvely-video-body-fat-6kg-method','/f/moving-d30-basic','/f/real-qnet-application-examday-check','/u/thankyou-bubu']; const browser=await chromium.launch(); for (const vp of [{name:'desktop',width:1440,height:1100},{name:'mobile',width:390,height:844}]) { const context=await browser.newContext({viewport:vp}); const page=await context.newPage(); for (const target of pages) { await page.goto('http://localhost:3104'+target,{waitUntil:'networkidle'}); await page.screenshot({path:`${out}/${target.replace(/[^a-z0-9]+/gi,'-')}-${vp.name}.png`, fullPage:true}); } await context.close(); } await browser.close(); })();"
```

Expected: screenshots are written to `test-results/tool-surface-qa`.

- [ ] **Step 3: Manually inspect screenshots**

Check these concrete points:

- Workout detail first screen shows `도구: 캘린더`, `리듬: 주 3회`, and calendar preview before execution detail.
- Diet detail first screen shows `도구: 체크표`, `리듬: 매일`, and 7-day checklist preview.
- Copy/edit page shows `내 Flow로 가져왔습니다`, settings, and preview before raw Markdown.
- Creator channel cards show source/task/rhythm/tool/first setting.
- Mobile screenshots do not require horizontal scrolling and primary buttons remain visible.

- [ ] **Step 4: Commit QA fixes if needed**

Only if screenshot inspection reveals a defect, make the minimal source change and run:

```powershell
npm test
npm run build
npm run test:e2e
```

Commit:

```powershell
git add <changed-files>
git commit -m "fix: polish tool surface ux"
```

If no source changes are needed, do not commit screenshots because `test-results/` is ignored.

---

## Self-Review Checklist

- Spec coverage: Tasks 1-2 cover the surface type/model requirement. Task 3 covers detail-page tool previews. Task 4 covers copy/edit surface-first behavior. Task 5 covers creator-channel purpose/tool cards. Task 6 covers title/copy quality. Task 7 covers verification and screenshot QA.
- Concrete-step scan: The plan contains concrete tests, implementation snippets, and exact verification commands. Each test and implementation step includes concrete code or commands.
- Type consistency: `FlowSurfaceType`, `FlowSurfaceModel`, `SurfaceExportKind`, and helper names are introduced in Task 2 and reused consistently in later tasks.
