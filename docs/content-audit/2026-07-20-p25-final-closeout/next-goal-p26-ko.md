# 다음 상세 목표: P26-00 이해도·밀도 결정 감사

아래 프롬프트를 다음 작업의 `/goal`로 사용한다.

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
P26-00 FlowMe Comprehension & Density Decision Audit를 진행한다. P25 production을 기준으로 새 기능을 먼저 추가하지 않고, P25에서 Medium으로 남긴 public 설명 밀도, 1024px Calendar 정보 밀도, 개인 draft 고급 편집 경로 길이를 실제 화면·대안 wireframe·대표 Flow 시뮬레이션으로 비교한다. 결과로 P26-01 구현 slice 하나만 확정한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/STATUS.md
5. docs/ROADMAP.md
6. docs/DECISIONS.md
7. docs/content-audit/2026-07-20-p25-final-closeout/README.md
8. docs/content-audit/2026-07-20-p25-final-closeout/completion-audit.md
9. docs/content-audit/2026-07-19-p25-08-internal-journey-gate/README.md
10. docs/content-audit/2026-07-19-p25-08-internal-journey-gate/route-evidence.json
11. components/flow/AppClient.tsx
12. components/flow/ArtifactWorkbench.tsx
13. tests/e2e/p25-whole-flow-workspace.spec.ts

작업 시작 전:
- origin/main과 production SHA를 기록한다.
- clean worktree를 사용한다.
- P25 production이 익명 접근 가능한지 확인한다.
- 이전 P25 evidence를 현재 실행 결과나 실제 사용자 관찰로 표현하지 않는다.

검토 질문:
1. public save-before에서 실제 artifact를 이해하는 데 꼭 필요한 문장만 무엇인가?
2. 문장을 지워도 title, section, item, source disclosure, save choice만으로 결과를 예측할 수 있는가?
3. 1024px Calendar에서 queue/grid/agenda를 동시에 보일 필요가 있는가, 선택 상태에 따라 2영역으로 줄이는 편이 나은가?
4. Calendar 역할을 바꾸지 않고 긴 제목과 다중 Flow를 더 빠르게 스캔하게 할 수 있는가?
5. 고급 편집에서 사용자가 실제로 원하는 intent는 날짜 정하기, 시간 추가, 반복 설정, 메모 중 무엇인가?
6. advanced editor를 짧게 만들 때 capability나 저장 상태를 숨기지 않는 최소 구조는 무엇인가?

비교할 대안:
- Public A: 현재 P25 구조에서 문장만 축약
- Public B: artifact + source disclosure + save choice만 남긴 최소 프레임
- Calendar A: 현재 3영역 밀도 개선
- Calendar B: queue 또는 agenda를 선택형 보조 pane으로 둔 2영역 프레임
- Editor A: 현재 progressive drawer 압축
- Editor B: intent-first 진입 후 필요한 control만 보여주는 2단계 프레임

대표 시뮬레이션:
- 이사 역산형
- 차량 날짜 없는 체크형
- 월간 반복 청소형
- 여행 혼합 일정형
- 메모 분할 draft형
- 시간·반복이 있는 개인 draft형

필수 evidence:
- production current frame과 대안 wireframe을 390x844, 1024x768로 캡처
- 화면별 visible text block 수, action 수, 최대 tap depth, overflow, console error
- artifact count/date/identity가 대안에서 달라지지 않는지 확인
- 자동화, heuristic, owner feedback, observed user를 분리
- 실제 관찰 사용자는 0으로 유지

산출물:
docs/content-audit/2026-07-20-p26-00-comprehension-density-decision/
- README.md
- audit.md
- decision-matrix.json
- route-evidence.json
- prototype.html
- prompt-ko.md
- screenshots/

절대 하지 말 것:
- 검토 전에 runtime UI를 수정하지 않는다.
- 4탭 IA, source/personal/run 계약, Calendar 역할, export scope, completion/reopen을 바꾸지 않는다.
- AI, DB, OAuth, direct integration을 추가하지 않는다.
- 자동 시뮬레이션을 실제 사용자 관찰로 표현하지 않는다.

완료 기준:
- 세 Medium 각각 keep/change/defer가 결정된다.
- P26-01은 한 개의 bounded implementation slice로 정리된다.
- 대안이 단순히 예뻐 보이는 것이 아니라 더 적은 설명, 더 짧은 행동 깊이, 같은 projection truth를 증명한다.
- current P25 production과 비교 가능한 390/1024 evidence가 있다.
- 앱 코드는 변경되지 않는다.
- docs:check와 git diff --check가 통과한다.
- 이번 감사 산출물만 별도 커밋하고 push한다.

최종 응답:
세 Medium 판정, 선택 대안, 버린 대안과 이유, 수치 비교, 자동/실사용자 evidence 경계, P26-01 상세 목표, 검증, 커밋/푸시 상태를 요약한다.
```
