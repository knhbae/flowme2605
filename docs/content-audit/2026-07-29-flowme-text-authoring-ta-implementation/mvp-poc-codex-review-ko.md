# Text Authoring MVP PoC Codex 독립 검토

## 판정

- Codex lane: `PASS`
- 미해결 범위 내 Blocking/High: `0`
- Codex 제안: `continue candidate`
- 전체 3자 게이트: `pending` — 오너 직접 확인과 Claude Code 독립 검토가 남아 있다.

이 판정은 Text Authoring의 제한된 내부 PoC 증거다. 실제 사용자 검증, release,
production readiness, commit, push, PR, merge 또는 deploy 증거가 아니다.

## 증거 식별자

| 항목 | 값 |
| --- | --- |
| 기준일 | 2026-07-30 |
| worktree | `D:\flowme2605\flow-text-authoring-ta` |
| branch | `codex/text-authoring-ta-implementation-20260729` |
| HEAD | `c09f859b30b854f6f897b8ec1eb781fd774fbeca` |
| build ID | `Z0tyWh-SnVnefD-v8CRTs` |
| publish 상태 | 검토 시점 local only; 이후 Vercel Preview `READY`, production unchanged |

검토 이후 별도 publish action으로
[Vercel Preview](./vercel-preview-deployment-ko.md)가 생성되었다. 이 상태는 아래
Codex 판정과 고정 local build ID를 바꾸거나 오너·Claude Code 검토를 대신하지
않는다.

## 검토 범위

핵심 여정은 다음 두 결과를 모두 요구한다.

```text
일반 텍스트 입력
-> 원문 보존 Flow 구조 확인
-> 최소 수정 1회
-> 로컬 저장/reload 복구
-> 대표 plain-text export
```

P0는 저장 이력과 실패 보존, 같은 Step의 인접 Item만 merge, 누락·불일치·지원하지
않는 source semantic diff의 fail-closed 처리, Text Authoring 소유 TypeScript
diagnostics `0`과 회귀로 제한했다. My Flow/canonical 통합 또는 migration, 대규모
리팩터링과 파일 분해, backend/cloud/account, production deploy, 모든 export
형식 확장은 제외했다.

## 요구사항별 근거

| 요구사항 | 판정 | 코드·테스트 근거 |
| --- | --- | --- |
| 저장 history/revision cap | Pass | `storage.ts:14-15,189-194,228-236`; 대용량 저장 회귀 `infrastructure.test.ts:425-495` |
| 저장 실패 시 직전 저장값·현재 편집 보존 | Pass | typed failure와 rollback `storage.ts:21-48,421-468`; quota 회귀 `infrastructure.test.ts:497-535`; 브라우저 회귀 `text-authoring.spec.ts:1080-1134` |
| 같은 Step의 인접 Item만 merge | Pass | 경계·인접성 검사 `operations.ts:355-381`; cross-Step/non-adjacent 회귀 `operations.test.ts:746-795`; 브라우저 회귀 `text-authoring.spec.ts:1049-1078` |
| source-update diff fail closed | Pass | memo semantic guard `source-update.ts:540-727`; staged decision integrity `source-update.ts:1115-1164`; apply 전 검증 `source-update.ts:1516-1534`; 회귀 `source-update.test.ts:876-1058` |
| 로컬 저장/reload 복구 | Pass | held recovery와 explicit save 보존 `text-authoring.spec.ts:980-1047` |
| 대표 plain-text export | Pass | 파일 직렬화 회귀 `file-export.test.ts:33-96`; 실제 다운로드 회귀 `text-authoring.spec.ts:600-669` |
| TA-owned TypeScript diagnostics | Pass | repo-wide `190`, Text Authoring-owned 경로 `0`으로 분리 확인 |

## 검토 중 발견하고 닫은 항목

### Resolved Blocking — staged decision metadata 무결성

resolved change가 resolution 또는 actor metadata 없이 apply 경로에 들어갈 수 있었다.
apply 전에 state, resolution-kind 적합성, decidedAt, actorLane과 `keep_user` 값을
검증하고, 불완전하거나 불일치하면 문서와 revision을 바꾸지 않고 거부하도록 했다.

### Resolved Blocking — 지원하지 않는 memo semantic residue

`canonical.memos`의 설명되지 않는 변경이 source-update에 부분 적용될 수 있었다.
active/incoming memo가 source와 일치하는지, 명시된 지원 diff가 변경을 모두 설명하는지
stage와 apply에서 확인하고 그렇지 않으면 전체를 거부하도록 했다.

### Resolved Medium — review 미완료 저장 영수증의 외부 파일 경계

저장은 성공했지만 외부 파일을 만들지 않았다는 문구가 영수증에 명시되지 않아 focused
E2E 한 건이 실패했다. `AuthoringOverlays.tsx:181-182`에 경계를 명시했고
`text-authoring.spec.ts:822` 회귀를 통과시켰다.

## 현재 검증 결과

| 명령 | 결과 |
| --- | --- |
| `npm.cmd run security:audit` | Pass, vulnerabilities `0` |
| `npm.cmd run test:text-authoring` | Pass `85 / 85` |
| `npm.cmd test` | Pass: pretest `100 / 100` + unit `594 / 594` = `694 / 694` |
| `npx.cmd tsc --noEmit` | Non-zero, repo-wide diagnostics `190`; TA-owned diagnostics `0` |
| `npm.cmd run build` | Pass, static pages `18 / 18`; build ID `Z0tyWh-SnVnefD-v8CRTs` |
| focused `tests/e2e/text-authoring.spec.ts` | Pass `18 / 18` on the fixed build |
| legacy `/flows/new?legacy=1` regression | Pass `2 / 2` on the fixed build |

초기 focused E2E 시도 중 하나는 동시 Next server/build 교체로
`ERR_CONNECTION_REFUSED`가 발생해 제품 판정에서 제외했다. 서버와 build를 고정한 뒤
실제 영수증 문구 결함을 재현·수정했고, 최종 build에서 focused `18 / 18`과 rollback
`2 / 2`를 다시 통과시켰다.

## 남은 위험과 범위 경계

- 새 canonical semantic field를 이후 추가할 때 source-update guard coverage도 함께
  확장해야 한다. 현재 PoC blocker가 아닌 `Medium / Later`다.
- repo-wide TypeScript diagnostics `190`은 Text Authoring 밖의 기존 경계다. 이번
  PoC에서는 숨기지 않되 전체 저장소 리팩터링으로 확대하지 않는다.
- standalone HTML은 현재 소스에서 `2,005,758` bytes로 다시 생성했고,
  390/1024/1440px direct-file smoke에서 overflow, console/page error,
  외부 HTTP(S) 요청, mobile filter clipping이 모두 `0`이었다.

## Codex 결론

고정 범위의 제품 전체 리팩터링은 필요하지 않다. 두 fail-closed Blocking과 한 문구
결함을 제한적으로 닫은 현재 build에 대해 Codex lane은 `PASS`, 미해결 범위 내
Blocking/High는 `0`, 제안은 `continue candidate`다. 다만 전체 판정은 오너와
Claude Code가 같은 branch, HEAD, build ID, 범위를 확인할 때까지 `pending`이다.
