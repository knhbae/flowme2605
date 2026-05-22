# Study Score Log Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add chapter progress and past-exam score/wrong-answer tables to the Sinagong certification-study timeline Workbench.

**Architecture:** Extend the existing artifact-field registry with log-table metadata keyed by Flow slug. Render log tables in timeline Workbenches using the existing `FlowWorkbenchState.logRows` state map, export log values through the existing Workbench export sheet, and gate timeline comparison tables behind explicit comparison configuration.

**Tech Stack:** Next.js, React, TypeScript, Node test runner, Playwright.

---

### Task 1: Export Regression

**Files:**
- Test: `lib/flow/export.test.ts`
- Modify: `lib/flow/artifact-fields.ts`
- Modify: `lib/flow/export.ts`

- [ ] **Step 1: Write the failing export test**

Add a test named `study export includes chapter progress and mock score records` after the travel export test:

```ts
test('study export includes chapter progress and mock score records', () => {
  const study = seedBundles.find((bundle) => bundle.flow.slug === 'real-sinagong-computer-d30-study');
  assert.ok(study);

  const workbenchState = {
    occurrences: {},
    logRows: {
      'study-chapter-week-1': {
        scope: '1~3장',
        targetDate: '2026-06-12',
        status: '완료',
        note: '요약노트 작성',
      },
      'study-mock-1': {
        solvedDate: '2026-06-13',
        score: '78점',
        wrongAnswers: '계산 문제 4개',
        retryDate: '2026-06-15',
        weaknessNote: '스프레드시트 함수',
      },
    },
    memoCards: {},
  };

  const text = buildText(study, {}, '2026-07-05', {}, undefined, workbenchState);

  assert.match(text, /1주차 개념 1회독 범위: 1~3장/);
  assert.match(text, /1주차 개념 1회독 목표일: 2026-06-12/);
  assert.match(text, /기출 1회차 점수: 78점/);
  assert.match(text, /기출 1회차 오답: 계산 문제 4개/);

  const sheets = buildWorkbookSheets(study, {}, '2026-07-05', { workbenchState });
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(workbench);
  assert.ok(workbench.rows.some((row) => row.includes('1주차 개념 1회독') && row.includes('범위') && row.includes('1~3장')));
  assert.ok(workbench.rows.some((row) => row.includes('기출 1회차') && row.includes('점수') && row.includes('78점')));
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx tsx --test lib/flow/export.test.ts
```

Expected: the new test fails because `logRows` exports raw row ids and raw field ids.

### Task 2: E2E Persistence Regression

**Files:**
- Test: `tests/e2e/flow-mvp.spec.ts`
- Modify: `components/flow/ArtifactWorkbench.tsx`

- [ ] **Step 1: Extend the Workbench persistence E2E**

Inside `artifact workbench saves local execution entries`, add this block after the travel assertions and before `study-exam-d30-plan`:

```ts
await page.goto('/f/real-sinagong-computer-d30-study');
await page.getByLabel('시험일').fill('2026-07-05');
const studyWorkbench = page.getByLabel('Flow artifact workbench');
await expect(studyWorkbench.getByRole('heading', { name: '챕터 진도표' })).toBeVisible();
await expect(studyWorkbench.getByRole('heading', { name: '기출 점수·오답 기록' })).toBeVisible();
await studyWorkbench.getByLabel('1주차 개념 1회독 / 범위').fill('1~3장');
await studyWorkbench.getByLabel('1주차 개념 1회독 / 목표일').fill('2026-06-12');
await studyWorkbench.getByLabel('기출 1회차 / 점수').fill('78점');
await studyWorkbench.getByLabel('기출 1회차 / 오답').fill('계산 문제 4개');

await page.reload();
const restoredStudyWorkbench = page.getByLabel('Flow artifact workbench');
await expect(restoredStudyWorkbench.getByLabel('1주차 개념 1회독 / 범위')).toHaveValue('1~3장');
await expect(restoredStudyWorkbench.getByLabel('1주차 개념 1회독 / 목표일')).toHaveValue('2026-06-12');
await expect(restoredStudyWorkbench.getByLabel('기출 1회차 / 점수')).toHaveValue('78점');
await expect(restoredStudyWorkbench.getByLabel('기출 1회차 / 오답')).toHaveValue('계산 문제 4개');
```

- [ ] **Step 2: Add comparison cleanup assertion**

In the existing travel Workbench block, add:

```ts
await expect(travelWorkbench.getByRole('heading', { name: '이사 업체 후보 비교' })).toHaveCount(0);
```

- [ ] **Step 3: Verify RED**

Run:

```powershell
npm run test:e2e -- --grep "artifact workbench saves local execution entries"
```

Expected: fails because study log tables do not render yet.

### Task 3: Artifact Registry

**Files:**
- Modify: `lib/flow/artifact-fields.ts`

- [ ] **Step 1: Add log table types**

Add:

```ts
export type ArtifactLogColumn = {
  id: string;
  label: string;
  placeholder: string;
};

export type ArtifactLogRow = {
  id: string;
  label: string;
};

export type ArtifactLogTable = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  rows: ArtifactLogRow[];
  columns: ArtifactLogColumn[];
};
```

- [ ] **Step 2: Add study table metadata**

Add `studySlugs = new Set(['real-sinagong-computer-d30-study'])` and two table definitions:

```ts
const studyLogTables: ArtifactLogTable[] = [
  {
    id: 'study-chapter-progress',
    eyebrow: '학습 진도표',
    title: '챕터 진도표',
    description: '원본 자료와 교재 범위를 주차별 목표일로 나눠 적습니다.',
    rows: [
      { id: 'study-chapter-week-1', label: '1주차 개념 1회독' },
      { id: 'study-chapter-week-2', label: '2주차 기출 풀이' },
      { id: 'study-chapter-week-3', label: '3주차 오답 보완' },
      { id: 'study-chapter-final', label: '마지막 주 실전 점검' },
    ],
    columns: [
      { id: 'scope', label: '범위', placeholder: '예) 1~3장' },
      { id: 'targetDate', label: '목표일', placeholder: '예) 2026-06-12' },
      { id: 'status', label: '상태', placeholder: '예) 예정/진행/완료' },
      { id: 'note', label: '메모', placeholder: '예) 요약노트 작성' },
    ],
  },
  {
    id: 'study-mock-scores',
    eyebrow: '기출 기록표',
    title: '기출 점수·오답 기록',
    description: '기출 회차별 점수, 오답, 재풀이 날짜를 남겨 약점을 좁힙니다.',
    rows: [
      { id: 'study-mock-1', label: '기출 1회차' },
      { id: 'study-mock-2', label: '기출 2회차' },
      { id: 'study-mock-3', label: '기출 3회차' },
    ],
    columns: [
      { id: 'solvedDate', label: '풀이일', placeholder: '예) 2026-06-13' },
      { id: 'score', label: '점수', placeholder: '예) 78점' },
      { id: 'wrongAnswers', label: '오답', placeholder: '예) 계산 문제 4개' },
      { id: 'retryDate', label: '재풀이일', placeholder: '예) 2026-06-15' },
      { id: 'weaknessNote', label: '약점 메모', placeholder: '예) 스프레드시트 함수' },
    ],
  },
];
```

- [ ] **Step 3: Export helpers**

Add:

```ts
export function getLogTables(bundle: FlowBundle): ArtifactLogTable[] {
  if (studySlugs.has(bundle.flow.slug)) return studyLogTables;
  return [];
}

export function getComparisonConfig(bundle: FlowBundle): { title: string; eyebrow: string; rows: ArtifactComparisonRow[] } | undefined {
  if (movingSlugs.has(bundle.flow.slug)) {
    return { title: '이사 업체 후보 비교', eyebrow: '업체 비교표', rows: movingVendorComparisonRows };
  }
  return undefined;
}
```

### Task 4: Export Labels

**Files:**
- Modify: `lib/flow/export.ts`

- [ ] **Step 1: Import `getLogTables`**

Change:

```ts
import { getComparisonRows, getMemoCardFields } from './artifact-fields';
```

to:

```ts
import { getComparisonRows, getLogTables, getMemoCardFields } from './artifact-fields';
```

- [ ] **Step 2: Label log rows**

Inside `buildWorkbenchRows`, before iterating `state.logRows`, create row and column label maps:

```ts
const logRowLabels = new Map<string, string>();
const logFieldLabels = new Map<string, string>();
for (const table of getLogTables(bundle)) {
  for (const row of table.rows) logRowLabels.set(row.id, row.label);
  for (const column of table.columns) logFieldLabels.set(column.id, column.label);
}
```

Then change the log row push to:

```ts
rows.push(['기록', logRowLabels.get(date) ?? date, logFieldLabels.get(field) ?? field, value.trim()]);
```

- [ ] **Step 3: Verify export GREEN**

Run:

```powershell
npx tsx --test lib/flow/export.test.ts
```

Expected: all export tests pass.

### Task 5: Workbench UI

**Files:**
- Modify: `components/flow/ArtifactWorkbench.tsx`

- [ ] **Step 1: Import registry helpers**

Import `getComparisonConfig` and `getLogTables`.

- [ ] **Step 2: Add `LogTableCard`**

Create a component that renders a table with `aria-label={`${row.label} / ${column.label}`}` and writes values with `updateLogField(workbenchState, row.id, column.id, value)`.

- [ ] **Step 3: Render study log tables**

In `TimelineWorkbench`, compute:

```ts
const logTables = getLogTables(bundle);
const comparisonConfig = getComparisonConfig(bundle);
```

Render `logTables.map(...)` between the list/calendar grid and memo-card section.

- [ ] **Step 4: Gate timeline comparison table**

Render the comparison table only when `comparisonConfig` exists. Memo cards can render without a comparison table.

- [ ] **Step 5: Verify E2E GREEN**

Run:

```powershell
npm run test:e2e -- --grep "artifact workbench saves local execution entries"
```

Expected: moving, travel, study, routine, and diet persistence pass.

### Task 6: Final Gates and PR Memory

**Files:**
- Create: `docs/pr-history/2026-05-23-study-score-log-workbench.md`

- [ ] **Step 1: Write PR history**

Record why, changes, not done, decisions, files touched, verification, risks, and follow-ups.

- [ ] **Step 2: Run full gates**

Run:

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e
```

Expected: all commands pass.

- [ ] **Step 3: Commit**

Run:

```powershell
git add components/flow/ArtifactWorkbench.tsx lib/flow/artifact-fields.ts lib/flow/export.ts lib/flow/export.test.ts tests/e2e/flow-mvp.spec.ts docs/pr-history/2026-05-23-study-score-log-workbench.md
git add -f docs/superpowers/specs/2026-05-23-study-score-log-workbench-design.md docs/superpowers/plans/2026-05-23-study-score-log-workbench.md
git commit -m "feat: add study score log workbench"
```
