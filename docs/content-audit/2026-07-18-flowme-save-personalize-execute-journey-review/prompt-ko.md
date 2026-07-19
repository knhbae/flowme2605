# P24-J0 복붙용 목표

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P24-J0 Save-Personalize-Execute Internal Journey Decision을 완성한다. FlowMe는 아직 외부 사용자에게 관찰을 요청할 수준이 아니므로 참가자 모집, prototype session, observed-user session을 진행하지 않는다. 앱 UI도 바로 수정하지 않는다. 현재 production, 기존 콘텐츠 편집 시뮬레이션, Claude Design 목업, 인접 서비스 공식 패턴을 근거로 `저장 전 판단 -> 필요한 만큼 조정 -> 저장 직후 전체 Flow 확인 -> Today 실행 -> Calendar 일정 실행`을 잇는 대안 wireframe을 만들고, owner walkthrough와 독립 Codex/Claude heuristic review로 P24-J1 구현안을 확정한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/STATUS.md
5. docs/ROADMAP.md
6. docs/specs/2026-07-18-save-personalize-execute-journey-reset/spec.md
7. docs/specs/2026-07-18-save-personalize-execute-journey-reset/plan.md
8. docs/specs/2026-07-18-save-personalize-execute-journey-reset/qa.md
9. docs/content-audit/2026-07-18-flowme-save-personalize-execute-journey-review/README.md
10. docs/content-audit/2026-07-18-flowme-save-personalize-execute-journey-review/audit.md
11. docs/content-audit/2026-07-18-flowme-save-personalize-execute-journey-review/reference-patterns.md
12. docs/content-audit/2026-07-14-flowme-content-edit-execution-simulation-ko.html
13. FlowMe UXUI 전체 검토 (8).zip 안의 FlowMe UX 개선안 목업 + 코멘트.dc.html

필수 산출물:
- current vs 대안 A/B의 390px/1024px wireframe
- moving/vehicle/memo draft 내부 journey simulation
- 설명 copy delete/collapse/keep map
- first-save와 returning-visit state contract
- My Flow/Calendar/undated/held visibility map
- owner walkthrough 결과
- 별도 Codex/Claude independent review 결과
- P24-J1 구현 범위와 acceptance criteria

평가 질문:
1. 화면만 보고 무엇이 저장되는지 예측 가능한가?
2. 그대로 저장과 조정하고 저장의 차이가 보이는가?
3. 저장 직후 전체 Flow를 추가 탐색 없이 확인하는가?
4. Today와 Calendar의 역할이 화면 구조로 구분되는가?
5. 날짜 없는 일을 어디서 일정에 넣는지 찾을 수 있는가?
6. 출처/주의 정보는 필요할 때 찾을 수 있으면서 1차 행동과 경쟁하지 않는가?

이번 단계에서 하지 않을 것:
- production app code 수정
- 외부 참가자 모집 또는 사용자 관찰 요청
- 자동화·simulation·owner review를 실제 사용자 검증으로 계산
- 4탭 IA 또는 저장/실행/export schema 변경
- AI/API/DB/OAuth 추가

완료 기준:
- 하나의 추천 wireframe이 근거와 함께 선택된다.
- owner와 독립 reviewer의 Blocking finding이 0이거나 구현 전에 명시된다.
- P24-J1~J5 순서와 중단 조건이 확정된다.
- P24-J5는 독립 production-readiness 감사이며 P24-00B를 자동 재개하지 않는다.
- 외부 관찰은 `not scheduled`, 실제 세션은 `0 / 15`로 유지된다.
- 앱 runtime 코드가 변경되지 않는다.
- docs:check와 git diff --check가 통과한다.
```
