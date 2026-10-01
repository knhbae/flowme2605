# 검증 원장

상태: 범위 내 구현·검증·평가·보고 완료. 과거 여정 목표의 통과 수는 이번 실행에 합산하지 않는다. 전체 UX·실제 기기/사용자 검증·공개 반영 완료가 아니다.

## 기준선과 비교

이전 목표의 마지막 합성 bundle에서 초기 scroll0 편집 본문 top/노출 높이는 아래와 같았다. 이번 턴에서390×844와844×390 캡처를 다시 읽었다. 기준선의 숫자는 [이전 QA](../2026-10-01-alpha-ux-journey/qa.md)의 과거 관찰이며 현재 소스 실행 결과가 아니다.

| 화면 | 기존 본문 top | 기존 본문 노출 높이 |
| --- | ---: | ---: |
| 390×844 | 545.55 | 298.45 |
| 375×812 | 597.55 | 214.45 |
| 844×390 | 460 | 0 |
| 1024×768 | 476 | 292 |
| 1440×900 | 476 | 415 |

## 현재 실행 기록

- 독립 HTML inline 모델17+18+18+18+18, 누적89회·실패0, 마지막18/18. 브라우저25+25, 누적50회·마지막25/25. 첫 자동 검사에서 놓친 모바일 메모 두 번째 줄 잘림은 시각 검토로 발견해 auto-height 보완 후 재검사했다.
- 지역 모델 신규18 + 기존 회귀13 =31/31. 별도 소유 모델 타입 검사 통과. 저장·파서 전체 타입 증거는 아니다.
- root 재검사: 지역18 + Alpha layout5 =23/23. 현재 helper/레이아웃 source를 읽고 범위/판본/숨은 줄 보호를 확인했다.
- IAB 수동 합성 조작: 정확 이름→동명 두 경로 제안, 폴더 영역 보기, 같은 일반 메모 수정·저장·Undo를 확인했다. 앱의 서버 writer 검증이 아니다.
- helper 담당 전체 tsc --noEmit은 기존 다른 컴포넌트/회귀/E2E 진단244건으로 실패했다. 통합 제품 전용 타입562진입점/635source·진단0, 도구10/10을 확인했다. 전용 타입 성공을 전체 tsc 성공으로 표현하지 않는다.

| 검사 | 마지막 실행 | 범위 |
| --- | --- | --- |
| 실제 편집 연결 표적 | 67/67 | 지역/전체·조회 전환·새문서·자기 receipt authority·외부 판본/계정 보호 |
| 비동기 기간·이동 회귀 보완 | 12/12 | ProgramRecurrence.interaction 전체 파일, 기존 authority/실패 assertion 유지 |
| 앱 폴더 여정 | 45/45 | 9시나리오×5크기, attempt03의 기존45건 |
| 미저장 입력→새문서 | 5/5 | attempt04-new-document 별도 재검사, 한 번의50/50 실행 아님 |
| 기존 작성/저장 회귀 | 25/25 | J1~J3×5 + R1/R2×5, final-v2 |
| npm test | 2,258/2,258 | 01:00:19 실행·sourceChanged/fail/skip/cancel0 |
| production build | 통과 | 00:58:55 실행·exit/verifiedExit0·sourceChanged0 |
| 전체 통합 | 2,676/2,676 | 265파일·2,676회, 00:55:18→01:09:51 실행·sourceChanged/fail/skip/cancel0 |
| 보고서 사전 QA | 5/5 | pre-final-v1·필터21/4/8/9·링크8개·비교PNG2개·storage/외부요청0 |
| 보고서 최종 QA | 5/5 | final-v1·15.6초·실패/skip/flaky0·동일 DOM/링크/이미지/경계 검사 |
| 최종 문서 검사 | 4/4 | skill sync·필수 문서16·로컬 링크 검사·diff 공백 검사 |

기본·표적·전체 통합에는 겹치는 테스트가 있으므로 하나의 고유 합계나 제품 커버리지 퍼센트로 더하지 않는다. F1~F10/R1~R2/J1~J3은 [요구별 결과](results.md)에 연결했다. 앱 브라우저는00:33 고정 production bundle과 합성 Auth/API/CAS/receipt를 사용했다. 이후00:58 build까지 runtime 변경0임을 source hash로 대조했다. 실제 키 입력의 F10은 자기 저장→생성에서 정확히2회 mutation·연속 판본 CAS·숨은 자료/ID 보존을 확인했다. 단순 최신 snapshot으로 외부 변경을 우회하지 않는다.

근거: [기존25건](../../../output/playwright/folder-writing-regression-final-v2/results.json), [폴더45건과 신규 최초 실패](../../../output/playwright/folder-writing-attempt03/results.json), [신규5건 재검사](../../../output/playwright/folder-writing-attempt04-new-document/results.json), [독립 HTML25건](../../../output/playwright/folder-writing-lab-run2/results.json). JSON·화면은 로컬 전용 근거이며 게시하지 않는다.

## 다섯 화면의 최종 앱 평가

아래 전후는 같은 일반 메모 fixture·초기 scroll0이다. root가 final-v2 첫 화면5장을 직접 읽었다. 직전 격리 후보의 비교이며 공개 앱의 실사용 관찰이 아니다.

| 화면 | 본문 top 전→후 | 보이는 본문 전→후 | 평가 |
| --- | --- | --- | --- |
| 390×844 | 545.55→545.55 | 298.45→298.45 | 첫 메모 전체 노출, 세로 유지 |
| 375×812 | 597.55→597.55 | 214.45→214.45 | 첫 메모 전체 노출, 기간 탭2줄 밀도 남음 |
| 844×390 | 460→324 | 0→66 | 첫 일반 메모44px 전체 노출 |
| 1024×768 | 476→476 | 292→292 | 데스크톱 유지 |
| 1440×900 | 476→476 | 415→415 | 데스크톱 유지 |

다섯 크기 모두 가로 넘침0·상시 편집 행동48px 이상. F9 폴더 fixture의 첫 native source는 `[2026-10-01]` 날짜 행이다. 실제 첫 `.tle-line`과 계산 좌표가 일치했다. 날짜 캡처를 일반 메모 노출의 근거로 사용하지 않는다. 독립 HTML의 모바일 메모62px·가로/데스크톱44px는 전체 노출했다. 내부 화면 계측을 관찰 사용자 개선 결과로 표현하지 않는다.

## 수정과 실패 이력

- UI 표적46개 첫 실행은40통과/6실패였다. 새 callback/지역 draft를 동적 추출 harness에 넣고 기존 assertion을 유지했다. 후속53/53·54/54, 기간 전환 보호2개 추가 후56/56, 새문서 회귀4개 추가 후60/60을 확인했다.
- 독립 리뷰에서 기간 버튼이 지역 미저장/조합 입력 확인을 건너뛰는 P2를 찾아 공통 changePeriod의 lock/flush로 보완했다.
- 앱 새 폴더 attempt01:45회 중33통과/12실패. Undo history 단위 가정5·가상 시계 과거 이동5·local static GET reset2였다. 테스트 가정/시계 및 고정 loopback GET의 ECONNRESET 재시도만 보완했다. attempt02:45/45·skip/flaky0, 원본 이력 보존.
- 기존25회 회귀 첫 실행:20통과/5실패. 선택한 폴더에서 새 빈 문서가 부분 보기로 열려 native textarea가 숨는 제품 결함을 다섯 화면에서 확인했다. 성공 시 조회 범위만 해제하고 문서 보관 위치는 유지한다. 생성 전 입력 저장/잠금 보호도 추가했다.
- 그 수정의 독립 리뷰에서 성공한 dirty flush 뒤 이전 expectedSpace를 사용하는 P2를 발견했다. 단순 현재 snapshot 채택으로 우회하지 않고 기존 성공 저장 receipt authority chain을 생성까지 잇는다. 실제 dirty 입력→새문서 시나리오를 추가한다.
- 전체 통합 첫 실행:265파일·2,644회·2,542통과/102실패. catalog 외부 공급 누락98·새 callback harness4이며 실행 중 ProgramSpace 두 파일 변경도 있었다. readonly 외부 원본 공급을 명시하고 callback harness를 보완했다. 해당 표적18/18은 통과했다.
- 00:07:39 전체 통합은 새문서 수정으로 source가 달라져 기존 own runner/worker만 중단했다. 로그는 남았고 TAP 최종 집계가 없으므로0건 실행/통과로 해석하거나 완료 수에 합산하지 않는다. 00:26:55 재실행도 추가 P2 검토로 최신 소스가 될 수 없어 값비싼 catalog 구간 전에 중단했다. 둘 다 최종 통과가 아니다.
- 00:26:55 build는 컴파일 종료0이지만 ProgramSpace가 실행 중 변경돼 verifiedExitCode2다. 고정 소스 build 성공으로 쓰지 않는다. 같은 시각 npm test2,258/2,258·소스 변경0와 전용 타입562진입점/635소스·진단0도 이후 source 변경 전의 기록이다.

## 고정 소스 통합 실패와 최소 보완

00:33:34 전체 통합은2,676회·2,674통과/2실패·sourceChanged0이다. ProgramRecurrence.interaction의 두 move 테스트가 비동기 ‘오늘’ 전환 전에 행을 찾았다. 제품 동작이 아닌 동기 테스트 연결 문제였으며, 전환 완료를 기다린 뒤 이동용 dirty를 설정하도록 테스트1파일만 보완했다. 기존 authority/foreign actor/실패/중복/잠금/ID/메모/진행 assertion은 유지했다. 수정 전 재현12개=10통과/2실패, 수정 후12/12통과, 누적24회·22통과/2실패. 기존 통합 로그와 제품 파일은 수정0이다. 00:55:18 전체 통합을 고정 소스로 재실행하고 보완 뒤 npm/build/전용 타입도 다시 확인한다.

신규 브라우저 attempt03은50회 중45통과/5실패였다. F10의 마지막 폴더 selector만 실패했고 저장/판본/원문 assertion은 통과했다. 닫힌 sidebar 명시 열기와 role combobox 조회2줄만 보완해 attempt04 신규5/5통과. runtime/fixture/config 변경0·두 실행 asset24개 경로별 SHA 동일이다. UI 최종67/67과 독립 diff 리뷰에서 추가 확정 결함은 발견하지 못했다. 독립 리뷰는 테스트 재실행이 아니다.

## 자료·소유 경계와 마감

`workflow:closeout`의 소유/검사 lane을 실행하고 실제 root CSS/fixture/diff·helper/UI 독립 검토를 확인했다. 최종 패키지 읽기 대조에서도 정본20·21과 spec/contract/results/HTML·실행별 수의 새 확정 문제는 없었다. 해당 리뷰는 테스트 실행이 아니다. reporter 역시 검사를 실행하거나 통과 인증하지 않는다.

[보고서 final-v1](../../../output/playwright/folder-writing-report-final-v1/results.json) 5/5·실패/skip/flaky0. 필터21/4/8/9·참고 링크8개·비교PNG2장, 누락/깨진 이미지·가로 넘침·viewport밖·console/page error·storage 쓰기·외부 요청·실제 Auth/API 전달0이다. 모든 request는 합성 HTML/로컬 PNG를 주입했다. 담당자가 첫 화면5장·390전체1장을 직접 봤고 root도 최종390/1440 첫 화면을 확인했다. 캡처5개의 HTML SHA256은 현재 파일 `A34AFDD77139ED9CEB5ABF17CB972A54CC8CEE9F994FA1F5948404AE41E1C85C`와 동일하며 실행 중 수정0. 사전5+최종5=보고서10회, 마지막 고유5건을 사용한다. 실제 사용자 검증이 아니다.

01:03:02 전용 타입562진입점/635source·진단0·실행 중 변경0, 도구10/10을 재확인했다. 최종 build/npm/type의 저장 source hash635개와 현재 파일을 대조해 각각 drift0이었다. 앱 브라우저에 사용한00:33 build와 마지막00:58 build의 source 차이는 ProgramRecurrence.interaction.test.tsx 하나뿐이다. UI/runtime/helper source 변경은0이며 마지막 전체 통합에는 그 테스트 보완을 포함한다.

00:55:18→01:09:51 UTC 마지막 전체 통합265파일·2,676/2,676 통과, 실패/skip/cancel/sourceChanged0·verifiedExit0. 저장 source635개를 현재 파일과 다시 대조해 drift0이었다. [최종 통합 JSON](../../../output/integrated-product-poc/new-tests-2026-10-01T00-55-18-188Z.json), [npm JSON](../../../output/integrated-product-poc/npm-test-2026-10-01T01-00-19-878Z.json), [build JSON](../../../output/integrated-product-poc/build-2026-10-01T00-58-55-651Z.json), [전용 타입 JSON](../../../output/integrated-product-poc/targeted-types-2026-10-01T01-03-02-144Z.json)은 로컬 전용 근거다. 초기102실패·뒤의2실패·중단/실행 중 소스 변경 이력을 삭제하거나 최종 통과에 합산하지 않는다.

피드백 정본 SHA256은 `AC58C0EFCDD65A3BF964C7BB4FCCED970E08112049352E0BFE02B93F889A9493`를 읽기 전후 유지했다. 외부 catalog pack은 `D:/flowme2605/flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json`을 읽기만 하며 SHA256 `723ABEFDC26243EB1F9B4BCF21730758ECC7A300494AD2AE75293AC5C6DDE4BE`다. 복사·수정·게시0. credentials/account file/.env를 사용하지 않았다.

앱 검사에서 실제 Auth/API 전달0·허용 prefix 밖 storage set/remove/clear0·합성 운영 sentinel byte 동일·console/page error0이다. 독립 HTML은 정확한 `flow:poc:personal-workspace:v1:folder-writing-lab` key만 사용한다. vendor/parser writer·API·schema·Auth·기존 `/my`·기존 저장 key 변경0. commit/push/PR/merge/Preview/Production/개발계 교체/DB/Auth/Tunnel 변경/관찰 사용자 모두0. own 합성3106의launcher18108/child12012만 경로·부모를 대조해 종료했고 listener0을 확인했다. 공개3105/PID2184·Tunnel3864·이전3109는 유지하며 독립 HTML3110/보고서3111은 사용자 미리보기로 남긴다.

실제 Android/iOS/IME/보조기술·관찰 사용자 검사는 미실행이다. 기존 실제 개인 데이터 전체 불변은 원격 DB를 열지 않은 것으로만 주장하지 않는다. 증거는 합성 sentinel byte 비교·허용 밖 storage0·실제 API 전달0과 수정 파일 경계로 제한한다.
