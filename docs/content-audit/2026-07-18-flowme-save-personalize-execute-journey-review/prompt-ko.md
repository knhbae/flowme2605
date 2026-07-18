# P24-J0 복붙용 목표

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P24-J0 Save-Personalize-Execute Journey Decision Package를 완성한다. 앱 UI를 바로 수정하지 않고, 현재 production과 기존 콘텐츠 편집 시뮬레이션, Claude Design 목업, 인접 서비스 공식 패턴을 기준으로 저장 전 판단 → 최소 조정 → 저장 직후 전체 Flow 확인 → Today 실행 → Calendar 일정 실행의 두 대안 wireframe을 만든다. moving, vehicle inspection, personal memo draft 세 유형을 시뮬레이션하고, owner walkthrough와 2개의 10분 prototype test를 거쳐 P24-J1 구현안을 keep/change/defer로 확정한다.

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
13. FlowMe UXUI 전체 검토 (8).zip의 FlowMe UX 개선안 목업 + 코멘트.dc.html

필수 산출물:
- current vs 대안 A/B 390px/1024px wireframe
- moving/vehicle/memo draft journey simulation
- 설명 copy delete/collapse/keep map
- first-save와 returning-visit state contract
- My Flow/Calendar/undated/held visibility map
- prototype-test script와 결과 기록
- P24-J1 구현 범위와 acceptance criteria

평가 질문:
1. 설명 없이 10초 안에 무엇이 저장되는지 말할 수 있는가?
2. 그대로 저장과 조정하고 저장의 차이를 예측하는가?
3. 저장 직후 전체 Flow를 추가 행동 없이 확인하는가?
4. Today와 Calendar의 역할을 구분하는가?
5. 날짜 없는 일을 어디서 일정에 넣는지 찾는가?
6. 출처/주의 정보가 필요할 때 찾을 수 있는가?

이번 단계에서 하지 않을 것:
- production app code 수정
- 4탭 IA나 schema 변경
- AI/API/DB/OAuth 추가
- 실제 사용자 관찰로 자동화나 simulation을 계산

완료 기준:
- 하나의 추천 wireframe이 근거와 함께 선택된다.
- prototype Blocking finding이 0이거나, 남은 Blocking이 구현 전에 명시된다.
- P24-J1~J5 순서와 중단 조건이 확정된다.
- 앱 runtime 코드가 변경되지 않는다.
- docs:check와 git diff --check가 통과한다.
```
