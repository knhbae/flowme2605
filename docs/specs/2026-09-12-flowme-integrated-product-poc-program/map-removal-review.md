# Map 원본 삭제 수용 — 경로와 기록 보존 점검

2026-09-14 · 진행 중. [전체 실행 계약](spec.md)의 P03/P07/P08, S05/S08/S09/S10을 보완한다. 새 원본을 받았을 때 개인 기록을 보존하는 것이 목표이며, 실제 외부 서비스의 새 판본 발행은 이 로컬 PoC의 완료 조건으로 새로 추가하지 않는다.

## 하위 Flow 전체 구성 — 후속 구현

항목 삭제와 구분해 `mapMembership.version:1`의 그룹 전체 원본·이전/현재 구성·명시 부재·검토·구성 전용 Undo를 연결했다. 원문·saved tuple·개인 문서/날짜/메모/지난 기록은 보존하며, 제외한 하위 Flow만 공통 계획과 일반/반복 실행에서 빼고 동일 정체성의 재등장은 명시 수용한다. 새 하위 Flow 생성·빈 Map 전체 수용은 미지원이며 영구 제품 정책으로 확정하지 않았다.

처음 구현의 비교 버튼은 저장된 검토를 만들었다. 취소0 계약에 맞추어 새 비교와 선택은 화면에만 유지하고, 적용 직전 실제 전체 원본과 개인 snapshot을 다시 대조해 한 거래로 저장하도록 수정했다. 모두 유지·취소·Escape는 저장0이며 저장 실패 후 선택을 유지한다. 개인 계획과 구성 검토는 양방향 입력 잠금으로 동시에 적용하지 못한다.

기존 D1 read model을 직접 가져오던 두 번째 통로도 전체 검사에서 발견했다. 검사를 완화하지 않고 기존 `legacy-map-source.ts`의 메모리 읽기 통로를 재사용했다. 관련 화면39개와 수정 뒤 전체165파일1604개를 통과했으며, 이후 탐색 복귀 수정이 포함된1606검사와 실제 하위 Flow 시나리오는 아래 IW8 결과로 갱신한다. 항목 삭제·반복의 이전 검사는 당시 실행판의 근거로 남긴다.

## 후속 개선 소스와 Node 진단

검증 진입마다 원래 그룹과 모든 revision을 검증하되, 한 동기 호출 안에서 분리된 증거 인덱스를 재사용한다. 전역 mutable 입력 캐시·자료 축소·기록 삭제는 하지 않는다. Map 계획 읽기는 첫 child에 이미 읽은 동일 호출의 view만 재사용하며 다른 child의 rebase를 합치지 않는다. 제외된 Flow 화면의 빈0/0 실행 목록 대신 같은 개인 문서·제목 수정 경로를 남겼다.

1단계 진단 (로컬 전용 근거: `../../../output/integrated-product-poc/map-child-performance-diagnostic-2026-09-14T12-25-32-706Z.json`)의 Map 읽기는849~859ms, 2단계 동일 호출 재사용 (로컬 전용 근거: `../../../output/integrated-product-poc/map-child-performance-diagnostic-2026-09-14T12-38-35-991Z.json`)은572~587ms였다. 각각 같은 분리 자료의19구간×2회이며 원본176파일 변경0·입력 동일이다. 이는 이전5.37~5.39초와 비교할 수 있는 Node 진단이지 실제 브라우저 응답 개선 완료가 아니다. 새 실행판의 동일 프로필에서 별도로 측정한다.

## b9n 후속 브라우저 — 동일 구성 복원·추가 진행·Undo

개선 후 실제 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-child-improvement-2026-09-14T13-05-59-842Z.json`)은 `b9nco3rcs6kqfn9gSOGEA`의207개 단언을 통과했다. 단언에는 크기별 공통 검사도 포함되며207개 사용자 시나리오가 아니다. 기존 Map 프로필의4에서 동일 하위 Flow 복원5→10/7의75% 추가6→구성만 Undo7→reload7을 확인했다. 기존10/5·35%,10/6·65%와 추가75%, 같은 원문 문서·행·사본 연결·개인 제목·날짜·메모는 보존했다. 성공쓰기3회, 채워진 운영 테스트3키 byte 동일, 범위 밖쓰기·page/console오류0이다. 최종 payload hash는 `f3388283f6b80058192106b63107780700cb9374e66f0ec98c0300231d3dee2f`다.

| 실제 행동 | pointerdown→저장 반환·즉시 readback | 같은 시작→화면 상태 안정 |
| --- | --- | --- |
| 같은 하위 Flow 복원 | 1.942초 | 8.035초 |
| 새 날짜75% 기록 | 3.505초 | 6.841초 |
| 구성만 Undo | 3.181초 | 8.551초 |

화면 안정은 결과 상태·busy 해제·3프레임 안정으로 관측했다. 같은 시각 전체 테스트/build 등 병렬 부하 없이 측정했고20초 대기는 통과했지만6.8~8.6초의 응답 부담은 남는다. 이전28초는 클릭→관찰 완료로 끝점이 달라 정확한 개선율을 계산하지 않는다. Node 진단과 실제 화면 시간을 합치거나 성능 완료로 표시하지 않는다.

390×844 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/improvement-retained-390x844-1789391176145.png`), 375×812 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/improvement-retained-375x812-1789391192436.png`), 844×390 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/improvement-retained-844x390-1789391208534.png`), 1024×768 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/improvement-retained-1024x768-1789391224919.png`), 1440×900 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/improvement-retained-1440x900-1789391240933.png`)을 모두 직접 확인했다. 실행 제외 화면의 빈0/0·할 일 목록은 없어졌고 같은 개인 문서·제목 수정 취소·다른 하위 Flow 조작 경로는 남았다. 가로 넘침0이지만 보존 안내 반복과 여백은 후속 UX 개선 대상으로 남긴다. 실제 기기 검사나 실제 외부 원본 갱신은 아니다.

## 이전 IW8 하위 Flow 브라우저 결과

현재 build `IW8LsXxwu6E9dExSGidFW`, 전체165파일1606/1606·skip0·strict368/진단0이다. 검사의 후속 원본은 실제 D1 factory를 사용하는 로컬 시뮬레이션이며 외부 새 판본 발행은 아니다.

- 첫24확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-child-removal-final-2026-09-14T11-48-19-800Z.json`): 취소 후 닫힌 메뉴를 그대로 찾는 QA 오류로 중단, 저장0. 메뉴를 실제 UI로 다시 여는 검사만 수정했다.
- 같은 자료의72확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-child-removal-resumed-2026-09-14T11-49-54-606Z.json`): 비교/취소/Escape·개인 계획 동시 편집 차단, quota 실패 후 동일 선택 재시도, 하위 제외·5크기·reload, 동일 원본 복원 미리보기/취소를 확인했다. 복원 재시도 대기가20초를 넘겨 partial로 끝났지만 나중에 실제 revision2가 저장됐다. 성공2/실패2회, 범위 밖0이다. 성공을 만들기 위해 다시 클릭하거나 초기화하지 않았다.
- 동일revision2에서 tail44확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-child-tail-2026-09-14T11-58-46-666Z.json`): 정확한 원문 문서의 기존10/5·35%에10/6·65%를 추가하고 구성만 Undo했다. before0→restored2→later3→undone4→reload4. 개인 제목·날짜·메모·35/65% 이력·행/사본 연결과 원본을 보존했다. tail 성공쓰기2, 실패0, 운영 테스트3키 byte 동일·허용 밖0·page/console오류0이다. 중간 read-only tail의 build 판별/화면 전환 대기 실패도 기록에 남겼다.

43개 교차검증 (로컬 전용 근거: `../../../output/integrated-product-poc/map-child-crosscheck-2026-09-14T12-04-34-285Z.json`)은 현재 소스·build·전체 검사와 두 브라우저 세그먼트의 실제 실행판/행/사본 정체성·이전/이후 저장값을 대조했다. 72확인의 timeout은 실패 이력으로 남기고44확인과 분리한다. npm·의존성 검사 실패는 유지하며 strict의 소스 hash 부재를 명시한다. 증거 일치 통과가 모든 suite 통과나 전체 제품 완료를 뜻하지 않는다.

### 직접 본 화면과 미해결 부담

하위 제외 후 390×844 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/child-removed-390x844-1789386667215.png`), 375×812 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/child-removed-375x812-1789386667527.png`), 844×390 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/child-removed-844x390-1789386667774.png`), 1024×768 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/child-removed-1024x768-1789386668515.png`), 1440×900 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/child-removed-1440x900-1789386668775.png`)을 모두 직접 확인했다. 가로 넘침0이며 비교/복원 경로는 남지만 보존 안내가 반복되고 가로 화면에서 아래 행동까지 세로 스크롤이 필요하다. 실행 제외 상태의 `0/0개 완료`와 빈 수정 영역은 별도 정리가 필요하다.

1440px 개인65% (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/tail-later-65-1440x900-1789387192366.png`)와 390px 구성Undo 후 (로컬 전용 근거: `../../../output/playwright/integrated-program-map-child-removal/tail-membership-undone-390x844-1789387286938.png`)도 직접 보았다. 진행 저장28,331ms·구성Undo27,763ms는 이 실행의 클릭부터 관찰 완료까지 시간이다. 제품 계산과 병렬 검증 부하의 기여를 아직 분리하지 않았으며 성능 통과로 판단하지 않는다. 두 동작을 중복 실행하지 않고 마지막 성공 상태를 보존했다.

새 하위 Flow·빈 Map 전체 수용, 하위 전체 제외의 반복 회차 브라우저 증거, 실제 기기·외부 갱신·관찰 사용자 검증은 남는다. 일반 하위 Flow와 자동 반복 모델 검사를 같은 실행 완료로 합산하지 않는다.

### 응답 지연의 읽기 전용 원인 분석

재현 진단 (로컬 전용 근거: `../../../output/integrated-product-poc/map-child-performance-diagnostic-2026-09-14T12-13-27-287Z.json`)은 같은 원래revision2의 복제 자료로19개 구간을 각2회 측정했다. JSON 파싱0.77~0.87ms, 원본 구성 검증123~134ms, legacy view1.62~1.67초, Map 계획 읽기5.37~5.39초였다. 완전히 복원된 optional 구성 이력만 뺀 별도 복제본은 기존 validator를 통과했고 계획 읽기 약100ms였다. 이 복제본을 앱에 저장하거나 제품 최적화로 적용한 것은 아니다.

메모리 저장소에서 이미 관측된 개인 기록 결과를 controller에 전달하는 데0.62~0.64초, 실제 구성Undo에1.18~1.19초가 걸렸다. 실제 editor 연산·React/DOM·Web Lock·브라우저 저장을 포함하지 않는다. 176개 소스 hash·원래 fixture/기록 bytes·분리 복제본 불변을 확인했으며 추가 브라우저 쓰기는 없었다. 실행 도구는 program-map-child-performance-diagnostic.mjs (로컬 전용 근거: `../../../scripts/personal-workspace-poc/program-map-child-performance-diagnostic.mjs`)다. 작은 순차 표본·사전 검증/캐시 영향을 명시했다.

주요 원인 후보는 [Map 계획 reader](../../../lib/flow/integrated-poc/program-legacy-map-plan.ts)의 하위별 깊은 view 반복과 [ProgramApp](../../../components/flow/integrated-poc/ProgramApp.tsx)의 방문한 legacy 화면 유지, [계획 화면](../../../components/flow/integrated-poc/ProgramLegacyMapPlan.tsx)의 렌더마다 재계산이다. 저장소 쓰기 자체가28초 걸렸다고 판단하지 않는다. 다음은 분리된 QA 복제본에서 controller 진입→계산→setItem→onChange→React commit을 측정하고, 같은 snapshot의 중복 계산을 줄이되 손상 거절·CAS·readback·미저장 입력 보존을 그대로 검사하는 것이다. 아직 최적화나 개선 후 브라우저 재검사는 수행하지 않았다.

## 이전: 항목 삭제 구현 전 확인한 경계

- `legacy-map-source.ts`는 기존 D1의 실제 snapshot/persistence/bundle factory를 읽는다. 원본 저장소에 쓰거나 공개 판본을 발행하지 않는다.
- `stage-map`은 위 factory만 읽는다. 임의 JSON 업로드나 별도 Map 제작·발행 표면은 없다. `buildSourceBackedFlowMapReviewedVersion`은 개인 사본의 선택 적용이며 새 공개 원본 생산기가 아니다.
- 원본에서 없어진 Item을 수용하면 기존 item revision을 지우지 않고 `retainedItemRefs`에 보관한다. 이 선택이 실제 개인 문서·진행·기간 조회·원본 비교에 어떻게 반영되는지는 확인이 필요하다.
- 없어진 하위 Flow는 현재 source reader가 `null`을 반환한다. 하위 하나의 판본 선택으로 Map의 그룹 수·품질 검토를 바꾸지 않는 보호 계약도 있다. 따라서 하위 Flow 삭제를 항목 삭제 성공으로 대신할 수 없다.

## 이번 실행 순서

1. 실제 factory의 원래 identity와 구조를 그대로 사용해, **별도 테스트 프로세스 안에서만** 항목 삭제 후속 catalog를 시뮬레이션한다. 원래 source 배열은 테스트 종료 시 복원하며 소스 파일·운영 저장 key·브라우저의 기존 자료는 바꾸지 않는다.
2. 기존 `connect-map → stage-map → choice → apply`와 Program controller를 거쳐 보관 기록·사본 identity·기간 실행·재비교·Undo/reload를 확인한다. 낮은 수준의 selector 결과만으로 전체 수용을 통과시키지 않는다.
3. 재현한 결함은 기존 owner 계약에서 고치고 현재 검사와 브라우저 시나리오를 연결한다. 실패·취소·같은 값·충돌의 성공 쓰기0, 채워진 운영 key의 byte 불변을 별도 확인한다.
4. 하위 Flow 삭제는 그룹 전체의 현재 구성과 보관된 개인 소속을 구별하는 원자적 계약이 필요하다. 위 단위의 결과와 독립 검토를 바탕으로 다음 구현을 정하며, Map 전체 삭제/전체 제외 정책은 임의 확정하지 않는다.

## 증거 구분

테스트의 후속 catalog는 가상 원본 변경이다. 실제 D1 factory와 제품 transition을 거치는 수용 시뮬레이션이지 실제 콘텐츠 제작·발행·외부 동기화가 아니다. 기존 가상 과거13→현재14 추가 검사와도 별도다. 실제 외부 새 판본이 없다는 이유로 가능한 로컬 구현·검증을 중단하지 않는다.

## 재현과 수정

| 원래 요구 | 재현한 차이 | 반영 |
| --- | --- | --- |
| 삭제 확인 뒤 원본 비교에서 같은 선택을 요구하지 않음 | 삭제 수용 후 같은 `stage-map`이 다시 review를 만들었음 | 개인 기록용 retained 항목의 이미 확인한 부재는 새 차이에서 제외 |
| 같은 항목의 원본 재등장은 명시 수용 | 같은 내용이라서 `no-source-change`로 거절했음 | 내용이 같아도 보존 상태→원본 연결은 새 선택으로 표시. 수용 후에도 기존 canonical 행과 개인 기록 유지 |
| 기존 payload 읽기·복구 | 새 비교 방식만 적용하면 옛 중복 삭제 review를 손상 데이터로 볼 위험 | 과거 유효한 비교 기록은 읽되 새 삭제 선택으로 재제시하지 않음. 읽기 자동 수정 없음 |
| 과거 삭제 선택과 진짜 새 수정의 혼합 | 독립 검토 뒤 실제 `section-context-conflict` 재현 | 옛 비교에 유효했던 확인 완료 삭제 choice만 무시하고 활성 변경을 적용. 알 수 없는 choice ID는 계속 거절 |
| 개인 문서에서 원본·개인 계획 확인 | 브라우저의 개인 Map 문서에 직접 연결이 없고 설정의 기존 도구를 거쳐야 했음 | 정확한 `savedBindings.documentId/flowRef`에만 문서 작업 진입 추가. 기존 입력 flush·잠금·메뉴 닫기·navigation 경유 |

`retainedItemRefs`는 일반 개인 항목의 자동 보관/실행 중단이 아니다. 이번 일반 항목은 개인 제목·메모·10/05 날짜·35% 기록을 그대로 유지하며 기간 실행에서도 찾을 수 있다. 반복 항목/하위 Flow 삭제의 의미를 이 결과로 대신하지 않는다.

### 자동 검사

새 Map 검사4개, 복합 개인 필드 검사2개, 문서 연결 검사1개를 추가했다. Map4는 실제 factory의 후속 입력을 테스트 프로세스 안에서만 바꾸고 기존 source/controller/재조정 경로를 거친다. 저장 실패·재시도, 운영3개 key byte 불변, reload/전역 Undo, 재등장 수용/원본 Undo, 옛 mixed review와 임의 choice 거절을 확인한다. 가상 작성 복합2는 실제 publish writer의 v1/v2/v3, 개인 다중 필드, 추가75% 기록, 부분 수용, quota/CAS/Undo/reload와 출력 payload 검사다. 외부 공개나 실제 파일 다운로드 검사는 아니다.

- 최초 Map 실행의 `day/progressPercent` 단언은 검사 코드의 잘못된 API 가정이었다. 실제 `today`, task 존재와 `progressHistory`를 사용해 수정한 뒤 같은 삭제 재제시/재등장 누락을 각각 재현했다.
- 첫 수정의 관련23개는22통과/partial-mapping 기존1회귀였다. 원문에 연결하지 않은 개인 항목을 삭제 확인으로 취급하지 않도록 분리했다.
- 다음24/24, 혼합 review 재현1실패, 수정 후 Map/기존 원본/UI/복합 개인4파일27/27, 새 문서 연결 포함 메뉴5/5를 확인했다. 서로 다른 실행 수를 요구 충족률로 합산하지 않는다.
- 첫 전체 검사161파일1577/1577과 f-bu build는 문서 연결 추가 전이다. 최종판의 전체 검사와 브라우저 결과를 별도로 기록한다.

### 브라우저 진행

기존 여행 프로필은 수정/초기화하지 않았다. 새 `program-map-removal` 프로필은 통과한 실제 transition 시뮬레이션의 pending review와 운영3개 테스트 key로만 시작한다. QA seed는 제품 쓰기 수와 구분한다.

첫 setup은 hash-only 이동이 init script를 실행하지 않은 검사 준비 오류로 멈췄다. 같은 저장 자료를 다시 쓰지 않고 reload한 `map-removal-setup-resume-2026-09-14T10-17-33-842Z.json`은 준비1확인/쓰기0이다. 첫 시나리오 `map-removal-review-2026-09-14T10-17-58-776Z.json`은 개인 문서에 원본 비교 진입이 없어0확인으로 중단했다. 해당 제품 연결을 추가해 같은 프로필에서 계속한다. 실패 기록을 삭제하거나 완료로 바꾸지 않는다.

전체 목표와 같은 최종판 S01~S10·두 전체 평가/개선 루프는 진행 중이다. 운영 변경·commit/push/PR/merge/Preview/Production/외부 게시·관찰 사용자 증거를 추가하지 않았다.

## 캡처 평가와 반복 항목의 추가 결함

`BPliI9nSeCm8Yb-G6H5C0`의 `map-removal-final-2026-09-14T10-23-43-837Z.json`은 일반 항목 삭제·재등장·원본 Undo/reload를 29확인으로 마쳤다. revision0→5, 실패 setItem1/성공5, 허용 밖0, 운영 테스트3개 key byte 동일, page/console 오류0이다. 최종 통합161파일1578/1578·strict360/build와 npm2031실행/2030통과/기존 출처기한1실패는 이 시점 결과다.

5크기 캡처를 직접 보니 내용이 같은 재등장 항목의 제목이 비교에서 빠져 선택 버튼만 남아 있었다. 가로 넘침0과 radio hit test 통과만으로 UX 충족이라 하지 않는다. 대상 제목과 `원본 연결` 전후 상태를 표시하고, 원본 부재를 ‘일반 항목으로 전환’이라 표시하지 않도록 수정했다. 아래2pi 후속 캡처에서 제목 표시를 확인했다.

실제 ALLBLANC no-jump의 화목 규칙·원래 Item ID를 사용한 새 반복 삭제 검사2개는 처음0/2였다. 원본 삭제 수용 때 저장 완료와 개인10/03 이동 기록은 보존됐지만 `legacy-series-item` 행이 매핑되지 않은 일반 metadata 행으로 바뀌었다. 같은 원본의 재등장 수용도 `ordinary-kind-record-missing`으로 거절됐다.

원인은 원본 소속 부재와 일정 종류 변경을 같은 context 유무로 판정한 것이었다. `projectProgramLegacySource`는 보관된 원래 종류·행 ID를 위한 source context를 유지하고, 공통 `programLegacyExecutionContexts`는 실행 reader 두 곳에서 명시 삭제 수용된 structured Item을 제외한다. 새 일반 실행을 만들거나 보관된 반복을 자동 활성화하지 않는다. 과거 회차·개인 날짜·완료는 별도 owner에 남고, 실제 같은 원본을 명시 재수용하면 원래 회차 identity를 사용한다. 운영 schema·source factory·일정 writer를 바꾸지 않는다.

수정 후 반복2와 기존 lifecycle/bridge15의 17/17을 확인했다. 실제 영상 제작·외부 업데이트·실기기 검사로 표시하지 않는다.

### 마지막 검증 체크포인트 — 2026-09-14 10:59 UTC

`2piRdj2CpopHoK-QOpqKi`는 마지막 검증판이다. 이후 하위 Flow 전체 삭제를 편집 중인 소스의 전체 통과를 뜻하지 않는다. 통합163파일1587/1587·skip0 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-14T10-44-47-836Z.json`)은10:51:46 UTC에 끝났고 strict363/진단0·build 통과 (로컬 전용 근거: `../../../output/integrated-product-poc/build-2026-09-14T10-44-38-107Z.json`)를 확인했다. npm2031중2030통과/기존 출처기한1실패 (로컬 전용 근거: `../../../output/integrated-product-poc/npm-test-2026-09-14T10-46-31-168Z.json`), 승인201/201·공개19/19를 구분한다. 393소스·16대조 (로컬 전용 근거: `../../../output/integrated-product-poc/map-removal-crosscheck-2026-09-14T10-59-10-111Z.json`)는 고정된 검사/build/실행 증거의 일치를 확인했다.

- 같은 재등장 제목 UI14 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-reappearance-ui-final-2026-09-14T10-48-18-241Z.json`): 기존revision5 유지,5크기 읽기·초점·Escape·쓰기0. 대상 제목과 원본 연결 전후 상태를 확인했다.
- 반복 삭제23 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-recurrence-removal-final-2026-09-14T10-49-15-959Z.json`): revision0→5, quota1실패 뒤 성공쓰기5, 삭제 수용·같은 원본 재등장·원본Undo/reload와 보존 기록 대조. 일반29는 앞선BPli의 결과로 유지한다.
- 두 실행 각각 운영 테스트3개 key byte 동일·허용 밖쓰기0·page/console오류0이다. 서로 다른 실행을 한 사용자 여정이나 전체 개선 루프 수로 합산하지 않는다.

1024px 재등장 비교 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-reappearance-title-1024-1789382910955.png`), 375px (로컬 전용 근거: `../../../output/playwright/integrated-program/map-reappearance-title-375-1789382910493.png`), 844px 가로 화면 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-reappearance-title-844-1789382910737.png`)을 확인했다. 제목은 보이지만844px에서 적용 행동까지 세로 스크롤이 필요하고 원본 메타데이터가 길다. 반복1280px 캡처 (로컬 전용 근거: `../../../output/playwright/integrated-program/map-recurrence-removal-restored-1789382984661.png`)는 원본 비교 화면이며 완료 기록의 가시성 증거는 아니다. 보고서 HTML은 기존 URL 보안 정책 차단으로 렌더 미실행이며 앱 캡처·정적 검사와 구별한다.

## 전체 검증으로의 연결

개별 수정을 전체 두 루프 완료로 세지 않는다. [동일 최종판 실행표](final-whole-loop-plan.md)는 누적 프로필을 지우지 않고 S01~S10을 하나로 연결하며 두 번째 목적·내용 구조를 따로 배정한다. 원본 Map의 하위 Flow 삭제는 원래 그룹과 개인 보존 소속을 구별하는 별도 계약이 필요하다. 전체 package reader/비교 준비와 실제 transaction/UI 연결을 분리해서 판정한다.
