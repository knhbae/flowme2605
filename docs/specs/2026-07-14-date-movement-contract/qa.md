# P24-00S1 QA

## 자동 검증

| 검증 | 기대값 |
| --- | --- |
| anchor 이동 | linked 재계산, fixed/unscheduled 유지 |
| 선택 목표 날짜 | 모든 선택 항목 fixed, unknown ID는 경고 |
| 선택 delta + 날짜 없음 | 부분 적용 없이 차단 |
| 날짜 제거 | Calendar/ICS 제외, 목록 export 포함 |
| DST 경계 이동 | time/duration/timezone 유지 |
| 이번 회차 이동 | occurrence/revision ID와 실행 상태 유지 |
| 미래 series 이동 | 새 revision, gap occurrence exclude |
| done 회차 cutover | 이력 손실 없이 차단 |
| 전체 series, 이력 없음 | series/revision identity 유지 |
| recurring direct move | 회차/series 범위 선택 전 차단 |
| stale apply | 차단 |
| mismatched undo | 차단 |

## UI 후속 검증

- 390x844와 1024x768에서 영향 수치를 적용 전 확인할 수 있어야 한다.
- linked/fixed/selected를 색만으로 구분하지 않는다.
- bulk 이동은 keyboard로 선택·확인·undo할 수 있어야 한다.
- drag-and-drop을 추가하려면 동일 기능의 keyboard/touch 대안과 undo가 먼저 있어야 한다.

## 실제 사용자 관찰 질문

1. `연동`과 `고정` 상태를 설명 없이 구분하는가?
2. 기준일을 바꾸기 전 영향 수치가 충분한가?
3. 날짜 없는 항목을 Calendar에서 찾는가?
4. 여러 항목 이동에서 같은 날짜 배치와 같은 일수 이동 중 무엇을 먼저 기대하는가?
5. 반복 일정에서 `이번만 / 이번부터 / 전체`를 구분하는가?
