# FlowMe P26 마감 독립 검토용 복붙 프롬프트

아래 내용을 그대로 Claude Design 또는 Codex에 전달해 주세요.

```text
FlowMe P26 최신 production과 origin/main을 독립적으로 검토해줘. 앱 기능을 먼저 수정하지 말고, 현재 production interaction, current source, P26 final package, 시나리오 screenshot을 대조해 P27 제품/UX 백로그를 만들어줘.

Production
https://flowme2605.vercel.app

GitHub main
https://github.com/knhbae/flowme2605

P26 final review package
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-20-p26-final-review-package

읽기 순서
1. review.html
2. completion-audit.md
3. route-evidence.json
4. decision-log.json
5. production-smoke/results.json과 screenshots
6. P26-19 six-shape evidence와 screenshots
7. current source

P26-19 six-shape evidence
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-20-p26-19-six-shape-journey-gate

Canonical P26 spec
https://github.com/knhbae/flowme2605/tree/main/docs/specs/2026-07-20-p26-program

Current status and roadmap
https://github.com/knhbae/flowme2605/blob/main/docs/STATUS.md
https://github.com/knhbae/flowme2605/blob/main/docs/ROADMAP.md

추가 비교 자료
로컬 `D:/flowme2605/flow-mvp/docs/content-audit/2026-07-19-flow-content-usage-preview-ko.html`
이 파일은 current implementation이 아니라 prior_design_artifact다. 최소 입력과 결과 preview의 근접성, compact source rail, 실행 row 밀도, destination preview만 비교 기준으로 사용하고 실제 구현 완료 근거로 쓰지 마라. 접근할 수 없으면 evidenceKind=inaccessible로 표시하고 계속 진행해라.

검토할 사용자 여정 6개
1. 이사 같은 기준일 역산 timeline
2. 차량 점검 같은 날짜 없는 checklist
3. 운동/청소 같은 recurring routine
4. 여행/프로젝트 같은 sequence + date 혼합
5. 생활 기록 같은 record + memo
6. URL miss 또는 memo 기반 personal draft

각 여정에서 다음을 실제 화면으로 시뮬레이션해라.
발견 -> 전체 artifact 확인 -> 그대로 시작 또는 조정 -> 저장 receipt -> 전체 Flow 확인 -> 제목/날짜/메모/구조 수정 -> 완료와 다시 열기 -> Calendar 배치/이동 -> 전체 또는 선택 export -> 완료 후 재사용

반드시 확인할 제품 계약
- source / personal overlay / run / occurrence / export identity가 섞이지 않는가
- Today, My Flow, Calendar, ICS, checklist, sheet, memo가 같은 effective item을 읽는가
- 반복 series와 executable occurrence가 구분되는가
- 날짜 없는 일은 My Flow에서 실행 가능하고 Calendar에서는 의도적으로 배치되는가
- 완료 control은 실행 row 또는 occurrence당 하나인가
- save-before와 post-save에서 사용자가 전체 Flow를 확인할 수 있는가
- export가 scope -> format -> actual result 순으로 이해되는가
- 모바일 390x844와 wide 1024x768에서 설명 없이 핵심 행동을 찾을 수 있는가

P26 마감에서 남긴 Medium 가설도 재검토해라.
- 모바일 batch editor의 control 밀도
- wide 날짜 없는 할 일 rail의 긴 제목 식별성
- 모바일 Calendar tray + month grid의 긴 composition
- recurring occurrence detail의 state/memo/export 위계

평가 원칙
- production interaction이 최우선이다.
- current source와 current package screenshot을 그다음으로 본다.
- prior artifact와 경쟁 제품 패턴은 비교 근거일 뿐 정답이 아니다.
- 긴 설명문 추가로 정보 구조 문제를 덮지 마라.
- FlowMe를 무거운 planner로 키우지 말고, memo/todo/calendar 사용자의 portable execution layer라는 방향을 유지해라.
- 자동화·heuristic simulation을 실제 사용자 검증이라고 쓰지 마라. observed-user session은 현재 0이다.
- 화면 일부가 마음에 들지 않는다는 이유만으로 안정된 identity/projection 계약을 다시 깨지 마라.

모든 finding에 아래를 포함해라.
- severity: Blocking / High / Medium / Low
- route
- viewport
- 재현 순서
- 기대 결과
- 실제 결과
- 사용자 영향
- evidenceKind: current_production_interaction / current_package_screenshot / current_source / prior_design_artifact / reference_pattern / heuristic_simulation / inaccessible
- 제안 해결책
- acceptance screenshot 또는 test marker

결과 형식
1. 전체 판정
2. severity 순 findings
3. 6개 여정 scorecard
4. Keep / Change / Defer
5. current vs proposed 모바일/wide wireframe
6. P27 backlog를 Blocking / High / Medium / Low로 제시
7. dependency와 권장 실행 순서
8. 각 P27 slice의 완료 기준
9. 실제 사용자에게만 확인 가능한 질문

검토 중 앱 코드를 수정하지 마라. 일부 링크가 열리지 않아도 질문을 멈추지 말고 production, GitHub main, 접근 가능한 evidence로 계속 진행해라.
```

