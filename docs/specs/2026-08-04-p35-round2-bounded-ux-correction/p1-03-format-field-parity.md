# P1-03 형식·필드 parity 근거

**상태:** `PASS — LOCAL INTERNAL EVIDENCE`

**기준:** `codex/p35-production-mobile-p0` · `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 dirty local working tree · 2026-08-05 KST

**대상:** 활성 saved transfer와 제한된 public quick의 Calendar/ICS, Checklist, Sheet/TSV, Memo

**비대상:** 다섯 번째 사용자 형식, remote provider, Text Authoring/creator 경로, destructive migration

이 문서는 [전체 프로그램의 P1-03](./full-program.md#20-p1-03--형식별-field-parity와-실제-artifact-보강)이 요구한 field-by-field 처리, golden fixture, loss-schema delta, omitted/held/unavailable 결과를 한곳에 고정한다. `preserved`는 값의 의미가 그대로 남는 경우, `transformed`는 목적 형식의 문법으로 바뀌는 경우, `manifest`는 payload가 아니라 확인·결과 기록에서 보존되는 경우를 뜻한다.

## 1. 사용자에게 약속하는 결과와 단위

- 하나의 effective Item 집합이 네 형식의 입력이다. 형식별로 별도 콘텐츠를 다시 그리거나 값을 발명하지 않는다.
- 활성 saved transfer의 `item`, `selected`, `flow` 범위는 모두 `buildSavedTransferArtifact`를 거쳐 같은 list serializer 또는 Calendar serializer를 쓴다.
- 세 count는 합치지 않는다.
  - `itemCount`: 실제로 옮기는 canonical Item 수
  - `projectionOutputCount`: projection manifest가 약속한 결과 단위 수
  - `outputCount`: 실제 artifact의 행·항목·VEVENT 수
- 날짜 없는 Item은 Calendar에서 `held`이고 VEVENT를 만들지 않는다.
- public quick은 session-only 결과이며 persistent receipt/history를 쓰지 않는다. saved transfer만 versioned persistent receipt를 쓴다.

## 2. Field-by-field matrix

표의 `P`는 preserved, `T`는 transformed, `M`은 manifest/receipt only, `H`는 held, `U`는 unavailable, `O`는 의도적 omitted을 뜻한다.

| Canonical field | Calendar/ICS | Checklist | Sheet/TSV | Memo | 현재 판정 |
|---|---|---|---|---|---|
| canonical Item ID | `UID`로 T, 원 ID는 M | M | M | M | `PASS` · artifact와 manifest ID 집합을 exact 비교 |
| 제목 | `SUMMARY`로 T | 체크 항목 제목으로 P | `할 일` 열로 P | 번호 heading으로 P | `PASS` |
| 설명 | label이 있는 `DESCRIPTION`으로 T | `설명` multiline P | `설명` 열 P | `설명` multiline P | `PASS` |
| 날짜 | `DTSTART/DTEND`로 T, 없으면 H | `일정`에 P | `날짜` 열 P | `일정`에 P | `PASS` · undated 0 VEVENT |
| 시각 | timed `DTSTART/DTEND`로 T | `일정`에 P | `시간` 열 P | `일정`에 P | `PASS` |
| 예상 시간 | 종료 시각으로 T | `예상 N분/시간`으로 T | `예상 시간` 열로 T | `예상 N분/시간`으로 T | `PASS` |
| 시간대 | timed event의 `TZID`로 T | `시간대` label로 P | `시간대` 열로 P | `시간대` label로 P | `PASS` |
| 반복 | `RRULE`, 필요 시 `EXDATE/RECURRENCE-ID`로 T | `반복` label로 T | `반복` 열로 T | `반복` label로 T | `PASS` · 일/주/월 cadence, 요일/일자, count/until, paused/ended 보존 |
| 순서 | 파일의 component 순서로 T, 외부 앱 표시 순서는 미보장 | 행 순서 P | `순서`와 행 순서 P | 번호 순서 P | `PASS` |
| 포함 여부 | VEVENT membership으로 T | 결과 membership으로 T | 결과 membership으로 T | 결과 membership으로 T | `PASS` · manifest eligible ID가 owner |
| 완료 기준 | `DESCRIPTION`의 독립 label로 T | `완료 기준` multiline P | `완료 기준` 열 P | `완료 기준` multiline P | `PASS` · 실행 완료와 분리 |
| 개인 메모 | `DESCRIPTION`의 `개인 메모`로 T | 독립 label P | `메모` 열 P | `개인 메모` label P | `PASS` |
| 실행 메모 | `DESCRIPTION`의 `실행 메모`로 T | 독립 label P | `실행 메모` 열 P | `실행 메모` label P | `PASS` |
| 실행 상태 | `CONFIRMED/CANCELLED/TENTATIVE`로 T | checkbox와 상태 suffix로 T | `상태` 열로 T | `상태` label로 T | `PASS` |
| 항목 주의 | `DESCRIPTION`의 `주의`로 T | `주의` P | `항목 주의` 열 P | `주의` P | `PASS` |
| 계획 주의 | `DESCRIPTION`의 `계획 주의`로 T | `계획 주의` P | `계획 주의` 열 P | `계획 주의` P | `PASS` |
| 자료 label/URL | `DESCRIPTION`, 대표 원문은 `URL`로 T | 반복 `자료` label로 P | JSON Lines 단일 셀로 P | 번호가 있는 이름/URL label로 P | `PASS` · 중복 pair는 한 번만 보존 |
| Item 원문 | `DESCRIPTION/URL`로 T | `원문` P | `원문` 열 P | `원문` P | `PASS` |
| 계획 원문 이름/URL | `DESCRIPTION/URL`로 T | footer `계획 원문`으로 T | 각각 전용 열 P | 각각 footer label P | `PASS` · 값이 없으면 발명하지 않음 |
| snapshot kind/version/hash | payload O, confirmation/receipt M | 동일 | 동일 | 동일 | `PASS` |
| scope·IDs·count units·loss | payload O, confirmation/receipt M | 동일 | 동일 | 동일 | `PASS` · Item별 reason이 confirmation과 reopened receipt에 표시됨 |
| private/source-correction/history note | O | O | O | O | `PASS` · 일반 전송 payload에 포함하지 않음 |

### Calendar/ICS 세부 계약

- request의 `createdAt`을 `generatedAt`으로 넘겨 같은 확인 요청을 다시 만들 때 `DTSTAMP`가 바뀌지 않는다.
- 일반 event와 recurrence event 모두 완료는 `STATUS:CONFIRMED`, skipped/held는 `STATUS:CANCELLED`, pending/reopened는 `STATUS:TENTATIVE`로 변환한다.
- 상태가 있는 event에는 `TRANSP:TRANSPARENT`를 함께 기록한다.
- timed event는 유효한 IANA time zone에 `TZID`를 쓰고, all-day는 `VALUE=DATE`를 쓴다.
- routine은 canonical Item 수, projection series 수, 실제 VEVENT 수를 다른 단위로 기록한다. 한 series가 여러 화면 회차를 나타내도 누락으로 세지 않는다.
- `buildMyFlowMultiStepIcs`는 날짜 없는 항목과 중복 stable UID를 제외한다. 날짜 없는 항목만 있는 범위의 VEVENT는 `0`이다.

### Sheet/TSV 18개 stable column

순서는 코드 계약이며 임의로 바꾸지 않는다.

1. `순서`
2. `상태`
3. `할 일`
4. `날짜`
5. `시간`
6. `예상 시간`
7. `시간대`
8. `반복`
9. `메모`
10. `원문`
11. `설명`
12. `완료 기준`
13. `실행 메모`
14. `항목 주의`
15. `계획 주의`
16. `자료`
17. `계획 원문 이름`
18. `계획 원문 URL`

TSV는 tab delimiter를 쓰되 RFC4180 방식의 double quote escaping을 적용한다. tab, LF, CRLF, CR, double quote, 빈 셀, 한글, emoji, URL query/hash를 parse 후 되돌릴 수 있다. `자료` 셀은 `label`과 `url` 순서를 보존하는 JSON Lines라서 표시용 `label - url` 문자열을 다시 해석하지 않는다.

### Memo 문법

- 문서 제목 → 빈 줄 → `할 일 N개` → 번호가 있는 Item heading 순서를 고정한다.
- 각 Item은 `상태`, `일정`, `시간대`, `반복`, `설명`, `완료 기준`, `개인 메모`, `실행 메모`, `주의`, `계획 주의`, `자료 N 이름`, `자료 N URL`, `원문`의 명시적 label을 쓴다.
- 여러 줄 값은 continuation indentation으로 묶어 다음 label처럼 보이는 문자열, colon, tab, quote를 값 그대로 복구한다.
- 계획 원문 이름과 URL은 footer의 서로 다른 label로 남긴다.

### Checklist 문법

- 실행 완료는 `[x]`, 미완료는 `[ ]`; skipped/held는 제목 suffix로 구분한다.
- `완료 기준`은 checkbox 상태와 합치지 않는다.
- 시간대, 반복, 설명, 개인 메모, 실행 메모, 항목 주의, 계획 주의, 자료, 원문을 각각 독립 label로 둔다.
- multiline 값은 continuation indentation을 사용한다. 빈 값과 generic 완료 문장 `이 항목을 완료했어요.`는 빈 label로 내보내지 않는다.

## 3. 활성 serializer와 scope parity

| 범위 | manifest scope | artifact builder | 결과 |
|---|---|---|---|
| 현재 Item | `{ kind: 'item', itemId }` | Calendar는 `buildMyFlowMultiStepIcs`, list는 `buildEffectiveFlowListTransferArtifact` | 같은 saved transfer request·receipt 경로 |
| 직접 선택 | `{ kind: 'selected', itemIds }` | 위와 동일 | manifest eligible 순서로만 직렬화 |
| 계획 전체 | `{ kind: 'flow' }` | 위와 동일 | 위와 동일 |

기존 `buildMyFlowStepChecklistText`, `buildMyFlowStepSheetTsv`, `buildMyFlowStepPortableText`는 호환·rollback surface에 남아 있지만, default-on active saved transfer의 Item/selected/flow를 서로 다른 serializer로 나누지 않는다. 이 문서의 “한 serializer” 주장은 이 활성 경로에 한정한다.

## 4. Preview → confirmation → artifact → receipt lineage

| 단계 | Saved transfer | Public quick |
|---|---|---|
| preview | effective execution manifest의 kind/version/hash, scope, eligible/held/unavailable/excluded IDs와 count | effective authoring manifest의 같은 정보, 선택한 destination을 controlled state로 유지 |
| confirmation request | immutable snapshot identity, format, artifact kind, Item IDs, 세 count 단위, loss reason, one-way/duplicate, payload hash/bytes | 같은 request shape, 단 persistence는 `session` |
| 즉시 재검사 | 같은 `createdAt`으로 artifact를 재생성해 snapshot hash와 payload hash를 모두 비교 | 선택한 destination으로 같은 artifact를 재생성해 동일 비교 |
| 실제 artifact | effect 결과가 Item IDs, Item 수, artifact output 수, payload hash와 일치해야 성공 | 동일 |
| 결과 기록 | saved plan별 versioned persistent receipt | session-only confirmation; persistent receipt/history write `0` |

`payloadHash`는 artifact가 실제로 직렬화되는 confirmation request에서 생긴다. preview는 snapshot hash와 manifest를 소유하고, confirmation 이후에는 동일 request의 payload hash가 artifact와 receipt/session confirmation까지 이어진다. payload가 확인 뒤 달라지면 `artifact_payload_changed`로 effect 전에 중단한다.

Public capability에서 Memo를 선택하면 CTA, confirmation, clipboard payload, session confirmation도 Memo를 사용한다. 선택이 preview에만 남고 기본 format artifact가 실행되는 경로는 focused E2E에서 차단했다.

기존 `flow:export-receipts:v1`은 migration 없이 읽는다. 새 v1 receipt는 `countUnits`, `artifact.itemIds`, `artifact.itemCount`를 추가로 저장하지만 이 필드가 없는 pre-lineage v1 receipt도 valid이며 read 중 storage write가 `0`이다.

## 5. Golden fixture 집합

| Fixture | 검증 목적 | 현재 근거 |
|---|---|---|
| `moving-d30-basic` | dated multi-Item, Item/selected/flow, Sheet/Memo row count와 실제 clipboard | transfer artifact unit + focused E2E |
| `curated-allblanc-morning-workout` | bounded recurrence, canonical Item/series/VEVENT 단위, RRULE file | Calendar focused E2E |
| `pet-health-observation` | 날짜보다 기록·주의가 우선인 content의 Memo/held 처리 | capability/loss final review fixture |
| `P0_ROLE_RICH_FLOW_BUNDLE` | action/warning/resource의 eligible/held/unavailable 분리 | effective manifest contract |
| Flow Map `sevenOfEight` | canonical 8개와 selected/applied/preview/saved/export 7개 identity | P0 contract regression; P1-03은 schema를 바꾸지 않음 |
| `special-character-golden` | tab, LF/CRLF, quote, backslash, emoji, URL, resource label 순서 | TSV/Memo parser golden |
| source absent | 없는 source를 채우지 않음 | Sheet empty cell, Memo label/footer 미생성 golden |

Flow Map과 legacy fixture는 active artifact parser를 새로 만드는 용도가 아니라, P1-03 변경이 기존 canonical ID·read-only 호환 계약을 깨지 않았는지 확인하는 경계다.

## 6. Loss-schema delta

| Recon에서 확인한 손실/불일치 | P1-03 처리 | 현재 판정 |
|---|---|---|
| TSV가 tab/newline을 공백 또는 `/`로 압축 | quoted TSV encoder/parser로 reversible round-trip | `PASS` |
| Sheet/Memo가 보존을 선언한 시간대·반복·설명·완료 기준·실행 메모·주의·자료를 구조적으로 잃음 | Sheet 18 columns, Checklist/Memo labeled multiline grammar | `PASS` |
| Item scope가 legacy serializer, selected/flow가 normalized serializer 사용 | active saved transfer 세 scope를 한 artifact builder로 통합 | `PASS` |
| Calendar `DTSTAMP`가 재생성 시 달라져 payload hash 재검사가 불가능 | request `createdAt`을 `generatedAt`으로 고정 | `PASS` |
| execution status가 Calendar에 불완전 | `CONFIRMED/CANCELLED/TENTATIVE`와 transparent event로 변환 | `PASS` |
| export button 수치가 format manifest가 아닌 broad plan count에 의존 | destination별 manifest count/availability/ID로 button과 preflight 계산 | `PASS` |
| confirmation/receipt에 payload identity와 count 단위가 불완전 | payload hash/bytes, artifact IDs/count, 세 count unit을 request·session confirmation·receipt에 연결 | `PASS` |
| public에서 선택한 format이 preview에만 반영될 수 있음 | controlled selected destination이 CTA·artifact·session confirmation을 소유 | `PASS` |
| held/unavailable reason이 data에서 사라질 수 있음 | manifest → request → persistent receipt의 `reasonsByItemId` 보존 | `PASS · data` |
| held/unavailable 항목별 reason이 confirmation/reopened receipt에서 보이지 않음 | 같은 reason을 묶되 모든 Item ID를 보존해 confirmation과 reopened receipt에 표시 | `PASS` |
| P0-01 list timezone/repeat 선언과 실제 row/schema가 불일치 | Sheet에 `시간대`·`반복` 열을 추가하고 Checklist/Memo에도 같은 값을 명시적으로 보존 | `PASS` |
| public/saved Calendar의 같은 콘텐츠 semantic equality 직접 비교가 없음 | direct golden으로 공통 semantic field를 exact 비교하고 route별 UID/PRODID 차이만 의도적으로 제외 | `PASS` |
| artifact의 구조 label에 `Flow`가 남음 | fallback/field label은 `내 계획`, `계획`, `계획 주의`, `계획 원문` 사용 | `PASS` · source/user title의 고유명사는 변경하지 않음 |

## 7. Omitted·held·unavailable 표

| 조건 | 처리 | 사용자/데이터 결과 |
|---|---|---|
| 날짜 없는 executable Item을 Calendar로 선택 | `held` | eligible/VEVENT `0`; reason은 manifest/request/receipt에 남음 |
| warning/resource/reference/record 역할을 Calendar로 선택 | `unavailable` | 독립 VEVENT를 발명하지 않고 이유를 보존 |
| 사용자가 계획에서 제외한 Item | `excluded` | 네 artifact membership에서 제외, receipt에 ID·reason 보존 |
| 빈/generic 완료 기준 | payload `omitted` | 빈 `완료 기준` label을 만들지 않음 |
| internal layer version·scope·snapshot hash | artifact payload `omitted` | confirmation/session confirmation/persistent receipt에서 보존 |
| private note, source-correction note, history-only record | payload `omitted` | 일반 external artifact에 노출하지 않음 |
| source가 원래 없음 | 빈 셀 또는 label 없음 | source를 추정하거나 발명하지 않음 |
| all-day Item의 timezone | payload에 별도 timezone 없음 | 날짜만 `VALUE=DATE`; 가짜 time/TZID 없음 |
| missing base / unsupported schema / malformed legacy record | compatibility `held` | raw bytes를 자동 rewrite하지 않음; 전체 recovery surface는 P1-04 |

항목별 `reasonsByItemId`는 data lineage에서 보존되고, 같은 이유는 묶어서 표시하되 각 group의 Item ID를 잃지 않는다. confirmation과 다시 연 persistent receipt 모두 같은 상세 사유를 보여 준다.

## 8. 현재 검증 기록

아래 결과는 P1-03 구현을 수행한 coordinating session이 같은 local worktree에서 확인한 최신 기록이다. 이 문서 갱신 pass는 명령을 재실행하지 않았다.

| 명령/검사 | 결과 | 증명 범위 |
|---|---|---|
| focused serializer·codec·transfer·receipt·confirmation | `71/71 PASS` | Calendar deterministic/status/undated, 18열 TSV, Checklist/Memo timezone/repeat, lineage·payload hash, v1 read-only |
| mixed held reason browser | `1/1 PASS` | confirmation과 reopened receipt의 Item별 사유 |
| `npm.cmd run test:p35-p0` | `358/358 PASS` | P35 contract gate |
| `npm.cmd test` | `1,086/1,086 PASS` (`114 + 358 + 614`) | pretest + P35 + main unit/workflow |
| `npm.cmd run build` | `PASS`, Next 15.5.21, pages `18/18`, BUILD_ID `IHBpJ9XgKzGiPW_C767jU` | production compile/type/build |
| result-transfer·format·capability browser | `23/23 PASS` | selected public format, saved Item/selected/flow, Calendar/TSV/Memo actual effect·receipt, capability manifest preview |
| URL-first structural browser | `3/3 PASS` | structural list export와 timezone/repeat 경로 |
| omission component | `8/8 PASS` | held/unavailable/excluded reason grouping과 persisted receipt rendering |

PowerShell에서 focused E2E의 실제 환경변수 설정은 `$env:FLOWME_PLAYWRIGHT_PORT='3114'`를 사용했다.

## 9. 판정과 다음 단계

18열 Sheet, Checklist/Memo 시간대·반복, visible omission reason, public/saved Calendar semantic equality, pre-lineage v1 read-only 호환을 모두 확인해 이 문서를 P1-03 `PASS` 근거로 확정한다. P1-04 extreme·malformed·responsive final gate가 열렸다.

현재 결과는 local internal evidence다. commit·push·PR·CI·merge·Preview·Production 배포는 수행하지 않았고 실제 관찰 사용자는 `0명`이다.
