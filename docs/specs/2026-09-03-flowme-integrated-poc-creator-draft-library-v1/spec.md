# FlowMe 통합 PoC P3-B 제작자 초안 보관함 계약

## 목적

P3-A 기준 primary gap 15건 중 `D2-057 CreatorDraft 저장·재진입·관리` 한 건을 닫는다. 기존 작성 중 자동 복구를 유지하면서, 사용자가 명시적으로 저장한 제작자 초안을 검색·재진입·복제·보관·복원할 수 있는 로컬 보관함을 React와 조작용 단일 HTML에 같은 계약으로 구현한다.

이번 단계는 운영 CreatorDraft schema나 공개 워크플로를 정하지 않는다. 제작자 초안은 exact PoC gate 안의 교체 가능한 version 1 계약이며, 개인 Flow·공개 버전·실행 상태와 분리한다.

통합 PoC 진입은 `/my?personalWorkspacePoc=v1`, 작성 surface는 그 안에서 연결된 `/flows/new?personalWorkspacePoc=v1` exact query만 허용한다. 별도 query parameter를 붙이지 않고 화면 내부 state로 입력·결과·초안 목록을 전환한다. 잘못된 query는 기존 `/my`로 돌아간다.

## 정본과 현재 판정

- 부모 요구: `docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-d2.json:1481-1507`
- 여섯 하위 판정: `docs/content-audit/2026-09-02-flowme-integrated-poc-requirements-traceability-assets/requirements-subchecks.json:1597-1641`
- 개발2 상태·복구 계약: `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/state-model.md:19-114`
- 데이터·owner 계약: `docs/specs/2026-07-28-flowme-text-authoring-ux-v1/data-handoff.md:3-147`
- 기존 보류와 재개 조건: `docs/specs/2026-09-02-flowme-integrated-poc-gap-closure-v1/a0-decision-record.md:35-81`

P3-A 기준선에서는 `.1 작성 중 초안 reload 복구`만 `충족 E4`, `.2 CreatorDraft 저장`은 `의도적 변경 E3`, `.3-.6`은 `미충족 E0`였다. P3-B 구현과 fresh 검증으로 `.1-.6`이 모두 current `충족 E4`가 됐고, 부모 `D2-057`을 `부분`에서 `충족 E4`로 승격했다. 이 승격은 PoC-local 계약에만 적용한다.

## 기준선과 목표

| 범위 | P3-A 기준 | P3-B 현재 |
|---|---:|---:|
| primary 요구 | 168 | 168 |
| 충족 | 130 | 131 |
| 부분 | 11 | 10 |
| 미충족 | 4 | 4 |
| 의도적 변경 | 11 | 11 |
| 제외 | 12 | 12 |
| primary gap | 15 | 14 |

`D2-057.1`부터 `.6`까지 current E4 증거가 모두 있고 부모 override에 구현 파일·테스트 파일·실패 0인 fresh run을 연결했다. 따라서 P3-B 현재 판정은 `131 충족 / 10 부분 / 4 미충족 / 11 의도적 변경 / 12 제외`, primary gap 14다. `D2-002`와 `D2-004`는 부분으로 유지한다.

## 판정 단위

| ID | 수용 조건 |
|---|---|
| D2-057.1 | 작성 중 원문과 현재 초안 binding이 reload 뒤 정확히 복구된다. |
| D2-057.2 | 원문을 개인 Flow가 아닌 별도 제작자 초안으로 명시 저장한다. |
| D2-057.3 | 목록에서 같은 `draftId`, 원문, template, revision으로 재진입한다. |
| D2-057.4 | 제목과 exact 원문 안의 출처를 검색하고 active/archive를 거르며 검색 자체 write는 0이다. |
| D2-057.5 | 원문 bytes를 보존한 새 ID·revision 1 복제본을 만들고 원본은 바꾸지 않는다. |
| D2-057.6 | 영구 삭제 없이 보관·복원하고 exact record를 유지한다. |

과거 개발2 세션의 TA-05에는 자동 임시저장·명시 저장 분리, 결과 미리보기, 상태 필터, revision 확인·이전 저장본 복구, 제목·출처·Step/Item 수·primary artifact·수정 시각·미해결 수를 보여 주는 목록이 포함됐다. 이번 6개 판정은 그중 저장·목록 재진입·검색·복제·보관과 기존 reload 복구를 닫는다. 현재 revision과 복제 lineage는 보존하지만 다중 revision history와 이전 revision 복구를 구현했다고 주장하지 않는다.

## 화면 계약

### 개인 작성 lane

- 기존 `내 Flow에 저장`과 폴더 선택을 그대로 유지한다.
- 결과 화면의 분리된 보조 행동 `제작 초안으로 저장`으로 제작자 초안을 만든다.
- 이 행동은 개인공간 state나 운영 writer를 호출하지 않는다.

### 제작자 초안 lane

- 사용자 화면의 짧은 이름 `내 초안`은 owner 계약의 `제작자 초안(CreatorDraft)`을 가리키는 PoC-local copy다. 개인 Flow나 personal draft와 같은 저장소라는 뜻이 아니다.
- `제작자 초안 · 이 기기에만 저장`과 `개인공간이나 공개 화면에는 추가되지 않습니다.`를 항상 표시한다.
- primary action은 `초안 변경 저장`이다.
- 개인 폴더와 `내 Flow에 저장`은 DOM에 렌더링하지 않는다.
- 다른 초안을 열 때 저장하지 않은 변경이 있으면 `변경 버리고 열기`와 `취소`를 명시한다.

### 초안 보관함

- 모바일과 844×390은 `입력 / 결과 / 내 초안` 한 줄 navigation을 사용한다.
- 1024px 이상은 local header의 `내 초안 N개` 보조 버튼으로 연다.
- 평면 1열 목록에 제목, 항목 수, current revision, 수정 시각, 미해결 수를 표시한다.
- 제목과 exact 원문에서 파생한 첫 `http(s)` 출처 label을 검색한다. URL이 없으면 `직접 작성한 원문`을 표시한다. 이 label은 production source metadata가 아닌 replaceable projection이다.
- 검색, `작성 중 / 보관함`, `이어서 작성`, `…` disclosure, 이름 바꾸기, 복제, 보관·복원, 한 단계 Undo를 제공한다.
- 이름 변경은 목록 이름만 바꾸며 원문 bytes를 수정하지 않는다.
- 같은 이름, 취소, Escape, 검색, 필터 변경은 mutation 0이다.

## 상태·저장 계약

| 데이터 | key | 소유권 |
|---|---|---|
| 자동 복구 원문 | `flow:poc:personal-workspace:v1:authoring-draft` | 현재 브라우저의 PoC working draft |
| 명시 저장 보관함 | `flow:poc:personal-workspace:v1:creator-drafts` | 현재 브라우저의 PoC CreatorDraft library |
| transaction 복구 | 같은 prefix의 전용 marker/journal | 두 key 원자 저장 복구 전용 |

- CreatorDraft library version은 1이다.
- record에는 `draftId`, owner `creator`, 표시 제목, exact `rawText`, template, source fingerprint, active/archive, record revision, 생성·수정 시각, 선택적 clone lineage만 둔다.
- source label과 Item·미해결 수는 exact rawText의 현재 PoC projection에서 파생하며 record에 production source/canonical owner로 저장하지 않는다.
- 개인 폴더, 완료, 날짜 이동, 실행 placement, 공개 상태는 record에 넣지 않는다.
- 기존 version 1 working draft는 binding 없는 개인 lane으로 계속 읽는다.
- working draft의 optional `creatorBinding`은 owner `creator`와 현재 열린 CreatorDraft의 ID만 가리킨다. current record revision은 library에서 조회하고 각 mutation의 expected revision으로 검증한다.
- 손상·unsupported library, 잘못된 binding, 복구 실패는 bytes를 삭제하거나 덮어쓰지 않고 `/my`로 fail-closed한다.

## transition 계약

`save`, `rename`, `duplicate`, `archive`, `restore`, `undo`, `cancel`은 하나의 순수 transition 모델을 공유한다.

- 새 저장은 record revision 1이며 기존 저장은 library와 record revision을 각각 1 올린다.
- 같은 payload, 같은 보관 상태, 취소는 unchanged다.
- stale library 또는 record revision은 target write 전에 차단한다.
- 복제는 새 ID와 clone lineage를 만들고 source bytes와 template을 그대로 유지한다.
- 보관은 상태만 바꾸고 영구 삭제하지 않는다.
- Undo는 직전 library snapshot을 복원하되 library revision은 단조 증가한다.
- 검색은 NFKC, 대소문자, 연속 공백을 정규화하지만 원본을 바꾸지 않는다.

## 원자성·복구

- 명시 저장과 재진입 binding 변경은 library key와 working-draft key를 한 전용 transaction으로 다룬다.
- 시작 전에 두 key의 expected raw bytes를 비교한다. 하나라도 다르면 set/remove 0이다.
- write 뒤 exact readback을 검증한다.
- 어느 단계에서 실패해도 두 key를 이전 raw bytes로 되돌리고 검증한다.
- rollback 검증에 실패하면 PoC prefix 내부 journal을 남기고 다음 authoring boot에서 복구한다.
- 기존 개인 state + authoring-draft transaction의 whitelist는 넓히지 않는다.

## D2-002·D2-004 경계

- `D2-002`는 부분 유지: 이번 projection은 SourceRow부터 Bundle/Flow Map까지의 production canonical adapter가 아니다.
- `D2-004`는 부분 유지: CreatorDraft owner 한 층만 추가하며 PublishedVersion과 ExportSnapshot owner는 구현하지 않는다.
- Source, CreatorDraft, Personal Flow, Execution은 서로 다른 저장 영역과 transition을 유지한다.

## 사용자 상태와 문구

| 상황 | 기본 문구 | 행동 |
|---|---|---|
| 새 명시 저장 | `제작 초안을 저장했어요.` | `계속 편집`, `내 초안` |
| 같은 내용 저장 | `바뀐 내용이 없어 새 revision을 만들지 않았어요.` | 없음 |
| 보관 | `초안을 보관했어요.` | `되돌리기` |
| 복원 | `초안을 다시 작성 중 목록에 표시했어요.` | `되돌리기` |
| stale | `다른 화면에서 초안이 바뀌었습니다. 다시 열어 최신 내용을 확인하세요.` | `초안 다시 열기` |
| 저장 실패 | `저장하지 못했어요. 작성 중 내용과 마지막 저장본은 그대로입니다.` | `다시 저장` |
| 손상 payload | `저장된 제작 초안을 안전하게 열 수 없어 기존 내 계획으로 돌아갑니다.` | `/my` fail-closed |

오류 화면은 읽은 범위, 읽지 못한 범위, 보존된 내용, 다음 행동의 네 줄을 넘기지 않고 내부 storage·parser code를 노출하지 않는다.

## 검증 기준

1. 순수 모델·validator·storage·CAS·rollback·recovery·component 테스트가 통과한다.
2. React와 단일 HTML에서 저장→목록→검색→재진입→수정 저장→reload를 실제 조작한다.
3. 복제→보관→보관함→복원→Undo를 실제 조작한다.
4. 같은 값·취소·Escape·stale·손상·저장 실패의 성공 mutation은 0이다.
5. 390×844, 375×812, 844×390, 1024×768, 1440×900에서 가로 넘침·console error·page error·가려진 핵심 행동은 0이다.
6. 시나리오 전후 non-PoC `flow:*` key/value는 byte-for-byte 동일하고 허용 prefix 밖 set/remove 및 clear 호출은 0이다.
7. 개인공간 PoC 회귀, `npm test`, production build를 실행하고 실제 건수를 보고한다.
8. 실제 Android Chrome, iOS Safari, 보조기술, 관찰 사용자, 게시 상태를 자동화와 분리한다.

## 제외

production adapter, 운영 schema migration, 공개 후보·발행·검토 요청, account/cloud, 외부 동기화, AI, export writer, 영구 삭제, 다중 revision history UI, Preview·Production 배포는 제외한다.
