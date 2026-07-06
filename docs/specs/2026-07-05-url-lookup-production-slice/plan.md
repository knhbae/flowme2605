# URL Lookup Production Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a production URL lookup entry to `/flows` that reuses existing source-backed Flow conversions before any AI generation.

**Architecture:** Keep lookup and state classification in `lib/flow/url-first-lookup.ts`. Add a focused client component for the `/flows` result sheet inside `components/flow/AppClient.tsx` so it can sit above the existing catalog without changing Home or My Flow architecture. Extend tests before implementation so lookup canaries and user-facing `/flows` behavior are guarded.

**Tech Stack:** Next.js App Router, React client components, TypeScript, `node:test` via `tsx`, Playwright E2E, existing FlowMe source-backed data modules.

---

## Files

| File | Responsibility |
| --- | --- |
| `lib/flow/url-first-lookup.ts` | Canonicalize URLs, classify `hit`/`needs_review`/`miss`/`memo_draft`, expose source-backed canary lookup results, and keep AI disabled for P0. |
| `lib/flow/url-first-lookup.test.ts` | Unit coverage for at least three canary hits, needs-review gating, miss behavior, and no fake usage count. |
| `components/flow/AppClient.tsx` | Render `/flows` URL entry and result sheet above the existing catalog while preserving current catalog filters/cards. |
| `tests/e2e/flow-mvp.spec.ts` | Browser coverage for `/flows` URL entry, hit/miss/needs-review states, result links, and mobile overflow. |
| `docs/SERVICE_STRUCTURE.md` | Record that `/flows` now owns the public URL lookup production entry. |
| `docs/specs/2026-07-05-url-lookup-production-slice/qa.md` | Track verification evidence. |
| `lib/flow/url-first-supply-queue.ts` | Build, normalize, deduplicate, edit, remove, and re-check local URL production candidate requests keyed by canonical URL. |
| `lib/flow/url-first-supply-queue.test.ts` | Unit coverage for miss/needs-review candidate creation, duplicate canonical URL handling, malformed storage normalization, candidate editing/deletion, and resolved-hit availability. |

## Task 1: Lock Lookup Canaries With Failing Tests

**Files:**
- Modify: `lib/flow/url-first-lookup.test.ts`

- [ ] **Step 1: Add canary hit test**

```ts
test('source-backed canary URLs resolve to existing Flow Map hits', () => {
  const canaries = [
    {
      url: 'https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC_%EC%A4%80%EB%B9%84_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_2024_%EC%99%84%EB%B2%BD%EC%A0%95%EB%A6%AC!-23363?utm_source=blog',
      routeHref: '/flow-maps/curated-ajd-moving-d30',
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
  }
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `npx tsx --test lib/flow/url-first-lookup.test.ts`

Expected: FAIL because the Mathbang and wedding URL are not yet registered as `hit`.

## Task 2: Extend Lookup Registry From Existing Source-Backed Data

**Files:**
- Modify: `lib/flow/url-first-lookup.ts`

- [ ] **Step 1: Add source-backed map imports**

```ts
import {
  buildSourceBackedFlowMapPublishPackage,
  getCuratedSourceAppSeedFlowMaps,
  getSourceBackedHomepageFlowMaps,
} from './source-backed-my-flow';
```

- [ ] **Step 2: Build generic hit templates from map data**

Add a helper that converts source-backed map metadata into `UrlFirstLookupTemplate` using route `/flow-maps/${map.id}`, real source status, export modes `['calendar', 'markdown', 'checklist']`, and preview rows from the first three public child-flow steps.

- [ ] **Step 3: Merge dynamic templates with explicit templates**

Keep the existing vehicle `needs_review` explicit template. Let source-backed real maps populate `hit` templates so existing source URLs do not need one-off code for every canary.

- [ ] **Step 4: Run test and verify GREEN**

Run: `npx tsx --test lib/flow/url-first-lookup.test.ts`

Expected: PASS.

## Task 3: Add `/flows` URL Entry E2E Coverage

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add failing E2E test**

Add a test near the existing `/flows` catalog tests:

```ts
test('flow finding URL lookup reuses existing source-backed Flows first', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows');

  const lookup = page.getByTestId('flow-url-lookup-entry');
  await expect(lookup).toBeVisible();
  await lookup.getByLabel('원문 URL').fill('https://mathbang.net/13?utm_source=share');
  await lookup.getByRole('button', { name: 'Flow 찾기' }).click();

  const result = page.getByTestId('flow-url-lookup-result');
  await expect(result).toBeVisible();
  await expect(result).toContainText('이미 만들어진 Flow가 있어요');
  await expect(result).toContainText('중1 수학');
  await expect(result.getByRole('link', { name: '저장 전 보기' })).toHaveAttribute('href', '/flow-maps/middle-school-math-1');
  await expect(result).toContainText('캘린더');
  await expect(result).toContainText('Markdown');
  await expect(result).not.toContainText('source-backed');
  await expectNoHorizontalOverflow(page);
});
```

- [ ] **Step 2: Run E2E test and verify RED**

Run: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow finding URL lookup"`

Expected: FAIL because `/flows` does not yet render `flow-url-lookup-entry`.

## Task 4: Render `/flows` Lookup UI

**Files:**
- Modify: `components/flow/AppClient.tsx`

- [ ] **Step 1: Import lookup API**

```ts
import { lookupUrlFirstP0Input, type UrlFirstLookupResult } from '@/lib/flow/url-first-lookup';
```

- [ ] **Step 2: Add local state inside `FlowList`**

```ts
const [urlLookupInput, setUrlLookupInput] = useState('');
const [urlLookupResult, setUrlLookupResult] = useState<UrlFirstLookupResult | null>(null);
```

- [ ] **Step 3: Add submit handler**

```ts
function handleUrlLookupSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setUrlLookupResult(lookupUrlFirstP0Input(urlLookupInput));
}
```

- [ ] **Step 4: Render `FlowUrlLookupEntry` above the catalog search**

The entry must have `data-testid="flow-url-lookup-entry"`, a label `원문 URL`, a button `Flow 찾기`, and result sheet `data-testid="flow-url-lookup-result"`.

- [ ] **Step 5: Run E2E test and verify GREEN**

Run: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "flow finding URL lookup"`

Expected: PASS.

## Task 5: Record Route Ownership

**Files:**
- Modify: `docs/SERVICE_STRUCTURE.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [ ] **Step 1: Update `/flows` route row**

Add that `/flows` now owns URL lookup before catalog browsing and uses `url-first-lookup`.

- [ ] **Step 2: Update QA file with performed checks**

Record exact commands and results after verification runs.

## Task 6: Full Verification

**Files:**
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [ ] **Step 1: Run docs check**

Run: `npm.cmd run docs:check`

Expected: PASS.

- [ ] **Step 2: Run unit tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `npm.cmd run build`

Expected: PASS.

- [ ] **Step 4: Run mobile browser QA**

Run targeted Playwright or local browser script for `/flows` at 390px.

Expected: URL lookup entry and catalog both visible, no horizontal overflow, no console errors.

## Supply Queue Follow-up

### Task 7: Lock Candidate Request Domain Behavior

**Files:**
- Create: `lib/flow/url-first-supply-queue.test.ts`
- Create: `lib/flow/url-first-supply-queue.ts`
- Modify: `package.json`

- [ ] **Step 1: Add failing unit tests**

Add tests that call `lookupUrlFirstP0Input()` for one unknown URL and one `needs_review` URL, then verify `buildUrlFirstSupplyCandidate()` produces `miss_request` and `needs_review_request` records with canonical URL, original URL, title, memo, and saved date. Add a duplicate test where a noisy URL canonicalizes to the same URL and `upsertUrlFirstSupplyCandidate()` keeps one record.

- [ ] **Step 2: Run test to verify RED**

Run: `npx tsx --test lib/flow/url-first-supply-queue.test.ts`

Expected: FAIL because `url-first-supply-queue.ts` does not exist yet.

- [ ] **Step 3: Implement minimal domain helper**

Create `lib/flow/url-first-supply-queue.ts` with:

```ts
export type UrlFirstSupplyCandidateStatus = 'miss_request' | 'needs_review_request';

export type UrlFirstSupplyCandidate = {
  canonicalUrl: string;
  originalUrl: string;
  title: string;
  memo: string;
  status: UrlFirstSupplyCandidateStatus;
  savedAt: string;
};
```

Add pure helpers for candidate creation, queue normalization, and canonical dedupe. Do not add AI, crawling, public counts, or server persistence.

- [ ] **Step 4: Run unit test to verify GREEN**

Run: `npx tsx --test lib/flow/url-first-supply-queue.test.ts`

Expected: PASS.

### Task 8: Add `/flows` Candidate Request UI

**Files:**
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add failing E2E coverage**

Add a `/flows` E2E test that clears localStorage, enters an unknown URL, saves it as a production candidate with title and memo, verifies the local storage queue has one `miss_request`, searches the same canonical URL with tracking parameters, verifies the UI shows the existing candidate instead of creating a second record, then saves the existing `vehicle-inspection-prep` needs-review URL as `needs_review_request`.

- [ ] **Step 2: Run E2E to verify RED**

Run: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "URL lookup saves production candidates"`

Expected: FAIL because the candidate request form/list is not rendered.

- [ ] **Step 3: Implement `/flows` local candidate queue UI**

Load `URL_FIRST_SUPPLY_CANDIDATES_STORAGE_KEY` from localStorage in `FlowList`, pass the queue to `FlowUrlLookupResult`, render `제작 후보로 저장` only for `miss` and `needs_review`, and render a `내가 요청한 후보` section above the catalog when the queue is non-empty. Keep the copy explicit: `아직 실행 가능한 Flow 아님`.

- [ ] **Step 4: Run E2E to verify GREEN**

Run: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "URL lookup saves production candidates"`

Expected: PASS.

### Task 9: Document and Verify Supply Queue

**Files:**
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`
- Modify: `docs/SERVICE_STRUCTURE.md`
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: Record the supply queue scope**

Add a task section and decision note that the queue is local, canonical URL keyed, non-executable, and AI-free.

- [ ] **Step 2: Run verification**

Run `npm.cmd run docs:check`, `npm test`, targeted Playwright URL lookup suite, and `npm.cmd run build`. Add mobile browser QA evidence for the `/flows` candidate list with overflow 0.

## Candidate Revisit Follow-up

### Task 10: Lock Candidate Management Domain Behavior

**Files:**
- Modify: `lib/flow/url-first-supply-queue.test.ts`
- Modify: `lib/flow/url-first-supply-queue.ts`

- [x] **Step 1: Add failing unit tests**

Add tests for editing a candidate title/memo without changing canonical URL, original URL, status, or saved date; removing a candidate by canonical URL; and detecting when a stored candidate's canonical URL now resolves to an executable `hit`.

- [x] **Step 2: Run unit test to verify RED**

Run: `npx tsx --test lib\flow\url-first-supply-queue.test.ts`

Expected: FAIL because update/remove/availability helpers are missing.

- [x] **Step 3: Implement minimal domain helpers**

Add `updateUrlFirstSupplyCandidate`, `removeUrlFirstSupplyCandidate`, and `getUrlFirstSupplyCandidateAvailability`. Availability reuses the current `lookupUrlFirstP0Input()` result and never creates AI drafts, crawls, server records, public counts, or admin workflow.

- [x] **Step 4: Run unit test to verify GREEN**

Run: `npx tsx --test lib\flow\url-first-supply-queue.test.ts`

Expected: PASS.

### Task 11: Add `/flows` Candidate Management UI

**Files:**
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [x] **Step 1: Add failing E2E coverage**

Seed localStorage with one missing candidate, one needs-review candidate, and one candidate whose canonical URL now resolves to a hit. Verify the list exposes original URL, canonical re-query, edit, delete, and `이제 실행 가능` handoff behavior.

- [x] **Step 2: Run E2E to verify RED**

Run: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "production candidates can be revisited"`

Expected: FAIL because candidate cards do not yet expose the management states/actions.

- [x] **Step 3: Implement management cards**

Replace the static candidate list with per-candidate cards that show request status, current availability, original URL link, re-query/hit handoff button, title/memo edit form, and delete action. Keep storage local-only and preserve canonical dedupe.

- [x] **Step 4: Run E2E to verify GREEN**

Run: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "production candidates can be revisited"`

Expected: PASS.

## Candidate-to-Production Handoff Follow-up

### Task 12: Lock Production Handoff Domain Behavior

**Files:**
- Modify: `lib/flow/url-first-supply-queue.test.ts`
- Modify: `lib/flow/url-first-supply-queue.ts`

- [x] **Step 1: Add failing unit tests**

Add tests proving a candidate can record the last canonical lookup result without changing request identity, and can generate a production handoff Markdown containing canonical URL, original URL, user title/memo, request state, current availability, last lookup, AI/crawling disabled note, and the manual conversion checklist.

- [x] **Step 2: Run unit test to verify RED**

Run: `npx tsx --test lib\flow\url-first-supply-queue.test.ts`

Expected: FAIL because `recordUrlFirstSupplyCandidateLookup` and `buildUrlFirstSupplyCandidateProductionMarkdown` are missing.

- [x] **Step 3: Implement minimal domain helpers**

Add optional `lastLookup` metadata to local candidate rows, preserve it through normalization, record it on canonical re-query, expose the manual production checklist, and build a Markdown handoff. Do not add AI generation, crawling, admin workflow, server persistence, account storage, public counts, or automatic seed creation.

- [x] **Step 4: Run unit test to verify GREEN**

Run: `npx tsx --test lib\flow\url-first-supply-queue.test.ts`

Expected: PASS.

### Task 13: Add `/flows` Production Handoff UI

**Files:**
- Modify: `components/flow/AppClient.tsx`
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [x] **Step 1: Add failing E2E coverage**

Seed localStorage with one pending candidate and one resolved-hit candidate. Verify `제작용 정보 보기`, canonical/original URL information, last lookup result, manual checklist, `제작용 Markdown 복사`, and resolved-hit priority copy while keeping `Flow 결과로 이동` visible.

- [x] **Step 2: Run E2E to verify RED**

Run: `npx playwright test tests/e2e/flow-mvp.spec.ts -g "production handoff markdown"`

Expected: FAIL because requested-candidate cards do not yet expose the production handoff panel or copy action.

- [x] **Step 3: Implement production handoff panel**

Add a collapsed `제작용 정보` panel to requested-candidate cards, copy handoff Markdown through clipboard/fallback copy, persist `lastLookup` whenever the user re-runs canonical lookup, and keep resolved-hit cards oriented toward the normal hit result/start flow.

- [x] **Step 4: Run E2E to verify GREEN**

Run: `npm.cmd run build` then `npx playwright test tests/e2e/flow-mvp.spec.ts -g "production handoff markdown"`

Expected: PASS.

## Manual Registration Loop Follow-up

### Task 14: Lock Candidate to Manual Source-backed Registration Behavior

**Files:**
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `lib/flow/url-first-supply-queue.test.ts`
- Modify: `lib/flow/source-backed-my-flow.ts`
- Modify: `lib/flow/url-first-lookup.ts`

- [x] **Step 1: Add failing domain coverage**

Add lookup coverage for `https://www.samsungsvc.co.kr/solution/28524?utm_source=user` expecting an executable hit at `/flow-maps/aircon-filter-cleaning`, then build a start package with `2026-07-06`. Add supply queue coverage proving a local candidate with the same canonical URL becomes `executable`, records a `hit` last lookup, and keeps the production Markdown oriented around the resolved hit.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\url-first-supply-queue.test.ts`

Expected: FAIL because the manually authored source-backed Flow exists but is not yet included in the URL lookup registry.

- [x] **Step 2: Register direct-route source-backed maps for URL lookup**

Add a source-backed helper that returns maps whose quality decision keeps `directRouteEnabled` and whose status is not `reject`. Use that helper in `url-first-lookup.ts` so manually registered source-backed seed/content can close the candidate loop without homepage promotion, AI generation, crawling, or automatic seed creation.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\url-first-supply-queue.test.ts`

Expected: PASS.

### Task 15: Verify `/flows` Candidate Resolved-hit Start Path

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`

- [x] **Step 1: Add failing E2E coverage**

Seed localStorage with a production candidate for the Samsung service aircon filter cleaning URL. Verify the card changes to `이제 실행 가능`, `Flow 결과로 이동` opens the normal hit panel, and starting with `2026-07-06` saves `source-backed-aircon-filter-cleaning` into My Flow.

Run: `npx playwright test -g "manual registered production candidate" tests/e2e/flow-mvp.spec.ts`

Expected: FAIL before the registry change because the candidate remains in `제작 대기`.

- [x] **Step 2: Run E2E to verify GREEN after rebuild**

Run `npm.cmd run build`, then run the targeted Playwright test.

Expected: PASS.

- [x] **Step 3: Record QA and complete verification**

Run the targeted unit checks, targeted E2E, docs check, full unit test suite, production build, and a mobile browser QA pass for the resolved manual-registration candidate.

## Manual Registration Checklist Follow-up

### Task 16: Make Source-backed Flow Registration Repeatable

**Files:**
- Modify: `lib/flow/source-backed-my-flow.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing domain coverage**

Add tests for the manual source-backed registration checklist, URL lookup inclusion rules, and common authoring mistakes. The checklist must name canonical URL, original/source URL, sourceTrace, Step split, date/relative/repeat handling, risk/execution blockers, and the `directRouteEnabled`/`reject` quality decision. Lookupable source-backed maps must require source URL + `directRouteEnabled` + non-`reject`.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts`

Expected: FAIL because the checklist/readiness helper is missing and the URL lookupable helper does not accept injected maps/decisions.

- [x] **Step 2: Add the registration QA helper**

Add a small domain helper that returns the operating checklist and a readiness report. It catches duplicate canonical source URLs, missing sourceTrace evidence, empty registered Step lists, and missing source URLs. Keep the helper local/data-only: no AI generation, crawling, server storage, admin approval, account behavior, or automatic seed creation.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts`

Expected: PASS.

- [x] **Step 3: Lock rejected source-backed URLs out of actual lookup**

Add URL lookup coverage proving a `reject` source-backed source URL remains a `miss` even though the source-backed seed/content exists.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\url-first-lookup.test.ts`

Expected: PASS.

- [x] **Step 4: Record documentation and full verification**

Update spec/tasks/QA with the manual registration checklist operating procedure, then run targeted tests, docs check, full unit tests, and build.

## Manual Registration QA Report Follow-up

### Task 17: Publish Operator-facing Registration QA Report

**Files:**
- Create: `lib/flow/source-backed-manual-registration-report.test.ts`
- Create: `lib/flow/source-backed-manual-registration-report.ts`
- Create: `scripts/content-audit/build-source-backed-manual-registration-qa-report.ts`
- Create: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `package.json`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing report coverage**

Add tests proving the report summarizes total source-backed maps, lookup-eligible maps, QA pass count, registration holds, lookup-blocked maps, issue counts for duplicate canonical URL/sourceTrace/empty Step/sourceUrl, and includes an operator runbook plus one real rehearsal sample.

Run: `npx tsx --test lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `source-backed-manual-registration-report.ts` does not exist yet.

- [x] **Step 2: Implement report model and HTML renderer**

Use `assessSourceBackedManualRegistrationReadiness`, current source-backed map data, quality decisions, and URL lookup to build one report model. Render it as a standalone Korean HTML page with summary metrics, runbook, Samsung aircon sample rehearsal, and Flow Map issue table. Do not add AI generation, crawling, admin workflow, server storage, account behavior, or automatic seed generation.

Run: `npx tsx --test lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS.

- [x] **Step 3: Generate the content-audit report**

Run: `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`

Expected: Creates `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html` and prints current counts for total maps, lookup eligible, QA pass, registration hold, and lookup blocked.

- [x] **Step 4: Record QA and complete verification**

Record the report path and verification evidence in `qa.md`, then run targeted tests, docs check, full unit tests, and production build.

## First Manual Registration QA Pass Follow-up

### Task 18: Repair One Source-backed Flow To QA Pass

**Files:**
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `lib/flow/source-backed-expansion-260625.ts`
- Modify: `lib/flow/source-backed-my-flow.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing aircon QA-pass coverage**

Add tests proving `aircon-filter-cleaning` is not in `assessSourceBackedManualRegistrationReadiness().blockedMapIds`, has no `missing_source_trace` issue, and carries `Samsung Service solution 28524` sourceTrace evidence into `buildSourceBackedFlowMapPublishPackage`.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because the aircon sample is still `registration_hold` and the public Step has no extracted sourceTrace.

- [x] **Step 2: Add sourceTrace and parse operator-friendly sourceTrace lines**

Add a concise sourceTrace line to the aircon Step detail and make the metadata extractor accept both `원문 근거:` and ASCII `sourceTrace:` lines. Do not add AI generation, crawling, admin behavior, server/account storage, bulk seed cleanup, or source-owner notification.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS.

- [x] **Step 3: Regenerate the operator report**

Run: `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`

Expected: Report summary changes from 0 QA-pass / 24 registration holds to 1 QA-pass / 23 registration holds while total maps, lookup-eligible maps, and lookup-blocked maps remain 26 / 24 / 2.

- [x] **Step 4: Record QA and complete verification**

Update `qa.md` with the first QA-pass sample, targeted RED/GREEN evidence, generated report counts, and remaining blocker profile. Then run targeted tests, docs check, full unit tests, and production build.

## Duplicate Canonical URL Operations Follow-up

### Task 19: Classify And Resolve One Duplicate Canonical URL Group

**Files:**
- Modify: `lib/flow/source-backed-manual-registration-report.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `lib/flow/curated-source-app-seed.ts`
- Modify: `lib/flow/source-backed-my-flow.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing duplicate-group report coverage**

Add tests proving the manual registration QA report builds canonical URL groups, labels likely causes, chooses a primary default-hit candidate, lists secondary maps, and shows an operator action. The test should also prove the first repaired group is no longer counted as lookupable duplicate work.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because duplicate groups are only counted as raw readiness issues and `funmom-study-routine-map` is still lookupable.

- [x] **Step 2: Classify duplicate canonical URL groups in the report**

Add duplicate-group metadata for actual duplicate maps, broad shared source URLs, normal multi-Flow source cases, and canonicalization problems. Render the groups in the generated HTML with the policy that one canonical URL gets one default URL lookup hit unless the group is narrowed, merged, or a secondary map is held out of lookup.

Run: `npx tsx --test lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS.

- [x] **Step 3: Resolve one representative broad-source duplicate**

Hold `funmom-study-routine-map` out of URL lookup by setting its quality decision to `directRouteEnabled=false`, while keeping its direct publish package available. Keep `curated-funmom-learning-park` as the stronger representative for the shared `funmom.tistory.com` canonical URL.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with duplicate canonical URL map count reduced from 18 to 16, duplicate groups reduced from 9 to 8, registration holds reduced by one, and lookup-blocked maps increased by one.

- [x] **Step 4: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`, then update spec/tasks/QA evidence and complete targeted tests, docs check, full unit tests, production build, and mobile HTML report QA.

### Task 20: Resolve One Actual Duplicate Canonical URL Group

**Files:**
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `lib/flow/curated-source-app-seed.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing representative-hit coverage**

Add URL lookup coverage for the Mansour OPIC source URL expecting `/flow-maps/curated-opic-mock-course`, source-backed coverage expecting `opic-plan-map` to remain publishable but leave URL lookup, and report coverage expecting the OPIC duplicate group to disappear.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `opic-plan-map` still has `directRouteEnabled=true`, URL lookup still resolves to `/flow-maps/opic-plan-map`, and duplicate canonical URL count remains 16 maps / 8 groups.

- [x] **Step 2: Hold the secondary OPIC map out of URL lookup**

Set `opic-plan-map` to `directRouteEnabled=false` through the curated source app seed quality decision, while preserving the direct publish package. Keep `curated-opic-mock-course` as the canonical URL default hit because it has the stronger product score and the same 2-week/1-month source execution shape.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 48/48 targeted tests.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 22 lookup-eligible, 1 QA-pass, 21 registration holds, 4 lookup-blocked maps, and duplicate canonical URL count becomes 14 maps / 7 groups.

### Task 21: Resolve One More Actual Duplicate Canonical URL Group

**Files:**
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `lib/flow/curated-source-app-seed.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing Getcha representative-hit coverage**

Add URL lookup coverage for the Getcha new-car purchase source URL expecting `/flow-maps/curated-new-car-purchase-guide`, source-backed coverage expecting `new-car-map` to remain publishable but leave URL lookup, and report coverage expecting the Getcha duplicate group to disappear.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `new-car-map` still has `directRouteEnabled=true`, URL lookup still resolves to `/flow-maps/new-car-map`, and duplicate canonical URL count remains 14 maps / 7 groups.

- [x] **Step 2: Hold the secondary new-car map out of URL lookup**

Set `new-car-map` to `directRouteEnabled=false` through the curated source app seed quality decision, while preserving the direct publish package. Keep `curated-new-car-purchase-guide` as the canonical URL default hit because it has the stronger product score and the same 7-step Getcha purchase flow shape.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 50/50 targeted tests.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 21 lookup-eligible, 1 QA-pass, 20 registration holds, 5 lookup-blocked maps, and duplicate canonical URL count becomes 12 maps / 6 groups.

### Task 22: Resolve The Allblanc Broad Channel Duplicate

**Files:**
- Modify: `lib/flow/curated-source-app-seed.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `lib/flow/url-first-lookup.ts`
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing Allblanc representative-hit coverage**

Add URL lookup coverage for the Allblanc channel source URL expecting `/flow-maps/curated-allblanc-workout-park`, source-backed coverage expecting `homefit-map` to remain publishable but leave URL lookup, and report coverage expecting the Allblanc duplicate group to disappear.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `homefit-map` still has `directRouteEnabled=true`, URL lookup still resolves to the broad channel duplicate or misses the `www.youtube.com` form, and duplicate canonical URL count remains 12 maps / 6 groups.

- [x] **Step 2: Hold the secondary Allblanc map out of URL lookup**

Set `homefit-map` to `directRouteEnabled=false` through the curated source app seed quality decision, while preserving the direct publish package. Keep `curated-allblanc-workout-park` as the canonical URL default hit because it has the stronger product score and exact-video routine structure.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 52/52 targeted tests.

- [x] **Step 3: Normalize YouTube channel host and regenerate report**

Canonicalize `www.youtube.com` to `youtube.com` for URL-first lookup, then run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 20 lookup-eligible, 1 QA-pass, 19 registration holds, 6 lookup-blocked maps, and duplicate canonical URL count becomes 10 maps / 5 groups.

### Task 23: Resolve The AJD Moving Actual Duplicate

**Files:**
- Modify: `lib/flow/curated-source-app-seed.ts`
- Modify: `lib/flow/url-first-lookup.ts`
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing AJD moving representative-hit coverage**

Add URL lookup coverage for the AJD moving source URL expecting `/flow-maps/curated-ajd-moving-d30`, source-backed coverage expecting `moving-map` to remain publishable but leave URL lookup, and report coverage expecting the AJD moving duplicate group to disappear.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `moving-map` still has `directRouteEnabled=true`, URL lookup still resolves to `/flow-maps/moving-d30`, and duplicate canonical URL count remains 10 maps / 5 groups.

- [x] **Step 2: Hold the secondary moving map out of URL lookup**

Set `moving-map` to `directRouteEnabled=false` through the curated source app seed quality decision, while preserving the direct publish package. Keep `curated-ajd-moving-d30` as the canonical URL default hit because it has the stronger product score and current curated source-backed Step structure.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 53/53 targeted tests.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 19 lookup-eligible, 1 QA-pass, 18 registration holds, 7 lookup-blocked maps, and duplicate canonical URL count becomes 8 maps / 4 groups.

### Task 24: Resolve The Official Child Vaccination Actual Duplicate

**Files:**
- Modify: `lib/flow/curated-source-app-seed.ts`
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing KHMS vaccination representative-hit coverage**

Add URL lookup coverage for the KHMS child vaccination source URL expecting `/flow-maps/curated-child-vaccination-schedule`, source-backed coverage expecting `vaccination-map` to remain publishable but leave URL lookup, and report coverage expecting the KHMS vaccination duplicate group to disappear.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `vaccination-map` still has `directRouteEnabled=true`, URL lookup still resolves to `/flow-maps/vaccination-map`, and duplicate canonical URL count remains 8 maps / 4 groups.

- [x] **Step 2: Hold the secondary vaccination map out of URL lookup**

Set `vaccination-map` to `directRouteEnabled=false` through the curated source app seed quality decision, while preserving the direct publish package. Keep `curated-child-vaccination-schedule` as the canonical URL default hit because it has the stronger product score, official source-backed Step structure, birth-date setup, and medical-sensitive review-before-apply handling.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 55/55 targeted tests.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 18 lookup-eligible, 1 QA-pass, 17 registration holds, 8 lookup-blocked maps, and duplicate canonical URL count becomes 6 maps / 3 groups.

### Task 25: Stabilize The Standard Production Build Gate

**Files:**
- Modify: `package.json`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Reproduce and classify the build failure**

Run `npm.cmd run build` after earlier failed build attempts and record the transient `.next` ENOENT signatures: missing `route.js.nft.json`, `.next/server/app`, `pages-manifest.json`, and `/_document`. Verify these errors happen after compile/typecheck and around Next export/trace artifact reads.

Expected: failure is classified as an incomplete local `.next` / build-process state, not as a TypeScript or application compile failure.

- [x] **Step 2: Compare the Windows command paths**

Run `cmd /c ".\node_modules\.bin\next.cmd build"` from a clean `.next` directory, then run `npm.cmd run build` from a clean `.next` directory.

Expected: both pass, proving the `next.cmd` shim can build as a diagnostic path and the npm lifecycle path can build correctly after cleanup.

- [x] **Step 3: Stabilize the standard gate script**

Run `npm.cmd run build` again while `.next` already exists.

Expected: keep the committed `package.json` build script on direct `next build` while `next.config.ts` points production build typechecking at `tsconfig.next.json` and leaves the default webpack build worker enabled. Treat cleanup/retry wrapper work as a separate build-stabilization candidate, not part of this committed URL-first slice.

- [x] **Step 4: Record the cleanup rule and verification evidence**

Update spec/tasks/QA with the build-gate decision and cleanup rule. The standard gate remains `npm.cmd run build`; the committed package script runs direct `next build`. If stale `.next` artifacts recur after interrupted local builds, stop stale build processes, remove only the repo-local `.next` directory, rerun the standard gate, and only reintroduce a wrapper with fresh evidence.

Expected: docs explain why the package script stays direct and keep `npm.cmd run build` as the standard production build gate.

### Task 26: Resolve The Baby Food Actual Duplicate With Source-Trace Priority

**Files:**
- Modify: `lib/flow/source-backed-curated-260630.ts`
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing baby-food duplicate coverage**

Add URL lookup coverage for the Naver baby-food source URL expecting `/flow-maps/baby-food-map`, source-backed coverage expecting `curated-baby-food-meal-log` to remain publishable but leave URL lookup, and report coverage expecting the Naver baby-food duplicate group to disappear.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `curated-baby-food-meal-log` still has `directRouteEnabled=true` and the duplicate canonical URL count remains 6 maps / 3 groups.

- [x] **Step 2: Hold the weaker baby-food meal-log map out of URL lookup**

Set `curated-baby-food-meal-log` to `directRouteEnabled=false` through the curated source-backed quality decision, while preserving its direct publish package. Keep `baby-food-map` as the canonical URL default hit because it has the stronger sourceTrace readiness, 5 child Flows, 21 medical-sensitive execution Steps, start-date setup, and zero missing sourceTrace Steps.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 57/57 targeted tests.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 17 lookup-eligible, 2 QA-pass, 15 registration holds, 9 lookup-blocked maps, and duplicate canonical URL count becomes 4 maps / 2 groups.

### Task 27: Resolve The Reading Actual Duplicate With Monthly-Routine Priority

**Files:**
- Modify: `lib/flow/curated-source-app-seed.ts`
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing reading duplicate coverage**

Add URL lookup coverage for the Naver reading source URL expecting `/flow-maps/curated-reading-routine-log`, source-backed coverage expecting `reading-routine-map` to remain publishable but leave URL lookup, and report coverage expecting the Naver reading duplicate group to disappear.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `reading-routine-map` still has `directRouteEnabled=true`, URL lookup still resolves to `/flow-maps/reading-routine-map`, and duplicate canonical URL count remains 4 maps / 2 groups.

- [x] **Step 2: Hold the weaker reading routine app seed out of URL lookup**

Set `reading-routine-map` to `directRouteEnabled=false` through the curated source app seed quality decision, while preserving the direct publish package. Keep `curated-reading-routine-log` as the canonical URL default hit because it has `real` source status, stronger product score, 8-Step monthly execution structure, and save/export eligibility. Keep the missing sourceTrace work as a separate registration-readiness blocker.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 59/59 targeted tests.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 16 lookup-eligible, 2 QA-pass, 14 registration holds, 10 lookup-blocked maps, and duplicate canonical URL count becomes 2 maps / 1 group.

### Task 28: Resolve The Wedding Actual Duplicate With Checklist-Family Priority

**Files:**
- Modify: `lib/flow/curated-source-app-seed.ts`
- Modify: `lib/flow/url-first-lookup.test.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing wedding duplicate coverage**

Add URL lookup coverage for the Naver wedding source URL expecting `/flow-maps/curated-wedding-checklist-family`, source-backed coverage expecting `wedding-map` to remain publishable but leave URL lookup, and report coverage expecting duplicate canonical URL groups to reach 0.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `wedding-map` still has `directRouteEnabled=true`, URL lookup still resolves to `/flow-maps/wedding-map`, and duplicate canonical URL count remains 2 maps / 1 group.

- [x] **Step 2: Hold the weaker wedding app seed out of URL lookup**

Set `wedding-map` to `directRouteEnabled=false` through the curated source app seed quality decision, while preserving the direct publish package. Keep `curated-wedding-checklist-family` as the canonical URL default hit because it has a stronger product score, 2-child timeline/checklist structure, 10 executable Steps, and a wedding-date setup path. Keep the missing sourceTrace work as a separate registration-readiness blocker.

Run: `npx tsx --test lib\flow\url-first-lookup.test.ts lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 61/61 targeted tests.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 2 QA-pass, 13 registration holds, 11 lookup-blocked maps, and duplicate canonical URL count becomes 0 maps / 0 groups.

### Task 29: Build The SourceTrace Remediation Queue And Promote Reading To QA-pass

**Files:**
- Modify: `lib/flow/source-backed-curated-260630.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing sourceTrace queue and reading QA-pass coverage**

Add report coverage expecting a `sourceTraceQueue` sorted by lookup representative status, productScore, Step count, risk, and remediation effort. Add source-backed coverage expecting `curated-reading-routine-log` to leave `missing_source_trace` and expose sourceTrace on all 8 public Steps.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because the report has no sourceTrace queue yet and `curated-reading-routine-log` is still blocked by 8 missing sourceTrace Steps.

- [x] **Step 2: Add the queue and repair the reading sourceTrace rows**

Add `sourceTraceQueue` to the manual registration QA report. Add sourceTrace lines to the 8 `curated-reading-monthly-log` Steps using the existing Naver reading source URL and each Step title. Do not crawl, AI-generate, or add unrelated content.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 44/44 targeted source/report tests. `curated-reading-routine-log` becomes QA-pass, the queue excludes it, and the first remaining queue item is `moving-d30`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 3 QA-pass, 12 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 12 maps / 97 Steps.

### Task 30: Promote Moving D-30 Through The SourceTrace Queue

**Files:**
- Modify: `lib/flow/source-backed-my-flow.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing moving QA-pass coverage**

Add report coverage expecting `moving-d30` to leave `missing_source_trace`, become `qa_pass`, and disappear from the sourceTrace queue. Add source-backed coverage expecting all 5 `source-backed-moving-d30` public Steps to expose sourceTrace while `moving-map` remains out of URL lookup.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `moving-d30` is still blocked by 5 missing sourceTrace Steps and the report still shows 3 QA-pass / 12 registration holds / 12 sourceTrace issue maps.

- [x] **Step 2: Add the moving sourceTrace rows**

Add sourceTrace lines to the 5 `source-backed-moving-d30` Step details using the existing AJD moving checklist source URL and Step id context. Do not crawl, AI-generate, merge moving Flow Maps, delete routes, or change the earlier `curated-ajd-moving-d30` / `moving-map` duplicate policy.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 45/45 targeted source/report tests. `moving-d30` becomes QA-pass, `moving-map` remains `directRouteEnabled=false`, duplicate canonical URL groups stay at 0, and the first remaining queue item is `curated-ajd-moving-d30`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 4 QA-pass, 11 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 11 maps / 92 Steps.

### Task 31: Promote Curated AJD Moving Through The SourceTrace Queue

**Files:**
- Modify: `lib/flow/source-backed-curated-260630.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing curated AJD moving QA-pass coverage**

Add report coverage expecting `curated-ajd-moving-d30` to leave `missing_source_trace`, become `qa_pass`, and disappear from the sourceTrace queue. Add source-backed coverage expecting all 5 curated AJD moving public Steps to expose sourceTrace while `moving-map` remains out of URL lookup and `moving-d30` remains QA-pass.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `curated-ajd-moving-d30` is still blocked by 5 missing sourceTrace Steps and the report still shows 4 QA-pass / 11 registration holds / 11 sourceTrace issue maps.

- [x] **Step 2: Add the curated AJD moving sourceTrace rows**

Add sourceTrace lines to the 5 `curated-ajd-moving-d30` Step details using the existing encoded AJD moving checklist source URL and Step id context. Do not crawl, AI-generate, merge moving Flow Maps, delete routes, or change the earlier AJD moving URL representative policy.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 46/46 targeted source/report tests. `curated-ajd-moving-d30` becomes QA-pass, `moving-d30` remains QA-pass, `moving-map` remains `directRouteEnabled=false`, duplicate canonical URL groups stay at 0, and the first remaining queue item is `curated-new-car-purchase-guide`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 5 QA-pass, 10 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 10 maps / 87 Steps.

### Task 32: Promote Curated New Car Through The SourceTrace Queue

**Files:**
- Modify: `lib/flow/source-backed-curated-260630.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing curated new-car QA-pass coverage**

Add report coverage expecting `curated-new-car-purchase-guide` to leave `missing_source_trace`, become `qa_pass`, and disappear from the sourceTrace queue. Add source-backed coverage expecting all 7 curated Getcha new-car public Steps to expose sourceTrace while `new-car-map` remains out of URL lookup.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `curated-new-car-purchase-guide` is still blocked by 7 missing sourceTrace Steps and the report still shows 5 QA-pass / 10 registration holds / 10 sourceTrace issue maps.

- [x] **Step 2: Add the curated new-car sourceTrace rows**

Add sourceTrace lines to the 7 `curated-new-car-basic` Step details using the existing Getcha new-car source URL and Step id context. Do not crawl, AI-generate, merge new-car Flow Maps, delete routes, add financial advice, or change the earlier Getcha URL representative policy.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 47/47 targeted source/report tests. `curated-new-car-purchase-guide` becomes QA-pass, `new-car-map` remains `directRouteEnabled=false`, duplicate canonical URL groups stay at 0, and the first remaining queue item is `middle-school-math-1`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 6 QA-pass, 9 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 9 maps / 80 Steps.

### Task 33: Promote Middle-school Math Through The SourceTrace Queue

**Files:**
- Modify: `lib/flow/source-backed-my-flow.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing middle-school math QA-pass coverage**

Add report coverage expecting `middle-school-math-1` to leave `missing_source_trace`, become `qa_pass`, and disappear from the sourceTrace queue. Add source-backed coverage expecting all 8 `source-backed-middle-school-math-1` public Steps to expose sourceTrace while the Mathbang URL representative remains lookupable.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `middle-school-math-1` is still blocked by 8 missing sourceTrace Steps and the report still shows 6 QA-pass / 9 registration holds / 9 sourceTrace issue maps.

- [x] **Step 2: Add the Mathbang sourceTrace rows**

Add sourceTrace lines to the 8 `source-backed-middle-school-math-1` Step details using the existing Mathbang source URL and Step order/id context. Do not crawl, AI-generate, rewrite math Step content, add study advice, or change the Mathbang URL representative policy.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 48/48 targeted source/report tests. `middle-school-math-1` becomes QA-pass, duplicate canonical URL groups stay at 0, and the first remaining queue item is `curated-opic-mock-course`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 7 QA-pass, 8 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 8 maps / 72 Steps.

### Task 34: Promote Curated OPIC Through The SourceTrace Queue

**Files:**
- Modify: `lib/flow/source-backed-curated-260630.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing curated OPIC QA-pass coverage**

Add report coverage expecting `curated-opic-mock-course` to leave `missing_source_trace`, become `qa_pass`, and disappear from the sourceTrace queue. Add source-backed coverage expecting all 19 OPIC public Steps to expose sourceTrace while `curated-opic-mock-course` remains lookupable and `opic-plan-map` remains out of URL lookup.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `curated-opic-mock-course` is still blocked by 19 missing sourceTrace Steps and the report still shows 7 QA-pass / 8 registration holds / 8 sourceTrace issue maps.

- [x] **Step 2: Add the Mansour OPIC sourceTrace rows**

Add sourceTrace lines to the 14 `curated-opic-single-mock-review` Steps and 5 `curated-opic-course-row-import` Steps using the existing Mansour source URL and workbook row group/id context. Do not crawl, AI-generate, rewrite OPIC Step content, add OPIC study advice, merge/delete OPIC Flow Maps, or change the Mansour URL representative policy.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 49/49 targeted source/report tests. `curated-opic-mock-course` becomes QA-pass, `opic-plan-map` remains `directRouteEnabled=false`, duplicate canonical URL groups stay at 0, and the first remaining queue item is `curated-wedding-checklist-family`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 8 QA-pass, 7 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 7 maps / 53 Steps.

### Task 35: Promote Curated Wedding Through The SourceTrace Queue

**Files:**
- Modify: `lib/flow/source-backed-curated-260630.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing curated wedding QA-pass coverage**

Add report coverage expecting `curated-wedding-checklist-family` to leave `missing_source_trace`, become `qa_pass`, and disappear from the sourceTrace queue. Add source-backed coverage expecting all 10 wedding public Steps to expose sourceTrace while `curated-wedding-checklist-family` remains lookupable and `wedding-map` remains out of URL lookup.

Run: `npx tsx --test lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `curated-wedding-checklist-family` is still blocked by 10 missing sourceTrace Steps and the report still shows 8 QA-pass / 7 registration holds / 7 sourceTrace issue maps.

- [x] **Step 2: Add separated Naver and Gongysd sourceTrace rows**

Add sourceTrace lines to the 6 `curated-wedding-naver-timeline` Steps and 4 `curated-wedding-gongysd-atoz` Steps using the existing child Flow source URLs and row ids. Do not crawl, AI-generate, rewrite wedding Step content, add wedding planning advice, merge/delete wedding Flow Maps, or change the Naver wedding URL representative policy.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 50/50 targeted source/report tests. `curated-wedding-checklist-family` becomes QA-pass, `wedding-map` remains `directRouteEnabled=false`, duplicate canonical URL groups stay at 0, and the first remaining queue item is `curated-allblanc-workout-park`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 9 QA-pass, 6 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 6 maps / 43 Steps.

### Task 36: Promote Curated Allblanc Through The SourceTrace Queue

**Files:**
- Modify: `lib/flow/source-backed-curated-260630.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing curated Allblanc QA-pass coverage**

Add report coverage expecting `curated-allblanc-workout-park` to leave `missing_source_trace`, become `qa_pass`, and disappear from the sourceTrace queue. Add source-backed coverage expecting all 3 Allblanc public exact-video Steps to expose sourceTrace while `curated-allblanc-workout-park` remains lookupable and `homefit-map` remains out of URL lookup.

Run: `npx tsx --test lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `curated-allblanc-workout-park` is still blocked by 3 missing sourceTrace Steps and the report still shows 9 QA-pass / 6 registration holds / 6 sourceTrace issue maps.

- [x] **Step 2: Add exact-video sourceTrace rows**

Add sourceTrace lines to the 1 `curated-allblanc-morning-workout` Step, 1 `curated-allblanc-no-jump-cardio` Step, and 1 `curated-allblanc-lower-body` Step using the existing exact video URLs and Step row ids. Do not crawl, AI-generate, rewrite workout Step content, add posture or health advice, add movement sequences, merge/delete Allblanc Flow Maps, or change the Allblanc URL representative policy.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 51/51 targeted source/report tests. `curated-allblanc-workout-park` becomes QA-pass, `homefit-map` remains `directRouteEnabled=false`, duplicate canonical URL groups stay at 0, and the first remaining queue item is `curated-child-vaccination-schedule`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 10 QA-pass, 5 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 5 maps / 40 Steps.

### Task 37: Promote Curated Child Vaccination Through The SourceTrace Queue

**Files:**
- Modify: `lib/flow/source-backed-curated-260630.ts`
- Modify: `lib/flow/source-backed-my-flow.test.ts`
- Modify: `lib/flow/source-backed-manual-registration-report.test.ts`
- Modify: `docs/content-audit/2026-07-06-source-backed-manual-registration-qa-ko.html`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/tasks.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/plan.md`
- Modify: `docs/specs/2026-07-05-url-lookup-production-slice/qa.md`

- [x] **Step 1: Add failing curated child vaccination QA-pass coverage**

Add report coverage expecting `curated-child-vaccination-schedule` to leave `missing_source_trace`, become `qa_pass`, and disappear from the sourceTrace queue. Add source-backed coverage expecting all 10 official KHMS child vaccination public Steps to expose sourceTrace while `curated-child-vaccination-schedule` remains lookupable, keeps `review_before_apply`, and `vaccination-map` remains out of URL lookup.

Run: `npx tsx --test lib\flow\source-backed-manual-registration-report.test.ts`

Expected: FAIL because `curated-child-vaccination-schedule` is still blocked by 10 missing sourceTrace Steps and the report still shows 10 QA-pass / 5 registration holds / 5 sourceTrace issue maps covering 40 Steps.

- [x] **Step 2: Add official KHMS sourceTrace rows**

Add sourceTrace lines to the 6 `curated-child-vaccination-first-year` Steps and 4 `curated-child-vaccination-booster-school-age` Steps using the existing KHMS official source URL and Step row ids. Do not crawl, AI-generate, rewrite vaccination Step content, add vaccination or medical advice, reinterpret official schedule content, merge/delete vaccination Flow Maps, or change the KHMS URL representative policy.

Run: `npx tsx --test lib\flow\source-backed-my-flow.test.ts lib\flow\source-backed-manual-registration-report.test.ts`

Expected: PASS with 52/52 targeted source/report tests. `curated-child-vaccination-schedule` becomes QA-pass, `vaccination-map` remains `directRouteEnabled=false`, duplicate canonical URL groups stay at 0, `review_before_apply` remains on the representative, and the first remaining queue item is `baby-health-schedule`.

- [x] **Step 3: Regenerate report and record QA**

Run `npx tsx scripts\content-audit\build-source-backed-manual-registration-qa-report.ts`.

Expected: report summary changes to 26 total maps, 15 lookup-eligible, 11 QA-pass, 4 registration holds, 11 lookup-blocked maps, duplicate canonical URL count stays 0 maps / 0 groups, and missing sourceTrace becomes 4 maps / 30 Steps.
