# Text Authoring MVP PoC 3자 내부 검토 키트

- 기준일: 2026-07-30
- 검토 범위: Text Authoring MVP PoC
- 고정 branch: `codex/text-authoring-ta-implementation-20260729`
- 고정 HEAD: `c09f859b30b854f6f897b8ec1eb781fd774fbeca`
- 고정 build ID: `Z0tyWh-SnVnefD-v8CRTs`
- 오너 검토: `pending`
- Claude Code 검토: `pending`
- Codex 검토: `completed / pass`
- Codex lane 미해결 범위 내 Blocking/High: `0`
- 전체 3자 게이트: `pending`
- 결정: `pending`
- 사용자 관찰: 이번 게이트에서 제외
- publish 상태: uncommitted dirty worktree, Vercel Preview `READY`, production unchanged

이 문서는 오너, Claude Code, Codex가 같은 MVP 범위를 독립적으로 확인하기 위한
정본이다. 세 검토는 내부 PoC 타당성·구현 준비 증거이며 실제 사용자 검증, 출시,
배포 또는 production readiness 증거가 아니다.

별도 publish action으로 현재 dirty-worktree runtime snapshot을
[Vercel Preview](./vercel-preview-deployment-ko.md)에 배포했다. Preview `READY`는
접근 가능한 검토 환경만 뜻하며, 위 고정 local build ID의 3자 게이트나 release
판정을 완료하지 않는다. P35 production은 변경하지 않았다.

## 검증할 핵심 가설

```text
일반 텍스트 입력
-> 원문을 보존한 Flow 구조 확인
-> 필요한 곳만 최소 수정
-> 로컬 저장 후 reload에서 같은 초안 복구
-> 대표 plain-text 파일 1개 내보내기
```

저장·복구와 대표 내보내기는 서로 대체하지 않는다. 내부 게이트에서는 두 경로가 모두
동작하는지 확인한다.

## 고정 범위

검토 전 hardening과 Blocking/High 판정 범위는 다음 네 가지다.

1. 저장 history/revision cap과 저장 실패 시 직전 저장값·현재 편집 보존
2. 같은 Step 안의 인접 Item만 merge하고 Step 경계에서는 fail closed
3. 누락·불일치 또는 지원하지 않는 source-update semantic diff를 부분 적용하지 않고
   fail closed
4. Text Authoring 소유 TypeScript diagnostics `0`과 해당 회귀 테스트

핵심 여정의 원문 손실, 관계없는 Step/Item 손상, 성공 안내 뒤 복구 불가, 저장·내보내기
불가도 Blocking 또는 High로 기록한다.

## 제외 범위

- My Flow 연동
- 기존 canonical 모델 통합 또는 migration
- 대규모 파일 분해와 제품 전체 리팩터링
- backend, cloud, account persistence, 동기화
- production 배포와 public publishing
- 모든 export 형식 완성

제외 범위의 개선 제안은 `Medium / Later`로 분리한다. 핵심 여정을 막는 직접 근거가
없는 한 이번 `fix` 범위로 승격하지 않는다.

## 공통 증거 규칙

- 세 검토는 같은 branch, HEAD, worktree 범위, build ID를 기록한다.
- 제품 코드나 사용자 문구가 바뀌면 build를 다시 만들고 세 검토를 모두 다시 연다.
- 각 검토자는 다른 검토자의 결론을 보기 전에 자기 finding과 verdict를 먼저 쓴다.
- finding은 `Blocking / High / Medium / Low`로 분류하고 파일·행·실행 결과를 연결한다.
- 자동 테스트와 agent review는 내부 QA 증거일 뿐 observed-user evidence가 아니다.
- commit, push, PR, merge, deploy는 이 검토와 별도 승인 상태다.

## 1. 오너 직접 확인

### 실행 준비

```powershell
cd D:\flowme2605\flow-text-authoring-ta
Get-Content -LiteralPath .next/BUILD_ID
npm.cmd run start -- -p 3104
```

build ID가 위 고정 값과 다르면 이 문서의 build ID를 먼저 갱신하고 Claude Code와
Codex도 같은 새 build를 검토한다. 브라우저에서
`http://127.0.0.1:3104/flows/new`를 연다.

### 오너 체크리스트

- [ ] 개인·민감 정보가 없는 평소식 일반 텍스트를 입력했다.
- [ ] 원문 조각이 Structure의 어느 Step/Item 또는 보류 표현과 연결되는지 확인했다.
- [ ] 최소 수정 1회를 수행했고 관계없는 Step/Item이 바뀌지 않았다.
- [ ] 로컬 저장 성공 안내 뒤 reload에서 같은 초안을 열거나 복구했다.
- [ ] 대표 plain-text 파일 1개를 내려받아 원문 의미와 Item 내용을 확인했다.
- [ ] 치명적 원문 손실, 관계없는 계층 손상, 복구 불가가 없었다.
- [ ] 이해하기 어려운 첫 지점과 계속 사용할지 여부를 한 줄로 기록했다.

오너 결과:

```text
branch:
HEAD:
build ID:
핵심 여정: pass / fail
원문 손실: none / occurred
관계없는 계층 손상: none / occurred
저장 후 복구 실패: none / occurred
plain-text export 실패: none / occurred
Blocking/High finding:
한 줄 의견:
오너 제안: continue / fix / stop
```

## 2. Claude Code 독립 검토

현재 Codex 환경에는 `claude` 명령이 없으므로 아래 프롬프트를 Claude Code 세션에서
그대로 실행하고 결과 Markdown을 이 폴더에
`mvp-poc-claude-code-review-ko.md`로 저장하거나 대화에 붙여 넣는다.

```text
D:\flowme2605\flow-text-authoring-ta의 현재 dirty worktree를 읽기 전용으로
독립 검토해줘. 기존 변경을 되돌리거나 수정하지 말고 commit/push/PR/deploy도 하지 마.

검토 목적은 제품 전체 리팩터링이 아니라 Text Authoring MVP PoC 핵심 여정이다:
일반 텍스트 입력 -> 원문 보존 Flow 구조 확인 -> 최소 수정 -> 로컬 저장/reload 복구
-> 대표 plain-text export.

Blocking/High 범위는 네 가지 P0로 제한한다:
1) 저장 history/revision cap과 저장 실패 시 직전 저장값·현재 편집 보존
2) 같은 Step 인접 Item만 merge, Step 경계 fail closed
3) 누락·불일치/unsupported source-update diff 전체 fail closed
4) Text Authoring 소유 TypeScript diagnostics 0과 회귀

추가로 핵심 여정의 원문 손실, 관계없는 계층 손상, 성공 안내 뒤 복구 불가,
plain-text export 불가를 Blocking/High로 보고해줘. My Flow/canonical 통합,
대규모 파일 분해, backend/cloud, production deploy, 모든 export 완성은 제외해.

현재 branch/HEAD/worktree/build ID, 실행한 명령과 결과, 요구사항별 pass/fail,
finding을 Blocking/High/Medium/Low로 구분하고 파일·행 근거를 제시해줘.
마지막에는 unresolved in-scope Blocking/High 수와 continue/fix/stop 제안을 써줘.
이 결과를 사용자 검증이나 release evidence라고 부르지 마.
```

Claude Code 결과:

```text
evidence file: pending
branch: pending
HEAD: pending
build ID: pending
unresolved Blocking/High: pending
verdict: pending
```

## 3. Codex 독립 검토

Codex는 현재 repository command, 소유 코드/테스트, focused browser path를 근거로
검토한다. 결과 파일:

- [Codex 독립 검토 결과](./mvp-poc-codex-review-ko.md) — `completed / pass`,
  unresolved in-scope Blocking/High `0`, `continue candidate`

## 3자 Rollup

| Reviewer | Evidence | Same build/scope | Core journey | Unresolved Blocking/High | Verdict |
| --- | --- | --- | --- | ---: | --- |
| Owner | pending | pending | pending |  | pending |
| Claude Code | pending | pending | pending |  | pending |
| Codex | [report](./mvp-poc-codex-review-ko.md) | yes | automated/browser pass | 0 | continue candidate |

## 검토 완료, 성공 후보와 결정

```text
review_complete =
  owner_record_exists
  AND claude_code_record_exists
  AND codex_record_exists
  AND same_build_and_scope == true

continue_candidate =
  review_complete
  AND owner_core_journey == pass
  AND unresolved_in_scope_blocking_high == 0
```

- `pending`: 필수 검토 기록이 없거나 branch·HEAD·build ID·범위가 섞였다.
- `continue`: `continue_candidate == true`일 때만 선택한다. 다음 제한 실험은 별도 범위로 정한다.
- `fix`: 재현 가능한 범위 내 Blocking/High 또는 오너 핵심 여정 결함을 수정하고,
  변경된 build에서 영향받는 검토를 다시 연다.
- `stop`: 오너가 핵심 여정 또는 접근 가설 자체를 중단하고 재정의하기로 결정한다.

`continue`여도 실제 사용자 검증, production 배포, publish 승인 또는 제품 전체
완료를 뜻하지 않는다.
