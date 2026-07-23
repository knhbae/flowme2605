# Revised rules v1

Calibration에서 사례별 예외가 아닌 다음 공통 규칙만 보강했다.

1. **상태가 남는 위치가 primary artifact다.** 차시·curriculum·비교·현장 점검은 Sheet, 공식 날짜창은 Calendar, 짧은 공식 상태 전이는 Todo, 물품·절차는 Checklist를 우선한다.
2. **달력은 확정 일시가 있을 때만 만든다.** 월~금 같은 상대 요일은 사용자의 시작 주가 정해질 때까지 conditional template이며 ICS가 아니다.
3. **SourceRow가 없거나 source·rights·locale·safety gate가 실패하면 Item보다 먼저 멈춘다.**
4. **기준·상태 행을 가짜 반복 할 일로 만들지 않는다.** 비교 기준은 decide/record Item과 Sheet field로 보존한다.
5. **완료 기준도 provenance 대상이다.** 원문 의미를 확인했다는 범위만 쓰고 성공·승인·안전 결과를 보장하지 않는다.
6. **공개와 개인용을 분리한다.** 개인용 link-based 변환 가능성이 공개 catalog 허가를 뜻하지 않는다.

이 변경은 calibration 전체에서 반복된 artifact·calendar·gate 혼동을 줄이기 위한 일반 규칙이며 final holdout 사례별 예외를 포함하지 않는다.
