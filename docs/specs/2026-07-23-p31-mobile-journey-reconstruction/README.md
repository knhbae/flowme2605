# P31 Mobile Journey Reconstruction

작성일: 2026-07-23  
상태: `planning_gate_active`  
앱 코드 변경: 없음  
실제 관찰 사용자: `0`

## 한 줄 판단

P30의 데이터·투영·4탭 IA 계약은 유지하되, 모바일에서 홈/찾기, 저장 전 상세, My Flow, Calendar가 서로 다른 질문과 행동을 한 화면에 겹쳐 보여 주는 문제를 하나의 **조정된 표면 재구성 프로그램**으로 해결한다.

이번 계획은 작은 문구 수정 목록이 아니다. 먼저 비교 시뮬레이션으로 화면 역할과 공통 조작 문법을 승인하고, 그 결과에 따라 컴포넌트 구조를 크게 나눌 수 있다. 단, source, personal overlay, execution run, recurrence occurrence, export identity는 현재 correctness evidence가 깨지지 않는 한 재작성하지 않는다.

## 정본

- [제품·UX 계약](./spec.md)
- [단계별 실행 계획](./plan.md)
- [작업 체크리스트](./tasks.md)
- [시뮬레이션·검증·재계획 기준](./qa.md)
- [공식 서비스 레퍼런스와 차용 원칙](./reference-patterns.md)
- [사람이 보는 실행 보드](./workboard.html)

## 이번 계획이 합친 근거

1. 소유자 모바일 피드백
   - 홈과 Flow 찾기 역할 중복
   - 찾기 카드의 source·신뢰 정보·행동 위계 부족
   - 결혼/운동 상세의 서로 다른 문법과 과도한 선택지
   - My Flow의 긴 inline workspace와 텍스트 과밀
   - Calendar selected-day 상세의 inline 확장
2. Claude Design P30 독립 검토
   - `bounded_revision`
   - 공개 상세 shape 공통 뼈대, Home/찾기 역할, My Flow 한 초점, Calendar sheet, 조작 사전 필요
3. Codex P30 다중 세션 독립 검토
   - architecture `bounded_revision`
   - interaction `coordinated_simplification_required`
   - 24개 journey cell 중 설명 없이 이해 가능한 상태 `13/24`
   - 날짜 override precedence Blocking 1건
   - 모바일 archive/restore parity와 영구 삭제 계약 부재
4. 최신 `origin/main`
   - 기준 SHA `91ff789`
   - 독립 검토 기준 `4c5bbb34` 이후 앱 소스 변경 없음
   - P30 계약과 production baseline 유지

## 권장 실행 순서

```text
P31-00A current-state/reference inventory
-> P31-00B 3안 비교 prototype + 8 persona x 3 session simulation
-> P31-00C owner decision / plan revision
-> P31-01 effective date correctness
-> P31-02 discovery + save-before
-> P31-03 My Flow workspace + lifecycle
-> P31-04 Calendar item detail + placement
-> P31-05 delete/export/accessibility/complexity gate
-> independent review + production closeout
```

`P31-01`은 release Blocking이므로 넓은 UI rollout보다 먼저 닫는다. 다만 `P31-00A/B/C`는 앱을 수정하지 않는 설계·시뮬레이션 게이트이므로 병행 준비할 수 있다.

## 기본 추천안

- **홈:** 카탈로그 복제 대신 처음 사용자에게 실제 사용 예시, 재방문 사용자에게 이어서 할 일·최근 Flow·날짜 없는 일 요약을 제공한다.
- **Flow 찾기:** 검색·필터·카탈로그 역할을 전담한다.
- **Flow 카드:** source 링크, 한 줄 결과, 실제 범위, 대표 1~2항목, `더보기`만 유지한다. 가짜 사용 수·리뷰 수는 production에 넣지 않는다.
- **저장 전 상세:** `실제 결과 -> 필요한 개인 값 -> 결과 미리보기 -> 저장/가져가기` 순서를 모든 콘텐츠 shape에 공통 적용한다.
- **My Flow:** 목록 안 inline 확장 대신 dedicated mobile Flow workspace를 사용한다.
- **Calendar:** 모바일 Item 상세는 selected-day 목록 아래 inline 카드가 아니라 bottom sheet/full-screen layer로 연다.
- **Flow lifecycle:** `보관 / 복구 / 이 기기에서 영구 삭제`를 상태별로 분리하고 모바일/와이드 도달 경로를 같게 만든다.

## 대대적 구조 변경을 허용하는 조건

다음 중 하나가 비교 evidence에서 확인되면 단순 composition 수정 대신 별도 구조 변경 spec을 연다.

1. 홈과 Flow 찾기의 대표 과업·첫 행동·성공 상태가 3개 이상 persona에서 구분되지 않는다.
2. 결혼과 운동을 같은 save-before frame에 넣을 때 콘텐츠별 예외가 공통 블록보다 많아진다.
3. My Flow를 현재 `AppClient.tsx` inline composition 안에서 수정하면 default focusable control을 절반 이하로 줄일 수 없다.
4. Calendar bottom sheet가 selected date, scroll, focus, occurrence identity를 보존하지 못한다.
5. 영구 삭제 범위를 기존 storage helper만으로 명확히 증명할 수 없어 ghost personal state가 남는다.

이 경우에도 먼저 source/personal/run/occurrence/export 계약을 보존하는 추출·adapter 경계를 정의한다. 즉시 schema rewrite나 4탭 변경으로 넘어가지 않는다.

## 다음 실행 목표

첫 실행은 **P31-00A/B 비교 설계 게이트**다. 앱 코드를 수정하지 않고 아래 세 대안을 390/1024 prototype으로 비교한다.

1. 현재 4탭 유지 + 홈을 실행/사용 예시 중심으로 재정의
2. 현재 4탭 유지 + 홈을 returning dashboard 중심으로 재정의
3. 홈과 찾기 통합을 포함한 IA 재개봉안

권장 기본값은 1번과 2번을 first/returning 상태로 결합하는 안이다. 3번은 앞의 두 안이 역할 구분 기준을 통과하지 못할 때만 선택한다.

