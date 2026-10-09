# 검증 근거

기준 HEAD `c3624eb57a8ab669f0c7642aa12fc4cd5ad37dd1` 위 로컬 후보, Next build `2RDb27l6_wFYqZS-j-Eno`. 컴포넌트 브라우저 검사는 이 Next 서버를 제공한 검사가 아니다. 실제 제품 컴포넌트 번들과 변경 없는 기준 global CSS를 사용했다.

## 마지막 제품 변경 이후

- 관련 단위 7파일: 48 PASS / 0 FAIL / 0 SKIP. 실행 출력 `e481a8`, exit0. source pins는 로컬 최종 원장에 있다.
- Program targeted type: diagnostics 0, sourceChangedDuringRun 0, exit0. `output/integrated-product-poc/targeted-types.json`.
- Next build: 컴파일·lint/type·정적 생성 성공, exit0 (`dc136a`). 이전 빌드를 새 성공으로 재사용하지 않았다.
- fresh Chrome 가상 저장소 `final-04`: 36 PASS / 0 FAIL / page errors 0. 1440×900, 390×844 및 20px/32px 합성 글꼴 확대 조건. 확대 조건은 작성 화면만 확인했다.
- 모바일 작성 도구 모달 `modal-05`: 9 PASS / 0 FAIL / page errors 0. 모달 열기, Escape 복귀, 미리보기 취소, 적용, 같은 native editor 복귀, Undo/Redo, 원본 보존을 확인했다.
- 독립 source diff 읽기: runtime 3파일·test 2파일 동일 SHA, 필수 수정 없음. 독립 검토자는 코드를 수정하거나 검사를 실행하지 않았다.

## 최초 실패 보존

- `before-01`: 첫 줄 정렬 3 FAIL. 이후 동일 가상 자료에서 오차 0px을 확인했다.
- `final-01`: 제작 출처 항목에 없는 분류 컨트롤을 찾은 timeout 2건. 기존 지원 제한이며 저장 실패로 판정하지 않았다.
- `final-02`: runner 문법 오류로 브라우저 시작 전 실패.
- `final-03`: progress readback 필드 오류 2건. 원래 진행 기록은 존재했고 harness만 수정했다.
- `modal-01`~`modal-04`: 선택자, 준비되지 않은 가상 틀 입력, JSON 객체 속성 순서 비교 오류. 각 raw와 PNG를 그대로 보존했다. 최종 비교는 모든 필드값을 유지하는 deep equality이며 원문 값은 그대로 비교했다.

## 미실행

실제 휴대폰, OS 한글 입력기, 처음 쓰는 사람의 이해도, 이번 후보의 실제 계정·서버 저장은 NOT_RUN이다. 기존 실제 사용/배포 기록을 이번 변경의 새 결과로 합산하지 않는다. 외부 인증/API 전달과 실제 backend 쓰기는 0이다.

## 게시 후 정상 진입 검사 보완

최초 게시 `3e4634ad362d007bef9c079346624bc57b844f2f`의 정상 pre-push verify는 docs·기존 npm test·새 Next build `KG6KI-pns-g9TsLkgjCkT`까지 성공했다. 제품 3파일·검사 2파일의 바이트는 초기 로컬 검증과 같다.

기존 authoring-merge E2E 두 곳은 접힌 작성 도구를 열지 않고 내부 틀을 바로 선택했다. 정상 열기 2곳과 입력 모드로 돌아가기 전 닫기 1곳만 추가했다. 기존 원문·Undo/Redo·저장·재열기·보호·외부 저장소 판정을 삭제하거나 완화하지 않았다.

별도 fresh Chrome과 후보 Next 서버 3134에서 해당 3사례를 실행해 3 PASS / 0 FAIL, exit0 (`23cff1`)을 확인했다. 가상 storage·운영 sentinel만 사용한 `/my?personalWorkspacePoc=v1` 경로이며 실제 계정/Alpha 검사가 아니다. 시험 서버는 해당 Playwright가 종료했다. 첫 config 실행은 cwd 누락으로 서버 기동 전에 MODULE_NOT_FOUND가 발생했으며 raw를 보존했다. 정상 cwd를 지정한 뒤 제품 수정 없이 통과했다.
