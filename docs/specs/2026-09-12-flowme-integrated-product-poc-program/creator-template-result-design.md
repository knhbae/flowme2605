# 작성 틀의 결과 표시 연결

2026-09-14 · 구현/검증 중. 여섯 작성 틀 전체 동등성 및 전체 목표 완료 주장이 아니다.

## 원래 요구와 발견

개발2의 P0 계약 53행 (로컬 전용 근거: `../../../../flow-text-authoring-writing-template-ux-review-20260829/docs/specs/2026-08-29-flowme-p0-structure-template-development-starter/spec.md`)은 실제 모든 Item의 일정이 있으면 Calendar, 미정이 하나라도 있으면 Todo를 첫 결과로 요구한다. 운동 두 틀만 엔진의 Sheet eligibility가 있을 때 표를 제공한다. 나머지 네 틀은 표를 제공하지 않는다. pinned catalog/fixture/원문은 수정하지 않는다.

현재 raw 결과는 TXT부터 시작하고 공통 presenter의 네 탭을 모두 노출한다. native 결과도 template policy 없이 모든 종류를 제공한다. 예시의 기대 결과를 사용자 입력 결과로 대신 사용하지 않는다.

## 연결 설계

- 검증된 materialized sidecar의 catalog/template/version으로 원래 표시 계약을 읽는다. 미적용/해제된 틀은 일반 작성의 기존 결과를 유지한다. 적용 뒤 원문 편집은 현재 원문/구조를 다시 읽되 원래 틀의 provenance를 버리지 않는다.
- 기존 D2 artifact projector의 실제 포함 항목·날짜·Sheet eligibility를 사용한다. native owner는 원문 재파싱 없이 저장된 canonical 구조와 포함/역할 설정을 읽는다. raw 작성만 기존 D2 parser/projector로 읽는다. 날짜나 원문을 새로 만들지 않는다.
- 첫 캘린더는 실제 첫 일정의 달을 보여준다. 탭·달·날짜 선택은 UI 상태뿐이며 actor/draft/materialization context로 분리한다. 같은 초안의 사용자 선택은 유지하고, 허용되지 않게 된 탭은 현재 기본 결과로 돌아간다.
- 공통 presenter에 optional availableViews port를 추가한다. 기본 호출의 네 탭·legacy txt는 변경하지 않는다. 제한된 탭의 Arrow/Home/End는 실제 노출 순서만 따른다. 세 탭일 때 빈 네 번째 칸을 만들지 않는다.
- 공통 presenter의 미소유 readOnly 수정 4추가/2삭제를 보존한다. 수정 전 전체 파일은 output/integrated-product-poc/result-presenter-before-template-policy.tsx에 보관했다. SHA256 761892f9849753100682000bdc7ec36976d7fa239342124ae78c09655e8b494a. 세 번째 명시 연결 접점으로 좁은 diff와 전후 해시를 확인한다. 기본 /my·운영 writer·저장 계약 변경은 없다.

## 검증과 다음 범위

원래 여섯 fixture의 실제 적용 결과, 미정/일정 변경, 운동의 eligibility 유무, native 포함/역할, 미적용/해제/잘못된 sidecar, context 분리와 사용자 선택, 공통 presenter 기본 회귀와 제한 탭 키보드를 검사한다. 기존 브라우저 자료를 초기화하지 않고 실제 결과·전환·5크기·읽기 0쓰기를 확인한다. 여섯 틀의 전체 필드 입력→저장→개인 실행→선택 공개는 별도 연속 시나리오로 끝까지 확인하며 국소 모델 통과로 대체하지 않는다.
