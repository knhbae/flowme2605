# P26-01 Date Intent Evidence

## 판정

`complete_candidate`

공개 Flow의 날짜 설정은 `날짜 정하기 / 날짜 없이 / 예시만 보기`로 분리했다. 설정 선택은 저장 행동과 경쟁하지 않고, 실제 저장 결과는 sticky primary의 `이 날짜로 저장 / 날짜 없이 저장`으로 드러낸다. 예시 날짜는 artifact preview에만 쓰고 saved record, My Flow schedule, Calendar, list export, ICS에는 승격하지 않는다. 날짜를 입력한 `custom` 상태만 dated projection과 Calendar export 대상이 된다.

이 판정은 current source, current command, current browser evidence다. 실제 사용자 관찰은 `0`건이다.

## 핵심 결과

- `example`은 transient이며 localStorage date intent로 저장하지 않는다.
- example 상태에서 primary CTA는 `날짜 없이 저장`으로 실제 저장 결과를 드러낸다.
- `custom`은 유효한 `YYYY-MM-DD`가 있어야 저장 가능하고 CTA는 `이 날짜로 저장`이다.
- `undated`는 anchor 없이 저장되며 My Flow에서는 날짜 없는 할 일, Calendar에서는 일정 배치 tray 대상으로 남는다.
- legacy `mode: example` 저장본은 기존 preview anchor를 `legacyExampleAnchor`에 보존한 채 undated로 migration한다.
- source bundle과 source item은 변경하지 않는다.

## Current Evidence

- pure/storage test: `57 / 57`
- full unit test: `532 / 532`
- P26-01 Playwright: `4 / 4`
- affected existing Playwright: `62 / 62`
- docs check: pass, `14` required files and `2,547` local links
- production build: pass, `18 / 18` route generation
- screenshots: `3`
- horizontal overflow: `0`
- console/page error: `0`

## Screenshots

- [Example preview, mobile](./screenshots/01-example-preview-mobile.png)
- [Custom date, wide](./screenshots/02-custom-date-wide.png)
- [Explicit undated, mobile](./screenshots/03-explicit-undated-mobile.png)

## Files

- [Detailed audit](./audit.md)
- [Route evidence](./route-evidence.json)
- [Date intent fixtures](./date-intent-fixtures.json)

## Next Dependency

P26-01의 신규 계약과 회귀 검증은 닫혔다. P26-02는 이 `dateIntent`를 canonical post-save receipt와 모든 save route handoff에 사용한다.
