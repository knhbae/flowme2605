# Claude Design 피드백 기반 시나리오 핸드오프

작성일: 2026-07-09

목적: Claude Design이 FlowMe의 현재 제품 상태와 사용자의 최신 피드백을 한 번에 이해하고, 시나리오별로 화면 판단을 할 수 있게 만드는 작업 관리 문서다. 이 문서는 구현 지시가 아니라 디자인/제품 판단용 핸드오프다.

읽기용 HTML: [Claude Design 피드백 시나리오 보드](./2026-07-09-claude-design-feedback-scenario-board-ko.html)

## 한 문장 제품 기준

```text
FlowMe는 URL/메모를 실행 가능한 Flow로 바꾸고, 사용자가 내 Flow와 캘린더에서 이어 실행하게 하는 서비스다.
```

Claude Design은 모든 화면을 이 문장으로 다시 검토해야 한다. 화면이 멋있어도 이 문장이 바로 느껴지지 않으면 우선순위가 낮다.

## 현재 기준선

- Primary IA는 `홈 / Flow 찾기 / 캘린더 / 내 Flow` 4탭이다.
- `/flows`는 URL-first lookup, hit/miss/needs_review, local production candidate, catalog browsing을 같이 맡는다.
- URL hit는 기존 Flow 재사용, 시작일/옵션, Markdown export, My Flow 저장으로 이어진다.
- URL miss/needs_review는 아직 실행 가능한 Flow가 아니며, AI 생성이 아니라 local production candidate로 남기는 상태다.
- `/f/[slug]`는 공유받은 사용자의 저장 전 shell이다. 영구 app shell이 아니다.
- `/my`는 저장한 Flow의 실행 허브다.
- `/calendar`는 dated Step의 global schedule-first 실행 화면이다.
- Creator/studio는 아직 5번째 탭이 아니라 secondary surface다.
- 현재 근거는 대부분 automated/browser QA다. 실제 사용자 검증으로 표현하면 안 된다.

## 사용자 피드백 원문 요약

### 1. 핵심 제품 흐름

검토 경로: `/` -> `/flows` -> `/my` -> `/calendar`

사용자 판단:

- 핵심 문장은 이해된다.
- 하지만 캘린더에서 다른 Flow 구분이 잘 안 된다.
- 캘린더 이벤트 색상이 동일해서 구분이 약하다.
- `일정`처럼 단순하게 적힌 이벤트명도 문제다.
- 같은 날짜에 여러 Flow/Step이 있을 때 어떻게 처리할지 더 고민해야 한다.

### 2. URL-first 가치

검토 경로: `/flows`

사용자 판단:

- 이사 원 콘텐츠 URL hit는 제대로 넘어간다.
- Hit일 때 특정 Step을 뺄 수 있는 기능은 확인된다.
- 다만 플랫폼이면 수정 자유도가 너무 낮은 것 아닌지 고민된다.
- 적어도 item마다 calendar `.ics` event가 갖는 정보 구조는 있어야 하며, 그 수준의 수정은 가능해야 한다.
- 급한 것은 아니지만 스튜디오 이전의 중요한 숙제다.
- Miss인 경우에는 사용자가 `초안 만들기`를 실행하고, AI 초안을 만든 뒤 사용자가 손보는 흐름이 있으면 좋겠다.

### 3. Public `/f` 저장 화면

검토 경로: `/f/vehicle-inspection-prep`, `/f/moving-d30-basic`

사용자 판단:

- 초기에 export 또는 내 Flow 저장이 이뤄지는 것처럼 보인다.
- 그러나 현재 export가 Step 단위에 치우쳐 보인다.
- Flow 단위 저장과 Step 단위 저장을 어떻게 공존시킬지 숙제다.
- Export가 저장 CTA를 이기는 구조가 되면 안 된다.

### 4. My Flow 실행 허브

검토 경로: `/my?savedMap=moving-d30`, `/my?savedMap=middle-school-math-1`

사용자 판단:

- 기본 기능은 있는 것 같다.
- 하지만 중요한 내용을 보려면 depth가 많다.
- 오늘 할 일 체크를 하려면 여러 번 눌러 들어가야 확인할 수 있다.
- 아직 실서비스라기엔 덜 다듬어진 느낌이다.

### 5. Calendar

검토 경로: `/calendar`

사용자 판단:

- 캘린더도 콘텐츠 종류마다 핵심 실행 화면이다.
- 현재는 실서비스라기엔 많이 부족하다.
- 단순 보조 화면인지 핵심 실행 화면인지 명확히 다시 봐야 한다.

### 6. Creator / Studio

검토 경로: `/u/flow-curation-team`, `/u/my-flow-studio`

사용자 판단:

- `/u/flow-curation-team`은 실제 public creator profile로 봐야 한다.
- `/u/my-flow-studio`는 fresh Vercel 세션에서 localStorage가 비어 보이는 것이 이상하지 않다.
- P16 evidence에서는 filled local content fixture로 검증했다.
- 현재 판단은 5번째 탭이 아니라 보조 표면이다.
- 스튜디오를 지금 개념적으로만 볼지, 기본 실행 화면부터 고칠지 고민된다.

## 우선 판단

현재는 creator/studio를 핵심 축으로 키우기보다, 기본 실행 루프를 먼저 다듬는 편이 맞다.

이유:

- 사용자가 직접 지적한 가장 큰 마찰은 `/calendar`, `/my`, `/f`, URL hit/miss 같은 P0 실행면에 있다.
- Creator/studio는 플랫폼 성장에는 중요하지만, 지금 키우면 4탭 IA와 Stage 0 action-compiler 방향을 흐릴 수 있다.
- Studio는 완전히 버리는 것이 아니라 `secondary concept validation`으로 둔다.
- Claude Design은 studio 화면을 크게 만들기 전에, 저장/실행/캘린더/수정/초안 생성의 사용감이 실서비스처럼 보이는지 먼저 판단해야 한다.

추천:

```text
P0: Calendar/My Flow/public /f/URL-first 실행 루프 정리
P1: URL miss -> AI draft -> user edit conceptual flow
P1: Flow 단위 저장과 Step 단위 저장의 선택 모델
P2: Studio/creator를 secondary surface로 개념 검증
```

## Claude Design에게 요청할 시나리오

### 시나리오 A. 첫 방문자가 제품 문장을 이해하는가

대상 사용자: FlowMe를 처음 보는 사용자

검토 경로:

1. `/`
2. `/flows`
3. `/my`
4. `/calendar`

판단 질문:

- 첫 화면에서 “URL/메모를 실행 가능한 Flow로 바꾼다”가 보이는가?
- `/flows`가 catalog가 아니라 source-to-execution entry로 읽히는가?
- `/my`와 `/calendar`가 저장 후 실행 공간으로 자연스럽게 이어지는가?
- 설명 없이 5초 안에 다음 행동이 보이는가?

필요 산출:

- 모바일 390px storyboard 4장 이상
- 데스크톱 1280px storyboard 2장 이상
- Home -> Flow finding -> My Flow -> Calendar의 연결 문장과 CTA hierarchy 제안

### 시나리오 B. URL hit 사용자가 기존 Flow를 고쳐 시작하는가

대상 사용자: 이사/여행/공부 콘텐츠 URL을 붙여넣은 사용자

검토 경로:

1. `/flows`
2. URL hit result
3. `그대로 시작`
4. `조금 고쳐 시작`
5. My Flow 저장 후 `/my`
6. `/calendar`

판단 질문:

- Hit가 “AI 생성 데모”가 아니라 “이미 준비된 실행 Flow 재사용”으로 보이는가?
- Step include/exclude만으로 충분한가?
- 최소한 calendar event 수준의 수정 구조가 어디에 있어야 하는가?
- 수정 자유도는 P0에서 어디까지 열고, studio/editor는 어디부터인가?

핵심 디자인 숙제:

- Step-level lightweight edit: 제목, 날짜, 시간, 반복, memo, source URL, 완료 기준
- Item-level edit: 체크 항목 추가/삭제/수정
- Original Flow와 personal copy의 경계
- Export 결과가 personal copy state를 반영하는지

### 시나리오 C. URL miss 사용자가 초안을 요청하는가

대상 사용자: FlowMe에 없는 URL을 붙여넣은 사용자

검토 경로:

1. `/flows`
2. URL miss
3. 제작 후보 저장
4. 미래형 `초안 만들기`
5. AI draft 생성
6. 사용자 손보기
7. My Flow 저장 또는 production handoff

판단 질문:

- 현재 miss가 “막힘”이 아니라 “나중에 이어갈 수 있는 요청”으로 보이는가?
- AI draft를 붙인다면 P0 후보 저장과 어떻게 충돌하지 않는가?
- AI draft는 canonical Flow가 아니라 private draft로 시작해야 하는가?
- 사용자는 AI 초안이 원문 그대로가 아니라 검토 필요한 초안임을 이해하는가?

비목표:

- 지금 당장 AI generation을 기본 경로로 만들지 않는다.
- Miss를 public demand count로 표현하지 않는다.
- Source crawling, 자동 seed 생성, 자동 publish를 암시하지 않는다.

### 시나리오 D. Public `/f` 공유 사용자가 Flow/Step 저장을 선택하는가

대상 사용자: 공유 링크를 받은 사용자

검토 경로:

1. `/f/vehicle-inspection-prep`
2. `/f/moving-d30-basic`
3. 저장 전 setup
4. Flow 단위 저장
5. Step 단위 저장 또는 export
6. `/my`

판단 질문:

- 저장 CTA가 export CTA보다 앞서 있는가?
- Flow 단위 저장과 Step 단위 저장은 어떤 상황에서 각각 자연스러운가?
- Export가 Step detail 안에 숨어 있거나 Step 단위로만 보이면 사용자가 흐름을 놓치지 않는가?
- Public `/f`는 공유받은 사람이 저장할지 판단하는 shell로 보이는가?

핵심 디자인 숙제:

- Flow 전체 저장: “이 콘텐츠 전체를 내 Flow에 저장”
- Step만 저장: “이 항목만 내 캘린더/체크리스트에 추가”
- Export: 저장 전/후 어느 위치에서 보여야 하는가
- 저장과 export를 같은 primary action처럼 경쟁시키지 않는 위계

### 시나리오 E. My Flow에서 오늘 할 일을 바로 체크하는가

대상 사용자: 이미 저장한 Flow가 있는 사용자

검토 경로:

1. `/my?savedMap=moving-d30`
2. `/my?savedMap=middle-school-math-1`
3. Today/전체
4. Step detail
5. checklist check
6. export/source detail

판단 질문:

- 오늘 할 일 체크가 설명보다 먼저 보이는가?
- 현재 중요한 정보를 보기 위해 depth가 너무 깊지 않은가?
- Flow별 구조와 오늘 할 일이 분리되어 보이는가?
- Step detail은 읽기/체크/수정/내보내기 역할을 과하게 섞고 있지 않은가?

핵심 디자인 숙제:

- Today first action density
- One-tap check visibility
- Step detail collapsed/expanded hierarchy
- 여러 saved Flow가 있을 때 next action 우선순위

### 시나리오 F. Calendar가 실서비스 실행 화면처럼 보이는가

대상 사용자: 저장한 dated Step을 캘린더로 보는 사용자

검토 경로:

1. `/calendar`
2. 같은 날짜 여러 Flow
3. 다른 카테고리/Flow 이벤트
4. 선택일 agenda
5. Calendar -> Step detail -> check/export

판단 질문:

- 캘린더가 보관된 데이터가 아니라 오늘/선택일 실행 화면으로 보이는가?
- Flow별 색상, icon, label, grouping이 필요한가?
- 단순 `일정` 같은 라벨이 어떤 정보로 바뀌어야 하는가?
- 같은 날짜에 여러 이벤트가 있을 때 month cell과 selected-day agenda가 어떻게 역할을 나눠야 하는가?
- Calendar는 보조 화면인가, 핵심 실행 화면인가?

핵심 디자인 숙제:

- Flow별 색상 또는 category accent
- 이벤트명: `[Flow명] 핵심 Step 제목` 또는 `Step 제목 + Flow context`
- 같은 날짜 다중 이벤트: month cell은 dot/count, agenda는 grouped list
- selected-day agenda를 모바일에서 month grid보다 먼저 둘지 재검토
- Calendar에서 Step check/export/source로 이어지는 경로

### 시나리오 G. Creator/studio를 지금 얼마나 키울지 판단한다

대상 사용자:

- Creator profile 방문자
- Flow author
- 내 로컬 콘텐츠를 가진 사용자

검토 경로:

1. `/u/flow-curation-team`
2. `/u/my-flow-studio`
3. creator profile with content fixture
4. My Flow에서 studio 진입

판단 질문:

- `/u/flow-curation-team`은 실제 public creator profile처럼 보이는가?
- `/u/my-flow-studio`는 fresh session에서 비어 보일 때도 자연스러운가?
- Studio는 지금 5번째 탭이 아니라 secondary surface로 충분한가?
- 지금 studio를 키우는 것이 P0 실행면 개선보다 우선인가?

권장 판단:

- 지금은 studio를 크게 키우지 않는다.
- `public creator profile`과 `personal studio`를 개념적으로만 분리한다.
- filled fixture 기준으로 “무엇이 보여야 하는지”를 storyboard로 만든다.
- P0 실행면이 실서비스처럼 보인 뒤 creator/studio를 확장한다.

## Claude Design 산출물 요구

Claude Design은 새 앱을 상상하지 말고 현재 route와 현재 제품 기준을 근거로 아래를 만들어야 한다.

1. 시나리오별 모바일 storyboard
   - A~G 각 시나리오 최소 3장
   - Calendar/My Flow는 더 많이: 각 5장 이상
2. 시나리오별 desktop/wide review
   - `/flows`, `/my`, `/calendar`, `/u/flow-curation-team`
3. Feedback-to-design mapping
   - 사용자 피드백 한 줄
   - 화면 문제
   - 디자인 제안
   - 구현 우선순위
4. P0/P1/P2 작업 보드
5. “지금 하지 말 것” 목록
6. Studio/creator에 대한 명확한 판단

## 스크린샷 또는 HTML 패키지 기준

현재는 HTML 보드를 우선 사용한다. 이후 스크린샷 패키지를 만든다면 아래 순서로 캡처한다.

| 묶음 | Route/state | Viewport | 목적 |
| --- | --- | --- | --- |
| Core flow | `/`, `/flows`, `/my`, `/calendar` | 390, 1280 | 한 문장 제품 이해 여부 |
| URL hit | `/flows` with AJD moving URL hit | 390, 1280 | lookup-first, custom start |
| URL miss | `/flows` with unknown URL miss | 390 | candidate vs AI draft future |
| Public `/f` | `/f/vehicle-inspection-prep`, `/f/moving-d30-basic` | 390, 1280 | Flow/Step save/export hierarchy |
| My Flow | `/my?savedMap=moving-d30`, `/my?savedMap=middle-school-math-1` | 390, 1280 | today action depth |
| Calendar | `/calendar` with multiple saved Flow fixture | 390, 1280 | Flow differentiation and multi-event day |
| Creator/studio | `/u/flow-curation-team`, `/u/my-flow-studio` with fresh/filled states | 390, 1280 | secondary surface 판단 |

## P0/P1/P2 작업 보드

### P0 - 기본 실행면 개선

- Calendar Flow 구분: color/accent/icon/group label/event title.
- 같은 날짜 다중 이벤트 처리: month cell은 count/dot, agenda는 Flow별 group.
- My Flow today action depth 축소: 체크 가능한 오늘 할 일을 첫 화면에 노출.
- Public `/f` 저장/export hierarchy 재검토: Flow 저장과 Step 저장의 역할 분리.
- URL hit custom start의 수정 범위 재검토: Step include/exclude만으로 충분한지 판단.

### P1 - URL miss와 초안 생성

- Miss 상태에서 local candidate와 future AI draft의 관계 정리.
- AI draft는 private draft로 시작하고 canonical Flow로 바로 승격하지 않는 정책.
- AI draft 후 사용자 손보기 화면의 최소 edit model.
- Candidate request -> human/AI draft -> source review -> executable hit 흐름 storyboard.

### P1 - Calendar event data model UX

- `.ics` event가 갖는 정보 수준을 UI edit model로 환산한다.
- 최소 필드: title, date, time, duration, repeat, location, memo, source URL, completion criteria, caution.
- Step detail과 Calendar edit의 역할 분리.

### P2 - Creator/studio secondary validation

- `/u/flow-curation-team` public creator profile with real content.
- `/u/my-flow-studio` fresh empty state and filled local fixture.
- Studio는 5번째 탭이 아니라 My Flow/creator secondary action인지 검토.
- Creator impact, user-suggested Step additions, community loop는 concept만 연결.

## 지금 하지 말 것

- Creator/studio를 primary nav나 5번째 탭으로 승격하지 않는다.
- Calendar 문제를 색상만 바꾸는 visual polish로 끝내지 않는다.
- URL miss에서 AI 생성이 자동으로 public Flow를 만든다고 표현하지 않는다.
- Step/Item edit을 full studio/version graph로 과하게 키우지 않는다.
- 사용량, thumbs-up, creator impact를 실제 검증처럼 표현하지 않는다.
- Internal route나 lab 용어를 normal user surface에 노출하지 않는다.

## Claude Design에게 줄 참고 파일

- `docs/SERVICE_STRUCTURE.md`
- `docs/DECISIONS.md`
- `docs/IDEAS.md`
- `docs/specs/2026-07-05-url-lookup-production-slice/spec.md`
- `docs/content-audit/2026-07-07-flowme-url-memo-integrated-ux-storyboard-ko.html`
- `docs/content-audit/2026-07-07-flowme-visual-review-guide-ko.html`
- `docs/content-audit/2026-07-08-claude-design-p1-p15-product-direction-review-ko.md`
- `components/flow/AppClient.tsx`
- `components/flow/PlatformNav.tsx`
- `components/flow/SourceBackedFlowMapPage.tsx`
- `lib/flow/url-first-lookup.ts`
- `lib/flow/source-backed-my-flow.ts`
- `lib/flow/my-flow-step-export.ts`

## 판단 요약

지금 가장 합리적인 순서는 다음이다.

```text
1. Calendar와 My Flow를 실서비스 실행면처럼 보이게 한다.
2. Public /f에서 Flow 저장과 Step 저장/export 위계를 정한다.
3. URL hit customization의 최소 수정 범위를 calendar event 수준으로 재검토한다.
4. URL miss -> AI draft -> user edit는 P1 concept flow로 준비한다.
5. Studio/creator는 secondary concept validation으로 유지한다.
```
