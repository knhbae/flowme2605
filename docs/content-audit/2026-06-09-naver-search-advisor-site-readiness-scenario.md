# 2026-06-09 Naver Search Advisor Site Readiness Scenario

Purpose: select the Korean-first scenario required before `site-search-console-setup-precheck` can move from a generic docs-only idea toward a `/content-flows` review candidate.

Status: scenario selection and implementation gate. This is not user-behavior validation, not a public route approval, and not SEO advice.

HTML view: [Naver Search Advisor Site Readiness Scenario Korean HTML](./2026-06-09-naver-search-advisor-site-readiness-scenario-ko.html)

## Decision

Select `naver-search-advisor-site-readiness` as the next search-console scenario to evaluate.

Decision: `A-` `/content-flows` review candidate.

Why this scenario:

- Naver Search Advisor is the strongest Korean-first source for this axis.
- The user moment is specific enough: a small site, blog-with-custom-domain, creator page, or small business site owner wants Naver to discover the site after launch or a major content update.
- The artifact is still small: access/method selection, crawl-readiness checks, sitemap/RSS or request status, and a revisit memo.
- The biggest risk is clear: FlowMe must not store verification values, DNS records, HTML meta tag contents, OAuth grants, API keys, credentials, generated sitemap files, or ranking/traffic goals.

## Scenario

As a Korean site operator with a custom-domain site or host-managed page,
I need to check whether I can complete Naver Search Advisor ownership and crawl-readiness setup,
so that I know what to do myself, what to ask a developer or hosting provider, and when to revisit status without storing verification secrets in FlowMe.

## Source Freshness

Checked on 2026-06-09.

| Source | FlowMe reading |
|---|---|
| [Naver Search Advisor - diagnosis page](https://searchadvisor.naver.com/diagnose) | Site check looks at title, description, robot blocking, and search-friendly basics. FlowMe can turn this into precheck rows, not a score. |
| [Naver Search Advisor - SEO purpose guide](https://searchadvisor.naver.com/guide/seo-basic-intro) | The guide separates robot access, sitemap/RSS submission, site result checks, noindex, frames, redirects, and developer/technical-owner help. FlowMe should start from access and status, not exposure promises. |
| [Naver Search Advisor Help - ownership introduction](https://help.naver.com/service/30010/contents/17591) | Ownership is required because webmaster actions can affect collection, deletion requests, and reports. FlowMe can store the method name and status, not the verification value. |
| [Naver Search Advisor Help - ownership troubleshooting](https://help.naver.com/service/30010/contents/17598) | Protocol mismatch, wrong account-issued HTML/tag, default page vs index page, robot blocking, and redirects can block verification. These become "ask developer/host" decision points. |
| [Naver Search Advisor Help - HTML file upload](https://help.naver.com/service/30010/contents/17594?lang=ko) | HTML file upload needs root-folder access or hosting-provider help. FlowMe should ask whether the user has root upload access before showing this as the chosen method. |
| [Naver Search Advisor Help - HTML tag method](https://help.naver.com/service/30010/contents/17595?lang=ko&osType=PC) | HTML tag verification needs editing the first page/head area. FlowMe should record "head edit possible" or "ask developer", not the tag content. |
| [Naver Search Advisor - report diagnosis guide](https://searchadvisor.naver.com/guide/report-diagnosis) | Collection limits, noindex, SEO diagnosis, report delays, and re-crawl wait are status notes. FlowMe should not promise immediate indexing. |
| [Naver Help - sitemap presence and collection](https://help.naver.com/service/30010/contents/17623?lang=ko) | A sitemap is useful, but the help page explicitly separates sitemap presence from search reflection. FlowMe should record sitemap/RSS status without implying guaranteed search exposure. |

## Rejected Scopes

Do not use these as the first implementation scenario:

- Generic multi-platform search-console setup: too much variation for the first UI pass.
- Google-first setup: useful comparator, but less Korean-first than Naver Search Advisor.
- Bing import flow: OAuth/account import boundary is too platform-heavy for Stage 0.
- Naver Blog/Cafe native ownership only: too platform-specific and may not require the same site-readiness artifact.
- SEO ranking improvement: not a FlowMe artifact and creates false outcome expectations.

## Conversion Decision

Conversion decision:

- User need: As a Korean custom-site owner preparing Naver Search Advisor setup, I need to choose the right ownership method, check crawl prerequisites, and schedule a revisit, so that I can finish setup without saving verification values or assuming search exposure is guaranteed.
- Content shape: official Naver Search Advisor setup, diagnosis, ownership, and report guides.
- Primary destination: `hybrid`.
- Structure: access/status checklist plus one revisit memo.
- Action count: 5 primary actions.
- Playbook: source-specific setup checklist.
- Exceptions: no SEO score, no ranking plan, no platform integration, no token or DNS storage.
- Risk/source handling: official setup steps, user technical access, and no-guarantee cautions stay separate.

## Proposed Review Artifact

| Step | User-facing action | Completion |
|---:|---|---|
| 1 | 사이트 단위와 접근권한 먼저 고르기 | The user chooses custom domain, host/CMS, or URL unit and records whether DNS, root file upload, or homepage head edit access exists. |
| 2 | 소유확인 방법을 Flow 밖에서 선택하기 | The user chooses HTML file, HTML tag, or ask-developer/host-admin. FlowMe stores only the method/status. |
| 3 | 로봇 접근과 noindex 차단 여부 확인하기 | The user checks robots.txt, noindex, redirect/frame issues, and live accessibility against the official guide. |
| 4 | 사이트맵/RSS/수집요청 상태만 남기기 | The user records submitted, unavailable, skipped, or ask-developer status without storing generated files or API values. |
| 5 | 다시 볼 날짜 정하기 | The user records when to check ownership, diagnosis, collection, sitemap/RSS, or report status after platform processing time. |

## Product Gate For Implementation

Implement a `/content-flows` review candidate only if the test can prove all of these:

1. candidate id is `naver-search-advisor-site-readiness`;
2. source type is `official`;
3. the first action is access/method selection, not sitemap submission or ranking improvement;
4. the candidate copy distinguishes ownership verification, crawl/collection, indexing/search reflection, diagnosis/report, and ranking;
5. sensitive verification values are not present in title, signal, user need, action titles, source boundary, preview fields, detail memo, export copy, or tests;
6. the preview includes `ask developer/host admin` as a valid status rather than forcing the user to edit DNS or HTML themselves;
7. no public route, OAuth import, DNS automation, sitemap generation, IndexNow/API automation, SEO score, ranking tracker, or analytics dashboard is added.

## Suggested Regression Checks

- Candidate data test: `naver-search-advisor-site-readiness` exists, is official-source, uses `hybrid`, includes access/method selection before sitemap/RSS status, and excludes token/DNS/tag/API/credential storage.
- User-review test: the candidate is conditional or review-queue, not representative or validated.
- Selection-audit test: the candidate is in the digital setup axis with a source/safety boundary.
- Playwright preview test: clicking the candidate shows `실행 UI`, the Naver-first title, access/method selection, `Flow에 저장하지 않습니다`, and revisit status.

## Current Product Stance

- Docs scenario selected: yes.
- `/content-flows` review candidate: yes.
- Public `/f/[slug]` route: no.
- Platform integration: no.
- SEO/ranking feature: no.

## 2026-06-09 Review Candidate Pass

`naver-search-advisor-site-readiness` is now represented as a separate `/content-flows` review candidate with a candidate-specific execution preview.

What changed:

- Added the official-source candidate to the Korean Flow content candidate set.
- Added user-review and selection-audit metadata so the candidate is covered by the existing review gates.
- Added a dedicated high-fidelity preview spec in `components/flow/KoreanFlowContentStudio.tsx`.
- Added regression coverage that forces the artifact to start with site unit/access method selection and keeps verification values out of Flow.

Current boundary:

- `/content-flows` review candidate: yes.
- Public `/f/[slug]` route: no.
- Naver integration, DNS automation, sitemap generation, IndexNow/API automation, SEO scoring, ranking tracking, or analytics reporting: no.
- Verification values, DNS values, HTML tag contents, account authorization, platform keys, login secrets, and generated sitemap assets in FlowMe state/copy/export: no.

Focused verification:

- `npx tsx --test lib\flow\korean-flow-content-candidates.test.ts`
- `npx playwright test tests/e2e/flow-mvp.spec.ts -g "content flows studio renders saved execution previews for every candidate" --timeout=120000`

## Rubric Snapshot

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 5
- Portability: 4
- Cognitive Load: 3
- Copy Specificity: 4
- Source/Safety: 5
- Accessibility/Operability: 4

Lowest point: cognitive load. The first UI must hide platform detail until the user chooses what access they actually have.
