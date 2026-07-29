repo: knhbae/flowme2605
branch: codex/p33-integrated-program-plan
path: (whole repo — review scope: app/, lib/flow/, components/flow/, tests/e2e/, docs/specs + docs/content-audit)

## Last sync

date: 2026-07-25T10:56:00Z
commit: 8c54992ce5628ab2a3884a530a83d2c8226223dc
mode: read-only review (no app code changed, PR #156 still open draft, not merged)

### Updated in this project

- 실행 CRUD·목표 UX 독립 검토 완료 — 판정 `bounded_crud_revision`, finding 12건(high 3), CRUD 98셀(blocked 0), 목표 관리 A안 추천.
- 신규 패키지 `docs/content-audit/2026-07-25-p34-00-execution-crud-goal-ux-review-claude-design/` — README·audit·review.dc.html·current-proposed-wireframes.dc.html(11장면×390/1024)·JSON 3종·p34-backlog.md·screenshots.
- P33 Preview는 `vercel_sso_redirect`로 `inaccessible`, `components/flow/AppClient.tsx`는 512KB 초과로 열람 불가 → 해당 문구는 `undetermined` 표기.

## Screen map

| 이 프로젝트의 화면/산출물 | 근거로 읽은 repo 파일 |
|---|---|
| CRUD capability matrix (14객체×7조작) | `lib/flow/personal-flow-lifecycle.ts`, `lib/flow/flow-item-state.ts`, `lib/flow/canonical-flow-storage.ts`, `tests/e2e/p27-foundation.spec.ts` |
| H-1 Flow lifecycle 발견성 | `tests/e2e/p27-foundation.spec.ts`(archive/restore 경로), `evidence-p33/p33-06-canonical-my-flow-export-1440.png` |
| H-2 영구 삭제 계약 부재 | repo 전역 검색(`영구 삭제` → `docs/STATUS.md`·`docs/DECISIONS.md`만), `lib/flow/personal-flow-lifecycle.ts` |
| H-3 occurrence 수정 부재 | `tests/e2e/url-first-user-surface.spec.ts`(series detail), `components/flow/RoutineScheduleEditor.tsx`, `RoutineScheduleSummary.tsx` |
| M-1·M-3 어휘/편집 진입 | `tests/e2e/p27-foundation.spec.ts`(`enterMyFlowDetailEditMode`), `tests/e2e/p26-structural-edit-mode.spec.ts` |
| export 3범위 판정 | `tests/e2e/p24-execution-trust.spec.ts`, `components/flow/FlowExportPanel.tsx`, evidence 1440 캡처 |
| 목표 A/B/C 판정 | `components/flow/*` 전역 검색(`목표`·`마일스톤`·`진행률`), `components/flow/MovingD30Restart.tsx` |
| current 와이어프레임 11장면 | 위 소스 + `evidence-current/*`, `evidence-p33/*` |
| PR·preview 상태 | PR #156 페이지, `docs/content-audit/2026-07-25-p33-publish-stabilization-evidence/*` |

## Sync history

- 2026-07-25T02:45:23Z · `b4ba62ea5f8aa2a87b27558aafbba49ed9d4dc28` — P33 Draft PR 독립 검토(`bounded_fix_before_publish`, finding 11). 산출물: `P33 PR Review.dc.html`, `p33-pr-*`, `evidence-p33/`.
- 2026-07-24 · production release `30281a7` 기준 — cross-entry canonical 검토(`bounded_cross_entry_alignment`, 대안 B). 산출물: `review.dc.html`, `audit.md`, `decision-matrix.json`, `p33-recommendation.md`.
