# Claude Design 원격 검토용 구조 사실

## 읽는 법

이 문서는 로컬 저장소에 접근할 수 없는 검토자를 위해 코드에서 확인된 사실만 요약합니다. 링크는 모두 기준 커밋 `c09f859b30b854f6f897b8ec1eb781fd774fbeca`에 고정되어 있습니다.

화면 구조 판정은 아래 네 가지 중 하나로 내려야 합니다.

- 공통 데이터 매핑 중심
- 공통 코어와 예외가 함께 있는 혼합 구조
- 콘텐츠별 개별 구현 중심
- 근거 부족으로 판단 불가

## 확인된 사실

### 1. 공개 Flow에는 두 경로 계열이 남아 있습니다

- `/f/[slug]`는 유효한 slug를 공통 `PublicFlow`에 전달합니다. [코드 보기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/app/f/%5Bslug%5D/page.tsx#L59-L65)
- `/flow-maps/[map]`는 일부 alias를 `/f`로 이동시키지만, 나머지는 별도 `SourceBackedFlowMapPublicPage`로 렌더링합니다. [코드 보기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/app/flow-maps/%5Bmap%5D/page.tsx#L51-L60)

확인 가능한 결론: 공개 화면은 완전히 하나의 경로와 화면 틀로 합쳐진 상태가 아닙니다.

### 2. `/f`에는 데이터 기반 공통 결과 렌더러가 있습니다

- `FlowArtifactDataPreview`는 `FlowExperienceProjection`과 `FlowExperienceShape`를 입력으로 받습니다. [입력 타입](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/FlowArtifactDataPreview.tsx#L7-L11) · [컴포넌트 입력](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/FlowArtifactDataPreview.tsx#L316-L340)
- 결과 shape에 따라 `CalendarRows`, `ChecklistRows`, `SheetRows`, `MemoRows`, `FlowExecutionRows` 중 하나를 고릅니다. [shape별 렌더러 선택](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/FlowArtifactDataPreview.tsx#L241-L252)
- 선택된 결과의 rows를 같은 shape renderer에 전달합니다. [rows 전달 1](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/FlowArtifactDataPreview.tsx#L360-L367) · [rows 전달 2](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/FlowArtifactDataPreview.tsx#L424-L431)
- `/f`의 `PublicFlow`가 이 공통 preview에 projection을 넣습니다. [호출부](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19188-L19207)

확인 가능한 결론: “콘텐츠마다 화면 전체를 별도 JSX로 그린다”는 설명은 정확하지 않습니다. 적어도 `/f`의 결과 미리보기에는 공통 데이터·renderer 구조가 있습니다.

### 3. 저장 전 공통 frame은 두 composition을 지원합니다

- `FlowSaveBeforeFrame`은 `legacy`와 `artifact-first` 두 composition을 가집니다. [타입과 props](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/FlowSaveBeforeFrame.tsx#L15-L33)
- `artifact-first`는 결과 artifact와 decision pane을 구성합니다. [artifact-first 분기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/FlowSaveBeforeFrame.tsx#L57-L100)
- `legacy`는 기존 요약·목록 구성을 유지합니다. [legacy 분기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/FlowSaveBeforeFrame.tsx#L104-L125)
- `/f`는 `artifact-first`를 사용합니다. [호출부](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19176-L19214)
- `/flow-maps`는 `legacy`를 사용합니다. [호출부](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/SourceBackedFlowMapPage.tsx#L191-L205)

### 4. Flow 전체 조정은 공통 패널이며 본문에 인라인으로 들어갑니다

- 조정 종류는 `name | anchor | items | routine`입니다. [타입](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/PublicFlowAdjustmentPanel.tsx#L13-L18) · [입력 모델](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/PublicFlowAdjustmentPanel.tsx#L44-L62)
- 패널은 dialog가 아니라 일반 `<section>`입니다. [패널 root](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/PublicFlowAdjustmentPanel.tsx#L92-L127)
- `/f`가 같은 공통 패널을 호출합니다. [설정](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L18937-L18955) · [렌더링](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L18998-L19020)
- 저장 전 frame 바로 다음에 패널이 렌더링되고, 열 때 해당 section으로 스크롤합니다. [배치](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19155-L19216) · [포커스와 스크롤](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L18664-L18675)

### 5. Item 수정은 다른 표면인 바텀시트입니다

- `PublicFlowItemEditor`는 `FlowBottomSheet`를 사용합니다. [바텀시트](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/PublicFlowAdjustmentPanel.tsx#L294-L319)
- 수정 필드는 제목, 상세 내용, 날짜입니다. [필드](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/PublicFlowAdjustmentPanel.tsx#L328-L370)
- 공개 조정 모델에는 Step·section subtitle 필드가 없습니다. [조정 모델](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/PublicFlowAdjustmentPanel.tsx#L13-L62)

확인 가능한 결론: Flow 전체 조정과 Item 수정은 공통 데이터 흐름 안에 있으나, 사용자가 만나는 편집 표면과 전환 방식은 서로 다릅니다.

### 6. 공통 구조 위에 slug별 표시 예외가 있습니다

- 모바일 workbench 우선 노출은 routine 전체와 명시적인 8개 slug를 사용합니다. [코드 보기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19467-L19480)
- 데스크톱 reference rail은 명시적인 7개 slug를 사용합니다. [코드 보기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19483-L19492)
- 단순화된 feedback layout은 source-fit 조건 또는 명시적인 slug 목록을 사용합니다. [코드 보기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L20888-L20911)
- 특정 routine의 요일 선택, 문구, 도구, footer에도 category·prefix·slug 조건이 있습니다. [요일 선택](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19698-L19704) · [도구와 문구](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19820-L19855) · [footer 숨김](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L20914-L20915)

### 7. 출처·원문 영역은 경로별로 다릅니다

- `/f` compact 화면은 `출처와 주의` details 안에 제작자, source fit, 원문, 주의 카드를 넣습니다. [코드 보기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19293-L19309)
- non-compact `/f`는 같은 정보를 별도 section으로 표시합니다. [코드 보기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L19310-L19325)
- 일부 slug는 footer 전체를 숨깁니다. [slug 목록](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L548-L550)
- `/flow-maps` 코드는 별도 `전체 내용과 원문` disclosure를 둡니다. [코드 보기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/SourceBackedFlowMapPage.tsx#L207-L217)

주의: 마지막 disclosure는 E12 Production 캡처에서 나타나지 않았습니다. 코드에는 있지만 현재 화면에서 확인되지 않은 차이로 남깁니다.

### 8. My Flow의 `할 일 / Flow`는 실험 모드에 연결된 두 보기입니다

- 상태는 `todo | flows`, 기본은 `todo`입니다. [상태](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L5383-L5384)
- 전환 시 URL의 `mode`도 갱신합니다. [전환](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L14930-L14957)
- UI에는 실제 `할 일`, `Flow` 두 탭이 있습니다. [탭](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L15023-L15050)
- 코드에는 P35 실험 marker와 rollback 표기가 있습니다. [실험 marker](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L15008-L15017)
- 실험이 켜지면 cross-Flow Todo를, 꺼지거나 `flows`를 고르면 기존 Flow workspace를 표시합니다. [분기](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L16502-L16514)

### 9. 메모는 코드에서도 두 모델로 나뉩니다

- 실행 메모는 별도 상태를 사용합니다. [상태](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L5332-L5333)
- 행에는 `실행 메모`를 남기는 `메모` 버튼이 있습니다. [행 UI](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L9188-L9220)
- 상세에도 별도 `실행 메모` section이 있습니다. [상세 UI](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L11804-L11814)
- 한편 Item draft에는 다른 `memo` 값이 있고, `메모·일정` 안의 `메모` 및 수정 화면의 `내 메모`로 표시됩니다. [draft](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L7098-L7107) · [메모·일정](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L11939-L11960) · [내 메모](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L12015-L12019)

### 10. `이 사본 사용`은 중복 사본을 정리하는 예외 상태입니다

- `status === 'needs_choice'`인 중복 사본 그룹만 대상으로 합니다. [그룹 계산](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L5324-L5326) · [선택 대상](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L5951-L5953)
- 특정 Flow 작업 공간 안이 아닌 My Flow 상단에서만 표시합니다. [노출 조건](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L16298-L16304)
- 안내문은 계속 쓸 사본을 고르되 완료 기록과 개인 메모는 자동 병합하지 않는다고 설명합니다. [안내문](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L16305-L16312)
- 각 사본에 `이 사본 사용` CTA가 붙습니다. [CTA](https://github.com/knhbae/flowme2605/blob/c09f859b30b854f6f897b8ec1eb781fd774fbeca/components/flow/AppClient.tsx#L16314-L16347)

확인 가능한 결론: 일반 실행 기능이 아니라 데이터 손실을 피하기 위한 사본 선택 기능입니다. 기능 삭제 여부보다 일상 실행 화면에 나타나는 위치와 발생 시점이 적절한지를 검토해야 합니다.

## 현재 근거에 맞는 중립적 분류

현재 구조는 아래 이유로 **혼합 구조** 후보입니다.

- 공통 projection, shape, row renderer, 저장 전 frame, Flow 조정 패널이 실제로 존재합니다.
- 동시에 두 공개 경로, 두 composition, slug별 표시 예외, Flow와 Item의 다른 편집 표면이 남아 있습니다.

이 분류는 전면 재작성을 뜻하지 않습니다. 검토자는 다음 세 선택안을 영향 범위와 함께 비교해야 합니다.

1. 공통 코어 유지 + 화면 전환 규칙만 통일
2. 공통 코어 유지 + route·composition·slug 예외를 명시적 variant 정책으로 정리
3. 공통 코어와 화면 상태 모델을 함께 재설계

## 아직 판단할 수 없는 것

- 실제 사용자가 `할 일 / Flow`를 이해하는지
- 인라인, 바텀시트, 별도 화면 중 어느 방식이 더 성공적인지
- 각 slug 예외가 모두 필요한지
- `전체 내용과 원문` 코드와 Production 화면이 다른 정확한 원인
- `이 사본 사용`의 실제 발생 빈도와 사용 맥락
- 전면 리팩토링의 실제 비용
