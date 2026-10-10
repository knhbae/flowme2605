# M4 제작·저장 이력 — 실행 계획과 검증 기록

상태: **M4 개발계 구현·검증 완료 — 2026-09-21.** 개발2 제작 작업공간을 `/alpha`의 실제 개발 계정 저장에 연결했다. 이 문서는 [실사용 전환 원장](alpha-transition.md)의 A12–14/A19 중 이번에 적용한 범위를 기록한다. 실제 옛 자료 이관·전체 백업/복원·실기기 조건까지 완료한 것은 아니며 별도 제품 정책을 만들지 않는다.

## 기준선과 경계

- 작업공간: `D:\flowme2605\flow-poc-merge-prep-20260920`, branch `agent/alpha-m1-persistence-20260921`, HEAD 및 조회한 origin/main `efd8b642707b5c8e67b727f23169ae41c43cb5e8`.
- 기존 M1–M3 미커밋 변경을 보존한다. 원 저장소의 dirty·미추적 파일은 미소유다.
- 개발 프로젝트 `wkmzcxpnojobxrgebapw`만 사용한다. 운영 프로젝트, 기본 `/my`, 운영 `flow:*` 저장 및 writer는 변경하지 않는다.
- 로컬 복구 쓰기는 `flow:poc:personal-workspace:v1:*` 안에서 계정·탭별로 분리한다. 전체 clear 금지. 비밀번호·토큰·서버 서명 키는 증거/화면/로그에 기록하지 않는다.
- M5 실제 공개·탐색·커뮤니티, M6 실제 자료 가져오기·전체 백업/복원, M7 실제 기기·관찰 사용자·배포 gate는 남긴다. 이번 목표에서 commit/push/PR/merge/Preview/Production을 실행하지 않는다.

## 요구 대조와 구현 순서

| 단계 | 요구와 확인한 차이 | 구현·설계 | 완료 증거 |
| --- | --- | --- | --- |
| 1 요구·UX | A12/D2-049: 빈 단순 틀은 선택 자체가 1회 삽입. 현재 전체 교체 확인은 원 요구와 다름 | 단순 scaffold/완성 예시/사용자 StructureDraft를 구분. 비어 있지 않은 원문 전체 틀 교체 금지. 같은 편집기·6틀·16속성·4범주·미완성 입력·native Undo 유지 | 기존 결정·현 코드 매핑, 단위/화면 검사 |
| 2 저장 계약 | A13: working·nativePendingRawText·명시 library/context/history·source session/journal은 별개. M3는 creatorWorkspace 쓰기 금지 | 별도 versioned 제작 명령/서버 검증. 계정 CAS·같은 요청 재시도·원본 출처 불변·Undo 경계를 검토하고 확정 | 계약·부정 payload·서버/RLS/API 검사 |
| 3 제작 화면 | Alpha에서 creatorNavigation=false. 현재 편집기는 재사용 가능 | 제작 진입·제작 초안·결과·개인 인계 연결. 서버 확인 전 성공 표시/이동 금지. M5 action 숨김 유지 | 빈 원문→틀/속성→명시 저장→결과→개인 문서 |
| 4 입력·복구 | 자동 보관의 history:false가 M3 controller에서 무시됨. 제작 복구 JSON이 개인 문서로 처리될 위험 | 자동 보관/명시 저장/서버 Undo 분리. 계정·탭에 제작 문맥과 미반영 입력 보호. 비교/구조 JSON을 개인 문서 복구 성공으로 표시하지 않음 | 실패·응답 유실·reload·타기기 충돌·계정 전환 |
| 5 이력·인계 | A14/A19: 원문 순서≠개인 TimelineOrder. 복원≠개인 수용≠공개 | 이전 저장본 비교·복원과 개인 업데이트 수용을 별도 거래로 유지. 기존 문서/항목 identity·날짜·메모·진행·참조 보존 | 원래 D2 합성 fixture 왕복 + 실제 DEV 계정 시나리오 |
| 6 통합 검증 | 모델만 존재하는 것을 화면/서비스 완료로 세지 않음 | 표적 검사→회귀/npm/build→실제 API/브라우저→DB 사후 확인→원장 갱신 | 실제 실행 개수·소스 hash·실패/미실행·화면별 평가 |

상태별 원장: 작성 중=`creatorWorkspace.working`, 미반영 입력=`nativePendingRawText`, 명시 저장=`library.records`/`structureDrafts`/`savedHistory`, 원본 비교=`sourceUpdateSessions`, native 조작=`nativeDocument.actions`, 개인 인계=`handoffs`/`executionSources`/`nativeExecutionSources`. 옛 recovery provenance를 saved-version으로 바꾸지 않는다. 최근 이력 수 등의 제한은 교체 가능한 PoC 버전 계약이다.

## 검증 판정표

| ID | 시나리오 | 통과 기준 | 현재 |
| --- | --- | --- | --- |
| M4-01 | 빈 원문·6틀·예시·16속성 | 단순 틀 1회 삽입, 예시/구조는 명시 적용, non-empty/취소/IME guard 무적용, ghost 비저장 | 표적/통합 PASS, 실제 UI 빈 틀·속성·native Undo/Redo PASS. 실제 OS IME 미실행 |
| M4-02 | working→명시 저장→판본 비교/복원 | 자동 보관이 저장 판본을 만들지 않음. raw/ID/context/journal 보존, 복원은 새 명시 저장 | 실제 API/UI raw 경로 PASS. native context/journal은 합성 domain 검사 PASS |
| M4-03 | raw/native 인계·개인 변경·제작 업데이트 수용 | 문서/항목 참조·날짜·메모·진행 보존. 비교/취소 0쓰기, 명시 수용만 반영 | raw 실제 인계·업데이트 API/UI PASS. native 원래 fixture 전이 PASS, 실제 native import는 M6 |
| M4-04 | 동일 요청·동일 위치·손상/위조·권한 오류 | 중복 1거래, 무효 0거래, 타계정 읽기/쓰기 0, immutable source/public 불변 | 실제 API 75건 및 SQL-role rollback·부정 payload 검사 PASS |
| M4-05 | 느린 응답/유실·reload·두 독립 클라이언트 충돌 | 같은 요청 조회/재시도, 입력/구조/선택 보존, 최신 변경 덮어쓰기 0 | 실제 UI 응답 유실/오프라인/독립 A2 경합·reload PASS. 보조 선택은 JSON 보관 후 수동 재비교 |
| M4-06 | 계정 전환·로그인 만료·복구 | A 입력/응답이 B에 노출 0, 같은 계정만 복구, 원시 JSON을 개인 문서로 오인 복구하지 않음 | 실제 UI A→B→A PASS, 만료·지연 응답은 controller/인증 mock 회귀. 이번 M4 자연 만료 미재실행 |
| M4-07 | 390×844 / 375×812 / 844×390 / 1024×768 / 1440×900 | 가로 넘침·console/page error·가려진 핵심 행동 0, 키보드와 48px 행동 | 25화면 PASS, 예상 밖 console/page error0. 고의 네트워크 오류2건 별도. 실제 기기 미실행 |
| M4-08 | 기존 /my·flow 저장·DEV 사후 상태 | 운영 key/value byte 동일, prefix 밖 쓰기 0, 테스트 소유 자료 정리 및 원 상태 보존 | 격리 3프로필 운영 sentinel bytes 동일·prefix 밖 쓰기/clear0. DEV A/B 빈 공간·기존 원장 보존 사후 확인 |

실제 Android Chrome/iOS Safari, OS 한글 IME, 보조기술 및 관찰 사용자 검증은 직접 실행한 경우만 별도 기록한다. 합성 composition 이벤트·독립 browser context는 실제 기기/사람 검사가 아니다.

## 실행 기록

- 세션 시작 절차, 최신 main 및 소유권 점검 완료. M3 완료 증거는 [M3 기록](alpha-m3-sync.md)에 그대로 남긴다. M4 재실행 개수로 더하지 않는다.
- 요구 대조와 서버 경계 검토는 읽기 전용 병렬 검토로 시작했다. 자동 보관/Undo, 제작 복구 문맥, 단순 scaffold 교체 차이를 구현 전 결함으로 확인했다.
- 아래 실행 결과는 구현 중 확인한 근거이며 최종 버전 여부를 별도로 판정한다.
- 제작 전용 `flowme-alpha-creator-command/1`을 추가했다. M3 `change-private`의 허용 필드를 넓히지 않고, 서버가 기존 순수 제작 전이를 실행한다. HMAC은 원래 intent·생성 diff·resultId를 함께 묶으며 DB 중복 판단은 원래 intent를 기준으로 한다. Undo/Redo는 서버가 보관한 직전 거래 inverse만 사용한다.
- `creatorWorkspace`를 알고 있는 account/1 자료 계약은 유지한다. 구 M3 writer는 제작 필드와 새 명령을 거절한다. 전체 old-client/backup/migration 호환 판정은 M6에 남기며 이 목표에서 account schema 승격을 가장하지 않는다.
- 원래 native source·기존 이력·개인 실행 판본의 불변 경계를 유지했다. 새 계정에 임의 native import provenance를 넣는 쓰기는 거절한다. native 원래 자료는 합성 계정 fixture로 검증하고 실제 옛 자료 이관은 M6다.
- 제작 작업본은 full working으로, 비교/검토 중 보조 입력은 별도 JSON으로 계정·탭에 보관한다. 최신 native 구조와 충돌하는 복구는 거절하고 원문/JSON을 남긴다. 보조 비교 선택은 최신 자료를 다시 비교한 뒤 사용자가 적용하며 자동 재생하지 않는다. 이를 완전한 비교 UI 자동 복원으로 판정하지 않는다.
- 2026-09-21 11:10 UTC 실제 DEV API **75/75 PASS**: `output/alpha-m4/m4-1789989011595/api-report.json`. 원래 명령 replay/resultId, 경합, 명시 판본 복원, raw 인계/업데이트, Undo/Redo, B 읽기/쓰기 차단, 운영 source/binding 불변을 포함한다. 자체 Auth 세션 4개를 종료했고 원격 fixture 정리는 별도 exact-CAS 작업으로 남겼다.
- DEV migration `20260921105352_flowme_alpha_m4_creator_commands.sql` 적용 후 RPC 존재, anon 실행 거절, authenticated direct UPDATE/ledger SELECT 거절을 조회했다. 운영 프로젝트는 호출하지 않았다.
- SQL-role rollback 스크립트는 실제 API 세션 종료 뒤 실행되어 두 live session 사전조건에서 멈췄다. 이를 SQL 시나리오 PASS로 세지 않는다. 주입된 trigger 예외는 미실행이며 transaction exception 경계는 코드/정적 검사와 API 검증으로 구분한다.

### 추가 검증과 발견·수정 이력

- 실제 두 계정 브라우저 로그인 중 `m4-sql-transaction.sql`을 다시 실행해 전 시나리오를 통과했고 마지막 `ROLLBACK`을 실행했다. 이는 SQL role/HMAC 시뮬레이션이며 실제 JWT API 75건과 합산하지 않는다. 원격 trigger를 만들거나 예외를 주입한 검사는 아니다.
- API 시험 자료 정리: 원래 빈 공간과 현재 전체 JSON/CAS, 실행 요청과 연속 판본을 확인한 뒤 A124→125 보상 거래 1건만 기록했다. B0은 쓰기0. 기존 작업 원장·inverse·undone 플래그를 삭제하거나 되감지 않았다. 정리 도구의 SQL 괄호 오류 2개는 각각 parse/transaction 오류로 실패해 반영0이며 수정 후 성공했다. 이것은 관리자 QA 정리이고 M6 제품 복원 기능이 아니다.
- 독립 코드 검토에서 raw 업데이트 비교 선택과 미반영 속성 값의 복구 캡처 누락을 발견·수정했다. mutable ref를 즉시 갱신하며 적용 실패 시 보관, 명시 취소/성공 때만 정리한다. UI 관련76/76 및 독립10/10은 해당 중간 버전의 표적 검사다.
- 첫 실제 브라우저 실행 `m4-ui-1789990039868`: 속성 select의 검사 locator가 label 내부 option 텍스트와 맞지 않아 40개 확인 후 중단. accessible role 기반으로 수정했다. 제품 실패가 아니며 전체 시나리오 PASS로 세지 않는다. exact-CAS 정리 A130→131, B0 무쓰기.
- 두 번째 실행 `m4-ui-1789990126320`: 124개 확인 후 응답 유실→재시도 성공 다음 입력이 충돌로 막히는 실제 결함 1건을 발견했다. 서버 확인 후에도 편집기 baseline이 이전 상태여서 발생했다. 전체 working이 정확히 같은 경우만 baseline을 확인 처리하고 더 최신 입력/보조 입력/조합 입력은 보호하도록 수정했다. 최종 실제 UI에서 다음 입력 저장까지 통과했다. exact-CAS 정리 A145→146, B0 무쓰기.
- `npm-test-2026-09-21T11-28-55-167Z.json`: 2255/2255, 실패/skip0, 실행 중 source 변경0. 이후 위 baseline 수정에 따른 최종 판정은 아래 최종 기록을 따른다.
- `audit-2026-09-21T11-29-25-271Z.json`: npm 의존성 취약점0. DEV DB Advisor는 성능0, 보안 WARN1(기존 유출 비밀번호 보호 비활성), INFO2(private 원장/서명 키 테이블의 정책 없음: 직접 접근 금지 설계)이다. 권한을 열거나 유료 설정을 바꾸지 않았다. [비밀번호 보호 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [RLS 정책 검사 안내](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- 세 번째 실제 UI 실행 `m4-ui-1789990820068`: 응답 유실 재시도 후 다음 입력 저장, A2 충돌 보호 및 25개 화면 검사는 진행됐지만 최신 내용 열기에서 중단했다. 자동 조회 중 `discardConflict()`가 즉시 false를 반환하는 경합을 독립 held-read 테스트로 재현했다. `busy` 노출/버튼 잠금, 조회 실패 안내, 이중 refresh 제거로 보완했다. 키보드 검사 1FAIL은 마지막 조작 뒤 Tab이 브라우저 영역으로 나간 검사 시작점 문제였으며, 매 화면 FlowMe 링크부터 실제 Tab을 시작하도록 수정했다. 실패를 숨기거나 제품 요구를 낮추지 않았다. 이 실행은 전체 PASS가 아니며 정리 A161→162, B0 무쓰기다.
- 중간 전체 실행 `new-tests-2026-09-21T11-21-54-132Z`: 1935 실행/1930 PASS/5 FAIL. 기존 route 테스트의 AST harness가 새 함수 의존성 수정 전 실행된 ReferenceError였다. 후속 제작 UI81/81에 수정된 harness가 포함된다. 실행 중 소스가 바뀐 전체 결과와 build/npm의 verifier2 결과는 최종 동일 버전 근거로 채택하지 않는다.

## 최종 검증 결과

최종 production build는 `iAncxz0DaqOvr4LxSJjHL`이다. 아래 npm/통합/build는 모두 실행 중 검사 대상 소스 변경0·검증기 exit0이다. 문서 정리 뒤 세 기록 각각의 소스477개 hash를 현재 파일과 다시 비교해 불일치0도 확인했다. 표적 검사는 전체 통합 검사와 중복되므로 합산한 고유 테스트 수나 요구 충족률을 만들지 않는다. 원본 JSON·로그·화면은 `output/`의 로컬 전용 근거다.

| 검사 | 실제 최종 결과 | 로컬 전용 근거 |
| --- | --- | --- |
| `npm test` | 2255 실행 / 2255 PASS / 실패·skip0 | `output/integrated-product-poc/npm-test-2026-09-21T11-46-25-247Z.json` |
| 통합 모델·컴포넌트 회귀 | 201파일, 1945 실행 / 1945 PASS / 실패·skip·취소0 | `output/integrated-product-poc/new-tests-2026-09-21T11-48-11-178Z.json` |
| production build | exit0, 앱 타입 검사 포함 | `output/integrated-product-poc/build-2026-09-21T11-45-59-121Z.json` |
| 실제 DEV JWT/API | 75/75 PASS, 자체 세션4개 종료, 메일0 | `output/alpha-m4/m4-1789991735371/api-report.json` |
| 실제 DEV 계정 브라우저 | 169/169 PASS, 2계정·3독립 context·자체 세션5개 종료 | `output/playwright/alpha-m4-live/m4-ui-1789991591256/results.json` |
| 인증 브라우저 회귀 | 30/30 PASS, 실제 SDK·mock API. 메일/원격 Auth 변경 없음 | `output/playwright/alpha-m4-auth/results.json`, `.tmp/alpha-m4-auth.config.ts` 실행 |
| 제작 UI 표적 | 81/81 PASS | `ProgramCreatorWorkspace*.test.tsx` 실행. 전체 통합 검사에 포함 |
| 계정 UI/creator controller 표적 | 25/25 PASS | `AlphaWorkspace.test.tsx`, `alpha-sync/creator-controller.test.ts` 실행. 전체 통합에 포함 |
| migration/QA 정리 도구 | 13/13 PASS | `node --import tsx --test scripts/alpha/m4-schema.test.ts scripts/alpha/m4-cleanup-sql.test.ts` |
| 배포 번들 비밀 경계 | static70개, key 일치0·서버 서명 env 언급0, Node 계정/제작 route hash 확인 | `output/alpha-m4/build-boundary-1789991426141.json` |
| 의존성 audit | 취약점0 | `output/integrated-product-poc/audit-2026-09-21T11-29-25-271Z.json`; 이후 package 변경 없음 |
| SQL-role 검사 | 전체 assertion 통과 후 ROLLBACK. JWT 실제 API와 별도 | `scripts/alpha/m4-sql-transaction.sql`, DEV 실행 응답 |
| 문서·diff | docs 검사4/4·필수16파일/로컬 링크6395 PASS, `git diff --check` exit0 | 최종 문서 반영 후 재실행. CRLF 안내는 오류와 구분 |

네 번째 UI 실행 `m4-ui-1789991417119`의 147PASS/1FAIL은 최신 내용 조회 완료 전에 값을 검사한 runner의 조기 assertion이었다. 버튼 재활성화와 기대 source가 확인될 때까지 관찰하도록 수정했다. DB에는 A의 최신 변경이 그대로 있었으며 A2가 덮어쓰지 않았다. 이 실패 결과는 보존했고 exact-CAS 정리 A177→178을 마쳤다. 다섯 번째 최종 실행에서 전체169건을 통과했다.

### 화면별 평가

각 해상도에서 빈 제작·명시 저장 후·판본 비교·결과·충돌의 5상태를 검사했다. 모든 25화면에서 가로 넘침0, 가려진 검사 대상 행동0, 활성 행동 48px 미달0, 실제 Tab 경로 검사 실패0이다. 페이지 오류0·예상 밖 console 오류0이며 고의로 만든 네트워크 장애2건은 오류 집계와 분리했다.

| 화면 크기 | 5상태 자동 검사 | 직접 캡처 판독 | 남은 평가 |
| --- | --- | --- | --- |
| 390×844 | PASS | 빈 제작의 원문·틀 선택·계정 탐색 읽힘 | 틀/이력 전부 확장 시 긴 세로 페이지 |
| 375×812 | PASS | 충돌 상태의 비교·보관·최신 내용 조작 읽힘 | 긴 안내의 인지 부담은 관찰 미검증 |
| 844×390 | PASS | 결과와 개인공간 인계 조작 확인 | 낮은 높이에서 세로 스크롤 필요 |
| 1024×768 | PASS | 저장 이력 비교와 복원·취소 확인 | 실제 태블릿 입력/키보드 미실행 |
| 1440×900 | PASS | 명시 저장 상태와 제작 편집 영역 확인 | 긴 누적 실자료 성능은 별도 |

### 운영 경계와 테스트 자료 사후 확인

- 최종 실제 브라우저 3프로필에서 PoC 허용 prefix 밖 앱 쓰기0, `clear`0, 사전 주입한 운영 sentinel key/value의 byte 동일을 확인했다. 사용자의 기존 Chrome 전체 프로필이나 운영 DB를 읽어 전후 비교한 검사가 아니다.
- `git diff`에서 기본 `app/my`와 기존 개인공간 operating writer 경로의 변경0을 재확인했다. 서버 제작 명령은 allowlist4필드 외 변경을 거절하며 원래 source·binding·public은 통합/API 검사로 보호한다.
- 최종 브라우저 QA는 A196→197, 최종 API QA는 A209→210의 정확한 보상 거래로 합성 제작 공간을 원래 빈 공간으로 돌렸다. B0은 처음부터 끝까지 쓰기0이다. 각각 `output/alpha-m4-browser/m4-ui-1789991591256/teardown.sql`, `output/alpha-m4/m4-1789991735371/teardown.sql`에 manifest·CAS·원장 확인을 보존했다.
- 개발 DB 사후 조회: A revision210/원장210, B revision0/원장0. 둘 다 canonical empty space·shape 정상이며 제품 Undo로 되살릴 수 있는 QA 정리 거래0. 모든 기존 원장/inverse/undone 값을 보존하고 정리 거래만 추가했다. 기존 비-QA Auth 세션1개도 보존했다.
- 제작 RPC 존재, authenticated 실행 허용·anon 실행 금지, authenticated 직접 account UPDATE와 ledger SELECT 금지를 재확인했다. 운영 프로젝트 호출/쓰기0, 가입·메일·비밀번호 변경0이다. QA 정리는 M6 전체 자료 복원 기능의 증거가 아니다.
- 인증 mock 검사가 끝난 뒤 최종 build의 개발계 서버를 `http://localhost:3104/alpha`로 다시 열었다. 화면에서 로그인 후 `Flow 만들기`로 진입할 수 있다. 서버는 이 로컬 PC에서 실행 중인 검증판이며 고정 배포 주소나 실제 기기 연결 준비 완료를 뜻하지 않는다.

## 보존·복구 범위와 남은 일

- 제작 초안·작업 중 원문·명시 저장 판본·개인 인계는 계정의 개발 DB 자료다. 비교 선택/미반영 속성의 로컬 보관은 같은 계정·같은 탭의 sessionStorage이며, 탭을 완전히 닫아도 남는 영구 백업으로 표현하지 않는다.
- 저장 판본 복구와 개인 실행 업데이트 수용은 별개다. 제작 판본을 복구해도 개인 실행·메모·완료를 자동 되돌리거나 공개판을 만들지 않는다.
- native source/context/journal/이력 전이는 합성 domain fixture로 검증했다. 실제 옛 브라우저 자료를 서비스 계정으로 가져오는 M6가 없으므로 native 원본의 실제 이관/브라우저 왕복을 완료했다고 세지 않는다.
- 비교 JSON은 읽기 보관/수동 재비교용이다. 최신 원본에 자동으로 선택을 다시 적용하는 기능은 이번 범위가 아니다.
- M5 공개 탐색·선택 공개·개인 사본·제안/커뮤니티의 서비스 연결, M6 실자료 이관·전체 백업/복원·구버전 호환, M7 제한 공유/실기기/관찰 검증/배포가 남는다. 중요한 실제 자료의 유일본을 아직 넣지 않는다.
- 모바일에서 작성 틀·이력을 모두 열면 문서가 길어진다. 가로 넘침/조작 가림 검사는 통과해도 집중 편집의 인지 부담이나 사용성 검증 완료로 세지 않는다. 실제 Android Chrome/iOS Safari·OS 한글 IME·보조기술·관찰 사용자 검증은 미실행이다.

## 이번 변경 파일

이 worktree에는 같은 세션의 M1–M3 변경도 미커밋으로 남아 있다. 전체 `git status`를 M4 변경 수로 세지 않는다.

| 구분 | M4에서 새로 만들거나 수정한 파일 |
| --- | --- |
| 제작 저장 계약·순수 전이 | `lib/flow/integrated-poc/alpha-creator/{contract,boundary,dispatch,dispatch.test}.ts` |
| 서버·개발 DB | `app/api/alpha/creator/route.ts`, `alpha-server/creator-command-handler.ts`와 `.test.ts`, 기존 `alpha-server/command-handler.ts`, `supabase/migrations/20260921105352_flowme_alpha_m4_creator_commands.sql` |
| 요청·영수증·Undo | `alpha-sync/{wire,controller,http-repository,contract}.ts`, `alpha-sync/creator-controller.test.ts`, `alpha-persistence/{contract,client,local-recovery,program-adapter,fake-server}.ts` |
| 복구 계약 | `lib/flow/integrated-poc/alpha-creator-recovery.ts`와 `.test.ts`, `document-action.ts`, `ui-contract.ts` |
| 계정 화면 | `components/flow/integrated-poc/AlphaWorkspace.tsx`, `.module.css`, `.test.tsx`, `AlphaConflictReview.tsx` |
| 제작 화면·회귀 | `ProgramCreatorWorkspace.tsx`, `.alpha.test.tsx`, `.test.tsx`, `.route.test.tsx`, `.snapshot.test.tsx` |
| 실제 QA·정리 | `scripts/alpha/m4-live.ts`, `m4-browser-live.ts`, `m4-sql-transaction.sql`, `m4-schema.test.ts`, `m4-cleanup-sql.ts`, `m4-cleanup-sql.test.ts`, `m3-build-boundary.ts`의 `--m4` 출력 분리 |
| 현재 상태 문서 | 이 문서, `alpha-transition.md`, `current-checkpoint.md`, `docs/STATUS.md`, `PROJECT_CONTROL.md`, `ROADMAP.md`, `SERVICE_STRUCTURE.md` |

표에서 폴더가 생략된 `alpha-*` 경로는 `lib/flow/integrated-poc/` 아래다. `.tmp/alpha-m4-auth.config.ts`는 기존 인증 QA를 재사용하면서 과거 M2/M3 증거를 덮어쓰지 않기 위한 로컬 전용 실행 설정이다. 비밀 설정은 변경하지 않았다. `output/`의 원본 JSON·화면·정리 SQL은 로컬 전용이며 공개 Git에 포함하지 않는다.

## 발행·실제 관찰

| 항목 | 이번 M4 실행 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR | 미실행 |
| merge | 미실행 |
| Preview 배포 | 미실행 |
| Production 배포 | 미실행 |
| 개발 DB migration | 제작 명령용 additive migration 1개 적용 |
| 운영 DB 변경 | 호출·쓰기0 |
| 실제 Android Chrome | 미실행 |
| 실제 iOS Safari | 미실행 |
| 실제 OS 한글 IME·보조기술 | 미실행 |
| 관찰 사용자 수 | 0명 |
