# P23-00 FlowMe 실행 라이프사이클 완전성 감사

**작성일:** 2026-07-13

**감사 기준:** `main@5ffe5ff` + 현재 dirty worktree

**앱 변경:** 없음

**현재 실행 evidence:** 이 패키지의 14개 screenshot, `capture-observations.json`, 이번 turn의 targeted 검증

**이전 artifact:** 배경 자료로만 사용하며 현재 실행 결과로 합산하지 않음

## 결론

FlowMe는 **발견 → 전체 저장 → 개인 값 수정 → 실행/완료 → 완료 취소 → Calendar/파일 projection → 완료 회고 → 다시 쓰기**의 뼈대가 있다. 그러나 “내 Flow를 내 방식으로 재구성한다”는 완전한 실행 라이프사이클은 아직 아니다.

가장 큰 빈칸은 다음 세 가지다.

1. 개인 항목 **추가·삭제·삭제 복구·순서 변경**이 없다.
2. 날짜 없는 체크리스트 항목에 **선택적으로 날짜를 붙이는 경로**가 없다.
3. 완료·건너뜀·제외와 각 export의 포함 정책이 **하나의 effective Item resolver**로 통일되지 않았다.

## 판정 수치

| 판정 | 수 | 의미 |
| --- | ---: | --- |
| supported | 9 | 기능과 경로가 현재 사용자 표면에서 확인됨 |
| hidden | 7 | 동작하지만 상세/설정 안에 숨어 있음 |
| partial | 11 | Flow 유형·저장 경로·destination에 따라 다름 |
| missing | 5 | 일반 사용자 경로에 기능/정책이 없음 |
| blocked | 2 | canonical runtime/persistence 결정 선행 필요 |

자세한 행은 [capability-matrix.json](./capability-matrix.json)을 본다.

## 가장 중요한 현재 판정

- **완료 취소:** `supported`. 같은 체크박스를 다시 누르면 미완료로 돌아간다.
- **Flow 전체 기준일 재수정:** `partial`. URL draft/personal copy에는 있으나 Flow Map에서 바로 저장한 source-backed 이사 Flow에는 같은 설정 입구가 보이지 않았다.
- **날짜 없는 항목에 날짜 추가:** `missing`. 여행 체크리스트 상세 편집에는 날짜 input이 없다.
- **항목 추가/삭제/복구/순서 변경:** `missing`.
- **My Flow/Calendar/export 개인 별칭·날짜·메모 반영:** dated personal overlay에서는 `supported`, 전체 Flow 유형 기준으로는 `partial`.
- **완료 Flow 재사용:** `supported`. 이전 run snapshot과 새 run 분리는 존재한다.
- **원본 업데이트 + 개인 구조 변경 병합:** `blocked`. canonical contract는 승인됐지만 runtime structural overlay가 없다.

## 패키지 구성

- [audit.md](./audit.md): 사용자 여정과 우선순위 판정
- [review.html](./review.html): 이해관계자용 단일 HTML 보드
- [capability-matrix.json](./capability-matrix.json): supported/hidden/partial/missing/blocked 정본
- [state-transition-matrix.json](./state-transition-matrix.json): 상태 전이와 소유권
- [export-projection-matrix.json](./export-projection-matrix.json): Calendar/checklist/sheet/memo 포함 정책
- [scenario-evidence.json](./scenario-evidence.json): 6개 Flow 유형 + 완료/재사용 시나리오
- [capture-observations.json](./capture-observations.json): 현재 브라우저 자동 캡처 원자료
- [prompt-ko.md](./prompt-ko.md): Claude Design 검토용 복붙 프롬프트
- [screenshots/](./screenshots/): 모바일 390px 11장, wide 1024px 3장
- [capture script](../../../scripts/content-audit/capture-flowme-p23-lifecycle-review.mjs): 재현용 Playwright 캡처

## Evidence 경계

- screenshot 14개 모두 현재 local runtime에서 생성했다.
- 14개 모두 horizontal overflow 0, console error 0으로 기록됐다.
- 브라우저 자동화는 실제 사용자 관찰이 아니다.
- P22 이전 package의 pass 수치는 이번 검증 결과에 포함하지 않는다.
- 현재 worktree는 감사 시작 전부터 dirty 상태였고, 이 package와 capture script만 이번 감사 범위다.

## P23 권장 실행 순서

1. **P23-01 개인 구조 overlay:** stable item ID, user item, tombstone, restore, order override.
2. **P23-02 선택적 일정:** undated ↔ dated, time/repeat, source date 복귀와 날짜 없음 분리.
3. **P23-03 실행 상태 의미:** done/reopen/skip/exclude/held, routine occurrence와 Flow 종료 분리.
4. **P23-04 unified projection:** My Flow/Calendar/export가 같은 effective Item list를 읽게 함.
5. **P23-05 재사용·업데이트·기록:** three-way merge, orphan 보존, 과거 run 상세/재-export.

## 검증

최종 실행 결과는 이 파일 하단과 `audit.md`에 갱신한다.

- lifecycle capture: PASS, 14 screenshots
- JSON parse: PASS
- unit tests: PASS, `437/437`
- URL-first draft targeted E2E: PASS, `1/1`
- lifecycle targeted E2E: PASS, `7/7`
- public share/workbench regression E2E: PASS, `44/44`
- `npm.cmd run docs:check`: PASS, 14 required files / 2,094 local links
- `npm.cmd run build`: PASS
- HTML 390/1024 browser inspection: PASS, horizontal overflow 0 / broken image 0 / console error 0
- `git diff --check`: PASS (기존 worktree의 LF→CRLF 경고만 있음)
