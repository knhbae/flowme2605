# Canonical Flow Data Model v1 QA

## Required Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Runtime/app change | Pass | 새 spec, fixture, validator, review artifact, decision/index만 추가·갱신했다. 앱 route/component/runtime package/DB/env는 변경하지 않았다. |
| Reference contract strict compile | Pass | `npx.cmd tsc --noEmit --strict --target ES2022 --module ESNext --moduleResolution Bundler canonical-flow-contract.ts` |
| Validator syntax | Pass | `node --check scripts/content-audit/validate-canonical-flow-model.mjs` |
| Golden fixture validation | Pass | 10 positive + 2 negative, 9 life areas, 7 planning patterns, 5 projection targets; hash/reference/owner/order/score/projection invariant |
| JSON parse | Pass | `golden-fixtures-v1.json` UTF-8 parse |
| HTML ↔ fixture parity | Pass | 12개 name/readiness/expected/forbidden 값 자동 대조 |
| HTML desktop review | Pass | Playwright 1440px: document/body `scrollWidth=1440`, 11 sections, 12 fixtures, console error 0 |
| HTML 390px review | Pass | Playwright 390px: document/body `scrollWidth=390`, Item hierarchy와 fixture cards viewport 시각 확인 |
| `npm.cmd run docs:check` | Pass | skill sync와 14 required files / 1,959 local links 검사 |
| `git diff --check` | Pass | whitespace error 없음; 기존 working-copy LF→CRLF 경고만 있음 |

## Contract Review Checklist

- [x] Item은 독립적으로 완료·결정·기록·보류 상태를 갖는 최소 단위다.
- [x] SourceRow는 Item 근거를 추적하는 최소 단위다.
- [x] Step은 Item을 묶지만 Item 상태를 대신 저장하지 않는다.
- [x] ICS는 schedule이 있는 effective Item/occurrence의 calendar serialization이다.
- [x] 체크리스트, sheet, memo도 같은 effective model의 projection이다.
- [x] caution과 review는 fake task가 되거나 사용자 export에 유출되지 않는다.
- [x] source/published content, user overlay, run state, occurrence override의 소유권이 분리됐다.
- [x] 새 published version은 사용자 사본에 자동 적용되지 않는다.
- [x] source acquisition, generation UX, content lifecycle, execution 상태를 한 enum에 섞지 않는다.
- [x] localStorage migration은 additive이고 rollback이 가능하다.

## Claim Boundary

이 문서가 `Pass`가 되더라도 backend, database, RLS, crawler, LLM, 실제 export parity, 사용자 검증이 완료됐다는 뜻은 아니다. 이는 구현 가능한 계약과 정적 fixture 품질만 증명한다.

Full app test/build는 실행하지 않았다. 이번 변경은 runtime을 건드리지 않았고, 다음 구현 slice의 canonical adapter와 projection parity가 생기기 전에는 기존 앱 통과가 새 계약의 동작을 증명하지 않기 때문이다.
