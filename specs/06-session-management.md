# Feature Spec: Session Management

## Overview
Handles the lifecycle of observation sessions - starting, stopping, pausing, resuming, and persisting session data across app restarts.

## Responsibilities
- Create and manage observation sessions
- Handle app start/stop/crash recovery
- Persist session state for resume
- Manage multi-day observations
- Track overall observation progress

## Session States

```
[NOT STARTED] ──(start)──→ [ACTIVE]
                              │
                    ┌─────────┴─────────┐
                    │                   │
               (pause/idle)        (explicit stop)
                    │                   │
                    ▼                   ▼
              [PAUSED]             [COMPLETED]
                    │
               (resume)
                    │
                    ▼
              [ACTIVE]
```

## Data Structures

```typescript
interface Session {
  id: string;
  profileId: string;
  startTime: Date;
  endTime: Date | null;
  status: 'active' | 'paused' | 'completed';
  phase: 'interview' | 'observation';
  pauseHistory: PauseRecord[];
  totalActiveTime: number; // seconds, excluding pauses
  screenshotCount: number;
  taskCount: number;
  questionCount: number;
}

interface PauseRecord {
  pausedAt: Date;
  resumedAt: Date | null;
  reason: 'user' | 'idle' | 'app_closed' | 'system_sleep';
}

interface Profile {
  id: string;
  name: string;
  createdAt: Date;
  interviewCompleted: boolean;
  totalObservationTime: number; // seconds across all sessions
  sessionCount: number;
  lastSessionId: string | null;
}

interface AppState {
  currentProfileId: string | null;
  currentSessionId: string | null;
  lastKnownState: 'active' | 'paused' | 'closed';
  lastHeartbeat: Date;
}
```

## Core Functions

### Profile Management

#### `createProfile(name: string): Profile`
- Generate unique ID
- Initialize empty profile
- Set as current profile

#### `loadProfile(profileId: string): Profile`
- Load profile data from disk
- Load associated sessions

#### `listProfiles(): Profile[]`
- Return all profiles
- Sort by last activity

### Session Lifecycle

#### `startSession(profileId: string): Session`
- Create new session
- Determine phase (interview if not completed, else observation)
- Initialize session directory structure
- Start capture if observation phase
- Update app state

#### `pauseSession(sessionId: string, reason: string): Session`
- Stop capture
- Record pause
- Update status
- Save state to disk

#### `resumeSession(sessionId: string): Session`
- Validate session can be resumed
- Update pause record with resumedAt
- Restart capture
- Update status to active

#### `endSession(sessionId: string): Session`
- Stop capture
- Generate final session summary
- Update status to completed
- Calculate total active time
- Update profile stats

### Auto-Pause

#### `detectIdle(lastActivity: Date, threshold: number): boolean`
- Check if user has been idle
- Use screenshot timestamps or system idle time

#### `handleIdle(session: Session)`
- Pause session with reason 'idle'
- Stop capture to save resources
- Show "paused" indicator

#### `handleResume(session: Session)`
- Detect activity resumed
- Auto-resume session
- Restart capture

### Crash Recovery

#### `saveHeartbeat()`
- Update lastHeartbeat in app state
- Call every 30 seconds while active

#### `checkForCrash(): boolean`
- On app start, check lastKnownState
- If 'active' but app wasn't running, crashed

#### `recoverFromCrash(appState: AppState): Session`
- Load last session
- Calculate time lost
- Mark with pause reason 'app_closed'
- Resume or prompt user

### Session Resume (Multi-Day)

#### `canResumeSession(session: Session): boolean`
- Check if session is paused or was active
- Check if not too old (configurable)
- Check if same profile

#### `getResumableSession(profileId: string): Session | null`
- Find most recent non-completed session
- Return if resumable, null otherwise

#### `promptSessionResume(session: Session): 'resume' | 'new'`
- Show UI: "Continue previous session or start new?"
- Return user choice

## App Startup Flow

```
[App Launches]
      │
      ▼
[Load AppState]
      │
      ├─(lastKnownState = 'active')─→ [Crash Recovery Flow]
      │
      ├─(has resumable session)────→ [Prompt: Resume or New?]
      │                                    │
      │                              ┌─────┴─────┐
      │                              │           │
      │                           (resume)    (new)
      │                              │           │
      │                              ▼           ▼
      │                        [Resume]    [Start New]
      │
      └─(no session)───────────────→ [Start New Session]
```

## Storage

```
~/.workflow-shadow/
  app-state.json              # AppState - crash recovery
  profiles/
    [profileId]/
      profile.json            # Profile data
      sessions/
        [sessionId]/
          session.json        # Session data
          ... (other session files)
```

### app-state.json
```json
{
  "currentProfileId": "prof-123",
  "currentSessionId": "sess-456",
  "lastKnownState": "active",
  "lastHeartbeat": "2024-01-15T10:30:00Z"
}
```

## Events

- `session:started` - New session began
- `session:paused` - Session paused
- `session:resumed` - Session resumed
- `session:ended` - Session completed
- `profile:created` - New profile created
- `profile:loaded` - Profile loaded

## UI Touchpoints

### Session Status Indicator
- Shows current state (active/paused)
- Shows elapsed time
- Shows task/question counts

### Resume Prompt
- "You have an unfinished session from [date]. Resume or start new?"
- [Resume Previous] [Start New]

### End Session Confirmation
- "End this observation session?"
- Shows summary: X hours, Y tasks documented
- [End Session] [Continue]

## Configuration

```typescript
interface SessionConfig {
  idleThreshold: number; // seconds before auto-pause, default 300
  maxSessionAge: number; // hours before session can't be resumed, default 72
  heartbeatInterval: number; // ms, default 30000
  autoResumeOnActivity: boolean; // default true
}
```

## Dependencies
- Screen Capture (start/stop capture)
- Context Management (session summaries)
- Local storage (persistence)

## Out of Scope
- Cloud sync of sessions
- Multiple simultaneous profiles
- Session merging (combining two sessions)
- Export to other formats (handled by Documentation)
