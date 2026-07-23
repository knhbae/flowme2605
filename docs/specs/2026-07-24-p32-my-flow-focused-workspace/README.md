# P32 My Flow Focused Workspace

작성일: 2026-07-24

상태: `released_production_smoke_green`

앱 코드 변경: 있음

데이터 migration: 없음

실제 관찰 사용자: `0`

## 한 줄 판단

P31의 목록·검색·저장·완료·보관 계약은 유지하면서, 선택한 Flow 안에서 수정·기준일·가져가기·관리 명령이 흩어진 문제를 **library -> focused workspace** 구조로 정리했다.

## 구현 결과

- P32-01에서 B1 `library_to_focused_workspace_with_cross_flow_queue`를 선택했다.
- `지금 / Flow 목록 / 완료`는 여러 Flow를 보는 library 상태에만 유지한다.
- 한 Flow를 열면 global My Flow local tabs를 숨기고 `다음 행동 / 전체 계획 / 기록` object workspace만 보여준다.
- 항목 제목·날짜·메모 수정入口를 Item detail 바로 안으로 옮겼다.
- 저장된 이사 Flow의 기준일을 다시 바꿀 수 있고 개인 고정 날짜·메모는 유지된다.
- whole export와 Flow 관리 명령을 선택한 Flow의 command 영역에 모았다.
- 여섯 대표 content shape가 같은 focused shell을 사용한다.
- public `/f`, 4탭 IA, source/personal/run/occurrence/export identity와 기존 localStorage key는 바꾸지 않았다.

현재 검증:

- unit: `587 / 587`
- full Playwright: `314 / 314`
- production build: pass
- security audit: vulnerabilities `0`
- 390/1024/1440 overflow, fixed overlap, unnamed focusable, console/page error: `0`
- PR [#154](https://github.com/knhbae/flowme2605/pull/154), merge `30281a7a8ea9bea1194b4104b5a49b6211c07e3b`
- canonical production smoke: `7 / 7`
- observed-user count: `0`

최종 package: [P32 final review package](../../content-audit/2026-07-24-p32-final-review-package/README.md)

## 정본

- [제품·UX 계약](./spec.md)
- [단계별 실행 계획](./plan.md)
- [작업 체크리스트](./tasks.md)
- [시뮬레이션·검증·재계획 기준](./qa.md)

## 이번 계획이 합친 근거

1. Claude Design `FlowMe P31 구조 검토 요청`
   - 판정: `my_flow_structural_reopen`
   - 선택안: B `library_to_focused_workspace`
   - 장점: 한 Flow에 집중하는 mobile/wide shell, content-shape body, series와 run 분리
   - 한계: 이전 source와 screenshot 위의 heuristic 수치가 최신 production 실측과 일부 다름
2. Codex P31 독립 검토
   - 기준 SHA: `a2e1d72dadda0104f97682ae662dfbc113a85318`
   - 판정: `my_flow_structural_reopen`
   - 선택안: B `library_to_focused_workspace`
   - 확인된 핵심 문제: 항목 수정, whole export, archive/restore가 각각 6단계
   - 최신 1/5/20/60 Flow 실측: Flow 열기 2단계, 가로 overflow 0, actionable duplicate 0
3. 현재 P31 production 계약
   - 4탭 IA, public `/f` shell, source/personal/run/occurrence/export identity 유지
   - 보관/복구/영구 삭제 의미 분리 유지
   - persistence schema migration 없음
   - 자동·브라우저 evidence는 실제 사용자 검증이 아님

입력 자료 위치:

- Claude Design ZIP: `D:\flowme2605\flow-mvp\claude_work\FlowMe P31 구조 검토 요청.zip`
- Codex local review package: `D:\flowme2605\flow-p31-independent-review-main\docs\content-audit\2026-07-24-flowme-p31-independent-my-flow-review-codex`
- current production: <https://flowme2605.vercel.app>

앞의 두 자료는 이번 계획 작성 시 읽은 외부 local evidence다. 이 spec folder에 복사하거나 현재 production evidence로 재분류하지 않았다.

## 두 검토가 다른 곳

| 항목 | Claude Design | Codex 최신 실측 | P32 처리 |
| --- | --- | --- | --- |
| 20개 Flow 열기 | 4단계 추정 | 2단계 실측 | 목록 구조는 유지하고 회귀만 감시 |
| 같은 Item 실행 행동 중복 | 2건 추정 | 0건 실측 | 결함으로 단정하지 않고 P32-01에서 재측정 |
| 항목 수정 | 4단계 추정 | 6단계 실측 | 3단계 이내로 줄이는 확정 과제 |
| whole export | 4단계 추정 | 6단계 실측 | 3단계 이내로 줄이는 확정 과제 |
| `지금` 탭 | 제거 제안 | cross-Flow queue 역할 유지 근거 | 유지안/제거안 비교 후 승인 |
| 1024 overflow | 시각상 의심 | 실측 0 | 현재 0을 기준선으로 재검증 |

## 권장 실행 순서

```text
P32-01 근거·route·B안 정합성 게이트
-> P32-02 focused workspace 수직 검증
-> P32-03 빠른 항목 수정
-> P32-04 Flow 기준일 재조정
-> P32-05 export와 lifecycle 명령 통합
-> P32-06 여섯 콘텐츠 형태 rollout
-> P32-07 continuity·accessibility·24-cell 최종 gate
```

P32-OPS는 Next 15.5.21의 하위 PostCSS를 이미 사용하는 8.5.16으로 통일해 닫았다. `npm audit fix --force`나 Next downgrade는 적용하지 않았다.

## 확정된 결정

- B1을 채택하고 B2 `continue strip`은 기각했다. B2는 여러 Flow를 가로지르는 `지금` 질문을 잃는다.
- 닫힌 `/f/real-mofa-overseas-travel-prep`를 재공개하지 않는다.
- public `travel-packing-list`는 undated checklist/resource 검증에 사용한다.
- mixed date/check/resource는 fixture-only `overseas-travel-d14`로 검증하고 public 사용자 여정은 `blocked`로 표시한다.
- rollback은 UI composition 범위다. persistence migration이나 reverse migration은 없다.

## 비범위

- 4탭 IA 변경
- Home, Flow 찾기, Calendar 전체 재설계
- heavy planner 기능
- account, DB, cloud sync
- AI API, crawler, OAuth
- source/personal/run/occurrence/export 계약 재작성
- 실제 사용자 관찰을 자동화로 대체하는 주장
