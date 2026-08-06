# P1-04 극단값·접근성·legacy 최종 내부 gate closeout

**판정:** `PASS — LOCAL INTERNAL GATE`

**기준:** candidate pre-freeze local working tree · 2026-08-05 KST

**게시·관찰 경계:** candidate commit·push와 blind-only A/B는 Owner 승인됐고 exact SHA는 이 source commit 뒤 외부 freeze record에 기록한다. PR·merge·Preview·Production은 승인되지 않았다. 실제 관찰 사용자 `0명`이며 V1은 현재 프로그램 범위 밖이다.

P1-04는 새 기능을 추가하는 단계가 아니라 P1-01~03 결과가 큰 데이터, 긴 콘텐츠, 접근성, legacy·malformed 상태에서도 손실 없이 작동하는지 확인하는 최종 내부 회귀 gate다. Candidate preflight에서 공개 화면을 보기만 해도 storage가 쓰이는 결함을 발견해 read-only 경로로 교정했고, 최종 direct gate `6/6`, P35 `358/358`, 전체 E2E `529/529`, 전체 unit `1,086/1,086`, production build `18/18`이 통과했다. 확인한 범위에서는 데이터 손실, 초기 silent write, 중복 저장·내보내기, 원인 미확인 browser error, 제품 회귀가 남지 않았다.

세부 증거는 [P1-04 evidence index](./evidence/p1-04/README.md)와 [E2E manifest](./evidence/p1-04/e2e-manifest.md)에 있다.

## 1. 사용자 결과

- 저장한 계획이 0·1·5·20개인 상태와 실제 Item이 1·8·24·50개인 상태에서 핵심 탐색·편집·저장·다시 열기·내보내기 경로가 유지된다.
- 실제 저장 데이터 50개를 편집한 뒤 reload해도 Item ID와 순서가 유지되고, 한 번의 확인으로 50개 Checklist artifact가 한 번만 생성된다.
- 긴 한국어 제목, 여러 줄 메모·완료 기준, tab, quote, backslash, emoji가 편집·저장·artifact에 보존된다.
- dated·undated·mixed, repeat, overdue, archived, completed 상태가 기존 P35 회귀에서 유지된다.
- 키보드만으로 중첩 편집기를 열고 닫을 수 있고, focus trap·focus return·ARIA dialog relation·reduced motion 계약이 유지된다.
- source-backed 저장본은 계속 읽을 수 있고, missing-base·malformed 저장본은 안전하게 제외된다. 이 과정에서 local/session storage 원문 byte는 바뀌지 않는다.
- exact `off`와 대문자 `OFF`의 의미를 구분하며, 여덟 rollback flag를 통과해도 보호 대상 storage byte가 바뀌지 않는다.

## 2. 최종 검증 매트릭스

| 범위 | 판정 | 확인한 근거 | 경계 |
|---|---|---|---|
| 저장 계획 수 `0 / 1 / 5 / 20` | `PASS` | empty, single, five-plan, searchable twenty-plan library 경로 | 결합 회귀 매트릭스 |
| 실제 Item 수 `1 / 8 / 24 / 50` | `PASS` | 실제 canonical/saved data, 50개 ID·reload·artifact count | DOM 복제 수치가 아님 |
| 긴 한국어·multiline·tab·quote·backslash·emoji | `PASS` | 50-Item saved editor와 Checklist payload | 제목·메모·완료 기준 분리 |
| dated / undated / mixed | `PASS` | P35 unit·browser 회귀 | 날짜 없는 Item의 Calendar 보류 계약 포함 |
| `America/New_York` DST wall-clock | `PASS · UNIT` | DST 경계에서 local wall-clock 유지 | 실제 다운로드 UTC offset 검사는 아래 `NOT_ASSESSED` |
| Calendar UTC offset이 포함된 실제 browser download | `NOT_ASSESSED` | 승인된 직접 증거 없음 | V1 전 별도 browser fixture 필요 |
| repeat / overdue / archived / completed | `PASS` | 반복 회차, 기한 경과, archive 복구, 완료·다시 열기 회귀 | 결합 P35·full E2E |
| keyboard / ARIA / focus trap·return | `PASS` | 중첩 Plan→Item dialog keyboard-only 경로 | 자동화된 접근성 계약 검사 |
| reduced motion | `PASS` | `prefers-reduced-motion: reduce`, visible subtree 최대 duration `<= 0.001s` | 실제 보조기기 사용성 관찰은 아님 |
| `390×844` | `PASS` | library, nested editor, 50 Item, rollback, legacy captures | 직접 캡처 |
| `1024` / `1440×1000` | `PASS` | 전체 viewport 회귀와 기존 P1 캡처·browser checks | P1-04 신규 캡처는 390 중심 |
| `720×500` reflow proxy | `PASS · PROXY` | 20-plan library의 overflow·조작 가능성 | 실제 browser zoom 200%와 동일하다고 주장하지 않음 |
| 실제 browser 200% zoom | `NOT_ASSESSED` | DevTools/브라우저 zoom 직접 증거 없음 | 별도 수동 browser gate 필요 |
| source-backed / missing-base / malformed | `PASS` | fail-safe open·exclude, local/session snapshot byte equality | 자동 migration·rewrite 0 |
| public initial render write | `PASS · DIRECT GATE` | default/exact-off/uppercase storage write `0`, raw bytes 보존 | 명시적 편집·anchor 변경만 transaction 허용 |
| duplicate save / export | `PASS` | duplicate identity 방지, confirmation/request coupling, 50개 clipboard write `1회` | 저장·내보내기 각각 기존 회귀 포함 |
| artifact field parity | `PASS` | Sheet stable `18열`, Checklist/Memo/Calendar 의미 parity | P1-03 golden과 final full regression |
| console / page / network error | `PASS · DIRECT GATE` | direct P1-04 6개 test의 수집 결과 `0` | 의도된 `net::ERR_ABORTED`는 수집 제외 규칙 |
| 성능 | `NOT_ASSESSED` | 승인된 threshold·측정법 없음 | “성능 통과”로 표현하지 않음 |
| 실제 관찰 사용자 | `0명` | 관찰 세션 미실행 | V1은 현재 프로그램 범위 밖 |

## 3. Direct final gate 6개

`tests/e2e/p35-p1-final-internal-gate.spec.ts`의 최종 `6/6 PASS`가 다음을 직접 확인했다.

1. 20개 저장 계획이 390px와 720×500 reflow proxy에서 검색·탐색 가능하고 horizontal overflow가 없다.
2. 중첩 Plan→Item 편집기가 keyboard focus를 가두고, dialog ARIA 관계를 유지하며, Escape 뒤 호출 지점으로 focus를 돌려주고 reduced motion을 따른다.
3. 실제 저장 Item 50개의 stable ID가 편집·저장·reload 뒤에도 같고, 긴 특수문자 콘텐츠와 50개 artifact가 중복 없이 유지된다.
4. source-backed·missing-base·malformed record를 읽을 때 안전하게 열거나 제외하며 storage snapshot이 byte-identical이다.
5. exact-off와 uppercase control에서 여덟 rollback flag의 on/off 의미가 유지되고 보호 대상 local/session byte가 바뀌지 않는다.
6. 공개 initial render는 default·exact-off·uppercase 모두 persistent write `0`이고 raw bytes를 보존한다. 실제 legacy Item 편집과 anchor 변경만 각각 명시적 transaction으로 저장된다.

## 4. 전체 회귀와 build

| 검증 | 최종 결과 | 세부 |
|---|---:|---|
| P1-04 direct Playwright | `6/6 PASS` | extremes·a11y·legacy·rollback·public zero-write; `2.8m` |
| full Playwright | `529/529 PASS` | `workers=4`, `retries=0`, `26.0m` |
| stale-contract 집중 suite | `163/163 PASS` | 승인 Q3·저장 우선 IA와 legacy selector 정렬 |
| `npm.cmd run test:p35-p0` | `358/358 PASS` | P35 P0/P1 계약 |
| `npm.cmd test` | `1,086/1,086 PASS` | pretest `114/114` + P35 `358/358` + main `614/614` |
| `npm.cmd run build` | `PASS` | Next `15.5.21`, pages `18/18`, pre-freeze BUILD_ID `vAb8e5TudUXvxEyowetMU` |
| `npm.cmd run docs:check` | `PASS` | required docs `14`, local links `4,308` |

### Full E2E 수렴 기록

기존 P1-04 closeout 전 두 번의 full run은 각각 `526/528`, `527/528`로 끝났고 세 test-readiness race를 교정해 `528/528`로 수렴했다. 이후 independent-evidence rehearsal의 S17이 공개 초기 render의 silent storage write를 실제 제품 결함으로 발견했다. 공개 read path를 `readOnly`로 분리하고 initial migration/write-on-read를 제거한 뒤 direct gate를 6개로 확장했다.

- 각 실패 slice를 `workers=1`, `retries=0`으로 분리해 제품 동작을 확인했다.
- 제품 코드는 바꾸지 않고 readiness wait, locator scope, 해당 시나리오의 bounded timeout만 테스트 코드에서 최소 교정했다.
- 교정된 slice는 단독·파일 범위와 repeat/parallel stress로 다시 확인했다.
- 제품 수정 뒤 첫 `529`개 full run은 `527/529`였다. 한 실패는 zero-write 계약과 충돌하는 과거 테스트 기대였고, 다른 하나는 의미 단언이 통과한 뒤 Calendar 선택에서 전역 30초 test budget만 넘긴 경우였다.
- storage 불변 단언으로 과거 기대를 교체하고 해당 장기 여정만 60초 bounded timeout을 적용했다. 두 slice는 `2/2`로 재통과했다.
- 같은 local working tree의 마지막 full run은 `workers=4`, `retries=0`에서 `529/529 PASS`(`26.0m`)였다.

이 이력은 중간 실패를 숨기지 않기 위한 것이다. 최종 판정은 마지막 full run을 기준으로 하며, retry로 통과시킨 결과가 아니다.

## 5. 스크린샷 01~07

1. [01-twenty-plan-library-390x844.png](./evidence/p1-04/screenshots/01-twenty-plan-library-390x844.png) — 20-plan 모바일 library
2. [02-twenty-plan-library-200pct-reflow-720x500.png](./evidence/p1-04/screenshots/02-twenty-plan-library-200pct-reflow-720x500.png) — 720×500 reflow proxy
3. [03-nested-item-editor-reduced-motion-390x844.png](./evidence/p1-04/screenshots/03-nested-item-editor-reduced-motion-390x844.png) — 중첩 Item editor·reduced motion
4. [04-all-exact-off-public-390x844.png](./evidence/p1-04/screenshots/04-all-exact-off-public-390x844.png) — public exact-off rollback
5. [05-real-fifty-item-long-editor-390x844.png](./evidence/p1-04/screenshots/05-real-fifty-item-long-editor-390x844.png) — 실제 50-Item 긴 콘텐츠 편집
6. [06-real-fifty-item-transfer-390x844.png](./evidence/p1-04/screenshots/06-real-fifty-item-transfer-390x844.png) — 실제 50-Item transfer confirmation
7. [07-legacy-read-only-fail-safe-390x844.png](./evidence/p1-04/screenshots/07-legacy-read-only-fail-safe-390x844.png) — legacy/malformed read-only fail-safe

파일명 `02-...200pct...`는 테스트 fixture의 목적을 나타낸다. 실제 브라우저 zoom을 200%로 조작해 확인한 증거가 아니므로 판정은 `720×500 reflow proxy PASS`, `actual browser 200% zoom NOT_ASSESSED`로 분리한다.

## 6. 남은 제한과 다음 gate

- 실제 browser 200% zoom: `NOT_ASSESSED`
- Calendar 실제 다운로드의 DST UTC offset: `NOT_ASSESSED`
- 승인 threshold 기반 성능: `NOT_ASSESSED`
- 실제 관찰 사용자: `0명`; V1은 현재 프로그램 범위 밖

따라서 P1-04의 **local internal implementation gate**는 닫지만 사용자 관찰·production 배포 완료를 뜻하지 않는다. 다음 단계는 승인된 candidate freeze·동일 SHA evidence·blind internal review다. V1은 현재 프로그램에서 제외됐고 PR·merge·Vercel Preview/Production은 승인되지 않았다.
