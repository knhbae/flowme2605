# FlowMe 현행 공개 카탈로그 정리 evidence

작성일: 2026-07-12

## 목적

`/flows`가 현재 실행 가능한 콘텐츠를 고르는 화면인데도 비교용 중복 이사 콘텐츠, 품질 상태가 `revise`인 건강 일정, 의미 없는 `콘텐츠` 분류가 정상 카드처럼 섞여 있었다. 현재 production 코드와 품질판정을 기준으로 일반 탐색 목록만 정리했다.

## 적용 범위

- 일반 카탈로그는 `representative` 또는 `candidate` 상태만 허용
- `revise`, `park`, `reject`는 일반 탐색에서 제외
- 기존 대표 이사 콘텐츠와 겹치는 `curated-ajd-moving-d30` 비교 후보는 카탈로그에서 제외
- 숨긴 route의 direct access, exact URL lookup, 기존 저장 기록은 유지
- 공개 카드 8개에 사용자 카테고리 라벨 적용
- `결혼 준비 체크리스트 버전`을 `결혼 준비 체크리스트 2종`으로 정리

## 결과

- 카탈로그 카드: `11 → 8`
- generic `콘텐츠` 카테고리: `8 → 0`
- 같은 AJD 이사 카드 중복: `2 → 1`
- 일반 목록의 `revise` 카드: `2 → 0`
- direct/URL lookup 보존 대상: `3/3`
- 모바일 첫 카드 top: `464px` (`< 480px`)
- 390px / 1024px horizontal overflow: `0/0`

과거 review package나 숨겨진 콘텐츠를 현재 성공 시나리오로 사용하지 않았다. 전체 runtime 분리 기준은 [런타임 콘텐츠 재고 분리 evidence](../2026-07-12-flowme-runtime-content-inventory-separation-evidence/README.md)를 따른다.

## 파일

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [screenshots/](./screenshots/)
