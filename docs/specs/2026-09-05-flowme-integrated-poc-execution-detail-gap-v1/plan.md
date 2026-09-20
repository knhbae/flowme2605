# P3-J 실행 계획

- 상태: `VERIFIED`
- 범위와 원본 매핑: [spec.md](./spec.md)

## 단계와 산출물

| 단계 | 수행 내용 | 종료 증거 | 현재 상태 |
| --- | --- | --- | --- |
| 1. 기획 | 세 산출물·정본 trace·관련 대화 결정·현재 code 대조 | D1-017와 D1-005의 source 기준 누락, 원문/메모 혼합, D1-023/024 의미·기존 충족 분리 | 완료 |
| 2. UX | 기존 Item 상세의 source/criteria/memo 구분, 돌아가기·선택 유지 | 새 디자인 없이 기존 field group과 disclosure 문법 채택 | 완료 |
| 3. 개발 설계 | bundle detail exact join, authored snapshot exact tuple, source/personal owner 분리 | 새 read helper와 view/UI 연결 책임, 저장 schema 확장 없음 | 완료 |
| 4. 구현 | read projection, React source prop, 동일 standalone 상세 | 원문 기준을 가진 Item에서 독립 필드 표시, 기준 없는 Item 무추정; meal slot 경로 추가 수정 | 완료 |
| 5. 검증 | 모델·컴포넌트·React/standalone 시나리오와 회귀 | 관련 58/58, npm 2,210/2,210, build 18/18, 제품 브라우저 26/26 | 완료 |
| 6. 비교·보고 | 요구별 before/after와 trace 판정 충돌 정정 | trace 65/65, 현재 하위 조건 3개 승격·2개 근거 갱신, 한국어 HTML과 추적표 렌더 4/4 통과 | 완료 |
| 7. 종료 감사 | 파일 소유·diff·경계·검증 범위·누락 증거 점검 | docs:check 16개 필수 문서·4,696개 로컬 링크 PASS, scoped diffcheck PASS, 실제 기기·publish 분리 | 완료 |

## 작업 순서와 병렬 분담

기획 담당은 이 spec package만 작성한다. root는 read model·상세 helper·React 연결을 맡고 standalone 담당은 독립 HTML 자산과 테스트를 맡는다. 구현 뒤 root가 전체 실행 개수와 화면별 증거를 확정하면 QA, trace, 보고에 같은 수치를 기록한다. 다른 담당자의 기존 dirty 경로를 수정하거나 복구하지 않는다.

먼저 source 정보가 실제로 누락되는 작은 경로를 수정하고 관련 테스트를 실행한다. 단위 검증이 통과하면 공통 상세와 기간/결과 연결을 실제 브라우저에서 조작한다. 그 뒤 전체 `npm test`와 production build를 실행한다. 새로운 수정이나 실패가 없다면 같은 전체 검사를 불필요하게 반복하지 않는다.

## 중단·계속 기준

- 누락 source metadata를 기존 schema에서 읽고 기존 UI에 전달하는 일은 현재 승인 안에서 계속한다.
- 실제 기기나 보조기술 evidence가 없다는 이유로 구현·자동 검증을 멈추지 않는다.
- 기준이 없는 source는 빈 필드·추정 기준을 만들지 않고 정상 빈 상태로 처리한다.
- 운영 writer나 새 영구 정책이 필요한 요구가 나오면 해당 요구만 결정 대기로 남기고 독립 작업을 계속한다.
- 이미 E4인 D1-023/024가 통과하면 회귀 재확인으로 기록한다. 새 구현으로 꾸미지 않는다.
