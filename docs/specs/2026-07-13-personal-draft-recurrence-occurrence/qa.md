# P23-02C1 QA

## Golden Scenarios

1. no recurrence
2. daily
3. every two days
4. weekdays
5. three weekdays per week
6. every two weeks
7. monthly
8. monthly day 31 with skip policy
9. inclusive until end
10. occurrence count end
11. open-ended range-bound generation
12. all-day recurrence
13. IANA timed recurrence
14. floating timed recurrence
15. DST wall-clock preservation
16. done to reopened
17. skipped occurrence
18. held occurrence
19. one-occurrence schedule override
20. this-and-future rule revision
21. reorder identity preservation
22. title and memo identity preservation
23. tombstone with past history preservation
24. restore with future occurrence regeneration
25. malformed recurrence
26. legacy `repeatPreset` migration
27. source-backed adapter not applied
28. out-of-range result is empty
29. duplicate occurrence prevention
30. projection generation limit

## C1 Contract Assertions

- recurrence contract ready = true
- series and occurrence identities distinct = true
- execution state separated = true
- legacy preset migrated = true
- duplicate occurrence count = 0
- malformed recurrence Item loss count = 0
- reorder and title edit identity change count = 0
- past execution record loss count = 0
- DST wall-clock shift count = 0
- source mutation count = 0
- source-backed recurrence adapter applied = false
- Calendar and ICS recurrence consumers connected = false at the C1 contract-only baseline
- recurrence UI changed = false
- app UI changed = false

## Runtime Sanity

C1 has no user-facing UI or consumer connection. Verify representative `/my` and `/calendar` routes render with no new recurrence controls, no new console errors, and no layout change. This is automated route sanity, not observed-user validation.

## P23-02C2 Runtime Status

- recurrence UI connected = true
- Calendar occurrence projection connected = true
- occurrence done/reopened connected = true
- ICS RRULE projection connected = true
- ICS EXDATE and RECURRENCE-ID fixture coverage = true
- source-backed recurrence adapter applied = false
- skipped/held and one-occurrence edit UI connected = false
- actual observed-user count = 0

The C1 assertion above records the historical contract-only baseline. The current C2C runtime assertion is Calendar and ICS recurrence consumers connected = true for personal draft user-created Items only.
