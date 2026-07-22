# FlowMe P30 Final Review Package

**판정:** `local_release_gate_passed_publish_pending`
**기준 baseline:** `origin/main` `3c7b59ed22c5c503f58ef4b538ede217e4eef8fd`
**구현 branch:** `codex/p30-evidence-gap-closure`
**검증일:** 2026-07-22
**실제 관찰 사용자:** 0명

P30은 P29의 source, personal overlay, execution run, occurrence, export identity 계약을 바꾸지 않고 독립 검토에서 남은 중첩 상태와 증거 공백을 닫았다.

```text
모바일 export를 가리는 fixed layer 제거
-> 본문을 persistent tabs보다 먼저 탐색
-> 긴 Flow는 필요한 조정만 펼침
-> My Flow는 다음 행동 1개를 우선
-> Calendar는 50+ Flow와 날짜 없는 일도 compact하게 관리
-> 반복 설정은 요약 후 필요한 필드만 표시
-> dead public composition만 제거하고 live legacy consumer는 명시적으로 보존
```

## P30 결과

| Slice | 결과 | 핵심 marker |
| --- | --- | --- |
| P30-01 | public/My Flow 모바일 export primary와 fixed layer 교차 0 | `P30-MOBILE-EXPORT-NO-FIXED-OVERLAP` |
| P30-02 | `/my`, `/calendar`에서 header -> workspace -> mobile tabs 순서 | `P30-MOBILE-WORKSPACE-FOCUS-ORDER` |
| P30-03 | 긴 Flow의 기본 row 수정 0, 항목 24개는 명시적 disclosure 뒤에 배치 | `P30-SAVE-BEFORE-SINGLE-DECISION`, `P30-LONG-FLOW-CONTEXTUAL-ADJUST` |
| P30-04 | My Flow detail primary 1, secondary 1, source/archive는 focus-returning menu | `P30-MY-FLOW-COMMAND-HIERARCHY` |
| P30-05 | 날짜 없는 일 10 -> 8 -> undo 10, 50+ scope, 5개 같은 날짜 full identity | `P30-CALENDAR-UNDATED-EVIDENCE`, `P30-CALENDAR-SCOPE-SCALE`, `P30-CALENDAR-COMPACT-IDENTITY` |
| P30-06 | 반복 summary의 advanced field 0, 다음 3회, `언제`/`언제 끝` 그룹 | `P30-ROUTINE-ADVANCED-DENSITY` |
| P30-07 | `/f` dead conditional 제거, live `/flow-maps` legacy consumer 1개 명시 보존 | `P30-LEGACY-COMPOSITION-ACTIVE` |
| P30-08 | 390/1024/1440 evidence와 전체 release gate | 이 패키지 |

## 현재 수치

- dependency install: `npm.cmd ci` pass
- docs check: `14` required files, `2,908` local links pass
- 단위 테스트: `584 / 584` pass
- production build: `18 / 18` routes pass
- P30 전용 Playwright: `12 / 12` pass
- affected P28/P29 Playwright: `20 / 20` pass
- 전체 Playwright: `304 / 304` pass, `--workers=2`
- screenshot: `17`장
- public export fixed CTA count: `0`
- public/My Flow export primary intersection area: `0`
- My Flow visible primary: `1`, secondary: `1`
- 긴 Flow 기본 row-level edit: `0`; 명시적으로 펼친 항목: `24`
- Calendar undated placement: `10 -> 8 -> undo 10`, stable ID 복구 `true`
- Calendar scope options: `62`, 2개 선택 meaningful interactions: `5`
- 같은 날짜 selected-day full Flow identity: `5`
- routine initial advanced field: `0`; next occurrence: `3`
- reviewed 390/1024/1440 horizontal overflow: `0`
- reviewed 1440 unnamed focusable: `0`
- reviewed console/page error: `0`
- observed-user validation: `false`

Merge, deployment, canonical production smoke 결과는 publish closeout에서 이 문서에 추가한다. 현재 수치는 이 branch의 current command/current browser 결과이며 production 결과로 표현하지 않는다.

## 바로 볼 파일

1. [review.html](./review.html): P30 판정과 주요 화면
2. [audit.md](./audit.md): slice별 변경과 잔여 위험
3. [route-evidence.json](./route-evidence.json): route·viewport·marker·수치
4. [journey-results.json](./journey-results.json): 대표 중첩 상태 여정
5. [screenshot-manifest.json](./screenshot-manifest.json): 17개 캡처 목록
6. [screenshots](./screenshots/): 390/1024/1440 current browser 캡처

## 남은 위험

- 자동화와 heuristic inspection만 완료했다. 사용자가 설명 없이 이해한다는 증거는 아니다.
- `/flow-maps/[map]`은 실제 active consumer라 legacy composition을 강제 삭제하지 않았다. P31 이전에 artifact-first 전환 설계가 필요하면 별도 slice로 다룬다.
- 50+ Calendar는 query-only deterministic fixture로 검증했다. 실제 계정/서버 동기화 scale 증거는 아니다.
- 루틴 설정은 화면 밀도만 정리했고 recurrence engine과 occurrence 계약은 바꾸지 않았다.
- 계정, cloud sync, AI/crawler, OAuth/direct sync는 P30 범위가 아니다.
