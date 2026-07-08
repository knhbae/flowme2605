# Claude Design 리뷰 실행 백로그

작성일: 2026-07-03

## 상태

- 문서 유형: UX/UI 실행 백로그
- 구현 상태: P0~P2 구현 및 마감 감사 패키지 정리 완료
- 기준 브랜치: `codex/flowme-uxui-second-loop`
- 원본 리뷰:
  - [claude-design-review-2026-07-03.md](https://github.com/knhbae/flowme2605/blob/main/claude-design-review-2026-07-03.md)
  - [claude-design-review-2026-07-03.html](https://github.com/knhbae/flowme2605/blob/main/claude-design-review-2026-07-03.html)
- 읽기용 HTML: [Claude Design 실행 백로그 보드](./2026-07-03-claude-design-action-backlog-ko.html)

## 핵심 판단

Claude Design 리뷰의 결론은 새 기능 추가가 아니라 위계 압축과 언어 교정이다. 4탭 IA, 저장에서 실행으로 이어지는 루프, 결과 중심 export 라벨, 원문/근거/메모 접힘 구조는 유지한다. 고쳐야 할 부분은 사용자가 첫 화면에서 읽어야 하는 설명 카드 수, 저장 후 다음 행동의 불일치, 입력과 CTA의 분리, 내부 모델 언어 노출이다.

## 유지할 기준선

| 유지 | 이유 |
| --- | --- |
| 홈 / Flow 찾기 / 캘린더 / 내 Flow 4탭 IA | 현재 서비스 구조의 기준선이며 사용성 문제의 직접 원인이 아니다. |
| 저장 전 보기 → 저장하고 시작 → 먼저 할 일 루프 | FlowMe를 실행 앱으로 만드는 핵심 루프다. |
| 원문 · 근거 · 메모 접힘 구조 | 신뢰와 source fidelity를 보존한다. 삭제하지 않는다. |
| 결과 중심 export 라벨 | `캘린더 파일 받기`, `시트로 받기`, `메모로 복사`, `체크리스트 복사` 체계는 유지하고 상수화한다. |
| read-first My Flow 상세 | 사용자가 먼저 실행하고, 편집/메모/source/export는 필요할 때 열어야 한다. |

## 건드리면 위험한 것

| 영역 | 주의 |
| --- | --- |
| `storage.ts` 저장 키와 스냅샷 스키마 | 기존 저장 데이터 호환성에 영향이 있다. |
| `source-backed-my-flow.ts` seed 병합/dedupe | 9개 source-backed 콘텐츠와 기존 seed 연결에 영향이 있다. |
| `sourceTrace`, `sourceUrl` 값 | 라벨과 표시 위치는 바꾸되 데이터는 보존한다. |
| `data-testid` | e2e 회귀를 막기 위해 마크업 변경 시 testid를 이관한다. |
| 날짜 재계산, recurrence | UX 문구 변경과 계산 로직 변경을 섞지 않는다. |

## P0 - 이번 루프에서 먼저 해결

| ID | 상태 | 영역 | 문제 | 수정 방향 | 완료 기준 | 검증 |
| --- | --- | --- | --- | --- | --- | --- |
| P0-01 | 완료 | 홈 모바일 | hero 주행동 버튼이 모바일에서 숨겨져 첫 행동이 없다. | `HomeLanding` 모바일 hero에 전폭 `콘텐츠 고르러 가기` CTA를 상시 노출한다. | 390px 첫 화면에 primary CTA가 보이고 탭하면 `/flows`로 간다. | targeted e2e 통과 |
| P0-02 | 완료 | 저장 직후 My Flow | 배너는 먼저 할 일을 열라고 하는데 워크스페이스는 남은 일이 없다고 말한다. | post-save 진입 시 첫 슬롯을 방금 저장한 콘텐츠의 먼저 할 일로 맞춘다. 날짜 없는 콘텐츠도 첫 항목 fallback을 보여준다. | 저장 직후 배너와 첫 카드가 같은 항목을 가리키고, `남은 할 일이 없습니다`가 먼저 나오지 않는다. | source-backed 저장 e2e 통과 |
| P0-03 | 완료 | Flow Map 상세 저장 | 필수 입력은 상단, 저장 CTA는 하단 sticky라 미입력 시 feedback이 끊긴다. | 미입력 sticky 버튼은 `이사일 입력`; 클릭 시 입력으로 스크롤/포커스/하이라이트. 입력 후 `저장하고 시작`. | 미입력 클릭 후 input이 포커스되고, 입력 후 저장이 `/my?savedMap=...`로 이동한다. | targeted e2e 통과 |
| P0-04 | 완료 | 날짜 copy | ISO 날짜와 `기준 할 일`이 사용자 제목처럼 노출된다. | 사용자 날짜 포맷터를 두고 `M월 D일 (요일)`, `오늘/다음/밀린 할 일`로 통일한다. | 사용자 화면에서 `YYYY-MM-DD 기준 할 일` 같은 제목이 사라진다. | targeted e2e 통과 |
| P0-05 | 완료 | 내부 계층 언어 | `묶음`, `~Flow`, `검수 필요`, demo 문구가 사용자 표면에 남는다. | 사용자 표면 카운트는 `할 일 N개` 중심으로 낮추고, demo/readiness 배지는 일반 경로에서 숨긴다. | 사용자 라우트에서 금지어 스캔 0건을 목표로 한다. 단, 브랜드/탭명 `Flow`는 별도 판단한다. | targeted e2e text scan 통과 |

### 진행 메모

- 2026-07-03: P0-01, P0-03을 먼저 처리했다. `npm run build`, `npm.cmd run docs:check`, targeted Playwright `home presents|product IA v2` 통과.
- 2026-07-03: P0-02를 처리했다. post-save 진입 중 My Flow 첫 슬롯이 방금 저장한 map의 먼저 할 일을 우선 표시하고, 날짜 없는 콘텐츠는 fallback 항목을 빈 상태보다 먼저 보여준다. targeted Playwright `product IA v2` 통과.
- 2026-07-03: P0-04를 처리했다. My Flow Today/Now와 캘린더 선택일 제목은 상태/사용자 날짜 포맷 중심으로 바꾸고, 내부 ISO 날짜는 data/input 값으로만 유지했다. targeted Playwright 날짜 copy subset 통과.
- 2026-07-03: P0-05를 처리했다. 일반 사용자 라우트의 `묶음`, `검수 필요`, `정리 필요`, demo/source-backed/review/audit/Step/Item 노출을 금지어 스캔으로 고정하고, catalog/public map/post-save/My Flow 표면 카운트를 `할 일/체크/콘텐츠` 중심으로 낮췄다. targeted Playwright user-surface text scan 및 source-backed 저장 subset 통과.
- 2026-07-03: P1-01, P1-02를 처리했다. `/flows`의 이중 헤더를 `무엇을 저장할까요?` 한 벌로 합치고, 카드는 카테고리/제목/결과 약속/먼저 할 일/CTA 하나 중심으로 압축했다. 390px 확인 결과 첫 카드 top 349px, 카드 높이 199px, 가로 overflow 0건이었다. targeted Playwright `/flows` subset 통과.
- 2026-07-03: P1-03을 처리했다. `/f/[slug]` 공개 Flow 상세 hero를 결과 약속/필요 입력/먼저 할 일/저장 CTA 중심으로 압축하고, 입력 없는 Flow는 별도 setup 우회 없이 `입력 없이` 상태와 첫 행동을 hero 안에서 보여준다. 390px 확인 결과 `jeonse-contract-precheck-docs`는 입력 top 236px, 먼저 할 일 top 444px, 저장 CTA top 517px이고, `used-car-buying-check`는 먼저 할 일 top 285px, 가로 overflow 0건이었다. targeted Playwright public Flow detail subset 통과.
- 2026-07-03: P1-04를 처리했다. `/flow-maps/[map]` hero를 제목/결과 약속/결과 칩/입력/먼저 할 일 중심으로 압축하고, `저장되는 결과물` 전폭 카드 3장은 제거했다. 390px 확인 결과 `moving-d30`, `middle-school-math-1`, `moving-map` 모두 첫 할 일이 첫 뷰포트 안에 있고 가로 overflow 0건이었다. targeted Playwright source-backed map subset 통과.
- 2026-07-03: P1-05를 처리했다. `/my` Today의 첫 슬롯을 요약 카드보다 위로 올리고 실행 후보를 오늘, 밀린, 다음, 날짜 없는 첫 항목 순으로 정렬했다. 빈 상태 문구는 `남은 할 일이 없습니다`가 아니라 보조 요약으로 낮췄고, 날짜 없는 진도형 콘텐츠는 `먼저 할 일`로 표시한다. 390px 확인 결과 `moving-d30-basic`은 실행 슬롯 top 295px, 요약 top 535px, overflow 0건이고, `middle-school-math-1` 저장 직후는 `먼저 할 일` 카드가 보였다.
- 2026-07-03: P1-06을 처리했다. `/calendar` 기본 선택은 오늘 일정이 없을 때 가장 가까운 미래 일정일, 미래가 없으면 가장 가까운 밀린 일정일을 선택한다. 모바일에서는 선택일 agenda를 월간 달력보다 먼저 보여주고, 달력 셀은 긴 제목 대신 dot/count 중심으로 낮췄다. 390px 확인 결과 미래 일정 anchor는 agenda top 163px, calendar grid top 745px, 과거 일정만 있는 상태는 agenda top 163px, calendar grid top 573px, 가로 overflow 0건이었다. targeted Playwright calendar subset 통과.
- 2026-07-03: P1-07을 처리했다. 일반 사용자 라우트(`/`, `/flows`, `/flow-maps/*`, `/f/*`, `/my`, `/calendar`) 금지어 스캔을 보강해 `Flow Map`, `Flow 일정`, `지도 일정`, demo/review/audit/source-backed/sourceTrace/Step/Item 계열 문구가 보이지 않게 고정했다. `후보`는 `견적 후보` 같은 실제 사용자 행동을 막지 않도록 대표/샘플/보류/삭제 후보 같은 내부 상태 패턴만 잡는다. `/calendar`의 `전체 Flow 일정`, `저장한 Flow의 날짜...`, 선택일 그룹 `지도 일정`/`Flow 일정`은 `전체 일정`, `저장한 콘텐츠`, `저장한 일정`/`일정`으로 낮췄다. targeted Playwright user-route internal-copy scan 통과.
- 2026-07-03: P2-03을 처리했다. 모바일 하단 탭은 safe-area를 반영하고, Flow Map sticky 저장 CTA는 하단 탭 위로 16px 이상 떨어지도록 올렸다. `/flow-maps/[map]`의 하단 padding은 CTA+탭 조합을 기준으로 재계산했고, `/my`와 `/calendar`는 중복 bottom padding을 줄여 마지막 콘텐츠가 탭에 가려지지 않게 했다. targeted Playwright fixed-layer overlap scan은 RED에서 sticky/탭 간격 10px로 실패했고, 수정 후 `/flow-maps/moving-d30`, `/flow-maps/middle-school-math-1`, `/my?savedMap=moving-d30`, `/calendar` 통과.
- 2026-07-03: P2-01을 처리했다. public Flow artifact workbench, exact-video export, My Flow Step detail, mobile export sheet, restart prototype의 버튼/피드백 라벨을 `캘린더 파일 받기`, `시트로 받기`, `메모로 복사`, `체크리스트 복사`와 결과형 피드백으로 통일했다. targeted Playwright export label subset은 RED 후 통과했고, 기존 export 파일 생성 로직은 바꾸지 않았다.
- 2026-07-03: P2-02를 처리했다. `/my`와 `/calendar`의 true empty state는 설명형 달력/보조 CTA를 제거하고 `콘텐츠 고르러 가기` 단일 CTA로 정리했다. 저장된 콘텐츠가 있는 상태에서는 기존 Today/Calendar 실행 워크스페이스를 유지한다. targeted Playwright true empty subset은 RED 후 통과했다.
- 2026-07-03: P2-04를 처리했다. My Flow 저장 콘텐츠 카드의 제목 옆 중복 진행 칩과 모바일 저장 요약의 `오늘 0`/`다음 0`/`밀림 0` 칩을 제거하고, 카드 진행 상태는 `n/n 완료` 텍스트 + 진행바 하나로 통일했다. targeted Playwright My Flow 저장 목록/모바일 subset은 RED 후 최신 빌드 기준으로 통과했다.
- 2026-07-03: P2-05를 처리했다. 전역 FlowMe 색상 토큰, 상단/하단 4탭 nav, public artifact workbench 카드/버튼/chip 톤을 `#FAFAF8`, `#E7E4DD`, `#3654FF`, 16px card radius, 12px button radius 기준으로 정리했다. targeted Playwright design token rhythm은 RED 후 통과했고, 모바일 390px route evidence에서 주요 route의 가로 overflow 0건을 확인했다.
- P0~P2 최종 감사 패키지: [Claude Design P0~P2 final audit package](./2026-07-03-claude-design-p0-p2-final-audit-package/README.md)
- 2026-07-03: P3-01을 재검증했다. final audit package의 저장 후 My Flow/Calendar 빈 화면 증거는 앱 저장 버그가 아니라 저장된 브라우저 컨텍스트를 유지하지 못한 evidence 생성 오류로 판별했다. 전용 evidence 캡처 스크립트를 추가하고, `/my?savedMap=moving-d30` 첫 실행 항목과 `/calendar` 저장 agenda가 보이는 screenshot/JSON을 재생성했다.
- 2026-07-03: P3-02를 처리했다. 저장 후 My Flow 배너에서 반복 설명/카운트/지난 일정 요약을 줄이고 첫 실행 항목과 `먼저 열기` 행동을 먼저 보이게 했다. Calendar 선택일 카드에서는 모바일 기준 `선택한 날짜`, `0개 루틴`, 단일 일정의 `1개 · 1개 남음` 카운트를 숨겼다. 07/08 screenshot과 route-evidence JSON을 compact 기준으로 재생성했다.
- 2026-07-04: P3-03을 처리했다. `/f/[slug]` 공개 Flow 상세는 공유 링크로 직접 들어올 수 있지만 정상 앱 경로에서는 `Flow 찾기` 아래의 D2 상세라는 정책으로 정리했다. 전용 public shell을 제거하고 공통 `PlatformNav`를 붙여 모바일 하단 4탭과 `Flow 찾기` active 상태가 보이게 했으며, public mobile export bar는 하단 탭 위로 분리했다. 05 screenshot과 route-evidence JSON을 app shell 기준으로 재생성했다.
- 2026-07-04: P3-04를 처리했다. `/f/moving-d30-basic`, `/f/computer-skills-d30-study`, `/f/new-car-delivery-check`, `/f/used-car-buying-check`의 특수 public workbench 카드/버튼/chip 톤을 FlowMe 공통 토큰에 맞췄다. source-fit 안내의 `대표 노출`, 점수, 보강 기준 같은 내부 운영 문구를 사용자용 `원문 확인 중`/`근거 확인 중` 문장으로 낮추고, seed conversion note의 `audit`/`묶음` 노출 가능 문구를 정리했다. 09~12 screenshot과 route-evidence JSON을 P3-04 기준으로 추가한다.

## P1 - P0 후 이어서 해결

| ID | 영역 | 작업 |
| --- | --- | --- |
| P1-01 | Flow 찾기 헤더 | 완료 - 이중 헤더를 `무엇을 저장할까요?` 한 벌로 통합하고 첫 카드가 더 빨리 보이게 했다. |
| P1-02 | Flow 찾기 카드 | 완료 - 카드 정보를 카테고리, 제목, 결과 약속, 먼저 할 일, CTA 하나로 압축했다. |
| P1-03 | 공개 Flow 상세 hero | 완료 - 제목, 결과 한 줄, 입력, CTA, 먼저 할 일이 한 뷰포트에 들어오게 재구성했다. |
| P1-04 | Flow Map 상세 hero | 완료 - `저장되는 결과물` 카드 3장을 인라인 칩으로 낮추고 입력/저장 동선을 압축했다. |
| P1-05 | My Flow Today | 완료 - 첫 실행 슬롯을 요약보다 위로 올리고 오늘/밀린/다음/날짜 없는 첫 항목 순으로 정렬했다. |
| P1-06 | 캘린더 | 완료 - 가장 가까운 일정일을 기본 선택하고 모바일에서 선택일 agenda를 먼저 보이며, 셀은 dot/count 중심으로 낮췄다. |
| P1-07 | 사용자/내부 문구 분리 | 완료 - 사용자 라우트 금지어 스캔을 보강하고 캘린더/My Flow의 구조형 라벨을 사용자 일정 언어로 낮췄다. |

## P2 - 일관성 정리

| ID | 영역 | 작업 |
| --- | --- | --- |
| P2-01 | Export copy | 완료 - export 라벨과 피드백을 결과 중심 상수로 통일했다. |
| P2-02 | 빈 상태 | 완료 - My Flow/캘린더 true empty CTA를 `콘텐츠 고르러 가기` 하나로 정리했다. |
| P2-03 | fixed layer | 완료 - safe-area, sticky 저장 CTA, My Flow/Calendar bottom spacing을 정리하고 overlap 회귀 테스트를 추가했다. |
| P2-04 | 저장 목록 요약 | 완료 - 0개 칩과 중복 진행 칩을 숨기고, 저장 콘텐츠 카드는 `n/n 완료` + 진행바로 통일했다. |
| P2-05 | 디자인 토큰 | 완료 - 주요 색, 카드 radius/padding, 버튼 hierarchy를 FlowMe 토큰 기준으로 통일했다. |

## P3 - Claude Design Review Board 후속

| ID | 영역 | 작업 |
| --- | --- | --- |
| P3-01 | 저장 evidence 재검증 | 완료 - My Flow/Calendar 빈 상태 screenshot은 앱 버그가 아니라 evidence 생성 오류로 판별하고 재생성했다. |
| P3-02 | 저장 후 화면 밀도 | 완료 - 저장 배너와 Calendar 선택일 카드의 반복 설명/카운트를 줄였다. |
| P3-03 | 공개 Flow 상세 shell | 완료 - `/f/[slug]`를 `Flow 찾기` 하위 app shell 기준으로 정리했다. |
| P3-04 | 특수 workbench visual polish | 완료 - 지정 public workbench route의 카드/버튼/chip 톤과 내부 운영 문구 노출을 마감했다. |

## 검증 기준

1. 모바일 390px 화면 확인.
2. 홈 → Flow 찾기 → 상세 → 저장 → My Flow 경로 확인.
3. 날짜 없는 콘텐츠 저장 후 My Flow 첫 슬롯 확인.
4. 여러 Flow 저장 상태의 Today/전체/상세 확인.
5. Flow Map 필수 입력 미입력/입력 후 저장 확인.
6. 캘린더 진입 시 일정과 agenda 확인.
7. source/detail/memo/export가 삭제되지 않고 접힘 구조로 남는지 확인.
8. 사용자 라우트 내부 문구 스캔.
9. `npm test`
10. `npm.cmd run docs:check`
11. `npm run build`
12. 필요한 targeted Playwright E2E.

## 진행 순서

1. P0-01, P0-03처럼 국소 수정부터 처리한다.
2. P0-02, P0-04처럼 My Flow 날짜/큐에 걸친 수정은 테스트를 먼저 고정한다.
3. P0 완료 후 모바일 screenshot으로 비교한다.
4. P1 카드/hero/캘린더 압축으로 넘어간다.
5. P2는 라벨 상수화와 디자인 토큰처럼 회귀 위험이 낮은 정리 작업으로 묶는다.
