# 증거 manifest

## 상태 namespace

| 표기 | 뜻 |
|---|---|
| `P35_PRODUCTION_BASELINE` | 현재 배포된 P35 기준 제품 |
| `ROUND2_LOCAL_P0_06` | 미커밋·미배포 Round 2 local 후보 |
| `HISTORICAL_BEFORE` | 2026-08-03 또는 그 이전 비교 증거 |
| `PROPOSAL` | 구현되지 않은 설계안 |
| `NO_CURRENT_ARTIFACT` | 현재 구현 화면이나 재현 가능한 artifact가 없음 |

## 증거 종류

상태와 증거 종류를 한 값으로 합치지 않는다. 각 관찰에는 아래 중 하나를 별도로 붙인다.

| 표기 | 뜻 |
|---|---|
| `RUNTIME_OBSERVED` | 해당 URL·build에서 직접 동작을 재현함 |
| `CODE_CONFIRMED` | 코드·test contract로 확인함 |
| `PAYLOAD_CONFIRMED` | canonical payload·storage·artifact diff로 확인함 |
| `STATIC_CAPTURE` | 화면·문서 한 시점만 확인함 |
| `SYNTHETIC_STRESS` | 의미 검증이 아닌 합성 layout stress |
| `DESIGN_INFERENCE` | 제공된 증거에서 디자인 결론을 추론함 |
| `UNVERIFIED` | 직접 확인할 수 없어 판단을 보류함 |

구현 판정 `O / △ / X / NOT_IMPLEMENTED / TBD / N/A`와 Proposal coverage `FULL / PARTIAL / MISSING / REJECTED / LOCAL_CONFIRMATION_REQUIRED`도 별도 축이다.

`ROUND2_LOCAL_P0_06`은 Production After가 아니다. `PROPOSAL`은 어떤 경우에도 After가 아니다.

## Production identity와 확인 한계

| 항목 | 값 |
|---|---|
| canonical URL | <https://flowme2605.vercel.app> |
| live 확인 | 2026-08-04 15:36 KST · anonymous HTTP 200 · Vercel |
| 최신 GitHub Production deployment | ID `5653898523` · `success` · 2026-07-29 17:06 KST |
| deployment SHA | `c09f859b30b854f6f897b8ec1eb781fd774fbeca` · P35 literal My Flow route hardening |
| deployment URL | `https://flowme2605-6pq93epdg-flowme.vercel.app` · anonymous direct access는 Vercel login 화면으로 보호됨 |
| identity 판정 | `PRODUCTION_IDENTITY_PARTIAL` |

canonical alias가 HTTP 200인 것과 GitHub의 최신 Production deployment 성공은 직접 확인했다. 하지만 보호된 deployment URL 때문에 canonical alias가 위 deployment SHA를 가리킨다는 byte-level 매핑은 익명 상태에서 재확인하지 못했다. 따라서 Claude가 live URL을 열 수 있으면 확인 시각·route를 기록해 `RUNTIME_OBSERVED`로 평가하고, 열 수 없으면 Production 칸을 `TBD + UNVERIFIED`로 둔다. 이 공백은 local P0-06 디자인 검토 전체를 중단시키지 않는다.

## 기존 P35·Round 2 전 화면

이전 자급식 패키지의 14개 캡처를 사용한다.

아래 14장은 모두 `HISTORICAL_BEFORE + STATIC_CAPTURE`다. 현재 Production이나 local After 증거로 사용하지 않는다.

- [기존 handoff README](../2026-08-03-p35-fundamental-ux-round2-handoff/README.md)
- [기존 화면·코드 증거 지도](../2026-08-03-p35-fundamental-ux-round2-handoff/03-current-state-evidence-map-ko.md)
- [이전 P35 Before/After 보고서](../2026-08-03-p35-feedback-before-after/p35-owner-feedback-before-after-ko.html)

| 기존 화면 | 이번에 보는 문제 |
|---|---|
| [시작일 중복](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/01-public-date-selected-duplicate.png) | U06 input echo와 결과 반영 위치 |
| [공개 Flow 편집](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/02-public-flow-editor.png) | P0-06 이전 editor와 local editor 차이 |
| [공개 Item 편집](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/03-public-item-editor.png) | Plan→Item 깊이와 commit 의미 |
| [내 Flow 관리 메뉴](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/04-my-flow-management-menu.png) | 편집·export·lifecycle action 중복 |
| [내 Flow 인라인 편집](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/05-my-flow-editor-inline.png) | P0-06에서 제거한 하단 인라인 구조 |
| [Item 상세](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/06-my-flow-item-detail-current.png) | U04 파란 surface·heading·CTA |
| [저장 library](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/07-my-flow-saved-library.png) | U03 library hierarchy |
| [Today](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/08-my-flow-today-view.png) | Today가 원본 저장소처럼 보이는지 |
| [Flow Map 3칸](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/09-flow-map-three-column-summary.png) | U05 grid 감산과 count 보존 |
| [Flow Map 편집](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/10-flow-map-adjustment.png) | legacy editor family 예외 |
| [체크리스트형 공개](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/11-public-checklist-shape.png) | 날짜 없음 capability와 CTA |
| [루틴형·주의](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/12-public-routine-shape.png) | 중요 경고의 inline 유지 |
| [공개 export](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/13-public-export-panel-current.png) | U01 공개 quick/preview 역할 |
| [저장 export](../2026-08-03-p35-fundamental-ux-round2-handoff/screenshots/14-my-flow-export-panel-current.png) | saved transfer 주 소유권 |

## 최신 local P0-06 화면

아래 이미지는 `ROUND2_LOCAL_P0_06 + STATIC_CAPTURE`이며 `screenshots/local-p0-06/`에 복사해 Claude가 GitHub에서 직접 볼 수 있게 한다. 상태 전이는 Codex가 runtime으로 재확인한다.

| Context | 390×844 | 1024 | 1440×1000 |
|---|---|---|---|
| Public Plan | [390](./screenshots/local-p0-06/public-plan-390.png) | [1024](./screenshots/local-p0-06/public-plan-1024.png) | [1440](./screenshots/local-p0-06/public-plan-1440.png) |
| Public Item | [390](./screenshots/local-p0-06/public-item-390.png) | [1024](./screenshots/local-p0-06/public-item-1024.png) | [1440](./screenshots/local-p0-06/public-item-1440.png) |
| Saved Plan | [390](./screenshots/local-p0-06/saved-plan-390.png) | [1024](./screenshots/local-p0-06/saved-plan-1024.png) | [1440](./screenshots/local-p0-06/saved-plan-1440.png) |
| Saved Item | [390](./screenshots/local-p0-06/saved-item-390.png) | [1024](./screenshots/local-p0-06/saved-item-1024.png) | [1440](./screenshots/local-p0-06/saved-item-1440.png) |

긴 목록 레이아웃 stress: [50 Item public Plan 390](./screenshots/local-p0-06/public-plan-50-items-390.png)

50 Item 이미지는 실제 50-Item 콘텐츠 route가 아니라 레이아웃 stress다. 실제 의미·저장·projection까지 검증한 것으로 쓰지 않는다.

## 현재 이미지로 확인 가능한 변화

| 항목 | 확인 가능 | 한계 |
|---|---|---|
| 공개/저장 Plan·Item이 같은 editor family 사용 | 예 | commit 효과의 storage 결과는 Codex 로컬 검증 필요 |
| 모바일 full-height와 wide inspector | 예 | 실제 사용자 선호·이해는 확인 불가 |
| 하단 인라인 saved Plan editor 제거 | 예 | Flow Map 등 legacy variant는 제외 |
| editor commit에서 `완료` 미사용 | 예 | 전 화면 CTA copy sweep은 미구현 |
| 출처 링크 유지 | 예 | 전체 도움·주의 등급은 미구현 |
| 긴 목록 sticky action·overflow | 레이아웃만 | 실제 50 Item runtime semantics는 TBD |

## 아직 After가 없는 항목

| 항목 | 상태 | 다음 구현/검토 |
|---|---|---|
| capability 기반 여러 결과 미리보기 | `TBD / NOT_IMPLEMENTED` | P0-07 |
| 일반 `/my` library shell | `TBD / NOT_IMPLEMENTED` | P0-08 |
| saved transfer·persistent receipt | `TBD / NOT_IMPLEMENTED` | P0-09 |
| 제한 public quick-local | `TBD / NOT_IMPLEMENTED` | P0-09 |
| Item 상세 감산 | `TBD / NOT_IMPLEMENTED` | P1-01 |
| Flow Map 3칸 감산 | `TBD / NOT_IMPLEMENTED` | P1-01 |
| 시작일 echo 제거 | `TBD / NOT_IMPLEMENTED` | P1-01 |
| `Flow→계획`, CTA, 도움·주의 | `TBD / NOT_IMPLEMENTED` | P1-02 |
| 형식별 전체 field round-trip | `TBD / NOT_IMPLEMENTED` | P1-03 |

Claude는 이 항목에 가상의 After를 만들 수 없다. 화면을 제안하면 state를 `PROPOSAL`로 둔다. 현재 artifact가 없으면 state는 `NO_CURRENT_ARTIFACT`, 구현 상태는 `NOT_IMPLEMENTED` 또는 `TBD`로 각각 적는다. runtime 확인이 필요하면 Proposal coverage를 `LOCAL_CONFIRMATION_REQUIRED`로 둔다.

## Codex가 새로 캡처할 우선 상태

1. P0-06 Public Plan→Public Item→Plan Apply 연속 상태
2. 저장→선택 계획 상세→Saved Plan→Saved Item→Plan Save 연속 상태
3. `/my` 0·1·5·20 계획과 Today 0/있음
4. dated·undated·mixed·routine·memo·Map capability 비교
5. Map selected 7/applied 7/preview 7/save 7와 남은 3칸 grid
6. 저장 실패·duplicate 선택·undo·Back·reload
7. keyboard focus return과 390px sticky collision
8. flag-off와 legacy read-only storage no-write

## 로컬 전용 원자료와 GitHub 패키지 경계

Codex는 로컬에서 아래 원자료를 추가로 확인한다.

- `docs/specs/2026-08-04-p35-round2-bounded-ux-correction/p0-06-closeout.md`
- `docs/specs/2026-08-04-p35-round2-bounded-ux-correction/full-program.md`
- `docs/content-audit/2026-08-03-p35-fundamental-ux-round2-planning-synthesis/01-p35-round2-fundamental-ux-decision-ko.md`

이 세 경로는 현재 local dirty tree에 있으며 이 GitHub handoff commit의 입력으로 간주하지 않는다. Claude Design이 링크되지 않은 로컬 파일을 읽었다고 가정하면 안 된다. Claude 검토에 필요한 계약은 이 GitHub 패키지 안에서 자급되며, 최신 P0-06 이미지 13장도 이 패키지 안에 복사했다.

기계 판독 가능한 이미지 hash·상태 목록은 [evidence-manifest.json](./evidence-manifest.json), 실행 시나리오는 [review-scenarios.json](./review-scenarios.json)을 사용한다.
