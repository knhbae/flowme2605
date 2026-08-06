# P35 근본 UX Round 2 · 개발 인수 기준과 QA 매트릭스

| 항목 | 값 |
|---|---|
| 문서 상태 | `OWNER_APPROVED_LOCAL_HANDOFF` |
| 작업 성격 | B/B/B bounded fix의 승인된 인수 기준 · 구현/QA 완료 문서 아님 |
| 기준일 | 2026-08-03 |
| Owner 승인 | 2026-08-04 · `Q1-B / Q2-B / Q3-B` |
| 기준 구현 | `codex/p35-production-mobile-p0` · `91fb66a` |
| 관찰 사용자 | **0명** |
| 현재 Hard fail | **3개 재현** · 구현 후 재검증 필요 |
| 이 문서가 승인하는 것 | B/B/B 방향과 K1/K2 공통 계약. 실행 정본은 [active spec](../../specs/2026-08-04-p35-round2-bounded-ux-correction/README.md)이며 구현 결과는 아직 없음 |

## 1. 증거 경계

이 문서는 다음 자료를 하나의 개발 인수 기준으로 합친다.

- [공통 S01~S13 시나리오](../2026-08-03-p35-fundamental-ux-round2-handoff/05-simulation-scenarios-ko.md)
- [Codex 로컬 시뮬레이션 결과](../2026-08-03-p35-fundamental-ux-round2-results/codex/01-local-simulation-findings-ko.md)
- [Codex editor/projection 계약](../2026-08-03-p35-fundamental-ux-round2-results/codex/05-editor-projection-contract-ko.md)
- [Codex scorecard](../2026-08-03-p35-fundamental-ux-round2-results/codex/07-scorecard-ko.md)
- [현재 P35 제품·QA 경계](../../specs/2026-08-01-p35-production-mobile-convergence/spec.md)

다음 증거 유형은 서로 대신할 수 없다.

| 증거 유형 | 증명할 수 있는 것 | 증명할 수 없는 것 | 이 문서의 현재 상태 |
|---|---|---|---|
| 코드·단위/계약 테스트 | resolver, payload, storage, loss 선언, 결정적 상태 전이 | 실제 화면 이해, 모바일 가림, 초점 이동 | 일부 기존 근거 있음. 새 계약은 `TBD` |
| 브라우저 자동화 | 실제 DOM, Back/Escape, focus, viewport, 다운로드 payload | 처음 보는 사람의 이해·선호 | 기존 경로 일부 통과. 새 계약은 `TBD` |
| Codex 내부 시뮬레이션 | 실제 앱을 조작한 재현과 화면 상태 | 관찰 사용자 행동 | S01~S13 일부 재현. 사용자 검증 아님 |
| Claude 정적 검토 | 화면 캡처·구조·위계에 대한 독립 검토 | 실제 상호작용, 저장값, payload, Back 동작 | 기획 비교 근거. 실행 검증 아님 |
| Owner 피드백 | 문제 제기와 제품 우선순위 | 외부 사용자 행동 일반화 | 방향 입력. UXR 아님 |
| UXR 관찰 | 처음 보는 사용자의 예측·이해·과업 성공 | 코드 무결성·전체 회귀 | **0명. 미실행** |

자동 QA, 스크린샷, 내부 시뮬레이션, Claude 정적 검토를 `UXR 통과`로 표현하지 않는다. 사용자 이해가 필요한 항목은 구현과 내부 QA가 끝나도 `TBD`로 유지하고 실제 관찰을 별도 집계한다.

저장 성공 receipt는 별도 화면이 아니다. 저장 직후 선택 계획 상세에 한 번 보이는 `저장됨 · N개 · 되돌리기` 배너다. 반면 export receipt는 실제 파일/복사/전송 결과의 형식·범위·개수·버전·성공/실패를 기록하는 별도 결과 계약이다. 두 receipt를 같은 route나 같은 수명으로 구현하지 않는다.

## 2. 고정된 Owner 결정과 공통 계약

| ID | 구분 | 승인값 | 구현 기준 | 예외·미충족 처리 |
|---|---|---|---|---|
| Q1 | Owner 결정 · 내보내기 | **B 승인:** 저장본이 권위 있는 전송을 소유하고, 미수정·eligible·로컬 결과만 저장 없는 예외로 허용 | active spec의 strict eligibility와 S14 acceptance | 조건을 통과하지 못하면 저장 후 이동 |
| Q2 | Owner 결정 · `내 계획` | **B 승인:** 안정적인 저장 계획 library shell + compact Today + 저장 직후 selected plan deep-link | 현행 P35 일반 `/my` supersession과 rollback flag | 데이터 migration 없이 flag-off 회귀 보존 |
| Q3 | Owner 결정 · 용어 | **B 승인:** FLOW 브랜드·URL·내부 모델은 유지하고 핵심 사용자 화면에서 `계획`을 단계 적용 | route별 copy inventory와 단계 적용 | 실제 사용자 이해도는 별도 UXR |
| K1 | 공통 구현 계약 · editor | **승인:** 공개·저장 Plan/Item은 같은 transaction 문법과 전체 높이 surface를 쓰되 commit target은 구분 | active spec acceptance로 고정 | P0-01 state owner 확인 후 구현 |
| K2 | 공통 구현 계약 · 결과 | **승인:** 주 결과 1개 + 실제 가능한 보조 최대 2개 + 조건부 + 불가 이유 | eligibility와 손실 선언을 한 projection contract에서 계산 | P0-01 fixture/loss schema 선행 |

Legacy Map은 HF-01 parity와 기존 편집 계약만 bounded하게 보존한다. 일반 Flow와 같은 editor로 흡수하는 migration은 이번 K1에 포함하지 않는다. `Flow`/`계획`의 실제 이해도는 Q3와 별개로 사용자 검증 항목이며, 관찰 사용자 0명인 현재 `이해됨`으로 승인하지 않는다.

## 3. Hard fail 3개 인수 기준

| ID | 현재 재현 | 구현 경계 | 필수 인수 기준 | 최소 QA | 종료 판정 |
|---|---|---|---|---|---|
| HF-01 | Flow Map에서 7개로 적용해도 main preview는 8개와 원래 제목 유지 | 기존 Map route·save mode·storage schema를 유지하는 bounded parity 수정 | applied title·selected IDs·count가 main preview, CTA, saved snapshot, persistence record에서 동일. Apply 전 storage 불변. Cancel/Escape/Back은 원래 8개로 복원 | Map contract unit + `save_all` 모바일 E2E + payload/storage assertion | 모든 consumer가 7개/새 제목을 읽고 legacy fixture가 무손실일 때 `PASS` |
| HF-02 | 저장 Item 체크리스트가 `완료 기준과 확인 항목`을 약속하지만 payload에는 완료 기준 없음 | 완료 기준을 직렬화하거나 안내 약속을 제거. memo·Item 완료 포함 여부는 별도 명시 | UI 안내와 clipboard text가 같은 필드 계약을 가짐. 빈 값, 긴 한글, 줄바꿈, checked subcheck를 동일 fixture로 검사 | builder golden test + 실제 clipboard E2E + 한글 payload 비교 | 안내와 실제 결과가 일치할 때 `PASS` |
| HF-03 | 편집·내보내기의 primary owner가 공개/저장, Flow/Item, Map의 여러 깊이에 중복 | entry point를 무조건 하나로 줄이는 작업이 아니라 capability×lifecycle×scope별 primary owner를 하나로 정의 | 각 capability의 primary owner 1개. 허용된 secondary shortcut은 scope·source state·commit target을 말함. 같은 generator 의미와 receipt를 공유. 중복 CTA가 같은 visual priority로 경쟁하지 않음 | action-owner contract test + DOM action count + public/saved/Item/Map 연속 E2E + 5초 UXR 과업 | 구현 QA 후에도 **UXR 없이 이해도 `O` 금지**. 구조 중복 0과 사용자 예측을 분리 판정 |

## 4. S01~S13 개발 인수 매트릭스

`필수 자동 QA`와 `필수 사람 검토`를 모두 적는다. 아직 구현하지 않은 목표는 모두 `TBD`다.

| 시나리오 | 개발 인수 기준 | 필수 자동 QA | 필수 내부/정적 검토 | 별도 UXR 과업 |
|---|---|---|---|---|
| S01 첫 방문 5초 이해 | 저장 전 상태, 결과 종류·개수, primary 행동 1개가 첫 viewport에 보임. 편집·행 수정·export는 secondary hierarchy | 390×844 action count, first viewport, state label, overflow/console/page error | Codex 실제 route 조작 + Claude 위계 비교 | 5초 뒤 무엇을 몇 개 얻고 primary 클릭 뒤 무슨 일이 생기는지 설명 |
| S02 기준일 전이 | 미선택·예시·custom·undated·변경·삭제·과거/잘못된 날짜를 구분. input echo 제거. preview/save banner/export receipt/artifact 날짜 일치 | date-intent unit, 세 저장 경로 E2E, invalid/past recovery, payload parity | 모바일·wide에서 날짜 확인 위치가 한 곳인지 검토 | echo 없이 변경 결과를 찾고 저장 결과를 예측 |
| S03 공개 Flow 편집 | Flow 이름, 기준일/모드, 포함, 순서, Item 제목·상세·날짜가 한 transaction. Apply 전 source/persisted state 불변. child→parent 계층 명확 | Apply 1회/Cancel 0회, dirty/clean, validation/runtime error, nested Back/Escape/close, exact focus return, reload storage assertion | 24·50 Item에서 sheet 길이·sticky action·긴 한글 검토 | `이 조정 적용`과 최종 계획 저장의 차이를 설명 |
| S04 결과 형식 | calendar/checklist/memo/sheet는 실제 eligibility가 있을 때만 표시. Todo는 내부 lens로 분리. title/order/date/memo/completion/source와 omitted fields를 포맷별 선언 | format-loss golden matrix, undated ICS 제외, routine 축약, public/saved/Item payload 비교, unsupported 0 output | 보조 형식이 primary를 압도하지 않는지, 손실 안내가 행동 옆인지 검토 | 왜 이 형식이 보이고 다른 형식이 빠졌는지 설명 |
| S05 저장·인계 배너 | 저장 전/후가 구분되고 실제 저장 shape·개수·날짜가 선택 계획 상세의 1회 배너와 일치. existing saved Flow는 overwrite/copy/cancel 전 명시적 선택. save failure는 기존 상태 보존 | success/failure/reload, duplicate save, double submit, localStorage write failure, save→selected plan+banner, same URL 재진입 | 배너에 저장 결과와 다음 행동 하나, source/personal 관계가 보이는지 검토 | 방금 저장한 계획과 원본 미리보기의 차이를 설명 |
| S06 저장 전·후 export | saved transfer는 version/hash, scope, format, count, omitted, one-way가 persistent export receipt와 payload에 일치. public quick은 preview/artifact/session-only 확인만 일치하고 persistent receipt/history write 0 | clipboard 성공/fallback/실패, file 생성 실패, retry, pending lock, double click, undated/partial scope, changed-snapshot·quick no-write test | 같은 화면에서 오류·제외·재시도 정보가 과밀하지 않은지 검토 | 어느 버전을 어디로 몇 개 보냈고 자동 sync인지 설명 |
| S07 `내 Flow` 0·1·5·20개 | Q2-B 승인 후: 저장 직후 selected plan, 일반 `/my`는 안정적인 library shell. Today는 있을 때만 compact 파생 요약이며 no-today/next/undated, 완료·보관 lifecycle을 분리 | 0·1 dated·1 undated·5·20 fixtures, completed/archived/no-today, ordering, query/scroll/Back, reload, flag-off current P35 | 390·1440에서 first action과 library 회수 가능성 검토 | 오늘 할 일과 저장한 원본 계획의 관계를 설명 |
| S08 저장 Flow 전체 편집 | D4/K1 승인 계약: public과 같은 field order/transaction grammar. persisted save와 public Apply 용어 구분. dirty close/back/error에서 원상 보존 | mobile/wide editor, dirty discard, validation/storage error, Back/Escape/backdrop, focus return, 24·50 Item, no nav overlap | 기존 내용과 편집 상태가 섞이지 않는지 비교 | 변경 저장 전에 무엇이 아직 저장되지 않았는지 설명 |
| S09 Item 상세·완료 | Item 수정·메모·일정·완료/다시 열기·단일 export의 owner가 명확. completion은 execution action 하나. private note/source correction은 일반 export에서 제외 | row/detail completion sync, reopen, memo round-trip/privacy, Item export golden, HF-02, deep-link close/back | blue surface·중복 heading·Flow export와 Item export hierarchy 검토 | `완료`를 저장/닫기가 아니라 실행 상태로 이해 |
| S10 Flow Map | HF-01 parity와 legacy 계약 동시 보존. `save_all`, `choose_child`, `review_hold`를 각각 유지. Map-level export 없음 | title/selection parity, multi-Flow save, existing bridge records, personalCopy, `needs_choice`/conflict, risk/source, failure/Back/focus | 3칸 요약 감산 뒤 선택/전체 정보가 CTA 근처에 남는지 검토 | 선택 7/전체 8과 저장 결과를 예측 |
| S11 도움·주의·접근성 | 삭제/결정 inline/progressive help/항상 보이는 주의/receipt 등급을 적용. 안전·영구손실은 닫힌 help 안에 숨기지 않음 | accessible name, 44×44, keyboard, screen reader relation, Escape/focus return, error announcement | Claude 정적 정보 위계 + Codex 실제 keyboard/viewport | help를 열지 않고 운동 중단 조건을 찾음 |
| S12 용어와 CTA | Apply, 저장, export, 완료, 다시 열기가 각각 한 lifecycle 뜻. 첫 노출은 결과 언어 우선 | 금지 copy 정적 검사 후보 + route별 CTA snapshot | Owner/Claude copy review. 사용자 발화로 위장하지 않음 | Flow 정의가 아니라 CTA 클릭 결과를 설명 |
| S13 극단값·회귀 | 1·50 Item, 긴 한글 제목/메모/출처, mixed dated/undated, repeat/one-off, 일부 format, legacy/손상 record에서 정체성·성능·복구 유지 | 50 Item fixture, long Korean, mixed schedule, malformed/old storage, overflow, console/page/failed request, build/full regression | 390×844·1440×1000 실제 화면과 긴 문장 clipping 검토 | 극단값 UXR은 대표 흐름 통과 후 별도 표본으로 계획 |

## 5. 공통 상태 전이 매트릭스

### 5.1 편집

| 상태/행동 | 기대 상태 전이 | 데이터 불변식 | 필수 QA |
|---|---|---|---|
| open | source + current personal overlay로 clean draft 생성 | source/persisted bytes 불변 | unit + open/focus E2E |
| edit | dirty draft | 다른 편집 종류의 draft 보존 | state unit |
| child Item apply | parent draft만 갱신 | persisted state 불변 | nested E2E |
| parent Apply/Save 성공 | public applied 또는 saved persisted version 1회 갱신 | 중복 write/이중 version 증가 없음 | unit + storage/payload E2E |
| validation error | editor와 dirty draft 유지 | persisted state 불변 | injected error E2E, first error focus |
| runtime/storage error | editor와 dirty draft 유지, 재시도 가능 | 부분 저장·기존 상태 손실 없음 | injected failure + retry |
| explicit Cancel | Owner가 정한 규칙에 따라 즉시 discard 또는 confirm | 원래 applied/persisted 상태 복원 | dirty/clean 각각 E2E |
| close/backdrop/Escape/Back | 가장 안쪽 transaction만 닫음. dirty면 계속 수정/버리기 | parent draft와 진입 전 surface 보존 | 모바일·wide history/focus E2E |
| reload/leave | guard 대상과 비대상을 계약에 명시 | 저장되지 않은 draft가 저장본처럼 복구되지 않음 | beforeunload/storage test |

### 5.2 저장·내보내기·중복

| 경우 | 기대 결과 | 금지 결과 | 필수 QA |
|---|---|---|---|
| 저장 성공 | saved identity, 실제 shape/count/date, direct next action | 예시 날짜 저장, 중복 Flow 자동 생성 | payload + reload E2E |
| 저장 실패 | 기존 personal/execution state 유지, 오류와 재시도 | partial item/map record, 성공 save banner | storage failure injection |
| 이미 저장됨 | 개인본 보기/원본 보기, overwrite/copy/cancel 선택 | title/order/latest timestamp 기반 자동 merge | canonical+legacy fixture |
| export 성공 | source state/version/scope/format/count/omitted/one-way receipt | 자동 sync처럼 표현 | receipt/payload golden |
| export 실패 | output 0, pending 해제, 같은 범위 재시도 | 성공 개수 표시, draft/저장본 변경 | clipboard/file failure E2E |
| 반복 export | local copy/download 정책과 connected destination idempotency를 분리 | 모든 반복을 자동 중복 방지로 간주 | local repeated-click contract |
| 날짜 없음 | calendar 제외 수와 가능한 다른 형식 표시 | 빈 calendar 정상 성공 | unit + UI E2E |
| routine | recurring 1개로 축약되는 제목·메모·순서·완료 손실 사전 고지 | 일반 Item parity 주장 | format notice + ICS golden |

### 5.3 뒤로가기와 복귀

| 진입 | Back/닫기 기대 | 보존해야 할 것 |
|---|---|---|
| public → Flow editor → Item editor | 1회: Item만 닫고 parent draft 유지. 2회: Flow editor 종료 규칙 적용 | 원래 preview, scroll, 정확한 opener focus |
| public → export sheet | export sheet만 닫음 | public working overlay와 anchor |
| save success → selected plan + 1회 배너 | route contract에 정한 이전 surface로 복귀 | source intent, 저장 identity, 중복 저장·배너 반복 방지 |
| library → selected Flow → Item | Item→selected Flow→이전 library query/scroll 순서 | filter, query, scroll, owning Flow context |
| Calendar/Today deep link → Item | Item만 닫고 진입 surface로 복귀 | exact occurrence/date identity |
| Map → editor | editor만 닫고 applied 또는 원래 selection으로 복귀 | save mode, title, selected IDs, focus |

## 6. Legacy·호환성 인수 기준

| 대상 | 반드시 보존 | 회귀 fixture |
|---|---|---|
| canonical + legacy Flow copy | stable identity, active-copy choice, personal/execution 값, 자동 merge 금지 | 두 copy 동시 존재·archive/restore |
| Map `save_all` | title, selected/excluded IDs, child Flow count, anchor, snapshot/persistence record | 8→7 적용·저장·reload |
| Map `choose_child` | child routing, editor/save-all 미노출 | 2 child link route |
| Map `review_hold` | 실행/편집/저장 미노출, direct source, 조건부 risk | sensitive/normal hold |
| Map recovery | `needs_choice`, conflict, personalCopy, 기존 bridge record | old/current record 조합 |
| mixed physical stores | 기존 key/schema와 private execution notes 보존 | backup/restore/upgrade/privacy |
| malformed/partial legacy | 안전한 fallback·복구 안내, 파괴적 자동 정리 금지 | parse error, missing child, partial map write |

Round 2의 bounded Map parity 수정과 장기적인 일반 projection adapter 전환을 한 티켓으로 합치지 않는다. adapter 전환은 위 모든 legacy fixture가 먼저 고정된 별도 migration spec이 필요하다.

## 7. Viewport·콘텐츠 극단값 매트릭스

| 조건 | 인수 기준 | 자동/수동 확인 |
|---|---|---|
| 390×844 | fixed CTA/nav가 내용·오류·editor action을 가리지 않음. 가로 overflow 0 | Playwright + 실제 캡처 |
| 1440×1000 | mobile과 동일한 state/commit 결과. wide inspector의 focus/Back 계약 명시 | Playwright + 실제 캡처 |
| 1024 중간폭 | breakpoint 전후 action 소유권과 sticky layer 중복 없음 | targeted responsive E2E |
| 50 Item | initial render, edit, reorder/select, export scope가 사용할 수 있고 긴 sheet에서 action 접근 가능 | fixture + 성능 budget + E2E |
| 긴 한글 | 제목·메모·출처·오류·receipt가 clipping/겹침 없이 줄바꿈 | deterministic long-Korean fixture |
| mixed date/repeat | dated/undated, all-day/timed, repeat/one-off의 eligibility와 정렬이 안정적 | projection/export golden |
| 일부 형식만 지원 | unavailable format은 정상 결과처럼 보이지 않고 이유·대안 표시 | eligibility unit + UI assertion |

성능 budget의 수치는 구현 spec에서 확정한다. 수치가 정해지기 전에는 `빠름` 또는 `성능 통과`로 판정하지 않는다.

## 8. QA 실행 책임과 판정

| 단계 | 책임 | 산출물 | 현재 판정 |
|---|---|---|---|
| 계약 고정 | Owner + 기획 | Q1~Q3 결정, K1~K2 계약, scope/non-goal, superseded decision | `APPROVED_LOCAL_HANDOFF` · canonical 연결은 active spec gate |
| 구현 단위 QA | 개발 | unit/contract, golden payload, storage invariant | `TBD` |
| 실제 상호작용 QA | Codex/QA | Playwright, 390/wide, Back/focus/error, console/network | `TBD` |
| 정적 독립 검토 | Claude Design | 위계·과밀·copy·정적 접근성 반례 | `TBD` |
| 내부 통합 시뮬레이션 | Codex + 기획 | S01~S13 재실행, current/target 차이 | `TBD` |
| UXR | 실제 참여자 | 첫 5초, 버전·결과 예측, Flow 용어, safety 발견 | **0명 · 미실행** |

구현 PR에서 최소한 다음 검증을 현재 source에 맞게 실행하고 pass/fail/skip을 기록한다.

```powershell
npm.cmd run test:p35-p0
npm.cmd test
npm.cmd run build
npx.cmd playwright test <affected-specs> --workers=1
npm.cmd run test:e2e -- --workers=4
npm.cmd run docs:check
git diff --check
```

기존 `40/40`, `33/33`, `413/413` 결과는 당시 계약의 회귀 근거다. 새 Round 2 acceptance를 assertion하지 않는 한 새 구현의 통과 증거로 재사용하지 않는다.

## 9. 최종 Gate

다음이 모두 충족돼야 내부 구현 gate를 통과한다.

- Q1-B/Q2-B/Q3-B, K1~K2 계약과 non-goal이 durable decision 및 active spec에 기록됨
- HF-01~HF-03이 새 acceptance로 재실행되어 `PASS`
- S01~S13에서 구현 대상은 `O`, 미구현·미검증은 숨기지 않고 `TBD`
- save/export/editor의 success, empty, pending, validation error, runtime error, retry, duplicate, cancel, Back 상태가 검증됨
- legacy Flow/Map/storage fixture에서 안정 ID와 개인·실행 값 손실 0
- 390×844, 1024 중간폭, 1440×1000에서 overflow/overlap 0
- long Korean, 50 Item, mixed date/repeat, partial-support 회귀 통과
- console error, page error, failed request 0 또는 승인된 예외 목록
- local edit, commit, push, PR, merge, Preview, Production 상태를 각각 기록
- 관찰 사용자 수를 자동 QA와 분리해 표시

내부 gate가 통과해도 UXR은 자동으로 통과하지 않는다. 현재 관찰 사용자는 **0명**이며, U10과 처음 보는 사용자의 이해도는 실제 관찰 전까지 `TBD`다. Production 출시 여부는 이 문서가 아니라 Owner의 별도 결정이다.
