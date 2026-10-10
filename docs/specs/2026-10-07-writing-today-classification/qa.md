# 변경 영향 검증

검사 판본은 detached76e833 위 Q2 소유 변경과 이번 기본 화면 변경을 합친 별도 로컬 후보다. 새 Next 빌드는 `uWmRSNxz034E_ORjuCZQ5`다. Q2의 통과 수를 이번 검사에 합산하지 않았다.

## 소스·타입·빌드

- ProgramSpace 영향 검사 8파일 74/74 PASS: 기본 이동, capabilities, core personal journey, date roundtrip, detail UX, private schedule, source mount focus, writing focus. 전환 전 입력 flush 실패 시 현재 보기/필터를 유지하고, 쓰기 전환에서 글을 생성하지 않는 조건을 포함한다. 새 기본 이동에서 불필요한 강제 초점 이동을 제거하고, Item 분류를 제공하지 않는 기존 collectionMode의 all 보기는 ‘전체 할 일’로 유지했다. 최종 실행 도구 chunk `8b670a`, exit0.
- 날짜·native 표시 영향 검사 6파일 51/51 PASS: 새 date presentation과 active paint, composition visibility, reading wrap, blur visibility, text input engine. 선언된 예정일과 실제 진행 기록일을 구분하며, 활성 편집/IME 줄의 raw/native 표시는 보존한다. 담당 실행 chunk `ad6f50`, exit0. 별도 파일 로그는 생성하지 않았으며 원 실행 출력과 소스 핀을 원장에 연결한다.
- 제품 표적 타입 검사: 612 entry files, 687 source hashes, diagnostics0/sourceChanged0. 파일 근거는 `output/integrated-product-poc/targeted-types.json`이다.
- `npm.cmd run build`: PASS. Next 빌드 `uWmRSNxz034E_ORjuCZQ5`. 소스는 브라우저 bundle manifest의 제품 source 핀과 대조한다.
- 전체 npm test·광역 E2E·구 Alpha/CI·보안 검사는 반복하지 않았다. 변경된 전환/메뉴/날짜 표시와 영향 있는 기존 입력·초점 경계만 확인했다.

## 브라우저에서 수행한 과업

실행 대상은 실제 제품 컴포넌트와 기존 controller를 묶은 가상 탭 저장 host `http://127.0.0.1:3133`이다. Next 서버·실제 로그인·서버 동기화가 아니다. Playwright CLI의 별도 빈 Chromium context를 사용했다.

1. 이름·보관 위치를 고르지 않고 바로 쓴 한 글에 일반 메모와 가상 업무/생활 할 일 두 개를 작성했다.
2. 기존 항목 동작으로 업무/생활 분류와 10/07 예정일을 지정했다. 오늘에서 회의를 10/08로 미루고 장보기를 완료했다.
3. 분류에서 날짜가 달라진 회의와 완료한 장보기를 각각 다시 찾았다. 원문으로 돌아와 같은 글에 이어 썼다.
4. 명시적으로 비교 메모 글 한 개를 만들고 회의 항목에만 연결했다. 원래 할 일은 두 개이며 연결 줄을 새 canonical Item으로 세지 않았다.
5. 데스크톱 1280×900과 390×844에서 이동·문서 찾기·연결 메모 열기를 수행했다. 390px에서도 가상 항목을 기존 컨트롤로 오늘/미완료 상태에 되돌린 뒤 미루기·완료를 직접 수행하고 같은 글에 이어 썼다. 실제 휴대폰 검사는 아니다.
6. 원문 보기/닫기, 예정일 버튼의 키보드 활성화·Escape 취소, native textarea 입력 후 Ctrl+Z를 확인했다. 임시 입력은 원래 raw로 복원됐다.
7. 이동과 새로고침 전후 글 ID/raw, Item ID, 분류, 예정일, 진행 기록, 연결 관계를 대조했다. 글 두 개(원래 글+명시 비교 메모), canonical Item 두 개, 추가 사본0. 마지막 모바일 이어쓰기 이후에도 같은 결과가 유지됐다.

메모 재진입은 기존 ‘더보기 → 문서 목록’ 경로다. 새로고침 뒤 마지막 기록된 편집 위치의 원래 글이 열렸으므로, 그 화면을 메모 화면이라고 세지 않고 별도 보존했다. 이후 같은 메모를 정상 목록에서 재열어 제목·native textarea 본문 일치와 전체 canonical 데이터 무변경을 확인했다(chunk `0444e5`). `memo-reentry-result.json`과 최종 메모 캡처를 연결했다.

쓰기·오늘·분류·문서 관리 네 상태의 실제 DOM 너비를 측정했다. 데스크톱은 client/scroll 모두1280이고, 모바일은390/390(문서 관리의 세로 스크롤바가 생긴 상태는375/375)이며 보이는 요소의 가로 넘침0이다. 예정일 버튼은88×44이고 현재 보기 aria-current, 분류 selector, 예정일/진행 기록 문구를 확인했다. 콘솔 오류0, 실제 계정/서버 쓰기0.

## 초기 실패와 최종 판정

- 첫 소스 실행은74개 중41개가 테스트 harness의 새 RAF 의존으로 실패했다. 독립 검토에서 기본 이동의 강제 초점 이동 자체가 불필요하다고 확인해 제거했고 최종74개가 통과했다. 이를41개 제품 결함으로 세지 않는다.
- 날짜 새 검사 첫 실행50/51: fixture가 기존 모델에서 거절하는 고아 날짜 행을 저장됐다고 가정했다. 미커밋 metadata를 파싱하는 입력으로 바로잡아 최종51/51. 제품 보호 조건은 유지했다.
- 첫 여정의 마지막 판정은 canonical task에 없는 percent 필드를 사용했다. 실제 UI 동작 후 readonly 판정을 done+progressRecords로 고쳤으며 이미 수행한 변이는 반복하지 않았다.
- 날짜 버튼이 뷰포트 밖인 상태와 이미 닫힌 패널에 대한 selector 때문에 중간 UI 검사가 실패했다. 실제 초점/스크롤/열림 상태를 정상 조작으로 맞춰 남은 검사만 확인했다.
- 모바일 여정은 편집기 presentation 겉면을 클릭하려다가 native textarea가 입력을 받는 구조에서 멈췄다. 오늘·분류 동작은 끝난 상태를 보존하고 textarea에 초점을 둔 뒤 이어쓰기/메모/reload만 계속했다. 최종 실행 chunk `583904`, exit0.
- Windows CLI의 복잡한 inline 인자가 실패한 원문은 `cli-inline-syntax-first-failure.txt`로 보존했다. 이후 코드는 파일로 실행했다. `fullPage` 캡처의 세로 스크롤바 폭 문제는 실제 DOM overflow와 구분하고 최종 모바일 캡처는390×844 viewport로 만들었다.
- 첫 docs:check는 이번 코드가 아니라 인수한 Q2 결과 문서의 과거 output 링크5개가 새 작업본에 없어 실패했다. 원 Q2의 캡처4개와 closeout을 동일 SHA로 복사해 역사 근거를 연결했다. 원 Q2 파일이나 과거 문서 내용은 바꾸지 않았다.

첫 실패·중간 출력과 최종 PASS는 `output/playwright/writing-today-classification/cli-raw-results.json` 및 모바일 결과 파일에 분리해 보존한다. CLI 출력이 `### Error`를 반환한 경우 shell exit0만으로 PASS 판정하지 않았다.

## 미실행·한계

서버 분류 저장·실계정·실제 휴대폰·OS 한글 입력기·처음 쓰는 사용자 관찰·Alpha 적용은 NOT_RUN이다. composition/native 소스 회귀와 Chromium 키보드 검사는 OS IME 증명이 아니다. 날짜 속성을 직접 편집하거나 선택/IME가 걸린 줄에서는 커서·선택을 지키기 위해 TXT가 일시적으로 보인다. 나머지 일반 표시와 명시 원문 모드의 차이를 결과에 남겼다.
