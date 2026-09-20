# B2 구조 표시 facade 연결

2026-09-05. `k3b-structure-reader-ui-design.md`의 읽기 gate를 구현하기 위한 최소 설계다. 기존 PD ABI1과 두 API의 입력·출력은 유지한다.

새 `projectPersonalPlanStructureDisplay({checkpoint,sourceRead,sourceEpoch,flowRef})`는 exact data 입력만 받는다. 기존 C validation 및 `inspectPair`로 current/실제 C Undo-P와 source를 검사한 뒤, P source reader의 context를 내부에서만 사용해 `readPersonalPlanStructureView`를 호출한다. 반환은 `{ok:true,scope:'structure-display-only',structure:<P frozen display view>}`다. context, editor token, candidate, 저장권한을 내보내거나 inspector/planner를 호출하지 않는다. getter/unknown field/잘못된 Flow/source/metadata는 구조값 없이 차단한다.

app의 공통 Flow 결과 옵션과 상세는 이 표시값을 사용한다. M에는 `personalPlanStructureView` 옵션으로 실제 한 Flow view를 전달하며, M은 full-ref 순열과 section membership을 자체 대조한다. `viewOnly` 플래그는 저장 권한이 아니다. 결과, 상세, 편집 목록이 같은 선형 순서를 소비하고 readonly section의 null id를 합치지 않는다.

현재 no-P의 legacy composer가 지원하는 읽기 범위를 이 신규 API로 축소하지 않는다. no-P에서 구조 reader만 실패하면 기존 상세/결과 읽기를 유지할 수 있으나, P가 있는 경우에는 구조 실패를 옵션 생략이나 raw fallback으로 감추지 않는다. source 관측 오류의 기존 execution-only 화면도 그대로 유지한다. 실패 화면에서는 원문이나 shadow를 바꾸지 않는다.

검증: no-P/readonly, alias와 전체순서, 실제 Undo 및 Undo-only source 오류, 다른 사본/잘못된 입력, getter0, current metadata 오류, UMD API 부재와 no writer/ambient 접근, 기존 PD 회귀. 실제 UI/브라우저 검사는 별도다. 사용자 HTML은 B2 UI 검증 전 FB17을 유지한다.
