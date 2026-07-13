# P23-04 Past Run Detail And Reuse

**Date:** 2026-07-13
**Status:** Implementation slice
**Scope:** Completed local Flow runs

## Problem

완료한 Flow를 다시 시작하면 run registry는 이전 anchor, 완료 상태, 개인 값과 source version을 보관한다. 그러나 My Flow의 `지난 실행 N회`는 완료 날짜와 숫자 요약만 보여준다. 사용자는 당시 어떤 제목과 날짜로 무엇을 끝냈는지, 어떤 회고를 남겼는지 다시 확인하거나 기록용 파일로 가져갈 수 없다.

## Decision

완료 시점의 effective user-facing rows를 additive item snapshot으로 보관한다. 과거 run detail은 snapshot만 읽으며 현재 source, current personal overlay, current execution state로 다시 계산하지 않는다.

## Snapshot Contract

각 item snapshot은 아래 값을 가진다.

- stable item or occurrence ID
- user-facing title
- pending, done, reopened, skipped, held 상태
- unscheduled, all-day, timed 일정 상태
- optional date, time, duration
- optional personal memo
- run 당시 순서

Flow title과 completion feedback도 completion snapshot에 보관한다. source 원문 객체, 구조 overlay, 현재 실행 상태는 수정하지 않는다.

## Legacy Policy

기존 completion snapshot은 그대로 읽는다. item snapshot이 없는 run은 날짜, anchor, 완료 숫자 요약을 유지하고 `이전 실행은 요약만 저장돼 있어요`라고 표시한다. migration은 과거 item을 현재 source로 추정해 채우지 않는다.

## Detail UX

- `지난 실행 N회`를 열면 최근 완료 run을 날짜순으로 본다.
- 각 run을 열면 당시 item title, schedule, state를 표시한다.
- 회고와 아직 전송되지 않은 원본 수정 메모를 구분해서 표시한다.
- 현재 실행의 완료 체크, 수정, 삭제 control은 과거 detail에 노출하지 않는다.
- 모바일 390px에서 item row와 export action이 겹치지 않아야 한다.

## Historical Export

과거 snapshot은 기록 보관용 checklist, sheet, memo output으로 다시 가져갈 수 있다. Calendar/ICS 재수출은 지난 일정을 중복 등록할 위험이 있어 제공하지 않는다. 새 실행의 Calendar/ICS는 현재 reuse path에서 생성한다.

## Source Version Boundary

새 source version으로 다시 시작하기 전에 이전 run snapshot을 먼저 확정한다. 과거 run은 이전 source version과 이전 personal values를 유지하고, 새 active run만 reviewed version을 사용한다.

## Out Of Scope

- server-backed review submission or creator moderation
- source-backed structural add/delete/reorder UI
- historical Calendar/ICS re-import
- account, database, cloud sync, OAuth
- arbitrary old run reconstruction from current source
