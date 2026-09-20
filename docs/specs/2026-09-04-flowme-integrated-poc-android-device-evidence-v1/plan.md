# P3-H1 실행 계획

고정 후보와 evidence contract v2 기록·판정 경로의 자동 사전검증을 완료했다. 실제 Android Chrome 조작은
0/6이며, artifact 파일 검증과 이름 있는 검토까지 끝나기 전 E5-D는 NOT_RUN이다.

## 1. 후보·운영 경계 고정 — 완료

1. 후보 923,787 bytes와 SHA-256
   `8156D0959F4391DAAEA652E37FFFD0CE7B736617695AC6A090B21D0D1C12417B`를 고정한다.
2. exact-query 통합 PoC와 `flow:poc:personal-workspace:v1:*` 전용 쓰기 경계를 유지한다.
3. PC 사전감사, 자동 browser, 실제 기기, 관찰 사용자 증거를 분리한다.

## 2. evidence contract v2 — 완료

1. host run·origin·후보 SHA·bytes·시작 시각을 canonical fingerprint로 묶는다.
2. Android가 정확한 `/candidate` 응답 body SHA와 bytes를 직접 계산한다.
3. Android·touch·coarse pointer·webdriver·UA Client Hints 신호를 함께 기록한다.
4. A1~A6을 자유 서술이 아닌 필수 구조화 관찰값으로 판정한다.
5. baseline read 성공·상세 key hash parity·A1~A6 post-load writer observer를 요구한다.
6. artifact 실제 파일을 제한된 root 안에서 SHA·bytes·media type으로 검증한다.
7. artifact verifier와 시나리오 검토자를 구분하고 이름 있는 최종 review를 요구한다.
8. v1 실행 증거와 다른 host run draft를 자동 승격하지 않는다.

## 3. v2 호스트·기록기 사전검증 — 완료

1. GET/HEAD-only와 query·path·write-method 차단을 다시 검사한다.
2. manifest·health·runner가 같은 binding fingerprint를 표시하는지 확인한다.
3. 기기 방식과 같은 fetch·body hash가 정확한 후보 bytes를 검증하는지 확인한다.
4. 누락값, 저장 read 실패, headless/desktop, 임의 artifact 이름이 PASS로 승격되지 않는지 확인한다.
5. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 가로 넘침과 오류를 검사한다.
6. 완료된 테스트 수·새 host run·asset hash를 host preflight와 보고서에 반영한다.

P3-H1 unit 56/56, browser E2E 8/8, 전체 `npm test` 15회 2,197/2,197,
production build 18/18을 통과했다. 다섯 화면의 가로 넘침·console error·page error·외부
요청은 모두 0이다.

## 4. Android 실행 준비 — 대기

1. Android를 PC와 같은 Wi-Fi에 연결하고 셀룰러·VPN·게스트망을 끈다.
2. 새 호스트가 출력한 `/runner`를 실제 Chrome 주소창에 직접 입력한다.
3. 실행 바인딩과 기기에서 계산한 후보 body SHA·bytes를 확인한다.
4. 설정·`chrome://version`·주소창·기기 identity artifact를 수집한다.
5. 후보 검증 뒤 A1 전에 실제 origin의 운영 storage baseline을 만든다.

## 5. A1~A6 실행 — 대기

1. observer를 시작하고 A1~A6을 같은 binding에서 순서대로 실행한다.
2. 각 시나리오의 구조화 관찰값·mutation delta·시간·artifact ID를 기록한다.
3. A4는 Android 화면 내 비드래그 control과 같은 SHA desktop keyboard 회귀를 결합한다.
4. A5는 Result → 항목 검토 → 속성 편집에서 owner line·label과 닫기/적용 delta를 기록한다.
5. A6는 소프트 키보드 위 viewport 접근과 reload 복구를 확인한다.
6. observer 종료 뒤 storage after를 읽어 상세 byte parity를 계산한다.

## 6. artifact 검증·판정 — 대기

1. JSON과 캡처 파일을 같은 evidence 디렉터리로 PC에 옮긴다.
2. 명시한 artifact root 안에서 실제 파일의 SHA·bytes·media type을 검증한다.
3. 별도 verified draft를 만들되 `UNREVIEWED`를 자동 변경하지 않는다.
4. 이름 있는 검토자가 모든 A1~A6와 artifact를 확인한 뒤 review를 기록한다.
5. validator가 PASS·E5-D를 반환한 경우에만 추적표와 보고서 판정을 바꾼다.

## 7. 실패 처리·마감

1. 네트워크 실패, 증거 불충분, 제품 행동 실패를 구분한다.
2. 제품 FAIL만 PoC 전용 범위에서 수정하고 새 SHA에서 전체 절차를 반복한다.
3. 전체 `npm test`, production build, browser, docs와 운영 storage 회귀를 갱신한다.
4. 실제 Android가 없으면 NOT_RUN, 기록기 초안뿐이면 INCOMPLETE를 유지한다.
5. 실제 iOS Safari·TalkBack·VoiceOver와 관찰 사용자 증거도 별도 NOT_RUN으로 유지한다.
6. commit·push·PR·Preview·Production은 실행하지 않는다.
