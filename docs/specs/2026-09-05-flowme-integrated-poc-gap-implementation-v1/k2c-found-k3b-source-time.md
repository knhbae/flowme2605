# K2-C 검사에서 발견한 원문 시간 투영 차이

2026-09-05. 상태: **확인한 기존 미충족 / K3-B 설계·구현에 연결**. K2-C 결과 표시 변경으로 새로 제거된 값은 아니다.

React 신규 브라우저 C12/C13의 원문은 `시간: 09:30`이 있는 handoff다. 같은 날짜의 기간 행에서 `09:30`을 기대했지만 표시되지 않아 실패했다. 실패 원본은 초기 17개 실행 JSON (로컬 전용 근거: `../../../output/playwright/k2c-react-contextual-initial-20260905-01.json`)에 보존했다.

현재 `buildPersonalWorkspacePocTasks`는 Flow Item의 `sourceTimingLabel`을 보존하지만, 정렬·행 표시용 `time`에는 개인 `placement.time`만 넣는다. 결과 projection은 검증된 authoring source attributes의 time도 읽으므로 기간 목록과 개인 결과 사이에 차이가 있다. sourceTimingLabel은 D-offset 등도 포함하므로 문자열을 임의로 잘라 시간으로 간주하지 않는다.

| 요구 | 현재 판정 | 다음 작업 |
|---|---|---|
| 원문 시간과 개인 시간의 소유를 구분하고 실제 기간 목록에도 반영 | 원문 시간이 있으나 개인 배치 시간이 없는 handoff 경로 미충족 | K3-B 필드 동등성 설계에서 기존 검증된 source attributes·개인 override·명시 미정의 우선순위를 조사하고 두 runtime 비교 |
| K2-C에서 이미 보이던 시간·Flow/폴더 경로를 유지 | 별도 검증 가능 | 명시 개인 placement.time fixture로 변경 전후 표시·저장값 보존과 5개 화면 geometry를 검사 |
| 전체 C13 원본 정보 보존 | 부분 | geometry 통과를 원문 시간의 전수 충족으로 확대하지 않음 |

검증 fixture의 개인 시간 추가는 기존 source-time 실패를 없애는 수정이 아니다. 원래 실패를 별도 진단으로 남기고, 개인 시간 보존과 원문 시간 투영을 분리한다. 이 문서에서 모델·저장 schema·원문·운영 값을 바꾸지 않았다. K3-B의 기존 날짜 mode/Plan 필드 동등성 요구와 함께 처리하며, 새 영구 시간 정책을 확정하지 않는다.
