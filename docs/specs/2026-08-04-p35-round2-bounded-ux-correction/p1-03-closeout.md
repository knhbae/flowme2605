# P1-03 형식별 field parity·실제 artifact closeout

**판정:** `PASS — LOCAL INTERNAL GATE`

**기준 ref:** `codex/p35-production-mobile-p0` · HEAD/upstream `d5f693776f7cebbce72a247ddb33ca6c5d550900` 기반 local working tree

**실행일:** 2026-08-05 KST

**게시·관찰 경계:** commit·push·PR·CI·merge·Preview·Production 모두 미실행. 실제 관찰 사용자 `0명`.

형식별 field parity, 실제 artifact, transfer lineage를 모두 닫았다. 항목별 held/unavailable 사유는 confirmation과 다시 연 receipt에서 보이고, list artifact는 시간대·반복을 명시적으로 보존하며, 같은 canonical 결과의 public/saved Calendar semantic equality를 direct golden으로 고정했다. 세부 field 근거는 [형식·필드 parity 문서](./p1-03-format-field-parity.md)에 있다.

## 1. 현재 사용자 결과

- 저장한 계획의 현재 Item, 직접 선택, 계획 전체가 같은 effective Item과 active serializer를 사용한다.
- Calendar는 날짜·시각·시간대·반복·설명·출처·실행 상태를 ICS 문법으로 바꾸고, 날짜 없는 Item에는 VEVENT를 만들지 않는다.
- Sheet는 `시간대`와 `반복`을 포함한 18개 stable column과 reversible quoted TSV를 사용한다.
- Memo는 번호 heading과 명시적 multiline label을 사용한다.
- Checklist와 Memo도 시간대와 반복 규칙을 명시적 label로 보존하며, 실행 checkbox, 완료 기준, 개인 메모, 실행 메모, 주의, 자료, 원문을 서로 다른 의미로 유지한다.
- public에서 고른 format이 실제 빠른 결과와 session confirmation을 소유한다.
- 확인한 payload는 같은 `createdAt`으로 다시 만들고 hash를 비교한다. 확인 뒤 내용이 달라지면 외부 effect 전에 중단한다.
- saved transfer의 성공 기록은 snapshot identity, scope, Item IDs, 세 count 단위, loss, payload hash를 versioned receipt에 남긴다. 기존 pre-lineage v1 receipt는 rewrite 없이 계속 읽는다.

## 2. 구현 범위

### P1-03 직접 artifact·lineage 범위

- `lib/flow/effective-flow-artifact-codec.ts`
- `lib/flow/effective-flow-artifact-codec.test.ts`
- `lib/flow/personal-structural-list-export.ts`
- `lib/flow/effective-flow-transfer-artifact.ts`
- `lib/flow/effective-flow-transfer-artifact.test.ts`
- `lib/flow/my-flow-step-export.ts`
- `lib/flow/my-flow-step-export.test.ts`
- `lib/flow/export.ts`
- `lib/flow/result-transfer.ts`
- `lib/flow/result-transfer.test.ts`
- `lib/flow/export-receipt-storage.test.ts`

### 공유 integration·UI·browser 범위

- `components/flow/AppClient.tsx`
- `components/flow/FlowExportPanel.tsx`
- `components/flow/FlowCapabilityResultPreview.tsx`
- `components/flow/FlowTransferConfirmation.tsx`
- `components/flow/FlowTransferConfirmation.test.tsx`
- `tests/e2e/p35-p0-result-transfer.spec.ts`
- `tests/e2e/p35-p0-result-transfer-formats.spec.ts`
- `tests/e2e/p35-p0-capability-preview.spec.ts`

이 파일들은 앞선 P0/P1 단계와 공유되는 dirty path다. P1-03은 위 파일의 format serializer, request lineage, destination manifest/count, selected-format coupling 영역만 소유한다고 본다. 다른 동시 변경을 정리·stage하지 않는다.

## 3. Before / after

| 문제 | Before | 현재 local after |
|---|---|---|
| TSV 특수문자 | tab/newline을 공백·구분 문자로 압축해 원문 복구 불가 | quoted TSV parser round-trip으로 tab/LF/CRLF/quote/빈 값/Unicode 복구 |
| Sheet field | 설명·완료 기준·실행 메모·주의·자료와 시간대·반복을 loss schema와 다르게 잃을 수 있음 | 18개 stable column, `시간대`·`반복`, resource JSON Lines |
| Memo field | compact text에서 label·여러 줄 경계가 약함 | 번호 record와 continuation indentation을 가진 labeled grammar |
| Checklist 의미 | 완료 기준·상태·메모가 consumer별로 달라질 수 있음 | checkbox/상태/완료 기준/메모/주의/자료/원문을 분리 |
| Item/selected/flow | Item만 legacy serializer를 탈 수 있음 | default-on saved transfer 세 scope가 같은 artifact builder 사용 |
| Calendar 재검사 | `DTSTAMP`가 현재 시각이라 같은 request payload가 달라질 수 있음 | immutable request의 `createdAt`을 `generatedAt`으로 사용 |
| Calendar 상태 | execution completion 표현이 consumer마다 달랐음 | `CONFIRMED/CANCELLED/TENTATIVE`, `TRANSP:TRANSPARENT` |
| format count | broad scope plan count와 실제 format manifest count가 어긋날 수 있음 | destination manifest의 output/availability/IDs가 버튼과 confirmation owner |
| transfer identity | snapshot만 같아도 payload가 바뀔 수 있음 | snapshot hash와 artifact payload hash를 effect 직전에 모두 재검사 |
| count 의미 | Item, projection, VEVENT/행 수가 한 `count`처럼 보일 수 있음 | `item/projection_output/artifact_output` 세 단위를 분리 |
| public format 선택 | preview 선택과 실제 quick artifact가 달라질 수 있음 | selected destination이 CTA→request→artifact→session confirmation을 소유 |
| v1 receipt | 새 lineage field를 필수로 만들면 기존 receipt가 깨짐 | 새 v1에는 field 추가, pre-lineage v1은 optional로 읽고 rewrite 0 |

## 4. Acceptance 상태

| 완료 기준 | 판정 | 근거/남은 일 |
|---|---|---|
| saved preview/confirm/artifact/receipt가 같은 scope·ID·snapshot을 사용 | `PASS` | immutable request, manifest match, actual format E2E |
| Item·selected·flow가 같은 active saved serializer 사용 | `PASS` | `buildSavedTransferArtifact` 단일 경로 |
| 세 count 단위와 artifact payload hash가 request→effect→receipt에 이어짐 | `PASS` | focused result-transfer unit·E2E |
| public 선택 format이 preview→artifact→session confirmation에 이어짐 | `PASS` | Memo 선택 actual clipboard E2E |
| public persistent receipt/history write 0 | `PASS` | storage/history/network assertions |
| Calendar generatedAt/status/timezone/repeat/source와 undated 0 VEVENT | `PASS` | ICS golden·routine actual file E2E |
| Sheet 18 columns와 reversible TSV | `PASS` | `시간대`·`반복` 포함 parser golden + actual clipboard rows |
| Memo labeled multiline·timezone/repeat/source/warning/resource | `PASS` | parser golden + actual clipboard rows |
| Checklist 시간대·반복·완료 기준·메모·실행 완료 분리 | `PASS` | focused golden |
| held/unavailable reason이 data lineage에서 보존 | `PASS · data` | manifest/request/receipt `reasonsByItemId` |
| held/unavailable의 구체 reason이 confirmation/reopened receipt에서 보임 | `PASS` | Item ID별 사유 grouping, confirmation과 persisted reopened receipt UI·component·mixed held E2E |
| P0-01 loss schema의 list timezone/repeat 선언과 payload 일치 | `PASS` | Sheet 18열과 Checklist/Memo `시간대`·`반복` label |
| 같은 콘텐츠의 public/saved Calendar semantic field equality | `PASS` | direct semantic golden이 summary/start/end/DTSTAMP/status/transparency/source/plan/section/description/criterion/memos/warning 비교 |
| source에 없는 날짜·field·행동 발명 0 | `PASS` | source absent golden, undated hold, unsupported role unavailable |
| pre-lineage v1 receipt read-only 호환 | `PASS` | migration/write 0 unit |

## 5. Golden·loss 결과 요약

- `moving-d30-basic`: 실제 saved Item/selected/flow와 Sheet/Memo clipboard row 수를 확인했다.
- `curated-allblanc-morning-workout`: routine Item/series/VEVENT 단위를 분리하고 실제 RRULE ICS를 확인했다.
- `special-character-golden`: tab, newline, CRLF, quote, backslash, emoji, URL, resource label 순서를 parser 후 비교했다.
- `P0_ROLE_RICH_FLOW_BUNDLE`: warning/resource/reference를 Calendar event로 발명하지 않는 manifest 분류를 유지했다.
- Flow Map `sevenOfEight`: canonical 8과 selected/applied/preview/saved/export 7의 identity 계약을 회귀시켰다.
- source가 없는 fixture: 빈 Sheet source cell과 Memo source label/footer 미생성을 확인했다.
- 같은 canonical result의 public/saved Calendar: semantic field 집합은 exact-equal이고 route별 `PRODID`·stable `UID` 차이만 의도적으로 비교에서 제외했다.
- mixed held case: confirmation에서 Item별 사유를 확인하고 저장된 결과를 다시 열어 같은 사유가 유지되는 경로를 browser로 확인했다.

날짜 없는 executable Item은 Calendar `held`, Calendar에 맞지 않는 warning/resource/reference/record 역할은 `unavailable`, 사용자가 제외한 Item은 `excluded`다. internal version/scope/hash는 artifact payload가 아니라 confirmation/receipt에 남고, private/source-correction/history-only note는 일반 결과에서 의도적으로 제외한다.

## 6. 검증

아래는 P1-03 coordinating session이 같은 local working tree에서 확인한 최신 결과다. 이 문서 갱신 pass는 build/test를 다시 실행하지 않았다.

| 명령/검사 | 결과 | 범위 |
|---|---|---|
| focused serializer·codec·transfer·receipt·confirmation | `71/71 PASS` | format golden, reversible parser, payload lineage, v1 compatibility, omission UI |
| mixed held reason browser | `1/1 PASS` | confirmation과 reopened receipt의 Item별 사유 |
| `npm.cmd run test:p35-p0` | `358/358 PASS` | P35 P0/P1 계약 |
| `npm.cmd test` | `1,086/1,086 PASS` | `pretest 114/114 + P35 358/358 + main 614/614` |
| `npm.cmd run build` | `PASS` | Next `15.5.21`, pages `18/18`, BUILD_ID `IHBpJ9XgKzGiPW_C767jU` |
| result-transfer·format·capability browser | `23/23 PASS` | public selected format, saved scope, actual ICS/clipboard, confirmation/receipt, capability manifest preview |
| URL-first structural browser | `3/3 PASS` | structural list export와 timezone/repeat 경로 |
| omission component | `8/8 PASS` | held/unavailable/excluded grouping과 persisted receipt rendering |

## 7. 종료와 다음 gate

P1-03의 format parity, visible omission reason, Calendar semantic equality, receipt compatibility 조건을 모두 충족해 local internal gate를 닫았다. 다음 순서인 P1-04 extreme·malformed·responsive final gate가 열렸다.

현재 production baseline은 기존 released P35이고, 이 P1-03 local candidate는 배포·게시되지 않았다. commit·push·PR·CI·merge·Preview·Production은 수행하지 않았고 실제 관찰 사용자도 `0명`이다. 자동 unit/build/E2E는 내부 QA이며 관찰 사용자 검증이 아니다.
