# 검증 계획과 실행 기록

2026-10-02 최종 검증 기록이다. 동결 소스의 통합·npm·타입·사본 빌드와 독립 HTML, 실제 앱 신규35/35·엄격 회귀60/60 PASS·CLI exit0을 확인했다. 정확한7경로×5크기 결과는 `20261002-enabled-final-ui-ack-35-complete`이며 fullMatrix true·runtimeFailureStatus NONE이다. 최초35PASS metadata checkpoint·다음34/1·ACK 단일1PASS·준비 실패0case를 모두 보존했다. 신규 반복 이력은131회·121PASS/10FAIL이다. 최종95개 경로/크기와 중복 합산하지 않는다. 최종 보고5/5·20checks·보호·문서·소유 diff/closeout으로 이번 목표만 완료 판정한다. 전체26개 피드백/424개 요구·새 정책·실사용/배포 완료는 아니다. [결과](results.md)·[요구별 감사](completion-audit.md)와 함께 읽는다.

| 축 | 시나리오 |
| --- | --- |
| 폴더 | 빈/이름/일반 줄·하위 묶음·할 일 속성·날짜·폴더·문서 끝, 기존/새 연결, 줄ID·앞뒤·부모, stale 거절 |
| 작성 | 내용/빈 체크 Enter·중간/선택·ShiftEnter·반복 메모, 자식/시간/메모 보존, Tab 양방향 역연산, 다중 영역/숨은 원문 |
| 날짜 | 어제/오늘/미정·완료/미완료·특정/전체/하위 폴더, 구획/override·같은 제목 다른ID/메모, 변경·Undo/reload·원본 |
| 실패 | 읽기·같은 위치·취소·Escape·stale·거절 저장에서 성공0/입력 보존·기존 공개 사본/회차 권한 |
| 화면 | 390×844·375×812·844×390·1024×768·1440×900, 넘침·예상 밖 console/page error·핵심행동 가림0·비드래그/키보드 |
| 보호 | 기본 /my·운영storage diff0, prefix 밖 Storage0, 실제API/Auth/DB 전달0, 합성 sentinel 동일, 실서비스 소스/자산/설정 불변 |

원래 사용자 환경을 모르는 사례를 합성 재현으로 원인 확인했다고 쓰지 않는다. 독립 HTML은 앱/계정/DB와 분리된 모델이다. 실제 Android/iOS·OS IME·보조기술은 NOT_RUN, 관찰 사용자0명으로 기록한다.

## 현재 실행 결과

| 검사 | 실행 결과 | 근거와 범위 |
| --- | --- | --- |
| 폴더 preview 표적 | 14/14 PASS | 빈/이름/하위 묶음/할 일/날짜/폴더·Flow/문서 끝, source·lineId·stale·ID 소비0 |
| 날짜 표현 순수 표적 | 9/9 PASS | 기존 행 순서·날짜 유지, 지난 미완료/당일 구별, 날짜 출처 |
| 실제 날짜 JSX 표적 | 4/4 PASS | 실제 ProgramSpace 렌더·기존 행/키/transition 연결. 앱 브라우저 조작은 아님 |
| 작성 회귀 표적 | 10/10 PASS | Enter·메모·들여쓰기·부분 보기와 기존 identity 거절 계약 |
| 실제 폴더 JSX 표적 | 8/8 PASS | 편집기의 preview 캡처·표시·확정 전 guard 연결. 앱 브라우저 조작은 아님 |
| 날짜 QA seed 계약 | 5/5 PASS | `emptyAccount`→기존 native seed→새 빈 문서→준비 함수. 정확한 raw·10항목/완료2·3폴더/6소속·진행20·같은 ID·creator/copies/다른 문서·입력 불변. network/DOM0. [검사 파일](../../../scripts/alpha/feedback-ux-date-browser.test.ts) |
| 엄격 회귀 wrapper 순수 검사 | 최종10/10 PASS·CLI exit0 | 이전9/9 PASS 뒤 server preflight1개 추가. 합성60행의 정확한 이름/크기·경계·자산·실패/중복/재시도 거절과 활성화 gate를 검사한 것이며 실제60회가 아님. [검사 파일](../../../scripts/alpha/feedback-ux-regression.test.mjs) |
| 새 driver parameter-only | 7개 seed·작성4계약·폴더6위치 PASS | 서로 다른 계약 분류 수이며 유일 테스트 수로 합산하지 않는다. DOM/callback/Auth/API mock/server/browser 실행0. [driver](../../../scripts/alpha/feedback-ux-browser.ts)·초기 부분 결과의 preflight 기록 (로컬 전용 근거: `output/playwright/feedback-ux-20261002-ready-desktop-smoke/results.json`) |
| QA 도구 scoped 타입 | 최종3 entry·전이 source749·진단0 | 새 main/date helper/date seed test 범위. 공유 wrapper import 전748 source·진단0에서1개 추가. `noEmit:true`, `allowJs:true`, `checkJs:false`이므로 전체 프로젝트/JavaScript 타입 검사나 실제 앱 실행을 입증하지 않는다. 제품 타입578 entry 검사와 별도 |
| 활성화 후 실제 앱 desktop smoke | 7회·4 PASS·3 FAIL·CLI exit1 | 1440×900만 실행, `fullMatrix:false`. `folder-direct`·`folder-input`·`today-source`·`writing-enter` PASS. 작성3실패는 원 결과를 보존하고 원인 대조 중. 결과 JSON (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-desktop-smoke/results.json`) |
| 엄격 기존 앱 회귀 | 60실행·60 PASS·fail/skip/retry0·CLI exit0 | 다섯 크기 각각 정확한12개. 제공 자산24개·빌드 입력1,193개·QA source 전후 보호와 동일 판본 검증. 합성 Auth/API/CAS이며 실제 DB·실기기·관찰 사용자 증거가 아님. 최종 wrapper 결과 (로컬 전용 근거: `output/playwright/flow-execution-journey-regression-20261002-enabled-frozen/frozen-build-result.json`) |
| 통합 new-tests 최종 | 278파일·2,901실행·2,901 PASS | fail/skip/cancel0·CLI exit0·검사 중 source drift0. 최종 JSON (로컬 전용 근거: `output/integrated-product-poc/new-tests-2026-10-02T00-24-21-493Z.json`) |
| npm 최종 | 2,258/2,258 PASS | fail/skip/cancel0·CLI exit0·source drift0. 최종 JSON (로컬 전용 근거: `output/integrated-product-poc/npm-test-2026-10-02T00-25-27-255Z.json`) |
| 타입·인벤토리 | 578 entry·653 source·진단0·drift0, 인벤토리10/10 PASS | Program 통합과 두 route 경계. 타입 JSON (로컬 전용 근거: `output/integrated-product-poc/targeted-types-2026-10-02T00-26-03-790Z.json`) |
| 최종 사본 production build | 입력1,193·원본/사본 drift0·CLI exit0 | buildId `_9wLzKjgWgwPSNGIEkU4R`. 빌드 결과 (로컬 전용 근거: `output/playwright/feedback-ux-isolated-build-2026-10-02T00-24-11-146Z/result.json`)·입력 hash (로컬 전용 근거: `output/playwright/feedback-ux-isolated-build-2026-10-02T00-24-11-146Z/inputs.json`) |
| 독립 HTML 모델·정적 검사 | 26/26 PASS | Lab의 제한된 모델·저장/복구 계약. 제품 parser/writer·앱 검증을 대신하지 않음 |
| HTML preview 충실도 | 9/9 PASS | 초기4줄의 relation/index/locationLabel과 실제 순수 helper 대조. [표적 파일](../../../scripts/alpha/feedback-ux-lab-fidelity.test.ts) |
| 독립 HTML 브라우저 review | Lab5+보고서5=10/10 PASS | 다섯 크기에서 console/page/network/prefix/overflow 오류0. review JSON (로컬 전용 근거: `output/playwright/feedback-ux-artifact/2026-10-02T00-31-25-075Z-737f22-review/results.json`) |
| 이전 보고서 내용 수정 후 재검사 | 5/5 PASS·20 checks | 다섯 크기, 오류/overflow/network/write0·source/response/final hash 일치. 이전 JSON (로컬 전용 근거: `output/playwright/feedback-ux-artifact/2026-10-02T00-39-46-182Z-04af4e-report-final/results.json`) |
|95회 계획·초기 로그인 실패 반영 후 현재 보고 | 5/5 PASS·20 checks | 요구9·검사9·시나리오 묶음4·크기5. source/served/end hash 일치, storage/write/network/error/overflow0. 현재 JSON (로컬 전용 근거: `output/playwright/feedback-ux-artifact/2026-10-02T01-28-30-483Z-22b60a-20261002-expanded-report/results.json`) |
| 보호 before/after | 5범위 unchanged | liveGit/originalGit/source/assets/protected 불변. 결과 (로컬 전용 근거: `output/playwright/feedback-ux-protection-20261002/result.json`) |

제품 표적45회는 14+9+4+10+8의 실행 합이다. 추가 QA seed5회·wrapper10회·parameter-only·QA 타입은 도구 준비 근거로 분리한다. 각 표적·통합·npm·인벤토리·HTML 검사는 범위가 겹칠 수 있으므로 합산한 unique 검사 수나 제품 전체 충족률로 환산하지 않는다. 날짜 seed의 copies 보존 대조는 기존 fixture의 빈 copies를 보존한 것이며 비어 있지 않은 공개 사본의 별도 실행 사례를 뜻하지 않는다.

최종 통합 실행은 UTC `2026-10-02T00:24:21.493Z`에 시작해 `2026-10-02T00:35:09.915Z`에 끝났다. 결과 JSON의 실행 수·종료 코드·source hash를 기준으로 기록한다. 이전 검사나 직전 목표의 PASS를 이번 실행 수에 더하지 않는다.

이전 보고서 SHA256은 `6af93b9f0dcf0675801c45ffc9d73e1cc81183033bc33a8aabeb42053086844f`였다. 확장 계획·초기 실패를 반영한 현재 보고서 SHA256은 `6d6667a79ab27192702b2eb4884418f97ad54364d004b7201264817403ad18ba`이며 제공 응답·종료 해시와 같다. root가 현재390×844·1440×900 캡처를 직접 확인했다. 담당 검증자는375×812의 메뉴 줄바꿈과844×390의 상단/핵심 행동도 확인했다. 화면 캡처는 실기기 또는 관찰 사용자 증거가 아니다.

앞선 중간 마감 감사에서 소유 파일33개를 명시했다. 당시 scoped closeout은 신규 문서 디렉터리를 하나로 묶어25개 entry를 감지했고 실제 검사를 대신하지 않는다. 당시 `git diff --check` exit0, `docs:check` 4/4·16필수·7,059링크 PASS다. UTC `00:42:30.893Z`의 보호 재대조도5범위 unchanged다. root가 최신 Lab375의 폴더 연결/Undo와844 가로의 날짜/완료 캡처를 직접 확인했다. 이후 QA 보완5개 경로가 추가돼 현재 소유 목록은38개이며 모두 존재·중복/누락0이다. 종전 앱75회는 신규35+엄격60=95회 계획으로 확장했으나 전체 실행과 최종 감사는 남아 있다.

이번 `qa.md`·`changed-files.md` 갱신 후 문서 검사4/4·16필수·7,068링크 PASS·CLI exit0와 scoped diff 검사 exit0를 확인했다. 두 파일은 untracked이므로 빈 파일과의 no-index 대조도 따로 실행했다. whitespace 오류0이며 그 exit1은 신규 본문 차이를 뜻한다. 이 문서 갱신에서는 driver/fixture/runtime/build를 수정하거나 앱/서버를 실행하지 않았다.

현재 보고 재검사·작성 성공본 reload 검사 보완 후의 문서 검사는4/4·16필수·7,069링크·exit0다. `workflow:closeout`은 명시 소유 scope29개 entry(38개 파일, 문서 디렉터리10개가 한 entry)·modified8/untracked21을 감지했다. 전체 worktree modified17/untracked45와 구별했으며 이 보고 도구가 실제 검사를 실행하거나 게시 권한을 주는 것은 아니다. 운영 사본과 기본 원본은 유지하고 목표는 active다.

## 최초 실패와 최종 재실행

최초 통합은 2,901실행 중 2,900 PASS·1 FAIL·CLI exit1이었다. 최초 JSON (로컬 전용 근거: `output/integrated-product-poc/new-tests-2026-10-02T00-08-21-663Z.json`)과 원래 로그 (로컬 전용 근거: `output/integrated-product-poc/new-tests-2026-10-02T00-08-21-663Z.log`)를 보존한다.

실패는 `ProgramRecurrence.test.tsx`의 source-only assertion `assert(space.includes('executionRows.map'))`이었다. 날짜 표현이 기존 행에 표시 정보를 붙인 뒤 `executionDayRows.map`을 사용하므로 이전 변수명 문자열 검사와 맞지 않았다. 현행 행·키·같은 transition의 연결을 검사하도록 보정하고 최종 통합을 다시 실행해 2,901/2,901 PASS를 확인했다. 이 실패를 실제 회차 저장 오류로 판단하지 않으며, 최초 실패를 삭제하거나 첫 실행부터 PASS였다고 쓰지 않는다.

QA 준비의 최초 타입 검사에서는 새 seed test에 schema 판별/소속 union의 진단4개가 있었다. 해당 test의 타입 좁히기만 보완한 뒤 진단0과 seed5/5를 재확인했다. parameter-only 검사도 빈 체크 탈출에서 모든 source ID가 유지된다는 가정과 건너뛴 들여쓰기의 Tab 성공 가정을 처음에는 거절했다. 비Item scaffold ID 교체·잘못된 깊이 거절이라는 현행 계약을 그대로 기록했으며 seed나 제품을 바꿔 성공을 만들지 않았다.

## 앱 검사 계획과 실행 상태

신규 driver는 `folder-direct`, `folder-input`, `today-source`, `writing-enter`, `writing-memo`, `writing-region`, `writing-identity-reject`의7경로다. Enter·메모·ShiftEnter·양방향 Tab/ShiftTab·두 폴더 지역·숨은 원문·같은 Item·날짜 변경/Undo/reload·원문 focus/caret를 실제 DOM 조작으로 검사할 계획이다. 작성 Enter/메모는 기존 Undo→원상 reload에 더해 정상 입력의 저장 성공본을 다시 여는 ID/원문/메모/시간/진행 보존과 추가 저장0 검사도 준비했다. 이는 검사 코드 보완이며 실행 PASS가 아니다. 최종 QA 타입3 entry·749 source 진단0, parameter-only 재확인 PASS다. 순수/JSX 검사와 앱 실행을 구분하며 제목 중간 Enter의 identity 거절을 저장 성공으로 세지 않는다. 기존12회귀는 새 엄격 wrapper로 다섯 크기의 정확한60개 결과와 제공 자산/경계를 검사한다.

| 대상 | 현재 상태 |
| --- | --- |
| 실제 앱 신규7시나리오×5크기 | 최종 label `20261002-enabled-final-ui-ack-35-complete`·session6788,35/35 PASS·CLI exit0·fullMatrix true·status NONE. 첫35 checkpoint·다음34/1·날짜 단일1PASS를 별도 보존 |
| 실제 앱 기존 release/folder12시나리오×5크기 | 새60회 PASS·exit0, label `20261002-enabled-frozen`. 다섯 크기 각각12회·fail/skip/retry0. 첫 실행은 최종 보고 전에 중단되어 완료 수 미확정이었고 그 이력을 보존한다 |
| 새 앱의 실제 제공 buildId·JS/CSS hash 대조 | 신규35·엄격60에서 제공 자산24개·동결 입력1,193개·inputHash·QA source 보호를 검증해 차이0. 현재 파일에 대한 독립 읽기 재대조도 차이0 |
| 실제 앱의 폴더 위치·취소·확정·작성·Undo/reload·Today 왕복 | 두 번째35에서34 PASS, Today1440 원문 복귀1 FAIL. 진행/날짜 쓰기 각각 UI ACK 대기를 추가한 단일 Today1440은 source focus3·날짜 적용/Undo/reload PASS. 새 전체35 결과까지 목표 완료 판정 보류 |
| 문서 끝/null 폴더 위치·stale/읽기 guard | 순수/JSX 근거에 한정. 문서 끝의 앱 UI 도달이나 앱에서 stale를 재현했다고 주장하지 않음 |
| 명시 원문 복귀와 reload 커서 | desktop Today 경로에서 명시 복귀의 focus/caret→lineId PASS. reload 뒤 자동 커서 영속복원은 보장/검사로 추정하지 않음 |
| 실제 Android/iOS·OS 붙여넣기·IME·보조기술 | NOT_RUN |
| 관찰 사용자 | 0명 |

초기에는 QA3107 서버 실행 요청이 도구 정책에서 거절돼 실제 앱 검사를 시작하지 않았다. 이후 사용자가 정확한 사본 서버를 켰고 두 소유 QA 작업을 시작했으나, `qa-start.md` 안내에 `FLOWME_ALPHA_ENABLED='development-only'`가 누락돼 앱이 로그인 연결을 fail-closed로 막았다. 이메일 입력을 기다리다 timeout됐으며 폴더/작성/날짜 행동에는 도달하지 않았다. 이는 실행 안내의 누락이지 제품 기능 실패나 사용자 오류가 아니다. 두 작업을 중단했고 그 시점에 감시하던 QA process는 남지 않았다. 활성화 설정 보완과 같은 PowerShell의 재시작을 요청했고, 이후 UTC01:42Z에 준비 전제가 충족됐다. 다른 shell/GUI 또는3105/3106으로 대신하지 않았다.

첫 부분 실패는 label `20261002-ready-desktop-smoke`의 결과 JSON (로컬 전용 근거: `output/playwright/feedback-ux-20261002-ready-desktop-smoke/results.json`)·캡처를 보존한다. 기존 회귀 label `20261002-ready-frozen`은 첫 오류 맥락 (로컬 전용 근거: `output/playwright/flow-execution-journey-regression-20261002-ready-frozen/cloudflare-release.browser-f9e32-hout-outside-storage-writes-390x844/error-context.md`)·캡처·trace를 보존하며 최종 reporter가 없어 실제 완료 수를 추정하지 않는다. 새 공유 preflight는 정확한 buildId, `sb_publishable_synthetic_release`, 비활성화 문구를 검사해 브라우저 실행 전에 거절한다. 보완 뒤 wrapper 순수10/10 PASS는 전제 검사 증거이며 재실행 성공 증거가 아니다.

초기 두 실패 결과의 boundary를 root가 읽기로 재대조했다. 각각 command0·실제API0·prefix 밖 쓰기0·sentinel 동일·console/page error0, 제공 자산24개 모두 동결 사본과 hash 차이0이다. 로그인 전 경계만 확인한 것이며 기능 성공으로 세지 않는다. 사용자 추가 Ready/5분 유지/별도 HTTP200 설명 후에도 같은PID15792·정확한 build·200이나 synthetic auth 표식 없음·비활성화 화면임을 재확인했다. 서버 유지와 앱 로그인 준비를 구별하며 제품/실제 설정을 바꾸지 않는다. UTC01:29:55.476Z 보호 재대조는5범위 unchanged다.

독립 HTML은 실제 앱의 Auth/API/DB와 분리된 시안이다. 충실도 PASS는 초기 네 예시 줄의 위치 대응에 한정한다. Lab은 원문4줄을 고정하고 연결 기록만 추가하지만 제품은 실제 줄을 삽입하거나 같은 lineId의 제목을 선택 폴더 제목으로 교체한다. 연결 뒤 바뀐 줄 번호·전체 serializer 동등성·후속 연결의 좌표 재계산까지 재현한다고 주장하지 않는다.

보호 검사는 로컬 파일/Git hash와 합성 sentinel의 비교다. 논리 DB snapshot·실제 계정이나 운영 DB 상태 검사로 확대하지 않는다. commit/push/PR/merge·개발계 교체·Preview·Production은 모두0이다.

## 세 번째 goal turn의 재검증 — 이후 준비 전제 충족

당시3107/PID15792는HTTP200·정확한 빌드지만, 시험용 로그인 표식은 없고 비활성화 화면을 반환했다. 공유 preflight도 `feedback-regression-synthetic-auth-config-required`로 닫혔으며 그 재확인에서 브라우저 실행0이었다. 당시 진행 중인 앱 검사 process/session은 없었다. 살아 있는 미설정 서버를 실제 QA 진행의 verified wait로 세지 않았다.

최신 피드백 SHA는 여전히26항목 기준과 같고, 정규화한 경로로 재조회한 동결 입력1,193개는 current/copy drift0이다. 재조회 첫 진단은 root가 직접 호출에 Windows 경로를 정규화하지 않아 문자열 구분자 비교에서 실패했다. 실제 wrapper는 환경 진입에서 이미 정규화하며 제품/빌드 실패가 아니다. 호출만 `resolve`로 맞춘 별도 재조회exit0으로 위1,193개를 확인했다. 최초 진단을 성공으로 세지 않는다.

같은 현재 파일로 wrapper10/10·날짜 seed5/5·parameter-only seed7/작성4/폴더6을 재실행해 통과했다. 이 결과는 기능 앱95회와 별개다. UTC01:36:07.522Z의 보호 결과는 liveGit/originalGit/source/assets/protected5범위 unchanged다. 새 정책·실제 계정 자료·운영 설정을 바꾸거나 금지된 서버 시작을 다른 shell/GUI로 우회하지 않았다.

UTC01:42Z 최종 preflight는 build `_9wLzKjgWgwPSNGIEkU4R`·`sb_publishable_synthetic_release` 있음·비활성화 문구 없음으로 전환됐다. 공통 전제 미충족의 blocked-threshold 감사는 준비했지만 `update_goal(blocked)`는 호출하지 않았고 현재 목표는 active다. root가 label `20261002-enabled-desktop-smoke`의 desktop7회(session74776)와 `20261002-enabled-frozen`의 엄격60회(session5071)를 시작했다. 당시 두 실행의 시작을 RUNNING으로 기록했으며 matrix PASS로 기록하지 않았다. 실제 DB/Auth/API 전달은 합성 경계 안에서0을 요구하며 실서비스 자료 변경·게시·배포는0으로 유지한다.

이후 desktop7회는4 PASS·3 FAIL·CLI exit1로 종료됐다. PASS는 `folder-direct`, `folder-input`, `today-source`, `writing-enter`다. 날짜의 완료/필터·날짜 적용·같은 ID/기록 보호·Undo/reload·명시 원문 복귀는 실제 DOM에서 확인했지만1440×900 하나의 근거이며 다섯 크기 통과가 아니다. 엄격60회는 UTC01:43:01.928Z에 시작해01:45:45.066Z에 종료됐고 최종 결과의 `ok:true`·exit0·60실행/60 PASS·fail/skip/retry0을 직접 확인했다. 다섯 크기 각각12개, 실제 제공 자산24개가 일치한다. buildId `_9wLzKjgWgwPSNGIEkU4R`, inputHash `d398849e2be01d14b732bdf2d0fd4c57a94d26127c625f927f80f6239b2d235c`, source1,193개·전후 차이0이며 신규35회 PASS로 확대하지 않는다.

| v1 desktop 실패 경로 | 확인한 실패 | 당시 판정 — 이후 결과는 아래 이력 참조 |
| --- | --- | --- |
| `writing-memo` | UI command 전에 `assert(parent && child && homonym)`의 자식 항목 조회 실패, command0 | `M.tasks`는 canonical 계획 항목이고 source `parse.items`에는 자체 ID의 하위 checkbox가 포함된다. driver 조회의 차이를 확인했으나 다음 브라우저 성공 전 메모 경로 수정 완료/PASS로 판정하지 않음 |
| `writing-region` | 두 지역 저장 뒤 두 번째 Undo 버튼이 disabled라 timeout | Alpha 서버 동기화는 최신 성공1개의 Undo이며 native history stack과 다르다. 연속2회 가정의 차이를 확인했으나 다음 브라우저 성공 전 두 지역 전체 경로 PASS로 세지 않음 |
| `writing-identity-reject` | 허용 prefix Storage 횟수3→4로 `noChange` 실패, account/mutation/command 변화0 | 제목 중간 거절 입력의 local UI recovery 기록과 server writer를 구분한다. exact key/value 추적은 아직 NOT_RUN이며 운영 자료 쓰기나 identity 저장 성공으로 추정하지 않음 |

세 실패의 원 JSON·캡처를 보존하며 입력을 교체하거나 재실행 없이 통과로 바꾸지 않는다. 원인 분류와 이후 안전한 검증 보완은 별도 기록해야 하며 이 문서 갱신에서 driver/fixture/runtime/build를 수정하지 않았다.

소스의 제한을 읽기로 확인했다. [text model](../../../lib/flow/integrated-poc/vendor/text-model.cjs)은 `M.tasks`의 canonical 항목과 `parse.items`의 하위 Item을 구별하므로 하위 Item을 확인하려고 새 canonical 항목을 만들지 않는다. [Alpha sync controller](../../../lib/flow/integrated-poc/alpha-sync/controller.ts)는 최신 성공1개를 보관하고 Undo 성공 뒤 그 Undo를 비운다. [native store](../../../lib/flow/integrated-poc/program-store.ts)의 history stack을 Alpha 서버의 연속 Undo 계약으로 대입하지 않는다.

[AlphaWorkspace](../../../components/flow/integrated-poc/AlphaWorkspace.tsx)의 입력 capture는 [허용된 UI recovery record](../../../lib/flow/integrated-poc/alpha-ui-recovery.ts)를 따로 보관한다. 편집기의 `저장본으로 되돌리기`는 편집 draft를 되돌리는 동작이며 기존 recovery record를 자동 삭제한다는 보장이 아니다. 합성 UI의 별도 `보관 입력 버리기`에서 정확한 key만 제거되고 다른 저장본/서버 자료가 그대로인지 검사할 예정이다. exact key/value·원문 복원·명시 제거의 다음 브라우저 증거는 아직 NOT_RUN이다. 현행 source 계약을 확인한 것과 수정/재검증 완료를 구별하며 세 실패를 제품 버그로 성급히 확정하지 않는다.

이 실행 상태 갱신 후 문서 검사는4/4·16필수·7,070링크·CLI exit0, scoped diff 검사 exit0다. 앱 기능 검사나 서버 실행을 다시 수행한 결과가 아니다.

엄격60회 완료 근거와 source 계약의 제한을 반영한 문서 검사는4/4·16필수·7,076링크·CLI exit0다. 표의 QA 타입/parameter-only는 첫 desktop 실행 전 검증 checkpoint다. 진행 중인 세 QA assertion 보완을 재검증 없이 통과한 것으로 쓰지 않는다.

## v2 desktop 재실행 이력

label `20261002-enabled-v2-desktop-smoke`의 원 결과 JSON (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-v2-desktop-smoke/results.json`)을 보존한다. 1440×900의7회는5 PASS·2 FAIL이며 `fullMatrix:false`다. 동일 buildId/inputHash의 실제 앱을 사용했지만 신규35회 전체 PASS가 아니다. 앞선 desktop4 PASS·3 FAIL과 초기 로그인2 FAIL·5 NOT_RUN을 지우거나 새 결과로 덮지 않는다.

PASS는 `folder-direct`, `folder-input`, `today-source`, `writing-enter`, `writing-memo`다. 메모는 canonical 계획 목록과 하위 Item 조회를 구별한 QA 보완 뒤 실제 UI에서 PASS로 해소됐다. 이는 제품/seed/fixture 변경 없이 확보한 단일 desktop 경로의 결과이며 다섯 크기로 확대하지 않는다.

| v2 실패 경로 | 원 결과 | 보완 상태 |
| --- | --- | --- |
| `writing-region` | 저장/Undo/Redo 경로의 합성 명령6개 뒤 `getByRole('status')`가 `저장됨`과 전체 문서 안내2개를 함께 선택해 strict-mode violation | 정확한 안내 하나를 선택하는 locator의 QA-only 보완 중. 전체 경로 PASS나 보완 완료를 주장하지 않음 |
| `writing-identity-reject` | exact-key 검사에 진입하기 전 `page.evaluate`의 named helper 직렬화에서 `ReferenceError: __name is not defined` 발생 | 직렬화 payload를 JS 문자열/inline loop로 한정하는 QA-only 보완 중. exact key/value·보관 원문·명시 제거 증거는 아직 미입증 |

제품·합성 seed·fixture·전역 `noChange` 계약은 변경하지 않는 범위로 보완한다. 다음 브라우저 결과가 없으므로 위2개를 PASS로 고치지 않는다. 목표는 active이며 신규35회·전체95회 충족은 미입증이다. 엄격 기존60/60 PASS와 구분한다. 이 기록 추가에서는 `qa.md`만 편집했고 다른 파일 편집이나 검사/앱/서버 추가 실행은 하지 않았다.

## v3·v4 읽기 진단과 v5 bounded 검사

v3 desktop은7회·6 PASS·1 FAIL이며 `writing-identity-reject`까지 PASS로 해소됐다. 정확한 해당 owner/tab의 session UI recovery key에 `setItem`1회, 명시 `보관 입력 버리기`의 `removeItem`1회, `clear`0을 확인했다. 보관 raw·source ID/진행·다른 local/session bytes는 유지했고 server writer/계정/CAS/mutation 변화0이었다. `저장본으로 되돌리기`가 기존 record를 유지하는 것과 별도 명시 제거를 구별해 실제 UI에서 검사했다. v3의 남은 지역 FAIL은 즉시 역연산 뒤 허용 Storage 횟수25→26을 전역 `noChange`로 비교한 결과다.

v4는 지역1회만 실행한 진단이며0 PASS·1 FAIL을 그대로 보존한다. `writing-inverse-storage-diagnostic`을 root와 독립 감사자가 직접 읽어 비교했다. 첫 Tab의 중간 raw가 정확한 합성 owner/tab의 session `alpha-ui-recovery` key1곳에 `setItem`1회 보관됐다. local 전체와 그 key를 제외한 session 키/bytes는 불변, account bytes·CAS revision·command·mutation·operation 증분은 모두0이었다. 본 감사에서도 정확한 key·schema·owner/tab·draft1개·첫 Tab 들여쓰기와 다른 bytes 불변을 재대조했다. 원 strict assertion의 FAIL을 통과로 바꾸지 않았다.

현행 vendor가 실제 편집을 publish해 dirty가 되면 `AlphaWorkspace.captureInput`이 그 중간 원문을 보관한다. inverse 뒤 dirty=false가 되어도 기존 backup을 자동 삭제하지 않는다. 따라서 실제 편집→inverse의 shadow 보관은 폴더 읽기·preview·취소의0쓰기 계약과 구분한다. 전역 `noChange`를 느슨하게 만들거나 허용 prefix의 임의 쓰기를 통과시키지 않는다. 정확한 session key/record·중간 raw·다른 bytes 불변에 한정한 검사를 별도로 둔다.

v5의 지역1회는1/1 PASS·CLI exit0이다. 두 방향 즉시 inverse의 raw/caret/model 복귀·account 저장0과 그 중간 입력의 정확한 session `setItem`2회, 명시 `removeItem`1회, `clear`0·다른 local/session bytes 불변을 확인했다. 원본/사본 runtime 입력1,193개 차이0이며 제품·seed·fixture·전역 `noChange` 변경 없이 QA의 정확한 저장 경계만 보완했다. 원 실패 v1~v4는 남긴다. 이는1440×900의 단일 지역 결과이지 신규35회 전체 PASS가 아니다.

## JSON별 실제 실행 이력 집계

아래 수는 각 원 JSON의 `results` 배열과 `ok`를 직접 집계한 실행 이력이다. 동일 시나리오/크기의 반복 시도를 포함하므로 최종95회의 유일 실행 수나 완료 수로 합산하지 않는다. 초기 disabled의2회는 로그인 단계까지만 도달했다. v4/v5의 다른6경로는 미실행 실패가 아니라 단일 진단의 대상 밖이다.

| 원 label·JSON | 실제 기록 | PASS | FAIL | 범위·나머지 |
| --- | ---: | ---: | ---: | --- |
| 20261002-ready-desktop-smoke (로컬 전용 근거: `output/playwright/feedback-ux-20261002-ready-desktop-smoke/results.json`) | 2 | 0 | 2 | 1440×900·예정7 중5 NOT_RUN, 로그인 단계 |
| 20261002-enabled-desktop-smoke (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-desktop-smoke/results.json`) | 7 | 4 | 3 | 1440×900·v1 |
| 20261002-enabled-v2-desktop-smoke (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-v2-desktop-smoke/results.json`) | 7 | 5 | 2 | 1440×900·v2 |
| 20261002-enabled-v3-desktop-smoke (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-v3-desktop-smoke/results.json`) | 7 | 6 | 1 | 1440×900·v3, identity 정확 저장 경계 PASS |
| 20261002-enabled-v4-region-storage-diagnostic (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-v4-region-storage-diagnostic/results.json`) | 1 | 0 | 1 | 1440×900·지역 읽기 진단, 원 strict FAIL 유지 |
| 20261002-enabled-v5-region-bounded (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-v5-region-bounded/results.json`) | 1 | 1 | 0 | 1440×900·bounded 지역 검사 |
| 초기~v5 소계 | 25 | 16 | 9 | 여섯 JSON 모두 `fullMatrix:false`; 초기5 NOT_RUN은 실행 합에 넣지 않음 |
| 20261002-enabled-final-35 (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-final-35/results.json`) | 35 | 35 | 0 | 5×7·고정 FAIL 메타데이터 보완 전 checkpoint |
| 20261002-enabled-final-35-report-metadata (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-final-35-report-metadata/results.json`) | 35 | 34 | 1 | 5×7·실제 status FAIL, Today1440 원문 복귀 실패 |
| 20261002-enabled-date-ui-ack-1440 (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-date-ui-ack-1440/results.json`) | 1 | 1 | 0 | 1440×900·Today ACK 보완 단일 검사, `fullMatrix:false`·status NONE |
| 20261002-enabled-final-ui-ack-35-complete (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-final-ui-ack-35-complete/results.json`) | 35 | 35 | 0 | 최종5×7·fullMatrix true·status NONE·CLI exit0 |
| 최종 반복 포함 이력 합 | 131 | 121 | 10 | 열 JSON·반복 포함. 엄격 기존60·미실행5·준비 실패0case·완료 수 미확정 중단 회귀 제외 |

기존 엄격60/60 PASS는 별도 결과다. 최초 중단된 엄격 회귀는 최종 reporter가 없어 완료 수가 미확정이므로 위 합에 넣지 않는다. v5 JSON의 `runtimeFailureStatus`에는 고정 `FAIL; exact inputs never retried or replaced` 문구가 남아 있어 실제1개 `ok:true`·CLI exit0과 구분한다. 원 산출물을 수정하지 않았으며 최종 판정은 case별 결과와 matrix·빌드/경계 검증을 기준으로 해야 한다.

main SHA256 `c5772355084c4d3b8ed87f1391710716a6a9d3e1f54eff65e9496d2db8954139`의 동결 뒤 label `20261002-enabled-final-35`로7경로×5크기(session61062)를 실행했다. checkpoint 원 JSON (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-final-35/results.json`)을 직접 집계해35개 `ok:true`·실패0·`fullMatrix:true`, 경로별5개와 크기별7개를 확인했다. CLI exit0도 보고됐다. 원 `runtimeFailureStatus`의 고정 FAIL 정책 문구와 실제35개 성공이 충돌하므로 원 파일은 유지하고 최종 근거의 표현을 명확히 하기 위한 reporter 상태 산출1줄 보완 뒤 새 label의35회로 재확인할 예정이다. runtime 입력1,193개는 그대로이며 이 보완 전35회는 checkpoint로 기록한다.

이 checkpoint35회는 위 반복 이력25회와 별도 실제 실행이다. 어느 원 실패를 삭제하거나 checkpoint를 신규95회 최종 완료로 환산하지 않는다. 새35회 최종 근거가 도착하기 전 목표는 active다. 이 갱신은 `qa.md`에만 한정했고 driver/fixture/runtime/build 수정이나 검사/앱/서버 추가 실행은 하지 않았다.

## reporter 보완 뒤 원34/1·날짜 ACK 단일·준비 실패

두 번째 전체35회 label `20261002-enabled-final-35-report-metadata`는34 PASS·1 FAIL이며 `fullMatrix:true`·`runtimeFailureStatus:FAIL`이다. FAIL은 `today-source`1440×900에서 첫 진행 기록의 합성 server postimage를 읽은 뒤 명시 원문 복귀를 시도했지만 개인 문서 textarea를 찾지 못한 timeout이다. 그때 원 JSON은 text 명령1·mutation1·operation1을 기록한다. 서버의 저장본을 읽는 것과 화면이 receipt를 받아 복귀 가능한 상태가 되는 것을 구별해야 하며, 원 실패를 제품 날짜 손실로 확정하거나 메타데이터 오류로 무시하지 않는다.

QA helper는 진행 쓰기와 날짜 쓰기 각각에서 실제 UI의 Undo enabled를 기다린 다음 원문 복귀 키를 한 번만 누르도록 보완했다. 단일 label `20261002-enabled-date-ui-ack-1440`은1/1 PASS·CLI exit0·`fullMatrix:false`·status NONE이다. `progress-write-ui-receipt-ack`와 `date-write-ui-receipt-ack`가 있고 두 번 모두 `sourceReturnRetried:false`다. 원문 focus/caret3곳, 동일 Item/date 출처, 날짜 적용1·Undo1·reload writer0·기존 기록/소속 보존을 확인했다. 단일1440 결과를 새 전체35회로 확대하지 않는다.

이후 label `20261002-enabled-final-ui-ack-35`의 호출은 `FLOWME_CLOUDFLARE_QA_LOCAL_PORT` 누락으로 build preflight에서 종료됐다. 준비 실패 원 JSON (로컬 전용 근거: `output/playwright/feedback-ux-20261002-enabled-final-ui-ack-35/runtime-failure.json`)을 보존한다. 브라우저/시나리오0·예정35 NOT_RUN이며 실행 합과 앱 FAIL10회에 넣지 않는다. 이는 root의 호출 전제 누락이며 앱 기능이나 사용자 오류가 아니다. 정확한 env로 새 label `20261002-enabled-final-ui-ack-35-complete`·session6788을 실행해 최종35/35 PASS·exit0을 확인했고 실행 중 source/QA 차이는0이었다.

원 실패와 최종 결과를 합친 신규131회·121PASS/10FAIL은 반복 시도의 원장이다. 최종 신규35+기존60의95개 경로/크기 충족과 별도로 기록한다. 읽기·폴더 preview/취소의 strict0쓰기와 실제 편집→inverse의 정확한 owner/tab shadow record 예외를 그대로 구분한다. 후자의 account/CAS/command/mutation/operation 증분0은 해당 단계의 계약이고 날짜/메모 정상 저장의 합성 명령 전체가0이라는 주장은 아니다. 실제 외부 API/Auth/DB 전달0·운영 key/value 불변·실서비스/게시/배포0 경계도 유지한다.

## 원장26항목 마지막 읽기 대조

UTC `2026-10-02T02:28:25.792Z`에 원장 `D:/flowme2605/flow-mvp/docs/content-audit/2026-09-28-flowme-use-feedback-session-ko.md`의1~26 본문을 빠짐없이 다시 읽고 번호·중간 정정·[요구 대조](requirements.md)를 확인했다. 번호26개·누락0, SHA256 `D862834C3BF1B62D1EE7C12514B5E2389EB33A26283C9C5AFE1D259FE7A30A62`,32,656bytes, mtime UTC `2026-10-01T23:32:25.556Z`로 직전 감사와 같다. 원본을 수정·복사·stage하지 않았다.

| 원 번호·원장 시작 줄 | 이번 대조와 남는 경계 |
| --- | --- |
| #1·11줄 | 서버 업데이트 빈도의 체감. 원 요청량 측정/원인 확인은 미실행 |
| #2·18줄 | 웹/모바일 추가 관찰 뒤 `전체`가 아닌 폴더 필터였다는 정정 유지. 종료된 오류 제보를 sync/data bug로 되살리지 않음 |
| #3·4·5·26/33/40줄 | 문서 완성도·폴더 표현·문서/폴더 관계는 일반 평가. 이번 위치 안내/소속 보완을 원환경 전체 해결로 확대하지 않음 |
| #6·13·21·47/100/165줄 | B3 즉시 역연산·선택/지역·두 scope/숨은 원문/전체 보기와 연결. 전체 렌더 변동의 원사례 재현이나 모든 부분 구조 편집 성공은 아님 |
| #7·12·18·54/92/139줄 | 탐색·캘린더·제작의 사용 주소/공개/진입 조건 미확인 유지. 격리 QA로 원 배포의 빈 화면 원인을 확정하지 않음 |
| #8·61줄 | 잡아 이동한 원 조작 실패 미확인. 비드래그/키보드 검사와 실장치 drag 해결을 구별 |
| #9·10·26·68/75/217줄 | A1 명시 폴더 선택·같은 줄/실제 삽입·하위 묶음 뒤 preview/Undo와 연결. `항상 바로 아래` 정책이나 원 중복 사례 원인 확정 아님 |
| #11·84줄 | 시간 입력의 발견성 미확인. 시간 속성 보존 QA가 발견성 검증을 대신하지 않음 |
| #14·23·24·108/192/199줄 | C1/C2 개별·폴더 맥락·완료/미정·원래 날짜/출처와 날짜 적용/Undo/reload. #23 오류 확정0, 구획 이동/미정 우선순위 새 정책 확정0 |
| #15·16·115/124줄 | #15 추가 발언의 내용 있는 첫 Enter·빈 체크 탈출·중간 Enter 거절을 분리. #16 반복 메모/같은 Item과 새 들여쓴 본문/빈줄 종료 문법을 구별 |
| #17·20·131/155줄 | #20 기존/새 이름의 타이핑·붙여넣기 추가 관찰까지 포함. 명시 제안/확정과 자동 연결·@/#·부분일치·정규화·rename/move 후속 정책을 구별 |
| #19·147줄 | 실제 폴더 경로/문서/현재 필터 맥락을 보존하고 날짜 순서를 유지. 원 사용 화면에서 충분히 보였는지의 관찰은 미확인 |
| #22·183줄 | 같은 제목의 다른 ID·개별 메모 보존. 이동/복제/반복 회차·공통/회차 메모의 독립 비교를 새 운영 반복 writer로 승격하지 않음 |
| #25·208줄 | 예정일과 due의 구분은 독립 시안 비교/후속 선택. 별도 due schema/문법·마감만 있는 노출·반복 회차 due 확정0 |

전26항목이 이번9요구 묶음 또는 원환경 미확인/후속 범위로 연결돼 있으며 신규 구현 완료로 묶어 판정하지 않는다. 이 마지막 정리는 `qa.md`·`changed-files.md`에만 반영하며 다른 root-owned 문서나 원장을 수정하지 않는다.

## 최종 앱·보고·보호·소유 판정

최종 신규35/35는 정확한5×7, 실패0·CLI exit0·fullMatrix true·status NONE이다. JSON SHA256은 `58f2101c1607bb45afbf0024a51b3519ded3e6354ccef706a4c89763adcde141`이다. 독립 읽기 감사에서 현재/사본1,193입력·신규QA8/기존QA8 차이0, 자산24개×35행840관측 모두 동일을 확인했다. 진행/날짜 UI ACK10곳·명시 원문 복귀15곳·지역 bounded 복구10·identity 거절5를 대조했다. 이전34/1 JSON SHA `97808f94b26aefcf23dca3943e81f141a4c401891f948f0e9732ee38d02d2d62`와 원 FAIL은 그대로다. 기존60의 현재 QA8/자산도 읽기 전용 재검증에서 차이0이었다.

최종 보고 화면 결과 (로컬 전용 근거: `output/playwright/feedback-ux-artifact/2026-10-02T02-35-30-655Z-20fdee-final-ui-ack-closeout/results.json`)는5/5·20checks PASS·오류/원격/prefix 밖 쓰기0이다. 보고 소스/제공 응답/종료 SHA256은 `3ad179b85307febf8286304f28a041fa95975983084238d9401304bd95d77c15`로 같으며 root가390/1440 화면을 직접 확인했다. 조작 HTML SHA `20cdb71d2f3e6e051e558626bd054ff2a6a1369972c0944751764070cad4c63a`는 기존5크기35checks PASS 판본과 같다. 첫 보고 호출은 `--report-path` 누락으로 브라우저 전에0case 종료한 준비 오류이며 수정된 인수로 위5개를 실행했다. 앱131회 집계에 넣지 않는다.

최종 보호 대조 UTC02:39:10.886Z에서 liveGit/originalGit/source/assets/protected 다섯 범위가 모두 불변이다. source639/static81/보호7·피드백 원장26항목의 hash가 같으며 실제 DB 전수 snapshot으로 확대하지 않는다. scoped closeout UTC02:36:24.867Z는29Git entries(8modified/21untracked), 실제 파일38개를 확인했고 직전 dirty와 구별했다. 두 TSX의 전체 HEAD diff에는 직전 schedule/ACK 변경이 섞여 있으므로 전체 diff를 이번 소유/게시 승인으로 확대하지 않는다.

문서 검사4/4·필수16·지역 링크 검사·skill sync PASS와 diff check0을 확인했다. 소유38파일·9요구 묶음·원장26개 정정·최종 판본/경계의 독립 대조에서 이번 spec의 추가 미구현 MUST는 찾지 못했다. 전체 UX·424요구·새 due/반복/문법 정책·실기기/IME/AT·관찰 사용자 검증은 제외/후속이다. commit·push·PR·merge·개발계 반영·Preview·Production은0이다.
