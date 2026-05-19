# Data Architecture Reference

## 현재 권장 기준

최신 `claude_ver/03_DB_스키마.md`는 Supabase PostgreSQL 기반의 단순한 MVP 스키마를 제안한다. 이 문서를 기본값으로 삼는다.

핵심 정책은 Immutable Versioning Pattern이다. 제작자가 항목을 수정하거나 삭제해도 기존 사용자의 체크 데이터가 깨지지 않도록 `items`를 UPDATE/DELETE하지 않고 새 버전 row를 INSERT한다.

## 최신 MVP 테이블

### `users`

사용자와 제작자를 통합한다.

- `id`
- `email`
- `name`
- `role`: `creator | user`
- `avatar_url`
- `creator_tier`: `none | verified | partner`
- `created_at`

### `plans`

플랜 메타 데이터다.

- `creator_id`
- `title`
- `description`
- `category`
- `structure_type`: `timeline | phase | routine | checklist`
- `anchor_type`: `start_date | end_date | baby_age_month | none`
- `version`
- `is_public`
- `parent_plan_id`
- timestamps

### `phases`

이유식/수면교육처럼 단계가 있는 플랜에 쓴다.

- `plan_id`
- `label`
- `order`
- `description`

### `items`

가장 중요한 테이블이다.

- `plan_id`
- `plan_version`
- `phase_id`
- `type`: `calendar | todo`
- `title`
- `description`
- `day_offset`
- `order`
- `repeat_type`
- `is_active`

Immutable 정책:

- 제작자 수정 시 기존 row의 `is_active=false`.
- 새 row를 `plan_version + 1`로 INSERT.
- 기존 사용자는 이전 `item_id`를 계속 참조한다.

### `user_plans`

사용자가 복사한 플랜 인스턴스다.

- `user_id`
- `plan_id`
- `source_plan_version`
- `anchor_date`
- `privacy_level`: `private | stats_only | public`
- `user_overrides`
- `dismissed_updates`
- `completed_at`

### `user_item_checks`

사용자별 체크 상태다.

- `user_plan_id`
- `item_id`
- `is_checked`
- `checked_at`
- `memo`
- `memo_visibility`: `private | public`

### `plan_connections`

플랜 간 추천 연결이다. MVP에서는 쓰지 않아도 테이블 개념만 보존한다.

## 카테고리별 구조 타입

- `timeline`: 결혼, 이사, 여행. D-Day 또는 시작일 기준 `day_offset`.
- `phase`: 이유식, 수면교육. 아기 생일/월령 기준 phase.
- `routine`: 운동, 어학. 반복과 빈도가 핵심.
- `checklist`: 이직, 행정, 구매. 시간보다 순서가 핵심.

MVP 첫 카테고리인 육아는 `phase + baby_age_month`에 가깝다. 단, 복잡도를 줄이려면 백신 체크리스트나 이유식 4개월차 하나만 먼저 만들어 사실상 mini timeline처럼 검증한다.

## 보존할 레거시 설계

`old/FlowMe260316/data_architecture/flowme-data-architecture.md`는 최신 v3보다 더 실행 관리 앱에 가까운 구조다. 지금 바로 전부 구현하지는 않되, 아래는 잃지 말아야 한다.

### `flow_item_dependencies`

FlowItem 간 의존 관계를 jsonb 배열이 아니라 별도 테이블로 둔다. 이유는 선행 조건 확인, 연쇄 일정 조정, 순환 감지를 위해 관계형 쿼리가 필요하기 때문이다.

보존할 필드:

- `item_id`
- `depends_on_id`
- `dep_type`: `finish_to_start | soft`
- `UNIQUE(item_id, depends_on_id)`
- `CHECK(item_id != depends_on_id)`

### `event_logs`

Phase 1부터 기록하고 분석은 나중에 한다.

초기 이벤트 후보:

- `flow.created`
- `flow.dday_set`
- `flow.completed`
- `item.completed`
- `item.skipped`
- `item.postponed`
- `item.added`
- `item.deleted`
- `sync.connected`
- `sync.executed`

### `content_snapshots`

AI로 URL을 구조화할 때 원본 본문/자막과 AI 분석 결과를 저장한다. 동일 URL 재요청과 원본 추적에 필요하다.

### `source_url` 인덱스

나중에 "이 URL로 만든 기존 플랜" 검색과 플랜 네트워크를 만들려면 `source_url` 기반 인덱스를 초기에 고려한다.

## 연쇄 일정 조정 알고리즘

레거시 FlowMe의 핵심 차별점이다. 지금 MVP가 단순 복붙이면 후순위로 미루되, 실행 관리 기능을 만들 때는 이 로직을 테스트 우선으로 구현한다.

```text
shift_item(item_id, day_delta)
1. 대상 item의 relative_day를 조정한다.
2. 후속 의존 항목을 재귀 탐색한다.
3. 각 후속 항목은 모든 선행 항목 중 가장 늦은 날짜 + 1 이상이어야 한다.
4. 조정된 항목 목록과 변경 내역을 반환한다.
5. 외부 캘린더 연동이 있다면 변경 사항을 일괄 반영한다.
```

## 충돌 지점

최신 `claude_ver`는 빠른 검증을 위해 단순 스키마를 권장한다. `old/FlowMe260316`은 의존성/DAG/EventLog/Integration을 Phase 1부터 넣으라고 한다.

권장 판단:

- Concierge MVP와 첫 Web MVP는 `claude_ver`의 단순 스키마를 따른다.
- "미루면 뒤가 자동 조정되는 실행 앱"을 핵심 차별점으로 삼는 순간 `flow_item_dependencies`와 `event_logs`를 도입한다.
