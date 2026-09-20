# K3-B B1-Sa — bound source reader QA

이 문서는 Sa 동결 시점의 기록이다. 후속 승인된 source-aware 편집과 title decoder 변경은 [Sb QA](./k3b-plan-source-intent-qa.md)에 분리했다. 아래 Sa 실행 결과와 해시는 소급 변경하지 않는다.

2026-09-05. **새 reader 25개 + 기존 P 41개 + 이전 characterization 9개 = 75/75 PASS.** 원본 후보와 raw state를 함께 검사하고 검증된 개인 overlay를 읽기에만 적용했다. 기존 raw-only API·metadata 동값 규칙은 변경하지 않았다. app/C/E2/D/builder/HTML을 연결하지 않았으므로 UI·실제 저장 지원 완료가 아니다. [설계](./k3b-plan-source-reader-design.md), [다음 Sb 계약 diff](./k3b-plan-source-intent-contract-diff.md)를 함께 읽는다.

## 1. 구현과 입력 경계

[P 모듈](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js)에 `readPersonalPlanSourceContext`와 `checkPersonalPlanSourceContext`를 추가했다. 원래 네 API는 같은 내부 overlay 적용 함수를 공유하며 동작을 유지한다. reader는 raw capture 검증 → 실제 source raw를 기존 M loader로 decode → base/target/Item·section membership 검사 → disposable source 합성 → 허용 source 필드 외 변경 검사 → 개인 overlay 순서다.

sourceRead는 필수 `{ok:true,raw:string|null}` 또는 `{ok:false,reason:'read-error'|'unavailable'}`다. 부재와 read-error를 구별하고, unknown payload/버전/입력 필드를 거절한다. 기존 source store validator를 정확 key의 read-only adapter로 재사용한다. 실제 storage/DOM/운영 writer가 없다. source composer에도 raw copy를 주므로 의존 함수의 잘못된 입력 변경이 caller 원본으로 전달되지 않는다.

반환 state/capabilities/diagnostics는 frozen copy, context는 private WeakMap의 opaque reference다. check는 raw state JSON·source raw 문자열·관찰 epoch를 exact 비교한다. **check ok는 저장 허가가 아니다.** caller는 Flow의 canEdit·기존 draft validator와 E2/workspace authority를 별도로 확인해야 한다. 임의 caller가 실제 I/O 실패를 성공 packet으로 거짓 포장하는 것을 pure API가 인증할 수 있다고 주장하지 않는다.

## 2. capability와 차단

- 원문 변경으로 pre-P 제목/계획일이 raw 정규화 기준과 달라지면 field가 `source-aware-normalization-required`다. 기존 raw API로 억지 저장하지 않는다.
- sourceTitle가 없는 legacy의 title은 기존 개인 기준으로 유지한다. incoming과 충돌하면 `source-title-owner-unproven`으로 편집을 막는다. raw sourceTitle는 만들지 않는다.
- 실제 task/section membership에 없는 incoming Item은 `source-membership-not-supported`, missing target은 `source-target-missing`, 미확인 base/mine 체인은 `source-chain-not-supported`로 반환한다. 부분 source 합성을 성공으로 표시하지 않는다.
- 이미 수용된 옛 비반복 invalid planDate는 raw 읽기 값을 유지하되 `invalid-plan-baseline`으로 Plan 편집 capability를 주지 않는다.
- canEdit는 source binding/정규화 기준을 통과했다는 선행 조건이다. 각 날짜 mode가 모두 지원된다는 뜻이 아니며 반복 unscheduled 같은 기존 P/domain 검사도 계속 필요하다.

이 차단은 현재 adapter capability이며 영구 제품 정책이 아니다. 실행 날짜/시간·완료·회차·폴더·순서·raw metadata·unknown 필드는 변경하지 않는다.

## 3. 실제 실행 기록

| 실행 | 결과 | 의미 |
|---|---:|---|
| reader 첫 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-reader-red-20260905.tap`) | 18 FAIL | 새 API가 없던 상태에서 등록한 계약 RED. 18개의 기존 UI 결함으로 세지 않음 |
| 첫 구현 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-reader-green-first-20260905.tap`) | 59/59 PASS | 신규 S18 + 기존 P41. 기존 P 시험 기대값 수정 0 |
| 추가 경계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-reader-boundaries-first-20260905.tap`) | 25/25 PASS | decoder 없음, 실제 valid 미확인 체인, source-only diff, section 확장, invalid baseline 추가 |
| 최종 focused (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-reader-focused-final-20260905.tap`) | **75/75 PASS** | S25 + P41 + R9, skip/cancel/todo 0 |
| 별도 Sb RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/plan-source-intent-red-20260905.tap`) | 6 중 3 PASS / 3 FAIL | 다음 source-aware intent 계약. Sa 완료 수에 섞지 않음 |

반복 실행 수를 고유 테스트 수로 합산하지 않았다. R9는 예전 permissive M/raw-only P 경로의 관찰이고, 그중 7 gate가 계속 재현되는 것은 새 bound entry가 실패했다는 뜻이 아니다. 이 작업에서 전체 npm test나 전체 C/E2/D protocol 회귀를 실행했다고 주장하지 않는다. 해당 모듈은 다른 담당자가 독립 변경 중이다.

## 4. 신규 25개 매핑

| ID | 검증 |
|---|---|
| S01–04 | 확인된 empty·실제 applied source, raw immutable, P overlay 마지막 적용, 빈 memo, legacy sourceTitle owner 보호 |
| S05–06 | pending/deferred 미적용, corrupt/unknown version, read-error/unavailable/누락/null/unknown option/epoch 거절 |
| S07–09 | missing/duplicate/foreign copy, raw source drift/handoff/fingerprint, incoming Item 추가 거절 |
| S10–12 | raw/source exact bytes·observed ABA epoch·위조/다른 종류 token, 신규 context가 old token을 살리지 않음 |
| S13–14 | nullable planDate 부재/null/fixed, exact 빈 메모/CRLF, same-date pin/unscheduled, 실행·unknown·metadata 불변 |
| S15–16 | getter/custom Array prototype/unknown flag 실행 전 차단. 실제 UMD 호출에서 ambient storage/DOM 0, frozen 반환 오염 방지 |
| S17–18 | 기존 raw normalize 동값 no-op 보존, base와 모순되는 실제 source facts 차단 |
| S19–22 | decoder 없음, 기존 API로 만든 valid 미확인 체인, dependency의 허용 field 밖 변경 거절·원본 보존, source section 확장 차단 |
| S23–25 | 옛 invalid Plan baseline 읽기/편집 구별, whitespace byte drift/getter freshness, legacy reserved collision |

## 5. 동결·남은 일

P 변경 전 exact backup (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-source-reader/personal-plan-context.js`)의 SHA256은 `43AFE1678F1BDC33815B94EC9F476AF658098672825BE604A147DC03927199F3`다. 최종 제품은 `BDBF71E8663F25DAC24C6BDE3B1C71090D903E334C68C1D807E415A206172AAD`, 새 [reader test](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-source-reader.test.cjs)는 `1FD2987C4D7D0DE7DB7B557AEE1820D0646FECB1BE8F44148E870049D57C6A9A`, 최종 TAP은 `B13DA4694FCB920F5FC1ADBE87106D6011A657E397C885C9BDDFD5F3F031C756`다.

P/reader test/Sb RED 파일의 `node --check` 3/3 PASS. 제품 P는 최종 75개 실행 뒤 동결했다. raw-only P 41개 시험과 이전 characterization 파일은 수정하지 않았다. M/C/E2/D/app/builder/HTML/공용 보고서 변경 0.

`npm.cmd run docs:check` PASS(required files 16, local links 5,484). 여섯 소유 path의 scoped closeout을 실행하고, 미추적 directory로 묶인 문서 세 개는 `git status --untracked-files=all`로 별도 확인했다. reporter가 권장한 명령을 실행 결과로 대신 기록하지 않았다.

다음은 Sb의 source-aware normalize·title 동값 decoder 계약 승인/구현, E2 target/confirmed 직전 source guard와 복구 후 명시 재확인, C/삭제 protocol 동시 검증, app reader/UI 연결이다. source chain/추가 membership 미지원은 별도 범위로 남긴다. 실제 browser·5 viewport·Android Chrome/iOS Safari·가상 키보드·보조기술 NOT_RUN. 관찰 사용자 0명. commit/push/PR/Preview/Production 없음.
