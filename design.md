# FLOW 디자인 방향서 (design.md)

## 1) Design Identity
FLOW의 디자인 정체성:

> **실행형 위키 + 경험 루트 지도**

> **Executable Wiki + Experience Route Map**

FLOW는 다음 감각을 가져야 한다.
- Wikipedia의 신뢰 구조
- Reddit의 참여 신호
- GitHub의 버전/변경 구조
- AllTrails의 루트 추적 감각
- GOV.UK의 민감 정보 명확성

FLOW는 다음처럼 보이면 안 된다.
- 범용 SaaS 랜딩 페이지
- 귀여운 육아 앱
- Reddit 클론
- Notion 템플릿 클론
- 소셜 피드 앱
- 순수 생산성 앱

## 2) 레퍼런스 제품과 차용 원칙
### Wikipedia / Wikimedia Codex
- 차용: 문서 구조, 제목+요약, TOC, 인포박스, 출처 표기, 리비전/히스토리 로직, 차분한 정보 밀도
- 비차용: 구식 시각 스타일, 읽기 전용 건조함
- FLOW 적용: 공개 플랜 페이지는 “신뢰 가능한 문서 + 즉시 실행 가능” 상태여야 함

### Reddit
- 차용: 카테고리/커뮤니티 감각, 경량 반응, 도움되는 코멘트, “도움 됨”, “막혔어요”, 사용자 footprint
- 비차용: 무한 피드, 카르마 경쟁, 밈 문화, 소음형 댓글, 논쟁 우선 UX
- FLOW 적용: 플랜 아이템 주변 참여에만 제한적으로 사용

### GitHub
- 차용: 버저닝, 이슈형 수정 제안, fork/remix, changelog, 라벨
- 비차용: 개발자 전용 복잡도, 위압적 워크플로
- FLOW 적용: 제작자 수정/리비전/사용자 제안이 구조적으로 검토 가능해야 함

### AllTrails
- 차용: 루트 은유, 난이도, 소요시간, 진행률, 완료 footprint, 완주 후 리뷰
- 비차용: 초반의 지도 중심 UI, 아웃도어 전용 비주얼
- FLOW 적용: 플랜=루트, 항목=마일스톤, 완료=루트 진행

### GOV.UK Design System
- 차용: 명확한 폼, 경고 박스, 접근성, 직설 언어, 신뢰 우선 UX
- 비차용: 과도한 관료적 분위기
- FLOW 적용: 육아/건강/법률/재무 카테고리 우선 적용

### Stack Overflow
- 차용: 태그, 신뢰 신호, 도움됨/채택 개념, 구조화 코멘트
- 비차용: 전문가 배타성, 공격적 분위기

## 3) Core UX Principles
1. Document first, feed later.
2. Trust before delight.
3. Action before reading.
4. Footprints before comments.
5. Source badges must be visible.
6. Risk labels must be visible in sensitive categories.
7. “Copy/export” must always be prominent.
8. The anchor input must be simple.
9. Progress should feel like following a route.
10. Do not overuse the map metaphor in early UI.

## 4) Public Plan Page Layout
권장 구조:

```text
------------------------------------------------
Header
FLOW / Category / Draft Flag Label

[Status badges]
[초안 깃발] [육아] [공식 확인 + 경험자 팁] [의료 주의]

Title
아이 백신·검진 확인 체크리스트

Summary
이번 달 공식 일정을 확인하고 병원 방문 준비를 빠뜨리지 않기 위한 실행 루트입니다.

Anchor Input
[아이 생년월일 or 월령 입력]

Primary Actions
[내 도구로 복사] [CSV 다운로드] [가족에게 공유문 복사]
------------------------------------------------

Main Layout
Left:
- Table of contents / route sections

Center:
- Checklist route items
- Milestones
- Source badges
- Risk notices
- Footprint reactions

Right:
- Info box
  - category
  - structure_type
  - anchor_type
  - status
  - creator
  - source type
  - last checked date
  - version
  - footprint counts

------------------------------------------------
Bottom:
- Footprint summary
- Feedback
- Correction suggestion
- Related next flags
------------------------------------------------
```

## 5) Plan Item Card Design
각 아이템 카드 필수 요소:
- checkbox
- timing
- title
- short description
- source badge
- risk badge (필요 시)
- caution text (선택)
- footprint actions

예시:

```text
□ 병원 예약 필요 여부 확인

시점: 이번 주
출처: 부모 경험 팁
상태: 실행 항목
주의: 접종 가능 여부는 의료진에게 확인하세요.

도움 됨 8 · 막혔어요 2 · 실행 팁 3
```

원칙: 장식적 카드 금지. 소셜 카드가 아니라 **구조화 문서 행**처럼 보여야 한다.

## 6) Badge and Label System
필수 배지 유형:

### Status
- 초안 깃발
- 검증 중
- 검증됨 *(실데이터 이후에만 사용)*
- 업데이트됨
- 보관됨

### Source
- 공식 정보
- 제작자 경험
- 사용자 메모
- 공식 확인 필요

### Risk
- 낮은 위험
- 주의 필요
- 의료 주의
- 법률 주의
- 재무 주의

### Structure
- timeline
- phase
- routine
- checklist

### Footprint
- 복사됨
- CSV 내보냄
- 체크됨
- 공유됨
- 막혔어요

## 7) Color System
문서 중심의 차분한 베이스 사용.

- Background: `#F8F7F4` or `#FAFAF8`
- Surface: `#FFFFFF`
- Text: `#1F2933`
- Muted Text: `#6B7280`
- Border: `#E5E7EB`
- Primary: `#2563EB`
- Warning: `#A16207`
- Success: `#15803D`
- Danger: `#B91C1C`

카테고리 컬러:
- Moving: `#1264F0`
- Wedding: `#6D28D9`
- Travel: `#15803D`
- Parenting: `#A16207`
- Workout: `#B91C1C`
- Finance/Health: `#0F766E`

금지: 과한 그라디언트, 지나치게 유희적인 비주얼(민감 카테고리).

## 8) Typography and Density
- 중~고밀도 문서형 타이포그래피 지향
- 명확한 계층 구조 유지
- 제품 화면에서 대형 SaaS 히어로 섹션 지양
- 컴팩트 배지 사용
- 액션 버튼 상시 가시성 확보
- 긴 체크리스트 스캔 가능성 우선
- 필요 시 섹션 디바이더/스티키 요약 사용

페이지는 마케팅 랜딩보다 “실행 컨트롤이 있는 신뢰 문서”에 가까워야 한다.

## 9) Creator Editor UX
흐름: **쓰기 → 다듬기 → 미리보기/발행**

### Step 1. 쓰기
입력 예시:

```text
# 이사 D-30 준비
- 이사업체 견적 3곳 받기 D-30
- 인터넷 이전 설치 신청 D-14
- 전입신고 준비 D-3
@매주
! 실수하기 쉬운 팁
```

### Step 2. 다듬기
파싱 테이블: `항목 | 시점 | 타입 | 출처 | 위험도`

수정 가능 필드:
- title
- description
- day_offset
- repeat_type
- source_type
- risk_level
- order

### Step 3. 미리보기/발행
- 공개 플랜 프리뷰 표시
- 액션: `save draft`, `publish`, `copy public link`

원칙: Stage 0/1에서는 제작자 플로우를 복잡하게 만들지 않는다.

## 10) Footprint UX
“footprint”를 핵심 UX 개념으로 사용한다. 범용 댓글 시스템을 주 피드백 수단으로 두지 않는다.

우선 신호:
- copied
- exported
- checked
- shared
- stuck
- helped
- corrected
- completed

표시 예시:

```text
발자국
👀 열람 24
📋 복사 8
✅ 체크 5
💬 막힘 2
```

Stage 0에서는 수동/모의 데이터도 허용되지만, UI는 발자국 개념 학습을 유도해야 한다.

## 11) Sensitive Category UX
육아/건강/법률/재무 카테고리에서는 항상 아래를 표시:
- source type
- caution notice
- last checked date (가능 시)
- official source link (가능 시)
- 공식 정보 vs 경험 팁 분리

권장 주의 문구:

> 이 항목은 경험자 팁입니다. 아이의 건강 상태나 접종 가능 여부는 의료진 또는 공식 안내를 확인하세요.

백신/검진 첫 깃발 원칙:
- FLOW가 일정 권위자가 되어선 안 됨
- FLOW는 공식 일정 확인과 방문 준비를 돕는 도구로 표현

## 12) Stage 0 Demo Design Rules
포함해야 할 것:
- first flag concept
- scenario switcher
- structure type display
- anchor input
- checklist
- progress
- copy text
- CSV download
- share text copy
- creator mock
- validation board

포함하면 안 되는 것:
- real login
- database-heavy UI
- AI auto-generation
- payment
- full community
- advanced dashboard
- too many categories

권장 라벨:
- 초안 깃발
- Stage 0 검증용
- 검증 전
- 공식 확인 필요

금지 라벨(실데이터 전):
- 검증된 루트
- 검증된 부모 플랜
- 완성된 경험 지도

## 13) Anti-Patterns
1. Too Reddit-like → 토론 커뮤니티화되어 실행 도구 정체성 약화
2. Too Wikipedia-like → 읽기 전용/건조한 UX
3. Too Notion-like → 템플릿 제품으로 오인
4. Too SaaS-like → 민감 정보 신뢰 저하
5. Too map-heavy too early → 추상 비전 과잉, MVP 검증 저해
6. Too cute for parenting → 의료/검진 맥락 신뢰 하락
7. Too many features → 복사/내보내기/체크 검증 신호가 가려짐

## 14) Final Design Sentence
> FLOW should feel like a trustworthy wiki page that turns into a route the user can immediately follow.

> FLOW는 믿을 수 있는 위키 문서처럼 읽히되, 사용자가 즉시 따라갈 수 있는 실행 루트로 작동해야 한다.
