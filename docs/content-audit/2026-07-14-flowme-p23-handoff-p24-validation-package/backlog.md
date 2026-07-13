# FlowMe P24/P25 단계별 백로그

## 실행 원칙

- 기능을 더 붙이기 전에 P23의 실제 발견성·이해도·재방문 가치를 관찰한다.
- 자동 persona simulation과 실제 사용자 관찰을 구분한다.
- 한 단계의 증거와 정책이 닫히기 전 다음 UI slice를 크게 열지 않는다.
- source, personal overlay, execution run의 소유권을 계속 분리한다.

## 권장 순서

| 순서 | ID | 목표 | 선행 조건 | 완료 조건 |
| --- | --- | --- | --- | --- |
| 1 | P24-00A | 관찰 준비와 독립 QA | P23 closure | 5 persona × 3 session protocol, fixture, scorecard, Claude Code audit package |
| 2 | P24-00B | 실제 사용자 15 session | P24-00A | 5명 이상이 각 3회 사용, 녹화·메모·task success·depth 수집 |
| 3 | P24-00C | 관찰 결과와 P24 재정렬 | P24-00B | Blocking/High/Medium/Low, keep/change/defer 결정, 근거 연결 |
| 4 | P24-01A | source v2 merge contract | P24-00A 또는 00C | pure three-way resolver, orphan 정책, migration fixture, UI 무변경 |
| 5 | P24-01B | source update review UI | P24-01A | added/changed/removed preview, personal edit 보존, 명시적 적용·보류 |
| 6 | P24-02 | source-backed occurrence parity | 실제 수요 확인 | skip/hold/reopen 의미와 Calendar/export 정책이 관찰 결과로 정당화됨 |
| 7 | P24-03 | 발견성·밀도 UX 개선 | P24-00C | edit entry, Calendar, history의 관찰된 실패만 최소 수정 |
| 8 | P25-01 | account/DB/cross-device | release decision | localStorage migration, 계정 소유권, 백업·복원·충돌 정책 |
| 9 | P25-02 | controlled dependency upgrade | 별도 기술 window | Next/PostCSS advisory 해소, 전체 회귀, forced downgrade 없음 |
| 10 | P25-03 | real external import/sync | portability 사용 데이터 | ICS import matrix 우선, Calendar/Notion/Todo 직접 연동은 후속 검증 |

## P24-00A: 지금 할 일

### 목적

현재 기능이 존재하는지가 아니라 사용자가 설명 없이 발견하고 이해하며 다시 사용할 수 있는지를 확인한다.

### Persona

1. 이사처럼 기준일 역산이 필요한 사용자
2. 차량 점검처럼 날짜 없는 체크리스트를 쓰는 사용자
3. 운동·학습처럼 반복 회차를 관리하는 사용자
4. URL·메모로 자기 초안을 만들고 구조를 바꾸는 사용자
5. 공개 Flow를 저장하고 기록·export·재사용하는 사용자

### 세션

1. 첫 방문: 발견 → 저장 → 첫 실행
2. 수정·실행: 일정·구조 조정 → 완료·재개 → export
3. 재방문: persistence → 과거 run → 회고 → 다시 쓰기 → source update 기대

### 수집 항목

- task success와 실패 지점
- 행동별 click/tap depth
- 사용자가 예상한 상태와 실제 상태
- 완료·재개·삭제·제외·skip·hold 구분 여부
- My Flow/Calendar/export 일관성
- mobile/wide overflow와 focus/accessible name
- reload 후 persistence
- 실제 사용자 발화와 관찰자의 추정 분리

## P24-01A: 다음 데이터 계약

source v2의 added/changed/removed Item과 personal alias/date/memo/tombstone/order/user item을 병합하는 pure resolver를 먼저 만든다.

필수 정책:

- source 원본은 덮어쓰지 않는다.
- personal tombstone과 order를 stable ID 기준으로 보존한다.
- source에서 사라진 Item은 즉시 삭제하지 않고 orphan으로 분류한다.
- 충돌은 자동 덮어쓰기보다 reviewable state로 노출한다.
- execution history는 구조 merge와 분리한다.

## 지금 보류할 것

- UI 전면 개편
- Studio 5번째 탭 승격
- 실제 AI API 자동 생성
- 직접 Calendar/Notion/Todo OAuth
- source-backed 구조 편집 UI 선행 구현
- `npm audit fix --force`

## 운영 lane

현재 dirty worktree는 기능별로 별도 정리한다. 최소 분류는 `repo docs`, `skills`, `CI/tooling`, `package/runtime`, `content audit`, `Claude imports`, `temporary outputs`다. 각 범위가 완결되기 전 묶어서 stage하거나 merge하지 않는다.

분류가 끝나면 `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md`의 P23/P24 상태를 closure review 기준으로 동기화한다. 현재 `STATUS.md`의 P23-00 primary focus는 outdated지만 파일 자체가 이미 dirty이므로 이번 package commit에 섞지 않는다.
