# FlowMe MECE UX Reset — claude_design 응답

`response-template-ko.md` 순서를 따른다. 확인하지 못한 항목은 생략하지 않고 `inaccessible`로 남긴다.

## 1. Execution metadata

```yaml
reviewerRole: claude_design
reviewDate: 2026-07-26
localWorktree: inaccessible          # D:\flowme2605\flow-current-main 접근 불가
localBranch: inaccessible
localHead: inaccessible
originMain: inaccessible             # commit sha를 확인할 수단이 없어 추정하지 않음
branchInspected: codex/flowme-mece-ux-reset-design-handoff
resolvedTreeRef: 319f379a918f        # tree hash이며 commit sha가 아님
productionUrl: https://flowme2605.vercel.app
productionCheckedAt: 2026-07-26T00:33Z
observedUserCount: 0
appCodeChanged: false
commitPushPrMergeDeploy: false
```

## 2. Overall verdict

**`bounded_revision`**

Codex의 소유권 방향(찾기 → 공개 Flow → 저장 결과 → 개인 Flow, My Flow는 목록, Calendar는 날짜 렌즈)은 유지한다. production을 직접 확인한 결과 실제 결함은 “탭이 4개”가 아니라 **한 화면이 여러 질문에 동시에 답하는 composition**이었고 — 공개 Flow의 결정 표면 5개, `/my` 카드의 경쟁 primary 4개, Calendar 행의 command 3개 — 그 문제는 Codex 안으로 대부분 닫힌다. 다만 Codex 안은 두 곳에서 덜어냄을 **사용자 비용으로 지불**한다: 재방문 진입(홈 제거 후 발견 화면 착지)과 하루에 여러 번 일어나는 유일한 동작인 완료(Calendar에서 3탭). 두 surface만 수정하면 MECE를 깨지 않고 비용을 회수할 수 있으므로 구조 재개봉(`alternative_structure_required`)이 아니라 bounded revision이다. 데이터 계약은 한 줄도 다시 쓰지 않는다.

### 세 결정

| Decision | Verdict | 선택 구조 | 감수할 대가 | Evidence |
| --- | --- | --- | --- | --- |
| Home 제거 및 Flow 찾기 통합 | **revise** | 홈 route·활용 예시 제거, nav 3탭. `/`는 고정 alias가 아니라 entry router(저장>0 → `/my`, 0 → `/flows`) | 진입 화면이 상태에 따라 달라지고 skeleton 한 프레임이 생긴다. QA 경로 2개 | current_production_interaction |
| My Flow library-only | **keep** | 목록·검색·필터·lifecycle 진입만. 행 = 열기 하나 + 읽기 전용 다음 예정 1줄 | 재방문자가 오늘 할 일을 보려면 1탭 더. 날짜 없는 Flow는 Calendar에 없으므로 그 한 줄이 유일한 요약 | current_package_screenshot |
| Calendar lens-only | **revise** | 날짜 lens + 완료 토글 1개(row primitive)만. 메모·날짜 옮기기·제목 수정·undated tray 제거 | “Calendar는 아무것도 바꾸지 않는다”는 단순 규칙을 잃는다. 문법 조항으로 고정해야 부식하지 않는다 | current_package_screenshot · reference_pattern |

## 3. Findings

[audit.md](./audit.md) — Blocking 0 · High 2 · Medium 6 · Low 3.
High: 공개 Flow 첫 viewport의 결정 표면 5개(CD-H-1), 최소 입력이 primary action 아래(CD-H-2).

## 4. A/B/C decision matrix

[decision-matrix.json](./decision-matrix.json) · review.html 하단 표.
권장 조합 = **A′**: 모든 surface에 A를 적용하고, `/` 진입과 Calendar 완료 두 지점만 C.
B 탈락 이유 — 소유권 중복 3개가 남아 이번 지시의 목표(MECE한 기능 소유권)를 달성하지 못한다.

## 5. 15-cell journey scorecard

[journey-scorecard.json](./journey-scorecard.json) — supported 3 · partial 12 · hidden 0 · missing 0 · blocked 0 / proposed pass 11 · revise 4 · fail 0.
revise 4건은 전부 Session C이며 **설계 결함이 아니라 검증 공백**이다(라이브 export 실행과 reload persistence를 실행하지 못함).

## 6. Complexity comparison

[decision-matrix.json](./decision-matrix.json)의 `complexityMetrics`. 요약:

| Surface | visible command | 경쟁 primary | 설명 block |
| --- | --- | --- | --- |
| Flow 찾기 | 9 → 3 | 2 → 1 | 2 → 0 |
| 공개 Flow | 13 → 4 | 2 → 1 | 3 → 1 |
| 저장 결과 | 4 → 2 | 1 → 1 | 1 → 0 |
| My Flow | 11 → 5 | 4 → 1 | 1 → 0 |
| 개인 Flow | 12 → 6 | 3 → 1 | 1 → 0 |
| Calendar | 행당 3 → 행당 1 | 3 → 1 | 0 → 1(날짜 없는 항목 안내) |
| 가져가기 | 6 → 8 | 4 → 1 | 1 → 1 |

가져가기만 visible command가 늘었다 — 범위 3개를 명시적으로 노출했기 때문이며 경쟁 primary는 4 → 1이다.

## 7. Screen message contract

[screen-message-contract.json](./screen-message-contract.json) — 10개 surface 전부.

## 8. IA tree와 continuity map

[ia-tree.md](./ia-tree.md).

## 9. Current vs proposed wireframes

[review.html](./review.html)에서 단계 1~8 × 사례 5 × viewport 3으로 나란히 본다.
왼쪽은 production screenshot과 측정값, 오른쪽은 조작 가능한 제안 화면이다.
current/proposed 설명은 제품 화면 바깥의 review chrome(어두운 배경)에만 둔다.
정적 캡처는 [screenshots/](./screenshots/).

## 10. Interaction grammar

[interaction-grammar.md](./interaction-grammar.md) — Flow · Item · series · occurrence · export scope · lifecycle 전부와 파괴성 계층 5단계.

## 11. Content renderer와 progressive disclosure

[content-renderer-rules.md](./content-renderer-rules.md) · [progressive-disclosure-matrix.json](./progressive-disclosure-matrix.json).

## 12. Visual system

[visual-system.md](./visual-system.md) — [P]polish와 [C]composition을 분리 표기.

## 13. Accessibility / responsive / recovery

[accessibility-recovery-audit.md](./accessibility-recovery-audit.md).

## 14. Reference pattern

[reference-pattern-matrix.md](./reference-pattern-matrix.md) — 10개 제품 패턴, 적용 5 · 변형 필요 4 · 적용 금지 1.

## 15. Implementation handoff

[implementation-handoff.md](./implementation-handoff.md) — slice 7개.
순차 `S1 → S2 → S4`, 병렬 `S3 · S5 · S6 · S7`, data gate 없음.

## 16. 실제 사용자에게만 물을 수 있는 질문 (7개)

1. 재방문 사용자는 첫 화면에서 “저장 목록”과 “오늘 할 일” 중 무엇을 기대하는가.
2. Calendar에서 완료를 그 자리에서 하려 하는가, 아니면 Flow를 열어 확인하고 완료하는가.
3. 저장 전 “예시 날짜” 상태로 시작을 누르는 일이 실제로 일어나는가.
4. 20~60개 varied-name Flow에서 검색 전에 무엇을 근거로 스캔하는가(제목 / 다음 예정 / 개수).
5. 날짜 제거를 삭제로 오해하는가.
6. 반복 Flow에서 “종료”와 “보관” 중 무엇을 기대하는가.
7. 개인 메모 Flow를 다시 여는 실제 이유는 무엇인가(실행 / 편집 / 기록 확인).

## 17. Verification and publish state

- **prototype browser QA**: 390 / 1024 / 1440 전환, 단계 1~8 이동과 뒤로, 사례 5종 전환, 이사일 변경에 따른 24개 날짜 재계산, 저장 이름 변경, 포함·제외와 개수 갱신, receipt 개수·날짜 범위 갱신, 항목 선택과 제목·날짜·메모 수정, 완료/같은 자리 다시 열기, 달력 날짜 선택과 agenda 갱신, 달력에서 같은 Flow 열기, 반복 요약과 이번 회차 구분, export 범위별 개수와 형식별 손실 안내, 비활성 형식의 이유 표기, undo 토스트 — 모두 동작. 가로 overflow·고정 요소 겹침·텍스트 겹침 없음.
- **current production inspection**: `/`, `/f/moving-d30-basic`, `/f/curated-allblanc-morning-workout` 라이브 응답 확인. `/flows`는 서버 응답이 로딩 상태만 반환.
- **current source**: `app/f/[slug]/page.tsx`, `lib/flow/real-content-pilot-flows.ts`, `lib/flow/source-backed-my-flow.ts`.
- **current package screenshot**: handoff `current-*.png` 7종.
- **local artifact files**: 이 폴더 15개 파일 + `screenshots/`.
- **inaccessible**: 로컬 worktree와 SHA, `/flows`·`/my`·`/calendar` 라이브 hydration 클릭, reload persistence, 실제 export 실행, 스크린리더·200% zoom 실측.
- **app code changed**: false · **commit/push/PR/merge/deploy**: 모두 false · **observed-user count**: 0

이 QA는 실제 사용자 검증이 아니다.

## 18. Final summary

1. **남길 구조** — 3단계 흐름(찾기 → 공개 Flow → 저장 결과 → 개인 Flow), 개인 Flow의 단독 소유, Calendar의 날짜 lens 성격, 현재 receipt, 데이터 계약 전부.
2. **지울 UI** — 홈 route와 활용 예시, 공개 Flow의 요약 chip 3개·결과 형태 토글, `/my` 카드의 4버튼과 Today mode, Calendar의 inline 메모·날짜 옮기기·제목 수정·undated tray와 cell의 잘린 제목, 가져가기의 형식 우선 배치.
3. **조정할 구조** — `/`를 entry router로, 최소 입력을 시작과 같은 영역으로, 조정을 한 번에 한 종류로, 개인 Flow에 다음 하나 승격, Calendar에 완료 토글만 남기고 row primitive로 정의, 가져가기를 scope-first로.
4. **구현 전에 승인할 세 결정** — (a) `/` 목적지를 상태로 고를 것인가, (b) Calendar에 완료 토글 1개를 남길 것인가, (c) My Flow 행의 다음 예정 한 줄을 읽기 전용으로 유지할 것인가.
5. **첫 vertical slice와 rollback** — `S1 · /` entry router + 3탭. rollback은 flag 하나로 고정 `/flows` 복귀이며, 새 surface를 만들지 않으므로 되돌릴 화면이 없다.
