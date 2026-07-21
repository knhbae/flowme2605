# P28-02 Shared Projection Contract

상태: `implemented`

기준 source: `46e567ec09c5eba37ac703529b3d3eccc75e0dde`

## 결과

`buildFlowExperienceProjection`이 한 effective item 목록에서 다음을 함께 만든다.

- whole Flow outline
- source/user ownership
- item role과 completion eligibility
- stable item identity
- 개인 제목·날짜·메모·순서·제외 반영
- `Flow 실행`, `Calendar`, `Checklist`, `Sheet`, `Memo` row와 count
- content-native primary와 secondary 최대 2개

`FlowItem.role`은 optional additive field다. 기존 item은 보존되고 legacy fallback으로 읽힌다.

## 정책

- resource/reference/warning/record는 완료 checkbox를 갖지 않는다.
- resource/reference/warning은 Calendar에서 제외한다.
- 날짜 없는 item은 Calendar에서 제외하지만 나머지 목록 projection에는 남는다.
- 제외 item은 모든 visible destination에서 빠지지만 source item은 삭제되지 않는다.
- completion은 row membership을 바꾸지 않는다.
- 명시된 `primary_destination`을 slug 기반 visual fallback보다 먼저 사용한다.
- routine은 Sheet/Memo가 명시된 경우 외에는 `Flow 실행`을 primary로 쓴다.

## 파일

- `lib/flow/flow-experience-projection.ts`
- `lib/flow/flow-experience-projection.test.ts`
- `lib/flow/types.ts`
- [상세 감사](./audit.md)
- [대표 fixture](./projection-fixtures.json)

## 다음 단계

P28-03에서 public/save-before surface가 이 projection의 outline과 actual-data shape를 렌더링한다.
