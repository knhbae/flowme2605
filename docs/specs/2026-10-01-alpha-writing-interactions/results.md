# 요구별 결과와 후속

이번 묶음은 [승인 범위](spec.md)의 격리 구현 후보다. 최종 QA 집계는 [검증 원장](qa.md)에 기록한다. 실기기·사용자 관찰·개발계 반영이나 전체 제품의 충족 판정으로 확대하지 않는다.

상태: 이번 입력 묶음의 구현·내부 검증 완료, 개발계 미반영. 최종 표적118/118·전체 통합2,735/2,735·npm2,258/2,258·production build/범위 타입 오류0, 앱75/75·HTML40/40·기존 회귀25/25를 확인했다. 이 검사들은 겹치는 범위가 있어 고유 커버리지 비율로 합산하지 않는다. 테스트 경로 누락과 작은 검사 heap 실패는 수정된 검증 환경의 최종 실행과 나눠 보존했다.

## 요구 연결

| 요구 / 기존 근거 | 이번 코드의 적용 | 제한 / 후속 |
| --- | --- | --- |
| 개발2 native 자유 작성 / 피드백6·15 | 전체·폴더 영역에 같은 textarea+mirror, 표시 모드·입력 Undo·키 엔진 연결 | 부분 구조·날짜·소속 변경은 거절; 조작 권한까지 같다는 뜻은 아님 |
| 개발2 Item 메모 / 피드백15·16 | 메모 속성 끝 Enter/ShiftEnter는 기존 속성을 반복해 같은 Item.note에 줄바꿈 결합 | 일반 원문 ShiftEnter는 literal. 새 메모 귀속 문법·Todo 자동 승격 없음 |
| 개발2 Item/Step / v4.1 같은 항목 | 할 일 제목 끝 Enter는 기존 메모·시간·하위 Item 뒤에 형제 scaffold 삽입 | 중간 커서·선택·ShiftEnter 기존 동작 유지, 부분은 사전 보호 판정 |
| 피드백6 들여쓰기 복귀 | 즉시 반대 Tab/ShiftTab은 최초 묶음을 사용하고 입력/선택/판본 변경 때 임시 lease 폐기 | 부분의 기존 구조 변경은 여전히 전체 보기에서 편집 |
| v4.1 읽기·쓰기 경계 / 개발1 identity·Undo | 전체 재구성 검증 후 기존 whole draft→expectedWorkspace writer 사용 | 조각 자체의 서버 payload·새 schema·운영 저장 변경 없음 |
| UX1 거절 후 직접 수정 / UX2 실패 입력·IME 보호 | 부분 거절 입력과 선택을 local 전체 작성으로 옮김. 다른 pending/IME/stale/잠금/목적지 거절은 입력 유지 | 두 textarea의 native Undo stack 합치지 않음. 저장 Undo와 입력 Undo는 별도 |
| 같은 원문·lineId·숨은 문맥 | 현재 full preview의 ID 보고, 모호한 신규 ID는 null. 기존 줄/숨은 bytes·Item·완료·날짜·소속 보호. 저장된 무소유 blank→ordinary note의 단일 변경은 기존 ID 유지 | 일반 메모→task·여러 줄 재해석·blank의 기존 기록/소속은 예외 대상 아님 |
| 개발1 복구 / UX1·2 외부 변경 보호 | 인증 host의 live external/pending/busy/conflict를 local 인계에도 검사 | old 자식 workspace 동등성만으로 새 서버 판본의 권한을 추정하지 않음 |
| v4.1 기간→같은 Item의 원문 | 명시적 인계에만 부분 caret 복원 lease. 일반 기간 원문 복귀의 정확한 Item focus 예약 보존 | 폴더 필터 해제 시 이전 메모 위치로 덮어쓰던 경쟁을 회귀로 고정 |
| 작은 화면·마지막 입력 위치 | native End 후 마지막 44px 행이 일부 보일 때만 부족한 높이를 보정 | 수동 스크롤·wrapped row·IME·fold·선택/판본/viewport 변경에는 보정하지 않음 |

부분 작성과 전체 작성의 입력 엔진은 같지만 편집 권한은 다르다. 부분에서 보호된 구조 키를 막는 것은 미구현을 숨기기 위한 동작이 아니라 숨은 원문·기존 Item을 보존하는 지원 경계다. 전체 인계도 서버 저장 성공을 뜻하지 않는다.

## 변경한 파일

아래는 이번 입력 묶음의 소유 범위다. 같은 파일에 앞선 현재 채팅의 폴더/여정 개선이 섞여 있으므로 파일 전체 diff를 이번 새 변경으로 계산하거나 그대로 게시하지 않는다.

| 범위 | 파일 / 실제 변화 |
| --- | --- |
| 입력 엔진 | `lib/flow/integrated-poc/vendor/text-editor.cjs`, `.d.cts` — 입력 gate, 부분 controls 제거, 같은 memo/Enter/indent plan, End 마지막 행 보정 |
| 순수 입력 계약 | `lib/flow/integrated-poc/text-input-plan.cjs`, `.d.cts`, `.test.ts`; `text-input-engine.test.ts` — ephemeral inverse lease와 실제 native key handler 회귀 |
| 부분 surface·권한 | `ProgramFolderRegionEditor.tsx`, `.module.css`, `.test.tsx`; `folder-document-regions.ts`, `.test.ts` — 같은 native surface, 재구성 검증과 blank identity의 좁은 증명 |
| 전체·host 연결 | `ProgramTextEditor.tsx`, `.test.tsx`; `ProgramSpace.tsx`, `.context.test.tsx`; `AlphaWorkspace.tsx` — exact destination 확인, 명시적 caret lease, live held authority |
| 합성 브라우저 | `tests/e2e/writing-interactions.browser.ts`, `.config.ts`; `writing-interactions-lab.browser.ts`, `.config.ts` — 앱15·HTML8 시나리오×5크기, 요청·저장·원문 보호 |
| HTML 도구/산출물 | `scripts/content-audit/build-writing-interactions-lab.mjs`, `writing-interactions-lab.template.html`, `serve-writing-interactions.mjs`, `verify-writing-interactions-artifacts.mjs`; 조작·검토 HTML2개 |
| 정본 기록 | 이 spec/plan/tasks/qa/ownership/results, `STATUS.md`, `SERVICE_STRUCTURE.md`, `PROJECT_CONTROL.md`, `docs/specs/README.md` |

`Program*.tsx`는 `components/flow/integrated-poc/`, `folder-document-regions.*`는 `lib/flow/integrated-poc/` 기준이다. 원래 `/my` entry·AppClient·운영 storage/schema·API/Auth/DB·migration·hosting 설정은 이번에 수정하지 않았다.

## UX 감산 검토

Findings: 입력 방식 차이, 메모의 Item.note 누락, 제목 Enter의 자식 재귀속, 저장을 강제하는 전체 전환, 마지막 행 잘림을 이번 표적 문제로 다뤘다. 전체 편집 집중 모드·공개/제작 화면 전면 재설계는 구현하지 않는다.

| 검토 | 판단 / 근거 |
| --- | --- |
| User Need Fit | 같은 개인 원문을 범위만 바꿔 계속 작성하는 좁은 요구에 맞춤 |
| Execution Clarity | 전체 인계는 저장 버튼이 아님. 자동 조작 거절 뒤 필요한 경우에만 이어쓰기 안내 |
| Content Fidelity | 원문·기존 Item·메모·시간·하위 항목·숨은 내용 그대로 보존하는 검사 유지 |
| Portability | 기존 원문/Item 투영과 저장 경로 유지. 별도 export 개선은 이번 판정 제외 |
| Cognitive Load | 새 상시 카드/튜토리얼 없음. 부분 native의 행별 추가·체크·메뉴·접기 writer 컨트롤 제거 |
| Copy Specificity | 실패 시 입력이 남았다는 상태와 전체 수정/재저장/취소 행동만 노출 |
| Source/Safety | 합성 원문과 실제 데이터 구분, 동일 writer/권한 보호 유지 |
| Accessibility/Operability | 실제 키·Escape 초점 탈출·본문/마지막 행·48px 기본 도구를 브라우저에서 평가. OS IME/AT 미판정 |

Subtraction: native 엔진을 재사용하되 부분 범위에는 일반 native의 행별 writer controls를 표시하지 않았다. 도구 복제·별도 작업 모드·설명 카드는 추가하지 않았다. 문서/원문 표시, 입력 Undo, 저장 상태, 필요한 오류/복구 동선은 다음 행동이나 안전 상태를 위해 유지했다. 기능 QA를 UX 점수나 사용자 사용성 입증으로 치환하지 않는다.

화면 관찰의 제한: 폴더 선택을 위해 문서·폴더 목록을 연 상태의 모바일 첫 화면은 목록이 차지하고 부분 작성 본문은 스크롤 아래에 있다. 전용 키/전환은 스크롤 후 접근할 수 있어도 ‘모든 상태에서 첫 화면에 작성 본문이 보인다’고 판정하지 않는다. 폴더 선택 후 목록 자동 닫기·다음 선택 유지와 큰 집중 모드는 별도 UX 계약이 필요한 후속이다.

## 스킬·도구가 바꾼 것

- `flow-session-start`로 이번 변경과 앞선 후보/미소유 worktree를 나눴고, 과거 폴더 통과를 새 입력 구현의 검증으로 재사용하지 않았다.
- `flow-ux-review`의 감산 검토로 부분 native의 writer 컨트롤을 중복 노출하지 않았다. 전체·부분의 권한은 같다고 꾸미지 않고 필요한 거절/복구만 남겼다.
- `frontend-app-builder`는 기존 코드·토큰 재사용 범위에 적용했다. 새 시각 컨셉·ImageGen·Figma는 이번 문제에 필요하지 않았다.
- 브라우저 도구로 실제 Enter/ShiftEnter/Tab/Undo와 다섯 화면을 검사하면서 단위 테스트만으로 놓친 원문 focus 경쟁·held external 인계·End13px 잘림을 발견했다. IAB의 DOM 조회 한계는 실제 Chrome 자동화로 보완했으며 실기기/OS IME 검증으로 표현하지 않는다.
- `flow-report-artifact`로 직접 파일 조작·보고서 링크·화면 크기를 별도로 검사한다. `flow-work-closeout`와 `flow-direction-capture`는 실패 이력·현재 상태·후속을 각각 정본에 연결한다. 새 영구 제품 정책이나 전역 memory는 추가하지 않았다.

## 반영과 다음 순서

1. 이 후보와 직전 폴더 후보를 직접 조작하고 지원 제한을 비교한다.
2. 후보 채택 시 정확한 소유 변경을 분리해 게시·CI·선별 개발계 반영을 별도 목표로 잡는다. 현재 주소를 자동 교체하지 않는다.
3. Creator 입력 계약·큰 집중 모드·반복/상대 날짜·Flow/Map·공개/기여와 F5~F10·운영 후속은 [기존 다음 원장](../2026-10-01-direction-and-next-goal/spec.md)에 유지한다.

## 게시·관찰 경계

commit0 / push0 / PR0 / merge0 / Preview0 / Production0 / 개발계 교체0. 실제 Android Chrome·iOS Safari·OS IME·AT 미실행. 이번 관찰 사용자0, 기존 프로젝트의 제한 기기 시험 이력은 지우지 않는다.
