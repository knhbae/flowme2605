# FlowMe Claude Design P0~P2 final audit

- 작성일: 2026-07-03
- 기준 브랜치: `codex/flowme-uxui-second-loop`
- 범위: 홈, Flow 찾기, 공개 Flow 상세, Flow Map 상세, My Flow, 캘린더, export UX
- 원칙: 새 기능 추가 없음. 4탭 IA, seed/source-backed 구조, 저장/실행/export 스키마 유지.

## 적용 요약

| 영역 | 상태 | 감사 판단 |
| --- | --- | --- |
| P0 | 완료 | 저장 직후 첫 실행 항목, 날짜 copy, 내부 제작 문구 노출 방지, 필수 입력 feedback이 기준선에 들어왔다. |
| P1 | 완료 | `/flows`, `/flow-maps/[map]`, `/f/[slug]`, `/my`, `/calendar`의 첫 화면을 행동/결과 중심으로 압축했다. |
| P2 | 완료 | export 라벨, true empty state, fixed layer, 진행 표시, 디자인 토큰 마감을 정리했다. |

## P3-01 재검증 결론

- 결론: 앱 저장/복원 버그가 아니라 final audit evidence 생성 오류였다.
- 원인: 이전 `07-post-save-my-flow-mobile.png`, `08-calendar-after-save-mobile.png` 캡처는 실제 저장 후 브라우저 localStorage 상태를 유지하지 못한 상태에서 생성된 것으로 보인다.
- 재현 결과: 모바일 390px에서 `/flow-maps/moving-d30`에 이사일 `2026-07-22`를 입력하고 저장하면 `flow:saved:source-backed-moving-d30`, `flow:map:saved:moving-d30` 등 저장 키가 기록된다.
- 현재 evidence: `/my?savedMap=moving-d30`는 `이사 방식과 견적 후보 정하기` 첫 실행 항목을 보여주고, `/calendar`는 `7월 8일 (수)` 선택일 agenda와 `입주청소와 대형폐기물 일정 확인`을 보여준다.
- 고정 장치: `tests/e2e/flow-mvp.spec.ts`에 저장 후 My Flow/Calendar가 true empty state로 회귀하지 않는 assertion을 추가했고, `scripts/content-audit/capture-claude-p0-p2-final-evidence.mjs`로 같은 브라우저 컨텍스트에서 저장 후 증거를 재생성한다.

## Route evidence

모바일 390 x 844 viewport에서 route sanity check를 수행했다. 저장 후 route는 `/flow-maps/moving-d30`에서 실제 저장을 수행한 같은 브라우저 컨텍스트로 캡처했다. 모든 route에서 horizontal overflow는 0건이고, ASCII 내부 검토어 스캔 결과는 0건이다.

| Route | 상태 | H1 | Screenshot | 비고 |
| --- | --- | --- | --- | --- |
| `/` | clean localStorage | 콘텐츠를 일정과 할 일로 저장 | [01-home-mobile.png](./screenshots/01-home-mobile.png) | 하단 4탭 표시 |
| `/flows` | clean localStorage | 무엇을 저장할까요? | [02-flows-mobile.png](./screenshots/02-flows-mobile.png) | 통합 카드 목록 유지 |
| `/flow-maps/moving-d30` | clean localStorage | 원룸 이사 D-30 일정 지도 | [03-flow-map-moving-mobile.png](./screenshots/03-flow-map-moving-mobile.png) | 저장 전 hero 압축 유지 |
| `/flow-maps/middle-school-math-1` | clean localStorage | 중1 수학 목차 진도표 | [04-flow-map-math-mobile.png](./screenshots/04-flow-map-math-mobile.png) | 날짜 없는 콘텐츠 fallback 유지 |
| `/f/vehicle-inspection-prep` | clean localStorage | 자동차검사 D-14 준비 Flow | [05-public-vehicle-inspection-mobile.png](./screenshots/05-public-vehicle-inspection-mobile.png) | public single Flow shell은 하단 4탭이 보이지 않음 |
| `/my` | clean localStorage | 내 Flow | [06-my-empty-mobile.png](./screenshots/06-my-empty-mobile.png) | true empty CTA 단일화 |
| `/my?savedMap=moving-d30` | after saving moving-d30 with 2026-07-22 | 내 Flow | [07-post-save-my-flow-mobile.png](./screenshots/07-post-save-my-flow-mobile.png) | post-save 첫 실행 항목 유지 |
| `/calendar` | after saving moving-d30 with 2026-07-22 | 캘린더 | [08-calendar-after-save-mobile.png](./screenshots/08-calendar-after-save-mobile.png) | schedule-first agenda 유지 |

자세한 수치는 [route-evidence.json](./route-evidence.json)에 있다.

## Verification snapshot

- 모바일 390px route evidence: 생성 완료
- P3-01 저장 루프 evidence: 앱 버그 아님, evidence 생성 오류로 판별
- P3-01 targeted Playwright subset: 2 passed
- P0/P2 regression targeted Playwright subset: 6 passed
- P0~P2 final targeted Playwright subset: 9 passed
  - design token rhythm
  - internal operation labels
  - fixed layers
  - true empty states
  - nearest saved schedule
  - source-backed My Flow demo baseline
  - mobile workbench destination CTAs
- full verification:
  - `npm.cmd test`: 274 passed
  - `npm.cmd run docs:check`: passed, 14 required files and 1271 local links
  - `npm.cmd run build`: passed
  - `git diff --check`: passed

## 남은 리스크

| 우선순위 | 항목 | 설명 | 다음 판단 |
| --- | --- | --- | --- |
| Medium | Public Flow detail app shell | `/f/vehicle-inspection-prep` route는 모바일 route evidence에서 하단 4탭 nav가 보이지 않았다. 단일 공개 Flow 공유 화면 의도일 수 있으나, 4탭 IA 일관성을 엄격히 보면 다음 루프에서 정책 판단이 필요하다. | Claude Design에게 public detail을 app shell에 맞출지, 공유 전용 shell로 유지할지 확인 요청 |
| Low | 특수 workbench visual polish | 공통 토큰은 정리됐지만, 일부 특수 workbench/실험성 화면은 기존 slate/blue utility class가 남아 있을 수 있다. 주요 사용자 route 회귀는 발견하지 않았다. | 다음 visual QA에서 범위를 별도 산정 |

## Claude 재검토 요청

[prompt-ko.md](./prompt-ko.md)를 그대로 전달해도 된다. Claude에게는 평가만 요청하지 말고, 남은 리스크의 우선순위, 다음 루프 구현 범위, 화면별 수정 지시까지 산출하게 요청한다.
