# Pet Health Source Replacement

Date: 2026-05-25
Route: `real-pet-health-visit-routine`
Source: [서울시 우리동네 동물병원](https://news.seoul.go.kr/env/archives/567583/)

## Decision

`real-pet-health-visit-routine` no longer uses the broad Animal.go.kr FAQ page as its source. It now points to the exact 서울시 우리동네 동물병원 official page, which directly covers designated animal hospitals, required documents, basic health check, essential vaccination, heartworm prevention, and visit application.

This does not promote the route. The source is a Seoul support-program page for eligible households and registered dogs/cats, so the route remains catalog review until the Flow copy and artifact fields make those limits explicit.

## Why

The previous source was an animal registration/admin FAQ. It could justify registration-number preparation, but it did not directly support a hospital visit memo or treatment-record routine.

The new source better supports a natural artifact:

- visit prep memo: eligibility, designated hospital, documents, registered pet status
- checklist: essential treatment items and visit application
- follow-up memo: visit result, extra cost, next appointment, contact-professional trigger

## UX Risk

- Do not present the source as a universal veterinary guide.
- Do not imply medical advice or treatment selection.
- Keep source facts separate from caregiver notes.
- Keep professional-contact triggers visible for worsening symptoms or uncertainty.

## Broad Guard Result

- Broad real-source routes before this batch: 3
- Broad real-source routes after this batch: 2
- Remaining broad queue:
  - `real-fitvely-weekly-body-check`
  - `real-mofa-overseas-travel-prep`

Update: `real-mofa-overseas-travel-prep` later received an exact 외교부 베트남 국가/지역별 정보 source and dropped out of the broad queue. It remains reshape, not representative/public MVP.

## Not Done

- Did not promote to representative or public MVP.
- Did not mark validation.
- Did not rewrite all pet-health item copy in this batch.
- Did not generalize the Seoul source into a national pet health guide.
