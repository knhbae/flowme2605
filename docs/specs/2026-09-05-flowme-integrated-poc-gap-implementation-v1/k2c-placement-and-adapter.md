# K2-C — 결과 위치와 기존 저장 경로 연결

2026-09-05. [K2-C 설계](./k2c-design.md)를 구현하기 위한 세부 배치다. K2-B의 날짜·저장 모델은 검증한 상태로 두고, 브라우저 14개 중 남은 B09 알림 가림을 이 단계에서 수정한다. K2-B 화면 전체를 먼저 PASS 처리하지 않는다.

## 결과가 나타날 위치

390×844와 844×390 모두 본문 흐름에 결과를 넣는다. 새로운 하단 고정 알림이나 임시 여백으로 가림을 숨기지 않는다.

```text
날짜 또는 폴더 heading
변경 시작 위치 앞의 기존 행
[항목 · 확정된 변경 결과 / 되돌리기 / 닫기]  ← 본문 공간 사용
변경 시작 위치 뒤의 기존 행
```

변경을 시작할 때 현재 화면, 목록·날짜 context, 대상 ref, 인접 행, 원래 스크롤·키보드 초점을 메모리에 담는다. 성공 후 현재 DOM의 같은 목록에 결과를 놓는다. 대상이 다른 날짜·폴더로 이동해 사라지면 인접 행 위치를 쓰고, 마지막 날짜 그룹이 사라졌으면 **결과만 표시하는 UI placeholder**를 원래 목록 자리에 둔다. placeholder를 task나 저장 데이터로 만들지 않는다.

결과가 viewport 밖이면 그 결과가 보일 만큼만 기존 본문 스크롤을 조정한다. pointer 성공에서 Undo 버튼으로 초점을 강제 이동하지 않는다. 원래 키보드 행이 사라졌다면 결과의 안정적인 anchor로 복귀하여 다음 Tab에서 Undo에 접근한다. Undo 후에는 원래 ref가 다시 존재할 때만 그 행과 원래 스크롤을 복원한다. 다른 화면으로 이동하면 결과를 가져가지 않는다.

React는 렌더링 목록 안의 slot을 사용한다. standalone은 결과 영역을 새 DOM에 넣되 원래 인접 행·context를 찾아 위치를 복원한다. 두 runtime이 같은 DOM 엔진을 사용할 필요는 없지만 결과·owner·Undo 계약은 같은 순수 모델을 사용한다.

## 저장과의 연결

순수 `personal-workspace-poc-contextual-result.ts`는 storage·DOM·clock을 읽지 않는다. 기존 writer가 검증한 exact target raw와 현재 lane·pending·편집·복구·전용 receipt 상태를 받아 UI 연결만 판정한다. raw는 화면이나 일반 JSON 로그에 노출하지 않는다. 새로운 Undo snapshot·저장 key·schema·TTL은 추가하지 않는다.

명시 workspace 시도 시작 → 기존 transition → 기존 writer·readback·cleanup → 같은 시도의 결과 발행 순서를 유지한다. no-op·취소·실패는 새 성공을 만들지 않는다. 늦은 callback, 외부 raw 변화 관측, editor/recovery/source/creator owner 전환은 이전 결과 ticket을 무효화한다. raw가 원래 값으로 돌아오더라도 이전 ticket을 다시 사용하지 않는다.

standalone contextual Undo는 기존 다중 lane `undo()`의 선택 분기를 거치지 않는다. 표시한 workspace owner를 확인한 뒤 `C.undoCheckpoint`와 `writeCandidate(..., 'undo')`로만 연결한다. 선택 Flow에 source Undo가 있다는 이유로 다른 변경을 되돌리는 것을 막는다. header의 기존 대체 Undo 진입점은 보존한다.

실제 날짜 이동·폴더 경로·순서·완료 결과는 확정 후보에서 읽는다. 같은 제목의 다른 사본을 제목으로 찾지 않는다. 시간순 복귀는 순서 변경 결과로 표시하며, 회차 날짜 이동·완료도 기존 occurrence identity를 유지한다. K2-B에서 제외한 회차별 수동 정렬 정책은 추가하지 않는다.

## 안내와 검증

일반 workspace 성공은 본문 결과 한 곳에서만 발표한다. 전용 receipt, 편집 실패, 복구 잠금이 우선할 때 이전 성공을 숨긴다. 결과 닫기는 쓰기 0이고 기존 저장 Undo를 지우지 않는다. reload는 기존 snapshot만 복원하며 방금 변경했다는 알림을 새로 만들지 않는다.

### 구현 중 확인한 입력 경계

standalone의 첫 연속 입력 검사에서 `Undo 결과 표시 → native drag 시작` 시 기존 결과 DOM 제거로 문서 높이가 줄고, `scrollY 223 → 133`으로 보정되면서 `dragstart → dragend`가 즉시 발생했다. 쓰기·dragover·drop은 없었다. 단순 테스트 지연으로 처리하지 않고 실제 배치 변경 결함으로 분리했다.

이동 gesture가 이미 시작된 경우에는 이전 결과의 권한·announcement·tab 진입을 즉시 끄되, 해당 DOM이 차지하던 정확한 공간만 gesture 종료까지 유지한다. `inert`, `aria-hidden`, `visibility:hidden`인 UI 자리이며 새 결과·저장 항목·상시 padding이 아니다. drop·cancel·패널 닫기 뒤 정리하고, 새 성공은 기존 확정 경로에서만 표시한다. 관련 검사에서는 결과를 미리 닫아 문제를 우회하지 않고 연속 입력과 잔여 자리 0을 확인한다.

React의 긴 목록 직접 완료에서는 새 결과 버튼이 기존 모바일 하단 메뉴에 가려지는 실제 실패를 확인했다. 기존 모바일 메뉴의 clearance 값을 result의 scroll margin에 사용하고 성공한 결과가 보이도록 본문을 스크롤한다. pointer 초점은 완료 버튼에 남긴다. 키보드 결과 닫기는 정확한 원래 항목 또는 현재 화면 heading으로 복귀한다. 이 배치 수정은 전역 navigation·token을 변경하지 않는다.

K2-B B09의 다섯 화면·7개 겹침 기록을 수정 전 증거로 보존한다. 수정 후에는 알림을 닫거나 기다려서 통과시키지 않고, 결과가 나타난 동안 버튼 전체 노출·중심과 내측 모서리 hit-test·전체 화면 캡처를 검사한다. C01–C13, 기존 K1-A/B·K2-A/B 회귀, npm test, production build, 생성 HTML 일치를 실제 실행 후 별도 기록한다. 실제 Android/iOS·보조기술·관찰 사용자 증거를 대신하지 않는다.
