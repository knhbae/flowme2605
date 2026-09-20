# FlowMe 통합 PoC P1 잔여 핵심 요구 충족

- 작성일: 2026-09-03
- 상태: `COMPLETE_WITH_KNOWN_REGRESSION_FAILURE`
- 대상: `/my?personalWorkspacePoc=v1`, `/flows/new?personalWorkspacePoc=v1`, 조작형 단일 HTML
- 우선순위: 기능·상태·복구 완결성 우선, 전면 시각 개선 후속

## 목표

v4.1 개인공간, 개발 1 saved-plan 편집, 개발 2 Text Authoring에서 회수한 잔여 요구 가운데
현재 통합 제품 루프에 필요한 기능을 PoC 전용 상태와 동일 Item identity 위에 구현한다.
승인된 P1 범위에서는 `부분` 또는 `미충족` 판정을 남기지 않고 fresh 모델·브라우저 근거로
`충족`까지 올린다.

## 이번에 닫을 기능 조각

1. `D1-010`: Flow·빠른 할 일을 PoC 휴지통으로 이동하고 복원한다. 영구 삭제는 별도 경고 뒤
   명시 동작으로만 실행하며 자동 삭제는 없다.
2. `D2-003`, `D2-019`, `D2-020`: 동일 Item 배열에서 `TXT / 할 일 / 캘린더 / 표` 네 결과를
   결정적으로 만든다. WorkingSource와 복사용 TXT는 별도다. 기존 D2-020의 download 하위 조건은
   기존 export writer를 호출하지 않는 이번 경계와 분리해 후속으로 남긴다.
3. `D2-035`, `D2-036`, `D2-039`: 지원 property catalog와 입력 방식을 정의하고, 기존 속성은
   해당 source 값만 정확히 선택해 재편집한다.
4. `D2-041`: near-miss 원문은 자동 수정하지 않는다. 사용자가 복구 행동을 명시한 경우에만
   한 transaction으로 수정하고 native Undo로 되돌릴 수 있게 한다.

## 교체 가능한 PoC 결정 계약

| 요구 | 이번 PoC 계약 | 운영 승격 상태 |
| --- | --- | --- |
| `V41-001`, `V41-036`, `D2-007` | 운영 PlatformNav/cobalt는 보존하고 teal은 개인공간 내부 강조로만 사용한다. 현재 행동에 맞는 접근 가능한 이름을 제공한다. | 별도 디자인 결정 필요 |
| `D1-012` | authoring-handoff의 개인 소유 section 제목만 shadow 편집 후보로 본다. source-owned section은 읽기 전용이다. | section owner 승인 필요 |
| `D2-002` | 현재 adapter는 canonical schema가 아닌 versioned PoC projection adapter다. Item identity는 보존한다. | 운영 adapter 승인 필요 |
| `D2-004`, `D2-057` | 첫 성공 저장은 Personal Flow handoff다. CreatorDraft·PublishedVersion·ExportSnapshot을 개인 shadow에 합치지 않는다. | creator lane 승인 필요 |
| `D2-056` | 이번 단계는 versioned property/result catalog를 사용한다. recursive StructureDraft/compiler를 운영 canonical로 채택하지 않는다. | 별도 compiler 결정 필요 |

이 표는 영구 제품 정책을 확정하지 않는다. 구현에 필요한 PoC-local default만 고정한다.

## 확장 요구의 경계

- `D2-023`: 31개 실콘텐츠·예외 fixture는 이번 기능이 지원하는 문법을 검증하는 QA 입력으로
  재사용할 범위를 조사한다.
- `D2-024`, `D2-025`: 표·장문은 안전하게 구조화할 수 있는 행만 처리하고 나머지를 exact raw
  text로 보존하는 별도 adapter 없이는 지원했다고 표시하지 않는다.
- `D2-026`: versioned source candidate는 명시적으로 제외된 공개 후보·외부 동기화와 섞지 않는다.
  provider-neutral·local-only 계약을 별도 승인하기 전 구현하지 않는다.

## 데이터와 안전 경계

- 정확한 query gate 밖에서는 기존 화면으로 fail-closed한다.
- 모든 durable write는 `flow:poc:personal-workspace:v1:*`에만 기록한다.
- 기존 `/my`, 운영 `flow:*` key/schema와 완료·메모·날짜·보관·export writer를 바꾸지 않는다.
- 휴지통과 property 변경은 PoC shadow state만 바꾼다.
- source bytes와 `savedCopyId + flowId + itemId` identity를 보존한다.
- 같은 값, 취소, Escape, stale ticket, invalid payload, 저장 실패는 성공 mutation 0건이다.
- `localStorage.clear()`를 호출하지 않는다.

## 제외

- 공개 후보, AI, 계정·cloud, 외부 동기화, 운영 migration과 운영 writer 연결
- 기본 `/my` 교체, production token/schema 확정
- commit, push, PR, Preview, Production 배포
- 전면적인 시각 재설계와 실제 기기·관찰 사용자 검증

## 완료 조건

- 이번에 닫을 8개 요구의 P1 기능 조각이 React와 단일 HTML에서 조작된다. 원 요구의 운영 writer,
  download, 미지원 property 하위 조건은 별도 판정으로 남긴다.
- 동일 Item ref·날짜·완료 상태가 네 결과에 일치한다.
- 휴지통 이동·복원·영구 삭제 경고·Undo·reload가 통과한다.
- property 삽입·재진입·near-miss 복구·취소·Undo가 통과한다.
- 허용 prefix 밖 set/remove/clear 0, 운영 sentinel byte 차이 0이다.
- 지정 viewport에서 새 기능의 핵심 행동 가림·가로 넘침·console/page error가 0이다.
- 요구 추적표와 검증 리포트가 fresh 실행 결과로 갱신된다.
