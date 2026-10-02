# 조작과 검증 계약

현재 승인된 Program/Alpha 계약 안의 좁은 개선이다. 새 저장 schema·문법·제품 정책은 만들지 않는다.

- 제작 결과의 기존 개인 문서 열기는 읽기 탐색이다. 현재 actor·초안·native source tuple·불변 owner·실제 documentId를 검증한다. 연결이 없거나 손상되면 버튼을 만들지 않는다.
- 원문/구조/후보/비교·IME·잠금·미저장 입력이 있으면 읽기 이동에서도 자동 저장·flush하지 않는다. 이동 거절 때 입력을 남긴다.
- 최초 인계는 명시 확정한다. 기존 개인 문서의 재비교 기본값은 모두 유지다. 결과 읽기·비교 열기·모두 유지·취소·Escape는 성공 변경 0이다.
- 개인 날짜/시간·완료·다시 열기는 기존 transition과 같은 taskId를 사용한다. 원문 일정·불변 제작/공개 판본·Flow 소속은 바꾸지 않는다.
- Undo는 기존 개인 전체 거래 순서를 따른다. 원본만 되돌리면서 이후 개인 실행을 남기는 기능을 새로 주장하지 않는다.
- 실패는 합성 서버의 명확한 limit 거절로 시험한다. account bytes/성공 mutation은 0이며 선택을 남긴 뒤 명시 재시도한다. 불확실 ACK·장시간 연결 복귀는 별도 기존 회귀다.

### 명확 native limit의 직접 재시도 보완

기존 F08의좁은 실현이다. 일반 private수정재저장이나모든creator/social 명령으로 확대하지 않는다. 같은client/session의non-replay execute가명확limit로거절됐고pending0·durable draft·baseline account/references·expected revision·native-handoff intent와선택이같을때만 기존비교의적용버튼에서새wire requestId로 명시재시도한다. 자격은메모리에만있고복구저장에기록하지않는다.

unknown ACK·응답손상·throw/unavailable·replay거절은새요청금지이며기존ID조회/복구로남는다. 다른변경·조회실패·session/reload/restart·intent/선택변경은직접재시도자격을없애거나사용을거절한다. 새pending복구기록저장실패시기존draft도보존한다. 새버튼은추가하지않고native에는‘같은선택으로다시적용’, private문서에는기존‘수정후다시저장’안내를구별한다.

### 승인된 개인 사본 일정 요청 — 2026-10-02

사용자의 ‘승인!’으로 `private-task-schedule`의 설계·구현을 이번 목표에 포함한다. 요청은 `{copyId,itemId,taskId,date,time}`만 받는다. 날짜는 기존 유효 날짜 또는 null, 시간은 빈 값 또는 기존 HH:mm 형식이다. 새 저장 schema·문법·화면 행동은 만들지 않는다.

서버는 현재 인증 사용자의 개인 공간에서 copy→canonical Item→task→document가 정확히 하나로 연결되고, 포함된 일반 실행 Item이며 기존 잠금·원본 접근·품질 보류 제한을 통과하는지 다시 검증한다. 기존 `updateProgramTask`로 개인 날짜·시간과 명시 날짜 선택만 변경한다. 공개 원본·판본·Flow 소속·폴더·포함 여부·다른 Item은 그대로다. 상대일정에서 개인 날짜를 상속 날짜와 같게 다시 선택해도 기존 명시 선택이 유지돼 이후 기준일 변경이 덮어쓰지 않는다.

기존 social semantic 실행·CAS·receipt·개인 Undo를 재사용한다. 해당 intent의 private field는 text/copies, public field는 없음이다. 일반 M3 `copies` writer는 계속 금지한다. 반복 회차·하위 체크·다른 사용자·모호한 연결·추가 payload 필드는 이 요청으로 처리하지 않는다. 독립/native 개인 문서의 기존 저장 경로는 유지한다. 같은 값·취소·Escape·거절에서는 성공 변경0이다.

목록 상세/날짜 이동과 본문 메뉴의 명시 날짜·시간 폼은 같은 요청을 사용한다. 본문은 UI 메모리 안의 schedule metadata로 단일 Task 변경을 증명하며 원문 직접 입력·제목·메모는 기존 M3 경로를 유지한다. 전체 원문 변경을 날짜 요청에 끼워 보내지 않는다. 기존 모든 줄/Task ID와 나머지 workspace 값은 고정하고, serializer가 새 날짜·시간 속성줄에 부여하는 ID 차이만 대응한다.

처음 속성줄을 만드는 일정 저장 중 같은 문서를 이어 쓰면, 성공 ACK 뒤 현재 사용자·공개/다른 owner·본인 private space/text의 정확한 결과를 확인한 후 해당 새 속성 ID만 draft baseline과 최신 입력에 연결한다. raw·선택·dirty 입력은 보존한다. 기존 local compatibility receipt와 서버 거래 원장은 다르므로 그 receipt 차이는 본문 소유 증명의 대상에서 제외하며 서버 CAS·wire requestId/receipt 권한은 그대로 유지한다. 불확실 ACK·외부 내용 변경·사용자 전환·unmount에서는 자동 연결하지 않는다. 이 연결은 UI 메모리의 후속 저장 준비이며 새 저장 schema나 일반 social 재시도 권한이 아니다.

승인은 코드와 합성 검증 범위다. 실제 DB/Auth 설정·migration·배포·개발계 교체를 포함하지 않는다. 이전 승인 대기와 text-only 대안의 의미 차이는 [QA 이력](qa.md)에 남긴다.

## 실행 시나리오

1. 빈 제작 원문→명시 저장→결과→개인 문서 인계→개인 실행 왕복→reload.
2. 실제 파서로 만든 native 저장본→비교 취소→최초 인계→개인 실행 변경→제작 결과의 ‘개인 문서 열기’→모두 유지→reload.
3. 합성 공개 v1/선택 Item→개인 사본 1개→개인 실행 왕복→reload, 공개/제작 owner 불변.
4. native 최초 인계의 limit 거절→선택/입력 유지·성공 변경 0→명시 재시도→개인 실행 왕복.

각 실행 왕복은 비드래그 작업 메뉴와 키보드 Enter/Escape, 취소·같은 값 0, 실행 날짜/시간, 오늘·주간·월간, 완료·문서 복귀·재개, 날짜 Undo·미정·reload를 포함한다. 다섯 viewport는 390×844, 375×812, 844×390, 1024×768, 1440×900이다.

공개 사본 경로는 본문 폼에서 최초 시간 추가의 응답 보류 중 메모 이어 쓰기, 연속 일정 변경, 시간 삭제/재추가·Undo를 추가 확인한다. 합성 receipt barrier는 실제 API가 아니라 테스트 저장소의 정확한 성공 거래 뒤 응답만 보류한다.

브라우저는 실제 새 production assets를 쓰되 Auth/API/CAS는 deny-by-default 합성 포트로 가로챈다. 실제 BFF·Supabase·RLS·계정 동기화 증거가 아니다. 운영 localStorage sentinel bytes와 허용 밖 writer, 공개 hash, page error/콘솔/가로 넘침, 조작 버튼의 가림을 검사한다. 개발계에 붙여 읽는 baseline과 새 loopback build 검사는 따로 기록한다.

조작 HTML은 별도의 단순 합성 모델이다. 앱 파서·계정·DB 검증으로 합산하지 않는다. 허용 prefix의 정확 key만 쓰며 초기화도 그 key만 제거한다.
