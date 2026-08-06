# P1-01 시각 감산 증거

**상태:** `PASS — LOCAL INTERNAL EVIDENCE`

**범위:** Item 상세, Flow Map, 시작일의 반복 surface·heading·echo만 감산한다. state, storage, Map migration, completion, warning, source, completion criterion은 바꾸지 않는다.

**기준:** `codex/p35-production-mobile-p0` · `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 local working tree · strict re-audit build `XMbvE5wM3RginexHtEnDx`

**실제 관찰 사용자:** `0명`

## 1. 삭제·유지·이동 inventory

| 영역 | 삭제 | 유지 | 이동·대체 |
|---|---|---|---|
| Item 상세 | 파란 `실행할 일` heading, 독립 blue action-soft shell | 제목, 일정, 출처, 완료 기준, 메모, Item 완료 | inline shell을 neutral surface token으로 통일; `할 일 수정`→`수정`; 완료만 primary 1개, 수정은 neutral secondary |
| Flow Map | `내 조건 / 저장 결과 / 전체` 3칸 grid | selected/applied/preview/saved identity와 count, 위험, source | CTA 근처 `선택 N / 전체 M` 한 줄 |
| 시작일 | input 바로 아래의 정상 날짜 반복 echo | 과거 날짜 경고, 가까운 일정 경고, 예시·날짜 없음 설명 | 정상 선택은 input과 실제 preview가 표현 |

새 설명 카드, storage key, migration, Map state, 실행 완료 의미는 추가하거나 바꾸지 않았다.

## 2. DOM·ARIA 계측

### Item 상세

| viewport | headings 전→후 | actions 전→후 | structural card/surface 전→후 | `실행할 일` 전→후 | ARIA lines 전→후 |
|---|---:|---:|---:|---:|---:|
| 390×844 | 1→1 | 6→6 | 4→4 | 1→0 | 5→4 |
| 1024×768 | 1→1 | 7→7 | 4→4 | 0→0 | 5→5 |
| 1440×1000 | 1→1 | 7→7 | 4→4 | 0→0 | 5→5 |

모든 viewport에서 Item 완료 control 1개를 유지했다. 기본 상세의 `data-default-primary-action-count`는 2→1이고, `수정`은 `data-action-priority="secondary"`와 공통 neutral secondary token을 사용한다. `visualSubtraction=off`에서는 legacy 값 2와 파란 수정 버튼을 복원한다.

### Flow Map

| viewport | headings 전→후 | actions 전→후 | structural card/surface 전→후 | 3칸 grid 전→후 | 선택 요약 전→후 | ARIA lines 전→후 |
|---|---:|---:|---:|---:|---:|---:|
| 390×844 | 3→3 | 23→23 | 5→4 | 1→0 | 0→1 | 38→32 |
| 1024×768 | 3→3 | 23→23 | 5→4 | 1→0 | 0→1 | 36→31 |
| 1440×1000 | 3→3 | 23→23 | 5→4 | 1→0 | 0→1 | 36→31 |

### 시작일

| viewport | headings 전→후 | actions 전→후 | structural card/surface 전→후 | 정상 success echo 전→후 | ARIA lines 전→후 |
|---|---:|---:|---:|---:|---:|
| 390×844 | 3→3 | 8→8 | 4→4 | 1→0 | 28→27 |
| 1024×768 | 3→3 | 8→8 | 4→4 | 1→0 | 30→29 |
| 1440×1000 | 3→3 | 8→8 | 4→4 | 1→0 | 30→29 |

`structural card/surface`는 E2E의 고정 selector `article, section, aside, [data-flow-ui], [data-flow-anatomy], [data-testid$="-card"]`로 계측한다. 중복 selector match는 DOM node 하나로 센다. 실제 `ariaSnapshot()`의 viewport별 축약본은 [ARIA tree excerpts](./aria-tree-excerpts.md), 이름·역할과 focus 판정은 [ARIA summary](./aria-summary.md)에 고정했다.

## 3. before / after 캡처

`before`는 같은 current build의 독립 rollback `visualSubtraction=off`로 재현했다. 따라서 코드 버전·fixture·viewport 차이 없이 legacy presentation만 비교한다.

| 영역 | 390×844 | 1024×768 | 1440×1000 |
|---|---|---|---|
| Item before | [PNG](./before-item-390.png) | [PNG](./before-item-1024.png) | [PNG](./before-item-1440.png) |
| Item after | [PNG](./after-item-390.png) | [PNG](./after-item-1024.png) | [PNG](./after-item-1440.png) |
| Map before | [PNG](./before-map-390.png) | [PNG](./before-map-1024.png) | [PNG](./before-map-1440.png) |
| Map after | [PNG](./after-map-390.png) | [PNG](./after-map-1024.png) | [PNG](./after-map-1440.png) |
| Date before | [PNG](./before-date-390.png) | [PNG](./before-date-1024.png) | [PNG](./before-date-1440.png) |
| Date after | [PNG](./after-date-390.png) | [PNG](./after-date-1024.png) | [PNG](./after-date-1440.png) |

시각 점검 결과 390px Item bottom sheet는 중립 hierarchy와 완료→수정 순서를 유지하고, Map sticky CTA에는 `선택 8 / 전체 8`이 남으며, 정상 시작일에는 녹색 반복 echo가 없다. 1024·1440에서도 horizontal overflow와 sticky collision은 0이다.

## 4. 검증 ledger

| 검사 | 결과 | 증명 범위 |
|---|---|---|
| `p35-p1-visual-subtraction.spec.ts`, after strict re-audit | `5/5 PASS`, workers 1, retries 0, 17.8s | 3 viewport 감산, warning, DOM/ARIA/card count, 모바일 setupInput count, overflow, unnamed control, browser errors, rollback storage |
| 같은 spec, before strict re-audit | `5/5 PASS`, workers 1, retries 0, 16.5s | 같은 build에서 legacy presentation 재현 가능, 모바일 setupInput count 유지 |
| 영향 E2E 6 files | `20/20 PASS`, workers 2, retries 0, 44.1s | Map selected/applied/preview/saved·legacy, Item completion/memo, date intent, responsive editor/focus |
| focused unit/component | `15/15 PASS` | visual flag와 shared editor surface |
| full unit/workflow | `113/113 + 322/322 + 608/608 = 1,043/1,043 PASS` | current tree의 P35·storage·content 회귀 |
| production build | `PASS`, Next `15.5.21`, pages `18/18` | compile·production typecheck; build `byuhxEXNlARakYo1Dqjwi` |
| local runtime | `HTTP 200` on test-only port `3114` | built app smoke; production deploy 증거 아님 |

## 5. 보존·rollback 판정

- `visualSubtraction=off`만 legacy Item·Map·date presentation을 복원한다. 대소문자나 다른 값은 rollback으로 취급하지 않는다.
- public route에서 flag-on 상태의 storage snapshot과 flag-off 진입·입력 후 snapshot을 비교해 `localStorage`와 `sessionStorage` mutation `0`을 확인했다.
- Map 7/8 편집→Back→save failure rollback→retry→reload와 desktop 저장 parity가 `20/20` 회귀 안에서 유지된다.
- released `/flow-maps/moving-d30`은 canonical `/f/moving-d30-basic`으로 redirect되므로, 직접 접근 가능한 동일 `setupInput` 분기 `/flow-maps/curated-opic-mock-course`의 390px 날짜 삭제 상태에서 `선택 N / 전체 M · 시작일 필요`를 E2E로 재현했다. component test는 Q3 on/off 양쪽에서 같은 count 보존을 검사한다.
- Item 완료 기준·메모·일정·출처는 기존 P0 detail/payload 회귀와 full unit에서 유지된다.
- 과거 날짜와 가까운 일정 경고는 남고 정상 값의 반복만 제거됐다.

## 6. 경계

이 증거는 local 내부 QA다. Q3 용어·CTA·도움/주의 체계는 P1-02, 형식별 field round-trip은 P1-03, 극단값·최종 접근성 gate는 P1-04 소유다. commit·push·PR·CI·merge·Preview·Production은 수행하지 않았고 실제 사용자 관찰은 `0명`이다.
