# Travel Proof Emergency Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add official-confirmation and emergency-contact memo artifacts to travel timeline Workbenches.

**Architecture:** Reuse the artifact field registry created for the moving Workbench. Add travel-specific memo fields keyed by Flow slug, render a generic memo card title/description based on field metadata, and export non-empty memo fields through the existing Workbench export path.

**Tech Stack:** Next.js, React, TypeScript, Node test runner, Playwright.

---

### Task 1: Export Regression

**Files:**
- Test: `lib/flow/export.test.ts`
- Modify later: `lib/flow/artifact-fields.ts`

- [ ] **Step 1: Write the failing export test**

Add a test named `travel export includes official confirmation and emergency memo records` after the moving export test:

```ts
test('travel export includes official confirmation and emergency memo records', () => {
  const travel = seedBundles.find((bundle) => bundle.flow.slug === 'overseas-travel-d14');
  assert.ok(travel);

  const workbenchState = {
    occurrences: {},
    logRows: {},
    memoCards: {
      'travel-destination': '일본 도쿄',
      'travel-entry-condition': '무비자 90일, 여권 6개월 이상 확인',
      'travel-emergency-contact': '영사콜센터 +82-2-3210-0404 / 주일본대사관',
    },
  };

  const text = buildText(travel, {}, '2026-07-18', {}, undefined, workbenchState);

  assert.match(text, /방문 국가\/도시: 일본 도쿄/);
  assert.match(text, /입국 조건 확인 결과: 무비자 90일, 여권 6개월 이상 확인/);
  assert.match(text, /영사콜센터·현지 공관: 영사콜센터 \+82-2-3210-0404 \/ 주일본대사관/);

  const sheets = buildWorkbookSheets(travel, {}, '2026-07-18', { workbenchState });
  const workbench = sheets.find((sheet) => sheet.name === '실행판 기록');
  assert.ok(workbench);
  assert.ok(workbench.rows.some((row) => row.includes('방문 국가/도시') && row.includes('일본 도쿄')));
  assert.ok(workbench.rows.some((row) => row.includes('영사콜센터·현지 공관') && row.includes('주일본대사관')));
});
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npx tsx --test lib/flow/export.test.ts
```

Expected: test fails because travel memo field ids export as raw ids instead of Korean labels.

### Task 2: E2E Persistence Regression

**Files:**
- Test: `tests/e2e/flow-mvp.spec.ts`
- Modify later: `components/flow/ArtifactWorkbench.tsx`

- [ ] **Step 1: Extend the existing Workbench persistence E2E**

After the moving assertions and before the routine Flow section, add:

```ts
await page.goto('/f/overseas-travel-d14');
await page.getByLabel('출국일').fill('2026-07-18');
const travelWorkbench = page.getByLabel('Flow artifact workbench');
await expect(travelWorkbench.getByText('공식 확인·비상 카드')).toBeVisible();
await travelWorkbench.getByLabel('방문 국가/도시').fill('일본 도쿄');
await travelWorkbench.getByLabel('입국 조건 확인 결과').fill('무비자 90일, 여권 6개월 이상 확인');
await travelWorkbench.getByLabel('영사콜센터·현지 공관').fill('영사콜센터 +82-2-3210-0404 / 주일본대사관');

await page.reload();
const restoredTravelWorkbench = page.getByLabel('Flow artifact workbench');
await expect(restoredTravelWorkbench.getByLabel('방문 국가/도시')).toHaveValue('일본 도쿄');
await expect(restoredTravelWorkbench.getByLabel('입국 조건 확인 결과')).toHaveValue('무비자 90일, 여권 6개월 이상 확인');
await expect(restoredTravelWorkbench.getByLabel('영사콜센터·현지 공관')).toHaveValue('영사콜센터 +82-2-3210-0404 / 주일본대사관');
```

- [ ] **Step 2: Verify RED**

Run:

```powershell
npm run test:e2e -- --grep "artifact workbench saves local execution entries"
```

Expected: fails because the travel card and fields do not render yet.

### Task 3: Artifact Field Registry

**Files:**
- Modify: `lib/flow/artifact-fields.ts`

- [ ] **Step 1: Add field metadata**

Add a title/description to `ArtifactMemoField` and create travel field definitions:

```ts
export type ArtifactMemoField = {
  id: string;
  label: string;
  placeholder: string;
  groupTitle?: string;
  groupEyebrow?: string;
  groupDescription?: string;
};
```

Travel fields:

```ts
const travelProofMemoFields: ArtifactMemoField[] = [
  { id: 'travel-destination', label: '방문 국가/도시', placeholder: '예) 일본 도쿄', groupEyebrow: '공식 확인·비상 카드', groupTitle: '공식 확인·비상 카드', groupDescription: '국가별 입국 조건과 비상 연락처를 한 장에 남겨둡니다.' },
  { id: 'travel-entry-condition', label: '입국 조건 확인 결과', placeholder: '예) 무비자 90일, 여권 6개월 이상 확인' },
  { id: 'travel-alert-status', label: '여행경보 확인 결과', placeholder: '예) 외교부 안전공지 2026-07-16 확인' },
  { id: 'travel-baggage-rule', label: '항공·수하물 규정 확인', placeholder: '예) 보조배터리 기내만, 액체류 100ml' },
  { id: 'travel-emergency-contact', label: '영사콜센터·현지 공관', placeholder: '예) 영사콜센터 +82-2-3210-0404 / 주일본대사관' },
  { id: 'travel-share-note', label: '숙소·보험·가족 공유 메모', placeholder: '예) 호텔 주소와 보험 연락처를 가족 단톡방에 공유' },
];
```

Return these fields for `overseas-travel-d14` and `real-mofa-overseas-travel-prep`.

- [ ] **Step 2: Verify export GREEN**

Run:

```powershell
npx tsx --test lib/flow/export.test.ts
```

Expected: all export tests pass.

### Task 4: Generic Memo Card Copy

**Files:**
- Modify: `components/flow/ArtifactWorkbench.tsx`

- [ ] **Step 1: Make `ProofMemoCard` use field metadata**

Use the first field as metadata source:

```tsx
const metadata = fields[0];
const eyebrow = metadata?.groupEyebrow ?? '계약·결제 증빙';
const title = metadata?.groupTitle ?? '증빙 메모';
const description = metadata?.groupDescription ?? '견적, 계약금, 잔금, 보상 기준을 흩어진 캡처 대신 한곳에 남겨둡니다.';
```

Render those values instead of moving-specific copy.

- [ ] **Step 2: Verify E2E GREEN**

Run:

```powershell
npm run test:e2e -- --grep "artifact workbench saves local execution entries"
```

Expected: persistence scenario passes for moving, travel, routine, and log Workbenches.

### Task 5: Final Gates and PR Memory

**Files:**
- Create: `docs/pr-history/2026-05-23-travel-proof-emergency-workbench.md`

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
git add components/flow/ArtifactWorkbench.tsx lib/flow/artifact-fields.ts lib/flow/export.test.ts tests/e2e/flow-mvp.spec.ts docs/pr-history/2026-05-23-travel-proof-emergency-workbench.md
git add -f docs/superpowers/specs/2026-05-23-travel-proof-emergency-workbench-design.md docs/superpowers/plans/2026-05-23-travel-proof-emergency-workbench.md
git commit -m "feat: add travel proof emergency workbench"
```
