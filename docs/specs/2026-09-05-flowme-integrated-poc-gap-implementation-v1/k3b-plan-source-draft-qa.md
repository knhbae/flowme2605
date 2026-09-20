# K3-B B1-E 선행 — captured source draft validator QA

2026-09-05. [v3 설계 §3.1](./k3b-plan-source-journal-v3-design.md)의 작은 P API를 root가 승인한 뒤 구현했다. **신규 14개를 포함한 focused 118/118, 별도 C 70/70, D 72/72 PASS**다. E2 v3 writer/화면 구현 완료가 아니다. [직전 Sb 동결 QA](./k3b-plan-source-intent-qa.md)는 E1209853 시점의 결과로 보존했다.

## 1. API와 공유 범위

```js
P.validateCapturedPersonalPlanSourceDraft({ context, draft });
// { ok:true, scope:'captured-source-draft' }
// { ok:false, scope:'captured-source-draft', reason }
```

`context`는 실제 Sb editor token만 받는다. 정확한 입력 record/data descriptor → private token → 기존 `normalizedSourceIntent` → raw/source effective domain guard 순서다. raw/read token, clone, missing/extra field, getter, custom prototype을 거절한다. `now`, source packet, epoch, 임의 baseline, canEdit/trusted는 입력에 없다.

메타 조립은 실제 planner와 `withPlannedMetadata`를 공유한다. 검증 복사본은 captured raw의 기존 revision/updatedAt을 유지하고 Undo를 만들지 않는다. raw metadata/capture와 기존 domain은 `projectPersonalPlanState`, source-effective domain은 `applyValidatedOverlay`를 거쳐 실제 planner와 같은 `validatePlannedViews`에서 검사한다. 별도의 약한 정규식/domain validator를 만들지 않았다. 후보·overlay·baseline·context·권한을 출력하지 않는다.

이 성공은 **캡처 당시 기준에서 입력이 유효하다는 뜻**이다. 원문 변경·read-error·관찰 ABA 이후에도 입력 문법 자체는 valid일 수 있다. 실제 저장 planner의 freshness 실패는 그대로 남으며, 이 결과로 E2 stale/recovery 잠금을 해제하면 안 된다. 현재 source I/O·expectedRaw CAS·durable 저장 권한은 다른 책임이다.

## 2. 실행 기록

| 실행 | 결과 | 범위 |
|---|---:|---|
| 신규 API RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-draft-red-20260905.tap`) | 13 FAIL | 함수가 없던 승인 계약 RED. 기존 UI 결함 13개라는 뜻은 아님 |
| 첫 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-draft-green-first-20260905.tap`) | 13/13 PASS | 최초 등록 입력/domain 계약 |
| 최종 focused (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-draft-focused-final-20260905.tap`) | **118/118 PASS** | raw P41 + Sa25 + Sb23 + captured14 + reader characterization9 + 최초 intent gate6 |
| C 재회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-draft-checkpoint-regression-20260905.tap`) | **70/70 PASS** | workspace-checkpoint/checkpoint-plan-context/checkpoint-source-bound-plan |
| D 재회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-draft-deletion-regression-20260905.tap`) | **72/72 PASS** | workspace-permanent-delete/storage/plan-context-permanent-delete/review |

최종 세 실행은 등록 테스트 260회, skip/cancel/todo 0이다. 첫 RED·중간 GREEN·이전 Sb 재실행 수를 새 고유 기능 수로 더하지 않는다. 기존 시험 기대값은 변경하지 않았다. C/D 제품은 실행 전후 동일 해시였다. 전체 npm test/build·브라우저는 이번 하위 작업에서 실행하지 않았다.

## 3. 신규 14개 매핑

| ID | 검증 |
|---|---|
| V01 | 고정 출력 scope만, caller raw/draft/token 불변·새 revision/Undo 없음 |
| V02 Flow/Item 2개 | A→B 뒤 명시 A/B/inherit 입력과 actual bound planner의 일치 |
| V03 | 기존 explicit B가 source B와 같아도 validation/clean submit에서 자동 삭제 없음 |
| V04–05 | genuine Sb token만, raw/read/clone/null 거절, now/freshness/authority/baseline 추가 입력 거절 |
| V06–08 | invalid/foreign/unknown draft의 실제 planner reason 일치, 빈/CRLF/원문 설명 동값 개인 memo·same-date pin, 비반복 날짜 3mode·execution 불변 |
| V09 | 반복 unscheduled를 같은 `invalid-effective-plan`로 차단, raw recurrence/revision/Undo 불변 |
| V10 | captured valid가 current source error/epoch/raw-state stale을 해제하지 않음 |
| V11–12 | 입력/초안 getter 무실행, custom prototype 거절. 실제 UMD P realm의 Date/storage/DOM getter 접근 0 |
| V13 | 같은 실제 M validator에 source-effective 오류를 주입해 captured/actual planner가 둘 다 raw→source guard를 실행하고 거절하는지 확인 |

V13은 의존 함수의 guard 거절을 검증한 오류 주입이다. V09는 실제 기존 반복 domain을 사용한다. 반복 unscheduled 차단은 기존 규칙 보존이며, 반복을 포함한 날짜 3mode 전체 동등성 완료가 아니다. sourceTitle 부재/불명확 source chain/추가 membership은 이전 Sa/Sb capability를 유지한다.

## 4. 변경·동결 근거

변경 파일은 [P 모듈](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js), [새 14개 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-source-draft.test.cjs), 이 QA와 기존 Sb 문서의 후속 링크다. M/C/E2/D/app/React/builder/생성 HTML/공용 보고서는 수정하지 않았다. 새 key·writer·version·metadata 필드·독립 Undo도 없다.

| 대상 | SHA256 |
|---|---|
| exact Sb backup (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-captured-source-draft/personal-plan-context.js`) | `E1209853A9185FDFC4BB263AEE9BC79CAC08755509F4AFE5DECAF230617D2A51` |
| P 최종 | `9DE68BE271BD4026338A41229A4AB757F0EB4FA17C99DE23B6209C6A8F47C358` |
| 새 test | `8FE4CE51532904434DD1258310931E1E2350F1FAE932F45013B6B02C89D428F7` |
| C 실행 snapshot | `6E874DEBB90EBDCAABB725914428317ED0ADCE947B88E25DE6A038FD75AB7E57` |
| D 실행 snapshot | `A8448A47E89A3BEE4C9288AA58F71ECEC226A52ED58DFE14E9EAFE9353F97DF3` |

P와 exact backup의 전체 diff를 읽었다. 기존 candidate 함수에서 메타 조립·effective validation을 private helper로 분리하고 captured entry를 추가한 범위다. 실제 source planner는 같은 helper를 소비하며 기존 raw-only/ Sa/Sb 결과 회귀를 통과했다. P·새 test의 `node --check` 2/2 PASS.

`npm.cmd run docs:check` PASS(required files 16, local links 5,567). 다섯 소유 path의 scoped closeout을 실행했고, reporter에서 디렉터리로 묶인 미추적 문서 세 개는 `git status --untracked-files=all`로 따로 확인했다. 기존 dirty·다른 담당자 파일은 stage/정리하지 않았다.

## 5. 인계·미실행

E2 담당자에게 API와 frozen hash를 전달했다. v3 draft update는 이 검사를 local dirty-valid/invalid 표시용으로만 소비하며, 현재 source authority·journal 재도출·prepare/target/confirmed guard는 별도 구현·검증해야 한다.

브라우저·5 viewport·실제 Android Chrome/iOS Safari·보조기술·운영 localStorage byte 비교는 NOT_RUN. 실제 사용자 관찰 0명. pure UMD 접근 0과 test-double 저장 회귀는 실제 기기/운영 데이터 검사 증거가 아니다. commit·push·PR·Preview·Production 없음.
