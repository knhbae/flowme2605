# Claude Design P10 실행 계획

작성일: 2026-07-06  
기준 repo: `D:\flowme2605\flow-mvp`  
기준 branch: `codex/flowme-uxui-second-loop`  
Claude 원문: `claude_work/FlowMe UXUI 전체 검토8.zip` 안의 `FlowMe UX 재검토 P9 마감 (P10 백로그).dc.html`  
현재 evidence: `docs/content-audit/2026-07-06-claude-design-p10-final-review-package/`

## 목적

이 문서는 Claude Design P10 백로그를 한 번에 개발하기 위한 작업 지시서가 아니라, 이후 작업을 안전하게 단계별 `/goal`로 실행하기 위한 실행 계획이다.

이번 문서는 처음 작성 당시 앱 UI, 테스트 코드, seed/source-backed 데이터, 저장/실행/export 스키마를 수정하지 않고 P10을 단계별 `/goal`로 쪼개기 위한 실행 계획이었다. 이후 P10-01부터 P10-07까지 순차 처리했고, 현재 마감 감사 기준은 최신 P10 final review package다.

## 현재 P10 상태 요약

| ID | 우선순위 | 상태 | 요약 | 기준 근거 |
| --- | --- | --- | --- | --- |
| P10-01 | High | 완료 | evidence capture가 `lib/flow/user-surface-guardrails.ts` 정본을 사용하도록 단일화 | `1349fec Unify user surface guardrail capture rules` |
| P10-02 | High | 완료 | 공개 `/f/[slug]` workbench 저장/setup primary path가 focusable/visible/evidence에 잡히도록 정리 | `706b67f`, `29b04f9` |
| P10-03 | Medium | 완료 | My Flow `지금 이어하기` 카드가 행동 없는 설명 카드처럼 보이지 않게 정리 | `971757a Fix My Flow continuation summary copy` |
| P10-04 | Medium | 완료 | `/calendar` 같은 날 agenda에서 반복 칩을 날짜 그룹 헤더로 올려 밀도 정리 | `6fa1f45 Refine calendar agenda group metadata` |
| P10-05 | Low | 완료 | restart 일정 행과 My Flow 시트의 반복 컨트롤 라벨을 `편집`/`열기` 중심으로 축소 | `bf8d485 Tighten repeated control labels` |
| P10-06 | Low | 완료 | P9/P10 package GitHub link base의 `/flow-mvp` 중복/404 리스크 제거 | `1349fec` 및 P9 package 링크 확인 |
| P10-07 | Low | 완료 | visible input value까지 raw ISO 스캔 범위를 확장하고 restart date input 표기/면제 기준 결정 | `24a7760 Track input ISO values in evidence guardrails` |

항목 누락 점검: Claude Design P10 원문에서 확인된 P10 항목은 `P10-01`부터 `P10-07`까지 7개다. 현재 마감 기준에서는 7개 모두 완료 상태이며, 최신 evidence package는 P11 백로그 산출 요청용이다.

## 유지해야 할 기준선

- 4탭 IA는 유지한다: `홈 / Flow 찾기 / 캘린더 / 내 Flow`.
- 공개 `/f/[slug]`는 공유 shell로 유지한다. 4탭 shell로 강제 편입하지 않는다.
- 공개 `/f/[slug]` 저장 전 화면에서 `내 Flow에 저장` 또는 입력/setup path가 primary다.
- `콘텐츠 더 보기`는 접근 가능하되 primary 뒤의 보조 탐색이다. 보이는 링크를 `aria-hidden` 또는 `tabIndex=-1`로 숨기지 않는다.
- 저장 후 사용자는 `/my` 실행 허브로 이어진다.
- My Flow는 `오늘 할 일`, `지난 할 일`, `다음 할 일`, 날짜 없는 `먼저 할 일` 기준을 유지한다.
- My Flow overdue 사용자 라벨은 `지난 할 일`로 유지한다.
- 사용자 route guardrail hit 0 기준을 유지한다: 내부어, source slug, trailing `Flow`, 구조형 `...지도`, raw ISO, 첫 할 일 반복, 좌우 overflow.
- `/restart/moving-d30`는 prototype bucket으로 분리한다. 정상 4탭 route로 승격하지 않는다.
- restart prototype gate는 raw ISO, raw route slug, 영문 요일/월/동사, mixed export language, duplicate export entry hit 0을 유지한다.
- field checklist/workbench row detail은 반복 source link를 행마다 보여주지 않는다.
- 홈 추천은 소수 큐레이션으로 유지하고 설명형 페이지로 되돌리지 않는다.
- seed/source-backed 데이터 구조, 저장/실행/export 스키마, `sourceUrl/sourceTrace/detail/memo` 데이터는 바꾸지 않는다.
- 기존 `data-testid`는 가능하면 유지하고, 필요한 경우 추가만 한다.

## 한 번에 처리할지, 단계별로 처리할지

권장: 단계별 처리.

이유:

- P10-03은 My Flow continuation 카드의 행동성 문제다. 큐 dedupe, 첫 할 일 제목 반복 guardrail, 저장 직후 상태를 함께 봐야 한다.
- P10-04는 Calendar agenda grouping 문제다. 월간 캘린더와 선택일 agenda의 DOM/시각 위계가 영향을 받는다.
- P10-05는 restart와 My Flow sheet 컨트롤 라벨 밀도 문제다. 접근 가능한 이름과 보이는 라벨을 분리해야 하므로 a11y 회귀 위험이 있다.
- P10-07은 capture/guardrail pipeline 문제다. input value를 visible text bucket에 넣을지, date input의 raw ISO를 명시 면제할지 판단이 필요하다.
- 각 항목은 표면과 검증 지표가 달라 한 커밋에 묶으면 원인 판별과 Claude 재검토가 어려워진다.

예외:

- P10-05와 P10-07은 둘 다 `/restart/moving-d30` evidence를 다시 만들 수 있으므로, P10-05 수정 후 P10-07 evidence 작업을 이어서 실행할 수 있다. 그래도 커밋은 분리하는 것이 낫다.

## 권장 실행 순서

1. P10-03: My Flow `지금 이어하기` 카드 행동성 정리
2. P10-04: Calendar 같은 날 agenda 그룹 칩 정리
3. P10-05: 반복 컨트롤 라벨 축소
4. P10-07: input value raw ISO 스캔/decision 정리
5. P10 마감 package 생성: 최신 P10 evidence와 Claude Design P11 요청 프롬프트 작성

P10-01, P10-02, P10-06은 완료 상태이므로 재작업하지 않는다. 다만 남은 항목 검증 때 해당 기준선이 깨지지 않는지 회귀 확인한다.

## P10-01 완료 기록

상태: 완료

목표:

- `user-surface-guardrails.ts`를 guardrail 규칙의 정본으로 만들고, capture script가 예전 정규식 사본을 쓰지 않게 한다.
- GitHub link base의 `/flow-mvp` 하드코딩 오류도 evidence pipeline에서 정리한다.

핵심 문제:

- lib의 source slug punctuation guardrail은 닫혔지만, capture script 안에 P9-04 이전 lookahead가 남아 evidence가 옛 규칙으로 측정될 수 있었다.
- 첫 할 일 반복 검사도 capture script와 lib 사이에 drift가 생길 수 있었다.
- README/audit/review package 링크 base가 실제 GitHub repository path와 어긋날 수 있었다.

구현 범위:

- `lib/flow/user-surface-guardrails.ts` 정본 사용.
- `scripts/content-audit/capture-claude-p7-final-review-package.mjs`에서 Node/lib 계산 중심으로 정리.
- P9 package GitHub links base 정리.
- helper/unit/data guardrail 기준 유지.

건드리면 안 되는 기준선:

- guardrail 완화 금지.
- source URL/sourceTrace/detail/memo 삭제 금지.
- 앱 UI 변경 금지.

필요한 검증:

- `npm.cmd test`
- `npm.cmd run docs:check`
- `npm.cmd run build`
- capture script 재실행
- normal route guardrail hit 0
- restart prototype guardrail hit 0

예상 수정 파일:

- 완료됨: `lib/flow/user-surface-guardrails.ts`
- 완료됨: `scripts/content-audit/capture-claude-p7-final-review-package.mjs`
- 완료됨: `lib/flow/display-title.test.ts`
- 완료됨: P9 final review package README/audit/review/evidence

의존 항목:

- P9-01, P9-04, P9-07

권장 실행 순서:

- 완료 항목이다. 남은 P10에서는 재오픈하지 말고 회귀 검증만 한다.

## P10-02 완료 기록

상태: 완료

목표:

- 공개 `/f/[slug]` workbench 저장 전 화면에서 `내 Flow에 저장` 또는 입력/setup path가 시각적으로도, keyboard/tab order와 evidence 측정에서도 primary path로 잡히게 한다.

핵심 문제:

- 입력 없는 workbench에서 저장/가져가기 컨트롤이 focusable primary path로 잡히지 않았다.
- fridge/washer setup 영역은 화면상 보였지만 `public-flow-primary-setup` 측정 기준에 잡히지 않았다.
- `primarySaveActionVisible`이 querySelector 존재 여부와 실제 visible/focusable 상태를 혼동할 수 있었다.

구현 범위:

- 입력 없는 workbench에 focusable 저장 path 보장.
- fridge/washer setup 영역에 primary path testid 추가.
- capture evidence가 primary visible/focusable 상태를 측정.
- `public-share-cta-order.spec.ts`를 6개 대표 route 기준으로 보강.

건드리면 안 되는 기준선:

- `콘텐츠 더 보기`는 접근 가능한 보조 링크로 유지.
- 보이는 링크를 `aria-hidden` 또는 `tabIndex=-1`로 숨기지 않는다.
- 공개 `/f/[slug]` 공유 shell 유지.

필요한 검증:

- `tests/e2e/public-share-cta-order.spec.ts`
- `tests/e2e/workbench-source-density.spec.ts`
- P9/P10 guardrail targeted E2E
- capture script 재실행
- `publicSharePrimaryPathFocusableCount = 9`
- `publicSharePrimaryPathVisibleCount = 9`
- `publicShareSecondaryBrowseBeforePrimaryCount = 0`

예상 수정 파일:

- 완료됨: `components/flow/AppClient.tsx`
- 완료됨: `scripts/content-audit/capture-claude-p7-final-review-package.mjs`
- 완료됨: `tests/e2e/public-share-cta-order.spec.ts`
- 완료됨: P9 final review package README/audit/review/evidence/screenshots

의존 항목:

- P9-02, P10-01

권장 실행 순서:

- 완료 항목이다. 남은 P10에서는 공개 share shell 회귀만 확인한다.

## P10-03 실행 계획

상태: 완료
우선순위: Medium
권장 순서: 1

목표:

- My Flow `/my`와 저장 직후 `/my?savedMap=...`에서 `지금 이어하기` 카드가 행동 없는 설명 카드처럼 보이지 않게 한다.
- 사용자는 카드 설명보다 실제 첫 할 일 제목과 `열기` 행동을 먼저 이해해야 한다.

핵심 문제:

- 오늘 일정이 없거나 queue 조건이 애매할 때 `지금 이어하기` 카드가 실제 row 없이 설명문만 렌더될 수 있다.
- “보여줍니다”라고 말하지만 실제 할 일을 보여주지 않으면 실행 앱 느낌이 약해진다.
- 실제 첫 할 일을 중복 렌더하면 P6/P7/P8에서 고정한 first task repetition guardrail을 깨뜨릴 수 있다.

구현 범위:

- `/my?savedMap=moving-d30`
- `/my?savedMap=middle-school-math-1`
- `/my` 다중 큐 상태
- `지금 이어하기` 카드가 비어 보이는 조건을 inventory한다.
- 정답 후보는 둘 중 하나다:
  - 실제 저장 콘텐츠의 첫 할 일을 행으로 렌더한다: 제목, 맥락, `열기`.
  - 위 큐와 중복될 경우 카드 자체를 생략하거나 한 줄 보조 텍스트로 낮춘다.
- 같은 첫 할 일 제목이 저장 패널, 섹션, 카드, 상세에서 과하게 반복되지 않게 한다.

건드리면 안 되는 기준선:

- My Flow 첫 실행 우선순위: 오늘 > 지난 > 다음 > 날짜 없는 먼저 할 일.
- `지난 할 일` 라벨 통일.
- firstTaskRepetitionHits 0.
- 날짜 있는/없는 콘텐츠 저장 후 빈 상태가 먼저 나오지 않아야 한다.
- 저장/완료/check/export 데이터 구조 변경 금지.

필요한 검증:

- 모바일 390px `/my?savedMap=moving-d30`
- 모바일 390px `/my?savedMap=middle-school-math-1`
- 모바일 390px `/my` 다중 큐 상태
- 행동 없는 `지금 이어하기` 설명 카드 0건
- firstTaskRepetitionHits 0 유지
- normal route guardrail hit 0 유지
- `npm.cmd test`
- `npm.cmd run docs:check`
- `npm.cmd run build`
- targeted Playwright E2E
- capture script 재실행 또는 P10 evidence 부분 재생성

예상 수정 파일:

- `components/flow/AppClient.tsx`
- `lib/flow/source-backed-my-flow.ts` 또는 queue helper가 실제 원인이면 최소 수정
- `tests/e2e/flow-mvp.spec.ts`
- 필요 시 `scripts/content-audit/capture-claude-p7-final-review-package.mjs`
- P10 evidence package

의존 항목:

- P10-01 완료
- P10-02 완료
- P8-03/P8-04 overdue label/status 기준

권장 실행 순서:

1. evidence로 비어 보이는 카드 조건을 재현한다.
2. 앱 버그인지 evidence/fixture 부족인지 판단한다.
3. 앱 버그면 카드 렌더 조건을 최소 수정한다.
4. first task repetition guardrail을 확인한다.
5. 모바일 screenshot/evidence를 갱신한다.

## P10-04 실행 계획

상태: 완료
우선순위: Medium
권장 순서: 2

목표:

- `/calendar` agenda에서 같은 날짜의 여러 행이 같은 `기준 D-30`, `큰 준비` 같은 칩을 반복하지 않게 한다.
- 공통 정보는 날짜 그룹 헤더로 올리고, 각 행은 실제 할 일 제목과 체크 행동을 먼저 보여준다.

핵심 문제:

- 같은 날 4행이 동일한 칩을 반복하면 agenda가 실행 목록보다 메타 정보 반복처럼 보인다.
- 헤더의 `4개 · 4개 남음`도 같은 숫자를 반복해 밀도를 높인다.

구현 범위:

- `/calendar` 저장 후 agenda-first 상태.
- 같은 selected day 안에서 모든 row가 공유하는 label/chip을 감지한다.
- 공유 chip은 날짜 헤더로 1회 승격한다.
- 행 내부에는 row별로 다른 값만 남긴다.
- count copy는 `4개 남음`처럼 한 번만 보이게 정리한다.
- `/restart/moving-d30`의 D-30 milestone group heading 패턴을 참고하되, 새 컴포넌트 대규모 추가는 피한다.

건드리면 안 되는 기준선:

- `/calendar`는 schedule-first route로 유지.
- 오늘이 비어 있으면 nearest future/overdue saved row를 선택하는 기준 유지.
- 월간 grid는 가볍게 유지하고 agenda가 실행 정보를 담당.
- Calendar scope/filter, detail open/close, routine/scheduled item 동작 유지.
- raw ISO 0, horizontal overflow 0.

필요한 검증:

- 모바일 390px `/calendar` after moving save
- 같은 날짜 agenda의 공유 chip 반복 0 또는 최소화
- `4개 남음`처럼 count 1회 표시
- Calendar agenda-first 기준 유지
- My Flow P10-03 회귀 확인
- normal route guardrail hit 0
- targeted Playwright E2E
- `npm.cmd test`
- `npm.cmd run docs:check`
- `npm.cmd run build`

예상 수정 파일:

- `components/flow/AppClient.tsx`
- 필요 시 `lib/flow/source-backed-my-flow.ts`
- `tests/e2e/flow-mvp.spec.ts`
- P10 evidence package

의존 항목:

- P10-03 완료 후 실행 권장.
- P8-03/P8-04 My Flow status label 기준.

권장 실행 순서:

1. P10-03 이후 Calendar 저장 상태를 재현한다.
2. 같은 날짜 row의 공통 chip 반복 조건을 확인한다.
3. 공통 chip을 group header로 올리는 최소 표시 로직을 적용한다.
4. agenda row와 detail open 동작을 검증한다.

## P10-05 실행 계획

상태: 완료
우선순위: Low
권장 순서: 3

목표:

- restart 일정 행과 My Flow sheet/overdue sheet에서 반복되는 긴 컨트롤 라벨을 줄인다.
- 보이는 버튼 라벨은 `편집`, `열기`처럼 짧게 만들고, screen reader용 접근 가능한 이름에는 전체 제목을 보존한다.

핵심 문제:

- `/restart/moving-d30` 일정 행에서 `[전체 제목] 편집`이 반복되면 제목이 행 안에서 다시 복제된다.
- My Flow 시트에서 파란 `항목 열기` 버튼이 여러 번 반복되면 primary action처럼 과하게 보인다.

구현 범위:

- `/restart/moving-d30` top/full schedule/source-export/bottom.
- `/my` overdue sheet 또는 `놓친 항목 정리` sheet.
- 보이는 라벨은 짧게 축소한다.
- `aria-label` 또는 accessible name에는 전체 제목과 행동을 보존한다.
- 터치 타깃 44px 이상을 유지한다.
- 반복 버튼은 secondary 위계로 낮춘다.

건드리면 안 되는 기준선:

- restart prototype bucket 유지.
- restart D-30 milestone group heading 유지.
- restart raw ISO/English/mixed export guardrail 0.
- My Flow first task repetition guardrail 0.
- 보이는 컨트롤을 접근성 트리에서 숨기지 않는다.

필요한 검증:

- 모바일 390px `/restart/moving-d30` 일정 목록과 최하단
- 모바일 390px `/my` overdue sheet
- 행 안 제목 텍스트 1회 중심
- 반복 primary 버튼 0 또는 감소
- accessible name에서 제목 보존
- targeted Playwright E2E
- `npm.cmd test`
- `npm.cmd run docs:check`
- `npm.cmd run build`

예상 수정 파일:

- `components/flow/MovingD30Restart.tsx`
- `components/flow/AppClient.tsx`
- `tests/e2e/flow-mvp.spec.ts`
- P10 evidence package

의존 항목:

- P10-03 완료 권장.
- P10-04와 직접 의존은 없지만 Calendar evidence 이후 실행하면 capture 충돌이 줄어든다.

권장 실행 순서:

1. restart와 My Flow sheet에서 반복 라벨 위치를 캡처한다.
2. 보이는 라벨과 accessible label을 분리한다.
3. 터치 타깃과 keyboard focus를 확인한다.
4. restart prototype guardrail을 재확인한다.

## P10-06 완료 기록

상태: 완료

목표:

- P9/P10 review package의 GitHub 링크가 실제 repository path에서 열리게 한다.

핵심 문제:

- package 생성 로직이 GitHub link base에 `/flow-mvp`를 중복으로 붙이면 README/audit source link가 404가 될 수 있었다.

구현 범위:

- package 생성 로직의 GitHub base를 repository root 기준으로 계산한다.
- package 파일 손 편집이 아니라 생성 로직에서 정리한다.

건드리면 안 되는 기준선:

- review package 경로와 screenshot/evidence 구조 유지.
- P9/P10 evidence summary 필드 유지.

필요한 검증:

- README/audit/review/prompt의 GitHub links path 확인.
- `lib/flow/display-title.test.ts`의 link base 회귀 테스트 확인.
- `npm.cmd test`
- `npm.cmd run docs:check`

예상 수정 파일:

- 완료됨: `scripts/content-audit/capture-claude-p7-final-review-package.mjs`
- 완료됨: `lib/flow/display-title.test.ts`
- 완료됨: P9 final review package README/audit/review/prompt

의존 항목:

- P10-01과 같은 evidence pipeline 작업.

권장 실행 순서:

- 완료 항목이다. P10 마감 package 생성 때 링크가 실제로 깨지지 않는지만 다시 확인한다.

## P10-07 실행 계획

상태: 완료
우선순위: Low
권장 순서: 4

목표:

- visible text뿐 아니라 사용자에게 보이는 input value까지 raw ISO 스캔 사각을 줄인다.
- `/restart/moving-d30` date input의 raw ISO 표기가 실제 문제인지, native date input의 기술/locale 표시로 면제할지 결정하고 evidence에 남긴다.

핵심 문제:

- 현재 스캔은 주로 `innerText`를 읽기 때문에 `input[type=date]` value의 `2026-06-27` 같은 값이 사각이 될 수 있다.
- headless browser locale에서 native date input이 raw ISO처럼 보일 수 있는데, 실제 사용자 화면과 스캔 정책을 분리해야 한다.

구현 범위:

- capture script에서 visible/focusable input value 수집 방식을 검토한다.
- 정상 user route와 `/restart` prototype bucket을 계속 분리한다.
- input value를 raw ISO bucket에 포함할지, native date input value를 명시 면제할지 결정한다.
- 면제한다면 audit/evidence에 이유를 명확히 남긴다.
- 보조 표시가 필요하면 native date input 옆에 사용자용 한글 날짜 라벨을 추가할지 검토한다.
- 커스텀 datepicker는 만들지 않는다.

건드리면 안 되는 기준선:

- 내부 ISO 값, 정렬, export payload 유지.
- native date input 유지.
- restart prototype bucket 유지.
- normal route raw ISO 0 유지.
- P10-01 guardrail 정본 단일화 유지.

필요한 검증:

- 모바일 390px `/restart/moving-d30` 상단
- restart input value scan 결과
- normal route raw ISO 0 유지
- restart prototype guardrail 0 유지 또는 명시 면제 기록
- capture script 재실행
- `npm.cmd test`
- `npm.cmd run docs:check`
- `npm.cmd run build`

예상 수정 파일:

- `scripts/content-audit/capture-claude-p7-final-review-package.mjs`
- 필요 시 `components/flow/MovingD30Restart.tsx`
- `lib/flow/user-surface-guardrails.ts` 또는 test only, 정책 판단에 따라
- `lib/flow/display-title.test.ts`
- P10 evidence package

의존 항목:

- P10-01 완료.
- P10-05 이후 실행 권장. 둘 다 restart evidence를 다시 만든다.

권장 실행 순서:

1. input value가 실제 screenshot에 raw ISO로 보이는지 재확인한다.
2. native date input의 visible value와 스캔 대상 정책을 분리한다.
3. guardrail/capture 정책을 적용하거나 면제 사유를 audit에 남긴다.
4. restart and normal route guardrail을 재확인한다.

## 단계별 `/goal` 후보

### 다음 권장 목표: P10-03

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P10 백로그의 P10-03을 해결한다. My Flow(`/my`) 저장 직후 화면과 Today/Now 영역에서 `지금 이어하기` 카드가 실제 첫 할 일 없이 설명문만 렌더되는 상태를 정리한다. 사용자는 설명 카드보다 실제 할 일 제목, 맥락, `열기` 행동을 먼저 이해해야 한다. P10-01/P10-02/P10-06 완료 기준선은 유지한다.

먼저 읽을 파일:
1. AGENTS.md
2. agent.md
3. docs/harness/README.md
4. docs/SERVICE_STRUCTURE.md
5. docs/content-audit/2026-07-06-claude-design-p10-execution-plan-ko.md
6. claude_work/FlowMe UXUI 전체 검토8.zip 안의 `FlowMe UX 재검토 P9 마감 (P10 백로그).dc.html`
7. components/flow/AppClient.tsx
8. lib/flow/source-backed-my-flow.ts
9. lib/flow/storage.ts
10. tests/e2e/flow-mvp.spec.ts

핵심 문제:
- P10 원문은 `/my` 저장 직후 및 다중 큐 evidence에서 `지금 이어하기` 카드가 행동 없는 설명 카드처럼 보일 수 있다고 지적했다.
- 오늘 일정이 없거나 queue 조건이 비어 있을 때 실제 첫 할 일 row가 없으면 실행 앱보다 안내 카드처럼 보인다.
- 실제 첫 할 일을 중복 렌더하면 first task repetition guardrail을 깨뜨릴 수 있다.

구현 원칙:
- 새 기능을 추가하지 않는다.
- 특정 콘텐츠 slug 전용 하드코딩을 만들지 않는다.
- 4탭 IA는 유지한다.
- 공개 `/f/[slug]` 공유 shell 기준은 유지한다.
- seed/source-backed 데이터 구조는 바꾸지 않는다.
- 저장/실행/export 스키마는 바꾸지 않는다.
- P4/P5/P6/P7/P8/P9/P10-01/P10-02/P10-06 기준선을 되돌리지 않는다.
- 설명을 늘리지 않고 카드 렌더 조건, 첫 할 일 row, 중복 제거로 해결한다.
- 사용자 화면에 review/audit/source-backed/Step/Item 같은 내부 문구를 다시 노출하지 않는다.

구현 범위:
1. `/my?savedMap=moving-d30`, `/my?savedMap=middle-school-math-1`, `/my` 다중 큐 상태를 inventory한다.
2. `지금 이어하기` 카드가 실제 actionable row 없이 설명만 보이는 조건을 재현한다.
3. 실제 첫 할 일이 있으면 제목+맥락+`열기` 행으로 렌더한다.
4. 위 큐와 같은 항목이 이미 보이면 카드 자체를 생략하거나 한 줄 보조 텍스트로 낮춘다.
5. firstTaskRepetitionHits 0 기준을 유지한다.

검증:
- 모바일 390px `/my?savedMap=moving-d30` 확인
- 모바일 390px `/my?savedMap=middle-school-math-1` 확인
- 모바일 390px `/my` 다중 큐 상태 확인
- 행동 없는 `지금 이어하기` 설명 카드 0건 확인
- 첫 할 일 제목 반복 0건 유지 확인
- 정상 사용자 route guardrail 0건 유지
- P10-02 public share CTA order 회귀 확인
- targeted Playwright E2E
- npm.cmd test
- npm.cmd run docs:check
- npm.cmd run build
- git diff --check
- 커밋 및 푸시

완료 기준:
- My Flow에서 `지금 이어하기`가 실제 실행 가능한 항목 또는 조용한 보조 상태로만 보인다.
- 사용자는 설명보다 실제 첫 할 일과 실행 버튼을 먼저 본다.
- 첫 할 일 제목 반복 guardrail이 깨지지 않는다.
- 기존 저장/실행/export 구조와 P4~P10-02/P10-06 기준선이 유지된다.
- 최종 응답에서 원인 판단, 수정 파일, 적용 방식, 모바일 확인 결과, 검증 결과, 커밋/푸시 상태, 남은 리스크를 요약한다.
```

### 이후 목표 후보: P10-04

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P10 백로그의 P10-04를 해결한다. `/calendar` agenda에서 같은 날짜의 여러 행이 동일한 `기준 D-30`, `큰 준비` 같은 칩을 반복하지 않게 하고, 공통 정보는 날짜 그룹 헤더로 1회만 보이게 정리한다. P10-03과 기존 P4~P10 기준선은 유지한다.

검증 핵심:
- 모바일 390px `/calendar` after save
- 같은 날짜 agenda row의 공통 chip 반복 감소
- count copy는 `4개 남음`처럼 1회 중심
- Calendar agenda-first와 My Flow first task guardrail 유지
- npm.cmd test / docs:check / build / git diff --check
```

### 이후 목표 후보: P10-05

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P10 백로그의 P10-05를 해결한다. `/restart/moving-d30` 일정 행과 My Flow 시트에서 반복되는 긴 컨트롤 라벨을 줄인다. 보이는 라벨은 `편집`, `열기`처럼 짧게 두고, aria-label에는 전체 제목과 행동을 보존한다. 터치 타깃과 접근성은 유지한다.

검증 핵심:
- 모바일 390px `/restart/moving-d30` 일정 목록/source-export/bottom
- 모바일 390px `/my` overdue sheet
- 행 안 제목 반복 감소
- accessible name에 제목 보존
- restart prototype guardrail 0건 유지
- npm.cmd test / docs:check / build / git diff --check
```

### 이후 목표 후보: P10-07

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P10 백로그의 P10-07을 해결한다. evidence/capture 스캔이 visible text뿐 아니라 사용자에게 보이는 input value 사각도 판단하도록 정리하고, `/restart/moving-d30` date input의 raw ISO 표기가 실제 사용자 문제인지 native input의 기술 값으로 명시 면제할지 결정한다.

검증 핵심:
- 모바일 390px `/restart/moving-d30` 상단/date input
- normal route raw ISO 0 유지
- restart prototype guardrail 0 유지 또는 명시 면제 기록
- capture script 재실행
- npm.cmd test / docs:check / build / git diff --check
```

## P10 마감 package 후보

P10-03/P10-04/P10-05/P10-07 처리 후 별도 목표로 진행한 마감 감사 항목이다.

```text
/goal
D:\flowme2605\flow-mvp 기준으로 진행해줘.

목표:
Claude Design P10 백로그 P10-01~P10-07 개선 루프를 마감 감사한다. 새 기능을 추가하지 않고, P10 guardrail 단일화, public share primary path, My Flow continuation, Calendar group header, 반복 컨트롤 라벨, GitHub link base, input value scan 기준선이 유지되는지 확인한 뒤 최신 P10 review package와 Claude Design P11 요청 프롬프트를 만든다.

검증 핵심:
- 모바일 390px route sanity check
- P10 관련 targeted Playwright E2E
- normal route guardrail 0건
- restart prototype guardrail 0건
- public share primary path focusable/visible 9건 유지
- P10 screenshots/evidence 재생성
- npm.cmd test / docs:check / build / git diff --check
```

## 이번 계획 문서 검증 체크리스트

- P10 항목: `P10-01`부터 `P10-07`까지 모두 포함.
- 완료 상태: `P10-01`, `P10-02`, `P10-03`, `P10-04`, `P10-05`, `P10-06`, `P10-07`.
- 남은 상태: 없음.
- 실제 실행 순서: P10-03 → P10-04 → P10-05 → P10-07 → P10 마감 package.
- 실행 방식: 한 번에 묶지 않고 단계별 `/goal`로 처리했으며, 마감 package에서 최신 evidence를 다시 생성함.
- 이 계획 문서 작성 자체에서는 앱 UI, 테스트 코드, seed/source-backed 데이터, 저장/실행/export 스키마를 수정하지 않았고, 이후 각 P10 항목은 별도 커밋으로 처리함.
