# QA Evidence

**Status:** LOCAL IMPLEMENTATION AND VERIFICATION COMPLETE / DRAFT PR-PREVIEW AUTHORIZED / MERGE-PRODUCTION NOT AUTHORIZED

**Base:** `2f93f00d6539aa8125faccb7ad944eaf3397e7bc`

**Observed users:** `0`

## Required matrix

| Origin | 390 origin edit/save | 1024 responsive | 1440 responsive | Persistence invariant |
| --- | --- | --- | --- | --- |
| Canonical personal copy | PASS | PASS | PASS | PASS — same schema-v2 personal/source identity and key |
| Source-backed Flow Map | PASS | PASS | PASS | PASS — same map/version/child IDs and snapshot/persistence owners |
| Personal memo/URL draft | PASS | PASS | PASS | PASS — same draft bundle/source fragments/Item IDs/overlay schema |
| Legacy saved plan | PASS | PASS | PASS | PASS — no implicit schema-v2 promotion or identity fields |

Dedicated E2E `23/23` covers all four origins at 390 for open, nested Item apply,
unchanged storage before Plan save, dirty discard, browser Back, final save,
reload, effective export, and origin-specific persistence. Separate 390 lifecycle
cases cover list Back, archive, Undo, archived direct restore, URL/history, focus,
and 48px actions. At 1024 and 1440 each origin covers the shared shell, one
dialog, Plan -> Item -> Back focus, clean cancel focus, width/height/overflow,
and sticky footer conformance.

## Gates

| Gate | State | Evidence |
| --- | --- | --- |
| Docs contract | PASS | `16` required files and `4525` local links |
| Origin/persistence/source/storage axis | PASS | `172/172` |
| Saved-library controller | PASS | `19/19` |
| Approved execution regression | PASS | `187/187` |
| Lock contract | PASS | `59/59` |
| Four-origin and lifecycle E2E | PASS | Dedicated default `/my` suite `23/23` |
| Production build | PASS | `18` routes |
| Existing affected regression | PASS | `80/80` in isolated `51/51` and `29/29` runs |
| Full `npm test` | PASS | Full command completed with failures `0` |
| Independent Blocking/High review | PASS | Remaining Blocking/High findings `0` |
| Publication | DRAFT PR / PREVIEW AUTHORIZED | Owner authorized commit, push, Draft PR, and Preview on 2026-08-12; merge and Production remain separate gates |
| Observed users | `0` | Automation and visual inspection are not observed use |

## Byte and identity boundaries

- Cancel, Back, Item -> parent, and discarded drafts keep local/session storage byte-identical.
- Final save may change only the target plan's existing record, overlay, map snapshot/persistence, item draft/date/state, anchor, and last-visit owners required by that origin.
- Recovery markers are absent after a successful commit; unrelated sentinels remain unchanged.
- Archive/restore changes the existing personal lifecycle owner and legacy mirror only.
- Export may additionally write the existing receipt registry after the artifact effect succeeds.
