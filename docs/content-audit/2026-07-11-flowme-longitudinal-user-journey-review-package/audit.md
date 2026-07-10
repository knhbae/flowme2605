# FlowMe 종단 사용자 여정 Audit

## 감사 성격

이 문서는 실제 사용자 조사 결과가 아니다. P21 final package의 screenshot과 route-evidence를 6개 가상 페르소나의 다회차 사용 상황에 배치한 휴리스틱 시뮬레이션이다. 따라서 `확인됨`은 현재 자동화/시각 evidence 안에서의 확인이며, 시장 수요나 실제 습관 형성을 뜻하지 않는다.

## 전체 Lifecycle

| 단계 | 현재 상태 | 판단 |
| --- | --- | --- |
| 발견 | 확인됨 | 홈 URL/메모 진입과 public 공유 진입이 존재한다. |
| Flow 변환 | 확인됨 | URL hit와 miss 결정론적 초안이 분리된다. |
| 저장 | 확인됨 | public, source-backed, draft 모두 My Flow 저장 경로가 있다. |
| 개인화 | 확인됨 | 기준일, 제목, 항목 날짜, 메모 overlay가 있다. |
| 실행 | 확인됨 | My Flow는 할 일, Calendar는 날짜 중심으로 실행한다. |
| 완료 | 확인됨 | 행 왼쪽 완료 체크와 완료 취소가 있다. |
| 재방문 | 부분 지원 | 동일 브라우저 로컬 상태와 오프라인 행동은 확인했지만 계정 간 연속성은 없다. |
| 리뷰 | 미구현 | 완료 후 유용성·정확성·만족도를 남기는 사용자 표면이 없다. |
| 수정 요청 | 미구현 | 개인 수정과 원본/제작자 개선 요청을 분리한 경로가 없다. |
| 재사용 | 부분 지원 | 기존 draft 재사용은 되지만 버전 업데이트·반복 사용 성과는 충분히 증명되지 않았다. |

## 예비 Findings

1. **[High] 실행 뒤 리뷰·수정 요청 loop가 비어 있다** — 발견→저장→개인화→실행→완료는 연결되지만 완료 경험을 콘텐츠 개선으로 되돌리는 사용자 표면이 없다.
2. **[High] 개인 수정과 원본 개선의 소유권 경계가 UI에 없다** — personal overlay는 강하지만 사용자가 틀린 원본을 발견했을 때 자기 사본만 고칠지 제작자에게 요청할지 선택할 수 없다.
3. **[High] export는 생성되지만 외부 도구 왕복 실행은 evidence 밖이다** — Calendar·시트·메모 파일 생성은 검증됐지만 실제 import, 사용, 완료, FLOW 재진입은 시뮬레이션되지 않았다.
4. **[Medium] 동일 브라우저 재방문은 되지만 계정·기기 연속성은 없다** — 오프라인 로컬 행동은 강점이지만 상용 반복 사용에서 기기 변경과 저장 손실 복구가 정의되지 않았다.
5. **[Medium] Studio의 보조 역할과 향후 발행 역할 사이가 비어 있다** — 초안 선반은 유용하지만 사용자에게 공개·버전·리뷰를 약속하지 않는 현재 경계를 유지할지 결정이 필요하다.

## 이사 준비 사용자

- **상황:** 한 달 뒤 이사를 앞두고 검색한 원문을 자기 일정으로 바꾸려는 모바일 중심 사용자
- **목표:** 이사일을 기준으로 준비 항목을 저장하고, 일부 날짜와 메모를 자기 상황에 맞춰 바꾼 뒤 매일 실행한다.
- **예비 판단:** 핵심 실행 loop는 연결되지만 완료 후 평가·원본 수정 요청이 끊긴다.

### 세션 1 · 발견과 기준 설정 (이사 30일 전)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 홈에서 URL/메모 진입 찾기 | Flow 찾기 입구를 첫 화면에서 찾는다. | URL이나 메모로 Flow 찾기 입구가 추천보다 먼저 보인다. | 01-home-mobile |
| 확인됨 | 이사 원문 URL로 준비된 Flow 찾기 | 기존 준비가 있으면 재사용 가능한 결과를 기대한다. | canonical hit 결과가 준비된 Flow로 연결된다. | 27-url-first-hit-mobile |
| 확인됨 | 시작일이 아닌 이사일로 일정 맞추기 | 입력 날짜가 무엇을 뜻하는지 알고 싶다. | 이사일 라벨과 D-30 일정 설명이 보인다. | 28b-url-first-moving-custom-start-mobile |

### 세션 2 · 저장 직후 개인화 (같은 날)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | My Flow에 저장됐는지 확인 | 저장 완료와 다음 행동을 바로 확인한다. | post-save 확인과 첫 실행 항목이 같은 실행 허브에 나타난다. | 13-post-save-my-moving-mobile |
| 확인됨 | 이사일과 이름 다시 바꾸기 | 한 번 정한 전체 기준일을 다시 바꾸고 싶다. | Flow 전체 기준일·이름 수정 입구가 보인다. | 13b-my-moving-personal-anchor-settings-mobile |
| 확인됨 | 한 할 일만 날짜와 메모 바꾸기 | 전체 일정은 유지하고 한 항목만 늦춘다. | 항목 날짜 override와 제목·날짜·메모 수정 입구가 분리된다. | 13c-my-moving-personal-step-date-override-mobile |

### 세션 3 · 실행, 완료, 회고 (며칠 뒤)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | Calendar에서 오늘 일정 실행 | 수정한 날짜에 맞춰 할 일을 확인한다. | 날짜 agenda와 Flow 구분 marker가 저장 상태를 읽는다. | 14-calendar-after-moving-save-mobile |
| 부분 지원 | 완료 후 다시 열고 완료 취소하기 | 실수로 완료했을 때 되돌리고 싶다. | 완료 0개 남음과 완료 취소 패턴은 확인됐지만 이사 Flow의 연속 장면은 별도 캡처가 없다. | 48-draft-completed-zero-mobile |
| 미구현 | 이 Flow가 실제로 도움됐는지 리뷰 남기기 | 완료 경험과 빠진 준비를 남기고 싶다. | 완료 뒤 유용성·만족도·한줄 리뷰 입력 표면이 없다. | 없음 |
| 미구현 | 틀린 날짜나 준비 항목 수정 요청 | 개인 수정과 별개로 원본 개선을 요청하고 싶다. | 개인 overlay는 있으나 원본/제작자에게 보내는 수정 요청 경로가 없다. | 없음 |

## 준비된 Flow가 없는 사용자

- **상황:** 검색 중 찾은 낯선 URL이나 개인 메모를 바로 실행 가능한 초안으로 바꾸려는 사용자
- **목표:** miss 상태에서도 앱 밖으로 나가지 않고 초안을 저장·수정·실행하고, 품질 문제를 나중에 피드백한다.
- **예비 판단:** 초안 생성부터 실행까지 가장 길게 연결됐지만 품질 회고와 실제 AI 경계가 다음 과제다.

### 세션 1 · miss와 초안 준비 (첫 방문)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 준비된 Flow가 없음을 이해 | 찾지 못했을 때 다음 선택지를 알고 싶다. | miss가 요청 저장과 초안 준비 흐름으로 이어진다. | 29-url-first-miss-candidate-form-mobile |
| 확인됨 | 요청 제목·메모와 원 URL 확인 | 내가 남긴 요청을 다시 확인하고 고친다. | candidate detail에서 제목·메모·원 URL을 확인한다. | 30-url-first-candidate-detail-mobile |
| 확인됨 | 3개 이상 실행 항목 초안 확인 | 빈 placeholder가 아니라 손볼 수 있는 시작점을 기대한다. | 결정론적 제안 항목과 기준일 날짜가 보인다. | 45-draft-save-failure-mobile |
| 의도적 보류 | 실제 AI 자동 생성 기대 관리 | 자동 생성인지 수동 초안인지 알고 싶다. | 현재는 결정론적 초안이며 live AI로 과장하지 않는다. | 29-url-first-miss-candidate-form-mobile |

### 세션 2 · 저장, 수정, 투영 (같은 날)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | Studio 초안 선반에서 다시 찾기 | 저장한 초안을 잃지 않고 다시 찾는다. | Studio 초안 탭에 같은 draft가 보인다. | 39e-url-first-draft-studio-shelf-mobile |
| 확인됨 | 항목 제목·날짜·메모 수정 | 제안 항목을 내 말과 날짜로 고친다. | 항목별 편집 입구와 사용자 메모가 있다. | 39a-url-first-draft-item-edit-entry-mobile |
| 확인됨 | Flow 전체 기준일 다시 계산 | 전체 날짜를 한 번에 이동한다. | 기준일 변경과 개별 override 유지 정책이 보인다. | 39b-url-first-draft-anchor-edit-mobile |
| 확인됨 | Calendar와 export가 수정본 읽기 | 수정한 결과가 모든 목적지에서 같기를 기대한다. | Calendar와 export projection evidence가 연결된다. | 39d-url-first-draft-calendar-export-mobile |

### 세션 3 · 실패 복구와 반복 사용 (며칠 뒤)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 저장 실패 뒤 입력 보존과 재시도 | 실패해도 작성한 내용을 잃지 않는다. | 입력 보존, 오류 설명, 재시도 행동이 있다. | 45-draft-save-failure-mobile |
| 확인됨 | 같은 URL 중복 저장 방지 | 같은 초안을 여러 개 만들지 않고 기존 것을 연다. | 중복 생성 없이 기존 My Flow 초안으로 이어진다. | 46-draft-duplicate-mobile |
| 확인됨 | 모든 항목 완료 후 상태 확인 | 남은 일이 0임을 이해하고 필요하면 되돌린다. | 전체 완료, 남은 0, 완료 취소 가능 상태가 보인다. | 48-draft-completed-zero-mobile |
| 확인됨 | 이미 연 화면에서 오프라인 로컬 행동 | 네트워크가 끊겨도 현재 체크를 이어간다. | 이미 열린 My Flow의 로컬 완료 행동이 유지된다. | 49-draft-offline-local-action-mobile |
| 미구현 | 초안 품질과 빠진 항목 피드백 | 초안이 유용했는지와 틀린 부분을 남긴다. | draft 품질 리뷰나 개선 요청의 사용자 경로가 없다. | 없음 |

## 공유 Flow를 받은 사용자

- **상황:** 메신저나 검색 결과로 public /f 링크를 열고 저장 여부를 빠르게 판단하는 사용자
- **목표:** 원문과 실행 항목을 신뢰할 수 있는지 보고 통째로 저장하거나 export한 뒤 개인 실행으로 전환한다.
- **예비 판단:** 저장 전후 경계는 명확해졌지만 개인 수정·외부 도구 왕복·콘텐츠 리뷰 연결이 부족하다.

### 세션 1 · 공유 링크 평가 (처음 링크를 받은 순간)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 저장 전 Flow 전체 가치 판단 | 무엇을 받게 되는지 먼저 본다. | 공유 shell이 저장/setup을 첫 행동으로 둔다. | 06-public-vehicle-mobile |
| 확인됨 | 저장 전 항목 preview 확인 | 체크가 완료가 아니라 포함 preview임을 이해한다. | 저장 전 선택과 저장 후 완료가 분리된다. | 07-public-moving-mobile |
| 확인됨 | Flow 단위 export 형식 판단 | 전체 Flow를 Calendar·시트·메모로 가져간다. | export는 본문 secondary이며 sticky 저장보다 뒤에 있다. | 08-public-moving-bottom-mobile |

### 세션 2 · 저장 후 개인 실행 (저장 직후)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | My Flow 완료 체크 활성화 | 저장 뒤 preview가 실제 실행 상태로 바뀐다. | 같은 콘텐츠가 row-left 완료 체크 패턴으로 전환된다. | 12b-public-new-car-post-save-my-flow-mobile |
| 확인됨 | 원문 근거와 세부 확인 | 항목을 실행할 때 출처 맥락을 다시 본다. | 반복 source link 없이 공통 source 접근과 항목 detail이 유지된다. | 25-workbench-new-car-open-details-mobile |
| evidence 부족 | 공유 Flow를 내 상황에 맞게 수정 | 저장한 공개 Flow도 제목·날짜·메모를 고치고 싶다. | overlay 모델은 있으나 public 저장 직후 같은 Flow를 편집하는 종단 capture가 없다. | 없음 |
| evidence 부족 | 외부 Calendar/메모에서 실제 사용 | 내보낸 파일이 목적지에서 실사용 가능한지 확인한다. | export 생성은 검증됐지만 외부 도구 import·실행·재진입은 package가 증명하지 않는다. | 없음 |

### 세션 3 · 재방문과 신뢰 피드백 (실행 후)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 부분 지원 | 저장한 Flow 다시 이어서 실행 | 공유 링크가 아니라 내 실행 기록으로 돌아온다. | 로컬 재방문은 가능하지만 계정·기기 간 연속성은 없다. | 49-draft-offline-local-action-mobile |
| 미구현 | 공유 Flow 유용성 리뷰 | 다른 사용자와 제작자에게 도움이 된 정도를 남긴다. | public Flow 리뷰 표면이 없다. | 없음 |
| 미구현 | 틀린 항목이나 원문 불일치 신고 | 잘못된 실행 항목을 원본 개선 요청으로 보낸다. | 개인 수정과 콘텐츠 오류 신고를 분리한 경로가 없다. | 없음 |

## 여러 Flow를 동시에 쓰는 직장인

- **상황:** 이사·여행·공부 준비가 겹쳐 오늘 할 일과 같은 날짜 여러 Flow를 함께 관리하는 사용자
- **목표:** 복잡한 목록에서도 오늘 할 일을 먼저 끝내고 Calendar에서 Flow를 구분해 날짜를 조정한다.
- **예비 판단:** 밀도와 구분은 개선됐지만 대량 관리, 일괄 정리, 장기 회고 evidence가 약하다.

### 세션 1 · 여러 Flow 저장 후 우선순위 확인 (월요일 아침)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 오늘·지난·다음 큐에서 지금 할 일 찾기 | 몇 번 들어가지 않고 오늘 일을 본다. | 오늘 1프레임과 inline 완료가 우선한다. | 16-my-multi-queue-mobile |
| 확인됨 | 5개 이상 저장 목록 훑기 | 저장한 Flow가 많아도 마지막 항목까지 접근한다. | 긴 목록 top/bottom과 fixed nav clearance가 확보된다. | 18-my-long-list-top-mobile, 20-my-long-list-inventory-bottom-mobile |

### 세션 2 · 같은 날짜 여러 Flow 실행 (일정이 겹친 날)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 월간 grid에서 3~5개 Flow 구분 | 날짜 셀은 compact하게 보고 전체는 agenda에서 본다. | 주요 2개 marker와 외 N개 요약이 보인다. | 43b-calendar-grid-flow-stack-mobile |
| 확인됨 | 선택일 agenda에서 전체 Flow 확인 | 같은 날짜 모든 Flow와 할 일을 본다. | Flow별 group과 전체 항목이 표시된다. | 43-calendar-same-date-multi-flow-mobile |
| 확인됨 | wide 화면에서도 밀도 유지 | 데스크톱에서 날짜와 agenda를 동시에 비교한다. | grid와 agenda 2열이 overflow 없이 유지된다. | 44b-calendar-grid-flow-stack-wide |

### 세션 3 · 밀린 일 복구와 장기 관리 (일주일 뒤)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 지난 할 일 중복 없이 열기 | 밀린 일만 모아 다시 처리한다. | overdue sheet가 중복 row 없이 열린다. | 17-my-multi-queue-overdue-sheet-mobile |
| 부분 지원 | 한 항목 날짜만 이동 | 다른 Flow 일정은 건드리지 않고 한 일만 미룬다. | 항목 date override는 확인됐지만 다중 Flow 전환 장면은 별도 evidence가 없다. | 13c-my-moving-personal-step-date-override-mobile |
| 부분 지원 | 출근길 오프라인 완료 체크 | 이미 연 목록에서 체크를 이어간다. | 로컬 행동은 되지만 동기화·충돌 복구는 없다. | 49-draft-offline-local-action-mobile |
| evidence 부족 | 끝난 Flow 정리와 성과 회고 | 완료한 Flow를 보관하고 다시 쓸지 판단한다. | 완료 0 상태는 있으나 archive/reuse history 종단 evidence가 없다. | 없음 |
| 미구현 | 장기 사용 후 개선 의견 남기기 | 어떤 부분이 반복해서 불편했는지 남긴다. | 사용 경험 리뷰 경로가 없다. | 없음 |

## 학습·워크시트 반복 사용자

- **상황:** 교재나 학습 자료를 저장해 매일 조금씩 공부하고 진행 맥락을 확인하는 사용자
- **목표:** 날짜가 없거나 반복되는 학습 항목을 부담 없이 저장하고, 진행 숫자의 의미를 이해하며 다시 공부한다.
- **예비 판단:** 저장과 기본 실행은 가능하지만 반복 재사용·학습 기록·피드백의 종단 evidence가 적다.

### 세션 1 · 학습 콘텐츠 선택과 저장 (학습 시작일)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 학습 Flow 구조와 원문 확인 | 교재 범위가 실행 항목으로 옮겨졌는지 본다. | source-backed 학습 Flow Map이 저장 경로를 제공한다. | 05-flow-map-math-mobile |
| 확인됨 | 날짜 없는 학습 Flow My Flow 착지 | 캘린더 강제 없이 바로 공부 항목을 본다. | undated content가 My Flow 할 일 중심으로 저장된다. | 15-post-save-my-math-mobile |

### 세션 2 · 공부와 진행 확인 (다음 날)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 학습 항목 inline 완료 | 상세를 열지 않고 공부한 항목을 체크한다. | 완료 control은 checkbox 한 종류로 유지된다. | 15-post-save-my-math-mobile |
| 부분 지원 | 진행 숫자의 범위 이해 | 전체 진도와 확인 항목 진도를 구분한다. | 진행 숫자 맥락화 marker는 있으나 장기 학습 변화 화면은 제한적이다. | 15-post-save-my-math-mobile |

### 세션 3 · 반복 학습과 개선 (일주일 뒤)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| evidence 부족 | 학습 제목·날짜·메모 수정 | 내 교재 표현과 복습일로 바꾼다. | overlay 모델은 공통이지만 학습 Flow 편집 장면이 package에 없다. | 없음 |
| evidence 부족 | 다음 단원이나 다음 주에 재사용 | 완료 기록을 남기고 같은 구조를 다시 쓴다. | 반복 복제·새 주기 시작·이전 기록 비교가 증명되지 않는다. | 없음 |
| 미구현 | 학습 결과와 틀린 구조 피드백 | 이해가 안 된 부분과 잘못 나눈 단원을 남긴다. | 학습 결과 리뷰나 콘텐츠 수정 요청 경로가 없다. | 없음 |

## 제작·수정에 관심 있는 사용자

- **상황:** 자기 초안을 정리하고 다른 사람에게 공개할 수 있는지 확인하려는 보조 Studio 사용자
- **목표:** 초안을 다시 찾고 수정한 뒤, 향후 공개·버전 업데이트·사용자 피드백 반영 가능성을 판단한다.
- **예비 판단:** 초안 선반과 공개 profile은 있지만 제작→발행→리뷰→개정 loop는 아직 제품 경계 밖이다.

### 세션 1 · Studio와 공개 profile 이해 (첫 제작 시도)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | 내 Studio를 보조 표면으로 열기 | 5번째 탭이 아닌 제작 보조 공간임을 이해한다. | filled Studio가 모바일에서 접근 가능하다. | 39-creator-profile-my-flow-studio-mobile |
| 확인됨 | 공개 creator profile 확인 | 공개 콘텐츠와 개인 실행 공간을 구분한다. | public creator profile이 별도 사용자 표면으로 보인다. | 41-creator-profile-flow-curation-team-mobile |

### 세션 2 · 초안 재발견과 수정 (며칠 뒤)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 확인됨 | URL-first draft를 초안 탭에서 찾기 | 예전에 만든 초안을 다시 연다. | Studio draft shelf에 local draft card가 나타난다. | 39e-url-first-draft-studio-shelf-mobile |
| 확인됨 | 같은 My Flow 편집 방으로 이동 | 별도 에디터가 아니라 검증된 수정 모델을 쓴다. | Studio card가 My Flow item edit path로 이어진다. | 39a-url-first-draft-item-edit-entry-mobile |

### 세션 3 · 공개, 리뷰, 개정 (공개를 고려할 때)

| 상태 | 전환 | 사용자 기대 | 현재 관찰 | evidence |
| --- | --- | --- | --- | --- |
| 미구현 | 개인 초안을 공개 Flow로 발행 | 검토 후 공개 링크를 만든다. | 사용자용 publish/version gate가 없다. | 없음 |
| 미구현 | 사용자 수정 요청 받기 | 틀린 항목 제보를 원본 개선 요청으로 받는다. | 수정 요청 inbox나 항목 단위 연결이 없다. | 없음 |
| 미구현 | 리뷰에 답하고 새 버전 알리기 | 리뷰를 보고 개정 후 사용자에게 알린다. | 리뷰·답변·changelog·업데이트 알림이 없다. | 없음 |
| evidence 부족 | source-backed 새 버전 적용 | 원본이 바뀌면 개인 수정과 충돌 없이 업데이트한다. | update review 로직 테스트는 있으나 이번 사용자 여정 package의 시각 evidence가 없다. | 없음 |

## Claude Design에 요청할 열린 질문

1. 완료 후 리뷰는 Flow 전체 만족도, 개별 항목 정확성, 실제 실행 결과 중 무엇을 먼저 물어야 하는가?
2. 개인 overlay 수정과 원본/제작자 수정 요청을 어떤 카피와 데이터 경계로 나눌 것인가?
3. 리뷰·오류 신고 입구는 My Flow 완료 상태, 항목 detail, public /f, Studio 중 어디가 가장 자연스러운가?
4. 커뮤니티를 만들지 않고도 가능한 최소 feedback slice는 무엇인가?
5. 외부 Calendar/메모/시트로 export한 뒤 실제 실행과 완료를 FLOW가 어디까지 다시 받아야 하는가?
6. localStorage 기반 재방문을 상용서비스 연속성으로 볼 수 있는가, 계정·기기 동기화가 언제 필요한가?
7. creator/studio를 보조 표면으로 유지하면서도 수정 요청과 버전 개정을 처리할 수 있는가?
8. 실제 AI는 어떤 사용자 행동 데이터와 review gate가 생긴 뒤에 열어야 하는가?

## Release Reading

- 한 기기·한 브라우저의 개인 실행 도구로는 발견→완료까지 조건부 사용 가능하다.
- 상용 반복 서비스로 평가하려면 리뷰/수정 요청, 계정·기기 연속성, 외부 도구 왕복, version update가 더 필요하다.
- 실제 AI, 커뮤니티, Studio 발행 확장은 위 연결을 먼저 결정한 뒤 판단해야 한다.
- Claude Design은 단순 화면 polish가 아니라 가장 먼저 닫아야 할 종단 전환과 P22 acceptance criteria를 제안해야 한다.
- Codex의 독립 평가는 [codex-assessment.md](./codex-assessment.md)에 분리했다. Claude Design은 이를 정답으로 간주하지 말고 screenshot 근거로 동의/반대를 표시해야 한다.
