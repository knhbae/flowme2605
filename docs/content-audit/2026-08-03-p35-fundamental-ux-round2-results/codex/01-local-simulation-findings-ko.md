# P35 근본 UX Round 2 · 로컬 시뮬레이션 Findings

## 1. 실행 조건

| 항목 | 값 |
|---|---|
| worktree | `D:\flowme2605\flow-p35-production-mobile-p0` |
| branch / HEAD | `codex/p35-production-mobile-p0` / `91fb66a` |
| 앱 코드 기준 | `b215698`과 동일 |
| viewport | 390×844, 1440×1000 |
| 런타임 | Next.js local dev, Playwright CLI |
| 데이터 변경 | 격리된 브라우저 localStorage만 사용 |
| 앱 코드·카피·테스트 변경 | 없음 |
| 관찰 사용자 | 0명 |

첫 개발 서버는 이전 `.next`를 참조한 채 남아 있던 child process 때문에 route JS가 404가 됐습니다. 해당 프로세스를 종료하고 생성 캐시를 분리한 뒤 새 서버에서 hydration과 console error 0을 다시 확인했습니다. 이 환경 문제를 제품 결함으로 집계하지 않았습니다.

## 2. 종합 판정

| ID | 현재 판정 | 핵심 근거 |
|---|---|---|
| U01 내보내기 소유권 | `△` | 공개와 저장 Flow 모두 export를 소유하며, 각각 working snapshot과 persisted snapshot을 사용합니다. 버전·재내보내기 소유권은 화면에서 충분히 설명되지 않습니다. |
| U02 도움·주의 체계 | `X` | 중요한 운동 주의는 인라인이라 안전하지만, 공통 disclosure 등급과 도움말 contract는 없습니다. `?`·`!`는 일부 상세에서 정적 장식입니다. |
| U03 `내 Flow` IA | `△` | 0개와 저장 직후 1개 상태는 분리되어 있지만 일반 `/my`의 Today/라이브러리 관계와 5·20개 수동 근거가 부족합니다. |
| U04 Item 감산 | `X` | 파란 surface, `실행할 일`, `할 일 수정`을 그대로 재현했습니다. |
| U05 Flow Map 3칸 | `X` | `내 조건/저장 결과/전체`가 모두 남고, 7개 조정 후 메인 결과가 8개를 유지합니다. |
| U06 기준일 중복 | `X` | input의 `2030-09-01`과 `이사일: 9월 1일`이 바로 아래에서 반복됩니다. |
| U07 CTA·형식·이동 | `△` | 저장 CTA와 영수증은 결과 언어를 쓰지만 공개 export가 조건별 1~2개, 저장 export가 3+1개로 달라 동일 Item 계약을 예측하기 어렵습니다. |
| U08 편집 통일 | `X` | 공개는 전체 높이 sheet, 저장 Flow는 기존 내용 아래 인라인, 저장 Item은 중첩 sheet입니다. |
| U09 공개 상세 역할 | `X` | 미리보기·행 수정·Flow 편집·저장·저장 전 export가 한 화면에서 경쟁합니다. |
| U10 `Flow` 이해 | `TBD` | 주요 내비게이션과 CTA에 광범위하게 노출되며 처음 보는 사용자 관찰은 0건입니다. |

## 3. S01~S13 결과

| 시나리오 | 판정 | 관찰 | 증거 |
|---|---|---|---|
| S01 첫 방문 5초 이해 | `△` | `예시 일정·저장되지 않음`, 결과명·개수는 분명합니다. 그러나 Flow 편집, 저장 CTA 1~2개, 행별 수정, export가 동시에 보입니다. | [S01 초기](./screenshots/S01-01-empty-public-detail-390.png) |
| S02 기준일 전이 | `△` | 미선택→선택→변경→삭제는 즉시 결과에 반영됩니다. 과거 날짜도 저장 가능하되 24개 과거 일정 경고를 보여 줍니다. input echo는 중복입니다. | [선택](./screenshots/S02-01-anchor-selected-duplicate-390.png), [과거](./screenshots/S02-03-past-date-accepted-390.png), [삭제](./screenshots/S02-04-anchor-cleared-390.png) |
| S03 공개 Flow 편집 | `△` | 이름·포함·순서·Item 제목/상세/날짜가 한 세션에 들어갑니다. Flow description 필드는 없고, Item 저장 후 outer Apply가 disabled인 상태가 나타나 거래 계층이 직관적이지 않습니다. 부모 취소는 원상 복구했습니다. | [Flow editor](./screenshots/S03-01-public-flow-editor-390.png), [Item editor](./screenshots/S03-03-public-item-editor-390.png), [취소 복구](./screenshots/S03-04-item-edit-cancel-restored-390.png) |
| S04 결과 형식 | `△` | 날짜형·체크리스트형·routine이 서로 다른 기본 결과를 표시합니다. 공개 export에서는 날짜 없음 1개 형식, 날짜 있음 2개 형식만 보이지만 버튼 설명은 시트까지 약속합니다. 시트 generator는 있으나 현재 상태의 선택지에는 없어 진입 문구와 패널이 불일치합니다. | [체크리스트](./screenshots/S04-01-checklist-public-390.png), [routine](./screenshots/S04-02-routine-warning-public-390.png), [공개 export](./screenshots/S06-01-public-export-panel-390.png) |
| S05 저장·영수증 | `O` | 저장 전/후 label이 분리되고 `캘린더 24개를 저장했어요`와 다음 행동 하나가 표시됩니다. 같은 URL 재진입도 영수증을 유지해 중복 저장을 막습니다. 단, public detail로 돌아가는 길은 없습니다. | [저장 전](./screenshots/S05-01-before-save-390.png), [영수증](./screenshots/S05-02-save-receipt-390.png) |
| S06 저장 전·후 export | `△` | 공개는 working snapshot, 저장 화면은 persisted rows를 사용합니다. saved export는 범위·날짜 있음/없음·형식 수를 더 잘 설명하지만, exact version·단방향 복사·완료 상태 손실을 영수증에 남기지 않습니다. | [공개](./screenshots/S06-03-public-export-dated-390.png), [저장 후](./screenshots/S06-02-saved-export-panel-390.png) |
| S07 `내 Flow` 0·1·5·20개 | `△` | 0개에는 저장 라이브러리 empty와 Flow 찾기 CTA가 있고, 1개 selected Flow에는 다음 3개·진행률·접힌 전체 계획이 있습니다. 5·20개 fixture는 코드/E2E에서 확인했으나 이번 수동 fixture 재생은 timeout으로 완료하지 못했습니다. | [0개](./screenshots/S07-00-zero-flow-390.png), [1개 library](./screenshots/S07-03-one-flow-library-390.png), [1개 selected](./screenshots/S07-01-one-flow-direct-entry-390.png) |
| S08 저장 Flow 전체 편집 | `X` | `Flow 편집`이 전체 계획을 인라인으로 펼치고, 24개 batch 선택은 페이지 전체를 확장합니다. 모바일 하단 내비게이션이 일정 편집 버튼을 덮는 구간도 보입니다. 공개 editor와 필드/Apply 문법이 다릅니다. | [인라인 전체](./screenshots/S08-03-saved-flow-editor-inline-full-390.png), [batch](./screenshots/S08-04-saved-multi-item-editor-390.png) |
| S09 Item 상세·완료 | `△` | 메모·일정·수정·단일 export·완료가 한 Item에 모이고 dirty discard guard도 동작합니다. 그러나 파란 surface와 중복 heading이 크고 Flow 전체 export와 Item 1개 export가 가까운 깊이에 공존합니다. | [상세](./screenshots/S09-01-saved-item-detail-390.png), [editor](./screenshots/S09-02-saved-item-editor-390.png), [discard guard](./screenshots/S09-03-saved-item-discard-guard-390.png), [완료](./screenshots/S09-04-item-completed-390.png) |
| S10 Flow Map | `X` | 3칸 요약과 별도 editor가 남습니다. 제목을 바꾸고 1개를 제외한 뒤 CTA는 7개가 되지만 메인 preview와 상단 요약은 8개입니다. | [초기](./screenshots/S10-01-flow-map-public-390.png), [editor](./screenshots/S10-03-flow-map-editor-390.png), [parity gap](./screenshots/S10-04-flow-map-preview-parity-gap-390.png) |
| S11 도움·주의·접근성 | `△` | 건강 중단 조건은 인라인으로 보여 안전합니다. 공개/저장 sheet의 닫기·focus 복귀 contract는 테스트가 있습니다. 공통 help disclosure와 `?`/`!` interactive target 규칙은 없습니다. | [운동 주의](./screenshots/S04-02-routine-warning-public-390.png) |
| S12 용어·CTA | `△` | 저장, 다시 맞추기, 옮기기, 변경 저장은 결과를 말하며 `완료`는 Item 실행 상태에 주로 제한됩니다. 반면 `Flow`, `내 실행 공간`, `저장한 Flow`, `전체 Flow`가 정의 없이 반복됩니다. | [My Flow](./screenshots/S07-01-one-flow-direct-entry-390.png) |
| S13 극단값·회귀 | `TBD` | 1 Item routine, 24 Item Flow, 390/1440 overflow를 확인했습니다. 50 Item fixture와 매우 긴 한글·혼합 repeat/one-off의 수동 재생은 완료하지 못했습니다. | [1 Item](./screenshots/S04-02-routine-warning-public-390.png), [public 1440](./screenshots/S13-02-public-moving-1440.png), [My Flow 1440](./screenshots/S13-03-my-flow-1440.png) |

## 4. 재현된 Hard fail

### HF-01 · 같은 Item 수정값이 화면·결과마다 다름

- route: `/flow-maps/middle-school-math-1`
- 조작: 제목을 `중1 수학 1학기 핵심`으로 바꾸고 마지막 단원을 제외
- 작은 결과 문장과 CTA: 7개
- 메인 preview와 상단 3칸: 원래 제목, 8개
- 판정: **Hard fail**

### HF-02 · 화면이 약속한 완료 기준이 export에서 빠짐

- 저장 Item export 화면은 체크리스트가 `완료 기준과 확인 항목을 함께 옮깁니다`라고 안내합니다.
- 실제 저장 Item checklist builder는 완료 기준을 직렬화하지 않으며 단위 테스트도 현재 누락을 고정합니다.
- 화면 약속과 산출물이 직접 불일치하므로 손실 안내만으로 해결하지 않고, payload 또는 문구 계약을 일치시켜야 합니다.
- 판정: **Hard fail**

### HF-03 · 같은 행동의 기본 위치가 여러 깊이에 반복

- 편집: 공개 Flow/Item, 저장 Flow/Item, Flow Map에 서로 다른 surface와 commit 문법이 있습니다.
- 내보내기: 공개와 저장 화면, Flow 전체와 Item 상세가 각각 진입점을 가집니다.
- 기본 소유자가 하나가 아니므로 scorecard의 반복 행동 항목을 현재 `FAIL`로 판정합니다.
- 판정: **Hard fail**

## 5. 문제를 일으키는 공통 원인

| 원인 | 증상 |
|---|---|
| 같은 lifecycle에 여러 행동 소유자 | public과 saved export, Flow/Item 여러 edit depth |
| editor transaction 모델 분리 | 공개 outer Apply, 저장 Flow inline 즉시 반영, 저장 Item dirty guard |
| export 구현 분기 | 공개·저장·단일 Item이 서로 다른 generator를 사용해 completion/title/memo 손실이 다름 |
| legacy Flow Map 별도 projection | canonical Item을 UI에서 step으로 부르고 조정값이 메인 preview에 연결되지 않음 |
| Today와 library 관계 설명 부족 | Today가 저장 Flow의 파생인지 별도 저장소인지 알기 어려움 |
| 정보 등급 규칙 없음 | 같은 도움·주의가 static label, inline paragraph, disclosure group 등으로 분산 |

## 6. 우선순위

| 우선순위 | 작업 | 검증 |
|---|---|---|
| P0 | Flow Map preview를 applied selection/title에서 직접 만들기 | 8→7 조정 후 preview·CTA·save payload 모두 7 |
| P0 | 저장 Item checklist의 완료 기준 약속과 payload 일치 | 같은 fixture의 화면 문구와 다운로드 text 비교 |
| P0 | 편집·내보내기의 기본 소유 위치와 transaction grammar 통일 | public/saved·Flow/Item Apply/Cancel/Close/Back/error/focus matrix |
| P0 | export 버전·손실·단방향 copy 영수증 | 어느 snapshot을 어디에 몇 개 만들었고 무엇이 빠졌는지 확인 |
| P1 | My Flow 문맥형 IA | 0·1·5·20·완료·보관·오늘 없음 acceptance test |
| P1 | 공개 상세·중복 copy·파란 surface 감산 | 390px first-action 및 내용 가림 회귀 |
| P1 | 공개/저장 포맷 의미 통일 | title/order/date/memo/completion/source loss matrix |
| P1 | 도움·주의 네 등급 contract | 안전 문구 상시 노출과 도움말 focus/Back 회귀 |
