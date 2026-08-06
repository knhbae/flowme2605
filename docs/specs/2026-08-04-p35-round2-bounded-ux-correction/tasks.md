# P35 Round 2 B/B/B 실행 체크리스트

> 아래 체크박스의 단계별 상세 목표와 closeout 양식은 [전체 프로그램 단계별 개발 목표](./full-program.md)를 따른다.

## Gate

- [x] G0 — Owner가 Q1-B / Q2-B / Q3-B를 2026-08-04에 승인했다.
- [x] G1 — 로컬 decision, active spec, status, roadmap, QA, 개발 프롬프트를 연결했다.
- [x] G1 candidate freeze 권한 — 전체 승인 범위의 commit·push와 blind-only A/B 게시를 승인받았다. exact SHA는 commit 뒤 외부 freeze record에 기록하며 PR·merge·배포는 제외한다.

## Foundation

- [x] P0-01 — 실제 code/storage consumer inventory를 작성했다. ([closeout](./p0-01-closeout.md#2-실제-상태storage-consumer-inventory))
- [x] P0-01 — action ownership matrix를 fixture/test로 고정했다.
- [x] P0-01 — projection loss schema를 format별로 고정했다.
- [x] P0-01 — dated, undated, mixed, memo, routine, Map, completion criterion, legacy, missing-base fixture를 만들었다.
- [x] P0-01 — UI·route·save·`/my`·copy에 no-diff임을 확인했다.
- [x] P0-01 — nested Item commit, receipt storage, legacy versions, rollback mechanism을 기록했다. ([foundation answers](./p0-01-closeout.md#6-foundation-answers))

## Correctness

- [x] P0-02 — Flow Map selected/applied/preview/save Item IDs와 count를 일치시켰다. ([closeout](./p0-02-closeout.md))
- [x] P0-03 — 완료 기준 UI와 checklist payload를 일치시켰다. ([closeout](./p0-03-closeout.md))
- [x] P0-04 — atomic/idempotent save와 selected plan direct handoff를 구현했다. ([closeout](./p0-04-closeout.md))
- [x] P0-05 — public/saved Plan/Item 공통 transaction을 구현한다. ([closeout](./p0-05-closeout.md))
- [x] P0-06 — 공통 editor surface와 dirty/error/Back/focus 계약을 연결했다. ([closeout](./p0-06-closeout.md))
- [x] P0-07 — capability 기반 result preview와 행동 소유권을 연결한다. [closeout](./p0-07-closeout.md)
- [x] P0-08 — Q2-B 저장 계획 library shell을 독립 rollback 뒤에 구현한다. ([closeout](./p0-08-closeout.md))
- [x] P0-09 — Q1-B quick-local guard와 saved transfer/receipt/failure recovery를 구현했다. ([closeout](./p0-09-closeout.md))
- [x] P0-10 — hard fail 0과 기존 P35 통합 회귀 gate를 통과했다. ([closeout](./p0-10-closeout.md))

## Subtraction And Copy

- [x] P1-01 — Item, Flow Map, 시작일의 중복 surface·heading·echo를 감산했다. ([closeout](./p1-01-closeout.md))
- [x] P1-02 — Q3-B copy inventory와 broader owned-copy guard의 독립 감사 공백을 보정했다. ([closeout](./p1-02-closeout.md))
- [x] P1-03 — ICS/checklist/sheet/memo field parity를 golden artifact로 확인했다. ([closeout](./p1-03-closeout.md), [format/field parity](./p1-03-format-field-parity.md))
- [x] P1-04 — extreme·accessibility·legacy와 최종 내부 회귀 gate를 닫았다. 실제 zoom·performance는 `NOT_ASSESSED`, `720×500`은 reflow proxy다. ([closeout](./p1-04-closeout.md))

## Validation And Closeout

- [x] 각 티켓에서 targeted tests를 먼저 실행했다.
- [x] UI 티켓은 영향 E2E와 지정 viewport browser QA를 실행했다. P1-04의 `720×500`은 reflow proxy이며 실제 zoom은 `NOT_ASSESSED`다.
- [x] P0-10/P1-04와 candidate preflight에서 전체 unit/build/docs/E2E gate를 실행했다. 최종 E2E `529/529`(workers `4`, retries `0`, `26.0m`), direct `6/6`, unit `1,086/1,086`, build `18/18`, pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU`.
- [x] publish 경계를 분리했다. candidate commit·push와 blind-only A/B만 승인됐고, PR·merge·Vercel Preview/Production은 승인되지 않았다.
- [x] 자동·브라우저·정적 검토와 실제 사용자 수 `0명`을 분리했다.
- [x] V1 관찰은 Owner 결정으로 현재 프로그램 완료 범위에서 제외했다. observed users는 `0`이다.

## Stop Conditions

- [ ] Owner 결정과 이 spec이 충돌하면 구현을 멈춘다.
- [ ] base ref가 대상 branch ancestry에 없으면 임의 rebase 없이 보고한다.
- [ ] source/base mutation이나 destructive migration 없이는 구현할 수 없으면 멈춘다.
- [ ] 기존 dirty path와 대상 code touchpoint가 겹치면 소유권을 확인한다.
- [ ] 다른 P0/P1을 한 PR에 섞어야 acceptance가 통과한다면 strict order를 재검토한다.
