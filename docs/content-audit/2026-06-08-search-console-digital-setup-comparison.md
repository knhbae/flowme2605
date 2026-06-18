# 2026-06-08 Search Console Digital Setup Comparison

Purpose: add a second digital setup axis outside remote support, so FlowMe can compare platform setup workflows without drifting into integrations, SEO tooling, or account management.

Status: source/platform comparison, not user-behavior validation.

HTML view: [Search Console Digital Setup Comparison Korean HTML](./2026-06-08-search-console-digital-setup-comparison-ko.html)

## Decision Summary

Promote `site-search-console-setup-precheck` as a documentation-level Stage 0 candidate, but do not add it to `/content-flows` yet.

The user moment is concrete: a small site, blog, or creator page owner wants search engines to discover the site and follows official webmaster/search-console docs. The natural artifact is not an analytics dashboard. It is a short setup checklist plus memo that records:

- which search platform was prepared;
- which ownership method was used;
- whether robots/sitemap/indexing prerequisites were checked;
- which values were added outside FlowMe;
- what to revisit after the platform finishes processing.

FlowMe should store only the user's status and source links. It should not store verification tokens, DNS record values, OAuth grants, account credentials, API keys, sitemap files, or indexing/traffic promises.

## Official Source Snapshot

Checked on 2026-06-08.

| Service | Official source | Evidence cue | FlowMe reading |
|---|---|---|---|
| Google Search Console | [Verify your site ownership](https://support.google.com/webmasters/answer/9008080?hl=en-GB), [Sitemaps report](https://support.google.com/webmasters/answer/7451001?hl=en) | verification can use HTML file, meta tag, or DNS record; some methods require root upload, homepage HTML edit, or DNS access; sitemap reports only cover submitted/API sitemaps and can show fetch/read errors | strong setup checklist source; tokens/records must stay outside FlowMe |
| Naver Search Advisor | [검색엔진 최적화의 목적](https://searchadvisor.naver.com/guide/seo-basic-intro), [사이트 간단 체크](https://searchadvisor.naver.com/guide/diagnose-site), [수집요청 및 검색제외](https://searchadvisor.naver.com/guide/request-crawl), [IndexNow 소개](https://searchadvisor.naver.com/guide/indexnow-about) | site registration is host-unit based; ownership can use meta tag or HTML file upload; robots.txt, title/description, noindex, sitemap/RSS, and crawl request limits are called out; collection or IndexNow does not guarantee search exposure | strongest Korean-first comparator; useful for a site-readiness precheck, not a ranking promise |
| Bing Webmaster Tools | [Add and Verify site](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b), [URL Submission](https://www.bing.com/webmasters/help/url-submission-62f2860b), [Help Center](https://www.bing.com/webmasters/help/) | site addition can import verified Google Search Console sites or add manually; verification methods include DNS auto verification, XML file, meta tag, and CNAME; IndexNow is recommended for URL changes | useful platform-readiness comparator; OAuth import is a boundary, not Stage 0 behavior |

## User Behavior

- User moment: a creator, small business, or site owner has launched a site/blog and wants it discoverable in search.
- Current behavior: search platform setup articles, copy a verification token, edit DNS or HTML, submit a sitemap, request crawl/indexing, then wait without a clear review note.
- Manual breakpoints:
  - platform-specific setup methods are mixed with SEO outcome claims;
  - users may not know whether they have DNS, root file upload, or homepage HTML access;
  - sitemap and crawl request actions can be mistaken for guaranteed indexing;
  - OAuth import from one platform to another can grant account access beyond a simple checklist;
  - verification tokens and API keys are easy to paste into notes even though FlowMe should not store them.

## FlowMe Fit

- Input FlowMe can take: site URL, platform choice, site owner/manager, setup date, chosen ownership method, revisit date.
- Output FlowMe can produce: setup precheck checklist, status memo, revisit reminder.
- Natural artifact: `hybrid` with `internal_check` primary and optional calendar revisit.
- Minimum anchor: setup date or revisit date.
- Stage 0 behavior:
  - `open`: user opens the official setup source.
  - `anchor input`: user enters site URL and platform choice.
  - `copy/export`: user copies checklist/memo and optionally calendar revisit.
  - `check`: ownership method chosen, external value added, sitemap/robots checked, processing wait recorded.
  - `feedback`: failed verification, missing technical access, no sitemap, platform-specific issue.

## Conversion Decision

Conversion decision:

- User need: As a site owner preparing search-console setup, I need to choose the right ownership method, check sitemap/robots prerequisites, and schedule a revisit, so that I can finish setup without storing tokens or assuming search exposure is guaranteed.
- Content shape: official webmaster/search-console setup and diagnostic guides.
- Primary destination: `hybrid`.
- Structure: `checklist` with one optional revisit reminder.
- Action count: 5 source-derived actions.
- Playbook: source-specific setup checklist.
- Exceptions: do not convert this into SEO coaching, ranking optimization, analytics reporting, or automated platform integration.
- Risk/source handling: official platform steps, technical access requirements, and no-guarantee cautions stay separate.

Suggested actions:

| Step | Action | Completion |
|---:|---|---|
| 1 | Confirm the site unit and access level | The user knows whether the setup is for a host/domain/URL-prefix and whether they can edit DNS, upload root files, or edit homepage HTML. |
| 2 | Choose the ownership method outside FlowMe | HTML file, meta tag, DNS/TXT/CNAME, platform import, or other official method is selected; the actual token/record is not saved in FlowMe. |
| 3 | Check crawl prerequisites | robots.txt, noindex, title/description, redirect/frame issues, and live accessibility are checked against the official source. |
| 4 | Submit or record sitemap/RSS/URL request status | Sitemap/RSS/URL request is submitted where appropriate, or marked as not available; no indexing guarantee is implied. |
| 5 | Set a revisit note | The user records when to check verification, sitemap fetch/read status, crawl status, or platform report after processing time. |

## Platform Boundary

| Boundary | Keep In FlowMe | Keep Outside FlowMe |
|---|---|---|
| Ownership proof | method name and status | verification token, DNS record value, HTML verification file content |
| Account access | platform name and source link | login credentials, OAuth grant, account IDs, API keys |
| Sitemap/crawl | sitemap URL label or status if user chooses to type it | sitemap file contents, generated files, automated submissions |
| Performance | revisit reminder and report link | traffic/ranking promise, SEO score, indexing guarantee |
| Collaboration | memo: "ask developer/host admin" | full ticketing, DNS automation, credential handoff |

## Phase 5 Compression

| Candidate | Source | User Moment | Natural Artifact | Anchor | Stage 0 Behavior | Decision |
|---|---|---|---|---|---|---|
| Google Search Console ownership setup | Google Search Console Help | Site owner needs to verify ownership and submit/check sitemap | checklist + revisit memo | setup/revisit date | open, choose method, check sitemap, copy memo | `stage0_export_only` reference |
| Naver Search Advisor site readiness | Naver Search Advisor guide | Korean site owner checks ownership, robots, sitemap/RSS, crawl request limits | checklist + diagnostic memo | setup/revisit date | open, check readiness, copy memo | `stage0_export_only` strongest source candidate |
| Bing Webmaster Tools setup | Bing Webmaster Tools Help | Site owner adds a site or imports from Google Search Console | checklist + account-boundary memo | setup/revisit date | choose manual/import path, record status | `stage0_export_only` reference |
| Generic site-search-console setup precheck | Cross-platform official docs | Creator/small operator prepares discoverability without overclaiming SEO results | hybrid checklist | setup/revisit date | anchor, copy/export, check, feedback | `B+` documentation candidate |

## Product Decision

- A/B/C: `B+`.
- Why: the user job is concrete and source-backed, but technical access varies sharply by host/CMS and could turn into support or SEO consulting if promoted too early.
- Next action: keep as a docs-level candidate until a Korean-first setup source or user scenario is selected for `/content-flows`.
- Do not build:
  - Search Console, Naver Search Advisor, Bing Webmaster Tools, or IndexNow integration;
  - automated DNS/HTML edits;
  - OAuth import or account linking;
  - sitemap generation;
  - ranking/traffic/SEO score;
  - indexing guarantee;
  - token, DNS record, API key, OAuth grant, or account credential storage.

## Rubric Summary

- User Need Fit: 4
- Execution Clarity: 4
- Content Fidelity: 4
- Portability: 4
- Cognitive Load: 3
- Copy Specificity: 4
- Source/Safety: 5
- Accessibility/Operability: 4

Lowest point: cognitive load. The candidate should start with "Do you have DNS, root upload, or HTML edit access?" before showing platform-specific methods.

## Relation To Remote Support Comparison

Remote support and search-console setup both belong to the digital setup axis, but their risks differ:

- Remote support risk is real-time device control and credential exposure.
- Search-console setup risk is token/DNS/OAuth exposure and false outcome promises.

Both support the same Stage 0 rule: FlowMe can provide the setup checklist, status memo, and revisit reminder, but it should not become the platform, the integration, or the security/SEO authority.
