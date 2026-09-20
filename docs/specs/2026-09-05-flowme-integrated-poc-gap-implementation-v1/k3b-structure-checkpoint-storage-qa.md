# B2 checkpoint·복구 분류 연결 검증

2026-09-05. [C 연결 설계](./k3b-structure-checkpoint-design.md)와 [E2 v4 설계](./k3b-structure-session-v4-design.md)의 한정 구현이다. P/E2의 추가 독립 검토가 병행 중이므로 아래는 **첫 연결·관련 회귀 증거**다. 최종 동결 모델 합동이나 B2 UI/사용자 HTML 완료로 확대하지 않는다. 사용자 HTML은 검증된 B1 FB17로 유지한다.

## C — 저장 후보의 전체 checkpoint 소유

새 `inspectSourceBoundPersonalPlanStructureContext`와 `commit-source-bound-personal-plan-structure-context`를 추가했다. 기존 P 모듈 ABI1 위의 구조 상수/네 API를 확인하고, genuine P 구조 token을 별도 `sourceStructureEditorCheckpoints`에 전체 checkpoint signature로 등록한다. B1 source registry와 섞이지 않는다. C envelope/key/version2, 기존 action과 Undo 규칙은 그대로다.

새 검사 `checkpoint-structure-plan.test.cjs`는 실제 M 작성 두 사본과 C/P source context를 사용한다. raw flows/tasks/Step 소속·orders/timeline metadata·unknown 문자열을 유지하고, 성공마다 revision+1·전체 before Undo·legacyBaseRaw exact를 검사한다. 원문 bytes/epoch/read 오류, 다른사본/clone/read/B1/rawP token, current/Undo/legacy drift, getter0, current/Undo 구조 손상, v1→v2/실제Undo, 구조 뒤 기존 B1 core 편집 보존을 포함한다.

- 최초 RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-checkpoint-red-2026-09-05T13-53-43-112Z.json`): **0 PASS / 10 FAIL**. C 신규 API 부재로 이후 assertion 미도달.
- 첫 실제 연결 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-checkpoint-first-2026-09-05T14-19-18-456Z.json`): **10/10 PASS**,495.4137ms,skip/cancel/todo0. P 추가 회귀 중 실행이며 최종 전체 동결을 뜻하지 않는다.
- C 이전 exact 백업: `output/poc-gap-implementation/k3b/before-structure-checkpoint/workspace-checkpoint.js`, SHA `6E874DEBB90EBDCAABB725914428317ED0ADCE947B88E25DE6A038FD75AB7E57`.
- C 연결 SHA `835FF4320FC8278882876BEDE60AA392734341E4C300309FF9A47515818CF600`.

C 순수 시험은 저장 I/O를 사용하지 않는다. 단일 candidate/Undo와 localStorage API 호출 수는 다른 단위다. 실제 C Undo의 `updatedAt` 예외만 기존 M 규칙으로 대조했고 다른 값을 자동 정리하지 않았다.

## S — v4를 실제 E2 decoder로 전달

`workspace-storage.js`의 `journalFamily`에 **version4 + 정확한 source-bound draft contract v2** 한 분기만 추가했다. editor라는 분류는 힌트일 뿐이며 실제 E2 historical snapshot→C action 재도출 검사를 대신하지 않는다. v4/v3 contract 혼합·다른 target·action contract 혼합은 unknown이다. pending에서는 일반 workspace/삭제/reset 준비도 계속 차단한다.

새 `workspace-structure-editor-recovery.test.cjs` 8개는 실제 E2로 v4 기록을 만든다. order-only와 core-only를 구분해 metadata가1이어도 실제 세션의 journal4임을 검사한다. prepared/confirmed/손상 snapshot/계약 혼합·명시 cleanup/recovery·old journal·read 오류·정리 뒤 정상 준비를 포함한다.

- 의존 기능 준비 전 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-storage-routing-pre-feature-2026-09-05T14-16-35-366Z.json`): **0/8 PASS**. C가 아직 없는 P 구조 API를 열 수 없어 fixture 생성에서 중단했다. S 분기 결함 재현으로 세지 않는다.
- 실제 v4 생성 뒤 첫 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-storage-routing-first-2026-09-05T14-19-19-397Z.json`): **4 PASS / 4 FAIL**. 4개 모두 현행 S가 v4를 unknown으로 분류하는 차이였다. E2 실제 저장·historical decode·cleanup/recovery의 positive 경로는 수행됐다.
- 한 분기 수정 뒤 합동 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-storage-routing-revised-2026-09-05T14-20-25-561Z.json`): **70/70 PASS** = 신규8 + 기존editor분류8 + 기존S54,859.8083ms,skip/cancel/todo0. 새 test 파일 외 기존 기대는 변경하지 않았다.
- S exact 백업: `output/poc-gap-implementation/k3b/before-structure-storage-routing/workspace-storage.js`, SHA `27135C0BFBE274D7A93216102EE2BB85B0AA0B995CD1809FFA1F436C0778E284`.
- S 연결 SHA `387B90EBC23EBCF9C8EA7816D64F1DD2889214F08B4962732A645E1E7A765CE9`.

## 저장 경계와 분모

새 S 각 fixture는 target1+journal2의 실제 허용 API3회로 confirmed 상태를 만든다. journal cleanup은 별도 remove1이며 따라서 완결 UI 저장4호출과 구별한다. 초기 read/open/자식 없는 준비 단계는 쓰지 않는다. phase 변형·손상·old journal은 native Map fixture 주입으로, 제품 호출 수에 섞지 않는다.

새 S 시험마다 operating sentinel `flow:operating:b2-structure-routing`의 정확 문자열·CRLF/공백, 원본 legacy key 부재, source key 부재를 확인한다. 제품 setItem/removeItem은 해당 E2 target/journal 두 key 외 호출을 즉시 실패시키며 clear도 금지한다. 실제 사용자 profile이나 서버 운영 자료를 검사/삭제한 것이 아니다. reset/일반 쓰기/영구삭제는 정리 뒤 준비 positive만 검증하고 실제 dispatch는0이다.

신규8과 기존62를70에 다시 더하지 않고, C10도 요구사항 충족 수로 환산하지 않는다. E2 신규18·기존190, P12+보강, D/PD 경계, 읽기 순서 소비자·브라우저는 각각 별도 gate다.

실제 Android/iOS/OSIME/OSBack/보조기술 NOT_RUN, 관찰 사용자0. 이 하위 작업의 npm 전체/production build/브라우저는 아직 실행하지 않았다. B1 때의2,250/2,250·build PASS를 B2 최종 검증으로 옮겨 적지 않는다. commit/push/PR/Preview/Production 없음.
