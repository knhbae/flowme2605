# Real-Source Official Reshape Plan

1. Confirm #22 and #23 are merged, and branch from updated `main`.
2. Add a failing unit test proving six real-source official/service routes do not yet expose route-specific workbench records.
3. Add static field mappings for Q-Net, driver license, resident register, childcare visit, KDCA travel health, and childcare support.
4. Record route-level natural artifact simulations and UX/content reinforcement in content audit docs.
5. Update project status and PR history.
6. Run targeted and full verification before opening the PR.

## Conversion Decisions

| Flow | Primary Destination | Structure | Risk/Source Handling |
| --- | --- | --- | --- |
| `real-qnet-application-examday-check` | hybrid | timeline + log table | Official deadline facts stay in source details; user logs exact deadlines/evidence. |
| `real-childcare-vaccination-visit-prep` | hybrid | timeline + memo card | Medical certainty is avoided; user records questions, observations, and next visit. |
| `real-kdca-travel-health-check` | hybrid | timeline + memo card | KDCA official check and consultation memo stay separate from personal travel notes. |
| `real-safe-driving-license-renewal` | sheet | decision table | User compares type/health-check/material conditions before checklist execution. |
| `real-gov24-resident-register-copy` | memo | memo card | Submitter requirement, disclosure scope, and file location are preserved as proof. |
| `real-childcare-support-application-check` | sheet | decision table | Eligibility, monthly hours, center slot, and first-visit documents are compared. |
