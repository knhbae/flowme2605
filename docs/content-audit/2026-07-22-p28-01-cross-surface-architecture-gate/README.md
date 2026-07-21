# P28-01 Cross-Surface Architecture Gate

상태: `selected_for_implementation`

기준 source: `origin/main` `46e567ec09c5eba37ac703529b3d3eccc75e0dde`

실제 관찰 사용자: `0`

## 판정

`Hybrid`를 P28 공통 화면 문법으로 선택한다.

```text
Flow header
-> compact whole outline
-> content-native actual-data preview
-> one contextual adjustment
-> one primary save/export action
```

`Outline-first`는 전체 내용 확인에는 강하지만 목적지 결과가 늦고, `Artifact-first`는 결과는 빠르지만 Flow 전체와 수정 범위를 잃는다. Hybrid만 저장 전, 반복 실행, My Flow, Calendar에서 같은 item/occurrence/resource 문법을 유지하면서 390px과 1024px의 밀도 제한을 충족했다.

## 구현 승인 조건

- 1024px에서는 주요 pane을 최대 2개만 둔다.
- 모바일은 `전체 내용 -> 결과 -> 조정 -> 행동` 순서의 단일 흐름을 사용한다.
- 홈트만의 완료 selector와 자료 card를 만들지 않는다.
- Calendar Flow가 많을 때 horizontal chip strip을 쓰지 않는다.
- 다섯 결과 형태는 같은 effective item으로 만든 actual-data projection이다.
- P27 source/personal/run/occurrence/export identity는 변경하지 않는다.

## 파일

- [상세 감사](./audit.md)
- [대안 점수](./decision-matrix.json)
- [fixture](./state-fixtures.json)
- [시뮬레이션 결과](./simulation-results.json)
- [비교 보드](./review.html)
- `screenshots/`: review board mobile/wide capture

## 다음 단계

P28-02에서 Hybrid가 소비할 공통 projection과 item role, destination 정책을 구현한다. P28-03 이후 화면은 이 계약 없이 slug별 UI를 추가할 수 없다.
