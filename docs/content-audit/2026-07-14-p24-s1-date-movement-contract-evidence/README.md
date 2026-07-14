# P24-00S1 Date Movement Contract Evidence

날짜 이동을 UI보다 먼저 pure contract로 고정한 증거다. Claude Design `(8)`의 `연동 일정 재계산 / 고정 일정 유지 / 적용 전 영향 예고`를 반영했다.

## 결론

- single, selected, anchor, occurrence, future series, whole series를 서로 다른 scope로 분리했다.
- 선택 이동은 원자적이며 부분 성공을 허용하지 않는다.
- 완료·완료 취소·건너뜀·보류 이력은 날짜 이동과 분리된다.
- 날짜 제거 후에도 My Flow/checklist/sheet/memo membership은 유지된다.
- Calendar/ICS는 날짜가 있을 때만 포함한다.
- plan 적용과 undo는 fingerprint로 stale state를 방어한다.
- 앱 UI는 변경하지 않았다.

## 검증 경계

이번 evidence는 pure contract와 fixture 기반 자동 검증이다. linked/fixed badge, 영향 preview, Calendar 날짜 없음 tray의 실제 사용성은 아직 실제 사용자 관찰 결과가 아니다.

## 파일

- [`audit.md`](./audit.md)
- [`movement-fixtures.json`](./movement-fixtures.json)
- [`spec.md`](../../specs/2026-07-14-date-movement-contract/spec.md)
