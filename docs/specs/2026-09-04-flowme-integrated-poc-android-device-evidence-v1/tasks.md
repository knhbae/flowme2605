# P3-H1 작업 목록

## 후보·host readiness

- [x] P3-G E4와 실제 Android E5-D 판정 분리
- [x] 후보 923,787 bytes와 SHA-256 고정
- [x] PC Wi-Fi·DHCP·Node·포트·기존 방화벽 상태 읽기 전용 확인
- [x] A5를 Result → 항목 검토 → 속성 편집/data-owner-line으로 매핑
- [x] GET/HEAD-only·path/query/method 차단 host 구현
- [x] 기존 HTTP Desktop Chromium·5개 화면 사전검증

## evidence contract v2 강화

- [x] [v2 정본 계약](./evidence-contract-v2.md) 작성
- [x] hostRunId·origin·후보 SHA/bytes·createdAt 실행 바인딩 설계
- [x] Android `/candidate` on-device body hash 계약
- [x] Android 실제 환경·anti-headless/touch/UA Client Hints 신호 계약
- [x] A1~A6 구조화 observation과 누락/위반 판정 분리
- [x] storage read·상세 key hash parity·post-load observer 계약
- [x] artifact safe relative path·filesystem SHA/bytes/media type 계약
- [x] named artifact review와 기록기 초안 비승격 계약
- [x] v1 EXECUTED 자동 승격 금지
- [x] v2 validator·browser model·host·기록기 56/56 PASS
- [x] 새 host run binding·asset hash로 host-preflight 갱신
- [x] v2 browser E2E 8/8과 5개 화면 캡처·오류·overflow 재검증

## 실제 Android Chrome

- [ ] 같은 Wi-Fi 실제 Chrome `/runner` 접속 — NOT_RUN
- [x] schema v2 Android NOT_RUN record (로컬 전용 근거: `./artifacts/android-session.json`)
- [ ] 현재 host binding과 on-device `/candidate` body hash — NOT_RUN
- [ ] 모델·Android build·Chrome 전체 버전·UA·주소창 artifact — NOT_RUN
- [ ] 실제 origin storage baseline readable — NOT_RUN
- [ ] A1 조기 이동 long-press 취소 구조화 기록 — NOT_RUN
- [ ] A2 long-press 날짜 이동 구조화 기록 — NOT_RUN
- [ ] A3 drag/pointer cancel 저장 0 구조화 기록 — NOT_RUN
- [ ] A4 메뉴 폴더·비드래그 순서 이동·desktop 회귀 결합 — NOT_RUN
- [ ] A5 실제 owner·키보드·닫기·재적용 — NOT_RUN
- [ ] A6 마지막 field·CTA·reload 복구 — NOT_RUN
- [ ] observer 종료·storage after readable·byte parity — NOT_RUN
- [ ] artifact filesystem 검증·named review — NOT_RUN

## 실패·회귀·보고

- [x] P3-G 정본 매핑 교정 — D2-038=A5/I5, D2-042=A6/I6/X5
- [x] v2 unit 56/56, browser 8/8, 전체 회귀 2,197/2,197, build 18/18 갱신
- [ ] 실제 제품 FAIL이 있을 때만 PoC 범위 수정 — 대기
- [ ] 수정 시 새 SHA로 host와 A1~A6 전체 재실행 — 대기
- [ ] 요구사항 추적표·P3-G/P3-H에 실제 Android E5-D 반영 — 실제 증거 대기
- [x] P3-H1 host-readiness HTML에 v2 판정 경계 반영
- [x] 실제 Android·iOS·TalkBack·VoiceOver NOT_RUN 유지
- [x] 관찰 사용자 0명 유지
- [x] commit·push·PR·Preview·Production 미실행 유지

기록기가 만든 raw JSON은 검사 자료를 모으는 초안이다. 실제 artifact 파일 검증과 이름
있는 검토가 없으면 최대 INCOMPLETE이며, Android E5-D PASS로 사용할 수 없다.
