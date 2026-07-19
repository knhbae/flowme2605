# P25-00B Copy-Paste Goal

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P25-00B Core Execution Workspace Prototype Decision을 진행한다. 앱 UI나 저장/실행/export 코드를 바로 수정하지 않고, 사용자·Codex·Claude Design 피드백을 반영한 모바일 390px/wide 1024px 핵심 화면 대안을 만든다. 저장 전 artifact, 저장 직후 전체 Flow, 돌아온 My Flow, 전체 Flow 보기, 날짜 없는/언제든 할 일과 Calendar 배치, 개인 조정, 완료/재개, export 범위를 하나의 실행 모델로 시뮬레이션하고 owner가 keep/change/reject 결정을 내릴 수 있는 package를 만든다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/STATUS.md
5. docs/ROADMAP.md
6. docs/DECISIONS.md
7. docs/PRODUCT_PRINCIPLES.md
8. docs/REFERENCE.md
9. docs/specs/2026-07-19-execution-workspace-foundation/spec.md
10. docs/specs/2026-07-19-execution-workspace-foundation/plan.md
11. docs/specs/2026-07-19-execution-workspace-foundation/qa.md
12. docs/content-audit/2026-07-19-flowme-p25-ux-feedback-reconciliation/README.md
13. docs/content-audit/2026-07-19-flowme-p25-ux-feedback-reconciliation/audit.md
14. docs/content-audit/2026-07-19-flowme-p25-ux-feedback-reconciliation/feedback-matrix.json
15. components/flow/AppClient.tsx

작업 원칙:
- 앱 runtime 코드를 수정하지 않는다.
- 외부 사용자 관찰을 요청하지 않는다.
- 현재 화면을 예쁘게만 다듬지 않는다.
- whole Flow artifact -> personal adjustment -> execution -> Calendar/export projection 모델을 모든 대안에 적용한다.
- 날짜 없는 항목은 실패 상태가 아니라 날짜 없이 실행 가능한 항목이다.
- Calendar는 날짜가 있는 항목만 grid에 보이고, 날짜 없는 항목은 별도 배치 queue에서 날짜를 선택할 수 있어야 한다.
- source-backed 원본과 개인 사본은 분리한다.
- My Flow local IA의 `지금 / Flow / 완료`는 추천안이지 확정안이 아니므로 대안과 비교한다.
- Notion식 full editor, 새 global tab, AI, DB, OAuth는 제안하지 않는다.

필수 prototype:
1. public/source-backed 저장 전 화면
2. 저장 직후 전체 Flow 확인
3. 돌아온 My Flow
4. 전체 Flow outline + item detail drawer
5. Calendar + 날짜 없는 항목 배치
6. item 조정 기본/고급 단계
7. 선택 항목 batch 날짜 이동/날짜 지우기
8. 완료 직후 undo + 완료 목록에서 재개
9. 현재/선택/Flow 전체 export scope

각 prototype은 아래 두 대안을 비교한다:
- A: 최소 변경안
- B: Flow workspace 구조안(추천)

검토할 Flow 유형:
- 이사 기준일 역산형
- 차량 날짜 없는 체크리스트형
- 월간 청소 반복형
- 여행/프로젝트 그룹형
- 기록/메모형
- URL/memo 개인 초안형

각 화면에서 기록:
- 사용자의 첫 시선과 첫 행동
- 화면이 표현하는 primary object
- visible controls와 progressive controls
- tap/click depth
- dated/undated/completed/held 상태
- source와 personal copy 경계
- mobile/wide 차이
- 제거한 설명 문구와 남긴 이유
- A/B 장단점
- owner에게 필요한 keep/change/reject 질문

산출물:
docs/content-audit/2026-07-19-p25-00b-core-workspace-prototype-decision/
- README.md
- audit.md
- decision-matrix.json
- prototype.html
- owner-review-ko.md
- screenshots/

완료 기준:
- 390px/1024px 핵심 화면이 모두 비교된다.
- `날짜 없는 할 일`의 의미와 My Flow/Calendar 역할이 UI로 설명된다.
- 전체 Flow가 저장 직후와 재방문 때 같은 구조로 보인다.
- 기본 조정과 세부 일정이 progressive하게 분리된다.
- 완료/재개와 export scope가 별도 설명 없이 예측된다.
- owner가 화면별 keep/change/reject를 선택할 수 있다.
- app runtime과 schema는 변경되지 않는다.
- P25-01A correctness와 P25-02 UI 구현에 필요한 결정이 분리된다.
- npm.cmd run docs:check, git diff --check, prototype 390/1024 browser inspection을 완료한다.

최종 응답:
prototype 경로, A/B 핵심 차이, 추천안, owner 결정 질문, 검증, 앱 코드 무변경, commit/push 상태를 요약한다.
```
