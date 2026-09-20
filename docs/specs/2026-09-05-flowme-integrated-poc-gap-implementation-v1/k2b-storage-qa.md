# K2-B 저장 gate 진행 검증

2026-09-05 06:11 UTC 기준 중간 기록. **모델·저장 adapter 검증 중이며 K2-B 완료가 아니다.** 사용자 조작용 HTML은 K1-B 후보를 유지한다. 새 기간 UI·전체 caller 전환·영구 삭제 호환 gate를 아직 연결하지 않았다.

## 요구와 현재 적용

| 요구/경계 | 반영한 코드 | 현재 증거와 남은 조건 |
|---|---|---|
| 실제 날짜 단위 순서·기본 시간순 | timeline-context.js / workspace-checkpoint.js | 순수 읽기 35 + checkpoint 40 PASS. 기존 React와 날짜 계산 비교 12 PASS. UI 아직 미연결 |
| 구 today/week/month/undated 순서 보존 | frozen legacySnapshot + legacyBaseRaw | 구 raw 전체 bytes·snapshot을 유지. 한 후보/일치/충돌/부분을 구분하고 모호한 순서를 합치지 않음 |
| 첫 변경·legacy Undo·reset suppression | 같은 checkpoint의 state/undo/metadata | 기존 단일 Undo와 updatedAt 예외 유지. 날짜 순서 reset 뒤 legacy 순서가 다시 적용되지 않음 |
| 특정 key 읽기 실패·손상 payload | workspace-storage.js의 read authority | failed getItem과 null을 구분하고 seed fallback 차단. app의 기존 memory fallback은 C3에서 전환해야 함 |
| Plan/Quick prepared→target→confirmed | plan-item-session.js fixed-pair factory | 기존 74 + 신규 52 = 126 PASS. default v1 회귀를 유지하고 v2는 강제 decoder·이전 key/두 journal guard 적용 |
| 일반 변경·Undo·handoff·초기화 | workspace-storage.js / action journal | 54 PASS. 실제 handoff 모델 + 임시 storage의 2-key 저장도 포함. 브라우저·UI 연결은 별도 |
| 영구 삭제 | 원본 D1 의미와 보존 구조 비교 | 과거 bytes를 남긴 active 삭제를 충족으로 처리하지 않음. experimental v2 action만 현재 차단. 명시 삭제 전용 owner/scrub/재결합 gate 진행 중이며 기존 HTML 기능은 유지 |

## 실제 실행 수

| 실행 | 결과 | 해석 |
|---|---|---|
| 모델·저장·기존 standalone 합동 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/model-storage-combined-2026-09-05T06-10-34-160Z.json`) | **374 중 373 PASS / 1 FAIL** | 읽기35 + checkpoint40 + action54 + editor126 + 기존standalone119. 신규 모듈 255개는 모두 PASS, 기존 standalone은118 PASS/1 FAIL |
| React 기간 selector 비교 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/react-parity-storage-gate-2026-09-05T06-10-35-542Z.json`) | **12/12 PASS** | 주·월 경계/윤년/다른 사본/지난 미완료/완료·다시 열기 비교. React 제품 코드는 변경하지 않음 |
| action storage 최종 단독 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/action-storage-cross-realm-2026-09-05T06-08-30-966Z.json`) | **54/54 PASS** | 내부 fault 반복 횟수를 고유 test 개수에 더하지 않음 |
| editor pair 검증 원장 (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/editor-pair-validation.json`) | **126/126 PASS** | 기존74/추가52. root 합동 실행에서도 같은126 PASS |

374와12는 다른 파일의 test다. 다만 54·126은 합동374 안에 포함되므로 더해 전체 고유 수로 만들지 않는다. C1 담당자가 처음 기록한 34/34 이후 추가 fixture를 넣은 최종값은40/40이다.

### 합동 실행의 남은 1 FAIL

`standalone.test.cjs`의 `single-file build is deterministic and contains inline CSS, model and app`이 실패했다. 새 editor factory 소스와 아직 갱신하지 않은 사용자용 HTML bytes가 다르기 때문이다. 이 assertion은 그대로 유지했다. 부분 v2 연결본을 제공하지 않기 위해 생성 HTML을 동결한 상태이며, C3·기간 UI·삭제 호환 gate가 연결되면 두 HTML을 함께 재생성하고 다시 검사한다. **전체 standalone PASS 또는 최신 전체 build PASS로 보고하지 않는다.**

두 HTML의 현재 SHA256은 `A0DE57EA01E571BE6716A8A7B91BDCE6B6A9F7FBE4D65D3D34EC3CE8D1773141`, 각각 1,008,623 bytes다. 해당 K1-B 후보의 당시 브라우저19/19·npm2249/2249·build PASS는 [K1-B QA](./k1b-qa.md)의 역사 증거다. 새 adapter가 그 HTML에 포함되었다는 뜻이 아니다.

## 실패를 재현한 뒤 고친 항목

| 발견 | 수정 전 | 수정 후 |
|---|---|---|
| JSON 객체 key 순서만 달라져도 변경으로 처리 | 48개 실행 중3 FAIL (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/action-storage-review-red-2026-09-05T06-04-28-838Z.json`)에 포함 | 객체 key 순서는 무시하되 배열 순서/원문 문자열은 exact. prepare와 persisted journal decoder 둘 다 no-op 검사 |
| 복구 확인 도중 구 journal 등장 | 같은 RED에 포함 | cleanup 직전/뒤 양 journal 확인. 감지한 foreign 기록 제거0 |
| confirmed 이후 old drift를 미확정 저장으로 분류 | 같은 RED에 포함 | 확인된 commit과 다음 변경 잠금을 분리. committed + canResume:false |
| reset ticket A→B→A→B | 51개 실행 중1 FAIL (로컬 전용 근거: `../../../output/poc-gap-implementation/k2b/action-storage-reset-aba-red-2026-09-05T06-06-38-847Z.json`) | entry before를 시작 packet의 workspace/legacy exact raw에 결합 |
| confirmed 후 target 재확인 중 journal 교체 | 별도 negative 회귀 추가 | 마지막 current journal exact 재확인, 불일치는 commit-uncertain |
| editor 복구 중 old journal 등장·자동 rollback·confirm 직전 소유권 | editor pair RED126 중10 FAIL | v2에만 guard 추가, 이후126/126. 기존v1 74 본문 유지 |

action RED48→GREEN48, ABA RED51→GREEN51, 추가 decoder/UMD/foreign 후54/54를 각각 보관했다. RED 실행은 실패를 없었던 것으로 만들지 않으며 최종 결함 수도 그대로 합산하지 않는다.

## 저장 경계와 용량

일반 action journal은 operation별 정확한 key 목록만 허용한다. workspace/Undo는 새 target, handoff는 새 target+작성 draft, reset은 새/구 workspace+draft+creator+source의 기존 PoC 범위다. 임의 key 배열 입력 API는 없다. journal은 별도 고정 v2 key이며 Plan editor journal과 contract로 구분한다. 신규 fixture의 operating sentinel bytes 불일치·prefix 밖 set/remove·clear는0이다. 이것은 **격리 memory storage 자동검사**이며 사용자의 실제 운영 저장소를 비교한 신규 브라우저 증거가 아니다.

C1 용량 측정은 source를 축약하지 않고 12회 완료/다시 열기를 반복했다. 대표 fixture는 old UTF-16 1,518 → 초기 checkpoint3,655 → 최종5,500 / UTF-8 5,730 bytes. 큰 원문은 old201,505 → 초기623,614 → 최종1,025,433 / UTF-8 2,025,613 bytes다. 반복 중 min/max 차이는 두 fixture 모두24였다. snapshot 무한 중첩이 없다는 증거이며 브라우저 quota 내 저장 성공을 보장하지 않는다. before/candidate를 담는 복구 journal의 추가 공간도 실제 브라우저에서 별도 확인해야 한다.

## 남은 순서

1. 저장 adapter 브라우저 검증. 실제 UI 조작 시나리오와 구분한다.
2. 명시 영구 삭제의 owner와 exact scrub·provenance·journal 정리 확인. 대상 밖 원문/다른 사본을 지우지 않는다.
3. C3에서 boot/read-error·일반 저장·Plan/Quick·Undo·handoff·reset·결과 rank를 같은 authority로 전환한다.
4. 실제 localToday·월요일 시작 주·현재 월·지난 미완료·날짜별 순서 UI를 연결하고 다섯 viewport/키보드/비드래그/실패/reload를 검사한다.
5. 기존 회귀·npm test·production build·두 HTML 재생성/동기화와 현재 요구 판정을 갱신한다.

현재 새 UI 평가·실제 Android/iOS·OS IME/Back·보조기술 검사는 NOT_RUN, 관찰 사용자0이다. commit·push·PR·Preview·Production 미실행. 상위 단계별 목표는 계속 active다.
