# B3-B/C — 실제 편집·저장 결과 연결 메모

2026-09-06. root의 구현 전 구체화. [B3 설계](./k3b-plan-summary-receipt-design.md)를 대체하지 않는다. 이 문서는 제품 구현·새 시험 통과 증거가 아니다.

## 화면과 순서

기존 Plan 페이지와 Item 편집을 유지한다. Plan 목록 다음에 `반영 전 확인` 영역 하나를 둔다. Item은 child-open 시점 부모 staged draft에 자신의 입력 한 ref만 합쳐 비교하며 `계획에 반영할 내용`으로 표시한다. 부모의 다른 변경을 자식 변경 수에 다시 더하지 않는다. 일반 Quick·구 v1/v2 복구의 기존 저장 안내는 유지한다.

P의 frozen full summary는 정확한 전체 필드/직접 owner 수를 보존한다. UI만 `PLAN_CHANGE_PAGE_SIZE = 10`의 교체 가능한 로컬 표시 상수로 나누고 이전/다음으로 모두 확인할 수 있게 한다. 이를 Plan 편집 개수 제한이나 저장 schema로 사용하지 않는다. label/before/after는 P가 제한한 문자열을 escape하여 표시하고 내부 field/ref를 화면 제목으로 쓰지 않는다. 페이지 전환과 접기·펼치기·닫기는 0쓰기다. 입력 변경으로 목록이 줄면 유효 페이지로만 조정한다.

성공은 원래 복귀 화면의 Flow/Item 제목 근처 `개인 계획 변경 결과` 영역 하나에 대상, 필드별 전후, Flow/할 일 고유 수, `이 변경 되돌리기`와 `결과 닫기`를 표시한다. 기존 opener·scroll 복귀를 먼저 지키며 토스트로 초점을 강제 이동하지 않는다. 긴 내용은 문서 스크롤을 사용하고 새 고정 하단 바나 wizard를 추가하지 않는다.

## 같은 시도에 묶는 실제 값

app 전용 WeakMap은 genuine `prepared.attempt` 객체에 다음만 묶는다. 일반 UI 데이터나 summary 객체는 저장 권한이 아니다.

- frozen captured summary, root sessionId/revision/scopeId와 attemptId.
- 실제 attempt의 expectedRaw와 serialized candidateRaw. 별도 후보 생성/정규화/Undo snapshot은 만들지 않는다.
- 열 당시 source raw/관측 epoch, 기존 returnPoint.

root가 P summary를 만들 때 `planEditorPresentation.context`와 source context를 사용한다. E2 begin/retry의 실제 source/raw/epoch 및 C gate는 그대로 최종 권한이다. 서로 다른 관측이면 저장 전 차단하고 입력을 유지한다. 재시도는 같은 attempt의 frozen diff를 그대로 사용한다. 입력 변경으로 폐기한 attempt의 요약은 새 시도에 쓰지 않는다.

32ms 실제 callback의 active session/attempt/submission 확인과 genuine `finishSave` 결과 소비를 유지한다. `committed`는 durable 사실, cleanup·canResume·S ready·exact candidate adoption은 정상 종료 조건이다. 정상 종료 후만 활성 결과를 만든다. 실패·uncertain·confirmed 미정리 상태에는 적용 예정 요약과 기존 복구 안내만 유지한다. 같은 runtime의 명시 confirmed 정리 뒤에는 남아 있는 동일 attempt로 한 번만 결과를 만들고, reload 뒤에는 memory attempt가 없어 새 상세 성공을 제조하지 않는다.

## 결과 owner와 명시 Undo

일반 `undo()`는 같은 선택 Flow의 source Undo를 우선할 수 있으므로 결과의 Undo는 호출하지 않는다. 활성 결과의 id, 화면/대상, workspace lane, exact 성공 target raw, 현재 source raw/epoch, S authority, hasUndo, editor/recovery/pending 0을 다시 확인한 뒤 **C.undoCheckpoint → 기존 writeCandidate/S writer**로만 보낸다.

원래 C Undo가 가진 snapshot을 사용하며 결과 객체 안의 별도 before-state로 복원하지 않는다. 실패 후에는 실제 S 상태에 따라 기존 성공 정보·실패 안내 또는 recovery gate를 유지한다. 외부 변경·다른 lane·다른 화면·종료 뒤 과거 DOM 행동은 0쓰기다. Undo 성공은 해당 결과의 `undone`으로 표시하며, 다른 lane의 성공을 Undo한 것처럼 쓰지 않는다.

순위는 recovery → active editor → pending → Plan/authoring 결과 → K2-C 이동 결과다. `contextualFacts.receiptOwnerId`에 Plan 결과 owner를 반영한다. Plan 변경을 F의 move-order로 위장하지 않는다. 결과가 사라진 뒤 옛 contextual 결과를 부활시키지 않는다.

## 알림과 비정상 경로

편집 중에는 기존 `plan-item-save-feedback` 하나가 saving/invalid/failure/recovery 안내를 맡는다. 같은 메시지를 전역 saveStatus와 toast에서 다시 live로 읽지 않는다. 일반 초안 요약은 live 영역이 아니며 매 글자 입력을 읽지 않는다. 정상 Plan 결과는 짧은 atomic polite 안내 하나만 둔다. 다중 기능 오류·source dialog 등 우선순위가 높은 owner가 열리면 결과의 포커스 가능한 자식까지 제거/차단한다.

summary 오류는 원문·입력 초기화나 candidate 저장 실패를 숨기는 근거가 아니다. 정상 저장 뒤 결과 표시만 실패한 경우 저장 성공 사실을 실패로 되돌리지 않는다. no-op은 E2의 실제 판정이며 요약 수만으로 저널 생성이나 저장을 허용하지 않는다. 결과 없음을 저장 없음으로 추정하지 않는다.

## 연결 전후 확인

P 신규16과 React 신규8/추가 경계 검증을 먼저 root가 읽는다. 그다음 app 실제 함수의 독립 VM 검토와 bounded 브라우저 시나리오로 다음을 확인한다: 부모/자식 각각 정확 요약, owner/필드 수 구분, same-date pin·원문동값 no-op, 같은 길이 메모/동명 순서, 실패/같은 attempt retry, confirmed 정리와 reload 차이, source Undo가 있는 Flow에서 Plan 전용 Undo, stale/late callback, 100개 초과 전체 집계/페이지, 한 live owner, 다섯 화면의 첫/마지막 행동·키보드 초점·가로 넘침 0.

현재 React의 100-entry strict receipt cap과 source동값 기존 override 처리 차이는 독립 검증 결과를 따라 별도 기록한다. 근거 없이 validator를 약화하거나 양쪽 완전 동등성을 선언하지 않는다. 운영 데이터·기존 `/my`·전역 theme·새 공개/계정/동기화·배포는 범위 밖이다.
