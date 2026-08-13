# FlowMe Text Authoring P0 승인 승격 결과

- **승인 ID:** `TA-P0-PROMOTE-20260813-01`
- **track/status:** `P0-PROMOTE / APPROVED_FOR_LOCAL_IMPLEMENTATION`
- **현재 상태:** 51개 승인 파일 적용·접근성 보강·fresh QA 완료 / 승인된 로컬 승격 커밋에 포함
- **관찰 사용자:** 0명

## 승인·Git 기준

| 항목 | 승인값 |
| --- | --- |
| source checkout | `D:\flowme2605\flow-text-authoring-service-p0-20260811` |
| source branch | `codex/text-authoring-service-p0-20260811` |
| target checkout | `D:\flowme2605\flow-text-authoring-integration-20260811` |
| target branch | `codex/text-authoring-v5-integration-20260811` |
| source/target baseline | `a5f2127eff75f8fdf91bbedd9e60526f47209049` |
| approved file count | `51` |
| approved row-set SHA-256 | `687E943319C86D9A60F947753453295AACCC7C68594DD480DE03BB5138281D45` |

승인된 source 파일은 각 path·bytes·SHA-256을 대조한 뒤 clean target에
적용했다. Source checkout은 변경하거나 정리하지 않았고, P1/P2 파일·schema·
flag·빈 UI는 승격 범위에 넣지 않았다.

## Fresh target QA

| 순서 | 명령·검증 | 현재 결과 |
| --- | --- | --- |
| 1 | `npm.cmd run docs:check` | PASS — 최종 required files `16`, local links `4555` |
| 2 | `npm.cmd run test:text-authoring` | PASS — `259/259` |
| 3 | `npm.cmd test` | PASS — exit code `0`; 불확실한 합계는 재기록하지 않음 |
| 4 | `npm.cmd run build` | PASS — exit code `0`, generated routes `19` |
| 5 | 승인된 Text Authoring Playwright 묶음 | PASS — 최종 runtime 기준 `58/58`, workers `4`, `3.9m` |
| 6 | responsive·접근성 | PASS — 320/360/390/899/900/1024/1280/1440, 200% reflow, reduced motion, 44px target, 오류→원문 프로그램 연결, keyboard/focus |
| 7 | 최종 scoped diff·ownership 검사 | PASS — P1/P2·provider·publication·P35·external write 혼입 `0`; source manifest drift `0` |

과거 source checkout의 `58/58` 브라우저 기록은
[2026-08-11 source 결과](../2026-08-11-flowme-text-authoring-service-p0-results/README.md)에
보존한다. 현재 target의 `58/58`은 이 승격 checkout에서 별도로 실행한 fresh
결과이며 과거 수치를 재사용한 것이 아니다.

첫 병렬 실행에서 unsaved-guard route 전환의 기존 `5s` 기대 시간이 한 차례
경계에 걸렸다. Trace에서는 RSC 응답이 즉시 왔고 `293KB` chunk가 `4.821s`,
URL commit이 `5.094s`에 끝난 것이 확인됐다. 제품 동작을 바꾸지 않고 해당
QA의 시간 예산만 trace에 근거해 보강한 뒤 같은 4-worker 묶음을 다시 실행해
`58/58`을 통과했다.

## 완료·출판 경계

| 상태 | 현재값 |
| --- | --- |
| target local edits | 승인된 P0 51개 파일, 허용된 promotion 결과 문서, 승인 범위 안 QA·접근성 보강을 한 승격 커밋으로 고정 |
| local commit | `INCLUDED_IN_THIS_PROMOTION_COMMIT` — exact SHA는 이 문서가 포함된 `git log -1`이 정본 |
| push | `0 / NOT_AUTHORIZED` |
| PR | `0 / NOT_AUTHORIZED` |
| merge | `0 / NOT_AUTHORIZED` |
| deploy | `0 / NOT_AUTHORIZED` |
| P35/external side effect | `0` |
| observed-user sessions | `0` |

Fresh E2E와 scoped subtraction 검사를 통과한 현재 tree만 한 개의 로컬 승격
커밋에 포함한다. 실패를 숨기거나 과거 green 결과로 대체하지 않았다.
