# P0-09 내부 검증 증거 인덱스

**상태:** `PASS — LOCAL INTERNAL EVIDENCE`

**판정 경계:** 이 폴더는 P0-09 local 내부 PASS의 증거다. production 배포나 observed-user validation의 증거가 아니다.

**실제 관찰 사용자:** `0명`

## 현재 확보한 자동 증거

| 증거 | 결과 | 범위 |
|---|---|---|
| focused transfer/storage/journal/artifact/confirmation bundle | PASS · `32/32` | immutable request, artifact/receipt 순서, partial-local, no-cap, cleanup journal, retryable CTA |
| `npm.cmd run test:p35-p0` | PASS · `319/319` | P35 Round 2 P0 unit/component regression |
| `npm.cmd test` | PASS · pretest `113/113` + P35 P0 `319/319` + remaining `608/608`, command exit `0` | 전체 unit/workflow regression |
| `npm.cmd run build` | PASS · Next `15.5.21`, static pages `18/18` | production compile·Next app typecheck |
| core + format result-transfer E2E | PASS · `18/18` | fresh local production server port `3114`, workers `1`, retries `0` |
| 영향받는 P26/P35 회귀 4종 | PASS · `12/12` | responsive, unified export, scope-first, capability preview |
| local backup E2E | PASS · `3/3` | receipt registry exact-byte download/restore |
| retained evidence E2E | PASS · `6/6`, PNG `9장` | 390×844, 1024×768, 1440×1000 화면·diagnostics |
| `npm.cmd run docs:check` | PASS · `14` required files, `4,133` local links | final canonical docs까지 포함한 링크·형식 검사 |
| `git diff --check` | PASS · whitespace error `0` | final canonical docs까지 포함; LF/CRLF 안내만 있음 |

direct full-project `tsc --noEmit`은 기존 test fixture diagnostic 다수로 실패했다. 이를 앱 production compile 실패로 표현하지 않는다. 생산 경로는 `tsconfig.next.json`과 Next build typecheck에서 PASS했고, fixture 정리는 P0-09 소유 밖이다.

## focused E2E 시나리오

| # | 시나리오 | 현재 결과 |
|---:|---|---|
| 1 | 390 clean public quick에서 save primary 유지, session 결과 1회, persistent/storage/history/network write `0` | PASS |
| 2 | 390 dirty public draft에서 quick 숨김, save만 primary | PASS |
| 3 | 390 custom public date를 dirty로 판정하고 save-free quick을 숨김 | PASS |
| 4 | 390 saved confirmation 취소에서 clipboard·storage·plan 불변과 opener focus 복귀 | PASS |
| 5 | Calendar Blob/object URL 생성 실패에서 receipt `0`, 같은 request retry 성공 `1` | PASS |
| 6 | 1024 saved clipboard transfer의 immutable persistent receipt와 reload reopen | PASS |
| 7 | 390 receipt persistence 실패의 `partial_local`과 artifact 재생성 없는 receipt-only retry | PASS |
| 8 | 390 pending synchronous double click의 artifact 1회·receipt 1회 | PASS |
| 9 | archive 후 정상 영구 삭제에서 해당 plan receipt만 제거 | PASS |
| 10 | cleanup journal 준비 실패에서 계획·receipt 보존 | PASS |
| 11 | receipt cleanup 실패 → reload → receipt-only retry → 재reload에서 stale 경고 `0` | PASS |
| 12 | `prepared` promotion 중단 → reload 복구 → artifact 재생성 `0` | PASS |
| 13 | 390/1024 quick·saved exact-off flag 독립성 | PASS |
| 14 | 1440 result surface horizontal overflow `0`, unnamed interactive control `0` | PASS |

형식 확장 `4/4`는 Calendar/ICS, Checklist, Sheet/TSV, Memo의 실제 local artifact와 persistent receipt parity를 별도로 검증했다.

이 `14/14 + 4/4`는 focused automated browser evidence다. 실제 사람의 이해를 증명하지 않는다.

## receipt 수명 증거 상태

| 계약 | 코드/자동 증거 | 남은 증거 |
|---|---|---|
| archive에서도 saved receipt 유지 | storage contract + archive browser E2E | PASS |
| 개인 백업에 registry 포함 | `flow:export-receipts:v1` exact-byte download/restore `3/3` | PASS |
| 영구 삭제 시 해당 plan receipt 제거 | 정상·실패·reload·prepared interruption E2E | PASS |
| silent cap·자동 pruning 없음 | receipt `128개` 순서·내용 보존 | PASS |
| quota/write 실패는 `partial_local` | core unit과 focused E2E | PASS |
| public quick은 session-only | storage/history/network no-write assertion | PASS |

cleanup journal은 탭 `sessionStorage` 범위라 새로고침에서는 유지되지만 탭 session 폐기 후에는 남지 않는다. 손상·접근 불가 journal/receipt은 자동 추정 삭제하지 않는다.

## retained 화면 증거

아래 PNG `9장`을 [screenshots](./screenshots/)에 보존했다.

| 화면 | 권장 viewport | 상태 |
|---|---:|---|
| [public clean entry](./screenshots/01-public-clean-entry-390x844.png), [confirmation](./screenshots/02-public-quick-confirmation-390x844.png), [session result](./screenshots/03-public-session-result-390x844.png) | 390×844 | PASS |
| [dirty public save-only](./screenshots/04-public-dirty-save-only-390x844.png) | 390×844 | PASS |
| [saved confirmation](./screenshots/05-saved-confirmation-390x844.png) | 390×844 | PASS |
| [saved receipt](./screenshots/06-saved-result-receipt-1024x768.png), [reload reopen](./screenshots/07-saved-reopened-receipt-1024x768.png) | 1024×768 | PASS |
| [`partial_local` receipt retry](./screenshots/08-partial-local-receipt-retry-390x844.png) | 390×844 | PASS |
| [wide saved confirmation](./screenshots/09-saved-confirmation-1440x1000.png) | 1440×1000 | PASS |

## 최종 증거 패키지에 추가할 항목

- [x] Calendar/ICS actual parser와 VEVENT count
- [x] Checklist clipboard text, TSV rows/columns, Memo field/content 검사
- [x] 계획 Item IDs/count와 actual artifact output count의 format별 비교
- [x] 기존 P26/P35 export·storage·library Playwright 회귀 `12/12`
- [x] `npm.cmd test` 전체 결과 · `113/113 + 319/319 + 608/608`, exit `0`
- [x] 390×844·1024×768·1440×1000 PNG `9장`과 console/page/request 진단
- [x] archive·backup·permanent-delete·cleanup failure reload/retry 수명 browser round-trip
- [x] final docs 수정 후 docs/diff 재실행 · required `14`, links `4,133`, whitespace error `0`

## Publish·validation ledger

| 상태 | 결과 |
|---|---|
| Local implementation | 완료 |
| P0-09 final PASS | `PASS · LOCAL INTERNAL GATE` |
| Commit / Push / PR / CI / Merge | 없음 / 안 함 / 안 함 / 미실행 / 안 함 |
| Preview / Production | 안 함 / 안 함 |
| Observed-user sessions | `0` |
| P0-10 | `IN_PROGRESS` |
