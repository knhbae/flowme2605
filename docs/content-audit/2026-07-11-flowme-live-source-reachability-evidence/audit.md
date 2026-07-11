# 정상 사용자 콘텐츠 출처 도달성 감사

작성일: 2026-07-11

## 판정

초기 검사에서 정상 사용자 route 161개, 고유 출처 140개 중 확정 404가 6개였다. redirect 5개도 과거 주소를 계속 사용하고 있었다. 출처가 열리기만 하는지에 그치지 않고 연도와 source row까지 확인한 결과 2016 영유아 검진 기사, 2025 건강검진 PDF, 과거 정책자금 경로와 시점 고정 금리 문구도 교체 대상이었다.

최종 공개 범위는 155개다. 고유 출처 133개 중 자동 도달 126개, 확정 404/410 0개, redirect 0개다. 403 2개와 자동화 network error 5개는 web open/search에서 원문을 확인했으며 자동 검사 결과와 수동 확인을 섞지 않고 기록했다.

## 최신 주소로 교체한 주요 출처

| Flow | 이전 상태 | 현재 출처 |
| --- | --- | --- |
| 중고차 구매 현장 점검 | 삭제된 개인 가이드 | [자동차365 중고차 구매가이드](https://www.car365.go.kr/ccpt/schdcar/trde/prchsGuide.do?_menuId=M630401000&moblYn=Y) |
| 해외여행 안전정보 | 과거 외교부 deep link | [외교부 해외안전여행](https://0404.go.kr/app/main/mainPage) |
| 해외여행 건강 | 삭제된 질병관리청 경로 | [질병관리청 해외여행 전 건강정보](https://kdca.go.kr/kdca/4916/subview.do) |
| 실업급여 신청 | 종료된 고용보험 주소와 워크넷 문구 | [고용24 실업급여 신청 안내](https://ei.work24.go.kr/ei/eih/cp/cc/ccEminsrFollow/retrieveCc200Info.do) |
| 국민연금 확인 | 과거 전자민원 deep link | [국민연금 전자민원](https://nps.or.kr/elctcvlcpt/comm/getOHAC0000M3.do?menuId=MN24001727) |
| 국가·영유아 건강검진 | 2025 PDF·2016 매거진 | [일반건강검진](https://www.nhis.or.kr/nhis/healthin/wbhaca04500m01.do), [영유아 건강검진](https://www.nhis.or.kr/nhis/healthin/wbhaca04800m01.do) |
| 소상공인 정책자금 | 과거 공단 경로와 2분기 고정 수치 | [현재 정책자금 신청 화면](https://ols.semas.or.kr/ols/man/SMAN010M/page.do) |

토스피드, 안전운전 통합민원, 건강보험 피부양자 서식도 최종 canonical 주소로 바꿨다. 금리·한도·지원 기준처럼 변동 가능한 수치는 사용자 문구에서 제거하고 현재 공식 화면 확인 행동으로 바꿨다.

## preview로 내린 6개

- `new-apartment-precheck`: 삭제된 Naver 원문
- `japan-esim-setup-before-departure`: 삭제된 Naver 원문
- `digital-detox-weekly`: 삭제된 원문과 근거 불명확한 효능 문장
- `new-hobby-30day`: 클래스 플랫폼 랜딩만으로 30일 실행 행을 증명하지 못함
- `kids-dino-footprint-art`: 어린이집 파일을 안정적으로 재확인하지 못함
- `picture-book-reading-routine`: 2015 워크북 PDF가 반복 검사에서 404

직접 URL과 원본 provenance는 보존한다. 대체 출처에서 실제 row를 추출하기 전까지 정상 검색·실행 후보로 되돌리지 않는다.

## 자동 접근 제한 7개

- 질병관리청 예방접종도우미 2개
- 국민건강보험 일반검진·영유아검진·피부양자 서식 3개
- RIDI 독서 습관 글 1개
- KKday 여행 준비물 글 1개

이 URL들은 Node fetch에서 TLS/network error 또는 403이지만 web open/search로 현재 내용을 확인했다. 향후 비동기 감사에서는 같은 bucket을 유지하되 404와 동일하게 처리하지 않는다.

## 남은 리스크

- 155개 route의 URL 생존을 확인했어도 모든 문장과 제도 기준을 재감수한 것은 아니다.
- `needs_review` 콘텐츠는 source-fit 승인 전 단계다.
- 외부 서버 응답은 실행마다 달라질 수 있다. strict audit는 배포 build와 분리해 주기적으로 실행해야 한다.
- 실제 사용자가 원문을 신뢰하고 Flow를 끝까지 실행하는지는 P22 관찰 0/15 상태로 남는다.

## 화면 확인

- `used-car-buying-check`: 390px/1024px 모두 자동차365 현재 링크를 노출하고 가로 넘침이 없었다.
- `national-health-checkup-d7`: 390px에서 2025 고정 안내가 사라지고 국민건강보험 일반건강검진 현재 페이지로 연결됐다.
- `small-business-fund-check`: 390px에서 과거 분기 금리·고정 한도·1월 신청 유도 문구가 보이지 않고 현재 신청 화면으로 연결됐다.
- source card, 저장 우선 CTA, Flow 단위 export 위계는 기존 사용자 경로를 유지했다.
