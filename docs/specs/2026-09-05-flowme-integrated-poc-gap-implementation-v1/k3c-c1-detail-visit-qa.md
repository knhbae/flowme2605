# C1-c2 실제 상세 방문 — 구현과 검사 원장

2026-09-06. [구현 계획 C1](../2026-09-05-flowme-integrated-poc-ux-audit-v1/implementation-plan.md#10-k3-c--선택부터-첫-실행까지-자연스럽게-연결)의 실제 상세 연결은 아래 정한 범위의 구현·검사를 마쳤다. C1-c1의 원문 보호 검사와 별개이며, 전체254부모/424원자 충족률은 다시 계산하지 않았다. 최종 app D7A3와 HTML615418의 HTTP7/7·기존 회귀33/33·작성30/30이 통과했다. 조작용 두 HTML은 **615418E7 / 각1,905,353bytes**이며 실제 file에서 완료·Undo·원문 복귀·reload 검사도2/2 PASS다. 다음 단계는 C2의 명시적 원문 비교 연습 진입이다.

## 요구와 현재 반영

| 원본·요구 | 이전 차이 | 반영 및 실제 근거 | 아직 확대하지 않는 범위 |
| --- | --- | --- | --- |
| v4.1 네 saved origin·exact identity | standalone에서 검색 뒤 개인공간 행동은 별도 읽기 요약에만 도달 | 기존 Flow 상세 renderer·완료·편집·이동을 재사용. 네 origin의 full ref로 상세 왕복 DV01 PASS | 같은 제목의 모든 충돌·휴지통·모든 authored capability 전수 검사는 아님 |
| 개발1 Item→Plan 단계·미저장 보호 | 실제 상세 연결 뒤에도 기존 단계 소유권이 유지되어야 함 | dirty Plan/child→Escape/계속→부모에만 반영→실제 Back→명시 버리기 DV03 PASS. staged 저장0 | 모든 최종 Plan 저장 오류·복구 조합은 기존 회귀와 추가 검사로 구분 |
| 개발2 작성 A·선택·native Undo | 상세 연결을 위해 작성 화면을 재생성하면 원문 편집 이력을 잃을 위험 | 같은 textarea를 연결된 hidden/inert 상태로 유지. 네 origin 각각 방문 전후 native Undo/Redo DV01 PASS | React의 route unmount 왕복을 같은 DOM/native 이력 보존으로 부르지 않음 |
| v4.1 개인 실행 날짜·폴더·완료·Undo | 읽기 요약에서 실행 불가 | 실제 완료/다시 열기, Item 날짜·Flow 폴더 이동과 Undo DV02 PASS. source/A/library/이웃 불변 | 모든 drag/기간/순서 조합이 새 방문 경로에서 통과한 것은 아님 |
| 개발1·개발2 복귀 시 선택의 유효성 | 변경 뒤 이전 preview를 최신 정보처럼 재사용하면 안 됨 | 무변경이면 복원, 자체 성공/Undo 뒤에는 옛 preview 폐기 및 명시 재조회 DV01/02 PASS | 외부 ABA·quota·reload는 첫4에 미포함, 별도 확장 검사 진행 |
| 미저장 닫기·pending 우선권 | React dirty 확인창에서 세 번째 Back이 입력을 없앰. 완료 대기 중 이탈 뒤 늦은 저장 발생 | pendingClose의 history 재보강, 종료된 화면 owner의 미실행 callback 권한 회수. 실제 React DV-S01/S02 최종2/2 PASS | 이미 commit한 거래 rollback0. source/Plan/복구 등 모든 writer를 바꾼 것이 아님 |
| v4.1 크기·키보드·접근 | 상세 방문의 주 행동이 실제 화면에 도달 가능한지 확인 필요 | 다섯 viewport에서 선택 control full rect·9점 hit·키보드·가로 넘침0 확인 | 높이44px 검사는48×48 요구 충족이 아님. 측정40회 중36회 미충족은 C3 개선 항목 |

## 수정 전 재현과 수정 후 판정

처음 두 baseline은 [설계 §11](./k3c-c1-detail-visit-design.md#11-최초-baseline2의-실제-판정)에 보존했다. standalone CD6 실제 상세 부재1FAIL, React 기존 완료→Back→재조회1PASS였다. 그 baseline의 기대값·해시·실패 JSON은 바꾸지 않았다.

### React: 실제 입력 손실과 지연 저장

수정 전 Workspace Surface `D472C2DD`에서 DV-S01의 세 번째 Back이 dirty 입력을 없앴다. DV-S02는 첫 실행의 숨은 검색 입력에 대한 잘못된 visible 기대를 정정한 뒤, 실제 Web Lock 대기→Back→해제에서 늦은 state1+보조4 API를 재현했다. 실패 뒤 도달하지 못한 assertion은 PASS로 세지 않는다.

수정 파일은 `PersonalWorkspacePocSurface.tsx`이며 현재 `B4546C85`다. normal 완료 writer는 그대로 두고, 시작 화면의 owner/href가 끝난 미실행 거래만 중단한다. 이미 동기 commit된 거래는 되돌리지 않고 늦은 화면 발행만 막는다. dirty 확인 중 반복 Back은 기존 확인창을 보존한다.

- 실제 callback 단위 검사: history4/4, write owner5/5 PASS. 후자는 실제 모델·validator·writer와 결정적 scheduler를 썼으며 mounted React/실제 Web Lock 시험은 아니다. 이전 exact backup에서는 각각2FAIL/5FAIL을 보존했다.
- 관련 모델·화면 회귀8파일270/270 PASS. 이 숫자에는 history4가 포함되며 write owner5는 별도 실행이다.
- strict0·production build PASS: BUILD `WzfpqkxEvDZuX_tb9EN1u`, Authoring `9738125B` 그대로다.
- 첫 수정 후보 브라우저는1PASS/1하니스 timeout이었다. 완료 대기 해제 뒤 쓰기0 assertion까지 통과했지만, 모바일 preview에서 숨은 ‘작성으로 돌아가기’를 바로 눌렀다. 실제 ‘목록으로’ 경유만 보완했고 기존0쓰기 기대는 유지했다.
- 최종 실제2/2 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-detail-visit-safety-resume-harness-20260906-02.json`): 6.31초, 3 fresh context+격리 lock 제어문서1, API17=set15/remove2. 원문 준비12와 정상 완료5이며, 이탈 후 지연 API/결과/거래 표시0이다. source·운영 bytes·8 source 해시·BUILD 불변, 오류·remote·금지 호출0. 실제 기기 시험이 아니다.

기존 React 선정 회귀는 33실행/32PASS/1timeout (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-react-existing-20260906-01.json`)이다. contextual-result18은 전부PASS다. R07의 실패 입력 검색 시험은 C1-c1에서 승인한 ‘원문 저장 실패 시 검색 진입 차단’과 옛 ‘실패해도 검색이 열린다’ 전제가 충돌했다. trace는 숨은 검색 입력 fill에서 멈췄고, PNG의 같은 원문·차단 안내를 root와 독립 검토자가 확인했다. 이후 두 출구 assertion은 NOT_RUN이다. 기존 시험을 고치거나 전체33PASS로 표시하지 않았다. 변경된 보호 계약 자체는 [C1-c1 최종 검사](./k3c-c1-react-authoring-safety-design.md#16-최종-후보-판정과-다음-단계)와 구분한다.

### standalone: 실제 상세 연결의 첫4

app `A3D7AE40`, UI `65BF4F8E`, memory HTML `3AE6C53E`/1,905,234bytes에서 실행했다. 사용자 두 HTML `CD6FC4`/1,892,656bytes는 그대로였다. 순수 함수/VM 신규16+기존89=105PASS, 기존 Plan VM15는 의존성 누락5FAIL을 보존하고 fixture에 새 변수·actual selector 함수를 넣은 뒤15/15PASS다. 기존 기대값은 삭제하지 않았다.

첫4 최종 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c2-standalone-detail-first4-final-20260906-01.json`)은4등록/4실행/4PASS, 29.42초, 11 fresh HTTP context다. 최초3PASS/1FAIL은 375px의 root scrollport를 일반 ancestor로 중복 잘라 계산한 하니스 오류였다. viewport clip·나머지 ancestor clip·9점 hit는 그대로 두고 root 중복만 제거했다. 그 뒤 DV04 단독1PASS와 최종4PASS를 각각 남겼다.

| 등록 검사 | 실제 context와 결과 | 저장 계측 |
| --- | --- | --- |
| DV01 네 origin 무변경 왕복 |4context. 같은 A/selection, 방문 전후 native Undo/Redo | A 입력28API/4byte변경, native16/16. 검색·선택·왕복0 |
| DV02 실행·날짜·폴더·Undo |1context. 명시 재조회까지PASS | A 입력7API/1변경, workspace6논리성공/24API·24변경 |
| DV03 dirty Plan/child |1context. 실제 Back·Escape·계속·버리기PASS | A 입력7API/1변경, staged/취소/왕복0 |
| DV04 다섯 viewport |5context. 완료/Undo·이동 취소·키보드·복귀 | workspace10논리성공/40API·40변경 |

합계122API/86실제 byte변경이다. 같은 값을 재기록한 A 입력을 성공 변경으로 부풀리지 않는다. 읽기·staged·취소0, forbidden/invalid writer/console/pageerror0, 보호 key/value와 source/하니스/userHTML 해시 전후 exact다. 기록된16workspace 논리성공은 완료/이동/Undo 동작 수이며16개 독립 테스트가 아니다.

## 화면 평가

다섯 크기는390×844,375×812,844×390,1024×768,1440×900이다. 각8개 control의40회 측정은 full rect/9점/기존 높이44px 접근 기준PASS이며 heading5회는 버튼 집계에 넣지 않았다. `48×48` 미충족36회는 원본 UI 충족률에 더하지 않는다. 짧은 가로 화면은 스크롤한 실제 행과 Undo가 보이며 모든 주요 행동이 동시에 보인다는 판정은 아니다.

독립 검토자는 최종 PNG17개를 직접 확인했다. root는 최종390/844/1440 Undo와 초기375 실패 PNG, React 복귀 PNG를 직접 대조했다. 제품 조작·화면 평가·자동 기하 검사와 실제 기기 검사를 구분한다. C3에는 버튼 크기, 상단 가로 탐색의 좁은 표시, 상세 반환부의 여백·중복 탐색 정보 검토를 넘긴다. 기존 전역 CSS/token/nav는 바꾸지 않았다.

## 남은 작업과 공개 상태

source-reopen 복구 입력 폐기 확인창 Escape는 기존 ‘계속 보관’ 동작을 재사용해 수정했다. 방문/복구 owner를 해제하지 않고 확인창만 닫는다. actual 함수 신규17의 수정 전16P/1F→수정 후17P를 보존했고, 관련8파일121/121 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-recovery-escape-freeze-20260906-01.json`)에는 신규17이 포함된다. 이 좁은 복구창 경로의 actual browser 조합까지 시험했다는 뜻은 아니다.

최종 app `D7A3C8EBE91476FE7B92F65860AFD6C9142BB2763EF96DEADC664F3C9F1180F4`, UI `65BF4F8E`를 동결했다. 첫4 재검4/4 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/standalone-detail-first4-recovery-20260906-01.json`)와 추가3/3 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/standalone-detail-boundary-recovery-path-20260906-03.json`)이 통과했다. 추가3의 초기 helper loader 오류3건은 제품 boot 전 실패다. 그 뒤2P/1F는 persistent quota가 prepared journal을 남기는 실제 계약과 하니스가 예상한 즉시 복원 경로의 불일치였으며, 해당 기대를 삭제하지 않고 명시 복구 이후에 유지했다.

| 추가 검사 | 실제 결과 | API·bytes 구분 |
| --- | --- | --- |
| DV05 외부 workspace ABA+dirty Plan |실제 다른 HTTP 문서의 검증된 fixture2set·실제 storage event2, dirty 입력/계속/버리기와 옛 preview 폐기 PASS |main 원문 준비7API 이후 제품쓰기0. 외부2set은 별도이며 완료 source 권한의 모든 ABA를 검증한 것은 아님 |
| DV06 숨은 이벤트·reload |숨은 textarea/옛preview 이벤트5회0쓰기. 실제 완료 뒤 reload의 A/checkpoint exact·검색/새 결과 복원0 |원문 준비7+완료4API, reload0 |
| DV07 persistent exact checkpoint quota |target 실패 뒤 prepared gate, 복귀/Escape0변경, 주입 해제 뒤 명시 이전 상태 복구→전체 before bytes exact→명시 완료 재시도 PASS |준비A7, 실패journal set1+before-native target throw1, 복구journal remove1, 재시도4API. 실패 전후 전체bytes가 같았다고 쓰지 않음 |

추가3은3 fresh context+peer1·reload1, main API32(set29/remove3/clear0), 실제bytes변경13이다. 외부 fixture2set은 이32에 포함하지 않는다. 보호 key·A/source/user HTML·source SHA 전후 동일, 오류/금지0이다. 실제 기기는 아니다.

최종 D7A3에서 기존 read13+K1B20=33/33 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c1c2-existing-read-k1b-final-20260906-01/browser.json`), 기존 작성30/30 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-authoring-existing-20260906-01.json`) PASS다. 이후 기존 builder로 두 HTML을 생성했고 생성119/119 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-generated-2026-09-06T05-05-05-762Z.json`), host pin46/46 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-host-pins-2026-09-06T05-05-33-283Z.json`)+증거 CLI10/10 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-evidence-verifier-2026-09-06T05-06-30-345Z.json`), 실제file 읽기10/10 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-generated-file-read-20260906-01.json`), host8/8 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-generated-host-20260906-01.json`) PASS다. 파일 읽기는 HTTP 전용 외부문서3개를 명시적으로 제외한10개이며, 두 제공 파일의 완료·Undo 검사는 별도 신규2개로 진행한다. host8은 실제 기기 검사 수가 아니다.

제공 두 파일을 직접 연 추가 file2 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-actual-file-first-20260906-01.json`)는2/2 PASS다. 390×844 Chromium의 fresh context2·file URL2·reload2이며 HTTP 요청0이다. 원문 입력14+완료8+Undo8의 API30(set26/remove4/clear0), 실제 bytes 변경18, workspace 논리성공4다. 읽기·검색·복귀·reload 쓰기0, 운영/source/A 보존과 source/user/helper 전후 해시 일치, 오류·금지 호출0을 확인했다. 독립 검토자는 새 PNG4장, root는 standalone 완료와 android 파일의 원문 reload PNG2장을 직접 확인했다. 파일명의 android는 실제 Android 검사라는 뜻이 아니며, 이2개에 전체 화면 기하 검사는 포함하지 않는다.

현재 보고서 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-report-20260906-01.json`)는5/5 PASS다. 390×844,375×812,844×390,1024×768,1440×900에서 현재·과거 판정 구분과 링크·넘침·오류를 확인했다. root는 새 상세 연결 카드의390/1440 PNG2장을 직접 확인했다. 보고서 검사 수를 제품 시나리오 수에 합산하지 않는다.

전체 npm의 C1-c2 실제 실행도 2,030실행/2,029PASS/기존 seed 출처 기한1FAIL (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-npm-2026-09-06T04-56-18-637Z.json`)이다. 후속 approved201/public19는 각각 별도PASS다. 기본 `/my`·원래 dirty worktree·운영 schema/writer·PoC 밖 key는 변경하지 않는다. 실제 Android Chrome/iOS Safari·OS IME/OS Back·보조기술 NOT_RUN, 관찰 사용자0명이다. commit/push/PR/Preview/Production은 모두 미실행이다. C1·K3-C·상위 목표 전체를 완료 처리하지 않았다.

## 최종 파일·보호 마감

pin5파일 반영 뒤 production build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-final-build-2026-09-06T05-17-01-375Z.json`)는05:17:35Z에 PASS했고 BUILD는 `lRjN_SKaMAiL1YjcRtHal`이다. 위 React 실제2는 같은 B454/9738 source의 앞선 Wzfp build에서 실행했으며, 새 build에서 실행한 것으로 바꾸지 않는다. docs:check (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/detail-visit-final-docs-2026-09-06T05-20-48-131Z.json`)는 필수16문서·로컬6555링크 PASS다.

05:20:33Z의 원래 보호 manifest551개 재검은 승인한 누적변경31개·예상 밖 변경0이다. 이 manifest를 새 기준으로 덮어쓰지 않았다. 브라우저의 운영 key/value 불변 증거와 파일보호 검사는 서로 다른 증거다. 05:21:10Z closeout은 선택 scope modified1/untracked2, 전체 worktree modified189/untracked449, HEAD6e4b44fe·upstream0/0이며 검사 실행기는 아니다. 부분 파일명 prefix가 포함되지 않은 신규 경로는 이 도구의3개 집계로 소유를 확정하지 않고 아래 actual 경로와 before diff로 관리한다. scoped `git diff --check`는 exit0이다.

이번 변경의 중심은 `app.js`·`personal-entry-ui.js`, React `PersonalWorkspacePocSurface.tsx`, 신규 visit 모델/브라우저 시험이다. 기존 VM2개의 새 dependency만 보완했고, 생성 HTML2개와 후보pin5개를 맞췄다. 정확 before는 `output/poc-gap-implementation/k3c/before-detail-visit-20260906-01`, `before-react-detail-visit-safety-20260906-01`, `before-detail-visit-html-20260906-01`에 보관했다. 기존 dirty 파일 전체를 이번 소유로 stage하거나 정리하지 않았다.
