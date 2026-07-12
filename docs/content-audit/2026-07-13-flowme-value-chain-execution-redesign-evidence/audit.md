# FlowMe 가치 사슬·실행 표면 재설계 감사

## 결론

전체 가치 사슬을 제품 구조에서 닫지 않되 초기 화면은 사용자 실행 가치부터 보여 주는 방향이 맞다. 제작자·Studio·리뷰·업데이트·성과 회수는 중요하지만, 저장·개인화·실행이 신뢰되지 않는 상태에서 앞세우면 빈 플랫폼처럼 보인다.

이번 slice는 기능을 축소하지 않고 progressive disclosure를 강화했다. source, personal overlay, completion, export, creator attribution 데이터는 유지하고, 사용자가 현재 필요한 정보만 앞에 남겼다.

## 화면별 판단

### 홈

- 핵심 약속 `콘텐츠를 일정과 할 일로 저장`과 URL·메모 진입이 첫 화면에 있다.
- 대표 Flow는 카테고리뿐 아니라 `원문 연결`을 보여 신뢰 경계를 드러낸다.
- 추천 카드는 실행 약속과 첫 행동만 남기고 내부 구조를 노출하지 않는다.

### Flow 찾기

- 기본 상태에서는 URL·메모와 준비된 Flow 카탈로그를 함께 제공한다.
- lookup 결과가 생기면 결과와 다음 행동에 집중하고 카탈로그는 `다른 Flow 둘러보기` 아래로 접힌다.
- needs-review, hit, miss, draft의 기존 lookup·저장 모델은 바꾸지 않았다.

### canonical Flow Map

- 기존에는 hero card → source card → child card → step card → detail card가 중첩됐다.
- 현재는 결과 약속, 기준일, 첫 행동, 원문 실행 순서를 한 세로 흐름으로 읽는다.
- 각 실행 행은 번호·제목·첫 체크·필요 시 상세/원문 disclosure만 갖는다.

### My Flow

- `task-first` role marker를 추가했다.
- 완료 체크박스가 행의 왼쪽 첫 조작이며, `열기`는 상세 행동으로 유지한다.
- 1024px에서도 대시보드 칸을 억지로 채우지 않고 읽기 폭이 제한된 한 개 실행 레인을 사용한다.
- 전체 Flow 관리는 모바일 4개 preview, 1024px 본문 중심, 1280px 이상 보조 sidebar 정책으로 낮췄다.

### Calendar

- `date-first`, `month-overview`, `selected-day-execution` role marker를 추가했다.
- 선택일은 Flow 식별 header와 평면 실행 행으로 읽고 카드 중첩을 제거했다.
- 모바일 scope는 현재 달에 값이 있는 범위만 짧은 label로 노출한다.
- 월간 grid는 compact summary를, 선택일 agenda는 전체 detail을 담당한다.

### public `/f`

- 앞선 public visual-system slice의 Flow 단위 저장, secondary export, 저장 전 preview 정책을 유지한다.
- timeline, checklist, routine의 category-specific 차이는 보존하되 save/execute hierarchy는 공통이다.

### creator / Studio

- 공개 creator profile의 seed `총 실행`, `총 복사` 합계를 사용자 성과처럼 보여 주던 문제를 제거했다.
- 공개 지표는 콘텐츠 수, 원문 확인 수, 주제 수로 제한한다.
- 모바일의 긴 category chip 목록은 select로 바꿨다.
- Studio는 clean session에서 비어 있을 수 있는 보조 표면으로 유지한다. 실제 draft shelf 연결은 기존 P20 evidence를 계속 참조한다.

## 참고 제품에서 가져온 원칙

- Apple/Google/Fantastical: 월간 overview와 선택일 detail의 책임 분리
- Things/Todoist: Today를 의도적으로 작게 유지하고 완료 행동을 첫 조작으로 배치
- Notion: 같은 데이터의 여러 view와 metadata의 지연 노출
- Nike NTC/Fitbod/Freeletics: 프로그램 전체와 지금 할 session을 분리
- Wanderlog/TripIt/Roadtrippers: 계획, 현장 실행, 기록을 한 화면에 동시에 펼치지 않음

상세 출처는 `../2026-07-12-flowme-cross-category-ux-reference-audit/references.md`를 참조한다.

## 유지된 계약

- source URL, source trace, detail, memo 보존
- source-backed 기준본과 비공개 personal overlay 분리
- My Flow, Calendar, export가 같은 개인 수정본을 읽는 구조
- URL-first hit/miss/candidate/draft 상태
- public Flow 단위 저장·export 위계
- 4탭 IA
- internal-console, release-preview, creator-profile tier 분리

## 아직 닫히지 않은 가치 사슬

1. 실제 제작자 5~10명과 기준 Flow 공동 제작·검토 pilot
2. 사용자의 리뷰, 막힘, 수정 요청을 기준 Flow 업데이트 제안으로 보내는 UX
3. 업데이트 수락·거절과 개인 수정본 충돌 처리
4. 실제 재방문·완료·외부 전환 관찰값
5. clean session Studio의 첫 초안 안내와 실제 사용자 관찰

이 항목은 UI에 가짜 숫자나 비어 있는 기능을 추가해 닫지 않는다. 실제 pilot과 사용자 관찰이 생긴 뒤 별도 slice로 진행한다.

## 검증 결과

- Flow MVP 통합 E2E 191개 시나리오 확인: 전체 실행 190/191 통과 후, 오래된 Flow Lab 내부 재고 수 assertion 1건을 현재 값으로 맞춰 단독 재실행 통과
- URL-first/public share/workbench 핵심 회귀 55/55 통과
- 단위 테스트 437/437 통과
- TypeScript no-emit, production build, docs check, diff check 통과
- 390px/1024px 자동 캡처 15개와 public archetype 3개, 총 18개 screenshot 확인
- 자동 캡처 horizontal overflow 0, creator seed 성과 라벨 노출 0
