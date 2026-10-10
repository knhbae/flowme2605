# 확인 범위

합성·실계정 저장, PC390·실물폰, 합성 composition·OS 한글 IME, 자동 검사·사용자 이해도는 별도로 기록한다.

최초 필수: 기존 changePeriod의 입력 flush와 저장 실패 보호 유지, 내비3개 단일 존재·44px 이상·현재 위치, 문서관리/명시원문/Flow/계정 도달, 같은 문서·Item·날짜·메모·완료·원문 유지, 가로넘침 및 겹침 없음. 편집기 textarea/미러 font/line/padding 폭 일치와 선택·Undo 영향 확인. 분류 생성은 기존 폴더 생성 계약을 재사용하며 저장 모델 변경은 하지 않는다.

## 현재 결과

최신 로컬 runtime build `1g2Udjq046ZwyMMpSU6u3`. 기준 HEAD는5e693c65이며 소유 변경은 runtime5파일과 직접 unit1파일이다. 마지막 runtime 수정 뒤 제품 타입613 entry/688 source에서 진단0·source drift0, Next build PASS. 이전 GT4 빌드는 수정 전 이력으로 구분한다.

기존 탐색/날짜/초점/레이아웃22, 편집모드·여정20 추가 고유사례, native paint/composition/blur/reading29, 새 분류 콜백·스타일4: 관련 **75개 고유 사례**가 통과했다. 중복 실행을 더해 고유 사례로 세지 않는다. 실제 한글 IME 시험은 이 순수 composition 모델로 대체하지 않는다.

정상 Chrome 격리 브라우저에서 데스크톱1440×900·390×844의 새 여정과 실패/긴 제목 여정 각2건, 총4 PASS/0 FAIL. 별도 같은 가상 자료의 기존 제공 bundle 전후 비교2건 PASS. Auth/API는 기존 메모리 fixture로 가로채고, 허용 document/static GET만 실제 제공한다. 실제 계정·서버 쓰기0. 390px는 실물폰이 아니다.

화면 확인: 기존3보기 단일 내비·현재 선택·48px 내비, 네이티브 행44px, textarea/미러 font16/line44/padding/width 동일, 가로넘침 없음, 선택 범위·native Undo(non-IME)·원문 모드 왕복, 같은 문서/Item/원문/기존 날짜·메모 보존. 분류 만드는 중 input/submit 잠금·거절 후 입력/접힘 상태 보존·같은 정상 재시도, 긴 상세 제목 제한과 날짜 적용 버튼 도달을 확인했다.

최초 FAIL은 ‘오늘’ 제목2개를 구분하지 못한 검사 선택자와 새 실패검사의 잘못된 접근성 이름이었다. 원 실패 파일을 보존했다. 마지막 캡처 순서를 정리한 실행에서는 QA 포트 선택을 빠뜨려 비어 있는 기본3106 연결 실패4건이 발생했다. 제품 실패로 합산하지 않으며, 원본을 보존하고 정상 지원3107을 명시한 실행4건이 통과했다. 독립 코드 검토에서 응답 대기 중 새 입력 소실과 무제한 sticky 상세 제목 위험2개를 찾아 수정하고 새 회귀로 검증했다.

원자료·가상 본문·캡처는 ignored local `output/playwright/visual-polish/`와 `.tmp/output/playwright/visual-polish/`에만 보존한다. 최종 캡처 순서와 실행 SHA는 local `source-and-qa-ledger-final-capture-3107.json`에 연결한다. 이전 `source-and-qa-ledger.json`은 캡처 순서 수정 후 test hash를 읽은 이력이라 이전 실행의 exact test-pin 근거로 쓰지 않는다. 제품 코드 게시에 넣지 않는다.

NOT_RUN: 실제 휴대폰/OS 키보드·실제 한글 조합·설명 없는 사용자 관찰·이번 신규 분류 실제 계정 저장. 현재 Alpha는 기존5e/-Cc이며 후보 미반영. Library2 자료는 지원 materialization 경로 미노출로 NOT_READ이다. 글꼴 family 선언과 OS fallback은 특정 폰트 파일을 로딩한 증거가 아니다.
