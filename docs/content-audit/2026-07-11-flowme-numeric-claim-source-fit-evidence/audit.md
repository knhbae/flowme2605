# 숫자·서비스 경계 source-fit 감사

작성일: 2026-07-11

## 판정 원칙

1. 법령이나 공식 신청 절차가 행동 시점을 결정하는 기한은 출처와 확인일을 함께 유지한다.
2. 지원금·세율·공제율처럼 공고마다 달라지는 값은 앱에 고정하지 않는다.
3. 재정 콘텐츠의 비율은 법정 기준이나 사용자 권장값처럼 쓰지 않는다.
4. 서로 다른 서비스는 같은 온라인 접수 경로처럼 합치지 않는다.
5. 출처 문구와 다른 값은 `상황에 맞게 조정`을 붙여도 유지하지 않는다.

## route별 판정

| route | 현재 판정 | 근거와 처리 |
| --- | --- | --- |
| `lease-contract-report-deadline` | 유지 | 국가법령정보센터와 RTMS의 계약 체결일 30일 이내 기준을 재확인했다. |
| `passport-renewal-docs` | 유지·출처 교체 | 외교부 재발급 안내의 6개월 이내 사진과 신청 경로를 기준으로 바꿨다. |
| `unemployment-benefit-apply` | 유지 | 고용24의 18개월 중 180일, 퇴직 후 12개월과 현행 시행규칙의 이직확인서 10일을 확인했다. |
| `first-passport-issue` | 유지 | 외교부가 6개월 이내 촬영, 온라인 사진 413×531 권장, AI 편집 불가를 안내한다. |
| `used-car-ownership-transfer` | 유지 | 현행 자동차등록령은 매매 시 매수일부터 15일 이내 이전등록을 요구한다. |
| `birth-registration-prep` | 경계 수정 | 출생신고 1개월은 유지하되 법원 온라인 신고와 정부24 행복출산을 분리하고, 지원별 소급 시점은 현재 안내를 보게 했다. |
| `safe-inheritance-onestop` | 일부 삭제 | 정부24의 1년 신청 기한과 신청자격은 유지하고 근거 없는 6개월 문구는 삭제했다. |
| `monthly-household-budget` | 예시로 유지 | 50/30/20은 비교용 방법일 뿐이며 실제 비율은 사용자가 직접 정한다고 명시했다. |
| `payday-finance-routine` | 불일치 삭제 | 앱의 40/40/20은 원문과 불일치했다. 고정 비율을 제거하고 계좌 목적 분리만 남겼다. |

## 공식 근거

- [부동산 거래신고 등에 관한 법률](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=03&joNo=0006&lsiSeq=259641&urlMode=lsScJoRltInfoR)
- [외교부 여권 재발급 안내](https://www.passport.go.kr/home/kor/contents.do?menuPos=7)
- [외교부 여권사진 안내](https://www.passport.go.kr/home/kor/contents.do?menuPos=31)
- [고용24 실업급여 안내](https://ei.work24.go.kr/ei/eih/eg/pb/pbPersonBnef/retrievePb0201Info.do)
- [자동차등록령 제26조](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0026&lsiSeq=286481&urlMode=lsScJoRltInfoR)
- [가족관계등록법 출생신고 기한](https://law.go.kr/LSW/LsiJoLinkP.do?docType=JO&joNo=002400000&languageType=KO&lsNm=%EA%B0%80%EC%A1%B1%EA%B4%80%EA%B3%84%EC%9D%98+%EB%93%B1%EB%A1%9D+%EB%93%B1%EC%97%90+%EA%B4%80%ED%95%9C+%EB%B2%95%EB%A5%A0&paras=1)
- [정부24 행복출산 통합신청](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17410000001)
- [정부24 안심상속](https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=17400000001&tp_seq=02)
- [토스피드 통장쪼개기](https://toss.im/tossfeed/article/bank-account-divide)
- [50/30/20 가계 예산 참고 글](https://eknowhow.kr/budgeting-50-30-20-rule/)

## 남은 경계

- 공식 출처도 이후 법령·공고 변경으로 달라질 수 있어 `source_checked_at` 기반 재검토는 계속 필요하다.
- 자동 테스트는 숫자가 현재 출처와 일치한다는 사실을 영구 보장하지 않는다. 이번 확인에서 발견한 불일치와 서비스 혼합이 다시 들어오는 것만 차단한다.
- 실제 사용자가 기한과 예시 비율을 올바르게 이해하는지는 P22 관찰 `0/15` 상태로 남는다.
