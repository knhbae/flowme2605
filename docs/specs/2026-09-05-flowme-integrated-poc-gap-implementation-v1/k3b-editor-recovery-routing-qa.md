# K3-B — 편집 journal v2/v3 복구 라우팅 QA

2026-09-05. 최신 결과는 **신규 8개 + 기존 S 54개 = 62/62 PASS**다. 처음에는 root의 실행 로그와 source diff를 읽기만 했고, 이후 승인된 ER04 시험 보강과 같은 62개 재실행을 이 문서 작성자가 수행했다. 제품 변경은 0건이다.

## 0. 최신 — ER04 유효 입력과 정상 준비 대조 완료

처음 검토에서 찾은 `{}` 삭제 입력의 한계를 보강했다. 실제 Quick `meeting`을 순수 C transition으로 휴지통에 옮긴 뒤, 다른 Flow의 개인 제목을 실제 E2로 저장하여 pending confirmed journal을 만들었다. 이 저장의 최종 checkpoint revision, 정확한 삭제 대상, `confirmed:true`, source raw를 삭제 요청에 사용했다.

- pending일 때 유효한 workspace 쓰기·reset·삭제 준비가 모두 정확한 사전 거절 사유로 차단된다. API 쓰기 0, journal 보존이다.
- 명시 `clearConfirmedRecovery` 뒤에는 동일한 세 준비가 모두 `ok:true`, `changed:true`, `prepared`를 반환한다. 정리는 journal remove 정확히 1회뿐이다.
- 준비한 삭제·reset·일반 workspace 쓰기는 **dispatch하지 않았다**. 준비 전후 target bytes와 삭제 대상의 존재를 확인했고, legacy/source/운영 sentinel bytes도 보존했다.

v2의 삭제 대조 fixture에는 clean seed를 사용했다. 기존 `legacyFixture`의 owner 불명 unknown 필드를 지워 통과시키지 않았으며, 그 fixture는 나머지 라우팅 검사에 그대로 남겼다. v3은 실제 source-update fixture를 유지했다. 두 version 내부 반복은 ER04 한 개 등록 안의 대조이며 신규 검사 수를 늘리지 않는다.

보강 후 실행 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/editor-recovery-routing-positive-control-20260905-01.tap`): **62/62 PASS**, fail/skip/cancel/todo 0, Node duration **983.4559 ms**. 보강 후 첫 실행이 통과했다. 이전 RED·GREEN 근거는 아래에 보존했다.

## 1. 해결한 연결 갭

[설계](./k3b-editor-recovery-routing-design.md)와 [S](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-storage.js)의 `journalFamily`를 대조했다. 기존 코드는 record version1만 editor로 분류했다. E2가 생성한 유효한 raw Plan v2/source-bound Plan v3는 unknown이 되어 담당 E2 복구 경로로 전달되지 않았다.

변경은 `journalFamily` 한 분기의 읽기 힌트다. 고정 workspace target에 대해 v2 raw Plan contract와 v3 source-bound Plan contract를 추가로 editor로 분류한다. version1과 기존 action contract 분기는 유지한다. 새 key/writer/자동 cleanup/TTL·운영 schema·제품 정책을 추가하지 않았다.

이것은 신규 E2 연결 경로의 갭이다. 기존 사용자 HTML B14A에서 이미 재현한 오류라고 소급하지 않는다. app 화면·file URL·사용자 HTML의 실제 복구 흐름은 여기서 검사하지 않았다.

## 2. 분류 힌트와 권한은 다르다

| 단계 | 실제 책임 |
| --- | --- |
| S `journalFamily` | 어느 decoder로 보낼지 선택. exact target/version/contract의 힌트 |
| S `loadWorkspace` | pending journal이 하나라도 있으면 `ok:false`, `checkpoint:null`, `checkpoint-recovery-required`. 분류만으로 workspace를 열지 않음 |
| E2 `loadRecovery` | 정확 필드, source snapshot, before/baseline/draft/C candidate 재도출, phase·target 소유권 판정 |
| E2 명시 prepared 복구 | 소유 before 복원만 허용. confirmed를 rollback하지 않음 |
| E2 명시 confirmed 정리 | journal 제거만 허용. source-bound 재편집에는 현재 source 재조회가 별도로 필요 |

알려진 계약의 손상 기록은 editor 경로를 받을 수 있지만 E2는 blocked로 판정한다. 알 수 없는 version/contract/외부 target은 unknown으로 남는다. `contract` 필드가 있는 action 분기를 먼저 검사하므로 foreign action contract를 editor로 우회하지 않는다.

S의 `prepareWrite`·`sameAuthority`·`preparePermanentDelete`는 실제 발급 packet과 `packet.ok`를 요구한다. pending snapshot이 있으면 workspace 쓰기/reset/명시 삭제 준비를 통과시키지 않는 코드를 직접 확인했다. source snapshot이 남아 있는 상태를 private 데이터 삭제 완료로 표현해서는 안 된다.

## 3. 실제 이력 — 제품 RED와 하니스 오류 분리

아래 시간은 로그의 UTC다. 모두 2026-09-05이며, 재실행을 합쳐 고유 검사 수를 늘리지 않는다.

| 단계 | 등록/실행 | 결과 | 분류 |
| --- | ---: | --- | --- |
| 12:04:46 첫 RED | 8 | 2 PASS / 6 FAIL | 5개는 unknown/editor 라우팅 결함. ER05 1개는 confirmed 기록에 prepared recovery API를 호출한 하니스 오류 |
| 12:05:24 corrected RED | 8 | 3 PASS / 5 FAIL | ER05를 `clearConfirmedRecovery`로 정정. 남은 5개는 모두 unknown/editor 기대 차이 |
| 12:05:26 제품 변경 후 | 62 | 62 PASS | 신규 8 + 기존 S 54. Node duration 1,410.221 ms. skip/cancel/todo 0 |
| ER04 positive control 보강 후 | 62 | 62 PASS | 같은 신규 8 + 기존 S 54. 유효 준비의 차단/정상 대조 추가, 제품 변경 0. Node duration 983.4559 ms |

근거는 첫 RED JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/editor-recovery-routing-red-2026-09-05T12-04-46-478Z.json`)/로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/editor-recovery-routing-red-2026-09-05T12-04-46-478Z.log`), 정정 RED JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/editor-recovery-routing-red-corrected-2026-09-05T12-05-24-416Z.json`)/로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/editor-recovery-routing-red-corrected-2026-09-05T12-05-24-416Z.log`), GREEN JSON (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/editor-recovery-routing-first-2026-09-05T12-05-26-336Z.json`)/로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/editor-recovery-routing-first-2026-09-05T12-05-26-336Z.log`)다.

```powershell
node --test docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-editor-recovery-routing.test.cjs docs/content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-storage.test.cjs
```

## 4. 신규 8개의 실제 매핑

[새 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/workspace-editor-recovery-routing.test.cjs)은 손으로 흉내 낸 journal이 아니라 실제 E2 create/update/begin/write로 기록을 만든다. prepared 검사에서는 해당 생성 기록의 phase만 테스트 fixture에서 바꾼다.

| 등록 | 확인한 내용 |
| --- | --- |
| ER01 v2 prepared | editor route, S blocked/checkpoint 없음, E2 prepared, load 쓰기 0 |
| ER01 v2 confirmed | editor route, S blocked/checkpoint 없음, E2 confirmed, load 쓰기 0 |
| ER01 v3 prepared | 실제 snapshot 포함 기록의 같은 경계 |
| ER01 v3 confirmed | 실제 snapshot 포함 기록의 같은 경계 |
| ER02 | foreign version/contract/target/mixed action contract는 unknown, E2 blocked, 쓰기 0 |
| ER03 | 알려진 family라도 corrupt source snapshot 또는 foreign baseline은 E2 blocked |
| ER04 | 유효한 trashed Quick·최종 revision·source raw와 유효 workspace 후보로 pending 준비 거절. 명시 confirmed 정리 뒤 세 prepare 정상 성공. 실제 dispatch 0, target bytes·대상 존재 보존 |
| ER05 | 명시 confirmed cleanup만 journal remove 1, target bytes 그대로, 그 뒤 S workspace 읽기 성공 |

내부 version 반복을 독립 등록 수로 중복하지 않았다. 이 8개가 [E2 v3 181개](./k3b-plan-source-session-v3-qa.md)의 재실행이라고 표현하거나 총합에 겹쳐 더하지 않는다.

## 5. 저장·source·운영 경계 증거

시험 storage는 Map이며 set/remove는 고정 checkpoint target와 journal만 허용한다. clear는 호출하면 실패한다. 각 검사에서 source key raw, 기존 legacy raw, 운영 sentinel `flow:operating:editor-routing`의 공백·CRLF·한글·emoji bytes를 비교했다.

조회 전후 API 배열 길이는 같아야 한다. ER04와 ER05는 각 version의 cleanup 전후 차이가 journal remove 정확히 1개이고 target bytes는 그대로인지 검사한다. ER04 정상 prepare 이후 API 호출도 추가되지 않는다. setup의 E2 저장 호출과 S/E2 read-only 조회를 구분했다. 전체 62개의 API 호출 합계는 이 로그에서 별도로 계수하지 않았으므로 총합을 만들지 않았다.

source key write/rollback·운영 key 변경·허용 pair 밖 mutation·clear 호출은 신규 시험에서 허용하지 않는다. 실제 사용자 profile/localStorage를 읽은 증거가 아니라 **합성 메모리 저장소의 경계 증거**다.

## 6. 독립 읽기 검토와 보강점 이력

백업 대비 S diff 전체와 `loadWorkspace`/`sameAuthority`/`prepareWrite`/`prepareReset`/`preparePermanentDelete`, 신규 시험 전체 및 세 실행 결과를 읽었다. 수정은 target/version/contract 분류에 국한되고 실제 writer/decoder 권한을 바꾸지 않는다. 즉시 차단할 새 제품 결함은 발견하지 못했다.

**최초 검토 당시 보강점:** ER04의 삭제 입력은 `{}`였다. `ok:false`만 확인하므로 유효한 삭제 요청도 pending journal 때문에 차단되는지를 그 assertion 하나로 충분히 입증하지는 못했다. 실제 코드의 `!packet.ok` 사전 차단은 확인했다. 유효한 trashed target·confirmed·expectedRevision·sourceRaw로 pending 전/후를 비교하거나 정확한 사전 거절 사유와 정상 준비 positive control을 추가하도록 root에게 전달했다. 기존 [삭제 storage 시험](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/plan-context-delete-storage.test.cjs)에 정상 준비 fixture가 있지만 이번 62개 실행 목록에는 포함하지 않았다.

이 보강점은 S 분류가 삭제 권한을 열었다는 제품 결함 판정이 아니었다. 이후 root의 승인 범위에서 시험만 보강했으며 §0의 정상 준비 대조와 62개 재실행으로 해당 증거 부족을 해소했다. 기존 시험의 판정 강도를 낮추거나 unknown owner 보호 규칙을 바꾸지 않았다.

## 7. 자료와 미실행 범위

| 자료 | SHA-256 | 크기 |
| --- | --- | ---: |
| 변경 전 S 백업 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-editor-recovery-routing/workspace-storage.js`) | `668EF7980ACFD4D3F6D36CB4D6C7B8DD1452002B61A0AB92995F83259E6A7866` | 백업 |
| S 변경 후보 | `27135C0BFBE274D7A93216102EE2BB85B0AA0B995CD1809FFA1F436C0778E284` | 24,306 bytes |
| 최초 GREEN 라우팅 시험 — 과거 후보 | `657164F1517BB8B0CFE5DC850D8DBB380F5F2621B2282910EA5DAAAD00C8CE51` | 5,986 bytes |
| ER04 보강 후 라우팅 시험 — 현재 | `162738856DC01CC58BF05F4324CCD3D449A92CA87F1A72A93E00AAFF0E67C80D` | 8,827 bytes |

처음 읽기 검토에는 제품·시험 수정과 추가 테스트 실행이 없었다. 후속 작업은 승인된 시험 파일 1개 수정과 62개 재실행이며, 제품 변경 0·실제 삭제/reset/workspace 쓰기 dispatch 0이다. 문서 작성·문서 정적 검사는 별도다. app browser/file URL/5 viewport/Android Chrome/iOS Safari/실제 IME/보조기술은 NOT_RUN이다. 전체 npm test·production build도 이 하위 검토에서 실행하지 않았다. commit/push/PR/Preview/Production 배포 미실행, 관찰 사용자 0명이다.
