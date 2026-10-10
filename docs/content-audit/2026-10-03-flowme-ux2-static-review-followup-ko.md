# UX2 정적 검토 수신·제품 대조

2026-10-03 KST. 전달 식별자: **FLOWME-STATIC-REVIEW-20261002-1821UTC**.

외부 보고서의 다섯 항목은 현재 UX2 portable 원본 소스와 일치한다. 현재 후보 앱과 제공 중인 앱에 같은 결함 다섯 개가 있다는 뜻은 아니다. 줄바꿈 표시 규칙은 두 제품에 이미 있으며, 다른 항목에는 시안과 동일한 화면이 없거나 다른 구현을 사용한다. 이번에는 소스를 읽고 해시를 대조했다. 제품·시안의 새 실행, 클릭 재현, 화면·접근성 통과 판정은 하지 않았다.

## 근거와 판본

- 전달 보고서: 로컬 전용 `C:/Users/HUBERT/Documents/Codex/2026-10-02/task/html-source-static-review-ko-20261002.md`.
- UX2 원본: 로컬 전용 `D:/flowme2605/flow-text-integration-plan-20260908/docs/content-audit/2026-10-02-flowme-design-directions/`의 `tool/community/service/knowledge-portable.html`. A/B/C/D 순서다. 네 파일의 공통 inline script는 동일하다. 외부 `app.js`·`core.js`의 과거 QA와 이번 portable 정적 검토를 같은 실행 근거로 합치지 않는다.
- 제품 후보: `flow-ux-comparison-gaps-20261002` / `agent/ux-comparison-gaps-20261002`, HEAD `d1cc8dd1cbc1a220054f458aea369393642f71ed`와 이 목표의 소유 변경. 이번 제품 수정은 0이다.
- 제공 작업본: 로컬 전용 `D:/flowme2605/flow-two-ux-dev-release-20261002`, 같은 HEAD의 동결 판본. 후보와 다른 변경·빌드를 구분한다. 제공 소스·서비스를 변경하지 않았다.

| 대상 | 현재 SHA256 | 외부 보고서와 대조 |
| --- | --- | --- |
| 전달 보고서 | `09094021beafd43fdb731054126169ab4bdd17b381a57a72cbed1c792649bbe1` | 수신 파일 자체의 식별값 |
| 이 목표의 비교 HTML | `8f2c56239f5f5ad57ffb8a245ec823109c1fba1b1091155c9eacf97b8a28db80` | 일치 |
| A tool portable | `f0900e89a0bda3ce36e8fd21ef062870d4dbcfb19ae3b544d8ba7c09412c324d` | 일치 |
| B community portable | `3c5f71990155515e0a80f3d89a97dc00c724b2133e455403e934908a7c6eaa02` | 일치 |
| C service portable | `1f26e0c3671a61c1a2f63e280093b9546ede932c22ac625e7e0f18c427411c34` | 일치 |
| D knowledge portable | `24e26d2ebad157c1913a1f6b958f6d93525ecb328393cfe5b4e8e3f5c053127f` | 일치 |
| 네 portable의 inline script | `fd2005460c52fb8c79f794f38e84bec1f42a373364b2337aa06c838f3c818974` | 각 파일 1개씩, 네 값과 보고서 일치 |

읽기 전후 보고서·HTML 다섯 파일의 해시는 같았다. 외부 UX2 portable 네 파일은 미추적·미소유 원본이므로 읽기만 했으며 복사·수정·stage하지 않았다. 비교 HTML 한 개는 이 목표의 소유 파일이며 이번 수신 처리에서 수정하지 않았다. 미추적 상태만으로 소유를 판단하지 않는다. 해시 일치는 판본과 보존 확인이지 기능 PASS가 아니다.

## 다섯 항목과 현재 제품의 관계

SR 번호는 이 수신 검토에서만 사용한다. 공통 문제를 파일별 네 건으로 중복 집계하지 않는다. 관련 C 번호는 [대표 요구 18군](../specs/2026-10-02-alpha-ux-comparison-gaps/requirements.md)의 연결이며 새 요구 분모가 아니다.

| 항목 | 원본 정적 근거와 영향 | 현재 후보·제공 제품 대조 | 연결·판정 |
| --- | --- | --- | --- |
| SR01 미적용 상세 입력 폐기 · 외부 Medium | A/B/C/D `tool-portable.html` 기준 478행의 제목·메모는 616~619행 submit에서만 수집한다. 547/548행 진행 조절·기록이 485/489행을 통해 469행 `sheet.innerHTML`을 교체한다. 592~601행 입력 처리에도 해당 초안 보존이 없다 | [ProgramSpace](../../components/flow/integrated-poc/ProgramSpace.tsx)722~732행 상세에는 제목·메모 입력폼 자체가 없고 날짜·진행·기록이 같은 dialog에 있다. [ProgramTextEditor](../../components/flow/integrated-poc/ProgramTextEditor.tsx)111~128·533~553행은 원문 입력을 `raw/working`에 보존하며 481~489행 진행 패널은 별도 상태만 바꾼다. 해당 코드는 제공 판본에도 같다 | C01/C03/C08/C12/C16. 원본의 데이터 손실 경로는 소스상 성립. 제품의 정확한 대응 경로는 없음; 인접 원문 입력은 소스상 보호. 새 실제 재현은 NOT_RUN |
| SR02 반복 버튼의 잘못된 초점 복원 · 외부 Medium | A/B/C/D 405행 주제 필터는 `data-topic`, 407행 반응은 `data-post`를 갖지만 457행은 action/id만 비교한다. id가 없는 같은 action 중 첫 버튼을 선택한다. 562/565행에서 재렌더한다 | [ProgramCommunity](../../components/flow/integrated-poc/ProgramCommunity.tsx)392행은 검색·종류 select이고 목록281~284행에는 반복 도움 반응 버튼이 없다. 상세276~279·364~368행은 개별 targetId와 React key를 사용하며 action/id로 첫 버튼을 강제 선택하지 않는다. [Discovery](../../components/flow/integrated-poc/ProgramDiscovery.tsx)155~157행 목록 복귀도 특정 Flow ID를 사용한다. 제공 판본의 관련 구조는 같다 | C14/C15/C18. 동일 결함 전이 근거 없음. React key나 다른 코드가 실제 초점 유지 PASS를 증명하지는 않는다. busy로 비활성화되는 반응 버튼의 실제 초점은 미확인 |
| SR03 좁은 화면의 준비 가이드 진입점 소실 · 외부 Medium | A/B/C는 7행 <=1199px 규칙에서 `.context`를 숨겨 409/431행 가이드·주제 링크가 사라진다. 325/331행 navigation은 D만 topic으로 이동한다. D는 별도 진입이 있어 제외한다 | [AlphaWorkspace](../../components/flow/integrated-poc/AlphaWorkspace.tsx)503/506행은 Flow 찾기와 경험·질문·지식의 분리 경로다. [navigation](../../lib/flow/integrated-poc/navigation.ts)6/13행과 [Discovery](../../components/flow/integrated-poc/ProgramDiscovery.tsx)251~256행의 확인 경로에는 주제 가이드·단계 탐색이 미반영이다. 제품 CSS는700px 이하에서 출력 보조 영역을 본문 위로 옮기며 같은 `.context` 숨김 경로가 아니다 | C14/C15/C18. 원본의 대체 진입점 누락과 제품의 가이드 미반영을 분리. 제품의 동일 모바일 소실 결함으로 집계하지 않음. 제품 채택은 별도 UX 범위 선택 |
| SR04 게시 본문·답글의 줄바꿈 표시 · 외부 Medium | A/B/C/D 436행은 escape한 본문·답글을 일반 p에 표시한다. CSS6행의 pre-wrap은 text-source용이며 thread-body/comment에는 적용되지 않는다. 저장 문자열의 줄바꿈은 유지된다 | 후보 [ProgramCommunity](../../components/flow/integrated-poc/ProgramCommunity.tsx)357/367행, 제공 판본335/345행 모두 `styles.body`를 사용한다. 같은 [CSS](../../components/flow/integrated-poc/ProgramCommunity.module.css)27행에 `white-space: pre-wrap`이 있다. 이 CSS는 두 판본에서 해시가 같다 | C15/C18. 원본 표시 규칙 보완 후보. 제품은 소스상 이미 처리; 이번 신규 수정·실행 PASS로 재집계하지 않음. 데이터 유실로 표현하지 않음 |
| SR05 주제 필터 선택 상태 속성 누락 · 외부 Low | A/B/C/D 405행은 active 클래스·data-topic만 붙인다. 231행 helper의 aria-label은 선택 여부가 아니며 562행 재렌더에도 선택 상태 속성이 없다 | 두 제품 [Discovery](../../components/flow/integrated-poc/ProgramDiscovery.tsx)288/289행은 label·value가 있는 분야/상황 native select다. Community 후보392/제공370행도 종류 select다. 도움 반응은 후보278/제공256행에 aria-pressed가 있다 | C14/C15/C18. 원본 주제 칩 보완 후보. 제품에는 동일 누락 경로가 없음. 필터를 칩으로 교체할 근거나 실제 AT 통과 판정은 아님 |

SR03에서 보조 영역을 숨긴 배치는 원본 `design-brief.md`31행에 의도가 기록되어 있다. 그러나 가이드 진입점 누락까지 의도한 삭제라고 단정할 수 없다. 제품의 주제 가이드 미반영 역시 승인된 영구 삭제로 바꾸지 않는다. 기존 [시안별 제품 차이](../specs/2026-10-02-alpha-ux-comparison-gaps/ux-review.md#ux2-후속-원본과-시안별-제품-차이)와 같은 구분이다.

## 보완 후보와 재검사 계획

아래는 소유 세션에서 원본 보완을 진행할 때의 제안이다. 이번 전달은 결과 수신 요청이며 원본 수정·다른 세션 메시지·제품 정책 변경의 승인이 아니다. 실제 구현 순서나 UX 방향을 새로 확정하지 않는다.

| 묶음 | 정책을 새로 정하지 않는 보완 후보 | 구현 후 필요한 판정 |
| --- | --- | --- |
| 입력·초점 · SR01/SR02 | 패널 전환 시 상세 편집 초안을 보존하거나 전환 전 선택을 제공하는 안을 검토한다. 자동 적용·저장은 이 제안에서 전제하지 않는다. 반복 버튼은 화면/주제/게시물의 안정적인 개별 키로 정확한 초점 대상을 식별하는 안을 검토한다 | 제목·메모 변경→진행 조절/기록 패널 열기→상세 복귀에서 입력 동일, 변경 적용 전 해당 편집 입력의 영속 쓰기0. 이후 명시 적용 결과 확인. 두 번째 이상 필터/반응을 키보드로 조작해 같은 대상 초점 유지, 대상 소멸 시 복귀 경로, Tab·ShiftTab·Escape 확인 |
| 좁은 화면 진입 · SR03 | A/B/C에서 숨긴 보조 영역의 가이드 진입을 본문/기존 탐색에 연결. 보조 패널을 좁은 화면에 무조건 다시 펼치지 않음 | 1200/1199px 경계와 다섯 제품 검사 크기에서 실제 UI 경로로 가이드 도달. 직접 hash 진입만으로 통과하지 않음. D의 기존 진입 유지, 가로 넘침·가림·키보드 확인 |
| 본문·선택 상태 · SR04/SR05 | 게시 본문·답글에 한정한 줄바꿈 표시 규칙. escape·저장 문자열·writer 유지. 현재 선택값에 따른 칩 상태 속성 제공 | 연속 줄바꿈·긴 단어·한글·escape 문자가 실제 DOM/화면에 보존되는지 확인. 단일 선택 전환·새로고침·접근성 트리의 이름/상태 확인. AT 사용성 검사는 실제 실행 여부를 별도 기록 |

다섯 제품 검사 크기는390×844·375×812·844×390·1024×768·1440×900이다. 위 표는 아직 실행하지 않은 계획이다. 기획·소스 보완 후 exact 판본의 허용된 실제 렌더/조작이 필요하며, 원본의 차단된 file: 요청을 HTTP 미러·다른 브라우저·간접 실행으로 우회하지 않는다.

현재 제품에는 같은 수정을 일괄 적용할 근거를 찾지 못했다. SR03의 주제 가이드 채택 여부는 [UX-N1 다음의 공개 탐색 비교](../specs/2026-10-02-alpha-ux-comparison-gaps/results.md#다음-ux-개선-범위--초안-복구-화면)에서 실제 출처의 단계 구조와 목적별 진입을 먼저 검토한다. 시안의 임의 단계·가이드 내용을 그대로 제품에 넣지 않는다. 다음 우선 범위 UX-N1(질문·기여 초안 복구 화면)은 그대로 유지한다.

## 검사·변경·완료 경계

- 이번 수신 대조의 제품 기능 실행: **0건**. 새 기능 PASS/FAIL: **0/0**. HTML 렌더·DOM 클릭·키보드·좁은 화면·AT/IME: **NOT_RUN**. 실제 Android Chrome/iOS Safari·관찰 사용자: **미실행/0명**.
- 외부 검토의 코드 수정0·원본 SHA256 보존을 현재 소스로 다시 확인했다. 비교 HTML에 새 확정 결함이 없다는 외부 판정은 이번 정적 범위의 결과다. 기존 모형48/48과 실제 앱r6 30/30을 재실행한 것이 아니다.
- 이번 변경은 이 대조 문서와 기존 요구·QA·후속·현재 상태 연결뿐이다. 제품/HTML 원본·계정·DB/Auth·DNS/Tunnel·서비스·설정·저장 데이터 변경은0이다. commit·push·PR·개발계 교체·Preview·Production은 하지 않았다.
- 필수 잔여인 새 비교 HTML 실제 렌더와 이 세션의 독립 UX2 DOM/클릭은 그대로 남는다. 수신·소스 대조로 [미완료 체크](../specs/2026-10-02-alpha-ux-comparison-gaps/tasks.md)를 통과시키거나 전체 목표를 완료 처리하지 않는다.
