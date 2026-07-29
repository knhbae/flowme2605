# P30 Independent Design Review — Severity Findings (claude_design)

전체 판정 `bounded_revision`(High 2·Medium 10·Low 3; H-2·M-5~M-10은 소유자 production 모바일 walkthrough 보강). 모든 조치는 composition/초점/표기 계층이며 source·personal·run·occurrence·export 계약, 4탭 IA, public /f를 바꾸지 않는다. 이미 해소된 P29 항목·취향 차이를 새 백로그로 되살리지 않았다.

## 판정 근거 경계

- `current_source`: P30 package(README/audit/route-evidence/journey-results/production-smoke/screenshot-manifest) + 제품 docs 정독.
- `current_package_screenshot`: production smoke 13 + 구현 17 캡처 직접 확인. production 화면 판단의 1차 근거.
- `current_production_interaction`: production focus-order trace(/my, /calendar) 분석.
- `inaccessible`: 라이브 클릭·세션 reload persistence 미수행 → 실행 결과 `not_tested`.
- 자동 E2E 304/304·smoke 13/13은 구조·계약 증거이지 사용성 증거가 아니다. observed users 0.

## High

### H-1 · 공개 진입 문법 이원화 (최상위 여정 단절)
- **route/viewport**: `/f/moving-d30-basic` vs `/flow-maps/moving-d30` · 390/1024/1440
- **재현**: 같은 이사 콘텐츠에서 `/f`는 결과(캘린더/체크리스트 미리보기) 우선 + primary `날짜 없이 시작`, `/flow-maps`는 번호 단계 목록(1~5) 우선 + `그대로 시작 / 내게 맞게 조정`. 정보 순서·동사·조정 모델이 서로 다르다.
- **기대/실제**: PRODUCT_PRINCIPLES "첫 화면은 어떤 실행 artifact가 되는지 답한다" + 단일 저장 문법 기대. 실제로 P30-07은 `/f` dead conditional만 제거하고 `/flow-maps`는 active consumer라 legacy를 명시 보존(`removalDecision: deferred_active_consumer`).
- **사용자 영향**: 검색/원문으로 `/flow-maps`에 온 사용자와 공유 링크로 `/f`에 온 사용자가 다른 제품을 경험. 재접점에서 학습 전이 실패, provenance 신뢰 저하.
- **evidenceKind**: current_package_screenshot(두 production 캡처) + current_source(route-evidence P30-07)
- **조치/후보**: `/flow-maps`를 artifact-first로 수렴(legacy는 rollback flag 보존) → **P31-1**

### H-2 · 콘텐츠 shape별 공개 상세 비일관 (owner walkthrough)
- **route/viewport**: `/f/*` (이사=체크리스트, 결혼=타임라인, 홈트=루틴) · 390
- **재현**: 소유자가 production 모바일에서 이사·결혼·홈트 상세를 훑은 결과, 레이아웃이 shape마다 완전히 달라 조작 흐름이 전이되지 않음. 결혼(타임라인)은 pane 분할 구분이 약하고, 포맷 3개 중 하나를 골라도 그 안에서 저장·수정이 이어지지 않고 카드가 세로로 쌓여 "여기서 하라"가 없음. 날짜 정하기/없이/예시 버튼 뒤 다음 행동 불명, 가져가기 미리보기 없음, 전체 Flow 구조 이해 안 됨. 홈트는 실행/캘린더/메모가 루틴 수·설정에 따라 조건부로 보여야 함.
- **사용자 영향**: 두 번째 콘텐츠에서 처음부터 다시 헤맴 — 최대 comprehension 리스크.
- **evidenceKind**: owner_walkthrough(production 모바일) + current_package_screenshot(My Flow 결혼 detail·allblanc /f). `/f` 결혼 public 상세 직접 캡처는 evidence-gap(codex 라이브 캡처 권장).
- **조치/후보**: shape 공통 뼈대(결과→하나의 저장 결정→그 자리 조정→구조·출처 접힘), 포맷 토글=결과 미리보기 전환만, 가져가기 미리보기 필수, 홈트 조건부 노출 → **P31-6**

## Medium

### M-1 · /f 저장 결정영역 3구획 + 동사 혼선
- `/f/moving-d30-basic` 390/1440. 행별 수정 밀도는 P30-03로 해소(초기 row-edit 0)됐으나, 결정 영역에 이사일 입력 + intent 3버튼(정하기/없이/예시) + 조정 + primary `시작`이 peer 공존. 동사 `시작`↔receipt `저장`↔`/flow-maps` `그대로 시작` 갈림. evidence: current_package_screenshot + heuristic. 조치: anchor inline·intent를 조정으로·동사 `저장` 통일 → **P31-2**.

### M-2 · 월간 grid 축약 제목 벽
- `/calendar?demo=ux50` 1024/1440. compact identity 도입·selected-day full identity 보존은 확인. 그러나 대량 시 cell이 `이사 준비 F…` 축약 반복 → 색 initial+`+N`만 실질 구분자. 주의: ux50 fixture가 동명 다수라 과장 가능(heuristic + fixture_only). 조치: cell 색·개수 우선, 축약 의존 제거, 상세는 selected-day → **P31-4**.

### M-3 · Calendar 모바일 키보드 깊이 ~76 (접근성)
- `/calendar?demo=ux20` 390. production focus trace: headerIndex 0 → workspaceIndex 3 → tabsIndex 76, ordered:true. P30-02 목표(본문 우선)는 달성했으나 grid 날짜 40여 개가 개별 tab stop이라 agenda/tabs 도달까지 ~76 정지. accessible name 전부 존재(unnamedFocusable 0). evidence: current_production_interaction + current_source. 조치: grid roving tabindex + skip-to-agenda → **P31-3**.

### M-4 · scale·undated fixture 관찰 공백 (evidence gap)
- `/calendar?demo=ux50`(option 62, collapse) 및 undated(10→8→undo10)는 구조상 scale/작동하나, 62개가 동명 합성이라 검색 전 스캔 불가·undated는 deterministic fixture. 실데이터 varied-name 발견성·배치 자연스러움 미관측. evidence: fixture_only + current_package_screenshot. → 관찰 Q4·Q5.

### M-5 · 홈↔Flow 찾기 IA 중복 (owner walkthrough)
- 홈이 최근/인기 Flow를 보이면 `/flows`와 목적 중첩. 방향: 최근/인기는 찾기, 홈은 "이어서 실행"+"사람들이 이렇게 씀". 신뢰 신호는 실데이터 또는 명시 "예시" 라벨만(미검증 인기 금지, P26-06). evidence: `evidence-gap`(홈/찾기 미캡처) + 개념. → 관찰 Q8.

### M-6 · Flow 찾기 카드 정보구조 (owner walkthrough)
- 원문=클릭 가능한 링크, CTA `더보기`, 이사일/D-30/생활일정/할일5개 chip은 카드에서 낮추고 상세로, 신뢰 신호(사용/후기 수)는 실데이터 또는 "예시" 배지로. 카드=콘텐츠·검증 출처·결과·첫 행동. evidence: 부분(source P26-06). → 관찰 Q10.

### M-7 · 내 플로우 모바일 밀도·이질 카드 혼재 (owner walkthrough)
- next-action 카드+전체 Flow outline+날짜없음 카드+가져가기가 한 스크롤에 세로로 쌓여 카드 종류 3+ 경쟁, 글씨 많음. 방향: 한 화면 한 초점 — 다음 행동 1개만 강조, 나머지 접기/보조, 텍스트 감량. evidence: validated(모바일 My Flow 캡처). → **P31-7**

### M-8 · 캘린더 선택일 상세를 sheet/overlay로 (owner walkthrough)
- selected-day agenda가 grid 아래로 이어져 시선·스크롤 끊김. 방향: bottom sheet/overlay(undated sheet 패턴 재사용), grid 맥락 유지. evidence: validated(캘린더 캡처). → **P31-8**

### M-9 · 조작 어휘·어포던스 비일관 (owner walkthrough)
- 같은 성격의 동작이 표면마다 다른 말·컨트롤: 조정(`내게 맞게 조정`/`조정`/`항목 고르기·날짜·순서`/`여러 할 일 조정`), 시작/저장(시작·그대로 시작·저장), 제거(보관·항목 제외·영구 삭제 부재), 날짜(`날짜 옮기기`·편집기 필드), 완료(체크박스/다시 열기). 방향: 동작 사전 1개 — 동작마다 한 단어·한 어포던스로 통일(설명 추가 아님). evidence: owner_walkthrough + current_package_screenshot + current_source(P25/P26 편집). → **P31-9**

### M-10 · Flow 삭제/제거 발견성 (owner walkthrough)
- My Flow에 보이는 명령은 열기·메모·여러 할 일 조정·가져가기·더보기·데이터 관리·스튜디오뿐, 명시적 "삭제" 미노출. 제거=보관(archive)이며 데이터 관리/상세 overflow 메뉴에 숨음(P30-04). 영구 삭제는 gated(ROADMAP). 정신모델(삭제)↔제품모델(보관) 어긋남 + 진입 은닉 = dead-end. 방향: (a) 각 Flow 상세 일관 위치(⋯)에 제거+되돌리기, (b) 어휘 `삭제`로 하되 복구 가능한 보관임을 되돌리기로 명시, (c) 영구 삭제 gated 정직히. evidence: owner_walkthrough + current_package_screenshot + current_source(archive/data-manager). → **P31-9** + 관찰 Q11

## Low

- **L-1** 동사 불일치: `/f` 날짜 없이 시작 · `/flow-maps` 그대로 시작 · receipt 저장. → P31-2.
- **L-2** 루틴 고급 `전체 횟수 8` + `앞으로 4주 미리보기`(월·수·금 ~12회 창) — 미리보기 창↔종료 횟수 축 상이. 문법은 맞음 → 관찰 Q6.
- **L-3** ux50 월 헤더 `날짜 929 · 반복 93` 대형 원시 카운트 — fixture 산물, 실데이터 의미 즉시성 미확인.

## 데이터 경계 (회귀 0)

| 계약 | P30 판정(이 검토) | 근거 |
| --- | --- | --- |
| source immutable/published | 유지 | 표현 계층이 read-only projection 소비 · current_source |
| personal overlay 분리 | 유지 | receipt/adjust가 overlay만, source 미변경 |
| execution run 분리 | 유지 (실행 결과 not_tested) | 완료/reopen E2E green, 라이브 미수행 |
| series↔occurrence | 유지 | routine UI grouping만, identity/engine 불변 |
| export identity·scope·count | 유지 | fixed layer·command hierarchy만, count/scope/format 불변 |
| Calendar identity | 유지 | demo identity는 additive, production stable identity 불변 |
| 4탭 IA · public /f | 유지 | smoke·홈 canonical 4탭, 5탭 승격 없음 |
