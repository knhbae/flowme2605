# Browser QA

- 실행일: 2026-07-28
- 대상: deterministic standalone prototype과 wireflow
- 관찰 사용자 수: 0
- evidenceKind: `current_browser_automation`

## Viewport

| 대상 | Viewport | Overflow | Console error/warning |
|---|---:|---:|---:|
| Prototype | 390x844 | 0 | 0 |
| Prototype | 1024x768 | 0 | 0 |
| Prototype | 1440x900 | 0 | 0 |
| Wireflow | 390x844 | 0 | 0 |
| Wireflow | 1024x768 | 0 | 0 |
| Wireflow | 1440x900 | 0 | 0 |

Wireflow continuity map의 후속 단계는 자체 horizontal scroll 영역이며 문서 viewport
overflow가 아니다.

## 8개 사례

| 사례 | Result count | Primary | 노출 artifact |
|---|---:|---|---|
| 이사 D-30 | 24 | Calendar | Calendar, Todo |
| 차량 점검 | 10 | Todo | Todo, Calendar |
| Allblanc 운동 | 7 | Calendar | Calendar, Todo |
| K-MOOC | 14 | Sheet | Sheet, Todo |
| LibriVox | 38 | Sheet | Sheet, Memo |
| 신차 구매 | 14 | Todo | Todo, Sheet, Memo |
| 해외여행 안전 | 5 content blocks | Memo | Memo, Todo |
| 제주 여행 메모 | 5 | Todo | Todo, Calendar, Memo |

안전정보의 Memo는 guide/caution/action 5개 content block을 보존한다. Todo projection은
실행 가능한 4개 action만 포함할 수 있다.

## Interaction

- 제주 메모를 5개 Item으로 deterministic parse
- 포함/제외로 5 -> 4, undo로 5 복구
- Item 제목과 날짜를 수정하고 Result에 즉시 반영
- 기준일 2026-08-03에서 D-1을 2026-08-02로 계산
- 이사 기준일 2026-08-04에서 D-14를 2026-07-21로 계산
- 저장 receipt에 제목, 수량, artifact, scope, source 상태 표시
- Markdown round-trip에 실제 line break 표시
- reload 후 unsaved draft recovery 표시
- `source_import_required`에서 reason, preserved content, next action, back path 표시
- blocked state에서 save/export 비활성
- 18개 wireflow 상태와 A/B/C 비교 전환
- offline `index.html`과 `wireframes.html` 간 링크 이동, title, viewport overflow 확인

## Screenshot

- `assets/authoring-390-input.png`
- `assets/authoring-390-structure.png`
- `assets/authoring-390-result.png`
- `assets/authoring-390-receipt.png`
- `assets/authoring-390-roundtrip.png`
- `assets/authoring-390-blocked.png`
- `assets/authoring-1024.png`
- `assets/authoring-1440-initial.png`
- `assets/wireframes-390-editor.png`
- `assets/wireframes-1440.png`

## Claim boundary

이 결과는 local deterministic fixture browser QA다. production behavior, backend parser,
실제 외부 export, observed-user validation을 증명하지 않는다.

## 2026-07-29 v1.1 Detail Simulation

기존 v1은 개념판으로 보존하고, 상세 판정용
`../2026-07-29-flowme-text-authoring-ux-v1-1-detail-ko.html`을 별도로 검증했다.

- 8개 사례의 source fragment, 상세 설명, 완료 기준, 날짜, resource를 확인
- 선택 Item 수정 전/후 비교와 projection 반영 확인
- Calendar 24 event, K-MOOC 14 row, LibriVox 38 row 확인
- whole/selected/current scope와 ICS/checklist/TSV/Markdown/text sample 확인
- 운동 시간 `06:15`과 반복 종료 선택의 reload 복구 및 ICS 반영 확인
- 390x844, 1024x768, 1440x900 document overflow 0
- mobile edit/export dialog Escape와 focus return 확인
- visible enabled control의 accessible name 누락 0
- browser console error/warning 0

상세 결과와 screenshot 목록은
`../2026-07-29-flowme-text-authoring-ux-v1-1-detail-review.md`에 기록했다.
