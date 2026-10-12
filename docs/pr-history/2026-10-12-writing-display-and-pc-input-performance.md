# Writing display and PC input performance — scoped PR 214 update

Base: `2ca15018ac77c83bfee3f0274e4b33a4028d5f28`.
Target: existing Draft PR #214 in `knhbae/flowme2605`, branch `agent/alpha-single-flow-intake-20261011`.
Publication and exact-head CI are explicitly approved. The first update was published as `0ad0bc6bf6c96153509a68035c7b5d4740d851f7`. Its run `38196073205` passed Docs/Unit/Build and Playwright E2E but failed the integrated contracts and required gate. The follow-up below repairs only related test fixtures; its publication and exact-head CI must be recorded separately. Merge and Alpha deployment are outside this scope.

## Scope

Preserve the completed folder/partial-progress recognition and readable wrapping changes. Index the latest dated progress once per editor projection, and coalesce ordinary input display refreshes into an animation frame. RAW change callbacks, input protection, dirty reporting, and save scheduling remain synchronous. Native commands and composition handling keep their existing synchronous behavior.

Product delta (4 paths):

- `components/flow/integrated-poc/ProgramTextEditor.module.css`
- `lib/flow/integrated-poc/text-workspace.ts`
- `lib/flow/integrated-poc/vendor/text-editor.cjs`
- `lib/flow/integrated-poc/vendor/text-editor.css`

Related tests (5 paths, including two existing fixtures required by the CI diagnosis):

- `lib/flow/integrated-poc/text-editor-active-paint.test.ts`
- `lib/flow/integrated-poc/text-editor-date-presentation.test.ts`
- `lib/flow/integrated-poc/text-editor-blur-visibility.test.ts`
- `lib/flow/integrated-poc/text-editor-input-frame-coalescing.test.ts`
- `lib/flow/integrated-poc/text-editor-progress-index.test.ts`

No unrelated dirty changes, new sorting policy, storage model, network capability, account data, captures, or raw diagnostic artifacts are included.

## Current evidence

- A separate exact-byte integration candidate completed Next production compilation and included type validation with exit 0. Local BUILD_ID: `WYlffKSEsSN-2cF8EVA49`.
- Independent read-only review found the seven code/test files identical to the completed donor and the scope confined to the intended changes. Original candidates remain unchanged.
- Previously completed performance measurements and targeted-test artifacts remain historical evidence, not new integrated-shell or new CI results. The failed current contract run exposed fixture incompatibilities; those older pass counts do not supersede this failure.
- The new synthetic-only local server start was rejected before execution with `CreateProcess ... blocked by policy`. The tool did not provide a more specific reason. No alternate startup route or existing listener was used.
- The serverless complete AlphaWorkspace browser check passed seven scoped checks on 2026-10-12. The same synthetic fixture exercised writing entry, folders and dated 0/partial/100% progress, reading/editing, long last-row input with fake CAS acknowledgement, explicit RAW view and writing return, and normal fake repository recheck. The 393 current product source hashes matched before and after. There were no page/console errors, real account writes, servers, listeners, or forwarded network requests. This is a source-bundle check, **not** Next `/alpha` route, live authentication, or real persistence evidence.
- New PR-history documentation passed `npm run docs:check` before this evidence update; the normal commit hook checks the final document again.
- Normal `.githooks/pre-commit` requires documentation checks and `.githooks/pre-push` requires `npm run verify` (docs, unit tests, build). The unchanged CI provides four required jobs. The repository rules require relevant browser verification for this delta, but do not define local Next `/alpha` service startup as a separate publication prerequisite. Required hooks and CI remain mandatory. Publishing these scoped changes is independent of the rejected local server action; it does not retry that action or supply new runtime access.
- Next `/alpha` route inspection, merge, and Alpha transition remain **NOT_RUN**. Actual push and new exact-head CI are verified separately; previous-head CI success is not used for this update.

## Narrow contract-fixture repair

Run `38196073205` retained an allowlisted summary: 3,433 executions, 3,412 passed, 21 failed, no skips or cancellations, and no changed source files. Private input cleanup and allowlisted-summary upload succeeded. The remote summary does not identify failed cases.

A single local reproduction of three existing synthetic harnesses produced 31 tests: 10 passed and 21 failed. Fourteen active-paint and six date-presentation fixture cases could not find the old two-argument `publish` declaration after the product added an optional third argument. One host-height fixture omitted the `remember` callback now called by the scheduled frame. This count matches the remote failure count, but does not recover the withheld remote case identities.

The two source slices now use the function-name boundary, retaining the existing section-presence assertion and all product assertions. The host-height fixture supplies a counted `remember` callback and asserts one call per rendered frame. No product, workflow, timeout, skip, gate, or private-output behavior changes are made in this follow-up. One local after-fix run passed all 31 tests, with no skips and matching opening/closing file hashes. The follow-up adds only the two directly related existing test paths above; product scope remains four paths.

## Remaining boundary

Keep the existing repository hooks and CI gates. The pre-execution rejection of local port 3107 is retained; there is no retry, alternate server, or reuse of the support listener. The historical manual startup helper is disabled and must not be used. Actual Next `/alpha` HTTP rendering, account persistence, physical-device/OS IME behavior, and observed-user understanding remain unverified by this local checkpoint. No merge or Alpha transition is authorized by this publication scope.
