# 2026-07-04 Claude URL 진입 UX 기획 정리

## 상태

- 문서 유형: 외부 기획 산출물 정리 / 제품 백로그 정렬
- 원본 입력: `D:\flowme2605\flow-mvp\claude_work\FlowMe 진입점 관련 고민 01.zip`
- 주요 원본: `FlowMe 진입 UX 기획 (URL 재사용).dc.html`
- 관련 기존 문서:
  - [Flow 사용 입구 백로그](./2026-07-02-flow-usage-entry-backlog-ko.md)
  - [Flow 사용 입구 백로그 HTML](./2026-07-02-flow-usage-entry-backlog-ko.html)
  - [Claude Design 실행 백로그](./2026-07-03-claude-design-action-backlog-ko.md)
  - [Claude Design P6 final review package](./2026-07-04-claude-design-p6-final-review-package/README.md)
- 읽기용 HTML: [Claude URL 진입 UX 정리 보드](./2026-07-04-claude-entry-ux-plan-summary-ko.html)

## 한 줄 결론

Claude 기획은 현재 제품 방향과 대체로 일치한다. 핵심은 `URL 입력 -> canonical 정규화 -> 기존 Flow 조회 -> 재사용/옵션 변경 -> 저장/export`이며, AI 생성은 기존 Flow가 없거나 품질이 낮을 때만 쓰는 fallback이다.

다만 바로 제품 백로그로 넣을 때는 세 가지를 조정해야 한다.

1. 실제 사용 데이터가 없는데 `N명이 사용`, 완주율, 신뢰 점수처럼 보이는 social proof를 사용자 화면에 내면 안 된다.
2. `export`는 초기 획득 동선에서는 로그인 뒤로 미루지 말고 가능한 한 비로그인 복사/다운로드를 허용하는 쪽이 맞다. 로그인은 My Flow 저장, fork, 공유/public 전환에서 요구하는 편이 낫다.
3. 원문 스냅샷과 content hash는 필요하지만, MVP에서 본문 전체를 복제하는 구조로 시작하면 저작권과 저장 비용이 커진다. 최소 저장은 canonical URL, 원문 제목, 작성자/매체, 추출 시점, 짧은 근거 row, hash/etag 후보로 제한한다.

## Claude 산출물에서 채택할 기준선

| 기준 | 채택 판단 | 이유 |
| --- | --- | --- |
| 재사용 우선, AI는 fallback | 채택 | AI 비용을 낮추고 같은 URL의 Flow를 축적하는 현재 결정과 일치한다. |
| 한 화면에 한 결정 | 채택 | `쓰기 / 고치기 / 새로 만들기`를 동시에 강하게 노출하면 첫 진입이 무거워진다. |
| 출처가 카드, 상세, export까지 따라감 | 채택 | source-backed Flow의 신뢰와 저작권 경계를 지키는 최소 조건이다. |
| 저장은 끝이 아니라 실행 시작 | 채택 | 기존 My Flow P0~P6 정리 방향과 같다. 저장 직후 빈 성공 화면은 회귀다. |
| 메모 입력을 URL 입력과 같은 입구에서 처리 | 조건부 채택 | 3번 사용성을 별도 앱처럼 키우기보다 같은 입력 모델로 붙이는 방향이 맞다. |

## 조정해야 할 지점

| 항목 | Claude 제안 | 조정안 |
| --- | --- | --- |
| 로그인 시점 | 저장/export/fork에서 로그인 요구 | 검색/미리보기/export는 최대한 비로그인 허용. My Flow 저장, fork, 공유/public 전환에서 로그인 요구. |
| 사용 신호 | `N명이 사용`, 완주율, fork 수 노출 | 실제 이벤트 데이터 전까지 미노출. 대신 출처, 변환 시점, preview, 입력 조건, export 결과를 노출. |
| AI 생성 | MVP에 fallback 생성 포함 | 처음 PoC는 lookup-only + 수동/concierge 생성 큐도 허용. 자동 AI 생성은 비용 로그와 품질 gate가 붙을 때 켠다. |
| 원문 스냅샷 | snapshot + content hash 저장 | full snapshot은 보류. canonical URL, source metadata, extracted rows, hash 후보만 저장. |
| fork 편집 | Later로 분류 | 무거운 diff/fork 승격은 Later가 맞지만, 개인 사본의 제목/날짜/메모/Item 수정은 P1로 당겨야 한다. |

## 화면 상태 정리

| 상태 | 목적 | 첫 행동 | MVP 판단 |
| --- | --- | --- | --- |
| S1 URL 입력 전 | 입력창 하나로 시작한다. | URL 붙여넣기 또는 예시 선택 | P0 |
| S2 분석/검색 중 | AI가 아니라 기존 Flow를 먼저 찾는다는 점을 보여준다. | 대기 | P0 |
| S3 기존 Flow 발견 | AI 없이 바로 쓸 수 있음을 보여준다. | 이 Flow 쓰기 | P0 |
| S4 여러 후보 발견 | 같은 URL의 여러 파생 Flow 중 하나를 고르게 한다. | 추천 Flow 쓰기 | P2 |
| S5 새 Flow 생성 필요 | 기존 Flow가 없을 때만 생성 선택을 제시한다. | AI로 만들기 또는 생성 요청 | P1 |
| S6 생성 결과 확인 | 원문 근거와 단계 품질을 저장 전에 확인한다. | 저장 / 수정 | P1 |
| S7 옵션 변경 | 원본은 그대로 두고 내 실행 조건만 바꾼다. | 이대로 저장 | P0/P1 |
| S8 수정/fork | 내 사본으로 단계와 메모를 고친다. | 내 사본 만들기 | P1/P2 |
| S9 export/My Flow 저장 | 기존 도구 또는 FlowMe 실행 공간으로 보낸다. | 캘린더 파일 받기 / My Flow에 저장 | P0 |

## 다음 PoC 권장 순서

### P0 - lookup-only URL 진입

목표: AI를 쓰지 않고도 `URL 입력 -> 기존 Flow 발견 -> 옵션 변경 -> export/My Flow 저장`이 되는지 검증한다.

완료 조건:

- canonical URL 정규화 함수와 테스트가 있다.
- 3개 이상의 URL 변형이 같은 canonical key로 수렴한다.
- 몇 개의 seed URL이 기존 Flow/Flow Map과 매핑된다.
- 발견 경로에서는 AI 호출이 0회임을 로그로 확인한다.
- 저장 후 My Flow와 Calendar가 빈 상태가 아니라 첫 실행 항목을 보여준다.
- 캘린더 `.ics`와 Markdown export 중 최소 1개는 비로그인으로 받을 수 있다.

### P1 - 생성 요청과 얇은 편집

목표: 기존 Flow가 없는 URL을 처리하되, 자동 AI 대량 생성보다 비용과 품질 gate를 먼저 세운다.

완료 조건:

- 기존 Flow가 없으면 `새 Flow 생성 요청` 또는 `AI로 초안 만들기`가 명시적 선택으로 나온다.
- 생성 결과에는 원문 링크, 변환 시점, 근거 row가 붙는다.
- 사용자는 제목, 시작일, 날짜, 메모, 간단한 Item을 내 사본에서 수정할 수 있다.
- 수정은 원본 Flow를 바꾸지 않고 내 인스턴스에만 적용된다.

### P2 - fork, 후보 목록, 메모 입력

목표: 축적된 Flow가 여러 개일 때 추천/분기/개인화가 가능해진다.

완료 조건:

- 같은 canonical URL의 후보 목록을 보여준다.
- 좋은 fork 승격이나 추천 Flow 기준은 실제 데이터가 생긴 뒤 켠다.
- 메모 입력은 URL 입력과 같은 입구의 `직접 쓰기` 탭으로 붙인다.
- Obsidian/Markdown export는 문서형 결과를 우선 지원한다.

## 기존 백로그와의 매핑

| Claude 항목 | 기존 백로그 연결 | 판단 |
| --- | --- | --- |
| canonical 정규화 / 기존 Flow 조회 | FUB-03, FUB-06 | P0로 승격 |
| 기존 Flow 재사용 / 옵션 변경 | FUB-03, FUB-02 | P0/P1 |
| 저장 후 실행 연결 | FUB-08 | P0 유지 |
| source attribution / 원문 변경 | FUB-06, source-to-flow gate | P0 metadata, P2 자동 감지 |
| 수정/fork | FUB-11 | 얇은 개인 수정은 P1, fork graph는 P2 |
| 메모 직접 쓰기 | FUB-04 | P2 후보 |
| 작성자 adoption / 원문 댓글 공유 | FUB-01, FUB-09 | Later |

## 지금 만들지 않을 것

- fake 사용 수, fake 완주율, fake 리뷰
- 자동 AI 재생성
- creator adoption 자동화
- marketplace, 결제, 토큰
- Google Calendar/Todoist/Notion 직접 계정 연동
- full Obsidian 대체 workspace
- 무거운 diff editor

## 다음 결정 질문

1. 첫 PoC를 `lookup-only`로 자를지, `AI 초안 생성`까지 포함할지 결정해야 한다.
2. URL 입력 진입을 기존 `/flows` 안에 붙일지, 별도 `/flows/new` 또는 `/import`로 둘지 결정해야 한다.
3. 비로그인 export 허용 범위를 정해야 한다.
4. canonical URL 매핑을 기존 seed 데이터에 어떻게 붙일지 정해야 한다.
5. 원문 snapshot을 얼마나 저장할지 저작권/비용 기준을 정해야 한다.

## 추천 착수

가장 먼저 할 작업은 `P0 lookup-only URL 진입`이다. 이 작업은 AI 생성 없이도 제품 핵심 가설을 검증한다. 사용자가 URL을 붙였을 때 이미 만들어진 Flow를 찾고, 옵션만 바꿔 내 도구로 가져가거나 My Flow에 저장할 수 있으면, 이후 AI 생성과 fork는 비용과 품질 기준을 붙인 뒤 확장할 수 있다.
