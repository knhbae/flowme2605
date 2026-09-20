# Historical Surface browser harness

Test-only Next application. Never deploy this directory or treat its PASS as current Program UX validation.

The real product `/my` and `/flows/new` pages, exact query gate, Route boot, storage, legacy Surface, Authoring and operating My fallback are reused. Only the ProgramApp import is replaced at this test application's build boundary with an adapter that renders the existing `legacy` React node. This owner selection does not change runtime queries, public routes, production configuration or assertions. Separately approved migrations to later preserved UX contracts are recorded in the [assertion migration ledger](./assertion-migration.md).

From the repository root:

```sh
node node_modules/next/dist/bin/next build tests/e2e/historical-app
npx playwright test --config tests/e2e/historical.config.ts
```

The harness uses port 3695 and its own `.next-history` build directory. The health endpoint identifies the harness; `[data-historical-test-harness]` identifies the actual adapter. The ownership manifest partitions every browser spec into exactly one owner. The ledger distinguishes preserved observations, approved assertion migrations, real defects and unresolved original-requirement differences; no scenario is deleted or skipped to conceal a mismatch.
