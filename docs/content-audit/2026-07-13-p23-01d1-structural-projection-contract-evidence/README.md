# P23-01D1 Structural Projection Contract Evidence

P23-01D1 introduces a pure projection contract for personal draft structural
overlays. It gives future Calendar and export consumers one effective Item
model without changing application routes or current export output.

## Scope

- Resolve source Items plus personal add/delete/restore/reorder.
- Apply personal title, memo, and schedule values by stable Item ID.
- Keep execution state separate from structural membership.
- Return destination eligibility for My Flow, Calendar screen, ICS, checklist,
  sheet, and memo.
- Guard source v2 additions, malformed order IDs, and source/user ID collisions.

## Deliberate Non-connections

- Calendar UI still uses its existing rows.
- Current ICS/checklist/sheet/memo builders still use their existing inputs.
- No route, component, visible copy, or screenshot changes are part of D1.

See `audit.md` for the consumer inventory and
`projection-fixtures.json` for machine-readable policy markers.

## Verification

| Check | Result |
|---|---|
| focused storage/projection tests | 31 passed |
| structural/storage/export regression group | 128 passed |
| full unit suite | 449 passed |
| personal draft order/recovery Playwright sanity | 1 passed |
| documentation check | passed |
| production build and type check | passed |
| application consumer files changed | 0 |

The browser sanity reused the existing personal-draft order/recovery scenario at
390px and 1024px. It produced no tracked screenshot changes.
