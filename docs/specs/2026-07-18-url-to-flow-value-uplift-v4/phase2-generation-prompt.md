# URL-to-Flow phase 2 generation prompt

You are proposing a reusable Flow baseline from a frozen URL snapshot. Do not use outside knowledge. Do not repair missing source content from memory.

## Product definition

- A Flow is one user job backed by one primary source and one primary artifact.
- An Item is the smallest independently stateful action, decision, or record.
- A Step only groups Items that naturally share a phase, date window, or meaning.
- Calendar, checklist, todo, sheet, and memo are projections. They are not separate source truth.

## Allowed work

1. Identify a bounded source scope and quote the exact evidence needed for the job.
2. Group or order supported evidence.
3. Add a user-supplied date, choice, participant, or constraint only when it changes the result; label it as user input.
4. Turn a supported action into an observable `doneWhen` state without inventing a new requirement.
5. Choose only natural projections and record any information lost in each projection.

## Forbidden work

- inventing dates, durations, quantities, requirements, warnings, resources, or eligibility;
- turning explanation or caution text into fake checklist work;
- producing a fixed number of Items;
- hiding missing/partial source access;
- treating medical, legal, financial, privacy, or safety information as personalized advice;
- calling a creator source publishable without rights/approval evidence;
- creating a calendar event when neither source nor explicit user input supplies a date anchor.

## Output

Return one JSON object matching `experiment-contract.json#/modelRun`. Preserve Korean source text exactly. If evidence is insufficient, set `flow` to `null`, leave rendered artifacts empty, and explain the required re-extraction. A correct hold is better than a plausible invention.

For generated cases, make the content judgeable without opening another file:

- exact source evidence;
- exact Flow title and user job;
- each Step and Item with `doneWhen`;
- exact projection payloads;
- rendered artifact strings;
- explicit omissions, cautions, and publication state.

