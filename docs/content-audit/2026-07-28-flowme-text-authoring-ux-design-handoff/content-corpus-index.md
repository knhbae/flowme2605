# Content Corpus Index

## Qualified Corpus Snapshot

The latest local qualified-corpus snapshot contains eight Bundles, 21 Flows, 49 Steps, and
source-linked canonical Items. It is design evidence, not merged runtime data.

| Bundle | User job | Primary | Secondary | Flows | Steps | Items | Dated |
|---|---|---|---|---:|---:|---:|---:|
| 이사 D-30 체크리스트 | 이사일 기준으로 D-day 행 실행 | Calendar | Checklist | 1 | 6 | 27 | 27 |
| 초기 이유식 D+174~209 | 원문 식단 순서대로 제공 | Calendar | Checklist, Sheet | 1 | 12 | 36 | 36 |
| 오픽 모의고사 계획표 | 2주·1달 계획에 따라 영상 실행 | Sheet | Calendar, Checklist | 2 | 7 | 42 | 42 |
| 생활코딩 WEB1 진도표 | 공개 토픽을 순서대로 학습 | Sheet | Checklist | 1 | 1 | 26 | 0 |
| 신차 구매 8단계 | 계약·출고 누락 방지 | Checklist | Sheet, Memo | 1 | 8 | 14 | 0 |
| Allblanc 7일 복근 | 하루 한 영상 실행 | Calendar | Checklist | 7 | 7 | 7 | 7 |
| 이번 주 여름 반찬 5가지 | 만들 메뉴를 골라 레시피 열기 | Checklist | Memo | 5 | 5 | 5 | 0 |
| AND 취업 준비 영상 3편 | 순서대로 보고 실행 메모 기록 | Todo | Memo | 3 | 3 | 3 | 0 |

Full data:

- [qualified corpus](./local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json)
- [projection matrix](./local-evidence/qualified-corpus-v2/projection-matrix-v2.json)
- [projection loss](./local-evidence/qualified-corpus-v2/projection-loss-manifest-v2.json)

## Required Authoring Benchmark Cases

| Case | Current evidence | Authoring challenge | Do not lose |
|---|---|---|---|
| 이사 D-30 | qualified corpus and moving fixtures | headings, relative dates, many source rows | Step periods and source lineage |
| 차량 점검 | runtime route and source-fit evidence | valid undated checklist with optional scheduling | undated state |
| Allblanc 운동 | qualified corpus and runtime source-backed Flow | recurrence plus resource | series/occurrence and video resource |
| K-MOOC 14주 | Input Composer case | long curriculum table | all 14 rows and current position |
| LibriVox 38장 | Input Composer case | ordered resource queue | 38 chapters and playback position |
| 신차 구매 8단계 | qualified corpus and Todo/Sheet fixtures | decision, task, record mix | non-checkable context |
| 해외여행 안전정보 | official source-backed runtime content | guide, caution, action mix | source and safety boundary |
| 제주 여행 개인 메모 | P26 deterministic memo fixture | free text segmentation and edits | original fragment lineage |

## Version Warning

The runtime `moving-d30-basic` and the qualified-corpus `bundle-moving-d30` can have different
Item counts. A design must display `fixtureId`, `sourceVersion`, and `itemCount`; it must not merge
the 24-Item and 27-Item variants silently.

## Fixture Directories

- [Todo snapshots](./local-evidence/fixtures/todo/)
- [Sheet snapshots](./local-evidence/fixtures/sheet/)

These files demonstrate projection shape. They do not prove the current product can author or
round-trip the same structure.
