# P26-19 Six Content-Shape Journey Gate

작성일: 2026-07-20 KST

검증 baseline: `bb2f10b326d03ceb6ce512632bd3ed5df84c94c3`

증거 성격: `current_command` + `current_browser` + `current_screenshot` + `heuristic`
실제 관찰 사용자: `0`

## 판정

P26-01~18의 계약을 여섯 콘텐츠 유형으로 다시 연결한 현재 브라우저 게이트는 통과했다. 대표 시나리오 `7 / 7`, 현재 구조로 이관한 P24 실행 신뢰 회귀 `15 / 15`, screenshot `34`, ICS download `6`이며 자동 판정 Blocking/High는 `0`이다.

이 결과는 내부 통합 검증이다. 자동화와 화면 heuristic을 실제 사용자가 이해했다는 증거로 계산하지 않는다. P26-20은 전체 suite, release audit, PR/merge/deploy와 production smoke를 별도로 수행해야 한다.

## 여섯 유형

| 유형 | 대표 fixture | 현재 확인 범위 | 결과 |
| --- | --- | --- | --- |
| 기준일 역산형 | `moving-d30` | 저장 receipt, 전체 Flow, 완료·다시 열기, wide outline/detail | supported |
| 날짜 없는 체크형 | `vehicle-inspection-prep` | 날짜 없이 시작, Calendar 보관함, 1·3개 배치, 날짜 제거 undo, ICS | supported |
| 반복 루틴형 | `washer-tub-clean-monthly` | public preview, series/occurrence 분리, 완료·다시 열기, RRULE/UID | supported |
| 순서·날짜 혼합형 | 여행 준비 memo draft | 구조 편집, 순서, 2개 날짜 이동·undo, 선택 export, 삭제·복구 | supported |
| 기록·메모형 | 제주 여행 memo split | 5개 분할, 합치기·나누기·제외·순서, 4개 저장/export | supported |
| 개인 초안형 | URL miss recurring draft | add/edit, recurrence, done/reopen/skip/hold/resume, stable ICS UID | supported |

## 핵심 수치

- representative current-browser tests: `7 / 7`
- migrated P24 execution-trust regressions: `15 / 15`
- screenshots: `34`
- downloads: `6`
- horizontal overflow assertions: `0`
- console/page errors: `0`
- completion/reopen failures: `0`
- Calendar/ICS identity or count mismatch: `0`
- unit: pretest `13 / 13`, full `564 / 564`
- docs check: required files `14`, local links `2,683`
- production build: static pages `18 / 18`
- dependency audit: high/critical `0`, moderate `2`
- observed-user sessions: `0`

## 디자인 대조

로컬의 `D:\flowme2605\flow-mvp\docs\content-audit\2026-07-19-flow-content-usage-preview-ko.html`을 `prior_design_artifact`로 읽었다. 이 파일의 좋은 부분은 다음 세 가지다.

1. 원문/source rail과 실행 항목을 분리한다.
2. 필요한 입력 하나와 결과 preview를 가까이 둔다.
3. 같은 Flow가 Calendar/checklist/sheet/memo에서 어떻게 달라지는지 destination별로 보여준다.

현재 P26은 post-save 전체 Flow, memo 분할 editor, unified export receipt에서 이 원칙을 상당 부분 흡수했다. 다만 모바일 batch editor와 recurring occurrence detail은 기능 수가 화면 밀도로 드러나며, wide Calendar의 undated tray는 긴 제목을 생략한다. 이 둘은 기능 정확성 문제가 아니라 P27 후보 Medium이다.

## 산출물

- [상세 감사](./audit.md)
- [route marker](./route-evidence.json)
- [여정 결과](./journey-results.json)
- [현재 명령 결과](./journey-command-results.json)
- [시각 리뷰 보드](./review.html)
- [스크린샷](./screenshots/)
- [ICS 다운로드](./downloads/)

## 재실행

```powershell
npm.cmd run audit:p26:journeys
```

이 명령은 이전 screenshot을 지우고 여섯 유형의 현재 브라우저 evidence를 다시 만든다. 실제 사용자 세션을 만들거나 production을 검증하지 않는다.

## 현재 명령 검증

P26-19 변경 상태에서 `npm.cmd test`, `npm.cmd run docs:check`, `npm.cmd run build`, `npm.cmd run security:audit`를 직접 실행했다. 새로 공개된 `brace-expansion` high advisory는 `minimatch` 메이저별 호환 패치(`1.1.16`, `2.1.2`)로 고정해 high/critical을 `0`으로 내렸다. Next 내부 PostCSS advisory `2`건은 moderate이며, 자동 수정이 Next의 파괴적 downgrade를 제안하므로 강제 수정하지 않고 P26-20 잔여 위험으로 기록한다.

## 다음

P26-20에서 전체 unit/docs/build/E2E/security gate, final review package, commit/push/PR/merge, Vercel production deploy와 smoke를 수행한다. Medium 시각 잔여는 release blocker로 과장하지 않고 final package의 후속 backlog에 유지한다.
