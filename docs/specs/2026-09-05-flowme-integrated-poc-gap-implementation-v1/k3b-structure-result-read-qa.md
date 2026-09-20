# K3-B B2 — 개인 구간·선형 순서 결과 읽기 QA

2026-09-06. 승인한 [결과 읽기 설계](./k3b-structure-result-read-design.md)의 M 연결을 구현했다. **최종 신규 18개 + 기존 회귀 37개 = 55/55 PASS, 실패·skip 0**이다. 이 문서는 순수 모델과 선택 회귀의 근거다. 화면·복사 버튼·파일 다운로드·실기기 검증 완료를 뜻하지 않는다.

## 1. 바뀐 범위와 유지한 경계

제품 변경은 [model.js](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/model.js) 한 파일이다. 이번 작업 직전 원본 대비 112줄 추가, 3줄 삭제다. 기존 worktree diff는 보존했다. app/CSS/PD/P/C/E2/builder 및 사용자 HTML은 이 작업에서 수정하지 않았다.

`resultProjection(displayState, localFlowId, { personalPlanStructureView })`가 실제 PD가 만든 구조 view를 받는다. 옵션 부재는 기존 경로다. own property가 있는데 값이 null/undefined/잘못된 형태이면 전체 결과를 null로 막는다. getter를 실행하거나 기존 결과로 되돌아가지 않는다.

검사하는 것은 full-ref·같은 사본·전체 Item 순열·원래 Step 위치별 membership·sourceTitle·구간 id·표시 owner/capability의 결합이다. `authoring`과 `poc-shadow`는 실제 P가 배출하는 쌍으로 검사한다. 원문과 다른 alias는 기존 P의 trim-exact/nonblank 조건을 따른다. 원문에서 상속한 문자열은 임의로 trim하지 않는다. 이 검사가 source/editor 권한을 발급하지는 않는다. 실제 current/Undo/source provenance와 읽기 시점은 PD/caller 책임이다.

기존 Step 순회로 base rows와 `legacyLines`를 만든 뒤, 결과용 새 배열만 full refs대로 재배열한다. `sourcePlanOrder`는 원래 위치, `planOrder`는 개인 결과 위치다. 표시용 `sectionGroupKey`는 `[flowRef, sourceOrder]`의 JSON 문자열이며 저장 owner나 `stepId`를 대체하지 않는다. 동일한 이름·null/중복 readonly id도 서로 다른 원래 구간으로 남는다.

Text/Todo/Sheet/TXT 및 전체 manifest는 한 배열에서 파생된다. Calendar는 기존 날짜 순서 resolver를 우선하고, 회차·확인되지 않은 날짜 그룹만 개인 Plan 순서를 fallback으로 사용한다. `resultContextRank`와 회차 생성 함수는 수정하지 않았다.

WorkingSource는 원문이 있으면 그대로, null이면 기존 `legacyLines` 그대로다. 개인 결과 `textLines`를 원문 fallback에 재사용하지 않는다. authoring preview는 새 옵션을 소비하지 않는다. 운영 schema/key, result version, source 배열, 회차 identity·완료·날짜·시간을 변경하지 않는다. P/C를 M에서 import하지 않아 역방향 순환 의존도 추가하지 않았다.

## 2. 실제 실행 이력

아래 반복 실행을 최종 고유 시험 수에 누적하지 않는다. Node의 name-pattern 실행은 선택된 등록 14개만 결과에 표시했으며 최종 reporter의 skip은 0이었다.

| 실행 | 실제 결과 | 해석과 근거 |
| --- | --- | --- |
| R01–10 수정 전 | 0 PASS / 10 FAIL | 원래 M이 옵션을 무시해 순서·구간이 미반영되고 supplied-invalid가 fallback됨. RED 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-result-read-red10-20260905-01.log`) |
| M 첫 연결 후 R01–10 | 10/10 PASS | 첫 GREEN (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-result-read-green-first10-20260906-01.log`) |
| 별도 R11–16 첫 실행 | 0 PASS / 6 FAIL | 시험 helper가 PD에 불필요한 flowId 등을 넘긴 strict-input 하니스 오류. 제품 결함 6개가 아님. exact 인자만 전달하도록 시험 수정. 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-result-boundary-first6-20260906-01.log`) |
| R11–16 하니스 수정 후 | 4 PASS / 2 FAIL | 실제 DTO 교차검사 누락: 잘못된 full ref를 state/view에 함께 넣기, 중복 raw Step id 하나만 editable로 바꾸기. RED 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-result-boundary-red6-20260906-01.log`) |
| 보강 후 신규 16 | 16/16 PASS | current/Undo 손상 assertion까지 포함한 재실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-result-read-final16-20260906-02.log`) |
| main 독립 리뷰 R17/R18 | 0 PASS / 2 FAIL | 실제 저장 alias를 복사한 DTO의 owner/capability 불일치와 공백 alias가 통과. P 원계약을 재검사하는 2줄 조건으로 보완. RED 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-result-owner-alias-red2-20260906-01.log`) |
| 최종 신규 18 + 기존 rank 23 | 41/41 PASS | 최종 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-result-final41-20260906-01.log`), 822.8519ms |
| 최종 기존 result/recurrence/TXT 14 | 14/14 PASS | 최종 로그 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/structure-result-final-regression14-20260906-01.log`), 199.5734ms |
| 구문 검사 | PASS | `node --check .../model.js` |
| 문서·소유 점검 | PASS | `npm run docs:check`: 16 required files, 5,912 local links. `workflow:closeout`의 지정 scope 점검도 실행. 이 도구의 검사 권고를 테스트 실행 결과로 세지 않음 |

R01–10은 [result-personal-structure.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/result-personal-structure.test.cjs), R11–18은 별도 [result-personal-structure-boundary.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/result-personal-structure-boundary.test.cjs)에 등록했다. 기존 [timeline-result-rank.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/timeline-result-rank.test.cjs) 23개와 [standalone.test.cjs](../../content-audit/2026-09-02-flowme-integrated-flow-poc-standalone-ko-assets/standalone.test.cjs)의 결과·반복 관련 14개는 수정하지 않았다.

## 3. 요구사항별 시험 대응

| 시험 | 확인한 내용 | 결과 |
| --- | --- | --- |
| R01 | 실제 C 저장→PD view의 A1/B1/A2·alias를 Text/Todo/Sheet/TXT/manifest에 동일 적용. sourcePlanOrder [0,2,1], planOrder [0,1,2], raw fields·이웃 값 보존 | PASS |
| R02 | 동명 두 readonly 구간의 null id를 합치지 않음. 실제 Step id 유지, TXT 두 run | PASS |
| R03 | 다른 사본·누락/중복/외부 ref·sourceOrder·membership·원문 구간명 drift 전체 차단 | PASS |
| R04 | 옵션 null/undefined/unknown 및 getter/toJSON/custom prototype/holes/symbol 차단, getter 0, 옵션 부재 정상 | PASS |
| R05 | 실제 PD source read-error/unavailable/corrupt 및 current/실제 Undo-P 손상 거절. 실패 값을 넘긴 M fallback 없음 | PASS |
| R06 | 명시 manual/time rank 우선, null/throw/malformed hook에서 새 Plan fallback. 실제 C rank resolver 결합 | PASS |
| R07 | 반복 count/id/완료·날짜 facts, 개인 순서, 날짜별 회차 fallback 보존 | PASS |
| R08 | source A→B에서 개인 A, inherit/reset, C Undo와 원문 bytes 유지 | PASS |
| R09 | raw/null WorkingSource 및 authoring preview 전체 값 불변 | PASS |
| R10 | 실제 UMD/CJS 결과·TXT 다운로드 bytes 일치, CSV BOM/CRLF/구간명 보존, 원본 M 백업과 옵션 부재 결과 전체 동일 | PASS |
| R11 | state/view 양쪽을 같이 변조해도 local/외부 사본/비정규 full ref 및 ref 부재 차단 | PASS |
| R12 | 중복 raw Step id 하나를 고유 editable owner로 위장하는 DTO 차단 | PASS |
| R13 | nested accessor/cycle/nonenumerable/custom prototype 차단, getter 0, 다른 realm 정상 배열 허용 | PASS |
| R14 | 실제 이동·완료한 반복 회차를 개인 구조 읽기 뒤에도 유지. time/completedAt/override 입력 불변 | PASS |
| R15 | 네 legacy origin의 full-ref/WorkingSource/원래 순서 사실 보존 | PASS |
| R16 | 빈 원문 구간·자유 메모·CRLF 유지, frozen state 읽기, section 배열 위치가 달라도 sourceOrder로 같은 결과 | PASS |
| R17 | 실제 P의 authoring⇔poc-shadow 쌍을 위조한 DTO 및 반대 readonly+authoring 차단 | PASS |
| R18 | 기존 P alias의 trim-exact/nonblank 조건, 상속한 legacy 원문 공백은 그대로 유지 | PASS |

## 4. 해시와 소유 증거

수정 전 model.js 백업 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3b/before-structure-result-read-20260905-01/model.js`)은 원본과 정확히 같았다. SHA-256은 `9A3334F49975D9EB9B971F7D0CFBE8508D03B59E526F653FF79AC1E4A7D70F67`이다. 최종 신규+rank 41개 실행의 시작과 끝에서 다음 제품 해시가 같음을 직접 확인했고, 뒤의 14개 실행 후 M 해시도 다시 확인했다.

| 파일 | 최종 SHA-256 |
| --- | --- |
| M model.js | `C21EDA9A5690214CC0C8202FE4915A6DF7091E76A53EBA1DF63A5C5303DF4D36` |
| P personal-plan-context.js | `AA3D3EA124BC9C7C752D5FF82A359D075F3C1CEEABC933571C11953C0E3493F4` |
| C workspace-checkpoint.js | `AD18C6D8A776BF49923D6489238ADA78E067A29BD427DC9B53F19DE097D67314` |
| PD personal-plan-display.js | `1EF9E1D95BD75E9174706D91E77028981E03DD7D3CC70F196F977A3211AE73D0` |
| 신규 R01–10 | `920E66694AD5BEB7FC860C8AD7207ADF7CF2F2CA4F956EA817EA3E1772C3B9CC` |
| 신규 R11–18 | `F5A3A98BD0869EB6A394EE29C20E7853FF29C54C384B45F918E02BEA897485BC` |

이전 E2 208개 결과의 C835FF 해시와 혼합하지 않는다. 이 결과 읽기 시험은 후속 timeline tie가 반영된 C AD18에서 실행했다. main은 M diff 전문을, peer는 새 descriptor/full-ref/순열/legacyLines 구간을 독립으로 읽었다. 그 뒤 main이 찾은 R17/R18을 별도 RED로 남겨 보완했다.

## 5. 저장 경계와 남은 검증

신규 18개는 실제 M/C/P/PD의 **순수 fixture 전이와 읽기**만 사용한다. 저장소 인스턴스나 운영 프로필을 연결하지 않았다. M UMD 시험은 `localStorage/document/fetch` 접근 시 즉시 throw하는 환경에서 통과했고, 원본 상태·구조 값의 exact 비교와 frozen 입력도 통과했다. 새 결과 연결에는 writer 호출과 storage key가 없다. 실제 사용자 운영 key/value 전체를 읽어 비교한 증거로 표현하지 않는다. 기존 저장 회귀에 포함된 메모리 sentinel 검증과 실제 브라우저의 API 계측은 각각의 원래 범위다.

후속 UI gate에서 남은 일은 PD 실패를 옵션 부재로 바꾸지 않는 중앙 caller, 화면/복사/다운로드·회차 동작의 같은 projection 사용, 긴 구간명·개인 순서·time/manual Calendar 및 5 viewport 확인이다. low-level DTO는 표시 자료이며, 현재 source epoch와 genuine PD provenance를 M 하나로 인증하지 않는다.

- 이 하위 작업의 `npm test` 전체, production build, 브라우저 및 `result-time-presentation.test.cjs`의 app 함수 추출 회귀: 미실행. main의 최종 UI 통합 검증에서 수행한다.
- 실제 Android Chrome/iOS Safari: NOT_RUN. 관찰 사용자: 0명.
- commit: 없음. push: 없음. PR: 없음. Preview: 없음. Production: 없음.

별도 GUI 기능이나 영구 제품 정책을 추가하지 않았으며 B2 전체 완성 판정은 이 순수 모델 QA만으로 내리지 않는다.
