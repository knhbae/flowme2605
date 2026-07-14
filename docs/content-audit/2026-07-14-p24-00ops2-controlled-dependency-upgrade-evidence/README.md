# P24-00OPS2 Controlled Dependency Upgrade Evidence

**실행일:** 2026-07-14
**격리 worktree:** `D:\flowme2605\.tmp\flowme-p24-clean-211827d`
**rollback 기준:** `3df364b52d6dffc4993aac94368bd642dfce2dad`

## 판정

P24-00OPS2는 **자동 검증 기준 완료**다. 제품 동작 코드는 바꾸지 않고 Next.js, Playwright, PostCSS를 통제된 범위로 올렸으며, 감사 결과를 `critical 0 / high 0 / moderate 4`로 만들었다. 단위 테스트, production build, 전체 274개 Playwright 테스트를 같은 dependency 조합에서 bounded shard로 검증했다.

이 판정은 실제 사용자 검증이 아니다. P24-00B 관찰 세션은 계속 `0 / 15`이며, P24 전체는 아직 완료가 아니다.

## 변경 범위

| 패키지 | 이전 | 이후 |
| --- | --- | --- |
| `next` | `15.3.8` | `15.5.20` |
| `@playwright/test` | `1.52.0` | `1.61.1` |
| `postcss` | `8.5.3` | `8.5.16` |
| ExcelJS 하위 `tmp` | `0.2.5` | `0.2.7` |

- `npm audit fix --force`는 실행하지 않았다.
- ExcelJS를 임의로 downgrade하지 않았다.
- `next-env.d.ts`의 typed-routes reference는 Next.js 15.5.20 build가 생성한 형식이다.
- 앱 runtime/UI 소스는 변경하지 않았다.
- Playwright 1.61에서 현재 제품 동작과 어긋난 기존 assertion 5개만 현재 UX 계약에 맞게 갱신했다.

## 검증 결과

- `npm.cmd run docs:check`: 통과, required `14`, local links `2,178`
- `npm.cmd test`: `514 / 514` 통과
- `npm.cmd run build`: 통과, Next.js `15.5.20`, route `18`
- Playwright: 전체 `274 / 274` distinct tests 통과
  - P24/URL-first/public/workbench shard: `77 / 77`
  - flow-mvp/local-data-backup shard 최초 실행: `192 pass / 5 fail`
  - 실패 5개는 기존 assertion이 이미 구현된 P24 UX를 뒤따르지 못한 경우였고, 수정 후 `5 / 5` 재통과
- P24 evidence capture: `14 / 14` 통과, PNG `31`장
- 모바일 `390px`, wide `1024px`: horizontal overflow `0`, console error `0`
- `git diff --check`: 통과

상세 명령 결과는 [command-results.json](./command-results.json), route/viewport marker는 [route-evidence.json](./route-evidence.json), 위험과 시각 점검은 [audit.md](./audit.md)에 기록했다.

## 감사 결과

| 시점 | Critical | High | Moderate | Low |
| --- | ---: | ---: | ---: | ---: |
| 이전 | 0 | 4 | 3 | 0 |
| 이후 | 0 | 0 | 4 | 0 |

원본 감사 자료:

- [업그레이드 전](./audit-before.json)
- [업그레이드 후](./audit-after.json)

남은 moderate는 Next.js가 고정한 하위 PostCSS와 ExcelJS의 `uuid` 계열이다. high가 아니며 현재 direct dependency 범위에서 강제 교체하지 않았다. P24-00C 또는 별도 dependency maintenance에서 upstream 호환 경로를 다시 확인한다.

## 대표 화면

- [오늘 완료/되돌리기 390px](./u1/screenshots/00-today-completion-undo-mobile.png)
- [점진적 편집 기본 390px](./u2/screenshots/00-progressive-editor-basic-mobile.png)
- [점진적 편집 wide 1024px](./u2/screenshots/02-progressive-editor-revisit-wide.png)
- [날짜 없는 할 일 배치 390px](./u3/screenshots/00-calendar-unscheduled-selection-mobile.png)
- [Calendar wide 1024px](./u3/screenshots/02-calendar-unscheduled-wide.png)
- [선택 export 390px](./s2/screenshots/00-personal-draft-selected-export-mobile.png)
- [실행 중 메모 390px](./u4/screenshots/00-inline-execution-note-mobile.png)

## Claude Design `(8)` 대조

이번 OPS2는 UI 변경 slice가 아니지만, 같은 dependency 조합에서 mockup A-G에 대응하는 현재 화면을 다시 캡처했다.

- A 정확성: local/effective date, reuse, recurrence, draft integrity, hard navigation을 재검증했다.
- B 점진적 편집: 공통 필드가 먼저, 장소·반복은 `세부 설정` 아래에 유지된다.
- C 완료/완료 취소: Today 한 행 체크와 즉시 되돌리기가 유지된다.
- D 날짜 없는 할 일: Calendar 상단 선반과 선택 배치가 유지된다.
- E export scope: 전체/선택 범위가 형식보다 먼저 보인다.
- F 날짜 이동: 단일/선택/기준일/반복 범위 계약을 유지한다.
- G 가벼운 메모: 개인 회고와 원문 수정 메모가 분리된다.

wide My Flow 편집은 기능상 문제와 overflow는 없지만 오른쪽 여백이 크고 폼이 길다. 이는 자동 증거로 즉시 재설계하지 않고 P24-00B 관찰에서 실제 사용자의 탐색·피로도를 확인할 항목으로 남긴다.

## 다음 게이트

1. merged commit을 production에 배포하고 익명 HTTP 200을 확인한다.
2. P24-00B1에서 실제 사용자 2명의 첫 세션을 수행한다.
3. 신뢰 오류가 없으면 총 5명 x 3회, `15 / 15`까지 이어간다.
4. P24-00C에서 결과를 keep/change/defer/blocking으로 분류한다.
