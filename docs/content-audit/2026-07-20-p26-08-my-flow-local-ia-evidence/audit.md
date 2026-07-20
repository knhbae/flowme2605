# P26-08 audit

## 원인

기존 My Flow 내부 탭은 `오늘 / 내 Flow / 완료`였다. 전역 탭 `내 Flow`와 로컬 보기 `내 Flow`가 같은 이름을 사용했고, 저장한 Flow 목록 안에 실행 상태 보드·우선순위·전체 항목이 동시에 나타났다. 모바일에서는 Flow 카드 네 개 뒤에 다시 목록 sheet를 열어야 해서 저장 인벤토리의 역할도 약했다.

## 구현

### 로컬 상태 계약

`my-flow-local-ia.ts`가 query와 내부 상태의 변환, 저장 Flow 수 요약, held Flow 제외를 pure function으로 고정한다. 기존 내부 상태 값은 보존하되 URL은 사용자 역할에 맞춰 `now / flows / completed`를 사용한다.

### 정보 구조

| 보기 | 첫 제목 | 1차 내용 | 제외한 내용 |
| --- | --- | --- | --- |
| 지금 | 지금 이어갈 할 일 | 여러 Flow의 현재 실행 항목 | 저장 인벤토리와 완료 기록 |
| Flow 목록 | 저장한 Flow | 저장한 계획과 선택 Flow 전체 | 상태 보드·우선순위 카드 반복 |
| 완료 | 완료한 일 | 완료 취소 가능한 실행 기록 | 미완료 실행 큐 |

held Flow는 평상시 실행 큐와 인벤토리 수에서 제외하는 기존 정책을 유지한다.

### 상태 규모

- `0`: 탭별 빈 상태가 역할을 직접 설명한다.
- `1`: 저장 Flow 한 개와 그 전체 workspace를 바로 보여준다.
- `3`: 와이드 rail에 `모든 Flow`와 세 Flow를 보여주고 선택을 명시한다.
- `20+`: 와이드 rail을 없애고 그룹형 목록, 모바일은 8개 이후 inline 확장을 사용한다.

### navigation과 focus

탭 선택은 history에 남으며 back/reload가 같은 보기를 복원한다. query가 명시된 demo route를 초기화 로직이 `지금`으로 덮던 race도 함께 제거했다. inline detail은 닫힐 때 trigger focus를 복원한다.

## 시나리오

| 시나리오 | route | viewport | 결과 | evidenceKind |
| --- | --- | ---: | --- | --- |
| 빈 상태 | `/my` | 390x844 | 전역 탐색과 로컬 탭 분리, URL/back/reload 유지 | current_browser |
| Flow 1개 | `/my?view=now` | 390x844 | 실행/인벤토리/완료 역할과 reopen 분리 | current_browser |
| Flow 3개 | `/my?view=flows` | 1024x768 | `모든 Flow` 선택 rail과 focused workspace | current_browser |
| Flow 20개 이상 | `/my?demo=ux20&view=flows` | 1024x768 | dense rail 0, grouped inventory | current_browser |

## 회귀

- 완료는 기존 execution state를 사용하며 structural membership을 변경하지 않는다.
- `열기`와 완료 checkbox의 역할을 유지한다.
- source/personal overlay/run/occurrence/export schema를 변경하지 않았다.
- Calendar, public `/f`, save-before, post-save receipt를 변경하지 않았다.
- 4탭 IA는 유지했다.

## 검증 경계

브라우저 자동화와 heuristic inspection으로 구조·상태·focus·overflow를 확인했다. 실제 사용자가 `지금 / Flow 목록 / 완료`를 설명 없이 구분하는지는 관찰하지 않았으며 사용자 검증 수는 `0`이다.

## 잔여 위험

1. Flow 한 개를 연 모바일 전체 workspace는 긴 콘텐츠에서 여전히 길다. P26-09 adaptive grouping이 필요하다.
2. 숨겨진 이전 inventory sheet 코드가 남아 있지만 새 IA에서는 도달하지 않는다. P26-09 workspace 정리 때 제거 여부를 판단한다.
3. 대형 `flow-mvp.spec.ts` 전체 단일 실행은 10분 제한으로 완료 증거가 없다. 직접 영향 범위는 전용·targeted 테스트로 닫았다.

