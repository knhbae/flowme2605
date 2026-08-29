# Fresh QA 계약

## 필수 자동화

- `REENTRY-P01`: 빈 장소 추가 → 다른 줄 이동 → rendered 장소 label 탭 → head=valueStart → `서울역` 입력 → exact source.
- `REENTRY-P02`: 기존 장소 label 탭 → source write `0` → 실제 값만 선택 → 입력 후 prefix 불변.
- `REENTRY-P03`: 일반 text 값 내부 탭은 raw 값의 해당 위치로 이동한다.
- `REENTRY-P04`: Markdown link처럼 display/raw가 다르면 raw 값 전체를 선택한다.
- `REENTRY-C01`: catalog 15종의 label 탭이 prefix 밖 selection만 만든다.
- `REENTRY-C02`: unknown/custom property와 non-property rendered block은 successor write `0`.
- `REENTRY-M01`: existing option이 고정 예시가 아닌 actual source value를 표시한다.
- `REENTRY-M02`: more 9종은 `일정 / 실행 내용 / 참고·출처` heading 아래 한 번씩만 노출된다.
- `REENTRY-M03`: `다른 정보`와 닫기·뒤로 keyboard focus/Escape를 보존한다.
- `REENTRY-V01`: 320·360·390px, keyboard-open visible height에서 caret과 tray가 보이는 영역 안이다.
- `REENTRY-V02`: 320px·200% text, horizontal overflow `≤1px`, active option 완전 노출.
- `REENTRY-U01`: one undo/redo, mode re-entry, scroll/focus, IME composition, LF/CRLF를 보존한다.
- `REENTRY-J01`: 이사 D-30, 세미나, 반복, 보호 원문에서 count·projection·bytes 회귀 `0`.

## 핵심 실패 기준

- tap 뒤 source mutation
- selection이 property lineStart~labelEnd에 위치
- 실제 입력 뒤 `  - 라벨: ` prefix 불일치
- wrong Item owner 또는 duplicate property
- menu 실제 값과 source 값 불일치
- keyboard·200%에서 active control 또는 caret clipping
- browser error, protected source 손실, undo 1회 복구 실패

## 검증 순서

```text
node --check successor builder/runtime
node --test successor pure tests
node successor builder
npx.cmd playwright test --config=playwright.property-reentry-simplicity-poc.config.ts
npx.cmd playwright test --config=playwright.keyboard-property-tray-reliability-poc.config.ts
npm.cmd run test:text-authoring
npm.cmd test
npm.cmd run build
npm.cmd run docs:check
git diff --check -- <이번 신규 파일>
```

각 fresh 실행은 checkout, branch, full HEAD, KST 시작·종료, 명령, exit code, test count를 결과 README에 기록한다.
