# M2 개발계 인증·접근 권한 — 실행 기록

2026-09-21 17:08 · **M2 개발계 인증·접근 권한 목표 완료.** 두 실제 계정의 가입·메일 확인 서버 기록, 사용자 직접 복구 성공, 새 비밀번호 실브라우저71/71, 실제 자연 만료·재인증23/23을 확인했다. 개발 데이터·권한 사후 확인도 통과했다. 아래 실패·검증 무효 이력은 보존하며, 서비스 전체 실사용 준비나 배포 완료를 뜻하지 않는다. 상위 상태 원장은 [alpha-transition](alpha-transition.md)이다.

## 최종 요약

| 구분 | 확인 결과 |
| --- | --- |
| 구현 | 개발 전용 로그인/가입/복구/계정 전환, PKCE callback 격리, 고정 owner/token adapter, 빈 개인공간 초기화·조회, 개발 RLS/grants·private bucket |
| 실제 인증·권한 | API49·SQL 역할9·anonymous7·비메일30·자연 만료23·실브라우저71 PASS. 포함 관계와 반복 실행을 합쳐 커버리지 수로 세지 않음 |
| 가입·복구 | 두 계정 signup/verify 서버 성공. 사용자가 직접 비밀번호 재설정 완료, 새 비밀번호 자동 재로그인 PASS. 최초 가입 화면 조작의 직접 관찰은 아님 |
| 자동 회귀 | npm2255/2255·통합1807/1807·인증 표적28/28·mock 브라우저30/30·portable4/4, production build PASS, strict411진입점 진단0, dependency audit 취약점0 |
| 데이터 경계 | 전용 prefix 밖 앱 쓰기0·합성 운영 key bytes 동일. 개발 users4/accounts2/canonical 빈 계약2/private objects0. 운영 프로젝트 접근·쓰기 없음; 운영 DB 전수 byte 비교는 아님 |
| 남은 서비스 준비 | Google OAuth, 일반 사용자 SMTP 배달/한도·남용 방지, 실제 기기, M3 저장/동기화·M6 이관/복원·M7 실사용. 유료 유출 비밀번호 보호 WARN1 유지 |
| 발행·관찰 | 이번 M2 commit/push/PR/merge/Preview/Production 미실행. Android/iOS 실기기 미실행, 관찰 사용자 연구0명 |

아래 시간별 기록은 당시 상태다. 과거의 “메일 보류·만료 실행 중” 문구를 현재 미완료 판정으로 사용하지 않는다. 현재 판정은 이 요약과17:08 최종 검증을 따른다.

## 목표와 경계

사용자가 M2 목표 설정과 실행을 승인했다. M1의 계정별 계약을 이어받아 개발용 Supabase 인증, 새 계정의 빈 개인공간 생성·조회, DB/API/파일 접근 경계를 연결한다. 실제 편집·CAS·Undo·다기기 갱신은 M3, 기존 자료 가져오기는 M6이다. 이 화면의 로그인 성공을 제품 전체 실사용 완료로 표현하지 않는다.

- 격리 worktree `flow-poc-merge-prep-20260920`, branch `agent/alpha-m1-persistence-20260921`, HEAD/최신 origin/main `efd8b642`. 직전 M1의 미커밋 19개 파일은 이 세션 소유로 이어받는다.
- 개발 프로젝트 `wkmzcxpnojobxrgebapw`만 사용. 9/21 착수 조회: ACTIVE_HEALTHY, public tables 0, migrations 0, Auth users 0, Storage buckets/objects 0.
- 운영 `ldellkztijrijbpwthjl`, 기존 `/my`, PoC exact query, 기존 Flow 저장 key/writer는 변경하지 않는다. 앱 build/CI는 원격 migration이나 실제 사용자 생성을 실행하지 않는다.
- Google 우선·이메일 대안, 신규 가입 허용, 무료 검증을 유지한다. Email 확인을 끄거나 관리용 비밀키를 브라우저에 넣지 않는다. 배포·유료 변경은 하지 않는다.

## 실행 순서와 종료 기준

1. **설계·UX:** `/alpha`를 개발 설정이 있어야 열리는 인증 경로로 추가한다. 로그인/가입/비밀번호 복구/만료/계정 전환/빈 상태를 구분한다. 미구현 편집·가져오기 버튼으로 성공을 가장하지 않는다.
2. **DB:** 버전 migration에 RLS와 명시 grant를 함께 둔다. `auth.uid()`와 살아 있는 인증 세션으로 owner를 결정한다. 빈 계정의 idempotent 생성·조회만 열고 개인공간 전체 갱신은 닫는다. 비공개 bucket은 계정 경로와 owner를 함께 검사한다.
3. **연결:** publishable key만 사용하는 개발 client, 로그인 이벤트·늦은 응답의 generation 경계, 계정별 메모리/캐시 격리, 안전한 callback/redirect를 구현한다. 미설정·운영 환경은 네트워크 전에 거절한다.
4. **검증:** 단위·component·migration 정적 검사, 실제 A/B/anonymous의 REST/RPC/Storage 권한 음성 검사, SQL role 검사를 구분한다. 운영 key 불변·해상도 5종·키보드·console/page error를 확인한다.
5. **인계:** 실제 실행 수·실패·미실행·원격 적용 버전·남은 사용자 준비를 기록한다. npm test/build/audit/docs 및 scoped diff를 확인한다. 목표 종료는 실제 계정 검사까지 통과했을 때만 선언한다.

## 인증 제공자 확인과 외부 준비

9/21 개발 Dashboard 확인: 신규 가입 ON, Email ON, Confirm email ON, anonymous sign-in OFF, Google OFF. Google OAuth client 설정은 아직 없다. [기본 SMTP의 제한](https://supabase.com/docs/guides/auth/auth-smtp)과 [신규 Free 프로젝트 템플릿 제한](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)을 확인했다. 이메일 확인을 우회하지 않으며, 테스트 계정 2개의 생성·확인은 사용자에게 요청했다. 비밀번호/토큰은 문서·채팅·검증 결과에 기록하지 않는다.

## 실행 결과

**개발계 M2의 구현·실제 검증·인계를 완료했다.** 첫 API49/49·rollback-only SQL 역할9/9 이후 비메일30/30, 새 비밀번호 실브라우저71/71, 실제 자연 만료23/23을 통과했다. 두 계정의 실제 가입·메일 확인은 서버 로그, 복구는 사용자 직접 수행 확인과 별도 자동 재로그인으로 검증했다. 서로 겹치는 검사를 합쳐 요구 충족률로 계산하지 않는다. Google·일반 사용자 SMTP·실기기·서비스 배포는 미실행이며 M3 이후 준비와 구분한다.

### 9/21 13시 후속 — 계정 준비 해소와 실제 검증

- 사용자가 두 테스트 계정의 이메일 확인을 마치고 ignored 로컬 파일에 로그인 정보를 저장했다. 실제 로그인으로 검증했으며 이메일·비밀번호·토큰을 공개 문서나 결과 파일에 싣지 않는다. 앞서 사용하지 않기로 한 계정2개는 수정·삭제하지 않았다.
- 사용자 명시 승인 후 개발 `flowme-dev`의 Site URL을 `http://localhost:3104/auth/callback`, Redirect URLs를 해당 주소와 `http://localhost:3000/auth/callback` 두 개로 저장했다. Dashboard 저장 상태와 정확한 값·개수2를 확인했다. wildcard·배포 URL·운영계 설정은 추가하지 않았다.
- 실제 API **49/49 PASS**: 서로 다른 확인된 계정의 로그인, 자기 빈 공간 생성·재조회, 타인 read/insert·자기/타인 patch/delete 거절, RPC owner 위조·private helper 차단, 파일 읽기/업로드/덮어쓰기/이동/서명 URL/삭제의 owner 경계, MIME·크기, anonymous/public URL 차단, 로그아웃 후 남은 JWT의 DB/RPC/파일 접근 거절, 테스트 파일/세션 정리. 근거 `output/alpha-m2/live-evidence.json` (04:01:08 UTC). 49개에는 정리 확인6개가 포함된다.
- 실제 로그인에서 얻은 유효 session fixture로 **SQL 역할 시뮬레이션9/9 PASS**, 최종 ROLLBACK 실행. 자기 생성 멱등·owner, 타인 조회/삽입, update/delete grant, 없는 session2개, anon2개 경계를 확인했다. 실제 HTTP49개와 별도 증거다. SQL은 `scripts/alpha/m2-role-negative.sql`, 결과는 `output/alpha-m2/sql-role-evidence-20260921.json`이다.
- 실제 Windows Chromium **41/41 PASS**: 로그인 A→reload→logout→B→reload→logout→reload, 키보드 제출, 계정 표시 격리, 저장 prefix/합성 운영 bytes 보존. 실제 Supabase HTTP20건, mock 응답0, console/page error0, 예상 밖 외부 요청0. `scripts/alpha/m2-browser-live.ts`는 기존 브라우저 프로필을 사용하지 않고 별도 context에서 실행하며 trace/HAR/token 저장 없이 검사한다.
- 실제 화면은 로그인/A 연결/B 연결 × 390×844·375×812·844×390·1024×768·1440×900 = **15장**이다. 모두 가로 넘침0·지정 행동48px 이상·스크롤 후 hit-test PASS. root가 다섯 해상도 대표 이미지를 직접 확인했다. 스크린샷의 자홍색 부분은 이메일·입력칸 비식별 마스크이며 실제 UI 색상이 아니다.
- 실제 브라우저 첫 두 실행은 마지막 console 검사에서 **38 PASS/1 FAIL**이었다. 두 계정 로그아웃마다 revoke 중복 요청으로403이 발생했다. 원본 결과를 `output/playwright/alpha-m2-live/2026-09-21T04-05-12-899Z/`, `2026-09-21T04-05-59-180Z/`에 보존했다. 수정 후 최종 `2026-09-21T04-10-34-936Z/results.json`은41/41이며 오류를 허용 목록으로 숨기지 않았다.
- 후속 원격 전후 조회: Auth 사용자 **4→4**, 빈 account **0→2**, private object **0→0**. 계정2개는 canonical 빈 계약과 일치하고 최초 API test session은 더 이상 존재하지 않는다. 생성한 임시 파일만 API로 정리했으며 원래 계정이나 다른 기기 세션을 삭제하지 않았다. 운영 프로젝트 쓰기0이다.
- 이번 수정 후 재검사: `test:alpha-auth` **18/18**, `npm test` **2255/2255** (13:07:52–13:08:19 KST), production build **PASS** (13:07:52–13:08:40 KST), mock 브라우저 **20/20** (32.0초, retry/skip/flaky0). npm/build 실행 중 소스 변경0. 실브라우저 스크립트의 독립 strict 검사도 PASS이며, 최초 호출의 JSON import 옵션 누락 오류2개는 `--resolveJsonModule`을 명시해 해결했다.
- 기존 mock19회 근거는 `output/playwright/alpha-m2-before-live-20260921-1309/`에 복사 보존했다. 아래 통합1801·portable4·audit0은 오전 실행 이력이며 이번 변경 후 전체 통합/E2E를 다시 실행했다고 주장하지 않는다. 이번 runtime 변경은 logout과 그 회귀 검사로 한정했다.
- 후속 Security Advisor는 **WARN1**: `auth_leaked_password_protection`. [유출 비밀번호 차단은 Pro 이상](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)이므로 무료 계획에서 자동 활성화·결제하지 않았다. RLS 테스트 통과와 이 잔여 경고를 구분한다.
- 당시 남은 사용자 동작: 개발계 복구 메일1회 발송 승인을 요청했다. 이후 승인·요청 결과는 아래 13:22 후속을 따른다. 수신→요청한 브라우저 복귀→사용자 직접 비밀번호 변경은 미실행이다. 사용자의 계정 인증 완료 사실을 전체 가입/메일 전달 UX 관찰 증거로 세지 않는다.

### 9/21 13:22 후속 — 복구 메일 승인과 발송 제한

- 사용자가 개발계 첫 테스트 계정의 복구 메일1회 요청을 승인했다. 에이전트는 Codex 내장 브라우저의 `http://localhost:3104/alpha`에서 복구 버튼을 **1회** 제출했다. 비밀번호 입력·변경, 재전송, 제한 설정 변경은 하지 않았다.
- 화면은 `요청이 많습니다. 잠시 후 다시 시도해 주세요.`를 표시했다. 개발 Dashboard Auth 로그의 **2026-09-21 13:22:50 KST** 기록에서 `POST /recover`, status **429**, `over_email_send_rate_limit`, `email rate limit exceeded`, callback `http://localhost:3104/auth/callback`을 확인했다. 로그 원문에는 계정·IP가 있으므로 공개 문서에 복사하지 않는다.
- 판정: **실제 복구 요청은 실행했으나 발송 한도로 거절됨**. 메일 발송 성공·수신·복귀·비밀번호 변경은 확인하지 못했다. 같은 시각대에 다른 `/recover` 로그도 있었으나 이번 에이전트 제출 횟수나 성공 근거로 합산하지 않는다.
- [공식 Auth 한도 문서](https://supabase.com/docs/guides/auth/rate-limits)는 기본 발송 서비스의 프로젝트 전체 한도를 시간당2통으로 안내한다. 정확한 해제 시점은 이번 응답에서 확인되지 않았다. [Custom SMTP 안내](https://supabase.com/docs/guides/auth/auth-smtp)도 확인했으며, 추가 서비스 가입·도메인·SMTP 자격증명·유료 전환은 자동 실행하지 않는다.
- 재개: 한도 해제 후 사용자 승인 아래 같은 브라우저에서1회 다시 요청하거나, 별도 승인한 메일 발송 서비스 연결 후 검증한다. 인증 확인을 끄거나 관리자로 비밀번호를 설정해 정상 복구 경로를 대체하지 않는다. 새 비밀번호의 입력·확인·제출은 사용자가 직접 수행한다. 요청 탭은 후속 진행용으로 유지했다.
- 이번 후속은 실제 요청1회와 읽기 전용 로그 확인 및 문서 갱신이다. 기존 API49/SQL9/브라우저41 결과를 다시 실행한 것으로 세지 않으며, 운영계·배포·제품 코드 변경0이다.

### 9/21 13:25 이후 — 메일 보류와 나머지 진행

- 사용자 지시: 메일 발송은 나중에 하고 나머지를 진행한다. **SMTP 가입·설정·재전송을 현재 선행 과제로 두지 않는다.** 메일 검증을 PASS로 바꾸지 않고 별도 후속에 남긴다. 자연 JWT 시간 만료도 실제 세션 해제 검사나 mock-clock 검사와 구분한다.
- 실제 개발 API **30/30 PASS** (`scripts/alpha/m2-no-mail-live.ts`, `output/alpha-m2/no-mail-2026-09-21T04-31-02-542Z.json`): 실제 refresh와 owner/session 유지, 두 계정 데이터 보존, 자기 테스트 파일 생성·읽기·서명·삭제 후 접근/재서명 거절, 로컬 세션 해제 뒤 A의 read/open/refresh 거절, B 세션 유지, A 재로그인과 동일 데이터 확인. 기존 서명 URL은 삭제 전 fetch하지 않은 URL로 검사했으므로 이미 내려받거나 캐시된 파일의 회수까지 증명한 것은 아니다. 사용자 계정 삭제는 실행하지 않았다.
- 실제 로그아웃 재요청은 **403 / `session_not_found`**였다. 최초 비메일 실행은 구형 raw 응답의 `error_code` 대신 신형 `code`만 읽어 **19 PASS/2 FAIL**로 중단했다. 첫 결과 `no-mail-2026-09-21T04-29-24-810Z.json`을 보존했다. 실패2개는 중복 revoke 판정과 정리 판정이며 테스트 파일은 이미 삭제된 상태였다. 후속에서 양쪽 응답 형식을 명시적으로 처리하고 재검증했다.
- 발견한 실제 결함: 서버 revoke 성공 후 브라우저 session 삭제가 실패하면 재요청403을 일반 오류로 처리해 로그인 화면으로 복구되지 않았다. `alpha-auth/logout.ts`와 `AlphaAuthPanel.tsx`에서 **403 중 `session_not_found`만** 이미 해제된 것으로 받아들인다. 다른403·404·500·손상 응답은 닫힌 화면과 재시도 상태를 유지한다. 기존401 처리도 유지했다.
- mock 브라우저 **22/22 PASS**, 80.9초, skip/retry/flaky0. 같은 화면 재시도·reload 후 재시도·알 수 없는403 거절을 확인했다. `output/playwright/alpha-m2/results.json`; 이전20/20 근거는 `output/playwright/alpha-m2-before-no-mail-20260921-1335/`로 복사 보존했다. mock 복구 요청은 실제 서버에 전달되지 않으므로 이번 메일 발송0과 모순되지 않는다.
- 실제 Windows Chromium **57/57 PASS** (`output/playwright/alpha-m2-live/2026-09-21T04-37-20-932Z/results.json`): A/B→reload→logout 기존 흐름과 저장소 실패 주입2경로를 검사했다. HTTP 응답 mock0, 실제 Supabase 요청31, 같은 화면/reload 후 실제403을 받고 정리·재로그인 가능. 저장소 실패만 로컬 주입한 것이며 실제 기기 장애 관찰로 표현하지 않는다.
- 5해상도 × 로그인/A/B **15화면**의 가로 넘침·핵심 행동 hit-test/48px 검사 PASS. 12회 storage boundary에서 전용 prefix 밖 호출0·합성 운영 bytes 동일. page error0·예상 밖 외부 요청0. **총 console error2**는 의도한 revoke 재시도의 HTTP403 두 건이며 원문 path/status를 결과에 보존했다. 예상 밖 console error0이지 전체 오류0은 아니다. root는 새 결과의375 로그인·844 가로 연결 화면을 직접 확인했다.
- 이 수정 후 `test:alpha-auth` **20/20** (auth14·SQL 정적4·SDK patch2), `npm test` **2255/2255**, production build **PASS**. npm 13:31:45–13:33:20 KST, build 13:31:58–13:34:35 KST, 실행 중 source 변경0. 두 실제 검사 스크립트의 독립 strict 검사도 PASS. 전체 통합1801·portable4·npm audit는 이번에 재실행하지 않았다.
- 비메일 검사 전후 원격 조회: Auth users **4→4**, account rows **2→2**, canonical empty accounts **2→2**, private objects **0→0**. 테스트용 생성 파일과 이번에 만든 세션만 정리했다. 메일 요청·Auth 설정 변경·운영 쓰기·배포0. 계정 자료의 내용 동등성은 API 재조회 비교로 검사했고 단순 건수만으로 주장하지 않았다.
- 다음 M3는 기존 A04–A09/A18–A19와 실제 저장 port·UI 단일 쓰기 지점을 대조해 [착수 순서](alpha-transition.md#921-후속-진행-원칙과-m3-착수-순서)를 정리했다. 이번에 M3 코드·migration을 적용하거나 기존 `/my` writer를 교체하지 않았다.

### 9/21 14시 후속 — 복구 링크 실패와 기존 세션 분리

사용자가 복구 이메일을 받았다고 알렸고, Codex에서 요청한 링크를 Chrome에서 열었다고 설명했다. 제공된 화면에는 기존 계정의 연결 성공과 링크 확인 실패가 함께 표시됐다. 그 메일이 앞서429로 거절된 요청에서 발송됐다고 추정하지 않는다. [공식 PKCE 문서](https://supabase.com/docs/guides/auth/sessions/pkce-flow)의 브라우저별 verifier 조건과 설치된 SDK 동작을 대조했다. 다른 브라우저의 기존 로그인은 이번 링크 검증 성공의 근거가 아니다.

**실행 순서:** callback 대기/실패와 계정 상태 분리 → 기존 세션 보존·정상 복구 회귀 → 5해상도·실제 계정 검사 → 현재 원장 갱신. 이메일 재발송·실제 비밀번호 변경·Auth 설정·DB migration·운영계·배포는 범위 밖으로 유지했다.

- `AlphaAuthPanel.tsx`: 대기/실패 중 SDK의 기존 session 이벤트로 계정 조회나 복구 폼을 열지 않는다. 실패 화면은 안내와 `/alpha`로 돌아가기만 제공하며 SDK에 저장된 기존 세션과 복구 마커는 지우지 않는다. 새로고침과 뒤늦은 `TOKEN_REFRESHED`에서도 닫힌 화면을 유지한다.
- 정상 교환은 공개 `PASSWORD_RECOVERY` 이벤트의 정확한 session token을 교환 결과와 대조하고, 공유 promise에 session/recovery 판정을 보관한 뒤 적용한다. 내부 비공개 반환 필드에 의존하지 않는다. 비밀번호 변경은 현재 owner와 복구 owner가 같아야 실행하며, 대기/실패 중 폼·OAuth 실행도 막는다. StrictMode effect replay는 공유 ref/promise와 SDK 이벤트 순서에 대한 코드 검토 근거다. production 브라우저가 StrictMode 재실행까지 검증했다고 주장하지 않는다.
- 변경 파일: `components/flow/integrated-poc/AlphaAuthPanel.tsx`, `AlphaAuthPanel.module.css`, `tests/e2e/alpha-auth.browser.ts`, `alpha-auth.fixture.ts`, `scripts/alpha/m2-browser-live.ts`. 상태 문서는 본 원장과 `alpha-transition.md`, `current-checkpoint.md`, `docs/STATUS.md`를 갱신했다. 기본 `/my`·기존 Program writer·DB 계약은 바꾸지 않았다.

| 시나리오 | 판정과 증거 범위 |
| --- | --- |
| B 로그인 + verifier 없는 링크 | mock/실제 B 세션 모두 PASS. 계정 성공·폼 없음, session bytes 보존, `/alpha` 명시 복귀 후 B 정상 |
| B 복구 마커까지 남은 실패 링크 | mock PASS. B 비밀번호 입력창·변경 요청0, 실패/reload 중 마커 보존. 명시 복귀 후 원래 B 복구 상태 재개 |
| 지연 교환 중 기존 B, 이후400 실패 | mock PASS. 대기/실패 중 계정 read·생성·비밀번호 변경·로그아웃·복구 메일 요청0 |
| 실패 후 뒤늦은 refresh와 reload | mock PASS. 실패 제목 유지, B 계정/폼 없음, 계정 요청0 |
| 기존 B에서 정상 A 복구 | mock PASS. A 복구 상태·reload 유지, 변경 요청 owner는 A만, B 노출0. 실제 비밀번호는 변경하지 않음 |
| 일반 PKCE 로그인 | mock PASS. 복구 화면으로 오인하지 않고 `/alpha` 계정 화면으로 연결 |
| 실제 개발 B + 합성 callback code | 실브라우저 PASS. verifier 없는 별도 브라우저 조건을 재현. 실제 이메일 token 소비/발송0, 실패/reload에서 공개 Auth settings GET 외 요청0 |

**자동 검증과 실패 이력**

- `test:alpha-auth` **20/20 PASS** (auth14·SQL 정적4·SDK patch2). `npm test` 최종 **2255/2255 PASS**, 14:10:05–14:10:29 KST, skip/cancel0·실행 중 source 변경0·verified exit0. 근거 `output/integrated-product-poc/npm-test-2026-09-21T05-10-05-873Z.json`.
- production build 최종 **PASS**, 14:09:55–14:10:45 KST, 실행 중 source 변경0·verified exit0. 첫 빌드는 SDK 공개 응답 타입에 `redirectType`이 없어 실패했다. 이를 공개 이벤트 기반으로 수정했다. 실패 `build-2026-09-21T05-08-21-028Z.json`과 성공 `build-2026-09-21T05-09-55-657Z.json` 모두 보존한다.
- mock 브라우저 최종 **27/27 PASS**, 44.8초, skip/retry/flaky0. 이전22/22는 `output/playwright/alpha-m2-before-callback-20260921-1415/`, 첫26 PASS/1 FAIL은 `alpha-m2-callback-first-20260921/`, 최종은 `alpha-m2/results.json`에 보존했다. 첫 실패는 기존 복합 로그아웃 테스트가 HTTP 실패 처리 전 session 값을 읽은 race다. trace에서 값 조회가 HTTP500 console 도착보다 앞선 것을 확인했고, 실패 안내·재시도 버튼 활성화를 기다린 뒤 동일한 session-null 조건을 검사한다. 판정 조건을 완화하거나 실패를 숨기지 않았다.
- 실제 Windows Chromium **71/71 PASS**, 14:14:32–14:14:45 KST. `output/playwright/alpha-m2-live/2026-09-21T05-14-32-289Z/results.json`. 실제 Supabase HTTP38건, 응답 mock0. 이전57개의 로그인/전환/로그아웃·로컬 장애2경로에 callback14확인을 추가했다. 테스트 프로필만 사용했고 trace/HAR/credential 저장0, 테스트 session local 정리 PASS. 이 실행기는 메일·가입·비밀번호 변경 요청을 아예 차단한다.
- 실제 브라우저 스크립트 strict TypeScript 검사 PASS. 기존 통합1801·portable4·전체760 E2E·npm audit는 이번 callback 수정 후 재실행하지 않았으며 이전 근거와 구별한다.
- 문서 검사 **4/4**, 필수16·로컬 링크6360 PASS. scoped closeout·`git diff --check`를 확인했고 staged0이다. 최종 npm/build의 기록된 소스 hash는 인계 시점과 전부 일치했다. closeout reporter가 untracked 상위 폴더로 묶는 실제 브라우저 스크립트도 별도로 열어 검토했다.

**화면·UX 평가와 데이터 경계**

- `flow-ux-review`의 제거 우선 검토: 실패 상황의 계정 성공/초기화/비밀번호 폼과 중복 상태를 제거했다. 남긴 것은 실패 원인에 맞는 같은 브라우저·프로필 안내, 돌아가기, 별도 저장인 기존 로컬 PoC 링크다. 사용자 과제는 복구 실패 인지와 안전한 복귀이며, 콘텐츠 충실도·export 이식성은 이 인증 수정에 해당하지 않는다. 기존 성공 화면 혼재는 Blocking 발견 사항이고 수정/회귀를 통과했다. 관찰 사용자 검증 점수로 환산하지 않는다.
- mock은 로그인/가입/복구 요청/빈 계정/연결/실패 ×5해상도 **30화면**, 실제는 로그인/A/B/실패 ×5해상도 **20화면**이다. 390×844·375×812·844×390·1024×768·1440×900 모두 가로 넘침0, 핵심 행동48px 이상·hit-test PASS. 실패 화면의 키보드 Enter 복귀도 확인했다. root는375×812 mock 실패와844×390 실제 계정 조건의 실패 캡처를 직접 확인했다.
- mock boundary **43회**, 실제 **15회**에서 prefix 밖 `setItem/removeItem/clear` 호출0, 합성 운영 `flow:saved-plans`·`flow:completion:v1`과 다른 앱 fixture bytes 동일. 실제 사용자의 전체 브라우저 저장소나 운영 DB를 전수 비교했다는 뜻은 아니다.
- mock/실제 page error0·예상 밖 console/외부 요청0. 실제 총 console error는 의도한 세션 해제 재시도403 **2건**이다. mock의 의도한 HTTP 오류는 각 boundary attachment에 기록하며 누적 attachment 중복을 고유 오류 건수로 합산하지 않는다.
- 실제 Android Chrome/iOS Safari **미실행**, 관찰 사용자 **0명**. 사용자가 제공한 결함 화면은 제보 근거이며 별도 관찰 연구로 세지 않는다. commit·push·PR·merge·Preview·Production **미실행**. 운영 프로젝트와 Auth 설정 변경0, 실제 메일/비밀번호 변경0.

**남은 조건:** 실제 이메일의 같은 브라우저 복귀→사용자 직접 새 비밀번호 설정은 계속 보류다. 자연 JWT 시간 만료·Google 외부 설정·실기기도 미실행이다. 이번 수정 완료가 M2 전체 완료는 아니다. 로컬 서버는 수정된 production build를 `/alpha`에서 제공하도록 다시 실행했다.

### 9/21 14:36 후속 — 복구 대상 고정·두 탭 경합·자연 만료 검사 착수

**재현한 결함과 수정**

- A 복구 폼을 연 뒤 공유 저장소만 B 로그인으로 바꾸고 broadcast 도착 전에 제출하면 SDK `updateUser`가 B의 현재 token을 읽었다. 가짜 Auth 응답을 사용하는 Chromium 검사에서 실제로 `updatedOwners=['b']`를 확인했다. 실패 원본은 `output/playwright/alpha-m2-owner-race-reproduced-20260921/`에 보존했다. 실제 A/B 계정 비밀번호는 바꾸지 않았다.
- `alpha-auth/recovery-password.ts`에서 복구 시작 시점의 config·owner·token을 복사한다. 같은 token으로 서버 identity를 확인하고 비밀번호 요청을 보내며, SDK에 응답 session을 다시 저장하지 않는다. `AlphaAuthPanel.tsx`는 요청 전/identity 확인 후/응답 후에 owner·epoch·로그아웃 상태·공유 저장소를 검사한다. 계정이 바뀌면 입력값을 비우고 계정 화면도 닫으며 **현재 계정 확인** 링크만 남긴다.
- 이미 A의 요청이 전송된 뒤 B로 전환하면 A의 비밀번호 변경은 서버에서 끝날 수 있다. 이를 취소했다고 주장하지 않는다. B의 비밀번호를 바꾸거나 B 세션을 늦은 A 세션으로 덮어쓰는 것은 막는다. `flow-ux-review`의 제거 우선 기준으로 변경된 계정에서 낡은 비밀번호 폼·성공 표시를 제거했고, 안내도 “변경되지 않았다”고 단정하지 않는다.
- 변경 파일은 위 helper, `AlphaAuthPanel.tsx`, `alpha-auth/auth.test.ts`, `tests/e2e/alpha-auth.browser.ts`, `alpha-auth.fixture.ts`, 실브라우저 실행기의 source hash 목록이다. 별도로 자연 만료 실행기 `scripts/alpha/m2-expiry-live.ts`, 시간/응답 판정 계약 `m2-expiry-contract.ts`와 테스트를 추가했다. 기본 `/my`, 기존 Program writer, DB schema·Auth 설정·운영 프로젝트는 바꾸지 않았다.

**이번 실행 결과**

| 검사 | 결과와 범위 |
| --- | --- |
| 인증 표적 검사 | `npm run test:alpha-auth` **24/24 PASS**. 새 복구 helper 검사4개 포함. 실제 비밀번호 변경 아님 |
| 만료 실행기 계약 | **3/3 PASS**, 별도 strict TypeScript 검사 PASS. 시간 판정·손상 JWT·명시적 expired 오류를 검사하며 실제 만료 성공으로 세지 않음 |
| 전체 npm test | **2255/2255 PASS**, 14:29:04–14:30:14 KST, skip/cancel0·실행 중 소스 변경0. `output/integrated-product-poc/npm-test-2026-09-21T05-29-04-534Z.json` |
| production build | **PASS**, 14:28:53–14:30:47 KST, 실행 중 소스 변경0. `output/integrated-product-poc/build-2026-09-21T05-28-53-992Z.json`. 배포 아님 |
| mock 브라우저 | **30/30 PASS**, 88.97초, skip/retry/flaky0. `output/playwright/alpha-m2/results.json`. 직전27회는 `alpha-m2-before-owner-race-20260921/` 보존 |
| 실제 개발 계정 브라우저 | **71/71 PASS**, 14:35:44–14:35:59 KST. `output/playwright/alpha-m2-live/2026-09-21T05-35-44-292Z/results.json`. 실제 Supabase HTTP38건·응답 mock0, 메일/가입/비밀번호 변경 요청은 차단 |
| 문서·범위 점검 | `docs:check` **4/4 PASS**, 필수16개·로컬 링크6360개. scoped closeout과 diff 확인, staged0. closeout 자체는 테스트 통과 근거가 아님 |

- 추가 mock 시나리오3개: A 폼 제출 직전 B 공유 세션 교체 시 비밀번호 요청0 / 이미 전송된 A 응답 지연 중 B로 교체해도 B session·복구 마커 보존 / 같은 context의 **실제 앱 페이지2개**에서 A 로그아웃→B 로그인과 지연 A DB 응답 무시. 마지막 검사는 두 실제 탭을 사용하지만 Auth/DB 응답은 합성이므로 실제 Supabase 두 기기 검증으로 표현하지 않는다.
- mock **35화면**(7상태×5해상도), 실제 **20화면**을 검사했다. 390×844·375×812·844×390·1024×768·1440×900에서 가로 넘침0, 지정 핵심 행동48px 이상·hit-test PASS, 새 계정 확인 링크의 키보드 Enter 복귀 PASS. root가375×812·844×390의 계정 변경 화면을 직접 확인했다.
- mock boundary **52회**, 실제 **15회**에서 전용 prefix 밖 `setItem/removeItem/clear` 호출0·합성 운영 key/value bytes 동일. page error0·예상 밖 console/외부 요청0. 실제 console403 **2건**은 의도한 세션 해제 재시도이며 숨기거나0으로 보고하지 않는다. 사용자 브라우저의 모든 원래 데이터나 운영 DB의 전수 비교는 아니다.
- 실제 Android/iOS 검사 **미실행**, 관찰 사용자 **0명**. 실제 메일·비밀번호 변경0, commit·push·PR·merge·Preview·Production **미실행**. 로컬 서버는 수정된 build로 `http://localhost:3104/alpha`에서 다시 실행했다.

**자연 JWT 만료 — 14:36 당시 착수 기록 (최신 판정은17:08 최종 검증 참조)**

- 14:23:26 KST에 개발 계정의 실제 JWT로 별도 실행을 시작했다. 자동 refresh 없는 프로세스 안에서 원래 token을 보관하며 Auth 설정·JWT 내용·시계를 바꾸거나 사전 logout으로 만료를 대신하지 않는다. 공식 [세션 설명](https://supabase.com/docs/guides/auth/sessions)에 따라 access token의 시간 만료와 refresh 가능한 로그인 세션을 구분한다.
- 만료 후90초를 포함한 판정 시각은 **2026-09-21 15:24:57 KST**다. 현재 사전 검사 **6 PASS/0 FAIL**, `completed=false`, `stage=waiting-natural-expiry`다. 이6개를 자연 만료 성공으로 세지 않는다. 실행 프로세스 PID35160의 동작을14:35에 확인했다.
- 로컬 근거: `output/alpha-m2/natural-expiry-2026-09-21T05-23-26-375Z.json`. 이후 Auth/REST/RPC/Storage가 원래 token을 명시적인 만료 오류로 거절하는지, adapter가 `session-expired`로 닫히는지, refresh·재로그인 후 같은 계정 자료가 유지되는지 확인하고 최종 결과를 별도로 기록한다. 실제 token/비밀번호는 근거 파일에 기록하지 않는다.
- 착수 전 개발계 읽기 전용 조회는 사용자4·account2·private object0이었다. 자연 만료 검사는 아직 끝나지 않았으므로 사후 불변·정리를 선행 주장하지 않는다. 이메일 복구는 사용자 지정 시점까지 보류한다.

### 9/21 14:50 종료 조건 대조 — 비메일 검사와 전체 완료 구분

14:50에 실제 인증·권한·복구·전환·만료·운영 차단 요구를 대조한 표를 이후 성공 근거로 갱신했다. 당시 메일 검증은 순서 보류였지만, 사용자 복구·실제 가입/확인 서버 기록·새 비밀번호 재로그인·자연 만료 성공으로 해당 조건을 충족했다. 보류 자체를 PASS로 바꾼 것이 아니며 다음 단계의 저장·다기기 동기화를 구현했다고 주장하지 않는다.

| M2 요구 | 증거와 판정 | 남은 검증·경계 |
| --- | --- | --- |
| M1 계정 계약을 잇는 인증 adapter | **구현·검증 PASS**. 고정 token으로 Auth identity 확인 후 owner별 빈 계정 읽기/생성. 실제 API49와 브라우저71, 단위 검사 | 실제 편집·CAS·Undo·동기화는 M3 |
| 개발 migration·RLS·grants | **PASS**. 원격 version20260920234519, 강제 RLS, SELECT/INSERT만 허용, RPC invoker. 실제 SQL 역할9·HTTP 음성 검사 | 이번 후속은 read-only 확인이며 migration 재실행 아님 |
| 두 실제 계정·anonymous 접근 차단 | **PASS**. API49·SQL9·anonymous7 및 비메일30의 명시 범위. 자기/타인/파일/위조·서버 해제 검사 | 삭제 파일 차단을 사용자 계정 삭제 검사로 확대하지 않음. 사용자 삭제 미실행 |
| 이메일 로그인·계정 전환·reload | **PASS**. 실제 브라우저71, HTTP38·응답 mock0 | 최초 빈 계정 버튼은 mock, 실제 생성은 API 검사. 이 둘을 실제 신규 계정 UI 전체 경로로 합치지 않음 |
| 두 탭·지연 응답·복구 owner 경합 | **mock PASS**, 실제 앱 페이지2개로 전환/늦은 응답 검사. 비밀번호 helper의 고정 token·세션 무기록도 단위/브라우저 검사 | 실제 서버의 두 탭 경합이나 실제 비밀번호 변경까지 검증한 것은 아님 |
| 가입·메일 확인·복구 성공 전체 경로 | **두 계정의 실제 `/signup`200·`/verify`303 `user_signedup` 서버 기록 확인. 복구는 사용자 직접 성공 확인, 새 비밀번호 자동 재로그인71/71 PASS** | 당시 가입 화면 조작·callback 렌더링은 에이전트 직접 관찰이 아님. 이 증거를 일반 사용자 SMTP 서비스 준비나 실제 신규 계정 화면 전체 관찰로 확대하지 않음 |
| 실제 JWT 자연 만료·재인증 | **23/23 PASS**,17:06:54 완료·exit0. Auth/REST/RPC/Storage 만료 거절·adapter 닫힘·refresh/재로그인·동일 자료·정리 확인 | 첫 실행11/1과 두 번째 외부 재설정에 따른 검증 무효는 원본 보존. 실제 시계·원래3600초 TTL 사용 |
| 운영 환경·데이터 차단 | **M2 경계 PASS**. 잘못된 ref/URL·secret·redirect는 네트워크 전 거절, auth27에 포함. 원격 도구는 개발 ref만 사용 | 실제 배포 환경 gate는 M7·배포 승인 후. 운영 DB 전수 비교나 배포 검증은 아님 |
| 기존 `/my`·PoC 보존 | **PASS**. 이번 보호 경로의 HEAD diff0, portable4와 mock/실계정 저장소 경계 검사 | 원래 사용자 브라우저 전체 자료 대신 격리 context의 합성 운영 bytes를 비교 |
| Google 우선·이메일 대안 | **이메일 대안 적용**. Google 미설정이면 버튼 숨김 | OAuth 외부 설정 미실행. 이메일 대안 허용이 실제 메일 검증 면제는 아님 |
| 누구나 가입·무료 검증 | 개발 설정의 신규 가입 허용·이메일 확인 유지,429 제한 관찰. **방향 적용·서비스 검증 부분** | 일반 사용자 가입 성공률·요청 남용 방지 전체 증거는 없음. 임의 트래픽·유료 전환·SMTP 설정하지 않음 |
| 문서·검증·발행 분리 | 정본/로컬 근거 보존, 실제 명령과 mock/real 구분 | 실제 기기/관찰 사용자 검증 미실행. commit/push/PR/merge/Preview/Production 미실행 |

**현재 코드 기준 추가 확인**

- 전체 통합 model/component 재검사는 **185파일·1807/1807 PASS**,14:45:03–14:52:28 KST, skip/cancel0·감시된 소스 변경0·verified exit0이다. `output/integrated-product-poc/new-tests-2026-09-21T05-45-03-600Z.json`. 오전1801 결과와 합산하지 않는다. 이 실행의 source inventory는 Program 코드·테스트와 route seam이며 `scripts/alpha`는 별도 표적/strict 검사로 확인했다.
- 만료 실행기 계약3개를 `package.json`의 기존 `test:alpha-auth`에 연결했다. CI의 기존 오프라인 단계가 자동으로 포함한다. 표적 검사는 **27/27 PASS**(Auth18·SQL 정적4·만료 계약3·SDK patch2), raw live 실행기를 CI에서 실행하지 않는다. 실제 GitHub CI 실행은 하지 않았다.
- 통합 strict 검사는 **411 진입점/444 소스·진단0**, 검사기8/8 PASS, 감시된 소스 변경0이다. `output/integrated-product-poc/targeted-types-2026-09-21T05-46-02-021Z.json`. 실제 실행기3파일의 별도 strict 검사도 PASS다.
- 기존 portable E2E는 **4/4 PASS**,59.4초, skip/retry/flaky0. `output/playwright/alpha-m2-portable-20260921-1450/results.json`. 기존 사용자 서버3104를 유지하고 별도3694 서버·새 context를 사용했다. exact-query/손상 fallback, 개인 일정·완료·Undo·reload, 공개 사본 생성, native append의 원문 행 identity를 확인했다. 가로 넘침5종 검사나 전체 기존 E2E를 대신하지 않는다.
- dependency audit은14:45:24–14:45:41 KST **취약점0**, source drift0·verified exit0. `output/integrated-product-poc/audit-2026-09-21T05-45-24-729Z.json`.
- read-only 개발 SQL 재확인: 사용자4·계정2·canonical 빈 계약2·private object0. table RLS+FORCE ON, anon SELECT/EXECUTE 없음, authenticated UPDATE/DELETE 없음, RPC invoker·private bucket 유지. `output/alpha-m2/boundary-review-20260921-1447.json`은 당시 snapshot이며 자연 만료 검사 완료 후 사후 상태를 대신하지 않는다.
- 현재 Security Advisor는 기존 **WARN1 `auth_leaked_password_protection`**뿐이다. 유료 보호 설정을 자동 활성화하지 않았으며 dependency audit0과 별개로 기록한다.
- 문서 검사4/4·필수16개·로컬 링크6361개 PASS. 이번 runtime 변경은 없고 test script 연결과 증거/상태 갱신만 수행했으므로14:30의 npm2255·build 근거를 이번에 재실행한 것으로 세지 않는다. 자연 만료 프로세스의 실시간 대기는 계속 진행 중이며, 메일 보류 때문에 목표 범위를 줄이거나 전체 완료로 처리하지 않는다.

### 9/21 15:30 후속 — 첫 자연 만료 판정·검사기 보완·두 번째 실행

- 첫 실행은15:24:58 KST에 **11 PASS/1 FAIL**, `completed=false`, exit1로 끝났다. 원래 결과 `output/alpha-m2/natural-expiry-2026-09-21T05-23-26-375Z.json`을 수정하지 않았다. Auth403·REST401·RPC401은 명시적 만료 거절로 통과했지만 Storage400의 오류 문구를 검사기가 인식하지 못해 중단했다.
- 개발 Dashboard의 읽기 전용 Storage 로그(ID `a9897098-ec83-4840-a3e1-bf9389eceab4`)에서 동일 시각의 `ERR_JWT_EXPIRED`, `JWTExpired`, `claim=exp`, `"exp" claim timestamp check failed`를 확인했다. Storage가 만료 token을 허용한 문제가 아니라 **검사기의 판정 누락**이다. 서버 로그 확인은 별도 증거이며 첫 자동 실행을 PASS로 소급 변경하지 않는다. 비식별 진단 근거는 `output/alpha-m2/expiry-diagnosis-20260921.json`이다.
- 첫 실행은 Storage 검사 뒤 adapter 만료 처리·refresh 이후 데이터 보존·B 전환·재로그인 검사를 수행하지 못했다. 정리 단계에서 테스트 A 세션의 refresh와 local 로그아웃은 성공했지만, 이를 누락된 전체 복구 시나리오 성공으로 계산하지 않는다. 읽기 전용 개발 조회는 사용자4·계정2·canonical 빈 계약2·private object0을 유지했다.
- `m2-expiry-contract.ts`는 실제 관찰한 정확한 `exp` 오류 문구만 추가로 인식한다. `InvalidJWT`만 있거나 서명/`iat`/`nbf` 오류·500 응답이면 여전히 실패다. 오류 근거에는 제한된 error code와 reason만 남기고 원문 응답·token·개인정보를 쓰지 않는다. `m2-expiry-live.ts`는 네 서비스의 거절 중 하나가 실패하더라도 나머지 시나리오를 수집하며, 실패가 있으면 최종 exit1을 유지한다.
- 보완 후 `npm run test:alpha-auth` **28/28 PASS**(Auth18·SQL 정적4·만료 계약4·SDK patch2), 만료 실행기와 계약 테스트의 독립 strict TypeScript 검사 PASS. 앱 runtime·Auth 설정·DB schema는 바꾸지 않았으므로 앞서 실행한 npm2255·build·브라우저 검사를 이번에 다시 실행한 것으로 세지 않는다.
- 두 번째 실제 실행은 **15:29:41 KST**에 시작했다. 원래 TTL과 token·서버 시계를 유지하고 자동 refresh나 사전 revoke 없이 기다린다. 판정 예정은 **16:31:12 KST**(만료 후90초), 현재 사전6 PASS/0 FAIL·`completed=false`·`stage=waiting-natural-expiry`다. PID21812와 실행 세션34468의 동작을15:30에 확인했다. 결과 파일은 `output/alpha-m2/natural-expiry-2026-09-21T06-29-41-705Z.json`이다. 사전 검사는 자연 만료 성공이 아니다.
- 메일 재요청·실제 비밀번호 변경·사용자 삭제·설정/migration·운영 접근·배포는 하지 않았다. 실제 이메일 복구는 계속 사용자 보류이며 이번 실행이 끝나더라도 그 항목을 PASS나 M2 전체 완료로 바꾸지 않는다.

### 9/21 15:59 후속 — 사용자 복구 성공·로컬 검증 정보 불일치

- 사용자가 A의 비밀번호 재설정과 새 비밀번호 재로그인 성공을 명시 확인했다. 이 민감한 단계는 사용자가 직접 수행했으며, 에이전트가 비밀번호 입력·제출하거나 성공 화면을 관찰했다고 쓰지 않는다. 기존 “메일 복구 전부 미실행” 상태를 현재 사실로 유지하지 않는다. 자동 신규 가입·메일 전달 전체 경로는 여전히 별도 미검증이다.
- 읽기 전용 개발 조회에서 A의 최근 로그인15:53:22, 갱신15:53:39를 확인했다. A의 남은 세션 생성 시각은15:53:22 하나였고 두 번째 자연 만료 실행의15:29:42 세션은 없었다. 사용자 재설정 뒤 이전 세션이 사라진 상태이므로 해당 실행의 자연 만료 후 refresh 성공을 기대할 수 없다. 비밀번호 hash는 조회하지 않았다.
- PID21812의 실행 명령이 해당 만료 실행기임을 확인한 뒤15:57:44에 중단했다(exit1). 첫 실패와 두 번째 사전6PASS 원본은 그대로 보존한다. 두 번째 파일의 마지막 `waiting-natural-expiry`는 프로세스가 살아 있다는 증거가 아니며, `preExpiryRevocation=false`도 실행기가 직접 revoke하지 않았다는 한정된 값이다. 외부 재설정 이후의 검증 적합성을 증명하지 않는다.16:31:12 판정 예고는 취소했다.
- 사용자가 ignored 로컬 테스트 파일을 갱신했고 수정시각15:55:53을 확인했다. 기존 Playwright 실행기로 새 프로필에서 재로그인을 검사했지만 `login-A`에서 HTTP400으로 종료됐다. **완료false·사전 확인8개·assertion 실패0·exit1**이므로8/8 PASS라고 보고하지 않는다. 근거 `output/playwright/alpha-m2-live/2026-09-21T06-57-35-488Z/results.json`.
- 민감값을 출력하지 않는 제한된 후속 요청으로 `invalid login credentials`를 확인했다. API key 오류·rate limit·미확인 이메일·CAPTCHA 오류는 아니었다. 파일의 A/B 주소 일치·비밀번호 값 존재·양끝 공백 없음만 검사했으며 비밀번호 값은 출력하지 않았다. 반복 요청을 중단하고 사용자에게 A의 저장값 재확인을 요청했다. 사용자 본인의 재로그인 성공과 로컬 파일을 사용하는 자동 로그인 실패를 서로 다른 사실로 기록한다.
- 비식별 합성 근거는 `output/alpha-m2/recovery-followup-20260921-1559.json`이다. 개발계 사용자4·계정2·private object0 유지. 이 후속의 에이전트 메일 발송·비밀번호 변경·설정/migration·운영 접근·배포는0이다. 현재 만료 실행 프로세스는 없으며, 올바른 로컬 자격증명으로 로그인 확인 뒤 새 테스트 세션을 시작한다.

### 9/21 16:05 후속 — 새 비밀번호 로그인 확인·자연 만료 재시작

- 사용자가 앞선 로컬 비밀번호 오입력을 인정하고 수정·저장했다고 알렸다. 파일 수정시각16:04:09를 확인했다. 비밀번호·원문 인증 응답은 출력하거나 증거 파일에 기록하지 않았다.
- 기존 실제 브라우저 실행기를 재실행해 **71/71 PASS**,16:05:10–16:05:23 KST, exit0을 확인했다. 근거 `output/playwright/alpha-m2-live/2026-09-21T07-05-10-930Z/results.json`. 두 실제 계정 로그인·전환·reload·logout·실패 callback·저장소 장애 재시도와 테스트 세션 정리를 통과했다. Supabase 실제 HTTP38건·응답 mock0,5해상도20화면,15회 저장소 경계에서 prefix 밖 쓰기0·합성 운영 bytes 동일. page error0, 의도한 logout403 console2건·예상 밖 오류0이다. 실제 기기 검사나 신규 관찰 사용자 연구로 세지 않는다.
- 사용자에게 최초 두 계정의 생성 경로(FlowMe 가입→메일 확인인지 Supabase 관리 화면인지)를 물었다. 이는 가입 요구의 증거 범위를 구분하기 위한 질문이며 새 가입·메일 발송 요청은 아니다. 사용자 직접 복구 성공과 자동 재로그인 성공은 별도 근거로 유지한다.
- 새 자연 만료 실행을 **16:05:21 KST**에 시작했다. PID21908·실행 세션50785의 동작을 확인했고, 사전6 PASS/0 FAIL·`completed=false`·`stage=waiting-natural-expiry`다. 판정 예정은 **17:06:51 KST**, 근거 `output/alpha-m2/natural-expiry-2026-09-21T07-05-21-078Z.json`. 앞선 두 실행을 덮어쓰지 않으며 TTL·token·시계를 바꾸거나 사전 revoke하지 않는다.
- 이번 후속은 사용자가 갱신한 자격증명으로 기존 검사를 실행하고 상태를 기록한 작업이다. 앱·검사기 소스·Auth 설정·DB schema 변경0, 에이전트 메일 요청·비밀번호 변경0, commit/push/PR/merge/Preview/Production0. 사용자 파일의 비밀번호 수정은 사용자가 직접 한 작업이다.

### 9/21 16:40 후속 — 실제 가입·메일 확인의 서버 근거 확보

- 개발계 `auth.users`의 생성·이메일 확인 시각만 읽은 뒤, Dashboard Auth 로그에서 같은 계정의 `/signup`과 `/verify`를 대조했다. 기존 connector에 로그 조회 기능이 없어 브라우저로 읽기 전용 검색했다. Gmail·다른 서비스·운영 프로젝트를 열거나 새 계정/메일/인증 요청을 만들지 않았다.
- A:12:47:05의 `POST /signup` **200 / `user_confirmation_requested`**,12:47:21의 `/verify` **303 / `user_signedup`**. B:12:50:12의 가입 요청 **200**,12:52:21의 확인 **303 / `user_signedup`**. 각 raw 로그의 계정 이메일이 해당 테스트 계정과 일치하는지만 비교하고 이메일·IP·token·원문 로그는 증거 파일에 복사하지 않았다. 네 로그의 referer는 모두 `http://localhost:3104/auth/callback`이었다.
- 확인 시각은 두 계정의 `email_confirmed_at`과 일치했다. 따라서 **두 실제 계정의 가입·이메일 확인이 서버에서 성공했다는 근거**는 확보했다. 당시 가입 폼 조작이나 최초 callback 렌더링을 에이전트가 직접 관찰했다고 주장하지 않는다. 이전 callback 결함·수정과 후속 재로그인71 검증도 별도 이력으로 유지한다.
- 비식별 근거는 `output/alpha-m2/signup-server-evidence-20260921-1640.json`에 계정 별칭·시각·log ID·HTTP 상태·action만 기록했다. 사용자에게 보낸 최초 가입 경로 질문은 UI 출처를 보충하기 위한 것이며, 이 서버 성공 근거를 없애거나 새 메일 요청을 강제하는 gate로 사용하지 않는다. 기본 SMTP의 일반 사용자 배달 범위/한도는 서비스 공개 준비 때 별도로 검증해야 한다.
- 자연 만료 실행 세션50785는16:40에 정상 응답을 확인했다. 판정 전이므로 사전6PASS를 전체 만료 성공으로 바꾸지 않는다. 이번 후속의 소스·설정·migration·배포 변경0이다.

### 9/21 17:08 최종 검증 — 자연 만료 완료와 M2 종료

- 실제 만료 실행은16:05:21 시작,17:06:51 원래 token 만료 후90초 도달,17:06:54 종료했다. **23/23 PASS·completed=true·exit0**. 근거 `output/alpha-m2/natural-expiry-2026-09-21T07-05-21-078Z.json`. 원래 TTL3600초·실제 시계를 사용했으며 token 편집·사전 revoke·Auth 설정 변경0이다. 실행기·계약·adapter의 현재 hash3개도 기록과 일치했다.
- Auth **403/bad_jwt**, REST와 RPC 각각 **401/PGRST303**, Storage **400/AccessDenied + exp claim 실패**로 자연 만료를 명시 거절했다. 임의400/403을 만료 성공으로 취급하지 않았다. adapter read/open은 계정 자료 없이 `session-expired`로 닫혔다.
- 같은 세션의 refresh는 새 token과 원래 owner/session을 유지하고 계정 내용 hash를 그대로 복구했다. B도 별도 owner의 공간만 읽었다. A의 명시 local 로그아웃 뒤 새 세션 재로그인에서도 기존 자료가 같았고, 테스트 A/B 세션 local 정리를 모두 통과했다. password·token·원문 응답은 증거 파일에 없다.
- 17:07:54 개발계 읽기 전용 사후 확인: 사용자4·계정2·canonical 빈 계약2·private object0. RLS+FORCE, anon SELECT/RPC EXECUTE 없음, authenticated SELECT/INSERT만 허용·UPDATE/DELETE 없음, RPC invoker·private bucket·migration20260920234519 유지. 검사 세션 생성 시각대의 잔여 세션0. `output/alpha-m2/boundary-review-20260921-final.json`에 기록했다. 이 건수 확인은 계정 내용 비교나 운영 DB 전수 비교를 대신하지 않는다.
- Security Advisor는 기존 **WARN1 `auth_leaked_password_protection`**만 유지했다. 유료 보호 설정·결제는 하지 않았다. 전체 npm2255·통합1807·build·strict의 각444개 감시 소스와 새 비밀번호 브라우저71의6개 소스 hash는 현재 코드와 모두 일치했다. 만료 실행기 표적28·strict와 앱 회귀를 구분하며 이전 검사를 이번에 재실행한 것으로 세지 않는다.
- 원래 목표의 개발 Auth/adapter, migration/RLS/grants, 두 실제 계정·anonymous의 SQL/API 권한 음성, 전환·만료·운영 차단, 필요한 로그인/복구, 외부 잔여 준비 기록을 항목별로 재대조했다. 독립 읽기 전용 검토에서도 실제 가입 서버 기록·사용자 복구·새 비밀번호 재로그인 이후 추가 개발 M2 runtime 차단조건은 없음을 확인했고, 남아 있던 자연 만료 검사도 이번에 완료했다. 가입 화면을 직접 관찰해야 한다는 새 gate를 만들거나 원래 목표를 축소하지 않았다.
- 다음은 원장의 **M3 개인공간 편집·실제 저장·동기화**다. M2의 빈 계정 계약을 실제 command/CAS/revision/Undo와 연결하는 단계이며 이번에는 M3 코드·운영 migration·배포를 실행하지 않았다. Google 설정·일반 사용자 메일 전달 범위/한도·남용 방지·실기기·실자료 이관은 각 단계의 잔여 준비로 유지한다.
- 최종 인계에서 인증 표적 검사를 다시 실행해 **28/28 PASS**(26+SDK patch2)를 확인했다. 문서 검사도 **4/4·필수16·로컬 링크6360 PASS**, scoped closeout·실제 변경 검토·`git diff --check` PASS, staged0이다. 이 후속의 변경은 검증 근거와 상태 문서이며 앱 소스는 기존 성공 build와 일치한다. 전체 기존 E2E760개나 실제 GitHub CI를 새로 실행했다고 주장하지 않는다.

### 구현 파일 목록

| 묶음 | 구현·경계 | 파일 |
| --- | --- | --- |
| 환경·저장·callback | 개발 ref/URL·local redirect·publishable key만 허용, 운영/누락 설정 거절. PKCE query allowlist. SDK와 복구/로그아웃 상태는 PoC prefix 안에만 저장 | `lib/flow/integrated-poc/alpha-auth/config.ts`, `browser-client.ts` |
| 계정 연결 | 요청별 token/config 동결, 실제 Auth identity 확인 후 빈 계정 조회/생성. owner 입력 없음. 계정 전환·후속 요청에서 이전 응답 무시 | `alpha-auth/account-access.ts`, `auth.test.ts` |
| 로그인 화면 | 이메일 로그인/가입/복구/새 비밀번호, 설정된 경우에만 Google 표시. 빈 공간 생성·재조회, 실패/만료/계정 변경. 성공 callback은 `/alpha`로 주소 정리 | `app/alpha/page.tsx`, `app/auth/callback/page.tsx`, `components/flow/integrated-poc/AlphaAuthPanel.tsx`, `.module.css` |
| DB·Storage | M1 canonical 빈 공간만 저장. RLS+FORCE, SELECT/INSERT만 grant. 계정 RPC는 invoker, 세션 확인 helper만 private definer. 파일은 owner와 경로 및 살아 있는 세션 확인 | `supabase/migrations/20260920234519_flowme_alpha_m2_account_boundary.sql` |
| 검증·로컬 실행 | 실제 API와 rollback-only SQL role 검사, anonymous 검사, 로컬 개발 실행, mock 브라우저, CI의 오프라인 검사 | `scripts/alpha/`, `tests/e2e/alpha-auth.*`, `package.json`, `package-lock.json`, `.github/workflows/ci.yml` |
| 상태·운영 안내 | 현재 원장과 경로/도구 설명 갱신, CLI machine-local metadata만 ignore | `alpha-transition.md`, `current-checkpoint.md`, `docs/STATUS.md`, `ROADMAP.md`, `PROJECT_CONTROL.md`, `SERVICE_STRUCTURE.md`, `TOOLING.md`, `.gitignore` |

M1의 선행 미커밋 파일은 보존했다. 위 파일 목록과 M1 변경을 합쳐 M2에서 새로 만든 파일 수로 세지 않는다. 기본 `/my`·기존 ProgramApp의 저장 경로·운영 writer는 수정하지 않았다.

### 개발 DB에 실제 적용한 내용

- 원격 migration version **20260920234519**, 이름 `flowme_alpha_m2_account_boundary`. CLI로 만든 파일의 timestamp는 원격 적용 버전에 맞춰 정렬했다.
- `public.flowme_alpha_accounts`와 no-argument `flowme_alpha_open_account_v1`만 계정 생성/조회에 사용한다. 내용 전체 수정·삭제는 M2에서 허용하지 않는다.
- `flowme_private.live_session_v1`은 JWT의 uid/session_id가 실제 Auth session/user와 맞는지, 만료·금지·삭제·anonymous 여부를 확인한다. 빈 문자열 `search_path`, identity 인자 없음. RPC 자체는 `SECURITY INVOKER`다.
- `flowme-alpha-private`는 private, 1MiB, text/plain·PNG·JPEG만 허용한 **개발 검증용 임시 계약**이다. 제품 파일 정책으로 확정하지 않았다.
- 적용 후 catalog 확인: RLS/FORCE 활성, 계정 정책2+파일 정책4, account/user/object 각각0. Auth 사용자나 원래 데이터를 생성·삭제하지 않았다.
- 초기 Supabase Security Advisor: **lints 0**. 후속 재조회 WARN1은 위 기록을 따른다. 이것만으로 권한 검증 완료라고 판정하지 않는다.

### 시나리오별 판정

| 시나리오 | 현재 판정·증거 범위 |
| --- | --- |
| 미설정/운영 URL·ref/비밀키/외부 redirect | 단위 검사 PASS, 거절 후 API 호출0. 실제 Preview/Production 설정은 미실행 |
| 이메일 로그인→빈 계정 생성→reload→B 전환 | 실제 A/B API 생성·재조회 및 실제 브라우저 reload/전환 PASS. 최초 빈 공간 버튼은 mock 검증이며 실제 API에서 생성한 공간으로 실브라우저를 검사함 |
| 잘못된 비밀번호·확인 불일치·가입 요청 | mock PASS. 확인 불일치 시 signup 요청0·비밀번호 오류 시 DB 요청0. 실제 두 계정 signup200/verify303 서버 기록·이메일 확인 시각 일치. 당시 화면 조작 직접 관찰은 아님 |
| 복구 PKCE→같은 계정 refresh→새 비밀번호→reload | mock PASS. 사용자가 실제 복구·새 비밀번호 재로그인을 완료했고, 갱신한 값으로 실브라우저71/71 PASS. 사용자의 비밀번호 입력·제출은 에이전트가 대행/관찰하지 않음 |
| callback 대기/실패와 기존 로그인·복구 마커 분리 | 14시 후속 mock27·실브라우저71 PASS. 정상 A 복구는 mock, 실제 B 세션 보존·합성 missing-verifier 실패는 실제 HTTP 조건으로 구분 |
| 만료/네트워크/손상 응답·늦은 A 응답 | 단위·mock PASS. 실제 JWT 자연 만료·adapter 차단·refresh/재로그인·자료 보존·정리는23/23 PASS. 네트워크/손상·지연 응답 주입은 실제 장애 관찰과 구분 |
| 로그아웃의 서버 실패·저장 실패·동시 실패 | mock22 PASS. 실제 서버 revoke 성공+로컬 저장소 실패 주입 뒤 같은 화면/reload 재시도는 실브라우저57에서 PASS. 500·동시 장애는 mock 증거로 구분 |
| 실제 anonymous의 table/RPC/insert/private helper/잘못된 token/파일 목록/public URL | **7/7 PASS**. HTTP 각각401/401/401/404/401/200(empty)/400. 빈 bucket의 검사이므로 기존 객체 비밀성 증거가 아님 |
| 실제 A/B REST/RPC·파일 교차 접근·서버 세션 해제 | **49/49 PASS**, 생성한 객체가 있는 상태에서 타인/anonymous/public URL 거절까지 확인 |
| 실제 session fixture 기반 SQL role 음성 검사 | **9/9 PASS**, ROLLBACK. 실제 HTTP와 별도 SQL 역할 시뮬레이션 |
| 5개 해상도·키보드·운영 storage byte 비교 | mock 및 실제 브라우저 PASS, 위 후속과 아래 오전 기록 구분. Android/iOS 실기기 미실행 |

### 검증 중 발견·수정한 결함

1. **SDK import의 전용 영역 밖 쓰기.** auth-js 2.116.0이 custom storage와 별개로 deprecated lock-debug flag를 읽으며 `lswt-*` set/remove를 수행했다. 첫 브라우저 검사에서 실패했다. `postinstall`이 pinned ESM/CJS의 해당 initializer만 끄도록 좁게 패치했다. 인증/암호화/세션/lock 알고리즘은 그대로다. 정확한 버전/소스가 다르면 설치를 중지해 재검토한다.
2. **오래된 build cache.** 패치 후 build 성공만으로는 수정이 반영되지 않았다. 기존 webpack cache가 예전 모듈을 재사용한 것이 chunk와 브라우저에서 확인됐다. 해당 생성 cache만 `.tmp/m2-stale-webpack-20260921`에 보존·이동하고 재빌드한다. 최초/재실패 report를 지우지 않았고 storage assert도 완화하지 않았다.
3. **서버 로그아웃 실패 후 세션 소실.** SDK는 서버500에도 local session을 지웠다. 먼저 고정 token으로 서버 revoke를 확인한 뒤 SDK 정리를 호출하도록 수정했다. 서버 실패 시 durable closed marker와 기존 SDK session을 유지해 reload 후에도 재시도한다. marker 자체 저장 실패 시 복원 가능한 local credential은 제거하고 같은 화면의 메모리 token으로 재시도한다.
4. **복구 성공 후 reload의 잘못된 오류.** 성공 callback을 `/alpha`로 정리해 이미 소비한 code를 다시 요구하지 않도록 했다. 복구 중 계정별 marker는 새 비밀번호 완료 전까지 유지한다.
5. **로그아웃 실패 후 자동 refresh 중지.** 독립 코드 점검에서 실패 시 `stopAutoRefresh()`가 SDK의 visibility listener까지 제거하고 재로그인 때 복구되지 않는 것을 찾았다. 수동 중지를 제거하고 SDK의 브라우저 수명주기를 유지한다. pending marker가 있는 동안 토큰이 갱신되어도 개인 계정 조회·표시는 막는다. 실제 SDK timer의 refresh 요청을 확인하는 mock-clock 브라우저 회귀를 추가했다.
6. **실제 로그아웃 중복 요청403.** 서버 revoke가 성공한 뒤 SDK가 같은 token으로 다시 revoke했다. 성공 확인 후 전용 session key만 제거하고 SDK의 공개 `signOut`을 호출해 나머지 정리·SIGNED_OUT 전파를 유지한다. 실패 전에는 session key를 제거하지 않으며 저장소 실패는 닫힌 화면/재시도로 이어진다. 요청1회·SDK 전파 회귀를 추가했고 기존 실패/reload/자동 refresh 검사도 모두 통과했다.
7. **이미 해제된 서버 세션의 재시도 정체.** 6번과 별개로 session key 삭제 자체가 실패하면 이후 명시 재시도에서403이 난다. 알려진 `session_not_found`만 구분해 정리를 마치고, 다른 오류는 재시도 상태를 보존한다. 단위20·mock22·실브라우저57과 실제 raw API30 검사로 확인했다.
8. **실패한 복구 링크에서 기존 계정 성공/복구 폼 노출.** callback의 대기/실패를 기존 SDK 로그인과 분리했다. 실패 때 기존 세션을 제거하지 않고 계정 조회·변경 화면을 닫으며, 정상 교환 결과만 복구 owner와 함께 적용한다. 14시 후속 mock27·실브라우저71에서 실패 격리·원래 세션 복귀를 검증했다.
9. **복구 폼 제출 전 계정 전환으로 다른 계정의 비밀번호 요청.** 가짜 Auth 검사에서 A 폼이 B의 공유 token을 빌리는 결함을 재현했다. identity와 요청 token을 복구 계정에 고정하고, 계정 변경 시 폼을 닫으며 응답 session을 SDK에 저장하지 않는다. 새 단위4개·mock3개와 전체 mock30·실브라우저71을 통과했다. 실제 비밀번호 변경은 실행하지 않았다.

로그아웃 요청과 marker 저장이 함께 실패한 상태에서 페이지까지 닫으면 메모리 재시도 token은 사라진다. 로컬 개인 자료를 숨기고 credential을 지우더라도 **서버 세션 해제까지 확인됐다고 표현할 수 없다**. 실제 계정 검사에서도 이 한계를 구분한다.

### 오전 실행 수와 근거 — 후속 실행과 구분

아래는 실제 실행한 최종 수치와 앞선 실패 이력이다. 테스트 개수를 원자 요구사항 충족률로 환산하지 않는다. `output/`의 로그·JSON·PNG는 로컬 전용 근거이며 공개 코드 재현에 필요한 fixture/test source와 구분한다. 반복 실행이나 포함 관계가 있는 표적/통합 검사를 합쳐 요구 커버리지 수로 만들지 않는다.

- `npm run test:alpha-auth`: **18/18 PASS** — auth12, SQL 정적4, SDK patch2. SQL 정적 검사는 원격 권한 검사가 아니다.
- `npm test` 최종: **2255/2255 PASS**, 9/21 09:24:26–09:26:03 KST, skip/cancel0, 실행 중 소스 변경0, verified exit0. 앞선 동일 개수 실행과 중복 합산하지 않는다.
- 통합 model/component 첫 실행: **1800/1800 assertions PASS지만 실행 중 소스3개 변경 → 검증 무효**. 최종 성공 근거로 사용하지 않고 재실행한다.
- 두 번째 통합 실행은 **1801/1801 assertions PASS지만 실행 중 인증 UI1개 변경 → 검증 무효**였다. 이 이력도 최종 성공 근거로 사용하지 않는다.
- 통합 model/component 최종: **185개 파일 / 1801/1801 PASS**, 9/21 09:23:07–09:32:14 KST, skip/cancel0, 실행 중 소스 변경0, verified exit0. `output/integrated-product-poc/new-tests-2026-09-21T00-23-07-392Z.json`.
- 최종 production build: **PASS**, 9/21 09:18:12–09:21:23 KST, 실행 중 소스 변경0, verified exit0. 캐시 분리 후 생성 chunk에 deprecated global debug probe 잔존0을 확인했고, 최종 브라우저에서도 prefix 밖 호출0을 확인했다. production build는 Production 배포가 아니다.
- strict 검사: **409 진입점 / 442 소스, 진단0**, 실행 중 소스 변경0. 검사기 자체8/8은 별도다.
- dependency audit: **취약점0**, 9/21 09:20:19–09:20:25 KST, verified exit0. 앞선 audit은 실행 중 UI 변경을 감지해 무효 처리됐으므로 이 재실행을 기준으로 삼는다.
- 실제 anonymous: **7/7 PASS**, `output/alpha-m2/anonymous-evidence.json`.
- 최초 mock 브라우저: **0/15 PASS**. prefix 밖 SDK probe와 잘못된 오류 응답 fixture를 발견했다. fixture는 실제 API version 응답에 맞췄다.
- 다음 mock 브라우저: **0/18 PASS**. 17개는 stale cache의 SDK probe, 1개는 server logout 실패 때 local session 삭제 문제. `results-initial-failed.json`, `results-stale-cache-failed.json`에 원래 실패를 보존했다.
- 오전 최종 mock 브라우저: **19/19 PASS**, 68.0초, retry/skip/flaky0. 현재 보존 위치 `output/playwright/alpha-m2-before-live-20260921-1309/results.json`과 그 boundary JSON25개, PNG25개. Supabase 방향141요청은 모두 HTTP fixture로 가로챘고 실제 Supabase로 전달0이다. 원래 `output/playwright/alpha-m2/results.json`은 후속20/20 결과다.
- 기존 portable 브라우저 회귀: **4/4 PASS**, 81.2초, retry/skip/flaky0. exact gate/손상 fallback, 개인 문서·날짜·완료·Undo·reload, 공개 사본 전체 교체, native append의 원본 line ID 보존. `output/playwright/alpha-m2/portable-results.json`. 전체 기존760개 E2E 재실행을 주장하지 않는다.
- 문서 검사: 검사기 **4/4**, 필수 문서16·로컬 링크6359 PASS. scoped closeout과 `git diff --check`를 실행했으며 staged 파일0이다.

### 브라우저 화면별 평가와 운영 데이터 경계

아래는 Windows Chromium 자동화의 viewport 검사다. 각각 로그인·이메일 가입·복구 요청·빈 계정·연결 완료의 5화면을 검사했다. 실제 휴대전화·태블릿 검사나 관찰 사용자 조사로 표현하지 않는다.

| 크기 | 5화면 평가 | 주요 확인 |
| --- | --- | --- |
| 390×844 | PASS | 가로 넘침0, 지정 행동48px 이상, 키보드 로그인·빈 공간 생성 |
| 375×812 | PASS | 좁은 폭의 폼/안내/행동 가림0, 복구 요청 경로 |
| 844×390 | PASS | 세로 스크롤 필요, 가로 넘침0, 스크롤 후 핵심 행동 hit-test 통과 |
| 1024×768 | PASS | 카드·입력·행동 정상, 빈 계정/연결 완료 상태 구분 |
| 1440×900 | PASS | 과도한 카드 확장 없음, 로그인·계정 재조회/변경 행동 접근 가능 |

- 25회 boundary 확인에서 prefix 밖 `setItem/removeItem/clear` **0**, `flow:saved-plans`와 `flow:completion:v1`의 합성 운영 fixture byte 비교 **전부 동일**. 별도 `other-app:key`도 동일했다. 사용자의 실제 브라우저 운영 자료 전체를 읽거나 전수 대조한 결과는 아니다.
- page error **0**, 예상 밖 console error **0**, 예상 밖 외부 요청 **0**. 실패 시나리오가 의도적으로 발생시킨 HTTP400/401/네트워크 및 logout500의 브라우저 오류 로그는 **6건**이고 별도 보존했다. 총 console 오류까지0이라고 쓰지 않는다.
- root가 390 로그인과 844 가로 가입 화면을 직접 확인했고, 브라우저 담당이 나머지 대표 해상도도 확인했다. 가로 화면의 세로 스크롤은 정상 동작이며 뷰포트 안에 모든 폼을 강제로 축소하지 않았다.
- 운영 `/my`·기존 Program 저장 writer 소스 수정0. 초기 원격 쓰기는 개발 migration이며, 후속에는 위 승인된 Auth URL과 테스트 account/file/session 동작이 추가됐다. 운영 프로젝트 쓰기0이다. 이 사실을 운영 DB 전체의 byte-for-byte 비교 증거라고 확대하지 않는다.

## 사용자가 준비할 것과 재개 방법

1. **완료:** 사용자 준비한 개발 테스트 계정2개의 이메일 확인·실제 로그인을 검증했다. 기존 사용자의 비밀번호나 email confirmation 전역 설정은 변경하지 않았다.
2. **완료:** 사용자 승인한 Site URL `http://localhost:3104/auth/callback`, Redirect URL 정확히 `http://localhost:3104/auth/callback`, `http://localhost:3000/auth/callback` 두 개를 저장·확인했다. 실제 배포 URL은 추가하지 않았다.
3. **완료:** ignored `.tmp/alpha-test-accounts.json`에 사용자가 로그인 정보를 입력했다. 로컬 평문 파일이므로 공개 Git·로그·보고서에 넣지 않는다. 내용을 출력하지 않고 준비 여부와 실제 로그인을 확인했다. 파일 삭제·비밀번호 변경은 사용자 승인 없이 하지 않는다.
4. `.tmp/alpha-development.json`에는 allowlisted dev URL/ref·publishable key·local redirect만 둔다. 관리 secret/service-role key는 사용하지 않는다. `npm.cmd run alpha:dev`로 127.0.0.1:3104에서 실행하고 `http://localhost:3104/alpha`를 연다. 이 로컬 서버 실행은 배포가 아니다.
5. 실제 검사는 `node --import tsx scripts/alpha/m2-live.ts --run-development-live --sql-checkpoint`로 명시 실행한다. 실제 A/B 로그인→own open/read→교차 REST/RPC/Storage 음성 검사→SQL checkpoint→로그아웃 후 남은 JWT 차단을 확인한다. 실제 verified session ID만 사용하는 rollback-only SQL은 같은 dev 프로젝트에서 실행하고 역할 시뮬레이션으로 기록한다.
6. runner는 생성한 전용 fixture 파일만 Storage API로 정리하고 테스트 세션만 local 로그아웃한다. 사용자 계정·빈 account row는 삭제하지 않으며 다른 기기의 전역 세션도 끊지 않는다. 실패/정리 실패를 결과 JSON에 남긴다. 앱에서 A→B 로그인·reload도 실제 계정으로 별도 검사한다.

Google은 provider가 아직 OFF라 버튼을 숨긴다. OAuth client/동의 화면 설정은 외부 준비로 남긴다. 개발 테스트 계정의 실제 가입·메일 확인과 사용자 복구는 성공했지만, 기본 SMTP의 일반 사용자 배달 범위/한도와 요청 남용 방지는 공개 서비스 준비에서 별도 확인해야 한다. 이번 M2 완료를 누구나 안정적으로 메일을 받는 운영 서비스 완료로 표시하지 않는다.

이번 인계에서는 최종 production build를 `node --import tsx scripts/alpha/dev.ts --start`로 127.0.0.1:3104에 실행했다. `/alpha` HTTP200을 확인했다. 기본 `/my`는 기존 경로를 그대로 사용하며 서버 프로세스 종료 후에는 위 명령으로 다시 열어야 한다.

### 공개 코드에서 개발 설정을 재현할 때

아래 파일은 Git에 넣지 않는다. `YOUR_PUBLISHABLE_KEY`는 개발 Dashboard의 publishable key로만 교체한다. secret/service-role/DB password는 어떤 항목에도 넣지 않는다. 설치는 `npm ci`로 버전 고정 SDK와 호환 패치를 적용한다. 예전 미패치 build cache가 있으면 정확한 worktree의 생성 `.next/cache/webpack`만 확인·분리한 뒤 다시 build한다. 기존 브라우저 저장소를 초기화해서 검사를 통과시키지 않는다.

```json
{
  "FLOWME_ALPHA_ENABLED": "development-only",
  "FLOWME_ALPHA_STAGE": "development",
  "FLOWME_ALPHA_PROJECT_REF": "wkmzcxpnojobxrgebapw",
  "FLOWME_ALPHA_SUPABASE_URL": "https://wkmzcxpnojobxrgebapw.supabase.co",
  "FLOWME_ALPHA_PUBLISHABLE_KEY": "YOUR_PUBLISHABLE_KEY",
  "FLOWME_ALPHA_REDIRECT_URL": "http://localhost:3104/auth/callback"
}
```

## 발행·관찰·남은 범위

| 항목 | 이번 M2 상태 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR / merge | 미실행, 이전 PR #203 이력과 별개 |
| Preview | 미실행 |
| Production | 미실행, 운영 DB/설정 쓰기 없음 |
| 실제 Android Chrome / iOS Safari | 미실행 |
| 관찰 사용자 | 0명 |
| 개인 원문·일정 편집 / CAS·Undo·다기기 | M3 이후, 이번 인증 화면에 미연결 |
| 기존 데이터 이관·운영 migration | 미실행, M6 및 별도 승인 경계 |

오전에는 계정/로컬 입력과 Auth URL 승인 대기로 자동 목표를 blocked 처리했고,13시 사용자 준비·승인 후 재개했다.429 메일 제한과 사용자 보류, callback/복구 경합 결함, 첫 만료 판정 실패, 외부 비밀번호 재설정으로 무효가 된 실행, 로컬 비밀번호 오입력도 위 이력에 보존했다. 이후 사용자 직접 복구·실제 재로그인, 두 계정 가입/확인 서버 기록, 자연 만료23/23과 사후 경계 확인으로 개발 M2 종료 조건을 충족했다. 과거 미실행을 소급 PASS로 바꾼 것이 아니라 새 성공 근거로 현재 상태를 갱신했다. Google·실기기·공개 서비스 준비의 미실행은 그대로 남긴다.
