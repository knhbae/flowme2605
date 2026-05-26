# Testable FLOW Content

Date: 2026-05-26
Production URL: https://flowme2605.vercel.app

This list is for Stage 0 observed sessions and manual smoke tests. None of these routes are validated yet. Use the result labels `no signal`, `friction`, or `candidate signal`; do not call a route validated from one session.

## Priority A - Observed Session Candidates

These are the current routes prepared for first user observation. They have Flow Lab prep packages, run sheets, note intake, and evidence-log tracking.

| Route | Test URL | Best tester | Main thing to observe | Expected outside artifact | Decision risk |
|---|---|---|---|---|---|
| `computer-skills-d30-study` | `/f/computer-skills-d30-study` | Someone with a real or realistic exam date | Can the user understand source-derived study rows, enter an exam date, and export calendar/sheet without treating FLOW as exam advice? | Calendar plus study sheet | Low risk, but still not validated |
| `diet-habit-2week` | `/f/diet-habit-2week` | Someone willing to log meals/sleep/activity for observation only | Does the user read it as an observation sheet with stop/consult boundaries, not diet prescription? | Observation sheet plus weekly memo | Health-sensitive; stop if advice/outcome claims are misunderstood |
| `new-car-delivery-check` | `/f/new-car-delivery-check` | Someone preparing for or simulating vehicle handover | Does the user record defect evidence, photo filenames, document status, and dealer confirmation before generic checklist completion? | Evidence sheet plus hold/signing memo | Money-at-risk; FLOW must not decide whether to sign |

## Priority B - Secondary Smoke Test Routes

Use these after the first observed-session candidates. They are useful for checking layout, export surfaces, and mobile density, but they are not the first validation bottleneck.

| Route | Test URL | What to test | Expected outside artifact | Watch item |
|---|---|---|---|---|
| `moving-d30-basic` | `/f/moving-d30-basic` | Date anchor, calendar-first workbench, desktop right rail, mobile destination CTAs | Moving calendar plus checklist/sheet | Make sure source context does not crowd the first action |
| `baby-food-menu-recipe` | `/f/baby-food-menu-recipe` | Mobile warning-first flow, today reaction record, meal calendar export | Meal calendar plus reaction log | Allergy/sensitive warning must be visible before dense recipe detail |
| `used-car-buying-check` | `/f/used-car-buying-check` | Candidate comparison first, buy/hold memo, collapsed checklist density | Comparison sheet plus decision memo | Must not imply vehicle condition guarantee |
| `passport-renewal-docs` | `/f/passport-renewal-docs` | Submission memo first, travel timing, photo readiness, pickup/storage | Submission memo plus checklist | Official requirement boundaries must stay explicit |

## Priority C - Content/Source QA Routes

Use these for internal QA or source-boundary review before user sessions. They are not primary observed-session targets yet.

| Route | Test URL | Why test later |
|---|---|---|
| `real-thankyou-bubu-home-workout-starter` | `/f/real-thankyou-bubu-home-workout-starter` | Exact workout-video route is execution-specific, but still needs caution around unsupported movement details and stop/consult language. |
| `real-fitvely-diet-record-routine` | `/f/real-fitvely-diet-record-routine` | Exact nutrition-video route is sheet-first, but health-sensitive framing needs extra care before broader user sessions. |
| `vehicle-inspection-prep` | `/f/vehicle-inspection-prep` | Evidence-first vehicle route is useful for artifact QA, but not a current representative/public MVP observed-session candidate. |
| `real-mofa-overseas-travel-prep` | `/f/real-mofa-overseas-travel-prep` | Official travel-safety route has emergency-card UX, but country-specific official context must remain clear. |

## Session Checklist

For a Priority A session:

1. Open Flow Lab and download the route run sheet.
2. Open the production route URL on the tester's device.
3. Do not explain the intended path before the tester starts.
4. Ask the tester to think aloud.
5. Watch whether they reach setup, understand the natural artifact, export/copy, and name where they would use it outside FLOW.
6. Record the session with Flow Lab note intake.
7. Save the note under `docs/validation-sessions/` using `YYYY-MM-DD-route-session-01.md`.
8. Add the evidence to the observed-session evidence log only as `no signal`, `friction`, or `candidate signal`.

## Current Recommendation

Start with `computer-skills-d30-study` because it is the lowest-risk route and the clearest export-first test: calendar plus sheet. Run `diet-habit-2week` and `new-car-delivery-check` after that, because both require tighter source/risk observation.
