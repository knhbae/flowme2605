# P3-H1 handoff

## 상태

Android evidence contract를 v2로 강화했다. 한 host run 바인딩, 기기에서 직접 계산한
후보 본문 hash, A1~A6 구조화 관찰, storage read/parity/observer, 실제 artifact 파일 SHA와
이름 있는 검토가 모두 있어야 E5-D가 된다. 기록기 raw JSON은 최대 INCOMPLETE이고
단독으로 PASS가 될 수 없다.

v2 LAN 호스트와 기록·판정 경로의 자동 사전검증을 완료했다. P3-H1 unit은 56/56,
browser E2E는 8/8, 전체 `npm test`는 15회 2,197/2,197, production build는 18/18을
통과했다. 다섯 화면의 가로 넘침·console error·page error·외부 요청은 모두 0이다.
문서 검사는 필수 파일 16개·로컬 링크 4,647개를 통과했다. 실제 Android Chrome 접속과
A1~A6은 0/6이며 모두 NOT_RUN이다.

## 고정 후보

- 파일: Android single-file HTML (로컬 전용 근거: `../../content-audit/2026-09-02-flowme-integrated-flow-poc-android-single-file-ko.html`)
- 크기: 923,787 bytes
- SHA-256: `8156D0959F4391DAAEA652E37FFFD0CE7B736617695AC6A090B21D0D1C12417B`
- 증거 정본: [evidence contract v2](./evidence-contract-v2.md)

후보가 한 byte라도 달라지면 새 SHA로 호스트 사전검증과 A1~A6 전체를 다시 실행한다.

## v2가 추가한 보호

- `hostRunId|origin|candidateSha256|candidateBytes|createdAt` fingerprint로 실행 혼합 차단
- Android에서 정확한 `/candidate`를 fetch해 body SHA·bytes 직접 계산
- webdriver·touch·coarse pointer·UA Client Hints로 desktop/headless 거짓 양성 축소
- 자유 서술 대신 A1~A6 필수 구조화 observation 판정
- storage before/after readable, 상세 key hash parity, post-load writer observer 결합
- 같은 후보 SHA의 자동 browser writer 회귀 결합
- artifact root 이탈 차단과 실제 파일 SHA·bytes·media type 검증
- filesystem verifier와 시나리오 reviewer 분리, named `REVIEWED` 필수
- v1 EXECUTED와 다른 host run draft 자동 승격 금지

## 다음 실행 순서

1. Android와 PC를 같은 Wi-Fi에 두고 실제 Chrome 주소창으로 현재 `/runner`를 연다.
2. host run ID `e2a6dff7-0325-4ef2-b98f-63bbfa219ef6`과 화면의 binding을 대조한다.
3. 자동 표시된 기기 identity와 on-device `/candidate` SHA·bytes를 확인하고 화면 근거를 남긴다.
4. baseline을 만든 뒤 observer를 시작하고 같은 binding에서 A1~A6을 실행한다.
5. observer 종료·storage after parity·artifact 경로를 기록해 raw JSON을 내려받는다.
6. JSON과 파일을 한 evidence root로 옮겨 filesystem verifier로 별도 verified draft를 만든다.
7. 이름 있는 검토자가 모든 A1~A6와 artifact를 확인해 `REVIEWED`를 기록한다.
8. 최종 validator PASS일 때만 추적표와 P3-G/P3-H의 Android E5-D를 바꾼다.

## A4·A5·A6 주의

- A4 Android에서는 화면 안의 비드래그 순서 이동을 사용한다. 실제 키보드 동등성은 같은
  후보 SHA의 P3-G desktop keyboard 회귀 ID를 결합한다.
- A5는 새 Flow 만들기 → Result → 항목 검토 → 속성 편집이다. opener `data-line`과
  tray/form `data-owner-line`·label 일치, 실제 소프트 키보드, 닫기 delta 0·focus 복귀,
  적용 delta 1을 기록한다.
- A6는 실제 소프트 키보드 위 caret·마지막 field·저장 CTA viewport 접근, 키보드를 닫은
  뒤 reload, 마지막 성공 상태만 복원을 기록한다.

## 판정 경계

- 기존 HTTP 자동검사와 Desktop Chromium은 E4 host readiness다.
- 실제 Android Chrome 조작과 완전한 v2 증거만 E5-D 후보가 된다.
- raw 기록기 JSON은 `UNREVIEWED`이므로 PASS가 아니다.
- LAN HTTP의 secure-context API 부재는 metadata이며 행동 기준을 대체하지 않는다.
- PoC write는 `flow:poc:personal-workspace:v1:*`에만 허용한다.
- 실제 Android origin의 운영 `flow:*` read·bytes와 observer가 모두 안전해야 한다.
- 메신저·파일 미리보기·webview·headless browser는 실제 Chrome으로 인정하지 않는다.
- 실제 Android·iOS·TalkBack·VoiceOver: NOT_RUN
- 관찰 사용자: 0명
- commit·push·PR·Preview·Production: 미실행

## 현재 없는 근거

- 실제 Android 모델·OS·Chrome·UA·주소창과 on-device body hash
- A1~A6 구조화 결과와 캡처
- 실제 Android storage before/after/observer/parity
- artifact filesystem verification과 named review

현재 기계 판독 상태는 schema v2 Android NOT_RUN record (로컬 전용 근거: `./artifacts/android-session.json`),
호스트 기록은 host preflight (로컬 전용 근거: `./artifacts/host-preflight.json`)에 둔다. 이 근거가 없으므로
P3-H1은 완료가 아니며 primary gap 7과 Production ready false를 유지한다.
