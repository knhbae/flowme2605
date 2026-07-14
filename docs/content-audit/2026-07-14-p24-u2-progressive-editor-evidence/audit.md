# P24-U2 Progressive Editor Audit

## Problem

항목 수정 화면은 콘텐츠 성격과 무관하게 날짜, 시간, 장소, 반복, 결정 상태, 기록 입력을 한 번에 보여줄 수 있었다. 특히 이사 방식 결정처럼 구매 의도가 아닌 항목도 Flow 전체 문맥의 `결정`, `메모` 단어 때문에 별도 결정 또는 기록 필드를 받을 위험이 있었다. 사용자는 실제로 자주 바꾸는 제목, 날짜, 시간, 메모보다 범용 설정을 먼저 해석해야 했다.

## Implemented Hierarchy

### Default

- 제목
- 날짜
- 시간
- 메모
- 고급 기능이 있을 때 한 개의 `세부 설정` disclosure

### Advanced

- 장소
- 반복
- 개인 draft timed 항목의 예상 소요시간
- 콘텐츠 의도가 일치할 때만 결정 또는 기록
- 기존 routine 반복 범위 설정

개인 draft의 날짜 없음/종일/시간 지정은 일정의 핵심 상태이므로 기본 영역에 유지하고, 소요시간과 반복만 고급 영역으로 낮췄다.

## Intent Classification

- Flow 제목, 카테고리, primary destination은 항목 의도 판별 입력에서 제외했다.
- `선택`, `비교`, `결정` 같은 일반 단어만으로 구매 결정을 만들지 않는다.
- `메모`라는 단어만으로 별도 기록 입력을 만들지 않는다.
- 구매/보류/거절, 계약 진행/중단, 서명, 명시적 `hold_eligible`만 결정 신호로 사용한다.
- 기록표, 일지, 관찰 기록, 점수, 컨디션 기록처럼 기록 자체가 행동인 경우만 기록 신호로 사용한다.

## Persistence

고급 disclosure의 열림 자체는 화면 UI state다. 다만 장소, 반복, 사용자 지정 소요시간, 결정, 기록 값이 저장돼 있으면 다음 방문에서 자동으로 펼친다. 데이터 schema, source item, personal overlay, execution state 소유권은 변경하지 않았다.

## Recurrence Export Regression Found

타깃 E2E에서 source-backed 항목에 새 반복을 설정한 뒤 Calendar occurrence를 열면 원래 행에 저장한 장소가 ICS에서 빠지는 회귀가 발견됐다. 반복 occurrence가 원래 source 행의 item draft를 상속한 뒤 회차별 draft로 덮어쓰도록 수정했다. 날짜, 시간, 반복, 장소, 메모가 동일한 effective item 기준으로 ICS에 남는 것을 기존 E2E assertion으로 확인했다.

## Visual Review

### Mobile 390px

- 기본 화면은 날짜와 시간 뒤에 disclosure 하나, 메모 하나로 읽힌다.
- 고급 화면은 장소와 반복이 세로로 쌓이며 horizontal overflow가 없다.
- 결정 항목은 고급 영역에서만 결정 상태와 다음 확인일을 보여준다.

### Wide 1024px

- 기존 My Flow two-column 여백과 card 폭은 유지했다.
- 저장된 장소와 반복이 있는 항목은 재방문 시 열린 상태로 보인다.
- 새 page 또는 설명 card를 추가하지 않았다.

## Regression Boundary

- title/date/memo personal overlay 유지
- 개인 draft 시간, 소요시간, 반복 persistence 유지
- Calendar와 ICS projection 유지
- source-backed/public Flow 저장 및 export 유지
- 완료/완료 취소와 구조 변경 state 유지
- 4탭 IA 유지

## Residual Risks

1. 모바일의 실제 구매 판단 항목은 고급 영역을 열면 여전히 길다. 필드를 삭제하기보다 관찰에서 필요한 조합을 확인해야 한다.
2. wide My Flow 편집 card는 기존 폭을 유지해 오른쪽 여백이 크다. 이는 U2 범위 밖이며 전체 My Flow layout 재설계 때 다룬다.
3. 자동화는 필드 발견성과 persistence를 증명하지만, 사용자가 disclosure label을 자연스럽게 이해하는지는 실제 관찰이 필요하다.
