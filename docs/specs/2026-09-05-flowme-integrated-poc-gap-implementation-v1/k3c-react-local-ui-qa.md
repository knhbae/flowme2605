# K3-C C3 React 로컬 UI 검증

2026-09-06. 이 문서는 React C3의 한정된 실제 브라우저 표본과 기존 기능 회귀를 정리한다. 전체 제품·모든 화면·모든 요구사항 완료 보고가 아니다. 제품·빌드·서버·기존 검사 파일은 root가 소유했으며, 이 검증 담당자는 신규 spec 2개와 근거만 작성했다.

## 1. 최종 판정과 실행 경계

- 최종 build `lLXF4heLSEAJg53NdomoU`: **8/8 PASS**, 1 worker, retry 0. 신규 C3 4개 + 추가 표본 2개 + 기존 EX01/HS01 2개다. 15 fresh Chromium context와 실제 동일 origin 보조 문서 2개를 사용했다.
- 변경 전 비교 창의 25개 44px 표본은 최종 48px 이상이다. 별도로 발견한 하위 체크 ‘값 선택’ 버튼도 54.484×44에서 54.484×48로 바뀌었다. 최종 클릭 표본은 **62개·558 hit**, viewport 밖·실제 가림·가로 넘침 0이다. 앱 전체 버튼 수가 아니다.
- 기본 `/my`, 잘못된 query, 정확 PoC에서 전역 탐색 DOM/computed가 각각 해당 변경 전 표본과 일치했다. 전역 action/focus는 파랑을 유지하고 로컬 primary/hover/선택/focus만 청록을 사용한다.
- 닫힌 정상 비교의 중복 banner는 보이지 않고 기록 버튼은 남는다. 같은 변경의 결정을 다시 확인하고 source 적용·전용 Undo를 각각 한 번 실행했다. 실패·stale 사유와 재확인 행동은 보존된다.
- 기존 C2 9개는 직전 C3 build `Q8HBRsiCiZ4h0PzBrgp_y`에서 **9/9 PASS**다. 마지막 변경은 CSS subcheck selector 1개와 기존 integration 검사의 비동기 선택 대기였지만, 이 9개를 최종 lLXF에서 실행했다고 쓰지 않는다.

최종 결과: 8개 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-final-freeze-20260906-08.json`), 실행 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-final-freeze-2026-09-06T07-15-23-600Z.log`). 07:15:23–07:17:12 UTC에 실행했다. 이전 C2 회귀: 9개 JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-source-practice-c3-regression-20260906-10.json`), 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-source-practice-c3-regression-2026-09-06T07-03-27-427Z.log`).

## 2. 무엇을 검증했는가

| 표본 | 실제 검사 | 판정 범위 |
| --- | --- | --- |
| L01 | `/my`, `/my?personalWorkspacePoc=invalid`, `/my?personalWorkspacePoc=v1`의 전역 nav DOM·computed·토큰을 각각 before JSON과 exact 비교 | 3개 route·1440×900. 기본 화면 전체의 시각적 완전 동등성이나 운영 데이터 접근 검사가 아님 |
| L02 | normal·hover·키보드 focus·selected·disabled·danger·failed의 실제 foreground/background/outline/ring/font/opacity | 로컬 승인 mapping, 불투명 텍스트 대비 4.5 이상·focus strong/white 3 이상. danger/failed 의미색은 before 값과 일치 |
| L03 | 390×844,375×812,844×390,1024×768,1440×900의 Plan 진입/취소/저장, guide start, review close/nav/radio label/later/apply/retry, record | 5×12=60개. 클릭 대상의 width와 height 둘 다 48 이상. 원·글자 대신 실제 label/button 영역 측정 |
| L06 | 비교 없음→명시 연습→결정→보류→닫힌 표시→동일 변경 재열기→source 적용→전용 Undo | 정상 중복 banner 비가시, 기록1·결정 보존, source Undo1. 적용/Undo 외 읽기·닫기 0쓰기 |
| L02-W | 기존 RC06 실제 callback의 drift/관측 ABA에 warning computed 관측만 추가 | 두 fresh context·실제 peer StorageEvent. warning/disabled 경계 유지, 명시 스크롤 후 경고문 전체 표시 |
| L03-S | 기존 integration599의 실제 callback 전체를 실행하며 subcheck 클릭 구간만 rect·즉시/1RAF/settled 선택 관측 | 원형 네 결과·16속성·의존 pair·near-miss와 원문/운영 경계 assertions 유지. 동일 ‘표 확인하기’ 기대·focus API0 |
| EX01 | 기존 확인 취소/Escape/실제 Back 세 왕복 | 같은 A textarea·selection·사전 관측한 native Undo 결과 보존. 새 문서나 상세 route에서 native Undo 보장을 추가하지 않음 |
| HS01 | 기존 미적용 장소 helper→검색/확인 취소 3경로→작성 복귀→기존 helper 적용 | 같은 owner/값, 검색 중 hidden+inert, 검색 구간0쓰기, 원래 항목에 native 삽입1·draft 쓰기1 |

기존 6323 C2 spec과 EX01/HS01 원본은 수정하지 않았다. 추가 wrapper는 실제 기존 테스트 선언과 fixture를 AST로 읽는다. 제품 callback·React private state·저장 권한을 복제하거나 대체하지 않는다. integration의 즉시 선택 기대는 root가 원형에서도 같은 문자열의 `expect.poll`로 고쳤다. 이 변경은 실제 `focusPropertyValue`→`pendingSourceFocus`→effect의 RAF 초점 복귀를 기다리는 하니스 보정이다.

## 3. 색과 접근 가능한 클릭 영역

| 실제 상태 | 최종 foreground / background | 계산된 대비 |
| --- | --- | --- |
| normal primary | white / `#087f73` | 4.891 |
| hover primary | white / `#066a61` | 6.478 |
| selected change | `#066a61` / `#e5f2ef` | 5.638 |
| keyboard focus outline/ring | `#066a61`, 실제 outline `3px solid` | 흰 바탕과 6.478 |
| failed reason | `#8b1f17` / `#fff0ee` | 8.217 |
| danger confirm | white / 실제 기존 rose `rgb(190,18,60)` | 6.285 |
| stale warning | `#72500f` / `#fff5d8`, border `#986209` | 6.727 |

수치는 실제 computed RGB가 정해진 값과 일치함을 먼저 확인한 뒤 계산했다. disabled는 native 비활성·opacity 0.6·의미색을 확인했지만, opacity 합성 후 픽셀 대비를 측정하지 않았다. 이를 활성 텍스트 대비 PASS에 포함하지 않는다. 보조기술·실제 브라우저 확대·실기기 접근성 인증이 아니다.

고정 drawer의 조상 `overflow:clip`을 모두 가림으로 취급하지 않는다. 실제 fixed 조상과 상위 transform/perspective/filter/contain/will-change/content-visibility를 기록해 viewport-fixed 여부를 판단한다. drawer 내부 scroll clip은 계속 검사한다. raw 조상 rect·full viewport rect·9점 hit는 별도 근거로 남겼다.

하위 체크 추가 표본은 최종 `54.484375×48`, full=true·9 hit=true다. 즉시/1RAF 후/settled 선택은 이번 실행에서 모두 `표 확인하기`(34..40)였고 textarea focus=true·원문과 draft exact·클릭 API0이었다. root의 이전 즉시 빈 선택 실패를 이번에도 재현했다고 쓰지 않는다.

## 4. 저장·문서·오류 집계

논리 저장 1건과 Storage API 호출 1회를 혼용하지 않는다. quota 시도도 API 기록에는 포함되지만 성공 저장이 아니다. fixture 설치와 peer 변경도 제품 호출에서 뺐다.

| 최종 lLXF 표본 | 기록된 제품 API | fixture / 별도 범위 |
| --- | --- | --- |
| C3 기본4, 10 context | 57 = set36 + remove21. 작성 준비49 + source8(정상 적용/Undo2, quota6) | fixture mutation0. context별 운영 sentinel 설치는 probe 전 테스트 준비 |
| warning 추가1, 2 context·peer2 | 작성 준비14, 이후 source 제품 쓰기0 | peer source 변경3(drift1, ABA2) |
| EX01 기존1 | draft set7: 작성4 + 사전 Undo1/Redo1 + 왕복 후 Undo1 | 세 검색 왕복0쓰기·운영 sentinel exact |
| HS01 기존1 | draft set5: 작성4 + 마지막 helper 적용1 | 세 검색 왕복0쓰기·native 삽입1·운영 sentinel exact |
| subcheck 추가1, 1 context | 초점 클릭 구간0 | 원형 전체 API의 총수는 attachment로 별도 집계하지 않음. 원형의 PoC 밖0/운영 exact/개인 workspace 불변 assertions는 실행 |

따라서 최종8 중 **집계 가능한 부분은 제품83 API와 peer fixture3**이다. 이것을 최종8 전체 API 총수라고 부르지 않는다. C3+warning의 12 context는 product71(set44/remove27), source8, quota6, noWrite9구간, 오류·prefix 밖·clear0이다. EX01/HS01에는 추가로 실제 사용자 경로를 모사한 12 draft set이 있고 오류·외부 요청·금지 쓰기0이다. subcheck 원형 전체 호출수는 미집계로 남긴다.

직전 Q8H C2 9개는 별도 16 context·실제 peer 문서3, 제품130(set80/remove50, quota6 포함), fixture7이다. source API13을 모두 성공 적용이라고 부르지 않는다. 구성은 정상 source 반영6, foreign X 직전 candidate 시도1, quota6이며 X 주입은 fixture다. noWrite14구간, 오류·prefix 밖·clear0이다. 실제 Back에서 두 source RAF는 다른 문서로 이탈하며 소멸했다. 폐기된 옛 callback을 강제 실행하지 않았고, same-document late callback은 별도 기존 실제 함수 회귀의 근거이지 이 브라우저 실행의 결과가 아니다.

## 5. 직접 확인한 최종 화면

최종 build의 아래 ready·실패 PNG 10장을 각각 직접 확인했다. 390/375는 하단 sheet, 1024/1440는 오른쪽 drawer다. 작은 높이에서는 모든 필드를 한 번에 보여 주지 않고 내부를 스크롤한다. 844×390 실패 화면은 오류문·변경 탐색·재시도/닫기가 보이며 원문 값은 아래에 있다. 이를 화면 깨짐이나 모든 값 동시 노출로 오기하지 않는다. 위험/경고색은 청록으로 덮이지 않았다.

| viewport | ready | failed reason |
| --- | --- | --- |
| 390×844 | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-390x844-ready-48.png`) | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-390x844-failed-reason.png`) |
| 375×812 | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-375x812-ready-48.png`) | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-375x812-failed-reason.png`) |
| 844×390 | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-844x390-ready-48.png`) | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-844x390-failed-reason.png`) |
| 1024×768 | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-1024x768-ready-48.png`) | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-1024x768-failed-reason.png`) |
| 1440×900 | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-1440x900-ready-48.png`) | PNG (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-617d0-y-48-inventory-and-clipping/L03-1440x900-failed-reason.png`) |

닫힌 기록 화면 (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-d1e9e-nd-owned-Undo-stay-distinct/L06-closed-record-banner.png`), 하위 체크 48px (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-80059-ueued-selection-observation/L03-subcheck-before-focus.png`), 실제 ABA 경고 (로컬 전용 근거: `../../../output/playwright/react-local-ui-final-freeze-20260906-08/personal-workspace-k3c-rea-7bdaa-s-in-drift-and-observed-ABA/RC06-aba-warning-computed.png`)도 직접 확인했다. 닫힌 정상 화면에는 같은 비교를 여는 큰 banner가 없고 기록 버튼만 남는다. 실패 화면의 banner는 이유를 남기기 위한 승인된 예외다.

## 6. 처음 실패한 검사와 후보 이력

| 실행 | 실제 결과 | 구분 |
| --- | --- | --- |
| PK9 before01 | 2PASS/1FAIL/1미실행 | Plan 취소 결과를 닫지 않고 C2 시작. 제품이 정상 차단한 하니스 누락. 실제 결과 닫기+부재 확인을 noWrite 안에 추가 |
| PK9 before02 | 2PASS/1FAIL/1미실행 | viewport-fixed drawer 바깥 local main을 실제 clip으로 오판. raw rect와 9hit는 보존하고 containing-block 판정을 보강 |
| PK9 before03 | 3PASS/1FAIL | 5viewport60측정/25개44px 확보. L06 재열기 때 첫 미결정이 선택됐는데 이전 첫 변경의 radio를 바로 검사. 원형 RC02처럼 same nav.first를 명시 |
| PK9 record04 | L06 단독1PASS | 이전3PASS와 합쳐 최초4PASS라고 표현하지 않음 |
| Q8H final05 | C3 4/4PASS | 첫 C3 표현 후보. 별도 subcheck 버튼은 이 60표본에 없었음 |
| Q8H additional07 | 추가2/2 측정 PASS | warning 대비6.727, subcheck54.484×44 미달. 즉시/settled 선택은 모두 정상. 48적합 PASS가 아님 |
| lLXF final08 | 8/8PASS | CSS subcheck selector1 보완 후 final48 gate 포함. 원형 integration은 같은 문자열의 async poll만 root가 수정 |

before 근거: 01 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-before-20260906-01.json`), 02 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-before-20260906-02.json`), 03 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-before-20260906-03.json`), L06 단독04 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-before-record-20260906-04.json`), Q8H final05 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-final-20260906-05.json`), 추가07 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-local-ui-additional-before-20260906-07.json`). 첫 실패 파일·로그는 덮지 않았다. 원형/helper SHA를 처음 잘못 적은 list 실패 및 callback 제목 prefix 충돌은 등록 전 하니스 오류이며 실제 제품 실행 수에 합산하지 않았다.

## 7. 파일·해시·남은 범위

| 최종 파일 | SHA-256 |
| --- | --- |
| Surface | `B0ABB3B15671C84BCC82ADEA874DA7274658CF2CE6C8F01C87BE3A347623ED33` |
| SourceUpdateReview | `AF9F336ED19FF6793671B62E80338C1B50B69F5A08750E30EF46B7FA53C80EAE` |
| ProductShell CSS | `DDC7B4465D47E11F7173E1B8A7FD99C475EC3D5B37DFDD9A142AA82DCB60AC17` |
| 신규 local-ui spec | `BFAC7AA67BC5FF4D95146ADA2FFD720F0552299B77492AC16305964FB524A1C3` |
| 신규 additional spec | `DFAC756AA802D407A9E8ED1CA7830979799EC28170E5C75E65BF2361829188DA` |
| 기존 C2 spec, 변경0 | `6323ABDE4A39855B3F9E3AAFF80AD12710BFC320F67E054901CF2086E6E81A67` |
| 기존 integration, root async poll 수정 | `D93442A4E61E8B4061E23AD089B6A8B9678904DC20B7AC6A7BA8E53E741F4F14` |

신규 두 spec의 targeted strict diagnostics0. 실행은 `.next/BUILD_ID`, Surface, 실제 소비자 파일·global CSS/PlatformNav·기존 fixture의 전후 SHA를 고정했다. 변경 전 global DOM/computed 비교는 PK9 before03의 동일 route attachment를 사용한다.

C3 L05 중 작성/검색 확인 취소와 helper 복귀는 EX01/HS01로 확인했다. 상세 방문의 dirty editor·pending·recovery·source Undo 경쟁 전체를 이 두 검사로 대신하지 않는다. 다른 source consumer 전수 색상, disabled 합성 픽셀 대비, 실제 브라우저 텍스트 확대, 보조기술·실기기·사람 관찰은 이 문서의 완료 범위가 아니다. Q8H C2의 키보드 확대는 실제 확대가 관측되지 않아 NOT_RUN이며 CSS zoom2와 reduced-motion simulation만 별도 근거다.

개발1의 개인 편집/명시 Undo, 개발2의 같은 원문·helper owner/비동기 선택, v4.1 및 후속 통합 UX의 로컬 색·48px·전역 구분을 함께 보호한 표본이다. 모델·원문 schema·운영 날짜/포함 정책은 바꾸지 않았다. 이 담당자의 commit/push/PR/Preview/Production0, 실제 기기 NOT_RUN, 관찰 사용자0이다.
