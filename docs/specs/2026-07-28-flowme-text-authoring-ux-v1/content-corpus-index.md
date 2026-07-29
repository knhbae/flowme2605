# Content Corpus Index

정본 snapshot:

- [handoff corpus index](../../content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/content-corpus-index.md)
- [structured snapshot](../../content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/content-corpus-snapshots.json)
- [qualified corpus fixture](../../content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/qualified-corpus-fixture-v2.json)
- [projection matrix](../../content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/projection-matrix-v2.json)
- [projection loss](../../content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/projection-loss-manifest-v2.json)
- [input lineage](../../content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/input-lineage-v2.json)
- [round-trip results](../../content-audit/2026-07-28-flowme-text-authoring-ux-design-handoff/local-evidence/qualified-corpus-v2/round-trip-results-v2.json)

## Eight authoring cases

| ID | 사례 | Input shape | Primary | Key count | Evidence boundary |
|---|---|---|---|---:|---|
| TA-C01 | 이사 D-30 | Markdown/source rows | Calendar | corpus 27 | AJD runtime 24/EasyLaw 24와 구분 |
| TA-C02 | 차량 점검 | relative timeline | Todo/Calendar | 10 | source offset과 personal undated 분리 |
| TA-C03 | Allblanc 7일 | ordered Items + URLs | Calendar | 7 | weekly 1-item runtime variant와 구분 |
| TA-C04 | K-MOOC | table | Sheet | 14 | Input Composer frozen case |
| TA-C05 | LibriVox | chapter table | Sheet/Queue | 38 | Input Composer frozen case |
| TA-C06 | 신차 구매 | decision/check/record | Checklist | 14 Items/8 Steps | qualified corpus |
| TA-C07 | 해외 안전정보 | guide/caution/action | Memo/Guide | source version | official runtime source |
| TA-C08 | 제주 여행 | free-text memo | Todo | 5 | deterministic P26 E2E |

## Rules

- 콘텐츠를 새로 지어내지 않는다.
- count와 source version을 화면과 fixture에 표시한다.
- source row가 없는 detail을 정확한 source fact라고 표현하지 않는다.
- long table을 prototype 편의를 위해 축약하지 않는다.
- prototype sample이 일부 row만 render하면 전체 count와 `일부 표시`를 명시한다.

## Variant manifest

| fixtureId | sourceVersion | itemCount | evidencePath |
|---|---|---:|---|
| `bundle-moving-d30` | AJD qualified corpus v2 | 27 | `qualified-corpus-fixture-v2.json` |
| `runtime-moving-d30-basic` | AJD current runtime | 24 | `lib/flow/canonical-flow-registry.ts` |
| `IC-C01-MOVING` | EasyLaw Input Composer v1 | 24 | `input-composer-scenarios-v1.json` |
| `bundle-allblanc-7day-abs` | qualified corpus v2 sequence | 7 | `qualified-corpus-fixture-v2.json` |
| `curated-allblanc-morning-workout` | current runtime weekly routine | 1 | `lib/flow/source-backed-curated-260630.ts` |

K-MOOC의 `0/14`는 source metadata가 아니라 execution run의 초기 derived value로
취급한다.
