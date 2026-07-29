# FlowMe P35-R7 Codex / Claude Code 독립 검토 handoff

- 작성일: 2026-07-28
- 검토 대상 worktree: `D:\flowme2605\flow-p35-mece-ux-reset`
- branch: `codex/p35-mece-ux-reset`
- 기준 `origin/main`: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 현재 판정: `review_requested_after_local_final_gate`
- 실제 관찰 사용자: `0`

## 목적

P35-R0~R7 로컬 구현이 자동 테스트를 통과했다는 사실과, 사용자가 실제로 쉽고
직관적으로 쓸 수 있다는 판단을 분리한다. Codex와 Claude Code가 같은 자료를
독립적으로 검토하고 다음을 판단하도록 준비한 패키지다.

1. P35의 3개 전역 진입과 화면 소유권이 이해 가능한가.
2. public 결과 미리보기, 최소 조정, 저장 receipt, 개인 Flow workspace가 하나의
   자연스러운 여정으로 이어지는가.
3. Calendar, Checklist, Routine, Sheet, Memo가 각 콘텐츠에 맞는 실행 문법을
   가지면서도 같은 서비스처럼 보이는가.
4. My Flow가 1개와 60개 Flow 모두에서 찾기, 열기, 실행, 수정, export, 관리가
   쉬운가.
5. 현재 제한적 수정으로 충분한지, bounded revision 또는 structural reopen이
   필요한지.

이번 패키지는 **검토 전용**이다. 앱 코드 수정, commit, push, PR, merge, deploy를
승인하지 않는다.

## 현재 상태

| 구분 | 현재 사실 |
| --- | --- |
| 구현 | P35-R0~R7 로컬 dirty worktree에 존재 |
| 자동 검증 | docs, unit, build, targeted/full E2E 통과 |
| handoff 문서 검증 | 별도 clean publish worktree에서 docs 14개·로컬 링크 3,361개 통과 |
| R7 E2E | 6/6 |
| 전체 E2E | 381/381, workers=1 |
| pretest / unit | 91/91, 590/590 |
| screenshot | 총 71장: R7 final gate 16장 + 현재 상세 여정 18장 + P35 단계 참고 37장 |
| 화면 오류 | overflow 0, fixed overlap 0, unnamed visible interactive 0 |
| source mutation | 0 |
| storage migration | 없음 |
| current R7 commit/push/PR | 없음 |
| current R7 Preview/production | 없음 |
| 실제 사용자 관찰 | 0 |

이전에 만든 Vercel Preview는 현재 R0~R7 dirty source를 나타내지 않는다. 최신
화면 판단에는 이 패키지의 screenshot, current source, 필요하면 로컬 production
build를 사용한다.

## 읽는 순서

1. [통합 검토 보드](./review.html)
2. [71장 전체 screenshot index](./screenshot-index.md)
3. [screenshot 전체 카탈로그](./screenshot-catalog.json)
4. [현재 상세 여정 18개 manifest](./current-journeys/preview-manifest.json)
5. [P35 단계 참고 37개 manifest](./slice-reference-manifest.json)
6. [검토 브리프](./review-brief-ko.md)
7. [검토 체크리스트](./review-checklist-ko.md)
8. [현재 상태 JSON](./review-context.json)
9. [페르소나·세션 시나리오](./review-scenarios.json)
10. [R7 final gate README](../2026-07-27-p35-r7-bounded-revision-final-gate/README.md)
11. [R7 상세 audit](../2026-07-27-p35-r7-bounded-revision-final-gate/audit.md)
12. [R7 route evidence](../2026-07-27-p35-r7-bounded-revision-final-gate/route-evidence.json)
13. [P35 bounded revision handoff](../../specs/2026-07-26-flowme-mece-ux-reset/p35-bounded-revision-developer-handoff-ko.md)
14. [응답 템플릿](./review-response-template-ko.md)
15. [공용 복붙용 프롬프트](./unified-review-prompt-ko.txt)
16. [Claude Design 복붙용 프롬프트](./claude-design-review-prompt-ko.txt)
17. [검토 보드 렌더 확인](./review-render-check.json)

## Screenshot 구성

| 묶음 | 수량 | evidenceKind | 용도 |
| --- | ---: | --- | --- |
| R7 final gate | 16 | `current_package_screenshot` | 다섯 형태 x 저장 전·export·저장 후와 60 Flow 규모 비교 |
| 현재 상세 여정 | 18 | `current_local_browser_capture` | 실제 행동 순서와 overlay, detail, completion, Calendar 상태 확인 |
| P35 단계 참고 | 37 | `prior_p35_slice_screenshot` | P35-01~P35-08 변화 과정과 acceptance 계약 비교 |

현재 UI 판단은 앞의 두 묶음을 우선한다. P35 단계 참고 화면은 과거 slice의
acceptance 상태이므로 현재 R7의 화면 정답으로 사용하지 않는다.

## 제품 방향

FlowMe는 무거운 planner가 아니라 **portable execution layer**다.

```text
외부 URL 또는 개인 메모
→ 실제 결과 미리보기
→ 필요한 값만 최소 조정
→ FlowMe에 저장하거나 익숙한 도구로 가져가기
→ 실행·완료·다시 열기
→ 수정·기록·재사용
```

- 전역 진입은 `Flow 찾기 / 캘린더 / 내 Flow` 3개다.
- public Flow는 긴 설명보다 실제 저장 결과를 먼저 보여준다.
- My Flow는 저장한 Flow library와 선택한 개인 Flow workspace를 소유한다.
- Calendar는 날짜가 있는 여러 Flow를 보는 cross-Flow lens다.
- export는 `범위 → 개수 → 형식 → 결과` 순서로 예측 가능해야 한다.
- Calendar, Checklist, Routine, Sheet, Memo는 전역 탭이 아니라 콘텐츠별 자연스러운
  결과 형태다.

## 독립 검토에서 다시 열어야 할 질문

1. public preview와 저장 후 날짜 묶음이 같은 Flow의 같은 항목처럼 보이는가.
2. 저장 후 workspace의 날짜 묶음 행을 public preview와 유사한 anatomy로 맞추고
   완료 checkbox를 행 오른쪽에 두는 편이 더 나은가.
3. 저장 성공 뒤 곧바로 `오늘 할 일` 같은 중간 화면이 필요한가, 아니면 저장한
   전체 Flow를 먼저 확인해야 하는가.
4. `다음 할 일`은 같은 날짜의 미완료 항목을 묶어 보여줘야 하는가.
5. 저장 전 `Flow 조정`에서 제목·상세·날짜의 제한적 수정 깊이가 적절한가.
6. public preview에서 자연스러운 artifact와 실제 export를 함께 선택·예측할 수
   있는가.
7. `되돌리기`는 완료한 항목이 현재 화면에서 사라질 때만 필요한가.
8. shape-aware 실행 영역과 기록 영역의 이름·역할이 여전히 모호하지 않은가.
9. 60개 Flow에서도 library와 focused workspace가 실서비스 수준으로 스캔 가능한가.
10. 기능은 존재하지만 설명 없이 찾기 어려운 hidden capability가 남아 있는가.

## Evidence 종류

- `current_source`
- `current_local_production_build`
- `current_browser_interaction`
- `current_browser_automation`
- `current_package_screenshot`
- `current_automated_test`
- `prior_artifact`
- `reference_pattern`
- `heuristic_simulation`
- `inaccessible`
- `observed_user`

자동화, fixture, screenshot, agent simulation은 `observed_user`가 아니다.

## 기대 결과

각 검토자는 앱을 수정하지 않고 다음을 제출한다.

1. severity 순 findings
2. 전체 verdict: `retain / bounded_revision / structural_reopen / block_publish`
3. 다섯 형태 x 세션별 판정
4. owner 질문 10개에 대한 판정
5. 390 / 1024 / 1440 hierarchy와 interaction 개선안
6. source / personal / run / occurrence / export 계약 영향
7. keep / change / defer
8. 실제 사용자에게만 확인할 질문
9. 다음 개발 프로그램과 첫 bounded slice

## Publish 상태

- local edit: 있음
- commit: 없음
- push: 없음
- PR: 없음
- merge: 없음
- current R7 Preview: 없음
- production deploy: 없음
