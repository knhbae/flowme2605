# M7-1 실자료 투입 전 안전성·운영 준비

상태: **M7-1 준비 목표 완료**. 2026-09-23 사용자가 다음 목표 설정·실행을 승인했다. [알파 전환 원장](alpha-transition.md)의 M7을 단계별로 진행하는 첫 묶음이며 [M6 종료 원장](alpha-m6-preservation.md)의 R01–08을 이어받았다. 안전성 강화·확인된 결함 수정·QA 정리·운영 선택지와 후속 계획을 완료했다. M7 전체 실사용·실기기·정책 확정·배포 완료가 아니다.

## 경계와 기준선

- worktree `D:\flowme2605\flow-poc-merge-prep-20260920`, branch `agent/alpha-m1-persistence-20260921`, HEAD `efd8b642`. 세션 시작 2026-09-23 02:35 UTC: modified42/untracked50은 기존 M1–M6 작업이다. 원래 `flow-mvp`와 미소유 파일을 변경·stage·정리하지 않는다.
- 개발 Supabase `wkmzcxpnojobxrgebapw`와 소유가 확인되는 합성 QA만 사용한다. 운영 DB·기본 `/my`·운영 저장 key는 쓰지 않는다. 실제 사용자 원본의 귀속·이관도 실행하지 않는다.
- 제품 결함이면 최소 수정과 회귀를 진행한다. 운영 정책 확정·새 외부 자원·유료 설정·commit/push/PR/merge·Preview/Production은 이번 목표 밖이다.
- 실기기·관찰 사용자·배포 실행은 자동 브라우저와 구분한다. 보고서 렌더 제한은 우회하거나 목표 전체의 사용자 면제 요청으로 확대하지 않는다.

## 단계별 계획과 판정 기준

| 순서 | 작업 | 완료 조건 |
| --- | --- | --- |
| 1 기준선·검사 설계 | M6 근거/코드·DEV 상태·소유 QA 대조, 실패 순서와 허용 결과 정의 | 실제 경합/정적 검토/모의 검사를 구분한 실행 계획, 원본 보존 경계 |
| 2 데이터 안전성 | 취소/복원 두 순서의 실제 잠금 경쟁, 손상 Storage, 게시/Undo 우회, 큰 유효 백업 | 실제 API/SQL 결과·account/ledger/bytes 대조, 실패·취소·중복의 허용 결과 명시 |
| 3 수정·호환·회귀 | 확인된 결함의 최소 수정, 구 M5 복원 사진 호환과 배포 rollback 후보 판단 | 표적·통합·npm/build, 영향 화면 검사, 미지원 동작 fail-closed |
| 4 운영·UX 준비안 | D03 백업/보관/복구 목표, D04 원본·계정, D05 공개/삭제, 실제 기기·배포/복구 절차 | 구현된 것·제안·결정 필요를 구분한 선택지와 권장안, 현재 공식 자료 근거 |
| 5 종료 | 정확 QA 정리·기존 기록 불변·실행 수·잔여 연결 | 검증/미실행과 실사용·발행 승인을 분리한 결과 보고 |

## 실행 결과

초기 조사에서 백업 본체의 크기와 실제 복원 요청의 JSON 포장 크기가 달라지는 결함을 재현했다. 합성 archive 문자열에 역슬래시 7,500,000개를 넣으면 생성 파일은 약 15MB지만 복원 요청은 30MB를 넘는데, 수정 전에는 정상 다운로드 응답이었다. 표준 클라이언트의 완성된 복원 요청 크기(UTF-8·JSON escape·최대 requestId/revision 포함)를 계산해 내려주기 전에 거절하도록 수정했다. 30MB 전송 한도는 바꾸지 않았다. 이 경계 재현은 handler 검사이며 실제 이관 원본의 사례로 주장하지 않는다.

손상 Storage 검사에서는 손상 bytes를 정상 백업으로 내보내지 않는지와, 검증된 기존 백업의 bytes로 명시 복원할 수 있는지를 별도로 판단한다. 원본 Storage를 정상 bytes로 몰래 덮어쓰는 경로는 사용하지 않는다.

### M6 잔여와 이번 시나리오의 대응

| 기존 잔여 / 관련 요구 | 이번 실제 결과 | 판정과 남는 범위 |
| --- | --- | --- |
| R01 동시 취소·복원 / A18–20 | DEV 계정 잠금을 잡고 취소/복원 RPC 두 개의 실제 대기를 관찰했다. 취소 먼저: 복원 `missing-file`, 계정·원장·보존 bytes 추가0. 복원 먼저: 영수증·원장·bytes 1회 성공 뒤 취소 성공 | 두 순서 PASS. 어느 순서든 이후 사진404·새 복원 시도 차단. 모든 네트워크/잠금 순열의 보장은 아님 |
| R02 손상 Storage / A20 | 소유 합성 WebP 68bytes와 다른 bytes를 같은 정확한 경로에 주입. 원본 조회400·백업 `missing-file`, 부분 파일 반환0·앱 mutation0. 서명된 정상 백업을 명시 복원하면 private bytes hash 일치·본인200/타인404 | PASS. 손상 원본 객체는 덮어쓰지 않았고, 이후 자신의 fixture만 제거 |
| R03 게시·Undo 우회 / A15–20 | 복원 사진의 실제 `participation-submit` 거절, preservation 영수증을 social Undo로 사용 거절, 기존 소유 `post-delete` 원장의 Undo `undo-conflict`. 각각 계정·원장·공개 context 동일 | 실행한 상위 API 경로 PASS. ‘복원 사진을 포함한 삭제 공개글’ 자체를 새로 구성한 Undo는 미실행. M6 DB trigger 음성 검사와 구별 |
| R04 구 앱 복원 사진 / A21 | 재빌드 구 M5 media API400, 현 앱200 | **미지원 확인·rollback 후보 제외**. 구 앱 사진 렌더 성공이나 배포 rollback 성공이 아님 |
| R05 큰 유효 백업 / A20/A23 | 실제 QA 계정에 합성 문서50개 저장, seal 백업 **10,224,235 bytes** 생성→기준 상태 복원→대형 백업 복원→독립 로그인 세션에서 space hash·재백업 일치 | 실제 서버 왕복9/9 PASS. 별도 계정 불변·기준 내용 복구. 최대 용량/지연·메모리 성능 예산 검사는 아님 |
| R06 과거 HTML 보고서 렌더 | 기존 차단된 파일/접근 경로는 재시도·우회하지 않음 | 미검증 유지. 이번 앱 20화면 검사를 HTML 보고서 시각 검증으로 계산하지 않음 |
| R07 서비스 DR / A20–21 | 백업 범위·호스트/복구 절차와 판정 조건을 아래에 정리 | 준비안 완료, 별도 프로젝트/지역·Auth·운영 전체 복원 미실행 |
| R08 정책·실기기 / A22–24 | D03/D04/D05 선택지·권장안과 기기별 실행표 작성 | 준비안 완료, 정책 확정·실기기·관찰 사용자 미실행 |

### 자동·실제 개발계 검사

수치는 서로 다른 검사 묶음이며 중복되는 표적 검사를 더해 ‘고유 요구사항 수’로 계산하지 않는다. `output/`은 공개 Git에 포함하지 않는 로컬 전용 원본 근거다.

| 검사 | 결과 | 이번 실행 근거 |
| --- | --- | --- |
| backup/contract/handler | 35/35 PASS | 30MB 경계·UTF-8/escape·160 code-unit request ID·다운로드 전 거절, 서버 writes0 |
| M7 QA 도구 | 12/12 PASS | `scripts/alpha/m7-*-live.test.ts`; 대형 유효 fixture·미소유/원장/공개/귀속 변경 시 정리 거절·경합 SQL 범위 |
| source reader 추가 assert + M7 도구 재검사 | 22/22 PASS | source 10 + QA12. 테스트 자료의 working/candidate 존재를 실제 assert; non-null 강제 형변환으로 숨기지 않음 |
| DEV media·손상·우회·경합 | 50/50 PASS, 정리 완료 | `output/alpha-m7/m7-media-safety-1790131616011/results.json`, 실제 SQL bridge13회 포함 |
| DEV 대형 백업 왕복 | 9/9 PASS, 정리 완료 | `output/alpha-m7/m7-large-1790132434648/results.json` |
| DEV 실제 Chrome UI | 66/66 PASS | `output/playwright/alpha-m6-live/m6-ui-1790132285026/results.json`. M6 도구를 **이번 수정판에서 재실행**한 결과 |
| npm test | 2,255/2,255 PASS·skip0 | `output/integrated-product-poc/npm-test-2026-09-23T02-47-02-893Z.json` |
| production build | PASS | `output/integrated-product-poc/build-2026-09-23T02-43-59-750Z.json` |
| 최종 전체 통합 | 2,134/2,134 PASS·skip0·cancel0 | `output/integrated-product-poc/new-tests-2026-09-23T03-03-20-796Z.json`; 테스트 파일 assert 보완 후 재실행, 220파일. 앞선02:44 실행도 같은 개수 PASS |
| 현재 제품 strict | 483진입점/535소스·진단0 | `output/integrated-product-poc/targeted-types-2026-09-23T03-04-41-794Z.json` |
| 검사 도구 회귀·strict | 수집기10/10, M7 네 파일 strict exit0 | Windows/POSIX 혼합 경로에서 실제 소스 유지·historical output 제외 |
| 의존성 보안 | 취약점0 | 이번 `npm.cmd run security:audit` 실행. Supabase 설정의 유료 유출 비밀번호 보호 잔여 WARN과 별개 |
| 종료 문서·diff | docs4/4·로컬 링크 검사 PASS, diff 오류0 | `output/integrated-product-poc/docs-2026-09-23T03-14-49-435Z.json`. skill 동기화·링크 검사이며 HTML 렌더 검사 아님 |

9/23 03:12 UTC 개발계 Security Advisor를 재조회했다. 기존 유출 비밀번호 보호 미설정 WARN1은 유지한다([공식 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)). RLS는 켜져 있지만 클라이언트 정책이 없는 private/복원 실험실 테이블 INFO29도 별도 기록한다([공식 진단](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)). 이29개는 anon/authenticated CRUD grants0임을 사후 SQL로 확인했다. 전체31테이블 중 나머지2개는 이전 복원 실험실의 본인 SELECT 정책이 있는 accounts이며 anon 접근·클라이언트 쓰기 권한은 없다. schema USAGE가 있다는 사실을 table 접근 허용과 혼동하지 않는다. 이 알림을 지우려고 정책을 개방하지 않는다. 의존성 audit0을 DB/Auth 전체 보안 경고0으로 표현하지 않는다.

### 화면별 평가와 한계

백업·이관 미리보기·이관 후 공간·복원 미리보기 네 상태를 각 크기로 검사했다. 브라우저에서 보이는 버튼/입력/선택/링크를 스크롤해 접근 가능 여부를 검사했다. 작은 화면에서 모든 조작이 첫 화면에 동시에 보여야 한다는 뜻은 아니다.

| 해상도 | 실행 평가 |
| --- | --- |
| 390×844 | 4상태, 가로 넘침0·조작 접근 불가0. 백업 화면 캡처 직접 확인 |
| 375×812 | 4상태, 가로 넘침0·조작 접근 불가0. 미리보기 하단은 dialog 내부 스크롤 필요; 캡처 직접 확인 |
| 844×390 | 4상태, 가로 넘침0·조작 접근 불가0. 낮은 높이에서 dialog 스크롤 필요; 복원 화면 캡처 직접 확인 |
| 1024×768 | 4상태, 가로 넘침0·조작 접근 불가0. 이관 후 공간 캡처 직접 확인 |
| 1440×900 | 4상태, 가로 넘침0·조작 접근 불가0. 복원 범위/확인 안내 캡처 직접 확인 |

예상 밖 console/page error0, 응답 유실을 주입한 예상 네트워크 오류1을 별도 기록했다. Escape 후 opener 초점 복귀·파일 선택·미리보기 취소·명시 복원·reload와 같은 request 재시도를 검사했다. 캡처의 분홍색은 계정 정보 마스크다. 20장은 자동 캡처했고 위 대표5장을 직접 확인했다. 작은 화면의 긴 dialog·복원 안내/핵심 버튼의 아래쪽 배치는 접근 불가 결함은 아니지만 후속 사용성 검토 대상이다. 이번 검사는 전체 앱 모든 화면/키보드/48px/OS 입력기 검사를 대신하지 않는다.

### 데이터 경계와 QA 정리

- 운영 프로젝트 SQL·쓰기0, 원래 `flow-mvp` 수정0. 실제 운영 DB 전체를 읽어 byte 비교한 증거는 아니며, 개발 QA와 혼동하지 않는다.
- 제품 UI의 독립 세 프로필 모두 합성 운영 `flow:*`의 전후 bytes 동일, 허용 prefix 밖 `setItem`/`removeItem`/`clear`0. 실제 사용자 브라우저의 저장소를 초기화하지 않았다.
- media fixture의 registry·private preserved bytes·Storage 객체를 정확한 id/request/hash/owner·현재 참조 확인 뒤 제거했다. 합성 원본은 로컬 backup/manifest로 보존했다.
- 브라우저 QA의 이관 archive 정확히1건만 CAS·전체 ledger digest 확인 후 제거했다. 원문은 로컬 `output/alpha-m6/m6-ui-1790132285026/cleanup-private.json`에 보존했다. 기존/이번 실행 원장은 삭제·되감지 않았다.
- 대형 QA 문서50개는 기준 백업 복원으로 개인공간에서 제거했다. 4개 신규 거래 원장(대형 합성 텍스트 포함)은 의도적으로 남겼다. 기록이 커지면 백업 한도에 접근하므로 장기 보관/압축·분할은 후속 설계이며 이번에 임의 삭제하지 않는다.
- 마지막 DEV 사후 조회: A revision427/B70, 두 계정 문서·참여 draft·archive·preserved0, bucket 객체0, 기존 취소 registry8 보존, 공개 revision70 유지. 테스트 자체의 성공/보상 거래 때문에 A revision 증가가 정상이다.
- media/large 도구의 자체 로그인 세션5개는 각각204로 철회했다. UI와 읽기 근거 도구도 자기 세션만 로그아웃했다. 다른 사용자 로그인 세션은 종료하지 않았다.
- UI의 정확한 QA 세션3개는 사후 Auth 조회에서도 잔여0을 확인했다. 로컬 근거 `output/alpha-m6/m6-ui-1790132285026/exact-session-check.json`.

### 실패 이력과 수정 범위

1. 백업 크기 회귀는 수정 전0/1 FAIL(거절해야 할 응답이 성공). 전송 한도를 늘리거나 자료를 잘라 통과시키지 않았다.
2. M7 대형 fixture 테스트의 union 종류를 먼저 assert하지 않아 QA strict 진단1건. `change-private` 실제 assertion을 추가하고 네 QA 파일 strict를 재실행해0으로 확인했다.
3. 통합 strict가 Windows 혼합 경로에서 historical M5 앱 사본까지 읽었다(1,699진입점). 경로 수집기를 현재 `lib/components/flow/integrated-poc`로 한정하고 역사 파일은 수정하지 않았다. 이 범위는 원래 검사 목적과 같고 테스트를 임의 제외한 것이 아니다.
4. 현재 소스만 검사하자 M6 source reader 테스트의 nullable fixture 진단22건이 남았다. working/candidate 존재를 assert하는 세 곳을 보완한 후 483진입점 진단0과 source10/10을 확인했다. 제품 reader 동작은 바꾸지 않았다.

### 이번 변경 파일

- 제품: `lib/flow/integrated-poc/alpha-preservation/contract.ts`, `alpha-server/preservation-handler.ts` — 내보내는 백업의 표준 복원 요청 크기 검사.
- 제품 검사: 같은 경로의 `alpha-preservation/contract.test.ts`, `alpha-server/preservation-handler.test.ts`, `alpha-preservation/source.test.ts`.
- QA 도구: `scripts/alpha/m7-media-safety-live.ts`·`.test.ts`, `scripts/alpha/m7-large-backup-live.ts`·`.test.ts`.
- 검사 수집기: `scripts/personal-workspace-poc/program-source-files.mjs`, `program-source-files.test.mjs`, `program-check.mjs`.
- 문서: 이 원장, `alpha-transition.md`, `current-checkpoint.md`, `docs/STATUS.md`, `PROJECT_CONTROL.md`, `ROADMAP.md`, `SERVICE_STRUCTURE.md`. 기존 M1–M6 미커밋 파일 전체를 이번 변경으로 세지 않는다.

commit·push·PR·merge·Preview·Production: **이번 목표에서 모두 미실행**. 실제 Android/iOS/태블릿/AT: **미실행**, 관찰 사용자 **0명**. 과거 HTML 보고서는 수정하지 않았으며 이번 정본 Markdown을 검증 결과와 운영 준비안의 위치로 사용한다.

scoped closeout은 기존 untracked 폴더 아래의 개별 파일을 모두 열거하지 못하므로 감지10개를 변경 파일 총수로 사용하지 않는다. 위 명시한19개 경로(제품/검사5·QA4·수집기3·문서7)를 직접 대조했다. npm/build 기록의535소스 중 현재와 다른 것은 이후 존재 assert를 보완한 `alpha-preservation/source.test.ts` 한 파일뿐이며 실행 제품 소스는 모두 같다. 최종 통합·strict는 현재535소스와 일치한다. `app/my` diff0, HEAD/origin-main `efd8b642` 유지. 소유 QA 정리 외 운영·정책·발행 변경 없이 준비 목표를 종료한다.

## 운영 준비 결정안 — 아직 정책으로 확정하지 않음

아래 권장안은 이번 구현의 운영 보장을 뜻하지 않는다. 사용자의 선택 전에는 실제 자료 이관·자동 백업·삭제·가입 설정·배포를 실행하지 않는다.

| 구분 | 권장안 | 사용자 선택·확인할 것 | 후속 실행의 완료 조건 |
| --- | --- | --- | --- |
| D03 백업 위치 | 저장소 밖의 사용자 지정 폴더 + 별도 기기/사용자 소유 저장소의 암호화 사본 | 실제 저장 위치와 두 번째 사본 위치. 앱 파일의 서명은 암호화가 아님 | 파일 접근권한·암호화 도구·키 보관을 점검하고 해당 사본에서 복원 |
| D03 주기·보관 | 작업한 날 종료 시점과 이관·업데이트 직전 백업; 일별 7개·주별 4개를 임시 검토안으로 제안 | 허용 손실 목표 24시간·복구 목표 1일이 적절한지 | 실제 복원 시간 측정 전에는 보장 수치로 표시하지 않음. 자동 생성·삭제 작업은 별도 구현/승인 |
| D04 이관 | 한 실제 계정 + 사용자가 고른 소량 자료의 복사 이관부터 | 목적 계정과 개인 기록/제작 원문 목록. QA A/B라고 추정하지 않음 | 원본 hash/identity·개인 기록·사진 전후 대조, 두 번째 기기 읽기·재import 중복0. 원본 삭제·mock 공개 승격0 |
| D05 공개 | 개인 자료 기본 비공개, 공개는 별도 명시 행동. 가입 개방과 공개 운영 준비를 구분 | 공개 대상, 신고/숨김 담당·지원 경로, 계정/게시물/첨부 삭제 범위 | 공개 전 신고 접수·운영자 조치·처리 기록과 삭제 영향표 검증. 이미 내려받은 파일 회수나 즉시 백업 소멸을 약속하지 않음 |

‘누구나 가입 가능’, Google 우선/복잡하면 이메일, 초기 무료 검증, 배포 별도 승인은 기존 결정을 유지한다. 이 문서는 이를 초대제로 바꾸거나 유료 서비스로 전환하지 않는다. 공개판 철회와 타인의 기존 사본·실행 이력, 계정 삭제와 첨부/백업 삭제는 영향 미리보기 후 별도 정책으로 결정해야 한다.

### 무료 검증의 범위

2026-09-23 공식 자료 조사: Supabase Free의 자동 백업·PITR 미포함, DB 500MB·Storage 1GB·비활성 1주 pause·활성 프로젝트 2개 한도를 운영 가정에 반영한다. DB 백업에 Storage 실제 객체 bytes는 포함되지 않으므로 파일과 SQL/Auth/공개 관계의 서비스 복구를 계정 export 하나로 대신하지 않는다. [요금·무료 범위](https://supabase.com/pricing), [백업 범위](https://supabase.com/docs/guides/platform/backups).

기본 메일 발송은 개발 검증용 제한과 전달 보장 부재가 있어 기존 두 계정 로그인이 일반 가입 준비 완료의 근거는 아니다. 공개 가입 전에 발송 서비스·제한·복구·남용 방지를 확인해야 한다. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp). 이 단계에서 서비스 가입·비용 발생 설정은 하지 않는다.

### 배포 방식과 복구 절차 준비

현재 `/alpha`는 Node POST API와 서버 사진 재인코딩(`sharp`)에 의존한다. github.io에 정적 파일을 올리는 것만으로 현재 계정·저장 제품을 서비스할 수 없다. GitHub Pages는 정적 소개/비로그인 데모 후보로 한정하며, 공식 제한도 비밀번호 등 민감한 거래 용도를 경고한다. 별도 backend 분리는 origin·쿠키·CORS·CSRF·인증 redirect의 별도 설계가 필요하다. [Pages 역할](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Pages 제한](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Next 정적 export 제한](https://nextjs.org/docs/app/guides/static-exports).

권장 순서는 Vercel 접근 제약을 고려해 **표준 Node 호스트 후보의 접근성·무료 제한 조사 → 현재 앱 호환 검사 → 사용자 배포 승인**이다. Cloudflare 같은 다른 런타임도 후보지만 Next/Node/사진 처리의 무변경 호환을 가정하지 않는다. [Cloudflare Next 가이드](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/). 이번 목표는 호스트 선정·배포 승인이 아니라 필요한 검사와 선택지를 준비한다.

배포 실행 시 필요한 절차:

1. 고정 HTTPS 주소와 환경별 프로젝트/비밀키/redirect를 대조하고 자동 배포 연결을 확인한다.
2. 배포 직전 계정 백업과 서비스 SQL·Storage·Auth 복구 범위, 정상 복구 가능한 앱 버전을 기록한다.
3. 합성 계정으로 로그인·두 기기 변경·권한·파일 업로드/복원·오류/비용 관측을 검사한다.
4. 문제가 있으면 새 쓰기를 제한하고 기록·미확정 요청을 보존한다. 구 앱이 새 자료를 읽지 못하면 DB를 되감지 말고 호환 수정본을 준비한다.
5. 사용자 원본은 정확한 대상·현재 revision·백업 사본을 확인한 후 승인된 방식으로만 복구한다. 배포 rollback과 DB snapshot 덮어쓰기는 별개다.

## 실제 기기 검사 계획 — 미실행

| 실제 환경 | 집중 검사 |
| --- | --- |
| Android Chrome | 350ms 길게 누르기·8px 취소·뒤로가기·백업 저장/선택·사진·회전 |
| iPhone Safari | 키보드/safe area·가로 화면·Files 백업/복원·background 복귀·사진 |
| 태블릿의 실제 OS/브라우저 | 터치+키보드·분할 화면·다른 기기의 수정 충돌 |
| 데스크톱 Chrome/Edge | 키보드 이동·초점 복귀·한글 IME·Undo/Redo·다운로드 |
| TalkBack 또는 VoiceOver | 로그인·핵심 이동·오류/충돌·복원 안내 |

공통 판정: 가로 넘침·핵심행동 가림·예상 밖 page error0, 기존 지정 48px 행동 크기, 비드래그 대안, 중복 저장0, 계정 전환 혼입0, 미확정 요청 자동 공개0. 실제 기기명·OS/브라우저 버전·수행자·시각·시나리오·결과를 기록한다. 자동 브라우저 해상도 검사를 실제 기기나 관찰 사용자 수로 합산하지 않는다.

## 다음 단계의 경계

- M7-1 종료: 강화 QA 결과·수정·정확 정리와 위 결정/검사 준비안. 사용자 실제 자료와 외부 배포가 없어도 이 준비 목표는 종료할 수 있다.
- M7-2 제한 실자료 시험: D03/D04 선택, 원본 독립 보관, 실제 두 기기 왕복·복구 확인이 선행한다.
- 외부 공개 전: D05·가입 메일·남용 방지·오류/비용 관측·서비스 복구·호스트 접근성 충족 후 별도 배포 승인.
