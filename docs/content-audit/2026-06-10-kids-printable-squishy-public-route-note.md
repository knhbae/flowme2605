# 2026-06-10 Kids Printable Squishy Public Route Note

## Purpose

`kids-printable-squishy-craft` is the next source-to-Flow sample after the jeonse benchmark and the already-public elementary-entry route.

The question is whether creator template content can become a lightweight Flow without copying the original material into FlowMe.

This is source-to-Flow QA evidence, not user-behavior validation.

## Route

- Public route: `/f/kids-printable-squishy-craft`
- Source candidate: `kids-printable-squishy-craft`
- Source: Naver Blog, Makeit DIY, free printable squishy craft post
- Source URL: <https://blog.naver.com/PostView.naver?blogId=makeitdiy&logNo=223260911491>
- Source checked: 2026-06-10

## Conversion Decision

- User need: As a parent preparing a weekend craft, I need the original printable link, usage condition, materials, and child-safe prep steps in one light checklist so that I can run the activity without copying the creator's template into FlowMe.
- Content shape: creator blog post with printable material and making instructions.
- Primary destination: `hybrid`
- Structure: `timeline`
- Action count: 7
- Playbook: creator material / checklist handoff.
- Exception: the original printable itself is not reproduced; the source link is the primary artifact for detailed template use.
- Risk/source handling: creator material, usage conditions, and cautions are separated from FlowMe execution checks.

## User-Screen Shape

The public route keeps the first screen simple:

- one setup input: play date;
- generated D-1 and D-Day checks;
- calendar preview plus execution checklist;
- item details for source URL, usage condition, prep material, and caution;
- no default photo upload or evidence workflow.

## Boundaries

FlowMe does not store:

- printable images, PDFs, password values, or downloaded files;
- child face photos, real names, class/school submission records, or development/education assessment records;
- product recommendations or purchase links as required steps.

The route also does not claim learning, development, creativity, or safety outcomes.

## Verification

- `npx tsx --test lib\flow\seed-flows.test.ts` passed.
- `npm run build` passed.
- Targeted Playwright passed:
  - `content flows studio links promoted candidates to matching public service flows`
  - `promoted content-flow service routes preserve executable source cues`
- Mobile selector check passed for `/f/kids-printable-squishy-craft`:
  - workbench visible;
  - seven checkboxes visible;
  - source link present;
  - first checkbox checkable;
  - no horizontal overflow at 390px width.
- Mobile screenshot: `output/playwright/kids-printable-squishy-public-mobile.png`

## Current Judgment

This sample works as a second category proof after jeonse/elementary because it changes the source shape from official/date guidance to creator material. The useful product behavior is not "summarize the craft", but "preserve the original link and make the parent-side prep executable."

The next category to promote should be `remote-help-session-precheck`, because it tests a digital procedure and sensitive-value exclusion rather than another family/life-transition flow.
