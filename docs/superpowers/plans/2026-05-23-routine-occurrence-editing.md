# Routine Occurrence Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make routine monthly calendar occurrences directly editable and persist/export those occurrence records.

**Architecture:** Reuse the existing `FlowWorkbenchState.occurrences` map and the current `occurrenceKey()` format. Add routine-specific occurrence controls inside `ArtifactWorkbench` without changing global storage or adding server persistence.

**Tech Stack:** Next.js App Router, React client components, TypeScript, localStorage, Playwright E2E, Node test runner.

---

## File Structure

- Modify `components/flow/ArtifactWorkbench.tsx`
  - Add routine calendar occurrence controls.
  - Keep the existing `MiniMonthCalendar` behavior for timeline flows.
- Modify `tests/e2e/flow-mvp.spec.ts`
  - Extend the existing Workbench persistence test to edit `2회차`.
- Modify `lib/flow/export.test.ts`
  - Add coverage for multiple occurrence records in text and workbook exports.
- Add/update `docs/pr-history/2026-05-23-routine-occurrence-editing.md`
  - Record scope, verification, not-done items, and PR/deploy links.

---

### Task 1: Failing E2E Coverage

**Files:**
- Modify: `tests/e2e/flow-mvp.spec.ts`

- [ ] **Step 1: Extend the Workbench persistence test**

Add assertions to the `artifact workbench saves local execution entries` test after the routine Flow opens:

```ts
await routineWorkbench.getByLabel('회차 완료: 2회차').check();
await routineWorkbench.getByLabel('2회차 메모').fill('듣기 20분, 단어 30개');
await expect(routineWorkbench.getByLabel('회차 완료: 2회차')).toBeChecked();

await page.reload();
const reloadedRoutineWorkbench = page.getByLabel('Flow artifact workbench');
await expect(reloadedRoutineWorkbench.getByLabel('회차 완료: 2회차')).toBeChecked();
await expect(reloadedRoutineWorkbench.getByLabel('2회차 메모')).toHaveValue('듣기 20분, 단어 30개');
```

- [ ] **Step 2: Run E2E test and verify RED**

Run:

```powershell
npm run test:e2e -- --grep "artifact workbench saves local execution entries"
```

Expected: FAIL because `회차 완료: 2회차` or `2회차 메모` is not exposed in the calendar yet.

---

### Task 2: Failing Export Coverage

**Files:**
- Modify: `lib/flow/export.test.ts`

- [ ] **Step 1: Extend export fixture with two occurrence records**

In `workbench records are included in text and workbook exports`, add a second occurrence:

```ts
'2026-05-25:2': {
  done: true,
  note: '듣기 20분, 단어 30개',
},
```

Assert text and workbook rows contain the second memo:

```ts
assert.match(text, /듣기 20분, 단어 30개/);
assert.ok(workbench.rows.some((row) => row.includes('듣기 20분, 단어 30개')));
```

- [ ] **Step 2: Run export test and verify current behavior**

Run:

```powershell
npx tsx --test lib/flow/export.test.ts
```

Expected: PASS if export already supports multiple occurrences. If it fails, implement only the export handling required for multiple occurrence rows.

---

### Task 3: Implement Calendar Occurrence Controls

**Files:**
- Modify: `components/flow/ArtifactWorkbench.tsx`

- [ ] **Step 1: Add a routine-specific calendar component**

Create a `RoutineOccurrenceCalendar` function near `RoutineWorkbench`:

```tsx
function RoutineOccurrenceCalendar({
  month,
  rows,
  workbenchState,
  onWorkbenchChange,
}: {
  month: string;
  rows: ScheduleRow[];
  workbenchState: FlowWorkbenchState;
  onWorkbenchChange: (state: FlowWorkbenchState) => void;
}) {
  const days = getMonthCalendarDays(month || formatDate(new Date()).slice(0, 7));
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-blue-700">반복 캘린더</p>
          <h3 className="text-base font-semibold text-gray-950">월간 회차 관리</h3>
        </div>
        <span className="text-sm font-semibold text-gray-500">{month}</span>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500">
        {weekdayOrder.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((date, index) => {
          const dayRows = date ? rows.filter((row) => row.startDate === date) : [];
          return (
            <div key={`${month}-${index}`} className={`min-h-28 rounded-md border p-1 text-xs ${date ? 'border-gray-200 bg-[#FAFAF8]' : 'border-gray-100 bg-gray-50'}`}>
              {date ? <p className="font-semibold text-gray-600">{date.slice(8)}</p> : null}
              <div className="mt-1 space-y-1">
                {dayRows.slice(0, 2).map((row) => {
                  const state = workbenchState.occurrences[row.id] ?? {};
                  return (
                    <div key={row.id} className={`rounded border px-1 py-1 ${state.done ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                        <input
                          aria-label={`회차 완료: ${row.title}`}
                          className="h-3 w-3 rounded border-gray-300"
                          checked={Boolean(state.done)}
                          onChange={(event) => onWorkbenchChange(updateOccurrenceDone(workbenchState, row.id, event.currentTarget.checked))}
                          type="checkbox"
                        />
                        <span className="truncate">{row.title}</span>
                      </label>
                      <textarea
                        aria-label={`${row.title} 메모`}
                        className="mt-1 min-h-10 w-full resize-y rounded border border-gray-200 bg-white px-1 py-1 text-[11px] text-gray-800"
                        placeholder="메모"
                        value={state.note ?? ''}
                        onChange={(event) => onWorkbenchChange(updateOccurrenceNote(workbenchState, row.id, event.currentTarget.value))}
                      />
                    </div>
                  );
                })}
                {dayRows.length > 2 ? <p className="text-[11px] text-gray-500">+{dayRows.length - 2}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Use it in `RoutineWorkbench`**

Replace:

```tsx
<MiniMonthCalendar title="반복 캘린더" month={month} rows={rows} doneIds={doneIds} />
```

with:

```tsx
<RoutineOccurrenceCalendar month={month} rows={rows} workbenchState={workbenchState} onWorkbenchChange={onWorkbenchChange} />
```

- [ ] **Step 3: Remove unused `doneIds` inside `RoutineWorkbench`**

Delete the `doneIds` constant from `RoutineWorkbench` if TypeScript reports it as unused.

---

### Task 4: Verify and Document

**Files:**
- Modify: `docs/pr-history/2026-05-23-routine-occurrence-editing.md`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
npx tsx --test lib/flow/export.test.ts
npm run test:e2e -- --grep "artifact workbench saves local execution entries"
```

Expected: both pass.

- [ ] **Step 2: Run full gates**

Run:

```powershell
npm run docs:check
npm test
npm run build
npm run test:e2e
```

Expected: all pass.

- [ ] **Step 3: Update PR history**

Create `docs/pr-history/2026-05-23-routine-occurrence-editing.md` with:

- PR title/date/branch/status
- Why
- What changed
- Not done
- Verification
- Risks
- Follow-ups
