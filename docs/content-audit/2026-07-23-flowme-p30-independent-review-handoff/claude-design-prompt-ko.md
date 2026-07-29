# Claude Design 복붙용 프롬프트

```text
FlowMe P30 production의 UX/UI를 독립 검토해줘. 이번 요청은 앱 구현이 아니라 current production의 시각·상호작용 평가와 다음 bounded product decision을 만드는 작업이다.

Production:
https://flowme2605.vercel.app

GitHub main:
https://github.com/knhbae/flowme2605

P30 최종 패키지:
https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package

먼저 읽을 파일:
1. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/review.html
2. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/README.md
3. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/audit.md
4. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/route-evidence.json
5. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/journey-results.json
6. https://github.com/knhbae/flowme2605/blob/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke/results.json
7. https://github.com/knhbae/flowme2605/tree/main/docs/content-audit/2026-07-22-flowme-p30-final-review-package/production-smoke/screenshots
8. https://github.com/knhbae/flowme2605/blob/main/docs/STATUS.md
9. https://github.com/knhbae/flowme2605/blob/main/docs/PRODUCT_PRINCIPLES.md

이전 제안과 해결 여부를 비교할 때만 읽기:
https://github.com/knhbae/flowme2605/blob/main/claude_work/FlowMe%20P29%20%EB%8F%85%EB%A6%BD%EA%B2%80%ED%86%A0%20(standalone).html

현재 상태:
- current main: 4c5bbb34f5c8633d4b4b48fb8070e523ec5def6b
- P30 app implementation: PR #148, merge b3c8500be3b6aa673e2078d02a986f7cae6fe8bf
- final closeout: PR #149, merge 4c5bbb34f5c8633d4b4b48fb8070e523ec5def6b
- canonical production smoke: 13/13
- local unit: 584/584, full E2E: 304/304
- 실제 관찰 사용자: 0

제품 기준:
- FlowMe는 무거운 planner가 아니라 외부 콘텐츠를 사용자의 Calendar, checklist, sheet, memo로 옮기는 portable execution layer다.
- content -> minimum anchor -> actual artifact preview -> copy/save/export -> execution -> feedback가 핵심이다.
- 긴 설명으로 UI 문제를 덮지 말고 실제 artifact와 다음 행동을 먼저 보여준다.
- source, personal overlay, execution run, recurrence occurrence, export identity는 분리한다.
- 4탭 IA와 public /f shell은 concrete current-production evidence 없이 다시 설계하지 않는다.
- 자동화와 heuristic simulation은 실제 사용자 검증이 아니다. 이번 요청에서 사용자 모집은 필요 없다.

반드시 current production을 기준으로 다음 여정을 시뮬레이션해줘.

1. 처음 온 사용자
   / -> /flows -> /f/moving-d30-basic
   실제 artifact가 설명보다 먼저 읽히는지, 조정 전후와 저장 receipt가 분리되는지 확인

2. public Flow 저장/export 사용자
   /f/moving-d30-basic
   /f/vehicle-inspection-prep
   저장 전 preview, Flow 전체 export, mobile fixed layer 관계 확인

3. My Flow 반복 사용자
   /my?demo=ux20&view=flows
   검색 -> Flow 열기 -> 다음 행동 -> 완료/다시 열기 -> 가져가기 -> 보관 menu 확인

4. Calendar-heavy 사용자
   /calendar
   /calendar?demo=ux20
   /calendar?demo=ux50
   50+ scope 선택, 같은 날짜 5 Flow identity, 날짜 없는 할 일 배치/undo 확인

5. 반복 Flow 사용자
   /f/curated-allblanc-morning-workout
   compact summary, 다음 3회, advanced 설정, series/이번 회차 위계 확인

6. legacy 경계
   /flow-maps/moving-d30
   artifact-first /f와 다른 composition을 유지·이관·보류 중 어떻게 판단할지 제안

화면별 점검으로 끝내지 말고 아래 8개 페르소나를 각각 3세션으로 시뮬레이션해줘.

1. 이사일 역산형 Calendar 사용자
   발견·이사일 개인화·저장 -> 완료/취소·날짜 수정 -> ICS export·새 기준일 재사용
2. 날짜 없는 차량 점검 사용자
   public checklist 저장 -> 일부만 Calendar 배치·undo -> whole/selected/current export
3. 반복 홈트 사용자
   반복 설정 -> 이번 회차 완료/재개 -> Calendar/ICS와 과거 기록 확인
4. Calendar-heavy 다중 Flow 사용자
   20~60개 검색/선택 -> 같은 날짜 5 Flow 구분 -> undated batch 배치/undo
5. 기존 도구 중심 export 사용자
   artifact 선택 -> scope/count/loss 예측 -> Calendar/checklist/sheet/memo 결과 비교
6. URL/메모 개인 초안 사용자
   miss/draft -> add/delete/restore/reorder/date/time/memo -> Calendar/export 일치
7. 재방문·회고·재사용 사용자
   저장 -> 단계별 메모·수정 -> 완료 후 새 run과 과거 기록 보존
8. 키보드·저시력 보조 사용자
   focus order -> sheet/dialog/menu focus return -> 완료/undo/export keyboard-only

각 persona의 각 session을 supported / hidden / partial / missing / blocked로 판정하고 다음을 기록해줘:
- 사용자 목적과 시작 맥락
- route, viewport, fixture
- 행동 단계와 예상 mental model
- 실제 UI feedback과 recovery
- 새로고침/재방문 persistence
- My Flow / Calendar / export의 title/date/count/identity 일치
- session 사이에 끊기는 지점
- evidenceKind와 실제 사용자 확인이 필요한 가정

추가로 서비스/플랫폼을 다음 관점에서 평가해줘:
- 가치 제안 명확성
- source 신뢰와 provenance
- artifact 품질과 목적지 적합성
- 개인화 자유도와 복잡도 균형
- 실행·완료·복구 연속성
- My Flow / Calendar / export 정합성
- 재방문·재사용 이유
- creator/source correction loop
- 접근성·반응형 operability
- 많은 Flow에서의 확장성

Viewport:
- 390x844
- 1024x768
- 핵심 workspace 1440x900

검토 관점:
- 첫 viewport의 정보 위계와 primary action
- 설명량 대비 실제 결과 가시성
- row/card/nested panel 밀도
- save-before 조정의 단계적 공개
- 저장 후 My Flow의 action-first hierarchy
- Calendar scope/selected day/undated tray의 한 모델성
- routine summary와 advanced field의 일관성
- keyboard/focus/accessibility 이름
- responsive overflow/fixed overlap
- 기존 Calendar, todo, Notion, 여행/운동 앱 reference pattern과 비교하되 FlowMe를 무거운 planner로 만들지 않는 범위

모든 주요 판단에 evidenceKind를 붙여줘:
- current_production_interaction
- current_package_screenshot
- current_source
- prior_design_artifact
- reference_pattern
- heuristic_simulation
- inaccessible

결과 형식:
1. Overall verdict: keep_p30 / bounded_revision / structural_reopen 중 하나
2. 가장 중요한 findings를 Blocking / High / Medium / Low 순서로 제시
3. finding마다 route, viewport, 재현 단계, 기대/실제, 사용자 영향, evidenceKind 포함
4. surface별 keep / revise / defer matrix
5. revise 항목은 current와 proposed mobile/wide wireframe을 나란히 제시
6. P31 후보는 최대 5개. 문제, dependency, non-goal, rollback, acceptance screenshot을 포함
7. concrete current-production finding이 없으면 새 P31 기능을 만들지 말고 keep_p30으로 결론
8. 실제 사용자에게만 확인 가능한 질문은 별도 목록으로 분리
9. 8 personas x 3 sessions journey scorecard와 session-transition discontinuity matrix 포함
10. 서비스/플랫폼 assessment와 가장 약한 가치 사슬 3개 제시

앱 코드는 수정하지 말고, 단순 UI polish 목록이나 기능 wish list가 아니라 다음 구현 여부를 결정할 수 있는 독립 검토 산출물을 만들어줘.
```
