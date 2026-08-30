# Text Authoring 속성 재진입·단순화 successor 계약

- 목표 ID: `TA-TEXT-AUTHORING-PROPERTY-REENTRY-SIMPLICITY-20260829-01`
- 기준 checkout: `D:\flowme2605\flow-text-authoring-flow-view-hybrid-ux-poc-20260828`
- 기준 branch/HEAD: `agent/text-authoring-flow-view-hybrid-ux-poc-20260828` / `849d4f6df9580b3b5230457387ec7569d177ef6c`
- immutable predecessor: `flowme-text-authoring-keyboard-property-tray-reliability-poc.html`
- predecessor SHA-256: `C0BC3D6ECE3DB98AB48E6FDC5C3A186A129BB44B4614CAA8B2547F6A41A992E7`
- publish boundary: `LOCAL_ONLY`
- external side effect / observed-user sessions: `0 / 0`

## 사용자 문제

신규 `장소` 속성을 고른 직후에는 caret이 `장소: ` 뒤에 놓인다. 그러나 다른 줄로 이동해 속성이 Flow 표현으로 바뀐 뒤 렌더링된 `장소`를 다시 탭하면 caret이 라벨 왼쪽으로 이동한다. 그 상태에서 `서울역`을 입력하면 원문이 `  - 서울역장소: `로 바뀌어 property 의미와 projection을 잃는다.

이 결함은 장소 하나가 아니라 같은 rendered property widget을 쓰는 날짜·시간·완료 기준·상대 날짜·소요 시간·반복·설명·실행 조건·자료·안내·주의·출처·시간대·반복 종료에 공통이다.

## current → target

| current | 사용자 영향 | target |
| --- | --- | --- |
| 신규 빈 property 직후만 valueStart가 맞음 | 재탭하면 문법 prefix를 직접 수정하게 됨 | 빈 property의 첫 탭부터 `라벨: ` 뒤 valueStart |
| 값이 있는 rendered property가 줄 시작으로 열림 | 값을 고치려다 `  - ` 또는 label 훼손 | label 탭은 실제 값만 선택, 값 탭은 가능한 경우 해당 값 위치 |
| 기존 값 메뉴에도 catalog 고정 예시 표시 | 실제 값과 다른 내용을 보고 선택 | 실제 원문 값 표시, 빈 값은 `입력 전`로 구분 |
| `9개 더`에 9종이 평면 나열 | 일정·실행·근거 정보 구분 비용 | 새 단계 없이 같은 tray에서 `일정 / 실행 내용 / 참고·출처` 구분 |
| `이미 있어요…`, scroll 설명 반복 | 작은 화면 정보 밀도 증가 | title·실제 값·상태로 충분한 반복 문장 제거 |

## 상호작용 계약

1. 사용자는 계속 하나의 Text editor에서 쓴다. 별도 modal이나 property form을 만들지 않는다.
2. property 행의 label·prefix 영역을 탭하면:
   - 빈 값: collapsed selection을 valueStart에 둔다.
   - 기존 값: raw source를 바꾸지 않고 값 범위만 선택한다.
3. 표시 값과 raw 값이 같은 일반 text property에서 값 영역을 탭하면 해당 raw 값 위치로 caret을 옮긴다.
4. Markdown link처럼 표시 값과 raw 값이 다른 property는 추정 offset을 만들지 않고 raw 값 전체를 선택한다.
5. 첫 탭만으로 `.cm-content` focus와 selection이 정해져야 한다. 두 번째 탭을 요구하지 않는다.
6. tap 자체의 source write는 `0`이다. 이어지는 입력만 기존 CodeMirror transaction과 undo stack을 사용한다.
7. unknown/custom property, protected block, stale editor, active composition에서는 successor가 임의 selection이나 source write를 만들지 않는다.
8. 기존 `+`, owner anchor, parser-busy gate, menu keyboard ownership, Escape/닫기 복원은 그대로 보존한다.

## 정보 tray 단순화 계약

- core 4개 `날짜 / 시간 / 장소 / 완료 기준`은 유지한다.
- `9개 더` label은 `다른 정보`로 바꾸되 새 submenu를 추가하지 않는다.
- more 9개는 한 scroll surface에서 다음 presentation heading만 갖는다.
  - 일정: 상대 날짜, 소요 시간, 반복
  - 실행 내용: 설명, 실행 조건
  - 참고·출처: 자료, 안내, 주의, 출처
- presentation heading은 keyboard command가 아니며 `role=presentation`이다.
- existing property는 실제 `label: value`를 보여 준다. 빈 existing slot은 `label: 입력 전`로 보여 준다.
- 실제 값은 DOM·accessible text에 보존하고 시각 overflow만 제한한다.
- `이미 있어요. 선택하면…`과 `스크롤해 9개…` 반복 문장은 제거한다.

## 불변식과 stop condition

- 순수 텍스트가 기본이고 오른쪽 결과 영역은 그대로다.
- source bytes, line ending, Item owner, parser/canonical/projection, one undo/redo를 보존한다.
- source에 없는 날짜·장소·링크·완료 기준을 생성하지 않는다.
- property prefix 손상 1건, wrong owner 1건, tap source write 1건, 보호 원문 손실 1건이면 즉시 중단한다.
- 320·360·390px keyboard-open 상태에서 caret 또는 tray가 보이는 영역 밖으로 가면 완료가 아니다.
- automated QA는 관찰 사용자 검증으로 표현하지 않는다.

## 제외 범위

- production route/store/schema와 P1/P2 기능
- 새 property type, AI 보정, URL fetch, publication, external provider
- 긴 문서 navigator와 표 결과 count 문제의 구현
- 실제 Android Gboard/Samsung Internet/TalkBack/VoiceOver 관찰
- commit, push, PR, merge, deploy
