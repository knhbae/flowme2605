# P35-R7 독립 검토 응답 템플릿

## 1. 검토 기준

- 검토 도구:
- 검토 일시:
- repo / branch / SHA:
- 직접 확인한 route:
- 사용한 evidenceKind:
- 접근하지 못한 자료:
- observed-user count:
- 앱 코드 변경 여부:

## 2. 전체 verdict

다음 중 하나를 선택한다.

- `retain`
- `bounded_revision`
- `structural_reopen`
- `block_publish`

한 문단 근거:

## 3. Findings

severity 순으로 작성한다.

### [Blocking|High|Medium|Low] 제목

- route:
- viewport:
- 재현 단계:
- 기대:
- 실제:
- 사용자 영향:
- evidenceKind:
- 제안:
- acceptance marker 또는 screenshot:

## 4. Owner 질문 판정

| ID | 질문 | 판정 | 근거 | 제안 |
| --- | --- | --- | --- | --- |
| F01 | public과 saved workspace 시각 문법 |  |  |  |
| F02 | 저장 직후 목적지 |  |  |  |
| F03 | 같은 날짜 묶음 |  |  |  |
| F04 | 저장 전 조정과 export |  |  |  |
| F05 | 완료 후 되돌리기 |  |  |  |
| F06 | shape-aware 실행 영역 |  |  |  |
| F07 | 기록 영역 |  |  |  |
| F08 | 60 Flow 규모 |  |  |  |

판정 값: `supported / partly_supported / rejected / needs_observation`

## 5. 다섯 형태 x 세션

| 형태 | public preview | export preflight | personal workspace | 가장 큰 문제 |
| --- | --- | --- | --- | --- |
| Calendar |  |  |  |  |
| Checklist |  |  |  |  |
| Routine |  |  |  |  |
| Sheet |  |  |  |  |
| Memo |  |  |  |  |

## 6. Current / proposed

### 390px

- 유지:
- 변경:
- 제거:
- wireframe 또는 anatomy:

### 1024px

- 유지:
- 변경:
- 제거:
- wireframe 또는 anatomy:

### 1440px / 60 Flow

- 유지:
- 변경:
- 제거:

## 7. 화면 소유권

| 행동 | 최종 owner | 중복 owner 제거 | 데이터 계약 영향 |
| --- | --- | --- | --- |
| 발견·원문 확인 |  |  |  |
| 저장 전 조정 |  |  |  |
| 저장 receipt |  |  |  |
| 완료·다시 열기 |  |  |  |
| 날짜 수정 |  |  |  |
| 구조 수정 |  |  |  |
| export |  |  |  |
| 기록·회고 |  |  |  |
| archive·restore·delete |  |  |  |

## 8. 구현 제안

### Keep

1.

### Change

1.

### Defer

1.

### 권장 실행 순서

1.

첫 bounded slice:

- 목표:
- 영향 파일:
- 비범위:
- rollback:
- unit/E2E/browser acceptance:

## 9. 실제 사용자에게만 확인할 질문

1.

## 10. 검증 및 publish 판단

- 현재 자동 검증을 신뢰할 수 있는 범위:
- 추가 자동 검증:
- 사용자 관찰 전 blocker:
- commit/push/PR/merge/deploy 권고:
