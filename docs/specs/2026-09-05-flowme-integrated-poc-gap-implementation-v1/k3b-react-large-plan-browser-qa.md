# K3-B React 대형 개인 Plan — 실제 화면 경계 검사

2026-09-06. B3의 React 변경 결과 연결 전후를 확인하는 좁은 검사다. 이 문서는 K3-B 전체 완료, 전체 화면 품질 또는 실제 기기 검증을 뜻하지 않는다.

## 범위와 실제 입력

대형 Plan과 작은 경계 8개는 신규 personal-workspace-k3b-react-large-plan.spec.ts (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-react-large-plan.spec.ts`), 저장 확정 이후 경계 3개는 별도 신규 personal-workspace-k3b-react-plan-late-finalize.spec.ts (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-react-plan-late-finalize.spec.ts`)다. 실제 `materializePersonalWorkspacePocAuthoring`으로 명시 `##` 구간마다 할 일 하나를 가진 원문을 만들고, 모든 구간이 실제 `poc-shadow` 편집 소유권을 가지는지 확인한 뒤 기존 상태 decoder를 통과한 fixture만 사용한다. 대형 Plan fixture에는 이웃 authored Flow 하나도 함께 넣는다.

초기 fixture 주입 이후에는 Plan 화면에서 각 구간의 `직접 입력`을 선택하고 실제 입력칸을 채운다. 100/101개의 소유권을 우회하거나 private React state를 변경하지 않는다. 변경한 구간 수를 테스트 수로 합산하지 않는다.

| 고유 검사 | 기대 결과 | 수정 전 결과 |
| --- | --- | --- |
| LargePlan-01 | 101개 구간 변경 저장, 정확한 overlay, 정상 성공 결과 | FAIL — client-side exception 전체 오류 화면 |
| LargePlan-02 | 101개 변경 취소, 저장 0, 취소 결과와 원래 초점 복귀 | FAIL — 상세 화면으로 돌아왔지만 취소 결과 누락·page error |
| LargePlan-03 | 100개 변경 저장, 정확한 overlay와 정상 성공 결과 | PASS |

모든 검사에서 저장 전 조작은 mutation 0이다. 초깃값 주입은 계측 시작 전 fixture 준비로 분리한다. `authoredFlows` 전체 JSON 값을 비교해 원문 CRLF, 실제 항목과 구간, 이웃 사본을 함께 보존하는지 확인한다. 운영 키는 각 새 브라우저 context의 sentinel 1개이며 실제 사용자의 프로필이나 운영 데이터를 읽은 검사가 아니다.

## 수정 전 실제 실행

- JSON (로컬 전용 근거: `../../../output/playwright/k3b-react-large-plan-baseline-20260906-01.json`), 로그 (로컬 전용 근거: `../../../output/playwright/k3b-react-large-plan-baseline-20260906-01.log`).
- UTC 시작 `2026-09-05T17:12:42.431Z`, 120,121.852ms. 등록 3개, 실행 3개, PASS 1 / FAIL 2 / skip 0 / flaky 0.
- 당시 3182 production은 root가 유지한 B2 서버다. 디스크 BUILD_ID `ZS-EN7cCIm0-Hzl7Czi4O`와 각 context가 실제 읽은 script URL을 attachment에 기록했다. 같은 시간 root가 새 Surface 소스를 작업했으므로 디스크 TSX 해시를 기존 서버의 제품 해시로 오인하지 않는다. 수정 전 배포 Surface의 root 확인값은 `CD1CAAB49C21A46C5C3FA43243FAFC28924E98D9BA59140725100634641E74DF`다.
- 수정 전 spec SHA-256 `15E3A0CF783B899E1F6DA635E080C024A9B618E474D325EC1718B25913B23741`.

| 실제 경로 | target API | 지원 API | page error | 최종 상태 |
| --- | ---: | ---: | ---: | --- |
| 저장 101 | 0 | 0 | 1 | 초기 state bytes와 동일 |
| 취소 101 | 0 | 0 | 1 | 초기 state bytes와 동일 |
| 저장 100 | 1 | 4 | 0 | revision 1회 증가, sectionTitles 정확히 100개 |

두 실패는 `invalid-personal-workspace-receipt:invalid-changes`다. source/이웃 사본은 3 context 모두 동일하고 운영 sentinel byte 불일치 0, 허용 prefix 밖 API 0, `clear()` 0, console error 0이다. 전체 API 5건은 100개 정상 저장의 target 1건과 저널 지원 4건이다. 준비한 변경의 receipt 생성에서 실패했으며, 정상 취소·정상 저장으로 판정하지 않는다. 저장의 전체 오류 화면에서 편집기 DOM이 사라지는 것은 정상 닫힘 증거가 아니다.

저장 101의 실패 화면 (로컬 전용 근거: `../../../output/playwright/k3b-react-large-plan-baseline-20260906-01/personal-workspace-k3b-rea-f6d0b--실제-101개-개인-구간-변경을-한-번-저장한다/test-failed-1.png`)을 직접 확인했다. 1440×900 화면 전체가 Next client-side exception 안내로 바뀐다. 취소 101의 별도 실패 화면 (로컬 전용 근거: `../../../output/playwright/k3b-react-large-plan-baseline-20260906-01/personal-workspace-k3b-rea-b2040-간-변경을-취소하면-저장-0·취소-결과로-복귀한다/test-failed-1.png`)도 직접 확인했다. 취소에서는 Flow 상세가 남아 있으며 전체 오류 화면은 아니다. 최초 중간 전달에서 저장 화면을 취소에도 확대해석한 문구는 이 비교로 정정했다. 두 trace와 page error를 보존했으며 하니스 오류로 분류할 근거는 없다.

## 첫 수정 빌드의 대형 Plan 3개 — 통과

첫 수정 production `kRHgiytNCXX5ItPRDSDUe`에서 같은 고유 3개를 재실행했다. 기존 assertion을 유지하고 성공/취소 결과의 `data-receipt-field`를 모든 표시 페이지에서 모아 정확히 100/101개이고 중복이 없는지 확인했다. 페이지 이동 API 0이다. 이 추가 표시 검사는 수정 전 첫 실행에 포함되지 않았으며 독립 테스트 수를 늘리지 않는다.

첫 수정 빌드 실행 (로컬 전용 근거: `../../../output/playwright/k3b-react-large-plan-fixed-20260906-01.json`)은 2 PASS / 1 FAIL이다. 101개 저장, 11페이지 전체 목록과 전용 Undo는 통과했지만 이후 새로고침 확인에 신규 하니스가 `personal-workspace-shell`이라는 없는 testid를 사용했다. 실제 `personal-workspace-poc-shell`로 정정했으며 제품 결함으로 세지 않는다.

그다음 동일 3개 정정본 (로컬 전용 근거: `../../../output/playwright/k3b-react-large-plan-fixed-20260906-02.json`)은 3/3 PASS, 94,862.656ms다. 101개 저장은 actual transition의 Undo 결과와 정확히 일치하고, 새로고침 뒤 exact bytes를 유지하며 API 0·과거 memory receipt 0을 확인했다. 세 context 합계 API 15건은 target 3건 / 지원 12건이고, source·이웃·운영 sentinel 불일치, forbidden, clear, console/page error 모두 0이다. baseline·첫 수정·정정본 실행 9회를 고유 9개로 합산하지 않는다.

## 작은 Plan 후속 경계 5개와 첫 통합 8개 결과

대형 Plan을 다시 수백 번 입력하지 않고 아래 경계는 구간 하나짜리 실제 authored Plan으로 나눴다. 총 고유 등록 수는 기존 3개와 후속 5개를 합쳐 8개다. 괄호 안 context 수는 테스트 개수가 아니다.

| 검사 | 첫 실제 판정 / 근거 | 후속 |
| --- | --- | --- |
| 04 원문과 같은 제목을 명시 override한 의미상 no-op | RED (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-semantic-noop-20260906-01.json`): 저장 0·state exact지만 편집기 1·noop 결과 0 지속 | root의 no-op 연결 수정 후 재검증 |
| 05 실패·retry·성공의 5 viewport (5 context) | 첫 4개 묶음 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-small-boundaries-20260906-01.json`): 5개 크기 모두 CTA full rect·48px·9점 hit·문서 가로 넘침 0, 그러나 live owner 2개 | 기존 source banner와 Plan 안내가 겹침. root는 Plan owner일 때만 banner live를 mute하는 좁은 수정 승인. 기대 1을 낮추지 않음 |
| 06 workspace/source 관측 ABA와 old DOM Undo (2 context) | 첫 실행 source fixture의 ISO timestamp 오류는 하니스. 정정 후 2개 guard 묶음 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-small-guards-20260906-02.json`) PASS | valid B→A 뒤 결과 0·replay mutation 0·A bytes exact |
| 07 전용 Undo rAF 대기 중 source 변경 (1 context) | 같은 timestamp 하니스 정정 후 위 guard 묶음 PASS | 실제 click의 첫 Undo rAF 하나만 보류, source storage event 후 해제. target mutation 0 |
| 08 dismiss/Undo 키보드 초점 (2 context) | 첫 4개 묶음에서 둘 다 `BODY`, 실제 기존 `my-plan-edit` opener 복귀 실패 | root의 기존 return point 복귀 수정 후 재검증 |

첫 작은 경계 묶음은 0 PASS / 4 FAIL이다. 05·08은 제품 경계 재현, 06·07은 `createPersonalWorkspacePocSourceCandidateStore`가 요구하는 UTC ISO timestamp에 offset 문자열을 넣은 하니스 오류였다. `new Date(NOW).toISOString()`으로 정정한 06/07은 2/2 PASS다. 별도 source fixture 쓰기는 native prototype 우회 계수로 기록하고 제품 API에 합산하지 않는다. current source bytes는 마지막 외부 fixture 값과 비교한다.

05의 첫 다섯 크기 실패/성공 PNG 10개를 직접 읽었다. 390/375 성공 결과의 긴 전후 텍스트가 감기고 두 행동이 보인다. 844 실패 화면은 내부 문서 스크롤로 오류 안내가 위쪽에 있을 수 있지만 retry는 가려지지 않는다. 이 단계에서 오류·입력·전체 결과가 항상 한 viewport에 동시에 있다고 주장하지 않는다. 현재 React 결과 영역은 개인공간 헤더 아래의 기존 receipt 자리다. Flow/결과 제목 가까운 배치 권고나 standalone과 위치가 완전히 같다고 확대하지 않는다.

그 뒤 production `YEESJ5MpMHj11FORRgDPb`, Surface `CE825646BB51CD27ECFD5759420AFB71B8126BF6DE8F8707611CFDC0EEBEA586`에서 8개 전체 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-20260906-01.json`)를 실행했다. 8/8 PASS, 139,321.646ms이며 04 no-op·05 one-live·08 초점이 모두 GREEN이다. 14개 격리 context의 API는 95건(target 24 / 지원 71)이며 target 호출에는 의도한 quota throw 5건이 포함된다. 외부 storage fixture 조작 5건은 제품 API와 분리했다. source·외부 fixture 이후 source·운영 sentinel 불일치, forbidden, clear, console/page error는 모두 0이다.

이후 root가 no-op의 await 뒤에도 같은 private binding/attempt/requestId인지 확인하는 방어 코드를 추가했다. 그 변경은 이 8/8 실행 후이며 별도 실제 RED에서 나온 수정으로 기록하지 않는다. 아래 최종 빌드에서 8개를 모두 재실행했고 PNG 10개도 새로 직접 확인했다.

## 별도 late-finalize 3개 — 8개와 합산 방식 분리

신규 late-finalize spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-k3b-react-plan-late-finalize.spec.ts`)은 작은 실제 authored Plan의 별도 고유 3개다. private React state를 바꾸지 않고 실제 target 쓰기와 recovery/commit-marker 정리가 끝난 후의 target 읽기만 계측한다.

| 검사 | 주입과 확인 | 첫 실행 |
| --- | --- | --- |
| LateFinalize-01 | instrument 읽기 1 통과 뒤 finalize 읽기 2만 throw. 확정 candidate를 다시 쓰거나 롤백하지 않고 결과를 생략한 뒤 reload exact | PASS |
| LateFinalize-02 | 같은 읽기 2에서 외부의 유효 target B를 native fixture로 저장/관측. 이전 candidate 결과·Undo를 만들지 않고 reload B 보존 | PASS |
| LateFinalize-03 | 실제 Undo 쓰기·정리 뒤 confirmed 읽기 1에서 source event. Undo는 확정되지만 상세 결과를 생략하고 success 안내를 남김 | 하니스 문구 기대 오류 |

첫 3개 실행 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-late-finalize-20260906-01.json`)은 2 PASS / 1 FAIL이다. 마지막 실제 안내는 `data-status=success`이며 “되돌리기는 저장했지만 화면 기준이 바뀌어 변경 목록을 표시하지 않았어요.”였다. 테스트가 ‘완료’라는 단어만 기대한 것이 잘못이었다. 의미를 낮추지 않고 success 상태와 실제 저장 사실 문구를 확인하도록 정정했으며, ‘저장 중’에 남지 않는 기준도 유지한다. 이 실패를 제품 결함으로 세지 않는다. 실제 단계 계수는 세 검사 모두 설계 지점에 도달했다.

이 3개는 큰 Plan 8개의 하위 assertion이나 재실행이 아닌 별도 고유 검사다. 아래 최종 빌드에서 각각 PASS를 확인했다.

## 최종 동결 빌드 — 8개와 별도 3개 모두 통과

실제 production BUILD_ID는 `mRCFjc6SZUKFxn3lHvG3a`다. 3182 서버에서 두 묶음을 순차 실행했다. 첫 묶음의 14개 context에서 기록한 시작·끝 제품 해시는 모두 동일하다. 두 번째 묶음도 같은 빌드와 Surface 해시를 기록했다.

| 묶음 | 고유 등록·최종 실행 | PASS / FAIL / skip / flaky | 시간 | 최종 근거 |
| --- | ---: | --- | ---: | --- |
| LargePlan-01~08 | 8개 | 8 / 0 / 0 / 0 | 126,450.646ms | JSON (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02.json`), 로그 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02.log`) |
| LateFinalize-01~03 | 3개 | 3 / 0 / 0 / 0 | 9,499.209ms | JSON (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-late-finalize-freeze-20260906-02.json`), 로그 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-late-finalize-freeze-20260906-02.log`) |

UTC 시작은 각각 `2026-09-05T17:49:34.374Z`, `2026-09-05T17:51:44.398Z`다. 최종 고유 검사는 11개다. 이 문서의 baseline부터 최종까지 실제 시도는 `3+3+3+1+4+2+8+3+8+3=38회`이며, 반복 실행을 38개 고유 검사로 세지 않는다. viewport 5개·100/101개 입력·페이지 전수·context 수도 고유 검사 수에 더하지 않는다.

| 최종 동결 대상 | SHA-256 |
| --- | --- |
| Surface | `D472C2DD274C5E371FF6329000BD77D56D2AE90D186942C7F03A3D190389F6C7` |
| LargePlan 8개 spec | `D5BD0700A8120ED9E178E54B772E171EA34B529CEAE1BDB36AC9747CD63EA57B` |
| LateFinalize 3개 spec | `25BBBAB98E62E5B429D2EFE0BD4087E2492853CECD528BF5FEDB00BFDFCA2D3D` |

### 저장 경계 집계

| 최종 묶음 | 격리 context | 제품 API | target / 저널 등 지원 API | 별도 외부 fixture 조작 | 원문·운영 bytes 불일치 | prefix 밖 / clear / console·page error |
| --- | ---: | ---: | --- | ---: | ---: | --- |
| 8개 | 14 | 95 | 24 / 71 | 5 | 0 | 모두 0 |
| late 3개 | 3 | 20 | 4 / 16 | 2 | 0 | 모두 0 |

이는 Storage 메서드 호출 수다. 8개의 target 24건에는 의도한 quota throw 5건과 복구 쓰기도 포함되므로, 사용자 변경 24회 또는 성공 저장 24회라고 해석하지 않는다. fixture 준비는 계측 시작 전이며, 외부 target/source 조작은 native 메서드로 만든 테스트 사건으로 제품 호출과 분리했다. 외부 source 변경을 주입한 경우 마지막 외부 fixture의 exact bytes와 비교한다. 17개 context 각각 운영 sentinel 1개의 전후 bytes를 검사했으며 실제 사용자 운영 프로필 검사는 아니다.

late 01/02는 첫 target 저장과 recovery/commit-marker 제거를 관측한 뒤 첫 읽기를 통과시키고 두 번째 읽기에만 각각 throw/유효한 외부 target B를 주입했다. late 03은 두 번째 target 쓰기인 실제 Undo와 저널 정리를 확인한 뒤 첫 읽기에 source 변경을 주입했다. 세 사건 모두 `cleanupObserved=true`, `injected=true`이며 읽기 계수는 각각 2·2·1이다. 늦은 오류에서 저장된 candidate/B/Undo bytes는 실제 reload 이후에도 유지된다. 상세 결과를 생략한 Undo도 성공 안내를 남기며 저장 중 상태에 머물지 않는다.

### 최종 5개 viewport의 직접 시각 확인

아래 10개 PNG를 모두 직접 열어 확인했다. `fullPage:false`이며 캡처 전후 source·state·상태가 같은지 검사했다. 자동 측정은 retry/전용 Undo/닫기 버튼의 전체 rect, 48px 높이와 9점 hit, 문서 가로 넘침 0을 검사한다. 실패와 성공의 live owner는 각각 1개다. 모든 편집 정보가 한 화면에 동시에 보인다는 기준으로 확대하지 않는다.

| viewport | 최종 캡처 | 직접 확인한 범위와 한계 |
| --- | --- | --- |
| 390×844 | 실패 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/failure-390x844.png`), 성공 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/success-390x844.png`) | 실패 안내·retry가 보이고, 성공의 긴 전후 값은 감겨 표시된다. Undo/닫기가 겹치지 않는다. 아래 편집 필드는 스크롤이 필요하다. |
| 375×812 | 실패 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/failure-375x812.png`), 성공 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/success-375x812.png`) | 좁은 폭에서도 결과·핵심 버튼을 읽을 수 있다. 스크롤된 상단 헤더와 모든 입력의 동시 노출은 요구하거나 통과로 주장하지 않는다. |
| 844×390 | 실패 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/failure-844x390.png`), 성공 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/success-844x390.png`) | 짧은 화면의 편집 내용은 내부 스크롤을 사용한다. retry 및 결과 Undo/닫기의 가림은 없다. 결과 제목·오류·모든 입력의 동시 노출은 미보장이다. |
| 1024×768 | 실패 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/failure-1024x768.png`), 성공 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/success-1024x768.png`) | 오른쪽 편집기 retry와 오류를 읽을 수 있다. 구간 필드 하단은 스크롤 대상이다. 성공 전후 값은 두 열로 감기고 두 버튼이 보인다. |
| 1440×900 | 실패 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/failure-1440x900.png`), 성공 (로컬 전용 근거: `../../../output/playwright/k3b-react-plan-final-freeze-20260906-02/personal-workspace-k3b-rea-e54c9-e-owner를-다섯-viewport에서-확인한다/success-1440x900.png`) | 오류·구간 입력·retry가 보이며 성공 결과의 긴 값과 행동을 읽을 수 있다. 기존 편집 opener의 키보드 초점 표시도 확인했다. |

남은 배치·표현 차이는 유지한다. 결과는 기존 개인공간 헤더 아래 receipt 자리에 있으며 Flow 제목 바로 옆은 아니다. 원본 정보의 기술적 출처 slug와 자동 원문 변경 배너의 존재 자체도 이번 수정 범위가 아니다. Plan 소유 시 배너 live만 억제하는 확인 결과를 배너 제거 또는 출처 UX 완료로 표현하지 않는다. C1 출처 표현과 C3 결과 배치 검토는 별도 후속이다.

## 실행하지 않은 범위

- 이 신규 두 파일은 desktop Chromium HTTP React UI를 다룬다. 100/101개 전수 편집은 1440×900, 작은 Plan은 390×844·375×812·844×390·1024×768·1440×900이다. standalone, native drag, 전체 source origin 조합은 해당 별도 QA의 범위다.
- 실제 Android Chrome·iOS Safari, 실제 IME·보조공학, 관찰 사용자 검증: 미실행. 관찰 사용자 0명.
- 같은 Flow의 실제 적용된 source Undo와 Plan Undo 공존 fixture는 아직 이 신규 파일에서 확인하지 않았다. 현재 source-bound 지원을 우회해 통과를 만들지 않는다.
- 전체 npm test, production build, 기존 회귀의 결과는 root 별도 실행 기록을 사용한다. 이 신규 8개와 별도 3개에 합산하지 않는다.
- 이 작업에서 제품·기존 검사·사용자 HTML을 변경하지 않았다. commit, push, PR, Preview, Production 배포를 실행하지 않았다.
