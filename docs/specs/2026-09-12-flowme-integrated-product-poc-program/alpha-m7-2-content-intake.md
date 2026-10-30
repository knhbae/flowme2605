# M7-2 기존 콘텐츠 원본과 이관 경로 대조

2026-09-23. [M7-2 원장](alpha-m7-2-personal-trial.md)의 T01/T03 콘텐츠 전용 반입 기록이다. 아래 과거 조사는 당시 결과로 남기며, 현재 구현과 실제 적용 결과를 구분한다. 별도의 제품 정책이나 새 전체 로드맵이 아니다.

범위 정정: 이 문서의 **2개 반입 완료는 전체 이관 완료가 아니다**. 사용자의 후속 확인과 진행 승인에 따라 [전체 기존 콘텐츠 반입 원장](alpha-m7-2-full-catalog.md)을 이어서 수행한다. 전체 모집단은 고유 Flow177·Map26이며, runtime156은 보관 제외21개를 뺀 부분집합이다. 아래의 일괄 반입 미승인·2개 제한 문구는 후속 승인 이전 이력으로 읽는다.

## 현재 선택 — 이전 PoC의 Flow 콘텐츠만 가져오기

사용자: “이전 poc에 있던게 나음.” 이후 **“음. flow 컨텐츠를 가져오면 됨. 사용한 흔적이 아니라..”**로 범위를 명확히 했다. 앞선 개인공간 전체 이관 해석을 철회한다. 대상은 이전 PoC에 있던 Flow 콘텐츠이며, 과거 개인 기록·사용 이력의 복원이 아니다. 이 선택은 이번 M7-2 반입 범위이고 제품 전체의 백업/복원 기능을 없애는 결정이 아니다.

| 구분 | 이번 반입 기준 |
| --- | --- |
| 보존할 콘텐츠 | 제목·원문·설명, Item/Step/Flow 구조와 순서, 콘텐츠 자체의 일정/반복 규칙, 출처·원저자·주의·검토 상태. 원본 identity와 새 관리 사본의 대응을 남김 |
| 가져오지 않을 사용 흔적 | 완료·진행률·개인 메모, 사용자가 정한 기준일/실행일·날짜 이동·폴더·실행 순서, Undo·사용 로그·영수증, 조회/사용/복사 수와 가상 댓글·반응·제안 |
| 대상 계정 | 002는 콘텐츠 관리 사본을 받음. 원저자로 소급 표시하지 않음. 001은 새 개인 사용으로 시작하며 예전 실행 상태를 주입하지 않음 |
| 공개 상태 | 옛 로컬 시뮬레이션의 공개 표시는 새 서비스 발행 승인이 아님. 콘텐츠 반입과 실제 공개 발행을 분리 |
| 원본 보관 | 원래 코드·PoC 저장본·계정 백업은 수정/삭제하지 않음. 과거 자료를 백업에 남기는 것과 새 계정의 활성 자료로 가져오는 것을 구분 |

아래 누적 QA 저장본 전체는 **반입 대상이 아니다**. 24문서/11초안 확인 요청도 더 이상 필요하지 않다. 전체 개인공간 이관의 `unmapped-reference`는 이번 콘텐츠 반입의 대기 사유로 사용하지 않는다.

### 콘텐츠와 자동 테스트 자료의 구분

| 확인한 묶음 | 내용 | 이번 취급 |
| --- | --- | --- |
| PoC catalog 원본 2개 | 이사 D-30 준비 Flow 24항목, 치앙마이 혼자 여행 준비물 체크 Flow 6항목 | 기존 콘텐츠로 대조. 저장소 원본을 읽는 것은 새 내용을 만들어 넣는 작업이 아님 |
| 누적 QA 저장본의 나머지 Flow 11개 | 작성 틀·복구·선택 공개·학습/발표 등을 검증하며 만든 자료, 보관된 Flow 1개 포함 | 사용자 작성 콘텐츠로 자동 간주하지 않고 테스트 자료로 분리. 사용 이력과 함께 무조건 반입하지 않음 |
| 저장소 전체 카탈로그 | 아래의 Bundle156 및 별도 Map 조사 | PoC에 연결된 범위와 구별. 전체 일괄 반입/소유권 변경으로 확대하지 않으며 최종 반입 수를 2개 또는 156개라고 미리 확정하지 않음 |

근거는 [catalog 목록과 adapter](../../../lib/flow/integrated-poc/catalog.ts)의 고정 slug 2개 및 아래 저장본의 `data.public.flows/versions` 읽기다. Flow13·판본29를 사용자 콘텐츠13건 또는 사용 검증29건으로 세지 않는다. 원문 URL의 최신 사실 검증은 이번 조사에서 실행하지 않았다.

## 이전 조사 이력 — 전체 저장본은 반입하지 않음

| 항목 | 9/23 실제 확인 |
| --- | --- |
| 발견 위치 | 기존 `flow-personal-workspace-v4-1-poc-20260901` worktree의 `output/playwright/integrated-program/final-core-creator-2026-09-20T07-26-54-509Z.json`, `result.after.wire` |
| 성격 | `program-ordinary-source-recovered` 세션의 9/20 누적 QA 저장본. 실제 사용자의 일상 자료로 확인된 것은 아님 |
| 원본 무결성 | 현재 decoder/validator 통과, revision493. [9/20 최종 평가](final-evaluation-2026-09-20.md)의 최종 SHA와 동일 |
| ‘나’ 공간 | 일반 문서18·Flow 문서6·제작 초안11. 여행·이사·주간 운동·결혼 준비·시험 준비 등 검증용 원문 포함 |
| 다른 두 actor | `creator-minji`, `participant-jihun`의 개인 문서/제작초안은 각각0. 가상 사용자이며 계정 귀속 근거가 아님 |
| 공개 시뮬레이션 | Flow13·판본29·게시물5·댓글3·제안11. 새 서비스 공개물로 가져오지 않음 |
| 현재 계정으로의 순수 미리보기 | `local-user` → 002의 직전 시작 백업 기준 **`unmapped-reference`로 거절**. 새 서버에 없는 공개 판본 사본6개·발행 연결11개 존재 |
| 원본 사본 | Git 밖 `D:\FlowMe-Backups\trial-creator\candidate-previous-poc-r493-20260923.program.json`, 1,256,241bytes. 원문 wire를 그대로 저장하고 재읽기 hash 대조. 원래 QA 파일도 전후 동일 |
| 이번 전송/쓰기 | 순수 함수 검사와 로컬 파일 보관만 수행. DB/Auth/Storage API·계정 적용·공개 발행0. 브라우저 저장소 조작0 |

wire SHA-256: `cb3fc610b2208091e36f73db1b7972a08cde4c2864f18a6acec3b7cc28f78c38`. 원래 증거 JSON 전체 SHA-256: `5ceec30f88982ece45873fdd4085b0d6802cb977830a261516b05460c8396dfd`. 후보 파일 옆 `candidate-previous-poc-r493-20260923-inspection.json`에 개수·해시·거절 사유를 보관했다. 후보 파일은 현재 사용자·SYSTEM의 ACL을 상속했으며 암호화·독립 2차 사본·서버 업로드는 아니다.

두 가상 actor의 순수 미리보기는 빈 자료라 `already-applied`를 반환했다. 이를 실제 가져오기 성공2건으로 집계하지 않는다. 이번 검사는 이전 계정 백업을 입력으로 한 **로컬 검사**이며 최신 서버 권한/현재 상태 미리보기와 구별한다.

### 이 조사의 한계

현재 열려 있던 Chrome의 옛 탭은 실행 앱이 아닌 HTML 검증 보고서였다. 해당 보고서 접근은 브라우저 보안 정책으로 거절됐고 다른 도구/브라우저/URL로 우회하지 않았다. 현재 알파 탭은 별도 로그인 화면이며 이 조사에서 새로고침·로그아웃·계정 전환을 하지 않았다. 과거3641 앱 listener도 현재 없다. 보고서, 자동 QA 저장본, 실제 사용하던 브라우저 자료를 서로 같은 것으로 취급하지 않는다.

위 거절 결과는 전체 개인공간 복원 경계가 작동했다는 근거일 뿐, 콘텐츠만 가져올 수 없다는 뜻이 아니다. 원본 사본은 조사 이력으로 보존하되 계정 복원 입력으로 사용하지 않는다. 현재 필요한 연결은 아래의 **콘텐츠 전용 관리 사본**이다.

## 무엇을 ‘기존 콘텐츠’로 볼 것인가

| 원본 | 확인한 현재 상태 | 계정으로 연결할 때의 의미 |
| --- | --- | --- |
| 저장소에서 관리하던 FlowBundle | seed153, source-backed Bundle43/Map26. runtime 제외·slug 병합 후 Bundle156 | 저장소 큐레이션 원본이다. 사용자가 직접 쓴 글이나 002가 원저자라는 증거는 아님 |
| 통합 PoC 공개 예시 | 이사 D-30·치앙마이 준비물 2개만 catalog에 투영 | 가상 제작자 `creator-minji`를 쓰는 로컬 시뮬레이션. 실제 계정 소유 공개물로 자동 승격하지 않음 |
| 이전 브라우저의 개인공간·저장 이력 | M6 reader/import 경로 존재. 위 누적 QA 파일은 검사했지만 실제 사용자의 일상 원본으로 확인하지 않음 | 이번 반입에서 제외. 별도로 보존한 백업을 지우거나 전체 복원 기능을 제거하지 않음 |

156개는 코드상 `published` 값을 가진 Bundle 수이며 실제 알파 공개 저장소의 게시 수나 002 계정 소유 수가 아니다. 일반 노출 분류133개는 representative4/source_review63/migration_candidate64/legacy_accessible2로 구성되고 미리보기23개가 별도다.

출처 신선도 분류는 다른 축이다. 2026-09-23 기준 current129/preview_or_hidden23/review_due4이며 9/20 기록의 current133을 현재값으로 쓰지 않는다. 검토 기한이 지난 4개는 `source-backed-moving-d30`, `source-backed-middle-school-math-1`, `source-backed-baby-health-checkups`, `source-backed-baby-vaccination-schedule`이다(기록 확인일2026-06-23, 92일). 이는 코드의 날짜 기반 판정이며 이번에 원문 URL을 재검토했다는 뜻이 아니다. [9/20 출처 감사](../../content-audit/2026-09-20-flow-source-freshness-preservation/README.md)의 보류·과거 판정은 덮어쓰지 않았다.

근거: [seed](../../../lib/flow/seed-flows.ts), [source-backed 집계](../../../lib/flow/source-backed-my-flow.ts), [노출 정책](../../../lib/flow/runtime-content-policy.ts), [정본 registry](../../../lib/flow/canonical-flow-registry.ts).

## 처음 확인할 수 있는 저장소 원본 두 개

| 원본 | 보존할 구조 | 출처 기록 | 현재 검토 상태 |
| --- | --- | --- | --- |
| `moving-d30-basic` · 이사 D-30 준비 Flow | `flow-moving`, 6구간·24항목, 원문696자 | AJD 콘텐츠23363, exact, 확인일2026-07-11 | 정본 registry 24항목 판본. 5항목 변환본과 합치면 안 됨 |
| `chiangmai-solo-trip-packing` · 치앙마이 혼자 여행 준비물 체크 Flow | 3구간·6항목, 원문190자 | Naver `mat_zip_diary/223137520451`, exact, 확인일2026-09-07 | `needs_review` 경고 보존. 최신 정보로 재인증하지 않음 |

두 원본의 기존 소유 표시는 `user-flow-curation`/FLOW 큐레이션팀이다. 002는 관리 사본을 편집하는 계정으로 다루며 원저자 표시를 소급 변경하지 않는다. 원문·경고·일정 규칙·기준일 유형·상세·출처 URL을 보존하되 개인이 정한 실행 기준일은 가져오지 않는다. 기존 PoC catalog와 같은 원본임을 대조하는 대상 두 건이며 전체 반입 수의 확정이나 전체 카탈로그 이관 승인은 아니다.

## 현재 구현과의 연결

| 연결 | 이미 있는 것 | 빠진 것 / 금지할 우회 |
| --- | --- | --- |
| Bundle → PoC 공개 예시 | [catalog adapter](../../../lib/flow/integrated-poc/catalog.ts)의 `coverage`가 전체 Bundle JSON·raw·item ID·출처·fingerprint를 보존 | 결과는 PublicFlow/Version이다. `ownerId`를 002로 바꾸어 공개 저장소에 넣는 것은 비공개 제작 이관이 아님 |
| 실제 CreatorDraftLibrary → 통합 제작 | [creator workspace](../../../lib/flow/integrated-poc/creator-workspace.ts)의 기존 library 계속하기 | FlowBundle 입력 경로가 아니며 local-user 제한. seed를 기존 사용자 자료인 것처럼 포장하면 안 됨 |
| 이전 개인/제작/native 저장 → 알파 개인공간 | [source reader](../../../lib/flow/integrated-poc/alpha-preservation/source.ts)와 [pure import](../../../lib/flow/integrated-poc/alpha-preservation/import.ts) | 사용 이력을 포함하는 전체 이관이므로 이번 경로에서 제외. 필드를 임의로 지워 통과시키지 않음 |
| 선택한 저장소 Bundle → 실제 계정의 비공개 관리 초안 | `catalog-content-v1` snapshot·원본 대조·편집용 native projection·서명된 creator intent·미리보기 UI 구현 | 현재 PoC catalog의 2개만 허용. 미지원 반복/기간/필드가 있으면 거절하며 임의 축약하지 않음. 실제 적용 결과는 아래 별도 기록 |

## 콘텐츠 전용 반입의 구현·검증 순서

계정·PC 백업·사용 이력 제외는 확정했다. 다시 전체 개인공간 이관 여부를 질문하지 않는다. 아래 순서의 구체적인 실행 결과는 다음 절에 기록한다.

1. **목록 대조:** 이전 PoC가 실제 사용한 Flow ID/판본과 저장소 원본을 연결한다. 콘텐츠, 중복 판본, 자동 테스트 자료를 구분하고 최종 대상 목록과 제외 사유를 남긴다. 사용 흔적에서 콘텐츠를 추정해 새로 만들지 않는다.
2. **콘텐츠 전용 계약:** 허용 필드를 명시한 관리 사본 입력을 정의한다. 원본 Flow/Item identity·출처와 새 계정의 관리 사본 identity를 분리한다. 개인공간 전체 snapshot을 활성 payload로 전달하지 않는다. 제작 메모/콘텐츠 설명과 개인 실행 메모를 구분한다.
3. **변환과 대조:** 원문·항목 수/순서·구간·상대/반복 일정·상세·출처·경고를 일대일 대조한다. 콘텐츠의 고정 날짜는 보존하고 개인이 옮긴 실행일은 제외한다. 지원하지 않는 의미는 조용히 생략하지 말고 미리보기에서 보류한다. 단순 raw 붙여넣기를 구조 보존 완료로 세지 않는다.
4. **적용 경로:** 순수 변환/중복 검사 → 서버의 계정·원본 검증 → 미리보기/저장 순서로 연결한다. 002에는 비공개 관리 사본만 추가하고 001·기존 seed·운영 저장소·공유 저장소는 변경하지 않는다. 공개 발행은 별도 행동이다.
5. **검증:** 기존 자동 QA fixture로 원문/구조 보존, 사용 흔적 제외, 잘못된 계정·손상·취소 변경0, 재요청 중복0, 동시 변경 거절을 확인한다. 두 실사용 계정은 fixture 주입/초기화 대상으로 쓰지 않는다. 선택 콘텐츠 적용 뒤에는 전후 백업·실제 수량/내용·새로고침 복구를 대조한다.

앞선 범위 정정 턴에서는 앱 코드·DB·계정 데이터 변경을 하지 않았다. 당시 source/import 테스트24/24는 기존 **전체 이관 경계**의 회귀 검사다(`output/alpha-m7/m72-legacy-source-20260923-01/import-tests.tap`, 로컬 전용 근거). 이번 콘텐츠 전용 기능의 통과 근거로 재사용하지 않는다. 자동 검사와 실제 기기·사용자 기록은 [M7-2](alpha-m7-2-personal-trial.md)에 분리한다.

## 9/23 콘텐츠 전용 구현

- [콘텐츠 계약·변환](../../../lib/flow/integrated-poc/catalog-content.ts): `flowme-catalog-content-v1`에 원문과 허용된 Flow/Section/Item/상세·출처 정보를 보관한다. 사용/복사 수·공개 상태·개인 실행 필드는 제외한다. 30항목의 원본 ID와 새 편집 Item ID, 9구간의 원본 ID와 새 Step ID를 결정적으로 대응한다.
- [반입 transition](../../../lib/flow/integrated-poc/catalog-content-import.ts): `catalog-content` native provenance는 기존 D2 saved version이나 legacy recovery와 구별한다. 기존 작성 중 working은 보존한다. 같은 콘텐츠는 no-op, 다른 판본·보관된 사본·ID 충돌은 거절한다. 상대 D일정은 기준일을 임의로 정하지 않는다.
- [화면](../../../components/flow/integrated-poc/AlphaCatalogContentImport.tsx): `/alpha` → 내 활동 → Flow 만들기 → 이전 PoC의 Flow 콘텐츠 가져오기. 내용 확인·원문·원래 출처·주의 → 비공개 제작 사본 저장. 취소/Escape는 mutation0. 보관 원문과 편집용 원문을 구별하며 공개 발행·개인 일정 생성은 자동 실행하지 않는다.
- 서버는 `catalog-content-import`의 slug/version locator만 받고 실제 내용을 다시 생성한다. 클라이언트의 contentJson/owner/after-state를 받지 않는다. 기존 계정별 HMAC·CAS·영수증·Undo 경로를 유지하며 변경 필드는 `creatorWorkspace`만 허용한다.
- [추가 migration](../../../supabase/migrations/20260923052407_flowme_alpha_m72_catalog_content.sql)은 DEV `wkmzcxpnojobxrgebapw`의 private validator만 교체했다. 사용자 행·운영계·공개 저장소·접근 권한 확대 없음. 적용 후 anonymous/authenticated 직접 execute 거절 확인.

옛 worktree의 실제 seed와 현재 두 Bundle을 status/usage_count/copy_count 제외 후 대조해 **내용 전체 동일**을 확인했다. 이사24항목/6구간, 치앙마이6항목/3구간이다. 저장소 전체156개나 누적 QA Flow11개를 반입했다는 뜻이 아니다.

### 보존 계약과 한계

원래 Flow의 저자·출처·검토 날짜/경고는 그대로 남긴다. 재검증하거나 002를 원저자로 바꾸지 않는다. 편집용 텍스트에는 항목·상대 일정·설명·완료 기준·주의·링크를 투영한다. 섹션 설명·risk·source fragment ID 등 전체 원본 메타데이터는 immutable content snapshot에 보관하며 모두를 직접 편집하는 UI를 추가한 것은 아니다.

기존 저장본은 현재 seed와 별도로 embedded snapshot에서 읽는다. 향후 parser/adapter 변경은 `flowme-catalog-content-v1` 판독 의미를 유지해야 한다. 의미 변경 시 v2 reader/명시 migration과 이전 백업 회귀 검사를 먼저 추가한다. 비보안 fingerprint만으로 원본을 신뢰하지 않으며 전체 source/document와 서버가 재생성한 결과를 대조한다.

Supabase 보안 점검은 기존 private/lab 테이블의 RLS 무정책 INFO29건과 유출 비밀번호 보호 비활성 WARN1건을 보고했다. 이번 migration은 테이블이나 정책을 추가하지 않았다. Auth 경고를 해결했다고 표시하지 않는다. [Supabase 비밀번호 보안 안내](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## 실제 적용 결과 — 콘텐츠 2개 반입 완료

002의 현재 Auth identity를 다시 확인하고 반입 직전 백업/서버 미리보기를 통과한 뒤, 실제 `/alpha` UI에서 이사24항목·치앙마이6항목을 각각 비공개 제작 초안으로 저장했다. 총 **2초안·30항목·9구간**이다. 과거 개인공간 snapshot이나 사용자 사용 기록은 전달하지 않았다. 001에는 콘텐츠를 넣지 않았다. 두 번째 새 브라우저 세션에서 현재 계정을 다시 읽어 확인했다.

| 시나리오 | 결과 |
| --- | --- |
| 내용 확인·취소·Escape | 서버 mutation0, 계정의 canonical JSON 동일 |
| 두 콘텐츠 명시 저장 | 성공2건. 공개 Flow/개인 실행 문서/이전 사용자 흔적 생성0 |
| 같은 콘텐츠 재요청 | 실제 서버 두 건 모두 `no-change`, 전후 계정 JSON 동일·중복0 |
| 원문·구간·항목·상대 일정·출처 | 원본 snapshot 전체 대조 일치. 내용만 저장하고 실행 기준일을 지정하지 않음 |
| 새로고침·새 세션 | 초안2개 복원. 각 초안 선택이 서버에 반영된 뒤 해당 원문 전체 문자열이 화면에 표시됨을 확인 |
| 원래 계정·공유 경계 | 아래 hash 대조 통과. 새 쓰기는 반입2건과 제작 작업본 선택2건뿐 |
| 손상·위조·미지원·stale·저장 거절 | 모델/dispatch/UI 테스트로 거절과 mutation0 확인. 실제 사용자 자료를 손상시키는 시험은 하지 않음 |

브라우저 근거는 로컬 전용 `output/playwright/alpha-m72-content/2026-09-23T05-45-43-622Z/`(반입·미리보기5화면), `2026-09-23T05-48-53-442Z/`(강화 재검사 **21/21**)이다. 앞선 `05-39-15-100Z` 실행은 로컬 서버가 옛 빌드여서 미리보기 진입 timeout, 쓰기0이었다. 최신 production build를 로컬에 다시 띄운 뒤 재검사했다. 이는 배포가 아니다. 최초 반입 실행의 원문 검사는 단순 가시성 검사였으므로, 최종 재검사에서 서버 선택 ID와 원문 전체 문자열 대조로 강화했다.

### 자동 검사

| 실행 | 실제 결과 | 로컬 전용 근거/범위 |
| --- | --- | --- |
| 콘텐츠·dispatch·UI·SQL 표적 | **36/36**, 실패/skip/cancel0 | `catalog-content.test.ts`, `catalog-content-import.test.ts`, `alpha-creator/dispatch.test.ts`, `AlphaCatalogContentImport.test.tsx`, `scripts/alpha/m72-schema.test.ts` |
| 전체 통합 Program | **2156/2156**, 223파일, 실패/skip/cancel0 | `output/integrated-product-poc/new-tests-2026-09-23T05-39-33-621Z.json`; concurrency2/heap256MB, source 변경0 |
| `npm test` | **2255/2255**, 실패/skip/cancel0 | `npm-test-2026-09-23T05-39-44-737Z.json`; source 변경0 |
| 통합 TypeScript | entry490, diagnostics0 | `targeted-types.json`; 별도 실계정 반입 runner의 strict 검사도 통과 |
| production build | PASS | `build-2026-09-23T05-41-37-619Z.json`; source 변경0 |
| DEV SQL 순수 validator | 허용 locator/위조 source 차단/개인 필드 차단/unknown slug 차단 **4/4** | 변경 없는 SELECT. private validator 직접 실행 권한은 anon/authenticated 모두 false |
| 문서·변경 검사 | **4/4**, 링크6479개·`git diff --check` 통과 | `docs-2026-09-23T05-55-39-542Z.json`; 이 기록 보완 뒤 문서 재검사 |

각 테스트 집합에는 겹치는 사례가 있으므로 합산해 고유 테스트 수로 표시하지 않는다. 최초 순환 초기화 오류와 새 native union의 기존 fixture 타입 오류는 수정 후 재검사했다.

### 화면별 평가

390×844, 375×812, 844×390, 1024×768, 1440×900의 가져오기 미리보기에서 문서 가로 넘침 검사0, 원문 보기·가져오기·취소 버튼 표시를 확인했다. 실제 저장/원문 대조는 데스크톱 Chromium에서 수행했다. 콘솔 오류/page error0, 허용 prefix 밖 setItem/removeItem/clear0이었다. 버튼·키보드 Escape를 사용했으며 이 기능은 drag가 필요 없다.

좁은 두 폭에서는 **기존 상단 동기화 버튼의 과도한 줄바꿈과 오른쪽 여백/안내문 표시**를 추가 개선 대상으로 남긴다. 문서 scrollWidth 검사만으로 전체 UI 무결함을 선언하지 않는다. 새 반입 패널의 동작 검증과 전체 앱의 시각 완성도는 별개다. 실제 Android Chrome/iOS Safari 검사는 미실행이며 관찰 사용자0명이다.

### 데이터 불변 근거

로컬 전용 `output/alpha-m7/m72-content-20260923/database-boundary.json`에 DEV PostgreSQL canonical `jsonb::text` MD5 대조를 보관했다. 이것은 값 대조용이며 원본 인증용 암호학적 서명으로 사용하지 않는다.

- 001 계정 revision427 유지, 전체 계정 hash `ec238c58ca90c85af1ea22d79f4435db`와 기존 ledger427건 hash 동일.
- 002 revision70→74. creatorWorkspace와 revision을 뺀 계정 hash `e3e8ae67367dd3abe4207204d9add24a` 동일. 기존 ledger70건 hash `22a8d80510bb50f6a21dac2c3ba73eb8`도 동일하며 새 명령4건만 추가했다.
- shared social state/identity/media, preserved media, preservation archives의 전후 hash 동일. 운영 프로젝트 호출0. 운영계의 전체 자료를 직접 읽어 byte 대조했다는 뜻은 아니다.
- 브라우저는 별도 자동 검사 프로필이었다. 운영 `flow:*` 항목은 전후 빈 목록으로 동일했고 금지 storage 호출0이었다. 사용자가 열어 둔 Chrome 프로필의 저장소를 대신 검증한 것은 아니다.

### 반입 전후 백업

Git 밖 `D:\FlowMe-Backups\trial-creator\`에 파일을 보존했다. 각 파일 재읽기 검사와 같은 계정 서버 restore 미리보기(`same=true`, `canApply=false`)를 통과했으며 복원 적용은 하지 않았다.

| 의미 | 파일 | 크기 / SHA-256 |
| --- | --- | --- |
| 반입 전 r70 | `2026-09-23T05-36-27-767Z-6218dd97-before-trial.json` | 165,058bytes / `2721ed4fc9ba2dfec65ea75d611a78c9bfe842165df9686672678c9f73b47111` |
| 반입 후·원문 선택까지 r74 | `2026-09-23T05-50-28-723Z-14e65af8-before-trial.json` | 9,685,262bytes / `dae157a977759ab78c871224bafcde74f60e64316c51b1fde497c1b217e89cb8` |

도구의 파일명 suffix는 `before-trial`로 같지만 위 두 번째 파일은 **이번 반입 후** 백업이다. 파일 전체 원문은 보고서나 Git에 넣지 않는다. 별도 물리 매체 사본·암호화·복원 적용은 아직 미실행이다.

### 다음 우선순위와 발행 상태

가장 먼저 **저장 이력·백업 크기 증가**를 조사한다. 2콘텐츠와 새 명령4건만으로 백업이 약9.7MB, 복원 요청이11,046,818bytes가 됐다. 현재30MB 계약 안에서 검사/미리보기는 통과했지만 장기 축적 가능성을 입증하지 못했다. 기존 원본·영수증·Undo를 버리거나 허용 크기만 올려 통과시키지 말고, 반복 snapshot/직렬화 비용과 호환 계약을 먼저 설계·검증한다. 더 많은 콘텐츠 반입이나 유일본 축적보다 앞선 점검이다.

이번 단계는 콘텐츠 반입 완료이며 M7-2 전체 완료가 아니다. 새 일상 사용·독립 사본·명시 복원·실제 두 기기는 남는다. commit 미실행 / push 미실행 / PR 미생성 / merge 미실행 / Preview 미배포 / Production 미배포 / 실제 기기 미실행 / 관찰 사용자0명.

## 이번 변경 파일

시작 전에 있던 M1–M7 dirty/미추적 자료는 그대로 보존했고 stage하지 않았다. 아래는 이번 콘텐츠 반입 변경의 범위다.

| 묶음 | 파일 |
| --- | --- |
| 콘텐츠 계약·변환·반입·검사 | `lib/flow/integrated-poc/catalog-content.ts`, `catalog-content.test.ts`, `catalog-content-import.ts`, `catalog-content-import.test.ts` |
| 계정 명령과 DB 검증 | `lib/flow/integrated-poc/alpha-creator/contract.ts`, `dispatch.ts`, `boundary.ts`; `supabase/migrations/20260923052407_flowme_alpha_m72_catalog_content.sql` |
| 화면 연결 | `components/flow/integrated-poc/AlphaWorkspace.tsx`, `AlphaCatalogContentImport.tsx`, `AlphaCatalogContentImport.module.css`, `AlphaCatalogContentImport.test.tsx`, `CatalogContentOriginal.tsx`, `ProgramCreatorNativeContext.tsx` |
| native 원본 구분·검증 | `lib/flow/integrated-poc/native-creator-document-contract.ts`, `native-creator-document.ts`, `creator-native-context.ts` |
| 기존 native fixture 타입 보강 | `native-creator-document.test.ts`, `native-creator-absence.test.ts`, `creator-native-source-update-recurrence.test.ts`, `creator-native-source-update-subchecks.test.ts` — 같은 lib 디렉터리. legacy storageKey 명시, 검사 완화 없음 |
| 명시 DEV 실행·SQL 회귀 | `scripts/alpha/m72-content-browser.ts`, `m72-schema.test.ts`. 실계정 초기화/정리 기능 없음. 이메일/UUID는 명시 실행 인자로 받고 코드에 고정하지 않음 |
| 실행 원장·서비스 구조 | 이 문서, `alpha-m7-2-personal-trial.md`, `alpha-transition.md`, `current-checkpoint.md`, `docs/STATUS.md`, `docs/PROJECT_CONTROL.md`, `docs/ROADMAP.md`, `docs/SERVICE_STRUCTURE.md` |

화면·상태 JSON·백업의 원본 증거는 로컬 전용으로 유지한다. 이번 백업/반입 실행기는 선택 계정의 비밀번호를 로컬 파일에서 메모리로 읽었으며 원문·비밀번호·token을 로그나 보고서에 내보내지 않았다. 파일명과 hash는 검증을 위한 메타데이터다.
