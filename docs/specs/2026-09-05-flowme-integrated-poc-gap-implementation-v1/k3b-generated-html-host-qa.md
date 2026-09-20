# K3-B 생성 HTML 호스트 검사와 시간 presenter 독립 검토

2026-09-05. root가 생성한 FB17 후보에 대해 기존 호스트 브라우저 검사 8개를 실행했다. 제품·기존 검사·기존 Playwright config·사용자 HTML·현재 pin은 이 독립 작업에서 수정하지 않았다.

## 생성 후보와 실행 결과

두 사용자 HTML은 각각 **1,380,751 bytes**, SHA-256 `FB17FDA35E1141C50359BEE3CC5B85A39DC89F9C0C10809570ADB70B757D8BE3`이다.

- `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko.html`
- `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`

기존 host spec (로컬 전용 근거: `../../../tests/e2e/personal-workspace-p3h1-android-device-host.spec.ts`)을 `--list`로 **8개** 확인한 뒤 **8/8 통과**, 실패·건너뜀 0개, Playwright 12.3초. 실행 요약 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/generated-fb17-host-browser-2026-09-05T13-29-37-659Z.json`), 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/generated-fb17-host-browser-2026-09-05T13-29-37-659Z.log`), 원본 Playwright JSON (로컬 전용 근거: `../../../output/playwright/k3b-host-fb17-2026-09-05T13-29-24-881Z/output/playwright/k3b-host-fb17-2026-09-05T13-29-24-881Z/browser.json`).

| 기존 등록 검사 | 이번 결과 |
| --- | --- |
| v2 host binding / candidate body verification | manifest origin·hostRunId·fingerprint·응답 SHA/bytes 일치 |
| runner 5 viewport | 390×844, 375×812, 844×390, 1024×768, 1440×900에서 가로 overflow 0, 외부 요청 0, console/page error 0 |
| HTTP candidate 조작·저장 경계 | bound popup에서 Quick 생성과 작성 화면 진입 성공. 운영 sentinel exact bytes 동일, 감시한 제품 호출 모두 PoC prefix 안, clear 0 |
| v2 검증 후 검사자 초안 reload | fixture 검사자·장치 입력 초안 복원, 판정 NOT_RUN 유지 |
| 구 v1 세션 비승격 | 구 tester/device/결과/artifact가 v2 검증 결과로 복사되지 않음 |
| 구조화 관찰 없는 PASS 거절 | 자유 메모·artifact 이름·PASS 선택만으로 승격하지 않음 |
| 운영 저장 읽기 실패 | 읽기 실패를 빈 값/동일로 오인하지 않음 |
| desktop 자동화 E5-D 승격 거절 | 가짜 기기 입력과 체크를 채워도 실제 Android 근거로 승격하지 않음. 다운로드된 테스트 evidence도 promotable=false, artifactReview=UNREVIEWED |

5 viewport 반복은 두 번째 등록 검사의 하위 검사다. 8+5개로 합산하지 않는다. 이 실행은 runner의 viewport 검사이며, 제품의 모든 화면을 다섯 크기에서 재검사한 것이 아니다. 이번 기존 spec은 성공 화면 PNG를 저장하지 않으므로 새 시각 캡처 검토 결과를 주장하지 않는다.

각 테스트는 Playwright의 새 context를 사용했고, spec이 시작한 `127.0.0.1`의 임시 포트 서버만 사용했다. 종료 후 해당 child process는 기존 afterAll에서 정리됐다. LAN host·실제 기기·사용자 브라우저 profile은 사용하지 않았다. `/runner`·`/candidate`의 SHA 확인도 desktop Chromium에서 수행한 것이며, 기존 test 이름의 `on-device`를 실제 기기 검사 완료로 해석하지 않는다. **실제 Android Chrome / iOS Safari NOT_RUN, 관찰 사용자 0명.**

## 실행 설정과 보존 경계

기본 config의 Next webServer가 빌드 중인 3182 서버를 자동 기동하지 않도록 root 승인하에 새 임시 config (로컬 전용 근거: `../../../output/playwright/k3b-host-fb17-2026-09-05T13-29-24-881Z/host-only.config.ts`)를 사용했다. 원래 config를 import한 뒤 `testDir`만 절대 경로로, `webServer`만 `undefined`로 바꿨다. browser/use/timeout/assertion은 그대로이며 기존 config는 수정하지 않았다. 이 작업은 3182에 접속하거나 Next 서버를 기동·종료하지 않았다.

`PLAYWRIGHT_JSON_OUTPUT_NAME=output/playwright/k3b-host-fb17-2026-09-05T13-29-24-881Z/browser.json`, `--reporter=line,json`, `--workers=1`로 실행했다. 이 상대 경로는 임시 config 디렉터리 기준으로 해석되어 실제 JSON은 위 링크의 중첩 output 경로에 저장됐다(11,119 bytes). raw JSON의 개별 8개 passed 결과를 읽어 확인했고 파일을 이동하거나 재실행해 결과를 대체하지 않았다. 다음 실행에서는 환경변수에 절대 경로를 쓰면 된다. 고유 output 경로라 과거 실패·캡처·실제 기기 evidence를 덮어쓰지 않았다.

실행 전 hash (로컬 전용 근거: `../../../output/playwright/k3b-host-fb17-2026-09-05T13-29-24-881Z/before-hashes.json`)와 실행 후 hash (로컬 전용 근거: `../../../output/playwright/k3b-host-fb17-2026-09-05T13-29-24-881Z/after-hashes.json`)의 **11개 파일 전체가 동일**하다. 사용자 HTML 2개, app, 시간 presenter 검사, host spec, host script, 기존 config, runner HTML 및 assets 3개를 포함한다.

주요 hash:

| 파일 | SHA-256 |
| --- | --- |
| standalone app | `595CD60B95714381C0FB65CF2353F340D256198EC407C51D1ED95DF60C809C15` |
| 기존 host spec | `98F31E75D824F960D0C8457F5064429007E85C327E7CA541C89971DBEB02286D` |
| host script | `E7CA1B8BB7E97742F32F98B42E275B750088CDFA1E82911730AEAFF5EF581953` |
| 기존 Playwright config | `0E44FD238DD87BEAFC4CDE834D05E760D8BC77CAD6118C8F9131094E8A9528F9` |

저장 경계 수치는 기존 spec이 실제 검사한 범위로 한정한다. HTTP candidate 검사에서는 운영 sentinel 동일·모든 감시 호출의 PoC prefix/clear 금지를 확인하지만 API 총수를 JSON으로 내보내지는 않는다. 따라서 제품 API 총수를 임의로 만들지 않았다. 다른 검사에서 운영 sentinel이나 v1 세션을 넣은 것은 새 context의 명시 fixture 준비다. 사용자 운영 데이터에 쓰기한 것이 아니다. 모든 8개 검사가 console/page error 감시를 설치한 것도 아니므로, 전체 검사 8개에 대한 포괄적인 오류 0 수치를 추가하지 않는다.

## 시간 presenter 테스트 수정 — 읽기 전용 독립 검토

비교 대상은 수정 전 exact backup (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-time-presenter-test-update/result-time-presentation.test.cjs`)과 [현재 검사](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/result-time-presentation.test.cjs)다. backup SHA `BBBFAA4951E81C199AE2DA7FFF804B74708E05F5B634814E8FD99603044E0D26`, 현재 SHA `E3FBA7B48565B2A291FAE8FC29562D362319456CE50D469368406A029612C805`.

root의 첫 151개 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/b1-final-html-model-regression-2026-09-05T13-24-18-232Z.json`)은 148통과/3실패였다. 로그의 실패 3개는 모두 `personalExecutionOnly is not defined`다. 새 제품의 `renderResultPanel`과 `renderItemDetail`이 실제 표시 gate를 호출하는데 VM 하니스가 해당 의존성을 추출하지 않은 상태였다. root의 수정 후 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/b1-final-html-model-regression-fixed-2026-09-05T13-26-03-322Z.json`)은 **151/151 통과**다. 이 독립 검토자가 151개를 다시 실행한 것은 아니며 JSON·실패 로그·코드 diff를 직접 읽고 검토했다.

검토 결론: 기존 시간 요구를 약하게 만든 수정은 발견하지 않았다.

- C/PD를 추가로 require하고 fixture state를 실제 `C.fromLegacy`에 전달한다.
- `sourceRead:{ok:true,raw:null}`은 이 fixture에 source candidate가 없다는 명시 입력이다. 실제 `PD.projectPersonalPlanDisplay`를 호출하고 `ok`와 `mode='legacy-display'`를 확인한다. `personalExecutionOnly:()=>false` 같은 임의 통과 함수로 대체하지 않았다.
- 현재 app의 **실제 `personalExecutionOnly` 선언**을 VM에 추출한다. Item 상세 fixture에는 이 읽기 모델 구성을 위한 `state`만 추가했다.
- 기존 6개 등록 검사의 09:30/11:45, 시간 없는 항목의 추측 금지, Sheet 시간 열/셀, 원문·projection 불변, 상세 실행 시간 유무 assertion은 변경되지 않았다. window/document/localStorage/fetch에 접근하면 실패하는 기존 read-only 방어도 그대로다.

이 positive fixture의 source absence 확인은 실제 source 읽기 오류/손상/새 source 업데이트를 검증한 결과가 아니다. 관련 negative·복구는 [PD 독립 11개 및 source CAS 브라우저 2개](k3b-personal-plan-display-independent-qa.md)에 별도로 남겼다. 151·8·11·2는 서로 다른 검사 묶음이며 같은 기존 결과를 중복 합산해 기능 충족률로 환산하지 않는다.

## 발행 상태

이 독립 작업의 제품 수정·기존 테스트 수정·사용자 HTML 재생성·pin 수정·commit·push·PR·Preview·Production 배포는 모두 0건이다. root가 별도로 실행한 HTML 생성·build/npm 결과는 해당 원장의 근거이며 host8 결과로 대체하지 않는다.
