# FlowMe 통합 PoC P3-H1 Android Chrome 실기 증거 계약

## 현재 판정

- 단계: P3-H1
- 증거 계약: `flowme-personal-workspace-p3h1-android-evidence-v2`
- 목적: P3-G에서 준비한 자동화 경계를 실제 Android Chrome E5-D로 검증한다.
- 후보: Android single-file HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`)
- 후보 크기: 923,787 bytes
- 후보 SHA-256: `8156D0959F4391DAAEA652E37FFFD0CE7B736617695AC6A090B21D0D1C12417B`
- v2 LAN 호스트·HTTP 사전검증: PASS
- v2 기록·판정 경로: 56/56 unit PASS, 8/8 browser E2E PASS
- 실제 Android Chrome A1~A6: 0/6, 모두 NOT_RUN
- Production ready: false

PC 네트워크 점검, HTTP 자동검사, Desktop Chromium 캡처는 host readiness 근거다. 실제
Android 기기에서 URL을 열고 A1~A6을 조작한 증거가 아니며 E5-D로 세지 않는다. 기존
전체 기기 프로토콜은 [P3-G 실제 기기 검사 프로토콜](../2026-09-04-flowme-integrated-poc-device-accessibility-readiness-v1/device-protocol.md)을
상속하고, 이 문서는 Android 실행과 최종 증거 형식을 구체화한다. v2의 정본 필드는
[evidence contract v2](./evidence-contract-v2.md)에 둔다.

## 목표

1. SHA-256과 크기로 고정한 후보 한 파일만 동일 LAN에서 짧게 제공한다.
2. 메신저·파일 미리보기·내장 webview가 아닌 실제 Android Chrome 주소창에서 HTTP URL을 연다.
3. 한 호스트 실행과 한 후보를 `bindingFingerprint`로 묶고 다른 실행의 증거 혼합을 거부한다.
4. Android가 `/candidate` 본문을 직접 받아 SHA-256과 bytes를 계산한다.
5. 기기 모델·Android build·Chrome 전체 버전·UA와 A1~A6 구조화 관찰값을 남긴다.
6. 실제 origin의 운영 `flow:*` 값을 읽어 전후 byte parity와 post-load writer observer를 결합한다.
7. artifact 실제 파일의 SHA-256·bytes·media type을 검증하고 이름 있는 사람이 모두 검토한다.
8. 실제 기기 증거가 없거나 기록기 초안만 있으면 NOT_RUN 또는 INCOMPLETE를 유지한다.

## 고정 후보와 실행 바인딩

실기 시작 전 로컬 후보와 HTTP 응답은 모두 923,787 bytes와 고정 SHA-256에 일치해야
한다. 호스트는 시작마다 `hostRunId`, private-LAN `origin`, 후보 SHA-256·bytes,
`createdAt`을 만들고 다섯 값을 `|`로 연결한 `bindingFingerprint`를 제공한다. 모든 A1~A6
행과 storage observer는 이 fingerprint와 같아야 한다.

manifest·origin·후보 SHA·bytes·host 시작 시각 중 하나라도 달라지면 저장된 draft,
baseline, scenario를 새 실행에 재사용하지 않는다. 실기 중 후보 bytes를 수정하면 새 SHA를
고정하고 HTTP 사전검증과 A1~A6 전체를 다시 실행한다. 서로 다른 SHA나 host run의 PASS를
조합하지 않는다.

## 동일 LAN 호스트 계약

- 활성 Wi-Fi의 비 loopback·비 link-local IPv4 하나에 명시적으로 bind한다.
- 권장 포트는 4173이며, 점유 중이면 임의로 재사용하지 않고 새 포트와 URL을 기록한다.
- `/`와 `/runner`는 실기 기록기, 정확한 `/candidate`는 고정 후보 bytes,
  `/manifest.json`과 `/health`는 읽기 전용 메타데이터를 반환한다.
- 기록기 정적 asset과 빈 `/favicon.ico` 204 외 임의 파일은 노출하지 않는다.
- GET과 HEAD만 허용한다. 쓰기 method는 405, 알 수 없는 경로는 404, query·경로 이탈은 400이다.
- 디렉터리 목록, 파일 쓰기·업로드, POST 증거 수집, 운영 API proxy는 제공하지 않는다.
- `text/html; charset=utf-8`, `Cache-Control: no-store`를 고정한다.
- 시작 시 실행 바인딩, 후보 SHA·크기, bind 주소·포트·실행 시각을 출력한다.
- 종료 뒤 호스트를 내리고 LAN URL을 Preview나 배포로 기록하지 않는다.

현재 PC 사전감사에서는 Wi-Fi `192.168.45.231/24`, gateway `192.168.45.1`, Public network,
DHCP 주소, Node 24.17.0과 기존 Node 실행 파일의 Public inbound allow 규칙을 확인했다.
이 값은 점검 시점 정보이고 DHCP로 바뀔 수 있다. v2 호스트를 시작할 때 다시 탐색하며
방화벽 규칙을 만들거나 수정하지 않는다.

## HTTP·기기 본문 사전검증

| 검사 | PASS 기준 |
|---|---|
| 호스트 바인딩 | manifest의 `runBinding`과 canonical fingerprint가 현재 origin·후보와 일치 |
| 후보 정합성 | 로컬 파일과 GET body가 923,787 bytes이며 고정 SHA-256과 byte-identical |
| 기기 본문 확인 | Android에서 정확한 `/candidate`를 fetch해 body SHA·bytes를 직접 계산 |
| HEAD | 200, body 0 bytes, GET과 같은 Content-Type·Cache-Control |
| method 제한 | POST·PUT·PATCH·DELETE 405, 저장·파일 변화 0 |
| 경로 제한 | 임의 경로 404, query·상위 경로 400, 디렉터리 목록 0 |
| 브라우저 smoke | HTTP shell·개인공간·새 Flow 만들기 진입, console/page error 0 |

기기 본문 검증 URL에는 query·hash·credentials가 없어야 하며 `responseSha256`,
`responseBytes`, SHA 응답 header, 검사 시각, `on-device-byte-hash` 방법을 기록한다.
manifest 값을 화면에 복사한 것만으로는 후보 본문 검증을 통과하지 못한다. localhost와
Desktop Chromium의 성공은 실제 Android 접속 PASS가 아니다.

## Android A1~A6 구조화 판정

| ID | 실제 조작과 필수 구조화 값 | PASS 기준 |
|---|---|---|
| A1 | 350ms 활성화 전에 8 CSS px 이상 이동 | pointer-location 영상, 이동 패널 false, 성공 mutation delta 0 |
| A2 | 길게 눌러 날짜 목적지 선택 | native menu false, FlowMe 이동 패널·목적지 선택 true, delta 1 |
| A3 | 활성 drag를 scroll·앱 전환·pointer cancel로 중단 | 취소 표시·패널 닫힘 true, ghost click 0, delta 0 |
| A4 | `…` 폴더 이동과 화면 내 비드래그 순서 이동 | 공통 transition true, 각 delta 1, 같은 SHA desktop keyboard 회귀 ID |
| A5 | Result → 항목 검토 → 속성 편집 | opener/tray line·label 동일, 실제 Android 키보드, 마지막 행 접근, 닫기 0·적용 1·focus 복귀 |
| A6 | 마지막 입력과 개인 Flow 저장 CTA를 키보드 위에서 조작 후 reload | caret·field·CTA 가림 0, 마지막 성공 상태만 복원, 예상 밖 상태 false |

모든 행에는 시작·종료 시각, 메모, artifact ID와 같은 `bindingFingerprint`가 있어야 한다.
누락된 구조화 값은 INCOMPLETE이고 명시적 기준 위반은 FAIL이다. A4의 Android 실기는
화면 내 비드래그 control을 확인하고 실제 키보드 동등성은 같은 SHA의 P3-G desktop 회귀와
결합한다. 소프트 키보드를 hardware keyboard 증거로 표현하지 않는다.

### A5 실제 control mapping

1. 제품 상단의 새 Flow 만들기로 작성 화면을 연다.
2. 실행 Item이 생기는 원문을 입력하고 결과 보기 또는 모바일 결과 탭을 연다.
3. `authoring-review-opener`, 화면 이름 `항목 검토`를 연다.
4. 대상 행의 `open-authoring-properties`, 화면 이름 `속성 편집`을 연다.
5. 버튼의 `data-line`과 tray/form의 `data-owner-line`이 같은 양의 정수인지 기록한다.
6. 실제 Android 소프트 키보드로 값을 입력한다.
7. 접어 닫을 때 mutation 0과 opener focus 복귀, 다시 열어 적용할 때 delta 1을 확인한다.

표시 문구만 비슷한 다른 버튼이나 Result 읽기 전용 Item은 A5 증거가 아니다.

## 실제 환경과 저장 경계

기기 설정·`chrome://version`·주소창 화면과 함께 다음 값을 기록한다.

- 제조사와 정확한 모델, Android version과 build fingerprint, Chrome 전체 버전, UA
- `browserSurface=standalone-chrome-tab`, 주소창 직접 열기, 같은 LAN 확인
- `navigator.webdriver === false`, `maxTouchPoints > 0`, `(pointer: coarse)` true
- UA에 `HeadlessChrome` 없음
- UA Client Hints가 있으면 mobile true·platform Android, 없으면 명시적 unavailable
- `isSecureContext`, `visualViewport`, `navigator.virtualKeyboard` 가용성

LAN HTTP에서 secure-context 전용 API가 없을 수 있다. API 부재 자체는 PASS·FAIL이
아니며, A5·A6은 실제 키보드 상태에서 행동 기준으로 판정한다.

허용 쓰기 prefix는 `flow:poc:personal-workspace:v1:*`뿐이다. 후보 본문 확인 뒤 A1 전에
운영 `flow:*` baseline을 한 번 만들고 A6 뒤 다시 읽는다. `beforeReadable`,
`afterReadable`, `byteParity`가 모두 true여야 하며, 정렬된 각 key에 value UTF-8 bytes와
SHA-256을 남긴다. 두 읽기가 모두 실패해 빈 배열이 된 경우는 parity 증거가 아니다.

같은 origin의 post-load observer는 A1~A6 전체 시간 범위를 덮고 prefix 밖 `setItem`,
`removeItem`, `clear`를 각각 0으로 기록해야 한다. 같은 후보 SHA에 고정된 자동 browser
writer 회귀도 별도 PASS·0건이어야 한다. 자동 sentinel은 실제 Android origin parity를
대신하지 않는다.

## artifact와 최종 검토

artifact는 임의 파일명 문자열이 아니라 `id`, 안전한 상대 경로, SHA-256, 양의 bytes,
실제 media type, 촬영 시각, 역할 목록, `filesystem-sha256` 검증 정보로 기록한다. 필수 역할은
`device-identity`, `browser-version`, `address-bar`, `storage-parity`, `A1`~`A6`이다.

검증기는 명시한 artifact root 안의 실제 파일만 열고 absolute path, `..` 이탈, symlink
이탈을 거부한다. JSON과 실제 파일의 SHA-256·bytes·media type이 모두 같아야 한다. 그 뒤
이름 있는 검토자가 A1~A6과 모든 artifact를 실제로 확인하고
`artifactReview.status=REVIEWED`로 기록해야 E5-D 후보가 된다.

**기록기에서 내려받은 초안은 artifact 파일 검증과 이름 있는 검토가 없으므로 최대
INCOMPLETE다. 기록기 초안만으로 PASS나 E5-D가 될 수 없다.**

v1 EXECUTED JSON은 v2로 자동 승격하지 않는다. v1 NOT_RUN 기록만 보존할 수 있으며 실제
실행은 v2 바인딩과 baseline부터 다시 만든다.

## 제외 범위와 현재 증거

- 실제 Android Chrome·TalkBack: NOT_RUN
- 실제 iOS Safari·VoiceOver: NOT_RUN
- 관찰 사용자: 0명
- 운영 migration, account/cloud, 외부 동기화: 제외
- commit, push, PR, Preview, Production 배포: 미실행
- 방화벽 정책 변경, 인터넷 공개 터널, 제3자 업로드: 미실행

현재 host preflight (로컬 전용 근거: `./artifacts/host-preflight.json`)는 v2 host run binding, 후보·runner
asset SHA와 자동 검증 결과를 보존한다. Android NOT_RUN record (로컬 전용 근거: `./artifacts/android-session.json`)는
schema v2로 명시적 미실행을 기록한다. P3-H1 unit은 56/56, browser E2E는 8/8,
전체 `npm test`는 15회 2,197/2,197, production build는 18/18을 통과했다. 다섯 화면에서
가로 넘침·console error·page error·외부 요청은 모두 0이었다. 이 자동 결과는 실제
Android E5-D가 아니다.

## 완료 조건

1. v2 호스트·기록기·validator와 HTTP 사전검증이 같은 고정 후보에서 PASS다.
2. 실제 Android Chrome의 URL 접속, 환경 신호와 on-device body hash가 모두 존재한다.
3. 같은 binding fingerprint에서 A1~A6이 모두 PASS이거나 FAIL을 재현 가능한 근거와 남긴다.
4. 실제 Android origin의 storage read·byte parity·observer와 자동 writer 회귀가 모두 PASS다.
5. 실제 artifact 파일이 manifest와 일치하고 이름 있는 사람이 전부 검토한다.
6. 추적표와 P3-G/P3-H 보고서가 같은 판정과 후보 SHA를 표시한다.
7. 실패 수정이 있었다면 새 SHA에서 전체 회귀·build·browser·A1~A6을 다시 실행한다.
8. 실제 기기 조작이 없으면 목표를 완료로 닫지 않고 A1~A6을 NOT_RUN으로 유지한다.
