# QA Evidence

**Status:** LOCAL IMPLEMENTATION QA PASS / PUBLICATION AUTHORIZED / PR NOT OPEN

**Base:** `8f72ad6922ffa20a765a45cb9b5312ecfa8ca46f`

**Candidate commit / PR head:** `PENDING`

**Final verified BUILD_ID:** `bzdhR-nY_afpTfx_xDZ7e`

**Observed users:** `0`

The verified implementation is a worktree candidate built from the recorded
base, and publication is authorized. This evidence proves local behavior only;
candidate commit, PR, CI, merge, deployment, and production smoke remain
`PENDING` and no published or production-deployed source is claimed.

| Gate | State | Evidence |
| --- | --- | --- |
| Route/data inventory | PASS | Direct executable Map routes `10`: canonical redirects `2`, rendered `save_all` `6`, rendered `choose_child` `2`; review-hold Maps `5` preserve their non-executable boundary. |
| Storage/schema migration | PASS — NONE | Existing Map/Flow keys, snapshot versions, atomic Map transactions, bridge records, and canonical child IDs are retained; no migration was added. |
| Unit/contract | PASS | `npm test`: pretest `173/173`, main `622/622`, approved `182/182`, public-surface `8/8`. |
| Production build | PASS | Next.js build `18/18`; final BUILD_ID `bzdhR-nY_afpTfx_xDZ7e`. |
| New public-surface E2E | PASS | `9/9`, workers `1`, retries `0`, duration `54.3s`; covers all `9` executable routes at 390/768/1024/1440, unchanged raw storage on entry and tab selection, unnamed/clipped/fixed-overlap controls `0`, and runtime/network errors `0`. Output: `output/playwright/public-plan-surface-unification-final/public-surface-9-final3-run3`. |
| Map rollback/copy contracts | PASS | `24/24`, workers `1`, retries `0`, duration `1.5m`; preserves Map save, review-hold, redirect, copy, and exact rollback-specific contracts. Output: `output/playwright/public-plan-surface-unification-final/map-rollback-contracts-final3`. |
| Flow MVP display regression | PASS AFTER BOUNDED FIX | First run `127/129` exposed two product-display failures; the bounded product display correction then passed the targeted cases `2/2`. |
| Current-source full Playwright | PASS | `578/578` across `74` files, workers `2`, retries `0`, duration `1,375,459.685ms` (`~22.9m`), unexpected/skipped/flaky `0`, failure artifacts `0`, server stderr `0`. JSON: `output/playwright/public-plan-surface-unification-final/full-578-final3-results.json`. |
| Documentation check | PASS | Product QA handoff initially recorded docs as `NOT_RUN`; publication preparation `npm run docs:check` passed: skill sync PASS, `16` required files, `4,510` local links. |
| Diff check | PASS | Full tracked-worktree `git diff --check` passed; the five tracked authorized docs passed their scoped check, and no-index checks passed `4/4` untracked active-spec files. |
| Candidate commit | PENDING | Authorized; exact commit SHA does not exist yet. |
| Push / PR | PENDING | Authorized; PR is not open and URL/head do not exist yet. |
| PR CI | PENDING | No PR run exists yet. |
| Merge | PENDING | No merge SHA exists yet. |
| Production deployment | PENDING | R3B remains the exact deployed production source. |
| Canonical production smoke | PENDING | Run only after exact-source deployment is verified. |
| Observed users | `0` | Automated QA and internal browser runs are not observed-user validation. |

## Verified public result contract

- Executable `/f/[slug]` and default executable `/flow-maps/[map]` use one `flow-public-shell` and the approved Text/Todo/Calendar result grammar.
- Canonical Todo rows, content, child order, Map identity, selected IDs, selected artifact mode, controlled anchor, and existing persistence transactions remain authoritative.
- Executable Maps do not expose `platform-nav`, `platform-mobile-tabs`, `flow-map-execution-outline`, the legacy Map artifact preview, or `저장될 전체 계획` in the default unified presentation.
- `choose_child` previews one child and navigates to `/f/[slug]` without creating a Map save key.
- Review-hold Maps expose no result, edit, save, or export action and retain their source/risk/noindex boundary.

## Exact rollback qualification

- Default executable Maps use the unified public presentation.
- Exact `visualSubtraction=off` restores the exact legacy Map shell, presentation, action, and anchor behavior for both `save_all` and `choose_child`.
- Exact `savedPlanLibrary=off` restores the prior/default result mode.
- These query-only switches do not rename keys, migrate schema, or change Map/child Flow identity.

## Evidence boundary

Local implementation and authorized automated QA are complete, and publication
is authorized. Candidate commit, PR, CI, merge, deployment, and production smoke
remain `PENDING`, and observed-user validation remains `0`. No release claim may
be made until the publication workflow identifies and verifies the exact
committed, merged, deployed, and production-smoked source.
