# Validation Fix · Design Reference

**Date:** 2026-05-26
**Scope:** validation-routes-ux-review.md에서 도출된 3개 라우트 (CS-D30 / diet-habit-2week / new-car-delivery-check)의 Before/After를 한 캔버스에 정리한 인터랙티브 visual reference.

## 여는 법

`flowme.html`을 브라우저에 직접 열면 됩니다.

```bash
open flowme.html
# 또는
npx serve .
# 또는
python -m http.server 8000
```

CDN(unpkg)에서 React/Babel을 로드하므로 인터넷 연결이 필요합니다.

## 캔버스 구성

| 섹션 | 목적 | 아트보드 수 |
|---|---|---|
| 0 · UX 분석 | design.md / agent.md 기반 화면 설계안 (감사 doc과 별개의 초기 정리) | 1 |
| **1 · CS-D30 Fix** | A1 + A2 + A4 묶음. testable_content.md의 첫 observed-session 후보. | 5 |
| **2 · Diet Fix** | A3 — decision/principle/observation을 한 list에 섞지 않기. health-sensitive. | 5 |
| **3 · NewCar Fix** | A6 — 보류 기준 + 증거 시트 + 보류 메모 + 보류 카운터 CTA. money-at-risk. | 5 |
| 4 · 데스크톱 timeline | 이사 D-30 일반 패턴 | 2 |
| 5 · 데스크톱 routine | 운동 4주 루틴 | 1 |
| 6 · 데스크톱 phase | 이유식 단계별 (민감) | 1 |
| 7 · 데스크톱 checklist | 신차 인수 점검 (일반 패턴) | 1 |
| 8 · 모바일 | 첫 뷰포트 산출물 노출 | 5 |
| 9 · 시스템 | 색상·배지·버튼·카피 기준 | 1 |

## 캔버스 조작

- **휠/트랙패드** — 팬, **Ctrl+휠** — 줌
- 아트보드 라벨 **클릭** — 풀스크린 focus 모드 (←/→/Esc)
- 아트보드 **드래그** — 같은 섹션 안에서 재정렬

## 섹션 1·2·3 핵심

각 섹션은 동일한 패턴으로 구성:

1. **Rationale doc** — 변경 근거 + 다른 라우트로의 복제 가이드 + PR 단위
2. **데스크톱 BEFORE** — 빨간 핀 3개로 문제 짚음
3. **데스크톱 AFTER** — 초록 핀 3개로 수정안
4. **모바일 BEFORE** — 폰 베젤 + 빨간 핀
5. **모바일 AFTER** — 폰 베젤 + 초록 핀

핀 번호는 같은 섹션 안에서 BEFORE의 문제와 AFTER의 해결을 1:1 매칭함.

## 컴포넌트 import 순서 (flowme.html)

```html
<script type="text/babel" src="design-canvas.jsx"></script>      <!-- 캔버스 starter -->
<script type="text/babel" src="tokens.jsx"></script>              <!-- FM 색상 토큰 + Icon/Badge/Btn/Card/SecHead -->
<script type="text/babel" src="flow-parts.jsx"></script>          <!-- TopBar/MetaRow/AnchorBar/ArtifactCard/CalendarMini -->
<script type="text/babel" src="analysis.jsx"></script>            <!-- 초기 UX 분석 doc -->
<script type="text/babel" src="flow-desktop.jsx"></script>        <!-- ScreenMoving/CarDelivery/Empty -->
<script type="text/babel" src="flow-routine.jsx"></script>        <!-- ScreenRoutine + MobileRoutine -->
<script type="text/babel" src="flow-phase.jsx"></script>          <!-- ScreenBabyFood + MobileBabyFood -->
<script type="text/babel" src="flow-mobile.jsx"></script>         <!-- MobileMoving/Empty/Car -->
<script type="text/babel" src="cs-d30-fixes.jsx"></script>        <!-- CS-D30 BEFORE/AFTER + helpers Pin, FrameLabel, CSFrame, CSMobileShell -->
<script type="text/babel" src="flow-diet-fixes.jsx"></script>     <!-- Diet BEFORE/AFTER -->
<script type="text/babel" src="flow-newcar-fixes.jsx"></script>   <!-- NewCar BEFORE/AFTER -->
<script type="text/babel" src="app.jsx"></script>                 <!-- 캔버스 composition -->
```

`cs-d30-fixes.jsx`에서 정의한 `Pin / FrameLabel / CSFrame / CSMobileShell`을 diet, newcar 파일이 재사용한다.

## Babel 글로벌 스코프 주의

`<script type="text/babel">`는 각각 자기 스코프에서 컴파일된다. 컴포넌트를 다른 파일이 쓰려면 파일 끝의 `Object.assign(window, { … })`로 명시적으로 노출해야 한다. 이 캔버스의 모든 컴포넌트가 그렇게 노출돼 있다.

## 캔버스 상태

페이지 옆에 `.design-canvas.state.json`이 있으면 (Omelette runtime에서 편집한 경우) 아트보드 순서/이름 변경이 보존됨. 없으면 코드 순서 그대로 렌더.
