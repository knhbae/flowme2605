# P26-05 감사 기록

## 문제

P25/P26 초반에는 batch selection, Calendar undated tray, export scope가 stable item key를 각 consumer에서 직접 조립했다. 또한 개인 draft의 과거 item draft/date override key에는 그 당시 날짜가 suffix로 들어가 현재 stable key와 동시에 존재할 수 있었다. 이 구조에서는 날짜 변경·새로고침·export scope 전환 중 같은 항목이 서로 다른 항목처럼 취급될 위험이 있었다.

## 구현

`lib/flow/projection-identity.ts`를 canonical identity와 migration adapter로 추가했다.

- `buildCanonicalFlowItemKey`: Flow와 item의 불변 정체성
- `buildCanonicalFlowValueKey`: 개인 제목·메모·날짜 overlay 정체성
- `buildCanonicalFlowProjectionIdentity`: item/run/series/revision/occurrence/export/Calendar seed 분리
- `buildCanonicalFlowProjectionMatrix`: destination eligibility와 중복·orphan 진단
- `migrateProjectionIdentityStorage`: version 1 additive localStorage migration과 rollback

`PersonalStructuralProjectionRow`는 이제 canonical `projectionIdentity`를 함께 운반한다. AppClient의 batch selection, undated Calendar tray, Flow/current-item export도 공통 item key helper를 사용한다. migration은 저장된 개인 draft bundle이 structural edit 대상일 때만 실행되며 source-backed/published Flow에는 적용하지 않는다.

## 소유권 경계

- source: 원본 item ID와 원본 내용
- personal structural/value overlay: user-created item, tombstone, order, alias, memo, date
- execution run: pending/done/reopened/skipped/held
- occurrence: series/revision 아래의 특정 회차
- projection: 위 상태를 destination별로 읽는 결과

projection matrix는 실행 상태를 읽을 수 있지만 완료 상태 때문에 구조 membership을 바꾸지 않는다.

## 오류 방어

| 조건 | 결과 |
| --- | --- |
| source/user 동일 ID | source row 보존, duplicate 진단 증가 |
| duplicate occurrence | 첫 회차 보존, duplicate 진단 증가 |
| orphan occurrence | 정상 item 보존, orphan occurrence만 projection 제외 |
| malformed localStorage | 원문 보존, manifest 미생성 |
| migration write 실패 | 관련 raw 값 전체 rollback |
| 다른 Flow의 legacy 값 | 변경하지 않음 |

## 브라우저 시나리오

| 단계 | route | viewport | 결과 | evidenceKind |
| --- | --- | --- | --- | --- |
| 개인 memo draft 생성 | `/flows` | 390x844 | 2개 항목 저장 | `current_browser` |
| legacy 값 주입·reload | `/my?savedFlow=...` | 390x844 | stable overlay key로 1회 migration | `current_browser` |
| 완료·완료 취소 | `/my` | 390x844 | 같은 stable item ID 유지 | `current_browser` |
| Flow 전체 메모 export | `/my` | 390x844 | migrated title/date/memo 포함 | `current_browser` |
| Calendar projection | `/calendar` | 1024x768 | 2030-08-03에 같은 item ID 표시 | `current_browser` |

## 시각 참고 반영

`2026-07-19-flow-content-usage-preview-ko.html`에서 같은 effective item을 Calendar/checklist/sheet/memo로 비교하는 원칙을 채택했다. 이번 slice는 그 시각 구조를 복제하지 않고, 이후 UI가 의존할 공통 identity와 destination matrix를 먼저 고정했다.

## 후속

P26-06부터 discovery/save UI를 바꿔도 key를 화면마다 다시 만들지 않는다. P26-07 post-save hub, P26-14 Calendar, P26-16 export는 모두 canonical item/projection identity를 acceptance marker로 사용한다.

