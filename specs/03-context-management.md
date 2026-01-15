# Feature Spec: Context Management

## Overview
Maintains the AI's "memory" across different timeframes - what just happened, what happened today, and what happened in previous sessions.

## Responsibilities
- Maintain rolling buffer of recent screenshots (immediate context)
- Track and summarize current session activity (session context)
- Load and manage historical documentation (historical context)
- Assemble context for each LLM call
- Update session summaries periodically

## Context Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  IMMEDIATE (last ~60 seconds)                               │
│  - Last 3-6 raw screenshots                                 │
│  - Current app/window                                       │
│  - What just changed                                        │
│  Purpose: "I just saw you do X, why?"                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  SESSION (current work session)                             │
│  - Tasks completed today                                    │
│  - App time accumulation                                    │
│  - Questions already asked                                  │
│  - Current task theory                                      │
│  Purpose: "You've been in Excel for 20 minutes"            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  HISTORICAL (previous sessions)                             │
│  - Session summaries from past days                         │
│  - Known task patterns                                      │
│  - Previous Q&A responses                                   │
│  Purpose: "Yesterday you did this differently"              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  BASELINE (from interview)                                  │
│  - Role summary                                             │
│  - Known systems                                            │
│  - Stated responsibilities                                  │
│  Purpose: Ground truth about the user's job                 │
└─────────────────────────────────────────────────────────────┘
```

## Data Structures

```typescript
interface ImmediateContext {
  recentScreenshots: Screenshot[]; // last 3-6, FIFO buffer
  currentApp: string;
  currentWindowTitle: string;
  lastAppSwitch: Date | null;
  lastSignificantChange: string | null; // brief description
}

interface SessionContext {
  sessionId: string;
  startTime: Date;
  tasksSoFar: TaskSummary[];
  appTimeToday: Record<string, number>; // app name -> seconds
  questionsAsked: string[]; // question text to avoid repeats
  currentTaskTheory: string | null; // what we think they're doing
  lastSummaryUpdate: Date;
}

interface TaskSummary {
  name: string;
  startTime: Date;
  endTime: Date | null;
  duration: number;
  apps: string[];
  brief: string; // one-line description
}

interface HistoricalContext {
  interviewSummary: InterviewSummary;
  knownTasks: string[]; // task names seen before
  previousSessionSummaries: SessionSummary[];
  relevantQA: ClarificationQuestion[]; // past answers
}

interface SessionSummary {
  sessionId: string;
  date: Date;
  duration: number;
  tasksCompleted: string[];
  appsUsed: string[];
  questionsAnswered: number;
  newObservations: string[];
  brief: string; // paragraph summary
}

interface AssembledContext {
  immediate: {
    screenshots: Screenshot[];
    currentState: string;
  };
  session: string; // ~500 tokens summary
  historical: string; // ~1000 tokens relevant excerpts
  baseline: string; // ~500 tokens interview summary
}
```

## Core Functions

### Immediate Context

#### `updateImmediateContext(screenshot: Screenshot): ImmediateContext`
- Add screenshot to FIFO buffer (keep last 6)
- Update current app/window
- Detect if significant change occurred
- Return updated context

#### `detectSignificantChange(prev: Screenshot, curr: Screenshot): string | null`
- Compare apps, window titles
- Return description of change or null if minor

### Session Context

#### `initSessionContext(sessionId: string): SessionContext`
- Create new session context
- Load any partial session data if resuming

#### `updateSessionContext(context: SessionContext, event: ObservationEvent): SessionContext`
- Handle new screenshots, app switches, task boundaries
- Accumulate app time
- Update current task theory

#### `addQuestionAsked(context: SessionContext, question: string)`
- Track questions to avoid repeating

#### `updateTaskTheory(context: SessionContext, theory: string)`
- LLM's current guess at what task user is doing

### Session Summarization

#### `shouldUpdateSummary(context: SessionContext): boolean`
- Return true if 5+ minutes since last update
- Or if significant task boundary detected

#### `generateSessionSummary(context: SessionContext): SessionSummary`
- Call LLM to summarize session so far
- Compress to ~500 tokens
- Update lastSummaryUpdate timestamp

### Historical Context

#### `loadHistoricalContext(profileId: string): HistoricalContext`
- Load interview summary
- Load previous session summaries
- Extract known task patterns
- Called on session start

#### `getRelevantHistory(historical: HistoricalContext, currentActivity: string): string`
- Given current activity, find relevant past context
- Return ~1000 tokens of relevant excerpts
- Prioritize recent sessions and similar tasks

### Context Assembly

#### `assembleContext(immediate: ImmediateContext, session: SessionContext, historical: HistoricalContext): AssembledContext`
- Combine all context levels
- Format for LLM consumption
- Respect token budgets

```typescript
// Token budgets (approximate)
const TOKEN_BUDGETS = {
  immediate: 'N screenshots as images',
  session: 500,
  historical: 1000,
  baseline: 500,
  total_text: 2000
};
```

## Context Update Flow

```
[New Screenshot]
      ↓
[Update Immediate Context]
      ↓
[Update Session Context (app time, etc)]
      ↓
[Check: Time for summary update?]
      ↓ yes
[Generate Session Summary]
      ↓
[Save to session-context.json]
```

## Storage

```
~/.workflow-shadow/profiles/[profileId]/
  interview-summary.json      # Baseline context
  session-summaries.json      # Array of past SessionSummary
  sessions/[sessionId]/
    session-context.json      # Live SessionContext (updates frequently)
```

## Events

- `context:immediate-updated` - New screenshot added to buffer
- `context:session-updated` - Session context changed
- `context:summary-generated` - New session summary created

## Session Lifecycle

### On Session Start
1. Load interview summary (baseline)
2. Load previous session summaries (historical)
3. Initialize empty session context
4. Initialize empty immediate context

### During Session
1. Screenshots trigger immediate context updates
2. App switches update session context
3. Every 5 min (or task boundary): generate session summary

### On Session End
1. Generate final session summary
2. Append to session-summaries.json
3. Save all session data

## Dependencies
- Screen Capture feature (provides screenshots)
- LLM API (for summarization)
- Task Detection feature (for task boundaries)

## Out of Scope
- Intelligent historical retrieval (RAG) - just load recent summaries for MVP
- Cross-profile context - each profile is independent
