# K3-C C2 — 명시적 원문 비교 연습 검증 원장

상태: **C2의 아래 명시한 구현·검사 범위 완료, C3 착수**. 기준일 2026-09-06. K3-C 전체·전수 제품 QA 완료가 아니다. [진입 설계](./k3c-c2-source-practice-entry-design.md)의 R01–R08/U01–U06을 기준으로 실제 실행과 미검사 범위를 구분한다. 마지막 절이 최종 후보 판정이며 그 앞의 실패·진행 중 문구는 당시 이력이다.

## 현재 제공본과 검사 후보

현재 HTML 두 파일은 C2 후보 SHA256 `A59CFCCA4913AE357305A63A714FE706B24D2400B86DF3106FC852A49EF54E92`, 각 1,924,465bytes다. 이전 C1-c2 제공본 `615418…`과 pin 5곳은 `output/poc-gap-implementation/k3c/before-c2-provided-html-20260906-01/`에 정확히 보존했다. 현재 소스 기반 HTTP 11개, 실제 제공 파일의 신규 비교 2개와 기존 상세 회귀 2개 검사가 각각 통과했다. React 최종 후보는 production build `PK9MFH8JdYeKKS061WQAu`다. 빌드 성공과 실제 파일·화면 통과를 구분한다.

전체 254부모/424원자 요구의 충족률은 재계산하지 않는다. v4.1·개발1·개발2의 이번 연결 범위는 설계 §2에 있고, 원본 요구나 과거 판정을 새 결과로 덮지 않는다.

## 최초 구현 중간의 요구별 비교 — 최종 판정은 마지막 절

| 요구 | 수정 전 차이 | 구현 후보 | 현재 증거 / 남은 확인 |
| --- | --- | --- | --- |
| R01 첫 실행 | 렌더·Flow 열기에서 예시 후보를 만들어 실제 업데이트처럼 보임 | 순수 기록 조회와 명시 생성 분리 | 공유 조회16, standalone 모델9/VM7 PASS. 실제 일반/빈 틀 작성·양쪽 reload 검사는 진행 중 |
| R02 명시 대상 | 기본 생성 ID에 의존하고 렌더에서도 생성 | 선택된 supported authored exact target에서 안내 시작만 생성 | 모델의 네 origin·Quick 실제 변환 미지원, VM의 미선택/editor/move/recovery 차단 PASS. 실제 모바일 안내가 숨겨진 결함을 발견해 로컬 사이드바 진입 추가 |
| R03 기존 복수 기록 | 생성 ID 밖의 기록 선택이 제한적 | 임의 ID pending/deferred/unreviewed를 exact 사본 기준 조회·선택 | 공유16 및 모델9/VM7의 복수 기록·다른 사본·결정 보존 PASS. 실제 브라우저 추가 검사 중 |
| R04 적용 사실/Undo | 표시가 기본 생성 후보에 종속 | effective owner와 실제 기록된 Undo owner 조회 | 공유 successive owner/reload/다른 Flow Undo 검사 PASS. 전체 UI apply→Undo→reload는 진행 중 |
| R05 결정 보존 | standalone 닫기에서 defer 반환 store를 버림 | 같은 실행의 working/base 메모리 유지, 자동 durable 보류 저장 없음 | actual VM 닫기·다시 열기·same choice PASS. 브라우저 첫 실패 중 한 건은 재개 후 첫 미결정 Item을 이전 Flow 결정으로 오인한 하니스 오류이며 정확 ID 재선택으로 수정 |
| R06 stale/경합 | readback 실패 복구가 foreign X를 덮음; React 종료 owner의 RAF 뒤 writer 호출 | 자신의 serialized 값일 때만 rollback, 외부 값/읽기 오류는 recovery-required; route/raw/epoch/private owner 재검사 | 외부 X8개 RED→GREEN. React 종료 owner2개 RED→GREEN. 실제 StorageEvent/ABA·늦은 callback UI 검사는 진행 중 |
| R07 source-only | standalone 다음 비교의 current가 keep-mine 결과 대신 incoming projection을 사용 | effective resolved projection을 현재 원문으로 사용 | 모델 C2M02 실제 RED→GREEN, keep-all 및 keep-flow/use-item 두 fixture. writer21 PASS. 전체 개인/원문 bytes 브라우저 증거는 최종 합산 전 |
| R08 실패/재시도 | 실패·화면 종료의 일부 owner 경계 부족 | 기존 source key writer와 공유 lock 안에서 적용/Undo, 실패 결정 유지 | shared/standalone fault matrix PASS. 실제 quota→재시도/foreign readback·기존 receipt 경합은 진행 중 |
| U01–U05 해상도 | 모바일에서 유일한 안내 버튼이 숨겨짐 | 로컬 CSS와 사이드바 진입 보완 | 수정 후 5해상도 연습/키보드/apply/Undo 한 run PASS. 다음 반복의 1440 키보드 실패를 보존하고 진단 중. 전체 화면 PASS로 확정하지 않음 |
| U06 초점/접근 | 지연 초점 복구가 새 사용자 초점을 덮을 가능성 | source 비교 owner에 한정한 보호 검토 | 실제 1440 실패의 최종 later checked/focused 확인. 타이머 이벤트 진단과 실제 callback 보류 검사를 진행. 기기·AT 검사와 구분 |

## 자동 검사 실행 이력

재실행·fixture 수를 독립 테스트 수로 더하지 않는다. 아래는 각 명령이 보고한 등록/실행 수다.

| 묶음 | 실제 결과 | 근거 |
| --- | --- | --- |
| 공유 순수 catalog 신규16 | 최초 API 미구현16FAIL → 최종16PASS | query 결과 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-query/result-20260906-01.json`). 첫 초안의 fixture 호출 오류1건은 실제 API RED와 따로 기록 |
| 기존 P3-D 명령 | 38PASS | 같은 query 결과의 기존 실행. 새 UI 검사 수가 아님 |
| standalone 모델9 + app VM7 | 첫 모델8PASS/실제 소유값1FAIL → 수정 후16PASS | adapter 결과 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-adapter-review/focus-candidate-result-20260906-01.json`). read29/product mutation0/별도 외부 fixture3. DOM·StorageEvent 검사가 아님 |
| source writer | 새 shared7 + standalone5 + 기존 storage9 = 21PASS | fault matrix (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/source-writer-fault-matrix-2026-09-06T05-33-15-290Z.json`). 새12등록 안의 38fixture/44API를 38개 테스트로 바꾸지 않음 |
| React 실제 owner 최초 | 정상 apply/Undo 양성, 종료 owner apply/Undo 실제 RED → 수정 후3PASS | `output/poc-gap-implementation/k3c/c2-react-owner-current-first-*`. 신규 helper/presenter 추가 검사와 최종 소스는 후속 기록 |
| React 관련 첫86 | 83PASS/기존 source-text wiring3FAIL | `c2-react-related-first-2026-09-06T05-50-36-951Z.json`. root가 actual code를 읽고 owner.sourceRaw/optional authoring fallback/초점 epoch의 정확 새 연결식만 갱신. 이전 파일은 별도 backup 보존 |

공유 query는 getter·toJSON·생성/transition/현재시각/IO 0을 검사하지만 JavaScript Proxy reflection 자체가 무부작용이라는 보장은 하지 않는다. writer 보완도 브라우저 문서 간 native atomic CAS 보장으로 표현하지 않는다.

## standalone 브라우저 최초 실패를 숨기지 않는다

1. 첫 run: 390 안내 숨김 실제 FAIL 뒤 중단. 나머지 전부 실행했다고 세지 않는다.
2. 모바일 진입 보완: 390 단독 1PASS.
3. 9개 suite: 5해상도 PASS 뒤 재개 결정 하니스1FAIL, 나머지3 NOT_RUN. 화면을 직접 보니 이전 Flow 결정은 완료였고 첫 미결정 Item을 보고 있었다. 같은 candidate/change ID를 명시 선택한 뒤 기존 checked assertion을 유지했다.
4. 다음 9개 suite: 4PASS/1440 키보드1FAIL/4 NOT_RUN. final PNG에서 두 번째 Item의 later 라디오가 checked/focused이고 적용은 disabled다. 이를 통과로 처리하지 않는다.
5. 무변조 초점 이벤트를 추가한 1440 진단1회는 PASS. 이 실행에서는 예약 later focus가 incoming focus 이전에 끝났다. 한 번 재현되지 않았다는 이유로 실패 원인을 하니스 문제라고 확정하지 않는다.

실제 파일·최종 candidate hash·화면별 direct 평가·추가 오류/작성 시나리오·최종 회귀는 후속 기록으로 추가한다. 타이머 스케줄링 제어 검사는 실제 사용자 관찰이나 OS 키보드 검사가 아니다.

## 변경 범위와 보호

- 공유 `personal-workspace-poc-source-candidates.ts`: read-only query 169행 추가. 기존 validator/transition/schema는 유지.
- 공유 `personal-workspace-poc-source-candidate-storage.ts`: 본인 serialized 값 소유를 확인한 rollback만 허용.
- standalone `model.js`: source-only 조회·명시 resume·3way memory merge·keep-mine current, source writer 실패 소유 보완.
- standalone `app.js`/`style.css`: 명시 안내 진입·exact 기록·메모리 결정·stale·초점·모바일 진입. 전역 theme/nav는 수정하지 않음.
- React Surface/SourceUpdateReview: 명시 진입·기존 기록·private writer owner·practice 표시 변형. 기본 presenter 출력 동등성은 별도 검사.
- 신규 테스트와 기존 wiring 검사 세 곳만 현재 계약에 맞게 좁게 보완. 보완 전 파일과 실패 로그는 보존.

PoC source 쓰기는 `flow:poc:personal-workspace:v1:source-candidates` 하나다. source 연습에서 완료·개인 계획·Authoring/CreatorDraft writer를 호출하지 않는다. 원본 보호 manifest551를 다시 채취하지 않고 승인한 정확 경로만 기존 기준과 검증한다. 현재 C2 최종 검증은 미실행이므로 직전 C1-c2 보호 PASS를 C2 증거로 재사용하지 않는다.

## 남은 작업과 공개 상태

C2 키보드/실제 화면 검증 → 관련 회귀·npm·production build → 실제 HTML2 재생성·pin/host/file 검사 → 요구별 최종 판정·보고서 갱신 → C3 로컬 UI → K4 owner/버전/호환 설계 순서다. 전체 목표는 active다.

실제 Android Chrome, iOS Safari, OS IME/Back, TalkBack/VoiceOver: **NOT_RUN**. 관찰 사용자: **0명**. commit, push, PR, Preview, Production: **미실행**. production build 및 브라우저 자동화를 배포·실기·사용자 검증으로 부르지 않는다.

## 2026-09-06 06:10 UTC 중간 체크포인트

이 절은 위 최초 이력을 대체하지 않고 다음 실행을 추가한다. 아직 C2 전체 종료가 아니다.

- standalone 신규 브라우저 **11/11 PASS**, 13개 fresh context. 최종 집계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-standalone-browser-extension-20260906-01/final-summary.json`). app `EA4FD1CE…`, model `9DA7BB71…`, CSS `891E9119…`. 제품 mutation API41 = source15 + 작성26. bytes 변경27/동일bytes13/quota throw1이며 성공 변경41건이 아니다. 외부 fixture3은 별도다. read phase mutation, prefix 밖 API, clear, console/page error0. 5해상도×시작/적용/닫기/Undo = geometry20, full rect/9hit/44px PASS. 48px 전체 UI 충족 판정은 하지 않는다.
- 같은 actual timeout callback을 보류한 초점 진단은 **1RED→1PASS**. 사용자 incoming focus를 예약 later focus가 빼앗던 문제를 source 비교 전용 owner/epoch로 막았다. 이후 실제 일반/빈 틀 작성의 안내→비교에서 일반 dialog 닫기 timeout이 main으로 초점을 돌리는 별도 RED를 발견했고, 이 전환 한 곳만 returnFocus를 생략하여 S6의 기존 초점 기대를 통과했다. 진단1은 브라우저11에 합산하지 않는다.
- 모델 **9 + VM7 PASS**의 후속 합동에서 기존119까지 포함한 **135실행/133PASS/2FAIL**도 보존했다. 하나는 C2에서 승인 변경한 옛 자동 배너 문구 assertion, 하나는 아직 생성하지 않은 제공 HTML과 새 builder의 불일치다. 문구 세 곳만 root가 현행화했고 제공본 일치 검사는 최종 생성 뒤 다시 실행한다. 그 전의 잘못된 wrapper 명령은 테스트0/명령실패이며 135에 합산하지 않는다.
- 공유/standalone writer는 frozen Error·primitive throw에서 rollback 표지 부착 자체가 실패하는 실제 RED를 추가 발견했다. 새 Error wrapper가 원래 cause를 보존하고 arbitrary getter/coercion을 호출하지 않도록 보완했다. 최종 **24/24 PASS** = 신규15 + 기존9. 신규44fixture/53API(set51/remove2/clear0), throw16/외부fixture13, sentinel44 불변은 fixture 계측이며 44개 테스트가 아니다.
- React 신규 actual/SSR **20/20 PASS**, strict diagnostics0. default presenter 12개 조합의 markup exact는 12개의 별도 브라우저 검사가 아니다. local deletion의 조용한 복원과 늦은 초점 탈취도 각각 실제 RED 후 보완했다. 관련 재실행은 **90/90 PASS**이며 앞선86과 대부분 중복이다.
- production build **PASS**, `LDtQcLO_nRbmhXSlQkTIs`, Surface `F45A09ED…` / Review `8B81E241…`. 빌드 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-production-build-2026-09-06T05-58-08-853Z.json`). C2 React browser8은 RC01–06 통과 실행을 확보했고 RC07의 실제 RAF/문서 이탈 계측을 보완 중이다. RC08은 별도 진행한다. 부분 통과를 8/8로 쓰지 않는다.
- exact gate 신규 실제 브라우저 **9/9 PASS**. 기본 `/my`, exact-query 양성, 잘못된 값/빈 값/추가 query/중복 query, source/state 손상, unsupported source version을 검사했다. 손상에서는 실제 `/my` redirect, 전체 localStorage bytes exact, 모든 mutation API0, 오류0, 보호한 route/gate/AppClient 소스 hash 전후 exact. gate 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-gates-2026-09-06T06-09-35-976Z.json`).
- 전체 `npm test`: **2,030실행/2,029PASS/기존 기한1FAIL**. 실패는 수정하지 않은 banana-peanut/monstera/filter/plank 원본4건의 `review_due:2026-06-07`이다. npm 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-npm-test-2026-09-06T06-00-28-175Z.json`). npm의 `&&` 뒤 미실행 묶음은 따로 실행하여 approved201/public19 PASS를 확보했고 전체 green으로 바꾸지 않았다.
- 기존 React 회귀 첫 조기종료는 **2PASS/1FAIL/23 NOT_RUN**: subcheck selection 즉시 평가에서 빈 선택이 나왔다. 제품 수정 없는 다음 전체 실행에서는 그 항목이 통과했다. 다음 **26실행/23PASS/3FAIL**은 helper duration 진입 timeout, native drag move panel 미노출, landscape hit 실패다. 전체 실행 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-react-existing-complete-2026-09-06T06-03-17-456Z.json`). 원인 분류 중이며 C2 회귀 또는 기존 결함이라고 아직 확정하지 않는다. C1 실제 detail-visit2는 이 26에서 모두 통과했다.
- 보호 manifest551는 그대로 유지했다. 최초 verify에서 root가 수정한 Review test 경로1의 allowlist 누락을 기록했고, 정확 before backup/새 초점 wiring assertion delta를 대조해 해당 경로만 승인 목록에 추가했다. 이후 **551검사/승인 누적34변경/unexpected0**. 운영 파일을 수정하거나 기준 hash를 다시 채취한 것이 아니다.

standalone 제공 HTML은 계속 C1-c2 `615418…`다. 새 소스와 제공 파일이 같다고 안내하지 않는다. 15개 standalone 캡처는 담당자가 직접 검토했고 root도 다섯 해상도의 ready 화면을 직접 읽었다. 844×390은 본문을 스크롤한 상태로 모든 필드와 footer의 동시 노출 증거가 아니다. 모바일 변경 nav 전체 rect는 아직 별도 검사하지 않았다. 입력26API 중 반복된 동일 bytes13은 별도 후속 후보이며 C2 범위에서 Authoring writer를 재설계하지 않는다.

## 2026-09-06 — 최종 후보 판정과 C3 인계

위 문단들은 당시 후보의 이력이다. 최종 React는 Surface `025C750D593175C7E439EB4F6DC7F726895FA482385A580495D6D2925EFE72B6`, Review `4520F9FDCABF14B8A9DB6B5D87B494D762FBDCCE68475CB7437D7BCA586897AA`, Authoring `9738125B…` / BUILD `PK9MFH8JdYeKKS061WQAu`다. standalone은 app `EA4FD1CE…` / model `9DA7BB71…` / CSS `891E9119…`, 제공 HTML `A59CFCCA…`다. 원본 authoring·운영 파일·P3-D 기존 browser fixture는 변경하지 않았다.

| 요구 | 최종 적용·실행 근거 | 판정의 제한 |
| --- | --- | --- |
| R01–R02 명시 진입 | 일반/빈 틀 작성→저장→첫 열기/reload 생성·stage·읽기 쓰기0. 안내의 명시 시작만 생성. HTTP S4는 미선택/legacy4도 생성0 | 미보유 원문이나 외부 업데이트를 가져오지 않음. C1 전수 생성 spy를 새로 검사한 것은 아님 |
| R03–R05 기록/결정/Undo | 임의·복수 ID, 보류 결정 재진입, 적용·Undo·reload를 React RC02–04와 standalone S1–3, 실제 file F01–02에서 확인 | 메모리 보류를 새 durable 정책으로 바꾸지 않음. 조회 DTO의 canUndo는 쓰기 권한이 아님 |
| R06 stale·종료 | 실제 peer X/ABA, stale 닫기/재열기, readback X 보존, RC09 오래된 Undo0쓰기+실패 사유 PASS | RC07 실제 Back은 새 문서가 이전 callback을 폐기함. 같은 문서의 늦은 writer0은 별도 actual VM 2개이며 브라우저에서 강제 실행했다고 하지 않음 |
| R07 source 분리 | 적용·Undo는 exact source key만 기록. 개인 완료·계획·원문 입력·이웃 사본·운영 sentinel 전후 exact | 브라우저 native 다중 문서 atomic CAS 보장이 아님. authoring/handoff의 쓰기는 source 단계와 별도 계측 |
| R08 오류/재시도 | quota 실패→선택 보존→재시도, 외부 값 recovery lock, 원래 editor/receipt 우선권 actual 검사 PASS | 모든 receipt·오류·저장 경쟁 조합 전수 완료는 아님 |
| U01–U05 화면 | React RC08 5뷰포트, standalone 5뷰포트의 시작/비교/오류/복귀 조작 통과. root도 최종 React 오류5장과 standalone ready5장을 직접 확인 | 가로 화면은 본문 내부 스크롤을 사용함. 전체 필드 동시 노출·전체48px 완료는 아님 |
| U06 키보드 | Tab/Escape·보이는 복귀 위치, 사용자 이후 초점 보호, 실패 이유 focus+nearest scroll PASS | 실제 브라우저 200%는 DPR/width 변화가 없어 NOT_RUN. CSS zoom2+reduced-motion 재흐름만 PASS. 실제 기기·보조기술 NOT_RUN |

### 실제 실행 수

- React 신규 최종 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/react-source-practice-final-20260906-09.json`): **9/9 PASS**, 16 fresh context. 제품 API130(set80/remove50) 중 quota throw6, 실제 bytes 변경124. 테스트 주입7은 별도다. source API13은 quota6 + 성공한 API7이며 성공 receipt13건이 아니다. 14 no-write 구간0API/exact, full rect33·hit297 PASS, 금지 prefix/clear/console/page error0. 원본 파일·실행 source hash 전후 exact.
- React 마지막 초점 실제 RED2→GREEN2, default no-practice 12개 HTML 조합 exact 유지. 최종 신규 actual/SSR23이 포함된 관련93/93 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-react-related-final93-2026-09-06T06-29-50-749Z.json`) PASS. 신규23을93에 다시 더하지 않는다. 별도 gate test strict도 diagnostics0.
- standalone HTTP11/11은 위06:10 절과 집계 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-standalone-browser-extension-20260906-01/final-summary.json`)를 따른다. 최종 사용자 파일 생성 후 모델/생성135/135 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-generated-model-suite-2026-09-06T06-27-31-166Z.json`) PASS로 앞의133/2FAIL을 닫았다. 공유 조회16, writer24는 별도 실행이다.
- 실제 file 신규2/2 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-source-practice-direct-file-20260906-01.json`): 2 fresh context/API28 = authoring26 + source apply1/Undo1. bytes 변경15/동일bytes13, read·금지API·clear·오류0. genuine runtime의 생성 호출을 감싸 계측했으며 파일 bytes·입출력은 바꾸지 않았다. 실제 file URL의 일반/빈 틀부터 조작했고 HTTP 화면으로 대체하지 않았다. 별도 PNG는 생성하지 않았으며 HTTP의15장을 file 캡처라고 하지 않는다.
- 두 제공 파일 상세 회귀2/2 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-c1-detail-file-regression-20260906-01.json`)와 host8/8 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-generated-host-20260906-01.json`) PASS. 제공 pin30+runner16, 증거 CLI10은 각 실행이며 label `pin46`의 실제 결과는30이다.
- 기존 React26실행의23PASS/3FAIL은 보존했다. 기존 helper가 누락한 구조→일정 그룹2단계, Escape focus 뒤 변한 핸들 좌표, sticky header 아래 가용영역 scroll을 검사 코드에만 보완했다. 같은 세 case 최종3/3 (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-react-existing-three-final-20260906-01.json`) PASS. 원래 제품 함수와 assertion은 유지했다. 전체26/26을 다시 실행했다고 하지 않는다.
- 새 React9 첫 run은7PASS/RC08 timeout/RC09 NOT_RUN이었다. 네 번째1024 화면에서 이미 열린 두열 결과 대신 숨겨진 모바일 결과 tab을 기다린 기존 helper 전제가 원인이었다. 원본 P3-D fixture는 보존하고 신규spec의 정확 click문장1개만 visible 분기/실제 heading 확인으로 바꿨다. timeout 증가는0이며 focused2와 최종9를 구분한다.
- production build (로컬 전용 근거: `../../../output/poc-gap-implementation/k3c/c2-final-production-build-2026-09-06T06-24-28-806Z.json`) PASS, 정적18경로. 전체 npm2,030/2,029PASS/기존 기한1FAIL, 후속201/19 별도PASS는 위실행을 따른다. 이후 좁은 초점·안내 수정은 신규/관련93 및 최종 build/browser에서 검증했으며 npm을 그 뒤 다시 실행했다고 쓰지 않는다.

원본 보호551는 재캡처하지 않았다. 06:31:28Z 예상 밖 변경0. C2 테스트 전 파일·제공본 exact backup과 초기 실패 로그는 모두 남겼다. 새로운 영구 정책·운영 writer·default `/my`·전역 CSS/nav 변경0이다.

다음은 [C3 로컬 UI](./k3c-c3-local-ui-design.md)의 청록 소비·48px·중복 진입 정리, 그 다음 K4-D다. 작성 중 동일 bytes API13은 별도 후보이고 이번 C2에서 입력 writer를 재설계하지 않는다. 실제 Android/iOS·OSIME/OSBack·TalkBack/VoiceOver NOT_RUN, 관찰 사용자0명, commit/push/PR/Preview/Production 미실행. 전체 목표는 active다.
