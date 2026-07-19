# P24-00A 독립 관찰 QA — 상세 감사

증거 등급 표기: `automated_simulated` (이번 세션의 브라우저 자동화로 직접 관찰), `current command`(이번 세션에서 직접 실행한 명령), `current repo`(현재 저장소 상태), `inferred`(텍스트/DOM 근거로 추정, 시각적 스크린샷으로 확인하지 못함). 이번 세션에는 `preview deploy` 증거도 `observed user` 증거도 없다 — 이유는 [README.md](./README.md) 참고.

모든 테스트는 로컬 `npm run dev`(포트 3000, mobile 390×844 기본, wide 1024×768 보조) 대상이며, 앱 소스 코드(`app/`, `components/`, `lib/`)는 `c14c262`와 동일함을 `git diff --stat`으로 확인했다. 테스트 도중 앱 코드나 UI 파일은 수정하지 않았다.

---

## Blocking

### B1. `npm run build`가 현재 dirty worktree에서 실패한다

- **범위**: 전체 서비스 (persona 무관, 인프라 레벨)
- **재현**: `cd flow-mvp && npm run build` (2회 독립 실행)
- **evidence 등급**: current command
- **expected**: P23 closure 문서가 주장하는 "production build: pass, 18 pages"
- **actual**:
  ```
  Collecting page data ...
  [Error [PageNotFoundError]: Cannot find module for page: /f/[slug]] { code: 'ENOENT' }
  > Build error occurred
  [Error: Failed to collect page data for /f/[slug]] { type: 'Error' }
  ```
  1차 실행에서는 동일 단계에서 `/_document`에 대해 같은 에러가 발생했다(모듈이 다름, 패턴은 동일). 두 실행 모두 exit code 1.
- **원인 추정**: 커밋되지 않은 `package.json`/`package-lock.json` 변경 — `next` `15.3.8 → 15.5.20`, `@playwright/test` `1.52.0 → 1.61.1`, `postcss` `8.5.3 → 8.5.16`, `@fullcalendar/*` 마이너 bump, `overrides` 추가(`tmp`, `uuid`). 앱 소스 코드는 `c14c262`와 diff 없음(`git diff --stat c14c262..HEAD -- app/ components/ lib/` 결과 없음, working tree도 마찬가지) — 즉 코드가 아니라 의존성 버전이 원인일 가능성이 매우 높다.
- **연쇄 영향**:
  - `npm run start`도 실패(`Could not find a production build in the '.next' directory`) — current command로 확인.
  - `npm run test:e2e`는 Playwright `webServer`가 `npm run start`를 쓰므로 **실행 자체가 불가능**하다. 이번 세션에서 e2e 테스트는 0개 실행됐다.
  - 이 상태로 `main`을 push하면 CI의 build gate가 즉시 실패한다.
- **P23 문서와의 관계**: P23 closure의 "production build: pass"는 `c14c262`가 커밋한 `package.json`(Next 15.3.8) 기준으로는 여전히 유효할 수 있다. 이번 finding은 **그 이후 worktree에 쌓인 미커밋 의존성 변경이 만든 새로운 회귀**이지, P23 증거가 거짓이라는 뜻이 아니다.
- **바로 수정할 것**: 커밋 전에 `package.json`/`package-lock.json`을 c14c262 버전으로 되돌리거나(가장 안전), 아니면 Next 15.5.20 업그레이드를 별도 controlled window(P25-02)로 분리하고 그 안에서 원인을 고쳐야 한다. 현재 상태로 어느 쪽 커밋도 하면 안 된다.

### B2. 반복 실행(recurring routine) 항목이 저장 후 첫 회차만 나타나고 나머지 회차는 어디에도 없다

- **persona/session**: Persona 3 (반복 루틴형) / Session 1–2
- **route**: `/f/curated-allblanc-morning-workout` (저장) → `/my`, `/calendar`
- **viewport**: mobile 390×844
- **재현**:
  1. `/f/curated-allblanc-morning-workout`에서 시작일 2026-07-15(수), 요일 월/수/금 선택 후 저장 → 저장 시점 "회차 그리드" 미리보기가 07-15(1회차), 07-17(2회차), 07-20(3회차) 등 4주 12회차를 정확히 보여줌
  2. `/my` → 항목 detail에 "반복 항목 0/1"만 표시(1회차만 존재)
  3. `/calendar`에서 2026년 7월 그리드 확인 — `td[data-date="2026-07-15"]`에는 `.fc-event` 1개, `td[data-date="2026-07-17"]`/`td[data-date="2026-07-20"]`에는 0개 (dev server 재시작 후 재확인해도 동일)
  4. 항목의 "캘린더 파일 받기"로 받은 ICS blob을 직접 읽어 `BEGIN:VEVENT` 개수를 셈 → **1개**
- **expected**: 저장 시점 미리보기와 동일하게 M/W/F 반복의 모든 회차(4주 12회차)가 Calendar와 ICS에 나타나야 함
- **actual**: 오직 첫 회차(7/15)만 어디에도 나타남. 2·3회차 이후는 My Flow, Calendar, ICS 어느 곳에도 없음.
- **추가 확인**: 동일 증상을 다른 반복 경로(개인 항목 편집 폼의 "반복: 매일" 콤보박스)에서도 재현 — 이사 체크리스트 항목 하나를 "매일" 반복으로 설정한 뒤 Calendar를 봐도 daily 반복이 여러 날짜로 확장되지 않고 단일 날짜만 유지됨. 두 개의 독립된 반복 구현 경로에서 동일 패턴이 나온 것으로 보아 특정 콘텐츠의 버그가 아니라 **My Flow/Calendar/ICS 프로젝션 레이어가 반복 회차를 애초에 여러 개로 materialize하지 않는** 구조적 문제로 보인다.
- **영향**: Persona 3의 핵심 약속("반복 실행 추적")이 실제로 동작하지 않는다. 다른 occurrence를 skip/hold하는 테스트 자체가 불가능했다(occurrence가 1개뿐이므로) — Session 2의 "다른 occurrence 건너뛰기와 보류" 요구사항은 **이 버그 때문에 검증할 수 없었다.**
- **evidence 등급**: automated_simulated + DOM/blob 직접 조회(inferred가 아니라 실측)

### B3. 메모 분할 개인 초안 중 `type: "todo"` 항목이 My Flow/export 어디에도 렌더링되지 않는다

- **persona/session**: Persona 4 (개인 초안·구조 편집형) / Session 1
- **route**: `/flows` 미스 케이스 메모 입력 → `/my`
- **viewport**: mobile 390×844
- **재현**:
  1. 메모 "베란다 텃밭 시작하기. 화분과 흙 사고 씨앗 심고 매일 물주기 확인하고 2주 후 발아 확인" 입력 → 저장 전 미리보기가 "메모에서 나눈 할 일 3개"를 정확히 보여줌
  2. "내 Flow에 초안 저장" 클릭 → `/my` 착지, "1개 저장"만 표시, 항목도 1개만 보임
  3. `localStorage.getItem('flow_builder_mvp_bundles_v11')`를 직접 파싱 — 3개 항목 모두 저장돼 있음을 확인(`draft-item-1` type: `calendar`, `draft-item-2`/`draft-item-3` type: `todo`)
  4. "메모로 복사" export도 item-1 내용만 포함, item-2/3 텍스트는 클립보드에 없음
- **expected**: 저장된 3개 항목 모두 My Flow 목록과 export에 나타나야 함(적어도 "날짜 없음" 상태로라도)
- **actual**: `type: "todo"`인 항목 2개가 완전히 비가시. 데이터는 유실되지 않았지만(로컬 스토리지에는 존재) UI/export상으로는 없는 것과 같음. "이 Flow 가져가기 · 3개" 라벨만 3개라고 표시해 사용자가 "3개 다 저장됐다"고 믿게 만드는데 실제 접근 가능한 항목은 1개뿐 — 라벨과 실제 상태 불일치.
- **비교**: 같은 세션에서 "+ 할 일 추가"로 직접 추가한 새 항목은 정상적으로 즉시 렌더링됨(추가 즉시 "날짜 항목 2개"로 반영 확인) — 이는 사용자가 수동으로 추가한 항목의 기본 type과 메모 자동분할이 만드는 항목의 type이 다르기 때문으로 보인다.
- **영향**: 사용자가 메모 하나에 여러 할 일을 적으면 첫 번째를 제외한 나머지는 저장했다는 확인을 받고도 실제로는 다시 볼 수 없다. Persona 4의 "발견→저장" 신뢰를 직접 훼손하는 버그다.
- **evidence 등급**: automated_simulated + localStorage 원본 JSON 직접 확인(실측)

### B4. 개별 항목 날짜 override가 "다음 할 일"/"먼저 할 일" 요약 위젯에 반영되지 않는다 (reload 후에도 지속)

- **persona/session**: Persona 1 Session 2, Persona 2 Session 2 (두 persona에서 독립 재현)
- **route**: `/my` (요약 위젯), 대조군: `/my` 전체 목록, `/calendar`, ICS export
- **viewport**: mobile 390×844
- **재현 (Persona 1)**:
  1. 이사 Flow 저장(이사일 2026-08-13) → 항목 1 날짜를 2026-07-20으로 개별 변경 → 저장
  2. `/my` "다음 할 일" 위젯: **"7월 14일"**(원래 앵커 기준 D-30, 즉 변경 전 값)로 표시 — reload 해도 동일
  3. `/my` "전체" 탭 전체 목록: **"7월 20일"**(정확)
  4. `/calendar`: 7/20에 정확히 표시, 7/14에는 없음(정확)
  5. 이사일을 8/13→8/20으로 재계산한 뒤 다시 확인 — 위젯은 이번엔 **"7월 21일"**(새 앵커의 D-30 재계산값)을 표시. 즉 위젯은 override를 완전히 무시하고 항상 "앵커 기준 재계산값"만 보여준다.
- **재현 (Persona 2)**: 날짜 없는 체크리스트 항목에 날짜(2026-07-25) 지정 → `/my` 위젯은 여전히 **"날짜 없음"**으로 표시(reload 후에도), `/calendar`는 정확히 7/25에 표시.
- **expected**: 위젯이 항목의 실제 effective date(override 반영값)를 보여줘야 함 — 이는 "반드시 확인할 항목"의 "Calendar와 모든 export의 effective state 일치" 요구사항 위반.
- **actual**: 위젯만 틀림. 전체 목록/Calendar/ICS는 모두 정확함(별도 검증).
- **영향**: 사용자가 가장 먼저, 가장 자주 보는 화면(My Flow 홈)이 잘못된 날짜를 계속 보여준다. 사용자가 "오늘 할 일이 아닌데 오늘 할 일로 뜬다" 또는 반대로 "날짜를 넣었는데 안 넣은 것처럼 보인다"고 오인할 수 있다.
- **evidence 등급**: automated_simulated, 3회 이상 반복 재현 + reload 지속성 확인

### B5. "이 Flow 다시 쓰기"에서 "내가 바꾼 날짜 유지"를 선택해도 새 실행에서 override가 사라진다

- **persona/session**: Persona 1 Session 3
- **route**: `/my` → 완료 후 "이 Flow 다시 쓰기"
- **viewport**: mobile 390×844
- **재현**:
  1. 이사 Flow 5개 항목 모두 완료(항목 1은 7/20으로 개별 override된 상태) → 회고 저장 → "이 Flow 다시 쓰기" 클릭
  2. 새 이사일 2026-09-10 입력, 라디오 "내가 바꾼 날짜 유지"(`keep_fixed_dates`) 선택 → "새 실행 시작"
  3. 새 실행의 항목 1 날짜: **"8월 11일"**(새 앵커의 순수 D-30 재계산값). override였던 7/20은 반영되지 않음.
  4. "지난 실행 1회" 히스토리를 열어보면 과거 실행 기록에는 항목 1이 **"7월 20일"**로 정확히 보존돼 있음 — 즉 override 데이터 자체는 남아있고 히스토리 스냅샷에는 정확히 찍혔지만, **새로 시작된 실행에는 이관되지 않았다.**
- **expected**: UI 문구("따로 정한 날짜는 그대로 두고 나머지만 다시 맞춰요") 그대로, 새 실행에서도 항목 1이 7/20 근처 값을 유지해야 함
- **actual**: 라디오 선택이 무시되고 항상 anchor 재계산값으로 리셋됨
- **영향**: Persona 1의 "다시 쓰기" 세션3 핵심 시나리오(override 유지 여부 확인)가 UI 약속과 실제 동작이 다름을 보여준다. "reset_to_anchor"와 "keep_fixed_dates" 두 옵션이 사실상 같은 동작을 한다.
- **evidence 등급**: automated_simulated, before/after 값 직접 비교 + 과거 실행 기록과 대조

---

## High

### H1. `/flows`로 직접 하드 네비게이션하면 무한 로딩에 걸린다 (production build 미검증)

- **route**: `/flows` (직접 URL 진입 — 주소창 입력, 북마크, 새로고침)
- **viewport**: mobile 390×844
- **재현**: `localStorage.clear()` 후 `navigate` 도구로 `http://localhost:3000/flows` 직접 진입(hard navigation) → `document.body.innerText`가 계속 `"Flow를 불러오는 중입니다."`(Suspense fallback)에 머무름. 최대 30초 이상 대기해도 해소되지 않음. **dev 서버를 완전히 재시작한 뒤에도 재현**(2회 독립).
- **대조**: 홈(`/`)에서 "URL이나 메모로 Flow 찾기" 링크를 **클릭**(client-side transition)하면 `/flows`가 즉시 정상 렌더링됨. localStorage가 비어있어도 동일하게 정상.
- **원인 추정**: `document.body.innerHTML`을 직접 조사한 결과, 실제 페이지 콘텐츠는 `<div hidden id="S:0">` 안에 서버에서 이미 스트리밍돼 와 있었지만, 이를 보이는 슬롯으로 옮기는 React streaming 완료 스크립트가 실행되지 않은 상태로 멈춰 있었다(RSC 스트리밍 미완료). `next dev`의 SSR 응답 시간이 이 세션 내내 비정상적으로 느렸다(`GET /flows 200 in 21019ms`, `HEAD / 200 in 35870ms` 등 관측).
- **한계**: production 빌드(B1)가 깨져 있어 Vercel preview와 동등한 조건(production 빌드)에서 이 버그가 재현되는지 확인하지 못했다. dev 전용 이슈일 가능성을 배제할 수 없다.
- **바로 수정할 것 여부**: B1(빌드 실패)을 먼저 고치고 production 빌드로 재검증 필요. 재현되면 Blocking으로 재분류해야 한다 — `/flows`는 앱의 핵심 진입점 중 하나(홈 CTA의 목적지)이기 때문이다.

### H2. 저장 직후 `/my`가 빈 상태로 보였다가 새로고침해야 실제 데이터가 나타나는 경우가 있다 (간헐적)

- **persona/session**: Persona 2 Session 1에서 재현, Persona 1/3/4/5의 동일 패턴 지점에서는 재현 안 됨
- **route**: `/flow-maps/curated-new-car-purchase-guide` → 저장 → `/my`
- **재현**: "전체 저장하고 시작" 클릭 직후 `/my`가 "저장한 콘텐츠 없음"(빈 상태)을 표시. `localStorage`에는 저장 데이터가 이미 존재함(`flow:saved:curated-new-car-basic` 등 확인). `location.reload()` 한 번으로 정상 표시.
- **영향**: 재현율이 낮아(5회 저장 시도 중 1회) 결정적이라 보기 어렵지만, 재현되면 사용자가 "저장이 실패했다"고 오인해 다시 저장을 시도하거나 이탈할 수 있다.
- **evidence 등급**: automated_simulated, 1회 재현 — 반복 재현 시도는 시간 제약으로 하지 못함. **관찰 후 수정** 대상.

### H3. Next.js 15.5.20 dev 서버가 장시간 세션에서 내부 모듈 오류로 500을 내며 불안정해진다

- **재현**: 세션 진행 중(수십 회의 상호작용 후) `GET /my`가 500을 반환하며 `Error: Could not find the module ".../segment-explorer-node.js#SegmentViewNode"`, `TypeError: Cannot read properties of undefined (reading 'call')`, `Error: Cannot find module './331.js'` 등의 서버 로그가 나타남. `.next` 삭제 후 서버 재시작으로 해결.
- **원인 추정**: B1과 동일한 의존성 버전 이슈의 연장선으로 보인다(Next 15.5.20 dev 모드의 알려진 불안정성 가능성).
- **영향**: 제품 버그로 단정하기 어렵고, 현재 dirty worktree의 의존성 상태에 대한 추가 증거로 취급한다.

---

## Medium

### M1. 항목 편집 폼의 범용 필드가 콘텐츠 성격과 무관하게 노출된다

모든 개인 draft/구조 항목의 "제목·날짜·메모 수정" 패널에는 콘텐츠 종류와 무관하게 동일한 필드 세트가 뜬다: "결정 상태(미정/구매/거절/보류)", "다음 확인일", "오늘 기록". 예를 들어 "이사 방식과 견적 후보 정하기"(결정 항목)에는 "구매"/"거절" 선택지가 자연스럽지 않고, "베란다 텃밭 시작하기"(1회성 실행 항목)에도 동일한 필드가 뜬다. 기능 자체는 동작하지만 콘텐츠 유형별 맞춤이 낮아 첫 사용자가 "이 항목에 왜 '구매'를 선택해야 하지?"라고 혼란스러워할 수 있다. — **inferred**(자동화로 필드 존재만 확인, 실제 혼란 여부는 관찰 필요)

### M2. source-backed Flow의 구조 편집 제한에 대한 설명이 없다

`신차 구매 7단계 체크리스트`, `원룸 이사 D-30` 등 source-backed 항목에는 add/delete/reorder 버튼이 아예 나타나지 않는다(정책상 의도됨, DOM에 컨트롤 자체가 없음을 확인). 하지만 "왜 없는지"를 설명하는 안내 텍스트가 없다. 개인 draft(Persona 4)에서는 동일한 위치에 "+ 할 일 추가"/"↑↓"가 있으므로, 두 Flow 유형을 오가는 사용자는 "구조가 왜 안 바뀌지?"라고 버그로 오인할 수 있다.

### M3. "캘린더 파일 받기" 버튼의 스코프가 라벨과 다르게 느껴질 수 있다

항목 상세 패널의 "원문·내 도구" 섹션은 Flow 제목("이사 준비 체크리스트" 등)을 헤딩으로 보여준 뒤 "캘린더 파일 받기" 버튼을 두고 있어 Flow 전체를 내보내는 것처럼 보이지만, 실제 ICS에는 **현재 열어본 항목 1개**의 VEVENT만 담긴다(B2와 별개로, 비반복 항목에서도 동일하게 확인). 기능은 정상이지만 라벨/배치가 "Flow 단위 vs 항목 단위" 구분을 흐린다.

---

## Low / 방법론 메모

### L1. 자동화 클릭이 일부 submit형 버튼에서 등록되지 않은 사례

세션 전반에 걸쳐 `mcp__Claude_Browser__computer` `left_click`이 몇몇 제출/저장 버튼(예: 첫 "저장하고 시작" 클릭, "내 회고 저장", "추가")에서 즉시 반영되지 않아 `element.click()`(JS)으로 재시도해야 했다. 한 인스턴스는 `elementFromPoint`로 다른 요소의 겹침이 아님을 확인했다(오버랩 아님). 이는 실제 사용자의 물리적 탭과 100% 동일한 신호가 아닐 수 있으므로, **이 패턴 자체를 제품 버그로 단정하지 않는다.** 다만 실제 사용자 관찰(P24-00B)에서 "버튼을 눌렀는데 반응이 없어서 다시 눌렀다"는 보고가 나오면 이 메모를 함께 참고할 가치가 있다.

### L2. `computer` screenshot 액션이 세션 내내 30초 타임아웃

시각적 스크린샷 캡처가 전혀 되지 않아 `screenshots/` 산출물을 만들지 못했다. `read_page`(접근성 트리)와 `get_page_text`, DOM 직접 조회로 대체했다. 이는 도구 한계이지 제품 버그가 아니다.

---

## Persona/Session별 결과 요약

| Persona | Session | 결과 | 비고 |
| --- | --- | --- | --- |
| 1. 기준일 역산형(이사) | 1 발견→저장→착지 | supported | "이사일" 라벨 정확, D-30 계산 정확 |
| 1 | 2 일정 수정·완료 | partial | B4(위젯), B5는 세션3 소관 — override는 전체목록/Calendar/ICS 레벨에서는 supported |
| 1 | 3 재방문·회고·다시쓰기 | partial | 회고/히스토리 supported, B5(다시쓰기 override 유지) blocked |
| 2. 날짜 없는 체크리스트형 | 1 저장·발견 | supported | H2 1회 재현(간헐적) |
| 2 | 2 날짜 지정/제거/완료 | partial | 완료·Calendar·ICS·memo export supported, B4(위젯) 재현 |
| 2 | 3 재방문·구조 잠금 | supported | reload persistence 확인, source-backed 구조 편집 잠금 확인(M2) |
| 3. 반복 루틴형 | 1 draft 생성·반복 설정 | supported | 저장 시점 회차 미리보기 정확 |
| 3 | 2 occurrence 완료/skip/hold | blocked | B2로 인해 occurrence가 1개뿐 — skip/hold 자체를 테스트할 수 없었음 |
| 3 | 3 reload·반복 규칙 수정 | partial | reload 후 완료 상태는 유지되나 B2가 근본 원인이라 회차 자체가 없음 |
| 4. 개인 초안·구조 편집형 | 1 miss 진입·초안 저장 | partial | 저장은 되나 B3(todo 항목 은닉) |
| 4 | 2 추가/수정/삭제/undo/순서 | supported | 신규 추가 항목은 완전히 정상 동작(추가/삭제/undo/영구복구/순서변경 모두 확인) |
| 4 | 3 reload persistence | supported | 삭제 tombstone과 복구 옵션 reload 후에도 유지 확인 |
| 5. 공개 공유·재사용형 | 1 `/f/[slug]` 진입·preview 이해 | supported | "저장 전 미리보기" 라벨링 명확, Flow 단위 저장이 1차 액션 |
| 5 | 2 저장 후 실제 완료 체크 | supported | 열기/수정/완료 accessible name role 분리 확인 |
| 5 | 3 회고·재사용 | partial | Allblanc 콘텐츠로 교차 검증됨(회고/다시쓰기는 persona 1에서 상세 검증) |

## 자동화가 증명한 것 vs 추정한 것

- **직접 증명(automated_simulated, 실측)**: 라우트 전이, DOM 텍스트/속성, localStorage 원본 JSON, ICS/클립보드 blob 내용, 접근성 트리의 role/accessible name, reload 후 상태, 커맨드 실행 결과(exit code, stdout).
- **추정(inferred)**: 실제 사용자가 화면을 보고 느낄 혼란(M1, M2), 자동화 클릭 실패가 실제 탭 실패를 의미하는지(L1). 이 항목들은 스크린샷 없이는 완전히 검증되지 않았고, 실제 사용자 관찰이 필요하다.

## 실제 사용자에게만 답할 수 있는 질문

1. My Flow 홈 위젯의 날짜 오류(B4)를 실제 사용자가 알아채는가, 아니면 전체 목록/Calendar를 열어보기 전까지 신경 쓰지 않는가?
2. "결정 상태"(M1) 같은 범용 필드를 사용자가 실제로 혼란스러워하는가, 아니면 무시하고 넘어가는가?
3. source-backed Flow에 구조 편집 버튼이 없는 것(M2)을 사용자가 "당연하다"고 받아들이는가, "버그"라고 느끼는가?
4. 반복 회차가 1개만 보이는 것(B2)을 사용자가 "다음 회차는 완료 후에 생기나 보다"라고 오해하고 넘어가는가, 즉시 문제로 느끼는가?
5. 자동화 클릭 실패(L1)에 대응하는 "버튼을 여러 번 누르는" 실제 행동 패턴이 존재하는가?

## 검증 명령 결과 (이번 세션에서 직접 실행)

| 명령 | 결과 | 비고 |
| --- | --- | --- |
| `npm test` | 476/476 pass | current command |
| `npm run docs:check` | pass (14 files, 2175 links) | current command |
| `npm run build` | **실패 (exit 1)** | current command, 2회 재현 |
| `npm run start` | **실패** | current command, 빌드 산출물 없음 |
| `npm run test:e2e` | **실행 안 함** | webServer 의존성인 `npm run start`가 실패하므로 전제조건 불충족 |
| `git diff --check` | 기존 CRLF 경고만, 오류 없음 | current command |

전체 Playwright suite와 targeted e2e 모두 이번 세션에서 실행하지 못했다 — 이유는 위 표와 같다. 이전 세션(P23 closure)의 e2e 결과를 이번 실행 결과로 대체하지 않는다.

## Git 변경 여부

- 앱 코드(`app/`, `components/`, `lib/`) 무변경.
- 기존 dirty 파일 revert/stage/delete 없음.
- 이번 세션이 새로 만든 파일: `docs/content-audit/2026-07-14-claude-code-p24-observation-audit/*`(이 산출물), `.claude/launch.json`(로컬 dev 서버를 Browser 도구로 열기 위한 설정, 앱 코드 아님).
- `.next/` 디렉터리를 3회 삭제·재생성했으나 이는 gitignore 대상 빌드 캐시이며 버전 관리에 영향 없음.
