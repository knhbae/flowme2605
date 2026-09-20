# K3-B B2 — P 구간·전체 순서 모델 QA

2026-09-05. **P 전용 구현과 순수 검증을 마쳤다. B2 화면·전체 저장 복구·삭제 검증 완료는 아니다.** 계약 12개와 이번 보강 17개가 통과했고, 기존 회귀 10파일 213개도 통과했다. 신규 UI·사용자 HTML을 만들지 않았다.

## 1. 변경 소유와 고정된 경계

- 제품 변경은 [personal-plan-context.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-context.js) 한 파일이다. B1 exact 원본은 before backup (로컬 전용 근거: `../../../output/k3b/before-section-order-plan/personal-plan-context.js`)에 보존했다. 원본 SHA256 `9DE68BE271BD4026338A41229A4AB757F0EB4FA17C99DE23B6209C6A8F47C358`.
- 신규 [review test 17개](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-structure-review.test.cjs), 본 QA, 승인된 [contract diff 정정](./k3b-section-order-contract-diff.md)만 작성했다. 앞서 등록한 [계약 test 12개](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/personal-plan-section-order-contract.test.cjs)는 수정하지 않았다(SHA `44D0D522F8D787E47B17C0C3BF716D1BCFF702AD478B30AE2AED9F196F47901D`).
- C/E2/D/PD/S/M/app/builder/기존 tests/사용자 HTML은 이 하위 작업에서 수정하지 않았다. C 연결은 main 소유이며 이 검사에서는 C SHA `835FF4320FC8278882876BEDE60AA392734341E4C300309FF9A47515818CF600`을 사용했다.
- P ABI `VERSION=1`, `CONTRACT=…v1`, 기존 storage metadata 위치를 유지했다. 새 metadata header/draft만2, 기존 source/core 기능은 제거하지 않았다. 새 storage key·운영 schema·독립 Undo를 만들지 않았다.

첫 동결 P SHA256은 `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4`다. 이후 다른 모듈/브라우저 결과는 해당 시점 소스와 별도 연결해야 한다.

## 2. 실제 구현한 것

| 영역 | 구현·근거 | 남은 경계 |
| --- | --- | --- |
| 소유 proof | 실제 M 작성 저장 raw/fingerprint, normalized handoff·draft id suffix, 저장 id·sourceLine·Item membership을 대조. 빈 선행 구간의 step-2, implicit+explicit 혼합·CRLF 허용 | missing/duplicate/forged proof는 section readonly. seed/imported bundle 권한 추정0. 원래 M validator를 강화하지 않음 |
| version2 metadata | 기존 entry 모양 + strict structure. 구조만 있는 entry의 empty core를 한정 허용. current/입력 Undo 및 legacy archive reserved collision 검사 | v1 자동 migration0. 구 client의 v2 정상 사용을 보장하는 것은 아님 |
| 전체 순서 | 모든 full Item ref의 정확한 순열. 별도 읽기 order와 각 행의 원래 section membership | raw task/Step 배열, 실행 날짜/완료, timeline 기록 변경0. 기간 tie reader 연결은 후속 |
| 별칭 의도 | source-before-personal을 inherit baseline으로 사용. source B 뒤 명시 A 저장; source가 A로 돌아와도 저장 alias 의도 보존 | 원문 ref/구간 소속/**source 순서** 변경은 현행 strict 차단 유지 |
| 기존 core 호환 | 구조-only → 기존 raw/source core 수정 → 마지막 core 해제에도 structure exact. v1 공백/newline title와 CRLF memo 유지 | E2 실제 child UI는 별도 연동 검증 |
| context | 별도 opaque 구조 context, captured validation, raw/source bytes·epoch freshness, C의 whole checkpoint 결합 | captured validator는 저장 권한이나 현재 storage 검사 아님 |
| Undo/read | revision +1, 직전 전체 state Undo, 실제 C Undo의 timestamp 예외 외 복원, reload JSON decode·PD 읽기 | 실제 브라우저 reload·E2 journal4 prepared/confirmed·D 삭제는 이 결과에 포함하지 않음 |

API는 계약대로 `inspectPersonalPlanStructureEditor`, `validateCapturedPersonalPlanStructureDraft`, `planPersonalPlanStructureState`, `readPersonalPlanStructureView`다. 상수는 `STRUCTURE_DRAFT_VERSION=2`, `STRUCTURE_METADATA_VERSION=2`, `STRUCTURE_CONTRACT='flowme-standalone-personal-plan-context-v2'`다. reader는 frozen view만 반환하며 raw state 순서를 바꾸지 않는다.

## 3. 검토에서 고친 판단·실제 결함

[독립 검토](./k3b-section-order-independent-review.md)의 R01/R02는 구현 전 계약 문구 오류였다. ‘same-membership’만으로는 source 순서 차단을 설명하지 못했고, ‘제목 한 줄 기존 규칙’도 실제 React/P와 달랐다. 새 section만 nonblank·trim-exact를 따르고 내부 newline은 허용했다. 기존 core `text()`·memo 규칙은 바꾸지 않았다.

R03/R04는 신규 구현 때 의도 보존과 old core writer 호환을 함께 연결했다. decoder/read가 현재 source와 같은 alias를 지우지 않으며, `withPlannedMetadata`는 기존 structure를 기본 보존한다. 구조-only entry에서 core를 제거해도 entry 전체를 삭제하지 않는다.

main의 추가 코드 검토에서 **`sourceFlowId.startsWith('authoring-')`만 검사하는 실제 P 첫 구현 결함**을 찾았다. 새 B2R17이 `authoring-` 빈 suffix의 section editable을 재현했다. RED 0/1 (로컬 전용 근거: `../../../output/k3b/section-order-proof-id-red-20260905.tap`) 후 `M.makeHandoff`와 같은 normalized nonempty suffix/handoff id 검사를 **proof 안에만** 추가했고 GREEN 1/1 (로컬 전용 근거: `../../../output/k3b/section-order-proof-id-green-20260905.tap`)을 얻었다. 일반 old payload는 계속 읽으며 section 권한만 거절한다. 정상 actual makeHandoff positive와 공백·대문자 suffix/handOff 변형도 검사했다.

## 4. 등록 수와 실행 이력

| 실행 | 실제 결과 | 해석 |
| --- | --- | --- |
| 계약 최초 RED (로컬 전용 근거: `../../../output/k3b/section-order-contract-red-20260905.tap`) | 12개: 0 PASS/12 FAIL | 당시 P inspector11/C inspector1 부재. 이후 assertion 미도달. 역사 보존 |
| P 첫 연결 (로컬 전용 근거: `../../../output/k3b/section-order-contract-first-20260905.tap`) | 같은12개: 12/12 | actual root C 연결 포함. 추가 고유12로 더하지 않음 |
| B1 backup UMD로 review baseline (로컬 전용 근거: `../../../output/k3b/section-order-review-baseline-red-20260905.tap`) | 당시 review16개: 0/16 | 원본 P exact 파일을 actual M/T로 로드. 신규 API 부재 RED이며 UI/복구 검사가 아님 |
| review 첫 구현 (로컬 전용 근거: `../../../output/k3b/section-order-review-first-20260905.tap`) | 같은16개: 16/16 | R01~R07 중 P/model 범위 |
| 추가 ID proof | B2R17 0/1 → 1/1 | 실제 첫 구현 결함, 위 §3 근거 |
| 최종 집중 (로컬 전용 근거: `../../../output/k3b/section-order-plan-focused-final-20260905.tap`) | **29/29**, 537.0667ms | 계약12 + 이번 신규17. skip/cancel/todo0 |
| 기존 선정 회귀 (로컬 전용 근거: `../../../output/k3b/section-order-plan-existing-final-20260905.tap`) | **213/213**, 1772.1156ms | 기존10파일, skip/cancel/todo0. 신규29와 파일 중복 없음 |

이번 최종 선정 고유 합계는 **242개(29+213)**다. 재실행/ID1 집중/viewport 반복을 더하지 않는다. main 별도 C10/S/E2 결과는 여기에 포함하지 않는다. 역사 characterization5는 수정·재실행하지 않았고 B2 구현 PASS로 집계하지 않는다.

기존 회귀 파일은 `personal-plan-context`, `personal-plan-source-reader`, `personal-plan-source-intent`, `personal-plan-source-draft`, `checkpoint-plan-context`, `checkpoint-source-bound-plan`, `checkpoint-source-bound-plan-review`, `personal-plan-display`, `personal-plan-display-review`, `workspace-checkpoint`의 `.test.cjs` 10개다.

## 5. 신규 17개와 요구 연결

| 실제 ID | 검증한 내용 | 검토 연결 |
| --- | --- | --- |
| B2R01 | 빈 선행 ##/gapped id·implicit+explicit·동명·CRLF positive | R06 |
| B2R02 | sourceLine/id/Step membership 위조 시 section readonly·개인 order 독립 | R06 |
| B2R03 | source B→명시 개인 A→source Undo→core memo 저장·no-op→명시 inherit | R03 |
| B2R04 | source rename 허용, 원문 재정렬/구간 이동 차단 | R01 |
| B2R05 | v1 whitespace/newline core title·memo exact, 구조 저장 후 실제 C Undo·PD 읽기 | R02/R07 |
| B2R06 | raw/source 기존 core writer의 추가·마지막 해제에도 structure exact | R04 |
| B2R07 | current/제공 Undo metadata strict·archive reserved collision | R07 |
| B2R08 | 새 section trim-exact; 내부 newline·무해한 문자열 허용 | R02 |
| B2R09 | B2 API의 core-only는 v1 유지, 구조 reset 후 v2/core/actual Undo | R04/R07 |
| B2R10 | root/entry/capture·unknown/empty 구조·기본과 같은 order 거절 | strict version |
| B2R11 | draft/metadata getter·hidden/holey 배열, getter 실행0 | strict input |
| B2R12 | unknown flag·clone·wrong-family token 거절 | opaque owner |
| B2R13 | no-op metadata0, 실제 변경의 time/revision overflow guard | transaction |
| B2R14 | actual UMD·표준 다른 realm JSON-container·ambient getter 접근0 | runtime boundary |
| B2R15 | frozen detached view와 core+구조 reset의 actual Undo·PD candidate check | R07 |
| B2R16 | current 및 reachable Undo-P의 source read 실패 차단 | R07 |
| B2R17 | normalized nonempty authored tuple proof, invalid shape의 order 독립 | main 추가 검토 |

기존 `B2A01~12`의 기능별 범위는 contract diff §7에 유지한다. R05의 기간/Calendar tie consumer, E2 actual child, browser Back/dirty focus, journal4/S/D 연결은 이 모델 결과로 닫지 않는다.

## 6. 경계 증거와 미실행

이 시험은 Node 메모리의 실제 순수 P/M/C/PD 호출이다. original raw/Steps/tasks/timeline/unknown과 입력 객체 exact를 assertion으로 확인했다. UMD fixture는 ambient `localStorage/document/window` 접근 getter가 0이었다. **운영 실사용자 profile이나 브라우저 저장소를 검사한 증거는 아니다.** 운영 fixture byte 불변과 실제 데이터 불변을 같은 표현으로 묶지 않는다.

- P 및 새 test `node --check` PASS. `npm.cmd run docs:check` PASS(required files16/local links5,857)는 문서 검사다. 전체 `npm test`/production build는 이 하위 작업에서 실행하지 않았다.
- 새 브라우저·5 viewport·실제 Android Chrome/iOS Safari·IME·보조기술 NOT_RUN. 관찰 사용자0.
- commit/push/PR/Preview/Production 없음. 사용자 HTML 생성·배포0.
- source added Item/새 section/retained ref 제거/소속 변경/**원문 순서 변경**은 명시 미지원 유지. 개인 global order는 별도 정상 기능이다.
- P 모델을 연결한 E2/S/D/기간 reader/두 UI와 마지막 사용자 HTML은 main이 각각 검증 후 판정해야 한다. 순수 모델29/회귀213이 B1 또는 B2 제품 전체 완료를 뜻하지 않는다.
