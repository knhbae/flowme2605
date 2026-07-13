# P23-02B1 Plan

## Phase 1 - Inventory

- personal structural schedule의 기존 `time?: string` 경로를 확인한다.
- Calendar screen, 개인 항목 ICS, Flow 전체 ICS, list export를 별도 consumer로 기록한다.
- mutable date/time을 포함하는 기존 개인 항목 ICS UID 위험을 기록한다.

## Phase 2 - Contract

- unscheduled, all-day, timed 상태를 정의한다.
- duration 범위와 30분 기본값을 고정한다.
- IANA와 floating local timezone 정책을 고정한다.
- additive optional persistence field를 정의한다.

## Phase 3 - Pure Implementation

- schedule normalizer를 구현한다.
- schedule projection과 stable event identity seed를 구현한다.
- structural projection row에 derived schedule projection을 추가한다.
- Calendar destination의 pure 정렬 계약을 date, all-day, time, personal rank 순으로 고정한다.

## Phase 4 - Fixtures And Evidence

- 필수 schedule fixture와 migration/error fixture를 테스트한다.
- source mutation, Item loss, completion membership 변화를 0으로 고정한다.
- 실제 Calendar/ICS consumer와 앱 UI가 미연결임을 evidence에 명시한다.

## Phase 5 - Verification

- targeted schedule/storage 테스트
- 전체 unit test
- docs check
- production build
- 대표 route UI 무변경 sanity
- scoped diff와 commit/push
