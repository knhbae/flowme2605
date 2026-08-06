# Prior Claude archive manifest — informed only

> 공개 시점: 두 Pass 1 freeze 뒤
>
> 목적: 과거 proposal과 current candidate의 regression/delta 확인
>
> current fact 대체: 금지

## Archive A — Round 1

| 필드 | 값 |
|---|---|
| 로컬 coordinator 경로 | `D:\flowme2605\flow-mvp\claude_work\Claude 디자인 1차 검토_260801_1203.zip` |
| 파일 크기 | `596271 bytes` |
| local modified KST | `2026-08-01T00:04:00.4750471+09:00` |
| SHA-256 | `749B84BB49EA2199F9A9A5FA67B0D113A8AFC4CA06EF84ADDCA4BD0F433238E3` |
| informed commit-pinned URL | `TBD_PENDING_PUBLICATION_AUTHORITY` |
| publication file SHA-256 recheck | `TBD` |

주요 entry:

- `E01-flows-catalog.png` ~ `E13-checklist-flow-adjustment-inline.png`
- `P35 Mobile Round1 Review.dc.html`
- `_ds/...` design-system bundle
- `github.md`, `support.js`

## Archive B — Round 2

| 필드 | 값 |
|---|---|
| 로컬 coordinator 경로 | `D:\flowme2605\flow-mvp\claude_work\2차 독립 검토 보드 구성_260803_1045.zip` |
| 파일 크기 | `483288 bytes` |
| local modified KST | `2026-08-03T22:45:50.4324901+09:00` |
| SHA-256 | `D78C9E2B560A7EB5C9ED78A1DD62CBEF3355468B9382BD3D0CE39DFD0FF35B2B` |
| informed commit-pinned URL | `TBD_PENDING_PUBLICATION_AUTHORITY` |
| publication file SHA-256 recheck | `TBD` |

주요 entry:

- `FlowMe P35 2차 근본 UX 검토.dc.html`
- `evidence/01-flows-390.png` ~ `evidence/14-public-detail-1024.png`
- `review-package-260803-2050/01-root-findings-ko.md` ~ `07-scorecard-ko.md`
- `review-package-260803-2050/wireframes/README.md`
- `_ds/...` design-system bundle, `github.md`, `support.js`

## 사용 규칙

1. Claude Design에는 로컬 경로가 아니라 `informed_evidence_publication_sha`에 고정된 direct URL만 제공한다.
2. zip SHA-256을 publication 후 다시 확인하고 위 manifest와 다르면 사용하지 않는다.
3. 과거 screenshot·wireframe은 proposal/history다. current candidate의 implemented state 또는 After로 부르지 않는다.
4. current storyboard와 같은 route/state/viewport끼리만 delta를 비교한다.
5. 과거 evidence가 현재 raw artifact·storage·accessibility 사실을 증명한다고 보지 않는다.
6. archive 전체가 blind input에 노출되었으면 contamination으로 기록한다.
