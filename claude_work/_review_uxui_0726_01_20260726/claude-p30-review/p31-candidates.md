# P31 Candidates (claude_design · P30 review)

원칙: **concrete current-production finding에서만** 도출. 취향·이미 해결 항목 되살리지 않음. 모든 slice는 composition/초점/표기 계층 — source·personal·run·occurrence·export 계약, route/데이터, 4탭 IA 불변. 검토 자체 finding에서 P31-1~4, 소유자 모바일 walkthrough에서 P31-6~9. correction loop(P31-5)는 gated로 보류, 홈·카드(M-5·M-6)는 evidence-gap이라 관찰 후 승격. 후보 pool이 5를 넘으므로 소유자가 top-5 선택.

**권장 top-5**: P31-1 · P31-6 · P31-2 · P31-7 · P31-3 (진입/shape 뼈대 먼저, 밀도·접근성 병렬).

순서: **P31-1(수렴) → P31-2·3·4(병렬) → 관찰 Q1–Q7**. codex_independent가 각 acceptance를 라이브 focus trace·screenshot로 재현.

---

## P31-1 · 공개 진입 문법 수렴 (최우선 · H-1)
- **문제**: `/flow-maps/[map]` legacy 목록 우선 vs `/f` artifact-first — 같은 콘텐츠 다른 첫 화면·동사.
- **dependency**: /flow-maps artifact-first 전환 설계(P30-07 명시 이월); shared save-before 컴포넌트(P29-01A) 재사용.
- **non-goal**: /flow-maps route·source 데이터·map identity 삭제 금지 · projection/export 계약 불변.
- **rollback**: legacy composition을 flag 뒤 보존, no-diff 확인 전 강제 삭제 안 함(ROADMAP 규칙).
- **acceptance (screenshot)**: /f·/flow-maps 두 route 390/1024/1440에서 동일 결정 표면 수 · 동일 primary 동사 캡처.
- **test marker**: `P31-PUBLIC-ENTRY-GRAMMAR-UNIFIED`

## P31-2 · 저장 결정영역 축약 + 동사 통일 (M-1·L-1)
- **문제**: /f 하단 입력+intent 3버튼+조정+시작 공존, 동사 시작/저장 혼선.
- **dependency**: 없음(P31-1과 병렬, 수렴 후 함께 검증 효율적).
- **non-goal**: save payload·dateIntent·projection 계약 불변.
- **rollback**: composition prop 토글 원복.
- **acceptance**: `saveDecisionSurfaceCount==1` · `saveVerbDistinct==1`, 390 캡처.
- **test marker**: `P31-SAVE-SINGLE-DECISION-VERB`

## P31-3 · Calendar grid 키보드 깊이 축소 (M-3 · 접근성)
- **문제**: 월간 grid 날짜가 각각 tab stop → agenda/tabs까지 ~76 정지(production focus trace).
- **dependency**: 없음. ARIA grid roving tabindex 패턴.
- **non-goal**: 날짜 선택 동작·accessible name·시각 레이아웃 불변.
- **rollback**: tabindex 정책만 원복.
- **acceptance**: `calendarFocusStopsToAgenda` 대폭 감소(예 ≤10) + skip link 도달, unnamedFocusable 0 유지, focus trace 캡처.
- **test marker**: `P31-CALENDAR-KEYBOARD-SKIP`

## P31-4 · 월간 cell 색·개수 우선 + varied-name fixture (M-2·M-4)
- **문제**: 대량 시 cell이 축약 벽 · scale 검증이 동명 합성 fixture뿐.
- **dependency**: varied-name scale fixture(테스트용, persistence schema 불변).
- **non-goal**: selected-day full identity·accessible name·Calendar identity 계약 불변.
- **rollback**: cell 렌더 파생 표기만 원복.
- **acceptance**: cell truncated-title 의존 0 · varied-name 50 fixture에서 색·개수 구분 · agenda full title, 1024/1440 캡처.
- **test marker**: `P31-CALENDAR-CELL-IDENTITY`

---

## P31-6 · shape 공통 save-before 뼈대 (owner · H-2, 최우선급)
- **문제**: 이사·결혼·홈트 공개 상세가 서로 다른 화면처럼 읽혀 저장·조정 위치가 학습되지 않음(결혼에서 특히).
- **dependency**: P31-1과 같은 표면 — 함께 설계. shared save-before 컴포넌트 재사용.
- **non-goal**: shape별 결과 종류·projection·export 계약 불변, 포맷 능력 삭제 금지.
- **rollback**: composition prop 토글.
- **acceptance**: 3 shape route 390에서 동일 결과→저장→조정 순서 · 포맷 토글=미리보기 전환만 · 가져가기 미리보기 노출, screenshot.
- **test marker**: `P31-SHAPE-SAVE-BEFORE-SKELETON`

## P31-7 · My Flow 모바일 한 초점 (owner · M-7)
- **문제**: next-action·전체 구조·날짜없음·가져가기가 한 스크롤에 세로로 쌓여 카드 종류 3+ 경쟁.
- **dependency**: 없음. **non-goal**: 데이터·완료/reopen·export 계약 불변, 정보 삭제 금지(접기만).
- **rollback**: 접힘 기본값만 원복.
- **acceptance**: 첫 viewport 강조 카드 1 · 동시 노출 카드 종류 ≤2 · 텍스트량 감소, 390 screenshot.
- **test marker**: `P31-MY-FLOW-SINGLE-FOCUS`

## P31-8 · 캘린더 선택일 상세 sheet/overlay (owner · M-8)
- **문제**: selected-day 상세가 grid 아래로 이어져 시선·스크롤 끊김.
- **dependency**: 기존 undated sheet 패턴 재사용. **non-goal**: Calendar identity·occurrence 계약 불변, wide 우측 pane 유지.
- **rollback**: 표시 방식만 원복.
- **acceptance**: 모바일 상세가 focus trap·Escape·복귀 sheet로, grid 맥락 유지, 390 screenshot.
- **test marker**: `P31-CALENDAR-DETAIL-SHEET`

## P31-9 · 조작 사전 + 제거(보관/삭제) 노출 (owner · M-9·M-10)
- **문제**: 같은 동작이 표면마다 다른 말·컨트롤 · Flow 삭제 위치 불명(보관에 숨음).
- **dependency**: 없음(어휘 결정은 소유자 승인). **non-goal**: 실제 영구 삭제·계정 삭제 gated 유지, archive/exclusion 계약 불변.
- **rollback**: label/노출 매핑만 원복.
- **acceptance**: 동작 사전 1표(조정·제거·날짜 옮기기·완료·가져가기) 전 표면 동일 label·어포던스 · 각 Flow 상세 일관 위치 제거 동작 + 되돌리기, 390 screenshot.
- **test marker**: `P31-OPERATION-VOCAB-UNIFIED`

## P31-5 (보류 · 만들지 않음) · source correction loop
§ service-platform-assessment 가장 약한 사슬이지만 correction 전송·moderation·creator update는 **gated 플랫폼 작업**(ROADMAP Gated Backlog)이며 P30/P31 범위 밖. concrete production 결함이 아니라 미구현 기능이므로 slice로 열지 않고 **관찰(Q7)로 수요를 먼저 확인**한다.

## 관찰로만 닫히는 질문 (P31 A slice 이후)
- Q1 결과→조정→저장 순서가 설명 없이 읽히는가
- Q2 /f·/flow-maps 진입이 같은 Flow로 인지되는가(H-1)
- Q3 저장 화면↔완료 receipt 상태 구분
- Q4 varied-name 20~60 Flow에서 검색 전 스캔 근거(M-2·M-4)
- Q5 실데이터 undated 배치 자연스러움
- Q6 루틴 전체 횟수↔미리보기 창 이해(L-2)
- Q7 source 오류 정정 욕구(correction 수요)

## codex_independent로 닫을 것
scorecard의 not_tested 9건(완료·reopen·라이브 배치/undo·클립보드·reload persistence)을 라이브 클릭으로 재현.
