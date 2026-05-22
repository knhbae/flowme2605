# Artifact Workbench v1 Design

> 작성일: 2026-05-22  
> 상태: Implementation-ready design  
> 기준 문서: `docs/superpowers/specs/2026-05-22-artifact-first-flow-ux-design.md`

## Goal

Flow 상세 첫 화면에서 사용자가 "이 콘텐츠가 내 체크리스트, 달력, 기록표, 비교표가 됐다"는 것을 조작 가능한 실행판으로 확인하게 한다.

## Problem

현재 Flow 상세에는 artifact promise, top preview, 실제 리스트/달력, export가 분리되어 있다. 사용자는 제목과 날짜 입력 뒤에도 아래로 스크롤해야 전체 리스트나 달력의 실체를 본다. 특히 체크리스트는 한눈에 쭉 보이는 실행 목록이 약하고, 루틴/기록형은 반복 주기나 기록표가 첫 화면에서 충분히 강하지 않다.

## Scope

이번 v1은 새 플랫폼 기능이 아니라 첫 화면 재구성이다.

- 새 컴포넌트: `ArtifactWorkbench`
- 대상: public Flow detail page
- 저장 방식: 기존 localStorage 상태 유지
- 입력 방식: 기존 anchor/date, weekdays, comparison state 재사용
- 출력 방식: 기존 text/xlsx/ics export 유지

## Information Architecture

Flow 상세 페이지의 첫 핵심 순서는 다음으로 바꾼다.

1. 제목, 설명, 핵심 메타
2. 날짜/반복/진행/내보내기 설정 블록
3. `내 실행판` Workbench
4. 전체 실행 목록과 세부 뷰
5. 제작자, 출처, 주의 정보

`내 실행판`은 사용자가 원래 콘텐츠를 보고 직접 만들 법한 산출물을 먼저 보여준다. 설명 카드가 아니라 실제 행, 날짜, 열, 후보 칸을 보여준다.

## Workbench Surfaces

### Timeline Calendar

예: `moving-d30-basic`, `wedding-d180-basic`

- 왼쪽: 전체 할 일 리스트 8개까지 표시
- 오른쪽: 월간 캘린더 미리보기
- 날짜가 없으면 예시 anchor 기준으로 날짜를 계산한다.
- 각 행은 D-day label, 실제 날짜, 제목을 보여준다.

### Decision Table

예: `used-car-buying-check`

- 후보 비교표를 primary surface로 보여준다.
- 후보명 입력과 항목별 메모 입력은 기존 comparison state에 저장한다.
- 아래에는 현장 체크리스트 첫 5개를 이어서 보여준다.

### Routine Calendar

예: `home-workout-20min`, `english-study-30day-routine`, exact workout video flows

- 시작일과 선택 요일을 기준으로 4주 occurrence를 만든다.
- 월간 캘린더에 `n회차`를 표시한다.
- 옆에는 다음 회차 카드와 실행 항목 요약을 보여준다.

### Spreadsheet Log

예: `real-fitvely-video-body-fat-6kg-method`

- 체크리스트 대신 기록표를 primary surface로 보여준다.
- 열은 `날짜`, `식단`, `운동`, `측정`, `컨디션`, `리뷰`로 고정한다.
- 7일치 예시 행과 주간 리뷰 메모를 보여준다.
- outcome promise 없이 기록과 조정 중심 copy만 사용한다.

### Checklist

예: no-anchor checklist

- 첫 화면에 전체 할 일 rows를 바로 보여준다.
- 스킵/메모/완료는 기존 item card에서 계속 처리한다.

## Component Contract

`ArtifactWorkbench` props:

- `bundle`
- `anchor`
- `weekdays`
- `checks`
- `itemStates`
- `comparisonState`
- `onComparisonChange`

v1에서는 Workbench 자체가 item completion을 토글하지 않는다. 완료 체크, 메모, 스킵은 기존 full item list에서 유지한다. 단, decision table의 후보명/메모는 Workbench에서 편집 가능해야 한다.

## UX Rules

- Section label: `내 실행판`
- Subtitle: artifact-specific Korean copy
- `aria-label="Flow artifact workbench"`를 제공한다.
- 모바일에서는 단일 column, desktop에서는 2-column layout을 사용한다.
- 표/달력은 작은 화면에서 가로 스크롤을 허용한다.
- Workbench와 기존 full list가 같은 정보를 중복하더라도 역할을 분리한다.
  - Workbench: 첫 화면 산출물 proof
  - Full list: 실제 완료/메모/스킵 작업

## Non-Goals

- 새 DB 저장소 추가 없음
- occurrence 단위 완료 상태 저장 없음
- 외부 Calendar/Sheets API 연동 없음
- 전체 500+ catalog migration 없음
- source replacement 없음

## Acceptance Criteria

- `used-car-buying-check` 첫 화면에 `내 실행판`, `후보 비교표`, 후보 입력이 보인다.
- `moving-d30-basic` 첫 화면에 `내 실행판`, `전체 할 일`, `월간 캘린더`가 보인다.
- `home-workout-20min` 또는 exact workout Flow 첫 화면에 `반복 캘린더`와 회차가 보인다.
- `real-fitvely-video-body-fat-6kg-method` 첫 화면에 `기록표`, `식단`, `운동`, `측정`, `컨디션` 열이 보인다.
- 기존 export, localStorage, full E2E가 깨지지 않는다.

