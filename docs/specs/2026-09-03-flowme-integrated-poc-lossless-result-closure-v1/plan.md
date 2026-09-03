# P2-A 실행 계획

## 1. 기준선과 추적 정정

- stale 원자 JSON과 이후 제품 UX·P1 근거를 대조한다.
- `D1-020` 과대 판정을 코드 기준으로 부분으로 내린다.
- 원 요구 전체 판정과 PoC 기능 조각 판정을 분리한다.

## 2. 복수 사본 구분

- source group과 active copy ordinal을 만드는 순수 모델을 구현한다.
- 목록·검색·상세·편집 opener가 같은 display descriptor를 사용한다.
- 단일 사본, 휴지통, 복원, reload, 같은 제목·다른 source를 검증한다.

## 3. 월간 결과와 다운로드

- effective Item에서 42칸 월간 projection과 날짜 미정 목록을 만든다.
- TXT·CSV payload, filename, MIME, newline, escaping 계약을 순수 모델로 만든다.
- React와 단일 HTML에서 명시 클릭 다운로드를 연결한다.

## 4. 표·장문 무손실 adapter

- Markdown table, CSV, TSV의 safe parse와 raw fallback을 구현한다.
- blockquote, code fence, HTML/comment, 빈 줄과 개행을 exact raw로 보존한다.
- 기존 qualified corpus에서 31개 fixture를 고정하고 round-trip을 검사한다.

## 5. parity와 안전 검증

- React와 단일 HTML의 copy label, month manifest, TXT/CSV bytes를 비교한다.
- download 전후 storage ledger와 운영 sentinel을 비교한다.
- unsupported·invalid·cancel 경로 mutation 0을 확인한다.

## 6. 전체 검증과 보고

- targeted model/component, standalone Node, 관련 회귀, 전체 test와 build를 실행한다.
- Chromium에서 320×700, 375×812, 390×844, 844×390, 1024×768, 1440×900을 검사한다.
- 정본 추적표, QA와 조작 가능한 HTML 보고서를 갱신한다.
- 실제 기기·관찰 사용자·게시 상태를 자동화와 분리한다.
