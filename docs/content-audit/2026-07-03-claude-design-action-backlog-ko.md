# Claude Design 리뷰 실행 백로그

작성일: 2026-07-03

## 상태

- 문서 유형: UX/UI 실행 백로그
- 구현 상태: 진행 전 정리
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
| 결과 중심 export 3라벨 | `캘린더 파일 받기`, `시트로 받기`, `메모로 복사` 체계는 유지하고 상수화한다. |
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

## P1 - P0 후 이어서 해결

| ID | 영역 | 작업 |
| --- | --- | --- |
| P1-01 | Flow 찾기 헤더 | 이중 헤더를 `무엇을 저장할까요?` 한 벌로 통합하고 첫 카드가 더 빨리 보이게 한다. |
| P1-02 | Flow 찾기 카드 | 카드 정보를 카테고리, 제목, 결과 약속, 먼저 할 일, CTA 하나로 압축한다. |
| P1-03 | 공개 Flow 상세 hero | 제목, 결과 한 줄, 입력, CTA, 먼저 할 일이 한 뷰포트에 들어오게 재구성한다. |
| P1-04 | Flow Map 상세 hero | `저장되는 결과물` 카드 3장을 인라인 칩으로 낮추고 입력/저장 동선을 압축한다. |
| P1-05 | My Flow Today | 첫 슬롯을 항상 오늘/밀린/다음 중 실행 가능한 행동으로 둔다. 빈 상태 문구는 캡션으로 낮춘다. |
| P1-06 | 캘린더 | 이중 헤더 제거, 숫자+dot 셀, 가장 가까운 일정일 기본 선택, agenda 고정으로 schedule-first화한다. |
| P1-07 | 사용자/내부 문구 분리 | demo, 검수, 후보, review/audit 문구가 사용자 라우트에 나오지 않게 회귀 테스트를 추가한다. |

## P2 - 일관성 정리

| ID | 영역 | 작업 |
| --- | --- | --- |
| P2-01 | Export copy | export 라벨 3종을 상수화한다. |
| P2-02 | 빈 상태 | My Flow 빈 상태 CTA를 `콘텐츠 고르러 가기` 하나로 정리한다. |
| P2-03 | fixed layer | 하단 탭과 sticky 저장 바가 2층으로 겹치지 않게 정리한다. |
| P2-04 | 저장 목록 요약 | 0개 칩 숨김, 진행바 + n/n 하나로 정리한다. |
| P2-05 | 디자인 토큰 | 주요 색, 카드 radius/padding, 버튼 hierarchy를 통일한다. |

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
