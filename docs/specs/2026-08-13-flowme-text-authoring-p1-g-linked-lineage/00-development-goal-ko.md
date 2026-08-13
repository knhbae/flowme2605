# FlowMe Text Authoring P1-G 연결 계보 계약 개발 목표

- 승인 ID: `TA-P1-G-LINKED-LINEAGE-20260813-01`
- track/status: `P1-G-LINKED-LINEAGE / APPROVED_FOR_SPEC_AND_FIXTURE`
- 기준 commit: `a5597e9fe89b1facddba801212af5e05791d06af`
- target: `D:\flowme2605\flow-text-authoring-p1-g-linked-lineage-20260813`
- branch: `codex/text-authoring-p1-g-linked-lineage-20260813`
- 현재 상태: `LOCAL_INTERNAL_QA_PASS / LOCAL_COMMIT_INCLUDED (authorized)`
- 경계: `LOCAL_ONLY / external side effect 0 / observed-user 0`

## 0. 승인 manifest row

| field                    | approved value                                                   |
| ------------------------ | ---------------------------------------------------------------- |
| `APPROVAL_ID`            | `TA-P1-G-LINKED-LINEAGE-20260813-01`                             |
| `APPROVED_TRACK_ID`      | `P1-G-LINKED-LINEAGE`                                            |
| `APPROVED_STATUS`        | `APPROVED_FOR_SPEC_AND_FIXTURE`                                  |
| `APPROVED_BY`            | FlowMe repository owner / current user                           |
| `APPROVED_AT_KST`        | `2026-08-13 15:54:20 KST`                                        |
| `BASELINE_COMMIT`        | `a5597e9fe89b1facddba801212af5e05791d06af`                       |
| `TARGET_CHECKOUT`        | `D:\flowme2605\flow-text-authoring-p1-g-linked-lineage-20260813` |
| `EXPECTED_BRANCH`        | `codex/text-authoring-p1-g-linked-lineage-20260813`              |
| `SOURCE_CHECKOUT`        | `NONE`                                                           |
| `OWNED_DIRTY_PATHS`      | `NONE` at approval                                               |
| `APPROVED_DIFF_MANIFEST` | `NONE` at approval                                               |
| `PUBLISH_BOUNDARY`       | `LOCAL_ONLY`                                                     |
| `EXTERNAL_SIDE_EFFECTS`  | `0`                                                              |
| `OBSERVED_USER_COUNT`    | `0`                                                              |
| `COMMIT_PERMISSION`      | target local commit `1`개                                        |

승인 근거는 현재 사용자 메시지이며 session JSONL
`rollout-2026-08-13T15-54-19-019ff9e6-7902-7c21-ace8-efd13a0a8bc9.jsonl:14713-14714`에 보존되어 있다.

## 1. 목표

같은 합성 source 안에서 공통 통관 parent Flow와 차량 전용 child Flow 사이의
깊이 1, child 최대 1개의 조건부 계보 계약을 정의한다. 이번 track은 다음만
산출한다.

1. draft-2020-12 기반 canonical JSON Schema
2. 권리 안전 synthetic fixture 6종
3. fixture를 직접 읽는 test-only validator/evaluator와 acceptance test
4. 승인·검증·공개 경계를 남기는 목표와 결과 문서

Text Authoring runtime, app, store, schema, feature flag에는 이 계약을 넣지 않는다.

## 2. 콘텐츠 변환 결정과 권리 경계

- source authority: 관세청 공식 안내 URL
- evidence locator: 기존 실콘텐츠 ledger의 `S15`, model gap의 `M5`
- source shape: 공통 통관 절차 안에 차량 포함 여부로만 열리는 별도 완료 단위
- natural destination: runtime Flow가 아닌 bounded linked-lineage spec/fixture
- rights: `UNKNOWN_LINK_ONLY`; 공식 본문 bytes는 포함하지 않음
- fixture: 새로 작성한 최소 합성 문장만 사용
- 개인정보·실제 서류번호·주소·연락처·세액·법적 결과·기한 생성: `0`
- 실행 시점에는 공식 source를 다시 확인해야 하며 fixture는 법률 판단이나 최신성을 주장하지 않음

공식 source URL:
`https://www.customs.go.kr/kcs/ad/cntnts/cntntsView.do?cntntsId=8454&mi=8454`

## 3. canonical relation 불변식

1. parent와 child는 같은 synthetic source identity, snapshot, root, version lineage를 공유한다.
2. parent/child Flow ID, version ID, completion owner는 각각 독립한다.
3. 허용 predicate는 `vehicleIncluded === true` 하나뿐이다.
4. `false`는 valid omission으로 child `0`; `true`는 child 정확히 `1`이다.
5. missing, unknown, non-boolean predicate는 relation `null`, child `0`, write `0`으로 막는다.
6. parent 완료는 child를, child 완료는 parent를 완료시키지 않는다.
7. 검사와 과세·납부는 같은 parent 건의 branch이며 child Flow가 아니다.
8. child next action과 parent return pointer는 catalog 안의 stable Flow/Item을 가리킨다.
9. self-link, cycle, duplicate relation, 2개 이상 child, source/version/locator/owner/pointer mismatch는 fail-close한다.
10. assignee, dependency graph, shared completion, project workspace는 계약에 없다.

## 4. synthetic fixture 6종

| ID                                  | 입력·상태                            | 기대                                       |
| ----------------------------------- | ------------------------------------ | ------------------------------------------ |
| `p1g-s15-no-vehicle`                | `vehicleIncluded: false`             | child `0`                                  |
| `p1g-s15-with-vehicle`              | `vehicleIncluded: true`              | stable child 정확히 `1`, child next action |
| `p1g-s15-parent-done-child-pending` | parent completed, child pending      | child pending 유지                         |
| `p1g-s15-child-done-parent-pending` | child completed, parent pending      | parent pending 유지, parent로 복귀         |
| `p1g-s15-inspection-tax-branch`     | vehicle false, 검사·과세 branch true | parent branch 유지, child `0`              |
| `p1g-s15-return-contract`           | child exit                           | exact parent next action으로 복귀          |

missing/wrong predicate, owner mismatch, duplicate/self-link/cycle, source/version/locator
변조는 이 6종을 복제해 test 안에서 주입하며 별도 실콘텐츠 fixture로 세지 않는다.

## 5. 승인 파일 inventory

1. `docs/specs/README.md`
2. `docs/specs/2026-08-13-flowme-text-authoring-p1-g-linked-lineage/00-development-goal-ko.md`
3. `docs/specs/2026-08-13-flowme-text-authoring-p1-g-linked-lineage/linked-flow-lineage-contract-v1.json`
4. `docs/specs/2026-08-13-flowme-text-authoring-p1-g-linked-lineage/fixtures/customs-vehicle-linked-lineage.synthetic.json`
5. `docs/content-audit/2026-08-13-flowme-text-authoring-p1-g-linked-lineage-results/README.md`
6. `lib/flow/text-authoring/linked-flow-boundary.test.ts`

## 6. 제외 범위

- `app/**`, `components/**`, production `lib/**`, runtime index/export
- parser, Item/checklist, storage, service-state, route, schema migration, feature flag
- P1-A/B/D/F, P2, generic DAG/dependency/assignee/shared completion
- fetch/auth/provider, publication/P35, external Calendar/Todo/Excel 쓰기
- push, PR, merge, deploy, 관찰 사용자 검증

## 7. acceptance와 fresh QA

- targeted contract: `10/10` PASS
- shared Text Authoring: `276/276` PASS
- TypeScript: PASS
- full unit/contract lanes: `173/173 + 442/442 + 622/622 + 182/182` PASS
- production build: PASS, static generation `19/19`
- docs:check `16` required files / `4,562` local links PASS
- exact 6-path Prettier, scoped diff와 ownership audit PASS
- browser/E2E: `N/A`; runtime·UI diff가 정확히 `0`인 spec/fixture-only track

상세 명령·시각·failure injection과 publish 상태는
[결과 ledger](../../content-audit/2026-08-13-flowme-text-authoring-p1-g-linked-lineage-results/README.md)에 남긴다.

## 8. stop·rollback

child 수, completion 독립성, locator/hash, source/version, permission 중 하나라도
fail-open이거나 승인된 6개 경로 밖 diff가 생기면 commit하지 않는다. rollback은
이 spec/fixture commit을 채택하지 않고 P1-E baseline을 그대로 유지하는 것이다.

`LOCAL_INTERNAL_QA_PASS`는 local spec·fixture 검증만 뜻한다. runtime 구현, release,
실사용성 또는 관찰 사용자 검증을 뜻하지 않는다.
