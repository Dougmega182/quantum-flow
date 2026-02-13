# Implementation Plan: Google Calendar Integration

Enable Google Calendar syncing by providing a UI to connect accounts and sync events to/from Quantum Flow tasks.

## Proposed Changes

### [Backend] Integration Enhancements

#### [MODIFY] [google_calendar.py](file:///d:/Projects/IN_PROGRESS_PROJECTS/QUANTUM%20FLOW/backend/app/routes/google_calendar.py)
- Enhancement for `push`: After successful push to Google, create an entry in `ExternalEvent` to track the link.
- Enhancement for `pull`: Implement basic mapping from Google Events to Tasks (if they don't already exist in `ExternalEvent`).

### [Frontend] Integrations UI

#### [MODIFY] [api.ts](file:///d:/Projects/IN_PROGRESS_PROJECTS/QUANTUM%20FLOW/web/src/lib/api.ts)
- Add methods for `googleAuthUrl`, `googleStatus`, `googlePull`, and `googlePush`.

#### [NEW] [Integrations.tsx](file:///d:/Projects/IN_PROGRESS_PROJECTS/QUANTUM%20FLOW/web/src/pages/Integrations.tsx)
- Create a new page component with:
  - Integration status (Connected/Disconnected).
  - Connect button (opens Google Auth URL).
  - Sync buttons (Pull from Google, Push to Google).
  - Integration event logs (optional placeholder).

#### [MODIFY] [App.tsx](file:///d:/Projects/IN_PROGRESS_PROJECTS/QUANTUM%20FLOW/web/src/App.tsx)
- Add an "Integrations" tab to the main navigation.

## Verification Plan

### Manual Verification
1. Navigate to the "Integrations" tab.
2. Click "Connect Google Calendar".
3. Verify redirection to Google and back to the app status "connected".
4. Create an event in Google Calendar.
5. Click "Sync from Google" in Quantum Flow and verify a corresponding task is created.
6. Create a task with a due date in Quantum Flow.
7. Click "Sync to Google" and verify the event appears in Google Calendar.
