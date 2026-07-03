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

## Route evidence

모바일 390 x 844 viewport에서 route sanity check를 수행했다. 모든 route에서 horizontal overflow는 0건이고, ASCII 내부 검토어 스캔 결과는 0건이다.

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
- targeted Playwright subset: 9 passed
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
