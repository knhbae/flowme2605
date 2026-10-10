# 실행 QA

## 시작 증거 — 현재 읽기/명령

- UTC 2026-10-02T03:22:57.642Z session-start: branch `agent/flow-flow-execution-ux-20261001`, HEAD `9333b299`, upstream 없음, modified17/untracked46 Git 요약. 디렉터리 축약을 펼친 실제 파일 수/소유 수는 별도 대조한다.
- `git ls-remote`: main `efd8b642707b5c8e67b727f23169ae41c43cb5e8`, 개발계 branch `9333b29931c838a51a5034e15e908ef0218e154b`, 새 후보 branch의 원격 ref는 없음.
- `gh pr view 207`: OPEN Draft, base `agent/flow-ux-journey-20261001`, head `9333b299`, 기존 네 CI SUCCESS. 새 후보 CI 판정은 아니다.
- Node `v24.17.0`, npm `11.13.0`, `.githooks`의 pre-commit docs / pre-push verify 확인. skip flag를 설정하지 않는다.
- `npm run security:audit`: exit0, 취약점0·dependency compatibility4/4 PASS. package/lock/dependency를 변경하지 않았다.

## 현재 소유 통합·게시 준비 — 새 명령/직접 감사

두 목표의 명시 소유47/38개를 독립 대조했다. 공통3개(`ProgramSpace`/`ProgramTextEditor`/`STATUS`)의 합집합82에서 문장 검토 작업본8을 제외한 공개 후보74개=runtime13·tests18·tools19·docs24다. 이번 정본5개를 더해 exact79개로 고정했다. 새로운 중간 HTML3과 `_workspace`10개는 제외·보존한다.

내장 worktree 도구는 workspace root가 Git repo가 아니어서 오류를 반환했다. 현재 저장소를 명시해 Git worktree로 `flow-two-ux-dev-release-20261002@9333b299`, branch `agent/flow-two-ux-dev-release-20261002`를 만들었다. 기존 제품/QA 실행 경로에서 install/build/hooks를 하지 않았다. 79파일의 기계적 byte 사본을 새 작업본으로만 옮겼고 hash drift0·누락/초과0이다. 첫 prepare는 설치 전 TypeScript가 없어 실패했으며 npm ci 후 다시 실행해 성공했다. 실패 때 source/대상 소유 파일의 복사는 시작하지 않았다. package/lock/dependency 변경0, 새 작업본의 npm ci는223 packages/취약점0이다.

출판용 문서 검사 첫 실패: 기존 새 QA의 ignored output 링크30개가 clean 작업본에서 깨졌다. 원문 QA·로컬 근거 파일은 이전 후보에 보존하고, 공개 사본의 해당 링크30개만 ‘로컬 전용 근거’ inline code 경로로 전환했다. 이전 여정 보고서의 화면4·JSON링크2도 같은 방식으로 표시했다. 원 판정·실행수·다른 문장은 같고, 원 캡처/JSON payload를 복사하거나 공개하지 않았다. 독립 대조에서 그 두 파일의 정해진 변환 외 변경0·나머지77파일 byte동일을 확인했다. 이 후 새 목표의 현재 QA 기록 갱신은 그 대조 다음 단계다. HTML 네 개의 private output/src/href·외부 media/script/전송 코드0이다. 공개판 새 렌더 검사는 아직 하지 않았다.

공개 exact79 bytes 검사에서 private payload/credential 신호0, 별도 검토신호7파일은 합성 주소·malformed URL fixture와 과거/새 로컬 QA 경로다. STATUS/README의 과거 경로는 기준 HEAD에 이미 있으며 새 보고/QA 경로는 이 후보에 들어가는 로컬 시험 위치다. 신호 검사를 일반 비밀정보 전수 보장으로 확대하지 않는다. 원 카탈로그·env·계정 파일·이미지/trace/원 JSON은 공개 후보에 없다. private client import106roots/549source·금지경로0, tracked catalog10,814파일·findings0을 확인했다. tracked 검사만으로 신규 untracked까지 검사했다고 쓰지 않으며 exact79 bytes 검사를 따로 수행했다.

## 현재 로컬 검증

- `npm test`: UTC03:32:53.576Z–03:33:28.239Z, **2,258/2,258 PASS**, fail/skip/cancel0·exit0·source drift0. 로컬 전용 `output/integrated-product-poc/npm-test-2026-10-02T03-32-53-576Z.json`.
- 관련15파일 표적: **151/151 PASS**, fail/skip/cancel0·exit0·12,149.0845ms. 신규/기존 제작 재진입·private schedule·native retry·폴더/날짜/작성·fixture/loopback·시안 대응 검사다. 합성 입력/HTTP/CAS 및 JSX이며 라이브 DB나 브라우저151회가 아니다. npm/통합과 중복을 합산하지 않는다.
- 엄격 회귀 wrapper의 합성 판정 unit10/10 PASS·exit0. 실제 앱60회 결과로 쓰지 않는다.
- 타입: inventory/판정10/10 PASS, entry578·source653·진단0·source drift0.
- 현재 별도 제품 build: UTC03:34:20.154Z–03:35:15.763Z, exit0·source drift0, build `Ze2wAtzddvDNFTtsL2mHI`. 로컬 전용 `output/integrated-product-poc/build-2026-10-02T03-34-20-154Z.json`. 아직 dirty의 게시 전 준비 build이며 최종 게시/개발계 제공 판본이 아니다. 마지막 pre-push build와 새 핵심 앱·자산 검증을 결합해야 한다.
- 공개 경로 표기 보완 뒤 docs4/4·skill sync·필수16·7,079links PASS. security audit 재검사는 취약점0·호환4/4 PASS.
- UTC03:41:17.987Z 출처 metadata 현행 probe: published153·일반 route121·preview/hidden32, current121·reviewDue/stale/missing0. 기본 npm에도 실제 현재 날짜를 쓰는 출처 gate가 있다. 출처 문서/날짜 수정0이며 외부 원문을 이번에 전수 재조사한 결과가 아니다.
- 기존 승인 launcher의 새 제품 작업본 `--check`는 exit0·위 준비 build·backupJobs off다. 서버 spawn/포트 bind/실제 계정 writer는 실행하지 않았다. source/build 생성 관계나 DB 성공의 증명은 아니다.

## 기존 개발계·배포 side effect·보호

현재 읽기 진단에서 live child12388/launcher27652·각 생성2026-10-01T22:57:24.548866Z/22:57:24.070564Z, 절대 next 경로는 `flow-folder-content-ux-20261001`, loopback3105/build667DI4JldqTDckfQ16wB5다. 별도 Tunnel20920·생성22:59:30.578102Z, QA3106/2036 및3107/22188은 보존했다. 로컬 무인증/무cookie 세 `/alpha` GET은200과 각 기대build, 기존3105health200/0bytes/no-store를 확인했다. 과거 runbook PID10732/26640/3864를 현재 대상으로 쓰지 않는다.

현재 조회에서 Render autoDeploy=no/trigger=off·PRpreview off, Vercel Git연결 유지·Deploy Hooks 없음·root directory 실제 빈값과 변경없는 `git.deploymentEnabled:false`, repository webhook0이다. 자동 배포를 위한 설정 변경은 필요하지 않다. Vercel 상세 connector의 adapter 오류는 UI 대체 읽기로 확인했고10/1 UTC 이후 배포0이었다. 새 push 후에는 목록을 다시 읽어 확인해야 한다. 비공개 CI는 기존 reviewer/ref 규칙을 유지하고 해당 head의 승인/실행만 진행한다.

UTC03:41:19.247Z 새 보호 대조: 원본/실행/후보 donor Git 상태·실행 source639·보호8개 hash drift0, 제외13개 원 byte동일·복사0, selected79·staged0·비밀payload0. 별도 독립 감사에서 기존 실행81static hash도 이전 baseline과 일치했다. 실제 DB 전수 snapshot은 아니다. source/서비스 원본을 수정하거나 계정에 시험 입력을 하지 않았다.

## 승인 대기 중 추가 준비 — 새 실행 근거

UTC03:51:12.759Z 기존 read-only release evidence collector로 준비 판본을 새로 대조했다. build 기록의 exit/verifiedExit0·signal/launchError없음·source drift0을 확인했고, 당시 검증 입력653개의 hash가 현재 전체 해당 inventory와 같다. 실제 준비 build `Ze2wAtzddvDNFTtsL2mHI`의 정적 파일81개 path/hash와 rollback build `667DI4JldqTDckfQ16wB5`를 기록했다. exact79파일·staged0·보호8hash drift0이다. 로컬 전용 `output/two-ux-dev-release/preparation-build-proof.json`이며 private 설정/pack은 hash만 읽었다. 서비스·Git index·계정 writer를 실행하지 않았다. 기록653개는 프로그램 검증 input 범위이며 전체 Next compile input 집합이나 실제 served bytes 증명은 아니다.

독립 드라이버 감사에서 현재3107이 이전 build라는 점, 신규35/엄격60이 요구하는 정확한 사본 경로·manifest, 제작20 드라이버의 build preflight 부재를 확인했다. [runbook](runbook.md)에 마지막 hook 전후 전체 compile input·제품 HEAD/build/static→새 QA 사본→실제 응답의 결합과 세 matrix의 판정 기준을 추가했다. 마지막 hook의 제품 `.next`를 정확히 복사하면 중복 full build는 필요하지 않다. 기존 사본/manifest 재사용·제공 중 `.next` 덮어쓰기·서버/파일 URL 정책 우회는 하지 않는다. copy/새 서버/브라우저 검사는 아직 실행하지 않았다.

## 아직 실행/확인하지 않은 것 — 현재

이 후보의 commit/push/PR·exact head 네 CI·마지막 게시 build의 새 앱/제공 자산 검사·개발계 교체·rollback 실행은 미실행이다. 사용자에게 ‘소유74+새정본5 게시·해당 비공개 CI·개발계 교체’를 묶어서 확인했으며 현재 답변 대기다. 최초 준비 턴과 첫 continuation은 로컬 검증·소유 대조·판본/복귀 절차 보완을 진행했다. 세 번째 goal turn에서도 같은 승인 경계가 유지돼 현재 HEAD9333b299·정확한79파일·staged0·새 원격 branch 없음과 승인 문구를 다시 확인했다. 실행 중인 검증 job은 없고 남은 실제 게시/CI/교체는 새 승인이 필요하므로 목표 도구의 반환 status를 blocked로 기록했다. 목표를 축소하거나 완료/paused로 바꾸지 않았다. [현재 승인 대기·재개 조건](../../STATUS.md)을 따른다. 실제 계정/Auth/DB writer·DB 전체 snapshot·Android/iOS/IME/AT·관찰 사용자 시험은 미실행/제외다.

원본 JSON·로그·화면은 `output/`의 새로운 소유 경로로 남기고 공개 Git에 넣지 않는다. 실패·재실행·최종 성공을 별도로 남긴다.

## 승인 재개

사용자가 ‘79개 파일 선별 commit·push·Draft PR·해당 비공개 CI·개발계 교체 허용, 재개해’라고 명시했다. goal 도구의 현재 status active를 확인하고 같은 전체 목표를 재개한다. 기존 blocked는 승인 전 이력이다. 승인된 게시·CI·개발계 앱 교체만 실행하며 main merge·DB/Auth/Tunnel/DNS·Production·실계정 시험 쓰기는 추가하지 않는다. 최종 제품 HEAD/build와 실제 제공 자산 및 실행 결과는 후속 QA 기록으로 결합한다.

첫 exact79 stage 뒤 diff check에서 기존 새 isolated-build 도구의 EOF 빈 줄1건이 확인돼 commit을 시작하지 않았다. 해당 파일의 끝 빈 줄만 제거하고 다시 선별 stage/diff check를 수행한다. 제품 동작·검증 조건·소유 파일 집합을 바꾸지 않는다.
