# K3-B B3-A — captured 변경 요약 순수 모델 검증

2026-09-06. **표시 API 한 개를 P에 추가했다. 신규 17개와 기존 선정 회귀 487개가 통과했다.** Plan 미리보기·성공 영수증·영수증 Undo·브라우저 연결 완료는 아니다.

## 구현 범위

[변경 요약·영수증 설계](./k3b-plan-summary-receipt-design.md)와 main의 구현 승인을 따라 [P](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js)에 `summarizeCapturedPersonalPlanChanges`와 내부 표시 helper만 추가했다. VERSION1/CONTRACTv1, 구조 계약2, 기존 normalizer와 저장 planner를 바꾸지 않았다. C/E2/D/PD/M/S/app/builder/사용자 HTML·운영 schema·writer 변경0이다.

```js
P.summarizeCapturedPersonalPlanChanges({ context, draft, compareDraft? })
// { ok: true, scope: 'captured-plan-changes', changed, changes,
//   affectedRefs, changedFieldCount, flowCount, itemCount }
// 또는 { ok: false, scope: 'captured-plan-changes', reason }
```

genuine source/structure editor context는 기존 private WeakMap에서 찾는다. compareDraft가 없으면 opened 개인 overlay·structure를 비교 기준으로 쓰고, 있으면 같은 context의 전체 draft로 strict 검증·정규화한다. source 및 구조의 실제 정규화와 domain 검사를 공유한다. 이후 필드별 정확한 mode/presence/value·full-ref 순열을 비교하고, 직접 저장 owner의 고유 ref와 필드 수를 센다. 마지막에 label·before·after만 160자 이하의 제어문자 없는 표시값으로 바꾼다.

반환 전체는 frozen이다. changes의 항목은 `{ owner: 'poc-personal-plan', field, label, before, after }`이며 Item field에는 `item.${fullRef}.title|memo|schedule`을 쓴다. 구간은 `section.${sectionId}.title`, 순서는 `flow.item-order`다. label·값 문자열에 순서의 내부 full refs를 넣지 않는다. 축약 후 문자열이 같아도 원래의 의미 차이를 버리지 않고 변경 전/후 표시를 구분한다. 전체 결과를 100개로 자르지 않는다.

이 API는 저장 권한이 아니다. live source/raw/epoch·whole checkpoint guard는 기존 C/E2가 별도로 확인한다. validation용 임시 state는 기존 helper로 검사하지만 새 revision·timestamp·Undo·저장 candidate를 발급하지 않고, 저장 planner를 호출하지 않는다.

## 신규 17개의 최종 판정

세부 사전 설계·실패 원인은 [RED 기록](./k3b-plan-captured-summary-red-qa.md)에 남겼다. 이번 표는 최종 17개 실제 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-final-17-20260906-01.tap`)의 판정이다. 원래 16개에 독립 검토로 발견한 label 절단 경계1개를 추가했다.

| ID | 실제 확인한 범위 | 결과 |
| --- | --- | --- |
| B3S01 | 실제 C source/structure 토큰의 변경0, frozen 전체 결과, 권한·candidate 반환 없음 | PASS |
| B3S02 | 원문과 같은 제목 override 정규화0, 실제 C 전이도 동일 객체 no-op | PASS |
| B3S03 | source B 뒤 명시 A의 Flow/Item 제목 두 필드 및 실제 저장 intent | PASS |
| B3S04 | 같은 날짜 pin과 명시 inherit의 mode 차이 각1건, raw Flow/Item 유지 | PASS |
| B3S05 | imported memo 부재·빈 값·CRLF의 차이, 설명을 메모로 대입하지 않음, 실제 planner 동등성 | PASS |
| B3S06 | 같은 길이의 다른 긴 CRLF 메모를 변경1로 유지, 긴 label 제한, 원본·저장 메모 exact | PASS |
| B3S07 | 구간+전체 순서+한 Item 메모/날짜의 필드4·Flow1·Item1, raw Step/실행/timeline 유지 | PASS |
| B3S08 | 동명 구간 두 개의 section identity 유지, 직접 대상 Flow1 | PASS |
| B3S09 | 동명 Item의 순열 변경, 서로 다른 저장 사본의 full-ref owner 분리 | PASS |
| B3S10 | staged 부모 비교에서는 child 메모1, opened 비교에서는 부모 제목·순서까지3; 기준값 불변 | PASS |
| B3S11 | source와 같아진 기존 개인 title intent 유지, 다른 메모 저장으로 제거0, 명시 inherit의 owner 변경 | PASS |
| B3S12 | 실제 source Undo 뒤 동값 구간 alias 유지, 명시 inherit만 구간1건 | PASS |
| B3S13 | raw/read/clone/foreign VM/wrong-Flow 토큰 차단 | PASS |
| B3S14 | unknown·부분·잘못된 mode/date/순열·compareDraft·getter 차단, getter 실행0 | PASS |
| B3S15 | 반복 날짜 미정 domain 거절 및 실제 planner 같은 거절, 120 Item 메모+Flow 제목의 필드/ref121 | PASS |
| B3S16 | 실제 UMD I/O0·저장 planner 진입0·ambient clock0, captured 성공으로 live epoch 변경 우회 불가 | PASS |
| B3S17 | 긴 emoji label 절단의 두 UTF-16 경계에서 surrogate pair 보존, 표시 길이≤160·source/field identity 불변 | PASS |

메모·날짜 등 subcase 반복과 120개 Item을 별도의 테스트 120개로 세지 않는다. B3S16의 probe는 테스트 메모리 코드의 세 저장 planner 진입점에만 붙였다. 제품 파일은 probe 없이 실행·배포되는 원본 그대로다. Date.now와 인자 없는 new Date만 ambient clock으로 감시하며 명시 날짜 입력의 Date.parse/new Date는 순수 검증으로 허용한다. 이 검사는 모든 내부 임시 객체 생성을 금지했다는 뜻이 아니다.

## 실행 이력과 고유 수

| 실행 | 실제 결과 | 로그 |
| --- | --- | --- |
| 사전 RED1 | 0/16 PASS. API 부재15, B3S11 fixture 오류1 | RED1 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-red-20260906-01.tap`) |
| fixture 정정 RED2 | 0/16 PASS. 모두 API 미구현 | RED2 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-red-20260906-02.tap`) |
| API 구현 첫 실행 | 16/16 PASS, 524.8326ms | 첫 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-first-20260906-01.tap`) |
| 기존 21개 파일 회귀 | 487/487 PASS, 4485.878ms | 선정 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-regression-20260906-01.tap`) |
| clock shim 계약 정렬 후 최종 | 16/16 PASS, 516.2694ms | 최종 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-final-20260906-01.tap`) |
| 독립 label 경계 RED | 0/1 PASS, 185.534ms. 실제 분리된 high surrogate | label RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-label-red-20260906-01.tap`) |
| label 절단 보완 후 신규 최종 | 17/17 PASS, 609.1079ms | 17개 최종 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-final-17-20260906-01.tap`) |
| label 절단 보완 후 기존 회귀 최종 | 487/487 PASS, 5176.6461ms | 487개 최종 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-regression-final-20260906-01.tap`) |

최종 선정 **고유 504개 = 신규17 + 기존487**다. runner 실행8회, test attempt1056회(16×4+487×2+1+17)와 구별한다. 모든 실행의 skipped/cancelled/todo0이며 구문 검사는 테스트 수에 포함하지 않는다. 앞 단계에서 이미 실행한 기존 회귀를 프로젝트 전체 신규 검사로 다시 더하지 않는다.

기존 21개 파일은 다음과 같다.

- P: `personal-plan-context`, `personal-plan-source-reader`, `personal-plan-source-intent`, `personal-plan-source-draft`, `personal-plan-section-order-contract`, `personal-plan-structure-review`.
- C: `workspace-checkpoint`, `checkpoint-plan-context`, `checkpoint-source-bound-plan`, `checkpoint-source-bound-plan-review`, `checkpoint-structure-plan`, `checkpoint-structure-timeline-tie`.
- E/E2·저장 경계: `plan-item-session`, `plan-context-session`, `plan-source-context-session`, `plan-structure-context-session`, `workspace-structure-editor-recovery`, `structure-plan-boundaries`.
- 표시: `personal-plan-display`, `personal-plan-display-review`, `personal-plan-structure-display`.

모두 assets 폴더의 `.test.cjs` 파일이며 기존 파일 수정0이다. B3S11의 첫 fixture 오류는 C metadata를 빠뜨린 테스트 구성 문제였다. 실제 C inspector/transition으로 고쳤으며 semantic 기대값은 낮추지 않았다. clock shim 수정도 ambient 시간 읽기와 명시 날짜 검증을 구분하기 위한 것으로, 제품 첫16은 이미 통과한 상태였다.

독립 검토가 지적한 `slice(0,159)`의 label 절단은 별도의 실제 제품 표시 결함이었다. [추가 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-summary-display-boundary.test.cjs)이 `😀` 반복 제목에서 잘못된 `\ud83d…`를 재현했다. high/low surrogate 사이에 절단점이 있을 때 한 code unit 뒤로만 당겼다. 최대160이라는 기존 문자열 길이 제한과 나머지 의미·identity·저장 API는 그대로다. 표시 수정 전 P (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-summary-label-boundary/personal-plan-context.js`)의 첫16·487 PASS 이력도 보존했다.

## 동결 증거

| 대상 | SHA-256 |
| --- | --- |
| P exact before | `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4` |
| P 첫16·487 통과본 | `A193CA0F7658F3856294FFA8551DFA1976AA064F7BC05EC3F8FB620A38DF54D0` |
| P label 경계 보완 최종 | `5F42761D3B16B7F552F8795095760E6F7FA83918DBF24CF7FEEC92A852C59B5A` |
| 신규 시험 최종 | `B362CDBC915849756092008CF30C25240512221B340E0CF6D2AC44865275D861` |
| 신규 label 경계 시험 | `A7B802347947072606CB94DCF025225B1874D487BE5425C21F0EB872C95CD0E2` |
| C 실행 전·후 동일 | `AD18C6D8A776BF49923D6489238ADA78E067A29BD427DC9B53F19DE097D67314` |

정확 P before 복사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-captured-summary/personal-plan-context.js`)와 첫 scoped diff (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-final-20260906-01.diff`), label 보완 포함 최종 diff (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-final-17-20260906-01.diff`)를 보존했다. 기존 미소유 변경은 정리·stage하지 않았다.

## 아직 확인하지 않은 범위

실제 브라우저 storage API·사용자 프로필은 접근하지 않았다. 순수 fixture의 raw와 source packet 불변 및 저장 권한 비발급을 확인한 것이며, 운영 실사용 데이터 byte-for-byte 검증이나 화면 PASS로 표현하지 않는다.

Plan/child 미리보기, 같은 attempt의 영수증, confirmed 정리 이후 발행, source/creator 경쟁 중 명시 workspace Undo, live/focus·5 viewport는 후속 UI 단계다. main의 검토 전에 이 API를 app/builder/사용자 HTML에 연결하지 않았다. 이번 작업에서 npm 전체·production build·브라우저는 미실행이다. 실제 Android/iOS·가상 키보드·보조기술 미실행, 관찰 사용자0. commit/push/PR/Preview/Production 없음.
