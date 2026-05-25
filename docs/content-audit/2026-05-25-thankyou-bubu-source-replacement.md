# ThankyouBUBU Broad Source Replacement

Date: 2026-05-25

## Decision

Two ThankyouBUBU routes no longer use the channel page as their source. They now point to exact YouTube videos, so the user can tell which original workout to open before acting.

This is a source replacement and reshaping step only. It does not make either route representative, public-MVP, or validated.

## Replaced Routes

| Route | Previous source | New exact source | Current decision |
|---|---|---|---|
| `real-thankyou-bubu-home-workout-starter` | ThankyouBUBU channel page | `https://www.youtube.com/watch?v=pcyrlkHXAdE` | `reshape_content_or_ux` |
| `real-thankyou-bubu-20min-routine` | ThankyouBUBU channel page | `https://www.youtube.com/watch?v=gSz5n4sLENI` | `reshape_content_or_ux` |

## Source Evidence

- YouTube oEmbed confirmed `pcyrlkHXAdE` as a Thankyou BUBU video titled `전신 다이어트 최고의 운동 [점프 없음, 눕는동작 없음, 반복 없음, 토크 없음]`.
- YouTube oEmbed confirmed `gSz5n4sLENI` as a Thankyou BUBU video titled `전신 다이어트 최고의 운동 [칼소폭 찐 핵핵핵 매운맛]`.
- Both routes now preserve the exact original video link in item detail links instead of asking the user to choose from the whole channel.

## Natural Artifact Simulation

### Starter Route

Simulated user:

- Goal: start home workout without jumping or floor-heavy movement.
- Starting condition: beginner, knee caution, 20 minutes available.
- Outside artifact: routine calendar plus condition memo.

Expected output:

- Calendar row for selected workout days.
- Original video link attached to the workout.
- Before/after condition note: pain, dizziness, intensity, next-session adjustment.

Remaining UX gap:

- 2026-05-25 update: the route now uses one exact-video execution action instead of five setup/planning actions.
- It now puts original video execution, condition record, and stop condition into the single detail panel.
- It is still not representative, public-MVP, or validated until real users demonstrate export and execution.

### Near-20-Minute Routine Route

Simulated user:

- Goal: repeat one high-intensity full-body video three times a week.
- Starting condition: can reserve a fixed slot, but needs rest-day and stop-condition clarity.
- Outside artifact: weekly routine calendar plus shared adjustment memo.

Expected output:

- Calendar rows for workout days and rest days.
- Original video link attached to each workout row.
- Weekly count and adjustment note.

Remaining UX gap:

- 2026-05-25 update: the route now uses one exact-video execution action instead of five recurring-routine management actions.
- It keeps movement execution in the original video and uses FLOW for schedule, completion state, difficulty, condition, and next-session adjustment.
- It is still not representative, public-MVP, or validated until real users demonstrate export and execution.

## Broad Source Guard Impact

- Broad real-source route count dropped from 7 to 5 in this batch, then to 4 after the FITVELY diet-record source replacement, then to 3 after the Sinagong study source replacement.
- Representative leak count remains 0.
- Remaining broad queue:
  - `real-fitvely-weekly-body-check`

Update: `real-pet-health-visit-routine` later received an exact 서울시 우리동네 동물병원 official source and dropped out of the broad-source queue. It remains catalog review, not representative/public MVP.
Update: `real-mofa-overseas-travel-prep` later received an exact 외교부 베트남 국가/지역별 정보 source and dropped out of the broad-source queue. It remains reshape, not representative/public MVP.

## Follow-Up

1. Completed first reshape: the two ThankyouBUBU exact-source routes now use the compact source/video/log/stop-condition pattern.
2. Replace or demote the two FITVELY broad site routes.
3. Attach exact curriculum, exam scope, past-exam round, or weekly-plan sources before using broad Sinagong study material for representative study-progress framing.
