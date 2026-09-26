# M7-2 제한 실자료 시험

## 9/26 현재 — Render 다기기 시험 경로 선택·배포 전 코드 준비

사용자가 Render를 다음 시험 호스트로 선택했다. 기존 개발용 Supabase를 그대로 사용하고, Render의 **Node Web Service**로 `/alpha`와 서버 API를 함께 제공하는 경로다. 이 선택은 테스트 호스트에 관한 현재 작업 결정이며 장기 운영 플랫폼·요금제·공개 출시 결정이 아니다. 연결된 Render workspace를 읽기 전용으로 조회했고 웹서비스 항목은 반환되지 않았다. 아직 서비스 이름·실제 URL·요금제를 정하거나 생성하지 않았다.

로컬 개발 경로는 유지하면서 `render-trial-v1` 명시 설정에서만 `https://<정확한 서비스명>.onrender.com/auth/callback`을 허용하도록 환경/Auth/서버 요청 검사를 연결했다. `preview` 단계와 기존 DEV Supabase 프로젝트만 허용한다. 콜백과 쓰기 API는 **설정된 단일 origin**을 검사하며 HTTP·다른 호스트·query/fragment·운영 프로젝트에서는 닫힌다. `GET /api/alpha/health`는 이 설정과 서버 서명키 형식의 준비 여부만 200/503으로 알려준다. Supabase 접속, 로그인, 저장 성공을 확인하는 검사가 아니다. 실제 서비스 주소가 생긴 뒤 값이 정확히 일치해야 200이다.

| Render 배포 전 설정 | 필요한 값과 경계 |
| --- | --- |
| 서비스 유형/실행 | Node Web Service, Node `24.x`; build `npm ci && npm run build`; start `npm run start -- -H 0.0.0.0 -p $PORT`; health path `/api/alpha/health` |
| 공개 설정 | `FLOWME_ALPHA_ENABLED=development-only`, `FLOWME_ALPHA_STAGE=preview`, `FLOWME_ALPHA_HOSTING=render-trial-v1`, `FLOWME_ALPHA_PROJECT_REF`는 기존 DEV 프로젝트 ID, `FLOWME_ALPHA_SUPABASE_URL`은 그 프로젝트 URL, `FLOWME_ALPHA_PUBLISHABLE_KEY`는 DEV publishable key, `FLOWME_ALPHA_REDIRECT_URL`은 실제 Render origin의 정확한 `/auth/callback` |
| 서버 안전 설정 | `FLOWME_ALPHA_M3_CAPACITY=checkpoint-v1` 필수. 빠지거나 다른 값이면 Render 시험 모드의 로그인/API가 닫힘. `FLOWME_ALPHA_M3_SIGNING_KEY`는 기존 DEV 서버 서명키를 Render 비밀 환경변수로만 설정. 브라우저·Git·보고서에 값을 남기거나 임의로 교체하지 않음 |
| 비공개 카탈로그 원본 | 별도 승인 시 Render 비밀 파일에 `FLOWME-CATALOG-GZIP-BASE64-V1` 텍스트 헤더와 gzip Base64 본문을 넣고, `FLOWME_ALPHA_CATALOG_PACK_FILE`에 런타임 절대 경로(`/etc/secrets/<파일명>`)를 지정. 현재는 업로드·설정하지 않음 |
| 배포·Auth 연결 | 자동 배포 Off 권장. 최초 서비스 생성 자체가 배포를 시작하므로 **별도 승인 후** 생성. 실제 URL이 나온 뒤 DEV Supabase Redirect URL에 정확한 callback만 추가하고 기존 localhost 주소/Site URL은 임의로 바꾸지 않음 |

현재 Next 앱의 Node API가 필요해 static GitHub Pages/단독 HTML로 이 시험을 대체할 수 없다. 무료/유료 플랜과 접근 위치는 실제 서비스 생성 전에 선택·확인한다. 서비스 생성, 결제 설정, Supabase Auth 변경, 코드 발행, Preview/Production 배포는 이번 코드 준비에 포함하지 않는다. 실제 폰·태블릿 왕복과 장기간 사용도 아직 실행하지 않았다.

### 9/26 로컬 검증 결과

| 검사 | 실제 결과 | 범위 |
| --- | --- | --- |
| 환경/Auth/요청·상태 확인 표적 | 최종 설정 기준 **28/28**, 서버 경로 **55/55** 통과(서로 중복 있음) | 정확 origin·DEV 전용·누락된 `checkpoint-v1`의 요청 전 거절. 외부 서버 호출은 fixture |
| `npm test` | **2,255/2,255** 통과, 실패/skip/cancel 0 | 저장소 기존 회귀 |
| 통합 제품 전체 검사 | 중간 소스에서 **2,479/2,479** 통과 | 이후 Render 안전 모드 필수 검사를 추가했으며 전체 묶음은 재실행하지 않음. 변경 영향은 위 표적 검사와 최종 타입/build로 다시 확인 |
| 타입·build·문서 | 통합 코드 **602소스·진단0**, production build 종료0, 문서 검사 **4/4·로컬 링크6,610개** 통과 | 최종 소스 기준 |
| 로컬 모의 브라우저 | **30/30** 통과, 390×844·375×812·844×390·1024×768·1440×900 포함 | 모의 Auth/HTTP와 로컬 주소. 실제 Render 접속·실계정·실기기 검사가 아님 |

Render workspace와 웹서비스 목록 조회는 읽기 전용이었다. 이 단계의 외부 DB·계정·운영 자료 쓰기 0건, 서비스 생성·commit·push·PR·배포 0건이다. 상태 확인 경로의 200은 환경 구성이 맞다는 뜻에 한정된다. 실제 접속 가능성, 로그인 메일/callback, 데이터 동기화, 무료 플랜 제한은 서비스와 주소가 생긴 뒤 따로 확인해야 한다.

### 이 단계의 판정 기준

환경·콜백·서버 origin의 허용/거절과 상태 확인 경로를 자동 검사하고, 전체 회귀·타입·production build·모의 브라우저로 로컬 경로가 유지되는지 확인한다. 이후 별도 배포 승인을 받으면 먼저 **실제 URL을 확정하고 DEV redirect만 추가**한 뒤 PC 저장→폰 열람/수정→PC 반영 한 번을 시험한다. 그전까지 다기기 준비 완료나 M7-2 전체 완료로 표시하지 않는다.

## 9/26 후속 — Render HTTPS 전달 경계 재현과 발행 범위

`next start`의 로컬 모의 Render 요청에서 처음에는 설정 검사는 200이었지만, **올바른 공개 HTTPS 주소의 API 요청도 400**이었다. Next가 내부 listener 주소로 만든 `Request.url`을 공개 origin으로 비교한 결함이다. 공유 서버 판정을 고쳐 호스팅 모드에서는 설정된 호스트와 요청 `Host`의 정확한 일치, `X-Forwarded-Proto=https`, 전달 호스트가 있을 때 그 값의 일치, 브라우저 `Origin`이 있을 때 공개 origin과의 일치를 확인한다. 로컬 모드의 기존 URL 검사는 유지한다. 계정·제작·커뮤니티·보존·사진 API에 같은 판정을 적용했고, 내부 사진 확인 요청도 이 공개 주소 계약으로 만든다. 임의의 호스트를 허용하거나 인증/소유자 검사를 건너뛰지 않는다.

[모의 프록시 검사기](../../../scripts/alpha/render-proxy-check.mjs)는 빌드된 실제 Next 서버를 별도 로컬 포트에 띄우고 가짜 publishable/signing 값을 사용한다. 수정 후 `GET /api/alpha/health` **200**, 정확한 공개 주소의 API 요청은 주소 검사를 통과해 짧은 가짜 토큰에서 **401**, 다른 `Origin` 또는 HTTP 전달에서는 **400**이었다. 실제 Supabase 인증/DB·Render edge·폰 접속 성공을 뜻하지 않는다. 공유 주소 검사와 기존 서버 경로 표적 **58/58**, 통합 타입 검사 **604소스·진단0**, `npm test` **2,255/2,255**, production build, 최종 소스의 통합 제품 검사 **2,482/2,482**(249개 test file, 실패/skip/cancel0, 검사 중 소스 변경0)가 통과했다. 로컬 전용 실행 기록은 `output/integrated-product-poc/new-tests-2026-09-26T04-42-07-435Z.json`이며 Git 발행 범위가 아니다.

발행 준비를 위해 개별 파일 기준 Git 상태를 읽기 전용으로 세었다. 현재 HEAD/로컬 `origin/main`은 `efd8b642`, 이 브랜치에는 upstream이 없고, 수정 63개·미추적 344개로 총 407개 변경 파일이다. 앞선 reporter의 미추적 90은 디렉터리를 묶어 표시한 수다. `/alpha` 화면1·인증 callback1·API6·Alpha UI20·`alpha-*` 도메인/서버97·`scripts/alpha`138·Supabase SQL28 등이 미추적이다. 이 수는 **발행 승인 범위가 아니라 소유권 검토 대상의 예비 목록**이다. `package.json`에는 alpha 필수 의존성·postinstall이 기존 수정으로 남아 있어 Render 수정 몇 파일만 푸시해도 앱이 재현되지 않는다. `.tmp/`의 계정 정보와 `output/`의 원본 증거는 Git ignore 대상임을 확인했다. 그 밖의 변경을 일괄 stage하거나 기존 미소유 파일의 소유권을 추정하지 않는다.

다음 발행 관문은 의존 파일·마이그레이션·시험 도구를 파일 단위로 대조하고 비밀/로컬 증거 제외를 확인하는 것이다. 그 뒤에도 commit/push/PR, Render 요금제와 웹서비스 생성(첫 배포), 실제 URL의 DEV Auth redirect 변경은 각각 사용자 승인 범위 안에서만 실행한다. 실제 Render 주소가 없으므로 edge header·로그인 callback·실기기 왕복은 미검증이다. M7-2 전체 목표는 계속 진행 중이다.

### 9/26 발행 범위 읽기 전용 1차 분류

[분류 도구](../../../scripts/alpha/render-release-inventory.mjs)는 Git의 개별 변경 경로를 읽고 유형·파일 hash·민감정보 의심 유형만 출력한다. stage·복사·업로드 기능이 없고 결과는 **소유권/발행 허용 목록이 아니다**. 추가한 도구/테스트 2개를 포함한 현재 변경 파일은 **409개**, staged는 **0개**다. 원격 `main`의 읽기 전용 조회 결과도 현재 HEAD `efd8b642`와 같았다.

| 분류 | 파일 수 | 이번 판정 |
| --- | ---: | --- |
| 앱·공유 소스 | 122 | 실행·type 의존/출처를 파일별 검토해야 함 |
| 빌드·의존성 | 4 | `postinstall` 패치와 lockfile을 함께 검토해야 함 |
| DB 마이그레이션 | 22 | DEV에 적용된 이력과 공개 가능성을 대조해야 함. 이번에 적용하지 않음 |
| 검증 코드 | 137 | 실행 fixture와 개인정보를 구분해야 함 |
| 보조 도구 | 93 | 실계정 시험 도구는 자동 발행 대상 아님 |
| 문서·요약 | 24 | 로컬 경로/이메일 의심 표기를 개별 검토해야 함 |
| 제외: 실험 SQL 초안 | 6 | 마이그레이션이 아니므로 시험 배포 묶음에서 제외 |
| 제외: 실계정 고정 대리 시험 실행기 | 1 | 계정 이메일 literal이 있어 공개 후보에서 제외 |

전체 409개를 대상으로 제한적 literal 검사를 실행했다. 개인키/GitHub token/Supabase secret/Postgres 비밀번호 URL 패턴은 **0개**였지만, 이메일 또는 절대 로컬 경로 신호가 **25개 파일**에서 나왔다(이메일15, 경로11; 중복1). 이메일 파일 중 13개는 예시 도메인, 1개는 의존성 lockfile의 공개 패키지 메타데이터, 1개는 실제 계정 주소가 고정된 위 제외 실행기다. 경로 신호 11개는 문서의 개발 worktree·PC 백업 경로와 예시 Unix 경로이며 공개 표현은 개별 검토가 필요하다. 이것은 비밀·개인정보 부재 보증이 아니다. `.tmp/` 계정 파일, `output/` 원본 증거, `supabase/.temp/`는 Git ignore로 확인했고 이번 목록에 넣지 않았다. `npm run security:audit`은 현재 lockfile에서 취약점 **0건**으로 종료했고, 새 분류 도구 테스트는 **3/3** 통과했다(작업 공간 밖 경로 거절 포함).

`vercel.json`의 Git 자동 배포 설정은 현재 checkout에서 `false`다. 연결된 외부 Vercel 설정이나 push 후 실제 동작을 이번에 확인한 것은 아니다. Render workspace는 읽기 전용 조회에 응답했지만 서비스 목록은 `null`을 반환하여 서비스 부재/접속 상태를 단정하지 않는다. 아직 선별된 발행 집합을 만들어 검증한 것이 아니고, 위 파일들을 stage·commit·push하지 않았다. 다음에는 개인정보 신호 25개와 실행 의존/SQL/테스트를 파일별로 대조하고 외부 자동 배포 상태를 확인한 뒤, 승인된 범위만 별도 발행·Render 시험 연결로 넘긴다.

### 9/26 발행 의존 경로·개발 DB 이력 2차 대조

같은 [분류 도구](../../../scripts/alpha/render-release-inventory.mjs)의 `--closure`는 `/alpha` 화면, 인증 callback, 6개 API의 **8개 진입점**에서 정적·type·동적 import를 따라갔다. 로컬 파일 **421개**를 방문했고 해결되지 않은 로컬 import **0개**였다. 이 가운데 현재 변경된 코드/계약 파일은 **118개**다. TypeScript가 `.cjs` import의 선언 파일로만 안내하는 경우를 실제 물리 파일로 보완하고 vendor 파일 포함을 테스트했다. 앱·공유 소스 분류 122개 중 closure 밖 4개는 시험 fixture, compact-inverse 후보, 복구 lab 도구, projector manifest다. 이 closure는 `/alpha` 경로의 최소 연결 대조이지 **Next 전체 빌드·정적 자산·파일시스템에서 읽는 자료의 완전한 목록은 아니다**. 기존 `main`의 추적 파일은 변경 파일 수에 넣지 않았다.

개발계 Supabase의 **마이그레이션 목록만 읽기 전용으로** 조회했다. 로컬 `supabase/migrations`는 22개이고 DEV의 적용 이력은 30개다. 로컬 22개는 모두 이름이 일치했으나 version timestamp까지 같은 것은 **3개**, 이름이 같고 timestamp가 다른 것이 **19개**였다. DEV에만 기록된 나머지 **8개**는 일시적 Storage probe 4개, 복원 lab 3개, 합성 재해복구 lab 1개다. [카탈로그 편집 원장](alpha-m7-2-catalog-editing.md)은 이미 원격 도구가 다른 version을 기록한 사례와 CLI 전체 push/이력 repair 미실행을 명시한다. 이번 조회는 SQL 본문의 byte/의미 동일성이나 새 DB 재현을 증명하지 않는다. 따라서 로컬 파일명을 DEV에 그대로 `db push`하거나 이력을 자동 repair하지 않는다. Render 웹서비스는 기존 DEV에 연결하는 시험 경로이며 이번에 DB DDL/DML은 적용하지 않았다.

현재 DEV 보안 Advisor는 비공개/lab 테이블의 `RLS Enabled No Policy` **INFO 29건**과 Auth의 `Leaked Password Protection Disabled` **WARN 1건**을 반환했다. [RLS 경고 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [비밀번호 보호 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). 이전 원장의 경고를 해소한 것으로 표시하지 않는다. 실제 외부 노출 범위·Auth 정책은 서비스 생성 전 별도 gate이며, 이번에는 설정·계정·자료를 변경하지 않았다.

이 대조에 추가한 분류 도구 단위/경로 테스트는 **5/5**, 새 CI의 `test:alpha-auth`는 **29/29** 통과했다. 선택된 발행 집합의 깨끗한 checkout·Linux CI·실제 Render edge·로그인·기기 왕복은 아직 실행하지 않았다. 다음은 118개 연결 소스와 필수 build/CI 도구의 정확한 발행 집합을 승인 가능한 크기로 정리하고, 19개 timestamp 차이를 새 DB 적용 절차와 분리해 설명하는 일이다. 전체 작업 공간은 변경409개·staged0이며 commit/push/PR/merge/배포는 0이다.

### 9/26 발행 필수 경로와 자동 배포 관문 3차 대조

`/alpha` 8개 진입점에서 이어지는 **변경된 실행 코드/계약 118개**의 정렬 경로 목록은 SHA-256 `b7b09e35286f7bf6f41d1bb8db612b7428aa31844c25f1c6a74b25bf1c16127d`로 묶었다. 이는 **경로 목록의 hash**이며 파일 내용이나 게시 승인을 증명하지 않는다. 현재 제한적 literal 검사에서 이 118개에는 이메일·로컬 절대 경로·설정된 비밀 패턴 신호가 없었다. 변경 파일 409개 전체에 대한 앞선 개인정보 신호 25개 검토와 구별한다.

실행 import와 별개로 설치·CI가 직접 요구하는 변경 파일이 있다. `package.json`·`package-lock.json`·`scripts/alpha/patch-auth-debug-probe.mjs`는 한 묶음이다. `npm ci`의 `postinstall`이 설치된 `@supabase/auth-js` **정확히 2.116.0**의 두 생성 파일을 검사·패치하므로 하나라도 빠지거나 SDK 버전이 바뀌면 재현되지 않는다. 이 패치는 `node_modules`에만 작용하고 앱 저장 데이터를 만지지 않는다. 추가로 `.github/workflows/ci.yml`, `scripts/alpha/m2-schema.test.ts`, `scripts/alpha/m2-expiry-contract.ts`와 해당 test, `scripts/alpha/patch-auth-debug-probe.test.mjs`, `tests/e2e/alpha-auth.config.ts`·`alpha-auth.browser.ts`·`alpha-auth.fixture.ts`, `scripts/personal-workspace-poc/program-check.mjs`·`program-source-files.mjs`와 해당 test, `supabase/migrations/20260920234519_flowme_alpha_m2_account_boundary.sql`은 현재 명시된 검증 경로에서 참조한다. 이 **15개 직접 확인 경로**도 모두 변경 상태이며 `/alpha` import closure 118개에 포함되지 않는다. 테스트·빌드의 간접 의존과 정적 자산은 아직 완전 열거하지 않았으므로 133개를 최종 발행 집합으로 취급하지 않는다.

새 Render 서비스는 기존 DEV DB를 읽고 쓸 서버로 연결하는 계획이지 마이그레이션 자동 적용 계획이 아니다. 로컬 SQL 22개와 DEV 이력의 이름 대응만 확인했으며 timestamp가 다른 19개·DEV-only lab/probe 8개의 본문 동등성은 미검증이다. 새 DB 재현·CLI `db push`·이력 repair는 별도 계획과 승인 전까지 하지 않는다.

배포 방식은 현재 구조상 **Git 연동 단일 Node Web Service 직접 생성**이 최소 경로다. 별도 Render DB·worker·cron이 없으므로 Blueprint 파일을 새로 만들 필요는 확인되지 않았다. 다만 Render가 빌드할 소스는 먼저 Git 원격에 있어야 한다. 연결 조회에서 workspace `My Workspace` 한 곳이 보였지만 선택된 workspace는 없었으므로 그 ID로 서비스 조회·생성을 진행하지 않았다. 실제 생성 전에 사용 대상 workspace와 요금제를 명시적으로 확인한다.

이 checkout의 `vercel.json`에는 `git.deploymentEnabled=false`가 있지만, 연결된 Vercel 프로젝트의 **실제 자동 배포 설정은 확인하지 못했다**. 읽기 전용 프로젝트 목록에는 `flowme2605`가 보였으나 상세 설정 조회 도구는 인수 스키마 충돌로 실패했고 로컬 Vercel CLI도 없다. 따라서 이 파일만으로 push가 배포를 일으키지 않는다고 단정하지 않는다. push 이전에 외부 연결 설정을 확인해야 한다.

현재 **발행 가능 판정은 보류**한다. 다음 관문은 (1) 미소유 변경 파일별 소유권·공개 범위 확인과 간접 의존/정적 자산 포함 목록 확정, (2) 그 선택 집합의 깨끗한 checkout에서 `npm ci`·CI·build 재현, (3) Vercel 자동 배포 상태 확인이다. 이 세 가지가 통과해도 commit/push/PR은 별도 실행 범위로, Render 웹서비스 생성·요금제·DEV Auth redirect·첫 배포는 다시 별도 승인으로 다룬다. 실제 Render/실기기와 관찰 사용자 검증은 여전히 0이다.

### 9/26 배포 차단 — 비공개 카탈로그가 브라우저 번들에 포함됨

위의 literal 검사 신호0은 **비공개 콘텐츠 노출 검사에 해당하지 않는다**. `/alpha`의 `AlphaCatalogLibrary`, `AlphaCatalogCopyActions`, `AlphaCatalogContentImport`와 제작 실행 경로가 `catalog-library.ts`/`catalog-content.ts`를 통해 미추적 `catalog-library-pack.v1.json`(1,418,648bytes)을 가져온다. 문서상 이 pack의 177 Flow·26 Map은 002 계정의 **비공개 관리 자료**이고 공개 발행 대상이 아니다. 그런데 현재 로컬 production build의 브라우저용 `.next/static/chunks/9767-ceae8604436ec203.js`(3,290,989bytes)에서 pack의 Flow slug **177/177개**와 원문이 있는 92개 중 76개의 원문 첫 줄 일부를 발견했다. 최신 변경 실행 소스 시각 04:34 UTC보다 해당 build trace 시각 04:37 UTC가 늦다. 이는 파일명만 나온 오래된 trace가 아니라 현재 소스로 만든 빌드에서 확인한 결과다.

같은 build를 로컬 `127.0.0.1:3181`에서 잠시 실행해 **쿠키·인증 헤더 없는 GET**으로 해당 JS가 HTTP **200**, 3,290,989bytes로 내려오고 Flow slug **177/177개**가 응답 본문에 있음을 확인했다. 검사는 로컬 Next 서버만 썼고 종료했다. 실제 Render나 외부 인터넷 노출은 아직 일어나지 않았으나, 이 상태로 공개 호스트에 배포하면 클라이언트 정적 파일을 받는 누구나 계정 로그인 없이 원본 일부에 접근할 수 있다. 계정 API의 소유자 검사나 DB 비공개 설정으로 정적 JS를 보호할 수 없다.

**Render 발행·서비스 생성은 검증 완료 전 차단한다.** 당시 수정 방향은 원본 pack을 서버 전용 경계로 옮기고, 로그인한 계정에만 자료를 전달하며 목록·미리보기·제작 사본·백업/복원·no-op/Undo를 보존하는 것이었다. 위 수치와 결함 판정은 수정 전 이력이며, 아래에 수정 후 근거를 따로 기록한다.

사용자는 Render `My Workspace`를 시험용으로 지정했다. 그 workspace를 명시한 읽기 전용 서비스 목록 호출은 `null`을 반환했다. 이를 서비스 0개라고 해석하지 않는다. 서비스·요금제·환경변수·DEV Auth·DB·실계정·Git 상태는 이번 노출 검사에서 변경하지 않았다.

### 9/26 수정 진행 — 로그인 계정 공통 접근, 미로그인 차단

사용자가 **미소유 콘텐츠 경로의 코드 수정**을 승인했고, 시험 기간에는 **모든 로그인 계정**이 이전 PoC Flow 콘텐츠를 열람·개인 계정에 사본으로 가져오도록 선택했다. 누구나 가입할 수 있는 현재 개발계 설정과 결합하면 신규 가입자도 인증 후 원본을 볼 수 있다. 이는 시험 접근 범위이며 영구 공개 정책, 002 자료의 소유권 이전, 기존 보관·출처 검토 정책 변경이 아니다. 실제 계정/DB/배포 설정은 수정하지 않았다.

원본 pack import를 브라우저 공용 모듈에서 제거했다. 서버 전용 생성 경로, 원본 내용의 고정 SHA-256 seal, 인증 후 `GET /api/alpha/catalog` 조회, 계정별 제작/자료실 가져오기의 서버 semantic intent를 연결했다. API는 DEV Auth `/auth/v1/user`의 비익명 신원 확인 전에는 원본을 돌려주지 않으며 `private, no-store`를 사용한다. 출처 변조·다른 Origin·잘못된 query는 거절한다. 계정 간 브라우저 메모리 재사용이나 localStorage 원본 캐시는 만들지 않았다.

현재 로컬 production build는 성공했고, 정적 JS 검사에서 수정 전 **같은 chunk에 pack version·177 slug·26 Map**이 있던 결합 패턴은 사라졌다. 새 빌드에서 해당 검사 `exposed=false`; 70개 JS chunk를 스캔했다. 일부 slug/원문 표식은 기존 공개 seed와 겹치므로 이 검사만으로 모든 중복 문구의 부재를 주장하지 않는다. 105개 브라우저 진입 소스에서 이어지는 540개 import 경로에는 원본 pack·서버 전용 모듈로 도달하는 길이 없었다. 검사기 자체의 가짜 누출 감지 1/1도 통과했다.

이번 수정의 표적 검사: 인증 핸들러 모의3/3, 원본 변환28/28, 자료실 화면27/27, 클라이언트 서버 위임7/7, 무거운 자료실 저장·편집 경계44/44(392초), `npm test` 명령 정상 종료, production build, `docs:check` 4/4와 링크6,621개, `git diff --check` 종료0. 광범위 `tsc --noEmit`은 기본 4GB heap에서 중단됐고 8GB 재실행도 이 작업과 무관한 역사적 `output/`·기존 테스트 파일의 대량 진단 때문에 종료1이었다. 앱 빌드에 포함된 Next 타입 검사는 통과했다. 즉 전체 저장소의 무제한 타입 검사 통과로 확대하지 않는다.

로컬 production 서버의 **설정이 없는 상태**에서 미인증 `GET /api/alpha/catalog`은 HTTP503·원문 없는 `{ "ok": false }`·`private, no-store`로 닫혔다. 모의 설정에서는 미인증/무효 토큰/익명 신원/타 Origin/query를 거절하고 서로 다른 두 비익명 사용자 신원에 원본 177 Flow·26 Map을 제공했다. Playwright의 로그인 전 `/alpha` 화면은 연결 꺼짐 안내를 표시했다. 이 브라우저 검사는 실제 DEV 로그인 후 목록·가져오기나 폰/태블릿 검증이 아니다. DEV 실제 두 계정의 새 코드 왕복과 다섯 화면 크기, 서버 비용/응답시간, 외부 Render HTTPS는 남았다. 이 관문을 통과하기 전에는 발행·배포 가능 판정을 내리지 않는다.

추가 로컬 경로: 서버 모듈의 정적 pack import도 제거하고 파일을 **실행 시점**에 읽도록 했다. Render 시험 모드에서는 `FLOWME_ALPHA_CATALOG_PACK_FILE`이 없으면 닫힌다. 지정된 파일의 크기 상한과 전체 SHA-256 seal을 확인한 뒤에만 원본을 사용하며, 로컬 개발에서는 기존 미추적 JSON을 읽는다. Render의 텍스트 비밀 파일 입력에 맞춰 gzip을 Base64로 감싼 `FLOWME-CATALOG-GZIP-BASE64-V1` 형식을 추가했고 잘못된 armor·변조·누락을 거절한다. 로컬 테스트는 이 경로 **1/1**, 기존 원본/서버 읽기 **13/13** 통과. 텍스트 형식 추가 직전의 전체 통합 검사 **2,488/2,488**(252 test file, 검사 중 소스 변경0)와 `npm test` 종료0을 확인했다. 텍스트 형식 추가 후 표적 **14/14**, production build, 문서 **4/4·로컬 링크6,621개**, 브라우저 정적 chunk 검사 `exposed=false`(70개), client import 경로 검사(105개 진입·540개 소스, 금지 경로0), `git diff --check` 종료0이 통과했다. 최종 텍스트 형식의 전체 통합 검사는 재반복하지 않았으며 직전 결과와 구분한다.

**별도 발행 차단:** `catalog-library-pack.v1.json` 원본은 1,418,648bytes의 미추적 로컬 파일이고 GitHub 저장소 `knhbae/flowme2605`는 공개다. 이 원본을 Git에 넣으면 로그인 gate와 무관하게 누구나 내려받는다. [Render 비밀 파일](https://render.com/docs/configure-environment-variables#secret-files)은 붙여 넣는 **텍스트** 파일로 서비스당 합계 1MB 한도이며 런타임 `/etc/secrets/<filename>`에서 읽힌다. 원본의 gzip은 197,556bytes, Base64 텍스트 포장은 **263,439bytes**라 계산상 한도 안이다. 실제 Dashboard 입력 가능 여부·비밀 파일 업로드·환경변수 설정·깨끗한 checkout 빌드·공개 CI에서 비공개 원본이 필요한 테스트의 공급 방법은 아직 실행·확정하지 않았다. 비밀 파일 저장은 Render의 새 배포를 유발하므로 별도 배포 승인 전에는 진행하지 않는다. 원본이나 텍스트 포장을 stage/push하지 않았고, 현재 판정은 여전히 **발행 보류**다.

### 9/26 후속 — 원본 없는 빌드와 실제 두 계정 열람

비공개 원본을 Git에 넣지 않고도 설치·빌드·인증 열람을 할 수 있는지 확인했다. 기존 worktree를 변경하거나 stage하지 않고, 앱 소스와 필수 설정 **685개 파일**을 새 임시 폴더에 복사했다. 비공개 `catalog-library-pack.v1.json`, `.env`, 계정 정보, 로컬 검증 자료는 복사하지 않았다. 첫 빌드는 공개 seed JSON 누락으로 실패했고, 기존에 Git 추적 중인 정확한 seed 의존성을 추가한 뒤 새 `npm ci`와 production build가 성공했다. 설치는 220개 패키지·audit 221개·취약점0이었다. 이는 **최소 소스 사본의 Windows 빌드**이며 최종 공개 파일 집합의 깨끗한 Git checkout·Linux CI 검증은 아니다.

이 빌드를 로컬에서 실행하면서 원본의 gzip Base64 텍스트 사본 **263,439bytes**만 외부 파일 경로로 공급했다. build 폴더에는 원본 pack이나 로컬 비밀 설정이 없었다. 70개 정적 JS chunk의 기존 누출 패턴 검사도 `exposed=false`였다. Render 서버·비밀 파일·환경변수는 만들거나 변경하지 않았다.

| 실제 실행한 확인 | 결과 | 범위와 한계 |
| --- | --- | --- |
| 실제 DEV 두 계정의 새 로그인·인증 열람 | 최종 **51/51** 항목 통과 | 미로그인401, 로그인200·`private, no-store`, 원본 seal, 177 Flow·26 Map·보관 대상21, 원문 일치, Escape/초점, reload. 목록은 전체 개수와 대표 상세를 확인했으며 모든 콘텐츠 개별 조작 검사는 아님 |
| 390×844·375×812·844×390·1024×768·1440×900 | 두 계정 모두 가로 넘침0·가로로 잘린 조작부0, 핵심 버튼 접근 가능 | 실제 브라우저 viewport 검사. 가로 화면에서는 세로 스크롤 후 버튼에 접근하며 화면 첫 영역에 모두 보인다는 뜻은 아님. Android/iOS 실제 기기 검사는 미실행 |
| 화면 결함 수정과 표적 회귀 | **13/13** 통과 | 자료실을 저장하지 않은 계정에서 상세 Escape가 미리보기 목록까지 닫던 문제 수정. 상세→목록→미리보기 종료를 분리하고 초점 복귀, mutation0 확인 |
| `npm test` | **2,255/2,255**, 실패/skip/cancel0 | 검사 중 수집 소스 변경0 |
| 통합 대상 타입 검사 | 544개 진입·615개 수집 소스, 진단0 | 검사 도구 자체10/10, 검사 중 소스 변경0. 전체 저장소 무제한 타입 검사는 아님 |
| 전체 통합 단위 검사 | 이번 후속에서는 재실행하지 않음 | 직전 2,488/2,488은 텍스트 포장·Escape 최종 수정 전 결과로 유지. 이번 표적/브라우저 결과와 합산하지 않음 |

첫 브라우저 시도는 읽기 전용 경로를 엄격히 막아 기존 social identity 열기 요청이 차단됐다. 원격 함수를 읽어 기존 identity에는 `ON CONFLICT DO NOTHING`인 것을 확인한 뒤, 기존 identity 존재를 먼저 확인하는 요청만 허용했다. 새 identity 생성이나 자료 쓰기는 허용하지 않았다. 다음 시도에서 위 Escape 결함을 발견했고 수정 후 통과했다. 최종 51항목 이전의 41항목 성공도 반복 실행이므로 더하지 않는다. 실패 근거는 삭제하지 않았다.

계정별 읽기 응답은 전후 **byte-for-byte 동일**했고 revision은 각각 **441→441**, **75→75**였다. 원격 SQL로 대조한 아래 3범위도 row 수·정렬된 JSONB 직렬화의 MD5가 같았다. Auth 로그인/종료 기록은 별개이므로 전체 DB 불변으로 확대하지 않는다.

| DEV 대조 범위 | row 수 | 전후 동일 digest |
| --- | --- | --- |
| `flowme_alpha_accounts` | 3 | `3f41a08719a6d637828d35d23e7e7a36` |
| `alpha_social_identities_v1` | 3 | `ee6743d742ab53be55554d12a9f92328` |
| `alpha_social_state_v1` | 1 | `64357935bdc9b1636357fe61ee0b6371` |

이번 검사는 열람 전용이다. 새 자료실 가져오기·제작 사본 저장·복원은 실행하지 않았다. console/page error0, 저장소 계측 구간의 운영 prefix 밖 쓰기/clear0, 각 시험이 만든 로그인 세션의 `scope=local` 로그아웃 성공을 확인했다. 기존 사용자 브라우저 저장소 전체를 스냅샷 대조한 결과는 아니다.

로컬 전용 근거: `output/playwright/alpha-m72-catalog-access/2026-09-26T07-08-59-048Z/result.json`과 같은 폴더의 10개 화면 캡처·`supplemental-evidence.json`, `output/integrated-product-poc/npm-test-2026-09-26T07-07-12-861Z.json`, `targeted-types-2026-09-26T07-12-05-574Z.json`. 시험 빌드의 파일별 hash는 임시 빌드 폴더의 `source-check-manifest.json`에 있다. 자료실 수정 파일2개와 새 읽기 전용 시험기 `scripts/alpha/m72-catalog-access-browser.ts`가 이번 코드 범위다. 기존 dirty 파일 전체를 이번 소유로 분류하지 않는다.

시험 서버는 종료했고 localhost3104 listener가 없는 것을 확인했다. 생성한 임시 원본 사본 `C:\Users\HUBERT\AppData\Local\Temp\flowme-catalog-runtime-qR7DEj\catalog.txt` 삭제는 자동 정책 검사에서 `blocked by policy`로 거절됐다. 상세 사유는 제공되지 않았고 삭제를 우회하지 않았다. 이 파일은 로컬에 남아 있으며 원본 pack·사용자 자료·백업은 삭제하지 않았다. 임시 파일은 인증 자격증명이 아니라 비공개 카탈로그의 인코딩 사본이다.

**다음 순서:** 공개 CI에서 원본 의존 테스트를 어떻게 실행할지 정리 → 파일별 발행 범위와 Vercel 자동 배포 연결 확인 → 승인된 발행·Render 시험 서비스 설정/배포 → HTTPS 대표 저장 왕복 → 실제 기기 확인. 현재 미로그인 차단과 실제 두 계정 열람 관문은 통과했지만 새 가져오기·실제 Render·전체 M7-2 완료를 뜻하지 않는다. staged0, commit/push/PR/merge/Preview/Production 배포0, 실제 기기 미실행·관찰 사용자0을 유지한다.

### 9/26 후속 — 원본 외부 공급 검사와 공개 파일 경계

직전 차례는 실제 계정 열람 결함을 수정하고 검증 근거를 원장에 반영한 **진척**이었다. 이번에는 공개 CI 준비를 막던 테스트의 정적 원본 의존과 점검 도구 결함을 수정했다. 앱 화면·저장·DB 계약은 바꾸지 않았다.

- `catalog-content-v2`, `catalog-content-wave2`, `catalog-content-v3` 테스트의 원본 JSON 직접 import를 서버와 같은 `buildCatalogLibrarySnapshot` 경로로 교체했다. `catalog-library-source.test.ts`도 그 경로에서 검증된 원본을 받아 압축·변조·누락 시험을 수행한다. 기존 177개 대조, source field/identity, 고정 fingerprint·원본 seal, 지원/거절 경계 assertion은 유지했다. 원본이 없으면 실패하며 skip·합성 원본 대체는 추가하지 않았다.
- 브라우저 원본 import 검사기의 Windows 전용 경로 구분자를 OS 독립 비교로 고쳤다. static/dynamic import 외 re-export/require 연결도 확인한다. 실제 Linux 실행 근거는 아직 없으며, 이번 실행은 Windows에서 했다.
- 발행 분류에서 원본 pack을 `exclude-private-catalog`로 명시했다. 파일명을 바꾼 JSON·gzip·텍스트 포장도 내용 표식으로 검출한다. CI에는 client import 검사와 **Git 추적 파일의 작업 사본 내용** 검사를 연결했다. 이는 현재 알려진 원본 묶음/포장의 검출기이며, 임의로 난독화하거나 조각낸 모든 비밀의 부재·소유권 승인·staged blob 전체 안전성을 증명하는 도구는 아니다.
- 실행 경로 검사에서 새 카탈로그 API를 포함한 9개 진입점을 명시했다. 이전의 8개 고정값과 특정 파일이 반드시 dirty여야 한다는 조건은 깨끗한 checkout에서도 검사할 수 있게 수정했다. import 미해결0과 경로 집합 hash 대조는 유지한다.

| 실행 | 현재 결과 | 근거와 한계 |
| --- | --- | --- |
| 변경한 원본 의존 테스트 4개 파일 | **21/21** 통과 | 현재 worktree의 로컬 원본으로 실행. 아래31에 포함되므로 합산하지 않음 |
| 원본 pack 없는 별도 빌드 사본 + 외부 원본 경로 | **31/31**, 실패/skip/cancel0 | 위4개 + 원본 자료실 계약10개. 기존685개 앱 소스 hash가 현재와 동일한지 먼저 확인하고 테스트5개만 추가. 실제 GitHub/Render 실행은 아님 |
| 같은 사본에서 외부 원본 공급 제거 | 예상 실패1/1, exit1·`ENOENT`·skip0 | 원본 부재가 성공으로 처리되지 않음을 확인한 음성 대조. 통과31개에 더하지 않음 |
| 발행·client 경계 도구 | 최종 **9/9**, 실패/skip/cancel0 | 초기8개와 중간 반복은 합산하지 않음. 임시 합성 Git 저장소로 추적/미추적 구분과 이름 바꾼 압축본 검출 확인 |
| 실제 client import 경로 | 진입105개·소스540개·금지 경로0 | 이번 경로 검사 실행 근거 |
| 실제 Git 추적 파일 검사 | **10,426개·원본 묶음 검출0** | 미추적 원본은 로컬에 그대로 있으며 검사 대상에서 빠지는 것이 정상. 첫 시도는 불필요한 개인정보 regex까지 적용해 오래 걸려 중단했고, 전용 내용 검사로 분리한 최종 실행만 성공으로 기록 |
| 통합 대상 타입 검사 | 진입544·수집615·진단0·검사 중 소스 변경0 | 도구 자체10/10. 원본을 뺀 최종 공개 checkout 전체의 타입 검사로 확대하지 않음 |

로컬 전용 근거: `output/alpha-m7/m72-external-catalog-tests-2026-09-26T07-23-29-421Z/result.json`, 같은 폴더의 공급 성공/부재 실패 TAP, `output/integrated-product-poc/targeted-types-2026-09-26T07-25-12-974Z.json`. 외부 원본 파일은 전후 hash가 같고 추가 원본 사본을 만들지 않았다. 이전 삭제 거절 파일을 읽기만 했으며 삭제를 재시도하거나 우회하지 않았다. 이번에는 테스트·점검 도구·CI 정의만 바뀌었으므로 앱의 `npm test`·production build·실계정 브라우저를 반복하지 않았고 직전 근거와 구분한다.

현재 인벤토리는 변경426개·staged0이며 원본1개·실계정 고정 시험기1개·실험 SQL6개를 제외 분류한다. 이 목록은 소유권이나 발행 허가 목록이 아니다. 새 CI 단계는 아직 로컬 수정이며 실제 원격 CI를 실행하지 않았다. **전체 통합 검사는 원본을 필요로 하는 상태를 유지**한다. 공개 CI의 원본 공급·실패 로그/업로드 자료의 비공개 경계는 아직 해결하지 않았으므로, 원본을 임의로 GitHub secret/artifact에 전송하거나 해당 검사를 빼지 않았다.

Vercel은 읽기 전용 팀·프로젝트 목록 조회에 성공했으나 `get_project`의 `idOrName` 인수 오류가 재현돼 상세 설정을 읽지 못했다. 연결된 브라우저 목록에는 빈 Codex 내장 브라우저만 있고 로그인한 Chrome은 없었다. CLI도 현재 경로에서 발견되지 않았다. 따라서 자동 배포가 꺼졌다는 판정은 보류한다. 서비스·Auth·DEV 자료 수정0, commit/push/PR/merge/배포0, 실제 기기 미실행·관찰 사용자0이며 M7-2는 진행 중이다.

### 9/26 후속 — 공개 검사 로그 보호와 원본 공급 승인안

직전 차례는 원본 의존 테스트와 공개 파일 점검을 수정한 **진척**이었다. 이번에는 원본 공급 전에 실패 로그의 공개 경계를 먼저 수정했다. 기존 `program-verify.mjs`는 자식 stdout/stderr를 그대로 `.log`에 썼고 CI는 해당 폴더 전체를 업로드했다. 테스트의 deep-equality 실패 등에 원문이 포함되면 비공개 원본 공급과 별개로 그 원문이 공개될 수 있었다.

CI 또는 명시한 로컬 비공개 검사 모드에서는 원시 로그를 파일로 쓰거나 콘솔로 전달하지 않고, 허용한 결과 필드만 `flowme-verification-public/1` 요약으로 기록한다. 검사 수·성공/실패/skip/cancel·소스 변경 수·소스 집합 SHA-256은 남기고 원시 오류·환경 옵션·소스 경로는 남기지 않는다. 실패/중단/skip/소스 변경 시 실패 판정은 유지한다. 일반 로컬 실행의 상세 로그는 유지하며 공개용 `*.public.json`과 로컬 전체 결과의 파일명을 분리했다. CI 업로드 대상도 공개용 요약과 타입 검사 JSON으로 제한했다. 이 장치는 실수로 출력된 원문을 보호하는 것이며 악성 테스트 코드의 파일 읽기·네트워크 송신을 차단하는 sandbox가 아니다.

새 출력 정책과 기존 판정기 표적은 **8/8** 통과했다. 합성 원문 표식을 테스트 이름·stdout·stderr·assertion 오류에 넣고 실제 검사기를 성공/실패로 실행해, 공개 JSON/콘솔에 표식이 없고 원시 로그 파일이 생기지 않음을 확인했다. 첫 중첩 실행은 Node 테스트 문맥 환경변수가 자식 실행에 상속돼 실패했으며, 시험 harness에서 그 값만 제거한 뒤 정상 실행됐다. 실제 콘텐츠나 외부 GitHub CI를 사용한 누출 시험으로 확대하지 않는다. 전체 통합 검사·`npm test`·build는 아래 실행 결과에서 구분한다.

#### 승인된 준비안 — 9/26 사용자 “다 허용함”

검사 원본을 단일 GitHub secret에 넣는 방식은 선택하지 않는다. 현재 텍스트 포장은263,439bytes로 [GitHub secret의48KB 제한](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets#storing-large-secrets)을 넘는다. 또한 압축·Base64를 풀어 생긴 원문은 저장한 secret과 다르므로 자동 마스킹에 의존할 수 없다. [GitHub 보안 문서](https://docs.github.com/en/actions/reference/security/secure-use)는 변환된 값과 구조화 데이터의 마스킹 한계, 승인 전 환경 secret 접근 차단을 설명한다.

사용자가 위 질문에 “다 허용함”으로 답해 아래 검사 환경 생성·보호 규칙·콘텐츠 사본 등록·검사 연결을 승인했다. 실제 반영 결과는 별도로 기록한다. Render 배포·유료 설정·commit/push/PR/merge까지 확대한 승인은 아니며 영구 제품 정책으로 확정하지 않는다.

| 항목 | 제안 범위 |
| --- | --- |
| 목적지 | 공개 저장소 `knhbae/flowme2605`의 새 GitHub 검사 전용 environment `flowme-catalog-ci`. 저장소 파일·Release·artifact가 아니라 접근 제한된 environment secrets |
| 보관 자료 | 기존 PoC의177Flow·26Map·명시 판본2개가 든 고정 카탈로그 사본만. 개인 일정·메모·완료 이력·사진·로그인 비밀번호·Auth/DB 키는 제외 |
| 공급 형식 | 기존 검증된 gzip Base64 텍스트를44,000bytes 이하6개 secret 값으로 나눠 보관. 검사 runner의 임시 경로에서 재조립하고 현재 고정 seal을 확인. 원본·압축본·암호화본 모두 공개 Git에는 넣지 않음 |
| 접근 승인 | 저장소 소유자의 required review와 제한된 branch 규칙을 먼저 설정하고 확인. 코드/의존성/검사 정의를 검토한 실행에만 허용. fork/Dependabot 등 secret이 없는 실행을 우회해 권한 높은 이벤트로 실행하지 않음 |
| 실행·기록 | GitHub가 제공하는 새 runner의 별도 검사 job에서 기존 전체 통합 검사 유지. 원본 공급 누락·seal 불일치·시험 실패는 실패. 원시 로그·원본·브라우저 trace는 공개 업로드하지 않고 허용한 요약만 보존 |
| 배포와 분리 | environment에 `deployment: false`를 사용해 테스트용 접근 승인만 적용. Render 생성/배포, Supabase 설정/자료 변경, commit/push/PR/merge를 이 승인에 포함하지 않음 |
| 남는 위험 | 검토한 검사 코드와 실행 의존성은 원본을 읽을 수 있다. 로그 보호만으로 악성 코드 송신을 막는다고 보장하지 않으며 승인 전 실행 SHA와 workflow/의존성을 확인해야 함. 장기 보관·삭제는 별도 관리 대상 |

[GitHub 공식 안내](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments#using-environments-without-deployments)에 따르면 `deployment: false`에서도 환경 secret과 required reviewers를 사용할 수 있고 deployment 기록은 생성하지 않는다. 실제 저장소의 환경 설정·검토자·branch 적용 가능 여부는 생성 승인 후 읽기/쓰기/재조회로 확인해야 한다. 소유자 본인이 실행하고 승인하는 단독 관리 모델에 독립된 두 번째 검토자가 있다고 표현하지 않는다.

승인 전에는 환경 생성·secret 등록·원본 전송을 실행하지 않았다. 승인 후에는 `main`과 PR 검사 ref만 허용하고 소유자 검토를 요구하는 환경을 먼저 확인한 뒤 공급한다. 외부 fork/Dependabot에 원본을 제공하거나 privileged 이벤트로 우회하지 않는다. 전체 검사를 별도 job으로 옮기되 검사·assertion은 제외하지 않으며, GitHub 실행 전에는 CI 통과로 판정하지 않는다.

#### 승인 후 반영·확인 결과

2026-09-26 07:54 UTC, `knhbae/flowme2605`에 검사 전용 `flowme-catalog-ci` environment와 `FLOWME_CATALOG_PART_1`–`6`을 생성했다. 기존 Preview/Production 환경·repository secrets는 수정하지 않았다. 먼저 required reviewer `knhbae`와 branch 규칙 `main`, `refs/pull/*/merge`를 설정하고 재조회한 뒤 source를 전송했다. 소유자의 자기 승인은 허용하는 단독 관리 모델이며 별도 두 번째 검토자가 있다는 뜻은 아니다. 관리자의 기본 우회 가능성을 제거했다고 주장하지 않으며 이번 실행에서 보호 규칙 우회나 workflow 승인/실행은 하지 않았다.

전송한 자료는 기존 카탈로그의 검증된 압축 텍스트 사본뿐이다. 1,418,648bytes 원본 JSON과 압축을 푼 bytes의 동일성을 먼저 확인했다. 전송 전후 원본 SHA-256 `723abefdc26243eb1f9b4bcf21730758ecc7a300494ad2ae75293ac5c6dde4be`, 압축 텍스트263,439bytes의 SHA-256 `6b3f02a35149c52e889f92ad7f42c2ba97298755788c272d5e01d35837ee3659`이 동일했다. 개인 일정·메모·완료 이력·사진·비밀번호·Auth/DB 키는 전송하지 않았다.

GitHub CLI가 stdin의 끝 줄바꿈을 제거하므로 저장 조각은 마지막 LF를 제외한44,000bytes×5+43,438bytes다. 새 `catalog-ci-source.mjs`는 고정된 마지막 LF를 복원한 뒤 크기와 SHA-256을 모두 검증한다. 누락·순서 변경·손상·초과는 파일 생성 전에 실패한다. 새 runner 임시 디렉터리에만 파일을 만들고, 정리할 때는 그 디렉터리의 정확한 파일1개와 빈 디렉터리만 제거한다. 원본/기존 임시 사본은 삭제하지 않는다. 로컬 등록 실행기는 인증 토큰이나 콘텐츠 값을 인수·출력·공개 파일에 넣지 않았다.

`.github/workflows/ci.yml`에서는 전체 통합검사를 원본 없는 core와 다른 GitHub-hosted runner의 `catalog-contracts` job으로 옮겼다. core 통과·환경 승인 후에만 시작하며 checkout 인증을 보존하지 않고 private job의 패키지 cache도 끈다. 조각은 조립 step에만 공급하고 검사 후에는 요약 JSON만 업로드한다. `deployment: false`로 실제 배포와 분리했다. fork/Dependabot은 secret job을 실행하지 않으며, 후속 `integration-required`가 skip/실패/취소를 성공으로 처리하지 않는다. 기존 검사 명령과 전체 assertion은 유지했다. **branch protection의 필수 check 등록, 실제 GitHub workflow 실행과 환경 승인 동작은 아직 검증하지 않았다.** 필요한 외부 fork 검증은 검토된 내부 변경으로 별도 처리해야 하며 privileged 이벤트 우회는 사용하지 않는다.

| 검사 | 결과와 근거 |
| --- | --- |
| 실제 GitHub 등록·재조회 | 환경1개·reviewer1명·branch 규칙2개·secret6개 확인. 로컬 전용 근거 `output/alpha-m7/m72-github-catalog-ci-registration-20260926.json`. GitHub는 secret 평문을 다시 제공하지 않으므로 원격 복호화·실제 검사 소비 성공은 아직 주장하지 않음 |
| 실제 카탈로그 조립·소스 계약 | **31/31**, 실패/skip/cancel0. 등록에 사용한 분할과 동일한 로컬 자료로 전용 임시 파일 생성→원본 bytes 대조→관련5파일 검사→시험 사본 제거. `output/alpha-m7/m72-catalog-ci-local-rehearsal-20260926.json`. 원격 secret 다운로드 시험이 아님 |
| 공급·workflow·출력·기존 경계 도구 | **21/21**, 실패/skip/cancel0. YAML 파싱과 승인/별도 runner/전달 범위/완전한 통합 명령/skip 실패 관문/업로드 제한 확인. 실제 GitHub 실행이 아님 |
| 전체 통합검사 | **2,489/2,489**,252파일, 실패/skip/cancel0,615소스 변경0. `output/integrated-product-poc/new-tests-2026-09-26T07-38-13-038Z.json`. 07:38:13–07:51:22 UTC,원시 로그 없음. 공개 요약 처리 적용 후·`.public.json` 파일명 분리 전 시작한 실행이며 마지막 파일명 정책은 위 표적 검사에서 별도로 확인 |
| `npm test` | **2,255/2,255**, 실패/skip/cancel0,소스 변경0. `output/integrated-product-poc/npm-test-2026-09-26T07-38-24-029Z.json` |
| production build | 종료0·소스 변경0. `output/integrated-product-poc/build-2026-09-26T07-40-50-868Z.json`. 위 npm/build 뒤 변경은 CI 도구·workflow·문서이며 앱 runtime은 변경하지 않음 |
| 원본 공개 경계·audit | client105진입점/540소스의 금지 의존0,Git 추적 파일 집합10,426개의 알려진 원본 묶음 검출0. 이는 index의 파일 목록으로 현재 worktree 내용을 읽은 검사이며 staged blob 검사가 아님. 취약점0,Node24.17.0 |

이번 제품 DB/Auth·Render 설정·계정 자료 변경은0이며 신규 브라우저·실기기 검사는 하지 않았다. 관찰 사용자0명이다. staged0,commit/push/PR/merge/Preview/Production은 실행하지 않았다. 원시 로컬 검사 근거는 계속 Git 밖/ignored output에 두며, 앞서 정책상 삭제가 차단된 기존 런타임 원본 사본도 그대로다. 다음은 발행 파일 집합의 최종 검토·외부 자동 배포 차단 확인과 승인된 게시 이후 실제 GitHub 검사다. Render 서비스/요금제/HTTPS URL·실제 다기기 사용 및 M7-2 전체 완료는 남는다.

### 9/26 후속 — 304개 게시 후보와 원본 없는 사본 검증

직전 차례는 승인된 GitHub 검사 환경·secret6개 등록과 로컬 검증을 마친 **진척**이었다. 이번에는 개별 변경431개를 읽고, 현재 제품의 실행 코드·전체 통합검사·설치/CI 진입점·DB 이력·연결 문서를 보존하는 **304개 게시 후보**와 **127개 로컬 보류 파일**로 나눴다. 단순 경로 분류를 소유권/게시 승인으로 바꾸지 않는다. 후보는 사용자의 코드 게시 결정 전 검토안이며, 이번에 stage/commit/push/PR/merge하지 않았다.

| 후보 묶음 | 변경 파일 수 | 근거·경계 |
| --- | ---: | --- |
| 앱·공유 실행 코드 | 129 | `/alpha`·callback·API와 개인공간/제작/공유/보존 계약. 현재9진입점의427파일 import 연결 중 변경124개를 모두 포함. UI 기능 축소 없음 |
| 회귀·CI 검사 | 109 | `lib/components` 전체 통합 테스트와 기존 변경 검사, CI 실행기·인증 E2E. 전체 통합 테스트252파일의 목록과 bytes를 원래 작업 공간과 대조 |
| 설치·의존성 | 4 | package/lock, SDK postinstall patch, Git ignore. 비밀 설정값은 포함하지 않음 |
| 필요한 보조 도구 | 16 | package/CI 직접 진입점과 그 import·문서에 연결된 재현/백업 도구. 실제 계정 조작을 자동 실행하는 승인 아님 |
| DB 변경 이력 | 22 | 기존 DEV 적용 이력에 대응하는 로컬 migration. 후보 SQL6개와 별개이며 이 파일의 게시가 원격 DB 적용/repair를 승인하지 않음 |
| 설계·결과 문서 | 24 | 현재 단계·설계·검사 요약. 원시 output/trace/백업은 게시하지 않음 |

보류127개는 비공개 카탈로그1개, 실계정에 고정된 조작 도구1개, 실험 SQL6개, 그 SQL을 직접 쓰는 도구/검사10개, 로컬 전용 의존을 가져오는8개, 현재 package/CI/선택된 문서·코드 연결에 필요하지 않은 보조 검사 도구101개다. **삭제하지 않았으며 검사 이력이나 제품 요구사항을 폐기하지 않는다.** 특히 보류한101개는 수동 DEV/브라우저·실험 검사의 원본 코드로 로컬에 남는다. 공개 재현 패키지가 필요하면 입력과 의존성을 별도 검토해서 추가한다. 현재 전체 통합검사252파일에서 보류된 파일은 없다.

선별 중 `render-release-inventory`의 제외 경로 표식을 실제 SQL 의존으로 잘못 분류한 예비 검사 결과를 확인했다. 파일 내용을 검토해 그 검사기/테스트2개는 CI 필수 파일로 유지했고, 최종 후보의 package/CI 직접 진입점 누락0·찾은 로컬 import 누락0·실행 closure 누락0이다. 이 정적 점검은 임의 동적 파일 접근의 완전한 증명이 아니므로 아래 실제 설치·타입·테스트·빌드와 구분한다.

두 보고서에서 로컬 증거/제외 도구를 공개 가능한 상대 링크로 표현한7곳을 수정했다. [compact 원장](alpha-m7-2-compact-inverse.md)의 output5개·실험 측정기1개, [실계정 조작 원장](alpha-m7-2-delegated-trial-20260924.md)의 전용 도구1개를 **로컬 전용 경로 표기**로 바꿨다. 원본 파일·수치·과거 판정은 바꾸지 않았다. 선택된 문서에서 후보 밖 로컬 파일로 향하는 상대 링크는0이다. 이메일 신호는 예제 도메인과 lockfile의 공개 패키지 안내 주소였으며 실사용 Gmail 주소가 후보에 발견된 것은 아니다. 절대 PC 경로가 포함된 과거 메타데이터는 남아 있고, 이를 모든 개인정보/비밀의 부재 증명으로 확대하지 않는다.

#### 선별 사본의 실제 검증

원격 `main`의 읽기 전용 조회는 현재 HEAD `efd8b642707b5c8e67b727f23169ae41c43cb5e8`와 같았다. 이 Git 기준점의 추적10,426파일에 위304개 변경 사본만 덮은 임시 소스 사본을 만들었다. 원래 작업 공간에는 쓰지 않았다. `C:/Users/HUBERT/AppData/Local/Temp/flowme-release-candidate-r0CRlL`은 **Git metadata가 없는 시험 사본**이며 새 브랜치/commit/깨끗한 Git checkout이나 실제 CI로 표현하지 않는다.

Windows 기본 tar가 기존 한글 파일명을 해석하지 못해 압축 해제2회가 종료1이었다. 두 번째 실행에서 오류 원문을 확인했고 Git ZIP과 이미 설치된 lockfile 의존성 `unzipper`로 전환했다. 같은 임시 디렉터리에서 최종 Git 기준점10,426파일이 모두 존재하고, 선택 파일과 manifest를 합친10,667파일 이외의 source 파일0을 확인했다. 원본/legacy 파일은 수정하거나 삭제하지 않았다.

| 실행 | 결과와 한계 |
| --- | --- |
| 후보 사본·제외 대조 | 선택304파일 bytes 일치, 보류127파일 부재. 앱·통합614소스가 원래615개 중 비공개 카탈로그1개를 제외한 동일 bytes. 테스트252파일의 목록/bytes 동일 |
| 새 `npm ci` |220패키지 설치·221개 audit, 취약점0. 비공개 pack·계정 `.tmp`·`.env`·Git metadata 복사0. 레거시 전이 의존성의 deprecation 경고는 남음 |
| 사본 `npm test` | **2,255/2,255**, 실패/skip/cancel0·소스 변경0. 08:13:18–08:14:58 UTC |
| 사본 production build | 종료0·소스 변경0. 08:12:25–08:15:43 UTC. 비공개 원본/인증값 없이 앱 빌드 성공 |
| 사본 타입 | **544진입점·614소스**, 진단0·소스 변경0. 타입/판정 도구10/10 별도 통과 |
| 사본 인증/검사 도구 | `test:alpha-auth` **29/29**(27+2), 조립·workflow·출력/판정 도구 **12/12**. 모의/정적 검사이며 실제 DB/Auth 요청 없음 |
| 사본 문서 |4/4·로컬 링크6,616개·skill sync 통과. 이후 현재 원장/STATUS의 결과 기록은 원래 작업 공간에서 별도 확인 |
| 전체 통합2,489개·브라우저 | 이번 사본에서는 재실행하지 않음. 같은 bytes의252테스트와614앱 소스임을 대조했고 직전 차례의 전체 통합2,489/2,489 및 원본 공급31/31 결과를 기존 근거로 유지. 새 실행 수로 합산하지 않음 |

로컬 전용 목록·hash·이유: `output/alpha-m7/m72-release-candidate-20260926.json`. 초기 사본 기록: `output/alpha-m7/m72-release-candidate-copy-20260926.json`. 사본의 npm/build/type 원시 결과는 그 사본 아래 `output/integrated-product-poc/`에 보존하고, 최종 요약은 원래 작업 공간의 `output/alpha-m7/m72-release-candidate-rehearsal-20260926.json`으로 연결한다. 이 검증 뒤 본 원장/STATUS만 갱신하므로 **실제 게시 직전 문서 포함 최종 파일 hash를 다시 고정해야 한다**.

Vercel 상세 조회의 기존 연결 오류를 같은 인수로 반복하지 않았다. 현재 브라우저 목록에는 빈 Codex 내장 브라우저만 있고 로그인한 Chrome이 없어, 내장 브라우저에 해당 프로젝트 Git 설정을 열었다. 실제 도착 화면은 Vercel 로그인이다. 사용자에게 이 탭의 로그인을 요청했으며 설정 변경은 하지 않았다. 따라서 **외부 자동 배포가 꺼졌는지는 미확인**이다. 코드 게시 승인은 GitHub 비밀값 등록 승인과 구분한다. 다음은 로그인 후 설정 읽기와304개 후보의 명시된 commit/push/PR 범위 승인이다. merge/Render 서비스 생성·요금제·배포는 별도 gate다.

이번 변경은 보고서 링크 표기와 이 원장/STATUS, ignored 조사·사본 생성/결과 수집 도구다. 제품 소스·원격 DB/Auth·Render/Vercel 설정 변경0, 원본 카탈로그 hash 불변, stage/commit/push/PR/merge/배포0이다. 새 브라우저 시나리오·실제 기기 검사는 없고 관찰 사용자0명이다. M7-2 전체·실제 다기기 사용·배포 완료로 판정하지 않는다.

### 9/26 후속 — Vercel 로그인 후 Git 배포 설정 대조

사용자가 "로그인 했어 재개해"라고 알린 뒤 같은 Codex 브라우저의 실제 프로젝트 설정을 확인했다. 로그인 대기는 해소됐다. 현재 상태 기록 절차에 따라 새 제품 정책 대신 이 원장에 확인 결과와 다음 승인 범위를 남긴다.

| 확인 대상 | 실제 값·판정 |
| --- | --- |
| 프로젝트·연결 저장소 | `flowme/flowme2605`, ID `prj_Y9d4F4TrlZSY9WOGmr4x8OFuvQC0`, GitHub `knhbae/flowme2605` 연결 유지 |
| Root Directory | 빈 값, 즉 저장소 루트. 하위 폴더 설정으로 루트 `vercel.json`을 건너뛰는 구성은 아님 |
| Ignored Build Step | `Automatic`. 모든 빌드를 끄는 대시보드 설정으로 표현하지 않음 |
| 루트 Git 배포 규칙 | 현재 HEAD와 작업 파일의 `git.deploymentEnabled=false`. 게시 후보 사본에도 유지된 기존 추적 파일 |
| Deploy Hooks·CI | 대시보드 Deploy Hooks 없음. 현재 `.github/workflows`에서 Vercel 배포 명령은 발견하지 못함. 외부 서비스 전체의 부재를 증명하는 검사는 아님 |
| 소스 불변 대조 | 게시 후보304개 중 사본 검사 이후 달라진 경로는 `docs/STATUS.md`와 이 원장2개뿐. 제품·검사 소스는 그대로이며 staged0 |

[Vercel 공식 Git Configuration](https://vercel.com/docs/project-configuration/git-configuration#turning-off-all-automatic-deployments)은 `git.deploymentEnabled=false`가 모든 브랜치의 Git 자동 배포를 끈다고 설명한다. 따라서 확인한 프로젝트 루트와 현재 파일을 유지하는 **이번 Git 게시의 설정상 자동 배포 차단 근거**가 마련됐다. `Ignored Build Step=Automatic`은 별도의 빌드 생략 규칙이다. 실제 push 후 배포0을 확인한 것은 아니며, 수동 배포나 독립 외부 자동화까지 차단했다는 뜻도 아니다. 게시 뒤 실제 배포 목록과 CI를 확인해야 한다.

확인 도중 브라우저의 요소 번호 클릭이 의도한 설정 링크로 이동하지 않고 Commit Comments를 Off→On으로 바꿨다. 복구 과정의 마우스 기반 동작에서도 PR Comments가 On→Off로 달라졌다. 이후 정확한 요소 이름에 키보드 입력을 사용해 **PR Comments=On, Commit Comments=Off**로 각각 복구했고, 새로고침 뒤 두 값과 기존 이벤트/commit-status 스위치가 최초 값과 같은 것을 확인했다. 따라서 이번 차례를 외부 설정 쓰기0이라고 보고하지 않는다. Git 연결·배포 규칙·요금제·Auth 설정은 변경하지 않았다. 로컬 화면 근거는 `output/alpha-m7/m72-vercel-git-restored-20260926.png`이며 공개 후보에 넣지 않는다.

원격 main은 읽기 전용 재조회에서도 `efd8b642707b5c8e67b727f23169ae41c43cb5e8`이다. 루트 `vercel.json` SHA-256은 `b10831be8e8893032db39daf5f86c6ab9c7a87ced5f339b79ed4d8925872189d`. 현재 최종 설정 대조는 UI와 파일에 근거하며 실제 CI/Render/실기기 검사는 아니다. 이전 npm2,255·build·인증29·도구12 결과는 재실행 수로 더하지 않는다.

다음 실행 범위로 **304개 후보만 현재 작업 브랜치에 commit·push하고 Draft PR 작성**하는 승인을 요청했다. 127개 보류 파일과 원시 증거·계정정보는 제외하며, main merge·Render 서비스 생성/첫 배포·비밀 원본의 Render 전송·유료 설정·DEV Auth 변경은 포함하지 않는다. 승인 전에는 stage하지 않는다. 실제 게시 직전 문서2개를 포함한 최종 파일 hash를 갱신하고 검증된 소스와 다시 대조한다. 이번에는 코드 게시·배포·DB/Auth/실자료 변경이 없고 M7-2는 진행 중이다.

### 9/26 후속 — 승인한 304개 commit·push·Draft PR

사용자가 "304개 commit·push·Draft PR 승인, 재개해"라고 명시했다. 직전 최종 후보 `4b862a7f164767123e988a6799b4407dbf78a6a60c7be47c5d69e0e13ff2a35d`의 경로와 파일을 대조하고, **304개 경로만** 선별 stage했다. 실제 staged blob 304개도 대조했고 제한된 비밀값/비공개 카탈로그 패턴 검출은0이었다. 일반적인 모든 비밀의 부재 보증으로 확대하지 않는다.

첫 `git diff --cached --check`는 `participation-editor.ts` 끝의 빈 줄1개 때문에 실패했다. 그 빈 줄만 제거한 뒤 재stage하고, 저장된 검증 사본과 `trimEnd()` 내용이 동일한 것을 확인했다. 두 번째 검사는 통과했으며 나머지303개 파일은 승인된 최종 snapshot과 같았다. 보류127개는 모두 기존 hash를 유지했다. 공개 대상 확대·보류 자료 삭제·비공개 원본/계정정보 반입은 없다.

| 항목 | 이번 실제 결과 |
| --- | --- |
| commit | `7eb9eaa1cbdf85ca588def294cca7f03ee9e13ea`, `feat: preserve integrated FlowMe alpha for M7-2 trial`; 304개·28,238줄 추가·630줄 삭제 |
| push | `origin/agent/alpha-m1-persistence-20260921`에 동일 SHA 확인·upstream 설정. 원격 main은 기존 `efd8b642707b5c8e67b727f23169ae41c43cb5e8` 그대로 |
| PR | [#204](https://github.com/knhbae/flowme2605/pull/204), `OPEN`, **Draft=true**, base `main`, changedFiles304. 현재 채팅에 첨부 완료 |
| 로컬 게시 관문 | Node24.17.0, audit 취약점0. commit hook 문서4/4. push hook `npm run verify` 문서4/4 + `npm test`2,255/2,255 + production build 성공. hook 우회0 |
| 원격 CI | [실행36231631419](https://github.com/knhbae/flowme2605/actions/runs/36231631419), PR 이벤트·동일 head SHA. core 성공. 전체 E2E는 **758통과·2실패**. 별도 승인한 비공개 통합 검사는 **2,489/2,489**·정리·필수 gate 성공. 전체 실행은 failure이며 완료됨 |
| Vercel | 09:00 UTC 이후의 현재 프로젝트 배포 목록을 push/PR 생성 뒤 조회해0개. 수동/미래/다른 프로젝트 배포의 부재 증명은 아님 |
| 미실행 | main merge, Render 생성/배포, Preview/Production 배포, DB/Auth 변경, 실제 기기 검사, 관찰 사용자 검증 |

이번에 새로 실행한 로컬 통합 전체/실계정 브라우저 검사는 없다. 직전 로컬 통합2,489·브라우저51 결과를 이번 원격 실행이나 아래 합성 브라우저 실행 수에 합산하지 않는다. 로컬 전용 근거는 `output/alpha-m7/m72-approved-publication-stage-20260926.json`, `m72-commit-latest.json`, `m72-push-latest.json`과 해당 `.log`다. 게시 뒤 이 원장과 STATUS의 결과 기록2개는 최초 `7eb9eaa1`에 들어 있지 않으며 승인된 후속 변경으로 관리한다.

완료된 원격 core job `108375763277`의 로그를 직접 읽었다. Linux에서 문서4/4·회귀2,255/2,255·build·인증29/29·Plan 표시 계약10/10·타입 도구10/10/진단0, 공개 경계/CI 도구17/17, portable 브라우저4/4·모의 인증 브라우저30/30이 통과했다. 로컬 결과를 원격 실행 수로 대신 쓰지 않았다. 이 브라우저34개도 실제 기기·실계정·관찰 사용자 검증은 아니다.

비공개 검사 job `108376517222`는 처음에 `flowme-catalog-ci` 환경(ID `22800213978`)에서 `waiting`이었다. 사용자가 "이 커밋의 비공개 CI 검사 승인"이라고 답한 뒤 PR head와 실행 SHA가 모두 `7eb9eaa1cbdf85ca588def294cca7f03ee9e13ea`임을 재확인하고 해당 실행의 해당 환경만 승인했다. 09:16:50 UTC에 job이 시작됐고 재조회에서 대기 환경0개·사본 준비 단계 성공·통합 계약 검사 실행 중을 확인했다. 이미 등록한 secret을 사용하는 검사이며 신규 원본/secret 등록·환경 보호 변경·승인 우회는 없다. 전체 E2E job `108375763151`도 별도로 계속 실행 중이며 같은 실행을 취소하거나 다시 시작하지 않았다.

전체 E2E는 09:21:32 UTC에 실패로 끝났고 검사760개 중758개가 통과했다. 최초 실행과 자동 retry2회 모두 같은2개 검사에서 실패했다. 같은 job의 로그와 보존된 HTML 보고서의 화면 문맥을 읽고 현재 요구/코드와 대조했다. 로컬 내려받은 근거는 `output/alpha-m7/m72-ci-run-36231631419/playwright-report/`이며 공개 소스나 새 사용자 자료가 아니다.

| 실패 검사 | 확인한 원인과 수정 제안 |
| --- | --- |
| `integrated-product-poc-authoring-merge.spec.ts:57` | 현재 없는 `빈 틀 확인` 버튼과 옛 전체교체 확인 단계를 기다렸다. [M4 확정 요구](alpha-m4-authoring.md#요구-대조와-구현-순서)의 A12/D2-049는 빈 원문에 `빈 틀 넣기` 1회로 삽입하는 방식이고 실제 코드·실패 화면도 일치한다. 테스트를 현재 조작에 맞추되 예시 미리보기/취소의 무변경, 정확 scaffold, native Undo/Redo, 명시 저장·재진입·reload 검사는 유지한다. 제품을 옛 동작으로 되돌리지 않는다. |
| `integrated-product-poc-flow-boundary-merge.spec.ts:71` | 폴더 생성 직후 poll callback이 아직 null인 최초 저장값의 `.data`를 읽어 즉시 TypeError로 종료했다. 실패 화면에는 이후 `폴더 만들기 · 저장됨`과 `Parent folder`가 있다. 먼저 첫 성공 저장을 기다린 뒤 기존 엄격한 binding/부모 폴더 상속/Item 실행일/완료/Undo/reload/운영 bytes 불변 검사를 그대로 이어가도록 제안한다. 임의 sleep·예외 무시·검사 제외로 통과시키지 않는다. |

`gh-fix-ci` 절차에 따라 원인과 테스트2개 수정·표적 검증·후속 commit/push 범위 승인을 요청했고 사용자가 "수정·검증·후속 커밋·푸시 승인"이라고 답했다. 승인 후 작성 틀의 직접 삽입을 정확 scaffold와 비교하고 비어 있지 않을 때의 재삽입 잠금도 검사하도록 수정했다. 첫 폴더 저장은 성공 UI와 저장 envelope 존재를 먼저 기다린 뒤 기존 엄격한 상태 검사를 이어간다. 원문/운영 bytes·저장 prefix·Undo/Redo·Flow 소속·Item 실행일·reload assertion은 유지했다. 제품 소스/timeout/retry/검사 제외 규칙은 바꾸지 않았다.

로컬에서 `npm run test:e2e`의 기존 준비 절차(소유자 manifest105개·격리 historical build)를 거쳐 수정한 두 파일의4시나리오를 `--project=current-and-artifacts --workers=2 --repeat-each=3`으로 실행했다. **12/12 통과·실패0**, 실제 브라우저 실행25.0초, retry0이다. 12개 고유 시나리오나 Linux/실기기 검증으로 표현하지 않는다. 기본 앱은 최초 push hook에서 빌드한 동일 제품 코드이며 이번에는 테스트/문서만 수정했다. 출력은 `output/playwright/m72-ci-e2e-fix-20260926/`의 로컬 전용 경로다.

원격 비공개 검사 job은 09:26:47 UTC에 success로 끝났다. 허용된 공개 요약 `catalog-contract-summary/new-tests-latest.public.json`에서 **252개 테스트 파일·2,489실행/통과·실패/skip/cancel0·검사 중 소스 변경0**, 원시 로그 미보존을 확인했다. source614개의 snapshot hash는 `a0fa44efb366e82b36b6925018ea06854391e52e6e7724550fad91adf6aa6e45`다. 사본 준비·이 job의 임시 원본 정리·요약만 업로드가 각각 success이며 후속 필수 gate `108378995941`도 success다. 전체 실행은 E2E2건 때문에 **failure**로 보존하고 취소/재실행하지 않았다. 로컬로 받은 위 요약은 `output/alpha-m7/m72-ci-run-36231631419/catalog-summary/` 아래에 있다.

Render 준비를 병행 조회한 결과 기존 `My Workspace`를 재확인했으나 서비스 목록 응답은 여전히 null이라 서비스 부재로 단정하지 않는다. 연결 도구의 생성 계약에는 자동배포 Off 설정은 있지만 비밀 파일/health path 설정 인수가 없어, 추후 승인된 생성 때 Dashboard/API 보완이 필요하다. 서비스나 요금제 설정은 바꾸지 않았다.

다음은 승인된 테스트2개와 결과 원장2개의 diff/보류 파일 불변을 확인하고 필수 hook을 거쳐 후속 commit·push한 뒤 새 원격 CI를 확인하는 것이다. 이전 커밋에만 승인한 비공개 환경 검토를 새 커밋의 자동 승인으로 확장하지 않는다. 그 뒤에도 Render 서비스/정확한 주소/DEV callback/최초 배포 승인은 별도다. M7-2 실제 다기기 시험 목표는 완료가 아니다.

## 9/24 현재 — 제한 PC 사용을 먼저 시작

사용자가 과도한 검증 반복을 지적한 뒤, 필수 확인과 후속 개선을 나누어 진행하는 안을 승인했다. **현재 PC에서 소량의 개인 일정·메모와 지원 콘텐츠 사본을 써보는 준비는 갖춰졌다.** 폰·태블릿의 상시 사용이나 일반 공개 서비스가 준비됐다는 뜻은 아니다. 실제 계정의 전체 복원 시험은 후속으로 분리하며 그 승인 대기를 PC 사용 시작의 차단 조건으로 삼지 않는다. 미실행 항목을 통과로 바꾸거나 기존 자료를 복원·삭제하지 않는다.

### 시작에 필요한 근거와 사용 범위

| 확인할 것 | 확인된 근거 | 지금의 판정과 제한 |
| --- | --- | --- |
| 저장·재로그인 후 유지 | [001 직접 조작 시험](alpha-m7-2-delegated-trial-20260924.md): 검증용 문서2개·할 일3개·폴더1개, 날짜/완료/Undo·reload·독립 로그인·성공 저장14건 | PC 제한 사용 가능. 사용자 일상 사용 증거는 아직 없음 |
| 계정 간 분리 | [M2 권한 검사](alpha-m2-auth.md), [M3 독립 클라이언트·타인 접근 거절](alpha-m3-sync.md), 001 시험의 002/공유 범위 불변 대조 | 기존 두 계정의 개발계 사용 근거. 이번에는 새 로그인이나 실자료 쓰기를 하지 않음 |
| 다른 접속의 변경 반영 | M3 실제 개발계 API38·브라우저107 확인, 독립 브라우저3개와 충돌/재접속 검사; 001 시험의 독립 로그인 | 서버 연결 근거는 있음. 같은 PC의 독립 브라우저를 실제 폰·태블릿으로 세지 않음 |
| 기존 콘텐츠 보존 | [전체 반입](alpha-m7-2-full-catalog.md)의177Flow·26Map·판본2개, [연결 후속](alpha-m7-2-catalog-wave3.md)의13Flow·103항목 | 전체 보존·열람과 편집 가능 범위를 구분. 나머지164Flow 및 Map의 전체 편집 연결은 미완료 |
| 백업·복원 안전장치 | 실제 두 계정 백업/동일 상태 preview,001 r441 새 백업 대조, 별도 QA 실제 복원·새 로그인·새 백업 근거 | PC 시험의 보조 근거로 사용. 실계정 복원·독립 물리 사본·서비스 전체 재해복구 성공으로 확대하지 않음 |

판정은 **조건부 PC 시험 시작 가능**이다. 이번 대조에서 이 범위의 시작을 막는 새 구현 결함은 확인하지 못했다. 안전성이 전부 입증됐다는 의미는 아니므로 중요한 자료의 유일본·대량 자료·민감한 자료는 아직 맡기지 않는다. 기존 앱의 개발계 안내와 데이터 경계를 유지한다.

### 진행 순서와 멈추는 기준

| 순서 | 할 일 | 끝내는 기준 |
| --- | --- | --- |
| 지금: PC 소량 사용 | `http://localhost:3104/alpha`에서001은 개인 일정·메모,002는 기존 콘텐츠 열람과 지원된 제작 사본 사용. 서버 성공 표시를 확인하고 원본/사본을 별도 보관 | 준비 판정은 완료. 같은 자동 시나리오를 다시 요구하지 않고 실제 사용 중 나타나는 문제를 받음. 사용 경험을 대신 만들어 완료로 세지 않음 |
| 다음: 일상적인 다기기 접속 | 고정 접속 주소·서버/API·인증 redirect·개발/운영 분리의 배포안을 준비하고 별도 배포 승인 후 연결 | 승인된 환경에서 PC 저장→실제 폰 열기→폰 수정→PC 반영의 대표 흐름1개 확인. 접속/저장/계정 혼입 결함만 이 단계의 필수 수정으로 묶음 |
| 후속: 사용하며 개선 | 실제 계정 복원 연습, 사용자 선택의 독립 백업 사본, 미지원 콘텐츠 연결, 백업 지연/누적 용량, 추가 UI·접근성 | 필요한 기능과 발견된 결함 단위로 작업. 특정 미지원 콘텐츠나 복원 기능이 실제 사용 목적이 되면 그 항목만 다시 선행 작업으로 올림 |
| 공개 서비스 전 별도 | 일반 가입 메일·남용 대응·공개/삭제 정책·관측·서비스 복구·배포 검토 | 기존 공개/운영 gate를 따름. PC 제한 사용 판정을 공개 출시 승인으로 사용하지 않음 |

현재 실행기는 `127.0.0.1:3104`에만 연결한다. 폰에서 PC의 `localhost`를 그대로 열 수 있다고 안내하지 않는다. Android USB 연결 후보는 단기 검사 경로이며 상시 다기기 사용의 대체가 아니다. 현재 `/alpha`는 서버 API를 쓰므로 HTML 파일 배포만으로 같은 기능을 제공하지 못한다. 새 호스트 가입·유료 설정·외부 접속 허용·Auth 설정·배포는 이번에 실행하지 않았다.

백업은 기존 관측에서 약32초, 미리보기는 약23–29초가 걸린 사례가 있어 느릴 수 있다. 처리 중 연속 요청이나 강제 재시작으로 해결하려 하지 않고 상태 안내를 따른다. 저장 성공이 불명확하거나 자료 혼입/누락이 보이면 **추가 쓰기·복원·초기화를 멈추고 입력을 별도 보관한 뒤 그 결함부터 확인**한다. 장기간 누적과 모든 writer의 용량/백업 가능성은 완료로 판정하지 않는다.

### 검증을 다시 늘리지 않는 원칙

- 이번은 범위·진행 문서 변경이다. 기존 실행 근거를 재사용하고 문서 검사와 변경 범위 확인만 수행한다.
- 순수 로직은 해당 테스트부터, 런타임 변경은 저장소의 필수 npm/build 및 영향받는 브라우저 검사를 수행한다. 변경 묶음을 마친 시점에 실행하고 동일 소스에 대한 전체 검사를 반복하지 않는다.
- 저장/권한/이관 계약 변경 또는 발행 시에는 필요한 전체 회귀·보안 gate를 유지한다. hook/CI를 우회하거나 필수 검사를 없애는 변경은 아니다.
- 실패는 영향 범위와 재현 조건으로 기록한다. 관계없는 화면 개선·새 시나리오를 기존 목표의 필수 조건으로 계속 추가하지 않는다.

### 이번 대조와 기존 결과의 구분

현재 명령으로 `/alpha` HTTP200과 `127.0.0.1:3104` listener를 확인했다. 직전 build·npm·통합 검사에 기록된 **599개 소스 hash 모두 현재와 일치**하고, 수집 범위에 추가 파일도 없다. 이는 앱 전체의 모든 파일이나 DB가 불변이라는 주장이 아니다. 기존 결과는 npm2255/2255·통합2476/2476·build 종료0이며 **이번에 재실행한 결과가 아니다**. 최신 안내 브라우저23+30항목도 앞선 실행 근거로 유지한다. 보안 감사·전체 브라우저·실계정 로그인/쓰기·실기기 검사를 새로 수행하지 않았다.

기존 T01–T06과 앱에 등록된 원래 M7-2의 실계정 복원·실기기·일상 사용 조건은 미완료로 보존한다. 이번에 완료한 것은 **제한 PC 사용 시작 판정과 다음 작업의 범위 재정리**다. 전체 M7-2 완료나 관찰 사용자 증가로 처리하지 않는다. 앞선 복원 승인 질문은 지금의 필수 입력이 아니며, 복원 후속을 실제 실행할 때 당시 자료와 차이를 다시 확인한다. 이 아래의 ‘현재’, ‘blocked’, ‘다음’ 문단은 각 시점의 이력이다.

## 9/24 다기기 연결 준비안 — 배포 전

제한 PC 사용 판정 뒤의 후속 조사다. **권장 후보는 Render 무료 Node Web Service + 기존 개발용 Supabase**다. 이는 문서·코드에 근거한 호환 후보이며 호스트 선택, 서비스 생성, 배포 승인이나 실사용 검증 결과가 아니다. Vercel 접근 제약을 그대로 두고 다른 접속 경로를 마련하려는 안이다. Render 계정 보유 여부와 실제 사용 장소의 `onrender.com` 접근 여부는 아직 확인하지 않았다.

### 현재 코드에서 필요한 변경

| 확인된 조건 | 필요한 작업과 유지할 경계 |
| --- | --- |
| [환경 계약](../../../lib/flow/integrated-poc/alpha-persistence/environment.ts)이 DEV 프로젝트와 localhost 두 origin만 허용 | 선택한 테스트 호스트의 정확한 HTTPS origin을 개발계 계약에 명시. 임의 URL·와일드카드·운영 프로젝트 허용은 금지. 현행 로컬 경로 유지 |
| [Auth 설정·callback](../../../lib/flow/integrated-poc/alpha-auth/config.ts)과 account/creator/social/media/preservation API가 같은 origin을 검사 | 로그인뿐 아니라 모든 쓰기/파일 경로를 같은 허용 주소에 연결. `VERCEL_ENV=production` 차단을 무조건 제거하지 않음. reverse proxy의 HTTPS/host 처리를 배포 시 확인하고 임의 전달 header를 신뢰하는 우회는 금지 |
| [로컬 실행기](../../../scripts/alpha/dev.ts)는 PC 파일과 `127.0.0.1:3104` 고정 | 이 파일은 그대로 두고 호스트의 서버 환경변수와 포트를 사용하는 실행 경로를 분리. 현재 Next15.5.25·Node24.x·sharp0.35.4의 Node 서버 경로 유지. static export/Edge 런타임 전환은 이번 작업에서 제외 |
| 서버 서명키가 명령과 백업 proof를 보호 | 선택한 호스트의 비밀 설정에만 전달하고 브라우저/public 변수·Git·로그에 기록하지 않음. 기존 키를 임의 재생성/교체하지 않음. `.tmp` 파일·계정 비밀번호·로컬 백업은 배포 소스에서 제외 |
| 현재 M1 이후 변경이 로컬 dirty/untracked로 남음 | 발행 시 소유 범위와 비밀/증거 제외를 확인한 코드 기준점을 먼저 마련. 다른 작업의 변경을 일괄 stage하지 않음. 이번에는 commit/push/PR을 하지 않음 |

### 호스팅 후보와 무료 제한

Render는 서버 기능이 있는 Next 앱을 Node Web Service로 실행하며 기본 `onrender.com` 주소를 제공한다. 따라서 처음부터 도메인을 구매하거나 새 DB에 가입하는 안은 아니다. FlowMe의 Node POST API·sharp 사용과 맞는다는 것은 **현재 코드와 공식 지원 방식에서 도출한 판단**이며, 이 앱의 호스팅 성공 근거는 아직 없다. [Next 앱 배포](https://render.com/docs/deploy-nextjs-app), [웹서버·포트·HTTPS](https://render.com/docs/web-services).

무료 서버는15분 유휴 후 중지되고 재접속 시 약1분이 걸릴 수 있다. 서버 디스크는 임시이므로 앱 자료·사진은 기존 Supabase에 두고, 사용자 백업을 이 디스크에 보관하지 않는다. 무료 시간·전송량·빌드 한도와 외부 API/DB 트래픽 제한이 있다. 결제 수단이 있으면 일부 초과 비용이 발생할 수 있으므로 결제·유료 전환은 승인하지 않은 상태로 유지한다. 운영용 상시 가용성 보장은 아니다. [무료 조건](https://render.com/docs/free).

공식 가이드는 서비스 생성 시 첫 배포를 시작하므로 **가입·검토와 Create Web Service는 구분**한다. 후속 자동 배포의 기본값은 On Commit이고 Off 설정이 가능하다. 사용자의 별도 배포 승인 원칙에 맞춰 자동 배포는 끄는 안을 권장하되 이번에 설정하지 않았다. [서비스 생성](https://render.com/docs/web-services), [자동/수동 배포](https://render.com/docs/deploys). Node 버전도 기본값에 의존하지 않고 저장소의24.x 범위를 명시한다. [Node 버전 설정](https://render.com/docs/node-version).

### 승인 후 구현·접속 확인 묶음

1. **정확한 호스트와 공개 범위 확인:** 사용자가 호스트 후보를 선택하고 계정 접근을 준비한다. 인터넷으로 접근 가능한 테스트 URL이라는 점과 DEV 프로젝트 유지, 비용0 범위, 신규 가입/공개 콘텐츠의 기존 보류 경계를 확인한다. 호스트 선택만으로 배포를 승인했다고 해석하지 않는다.
2. **로컬 코드 준비:** 정확한 HTTPS origin·callback·서버 실행 경로만 추가한다. 기존 운영 프로젝트·로컬 인증·원본/이력·서명키 경계를 유지하고 관련 환경/Auth/API 음성 검사 및 런타임 필수 npm/build를 변경 묶음 완료 시 한 번 실행한다.
3. **별도 승인 후 연결:** 소유 코드 기준점을 발행하고, 자동 배포를 끈 테스트 서버에 승인된 비밀 설정을 넣는다. DEV Auth에 정확한 callback만 추가하며 Site URL·기존 localhost redirect를 임의 교체하지 않는다. 현재 로그인 계정·DB·콘텐츠를 다시 만들거나 import하지 않는다. [Supabase redirect 기준](https://supabase.com/docs/guides/auth/redirect-urls).
4. **대표 흐름 한 번:** PC 로그인·소량 저장→실제 폰 로그인·같은 내용 열기→폰 수정→PC 반영을 확인한다. 실패 시 해당 구간만 수정·재검사한다. 호스팅 시작 확인과 권한 음성 검사는 유지하되 전체 콘텐츠/복원/기기 조합을 이 흐름의 선행 조건으로 늘리지 않는다. 실제 기기 기록은 자동 브라우저와 구분한다.

이번은 읽기 전용 코드/공식 자료 조사와 문서 변경이다. 2026-09-24에 공식 문서를 확인했으며 Supabase changelog의 관련 변경도 검토했다. 신규 Free 프로젝트의 기본 SMTP 메일 템플릿 수정 제한은 추후 일반 가입/메일 준비에서 다시 확인할 사항이고 이번에 SMTP·Auth를 바꾸지 않는다. 이미 선택된 관리형 Supabase를 자체 호스팅으로 바꾸지 않는다. 서비스 생성·호스트 로그인·외부 설정·DB 조회/쓰기·전체 테스트·앱 변경·배포0이다. 복원 및 원래 M7-2의 미실행 범위는 앞선 판정 그대로 남긴다.

## 9/24 후속 — 대기 상태와 미실행 요청 구분

복원 답변 전 [D2 하위 화면 후속](alpha-m7-2-delegated-trial-20260924.md#924-후속--하위-화면-미실행-안내)을 진행했다. 상위 일시 대기와 하위 요청 미실행 안내를 분리하고, 제작/참여/개인 Flow/자료실의 입력·선택 보존 및 명시 재시도 경로를 표적84개로 확인했다. npm2255·전체 통합2476·타입·build·문서·합성 브라우저23+30항목이 통과했다. 실계정 복원은 답변 전 미적용이며 이전의 r441 백업 대조를 실제 복원 성공으로 바꾸지 않는다.

## 9/24 현재 — 복원 사전 대조 완료

[T04 사전 대조 결과](alpha-m7-2-delegated-trial-20260924.md#924-후속--복원-전-현재-상태-대조):001 r441 새 백업과 이전 시험 직후 백업의 개인공간·참조·기록441건·첨부/보관소가 일치했다. DEV 보호 범위도 직전 종료 근거와 동일하며 앱 자료 쓰기0이다. 백업/복원 관련 표적 자동 검사69/69가 통과했다. 이제 실제 복원의 대상/차이 확인 조건에 따라 시험용 메모 한 줄 변경·복원 허용 여부를 질문했다. 특정 백업 폴더나 이전 승인 세 건을 재요청한 것은 아니다. 답변 전에는 실계정 복원을 적용하지 않는다. M7-2 전체는 진행 중이며 자동 검사와 실제 복원·실기기·일상 사용 증거를 구분한다.

## 9/24 결과 — 001 대리 조작 시험

[상세 결과와 개선 항목](alpha-m7-2-delegated-trial-20260924.md)에 직접 조작한 범위와 한계를 정리했다.001에 검증용 문서2개·할 일3개·폴더1개를 만들고 날짜 이동/Undo·완료/다시 열기·문서 폴더 Undo/Redo·reload·독립 로그인·실제 UI 백업과 동일 상태 preview를 확인했다. 성공한 저장14건, r427→441이다. 다섯 viewport의 오늘 목록/날짜 대화상자는 가로 넘침/적용 버튼 가림0·후속 콘솔/page error0이다.002·별도 QA·공유/사진과001의 기존 이력은 별도 hash 대조에서 불변이었다.

여러 줄 편집 거절의 원인 안내(D1)와 개인공간 저장 중 연속 조작 안내(D2)는 [후속 수정·격리 재검사](alpha-m7-2-delegated-trial-20260924.md#924-후속--d1d2-수정과-격리-재검사)에서 처리했다. 기존 항목 연결 보호와 입력 보관은 유지한다. 가짜 계정/서버를 사용하는 실제 앱 브라우저30항목, 편집 안내 다섯 화면 크기, npm2255·전체 통합2463·타입·build·문서 검사가 통과했다. 실제 계정의 추가 자료 변경은 없다. 다음 기술 범위는 제작·커뮤니티·자료실 하위 화면의 유사 저장 대기 경로다. 실제 일상 사용·실기기·독립 매체·계정 전체 복원을 수행했다고 세지 않으며 M7-2 전체는 미완료다. 이 아래의 blocked/입력 대기 문구는 이번 사용자 위임 이전 이력이다.

## 9/24 재개 — 사용자 위임에 따른001 대리 시험

사용자가 입력 대기 안내 뒤 “너가 테스트해줘봐..”라고 요청했다. 앞서 안내한001의 소량 일정/메모 시험을 에이전트가 대신 조작한다. 같은 범위의 입력 대기는 해소한다. 기존 ‘실계정을 합성 QA로 자동 재사용하지 않음’ 원칙을 일반적으로 해제하지 않고, **이번001의 명시한 검증용 항목**에만 한정한다. 과거 A/B fixture 생성·초기화·정리 스크립트는 실행하지 않는다.

순서는 현재001의 서명 백업/동일 상태 preview → 검증용으로 표시한 소량 문서·할 일·폴더 생성 → 날짜/폴더/완료/다시 열기/Undo·reload → 독립 브라우저 세션 대조·다섯 화면 → 백업/복원 차이 검토다. 002의 콘텐츠·공유 자료·운영계는 변경하지 않는다. 계정 전체 복원은 차이가 이번 검증용 자료에만 한정됨을 확인한 경우에만 시험하며, 사용자 동시 변경을 발견하면 적용하지 않는다. 생성한 항목의 identity와 전후 상태를 기록하고 임의의 기존 자료를 삭제하지 않는다.

시험 문구는 실제 사용자의 일정·경험을 꾸민 원문이 아니라 ‘검증용’으로 표시한 대리 시험 자료다. 결과도 에이전트 대리 기능 검사로 기록하고 실제 일상 사용·실기기·관찰 사용자 성공으로 바꾸지 않는다. 새 관찰 사용자 수는0명으로 유지한다. 첫 보존 백업은 Git 밖 기존 사용자 폴더에 새 파일로 생성했고001 r427·개인 문서/실행 사본0·이력427·첨부0, 서버 동일 상태 preview와 파일 재읽기 hash 일치를 확인했다. 구체적인 실행 결과는 아래에 추가한다. 아래 입력 대기 판정은 이 요청 이전 이력이다.

## 9/24 현재 — 실자료 선택 입력 대기

오픽 연결, 백업 로컬 계산 개선, 사전 백업 도구 연결은 완료한 기술 진척으로 유지한다. `flow-release-readiness`의 구현/QA/실제 사용 구분으로 전체 목표를 대조했다. 소량 시험에 사용할 **001의 실제 일정 또는 메모가 아직 확인되지 않아 M7-2는 미완료**다. 백업 위치나 이미 승인된 오픽 연결을 다시 승인받기 위한 대기가 아니다.

`current command`: 개발계 두 실제 계정을 QA 계정과 분리해 원문 없이 개수·판본만 조회했다. r75와 r427은 모두 개인 문서0·저장 실행 사본0이다. 이는 별도 영역에 보존한 002의 자료실177Flow/26Map·제작 사본을 없다고 판정하는 검사가 아니다. 로컬 `/alpha`는 HTTP200, HEAD `efd8b642`, staged0이며 새 앱·DB·자격 정보 변경이나 실제 계정 로그인은 하지 않았다. 조회 근거는 로컬 전용 `output/alpha-m72-real-trial-readiness-20260924.json`이다.

| 목표 항목 | 현재 근거와 판정 |
| --- | --- |
| M7-1/작업 공간/기존 원본 기준선 | 준비 원장·현재 Git·현재 계정 개수 조회를 대조함. 기존 dirty/미추적 자료 보존 |
| 선택된 기존 콘텐츠 반입·원문/identity·중복0 | [전체 반입 원장](alpha-m7-2-full-catalog.md)의 실제002 반입과 원문 대조 근거. 전체 보존과13개 편집 지원을 구분 |
| 실제 개인 자료의 작성·일상 변경 | 현재 개인 문서/실행 사본0. 자동 생성한 QA를 실자료로 대신하지 않음. 시험 대상 선택/저장 필요 |
| 백업·독립 사본·명시 복원 | 실제 시작 백업과 서버 preview는 이전 근거. 사용자 자료의 명시 복원과 독립 사본은 미실행. 보관 위치 미선정은 개발/소량 사용의 차단 조건이 아님 |
| 독립 세션·가능한 실제 기기 | 별도 QA 세션 근거는 있으나 실제 기기 미지정/미실행. 자동 브라우저 검사를 실제 기기로 세지 않음 |
| 안전·보고·배포 | 원본·실계정에 새 쓰기0, 운영계·발행·배포0, 관찰 사용자0. 손상/소유자/취소/복원 경계의 기술 근거는 기존 원장으로 연결 |

두 후속 구현 차례 동안 같은 실자료 선택이 미확인 상태였고 이번 세 번째 연속 대조에서도 대상이 없다. 직전 차례는 코드/QA 진척이며, 이번 조회·판정 정리만으로 제품 구현이 더 완료됐다고 세지 않는다. 다음 실제 사용/복원은 임의의 자료를 만들거나 복원 대상을 대신 정해 실행할 수 없다. 원격 지연·반복 안정성 및 미연결 콘텐츠는 잔여로 유지하지만, 추가 합성 QA나 새로운 저장 구조 연구를 실제 사용의 대체 완료 조건으로 늘리지 않는다. 현재 자동 목표 실행은 **입력 대기(`blocked`)**로 정리하며 목표 자체나 완료 기준은 유지한다.

재개에 필요한 첫 행동은 `http://localhost:3104/alpha`의001 계정에 실제 사용할 일정/메모 한 개를 저장하고 식별 가능한 제목만 알려주는 것이다. 본문·비밀번호 공개는 필요 없다. 이미 저장했거나 다른 실제 자료를 쓰려는 경우에도 대상만 확인하면 이어서 진행한다. 실제 기기·복원 시점은 해당 단계 직전에 확인한다. 기존 질문을 새로 반복 발송하지 않는다.

이번 변경은 이 원장·STATUS와 개인정보 없는 로컬 조회 근거뿐이다. 이전 npm2255·표적59·타입 결과는 이전 실행으로 구분하며 이번에 다시 실행하지 않았다. 앱/runtime·의존성·UI 변경이 없어 새 build/브라우저/보안 검사를 수행하지 않았다. 보안·성능·출시 준비 완료 판정은 아니다. commit/push/PR/merge/Preview/Production 모두 미실행.

## 9/24 후속 — 실자료 사전 백업 도구의 파일 경로 일치

오픽 연결/로컬 계산 개선 뒤의 실행이다. 직전 차례는 구현·검증 진척으로 분류하며, 이번에는 T02/T04에 쓰는 [실계정 백업 도구](../../../scripts/alpha/m72-capture-account-backup.ts)를 앱과 같은 `checked-file-v1` 응답에 연결했다. 기존 도구만 큰 legacy 원문을 받은 뒤 다시 압축하고 있었다. 앱·서버·DB·저장 형식·한도·30초 요청 제한은 변경하지 않았다.

파일 reader가 owner·압축/원문 무결성을 검사한 뒤 펼친 원문의 검사 결과를 유지한다. 서버 preview에는 받은 파일을 그대로 전달하고, `sourceSha256`를 **원문 hash**와 비교한다. 파일 hash를 원문 hash로 오인하지 않는다. 서버 seal·현재 revision·같은 상태/적용 불가 검사를 통과해야 결과를 반환하며, 받은 파일 그대로 새 파일(`wx`)에 저장하고 동기화·재읽기/파일 및 원문 hash 대조를 한다. 기존 legacy 응답 호환과 자기 세션만 로그아웃하는 경계는 유지한다. 복원 적용·자료 쓰기·기존 파일 덮어쓰기 경로를 추가하지 않았다.

파일을 다시 만드는 동작은 preview/저장 경로에서 제거했다. 다만 오프라인 검사기의 복원 요청 크기 계산은 escape-heavy 원문에서 압축 비용을 계산할 수 있으므로, 모든 내부 검증의 재압축이0이라고 주장하지 않는다. 원격 읽기 지연 해결이나 실제 자료 복원 완료를 뜻하지도 않는다.

| 검사 | 이번 실행 결과 |
| --- | --- |
| 변경 전 연결 계약 | 신규 파일 경로 검사1개 실패: legacy 요청에는 `format`이 없었음. 실제 사용자 자료 손상이나 서버 장애 재현은 아님 |
| 도구 단위 |24/24 통과, 신규7 포함. 받은 파일/비정규 공백 원문 보존, 손상/형식/잘림 거절, 파일·원문 hash 혼동 거절, 서버 preview 필수 |
| 관련 표적 |59/59 통과. 위24와 오프라인 파일 안정성/형식·다운로드·전송 검사 포함, 중복 합산하지 않음 |
| 타입 |수정 도구와 테스트2진입점 strict 진단0 |
| npm test |2255/2255, 실패/skip/cancel0·실행 중 Program 소스 변경0. 신규 도구 테스트는 위 표적으로 별도 실행 |
| 실제 DEV QA |기존 합성 QA r26에서2회 시도: 첫 실행 미완료, 두 번째 백업/서버 같은 상태 preview/자기 세션 logout 성공. 실제001/002 로그인0·복원0·자료 쓰기0·파일 보관0 |
| 자료 불변 |DEV8범위 전후 row hash/개수 동일. 실제2계정·이력502, QA 포함3계정·이력528, 공개1·사진8·보관0·보존 사진0 |
| 앱·빌드·브라우저 |이번 앱 소스 변경0. 직전 build 기록의597소스와 현재 hash 일치. 이번에는 build/통합2452/브라우저를 재실행하지 않았으며 이전 실적으로 구분 |

성공 실행은 파일2,350,495bytes → 원문19,328,262bytes, 현재r26과 server preview 일치를 확인했다. HTTP 응답 헤더까지 로그인653ms·백업21,656ms·preview16,989ms·자기 세션 종료420ms였다. 전체 검증/본문 처리 시간을 포함한 UI 성능 수치는 아니다. 최초 실패는 로그인HTTP200과 자기 세션 종료HTTP204만 기록됐고 백업 응답/오류 종류가 남지 않아 원인을 시간 초과로 단정하지 않는다. 재시도에서 각 요청의 오류 종류와 시간을 수집하도록 진단을 보완했다. 1회 성공으로 반복 안정성을 통과 처리하지 않는다.

이 실제 QA는 수정 함수의 메모리 결과까지 검사한 것이다. CLI의 새 파일 저장·Windows ACL·실제 계정 로그인/복원·실기기 검사를 이번에 다시 했다는 뜻은 아니다. 독립 읽기 전용 코드 검토에서 새 P1/P2는 발견되지 않았다. 로컬 전용 근거: `output/alpha-m72-capture-file-closeout.json`, `output/integrated-product-poc/npm-test-2026-09-24T00-12-25-106Z.json`.

변경 범위는 위 도구·[테스트](../../../scripts/alpha/m72-capture-account-backup.test.ts)와 이 원장·STATUS다. 실제001의 일정/메모 선택, 실제 자료의 명시 복원, 실제 기기와 독립 사본 확인은 여전히 미실행이다. 백업 보관 위치 미선정으로 기술 작업을 차단하지 않는다. 기존 질문은 반복하지 않으며, 선택되지 않은 실제 자료를 임의 생성하지 않는다. commit/push/PR/merge/Preview/Production 미실행, 관찰 사용자0명. M7-2 전체는 진행 중이다.

## 9/24 후속 — 백업 보관 위치와 개발 진행 분리

사용자는 백업 위치를 각 사용자가 정하면 된다고 확인했고 후속 오픽2개 연결은 계속 진행하라고 지시했다. 백업 파일 생성·다운로드·검증·복원은 제품의 책임이며, 내려받은 파일의 보관 위치는 사용자 선택이다. 독립 매체는 손실 대비 권장 사항이지 기능 개발·별도 QA·소량 테스트 사용의 필수 선행 조건이 아니다. 아래의 전체 진행 입력 대기 판정은 이 후속으로 해소하며, 특정 외장 폴더 지정을 다시 요구하지 않는다.

실제 계정의 자료를 덮어쓰는 복원 시험에는 현재 상태 백업과 적용 대상/차이에 대한 사용자 확인을 유지한다. 별도 QA 계정의 합성 복원 시험과 구분한다. T02 독립 사본·T05 실기기 미실행은 사실대로 남기되 다른 개발 작업을 막거나 수행한 것으로 바꾸지 않는다. 오픽 연결은 [W3-3/4 실행 기록](alpha-m7-2-catalog-wave3.md)을 따른다. 아래는 이전 시점의 판정 기록이다.

같은 날 후속 실행에서 오픽2개·19행을 연결해 지원13Flow·103항목이 됐다. 별도 QA 계정으로 편집/저장·개인 일정·Undo/Redo·서명 백업·명시 복원과 복원 후 새 로그인 내용 일치를 확인했다. 이후 읽기 제한/자동 읽기 병행을 보완해 복원 뒤 새 백업 API13/13·실제 UI38/38·같은 파일의 다섯 크기 추가62/62도 통과했다. 보호 실제2계정·이력502개·공개/사진은 최종 UI 뒤 재대조에서도 전후 hash 동일하다. 이 합성 복원을 실제 사용자 T04 완료로 대체하지 않는다. 큰 자료의 처리 지연·장기 안정성은 남으며 상세 판정·다음 개선 순서는 위 W3-3/4 원장에만 유지한다. 원본177Flow/26Map 전체 보존을 모든 콘텐츠 편집 지원으로 세지 않는다. 남은164Flow/Map은 제품 연결 범위의 잔여이고, 제한 실자료 시험의 실기기·실자료 일상 사용/명시 복원과 구분한다.

## 9/24 이전 판정 — 완료 조건 대조와 입력 대기

M7-2는 **미완료이며 다음 실행은 사용자 입력 대기**다. 목표와 T01–T06을 축소하거나 완료 기준에서 실자료·독립 사본·명시 복원을 지우지 않는다. 이전에 승인된 compact 이력 DEV 적용·별도 QA 검증·로컬 앱 재시작은 완료 상태를 유지한다. 그 승인을 새 오픽 migration 승인으로 확대하지 않는다.

| 요구 | 확인된 범위 | 남은 실행과 재개 조건 |
| --- | --- | --- |
| 원본 보존·콘텐츠 반입 | 기존 원장의 실제 반입 근거와 보관 파일 검사에서 177Flow·957Item·371구간·26Map·별도 판본2개 확인 | 보존·열람을 모든 구조의 편집·실행 연결 완료로 세지 않음 |
| 편집·개인 실행 연결 | 현재 지원11개·84항목. 오픽2개·19항목은 모델/캘린더 준비와 서버 후보 로컬 검사까지 완료 | [W3-3](alpha-m7-2-catalog-wave3.md)의 새 DEV 적용/별도 QA 범위 답변 후 서버 계약 확인→reader/capability 일괄 연결→실제 QA·5개 화면 검사. 나머지166개와 Map 연결도 미완료로 유지 |
| T02 독립 사본 | 두 계정의 1차 백업과 읽기 검사 도구 준비·경합 결함 수정 완료 | 외장 USB/SSD의 정확한 폴더 또는 다른 기기와 전달 방법 지정. C:/D:는 같은 Disk0이므로 대체 불가 |
| T03 새 일상 자료 | 002의 이전 콘텐츠 보존 완료. 001 보관 파일에는 개인 문서0 | 사용자가 실제로 쓸 개인 일정/메모와 제작 원문 선택. 자동 생성한 시험 자료를 실사용으로 집계하지 않음 |
| T04 명시 복원 | 파일 검사·현재/이후 범위 비교·서버 preview 절차와 QA 근거 준비 | 독립 사본 확보 후 현재 상태를 새로 백업하고 복원 대상/차이를 확인해 명시 적용. 실계정을 비우거나 과거 r74를 자동 선택하지 않음 |
| T05 실제 기기 | PC 독립 세션 근거와 Android USB 접속 후보 존재 | 실제 기기 선택/연결 후 검사. Android/iOS 모두 실기기 미실행 |
| T06 종료 | 요구별 판정과 증거 구분을 이 원장에 유지 | 위 미실행을 실제로 마친 뒤 종료 판정. 관찰 사용자0명 유지 |

### 이번 대조의 근거와 한계

- `current command`: 세션 시작 보고서와 직접 Git 확인에서 branch `agent/alpha-m1-persistence-20260921`, HEAD `efd8b642`, upstream 없음, modified59/untracked87, staged0. 기존 변경은 정리·stage하지 않았다. 디스크 조회에서도 C:/D: 모두 Disk0이며 다른 로컬 디스크는 발견되지 않았다. 다른 PC/네트워크 보관처가 없다는 뜻은 아니다.
- `current command`와 `prior artifact`: 직전 npm 실행 기록의586개 소스를 현재 파일 hash와 대조해 변경/누락0을 확인했다. 백업 검사기와 신규 검사 파일 hash도 직전 근거와 같다. 기록의 npm2255/2255·실패/skip/cancel0, 백업 표적26/26, W3-3 로컬 DB9/9를 확인했으며 **이번 턴에 다시 실행한 테스트 수로 더하지 않는다**.
- `prior artifact`: 보관 파일 검사2개는 모두 성공이지만 `copy=not-provided`, `independentStorage=not-verified`, `serverSeal=format-only-not-authenticated`다. r427/r75는 파일 속 판본이며 이번 현재 서버 조회 결과가 아니다. 실계정 로그인·복사·복원·원격 DB 변경0이다.
- `current repo`: [W3-3 순서](alpha-m7-2-catalog-wave3.md)는 지정 DEV 계약 확인 뒤 공용 reader와 capability를 함께 연결한다. 현재 v3는 비활성이며 SQL 후보만으로 앱 반입 성공을 주장하지 않는다.
- `assumption`: 선택되지 않은 실제 자료·다른 기기·백업 위치는 추정하지 않았다. 새 checkpoint 저장 형식의 추가 연구는 T04의 선행 조건이 아니며 입력 대기를 피하기 위한 별도 과제로 늘리지 않는다. 저장 비용·모든 writer·미연결 콘텐츠의 잔여 결함도 해결된 것으로 바꾸지 않는다.

연속 세 차례의 목표 실행에서 같은 독립 사본/실자료 선택과 새 원격 범위 확인이 미해결이었다. 그동안 서버 후보 준비와 백업 검사 결함 수정까지 수행했고, 이제 계획된 다음 실제 실행에 필요한 권한·대상은 로컬 검사로 대신할 수 없다. 따라서 자동 목표 실행은 `blocked`로 정리하며, **제품 완성이나 목표 완료 판정은 아니다**. 기존 질문을 반복 발송하지 않는다.

재개에 필요한 답은 우선 두 가지다: (1) 독립 백업 매체와 정확한 경로/전달 방법, (2) 이미 요청한 오픽2개 DEV 연결·별도 QA·로컬 앱 갱신 범위에 대한 답변. 둘 중 하나가 확인되면 해당 작업부터 재개할 수 있다. 실제 일정/원문과 기기는 해당 시험 직전에 사용자가 선택한다. 배포·신규 유료 설정·실계정 합성 QA 재사용은 승인 범위에 넣지 않는다.

이번 수정은 이 원장과 STATUS의 판정 정리뿐이다. `flow-release-readiness`의 구현/QA/실사용 구분과 `flow-direction-capture`·`flow-work-closeout` 절차를 적용했다. 앱·모델·SQL·백업 파일·자격 정보는 수정하지 않았고 새 npm/build/보안/브라우저 실행은 하지 않았다. 서비스 출시 준비 완료를 주장하지 않는다. commit/push/PR/merge/Preview/Production 미실행.

## 9/24 후속 — 백업 검사 중 파일 교체·수정 탐지

오픽2개에 대한 새 DEV 적용 범위의 답변을 기다리는 동안 T02 사전 보존 도구를 검토했다. 이미 완료한 세 승인 작업을 다시 대기 상태로 바꾸지 않는다. 독립 매체·경로 질문도 반복하지 않았다. 이번 범위는 명시한 파일의 읽기 전용 검사이며 DB·앱 저장·복원·외부 복사를 실행하지 않았다.

### 재현과 수정

기존 도구는 파일을 읽은 직후 크기/시각을 확인하고 핸들을 닫았다. 그 뒤 payload 무결성을 계산하는 동안 원본 파일이 수정·같은 bytes의 새 파일로 교체·삭제되어도 앞서 읽은 값으로 사본 일치 성공을 반환할 수 있었다. 수정 전 Windows 임시 파일에서 세 경우를 재현했고 신규 검사3개가 모두 실패했다. 이 실패는 합성 파일의 stale 판정을 확인한 것이며 실제 보관 백업 손상을 뜻하지 않는다.

[검사기](../../../scripts/alpha/m7-personal-backup-check.ts)는 이제 내용 검사와 사본 읽기가 끝날 때까지 파일 핸들을 유지한다. 읽은 직후와 성공 반환 직전에 핸들/지정 경로의 device·inode·크기·수정 시각·상태 변경 시각 및 실제 경로를 대조한다. 변경·삭제·연결 대상 교체는 `file-changed`로 거절하며 성공/실패 모두 핸들을 닫는다. 30MB 한도·서명 미인증·독립 매체 미확인·개인정보 미출력과 원본 읽기 전용 경계는 그대로다.

[Node24 공식 파일 API](https://nodejs.org/docs/latest-v24.x/api/fs.html#filehandlestatoptions)의 descriptor stat과 BigInt 시각을 사용했다. **검사 중 관측한 변경을 탐지하는 것이며 파일을 잠그거나 반환 이후의 불변을 보장하지 않는다.** 파일시스템의 metadata 정밀도·캐시 일관성에 영향을 받는다. 네트워크 공유·악의적인 파일시스템·권한 있는 공격자의 시각 조작을 방어했다고 주장하지 않는다.

### 실행 결과

| 항목 | 이번 결과 |
| --- | --- |
| 최초 실패 재현 | 신규3/3 실패. 원본 수정·동일 bytes 교체·삭제 뒤 기존 함수가 성공을 반환함 |
| 최종 오프라인 검사 |26/26 통과(기존20+신규6), 실패/skip/cancel0. 기존 형식·압축 파일·owner·손상/한도·하드링크 거절 회귀 포함 |
| 신규 Windows 파일 검사 | 수정·교체·삭제, 같은 크기의 한 바이트 변경, directory junction 별칭/대상 교체, 특수 장치 NUL 거절. hash 함수의 호출 시점만 고정하고 실제 파일을 변경했으며 stat 결과는 가짜로 만들지 않음 |
| 타입 | 검사기·기존 검사·신규 검사3진입점 strict 진단0 |
| npm test |2255/2255 통과, 실패/skip/cancel0·Program 소스 실행 중 변경0 |
| 실제 보관 파일 |001 r427·002 r75 파일을 읽기만 해서 다시 통과. 아래 표의 크기·개수·요청 크기 및 SHA256과 일치. 파일 hash는 읽기 전후 모두 동일 |
| 전체 통합·빌드·브라우저 |이번에는 재실행하지 않음. 앱/공용 모델/SQL/UI 변경이 없는 오프라인 도구 수정. 과거 결과를 이번 실행 수로 집계하지 않음 |

독립 읽기 전용 검토에서 두 코드 파일의 P1/P2 지적은 없었다. 시험이 만든 임시 파일과 junction만 시험 종료 시 제거했다. 사용자의 원본·사본은 수정/이동/삭제하지 않았다. 실제 보관 파일에는 첨부가 없고 이번 로그인·서버 seal 확인·독립 사본·실제 복원 적용은0이다. Windows 파일시스템 시험은 Android/iOS 기기 검사나 관찰 사용자 검증이 아니다.

로컬 전용 근거: `output/alpha-m72-file-stability-before.log`, `output/alpha-m72-file-stability-targeted.log`, `output/alpha-m72-file-stability-types.log`, `output/alpha-m72-file-stability-user-check.json`, `output/alpha-m72-file-stability-creator-check.json`, `output/integrated-product-poc/npm-test-2026-09-23T19-18-07-930Z.json`.

변경은 [검사기](../../../scripts/alpha/m7-personal-backup-check.ts)·[신규 검사](../../../scripts/alpha/m7-personal-backup-file-stability.test.ts)·이 원장·[STATUS](../../STATUS.md)의4파일이다. `flow-direction-capture`와 `flow-work-closeout` 절차로 기존 원장에만 범위/증거를 추가하며 새 제품 정책이나 별도 로드맵을 만들지 않았다. M7-2 전체는 진행 중이다. 독립 사본 위치·선택 자료의 명시 복원·일상 자료 작성·실제 기기 확인은 여전히 남는다. commit 없음 / push 없음 / PR 없음 / merge 없음 / Preview 없음 / Production 없음 / 관찰 사용자0명.

## 9/24 후속 — 실자료 복원에 필요한 사본과 대상 재확인

새 서버 checkpoint 후보의 비용/보관 검토는 [별도 구현 원장](alpha-m7-2-compact-inverse.md)을 따른다. **그 후보의 활성화는 기존 백업 파일을 이용하는 T04 복원의 선행 조건이 아니다.** 반대로 새 후보의 SQL/자동 검사 통과가 독립 사본·실자료 복원을 대신하지도 않는다. 실제 자료 시험과 저장 구조 개선을 구분해 진행한다.

이번에는 아래에 이미 지정된 두 파일만 읽기 전용으로 재검사했다. 두 원본의 SHA-256이 읽기 전후 동일했고 기존 기록과도 일치했다. 새 계정 로그인·원격 DB/Storage·앱 writer·파일 복사·복원은 실행하지 않았다. 이메일/계정 UUID는 파일에서 출력하지 않았으며 현재 로그인과의 owner 일치·서버 seal은 이번 오프라인 검사 범위가 아니다.

| 보관 파일 | 이번 확인 | 이 결과만으로 증명하지 않는 것 |
| --- | --- | --- |
|001 시작 백업, r427|5,715,800bytes, 개인 문서/제작 초안/자료실/사진0, 과거 operations427. 복원 요청5,852,129bytes. SHA-256 `4014f3046a1953270b6b9898cd30a8c74dee4ef4694d410778bfdcdcf5430436`|새 개인 일정·메모의 일상 사용 또는 복원 성공. 빈 자료 백업을 새 실사용 원문으로 세지 않는다. |
|002 전체 반입 후 백업, r75|1,667,451bytes. Flow177·Item957·단계371·Map26·별도 판본2·제작 초안2·작업본1·사진0. 복원 요청12,560,771bytes. SHA-256 `df852d4c3f68412bab812ac0d605e5981bac1da7234e0ca7906b39ebd0dc4a38`|현재 서버도 r75라는 주장, 현재 권한/서명 재확인, 실제 덮어쓰기 복원, 전체177개 편집 연결. |

근거는 로컬 전용 `output/alpha-m72-cost-user-backup-check.json`, `output/alpha-m72-cost-creator-backup-check.json`이다. 위 판본은 보관 파일의 판본이며 현재 서버 판본을 조회하지 않았다. 두 파일 모두 이번 파일 무결성/복원 요청 한도 검사 통과이며 `copy=not-provided`, `independentStorage=not-verified`, `serverSeal=format-only-not-authenticated`다.

### 실제 복원을 재개할 순서

1. **독립 매체 지정**: 외장 USB/SSD의 정확한 드라이브·폴더 또는 다른 PC/기기와 전달 방법을 사용자가 정한다. 현재 재조회에서도 C:와 D:는 같은 Disk0이고 다른 로컬 디스크는 없었다. 외부 매체로 자동 업로드하거나 기존 파일을 덮어쓰지 않는다.
2. **현재 상태 보존**: 실행 직전에 선택 계정/로그인 owner를 확인하고 새 현재 백업을 만든다. 위 보관 파일을 자동으로 ‘최신’이라고 취급하지 않는다. 현재 백업과 선택한 복원 파일의 사본을 독립 매체에 보관하고 원본/사본의 byte 일치를 검사한다. 다른 경로나 디스크 문자만으로 물리적 독립을 통과시키지 않는다.
3. **대상과 차이 확인**: 같은 계정의 서버 미리보기에서 현재/복원 후 원문·콘텐츠 범위·사진·서명·현재 권한을 다시 확인한다. 002의 전체 반입 전 r74 파일은 자료실177개를 없애는 상태이므로 시험 편의상 자동 선택하지 않는다. 같은 상태의 `no-change`도 실제 복원 적용으로 집계하지 않는다.
4. **명시 적용**: 사용자가 선택한 시점과 바뀔 범위가 맞을 때만 현재 revision/CAS와 원래 요청 ID를 사용해 적용한다. 시험 건수를 만들려고 실제 계정을 비우거나 합성 개인정보를 주입하지 않는다. 응답이 불명확하면 새 요청을 중복 생성하지 않고 기존 receipt를 확인한다.
5. **복원 후 대조**: 개인 원문/identity/콘텐츠/날짜·폴더·완료 기록을 선택 파일과 비교하고, 현재 서버 판본/요청 이력과 공개 상태가 기존 계약대로 유지되는지 확인한다. 첨부가 없는 선택 범위는 사진 실자료 검사를 해당 없음으로 표시한다. 실제 첨부 시험이 필요하면 사용자가 고른 비민감 사진과 별도 사본을 사용한다.
6. **독립 세션·기기·일상 사용**: 다른 브라우저 세션의 재열기와 실제 기기 검사를 나누어 기록한다. 001의 최소 개인 일정/메모와 제작 원문은 사용자가 실제로 사용할 내용이어야 한다. 자동 생성한 테스트 제목으로 이 조건을 충족했다고 하지 않는다.

이번에 독립 매체와 경로를 사용자에게 질문했다. 답변 전에도 비용 측정·기존 콘텐츠 연결 등 안전한 로컬 작업은 진행할 수 있다. M7-2 전체 목표는 유지하며 T02 독립 사본·T04 실제 복원·T05 실제 기기·T06 종료는 미완료다. 기존 승인 세 건을 재승인 조건으로 되돌리지 않는다.

이번 파일/디스크 사전 확인은 UI 검사가 아니며 실제 Android Chrome·iOS Safari·관찰 사용자 검증을 하지 않았다. 원본 수정·운영 데이터 변경·commit·push·PR·merge·Preview·Production 모두0이다.

아래는 이전 단계의 실행 이력이다.

9/23 현재: **기존 콘텐츠 전체의 비공개 보존·열람 완료, 전체 편집·실행 연결은 미완료**. [전체 반입·판정·잔여](alpha-m7-2-full-catalog.md): 002에 Flow177·Item957·구간371·Map26 및 현재 다른 판본2개를 원본 구조로 보존했다. 계정 r74→75 명령1건, 001·기존 제작 사본2개·개인 기록·공유 자료 불변. 표적70/70·통합2188/2188·npm2255/2255·빌드/타입 통과, 실제 브라우저34/34 및 독립 재검사37/37·다섯 해상도 확인. 반입 후 압축 백업1.67MB와 서버 preview 검증을 마쳤다. 다음은 반복·기간·표·Map 의미를 유지한 편집/개인 실행 사본 연결이며, 독립 사본·실제 복원·일상 사용·실기기와 M7-2 전체는 남는다. 공개·배포는 하지 않았다. 아래는 이전 단계 이력이다.

## 9/24 후속 — 복원 전 자료 범위 비교

승인한 세 작업(DEV 이력 개선·별도 QA 계정 시험·로컬 앱 재시작)은 [승인 실행 원장](alpha-m7-2-compact-inverse.md)에서 완료했다. 이어 독립 사본 선택 전에 가능한 준비를 점검하면서, 백업에 자료실 콘텐츠가 있어도 화면/검사 요약이 문서0·실행 Flow0만 보여주는 갭을 수정했다. M7-2 전체 완료로 올리지는 않는다.

### 구현 범위와 안전 경계

- [개수 요약](../../../lib/flow/integrated-poc/alpha-preservation/content-summary.ts)은 검증된 공간에서 숫자만 계산한다. 텍스트 문서·문서 Flow·실행 사본·제작 초안·작업본·자료실 Flow/Item/단계/Map/별도 판본을 분리한다. 원문이나 제목은 출력하지 않으며, 서로 겹칠 수 있는 범주를 합계로 더하지 않는다.
- [서버 미리보기](../../../lib/flow/integrated-poc/alpha-server/preservation-handler.ts)는 현재/적용 후 개수를 전달하고, [화면](../../../components/flow/integrated-poc/AlphaPreservationPanel.tsx)은 두 열로 비교한다. 옛 백업의 자료실이 비어 있으면 현재177→복원 후0이 드러난다. 같은 개수는 같은 내용이라는 뜻이 아니며 완료·날짜·폴더도 복원됨을 표시한다.
- 이전 서버 응답이나 잘못된 개수는0으로 추정하지 않고 새 적용을 막는다. 이미 전송돼 결과가 불명확한 요청은 원래 ID로 조회/재시도하는 기존 복구 경로를 유지한다. DB migration·저장 schema·파일 backup schema·한도·권한은 변경하지 않았다.
- [오프라인 검사](../../../scripts/alpha/m7-personal-backup-check.ts)에도 같은 개수를 추가했다. 무결성 검사 통과와 서버 서명 인증·독립 매체 확보를 구분하는 기존 경계는 유지한다.

### 이번 실행 결과

| 검사 | 결과와 범위 |
| --- | --- |
| 표적 테스트 |69/69: 요약4·서버17·화면28·오프라인20. 마지막 타입 검사에서 테스트의 제목 접근 경로1건을 바로잡았고 해당20/20 재실행 통과. 별도 성공 개수로 중복 합산하지 않음 |
| 기존 회귀 |`npm test` 2255/2255,15개 실행 묶음 합산. 전체 통합2293검사는 이번에 재실행하지 않았으며 과거 결과를 현재 결과로 더하지 않음 |
| 타입·빌드 |Program511entry 진단0·source571개 실행 중 변화0. 스크립트4entry 추가 검사 진단0. production build PASS |
| 격리 실제 컴포넌트 |[브라우저 검사](../../../scripts/alpha/m72-backup-summary-browser.ts)87/87. 자료실 포함·옛 빈 백업·비교 누락3시나리오×5화면. 합성 미리보기이며 실제 서버/실기기 결과 아님 |
| 실제 DEV API |[읽기 전용 QA 검사](../../../scripts/alpha/m72-backup-summary-live.ts)10/10. 기존에 승인해 만든 별도 QA 계정만 로그인, 백업→same-state 미리보기→다시 백업. r9/operations9 유지, account/operations/references/importArchives/files 정확 동일. 적용0·실제001/002 접근0, QA 로그아웃 완료 |
| 보관 실자료 백업 |002의 기존r75 파일1,667,451bytes 읽기 검사 PASS. Flow177·Item957·단계371·Map26·별도 판본2·제작 초안2·작업본1. 파일 SHA256 `df852d4c3f68412bab812ac0d605e5981bac1da7234e0ca7906b39ebd0dc4a38` 전후 동일. 원본 수정/복원/업로드0 |

로컬 전용 증거: `output/alpha-m72-backup-summary-targeted.log`, `output/alpha-m72-backup-summary-npm-test.log`, `output/alpha-m72-backup-summary-build.log`, `output/alpha-m72-backup-summary-typecheck.log`, `output/playwright/alpha-m72-backup-summary/2026-09-23T15-47-19-281Z/result.json`, `output/alpha-m72-backup-summary-live/2026-09-23T15-47-26-692Z/result.json`. 경로 시각은 UTC이며 이 기록 날짜는 한국 시각이다. 원문/자격증명은 증거에 담지 않았다.

### 화면 평가와 UX 검토

390×844·375×812·844×390·1024×768·1440×900에서 가로 넘침0, 콘솔/page error0. 표의 모든 행과 복원 행동은 세로 스크롤로 접근하며 좁은 가로 화면에서 한 화면에 다 보인다는 판정은 하지 않는다. 키보드 Space 확인→Tab 복원 버튼 이동·높이48px/화면 내 노출, 취소·Escape·열기 버튼 포커스 복귀를 확인했다. 검사 중 실제 적용/로컬 저장 mutation0, 운영 `flow:sentinel` 값 불변. 전체 운영 `flow:*` 검사를 이번 합성 검사로 대신하지 않는다.

UX 검토는 복원 판단에 필요한 현재/이후 범위와 덮어쓰기 결과를 우선했다. 중복 ‘문서/기존 Flow’ 한 줄은 표로 대체하고 새 탭·카드·추가 확인 단계는 만들지 않았다. 정보량과 세로 스크롤은 남는 부담이다. 사진 개수·개별 내용 diff를 모두 이 표가 보여준다는 뜻은 아니며 기존 무결성/서명/사진 검사를 유지한다. 실 Android Chrome·iOS Safari·소프트웨어 키보드 미실행, 관찰 사용자0명이다.

### 독립 사본·잔여

읽기 전용 디스크 조회에서 C:와 D:는 모두 Disk0의 서로 다른 partition임을 확인했다. C:로 사본을 옮겨도 독립 디스크 백업으로 세지 않는다. 외장 저장장치·다른 PC/기기의 실제 대상은 아직 미지정이다. 자동 복사/외부 업로드/암호화 설정은 실행하지 않았다. 사용자에게 매체와 경로를 질문했고, 지정 후 정확한 파일 사본→byte 비교→선택된 실자료의 명시 복원 순서로 이어간다.

실자료 복원·독립 사본·실기기/일상 사용·미연결166Flow/Map·누적 용량 보장은 남는다. 이번 변경은12개 코드/테스트 파일과 이 원장·STATUS이며 commit/push/PR/merge/Preview/Production은 미실행이다. 원래 운영 프로젝트·기존 `/my`·실사용 계정에 새 쓰기는 없다.

종료 확인: 로컬 앱 재시작 후 `/alpha` HTTP200·script20/20 HTTP200. 문서 검사4/4·6513링크·skill sync PASS, scoped closeout 및 별도 읽기 전용 코드 재검토에서 새 blocking 결함 없음. closeout은 미추적 상위 폴더를 축약하므로12개 코드 파일은 별도로 검토했다. HEAD `efd8b642` 유지, staged0. 백업 위치 선택 대기는 실제 복원에만 적용하며 준비 작업을 완료로 속여 M7-2 전체를 닫지 않는다.

## 목표와 이전 단계

[M7-1 안전성·운영 준비](alpha-m7-1-readiness.md)를 이어, 사용자가 선택한 소량의 개인 자료로 작성/이관 → 일상 변경 → 백업 → 복원 → 기기 간 확인을 수행한다. 합성 QA를 반복해서 실자료 시험으로 집계하지 않는다. 단계 전체 순서는 [알파 전환 원장](alpha-transition.md)을 따른다.

이번 요청은 M7-2 진행 승인이다. 후속 대화에서 사용자가 두 계정의 시험 역할과 두 번째 이메일 주소를 확인했다. 실제 계정 UUID와 상태는 접근 전에 검증하며, 이전 QA 기록만으로 자료 귀속을 추정하지 않는다. 기존 원본·미소유 dirty 파일을 수정하거나 지우지 않는다. commit/push/PR/merge, 외부 배포, 신규 유료 서비스/설정과 제품 정책 확정은 이번 실행에서 자동으로 하지 않는다.

## 확정한 출발점과 남은 실행 항목

| 선택 | 권장 출발점 | 아직 확정하지 않은 것 |
| --- | --- | --- |
| 자료 | 001은 새 개인 사용, 002는 **이전 PoC의 Flow 콘텐츠만** 관리 사본으로 반입. 완료·개인 메모·실행 날짜 이동·사용 이력은 제외 | 전체177Flow/26Map과 다른 현재 판본2개를 대조해 비공개 보존 완료. 원저자 변경/공개 승격은 하지 않음. 모든 구조의 편집·실행 인계는 남음 |
| 계정 | `trial-user`와 `trial-creator` 역할, 실제 로그인 사용자/UUID·이메일 인증·현재 상태 확인 완료. 이메일은 공개 문서에 기록하지 않음 | 계정 기능을 역할별로 제한하는 제품 정책은 아님. 두 계정을 합성 QA 대상으로 다시 사용하지 않음 |
| 백업 | 사용자의 재개 지시에 따라 `D:\FlowMe-Backups`에 계정별·시각별 1차 백업 생성/검사 완료 | 두 번째 매체·자동 주기·보존 기간은 아직 미확정. 외부 업로드/자동 설정 승인으로 해석하지 않음 |

새 자료 작성부터 시작하면 ‘과거 원본 이관’은 해당 없음으로 표시하고, 대신 최초 작성본의 독립 사본과 백업/복원 대조를 수행한다. 기존 자료가 있으면 이관 검사를 추가한다. 어느 경우도 과거 예시 자료를 사용자 실자료로 바꾸어 집계하지 않는다.

## 단계별 실행·판정

9/24 현재 판정이다. 원본 전체 보존, 편집 연결 범위, 사용자가 실제로 수행한 시험은 서로 다른 증거로 관리한다. 특정 독립 백업 폴더 미선정을 개발·소량 시험의 차단 조건으로 삼지 않는다는 후속 지시를 적용한다. 과거 입력 대기와 당시11개 지원 표는 위 이력에 그대로 남긴다.

| 단계 | 기획/UX·설계·개발 | 검증과 통과 조건 | 현재 상태 |
| --- | --- | --- | --- |
| T01 준비 | 계정/자료/백업 선택, 현재 코드·접속 경계 확인 | 원본 대상과 사본 위치 명시, 비밀번호/원문 공개 로그 0 | 후속 승인에 따라 전체177Flow/26Map 모집단 대조 완료. QA 생성물·사용 흔적 제외, 보관21개와 판본2개 구분 |
| T02 사전 보존 | 파일을 수정하지 않는 오프라인 백업 검사와 안내 준비 | 파일/사진 무결성·요청 크기·동일 사본 확인. 서버 서명/접근 권한은 별도 미리보기로 구분 | 실제 두 계정 시작 백업·서버 미리보기 통과. 독립2차 사본 미실행, 보관 위치는 사용자 선택. 미선정을 개발/소량 시험 중단 사유로 사용하지 않음 |
| T03 작성 또는 콘텐츠 반입 | 001은 새 개인 자료, 002는 기존 콘텐츠의 관리 사본. 과거 사용 흔적은 가져오지 않음 | 콘텐츠 원문/구조/출처 보존·사용 흔적 유입0·재반입 중복0. 반입 후 새로 만든 실행 상태는 날짜/폴더/완료/다시 열기/Undo/새로고침 후 일치 | **실제 원본 보존·열람 완료:** 177Flow/26Map와 판본2개, 기존 사본 유지. 현재 편집 지원13Flow·103항목은 별도 QA로 검증. 001의 실제 일정/메모 작성 및 일상 변경은 아직 확인되지 않음. 남은164Flow/Map 전체 편집 연결을 제한 실자료 시험의 일괄 선행 조건으로 추가하지 않음 |
| T04 복원 | 현재 상태 백업·사본 보존 후 사용자가 선택한 이전 시점의 차이를 명시 확인 | 원문/identity/개인 기록/첨부 hash 대조, 잘못된 계정/손상/취소 변경0, 현재 서버 판본 보존 | 별도 QA의 r25→26 복원·새 로그인·새 백업 성공은 기술 근거. 실제 사용자의 복원 대상/차이 선택과 명시 적용은 미실행. 같은 상태 미리보기/취소는 실제 복원으로 세지 않음 |
| T05 실제 기기 | 데스크톱+실제 보유 기기 접속 경로 확정 | 같은 계정 왕복·충돌·오프라인 복귀·키보드/터치·파일 저장/선택 확인 | 현재 PC 전용 확인, Android USB 후보 준비. 기기 미실행 |
| T06 종료 | 요구별 충족/잔여와 실사용 주의사항 기록 | 원본 보존·운영 불변·증거 범위·발행 상태를 분리하고 미실행을 성공으로 집계하지 않음 | 미완료 |

순서는 안전 의존 관계를 따른다. 계정 선택 전에도 사전 검사 도구·절차와 접속 준비는 진행한다. 실제 기기 연결이나 배포 승인이 없다고 구현/검증 완료 항목을 되돌리지는 않지만, 실제 기기 판정을 자동 브라우저로 대신하지 않는다.

다음 사용자 입력은 001에 실제 사용할 일정/메모가 저장됐는지와 그 항목의 식별 가능한 제목이다. 비밀번호·본문 공개를 요구하지 않고, 미작성이라면 임의로 시험 데이터를 넣지 않는다. 기술적으로 가능한 지연 개선과 회귀를 먼저 진행한다. 실제 기기와 복원 대상은 해당 단계 직전에 구체적으로 확인하며 이미 확정된 계정 역할·오픽 연결·백업 위치 정책을 다시 승인받지 않는다.

## 실자료 시험 카드

선택 후 아래 칸을 채운다. 원문·사진·이메일·계정 UUID는 공개 Git 문서에 싣지 않는다. 필요한 비공개 대응표와 백업은 사용자가 정한 별도 보관처에 둔다.

- 대상 계정: `trial-user`(사용자가 확인한 001 계정), `trial-creator`(사용자가 주소를 확인한 002 계정). 이메일/UUID는 이 문서에 기록하지 않음.
- 출발 방식: `trial-user`는 새 개인 일정·메모·Flow로 시작, `trial-creator`는 이전 PoC의 Flow 콘텐츠를 관리. 최종 목록은 콘텐츠/중복 판본/QA 자료 대조로 구성하며 과거 사용 흔적은 제외.
- 이전 PoC 조사 사본: `D:\FlowMe-Backups\trial-creator\candidate-previous-poc-r493-20260923.program.json`. 정확한 출처·hash·QA 구분은 [원본 대조](alpha-m7-2-content-intake.md). 사용 흔적이 포함된 전체 snapshot이므로 **반입 대상 아님**. 원본/사본 삭제 없이 보존, 적용0.
- 시험 전 계정 백업: `D:\FlowMe-Backups\trial-user\`·`trial-creator\`에 보관/검사 완료. [전체 반입 후 r75 백업](alpha-m7-2-full-catalog.md)도 보관·서버 preview 검증했다. 독립 두 번째 사본은 아직 없음.
- 실제 기기/OS/브라우저/수행자: 미지정.
- 외부 공개 행동: 하지 않음. 탐색과 개인 사본 생성은 필요 시 선택 자료 범위로 분리.

최소 사용 흐름은 개인 일정 또는 메모 한 개와 제작 원문 한 개다. 사진이 실제 선택 범위에 없으면 첨부 실자료 검사는 해당 없음으로 기록한다. 테스트를 채우기 위해 임의의 실제 개인정보나 공개 콘텐츠를 만들지 않는다.

두 역할은 이번 검증을 위한 구분이다. 누구나 제작/개인 실행을 할 수 있는 방향을 별도 계정 유형으로 바꾸지 않는다. 콘텐츠 관리 사본 반입과 공개 Flow 등록/발행은 다른 작업이며, 기존 원저자·출처를 보존하고 대상 목록을 먼저 대조한다. 기존 A/B 자동 live QA 스크립트는 이 두 계정을 계속 시험용으로 간주해서 실행하지 않는다. 실제 사용 계정에 합성 자료를 새로 주입하거나 QA 정리 절차를 적용하려면 별도의 정확한 범위 확인이 필요하다.

### 백업 보관 — PC 1차 보관 완료, 독립 사본/자동화는 후속

- PC 1차 폴더: `D:\FlowMe-Backups\trial-user\`, `D:\FlowMe-Backups\trial-creator\`. Git 저장소 밖에서 계정별·날짜별 파일을 구분한다. 9/23 두 백업 생성 후 읽기 검사 완료. 새 루트 폴더와 실제 두 파일의 Windows ACL은 현재 Windows 사용자·SYSTEM 두 주체만 허용함을 확인했다. 암호화·물리적 분리·관리자 접근 차단을 뜻하지 않는다.
- 2차 사본 후보: 본인이 가진 외장 저장장치 또는 다른 PC/기기. 실제 매체를 지정할 때 확인하며, 다른 폴더나 드라이브 문자만 보고 물리적으로 독립됐다고 판정하지 않는다.
- 현재 구현은 사진 포함 백업 파일 다운로드·명시 복원과 읽기 전용 사본 대조다. 예약 생성·자동 암호화·외부 기기 자동 전송까지 구현/설정됐다는 뜻은 아니다.
- 새 서비스를 가입하지 않고 수동 사본으로 시험을 시작할 수 있다. 백업 파일에 개인 원문·기록·사진이 포함되므로 접근을 제한하고, 외부 보관/암호화 방식은 선택한 매체에 맞춰 정한다. [CISA 백업 보관 안내](https://www.cisa.gov/resources-tools/training/how-protect-data-stored-your-devices).
- 두 번째 매체를 아직 정하지 않았다는 이유로 읽기 전용 준비나 계정별 계획 전체를 중단하지 않는다. 실제 덮어쓰기/복원 검증과 중요한 유일본 취급 전에는 독립 사본 및 복원 가능 여부를 확인한다.

## 백업과 이관에서 주의할 점

아래는 기존 M6 전체 백업/복원 기능의 주의사항이다. 이번 Flow 콘텐츠 반입을 개인공간 전체 복원으로 대체하지 않는다. 콘텐츠 전용 경계는 [원본 대조](alpha-m7-2-content-intake.md)를 따른다.

- `/alpha`의 **자료 가져오기 · 백업**에서 현재 로그인 계정을 먼저 확인한다. 계정 백업은 개인 자료와 연결된 사진의 보관이며, Auth·공개 서비스 전체 복구가 아니다.
- **이 브라우저의 이전 자료 읽기**는 같은 브라우저 프로필의 같은 origin 저장소만 읽는다. 예전 `file://` HTML, 다른 포트나 다른 프로필의 자료가 자동으로 보이는 것은 아니다. 이 경우 원래 화면의 export 또는 명시적으로 선택한 파일 사본이 필요하다.
- 기존 자료 가져오기는 빈 대상 개인공간 또는 같은 자료에만 적용한다. 이미 새 개인 자료가 있다면 자동 병합하지 않는다. ‘새로 작성부터’와 ‘기존 자료 먼저 이관’의 순서를 계정 선택 때 정한다.
- 파일 백업은 암호화되지 않았다. 비공개 보관하며 Git·보고서·메신저로 원문을 자동 전송하지 않는다. 서로 다른 폴더의 파일 두 개만으로 다른 디스크/기기에 보관됐다고 판단하지 않는다.
- 오프라인 구조·hash 검사 통과는 서버 서명·현재 권한·복원 가능 판정이 아니다. 같은 계정의 **적용 전 미리보기**에서 서명·현재 공개 관계·첨부 상태를 확인하고, 복원 전 현재 상태를 다시 백업한다.
- 복원은 현재 개인공간을 선택 시점으로 바꾼다. 과거 서버 ledger, 타인의 기록, 공개 게시물까지 되감지 않는다. 테스트를 위해 현재 실자료를 임의로 비우지 않는다.

## 접근 경로

현재 개발 앱은 `http://localhost:3104/alpha`다. PC 자체에서만 사용할 수 있다. 휴대폰의 `localhost`는 휴대폰 자신이며 PC가 아니다. 현재 서버 bind와 인증/API의 exact-origin 경계 때문에 PC의 LAN IP로 주소만 바꾸어도 사용할 수 없다. 방화벽·터널·외부 서버·인증 redirect는 이번에 변경하지 않았다.

코드와 실행 상태를 별도로 대조했다. [개발 실행기](../../../scripts/alpha/dev.ts)는 `127.0.0.1` bind·localhost3104 callback 고정이며 실제 listener도 일치했다. [환경 계약](../../../lib/flow/integrated-poc/alpha-persistence/environment.ts), [인증 origin 검사](../../../lib/flow/integrated-poc/alpha-auth/config.ts), [쓰기 API](../../../lib/flow/integrated-poc/alpha-server/command-handler.ts)가 임의 LAN origin을 허용하지 않는다. bind만 변경하거나 허용 origin을 광범위하게 여는 수정은 하지 않는다.

### Android USB 접속 후보 — 아직 실행하지 않음

Chrome의 공식 USB 포트 전달은 Android의 localhost 포트를 PC localhost에 연결한다. 네트워크 공개 없이 기존 origin을 유지할 수 있어 이 앱의 최소 변경 후보로 판단한다. **일반 기능 문서에서 도출한 후보이며, FlowMe 로그인/저장이 실제 폰에서 통과했다는 뜻은 아니다.** [Chrome 공식 절차](https://developer.chrome.com/docs/devtools/remote-debugging/local-server).

사용자가 Android와 USB 연결을 선택하면:

1. 신뢰하는 PC에 본인 폰을 연결하고, 사용자가 USB 디버깅 허용을 직접 확인한다. 다른 기기 설정을 자동으로 바꾸지 않는다.
2. PC Chrome의 `chrome://inspect/#devices`에서 해당 기기를 확인한다.
3. Port forwarding에 기기 포트 `3104` → PC `localhost:3104`만 지정한다. LAN listener나 Auth redirect는 변경하지 않는다.
4. 폰 Chrome에서 `http://localhost:3104/alpha`를 열고, 선택한 본인 계정으로 로그인한다. 비밀번호/세션을 PC에서 폰으로 복사하지 않는다.
5. 먼저 민감하지 않은 작은 기록으로 양방향 저장·새로고침을 확인한다. 종료 후 이번 포트 전달을 해제하고 사용자가 디버깅 허용을 정리한다.

이는 연결 중 시험 경로이지 외출 중 지속 사용을 위한 배포가 아니다. iOS Safari에도 같은 방법이 된다고 가정하지 않는다. 상시 다기기 사용에는 고정 HTTPS 접속과 별도 호스트/인증 설정·배포 승인이 필요하다. 같은 PC의 두 브라우저 프로필은 독립 세션 검사로만 집계한다.

## 백업 사전 검사 도구

[검사 도구](../../../scripts/alpha/m7-personal-backup-check.ts)와 [검사 테스트](../../../scripts/alpha/m7-personal-backup-check.test.ts)를 추가했다. 선택한 파일만 읽고 DB·Auth API·원본 저장소를 호출하거나 수정하지 않는다. 디렉터리 검색이나 자동 계정 선택도 없다. 사용자가 네트워크 공유 파일 경로를 지정하면 그 파일시스템 통신은 발생할 수 있으므로, ‘오프라인’은 외부 서비스 API·업로드·로그인이 없다는 범위다.

담당 에이전트용 실행 예시 — 경로는 사용자가 선택한 실제 파일로 바꾼다:

```powershell
npx.cmd tsx scripts/alpha/m7-personal-backup-check.ts --backup "D:\FlowMe-Backups\chosen.json" --copy "E:\FlowMe-Backups\chosen.json"
```

위 명령의 파일 이름과 E: 사본은 예시다. 실제로 생성한 것은 D:의 아래 두 1차 백업이며 독립 사본은 아직 없다. `--expected-owner`에는 로그인에서 확인한 계정 UUID를 지정할 수 있다. 미지정이면 `ownerCheck=not-requested`이고 파일 안의 계정을 실제 로그인 계정으로 간주하지 않는다. 이 오프라인 검사기에는 이메일·비밀번호를 전달하는 옵션이 없다.

| 출력/거절 | 의미 |
| --- | --- |
| `ok=true` | 읽은 bytes의 지원 형식·구조·원문/첨부 무결성·복원 요청 크기 검사 통과. 복원 승인 아님 |
| `copy=byte-identical-separate-file` | 서로 다른 파일의 bytes가 읽은 시점에 동일. 같은 경로/hard link는 거절 |
| `serverSeal=format-only-not-authenticated` | 서명 모양만 확인. 진위는 앱의 서버 미리보기에서 확인해야 함 |
| `independentStorage=not-verified` | 다른 디스크·기기·계정에 보관됐는지는 별도 확인 |
| `owner-mismatch`, `invalid-backup`, `limit`, `same-file`, `copy-mismatch`, `file-changed` | 검사 실패, 적용/자동 보정/부분 성공 없음. 검사 중 관측한 원본/사본 변경도 거절 |

출력은 개수·크기·hash·시각·판본과 검사 상태뿐이다. 원문·사진 bytes·계정 ID·파일 경로를 로그로 내보내지 않는다. 파일은 암호화하지 않으며 검사 후 파일의 계속된 보존을 보장하지 않는다. 위9/24 후속에서 Windows의 실제 임시 파일 변경·directory junction·NUL을 확인했다. 파일 symlink 자체·named pipe·다른 OS·네트워크 공유에서의 변경 경합은 미실행이다.

## 최초 준비 실행의 근거

- 시작 worktree: `flow-poc-merge-prep-20260920`, branch `agent/alpha-m1-persistence-20260921`, HEAD `efd8b642707b5c8e67b727f23169ae41c43cb5e8`.
- 시작 Git 상태: modified43/untracked51. 이전 M1–M7-1 작업을 보존하고 이번 변경만 별도로 기록한다.
- 로컬 `/alpha` HTTP200. 제품 화면을 조작한 검사나 실제 기기 검사가 아니다.
- 독립 리뷰: 접속 경계와 신규 검사 도구를 별도 에이전트가 읽기 전용 검토했다. 중요한 결함 제보 0, 실제 변경 경합/symlink/특수 파일 검증 한계는 위에 남겼다.
- 실제 자료 작성/이관/복원: 아직 실행하지 않음.
- 운영 DB/Auth/Storage 변경, 메일 발송, 실제 계정 추정: 하지 않음.
- 운영 데이터 경계: 신규 도구는 명시한 파일만 읽고 앱/DB writer를 호출하지 않는다. 기존 `/my`·운영 저장 코드·schema는 이번에 수정하지 않았다. 실자료 시나리오 전후의 운영 DB/브라우저 전체 bytes 대조는 이번 준비 검사에서 실행하지 않았다.
- commit/push/PR/merge/Preview/Production: 이번 단계 미실행.
- 실제 기기 검사: 미실행. 관찰 사용자 검증: 0명.

이 원장은 준비와 실제 시험 결과를 구분해 누적한다. M7-1 자동 검사 수치는 해당 원장의 이전 근거이며 M7-2 실행 수로 합산하지 않는다.

### 최초 준비에서 실제 실행한 검사

| 검사 | 결과 | 근거/한계 |
| --- | --- | --- |
| 신규 백업 도구 + 기존 백업/보존 계약 | **40/40** (신규18 + 기존22), 실패/skip/cancel0 | 로컬 전용 근거: `output/alpha-m7/m72-preflight-20260923-01/offline-tests.tap` |
| 두 신규 파일 strict TypeScript | 통과, 진단0 | 직접 지정한 두 진입점 검사. 전체 앱 타입 검사 재실행으로 집계하지 않음 |
| `npm test` | **2255/2255**, 실패/skip/cancel0 | 로컬 전용 근거: `output/integrated-product-poc/npm-test-2026-09-23T03-34-07-918Z.json`, 검사 중 대상 source 변경0 |
| 보관된 M7-1 합성 대형 백업의 CLI 검사 | 통과. 파일10,224,235bytes, 복원 요청10,361,702bytes, 문서50개 | 이전 QA 파일을 현재 도구로 읽기만 했다. 실제 사용자 자료나 새 서버 왕복 아님 |
| 문서 검사·현재 변경 검토 | **4/4**, 로컬 링크6449개 통과, `git diff --check` 오류0 | 로컬 전용 근거: `output/integrated-product-poc/docs-2026-09-23T03-39-23-739Z.json`. 종료 점검 뒤 기록 갱신에 대해서도 다시 문서 검사 |
| production build·전체 통합 UI 회귀 | 이번에는 미실행 | 앱 runtime·schema·의존성·화면 변경 없음. 이전 M7-1 결과와 구분 |

검사한 기존 QA 백업의 파일 SHA-256은 `b64479274a75e2fd5f7fa52dca741b1591f06cb6d525979ce9c2011f226e5467`이다. 이 값은 실제 사용자의 백업을 뜻하지 않는다. 이번 도구 source SHA-256: `5a9bb97c9154c9aa8edbe5802c4f7b151d3c9fbc20bd92b6d83ef992c2baecfc`, test: `8ffd493abd1cf47a8ac5dc936b725f66cb09fa3dc937552283c1f9261aadbdff`.

### 최초 준비 변경 파일

- 신규: 이 M7-2 원장, `scripts/alpha/m7-personal-backup-check.ts`, `scripts/alpha/m7-personal-backup-check.test.ts`.
- 기존 5개 파일의 현재 단계 연결: `docs/STATUS.md`, `docs/PROJECT_CONTROL.md`, `docs/ROADMAP.md`, 이 폴더의 `alpha-transition.md`, `current-checkpoint.md`.
- 그 밖의 M1–M7-1 dirty 변경은 이번 변경으로 세지 않는다. closeout은 미추적 상위 `scripts/alpha/` 때문에 6개 문서만 scope로 표시하여, 신규 스크립트 2개는 `git status --untracked-files=all` 및 소스/테스트로 따로 확인했다. staged 변경0.

## 9/23 재개 — 실제 계정 시작 상태 보존

사용자가 계정 역할·백업 방식을 확인하고 재개를 지시했다. 동일 worktree/HEAD, 시작 상태 modified43/untracked52에서 시작했다. 계정·백업 결정을 다시 요구하지 않고 아래 범위를 실행했다.

### 실제 계정 상태와 백업

| 계정 역할 | 현재 개인 자료 | 보존한 이력 | 백업 크기 / 복원 요청 크기 | 서버 미리보기 |
| --- | --- | --- | --- | --- |
| `trial-user` | 문서0·Flow문서0·저장Flow0·제작초안0 | revision427 / operations427 | 5,715,800 / 5,852,129 bytes | 소유자·서명 확인, 현재와 같음, 적용 불가(no-change) |
| `trial-creator` | 문서0·Flow문서0·저장Flow0·제작초안0 | revision70 / operations70 | 165,058 / 182,495 bytes | 소유자·서명 확인, 현재와 같음, 적용 불가(no-change) |

둘 다 이메일 인증과 로그인 사용자 UUID를 대조했다. 비우거나 초기화할 개인 자료는 없으며 **남아 있는 과거 QA 이력은 삭제하지 않았다**. 백업에 이력이 들어 있어 파일 크기가 0이 아니다. 실제 계정 백업이지만 새 실사용 원문·사진이 생겼다는 뜻은 아니다. 현재 파일/사진·이관 archive는 양쪽 모두0이다.

- `trial-user/2026-09-23T04-25-22-091Z-ac3dc603-before-trial.json`: SHA-256 `4014f3046a1953270b6b9898cd30a8c74dee4ef4694d410778bfdcdcf5430436`.
- `trial-creator/2026-09-23T04-25-34-044Z-bd887250-before-trial.json`: SHA-256 `8e3a6e8dd879e434895afa041dfea777afe9ad42174d22e2fdf8eaf5d1224faf`.
- 위 두 경로의 기준은 `D:\FlowMe-Backups\`다. 각 파일 옆 `-inspection.json`에 원문·이메일·UUID·비밀번호 없이 검사 결과를 보관했다. 원본 백업은 개인정보가 포함될 수 있는 평문이며 Git에 넣지 않는다.
- 공개 요약의 `serverSeal=format-only-not-authenticated`는 오프라인 검사기만의 판정이다. 별도 서버 미리보기는 실제 서명 검증을 통과했다. 이것을 실제 덮어쓰기 복원 통과로 세지 않는다.

### 실행 도구와 변경 없는 접근

[계정 백업 실행기](../../../scripts/alpha/m72-capture-account-backup.ts)와 [17개 단위 테스트](../../../scripts/alpha/m72-capture-account-backup.test.ts)를 추가했다. 명시한 역할·이메일·예상 UUID가 일치해야 진행하며 로컬 보관 로그인 정보를 읽되 출력/수정하지 않는다. DEV 고정 프로젝트·localhost3104에만 접근하고, 별도 로그인 세션으로 `backup`과 `preview/restore`만 요청한다. `commit`·이관·초기화·공개 writer·운영 프로젝트 호출은 없다. 종료 시 자신의 새 세션만 `scope=local`로 로그아웃한다. 실제 두 실행 모두 정상 종료했다.

다운로드된 백업은 새 파일로만 만들고(flush 후 재읽기) hash를 대조했다. 폴더/파일 ACL 확인은 이번 Windows 실제 실행 근거이며 단위 테스트가 대신 증명한 항목이 아니다. 로그인 응답을 받기 전에 통신이 끊기면 생성 여부를 모르는 세션을 회수한다고 보장할 수 없다. 디스크 실패·Windows ACL 자동 회귀는 미실행이다.

백업 전후 **16/16 범위의 JSONB 직렬화 bytes 길이·SHA-256 동일**을 확인했다. 범위는 두 계정 row, operation journal, import archive, 공개 identity, rate 기록, media registry, 보존 사진, 공유 저장소와 개발용 private bucket object metadata다. 로컬 전용 근거: `output/alpha-m7/m72-baseline-20260923-01/app-data-invariance.json`.

이 검사는 DEV 앱 자료의 전후 대조다. 로그인/자기 세션 종료에 따른 Auth 기록은 바뀌며, Auth 전체·운영 DB 전체·기존 브라우저 `flow:*` bytes 불변을 검사한 것으로 확대하지 않는다. 운영 DB 데이터 접근/변경과 브라우저 저장소 조작은 하지 않았다.

### 기존 콘텐츠 조사와 남은 연결

[기존 콘텐츠 원본·이관 경로 대조](alpha-m7-2-content-intake.md)에 저장소 카탈로그, 가상 공개 예시, 실제 로컬 제작 자료를 구분했다. 카탈로그 전체를 002 소유로 바꾸거나 PoC의 가상 공개물을 실제 발행하는 작업은 하지 않았다. 후속 사용자 정정으로 **이전 PoC의 Flow 콘텐츠만** 반입한다. 기존 M6 전체 이관 경로는 이번에 사용하지 않는다. 콘텐츠 전용 관리 사본 경로의 계약/구현은 남아 있다.

### 재개 차례의 실제 검사

| 검사 | 결과 | 근거/한계 |
| --- | --- | --- |
| 신규 실행기17 + 오프라인 검사기18 + 기존 백업/계약22 | **57/57**, 실패/skip/cancel0 | 로컬 전용 근거: `output/alpha-m7/m72-baseline-20260923-01/backup-tests.tap`. 앞선 35개 표적 실행·독립 리뷰17개 재실행과 중복 합산하지 않음 |
| 신규 실행기·테스트 strict TypeScript | 통과, 진단0 | 두 진입점 직접 지정. 앱 전체 타입 검사 아님 |
| `npm test` | **2255/2255**, 실패/skip/cancel0 | 로컬 전용 근거: `output/integrated-product-poc/npm-test-2026-09-23T04-26-38-251Z.json`, 수집된 앱 소스 변경0. 이 명령은 신규 scripts/alpha 테스트를 포함하지 않아 위57개를 별도로 실행 |
| 실제 계정 백업/서버 미리보기 | **2계정/2계정** 통과 | 각 새 파일과 검사 요약은 Git 밖 PC 폴더에 보관. 복원 적용/독립 2차 사본 시험 아님 |
| DEV 앱 자료 전후 대조 | **16/16 동일** | Auth·Production·브라우저 저장소 검사는 아님 |
| 독립 코드 리뷰 | 중요한 결함 제보0 | 별도 에이전트가 실행기·handler·SQL 경계 검토, 모의 단위17/17. 실제 API/DB 재실행은 하지 않음 |
| 문서·변경 점검 | 문서4/4·로컬 링크6467개 통과, `git diff --check` 오류0, staged0 | 로컬 전용 근거: `output/integrated-product-poc/docs-2026-09-23T04-34-28-923Z.json`. 아래 종료 메모 추가 뒤에도 재검사 |
| build·UI·실기기·관찰 | 이번 재개에는 미실행, 관찰 사용자0명 | 앱 runtime/schema/UI 변경 없음. 과거 M7-1 수치를 이번 실적으로 합산하지 않음 |

재개 변경은 위 실행기/테스트, 이 원장과 원본 대조 문서, 현재 단계 문서 연결이다. 기존 M1–M7 dirty 변경은 보존했다. commit/push/PR/merge/Preview/Production은 모두 이번에 실행하지 않았다.

실행기 SHA-256 `7c360c27591a401e86adf9cb8343aa707271410ffd427df636bcd10b8b4fcf98`, 테스트 `952b5a6bc50dd80a069414070db9e940ca923bf71b2bb73dfb7c2f29dea35421`. closeout은 미추적 상위 `scripts/alpha/`를 묶어 표시하므로 문서7개만 감지했다. 신규 스크립트2개는 명시한 파일 status·내용·단위 테스트·타입 검사로 별도 검토했다. 새 원본 백업2개와 검사 요약2개는 Git 밖에 보관한다. 실제 로그인 세션은 정상 종료했고 이번 실행 lock은 남기지 않았다.

### 다음 실행 조건

계정·PC 백업·이전 PoC 콘텐츠 반입/사용 흔적 제외는 확정했다. [콘텐츠 목록 대조 → 콘텐츠 전용 계약/변환·검증 → 002 관리 사본 반입](alpha-m7-2-content-intake.md) 순서다. 전체 누적 저장본 확인이나 사용 이력 귀속 결정을 다시 요구하지 않는다. 001의 새 개인 기록은 사용자가 직접 작성하며 임의로 만든 QA 원문을 실자료로 세지 않는다. 독립 사본과 실제 기기 선택은 각각 복원/실기기 단계 직전에 확인한다. 실제 원문을 공개 채팅에 올리거나 비밀번호를 공유할 필요는 없다. M7-2 전체를 완료 처리하지 않는다.

### 이전 대기 판정 이력 — 이후 사용자 재개로 해소

2026-09-23 재확인: 세 가지 선택이 미확정인 같은 조건이 최초 목표 실행과 두 후속 차례에 걸쳐 유지됐다. 직전 후속은 원장/상태 재확인만 했으므로 새로운 진척이나 실행 중 작업의 대기로 세지 않는다. 사용자 선택 전 가능한 사전 검사·안내·접속 설계는 마쳤고, 선택 없이 실제 사용 목표를 더 진행할 안전한 작업은 남아 있지 않아 목표를 `blocked`(사용자 입력 필요)로 분류한다. 시험 범위는 축소하지 않으며 실제 이관·복원·기기 검증 완료로 처리하지 않는다. 세 가지 선택이 도착하면 기존 T01–T06에서 이어서 진행한다.
