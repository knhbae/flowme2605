# P1 요구와 합격 기준

| ID | 요구 | 합격 기준 | 상태 |
| --- | --- | --- | --- |
| P1-TRASH-01 | 휴지통 이동·복원 | Flow·QuickItem의 원래 위치와 기록을 복원한다. | 충족 |
| P1-TRASH-02 | 영구 삭제 경고 | 확인 전 mutation 0, 확인 뒤 PoC shadow만 변경한다. | 충족 |
| P1-RESULT-01 | 고정 네 결과 | TXT·할 일·캘린더·표 슬롯은 항상 같은 위치에 있고 지원 여부만 표시한다. | 충족 |
| P1-RESULT-02 | 동일 Item | 네 결과의 ref·날짜·완료·순서가 일치한다. | 충족 |
| P1-RESULT-03 | 복사용 TXT·읽기 전용 표 | WorkingSource와 분리된 복사용 TXT와 동일 Item 기반 표 projection을 제공한다. TXT download와 CSV export는 운영 export writer 경계 밖 후속으로 남긴다. | P1 충족 · download/export 후속 |
| P1-PROP-01 | 지원 catalog | 지원·차단 property와 입력 surface가 versioned 계약으로 고정된다. | P1 충족 · 9개 편집/7개 차단 |
| P1-PROP-02 | 정확한 재진입 | 해당 Item의 값 range만 선택하고 다른 값은 바꾸지 않는다. | 충족 |
| P1-RECOVERY-01 | near-miss 명시 복구 | 자동 수정 0, 명시 적용 1회, 취소·stale 0, Undo 가능이다. | 충족 |
| P1-PARITY-01 | React/HTML parity | 같은 fixture와 intent가 같은 next state·outcome status·저장 결과를 만든다. 표면별 보충 설명은 달라도 성공·no-op·취소·실패·Undo 가능 여부의 뜻은 같아야 한다. | 충족 |
| P1-SAFE-01 | 운영 데이터 불변 | prefix 밖 set/remove/clear 0, 운영 sentinel byte 차이 0이다. | 충족 |

## 판정 규칙

- 코드 존재만으로 충족 처리하지 않는다.
- 순수 모델 근거와 실제 브라우저 조작 근거가 모두 필요한 항목은 두 근거가 있어야 한다.
- 기능을 운영 정책 미승인 때문에 구현하지 않는 경우 `충족`으로 바꾸지 않고 `운영 보류`로 남긴다.
- 자동화와 화면 캡처를 실제 Android/iOS 또는 관찰 사용자 검증으로 기록하지 않는다.

## 최종 근거

- P1·교차 모델 및 React component: `299/299 PASS`
- 독립 HTML 모델: `48/48 PASS`
- React와 독립 HTML 통합 Chromium: `41/41 PASS`
- 지정 화면을 포함한 6개 viewport에서 가로 넘침·가려진 주 행동·console/page error `0건`
- prefix 밖 set/remove/clear `0건`, 비-PoC 운영 sentinel byte 변화 `0건`
- 전체 `npm test`: `1563/1564 PASS`. 유일한 실패는 기존 시간 의존 콘텐츠 검토일
  `dog-adoption-first-week:review_due:2026-06-04`이며, 중단된 뒤쪽 회귀 `220/220 PASS`를 별도로 확인했다.
