# FlowMe 통합 PoC 제품형 UX 패스 v1 Plan

- 현재 상태: `P0_AUTOMATED_VALIDATION_COMPLETE_EXTERNAL_EVIDENCE_UNRUN`
- 이전 자동 기준선: 제품 브라우저 `37/37`, model/component `256/256`,
  standalone node `39/39`, build 통과
- 이번 목표 fresh 자동 검증: model/React `269/269`, standalone node `43/43`, browser `59/59`
- 실제 기기·관찰 사용자·게시: `미실행 / 0명 / 미진행`

## 단계 0 — 기준선·소유권 정합화

- 최신 main, 격리 worktree, 미소유 변경을 확인한다.
- 이전 parity의 구현 결과와 stale `pending`을 분리한다.
- 48개 gap을 현재 UX, 회귀, 실제 기기, 운영 결정, 후속 기능으로 재분류한다.
- 전체 npm의 기존 dog fixture 실패를 제품형 UX 결함과 분리한다.

Exit: 이전 결과를 과장하지 않고 이번 변경이 시작할 위치가 하나로 정리된다.

현재 상태: 완료.

## 단계 1 — 화면·상태 설계

- 세 결과물의 화면과 기능 연결을 한 trace 표로 고정한다.
- 모바일·desktop shell, Plan→Item 필드 순서, primary action, 상태 문구를 고정한다.
- source/personal/execution owner와 계획 날짜/실행 날짜 표현을 정한다.
- 삭제할 설명·배지·카드·내부 용어 목록을 명시한다.

Exit: 코드 변경 전에 각 화면의 남길 것, 옮길 것, 지울 것이 검증 가능한 문장으로 정해진다.

현재 상태: 완료.

## 단계 2 — 실패 테스트와 공통 모델 연결

- 다섯 origin과 `authoring-handoff`가 같은 editor schema를 쓰는 테스트를 먼저 둔다.
- opener별 동일 edit intent, staged draft, single commit, no-op을 검증한다.
- source read-only와 개인 overlay, 계획·실행 날짜 invariant를 고정한다.
- 내부 용어와 복수 primary가 다시 나타나면 실패하는 구조 검사를 추가한다.

Exit: 공통 surface가 없는 현재 상태가 실패하고 목표 계약이 수치로 표현된다.

현재 상태: 완료.

## 단계 3 — React 제품형 UX 구현

- authoring, 영수증, 개인공간 목록, Flow·Item 상세와 편집을 같은 shell로 맞춘다.
- 네 origin과 새 작성 Flow의 opener를 공통 Plan→Item editor에 연결한다.
- staged 변경 요약, 저장·취소·실패·retry·Undo·reload를 연결한다.
- 계획 날짜와 실행 날짜의 문구·조작·기간 projection을 분리한다.
- 기본 화면의 기술 문구와 경쟁 행동을 감산한다.

Exit: React exact-query PoC에서 핵심 여정을 제품 문장으로 끝까지 조작할 수 있다.

현재 상태: 완료.

## 단계 4 — 단일 HTML 일치

- React와 같은 헤더, primary action, 상태 문구, Plan→Item 필드 순서를 적용한다.
- fixture-only 경계를 유지하고 실제 origin을 읽었다고 표현하지 않는다.
- 기존 single-file 생성 절차로 일반·Android 파일을 다시 만든다.

Exit: 두 파일의 embedded asset이 같고 React와 허용된 차이만 남는다.

현재 상태: 완료.

## 단계 5 — 기능·브라우저 검증

- 모델·component·standalone node·React/standalone 브라우저 suite를 fresh 실행한다.
- 작성 Flow와 네 origin을 각각 열고 편집·저장·실행·Undo·reload를 확인한다.
- 여섯 viewport의 overflow, header, editor, 첫 Item, primary action geometry를 검사한다.
- keyboard, Escape, focus return, 비드래그 이동, 저장 오류와 retry를 확인한다.
- storage prefix와 운영 sentinel byte invariant를 재검증한다.

Exit: 이번 목표의 실제 실행 수와 실패가 이전 단계 수치와 분리돼 기록된다.

현재 상태: 완료.

## 단계 6 — 화면 평가·보고

- 전후 캡처를 v4.1, 개발 1, 개발 2 결정과 다시 대조한다.
- 요구→구현→테스트→화면 evidence chain을 갱신한다.
- 조작형 HTML 사용 안내와 통합 검증 보고서를 제품형 문장으로 갱신한다.
- 실제 기기·관찰 사용자·게시 상태와 기존 security/freshness 이슈를 분리한다.

Exit: 보고서만 읽어도 구현 완료, 미실행, 정책 결정, 후속 기능을 구분할 수 있다.

현재 상태: 완료.

## 단계 7 — closeout

- 관련 테스트, 전체 `npm test`, production build, docs check, diff check를 실행한다.
- 기존 실패는 owner와 범위를 기록하고 근거 없이 수정하지 않는다.
- commit·push·PR·Preview·Production은 사용자 요청 없이는 진행하지 않는다.

Exit: 이번 목표의 최종 상태와 남은 owner action이 명확하다.

현재 상태: 완료. 전체 `npm test`의 기존 freshness 1건 실패는 별도 기록했다.
