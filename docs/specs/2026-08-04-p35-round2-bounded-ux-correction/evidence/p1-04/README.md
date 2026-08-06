# P1-04 final internal gate evidence

**판정:** `PASS — LOCAL INTERNAL GATE`

**실행일:** 2026-08-05 KST

**경계:** 이 폴더는 자동화·브라우저 스크린샷 기반 내부 QA 증거다. 실제 관찰 사용자 `0명`. Candidate commit·push와 blind-only A/B는 승인됐고, PR·merge·Preview·Production은 승인되지 않았다.

상위 판정과 제한은 [P1-04 closeout](../../p1-04-closeout.md), 실행 결과와 수렴 이력은 [E2E manifest](./e2e-manifest.md)에 기록한다.

## 1. 증거 요약

| 증거군 | 결과 | 의미 |
|---|---:|---|
| P1-04 direct gate | `6/6 PASS` | 20 plans, keyboard/a11y, actual 50 Items, legacy/malformed, rollback, public zero-write |
| full E2E | `529/529 PASS` | workers `4`, retries `0`, `26.0m` |
| P35 | `358/358 PASS` | P35 P0/P1 regression |
| full unit | `1,086/1,086 PASS` | `114 + 358 + 614` |
| build | `PASS` | Next `15.5.21`, `18/18`, pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU` |
| direct browser diagnostics | `0` | console error, pageerror, unexpected requestfailed |

결합 매트릭스는 저장 계획 `0/1/5/20`, 실제 Item `1/8/24/50`, dated/undated/mixed, repeat/overdue/archived/completed를 포함한다. 50 Item fixture는 DOM 복제가 아니라 실제 저장 bundle이며, ID·편집·reload·artifact count를 함께 확인했다.

긴 한국어, multiline, tab, quote, backslash, emoji는 50-Item editor와 artifact에서 확인했다. source-backed·missing-base·malformed record는 local/session storage before/after snapshot이 byte-identical이었다. 공개 initial render도 default·exact-off·uppercase에서 write `0`과 raw-byte 보존을 직접 확인했고, 명시적 편집만 저장된다. duplicate save/export는 기존 회귀와 direct 50-Item clipboard write `1회`로 확인했고, Sheet artifact parity는 stable `18열` 계약을 유지했다.

## 2. 스크린샷 manifest

| 번호 | 파일 | 직접 보여주는 상태 |
|---:|---|---|
| 01 | [01-twenty-plan-library-390x844.png](./screenshots/01-twenty-plan-library-390x844.png) | 390×844, 20개 계획 library·검색·모바일 inventory |
| 02 | [02-twenty-plan-library-200pct-reflow-720x500.png](./screenshots/02-twenty-plan-library-200pct-reflow-720x500.png) | 720×500 reflow proxy, 20개 계획 검색·overflow 0 |
| 03 | [03-nested-item-editor-reduced-motion-390x844.png](./screenshots/03-nested-item-editor-reduced-motion-390x844.png) | 중첩 Item dialog, keyboard focus, reduced motion |
| 04 | [04-all-exact-off-public-390x844.png](./screenshots/04-all-exact-off-public-390x844.png) | public exact-off legacy adapter·rollback |
| 05 | [05-real-fifty-item-long-editor-390x844.png](./screenshots/05-real-fifty-item-long-editor-390x844.png) | 실제 50 Item, 긴 한국어·multiline·특수문자 editor |
| 06 | [06-real-fifty-item-transfer-390x844.png](./screenshots/06-real-fifty-item-transfer-390x844.png) | 50 Item transfer confirmation과 count parity |
| 07 | [07-legacy-read-only-fail-safe-390x844.png](./screenshots/07-legacy-read-only-fail-safe-390x844.png) | source-backed/missing-base/malformed read-only fail-safe |

## 3. 접근성·viewport 경계

- `PASS`: keyboard-only open/close, focus trap, Escape focus return, dialog role/ARIA relation, reduced motion.
- `PASS`: 390×844 direct P1-04 capture; 1024·1440×1000 combined regression/capture matrix.
- `PASS · PROXY`: 720×500 reflow proxy.
- `NOT_ASSESSED`: 실제 browser 200% zoom. 02번 파일명만으로 실제 zoom 증거라고 해석하지 않는다.

## 4. 날짜·timezone 경계

- `PASS`: dated/undated/mixed, repeat, overdue, archived/completed 회귀.
- `PASS · UNIT`: `America/New_York` DST 경계의 wall-clock 유지.
- `NOT_ASSESSED`: UTC offset을 직접 검사한 실제 browser Calendar download.

## 5. 알려진 제한

- 실제 browser 200% zoom: `NOT_ASSESSED`
- 실제 다운로드의 DST UTC offset: `NOT_ASSESSED`
- 성능: threshold와 측정법이 승인되지 않아 `NOT_ASSESSED`
- observed users: `0명`

이 폴더는 P1-04 local internal gate를 지지하지만 사용자 관찰, production 공개 또는 성능 승인을 대신하지 않는다. V1은 현재 프로그램 범위 밖이다.
