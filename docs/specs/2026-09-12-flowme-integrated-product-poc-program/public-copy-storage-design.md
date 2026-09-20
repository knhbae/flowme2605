# 반복 공개 사본의 저장·시작일·문서 참조 연결

2026-09-14 · C3 구현 중. 전체 목표와 A~E 종료 조건은 유지한다.

## 구현 순서 조정

저장 payload의 구조 검증과 사용자에게 반복 공개를 허용하는 조건을 분리한다. `validateProgramSchedule`은 엄격한 versioned 반복 계약을 읽고, `canPublishProgramSchedule`은 교체 가능한 `PROGRAM_PUBLIC_RECURRENCE_RELEASE_V1.enabled:false`를 함께 검사한다. 작성 화면과 공개 writer 모두 이 공개 제한을 사용한다. 모든 consumer를 연결·검증하기 전까지 실제 반복 공개는 열지 않는다.

이 분리는 유효한 공개 판본 test fixture에서 실제 private import·controller·store·Undo/reload를 검증하기 위한 개발 순서 변경이다. fixture 생성은 실제 사용자의 공개 성공이나 브라우저 왕복 증거가 아니다. 이전 원장의 ‘저장 검증도 닫힘’은 당시 상태이며 공개 제한 해제로 읽지 않는다. 운영 route/key/schema/writer와 다른 worktree는 변경하지 않는다.

## 개인 소유와 표시

- `ProgramCopy.recurrence.version:1`의 `itemIds`는 실제 수용한 반복 Item만 가리킨다. 반복 규칙을 개인 사본에 다시 복제하지 않는다.
- 선택 필드 `starts[itemId]`는 공개 원본의 시작이 미정인 항목에만 개인 시작일 또는 명시 null을 기록한다. 원문 날짜와 완료 이력은 바꾸지 않는다. 상대 시작은 사본 기준일 계약을 사용한다.
- 시작 미정은 손상이 아니다. 해당 정의만 `pendingStarts`로 안내하고 다른 항목의 회차 읽기를 막지 않는다. 오늘을 자동 시작일로 사용하거나 정의 자체를 날짜 미정 실행 항목으로 만들지 않는다.
- 반복 header·원문 속성·하위 확인·참조는 일반 체크박스와 별개다. 하위 확인을 별도 실행 owner로 만들지 않는다.
- `references[{itemId,documentId,lineId}]`는 같은 사본 Item의 문서 참조다. 여러 문서에서 같은 회차/상태를 보되 기간에는 중복 생성하지 않는다. 참조 해제는 그 참조 행만 제거한다.
- metadata의 일반 텍스트 편집/체크/진행 등록을 거절한다. 자유 메모와 일반 Item은 계속 편집한다. 저장된 참조의 누락·중복·다른 문서/사본 소유는 fail-closed한다.
- 모든 변경은 기존 Program transaction·expectedSpace/CAS·readback·Undo를 사용한다. 같은 값·취소·실패는 성공 변경0이다. 개인 시작 변경 후 이전 회차 기록은 보존하고 새 회차 완료로 복제하지 않는다.

## 완료에 필요한 검증

혼합 원본 import → 미정 안내/명시 시작 → 두 문서 참조 → 같은 회차 완료/날짜 변경/다시 열기 → 선택 출력/정확 복귀 → Undo/reload를 확인한다. 원본·다른 actor·운영 키는 바뀌지 않아야 한다. index/참조 손상, archived target, stale/중복 요청, quota/readback·다른 탭 충돌을 검사한다.

기준일/원본 비교·변경 수용·제안과 모든 출력 consumer, 실제 공개부터 시작하는 연속 브라우저 시나리오는 여전히 C/D/E 종료 조건이다. 해당 모델이나 기존 초안 브라우저 검사만으로 전체 반복 경로를 충족 처리하지 않는다.
