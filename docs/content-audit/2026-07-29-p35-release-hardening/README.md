# FlowMe P35 release hardening

- 실행일: 2026-07-29
- 기준 branch: `agent/p35-release-hardening`
- P35 release merge: `4a51b08ce9c5410f4ddf492562a5e885b0fda09c`
- hardening integration base: `6905021a4f41e1bb46923a62041b778415680f00`
  (PR #162 merge)
- runtime / storage / schema 변경: 없음
- observed-user count: `0`

## 목적

기존 P35-R13 자동화는 기본 cross-Flow `할 일`과 rollback을 주로
`demo=ux12` fixture에서 검증했다. 제품 경로가 fixture 없이도 같은 계약을 지키는지
명시적으로 증명하기 위해 실제 public Flow 저장 뒤 literal route를 확인하는 회귀 테스트
두 개를 추가한다.

## 추가한 회귀 계약

1. `/f/moving-d30-basic`에서 실제 Flow를 localStorage에 저장한 뒤 literal `/my`로
   진입하면 cross-Flow `할 일`이 기본으로 선택되고, 같은 화면에서 인접한 `Flow`
   보기로 이동할 수 있다.
2. 같은 fresh one-Flow 실제 저장본으로 literal `/my?experiment=off`에 진입하면
   cross-Flow 실험 표면 없이 기존 Flow hub가 열리고, 정렬된 모든 `flow:*`
   localStorage key/value의 직렬화 결과가 진입 전후 byte-equivalent로 유지된다.

이 검증은 해당 대표 상태의 회귀 근거다. 기존 Calendar scope key가 있거나 더 큰
workspace가 mount되며 수행하는 storage normalization까지 불변이라고 주장하지 않는다.

구현 파일:

- `tests/e2e/p35-release-hardening-literal-routes.spec.ts`

## 검증

- literal-route E2E: `2 / 2` pass, `workers=1`
- dependency audit: high 이상 `0`
- unit: pretest `100 / 100`, test `594 / 594`, 합계 `694 / 694`
- production build: pass
- P35 Playwright: `81 / 81`, `workers=1`
- full Playwright: `407 / 407`, `workers=1`
- docs check: 14 required files, 3,606 local links
- route evidence JSON parse, `git diff --check`: pass

P35 `81 / 81`과 full E2E `407 / 407`은 P35 release merge `4a51b08`
위에서 실행했다. 이후 통합한 `6905021`까지의 변경은 정본 문서와 HTML 리뷰
산출물뿐이며 런타임·기존 테스트 파일 변경은 없다. 최신 통합 상태에서는
unit `694 / 694`, production build, literal-route `2 / 2`, docs check,
JSON parse, diff check를 다시 실행했다.

## 현재 release 사실

- [PR #161](https://github.com/knhbae/flowme2605/pull/161)은 2026-07-29에
  merge `4a51b08ce9c5410f4ddf492562a5e885b0fda09c`로 병합됐다.
- PR CI
  [30425149316](https://github.com/knhbae/flowme2605/actions/runs/30425149316)과
  main CI
  [30425766217](https://github.com/knhbae/flowme2605/actions/runs/30425766217)은
  Docs/Unit/Build와 Playwright E2E를 모두 통과했다.
- Vercel Preview는 PR head `ebf480f`, Vercel Production은 merge SHA에서
  성공했다. canonical production `https://flowme2605.vercel.app`은 독립 확인 시
  HTTP 200이었다.
- 후속 PR #162 closeout은 390px·1024px의 제한된 production smoke `6 / 6`을
  기록하지만 원시 smoke artifact를 연결하지 않는다. 이번 hardening에서는 그
  production smoke를 독립 재실행하지 않았다.
- CI, 배포, 도달성, 자동 smoke는 observed-user validation이 아니다.

## 이 hardening의 경계

- 이 변경은 테스트와 정본 문서만 보강한다.
- runtime behavior, storage, schema, migration은 바꾸지 않는다.
- Git commit, PR, merge, CI, 배포 상태는 저장소와 외부 publish ledger에서 확인하며,
  어느 상태도 observed-user validation을 뜻하지 않는다.
