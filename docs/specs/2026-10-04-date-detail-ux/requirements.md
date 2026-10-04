# 날짜·진행 상세와 같은 Item 원문 복귀 요구 대조

2026-10-04. [승인 범위](spec.md)의 DU01–DU07을 v4.1·개발1·개발2, 최신 UX2 인계, 사용 피드백에 연결한다. 대조축은 **날짜·진행 상세 / 문서→기간→같은 Item 원문 복귀**다. 세 원천 전체, 과거 424개 하위 조건, 26개 피드백 전체의 새 감사나 완료표가 아니다.

`기존 현행`은 시작 HEAD `a30ab173788f5d9ac4dd553bf8e85073546cf20a`의 계약이고, `이번 변경`은 이 격리 작업본의 증분이다. 아래 50개 원 ID는 근거49개와 미실행 경계인 V41-033의 참조1개다. 원천 전체 coverage나 각 부모의 모든 하위 조건 PASS, 충족한 요구50개를 뜻하지 않는다. 최종 앱 build `jAYFY3t3SI-FCYcsQvJG_`의 증거를 재읽고 DU01–DU07의 **이번 좁은 UI 수용 조건을 PASS**로 갱신했다. 별도 전체 통합3,071 PASS도 실행 JSON에서 확인했으며 각 검사 종류는 아래에서 분리한다. 작업 전체 마감은 [QA](qa.md)와 [결과](results.md)를 따른다. 별도 합성 HTML의 32 PASS를 실제 앱 판정으로 대체하지 않는다.

## 근거와 세 원천의 수용 목적

아래 외부 작업본의 UX2·직접 피드백 참조는 로컬 비공개 근거이며 공개 Git에 포함하지 않는다. 해당 경로는 공개 링크나 이번 파일 게시 대상으로 해석하지 않는다.

| 근거 | 정확한 연결과 이번 수용 목적 |
| --- | --- |
| v4.1 | [감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md), [원 ID·원문 요구](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.json). 날짜 배치·원본 경로·시간·소속·identity를 보존하고 작은 화면에서도 취소·복구·핵심 조작에 도달한다. DU01–DU06에 필요한 부분만 연결한다. |
| 개발1 | [감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md), [원 ID·원문 요구](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.json). 진입점이 달라도 같은 Item 거래를 사용하고 개인 편집/원문을 구분한다. dirty 이탈·취소·실패·초점·Undo를 보호한다. 기존 전체 Plan/Calendar/Quick Item 여정을 이번 상세창과 동일시하지 않는다. |
| 개발2 | [감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md), [원 ID·원문 요구](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.json). 평문과 canonical Item을 보존하고 문서/기간을 같은 Item의 projection으로 다룬다. 기존 tokens·native 입력·요청 시 펼침을 사용하며 stale·취소·실패의 원자성을 유지한다. HTML/자동 QA/사람 관찰은 분리한다. |
| 최신 UX2 | `D:/flowme2605/flow-text-integration-plan-20260908/docs/content-audit/2026-10-04-flowme-role-coverage-ux/handoff-ko.md`: 요청 `FLOWME-STRENGTHEN-COVERAGE-20261004-1007`, SYNC `FLOWME-STRENGTHEN-COVERAGE-SYNC-20261004-1048`. 23–25행의 P0와 34–38행의 기존 경계를 대조했다. 별도 요구 ID가 없는 표이므로 새 ID를 발명하지 않는다. `coverage.json` 995–1015행의 `roleTransitionContract` 키를 아래에 그대로 식별한다. 기획 인계이며 앱 구현·새 정책 확정 증거가 아니다. |
| 직접 피드백·재검사 요지 | `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md`의 #3(26행), #11(84행), #14(108행), #22(184행), #23(194행), #24(201행)와 `2026-10-04-flowme-ui-retest-comments-handoff-ko.md` 18–21행. [26개 원장](../2026-10-04-memo-date-feedback-gaps/requirements.md)의 C/FG와 [직전 MD 원장](../2026-10-04-personal-memo-date-ux/requirements.md)의 MD 번호를 보존한다. PDF·ZIP·원 캡처는 이번 미열람이며 전달 현상의 원인/빌드 동일성은 미확인이다. |

## 최종 판본의 좁은 수용 결과

정본 `output/playwright/date-detail/app-summary.json`(`2026-10-04T13:42:27.344Z`)을 재읽었다. exact build는 `jAYFY3t3SI-FCYcsQvJG_`, build exit 0, `sourceDrift:[]`이다. 아래 61개는 앱 browser 판정 수이며 요구·기능·피드백 해결 개수가 아니다.

| 종류 | 확인된 최종 실행 / 근거 / 한계 |
| --- | --- |
| 실제 앱 합성 core | 40 PASS / 0 FAIL. D00, D01A, D01–D19, 6개 크기의 초기/접힘/펼침 V 검사 및 core 보호 검사. 크기는 390×844, 375×812, 844×390, 600×800, 1024×768, 1440×900이다. 기본 요청 5크기에 600×800 보조 크기를 더했다. raw log `app-core-final2-cli.log`, SHA256 `aa5f06c9c86a9f112d2085e79a92578cf2685c7ebdd03e2a9886eeb3f3ea138b`. |
| 실제 앱 합성 faults | 9 PASS / 0 FAIL. D00, F01–F07 및 faults 보호 검사. 지연 일정/진행의 새 입력 보호, 합성 날짜 저장 거절·무자동재시도, F06 직접 재시도 성공·오류 소멸·guard 해제, F07 두 번째 거절 뒤 취소0 mutation. raw log `app-faults-final-cli.log`, SHA256 `45f42ff8f86e49839ea00f343dad9c58c065a13cceb56c046ad9c259d6998885`. |
| 실제 앱 긴 제목·키보드 | 12 PASS / 0 FAIL. 375×812, 844×390, 1440×900의 긴 제목 높이 제한·펼친 controls hit/overflow·실제 Tab/Shift+Tab, inspection0 command와 보호 검사. 총 keypress 219회, 문서 밖 전이 3회가 있었고 각각 다음 동일 방향 keypress 2회 이내 dialog로 돌아왔다. 문서 밖 전이가 browser UI 때문이라고 단정하거나 완전 focus confinement으로 보고하지 않는다. raw log `app-long-final2-cli.log`, SHA256 `57b9fa9c8e2ee7d6c46eaea26c43b8db66399423e03fde9a9489d60ec87dd5b5`. |
| 합성 경계 | 세 phase 모두 forwardedAuth/API 0, forbidden storage calls 0, sentinelsExact/publicUnchanged true, page/console errors 0. summary의 realBackendWrites 0, actualDevice false, observedUsers 0. 외부 backend 전달0·보호 storage 불변이며 실제 운영 DB byte 비교는 아니다. |
| npm test / 표적 / fixture | `output/integrated-product-poc/npm-test-latest.json`과 `npm-test-2026-10-04T13-28-19-145Z.log`: 2,261 PASS, 실패 0, exit/verified exit 0, 실행 중 source 변경0. DX15 추가 후 표적82 PASS는 검사 owner의 최종 인계로 확인했다. `output/playwright/date-detail/fixture-unit-final.log` footer: 6 PASS/실패·skip·cancel0. fixture6은 신규 date-detail2+기존 feedback-gaps4의 단위 self-check/차단 gate다. |
| 타입 / build | `output/integrated-product-poc/targeted-types.json`: entry589/source hash664/diagnostics0/source 변경0. `build-latest.json`과 `build-2026-10-04T13-28-07-062Z.log`: exit/verified exit0/source 변경0. `.next/BUILD_ID`와 summary exact build가 일치한다. DX15는 sticky 높이와 scroll padding/margin의 CSS 계약 검사이며 native scroll geometry는 위 V/L browser가 증명한다. |
| 별도 HTML | `output/playwright/date-detail/prototype-results.json`: H01–H17 및 요청 5크기의 HI/HC/HE, 32 PASS / 0 FAIL. 합성 메모리 HTML만의 결과이며 위 앱61과 합산하지 않는다. |
| 별도 전체 통합 | `output/integrated-product-poc/new-tests-latest.json`과 `new-tests-2026-10-04T13-27-55-817Z.log`: 3,071/3,071 PASS, fail/skip/cancel0, 파일288개, worker2, heap512MiB. 시작13:27:55.817Z/종료13:45:11.287Z, sourceChangedDuringRun0, exit/verified exit0. 실제 완료 JSON을 확인했다. 512는 메모리 한도이며 검사 개수가 아니다. 이 묶음·npm2261·표적82·browser61·HTML32를 더해 고유 요구/기능 수로 환산하지 않는다. |

DU별 PASS는 아래에 적은 이번 UI·선택 target·오류 주입·합성 경계에 한정한다. 원문 증거의 미열람·원 피드백 환경·모든 owner/browser 경로·실기기/IME/AT·운영 반영·제품 정책은 그대로 잔여다.

## 중간 판본 이력 — P__390 실패 보존

앱 build `P__k7__hYJtsimsxkoCBv`와 당시 고정한 source를 기준으로 읽었던 기록이다. 다음 표의 ‘현재’, 진단 중, 미실행은 그 중간 판본의 당시 상태이며 최종 판본의 상태가 아니다. 실패 기록을 삭제하지 않고 최종 재검사를 위에 별도로 연결한다.

| 종류 | 현재 확인 / 근거 / 한계 |
| --- | --- |
| npm test | 2,261 PASS, 실패 0. `output/integrated-product-poc/npm-test-2026-10-04T13-08-37-328Z.json` 및 같은 이름의 `.log`, exit/verified exit 0, 실행 중 source 변경 0. 전체 suite 결과를 모든 원 요구의 새 browser 실행으로 바꾸지 않는다. |
| 표적 회귀 | 81 PASS를 검사 owner(main)의 실행 인계로 확인했다. 아래 DX/DR/PS 등 연결은 유지한다. 최종 QA가 정확한 실행 묶음·로그를 기록하며 81개를 새 기능 수로 세지 않는다. |
| fixture 단위 | 신규 date-detail-fixture 2개 + 기존 feedback-gaps-fixture 4개의 self-check/차단 gate 묶음 6 PASS를 검사 owner 인계로 확인했다. 제품 기능 6개나 앱 browser 6 PASS가 아니다. |
| 타입 / build | `output/integrated-product-poc/targeted-types-2026-10-04T13-08-04-598Z.json`: entry 589, source hash 664, diagnostics 0, 실행 중 source 변경 0. `build-2026-10-04T13-08-27-103Z.json`: exit/verified exit 0, source 변경 0. 당시 `.next/BUILD_ID` 및 앱 report의 build ID가 위 중간 판본과 같았다. 갱신되는 latest 파일이나 현재 BUILD_ID를 중간 판본 근거로 사용하지 않는다. |
| 별도 HTML | `output/playwright/date-detail/prototype-results.json`: H01–H17 및 다섯 크기의 HI/HC/HE, 32 PASS / 0 FAIL. `device:false`, `observedUsers:0`. 합성 HTML만의 결과이며 앱 최종 수용을 대신하지 않는다. |
| 실제 앱 합성 core — 일부 | `output/playwright/date-detail/app-core-initial-failure.json`: build P__, D00, D01A, D01–D18 PASS. V390×844의 초기 heading·접힘 조작 PASS, 펼침 조작 geometry 1건 FAIL/당시 진단 중. nearest scroll 후 sticky header가 날짜 적용 버튼을 가리는 현상을 main이 확인했고 CSS 보완을 검토했다. 이 실행은 당시 core 전체 완료가 아니었다. 현재 `app-core-results.json`은 최종 build의 40 PASS로 갱신됐으므로 이 실패 이력은 별도 보존 JSON을 따른다. |
| 앱 미실행 | 나머지 크기의 V 검사, D19 reload, core 최종 보호 검사와 faults F01–F07/보호 검사 NOT_RUN. 새 F06 직접 재시도 성공·오류 소멸·guard 해제와 F07 두 번째 거절 뒤 Escape/닫기0 mutation은 callback에 준비됐지만 아직 실행 전이다. |

중간 core의 기능 PASS와 geometry FAIL을 함께 보존한다. 당시 위 증거는 실제 앱 UI에 합성 계정/응답을 붙인 내부 QA이며 실제 backend·DB·기기·사람 관찰 근거가 아니었다. 후속 scroll padding/margin 보완 뒤 최종 build의 동일 geometry·긴 제목·키보드 재검사로 좁은 수용을 갱신했다.

## DU별 기존 현행·증분·검사·잔여

### DU01 — 날짜·시간 우선, 나머지 요청 시 펼침

- 근거: 피드백 #3·#11, C01/C08/C18, MD05/FG05. V41-001, D1-014, D2-007·D2-036·D2-043. UX2 `ports`의 기존 UI/입력 경계 재사용.
- 기존 현행: 실행 상세에 날짜 출처·날짜/시간·shortcut·진행·연결·문서 이동·순서 기능이 있다. 원문 편집기는 별도 편집 경로다. 기능 존재를 #11 원화면의 발견성 해결로 판정하지 않는다.
- 이번 변경/수용: 날짜·시간 입력·적용·기존 세 shortcut은 상시 노출한다. `진행 기록`, `연결·이동·순서`는 기본 접힌 native `details`이며 내부 DOM은 접었다고 제거하지 않는다. 기존 ProgramTaskDocumentMove·참조·순서 기능을 보존한다. 새 저장 방식이나 기능 삭제 없음.
- 단위 검사 연결: `DX01`, `DX03`, `DX15`. 최종 표적82/전체 npm2261과 browser를 연결하되 원 부모 전체를 PASS로 올리지 않는다.
- 앱 브라우저/좁은 판정: `D01A`, `D01`, `D04`, `D05`, `D08`, 6크기의 `V{width}x{height}` 초기/접힘/펼침 PASS. 이번 날짜 우선·항상 mounted·기존 조작 보존 수용 PASS. HTML 비교 `H01`, `H03`, `HI*`, `HC*`, `HE*`는 별도 HTML32 범위다.
- 잔여: 문서 작업 공간 전체 밀도, 모든 메뉴 발견성, 사용자 선호·이해도, 전체 inline/popover 명세는 이번 완료 대상이 아니다.

### DU02 — 조회 날짜·실행 날짜·출처·진행 기록일 구분

- 근거: FG01/FG03, MD03·MD04·MD07·MD08, PC02, C08/C09, 피드백 #14·#23·#24. V41-013·V41-014·V41-025, D1-006·D1-018, D2-014·D2-015. UX2 `period` 및 handoff 38행.
- 기존 현행: 구획 기본·개별 예외·명시 미정의 출처, 시간, Today의 지난 미완료를 구분한다. 자유 문장 `날짜 미정`은 날짜 명령이 아니다. 시간만 수정해도 현재 유효 날짜가 개별 날짜로 지정되는 기존 handler가 있다.
- 이번 변경/수용: 기존 날짜 출처와 change-hint helper를 실행 상세에서 함께 표시한다. 시간-only 변경의 개별 날짜 적용 결과를 안내한다. `오늘로 이동`, `내일로 이어하기`, `날짜 미정으로 이동` 문구·전이는 그대로이고, 날짜만 미정으로 옮길 때 저장 시간은 유지한다. 진행 기록일은 예정일로 바꾸지 않는다.
- 단위 검사 연결: `DX02`, `DX11`; 기존 `DR01`, `DR07`, `DR09`, `PS03`–`PS07`, ProgramSpace.context/execution-presentation 회귀. 실행 묶음과 DU 최종 판정은 구분한다.
- 앱 브라우저/좁은 판정: `D03`, `D09`, `D10`, `D12`–`D14`, `D19` 최종 PASS. 이번 상세의 날짜 출처·기존 시간-only 결과 안내·개별 적용·진행 기록일 구분·reload 수용 PASS. HTML `H05`–`H07`, `H13`, `H16`은 별도 시뮬레이션 PASS다.
- 잔여: 기준일/상속 전체 재계산, 자유 문장 자동 미정, 새 구획 따르기·원위치·미정 우선순위 정책, 독립 due, 실제 날짜 선택기 popup, 원 전달 `10/05→10/08`과 동일 원인 여부는 미확인/제외다.

### DU03 — 초기 가림·반응형·키보드·취소·초점

- 근거: FG05/MD05, C18. V41-030·V41-031·V41-032·V41-041·V41-042·V41-050, D1-004·D1-011·D1-014·D1-015·D1-025, D2-039·D2-040·D2-042·D2-058.
- 기존 현행: native dialog/Escape, 취소·동일값 무변경, 기존 editor focus와 입력 보호가 있다. 작은 화면의 기존 전체 workspace 배치는 별도 계약이다.
- 이번 변경/수용: task 제목/닫기를 sticky로 유지하고 dialog를 새로 열면 내부 scroll을 처음으로 맞춘다. 375/390 세로 화면의 날짜·시간은 한 열, 844 가로는 두 열이다. controls는 CSS 최소 높이 48px이며 실제 브라우저 도달/가림을 따로 측정한다. 닫기/Escape는 미적용 입력만 취소하고, opener가 기간 밖으로 사라졌으면 현재 보이는 기간 버튼으로 초점을 복귀한다. disclosures는 Enter/Space로 조작한다.
- 단위 검사 연결: `DX01`, `DX03`, `DX09`–`DX12`, `DX15`; 기존 `PS05`–`PS07`, ProgramSpace.journey의 원문 선택/초점/dirty 차단 회귀. 실행 묶음과 DU 최종 판정은 구분한다.
- 앱 브라우저/좁은 판정: `D01A`, `D02`–`D08`, `D18`, 6크기 V와 3크기 L 최종 PASS. 최초 heading·핵심 action hit/overflow·native 접기/펼치기·취소·opener fallback·긴 제목의 높이/키보드 도달 수용 PASS. 문서 밖 전이3회/2keypress 이내 복귀 관측은 위 최종 표의 한계를 유지한다. 완전 focus trap의 증명이 아니다. HTML `H03`–`H05`, `H16`, `HI*`/`HC*`/`HE*` PASS는 별도다.
- 잔여: V41-030/031은 원래 행·이동 패널, D1-015는 workspace 전체, D2-042는 320/360/200%·실제 키보드까지 포함한다. 이번 dialog 검사로 이 부모 요구 전체를 올리지 않는다. V41-033 물리 safe-area, 실기기 touch/IME/AT·날짜 popup·전체 접근성은 NOT_RUN이다.

### DU04 — 문서·기간·정확한 같은 Item 원문 복귀

- 근거: FG01/MD07, C08/C09 및 피드백 #11·#12·#14. V41-002·V41-013·V41-014·V41-025·V41-028, D1-002·D1-004·D1-006·D1-022, D2-003·D2-014·D2-015·D2-017·D2-018·D2-039. UX2 P0 `period`, `identity`, `stateOnReturn`, `inputBarrier`.
- 기존 현행: 문서/기간은 같은 Item을 보여 주며 기존 `openDocument(documentId, taskId)`가 정확한 원문 행으로 복귀한다. 제목이 같아도 ID/원문 행/메모/진행은 별개다. 단순 조회는 일정·소속·원문 정렬을 쓰지 않는다.
- 이번 변경/수용: task dialog에 명시적인 `원문 열기`를 추가하고 기존 openDocument를 사용한다. 미적용 날짜/시간뿐 아니라 진행 날짜/퍼센트도 복귀를 막고 적용 또는 닫아 취소를 안내한다. 기존 옮긴 문서 열기의 callback도 같은 보호를 적용한다. 진행 baseline은 각 dialog의 정확한 대상과 성공 제출값을 기준으로 갱신하며 더 새 입력을 clean으로 만들지 않는다.
- 단위 검사 연결: `DX02`–`DX06`, `DX08`, `DX12`–`DX14`, 기존 `DR01`·`DR02`; ProgramSpace.context/journey의 같은 행 locator·이미 열린 editor·dirty/IME/lock/flush·원문 스크롤 회귀. 실행 묶음과 DU 최종 판정은 구분한다.
- 앱 브라우저/좁은 판정: `D00`, `D06`, `D08`, `D10`–`D14`, `D17`–`D19`, `F02`, `F03` 최종 PASS. 선택 ordinary task의 동일ID·원문 행·메모/기록·복귀 guard·reload·지연 입력 보호 수용 PASS. HTML `H02`, `H07`, `H08`, `H13`, `H15` PASS는 같은 제목 독립 예시의 별도 시뮬레이션이다.
- 잔여: 새 버튼은 기존 task dialog 대상만이다. recurring occurrence의 ProgramRecurrence editor, 전체 source origin/Calendar/Sheet/export 여정, 자동 커서 영속 복원, 실제 월간 grid 전체·날짜별 추가는 이번 새 완료 판정 밖이다. D2-039의 본문 속성 값 선택 전체도 이 복귀 검사와 같지 않다.

### DU05 — 입력 유지·거절·직접 재시도·지연 owner·기존 복구

- 근거: FG01/FG02/FG05, MD05·MD07·MD09, C08/C16. V41-018·V41-020·V41-046, D1-004·D1-008·D1-011·D1-018, D2-039·D2-040·D2-058. UX2 `ports`, `inputBarrier`, `personalVsExternal`와 P1 handoff 28행.
- 기존 현행: expected workspace/CAS, private schedule intent, ACK·dialog/input generation, 실패 입력 보존, 기존 Undo/Redo/reload 경로가 있다. writer/parser/schema·API owner는 바꾸지 않는다.
- 이번 변경/수용: 접힘은 입력을 unmount하지 않는다. 실패는 제출 입력/마지막 성공값/원문을 보존하고 자동 재시도를 만들지 않는다. 진행 성공은 요청한 날짜/퍼센트만 baseline으로 받고 새 dialog·더 새 입력은 보호한다. 과거 기록의 동일값 재적용은 command 0으로 clean 판정을 갱신한다. 기존 원자 변경의 Undo/Redo를 그대로 사용한다.
- 단위 검사 연결: `DX03`–`DX07`, `DX09`, `DX13`·`DX14`; 기존 `DR01`–`DR10`, `PS12`, `PS15`, `PS17`–`PS26`의 거절/ACK/owner 회귀. 실행 묶음과 DU 최종 판정은 구분한다.
- 앱 브라우저/좁은 판정: `D03`, `D07`, `D12`–`D16`, `D19`, `F01`–`F07` 최종 PASS. 접은 draft·늦은 성공 후 새 입력/owner·거절 입력·기존 Undo/Redo/reload의 이번 수용 PASS. HTML `H04`, `H09`–`H13`은 별도 시뮬레이션 PASS다.
- F06/F07 실제 조건: F04 합성 날짜 저장 거절이 input/account bytes를 보존하고 F05 자동 retry0인 뒤, **F06 동일 날짜 입력의 직접 재적용으로 성공 command가 정확히1 증가**, `2026-10-22` 입력·같은 메모·진행 퍼센트66을 보존하며 이전 alert0/origin guard 해제를 확인했다. **F07은 새 `2026-10-23` 입력을 두 번째로 거절한 뒤 Escape/닫아 account와 성공 command count가 직전 snapshot과 동일**함을 확인했다. 모두 faults9의 실제 PASS이며 HTML H12/단위 PASS로 대신한 것이 아니다. 진행 저장 거절·직접 retry의 모든 browser 조합까지 확장하지 않는다.
- 잔여: 전체 거절/unknown ACK/일반 social·실DB atomicity·외부 예약 취소·새 Undo 정책은 제외다. V41-020의 물리 drag/pointer/window 취소 전체도 새로 검사하지 않는다.

### DU06 — 보관·분류·필터·참조·owner 경계 보존

- 근거: 최신 UX2 P0 23–25행 및 `roleChangeCreates`, `documentFiling`, `taskClassification`, `reference`, `identity`, `stateOnReturn`, `pause`, `newRun`, `ports`. C07/C08/C10, 피드백 #2·#4·#5·#19·#21·#22는 경계 근거이며 이번 모두 해결 판정이 아니다. V41-013·V41-015·V41-016·V41-017, D1-005·D1-008·D1-017, D2-002·D2-004·D2-011.
- 기존 현행: 문서 folderId 보관, taskScopes/itemScopes 분류, 조회 필터, 같은 target 참조는 구별한다. ordinary private/source-owned copy/occurrence는 다른 locator/command guard를 유지한다. 같은 제목으로 상태를 병합하지 않는다.
- 이번 변경/수용: 보기·접기·원문 복귀만으로 계정/Item/copy/run/권한·분류를 만들거나 바꾸지 않는다. 기존 참조와 명시 원문 이동을 접힌 연결 영역에 보존한다. 날짜/진행 변경은 선택한 개인 target의 기존 명령만 사용한다. 조회 전환은 pause/resume/new run이나 옛 기록 초기화가 아니다.
- 단위 검사 연결: `DX01`, `DX08`–`DX12`, `DR02`, 기존 `PS01`·`PS02`·`PS08`–`PS11`·`PS14`·`PS16`·`PS20`, task-document-move·recurrence owner 회귀. 실행 묶음과 DU 최종 판정은 구분한다.
- 앱 브라우저/좁은 판정: `D00`, `D03`, `D05`, `D07`, `D10`, `D17`–`D19`와 세 phase 보호 경계 검사 최종 PASS. 선택 target의 조회/접기/복귀0 command·독립ID·public/source/storage 보호 및 기존 owner 회귀의 이번 수용 PASS. 모든 owner의 신규 UI 구현이나 전수 browser 검사가 아니다. HTML `H14` PASS는 참조 시뮬레이션이며 실제 제품 문서 이동/분류 검사를 대신하지 않는다.
- 잔여: 폴더 정책·분류 전면 개편, unlink/delete 새 조작, source copy/occurrence 모든 browser 경로, 목적별 새 계정 모드, 새 실행·충돌·중단/재개 정책, 공통/회차 메모·자동 반복·due는 제외/미결이다. #2의 폴더 필터 사용자 정정은 종료 상태로 유지한다.

### DU07 — 운영과 분리된 조작 HTML, 검사 종류 구분

- 근거: 사용자 로컬 HTML 선호, V41-001의 시각 일관성, D1-026, D2-008·D2-009·D2-010. UX2 handoff 4·51·76행의 기획/구현/자동 QA/사람 검증 분리.
- 기존 현행: 제품 React가 정본이고 HTML은 비교용 동반 산출물이다. 이전 release의 43/CI4/운영7은 이번 실행 수가 아니다.
- 이번 변경/수용: [단일 HTML](../../content-audit/2026-10-04-flowme-date-detail-ux-ko.html)은 합성 메모리 모델만 사용한다. 원문·오늘·주간·월간, 정상 적용·접기·취소/Escape·실패/직접 재시도·Undo/Redo·같은 대상 복귀를 조작한다. 같은 제목 두 대상은 독립 ID다. local/sessionStorage·fetch·network·운영 계정 연결은 없다. 실제 parser/writer·Auth/backend 저장 성공을 검증한 것이 아니라고 명시한다.
- 단위/경계 검사: date-detail-fixture.test.ts의 허용된 새 로컬 GET/보호 포트·POST·실host·credentials·traversal 거절 2개와 기존 feedback-gaps-fixture.test.ts 4개 묶음 6 PASS. QA 인프라 검사이며 제품 요구 완료 6개로 세지 않는다.
- HTML 브라우저/좁은 판정: `H01`–`H17`와 5개 viewport별 `HI*`, `HC*`, `HE*`, 32 PASS / 0 FAIL을 결과 JSON에서 확인했다. 운영과 분리된 조작 HTML 제공 수용 PASS. 앱61과 별개의 산출물 검사이며 결과를 합산하지 않는다.
- 잔여: HTML의 read-only 원문·합성 오류·메모리 Undo와 제품의 native editor·합성 HTTP 저장 fixture는 다르다. 실제 계정/DB/Auth, DEV 교체·배포, 실기기·사람 관찰을 포함하지 않는다.

## 검사 ID 위치와 판정 경계

| 검사 ID | 정본 파일 / 검사 단위 |
| --- | --- |
| DX01–DX15 | [ProgramSpace.detail-ux.test.tsx](../../../components/flow/integrated-poc/ProgramSpace.detail-ux.test.tsx). 새 상세 JSX·입력 baseline·generation·복귀 guard의 컴포넌트/DOM 모형과 DX15 scroll-padding/margin·bounded title CSS 회귀. 브라우저 geometry 검사가 아니다. |
| DR01–DR10 / PS01–PS26 | [date-roundtrip](../../../components/flow/integrated-poc/ProgramSpace.date-roundtrip.test.tsx), [private-schedule](../../../components/flow/integrated-poc/ProgramSpace.private-schedule.test.tsx). 이번 영향을 받는 기존 날짜·저장 owner 회귀. ID 수를 새 요구/새 기능 수로 더하지 않는다. |
| 기존 문맥/복귀/이동/반복 | [context](../../../components/flow/integrated-poc/ProgramSpace.context.test.tsx), [journey](../../../components/flow/integrated-poc/ProgramSpace.journey.test.tsx), [execution-presentation](../../../lib/flow/integrated-poc/execution-presentation.test.ts), [task-document-move](../../../lib/flow/integrated-poc/task-document-move.test.ts), [ProgramRecurrence](../../../components/flow/integrated-poc/ProgramRecurrence.test.tsx), [ProgramRecurrence.interaction](../../../components/flow/integrated-poc/ProgramRecurrence.interaction.test.tsx). 기존 파일의 실제 test title로 식별하며 새 browser ID를 발명하지 않는다. |
| D00–D19, D01A, F01–F07, V* | [앱 callback](../../../scripts/personal-workspace-poc/qa-date-detail-app-20261004.js). D는 core 기능, F는 지연/거절·직접 retry·두 번째 거절 취소, V는 초기 heading/접힘/펼침 geometry다. V의 exact name은 `V{width}x{height} initial heading does not overlap header`, `collapsed groups, visible schedule and control access`, `expanded groups and control access`이다. F06 exact name은 `direct retry saves retained input, clears rejection and unblocks origin`, F07은 `closing rejected drafts cancels without a mutation`이다. |
| 앱 viewport·보호 검사 | 앱 callback은 390×844, 375×812, 844×390, 600×800, 1024×768, 1440×900을 명시한다. 앞의 승인 5크기에 600×800 보조 크기를 더한다. phase마다 exact name `core protected storage bytes and public source remain unchanged` / `faults protected storage bytes and public source remain unchanged` / `long-title protected storage bytes and public source remain unchanged`로 sentinel/public·Auth/API 전달0·오류0 경계를 검사한다. 실제 DB byte 비교가 아니다. |
| L* 긴 제목 | 같은 앱 callback의 375×812/844×390/1440×900. exact name은 `L{width}x{height} long title is bounded and exact`, `expanded long-title controls remain unoccluded`, `actual Tab and Shift+Tab keep focused controls visible`. `long-title keyboard and disclosure inspection sends zero commands`와 phase 보호 검사를 포함한다. 문서 밖 전이의 관측/복귀 한계는 최종 결과표에 보존한다. |
| H01–H17, HI*/HC*/HE* | [HTML callback](../../../scripts/personal-workspace-poc/qa-date-detail-prototype-20261004.js). HI 초기 날짜 heading, HC 접힌 핵심 hit/overflow, HE 펼친 hit/overflow다. 390×844, 375×812, 844×390, 1024×768, 1440×900의 합성 HTML 검사이며 앱/기기 PASS가 아니다. |
| QA 자원 경계 | [date-detail-fixture.test.ts](../../../scripts/personal-workspace-poc/date-detail-fixture.test.ts) 신규 2개 + [feedback-gaps-fixture.test.ts](../../../scripts/personal-workspace-poc/feedback-gaps-fixture.test.ts) 기존 4개. 6 PASS의 단위 self-check/차단 gate이며 기존 지원 포트/실host/계정 요청을 허용하는 근거로 사용하지 않는다. |

이번 대조는 개인 텍스트 관리의 날짜 조작을 먼저 개선하면서 경험/지식 source와 선택 참여의 owner 경계를 보존한다. 공개 콘텐츠·기여 기능을 새로 구현하거나 세 제품 방향 전체를 검증한 것은 아니다. 폴더·문법·반복·due·run·외부 상태 취소의 새 정책, 전체 424조건, 모든 피드백 완료, DEV 반영, 기기 실사용은 이 문서의 수용 판정에서 제외한다.
