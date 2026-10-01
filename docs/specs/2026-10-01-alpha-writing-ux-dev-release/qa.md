# 검증·반영 원장

상태: 게시 전 로컬 검증 완료·CI/개발계 반영 대기. 실행/합성/개발계 반영/실기기를 구분한다.

## 최종 후보 보완 상태

- 포커스 처리를 전환 완료 후 effect에서 예약하도록 보완했다. 취소된 예약이 새 예약을 소비하지 못하도록 요청/예약 소유를 함께 검사한다. 독립 소스 검토에서 추가 차단 문제0. 표적38/38·다섯 화면 모바일 전환5/5를 실제 실행했다.
- 이 판본의 build04:56:48~04:58:20은exit0·639source실행 중 변경0, build `9-lT0ZErSKEjdwpRnDbYz`다. 모바일 v2/v3의 후반 reload 실패는 선택 복원·DOM 준비를 기다리지 않은 harness였고 v4에서5/5완료했다. 포커스·첫44px·native커서/scroll·추가쓰기0 검증은 유지했다.
- 타입 검사에서 새 테스트237행의‘함수는 항상 정의됨’진단1건을 발견했다. 함수 존재를 `typeof === function`으로 확인하는 같은 의미의 assertion으로 보완했으며, 표적38/38·564entry타입오류0·source drift0을 다시 확인했다. 제품 코드에는 변경0이다. 이전639 snapshot과 테스트1파일이 다르므로 최종 통합/기본 검사는 새 snapshot으로 재실행한다.
- 최종 로컬 앱 검사는 전체·부분 입력80/80, 폴더50/50, 작성 여정15/15, 기존 핵심10/10으로 완료했다. 합계155회는 실행 수이며 고유 요구 수나 실제 기기 수가 아니다. 별도 새 문서5/5와 모바일5/5는 이 실행과 겹치므로 합산하지 않는다. 모두 실제 production 자산과 합성 Auth/API를 사용했으며 실제 계정 요청/쓰기0이다.
- 보안05:02:48~05:03:12은취약점0·호환4/4·drift0, 기본05:02:48~05:06:05은2,258/2,258·drift0이었다. 타입 테스트 표현 보완 후 기본/통합의 마지막 실행은 후속 결과로 확정한다. 통합05:02:48~05:09:35중단 기록은 유지한다.
- Supabase changelog/API key 정본을 읽고 비공개 키의 client/fixture 전달 금지와 기존 synthetic API 경계를 대조했다. 인증/DB 기능·schema·RLS 변경0이며 실서비스 query로 범위를 넓히지 않았다. 정본: https://supabase.com/docs/guides/getting-started/api-keys .
- docs05:13실행은표적4/4지만 PR 설명의 로컬 링크3개가 파일 위치 기준과 달라 전체exit1이었다. PR용 링크를 게시할 branch의 repository URL로 고쳤으며05:15:13~05:15:21의 docs4/4·링크검사exit0을 확인했다. 실제 push 뒤 원격 경로를 확인한다.
- 마지막 기본 검사05:11:50~05:15:09는2,258/2,258·실패/skip/cancel0·639source drift0, 최종 타입564entry오류0이다. 현재 source snapshot은 `e088af46af01fa14f1da02bb2464d2d266da262b3106344cef79eef8571ac4cb`이다. 같은 source의 새 build05:24:17~05:26:56은exit0·drift0·build `yWHRQpwOz0xlUauvT8rmy`로 완료했다. 전체 통합은 진행 중이며 게시 hook이 build를 다시 만들면 그 자산으로 별도 검사한다.
- CI 정적 사전 검토에서 기존 관리 메뉴·제작 도구 동선의 결정적 assertion 충돌0을 확인했다. 새 `.browser.ts` 작성/폴더/여정 runner는 기본 `.spec.ts` CI에 자동 포함되지 않으며 위155회는 별도 로컬 실행이다. 새 통합 `.test.ts(x)`는 private contract lane에 수집된다.
- 마지막 전체 통합05:11:52~05:31:15은267파일·2,744/2,744·실패/skip/cancel0·source639 drift0이었다. source snapshot `e088af46af01fa14f1da02bb2464d2d266da262b3106344cef79eef8571ac4cb`는 마지막 npm/타입/build와 동일하다. 원시 private 출력은 보존하지 않았고 allowlist summary만 로컬에 남겼다. 비공개 pack의SHA256 `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be`와bytes는 전후 동일했다.
- 최종 로컬155회에서 가로 넘침·예상 밖 console/page error·허용prefix밖 Storage호출0, 합성 운영 sentinel bytes동일을 확인했다. 화면 캡처390/375/844/1024/1440을 직접 확인했다. 이는 실제 운영 DB byte 대조·실기기·OS IME 판정이 아니다.

## 게시와 첫 CI 보완

- 승인한104파일을commit `db47835bfe1bd1c76ff092c522f8ffec2e510678`로게시하고[Draft PR206](https://github.com/knhbae/flowme2605/pull/206)을만들었다. base는기존`agent/alpha-core-ux-save-ack-20260930`이며36파일host기반commit1eb9be68도stacked dependency로포함한다. main병합0이다. pre-push기존verify/docs/npm/build를우회하지않았고마지막build는`zEY9jP0Mcmqs90L0HCPvB`,source639snapshot은위e088과동일했다. PR설명원격링크3개존재와Preview/Production신규deployment0을확인했다.
- [첫CI36820703236](https://github.com/knhbae/flowme2605/actions/runs/36820703236)의core는privatepublication경계테스트9개중1개에서실패했다. 실제entry10개에503전용`app/api/alpha/backup-jobs/route.ts`가있지만테스트expected는9개였다. Windows깨끗한게시worktree에서도8pass/1fail로재현했다. private lane은core실패로skip이고integration gate는fail이며통과로표시하지않는다.
- `gh-fix-ci`절차로실패job을읽고승인된테스트보완범위에서정확한10entryexpected와backup경로분류를갱신했다. entry/closure/미해결/hash검사규칙을그대로유지한다. route/제품source/백업off정책/DB/Auth변경0이다. 새105번째소유파일은`render-release-inventory.test.mjs`이며기존104path와분리한다. 후속게시·exact-head CI는진행중이다.
- 보완후publication경계9/9·backupoff1/1·CI출력/원문보호8/8로실행18회통과,privateclient금지0·trackedcatalog발견0이다. 마지막후크build `zEY9jP0Mcmqs90L0HCPvB`에서별도표적로컬작성25/25·핵심10/10을다시완료했다. 이35회는앞155회와겹치며마지막build검사로분리한다.
- 깨끗한게시worktree의pre-commit문서검사는로컬원시근거를가리키는과거폴더QA링크9개에서실패해commit을만들지않았다. 원시파일은복사/게시하지않고해당9개를명시적인‘로컬전용근거’경로표기로바꿨다. 과거판정·수치·실패이력은변경0이다. 로컬출력이없는작업본에서후크를그대로재실행한다.

## 전체 CI의 날짜 경계·재읽기 보완

- [두 번째 CI36821584084](https://github.com/knhbae/flowme2605/actions/runs/36821584084), head `3efea905`: 기본·비공개 통합·통합 gate는 통과했다. 전체 브라우저는760개 시나리오에서758pass·1flaky·1fail(재시도 포함763회)이므로 전체 통과가 아니다. 개발계 교체는 하지 않았다.
- 월간 실패는9월2/3일 고정 fixture를 실제10월 화면에서 검사하여 예상28빈날짜 대신31빈날짜가 나온 것이었다. 깨끗한 작업본에서도 동일하게 재현했다(2개 표적 중 월간1fail·반복1pass). 기존 인접 테스트와 같은 `page.clock.setFixedTime('2026-09-02T03:00:00Z')`를 해당 월간 테스트에만 적용한다. 실제 timer·30/28일 기대값·저장 오류/취소/Undo/byte 비교는 유지한다. 날짜 고정 뒤 두 표적을5번씩 실행해10/10통과했다.
- 반복 Item 재읽기의CI 첫 시도는checkpoint byte가null이었고재시도는통과했다. 직접 원인을 확정하지 않았다. init helper는legacy/draft만 지우고checkpoint를 지우지 않으며일반boot reader는read-only임을대조했다. 재읽기 직후실제reader의`ready/checkpoint`와‘마지막 성공 checkpoint 복원’상태를추가로기다리도록검사를강화한다. 기존exact byte/source/occurrence/Undo/저장호출검사는그대로이며재시드·복구쓰기·기대값완화는없다. 보완후전체해당spec와새head CI로확인한다.
- 추가 소유 경로는 `tests/e2e/personal-workspace-integrated-standalone.spec.ts` 1개다. 제품source·고정HTML·DB/Auth·운영저장구현변경0이며기존105path와합쳐106path다. 실패/불안정이력은유지한다.
- 마지막해당standalone spec은26/26·재시도/skip/실패0으로통과했다(`output/alpha-writing-ux-dev-release/standalone-final-clock-ready/results.json`,로컬전용). 정확한checkpoint/source/회차/Undo/운영sentinel byte검사는유지했다. 이검사는역사보고서캡처를생성하는기존경로도실행했으므로게시worktree에서생긴PNG2개는stage/게시하지않는다. 원본작업본과기존Git캡처는유지한다. 후속commit은test/manifest/이QA3경로만stage한다.

## 시작 기준 이력

- 작업본 `D:/flowme2605/flow-ux-journey-20261001`, branch `agent/flow-ux-journey-20261001`, HEAD `1eb9be68835b71d234995e932d791b4058571fd5`.
- reporter2026-10-01T04:14:52.914Z:24modified·48untracked grouped entries·staged0. 세 이전 목표의 소유 근거를 대조하며 모든 dirty 파일을 자동 stage하지 않는다.
- 현재 fetch 후 remote main `efd8b642`, HEAD는 main보다7commit 앞선다. 기존 Draft PR204/205가 있고 main 병합은 하지 않는다.
- 현재3105 앱은 core-ux 작업본의 child2184/launcher10020, 이전 반영 build `F9QqWgnGf7n_PaVUEavrK`. 교체 직전 PID/시작시각·build·설정 hash를 다시 확인한다. 과거 runbook의 `Ozum…`은 이번 최신 복귀본이 아니다.
- 초기 보안2026-10-01T04:16:14.064Z:취약점0·소비자 호환4/4, sourceChanged[]. `output/integrated-product-poc/audit-2026-10-01T04-16-14-064Z.json`과 log는 로컬 전용이다.

## 근거 분리

직전 목표의 npm2,258/통합2,735·앱75/HTML40/회귀25 통과는 이전 근거다. 이번 게시 후보의 실제 검사와 배포 자산 판본을 아래 후속 기록에 확정한다. 실제 Android/iOS·OS IME·AT와 관찰 사용자 시험은 이번 목표에서 실행하지 않는다.

## 현재 외부·게시 경계

- 04:27 시작한 npm/build/type 검사는 실행 결과가 통과했지만 소스2파일이 실행 중 변경되어 최종 판정에서 제외했다. 같은 배치의 통합 검사는 소유 테스트 프로세스만 종료했다. 기록은 삭제·덮어쓰지 않는다.
- 이전 모바일 표적 검사35/35(최종 post-commit 보완은 위38/38). 외부 합성 경계 검사7/7. 화면을 실제 연 횟수마다 정확한 Cloudflare script 한 건만 합성하는 기대값으로 바꿨으며 새 host·request·console-error 허용은 없다. 전체 소스는 이 보완 후 다시 고정한다.

## 첫 고정 후보와 브라우저 보완

- source639개 snapshot `d1c497ddcbe84b4532fb30fa8ec1d4f4002c4afe1c299f107c70f189dd2a59d7`, build `7QgaMn6R607Fw-wiMuNfm`. npm04:35:41~04:38:00은2,258/2,258·drift0, 타입564entry오류0·drift0, build04:35:41~04:39:50은exit0·drift0였다. 이 후보의 브라우저에서 아래 결함을 찾았으므로 최종 반영 판본으로 사용하지 않는다.
- 작성 여정15/15와 기존 핵심10/10은 이 첫 build에서 완료했다. 작성80·폴더50은 계획된 실행 수이며 완료 수가 아니다. 모바일 focus 실패·접힌 새 문서 입력 harness 실패를 발견한 뒤 해당 소유 runner만 중단했다. 완료 JSON이 없는 중단 실행의 실제 전체 실행 수·pass율은 산정하지 않는다. 강제 종료 중 생긴 worker 오류를 새 제품 결함으로 세지 않는다.
- 실제 모바일390/375 실패 화면: 목록은 접혔지만 기존 버튼의 focus가 오지 않았다. 요청 시점의 단일 frame이 React 전환 완료 전에 끝나는 경계를 보완한다. 폴더 생성 harness는 접힌 기존 목록을 명시적으로 열고 입력하도록 보완하며 두 저장/CAS·숨은 원문·ID 검사에는 손대지 않는다.
- 전체 통합04:35:42~04:48:19는 보완 전 검사 프로세스를 중단했다. wrapper는 원시 출력 보존 없이 종료·source drift0·catalog bytes불변을 기록했다. 중단된 testExecutions0은 결과 parser의 미확정 표시이며 실제 테스트를0건 실행했다는 주장으로 쓰지 않는다.
- 초기 보고서70/70(다섯 화면+720×450축소 화면)·가로 넘침/console/page/network0·키보드 상세 열기/닫기·로컬 링크5/5. 실제200%브라우저확대·실기기·접근성 인증은 아니다. 최종 문구 갱신 뒤 재검사한다.

- 기존 개발계의무인증HTTPS probe10/10통과:health200빈body/no-store·alpha/callback200·보호API401·backup-jobs503. 실제쿠키/계정정보전달0, 계정쓰기0이다. 후보반영후별도재검사한다.
- Render현재service의autoDeploy=no/triggeroff, 연결branch는기존alpha-m1이다. GitHubrepo hooks[]이다. Vercel은Git연결을유지하고DeployHooks는없으며현재/원격PRbase의`vercel.json`은deploymentEnabled:false다. API조회오류를현재Git설정UI읽기로보완했고설정변경0이다.
- privateCI환경은검토자knhbae·selfreview허용·main/PRmerge허용, source6partmetadata존재다. 기존reviewed경로만사용하고원문/secret내용은출력하지않는다. catalogjob의실패/skip을통과로간주하지않는다.
- 로컬전용`output/alpha-writing-ux-dev-release/start.json`에기존build/config·설정2파일·외부pack6개hash를보존했다. source639개와기존후보build`jMz2-m-NKSKqd2L2-sjYP`은시작기준이며모바일보완후최종build를새로검사한다.
