# P23-04 Past Run Detail And Reuse Audit

## Original Gap

기존 run registry는 완료 상태와 재사용 경계를 보존했지만 My Flow에는 완료 날짜와 `전체 N/N 완료` 요약만 보였다. 사용자는 과거 실행에서 실제로 어떤 제목·날짜·메모를 사용했는지, 어떤 회고를 남겼는지 확인하거나 자신의 도구로 보관할 수 없었다.

## Implemented Boundary

- 완료 시점의 effective item을 additive snapshot으로 저장한다.
- snapshot은 stable item/occurrence ID, 사용자 제목, 실행 상태, 일정 상태, 개인 메모, 개인 순서를 포함한다.
- `지난 실행` 안에서 각 run과 항목을 단계적으로 펼친다.
- 과거 항목에는 완료, 수정, 삭제 control을 노출하지 않는다.
- checklist, sheet, memo는 같은 snapshot row를 사용한다.
- legacy run은 요약 전용 fallback을 유지한다.

## Ownership

| Concern | Owner | Past-run behavior |
| --- | --- | --- |
| source title/detail/version | source snapshot | 완료 당시 version 참조를 유지 |
| 개인 title/date/memo/order | completion item snapshot | 당시 effective 값을 고정 |
| done/reopened/skipped/held | completion item snapshot | 완료 당시 상태를 고정 |
| 회고 | completion feedback snapshot | 개인 기록으로 표시·memo export 포함 |
| 원본 수정 메모 | completion feedback snapshot | 미전송 상태를 명시하고 export에는 섞지 않음 |
| 새 실행 | new active run | 완료 체크를 비우고 선택한 anchor/version으로 시작 |

## Export Decision

과거 checklist, sheet, memo는 기록 보관 목적이므로 다시 제공한다. 과거 Calendar/ICS는 이미 등록했을 가능성이 높고 같은 stable item을 다시 가져오면 중복 일정이 생길 수 있어 제공하지 않는다. Calendar/ICS는 새 실행을 시작한 뒤 현재 실행에서 만든다.

## Automated Results

- 이사 Flow 24개 snapshot 저장 및 표시: pass
- 첫 항목 개인 제목·날짜·메모 보존: pass
- 회고와 미전송 수정 메모 분리: pass
- checklist/sheet/memo snapshot output: pass
- 날짜 없는 Flow snapshot과 같은-copy reuse: pass
- source 새 버전 전환 전 이전 version snapshot 고정: pass
- legacy summary-only normalization: pass
- malformed/duplicate snapshot 방어: pass
- 390px/1024px horizontal overflow: 0
- dated reuse journey console error: 0
- full unit tests: 474/474
- URL-first/public/workbench regression: 63/63 final pass; 병렬 실행 중 응답 연결 timeout 2건은 각각 1-worker 재실행에서 통과

## Visual Review

390px에서는 `지난 실행 1회`를 펼친 뒤 run 하나를 다시 열어야 항목이 보인다. 항목은 상태, 제목, 날짜, 메모 순으로 읽히며 export는 목록 아래의 별도 접힌 영역에 있다. 24개 항목을 모두 펼치면 페이지가 길어지지만 닫힌 기본 상태의 현재 실행 흐름을 밀어내지 않는다.

1024px에서도 같은 정보 순서를 유지한다. 읽기 전용 항목과 현재 Flow의 `열기`·완료 행동이 섞이지 않고 가로 넘침이 없다.

## Remaining Risks

- 실제 사용자가 `지난 실행`을 회고 기록으로 인식하고 찾을 수 있는지는 관찰되지 않았다.
- 긴 Flow에서 24개 이상 항목을 모두 펼쳤을 때 검색·요약이 필요한지는 실제 사용 빈도를 본 뒤 판단해야 한다.
- legacy run은 item snapshot이 없으므로 상세를 소급 복원하지 않는다.
- 과거 Calendar/ICS 미제공 정책이 일부 사용자에게는 제한으로 느껴질 수 있다. 중복 방지와 재내보내기 요구를 실제 사용자에게 확인해야 한다.
- 반복 series를 완료했을 때 회차별 실행 상태를 과거 run에서 어느 수준으로 보존할지는 최종 persona simulation에서 별도 판정해야 한다.
- 계정·DB가 없으므로 과거 실행 기록은 현재 브라우저 localStorage와 사용자가 만든 백업 범위에 머문다.
