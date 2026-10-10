# M1 계정별 저장·명령·복구 계약

2026-09-21 · M1 로컬 구현·계약 검증 완료. [실사용 전환 원장](alpha-transition.md)의 M1 실행 명세이며 별도 제품 로드맵이 아니다. 사용자가 M1 목표 설정과 실행을 승인했다. 기준은 최신 `origin/main` `efd8b642`, 깨끗한 격리 worktree의 `agent/alpha-m1-persistence-20260921`이다. 병합 후 [CI](https://github.com/knhbae/flowme2605/actions/runs/35539633782)는 성공했다. M1은 로컬 변경이며 실제 Auth·서버 동기화·실사용 검증 완료를 뜻하지 않는다.

## 범위와 실행 순서

1. 현재 Program 계약을 보존하는 계정 저장·identity·revision·명령 영수증·복구 계약을 정의한다.
2. 기존 순수 모델에서 개인 변경만 추출하는 bridge, 계정별 로컬 보관 adapter, 인증을 흉내 내는 fake-server와 session-bound client를 구현한다.
3. v4.1·개발1·개발2의 합성 fixture로 무손실 왕복, 계정 격리, 경합, 중복, 응답 유실, 취소, 손상·미지원 payload를 검증한다.
4. 표적 검사, 통합 모델 strict 검사, npm test, build, 문서 검사 후 아래 결과와 A 원장을 갱신한다.

현재 ProgramApp의 writer/UI, 운영 key/schema, 외부 DB/Auth/Storage 설정을 바꾸지 않는다. 실제 계정 인증·SQL/RLS·다기기 동기화는 M2 이후다. 초기 자료는 합성 자료만 사용하며 실제 계정으로 귀속하거나 공개하지 않는다. D04의 실제 이관 대상/소유자와 D07의 최종 Undo·오프라인 정책은 여전히 후속 결정이다.

## 저장 단위와 권한

| 데이터 | M1 단위 / 권한 | 보존·후속 경계 |
| --- | --- | --- |
| 원문·폴더·행·참조·보관/휴지통 | 계정 private aggregate의 `space.text`와 관련 필드 | Flow 없는 문서 허용; ID·원문·숫자 토큰·참조 보존 |
| QuickItem·네 origin·Map·기간/순서·반복/누적 실행 | 같은 aggregate의 saved binding·legacy snapshot·execution | savedCopyId/flowId/itemId 및 native/series/occurrence identity 유지. 일정과 실행 위치를 합치지 않음 |
| 제작 working/saved/pending/recovery/source session·이력 | 같은 aggregate의 creator workspace·revision/import | 기존 타입/validator로 보존; 저장이나 공개를 암묵적으로 수행하지 않음 |
| 공개 Flow·불변 version·커뮤니티·사진 | fake-server 초기화/오프라인 보존용 reference context | 개인 read/command 응답에 전체 공개 repository·actor/space envelope를 넣지 않음. 실서비스 공개 DTO/권한은 M5 |
| owner+origin 대응 | 서버 계정 ID와 과거 actor ID를 별도 필드로 유지 | 클라이언트 actor 선택은 권한 근거가 아님. ID를 제목/hash/순서로 재생성하지 않음 |
| revision·operation receipt | 계정 aggregate revision, owner+requestId별 영수증 | 서버가 원자적으로 검증/적용. 동일 ID+다른 요청은 거절. success 확인 전 저장됨 표시 금지 |
| 기존 snapshot Undo | 보존 자료 | 서버 Undo로 실행하지 않음. 새 명령의 개인 변경 필드만 보상하며 후속 revision이 있으면 충돌 |

M1은 교차 참조의 원자성을 위해 계정당 하나의 private transaction revision을 사용한다. 다른 문서도 동시 변경하면 보수적으로 충돌한다. 이는 운영 DB 테이블 단위나 최종 제품 정책을 확정한 것이 아니며 M3에서 변경 단위 세분화를 검토한다. 클라이언트는 private 필드 변경 명령만 보낸다. `actors/spaces/public/receipts` 전체 envelope endpoint는 만들지 않는다. source mapping/과거 이관 이력은 일반 변경 명령으로 덮어쓸 수 없다.

## 상태 안내와 복구 행동

| 상태 | 표시와 가능한 행동 | 금지 |
| --- | --- | --- |
| 대기/전송 | 서버 저장 대기 · 입력 보관 | 성공 toast/완료 화면 전환 |
| 확인 | 저장 확인 · 서버 revision 재조회 가능 | 오래된 응답으로 최신 snapshot 교체 |
| 충돌 | 다른 기기 변경 · 최신 자료와 보관 입력 비교 | 자동 재적용/last-write-wins |
| 만료 | 로그인 만료 · 같은 계정 재인증 후 입력 복구 | 다른 계정에 입력/응답 노출 |
| 결과 불명 | 결과 확인 중 · 동일 request ID 영수증 조회 | 실패·취소로 단정하거나 새 ID로 재전송 |
| 손상/호환 불명 | 복구 필요 · 원본 보관과 호환 버전 확인 | 자동 초기화/누락 필드 삭제 |

명령 전 취소/no-op는 쓰기0. 전송 후 취소는 서버 rollback으로 해석하지 않는다. 성공 응답 유실은 영수증을 조회하고 최신 snapshot을 다시 읽는다. 계정/세션 변경 시 진행 중 응답은 무시하며 보관 입력은 원 계정에서만 접근한다. 구독 이벤트는 정본으로 사용하지 않고 refresh로 서버 상태를 확인한다. M1은 이 상태를 headless client로 검증하며 화면에 새 로그인/저장 UI를 노출하지 않는다.

## 백업·환경 계약

오프라인 백업은 개인 자료와 별도 reference context, 성공한 operation journal을 함께 담은 버전 계약이다. owner, source mapping, schema, SHA-256 checksum, 정확한 identity/관계, 미디어 bytes manifest를 검증한 뒤 복원 preview를 만든다. operation은 revision 연속성과 Undo 관계·역재생·정방향 결과를 검사한다. 영수증 없는 최신 snapshot을 완전한 서버 백업으로 받아들이지 않는다. 복원된 fake server에서 응답을 잃었던 요청을 다시 보내도 같은 영수증이 돌아오고 중복 변경은 없다. context는 로컬 PoC 재현 자료이며 서비스의 공개 API로 배포하는 payload가 아니다. 알 수 없는 schema/누락 파일/손상/다른 owner는 fail-closed한다. 실제 계정 이관·Storage 파일 업로드·전체 DB 복원은 M6이며 M1에서 완료 처리하지 않는다.

로컬 adapter는 `flow:poc:personal-workspace:v1:alpha-m1:*`에만 쓴다. 초기화는 해당 계정의 정확한 key만 제거하며 clear를 제공하지 않는다. 환경 검사는 dev/test/preview의 DB/Auth/Storage origin과 redirect를 신뢰된 allowlist에 대조하고 운영 project ref를 거절한다. M1 fake adapter는 네트워크를 사용하지 않는다. build/테스트에서 자동 migration은 없다.

## 검증 결과

### 시나리오별 판정

아래 PASS는 합성 데이터·headless client·가짜 서버에서 실행한 결과다. 실제 로그인/RLS/네트워크 서버나 사용자 관찰 결과가 아니다.

| 시나리오 | 결과와 실제 대조 |
| --- | --- |
| M1-S01 문서·참조·진행률 | PASS. Flow 없는 원문/한글/행 ID, 하나의 원본을 가리키는 참조, 날짜별 15→45→100 기록, `[1]`/`[1.0]` 철자와 1%/100% 차이 보존 |
| M1-S02 네 origin·QuickItem·Map | PASS. 같은 flowId/itemId인 네 savedCopy를 구분하고 QuickItem 완료/날짜/메모 보존. 실제 카탈로그 Map factory와 저장 reader로 만든 별도 구조 Map 왕복. 네 origin 전부의 운영 reader 이관을 검사한 것은 아님 |
| M1-S03 반복 실행 | PASS. 원래 회차 날짜/identity와 이동 날짜 분리, 완료/보류/미정 상태 보존 |
| M1-S04 제작 원문/복구 | PASS. native saved history·실행 인계, 정확한 CRLF 미반영 입력, coherent recovery, source update session을 별도 fixture로 보존 |
| M1-S05 공개/커뮤니티 자료 보존 | PASS. 공개 v1/v2·v1 개인 사본·글/답글/반응·합성 PNG bytes 보존. reference는 계정 read 응답에 없음. 실제 공개/업로드 아님 |
| M1-S06 계정·권한 | PASS. A/B 같은 legacy ID와 request ID를 owner로 분리. anonymous/위조 owner/actor/public envelope 거절, 타인 비공개 자료·영수증 노출0 |
| M1-S07 동시 수정·중복 | PASS. 같은 revision의 두 명령은 1성공/1충돌, 동일 ID/본문 재전송은 1변경, ID 같고 본문 다르면 충돌 |
| M1-S08 응답 유실·reload | PASS. 서버 적용 뒤 응답 유실→로컬 복구 상태에서 같은 request ID 복원→영수증 조회→저장 확인. 네트워크 전 실패도 같은 ID로 재시도 |
| M1-S09 계정 전환·만료 | PASS. 느린 읽기/저장/후속 조회 중 A→B/logout, 완료 직전 microtask 전환, 인증 만료·재인증에서 A 입력/응답이 B 상태를 바꾸지 않음 |
| M1-S10 no-op·취소·실패·Undo | PASS. 명령 전 취소/같은 값/invalid는 dispatch·복구 쓰기0. 실패 주입은 서버 변경0. 성공 뒤 개인 Undo와 후속 기기 변경 충돌 검사. 전송 후 결과 불명은 실패0건으로 단정하지 않음 |
| M1-S11 백업·환경 fail-closed | PASS. owner/schema/body/reference/file/journal 변조 거절, strict JSON이 누락·getter·sparse/NaN coercion 차단. dev/test/preview에서 운영 project/API/Auth/Storage/redirect 주입 거절 |
| M1-S12 운영 key 불변 | PASS. 저장→reload→복원→정확 key reset에서 표본 운영 `flow:*` 전체 Map bytes 같음. 허용 밖 set/remove0, clear0. 브라우저에 있는 실제 개인 자료를 읽거나 백업했다는 뜻은 아님 |

9개 fixture 각각에서 `capture → serialize → validate → restore → fake read → 기존 개인 문서 생성 → Undo → journal 포함 backup/restore → local cache reload`를 수행하고 원래 space/원문/이력/관계와 대조한다. 원본 fixture의 canonical bytes도 전후 같다. 실제 UI의 drag/long-press/Escape/pointer 이벤트는 이번에 새로 실행하지 않았다.

### 실행 기록

| 검사 | 실제 결과 |
| --- | --- |
| M1 표적 `node --import tsx --test …/persistence.test.ts …/client.test.ts …/synthetic-fixtures.test.ts` | 최종40/40 PASS, 실패/skip/cancel0. 아래 전체 회귀 후 no-op을 성공으로 위조한 backup journal 거절 조건과 회귀 assert를 보완하고 3개 파일 전체를 재실행 |
| 통합 strict TypeScript | 404 진입점 / 436 source, diagnostics0, 실행 중 소스 변경0 |
| `npm test` (기존 recorder 사용) | 2255/2255 PASS, 실패/skip/cancel0, 종료0. 9/21 KST 08:11:48–08:13:30 |
| production `npm run build` (기존 recorder 사용) | 최종 PASS, Next 15.5.25, static18개. 마지막 코드 보완 후 9/21 KST 08:20:37–08:21:50 재실행, sourceChanged0·verifiedExitCode0 |
| `npm run docs:check` | PASS, 문서 검사4/4, 필수16·전체 로컬 링크 검사 통과 |
| 전체 통합 모델 `npm run test:integrated-product-poc` | 184파일·1789/1789 PASS, 실패/skip/cancel0, sourceChanged0·verifiedExitCode0. 9/21 KST 08:11:49–08:19:59. 마지막 위조 no-op journal 거절 1조건 보완 전 전체 결과이며, 그 뒤 바뀐 M1 영향 범위는 위 표적40개와 strict/build로 재검증 |
| 브라우저/다섯 해상도 | 추가 실행 없음. app/components/기존 writer를 변경하지 않는 headless M1이며 기존 브라우저 PASS를 새로 실행한 것으로 세지 않음 |
| 실제 Android Chrome / iOS Safari / IME / AT | 미실행 |
| 관찰 사용자 | 0명 |

원본 로그·실행별 소스 hash는 로컬 전용 `output/integrated-product-poc/`에 있다. 기존 recorder의 실제 testExecutions/failed/skipped/cancelled/sourceChangedDuringRun/verifiedExitCode를 확인한다. 반복 검사 수를 더해 고유 테스트 수로 표현하지 않는다.

개발 중 strict 검사에서 신규 모듈의 unknown narrowing 1건과 음성 검사 cast 1건을 발견해 수정했다. 코드 검토로 실제 private transition의 own receipt 처리, receipt 재조회 직후 계정 전환, 결과 불명 요청의 인증 실패 재시도 처리, 위조 no-op journal 거절을 보완했고 각 조건의 회귀 assert를 추가했다. 검사 기준이나 기존 제품 assertion을 완화하지 않았다.

### 파일과 경계

신규 코드/테스트12개는 `lib/flow/integrated-poc/alpha-persistence/`에만 추가한다.

- [contract](../../../lib/flow/integrated-poc/alpha-persistence/contract.ts), [strict JSON](../../../lib/flow/integrated-poc/alpha-persistence/json.ts), [Program bridge](../../../lib/flow/integrated-poc/alpha-persistence/program-adapter.ts)
- [fake server](../../../lib/flow/integrated-poc/alpha-persistence/fake-server.ts), [client 상태](../../../lib/flow/integrated-poc/alpha-persistence/client.ts), [local recovery](../../../lib/flow/integrated-poc/alpha-persistence/local-recovery.ts)
- [backup](../../../lib/flow/integrated-poc/alpha-persistence/backup.ts), [환경 검사](../../../lib/flow/integrated-poc/alpha-persistence/environment.ts)
- [합성 fixture](../../../lib/flow/integrated-poc/alpha-persistence/synthetic-fixtures.ts), [fixture 검사](../../../lib/flow/integrated-poc/alpha-persistence/synthetic-fixtures.test.ts), [저장/백업 검사](../../../lib/flow/integrated-poc/alpha-persistence/persistence.test.ts), [client/복구 검사](../../../lib/flow/integrated-poc/alpha-persistence/client.test.ts)

문서는 이 파일과 정본 alpha-transition, STATUS/PROJECT_CONTROL/ROADMAP, SERVICE_STRUCTURE, current-checkpoint를 갱신한다. 이전 평가 본문과 요구 inventory는 수정하지 않는다. `git diff`에서 기존 app/components·Program contract/store·package/lock·vercel 설정 변경은0이며 app/components의 새 모듈 import도0이다. 원래 dirty worktree에는 쓰기/정리/stage를 수행하지 않았다.

### 한계와 다음 단계

- M1 fake session/token/원자 queue는 실제 Auth/RLS나 서버 내구성 증거가 아니다. 다음 M2는 개발계 SQL/migrations·RLS/grants, Google 우선/이메일 대안 로그인, 두 실제 테스트 계정과 anonymous의 직접 API/SQL 음성 검증이다.
- 로컬 adapter는 마지막 성공 자료/입력의 복구 캐시다. 서버 정본을 대체하지 않고, localStorage의 compare/readback 자체는 cross-tab 원자 lock이 아니다. 실제 UI에 연결할 때 기존 Web Locks 또는 동등한 직렬화가 필요하다. 실패 readback은 원본을 삭제하지 않고 해당 port의 쓰기를 차단한다.
- 계정 단일 revision·필드 단위 보상은 보수적인 M1 계약이다. 다른 문서 동시 작업의 세분화, 충돌 비교/재적용 UX, offline 허용 범위는 M3에서 검증한다.
- 현재 manifest는 검증된 inline 이미지 본체를 담는다. 실제 object storage 파일·권한·보존·삭제, 운영 backup 주기/RPO/RTO, 이전 앱/DB migration/rollback은 M5/M6의 후속 항목이다. checksum은 무결성 검사이며 발신자 인증이나 암호화가 아니다.
- 네 saved origin은 충돌하는 ID를 가진 synthetic read model을 투영했고 실제 Map은 별도 reader로 검사했다. 전체 실제 localStorage import/owner mapping은 M6다. 기존 기한 오류/취약점은 이전 Git 보존에서 처리된 이력이며 이번에 보안 audit을 다시 실행하지 않았다.
- 단순 작성 틀의 선택=삽입 결정과 현재 확인 UX의 대조, 긴 자료 성능·실기기·관찰 검증은 M1에서 완료로 올리지 않는다.

이번 commit 없음 / push 없음 / 새 PR 없음 / merge 없음 / Preview 없음 / Production 없음. 외부 DB/Auth/Storage·환경변수 변경0. 이전 PR #203 main 병합과 이번 로컬 M1 구현을 구분한다.
