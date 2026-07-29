# Content Fidelity Review

- 검토일: 2026-07-28
- 판정: `pass_after_bounded_evidence_corrections`
- 관찰 사용자 수: 0
- evidenceKind: `current_source`, `current_package_screenshot`, `heuristic_simulation`

## 검토 원칙

- source shape를 먼저 보존하고 자연스러운 artifact를 고른다.
- source 사실, 개인 값, 실행 상태를 섞지 않는다.
- 날짜가 없으면 임의 Calendar 날짜를 만들지 않는다.
- resource, guide, caution은 실행 Item이 아니면 완료 대상으로 바꾸지 않는다.
- 같은 이름의 다른 source version을 자동 병합하지 않는다.

## 사례별 판정

| 사례 | 판정 | 고정한 경계 |
|---|---|---|
| 이사 D-30 | pass | AJD runtime 24, AJD corpus 27, EasyLaw 24를 별도 fixture로 표시 |
| 차량 점검 | pass | source의 D-14/D-10/D-3/D-Day를 유지하고 undated는 개인 projection 선택으로 한정 |
| Allblanc | pass | 7일 sequence와 1-video weekly recurrence를 별도 variant로 유지 |
| K-MOOC | pass | 14행 유지, 0/14는 source가 아니라 execution-run 초기/파생 값 |
| LibriVox | pass | 38장과 현재 재생 위치를 유지하고 routine이나 가상 날짜로 변환하지 않음 |
| 신차 구매 | pass_with_proposal_marker | decision/check/record를 구분하되 rich Sheet 필드는 현재 CSV가 증명하지 않는 제안으로 표시 |
| 해외여행 안전 | pass | guide/caution/action과 공식 source를 분리하고 안전 판단을 추가하지 않음 |
| 제주 개인 메모 | pass | 원문 fragment와 5개 Item lineage를 유지하고 live AI라고 표현하지 않음 |

## 반영한 보정

1. Allblanc 7일 순서형과 현재 runtime weekly routine을 같은 콘텐츠로 표현하지 않는다.
2. 차량 점검을 source 자체가 undated인 콘텐츠로 표현하지 않는다.
3. 이사 콘텐츠의 서로 다른 24/27 Item 버전을 명시한다.
4. K-MOOC 진행률은 개인 실행 값으로 이동한다.
5. ownership matrix에 personal structural overlay, recurrence series, export receipt를
   명시한다.
6. 신차 비교 field는 검증된 current contract가 아니라 후속 제안으로 표시한다.
7. Markdown round-trip은 지원된 authoring subset에 한정하며 canonical 전체 상태의
   무손실 직렬화를 약속하지 않는다.

## Projection 판정

| Artifact | 포함 | 제외 또는 별도 보존 |
|---|---|---|
| Calendar | 날짜가 확정된 실행 Item | undated Item, resource, guide |
| Todo/Checklist | 실행 가능한 Item | resource, guide, caution |
| Sheet | 실행 Item, row order, 비교/기록 field | source 전문은 링크 또는 detail |
| Memo | guide, caution, source context, 개인 메모 | 완료 상태는 execution run |

## 잔여 위험

- source 원문 자체의 최신성은 이 목표에서 재크롤링하지 않았다.
- prototype parser는 deterministic fixture simulation이며 범용 parsing 품질 증거가 아니다.
- 외부 도구 round-trip과 실제 사용자 이해도는 검증하지 않았다.
