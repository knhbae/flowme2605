# K3-B B1-Sb — source-aware 개인 계획 intent QA

이 문서의 E1209853 동결 뒤 승인된 입력 전용 validator는 [captured draft QA](./k3b-plan-source-draft-qa.md)에 분리했다. 아래 Sb 실행 수·해시는 역사 근거로 유지한다.

2026-09-05. 승인된 순수 P 모델 구현과 제한된 decoder 변경을 마쳤다. **focused 98/98, 최초 gap gate 6/6, checkpoint 회귀 70/70, 삭제·삭제 저장 회귀 72/72 PASS**다. app/E2/화면은 이 작업에서 변경하지 않았다. 이 결과를 통합 UI·실제 저장·실제 기기 검증 완료로 해석하지 않는다. [승인 계약](./k3b-plan-source-intent-contract-diff.md), [이전 Sa QA](./k3b-plan-source-reader-qa.md)를 함께 읽는다.

## 1. 구현·소유 범위

- [P 모듈](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js): Sa가 사적으로 보유하는 raw/source-before-P를 이용한 `inspectPersonalPlanSourceEditor`, `planPersonalPlanSourceState`를 추가했다. 기존 네 raw-only API의 normalize 결과는 유지했다.
- [Sb 신규 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-source-intent.test.cjs): 23개를 등록했다. 실제 M source fixture와 기존 domain validator를 사용한다.
- [최초 gap gate](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/k3b-plan-source-intent-gate.red.cjs): 기대값을 낮추지 않고 SB01–03 caller만 새 bound entry로 전환했다. SB05–06은 기존 raw API다.
- 이 QA·승인 계약과 이전 Sa QA의 후속 링크를 기록했다. M/C/E2/D/app/builder/HTML/React/공용 보고서는 수정하지 않았다.

새 writer/key/metadata field/schema version/독립 Undo가 없다. metadata decoder는 Flow/Item title의 raw 동값 거절만 제거했다. memo 동값·blank/type·exact ref/binding/capture·unknown field/버전·empty record 검사는 그대로다. title 동값 shape가 수용된다고 작성 주체나 의도를 인증하는 것은 아니다.

## 2. API 인계

```js
const source = P.readPersonalPlanSourceContext({
  rawState, legacyBaseRaw, undo, sourceRead, sourceEpoch,
});
const editor = P.inspectPersonalPlanSourceEditor({
  sourceContext: source.context, flowRef,
}); // { ok:true, context, draft, baseline, capabilities }
const candidate = P.planPersonalPlanSourceState({
  context: editor.context, rawState, sourceRead, sourceEpoch, draft, now,
}); // changed: { ok:true, changed:true, state, undo }
```

각 단계는 `ok`를 먼저 확인한다. source token과 editor token은 다른 WeakMap brand다. clone/serialize/다른 종류 token·추가 `trusted`/`canEdit` 입력으로 권한을 만들 수 없다. draft/baseline/capabilities는 frozen copy이며 public token에는 `{version:1}`만 있다. source raw나 private baseline은 token/draft에 serialize하지 않는다. 반환 candidate/Undo는 caller 소유 복사본으로, 외부 변경이 private context를 오염시키지 않는다.

Sb는 private source-before-P 또는 실제 기존 개인 title과 비교한다. memo는 원문 설명과 같더라도 기존 개인 baseline만 사용한다. 기존 explicit B가 source B와 동값이 됐어도 clean submit 및 다른 필드 변경에서 자동 제거하지 않는다. 명시 inherit만 해당 override를 없앤다. source-aware API가 `source-aware-normalization-required` 사유만 해제하며, Sa의 raw-only capability 판정은 그대로다.

candidate는 **raw authoritative state**다. 변경 시 revision 한 번 증가·기존 전체 before state를 Undo로 반환한다. no-op은 같은 state reference이며 Undo를 새로 만들지 않는다. source/error/stale/unknown 실패는 candidate/Undo를 반환하지 않는다. source view를 raw capture나 writer 입력으로 바꾸지 않는다.

각 저장 시도의 actual source read와 관찰 epoch는 caller가 공급한다. pure API가 실제 I/O를 인증하거나 localStorage 원자적 CAS를 제공하지 않는다. C의 full checkpoint/provenance 검사, E2의 prepare/retry/target/confirmed 전 authority 및 복구 후 새 source 재확인은 별도 책임이다. P가 반환하는 성공은 아직 저장 성공이 아니다.

## 3. 실제 실행 기록

| 실행 | 등록/결과 | 의미 |
|---|---:|---|
| 최초 계약 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-red-20260905.tap`) | 6: 3 PASS / 3 FAIL | raw-only 경로가 source-aware A/B·decoder 계약을 충족하지 못한 근거 |
| 새 API RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-api-red-20260905.tap`) | 18: 1 PASS / 17 FAIL | 새 API 부재. 17개의 UI 결함을 의미하지 않음 |
| 첫 구현 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-green-first-20260905.tap`) | 84/84 PASS | P41 + Sa25 + 초기 Sb18 |
| 최종 focused (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-focused-final-20260905.tap`) | **98/98 PASS** | P41 + Sa25 + Sb23 + 이전 reader characterization9 |
| 최초 gate 재실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-original-gate-green-20260905.tap`) | **6/6 PASS** | 승인된 caller만 교체, 원래 기대값 및 raw controls 유지 |
| C checkpoint 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-checkpoint-regression-20260905.tap`) | **70/70 PASS** | workspace-checkpoint + checkpoint-plan-context + checkpoint-source-bound-plan |
| D 삭제 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-deletion-regression-20260905.tap`) | **72/72 PASS** | workspace-permanent-delete + 그 storage + Plan metadata 삭제 + 독립 review |

최종 네 실행은 등록 테스트 246회다. 이전 RED/중간 재실행을 더해 고유 기능 수로 부풀리지 않는다. 모든 GREEN 실행 skip/cancel/todo 0. C/D 파일은 실행 전후 해시가 같았다. 삭제 저장 회귀는 test-double 저장소 검증이며 실제 운영 localStorage 실행이 아니다. 전체 `npm test`/production build/HTML 생성은 담당 root의 별도 통합 단계다.

## 4. 새 23개 요구 매핑

| ID | 확인한 경계 |
|---|---|
| I01 Flow/Item 2개 | 원문 A→B 뒤 명시 A 보존, raw 동값 decoder 수용, raw flows/tasks 불변·revision+1/full Undo |
| I02 Flow/Item 2개 | 명시 B 동값 no-op, metadata/Undo/revision 변경 없음 |
| I03 Flow/Item 2개 | 개인 C→inherit는 overlay만 제거, bound view B·raw A 보존 |
| I04 Flow/Item 2개 | 기존 explicit B의 serialize/reload/clean submit·다른 메모 수정에서 intent 보존 |
| I05–07 | 실제 기존 개인 title baseline, 원문 설명과 동값/빈/CRLF 메모, same-date pin·비반복 unscheduled의 개인 Plan owner |
| I08–10 | sourceTitle 부재 현재 capability 차단, token 브랜드/위조/다른 Flow, source read-error·exact raw 교체·observed ABA·raw state drift |
| I11–14 | private pre-P baseline frozen, memo/ref/capture/unknown strict 유지, raw-only normalize control, invalid date/time/title/draft/flag 거절 |
| I15–17 | 실제 UMD의 ambient storage/DOM 접근 0, token/draft에 source payload 없음, 반환 candidate/Undo 오염 방지, 확인된 부재와 read-error 구분 |
| I18–19 | 기존 반복 unscheduled 차단 유지·raw recurrence/execution 불변, source packet/draft getter 무실행 |

## 5. 해시·diff 확인

시작 HEAD는 `6e4b44fe2f61b7086b8bbc61c30b5aa39dd4390e`다. 이전 Sa P를 scoped backup (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-source-intent/personal-plan-context.js`)으로 보존하고 원본 SHA를 재확인했다. 최종 P와 backup의 `git diff --no-index` 전체를 읽었고, 변경은 별도 editor WeakMap·title 동값 2조건·private source snapshot·shared candidate 함수·새 API 범위였다.

| 대상 | SHA256 |
|---|---|
| Sa backup P | `BDBF71E8663F25DAC24C6BDE3B1C71090D903E334C68C1D807E415A206172AAD` |
| Sb P 동결 | `E1209853A9185FDFC4BB263AEE9BC79CAC08755509F4AFE5DECAF230617D2A51` |
| Sb 23 test | `78AD71728E5D8BC3692FF9670B2FBD2F0B43D9E238189770EDFBE7019F5F3618` |
| caller 전환 gate | `864F717EFB693504BAAF698BECE23BA64726A578BEC2AB40C4FB8C0EBB9F8CDE` |
| 최종 focused log | `89D7FCDEC278C4E3D4F94B51D7AEFD951F1415FD34C97361C6EBB9BF95A5A3D8` |
| C 실행 제품 snapshot | `6E874DEBB90EBDCAABB725914428317ED0ADCE947B88E25DE6A038FD75AB7E57` |
| D 실행 제품 snapshot | `A8448A47E89A3BEE4C9288AA58F71ECEC226A52ED58DFE14E9EAFE9353F97DF3` |

P·Sb test·최초 gate의 `node --check` 3/3 PASS. `npm.cmd run docs:check` PASS(required files 16, local links 5,546). 여섯 소유 path의 scoped closeout을 실행했다. reporter가 미추적 폴더로 묶은 문서 세 개는 `git status --untracked-files=all`로 따로 확인했다. 검증 권고를 실제 실행 결과로 대신 기록하지 않았다. Sb E1209853 동결 뒤 captured-draft validator는 별도 작은 승인 작업으로 진행하며 이 실행 수·해시는 유지한다.

## 6. 남은 경계와 실행하지 않은 것

sourceTitle 부재의 충돌, 검증되지 않은 source chain, 추가/누락 membership은 현재 capability 제한이다. 영구 제품 정책으로 확정하지 않았다. 날짜 3mode 중 반복 항목의 unscheduled는 **기존 recurrence 규칙을 보존하는 차단**이며 전체 3mode 동등성 PASS가 아니다. 실행 날짜/time/회차/완료를 추정하거나 재작성하지 않았다.

다음은 C wrapper와 E2 source authority를 함께 검증하고 app reader/editor에 연결하는 작업이다. 실제 UI에서 owner/빈값/dirty 취소/실패·재시도/키보드·5 viewport가 확인돼야 통합 기능을 충족했다고 판정할 수 있다.

이 하위 작업의 브라우저·5 viewport·Android Chrome·iOS Safari·보조기술은 NOT_RUN, 관찰 사용자 0명이다. 운영 `flow:*` 실제 key/value 비교도 이 하위 작업에서는 NOT_RUN이다. 순수 UMD 검사는 storage/DOM 접근 0을 증명하지만 운영 브라우저 검사를 대체하지 않는다. commit·push·PR·Preview·Production 없음.
