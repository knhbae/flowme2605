# FlowMe P35-H1 Owner Review Gate

- 작성일: 2026-07-28
- 상태: `owner_decision_required`
- 추천안: `B - My Flow 안에 교차 Flow 할 일 보기 추가`
- observed-user count: `0`
- 앱 전역 IA 변경: 없음
- storage/schema migration: 없음
- commit/push/PR/merge/deploy: 하지 않음

## 이 패키지에서 결정할 것

P35-R8A~R12는 correctness와 화면 중복을 고쳤고, 전역 IA를 바꾸지 않는
`experiment=todo` 실험까지 검증했다. 이제 아래 세 결정만 사용자에게 받는다.

1. 전역 탭은 `My Flow`로 유지하고 내부에 `할 일` 실행 보기를 두는 B안을
   채택할지
2. 모바일 `전체 계획`을 기본 접힘으로 둘지, 범위 확인을 위해 기본 펼침으로 둘지
3. 추가 revision을 먼저 할지, 현재 결과로 P35-R13 final gate를 시작할지

## 결론 요약

| 영역 | R8 이전 문제 | 현재 결과 |
| --- | --- | --- |
| Routine | 첫 회차 뒤 실제 다음 회차가 있는데 종료로 표시 | 다음 open occurrence와 series count 분리 |
| Artifact 의미 | public Memo가 저장 후 Todo처럼 변함 | 해외여행 안전을 Checklist primary로 일관화 |
| 완료 | 같은 Item checkbox가 현재 묶음과 전체 계획에 중복 | visible completion owner 1곳 |
| Undo | 행이 보이는 경우에도 snackbar가 경쟁 | 완료 행이 실제로 사라질 때만 undo |
| 실행 행 | shape마다 제목, meta, 완료 위치가 다름 | 공통 row slot, preview와 saved 상태 분리 |
| Memo/Routine | 가짜 진행률과 `0/1` | 기록/series/occurrence 문법으로 분리 |
| Export | scope와 count가 반복 | visible summary owner 1곳 |
| Wide My Flow | 목록과 상세의 역할이 약함 | library / execution / inspector 분리 |
| 교차 Flow 실행 | Flow별 상세로 들어가야만 실행 가능 | opt-in Todo에서 날짜 상태별 실행 Item 확인 |

## A/B/C

- **A. 현재 My Flow 유지**
  - 가장 안전하다.
  - Flow 단위 구조와 source 맥락은 선명하다.
  - 여러 Flow의 오늘/날짜 없는 일을 한곳에서 실행하기는 어렵다.
- **B. My Flow 내부 Todo + Flow library 유지, 추천**
  - 전역 IA를 바꾸지 않는다.
  - Todo와 Calendar가 같은 stable Item을 읽는다.
  - Flow 전체 계획, Routine series, Sheet 순서, Memo 기록은 Flow detail에 남는다.
  - `experiment=todo`를 숨기면 데이터 변경 없이 rollback된다.
- **C. 전역 My Flow를 할 일로 변경**
  - 실행 진입은 가장 익숙하다.
  - Flow library 재배치와 전역 navigation 변경이 필요하다.
  - 현재는 정적 proposal만 있으며 앱에 구현하지 않았다.

## 읽기 순서

1. `review.html`
2. `decision-options-ko.md`
3. `audit.md`
4. `route-evidence.json`
5. `journey-scorecard.json`
6. `screenshot-manifest.json`

## 자동 검증과 사용자 검증

이 패키지는 current source, 명령 실행, Playwright, screenshot, heuristic
simulation을 사용했다. 실제 사용자 관찰은 수행하지 않았으며 자동화 결과를 사용자
검증으로 간주하지 않는다.

## 최종 자동 검증

- P35 targeted E2E: `76 / 76`
- 전체 unit: `692 / 692` (`pretest 98`, `test 594`)
- 전체 Playwright E2E: `402 / 402`, single worker
- docs check: 필수 문서 `14`, local link `3,457`
- production build: 통과
- 390 / 1024 / 1440 overflow, fixed overlap, console/page error: `0`
- `git diff --check`: 통과
- observed-user count: `0`
