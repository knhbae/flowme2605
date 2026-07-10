# Claude Design P22-04 실행/편집 상세 분리 Evidence

이 package는 My Flow와 Calendar의 할 일 상세를 **실행 상태**와 **편집 상태**로 분리한 결과를 검토하기 위한 자료입니다. 새 편집기나 Studio 기능을 만들지 않고 기존 personal overlay, 완료 체크, Calendar 반영, export 경로를 유지했습니다.

## 먼저 볼 파일

1. [review.html](./review.html) — My Flow/Calendar, 390px/1024px, 실행/편집 8개 화면 비교
2. [audit.md](./audit.md) — 원인, 제품 결정, 회귀 범위, 남은 위험
3. [route-evidence.json](./route-evidence.json) — 화면별 자동 판정 marker와 screenshot hash
4. [prompt-ko.md](./prompt-ko.md) — Claude Design 복붙용 검토 요청

## 구현 요약

- 기본 상세의 직접 행동은 `완료 체크`와 `닫기` 2개만 남겼습니다.
- 바깥 행에 이미 보이는 할 일 제목, 날짜, Flow 맥락을 inline 상세에서 반복하지 않습니다.
- `메모·일정`을 펼쳐야 제목·날짜·메모 수정 입구가 나타납니다.
- `원문·내 도구`를 펼쳐야 원문과 메모/체크리스트/시트/캘린더 내보내기가 나타납니다.
- 편집 상태에서는 완료 체크, 실행 체크리스트, 원문·내보내기를 숨기고 입력 필드에 집중합니다.
- `수정 취소`는 상단에, `변경 저장`은 입력 끝에 둡니다. 변경 전 저장은 비활성이고 변경 후 활성화됩니다.
- My Flow와 Calendar가 같은 상세 컴포넌트와 같은 상태 경계를 사용합니다.

## Evidence 기준선

- 구현 commit: `97c6250ca5d890d6ffd6434ca1c2341e2956efe9`
- route: `/my?demo=ux12`, `/calendar?demo=ux12`
- viewport: 390x844, 1024x900
- screenshot: 8장
- 모바일 element screenshot은 상세 자체를 가리지 않도록 캡처 시점에만 상·하단 고정 nav를 제외합니다. 앱 CSS와 실제 route 동작은 바꾸지 않습니다.
- capture 재실행:

```powershell
$env:P22_CAPTURE_BASE_URL='http://127.0.0.1:3106'
npx.cmd tsx scripts/content-audit/capture-p22-04-execution-edit-detail.mts
```

## 주요 수치

- 기본 상세 직접 행동 최대: `2`
- 기본 상세 visible 제목 입력: `0`
- 기본 상세 visible 직접 수정 버튼: `0`
- 기본 상세 visible 원문/export 행동: `0`
- 편집 상태 visible 완료 체크: `0`
- 편집 상태 수정 취소/저장 확인: `4/4`
- 변경 전 저장 비활성 / 변경 후 활성: `4/4`
- 390px/1024px horizontal overflow: `0`

## 검증 요약

- P22-04 focused E2E: pass
- personal overlay, Calendar 이동, routine, portable export 관련 detail E2E: pass
- URL-first/public share/workbench 회귀: 36개 중 35개 일괄 통과, 변경된 중복-title assertion 1개 수정 후 단독 통과
- unit: 380 pass
- docs check: pass
- build: pass
- capture gate: pass

## 남은 경계

- 긴 편집 폼은 모바일에서 세로 스크롤이 필요합니다. 저장은 폼 끝에 있어 흐름은 일치하지만, 전체 편집 필드 축소 여부는 별도 사용성 판단이 필요합니다.
- 메모·일정과 원문·내 도구는 접근 가능하지만 기본 상태에서는 접혀 있습니다. 실제 반복 사용자에게 수정 발견성이 너무 낮은지는 후속 관찰 대상입니다.
- 이번 slice는 inline user route만 다룹니다. 새 full-screen editor나 Studio 승격은 포함하지 않습니다.
