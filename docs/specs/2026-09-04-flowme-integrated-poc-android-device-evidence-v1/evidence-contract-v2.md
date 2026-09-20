# P3-H1 Android evidence contract v2

v1 기록기는 실제 기기 입력을 받을 수 있었지만, 저장소 읽기 실패·자유 서술 PASS·존재하지
않는 artifact 이름도 최종 E5-D로 오판할 수 있었다. v2는 후보 기능이나 bytes를 바꾸지
않고 기록·판정 경로만 fail-closed로 강화한다.

## 실행 바인딩

- `schemaVersion`: `2`
- `contractVersion`: `flowme-personal-workspace-p3h1-android-evidence-v2`
- `runBinding`: `hostRunId`, 사설 LAN `origin`, 고정 후보 SHA-256·bytes, `createdAt`
- `bindingFingerprint`: 위 다섯 값을 `|`로 연결한 정규 문자열
- 모든 A1~A6 행과 저장 observer는 같은 `bindingFingerprint`를 가져야 한다.
- manifest·origin·후보 SHA·bytes 중 하나라도 달라지면 기존 시나리오와 baseline을 폐기한다.

## 실제 환경

기존 모델·OS·Chrome 전체 버전·build·UA·주소창·같은 LAN 확인에 다음 신호를 더한다.

- `navigator.webdriver === false`
- `navigator.maxTouchPoints > 0`
- `(pointer: coarse)` 일치
- `HeadlessChrome` UA 거부
- UA Client Hints가 있으면 `mobile === true`, `platform === Android`

이 값은 기기 attestation이 아니라 거짓 양성을 줄이는 보조 신호다. 기기 설정,
`chrome://version`, 주소창 화면 artifact와 이름이 있는 검토자를 계속 요구한다.

## 후보 본문 확인

manifest의 자기 보고만 복사하지 않는다. 실제 Android가 현재 origin의 정확한
`/candidate`를 직접 fetch하고 응답 body의 SHA-256과 bytes를 계산한다. URL에는 query,
hash, credentials가 없어야 한다. 상태, Content-Type, 응답 SHA header, 계산 시각과
`on-device-byte-hash` 방법을 기록한다.

## A1~A6 구조화 관찰

각 행은 상태·시간·메모·artifact ID 외에 다음 값을 가진다.

| ID | 필수 구조화 값 |
|---|---|
| A1 | `android-pointer-location-video`, hold `<350ms`, 이동 `>=8 CSS px`, 이동 패널 false, 성공 mutation delta `0` |
| A2 | native menu false, FlowMe 이동 패널 true, 목적지 선택 true, 성공 mutation delta `1` |
| A3 | 중단 방법, 취소 표시 true, 패널 닫힘 true, ghost click `0`, 성공 mutation delta `0` |
| A4 | `…` 폴더 이동 true, 화면 내 비드래그 순서 이동 true, 공통 transition true, 각 mutation delta `1`, desktop keyboard 회귀 ID |
| A5 | opener line과 tray owner line의 양의 정수·동일성, owner label 동일성, 실제 키보드·마지막 속성 행 접근 true, 닫기 delta `0`, opener focus 복귀 true, 적용 delta `1` |
| A6 | 실제 키보드, caret·마지막 field·저장 CTA가 visual viewport 안, reload 완료, 마지막 성공 상태만 복원, 예상 밖 상태 false |

값 누락은 `INCOMPLETE`, 명시적 기준 위반은 `FAIL`이다. A4의 Android 실기는 화면의
비드래그 control을 확인하고, 실제 키보드 동등성은 같은 SHA의 P3-G desktop keyboard
회귀 근거와 결합한다. 소프트 키보드를 hardware keyboard 증거로 표현하지 않는다.

## 저장 경계

- baseline은 후보 본문 검증 뒤, A1 시작 전에 한 번만 만든다.
- `beforeReadable`, `afterReadable`, `byteParity`가 모두 true여야 한다.
- 전후 key 수, 정렬 key, value UTF-8 bytes와 SHA-256 배열이 정확히 같아야 한다.
- 실제 observer의 A1~A6 post-load 범위에서 prefix 밖 `setItem`, `removeItem`, `clear`가
  각각 0이어야 한다.
- 같은 후보 SHA에 고정된 자동 브라우저 writer 회귀 0건 근거를 별도로 결합한다.
- 읽기 실패 두 번의 빈 checksum이나 사용자가 입력한 기본값 `0`은 증거가 아니다.

## artifact와 검토

artifact는 문자열이 아니라 다음 구조다.

`id`, 상대 경로, SHA-256, 양의 bytes, media type, 촬영 시각, 역할 목록,
`filesystem-sha256` 검증 시각·검증자.

필수 역할은 `device-identity`, `browser-version`, `address-bar`, `storage-parity`, A1~A6이다.
한 파일이 여러 역할을 가질 수 있다. CLI는 evidence JSON 디렉터리 또는 명시한 artifact
root 안에서만 상대 경로를 해석하고 absolute path·`..` 이탈·symlink 이탈을 거부한다.
실제 파일의 bytes와 SHA-256이 JSON과 같아야 한다.

최종 PASS는 파일 검증에 더해 이름 있는 검토자가 A1~A6 artifact를 실제로 확인한
`artifactReview=REVIEWED`를 요구한다. 기록기에서 막 입력한 초안은 최대
`INCOMPLETE`이며 자동으로 E5-D가 되지 않는다.

## v1 처리

v1 evidence와 session draft는 v2로 자동 승격하지 않는다. 명시적 `NOT_RUN` 기록만
보관할 수 있고, 실행 증거는 v2에서 새 후보 확인·baseline·A1~A6으로 다시 만든다.
