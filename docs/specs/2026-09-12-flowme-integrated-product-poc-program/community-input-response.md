# 자료가 쌓인 뒤 질문 작성 — 응답·연속 사용 점검

2026-09-13 · 진행 중. P05/S06의 입력 문제를 P08 저장·재진입과 함께 검증한다. 전체 P01~P08/S01~S10 및 두 개선 루프를 이 작업으로 대체하지 않는다.

## 후속 개선 — 같은 저장 bytes 재처리와 중복 직렬화

03:01 UTC 수정 전 브라우저 기준을 확보했다. V7의 같은 누적 프로필에 비교용 질문 초안 하나만 만들고 같은 길이의 본문을 세 번 수정했다. 실제 비교 기록 (로컬 전용 근거: `../../../output/playwright/integrated-program/response-comparison-v7-before-2026-09-13T03-00-16-988Z.json`)의 저장 확인은7274/7179/7647ms, 미리보기 가능 상태는7319/7231/7683ms였다. 초안 `participation-072b72d5-459f-4e4e-a22b-b46c979531ce`를 상태 파일 (로컬 전용 근거: `../../../output/playwright/integrated-program-source-private-full/response-comparison-v7-before.state.json`)에 보존했다. 모든 원문/공개/개인 기록·다른 actor·Undo와 보호2키는 그대로다. 미리보기 취소3회는 저장 bytes 변화0이며 계측한6쓰기 모두 Program key다. 이 소수의 반복 측정은 일반 사용자 성능 기준을 대신하지 않는다.

후속 소스는 controller가 이미 검증해 사적으로 보유한 snapshot의 exact raw를 disk에서 한 번 관측한다. bytes가 같은 경우에만 재파싱을 생략하고, 다른 bytes·손상·삭제·읽기 실패는 기존 검증과 격리 경계를 거친다. standalone store의 매번 validator 실행은 유지한다. commit에서는 기존 strict encode와 predicate 후 재검사에서 이미 만든 logicalRaw를 equality에 재사용하여 같은 두 tree의 재직렬화를 없앴다. CAS/readback·실패 rollback·mutating predicate 거절·전체 이력·용량·운영 schema는 바꾸지 않았다.

DR01은 수정 전 재파싱1회로 실패했고 수정 후0회다. 같은 revision의 다른 bytes, 외부 snapshot 변조, 손상/삭제, 읽기 실패 후 쓰기 차단, 동적인 standalone predicate와 Undo-only 변경/두 번째 predicate 변조를 포함한52/52가 통과했다. strict304진입/진단0과 131파일1137/1137 (로컬 전용 근거: `../../../output/integrated-product-poc/new-tests-2026-09-13T02-49-07-188Z.json`)을 확인했다.

같은 실제 저장 파일(SHA256 `914a6db627eb466b89db11667bd71ba57be1ef30c2e75c8b948b3fd1e785a981`)의 Node 진단은 전2344.0ms (로컬 전용 근거: `../../../output/integrated-product-poc/store-response-v7-large-before-2026-09-13T02-45-37-629Z.json`)→후1590.7ms (로컬 전용 근거: `../../../output/integrated-product-poc/store-response-disk-reuse-after-2026-09-13T02-48-11-917Z.json`)였다. 프로파일러 포함 단일 controller 진단이며 브라우저 개선으로 계산하지 않는다. 같은 초안의 새 빌드 비교와 저장 실패/취소/재시도·공통 회귀 후에 실제 개선 범위를 갱신한다.

### 같은 새 빌드의 결과와 남은 UX

Mgb 실제 비교 (로컬 전용 근거: `../../../output/playwright/integrated-program/response-comparison-mgb-after-2026-09-13T03-06-16-356Z.json`)는 같은 초안으로 저장3369/3717/3762ms, 미리보기 가능3406/3786/3831ms를 기록했다. V7의 중앙값7274ms에서3717ms로 약49% 줄었다. 실제 두 상태 파일의 data(비교 draft 제외)·전체 Undo·보호키를 교차 대조해 같음을 확인했다. revision67→70의 세 본문 거래만 생겼다. 단일 PC의 세 번씩 비교이며 일반 benchmark나 즉각 응답을 증명하지 않는다.

그 초안을 버리거나 빈 자료로 바꾸지 않고 S06 전체19확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s06-same-comparison-mgb-2026-09-13T03-07-51-173Z.json`)으로 이어갔다. quota 때 입력/저장값 보존·취소·재시도·질문/반응/답글·정확 활동/reload·수정/삭제·없는 대상 복귀를 확인했다. 비교 초안은 이 로컬 질문 거래로 소비됐고 기존 원문/개인 기록/공개 판본과 보호2키는 보존됐다. 질문/답글 수정 미리보기4266/4466ms는 남는 응답성 문제다. 전체 원문 연속95·query12/이동23/손상Undo3·실제 보류Map3/18은 [현재 판정](current-validation.md)의 각각 다른 profile 근거로 구별한다.

`flow-ux-review`의 별도 직접 캡처 점검: S06 390×844/1024×768에서 질문 본문·답글·관리 메뉴가 겹치지 않고 보였다. 원문 수용1024 캡처에서는 날짜/시간/하위 체크의 선택과 적용·취소가 보이나 상단 비교값은 스크롤 위에 있다. 공개 미리보기390은 선택1항목·비공개 제외 안내·확정/수정 버튼이 화면 안에 있다. 이 주장은 해당 캡처와 실제 시나리오 범위다. 모바일 OS 키보드·스크린리더나 모든 상태의 접근성을 대신하지 않는다.

낮은 평가 항목은 조작 응답성3/5(여전히3~4초)다. 이는 전문가 내부 점검이며 사용자 선호·완료 시간·제품 전체 평균이 아니다. 이번 수정은 저장 내부 처리에만 한정했다. 제거한 UI는 없으며 공개 경계·취소/재시도·접힌 고급 설정은 오류 예방과 복구에 필요해 유지했다. 저장 안정 상태의 세 미리보기는22/22/38ms였지만, 입력 직후의 저장 대기까지 포함하면 수초이므로 둘을 구분한다.

## 실제 실패와 자료 보존

s41 질문 상황 (로컬 전용 근거: `../../../output/playwright/integrated-program/s06-source-private-s41-2026-09-13T01-41-51-529Z.json`)은 제목 입력 후 본문 fill의 12초 대기를 초과했다. 실행기는 종료값0이지만 시나리오는 실패다. page/console 오류0, 보호2키 bytes 동일이며 제목이 저장된 질문 초안을 남겼다. 후속 같은 본문 입력 (로컬 전용 근거: `../../../output/playwright/integrated-program/question-input-response-s41-2026-09-13T01-44-39-649Z.json`)은 입력9ms·저장4482ms로 완료됐다. 두 번째 성공을 첫 실패의 해결 근거로 바꾸지 않는다.

원본·개인 날짜/메모/지난 기록·공개 자료가 있는 동일 프로필을 파일 (로컬 전용 근거: `../../../output/playwright/integrated-program-source-private-full/question-delay-before-profile.state.json`)로 보존했다. 이 파일은 QA 상태이고 앱 전체 백업 계약이 아니다. 실제 작성 중 draft identity는 `participation-6d10e9b1-636b-462b-94ee-0e3b40e9bd06`이다. 새 빈 프로필이나 단순 원문으로 대체하지 않는다.

## 원인 근거와 제한된 조정

- 같은 파일의 Program 저장값은1,037,082자, Undo 복원 후 논리 값은6,598,915자다. 원본 비교 상태5개의 정확한 key 합계는 UTF-16 기준596,650bytes다. 기존 positive 검사 캐시2개/256KiB는 이 순회를 보관하지 못한다.
- 수정 전 메모리 진단 (로컬 전용 근거: `../../../output/integrated-product-poc/store-response-before-2026-09-13T01-55-45-035Z.json`): load1963ms, commit5542ms, CPU 프로파일러를 켠 controller12519ms. 원본 비교 재생이 반복되는 경로를 확인했다. 최초 진단은 보존 파일의 직렬화 형식을 임의로 가정한 QA assertion 오류로 끝났으며 파일 쓰기는 없었다. 실제 입력 bytes를 그대로 비교하도록 고친 뒤 이 근거를 얻었다.
- 신규 NSC05는 동일5개 비교 상태를3회 검사할 때 실제15회 재처리되어 먼저 실패했다. 캐시를8개/최대1MiB key로 제한 조정한 뒤5회 처리·10회 정확 key 재사용을 확인했다. 항목당128KiB 제한, 매번 descriptor 검사, 변경/권한 재검사, invalid 결과 비보관, oversized 전체 검사는 유지한다. 신규 케이스를 포함한 source/cache/store/controller58/58 PASS다.
- 조정 후 동일 메모리 진단 (로컬 전용 근거: `../../../output/integrated-product-poc/store-response-cache-v2-2026-09-13T01-59-19-675Z.json`): commit4057ms, 프로파일러 controller7410ms. 실제 원본·공개·개인 실행·Undo·파일 bytes 불변이며 브라우저 쓰기0이다. 서로 한 번씩의 진단값이고 프로파일러 비용이 포함되므로 사용자 응답 시간이나 일반 성능 통과로 해석하지 않는다.

이 캐시는 `NATIVE_SOURCE_VALIDATION_CACHE_VERSION=2`의 일시적 런타임 설정이다. 운영 저장 schema·Program payload·허용 원본 크기·80개 Undo 이력·권한 계약을 바꾸지 않는다. 비교 상태가 더 많거나 큰 경우 전체 검사가 계속 필요하므로 장기 사용 성능은 별도 확인한다.

## 종료 전 검사

1. 신규 전체 검사·npm 회귀·새 build와 실제 문서 build ID를 고정한다.
2. 동일 초안에서 제목→본문을 연속 입력한다. 원래12초 대기를 늘리지 않고 각 응답과 실제 저장 시각을 기록한다.
3. 같은 초안에서 quota 실패·입력 보존·취소·재시도→질문 공개→반응→답글→내 활동의 정확한 답글→reload→수정·삭제·없는 대상 안내까지 진행한다.
4. 시작 전 공개 자료·개인 실행·보호 key/value를 대조하고375/390·가로 모바일·태블릿·desktop의 핵심 행동을 점검한다. 실제 기기·OS 입력기·관찰 사용자 증거로 계산하지 않는다.

## 첫 조정의 실제 결과와 추가 원인

`vLlkTQPhUyI6RTNKHi0wP`에서 같은 질문 제목→본문 (로컬 전용 근거: `../../../output/playwright/integrated-program/question-input-cache-v2-2026-09-13T02-07-47-634Z.json`)은 제목23ms, 본문 입력5708ms, 둘 다 저장11496ms였다. 원래12초 대기는 통과했지만 느린 입력이므로 UX 해결로 판정하지 않는다.

같은 초안의 연속 상황 (로컬 전용 근거: `../../../output/playwright/integrated-program/s06-resumed-cache-v2-2026-09-13T02-08-38-890Z.json`)은 quota/입력 보존·취소·재시도, 질문 공개·반응·답글·정확 활동/reload·글 수정까지13확인 뒤 답글 수정 미리보기 클릭의12초 대기를 초과했다. 보호2키 bytes 동일·밖쓰기0이다. 실패 초안은 그대로 보존 (로컬 전용 근거: `../../../output/playwright/integrated-program-source-private-full/question-edit-preview-delay.state.json`)했으며 아직 게시하지 않은 답글 수정과 기존 게시 답글을 구별한다.

CPU 후속 진단에서 native owner 검증의 반복 재생이 남았다. 실제 변경된 owner168,126자와 ReplayState128,068자의 캐시 보관량은592,388bytes로 기존512KiB 한도를 넘는다. NOR06을 먼저 실패시킨 뒤 `NATIVE_OWNER_CACHE_VERSION=2`에서 항목당1MiB, **총2MiB 그대로**의 제한을 적용했다. descriptor·mutable tamper·반환값 분리·oversize 전체 검증을 포함한 관련59/59 PASS다. 이 변경은 domain validator나 commit/CAS/Undo를 건너뛰지 않는다.

같은 원본 파일의 두 번째 조정 진단 (로컬 전용 근거: `../../../output/integrated-product-poc/store-response-owner-v2-2026-09-13T02-12-42-054Z.json`)은 warm domain53ms/envelope281ms, commit1732ms, 프로파일러 controller2910ms다. 최초load1940ms는 여전히 남는다. 입력/미리보기의 실제 브라우저 해결 증거는 아니므로 새 빌드에서 같은 답글 수정과 질문 시나리오를 이어 확인한다.

## V7 실제 재검증 — 기능 경로 통과, 누적 응답성은 미해결

`V7ida8Pu7i4N9r4DkW6nb`의 동일 실패 초안23확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s06-edit-finish-owner-v2-2026-09-13T02-27-33-601Z.json`)은 같은 답글 수정에서 입력511ms/미리보기 준비3108ms/수정 반영3595ms였다. 미리보기 취소와 삭제 취소의 정확 bytes·writer0, 활동의 exact reply/focus·reload의 쓰기0, 글 삭제 후 기존 답글 보존, 없는 대상의 명시 복귀까지 통과했다. 보호2키 bytes 동일·허용 밖쓰기0·page/console0이며 Program setItem은3회다.

같은 자료를 유지한 채 새 질문 전체18확인 (로컬 전용 근거: `../../../output/playwright/integrated-program/s06-full-owner-v2-2026-09-13T02-29-13-372Z.json`)을 추가 실행했다. 제목→본문·quota 입력 보존/취소/재시도, 질문 공개·반응·답글·정확 활동/reload, 글/답글 수정과 삭제까지 PASS다. 이전 같은 본문의 답글이 남아 있으므로 활동 버튼을 실제 부모 제목+답글 내용으로 좁혔고 다른 첫 답글로 대체하지 않았다. 이전 글·답글·불변 판본·개인 실행·보호2키 모두 불변, 허용 밖0/page·console0이다. 상태는 QA 파일 (로컬 전용 근거: `../../../output/playwright/integrated-program-source-private-full/question-full-v7.state.json`)에 보존했다.

제목과 본문 입력 호출은5ms/누적10ms였으나 둘 다 저장되기까지6737ms였다. 이후 답글의 미리보기7863ms, 미리보기+공개 전체12094ms가 관측됐다. 글 수정의 미리보기+반영8687ms, 답글 수정9342ms다. 이는 각 호출의12초 대기 한도 내 기능 성공이지 빠른 UX나 장기 사용 성능의 통과가 아니다. 초기의 실패를 삭제하지 않으며, 같은 자료에서 더 많은 이력이 쌓이는 조건의 직렬화/검증·화면 입력 잠금 비용을 다음 성능 점검으로 남긴다. 원문·80개 이력을 줄이거나 검증·권한을 건너뛰는 대안은 쓰지 않는다.

### 실제 캡처 검토

같은 답글 편집 뒤375×812·390×844·844×390·1024×768·1194×834·1440×900의6캡처를 직접 열었다. 본문/버튼 겹침이나 가로 넘침은 관측하지 않았다. 375/390에서는 제목·본문이 줄바꿈되며 답글 하단은 세로 스크롤이 필요하다. 844×390 캡처는 질문 제목으로 스크롤한 중간 상태라 답글 행동이 캡처 밖이고, 별도 실제 포커스/스크롤 검사에서 화면 안 접근을 확인했다. 1024는 질문·답글이 함께 보이고,1194/1440은 상단 탐색까지 보인다. 이 중간 스크롤 캡처를 첫 진입 화면이나 실기기 검사로 표현하지 않는다.

UX 점검에서 질문에 Flow/근거/사진을 요구하지 않는 경로, 공개 미리보기와 취소/복구 행동을 유지했다. 이번 조정은 화면 컨트롤 추가·삭제나 제품 정책 변경이 아니다. 응답성은 주요 잔여이고6크기 화면 검사는 그 결함을 상쇄하지 않는다.
