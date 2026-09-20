# B3 — React 개인 계획 순서 표시 QA

2026-09-06. **신규 3개 RED를 해소했고, 기존 106개와 함께 109/109 PASS**다. 실제 Plan opener·preflight·저장 handler·receipt validator를 격리 메모리 fixture에서 호출했다. 이번 결과는 React 화면이나 실기기 검사 결과가 아니다.

## 1. 바꾼 범위

- [editor-receipt.ts](../../../lib/flow/personal-workspace-poc-editor-receipt.ts): 순서 표시 helper 하나와 기존 full-ref join 두 줄만 변경했다. 짧은 순서는 `1. 첫 일 → 2. 둘째 일`처럼 제목과 위치를 표시한다. 제목이 같아 전후 표시가 같거나 160자를 넘으면 `기존 순서 · 2개` / `변경된 순서 · 2개`로 구분한다.
- 변경 전 제목은 실제 열린 baseline의 intent를 사용한다. 변경 후 제목은 기존 shared text intent normalizer를 재사용한다. 제목의 제어문자를 표시용 공백으로 바꾸되 원문과 draft는 고치지 않는다.
- 순서의 실제 변경 여부는 여전히 **full-ref 배열의 길이·각 위치**로 판정한다. affectedRefs, receipt owner/field, planner, schema, 100-entry cap, 원문/저장 writer는 변경하지 않았다. 공개 summary는 저장 권한이 아니다.
- [기존 receipt test](../../../lib/flow/personal-workspace-poc-editor-receipt.test.ts)의 순서 표시 기대값 한 줄만 갱신했다. [신규 test](../../../lib/flow/personal-workspace-poc-plan-order-display.test.ts)는 별도 3개다. standalone app·사용자 HTML·기존 B3 보고서는 수정하지 않았다.

Flow copy 기준의 내부 용어 비노출과 실제 결과 설명 원칙을 적용했다. 경고·접근성 이름·Undo 문구는 삭제하거나 바꾸지 않았다.

## 2. 요구별 실제 결과

| 신규 검사 | 수정 전 | 최종 확인 |
| --- | --- | --- |
| OD01 짧은 genuine ref + 개인 제목 → 원문 제목 | 저장/receipt는 성공하지만 `flow-item:c:f:0` 등이 전후 표시값에 노출 | 제목+위치만 표시. baseline 개인 제목과 normalized 새 제목 구분. 순서 및 Item 제목의 affectedRefs 그대로 |
| OD02 동명 Item 순열 | 서로 다른 full refs가 그대로 표시 | 순열 변경1, Flow affected ref1, 구분되는 전후 개수 안내. 무변경 draft는 summary0 |
| OD03 긴 제목/순서 + 제어문자 | 첫 long fixture에서 내부 ref 비노출 기대가 실패 | long은 bounded 개수 안내, control은 제목의 표시용 공백 변환. 두 variant 모두 원문·draft exact, receipt 유효 |

OD03은 **한 등록 검사 안의 두 fixture**다. 수정 전에는 첫 long fixture 실패로 control fixture까지 도달하지 않았다. control의 독립 수정 전 RED를 실행했다고 주장하지 않는다. 신규 3개를 viewport나 variant 수로 부풀리지 않았다.

## 3. 실행 이력

| 실행 | 실제 결과 | 근거 |
| --- | --- | --- |
| 신규 수정 전 | 0 PASS / 3 RED | RED JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-order-display-red3-2026-09-05T16-40-54-264Z.json`) |
| 표시 최소 수정 후 | 3/3 PASS | GREEN JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-order-display-green3-2026-09-05T16-41-48-656Z.json`) |
| 첫 strict | exit2, 새 MemoryStorage의 length/key 누락 | 첫 strict (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-order-display-strict-2026-09-05T16-41-49-261Z.json`). 제품/기대값이 아닌 테스트 인터페이스 보완 |
| 기존106 + 신규3 | 109/109 PASS | 첫 전체 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-order-display-final109-2026-09-05T16-42-20-630Z.json`) |
| 실제 handler raw/source 거절 보강 후 최종 | **109/109 PASS**, fail/skip/cancel0 | 최종 전체 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-order-display-final109-guards-2026-09-05T16-44-16-206Z.json`) |
| 최종 strict 대상6파일 | exit0 | strict JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-order-display-strict-final-2026-09-05T16-43-08-272Z.json`) |

109는 기존 7파일의 106과 신규 1파일의 3이다. 기존 Node runner 중첩 subtest를 포함한 실제 집계다. 각 반복 실행 수를 서로 합산하지 않았다. [이전 106 QA](./k3b-plan-summary-react-qa.md)와 당시 로그·제품 해시는 그대로 보존했다. 각 JSON에는 실제 명령과 전체 로그 경로가 있다.

## 4. 저장·원문 보호 근거

- 최종 신규 4 positive fixture는 각각 실제 저장 target1/support4: **target4 + support16 = 20 API 호출**이다. 이는 신규 파일에서 측정한 범위이며 전체109의 모든 저장 호출 수가 아니다.
- 각 fixture에서 실제 preflight에 변경된 raw/source를 주어 2건 거절했고, 실제 handler가 storage/current model을 읽는 prepare 경계에서도 같은 2건을 거절했다. 총 **pure 거절8 + handler 거절8**, 해당 경로의 제품 저장0이다. fixture Map의 외부 변경 주입과 제품 API 호출은 구분했다.
- 이 검사는 prepare 시점의 exact raw/source guard를 확인한다. **prepare 이후 commit 직전의 다른 탭 경쟁을 새로 실행한 CAS 검사가 아니다.** 기존 storage transaction 구현을 바꾸거나 그 범위의 보장을 추가하지 않았다.
- 모든 신규 positive에서 source model, 열린 state, 입력 draft, 운영 `flow:*` sentinel이 exact다. 허용 prefix 밖 set/remove0, clear0. receipt의 owner/field·전후 revision·affected ref와 실제 저장 candidate가 일치한다.
- 기존106의 memo/section/captured intent, no-op, source/raw stale, 실제 Undo·reload 및 100/101 cap 검사를 재사용했다. 101개 저장 자체를 금지하는 새 정책을 만들지 않았고 기존 receipt cap 거절은 유지된다.

## 5. 정확 사본과 동결 확인

변경 전 사본은 제품 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-plan-order-display-20260906-01/personal-workspace-poc-editor-receipt.ts`) / 기존 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-plan-order-display-20260906-01/personal-workspace-poc-editor-receipt.test.ts`)에 보존했다. 제품 사본 SHA는 `7E6C8E70ABD1DB10303FF4E1B2AA3D5B1F69D8F2F9DB1B15B657DB76ADF4121F`, 기존 검사 사본은 `AB586FA8BF8FBFB83C2648AA812307CBA8E07874055B386DCE119587CFC07E6B`다.

| 최종 변경 파일 | SHA256 |
| --- | --- |
| editor-receipt.ts | `B55015D6833E21E64313DD02D4BA0F56B24CC46964685FE1EE94B39CFDC8DBA9` |
| editor-receipt.test.ts | `F591D21D42BD87EE11EF53B80C0DF687A1AE0715918E96B7D3CCC8D5E1C21248` |
| plan-order-display.test.ts | `EF4DC80B5AE3EDB1D3A30A6854F8AAF82E3A7A918F77C23C2147462AF452AF76` |

최종 시작/끝 해시 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-order-display-final-hashes-1788626657405.json`)는 선정 제품/검사/HTML 19파일의 실행 중 불변을 확인한다. 변경 대상 receipt 파일을 제외한 이전106 제품 6개의 해시도 당시와 동일하다. 두 사용자 HTML은 계속 `889B88F811039413B15347359B5490D5D5D66CEFABC3B4B1DA91E4B516733098`, 각 1,428,663 bytes다. 사용자 HTML이 이번 React 표시 수정을 포함한다고 주장하지 않는다.

## 6. 미실행과 통합 범위

이번 하위 작업에서 `npm test` 전체·production build·React 브라우저·5 viewport·실제 Android/iOS·보조기술은 **NOT_RUN**, 관찰 사용자0이다. root의 B3 app 저장 결과/Undo 연결과 ABA 브라우저 작업은 별도 범위다. 같은 숫자로 묶거나 기존 테스트 근거를 화면 성공으로 승격하지 않는다.

commit 없음 / push 없음 / PR 없음 / Preview 없음 / Production 없음. 신규 Markdown QA만 작성했으며 기존 보고서·제품 HTML·운영 데이터를 변경하지 않았다.
