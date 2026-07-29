# FlowMe P35-01 Entry Router Evidence

- 작성일: 2026-07-26
- 기준 SHA: `2c951633d13adb0aab3ddd9d3cdddf506d9e97cd`
- 작업 branch: `codex/p35-mece-ux-reset`
- acceptance marker: `P35-ENTRY-ROUTER-3TAB`
- 판정: `pass`
- 실제 관찰 사용자 수: `0`

## 결과

별도 Home surface를 제거하고 `/`를 저장 상태 기반 entry router로 바꿨다.

- 유효한 저장 Flow가 없음: `/` → `/flows`
- 유효한 저장 Flow가 있음: `/` → `/my`
- navigation: `Flow 찾기 / 캘린더 / 내 Flow` 세 개
- `/flows`, `/calendar`, `/my`, `/f/[slug]` direct route 유지
- 저장 key, schema, identity, migration 변경 없음

entry router는 localStorage의 기존 `flow:saved:` 또는 `flow:map:saved:` record를 읽기만 한다. malformed record 또는 storage 접근 실패는 `/flows`로 안전하게 보낸다.

## Evidence

- [상세 audit](./audit.md)
- [route evidence](./route-evidence.json)
- [빈 저장 상태 390px](./screenshots/p35-01-entry-empty-390.png)
- [저장 있음 상태 390px](./screenshots/p35-01-entry-saved-390.png)
- [3탭 navigation 1024px](./screenshots/p35-01-nav-1024.png)
- [3탭 navigation 1440px](./screenshots/p35-01-nav-1440.png)

## 검증

- `npm.cmd run docs:check`: pass
- `npm.cmd test`: 589/589 pass
- `npm.cmd run build`: pass, `.next/BUILD_ID` present
- `tests/e2e/p35-entry-router.spec.ts`: 4/4 pass
- navigation/public regression E2E: 45/45 pass
- horizontal overflow: 0
- fixed navigation overlap: 0
- console/page error: 0
- `git diff --check`: pass

자동화, screenshot, heuristic review는 실제 사용자 검증이 아니다.
