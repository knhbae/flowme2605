# P2-A QA 기록

- 상태: `COMPLETE_WITH_KNOWN_REPO_FAILURE`
- 실제 Android Chrome: 미실행
- 실제 iOS Safari: 미실행
- screen reader: 미실행
- 실제 browser 200% zoom: 미실행
- 관찰 사용자: 0명
- commit·push·PR·Preview·Production: 미진행

## 필수 모델 시나리오

1. 같은 source의 사본 둘은 서로 다른 화면 label, 서로 다른 stable identity를 가진다.
2. 단일 사본과 휴지통만 남은 사본은 불필요한 ordinal을 표시하지 않는다.
3. 실행 날짜 이동은 월간 칸만 바꾸며 source 계획일과 Flow 소속을 바꾸지 않는다.
4. TXT와 CSV payload 생성은 source/state/storage를 바꾸지 않는다.
5. CSV quote, comma, tab, CRLF, embedded newline과 한글이 결정적으로 encoding된다.
6. Markdown/CSV/TSV safe row만 preview되고 모호한 행은 raw fallback한다.
7. blockquote, fenced code, HTML/comment, blank line은 exact raw round trip한다.
8. 31개 corpus의 input bytes와 returned raw bytes가 모두 같다.
9. malformed payload와 unsupported origin은 기존 화면으로 fail-closed한다.

## 필수 브라우저 시나리오

1. 같은 source의 두 사본을 목록·검색·상세에서 구분하고 각각 연다.
2. 작성 결과의 월간 탭에서 날짜 이동·완료 결과를 같은 ref로 확인한다.
3. TXT와 CSV를 클릭해 실제 download event, filename, payload bytes를 확인한다.
4. 다운로드 전후 PoC state와 비-PoC sentinel이 같다.
5. React와 단일 HTML에서 동일 fixture의 label·month·download 결과가 같다.
6. 여섯 viewport에서 핵심 조작 가림·overflow·console/page error가 0이다.

## 실행 기록

- 개인공간 PoC 모델: `npm.cmd run test:personal-workspace-poc` 범위 355/355 통과
- 무손실·두 표면 parity: 48/48 통과
- standalone 모델·결정적 단일 HTML: 54/54 통과
- P2-A 집중 Chromium: 3/3 통과
- React+standalone 최종 Chromium 회귀: 30/30 통과
- 추적표+P2-A 보고서 Chromium: 4/4 통과
- 전체 `npm.cmd test`: 1,619/1,620 통과, 1건 실패 후 중단
  - 기존 `dog-adoption-first-week.review_due=2026-06-04` 콘텐츠 신선도 검사 1건
  - 중단 뒤 `test:approved-plan-execution` 201/201, `test:public-plan-surface` 19/19 별도 통과
- production build: 18/18 page 생성
- 문서 검사: 필수 파일 16개, 로컬 링크 4,594개 통과

## 브라우저·시각 확인

- `320×700`, `390×844`, `375×812`, `844×390`, `1024×768`, `1440×900` Chromium 자동화 통과
- 가로 page overflow, console error, page error, 가려진 핵심 행동: 0건
- React 결과·무손실 표, standalone 결과, P2-A 보고서의 모바일·가로·데스크톱 캡처를 직접 확인
- 좁은 화면의 Sheet는 내부 가로 이동과 강한 줄바꿈을 사용한다. 기능은 접근 가능하지만 다음 시각 완성도 패스의 개선 대상이다.

## 저장 경계

- 허용 prefix 밖 `setItem`·`removeItem`: 0건
- `localStorage.clear()`: 0건
- 자동화 fixture의 운영 `flow:*` snapshot 차이: 0 byte
- 실제 사용자 browser profile과 운영 backend를 직접 열어 검사한 증거는 아니다.
