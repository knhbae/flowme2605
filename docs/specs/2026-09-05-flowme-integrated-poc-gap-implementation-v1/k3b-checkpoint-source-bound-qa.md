# K3-B B1-CS — source-aware checkpoint 검증

2026-09-05. 새 C 연결12개와 독립 보강7개가 각각 통과했다. source A→B 이후 명시 A를 보존하고 B 동값은 새 저장 후보를 만들지 않는다. source raw와 개인 raw는 여전히 별개이며, 실제 UI와 E2 v3 저장은 후속 단계다. [설계](./k3b-checkpoint-source-bound-design.md)를 따른다.

## 요구·실제 결과

| 요구 | 수정·검증 |
|---|---|
| source-aware 개인 수정 저장 | C 전체 검증→실제 P Sa/Sb token 발급→전용 action. raw-only entry는 유지 |
| 계획/원문/실행 분리 | 새 title/memo/schedule overlay만 raw metadata에 기록. source flow/task와 실행값 불변 |
| 단일 저장 후보·Undo | P의 revision+1·전체 before Undo·기존 timeline metadata를 확인한 뒤 C current/Undo 재검증. 중복 증가0 |
| 같은 내용 | 원문 B와 같은 새 명시 B, 미변경 draft는 같은 checkpoint 객체. metadata·Undo·attempt 생성0 |
| 편집 중 다른 기준 | 원문 bytes/epoch 및 raw 변화 차단. 독립 검토 후 C token에 checkpoint 전체 signature를 결합해 Undo-only·legacy whitespace drift도 차단 |
| 사본·오류·입력 | 같은 제목 다른 사본 token↔draft 교차, P-only/clone/read token, getter·symbol·hidden 필드·잘못된 candidate 거절 |
| 호환 | 기존 raw-only 동값 no-op과 metadata 없는 lazy 경로 유지. 새 source 의존성이 없으면 새 entry만 차단 |

새 inspector는 `inspectSourceBoundPersonalPlanContext(checkpoint,{flowRef,sourceRead,sourceEpoch},options?)`다. action은 `commit-source-bound-personal-plan-context`이며 context/draft/sourceRead/sourceEpoch/now만 받는다. trusted 모듈 주입은 테스트/호스트 계약이며 사용자 flag가 아니다. C가 발급한 editor token과 source reader token을 구분한다.

## 실행 이력과 개수

| 실행 | 결과 | 근거 |
|---|---:|---|
| 새12 사전 검사 | 1 PASS / 11 FAIL | RED (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/checkpoint-source-bound-red-2026-09-05T11-32-27-038Z.json`). 기존 raw-only 호환1만 PASS, 나머지는 새 API 부재 |
| 연결 후 새12 | 12/12 PASS | 첫 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/checkpoint-source-bound-first-2026-09-05T11-38-08-615Z.json`) |
| 독립 보강7 | 7/7 PASS | 독립7 (로컬 전용 근거: `../../../output/k3b/checkpoint-source-bound-review-first-20260905.tap`). 추가 제품 결함/하니스 실패0 |

고유 검사19개를 두 실행으로 확인했다. 이를 한 번의19/19 실행이라고 바꾸거나 P98/C70/D72와 중복 합산하지 않는다. 모든 GREEN에서 fail/skip/cancel/todo0, 새 C/신규12의 node syntax 검사 PASS다. root가 source-bound 설계, 최종 C diff, 새12와 독립7을 직접 검토했다.

C signature는 JSON value를 비교하므로 envelope/Undo의 harmless key 순서는 허용한다. P는 별도로 current rawState의 정확 JSON snapshot을 확인하므로 current 내부 key 재정렬은 기존대로 stale이다. 실제 저장의 expectedRaw bytes·session/observed ABA는 E2 책임이며 이 두 가지를 한 검사로 혼동하지 않는다.

## 변경 파일·한계

- [C 제품](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-checkpoint.js): SHA `6E874DEBB90EBDCAABB725914428317ED0ADCE947B88E25DE6A038FD75AB7E57`.
- 정확 이전 C (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-source-bound-checkpoint/workspace-checkpoint.js`): SHA `C0ECF88D40037677E8A3D6B2C4E02B1A39AF1F1A969E5958E9FEE13AEA2A496B`.
- [신규12](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/checkpoint-source-bound-plan.test.cjs), [독립7](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/checkpoint-source-bound-plan-review.test.cjs), 설계와 이 QA.

이 검사는 pure fixture/UMD 실행이다. storage/DOM ambient 접근0을 확인했지만 운영 사용자 localStorage를 읽어 비교한 결과는 아니다. source chain/추가 membership/owner 불명확은 기존 capability gate를 유지한다. E2 v3의 historical source snapshot 재도출·live guards·정리·재편집은 [별도 설계](./k3b-plan-source-journal-v3-design.md) 후 진행한다.

사용자 HTML은 마지막 B14A 검증본이며 새 C/P 연결을 아직 생성하지 않았다. 이 하위 작업의 npm 전체/build/브라우저5크기·Android/iOS·OS IME·보조기술은 NOT_RUN, 관찰 사용자0. commit/push/PR/Preview/Production 없음.
