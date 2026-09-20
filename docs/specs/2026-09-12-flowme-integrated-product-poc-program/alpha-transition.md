# FlowMe 실사용 알파 전환 — 현재 실행 원장

2026-09-20 · M0 문서·설계 정합화 완료. M1 구현은 예정이며 기능형 PoC 완료와 서버 실사용 완료를 구분한다.

M1 전 Git 보존 기준점은 코드 commit `181302ed`·작업 branch push·[Draft PR #203](https://github.com/knhbae/flowme2605/pull/203)으로 만들었다. [사용자 결정](../../DECISIONS.md#2026-09-20---실사용-알파-인증가입무료-검증과-발행-권한)을 반영하고 승인된 출처 기한·취약점·공개본 재현 의존성을 수정했다. [보존 검사와 발행 결과](git-preservation-2026-09-20.md)에 실패·재검증·공개/로컬 증거를 구분해 남겼다. hook 우회·main merge·배포는 하지 않았다. 아래 M0 완료 기록은 과거 문서 목표 범위다.

보존 재검사에서 출처·취약점을 처리하고 현행 통합 브라우저3경로를 추가했다. 다만 기존 v4.1 브라우저 검사 대표1개는 옛 Surface/저장 owner를 전제해 현행 Program에서 실패했다. PR도 main 충돌 상태이고 CI 실행 결과가 없다. 전체 E2E/merge-ready가 아니며, M1 착수 전 현행 요구와 회귀 검사의 대응·역사 재현 경계 및 충돌 통합 계획을 정리해야 한다. 상세 실행과 공개·로컬 증거 분리는 위 Git 보존 원장을 따른다.

## 현재 목표 — PR #203 머지 준비

2026-09-20 사용자가 다음 목표 등록을 요청했다. v4.1·개발1·개발2의 요구를 보존하면서 충돌·회귀 문제를 해결하고, 충돌 없는 PR과 필요한 CI 통과를 확인한 뒤 실제 main 머지 승인을 요청한다. [단계·충돌·검증 실행 원장](merge-readiness-2026-09-20.md)에서 진행을 관리한다. 실제 main 머지·배포·외부 설정·M1 기능 구현은 포함하지 않는다.

권장 추론은 GPT-6 Astra / Extra High(xhigh)다. 전체 요구·양쪽 코드 의미·데이터 경계·회귀를 함께 다루는 이번 목표의 권고이며 실제 세션 설정 변경을 주장하지 않는다. 단일 난제에 Max가 필요하면 이유를 먼저 알린다.

## 지금 어디까지 왔나

기능형 통합 PoC는 끝났고, 개발용 Supabase 프로젝트까지 준비했다. **실제 로그인·서버 저장·기기 동기화·서비스 배포는 아직 연결되지 않았다.** 다음 일은 기존 모델을 보존하는 저장 경계와 복구 계약을 만들고 개발계에서 검증하는 것이다.

이 문서는 기존 프로그램의 **실사용 전환 작업 상태를 관리하는 유일한 원장**이다. 별도 사업 계획이나 새 제품 요구사항 목록을 만들지 않는다. 기존 spec/원자 요구는 원래 문서에, 과거 실행 증거는 원래 보고서에 그대로 둔다. 상위 계획·상태 문서는 이 파일을 가리킨다. 이번 문서 작업의 실제 검사 결과는 [정합화 QA](alpha-transition-qa.md)에 둔다.

| 읽고 싶은 내용 | 위치 |
| --- | --- |
| 무엇을 이어받고 무엇이 달라지는가 | 아래 정본과 충돌 조정 |
| 기능별 현재 상태·다음 단계 | A01–A24 요구 대조표 |
| 전체 순서·단계별 완료 조건 | M0–M7 실행 계획 |
| 바로 다음 개발 묶음 | M1 인계 |
| 확정 답변과 아직 정해야 할 것 | D01–D07 결정 상태 |

M0 당시 승인 범위는 조사·설계·문서 갱신·문서 검사였으며 해당 단계에서 외부 변경·commit/push/PR/배포를 하지 않았다. 후속 Git 보존 목표에는 필요한 commit/push·Draft PR 준비와 기존 검증 실패·취약점 수정이 승인됐다. DB 테이블/Auth/Storage, 환경변수, 기존 사용자 데이터, 유료 설정, 추가 프로젝트 생성, merge·배포는 여전히 범위 밖이다. 이후 M1–M7 단계가 이 문서에 적혀 있다는 사실만으로 해당 구현·외부 작업을 승인한 것은 아니다.

## 정본과 판정 기준

| 근거 | 현재 역할과 한계 |
| --- | --- |
| [7월 데이터 spec](../2026-07-11-canonical-flow-data-model/spec.md), [저장/API 계약](../2026-07-11-canonical-flow-data-model/storage-api-contract.md), [tasks](../2026-07-11-canonical-flow-data-model/tasks.md) | SourceRow→Item→Step→Flow→Bundle, private/public/version 분리·RLS·CAS·이관의 출발점. 설계 승인이지 서버 구현 증거가 아님. 당시 URL/AI 선행 순서를 이번 수동 작성·다기기 알파의 필수 조건으로 복사하지 않음 |
| v4.1 원본 spec (로컬 전용 근거: `../../../../flow-mvp/docs/specs/2026-09-01-personal-workspace-v4-1-prototype/spec.md`), [v4.1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md) | 원본 spec은 이 격리 checkout에 없고 인접 원본 저장소에 있음. 읽기 참조만 사용, 복사·수정하지 않음. 폴더/날짜/순서의 의미와 48px 터치 동작 보존 |
| [개발1 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d1-audit.md), [개발2 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/d2-audit.md), [요구 목록](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.md) | 세 결과물 및 BP의 원자 요구·의사결정 대체 관계. 이번에는 정본화된 감사 기록을 읽었으며 원대화 전체를 다시 읽었다고 주장하지 않음 |
| [통합 실행 spec](spec.md), [과거 계획](plan.md), [진행 기록](progress.md), [요구 원장](coverage-ledger.md) | P01–P08의 승인된 통합 의미. 과거 제목에 남은 ‘진행 중/K4 미구현’은 날짜별 이력이며 최신 상태가 아님 |
| [최종 평가](final-evaluation-2026-09-20.md), [S01–S10 시나리오](final-scenario-ledger-2026-09-20.md) | 9/20 기능형 PoC 대표 경로 완료의 증거. 모든 원자 UX 동등성, 서버 보안, 실제 기기·관찰 사용자 검증의 증거가 아님 |
| [원 요구 참조 매핑](alpha-requirement-routing.json) | 기존 부모254/하위424를 잃지 않기 위한 ID→A 요구 연결. 원래 본문/판정/체크 상태는 복제하지 않음. 하위 조건은 원본 parentId의 A 경로를 상속하며 같은 단계에서 개별 증거를 확인 |

대조표의 `재사용`은 모델·컴포넌트·검사를 이어받는다는 뜻이다. `수정 필요`는 알파 조건에 맞게 저장/연결을 바꾸는 일, `미구현`은 실제 서버 실행 경로가 없는 일, `미검증`은 해당 범위의 실행 증거가 없는 일이다. `보류`는 사라진 요구가 아니라 결정 또는 별도 승인 대상이다. **아래 모든 알파 검증은 미실행**이며 과거 PoC PASS를 서버 PASS로 올리지 않는다. 부모와 하위 조건을 더하거나 테스트 개수로 완료율을 만들지 않는다.

## 환경과 이번까지 확인한 사실

2026-09-20 읽기 조회로 두 프로젝트 모두 `ACTIVE_HEALTHY`, `public` 테이블 목록 `[]`를 확인했다. 이것은 모든 schema/Auth 사용자/Storage 객체가 비어 있다는 증거가 아니다. 새 알파 테이블이 연결된 것도 아니다.

| 역할 | 실제 식별자 | 확인된 사실 / 미완료 |
| --- | --- | --- |
| Supabase 조직 | `Flowme` / `ottkvrramtqszwoncwvo` | 앞선 계정 조회에서 Free 확인. 플랜 변경·결제 없음 |
| 개발계 | [flowme-dev](https://supabase.com/dashboard/project/wkmzcxpnojobxrgebapw) / `wkmzcxpnojobxrgebapw` | 사용자 승인 후 9/20 10:03:29 UTC 생성. 생성 비용 조회 월 $0·전용 확인 절차 후 실행. `ap-northeast-1`. 이번 목표에서는 조회만 함 |
| 운영용으로 확보 | [knhbae's Project](https://supabase.com/dashboard/project/ldellkztijrijbpwthjl) / `ldellkztijrijbpwthjl` | 사용자가 FlowMe용이라고 확인. `ap-northeast-1`. 이름 변경·테이블 생성·설정 변경 없음. 아직 실사용 DB로 연결하지 않음 |
| Vercel | 기존 `flowme2605` | 후속 Git 보존 때 읽기 UI로 연결 프로젝트1개·저장소 루트·Deploy Hook 없음을 확인. branch 자동배포 차단을 저장소에 추가. 9/20 13:02 UTC 목표 시작 이후 새 배포0. 알파 프로젝트·URL·개발/운영 환경 연결은 미설정 |
| 현재 개발 코드 | branch `agent/personal-workspace-v4-1-poc-20260901`, 코드 보존 `181302ed` | M0 시작 HEAD `6e4b44fe`, modified189/untracked478. 후속 보존 commit/push·Draft PR 완료. 원래 `flow-mvp` dirty 자료는 수정·정리·stage하지 않음 |

월 $0은 당시 신규 개발 프로젝트 비용 조회 결과이지 운영 전체 비용 보장이 아니다. 키·비밀번호·토큰은 이 문서나 채팅에 기록하지 않는다. 운영용 프로젝트 ID를 개발 실행에 주입하면 시작/쓰기/테스트가 실패하도록 M1–M2에서 검증한다. 앱 build와 CI에서 자동 migration을 실행하지 않는다.

## 기존 설계와 현재 코드의 충돌 조정

아래는 이번 전환의 설계 방향이다. 테이블 세부 DDL·보존 기간 등은 아직 구현하거나 영구 정책으로 확정하지 않았다. 로그인은 후속 사용자 답변에 따라 Google 우선·이메일 대안이며 실제 제공자 설정은 하지 않았다.

1. **한 저장 묶음과 실제 계정 격리.** [ProgramData](../../../lib/flow/integrated-poc/contract.ts)는 모든 `actors/spaces/public/receipts`를 담고, [실제 진입점](../../../components/flow/integrated-poc/ProgramApp.tsx)은 localStorage를 주입한다. 이 envelope 전체를 모든 사용자에게 내려주는 DB 저장으로 바꾸지 않는다. 인증된 서버 identity가 owner를 결정하고, 개인 자료/공개 DTO/서버 전용 자료를 분리한다. 클라이언트 actor 선택이나 `owner_id` 입력을 권한 근거로 사용하지 않는다.
2. **Flow 없는 원문.** 7월 `CanonicalFlowContent` 최소 Flow/Step/Item 조건을 자유 메모에 강제하지 않는다. 문서·행·sidecar·폴더·참조는 독립 private aggregate다. 명시 해석/개인 인계/공개 때만 실제 Flow lineage를 만든다. raw-only 저장이나 가짜 source Item으로 축소하지 않는다.
3. **ID와 버전.** 문서/행 ID, savedCopyId+flowId+itemId, Map owner/child, native sourceRow/item, series/occurrence, 공개 version, mutable revision을 구분한다. 기존 문자열 ID를 UUID로 바꾸며 새 항목으로 취급하지 않도록 owner+origin+legacyID 대응을 둔다. 제목·배열 위치·content hash를 identity 대신 쓰지 않는다.
4. **실행 기록.** 7월 단일 active run/완료 스냅샷을 날짜별 누적 progress·반복 회차·개인 기준일 전체의 대체물로 쓰지 않는다. 원문 일정/계획 기준일/실행 날짜/기록 날짜/조회 날짜를 따로 보존한다. `[1]`와 `[1.0]`, COUNT 의미를 DB 이전 과정에서 바꾸지 않는다. 실제 run 연결은 M1 계약 검토 사항이다.
5. **임시 입력과 저장 판본.** native working, pending raw, recovery, 명시 saved revision, 원본 후보/결정, 개인 인계, 공개 판본은 다른 확정 경계다. 자동 동기화가 이를 한 최신 문자열로 합치거나 원문을 자동 materialize하지 않는다.
6. **로컬 CAS와 서버 거래.** [program-store](../../../lib/flow/integrated-poc/program-store.ts)의 exact bytes/readback 및 [ProgramApp](../../../components/flow/integrated-poc/ProgramApp.tsx)이 [controller](../../../lib/flow/integrated-poc/controller.ts)에 주입하는 Web Locks는 같은 브라우저 탭 보호다. 서버에서는 owner 확인·expectedRevision 조건부 갱신·idempotency·거래 범위를 함께 검증한다. 다른 기기 변경 알림은 정본이 아니며 재조회 후 반영한다. 영구적인 local/server 이중 정본과 조용한 last-write-wins는 쓰지 않는다.
7. **Undo와 취소의 시간 경계.** 로컬 개인 snapshot Undo를 서버 전체 되감기로 바꾸지 않는다. 다른 기기의 후속 변경을 검출하는 개인 범위 보상 거래가 필요하다. 요청 전 취소/no-op/Escape는 mutation0; 전송 후 응답이 끊긴 요청은 ‘실패·취소0’으로 단정하지 않고 같은 request ID로 결과를 조회한다. 서버 성공이 확인된 뒤에만 저장됨 표시, 화면 갱신 실패는 별도 처리한다.
8. **공개와 파일.** 기존 공개 allowlist/불변 판본/철회 후 사본 기록 보존을 서버에서도 검증한다. 커뮤니티 dataUrl 사진은 object storage·권한·메타데이터·삭제 관계를 설계해야 한다. 임의 서버 URL fetch/AI/외부 Calendar OAuth는 현재 출력 기능을 잇는 선행 조건이 아니다.
9. **이관과 복구.** 7월 import allowlist에는 새 Program·native context 전체가 없다. 원본 key를 읽어 preview→사용자 귀속 확인→명시 commit→개수/identity/hash/투영 대조로 이전하고 원본은 보존한다. 시뮬레이션 actor·공개 샘플을 실제 타인의 계정이나 서비스 공개물로 자동 승격하지 않는다. 지원 불명 자료는 버리지 않고 원본 백업과 미매핑 사유를 남긴다.
10. **업데이트 rollback.** 7월의 `server-primary → local` flag만으로 최신 서버 자료를 복원할 수 없다. 호환 앱 rollback 또는 쓰기 중지+현재 서버 스냅샷 확보+검증된 재동기화를 우선한다. 복구 가능한 데이터 시점·누락 범위를 확인하기 전 오래된 로컬 자료로 덮어쓰지 않는다. DB는 additive/forward-fix, 복원은 분리 환경에서 연습한다.
11. **범위와 과거 임시값.** v4.1 최초 폴더2단계, PoC actor8/history80/30MB 상한은 운영 상품 정책이 아니다. 최신 text 모델의 트리/자원 제한, 별도 Flow 폴더 상속, 문서 참조를 구분해 재검토한다. 초기 Todo 제안보다 후속 D1 Text-first 결정이 우선이고, D2 작성 틀별 결과 정책은 별개다. 옛 K4 미구현 표시는 후속 구현 근거와 연결하고 역사 본문은 지우지 않는다.
12. **틀 선택과 구조 입력의 확정 시점.** D2-049는 단순 template 선택 자체를 명시적 1회 TXT 삽입으로 정하고 이전의 별도 materialize 단계를 대체했다. 현재 ProgramCreatorWorkspace에는 `빈 틀 확인/예시 확인 → 적용`과 사용자 구조 입력 후 materialize 경로가 있다. 후자의 9/14 시뮬레이션 성공만으로 전자의 원 UX와 같다고 판정하지 않는다. M4에서 단순 틀·예시 보기·구조 입력을 구분해 원 결정과 후속 승인 근거를 확인하고, 승인 근거가 없는 변경만 D07 비교안으로 올린다. 이번에 자동 삽입이나 새 확인 단계를 제품 정책으로 결정하지 않는다.

Supabase 공식 자료를 9/20 확인했다. 새 테이블의 **GRANT와 RLS는 별도**이므로 둘 다 검증한다([변경 안내](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically), [API 보안](https://supabase.com/docs/guides/api/securing-your-api)). view/RPC도 권한 우회가 없어야 하며 secret/service-role은 브라우저에 넣지 않는다. DB 백업에는 Storage 파일 본체가 포함되지 않으므로 전체 복구에는 파일도 필요하다([백업 문서](https://supabase.com/docs/guides/platform/backups)). 이메일 인증을 선택하면 기본 테스트용 발송을 운영 메일로 간주하지 않는다([SMTP 안내](https://supabase.com/docs/guides/auth/auth-smtp)). 실제 구현 시 다시 확인하며 이번에는 설정을 바꾸지 않았다.

## A01–A24 요구 대조표

원래 V41/D1/D2/BP ID 전체의 연결은 `alpha-requirement-routing.json`을 따른다. 아래 A 행이 현재 전환 판정의 정본이며 각 원자 조건의 ‘현재 충족’까지 대신하지 않는다. 기존 19개 의사결정 이력·14개 decisionRows도 원래 [inventory](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.json)에 보존하며 M1에서 상충하는 UI/정책만 D07로 올린다.

| ID / 출처·요구 | 현재 코드·증거 | 전환 판정 / 단계 | 알파 완료 조건과 검증 |
| --- | --- | --- | --- |
| A01 환경 분리 / 이번 사용자 결정·7월 §13 | 위 실제 프로젝트 조회, 현재 [package](../../../package.json)·[Next 설정](../../../next.config.ts) | DB 자원만 준비; 앱 격리 미구현 / M1,M2,M7 | dev/test/preview에서 운영 DB·Auth·bucket·redirect 접속 거절, env 누락 시 fail-closed, build DB쓰기0, 운영 fixture 주입0 |
| A02 다중 계정·권한 / 사용자 결정·7월 §6 | [actor/space 계약](../../../lib/flow/integrated-poc/contract.ts), [App](../../../components/flow/integrated-poc/ProgramApp.tsx)의 simulated actor 선택 | 실제 인증·RLS 미구현 / M2 | 두 실제 계정+anonymous로 테이블/API/RPC/파일 직접 읽기·쓰기 음성 검사, owner 위조·토큰 만료·삭제된 대상 거절 |
| A03 계정 전환·입력 보호 / D1-003,004,011,016,018·P08 | [App 복구 검사](../../../components/flow/integrated-poc/ProgramApp.external-recovery.test.tsx), [publisher 복구](publisher-external-recovery-review.md) | 로컬 UX 재사용·auth 상태 추가 / M2,M3 | A 로그아웃→B 로그인 후 A 입력·캐시·응답·구독 노출0; 미저장 입력 보관/폐기 선택과 재인증, 지연 A 응답 무시 |
| A04 독립 문서·폴더·참조·휴지통 / P01·v4.1 | [text-workspace](../../../lib/flow/integrated-poc/text-workspace.ts), [P01 평가](final-evaluation-2026-09-20.md) | 재사용+서버 저장 수정 / M1,M3 | 원문/행/sidecar/순서/참조/보관·휴지통 상태 round-trip; Flow 생성 없는 독립 문서; 폴더 삭제 내용 보존; 참조가 실행 복제하지 않음 |
| A05 QuickItem·네 origin·identity / V41-002·D1-001,007–009,024·P03 | [identity 계약](../../../lib/flow/personal-workspace-poc-contract.ts), [legacy-entry 검사](../../../lib/flow/integrated-poc/legacy-entry.test.ts), [네 origin](whole-two-b-origins-review.md) | projection 재사용·계정 귀속 이관 미구현 / M1,M3,M6 | 네 origin+QuickItem 충돌 없는 대응표, 재import 중복0, 정체성·원문/개인 기록 보존. 합성 QA와 사용자 실자료를 구분 |
| A06 날짜·폴더·순서 이동 / V41-003–020·P02/P08 | [v4.1 원 감사](../2026-09-05-flowme-integrated-poc-ux-audit-v1/v41-audit.md), [S03](final-scenario-ledger-2026-09-20.md) | 의미 재사용·입력 방식 동등성 미검증 / M3,M7 | drag/350ms long-press/메뉴/키보드 동일 명령; 8px 취소·Escape/pointer cancel/동일위치0거래; Flow Item 폴더 상속, 날짜 이동이 원본/Flow 소속 불변 |
| A07 오늘·주·월·미정·시간순 / V41-021–028·P02 | [개인 surface](../../../components/flow/integrated-poc/ProgramSpace.tsx), [개인 실행 평가](weekly-execution-map-review.md) | 재사용·원격 order 저장 수정 / M3 | 같은 target의 기간/문서/Flow 일치, 날짜 context별 직접 정렬/시간순 복귀, 빈 날짜 펼침·날짜 중복 표시 대조 |
| A08 완료·날짜별 누적·반복 / D2-016·P02 | [recurrence 상태](../../../lib/flow/integrated-poc/recurrence-state-contract.ts), [주간 평가](weekly-execution-map-review.md) | 모델 재사용·서버 회차/충돌 추가 / M1,M3 | 같은 회차 identity, 날짜별 누적값 비합산, 완료/다시열기/지난값 수정, 미래 계획 변경 후 과거 기록 보존; COUNT 안내는 기존 의미 유지 |
| A09 Map 구조·기준일·품질 / D1·P02/P03/P07 | [Map 계약](../../../lib/flow/integrated-poc/program-legacy-map-plan-contract.ts), [Map 근거](map-b-execution-review.md) | 재사용·서버 aggregate 추가 / M1,M3 | 공통/개별 고정 기준일·child ID·포함/복원·품질 보류 유지, 빈/추가 child 지원 경계 명시, 다른 자료로 성공 대체 금지 |
| A10 공개 탐색·부분 가져오기 / D1-017,019·P03 | [Discovery](../../../components/flow/integrated-poc/ProgramDiscovery.tsx), [S05](final-scenario-ledger-2026-09-20.md) | 로컬 UI 재사용·서비스 catalog 미구현 / M5 | 공개 검색과 개인 saved 검색 분리, 필터/스크롤 복귀, A 공개본→B 선택 사본/기준일→다중 문서 참조; 중복 요청1건 |
| A11 URL·무저장 출력·형식 / D1-021–026·P04 | [output](../../../lib/flow/integrated-poc/output.ts), [private-output](../../../lib/flow/integrated-poc/private-output.ts), [결과 정책](creator-template-result-review.md) | projection 재사용·배포주소 복귀 수정 / M3,M5 | 원문 TXT와 선택 TXT/CSV/ICS 구분·실제 bytes 대조, 저장0·미지원URL 예시대체0·미정 ICS 안내, 새 주소의 정확 공개 판본/항목 복귀. 외부 import는 별도 실행 증거 |
| A12 native 편집기·작성 틀·속성 / D2-035,036,038,040,041,049·P06 | [CreatorWorkspace](../../../components/flow/integrated-poc/ProgramCreatorWorkspace.tsx), [재사용 평가](reuse-fidelity-review.md) | 모델 재사용·저장 연결 수정·틀 확정 UX 대조 필요 / M4 | 빈 원문 예시·여섯 틀/16속성·네 범주·미완성 원문 허용. D2-049의 선택=삽입과 현재 확인/구조 materialize 경로 구분·승인 대조, 명시 적용 한 거래·둘러보기/취소0, native Undo/Redo·48px·실제 IME; ghost는 원문에 저장 안 함 |
| A13 working/saved/pending/recovery / 개발2 이력·P06 | [제작 계약](../../../lib/flow/integrated-poc/creator-workspace-contract.ts), [native pending](native-pending-ui-review.md), [recovery](legacy-recovery-review.md) | 재사용·서버 revision/복구 추가 / M4,M6 | 첫 저장 전/후 미반영 입력, 실제 saved identity·context·journal·이력 보존. 자동 저장을 명시 저장본으로 합성하지 않음. 재인증/다기기 충돌에서 입력 보존 |
| A14 원문 갱신·정렬·개인 인계 / D2-018·P06/P07 | [원문 정렬](whole-two-b-weekly-order-review.md), [현재 spec](spec.md), [native lineage](../../../lib/flow/integrated-poc/creator-native-lineage.ts) | 재사용·원격 거래 경계 수정 / M4 | 원문 정렬과 TimelineOrder 분리, candidate→decision→apply→save→개인 수용 분리, CRLF/한글/하위구조·부분연결·원본전용 Undo 영향 검사 |
| A15 선택 공개·불변 판본·철회 / 개발2·P06/P07 | [publication](../../../lib/flow/integrated-poc/publication.ts), [철회 근거](final-output-withdraw-review.md) | local domain 재사용·서버 publish 미구현 / M5 | private allowlist 배제, owner 검증·atomic publish, 현재pointer 경쟁409, 철회 후 구판/사본/개인기록 보존; 미리보기·취소0게시 |
| A16 제안·검토·부분 수용 / 개발1·개발2·P07 | [D note](whole-two-d-note-review.md), [D week](whole-two-d-week-review.md) | local domain 재사용·실계정 검증 미구현 / M5 | B의 구판 제안→A 검토→불변 새판→B 필드별 비교/유지/수용, source 경고 우회0·개인 기록 보존·stale 거절·Undo 경합 |
| A17 커뮤니티·활동·사진 / 승인 P05 | [community](../../../lib/flow/integrated-poc/community.ts), [커뮤니티 평가](whole-two-c-community-review.md) | local domain 재사용·Auth/Storage 미구현 / M5 | Flow 없는 질문·부분/반대 경험·답글/반응·수정/삭제·정확 활동 복귀, 타인수정 거절, 사진 MIME/크기/노출·삭제된 근거 처리 |
| A18 서버 거래·다기기·네트워크 / 사용자 결정·7월 §7/11 | [controller](../../../lib/flow/integrated-poc/controller.ts), [program-store](../../../lib/flow/integrated-poc/program-store.ts) | local CAS 재사용 한계·서버 구현 필요 / M1,M3 | expectedRevision 경합1성공/1충돌, 동일request 재시도1mutation, 성공응답 유실 후 정확 조회, 통신 복귀·구독 누락 보정·오래된 캐시 덮어쓰기0 |
| A19 Undo/Redo·복구 / 세 결과물·P08 | [store 검사](../../../lib/flow/integrated-poc/program-store.test.ts), [controller 검사](../../../lib/flow/integrated-poc/controller.test.ts) | private 의미 재사용·서버 Undo 재설계 / M1,M3,M4 | 다른 계정/공개자료/다른기기 후속변경을 snapshot 전체복원으로 지우지 않음; 충돌 비교·개인 범위 보상, native와 전역Undo 분리 |
| A20 전체 백업·복원·이관 / 사용자 요청·7월 §12 | [7월 계약](../2026-07-11-canonical-flow-data-model/storage-api-contract.md), [출력 한계](final-evaluation-2026-09-20.md) | 계약 보완·전체 기능 미구현 / M1,M6 | owner/schema/checksum/ID·native/기록/관계/공개판본/파일 manifest, 원본 보존·preview0쓰기·동일backup 재이관0중복, 실패 원자성·분리 환경 restore 대조 |
| A21 업데이트·rollback / 사용자 요청·7월 §12/13 | 현재 schema decoder는 자동 migration이 아님 | 신규 구현·미검증 / M1,M6 | 이전 버전 fixture+실사용형 자료로 additive migration/호환 앱 rollback, 복구 후 최신 서버 자료 보존·구독 복원, old client 차단·재업데이트 회귀 |
| A22 화면·키보드·실기기 / V41-062–066·D2-038/042/061·P08 | [화면별 평가](final-evaluation-2026-09-20.md), [원자 기기 항목](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.md) | 부분 QA 재사용·실제 기기/AT 미검증 / M2–M7 | 375×812,390×844,844×390,1024×768,1440×900 overflow/page error/핵심가림0; 48px 지정행동·비드래그·초점·safe area·확대; Android/iOS/IME/AT별 실제 증거 |
| A23 회귀·보안·성능·운영 / P08·최종 잔여 | [최종 평가](final-evaluation-2026-09-20.md)의 당시 npm1FAIL/audit5·Map/답글 지연 | 재확인·수정 필요 / M1,M7 | 출처기한 정직한 검토, 취약점 triage/수정, npm/build/security·권한음성/E2E, 긴본문·누적자료 측정/기준 합의, 비밀 없는 로그·비용/오류 관측·release smoke |
| A24 보류·승인 경계 / BP·원 대체 결정·이번 목표 | [inventory 이력](../2026-09-05-flowme-integrated-poc-ux-audit-v1/coverage-inventory.json), [아래 D 결정](#결정-상태) | 일부 보류 / 각 단계 gate | 임시값을 제품정책으로 확정하지 않음. AI/외부동기화/공동편집/유료/배포는 별도 승인. 보류 원자ID·이유·재개 조건 유지 |

## M0–M7 실행 계획

단계가 올라가도 앞 단계의 원 요구·회귀를 계속 검사한다. 아래 단계 상태는 요약이고, A 원장의 기능 판정과 실제 결과 링크를 근거로 갱신한다. 구현 후에는 `구현 완료 → 개발계 검증 완료 → 운영 반영 → 실사용 확인`을 구분한다. 모든 단계를 승인 없이 연속 실행하지 않는다.

| 단계 / 의존성 | 기획·UX | 개발 설계·구현 | 검증·종료선 / 현재 상태 |
| --- | --- | --- | --- |
| M0 문서 정합화 / 현재 목표 | 세 결과물·의사결정 대체 관계와 실사용 목적 정리 | 기존 문서 연결·A 원장·원자 참조 매핑·환경 사실·다음 묶음 | 출처/단계/완료조건/검증 연결, 매핑·링크·원문 검사18/18 및 docs:check PASS. 보호1716 중 예정 문서9개 외 변경0. **완료 — 문서 범위만** |
| M1 저장·권한·복구 경계 / M0 후 구현 승인 | 저장됨/대기/충돌/계정만료/복구 UX, 원문·실행·공개 구분. D04/D07 충돌 검토 | aggregate/identity/revision/operation receipt·repository port·환경 검증 계약, 전체 backup manifest·lossless fixtures, 로컬/fake-server adapter. 실제 운영접속 금지 | A01/A04–09/A18–21 contract round-trip·실패·경합·오염 차단. 다음 묶음의 통과 뒤에 SQL/Auth 연결. **예정** |
| M2 실제 인증·개발 환경 / M1,D01,D02 + 개발 DB/Auth 설정 승인 | 로그인/복구/만료·계정전환·첫 가져오기와 빈 상태 | 개발용 migrations·RLS/grants·Auth provider·bucket 정책, 서버 auth identity·캐시/구독 격리. CI/preview=dev, 운영식별자 reject | 두 실제 테스트 계정+anonymous의 SQL/API/파일 권한 음성 검사. 개발 DB가 생성됐다는 사실만으로 종료하지 않음. **예정** |
| M3 개인공간·동기화 / M2 | 원래 이동/기간/완료·동일 항목과 네트워크 충돌 UX 대조 | 개인 원문/폴더/QuickItem/사본/Map·반복·누적 기록 서버 저장, conditional mutation/idempotency·refresh/subscription·개인 Undo | A04–09/A18–19 세 기기와 두 계정, 온·오프라인/동시수정/날짜 경계·원본불변. 제품 정책 미결은 명시 차단. **예정** |
| M4 제작·이력 / M3 | 같은 편집기·빈 틀 예시·16속성/결과형식·미반영 입력·복구 | working/saved/pending/recovery/source session/native journal/개인 handoff 분리 저장 | A12–14·19 원래 D2 fixture로 이관·명시 저장·Undo/Redo·reload·다기기 충돌. 읽기/작업복구가 공개본 만들지 않음. **예정** |
| M5 실제 공유·커뮤니티 / M4,D02,D05 + 제한 공유 승인 | 탐색→일부 사용, 선택 공개→질문/기여→업데이트 왕복; 경험 작성은 의무 아님 | public repository·immutable versions·개인 사본·제안/검토·질문/답글·사진/활동, service authorization·rate/abuse 최소 보호 | A10–11/A15–17 실제 A/B 계정 왕복·누출0·중복1건·철회/삭제/고정구판·파일 접근 검사. actor 시뮬레이션으로 대체 금지. **예정** |
| M6 보존·복구·업데이트 / M3–M5,D03,D04 | import preview·미매핑/충돌·복원 범위·최종복구시점 안내 | 기존 PoC/legacy 명시 이관, 전체 backup+Storage 파일·owner 대응·복원 drill, additive migration·compatible rollback·old-client 처리 | A20–21 새/이전 schema·큰자료·사진·부분실패·restore·rollback 후 최신기록 보존. 실자료 유일본 투입 **전 필수**. 설계/fixture는 M1부터 병행. **예정** |
| M7 실사용 gate·배포 / M1–M6,D03/D05/D06/D07 + 발행 승인 | 각 여정의 모바일/접근성/긴 자료·상태 안내 재평가, 실사용 안내 | 회귀/취약점 해결·오류/비용 관측·고정 HTTPS·운영 설정·검증된 release 반영·복구 절차 | 아래 T01–T12·원자 영향 재검증, 실제 기기 기록·범위 승인 후 소규모 실사용. commit/push/PR/Preview/Production 각각 별도 기록. **예정** |

개발 중인 부분만 시험 배포할 경우 ‘개인 저장 검증판’ 등 제한을 표시하고 미구현 공유를 실제 게시로 보이게 하지 않는다. 이를 M5/M6/M7 완료나 통합 알파 완성으로 대신하지 않는다. 실제 자료를 투입하기 전 M6의 복원 조건을 먼저 충족한다.

## 바로 다음 구현 묶음 — M1 인계

**목표:** 현재 UI/운영 데이터를 바꾸지 않고 계정별 저장·명령·복구 port를 정의하고, 기존 모델의 무손실 round-trip과 실패 경계를 fake server로 증명한다. Supabase/Vercel 자원 수정은 이 묶음의 완료 조건이 아니다.

- 착수 전: 최신 git/소유권 재확인, 현재 미커밋 PoC를 기준선으로 확보. main 동기화나 새 worktree 필요 여부는 별도 판단하며 검증된 미커밋 기능을 잃는 clean-main 재시작 금지. commit/push는 별도 승인이다.
- 설계: private document/creator/execution, immutable public/version, community/attachment, import/operation manifest의 관계·owner·revision 표. A01 환경 denylist/allowlist·session-bound response·A19 Undo 충돌 계약. 세부 테이블명은 DDL 전에 검토한다.
- UX: 기존 화면 옆에 `서버 저장 대기 / 저장 확인 / 다른 기기 변경 / 로그인 만료 / 결과 확인 중 / 복구 필요` 상태와 행동을 정의한다. 저장 성공 전 성공 toast·완료 화면으로 넘어가지 않음. 무조건 재로그인/새로고침으로 입력을 버리지 않음.
- 구현 후보: 별도 alpha persistence 모듈/계약 검사와 기존 순수 모델 adapter. 새 client 전체 envelope endpoint 금지. 현재 `ProgramApp`의 활성 localStorage writer는 아직 교체하지 않는다.
- fixture: 독립 문서+참조, QuickItem, 네 saved origin, 실제 structured Map, 일반/반복 누적 기록, native saved/pending/recovery, public 두 판본/사본/커뮤니티/사진. 합성 자료임을 표시하고 실행 이력을 재생성하지 않음.
- 종료: serialize→validate→restore의 identity/원문/record/관계 동등, stale·중복·응답유실·권한오류·잘못된환경·다른계정0누출, 미지원payload fail-closed. 문서/표적 검사 PASS, 영향 범위에 맞게 npm/build를 실행하고 기존 실패와 새 실패 분리. 실제 서버 동기화 완료라고 보고하지 않음.

이 M1은 다음 구현 승인을 받을 정확한 묶음이다. 현재 목표 완료가 M1 구현 완료를 뜻하지 않는다.

## T01–T12 검증 계획

각 실행은 build/commit 또는 소스 hash, 환경·사용자 구분, 사전/사후 상태, 실제 명령·실행 개수·실패·skip, 화면 크기·기기, 증거 파일을 기록한다. 아래는 **검증 계획이며 전부 미실행**이다.

| ID | 시나리오와 통과 기준 | 연결 |
| --- | --- | --- |
| T01 | dev 설정에 운영 project ref/URL 주입·env 누락·build/테스트 초기화 시도 → 외부 쓰기0·시작 거절. 기본 `/my`·원본 `flow:*` 전후 bytes 같음 | A01,A23 |
| T02 | A/B/anonymous에서 ID·owner·경로·RPC 위조 및 public/private file 접근 → 타인비공개 읽기/쓰기0. privileged key로 통과한 검사를 일반 사용자 검사로 세지 않음 | A02,A15–17 |
| T03 | A 미저장 입력·느린 응답 중 logout→B login, 만료→재인증·Back/reload → A 입력/응답/캐시가 B에 노출0, 복구 선택 보존 | A03,A13 |
| T04 | 4origin+QuickItem·문서/폴더→오늘/주/월/미정→완료/다시열기·모든 이동경로·Undo → 같은 target, source/Flow소속 불변·무효동작0 | A04–07,A19 |
| T05 | 같은 계정 PC/폰/태블릿, 같은 revision 경합·다른 항목·오프라인/응답유실·중복요청 → 의도한 거래만 반영. `[1]`/`[1.0]`, 날짜/DST/시간대·반복 past/future·Map 기준일 보존 | A08–09,A18 |
| T06 | 빈/긴 원문·여섯 틀·예시·16속성·native 정렬/CRLF/한글조합·pending/recovery→명시저장→개인인계→이력복원 → 원문/ID/context 보존·미리보기/취소 무적용 | A12–14,A19 |
| T07 | A 일부 공개→B 검색·기준일/포함 선택·두 문서 참조·실행→A 새판→B 필드별 수용/Undo→철회 → 사본·고정판본·개인기록 유지, 비공개필드 누출0 | A10,A15–16 |
| T08 | Flow 없는 질문·경험/반대근거·답글/반응·사진·활동·수정/삭제 → owner만 변경, 원글삭제 표기, private draft 비노출·파일 접근 검사 | A17 |
| T09 | URL hit/unsupported·직접 원문 확인·무저장 TXT/CSV/ICS → 실제 bytes/UID·출처/주의·선택 일치, 새 배포주소의 정확판본 복귀. 외부 앱 import는 실행한 경우만 PASS | A11 |
| T10 | 기존 local/import preview→commit/retry→이미 서버수정 후 rollback, backup schema변조/손상/누락파일→거절, 별도환경 전체복원 → counts/hash/identity/권한·원문·실행·첨부 대조 | A05,A13,A20 |
| T11 | 이전 앱/DB fixture→업데이트→앱 rollback/forward-fix→재업데이트·old client → 최신자료 손실0, 불명 성공 요청 조회·중복0, 복구 가능 시점 명시 | A18,A21 |
| T12 | 원래 S01–S10 + T01–11 조합을 실제 알파에서 수행. 다섯 해상도·키보드/비드래그·실제 Android Chrome/iOS Safari·IME/AT·긴자료 지연, npm/build/security/배포 smoke → 결함·미실행을 각각 공개 | A22–24 |

배포 전 자동 검사 명령은 `npm.cmd run docs:check`, 영향 표적/권한·SQL/API 테스트, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run security:audit`, 실제 경로 E2E다. 공급 서비스 재연결·배포가 필요한 검사는 승인받은 개발/운영 환경에서만 실행한다. 원래 모바일 전용 행동 48px 기준을 ‘일부44px 통과’로 바꾸지 않는다. 가로 넘침/console/page error/가려진 핵심 행동은0을 목표로 한다. 실제 기기 미실행이면 승인된 축소 테스트 범위를 따로 표시하며 제품 전체 검증으로 표현하지 않는다. 관찰 사용자 수는 사람의 실제 수행 기록으로만 집계한다.

## 결정 상태

M0 이후 받은 답변은 [9/20 사용자 결정](../../DECISIONS.md#2026-09-20---실사용-알파-인증가입무료-검증과-발행-권한)이 정본이다. 아래는 적용 상태와 잔여 질문이며 D04/D05/D07 등 답하지 않은 항목을 승인된 정책으로 바꾸지 않는다.

| ID | 결정과 권장안 | 필요한 시점 |
| --- | --- | --- |
| D01 | 방향 확정: Google 우선, 복잡하면 이메일 대안 허용. OAuth 동의/redirect와 이메일 발송·확인·복구 방식의 실제 설정은 미완료 | M2 설정 전 필요한 사용자 외부 작업 확인 |
| D02 | 방향 확정: 누구나 가입 가능. 초대 전용 권장은 채택하지 않음. 개발 A/B 검사와 서비스 가입은 구분하고 인증·가입/요청 남용 방지·비공개 데이터 격리를 검증 | M2 인증/가입, M5 공개 접근 검증 |
| D03 | 비용 경계 확정: 초기 무료 검증, 유료 전환 별도 승인. 백업 저장 위치·보관 기간·허용 손실시점/복구시간은 미결. 무료 여부와 데이터 보존 능력은 별개 | M6 보존 설정·M7 실자료 투입 전 |
| D04 | 이관 범위: 실제 개인 자료·제작 콘텐츠·누적 QA/시뮬레이션 자료 구분, 어느 실제 계정에 귀속할지. 권장: QA actor와 mock 공개물은 운영 공개로 자동 승격하지 않음 | M1 fixture범위, M6 실제 import 전 |
| D05 | 공개·커뮤니티 운영: 공개 대상, 신고/숨김 최소 절차, 계정 삭제·공개본/사본/첨부 보존·삭제의 충돌. 전체 공개 전에 결정 | M5 서비스 공유 gate |
| D06 | 권한 확정: 필요할 때 코드 commit/push 가능, 현재 목표는 Draft PR까지 준비. merge와 Preview/Production 배포는 별도 승인. 자동 배포를 먼저 차단·확인하며 기존 서비스 덮어쓰기·도메인 구매·저장소 visibility 변경은 미승인 | 현재 Git 보존 및 각 배포 전 |
| D07 | 정책·UX 충돌: 폴더/자료 상한·서버 Undo 범위·오프라인 저장 의미·COUNT 안내·긴자료 성능 예산. 기존 의미 유지가 기본이며 변경이 필요한 항목만 비교안을 제시 | 해당 M1–M7 구현 전 |

추론 수준은 Astra Extra High 권장이다. 보안/동기화/이관 계약에서 단일 어려운 충돌이 생기면 Max 필요 이유를 먼저 알린다. 실제 설정을 바꿨다고 가정하지 않는다.

## 보류와 재개 조건

실제 AI provider/URL 임의 수집, Google Calendar 등 외부 계정 동기화, 동시 공동편집, 조직/팀 권한, 결제/마켓플레이스, 알림·push, 네이티브 앱은 이 전환의 자동 선행 작업이 아니다. 기존 출력/수동 원문/개인 실행을 유지하고, 실사용에서 확인한 필요와 별도 승인 때 재개한다. 서버 공개·커뮤니티는 보류 목록에 숨기지 않고 M5로 유지한다. 커스텀 도메인·유료 branch·서비스 추가는 필요와 비용 승인 후 선택한다.

7월의 URL/AI future tasks 중 runtime validator·identity·repository·Auth/RLS·이관/동시성은 A 원장에 연결한다. fake/live provider·자동 수집은 그대로 보류한다. 그 체크박스를 현재 PoC 구현만으로 일괄 완료 처리하지 않는다.

## 현재 검증과 다음 갱신 규칙

현재 수행한 것은 문서/코드 읽기 대조와 Supabase metadata/public-table 조회다. 제품 테스트·브라우저·실제기기·관찰 검증을 이번에 새로 수행한 것은 아니다. 최종 PoC 평가의 1749/1749, npm2030/2031, audit5는 과거 실행 이력이다. 운영 계정이나 여러 기기 동기화의 증거로 재사용하지 않는다.

이후 구현 시 해당 A 행에 정확한 결과/잔여와 실행 근거를 갱신하고, 완료된 M 단계의 종료 조건을 모두 확인한다. 과거 PoC progress와 final report는 덮어쓰지 않는다. 검사·제품 구현·운영 반영·관찰 결과를 한 ‘완료’로 묶지 않는다.
