# M5 공개 탐색·공유·커뮤니티 — 실행 계획과 검증 기록

상태: **완료 — 2026-09-21 승인된 개발계 M5 구현·검증 범위.** [실사용 전환 원장](alpha-transition.md)의 A10–11/A15–17과 관련 A18–19/A22–24를 실제 개발 계정에 연결했다. M4까지의 개인·제작 저장을 보존하고 개발1 탐색/일부 사용, 개발2 선택 공개/판본/제안, 통합 커뮤니티의 기존 화면·도메인을 재사용했다. 실제 API153/153·사진54/54·브라우저140/140·통합2025/2025·npm2255/2255와 고정 소스 build를 확인했다. M6 이관/전체 복원, D05 운영 정책, M7 실제 기기/실사용·배포는 완료가 아니다.

## 기준선과 범위

- 격리 worktree `D:\flowme2605\flow-poc-merge-prep-20260920`, branch `agent/alpha-m1-persistence-20260921`. 세션 시작 2026-09-21 12:19 UTC, fetch 후 HEAD/origin/main 모두 `efd8b642707b5c8e67b727f23169ae41c43cb5e8`.
- 현재 dirty 변경은 같은 세션의 M1–M4 결과다. 이를 유지하며 원래 `flow-mvp`의 dirty·미추적 파일에는 쓰지 않는다. 기존 전체 상태를 M5 변경 파일 수로 세지 않는다.
- 개발 Supabase `wkmzcxpnojobxrgebapw`만 사용한다. 기존 `/my`·운영 `flow:*` writer·운영 DB는 보존한다. 비밀·Auth UUID/email·개인 원문/이력/검토 초안을 공개 DTO로 보내지 않는다.
- 개발 A/B 계정과 합성 자료로 서비스 경로를 검증한다. 외부 사용자에게 실제 게시하거나 Preview/Production을 배포하는 승인은 아니다. 이번 commit/push/PR/merge/배포는 미실행 범위다.
- D05의 전체 서비스 공개 대상·신고/숨김 운영·계정 삭제와 보존 충돌은 미결이다. 개발 버전의 제한/자료 수명 계약은 교체 가능한 상수로 관리하며 영구 제품 정책으로 올리지 않는다. M6 실제 이관/전체 복원, M7 실기기/관찰/배포는 후속이다.

## 구현 순서

| 단계 | 작업 | 종료 조건 |
| --- | --- | --- |
| 1 요구·UX 대조 | 기존 원자 감사/시나리오와 Discovery/Publisher/CopyInspector/Community/Activity 연결 대조 | 빠진 동작·확정 경계·identity·기존 모델 재사용 지도 |
| 2 저장·권한 설계 | 공개 별칭·공유 revision·개인 reference context·제안 당사자 노출·사진 접근 계약 | 계정/공유 이중 CAS·중복 요청·불변판본·private/public allowlist·권한 음성 검사 계획 |
| 3 서버 구현 | TSX 순수 helper 추출, semantic 명령·DEV migration/RPC·읽기 projection·파일 경로 | 실제 두 계정 API 정상/실패/경합·기존 M3/M4 저장 왕복 |
| 4 화면 연결 | 기존 탐색/공개/참여 화면 재사용, 원문/초안 flush·계정별 복구·정확 링크 복귀 | 클릭 가능한 정상 흐름과 입력 보호·상태 피드백 |
| 5 독립 검토·검증 | 표적/전체 회귀·npm/build/security·실제 API/브라우저·5해상도 | 실제 실행 수·버전/hash·오류·화면 평가 기록 |
| 6 사후 정리·보고 | 테스트 소유 DEV 자료만 정확히 정리, 권한/운영 경계 확인·기존 원장 갱신 | 과거 결과 유지, 적용/미구현/미검증·다음 단계·발행 상태 분리 |

## 구현 전 발견한 연결 문제

1. 기존 계정 validator가 빈 공개 저장소만 가정한다. M5에서 사본/공개 연결이 생긴 뒤 M3/M4 읽기·저장까지 실패하므로 안전한 공개 reference context를 함께 검증해야 한다.
2. 로컬 ProgramData는 최대8명의 합성 인물과 각 private space를 가정한다. 서비스 저장 계약으로 그대로 내보내지 않는다. 실제 권한은 Auth/DB가 결정하고, 기존 순수 전이용 임시 projection에는 본인 공간과 빈 타인 공간만 구성한다. 9명 이상 작성자도 별도로 검사한다.
3. 공개·참여의 결합 전이가 client TSX 안에 있다. 문서 fingerprint/초안 제거/private link 갱신을 보존하도록 순수 모듈로 추출한다.
4. proposals에는 검토 내용이 들어 있다. 작성자와 Flow 소유자만 받으며 catalog DTO/타인 응답에 포함하지 않는다.
5. 기존 사진 data URL은 object storage 권한이 아니다. DEV 전용 저장과 실제 이미지 디코딩·크기/소유·게시/삭제 접근 검사를 연결한다.
6. `/alpha` 공개 출력 복귀와 editor flush/필터·스크롤·활동 대상 복귀를 함께 연결해야 한다. capability만 켜는 것은 완료가 아니다.

## 개발 저장 계약의 방향

공개 작성자는 무작위 별칭을 사용한다. email/Auth metadata를 공개 이름으로 쓰지 않는다. 공유 저장소의 revision과 본인 계정 revision을 한 거래에서 확인하고, 응답 유실 후 같은 request ID에는 최초 결과를 반환한다. 기존 공개판은 불변이며 새판만 추가한다. 제안/검토는 당사자 projection을 제공한다. 공개 저장소 전체를 Undo로 되감지 않으며 개인 사본 Undo는 개인 필드에만 적용한다.

초기 DEV의 공유 JSON 저장/글 수·크기·요청 한도는 서비스 확장 전 다시 검토하는 버전 계약이다. 게시 사진은 private bucket의 불변 경로와 권한 있는 읽기를 사용한다. 파일 업로드와 DB 게시 거래가 완전한 단일 거래라고 표현하지 않는다. 초안 파일 준비→명시 게시 연결→실패/취소 자료 정리의 결과를 검증한다.

## 시나리오 판정표

| ID | 흐름 | 핵심 판정 | 현재 |
| --- | --- | --- | --- |
| M5-01 | A 선택 공개 preview→cancel→publish | 비선택/개인 기록 비노출, cancel 공개0, 확정1 | 실제 UI/API PASS. 비선택 메모 비노출·Escape 공개0·선택2항목 공개 |
| M5-02 | B 검색/필터→상세→기준일/일부 선택→사본 | 같은 요청 copy1, 정확 source/version/item·목록 복귀 | 실제 UI/API PASS. 분야/상황/검색·기준일·부분1항목·중복 요청1copy |
| M5-03 | 사본 다중 문서 참조→완료/메모→reload | 같은 개인 identity·A 원본 불변, M3/M4 저장 정상 | 실제 API PASS. canonical task1+추가 binding1·두 문서 참조, 완료/메모 및 공개 이후 제작 저장 검증 |
| M5-04 | B 구판 제안→A 비교/보류/수용 | owner 검증·stale 거절·불변 새판1·검토 초안 비노출 | 실제 UI/API PASS. A의 별도 브라우저 보류→수용·v1 불변·선택한 제목만 v2 |
| M5-05 | B 새판 비교→일부 수용/유지→개인 Undo | 다른 필드/기록/참조·타인 공유 변경 보존 | 실제 UI 선택 반영/개인 메모 보존 PASS. 타인 공개 변경 뒤 개인 Undo·후속 개인 변경 뒤 stale Undo 거절은 실제 API PASS |
| M5-06 | A 공개 철회→B 구판/기존 사본 | 구판/기록 보존, 신규 가져오기/출력 차단 | 실제 API 철회·신규 copy 거절 PASS, 무저장 출력 차단은 순수 도메인/기존 UI 회귀. 이번 live UI에서 철회 버튼은 별도 미실행 |
| M5-07 | Flow 없는 질문→답글/반응→수정→활동 복귀 | 부분 경험 허용, 정확 대상·owner-only 수정 | 실제 UI 질문/답글/반응/삭제/활동 PASS. 수정·타인 수정 거절은 실제 API, 부분 경험 의미는 기존 도메인 회귀 |
| M5-08 | 사진 초안→게시→타인 읽기→글 삭제 | MIME/bytes/owner 검사, 초안 비공개·삭제 후 접근 차단 | 실제 UI/API/Storage PASS. 640×480 합성 이미지 decode·responsive 표시, MIME/EXIF/hash·초안/삭제 접근 음성 검사 |
| M5-09 | URL→무저장 출력→고정판본 복귀 | 미지원 예시대체0, 출력 서버 mutation0 | 실제 UI TXT/CSV/ICS bytes·선택1개/ICS1event·고정v1 URL 복귀·서버0쓰기 PASS. 미지원 URL 거절은 도메인/기존 UI 회귀 |
| M5-10 | 응답 유실/오프라인/계정 전환/동시 요청 | 결과 조회·중복0·계정 입력 누출0·부분 거래0 | 실제 UI 각 네트워크 장애1회·같은 요청 조회/재시도·같은 브라우저 A→B 초안 비노출 PASS. 동시 CAS·직접 위조는 실제 API |
| M5-11 | 다섯 해상도·키보드·dialog | 48px·가로넘침/가림/page error0·Escape/초점 복귀 | 실제 브라우저 4화면×5크기 PASS. 실제 기기·OS IME·보조기술은 미실행 |
| M5-12 | 익명/타인 위조·직접 API/Storage 접근 | private/ledger/사진 초안 비노출·직접 수정 거절 | 실제 API/Storage PASS. 제3계정 제안 projection은 합성 검사이며 실제 3번째 가입으로 확대하지 않음 |

화면 크기는 390×844, 375×812, 844×390, 1024×768, 1440×900이다. 실제 Android Chrome/iOS Safari·OS IME·보조기술·관찰 사용자 검증은 직접 실행한 경우에만 별도 집계한다.

## 실행 결과

개발계 M5 구현·시뮬레이션·회귀·화면 검증·QA 자료 정리를 완료했다. 아래 표는 검사 종류별 실제 실행 수이며 재시도·중복 범위를 합쳐 제품 충족률로 쓰지 않는다. 실제 운영 공개와 실사용 가능 판정은 후속 gate다.

### 구현한 기능과 변경 파일

| 연결 | 구현과 소유 경계 | 주요 파일 |
| --- | --- | --- |
| 실제 공개 reference | 공개 별칭과 본인 private space만 임시 모델에 투영. 제안은 작성자·Flow 소유자에게만 노출. 일반 PoC envelope와 서비스 projection 혼합 거절 | `alpha-social/projection.ts`, `alpha-persistence/program-adapter.ts`, `program-data.ts` |
| 공개·사본·제안 | 26종 semantic intent를 서버에서 재실행. 계정/공유 revision 이중 CAS, 원래 requestId 재조회, 공개판 불변, 공개 자료 전체 Undo 금지 | `alpha-social/{contract,dispatch}.ts`, `alpha-server/{social-command-handler,social-context}.ts`, `/api/alpha/social` |
| 기존 M3/M4 호환 | 공개 reference가 있는 계정도 개인 실행·제작 거래로 검증·저장. 클라이언트의 공유 데이터 직접 patch는 거절 | `alpha-server/{command-handler,creator-command-handler}.ts`, `alpha-sync/{controller,http-repository,wire}.ts`, `alpha-persistence/client.ts` |
| 화면 연결 | 내 공간/둘러보기/내 활동, Flow 찾기/경험·질문·지식, 선택 공개·사본 비교·제안 검토·활동 복귀. 기존 UI와 순수 모델 재사용 | `AlphaWorkspace.tsx`, `ProgramCommunity.tsx`, `ProgramPublisher.tsx`, `ProgramCopyInspector.tsx`, `ProgramCopyProposal.tsx`, `ProgramProposalReview.tsx` |
| 입력 보호 | 공개/참여/검토 초안을 계정·탭별 보관. 전체 공개를 자동 재시도하지 않음. 응답 유실 후 정확히 확인된 자기 비공개 초안만 baseline 갱신 | `alpha-social-recovery.ts`, `document-action.ts`, `ProgramSocialAck.test.tsx`, `AlphaWorkspace.test.tsx` |
| 사진 | 실제 이미지 디코딩→회전/EXIF 제거→불변 WebP 파일→명시 게시 연결. 권한 검사 후 blob 표시, 게시 삭제 후 새 읽기 차단 | `alpha-server/media-handler.ts`, `alpha-social/media-client.ts`, `community-media.ts`, `ProgramCommunityImage.tsx`, `/api/alpha/media` |
| 무저장 출력 복귀 | 기존 exact `/my` gate는 보존하고 `/alpha` query 없는 주소에서 고정 공개판 복귀 허용 | `public-output-return.ts` |
| 개발 DB | 새 공개 저장소·별칭·rate·사진 registry/RPC. private tables 강제 RLS/직접 table 권한 없음. 기존 계정·ledger에 additive 연결 | `supabase/migrations/20260921122528_*`, `20260921123536_*`, `20260921130600_*` |
| 검증·사후 정리 | 실제 API/media/browser runner, full signed shared snapshot·개별 요청·hash·revision 소유 구간으로만 QA 보상 정리. 기존 ledger 수정/삭제 없음 | `scripts/alpha/m5-*.ts`, `program-source-files.mjs` |

위 경로에서 별도 prefix 없는 라이브러리는 `lib/flow/integrated-poc/`, UI는 `components/flow/integrated-poc/` 아래다. `package.json`/lock은 실제 이미지 재인코딩에 쓰는 `sharp`를 직접 의존성으로 명시했다. M1–M4 변경이 같은 worktree에 있으므로 Git 전체 dirty 수를 M5 파일 수로 세지 않는다.

### 개발 한도와 운영 보류

- 서비스 projection actor 최대512, 성공한 social 명령 계정별 분당120회, 사진2MB/16M pixels/글당4장·동시 준비32개·미게시 접근24시간은 버전1 개발 계약이다. 운영 정책 확정이 아니다.
- 사진 TTL은 접근 만료이며 물리 파일 자동 삭제를 뜻하지 않는다. 소유자가 미게시/연결 해제 사진을 정확히 취소할 수 있다. 영구 보존·고아 파일 정리·전체 백업의 파일 복원은 M6/D03/D05에 남긴다.
- 브라우저가 읽는 public DTO에는 Auth UUID/email/개인 메모/실행 이력/검토 초안이 없다. 본인 계정 API에는 본인 identity가 존재한다. 둘을 혼동하지 않는다.
- 공유 후 다른 사람이 이미 내려받은 사진 bytes를 회수할 수는 없다. 삭제 검증은 서버의 이후 새 요청을 차단하는 범위다.
- private bucket의 download는 호스팅 gateway에서 `object.get_authenticated_info` 권한을 이용한다. bytes GET와 이 info GET만 같은 live-session/registry 조건으로 읽을 수 있다. list/sign/copy는 막고 caller `user_metadata`는 NULL/빈 객체만 허용한다. [실제 Storage 1.73.1 info 소스](https://github.com/supabase/storage/blob/v1.73.1/src/http/routes/object/getObjectInfo.ts)의 owner 제외와 실제 응답을 함께 검사했다.
- 외부 공개 대상·신고/숨김 운영·계정 삭제/공개 사본/첨부 보존 충돌, Google OAuth·일반 사용자 메일, 실제 기기와 관찰 검증은 완료로 바꾸지 않는다.

### 실패 이력과 수정

1. 첫 통합 검사: 1,998실행, 1,981PASS/17FAIL. M5 shell 변경 후 테스트 하네스에 새 ref/함수가 빠진 오류였다. 실행 중 소스9개도 바뀌어 최종 근거로 쓰지 않는다. 하네스와 lost-save modal acknowledgement를 수정했고 최종 고정 소스 재실행은 통과했다.
2. 첫 사진 실제 검사: 8PASS/1FAIL. 업로드 후 download의 gateway 내부 info 권한 경로가 차단됐다. 임시 진단은 해당 QA object의 SELECT에 항상 deny/오류만 추가했고 권한을 넓히지 않았다. 결과 확인 직후 임시 policy/function을 삭제했다. 후속 migration으로 안전한 info 경로를 연결하고 실제 사진 검사54/54를 통과했다.
3. 첫 QA cleanup SQL은 PL/pgSQL 변수와 SQL alias 이름 중복으로 transaction 전체가 실패했다. 계정222/11·공유12가 그대로임을 확인한 뒤 alias를 분리하고 실제 정리 성공, 회귀 테스트를 추가했다.
4. 13:08 build 명령은 성공했지만 실행 중 테스트 파일1개가 바뀌어 evidence guard는 실패 판정했다. 최종 고정 소스 build를 다시 수행해 통과했다.
5. 인증 mock 브라우저 첫 재실행은 실제 개발 서버와 포트가 겹쳐 검사0건으로 시작이 거절됐다. 실제 서버를 종료한 뒤 격리 mock 설정으로 재실행했다.
6. 인증 mock의 옛 계정 응답 fixture가 M5 social read/open을 지원하지 않아 후속 시도가 중단됐다. fixture에 실제 paired read 형태를 추가하고 외부 요청0을 유지했다. 이후 30/30을 통과했다.
7. 실제 UI 후속 시도에서 locator의 중첩 scope, 닫힌 details 안 역할 검색, select/textarea의 exact label 검색 문제가 드러났다. 접근성 역할·이름으로 지정하고 summary를 먼저 여는 사용자 순서로 고쳤다. `m5-ui-1789997624638`과 `m5-ui-1789997732861`은 각각 18확인 후 timeout으로 중단됐다. assertion FAIL0이어도 전체 성공으로 집계하지 않는다.
8. `m5-ui-1789997851909`은 42PASS/1FAIL 뒤 상세 locator timeout, `m5-ui-1789997970094`은 91PASS/2FAIL 뒤 제안 입력 locator timeout이었다. 후자는 실행 중 소스 변경도 있었다. 공개 modal 종료 시 초점 복귀 실패는 실제 앱 결함이었다. 비동기 편집 flush 중 opener가 disabled/숨김 상태가 되는 경로를 고쳐 modal 진입 직전에 보이는 문서 메뉴 summary를 return target으로 확보했다. 관련 표적16/16 후 고정 소스 전체 회귀·build·실제 UI를 다시 수행해 통과했다.
9. `m5-ui-1789998386335`는 129확인 PASS 뒤 반응 저장 중 답글 쓰기를 눌렀을 때 폼이 열리지 않아 중단됐다. 활성 버튼의 클릭을 내부 busy guard가 조용히 버리는 실제 UX 결함이다. 글·답글·수정·초안 복귀 7개 진입 버튼을 busy/사진 읽기/입력 잠금 조건과 일치시켰다. 관련 UI/이미지 표적20/20 통과 후 다시 빌드했다. 이 시도의 계정/공유 자료와 합성 사진1개는 정확한 소유 요청으로 정리했고 취소·이후 접근 차단·임시 로그인 폐기4/4를 확인했다.
10. `m5-ui-1789998794646`은 133확인 PASS 후 계정 전환의 도착 화면 가정 때문에 중단됐다. 로그인은 성공했으나 공개 글 deep link를 유지하는 정상 동작에서 테스트가 `내 공간`을 기다렸다. 인증된 화면을 기다린 직후 새 QA 세션을 기록하도록 수정했다. 당시 미기록 QA 세션1개는 정확한 runId User-Agent·계정·생성시각·session ID로 소유를 확인해 폐기했고 기존 사용자 session은 보존했다. 계정/공유 자료와 합성 사진1개도 별도 정확 정리했다.

보안 advisor는 13:43 UTC 재조회에서 INFO6·WARN1이었다. private 테이블6개의 무정책 RLS는 직접 접근을 모두 막고 제한 RPC만 허용하는 의도된 구성이다([검사 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)). 기존 유출 비밀번호 보호 비활성 WARN1은 남았다([대응 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). 이번에 Auth 설정·요금제를 바꾸지 않았으며 보안 경고0으로 표현하지 않는다.

중간 통합 검사 2,015/2,015와 2,024/2,024는 assertion은 통과했으나 각각 실행 중 소스4개/2개가 바뀌어 evidence guard가 거절했다. 최종은 13:53:39–14:02:57 UTC, 212파일 2,025/2,025·소스 변경0이다. 중간 결과 파일은 그대로 보존한다.

### 최종 확인된 실행 근거

로컬 원본은 공개 Git 대상이 아니다. 아래 파일을 지우거나 과거 실패를 성공으로 고치지 않는다.

| 검사 | 결과 | 로컬 전용 근거 |
| --- | --- | --- |
| 실제 A/B core API 첫 완주 | 107/107 PASS | `output/alpha-m5/m5-1789995054519/api-report.json` |
| 실제 A/B core API 보강 완주 | 153/153 PASS. 다중 문서 참조·완료/메모·공개 이후 제작 저장·타인 공개 변경 뒤 개인 Undo·철회 신규 사용 차단 포함 | `output/alpha-m5/m5-1789997035330/api-report.json` |
| 실제 A/B 사진·Storage | 54/54 PASS | `output/alpha-m5-media/m5-media-1789996339775/api-report.json` |
| 실제 A/B/A2 브라우저 최종 완주 | 140/140 PASS, 4회 실제 로그인·3독립 context, 소스 변경0 | `output/playwright/alpha-m5-live/m5-ui-1789998988935/results.json` |
| npm test | 2,255/2,255 PASS, skip/cancel0, 소스 변경0 | `output/integrated-product-poc/npm-test-2026-09-21T13-53-50-804Z.json` |
| 통합 전체 모델·UI 회귀 | 최종 212파일, 2,025/2,025 PASS, skip/cancel0·소스 변경0 | `output/integrated-product-poc/new-tests-2026-09-21T13-53-39-863Z.json` |
| 인증 mock 브라우저 | 30/30 PASS. 실제 외부 인증·DB 요청을 전송하지 않는 회귀 검사 | `npm.cmd run test:e2e:alpha-auth` |
| M5 SQL 계약/cleanup | 25/25 PASS | `npx.cmd tsx --test scripts/alpha/m5-schema.test.ts scripts/alpha/m5-media-schema.test.ts scripts/alpha/m5-cleanup-sql.test.ts` |
| scoped TypeScript | 466진입점·514소스, 진단0·소스 변경0; inventory9/9 | `output/integrated-product-poc/targeted-types.json` |
| production build | 최종 UI 수정본 18개 정적 페이지 생성, exit0·소스 변경0 | `output/integrated-product-poc/build-2026-09-21T13-50-48-351Z.json` |
| 의존성 audit | 취약점0, 소스 변경0 | `output/integrated-product-poc/audit-2026-09-21T13-13-28-382Z.json` |
| 문서 검사 | 검사4/4·skill sync·16필수문서·로컬 링크 검사 PASS | `npm.cmd run docs:check` |

### 운영 데이터와 QA 정리 경계

최종 실제 브라우저의 세 context에서 PoC 외부 `flow:m5-operating-fixture` 값(공백·한글·CRLF 포함)이 전후 byte-for-byte 동일했다. 허용 prefix 밖 `setItem/removeItem` 0, `clear` 0이다. 이는 새 QA profile의 운영 키 sentinel 검사이며 사용자의 기존 브라우저 profile 전체를 수집·비교했다는 뜻은 아니다. 최종 page error0, 예상하지 않은 console error0이고, 의도적으로 주입한 응답 유실/오프라인의 network error2는 별도 기록했다.

개발 프로젝트만 조회/변경했다. 운영 프로젝트에는 접속하지 않았으므로 운영 DB를 새로 읽어 hash 검증했다는 뜻은 아니다. `/my` route와 기존 운영 storage writer 파일에는 이번 수정이 없다. 브라우저별 운영 `flow:*` sentinel 전후 비교와 금지 writer 호출수는 최종 브라우저 결과에 기록한다.

첫 core QA 정리 후 계정A223/B12·공유13, 사진 검사 정리 후 A227/B13·공유17이었다. 당시 개인공간과 공개6배열은 원래 빈 상태이고, 사진 object0·활성 registry0·취소 registry4였다. 취소 tombstone과 QA operation ledger는 재요청 안전성을 위해 남겼다. 기존 ledger는 바이트 동일 검사 후 보상 기록만 추가했다. 각 테스트에서 만든 로그인 세션만 폐기했고 기존 사용자 session1개는 보존했다. 이후 브라우저 자료의 최종 정리는 아래에 별도 기록한다.

보강 core의 첫 시도는 46PASS/1FAIL이었다. 원본문서의 canonical task 행과 추가 문서의 binding을 모두 binding 수로 세던 테스트 판정을 수정했다. 원본문서 실제 행·task1개·추가 binding1개·문서 합집합2개를 확인한 후 153/153 재실행에 성공했다. 그 자료의 보상 정리 후 A253/B37·공유34, 개인/공개 내용은 빈 기준선이다.

첫 실제 UI 시도는 34PASS/4FAIL에서 중단했다. QA 초기화 script에 들어간 transpiler helper로 audit 객체가 만들어지지 않은 3건과 임의 마지막 focus에서 Tab을 한 번 눌러 browser chrome으로 이동한 검사1건을 확인했다. 앱 오류로 합산하지 않고 검사 장치를 수정했다. 공개 창 종료 후 닫힌 메뉴 버튼을 다시 찾는 경로도 수정하고, 실제 앱은 닫힌 메뉴의 summary로 안전하게 초점을 반환하도록 보강했다. 모달 안의 응답 유실 복구 행동도 추가했다. 초안/검토/UI 변경은 최종 통합 검사와 실제 브라우저 재실행에서 통과했다.

최종 UI run의 보상 정리 후 개발 계정 A344/B67·공유65다. 원래 빈 private space로 복원되어 두 계정의 DB JSON md5는 모두 `59391f2e812ba7d83d8e29565f4564f4`다. 공유 flows/versions/posts/replies/reactions/proposals 각각0, Storage object0, 활성 media0·취소 tombstone7, 공개 별칭2다. 전체 QA 세션0·기존 사용자 session1을 확인했다. 직접 anon/authenticated private table grant0·RLS 비활성0·임시 진단 policy0이다. QA ledger와 취소 tombstone은 남겼고 기존 ledger를 수정·삭제하지 않았다. 마지막 합성 사진1개 취소·이후 읽기404·임시 세션 폐기4/4 근거는 `output/alpha-m5-browser/m5-ui-1789998988935/media-cleanup-1789999118929.json`이다. 정리한 것은 QA 합성 자료이며 사용자 자료 삭제는 없다.

### 화면별 평가

최종 `m5-ui-1789998988935`에서 20개 PNG를 저장하고 20조합의 기하·hit-test·키보드를 검사했으며, 해상도별 대표5장을 직접 시각 확인했다. 공개 미리보기, 공개 상세, 개인 Flow 설정, 사진 포함 질문 화면 각각에서 390×844·375×812·844×390·1024×768·1440×900을 검사했다.

| 화면 | 다섯 크기 자동 검사 | 시각 확인과 한계 |
| --- | --- | --- |
| 선택 공개 미리보기 | 5/5, 넘침/핵심가림/48px 미달0 | 선택 내용과 비공개 제외 안내·명시 공개 행동 분리. 낮은 가로 화면은 dialog 내부 스크롤 사용 |
| 공개 상세·출력 | 5/5, 넘침/핵심가림/48px 미달0 | 큰 화면은 항목/출력 두 열, 좁은 화면은 한 열. 작은 화면의 상태·탐색 헤더와 출력 카드 때문에 긴 세로 스크롤이 생기는 밀도 개선은 M7 UX 재평가 대상 |
| 개인 사본 비교 창 | 5/5, 넘침/핵심가림/48px 미달0 | 844×390에서도 내부 스크롤로 제어에 접근. Escape 후 보이는 opener/menu summary로 초점 복귀 |
| 질문·사진 | 5/5, 넘침/핵심가림/48px 미달0 | 640×480 합성 사진의 비율/alt·반응/답글 접근 확인. 실제 사진 선택기·촬영·모바일 키보드는 미실행 |

브라우저 자동 검사는 실제 Android Chrome/iOS Safari, OS IME, 화면 읽기 보조기술 또는 관찰 사용자 검증으로 올리지 않는다. 의도된 장애2건을 숨겨 ‘console 전체0’이라고 쓰지 않는다.

### 남은 기능·결정과 다음 단계

- **M6:** 기존 세 산출물/네 origin의 실제 자료 명시 이관, preview0쓰기·중복 방지, 개인/공개 관계와 첨부 bytes가 포함된 전체 백업·복원, 이전 schema/앱 호환·rollback. 현재 QA 보상 SQL은 사용자의 백업/복원 기능이 아니다. 중요한 실제 자료의 유일본은 아직 넣지 않는다.
- **D05/M7:** 서비스 외부 공개 대상·신고/숨김·계정 삭제와 공개 사본/사진 보존의 충돌·파일 수명/고아 정리 정책, 긴 자료 성능/모바일 정보 밀도·실기기/보조기술·관찰 검사·운영 관측·배포 승인.
- Google OAuth·일반 사용자 이메일/SMTP·유출 비밀번호 보호는 별도 준비다. 이번에 추가 가입 메일이나 요금제 변경을 하지 않았다.
- 기존 전체 저장소 `tsc --noEmit`의 레거시 테스트 진단은 남아 있다. 이번 결과는 범위가 명시된 466진입점 타입 검사와 production build PASS이며 전체 저장소 strict0이라고 주장하지 않는다.
- 원자 부모254/하위424의 전체 충족률을 테스트 합계로 새로 계산하지 않았다. 이 문서의 12흐름과 원장 A행에 연결된 개발계 M5 근거만 추가했다.

### 발행과 관찰

| 구분 | 이번 M5 실행 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR | 생성/수정 미실행 |
| merge | 미실행 |
| Preview | 배포 미실행 |
| Production | 배포·migration·DB 접근 미실행 |
| 실제 Android Chrome / iOS Safari / OS IME / 보조기술 | 미실행 |
| 관찰 사용자 수 | 0명. A/B 합성 QA와 자동 브라우저는 사용자 연구가 아님 |
