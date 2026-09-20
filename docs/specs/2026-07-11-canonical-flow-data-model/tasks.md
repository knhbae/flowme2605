# Canonical Flow Data Model v1 Tasks

<!-- alpha-transition-20260920:start -->
## 2026-09-20 연결 — 통합 PoC 이후 실사용 전환

현재 서버 전환 상태는 [실사용 알파 전환 원장](../2026-09-12-flowme-integrated-product-poc-program/alpha-transition.md)에서 관리한다. 이 문서의 완료 항목은 당시 계약 작업이며 실제 DB/Auth 완료가 아니다. Future Runtime 체크박스는 일괄 변경하지 않는다. 저장·권한·identity·이관/복구는 A01–A24에 연결하고, 자동 URL 수집·AI provider는 별도 보류로 구분한다. 기존 체크 상태와 원문은 보존한다.
<!-- alpha-transition-20260920:end -->

## Contract Slice

- [x] 현재 Flow/Section/Item/Detail, source bridge, overlay, run, export 구조를 인벤토리한다.
- [x] `Item`을 최소 독립 실행·상태 단위로 확정한다.
- [x] `SourceRow`를 최소 provenance 단위, `Step`을 의미 그룹 단위로 확정한다.
- [x] ICS와 체크리스트를 canonical 단위가 아닌 projection으로 정의한다.
- [x] life area, planning pattern, primary artifact, Item facet을 분리한다.
- [x] schedule/completion/Field/Memo/SourceRef/Review 계약을 정의한다.
- [x] published content, user overlay, run, occurrence state의 우선순위를 정의한다.
- [x] current model mapping과 비파괴 migration/rollback을 정의한다.
- [x] TypeScript reference contract를 작성한다.
- [x] PostgreSQL/Supabase 저장소와 API 계약을 작성한다.
- [x] 10개 positive와 2개 negative golden fixture를 작성한다.
- [x] fixture validator를 작성한다.
- [x] 한국어 HTML 검토 보드를 작성한다.
- [x] strict TypeScript compile을 통과한다.
- [x] fixture validator를 통과한다.
- [x] `npm.cmd run docs:check`를 통과한다.
- [x] HTML을 desktop과 390px에서 검토한다.
- [x] `git diff --check`를 통과한다.

## Future Runtime Slice

- [ ] runtime schema validator와 canonical content hash
- [ ] canonical-to-current `FlowBundle` compatibility adapter
- [ ] effective user state reducer와 unified projection service
- [ ] repository interface와 `local | shadow-write | server-primary` feature flag
- [ ] additive Supabase migrations, Auth, RLS, env validation
- [ ] local backup preview/commit/import rollback
- [ ] fake fetcher/extractor/provider와 state/idempotency/concurrency test
- [ ] URL intake review/save UI 연결
- [ ] sensitive content and rights gate
- [ ] real provider privacy/retention/cost review와 provider 선택
- [ ] internal canary 후 public promotion decision
