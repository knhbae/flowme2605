# P26-05 Projection Identity evidence

## 판정

- 상태: `complete_internal_evidence`
- 기준 커밋: `83e3a12`
- 실제 관찰 사용자: `0`
- evidence: `current_source`, `current_command`, `current_browser`

P26-05는 Flow 항목의 정체성을 화면별 문자열 조합에 맡기지 않고 하나의 계약으로 고정한다. source item, 개인 구조·값 overlay, 실행 run, 반복 occurrence, Calendar/ICS, 목록 export가 각각 필요한 키를 구분하면서도 같은 stable item을 가리킨다.

## 핵심 계약

| 범위 | 키 | 변경 시 유지 여부 |
| --- | --- | --- |
| 개인 항목 | `flowId::itemId` | 순서·제목·날짜·완료 변경 후 유지 |
| 개인 값 overlay | `flowId::itemId::draft-overlay` | legacy 날짜 기반 키에서 1회 migration |
| 실행 run | `flowId::run::runId::item::itemId` | run별로 분리 |
| 반복 occurrence | `flowId::occurrence::occurrenceId` | 회차별로 분리 |
| export item | canonical item key | whole/selected/item scope에서 재사용 |
| Calendar event seed | series ID 또는 canonical item key | 날짜·순서 변경 후 유지 |

완료·완료 취소는 실행 상태만 바꾸고 projection membership과 item identity를 바꾸지 않는다. source/user-created ID가 충돌하면 source를 보존한다. tombstone 또는 제외 상태는 destination eligibility를 끄지만 원본 item을 삭제하지 않는다.

## Legacy migration

- 적용 대상: URL-first miss 또는 메모로 만든 개인 draft만 해당한다.
- 기존 `flow::item::date`와 `flow::item::none` 값을 stable `draft-overlay` key로 합친다.
- 기존 raw 값은 versioned migration manifest 안에 보존한다.
- 다른 Flow의 값은 변경하지 않는다.
- malformed JSON은 그대로 두고 migration하지 않는다.
- manifest 저장이 실패하면 item draft, date override, manifest 세 값을 모두 이전 raw 문자열로 되돌린다.
- 같은 migration을 다시 실행하면 `already_current`로 끝난다.

## 브라우저 확인

개인 메모 draft에 legacy 제목·메모·날짜 값을 주입한 뒤 새로고침했다.

1. My Flow가 stable item ID로 이전된 제목과 `8월 3일`을 표시했다.
2. 같은 항목의 완료와 완료 취소가 가능했다.
3. Flow 전체 메모 export가 같은 제목·메모·날짜를 포함했다.
4. Calendar 2030년 8월 3일 agenda가 같은 stable item ID를 표시했다.
5. 모바일 390px과 wide 1024px에서 horizontal overflow와 console/page error가 없었다.

화면:

- [390px migrated My Flow](./screenshots/01-migrated-personal-draft-mobile.png)
- [1024px migrated Calendar](./screenshots/02-migrated-calendar-wide.png)

## 현재 실행 검증

- projection identity unit: `7 / 7` pass
- full unit: `546 / 546` pass
- projection identity Playwright: `1 / 1` pass
- P26 foundation + URL-first + whole-Flow regression: `31 / 31` pass
- public share/workbench regression: `44 / 44` pass
- docs check: pass, `2,584` local links
- production build: pass, 18 routes
- git diff check: errors `0` (Windows line-ending warnings only)

이 문서는 자동화·브라우저 evidence이며 실제 사용자 검증이 아니다.

## 남은 위험

- migration manifest는 로컬 rollback 근거이며 계정·DB 동기화 계약이 아니다.
- source version 교체 시 stable source item ID를 발행자가 바꾸는 문제는 별도 version-merge 정책이 필요하다.
- Calendar wide의 여백과 My Flow 조정 UI 밀도는 정합성 문제가 아니라 P26-14~18 UX 재구성 범위다.
- 실제 사용자가 항목을 어디서 조정해야 하는지 설명 없이 찾는지는 P26-10/11 이후에만 평가할 수 있다.
