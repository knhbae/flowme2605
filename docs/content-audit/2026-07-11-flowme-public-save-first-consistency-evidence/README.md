# FlowMe public 공유 save-first 일관성 Evidence

## 목적

대표 6개 route에서만 검증되던 public `/f/[slug]` 저장 우선 계약을 exact-video와 입력 없는 workbench까지 확장해, 공유받은 사용자가 route 종류와 무관하게 첫 스크롤 전에 `내 Flow에 저장`을 한 번만 보도록 고정한다.

## 결과

- 비-export-first public Flow: 모바일 고정 저장 CTA 1개, wide hero 저장 CTA 1개
- 이사 export-first hero: 기존 저장/setup 경로 유지
- Flow-level 파일 export: 본문 2차 행동 유지
- 모바일 legacy 진행률+저장 bar: 공통 save-first route에서 비노출
- exact-video 실행 기준: 짧은 요약은 유지하고 긴 detail은 기본 접힘
- public 저장 전 checkbox: preview/선택 의미 유지

## 파일

- [감사](./audit.md)
- [판정 JSON](./route-evidence.json)
- [exact-video mobile](./screenshots/01-exact-video-save-first-mobile.png)
- [exact-video mobile full](./screenshots/02-exact-video-save-first-mobile-full.png)
- [input-free mobile](./screenshots/03-input-free-save-first-mobile.png)
- [exact-video wide](./screenshots/04-exact-video-save-first-wide.png)

## 검증

- `tests/e2e/public-share-cta-order.spec.ts`: 41/41 통과
- exact-video targeted `flow-mvp.spec.ts`: 2/2 통과
- 핵심 5개 spec 통합 회귀: 234/234 통과
- 390px/1024px visible save action count: 각 1
- mobile/wide horizontal overflow: 0

이 evidence는 브라우저 자동 QA와 전문가 시각 검토다. 실제 공유 수신자가 저장과 export를 어떻게 이해하는지는 P22-00 관찰에서 확인해야 한다.
