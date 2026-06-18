# 2026-06-09 Search Console Setup Precheck Gate

Purpose: tighten the `B+` site-search-console setup direction into a docs-only gate so FlowMe can analyze webmaster/search-console platforms without becoming SEO software, DNS automation, or an account integration surface.

Status: source/platform comparison and product boundary. This is not user-behavior validation.

HTML view: [Search Console Setup Precheck Gate Korean HTML](./2026-06-09-search-console-setup-precheck-gate-ko.html)

## Decision

Keep `site-search-console-setup-precheck` as a documentation-level Stage 0 candidate.

Do not add it to `/content-flows` yet.

Decision: `B+` docs-only candidate.

Why:

- The user job is real: a site, blog, shop, or creator-page owner wants to verify ownership, check crawl prerequisites, submit or record sitemap status, and revisit platform results.
- The artifact is naturally useful: a setup checklist plus revisit memo.
- The variation is still high: host/CMS access, DNS access, root upload access, HTML edit access, platform account permission, sitemap availability, and URL structure differ sharply by user.
- The risk is not physical safety; it is token/DNS/OAuth exposure and false indexing or ranking promises.

## Source Freshness

Checked again on 2026-06-09.

| Source | Current evidence | FlowMe reading |
|---|---|---|
| [Google Search Console: Verify your site ownership](https://support.google.com/webmasters/answer/9008080?hl=en) | Ownership lasts only while Google can confirm the verification token; HTML file upload, HTML tag, DNS/provider, Google Analytics, Google Tag Manager, Google Sites, and Blogger methods each require different access. | The first FlowMe action must ask what access the user actually has. FlowMe stores the method and status, not the token, file content, tag, or DNS value. |
| [Google Search Console: Sitemaps report](https://support.google.com/webmasters/answer/7451001?hl=en) | The sitemap must be accessible to Googlebot; status can be Success, Couldn't fetch, or error states; sitemap discovery does not guarantee crawl or indexing of listed URLs. | FlowMe can record sitemap status and a revisit date, but must not promise indexing. |
| [Naver Search Advisor: 사이트 등록 및 소유확인](https://searchadvisor.naver.com/guide/faq-start-register) | Site ownership can use meta tag or HTML file upload, with constraints around redirects, frames, body placement, source visibility, and technical access. | Naver is the strongest Korean-first comparator; the artifact should separate "can edit head/root" from "ask developer/host admin." |
| [Naver Search Advisor: 사이트 간단 체크](https://searchadvisor.naver.com/guide/diagnose-site) | The simple check reviews robot access, robots.txt, title/description, noindex, and RSS/sitemap submission. | Good precheck rows, but it should stay diagnostic memo, not SEO scoring. |
| [Naver Search Advisor: 수집요청 및 검색제외](https://searchadvisor.naver.com/guide/request-crawl) | Crawl requests are limited, priority-based, may take from at least a day to weeks, and do not guarantee search exposure. | Revisit reminders are appropriate; repeated request automation and ranking promises are not. |
| [Bing Webmaster Tools: Add and Verify site](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b) | Bing supports importing verified Google Search Console sites or adding manually with verification methods such as DNS, XML file, meta tag, or CNAME. | Import is an account-permission boundary. FlowMe can ask whether the user chose import or manual verification, but should not manage OAuth or account linkage. |
| [Bing Webmaster Tools: URL Submission](https://www.bing.com/webmasters/help/URL-Submission-62f2860b) | Bing recommends IndexNow for URL changes while manual URL submission and APIs remain advanced options. | IndexNow/API keys are outside Stage 0. FlowMe can record a status memo only. |

## User Behavior

- User moment: a site owner has launched or changed a site and wants search engines to discover it.
- Current behavior: they read platform docs or blog guides, copy verification values, edit DNS or HTML, submit a sitemap or URL, then wait without a clear status note.
- What breaks:
  - users confuse ownership verification, crawl discovery, sitemap reading, indexing, and ranking;
  - they may not know whether they can edit DNS, root files, or homepage `<head>`;
  - verification tokens and DNS records are easy to paste into notes;
  - OAuth import can grant broader platform access than a simple checklist implies;
  - crawl or URL submission is often misread as guaranteed exposure.

## FlowMe Fit

- Input FlowMe can take: site URL label, platform choice, setup owner, setup date, chosen ownership method, access status, sitemap/status label, revisit date.
- Input FlowMe must not take: verification token, DNS record value, HTML verification file content, meta-tag content, OAuth grant, API key, login credential, generated sitemap file, or ranking/traffic target.
- Output FlowMe can produce: setup precheck checklist, status memo, revisit reminder.
- Natural artifact: `hybrid`, with `internal_check` primary and optional revisit calendar reminder.
- Minimum anchor: setup date or revisit date.
- Stage 0 behavior: choose method, copy memo, check prerequisites, set revisit, collect feedback on failed verification or missing technical access.

## Conversion Decision

Conversion decision:

- User need: As a site owner preparing search-console setup, I need to choose the right ownership method, check crawl prerequisites, and schedule a revisit, so that I can finish setup without storing tokens or assuming search exposure is guaranteed.
- Content shape: official webmaster/search-console setup and diagnostic guides.
- Primary destination: `hybrid`.
- Structure: `checklist` with one revisit reminder.
- Action count: 5 primary actions.
- Playbook: source-specific setup checklist.
- Exceptions: do not convert this into SEO coaching, ranking optimization, analytics reporting, or automated platform integration.
- Risk/source handling: official platform steps, technical access requirements, and no-guarantee cautions stay separate.

## Proposed Docs-Only Artifact

| Step | Action | Completion |
|---:|---|---|
| 1 | Confirm site unit and technical access | The user knows whether the setup is for domain, host, URL prefix, or individual URL, and whether they can edit DNS, upload root files, or edit homepage HTML. |
| 2 | Choose ownership method outside FlowMe | HTML file, meta tag, DNS/TXT/CNAME, platform import, or another official method is selected; the actual token or record is not saved in FlowMe. |
| 3 | Check crawl prerequisites | robots.txt, noindex, title/description, redirects, frames, live accessibility, and sitemap/RSS availability are checked against official guidance. |
| 4 | Record sitemap, RSS, URL submission, or IndexNow status | The user records what was submitted or why it was skipped, without storing API keys or generated files. |
| 5 | Set revisit note | The user records when to check verification status, sitemap fetch/read status, crawl request status, or platform report after processing time. |

## Product Gate

Keep as docs-only until all are true:

1. a specific Korean-first user scenario or source is selected, such as Naver Search Advisor setup for a small site or blog;
2. the first visible action is access/method selection, not "submit sitemap";
3. copy distinguishes verification, crawl, indexing, and ranking;
4. the artifact can be useful without storing tokens, DNS values, OAuth grants, API keys, credentials, or sitemap file contents;
5. revisit timing is framed as "check status later," not "expect exposure later";
6. the route can survive high CMS/host variation without turning into support consulting.

Do not promote while any of these are true:

- the candidate implies verification or sitemap submission guarantees indexing;
- FlowMe asks for or exports token, DNS record, HTML tag content, API key, OAuth grant, login credential, or sitemap file content;
- the UI becomes an SEO score, ranking tracker, analytics dashboard, sitemap generator, or platform integration;
- the artifact treats Google, Naver, and Bing methods as interchangeable without exposing access differences.

## Platform Boundary

| Boundary | Keep In FlowMe | Keep Outside FlowMe |
|---|---|---|
| Ownership proof | platform, method name, status, source link | token, DNS record value, HTML file content, meta-tag content |
| Account access | "manual" vs "platform import" status | OAuth grant, account link, API key, credentials |
| Crawl/indexing | sitemap/RSS/URL request status, revisit date | sitemap generation, repeated URL submission, IndexNow API automation |
| Search outcome | no-guarantee caution and report link | SEO score, ranking promise, traffic target, indexing guarantee |
| Collaboration | memo: "ask developer/host admin" | ticketing workflow, DNS automation, credential handoff |

## Implementation Stance

No route/data rewrite in this pass.

Recommended next path:

1. Keep this as a docs handoff.
2. If promoted later, start with a Naver-first setup review candidate because it is the strongest Korean-first source axis.
3. Add regression coverage before implementation so the candidate cannot collect verification values or imply indexing/ranking guarantees.
4. Only consider a public route after a concrete user scenario proves that a five-step access/status/revisit artifact is understandable.

## Rubric Snapshot

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 5
- Portability: 4
- Cognitive Load: 3
- Copy Specificity: 4
- Source/Safety: 5
- Accessibility/Operability: 4

Lowest point: cognitive load. The gate should reduce method confusion before adding any UI.

## Next Candidate Queue

1. `site-search-console-setup-precheck`: keep docs-only until a Korean-first scenario is selected.
2. `naver-search-advisor-site-readiness`: best future review-candidate shape if the digital setup axis needs a Naver-first example.
3. `remote-help-session-precheck`: stronger near-term digital setup review candidate because the permission ladder is easier to preview in UI.

## 2026-06-09 Scenario Selection Pass

The Korean-first scenario has now been selected: `naver-search-advisor-site-readiness`.

Handoff: [2026-06-09 Naver Search Advisor Site Readiness Scenario](./2026-06-09-naver-search-advisor-site-readiness-scenario.md).

Updated stance:

- Generic `site-search-console-setup-precheck` remains a docs-only umbrella.
- `naver-search-advisor-site-readiness` is now a `/content-flows` review candidate with a candidate-specific execution preview.
- The candidate must start from site unit and access-method selection, then ownership method status, then crawl/noindex readiness, then sitemap/RSS/request status, then revisit status.
- It must support `ask developer/host admin` as a normal status.
- It must not store verification tokens, DNS records, HTML tag contents, OAuth grants, API keys, credentials, sitemap files, or ranking/traffic goals.

## 2026-06-09 Review Candidate Pass

`naver-search-advisor-site-readiness` has moved from scenario selection into `/content-flows` review.

What changed:

- Added the candidate as official-source data, not as a public route.
- Added review metadata and selection-audit metadata.
- Added a dedicated execution preview that starts with site unit/access method selection.
- Added regression coverage for access-method-first and no verification-value storage.

Current product stance:

- Generic `site-search-console-setup-precheck`: docs umbrella.
- `naver-search-advisor-site-readiness`: `/content-flows` review candidate.
- Public route, platform integration, DNS automation, sitemap generation, SEO score, ranking tracker, analytics dashboard: no.
