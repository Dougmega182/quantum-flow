# Implementation Plan: Recurrence Management

Extend the system to allow users to manage recurring tasks by creating and deleting recurrence rules linked to task templates.

## Proposed Changes

### [Frontend] Recurrence UI

#### [MODIFY] [api.ts](file:///d:/Projects/IN_PROGRESS_PROJECTS/QUANTUM%20FLOW/web/src/lib/api.ts)
- Add `RecurrenceRule` and `RecurrenceRuleCreate` types.
- Add `recurrenceList`, `recurrenceCreate`, `recurrenceDelete`, and `recurrenceMaterialize` methods to the `api` object.

#### [NEW] [Recurrence.tsx](file:///d:/Projects/IN_PROGRESS_PROJECTS/QUANTUM%20FLOW/web/src/pages/Recurrence.tsx)
- Create a new page component with:
  - List of active recurrence rules (showing template title, frequency, and last run).
  - Form to create new recurrence rules:
    - Select from existing task templates.
    - Frequency selection (daily, weekly, monthly).
    - Interval input.
    - Day of week selection (for weekly).
  - Delete button for each rule.
  - "Run Materialize Now" button to manually trigger task creation.

#### [MODIFY] [App.tsx](file:///d:/Projects/IN_PROGRESS_PROJECTS/QUANTUM%20FLOW/web/src/App.tsx)
- Add a "Recurrence" tab to the main navigation.

## Verification Plan

### Automated Tests
- Run existing recurrence tests:
  - `docker exec quantumflow-api-1 python -m pytest tests/test_recurrence.py`

### Manual Verification
- Start the dev environment: `docker-compose up -d`.
- Open the web app and navigate to the "Recurrence" tab.
- Create a recurrence rule for an existing template.
- Click "Run Materialize Now" and verify new tasks are created on the "Tasks" page.
- Delete the recurrence rule and verify it's removed.
