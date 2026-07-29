# FlowMe UX/UI 재검토 — P0~P2 이후 · P4 백로그

- 작성일: 2026-07-04
- 기준 commit: `c4ba63d730f9c70b824683032abcbadeb9449dfb`
- 근거: `review.html` · `audit.md` · `route-evidence.json` · 모바일 390×844 스크린샷 8장 + 소스(`components/flow/AppClient.tsx`, `PlatformNav.tsx`, `ArtifactWorkbench.tsx`, `SourceBackedFlowMapPage.tsx`, `app/globals.css`)
- 전제: **Vercel preview 미사용**, GitHub 소스·문서·JSON·스크린샷만으로 판단
- 시각 버전: 같은 폴더의 `claude-design-p4-audit-2026-07-04.html`

---

## 한 줄 판단

**저장 *전* 여정은 이제 실행형 앱처럼 보인다. 저장 *후* 여정은 — evidence상 — 아직 증명되지 않았다.**

| 구분 | 내용 |
| --- | --- |
| 확실히 좋아진 것 | 홈 모바일 primary CTA(01), Flow 찾기 단일 헤더+카드 압축(02), 지도 hero 압축+sticky 상태기계(03·04), 빈 상태 단일 CTA+토큰 정리(06), 가로 overflow 0, 내부어 ASCII 스캔 0건 |
| 이번 루프 핵심 결함 | **07·08(저장 후 My Flow / 캘린더)이 빈 상태로 찍힘** — 저장 후 허브가 evidence로 증명 안 됨. 공개 `/f/` 제목 "…Flow" 접미 잔존(05). 공개 `/f/` 옛 톤(slate/gray)+이중 입력 동선(05) |
| 아직 설명형 잔재 | 홈 하단 "시작 경로" 4단계 설명 카드(01), 홈 추천 카드 3분할(01), 공개 `/f/` 상세(05) |

> **근거 한계 명시.** 07·08의 빈 상태는 (a) 스크린샷 하네스가 저장 데이터를 렌더에 못 실었거나, (b) 첫 페인트에서 빈 상태가 먼저 뜨는 실제 회귀 — 둘 중 하나다. 소스(`postSaveContinuationRows`, fallback 큐)는 존재하므로 (a) 가능성이 높지만, **screenshots-only 기준에서는 저장 후 실행 허브가 증명되지 않았다.** P4에서 채워진 상태 evidence를 만들어 확정해야 한다.

---

## 1. Route별 UX/UI 평가

| route | 상태 | 좋음 | 남은 문제 / 혼란 | screenshot |
| --- | --- | --- | --- | --- |
| `/` 홈 | 첫 행동 OK | hero 전폭 CTA 모바일 노출(P0-01) | CTA 아래 추천 3분할 + "시작 경로" 4단계 설명 카드 → 홈이 "사용법 읽는 페이지"로 끝남 | 01 |
| `/flows` | 양호 | 단일 헤더 + 카드 압축(P1-01/02) | "12개 콘텐츠" pill이 시선 뺏음(경미). 손대지 않아도 됨 | 02 |
| `/flow-maps/moving-d30`, `/…/middle-school-math-1` | 양호 | hero 압축 + sticky 상태기계 + fallback 유지 | 결과 약속 한 줄이 2줄 넘게 김. 원문 제목 "**AJD** 이사 준비…" 코드 접두 노출 | 03·04 |
| `/f/vehicle-inspection-prep` 공개 상세 | **가장 약함** | 결과·입력·먼저 할 일·CTA가 hero에 모임 | ① 제목 "…준비 **Flow**" 접미(P0-05 잔여) ② hero 3장 테두리 카드로 무거움 ③ hero 버튼 + 아래 input **날짜 입력 2번** ④ slate/gray/blue-700 톤 어긋남 ⑤ 4탭 없음, 우상단 "내 Flow"가 nav처럼 보임 → 시작점 갈리고 "같은 앱" 신뢰 흔들림 | 05 |
| `/my` 빈 상태 | 좋음 | 단일 CTA + 저장 후와 같은 골격(P2-02) | 없음(이상적) | 06 |
| `/my?savedMap=moving-d30`, `/calendar` | **증거 불일치** | — | 저장 후 상태인데 **둘 다 빈 상태로 캡처**("먼저 고르세요"). route-evidence도 H1만 기록. 실제 회귀라면 최악의 신뢰 붕괴, 하네스 문제라도 실행 허브 증거 없음 | 07·08 |
| 특수 workbench (`ArtifactWorkbench.tsx`) | 톤 미정리 | export 라벨은 통일(P2-01) | 전반이 `border-slate-200 bg-slate-50 text-blue-700` 등 옛 유틸. 주요 route와 색·라운드 달라 일관성 약화 위험(스크린샷 evidence 없음) | 소스 |

---

## 2. Blocking / High / Medium / Low

### Blocking — 사용 흐름을 막음
- **BL-1 · 저장 후 실행 허브가 evidence로 증명되지 않음 (07·08)** — 저장 직후 `/my?savedMap=`·`/calendar`가 빈 상태로 캡처. 실제 회귀면 신뢰 붕괴, 하네스 문제라도 "실행 앱" 증거 없음. → 채워진 상태 재현 + 첫 페인트 가드(P4-01).

### High — 첫 행동·저장 후 실행·이해를 크게 방해
- **HI-1 · 공개 `/f/` 제목 "…Flow" 접미 + 이중 입력 동선 (05)** — 공유 첫 화면에 내부어, 시작점 갈림. 제목 접미 제거 + input 하나로 통합(P4-02).
- **HI-2 · 공개 `/f/` app shell 정책 미결 (05)** — 4탭 없는 상태가 "공유 전용"인지 "누락"인지 미정. 공유 shell로 **유지하되** 단일 저장 CTA로 좁힘(P4-03, §7).
- **HI-3 · 홈이 아직 설명형으로 끝남 (01)** — 4단계 카드 제거, 추천 결과 한 줄 압축(P4-04).

### Medium — 밀도·문구·카드 위계
- **ME-1** 특수 workbench 톤 통일(slate/gray → FlowMe 토큰) — P4-05
- **ME-2** 지도 원문 제목 "AJD" 접두 제거 — P4-06
- **ME-3** 지도 결과 약속 한 줄 길이 압축 — P4-06
- **ME-4** `/flows` "12개 콘텐츠" pill 강등 — P4-04 묶음

### Low — polish · spacing · tone
- **LO-1** 공개 `/f/` 신뢰 칩 2개 1줄 정돈
- **LO-2** 지도 본문 문단 2줄 클램프 + 접힘
- **LO-3** 로고 "FLOW" / FlowMe / "내 Flow" 표기 기준 1개
- **LO-4** `.premium-dark` slate 오버라이드 범위 검토

---

## 3. 바로 개발 가능한 P4 백로그

### P4-01 · [Blocking] 저장 후 실행 허브 증거 확정 + 첫 페인트 가드
- **목표**: 저장 직후 `/my?savedMap=`·`/calendar`가 항상 "다음 할 일/일정"부터 보이고, 빈 상태 CTA가 첫 페인트에 먼저 뜨지 않는다.
- **화면**: MyFlows post-save/today, calendar surface, route-evidence 생성 스크립트
- **지시**: ① 저장 상태를 실제 localStorage에 심은 뒤 07·08 재캡처(채워진 Today + agenda). ② 저장 레코드/`savedMap` 파라미터 존재 & hydration 전이면 빈 CTA 대신 스켈레톤/로딩 렌더. ③ `postSaveContinuationRows`가 비면 fallback 큐(오늘→밀림→다음→날짜없는 첫 항목)로 최소 1개 보장.
- **완료 기준**: 07은 방금 저장한 콘텐츠의 먼저 할 일 카드, 08은 2026-07-22 일정+agenda가 첫 뷰포트에. 빈 상태 문구 미노출.
- **검증**: 저장 후 route evidence 재생성 + Playwright(저장→/my 실행 카드 존재, "먼저 고르세요" 부재 단언).

### P4-02 · [High] 공개 `/f/` 제목 "Flow" 접미 제거 + 입력 동선 단일화
- **목표**: 공유 첫 화면에서 내부어 제거, 시작 지점 하나로.
- **화면**: `/f/[slug]` hero(PublicFlow), seed 제목 데이터
- **지시**: ① 제목 "자동차검사 D-14 준비 ~~Flow~~" → "자동차검사 D-14 준비"(표시 레이어에서 "~Flow" 접미 스트립, 데이터 원본 보존). ② date input 1개만 — hero "검사일 입력으로 시작"은 그 input으로 스크롤+포커스+하이라이트(지도 sticky 패턴), 아래 중복 input 제거/동일 참조.
- **완료 기준**: 제목에 "Flow" 없음, input 1개, hero 버튼이 input 포커스.
- **검증**: 금지어 스캔에 "~ Flow$" 패턴 추가, /f/ 입력 포커스 e2e.

### P4-03 · [High] 공개 `/f/`를 "공유 shell"로 확정 + 단일 저장 CTA
- **목표**: 4탭 없는 상태를 의도된 공유 화면으로 확정, 목적을 저장 하나로.
- **화면**: `/f/[slug]` shell, 상단 우측 "내 Flow" 버튼
- **지시**: ① 하단 persistent sticky "내 Flow에 저장" 1개(4탭 대신). ② 우상단 "내 Flow"는 저장 이력 있을 때만 노출. ③ 저장 완료 → `/my?savedMap=`(4탭 앱 shell). ④ 상단 얇은 "FlowMe" 워드마크로 출처만.
- **완료 기준**: 공유 화면 주행동이 저장 1개로 명확, 저장 후 앱 shell 연속.
- **검증**: /f/ 진입 시 sticky 저장 CTA 존재, 저장 후 4탭 shell 진입 e2e.

### P4-04 · [High] 홈을 설명서에서 입구로
- **목표**: CTA 아래를 "행동을 돕는 것"만.
- **화면**: HomeLanding (≈L1607~)
- **지시**: ① "시작 경로" 4단계 설명 카드 제거. ② 추천 카드 3분할 → 결과 한 줄("이사일만 넣으면 D-30 일정 · 할 일 5개"). ③ 추천 1~2장, 나머지 /flows로. ④ (묶음) `/flows` "12개 콘텐츠" pill 캡션 강등(ME-4).
- **완료 기준**: 홈 스크롤이 CTA→추천 1~2장에서 끝, 4단계 설명 없음.
- **검증**: 홈 첫 2뷰포트 스크린샷, "시작 경로" 텍스트 부재 단언.

### P4-05 · [Medium] 특수 workbench 톤을 FlowMe 토큰으로 통일
- **목표**: 공개 artifact/기록표/루틴 화면이 주요 route와 같은 앱처럼.
- **화면**: `ArtifactWorkbench.tsx` 전반
- **지시**: `border-slate-200 bg-slate-50 text-blue-700 text-gray-950` 등 잔여 유틸을 FlowMe 토큰(`--flowme-border/soft/action/text`, card 16px·button 12px radius)으로 매핑. 공통 카드/버튼 클래스 상수 사용처 확대. **export 파일 로직·`data-testid`·문구 변경 금지.**
- **완료 기준**: workbench route에서 slate/gray/blue-700 잔존 0(다크 오버라이드 제외).
- **검증**: design token rhythm Playwright 확장, 대표 workbench 스크린샷.

### P4-06 · [Medium] 지도 상세 문구 다이어트
- **화면**: SourceBackedFlowMapPage / 지도 hero·원문 섹션
- **지시**: ① 원문 제목 "AJD" 등 코드 접두 사용자 표면 제거. ② 결과 약속 "이사일만 넣으면 D-30 일정으로 저장 · 체크·메모 포함"으로 2줄 이내 압축. ③ 본문 문단 2줄 클램프+접힘(LO-2).
- **완료 기준**: 결과 약속 ≤2줄, 접두 토큰 미노출.
- **검증**: 지도 hero 스크린샷, 접두 패턴 스캔.

### P4-07 · [Low] 브랜드 표기 + 다크 오버라이드 정리
- **지시**: 로고/서비스명/탭 표기 기준 1개(LO-3). 정식 다크 계획 없으면 `.premium-dark` slate 오버라이드 축소(LO-4). 신뢰 칩 1줄 정돈(LO-1).
- **완료 기준**: 표기 1종, 불필요 오버라이드 정리.
- **검증**: 시각 리뷰.

**착수 순서**: P4-01 → P4-02·03 → P4-04 → P4-05·06 → P4-07. 앞 4개까지가 "실행형 앱"이라고 자신 있게 말할 수 있는 선.

---

## 4. P0~P3 닫힌 항목 중 재오픈

- **재오픈 · P0-02(저장 후 첫 실행 항목)** — "완료"로 닫혔으나 07·08 evidence가 빈 상태. 코드는 있으나 사용자가 보는 결과가 증명 안 됨. 기존 evidence(H1만 기록)로는 부족. → P4-01.
- **재오픈 · P0-05(내부 계층 언어)** — ASCII 스캔 0건이나 한글 접미 "…준비 Flow"가 /f/ 제목에 남아 스캔 통과(05). 콘텐츠 제목의 개체명 접미는 금지 대상. → P4-02(스캔 규칙 보강 포함).
- **부분 재오픈 · M1/L1(홈 설명 카드)** — 이전 지적한 "시작 경로" 4단계+추천 3분할이 이번 P0~P2 범위 밖이라 잔존(01). 회귀 아닌 **미착수**. → P4-04.
- **재오픈 없음 · P1·P2 대부분** — Flow 찾기 헤더/카드(P1-01·02), 지도 hero(P1-04), sticky 상태기계(P0-03), 빈 상태(P2-02), export 라벨(P2-01), fixed layer(P2-03), 토큰(P2-05)은 evidence·소스로 확인. **재오픈 불필요.**

---

## 5. 유지해야 할 것

**유지할 UX 기준선**
- 4탭 IA(홈 · Flow 찾기 · 캘린더 · 내 Flow)
- 저장 전 보기 → 저장하고 시작 → 먼저 할 일 루프
- 결과 중심 export 라벨 3종 + 상수화
- 원문·근거·메모 접힘 보존
- read-first My Flow 상세, 오늘/전체 2탭
- 가장 가까운 일정 자동 선택 + agenda-first 캘린더
- 단일 CTA 빈 상태

**건드리면 위험한 파일/개념**
- `storage.ts` 키·스냅샷 스키마
- `source-backed-my-flow.ts` seed 병합/dedupe
- `sourceTrace`·`sourceUrl` 데이터(표시만 정리, 삭제·가공 금지)
- `export.ts` 파일 생성 로직·`data-testid`
- 앵커 날짜 재계산·recurrence(문구 변경과 분리)
- P4-02/06의 "제목 정리"는 **렌더 표시만**, seed 원본 문자열 보존

**지금은 하지 말 것**: 새 기능·새 탭·IA 변경 / AppClient.tsx 대규모 분할 / 공개 `/f/`를 4탭 앱 shell로 강제 편입(공유 shell 유지가 맞음) / 계정·서버 저장.

---

## 6. Revised spec

### 6.1 공개 `/f/` 상세 — "공유 shell"로 확정 (감사 open question 답)

**결정 — 4탭에 맞추지 말고 공유 shell로 유지한다.** 근거: `/f/`는 공유 링크로 앱 밖에서 처음 진입하는 화면이다. 4탭을 붙이면 "내 것도 없는데 내비게이션부터" 주는 꼴이라 저장 전환을 흐린다. 공개 문서 뷰(노션·구글닥 공유)처럼 탐색이 아니라 **단일 행동(저장)에 집중**시키는 게 맞다.

지켜야 할 3가지:
1. 하단 persistent **"내 Flow에 저장"** sticky 1개(4탭 대체)
2. 저장 완료 → `/my?savedMap=`로 이동해 거기서부터 4탭 앱 shell
3. 상단은 얇은 "FlowMe" 워드마크로 출처만. 우상단 "내 Flow"는 저장 이력 있을 때만

### 6.2 Copy 변경

| 위치 | 현재 | 제안 |
| --- | --- | --- |
| `/f/` 제목 | 자동차검사 D-14 준비 Flow | 자동차검사 D-14 준비 |
| `/f/` 주 CTA | 검사일 입력으로 시작 + (아래) 입력 | 하단 sticky "내 Flow에 저장" · hero 버튼은 입력으로 스크롤 |
| 지도 원문 제목 | AJD 이사 준비 체크리스트 | 이사 준비 체크리스트 |
| 지도 결과 약속 | 이사일만 넣으면 저장됩니다: D-30 일정 + 이사 전 체크 + 연락처·예약번호 메모 | 이사일만 넣으면 D-30 일정으로 저장 · 체크·메모 포함 |
| 홈 추천 카드 | 입력 이사일 / 저장 D-30 일정 / 결과 5개 할 일 (3분할) | 이사일만 넣으면 D-30 일정 · 할 일 5개 (한 줄) |
| 홈 4단계 카드 | 시작 경로 · 고르고 저장하고 이어가기 … | (제거) |

> 모든 "제목 정리"는 렌더 표시만 바꾸고 seed 원본 문자열은 보존.

---

## 7. 최종 판단

- **설명형 vs 실행형** — 저장 전은 실행형(홈·Flow 찾기·지도가 행동/결과 중심). 저장 후는 미확정(07·08 빈 상태). 공개 `/f/`만 설명형 잔재.
- **처음 온 사용자, 5초** — 홈에선 이해한다(약속 + 단일 CTA). 스크롤 시 설명 카드가 동력 깎음(P4-04). 공유 `/f/`로 온 경우 시작점 갈려 5초 통과 약함(P4-02·03).
- **저장 후 다음 행동** — 코드 경로는 설계됐으나 evidence로는 안 보임. 반복 사용자에게 빠른 실행 허브인지 채워진 07·08 없이 단언 불가 — P4-01의 존재 이유.

**상용 앱 대비 아직 가장 약한 화면 3**
1. **저장 후 My Flow / 캘린더 (07·08)** — 실행 허브 증거 공백. 최우선.
2. **공개 Flow 상세 `/f/` (05)** — 내부어 접미 + 이중 입력 + 옛 톤 + shell 미정. 밀도 최고.
3. **홈 하단 (01)** — CTA 아래가 설명서로 끝남.

---

*스크린샷: [01](./screenshots/01-home-mobile.png) · [02](./screenshots/02-flows-mobile.png) · [03](./screenshots/03-flow-map-moving-mobile.png) · [04](./screenshots/04-flow-map-math-mobile.png) · [05](./screenshots/05-public-vehicle-inspection-mobile.png) · [06](./screenshots/06-my-empty-mobile.png) · [07](./screenshots/07-post-save-my-flow-mobile.png) · [08](./screenshots/08-calendar-after-save-mobile.png)*
