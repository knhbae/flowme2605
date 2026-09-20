# P3-H1 QA와 증거 판정

## 증거 단계

| 단계 | 의미 | 현재 상태 | Android E5-D 여부 |
|---|---|---:|---:|
| PC 사전감사 | LAN 주소·런타임·후보·기존 방화벽 상태 확인 | PASS | 아니오 |
| v2 host readiness | GET/HEAD·경로·method·고정 후보 HTTP 검사 | PASS | 아니오 |
| v2 기록·판정 재검증 | binding·body hash·구조화 관찰·storage·artifact gate | PASS | 아니오 |
| Android 접속·본문 확인 | 실제 Chrome 주소창과 on-device `/candidate` hash | NOT_RUN | 일부 메타데이터만 |
| Android A1~A6·검토 | 실제 조작·storage parity·파일 검증·named review | NOT_RUN | 예 |

PC PASS와 자동화 PASS를 Android PASS로 합산하지 않는다. 기록기에서 내려받은 JSON도
검사 자료의 초안이다. 실제 artifact 파일 검증과 이름 있는 검토가 없으면 최대
INCOMPLETE이며 E5-D로 승격하지 않는다.

## 현재 PC 사전감사 결과

| 항목 | 관찰값 | 판정 범위 |
|---|---|---|
| 활성 인터페이스 | Wi-Fi, 192.168.45.231/24, gateway 192.168.45.1 | 점검 시점의 PC만 |
| 주소 성격 | DHCP, Public network | 다음 host run에서 재확인 |
| 런타임 | Node 24.17.0, npm 11.13.0, Python 3.13.7 | 호스트 구현 가능성 |
| 기존 inbound | 현재 Node 실행 파일에 Public/TCP/Any allow | 규칙 변경 근거 아님 |
| 후보 | 923,787 bytes, 고정 SHA-256 일치 | 로컬 파일 정합성 |

방화벽을 만들거나 수정하지 않았다. 2026-09-04 17:55 KST에 시작한 v2 host run에서
`192.168.45.231:4173`의 `/health`, `/manifest.json`, `/candidate`를 PC에서 확인했다.
`hostRunId`는 `e2a6dff7-0325-4ef2-b98f-63bbfa219ef6`, `createdAt`은
`2026-09-04T08:55:32.625Z`다. 실제 Android 요청은 관찰되지 않았다.

## v2 fail-closed gate

| ID | gate | PASS 기준 | 누락·위반 |
|---|---|---|---|
| V1 | contract | schema 2와 exact v2 contract | INCOMPLETE |
| V2 | run binding | 현재 host run의 다섯 필드와 canonical fingerprint 일치 | INCOMPLETE/FAIL |
| V3 | actual environment | Android Chrome, touch/coarse, webdriver false, UA/Client Hints 일관 | INCOMPLETE/FAIL |
| V4 | candidate body | exact `/candidate` 200, body SHA·bytes·header 일치, on-device 방법 | INCOMPLETE/FAIL |
| V5 | A1~A6 | 같은 fingerprint·시간·구조화 관찰·artifact refs 완비 | INCOMPLETE/FAIL |
| V6 | storage | before/after readable, 상세 key hash parity, observer·자동 회귀 writer 0 | INCOMPLETE/FAIL |
| V7 | artifact files | safe relative path, 실제 SHA·bytes·media type 일치 | INCOMPLETE/FAIL |
| V8 | named review | A1~A6와 모든 artifact를 이름 있는 검토자가 확인 | INCOMPLETE |

명시적 행동 기준 위반, 운영 storage 변화·읽기 실패, forbidden writer 또는 실제 파일
불일치는 FAIL이다. 증거 필드, 실제 파일, named review가 빠진 경우는 INCOMPLETE다. 실제
조작 자체가 없으면 NOT_RUN이다. v1 EXECUTED JSON은 v2로 자동 변환하지 않는다.

## 호스트 자동검사 matrix

| ID | 검사 | 수용 기준 | v2 현재 |
|---|---|---|---:|
| H1 | 시작 fingerprint | 후보 크기·SHA·bind·port가 고정 기록과 일치 | PASS |
| H2 | GET | 200, exact bytes, 923,787 bytes, 고정 SHA | PASS |
| H3 | HEAD | 200, body 0, GET과 같은 핵심 header | PASS |
| H4 | 쓰기 method | POST·PUT·PATCH·DELETE 405, 파일·storage 변화 0 | PASS |
| H5 | 경로 제한 | unknown 404, query·traversal 400, 목록 노출 0 | PASS |
| H6 | browser smoke | HTTP shell·개인공간·작성 진입, console/page error 0 | PASS |

새 run binding·body hash·초안 비승격 회귀를 포함한 P3-H1 unit은 56/56, browser E2E는
8/8을 통과했다. 이 자동 결과는 실제 Android 실기를 대체하지 않는다.

## A1~A6 판정표

| ID | 필수 구조화 관찰 | 필수 artifact 역할 | 현재 |
|---|---|---|---:|
| A1 | pointer 영상, hold `<350ms`, 이동 `>=8px`, panel false, delta 0 | A1 | NOT_RUN |
| A2 | native menu false, FlowMe panel·목적지 true, delta 1 | A2 | NOT_RUN |
| A3 | 중단 방법, 취소·panel close true, ghost 0, delta 0 | A3 | NOT_RUN |
| A4 | 메뉴 폴더·비드래그 순서·공통 transition true, 각 delta 1, desktop 회귀 ID | A4 | NOT_RUN |
| A5 | opener/tray line·label 동일, Android 키보드, 마지막 행, 닫기 0·적용 1·focus 복귀 | A5 | NOT_RUN |
| A6 | Android 키보드, caret·field·CTA viewport 안, reload·마지막 성공 복원, 예상 밖 상태 false | A6 | NOT_RUN |

A5는 새 Flow 만들기 → Result → 항목 검토 → 속성 편집 경로의 실제 control을 사용한다.
버튼 `data-line`과 tray/form `data-owner-line`을 모두 기록한다. A4는 화면 내 비드래그
control 실기와 같은 SHA의 P3-G desktop keyboard 회귀를 결합한다.

## 기기·후보 identity 수용 기준

- 기기 설정에서 제조사·정확한 모델·Android version·build fingerprint를 확인한다.
- `chrome://version`에서 Google Chrome 전체 버전을 확인한다.
- 실제 주소창, navigator.userAgent, 독립 Chrome tab, 같은 LAN을 기록한다.
- webdriver false, touch point 양수, coarse pointer true를 기록한다.
- UA Client Hints가 있으면 mobile true·platform Android여야 한다.
- Android가 현재 origin의 query 없는 `/candidate`를 직접 fetch해 body SHA·bytes를 계산한다.
- device identity·browser version·address bar artifact를 실제 파일로 검증한다.

메신저 미리보기, 파일 앱, custom tab, embedded webview, HeadlessChrome은 실제 Android
Chrome으로 세지 않는다. 신호는 attestation이 아니므로 화면 artifact와 named review를
대체하지 않는다.

## 운영 storage 판정

1. 후보 본문 확인 뒤 A1 전에 실제 origin의 모든 `flow:*`를 읽는다.
2. `flow:poc:personal-workspace:v1:*`는 허용 쓰기 범위로 제외한다.
3. 운영 key를 정렬하고 각 value의 UTF-8 bytes와 SHA-256을 before에 기록한다.
4. observer를 시작해 A1~A6 전체를 덮는다.
5. A6 reload 뒤 after를 다시 읽고 정확한 key·bytes·hash parity를 계산한다.
6. `beforeReadable`, `afterReadable`, `byteParity`가 모두 true여야 한다.
7. observer의 prefix 밖 setItem·removeItem·clear가 각각 0이어야 한다.
8. 같은 후보 SHA의 자동 browser writer 회귀도 PASS·0건이어야 한다.

운영 key가 0개이면 `keyCount=0`, 빈 keys 배열, 읽기 성공과 parity를 명시한다. 저장 읽기
실패 두 번을 빈 배열 equality로 처리하거나 사용자가 writer 수 `0`을 직접 입력한 값은
증거가 아니다.

## artifact 파일·검토 판정

- 필수 역할: `device-identity`, `browser-version`, `address-bar`, `storage-parity`, A1~A6
- manifest: id, 안전한 상대 경로, SHA-256, 양의 bytes, media type, 촬영 시각, 역할
- 실제 파일: 명시한 artifact root 안에 존재하고 manifest의 SHA·bytes·media type과 일치
- filesystem verifier: 이름, 검증 시각, `filesystem-sha256`
- artifact review: 이름·시각, A1~A6 전체와 모든 artifact ID, `REVIEWED`

검증기는 absolute path, `..` 이탈, symlink 이탈을 거부한다. 파일 검증기는 verified
draft를 만들 수 있지만 `UNREVIEWED`를 `REVIEWED`로 자동 변경하지 않는다.

## 현재 결과

- PC·v2 host-readiness: PASS
- v2 validator·CLI·browser model·host: 56/56 PASS — TS+CLI 27, browser model+host 29
- P3-H1 browser E2E: 8/8 PASS
- 전체 `npm test`: 15회, 2,197/2,197 PASS
- production build: 18/18 routes PASS
- v2 기록기 390×844, 375×812, 844×390, 1024×768, 1440×900: 가로 넘침·console error·page error·외부 요청 0
- 문서 검사: 필수 파일 16개·로컬 링크 4,647개 PASS
- 실제 Android Chrome URL 접속·on-device body hash: NOT_RUN
- Android A1~A6: 0/6, 모두 NOT_RUN
- 실제 Android storage read·parity·observer: NOT_RUN
- 실제 Android artifact filesystem verification·named review: NOT_RUN
- 실제 iOS Safari·TalkBack·VoiceOver: NOT_RUN
- Android NOT_RUN record (로컬 전용 근거: `./artifacts/android-session.json`): schema v2
- host preflight (로컬 전용 근거: `./artifacts/host-preflight.json`): v2 run binding·asset SHA·자동 결과
- 관찰 사용자: 0명
- commit·push·PR·Preview·Production: 모두 미실행

따라서 P3-G primary 판정 138/4/3/11/12와 gap 7은 바뀌지 않는다.
