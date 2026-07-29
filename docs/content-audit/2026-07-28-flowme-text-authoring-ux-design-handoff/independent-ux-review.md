# Independent UX Review

- 검토일: 2026-07-28
- 판정: `adopt_hybrid_text_preview`
- 관찰 사용자 수: 0
- 검토 성격: 독립 agent heuristic review와 Codex browser automation
- 앱 코드 변경: 없음

## 판정

기본 입력은 `C. text composer + structured preview`로 결정한다. 사용자는 일반 메모,
Markdown, 표, URL을 한 입력면에 넣고, FlowMe가 감지한 구조와 실제 결과를 순서대로
확인한다.

- A. Markdown-first는 원문 소유와 round-trip을 확인하는 보조 모드로 유지한다.
- B. block/outline은 잘못 나뉜 구조를 고치는 contextual correction에만 사용한다.
- C. hybrid가 기본 여정이다.

이 결정은 여덟 frozen 사례에서 첫 결과 전에 필요한 선택이 가장 적고, 원문과 해석
결과를 동시에 추적할 수 있으며, 범용 문서 편집기로 커지는 위험이 가장 낮다는
heuristic 판단이다. 실제 사용자 관찰 결과가 아니다.

## Keep

- 현재 Input Composer Lab의 입력, 구조, 결과의 관계
- 실제 콘텐츠를 먼저 보여 주는 3단계 여정
- source-derived 값과 user-authored 값의 구분
- primary artifact 한 개와 의미 있는 secondary artifact만 제안하는 정책
- 긴 표와 queue를 축약하지 않고 전체 결과에 접근하게 하는 구조

## Change

- 390px에서는 `입력 -> 구조 -> 결과` 단계형 화면으로 바꾼다.
- 1024px에서는 source와 현재 작업 surface를 나란히 두고 inspector는 drawer로 연다.
- 1440px에서만 source, outline, artifact의 3-pane을 동시에 쓴다.
- 구조 보정은 항상 선택한 block에만 적용하고 full editor를 기본으로 열지 않는다.
- 개인 초안, 제작자 초안, 공개 Flow correction suggestion을 별도 write path로 둔다.
- 내부 26개 상태는 사용자 화면에서 입력, 확인 필요, 보류, 완료, 복구의 상태군으로
  표현한다.

## Remove

- 일반 사용자 여정의 고정된 다섯 artifact 탭
- 첫 화면의 제작자/사용자 mode 선택
- source에서 이미 확보한 날짜, 제목, 순서를 다시 묻는 필드
- URL, guide, caution을 실행 Item처럼 완료시키는 표현
- parser, taxonomy, ownership enum 같은 내부 용어

## Defer

- 실제 LLM 또는 crawler
- 범용 Markdown 문법과 Wiki 기능
- 공동 편집, 댓글, revision browser
- account, DB, cloud sync
- 외부 서비스 OAuth

## 화면 계약

| Surface | 사용자 질문 | Primary action | 기본 노출 |
|---|---|---|---|
| Input | 무엇을 Flow로 만들까? | 구조 확인 | 원문, 감지 예정 범위 |
| Structure | 어떻게 나뉘었나? | 전체 결과 보기 | 원문 fragment와 Step/Item mapping |
| Result | 무엇이 만들어지나? | 구체적 저장 또는 가져가기 | 전체 수량, artifact, source 상태 |
| Item inspector | 이 항목에서 무엇을 고칠까? | 변경 적용 | 제목, 상세, 완료 기준 |
| Ownership | 누구의 값이며 어디에 쓰나? | 개인 저장 또는 검토 요청 | source 값, 개인 값, unresolved |
| Receipt | 무엇이 저장되거나 이동됐나? | 결과 열기 | 제목, 수량, 범위, artifact |

## Evidence

| 판단 | evidenceKind | 근거 |
|---|---|---|
| C 기본, A/B 보조 | `heuristic_simulation` | 여덟 frozen 사례와 16개 비교 지표 |
| responsive shell | `current_browser_automation` | 390, 1024, 1440 standalone prototype |
| 8개 사례 결과 수 | `current_browser_automation` | browser case switch와 artifact count |
| 콘텐츠 의미 보존 | `current_source` | frozen fixture, source-backed runtime, corpus snapshot |
| 직접 Claude Design interaction | `inaccessible` | 이 실행 환경에서 Claude Design 자체 도구는 호출하지 않음 |

Claude Design용 standalone handoff와 통합 프롬프트는 준비했다. 이 문서는 Claude
Design 결과를 사칭하지 않으며, 독립 agent heuristic review를 별도로 기록한다.

## 실제 사용자에게만 확인 가능한 질문

1. 일반 메모 사용자가 `구조 확인`을 예상 가능한 행동으로 이해하는가?
2. Markdown 사용자는 원문과 결과 중 어느 쪽을 기본 편집면으로 기대하는가?
3. 구조 오류를 고칠 때 outline 보정이 원문 직접 수정보다 빠르게 느껴지는가?
4. primary artifact 추천 이유가 저장 또는 export 선택에 충분한가?
5. 개인 초안과 제작자 초안의 구분을 실제 작성자가 필요로 하는가?
