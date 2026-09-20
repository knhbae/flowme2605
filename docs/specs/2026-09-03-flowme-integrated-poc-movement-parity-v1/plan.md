# FlowMe 통합 PoC 이동 방식 일치 v1 Plan

## 현재 실행 상태 — 2026-09-03

- [x] 단계 0 기준선과 재판정 범위를 확정했다.
- [x] 단계 1 Flow/Task 이동·무저장·focus·live owner 계약을 확정했다.
- [x] 단계 2 React 구현을 완료했다. 공용 손잡이 lifecycle, Flow 폴더 전용 이동,
  invalid/cancel 무저장, Undo와 focus fallback이 현재 코드에 있다.
- [x] 단계 3 독립 HTML 구현과 두 단일 파일 재생성을 완료했다. 이동 상태의 live
  owner는 전역 `save-status` 한 곳이며 패널과 toast는 시각 사본이다.
- [ ] 단계 4의 movement 범위 검증은 완료했고 전체 회귀 green만 남겼다. final PoC
  model/component 255/255, standalone node 34/34, React Stage 4 5/5, core React
  browser 16/16, standalone browser 16/16, production build 18/18, docs 16/4,588,
  diff check가 통과했다. 전체 `npm.cmd test`는 1,519/1,520 뒤 시간 의존
  `seed-flows` freshness 1건 실패로 중단됐고 뒤쪽 220/220은 별도 통과했다.
- [x] 단계 5 최신 React·standalone 화면의 320×700과 필수 5개 viewport 비교,
  캡처, 추적표, 보고서 정합성 확인을 완료했다.

실제 Android Chrome, iOS Safari, screen reader, 관찰 사용자 검증과 commit, push,
PR, Preview, Production은 이 계획의 구현 완료 조건이 아니다. 모두 미실행 또는 범위
밖 증거로 분리한다.

## 단계 0 — 기준선과 판정표 정합성

- 세 원천 요구를 기능·화면·전이·상태·반응형·접근성·증거 단위로 다시 대조한다.
- 오래된 추적표 문구와 현재 구현이 모순되는 항목은 새 구현 후보에서 제외한다.
- 제품 정책 없이 닫을 수 있는 P0를 이동 방식 일치로 확정한다.

Exit: 범위와 제외 범위가 requirement ID 및 현재 코드 증거와 연결된다.

## 단계 1 — UX·개발 계약

- Flow/Task별 허용 목적지와 공통 입력 방식을 표로 고정한다.
- 왼쪽 패널, 오른쪽 corridor, 48px 손잡이, focus와 live status를 고정한다.
- 기존 `move-folder`, `move-date`, `reorder` 외 새 전이를 만들지 않는다.

Exit: 같은 intent가 하나의 transition으로 수렴하고 cancel/no-op은 write 0이다.

## 단계 2 — React 구현

- Task 손잡이 lifecycle을 Flow가 재사용할 수 있게 공용화한다.
- Flow active move session과 folder drop만 연결한다.
- component/model 회귀 테스트를 추가한다.

Exit: 기존 Task 동작을 깨지 않고 Flow의 모든 지원 입력이 같은 결과를 만든다.

## 단계 3 — 독립 HTML 구현

- shell에 비모달 이동 패널을 추가하고 이동 메뉴만 이 표면으로 옮긴다.
- Flow 행 손잡이와 Task/Flow 공통 opener를 연결한다.
- 단일 HTML 생성물을 다시 만들고 source/embedded bytes 정합성을 검사한다.

Exit: 내려받아 여는 HTML에서 중앙 modal 없이 목적지 이동과 오른쪽 순서 이동이 된다.

## 단계 4 — 자동 검증

- 순수 모델·component·standalone node 테스트를 실행한다.
- React/standalone 브라우저 시나리오에서 입력 방식 동등성, no-op, cancel, 실패,
  Undo, reload를 검증한다.
- 관련 회귀, 전체 `npm test`, production build, docs check를 실행한다.

Exit: 실제 실행 수와 실패·재시도 이력을 숨기지 않고 모두 기록한다.

현재 Exit 판정: movement 전용 검증은 충족했다. 전체 회귀는 1건 실패와 중단 사실을
포함해 기록했으므로 실행 기록 조건은 충족하지만 green 조건은 미충족이다.

## 단계 5 — 화면 비교와 보고서

- v4.1 기준 캡처와 최신 React/standalone 화면을 필수 viewport별로 비교한다.
- overflow, console error, page error, covered action을 수치로 기록한다.
- 추적 JSON, 조작 가능한 통합 HTML, 검증 보고서와 QA를 갱신한다.

Exit: 요구→구현→테스트→화면 증거가 한 링크 체인으로 연결되고 남은 gap이 분리된다.
