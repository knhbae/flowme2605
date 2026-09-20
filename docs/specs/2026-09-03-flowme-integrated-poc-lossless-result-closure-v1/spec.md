# FlowMe 통합 PoC P2-A 무손실 작성·결과 완결성

- 작성일: 2026-09-03
- 상태: `COMPLETE` (PoC 검증 통과, 전체 npm의 기존 콘텐츠 신선도 실패 1건 별도 기록)
- 대상: `/my?personalWorkspacePoc=v1`, `/flows/new?personalWorkspacePoc=v1`, 조작형 단일 HTML
- 기준선: v4.1 78개, 개발 1 26개, 개발 2 64개 원자 요구

## 사용자 필요

개인 메모와 표·장문 원문으로 Flow를 만드는 사용자는 같은 원본에서 만든 여러 사본을 구분하고,
원문을 잃지 않은 채 월간 일정·TXT·표 결과를 확인하고 자기 도구로 옮길 수 있어야 한다.

## 목표

현재 엄격 판정 `119/168`을 정본에 반영하고, 제품 정책이나 운영 writer 결정 없이 구현할 수 있는
`D1-020`, `D2-017`, `D2-020`, `D2-023`, `D2-024`, `D2-025`의 P2-A 기능 조각을 구현한다. 장문·표는
구조화 성공보다 원문 보존을 우선하며, 안전하게 해석하지 못하는 입력은 exact raw fallback으로
남긴다.

## 기능 계약

### 동일 원본 복수 사본

- source identity가 같은 활성 사본이 하나면 원래 제목만 표시한다.
- 둘 이상이면 안정적인 `savedCopyId`, Flow ref 순서로 `사본 1`, `사본 2`를 붙인다.
- 목록·검색·Flow 상세·편집 진입은 같은 display descriptor를 사용한다.
- 화면용 구분자는 source title, saved copy identity, storage bytes를 바꾸지 않는다.
- 휴지통 항목은 활성 사본 ordinal에서 제외하고 복원 시 다시 결정적으로 계산한다.

### 월간 결과

- 같은 effective Item 배열의 개인 실행 날짜를 사용한다. source 계획일은 실행 날짜를 덮지 않는다.
- 일요일 시작 7열, 표시 월을 포함하는 6주 42칸의 PoC-local 월간 projection을 만든다.
- 날짜 미정 Item은 달력 칸에 억지로 넣지 않고 별도 목록으로 유지한다.
- 같은 ref·완료·날짜·순서를 Todo·TXT·Sheet와 공유하며 결과 전환은 write 0이다.

### TXT·CSV 로컬 다운로드

- 기존 result projection version 2는 유지하고 다운로드 계약만 별도 version 1로 둔다.
- TXT는 `text/plain;charset=utf-8`, 정규화된 LF 본문을 사용한다.
- CSV는 `text/csv;charset=utf-8`, UTF-8 BOM, CRLF, RFC 4180 방식의 큰따옴표 escaping을 사용한다.
- 파일명은 같은 입력에서 항상 같고 경로 구분자·제어문자를 포함하지 않는다.
- 다운로드는 메모리 Blob과 사용자 명시 클릭으로만 만들며 localStorage와 기존 export writer를 호출하지 않는다.

### 표·장문 무손실 adapter

- 입력 원문과 개행 형식을 exact raw로 보존한다.
- Markdown table, CSV, TSV는 열 수와 delimiter가 결정적인 안전 행만 preview row로 투영한다.
- blockquote, fenced code, HTML/comment, 빈 줄과 표 cell 원문은 위치·bytes를 바꾸지 않는다.
- code fence 안의 표 모양 텍스트는 구조화하지 않는다.
- 열 수 불일치, 닫히지 않은 quote, 혼합 delimiter, 위험 HTML 등 모호한 입력은 raw fallback이다.
- adapter는 preview를 만들 뿐 source를 materialize하거나 durable write하지 않는다.

## 31개 corpus 계약

- 기존 Text Authoring 정본의 qualified corpus와 fixture를 출처로 사용한다.
- 각 케이스는 source shape, newline, expected structured/fallback, byte-preservation을 기록한다.
- 원본에 없는 Item·날짜·조건·표 행을 보충하지 않는다.
- 31개 모두 parse 뒤 exact raw round trip과 fallback 이유가 결정적이어야 한다.

## 데이터·안전 경계

- exact query gate 밖에서는 기존 화면으로 fail-closed한다.
- durable write는 `flow:poc:personal-workspace:v1:*`만 허용한다.
- 기본 `/my`, 운영 `flow:*` key/schema와 기존 completion·memo·date·archive·export writer를 바꾸거나 호출하지 않는다.
- `localStorage.clear()`를 호출하지 않는다.
- source bytes와 `savedCopyId + flowId + itemId` identity를 보존한다.
- browse, preview, download 준비, 취소, invalid, unsupported, 같은 값은 state mutation 0이다.

## 범위 밖

- `D1-012` section title owner 결정
- `D2-026` versioned source candidate, provider fetch와 외부 동기화
- CreatorDraft 운영 저장·검색·공개 후보
- 운영 Calendar·Todo·Sheet·export writer
- 지원 증거가 없는 7개 property를 임의로 편집 가능하게 만드는 일
- commit, push, PR, Preview, Production

## 완료 조건

- 동일 source의 복수 사본이 React 목록·작성 검색·선택 상세와 단일 HTML 목록·상세에서 구분된다.
- 월간 결과, TXT 다운로드, CSV 다운로드가 두 surface에서 조작된다.
- 31개 corpus와 표·장문 edge case가 exact raw round trip을 통과한다.
- React·단일 HTML의 결과 manifest, filename, bytes와 상태 의미가 일치한다.
- prefix 밖 set/remove/clear와 운영 sentinel 변화가 0이다.
- 관련 모델·component·브라우저 회귀, 전체 test, production build, docs check를 실제 실행한다.
- 6개 viewport에서 overflow, 가려진 주 행동, console/page error가 0이다.
- 전체 원자 판정과 P2-A 전후 수치를 근거와 함께 갱신한다.
