# B2 이후 읽기·편집 UI 연결 gate

2026-09-05. 구현 전 연결 설계다. [원본 개인 편집 계약](../2026-09-03-flowme-integrated-poc-personal-editing-closure-v1/spec.md), [B2 계약](./k3b-section-order-contract-diff.md), [독립 검토 R03–R07](./k3b-section-order-independent-review.md), React Plan 편집 surface와 현재 standalone C/T/rank/M/PD/app의 실제 소비 지점을 대조했다. 이 문서를 작성한 것만으로 아래 기능이 구현됐다고 판정하지 않는다.

## 원본 화면과 연결할 화면

| 원본 개발1 동작 | 현행 standalone | B2 연결 |
| --- | --- | --- |
| Plan의 `내 구간 제목`: 소유가 증명된 구간만 상속/직접 입력 | B1은 Flow 제목·Item 메모·계획날짜만 있음 | Flow 제목 다음에 발급된 editable sections만 표시. source title을 baseline으로 보여 주며 readonly/implicit/seed에 편집 버튼을 만들지 않음 |
| `할 일 순서`: full Item refs를 선형 나열, 위/아래 이동·Item 재편집 | raw Step별 flatten 순서로 Item 카드 표시 | draft.orderedItemRefs 순으로 나열. 각 행에 자기 구간 이름을 표시. A1/B1/A2를 다시 구간별로 묶어 A1/A2/B1로 바꾸지 않음 |
| Item 반영 후 부모 Plan 초안 유지 | B1의 child staged·전체저장·dirty닫기·Undo/복구 존재 | v4 genuine child를 사용하며 section/order는 부모 소유로 보존. child Cancel/Escape는 부모 변경에 영향0 |
| Text·Todo·Calendar·Sheet·TXT의 effective 구간·Plan 순서 | M.resultProjection이 raw Step별로 sourceItems를 만듦 | 검증된 P 구조 view를 읽기 소비자에 명시 연결. 원본 Flow.steps/Task배열을 재정렬하거나 새membership으로 저장하지 않음 |

구간에 새 한 줄 금지를 임의 추가하지 않는다. 기존 React section text 규칙인 nonblank·trim-exact와 P v1 core text의 기존 허용을 구분한다. 기존 core 공백/줄바꿈/빈 메모는 손실 없이 보존한다.

## 저장 전 편집 상태

- Plan open은 실제 source/epoch를 읽는 새 v4 root session과 C 구조 inspector로 구성한다. source-before-personal의 title/memo/date와 section 원문 baseline을 함께 읽는다. 보기 전용 P view를 저장 권한으로 사용하지 않는다.
- 구간 입력과 위/아래 이동은 E2 updateDraft에만 반영한다. no-op/경계 이동은 부모 revision을 불필요하게 올리지 않고 저장0이다. 이동 뒤 같은 full-ref 행의 해당 버튼으로 초점 복귀한다. index는 화면 위치일 뿐 owner ref가 아니다.
- 순서 버튼은 키보드로 조작할 수 있고 첫/마지막 경계는 disabled다. existing React의 비드래그 경로가 최소 동등성 기준이다. 이후 drag/메뉴 경로를 추가하면 같은 순열 reducer로 연결하며 별도 writer를 만들지 않는다.
- Item 편집→반영→Plan으로 돌아와도 부모 구간/순서와 미저장 제목을 유지한다. dirty 구간/순서도 기존 Cancel/X/Escape/Back 확인에 포함한다. 저장/재시도/복구 상태에서는 순서 버튼도 잠근다.
- 빈/공백 구간명·잘못된 순열·source drift는 입력을 지우지 않고 이유를 해당 필드 또는 저장 상태에 표시한다. 저장 성공 영수증의 상세 변경 요약은 B3이지만 B2 저장 성공/실패/같은값/취소 안내는 이미 작동해야 한다.

## 읽기 소비자 경계

P `readPersonalPlanStructureView`는 실제 source context에서 얻은 frozen display-only 자료다. PD current/실제 Undo-P gate를 통과한 뒤 flowRef별 view를 읽으며, source 장애가 있는 구조 metadata를 raw fallback으로 표시하지 않는다. 일반 no-P의 기존 display/execution-only 분기는 유지한다.

M 결과·Flow 상세·편집 목록은 공통 선형 full-ref order를 소비해야 한다. 구간 정보는 각 Item ref의 원래 membership에서 읽고 effective 이름만 붙인다. 결과용 옵션/adapter는 읽기용이어야 하며 Flow/Task raw 배열이나 source rawText를 변경하지 않는다. readonly 복수 구간의 null id를 하나의 dictionary key로 합치지 않는다. 결과 TXT와 원문 WorkingSource는 구별한다.

현재 C.projectGroups와 timeline-result-rank는 raw Task 배열 index로 동률을 정한다. 따라서 P 배열만 새로 만들면 Calendar/기간과 Plan이 다를 수 있다. **C 기본 action 연결과 별도인 읽기 순서 gate**에서 다음을 검증한 뒤 같은 validated order를 반영한다.

1. 새 v2 metadata의 order를 읽는 경로는 먼저 실제 P/C strict validation을 통과해야 한다. caller가 주는 임의 order나 source-ready flag를 저장 action의 권한으로 사용하지 않는다.
2. 각 Flow의 기존 task slot 안에서만 full-ref 개인 순서를 동률 baseline으로 적용하는 방식을 검토한다. 다른 Flow/Quick의 상대 위치를 재정책화하지 않는다. 다른 시간은 기존 time 우선, 명시 TimelineOrder와 구 view 호환 우선순위는 유지한다.
3. timeline 표시·reorder의 현재 peer 검사·reset·Calendar resolver가 같은 함수를 소비해야 한다. 화면만 정렬해 C가 stale-peers로 거절하는 연결은 허용하지 않는다.
4. metadata 없음/원래 순서 reset의 기존 fallback과 raw Task배열/Step순서가 다른 유효 자료는 별도 positive/negative로 대조한다. 동등성을 증명하지 못하면 제한을 남기고 새 기본 정책으로 임의 통일하지 않는다.
5. 실제 회차는 기존 explicit resolver의 Plan fallback을 유지한다. source membership/source order 변경 지원과 개인 순서 변경 지원은 별개다.

## 후속 검증 목록

등록 전 예정 목록이다. P/C의 모델 통과 수에 포함하지 않는다.

- 실제 명시 구간 A/B: 구간 별칭·cross-section A1/B1/A2·Item 편집 staged0→최종저장4API→reload→Undo. 같은 local id를 갖는 다른 사본 불변.
- 네 saved origin의 구간 readonly와 전체순서 positive, implicit/explicit 혼합과 빈 선행 구간 stable id. unknown/missing/duplicate source proof를 UI가 복원하지 않음.
- current source B→명시 별칭 A→source가 A와 같아진 후 읽기/별도core 저장에서도 명시 의도 보존. 명시 inherit만 제거.
- Text/Todo/Sheet/TXT/상세의 ref 순열·구간명 동일, Calendar/기간 동률·시간·수동순서·다른날짜/사본의 우선순위 대조.
- source before/candidate의 current/Undo-v2 gate, raw/v3 복구 호환, v4 prepared/confirmed/error/재시도/명시재개, D가 구조capture까지 정확 삭제하는 격리 fixture 검증.
- 390×844·375×812·844×390·1024×768·1440×900: 긴 동명 구간·긴 항목·invalid·저장상태의 fullrect/9점hit, overflow/console/page error0. 키보드 비드래그 순서·닫기·반영 초점 확인.
- 새로 생성한 두 사용자 HTML exact bytes/SHA와 실제 file URL 조작. 생성하기 전에는 B1 FB17을 유지하며 중간 builder 불일치를 기대값 완화로 감추지 않음.

실제 Android/iOS·OS IME/Back·보조기술은 미실행이면 NOT_RUN, 관찰 사용자0이다. 이 설계는 새로운 운영 schema·writer·공개/계정/cloud·배포를 허용하지 않는다.

## 2026-09-06 상세의 실행 정렬과 Plan 순서 구분

앞 문단의 ‘Flow 상세도 공통 선형 순서를 소비’는 상세 안의 **Plan 결과 패널**에 적용한다. 상세의 기존 Step별 실행 목록은 `flow:<flow>:<step>`의 시간·명시 실행 정렬을 보존한다. 여기에 global Plan 순서를 강제로 적용하면 기존 drag/메뉴/키보드 이동이 저장돼도 화면에 보이지 않는 회귀가 생긴다.

원본 React `PersonalWorkspacePocSurface.tsx`의 `renderFlowDetail`은 날짜별 실행 todos와 별도 Plan 결과를 나누며, P2-C spec의 구간 제목 계약은 상세의 effective title 일치를 요구한다. 따라서 standalone도 실행 목록의 정렬/전이는 유지하되 구간 이름은 P 표시 reader로 투영하고, 같은 상세의 Plan 결과 및 Plan 편집에서는 A1/B1/A2 선형 순서를 유지한다. 화면에도 ‘실행 목록’과 전체 계획 순서를 구분해 안내한다. Item 상세는 같은 effective 구간명을 보여 준다.

이 정정은 새 실행 정렬 정책이나 즉시 Plan writer를 추가하는 것이 아니다. 기존 순서를 개인 Plan 순서로 자동 migration하거나 기존 controls를 삭제하지 않는다. 테스트는 두 보기를 별도로 비교하고, 날짜/수동 TimelineOrder 때문에 다른 표시 순서를 단순 불일치로 세지 않는다. 최초 문서의 모호한 ‘상세 동일 순서’ 표현은 이 근거로 범위를 좁혔으며, 실제 화면 검사 전에는 구현 완료로 판정하지 않는다.
