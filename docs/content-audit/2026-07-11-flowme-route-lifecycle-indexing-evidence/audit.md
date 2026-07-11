# Route lifecycle과 indexability 감사

작성일: 2026-07-11

## 발견

`/creators`는 정상 secondary nav에 연결돼 있었지만 화면은 `Flow 후보`, `샘플 후보`, `원본 검토`와 preview channel 400+개를 보여주는 공급 검토 페이지였다. `/content-flows`, `/ia-compare*`, `/restart/moving-d30`, creator 편집 route도 직접 접근만 필요하면서 검색 차단이 일관되지 않았다.

## 정책

| Tier | Route 예 | 검색 | 정상 nav |
| --- | --- | --- | --- |
| public discovery | `/`, `/flows`, public `/f`, public Flow Map, verified public creator | index 가능 | 목적에 따라 가능 |
| personal workspace | `/my`, `/calendar` | noindex | 4탭 유지 |
| creator workspace | `/flows/new`, edit, creator review, my studio | noindex | secondary/contextual |
| release preview | `/restart/*` | noindex | 링크 0 |
| internal review | `/content-flows`, `/creators`, `/ia-compare*` | noindex | 링크 0 |
| internal console | `/flow-lab*` | noindex | 링크 0 |

Preview creator profile과 존재하지 않는 creator slug는 public profile처럼 index하지 않는다. Public Flow byline에서 연결되는 known non-preview creator profile은 기존 indexability를 유지한다.

## 구현

- `lib/flow/route-indexing-policy.ts`를 route tier 정본으로 추가했다.
- stateful/internal/preview route metadata에 공통 `NON_INDEXABLE_ROUTE_ROBOTS`를 적용했다.
- `PlatformNav`에서 `/creators` preview directory 진입을 제거했다.
- release-preview 정책도 noindex 필수로 강화했다.
- E2E가 390px/1024px nav 부재, 14개 noindex route, 5개 public indexable route를 실제 DOM metadata로 판정한다.

## 남은 리스크

- noindex는 인증이나 접근 제어가 아니다.
- `/creators`를 다시 공개하려면 실제 creator 소유권, verified supply, 사용자어 copy, 공개 profile 품질 gate가 먼저 필요하다.
- 이전에 crawler가 수집한 URL은 재방문 전까지 검색 결과에 남을 수 있다.
