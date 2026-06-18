# 제작자형 Flow 콘텐츠 검증 계획

Date: 2026-06-01
Status: 대표 케이스 12개 재선정 및 원문 기반 정답 Flow 샘플 작성

## 목표

이 작업은 많은 후보를 자동 생성하는 것이 아니라, FlowMe의 My Flow UX가 실제 제작자형 콘텐츠를 감당하는지 검증하고 향후 변환 프롬프트/로직의 기준을 만들기 위한 대표 샘플 검증이다.

## 기존 자동 exampleFlow 진단

- 기존 50개 자동 exampleFlow는 원문 실행 신호를 재해석하지 않고 action 배열을 캘린더/오늘/진행 카드로 감싸는 수준이었다.
- structure_type만 보고 Day 1, D-14, 초안 같은 시간을 붙여 실제 원문과 맞지 않는 일정이 생겼다.
- 완료 기준이 '완료 상태로 표시'처럼 반복되어 사용자가 무엇을 끝내야 하는지 판단하기 어렵다.
- 출처 본문, 제작자 경험, 위험 경계를 분리하지 못해 민감 영역이나 템플릿 저작권 경계가 흐려졌다.
- 따라서 기존 exampleFlow는 참고 로그로만 두고, 대표 샘플은 사람이 원문 구조를 읽고 다시 작성해야 한다.

## 대표 케이스 선정 범위

- 단일 URL 체크리스트형
- 단일 URL 챌린지형
- 제작자 여러 URL 묶음형
- 유튜브 플레이리스트형
- 블로그 시리즈형
- Notion/Gumroad 템플릿형
- 공식 정보 + 제작자 경험 혼합형
- 기준일 타임라인형
- 생활 루틴/관리형
- 제작/운영 파이프라인형
- 학습/스터디형
- 문서/PDF 실행형

## 산출물

- [원문 기반 정답 Flow 샘플 문서](./2026-06-01-creator-flow-samples.md)
- [HTML 리뷰 페이지](./2026-06-01-creator-flow-samples.html)
- [제작 프롬프트/로직 규칙 초안](./2026-06-01-creator-flow-prompt-rules.md)
- [샘플 JSON](./original-source-review/2026-06-01-creator-flow-validation-samples.json)
- [My Flow seed 후보 JSON](./original-source-review/2026-06-01-my-flow-seed-candidates.json)
