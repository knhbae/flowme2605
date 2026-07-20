# P26-08 My Flow local IA evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준 커밋: `1d4a362`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`

My Flow의 페이지 역할과 내부 보기를 분리했다. 4탭 전역 탐색의 `내 Flow`는 그대로 유지하고, 페이지 안에서는 `지금 / Flow 목록 / 완료` 세 보기만 사용한다.

- `지금`: 저장한 여러 Flow를 가로지르는 현재 실행 큐
- `Flow 목록`: 저장한 계획을 찾고 전체 작업공간을 여는 인벤토리
- `완료`: 완료한 일을 확인하고 같은 항목을 다시 미완료로 돌리는 기록

탭 상태는 `/my?view=now|flows|completed`로 표현한다. 클릭, 키보드 방향키, 뒤로가기, 새로고침에서 같은 상태를 유지한다.

## 화면 결과

### 모바일 390px

- 빈 상태에서도 세 로컬 탭과 각 보기의 역할 문장이 먼저 보인다.
- Flow 한 개 상태에서 `지금`은 실행 항목, `Flow 목록`은 저장한 전체 Flow, `완료`는 되돌릴 수 있는 기록만 보여준다.
- Flow 목록은 별도 bottom sheet를 한 번 더 열지 않고 바로 탐색할 수 있다.
- 20개 이상일 때 처음 8개를 보여주고 같은 목록 안에서 더 펼친다.

### 와이드 1024px

- Flow 2~19개는 `모든 Flow`가 명시적으로 선택된 rail과 선택 Flow workspace를 함께 보여준다.
- 20개 이상은 빽빽한 rail을 제거하고 그룹형 인벤토리를 사용한다.
- Flow 목록에서는 실행 상태 보드와 우선순위 카드가 반복되지 않는다.

## 접근성

- 로컬 보기는 `tablist / tab / tabpanel` semantics를 사용한다.
- `ArrowLeft`, `ArrowRight`, `Home`, `End`로 탭을 이동하고 자동 활성화한다.
- `열기`로 연 상세를 닫으면 원래 `열기` 버튼으로 focus가 돌아간다.
- 전역 `내 Flow` 링크와 로컬 `Flow 목록` 탭의 accessible role이 다르다.

## 현재 검증

- local IA unit: `3 / 3` pass
- 기존 unit: `549 / 549` pass
- P26-08 Playwright: `4 / 4` pass
- 영향받은 기존 My Flow 시나리오: `16 / 16` pass
- production build: pass, 18 routes
- mobile/wide horizontal overflow: `0`
- console/page errors: `0`

전체 `flow-mvp.spec.ts` 단일 실행은 명령 제한 10분에 도달해 최종 합계를 얻지 못했다. assertion 실패가 확인된 것이 아니라 실행 완료 증거가 없는 상태이며, 이번 변경의 직접 영향 시나리오는 별도로 모두 통과했다.

## 화면

- [빈 상태와 로컬 탭 390px](./screenshots/01-mobile-empty-local-tabs.png)
- [Flow 한 개 역할 분리 390px](./screenshots/02-mobile-one-flow-roles.png)
- [Flow 세 개 rail 1024px](./screenshots/03-wide-three-flow-rail.png)
- [Flow 20개 이상 그룹 목록 1024px](./screenshots/04-wide-twenty-plus-grouped.png)

## 다음 범위

P26-09에서는 Flow 목록의 역할을 유지한 채, 선택한 Flow 전체를 콘텐츠 형태에 맞는 timeline/checklist/routine/project/record 구조로 읽게 한다. 현재 한 개 Flow의 긴 전체 목록은 역할은 명확하지만 disclosure와 묶음이 더 필요하다.

