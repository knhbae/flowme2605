# 구현·검증 결과 — 격리 후보

2026-10-02. 이번 범위의 폴더 연결 위치·날짜 표현 보완과 작성 회귀를 구현하고, 동일한 production 사본에서 신규35/35·엄격 기존 회귀60/60 PASS·exit0을 확인했다. npm2,258/2,258·통합2,901/2,901·타입 진단0·production build도 통과했다. 최초 안내 누락과 검사 보완 이력은 삭제하지 않았다. 마지막 원문 복귀 실패는 서버 저장 관찰과 화면의 저장 확정을 구별하도록 QA만 보완한 뒤 단일1회와 전체35회를 다시 검사했다. 목표의 구현/검증 범위만 판정하며 개발계 반영·전체 UX 완성은 아니다. 근거는 [QA 기록](qa.md), 누락 보완과 한계는 [완료 감사](completion-audit.md)에 있다.

## 반영한 범위

| 묶음 | 현재 후보의 변경과 확인 | 남은 경계 |
| --- | --- | --- |
| 폴더 #10·17·20·26 | 실제 위치 preview·기준 줄·snapshot/stale guard·기존 이름 제안/전이를 연결했다. 순수14·실제 JSX8, 직접 연결5/5·이름 입력5/5 PASS. 취소0쓰기·확정·Undo/reload·동명 경로/ID 보호 확인 | #26 원환경 재현·사용자가 기대한 기본 위치 재정의는 미확정. 문서 끝/읽기/stale는 순수/JSX 근거, 실제 OS 붙여넣기·IME는 미실행 |
| 작성 #6·13·15·16·21 | 작성 회귀10, 실제 Enter·메모·지역·identity 거절4경로×5크기20/20 PASS. 같은 ID·시간·진행·숨은 원문·각 마지막 저장 거래 Undo/Redo·전체 원문 커서·reload 확인 | 제목 중간 Enter는 기존 identity-ambiguous 거절/입력 보존. 서버 Undo는 최신 거래1개. 실제 IME/AT·원 flicker 환경·새 문법은 미확인/미확정 |
| 날짜 #14·22~25 | 기존 Today의 지난 미완료와 당일, 실제 구획/개별/미정 출처를 표시했다. 순수9·실제 JSX4와 실제 앱5/5 PASS. 전체/특정/하위 폴더·날짜 한 속성 변경·동일 Item/기록·Undo/reload·명시 원문 focus/lineId 확인 | 자동 커서 영속복원·완전한 반복·별도 마감 schema·새 구획 이동/소속 정책은 보장하거나 확정하지 않음 |

독립 [조작 HTML](../../content-audit/2026-10-02-flowme-feedback-ux-bundle-lab-ko.html)과 [요구별 보고서](../../content-audit/2026-10-02-flowme-feedback-ux-bundle-report-ko.html)를 만들었다. 날짜 관계와 이동·복제·반복·마감일의 미결 선택을 비교하는 시안이며 실제 제품 기능의 구현 증거로 사용하지 않는다.

## 현재 확인한 증거

- 표적45/45 PASS: 폴더14·날짜9·실제 날짜 JSX4·작성10·실제 폴더 JSX8. 서로 겹치는 통합/npm 검사와 합산하지 않는다.
- 최종 통합: 278파일·2,901실행·2,901 PASS·fail/skip/cancel0·CLI exit0·source drift0. UTC `00:24:21.493Z`~`00:35:09.915Z` 실행이다.
- 최종 npm: 2,258/2,258 PASS. 타입은578 entry·653 source·진단0·drift0이며 인벤토리 검사10/10 PASS다.
- 최종 사본 빌드: 입력1,193·원본/사본 drift0·CLI exit0·buildId `_9wLzKjgWgwPSNGIEkU4R`. 개발계나 제공 중 자산을 교체하지 않았다.
- 최종 실제 앱: 신규7경로×5크기35/35 PASS·exit0·fullMatrix true·runtimeFailureStatus NONE. 기존12×5 엄격 회귀60/60 PASS·exit0·retry0. 실제 자산24개와 동결 사본 hash, 현재/사본 입력1,193개가 일치한다. 신규 반복 실행131회는121PASS/10FAIL이며 최종95개 경로와 중복되는 이력이다.
- 확장 검사 도구: 날짜 seed5/5·엄격 회귀 판정10/10 PASS. 드라이버의 순수 seed7·작성 매개변수4·폴더 위치6 계약도 PASS다. 실제 화면35/60회 또는 사용자 관찰 결과로 세지 않는다.
- 독립 HTML 모델26/26·preview 충실도9/9 PASS. HTML review는 Lab5+보고서5=10/10 PASS이며 console/page/network/prefix/overflow 오류0이다. 보고서 내용 수정 뒤 최종5/5·20 checks도 PASS다. 소스·제공 응답·종료 hash가 같고 root가390/1440 화면을 직접 확인했다.
- 보호 before/after의 liveGit/originalGit/source/assets/protected 5범위가 불변이다. 로컬 파일/Git hash와 합성 sentinel 검사이며 논리 DB snapshot은 아니다.

## 실패 이력과 시안의 한계

최초 통합은 2,900 PASS·1 FAIL이었다. `ProgramRecurrence.test.tsx`가 이전 변수명 `executionRows.map`을 source 문자열로 찾던 검사였고, 현행 행·키·동일 transition의 연결을 검사하도록 보정했다. 최종 통합 재실행에서 2,901/2,901 PASS를 확인했다. 최초 JSON·로그를 [QA 기록](qa.md#최초-실패와-최종-재실행)에 남겼다.

HTML 충실도는 초기 네 예시 줄의 relation/index/locationLabel 대응에 한정한다. Lab은 원문4줄을 고정하고 연결 원장만 추가한다. 제품 writer는 실제 줄을 삽입하거나 같은 lineId의 제목을 선택 폴더 제목으로 교체한다. 실제 삽입 뒤 줄 번호 변경·전체 원문 serializer·후속 연결 좌표까지 Lab이 재현한다고 쓰지 않는다.

앱 검사를 위한 신규7경로×5크기와 기존12회귀×5크기를 준비했다. 원래75회 계획에는 실제 Enter·메모·지역 편집/역연산, 날짜 적용/Undo와 정확한 원문 focus가 빠져 있었다. 제품 소스나 합성 seed를 통과에 맞춰 바꾸지 않고 검사 경로를 보완했다. 문서 끝/읽기/stale 등 UI에 도달하지 않는 일부 폴더 조건은 순수/JSX 근거로 분리한다. reload 뒤 명시 원문 복귀는 검사하지만 자동 커서 영속복원을 보장하지 않는다.

사용자의 Ready 후3107/PID15792에서 `/alpha`200과 최종 buildId를 확인했다. 그러나 `FLOWME_ALPHA_ENABLED`를 빠뜨린 Codex 안내로 로그인 입력이 없었다. 데스크톱 smoke는 로그인 전2FAIL·나머지5NOT_RUN이며, 기존60은 최종 reporter 없이 중단돼 완료 수를 확정하지 않는다. 해당 실패 화면·부분 결과는 삭제하지 않았다. 두 소유 검사만 중단했고3107·기존3105/3106은 종료하지 않았다. 수정한 안내의 활성화 설정 후 같은 PowerShell에서 다시 켜도록 요청했다. 서버 실행 도구 거절을 다른 shell/GUI로 우회하거나 실제 서비스로 대체하지 않는다.

이후 두 드라이버에 정확한 빌드와 시험용 로그인 설정 확인을 추가했다. 같은 설정 누락이면 브라우저를 열기 전에 중단한다. 기존60은 local/3107 강제·정확한 시나리오 이름·성공 수·재시도0·실제 JS/CSS의 동결 사본 hash·원문/운영 sentinel을 모두 검사해 PASS했다. 신규 작성 검사의 하위 Item·최신1개 서버 Undo·허용 복구 키 가정을 정정했다. 최초 전체35PASS의 metadata 고정 FAIL을 별도 checkpoint로 남겼고, 수정 뒤34PASS/1FAIL을 보존했다. 진행·날짜 쓰기 뒤 화면 Undo 활성화를 기다리는 QA 보완으로 단일1PASS→최종35PASS를 확인했다. seed·제품·기존 timeout·원문 복귀 클릭 수는 바꾸지 않았다.

OS 붙여넣기·실제 Android/iOS·IME·보조기술은 NOT_RUN, 관찰 사용자0명이다. 독립 HTML 자동 검사를 앱 사용성이나 사용자 행동 검증으로 표현하지 않는다. 전체26개 피드백·424개 요구·제품 전체 UX를 완료했다고 주장하지 않는다.

commit/push/PR/merge·개발계 교체·Preview·Production은 모두0이다. 이번 [소유 변경](changed-files.md)38개는 직전 dirty 변경과 구별한다. 최종 앱 이후 보호 대조에서 liveGit/originalGit/source/assets/protected 다섯 범위가 모두 불변이었다. 최종 보고5/5·20checks·source/응답/종료hash 일치, 문서4/4·16required/7095links·skillSync PASS, scoped closeout29Git entries와 실제 diff/독립 요구·판본·경계 감사를 확인해 이번 목표의 MUST를 완료 판정했다. 제외/미결은 다음 목표의 조건으로 남긴다.
