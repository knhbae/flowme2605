# K1-B 모델 QA — 편집 세션과 저장 복구

작성일: 2026-09-05. **모델 74/74 PASS. K1-B 화면·브라우저·전체 회귀의 최종 판정은 이 문서 범위가 아니다.**

이 문서는 [K1-B 설계](./k1b-design.md)의 M01–M14와 [저장 복구 보완 계약](./k1b-recovery-addendum.md)을 새 모듈의 실제 시험에 연결한다. root 통합 QA의 입력 문서이며 별도의 제품 완료 선언이나 정책 변경 기록이 아니다. 이번 문서 작업에서 동결된 제품·테스트 파일은 수정하지 않았다.

## 1. 실행 근거와 소유 범위

검증 대상은 standalone assets의 아래 두 파일이다.

- `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.js`
- `docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.test.cjs`

하위 작업은 위 신규 모듈·테스트만 구현했다. 기존 `app.js`, `model.js`, builder, 생성 HTML과 전체 QA는 root의 별도 통합 범위다. 기존 운영 `/my`, 저장 schema와 writer는 이 모듈에서 호출하거나 변경하지 않는다.

| 근거 | 실제 결과 | 해석 |
|---|---|---|
| 최종 실행 metadata (로컬 전용 근거: `../../../output/poc-gap-implementation/k1b/durable-model-2026-09-05T05-07-40-727Z.json`) / 전체 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1b/durable-model-2026-09-05T05-07-40-727Z.log`) | 2026-09-05 05:07:40.729–05:07:41.046 UTC, exit 0, **74 PASS / 0 FAIL / 0 skip / 0 cancelled / 0 todo** | root가 동결 소스로 다시 실행한 원장. Node test runner가 보고한 실행 시간은 232.8363ms |
| 복구 보완 전 50건 metadata (로컬 전용 근거: `../../../output/poc-gap-implementation/k1b/session-model-2026-09-05T04-48-48-946Z.json`) / 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1b/session-model-2026-09-05T04-48-48-946Z.log`) | 50/50 PASS | 이 50건을 유지하고 durable 복구 24건을 더했다. 최종 74건에 포함되므로 합산하지 않음 |
| 하위 작업의 최종 재실행 | 74/74 PASS, skip 0 | 같은 74건의 반복 실행. 별도 신규 검증 74건으로 더하지 않음 |
| `node --check plan-item-session.js` | PASS | 문법 검사. 브라우저 동작 증거가 아님 |
| 신규 두 파일의 `git diff --no-index --check -- NUL <file>` | 공백 오류 0 | LF→CRLF 경고는 있었으나 공백 오류가 아님 |
| scoped `workflow:closeout` | 소유 범위 untracked 2개 확인 | 체크 목록을 출력하는 도구이며 테스트를 대신 실행하지 않음 |
| 이 QA 문서의 `npm run docs:check` | PASS — required files 16개, local links 4,831개 | 문서 검사이며 제품 테스트 건수에 더하지 않음. 이 문서의 실제 링크 8개도 존재 확인 |

실제 실행 명령은 격리 worktree에서 다음과 같다.

```text
node --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-item-session.test.cjs
```

현재 파일을 다시 읽어 확인한 SHA-256은 아래와 같다. 동결 이후 제품 변경이 생기면 이 해시와 74건 판정을 그대로 재사용하지 않는다.

| 파일 | SHA-256 |
|---|---|
| `plan-item-session.js` | `B07A7A3A2F3B50916764FE26C4D917937E9856CA1F5602F2044DFC6BCD9961C9` |
| `plan-item-session.test.cjs` | `D3DA224828A6DFBC7E7E85B24F47E24C5C16894CCD4C32BEF419B4211DE921A5` |

## 2. 실제 74건의 구성

아래 `T01–T74`는 최종 로그의 실행 순서에 붙인 **이 QA 문서 안의 표식**이다. 새 제품 요구사항 ID가 아니다. 각 범위는 해당 로그에서 중복 없이 셀 수 있다. 하나의 test 안에서 여러 값을 순회하는 assertion은 독립 test 수로 부풀리지 않았다.

| 실행 범위 | 건수 | 검사한 내용 |
|---|---:|---|
| T01–T02 | 2 | UMD/CommonJS API, in-memory version, baseline/draft 독립 복사·동결, DOM을 포함할 수 있는 opaque return point 비동결 |
| T03–T14 | 12 | Plan/Quick × cancel/back/x/backdrop/escape/browser-back의 clean 닫기 판단. DOM 클릭이나 실제 browser Back은 아님 |
| T15–T23 | 9 | exact dirty·원복·invalid·ABA revision, Quick 날짜/폴더/메모, 확인만 취소, 같은 제목의 다른 Item identity, 부모/자식 폐기·반영, stale 부모, child 최종 저장 금지 |
| T24–T29 | 6 | candidate 검증·고정, clean/noop/stale 0쓰기, Plan/Quick 단일 target 성공, 최초 read 오류 |
| T30–T39 | 10 | 기존 단일 target adapter의 throw-before/after, null before remove 복구, wrong readback, 외부 drift, rollback 쓰기/읽기 실패와 확증 불가 잠금 |
| T40–T43 | 4 | submitting/recovery의 모델 입력·닫기·submit 차단, 같은 intent retry, 편집/폐기/새 세션 이후 stale attempt, 중복 dispatch/outcome 소비 차단 |
| T44–T50 | 7 | 실제 standalone 모델의 Plan/Undo, 네 saved-plan origin+authored의 child staged apply와 최종 저장·reload, 실제 Quick 편집 및 source/execution/다른 copy 보존 |
| **기존 session/단일 target 합계** | **50** | durable 보완 후에도 유지된 기존 50건 |
| T51–T56 | 6 | prepared→target→confirmed 순서, 각 중간 snapshot의 fresh-runtime 읽기, 초기 read/stale/noop 0쓰기, 미해결 journal의 noop 우회 금지, prepared 쓰기 실패·foreign journal |
| T57–T60 | 4 | target 실패와 검증된 복구·journal 정리, rollback 실패 후 candidate가 남는 reload gate, confirmed throw-before/after 구별, commit-uncertain |
| T61–T62 | 2 | 기존 confirmed record에서 다음 명시 저장으로 교체하는 경계, corrupt/unknown-version/foreign/unreadable 초기 읽기 |
| T63–T66 | 4 | target before/candidate 각각의 명시 복구·새 session draft 복원, confirmed를 복구로 롤백하지 않기, foreign 보존, 복구/cleanup 실패와 재요청 |
| T67–T69 | 3 | confirmed cleanup은 journal만 제거, stale prepared로 새 record를 지우지 않기, throw-after 삭제·정리 확증 불가, durable replay/outcome 중복 차단 |
| T70–T72 | 3 | cleanup 완료를 읽지 못한 뒤 absent+before 멱등 복구, 최초 journal read 실패 후 known attempt의 명시 재확인, prepare/confirm/remove 직전 journal drift |
| T73–T74 | 2 | 실제 모델 Plan/Quick durable 저장→읽기 전용 confirmed 재로드→명시 cleanup, 정확한 두 PoC key 경계 |
| **durable 보완 합계** | **24** | **전체 74건** |

## 3. K1-B 설계 M01–M14 매칭

`모델 PASS`는 순수 입력/결과나 주입 저장소에서 확인했다는 뜻이다. `부분—통합 별도`는 요구에 실제 DOM·history·전역 dispatcher가 포함되어 모델만으로 닫을 수 없다는 뜻이다.

| 설계 ID | 실제 근거 | 이 문서의 판정과 남은 경계 |
|---|---|---|
| M01 clean × close reason | T03–T14, T20 | **모델 PASS.** Plan/Quick 6가지 reason, dirty 부모의 clean child Back 확인. 실제로 존재하지 않는 standalone 전체 페이지 backdrop을 구현·조작했다고 주장하지 않음 |
| M02 필드 변경·원복·invalid | T15–T16, T23, T25 | **모델 PASS.** 구조적 exact equality, 공백·줄바꿈·날짜·폴더와 invalid 보존. 브라우저 input의 실제 조합/선택은 별도 |
| M03 부모 dirty + 자식 clean/dirty | T19–T20 | **모델 PASS.** child discard 뒤 부모와 이전 적용값 보존. 실제 Item 행 focus는 별도 |
| M04 child 반영/재편집/Plan 전체 버리기 | T19, T21, T45–T49 | **모델 PASS.** 부모 메모리만 반영하고 원본 입력 객체/저장 before 불변. 실화면의 영향 요약·복귀 동작은 별도 |
| M05 동일 제목·origin·scope | T18, T21–T22, T45–T50 | **모델 PASS.** id/ref·부모 scope, 네 origin+authored와 Quick owner 분리. 같은 제목으로 재결합하지 않음 |
| M06 확인 중 반복 Escape/X/Back/이중 discard | T17, T19–T20 | **부분—통합 별도.** 확인 중 Escape/Back은 확인만 해제하고 rearm intent 반환. 실제 반복 클릭·event 전파·부모 연쇄 닫힘은 74건에서 브라우저로 검사하지 않음 |
| M07 submitting/recovery의 입력·닫기·배경 차단 | T23, T40, T58, T60 | **부분—통합 별도.** 모델의 update/close/child-open/submit/retry는 차단. 전역 Undo/move/reset/sidebar/toast handler와 화면 비활성은 root 통합 범위 |
| M08 read/stale/noop/validation 0쓰기 | T24–T29, T53–T56 | **모델 PASS.** 초기 실패/같은 bytes/stale target은 journal 포함 0쓰기. prepare 후에 발견된 drift는 target 0쓰기와 journal 시도를 구분 |
| M09 write/readback 실패 + rollback 성공 | T30–T33, T37, T57 | **모델 PASS.** before exact bytes·draft 유지·recoverable-error. 쓰기 시도와 rollback 호출은 최종 데이터 변경과 별도로 계수 |
| M10 rollback 불확실/foreign | T34–T39, T58–T60, T62, T65–T68, T72 | **모델 PASS.** recovery-required/commit-uncertain, 감지한 제3값 보존, confirmed 단계 오류를 prepared rollback으로 잘못 보내지 않음 |
| M11 같은 attempt retry→성공 | T41, T57, T69 | **부분—통합 별도.** 단일 target의 동일 intent 재시도 성공/close 1회, durable 실패 뒤 같은 retry 허용·outcome 중복 소비 금지 확인. 실제 durable UI retry→receipt/Undo/focus 전 과정은 별도 |
| M12 실패 뒤 입력/폐기/새 세션과 오래된 retry | T42–T43, T63–T64, T69–T71 | **모델 PASS, coordinator 전제 있음.** 현재 session을 전달했을 때 stale attempt write 0. 순수 모델은 외부 closure가 보관한 과거 snapshot을 전역 폐기하지 않으므로 UI callback은 현재 active sessionId/attemptId를 재확인해야 함 |
| M13 foreign/중복/없는 history marker | T08, T14, T17, T40의 browser-back intent만 | **이 모델에서 전체 미검증.** marker/pushState/popstate/consume/앞뒤 이동 구현은 `app.js`에 있다. rearm 결과를 실제 history 동작 PASS로 바꾸지 않음 |
| M14 저장·Undo·decode/reload와 source 불변 | T44–T50, T52, T63–T64, T73–T74 | **모델 PASS.** 실제 M transition/검증/Undo와 memory storage 재생성 확인. 실제 브라우저 reload 및 운영 profile 데이터 검사는 별도 |

## 4. 저장 복구 보완 계약 매칭

| 계약의 질문 | 실제 모델 근거 | 판정 |
|---|---|---|
| 기존 target/schema와 운영 writer를 유지하는가? | T01, T44–T50, T51, T73–T74. 기존 M validator/transition을 사용하고 별도 일반 writer를 호출하지 않음 | PASS—모델 범위 |
| target 전 prepared journal의 exact readback이 필요한가? | T51–T52, T55–T56 | PASS. journal 검증 전 target 쓰기 없음 |
| candidate가 남아도 미확정 상태를 reload에서 구별하는가? | T52, T58–T60 | PASS. fresh UMD runtime + 저장소 snapshot에서 prepared/confirmed를 구별; 실제 브라우저 reload 아님 |
| confirmed 쓰기 throw-after를 rollback으로 오인하지 않는가? | T59–T60 | PASS. confirmed+exact candidate는 committed; 읽기 불가는 commit-uncertain |
| 시작 시 자동 복구/cleanup을 하지 않는가? | T52, T62, T73–T74 | PASS. `loadRecovery` 호출의 mutation 0 |
| prepared 복구만 이전 값으로 돌아가는가? | T63–T66, T70 | PASS. before/candidate exact 소유일 때만 명시 복구. confirmed/foreign은 복원 금지 |
| 미저장 root draft를 새 session으로 다시 여는가? | T63–T64, T71 | PASS. baseline/draft 보존, 새 sessionId, 이전 attempt 없음, 자동 저장 없음 |
| confirmed cleanup이 새 기록·target을 훼손하지 않는가? | T61, T65, T67–T68, T72 | PASS. exact journal 직전 검사, target 쓰기 0, absent+candidate 재확인으로 멱등 정리 |
| 최초 journal read 실패나 cleanup 관찰 실패도 다시 확인 가능한가? | T68, T70–T71 | PASS. known prepared 후보와 **실제 저장된 journal**을 구별하고 명시 동작으로만 absence+before/candidate를 검증 |
| 실제 UI의 reset/Undo/일반 writer가 gate를 우회하지 않는가? | 모델 locked 결과까지만 T40/T58/T60 | **통합 검증 별도.** 이 74건으로 DOM·전역 handler 완료 판정하지 않음 |

## 5. 저장 호출과 commit의 정확한 의미

허용 저장 대상은 다음 두 key뿐이다. journal은 PoC 보완 계약이며 운영 schema나 범용 transaction store가 아니다.

| 역할 | exact key |
|---|---|
| 기존 내용 target | `flow:poc:personal-workspace:v1:standalone-integrated` |
| 복구 기록 | `flow:poc:personal-workspace:v1:standalone-plan-item-recovery:v1` |

정상 durable 저장의 모델 호출은 `journal prepared set → target set → journal confirmed set`이다. 각 단계에서 exact bytes를 다시 읽는다. **내용 target write 1회, journal set 2회**이며, coordinator의 정상 cleanup까지 하면 **journal remove 1회가 추가**된다. 이를 ‘전체 저장 호출 1회’라고 보고하면 틀리다.

| 상태/행동 | 내용 target mutation 호출 | journal mutation 호출 | 성공 해석 |
|---|---:|---:|---|
| 입력·dirty 판단·취소·child staged apply | 0 | 0 | 저장 성공 아님 |
| 최초 read 실패·stale before·같은 bytes | 0 | 0 | 저장하지 않음. 미해결 journal을 noop으로 우회할 수 없음 |
| 정상 durable 저장 | set 1 | prepared set 1 + confirmed set 1 | confirmed+exact candidate 증거로 commit |
| 정상 confirmed cleanup | 0 | remove 1 | 이미 확정된 저장의 기록 정리이며 새 내용 저장 아님 |
| prepared 이후 target set 시도 실패·검증된 rollback | 시도 및 필요한 rollback 호출을 각각 기록 | prepare/cleanup 시도를 별도 기록 | before 복원이 확인된 실패. 시도 수가 곧 성공 mutation 수는 아님 |
| prepared 명시 복구, target이 candidate | before set 또는 null-before remove 1 | 소유 journal cleanup | 이전 상태 복원. 새 candidate 저장 성공 아님 |
| prepared 명시 복구, target이 이미 before | 0 | 필요한 cleanup만; 이미 absent이면 0 | 재요청의 중복 target 쓰기 없음 |
| confirmed write 뒤 읽기 불가 | candidate가 남을 수 있음 | confirmed가 남을 수 있음 | 메모리에서는 commit-uncertain. 복원됐다고 추정하거나 target을 롤백하지 않음 |
| 새로고침의 confirmed+candidate | 0 | 0 | durable commit 발견. UI 영수증을 보았다는 증거나 새 runtime 성공 횟수 1이 아님 |

`outcome.writeCount`, `rollbackWriteCount`, `journalWriteCount`는 시도된 호출 수다. `loadRecovery`는 읽기만 한다. 주입 저장소의 `flow:operating:sentinel` 값은 해당 모델 여정 전후 exact bytes가 같으며, target/journal 밖 mutation 호출과 `Storage.clear()`는 이 경계 시험에서 허용되지 않는다. 이것은 테스트 메모리 저장소 증거이지 실제 사용자의 브라우저 profile/backend 전체 불변 증거는 아니다.

이 구현은 **localStorage의 native atomic CAS가 아니다.** 동기 `getItem → exact 비교 → setItem/removeItem → readback`과 감지한 외부 변경 보존이다. 별도 호출 사이의 모든 다중 탭·프로세스 race를 원자적으로 배제한다고 주장하지 않는다. 실제 storage의 제약을 새 동기화 정책으로 해결한 것도 아니다.

confirmed record는 모듈 성공 시 즉시 삭제하지 않는다. root coordinator가 cleanup 성공을 확인한 뒤 일반 writer를 재개한다. cleanup 실패는 ‘저장 완료·정리 확인 필요’이며 prepared 실패의 ‘이전 상태 복구’와 다르다. startup 역시 자동 cleanup 없이 명시적인 처리 경로를 제공해야 한다.

## 6. 중간 실패와 검증 도구 수정 이력

### 새 모델 테스트의 초기 assertion 오류

초기 43건 실행은 **42 PASS / 1 FAIL**이었다. `child applies only title/memo/planDate...`에서 독립 복사된, 내용이 같은 다른 Item 객체를 참조 동등성으로 비교한 것이 원인이었다. 계약은 기존 객체 참조 공유가 아니라 값 보존이므로 이 신규 assertion을 `deepEqual`로 고쳤다. 보존할 제품 값을 바꾸거나 실패 케이스를 삭제하지 않았다.

이 초기 출력은 하위 작업 도구 실행 결과에 남았으며 별도 파일 로그로 보관하지 않았다. 이후 44/44, 50/50을 거쳐 위 root의 **동결 74/74 로그**로 재확인했다. 중간 반복 실행을 새 고유 test 수로 합산하지 않는다.

### 별도 standalone 119건 회귀의 당시 실패

root의 05:08:45 UTC 회귀 metadata (로컬 전용 근거: `../../../output/poc-gap-implementation/k1b/standalone-adapter-contract-2026-09-05T05-08-45-255Z.json`)와 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k1b/standalone-adapter-contract-2026-09-05T05-08-45-255Z.log`)는 **118 PASS / 1 FAIL, exit 1**이다. 앞서 inline 구현 구조를 기대하던 정규식 두 곳을 현재 adapter 구조에 맞춘 뒤 남은 실패다.

남은 test는 `standalone sources contain no broad clear or operating writer`이며 `1 !== 0`으로 실패했다. root 조사상 메모리 `Map.clear()`를 금지된 `localStorage.clear()`로 함께 세는 정적 정규식 오탐이다. 이 분류는 **119건이 통과했다는 뜻이 아니다.** 당시 실행은 실패로 보관하고, 검사기의 정당한 대상 구분 후 재실행한 최종 결과는 root 통합 QA에서 확정한다. 이 모델 QA 문서는 119건을 74건에 합치거나 제품 storage 실패로 단정하지 않는다.

## 7. 통합 검증과 분리할 항목

모델 테스트의 `browser-back`은 reason 값과 rearm effect 검사다. `reload`는 저장소 snapshot을 다시 만들고 decoder 또는 fresh UMD runtime을 실행하는 검사다. 실제 browser navigation, OS Back, 화면 캡처, 기기 검사를 수행한 것이 아니다.

| 항목 | 이 문서의 상태 |
|---|---|
| 신규 모델·저장 회귀 | **74/74 PASS** |
| 별도 기존 standalone 119건 | 위 timestamp 실행은 **118/119**, 최종 root QA 대기 |
| K1-B 브라우저 19개 / 관련 60개 검사 묶음 | root·브라우저 담당이 별도로 진행. 이 문서에서는 완료/통과 수로 계상하지 않음 |
| 실제 Plan/Item/Quick 확인창, focus/selection/scroll, Tab/Shift+Tab, pointer/hit-test | 모델 파일 작업에서는 미실행; root 실제 UI 증거 필요 |
| 실제 synthetic history marker·popstate·앞뒤 이동 | 모델 파일 작업에서는 미실행 |
| 390×844·375×812·844×390·1024×768·1440×900 overflow/CTA/console/page error | 모델 파일 작업에서는 미실행; 화면별 QA와 분리 |
| `npm test`, production build, 생성 HTML 동기화 | root 통합 범위. 74건으로 대체하지 않음 |
| 실제 Android Chrome / iOS Safari / OS Back / 가상키보드 / 보조기술 | **NOT_RUN** |
| 관찰 사용자 | **0명** |
| commit / push / PR / Preview / Production | 이 하위 작업에서 **미실행** |

K1-B 전체 충족 판정은 M06/M07/M11/M13의 통합 조건과 실제 브라우저·회귀 결과를 합친 뒤 root가 내린다. 모델 74건의 PASS만으로 다음 제품 단계나 배포를 승인하지 않는다.
