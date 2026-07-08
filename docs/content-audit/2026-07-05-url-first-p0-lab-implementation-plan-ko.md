# URL-first P0 Lab Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hidden internal PoC route at `/flow-lab/url-first-p0` that tests the URL-first lookup/reuse/export journey with real FlowMe content before changing Home or Flow finding.

**Architecture:** Keep the production 4-tab app unchanged. Add one internal lab route, one focused URL lookup utility, and focused tests. The lab route reads a small canonical URL index, renders hit / needs-review / miss / memo-draft states, and previews export/My Flow outcomes without introducing AI generation, OAuth integrations, or public navigation.

**Tech Stack:** Next.js App Router, React client component, existing `lib/flow` seed/source-backed data, Node `tsx --test`, Playwright E2E, existing `npm.cmd run docs:check`.

---

## 왜 바로 앱에 적용하지 않는가

03.zip 방향은 좋지만 구현 전 보정이 필요하다.

- `추천 124명 저장` 같은 fake usage 신호를 제거해야 한다.
- 모든 GitHub/repo 경로는 `flow-mvp/` 기준으로 맞춰야 한다.
- `needs_review` 컨텐츠는 export/save gate가 필요하다.
- URL-first UX에서는 display URL과 canonical URL을 분리해야 한다.
- AI generation은 P0 core가 아니라 P1 fallback 또는 disabled/stub이어야 한다.

따라서 다음 단계는 production Home이나 `/flows` 수정이 아니라, 내부 실험 route에서 실제 seed 컨텐츠와 export preview가 말이 되는지 확인하는 것이다.

## 대상 route

```text
/flow-lab/url-first-p0
```

이 route는 다음 조건을 지킨다.

- 일반 사용자 nav에 노출하지 않는다.
- `/flow-lab` 계열 내부 검토 표면으로 둔다.
- production Home, `/flows`, `/my`, `/calendar` 동작을 바꾸지 않는다.
- 실제 저장 mutation은 하지 않는다. 저장 후 경로 preview와 기존 route link만 보여준다.
- AI 생성은 실행하지 않는다. miss 상태에서는 `원문 확인 후 초안 만들기`, `보류하기` 같은 disabled/stub 상태만 보여준다.

## P0 사용자 여정

```text
URL 또는 메모 입력
-> canonical URL 정규화
-> 작은 local lookup index 확인
-> hit / needs_review / miss / memo_draft 표시
-> hit이면 기존 Flow 재사용 옵션과 export preview
-> needs_review이면 preview만, export/save gate
-> miss이면 AI 없이 보류/검토 요청 상태
-> My Flow / Calendar는 실제 저장 대신 예상 결과와 기존 route link로 확인
```

## 대표 시나리오

| 상태 | 입력 예 | 결과 | 허용 행동 |
| --- | --- | --- | --- |
| `hit` | 실제 AJD 이사 체크리스트 URL | `/flow-maps/moving-d30`에 매핑 | 이 Flow 쓰기, 시작일 변경, `.ics`/Markdown/checklist preview |
| `needs_review` | 자동차검사 D-14 관련 URL 또는 `/f/vehicle-inspection-prep` | `vehicle-inspection-prep` preview | 원문 확인 전 안내, export/save gate, direct route 보기 |
| `miss` | `https://example.com/blog/moving-tips` | 아직 변환 없음 | 보류, 원문 확인 요청, AI disabled/stub |
| `memo_draft` | "8월 말 이사 예정..." | private draft preview | Markdown/checklist preview, 관련 이사 Flow 추천 |

## 파일 구조

### 새로 만들 파일

- `app/flow-lab/url-first-p0/page.tsx`
  - 내부 lab route entry.
  - `UrlFirstP0Lab`을 렌더링한다.

- `components/flow/UrlFirstP0Lab.tsx`
  - route 전용 client component.
  - 입력, lookup 상태, result card, export preview, memo draft preview를 한 파일 안의 작은 하위 컴포넌트로 둔다.
  - production `HomeLanding`, `FlowList`, `MyFlows`는 건드리지 않는다.

- `lib/flow/url-first-lookup.ts`
  - canonical URL 정규화 함수.
  - 작은 static lookup index.
  - `hit / needs_review / miss / memo_draft` 상태 판정.
  - UI 문자열이 아니라 구조화 데이터만 반환한다.

- `lib/flow/url-first-lookup.test.ts`
  - canonical normalization과 lookup state를 검증한다.

### 수정할 파일

- `docs/SERVICE_STRUCTURE.md`
  - `/flow-lab/url-first-p0`를 internal review/lab route로 기록한다.
  - public service surface가 아님을 명시한다.

- `tests/e2e/flow-mvp.spec.ts`
  - hidden route가 production nav에 노출되지 않으면서 직접 접근 시 렌더되는지 targeted assertion을 추가한다.
  - 기존 사용자 route guardrails와 충돌하지 않게 test name을 명확히 분리한다.

- `package.json`
  - 필요하면 `npm test` 대상에 `lib/flow/url-first-lookup.test.ts`를 추가한다.
  - 이미 포괄 test runner가 파일 목록을 명시하므로 누락되면 반드시 추가한다.

## 데이터 모델 초안

```ts
export type UrlFirstLookupStatus = 'hit' | 'needs_review' | 'miss' | 'memo_draft';

export type UrlFirstLookupResult = {
  status: UrlFirstLookupStatus;
  input: string;
  canonicalUrl?: string;
  displayUrl?: string;
  title: string;
  summary: string;
  sourceTitle?: string;
  sourceCheckedAt?: string;
  routeHref?: string;
  sourceStatus?: 'real' | 'needs_review' | 'missing';
  exportModes: Array<'calendar' | 'markdown' | 'checklist' | 'sheet'>;
  gatedReason?: string;
};
```

P0에서는 이 구조만 쓴다. AI request payload, user account, persistent canonical table, creator claim, source owner adoption state는 포함하지 않는다.

## Task 1: URL lookup utility

**Files:**
- Create: `lib/flow/url-first-lookup.ts`
- Create: `lib/flow/url-first-lookup.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for canonicalization**

Test cases:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalizeFlowSourceUrl } from './url-first-lookup';

test('canonicalizeFlowSourceUrl trims tracking params and normalizes host', () => {
  assert.equal(
    canonicalizeFlowSourceUrl(' https://m.ajd.co.kr/contents/basic-tip/detail/foo?utm_source=x&utm_medium=y#reply '),
    'https://www.ajd.co.kr/contents/basic-tip/detail/foo',
  );
});

test('canonicalizeFlowSourceUrl keeps meaningful query params', () => {
  assert.equal(
    canonicalizeFlowSourceUrl('https://example.com/watch?v=abc&utm_campaign=test'),
    'https://example.com/watch?v=abc',
  );
});
```

- [ ] **Step 2: Run the test and confirm failure**

Run:

```powershell
npm.cmd test -- lib/flow/url-first-lookup.test.ts
```

Expected: fail because the file/function does not exist yet. If the project test script does not support `--`, run the full `npm.cmd test` after adding the file to `package.json`.

- [ ] **Step 3: Implement minimal canonicalization**

Create `lib/flow/url-first-lookup.ts` with:

- trim input.
- parse via `new URL`.
- normalize `m.ajd.co.kr` to `www.ajd.co.kr`.
- remove `utm_*`, `fbclid`, `gclid`, and hash.
- keep meaningful params like `v`.
- return normalized string.

- [ ] **Step 4: Add lookup state tests**

Add tests:

```ts
import { lookupUrlFirstP0Input } from './url-first-lookup';

test('lookupUrlFirstP0Input returns hit for AJD moving canonical URL', () => {
  const result = lookupUrlFirstP0Input('https://www.ajd.co.kr/contents/basic-tip/detail/이사_준비_체크리스트_완벽정리!_엑셀_Xls_PDF_노션_notion_첨부-23363');
  assert.equal(result.status, 'hit');
  assert.equal(result.routeHref, '/flow-maps/moving-d30');
  assert.ok(result.exportModes.includes('calendar'));
});

test('lookupUrlFirstP0Input gates needs_review content', () => {
  const result = lookupUrlFirstP0Input('https://flowme.local/f/vehicle-inspection-prep');
  assert.equal(result.status, 'needs_review');
  assert.equal(result.routeHref, '/f/vehicle-inspection-prep');
  assert.match(result.gatedReason ?? '', /원문 확인/);
});

test('lookupUrlFirstP0Input returns miss for unknown URL', () => {
  const result = lookupUrlFirstP0Input('https://example.com/blog/moving-tips');
  assert.equal(result.status, 'miss');
  assert.equal(result.exportModes.length, 0);
});
```

- [ ] **Step 5: Implement static lookup index**

Keep the index small:

- AJD moving canonical URL -> hit -> `/flow-maps/moving-d30`.
- `https://flowme.local/f/vehicle-inspection-prep` -> needs_review -> `/f/vehicle-inspection-prep`.
- Unknown valid URL -> miss.
- Non-URL memo text should not go through canonical URL parsing. It is handled in Task 2 as memo draft.

- [ ] **Step 6: Add the new test file to `package.json`**

Modify `package.json` test script to include:

```text
lib/flow/url-first-lookup.test.ts
```

- [ ] **Step 7: Run tests**

Run:

```powershell
npm.cmd test
```

Expected: all current unit tests pass, including `url-first-lookup.test.ts`.

## Task 2: Internal route and lab UI

**Files:**
- Create: `app/flow-lab/url-first-p0/page.tsx`
- Create: `components/flow/UrlFirstP0Lab.tsx`

- [ ] **Step 1: Create route entry**

Create `app/flow-lab/url-first-p0/page.tsx`:

```tsx
import { UrlFirstP0Lab } from '@/components/flow/UrlFirstP0Lab';

export default function UrlFirstP0LabPage() {
  return <UrlFirstP0Lab />;
}
```

- [ ] **Step 2: Create first lab component skeleton**

Create `components/flow/UrlFirstP0Lab.tsx` as a client component.

Required first screen:

- heading: `URL-first P0 실험`
- short internal label: `내부 검토 화면`
- textarea/input tabs: `URL 붙여넣기`, `메모로 시작`
- sample buttons:
  - `AJD 이사 URL`
  - `자동차검사 needs_review`
  - `알 수 없는 URL`
  - `이사 메모`
- result area.

- [ ] **Step 3: Wire URL lookup result**

When the URL tab is active:

- call `lookupUrlFirstP0Input(input)`.
- render one of:
  - hit card.
  - needs_review gated card.
  - miss card.

Do not call any AI API. Do not write to local storage.

- [ ] **Step 4: Wire memo draft state**

When memo tab is active:

- if the input is non-empty, render a `memo_draft` preview.
- show:
  - `원문 URL 없음`
  - `비공개 초안`
  - related Flow recommendation: `/flow-maps/moving-d30`
  - Markdown/checklist preview.

Do not persist the draft.

- [ ] **Step 5: Render export preview**

For hit state:

- show destination buttons:
  - `캘린더 파일 받기`
  - `Markdown 복사`
  - `체크리스트 복사`
- In P0 lab, buttons may show preview text instead of downloading files.
- The labels must match existing outcome-first export language.

For needs_review:

- show disabled export buttons.
- show gated reason: `원문 확인 전에는 캘린더 파일을 만들지 않습니다.`

For miss:

- show no export buttons.
- show `원문 확인 요청` and `보류하기`.
- AI action is present only as disabled/stub: `AI 초안 만들기 - P1에서 검토`.

- [ ] **Step 6: Render My Flow / Calendar preview**

For hit state:

- show next action preview:
  - `이사 방식과 견적 후보 정하기`
  - `D-30`
  - route link: `/flow-maps/moving-d30`
- show expected post-save surfaces:
  - `내 Flow: 오늘 할 일로 이어짐`
  - `캘린더: 가장 가까운 일정 agenda로 이어짐`

Do not create a new save mutation in this lab route.

## Task 3: Documentation updates

**Files:**
- Modify: `docs/SERVICE_STRUCTURE.md`
- Modify: `docs/content-audit/2026-07-05-url-first-p0-lab-implementation-plan-ko.md`

- [ ] **Step 1: Update `SERVICE_STRUCTURE.md`**

Add a row under internal/review routes:

```md
| `/flow-lab/url-first-p0` | Internal URL-first P0 lab. Tests canonical lookup, hit/miss/needs-review states, export preview, and My Flow/Calendar expected outcomes without changing public Home or Flow finding. | `UrlFirstP0Lab` | `url-first-lookup`, `seed-flows`, `source-backed-my-flow`, `export` |
```

- [ ] **Step 2: Add a verification note to this plan after implementation**

At the bottom of this file, add:

```md
## Implementation verification

- `npm.cmd test`: ...
- `npm.cmd run docs:check`: ...
- `npm.cmd run build`: ...
- Targeted Playwright: ...
```

Do not fill it before running the commands.

## Task 4: E2E guardrail

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Add targeted route smoke test**

Add a test that:

- navigates directly to `/flow-lab/url-first-p0`.
- expects `URL-first P0 실험`.
- clicks `AJD 이사 URL`.
- expects `이미 변환된 Flow가 있어요` or equivalent non-fake hit copy.
- expects no `추천 124명 저장`.
- clicks `자동차검사 needs_review`.
- expects `원문 확인 전에는 캘린더 파일을 만들지 않습니다`.

- [ ] **Step 2: Add production nav non-exposure check**

In an existing nav guard test or a new targeted test:

- visit `/`.
- assert the visible primary nav does not include `/flow-lab/url-first-p0`.
- visit `/flows`.
- assert the catalog does not show the internal lab route as a card.

- [ ] **Step 3: Run targeted Playwright**

Run:

```powershell
npm.cmd run test:e2e -- --grep "url-first p0 lab"
```

Expected: targeted tests pass.

## Task 5: Full verification

**Files:**
- No new files unless verification finds an issue.

- [ ] **Step 1: Unit tests**

Run:

```powershell
npm.cmd test
```

Expected: all tests pass.

- [ ] **Step 2: Docs check**

Run:

```powershell
npm.cmd run docs:check
```

Expected: docs check passes with no broken local links.

- [ ] **Step 3: Build**

Run:

```powershell
npm.cmd run build
```

Expected: Next.js build succeeds.

- [ ] **Step 4: Targeted browser check**

Run the dev server or production server and inspect:

```text
/flow-lab/url-first-p0
```

Check at 390px mobile width:

- no horizontal overflow.
- hit / needs_review / miss / memo states are reachable.
- export labels fit.
- disabled AI fallback is visibly not primary.

## P0 acceptance criteria

- `/flow-lab/url-first-p0` exists and is directly reachable.
- The route is not linked from public Home, `/flows`, primary nav, or bottom tabs.
- AJD source URL returns a hit for `/flow-maps/moving-d30`.
- Unknown URL returns miss without calling AI.
- `vehicle-inspection-prep` is gated as needs_review.
- No fake usage count appears.
- Export preview includes calendar and Markdown/checklist for hit only.
- My Flow/Calendar preview is shown without writing new saved state.
- `npm.cmd test`, `npm.cmd run docs:check`, `npm.cmd run build`, and targeted Playwright pass.

## Explicitly out of scope

- Production Home URL input.
- Production `/flows` URL input.
- Real AI generation.
- Persistent canonical URL database.
- Account login or auth.
- Direct Google/Todoist/Notion OAuth.
- Creator/source-owner claim flow.
- Public social proof.
- Heavy editor or version graph.
- Full memo-to-Flow productization.

## Recommended execution order

1. Task 1: utility and unit tests.
2. Task 2: internal lab route.
3. Task 4: targeted E2E.
4. Task 3: service structure doc.
5. Task 5: full verification.

This order keeps the first implementation narrow: URL hit/miss state and export preview first, UI polish second, production integration later.

## Implementation status - 2026-07-05

- Added `lib/flow/url-first-lookup.ts` and `lib/flow/url-first-lookup.test.ts`.
- Added hidden route `app/flow-lab/url-first-p0/page.tsx`.
- Added route component `components/flow/UrlFirstP0Lab.tsx`.
- Added targeted Playwright coverage in `tests/e2e/flow-mvp.spec.ts`.
- Updated `docs/SERVICE_STRUCTURE.md` so the hidden route and URL-first intake contract are part of the service architecture map.
- Confirmed the route stays direct-access only; public Home, `/flows`, `/my`, and `/calendar` are not linked to `/flow-lab/url-first-p0`.

Verification completed:

- `npm.cmd test` passed 291 tests.
- `npm.cmd run docs:check` passed: 14 required files, 1463 local links.
- `npm.cmd run build` passed and listed `/flow-lab/url-first-p0`.
- `npm.cmd run test:e2e -- --grep "url-first p0 lab"` passed 1 targeted Playwright test.

Local preview during implementation:

```text
http://127.0.0.1:3108/flow-lab/url-first-p0
```
