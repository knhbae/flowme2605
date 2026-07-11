# FlowMe 런타임 콘텐츠 재고 분리 evidence

- 정상 seed: 133개
- source-backed projection 포함 public route: 157개
- 공개 승인: 71개
- 검토 게이트: 86개
- 내부 전체 재고: 617개
- 내부 생성 샘플: 440개, 정상 runtime 0개
- 생성 샘플 공개 URL: HTTP 404
- archive Flow: 20개, direct URL 404: 20개
- archive 대체 route HTTP 200: 15개
- 현재 public Flow Map: 11개, 정상 route 200: 11개
- 공개 중단 구형 Flow Map: 8개, direct URL 404: 8개, 정상 route 링크: 0개
- 기존 저장소 생성 샘플/공개 archive 잔존: 0/0개, 사용자 draft 보존: true
- 저장된 archive 개인 기록: 1개, canonical 복구: true, 완료/메모 보존: true/true, 캘린더 제외: true
- 저장/기능 이관 후 재검토할 archive 후보: 0개
- 정상 출처 stale/review-due/missing: 0/0/0

## 판정

생성형 샘플과 명시적 archive 20개는 삭제하지 않고 내부 검토 재고에 보존했다. 미저장 archive는 runtime에서 제거하고, 사용자가 저장한 archive는 완료·메모를 유지하는 이전 저장본으로 남긴다. 과거 direct public URL은 한국어 복귀 경로가 있는 서비스용 404다. 검토 게이트 86개는 공개 승인 콘텐츠로 세지 않으며 noindex와 행동 차단을 유지한다. 구형 Flow Map 8개는 현재 대표 Map으로 카탈로그를 교체하고 direct route도 닫았다.

## 파일

- [audit.md](./audit.md)
- [review.html](./review.html)
- [route-evidence.json](./route-evidence.json)
- [screenshots/](./screenshots/)
