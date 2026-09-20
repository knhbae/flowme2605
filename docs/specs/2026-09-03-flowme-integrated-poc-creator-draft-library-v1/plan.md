# P3-B 실행 계획

## 1. 요구와 경계 확정

- D2-057의 여섯 판정 단위를 개발2 정본·세션 결과·현재 코드에 다시 매칭한다.
- 기존 자동 복구와 명시 저장 CreatorDraft를 분리한다.
- D2-002·D2-004는 production owner/adapter가 없으므로 부분 상태로 유지한다.
- 개발2 세션의 더 넓은 목록 메타·다중 revision 요구와 현재 여섯 판정 단위를 분리해 남긴다.

## 2. 상태·저장 설계

- version 1 CreatorDraft library, immutable validator, 순수 transition, 결정적 검색·정렬을 만든다.
- working draft에 optional creator binding을 추가하되 기존 payload를 migration write 없이 읽는다.
- 별도 CAS transaction과 exact rollback/recovery를 만든다.
- exact rawText에서 source label을 파생하되 production source metadata를 새로 소유하지 않는다.

## 3. UX·구현

- 기존 작성 shell을 유지하고 내 초안 lane과 평면 목록 컴포넌트를 추가한다.
- 개인 Flow 저장과 제작자 초안 저장을 owner별로 분기한다.
- standalone도 같은 상태·문구·selector·transition을 사용한다.

## 4. 집중 검증

- 저장·검색·재진입·수정·복제·보관·복원·Undo·reload를 양쪽 surface에서 실행한다.
- 취소·Escape·same·stale·corrupt·storage failure의 zero-mutation과 exact rollback을 확인한다.
- 다섯 viewport와 키보드·비드래그 경로를 확인한다.

## 5. 회귀·보고

- 개인공간 PoC suite, standalone suite, 관련 브라우저 회귀, 전체 `npm test`, production build를 실행한다.
- 운영 `flow:*` 불변과 writer allowlist를 증거로 남긴다.
- D2-specific fresh gate가 통과하고 전체 회귀의 P3-B 관련 실패가 0일 때만 D2-057을 충족으로 승격하고 gap 14를 확정한다.
- 검증 전에는 `VERIFICATION_PENDING`과 빈 `overrides`를 유지했고, 검증 완료 뒤 `VERIFIED`와 실제 수치를 적용했다.
- `.2-.6`의 current subcheck projection을 E4로 갱신하고 `.1`의 기존 E4 회귀를 확인했다.
- 실제 기기·관찰 사용자·게시 상태는 각각 별도로 기록한다.
