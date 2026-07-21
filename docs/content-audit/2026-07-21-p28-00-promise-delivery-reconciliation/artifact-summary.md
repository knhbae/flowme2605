# Prior artifact promise summary

## 분류

- evidence kind: `prior_design_artifact`
- 원본 작성 시점: 2026-07-19 계열
- 실제 사용자 관찰: 0
- current production 여부: 아님
- 목적: 서로 다른 콘텐츠가 최소 입력에서 실행 결과와 portable destination으로 바뀌는 UX 계약 비교

## 대표 콘텐츠 5개

| 사례 | 사용자 작업 | 프로토타입의 핵심 형태 |
| --- | --- | --- |
| 이사 준비 | 이사일을 기준으로 준비 구간을 실행 일정으로 전환 | Calendar 중심 + 날짜 없는 후속 Checklist |
| K-MOOC | 14주 학습 진도와 제출 항목 관리 | Sheet/Checklist 중심 + 필요한 일정 |
| 농작업 폭염 대응 | 작업 전 확인과 작업 중 안전 기준 구분 | 실행 Checklist + 완료 대상이 아닌 reference/warning |
| 리모델링 계약 검토 | 계약 전 확인 항목과 근거 기록 | Checklist/Sheet/Memo 비교 |
| 부모님 여행 동선 | 장소 순서를 보존하고 여행일·시각만 개인화 | Checklist에서 Calendar로 점진 전환 |

## 비교 destination 4개

- Calendar: 확정된 날짜·시각이 있는 실행 항목
- Checklist: 순서나 확인이 중요하지만 날짜가 필수는 아닌 항목
- Sheet: 비교, 다수 속성, 진행 추적이 필요한 행
- Memo: 원문 맥락, 개인 메모, 다시 볼 링크를 읽기 쉽게 보존

## 현재 production과 대조할 약속

1. 결과가 만들어지기 전에 원문 기반 전체 Flow가 보인다.
2. 원문에 없는 날짜나 항목을 임의로 만들지 않는다.
3. 사용자는 콘텐츠마다 꼭 필요한 값만 입력한다.
4. 동일한 effective content가 destination에 따라 다른 형태로 미리 보인다.
5. 의미 없는 destination은 강제로 노출하지 않는다.
6. 저장·복사·내보내기 전에 결과 수량과 손실 정보를 알 수 있다.
7. 실행 항목, 확인 항목, reference, warning, resource가 같은 체크박스로 평탄화되지 않는다.
8. source와 개인 입력, 실행 상태가 서로 덮어쓰지 않는다.

이 목록은 구현 완료 선언이 아니다. P28-00에서 current production/source와 대조할 검토 기준이다.
