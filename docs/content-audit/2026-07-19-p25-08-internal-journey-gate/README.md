# P25-08 Internal Six-Journey Gate

작성 시각: 2026-07-20 04:37 KST

검증 시작 baseline: `8b11c49` (`codex/p25-ux-foundation-plan`)

증거 성격: `current_command` + `current_browser` + `heuristic`
실제 관찰 사용자: `0 / 15`

## 판정

P25-01~P25-07의 핵심 구조를 여섯 Flow 유형으로 다시 연결한 결과, 자동화 기준의 미해결 Blocking/High는 `0`이다. 첫 통합 캡처에서 1024px Calendar agenda 제목이 한 글자씩 꺾이는 High 시각 회귀를 발견했고, 반복 상태를 제목 아래 메타로 옮겨 수정한 뒤 관련 브라우저 시나리오를 재실행했다.

이 판정은 **내부 통합 gate 통과**다. 실제 사용자가 설명 없이 이해한다는 판정이나 외부 관찰 준비 완료 선언이 아니다. P25 화면은 owner/Claude Design review에 전달할 수 있지만, 관찰 사용자 모집은 계속 닫아 둔다.

## 여섯 대표 여정

| 유형 | 대표 fixture | 확인 범위 | 결과 |
| --- | --- | --- | --- |
| 기준일 역산형 | `moving-d30` | 저장 직후 전체 Flow, returning workspace, 완료·취소, wide detail | supported |
| 날짜 없는 체크형 | `travel-packing-list` + 개인 undated draft | 날짜 지정·제거, Calendar queue, ICS/list export | supported |
| 반복 루틴형 | `washer-tub-clean-monthly` | read-only preview, 저장, occurrence 완료·재개, Calendar/ICS | supported |
| 순서·날짜 혼합형 | 메모 기반 여행 준비 draft | 선택, 날짜 일괄 이동·제거, 선택 export, 제거·복구 | supported |
| 기록·메모형 | 이사 전 확인 메모 split draft | pre-save 수용, exact save count, 전체/선택 export, Calendar/undated 분리 | supported |
| 개인 초안형 | URL miss recurrence draft | add/edit, recurrence, occurrence done/reopen/skip/hold/resume, stable ICS UID | supported |

## 핵심 수치

- 대표 통합 시나리오: `9 / 9` 통과
- 관련 전체 회귀 묶음: `81 / 81` 통과
- 핵심 `flow-mvp` 추가 회귀: `8 / 8` 통과
- unit: `526 / 526` 통과
- docs check: 필수 문서 `14`, local link `2516` 통과
- production build: 통과
- 모바일/와이드 스크린샷: `36`
- 다운로드 검증 파일: `5`
- horizontal overflow: `0`
- console/page error: `0`
- completion/reopen 실패: `0`
- Calendar/ICS/list export count mismatch: `0`
- 실제 관찰 사용자: `0`

위 수치는 이 패키지 커밋 전에 현재 worktree에서 다시 실행한 결과다. `git diff --check`는 line-ending 경고만 출력했고 오류 없이 통과했다.

## 산출물

- [상세 감사](./audit.md)
- [브라우저/route marker](./route-evidence.json)
- [여정별 결과](./journey-results.json)
- [Claude Design 복붙 프롬프트](./prompt-ko.md)
- [시각 리뷰 보드](./review.html)
- [스크린샷](./screenshots/)
- [다운로드 검증물](./downloads/)

## Evidence 경계

- `current_command`: 이번 worktree에서 직접 실행한 build/test/docs 명령
- `current_browser`: 이번 worktree를 production mode로 띄운 Playwright와 캡처
- `prior_artifact`: P25-01~P25-07 문서는 비교 근거로만 사용
- `heuristic`: 캡처를 보고 수행한 정보 위계·가독성 판단
- `observed_user`: 없음. 자동화나 persona simulation을 이 범주로 계산하지 않음

## 남은 Medium

1. public routine preview의 설명은 이전보다 짧지만 여전히 두 줄 이상의 문장이다. 실제로 이해를 돕는지 owner review가 필요하다.
2. 1024px Calendar는 queue/grid/agenda 세 영역이 모두 작동하지만 agenda 제목은 긴 경우 2~3줄이다. 한 글자 세로 깨짐은 해소했으나 더 넓은 정보 밀도 선택은 후속 디자인 판단이다.
3. 개인 draft의 고급 반복 편집은 progressive disclosure 뒤에 있지만 전체 경로는 길다. 현재 기능 완전성은 확보됐고, 단축이 이해도에 도움이 되는지는 실제 관찰 없이는 확정하지 않는다.

## 다음 결정

Claude Design과 owner는 이 패키지에서 다음 중 하나를 선택한다.

- `keep`: P25 frame을 다음 internal refinement의 기준으로 유지
- `change`: 화면 구조·행동 위계에 구체 수정이 필요
- `defer`: 실제 사용자 관찰 전 판단하지 않을 항목

외부 관찰은 별도 명시적 결정 전까지 시작하지 않는다.
