# Claude Design / Codex 통합 복붙용 프롬프트

아래 블록 하나를 그대로 전달한다. 검토자는 사용 가능한 도구에 따라 `claude_design` 또는 `codex_independent` lane을 선택한다.

```text
FlowMe P30 current production을 여러 페르소나의 상세한 multi-session 사용자 여정으로 독립 검토해줘.

이번 요청은 기능 구현이 아니다. 앱 코드를 먼저 수정하지 말고, 시뮬레이션을 통해 서비스/플랫폼의 가치 연결과 여정 단절을 찾은 뒤 keep / revise / defer를 판단한다.

검토 역할:
- 시각·interaction·wireframe 중심이면 reviewerRole=claude_design
- current main/production 재현·테스트 중심이면 reviewerRole=codex_independent
- 두 역할 모두 같은 8 personas x 3 sessions = 24개 journey cell을 사용한다.

Production:
https://flowme2605.vercel.app

GitHub main:
https://github.com/knhbae/flowme2605

P30 final package:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package

정본 읽기 순서:
1. current production interaction
2. P30 review.html
   https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/review.html
3. P30 README/audit
   https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/README.md
   https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/audit.md
4. structured evidence
   https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/route-evidence.json
   https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/journey-results.json
   https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke/results.json
5. production screenshots
   https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke/screenshots
6. current STATUS/ROADMAP/PRODUCT_PRINCIPLES
   https://github.com/knhbae/flowme2605/blob/main/docs/STATUS.md
   https://github.com/knhbae/flowme2605/blob/main/docs/ROADMAP.md
   https://github.com/knhbae/flowme2605/blob/main/docs/PRODUCT_PRINCIPLES.md
7. P29 Claude standalone review는 해결 여부 비교에만 사용
   https://github.com/knhbae/flowme2605/blob/main/claude_work/FlowMe%20P29%20%EB%8F%85%EB%A6%BD%EA%B2%80%ED%86%A0%20(standalone).html

현재 기준:
- origin/main: 4c5bbb34f5c8633d4b4b48fb8070e523ec5def6b
- app implementation: PR #148 / merge b3c8500be3b6aa673e2078d02a986f7cae6fe8bf
- final closeout: PR #149 / merge 4c5bbb34f5c8633d4b4b48fb8070e523ec5def6b
- production smoke: 13/13
- unit: 584/584
- full E2E: 304/304
- observed users: 0

제품 기준:
- FlowMe는 무거운 planner가 아니라 외부 콘텐츠를 Calendar, checklist, sheet, memo로 옮기는 portable execution layer다.
- 핵심 loop는 content -> minimum anchor -> actual artifact preview -> save/copy/export -> execute -> feedback/reuse다.
- 설명보다 실제 결과와 다음 행동을 먼저 보여준다.
- source, personal overlay, execution run, recurrence occurrence, export identity를 섞지 않는다.
- 4탭 IA와 public /f shell을 concrete current evidence 없이 다시 열지 않는다.
- 자동화, screenshot, heuristic simulation은 실제 사용자 관찰이 아니다. 사용자 모집은 이번 범위가 아니다.

시뮬레이션 운영 원칙:
1. 각 persona는 독립된 초기 브라우저 상태에서 시작한다.
2. 같은 persona의 Session 1 결과는 Session 2와 Session 3으로 이어간다.
3. session 사이에 reload 또는 재진입을 포함해 persistence를 확인한다.
4. fixture/query/demo가 필요하면 fixture_only라고 표시하고 실제 사용자 도달 가능성과 구분한다.
5. 기능이 없으면 우회 구현하지 말고 hidden / partial / missing / blocked로 기록한다.
6. 성공 경로뿐 아니라 취소, 뒤로 가기, undo, reopen, invalid/empty 상태와 recovery를 확인한다.
7. 화면별 pass와 end-to-end journey pass를 별도로 판정한다.

8개 persona와 3개 session:

P1 마감일 역산형 이사 사용자
- S1: / -> /flows -> /f/moving-d30-basic, 이사일 입력·artifact 확인·조정·저장
- S2: /my -> /calendar, 완료/취소·기준일 변경·개인 고정 날짜 확인
- S3: whole Calendar export·새 이사일 재사용·과거 run 보존

P2 날짜 없는 차량 점검 사용자
- S1: /f/vehicle-inspection-prep 저장, preview와 completion 경계 확인
- S2: undated item 일부 Calendar 배치·undo·완료/재개
- S3: whole/selected/current export와 날짜 제거 후 tray 복귀

P3 반복 홈트 사용자
- S1: /f/curated-allblanc-morning-workout, 요일·시간·duration·종료 조건 설정
- S2: 이번 회차 완료/재개, series와 occurrence 분리 확인
- S3: Calendar/ICS·과거 기록·resource와 execution item 구분

P4 Calendar-heavy 다중 Flow 사용자
- S1: /calendar?demo=ux20, /calendar?demo=ux50, 검색·2 Flow 선택
- S2: 같은 날짜 5 Flow compact/full identity와 실행 행동
- S3: undated 2개 batch 배치·undo·focus/scroll/stable ID

P5 기존 도구 중심 export 사용자
- S1: primary/secondary artifact, scope/count/loss 예측
- S2: My Flow whole/selected/current export와 receipt
- S3: Calendar/checklist/sheet/memo parity, duplicate import/cross-device 지원 상태

P6 URL/메모 개인 초안 사용자
- S1: /flows hit/miss/source-import-required와 draft 저장
- S2: add/delete/restore/reorder/title/date/time/memo/completion
- S3: Calendar/list export parity, reload persistence, 개인 draft와 공유 Flow 경계

P7 재방문·회고·재사용 사용자
- S1: 저장 receipt·전체 Flow·첫 실행·단계 메모
- S2: 일부 완료·reopen·개인 수정·source correction 구분
- S3: 전체 완료·회고·새 run·과거 실행 기록 보존

P8 키보드·저시력 보조 사용자
- S1: header -> workspace -> persistent tabs, save-before keyboard 조정
- S2: sheet/dialog/menu focus trap, Escape, focus return, accessible name
- S3: 완료/reopen·배치/undo·export keyboard-only와 확대/overflow

각 journey cell에 반드시 기록:
- personaId, sessionId, userGoal
- route, viewport, fixture와 시작 상태
- steps와 tap/click depth
- expected mental model
- actual UI feedback와 next action
- visible/reachable 여부
- reload/revisit persistence
- My Flow / Calendar / export의 title/date/count/stable identity parity
- failure recovery와 데이터 보존
- 설명 없이 이해 가능한지
- supported / hidden / partial / missing / blocked
- severity와 evidenceKind
- observed user에게만 확인 가능한 가정

서비스/플랫폼 종합 평가:
1. 가치 제안 명확성
2. source 신뢰와 provenance
3. artifact 품질과 destination 적합성
4. 개인화 자유도와 복잡도 균형
5. 실행·완료·복구 연속성
6. My Flow / Calendar / export 정합성
7. 재방문·재사용 이유
8. creator/source correction loop
9. 접근성·responsive operability
10. 20~60개 Flow에서의 scale

공통 viewport:
- 390x844
- 1024x768
- 핵심 workspace 1440x900

evidenceKind:
- current_production_interaction
- current_browser_automation
- current_command
- current_package_screenshot
- current_source
- prior_design_artifact
- reference_pattern
- heuristic_simulation
- fixture_only
- inaccessible
- observed_user

reviewerRole=claude_design 추가 요구:
- current와 proposed mobile/wide hierarchy를 나란히 비교한다.
- Calendar, todo, Notion, 여행·운동 앱 reference pattern을 검토하되 FlowMe를 full planner로 만들지 않는다.
- 긴 설명을 추가하는 방식으로 문제를 해결하지 않는다.
- 시각 변경은 어떤 journey discontinuity를 줄이는지 연결한다.
- 앱 코드는 수정하지 않는다.

reviewerRole=codex_independent 추가 요구:
- git fetch 후 clean origin/main worktree를 사용한다.
- package-lock을 유지한다.
- docs:check, unit, build, P30 targeted E2E와 필요한 related E2E를 현재 실행한다.
- production browser에서 overflow, fixed overlap, focus, accessible name, console/page error를 확인한다.
- 이전 수치를 이번 결과로 복사하지 않는다.
- 검토 중 앱 코드를 수정하지 않는다.

필수 산출물:
- README.md: 전체 판정과 가장 중요한 단절
- audit.md: severity findings
- review.html: persona journey, current/proposed, service/platform assessment
- persona-journey-scorecard.json: 8 x 3 = 24 cells
- journey-discontinuity-matrix.json: session 전환별 끊김과 recovery
- route-evidence.json
- service-platform-assessment.md
- p31-candidates.md
- screenshots/

결과 형식:
1. Overall verdict: keep_p30 / bounded_revision / structural_reopen
2. Blocking / High / Medium / Low findings
3. 24-cell persona scorecard
4. session-transition discontinuity matrix
5. surface별 keep / revise / defer
6. 서비스/플랫폼에서 가장 약한 가치 사슬 3개
7. P31 후보 최대 5개: 문제, dependency, non-goal, rollback, acceptance screenshot, test marker
8. actual user에게만 확인 가능한 질문
9. 검증 및 publish 상태

concrete current-production finding이 없으면 P31을 만들지 않는다. prior artifact의 취향 차이나 이미 해결된 finding을 새 백로그로 되살리지 않는다.
```
