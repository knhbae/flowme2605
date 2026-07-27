# FlowMe P35 오프라인 Preview

- 생성일: 2026-07-27T06:22:22.379Z
- 캡처 source: `http://127.0.0.1:3104`
- current local browser capture: `18`
- P35 reference screenshot: `37`
- capture failure: `0`
- observed-user count: `0`

## 시작 파일

Vercel에 접근할 수 없으면 [index.html](./index.html)을 브라우저에서 연다.
서버, 외부 CSS, 외부 JavaScript 없이 동작한다.

## 화면별 파일

1. [공개 Flow](./public-flow.html)
2. [내 Flow](./my-flow.html)
3. [캘린더](./calendar.html)
4. [가져가기](./export.html)
5. [P35 전체 증거](./reference-gallery.html)

## 구조화 evidence

- [현재 캡처 manifest](./preview-manifest.json)
- [P35 참고 캡처 manifest](./reference-manifest.json)
- [오프라인 렌더링 검증](./render-check.json)
- `state-snapshots/`: 각 화면에서 보인 heading, accessible action, test id, 본문,
  viewport, overflow, console/page error

## Evidence 경계

- 현재 18장은 로컬 P35 빌드의 자동 브라우저 캡처다.
- 참고 37장은 P35-01~P35-08 자동 evidence에서 복사했다.
- 둘 다 실제 사용자 관찰이 아니다.
- Preview, 캡처, current source가 다르면 current source와 재현 가능한 current
  interaction을 우선하고 차이를 기록한다.
