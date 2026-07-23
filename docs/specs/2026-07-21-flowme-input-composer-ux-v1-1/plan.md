# Plan

## Goal

Input Composer Lab v1의 좋은 콘텐츠 결과와 3열 workbench를 유지하면서, 입력 감지부터 개인화, artifact 선택, export/My Flow handoff, 복구까지 판단 가능한 UX v1.1을 만든다.

## Phases

### 1. Baseline and evidence

- repo/harness 지침 확인
- v1 HTML을 1440x900, 390x844에서 직접 조작
- 8개 사례별 입력, 결과, 경계, localStorage, 키보드, overflow 기록
- source fixture와 quality/taxonomy rule 대조

### 2. Product decisions

- 네 경로 선선택과 통합 composer 비교
- creator/end-user journey 분리
- source/creator/user/run/export 저장 계층 고정
- artifact 추천 및 금지 정책 고정
- progressive disclosure와 recovery 규칙 고정

### 3. Contracts

- 18-state contract
- 8-case journey matrix
- input alternative comparison
- backend event/response handoff

### 4. Interactive prototype

- v1 visual language와 workbench 골격 재사용
- current/improved 비교
- 8개 사례 전환
- detecting, confirm, blocked, export, save, error 상태 조작
- source-specific 실제 Item과 projection 예시 사용

### 5. QA and iteration

- 1440x900 desktop
- 390x844 mobile
- 8-case transition smoke
- keyboard/focus/accessible name
- overflow/console error
- current 대비 측정값 확인
- 시각/상호작용 문제를 2~3회 반복 수정

### 6. Closeout

- docs check
- JSON contract consistency
- 작업 범위와 미구현 경계 기록
- backend 최소 slice 제안

## Sequencing

State/data 계약이 interaction보다 선행하고, interaction이 HTML 구현보다 선행한다. 브라우저 QA는 prototype 구현 뒤 반복한다. app runtime 구현은 이 계획에 포함하지 않는다.
