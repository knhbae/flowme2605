# 완료 전 요구별 검증 감사와 최종 재대조

2026-10-02. 아래 표와 선행조건 감사는 완료 전에 발견한 검증 누락과 당시 상태를 보존한 기록이다. 누락을 보완한 최종 신규35/35·엄격 기존60/60 PASS·exit0을 확인했다. 최초 실패·metadata 정정·34/1과 UI ACK 단일1회/전체35회 재검사를 [QA 기록](qa.md)에 분리했다. 결과를 제품 전체 UX 완료로 확대하지 않는다.

## 기존 계획의 부족한 범위

기존 신규3시나리오×5크기와 기존12회귀×5크기, 총75회 계획에는 작성 Enter·메모 이어쓰기·들여쓰기 역연산·두 폴더 지역 편집의 실제 앱 assertion이 없었다. 날짜 입력 후 Escape만으로 실제 날짜 변경·같은 ID 보존·Undo를 확인할 수 없고, raw/docId 대조만으로 정확한 항목 위치에 돌아왔음을 입증할 수도 없다. 실제 검사를 실행하기 전이므로 원 PASS를 바꾸는 것은 아니며, 미실행 계획을 보완하는 것이다.

| 요구 | 이미 확보한 근거 | 추가 앱 검사 또는 명시 한계 |
| --- | --- | --- |
| A1 실제 연결 위치·선택 안전 | 폴더 순수14·실제 JSX8 PASS. 읽기 snapshot과 stale/docId guard | 하위 묶음 뒤 확정/Undo/reload에 더해 같은 줄·할 일/날짜 아래·소속 안의 preview/취소를 보완한다. UI에서 도달하지 않는 문서 끝과 stale/읽기 guard는 순수/JSX 근거로 분리한다 |
| A2 입력 이름·동명 경로·명시 선택 | 기존 정확 이름 predicate·동명 ID/path, 순수/JSX PASS | 타이핑·붙여넣기 결과 모사·제안 닫기·Escape·기존/새 연결·저장 거절/재시도/Undo. 실제 OS clipboard/IME는 NOT_RUN |
| B1 Enter와 새 항목·비항목 경계 | 실제 shipped callback을 실행한 작성 회귀 PASS | `writing-enter`: 속성/자식 뒤 형제와 빈 체크 탈출. 비Item scaffold의 줄 ID 교체와 기존 실제 Item ID 보존을 구별한다 |
| B2 같은 Item 메모·기록 | 반복 메모 속성·부모/자식 귀속·다른 ID 메모 회귀 PASS | `writing-memo`: 실제 Enter/ShiftEnter·부모/자식 note·시간/진행/ID 보존·저장/Undo/reload |
| B3 들여쓰기·지역/전체 원문 | 즉시 inverse·lease 만료·비연속 지역·숨은 bytes 회귀 PASS | `writing-region`: 양방향 즉시 inverse, 두 지역 메모 편집·숨은 원문/ID/완료·별도 저장 Undo·전체 보기. 구조 변경 거절을 편집 성공으로 세지 않는다 |
| B1/B3 모호한 identity 거절 | 제목 중간 Enter의 기존 `identity-ambiguous` 거절·입력 보존 회귀 PASS | `writing-identity-reject`: 실제 키 입력 후 저장본/command/mutation 불변·입력 보관·명시 취소. 모든 Enter 저장 성공으로 표시하지 않는다 |
| C1 오늘·완료·폴더 맥락 | 날짜 순수9·실제 JSX4 PASS. 원 #2의 필터 정정 유지 | `today-source`에 지난/오늘 완료·미완료·미정·미래와 전체/특정/하위 폴더의 정확한 Item ID 대조 추가 |
| C2 날짜 적용·동일 Item·Undo | 구획/개별 출처와 같은 row/key/order 보존 PASS | 날짜 속성 한 줄 변경→ID/note/time/소속/진행 보존→Undo→reload. 개인 문서의 허용된 날짜 writer만 쓰며 제작/공개 원본 불변 |
| C3 동명 항목·정확 원문 복귀 | 다른 ID 자동 병합 없음·독립 메모 보존 PASS | 명시 원문 버튼의 실제 키보드 동작 후 focus·selection offset→lineId를 검사한다. reload의 자동 커서 영속복원은 별도 보장으로 추정하지 않는다 |
| C4 due·구획 이동·반복 정책 | 독립 HTML 모델26·초기 위치 충실도9, 조작5크기 PASS | 운영 앱 기능이 아닌 비교 제안이다. 영구 schema/문법·복제·새 반복 writer 확정은 이번 목표에서 하지 않는다 |

## 판본·보호·산출물

| 요구 | 현재 증거/판정 |
| --- | --- |
| 전체 자동 검사 | 표적45·npm2,258·통합2,901 PASS, 타입578 entry 진단0. 집합이 중복하므로 유일 수로 합산하지 않는다 |
| production build와 현재 일치 | 입력1,193·build `_9wLzKjgWgwPSNGIEkU4R`. 현재 소스와 사본 hash1,193개를 재대조해 차이0 |
| 실제 제공 앱의 같은 판본 |3107 HTTP200·정확 buildId와 실제 자산24개·현재/사본1,193개 일치. 최종 신규35/35·기존60/60 PASS. 로그인 전 확인을 기능 PASS로 대체하지 않음 |
| 검사 도구의 거짓 PASS 방지 | 신규 회귀 runner 순수10/10·날짜 seed5/5 PASS. 합성 reporter/seed 검사이며 실제60/35회를 실행한 결과가 아니다 |
| 다섯 화면·키보드·오류/가림 | 신규7경로×5크기·기존12회귀×5크기 PASS, console/page/overflow0·핵심 행동 hit/키보드 확인. 독립 조작/최종 보고 각각5크기 PASS |
| 운영 저장·실제 API 전달 | 신규35·기존60의 prefix 밖 Storage/clear·실제 API/Auth/DB 전달0·운영 sentinel byte 동일. 역연산/거절의 허용된 정확 복구 키와 서버0쓰기를 구별 |
| 실서비스/원본 보호 | 원본/실행 Git·live source639·static81·보호 파일7의 전후 hash 동일. 실제 DB 전수 snapshot은 아님 |
| 조작 HTML·요구별 보고 | 파일 작성·최종 보고5/5·20checks PASS, 제공/소스/종료hash 같음. 최초 실패와 현재 최종 결과·잔여를 구별 |
| 게시/배포·관찰 | commit/push/PR/merge·개발계 교체·Preview/Production·실기기0, 관찰 사용자0 |

## 실행 전 준비와 최초 실패 이력

신규 드라이버는 기존3+작성4=7시나리오×5크기, 35회를 준비했다. 기존60과 합쳐95회 계획이다. 이는 예정 수이며 실행 수가 아니다. 작성/날짜 보완의 타입·합성 seed와 순수 매개변수7/4/6 계약을 확인했다. 사용자가 켠 정확한3107 사본에서 실행하며 다른3105/3106 서비스나 독립 HTML로 대신하지 않는다.

처음 Ready 응답에서는3107 연결이 없었다. 이후 사용자 Ready에서3107/PID15792·HTTP200·정확한 buildId가 확인돼 검사를 시작했다. 다만 Codex 실행 안내에서 활성화 설정을 누락해 ‘개발계 연결이 꺼져 있습니다’로 fail-closed했다. 신규 smoke2건은 로그인 전 timeout이며 나머지5건은 NOT_RUN, 기존60은 최종 reporter 없이 중단돼 완료 수를 확정하지 않는다. 원 결과를 보존하고 안내를 고쳤다. 두 드라이버의 사전 검사도 정확한 빌드·시험용 로그인 설정까지 확인하도록 보완했다. 사용자에게 같은 PowerShell에서 빠진 설정 한 줄 후 재실행을 요청했다. 실행 도구 차단을 다른 shell/GUI로 우회하지 않으며 최종 앱 결과 없이 목표를 완료하지 않는다.

## 당시 blocked 판정 전 감사와 선행조건 해소 이력

| goal turn | 동일한 공통 선행조건과 실제 진전 |
| --- | --- |
| 최초 `01a0f9d9-ea6c-79b0-98d1-02f5ffddfeb8` | 별도3107 실행 제한으로 실제 앱 검사 미실행. 구현·자동 검사·build·HTML·보고의 안전한 범위는 진행 |
| 연속 `01a0fa11-c3e2-7b61-a3e2-3b62a6c7e28e` | 사용 가능한 시험 환경 부재 지속. 준비 검사의 작성/날짜 누락을 보완하고 사용자3107에서 정확한 빌드는 확인했지만 안내 flag 누락으로 로그인 전 중단. 원 실패/설정 수정·공유 preflight·보고 재검사 진행. 분류는 progress |
| 현재 `01a0fa3e-c045-7913-8554-06ede34bdc14` | 같은PID/200/정확 build이나 합성 로그인 설정이 없고 gate 닫힘을 재검증. 살아 있는 앱 QA job 없음. 같은 입력1,193 drift0·원장26항목 hash동일·순수 도구/seed·운영 보호까지 재확인 |

표현은 서버 미실행→로그인 비활성화로 바뀌었지만 실제 앱 검사를 시작할 수 있는 합성 환경이라는 동일 선행조건이다. 살아 있는3107을 앱 QA의 verified wait로 세지 않는다. 원 요청을 축소하거나 독립 HTML/준비 코드로 앱95회의 성공을 대체하지 않는다.

독립 읽기 감사에서도3107 없이 진행할 추가 필수 구현/검사 누락은 찾지 못했다. 남은 MUST는 신규35·기존60의 다섯 크기 실행과 그 뒤 최종 보호·보고·closeout이다. 작성 성공본 reload/지역 편집/모호한 identity 거절·날짜 적용/같은ID/Undo/reload/정확한 원문 focus는 준비 코드에 연결돼 있지만 미실행이다. 문서 끝/읽기/stale·실기기·새 due/반복 정책의 명시된 근거/제외 경계는 유지한다.

blocked 판정을 준비했지만 최종 현재상태 재조회에서HTTP200·정확 build·synthetic 로그인 표식·비활성화 화면 없음이 확인됐다. 따라서 blocked 도구는 호출하지 않았으며 목표는 계속active다. 선행조건 해소 후 새label에서 데스크톱7 smoke와 엄격60회 실행을 시작했다. 아직 전체95회 PASS나 완료로 판정하지 않는다. 목표·38개 소유 경로·원 실패는 보존하고 commit·push·PR·서비스 교체·배포 권한을 새로 추정하지 않는다.

## 최종 요구 재대조 — 위의 대기 상태를 해소한 결과

최종 신규 JSON `feedback-ux-20261002-enabled-final-ui-ack-35-complete/results.json`은 정확한7경로×5크기35/35 PASS·exit0·fullMatrix true·runtimeFailureStatus NONE이다. SHA256은 `58f2101c1607bb45afbf0024a51b3519ded3e6354ccef706a4c89763adcde141`이다. 기존 엄격60/60 PASS·exit0·retry0의 QA 입력8개와 실제 자산을 현재 파일에 다시 대조해 차이0을 확인했다. 실제 브라우저 재실행과 읽기 전용 재대조를 구별한다.

| MUST | 최종 근거 | 남겨 둔 제한 |
| --- | --- | --- |
| A1 위치와 선택 안전 | 실제 직접 연결5/5·순수14·JSX8, 원문/하위 ID 보존·취소0쓰기·확정·Undo/reload | 문서 끝/읽기/stale는 순수/JSX 근거, 원 #26 환경이나 위치 정책 변경은 아님 |
| A2 이름과 경로 | 실제 입력 연결5/5·정확 이름/동명 경로·거절/재시도/Undo | DOM 붙여넣기 결과 모사이며 OS clipboard/IME 아님 |
| B1/B2 Enter와 메모 | 각각5/5·같은 Item/부모/자식/메모/시간/진행·저장/Undo/reload | 제목 중간 Enter는 거절/입력 보존. 새 메모 문법 확정0 |
| B3 범위와 입력 보호 | 지역5/5·모호한 identity 거절5/5, 두 지역 각 거래 Undo/Redo·숨은 bytes/ID·전체 커서·즉시 역연산 | 서버 Undo는 최신 거래1개. 정확 session 복구 기록과 서버0쓰기를 구별 |
| C1/C2/C3 날짜와 정확 원문 | Today5/5·전체/특정/하위 폴더·지난/오늘 완료·한 속성 날짜 적용·동일 ID/기록·Undo/reload·source focus15곳 | 자동 커서 영속복원·원사례 해결·새 구획/반복 정책 보장0 |
| C4 미결 비교 | 독립 모델26·초기 대응9·조작 HTML5크기 PASS | due/복제/공통·회차 메모 등은 독립 제안, 운영 writer 아님 |
| 판본과 저장 경계 | 현재/사본1,193입력 차이0·실제 자산24hash 일치·신규QA8/기존QA8 차이0, API/Auth/DB 전달0·prefix 밖/clear0·sentinel 불변 | 실제 DB 전수 snapshot/실계정 시험 아님 |
| 산출물과 보호 | 최종 보고5/5·20checks, source/응답/종료hash 같음, live639/static81/보호7·양쪽Git 불변 | 실제 Android/iOS·IME/AT·관찰 사용자0 |
| 소유와 closeout | 38파일 대조·실제 diff 검토·scoped closeout29entries(8modified/21untracked)·문서4/4/16required/7095links | 원본/실행계/직전dirty 보존, commit/push/PR/merge/교체/배포0 |

신규 반복 실행131회(121PASS/10FAIL)는 원 실패를 포함한 이력이며 최종35개와 중복된다. 처음35PASS metadata checkpoint·다음34/1·ACK 단일1PASS·최종35PASS를 보존했다. 준비 인수 누락으로 브라우저 전에 종료한0case 실행은 앱 실패 수로 세지 않는다. ACK 보완은 진행/날짜 두 쓰기 뒤 화면 Undo 활성화 대기와 증거만 추가했으며, 제품·seed·공통 원문 복귀·기존 timeout·클릭 수는 바꾸지 않았다.

root는 실제 앱의390·375·844·1024·1440 화면과 최종 보고390/1440 화면을 직접 확인했다. 폴더 위치 안내와 날짜 출처가 기존 화면 안에서 보이고, 좁은/가로 화면은 줄바꿈 또는 dialog 내부 스크롤로 핵심 행동에 도달했다. 기능 검사는 실제 키보드·비드래그/hit guard를 실행했다. 이를 관찰 사용자 사용성이나 보조기술 검증으로 표현하지 않는다.

이번 목표의 구현·검증·보고 MUST는 충족됐다. 전체26개 피드백/424개 통합 요구의 완성, 미결 정책의 확정, 개발계 반영은 별도다. 후속 조건은 [요구 대조](requirements.md)와 [결과](results.md)에 남겼다.
