# 이사 D-30 재시작 스펙

**날짜:** 2026-05-27
**상태:** Approved
**담당:** Codex
**관련 로드맵:** [v0.1.0 - Stage 0 First Flag MVP](../../ROADMAP.md#v010---stage-0-first-flag-mvp)

## 목표

실제 웹 이사 체크리스트를 기반으로 별도 실험 화면 `/restart/moving-d30`을 만든다. 사용자는 이사일을 입력하고, 날짜가 계산된 캘린더를 확인한 뒤, export 전에 항목을 자기 상황에 맞게 편집하고, 결과를 외부 도구로 가져가거나 FlowMe 안에 저장할 수 있어야 한다.

## Stage 적합성

이 작업은 Stage 0에 맞다. 핵심은 FLOW가 콘텐츠를 사용자의 실행 가능한 산출물로 바꾸는 첫 루프를 검증하는 것이다. 이 실험은 이사 관리 전체 앱, 업체 비교 도구, 문서 보관함, 공동 작업 기능, 알림 시스템, 범용 플랫폼 route가 되어서는 안 된다.

실험 화면은 기존 `/f/moving-d30-basic` route와 분리한다. 그래야 기존 public Flow 페이지를 건드리지 않고 새 상호작용을 검토할 수 있다.

## 사용자 니즈

이사일이 정해진 사용자는 웹 체크리스트를 자기 이사 날짜에 맞는 편집 가능한 캘린더 항목으로 바꾸고 싶다. 그래야 일반 체크리스트를 그대로 따라가는 대신, 실제 이사 상황에 맞게 날짜와 항목을 조정한 뒤 캘린더나 체크리스트로 가져갈 수 있다.

## 기반 출처

- 일반 이사 준비 출처: [아정당 이사 준비 체크리스트](https://www.ajd.co.kr/contents/basic-tip/detail/%EC%9D%B4%EC%82%AC_%EC%A4%80%EB%B9%84_%EC%B2%B4%ED%81%AC%EB%A6%AC%EC%8A%A4%ED%8A%B8_%EC%99%84%EB%B2%BD%EC%A0%95%EB%A6%AC%21_%EC%97%91%EC%85%80_Xls%2C_PDF%2C_%EB%85%B8%EC%85%98_notion_%EC%B2%A8%EB%B6%80-23363)
- 공식 행정 정보 출처: [정부24 전입신고 안내](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000016&HighCtgCD=A01010&tp_seq=01)

구현에서는 일반 체크리스트 변환과 공식 행정 정보를 분리해야 한다. 정부24 정보는 일반 이사 팁처럼 섞지 않고 별도 공식 정보 영역에 표시한다.

## 범위

포함:
- 새 `/restart/moving-d30` route.
- `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/interaction` 기반 월간 캘린더.
- 이사일 입력 후 D-30, D-10, D-3, D-1, D-Day, D+1 항목 묶음 생성.
- export 전 항목 편집:
  - 항목 날짜 이동.
  - 제목, 날짜, 메모 수정.
  - 항목 추가.
  - 항목 삭제.
- 가져가기/저장 선택:
  - 캘린더 export.
  - 체크리스트 복사.
  - 엑셀 실행표.
  - `내 Flow` 저장.
- 저장 분기:
  - 로그인 중인 사용자는 저장 후 FlowMe 기록을 열 수 있다.
  - 로그인하지 않은 사용자는 로그인/회원가입 gate를 보고, 편집한 draft가 유지되어야 한다.
- 생성 또는 저장된 항목의 로컬 체크 상태.
- 아정당 체크리스트 변환과 정부24 공식 정보의 출처 분리.
- 조용한 네이티브 앱 톤: 시스템 배경, 흰 표면, 얇은 구분선, 절제된 그림자, 목적지 중심 액션.

제외:
- 업체 비교표.
- 이사 비용 관리.
- 파일 첨부나 사진 증빙 캡처.
- 가족/동거인 공동 작업.
- reminder 또는 push notification 세부 설정.
- 자동 추천.
- 커뮤니티 또는 social proof.
- 정부24 신청 절차를 상세 가이드화하는 기능.
- AI ingestion 또는 자동 출처 추출.
- 결제, 토큰, marketplace 기능.

## 사용자 저니

1. **Setup:** 사용자가 `/restart/moving-d30`을 열고 이사일을 입력한다.
2. **Generated calendar:** FLOW가 FullCalendar 월간 grid와 agenda/list 표면에 날짜별 이사 항목을 생성한다.
3. **Edit before export:** 사용자는 날짜 이동, 항목 필드 수정, 항목 추가, 삭제로 일정을 조정한다.
4. **Export/save:** 사용자는 캘린더 export, 체크리스트 복사, 엑셀 export, `내 Flow로 저장` 중 하나를 선택한다.
5. **Save branch:** 로그인 중이면 바로 저장하고, 비로그인 상태면 로그인/회원가입 gate를 표시한다.
6. **Progress and sources:** 사용자는 항목을 체크하고, 일반 체크리스트 출처와 공식 정보 출처를 분리해서 확인한다.

## UI 방향

- 날짜 grid와 이벤트 배치는 FullCalendar가 담당한다. 단, 기본 toolbar chrome은 숨기거나 대체하고 FLOW 네이티브 컨트롤을 사용한다.
- `캘린더에 넣기`를 primary action으로 둔다.
- `내 Flow로 저장`은 export/save 표면 안의 secondary option으로 둔다. export-first 행동보다 앞에 두지 않는다.
- 모바일에서는 캘린더 내부의 긴 이벤트 텍스트를 줄이고, agenda/list 표면에서 항목 상세를 읽게 한다.
- 사용자에게는 내부 용어가 아니라 도구 중심 용어를 쓴다: `이사일`, `캘린더에 넣기`, `체크리스트 복사`, `엑셀 실행표`, `내 Flow로 저장`.

## FlowMe 게이트

| 게이트 | 결정 |
| --- | --- |
| 첫 사용자 행동 | `이사일`을 입력하거나 확인한다. |
| 완료 신호 | 사용자가 캘린더/체크리스트/엑셀을 export하거나, `내 Flow`에 저장하거나, 최소 1개 항목을 체크한다. |
| 산출물 목적지 | 캘린더가 primary이고, 체크리스트 복사와 엑셀은 secondary이며, FlowMe 저장 기록은 optional continuation이다. |
| 출처/위험 경계 | 아정당 체크리스트 항목은 실행 콘텐츠로 변환하고, 정부24 안내는 별도 공식 정보 영역에 둔다. |
| 자연 산출물 | `이사일=2026-06-27` 입력 시 D-30/D-10/D-3/D-1/D-Day/D+1 항목이 생성되고, 사용자가 최소 1개 항목의 날짜나 메모를 수정한 뒤 수정된 결과를 export한다. |
| 검증 | 문서 검사, 항목 생성/편집/export helper 단위 테스트, build, `/restart/moving-d30` 브라우저 확인, setup/edit/export/save/auth-gate E2E. |

## 수용 기준

- `/restart/moving-d30`이 `/f/moving-d30-basic`과 독립적으로 렌더링된다.
- 이사일을 입력하면 올바른 offset의 날짜별 이사 항목이 생성된다.
- 생성된 항목은 export 전에 다른 날짜로 이동할 수 있다.
- 생성된 항목은 export 전에 수정, 추가, 삭제할 수 있다.
- 캘린더 export, 체크리스트 복사, 엑셀 export는 편집된 항목 상태를 사용한다.
- `내 Flow로 저장`은 auth 상태에 따라 분기한다. 로그인 중이면 저장/열기 행동을 보여주고, 비로그인 상태면 편집 draft를 잃지 않는 로그인/회원가입 gate를 보여준다.
- 아정당 출처와 정부24 출처가 시각적, 구조적으로 분리된다.
- 이 route를 검증된 Flow라고 부르지 않는다.
- 업체 비교, 파일 첨부, 알림, 공동 작업, 추천, social proof 기능을 넣지 않는다.
