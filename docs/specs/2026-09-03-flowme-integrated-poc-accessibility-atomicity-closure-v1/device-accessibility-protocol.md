# P3-A 실제 기기·접근성 검증 프로토콜

## 목적과 증거 경계

이 문서는 자동화로 닫을 수 없는 실제 기기·보조기술 gap을 같은 형식으로 기록하기 위한 실행지다. Chromium viewport 변경, Playwright 키 입력, DOM accessibility 검사, 화면 캡처는 자동화 근거다. 실제 Android Chrome·iOS Safari, TalkBack·VoiceOver, OS 글자 크기, 실제 browser 200% 확대, 모바일 가상 키보드와 장시간 사용의 통과 근거로 대신 쓰지 않는다.

현재 상태는 모든 항목 `미실행`이다. 실제 환경에서 과업을 수행하고 환경·실제 결과·pass/fail·storage bytes·관찰자를 채우기 전에는 관련 요구를 충족으로 올리지 않는다.

## 공통 준비

- 검증 대상: exact query `/my?personalWorkspacePoc=v1` 또는 같은 계약의 전달용 독립 HTML
- 운영 데이터 보호: 시작 직전 운영 `flow:*` key/value의 정렬된 byte snapshot과 SHA-256을 기록한다.
- PoC 데이터: `flow:poc:personal-workspace:v1:*`만 변경 대상으로 허용한다.
- 종료 직후 같은 방식으로 운영 snapshot을 다시 만들고 byte-for-byte 비교한다.
- 초기화가 필요하면 정확한 PoC prefix만 지운다. 전체 storage clear는 사용하지 않는다.
- 기기·OS·browser·보조기술 버전과 입력 방식, 방향, 화면 크기, 글자/확대 설정을 실제값으로 기록한다.
- 관찰자가 없다면 `없음`으로 쓰고, 자동화 실행자를 관찰 사용자로 세지 않는다.

## 실행 기록표

| ID | 검증 종류 | 환경 | 과업 | 기대 | 실제 | Pass/Fail | storage byte evidence | 관찰자 |
|---|---|---|---|---|---|---|---|---|
| DA-01 | Android Chrome | 기기·제조사: 미기록<br>Android: 미기록<br>Chrome: 미기록<br>화면·방향: 미기록 | 개인공간 진입 → 항목 선택 → 검토 열기·닫기·Escape → 날짜 drag → pointer cancel → 가상 키보드에서 마지막 입력과 CTA 접근 | accessible name이 의미를 전달하고 focus가 opener로 돌아온다. drag 성공·취소 상태가 구분되며 핵심 action이 가려지지 않는다. 취소·검토 열고 닫기는 write 0이다. | 미실행 | 미판정 | 시작 bytes/hash: 미수집<br>종료 bytes/hash: 미수집<br>diff: 미수집 | 없음 |
| DA-02 | iOS Safari | iPhone: 미기록<br>iOS: 미기록<br>Safari: 미기록<br>화면·방향: 미기록 | DA-01과 같은 과업을 touch·가상 키보드·회전 조건에서 수행 | touch 이동·cancel cleanup·focus·sheet/CTA 접근이 유지되고 운영 bytes가 같다. | 미실행 | 미판정 | 시작 bytes/hash: 미수집<br>종료 bytes/hash: 미수집<br>diff: 미수집 | 없음 |
| DA-03 | TalkBack | Android 기기·OS: 미기록<br>TalkBack: 미기록<br>Chrome: 미기록<br>탐색 단위: 미기록 | 탐색·개인공간 보기·항목 검토를 swipe 탐색하고 검토를 열고 닫는다. 항목 이동을 비드래그 경로로 수행하고 상태 알림을 듣는다. | control의 역할·이름·상태가 구분되고 focus 순서가 논리적이다. 닫기 뒤 opener로 돌아가며 성공·같은 위치·취소·실패 알림을 구분한다. | 미실행 | 미판정 | 시작 bytes/hash: 미수집<br>종료 bytes/hash: 미수집<br>diff: 미수집 | 없음 |
| DA-04 | VoiceOver | iPhone·iOS: 미기록<br>VoiceOver: 미기록<br>Safari: 미기록<br>Rotor 설정: 미기록 | DA-03과 같은 과업을 VoiceOver gesture와 비드래그 이동으로 수행 | 역할·이름·상태·focus 복귀와 알림 순서가 이해 가능하며 운영 bytes가 같다. | 미실행 | 미판정 | 시작 bytes/hash: 미수집<br>종료 bytes/hash: 미수집<br>diff: 미수집 | 없음 |
| DA-05 | OS 최대 글자 | 기기·OS: 미기록<br>글자 크기·display zoom: 미기록<br>browser: 미기록<br>화면·방향: 미기록 | 폴더·오늘·주간·월간·날짜 미정·작성·검토 surface를 열고 마지막 내용과 CTA까지 이동 | 텍스트가 잘리지 않고 가로 넘침이 없으며 핵심 action과 상태가 가려지지 않는다. 정보 순서와 control 이름을 읽을 수 있다. | 미실행 | 미판정 | 시작 bytes/hash: 미수집<br>종료 bytes/hash: 미수집<br>diff: 미수집 | 없음 |
| DA-06 | 실제 browser 200% 확대 | 기기·OS: 미기록<br>browser·버전: 미기록<br>zoom: 200%<br>viewport: 미기록 | desktop browser의 실제 200% zoom에서 탐색·검토·작성·이동·Undo를 키보드로 수행 | 2차원 스크롤 의존 없이 핵심 흐름을 완료하고 focus indicator, 이름, 상태, CTA가 보인다. 운영 bytes가 같다. | 미실행 | 미판정 | 시작 bytes/hash: 미수집<br>종료 bytes/hash: 미수집<br>diff: 미수집 | 없음 |
| DA-07 | 장시간 사용 | 기기·OS·browser: 미기록<br>세션 길이: 미기록<br>반복 횟수: 미기록<br>네트워크/전원 조건: 미기록 | 작성→저장→개인공간→이동·완료·다시 열기·Undo·reload를 반복하고 중간 실패·백그라운드 복귀를 포함 | focus·선택·저장 상태가 누적해서 어긋나지 않고 마지막 성공 상태가 복원된다. 운영 bytes가 같고 허용 prefix 밖 writer가 없다. | 미실행 | 미판정 | 시작 bytes/hash: 미수집<br>중간 checkpoint: 미수집<br>종료 bytes/hash: 미수집<br>diff: 미수집 | 없음 |

## 과업별 기록 보조 필드

실행할 때 각 행 아래에 다음 기록을 덧붙인다.

- 실행 일시와 시간대:
- 실행자:
- 관찰자 이름 또는 식별자:
- 관찰 방식: 대면 / 원격 / 없음
- 화면 녹화·사진 경로:
- 시작 URL 또는 독립 HTML SHA-256:
- 시작 운영 snapshot 파일·SHA-256:
- 종료 운영 snapshot 파일·SHA-256:
- 허용 prefix 밖 `setItem`·`removeItem` 수:
- 전체 storage clear 호출 수:
- 성공한 단계:
- 실패한 단계와 재현 절차:
- 사용자 발화 또는 관찰 메모:
- 최종 판정: PASS / FAIL / BLOCKED
- 판정자와 판정 일시:

## 판정 규칙

- `PASS`: 표의 모든 기대를 실제 환경에서 확인하고 운영 snapshot이 byte-for-byte 같다.
- `FAIL`: 기대 중 하나라도 재현 가능한 방식으로 어긋나거나 운영 bytes가 달라진다.
- `BLOCKED`: 설치·권한·기기 결함 등으로 과업을 끝내지 못했다. 통과로 세지 않는다.
- 한 기기·보조기술의 결과를 다른 행으로 전용하지 않는다.
- 화면 캡처만 있고 실제 조작·storage 증거가 없으면 미판정으로 유지한다.
- 관찰 사용자 수는 과업을 수행하며 행동이나 발화를 실제로 관찰한 사람만 센다.

## 현재 요약

- 실제 실행: 0/7
- PASS: 0
- FAIL: 0
- BLOCKED: 0
- 미실행: 7
- 관찰 사용자: 0명

최종 실제 기기·접근성 실행 후 갱신 필요.
