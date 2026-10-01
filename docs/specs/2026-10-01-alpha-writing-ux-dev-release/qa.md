# 검증·반영 원장

## 최종 문서 CI의 trusted 입력 경계 보완

- 문서 전용 head `97ccdd0f7cb8ef6bd917b3c697f7e3a8e9a20c88`의 [CI36827429026](https://github.com/knhbae/flowme2605/actions/runs/36827429026)은 core·private·gate 3개가 통과했지만 전체 E2E는 760시나리오 중 759pass·1fail(재시도 포함762회)로 실패했다. 제품 코드 변경0이며 이 실행을 전체 통과로 표시하지 않는다. private 허용 요약은267파일·2,744/2,744·fail/skip/cancel0·source639 drift0·rawOutputRetained:false다.
- 실패한 기존 standalone trusted-touch 시나리오는 터치 스크롤 후 mouse reorder다. 공개 trace3개를 읽어 초기/최종 순서가 모두 `meeting → contract`이며 기대순서가 그 역순임을 확인했다. 캡처만 보고 늦은 렌더라고 해석한 초기 가설은 철회했다. 실제 trace의 down→up 사이 scrollTop609→318, 실제 드래그 class·패널·drop표시 부재는 입력 활성화/viewport 준비 경계를 지지한다. Chromium raw drag 이벤트가 없어 내부 단일 원인은 확정하지 않는다.
- 수정 전 로컬 system Chrome10/10·managed Chromium10/10이었다. 결과 대기만 추가한 탐색 판본도20/20이었으나 원인 근거가 부족해 철회했고 최종 보완 판정으로 사용하지 않는다. 공개 브라우저 trace·raw 근거와 탐색 JSON은 ignored output의 로컬전용 자료로 남기며 private 원시로그는 내려받지 않았다.
- 최종 테스트 보완은 같은390×500 화면에서 두 실제 hitpoint를 준비하고 scroll 안정·hit대상·trusted mouse의 실제 dragging·before drop표시를 확인한 뒤 mouseup1회만 실행한다. 정확한 전체 순서·mutation1·touch mutation0·legacy/operating bytes검사를 유지한다. timeout·retry·skip·제품/HTML·Auth/DB·운영 저장 구현 변경0이며 synthetic drag/force/DOM 상태 주입은 없다. 독립 diff 검토 blocker0. 최종 managed Chromium10/10·system Chrome10/10·retry/skip/fail0으로 통과했다. 반복20회는 한 시나리오의 안정성 확인이며 고유 요구20개가 아니다. 해당 새head CI로 후속 확인한다.
- 이번 후속 게시 범위는 이미 소유 manifest에 있는 테스트1파일과 QA/PR설명2파일뿐이다. 누적 게시 경로108개를 유지하며 실행 중인3105 앱의build/install/제품 코드에는 변경하지 않는다. 최신 후속 CI는 [PR206 checks](https://github.com/knhbae/flowme2605/pull/206/checks)에서 확인한 뒤 목표를 완료한다.

상태: 제품 판본 CI4개 통과·개발계 앱 반영·외부 판본 검사 완료. 최종 마감 문서의 최신 head CI는 PR checks로 따로 확인한다. 아래 진행/대기/실패 문구는 각 시점의 이력이다.

## 최종 제품 판본·개발계 반영

- 최종HTML은실제Chrome의다섯요청크기와720×450축소viewport에서70/70통과했다. 가로넘침·범위밖element·예상밖console/page error·추가네트워크0,상세설명Tab/Enter열기·닫기와로컬링크6개존재를확인했다. 390/1440캡처를직접열어상단배치·본문·표를검토했다. HTML SHA256 `fc5dbdeefa3478fcddc207b336f70a04db744fa77bac7360b5b2779e6de428ee`는검사중동일했고이후HTML은수정하지않는다. 결과`output/alpha-writing-ux-dev-release/report-deployed-final/results.json`은로컬전용이다. 축소viewport는실제200%zoom/실기기/접근성인증/사용자시험이아니다.

- 제품 head `ae5a97f09b4ea9284ec37ba912fc5515af838823`의 [CI36824430918](https://github.com/knhbae/flowme2605/actions/runs/36824430918)은필수4job모두success다. private허용summary는267파일·2,744/2,744·fail/skip/cancel0·source639 drift0·rawOutputRetained:false다. 전체E2E의실제job로그는760시나리오/762회·758첫회pass·2retry-pass를기록한다. 이를760무재시도통과로표시하지않는다. `p24-journey-frame-reset.spec.ts:176` Calendar와구형`personal-workspace-poc.spec.ts:636` 이동시나리오는불안정후속이다. 보완한월간/반복재읽기는이번CI첫회통과했다. 이전단발재읽기의직접원인은미확정이다. 일반run로그조회의stream/EOF·단발job503은직접공개E2Ejob로그조회로보완했으며비공개원시로그를 새 근거로 사용하지 않았다.
- 2026-10-01T06:39:23Z에3105의기존child2184/launcher10020을이름·생성시각·부모·절대앱경로·loopback포트소유로재확인하고그두소유프로세스만종료했다. 기존Tunnel3864는유지했다. 후보`flow-ux-journey-20261001`의launcher5728/child11220이같은127.0.0.1:3105에서build `zEY9jP0Mcmqs90L0HCPvB`를실행한다. 기존F9build/config와설정원본을건드리지않았고실제복귀실행은하지않았다.
- 반영후외부HTTPS10/10:health200빈body/no-store·alpha/callback200·무인증보호API401·backup-jobs503/off. 실제쿠키·credential·계정쓰기0이다. 로컬전용`after-dev-swap.json`과`before-dev-swap.json`은639source의위e088snapshot·build불변및보호대상6개hash동일을확인한다. 실제운영DB byte전체대조가아니다.
- 마지막원격합성작성25/25·기존핵심10/10·fail/skip/retry0이다. 로컬전용`output/playwright/writing-ux-release-remote-readonly-live-v1/results.json`과`output/alpha-writing-ux-dev-release/core-remote-readonly-live-v1/results.json`에각실행을보존한다. 5viewport각7건이며로컬전체155와겹치므로고유요구수로합산하지않는다. fixed HTTPS문서/static GET만실전달,전체Auth/API·외부telemetry는합성/차단한다.
- `assets-postpush-v1-live-v1.json`에서최종build의로컬35와원격35를35쌍·40경계기록으로대조했다. 정적자산24개모두exact path/hash와실제built파일이일치하며manifestSHA256은`da8222c9a636ae0bf3f40e5a532a61e27df2a325c42671b4acabd06ea9ad57ef`다. 모든경계에서예상밖console/page error·document/body overflow·허용prefix밖Storage호출·실API/Supabase/telemetry전달0,synthetic sentinel byte동일이다. 합성telemetry script의예상SRI console표시는문서load횟수와exact대조하여분리하므로전체console error0/telemetry검증으로표현하지않는다.
- 마감정본은별도`flow-writing-release-records-20261001`에서검사/게시한다. 실행앱에build/install0이며최종문서commit은제품source변경0을확인한다. 최신문서head CI는[Draft PR206 checks](https://github.com/knhbae/flowme2605/pull/206/checks)로분리하며이문서작성시점에미실행된CI를미리success로표시하지않는다. main병합·Render/Vercel신규Preview·Production·DB/Auth·Tunnel/DNS변경0,이번실기기/OS IME/AT NOT_RUN·관찰사용자0이다.

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
- 위PNG2개는초기확인수이며전체26건완료후의최종수는19개였다. 새캡처19개를로컬전용`output/alpha-writing-ux-dev-release/generated-standalone-captures/`에hash와함께보존하고,깨끗한게시작업본에서해당검사만생성한19개역사캡처사본을Git기준과byte-for-byte동일하게복원했다. 다른작업본/사용자파일변경0·이미지게시0이다. 커밋 `ae5a97f09b4ea9284ec37ba912fc5515af838823`은정확히3경로이며후크docs/npm/build를우회하지않고push했다. 새[CI36824430918](https://github.com/knhbae/flowme2605/actions/runs/36824430918)은진행중이다. 실행앱후보의639source·build `zEY9jP0Mcmqs90L0HCPvB`는이테스트/문서전용보완과동일제품판본을유지한다.
- 두 번째CI의허용public summary를별도읽어비공개통합267파일·2,744/2,744·실패/skip/cancel0·source639실행중drift0·rawOutputRetained:false를확인했다. Linux checkout의LF snapshot은`479e26c0ec7e7e4c40d752bc83bf341ae0073c511c86e904533541473d10ddb8`이며Windows작업본의CRLF byte snapshot과직접같다고표시하지않는다. Git제품source변경0을별도로대조한다. 원시private job로그는다운로드하지않았다.

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
