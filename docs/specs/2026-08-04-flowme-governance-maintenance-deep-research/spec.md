# FlowMe Governance & Maintenance Deep Research v1

**Date:** 2026-08-04  
**Status:** In progress — user-approved research and visual report  
**Owner:** Product owner  
**Related strategy:** [Collaborative authoring & editability strategy v1.1](../2026-07-29-collaborative-flow-authoring-editability-strategy-v1/spec.md)

## Goal

Define who may maintain a public Flow, what authority comes from authorship,
experience, evidence, contribution history, or platform responsibility, and how
the Flow stays trustworthy when opinions conflict, information ages, the
original author becomes inactive, or safety-sensitive corrections arrive.

The research must locate FlowMe between three familiar models without copying
their vocabulary into the product UI:

- blog: identifiable author, voice, context, and responsibility;
- wiki: small contributions, correction, history, and shared maintenance;
- GitHub: personal copy, bounded proposal, review, version, and recovery.

The output is a source-backed Korean visual strategy report with scenarios and
code-native FlowMe UI hypotheses. It is not an implementation or observed-user
validation package.

## Question To Answer

> Is a public Flow owned content, shared knowledge, or a maintained executable
> plan — and who can keep it useful after the first author publishes it?

## Existing Baseline

The 2026-07-29 contract already separates immutable published versions,
personal copies, execution state, bounded proposals, maintainer review, and
explicit version adoption. This study does not reopen that separation. It adds
the missing operating layer:

- maintainer eligibility and visible responsibility;
- co-maintenance and review assignment;
- evidence quality and conflict handling;
- stale detection, re-confirmation, retirement, and recovery;
- inactive-author succession;
- urgent platform intervention for rights, abuse, official, and safety issues;
- contributor attribution, license, and incentives.

## Scope

### In

- Current official governance mechanisms from blog/CMS, wiki, GitHub, and
  adjacent community-maintained platforms.
- Clear separation of author, maintainer, contributor, executor, subject
  reviewer, and platform moderator roles.
- Permission and decision matrix for low-risk experience, official facts,
  sensitive content, abuse, and rights issues.
- Lifecycle from authored draft through published use, proposal review,
  co-maintenance, stale state, succession, retirement, and recovery.
- Minimum six end-to-end scenarios with people, screens, interactions,
  decisions, and next-user consequences.
- Visual Korean HTML report, source ledger, generated scenario illustration,
  code-native UI, and responsive browser QA.

### Out

- Runtime, database, API, account, moderation-queue, or notification changes.
- Claims that one governance model is validated by FlowMe users.
- Automatic merging based only on popularity, completion, or AI confidence.
- Anonymous direct editing of public Flow content.
- Legal conclusions about licensing, employment, health, finance, or liability.
- Marketplace, payment, revenue share, or reputation implementation.

## Required Scenarios

1. Active experience author accepts a repeated low-risk improvement.
2. Author invites a trusted co-maintainer and divides review responsibility.
3. Conflicting experiences become condition-specific guidance rather than one
   averaged answer.
4. Author is inactive and a useful Flow becomes stale; re-confirmation,
   successor appointment, maintained copy, freeze, and retirement are compared.
5. Official or safety-sensitive information changes and the platform must
   intervene before the author responds.
6. Spam, copied content, or AI-generated mass proposals attack the review queue.

## Evidence Rules

- Prefer current official policies, help centers, terms, and product docs.
- Every real-service claim must link to the exact supporting page.
- Separate current FlowMe behavior, prior strategy contract, new recommendation,
  illustrative scenario, and unknown outcome.
- Quantitative evidence must retain date, denominator, unit, and caveat.
- Visualized people, events, queues, and FlowMe metrics are labeled as examples,
  not real product results.

## Decision Outputs

- Recommended FlowMe governance archetype and rejected alternatives.
- Role and authority model.
- Public-change decision tree.
- Maintainer assignment and succession model.
- Staleness and urgent-intervention states.
- Attribution and contributor-credit principles.
- User-facing language that avoids `fork`, `pull request`, `merge`, `branch`,
  `canonical`, and other developer terminology.
- Implementation entry options, dependencies, and reopen triggers without
  promoting one to active development.

## Deliverables

- `docs/content-audit/2026-08-04-flowme-governance-maintenance-strategy-visual-ko.html`
- `docs/content-audit/2026-08-04-flowme-governance-maintenance-source-ledger-ko.md`
- `docs/content-audit/2026-08-04-flowme-governance-maintenance-strategy-assets/`
- This spec package with plan, task ledger, and QA record.

## Acceptance Criteria

- Blog, wiki, and GitHub are compared as operating models, not metaphors only.
- At least six adjacent platforms contribute a distinct governance mechanism.
- Every recommended role has a reason, allowed action, blocked action, visible
  user signal, and fallback when the role is inactive.
- Stale, inactive-author, conflicting-opinion, official/safety, abuse, rights,
  and recovery paths all have explicit outcomes.
- At least six scenarios end with the effect on the next user.
- The report uses diagrams, scenario art, and realistic product UI rather than
  relying on prose alone.
- HTML passes desktop and 390px inspection with no horizontal overflow, broken
  images, replacement characters, text overlap, console errors, or failed
  local requests.
- `npm.cmd run docs:check` passes in the current worktree.
- Local edit, verification, commit, push, PR, merge, deploy, and observed-user
  states are reported separately.

