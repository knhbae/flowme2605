# P26-02 상세 감사

## 원인

저장 producer마다 handoff가 달랐다. public과 Flow Map은 query가 있었지만 메모 draft와 URL miss/direct Flow 일부는 bare `/my`로 이동해, 저장 직후 어떤 Flow를 확인해야 하는지 복구할 수 없었다. post-save 수량도 raw `flow.rows.length` 합으로 계산되어 실제 personal/value projection을 거친 whole-Flow outline과의 동일성이 계약으로 고정되지 않았다.

## 수정

1. `buildPostSaveHref`와 `parsePostSaveHandoff`로 flow/map handoff를 정규화했다.
2. public, Flow Map, URL-first hit/direct Flow, memo/URL draft producer가 이 helper를 사용한다.
3. My Flow는 handoff를 한 번만 parse해 post-save 대상 Flow 또는 Map을 고른다.
4. receipt는 각 row를 `getMyFlowRowForFlowTab`으로 projection한 뒤 stable occurrence/projection/item identity와 effective date를 집계한다.
5. whole-Flow outline에 effective row count를 노출하고 E2E에서 receipt total과 직접 대조한다.
6. invalid date와 duplicate identity는 정상 행을 삭제하지 않고 진단 count로 남긴다.

## 브라우저 결과

| scenario | viewport | expected | actual | evidenceKind |
| --- | --- | --- | --- | --- |
| `/f/vehicle-inspection-prep` 저장 | 390x844 | whole Flow 10개, 전부 undated | 10 / 0 / 10, reload 동일 | `current_browser` |
| `/flow-maps/moving-d30` 저장 | 1024x768 | whole Flow 5개, 전부 dated | 5 / 5 / 0, reload 동일 | `current_browser` |
| `/flows` 수학 URL hit 저장 | 1024x768 | 실제 체크리스트 8개 표시 | 8 / 0 / 8, reload 동일 | `current_browser` |
| `/flows` 3문장 memo 저장 | 390x844 | accepted 3개 전체 표시 | 3 / 1 / 2, reload 동일 | `current_browser` |

모든 시나리오에서 receipt total과 outline effective row 합이 일치했고 empty hydration, invalid date, duplicate identity, horizontal overflow, console/page error는 `0`이었다.

## 현재 명령 검증

| command/suite | result | evidenceKind |
| --- | --- | --- |
| `npm.cmd test` | 536/536 통과 | `current_command` |
| `npm.cmd run docs:check` | 14개 필수 문서, 2,555개 링크 통과 | `current_command` |
| `tests/e2e/p26-save-receipt.spec.ts` | 3/3 통과 | `current_browser` |
| `tests/e2e/url-first-user-surface.spec.ts` | 19/19 통과 | `current_browser` |
| P24/P25/public 관련 회귀 묶음 | 45/45 통과 | `current_browser` |
| 저장 producer 직접 영향 `flow-mvp` 묶음 | 7/7 통과 | `current_browser` |
| `npm.cmd run build` | 18/18 route 생성 통과 | `current_command` |
| `git diff --check` | 오류 0, 줄바꿈 경고만 확인 | `current_command` |

## 남은 범위

- receipt 상단의 행동과 post-save 정보 구조는 P26-07에서 재설계한다.
- 반복 occurrence 수량과 series/occurrence parity는 P26-03에서 고정한다.
- 여정 전체 stable identity는 P26-05 gate에서 다시 대조한다.
- 실제 사용자 관찰은 아직 시작하지 않는다.
