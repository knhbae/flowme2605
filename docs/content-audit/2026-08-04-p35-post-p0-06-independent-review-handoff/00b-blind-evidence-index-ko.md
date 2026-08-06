# 1차 blind 전용 증거 index

> 이 파일은 문제 분류·기획 결정·권장안을 포함하지 않는다. 정적 화면의 신원과 한계만 제공한다.

## 상태와 증거 종류

- `P35_PRODUCTION_BASELINE`: 현재 배포 기준
- `ROUND2_LOCAL_P0_06`: 미커밋·미배포 local 후보
- `HISTORICAL_BEFORE`: 2026-08-03 또는 이전 비교 화면
- `STATIC_CAPTURE`: 한 시점의 화면이며 상태 전이를 증명하지 않음
- `SYNTHETIC_STRESS`: 실제 콘텐츠 의미를 증명하지 않는 합성 layout stress

## Production

- canonical URL: <https://flowme2605.vercel.app>
- 확인: 2026-08-04 15:36 KST, anonymous HTTP 200
- identity: `PRODUCTION_IDENTITY_PARTIAL`
- live URL을 직접 열지 못하면 Production 동작을 추정하지 않고 `TBD + UNVERIFIED`로 남긴다.

## Historical Before · STATIC_CAPTURE

| ID | 390px 화면 |
|---|---|
| H01 | [01](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/01-public-date-selected-duplicate.png) |
| H02 | [02](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/02-public-flow-editor.png) |
| H03 | [03](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/03-public-item-editor.png) |
| H04 | [04](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/04-my-flow-management-menu.png) |
| H05 | [05](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/05-my-flow-editor-inline.png) |
| H06 | [06](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/06-my-flow-item-detail-current.png) |
| H07 | [07](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/07-my-flow-saved-library.png) |
| H08 | [08](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/08-my-flow-today-view.png) |
| H09 | [09](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/09-flow-map-three-column-summary.png) |
| H10 | [10](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/10-flow-map-adjustment.png) |
| H11 | [11](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/11-public-checklist-shape.png) |
| H12 | [12](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/12-public-routine-shape.png) |
| H13 | [13](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/13-public-export-panel-current.png) |
| H14 | [14](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/14-my-flow-export-panel-current.png) |

## Round 2 local P0-06 · STATIC_CAPTURE

| Context | 390×844 | 1024×768 | 1440×1000 |
|---|---|---|---|
| Public Plan | [390](./screenshots/local-p0-06/public-plan-390.png) | [1024](./screenshots/local-p0-06/public-plan-1024.png) | [1440](./screenshots/local-p0-06/public-plan-1440.png) |
| Public Item | [390](./screenshots/local-p0-06/public-item-390.png) | [1024](./screenshots/local-p0-06/public-item-1024.png) | [1440](./screenshots/local-p0-06/public-item-1440.png) |
| Saved Plan | [390](./screenshots/local-p0-06/saved-plan-390.png) | [1024](./screenshots/local-p0-06/saved-plan-1024.png) | [1440](./screenshots/local-p0-06/saved-plan-1440.png) |
| Saved Item | [390](./screenshots/local-p0-06/saved-item-390.png) | [1024](./screenshots/local-p0-06/saved-item-1024.png) | [1440](./screenshots/local-p0-06/saved-item-1440.png) |

합성 layout stress: [L13](./screenshots/local-p0-06/public-plan-50-items-390.png) · `SYNTHETIC_STRESS`

## 해석 제한

- Historical과 local 이미지는 서로 다른 시점이며 어느 것도 실제 사용자 관찰이 아니다.
- local 이미지는 네 편집 context의 화면만 보여주며 전체 제품 상태를 대표하지 않는다.
- 정적 이미지만으로 저장·취소·Back·오류·재시도·storage 결과를 판정하지 않는다.
- L13은 실제 50 Item 콘텐츠의 저장·projection 의미를 증명하지 않는다.
- 새로 그리는 화면은 `PROPOSAL`이며 After가 아니다.
