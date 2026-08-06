# P1-04 E2E·regression manifest

**최종 판정:** `PASS`

**기준:** 2026-08-05 KST local working tree

**retry 경계:** 최종 full E2E는 `retries=0`이다. 중간 실패를 retry로 숨기지 않고 test-readiness를 교정한 뒤 full suite를 새로 실행했다.

## 1. 최종 실행 ledger

| lane | 실행 범위 | 결과 | 비고 |
|---|---|---:|---|
| P1-04 direct | `tests/e2e/p35-p1-final-internal-gate.spec.ts` | `6/6 PASS` | public initial zero-write 포함; critical skip 없음; direct diagnostic error `0`; `2.8m` |
| full E2E | `npm.cmd run test:e2e -- --workers=4 --retries=0` | `529/529 PASS` | `26.0m`; exit `0`; log SHA-256 `33F16BA4F0921955269363B00B6E467D41D72ED37BAE20F7AD06C62EBFAC74FA` |
| stale-contract 집중 suite | 6개 legacy P24/P26/core spec | `163/163 PASS` | `workers=1`, `retries=0` |
| P35 regression | `npm.cmd run test:p35-p0` | `358/358 PASS` | P35 P0/P1 |
| full unit | `npm.cmd test` | `1,086/1,086 PASS` | pretest `114`, P35 `358`, main `614` |
| build | `npm.cmd run build` | `PASS` | Next `15.5.21`, pages `18/18`, pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU` |

Stale-contract 집중 suite 파일:

- `tests/e2e/flow-mvp.spec.ts`
- `tests/e2e/p24-journey-frame-reset.spec.ts`
- `tests/e2e/p24-execution-trust.spec.ts`
- `tests/e2e/p26-date-intent.spec.ts`
- `tests/e2e/p26-discovery-save-before.spec.ts`
- `tests/e2e/p26-my-flow-local-ia.spec.ts`

## 2. Direct gate test manifest

| test | 주요 assertion | evidence |
|---|---|---|
| 20 saved plans remain operable | 20개 count, searchable state, 390 inventory 20개, 720×500 reflow, overflow·error 0 | screenshots 01·02 |
| nested editor accessibility | keyboard Enter/Escape, one visible nested dialog, ARIA modal, focus wrap/return, reduced-motion duration | screenshot 03 |
| real 50-Item saved data | 실제 50개 unique ID, scroll/footer geometry, long content, save·reload identity, 50-output confirmation, clipboard write 1 | screenshots 05·06 |
| source-backed/missing-base/malformed fail-safe | source-backed visible, missing/malformed excluded, page usable, before/after storage exact equality | screenshot 07 |
| exact-off/uppercase rollback | 여덟 flag의 exact `off`와 uppercase `OFF` 구분, legacy/shared adapter, protected local/session bytes equality | screenshot 04 |
| public initial read-only storage | default/exact-off/uppercase initial writes `0`, raw local/session bytes 보존, explicit legacy Item edit와 anchor 변경만 transaction | state/storage trace |

Direct gate의 `collectBrowserErrors`는 console `error`, `pageerror`, unexpected `requestfailed`를 수집했다. 최종 6개 test의 수집 배열은 모두 비어 있었다. 브라우저 navigation에서 의도적으로 발생할 수 있는 `net::ERR_ABORTED`만 명시적으로 제외했다.

## 3. Full E2E 수렴 이력

| 순서 | 결과 | 해석·조치 |
|---:|---:|---|
| 1 | `526/528 PASS` | 병렬 부하에서 test-readiness race 2건 확인 |
| 2 | `527/528 PASS` | 별도 test-readiness race 1건 추가 확인 |
| 3 | `528/528 PASS` | 세 race를 테스트 전용으로 교정한 최종 clean run |
| 4 | `527/529 PASS` | S17에서 발견한 실제 silent-write 제품 결함 교정 뒤, 과거 write 기대 1건과 장기 여정 30초 budget 1건 확인 |
| 5 | `529/529 PASS` | zero-write assertion과 해당 여정 bounded timeout을 정렬한 최종 새 full run; 실패·skip·retry `0` |

1~3번의 세 race는 제품 결과 불일치가 아니라 route/detail이 준비되는 시점, 동적 `:visible` locator의 scope, 긴 multi-step scenario의 30초 test budget이 4-worker 경합에서 불안정했던 것이다. 그 뒤 independent-evidence S17은 별개의 실제 제품 결함을 발견했다. 공개 initial render가 default에서 1회, exact-off에서 19회 storage를 쓰던 경로를 read-only로 교정했고 direct gate에 0-write 계약을 추가했다.

교정 원칙:

- 제품 코드는 변경하지 않는다.
- canonical route/sheet/dialog가 준비됐음을 명시적으로 기다린다.
- broad dynamic locator 대신 실제 owner surface로 scope한다.
- 긴 시나리오에만 bounded per-test timeout을 적용하고 global timeout은 바꾸지 않는다.
- 각 실패 slice를 `workers=1`, `retries=0`으로 진단하고, 수정 뒤 단독·파일 범위·repeat/parallel stress를 통과시킨다.
- 마지막 근거는 `workers=4`, `retries=0` full run `529/529`(`26.0m`, exit `0`)이다.

## 4. 결합 coverage manifest

| 축 | 포함 값 | 근거 lane |
|---|---|---|
| plan count | `0 / 1 / 5 / 20` | P35 + full E2E + direct 20-plan |
| actual Item count | `1 / 8 / 24 / 50` | canonical/saved fixtures + direct real 50-item |
| content stress | long Korean, multiline, tab, quote, backslash, emoji | direct 50-item editor/artifact |
| date shape | dated, undated, mixed | unit + P35/full browser |
| timezone | New York DST wall-clock | unit |
| lifecycle | repeat, overdue, archived, completed | P35/full browser |
| accessibility | keyboard, ARIA, focus trap/return, reduced motion | direct gate |
| viewport | 390, 1024, 1440; 720×500 reflow proxy | direct + combined viewport regression |
| compatibility | source-backed, missing-base, malformed, exact-off rollback | direct gate |
| mutation safety | public initial write `0`; byte-identical local/session storage; explicit edit만 transaction | direct gate |
| duplication | duplicate save/export 0; 50-item clipboard write 1 | direct + P35/full |
| artifact parity | Sheet `18열`, Checklist/Memo/Calendar semantic parity | P1-03 golden + final regression |

## 5. `NOT_ASSESSED`와 공개 상태

| 항목 | 상태 | 이유 |
|---|---|---|
| 실제 browser 200% zoom | `NOT_ASSESSED` | 720×500은 reflow proxy이며 브라우저 zoom 직접 조작이 아님 |
| 실제 Calendar download의 DST UTC offset | `NOT_ASSESSED` | New York wall-clock unit은 통과했지만 실제 다운로드 offset 증거 없음 |
| 성능 | `NOT_ASSESSED` | 승인된 threshold·측정법 없음 |
| observed users | `0명` | 사용자 관찰 미실행 |
| candidate commit / push | `AUTHORIZED` | exact SHA와 clean proof는 이 source commit 뒤 외부 freeze record에 기록 |
| PR / merge | `NOT_AUTHORIZED` | 기존 Draft PR #165도 갱신하지 않는 새 candidate branch 사용 |
| Preview / Production deploy | `NOT_AUTHORIZED` | candidate branch의 Vercel Git deployment 비활성화 |

자동화와 스크린샷은 P1-04 local internal gate 근거이며 사용자 관찰이나 production 배포 근거가 아니다. V1은 현재 프로그램 범위 밖이다.
