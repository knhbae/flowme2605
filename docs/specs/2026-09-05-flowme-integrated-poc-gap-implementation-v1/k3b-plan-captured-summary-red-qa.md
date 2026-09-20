# K3-B B3-A — 변경 요약 순수 시험의 구현 전 실패 기록

2026-09-06. **신규 고유 시험 16개를 작성했다. 최종 실행은 0 PASS / 16 FAIL이며, 모두 제안 API가 없어서 실패했다. 제품 구현·브라우저 검증 완료를 뜻하지 않는다.**

이 문서는 구현 전 기록이다. 후속 승인으로 진행한 구현·GREEN 결과는 [별도 모델 QA](./k3b-plan-captured-summary-qa.md)에 있다. 아래 실패 기록을 현재 제품 상태로 읽지 않는다.

## 1. 범위와 근거

[변경 요약·영수증 설계](./k3b-plan-summary-receipt-design.md) 전문과 현행 P의 `normalizedSourceIntent`, `normalizedStructureIntent`, captured validator, 실제 source/structure planner를 읽었다. React [기존 요약 함수](../../../lib/flow/personal-workspace-poc-editor-receipt.ts)는 표시 자료의 의미를 대조하는 데만 사용했다. 별도 과거 대화 전체를 재조회하지 않았다.

이번 소유 파일은 [신규 순수 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-captured-summary.test.cjs)과 이 QA뿐이다. 기존 제품·시험, app, 저장 adapter, builder, 사용자 HTML을 수정하지 않았다.

승인된 API는 `P.summarizeCapturedPersonalPlanChanges({ context, draft, compareDraft? })` 하나다. genuine source/structure context를 받아 `scope: 'captured-plan-changes'`의 frozen 표시 자료를 돌려준다. 성공 결과의 필드는 `ok`, `scope`, `changed`, `changes`, `affectedRefs`, `changedFieldCount`, `flowCount`, `itemCount`다. 현재 제품에는 이 함수가 없다.

`changes` 항목은 `{ owner: 'poc-personal-plan', field, label, before, after }`다. Item 필드는 `item.${fullRef}.title|memo|schedule`, 구간은 `section.${sectionId}.title`, Flow 제목·순서는 `flow.title`, `flow.item-order`다. full ref는 field identity와 affectedRefs에 남기고 표시 label·before·after에는 노출하지 않는다. 표시 문자열은 각각 160자 이하, 제어문자 없음, 실제 변경의 before/after 구분을 검사한다. React receipt의 100개 제한을 새 제품의 편집 한도로 적용하지 않는다.

## 2. 등록한 16개와 최종 상태

아래는 **API 구현 후 도달해야 할 assertion**을 정리한 것이다. 최종 RED에서는 각 시험이 API 존재 검사에서 멈췄으므로, 뒤쪽 semantic·보존·no-I/O 검사가 실행됐다고 해석하면 안 된다.

| ID | 검증하려는 계약 | 최종 결과 |
| --- | --- | --- |
| B3S01 | 실제 C source/structure context의 깨끗한 초안은 변경0, frozen 결과와 저장 권한 없음 | API 미구현 RED |
| B3S02 | 원문과 같은 Flow/Item 제목 override는 정규화 후0, 실제 C 전이도 no-op | API 미구현 RED |
| B3S03 | 검증된 source B 뒤 명시 원본 A는 Flow/Item 제목의 실제 개인 변경 | API 미구현 RED |
| B3S04 | 상속 날짜와 같은 fixed pin 및 명시 inherit 해제는 각각 schedule1건; raw 실행 정보 유지 | API 미구현 RED |
| B3S05 | imported memo 부재·빈 문자열·CRLF를 구별; source description을 메모로 사용하지 않음 | API 미구현 RED |
| B3S06 | 같은 길이의 다른 긴 CRLF 메모를 축약 전에 비교; 긴 label 제한과 exact 저장값 유지 | API 미구현 RED |
| B3S07 | 구간·cross-section 전체 순서·한 Item 메모/날짜는 필드4, Flow1+Item1; raw Step/실행 정보 유지 | API 미구현 RED |
| B3S08 | 이름이 같은 서로 다른 구간은 필드2, 직접 소유 Flow1 | API 미구현 RED |
| B3S09 | Item 표시 제목이 같아도 full-ref 순열 차이 유지, 다른 저장 사본의 owner 분리 | API 미구현 RED |
| B3S10 | compareDraft는 전체 staged 부모 기준; child는 자신의 차이만, 기본 비교는 opened 이후 전체 차이 | API 미구현 RED |
| B3S11 | 나중 source와 같아진 기존 개인 title intent는 유지; 명시 inherit만 소유 변경1건 | API 미구현 RED |
| B3S12 | 실제 source Undo 뒤 원문과 같아진 구간 alias는 유지; 명시 inherit만 구간 변경1건 | API 미구현 RED |
| B3S13 | raw/read/clone/foreign VM/wrong-Flow token은 genuine captured context로 승격하지 않음 | API 미구현 RED |
| B3S14 | unknown·부분 Plan·잘못된 mode/date/순열·compareDraft·getter를 차단하고 getter 실행0 | API 미구현 RED |
| B3S15 | 반복 Item의 날짜 미정 domain 차단; 실제 120 Item에서 메모120+Flow 제목1의 필드·ref121 유지 | API 미구현 RED |
| B3S16 | UMD의 I/O·clock·save-planner 진입0, candidate/권한 반환 없음; summary 성공으로 live epoch 검증 우회 불가 | API 미구현 RED |

M의 실제 `makeHandoff`·`apply`, source candidate 준비·resolve·apply·Undo와 C의 실제 변환·inspector·전이를 사용한다. 본문을 임의로 권한 있는 context처럼 만든 fixture는 없다. B3S11은 원래 개인 intent를 만들 때 실제 C raw Plan 경로를 먼저 사용하고, 이어 source-bound 경로로 연다. B3S12의 기존 alias 생성과 source Undo는 API 존재 검사 전에 실행되어 현재 fixture가 유효함을 확인했다.

B3S16은 제품 파일을 바꾸지 않고 메모리의 UMD 코드에 세 save-planner 진입 계수만 추가한다. localStorage/sessionStorage/document/window/fetch getter와 Date 사용 계수를 함께 둔다. API 구현 후 이 시험이 통과하더라도 모든 내부 임시 객체 생성을 검사했다는 뜻은 아니다. 검증용 임시 state는 설계상 허용하며, 저장 planner 호출·외부 I/O·반환 candidate를 금지하는 범위다.

## 3. 실제 실행 이력

| 실행 | 결과 | 해석 |
| --- | --- | --- |
| `node --check` 신규 파일 | exit0 | 구문 검사. 테스트 수에 합산하지 않음 |
| 첫 RED 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-red-20260906-01.tap`) | 16개 중0 PASS /16 FAIL, 351.7453ms | API 부재15개와 B3S11의 잘못된 checkpoint fixture1개. 이 파일은 기본 spec reporter 출력이며 확장자만 `.tap`이다 |
| 최종 RED 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/captured-summary-red-20260906-02.tap`) | 16개 중0 PASS /16 FAIL, 361.3634ms, exit1 | `--test-reporter=tap`. 모두 `B3 captured summary API is not implemented`; expected function / actual undefined |

첫 실행의 B3S11은 raw P가 만든 state를 C checkpoint에 직접 넣으면서 C의 timeline metadata를 누락했다. 제품 결함이 아니라 테스트 구성 오류였다. `C.fromLegacy → C.inspectPersonalPlanContext → C.transitionCheckpoint`로 고쳐 현재의 유효 checkpoint를 사용했다. 기존 기대값을 낮추거나 새 API가 없다는 실패를 assertThrows PASS로 바꾸지 않았다. 첫 로그는 보존했다.

실제 test runner 실행은 2회, test attempt는 32회, 고유 등록 시험은 16개다. 기존 P/C 회귀나 B2 UI 실행 수와 합산하지 않는다. API 부재 이후의 assertions는 아직 미실행이므로 위 16개를 요구 충족16개로 세지 않는다.

## 4. 변경 경계와 재현 기준

| 파일 | SHA-256 |
| --- | --- |
| 신규 시험 최종 | `5957B2E04E14D81DAC1FE409452FB1045EB4DF8A9F40234952782DDE4F0C5EAD` |
| P 실행 전·후 동일 | `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4` |
| C 실행 전·후 동일 | `AD18C6D8A776BF49923D6489238ADA78E067A29BD427DC9B53F19DE097D67314` |

이번 실행은 Node 메모리 fixture만 사용했다. 운영 사용자 프로필에 접근하지 않았고 운영 storage key/value 보존을 브라우저에서 검증한 것도 아니다. no-I/O 계수 시험은 API가 없는 관계로 아직 도달하지 않았으므로 이번 기록의 통과 증거로 인용하지 않는다.

## 5. 남은 일

main의 16개 검토와 별도 제품 구현 승인 후, P private 정규화에 최소 표시 API를 연결한다. 그 뒤 이 16개와 기존 P/C 회귀를 실제 실행하고, 요약의 의미가 실제 planner의 metadata 차이와 일치하는지 확인해야 한다. 의미 모델이 통과한 후에야 같은 attempt의 미리보기·성공 영수증·명시 workspace Undo·복구·late callback·5 viewport를 연결하고 검증한다.

이번 범위에서 npm 전체·production build·브라우저·5 viewport·실제 Android/iOS·가상 키보드·보조기술은 미실행이다. 관찰 사용자0. commit/push/PR/Preview/Production 없음. 사용자 HTML 변경 없음. B1/B2 또는 전체 통합 PoC 완료 판정을 새로 내리지 않았다.
