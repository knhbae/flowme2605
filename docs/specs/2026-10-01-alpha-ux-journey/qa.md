# 실행 근거와 한계

2026-10-01. 격리 작업본의 1차 개선을 구현·내부 검증했다. 전체 UX 완료나 공개 주소 반영은 아니다. [요구](requirements.md), [UX 제안 처리](ux-source-adoption.md), [보고서](../../content-audit/2026-10-01-flowme-ux-journey-review-ko.html)를 함께 본다.

## baseline과 초기 실패

- 처음 baseline 브라우저 5건 모두 제목 버튼의 정규식이 완료·메뉴 버튼까지 잡아 strict locator 오류로 중단됐다. 제품 결함 판정이 아니다. `output/playwright/ux-journey-before/`에 보존했다.
- 선택자 수정 후 baseline 5건 모두 이미 열린 편집기의 원문 복귀에서 기대 행1 대신 행0이 관측됐다. 실제 결함이며 `output/playwright/ux-journey-before-verified/`에 남겼다.
- baseline 특성화 5/5는 위 미충족을 명시적으로 기록하고, 날짜/기간/원문 보존·메모 추가·reload·경계를 확인한 것이다. 원문 복귀 통과를 뜻하지 않는다. `output/playwright/ux-journey-before-characterized/`.
- 첫 A안 build·npm test 2,258/2,258·typecheck 556 entry/진단0·브라우저10/10 뒤, 독립 검토가 접힌 retained editor의 원문 복귀를 지적했다. native focus port로 보완하고 최종 검사를 다시 실행한다. 중간 통과와 최종 통과를 합쳐 고유 검사 수로 쓰지 않는다.
- 최초 별도 typecheck에는 기존 Cloudflare host test의 header union 타입 진단1건이 있었다. 부정 입력9개와 assert를 유지한 채 배열의 `Record<string,string>[]` 타입만 명시해 해결했다. 제품 host gate는 변경하지 않았다.
- 전체 통합 검사 초기 실행은 262파일·2,630회 중 2,628 통과/2 실패였다. 동시에 소스4개가 바뀌어 `verifiedExitCode=1`이다. 실패 하나는 App의 위치 복원과 Space의 새 rAF가 경쟁하지 않아야 한다는 기존 검사였고 실제 경쟁 가능성을 확인했다. Alpha에만 새 native 복귀를 허용하여 App의 기존 checkpoint 권한을 보존했다. 다른 하나는 추출 handler fixture에 새 입력 잠금 ref가 없었던 `inputLockCount is not defined`다. 누락된 잠금/dirty/회차 ref를 보완하고 일반 문서 열기·App 복원 전후·Alpha 복귀 검사를 추가했다. 기존 데이터·기록·foreign/missing 검사와 ‘App 경로에서 Space rAF 금지’ assert는 유지했다.
- 위 보완 뒤 표적 최종 99/99를 별도로 통과했다. 소스가 바뀐 전체 초기 실행을 전체 통합 PASS로 재명명하지 않는다. 최종 고정 소스의 전체 통합 재실행은 게시 전 별도 관문이다.
- 기존 Cloudflare 브라우저의 첫 재실행은 9/10 통과였다. 844×390에서 로컬 정적 CSS GET의 `route.fetch: socket hang up`이 발생했고 실패 근거는 `output/playwright/cloudflare-release-local-initial/`에 보존했다. 같은 검사를 재실행해 10/10 통과했으며 retry 설정·API 경계·assert를 완화하지 않았다. 이후 App/Alpha 분리 보완의 최종 build에서도 다시 검사한다.
- 긴 접힌 문서 검사 초기 실패는 fixture가 빈 행이 아닌 행에 scope를 만들어 합성 scope가 생기지 않은 경우였다. 빈 명명 행에서 먼저 scope를 만든 뒤 자손을 추가하도록 fixture를 고쳤다. 진단 선택자 실패와 이 준비 실패는 제품 PASS로 합산하지 않는다.

## 최종 결과

| 검사 | 이번 최종 실행 | 근거 |
| --- | --- | --- |
| 기본 `npm test` | 2,258/2,258, 실패/skip 0 | `output/integrated-product-poc/npm-test-2026-09-30T22-22-22-151Z.json`과 같은 이름 log. 실행 중 소스 변경0. |
| 관련 표적 | 99/99, 실패/skip 0 | 아래 표적 명령의 실제 tool 결과. 구성: Space/Editor 전체81 + writing navigation/position9 + Alpha layout4 + Cloudflare host5. |
| 기존 App writing race | 3/3, 실패/skip 0 | `writing-navigation-race.test.ts`. 실제 App callback·같은 문서·pending checkpoint 검사. 별도 실행이며 위99에 포함하지 않는다. |
| 타입 | entry556, source628, 진단0 | `output/integrated-product-poc/targeted-types-2026-09-30T22-23-50-484Z.json`. 실행 중 소스 변경0. |
| production build | exit0 | `output/integrated-product-poc/build-2026-09-30T22-22-22-151Z.json`과 log. 실행 중 소스 변경0. |
| 최종 앱 여정 브라우저 | 15/15, 실패/skip/flaky 0 | `output/playwright/ux-journey-after-final/results.json`, 3시나리오×5크기. 실제 production 정적 bundle, 합성 Auth/API. |
| 최종 기존 브라우저 회귀 | 10/10, 실패/skip/flaky 0 | `output/playwright/cloudflare-release-local/results.json`, 2시나리오×5크기. 최종 build로 재실행. |
| 조작 HTML 모델·브라우저 | 9/9, 실패/skip 0 | 모델8+opt-in browser1. A/B 각각5크기, `output/playwright/ux-journey-lab-*.png`. main도 최종 재실행했다. |
| 최종 보고서 HTML | 5/5크기 | `output/playwright/ux-journey-report/result.json`와 PNG. 모든 크기 가로 넘침0·키보드 link 접근, local link12개 존재, page/console/external network 오류0. main이390/1440 PNG를 직접 확인했다. |

문서 링크·skill sync 검사도 통과했다: 검사4/4, required16개, local link6,797개. 전체 초기 통합 실행과 실패2건은 앞 절대로 보존한다. 최종 전체 통합 재실행을 하지 않았으므로 그 suite의 PASS를 주장하지 않는다. 반복 실행·표적/기본 검사 간 겹침을 고유 검사 합계로 표시하지 않는다.

### 재현 명령

```powershell
node scripts/personal-workspace-poc/program-verify.mjs npm-test
node scripts/personal-workspace-poc/program-verify.mjs build
node scripts/personal-workspace-poc/program-check.mjs
$uxFinalTests = @(rg --files components/flow/integrated-poc | Where-Object { $_ -match 'Program(Space|TextEditor).*\.test\.tsx?$' })
node node_modules/tsx/dist/cli.mjs --test @uxFinalTests lib/flow/integrated-poc/writing-navigation.test.ts lib/flow/integrated-poc/writing-position.test.ts components/flow/integrated-poc/AlphaWorkspace.layout.test.ts lib/flow/integrated-poc/alpha-server/cloudflare-hosting.test.ts
node node_modules/tsx/dist/cli.mjs --test lib/flow/integrated-poc/writing-navigation-race.test.ts
$env:FLOWME_UX_COMPARE='after'
$env:FLOWME_UX_RUN='final'
npx.cmd playwright test --config tests/e2e/ux-journey.config.ts
npx.cmd playwright test --config tests/e2e/cloudflare-release.config.ts
$env:FLOW_UX_LAB_BROWSER='1'
$env:FLOW_UX_LAB_CAPTURE='1'
node --test scripts/content-audit/ux-journey-lab.test.mjs
node scripts/content-audit/verify-ux-journey-report.mjs
```

앱 브라우저 검사는 별도 합성 loopback 서버가 필요하다. `serve-ux-journey-app.mjs`는 이전 계정·환경 설정을 상속하지 않으며 fake publishable key/합성 signing만 전달한다. 공개 앱3105나 Tunnel을 이 서버로 대체하지 않는다. HTML은 서버 없이 브라우저의 file URL에서 조작할 수 있다.

### 시나리오 판정

| 경로 | 결과 | 증거의 한계 |
| --- | --- | --- |
| 메모+할 일→날짜 취소0변경→배정→오늘/주간/월간→완료/재열기→원문 해당 행→메모 추가→reload | 5/5크기 통과 | 한 문서/Item 합성 조합이다. 자유 입력의 전체 문법·콘텐츠 전수 성공이 아니다. 같은 날짜의 진행값은 기존 정책대로 최신0% 값이며 prototype의 history2건 모델과 다르다. |
| 접힌 편집 도구 keyboard Enter→정렬 노출→Escape→summary focus | 5/5크기 통과 | 취소·조회에서 요청/상태0변경. 실제 IME/스크린리더 검증은 아니다. |
| 긴 문서36메모→scope 접기/inert→기간의 child Item→같은 행37 복귀/펼침/내부 스크롤 | 5/5크기 통과 | Alpha 경로만. 서버 저장0변경. ProgramApp은 기존 history 복원을 유지한다. |
| 기존 생성·본문·날짜/시간·reload 및 결과 불명→같은 요청 ACK 복구 | 각5/5, 총10/10 | 기존 fixture의 합성 CAS/receipt다. 실제 서버 장애나 장시간 탭 전체 검증은 아니다. |
| 독립 A/B: 추가·날짜·완료/재열기·원문·날짜해제·Undo·저장오류/재시도·reload·손상 lock·B 집중탈출 | opt-in browser1건 통과, 화면10개 | row별 합성 모델. 제품의 parser·writer·계정·동기화와 혼동하지 않는다. |

### 화면별 전후 평가

| 크기 | 본문 첫 위치 전→후(px) | 첫 화면 본문 전→후(px) | 내부 평가 |
| --- | --- | --- | --- |
| 390×844 | 627→545.55 | 217→298.45 | 약81px 확보, visible toolbar target48px. |
| 375×812 | 679→597.55 | 133→214.45 | 약81px 확보. 날짜 미정 탭의 줄바꿈은 유지한다. |
| 844×390 | 460→460 | 0→0 | 첫 본문 미확보. 페이지/편집기 스크롤로 모든 시험 행동은 실행했지만 높이 개선은 남는다. |
| 1024×768 | 476→476 | 292→292 | 데스크톱 배치 유지, 보조 도구만 접힘. |
| 1440×900 | 476→476 | 415→415 | 데스크톱 배치 유지, 보조 도구만 접힘. |

전후는 같은 자료·state·route·초기 scroll0이다. baseline은 `ux-journey-before-characterized`, final은 `ux-journey-after-final`의 `geometry.json`/`first-viewport.png`다. 5개 모두 가로 넘침false이고 최종 상시 toolbar5개 높이는48px다. root는375 첫 화면과844 접힌행 복귀 PNG도 직접 확인했다. 이 수치와 전문가 내부 판정은 작업 성공률·학습 비용·관찰 사용자 개선 결과가 아니다.

## 데이터·소유 경계

Auth·account·CAS·요청 확인은 합성 fixture다. 실제 앱 production 정적 파일만 loopback QA 서버에서 GET으로 받는다. 실제 계정·원격 API·Auth/DB 변경·배포는 0이다. fixture의 기존 운영 `flow:*` sentinel byte 동일과 prefix 밖 쓰기0는 시험 브라우저의 경계 증거이며 실제 사용자의 전체 DB/localStorage 불변 검증을 뜻하지 않는다.

prototype은 정확한 `flow:poc:personal-workspace:v1:ux-journey` key를 사용한다. 모델8건과 opt-in 브라우저1건(9/9)에서 A/B 각각5크기, 지정 key 밖 set/remove0·clear0·sentinel2개 byte 동일·외부 network0·pageerror0·consoleerror0를 확인했다. row별 고정 ID 합성 입력이며 제품 자유 텍스트 parser·IME·동기화 검증이 아니다.

전체 통합 suite에서 기존 catalog pack은 `D:/flowme2605/flow-poc-merge-prep-20260920/lib/flow/integrated-poc/catalog-library-pack.v1.json`을 명시 환경 변수로 읽기만 했다. 복사·수정·게시0. 검사 전후 SHA256은 `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be`로 같았다. credentials나 기존 설정 파일은 읽거나 전달하지 않았다.

## 미실행·후속

실제 Android/iOS·IME·보조기술과 관찰 사용자 검사0. 장시간 인증/탭·OS 자동 시작·신규5D·콘텐츠 전수·공동 편집 권한·모바일 구조 키보드 정책은 이번 밖이다. 짧은 가로 화면의 첫 화면 본문 확보와 B 집중의 실제 앱 계약은 후속 개선 후보다. 복구된 첫 저장의 server Undo 제한은 그대로 남긴다. 이번 정확한 접힌 행 native 복귀 구현·브라우저 판정은 AlphaWorkspace 경로에 한정한다. ProgramApp의 기존 history 복원은 유지했지만 접힌 행을 native로 펼치는 UX까지 새로 구현한 것은 아니다.

## Skill/tool 기여

`flow-ux-review`로 상시 도구를 감산하되 입력 Undo·저장 오류·복구를 보존했고 독립 검토에서 접힌 편집기 복귀 누락을 찾았다. `flow-report-artifact`는 요구 대조와 실제 검증을 보고서에 분리했다. 브라우저 QA는 같은 Item·원문 위치와 화면 geometry를 재현했지만 실사용 개선의 근거는 아니다. 기존 시각 체계의 좁은 개선이므로 새 브랜드·AI bitmap·Figma 작업은 하지 않았다.

## 마감·다시 볼 조건

`workflow:closeout`의 소유/검사 lane 원장을 실행하고 실제 diff를 확인했다. 독립 리뷰의 기존 P2 두 건(접힌 Alpha 원문 복귀·UX1/UX2 제안 처리 추적)은 보완됐고, App/Alpha 분리 후 최종 읽기 전용 리뷰에서 신규 P1/P2는 발견하지 못했다. 독립 리뷰는 전달받은 검사 수치를 별도로 재실행한 것이 아니다.

최종 문서 검사4/4·skill sync·diff check를 통과했다. build/npm-test/typecheck의 저장된 source hash와 현재 파일도 재대조하여 drift0을 확인했다. 공개 앱3105(PID2184/launcher10020)·기존 Tunnel3864는 보존했고 공개 작업본의 Git 상태도 여전히 clean이다. 합성 QA3106의 launcher1548/child19104는 종료했으며 port3106 listener와 두 process가 없는 것을 확인했다. 조작 HTML의 loopback3109(PID21916)는 사용자 미리보기로 남겼고 Codex 탭을 결과물로 표시했다. 파일 삭제0·stage0·HEAD변경0이다.

Codex 브라우저는 file protocol을 차단했으므로 파일 접근을 우회하지 않고 이미 열려 있던 두 HTML만 제공하는 읽기 전용 HTTP 미리보기를 유지했다. 일반 브라우저의 로컬 file URL QA는 별도9/9 근거이며 Codex에서도 file을 열었다고 표현하지 않는다. 보고서의 상대 Markdown 출처 링크는 로컬 파일 기준이고 이 제한된 HTTP helper는 Markdown을 제공하지 않는다. 서버가 꺼지면 로컬 HTML을 일반 브라우저로 열거나 `node scripts/content-audit/serve-ux-journey.mjs`로 두 결과만 다시 제공할 수 있다.

다음 UX 비교 목표에서 작은 높이의 본문 확보·B 집중의 진입/탈출/입력/저장 상태 계약을 다시 본다. 공개 반영을 요청받으면 최종 고정 소스 전체 통합 재검사를 선행한다. 장시간 인증/탭·복구 첫 Undo·구조 키보드·원래6~9·5D는 이 목표의 완료 조건에 넣지 않았고 해결 완료로 바꾸지 않는다.

## 10/1 추가 피드백 목표의 후속 증거

위 판정은 이 목표 마감 시점의 이력이다. [문서·폴더 작성 UX QA](../2026-10-01-alpha-folder-writing-ux/qa.md)에서 같은 일반 메모 fixture의844×390 본문 top460→324·노출0→66px와 첫 메모44px 전체 노출을 확인했다. 다른 세로/데스크톱 배치는 유지했다. 기존 앱25회 회귀와 마지막 고정 소스 전체 통합2,676/2,676도 그 원장에서 확인했다. B 전체 집중의 실제 앱 구현·장시간 운영·실기기/관찰 사용자·공개 반영은 여전히 완료가 아니다.
