# M3 개인공간 서버 저장·동기화

2026-09-21 · **M3 개발계 범위 완료.** 사용자가 다음 목표 설정과 실행을 승인했다. 개인공간 편집·실제 서버 저장·독립 클라이언트 동기화/복구를 구현하고 아래 검증을 마쳤다. [실사용 전환 원장](alpha-transition.md)의 M3 실행 기록이며 M4 제작·M5 공유·M6 이관·M7 배포의 완료를 대신하지 않는다.

## 기준과 범위

- 격리 worktree `flow-poc-merge-prep-20260920`, branch `agent/alpha-m1-persistence-20260921`. 착수 시 `git fetch origin main` 후 HEAD와 origin/main은 모두 `efd8b642`다. M1·M2의 같은 세션 미커밋 변경을 이어간다. 원래 `flow-mvp`의 dirty/미추적 파일은 읽기 참조만 한다.
- `/alpha`와 개발 프로젝트 `wkmzcxpnojobxrgebapw`에서만 실행한다. 착수 읽기 조회: 개인공간 2개, 둘 다 canonical empty account, 비공개 첨부 0개.
- 기존 개인 문서·폴더·기간·실행·Map 화면과 순수 transition을 재사용한다. 전체 Program/시뮬레이션 actor/public repository를 계정 데이터로 올리지 않는다. M3에서 없는 제작·공개·탐색 진입은 해당 화면에서 숨긴다.
- 기존 `/my`·운영 저장·기존 local PoC writer를 유지한다. 실제 기존 자료 이관은 M6다. M3의 네 origin/Map 검증은 명시한 합성 fixture로 하며 사용자 자료 자동 가져오기는 없다.

## 단계별 계획

| 단계 | 할 일 | 종료 근거 |
| --- | --- | --- |
| 1 요구·UX·계약 | A03–09/A11/A18–19의 기존 기능과 서버 경계를 대조, 현행 화면 재사용 지점·충돌/오프라인/Undo 설명 확정 | 아래 요구 매핑, interface와 실패 상태 계약 |
| 2 DB·저장 port | M2 additive migration, owner별 명령·영수증·CAS·Undo, direct update 차단, 고정 token adapter | 두 계정/anonymous SQL·API 음성, 같은 revision 경합, 중복/응답 유실·손상 거절 |
| 3 개인 화면 연결 | 문서·폴더·기간·이동·완료·반복/Map·출력 재사용, 로그인 계정별 shell과 원문 입력 보호 | 기존 화면과 실제 명령 연결, 저장 확인 전 성공 표시 없음 |
| 4 동기화·복구 | 독립 세 클라이언트, refresh/가시성/재접속 보정, 충돌 비교, 동일 ID 결과 조회, 개인 보상 Undo·reload | 서버 성공 자료·미저장 입력·다른 계정 격리 대조 |
| 5 검증·평가 | 표적/회귀/npm/build·다섯 viewport·키보드/비드래그·운영 fixture bytes 검사, 필요한 결함 수정 | 실행 수·환경·미실행 구분한 결과, 기존 원장 갱신 |

## 요구 매핑과 완료 판정

| 기존 요구 | M3 적용 경로 | 현재 판정 |
| --- | --- | --- |
| A03 계정 전환·입력 보호 | M2 인증 generation + 계정/탭별 recovery + 미저장 편집 보호 | 구현·순수/인증 회귀 PASS, 실제 충돌 원문 reload·다른 문서 입력·A→B 격리 PASS |
| A04 문서·폴더·참조·휴지통 | ProgramSpace 및 기존 private transitions → 개인 명령 | 연결·순수 회귀 PASS, 문서/폴더 실제 API·화면 PASS; 참조/휴지통은 도메인 회귀와 연결 검사 |
| A05 네 origin·QuickItem | saved binding/legacy snapshot identity 보존; 실제 이관은 M6 | 네 origin은 합성 parity PASS, QuickItem 실제 API PASS; 실자료 import 미포함 |
| A06 이동·A07 기간/순서 | 같은 ProgramMutate 경로와 기존 날짜/폴더/행 순서 의미 | 실제 날짜/폴더 이동과 메뉴·키보드·drag·합성 touch의 같은 순서 변경 PASS |
| A08 누적/반복·A09 Map | 기존 recurrence/legacy private surface + 서버 왕복 | 합성 도메인 parity PASS; 기존 실자료/Map의 live UI 이관 검사는 M6 전 미실행 |
| A11 개인 출력 | 기존 개인 TXT/CSV/ICS 무저장 출력; 공개판본 복귀는 M5 | 개인 출력 연결·회귀 PASS, 실제 TXT 미리보기/다운로드 bytes 일치·서버 쓰기0; 공개 경로 미포함 |
| A18 거래/다중 세션 | owner별 CAS·영수증·같은 요청 재시도·refresh 보정 | SQL·실제 API·브라우저 응답 유실/오프라인/충돌 PASS; 실제 기기·push 구독 미포함 |
| A19 Undo·복구 | 마지막 성공 명령의 개인 필드 보상 + 후속 revision 충돌 | 실제 Undo/Redo·후속 변경 거절·미저장 원문 reload·손상 복구 차단 PASS |
| A22 화면/입력 | 다섯 크기의 실제 브라우저 자동화, 실기기/AT 별도 | 개인화면 35조합 PASS, 인증 30/30 PASS; 실기기/AT 미실행 |

## 개발 버전 계약

M1의 계정 단위 revision과 보수적인 충돌 검사를 이번 개발 버전에서도 유지한다. 문서별 revision으로 바꾸면 폴더·참조·기간 이동의 교차 관계를 별도 거래로 보장해야 하므로 M3에서 조용히 세분화하지 않는다. 서로 다른 문서의 동시 변경도 충돌할 수 있으며, 이는 영구 제품 정책이 아니다. D07의 세분화·최종 Undo/오프라인 정책은 실사용 전 평가 대상으로 남긴다.

서버 저장 전 입력과 마지막 확인 자료를 구분한다. 오프라인/응답 유실은 저장 완료가 아니며, 이미 전송한 요청은 같은 ID로 결과를 조회한다. 서버 결과를 모르는 요청을 취소 0건으로 표시하지 않는다. 충돌 시 서버 자료와 내 보관 입력을 함께 확인하고 명시적으로 정리한다. 자동 last-write-wins나 전체 snapshot 덮어쓰기는 허용하지 않는다.

Undo는 마지막 성공 명령의 개인 변경 필드만 보상하며 서버 revision이 달라졌으면 거절한다. 다른 기기의 후속 자료를 지우지 않는다. 인증 바뀜/로그아웃에서는 이전 자료와 늦은 응답을 숨기고, 같은 계정으로 다시 로그인했을 때만 복구 입력을 연다. 탭별 복구 슬롯으로 다른 탭의 미확정 명령을 덮지 않는다.

## 검증 결과

구현과 최종 검증을 마쳤다. 단계1–5는 이 문서의 요구 대조·개발 버전 계약·구현 및 아래 실행 증거로 종료한다. API·SQL·브라우저·순수 모델을 합산해 사용자 수나 완료율을 만들지 않는다. 독립 browser context는 실제 PC/Android/iOS 기기 검사나 관찰 사용자 연구가 아니다.

### 구현과 데이터 경계

- `AlphaWorkspace`는 기존 ProgramSpace·ProgramLegacyWorkspace·개인 출력을 계정별로 연결한다. 문서/기간/폴더/완료의 순수 transition을 새 `alpha-sync` port에 전달한다. 기존 local PoC의 actor 선택과 writer를 불러오지 않는다. 아직 연결하지 않은 공개·제작 메뉴는 capability로 숨기며 기본 ProgramSpace는 기존 메뉴를 유지한다.
- `/api/alpha/account`는 Node 서버다. 같은 요청의 고정 JWT로 Auth 사용자와 RLS 계정을 확인한 뒤 M1 전체 도메인 validator와 원본 불변 비교를 실행한다. 검사한 owner·명령을 서버 전용 HMAC으로 서명하고 DB의 원자 명령에 전달한다. 브라우저·응답·증거에 서명 키나 proof를 내보내지 않는다.
- DB는 live session/만료/owner/proof를 검사하고 owner행을 잠근 뒤 receipt·CAS·개인 필드·Undo를 한 거래로 처리한다. 직접 REST UPDATE/DELETE는 여전히 거절한다. public RPC는 invoker, private writer는 고정 search_path와 제한된 definer다. 계정 단위 revision이 달라지면 자동 덮어쓰기하지 않는다.
- 원본 model·출처 후보·source lifecycle·기존 saved identity와 item-line 연결은 변경할 수 없다. 개인 실행 raw.state·날짜·진행·Map 개인 선택은 기존 validator를 통과해야 한다. M6 전에는 기존 source snapshot을 일반 M3 명령으로 처음 가져오거나 없앨 수 없다.
- command recovery와 미저장 원문은 owner/탭별 sessionStorage에 보관한다. 모두 `flow:poc:personal-workspace:v1:*` prefix 안이다. 확인된 서버 판본, 전송 결과 미상 명령, 미저장 입력을 구별한다. 확인된 마지막 자료를 갱신하다 네트워크/손상 응답을 받으면 기존 자료만 남기고 쓰기를 막으며, 인증이 만료되면 개인 화면을 숨긴다.
- 20초 polling과 focus/online/visibility 시 재조회한다. 백그라운드의 다른 변경이 미저장 입력을 덮지 않는다. 충돌 비교는 서버 원문/내 원문과 변경 종류를 보여주며 내부 JSON은 표시하지 않는다. 성공 응답을 잃으면 동일 requestId로 결과 조회·재시도한다.

### 개발 버전의 한계

이 버전은 **서버 거래 단위 Undo**다. 이전 local PoC의 연속 입력 `groupId`를 여러 서버 거래의 하나의 Undo로 묶지 않는다. 마지막 성공 저장 배치만 되돌리고 후속 revision이 있으면 막는다. 커서 이동은 ProgramSpace의 로컬 ref를 사용한다. 확인된 미지원 차이를 기존 UX와 동일하다고 판정하지 않는다.

sessionStorage 복구는 같은 탭의 reload/재로그인 보호이며 닫은 탭·브라우저 삭제 후 영구 오프라인 백업이 아니다. 다중 기기는 독립 브라우저 문맥으로 저장 계약을 검증할 뿐 실제 기기 검증은 별도다. 20초 보정은 Realtime push 동기화가 아니다. M7 전에는 중요한 자료의 유일본을 넣지 않도록 화면에 안내한다.

미저장 원문 보호는 등록된 문서/반복 편집기에 적용한다. ‘만들기’ 전의 새 문서 제목, ‘추가’ 전의 빠른 할 일 입력 등 명시 제출 폼 전체의 영구 임시저장을 보장하지 않는다. 충돌로 보관한 원문과 현재 편집 중인 원문은 분리해, 다른 문서 입력이 보관본을 밀어내지 않게 했다. 성공 응답의 receipt가 손상되면 ‘거절됨’으로 정리하지 않고 결과 미상으로 보존하며 동일 ID로 확인한다.

현재 쓰기 경로에는 Node 서버가 필요하다. GitHub Pages 정적 배포만으로 이 API가 실행되지는 않는다. 향후 정적 UI를 선택하면 별도 검증 API/Edge 배치와 origin·Auth callback을 함께 설계해야 하며 이번에는 배포하지 않는다.

### 실행 중 확인한 결과와 실패 이력

- 실제 개발 API 최종 앞선 실행 38/38: `output/alpha-m3/api-2026-09-21T09-29-21-862Z.json`. 실제 A 세션3/B세션1이며 메일 요청0. 모든 테스트 세션 logout, 테스트 전 space/source 복구 확인. 이후 브라우저와 실행 시간 일부가 겹친 사실을 아래에 별도 기록한다.
- SQL rollback 시나리오: 실제 존재하는 테스트 session ID를 사용한 역할/claims 모의 검사. 동작 assertion43·fixture 전제8은 script의 실제 분기/loop를 정적으로 산정한 수이며 runtime 계측 카운터가 아니다. marker 확인 뒤 ROLLBACK, fixture 원장·실패 trigger 잔존0. 카탈로그 확인12/12와 구별한다. 근거 `output/alpha-m3/database-evidence-2026-09-21T09-18-55Z.json`.
- 원본 변조는 full schema만으로 통과할 수 있어 서버 before/after 불변 검사와 음성 회귀를 추가했다. 네 origin/실제 structured Map/반복/누적/순서/legacy 완료의 fake HTTP 도메인 parity와 boundary는15/15 PASS다. 이 수치를 실제 자료 이관이나 실제 Map UI의 live DB 검사로 표현하지 않는다.
- 브라우저 검사 중 문서 폴더 selector의 accessible label과 role 불일치, 저장 중 이미 보이는 복구 버튼을 완료 신호로 잘못 기다린 QA 오류, 동적 DOM의 nth locator 변동을 발견했다. 최초 실패 결과를 보존하고 role/저장 상태/고정 element handle 검사로 고쳤다.
- 실제 UI 결함: Alpha shell의 광역 버튼 background가 기존 primary의 흰 글자와 충돌해 ‘추가’가 보이지 않았다. shell 전용으로 색/배경을 한정하고 공통 48px만 상속하도록 고쳤다. 실제 대비 측정과 CSS 경계 회귀를 추가했다.
- 캡처 직접 검토에서 사이드바의 새 문서 ‘만들기’ 버튼이 flex 축소로 잘리는 문제를 추가 발견했다. alpha에만 축소 방지를 적용하고 버튼 글자 범위 검사·CSS 회귀를 추가했다. 최종 build/브라우저에서 글자 잘림0을 확인했다. 검사 도구의 `__name` transpile 오류는 앱 오류와 구분하며 중첩 함수 없는 브라우저 평가식으로 고쳤다.
- API/브라우저 live runner를 잘못 동시에 시작한 한 실행에서 계정 revision 충돌이 났다. cleanup CAS도 이를 거절해 합성 문서1개를 남겼다. 정확한 revision39·문서 제목/원문·position·나머지 empty 필드를 대조한 보상 명령으로 정리, revision40/space empty/source 동일을 확인했다. `output/alpha-m3/concurrent-run-fixture-cleanup.json`. 타인/사용자 자료나 Auth 계정을 삭제하지 않았다. 재발 방지용 두 runner 공통 exclusive lock을 추가했다.
- 초기 통합1880 실행은1879PASS/1FAIL이었다. 기존 Provenance 문자열 검사가 capability 조건을 수용하지 못한 테스트 문제였다. 동일 creator 경로의 저장 전 gate와 false 차단을 실제 callback 검사로 바꿨고 관련11/11을 확인했다. 최초 build는 숨김 조건 안의 중복 saving 비교 타입 오류로 실패했고 중복 비교를 제거했다. 이후 build·통합·브라우저 최종 재검사를 마쳤으며 결과는 다음 표와 같다.
- npm2255/2255 PASS·skip0 (`npm-test-2026-09-21T09-27-43-667Z.json`). 최초 같은2255PASS는 검사 중 새 테스트파일3개가 생겨 recorder가 검증 무효(exit2)로 처리했으며, 변경0인 재실행을 기준으로 삼는다.

### 최종 자동 검사 — 2026-09-21

숫자는 실행별로 적는다. 하위 검사와 통합 회귀가 겹치므로 합산해서 고유 테스트 수로 표현하지 않는다. `output/`의 원본 JSON·캡처는 Git에 싣지 않는 로컬 전용 근거다.

| 검사 | 실제 결과 | 로컬 근거 |
| --- | --- | --- |
| `npm test` | 2,255/2,255 PASS, skip/cancel0, 실행 중 소스 변경0 | `output/integrated-product-poc/npm-test-2026-09-21T10-10-25-316Z.json` |
| 통합 PoC 회귀 | 196파일, 1,894/1,894 PASS, skip/cancel0, 실행 중 소스 변경0 | `output/integrated-product-poc/new-tests-2026-09-21T10-02-34-124Z.json` |
| 표적 TypeScript | 431진입점·466소스, 진단0, 실행 중 소스 변경0 | `output/integrated-product-poc/targeted-types.json` |
| production build | PASS, 실행 중 소스 변경0; build `VMb3jXxAsctG0ktBNJFSa` | `output/integrated-product-poc/build-2026-09-21T10-02-12-051Z.json` |
| `security:audit` | 취약점0 | `output/integrated-product-poc/audit-2026-09-21T09-51-33-026Z.json` |
| 문서·diff 검사 | docs4/4 PASS, `git diff --check` PASS | `output/integrated-product-poc/docs-latest.json` |
| 인증 브라우저 회귀 | 30/30 PASS; 합성 Auth/REST, 메일/실제 비밀번호 변경 없음 | `output/playwright/alpha-m2/results.json` |
| 실제 개발 API | 38/38 PASS; A 세션3·B세션1, 전용 자료 복원/세션 logout 확인 | `output/alpha-m3/api-2026-09-21T09-58-48-871Z.json` |
| 실제 개발계 브라우저 | 107/107 확인 PASS; 3개 독립 browser context·실제 Auth 세션4, 테스트 세션 logout | `output/playwright/alpha-m3-live/2026-09-21T10-04-43-895Z/results.json` |
| 개발 DB 사후 조회 | 27/27 불변/권한 검사 PASS, 읽기 전용·쓰기는 없음 | `output/alpha-m3/final-database-evidence-2026-09-21T10-08-45Z.json` |
| 마지막 표시/DB 정적 표적 | CSS3 + migration9 = 12/12 PASS | `node --import tsx --test components/flow/integrated-poc/AlphaWorkspace.layout.test.ts scripts/alpha/m3-schema.test.ts` |
| 브라우저 bundle 비밀 경계 | static68파일, 서명 키 bytes 노출0·서명 환경변수 언급0 | `output/alpha-m3/build-boundary.json` |

plain 전체 `tsc` 진단231은 이번 표적 strict PASS와 다른 검사다. 소유 밖 파일까지 모두 type-clean이라고 주장하지 않는다. 공식 production build의 검사와 전체 standalone tsc도 같은 수치로 합치지 않는다.

최종 npm·통합·build·표적 strict 기록의466소스를 현재 파일 SHA-256과 다시 대조해 불일치0을 확인했다. 이 recorder의 범위는 integrated-poc 모델/화면과 두 route seam이며, 저장소의 모든 파일이나 의존성 bytes를 포함한다고 주장하지 않는다. 서버 route·DB migration·브라우저 runner의 별도 hash는 각 경계/실행 근거에 있다.

직전 통합1,893/1,893 성공 후 ‘만들기’ 표시 회귀1개를 추가해 위1,894개를 다시 실행했다. 허용 동시성이 아닌4로 실행한 명령은 검사 시작 전 거절됐고, 설정을 우회하지 않고 지원값2로 실행했다. 최종 전체 E2E `npm run test:e2e`는 이번 M3에서 실행하지 않았다. 영향 범위의 인증30과 실제 M3 브라우저107, 기존 모델/컴포넌트 회귀1,894로 검증했으며 과거760개 CI 결과를 재실행으로 세지 않는다.

### 시뮬레이션·실제 개발계 시나리오별 판정

| 시나리오 | 결과 | 증거 범위 / 제외 |
| --- | --- | --- |
| 네 origin·Map·반복/누적의 개인 변경 | PASS | full-domain 합성 fixture를 HTTP port/fake repository로 왕복; 실제 사용자 자료 이관·Map live UI 전체는 미실행 |
| 새 문서→빈 원문 예시→작성→두 번째 클라이언트 열기 | PASS | 실제 개발 Auth/API/UI, 저장 raw 정확 일치·B에 노출 없음 |
| 폴더 생성·문서 이동 / QuickItem 생성 | PASS | 실제 서버 판본과 folderId·task/date 비교 |
| 오늘 완료→다시 열기 | PASS | 실제 DB 완료값·동일 항목 UI 비교; 원본 내용 불변 |
| 메뉴·Alt+위·drag·길게 누르기 순서 이동 | PASS | 각 경로 후 동일 execution order, 각 Undo로 원위치. 길게 누르기는 합성 pointer 이벤트이며 실제 터치 기기 아님 |
| 날짜 미정 이동→Undo→Redo / 주·월·미정 | PASS | 실제 date 값 복원/재적용, 동일 계정 기간 UI 연결 |
| 같은 위치·Escape·pointer cancel | PASS | 실제 revision 증가0. 전송 전 취소만 0건이며 결과 미상 요청은 취소 처리하지 않음 |
| 응답 유실→동일 요청 조회·재시도 | PASS | 서버 commit 뒤 응답만 끊음. 1회 변경 유지, 거짓 실패/중복 변경 없음 |
| 같은 revision 동시 변경 / B·anonymous·직접 REST 위조 | PASS | 실제 API 경합1성공/1충돌, 타인 영수증 비노출, 직접 수정/unsigned RPC/anonymous 거절 |
| 충돌 원문 비교→입력 보관 후 최신 열기→reload | PASS | 서버 덮어쓰기0, 원문 bytes 보존; 다른 문서 작성 뒤에도 보관본 유지 |
| 통신 실패→재접속 / 손상 복구 payload | PASS | 전송 차단 시 revision 증가0, 명시 재시도 후 정확 원문 저장; 손상 recovery는 편집 차단·서버 변경0 |
| TXT 미리보기·실제 파일 / A→B 전환 | PASS | 파일 bytes=문서 원문, 출력으로 서버 변경0; B에 A 문서·보관 원문 노출0 |
| 종료 복원·운영 경계 | PASS | 테스트 전 개인 space/source 동일, B 전체 account 동일; 전용 prefix 밖 저장 호출0·합성 운영 bytes 동일 |

실제 브라우저 최종 결과의107개는 위 시나리오 내부의 판본/화면/정리 확인을 포함한 assertion 수다. 107개의 서로 다른 제품 기능이나 관찰 사용자가 아니다. 의도적 통신 실패 console2건, 예상 밖 console0·page error0이다.

### 브라우저 화면별 평가

빈 공간·문서·오늘·주간·월간·날짜 미정·충돌의7상태를 아래5크기로 검사했다. 35조합에서 가로 넘침0, 스크롤 후 핵심 행동 hit-test 실패0, 활성 텍스트 버튼 대비4.5 미만0이다. 전체 페이지 모든 글자의 WCAG 적합성 인증은 아니다. 최종 캡처의 자홍색 막대는 계정 이메일을 가린 테스트 마스크이며 앱 화면의 색상이 아니다.

| 크기 | 판정과 직접 검토 내용 |
| --- | --- |
| 390×844 | PASS. 문서/폴더가 접혀 본문으로 진입하며 긴 문서명은 줄바꿈. 문서·충돌 캡처 확인 |
| 375×812 | PASS. 기간 탭과 상단 행동은 다음 줄로 흐르고 빠른 할 일 입력/추가 접근 가능. 오늘 캡처 확인 |
| 844×390 | PASS. 세로 스크롤로 충돌 원문·복구·편집기에 접근 가능. 충돌 캡처 확인. 화면 한 장에 모두 보이는 것은 아님 |
| 1024×768 | PASS. 사이드바 ‘만들기’ 글자 잘림 수정 후 확인. 월간 캡처 확인 |
| 1440×900 | PASS. 개인 문서 목록과 기간 내용 분리, 날짜 입력·순서 행동 접근 가능. 주간 캡처 확인 |

FLOW UX 검토 결과: 개인 실행 목적·첫 작성/완료/서버 확인 경로를 유지했다. 미연결 제작/공개/탐색 버튼을 alpha에서 숨겨 잘못된 목적지로 가지 않도록 했다. 기존 PoC의 해당 메뉴는 그대로다. 중요한 데이터 유일본 투입 금지, 충돌 원문과 복구 행동은 안전상 남겼다.

낮은 평가 항목은 **인지부하3/5, 조작성3/5**다. 충돌 시 서버/내 원문 비교, 보관 입력, 편집기 실패 안내가 길게 이어지고 모바일 상단 저장 상태도 공간을 차지한다. 다음 사용성 검토에서는 같은 의미의 복구 안내를 합치되 보관본/현재 입력의 차이와 명시 복구 행동은 잃지 않아야 한다. 스크린리더/OS IME/실제 touch를 검사하지 않았으므로 접근성 완성이나 사용자 검증으로 올리지 않는다. M3의 저장 안전성 통과와 전반적 UX 완성도는 별개다.

### 기존 데이터 불변 증거

- 최종 실제 브라우저는 처음 주입한 합성 `flow:m3-operating-fixture` bytes와 최초값을 대조했다. 계정 전환과 reload를 지나도 누적되는 계측에서 prefix 밖 setItem/removeItem0·clear0이다. 확인4회 모두 동일했다. 이는 테스트 browser context의 fixture 증거이며 사용자의 기존 Chrome 전체 운영 자료를 읽어 전수 비교한 결과가 아니다.
- 실제 API/UI runner는 자기 테스트 revision을 확인한 뒤 개인 변경만 보상했다. 개인 space/source가 실행 전과 동일하고 B account도 동일함을 확인했다. 개발 DB의 revision과 비공개 receipt는 증가한 채 보존하므로 DB 전체가 byte-for-byte 불변이라고 쓰지 않는다.
- 19:08:45 KST 읽기 전용 사후 조회27/27 PASS: 계정2개의 space/source와 revision 제외 envelope가 빈 factory와 동일, revision/영수증112/112와0/0, SQL fixture·실패 trigger·orphan 영수증·M3 전용 테스트 세션·Storage 파일0. 09:18:55 UTC의 영수증9개 이후103개가 늘었으며 테스트/정리 거래를 삭제하지 않은 정상 이력이다. 사용자 기존 세션은 이 사후 점검에서 조회/해제하지 않았다.
- `app/my`, `lib/flow/storage.ts`, `lib/flow/personal-workspace-poc-storage.ts` diff0. 기본 `/my` gate와 운영 writer를 교체하지 않았다. 원래 `flow-mvp` 수정/정리/stage0, 운영 Supabase 조회/쓰기0, 실제 기존 자료 import0이다.

## 사용과 다음 단계

이 PC에서 `http://localhost:3104/alpha`를 열고 기존 개발 테스트 계정으로 로그인한다. ‘문서·폴더 열기’→문서 만들기 또는 오늘→빠른 할 일 추가 후 **서버 저장 확인**을 확인한다. 같은 계정의 다른 브라우저는 ‘서버에서 다시 확인’ 또는 자동 재조회로 읽을 수 있다. 충돌하면 보관한 입력을 확인하고 최신 내용 열기/명시 복구를 선택한다.

서버 종료 후에는 이 worktree에서 `node --import tsx scripts/alpha/dev.ts --start`로 같은 검증 빌드를 연다. `.tmp/alpha-development.json`과 `.tmp/alpha-m3-server.json`은 ignored 로컬 설정이며 채팅·Git·브라우저에 노출하지 않는다. 새 환경에서 서명 키를 임의 재생성하면 현재 DB 키와 맞지 않아 쓰기가 차단된다. 키 provisioning/회전은 관리자 절차이며 build/CI에서 실행하지 않는다.

다음은 **M4 제작 작업공간의 실제 계정 저장 연결**이다. 개발2의 native 원문/틀/속성·pending/recovery·명시 저장판본·개인 인계를 잇되, M3 개인 입력 자동 저장과 제작 확정의 경계를 합치지 않는다. 공개/커뮤니티는 M5, 기존 자료 귀속·전체 백업/이관/복원은 M6, 실제 기기/관찰 검증과 승인된 배포는 M7로 남는다. Google/일반 사용자 SMTP·남용 방지와 유료 비밀번호 보호도 서비스 공개 전 별도 준비다.

Security Advisor는 private secret/receipt 테이블의 RLS·무권한/무정책에 관한 의도적 INFO2와 기존 유출 비밀번호 보호 WARN1이다. 무정책 테이블에 의미 없는 정책을 만들어 경고만 없애지 않는다. [RLS no-policy 설명](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [유출 비밀번호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Performance Advisor0. 비용 정책을 바꾸지 않았다.

### 변경 파일

- 서버/계약: `app/api/alpha/account/route.ts`, `lib/flow/integrated-poc/alpha-server/*`, `alpha-sync/*`, `alpha-ui-recovery*`.
- 화면: `AlphaWorkspace*`, `AlphaConflictReview*`, `AlphaAuthPanel.tsx`, `ProgramSpace.tsx`, `ProgramLegacyWorkspace.tsx`, `document-action.ts`, capability/Provenance 회귀.
- DB/검사: M3 migrations `20260921090702`·`20260921090850`, `scripts/alpha/m3-*`, `scripts/alpha/dev.ts`, M2 인증 browser fixture/기대값 이관.
- 정본 문서: 이 기록과 alpha-transition/current-checkpoint, STATUS/PROJECT_CONTROL/ROADMAP/SERVICE_STRUCTURE.

M1·M2의 같은 세션 미커밋 파일은 기존 변경이며 이번 신규 M3 변경으로 세지 않는다. 원래 `flow-mvp`의 미소유 파일과 운영 `/my` 구현은 수정하지 않는다.

## 발행 상태

| 항목 | M3 결과 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR | 미실행 |
| merge | 미실행, 이전 PR #203 이력과 별개 |
| Preview | 미실행 |
| Production | 미실행, 운영 DB/설정 쓰기0 |
| 실제 Android Chrome | 미실행 |
| 실제 iOS Safari | 미실행 |
| 실제 OS IME / 보조기술 | 미실행 |
| 관찰 사용자 | 0명 |

남은 결함/결정은 충돌 화면의 긴 안내와 복구 동선 정리, 전체 standalone TypeScript 진단, inherited Auth Advisor WARN1, D07 최종 revision/Undo/오프라인 정책, M4–M7 구현·검증이다. 현재 개발계 저장 시나리오의 알려진 차단 결함은 없지만, 백업·실기기·운영 준비가 끝나기 전 중요한 데이터 유일본을 맡기는 상시 서비스로 판정하지 않는다.
