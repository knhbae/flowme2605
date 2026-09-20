# K3-B B1-E — checkpoint에 묶인 Plan/Item 초안·복구 프로토콜 QA

2026-09-05. **신규 28개 + 기존 session 회귀 126개 = 154/154 PASS**다. 메모리 저장소를 이용한 모델·저장 오류 검사이며, 새 편집 화면을 열거나 브라우저로 조작한 결과가 아니다. `sourceBoundary: 'not-bound'`는 원본 후보 저장소의 검증이 **아직 연결되지 않았다는 사실**을 표시한다. 원본이 없거나 안전하다고 보증하는 값이 아니다.

## 1. 적용한 범위

[설계 E01–E15](./k3b-plan-session-connection-design.md)의 checkpoint 기반 초안·소유권·저장·복구 경로를 구현했다. [E2 모듈](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js)만 수정하고 [새 회귀 파일](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-session.test.cjs)을 추가했다. 기존 테스트, app, C/P/S/D, builder, 두 사용자 HTML은 이 작업에서 수정하지 않았다.

- `createPersonalPlanSession({ checkpoint, flowRef, sessionId, returnPoint })`는 실제 C current/Undo/legacy 검증 뒤 P context를 내부에서 발급한다. caller의 context·baseline·candidate를 신뢰하지 않는다.
- 새 session에 `draftContract: 'flowme-standalone-personal-plan-draft-v1'`를 둔다. P draft 자체에는 discriminator를 덧붙이지 않는다. legacy Plan/Quick 생성기는 새 discriminator를 받지 않는다.
- Item은 전체 `itemRef`와 실제 부모 session 객체에 묶인다. 같은 sessionId 문자열, 같은 제목, local id, 다른 사본으로 부모를 대체할 수 없다. 자식 반영은 제목·메모·일정 mode의 정확한 값만 부모 초안에 옮긴다.
- 알려진 mode의 빈 title/date는 입력을 유지한 채 `dirty-invalid`로 남긴다. 알 수 없는 필드/mode, 다른 identity, getter/prototype/손실 JSON은 이전 session을 유지하고 거절한다.
- `beginPersonalPlanSave`가 캡처한 전체 checkpoint와 실제 before bytes를 비교하고 C 단일 transition으로 후보를 만든다. 의미상 같은 값은 attempt/journal을 만들지 않는다.
- 새 Plan 기록만 record `version: 2`와 `draftContract`를 사용한다. 기존 v1 legacy/Quick 기록·고정 저장 key·prepared/confirmed 의미는 유지한다.
- v2 decoder는 `beforeRaw → 정확한 Flow → 기본 draft → 제출 draft → C 단일 transition`을 재계산한다. 유효한 C 데이터라도 다른 Flow 변경이나 이웃 overlay가 섞인 후보는 거절한다.
- null-before 복구는 legacy/seed에서 원래 메모리 checkpoint를 재구성한다. prepared 복구 후 새 session/context로 보존 입력을 다시 발급하며, 자동 재저장하지 않는다. confirmed는 정리 실패가 있어도 target을 되돌리지 않는다.

새 API는 app/builder에 연결하지 않았다. E16–E18의 실제 source read·epoch·target/confirmed 직전 guard는 후속 계약이다. 별도 원본 검증을 건너뛰고 이 API를 UI 저장 권한으로 쓰면 안 된다. 개인 section·Item 순서는 여전히 이 draft 계약의 지원 범위가 아니다.

## 2. 실제 실행 이력

| 실행 | 등록/실행 | 결과 | 해석 |
| --- | ---: | --- | --- |
| 구현 전 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-session-red-20260905-01.tap`) | 19 | 1 PASS / 18 FAIL | 기존 Plan/Quick 호환 1개만 통과. 새 API 미구현을 재현 |
| 첫 구현 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-session-first-20260905-01.tap`) | 19 | 18 PASS / 1 FAIL | same-date fixture가 날짜 없는 `quote`를 골랐다. 실제 날짜가 있는 `contract`를 선택하도록 테스트를 정정 |
| fixture 정정 + 기존 회귀 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-session-existing-first-20260905-01.tap`) | 145 | 145 PASS | 신규 19 + 기존 126 |
| 추가 오류·사본·UMD 검사 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-session-expanded-20260905-01.tap`) | 28 | 28 PASS | 신규 9개를 보강한 검사 파일 단독 실행 |
| 최종 합동 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-context-session-final-20260905-01.tap`) | 154 | 154 PASS | 신규 28 + 기존 126. 2,274.1907 ms. skip/cancel/todo 0 |

재실행을 더해 고유 테스트 수를 늘리지 않았다. 입력 matrix의 반복도 독립 등록 수로 세지 않았다. parent의 이전 394/394 또는 다른 Sa/Sb·브라우저 결과는 이 154개에 더하지 않는다.

```powershell
node --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-session.test.cjs docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.test.cjs
```

## 3. 신규 28개와 원래 검사 묶음의 대응

| 등록 이름의 ID | 실제 검사 |
| --- | --- |
| E01 | CJS/UMD 새 API 노출, legacy/Quick version1, discriminator 우회 차단 |
| E02 | 실제 C/P context, 전체 current/Undo/legacy 검사, baseline/draft 동결, clone session 거절 |
| E03 | 지원하는 invalid 입력 보존, extra/mode/missing Item/getter 차단 |
| E04 | full Item ref, local id/source Flow id/다른 Item 치환 차단 |
| E05 | 자식 exact CRLF/빈 메모/미정 mode 반영, 부모/다른 Item 보존, 재열기·취소 |
| E06 | 부모 revision ABA와 같은 문자열 ID의 다른 부모 객체 차단 |
| E07 | 의미상 no-op attempt 0, 같은 날짜 fixed pin 의도 유지 |
| E08 | 한 후보·한 Undo 저장, v2 기록, source 미연결 표시, outcome 중복 소비 차단 |
| E09 | 기존 Plan/Quick v1 기록, 실제 C 후보·기존 저장 프로토콜 |
| E10 | 유효한 다른 Flow 후보와 추가 이웃 overlay 후보 치환 차단 |
| E10b | baseline/discriminator/extra/kind/scope/version 위조 차단 |
| E11 | seed/legacy null-before 복구, 새 context로 보존 draft 재개, 재개 token 재사용 차단 |
| E12 | 최초 read 오류·stale before는 쓰기 0, 입력 보존 |
| E12b | target throw-before/after의 정확한 before 복구와 rollback 계수 |
| E12c | prepared write 뒤 예외는 성공 아님, 명시 복구 시 target 쓰기 0 |
| E13 | foreign target/journal을 prepared 복구가 덮지 않음 |
| E14 | confirmed write 뒤 예외·cleanup 실패·재시도·중복 정리에서 rollback 0 |
| E15 | 실패 후 같은 attempt 재시도, clone outcome/중복 dispatch/입력 변경 후 옛 callback 차단 |
| E15b | Undo만 달라져도 캡처한 checkpoint에 연결 불가, old beginSave 우회 차단 |
| E02b | 실제 UMD C/P/E 호출과 다른 realm의 표준 JSON 입력. DOM·실제 storage 접근 0 |
| E03b | custom prototype/toJSON/symbol/non-enumerable/sparse/비 JSON 거절, hook 실행 0 |
| E04b | 같은 원문·같은 제목 두 사본에서 한 사본의 둘째 Item만 변경, recovery scope 교체 차단 |
| E05b | 모든 close reason의 순수 상태 검사, 미반영 자식 보존, pending/submitting 잠금 |
| E12d | 일시적 wrong readback은 소유 bytes만 복구, foreign bytes는 보존·잠금 |
| E12e | null-before rollback 실패 → prepared 보존 → 명시 복구 → 같은 draft 재개 |
| E13b | unreadable startup 쓰기 0, 복구 후 legacy/current drift 재개 차단 |
| E14b | confirmed 전 예외와 confirmed 후 읽기 불능을 prepared/confirmed로 구분, 자동 rollback 0 |
| E14c | legacy base 변경을 prepare/target/confirm 경계에 각각 주입, 이후 쓰기 차단 |

E05b의 `browser-back`은 문자열을 넣은 순수 transition 검사다. 실제 브라우저 Back·초점·스크롤 검사를 대신하지 않는다. E14c는 **legacy base** 검사이며 별도 source-candidate key의 freshness 검사가 아니다. E14 원래 요구의 source drift와 E16–E18은 아직 미실행이다.

자식의 `valid`는 현재 제목/date mode의 문법 검사다. 부모도 `P.normalizePlanDraft`의 문법·정규화 결과로 valid를 판단하므로, 반복 Item을 미정으로 바꾸는 domain 오류는 `dirty-valid`인 상태에서 실제 C 저장 후보 검사에 의해 거절될 수 있다. 자식·부모의 valid를 모든 domain 승인으로 보고하지 않는다. 후속 E16/UI는 [captured-source draft 검증 제안](./k3b-plan-source-journal-v3-design.md)의 domain 검사와 해당 필드 사유·입력 보존을 함께 연결해야 한다.

## 4. 저장·원문 보존 증거

신규 시험은 테스트 전용 Map을 사용했다. API probe는 `setItem/removeItem`을 기록하며 허용 pair 이외의 호출을 거절한다. `clear()`는 실행하면 실패한다. 실제 localStorage와 운영 프로필에는 접근하지 않았다.

- 허용 target: `flow:poc:personal-workspace:v1:standalone-integrated:workspace-v2`
- 허용 journal: `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v2`
- 운영 sentinel `flow:b1e:operating-sentinel`의 공백·CRLF·한글·emoji bytes 보존을 검사했다.
- legacy base는 API로 쓰지 않는다. drift 시험만 fixture가 Map을 직접 바꿨으며, 이를 제품 API 쓰기로 세지 않는다.
- 정상 저장의 정확 계수는 target 1, journal 2(prepared/confirmed)다. cleanup은 별도 journal remove 1이다. 오류 시 write/rollback/journal 계수를 따로 확인했다. 전체 시험의 API 호출 합계를 새로 산출하지 않았으므로 총합 수치는 주장하지 않는다.
- E08은 raw tasks/flows·이전 state 전체 Undo를 deep-equal로 비교한다. E10/E04b는 같은 제목 다른 사본과 이웃 overlay를 정확한 ref로 구분한다.

## 5. 변경 자료와 재현 기준

| 자료 | SHA-256 | 크기 |
| --- | --- | ---: |
| 수정 전 E2 백업 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-plan-context-session-20260905-01/plan-item-session.js`) | `FD249B599E122E84DF614C89771EE5A31FCF06B01585BC5093810F43387F6AA7` | 별도 백업 |
| E2 최종 후보 | `D65528794CC9C11AB74C80A7D49C5AB777AAF9BE599CC2DBFFD8014A61BA6372` | 55,589 bytes |
| 신규 28개 시험 | `AD6786B0AED5A31701E9EA1829E22259CEBE8E571843D8F3003F4C6AAE9CFD62` | 33,097 bytes |
| 기존 session 시험 — 미수정 | `A7F60B042D5B7A89AF023CE781A8967DAC9E180898A769B5B2F26F25BEF6ADC8` | 기존 파일 |
| 최종 154개 로그 | `49EEB0E762471C5F5AA8A8112A65AC23CE5902E568A415181DDAC53CF30C3BBE` | TAP/Node 출력 |

백업 대비 E2 변경은 207줄 추가/16줄 삭제다. C/P는 다른 담당자가 Sa/Sb 후속 API를 병행하므로 이 QA는 해당 API의 완료를 주장하지 않는다. E2는 이번 시험에서 기존 raw P API만 소비한다. parent의 최종 통합 재실행은 별도 결과로 남긴다.

## 6. 미완료와 공개 상태

E16–E18 source-bound 저장·복구와 E19–E20 실제 화면/5 viewport는 다음 gate다. source-aware `A(raw) → B(source) → 명시 A`의 복구 재도출을 현재 raw-only v2 기록으로 가장하지 않는다. 별도 source-bound durable 증거 계약을 설계한 뒤 구현해야 한다.

이 작업의 브라우저/실제 기기/실제 IME/보조기술 검사는 **NOT_RUN**이다. 전체 `npm test`·production build는 이 하위 작업에서 재실행하지 않았다. commit, push, PR, Preview, Production 배포는 모두 미실행이고 관찰 사용자 수는 0명이다. 화면이나 제품 통합 완료 보고가 아니다.
