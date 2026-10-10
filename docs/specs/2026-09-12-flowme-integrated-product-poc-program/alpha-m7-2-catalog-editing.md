# M7-2 자료실 → 제작 사본 → 개인 실행 연결

## 범위와 구현 순서

전체 원본 177개 보존·열람은 [전체 반입 원장](alpha-m7-2-full-catalog.md)에 유지한다. 이번 단계는 기존 2개 외에 저위험 체크리스트/상대 일정 5개를 추가한다. 개인 사용 기록·공개 권한·원본 최신성 재검증을 가져온 것으로 간주하지 않는다.

1. [x] 177개 구조·정책 대조: 현 변환기의 순수 투영 성공92, 미지원81, 투영 손실4. 기계적 성공은 실행 허용 판정이 아니다.
2. [x] 버전 계약: 기존 v1 두 원본/사본 호환 유지, 새 5개는 고정 원본 pack의 v2 locator로만 재구성. 임의 본문/수정판본/사용 기록 거절.
3. [x] 자료실 상세에서 내용 확인 → 명시 가져오기 → 제작 사본 열기. 기존 사본은 중복 생성하지 않음. 취소·Escape·실패는 성공으로 표시하지 않음.
4. [x] 생성 편집문과 원문을 구분하고 설명·방법·완료 기준·주의·출처를 대조. Flow/구간 공통 안내는 원본 구조 보기로 접근 가능하게 유지.
5. [x] 기존 제작 편집 및 개인 실행 인계(비교→선택→적용)를 재사용해 상대 일정/날짜 미정/계정 경계/원본 불변 검증. 자동 개인 일정 생성 금지.
6. [x] 개발계 SQL 허용 목록만 확장, 권한/변경 필드 경계 및 실제 계정 데이터 불변 점검. 운영계 호출·배포 없음.
7. [x] 표적·회귀·전체 테스트, production build, 5해상도 브라우저 확인 및 결과 기록.

## 이번에 연결할 원본

| 원본 slug | 항목 수 | 구조 |
| --- | ---: | --- |
| moving-d30-basic | 24 | 기존 v1 상대 일정 |
| chiangmai-solo-trip-packing | 6 | 기존 v1 체크리스트 |
| closet-organize-1day | 6 | 신규 v2 체크리스트 |
| kitchen-reset-organize | 4 | 신규 v2 체크리스트 |
| travel-packing-list | 6 | 신규 v2 체크리스트 |
| portfolio-4week | 6 | 신규 v2 상대 일정 |
| blog-youtube-start | 4 | 신규 v2 체크리스트 |

신규5개는 고정 pack에서 low risk, real/exact, runtimeExcluded=false인 명시 허용 목록이다. migration_candidate 표시 자체를 권한으로 사용하지 않는다. 기존 치앙마이의 출처 검토 필요 기록도 지우지 않는다. 보관·검토 대상, 반복/기간/날짜 창, 식단/레시피, Map 편집·실행은 이 단계에서 열지 않는다.

## 증거 원칙

실제 001·002 계정은 QA 초기화/시험 사본/임의 Undo 대상으로 쓰지 않는다. 자동 편집·실행 검증은 격리 fixture로 수행하며 실제 DB 왕복과 구별한다. 실제 계정에서는 읽기와 전후 hash만 확인한다. 모든 결과는 실행 후 아래에 추가한다.

## 결과

이번 연결 확장 단계의 구현·검증 완료. 제작 연결은 **7/177개(56 Item)**이며 원본 열람177개와 구분한다. 002 계정에는 기존 제작 사본2개만 그대로 있으며, 새5개를 자동으로 저장하지 않았다. M7-2 전체 실사용 목표 완료는 아니다.

로컬 `/alpha`에서 002 로그인 → 내 활동 → Flow 만들기 → 기존 Flow 콘텐츠 → 위 지원 원본 상세 → 제작 사본 내용 확인 → 비공개 제작 사본으로 가져오기 순서로 조작한다. 원본 열람만으로는 사본이나 개인 일정이 만들어지지 않는다.

### 177개 연결 상태

| 현재 연결 판정 | 수 | 후속 작업 |
| --- | ---: | --- |
| 제작 사본 연결 가능 | 7 | 명시 반입 후 편집·개인 실행 |
| 출처 검토 보류 | 87 | 출처·전환 요건 재검토. 자동 실행 승인 아님 |
| 보관·제외 | 21 | 원본 열람 유지. 무조건 해제하지 않음 |
| 지원 구조이나 연결 검증 전 | 32 | 원본 충실성·정책 확인 후 묶음 확대 후보 |
| 구조 미지원 | 29 | 반복·기간·날짜 창·식단 등의 별도 투영 설계 |
| 변환 손실 | 1 | wedding-d180-basic 순서/파싱 손실 해결 |

판정 우선순위는 명시 지원7 → 보관 → 출처 검토 → 구조 → 손실 → 미연결이다. 따라서 앞선 기계적 검사92/81/4와 이 표는 분모177이 같아도 분류 기준이 다르다. 예를 들어 이유식은 출처 검토와 식단 구조 지원이 모두 필요하다. Map26개는 별도이며 이번 편집·실행 지원 수에 포함하지 않는다.

### 구현 및 원본 보존

- 자료실 상세의 ‘제작 사본 내용 확인’에서 생성 편집문을 확인한 뒤 저장한다. 기존 사본은 ‘제작 사본 열기’, 보관된 사본은 복원 안내로 분기한다. 수정판본은 비교 열람만 제공한다.
- v2는 catalogVersion + sourceSlug + sourceVersionId가 고정 pack과 일치해야 한다. 기존 v1 결과 fingerprint `680ac14c`/`9e37ede2`와 replay를 유지한다. provenance 컨테이너 v1 안의 콘텐츠 계약 v1/v2를 읽으며 운영 저장 schema를 바꾼 것이 아니다.
- 공통 Flow/구간 설명을 가짜 Item이나 각 Item의 상세로 복제하지 않는다. 제작 화면과 개인 실행의 ‘가져온 Flow의 원문·출처’ → ‘가져올 때의 전체 원본 구조·안내’에서 읽는다. 현재 편집문·개인 기록과 원본을 분리한다.
- `flow-ux-review`에서 날짜 미정 체크리스트의 잘못된 기준일 안내를 찾아 수정했다. 저장 실패 뒤 같은 요청 재시도가 성공했는데 실패 안내가 남던 두 위치도 수정했다. React/Next.js 점검에서 비동기 client component, server/client 비직렬화 props, hook 조건부 실행은 추가하지 않았다.

### 개발계 DB 및 실제 계정

신규 로컬 migration `20260923072450_flowme_alpha_m72_catalog_editing.sql`은 기존 creator commit validator의 허용 slug5개만 추가한다. 계정 행·개인 기록·공개 데이터에 쓰지 않는다. DEV 적용 기록명은 `flowme_alpha_m72_catalog_editing`, 원격 도구가 기록한 version은 `20260923073125`이다. 파일명 timestamp와 원격 기록 timestamp는 다르므로 향후 CLI migration 이력 정렬 시 같은 SQL/이름으로 대조해야 한다. 이번에는 CLI 전체 push/이력 repair를 실행하지 않았다.

DEV 순수 SQL 검사13/13: 허용7, 미지원2 거절, 다른 필드 쓰기 거절, owner 주입 거절, anon/authenticated의 private validator 직접 실행권한 없음2. 서명·CAS·Undo·RLS·한도와 기존 writer를 바꾸지 않았다. [Supabase 함수 권한 기준](https://supabase.com/docs/guides/database/functions)에 따라 기존 권한을 유지했다.

실제 계정 전후 MD5(동일성 진단용, 인증 서명 아님): 001 r427 `ec238c58ca90c85af1ea22d79f4435db`, 002 r75 `6e7a1dd580d1482b0534cd8c344d81df`. 전체 operation502건. 명령 쓰기0, 기존 백업 파일 변경0, Production 호출0. DEV advisor는 기존 INFO29와 [유출 비밀번호 보호 미설정 WARN1](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)이 남는다. 해결된 것으로 표시하지 않는다.

전체 검사 종료 뒤에도 DEV에서 두 계정 revision/전체 JSON hash를 읽기 전용으로 다시 조회해 위 값과 정확히 같음을 확인했다. 실제 계정에 새 제작 사본을 저장한 검사는 이번에 하지 않았으며, 격리 편집 검증을 실제 DB 쓰기 검증으로 대신 표기하지 않는다.

### 검증 원장

- 최종 통합 회귀 **2,217/2,217**, 230파일, 실패/skip/cancelled0, 실행 중 source 변경0. `output/integrated-product-poc/new-tests-2026-09-23T07-47-59-422Z.json`. 2 workers/512MiB 제한에서 692.8초 실행했다.
- 문서 검사 **4/4**, skill sync 및 로컬 링크6,485개 PASS. 최종 결과 반영 후 재실행 근거: `output/integrated-product-poc/docs-2026-09-23T08-01-49-354Z.json`.
- 표적 adapter15/15, native replay/execution29/29(그중 기존 반입7 포함), 전체7원본 lifecycle 포함 반입14/14. 중복 포함 수치를 합산하지 않는다.
- 실제 컴포넌트 handler/SSR 표적20/20 및 원본 안내/SQL 정적7/7. 재시도 안내 수정 후 관련 UI39/39. 통합 suite와 겹친다.
- 초기 Node UI harness는 CSS import 처리 누락으로1파일 실패했고, test loader 수정 후 통과. 신규 테스트의 TS 추론 진단9개는 명시 타입으로 수정했으며 502진입점 진단0을 확인했다.
- 최종 `npm test` **2,255/2,255**, 실패/skip/cancelled0, 실행 중 source 변경0. `output/integrated-product-poc/npm-test-2026-09-23T07-47-26-365Z.json`.
- 최종 production build PASS, source 변경0. `output/integrated-product-poc/build-2026-09-23T07-45-12-870Z.json`. 이 빌드로 로컬 3104 서버만 재시작했다.
- 최종 TypeScript **502진입점, 진단0**, source 변경0. `output/integrated-product-poc/targeted-types-2026-09-23T07-49-34-216Z.json`.
- 별도 SQL 계약 정적 검사 **1/1**. 전체 통합 source discovery 밖의 `scripts/alpha/m72-catalog-editing-schema.test.ts`이며 통합 수에 더하지 않는다.
- 수정 중 중단한 통합 실행2개와 실행 중 source hash가 바뀐 build는 통과 판정에서 제외한다. 초기/중간 성공도 최종 성공과 합산하지 않는다.
- 최종 실제 DEV 읽기 전용 Chromium **120/120**: `output/playwright/alpha-m72-catalog-reading/2026-09-23T07-50-20-067Z/result.json`. 계정 전체 읽기 동등, r75→75, execute0, 콘솔/page error0. 새 자동 프로필의 운영 flow key는 원래0개이며 그대로0개, prefix 밖 쓰기/clear0이다. 기존 사용자 Chrome 저장소를 검사한 결과는 아니다.
- 최종 격리 Chromium **43/43**: `output/playwright/alpha-m72-catalog-editing/2026-09-23T07-51-16-687Z/result.json`. 실제 creator dispatcher를 쓰되 Auth/REST·Alpha API는 합성 응답이다. 실제 계정 사용0, 자격증명 읽기0, 외부 전달0, 합성 성공 변경5건. 실제 DEV 저장 왕복·RLS 검사로 확대하지 않는다.
- 전체 Playwright E2E suite는 이번 단계에서 재실행하지 않았다. 위 두 개의 표적 브라우저 흐름과 순수 통합·기존 npm 회귀를 실행한 결과다.

### 연결 시뮬레이션 판정

| 흐름 | 결과와 범위 |
| --- | --- |
| 7원본 → 제작 사본 → 개인 실행 | 7개 각각 순수 lifecycle 통과. 기존 v1 보존, 신규 v2 고정 원본 확인 |
| 열람/취소/Escape | 격리 브라우저에서 mutation0. Escape는 확인만 닫고 원본 상세 유지 |
| 저장 실패 → 같은 요청 재시도 | 실패 시 mutation0, 재시도 후 사본1개. 남은 실패 안내0 |
| 중복 가져오기 | 기존 사본 열기 제공, 중복 명령 no-change. 보관 사본을 새 사본으로 덮어쓰지 않음 |
| 사본 편집/명시 저장 | 포트폴리오 첫 항목 제목 수정·저장 확인. 이때 개인 실행 생성0 |
| 비교 → 선택 → 개인 실행 적용 | preview 시 문서0, 원본6개 항목과 대조한 뒤 문서1개. 수정된 제목과 원본 제목을 서로 다른 영역에서 표시 |
| 새로고침 복원 | 마지막 성공 상태 복원. 원본 카탈로그 bytes 동일 |
| 저장/네트워크 경계 | 격리 브라우저의 합성 운영 storage bytes 동일, prefix 밖 쓰기0. 인식하지 못한 API·외부 요청0, 콘솔/page error0 |

브라우저 편집 왕복 대표는 포트폴리오1개다. 나머지6개도 실제 DEV 계정으로 편집했다고 표현하지 않는다. 중간 runner 실패(초기 경로·tsx helper·대기·선택자·revision 가정)는 검사 도구를 고친 뒤 위 전체43개를 재실행했다. 제품에서 확인한 재시도 안내 오류와 검사 도구 오류는 구분한다.

### 브라우저 화면 평가

| 크기 | 자료실 상세의 제작 사본 행동 |
| --- | --- |
| 390×844 | 문구 줄바꿈·주요 버튼·키보드 포커스 정상, 가로 넘침0 |
| 375×812 | 좁은 폭에서도 버튼/패널 잘림·겹침 없음, 가로 넘침0 |
| 844×390 | 낮은 높이에서 세로 스크롤 필요. 주요 버튼 화면 내 접근, 가로 넘침0 |
| 1024×768 | 원본 안내와 제작 사본 행동 구분, 가로 넘침0 |
| 1440×900 | 주요 행동과 원본 구조 정상. 단일 열 여백·정보 밀도는 개선 여지 있음 |

최종 캡처 중375×812·844×390·1440×900 및 개인 실행 원본 안내를 직접 열어 확인했다. 직전 동일 제품 빌드에서 나머지 두 크기도 직접 확인했다. 캡처의 스크롤 위치는 제작 행동에 맞춘 것이며 첫 화면에서 항상 바로 보인다는 뜻은 아니다. 긴 원본 설명은 세로 스크롤이 필요하다. 근거 PNG는 위 격리 결과 폴더에 로컬 전용으로 보존한다. 실제 Android Chrome/iOS Safari 및 스크린리더 검사는 미실행, 관찰 사용자0명이다.

### 남은 범위

후속: [두 번째 연결 묶음](alpha-m7-2-catalog-wave2.md)에서 아래32개 후보를 전수 대조하고4개·28항목을 추가했다. 현재11개 지원/166개 미연결 및 누적 백업 전송 보완의 최신 결과는 후속 원장을 따른다. 아래170개와32개는 이 단계 종료 당시 수치다.

나머지170개 및 Map의 편집·실행, 독립 매체 백업, 실제 계정의 명시 복원, 실기기/일상 사용 검증은 남는다. 공통 원본 안내는 읽기 전용이며 제작 구조의 일반 편집 필드로 추가한 것이 아니다. 이후 다른 콘텐츠 판본을 허용할 때 기존 사본과 판본 차이를 표시하는 UX도 필요하다.

다음 기능 묶음 후보는 ‘지원 구조이나 연결 검증 전’32개다. 모두 허용한다는 결정은 아니며 출처·권리·원본 필드 보존·계정 크기를 먼저 대조해 통과한 원본만 확대한다. 반복/기간/날짜 창/식단/Map은 별도 계약과 손실 없는 투영 검증이 필요하다. 기존 실사용 목표의 백업·복원 조건은 이 콘텐츠 확대와 별도로 유지한다.

| 발행·관찰 항목 | 이번 실행 상태 |
| --- | --- |
| commit | 미실행 |
| push | 미실행 |
| PR | 미생성 |
| merge | 미실행 |
| Preview | 미배포 |
| Production | 미배포·호출0 |
| 실제 Android Chrome / iOS Safari | 미실행 |
| 관찰 사용자 수 | 0명 |

M7-2 전체 목표는 계속 유지하며 완료로 전환하지 않는다.

### 이번 변경 파일

- 원본 계약·검증: `lib/flow/integrated-poc/catalog-content.ts`, `catalog-content-v2.test.ts`, `catalog-content-import.test.ts`.
- 자료실 연결: `components/flow/integrated-poc/AlphaCatalogCopyActions.tsx/.test.tsx`, `AlphaCatalogLibrary.tsx/.test.tsx`, `AlphaWorkspace.tsx/.test.tsx`.
- 공통 원본 안내: `CatalogContentOriginal.tsx`, `ProgramDocumentProvenance.tsx/.test.tsx`.
- DEV 허용 목록: 위 신규 migration, `scripts/alpha/m72-catalog-editing-schema.test.ts`, 재실행용 읽기 전용 SQL `m72-catalog-editing-check.sql`.
- 브라우저: `scripts/alpha/m72-catalog-editing-browser.ts`. 읽기 전용 기존 runner는 수정하지 않고 재사용.
- 문서: 이 원장, `docs/STATUS.md`, `alpha-transition.md`, 기존 전체 반입 원장의 후속 연결 링크.

원본 `catalog-library-pack.v1.json`, 운영 저장소·기존 PoC HTML, 실제 계정 자료와 백업 파일은 수정하지 않았다. 이 작업 파일도 아직 Git stage/commit하지 않았다. 기존 미소유 dirty/미추적 파일의 정리·stage·삭제는 하지 않았다.
