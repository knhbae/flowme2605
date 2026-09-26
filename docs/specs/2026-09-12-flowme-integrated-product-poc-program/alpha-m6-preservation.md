# M6 자료 이관·백업·복원·업데이트

상태: **M6 개발계 목표 완료 — 구현·검증·QA 정리·결과 보고 종료.** [실사용 전환 원장](alpha-transition.md)의 A05/A13/A20–21과 T10–12 중 M6 개발계 범위를 구현·검증했다. 전체 T10–12, 실사용 준비 또는 운영 복구 완료를 뜻하지 않는다. 보고서 HTML 시각 검사는 도구 제한으로 미실행이며 아래 잔여 원장에 유지한다. M7 실기기·관찰 사용자·실사용/배포 승인은 포함하지 않는다.

## 기준선과 경계

- 격리 worktree `D:\flowme2605\flow-poc-merge-prep-20260920`, branch `agent/alpha-m1-persistence-20260921`. 2026-09-21 14:24 UTC 세션 시작, fetch 후 HEAD/origin/main `efd8b642707b5c8e67b727f23169ae41c43cb5e8`.
- 기존 modified35/untracked44는 같은 세션 M1–M5의 결과다. 이 전체를 M6 변경으로 세지 않는다. 원래 `flow-mvp`의 dirty/미추적 자료는 미소유이며 수정·정리·stage하지 않는다.
- 개발 Supabase `wkmzcxpnojobxrgebapw`와 소유가 명확한 QA 자료만 검증한다. 운영 DB, 기본 `/my`, 운영 `flow:*` 쓰기는 제외한다. 배포·유료 설정·commit/push/PR/merge는 하지 않는다.
- D03의 보관 기간/주기/RPO/RTO와 D04 실제 원본의 계정 귀속은 미결이다. 명시 선택·미리보기·확정 경로와 개발 자료 복원을 구현하되 실제 사용자 원본을 임의 이관하지 않는다.

## 실행 순서와 종료 기준

| 단계 | 작업 | 종료 기준 |
| --- | --- | --- |
| 1 요구·UX/계약 | 기존 v4.1·개발1·개발2 reader, M1 백업, M2–M5 권한/이력/사진 대조 | 원본 보관과 사용 가능한 이관, 계정 복원과 서비스 DR을 구분 |
| 2 순수 모델 | 선택 actor 추출·명시 소유 슬롯 대응·identity/hash·버전/파일 검사 | 미지원/미매핑/충돌은 0건 반영, 원문/기록/관계 검증 |
| 3 서버 | 전용 보존 명령·CAS·idempotency·개인 보관 원본·다운로드 | 공개 원본/다른 계정/기존 journal 불변, 실패 원자성 |
| 4 화면 | 내 자료 백업·파일 선택·귀속/범위 미리보기·명시 적용·실패/재시도 | 다운로드와 복원 범위 명료, 키보드/비드래그 경로 |
| 5 복원/호환 | 실제 A/B·독립 클라이언트·사진 bytes·격리 복원·구/신 계약 | 최신 서버 기록 보존·누락 파일 거절·중복0·재업데이트 |
| 6 종료 | 표적/기존 회귀·npm test·build·5해상도·정확 QA 정리 | 실제 실행 수·검증 범위/잔여·발행 상태 분리 보고 |

## 설계 판단

1. M1의 `flowme-alpha-backup/1`은 로컬/fake-server 계약이다. 실제 M4/M5 ledger와 Storage 참조를 그대로 지원한다고 표현하지 않는다. 서비스 계정 백업은 별도 v2 codec을 사용한다.
2. 계정 백업은 본인 private account와 본인이 볼 수 있는 공개 참조, 본인 명령 기록 증거, 파일 본체를 포함한다. Auth 비밀번호/토큰/session, 서명 키는 포함하지 않는다. checksum은 암호화가 아니므로 다운로드 경고를 표시한다.
3. 복원은 현재 revision에서 새 보존 명령으로 반영한다. 과거 서버 revision·idempotency journal을 덮어쓰지 않는다. 공유 공개 저장소는 복원 대상이 아니다. 최신 변경 후에는 재검토가 필요하다.
4. 로컬 actor는 계정이 아니다. 선택 actor의 private 공간만 추출하고 다른 actor의 private 공간은 전송하지 않는다. 원문 문자열을 재귀 치환하지 않고 명시 소유 슬롯만 대응한다. 원래 identity·이력·참조는 개인 원본 보관에 남긴다.
5. 로컬 mock 공개물은 서비스 공개물로 자동 승격하지 않는다. 실제 서비스에 대응하지 않는 공개 참조가 있으면 미매핑 사유를 표시하고 적용하지 않는다. 이를 이관 완료로 세지 않는다. 기존 공간과의 충돌도 자동 병합/ID 재발급으로 숨기지 않는다.
6. 전체 서비스 DR은 사용자 복원 API와 분리한다. 모든 공개 제안·identity·journal·사진 registry와 bytes가 필요한 관리자 검증이며, 현재 DEV/운영 데이터를 과거로 되감지 않는다. 사용한 격리 수준과 미실행 환경을 정확히 기록한다.
7. 기존 M3/M4/M5 guard는 완화하지 않는다. 새 계약은 additive하게 추가하고, 지원하지 않는 schema/명령은 서버에서 거절한다. 호환 앱 rollback과 과거 DB 스냅샷 덮어쓰기는 서로 다르다.

## 평가 시나리오

| ID | 흐름 | 판정 기준 | 결과 |
| --- | --- | --- | --- |
| M6-01 | 네 origin/Map/QuickItem·native saved/pending/recovery 선택 이관 | ID/원문/실행/소유 슬롯 보존·원본0쓰기 | 합성 네 origin과 native 후보의 선택 이관·재접속·백업 대조를 검사했다. 실제 사용자의 원본 계정 귀속·이관은 D04 미결로 미실행 |
| M6-02 | 미리보기·취소·같은 원본·ID 충돌·미매핑 공개물 | 상태/쓰기/중복0, 적용 범위 명시 | API 및 최종 브라우저 66/66의 미리보기·취소·중복·미매핑 거절 통과 |
| M6-03 | 계정 백업·파일 포함 검사 | owner/schema/hash/기록/참조/bytes 누락 검출 | 개발계 원본 Storage 사진 소실 후 보존 bytes 68개 복원·본인 GET hash 일치·타인 404, 재백업/동일 요청 검사 25/25 통과 |
| M6-04 | 복원·다른 기기 변경·응답 유실·재시도 | CAS/원자성·최신 보존·동일 receipt | API/CAS·브라우저 응답 유실·동일 요청 재확인, 8MB IndexedDB reload를 확인했다. 추가 실제 SQL 잠금 대기 중 세션 철회→거절·계정/원장 불변 6/6. SQL commit/cancel 동시 경쟁은 미실행 |
| M6-05 | A/B·미서명 RPC·revoked session | 타인 읽기/복원/공개 쓰기0 | 기존 RLS 18/18, 사진 복원 25/25에 더해 SQL 13/13에서 30MB quota 초과·잘못된 두 번째 파일의 반영0, 복원 사진의 직접 공개 연결/삭제 글 재노출 차단을 확인했다. 상위 게시/Undo API 자체의 우회 음성 경로는 미실행 |
| M6-06 | 분리 복원 drill | 데이터/관계/권한/사진 hash 동일, source 불변 | DEV 별도 schema/bucket의 v1 7종 479행·사진 1개와, 별도 v2 합성 fixture 8종·6행·preserved 68 bytes를 검사. v2 서비스 table/Storage hash 전후 동일. 별도 프로젝트/지역·실서비스 snapshot 복원은 미실행 |
| M6-07 | 이전/현재/미지원 schema·업데이트/rollback/재업데이트 | 지원 계약 호환·미지원 쓰기0·최신 자료 보존 | M5 재빌드↔M6 브라우저 23/23, 새 native v2 이후 M5 fail-closed와 M6 재접속 26/26. 실제 배포 rollback·DB downgrade는 미실행 |
| M6-08 | 5해상도·키보드·상태/복구 안내 | 넘침/가림/예상 밖 오류0 | 최종 소스의 백업·가져오기 미리보기·적용 뒤 공간·복원 미리보기 20화면, 브라우저 66/66 통과. 가로 넘침·핵심 행동 접근 불가·page error·예상 밖 console error 0 |

실행 결과는 완료한 검사만 아래에 추가한다. 자동화는 실제 Android/iOS 검사나 관찰 사용자 검증으로 세지 않는다.

## 2026-09-23 중간 실행 기록

- 개발계 API 시뮬레이션 `output/alpha-m6/m6-1790003093337/api-report.json` 159/159, 지원 계약 호환 `m6-compat-1790003906049.json` 31/31. 미지원 client/schema와 타 계정 접근은 쓰기 없이 거절했다. 이 수치는 브라우저 응답 유실 주입의 성공 건수가 아니다.
- 같은 DEV의 별도 복원 실험실에서 앱 테이블 7종 479행과 사진 bytes 1개를 검증했다. 권한 검사 18/18, Storage 경계 검사 24/24, Storage 청소 첫 확인 6/7 이후 캐시 우회 재확인 4/4. 실험실의 원본 데이터 해시는 전후 같고, 실험실 자료 행은 정리했다. Auth 복구·별도 지역/프로젝트·PITR·운영 복원은 미검증이다.
- M5의 당시 실행 소스 302개를 해시 대조해 현재 의존성/빌드 설정으로 다시 빌드한 화면과 현재 M6 화면을 비교했다. `m6-rollback-browser-1790119515738.json` 23/23, page error 0, 경로 오류 0. 실제 배포본 rollback이나 DB downgrade 검사는 아니다.
- 첫 M6 화면 실행은 서버 적용 1건 직후 검사 스크립트의 응답 처리 예외로 중단됐다. 두 번째 실행은 적용 직후 이전 revision을 읽어 31건 통과·1건 실패했다. 두 실행의 요청 원장과 계정 revision을 대조해 각각 적용 1건을 확인한 뒤 QA 공간·공개 저장소·추가 archive를 정확히 정리했다. 실패 기록은 보존한다.
- 후속 브라우저 `output/playwright/alpha-m6-live/m6-ui-1790121614265/results.json`: 당시 64/64, 4상태×5해상도=20화면. 이후 UI의 브라우저 대기 요청 저장 경로가 바뀌었으므로 이 결과는 이전 소스 이력이다.
- 신규 native 후보의 QA 계정 이관 뒤 이전 M5 소스를 재빌드한 앱은 새 계약을 열지 않고 계정 화면에서 멈췄다. 현재 M6 독립 세션은 같은 상태/원문/백업을 다시 읽었다. `output/alpha-m6/m6-ui-1790122995396/native-compat-report.json` 26/26, page error·mutation attempt 0. 이는 배포본 rollback 검사가 아니다.
- `output/alpha-m6/m6-private-media-1790123386974/results.json`: 25/25, `cleanupComplete=true`. QA 합성 WebP 68 bytes의 SHA-256 `1878cb72803a8fe5c92d46ea1fa78656e07a12ce56f15ccd21e14410cd00fb50`를 원본 Storage 소실→private bytes 보존→본인 GET·재백업까지 비교했다. B는 404, 오래된 revision/변조 seal/타인 backup/동일 요청 재생은 새 자료를 만들지 않았다. 대상 QA media·preserved row·Storage 객체는 0으로 정리하고 QA 세션 둘은 204로 철회했다. 이전 M5/M6의 취소된 registry 8행과 원장은 삭제하지 않았다.
- 같은 개발 프로젝트의 격리 `flowme_m6_restore_lab_v2`에 QA 사진 bytes를 이용한 **합성** 8-table package를 복원했다. `output/alpha-m6/m6-private-media-1790123386974/synthetic-dr-v2-result.json`: typed 앱행 6개, preserved row 1개/68 bytes/hash 일치, Storage 파일 0개, lab 11표 RLS+FORCE, preserved table의 anon/authenticated SELECT 권한 0. 전후 서비스 8표와 Storage의 hash/count는 동일하다. 실제 서비스 preserved 행의 snapshot, 별도 프로젝트, 운영 복구를 증명하지 않는다.
- 사진 25/25 실행 당시 미실행 목록은 SQL 동시 commit/cancel, 세션 철회, quota 초과, 원본 Storage bytes 손상, 구 M5 앱의 복원 사진 렌더, 공개 게시/Undo SQL 우회였다. 아래 후속 검사에서 quota·잠금 대기 중 세션 철회·직접 SQL 공개 연결/재노출 차단을 추가 검증했다. 첫 사진 실행의 즉시 404 확인 실패와 이후 정확한 QA 정리는 `output/alpha-m6/m6-private-media-1790123109815/results.json`에 실패 이력으로 보존한다.
- 브라우저 대기 요청은 PoC 전용 IndexedDB에 계정별 원문·명령을 거래 완료 후 기록한다. 과거 sessionStorage 대기 요청은 IndexedDB로 이전한 뒤에만 원본을 제거한다. 저장 실패면 서버 요청0, 수신 영수증의 requestId가 다르면 대기 상태 유지, 확정 거절이면 정확한 요청만 정리한다. 브라우저 보관 내용은 암호화되지 않은 개인 원문이므로 공용 기기에서 보관 정책(D03)이 확정되기 전 유일본 실사용은 금지한다.

## 2026-09-23 최종 소스 재검증과 판정 경계

| 검증 | 실제 결과 | 근거/범위 |
| --- | --- | --- |
| IndexedDB·보존 UI 표적 | 25/25 PASS | 계정·requestId 격리, 8MB 원문, 응답 불일치·저장 실패·확정 거절. 순수/컴포넌트 하니스 |
| 통합 회귀 | 219파일 2,130/2,130 PASS·skip0 | 로컬 전용 `output/integrated-product-poc/new-tests-2026-09-23T00-56-07-981Z.json`; 검사 중 source 변경0 |
| `npm test` | 2,255/2,255 PASS·skip0 | 추가 QA 도구 작성 뒤 재실행: 로컬 전용 `output/integrated-product-poc/npm-test-2026-09-23T01-32-27-656Z.json`; 검사 중 source 변경0. 앞선 00:59 실행은 이력 보존 |
| production build | PASS | 로컬 전용 `output/integrated-product-poc/build-2026-09-23T01-00-09-948Z.json`; 검사 중 source 변경0. 전체 별도 `tsc --noEmit`는 앞선 실행에서 Node 4GB heap OOM으로 종료됐으며 타입 오류 0의 증거로 쓰지 않음 |
| 최종 DEV 브라우저 | 66/66 PASS, 20화면 | 로컬 전용 `output/playwright/alpha-m6-live/m6-ui-1790125352932/results.json`; 375×812·390×844·844×390·1024×768·1440×900. 4상태의 가로 넘침/핵심 행동 접근 불가0, page error0, 예상 밖 console error0. 주입한 응답 유실에 따른 예상된 네트워크 오류1은 별도 기록 |
| 브라우저 대용량 보관 | 8MB 대기 요청 reload 복구·정확 제거 PASS | 위 66확인 중 2건. 합성 대기 자료를 브라우저 IndexedDB에 넣어 UI에서 확인한 것으로, 실제 8MB 유효 백업의 서버 복원 성공을 뜻하지 않음 |
| 문서·보안 | `docs:check` 4/4·링크 6,418 PASS; `security:audit` 취약점0 | 최종 HTML·현황 문서 수정 뒤 재실행한 이번 worktree 결과. HTML 자체 시각 검사는 파일 URL 정책으로 미실행 |

최종 브라우저의 합성 운영 `flow:*` fixture는 시나리오 전후 byte-for-byte 같고 허용 prefix 밖 `setItem`/`removeItem`/`clear`는 0건이다. QA A의 적용 요청 2건과 그 원장은 보존하고, 정확한 원본 archive 1건만 CAS·ledger digest 확인 후 제거했다. 정리 뒤 A revision417/B70, 두 계정 개인 문서·참여 draft·archive·preserved media·Storage 객체 모두 0이며 이번 실행 대상 밖의 취소된 media registry 8행은 보존했다. SQL 실행 결과 `m6_exact_fixture_cleanup_committed`; 별도 실제 Android/iOS와 관찰 사용자 0, 배포/발행 0이다.

## 2026-09-23 종료 전 추가 실패 경로 검사

- `scripts/alpha/m6-private-media-sql-probe.sql`을 실제 DEV에서 실행했다. **13/13 PASS**: anon RPC/개인 테이블 권한, 미서명 거절, 잘못된 두 번째 파일의 전체 반영0, 30MB 보관 한도 초과의 계정·원장·파일 반영0, bytes-only 복원 1회, 같은 요청 재생, 본인 GET hash, 직접 SQL의 신규 공개 연결과 삭제 글 재노출 차단, 취소 뒤 읽기/재복원 거절, 없는 세션 거절을 확인했다. 모든 임시 쓰기는 PL/pgSQL subtransaction으로 되돌렸고 서비스 8표와 Storage 목록 hash가 전후 동일했다. 근거: 로컬 전용 `output/alpha-m6/m6-sql-probe-20260923/results.json`.
- 이 SQL 검사는 이미 발급된 QA 세션의 claim을 사용하는 DB 경계 검사다. fixture bytes는 이미지 디코딩을 검증하지 않는 합성 문자열이며, 실제 WebP/HTTP 검사는 앞선 사진 25/25를 따른다. 삭제 글 재노출 검사는 Undo가 통과해야 하는 동일 DB trigger를 직접 검사한 것이며 상위 Undo API 실행으로 세지 않는다.
- `scripts/alpha/m6-revocation-wait-live.ts`의 실제 독립 QA 세션 검사 **6/6 PASS**. 계정 행 잠금 획득 01:31:03.195 UTC → 복원 RPC 대기 관찰 01:31:04.520 → 그 세션 철회 관찰 01:31:08.363 순서를 잠금을 가진 DB 연결에서 기록했다. 대기 시작 시에는 세션이 살아 있었으며 해제 뒤 RPC는 `unauthenticated`를 반환했다. 계정·공개 context·명령 원장·archive hash는 동일하고 앱 쓰기0, 이번 실행의 두 세션은 각각 logout 204로 종료했다. 근거: 로컬 전용 `output/alpha-m6/m6-revoke-wait-1790127019922/results.json`.
- 첫 잠금 관찰 시도 `m6-revoke-wait-1790126768695`는 `lock-held-not-verified`로 실패했다. 별도 connector 호출이 잠금 보유 구간을 관찰하지 못했으므로 통과로 세지 않았고 자체 세션 둘은 204로 종료했다. 후속 실행은 잠금 보유 연결 내부에서 RPC 대기와 세션 소멸을 관찰했다. 첫 실패 보고서는 보존한다.
- 이번 추가 변경은 QA SQL·실행 도구와 문서다. 제품 런타임 코드는 변경하지 않았다. 신규 실행 도구의 strict TypeScript 검사는 처음 명시 타입 2건을 요구해 보완한 뒤 exit0; `npm test` 재실행은 2,255/2,255 PASS다. 기존 제품 브라우저·빌드 증거를 QA 도구의 실행 증거로 대신하지 않는다.
- 추가 19건 종료 뒤 서비스 8표와 Storage 목록을 다시 조회한 hash도 SQL 검사 시작값과 모두 같았다. 최종 QA 도구 SHA-256과 함께 로컬 전용 `output/alpha-m6/m6-sql-probe-20260923/postflight.json`에 보존했다. 이전 실패 시도까지 포함해 이번 도구가 만든 로그인 세션 4개는 각각 local-scope logout 204로 종료했다.

## 목표 요구별 종료 대조

| 목표 요구 | 현재 근거 | 판정·경계 |
| --- | --- | --- |
| 격리 작업·소유·운영 데이터 보존 | 현재 branch/HEAD, 코드 diff, 브라우저 운영형 key/value 비교, DEV SQL 8표+Storage hash | 확인. 원래 worktree와 운영 DB 쓰기0; 실제 운영 DB 내용 전후 대조를 뜻하지 않음 |
| v4.1·개발1·개발2 자료의 명시 선택 이관 | source/import 모델 검사, API 159/159, native 독립 세션 26/26, 최종 UI 66/66 | QA 원본으로 확인. 사용자 실제 원본의 선택/계정 귀속은 D04 |
| 원문·identity·개인 기록·공개 관계 보존 | backup/import/DR 모델 검사, API·native·사진·v1/v2 DR 결과 | 확인한 계약 범위 통과. 공유 공개 저장소는 계정 복원 대상이 아님 |
| preview·거절·중복·응답 유실·실패 원자성 | 브라우저 66/66, 사진 25/25, 추가 SQL 13/13와 대기 중 세션 철회 6/6 | 확인. 실제 동시 commit/cancel과 상위 게시/Undo API 우회는 추가 미실행으로 유지 |
| 버전 백업·사진 bytes·독립 복원 drill | sealed v2/실제 WebP 25/25, 같은 DEV의 분리 schema/bucket v1 479행 및 v2 합성 6행/68 bytes | 개발 복원 범위 통과. 운영·별도 프로젝트·Auth/PITR 복원은 목표 밖 |
| 이전 schema/앱·update/rollback/재접속 | 계약 31/31, 재빌드 M5↔M6 23/23, native v2 fail-closed/현재 앱 26/26 | 로컬 앱 호환 범위 통과. 실제 배포 rollback은 실행하지 않음 |
| 회귀·npm test·production build | 통합 2,130/2,130, 최신 npm 2,255/2,255, production build PASS | 제품 런타임 기준 통과; 추가 QA runner strict 타입 exit0 |
| 5해상도·키보드/비드래그·사용자 상태 | 4상태×5해상도 20화면·최종 브라우저 66/66 | 자동 브라우저 범위 통과. 실제 기기·관찰은 M7 |
| 정확한 QA 정리 | 마지막 app QA의 CAS·ledger digest 정리, 추가 SQL 전체 rollback과 8표+Storage hash, 자체 세션 종료 | 추가 검사 뒤에도 앱 자료 불변; 과거 ledger·취소 registry 보존 |
| 결과·잔여 원장·HTML 보고서 | 이 문서와 HTML 보고서, docs:check | 내용·링크 검사 완료. HTML desktop/390px 실제 렌더 검사는 브라우저 URL 정책으로 미완료 |

HTML 보고서 자체의 시각 검사는 도구 제한에 따른 미검증으로 남긴다. 제품 UI 20화면 검사로 대신 통과시키지 않으며 이 제한만으로 개발계 목표 전체를 사용자 승인 대기에 두지 않는다. 동시 취소/복원 등 추가 검사와 실사용 준비의 경계는 아래 원장을 따른다.

### 종료 감사와 이전 차단 판정 정정

2026-09-23 마지막 읽기 전용 감사에서 현재 제품 소스 534개의 SHA-256이 통합 2,130/2,130·최신 npm 2,255/2,255·production build의 각 기록과 모두 일치했다. 누락/변경된 소스0, 추가 SQL·세션 검사 도구의 사후 기록 대비 변경0, 기본 `app/my` diff0이다. 제품 브라우저 기록은 66/66·20화면·예상 밖 오류0과 운영형 저장 fixture 불변을 증명하지만 보고서 HTML 화면을 증명하지 않는다.

보고서 파일 URL의 Browser Use 보안 정책 차단 때문에 앞서 목표를 `blocked`로 기록하고 사용자 확인 또는 검사 유보 승인을 요구했다. 이는 보고서 품질 검사의 제한을 제품 목표의 승인 대기로 확대한 잘못된 분류였다. 사용자의 2026-09-23 종료 정리 진행 요청에 따라 이를 정정한다. 동일 파일을 다른 브라우저·서버·간접 실행으로 여는 우회는 하지 않으며 시각 검사가 통과했다고 기록하지 않는다. 사용자에게 별도 면제 결정을 요구하지 않는다.

2026-09-23 02:19 UTC 종료 대조에서 제품 소스 534개가 위 통합·npm·build 세 기록에 각각 모두 일치했고 추가/변경/누락0, 기본 `app/my` diff0이었다. 이번 종료 작업은 현황 문서 6개만 수정했다. 제품 코드·DB·계정·원본 증거·기존 HTML 스냅샷은 변경하지 않았다. 테스트와 빌드는 재실행 수치가 아닌 동일 소스의 기존 실행 근거다. 종료 문서의 `docs:check`는 4/4·로컬 링크 6,419 PASS, `git diff --check` exit0이며 scoped closeout과 변경 내용을 대조했다.

### 잔여 검사의 분류와 후속 완료 조건

| ID | 미실행·잔여 | M6 판정 근거 | 후속 작업과 완료 조건 |
| --- | --- | --- | --- |
| M6-R01 | 실제 SQL 동시 취소/복원 경쟁 | CAS·복수 파일 전체 거절·취소 후 차단·잠금 대기 중 세션 철회는 실제 DEV 통과. 동시 취소 경합 자체는 증명하지 않음 | M7 실자료 투입 전 강화 검사: 독립 요청의 실제 대기를 관찰하고 순서별 허용 결과·계정/원장/bytes 일관성 확인 |
| M6-R02 | 손상된 원본 Storage bytes의 실제 DEV 경로 | codec의 hash/누락 거절, SQL 잘못된 두 번째 파일의 반영0, 실제 원본 소실 후 복원으로 기본 보존 계약 확인. 손상 Storage 실험은 별도 | M7 실자료 투입 전 강화 검사: 소유 QA 객체만 손상시켜 거절·쓰기0 확인 후 정확 정리 |
| M6-R03 | 상위 게시/Undo API의 복원 사진 우회 | 실제 DB trigger의 신규 공개 연결·삭제 글 재노출 거절 확인. 상위 API 실행과 동일하다고 주장하지 않음 | M7 공개·실자료 gate: API 경로에서도 비공개 bytes 공개/재노출0 확인 |
| M6-R04 | 구 M5 앱의 복원 사진 렌더 | M6 독립 클라이언트 읽기·재백업과 구 앱 계약 호환/미지원 차단 확인. 구 앱의 신규 보존 사진 표시를 지원 완료로 간주하지 않음 | rollback 지원 범위 검토 시 재현. 구 앱이 사진을 표시하지 못하면 배포 rollback 후보로 승인하지 않음 |
| M6-R05 | 큰 유효 백업의 실제 서버 왕복 | 8MB 검사는 대기 요청 IndexedDB reload만 증명. 실제 작은 사진 파일 복원과 서버 quota 거절은 확인 | M7 실자료 크기 범위 확정 전 유효 대용량 백업 왕복·시간/메모리·실패 원자성 확인 |
| M6-R06 | HTML desktop/390px 시각 검사 | 내용·링크 검사만 완료. 보고서 화면은 미검증이고 제품 UI 검사와 독립 | 정책상 허용된 검사 경로가 제공될 때 재개. 현재 우회·사용자 면제 요청 없이 제한 공개 |
| M6-R07 | 별도 프로젝트/지역·Auth/PITR·배포 rollback | 같은 DEV의 분리 schema/bucket 복원 및 로컬 구/신 앱 대조로 승인된 개발계 drill 충족 | 운영 복구·배포 계획에서 필요한 환경/권한/비용 승인 후 실제 drill. M6 완료로 승인하지 않음 |
| M6-R08 | D03–D05·실제 원본 귀속·실기기/관찰 | 목표에서 운영 정책 확정·실제 원본 임의 귀속·실사용/배포를 제외함 | M7 준비에서 백업 정책·이관 대상·공개/삭제 선택지 제시, 실제 기기·관찰 결과 별도 기록 |

위 잔여는 삭제하거나 통과로 바꾼 항목이 아니다. M6는 합성 QA 자료를 사용한 개발계 구현·검증 목표로 완료하며, 강화 검사와 운영 정책이 남은 상태에서 중요한 자료의 유일본 투입 또는 공개 서비스를 승인하지 않는다. 알려진 검사 실패 이력은 앞 절에 보존한다. 이번 M6 commit·push·PR·merge·Preview·Production 모두 미실행, 실제 Android/iOS 검사 미실행, 관찰 사용자 0명이다.
