# P29-00 독립 검토 응답 형식

Claude Design과 Codex는 같은 제목과 순서로 답한다. 확인하지 못한 항목은 생략하지 말고 `inaccessible` 또는 `not_verified`로 표시한다.

## 1. 실행 정보

- reviewer 역할:
- 확인한 production URL:
- 확인한 GitHub SHA:
- 사용한 viewport:
- 직접 조작한 route:
- observed-user count: 0

## 2. 전체 판정

- 선택: `incremental_polish | coordinated_surface_reset | full_product_rewrite`
- 확신도: 1~5
- 한 문장 근거:
- P28에서 반드시 유지할 계약:

## 3. Findings

Severity 순서로 작성한다.

| Severity | Surface / route | 재현 단계 | 기대 | 실제 | 사용자 영향 | Evidence kind | 권장 조치 | Acceptance marker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 4. Persona journey 판정

| Persona | 발견 | 저장 전 확인 | 조정 | 저장 | 실행·완료 취소 | Calendar | 결과 가져가기 | 전체 판정 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

각 cell은 `clear | friction | blocked | not_tested` 중 하나로 표시한다.

## 5. Current vs proposed

다섯 surface마다 아래를 작성한다.

1. Save-before
2. Routine setup
3. My Flow
4. Calendar
5. Result choice and receipt

각 surface:

- current hierarchy
- 유지할 요소
- 제거하거나 낮출 요소
- proposed hierarchy
- 390px wireframe
- 1024/1440px wireframe
- keyboard/focus 변화
- CSS/token 변경만으로 가능한 부분
- component/state composition 변경이 필요한 부분

## 6. 대안 비교

| 대안 | 사용자 가치 | 시각적 체감 변화 | 구현 위험 | 계약 회귀 위험 | 모바일 적합성 | 권장 여부 |
| --- | --- | --- | --- | --- | --- | --- |
| A. Incremental polish | | | | | | |
| B. Coordinated surface reset | | | | | | |
| C. Full product rewrite | | | | | | |

## 7. P29 실행 제안

- P29-00에서 승인할 설계:
- 첫 vertical slice:
- 선행 dependency:
- 함께 하면 안 되는 범위:
- rollback 경계:
- acceptance screenshot:
- unit/E2E marker:

권장 backlog를 5~9개 slice로 나눈다. 각 slice에 목적, 범위, 비범위, 영향 surface, acceptance criteria, dependency를 포함한다.

## 8. Reviewer 역할별 추가 결과

### Claude Design

- 적용할 reference pattern과 가져오지 않을 부분
- shared visual grammar와 component anatomy
- current/proposed mobile and wide wireframe
- 긴 설명 없이 hierarchy로 해결하는 방식

### Codex

- 영향 component와 data consumer
- stable contract와 migration 영향
- CSS-only / composition / state-model 변경 분류
- 테스트·capture·배포 범위
- 구현 난이도와 blast radius

## 9. 사람에게 나중에 확인할 질문

실제 사용자 관찰은 이번 gate의 완료 조건이 아니다. 다만 설계 결정 후 사람에게 확인할 질문을 최대 7개로 제한해 작성한다.

## 10. 최종 요약

- keep:
- revise:
- redesign:
- defer:
- P29 첫 목표:
- 앱 코드 수정 여부: false
