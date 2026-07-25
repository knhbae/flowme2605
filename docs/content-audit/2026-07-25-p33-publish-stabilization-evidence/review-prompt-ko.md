# FlowMe P33 Draft PR 독립 검토 프롬프트

아래 내용을 Claude Design 또는 Claude Code에 그대로 전달한다.

---

FlowMe P33 Draft PR을 독립적으로 검토해줘. 앱을 먼저 수정하지 말고 현재 branch,
Draft PR, preview, source와 evidence를 대조해 correctness와 UX 회귀를 평가한다.

## 검토 대상

- Draft PR:
  https://github.com/knhbae/flowme2605/pull/156
- Branch:
  `codex/p33-integrated-program-plan`
- Stabilization implementation commit:
  `abb0a993077d53cafe365515df0289b3b3654354`
- Vercel preview:
  https://flowme2605-git-codex-p33-integrated-program-plan-flowme.vercel.app
- Evidence package:
  https://github.com/knhbae/flowme2605/tree/codex/p33-integrated-program-plan/docs/content-audit/2026-07-25-p33-publish-stabilization-evidence
- 기존 P33 기능 evidence:
  https://github.com/knhbae/flowme2605/tree/codex/p33-integrated-program-plan/docs/content-audit/2026-07-24-p33-cross-entry-canonical-alignment-evidence
- P33 spec:
  https://github.com/knhbae/flowme2605/tree/codex/p33-integrated-program-plan/docs/specs/2026-07-24-p33-cross-entry-canonical-alignment

Production `https://flowme2605.vercel.app`은 아직 P33이 아니라 P32 기준선이다.
production 화면을 P33 결과로 평가하지 않는다.

Preview가 Vercel SSO로 막히면 로그인을 우회하지 말고
`evidenceKind=inaccessible_preview`로 기록한 뒤 PR source와 evidence package로
계속 검토한다.

## 반드시 확인할 문제

1. 개인 메모 작성 -> Item 제외 -> reload -> 복구 후 메모가 동일한가?
2. legacy `excluded_on_start`가 제외 상태로는 읽히지만 사용자 메모/export에는
   나타나지 않는가?
3. execution skip과 personal exclusion이 다른 상태로 유지되는가?
4. AJD source/job/variant triple의 canonical ID가 registry와 factory에서 같은가?
5. 이전 P33 preview ID가 compatibility read로만 동작하고 신규 write identity가
   되지 않는가?
6. 24개 canonical copy와 5개 legacy copy가 자동 병합되거나 삭제되지 않는가?
7. source-backed My Flow 메모를 저장한 뒤 hard reload해도 같은 메모가 editor에
   보이는가?
8. `/my` server document의 4탭 shell이 hydration 전에도 유지되는가?
9. Home, Flow 찾기, URL lookup, legacy alias가 같은 24개 canonical detail로
   이어지는가?
10. receipt, My Flow, Calendar, export의 title/count/identity가 일치하는가?

## UX/브라우저 검토

- 390x844
- 1024x768
- 가능하면 1440x900

다음을 확인한다.

- horizontal overflow
- fixed/sticky overlap
- console/page error
- keyboard focus order
- accessible name
- 제외/복구 action 문구
- duplicate copy 선택과 archive/restore의 예측 가능성
- 메모 저장 후 reload 시 화면 깜빡임 또는 source fallback 노출

## 데이터 안전 원칙

- source content를 개인 값으로 덮지 않는다.
- 기존 `flow:saved:*` key를 삭제하지 않는다.
- 24개/5개 Item을 자동 병합하지 않는다.
- source URL 하나만으로 canonical identity를 만들지 않는다.
- completion, run, occurrence, export identity를 재생성하지 않는다.
- P34 UX 기능이나 dependency upgrade를 이번 평가에 섞지 않는다.

## 검증

가능하면 clean checkout에서 실행한다.

- `npm.cmd ci`
- `npm.cmd run docs:check`
- `npm.cmd test`
- `npm.cmd run build`
- `Test-Path .next/BUILD_ID`
- P33 targeted E2E
- source-backed memo reload E2E 반복
- `npx.cmd playwright test --workers=1`
- `git diff --check`

자동화, screenshot, heuristic simulation은 실제 사용자 검증이 아니다.
Observed-user count는 `0`으로 유지한다.

## 결과 형식

1. Severity 순 findings
2. route, viewport, 재현 단계, 기대/실제
3. evidenceKind
4. 개인 메모/제외 상태 판정
5. canonical ID/legacy 호환 판정
6. memo reload와 SSR shell 판정
7. 24개/5개 데이터 보존 판정
8. 검증 명령과 정확한 pass/fail 수
9. preview 접근과 GitHub check 상태
10. 아래 최종 verdict 중 하나
   - `publish_ready_for_preview`
   - `bounded_fix_remaining`
   - `block_publish`

검토 중 app code, dependency, branch, PR, merge, deploy를 변경하지 않는다.
